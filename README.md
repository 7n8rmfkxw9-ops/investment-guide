# Veille investissement — outil personnel

Outil strictement personnel d'aide à la formation d'opinion : il repère et explique des
mouvements d'investisseurs institutionnels (13F) et d'initiés (Form 4) à partir des données
publiques SEC EDGAR, pour évaluer des pistes d'investissement modestes (tickets de 100-200 €).

**Principe non négociable** : cet outil n'exécute jamais d'ordre et ne formule jamais de
recommandation d'achat. Il présente des informations et un raisonnement ; la décision et le
passage d'ordre restent entièrement à l'utilisateur, chez son propre broker. Chaque piste
affiche systématiquement : le niveau d'incertitude (note non masquable), la source SEC, et le
calcul de rentabilité minimale nécessaire pour couvrir les frais de transaction (avertissement
si les frais dépassent 3 % du montant par ordre).

## Stack

- **Frontend** : React + TypeScript + Tailwind (Vite)
- **Backend/DB** : Supabase (Postgres, RLS, cron pg_cron → Edge Function)
- **Données** : API publique SEC EDGAR uniquement (pas de scraping tiers)
- **IA** : API Anthropic pour résumer/expliquer les données brutes — jamais pour prédire un cours

## Démarrage

```bash
npm install
npm run dev
```

Sans configuration, l'app tourne en **mode démo** avec des pistes d'exemple, pour visualiser
le dashboard. Pour les vraies données :

1. Créer un projet Supabase et appliquer les migrations : `supabase db push`
   (ou coller les fichiers de `supabase/migrations/` dans l'éditeur SQL).
2. Copier `.env.example` vers `.env` et renseigner `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY`.
3. Déployer la fonction de récupération : `supabase functions deploy fetch-filings`, avec les
   secrets :
   - `SEC_USER_AGENT` — exigé par la SEC, format `"Prénom Nom email@exemple.com"` ;
   - `ANTHROPIC_API_KEY` *(optionnel)* — active la synthèse des contextes ; sans clé, les
     faits bruts sont affichés tels quels ;
   - `ANTHROPIC_MODEL` *(optionnel)*.
4. Le cron hebdomadaire (lundi 07h00 UTC) est posé par `supabase/migrations/0002_cron.sql`
   (nécessite les extensions `pg_cron` et `pg_net`, et les paramètres
   `app.settings.project_url` / `app.settings.service_role_key`). La fonction peut aussi être
   invoquée à la main : `supabase functions invoke fetch-filings`.

## Fonctionnalités (Phase 1)

- **Gestionnaires suivis** : liste configurable (nom + CIK EDGAR) ; chaque semaine, les
  nouveaux 13F-HR sont diffés contre le trimestre précédent → pistes « nouvelle position »,
  « renforcement » (≥ +25 %), « allègement » (≤ −25 %), « sortie ».
- **Sociétés suivies** : les Form 4 (achats code P / ventes code S d'initiés) sont détectés
  sous 2 jours ouvrables — donnée plus fraîche que le 13F, affichée en priorité dans le tri
  par défaut.
- **Dashboard** : tri par type de signal ou par date, filtres secteur/gestionnaire, fiche
  complète par piste (signal, source EDGAR, contexte, note d'incertitude non masquable,
  calcul de frais avec avertissement > 3 %).
- **Historique** : pistes passées avec ce qui s'est passé ensuite, échecs affichés au même
  titre que les succès.

## Ce que l'outil ne fait pas, volontairement

- Aucune connexion broker, aucun bouton « acheter », aucune API de trading — seulement un
  lien texte « Pour investir, ouvre ton application de courtage habituelle ».
- Aucune prédiction de prix ni « score de confiance » chiffré (fausse précision).
- Aucune notification pressante ; le ton reste informatif, jamais incitatif.
