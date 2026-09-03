-- Socle de l'assistant : etat personnel, signaux externes, propositions.
--
-- Le principe tient en une phrase : un etat personnel modelise d'un cote, des
-- flux de changement externes de l'autre, et un moteur de regles deterministe
-- qui rapproche les deux et depose une PROPOSITION A VALIDER.
--
-- Rien d'autre. Approuver une proposition change un statut et ecrit une ligne
-- de journal. Aucune action n'est declenchee, meme reversible, meme anodine.
-- Cette table ne pilote rien : c'est une boite de reception, pas un automate.

-- ---------------------------------------------------------------------------
-- Etat personnel

create type fact_source as enum (
  'saisie_manuelle',  -- l'utilisateur l'a tape
  'document',         -- releve d'un document qu'il a fourni
  'calcul'            -- derive d'autres faits, de maniere deterministe
);

-- Le coeur de l'assistant. Un fait = une chose vraie sur l'utilisateur a une
-- date donnee.
create table personal_facts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  key text not null,
  value jsonb not null,
  unit text,
  domain text not null,
  source fact_source not null,

  -- Date de derniere verification par l'utilisateur, pas date d'ecriture.
  verified_at timestamptz not null default now(),

  -- Au bout de combien de mois ce fait doit-il etre reconfirme. Nul = le fait
  -- ne perime pas (une date de naissance, un numero de contrat).
  review_cadence_months integer check (review_cadence_months > 0),

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, key)
);

create index personal_facts_domain_idx on personal_facts (user_id, domain);

-- La fraicheur est une propriete de premiere classe, pas un detail : un etat
-- perime ne produit pas moins de propositions, il en produit de fausses. Une
-- valeur assuree datant d'avant des travaux donne une proposition rassurante
-- et erronee — le pire des deux mondes.
--
-- `security_invoker` fait appliquer la RLS de la table sous-jacente au lieu de
-- celle du proprietaire de la vue : sans lui, la vue divulguerait les faits de
-- tous les comptes.
create view stale_facts with (security_invoker = true) as
  select
    f.*,
    f.verified_at + make_interval(months => f.review_cadence_months) as due_at,
    extract(day from now() - (f.verified_at + make_interval(months => f.review_cadence_months)))::integer
      as days_overdue
  from personal_facts f
  where f.review_cadence_months is not null
    and now() > f.verified_at + make_interval(months => f.review_cadence_months);

-- ---------------------------------------------------------------------------
-- Moteur

create type rule_trigger as enum (
  'state',     -- l'etat personnel franchit un seuil
  'event',     -- un signal externe arrive
  'schedule'   -- echeance calendaire
);

create table rules (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  domain text not null,
  trigger_type rule_trigger not null,
  severity text not null check (severity in ('info', 'attention', 'urgent')),
  title text not null,

  -- Le lien qui justifie d'heberger le cours et le moteur dans la meme
  -- application : toute proposition renvoie au bloc qui explique le mecanisme
  -- sous-jacent. Sans lui, l'assistant dit quoi faire sans dire pourquoi.
  explains_content_block_id uuid references content_blocks (id) on delete set null,

  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Changements externes captes. `source_url` est non nul par construction : un
-- changement du monde exterieur que personne ne peut aller relire n'est pas un
-- signal, c'est une rumeur.
create table signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_url text not null check (length(btrim(source_url)) > 0),
  observed_at timestamptz not null default now(),
  summary text not null,
  domain text not null,

  -- Valeurs exploitables par une regle : un montant d'avantage, un delai de
  -- preavis. `summary` est du texte pour l'humain ; une regle deterministe ne
  -- peut pas calculer dessus. Sans cette colonne, R2 et R4 seraient obligees
  -- de coder en dur les valeurs qu'elles sont precisement censees ne pas
  -- inventer.
  payload jsonb not null default '{}'::jsonb,

  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index signals_domain_idx on signals (user_id, domain, observed_at desc);
create index signals_unprocessed_idx on signals (user_id) where processed_at is null;

-- ---------------------------------------------------------------------------
-- Propositions

create type proposal_status as enum ('pending', 'approved', 'rejected', 'expired');

create table proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  rule_id uuid not null references rules (id) on delete restrict,

  -- Recopie de `rules.trigger_type`, maintenue par declencheur. Une contrainte
  -- CHECK ne peut pas lire une autre table ; denormaliser rend la regle
  -- « un evenement externe exige une source » verifiable en lisant une seule
  -- ligne, ce qui est exactement ce qu'on veut d'une garantie de ce poids.
  trigger_type rule_trigger not null,

  status proposal_status not null default 'pending',
  title text not null,
  payload jsonb not null default '{}'::jsonb,

  -- Le raisonnement, en gabarit deterministe. Toujours present.
  rationale_md text not null check (length(btrim(rationale_md)) > 0),
  -- Sa reformulation en francais clair par un modele de langage. Toujours
  -- facultative : si l'appel echoue, la proposition s'affiche avec son gabarit
  -- brut. Le modele est un confort, jamais une dependance.
  rationale_plain text,
  -- Provenance de cette reformulation, portee separement de celle de la
  -- proposition elle-meme. Les deux ne coincident pas : le raisonnement peut
  -- etre `fait_verifie` et sa mise en forme rester une sortie de modele. Sans
  -- cette colonne, afficher la reformulation reviendrait a lui preter le
  -- niveau de preuve du calcul qu'elle resume.
  rationale_plain_evidence evidence_level,

  evidence_level evidence_level not null,
  source_urls text[] not null default '{}',

  expires_at timestamptz,
  decided_at timestamptz,
  decision_note text,
  explains_content_block_id uuid references content_blocks (id) on delete set null,
  created_at timestamptz not null default now(),

  -- Une proposition issue d'un changement externe sans source verifiable ne
  -- doit pas pouvoir exister en base. Pas « ne doit pas s'afficher » : ne doit
  -- pas exister.
  constraint proposals_evenement_exige_source
    check (trigger_type <> 'event' or coalesce(array_length(source_urls, 1), 0) >= 1),

  -- Une decision a une date, et une non-decision n'en a pas.
  constraint proposals_decision_datee
    check ((status in ('pending', 'expired')) = (decided_at is null)),

  -- Une reformulation existe avec sa provenance, ou pas du tout. Et cette
  -- provenance ne peut etre que celle d'un modele : rien d'autre n'ecrit dans
  -- cette colonne.
  constraint proposals_reformulation_tracee
    check ((rationale_plain is null) = (rationale_plain_evidence is null)),
  constraint proposals_reformulation_est_modele
    check (rationale_plain_evidence is null or rationale_plain_evidence = 'sortie_modele')
);

