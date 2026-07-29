import { useState } from "react";
import { DISCLAIMER, SIGNAL_LABELS, SIGNAL_LABELS_COURTS } from "../lib/types";
import type { Piste } from "../lib/types";
import { EXPLICATIONS } from "../lib/glossaire";
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

export default function PisteCard({
  piste,
  brokerFixedFeeEur,
  positionSizeEur,
}: Props) {
  const [explique, setExplique] = useState(false);
  const fees = computeFeeImpact(brokerFixedFeeEur, positionSizeEur);
  const isForm4 = piste.signal.startsWith("form4");
  const exp = EXPLICATIONS[piste.signal];

  return (
    <article className="bg-white rounded-xl border border-slate-200/80 p-5 space-y-4">
      {/* En-tete : le titre occupe toute la largeur, l'etiquette passe dessous
          pour ne pas comprimer le nom de l'entreprise sur un ecran etroit. */}
      <header className="space-y-2">
        <h3 className="font-semibold text-slate-800 leading-snug">
          {piste.company_name}
          {piste.ticker && (
            <span className="ml-1.5 text-slate-400 font-normal">
              {piste.ticker}
            </span>
          )}
        </h3>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span
            className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              isForm4 ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700"
            }`}
            title={SIGNAL_LABELS[piste.signal]}
          >
            {SIGNAL_LABELS_COURTS[piste.signal]}
          </span>
          <span className="text-xs text-slate-400">
            {piste.filed_at
              ? `déposé le ${new Date(piste.filed_at).toLocaleDateString("fr-FR")}`
              : new Date(piste.detected_at).toLocaleDateString("fr-FR")}
          </span>
        </div>
        {piste.sector && (
          <p className="text-xs text-slate-400">{piste.sector}</p>
        )}
      </header>

      {/* Contexte */}
      <p className="text-sm text-slate-600 leading-relaxed">{piste.contexte}</p>

      {/* Explication pedagogique, repliee par defaut pour alleger la lecture */}
      <div>
        <button
          onClick={() => setExplique(!explique)}
          className="text-xs text-sky-700 hover:text-sky-900 font-medium"
        >
          {explique ? "− Masquer l'explication" : "+ Que signifie ce signal ?"}
        </button>
        {explique && (
          <div className="mt-2.5 bg-slate-50 rounded-lg p-3.5 space-y-2.5 text-sm">
            <p className="font-medium text-slate-800">{exp.titre}</p>
            <p className="text-slate-600 leading-relaxed">{exp.cequecest}</p>
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                Ce que cela ne dit pas
              </p>
              <p className="text-slate-600 leading-relaxed">
                {exp.cequecelanedit}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Frais */}
      <div
        className={`rounded-lg px-3.5 py-3 text-sm border ${
          fees.tooSmall
            ? "bg-amber-50/60 border-amber-200/70"
            : "bg-slate-50 border-slate-200/70"
        }`}
      >
        <p className="text-slate-600">
          Sur {positionSizeEur.toFixed(0)} €, vos frais de{" "}
          {brokerFixedFeeEur.toFixed(2).replace(".", ",")} € représentent{" "}
          <strong className="text-slate-800">{formatPct(fees.feePct)}</strong>.
          Gain minimum pour les couvrir (achat + revente) :{" "}
          <strong className="text-slate-800">
            {formatPct(fees.roundTripPct)}
          </strong>
          .
        </p>
        {fees.tooSmall && (
          <p className="mt-1.5 text-amber-800">
            Au-delà de {FEE_WARNING_THRESHOLD_PCT} %, la position est
            probablement trop petite pour être rentable après frais.
          </p>
        )}
      </div>

      {/* Source */}
      <a
        href={piste.source_url}
        target="_blank"
        rel="noreferrer"
        className="block text-sm text-sky-700 hover:text-sky-900"
      >
        {piste.source_name} · voir le document officiel SEC →
      </a>

      {/* Rappel obligatoire, non masquable */}
      <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
        {DISCLAIMER}
      </p>

      <p className="text-xs text-slate-400">
        Pour investir, ouvre ton application de courtage habituelle.
      </p>
    </article>
  );
}
