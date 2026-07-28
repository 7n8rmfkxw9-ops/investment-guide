export type SignalType =
  | "13f_new"
  | "13f_increase"
  | "13f_decrease"
  | "13f_exit"
  | "form4_buy"
  | "form4_sell";

export interface Manager {
  id: string;
  user_id: string;
  cik: string;
  name: string;
  created_at: string;
}

export interface WatchedIssuer {
  id: string;
  user_id: string;
  cik: string;
  ticker: string;
  name: string;
  created_at: string;
}

export interface Piste {
  id: string;
  user_id: string;
  signal: SignalType;
  ticker: string | null;
  company_name: string;
  source_name: string;
  source_url: string;
  contexte: string;
  details: Record<string, unknown> | null;
  detected_at: string;
  filed_at: string | null;
  sector: string | null;
  outcome_note: string | null;
  outcome_recorded_at: string | null;
}

export interface Settings {
  user_id: string;
  broker_fixed_fee_eur: number;
  position_size_eur: number;
  updated_at: string;
}

export const SIGNAL_LABELS: Record<SignalType, string> = {
  "13f_new": "13F — nouvelle position",
  "13f_increase": "13F — renforcement",
  "13f_decrease": "13F — allègement",
  "13f_exit": "13F — sortie de position",
  form4_buy: "Form 4 — achat d'initié",
  form4_sell: "Form 4 — vente d'initié",
};

/**
 * Note obligatoire, affichée sur chaque fiche, non masquable.
 */
export const DISCLAIMER =
  "Ceci n'est pas un conseil d'investissement. Les données 13F ont jusqu'à " +
  "45 jours de retard et ne montrent que les positions longues. Aucune étude " +
  "ne démontre de façon consensuelle qu'imiter les grands fonds génère un " +
  "avantage après frais.";