create index proposals_boite_idx on proposals (user_id, status, created_at desc);

-- Le declencheur qui rend la denormalisation sure : `trigger_type` est
-- toujours celui de la regle, quoi qu'ecrive l'appelant.
create function aligner_trigger_type() returns trigger
language plpgsql as $$
begin
  select r.trigger_type into new.trigger_type from rules r where r.id = new.rule_id;
  if new.trigger_type is null then
    raise exception 'regle % introuvable', new.rule_id using errcode = 'foreign_key_violation';
  end if;
  return new;
end;
$$;

create trigger proposals_aligner_trigger_type
  before insert or update of rule_id on proposals
  for each row execute function aligner_trigger_type();

-- ---------------------------------------------------------------------------
-- Journal d'audit

create table proposal_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references proposals (id) on delete cascade,
  at timestamptz not null default now(),
  from_status proposal_status,
  to_status proposal_status not null,
  note text,
  -- Qui a decide. `user` ou `system` (peremption automatique).
  actor text not null default 'user' check (actor in ('user', 'system'))
);

create index proposal_events_proposal_idx on proposal_events (proposal_id, at);

-- Journal immuable : on y ajoute, on n'y touche plus. Une trace de decision
-- qu'on peut reecrire apres coup ne prouve rien.
create function refuser_reecriture_journal() returns trigger
language plpgsql as $$
begin
  raise exception 'proposal_events est un journal d''audit : ajout seul, ni modification ni suppression'
    using errcode = 'insufficient_privilege';
end;
$$;

create trigger proposal_events_immuable
  before update or delete on proposal_events
  for each row execute function refuser_reecriture_journal();

-- Tout changement de statut laisse une trace, y compris celui qui cree la
-- proposition. Ecrit par declencheur plutot que par l'application : une trace
-- que le code appelant peut oublier d'ecrire n'est pas un journal d'audit.
create function journaliser_proposition() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    insert into proposal_events (proposal_id, from_status, to_status, note, actor)
      values (new.id, null, new.status, null, 'system');
  elsif new.status is distinct from old.status then
    insert into proposal_events (proposal_id, from_status, to_status, note, actor)
      values (new.id, old.status, new.status, new.decision_note,
              case when new.status = 'expired' then 'system' else 'user' end);
  end if;
  return null;
end;
$$;

create trigger proposals_journaliser
  after insert or update of status on proposals
  for each row execute function journaliser_proposition();

-- ---------------------------------------------------------------------------
-- RLS

alter table personal_facts enable row level security;
alter table rules enable row level security;
alter table signals enable row level security;
alter table proposals enable row level security;
alter table proposal_events enable row level security;

create policy "own facts" on personal_facts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own signals" on signals
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Les regles sont du contenu, pas des donnees personnelles : lisibles pour
-- qu'une proposition puisse afficher d'ou elle vient, ecrites par le seul role
-- de service. Une regle modifiable depuis le navigateur serait un moteur de
-- decision modifiable depuis le navigateur.
create policy "regles lisibles" on rules
  for select to authenticated using (true);

-- La boite de reception : lecture et decision par son proprietaire. Pas
-- d'insertion depuis le client — les propositions sont produites par le
-- moteur, sous role de service. Se creer une proposition a soi-meme viderait
-- la validation de son sens.
create policy "own proposals lecture" on proposals
  for select to authenticated using (auth.uid() = user_id);

create policy "own proposals decision" on proposals
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "own proposal events" on proposal_events
  for select to authenticated using (
    exists (select 1 from proposals p where p.id = proposal_id and p.user_id = auth.uid())
  );
