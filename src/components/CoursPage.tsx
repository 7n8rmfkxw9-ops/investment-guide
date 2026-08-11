import { useEffect, useMemo, useState } from "react";
import {
  basculerLu,
  chapitresLus,
  CHAPITRES,
  construireDiapos,
  dureeTotale,
  nombreReferences,
  PARTIES,
} from "../lib/cours";
import { CARTE, SURTITRE } from "../lib/theme";
import Repliable from "./Repliable";
import Diaporama from "./Diaporama";

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
      <Diaporama
        chapitre={chapitre}
        suivant={suivant}
        onRetour={() => setOuvert(null)}
        onTermine={() => {
          if (!lus.includes(chapitre.cle)) setLus(basculerLu(chapitre.cle));
          // Enchainer sur le chapitre suivant plutot que de renvoyer a la
          // liste : c'est ce qu'on attend d'un cours qu'on suit.
          setOuvert(suivant ? suivant.cle : null);
        }}
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
          {CHAPITRES.length} chapitres en {PARTIES.length} parties,{" "}
          {dureeTotale()} minutes, {nombreReferences()} références vérifiées une
          par une. Chaque chapitre finit par un quiz.
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

      {/* Regroupement par partie : un programme se lit comme un plan de cours,
          pas comme dix-huit entrées à la file. */}
      {PARTIES.map((partie) => (
        <section key={partie.cle} className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{partie.titre}</h3>
            <p className="text-sm text-slate-500 leading-snug">{partie.sousTitre}</p>
          </div>
          <ol className="space-y-3">
            {CHAPITRES.filter((c) => c.partie === partie.cle).map((c) => {
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
                        {construireDiapos(c).length} écrans · {c.minutes} min ·{" "}
                        {c.etudes.length > 0
                          ? `${c.etudes.length} source${c.etudes.length > 1 ? "s" : ""}`
                          : "arithmétique"}
                        {lu && <span className="text-emerald-700"> · lu</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </section>
      ))}

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
