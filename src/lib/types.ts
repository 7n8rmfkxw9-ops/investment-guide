export type SignalType =
  | "13F_NEW"
  | "13F_INCREASE"
  | "13F_DECREASE"
  | "13F_EXIT"
  | "FORM4_BUY"
  | "FORM4_SELL";

export const SIGNAL_LABELS: Record<SignalType, string> = {
  "13F_NEW": "13F — nouvelle position",
  "13F_INCREASE": "13F — renforcement",
  "13F_DECREASE": "13F — allègement",
  "13F_EXIT": "13F — sortie",
  FORM4_BUY: "Form 4 — achat initié",
  FORM4_SELL: "Form 4 — vente initié",
};

/** Les Form 4 sont publiés sous 2 jours ouvrables : donnée plus fraîche, affichée en priorité. */
export function isForm4(signal: SignalType): boolean {
  return signal.startsWith("FORM4");
}

export interface Manager {
  id: string;
  cik: string;
  name: string;
}

/** Société dont les Form 4 (achats/ventes d'initiés) sont surveillés. */
export interface WatchedIssuer {
  id: string;
  cik: string;
  ticker: string;
  name: string;
}

export interface Lead {
  id: string;
  ticker: string | null;
  company: string;
  signal_type: SignalType;
  /** Lien direct vers le filing SEC EDGAR. */
  source_url: string;
  /** Résumé factuel de ce qui a été détecté (2-3 phrases). Jamais une prédiction. */
  context: string;
  sector: string | null;
  manager_name: string | null;
  filed_at: string; // ISO date
  /** Suivi honnête a posteriori : ce qui s'est réellement passé, succès comme échecs. */
  outcome_note: string | null;
}
