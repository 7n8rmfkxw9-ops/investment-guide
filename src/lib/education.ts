/**
 * Bibliotheque de lecture : conseils et fiches pour apprendre a investir.
 *
 * Deux choix expliquent la forme de ce fichier.
 *
 * D'abord, il vit cote frontend et non dans la fonction `journal`. Une liste
 * fixe n'a aucune raison de couter un aller-retour reseau, et surtout : le
 * frontend se republie tout seul a chaque fusion alors que les Edge Functions
 * demandent un deploiement manuel. Mettre ces liens ici, c'est garantir
 * qu'ils arrivent effectivement chez le lecteur.
 *
 * Ensuite, chaque entree a ete ouverte et verifiee une par une (aout 2026) :
 * le titre affiche est celui de la page, pas une reformulation. Wikifin ne
 * publie pas de flux RSS, donc rien ici ne peut etre decouvert
 * automatiquement — une liste entretenue a la main est le seul moyen honnete,
 * et un lien qui bouge cassera cette entree-la plutot que la page entiere.
 *
 * Aucune de ces lectures ne recommande un placement precis, et leur presence
 * ici n'est pas un conseil : ce sont des explications de fonctionnement,
 * publiees par des organismes publics d'education financiere.
 */

export type CleTheme =
  | "demarrer"
  | "produits"
  | "duree"
  | "proteger"
  | "durable"
  | "long-terme";

export interface Theme {
  cle: CleTheme;
  libelle: string;
  icone: string;
  /** Ce que le lecteur saura faire apres avoir lu ce theme. */
  promesse: string;
}

/**
 * Les themes sont ordonnes comme un parcours, pas par ordre alphabetique :
 * comprendre pourquoi on investit precede le choix d'un produit, qui precede
 * lui-meme la question de la duree. « Se proteger » vient tot volontairement
 * — une arnaque coute plus cher que n'importe quelle erreur de selection.
 */
export const THEMES: Theme[] = [
  {
    cle: "demarrer",
    libelle: "Commencer",
    icone: "🧭",
    promesse: "Savoir si investir a du sens pour vous, et avec quelle somme.",
  },
  {
    cle: "proteger",
    libelle: "Se protéger",
    icone: "🛡️",
    promesse:
      "Reconnaître une arnaque avant d'y perdre de l'argent. À lire tôt, pas en dernier.",
  },
  {
    cle: "produits",
    libelle: "Les produits",
    icone: "🧩",
    promesse: "Comprendre ce que vous achetez réellement, produit par produit.",
  },
  {
    cle: "duree",
    libelle: "Durée et rendement",
    icone: "⏳",
    promesse: "Mesurer un rendement, et voir ce que l'inflation en retire.",
  },
  {
    cle: "long-terme",
    libelle: "Le très long terme",
    icone: "🌱",
    promesse: "Pension et épargne longue, où la durée change tout.",
  },
  {
    cle: "durable",
    libelle: "Investir durablement",
    icone: "🌍",
    promesse: "Ce que recouvrent — et ne recouvrent pas — les labels durables.",
  },
];

export interface Source {
  cle: string;
  nom: string;
  detail: string;
  pays: string;
  accueil: string;
  /** Signale une source dont le cadre fiscal n'est pas le cadre belge. */
  horsBelgique?: boolean;
}

export const SOURCES: Record<string, Source> = {
  wikifin: {
    cle: "wikifin",
    nom: "Wikifin",
    detail:
      "Le site d'éducation financière de la FSMA, l'autorité belge des marchés financiers. Public, gratuit, sans publicité et sans produit à vendre.",
    pays: "🇧🇪",
    accueil: "https://www.wikifin.be/fr/epargner-et-investir",
  },
  lfpt: {
    cle: "lfpt",
    nom: "La finance pour tous",
    detail:
      "Site de l'Institut pour l'éducation financière du public, organisme français d'intérêt général. Utile pour les mécanismes de marché, qui ne connaissent pas de frontière.",
    pays: "🇫🇷",
    accueil: "https://www.lafinancepourtous.com/",
    horsBelgique: true,
  },
};

