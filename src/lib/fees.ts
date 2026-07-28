/**
 * Calcul de l'impact des frais fixes du courtier sur une petite position.
 * Formule : (frais fixes / montant investi) x 100 = % de frais a l'achat.
 * La rentabilite minimale pour couvrir un aller-retour (achat + vente)
 * est de 2 x ce pourcentage.
 */
export interface FeeImpact {
  feePct: number;
  roundTripPct: number;
  tooSmall: boolean;
}

export const FEE_WARNING_THRESHOLD_PCT = 3;

export function computeFeeImpact(
  brokerFixedFeeEur: number,
  positionSizeEur: number,
): FeeImpact {
  if (positionSizeEur <= 0) {
    return { feePct: Infinity, roundTripPct: Infinity, tooSmall: true };
  }
  const feePct = (brokerFixedFeeEur / positionSizeEur) * 100;
  return {
    feePct,
    roundTripPct: feePct * 2,
    tooSmall: feePct > FEE_WARNING_THRESHOLD_PCT,
  };
}
