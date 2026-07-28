-- Schema initial : outil personnel de veille SEC EDGAR (13F + Form 4).
-- Principe : aucune execution d'ordre, aucune donnee de courtage. Uniquement
-- des informations publiques et des fiches "pistes" a lire.

create type signal_type as enum (
  '13f_new',        -- 13F : nouvelle position
  '13f_increase',   -- 13F : renforcement
  '13f_decrease',   -- 13F : allegement
  '13f_exit',       -- 13F : sortie
  'form4_buy',      -- Form 4 : achat d'initie
  'form4_sell'      -- Form 4 : vente d'initie
);

-- Gestionnaires suivis (deposants 13F : Berkshire, Bridgewater, ...)
create table managers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cik text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, cik)
);

-- Emetteurs suivis pour les Form 4 (achats/ventes d'inities)
create table watched_issuers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  cik text not null,
  ticker text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (user_id, cik)
);

-- Dernier etat connu des positions 13F d'un gestionnaire, par trimestre.
-- Sert de reference pour detecter les changements au depot suivant.
create table holdings_snapshots (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references managers (id) on delete cascade,
  period_of_report date not null,
  accession_no text not null,
  filed_at date,
  holdings jsonb not null, -- [{cusip, name, shares, value_kusd}]
  created_at timestamptz not null default now(),
  unique (manager_id, period_of_report)
);

-- Filings deja traites (pour ne pas generer deux fois la meme piste)
create table processed_filings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  accession_no text not null,
  form_type text not null,
  processed_at timestamptz not null default now(),
  unique (user_id, accession_no)
);

-- Les pistes : le coeur du produit. Informations, jamais des recommandations.
create table pistes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  signal signal_type not null,
  ticker text,                 -- peut etre null (13F ne fournit que le CUSIP)
  company_name text not null,
  source_name text not null,   -- nom du gestionnaire ou de l'initie
  source_url text not null,    -- lien direct vers le filing SEC
  contexte text not null,      -- resume factuel 2-3 phrases (API Anthropic)
  details jsonb,               -- donnees brutes du mouvement (parts, valeur, prix...)
  detected_at timestamptz not null default now(),
  filed_at date,
  sector text,                 -- optionnel, rempli manuellement si souhaite
  outcome_note text,           -- historique honnete : ce qui s'est passe ensuite
  outcome_recorded_at timestamptz
);

create index pistes_user_detected_idx on pistes (user_id, detected_at desc);

-- Parametres : frais fixes du courtier et montant de position envisage.
create table settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  broker_fixed_fee_eur numeric not null default 1.00,
  position_size_eur numeric not null default 150.00,
  updated_at timestamptz not null default now()
);

-- RLS : chaque utilisateur ne voit que ses propres donnees.
alter table managers enable row level security;
alter table watched_issuers enable row level security;
alter table holdings_snapshots enable row level security;
alter table processed_filings enable row level security;
alter table pistes enable row level security;
alter table settings enable row level security;

create policy "own managers" on managers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own issuers" on watched_issuers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own snapshots" on holdings_snapshots
  for all using (
    exists (select 1 from managers m where m.id = manager_id and m.user_id = auth.uid())
  ) with check (
    exists (select 1 from managers m where m.id = manager_id and m.user_id = auth.uid())
  );

create policy "own processed" on processed_filings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own pistes" on pistes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own settings" on settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Cron hebdomadaire : planifier l'appel de l'Edge Function sync-edgar.
-- A activer une fois le projet deploye (extensions pg_cron + pg_net), en
-- remplacant PROJECT_REF et SERVICE_ROLE_KEY :
--
-- select cron.schedule(
--   'sync-edgar-weekly',
--   '0 7 * * 1',  -- tous les lundis 07:00 UTC
--   $$
--   select net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/sync-edgar',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
