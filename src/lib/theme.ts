/**
 * Couleurs de l'interface.
 *
 * La couleur porte une information, elle ne decore pas : un achat est vert, une
 * vente rouge, un mouvement de fonds bleu, un allegement orange. Une fois la
 * correspondance apprise, la nature d'une piste se lit sans la lire.
 *
 * Les classes sont ecrites en entier et jamais assemblees a la volee : Tailwind
 * analyse le code source de facon statique et ne generait pas les classes
 * construites par concatenation.
 */

import type { Market, SignalType } from "./types";

export interface AccentSignal {
  /** Pastille du signal. */
  pastille: string;
  /** Filet colore en haut de fiche. */
  barre: string;
  /** Points d'accroche textuels (liens, titres de section). */
  texte: string;
  /** Fond doux, pour les encarts lies au signal. */
  fond: string;
  /** Pictogramme : lisible d'un coup d'oeil, y compris en niveaux de gris. */
  icone: string;
}

const ACHAT: AccentSignal = {
  pastille: "bg-emerald-100 text-emerald-800",
  barre: "bg-emerald-500",
  texte: "text-emerald-700",
  fond: "bg-emerald-50/70 border-emerald-200/70",
  icone: "▲",
};

const VENTE: AccentSignal = {
  pastille: "bg-rose-100 text-rose-800",
  barre: "bg-rose-500",
  texte: "text-rose-700",
  fond: "bg-rose-50/70 border-rose-200/70",
  icone: "▼",
};

export const ACCENTS: Record<SignalType, AccentSignal> = {
  "13f_new": {
    pastille: "bg-indigo-100 text-indigo-800",
    barre: "bg-indigo-500",
    texte: "text-indigo-700",
    fond: "bg-indigo-50/70 border-indigo-200/70",
    icone: "✦",
  },
  "13f_increase": {
    pastille: "bg-sky-100 text-sky-800",
    barre: "bg-sky-500",
    texte: "text-sky-700",
    fond: "bg-sky-50/70 border-sky-200/70",
    icone: "▲",
  },
  "13f_decrease": {
    pastille: "bg-amber-100 text-amber-800",
    barre: "bg-amber-500",
    texte: "text-amber-700",
    fond: "bg-amber-50/70 border-amber-200/70",
    icone: "▼",
  },
  "13f_exit": {
    pastille: "bg-slate-200 text-slate-700",
    barre: "bg-slate-400",
    texte: "text-slate-600",
    fond: "bg-slate-50 border-slate-200",
    icone: "✕",
  },
  form4_buy: ACHAT,
  form4_sell: VENTE,
  mar_buy: ACHAT,
  mar_sell: VENTE,
  // Les prises de participation ne sont ni des achats ni des ventes au sens
  // des autres signaux : un violet distinct evite de les confondre avec une
  // operation d'initie, et separe l'actif (13D) du passif (13G).
  sc13d_new: {
    pastille: "bg-violet-100 text-violet-800",
    barre: "bg-violet-500",
    texte: "text-violet-700",
    fond: "bg-violet-50/70 border-violet-200/70",
    icone: "◆",
  },
  sc13g_new: {
    pastille: "bg-slate-200 text-slate-700",
    barre: "bg-slate-400",
    texte: "text-slate-600",
    fond: "bg-slate-50 border-slate-200",
    icone: "◇",
  },
};

/** Drapeau et libelle du marche, pour situer une societe d'un coup d'oeil. */
export const MARCHES: Record<Market, { drapeau: string; nom: string; regulateur: string }> = {
  US: { drapeau: "🇺🇸", nom: "États-Unis", regulateur: "SEC" },
  BE: { drapeau: "🇧🇪", nom: "Belgique", regulateur: "FSMA" },
  SE: { drapeau: "🇸🇪", nom: "Suède", regulateur: "Finansinspektionen" },
};

/**
 * Couleur d'un resultat chiffre. Le zero reste neutre : afficher en vert un
 * gain de 0,00 € donnerait une impression de reussite sans fondement.
 */
/*
 * Nuances 700 et non 600 : mesure faite avec axe-core, emerald-600 sur le
 * gris clair des encarts de resultat ne donne que 3,5:1 et rose-600 4,3:1,
 * sous le seuil de 4,5:1 exige pour du texte normal. Ce sont precisement les
 * chiffres que l'utilisateur vient lire — les rendre limites en contraste
 * serait la pire ligne ou economiser.
 */
export function couleurResultat(v: number): string {
  if (v > 0.005) return "text-emerald-700";
  if (v < -0.005) return "text-rose-700";
  return "text-slate-600";
}

/** Fond assorti, pour les encarts de resultat. */
export function fondResultat(v: number): string {
  if (v > 0.005) return "bg-emerald-50 border-emerald-200/70";
  if (v < -0.005) return "bg-rose-50 border-rose-200/70";
  return "bg-slate-50 border-slate-200/70";
}

/**
 * Pictogramme d'un resultat chiffre, a afficher a cote de la couleur.
 *
 * Le vert et le rouge sont precisement la paire que la forme la plus courante
 * de daltonisme ne distingue pas : environ un homme sur douze. Partout ou la
 * couleur porte seule l'information — filet colore en haut d'une carte, fond
 * teinte, courbe — ce pictogramme doit l'accompagner. Les montants eux-memes
 * portent deja leur signe (+/-), ce qui suffit pour du texte chiffre.
 */
export function iconeResultat(v: number): string {
  if (v > 0.005) return "▲";
  if (v < -0.005) return "▼";
  return "—";
}

/** Couleur de trace pour une courbe, avec son equivalent en pointilles. */
export function traceResultat(v: number): { couleur: string; tirets?: string } {
  if (v > 0.005) return { couleur: "#10b981" };
  if (v < -0.005) return { couleur: "#f43f5e", tirets: "5 3" };
  return { couleur: "#94a3b8", tirets: "2 3" };
}

/** Classes communes, pour que toutes les pages se ressemblent. */
export const CARTE =
  "bg-white rounded-2xl border border-slate-200/70 shadow-sm shadow-slate-200/40";
// `min-h-[44px]` sur les deux boutons : c'est la plus petite cible qu'un
// pouce atteint de facon fiable. En dessous, on rate le bouton une fois sur
// trois sans savoir pourquoi.
export const BOUTON_PRINCIPAL =
  "rounded-xl px-4 py-2.5 min-h-[44px] text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 " +
  "active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";
export const BOUTON_DOUX =
  "rounded-xl px-3.5 py-2 min-h-[44px] text-sm font-medium text-indigo-700 bg-indigo-50 " +
  "hover:bg-indigo-100 disabled:opacity-40 transition-colors " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2";
// L'anneau de focus des champs passe en indigo-500 : indigo-200 sur fond
// blanc n'atteignait pas le contraste 3:1 exige d'un indicateur de focus.
export const CHAMP =
  "border border-slate-300 rounded-xl px-3 py-2 min-h-[44px] text-sm bg-white text-slate-800 " +
  "placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 " +
  "focus:border-indigo-500 transition-colors";
