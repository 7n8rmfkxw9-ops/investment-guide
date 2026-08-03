// Edge Function `sync-edgar` — cron hebdomadaire (ou invocation manuelle).
//
// 1. 13F : pour chaque gestionnaire suivi, recupere le dernier depot 13F-HR,
//    le compare au trimestre precedent et genere des pistes (nouvelle entree,
//    renforcement, allegement, sortie).
// 2. Form 4 : pour chaque societe suivie, recupere les achats/ventes d'inities
//    recents et genere des pistes.
// 3. Chaque piste recoit un "contexte" de 2-3 phrases redige par l'API
//    Anthropic — synthese factuelle uniquement, jamais une recommandation ni
//    une prediction de cours.
//
// Source de donnees : API publique SEC EDGAR (https://www.sec.gov/edgar).
// La SEC demande un User-Agent identifiant ("Nom contact@example.com") :
// configurer le secret SEC_USER_AGENT.

import { createClient } from "npm:@supabase/supabase-js@2";
import { XMLParser } from "npm:fast-xml-parser@4";
import Anthropic from "npm:@anthropic-ai/sdk";
import { programmerNotification } from "../_shared/push.ts";
import {
  classifierMouvement13F,
  estAutreEmetteur,
  filingHumanUrl,
  filingIndexUrl,
  formatUsd,
  normalizeIssuerName,
  padCik,
} from "../_shared/parsing.ts";

const SEC_UA = Deno.env.get("SEC_USER_AGENT") ?? "investment-guide contact@example.com";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

const xml = new XMLParser({ ignoreAttributes: false, parseTagValue: false });

// ---------------------------------------------------------------------------
// Helpers SEC EDGAR (padCik, accessionNoDash, filingIndexUrl, filingHumanUrl,
// normalizeIssuerName et formatUsd vivent dans _shared/parsing.ts, testes)

// La SEC plafonne les acces a 10 requetes/seconde et repond 429 au-dela.
// Tous les appels sont donc serialises avec un intervalle minimal, et les
// reponses 429/5xx sont reessayees avec un backoff exponentiel.
const SEC_MIN_INTERVAL_MS = 150;
const SEC_MAX_ATTEMPTS = 4;
let secQueue: Promise<unknown> = Promise.resolve();
let lastSecCallAt = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function secFetchOnce(url: string): Promise<Response> {
  const wait = SEC_MIN_INTERVAL_MS - (Date.now() - lastSecCallAt);
  if (wait > 0) await sleep(wait);
  lastSecCallAt = Date.now();
  return await fetch(url, {
    headers: { "User-Agent": SEC_UA, "Accept-Encoding": "gzip, deflate" },
  });
}

async function secFetch(url: string): Promise<Response> {
  const run = async (): Promise<Response> => {
    let lastStatus = 0;
    for (let attempt = 0; attempt < SEC_MAX_ATTEMPTS; attempt++) {
      const res = await secFetchOnce(url);
      if (res.ok) return res;
      // Liberer le corps avant de reessayer, sinon la connexion fuit.
      await res.body?.cancel();
      if (res.status !== 429 && res.status < 500) {
        throw new Error(`SEC ${res.status} sur ${url}`);
      }
      lastStatus = res.status;
      await sleep(1000 * 2 ** attempt);
    }
    throw new Error(
      `SEC ${lastStatus} sur ${url} (abandon apres ${SEC_MAX_ATTEMPTS} tentatives)`,
    );
  };
  // Chainage : chaque appel attend la fin du precedent, succes ou echec.
  const result = secQueue.then(run, run);
  secQueue = result.catch(() => undefined);
  return result;
}

interface Submissions {
  name: string;
  sicDescription?: string;
  filings: {
    recent: {
      accessionNumber: string[];
      form: string[];
      filingDate: string[];
      reportDate: string[];
      primaryDocument: string[];
    };
  };
}

async function getSubmissions(cik: string): Promise<Submissions> {
  const res = await secFetch(`https://data.sec.gov/submissions/CIK${padCik(cik)}.json`);
  return (await res.json()) as Submissions;
}

// ---------------------------------------------------------------------------
// Resolution CUSIP -> ticker / secteur (referentiels publics SEC uniquement).
// Les 13F ne fournissent que le CUSIP et le nom de l'emetteur ; on rapproche
// ce nom du referentiel company_tickers.json (correspondance par nom
// normalise — fiable pour les grandes capitalisations, absente sinon), puis
// on recupere le secteur (sicDescription) du dossier SEC de l'emetteur.
// Les resultats sont mis en cache dans la table issuer_map.

