import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  LECTURES,
  lecturesDuTheme,
  parcoursEssentiel,
  SOURCES,
  THEMES,
} from "../lib/education";
import type { CleTheme, Lecture } from "../lib/education";
import { BOUTON_DOUX, CARTE } from "../lib/theme";

/**
 * Journal : s'informer et apprendre.
 *
 * Deux moitiés distinctes, et la distinction compte. En haut, ce qui vient de
 * paraitre — utile mais perissable. En bas, une bibliotheque de lectures qui
 * ne perime pas, et qui est la vraie reponse a « comment bien investir ».
 *
 * La bibliotheque vit dans `src/lib/education.ts`, donc cote frontend : elle
 * s'affiche meme si la fonction `journal` est indisponible ou pas encore
 * redeployee. Une panne de flux ne doit pas priver le lecteur de ce qui ne
 * depend d'aucun reseau.
 */

interface ArticleFlux {
  titre: string;
  lien: string;
  date: string | null;
  extrait: string;
}

interface ActualiteFsma extends ArticleFlux {
  categorie: "mise-en-garde" | "actualite";
}

interface AutreFlux {
  cle: string;
  nom: string;
  detail: string;
  pays: string;
  accueil: string;
  articles: ArticleFlux[];
  erreur: string | null;
}

interface ReponseJournal {
  fsma: ActualiteFsma[];
  erreurFsma: string | null;
  autres?: AutreFlux[];
}

type Filtre = "tout" | "mise-en-garde" | "actualite";

function dateCourte(d: string | null): string | null {
  if (!d) return null;
  const t = new Date(d);
  return isNaN(t.getTime()) ? null : t.toLocaleDateString("fr-BE");
}

function CarteLecture({ l }: { l: Lecture }) {
  const s = SOURCES[l.source];
  return (
    <a
      href={l.lien}
      target="_blank"
      rel="noreferrer"
      className={`${CARTE} block p-4 hover:border-indigo-300 transition`}
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">
          {s.pays} {s.nom}
        </span>
        {s.horsBelgique && (
          <span
            className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600"
            title="Les règles fiscales citées sont françaises et ne s'appliquent pas en Belgique."
          >
            cadre fiscal ≠ belge
          </span>
        )}
      </div>
      <p className="font-medium text-slate-800 mt-2 leading-snug">{l.titre}</p>
      <p className="text-sm text-slate-500 mt-1 leading-relaxed">{l.pourquoi}</p>
    </a>
  );
}

