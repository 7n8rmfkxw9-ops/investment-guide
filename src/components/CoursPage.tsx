import { useEffect, useMemo, useState } from "react";
import {
  basculerLu,
  chapitresLus,
  CHAPITRES,
  dureeTotale,
  etudesDuChapitre,
  nombreReferences,
} from "../lib/cours";
import type { Chapitre } from "../lib/cours";
import { lienDoi } from "../lib/etudes";
import type { Etude } from "../lib/etudes";
import { BOUTON_DOUX, BOUTON_PRINCIPAL, CARTE, SURTITRE } from "../lib/theme";
import Repliable from "./Repliable";

/**
 * Cours adosses a des travaux de recherche.
 *
 * Deux vues seulement : la liste des chapitres, et un chapitre ouvert. Pas de
 * navigation imbriquee — sur un telephone, chaque niveau supplementaire est un
 * endroit ou l'on se perd.
 *
 * Chaque chapitre se termine par ses references, avec pour chacune ce qu'elle
 * a mesure ET ses limites. Afficher un resultat sans ses limites reviendrait a
 * presenter une mesure comme une loi.
 */

function FicheEtude({ e }: { e: Etude }) {
  return (
    <li className="rounded-2xl bg-slate-50 p-4 space-y-2.5">
      <div>
        <p className="font-medium text-slate-900 leading-snug">{e.titre}</p>
        <p className="text-sm text-slate-500 mt-0.5">
          {e.auteurs} · {e.annee} · {e.publication}
        </p>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{e.resultat}</p>
      <div className="rounded-xl bg-amber-50 px-3.5 py-2.5">
        <p className={`${SURTITRE} text-amber-700 mb-1`}>Ce que l'étude ne dit pas</p>
        <p className="text-sm text-amber-900 leading-relaxed">{e.limites}</p>
      </div>
      <a
        href={lienDoi(e.doi)}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-sm text-indigo-700 hover:text-indigo-900 underline decoration-indigo-300 underline-offset-2 min-h-[44px] py-2.5"
      >
        Lire la source · doi.org/{e.doi}
        <span className="sr-only"> (nouvel onglet)</span>
      </a>
    </li>
  );
}