let nameIndex: Map<string, { ticker: string; cik: string }> | null = null;

async function loadNameIndex(): Promise<Map<string, { ticker: string; cik: string }>> {
  if (nameIndex) return nameIndex;
  const res = await secFetch("https://www.sec.gov/files/company_tickers.json");
  const data = (await res.json()) as Record<
    string,
    { cik_str: number; ticker: string; title: string }
  >;
  const idx = new Map<string, { ticker: string; cik: string }>();
  for (const v of Object.values(data)) {
    const key = normalizeIssuerName(v.title);
    // En cas d'homonymie (classes d'actions multiples), on garde la premiere
    // entree, qui correspond a la classe principale dans ce referentiel.
    if (key && !idx.has(key)) {
      idx.set(key, { ticker: v.ticker.toUpperCase(), cik: String(v.cik_str) });
    }
  }
  nameIndex = idx;
  return idx;
}

interface IssuerInfo {
  ticker: string | null;
  sector: string | null;
}

async function resolveIssuers(
  items: { cusip: string; name: string }[],
): Promise<Map<string, IssuerInfo>> {
  const out = new Map<string, IssuerInfo>();
  if (items.length === 0) return out;
  const cusips = items.map((i) => i.cusip);
  const { data: cached } = await supabase
    .from("issuer_map")
    .select("cusip, ticker, sector")
    .in("cusip", cusips);
  for (const row of cached ?? []) {
    out.set(row.cusip, { ticker: row.ticker, sector: row.sector });
  }
  const missing = items.filter((i) => !out.has(i.cusip));
  if (missing.length === 0) return out;

  const idx = await loadNameIndex();
  const rows: {
    cusip: string;
    ticker: string | null;
    cik: string | null;
    sector: string | null;
    issuer_name: string;
  }[] = [];
  for (const item of missing) {
    const match = idx.get(normalizeIssuerName(item.name));
    let sector: string | null = null;
    if (match) {
      try {
        sector = (await getSubmissions(match.cik)).sicDescription ?? null;
      } catch (e) {
        console.error(`Secteur introuvable pour CIK ${match.cik}:`, e);
      }
    }
    const info: IssuerInfo = { ticker: match?.ticker ?? null, sector };
    out.set(item.cusip, info);
    rows.push({
      cusip: item.cusip,
      ticker: info.ticker,
      cik: match?.cik ?? null,
      sector,
      issuer_name: item.name,
    });
  }
  if (rows.length) {
    await supabase.from("issuer_map").upsert(rows, { onConflict: "cusip" });
  }
  return out;
}

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

// ---------------------------------------------------------------------------
// 13F

interface Holding {
  cusip: string;
  name: string;
  shares: number;
  value_usd: number;
}

