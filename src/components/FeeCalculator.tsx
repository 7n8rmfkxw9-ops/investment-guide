import { computeFees, formatPct, FEE_WARNING_THRESHOLD_PCT } from "../lib/fees";

interface Props {
  brokerFee: number;
  amount: number;
}

/**
 * Coût de transaction estimé vs taille de position envisagée.
 * Les montants (frais du broker, ticket envisagé) sont réglés globalement
 * dans l'en-tête du dashboard et s'appliquent à toutes les fiches.
 */
export default function FeeCalculator({ brokerFee, amount }: Props) {
  const fees = computeFees(brokerFee, amount);
  if (!fees) {
    return (
      <p className="text-sm text-slate-500">
        Renseigne un montant envisagé et les frais de ton broker pour estimer le poids des frais.
      </p>
    );
  }
  return (
    <div className="space-y-1 text-sm">
      <p className="text-slate-700">
        Frais estimés : {brokerFee.toLocaleString("fr-FR")} € / {amount.toLocaleString("fr-FR")} € ={" "}
        <span className="font-medium">{formatPct(fees.singleOrderPct)}</span> par ordre, soit{" "}
        <span className="font-medium">{formatPct(fees.roundTripPct)}</span> aller-retour. Le titre
        doit gagner au moins <span className="font-medium">{formatPct(fees.breakEvenPct)}</span>{" "}
        juste pour couvrir les frais.
      </p>
      {fees.tooSmall && (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 font-medium text-red-800">
          ⚠ Position probablement trop petite pour être rentable après frais (frais &gt;{" "}
          {FEE_WARNING_THRESHOLD_PCT} % par ordre).
        </p>
      )}
    </div>
  );
}
