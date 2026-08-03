// Envoi de notifications push (Web Push), partage par les trois fonctions de
// synchronisation (sync-edgar, sync-fsma, sync-fi).
//
// Le message reste toujours factuel et calme — un decompte, jamais une
// incitation a agir dans l'urgence — c'est le meme principe que sur chaque
// fiche de piste. Cette fonction ne decide jamais du contenu du message ;
// elle se limite a le transmettre aux appareils abonnes de l'utilisateur.
//
// Un service push distant peut etre lent ou ne jamais repondre (teste avec
// un faux point de terminaison : la requete peut trainer bien au-dela d'une
// minute et fait planter la fonction avec un 502 si on l'attend en place).
// L'envoi est donc toujours programme via `EdgeRuntime.waitUntil`, pour
// continuer apres que la reponse de synchronisation a deja ete renvoyee —
// jamais sur le chemin critique du cron qui detecte les nouvelles pistes.

import webpush from "npm:web-push@3";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:contact@example.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
  );
}

export interface MessagePush {
  titre: string;
  corps: string;
  /** Chemin relatif ouvert au clic sur la notification (ex. "./"). */
  url: string;
}

async function envoyerAUnAbonnement(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  abonnement: { id: string; endpoint: string; p256dh: string; auth: string },
  charge: string,
): Promise<"envoye" | "expire" | "echec"> {
  try {
    // Delai de secours : un service distant qui ne repond jamais ne doit pas
    // laisser une requete trainer indefiniment en arriere-plan.
    await Promise.race([
      webpush.sendNotification(
        { endpoint: abonnement.endpoint, keys: { p256dh: abonnement.p256dh, auth: abonnement.auth } },
        charge,
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error("delai depasse")), 8000)),
    ]);
    return "envoye";
  } catch (e) {
    const statusCode = (e as { statusCode?: number })?.statusCode;
    if (statusCode === 404 || statusCode === 410) {
      // Abonnement expire (app desinstallee, jeton invalide) : on le retire
      // plutot que d'echouer dessus a chaque synchronisation future.
      await supabase.from("push_subscriptions").delete().eq("id", abonnement.id);
      return "expire";
    }
    return "echec";
  }
}

async function envoyerATous(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  message: MessagePush,
): Promise<void> {
  const { data: abonnements } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (!abonnements || abonnements.length === 0) return;

  const charge = JSON.stringify({ title: message.titre, body: message.corps, url: message.url });
  for (const a of abonnements) {
    await envoyerAUnAbonnement(supabase, a, charge);
  }
}

/**
 * Programme l'envoi d'une notification a tous les appareils abonnes d'un
 * utilisateur, sans attendre le resultat : la fonction appelante peut
 * renvoyer sa reponse immediatement, l'envoi continue derriere.
 */
export function programmerNotification(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  userId: string,
  message: MessagePush,
): void {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  const tache = envoyerATous(supabase, userId, message).catch((e) => {
    console.error("notification push:", e instanceof Error ? e.message : String(e));
  });
  const rt = (globalThis as unknown as { EdgeRuntime?: { waitUntil(p: Promise<unknown>): void } })
    .EdgeRuntime;
  if (rt?.waitUntil) {
    rt.waitUntil(tache);
  }
  // Sans EdgeRuntime (execution locale, tests), la tache continue quand meme
  // en arriere-plan : on ne bloque jamais l'appelant pour l'attendre.
}
