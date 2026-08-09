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
import { BOUTON_DOUX, CARTE, CARTE_CLIQUABLE, SURTITRE } from "../lib/theme";

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

/** Articles montres avant de devoir demander la suite. */
const APERCU = 5;

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
      className={`${CARTE_CLIQUABLE} block p-4`}
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
  // Les flux comptent 30 et 15 articles : tout derouler faisait a lui seul
  // plus de sept ecrans. On en montre cinq, le reste sur demande.
  const [toutFsma, setToutFsma] = useState(false);
  const [toutAutres, setToutAutres] = useState<Record<string, boolean>>({});

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
  const tousItems = fsma.filter((a) => filtre === "tout" || a.categorie === filtre);
  const items = toutFsma ? tousItems : tousItems.slice(0, APERCU);
  const nbMisesEnGarde = fsma.filter((a) => a.categorie === "mise-en-garde").length;
  const autres = donnees?.autres ?? [];
  const essentiels = parcoursEssentiel();

  return (
    <div className="space-y-6">
      {/* Intitule court : la page se comprend par sa structure, pas par un
          paragraphe d'introduction que personne ne relit. Le detail utile
          (qui publie, et pourquoi c'est fiable) vit deja au pied de la
          bibliotheque. */}
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">
          S'informer, à la source
        </h2>
        <p className="text-base text-slate-500">
          <strong className="text-slate-700 font-semibold">
            {LECTURES.length} lectures
          </strong>{" "}
          pour apprendre, et l'actualité des régulateurs. Rien n'est réécrit.
        </p>
      </header>

      {/* ---------------------------------------------------------------- */}
      {/* Apprendre — la partie qui ne périme pas                          */}

      <section className="space-y-3">
        <h3 className={SURTITRE}>Par où commencer</h3>
        <p className="text-base text-slate-500 leading-snug">
          Dans cet ordre. La fraude vient tôt : une arnaque coûte plus cher que
          n'importe quelle erreur de sélection.
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
        <h3 className={SURTITRE}>Toute la bibliothèque</h3>
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
                      <span className="text-xs text-slate-500 shrink-0 tabular-nums">
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
        <p className="text-sm text-slate-500 leading-relaxed">
          {Object.values(SOURCES)
            .map((s) => `${s.nom} — ${s.detail}`)
            .join(" ")}
        </p>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Actualites                                                        */}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className={SURTITRE}>Actualités et mises en garde — FSMA</h3>
          <button onClick={charger} className="text-xs text-slate-500 hover:text-slate-700">
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

        {chargement && (
          <p className="text-sm text-slate-500" role="status">
            Chargement…
          </p>
        )}

        {!chargement && items.length === 0 && donnees && !donnees.erreurFsma && (
          <p className="text-sm text-slate-500">Rien à afficher pour ce filtre.</p>
        )}

        <div className="space-y-2.5">
          {items.map((a) => (
            <a
              key={a.lien}
              href={a.lien}
              target="_blank"
              rel="noreferrer"
              className={`${CARTE_CLIQUABLE} block p-4`}
            >
              <div className="flex items-start gap-2.5">
                {a.categorie === "mise-en-garde" ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-medium shrink-0 mt-0.5">
                    <span aria-hidden>⚠️ </span>Mise en garde
                    <span className="sr-only">
                      {" "}: la FSMA signale un acteur non agréé ou une pratique douteuse
                    </span>
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-medium shrink-0 mt-0.5">
                    Actualité
                  </span>
                )}
                {dateCourte(a.date) && (
                  <span className="text-xs text-slate-500 mt-0.5">{dateCourte(a.date)}</span>
                )}
              </div>
              <p className="font-medium text-slate-800 mt-1.5 leading-snug">{a.titre}</p>
              {a.extrait && (
                <p className="text-sm text-slate-500 mt-1 leading-relaxed line-clamp-2">
                  {a.extrait}
                </p>
              )}
              <span className="sr-only">(nouvel onglet)</span>
            </a>
          ))}
        </div>

        {tousItems.length > APERCU && (
          <button
            type="button"
            onClick={() => setToutFsma(!toutFsma)}
            aria-expanded={toutFsma}
            className={`${BOUTON_DOUX} w-full min-h-[44px]`}
          >
            {toutFsma
              ? "Réduire la liste"
              : `Voir les ${tousItems.length - APERCU} autres publications`}
          </button>
        )}
      </section>

      {autres.map((f) => (
        <section key={f.cle} className="space-y-3">
          <h3 className={SURTITRE}>
            <span aria-hidden>{f.pays}</span> {f.nom}
          </h3>
          <p className="text-sm text-slate-500 leading-relaxed">{f.detail}</p>
          {f.erreur ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200/70 rounded-xl px-4 py-3">
              Flux momentanément indisponible : {f.erreur}
            </p>
          ) : (
            <div className="space-y-2.5">
              {(toutAutres[f.cle] ? f.articles : f.articles.slice(0, APERCU)).map((a) => (
                <a
                  key={a.lien}
                  href={a.lien}
                  target="_blank"
                  rel="noreferrer"
                  className={`${CARTE_CLIQUABLE} block p-4`}
                >
                  {dateCourte(a.date) && (
                    <span className="text-xs text-slate-500">{dateCourte(a.date)}</span>
                  )}
                  <p className="font-medium text-slate-800 mt-1 leading-snug">{a.titre}</p>
                  {a.extrait && (
                    <p className="text-sm text-slate-500 mt-1 leading-relaxed line-clamp-2">
                      {a.extrait}
                    </p>
                  )}
                  <span className="sr-only">(nouvel onglet)</span>
                </a>
              ))}
            </div>
          )}
          {!f.erreur && f.articles.length > APERCU && (
            <button
              type="button"
              onClick={() =>
                setToutAutres((t) => ({ ...t, [f.cle]: !t[f.cle] }))
              }
              aria-expanded={!!toutAutres[f.cle]}
              className={`${BOUTON_DOUX} w-full min-h-[44px]`}
            >
              {toutAutres[f.cle]
                ? "Réduire la liste"
                : `Voir les ${f.articles.length - APERCU} autres articles`}
            </button>
          )}
        </section>
      ))}

      {!chargement && donnees && autres.length === 0 && (
        <p className="text-sm text-slate-500 leading-relaxed">
          Une source d'actualité supplémentaire est prête mais n'apparaîtra
          qu'une fois la fonction <code>journal</code> redéployée côté serveur.
          La bibliothèque ci-dessus, elle, ne dépend d'aucun déploiement.
        </p>
      )}

      <p className="text-sm text-slate-500 leading-relaxed">
        Ce journal relaie des publications officielles et des contenus
        pédagogiques publics ; il ne les commente pas, n'en tire aucune
        recommandation d'achat ou de vente, et leur présence ici ne constitue
        pas un conseil en investissement.
      </p>
    </div>
  );
}
