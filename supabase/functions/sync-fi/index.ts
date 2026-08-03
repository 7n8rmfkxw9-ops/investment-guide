// Edge Function `sync-fi` — cron hebdomadaire (ou invocation manuelle).
//
// Suede : Finansinspektionen (FI) publie l'integralite de son registre
// d'inities — les operations declarees au titre du reglement europeen sur les
// abus de marche (MAR, article 19) — en un seul fichier CSV telechargeable.
//
// C'est la source europeenne la plus robuste a ce jour : aucune analyse de
// page web, donc rien qui casse si le site est refondu. Un seul telechargement
// couvre toutes les societes cotees suedoises.
//
// Une fonction par pays : chaque regulateur a son propre format, et une panne
// de l'un ne doit pas empecher les autres de s'executer. C'est aussi ce qui
// garde chaque execution dans le budget de calcul.

import { createClient } from "npm:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";
import { programmerNotification } from "../_shared/push.ts";
import { verifierAppelant } from "../_shared/auth.ts";
import {
  decoderCsv,
  evaluerLigneFi,
  ligneCsv,
  normaliserNom,
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
// Suede — registre d'inities de Finansinspektionen

const FI_CSV =
  "https://marknadssok.fi.se/publiceringsklient/en-GB/Search/Search" +
  "?SearchFunctionType=Insyn&button=export&Page=1";
const FI_REGISTRE = "https://marknadssok.fi.se/publiceringsklient/en-GB/Search/Search?SearchFunctionType=Insyn";
const FI_MAX_PISTES = 25; // plafond par execution
const FI_UA = `investment-guide/1.0 (veille personnelle; ${SEC_UA.split(" ").pop()})`;

interface LigneFi {
  publication: string;
  emetteur: string;
  personne: string;
  fonction: string;
  proche: string;
  option: string;
  nature: string;
  instrument: string;
  isin: string;
  dateOperation: string;
  volume: number;
  unite: string;
  prix: number;
  devise: string;
  statut: string;
}

async function lireRegistreFi(): Promise<LigneFi[]> {
  const res = await fetch(FI_CSV, {
    headers: { "User-Agent": FI_UA, "Accept-Language": "en" },
  });
  if (!res.ok) throw new Error(`FI ${res.status} sur le registre suedois`);
  const texte = decoderCsv(await res.arrayBuffer());
  const lignes = texte.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lignes.length < 2) throw new Error("FI : registre vide (format modifie ?)");

  const entetes = ligneCsv(lignes[0]).map((h) => h.replace(/^"|"$/g, ""));
  const col = (nom: string) => entetes.findIndex((h) => h === nom);
  const iEmetteur = col("Issuer");
  const iNature = col("Nature of transaction");
  if (iEmetteur < 0 || iNature < 0) {
    throw new Error(
      `FI : colonnes attendues absentes (format modifie ?). Recu: ` +
        `${entetes.slice(0, 6).join(" | ")} [${entetes.length} colonnes, ` +
        `${lignes.length} lignes, ${texte.length} caracteres]`,
    );
  }
  const idx = {
    publication: col("Publication date"),
    emetteur: iEmetteur,
    personne: col("Person discharging managerial responsibilities"),
    fonction: col("Position"),
    proche: col("Closely associated"),
    option: col("Linked to share option programme"),
    nature: iNature,
    instrument: col("Instrument name"),
    isin: col("ISIN"),
    dateOperation: col("Transaction date"),
    volume: col("Volume"),
    unite: col("Unit"),
    prix: col("Price"),
    devise: col("Currency"),
    statut: col("Status"),
  };

  const out: LigneFi[] = [];
  for (const l of lignes.slice(1)) {
    const v = ligneCsv(l).map((x) => x.replace(/^"|"$/g, ""));
    const lire = (i: number) => (i >= 0 && i < v.length ? v[i] : "");
    out.push({
      publication: lire(idx.publication),
      emetteur: lire(idx.emetteur),
      personne: lire(idx.personne),
      fonction: lire(idx.fonction),
      proche: lire(idx.proche),
      option: lire(idx.option),
      nature: lire(idx.nature),
      instrument: lire(idx.instrument),
      isin: lire(idx.isin),
      dateOperation: lire(idx.dateOperation),
      volume: Number(lire(idx.volume).replace(",", ".")) || 0,
      unite: lire(idx.unite),
      prix: Number(lire(idx.prix).replace(",", ".")) || 0,
      devise: lire(idx.devise),
      statut: lire(idx.statut),
    });
  }
  return out;
}

