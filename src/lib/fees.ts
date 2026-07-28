/**
 * Calcul de rentabilité minimale : part des frais fixes de courtage dans le
 * montant investi. Un aller-retour coûte deux fois les frais fixes.
 */

/** Seuil au-delà duquel la position est probablement trop petite pour être rentable après frais. */
export const FEE_WARNING_THRESHOLD_PCT = 3;

export interface FeeResult {
  /** (frais fixes / montant investi) x 100 — pour un seul ordre. */
  singleOrderPct: number;
  /** Frais aller-retour (achat + vente) en % du montant investi. */
  roundTripPct: number;
  /** Hausse minimale nécessaire pour couvrir un aller-retour de frais. */
  breakEvenPct: number;
  tooSmall: boolean;
}

export function computeFees(brokerFixedFee: number, amountInvested: number): FeeResult | null {
  if (!(brokerFixedFee >= 0) || !(amountInvested > 0)) return null;
  const singleOrderPct = (brokerFixedFee / amountInvested) * 100;
  const roundTripPct = singleOrderPct * 2;
  return {
    singleOrderPct,
    roundTripPct,
    breakEvenPct: roundTripPct,
    tooSmall: singleOrderPct > FEE_WARNING_THRESHOLD_PCT,
  };
}

export function formatPct(value: number): string {
  return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} %`;
}
