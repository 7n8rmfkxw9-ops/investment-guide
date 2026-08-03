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

/**
 * Serie de cours pour tracer une courbe, avec les reperes factuels du titre.
 * Aucune projection : uniquement ce qui s'est deja produit.
 */
async function graphique(symbole: string, periode: string) {
  const periodes: Record<string, string> = {
    "1m": "range=1mo&interval=1d",
    "6m": "range=6mo&interval=1d",
    "1a": "range=1y&interval=1d",
    "5a": "range=5y&interval=1wk",
  };
  const params = periodes[periode] ?? periodes["1a"];
  const { meta, dates, cloture } = await serie(symbole, params);
  const devise = String(meta.currency ?? "EUR").toUpperCase();
  return {
    symbole: String(meta.symbol ?? symbole).toUpperCase(),
    nom: (meta.longName ?? meta.shortName ?? null) as string | null,
    devise,
    prix: Number(meta.regularMarketPrice ?? cloture[cloture.length - 1]),
    tauxEur: await tauxEur(devise),
    // Bornes sur 52 semaines publiees par la place : plus fiables que le
    // min/max de la fenetre affichee, qui depend de la periode choisie.
    haut52: meta.fiftyTwoWeekHigh ?? null,
    bas52: meta.fiftyTwoWeekLow ?? null,
    serie: dates.map((d, i) => ({ date: d, prix: cloture[i] })),
  };
}

/** Grands indices de reference, pour situer l'ambiance generale des marches. */
const INDICES: { symbole: string; nom: string; pays: string }[] = [
  { symbole: "^BFX", nom: "BEL 20", pays: "🇧🇪" },
  { symbole: "^STOXX50E", nom: "Euro Stoxx 50", pays: "🇪🇺" },
  { symbole: "^OMX", nom: "OMX Stockholm 30", pays: "🇸🇪" },
  { symbole: "^GSPC", nom: "S&P 500", pays: "🇺🇸" },
  { symbole: "IWDA.AS", nom: "ETF actions mondiales", pays: "🌍" },
];

async function marche() {
  const resultats = await Promise.all(
    INDICES.map(async (idx) => {
      try {
        const { meta, dates, cloture } = await serie(idx.symbole, "range=1y&interval=1d");
        const dernier = Number(meta.regularMarketPrice ?? cloture[cloture.length - 1]);
        const veille = cloture[cloture.length - 2] ?? dernier;
        return {
          ...idx,
          devise: String(meta.currency ?? "").toUpperCase(),
          prix: dernier,
          varJourPct: veille ? (dernier / veille - 1) * 100 : 0,
          serie: dates.map((d, i) => ({ date: d, prix: cloture[i] })),
        };
      } catch {
        // Un indice indisponible ne doit pas vider toute la page.
        return { ...idx, devise: "", prix: null, varJourPct: null, serie: [] };
      }
    }),
  );
  return { indices: resultats, mesureA: new Date().toISOString() };
}

/**
 * Bilan retrospectif d'une liste de pistes : pour chacune, la variation du
 * cours depuis la date de la piste jusqu'a aujourd'hui, comparee a un ETF
 * mondial sur la meme periode. Toujours des faits deja survenus, jamais une
 * projection — c'est la meme regle que partout ailleurs dans l'outil.
 *
 * Les symboles identiques sont resolus une seule fois (beaucoup de pistes
 * partagent la meme societe), et l'appel groupe reste dans une seule
 * requete pour eviter au client de multiplier les allers-retours.
 */
async function palmares(
  items: { id: string; symbole: string; date: string }[],
): Promise<Record<string, unknown>[]> {
  // Le cours actuel d'un titre ne depend pas de la date de la piste : un seul
  // appel par symbole distinct suffit, meme si plusieurs pistes le partagent.
  const symboles = new Set(items.map((it) => it.symbole));
  const coursActuels = new Map<string, Cours | Error>();
  await Promise.all(
    [...symboles].map(async (s) => {
      try {
        coursActuels.set(s, await cours(s));
      } catch (e) {
        coursActuels.set(s, e instanceof Error ? e : new Error(String(e)));
      }
    }),
  );
  let refActuelle: number | null = null;
  try {
    refActuelle = (await cours(REF_SYMBOLE)).prix;
  } catch {
    refActuelle = null;
  }

  // Le cours de reference a la date d'une piste ne depend que de cette date :
  // plusieurs pistes du meme jour partagent le meme appel.
  const dates = new Set(items.map((it) => it.date));
  const refHistorique = new Map<string, number | null>();
  await Promise.all(
    [...dates].map(async (d) => {
      try {
        refHistorique.set(d, (await historique(REF_SYMBOLE, d)).prix);
      } catch {
        refHistorique.set(d, null);
      }
    }),
  );

  return await Promise.all(
    items.map(async (it) => {
      try {
        const [h, actuel] = await Promise.all([
          historique(it.symbole, it.date),
          Promise.resolve(coursActuels.get(it.symbole)),
        ]);
        if (actuel instanceof Error) throw actuel;
        if (!actuel) throw new Error(`cours indisponible : ${it.symbole}`);
        return {
          id: it.id,
          devise: h.devise,
          dateReelle: h.dateReelle,
          prixEntree: h.prix,
          tauxEntree: h.tauxEur,
          prixActuel: actuel.prix,
          tauxActuel: actuel.tauxEur,
          referenceEntree: refHistorique.get(it.date) ?? null,
          referenceActuelle: refActuelle,
        };
      } catch (e) {
        return { id: it.id, erreur: e instanceof Error ? e.message : String(e) };
      }
    }),
  );
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

  // Reserve aux utilisateurs de l'application : sans cela, la seule cle
  // anonyme (publique par construction, embarquee cote client) suffirait a
  // faire tourner ce proxy vers Yahoo Finance pour n'importe qui, au risque
  // de faire bannir l'IP partagee du projet.
  if (!(await utilisateur(req))) {
    return json({ erreur: "authentification requise" }, 401);
  }

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
      case "graphique": {
        const s = String(corps.symbole ?? "").trim();
        const p = String(corps.periode ?? "1a").trim();
        if (!s) return json({ erreur: "symbole manquant" }, 400);
        return json(await graphique(s, p));
      }
      case "marche":
        return json(await marche());
      case "palmares": {
        const items = (
          Array.isArray(corps.items) ? corps.items : []
        ) as { id: string; symbole: string; date: string }[];
        const valides = items.filter(
          (it) => it?.id && it?.symbole && /^\d{4}-\d{2}-\d{2}$/.test(it?.date ?? ""),
        );
        // Plafond de securite : un usage strictement personnel n'accumule pas
        // des milliers de pistes, et ca evite un appel demesure au fournisseur.
        return json({ resultats: await palmares(valides.slice(0, 60)) });
      }
      default:
        return json({ erreur: `action inconnue : ${action || "(vide)"}` }, 400);
    }
  } catch (e) {
    return json({ erreur: e instanceof Error ? e.message : String(e) }, 502);
  }
});
