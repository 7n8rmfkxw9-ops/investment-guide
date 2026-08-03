// Edge Function `sync-fsma` — cron hebdomadaire (ou invocation manuelle).
//
// Pendant europeen de `sync-edgar` : recupere les operations de dirigeants
// declarees au titre du reglement europeen sur les abus de marche (MAR,
// article 19) et publiees par la FSMA, le regulateur belge.
//
// Fonction distincte de `sync-edgar` a dessein : les deux sources cumulees
// depassaient le budget de calcul d'une seule execution, et une panne de l'une
// ne doit pas empecher l'autre de s'executer.

import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { programmerNotification } from "../_shared/push.ts";
import { verifierAppelant } from "../_shared/auth.ts";
import {
  champ,
  classifierNatureFsma,
  extraireLigneFsma,
  parseBeNumber,
  stripTags,
} from "../_shared/parsing.ts";

const SEC_UA = Deno.env.get("SEC_USER_AGENT") ?? "investment-guide contact@example.com";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;


// ---------------------------------------------------------------------------
// Contexte via API Anthropic — synthese factuelle, jamais une recommandation

async function generateContexte(fallback: string, facts: string): Promise<string> {
  if (!anthropic) return fallback;
  try {
    const msg = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      system:
        "Tu resumes des mouvements declares a la SEC pour un outil personnel " +
        "de veille. Redige en francais un resume STRICTEMENT FACTUEL de 2 a 3 " +
        "phrases decrivant ce qui a ete declare et son contexte. Interdictions " +
        "absolues : aucune recommandation d'achat ou de vente, aucune " +
        "prediction de cours, aucun score ou pourcentage de confiance, aucun " +
        "ton incitatif. Rappelle brievement la limite de la donnee si " +
        "pertinent (delai de publication, position longue uniquement, motifs " +
        "de vente souvent non informatifs).",
      messages: [{ role: "user", content: facts }],
    });
    if (msg.stop_reason === "refusal") return fallback;
    const text = msg.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join(" ")
      .trim();
    return text || fallback;
  } catch (e) {
    console.error("Anthropic API:", e);
    return fallback;
  }
}

