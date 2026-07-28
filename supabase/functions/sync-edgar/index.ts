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

const SEC_UA = Deno.env.get("SEC_USER_AGENT") ?? "investment-guide contact@example.com";
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;

const xml = new XMLParser({ ignoreAttributes: false, parseTagValue: false });

// ---------------------------------------------------------------------------
// Helpers SEC EDGAR

function padCik(cik: string): string {
  return cik.replace(/\D/g, "").padStart(10, "0");
}

async function secFetch(url: string): Promise<Response> {
  const res = await fetch(url, { headers: { "User-Agent": SEC_UA } });
  if (!res.ok) throw new Error(`SEC ${res.status} sur ${url}`);
  return res;
}

interface Submissions {
  name: string;
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

function accessionNoDash(acc: string): string {
  return acc.replace(/-/g, "");
}

function filingIndexUrl(cik: string, acc: string): string {
  const c = String(Number(cik.replace(/\D/g, "")));
  return `https://www.sec.gov/Archives/edgar/data/${c}/${accessionNoDash(acc)}`;
}

/** URL humaine vers la page d'index du filing (utilisee comme source_url). */
function filingHumanUrl(cik: string, acc: string): string {
  return `${filingIndexUrl(cik, acc)}/${acc}-index.htm`;
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
  value_kusd: number;
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
        prev.value_kusd += value;
      } else {
        byCusip.set(cusip, { cusip, name, shares, value_kusd: value });
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
      if (!p) {
        changes.push({ signal: "13f_new", h, prevShares: 0, deltaPct: null });
      } else if (h.shares > p.shares * 1.1) {
        changes.push({
          signal: "13f_increase",
          h,
          prevShares: p.shares,
          deltaPct: ((h.shares - p.shares) / p.shares) * 100,
        });
      } else if (h.shares < p.shares * 0.9) {
        changes.push({
          signal: "13f_decrease",
          h,
          prevShares: p.shares,
          deltaPct: ((h.shares - p.shares) / p.shares) * 100,
        });
      }
    }
    for (const [cusip, p] of prev) {
      if (!curr.has(cusip)) {
        changes.push({ signal: "13f_exit", h: p, prevShares: p.shares, deltaPct: -100 });
      }
    }

    // Mouvements significatifs d'abord (par valeur de position), plafonnes
    // pour rester lisible et limiter les appels API.
    changes.sort((a, b) => b.h.value_kusd - a.h.value_kusd);
    for (const c of changes.slice(0, 15)) {
      const deltaTxt =
        c.deltaPct === null
          ? "nouvelle position"
          : `${c.deltaPct > 0 ? "+" : ""}${c.deltaPct.toFixed(1)} % de titres`;
      const fallback =
        `${manager.name} a déclaré dans son 13F du ${filedAt} (période ${period}) ` +
        `un mouvement sur ${c.h.name} : ${deltaTxt} ` +
        `(${c.prevShares.toLocaleString("fr-FR")} → ${c.h.shares.toLocaleString("fr-FR")} titres, ` +
        `~${c.h.value_kusd.toLocaleString("fr-FR")} k$). ` +
        `Donnée trimestrielle publiée avec jusqu'à 45 jours de retard.`;
      const contexte = await generateContexte(
        fallback,
        `Filing 13F-HR de ${manager.name}, déposé le ${filedAt}, période ${period}. ` +
          `Société : ${c.h.name} (CUSIP ${c.h.cusip}). Type de mouvement : ${c.signal}. ` +
          `Titres : ${c.prevShares} → ${c.h.shares}. Valeur déclarée : ${c.h.value_kusd} milliers de dollars.`,
      );
      pistes.push({
        user_id: manager.user_id,
        signal: c.signal,
        ticker: null,
        company_name: c.h.name,
        source_name: manager.name,
        source_url: sourceUrl,
        contexte,
        details: {
          cusip: c.h.cusip,
          prev_shares: c.prevShares,
          shares: c.h.shares,
          value_kusd: c.h.value_kusd,
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
      `${shares.toLocaleString("fr-FR")} titres ${issuer.name} (${issuer.ticker}) ` +
      `dans un Form 4 déposé le ${filedAt} (~${Math.round(totalUsd).toLocaleString("fr-FR")} $). ` +
      `Les motifs des transactions d'initiés ne sont pas déclarés et une vente ` +
      `peut refléter une simple diversification.`;
    const contexte = await generateContexte(
      fallback,
      `Form 4 déposé le ${filedAt} pour ${issuer.name} (${issuer.ticker}). ` +
        `Initié : ${ownerName}${roleTxt}. Opération : ${isBuy ? "achat" : "vente"} de ` +
        `${shares} titres, montant approximatif ${Math.round(totalUsd)} $.`,
    );

    pistes.push({
      user_id: issuer.user_id,
      signal,
      ticker: issuer.ticker,
      company_name: issuer.name,
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
  const errors: string[] = [];
  let created = 0;

  const { data: managers } = await supabase.from("managers").select("*");
  for (const m of managers ?? []) {
    try {
      const pistes = await process13F(m);
      if (pistes.length) {
        const { error } = await supabase.from("pistes").insert(pistes);
        if (error) throw error;
        created += pistes.length;
      }
    } catch (e) {
      const msg = `13F ${m.name}: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  const { data: issuers } = await supabase.from("watched_issuers").select("*");
  for (const iss of issuers ?? []) {
    try {
      const pistes = await processForm4(iss);
      if (pistes.length) {
        const { error } = await supabase.from("pistes").insert(pistes);
        if (error) throw error;
        created += pistes.length;
      }
    } catch (e) {
      const msg = `Form4 ${iss.name}: ${e instanceof Error ? e.message : String(e)}`;
      console.error(msg);
      errors.push(msg);
    }
  }

  return new Response(JSON.stringify({ created, errors }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
