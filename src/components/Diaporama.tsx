import { useCallback, useEffect, useRef, useState } from "react";
import type { Chapitre, DiapoProjetee } from "../lib/cours";
import { construireDiapos } from "../lib/cours";
import { ETUDES, lienDoi } from "../lib/etudes";
import { BOUTON_DOUX, BOUTON_PRINCIPAL, CARTE, SURTITRE } from "../lib/theme";

/**
 * Diaporama d'un chapitre : une idee par ecran.
 *
 * Le cours etait d'abord une suite de paragraphes. Sur un telephone, cela
 * donnait un mur de texte que l'on parcourt sans le lire. Une diapositive
 * impose une contrainte utile : si l'idee ne tient pas sur un ecran, c'est
 * qu'il y en a deux.
 *
 * Trois facons d'avancer, parce qu'aucune ne convient a tout le monde :
 * les boutons, le balayage du doigt, les fleches du clavier. Et une vue
 * « tout lire » qui rend le chapitre d'un seul tenant — un diaporama est
 * penible a relire, a imprimer, ou a parcourir avec un lecteur d'ecran.
 */

function Coquille({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[22rem] flex flex-col justify-center gap-4">
      {children}
    </div>
  );
}

function ContenuDiapo({ d }: { d: DiapoProjetee }) {
  if (d.kind === "etude") {
    const e = ETUDES[d.cle];
    return (
      <Coquille>
        <p className={SURTITRE}>Source</p>
        <p className="text-xl font-semibold text-slate-900 leading-snug">
          {e.titre}
        </p>
        <p className="text-sm text-slate-500">
          {e.auteurs} · {e.annee} · {e.publication}
        </p>
        <p className="text-base text-slate-600 leading-relaxed">{e.resultat}</p>
        <div className="rounded-2xl bg-amber-50 px-4 py-3">
          <p className={`${SURTITRE} text-amber-700 mb-1`}>
            Ce que l'étude ne dit pas
          </p>
          <p className="text-sm text-amber-900 leading-relaxed">{e.limites}</p>
        </div>
        <a
          href={lienDoi(e.doi)}
          target="_blank"
          rel="noreferrer"
          className="text-sm text-indigo-700 underline decoration-indigo-300 underline-offset-2 min-h-[44px] flex items-center"
        >
          Lire la source · doi.org/{e.doi}
          <span className="sr-only"> (nouvel onglet)</span>
        </a>
      </Coquille>
    );
  }

  if (d.kind === "appliquer") {
    return (
      <Coquille>
        <p className={SURTITRE}>Appliquer</p>
        <ul className="space-y-3.5">
          {d.points.map((p) => (
            <li key={p} className="flex gap-3 text-lg text-slate-800 leading-snug">
              <span className="text-indigo-400 shrink-0" aria-hidden>
                →
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-slate-500 leading-relaxed">
          Des questions à se poser, jamais un ordre à passer.
        </p>
      </Coquille>
    );
  }

  if (d.kind === "retenir") {
    return (
      <Coquille>
        <p className={SURTITRE}>À retenir</p>
        <p className="text-2xl font-semibold text-slate-900 leading-tight">
          {d.texte}
        </p>
      </Coquille>
    );
  }

  const diapo = d.diapo;
  if (diapo.type === "chiffre") {
    return (
      <Coquille>
        <p className="text-5xl font-semibold text-indigo-600 tabular-nums leading-none">
          {diapo.valeur}
        </p>
        <p className="text-lg text-slate-700 leading-snug">{diapo.legende}</p>
        <p className="text-base text-slate-600 leading-relaxed">{diapo.texte}</p>
      </Coquille>
    );
  }
  if (diapo.type === "citation") {
    return (
      <Coquille>
        <blockquote className="border-l-4 border-indigo-300 pl-5">
          <p className="text-xl text-slate-800 leading-snug">{diapo.texte}</p>
        </blockquote>
        <p className="text-sm text-slate-500">{diapo.source}</p>
      </Coquille>
    );
  }
  if (diapo.type === "liste") {
    return (
      <Coquille>
        <p className="text-xl font-semibold text-slate-900 leading-snug">
          {diapo.titre}
        </p>
        <ul className="space-y-2.5">
          {diapo.points.map((p) => (
            <li key={p} className="flex gap-3 text-base text-slate-600 leading-relaxed">
              <span className="text-slate-400 shrink-0" aria-hidden>
                •
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </Coquille>
    );
  }
  return (
    <Coquille>
      <p className="text-xl font-semibold text-slate-900 leading-snug">
        {diapo.titre}
      </p>
      <p className="text-base text-slate-600 leading-relaxed">{diapo.texte}</p>
    </Coquille>
  );
}

export default function Diaporama({
  chapitre,
  onRetour,
  onTermine,
  suivant,
}: {
  chapitre: Chapitre;
  onRetour: () => void;
  onTermine: () => void;
  suivant: Chapitre | null;
}) {
  const diapos = construireDiapos(chapitre);
  const [i, setI] = useState(0);
  const [toutLire, setToutLire] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const depart = useRef<{ x: number; y: number } | null>(null);

  const aller = useCallback(
    (n: number) => setI((v) => Math.min(diapos.length - 1, Math.max(0, v + n))),
    [diapos.length],
  );

  // Le chapitre change : on repart de la premiere diapositive, sinon on
  // atterrit au milieu du suivant avec un compteur incoherent.
  useEffect(() => {
    setI(0);
    setToutLire(false);
  }, [chapitre.cle]);

  useEffect(() => {
    if (toutLire) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") aller(1);
      if (e.key === "ArrowLeft") aller(-1);
    };
    window.addEventListener("keydown", surTouche);
    return () => window.removeEventListener("keydown", surTouche);
  }, [aller, toutLire]);

  const derniere = i === diapos.length - 1;

  if (toutLire) {
    return (
      <div className="space-y-5">
        <EnTete c={chapitre} onRetour={onRetour} />
        <button
          type="button"
          onClick={() => setToutLire(false)}
          className={BOUTON_DOUX}
        >
          Revenir au diaporama
        </button>
        {diapos.map((d, n) => (
          <div key={n} className={`${CARTE} p-5`}>
            <ContenuDiapo d={d} />
          </div>
        ))}
        <button type="button" onClick={onTermine} className={BOUTON_PRINCIPAL}>
          Marquer ce chapitre comme lu
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <EnTete c={chapitre} onRetour={onRetour} />

      {/* Barre de progression : on doit savoir combien il reste avant de
          s'engager, sinon on abandonne au milieu sans savoir où l'on en est. */}
      <div className="flex items-center gap-3">
        <div
          className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden"
          role="progressbar"
          aria-valuenow={i + 1}
          aria-valuemin={1}
          aria-valuemax={diapos.length}
          aria-label={`Diapositive ${i + 1} sur ${diapos.length}`}
        >
          <div
            className="h-full rounded-full bg-indigo-500 motion-safe:transition-all"
            style={{ width: `${((i + 1) / diapos.length) * 100}%` }}
          />
        </div>
        <span className="text-sm text-slate-500 tabular-nums shrink-0">
          {i + 1} / {diapos.length}
        </span>
      </div>

      <div
        ref={zone}
        // Balayage horizontal. Le seuil vertical evite de changer de
        // diapositive quand l'utilisateur voulait simplement faire defiler.
        onPointerDown={(e) => (depart.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const d = depart.current;
          depart.current = null;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            aller(dx < 0 ? 1 : -1);
          }
        }}
        className={`${CARTE} p-6 touch-pan-y select-none`}
      >
        {/* `key` : chaque diapositive est un nouveau noeud, ce qui rejoue
            l'animation d'entree. `aria-live` annonce le changement a un
            lecteur d'ecran, qui ne verrait rien bouger autrement. */}
        <div key={i} aria-live="polite" className="motion-safe:animate-entreePage">
          <ContenuDiapo d={diapos[i]} />
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => aller(-1)}
          disabled={i === 0}
          className={`${BOUTON_DOUX} disabled:opacity-30`}
        >
          ← Précédent
        </button>
        {derniere ? (
          <button type="button" onClick={onTermine} className={`${BOUTON_PRINCIPAL} flex-1`}>
            {suivant ? `Terminer · chapitre ${suivant.numero} →` : "Terminer le chapitre"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => aller(1)}
            className={`${BOUTON_PRINCIPAL} flex-1`}
          >
            Suivant →
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => setToutLire(true)}
        className="w-full min-h-[44px] text-sm text-slate-500 hover:text-slate-800 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        Tout lire d'un seul tenant
      </button>
    </div>
  );
}

function EnTete({ c, onRetour }: { c: Chapitre; onRetour: () => void }) {
  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onRetour}
        className="min-h-[44px] -my-2 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        ← Tous les chapitres
      </button>
      <p className={SURTITRE}>Chapitre {c.numero} · {c.minutes} min</p>
      <h2 className="text-2xl font-semibold text-slate-900 leading-tight">
        {c.titre}
      </h2>
    </div>
  );
}
