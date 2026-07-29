// Edge Function `cotations` — cours de bourse pour l'entrainement.
//
// Sert uniquement les simulations : sans cours reel, un achat fictif ne peut
// pas etre confronte aux faits. Cette fonction ne fait que lire des cours
// passes et presents. Elle ne prevoit rien, ne note rien, et n'est jamais
// utilisee pour produire un signal : les pistes viennent exclusivement des
// registres officiels (SEC, FSMA, Finansinspektionen).
//
// Quatre actions :
//   recherche   nom d'entreprise -> symboles de cotation candidats
//   cours       symbole -> dernier cours connu et devise
//   historique  symbole + date -> cours de cloture ce jour-la
//   rafraichir  met a jour la valorisation des simulations ouvertes
//
// Les montants sont ramenes en euros via le taux de change du jour, parce que
// c'est la monnaie dans laquelle l'utilisateur raisonne : une action suedoise
// peut monter en couronnes et faire perdre de l'argent en euros.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const YAHOO = "https://query1.finance.yahoo.com";
const UA = "Mozilla/5.0 (compatible; veille-investissement personnelle)";

/** Placement de reference : ETF actions mondiales, cote en euros a Amsterdam. */
const REF_SYMBOLE = "IWDA.AS";

interface Cours {
  symbole: string;
  nom: string | null;
  devise: string;
  prix: number;
  /** 1 EUR = tauxEur unites de la devise du titre. */
  tauxEur: number;
}

// ---------------------------------------------------------------------------
// Acces au fournisseur de cours

async function yahoo(chemin: string): Promise<Record<string, unknown>> {
  const r = await fetch(`${YAHOO}${chemin}`, { headers: { "User-Agent": UA } });
  if (!r.ok) throw new Error(`cours indisponibles (${r.status})`);
  return (await r.json()) as Record<string, unknown>;
}

/** Serie de cloture d'un symbole, dates ISO et cours alignes. */
async function serie(
  symbole: string,
  params: string,
): Promise<{ meta: Record<string, unknown>; dates: string[]; cloture: number[] }> {
  const j = await yahoo(`/v8/finance/chart/${encodeURIComponent(symbole)}?${params}`);
  const chart = j.chart as Record<string, unknown> | undefined;
  const res = (chart?.result as Record<string, unknown>[] | undefined)?.[0];
  if (!res) {
    const err = chart?.error as Record<string, unknown> | undefined;
    throw new Error(String(err?.description ?? `symbole introuvable : ${symbole}`));
  }
  const meta = (res.meta ?? {}) as Record<string, unknown>;
  const ts = (res.timestamp as number[] | undefined) ?? [];
  const quote = (res.indicators as Record<string, unknown> | undefined)?.quote as
    | Record<string, unknown>[]
    | undefined;
  const closeBrut = (quote?.[0]?.close as (number | null)[] | undefined) ?? [];
  const dates: string[] = [];
  const cloture: number[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closeBrut[i];
    // Les jours feries laissent des trous dans la serie : on les ignore
    // plutot que de propager un null jusqu'au calcul.
    if (typeof c !== "number" || !isFinite(c)) continue;
    dates.push(new Date(ts[i] * 1000).toISOString().slice(0, 10));
    cloture.push(c);
  }
  return { meta, dates, cloture };
}

/** Taux de change du jour : combien d'unites de `devise` pour 1 EUR. */
async function tauxEur(devise: string): Promise<number> {
  if (devise === "EUR") return 1;
  const { meta, cloture } = await serie(`EUR${devise}=X`, "range=5d&interval=1d");
  const t = Number(meta.regularMarketPrice ?? cloture[cloture.length - 1]);
  if (!isFinite(t) || t <= 0) throw new Error(`taux de change indisponible : EUR/${devise}`);
  return t;
}

async function cours(symbole: string): Promise<Cours> {
  const { meta, cloture } = await serie(symbole, "range=5d&interval=1d");
  const prix = Number(meta.regularMarketPrice ?? cloture[cloture.length - 1]);
  if (!isFinite(prix) || prix <= 0) throw new Error(`cours indisponible : ${symbole}`);
  const devise = String(meta.currency ?? "EUR").toUpperCase();
  return {
    symbole: String(meta.symbol ?? symbole).toUpperCase(),
    nom: (meta.longName ?? meta.shortName ?? null) as string | null,
    devise,
    prix,
    tauxEur: await tauxEur(devise),
  };
}

/**
 * Cours de cloture a une date donnee. Marches fermes le week-end et les jours
 * feries : on retient la derniere seance a la date demandee ou avant, jamais
 * apres — simuler un achat a un cours futur n'aurait aucun sens.
 */
