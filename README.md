# Veille investissement — SEC EDGAR (outil personnel)

Outil strictement personnel de veille et d'aide à la décision : il repère et
explique des mouvements d'investisseurs institutionnels (13F) et d'initiés
(Form 4) à partir des données publiques SEC EDGAR, pour se former une opinion
sur de petites positions (100-200 €).

## Principe non négociable

- **Aucune exécution d'ordre**, jamais : pas de connexion courtier, pas de
  bouton « acheter », pas d'API de trading.
- **Aucune recommandation** : les fiches présentent des informations et un
  raisonnement ; l'utilisateur décide seul et passe l'ordre lui-même chez son
  propre courtier.
- Chaque fiche « piste » affiche obligatoirement (non masquable) :
  - le niveau d'incertitude (retard des 13F, positions longues uniquement,
    absence d'avantage démontré après frais) ;
  - la source (lien direct vers le filing SEC) ;
  - le calcul de rentabilité minimale pour couvrir les frais de transaction,
    avec avertissement si les frais dépassent 3 % du montant investi.
- Pas de « score de confiance » chiffré, pas de prédiction de cours, pas de
  notification pressante.

## Stack

- **Frontend** : React + TypeScript + Tailwind (Vite)
- **Backend/DB** : Supabase (Postgres + Auth + Edge Functions + cron)
- **Données** : API publique et gratuite SEC EDGAR — pas de scraping tiers
- **IA** : API Anthropic pour rédiger le « contexte » factuel de chaque piste
  (jamais pour prédire un cours)

## Distribution monofichier (usage personnel, sans hébergeur)

Le domaine partagé `*.supabase.co` refuse volontairement de servir du HTML
(protection anti-hameçonnage : Content-Type réécrit en `text/plain` + CSP
`sandbox`), donc pas d'hébergement du frontend via une Edge Function sans
domaine personnalisé. Le mode de distribution retenu est un fichier HTML
autonome à ouvrir en double-cliquant :

```sh
VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... npm run build
python3 scripts/build_app_function.py     # genere build/app.html
```

À refaire après chaque modification du frontend. Les API Supabase (REST,
Auth, Functions) acceptent les requêtes de toute origine ; la fonction
`sync-edgar` répond au preflight CORS des navigateurs.

## Mise en route

### 1. Base de données

```sh
supabase init          # si pas déjà fait, lier au projet : supabase link
supabase db push       # applique supabase/migrations/20260728000000_init.sql
```

### 2. Edge Function `sync-edgar`

```sh
supabase secrets set SEC_USER_AGENT="Prenom Nom contact@example.com"
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy sync-edgar
```

La SEC exige un `User-Agent` identifiant — mettre un vrai contact.
Sans `ANTHROPIC_API_KEY`, la fonction fonctionne quand même : le contexte est
alors généré par un gabarit factuel local.

### 3. Cron hebdomadaire

Activer les extensions `pg_cron` et `pg_net` dans le dashboard Supabase, puis
exécuter le bloc SQL commenté à la fin de la migration (en remplaçant
`PROJECT_REF` et `SERVICE_ROLE_KEY`). Par défaut : tous les lundis 07:00 UTC.

### 4. Frontend

```sh
cp .env.example .env   # renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

### 5. Redéployer une Edge Function après modification

Le frontend se republie seul à chaque push sur `main` (`deploy-pages.yml`),
**mais pas les Edge Functions**. Tant qu'une fonction modifiée n'est pas
redéployée, l'interface appelle une version ancienne et reçoit `action
inconnue` — le symptôme typique d'un onglet vide alors que le code est bien
sur `main`.

Deux façons de le faire :

```sh
supabase functions deploy cotations --project-ref uckzkcphatmdmtibyhyk
```

ou, sans rien installer, via l'onglet **Actions** du dépôt → *Deploy Edge
Function* → *Run workflow*, après avoir déposé une fois un jeton personnel
(https://supabase.com/dashboard/account/tokens) dans les secrets du dépôt sous
le nom `SUPABASE_ACCESS_TOKEN`.

## Utilisation

1. Créer un compte (Supabase Auth) et se connecter.
2. Onglet **Configuration** : ajouter les gestionnaires à suivre (nom + CIK,
   ex. Berkshire Hathaway : 1067983), les sociétés à surveiller pour les
   Form 4 (nom + ticker + CIK), et régler les frais fixes du courtier et le
   montant envisagé par position.
3. Onglet **Pistes récentes** : lancer « Synchroniser maintenant » (ou attendre
   le cron). Les fiches apparaissent, triables par date ou par fraîcheur du
   signal (Form 4 d'abord), filtrables par signal, source et secteur.
4. Onglet **Historique** : noter ce qui s'est réellement passé après chaque
   piste — échecs comme réussites — pour garder une vision honnête de la
   fiabilité de l'outil dans le temps.

## Limites connues (assumées)

- Les 13F ne montrent que les positions longues US, avec jusqu'à 45 jours de
  retard ; le premier dépôt vu d'un gestionnaire sert de référence et ne
  génère pas de pistes (elles arrivent au trimestre suivant).
- Les 13F ne fournissent pas de ticker (CUSIP uniquement) ni de secteur ; le
  champ secteur peut être renseigné à la main.
- Les motifs des ventes d'initiés ne sont pas déclarés : une vente peut être
  une simple diversification.
