/**
 * Lecture factuelle d'une serie de cours.
 *
 * Rien ici ne predit quoi que ce soit. Ces fonctions decrivent ce qui s'est
 * produit — l'amplitude des variations passees, la position du cours dans sa
 * fourchette annuelle — et comparent des strategies d'achat *sur des donnees
 * deja connues*. Un resultat passe n'est pas une indication de resultat futur,
 * et l'interface doit le rappeler partout ou ces chiffres apparaissent.
 *
 * La question « quel est le meilleur moment pour investir ? » n'a pas de
 * reponse predictive honnete. Elle a en revanche une reponse factuelle utile :
 * on peut mesurer, apres coup, ce qu'auraient donne des facons differentes de
 * repartir ses achats, et ce que les frais y ont coute. C'est l'objet de
 * `compareStrategies`.
 */

export interface PointSerie {
  date: string;
  prix: number;
}

// ---------------------------------------------------------------------------
// Description d'une serie

export interface Indicateurs {
  dernier: number;
  plusHaut: number;
  plusBas: number;
  /** Position du dernier cours dans la fourchette, de 0 (au plus bas) a 100. */
  positionPct: number;
  /** Variations sur des horizons courants, en %. `null` si l'historique manque. */
  var1m: number | null;
  var6m: number | null;
  var1a: number | null;
  /**
   * Amplitude des variations quotidiennes, annualisee, en %. Mesure a quel
   * point le cours a bouge — pas le sens dans lequel il va bouger.
   */
  volatilitePct: number | null;
  /** Plus forte baisse subie entre un sommet et le creux qui a suivi, en %. */
  pireBaissePct: number | null;
}

function variationDepuis(serie: PointSerie[], jours: number): number | null {
  if (serie.length < 2) return null;
  const fin = serie[serie.length - 1];
  const cible = +new Date(fin.date) - jours * 86_400_000;
  // Premier point a la date visee ou apres : l'historique peut etre plus court
  // que l'horizon demande, auquel cas la variation n'a pas de sens.
  const depart = serie.find((p) => +new Date(p.date) >= cible);
  if (!depart || depart === fin) return null;
  const ecartJours = (+new Date(fin.date) - +new Date(depart.date)) / 86_400_000;
  if (ecartJours < jours * 0.5) return null;
  return (fin.prix / depart.prix - 1) * 100;
}

export function indicateurs(serie: PointSerie[]): Indicateurs | null {
  const points = serie.filter((p) => isFinite(p.prix) && p.prix > 0);
  if (points.length === 0) return null;
  const prix = points.map((p) => p.prix);
  const plusHaut = Math.max(...prix);
  const plusBas = Math.min(...prix);
  const dernier = prix[prix.length - 1];

  // Rendements quotidiens, pour l'amplitude des variations.
  let volatilitePct: number | null = null;
  if (points.length > 20) {
    const rend: number[] = [];
    for (let i = 1; i < prix.length; i++) rend.push(prix[i] / prix[i - 1] - 1);
    const moy = rend.reduce((a, b) => a + b, 0) / rend.length;
    const variance =
      rend.reduce((a, b) => a + (b - moy) ** 2, 0) / (rend.length - 1);
    volatilitePct = Math.sqrt(variance) * Math.sqrt(252) * 100;
  }

  // Plus forte baisse subie : ce qu'il aurait fallu encaisser sans vendre.
  let pireBaissePct: number | null = null;
  if (points.length > 1) {
    let sommet = prix[0];
    let pire = 0;
    for (const p of prix) {
      if (p > sommet) sommet = p;
      const baisse = (p / sommet - 1) * 100;
      if (baisse < pire) pire = baisse;
    }
    pireBaissePct = pire;
  }

  return {
    dernier,
    plusHaut,
    plusBas,
    positionPct:
      plusHaut > plusBas ? ((dernier - plusBas) / (plusHaut - plusBas)) * 100 : 50,
    var1m: variationDepuis(points, 30),
    var6m: variationDepuis(points, 182),
    var1a: variationDepuis(points, 365),
    volatilitePct,
    pireBaissePct,
  };
}

// ---------------------------------------------------------------------------
// Comparaison de facons de repartir ses achats

export interface Strategie {
  /** Ce qui sort de la poche, frais compris. */
  engageEur: number;
  fraisEur: number;
  /** Titres accumules. */
  quantite: number;
  /** Valeur au dernier cours de la serie. */
  valeurFinaleEur: number;
  /** Resultat brut, avant frais de revente. */
  gainEur: number;
  gainPct: number;
  /** Nombre d'ordres passes : chaque ordre coute. */
  ordres: number;
}

export interface ComparaisonStrategies {
  /** Un achat par mois, le meme jour, sans rien decider. */
  programme: Strategie;
  /** Tout au meilleur jour possible — connu seulement apres coup. */
  meilleurJour: Strategie;
  /** Tout au pire jour possible. */
  pireJour: Strategie;
  /** Tout le premier jour de la periode, sans attendre. */
  toutDeSuite: Strategie;
  /** Dates effectivement retenues pour les achats programmes. */
  datesProgramme: string[];
  dateMeilleurJour: string;
  datePireJour: string;
}

