import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Manager } from "../lib/types";
import { CARTE, CHAMP } from "../lib/theme";

interface Holding {
  cusip: string;
  name: string;
  shares: number;
  /** Valeur declaree, en dollars. */
  value_usd?: number;
  /** Ancien nom du champ, conserve pour lire les snapshots anterieurs. */
  value_kusd?: number;
}

/** Valeur d'une position en dollars, quel que soit l'age du snapshot. */
function holdingValue(h: Holding): number {
  return h.value_usd ?? h.value_kusd ?? 0;
}

function formatUsd(v: number): string {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1).replace(".", ",")} Md$`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1).replace(".", ",")} M$`;
  return `${v.toLocaleString("fr-FR")} $`;
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
        Aucun gestionnaire suivi. Ajoutez-en dans l'onglet Réglages.
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
        .sort((a, b) => holdingValue(b) - holdingValue(a))
        .slice(0, 40)
    : [];

  function fmtShares(n: number | undefined): string {
    if (n === undefined) return "—";
    return n.toLocaleString("fr-FR");
  }

  return (
    <div className="space-y-4">
      <div className={`${CARTE} p-5 space-y-2`}>
        <h2 className="font-semibold text-slate-800">
          Le portefeuille des gérants que vous suivez
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Ce tableau montre, entreprise par entreprise, combien d'actions le
          gestionnaire déclarait détenir à la fin de chaque trimestre. Lire une
          ligne de gauche à droite permet de voir s'il a renforcé, allégé ou
          conservé sa position au fil du temps.
        </p>
        <p className="text-xs text-slate-500 leading-relaxed">
          Rappel : ces déclarations paraissent jusqu'à 45 jours après la fin du
          trimestre et ne montrent que les paris à la hausse sur des actions
          américaines. La situation actuelle du fonds peut être différente.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`${CHAMP}`}
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          {managers.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {snapshots.length === 0 ? (
        <p className="text-sm text-slate-500">
          Aucune déclaration enregistrée pour ce gestionnaire — lancez
          « Actualiser » depuis l'onglet Pistes.
        </p>
      ) : (
        <div className={`${CARTE} overflow-x-auto`}>
          <table className="text-sm w-full">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b">
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
                  Valeur (dernier trim.)
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
                    {formatUsd(holdingValue(h))}
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
