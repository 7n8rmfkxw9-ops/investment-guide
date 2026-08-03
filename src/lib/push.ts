/**
 * Notifications push (Web Push standard, pas un service tiers).
 *
 * Sur iPhone/iPad, Safari n'autorise les notifications push que pour une app
 * ajoutee a l'ecran d'accueil (mode « standalone ») — jamais depuis un onglet
 * Safari ordinaire, et seulement a partir d'iOS 16.4. C'est une limite
 * d'Apple, pas de cet outil : `verifieCompatibilite` la detecte pour afficher
 * le bon message plutot que de laisser un bouton qui ne ferait rien.
 */

import { supabase } from "./supabase";

/** Cle publique VAPID : sans danger a exposer, elle identifie cet outil aupres
 *  des serveurs de notification, elle ne permet pas d'envoyer de messages. */
const VAPID_PUBLIC_KEY =
  "BPCu8S9px80X67hRPdr2zeeR0W8A4MC6ndCfNYwSc93s5sPp_Z31GRUQhsBfT0Q7jKlpP4NuqiwrWt9WT6_YC9k";

export interface CompatibilitePush {
  supporte: boolean;
  /** Vrai si l'app tourne en mode installe (necessaire sur iOS). */
  installee: boolean;
  raison?: string;
}

function estIOS(): boolean {
  return /iP(hone|ad|od)/.test(navigator.userAgent);
}

function estInstallee(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function verifieCompatibilite(): CompatibilitePush {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return {
      supporte: false,
      installee: false,
      raison: "Ce navigateur ne prend pas en charge les notifications.",
    };
  }
  const installee = estInstallee();
  if (estIOS() && !installee) {
    return {
      supporte: false,
      installee: false,
      raison:
        "Sur iPhone/iPad, ajoutez d'abord cette page à l'écran d'accueil (voir plus haut) : " +
        "Safari n'autorise les notifications que pour l'app installée, jamais depuis un onglet.",
    };
  }
  return { supporte: true, installee };
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const brut = atob(base64Safe);
  return Uint8Array.from([...brut].map((c) => c.charCodeAt(0)));
}

export type EtatAbonnement = "abonne" | "non-abonne" | "refuse";

export async function etatActuel(): Promise<EtatAbonnement> {
  if (Notification.permission === "denied") return "refuse";
  const reg = await navigator.serviceWorker.getRegistration();
  const abonnement = await reg?.pushManager.getSubscription();
  return abonnement ? "abonne" : "non-abonne";
}

/** Active les notifications : permission, abonnement, enregistrement cote serveur. */
export async function activer(): Promise<EtatAbonnement> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "refuse";

  const reg = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
  await navigator.serviceWorker.ready;

  const abonnement = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
  });
  const brut = abonnement.toJSON() as {
    endpoint: string;
    keys?: { p256dh?: string; auth?: string };
  };
  if (!brut.keys?.p256dh || !brut.keys?.auth) {
    throw new Error("Abonnement incomplet renvoyé par le navigateur.");
  }

  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: u.user!.id,
      endpoint: brut.endpoint,
      p256dh: brut.keys.p256dh,
      auth: brut.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
  return "abonne";
}

/** Desactive les notifications sur cet appareil. */
export async function desactiver(): Promise<void> {
  const reg = await navigator.serviceWorker.getRegistration();
  const abonnement = await reg?.pushManager.getSubscription();
  if (abonnement) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", abonnement.endpoint);
    await abonnement.unsubscribe();
  }
}
