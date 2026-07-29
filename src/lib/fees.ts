/**
 * Impact des frais sur une petite position.
 *
 * Deux composantes :
 *  - les frais fixes du courtier, preleves a chaque ordre ;
 *  - une taxe proportionnelle sur chaque transaction. En Belgique, la taxe
 *    sur les operations de bourse (TOB) s'applique a l'achat ET a la vente.
 *
 * La rentabilite minimale correspond a un aller-retour complet : frais et
 * taxe a l'achat, puis a la revente.
 */
export interface FeeImpact {
  /** Cout total a l'achat, en pourcentage du montant investi. */
  feePct: number;
  /** Gain minimal pour couvrir l'aller-retour, en pourcentage. */
  roundTripPct: number;
  /** Vrai si le cout a l'achat depasse le seuil d'alerte. */
  tooSmall: boolean;
}

export const FEE_WARNING_THRESHOLD_PCT = 3;

/** Taux de TOB le plus courant en Belgique, a ajuster dans les reglages. */
export const DEFAULT_TOB_PCT = 0.12;

export function computeFeeImpact(
  brokerFixedFeeEur: number,
  positionSizeEur: number,
  transactionTaxPct = 0,
): FeeImpact {
  if (positionSizeEur <= 0) {
    return { feePct: Infinity, roundTripPct: Infinity, tooSmall: true };
  }
  const feePct =
    (brokerFixedFeeEur / positionSizeEur) * 100 + transactionTaxPct;
  return {
    feePct,
    roundTripPct: feePct * 2,
    tooSmall: feePct > FEE_WARNING_THRESHOLD_PCT,
  };
}
