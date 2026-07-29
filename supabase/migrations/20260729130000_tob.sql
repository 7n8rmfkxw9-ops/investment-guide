-- Taxe proportionnelle sur chaque transaction, propre au pays de residence.
-- En Belgique : taxe sur les operations de bourse (TOB), prelevee a l'achat
-- comme a la vente. Valeur par defaut : le taux le plus courant.
alter table settings add column if not exists tob_pct numeric not null default 0.12;
