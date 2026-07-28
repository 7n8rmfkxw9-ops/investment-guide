import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Piste } from "../lib/types";
import { SIGNAL_LABELS } from "../lib/types";

/**
 * Historique honnete : toutes les pistes passees, avec la possibilite de noter
 * ce qui s'est passe ensuite. Les echecs sont affiches au meme titre que les
 * reussites — l'ordre est purement chronologique, sans mise en avant.
 */
export default function History() {
  const [pistes, setPistes] = useState<Piste[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("pistes")
      .select("*")
      .order("detected_at", { ascending: false });
    setPistes((data as Piste[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function saveOutcome(id: string) {
    const note = drafts[id]?.trim();
    if (!note) return;
    await supabase
      .from("pistes")
      .update({ outcome_note: note, outcome_recorded_at: new Date().toISOString() })
      .eq("id", id);
    setDrafts((d) => ({ ...d, [id]: "" }));
    await load();
  }

  if (loading) return <p className="text-sm text-slate-500">Chargement…</p>;

  if (pistes.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        Aucune piste enregistrée pour le moment.
      </p>
    );
  }

  const withNote = pistes.filter((p) => p.outcome_note).length;
  const REMINDER_DAYS = 90;
  const now = Date.now();
  const dueForNote = (p: Piste) =>
    !p.outcome_note &&
    now - +new Date(p.detected_at) > REMINDER_DAYS * 24 * 3600 * 1000;
  const dueCount = pistes.filter(dueForNote).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Notez ce qui s'est réellement passé après chaque piste — les échecs comme
        les réussites — pour garder une vision honnête de la fiabilité de l'outil
        dans le temps.
      </p>
      <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm flex flex-wrap gap-x-6 gap-y-1">
        <span>
          <span className="font-medium">{pistes.length}</span> piste(s) au total
        </span>
        <span>
          <span className="font-medium">{withNote}</span> avec suivi noté
        </span>
        <span>
          <span className="font-medium">{pistes.length - withNote}</span> sans
          suivi
        </span>
        {dueCount > 0 && (
          <span className="text-amber-700">
            {dueCount} piste(s) de plus de {REMINDER_DAYS} jours à renseigner
          </span>
        )}
      </div>
      {pistes.map((p) => (
        <div
          key={p.id}
          className={`bg-white border rounded-lg p-4 text-sm space-y-2 ${
            dueForNote(p) ? "border-amber-300" : "border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <span className="font-medium">{p.company_name}</span>
              {p.ticker && <span className="text-slate-500"> ({p.ticker})</span>}
              <span className="text-slate-400"> · {SIGNAL_LABELS[p.signal]}</span>
            </div>
            <span className="text-xs text-slate-400">
              {new Date(p.detected_at).toLocaleDateString("fr-FR")}
            </span>
          </div>
          {p.outcome_note ? (
            <p className="text-slate-700 bg-slate-50 border border-slate-200 rounded p-2">
              <span className="text-xs uppercase tracking-wide text-slate-400 block">
                Ce qui s'est passé ensuite
              </span>
              {p.outcome_note}
            </p>
          ) : (
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-2 py-1 text-sm"
                placeholder="Ce qui s'est passé ensuite (hausse, baisse, rien…)"
                value={drafts[p.id] ?? ""}
                onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
              />
              <button
                className="text-sm border rounded px-3 py-1 bg-white hover:bg-slate-50"
                onClick={() => saveOutcome(p.id)}
              >
                Enregistrer
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
