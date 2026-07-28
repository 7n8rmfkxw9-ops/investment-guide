// Edge Function déclenchée par le cron hebdomadaire (voir migrations/0002_cron.sql).
// Récupère les nouveaux 13F-HR des gestionnaires suivis et les Form 4 des sociétés
// suivies depuis SEC EDGAR (API publique), détecte les mouvements significatifs et
// insère des "pistes" purement informatives. Aucune exécution d'ordre, jamais.

import { createClient } from "npm:@supabase/supabase-js@2";

const SEC_BASE = "https://data.sec.gov";
// La SEC exige un User-Agent déclaratif identifiant l'utilisateur (fair access policy).
const SEC_USER_AGENT =
  Deno.env.get("SEC_USER_AGENT") ?? "Personal research tool (contact: set SEC_USER_AGENT env)";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Throttle simple : la SEC limite à 10 req/s, on reste très en dessous.
let lastFetch = 0;
async function secFetch(url: string): Promise<Response> {
  const wait = 350 - (Date.now() - lastFetch);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastFetch = Date.now();
  const res = await fetch(url, { headers: { "User-Agent": SEC_USER_AGENT } });
  if (!res.ok) throw new Error(`SEC ${res.status} sur ${url}`);
  return res;
}

interface Submission {
  accessionNumber: string[];
  form: string[];
  filingDate: string[];
  reportDate: string[];
  primaryDocument: string[];
}

async function getRecentFilings(cik: string): Promise<Submission> {
  const res = await secFetch(`${SEC_BASE}/submissions/CIK${cik}.json`);
  const json = await res.json();
  return json.filings.recent as Submission;
}

function filingIndexUrl(cik: string, accessionNo: string): string {
  const noDash = accessionNo.replaceAll("-", "");
  return `https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${noDash}`;
}