export default function JournalPage() {
  const [donnees, setDonnees] = useState<ReponseJournal | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [filtre, setFiltre] = useState<Filtre>("tout");
  const [themeOuvert, setThemeOuvert] = useState<CleTheme | null>(null);

  useEffect(() => {
    charger();
  }, []);

  async function charger() {
    setChargement(true);
    setErreur(null);
    const { data, error } = await supabase.functions.invoke("journal", { body: {} });
    if (error) setErreur(error.message);
    else setDonnees(data as ReponseJournal);
    setChargement(false);
  }

  const fsma = donnees?.fsma ?? [];
  const items = fsma.filter((a) => filtre === "tout" || a.categorie === filtre);
  const nbMisesEnGarde = fsma.filter((a) => a.categorie === "mise-en-garde").length;
  const autres = donnees?.autres ?? [];
  const essentiels = parcoursEssentiel();

  return (
    <div className="space-y-6">
      <div className={`${CARTE} p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            📰
          </span>
          <div className="space-y-2">
            <h2 className="font-semibold text-slate-800">S'informer, à la source</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              En haut, ce qui vient de paraître. En bas,{" "}
              <strong>{LECTURES.length} lectures</strong> pour apprendre à
              investir — conseils, checklists et fiches produits, publiés par des
              organismes publics d'éducation financière. Aucun résumé n'est
              réécrit : vous lisez la source elle-même.
            </p>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* Apprendre — la partie qui ne périme pas                          */}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Par où commencer
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Si vous ne deviez lire que quelques pages, celles-ci, dans cet ordre.
          La protection contre la fraude vient tôt : une arnaque coûte plus cher
          que n'importe quelle erreur de sélection.
        </p>
        <ol className="space-y-2.5">
          {essentiels.map((l, i) => (
            <li key={l.lien} className="flex gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center mt-0.5 tabular-nums">
                {i + 1}
              </span>
              <a
                href={l.lien}
                target="_blank"
                rel="noreferrer"
                className="group min-w-0"
              >
                <p className="font-medium text-slate-800 leading-snug group-hover:text-indigo-700 transition">
                  {l.titre}
                </p>
                <p className="text-sm text-slate-500 leading-relaxed">{l.pourquoi}</p>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Toute la bibliothèque
        </h3>
        <div className="space-y-2.5">
          {THEMES.map((t) => {
            const lectures = lecturesDuTheme(t.cle);
            const ouvert = themeOuvert === t.cle;
            return (
              <div key={t.cle} className={`${CARTE} overflow-hidden`}>
                <button
                  onClick={() => setThemeOuvert(ouvert ? null : t.cle)}
                  className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-50 transition"
                  aria-expanded={ouvert}
                >
                  <span className="text-xl leading-none mt-0.5" aria-hidden>
                    {t.icone}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold text-slate-800">{t.libelle}</span>
                      <span className="text-xs text-slate-400 shrink-0 tabular-nums">
                        {lectures.length} {ouvert ? "▲" : "▼"}
                      </span>
                    </span>
                    <span className="block text-sm text-slate-500 leading-relaxed mt-0.5">
                      {t.promesse}
                    </span>
                  </span>
                </button>
                {ouvert && (
                  <div className="px-4 pb-4 grid sm:grid-cols-2 gap-3">
                    {lectures.map((l) => (
                      <CarteLecture key={l.lien} l={l} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {Object.values(SOURCES).map((s) => (
            <a
              key={s.cle}
              href={s.accueil}
              target="_blank"
              rel="noreferrer"
              className={`${BOUTON_DOUX} inline-block`}
            >
              {s.pays} Tout {s.nom} →
            </a>
          ))}
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          {Object.values(SOURCES)
            .map((s) => `${s.nom} — ${s.detail}`)
            .join(" ")}
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Actualites                                                        */}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Actualités et mises en garde — FSMA
          </h3>
          <button onClick={charger} className="text-xs text-slate-400 hover:text-slate-700">
            ↻ Actualiser
          </button>
        </div>

        {erreur && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200/70 rounded-xl px-4 py-3">
            Flux indisponibles : {erreur}
          </p>
        )}
        {donnees?.erreurFsma && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3">
            Flux FSMA momentanément indisponible : {donnees.erreurFsma}
          </p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: "tout", label: "Tout" },
              {
                id: "mise-en-garde",
                label: `⚠️ Mises en garde${nbMisesEnGarde ? ` (${nbMisesEnGarde})` : ""}`,
              },
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
                {dateCourte(a.date) && (
                  <span className="text-xs text-slate-400 mt-0.5">{dateCourte(a.date)}</span>
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

      {autres.map((f) => (
        <section key={f.cle} className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            {f.pays} {f.nom}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">{f.detail}</p>
          {f.erreur ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3">
              Flux momentanément indisponible : {f.erreur}
            </p>
          ) : (
            <div className="space-y-2.5">
              {f.articles.map((a) => (
                <a
                  key={a.lien}
                  href={a.lien}
                  target="_blank"
                  rel="noreferrer"
                  className={`${CARTE} block p-4 hover:border-indigo-300 transition`}
                >
                  {dateCourte(a.date) && (
                    <span className="text-xs text-slate-400">{dateCourte(a.date)}</span>
                  )}
                  <p className="font-medium text-slate-800 mt-1 leading-snug">{a.titre}</p>
                  {a.extrait && (
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {a.extrait}
                    </p>
                  )}
                </a>
              ))}
            </div>
          )}
        </section>
      ))}

      {!chargement && donnees && autres.length === 0 && (
        <p className="text-xs text-slate-400 leading-relaxed">
          Une source d'actualité supplémentaire est prête mais n'apparaîtra
          qu'une fois la fonction <code>journal</code> redéployée côté serveur.
          La bibliothèque ci-dessus, elle, ne dépend d'aucun déploiement.
        </p>
      )}

      <p className="text-xs text-slate-400 leading-relaxed">
        Ce journal relaie des publications officielles et des contenus
        pédagogiques publics ; il ne les commente pas, n'en tire aucune
        recommandation d'achat ou de vente, et leur présence ici ne constitue
        pas un conseil en investissement.
      </p>
    </div>
  );
}
