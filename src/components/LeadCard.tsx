import type { Lead } from "../lib/types";
import { SIGNAL_LABELS, isForm4 } from "../lib/types";
import DisclaimerNote from "./DisclaimerNote";
import FeeCalculator from "./FeeCalculator";

interface Props {
  lead: Lead;
  brokerFee: number;
  amount: number;
}

export default function LeadCard({ lead, brokerFee, amount }: Props) {
  const form4 = isForm4(lead.signal_type);
  return (
    <article className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">
          {lead.company}
          {lead.ticker && <span className="ml-2 font-mono text-sm text-slate-500">{lead.ticker}</span>}
        </h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
            form4 ? "bg-sky-100 text-sky-800" : "bg-slate-100 text-slate-700"
          }`}
        >
          {SIGNAL_LABELS[lead.signal_type]}
          {form4 && " · donnée fraîche (≤ 2 j ouvrés)"}
        </span>
      </header>

      <dl className="space-y-2 text-sm text-slate-700">
        <div>
          <dt className="font-medium text-slate-500">Contexte</dt>
          <dd>{lead.context}</dd>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          {lead.manager_name && (
            <div>
              <dt className="inline font-medium text-slate-500">Gestionnaire : </dt>
              <dd className="inline">{lead.manager_name}</dd>
            </div>
          )}
          {lead.sector && (
            <div>
              <dt className="inline font-medium text-slate-500">Secteur : </dt>
              <dd className="inline">{lead.sector}</dd>
            </div>
          )}
          <div>
            <dt className="inline font-medium text-slate-500">Déposé le : </dt>
            <dd className="inline">{new Date(lead.filed_at).toLocaleDateString("fr-FR")}</dd>
          </div>
          <div>
            <dt className="inline font-medium text-slate-500">Source : </dt>
            <dd className="inline">
              <a
                href={lead.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline"
              >
                filing SEC EDGAR
              </a>
            </dd>
          </div>
        </div>
      </dl>

      <div>
        <h4 className="mb-1 text-sm font-medium text-slate-500">Niveau d'incertitude</h4>
        <DisclaimerNote />
      </div>

      <div>
        <h4 className="mb-1 text-sm font-medium text-slate-500">
          Coût de transaction vs taille de position
        </h4>
        <FeeCalculator brokerFee={brokerFee} amount={amount} />
      </div>

      {lead.outcome_note && (
        <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600">
          <span className="font-medium">Ce qui s'est passé ensuite : </span>
          {lead.outcome_note}
        </div>
      )}

      {/* Pas de bouton d'achat, pas de lien profond : lien texte simple, volontairement. */}
      <footer className="border-t border-slate-100 pt-2 text-sm text-slate-500">
        Pour investir, ouvre ton application de courtage habituelle.
      </footer>
    </article>
  );
}