async function historique(symbole: string, date: string): Promise<Cours & { dateReelle: string }> {
  const cible = new Date(`${date}T00:00:00Z`);
  const debut = Math.floor((cible.getTime() - 12 * 86400_000) / 1000);
  const fin = Math.floor((cible.getTime() + 86400_000) / 1000);
  const { meta, dates, cloture } = await serie(
    symbole,
    `period1=${debut}&period2=${fin}&interval=1d`,
  );
  let idx = -1;
  for (let i = 0; i < dates.length; i++) if (dates[i] <= date) idx = i;
  if (idx < 0) throw new Error(`aucune séance connue pour ${symbole} au ${date}`);
  const devise = String(meta.currency ?? "EUR").toUpperCase();
  return {
    symbole: String(meta.symbol ?? symbole).toUpperCase(),
    nom: (meta.longName ?? meta.shortName ?? null) as string | null,
    devise,
    prix: cloture[idx],
    tauxEur: await tauxEur(devise),
    dateReelle: dates[idx],
  };
}

/** Symboles candidats pour un nom d'entreprise. */
async function recherche(q: string): Promise<Record<string, unknown>[]> {
  const j = await yahoo(
    `/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=12&newsCount=0`,
  );
  const quotes = (j.quotes as Record<string, unknown>[] | undefined) ?? [];
  return quotes
    .filter((x) => x.quoteType === "EQUITY" || x.quoteType === "ETF")
    .map((x) => ({
      symbole: String(x.symbol ?? ""),
      nom: String(x.longname ?? x.shortname ?? ""),
      place: String(x.exchDisp ?? x.exchange ?? ""),
      type: x.quoteType === "ETF" ? "ETF" : "Action",
    }))
    .filter((x) => x.symbole);
}

// ---------------------------------------------------------------------------
// Rafraichissement des simulations ouvertes

async function rafraichir(userId: string): Promise<{ misesAJour: number; erreurs: string[] }> {
  const { data, error } = await supabase
    .from("simulations")
    .select("id, symbole, devise, ref_symbole")
    .eq("user_id", userId)
    .is("closed_at", null);
  if (error) throw new Error(error.message);
  const lignes = data ?? [];
  if (lignes.length === 0) return { misesAJour: 0, erreurs: [] };

  // Un seul appel par symbole distinct, meme s'il apparait dans plusieurs
  // simulations, et un seul pour la reference commune.
  const symboles = new Set<string>(lignes.map((l) => l.symbole as string));
  const cache = new Map<string, Cours>();
  const erreurs: string[] = [];
  for (const s of symboles) {
    try {
      cache.set(s, await cours(s));
    } catch (e) {
      erreurs.push(`${s} : ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  let refPrix: number | null = null;
  if (lignes.some((l) => l.ref_symbole)) {
    try {
      refPrix = (await cours(REF_SYMBOLE)).prix;
    } catch {
      refPrix = null;
    }
  }

  const maintenant = new Date().toISOString();
  let misesAJour = 0;
  for (const l of lignes) {
    const c = cache.get(l.symbole as string);
    if (!c) continue;
    const maj: Record<string, unknown> = {
      prix_actuel: c.prix,
      taux_actuel: c.tauxEur,
      prix_maj_at: maintenant,
    };
    if (l.ref_symbole && refPrix != null) maj.ref_prix_actuel = refPrix;
    const { error: e } = await supabase
      .from("simulations")
      .update(maj)
      .eq("id", l.id)
      .eq("user_id", userId);
    if (e) erreurs.push(`${l.symbole} : ${e.message}`);
    else misesAJour++;
  }
  return { misesAJour, erreurs };
}

// ---------------------------------------------------------------------------

/** L'appelant doit etre authentifie : chaque simulation appartient a quelqu'un. */
async function utilisateur(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth) return null;
  const { data } = await supabase.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
  return data.user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });

  try {
    const corps = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(corps.action ?? "");

    switch (action) {
      case "recherche": {
        const q = String(corps.q ?? "").trim();
        if (!q) return json({ resultats: [] });
        return json({ resultats: await recherche(q) });
      }
      case "cours": {
        const s = String(corps.symbole ?? "").trim();
        if (!s) return json({ erreur: "symbole manquant" }, 400);
        return json(await cours(s));
      }
      case "historique": {
        const s = String(corps.symbole ?? "").trim();
        const d = String(corps.date ?? "").trim();
        if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          return json({ erreur: "symbole ou date manquants" }, 400);
        }
        const [titre, reference] = await Promise.all([
          historique(s, d),
          historique(REF_SYMBOLE, d).catch(() => null),
        ]);
        return json({
          ...titre,
          reference: reference
            ? { symbole: REF_SYMBOLE, prix: reference.prix, devise: reference.devise }
            : null,
        });
      }
      case "rafraichir": {
        const uid = await utilisateur(req);
        if (!uid) return json({ erreur: "authentification requise" }, 401);
        return json(await rafraichir(uid));
      }
      default:
        return json({ erreur: `action inconnue : ${action || "(vide)"}` }, 400);
    }
  } catch (e) {
    return json({ erreur: e instanceof Error ? e.message : String(e) }, 502);
  }
});