export interface Lecture {
  titre: string;
  lien: string;
  theme: CleTheme;
  source: keyof typeof SOURCES;
  /** Pourquoi cette page merite le detour, en une phrase. */
  pourquoi: string;
  /** Mise en avant dans le parcours de demarrage. */
  essentiel?: boolean;
}

const W = "https://www.wikifin.be/fr";
const L = "https://www.lafinancepourtous.com";

export const LECTURES: Lecture[] = [
  // --- Commencer -----------------------------------------------------------
  {
    titre: "La différence entre épargner et investir",
    lien: `${W}/epargner-et-investir/comment-investir-et-repartition-des-risques/la-difference-entre-epargner-et`,
    theme: "demarrer",
    source: "wikifin",
    pourquoi:
      "La distinction de départ : l'un protège une somme, l'autre l'expose pour la faire croître.",
    essentiel: true,
  },
  {
    titre: "Pourquoi investir ?",
    lien: `${W}/epargner-et-investir/comment-investir-et-repartition-des-risques/pourquoi-investir`,
    theme: "demarrer",
    source: "wikifin",
    pourquoi: "Ce que l'investissement peut, et surtout ne peut pas, faire pour vous.",
    essentiel: true,
  },
  {
    titre: "Comment investir ?",
    lien: `${W}/epargner-et-investir/comment-investir-et-repartition-des-risques/comment-investir`,
    theme: "demarrer",
    source: "wikifin",
    pourquoi:
      "La marche à suivre concrète, et la répartition des risques expliquée sans jargon.",
    essentiel: true,
  },
  {
    titre: "Quel montant investir ?",
    lien: `${W}/epargner-et-investir/comment-investir-et-repartition-des-risques/quel-montant-investir`,
    theme: "demarrer",
    source: "wikifin",
    pourquoi:
      "Comment situer une somme raisonnable à côté de votre épargne de précaution.",
    essentiel: true,
  },
  {
    titre: "Votre profil d'investisseur",
    lien: `${W}/epargner-et-investir/comment-investir-et-repartition-des-risques/votre-profil-dinvestisseur`,
    theme: "demarrer",
    source: "wikifin",
    pourquoi:
      "Ce que votre courtier vous demandera, et pourquoi il vaut mieux le savoir avant lui.",
  },
  {
    titre: "Checklist — Investir",
    lien: `${W}/epargner-et-investir/checklist-investir`,
    theme: "demarrer",
    source: "wikifin",
    pourquoi:
      "Les questions à se poser avant chaque ordre, sous forme de liste à cocher.",
    essentiel: true,
  },
  {
    titre: "Qu'est-ce qu'un compte-titres ?",
    lien: `${W}/epargner-et-investir/comment-investir-et-repartition-des-risques/quest-ce-quun-compte-titres`,
    theme: "demarrer",
    source: "wikifin",
    pourquoi: "Le compte sans lequel rien n'est possible, expliqué simplement.",
  },
  {
    titre: "Pourquoi épargner ?",
    lien: `${W}/epargner-et-investir/compte-depargne/pourquoi-epargner`,
    theme: "demarrer",
    source: "wikifin",
    pourquoi:
      "L'étape d'avant : sans réserve de sécurité, un placement long devient intenable.",
  },
  {
    titre: "Checklist — Épargne",
    lien: `${W}/epargner-et-investir/compte-depargne/checklist-epargne`,
    theme: "demarrer",
    source: "wikifin",
    pourquoi: "Vérifier que la base est solide avant d'engager quoi que ce soit.",
  },
  {
    titre: "Calculateurs, conseils pratiques, checklists",
    lien: `${W}/calculateur-conseils-pratiques-checklist`,
    theme: "demarrer",
    source: "wikifin",
    pourquoi: "Les outils de calcul de Wikifin, rassemblés au même endroit.",
  },

  // --- Se proteger ---------------------------------------------------------
  {
    titre: "Qu'est-ce qu'une fraude à l'investissement ?",
    lien: `${W}/epargner-et-investir/fraudes-et-escroqueries-linvestissement/quest-ce-quune-fraude-linvestissement`,
    theme: "proteger",
    source: "wikifin",
    pourquoi: "La définition, avant les exemples.",
    essentiel: true,
  },
  {
    titre: "Cela peut arriver à tout le monde",
    lien: `${W}/epargner-et-investir/fraudes-et-escroqueries-linvestissement/cela-peut-arriver-tout-le-monde`,
    theme: "proteger",
    source: "wikifin",
    pourquoi:
      "Pourquoi se croire trop prudent pour se faire avoir est précisément le point faible.",
    essentiel: true,
  },
  {
    titre: "Les différents types de fraude",
    lien: `${W}/epargner-et-investir/fraudes-et-escroqueries-linvestissement/les-differents-types-de-fraude`,
    theme: "proteger",
    source: "wikifin",
    pourquoi: "Reconnaître les montages courants avant d'y être confronté.",
  },
  {
    titre: "Conseils contre la fraude",
    lien: `${W}/epargner-et-investir/fraudes-et-escroqueries-linvestissement/conseils-contre-la-fraude`,
    theme: "proteger",
    source: "wikifin",
    pourquoi: "Les réflexes de vérification, à appliquer avant tout versement.",
    essentiel: true,
  },
  {
    titre: "Test de fraude — Êtes-vous la victime d'une arnaque ?",
    lien: `${W}/epargner-et-investir/fraudes-et-escroqueries-linvestissement/test-de-fraude`,
    theme: "proteger",
    source: "wikifin",
    pourquoi: "Un questionnaire à passer en cas de doute sur une proposition reçue.",
  },
  {
    titre: "Que faire si vous êtes victime d'une fraude ?",
    lien: `${W}/epargner-et-investir/fraudes-et-escroqueries-linvestissement/que-faire-si-vous-etes-victime-dune`,
    theme: "proteger",
    source: "wikifin",
    pourquoi: "Les démarches, dans l'ordre, quand le mal est déjà fait.",
  },

  // --- Les produits --------------------------------------------------------
  {
    titre: "Tracker",
    lien: `${W}/epargner-et-investir/produits-dinvestissement/tracker`,
    theme: "produits",
    source: "wikifin",
    pourquoi:
      "La fiche du régulateur sur les ETF — le produit derrière l'onglet Horizon de cet outil.",
    essentiel: true,
  },
  {
    titre: "Fonds de placement",
    lien: `${W}/epargner-et-investir/produits-dinvestissement/fonds-de-placement`,
    theme: "produits",
    source: "wikifin",
    pourquoi: "Comment un fonds répartit un placement, et ce que ça change au risque.",
    essentiel: true,
  },
  {
    titre: "Action",
    lien: `${W}/epargner-et-investir/produits-dinvestissement/action`,
    theme: "produits",
    source: "wikifin",
    pourquoi: "Ce que possède réellement un actionnaire.",
    essentiel: true,
  },
  {
    titre: "Obligation",
    lien: `${W}/epargner-et-investir/produits-dinvestissement/obligation`,
    theme: "produits",
    source: "wikifin",
    pourquoi: "Prêter plutôt que posséder : l'autre grande famille de placements.",
  },
  {
    titre: "Les produits structurés",
    lien: `${W}/epargner-et-investir/produits-dinvestissement/les-produits-structures`,
    theme: "produits",
    source: "wikifin",
    pourquoi:
      "Souvent proposés en agence, souvent complexes : savoir ce qu'on signe.",
  },
  {
    titre: "Le crowdfunding",
    lien: `${W}/epargner-et-investir/produits-dinvestissement/le-crowdfunding`,
    theme: "produits",
    source: "wikifin",
    pourquoi: "Financer directement une entreprise, et le risque particulier que ça implique.",
  },
  {
    titre: "Investir dans l'immobilier",
    lien: `${W}/epargner-et-investir/produits-dinvestissement/investir-dans-limmobilier`,
    theme: "produits",
    source: "wikifin",
    pourquoi: "Le placement préféré des Belges, avec ses contraintes propres.",
  },
  {
    titre: "Investir dans l'or et d'autres matières premières",
    lien: `${W}/epargner-et-investir/produits-dinvestissement/investir-dans-lor-et-dautres-matieres-premieres`,
    theme: "produits",
    source: "wikifin",
    pourquoi: "Pourquoi un actif qui ne produit rien se comporte autrement qu'une action.",
  },
  {
    titre: "Actions",
    lien: `${L}/decryptages/marches-financiers/produits-financiers/actions-2/`,
    theme: "produits",
    source: "lfpt",
    pourquoi: "Une seconde explication, plus détaillée sur le fonctionnement du marché.",
  },
  {
    titre: "Liquidité",
    lien: `${L}/decryptages/marches-financiers/fonctionnement-du-marche/liquidite/`,
    theme: "produits",
    source: "lfpt",
    pourquoi:
      "Pouvoir revendre quand on veut n'a rien d'automatique — la notion qui l'explique.",
  },

  // --- Duree et rendement --------------------------------------------------
  {
    titre: "Comment calculer le taux de rendement d'un placement ?",
    lien: `${W}/epargner-et-investir/comment-investir-et-repartition-des-risques/comment-calculer-le-taux-de`,
    theme: "duree",
    source: "wikifin",
    pourquoi:
      "Le calcul exact, celui qui permet de vérifier les chiffres qu'on vous présente.",
    essentiel: true,
  },
  {
    titre: "Quel est l'impact de l'inflation sur votre épargne ?",
    lien: `${W}/epargner-et-investir/compte-depargne/quel-est-limpact-de-linflation-sur-votre-epargne`,
    theme: "duree",
    source: "wikifin",
    pourquoi:
      "Le complément direct du bouton « retirer l'inflation » de l'onglet Horizon.",
    essentiel: true,
  },
  {
    titre: "Le couple rendement / risque",
    lien: `${L}/pratique/placements/placements-financiers-generalites/le-couple-rendement-risque/`,
    theme: "duree",
    source: "lfpt",
    pourquoi:
      "Pourquoi un rendement élevé annoncé sans risque élevé devrait toujours alerter.",
  },

  // --- Le tres long terme --------------------------------------------------
  {
    titre: "Pension et préparation de la retraite",
    lien: `${W}/pension-et-preparation-de-la-retraite`,
    theme: "long-terme",
    source: "wikifin",
    pourquoi: "L'horizon le plus long qui vous concerne, et le cadre belge qui va avec.",
  },
  {
    titre: "Conseils pour votre épargne-pension",
    lien: `${W}/impots-emploi-et-revenus/declaration-dimpots/reductions-fiscales/conseils-pour-votre-epargne`,
    theme: "long-terme",
    source: "wikifin",
    pourquoi:
      "L'avantage fiscal belge sur l'épargne-pension, et ses conditions.",
  },

  // --- Investir durablement ------------------------------------------------
  {
    titre: "Qu'est-ce qu'investir durablement ?",
    lien: `${W}/epargner-et-investir/investissement-et-banque-ethiquesdurables/quest-ce-quinvestir-durablement`,
    theme: "durable",
    source: "wikifin",
    pourquoi: "Ce que le mot recouvre vraiment, au-delà de l'argument commercial.",
  },
  {
    titre: "Stratégies d'investissement durable",
    lien: `${W}/epargner-et-investir/investissement-et-banque-ethiquesdurables/strategies-dinvestissement-durable`,
    theme: "durable",
    source: "wikifin",
    pourquoi: "Les approches concrètes, qui ne donnent pas les mêmes portefeuilles.",
  },
];

/** Lectures d'un theme, dans l'ordre ou elles ont ete rangees. */
export function lecturesDuTheme(theme: CleTheme): Lecture[] {
  return LECTURES.filter((l) => l.theme === theme);
}

/**
 * Parcours de demarrage : les lectures marquees essentielles, dans l'ordre des
 * themes puis de la liste.
 *
 * Une bibliotheque de trente entrees decourage autant qu'elle informe. Ce
 * sous-ensemble donne un point d'entree sans cacher le reste.
 */
export function parcoursEssentiel(): Lecture[] {
  const rang = new Map(THEMES.map((t, i) => [t.cle, i]));
  return LECTURES.filter((l) => l.essentiel).sort(
    (a, b) => (rang.get(a.theme) ?? 99) - (rang.get(b.theme) ?? 99),
  );
}
