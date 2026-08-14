/**
 * Destinations de l'application et repartition de la navigation.
 *
 * L'ancienne barre alignait onze onglets sur une seule ligne defilante. Mesure
 * faite sur un ecran de 390 px : elle occupait 1250 px, et seules trois
 * destinations etaient visibles sans faire defiler lateralement. Huit sur onze
 * etaient donc invisibles — dont « Comprendre », la page qui explique a quoi
 * sert l'outil, qu'un nouvel utilisateur ne pouvait pas trouver.
 *
 * D'ou cette separation : quatre destinations principales, atteignables au
 * pouce en bas de l'ecran, et le reste dans une feuille « Plus » qui les
 * montre toutes d'un coup au lieu de les faire defiler.
 *
 * Le choix des quatre : ce que l'on consulte souvent (les pistes), ce qui
 * repond a la question de fond (l'horizon), ce qui fait progresser
 * (s'entrainer) et ce qui se lit regulierement (le journal). Les reglages, le
 * compte et l'historique sont des destinations occasionnelles : les mettre au
 * meme niveau reviendrait a dire qu'on les ouvre aussi souvent.
 */

export type Onglet =
  | "pistes"
  | "marche"
  | "horizon"
  | "simuler"
  | "journal"
  | "comprendre"
  | "cours"
  | "investir"
  | "positions"
  | "historique"
  | "configuration"
  | "compte";

export interface DefinitionOnglet {
  id: Onglet;
  label: string;
  /** Purement decoratif : jamais le seul porteur de sens. */
  icone: string;
  /** Une ligne dans la feuille « Plus », pour ne pas naviguer a l'aveugle. */
  detail: string;
}

/**
 * Limite haute assumee. Au-dela de cinq cibles sur la largeur d'un telephone,
 * chacune descend sous la taille tactile confortable et les libelles se
 * tronquent. Le cinquieme emplacement est occupe par « Plus ».
 */
export const MAX_ONGLETS_PRINCIPAUX = 5;

export const ONGLETS_PRINCIPAUX: DefinitionOnglet[] = [
  {
    id: "pistes",
    label: "Pistes",
    icone: "📡",
    detail: "Les déclarations officielles repérées cette semaine.",
  },
  {
    id: "horizon",
    label: "Horizon",
    icone: "⏳",
    detail: "Ce que la durée de détention a changé, dans le passé.",
  },
  {
    id: "simuler",
    label: "S'entraîner",
    icone: "🎓",
    detail: "Des achats fictifs, sans argent réel.",
  },
  {
    id: "journal",
    label: "Journal",
    icone: "📰",
    detail: "Actualités officielles et lectures pour apprendre.",
  },
];

export const ONGLETS_SECONDAIRES: DefinitionOnglet[] = [
  {
    id: "cours",
    label: "Cours",
    icone: "🎓",
    detail: "Dix-huit chapitres adossés à des travaux de recherche vérifiés.",
  },
  {
    id: "comprendre",
    label: "Comprendre",
    icone: "📖",
    detail: "À quoi sert l'outil, et comment lire une fiche.",
  },
  {
    id: "marche",
    label: "Marché",
    icone: "📈",
    detail: "Cours, indices et recherche de titres.",
  },
  {
    id: "investir",
    label: "Investir",
    icone: "🏦",
    detail: "Courtiers agréés en Belgique et leurs tarifs.",
  },
  {
    id: "positions",
    label: "Positions",
    icone: "📋",
    detail: "Vos simulations en cours.",
  },
  {
    id: "historique",
    label: "Historique",
    icone: "🕓",
    detail: "Les pistes passées et ce qu'elles sont devenues.",
  },
  {
    id: "configuration",
    label: "Réglages",
    icone: "⚙️",
    detail: "Frais, taxe, taille de position, notifications.",
  },
  {
    id: "compte",
    label: "Compte",
    icone: "👤",
    detail: "Vos données, export et déconnexion.",
  },
];

export const TOUS_LES_ONGLETS: DefinitionOnglet[] = [
  ...ONGLETS_PRINCIPAUX,
  ...ONGLETS_SECONDAIRES,
];

export function estPrincipal(id: Onglet): boolean {
  return ONGLETS_PRINCIPAUX.some((o) => o.id === id);
}

export function definitionDe(id: Onglet): DefinitionOnglet | undefined {
  return TOUS_LES_ONGLETS.find((o) => o.id === id);
}

/**
 * Libelle du bouton « Plus ».
 *
 * Quand la page courante vit dans la feuille, le bouton porte son nom plutot
 * que le mot « Plus » : sans cela, l'utilisateur consultant « Réglages » ne
 * verrait aucun onglet actif et perdrait le fil de l'endroit ou il se trouve.
 */
export function libellePlus(courant: Onglet): { label: string; icone: string } {
  if (estPrincipal(courant)) return { label: "Plus", icone: "☰" };
  const d = definitionDe(courant);
  return d ? { label: d.label, icone: d.icone } : { label: "Plus", icone: "☰" };
}
