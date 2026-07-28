-- Table de correspondance CUSIP -> ticker / CIK / secteur.
-- Donnee de reference globale, alimentee par l'Edge Function sync-edgar a
-- partir des referentiels publics SEC (company_tickers.json + sicDescription
-- des dossiers d'entreprise). Lecture/ecriture reservees au service role :
-- RLS active sans policy.

create table issuer_map (
  cusip text primary key,
  ticker text,
  cik text,
  sector text,
  issuer_name text,
  updated_at timestamptz not null default now()
);

alter table issuer_map enable row level security;
