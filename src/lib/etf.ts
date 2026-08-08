/**
 * ETF actions mondiales : ce qu'on en sait, et ce qu'on n'en sait pas.
 *
 * Ce module ne recommande pas d'acheter cet ETF. Il decrit un produit precis
 * que l'utilisateur a designe, rassemble ce qui a pu etre verifie, et nomme
 * ce qui ne l'a pas ete plutot que de combler les trous avec des chiffres
 * plausibles. Sur un placement destine a etre garde des annees, un chiffre
 * approximatif presente comme exact coute plus cher qu'une case vide.
 */

export interface DescriptionEtf {
  symbole: string;
  nom: string;
  place: string;
  /** Devise de cotation — pas celle des actifs detenus. */
  devise: string;
  capitalisant: boolean;
  faits: string[];
  /** Ce que l'outil n'a pas pu confirmer et qu'il ne faut donc pas inventer. */
  aVerifier: string[];
}

export const ETF_MONDE: DescriptionEtf = {
  symbole: "IWDA.AS",
  nom: "iShares Core MSCI World UCITS ETF USD (Acc)",
  place: "Euronext Amsterdam",
  devise: "EUR",
  capitalisant: true,
  faits: [
    "Un seul ordre donne une part de plusieurs centaines de grandes sociétés cotées dans les pays développés : c'est l'inverse du pari sur une entreprise unique.",
    "Coté en euros à Amsterdam. Vous payez en euros, sans conversion de devise — donc sans commission de change de votre courtier.",
    "Capitalisant : il ne verse aucun dividende, il les réinvestit à l'intérieur du fonds. Rien n'arrive sur votre compte tant que vous ne vendez pas.",
    "Les frais de gestion du fonds sont déjà déduits du cours publié. Les rendements passés affichés dans l'onglet Horizon sont donc nets de ces frais, sans qu'il faille les retrancher une seconde fois.",
  ],
  aVerifier: [
    "Le nom exact, la place et la devise de cotation viennent du flux de cours utilisé par l'outil. L'ISIN et les frais annuels du fonds n'ont pas pu être lus depuis une source officielle : ils figurent sur le document d'informations clés (KID) que votre courtier affiche avant tout ordre, et c'est là qu'il faut les vérifier.",
    "Plusieurs ETF portent des noms très proches et se négocient sur plusieurs places, dans des devises différentes. Vérifiez l'ISIN sur l'écran de votre courtier avant de valider : c'est le seul identifiant qui ne prête pas à confusion.",
  ],
};

/**
 * Le piege le plus courant sur ce produit, et celui qu'aucune fiche
 * commerciale ne met en avant.
 */
export const AVERTISSEMENT_DEVISE =
  "Être coté en euros ne protège pas du risque de change. Les sociétés détenues par ce fonds encaissent surtout des dollars : si le dollar baisse face à l'euro, le cours en euros baisse aussi, même si ces sociétés se portent bien. Coter en euros vous évite la commission de conversion de votre courtier, pas le mouvement des devises lui-même.";

// ---------------------------------------------------------------------------
// Taxe belge sur les operations de bourse (TOB)

export interface RegimeTob {
  cle: string;
  libelle: string;
  achatPct: number;
  ventePct: number;
  plafondEur: number;
  source: "officiel" | "a-verifier";
  note: string;
}

/**
 * Deux regimes possibles pour un ETF de capitalisation detenu depuis la
 * Belgique. Lequel s'applique depend de l'inscription du fonds aupres de la
 * FSMA — une information propre a chaque ETF, que l'outil n'a pas pu
 * verifier et qu'il serait grave de deviner : entre 0,24 % et 1,32 %
 * d'aller-retour, l'ecart est d'un facteur cinq.
 *
 * Les deux regimes sont donc presentes cote a cote. Le courtier calcule et
 * retient la taxe lui-meme : le decompte d'ordre indique le taux reellement
 * applique, et c'est la seule source qui fasse foi.
 */
