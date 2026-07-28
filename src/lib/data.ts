import { supabase } from "./supabase";
import type { Lead, Manager, WatchedIssuer } from "./types";

/**
 * Données d'exemple affichées quand Supabase n'est pas configuré, pour
 * visualiser le dashboard. Les liens pointent vers de vrais filings EDGAR.
 */
const DEMO_LEADS: Lead[] = [
  {
    id: "demo-1",
    ticker: "OXY",
    company: "Occidental Petroleum",
    signal_type: "FORM4_BUY",
    source_url:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0000797468&type=4&dateb=&owner=include&count=40",
    context:
      "Achat d'actions déclaré via un Form 4 par un dirigeant. Les achats d'initiés sont publiés sous 2 jours ouvrables, mais un achat isolé peut avoir de nombreuses raisons (rééquilibrage personnel, programme planifié) sans lien avec une conviction sur le titre.",
    sector: "Énergie",
    manager_name: null,
    filed_at: "2026-07-22",
    outcome_note: null,
  },
  {
    id: "demo-2",
    ticker: "CB",
    company: "Chubb Limited",
    signal_type: "13F_NEW",
    source_url:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001067983&type=13F-HR&dateb=&owner=include&count=40",
    context:
      "Nouvelle position apparue dans le dernier dépôt 13F trimestriel de Berkshire Hathaway. Le dépôt reflète des positions datant d'au moins 45 jours ; la position a pu être constituée à un prix très différent du cours actuel, voire déjà modifiée depuis.",
    sector: "Assurance",
    manager_name: "Berkshire Hathaway",
    filed_at: "2026-05-15",
    outcome_note: null,
  },
  {
    id: "demo-3",
    ticker: "AAPL",
    company: "Apple Inc.",
    signal_type: "13F_DECREASE",
    source_url:
      "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001067983&type=13F-HR&dateb=&owner=include&count=40",
    context:
      "Réduction d'une position existante dans le dernier 13F. Une réduction peut relever de la gestion de concentration du portefeuille ou de raisons fiscales, pas nécessairement d'un jugement négatif sur l'entreprise.",
    sector: "Technologie",
    manager_name: "Berkshire Hathaway",
    filed_at: "2026-05-15",
    outcome_note:
      "Piste archivée : le titre a peu bougé dans les semaines suivantes. Exemple de signal qui n'a rien donné — conservé pour garder une vue honnête de la fiabilité de l'outil.",
  },
];

const DEMO_MANAGERS: Manager[] = [
  { id: "demo-m1", cik: "0001067983", name: "Berkshire Hathaway" },
  { id: "demo-m2", cik: "0001350694", name: "Bridgewater Associates" },
];

const DEMO_ISSUERS: WatchedIssuer[] = [
  { id: "demo-i1", cik: "0000797468", ticker: "OXY", name: "Occidental Petroleum" },
];

export const isDemoMode = supabase === null;

export async function fetchLeads(): Promise<Lead[]> {
  if (!supabase) return DEMO_LEADS;
  const { data, error } = await supabase
    .from("leads_view")
    .select("*")
    .order("filed_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function fetchManagers(): Promise<Manager[]> {
  if (!supabase) return DEMO_MANAGERS;
  const { data, error } = await supabase.from("managers").select("id, cik, name").order("name");
  if (error) throw error;
  return (data ?? []) as Manager[];
}

export async function addManager(cik: string, name: string): Promise<Manager> {
  if (!supabase) {
    const m = { id: `demo-${Date.now()}`, cik, name };
    DEMO_MANAGERS.push(m);
    return m;
  }
  const { data, error } = await supabase
    .from("managers")
    .insert({ cik, name })
    .select("id, cik, name")
    .single();
  if (error) throw error;
  return data as Manager;
}

export async function removeManager(id: string): Promise<void> {
  if (!supabase) {
    const i = DEMO_MANAGERS.findIndex((m) => m.id === id);
    if (i >= 0) DEMO_MANAGERS.splice(i, 1);
    return;
  }
  const { error } = await supabase.from("managers").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchIssuers(): Promise<WatchedIssuer[]> {
  if (!supabase) return DEMO_ISSUERS;
  const { data, error } = await supabase
    .from("watched_issuers")
    .select("id, cik, ticker, name")
    .order("ticker");
  if (error) throw error;
  return (data ?? []) as WatchedIssuer[];
}

export async function addIssuer(cik: string, ticker: string, name: string): Promise<WatchedIssuer> {
  if (!supabase) {
    const iss = { id: `demo-${Date.now()}`, cik, ticker, name };
    DEMO_ISSUERS.push(iss);
    return iss;
  }
  const { data, error } = await supabase
    .from("watched_issuers")
    .insert({ cik, ticker, name })
    .select("id, cik, ticker, name")
    .single();
  if (error) throw error;
  return data as WatchedIssuer;
}

export async function removeIssuer(id: string): Promise<void> {
  if (!supabase) {
    const i = DEMO_ISSUERS.findIndex((x) => x.id === id);
    if (i >= 0) DEMO_ISSUERS.splice(i, 1);
    return;
  }
  const { error } = await supabase.from("watched_issuers").delete().eq("id", id);
  if (error) throw error;
}