function strategie(
  achats: { prix: number }[],
  budgetParAchat: number,
  fraisFixes: number,
  taxePct: number,
  prixFinal: number,
): Strategie {
  let quantite = 0;
  let fraisEur = 0;
  for (const a of achats) {
    const apresFraisFixes = Math.max(0, budgetParAchat - fraisFixes);
    const investi = apresFraisFixes / (1 + taxePct / 100);
    fraisEur += budgetParAchat - investi;
    quantite += investi / a.prix;
  }
  const engageEur = budgetParAchat * achats.length;
  const valeurFinaleEur = quantite * prixFinal;
  return {
    engageEur,
    fraisEur,
    quantite,
    valeurFinaleEur,
    gainEur: valeurFinaleEur - engageEur,
    gainPct: engageEur > 0 ? ((valeurFinaleEur - engageEur) / engageEur) * 100 : 0,
    ordres: achats.length,
  };
}

/**
 * Compare, sur une serie *deja connue*, quatre facons d'avoir place la meme
 * somme totale. Les deux strategies « meilleur jour » et « pire jour » sont
 * impossibles a executer a l'avance : elles servent uniquement a borner ce que
 * le timing pouvait rapporter ou couter, et donc a situer le reste.
 *
 * Le prix est suppose exprime dans une seule devise : la comparaison porte sur
 * la repartition des achats, pas sur le change.
 */
export function compareStrategies(
  serie: PointSerie[],
  budgetMensuelEur: number,
  nbMois: number,
  fraisFixes: number,
  taxePct: number,
): ComparaisonStrategies | null {
  const points = serie.filter((p) => isFinite(p.prix) && p.prix > 0);
  if (points.length < 2 || nbMois < 1 || budgetMensuelEur <= 0) return null;

  // Un achat par mois : on prend le premier point de chaque tranche mensuelle
  // reguliere, ce qui reproduit un ordre permanent chez un courtier.
  const debut = +new Date(points[0].date);
  const fin = +new Date(points[points.length - 1].date);
  const pas = (fin - debut) / nbMois;
  const achats: PointSerie[] = [];
  for (let i = 0; i < nbMois; i++) {
    const cible = debut + i * pas;
    const p = points.find((x) => +new Date(x.date) >= cible) ?? points[0];
    achats.push(p);
  }

  const total = budgetMensuelEur * nbMois;
  const prixFinal = points[points.length - 1].prix;

  let bas = points[0];
  let haut = points[0];
  for (const p of points) {
    if (p.prix < bas.prix) bas = p;
    if (p.prix > haut.prix) haut = p;
  }

  return {
    programme: strategie(achats, budgetMensuelEur, fraisFixes, taxePct, prixFinal),
    // Les strategies en un seul ordre ne paient les frais fixes qu'une fois :
    // c'est un avantage reel, qu'il serait malhonnete de masquer.
    meilleurJour: strategie([bas], total, fraisFixes, taxePct, prixFinal),
    pireJour: strategie([haut], total, fraisFixes, taxePct, prixFinal),
    toutDeSuite: strategie([points[0]], total, fraisFixes, taxePct, prixFinal),
    datesProgramme: achats.map((a) => a.date),
    dateMeilleurJour: bas.date,
    datePireJour: haut.date,
  };
}

/**
 * Cout des frais fixes selon le decoupage d'une meme somme. Repond a la seule
 * question de timing qui ait une reponse certaine pour de petits montants :
 * plus on fractionne, plus les frais fixes pesent.
 */
export function poidsDesFrais(
  totalEur: number,
  nbOrdres: number,
  fraisFixes: number,
  taxePct: number,
): { fraisEur: number; fraisPct: number; parOrdreEur: number } {
  if (nbOrdres < 1 || totalEur <= 0) {
    return { fraisEur: 0, fraisPct: 0, parOrdreEur: 0 };
  }
  const parOrdreEur = totalEur / nbOrdres;
  const fraisEur = nbOrdres * fraisFixes + (totalEur * taxePct) / 100;
  return { fraisEur, fraisPct: (fraisEur / totalEur) * 100, parOrdreEur };
}

/** Chemin SVG d'une courbe, normalisee dans une boite donnee. */
export function cheminSvg(
  serie: PointSerie[],
  largeur: number,
  hauteur: number,
): string {
  const points = serie.filter((p) => isFinite(p.prix) && p.prix > 0);
  if (points.length < 2) return "";
  const prix = points.map((p) => p.prix);
  const min = Math.min(...prix);
  const max = Math.max(...prix);
  const amplitude = max - min || 1;
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * largeur;
      const y = hauteur - ((p.prix - min) / amplitude) * hauteur;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}
