-- Schéma Phase 1 : gestionnaires suivis, filings bruts, positions 13F, pistes.
-- Outil personnel mono-utilisateur : RLS activé, accès réservé aux utilisateurs authentifiés.

create table managers (
  id uuid primary key default gen_random_uuid(),
  cik text not null unique check (cik ~ '^[0-9]{10}$'),
  name text not null,
  created_at timestamptz not null default now()
);

create table filings (
  id uuid primary key default gen_random_uuid(),
  accession_no text not null unique,
  form_type text not null check (form_type in ('13F-HR', '13F-HR/A', '4')),
  cik text not null,
  filed_at date not null,
  period_of_report date,
  source_url text not null,
  raw jsonb,
  created_at timestamptz not null default now()
);

-- Positions extraites des 13F, une ligne par titre et par trimestre,
-- pour pouvoir diffe­rencier nouvelle entrée / renforcement / réduction / sortie.
create table positions (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references managers (id) on delete cascade,
  filing_id uuid not null references filings (id) on delete cascade,
  period date not null,
  cusip text not null,
  issuer text not null,
  ticker text,
  shares numeric,
  value_usd numeric,
  unique (manager_id, period, cusip)
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  ticker text,
  company text not null,
  signal_type text not null check (
    signal_type in ('13F_NEW', '13F_INCREASE', '13F_DECREASE', '13F_EXIT', 'FORM4_BUY', 'FORM4_SELL')
  ),
  source_url text not null,
  context text not null,
  sector text,
  manager_id uuid references managers (id) on delete set null,
  filing_id uuid references filings (id) on delete set null,
  filed_at date not null,
  -- Suivi honnête a posteriori : rempli à la main, succès comme échecs.
  outcome_note text,
  created_at timestamptz not null default now(),
  unique (signal_type, filed_at, company)
);

create index leads_filed_at_idx on leads (filed_at desc);
create index positions_manager_period_idx on positions (manager_id, period);

-- Vue consommée par le frontend : pistes avec nom du gestionnaire dénormalisé.
create view leads_view with (security_invoker = true) as
select
  l.id, l.ticker, l.company, l.signal_type, l.source_url, l.context,
  l.sector, m.name as manager_name, l.filed_at, l.outcome_note
from leads l
left join managers m on m.id = l.manager_id;

alter table managers enable row level security;
alter table filings enable row level security;
alter table positions enable row level security;
alter table leads enable row level security;

create policy "authenticated full access" on managers
  for all to authenticated using (true) with check (true);
create policy "authenticated read" on filings
  for select to authenticated using (true);
create policy "authenticated read" on positions
  for select to authenticated using (true);
create policy "authenticated read+update outcome" on leads
  for select to authenticated using (true);
create policy "authenticated update" on leads
  for update to authenticated using (true) with check (true);
