-- Catalogue des regles du premier domaine : assurances habitation et mutualite.
--
-- Les regles vivent en base pour deux raisons : une proposition doit pouvoir
-- dire de quelle regle elle vient, et une regle doit pouvoir etre desactivee
-- (`active = false`) sans redeployer l'application. Leur LOGIQUE, elle, reste
-- en TypeScript teste — `src/lib/regles/assurances.ts`. Cette table n'execute
-- rien : elle nomme.
--
-- `explains_content_block_id` reste nul pour les quatre. Ce n'est pas un oubli.
-- Le cours de cette application porte sur l'investissement ; aucun de ses
-- dix-huit chapitres n'explique la regle proportionnelle, la mutualite ou le
-- solde restant du. Y accrocher un chapitre d'investissement fabriquerait une
-- justification credible et fausse, ce que la colonne existe precisement pour
-- eviter. Elle se remplira le jour ou un chapitre traitera de ces mecanismes.

insert into rules (key, domain, trigger_type, severity, title) values
  ('r1_sous_assurance', 'assurances', 'state', 'attention',
   'Sous-assurance après travaux'),
  ('r2_revue_mutualite', 'assurances', 'schedule', 'info',
   'Revue annuelle de mutualité'),
  ('r3_solde_restant_du', 'assurances', 'event', 'urgent',
   'Assurance solde restant dû'),
  ('r4_echeance_preavis', 'assurances', 'schedule', 'attention',
   'Échéance et préavis de résiliation')
on conflict (key) do update set
  domain = excluded.domain,
  trigger_type = excluded.trigger_type,
  severity = excluded.severity,
  title = excluded.title;
