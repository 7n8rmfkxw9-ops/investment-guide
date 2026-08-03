-- Deux ajouts independants :
--
--  1. app_links : les raccourcis personnels de l'utilisateur vers ses propres
--     applications bancaires et d'investissement. Ce n'est pas la liste des
--     courtiers de src/lib/courtiers.ts (qui reste generale et informative) :
--     ici, l'utilisateur saisit lui-meme l'URL de l'app qu'il utilise deja.
--
--  2. push_subscriptions : les abonnements aux notifications push du
--     navigateur (Web Push), un par appareil installe. Necessaire pour
--     prevenir d'une nouvelle piste sans que l'utilisateur ait a revenir
--     verifier manuellement. Le contenu du message reste toujours factuel et
--     calme (ex. "3 nouvelles pistes cette semaine"), jamais une incitation a
--     agir dans l'urgence — c'est le meme principe que partout ailleurs dans
--     l'outil.

create table if not exists app_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  url text not null,
  created_at timestamptz not null default now()
);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- L'URL d'abonnement du navigateur identifie l'appareil de facon unique :
  -- reinstaller l'app sur le meme appareil remplace l'abonnement existant
  -- plutot que d'en accumuler des doublons morts.
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table app_links enable row level security;
alter table push_subscriptions enable row level security;

drop policy if exists "own app_links" on app_links;
create policy "own app_links" on app_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own push_subscriptions" on push_subscriptions;
create policy "own push_subscriptions" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
