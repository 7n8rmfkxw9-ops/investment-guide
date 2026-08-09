import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { CARTE } from "../lib/theme";

/**
 * Visibilite operationnelle : outil strictement personnel, sans personne
 * d'autre pour surveiller le cron hebdomadaire. Sans ce bandeau, un echec
 * silencieux (page FSMA modifiee, credit Anthropic epuise…) se confondrait
 * avec une semaine normale sans rien a declarer.
 *
 * Presente en pastille dans l'en-tete plutot qu'en bandeau au-dessus du
 * contenu : c'est une information de maintenance, et elle occupait la
 * premiere ligne de la page d'accueil, avant les pistes elles-memes. Elle
 * reste visible en permanence — un echec silencieux resterait invisible — mais
 * ne precede plus ce pour quoi l'application existe.
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

export default function SyncStatusBanner() {
  const [runs, setRuns] = useState<Map<string, SyncRun> | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const bouton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuvert(false);
        bouton.current?.focus();
      }
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [ouvert]);

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
    // Relu aussi a chaque ouverture : la pastille vit dans l'en-tete, elle ne
    // remonte donc plus au moment d'une synchronisation manuelle declenchee
    // ailleurs. Relire quand l'utilisateur regarde suffit, et evite d'aller
    // interroger la base en boucle pour une information hebdomadaire.
  }, [ouvert]);

  if (!runs) return null;

  const soucis = SOURCES.filter((s) => {
    const r = runs.get(s.id);
    if (!r) return true; // jamais synchronise
    if (!r.ok) return true;
    return Date.now() - +new Date(r.finished_at) > SEUIL_RETARD_JOURS * 86_400_000;
  });

  const libelle =
    soucis.length > 0
      ? `${soucis.length} source${soucis.length > 1 ? "s" : ""} à vérifier`
      : "Synchronisations à jour";

  return (
    <div className="relative">
      <button
        ref={bouton}
        onClick={() => setOuvert(!ouvert)}
        aria-expanded={ouvert}
        aria-haspopup="dialog"
        className={`min-h-[44px] px-2.5 flex items-center gap-1.5 rounded-xl text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
          soucis.length > 0
            ? "text-amber-800 hover:bg-amber-50"
            : "text-slate-500 hover:bg-slate-100"
        }`}
      >
        {/* La forme porte l'etat autant que la couleur : un point plein pour
            un souci, un contour pour « tout va bien ». */}
        <span
          className={`inline-block h-2 w-2 rounded-full border ${
            soucis.length > 0
              ? "bg-amber-500 border-amber-600"
              : "bg-transparent border-emerald-500"
          }`}
          aria-hidden
        />
        <span className="sr-only">État des synchronisations : </span>
        <span aria-hidden={soucis.length === 0}>
          {soucis.length > 0 ? soucis.length : ""}
        </span>
        <span className="sr-only">{libelle}</span>
      </button>

      {ouvert && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOuvert(false)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-label="État des synchronisations"
            className={`${CARTE} absolute right-0 top-full mt-1 z-40 w-[min(20rem,calc(100vw-2rem))] p-3.5 shadow-lg`}
          >
            <p className="text-sm font-medium text-slate-800 mb-2">{libelle}</p>
            <ul className="space-y-2 text-sm">
              {SOURCES.map((s) => {
                const r = runs.get(s.id);
                return (
                  <li key={s.id} className="flex items-start justify-between gap-3">
                    <span className="text-slate-600">
                      <span aria-hidden>{s.drapeau}</span> {s.nom}
                    </span>
                    {!r ? (
                      <span className="text-amber-800 text-right">
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
                          <span className="block text-xs text-rose-700 mt-0.5">
                            {r.errors[0]}
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                );
              })}
              <li className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                La synchronisation tourne chaque lundi matin. Le bouton
                « Actualiser » de l'onglet Pistes en déclenche une immédiatement.
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
