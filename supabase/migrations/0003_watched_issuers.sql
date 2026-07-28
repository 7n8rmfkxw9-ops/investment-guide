-- Sociétés suivies pour les Form 4 (achats/ventes d'initiés).
-- Les 13F ne donnent que des CUSIP ; le suivi Form 4 se fait par émetteur (CIK société).

create table watched_issuers (
  id uuid primary key default gen_random_uuid(),
  cik text not null unique check (cik ~ '^[0-9]{10}$'),
  ticker text not null,
  name text not null,
  created_at timestamptz not null default now()
);

alter table watched_issuers enable row level security;

create policy "authenticated full access" on watched_issuers
  for all to authenticated using (true) with check (true);
