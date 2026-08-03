-- Quatre manques releves en relisant l'outil du point de vue d'un
-- professionnel : la regle de sortie, le cout de change, l'exposition
-- agregee, et les prises de participation (13D/13G).

-- 1. Regle de sortie ecrite AVANT l'achat.
--    Un professionnel decide sa sortie avant son entree, jamais dans
--    l'emotion du moment. Le champ `note` existant dit pourquoi on achete ;
--    celui-ci dit a quelle condition on vend.
alter table simulations add column if not exists regle_sortie text;

-- 2. Secteur, quand il est connu.
--    Herite de la piste d'origine le cas echeant : les cotations publiques
--    n'exposent pas le secteur sans authentification, donc une simulation
--    saisie a la main reste sans secteur — l'interface l'indique plutot que
--    de deviner.
alter table simulations add column if not exists secteur text;

-- 3. Commission de change du courtier, en pourcentage par conversion.
--    Invisible jusqu'ici alors qu'elle se paie a l'aller ET au retour sur
--    tout titre hors zone euro : sur 100 EUR, elle pese autant qu'un
--    demi-frais d'ordre.
alter table settings add column if not exists fx_spread_pct numeric not null default 0.25;

-- 4. Prises de participation declarees a la SEC.
--    Le 13D signale une intention d'influencer la societe ; le 13G une
--    detention passive. Les deux sont publies sous 10 jours, contre 45 pour
--    un 13F — c'est la donnee la plus fraiche que la SEC produise sur les
--    grands investisseurs.
alter type signal_type add value if not exists 'sc13d_new';
alter type signal_type add value if not exists 'sc13g_new';
