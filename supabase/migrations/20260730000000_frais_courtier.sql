-- Le tarif par defaut (1,00 €) n'etait rattache a aucun courtier reel : c'est
-- desormais un point de depart arbitraire que l'utilisateur remplace par le
-- tarif de son propre courtier, choisi dans la liste de src/lib/courtiers.ts.
-- On memorise seulement le nom du courtier choisi (pas de couplage plus
-- profond) pour pouvoir le reafficher au retour sur les reglages.
alter table settings add column if not exists broker_name text;
