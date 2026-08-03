/**
 * Exposition agregee d'un ensemble de simulations.
 *
 * Le manque le plus important releve en relisant l'outil du point de vue d'un
 * professionnel : cinq positions dont quatre sur le meme pays et la meme
 * devise ne sont pas cinq paris, c'est un seul pari repete quatre fois. Sans
 * cette vue, la diversification apparente est trompeuse — et c'est exactement
 * la maniere dont un debutant se croit prudent en ne l'etant pas.
 *
 * Rien ici n'est une recommandation : on ne dit jamais quoi acheter ni quoi
 * vendre, on decrit ce qui est deja engage.
 */

export interface LigneExposition {
  cle: string;
  libelle: string;
  montantEur: number;
  partPct: number;
  nombre: number;
}

export interface Exposition {
  totalEur: number;
  positions: number;
  parPays: LigneExposition[];
  parDevise: LigneExposition[];
  parSecteur: LigneExposition[];
  /** Part du total dont le secteur est inconnu, en pourcentage. */
  secteurInconnuPct: number;
  /** Plus grosse ligne, en pourcentage du total engage. */
  concentrationMaxPct: number;
  /** Part du total hors zone euro : ce qui subit le risque de change. */
  horsEuroPct: number;
}

/** Une position telle que l'exposition la voit. */
export interface PositionExposee {
  symbole: string;
  devise: string;
  secteur: string | null;
  montantEur: number;
}

/**
 * Pays de cotation deduit du suffixe du symbole. Ce n'est pas le pays de
 * l'entreprise mais celui de la place ou elle se negocie — c'est ce qui
 * determine la devise, les frais et la fiscalite, donc ce qui compte ici.
 */
export function paysDuSymbole(symbole: string): { code: string; libelle: string } {
  const s = symbole.toUpperCase();
  if (s.endsWith(".BR")) return { code: "BE", libelle: "🇧🇪 Belgique" };
  if (s.endsWith(".ST")) return { code: "SE", libelle: "🇸🇪 Suède" };
  if (s.endsWith(".AS")) return { code: "NL", libelle: "🇳🇱 Pays-Bas" };
  if (s.endsWith(".PA")) return { code: "FR", libelle: "🇫🇷 France" };
  if (s.endsWith(".DE")) return { code: "DE", libelle: "🇩🇪 Allemagne" };
  if (s.endsWith(".L")) return { code: "GB", libelle: "🇬🇧 Royaume-Uni" };
  if (s.endsWith(".MI")) return { code: "IT", libelle: "🇮🇹 Italie" };
  if (s.endsWith(".SW")) return { code: "CH", libelle: "🇨🇭 Suisse" };
  // Sans suffixe, Yahoo designe une place americaine.
  if (!s.includes(".")) return { code: "US", libelle: "🇺🇸 États-Unis" };
  return { code: "??", libelle: "Autre place" };
}

function agreger(
  positions: PositionExposee[],
  total: number,
  cleDe: (p: PositionExposee) => { cle: string; libelle: string } | null,
): LigneExposition[] {
  const acc = new Map<string, LigneExposition>();
  for (const p of positions) {
    const k = cleDe(p);
    if (!k) continue;
    const existant = acc.get(k.cle);
    if (existant) {
      existant.montantEur += p.montantEur;
      existant.nombre += 1;
    } else {
      acc.set(k.cle, {
        cle: k.cle,
        libelle: k.libelle,
        montantEur: p.montantEur,
        partPct: 0,
        nombre: 1,
      });
    }
  }
  const lignes = [...acc.values()];
  for (const l of lignes) l.partPct = total > 0 ? (l.montantEur / total) * 100 : 0;
  // Du plus expose au moins expose : c'est la premiere ligne qui informe.
  return lignes.sort((a, b) => b.montantEur - a.montantEur);
}

export function calculeExposition(positions: PositionExposee[]): Exposition {
  const valides = positions.filter((p) => isFinite(p.montantEur) && p.montantEur > 0);
  const totalEur = valides.reduce((s, p) => s + p.montantEur, 0);

  const parPays = agreger(valides, totalEur, (p) => {
    const { code, libelle } = paysDuSymbole(p.symbole);
    return { cle: code, libelle };
  });
  const parDevise = agreger(valides, totalEur, (p) => ({
    cle: p.devise,
    libelle: p.devise,
  }));
  const parSecteur = agreger(valides, totalEur, (p) =>
    p.secteur ? { cle: p.secteur, libelle: p.secteur } : null,
  );

  const montantSecteurConnu = valides
    .filter((p) => p.secteur)
    .reduce((s, p) => s + p.montantEur, 0);
  const horsEuro = valides
    .filter((p) => p.devise !== "EUR")
    .reduce((s, p) => s + p.montantEur, 0);
  const plusGrosse = valides.reduce((m, p) => Math.max(m, p.montantEur), 0);

  return {
    totalEur,
    positions: valides.length,
    parPays,
    parDevise,
    parSecteur,
    secteurInconnuPct:
      totalEur > 0 ? ((totalEur - montantSecteurConnu) / totalEur) * 100 : 0,
    concentrationMaxPct: totalEur > 0 ? (plusGrosse / totalEur) * 100 : 0,
    horsEuroPct: totalEur > 0 ? (horsEuro / totalEur) * 100 : 0,
  };
}

/**
 * Seuil au-dela duquel une exposition merite d'etre signalee.
 *
 * Choisi volontairement haut : sur trois ou quatre lignes, depasser 50 % sur
 * un pays est arithmetiquement inevitable, et alerter en permanence
 * reviendrait a ne plus alerter du tout. Le message qui accompagne ce seuil
 * decrit un fait, il ne prescrit aucune action.
 */
export const SEUIL_CONCENTRATION_PCT = 60;

export function concentrationsNotables(e: Exposition): string[] {
  const messages: string[] = [];
  const pays = e.parPays[0];
  if (pays && pays.partPct >= SEUIL_CONCENTRATION_PCT && e.positions > 1) {
    messages.push(
      `${pays.partPct.toFixed(0)} % de vos simulations portent sur une seule place : ${pays.libelle}.`,
    );
  }
  const devise = e.parDevise[0];
  if (
    devise &&
    devise.cle !== "EUR" &&
    devise.partPct >= SEUIL_CONCENTRATION_PCT &&
    // Sur une seule ligne, la fiche de simulation decompose deja l'effet du
    // change : le repeter en agrege n'apprend rien.
    e.positions > 1
  ) {
    messages.push(
      `${devise.partPct.toFixed(0)} % sont libellés en ${devise.cle} : le taux de change pèse autant que le cours.`,
    );
  }
  if (e.positions > 1 && e.concentrationMaxPct >= SEUIL_CONCENTRATION_PCT) {
    messages.push(
      `Votre plus grosse ligne représente ${e.concentrationMaxPct.toFixed(0)} % du total engagé.`,
    );
  }
  return messages;
}
