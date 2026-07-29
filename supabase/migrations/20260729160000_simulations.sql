-- Entrainement : des achats fictifs, suivis avec les vrais cours.
--
-- Aucun ordre reel n'est passe et aucun courtier n'est connecte. La table ne
-- sert qu'a enregistrer une decision et a la confronter ensuite aux faits :
-- combien vaudrait la position aujourd'hui, ce que les frais ont coute, et ce
-- qu'aurait donne la meme somme placee sur un ETF mondial. C'est un outil
-- pedagogique, pas un portefeuille.

create table if not exists simulations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Piste d'origine, quand la simulation part d'un signal affiche. Une piste
  -- supprimee ne doit pas emporter l'historique d'apprentissage.
  piste_id uuid references pistes (id) on delete set null,

  symbole text not null,
  company_name text not null,
  devise text not null default 'EUR',

  -- Somme fictive engagee, frais compris : c'est ce qui sort de la poche.
  montant_eur numeric not null check (montant_eur > 0),
  frais_entree_eur numeric not null default 0,
  -- Cours et taux de change au moment de l'entree. Les conserver permet de
  -- recalculer sans dependre d'un historique externe.
  prix_entree numeric not null check (prix_entree > 0),
  taux_entree numeric not null default 1 check (taux_entree > 0),
  quantite numeric not null check (quantite > 0),
  date_entree date not null,

  -- Pourquoi cette decision. Le relire plus tard est l'essentiel de l'exercice.
  note text,

  -- Valorisation, rafraichie a la demande.
  prix_actuel numeric,
  taux_actuel numeric,
  prix_maj_at timestamptz,

  -- Comparaison avec un placement diversifie : meme somme, meme jour.
  ref_symbole text,
  ref_prix_entree numeric,
  ref_prix_actuel numeric,

  -- Cloture fictive.
  closed_at timestamptz,
  prix_sortie numeric,
  taux_sortie numeric,
  frais_sortie_eur numeric,
  note_sortie text,

  created_at timestamptz not null default now()
);

create index if not exists simulations_user_idx
  on simulations (user_id, closed_at nulls first, date_entree desc);

alter table simulations enable row level security;

-- Outil strictement personnel : chacun ne voit que ses propres simulations.
drop policy if exists "simulations owner" on simulations;
create policy "simulations owner" on simulations
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
