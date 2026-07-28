import { DISCLAIMER, SIGNAL_LABELS } from "../lib/types";
import type { Piste } from "../lib/types";
import { computeFeeImpact, FEE_WARNING_THRESHOLD_PCT } from "../lib/fees";

interface Props {
  piste: Piste;
  brokerFixedFeeEur: number;
  positionSizeEur: number;
}

function formatPct(v: number): string {
  if (!isFinite(v)) return "—";
  return `${v.toFixed(2).replace(".", ",")} %`;
}

export default function PisteCard({ piste, brokerFixedFeeEur, positionSizeEur }: Props) {
  const fees = computeFeeImpact(brokerFixedFeeEur, positionSizeEur);
  const isForm4 = piste.signal.startsWith("form4");

  return (
    <article className="bg-white rounded-lg shadow-sm border border-slate-200 p-5 space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">
            {piste.company_name}
            {piste.ticker && (
              <span className="ml-2 text-slate-500 font-normal">({piste.ticker})</span>
            )}
          </h3>
          <p className="text-xs text-slate-500">
            Signal détecté le{" "}
            {new Date(piste.detected_at).toLocaleDateString("fr-FR")}
            {piste.filed_at &&
              ` — déposé à la SEC le ${new Date(piste.filed_at).toLocaleDateString("fr-FR")}`}
            {piste.sector && ` — secteur : ${piste.sector}`}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs px-2 py-1 rounded-full ${
            isForm4
              ? "bg-amber-100 text-amber-800"
              : "bg-sky-100 text-sky-800"
          }`}
          title={
            isForm4
              ? "Donnée plus fraîche (publiée sous 2 jours ouvrables)"
              : "Donnée trimestrielle, jusqu'à 45 jours de retard"
          }
        >
          {SIGNAL_LABELS[piste.signal]}
        </span>
      </header>

      <dl className="text-sm space-y-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Source</dt>
          <dd>
            {piste.source_name} —{" "}
            <a
              href={piste.source_url}
              target="_blank"
              rel="noreferrer"
              className="text-sky-700 underline"
            >
              filing SEC original
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">Contexte</dt>
          <dd className="text-slate-700">{piste.contexte}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Coût de transaction estimé vs taille de position
          </dt>
          <dd className="text-slate-700">
            Frais fixes {brokerFixedFeeEur.toFixed(2).replace(".", ",")} € sur une
            position de {positionSizeEur.toFixed(0)} € : {formatPct(fees.feePct)} à
            l'achat, soit une rentabilité minimale d'environ{" "}
            {formatPct(fees.roundTripPct)} pour couvrir un aller-retour (achat +
            vente).
            {fees.tooSmall && (
              <span className="block mt-1 text-red-700 font-medium">
                ⚠ Frais &gt; {FEE_WARNING_THRESHOLD_PCT} % : position probablement
                trop petite pour être rentable après frais.
              </span>
            )}
          </dd>
        </div>
      </dl>

      {/* Niveau d'incertitude — obligatoire et non masquable */}
      <div className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-3">
        <span className="font-medium">Niveau d'incertitude : </span>
        {DISCLAIMER}
      </div>

      <footer className="text-xs text-slate-500">
        Pour investir, ouvre ton application de courtage habituelle.
      </footer>
    </article>
  );
}
