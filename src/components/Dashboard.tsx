import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Piste, SignalType } from "../lib/types";
import { SIGNAL_LABELS } from "../lib/types";
import PisteCard from "./PisteCard";
import type { AmorceSimulation } from "./SimulatorPage";
import { BOUTON_DOUX, CARTE, CHAMP } from "../lib/theme";
import SyncStatusBanner from "./SyncStatusBanner";

interface Props {
  onSimuler?: (a: AmorceSimulation) => void;
}

type SortKey = "date" | "signal";

/**
 * Un regulateur par fonction : les registres sont trop differents pour un
 * traitement commun, et les appeler separement evite qu'une source en panne
 * bloque les autres.
 */
const SOURCES = [
  { fn: "sync-edgar", nom: "SEC" },
  { fn: "sync-fsma", nom: "FSMA" },
  { fn: "sync-fi", nom: "Finansinspektionen" },
];

export default function Dashboard({ onSimuler }: Props) {
  const [pistes, setPistes] = useState<Piste[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<SignalType | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [fee, setFee] = useState(1);
  const [size, setSize] = useState(150);
  const [tob, setTob] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [rafraichirBandeau, setRafraichirBandeau] = useState(0);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [filtresOuverts, setFiltresOuverts] = useState(false);

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
      setTob(Number(settings.tob_pct ?? 0));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSync() {
    setSyncing(true);
    setSyncMsg(null);
    let total = 0;
    const echecs: string[] = [];
    for (const src of SOURCES) {
      const { data, error } = await supabase.functions.invoke(src.fn, { body: {} });
      if (error) {
        echecs.push(src.nom);
      } else {
        const d = data as { created?: number } | null;
        if (d && typeof d.created === "number") total += d.created;
      }
    }
    const base =
      total === 0
        ? "Synchronisation terminée : rien de nouveau déclaré."
        : `Synchronisation terminée : ${total} nouvelle(s) piste(s).`;
    setSyncMsg(
      echecs.length > 0
        ? `${base} Source(s) indisponible(s) : ${echecs.join(", ")}.`
        : base,
    );
    await load();
    setSyncing(false);
    setRafraichirBandeau((n) => n + 1);
  }

  const sources = Array.from(new Set(pistes.map((p) => p.source_name))).sort();
  const sectors = Array.from(
    new Set(pistes.map((p) => p.sector).filter((s): s is string => !!s)),
  ).sort();
  const filtresActifs =
    (signalFilter !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (sectorFilter !== "all" ? 1 : 0);

  const shown = pistes
    .filter((p) => signalFilter === "all" || p.signal === signalFilter)
    .filter((p) => sourceFilter === "all" || p.source_name === sourceFilter)
    .filter((p) => sectorFilter === "all" || p.sector === sectorFilter)
    .sort((a, b) => {
      if (sortKey === "signal") {
        const aF = a.signal.startsWith("form4") ? 0 : 1;
        const bF = b.signal.startsWith("form4") ? 0 : 1;
        if (aF !== bF) return aF - bF;
      }
      return +new Date(b.detected_at) - +new Date(a.detected_at);
    });

  const selectCls = `${CHAMP} py-1.5`;

  return (
    <div className="space-y-4">
      <SyncStatusBanner rafraichirLe={rafraichirBandeau} />

      {/* Barre d'actions, volontairement discrete */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => setFiltresOuverts(!filtresOuverts)}
          className={
            filtresActifs > 0
              ? BOUTON_DOUX
              : "rounded-xl px-3.5 py-2 text-sm text-slate-500 hover:bg-slate-100 transition"
          }
        >
          Filtres{filtresActifs > 0 ? ` (${filtresActifs})` : ""}
        </button>
        <button
          onClick={runSync}
          disabled={syncing}
          className="ml-auto rounded-xl px-3.5 py-2 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-40 transition"
        >
          {syncing ? "Synchronisation…" : "↻ Actualiser"}
        </button>
      </div>

      {filtresOuverts && (
        <div className="flex flex-wrap gap-2">
          <select
            className={selectCls}
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
            className={selectCls}
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
              className={selectCls}
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
            className={selectCls}
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            <option value="date">Plus récentes d'abord</option>
            <option value="signal">Données les plus fraîches d'abord</option>
          </select>
        </div>
      )}

      {syncMsg && (
        <p className="text-sm text-indigo-800 bg-indigo-50 border border-indigo-200/70 rounded-xl px-4 py-3">
          {syncMsg}
        </p>
      )}
      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200/70 rounded-xl px-4 py-3">
          {error}
        </p>
      )}
      {loading && <p className="text-sm text-slate-400">Chargement…</p>}

      {!loading && shown.length === 0 && (
        <div className={`${CARTE} p-6 text-sm text-slate-500 leading-relaxed`}>
          {pistes.length === 0 ? (
            <>
              <p className="text-slate-700 font-medium mb-1.5">
                Aucune piste pour le moment — c'est normal.
              </p>
              <p>
                Les déclarations de fonds ne paraissent qu'une fois par
                trimestre, et les opérations de dirigeants sont rares. L'outil
                vérifie automatiquement chaque lundi. En attendant, l'onglet
                Comprendre vous explique ce que vous verrez apparaître ici.
              </p>
            </>
          ) : (
            <p>Aucune piste ne correspond à ces filtres.</p>
          )}
        </div>
      )}

      {shown.map((p) => (
        <PisteCard
          key={p.id}
          piste={p}
          brokerFixedFeeEur={fee}
          positionSizeEur={size}
          transactionTaxPct={tob}
          onSimuler={
            onSimuler
              ? () =>
                  onSimuler({
                    nom: p.company_name,
                    ticker: p.ticker,
                    pisteId: p.id,
                    secteur: p.sector,
                  })
              : undefined
          }
        />
      ))}
    </div>
  );
}
