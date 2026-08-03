import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { CARTE } from "../lib/theme";

/**
 * Visibilite operationnelle : outil strictement personnel, sans personne
 * d'autre pour surveiller le cron hebdomadaire. Sans ce bandeau, un echec
 * silencieux (page FSMA modifiee, credit Anthropic epuise…) se confondrait
 * avec une semaine normale sans rien a declarer.
 */

interface SyncRun {
  source: "sync-edgar" | "sync-fsma" | "sync-fi";
  started_at: string;
  finished_at: string;
  created_count: number;
  errors: string[];
  ok: boolean;
}

const SOURCES: { id: SyncRun["source"]; nom: string; drapeau: string }[] = [
  { id: "sync-edgar", nom: "SEC", drapeau: "🇺🇸" },
  { id: "sync-fsma", nom: "FSMA", drapeau: "🇧🇪" },
  { id: "sync-fi", nom: "Finansinspektionen", drapeau: "🇸🇪" },
];

// Le cron tourne chaque lundi : au-dela de 9 jours sans passage reussi, il y
// a probablement un probleme plutot qu'un simple decalage de planning.
const SEUIL_RETARD_JOURS = 9;

function ilYA(iso: string): string {
  const jours = Math.floor((Date.now() - +new Date(iso)) / 86_400_000);
  if (jours <= 0) return "aujourd'hui";
  if (jours === 1) return "hier";
  return `il y a ${jours} jours`;
}

interface Props {
  /** Change de valeur apres chaque synchronisation manuelle pour rafraichir. */
  rafraichirLe?: number;
}

export default function SyncStatusBanner({ rafraichirLe }: Props) {
  const [runs, setRuns] = useState<Map<string, SyncRun> | null>(null);
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    supabase
      .from("sync_runs")
      .select("source, started_at, finished_at, created_count, errors, ok")
      .order("finished_at", { ascending: false })
      .then(({ data }) => {
        const parSource = new Map<string, SyncRun>();
        for (const r of (data as SyncRun[]) ?? []) {
          if (!parSource.has(r.source)) parSource.set(r.source, r);
        }
        setRuns(parSource);
      });
  }, [rafraichirLe]);

  if (!runs) return null;

  const soucis = SOURCES.filter((s) => {
    const r = runs.get(s.id);
    if (!r) return true; // jamais synchronise
    if (!r.ok) return true;
    return Date.now() - +new Date(r.finished_at) > SEUIL_RETARD_JOURS * 86_400_000;
  });

  return (
    <div className={`${CARTE} p-3.5`}>
      <button
        onClick={() => setOuvert(!ouvert)}
        className="w-full flex items-center justify-between gap-3 text-sm"
      >
        <span className={soucis.length > 0 ? "text-amber-700 font-medium" : "text-slate-500"}>
          {soucis.length > 0
            ? `⚠ ${soucis.length} source(s) à vérifier`
            : "✓ Synchronisations à jour"}
        </span>
        <span className="text-slate-400 text-xs">{ouvert ? "− masquer" : "+ détails"}</span>
      </button>
      {ouvert && (
        <ul className="mt-3 space-y-2 text-sm">
          {SOURCES.map((s) => {
            const r = runs.get(s.id);
            return (
              <li key={s.id} className="flex items-start justify-between gap-3">
                <span className="text-slate-600">
                  {s.drapeau} {s.nom}
                </span>
                {!r ? (
                  <span className="text-amber-700 text-right">
                    jamais synchronisé — normal juste après l'activation
                  </span>
                ) : (
                  <span
                    className={`text-right ${r.ok ? "text-slate-500" : "text-rose-700"}`}
                  >
                    {r.ok
                      ? `OK, ${ilYA(r.finished_at)}${r.created_count > 0 ? ` (${r.created_count} piste${r.created_count > 1 ? "s" : ""})` : ""}`
                      : `échec, ${ilYA(r.finished_at)}`}
                    {r.errors?.length > 0 && (
                      <span className="block text-xs text-rose-500 mt-0.5">
                        {r.errors[0]}
                      </span>
                    )}
                  </span>
                )}
              </li>
            );
          })}
          <li className="text-xs text-slate-400 pt-1 border-t border-slate-100">
            La synchronisation tourne chaque lundi matin. Le bouton « Actualiser »
            en haut de page en déclenche une immédiatement.
          </li>
        </ul>
      )}
    </div>
  );
}
