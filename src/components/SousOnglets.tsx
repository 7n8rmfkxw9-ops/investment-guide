import { useRef } from "react";

/**
 * Bascule entre deux ou trois vues d'une meme destination.
 *
 * Introduit en regroupant les destinations : l'application en comptait
 * quatorze, dont plusieurs paires qui traitaient du meme objet a deux endroits
 * differents — les pistes en cours et les pistes passees, les simulations et le
 * bilan, les reglages et le compte. Chercher a deux endroits ce qui est une
 * seule chose est un cout paye a chaque usage.
 *
 * Vrai motif d'onglets ARIA plutot qu'une rangee de boutons : un lecteur
 * d'ecran annonce « onglet 2 sur 3 », et les fleches gauche/droite deplacent la
 * selection comme partout ailleurs. Une rangee de boutons oblige a tabuler dans
 * chacun sans jamais dire combien il y en a.
 */

export interface Vue {
  cle: string;
  label: string;
  /** Compteur affiche a cote du libelle, quand il y a quelque chose a compter. */
  compte?: number;
}

export default function SousOnglets({
  base,
  vues,
  courante,
  onChange,
  etiquette,
}: {
  /** Prefixe d'identifiant, partage avec les panneaux. */
  base: string;
  vues: Vue[];
  courante: string;
  onChange: (cle: string) => void;
  /** Ce que ce groupe permet de choisir, pour la lecture vocale. */
  etiquette: string;
}) {
  const boutons = useRef<(HTMLButtonElement | null)[]>([]);
  const index = vues.findIndex((v) => v.cle === courante);

  function auClavier(e: React.KeyboardEvent) {
    const pas = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (pas === 0) return;
    e.preventDefault();
    // Circulaire : sur trois vues, revenir de la derniere a la premiere est
    // attendu, contrairement a un diaporama ou la fin est une fin.
    const suivant = (index + pas + vues.length) % vues.length;
    onChange(vues[suivant].cle);
    boutons.current[suivant]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={etiquette}
      onKeyDown={auClavier}
      className="flex gap-1 p-1 rounded-2xl bg-slate-100"
    >
      {vues.map((v, i) => {
        const actif = v.cle === courante;
        return (
          <button
            key={v.cle}
            ref={(el) => {
              boutons.current[i] = el;
            }}
            type="button"
            role="tab"
            id={idOnglet(base, v.cle)}
            aria-selected={actif}
            aria-controls={idPanneau(base, v.cle)}
            // Un seul arret de tabulation pour le groupe : on entre dans les
            // onglets, on circule aux fleches, on en ressort. C'est le
            // comportement attendu d'un `tablist`.
            tabIndex={actif ? 0 : -1}
            onClick={() => onChange(v.cle)}
            className={[
              "flex-1 min-h-[44px] px-3 rounded-xl text-sm font-medium",
              "transition-colors motion-safe:transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
              actif ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900",
            ].join(" ")}
          >
            {v.label}
            {v.compte !== undefined && (
              // slate-600 et non slate-500 : sur le fond gris de l'onglet
              // inactif, le slate-500 ne donne que 4,4:1, sous le seuil de
              // 4,5:1. Mesure faite avec axe-core.
              <span className="tabular-nums text-slate-600"> ({v.compte})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function idOnglet(base: string, cle: string): string {
  return `${base}-${cle}`;
}

function idPanneau(base: string, cle: string): string {
  return `${base}-${cle}-panneau`;
}

/**
 * Attributs du panneau associe a une vue.
 *
 * `tabIndex={0}` parce qu'un panneau d'onglet qui defile doit etre atteignable
 * au clavier : sans lui, un utilisateur au clavier ne peut pas faire defiler
 * une longue liste apres avoir choisi son onglet.
 */
export function panneau(base: string, cle: string) {
  return {
    id: idPanneau(base, cle),
    role: "tabpanel" as const,
    "aria-labelledby": idOnglet(base, cle),
    tabIndex: 0,
  };
}
