// Logique pure du service de cotations : tout ce qui interprete la reponse du
// fournisseur de cours, sans faire d'appel reseau.
//
// Meme raisonnement que _shared/parsing.ts : le bug reel trouve ici (le cours
// de reference systematiquement absent dans `palmares`, parce que la fonction
// `historique` ne le calcule pas elle-meme) etait invisible tant que rien ne
// verrouillait le comportement. Ces fonctions ne dependent que de leurs
// arguments, donc un test peut leur passer une reponse Yahoo reelle copiee
// telle quelle, sans reseau.

/** Reponse decoupee : dates ISO et cours de cloture alignes index par index. */
export interface SerieCours {
  meta: Record<string, unknown>;
  dates: string[];
  cloture: number[];
}

/**
 * Extrait la serie d'une reponse du fournisseur de cours.
 *
 * Les jours feries et suspensions de cotation laissent des trous (`null`)
 * dans la serie de clotures : on les ecarte au lieu de les propager jusqu'au
 * calcul, ou ils produiraient des pourcentages absurdes. Ecarter un trou
 * decale aussi la date correspondante — d'ou l'ecriture en deux tableaux
 * construits ensemble plutot qu'un filtre applique aux clotures seules.
 */
export function extraireSerie(reponse: Record<string, unknown>): SerieCours {
  const chart = reponse.chart as Record<string, unknown> | undefined;
  const res = (chart?.result as Record<string, unknown>[] | undefined)?.[0];
  if (!res) {
    const err = chart?.error as Record<string, unknown> | undefined;
    throw new Error(String(err?.description ?? "symbole introuvable"));
  }
  const meta = (res.meta ?? {}) as Record<string, unknown>;
  const ts = (res.timestamp as number[] | undefined) ?? [];
  const quote = (res.indicators as Record<string, unknown> | undefined)?.quote as
    | Record<string, unknown>[]
    | undefined;
  const closeBrut = (quote?.[0]?.close as (number | null)[] | undefined) ?? [];
  const dates: string[] = [];
  const cloture: number[] = [];
  for (let i = 0; i < ts.length; i++) {
    const c = closeBrut[i];
    if (typeof c !== "number" || !isFinite(c)) continue;
    dates.push(new Date(ts[i] * 1000).toISOString().slice(0, 10));
    cloture.push(c);
  }
  return { meta, dates, cloture };
}

/**
 * Index de la derniere seance a la date demandee ou avant — jamais apres.
 *
 * Les marches ferment le week-end et les jours feries : demander le cours du
 * samedi doit renvoyer celui du vendredi. Retenir une seance *posterieure*
 * reviendrait a simuler un achat a un cours qui n'existait pas encore le jour
 * de la decision, ce qui fausserait tout le bilan retrospectif.
 *
 * Renvoie -1 si aucune seance connue n'est assez ancienne.
 */
export function choisirSeance(dates: string[], dateCible: string): number {
  let idx = -1;
  for (let i = 0; i < dates.length; i++) {
    if (dates[i] <= dateCible) idx = i;
  }
  return idx;
}

/**
 * Fenetre a demander au fournisseur pour retrouver le cours d'une date.
 * On remonte 12 jours en arriere : assez pour franchir un week-end prolonge
 * ou une serie de jours feries, sans tirer un historique inutilement large.
 */
export function fenetreHistorique(date: string): { debut: number; fin: number } {
  const cible = new Date(`${date}T00:00:00Z`);
  return {
    debut: Math.floor((cible.getTime() - 12 * 86400_000) / 1000),
    fin: Math.floor((cible.getTime() + 86400_000) / 1000),
  };
}

/**
 * Dernier cours connu : le cours temps reel publie par la place si present,
 * sinon la derniere cloture de la serie. Renvoie null si ni l'un ni l'autre
 * n'est exploitable — un cours nul ou negatif n'existe pas et signale une
 * reponse malformee plutot qu'un titre a zero.
 */
export function prixCourant(
  meta: Record<string, unknown>,
  cloture: number[],
): number | null {
  const prix = Number(meta.regularMarketPrice ?? cloture[cloture.length - 1]);
  return isFinite(prix) && prix > 0 ? prix : null;
}

/** Devise de cotation, en majuscules ; euro par defaut. */
export function deviseDe(meta: Record<string, unknown>): string {
  return String(meta.currency ?? "EUR").toUpperCase();
}

/**
 * Conversion d'un prix en euros. `tauxEur` est le nombre d'unites de la
 * devise pour 1 EUR : diviser, donc, jamais multiplier. Une erreur de sens
 * ici passerait inapercue sur un titre en dollars (taux proche de 1) mais
 * ferait un facteur 120 sur une couronne suedoise.
 */
export function enEuros(prix: number, tauxEur: number): number {
  return prix / (tauxEur || 1);
}

/**
 * Variation d'un cours entre deux dates, decomposee.
 *
 * `cours` isole le mouvement du titre dans sa propre devise ; `total` inclut
 * l'effet du change ; `change` est la difference entre les deux. Un titre
 * peut monter dans sa devise et faire perdre de l'argent une fois reconverti,
 * et l'utilisateur doit voir les deux effets separement.
 */
export function variationDecomposee(
  prixEntree: number,
  tauxEntree: number,
  prixActuel: number,
  tauxActuel: number,
): { coursPct: number; totalPct: number; changePct: number } {
  const coursPct = (prixActuel / prixEntree - 1) * 100;
  const totalPct =
    (enEuros(prixActuel, tauxActuel) / enEuros(prixEntree, tauxEntree) - 1) * 100;
  return { coursPct, totalPct, changePct: totalPct - coursPct };
}