/** Extrait le texte d'une balise XML simple (parsing volontairement minimal). */
function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}>\\s*(?:<value>)?([^<]*)`, "i"));
  return m ? m[1].trim() : null;
}

// ---------------------------------------------------------------------------
// 13F : diff des positions trimestrielles → pistes
// ---------------------------------------------------------------------------

interface Holding {
  cusip: string;
  issuer: string;
  shares: number;
  valueUsd: number;
}

async function fetch13FHoldings(cik: string, accessionNo: string): Promise<Holding[]> {
  const base = filingIndexUrl(cik, accessionNo);
  const index = await (await secFetch(`${base}/index.json`)).json();
  const items: { name: string }[] = index.directory.item;
  // La table des positions est le document XML autre que le primary_doc.
  const infoTable = items.find(
    (i) => i.name.toLowerCase().endsWith(".xml") && !i.name.toLowerCase().includes("primary_doc"),
  );
  if (!infoTable) return [];
  const xml = await (await secFetch(`${base}/${infoTable.name}`)).text();
  const holdings = new Map<string, Holding>();
  for (const block of xml.match(/<infoTable>[\s\S]*?<\/infoTable>/gi) ?? []) {
    const cusip = tag(block, "cusip");
    if (!cusip) continue;
    const h = holdings.get(cusip) ?? {
      cusip,
      issuer: tag(block, "nameOfIssuer") ?? "?",
      shares: 0,
      valueUsd: 0,
    };
    h.shares += Number(tag(block, "sshPrnamt") ?? 0);
    h.valueUsd += Number(tag(block, "value") ?? 0);
    holdings.set(cusip, h);
  }
  return [...holdings.values()];
}

async function process13F(manager: { id: string; cik: string; name: string }): Promise<number> {
  const recent = await getRecentFilings(manager.cik);
  let created = 0;
  for (let i = 0; i < recent.form.length; i++) {
    if (recent.form[i] !== "13F-HR") continue;
    const accessionNo = recent.accessionNumber[i];
    const { data: existing } = await supabase
      .from("filings")
      .select("id")
      .eq("accession_no", accessionNo)
      .maybeSingle();
    if (existing) break; // déjà traité (et les suivants sont plus anciens)

    const sourceUrl = filingIndexUrl(manager.cik, accessionNo);
    const { data: filing, error: filingError } = await supabase
      .from("filings")
      .insert({
        accession_no: accessionNo,
        form_type: "13F-HR",
        cik: manager.cik,
        filed_at: recent.filingDate[i],
        period_of_report: recent.reportDate[i] || null,
        source_url: sourceUrl,
      })
      .select("id")
      .single();
    if (filingError) throw filingError;

    const holdings = await fetch13FHoldings(manager.cik, accessionNo);
    const period = recent.reportDate[i];
    if (holdings.length > 0) {
      const { error } = await supabase.from("positions").insert(
        holdings.map((h) => ({
          manager_id: manager.id,
          filing_id: filing.id,
          period,
          cusip: h.cusip,
          issuer: h.issuer,
          shares: h.shares,
          value_usd: h.valueUsd,
        })),
      );
      if (error) throw error;
    }

    // Trimestre précédent pour le diff.
    const { data: prevPeriodRow } = await supabase
      .from("positions")
      .select("period")
      .eq("manager_id", manager.id)
      .lt("period", period)
      .order("period", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!prevPeriodRow) break; // premier dépôt connu : pas de diff possible

    const { data: prevRows } = await supabase
      .from("positions")
      .select("cusip, issuer, shares")
      .eq("manager_id", manager.id)
      .eq("period", prevPeriodRow.period);
    const prev = new Map((prevRows ?? []).map((p) => [p.cusip, p]));

    const moves: { signal: string; issuer: string; detail: string }[] = [];
    for (const h of holdings) {
      const p = prev.get(h.cusip);
      if (!p) {
        moves.push({ signal: "13F_NEW", issuer: h.issuer, detail: `nouvelle position (${h.shares} titres déclarés)` });
      } else if (p.shares > 0 && h.shares >= p.shares * 1.25) {
        moves.push({ signal: "13F_INCREASE", issuer: h.issuer, detail: `renforcement de ${p.shares} à ${h.shares} titres` });
      } else if (p.shares > 0 && h.shares <= p.shares * 0.75) {
        moves.push({ signal: "13F_DECREASE", issuer: h.issuer, detail: `allègement de ${p.shares} à ${h.shares} titres` });
      }
      prev.delete(h.cusip);
    }
    for (const p of prev.values()) {
      moves.push({ signal: "13F_EXIT", issuer: p.issuer, detail: `sortie complète (${p.shares} titres au trimestre précédent)` });
    }

    for (const move of moves) {
      const context = await buildContext(
        `Dépôt 13F-HR de ${manager.name} (période ${period}) : ${move.detail} sur ${move.issuer}.`,
      );
      const { error } = await supabase.from("leads").upsert(
        {
          company: move.issuer,
          signal_type: move.signal,
          source_url: sourceUrl,
          context,
          manager_id: manager.id,
          filing_id: filing.id,
          filed_at: recent.filingDate[i],
        },
        { onConflict: "signal_type,filed_at,company", ignoreDuplicates: true },
      );
      if (error) throw error;
      created++;
    }
    break; // on ne traite que le 13F le plus récent par exécution
  }
  return created;
}

// ---------------------------------------------------------------------------
// Form 4 : achats/ventes d'initiés sur les sociétés suivies
// ---------------------------------------------------------------------------

async function processForm4(issuer: { id: string; cik: string; ticker: string; name: string }): Promise<number> {
  const recent = await getRecentFilings(issuer.cik);
  let created = 0;
  for (let i = 0; i < recent.form.length && i < 40; i++) {
    if (recent.form[i] !== "4") continue;
    const accessionNo = recent.accessionNumber[i];
    const { data: existing } = await supabase
      .from("filings")
      .select("id")
      .eq("accession_no", accessionNo)
      .maybeSingle();
    if (existing) continue;

    const base = filingIndexUrl(issuer.cik, accessionNo);
    let xml = "";
    try {
      xml = await (await secFetch(`${base}/${recent.primaryDocument[i].split("/").pop()}`)).text();
    } catch {
      continue; // document illisible : on passe au filing suivant
    }
    // Codes de transaction Form 4 : P = achat sur le marché, S = vente.
    const codes = [...xml.matchAll(/<transactionCode>([A-Z])<\/transactionCode>/g)].map((m) => m[1]);
    const owner = tag(xml, "rptOwnerName") ?? "initié";
    const hasBuy = codes.includes("P");
    const hasSell = codes.includes("S");
    if (!hasBuy && !hasSell) continue;

    const { data: filing, error: filingError } = await supabase
      .from("filings")
      .insert({
        accession_no: accessionNo,
        form_type: "4",
        cik: issuer.cik,
        filed_at: recent.filingDate[i],
        source_url: base,
      })
      .select("id")
      .single();
    if (filingError) throw filingError;

    const signal = hasBuy ? "FORM4_BUY" : "FORM4_SELL";
    const context = await buildContext(
      `Form 4 déposé le ${recent.filingDate[i]} pour ${issuer.name} (${issuer.ticker}) : ${
        hasBuy ? "achat" : "vente"
      } déclaré par ${owner}.`,
    );
    const { error } = await supabase.from("leads").upsert(
      {
        ticker: issuer.ticker,
        company: issuer.name,
        signal_type: signal,
        source_url: base,
        context,
        filing_id: filing.id,
        filed_at: recent.filingDate[i],
      },
      { onConflict: "signal_type,filed_at,company", ignoreDuplicates: true },
    );
    if (error) throw error;
    created++;
  }
  return created;
}

// ---------------------------------------------------------------------------
// Synthèse IA : expliquer la donnée brute, jamais prédire un cours
// ---------------------------------------------------------------------------

async function buildContext(facts: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return facts; // sans clé, on affiche les faits bruts

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5",
      max_tokens: 300,
      system:
        "Tu rédiges des résumés factuels en français pour un outil personnel de veille. " +
        "Résume le mouvement détecté et son contexte en 2-3 phrases neutres. " +
        "Interdictions strictes : aucune prédiction de cours, aucun conseil ou incitation " +
        "à acheter/vendre, aucun score ou probabilité. Rappelle une limite ou une " +
        "explication alternative plausible du mouvement quand c'est pertinent.",
      messages: [{ role: "user", content: facts }],
    }),
  });
  if (!res.ok) return facts; // dégradation douce : les faits bruts restent affichés
  const json = await res.json();
  return json.content?.[0]?.text ?? facts;
}

// ---------------------------------------------------------------------------

Deno.serve(async () => {
  const results: Record<string, number | string> = {};
  const { data: managers, error: mErr } = await supabase.from("managers").select("id, cik, name");
  if (mErr) return Response.json({ error: mErr.message }, { status: 500 });
  for (const m of managers ?? []) {
    try {
      results[`13F ${m.name}`] = await process13F(m);
    } catch (e) {
      results[`13F ${m.name}`] = `erreur : ${(e as Error).message}`;
    }
  }
  const { data: issuers, error: iErr } = await supabase
    .from("watched_issuers")
    .select("id, cik, ticker, name");
  if (iErr) return Response.json({ error: iErr.message }, { status: 500 });
  for (const iss of issuers ?? []) {
    try {
      results[`Form4 ${iss.ticker}`] = await processForm4(iss);
    } catch (e) {
      results[`Form4 ${iss.ticker}`] = `erreur : ${(e as Error).message}`;
    }
  }
  return Response.json({ ok: true, results });
});
