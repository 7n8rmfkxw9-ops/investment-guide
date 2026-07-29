-- Ajout de la Suede. Finansinspektionen (FI), le regulateur suedois, publie
-- l'integralite de son registre d'inities en un seul fichier CSV : c'est la
-- source europeenne la plus propre trouvee a ce jour, sans analyse de page web.
alter table watched_issuers drop constraint if exists watched_issuers_market_chk;
alter table watched_issuers add constraint watched_issuers_market_chk
  check (market in ('US', 'BE', 'SE'));

-- Planification hebdomadaire, a executer une fois le projet deploye (les
-- secrets ne sont pas versionnes ; remplacer PROJECT_REF et SERVICE_ROLE_KEY) :
--
-- select cron.schedule(
--   'sync-fi-weekly',
--   '40 7 * * 1',  -- lundi 07:40 UTC, apres les sources americaine et belge
--   $$
--   select net.http_post(
--     url := 'https://PROJECT_REF.supabase.co/functions/v1/sync-fi',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer SERVICE_ROLE_KEY'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
