/**
 * Impact des frais sur une petite position.
 *
 * Trois composantes :
 *  - les frais fixes du courtier, preleves a chaque ordre ;
 *  - une taxe proportionnelle sur chaque transaction. En Belgique, la taxe
 *    sur les operations de bourse (TOB) s'applique a l'achat ET a la vente ;
 *  - la commission de change du courtier, prelevee a chaque conversion des
 *    que le titre n'est pas cote en euros.
 *
 * La rentabilite minimale correspond a un aller-retour complet : frais, taxe
 * et change a l'achat, puis a la revente.
 */
export interface FeeImpact {
  /** Cout total a l'achat, en pourcentage du montant investi. */
  feePct: number;
  /** Gain minimal pour couvrir l'aller-retour, en pourcentage. */
  roundTripPct: number;
  /** Vrai si le cout a l'achat depasse le seuil d'alerte. */
  tooSmall: boolean;
  /** Part du cout d'achat due a la seule conversion de devise, en points. */
  fxPct: number;
}

export const FEE_WARNING_THRESHOLD_PCT = 3;

/** Taux de TOB le plus courant en Belgique, a ajuster dans les reglages. */
export const DEFAULT_TOB_PCT = 0.12;

/**
 * Commission de change par defaut, en pourcentage du montant converti.
 *
 * Ordre de grandeur courant chez les courtiers accessibles depuis la
 * Belgique. Elle est souvent noyee dans la grille tarifaire plutot
 * qu'affichee comme une ligne de frais, alors qu'elle se paie a l'aller ET
 * au retour : sur 100 EUR investis hors zone euro, elle pese autant qu'un
 * demi-frais d'ordre. A verifier chez son propre courtier.
 */
export const DEFAULT_FX_SPREAD_PCT = 0.25;

export function computeFeeImpact(
  brokerFixedFeeEur: number,
  positionSizeEur: number,
  transactionTaxPct = 0,
  /** Commission de change ; ignoree si le titre est deja cote en euros. */
  fxSpreadPct = 0,
  devise = "EUR",
): FeeImpact {
  if (positionSizeEur <= 0) {
    return { feePct: Infinity, roundTripPct: Infinity, tooSmall: true, fxPct: 0 };
  }
  // Un titre cote en euros ne passe par aucune conversion : lui appliquer une
  // commission de change surestimerait le cout et fausserait la comparaison
  // entre une action belge et une action americaine.
  const fxPct = devise === "EUR" ? 0 : fxSpreadPct;
  const feePct =
    (brokerFixedFeeEur / positionSizeEur) * 100 + transactionTaxPct + fxPct;
  return {
    feePct,
    roundTripPct: feePct * 2,
    tooSmall: feePct > FEE_WARNING_THRESHOLD_PCT,
    fxPct,
  };
}
