import { useId, useState } from "react";
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

/**
 * Fiche d'une piste.
 *
 * Mesure avant refonte : une seule fiche depassait la hauteur d'un ecran de
 * telephone. Impossible de parcourir la liste — il fallait tout lire. Le
 * contenu n'a pas ete supprime, il a ete hierarchise : ce qui sert a decider
 * si la piste merite attention reste visible, le detail passe derriere un
 * repli.
 *
 * Deux exigences ne sont pas negociables et survivent telles quelles :
 *  - le calcul de rentabilite minimale reste affiche, pas seulement
 *    accessible : la ligne de synthese est toujours lisible, le repli
 *    n'ajoute que l'explication du calcul ;
 *  - l'avertissement final est present sur chaque fiche et non masquable. Il
 *    est compose plus discretement, ce qui n'est pas la meme chose que le
 *    cacher.
 *
 * Le poids visuel des deux actions a ete inverse. « S'entrainer » est
 * l'action principale ; l'achat chez un courtier est un lien discret. Le
 * vert a ete retire de ce dernier : c'etait la couleur du feu vert sur le
 * seul geste qui engage de l'argent reel, et cela contredisait le principe
 * fondateur de l'outil.
 */

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
  const idExplication = useId();
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
      <div className={`h-1 ${accent.barre}`} aria-hidden />
      <div className="p-4 sm:p-5 space-y-3">
        <header className="space-y-2">
          <h3 className="font-semibold text-slate-800 leading-snug">
            {piste.company_name}
            {piste.ticker && (
              <span className="ml-1.5 text-slate-500 font-normal">
                {piste.ticker}
              </span>
            )}
          </h3>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${accent.pastille}`}
            >
              <span className="mr-1" aria-hidden>
                {accent.icone}
              </span>
              {/* Le libelle court tient dans la pastille ; le libelle complet
                  est lu par les lecteurs d'ecran. L'ancien `title` ne servait
                  ni au tactile, ou il n'apparait jamais, ni a VoiceOver. */}
              <span aria-hidden>{SIGNAL_LABELS_COURTS[piste.signal]}</span>
              <span className="sr-only">
                Type de signal : {SIGNAL_LABELS[piste.signal]}
              </span>
            </span>
            <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-700">
              <span aria-hidden>{regulateur.drapeau}</span> {regulateur.nom}
            </span>
            <span className="text-xs text-slate-500">
              {piste.filed_at
                ? `déposé le ${new Date(piste.filed_at).toLocaleDateString("fr-BE")}`
                : new Date(piste.detected_at).toLocaleDateString("fr-BE")}
            </span>
          </div>
          {piste.sector && (
            <p className="text-xs text-slate-500">{piste.sector}</p>
          )}
        </header>

        <p className="text-sm text-slate-600 leading-relaxed">{piste.contexte}</p>

        {/* Rentabilite minimale : la synthese reste visible sans clic, parce
            qu'elle fait partie de ce qu'une fiche doit toujours dire. Seule
            l'explication du calcul se replie. */}
        <p
          className={`text-sm rounded-xl px-3.5 py-2.5 border ${
            fees.tooSmall
              ? "bg-amber-50 border-amber-200/70 text-amber-900"
              : "bg-slate-50 border-slate-200/70 text-slate-700"
          }`}
        >
          {fees.tooSmall && (
            <span className="mr-1" aria-hidden>
              ⚠
            </span>
          )}
          Il faudrait gagner{" "}
          <strong>{formatPct(fees.roundTripPct)}</strong> pour couvrir les frais
          d'un aller-retour sur {positionSizeEur.toFixed(0)} €.
        </p>

        {/* Un seul repli pour tout le detail : deux boutons cote a cote
            auraient rendu la fiche aussi chargee qu'avant. */}
        <div>
          <button
            type="button"
            onClick={() => setExplique(!explique)}
            aria-expanded={explique}
            aria-controls={idExplication}
            className={`text-sm font-medium min-h-[44px] -my-2 py-2 hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${accent.texte}`}
          >
            {explique ? "− Masquer le détail" : "+ Ce que signifie ce signal, et le détail des frais"}
          </button>
          {explique && (
            <div
              id={idExplication}
              className={`mt-2.5 rounded-xl border p-4 space-y-3 text-sm ${accent.fond}`}
            >
              <p className="font-medium text-slate-800">{exp.titre}</p>
              <p className="text-slate-600 leading-relaxed">{exp.cequecest}</p>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-600 mb-1">
                  Ce que cela ne dit pas
                </p>
                <p className="text-slate-600 leading-relaxed">
                  {exp.cequecelanedit}
                </p>
              </div>
              <div className="border-t border-slate-200/70 pt-3">
                <p className="text-xs uppercase tracking-wide text-slate-600 mb-1">
                  Détail des frais
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Sur {positionSizeEur.toFixed(0)} €, vos frais de{" "}
                  {brokerFixedFeeEur.toFixed(2).replace(".", ",")} €
                  {transactionTaxPct > 0 &&
                    ` plus la taxe de ${transactionTaxPct.toString().replace(".", ",")} %`}{" "}
                  représentent {formatPct(fees.feePct)} à l'achat, à payer une
                  seconde fois à la revente.
                  {fees.tooSmall &&
                    ` Au-delà de ${FEE_WARNING_THRESHOLD_PCT} %, la position est probablement trop petite pour être rentable après frais.`}
                </p>
              </div>
              <p className="text-xs">
                <a
                  href={piste.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-700 hover:text-indigo-900 underline decoration-indigo-300"
                >
                  {piste.source_name} · déclaration officielle {regulateur.nom}
                  <span className="sr-only"> (nouvel onglet)</span> →
                </a>
              </p>
            </div>
          )}
        </div>

        {/* Action principale : s'entrainer. L'achat reel est un lien discret,
            volontairement moins saillant — c'est le seul geste irreversible. */}
        {onSimuler && (
          <button
            type="button"
            onClick={onSimuler}
            className="w-full min-h-[44px] rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
          >
            S'entraîner sur cette société
            <span className="block text-xs font-normal text-indigo-100">
              achat fictif, sans argent réel
            </span>
          </button>
        )}

        <AchatCourtierButton nom={piste.company_name} ticker={piste.ticker} />

        {/* Rappel obligatoire, non masquable. */}
        <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
          {LIMITES_DONNEE[piste.signal]} {DISCLAIMER}
        </p>
      </div>
    </article>
  );
}