function VueChapitre({
  c,
  lu,
  onLu,
  onRetour,
  suivant,
  onSuivant,
}: {
  c: Chapitre;
  lu: boolean;
  onLu: () => void;
  onRetour: () => void;
  suivant: Chapitre | null;
  onSuivant: () => void;
}) {
  const etudes = etudesDuChapitre(c);
  return (
    <article className="space-y-6">
      <button
        type="button"
        onClick={onRetour}
        className="min-h-[44px] -my-2 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        ← Tous les chapitres
      </button>

      <header className="space-y-2">
        <p className={SURTITRE}>
          Chapitre {c.numero} sur {CHAPITRES.length} · {c.minutes} min
        </p>
        <h2 className="text-2xl font-semibold text-slate-900">{c.titre}</h2>
        <p className="text-base text-slate-500">{c.question}</p>
      </header>

      {c.sections.map((s) => (
        <section key={s.titre} className={`${CARTE} p-5 space-y-3`}>
          <h3 className="text-lg font-semibold text-slate-900">{s.titre}</h3>
          {s.paragraphes.map((p) => (
            <p key={p} className="text-base text-slate-600 leading-relaxed">
              {p}
            </p>
          ))}
        </section>
      ))}

      <section className={`${CARTE} p-5 space-y-3 bg-indigo-50/60 ring-indigo-200/60`}>
        <h3 className="text-lg font-semibold text-indigo-900">Appliquer</h3>
        <ul className="space-y-2.5">
          {c.appliquer.map((a) => (
            <li key={a} className="flex gap-2.5 text-base text-indigo-900 leading-relaxed">
              <span className="text-indigo-400 shrink-0" aria-hidden>
                →
              </span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-indigo-800/80 leading-relaxed border-t border-indigo-200/70 pt-3">
          Ces points traduisent un résultat de recherche en question à se poser.
          Aucun ne vous dit quoi acheter ni quand.
        </p>
      </section>

      <section className="space-y-3">
        <h3 className={SURTITRE}>
          Sources ({etudes.length}) — vérifiées une par une
        </h3>
        <ul className="space-y-3">
          {etudes.map((e) => (
            <FicheEtude key={e.cle} e={e} />
          ))}
        </ul>
      </section>

      <div className={`${CARTE} p-5 space-y-1`}>
        <p className={SURTITRE}>À retenir</p>
        <p className="text-lg text-slate-800 leading-snug">{c.aRetenir}</p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={onLu} className={lu ? BOUTON_DOUX : BOUTON_PRINCIPAL}>
          {lu ? "✓ Chapitre lu" : "Marquer comme lu"}
        </button>
        {suivant && (
          <button type="button" onClick={onSuivant} className={BOUTON_DOUX}>
            Chapitre {suivant.numero} →
          </button>
        )}
      </div>
    </article>
  );
}

export default function CoursPage() {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [lus, setLus] = useState<string[]>([]);

  useEffect(() => setLus(chapitresLus()), []);

  const chapitre = useMemo(
    () => CHAPITRES.find((c) => c.cle === ouvert) ?? null,
    [ouvert],
  );
  const suivant = chapitre
    ? (CHAPITRES.find((c) => c.numero === chapitre.numero + 1) ?? null)
    : null;

  // Ouvrir un chapitre remplace l'ecran sans changer d'URL : on remonte, comme
  // le fait la navigation principale entre onglets.
  useEffect(() => {
    if (ouvert) window.scrollTo({ top: 0, behavior: "auto" });
  }, [ouvert]);

  if (chapitre) {
    return (
      <VueChapitre
        c={chapitre}
        lu={lus.includes(chapitre.cle)}
        onLu={() => setLus(basculerLu(chapitre.cle))}
        onRetour={() => setOuvert(null)}
        suivant={suivant}
        onSuivant={() => suivant && setOuvert(suivant.cle)}
      />
    );
  }

  const progression = Math.round((lus.length / CHAPITRES.length) * 100);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">
          Comprendre, à partir des travaux publiés
        </h2>
        <p className="text-base text-slate-500 leading-snug">
          {CHAPITRES.length} chapitres, {dureeTotale()} minutes de lecture,{" "}
          {nombreReferences()} références vérifiées une par une.
        </p>
      </header>

      {lus.length > 0 && (
        <div className={`${CARTE} p-4 space-y-2`}>
          <div className="flex items-baseline justify-between gap-3">
            <span className={SURTITRE}>Votre progression</span>
            <span className="text-sm text-slate-600 tabular-nums">
              {lus.length} / {CHAPITRES.length}
            </span>
          </div>
          <div
            className="h-2 rounded-full bg-slate-100 overflow-hidden"
            role="progressbar"
            aria-valuenow={progression}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Chapitres lus"
          >
            <div
              className="h-full rounded-full bg-indigo-500 motion-safe:transition-all"
              style={{ width: `${progression}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            Enregistrée dans ce navigateur uniquement, jamais envoyée.
          </p>
        </div>
      )}

      <ol className="space-y-3">
        {CHAPITRES.map((c) => {
          const lu = lus.includes(c.cle);
          return (
            <li key={c.cle}>
              <button
                type="button"
                onClick={() => setOuvert(c.cle)}
                className={`${CARTE} w-full text-left p-4 flex items-start gap-3.5 motion-safe:transition-all hover:shadow-carteSurvol focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500`}
              >
                <span
                  className={`shrink-0 grid h-10 w-10 place-items-center rounded-2xl text-base font-semibold tabular-nums ${
                    lu ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}
                  aria-hidden
                >
                  {lu ? "✓" : c.numero}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-semibold text-slate-900 leading-snug">
                    {c.titre}
                  </span>
                  <span className="block text-sm text-slate-500 leading-normal mt-1">
                    {c.question}
                  </span>
                  <span className="block text-xs text-slate-500 mt-1.5 tabular-nums">
                    {c.minutes} min · {c.etudes.length} source
                    {c.etudes.length > 1 ? "s" : ""}
                    {lu && <span className="text-emerald-700"> · lu</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* La methode compte, mais elle ne doit pas s'interposer entre le
          lecteur et le premier chapitre : elle occupait un ecran entier avant
          le sommaire. Repliee, elle reste consultable en un geste. */}
      <Repliable
        id="cours-methode"
        titre="Comment ces cours sont sourcés"
        icone="🔬"
        resume="Ce qui a été vérifié, et ce que ces travaux ne disent pas."
      >
        <p>
          Chaque affirmation renvoie à un travail de recherche publié, identifié
          par son DOI et consultable d'un clic. Aucune référence n'a été écrite
          de mémoire : les {nombreReferences()} sources ont été vérifiées contre
          la base bibliographique de Crossref — titre, auteurs, année, revue —
          avant d'être intégrées, puis chaque DOI a été résolu pour confirmer
          qu'il pointe bien vers le travail cité.
        </p>
        <p>
          Chaque étude est présentée avec ses limites. Une étude sans ses
          limites se lit comme une loi de la nature ; aucune de celles-ci n'en
          est une. Ce sont des mesures, sur une période, un marché et un
          échantillon donnés — le plus souvent le marché américain, sur des
          périodes passées.
        </p>
        <p>
          Plusieurs chapitres concluent à l'inverse de ce qu'on espère en
          commençant, et deux d'entre eux nuancent directement l'intérêt des
          données que cet outil affiche par ailleurs. C'est volontaire : une
          formation qui ne contredit jamais l'outil qui l'héberge n'est pas une
          formation.
        </p>
      </Repliable>

      <p className="text-sm text-slate-500 leading-relaxed">
        Ces cours sont un contenu pédagogique et ne constituent pas un conseil
        en investissement. Ils décrivent des résultats de recherche et leurs
        limites ; ils ne tiennent pas compte de votre situation personnelle. Les
        performances passées ne préjugent pas des performances futures.
      </p>
    </div>
  );
}
