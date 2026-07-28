import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Piste, SignalType } from "../lib/types";
import { SIGNAL_LABELS } from "../lib/types";
import PisteCard from "./PisteCard";

type SortKey = "date" | "signal";

export default function Dashboard() {
  const [pistes, setPistes] = useState<Piste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<SignalType | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [fee, setFee] = useState(1);
  const [size, setSize] = useState(150);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: rows, error: err }, { data: settings }] = await Promise.all([
      supabase.from("pistes").select("*").order("detected_at", { ascending: false }),
      supabase.from("settings").select("*").maybeSingle(),
    ]);
    if (err) setError(err.message);
    setPistes((rows as Piste[]) ?? []);
    if (settings) {
      setFee(Number(settings.broker_fixed_fee_eur));
      setSize(Number(settings.position_size_eur));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSync() {
    setSyncing(true);
    setSyncMsg(null);
    const { data, error } = await supabase.functions.invoke("sync-edgar", {
      body: {},
    });
    if (error) {
      setSyncMsg(`Erreur de synchronisation : ${error.message}`);
    } else {
      const d = data as { created?: number } | null;
      setSyncMsg(
        d && typeof d.created === "number"
          ? `Synchronisation terminée : ${d.created} nouvelle(s) piste(s).`
          : "Synchronisation terminée.",
      );
      await load();
    }
    setSyncing(false);
  }

  const sources = Array.from(new Set(pistes.map((p) => p.source_name))).sort();
  const sectors = Array.from(
    new Set(pistes.map((p) => p.sector).filter((s): s is string => !!s)),
  ).sort();

  const shown = pistes
    .filter((p) => signalFilter === "all" || p.signal === signalFilter)
    .filter((p) => sourceFilter === "all" || p.source_name === sourceFilter)
    .filter((p) => sectorFilter === "all" || p.sector === sectorFilter)
    .sort((a, b) => {
      if (sortKey === "signal") {
        // Form 4 (donnee plus fraiche) en premier, puis par date
        const aF = a.signal.startsWith("form4") ? 0 : 1;
        const bF = b.signal.startsWith("form4") ? 0 : 1;
        if (aF !== bF) return aF - bF;
      }
      return +new Date(b.detected_at) - +new Date(a.detected_at);
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="border rounded px-2 py-1 text-sm bg-white"
          value={signalFilter}
          onChange={(e) => setSignalFilter(e.target.value as SignalType | "all")}
        >
          <option value="all">Tous les signaux</option>
          {(Object.keys(SIGNAL_LABELS) as SignalType[]).map((s) => (
            <option key={s} value={s}>
              {SIGNAL_LABELS[s]}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 text-sm bg-white"
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
        >
          <option value="all">Toutes les sources</option>
          {sources.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {sectors.length > 0 && (
          <select
            className="border rounded px-2 py-1 text-sm bg-white"
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
          >
            <option value="all">Tous les secteurs</option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        )}
        <select
          className="border rounded px-2 py-1 text-sm bg-white"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
        >
          <option value="date">Tri : plus récentes d'abord</option>
          <option value="signal">Tri : Form 4 d'abord (plus frais)</option>
        </select>
        <button
          onClick={runSync}
          disabled={syncing}
          className="ml-auto text-sm border rounded px-3 py-1 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          {syncing ? "Synchronisation…" : "Synchroniser maintenant"}
        </button>
      </div>

      {syncMsg && <p className="text-sm text-slate-600">{syncMsg}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {loading && <p className="text-sm text-slate-500">Chargement…</p>}

      {!loading && shown.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 text-sm text-slate-500">
          Aucune piste pour le moment. Configurez des gestionnaires à suivre dans
          l'onglet Configuration, puis lancez une synchronisation. Le cron
          hebdomadaire s'en chargera ensuite automatiquement.
        </div>
      )}

      {shown.map((p) => (
        <PisteCard key={p.id} piste={p} brokerFixedFeeEur={fee} positionSizeEur={size} />
      ))}
    </div>
  );
}
