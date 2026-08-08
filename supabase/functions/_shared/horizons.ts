// Fenetres glissantes : ce que la duree de detention a change, dans le passe.
//
// La question posee est « vaut-il mieux attendre 5, 10 ou 30 ans ? ». Il
// n'existe aucune reponse honnete sous forme de prevision, mais il en existe
// une sous forme de constat : sur l'historique disponible, on peut mesurer
// combien de periodes de N ans se sont terminees en perte, et a quel point
// les resultats se resserrent quand N augmente.
//
// Ce module ne contient que du calcul pur, sans reseau, pour la meme raison
// que _shared/parsing.ts : une erreur d'indice ou d'annualisation ne se voit
// pas a l'oeil nu sur un graphique, et produirait un chiffre credible mais
// faux — exactement le genre de chiffre sur lequel quelqu'un engagerait de
// l'argent reel.
//
// Deux garde-fous structurels sont implementes ici plutot que documentes :
//   1. la cadence de la serie est verifiee (le fournisseur degrade
//      silencieusement en trimestriel sur les tres longs historiques, ce qui
//      transformerait une fenetre de 10 ans en fenetre de 30) ;
//   2. une fenetre n'est publiee que si l'historique en contient assez pour
//      que le pire cas ne soit pas un simple accident de date de depart.

export interface PointMensuel {
  date: string;
  valeur: number;
}

export interface StatsHorizon {
  /** Duree de detention testee, en annees. */
  ans: number;
  /** Nombre de periodes de cette duree observables dans l'historique. */
  fenetres: number;
  pireAnnualisePct: number;
  medianAnnualisePct: number;
  meilleurAnnualisePct: number;
  /** 100 € places au pire moment sont devenus ceci. */
  pireFinal100: number;
  medianFinal100: number;
  meilleurFinal100: number;
  /** Part des periodes terminees au-dessus de la mise, en pourcentage. */
  partPositivePct: number;
  /** Dates de depart de la pire et de la meilleure periode. */
  pireDepart: string;
  meilleurDepart: string;
}

/**
 * Nombre minimum de periodes exigees pour publier une statistique.
 *
 * Douze, soit une annee entiere de dates de depart possibles. En dessous, le
 * « pire cas » ne decrit plus le comportement du placement mais le hasard
 * d'un mois d'entree particulier, et l'afficher donnerait a un chiffre
 * anecdotique l'autorite d'une mesure.
 */
export const MIN_FENETRES = 12;

export function mediane(valeurs: number[]): number {
  if (valeurs.length === 0) return Number.NaN;
  const t = [...valeurs].sort((a, b) => a - b);
  const m = Math.floor(t.length / 2);
  return t.length % 2 === 1 ? t[m] : (t[m - 1] + t[m]) / 2;
}

/**
 * Verifie que la serie avance bien d'un mois par point.
 *
 * Sur un historique tres long, le fournisseur de cours renvoie un pas
 * trimestriel sans le signaler, tout en acceptant `interval=1mo` : la reponse
 * reste parfaitement bien formee. Sans ce controle, une fenetre de 120 points
 * serait interpretee comme 10 ans alors qu'elle en couvrirait 30, et tous les
 * rendements annualises seraient faux d'un facteur 3.
 *
 * On raisonne sur l'ecart median plutot que sur chaque ecart : les mois font
 * 28 a 31 jours, et une seance manquante en fin de serie ne doit pas
 * invalider un historique par ailleurs correct.
 */
export function cadenceMensuelle(dates: string[]): boolean {
  if (dates.length < 24) return false;
  const ecarts: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const a = Date.parse(`${dates[i - 1]}T00:00:00Z`);
    const b = Date.parse(`${dates[i]}T00:00:00Z`);
    if (!isFinite(a) || !isFinite(b) || b <= a) return false;
    ecarts.push((b - a) / 86400_000);
  }
  const m = mediane(ecarts);
  return m >= 26 && m <= 40;
}

/**
 * Statistiques des periodes de `ans` annees observables dans la serie.
 *
 * Renvoie null — plutot qu'un objet a moitie rempli — quand l'historique est
 * trop court : c'est le cas normal pour un horizon de 30 ans sur un produit
 * lance en 2009, et l'interface doit pouvoir dire « on ne sait pas » au lieu
 * d'extrapoler.
 */
export function fenetresGlissantes(
  serie: PointMensuel[],
  ans: number,
  minFenetres = MIN_FENETRES,
): StatsHorizon | null {
  if (ans <= 0) return null;
  const pas = Math.round(ans * 12);
  if (serie.length <= pas) return null;

  const observations: { facteur: number; depart: string }[] = [];
  for (let i = 0; i + pas < serie.length; i++) {
    const debut = serie[i].valeur;
    const fin = serie[i + pas].valeur;
    if (!(debut > 0) || !(fin > 0)) continue;
    observations.push({ facteur: fin / debut, depart: serie[i].date });
  }
  if (observations.length < minFenetres) return null;

  observations.sort((a, b) => a.facteur - b.facteur);
  const facteurs = observations.map((o) => o.facteur);
  const pire = observations[0];
  const meilleur = observations[observations.length - 1];
  const med = mediane(facteurs);

  // Le facteur total est strictement croissant avec le rendement annualise :
  // trier par facteur suffit, inutile d'annualiser avant de classer.
  const annualise = (f: number) => (Math.pow(f, 1 / ans) - 1) * 100;

  return {
    ans,
    fenetres: observations.length,
    pireAnnualisePct: annualise(pire.facteur),
    medianAnnualisePct: annualise(med),
    meilleurAnnualisePct: annualise(meilleur.facteur),
    pireFinal100: 100 * pire.facteur,
    medianFinal100: 100 * med,
    meilleurFinal100: 100 * meilleur.facteur,
    partPositivePct:
      (facteurs.filter((f) => f > 1).length / facteurs.length) * 100,
    pireDepart: pire.depart,
    meilleurDepart: meilleur.depart,
  };
}
