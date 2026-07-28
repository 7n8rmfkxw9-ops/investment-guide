import { useEffect, useState } from "react";
import { fetchLeads } from "../lib/data";
import type { Lead } from "../lib/types";
import { SIGNAL_LABELS } from "../lib/types";

/**
 * Historique des pistes passées et de ce qui s'est passé ensuite.
 * Volontairement neutre : succès et échecs sont affichés à l'identique,
 * sans tri ni mise en avant des résultats positifs.
 */
export default function History() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeads()
      .then((all) => setLeads(all.filter((l) => l.outcome_note)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">Chargement…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Trace des pistes passées avec ce qui s'est réellement passé ensuite — les échecs comme
        les succès, pour garder une vue honnête de la fiabilité réelle de l'outil dans le temps.
      </p>
      {leads.length === 0 ? (
        <p className="text-slate-500">Aucune piste archivée pour l'instant.</p>
      ) : (
        <ul className="space-y-3">
          {leads.map((l) => (
            <li key={l.id} className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="font-semibold text-slate-900">{l.company}</span>
                {l.ticker && <span className="font-mono text-slate-500">{l.ticker}</span>}
                <span className="text-slate-500">{SIGNAL_LABELS[l.signal_type]}</span>
                <span className="text-slate-400">
                  {new Date(l.filed_at).toLocaleDateString("fr-FR")}
                </span>
              </div>
              <p className="mt-1 text-slate-700">{l.outcome_note}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
