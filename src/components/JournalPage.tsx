import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { BOUTON_DOUX, CARTE } from "../lib/theme";

interface ActualiteFsma {
  titre: string;
  lien: string;
  date: string | null;
  categorie: "mise-en-garde" | "actualite";
  extrait: string;
}

interface ArticleEducatif {
  theme: string;
  titre: string;
  lien: string;
  resume: string;
}

interface ReponseJournal {
  fsma: ActualiteFsma[];
  erreurFsma: string | null;
  education: ArticleEducatif[];
}

type Filtre = "tout" | "mise-en-garde" | "actualite";

export default function JournalPage() {
  const [donnees, setDonnees] = useState<ReponseJournal | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("tout");

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    setErreur(null);
    const { data, error } = await supabase.functions.invoke("journal", { body: {} });
    if (error) {
      setErreur(error.message);
    } else {
      setDonnees(data as ReponseJournal);
    }
    setChargement(false);
  }

  const items = (donnees?.fsma ?? []).filter(
    (a) => filtre === "tout" || a.categorie === filtre,
  );
  const nbMisesEnGarde = (donnees?.fsma ?? []).filter((a) => a.categorie === "mise-en-garde").length;

  return (
    <div className="space-y-5">
      <div className={`${CARTE} p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            📰
          </span>
          <div className="space-y-2">
            <h2 className="font-semibold text-slate-800">S'informer, à la source</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Deux flux, tous deux publiés par la FSMA (l'autorité belge des marchés
              financiers) : ses <strong>actualités et mises en garde</strong>, en
              temps réel ; et une sélection de ses{" "}
              <strong>fiches d'éducation financière</strong> (Wikifin), pour
              apprendre les bonnes pratiques. Aucun résumé n'est réécrit : vous lisez
              le régulateur lui-même.
            </p>
          </div>
        </div>
      </div>

      {erreur && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200/70 rounded-xl px-4 py-3">
          {erreur}
        </p>
      )}
      {donnees?.erreurFsma && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3">
          Flux d'actualités FSMA momentanément indisponible : {donnees.erreurFsma}
        </p>
      )}

      {/* Actualites et mises en garde */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Actualités et mises en garde — FSMA
          </h3>
          <button onClick={charger} className="text-xs text-slate-400 hover:text-slate-700">
            ↻ Actualiser
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "tout", label: "Tout" },
              { id: "mise-en-garde", label: `⚠️ Mises en garde${nbMisesEnGarde ? ` (${nbMisesEnGarde})` : ""}` },
              { id: "actualite", label: "Actualités" },
            ] as { id: Filtre; label: string }[]
          ).map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltre(f.id)}
              className={`px-3 py-1 text-xs rounded-full transition ${
                filtre === f.id
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {chargement && <p className="text-sm text-slate-400">Chargement…</p>}

        {!chargement && items.length === 0 && donnees && !donnees.erreurFsma && (
          <p className="text-sm text-slate-400">Rien à afficher pour ce filtre.</p>
        )}

        <div className="space-y-2.5">
          {items.map((a) => (
            <a
              key={a.lien}
              href={a.lien}
              target="_blank"
              rel="noreferrer"
              className={`${CARTE} block p-4 hover:border-indigo-300 transition`}
            >
              <div className="flex items-start gap-2.5">
                {a.categorie === "mise-en-garde" ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-medium shrink-0 mt-0.5"
                    title="La FSMA signale un acteur non agréé ou une pratique douteuse"
                  >
                    ⚠️ Mise en garde
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-medium shrink-0 mt-0.5">
                    Actualité
                  </span>
                )}
                {a.date && (
                  <span className="text-xs text-slate-400 mt-0.5">
                    {new Date(a.date).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>
              <p className="font-medium text-slate-800 mt-1.5 leading-snug">{a.titre}</p>
              {a.extrait && (
                <p className="text-sm text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {a.extrait}
                </p>
              )}
            </a>
          ))}
        </div>
      </section>

      {/* Education */}
      {donnees && donnees.education.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Apprendre — Wikifin, l'éducation financière de la FSMA
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {donnees.education.map((a) => (
              <a
                key={a.lien}
                href={a.lien}
                target="_blank"
                rel="noreferrer"
                className={`${CARTE} block p-4 hover:border-indigo-300 transition`}
              >
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
                  {a.theme}
                </span>
                <p className="font-medium text-slate-800 mt-2 leading-snug">{a.titre}</p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">{a.resume}</p>
              </a>
            ))}
          </div>
          <a
            href="https://www.wikifin.be/fr/epargner-et-investir"
            target="_blank"
            rel="noreferrer"
            className={`${BOUTON_DOUX} inline-block`}
          >
            Voir toutes les fiches Wikifin →
          </a>
        </section>
      )}

      <p className="text-xs text-slate-400 leading-relaxed">
        Ce journal relaie des publications officielles ; il ne les commente pas et
        n'en tire aucune recommandation d'achat ou de vente.
      </p>
    </div>
  );
}