async function processFi(
  issuers: { id: string; user_id: string; name: string; ticker: string }[],
): Promise<PisteInsert[]> {
  const pistes: PisteInsert[] = [];
  if (issuers.length === 0) return pistes;

  const suivis = new Map(issuers.map((i) => [normaliserNom(i.name), i]));
  const lignes = await lireRegistreFi();

  for (const l of lignes) {
    if (pistes.length >= FI_MAX_PISTES) break;
    const suivi = suivis.get(normaliserNom(l.emetteur));
    if (!suivi) continue;

    // Seules les acquisitions et cessions fermes portent un sens ; les
    // corrections, lignes annulees et levees de stock-options sont ecartees
    // (voir evaluerLigneFi — c'est cette derniere qui avait laisse passer
    // une levee d'options a 235,15 SEK presentee comme un achat de Sobi).
    const decision = evaluerLigneFi(l);
    if (!decision) continue;
    const estAchat = decision === "achat";

    // Le registre n'expose pas d'identifiant par ligne : on derive une cle
    // stable du contenu de la declaration.
    const ref =
      `fi:${l.emetteur}|${l.personne}|${l.dateOperation}|${l.nature}` +
      `|${l.volume}|${l.prix}`;

    const { data: deja } = await supabase
      .from("processed_filings")
      .select("id")
      .eq("user_id", suivi.user_id)
      .eq("accession_no", ref)
      .maybeSingle();
    if (deja) continue;

    const montant = l.volume * l.prix;
    const devise = l.devise || "SEK";
    const qualite = l.fonction ? ` (${l.fonction})` : "";
    const viaProche = /^yes$/i.test(l.proche)
      ? " par une personne qui lui est étroitement liée"
      : "";
    const fallback =
      `${l.personne}${qualite} a déclaré ${estAchat ? "l'achat" : "la vente"}${viaProche} de ` +
      `${l.volume.toLocaleString("fr-FR")} titres ${l.emetteur} le ` +
      `${l.dateOperation.split(" ")[0]} ` +
      `(${Math.round(montant).toLocaleString("fr-FR")} ${devise} environ, à ` +
      `${l.prix.toLocaleString("fr-FR")} ${devise} par titre). ` +
      `Déclaration publiée par Finansinspektionen, le régulateur suédois, au ` +
      `titre du règlement européen sur les abus de marché. Les montants sont ` +
      `en ${devise} : un achat depuis la zone euro implique une conversion.`;
    const contexte = await generateContexte(
      fallback,
      `Déclaration Finansinspektionen (règlement MAR) publiée le ${l.publication} ` +
        `pour ${l.emetteur} (ISIN ${l.isin}). Déclarant : ${l.personne}${qualite}. ` +
        `Opération : ${l.nature}, ${l.volume} titres à ${l.prix} ${devise}, ` +
        `soit ${Math.round(montant)} ${devise}, le ${l.dateOperation}. ` +
        `Titre cote en ${devise}, hors zone euro.`,
    );

    pistes.push({
      user_id: suivi.user_id,
      signal: estAchat ? "mar_buy" : "mar_sell",
      ticker: suivi.ticker || null,
      sector: null,
      company_name: l.emetteur,
      source_name: l.personne || "Initié",
      source_url: FI_REGISTRE,
      contexte,
      details: {
        marche: "SE",
        isin: l.isin,
        nature: l.nature,
        quantite: l.volume,
        prix: l.prix,
        devise,
        montant: Math.round(montant),
        date_operation: l.dateOperation,
        fonction: l.fonction,
        lie_plan_options: l.option || null,
      },
      filed_at: null,
    });
    await supabase.from("processed_filings").insert({
      user_id: suivi.user_id,
      accession_no: ref,
      form_type: "MAR-SE",
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
    .eq("market", "SE");

  const parUtilisateur = new Map<string, number>();
  try {
    const pistes = await processFi(issuers ?? []);
    if (pistes.length) {
      const { error } = await supabase.from("pistes").insert(pistes);
      if (error) throw error;
      created += pistes.length;
      for (const p of pistes) {
        parUtilisateur.set(p.user_id, (parUtilisateur.get(p.user_id) ?? 0) + 1);
      }
    }
  } catch (e) {
    const msg = `FI: ${e instanceof Error ? e.message : String(e)}`;
    console.error(msg);
    errors.push(msg);
  }

  for (const [userId, n] of parUtilisateur) {
    programmerNotification(supabase, userId, {
      titre: "Veille investissement",
      corps: `${n} nouvelle${n > 1 ? "s" : ""} piste${n > 1 ? "s" : ""} détectée${n > 1 ? "s" : ""} (Finansinspektionen).`,
      url: "./",
    });
  }

  // Journal d'exécution : seule façon de detecter un cron hebdomadaire qui
  // echoue silencieusement, personne d'autre que l'utilisateur ne surveille
  // cet outil.
  await supabase.from("sync_runs").insert({
    source: "sync-fi",
    started_at: debut,
    created_count: created,
    errors,
    ok: errors.length === 0,
  });

  return new Response(JSON.stringify({ created, errors }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