async function fetch13FHoldings(cik: string, acc: string): Promise<Holding[]> {
  const base = filingIndexUrl(cik, acc);
  const idx = (await (await secFetch(`${base}/index.json`)).json()) as {
    directory: { item: { name: string }[] };
  };
  const xmlFiles = idx.directory.item
    .map((i) => i.name)
    .filter((n) => n.toLowerCase().endsWith(".xml") && !n.toLowerCase().includes("primary_doc"));
  // L'info table est generalement nommee "...infotable.xml" ; sinon on teste
  // chaque XML jusqu'a trouver un informationTable.
  xmlFiles.sort((a, b) => {
    const ai = a.toLowerCase().includes("infotable") ? 0 : 1;
    const bi = b.toLowerCase().includes("infotable") ? 0 : 1;
    return ai - bi;
  });
  for (const f of xmlFiles) {
    const raw = await (await secFetch(`${base}/${f}`)).text();
    const doc = xml.parse(raw);
    const table = doc.informationTable ?? doc["ns1:informationTable"];
    if (!table) continue;
    let rows = table.infoTable ?? table["ns1:infoTable"];
    if (!rows) continue;
    if (!Array.isArray(rows)) rows = [rows];
    const byCusip = new Map<string, Holding>();
    for (const r of rows) {
      const get = (k: string) => r[k] ?? r[`ns1:${k}`];
      const shrs = get("shrsOrPrnAmt");
      const cusip = String(get("cusip") ?? "");
      if (!cusip) continue;
      const shares = Number(shrs?.sshPrnamt ?? shrs?.["ns1:sshPrnamt"] ?? 0);
      const value = Number(get("value") ?? 0);
      const name = String(get("nameOfIssuer") ?? "");
      const prev = byCusip.get(cusip);
      if (prev) {
        prev.shares += shares;
        prev.value_usd += value;
      } else {
        byCusip.set(cusip, { cusip, name, shares, value_usd: value });
      }
    }
    return [...byCusip.values()];
  }
  throw new Error(`Info table introuvable pour ${acc}`);
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

async function process13F(manager: {
  id: string;
  user_id: string;
  cik: string;
  name: string;
}): Promise<PisteInsert[]> {
  const subs = await getSubmissions(manager.cik);
  const r = subs.filings.recent;
  // Dernier 13F-HR (holdings report)
  const idx13f = r.form.findIndex((f) => f === "13F-HR" || f === "13F-HR/A");
  if (idx13f === -1) return [];
  const acc = r.accessionNumber[idx13f];
  const filedAt = r.filingDate[idx13f];
  const period = r.reportDate[idx13f];

  const { data: already } = await supabase
    .from("processed_filings")
    .select("id")
    .eq("user_id", manager.user_id)
    .eq("accession_no", acc)
    .maybeSingle();
  if (already) return [];

  const holdings = await fetch13FHoldings(manager.cik, acc);

  // Snapshot precedent (trimestre anterieur le plus recent)
  const { data: prevSnap } = await supabase
    .from("holdings_snapshots")
    .select("*")
    .eq("manager_id", manager.id)
    .lt("period_of_report", period)
    .order("period_of_report", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sourceUrl = filingHumanUrl(manager.cik, acc);
  const pistes: PisteInsert[] = [];

  if (prevSnap) {
    const prev = new Map(
      (prevSnap.holdings as Holding[]).map((h) => [h.cusip, h]),
    );
    const curr = new Map(holdings.map((h) => [h.cusip, h]));

    const changes: {
      signal: string;
      h: Holding;
      prevShares: number;
      deltaPct: number | null;
    }[] = [];

    for (const [cusip, h] of curr) {
      const p = prev.get(cusip);
      const mouvement = classifierMouvement13F(p?.shares ?? null, h.shares);
      if (mouvement) {
        changes.push({ ...mouvement, h, prevShares: p?.shares ?? 0 });
      }
    }
    for (const [cusip, p] of prev) {
      if (!curr.has(cusip)) {
        changes.push({ signal: "13f_exit", h: p, prevShares: p.shares, deltaPct: -100 });
      }
    }

    // Mouvements significatifs d'abord (par valeur de position), plafonnes
    // pour rester lisible et limiter les appels API.
    changes.sort((a, b) => b.h.value_usd - a.h.value_usd);
    const top = changes.slice(0, 15);
    const issuers = await resolveIssuers(
      top.map((c) => ({ cusip: c.h.cusip, name: c.h.name })),
    );
    for (const c of top) {
      const deltaTxt =
        c.deltaPct === null
          ? "nouvelle position"
          : `${c.deltaPct > 0 ? "+" : ""}${c.deltaPct.toFixed(1)} % de titres`;
      const fallback =
        `${manager.name} a déclaré dans son 13F du ${filedAt} (période ${period}) ` +
        `un mouvement sur ${c.h.name} : ${deltaTxt} ` +
        `(${c.prevShares.toLocaleString("fr-FR")} → ${c.h.shares.toLocaleString("fr-FR")} titres, ` +
        `~${formatUsd(c.h.value_usd)}). ` +
        `Donnée trimestrielle publiée avec jusqu'à 45 jours de retard.`;
      const contexte = await generateContexte(
        fallback,
        `Filing 13F-HR de ${manager.name}, déposé le ${filedAt}, période ${period}. ` +
          `Société : ${c.h.name} (CUSIP ${c.h.cusip}). Type de mouvement : ${c.signal}. ` +
          `Titres : ${c.prevShares} → ${c.h.shares}. Valeur déclarée : ${c.h.value_usd} dollars.`,
      );
      const issuer = issuers.get(c.h.cusip);
      pistes.push({
        user_id: manager.user_id,
        signal: c.signal,
        ticker: issuer?.ticker ?? null,
        sector: issuer?.sector ?? null,
        company_name: c.h.name,
        source_name: manager.name,
        source_url: sourceUrl,
        contexte,
        details: {
          cusip: c.h.cusip,
          prev_shares: c.prevShares,
          shares: c.h.shares,
          value_usd: c.h.value_usd,
          delta_pct: c.deltaPct,
          period_of_report: period,
        },
        filed_at: filedAt,
      });
    }
  }
  // Premier depot vu : pas de comparaison possible, on stocke la reference
  // sans generer de pistes (elles arriveront au trimestre suivant).

  await supabase.from("holdings_snapshots").upsert(
    {
      manager_id: manager.id,
      period_of_report: period,
      accession_no: acc,
      filed_at: filedAt,
      holdings,
    },
    { onConflict: "manager_id,period_of_report" },
  );
  await supabase.from("processed_filings").insert({
    user_id: manager.user_id,
    accession_no: acc,
    form_type: "13F-HR",
  });

  return pistes;
}

// ---------------------------------------------------------------------------
// Form 4

async function processForm4(issuer: {
  id: string;
  user_id: string;
  cik: string;
  ticker: string;
  name: string;
}): Promise<PisteInsert[]> {
  const subs = await getSubmissions(issuer.cik);
  const r = subs.filings.recent;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const pistes: PisteInsert[] = [];
  let handled = 0;

  for (let i = 0; i < r.form.length && handled < 10; i++) {
    if (r.form[i] !== "4") continue;
    if (new Date(r.filingDate[i]) < cutoff) break;
    const acc = r.accessionNumber[i];

    const { data: already } = await supabase
      .from("processed_filings")
      .select("id")
      .eq("user_id", issuer.user_id)
      .eq("accession_no", acc)
      .maybeSingle();
    if (already) continue;
    handled++;

    // Le primaryDocument peut etre prefixe d'un dossier xsl : on garde le nom brut.
    const doc = r.primaryDocument[i].split("/").pop()!;
    const url = `${filingIndexUrl(issuer.cik, acc)}/${doc}`;
    let parsed: Record<string, unknown>;
    try {
      parsed = xml.parse(await (await secFetch(url)).text());
    } catch (e) {
      console.error(`Form 4 illisible ${acc}:`, e);
      continue;
    }
    const od = parsed.ownershipDocument as Record<string, unknown> | undefined;
    if (!od) continue;

    // Le flux d'une societe contient AUSSI les Form 4 ou elle n'est que le
    // declarant, pour des titres d'autres emetteurs (une banque declarant sa
    // participation dans un fonds, par exemple). Ces depots ne sont pas de
    // l'activite d'initie sur la societe suivie : on les ignore, en se fiant
    // a l'emetteur declare dans le document lui-meme.
    const issuerBlock = od.issuer as Record<string, unknown> | undefined;
    const docIssuerCik = String(issuerBlock?.issuerCik ?? "");
    if (estAutreEmetteur(docIssuerCik, issuer.cik)) {
      await supabase
        .from("processed_filings")
        .insert({ user_id: issuer.user_id, accession_no: acc, form_type: "4" });
      continue;
    }
    // L'emetteur du document fait foi pour le nom et le ticker affiches.
    const companyName = String(issuerBlock?.issuerName ?? issuer.name);
    const ticker = String(
      issuerBlock?.issuerTradingSymbol ?? issuer.ticker,
    ).toUpperCase();

    const owner = (Array.isArray(od.reportingOwner) ? od.reportingOwner[0] : od.reportingOwner) as
      | Record<string, unknown>
      | undefined;
    const ownerId = owner?.reportingOwnerId as Record<string, string> | undefined;
    const ownerName = ownerId?.rptOwnerName ?? "Initié";
    const rel = owner?.reportingOwnerRelationship as Record<string, unknown> | undefined;
    const roles: string[] = [];
    if (rel) {
      if (String(rel.isDirector) === "1" || rel.isDirector === true) roles.push("administrateur");
      if (String(rel.isOfficer) === "1" || rel.isOfficer === true) {
        roles.push(String(rel.officerTitle ?? "dirigeant"));
      }
      if (String(rel.isTenPercentOwner) === "1") roles.push("actionnaire >10 %");
    }

    const table = od.nonDerivativeTable as Record<string, unknown> | undefined;
    let txs = table?.nonDerivativeTransaction as unknown;
    if (!txs) continue;
    if (!Array.isArray(txs)) txs = [txs];

    let boughtShares = 0;
    let soldShares = 0;
    let totalUsd = 0;
    for (const t of txs as Record<string, unknown>[]) {
      const coding = t.transactionCoding as Record<string, string> | undefined;
      const code = coding?.transactionCode;
      if (code !== "P" && code !== "S") continue;
      const amounts = t.transactionAmounts as Record<string, unknown> | undefined;
      const num = (v: unknown): number => {
        const o = v as Record<string, unknown> | undefined;
        return Number(o?.value ?? o ?? 0);
      };
      const shares = num(amounts?.transactionShares);
      const price = num(amounts?.transactionPricePerShare);
      if (code === "P") boughtShares += shares;
      else soldShares += shares;
      totalUsd += shares * price;
    }
    if (boughtShares === 0 && soldShares === 0) continue;

    const isBuy = boughtShares >= soldShares;
    const signal = isBuy ? "form4_buy" : "form4_sell";
    const shares = isBuy ? boughtShares : soldShares;
    const filedAt = r.filingDate[i];
    const roleTxt = roles.length ? ` (${roles.join(", ")})` : "";
    const fallback =
      `${ownerName}${roleTxt} a déclaré ${isBuy ? "l'achat" : "la vente"} de ` +
      `${shares.toLocaleString("fr-FR")} titres ${companyName} (${ticker}) ` +
      `dans un Form 4 déposé le ${filedAt} (~${Math.round(totalUsd).toLocaleString("fr-FR")} $). ` +
      `Les motifs des transactions d'initiés ne sont pas déclarés et une vente ` +
      `peut refléter une simple diversification.`;
    const contexte = await generateContexte(
      fallback,
      `Form 4 déposé le ${filedAt} pour ${companyName} (${ticker}). ` +
        `Initié : ${ownerName}${roleTxt}. Opération : ${isBuy ? "achat" : "vente"} de ` +
        `${shares} titres, montant approximatif ${Math.round(totalUsd)} $.`,
    );

    pistes.push({
      user_id: issuer.user_id,
      signal,
      ticker,
      sector: subs.sicDescription ?? null,
      company_name: companyName,
      source_name: String(ownerName),
      source_url: filingHumanUrl(issuer.cik, acc),
      contexte,
      details: {
        insider: ownerName,
        roles,
        shares,
        approx_usd: Math.round(totalUsd),
      },
      filed_at: filedAt,
    });
    await supabase.from("processed_filings").insert({
      user_id: issuer.user_id,
      accession_no: acc,
      form_type: "4",
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
  const debut = new Date().toISOString();
  const errors: string[] = [];
  let created = 0;
  // Compte par utilisateur, pour une notification qui dit exactement combien
  // de nouvelles pistes LUI concernent — pas un total global qui melangerait
  // plusieurs comptes si l'outil etait partage.
  const parUtilisateur = new Map<string, number>();

  const { data: managers } = await supabase.from("managers").select("*");
  for (const m of managers ?? []) {
    try {
      const pistes = await process13F(m);
      if (pistes.length) {
        const { error } = await supabase.from("pistes").insert(pistes);
        if (error) throw error;
        created += pistes.length;
        parUtilisateur.set(m.user_id, (parUtilisateur.get(m.user_id) ?? 0) + pistes.length);
      }
    } catch (e) {
      const msg = `13F ${m.name}: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  const { data: issuers } = await supabase.from("watched_issuers").select("*");
  const usIssuers = (issuers ?? []).filter((i) => (i.market ?? "US") === "US");

  for (const iss of usIssuers) {
    try {
      const pistes = await processForm4(iss);
      if (pistes.length) {
        const { error } = await supabase.from("pistes").insert(pistes);
        if (error) throw error;
        created += pistes.length;
        parUtilisateur.set(iss.user_id, (parUtilisateur.get(iss.user_id) ?? 0) + pistes.length);
      }
    } catch (e) {
      const msg = `Form4 ${iss.name}: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  for (const [userId, n] of parUtilisateur) {
    programmerNotification(supabase, userId, {
      titre: "Veille investissement",
      corps: `${n} nouvelle${n > 1 ? "s" : ""} piste${n > 1 ? "s" : ""} détectée${n > 1 ? "s" : ""} (SEC).`,
      url: "./",
    });
  }

  // Journal d'exécution : seule façon de detecter un cron hebdomadaire qui
  // echoue silencieusement, personne d'autre que l'utilisateur ne surveille
  // cet outil.
  await supabase.from("sync_runs").insert({
    source: "sync-edgar",
    started_at: debut,
    created_count: created,
    errors,
    ok: errors.length === 0,
  });

  return new Response(JSON.stringify({ created, errors }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