export const REGIMES_TOB: RegimeTob[] = [
  {
    cle: "non-inscrit",
    libelle: "ETF de capitalisation non inscrit en Belgique",
    achatPct: 0.12,
    ventePct: 0.12,
    plafondEur: 1300,
    source: "a-verifier",
    note: "Taux couramment retenu pour ce cas, non confirmé sur une source officielle depuis cet outil.",
  },
  {
    cle: "inscrit",
    libelle: "ETF de capitalisation inscrit en Belgique",
    achatPct: 0,
    ventePct: 1.32,
    plafondEur: 4000,
    source: "officiel",
    note: "Taux et plafond lus dans le guide tarifaire de MeDirect : « 1,32 % du prix de vente total, mais ne peut pas excéder 4 000 € ». Rien à l'achat.",
  },
];

export interface CoutAllerRetour {
  /** Frais de courtage payes a l'achat et a la vente, en euros. */
  courtageEur: number;
  /** Taxe de bourse payee a l'achat et a la vente, en euros. */
  taxeEur: number;
  totalEur: number;
  /** Ce qu'il faut gagner, en pourcentage, pour revenir a zero. */
  seuilRentabilitePct: number;
}

/**
 * Cout complet d'un aller-retour : acheter puis revendre.
 *
 * C'est le chiffre qui decide si un petit ticket a un sens. Il est calcule
 * ici en euros plutot qu'en pourcentage parce que sur 50 €, un pourcentage
 * de frais parait petit alors que la somme ne l'est pas.
 *
 * Le plafond de la taxe est applique : il ne change rien sur de petits
 * montants, mais l'omettre ferait diverger le calcul sur les gros ordres.
 */
export function coutAllerRetour(
  montantEur: number,
  fraisOrdreEur: number,
  regime: RegimeTob,
): CoutAllerRetour {
  if (!isFinite(montantEur) || montantEur <= 0) {
    return {
      courtageEur: 0,
      taxeEur: 0,
      totalEur: 0,
      seuilRentabilitePct: Infinity,
    };
  }
  const plafonne = (pct: number) =>
    Math.min((montantEur * pct) / 100, regime.plafondEur);
  const courtageEur = fraisOrdreEur * 2;
  const taxeEur = plafonne(regime.achatPct) + plafonne(regime.ventePct);
  const totalEur = courtageEur + taxeEur;
  return {
    courtageEur,
    taxeEur,
    totalEur,
    seuilRentabilitePct: (totalEur / montantEur) * 100,
  };
}

/**
 * Rendement reel : ce qui reste une fois l'inflation retiree.
 *
 * Sur trente ans, l'ecart n'est pas un detail de presentation. A 7 % nominal
 * et 2 % d'inflation, 100 € deviennent 761 € affiches mais 420 € en pouvoir
 * d'achat d'aujourd'hui — soit pres de la moitie du gain qui n'existe que
 * dans l'affichage. Le taux d'inflation est une hypothese saisie par
 * l'utilisateur, jamais une prevision produite par l'outil.
 */
export function enReel(nominalPct: number, inflationPct: number): number {
  return ((1 + nominalPct / 100) / (1 + inflationPct / 100) - 1) * 100;
}

/** Capital atteint par 100 € apres `ans` annees a `tauxPct` par an. */
export function capitalApres(tauxPct: number, ans: number, mise = 100): number {
  return mise * Math.pow(1 + tauxPct / 100, ans);
}

/**
 * Nombre d'annees necessaires pour que le seuil de rentabilite devienne
 * negligeable devant le rendement, a un rendement annuel donne.
 *
 * Sert a repondre a une question concrete : « ces frais, c'est grave ou
 * pas ? ». La reponse depend entierement de la duree — le meme cout fixe est
 * ecrasant sur six mois et invisible sur vingt ans. Le rendement passe en
 * argument est une hypothese de l'utilisateur, jamais une prevision.
 */
export function anneesPourAbsorber(
  seuilPct: number,
  rendementAnnuelPct: number,
): number | null {
  if (!isFinite(seuilPct) || seuilPct <= 0) return 0;
  if (!isFinite(rendementAnnuelPct) || rendementAnnuelPct <= 0) return null;
  return Math.log(1 + seuilPct / 100) / Math.log(1 + rendementAnnuelPct / 100);
}
