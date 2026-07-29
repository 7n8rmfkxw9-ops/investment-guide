export type SignalType =
  | "13f_new"
  | "13f_increase"
  | "13f_decrease"
  | "13f_exit"
  | "form4_buy"
  | "form4_sell"
  | "mar_buy"
  | "mar_sell";

export interface Manager {
  id: string;
  user_id: string;
  cik: string;
  name: string;
  created_at: string;
}

export type Market = "US" | "BE" | "SE";

/** Libelle du regulateur qui publie les declarations, par marche. */
export const MARKET_LABELS: Record<Market, string> = {
  US: "États-Unis · SEC",
  BE: "Belgique · FSMA",
  SE: "Suède · Finansinspektionen",
};

export interface WatchedIssuer {
  id: string;
  user_id: string;
  /**
   * Marche de rattachement : SEC pour les US, FSMA pour la Belgique,
   * Finansinspektionen pour la Suede.
   */
  market: Market;
  /** Present uniquement pour les societes americaines. */
  cik: string | null;
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

/**
 * Un achat fictif, enregistre pour etre confronte ensuite aux cours reels.
 * Aucun ordre n'est passe et aucun courtier n'est connecte : c'est un
 * exercice, pas un portefeuille.
 */
export interface Simulation {
  id: string;
  user_id: string;
  piste_id: string | null;
  symbole: string;
  company_name: string;
  devise: string;
  montant_eur: number;
  frais_entree_eur: number;
  prix_entree: number;
  /** 1 EUR = taux_entree unites de la devise du titre, au jour de l'achat. */
  taux_entree: number;
  quantite: number;
  date_entree: string;
  note: string | null;
  prix_actuel: number | null;
  taux_actuel: number | null;
  prix_maj_at: string | null;
  /** Placement de reference : meme somme, meme jour, sur un ETF mondial. */
  ref_symbole: string | null;
  ref_prix_entree: number | null;
  ref_prix_actuel: number | null;
  closed_at: string | null;
  prix_sortie: number | null;
  taux_sortie: number | null;
  frais_sortie_eur: number | null;
  note_sortie: string | null;
  created_at: string;
}

export interface Settings {
  user_id: string;
  broker_fixed_fee_eur: number;
  position_size_eur: number;
  /** Taxe proportionnelle par transaction (TOB en Belgique), en %. */
  tob_pct: number;
  updated_at: string;
}

export const SIGNAL_LABELS: Record<SignalType, string> = {
  "13f_new": "13F — nouvelle position",
  "13f_increase": "13F — renforcement",
  "13f_decrease": "13F — allègement",
  "13f_exit": "13F — sortie de position",
  form4_buy: "Form 4 — achat d'initié (US)",
  form4_sell: "Form 4 — vente d'initié (US)",
  mar_buy: "MAR — achat d'initié (Europe)",
  mar_sell: "MAR — vente d'initié (Europe)",
};

/** Version courte, pour les étiquettes sur mobile (la couleur distingue 13F et Form 4). */
export const SIGNAL_LABELS_COURTS: Record<SignalType, string> = {
  "13f_new": "Nouvelle position",
  "13f_increase": "Renforcement",
  "13f_decrease": "Allègement",
  "13f_exit": "Sortie",
  form4_buy: "Achat d'initié",
  form4_sell: "Vente d'initié",
  mar_buy: "Achat d'initié",
  mar_sell: "Vente d'initié",
};

const LIMITE_13F =
  "Les données 13F ont jusqu'à 45 jours de retard et ne montrent que les " +
  "positions longues sur des actions américaines.";

const LIMITE_INITIE =
  "Cette déclaration est publiée sous 2 jours ouvrés, mais les motifs d'une " +
  "opération ne sont jamais déclarés.";

const LIMITE_MAR =
  "Déclaration publiée par le régulateur au titre du règlement européen sur " +
  "les abus de marché. L'obligation ne s'applique qu'au-delà de 20 000 € " +
  "cumulés sur l'année, et les motifs d'une opération ne sont jamais déclarés.";

/**
 * Note obligatoire, affichée sur chaque fiche, non masquable.
 * Le premier volet est invariable ; le second precise la limite propre a la
 * source, car un depot 13F et une declaration MAR n'ont pas les memes.
 */
export const DISCLAIMER =
  "Ceci n'est pas un conseil d'investissement. Aucune étude ne démontre de " +
  "façon consensuelle qu'imiter les grands fonds ou les dirigeants génère un " +
  "avantage après frais.";

export const LIMITES_DONNEE: Record<SignalType, string> = {
  "13f_new": LIMITE_13F,
  "13f_increase": LIMITE_13F,
  "13f_decrease": LIMITE_13F,
  "13f_exit": LIMITE_13F,
  form4_buy: LIMITE_INITIE,
  form4_sell: LIMITE_INITIE,
  mar_buy: LIMITE_MAR,
  mar_sell: LIMITE_MAR,
};
