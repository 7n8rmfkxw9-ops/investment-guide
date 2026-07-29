-- Suite de l'ouverture au marche europeen (separee car PostgreSQL interdit
-- d'utiliser une valeur d'enum dans la meme transaction que son ajout).

-- Marche de rattachement de la societe suivie.
--   'US' : suivie via la SEC (Form 4), identifiee par son CIK.
--   'BE' : suivie via la FSMA (MAR), identifiee par son nom d'emetteur exact
--          tel qu'il figure au registre FSMA.
alter table watched_issuers add column if not exists market text not null default 'US';
alter table watched_issuers add constraint watched_issuers_market_chk
  check (market in ('US', 'BE'));

-- Le CIK n'existe que pour les societes americaines.
alter table watched_issuers alter column cik drop not null;

-- La contrainte d'unicite existante porte sur le CIK : elle ne protege pas
-- les lignes belges (plusieurs NULL sont autorises en SQL). On ajoute donc
-- une unicite par nom pour les emetteurs non americains.
create unique index if not exists watched_issuers_market_name_uidx
  on watched_issuers (user_id, market, name)
  where cik is null;

-- Cron hebdomadaire de la source belge, a activer apres deploiement de la
-- fonction sync-fsma (extensions pg_cron + pg_net), en remplacant
-- PROJECT_REF et SERVICE_ROLE_KEY :
--
-- select cron.schedule(
--   'sync-fsma-weekly',
--   '20 7 * * 1',  -- lundi 07:20 UTC, apres la source americaine
--   $$
--   select net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/sync-fsma',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
