/**
 * Export personnel : tout ce que l'utilisateur a saisi ou accumule, dans un
 * seul fichier JSON telecharge localement. Cet outil vit entierement dans un
 * projet Supabase que personne d'autre ne maintient — avoir sa propre copie
 * hors ligne est une precaution raisonnable, pas une fonctionnalite de
 * confort.
 *
 * Volontairement exclus :
 *  - push_subscriptions : des jetons d'appareil, pas des donnees a relire ou
 *    restaurer, et sensibles a diffuser (un jeton valide permet d'envoyer des
 *    notifications a cet appareil).
 *  - processed_filings, holdings_snapshots, issuer_map : de la comptabilite
 *    interne de deduplication et un cache technique, sans valeur pour
 *    l'utilisateur en dehors de l'outil lui-meme.
 */
import { supabase } from "./supabase";

export async function exporterDonnees(): Promise<void> {
  const { data: u } = await supabase.auth.getUser();

  const [pistes, simulations, appLinks, watchedIssuers, managers, settings] =
    await Promise.all([
      supabase.from("pistes").select("*").order("detected_at", { ascending: false }),
      supabase.from("simulations").select("*").order("date_entree", { ascending: false }),
      supabase.from("app_links").select("*"),
      supabase.from("watched_issuers").select("*"),
      supabase.from("managers").select("*"),
      supabase.from("settings").select("*").maybeSingle(),
    ]);

  for (const r of [pistes, simulations, appLinks, watchedIssuers, managers]) {
    if (r.error) throw new Error(r.error.message);
  }

  const paquet = {
    exporte_le: new Date().toISOString(),
    compte: u.user?.email ?? null,
    pistes: pistes.data ?? [],
    simulations: simulations.data ?? [],
    mes_applications: appLinks.data ?? [],
    societes_suivies: watchedIssuers.data ?? [],
    gestionnaires_suivis: managers.data ?? [],
    reglages: settings.data ?? null,
  };

  const blob = new Blob([JSON.stringify(paquet, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `veille-investissement-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