interface PisteInsert {
  user_id: string;
  signal: string;
  ticker: string | null;
  company_name: string;
  source_name: string;
  source_url: string;
  contexte: string;
  details: Record<string, unknown>;
  filed_at: string | null;
  sector: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Belgique — transactions de dirigeants publiees par la FSMA
//
// Il n'existe pas d'equivalent europeen du 13F : aucune obligation de publier
// un portefeuille complet chaque trimestre. En revanche l'article 19 du
// reglement europeen sur les abus de marche (MAR) impose aux dirigeants de
// declarer leurs operations des 20 000 EUR cumules sur l'annee, et chaque
// regulateur national les publie. Pour la Belgique : la FSMA.
//
// La FSMA n'expose pas d'API : on lit son registre public en HTML. C'est plus
// fragile qu'une API (une refonte de leur site casse l'analyse), d'ou les
// gardes ci-dessous. Le volume reste negligeable : une page de liste plus
// quelques pages de detail par semaine.

const FSMA_BASE = "https://www.fsma.be";
const FSMA_UA = `investment-guide/1.0 (veille personnelle; ${SEC_UA.split(" ").pop()})`;
const FSMA_DELAY_MS = 5000; // courtoisie envers le serveur de la FSMA
const FSMA_MAX_DETAILS = 12; // plafond par execution

async function fsmaFetch(path: string): Promise<string> {
  const res = await fetch(`${FSMA_BASE}${path}`, {
    headers: { "User-Agent": FSMA_UA, "Accept-Language": "fr" },
  });
  if (!res.ok) throw new Error(`FSMA ${res.status} sur ${path}`);
  return await res.text();
}

/** Lit la liste publique des transactions de dirigeants les plus recentes. */
async function fsmaRecentRows() {
  const html = await fsmaFetch("/fr/transaction-search");
  const table = html.match(/<table[\s\S]*?<\/table>/);
  if (!table) throw new Error("FSMA : tableau introuvable (site modifie ?)");
  const rows = [];
  for (const tr of table[0].match(/<tr[^>]*>[\s\S]*?<\/tr>/g) ?? []) {
    const ligne = extraireLigneFsma(tr);
    if (ligne) rows.push(ligne);
  }
  return rows;
}

/** Champs de la fiche de detail, indexes par intitule. */
async function fsmaDetail(path: string): Promise<Record<string, string>> {
  const html = await fsmaFetch(path);
  const body = html.replace(/<script[\s\S]*?<\/script>/g, "");
  // La fiche est une suite d'intitules suivis de leur valeur.
  const parts = body
    .split(/<\/?(?:div|dt|dd|td|th|p|li|h[1-6])[^>]*>/)
    .map(stripTags)
    .filter((s) => s.length > 0);
  const champs: Record<string, string> = {};
  // Intitules reels des fiches FSMA, versions francaise et anglaise.
  const attendus = [
    "Date de publication", "Date of publication",
    "Nom du déclarant", "Notifying person",
    "Qualité du déclarant", "Declarer Type",
    "Dirigeant(s) au(x)quel(s) le déclarant est étroitement lié",
    "Declarer Related Persons",
    "Émetteur", "Issuer",
    "Type de transaction", "Transaction Type",
    "Transaction Date", "Date de la transaction",
    "Nombre d'instruments financiers", "Transaction Quantity",
    "Prix", "Transaction Price",
    "Montant total", "Transaction Amount",
    "Code ISIN de l'instrument financier", "Instrument ISIN Code",
  ];
  for (let i = 0; i < parts.length - 1; i++) {
    if (attendus.includes(parts[i]) && !champs[parts[i]]) {
      champs[parts[i]] = parts[i + 1];
    }
  }
  return champs;
}

async function processFsma(
  issuers: { id: string; user_id: string; name: string; ticker: string }[],
): Promise<PisteInsert[]> {
  const pistes: PisteInsert[] = [];
  if (issuers.length === 0) return pistes;

  const parNom = new Map(issuers.map((i) => [i.name.toUpperCase(), i]));
  const rows = (await fsmaRecentRows()).filter((r) =>
    parNom.has(r.issuer.toUpperCase()),
  );

  let traites = 0;
  for (const row of rows) {
    if (traites >= FSMA_MAX_DETAILS) break;
    const suivi = parNom.get(row.issuer.toUpperCase())!;
    const ref = `fsma:${row.path}`;

    const { data: deja } = await supabase
      .from("processed_filings")
      .select("id")
      .eq("user_id", suivi.user_id)
      .eq("accession_no", ref)
      .maybeSingle();
    if (deja) continue;

    if (traites > 0) await sleep(FSMA_DELAY_MS);
    traites++;

    let c: Record<string, string>;
    try {
      c = await fsmaDetail(row.path);
    } catch (e) {
      console.error(`FSMA detail illisible ${row.path}:`, e);
      continue;
    }

    const nature = champ(c, "Type de transaction", "Transaction Type");
    // On ne retient que les achats et ventes fermes : les autres natures
    // (donation, transfert, exercice d'options) ne sont pas des operations
    // de marche et n'ont pas la meme signification.
    const natureClassee = classifierNatureFsma(nature);
    const estAchat = natureClassee === "achat";
    if (natureClassee === "autre") {
      await supabase.from("processed_filings").insert({
        user_id: suivi.user_id,
        accession_no: ref,
        form_type: "MAR",
      });
      continue;
    }

    const quantite = parseBeNumber(champ(c, "Nombre d'instruments financiers", "Transaction Quantity"));
    const prix = parseBeNumber(champ(c, "Prix", "Transaction Price"));
    const montant = parseBeNumber(champ(c, "Montant total", "Transaction Amount"));
    const dateOp =
      champ(c, "Transaction Date", "Date de la transaction") || row.publishedAt;
    const isin = champ(c, "Code ISIN de l'instrument financier", "Instrument ISIN Code");
    const lien = champ(c, "Dirigeant(s) au(x)quel(s) le déclarant est étroitement lié", "Declarer Related Persons");
    const qualite = champ(c, "Qualité du déclarant", "Declarer Type");

    const roleTxt = lien ? ` (personne liée à ${lien})` : qualite ? ` (${qualite})` : "";
    const fallback =
      `${row.person}${roleTxt} a déclaré ${estAchat ? "l'achat" : "la vente"} de ` +
      `${quantite.toLocaleString("fr-FR")} titres ${row.issuer} le ${dateOp} ` +
      `(${montant.toLocaleString("fr-FR")} € environ, à ${prix.toLocaleString("fr-FR")} € par titre). ` +
      `Déclaration publiée par la FSMA au titre du règlement européen sur les abus ` +
      `de marché. Les motifs d'une opération ne sont pas déclarés.`;
    const contexte = await generateContexte(
      fallback,
      `Déclaration FSMA (règlement MAR) publiée le ${row.publishedAt} pour ${row.issuer}. ` +
        `Déclarant : ${row.person}${roleTxt}. Opération : ${nature}, ` +
        `${quantite} titres à ${prix} EUR, soit ${montant} EUR, le ${dateOp}.`,
    );

    pistes.push({
      user_id: suivi.user_id,
      signal: estAchat ? "mar_buy" : "mar_sell",
      ticker: suivi.ticker || null,
      sector: null,
      company_name: row.issuer,
      source_name: row.person,
      source_url: `${FSMA_BASE}${row.path}`,
      contexte,
      details: {
        marche: "BE",
        isin,
        nature,
        quantite,
        prix_eur: prix,
        montant_eur: montant,
        date_operation: dateOp,
      },
      filed_at: null,
    });
    await supabase.from("processed_filings").insert({
      user_id: suivi.user_id,
      accession_no: ref,
      form_type: "MAR",
    });
  }
  return pistes;
}

// ---------------------------------------------------------------------------
// Handler

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  // N'accepte que le cron hebdomadaire (cle de role service) ou un
  // utilisateur reellement connecte a l'application — jamais la seule cle
  // anonyme, qui est publique par construction (embarquee cote client).
  const verif = await verifierAppelant(req, supabase);
  if (!verif.ok) {
    return new Response(JSON.stringify({ erreur: verif.message }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
  const debut = new Date().toISOString();
  const errors: string[] = [];
  let created = 0;

  const { data: issuers } = await supabase
    .from("watched_issuers")
    .select("*")
    .eq("market", "BE");

  const parUtilisateur = new Map<string, number>();
  try {
    const pistes = await processFsma(issuers ?? []);
    if (pistes.length) {
      const { error } = await supabase.from("pistes").insert(pistes);
      if (error) throw error;
      created += pistes.length;
      for (const p of pistes) {
        parUtilisateur.set(p.user_id, (parUtilisateur.get(p.user_id) ?? 0) + 1);
      }
    }
  } catch (e) {
    const msg = `FSMA: ${e instanceof Error ? e.message : String(e)}`;
    console.error(msg);
    errors.push(msg);
  }

  for (const [userId, n] of parUtilisateur) {
    programmerNotification(supabase, userId, {
      titre: "Veille investissement",
      corps: `${n} nouvelle${n > 1 ? "s" : ""} piste${n > 1 ? "s" : ""} détectée${n > 1 ? "s" : ""} (FSMA).`,
      url: "./",
    });
  }

  // Journal d'exécution : seule façon de detecter un cron hebdomadaire qui
  // echoue silencieusement, personne d'autre que l'utilisateur ne surveille
  // cet outil.
  await supabase.from("sync_runs").insert({
    source: "sync-fsma",
    started_at: debut,
    created_count: created,
    errors,
    ok: errors.length === 0,
  });

  return new Response(JSON.stringify({ created, errors }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
