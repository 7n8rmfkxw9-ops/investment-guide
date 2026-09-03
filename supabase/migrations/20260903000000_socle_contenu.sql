-- Socle de contenu : le cours quitte le bundle JavaScript pour la base.
--
-- Deux modes de sortie coexistent desormais dans cette application, et ils ne
-- doivent jamais etre fusionnes :
--
--   - le CONTENU (ce fichier) : explicatif, partageable, valable pour
--     n'importe qui, sans date de peremption ;
--   - les PROPOSITIONS (migration suivante) : personnelles, datees,
--     perissables, a valider ou rejeter.
--
-- Ce sont deux cycles de vie et deux niveaux de risque. Une phrase de cours se
-- corrige ; une proposition mal calculee engage de l'argent.

-- ---------------------------------------------------------------------------
-- Niveau de preuve

-- La colonne qui traverse tout le systeme. Elle repond a une seule question :
-- « d'ou vient cette affirmation ? » Trois reponses possibles, jamais
-- davantage, parce qu'une quatrieme valeur serait forcement un degrade des
-- trois autres.
create type evidence_level as enum (
  -- Adosse a une source identifiable dans `sources`.
  'fait_verifie',
  -- Definition ou derivation standard, telle qu'enseignee. Verifiable au
  -- crayon, mais sans mesure derriere : ce n'est pas un resultat empirique.
  'mecanique_standard',
  -- Produit par un modele de langage. Confort de lecture, jamais une preuve.
  'sortie_modele'
);

-- ---------------------------------------------------------------------------
-- Registre des references

