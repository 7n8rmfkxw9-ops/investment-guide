import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Manager } from "../lib/types";

interface Holding {
  cusip: string;
  name: string;
  shares: number;
  value_kusd: number;
}

interface Snapshot {
  id: string;
  manager_id: string;
  period_of_report: string;
  filed_at: string | null;
  holdings: Holding[];
}

/**
 * Vue "Positions" : l'etat des portefeuilles 13F stockes, trimestre par
 * trimestre, pour suivre l'evolution d'une position dans le temps.
 * Donnees brutes declarees a la SEC — aucune interpretation.
 */
export default function PositionsPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("managers")
      .select("*")
      .order("name")
      .then(({ data }) => {
        const m = (data as Manager[]) ?? [];
        setManagers(m);
        if (m.length > 0) setSelected(m[0].id);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!selected) {
      setSnapshots([]);
      return;
    }
    supabase
      .from("holdings_snapshots")
      .select("*")
      .eq("manager_id", selected)
      .order("period_of_report", { ascending: false })
      .limit(6)
      .then(({ data }) => setSnapshots((data as Snapshot[]) ?? []));
  }, [selected]);

  if (loading) return <p className="text-sm text-slate-500">Chargement…</p>;

  if (managers.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Aucun gestionnaire suivi. Ajoutez-en dans l'onglet Configuration.
      </p>
    );
  }

  // Colonnes = trimestres (du plus ancien au plus recent), lignes = titres
  // (tries par valeur du trimestre le plus recent), plafonnees a 40.
  const periods = [...snapshots]
    .sort((a, b) => a.period_of_report.localeCompare(b.period_of_report))
    .map((s) => s.period_of_report);
  const byPeriod = new Map(
    snapshots.map((s) => [
      s.period_of_report,
      new Map(s.holdings.map((h) => [h.cusip, h])),
    ]),
  );
  const latest = snapshots[0];
  const rows = latest
    ? [...latest.holdings]
        .sort((a, b) => b.value_kusd - a.value_kusd)
        .slice(0, 40)
    : [];

  function fmtShares(n: number | undefined): string {
    if (n === undefined) return "—";
    return n.toLocaleString("fr-FR");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="border rounded px-2 py-1 text-sm bg-white"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-500">
          Positions déclarées en 13F, par trimestre (nombre de titres). Rappel :
          positions longues US uniquement, publiées avec jusqu'à 45 jours de
          retard.
        </span>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucun 13F stocké pour ce gestionnaire — lancez une synchronisation
          depuis l'onglet Pistes récentes.
        </p>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto">
          <table className="text-sm w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b">
                <th className="px-3 py-2">Titre</th>
                {periods.map((p) => (
                  <th key={p} className="px-3 py-2 whitespace-nowrap">
                    {new Date(p).toLocaleDateString("fr-FR", {
                      month: "short",
                      year: "numeric",
                    })}
                  </th>
                ))}
                <th className="px-3 py-2 whitespace-nowrap">
                  Valeur (k$, dernier trim.)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((h) => (
                <tr key={h.cusip}>
                  <td className="px-3 py-2">{h.name}</td>
                  {periods.map((p) => (
                    <td key={p} className="px-3 py-2 whitespace-nowrap">
                      {fmtShares(byPeriod.get(p)?.get(h.cusip)?.shares)}
                    </td>
                  ))}
                  <td className="px-3 py-2 whitespace-nowrap">
                    {h.value_kusd.toLocaleString("fr-FR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
