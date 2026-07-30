import { useState } from "react";
import {
  DISCLAIMER,
  LIMITES_DONNEE,
  SIGNAL_LABELS,
  SIGNAL_LABELS_COURTS,
} from "../lib/types";
import type { Piste } from "../lib/types";
import { EXPLICATIONS } from "../lib/glossaire";
import { computeFeeImpact, FEE_WARNING_THRESHOLD_PCT } from "../lib/fees";
import { ACCENTS, CARTE } from "../lib/theme";
import AchatCourtierButton from "./AchatCourtierButton";

interface Props {
  piste: Piste;
  brokerFixedFeeEur: number;
  positionSizeEur: number;
  transactionTaxPct?: number;
  onSimuler?: () => void;
}

function formatPct(v: number): string {
  if (!isFinite(v)) return "—";
  return `${v.toFixed(2).replace(".", ",")} %`;
}

export default function PisteCard({
  piste,
  brokerFixedFeeEur,
  positionSizeEur,
  transactionTaxPct = 0,
  onSimuler,
}: Props) {
  const [explique, setExplique] = useState(false);
  const fees = computeFeeImpact(
    brokerFixedFeeEur,
    positionSizeEur,
    transactionTaxPct,
  );
  // Le regulateur qui a publie la declaration : il change selon le pays, et la
  // fiche doit dire lequel plutot qu'un vague « Europe ».
  const regulateur = piste.source_url.includes("fi.se")
    ? { nom: "Finansinspektionen", drapeau: "🇸🇪" }
    : piste.signal.startsWith("mar")
      ? { nom: "FSMA", drapeau: "🇧🇪" }
      : { nom: "SEC", drapeau: "🇺🇸" };
  const accent = ACCENTS[piste.signal];
  const exp = EXPLICATIONS[piste.signal];

  return (
    <article className={`${CARTE} overflow-hidden`}>
      {/* Filet colore : la nature du signal se voit avant d'etre lue. */}
      <div className={`h-1 ${accent.barre}`} />
      <div className="p-5 space-y-4">
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
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${accent.pastille}`}
              title={SIGNAL_LABELS[piste.signal]}
            >
              <span className="mr-1" aria-hidden>
                {accent.icone}
              </span>
              {SIGNAL_LABELS_COURTS[piste.signal]}
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">
              {regulateur.drapeau} {regulateur.nom}
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
            className={`text-xs font-medium hover:underline ${accent.texte}`}
          >
            {explique ? "− Masquer l'explication" : "+ Que signifie ce signal ?"}
          </button>
          {explique && (
            <div
              className={`mt-2.5 rounded-xl border p-4 space-y-2.5 text-sm ${accent.fond}`}
            >
              <p className="font-medium text-slate-800">{exp.titre}</p>
              <p className="text-slate-600 leading-relaxed">{exp.cequecest}</p>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-1">
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
          className={`rounded-xl px-4 py-3 text-sm border ${
            fees.tooSmall
              ? "bg-amber-50 border-amber-200/70"
              : "bg-slate-50 border-slate-200/70"
          }`}
        >
          <p className="text-slate-600">
            Sur {positionSizeEur.toFixed(0)} €, vos frais de{" "}
            {brokerFixedFeeEur.toFixed(2).replace(".", ",")} €
            {transactionTaxPct > 0 &&
              ` plus la taxe de ${transactionTaxPct.toString().replace(".", ",")} %`}{" "}
            représentent{" "}
            <strong className="text-amber-700">{formatPct(fees.feePct)}</strong>.
            Gain minimum pour les couvrir (achat + revente) :{" "}
            <strong className="text-amber-700">
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

        {/* Entrainement fictif d'abord, achat reel ensuite : l'ordre des deux
            boutons rappelle lequel engage vraiment de l'argent. */}
        {onSimuler && (
          <button
            onClick={onSimuler}
            className="w-full rounded-xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-sm font-medium text-violet-800 hover:bg-violet-100 transition"
          >
            🎓 S'entraîner sur cette société — achat fictif, sans argent réel
          </button>
        )}
        <AchatCourtierButton nom={piste.company_name} ticker={piste.ticker} />

        {/* Source */}
        <a
          href={piste.source_url}
          target="_blank"
          rel="noreferrer"
          className="block text-sm text-indigo-700 hover:text-indigo-900 hover:underline"
        >
          {piste.source_name} · voir la déclaration officielle {regulateur.nom} →
        </a>

        {/* Rappel obligatoire, non masquable */}
        <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
          {LIMITES_DONNEE[piste.signal]} {DISCLAIMER}
        </p>

        <p className="text-xs text-slate-400">
          Pour investir, utilise le bouton ci-dessus ou ton application de
          courtage habituelle.
        </p>
      </div>
    </article>
  );
}
