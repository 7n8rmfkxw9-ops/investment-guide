import { useEffect, useMemo, useState } from "react";
import LeadCard from "../components/LeadCard";
import { fetchLeads, isDemoMode } from "../lib/data";
import type { Lead, SignalType } from "../lib/types";
import { SIGNAL_LABELS, isForm4 } from "../lib/types";

type SortKey = "date" | "signal";

interface Props {
  brokerFee: number;
  amount: number;
}

export default function Dashboard({ brokerFee, amount }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("signal");
  const [signalFilter, setSignalFilter] = useState<SignalType | "all">("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [managerFilter, setManagerFilter] = useState<string>("all");

  useEffect(() => {
    fetchLeads()
      .then(setLeads)
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => setLoading(false));
  }, []);

  const sectors = useMemo(
    () => [...new Set(leads.map((l) => l.sector).filter((s): s is string => !!s))].sort(),
    [leads],
  );
  const managers = useMemo(
    () => [...new Set(leads.map((l) => l.manager_name).filter((m): m is string => !!m))].sort(),
    [leads],
  );

  const visible = useMemo(() => {
    let list = leads.filter(
      (l) =>
        (signalFilter === "all" || l.signal_type === signalFilter) &&
        (sectorFilter === "all" || l.sector === sectorFilter) &&
        (managerFilter === "all" || l.manager_name === managerFilter),
    );
    list = [...list].sort((a, b) => {
      if (sortKey === "signal") {
        // Form 4 d'abord (donnée plus fraîche), puis par date décroissante.
        const fa = isForm4(a.signal_type) ? 0 : 1;
        const fb = isForm4(b.signal_type) ? 0 : 1;
        if (fa !== fb) return fa - fb;
      }
      return b.filed_at.localeCompare(a.filed_at);
    });
    return list;
  }, [leads, sortKey, signalFilter, sectorFilter, managerFilter]);

  if (loading) return <p className="text-slate-500">Chargement des pistes…</p>;
  if (error) return <p className="text-red-700">Erreur de chargement : {error}</p>;

  return (
    <div className="space-y-4">
      {isDemoMode && (
        <p className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          Mode démo : Supabase n'est pas configuré, les pistes affichées sont des exemples
          illustratifs. Renseigne <code>.env</code> pour voir tes vraies données.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Tri</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-slate-300 px-2 py-1"
          >
            <option value="signal">Type de signal (Form 4 d'abord)</option>
            <option value="date">Date de dépôt</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Type de signal</span>
          <select
            value={signalFilter}
            onChange={(e) => setSignalFilter(e.target.value as SignalType | "all")}
            className="rounded-md border border-slate-300 px-2 py-1"
          >
            <option value="all">Tous</option>
            {(Object.keys(SIGNAL_LABELS) as SignalType[]).map((s) => (
              <option key={s} value={s}>
                {SIGNAL_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Secteur</span>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1"
          >
            <option value="all">Tous</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-slate-500">Gestionnaire</span>
          <select
            value={managerFilter}
            onChange={(e) => setManagerFilter(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1"
          >
            <option value="all">Tous</option>
            {managers.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="text-slate-500">Aucune piste ne correspond aux filtres.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map((lead) => (
            <LeadCard key={lead.id} lead={lead} brokerFee={brokerFee} amount={amount} />
          ))}
        </div>
      )}
    </div>
  );
}