create table sources (
  id uuid primary key default gen_random_uuid(),
  -- Cle stable, reprise du catalogue TypeScript (`sharpe1991`). Elle survit
  -- aux reimports : c'est elle qui rend la migration idempotente.
  key text not null unique,
  title text not null,
  authors text not null,
  year integer,
  -- Revue, ou nature du document quand il n'a pas ete publie en revue.
  publisher text,
  url text not null,
  doi text,
  -- Date a laquelle le DOI a ete resolu et la notice confrontee a l'editeur.
  -- Nul tant que personne ne l'a fait : ne jamais pre-remplir avec now().
  resolved_at timestamptz,
  -- Ce que le travail a mesure, en langage courant.
  finding text,
  -- Ce qu'il ne dit pas. Une etude sans ses limites se lit comme une loi de la
  -- nature, ce qu'aucune n'est. Non nul, et le vide est interdit.
  limitations text not null check (length(btrim(limitations)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sources_doi_idx on sources (doi) where doi is not null;

-- ---------------------------------------------------------------------------
-- Programme

create table parts (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  subtitle text,
  position integer not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table chapters (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references parts (id) on delete cascade,
  key text not null unique,
  number integer not null unique,
  title text not null,
  -- La question a laquelle le chapitre repond, telle qu'on se la pose.
  question text not null,
  minutes integer not null check (minutes > 0),
  icon text,
  -- Un chapitre « arithmetique » ne repose sur aucune etude : c'est du calcul.
  -- Le distinguer evite deux malhonnetetes symetriques — citer une etude qui
  -- ne dit pas ce qu'on lui fait dire pour respecter une regle, ou laisser
  -- croire qu'une identite mathematique est un resultat contestable.
  nature text not null check (nature in ('empirique', 'arithmetique')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index chapters_part_idx on chapters (part_id, number);

-- ---------------------------------------------------------------------------
-- Blocs de contenu

-- Un seul type d'objet pour tout ce que le lecteur voit defiler : les pages
-- redigees comme les diapositives de revision, la fiche d'etude comme le quiz.
-- Deux structures paralleles auraient produit deux renderers, deux ordres de
-- tri et deux endroits ou oublier une regle.
create table content_blocks (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references chapters (id) on delete cascade,

  -- Forme du bloc. Determine le rendu et la structure de `payload`.
  block_type text not null check (block_type in (
    -- pages redigees
    'cours',
    -- diapositives de revision
    'idee', 'chiffre', 'liste', 'citation', 'definition',
    'formule', 'exemple', 'piege',
    -- fin de chapitre
    'etude', 'appliquer', 'quiz', 'retenir'
  )),

  -- Structure exacte du bloc, telle que la lit le composant de rendu. C'est la
  -- verite : `body_md` en est une projection, pas l'inverse.
  --
  -- Le contenu n'est pas du markdown et ne peut pas l'etre : un tableau de
  -- calcul a chasse fixe, un terme mis en exergue, une reference de figure et
  -- un encadre de nuance ne survivent pas a un aplatissement en texte. Les
  -- ecraser aurait detruit la mise en page que les trois modes de lecture
  -- exploitent, et la migration « a l'identique » demandee serait devenue
  -- impossible.
  payload jsonb not null,

  -- Tout le texte du bloc, sans balisage. Sert a la recherche, aux controles
  -- de longueur et a la lecture vocale. Derive de `payload` par le script de
  -- migration ; jamais saisi a la main.
  body_md text,

  position integer not null,

  -- Cle de figure dessinee cote client (`croissance`, `frontiere`, ...). Nulle
  -- pour la grande majorite des blocs.
  figure_ref text,

  evidence_level evidence_level not null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (chapter_id, position)
);

create index content_blocks_chapter_idx on content_blocks (chapter_id, position);
create index content_blocks_evidence_idx on content_blocks (evidence_level);

create table content_block_sources (
  content_block_id uuid not null references content_blocks (id) on delete cascade,
  source_id uuid not null references sources (id) on delete restrict,
  primary key (content_block_id, source_id)
);

create index content_block_sources_source_idx on content_block_sources (source_id);

-- ---------------------------------------------------------------------------
-- « fait_verifie » exige une source

-- Postgres interdit les sous-requetes dans une contrainte CHECK : la regle
-- « un bloc en fait_verifie a au moins une source » traverse deux tables et ne
-- peut donc pas s'ecrire ainsi. Elle passe par une contrainte de declenchement
-- DIFFEREE : le bloc et sa liaison s'inserent dans la meme transaction, et la
-- verification n'a lieu qu'au COMMIT. Sans le report, l'insertion du bloc
-- echouerait avant meme que sa source existe.
create function verifier_source_obligatoire() returns trigger
language plpgsql as $$
declare
  bloc_id uuid;
  niveau evidence_level;
  n integer;
begin
  -- Brancher sur la table plutot que sur `coalesce` : PL/pgSQL evalue tous les
  -- arguments de coalesce, y compris ceux qui n'existent pas sur l'un des deux
  -- enregistrements, et la fonction echouerait avant d'avoir rien verifie.
  if tg_table_name = 'content_blocks' then
    bloc_id := new.id;
  else
    bloc_id := old.content_block_id;
  end if;

  select cb.evidence_level into niveau from content_blocks cb where cb.id = bloc_id;
  -- Le bloc a disparu dans la meme transaction : plus rien a verifier.
  if niveau is null then return null; end if;
  if niveau <> 'fait_verifie' then return null; end if;

  select count(*) into n from content_block_sources s where s.content_block_id = bloc_id;
  if n = 0 then
    raise exception
      'bloc % en fait_verifie sans source : une affirmation presentee comme verifiee doit pointer vers la reference qui la verifie',
      bloc_id
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger content_blocks_source_obligatoire
  after insert or update of evidence_level on content_blocks
  deferrable initially deferred
  for each row execute function verifier_source_obligatoire();

create constraint trigger content_block_sources_source_obligatoire
  after delete on content_block_sources
  deferrable initially deferred
  for each row execute function verifier_source_obligatoire();

-- ---------------------------------------------------------------------------
-- Horodatage

create function toucher_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sources_touch before update on sources
  for each row execute function toucher_updated_at();
create trigger parts_touch before update on parts
  for each row execute function toucher_updated_at();
create trigger chapters_touch before update on chapters
  for each row execute function toucher_updated_at();
create trigger content_blocks_touch before update on content_blocks
  for each row execute function toucher_updated_at();

-- ---------------------------------------------------------------------------
-- RLS

-- Le contenu n'appartient a personne en particulier : c'est la premiere table
-- de ce depot qui n'est pas filtree par `user_id`. La lecture est donc ouverte
-- a tout compte authentifie, et l'ecriture reservee au role de service — le
-- client ne modifie jamais le cours, seul le script de migration le fait.
alter table sources enable row level security;
alter table parts enable row level security;
alter table chapters enable row level security;
alter table content_blocks enable row level security;
alter table content_block_sources enable row level security;

create policy "contenu lisible" on sources
  for select to authenticated using (true);
create policy "contenu lisible" on parts
  for select to authenticated using (true);
create policy "contenu lisible" on chapters
  for select to authenticated using (true);
create policy "contenu lisible" on content_blocks
  for select to authenticated using (true);
create policy "contenu lisible" on content_block_sources
  for select to authenticated using (true);
