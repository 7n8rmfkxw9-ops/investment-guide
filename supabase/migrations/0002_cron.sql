-- Cron hebdomadaire : appelle l'Edge Function fetch-filings tous les lundis à 07h00 UTC.
-- Prérequis : extensions pg_cron et pg_net activées dans le dashboard Supabase,
-- et les paramètres app.settings.project_url / app.settings.service_role_key définis
-- (Dashboard > Project Settings > Database > Custom config), sinon adapter les valeurs ici.

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'weekly-fetch-filings',
  '0 7 * * 1',
  $$
  select net.http_post(
    url := current_setting('app.settings.project_url') || '/functions/v1/fetch-filings',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
