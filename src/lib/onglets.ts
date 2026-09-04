/**
 * Destinations de l'application et repartition de la navigation.
 *
 * Quatre destinations principales, atteignables au pouce en bas de l'ecran, et
 * le reste dans une feuille « Plus » qui les montre toutes d'un coup au lieu de
 * les faire defiler.
 *
 * Le choix des quatre : ce que l'on consulte souvent (les pistes), ce qui
 * demande une decision (a valider), ce qui fait progresser (s'entrainer) et ce
 * qui se lit regulierement (le journal).
 *
 * ---------------------------------------------------------------------------
 * Pourquoi neuf destinations et non quatorze
 *
 * L'application en a compte jusqu'a quatorze, dont cinq paires qui traitaient
 * du meme objet a deux endroits :
 *
 *   - « Pistes » et « Historique » — une piste passee n'est qu'une piste dont
 *     on connait la suite ;
 *   - « S'entrainer » et « Positions » — simuler un achat puis changer
 *     d'onglet pour le retrouver decoupe une seule activite en deux ;
 *   - « Marche » et « Horizon » — le prix du jour et le rendement d'une
 *     detention longue sont les deux moities d'une meme lecon ;
 *   - « Comprendre » et « Investir » — deux pages de sections repliables dont
 *     les noms ne disaient pas laquelle contenait quoi ;
 *   - « Reglages » et « Compte » — la frontiere n'existait que dans la tete de
 *     qui les avait ecrites.
 *
 * Chaque paire est devenue une destination a deux vues. Le cout d'une
 * destination de trop n'est pas l'encombrement : c'est d'avoir a se demander,
 * avant chaque usage, laquelle des deux ouvrir.
 */

export type Onglet =
  | "pistes"
  | "propositions"
  | "simuler"
  | "journal"
  | "cours"
  | "comprendre"
  | "donnees"
  | "marche"
  | "configuration";

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
    detail: "Les déclarations repérées, et ce que les précédentes sont devenues.",
  },
  {
    id: "propositions",
    label: "À valider",
    icone: "📥",
    detail: "Vérifications proposées à partir de vos données. Rien ne s'exécute.",
  },
  {
    id: "simuler",
    label: "S'entraîner",
    icone: "🎓",
    detail: "Des achats fictifs, et le suivi de ceux déjà passés.",
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
    icone: "📚",
    detail: "Dix-huit chapitres adossés à des travaux de recherche vérifiés.",
  },
  {
    id: "comprendre",
    label: "Comprendre",
    icone: "📖",
    detail: "À quoi sert l'outil, et comment investir depuis la Belgique.",
  },
  {
    id: "donnees",
    label: "Mes données",
    icone: "📇",
    detail: "Ce que l'assistant sait de vous, et depuis quand.",
  },
  {
    id: "marche",
    label: "Marché",
    icone: "📈",
    detail: "Les cours du jour, et ce que la durée de détention a changé.",
  },
  {
    id: "configuration",
    label: "Réglages",
    icone: "⚙️",
    detail: "Ce qui est surveillé, vos frais, et votre compte.",
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
