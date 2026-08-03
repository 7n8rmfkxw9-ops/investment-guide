import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Piste } from "../lib/types";
import { SIGNAL_LABELS } from "../lib/types";
import { CARTE, couleurResultat } from "../lib/theme";
import { marcheDePiste, symboleYahoo } from "../lib/marche";
import { formatPct } from "../lib/simulation";

/**
 * Historique honnete : toutes les pistes passees, avec la possibilite de noter
 * ce qui s'est passe ensuite. Les echecs sont affiches au meme titre que les
 * reussites — l'ordre est purement chronologique, sans mise en avant.
 */

interface ResultatPalmares {
  id: string;
  devise?: string;
  dateReelle?: string;
  prixEntree?: number;
  tauxEntree?: number;
  prixActuel?: number;
  tauxActuel?: number;
  referenceEntree?: number | null;
  referenceActuelle?: number | null;
  erreur?: string;
}

/** Plafond de pistes envoyees au bilan chiffre : au-dela, un usage
 *  strictement personnel n'a plus grand-chose a en tirer, et ca borne
 *  l'appel au fournisseur de cours. */
const MAX_BILAN = 40;

export default function History() {
  const [pistes, setPistes] = useState<Piste[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const [bilan, setBilan] = useState<Map<string, ResultatPalmares> | null>(null);
  const [bilanErreur, setBilanErreur] = useState<string | null>(null);
  const [bilanCharge, setBilanCharge] = useState(false);

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

  // Pistes pour lesquelles un cours peut etre retrouve : il faut un ticker et
  // un marche reconnu (les trois seules sources de l'outil).
  const items = useMemo(() => {
    return pistes
      .filter((p) => p.ticker)
      .map((p) => {
        const m = marcheDePiste(p);
        if (!m) return null;
        const date = (p.filed_at ?? p.detected_at).slice(0, 10);
        return { id: p.id, symbole: symboleYahoo(p.ticker!, m), date };
      })
      .filter((x): x is { id: string; symbole: string; date: string } => x !== null)
      .slice(0, MAX_BILAN);
  }, [pistes]);

  useEffect(() => {
    if (items.length === 0) return;
    setBilanCharge(true);
    setBilanErreur(null);
    supabase.functions
      .invoke("cotations", { body: { action: "palmares", items } })
      .then(({ data, error }) => {
        if (error) {
          setBilanErreur(error.message);
        } else {
          const d = data as { resultats?: ResultatPalmares[] };
          const m = new Map<string, ResultatPalmares>();
          for (const r of d.resultats ?? []) m.set(r.id, r);
          setBilan(m);
        }
        setBilanCharge(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map((i) => i.id).join(",")]);

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
      <div className={`${CARTE} p-5 space-y-2`}>
        <h2 className="font-semibold text-slate-800">
          Votre carnet de bord
        </h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Notez ce qui s'est réellement passé après chaque piste — les échecs
          comme les réussites. C'est le seul moyen de savoir, dans six mois ou un
          an, si ces signaux vous ont réellement apporté quelque chose. Un outil
          qui ne montrerait que ses réussites vous tromperait.
        </p>
      </div>
      <div className={`${CARTE} p-3 text-sm flex flex-wrap gap-x-6 gap-y-1`}>
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

      {bilanErreur && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3">
          Bilan chiffré indisponible : {bilanErreur}
        </p>
      )}

      {pistes.map((p) => {
        const r = bilan?.get(p.id);
        return (
          <div
            key={p.id}
            className={`bg-white border rounded-xl p-4 text-sm space-y-2 ${
              dueForNote(p) ? "border-amber-200" : "border-slate-200/80"
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

            {/* Bilan chiffre : factuel et retrospectif, jamais une prediction. */}
            {r && !r.erreur && (
              <BilanChiffre r={r} />
            )}
            {bilanCharge && !r && p.ticker && (
              <p className="text-xs text-slate-400">Cours en cours de récupération…</p>
            )}

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
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 transition"
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
        );
      })}

      {pistes.length > MAX_BILAN && (
        <p className="text-xs text-slate-400">
          Le bilan chiffré ne porte que sur les {MAX_BILAN} pistes les plus
          récentes ; les plus anciennes gardent votre note manuelle.
        </p>
      )}

      <p className="text-xs text-slate-400 leading-relaxed">
        Le bilan chiffré décrit ce qui s'est déjà produit ; il ne prédit rien
        pour la suite. Les cours proviennent d'un service public de données de
        marché et peuvent être différés.
      </p>
    </div>
  );
}

function BilanChiffre({ r }: { r: ResultatPalmares }) {
  if (
    r.prixEntree == null ||
    r.prixActuel == null ||
    r.tauxEntree == null ||
    r.tauxActuel == null
  ) {
    return null;
  }
  const enEuros = (prix: number, taux: number) => prix / (taux || 1);
  const varTitrePct = (r.prixActuel / r.prixEntree - 1) * 100;
  const varEurPct =
    (enEuros(r.prixActuel, r.tauxActuel) / enEuros(r.prixEntree, r.tauxEntree) - 1) * 100;
  const varRefPct =
    r.referenceEntree != null && r.referenceActuelle != null
      ? (r.referenceActuelle / r.referenceEntree - 1) * 100
      : null;

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${
      varEurPct >= 0 ? "bg-emerald-50 border-emerald-200/70" : "bg-rose-50 border-rose-200/70"
    }`}>
      <p className="text-slate-600">
        Depuis cette piste, le cours a fait{" "}
        <strong className={couleurResultat(varTitrePct)}>{formatPct(varTitrePct)}</strong>
        {r.devise && r.devise !== "EUR" && ` (en ${r.devise})`}
        {r.devise && r.devise !== "EUR" && (
          <>
            {" "}soit <strong className={couleurResultat(varEurPct)}>{formatPct(varEurPct)}</strong> une fois converti en euros
          </>
        )}
        {varRefPct != null ? (
          <>
            . Un ETF actions mondiales sur la même période :{" "}
            <strong className={couleurResultat(varRefPct)}>{formatPct(varRefPct)}</strong>.
          </>
        ) : (
          "."
        )}
      </p>
    </div>
  );
}
