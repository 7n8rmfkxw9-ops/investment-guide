-- Visibilite operationnelle : outil strictement personnel, sans personne
-- d'autre pour surveiller le cron hebdomadaire. Sans ce journal, un echec
-- silencieux (page FSMA modifiee, credit Anthropic epuise, etc.) ne se verrait
-- que par l'absence de nouvelles pistes — indistinguable d'une semaine
-- normale sans rien a declarer.

create table if not exists sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('sync-edgar', 'sync-fsma', 'sync-fi')),
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  created_count integer not null default 0,
  errors text[] not null default '{}',
  ok boolean not null
);

create index if not exists sync_runs_source_idx on sync_runs (source, finished_at desc);

alter table sync_runs enable row level security;

-- Metadonnees operationnelles partagees, sans donnee personnelle : lecture
-- ouverte a tout utilisateur authentifie de ce deploiement.
drop policy if exists "sync_runs lecture" on sync_runs;
create policy "sync_runs lecture" on sync_runs
  for select using (auth.role() = 'authenticated');

-- Aucune policy d'ecriture pour les utilisateurs : seules les fonctions de
-- synchronisation (cle service, qui contourne RLS) inserent ces lignes.
