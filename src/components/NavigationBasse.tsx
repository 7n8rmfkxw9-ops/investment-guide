import { forwardRef, useEffect, useRef } from "react";
import {
  libellePlus,
  ONGLETS_PRINCIPAUX,
  ONGLETS_SECONDAIRES,
} from "../lib/onglets";
import type { Onglet } from "../lib/onglets";
import { estPrincipal } from "../lib/onglets";

/**
 * Navigation principale, en bas de l'ecran.
 *
 * Trois raisons de l'avoir descendue : c'est la zone atteignable au pouce sur
 * un telephone tenu d'une main, c'est la convention du systeme sur lequel
 * cette application est installee, et cela libere le haut de l'ecran pour le
 * contenu. L'ancienne barre haute, defilante, cachait huit destinations sur
 * onze — un utilisateur ne peut pas choisir ce qu'il ne voit pas.
 *
 * Accessibilite :
 *  - `aria-current="page"` porte l'etat actif, pas seulement la couleur ;
 *  - chaque cible fait au moins 56 px de haut, au-dela des 44 px recommandes ;
 *  - les emojis sont `aria-hidden` : le libelle textuel est toujours present,
 *    donc jamais de destination annoncee « globe terrestre » ;
 *  - la feuille « Plus » est une vraie boite de dialogue modale : Echap la
 *    ferme, le focus y entre et revient sur le bouton d'origine a la sortie.
 */

interface Props {
  courant: Onglet;
  onChoisir: (o: Onglet) => void;
  plusOuvert: boolean;
  onPlus: (ouvert: boolean) => void;
}

function classeCible(actif: boolean): string {
  return [
    "flex-1 min-w-0 min-h-[56px] flex flex-col items-center justify-center gap-0.5",
    "px-1 py-1.5 rounded-xl transition-colors",
    // L'anneau de focus est visible au clavier et invisible a la souris :
    // sans lui, naviguer au clavier revient a avancer les yeux fermes.
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-white",
    actif ? "text-indigo-700" : "text-slate-500 hover:text-slate-800",
  ].join(" ");
}

type PropsCible = {
  icone: string;
  label: string;
  actif: boolean;
  onClick: () => void;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

const Cible = forwardRef<HTMLButtonElement, PropsCible>(function Cible(
  { icone, label, actif, onClick, ...reste },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-current={actif ? "page" : undefined}
      className={classeCible(actif)}
      {...reste}
    >
      <span className="text-lg leading-none" aria-hidden>
        {icone}
      </span>
      <span
        className={`text-[11px] leading-tight truncate max-w-full ${
          actif ? "font-semibold" : ""
        }`}
      >
        {label}
      </span>
      {/* Repere non colore de l'onglet actif : le daltonisme ne doit pas
          priver de l'information « vous etes ici ». */}
      <span
        className={`block h-0.5 w-5 rounded-full ${
          actif ? "bg-indigo-600" : "bg-transparent"
        }`}
        aria-hidden
      />
    </button>
  );
});

export default function NavigationBasse({
  courant,
  onChoisir,
  plusOuvert,
  onPlus,
}: Props) {
  const boutonPlus = useRef<HTMLButtonElement>(null);
  const feuille = useRef<HTMLDivElement>(null);
  const plus = libellePlus(courant);
  const plusActif = !estPrincipal(courant) || plusOuvert;

  // Echap ferme la feuille, et le focus entre dedans a l'ouverture puis
  // revient sur le bouton a la fermeture : sans ce retour, un utilisateur au
  // clavier se retrouve projete en haut du document apres chaque passage.
  useEffect(() => {
    if (!plusOuvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onPlus(false);
    };
    document.addEventListener("keydown", surTouche);
    const premier = feuille.current?.querySelector<HTMLElement>("button, a");
    premier?.focus();
    return () => {
      document.removeEventListener("keydown", surTouche);
      boutonPlus.current?.focus();
    };
  }, [plusOuvert, onPlus]);

  return (
    <>
      {plusOuvert && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/40 motion-safe:animate-[fadeIn_120ms_ease-out]"
          onClick={() => onPlus(false)}
          aria-hidden
        />
      )}

      {plusOuvert && (
        <div
          ref={feuille}
          role="dialog"
          aria-modal="true"
          aria-labelledby="titre-plus"
          className="fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl max-h-[80vh] overflow-y-auto"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 5.5rem)" }}
        >
          <div className="max-w-3xl mx-auto px-4 pt-3 pb-2">
            <div
              className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300"
              aria-hidden
            />
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 id="titre-plus" className="font-semibold text-slate-800">
                Toutes les rubriques
              </h2>
              <button
                type="button"
                onClick={() => onPlus(false)}
                className="min-h-[44px] px-3 -mr-2 text-sm text-slate-500 hover:text-slate-800 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Fermer
              </button>
            </div>
            <ul className="divide-y divide-slate-100">
              {ONGLETS_SECONDAIRES.map((o) => {
                const actif = o.id === courant;
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onChoisir(o.id);
                        onPlus(false);
                      }}
                      aria-current={actif ? "page" : undefined}
                      className={`w-full text-left flex items-start gap-3 py-3 px-2 -mx-2 rounded-xl min-h-[56px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                        actif ? "bg-indigo-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <span className="text-xl leading-none mt-0.5" aria-hidden>
                        {o.icone}
                      </span>
                      <span className="min-w-0">
                        <span
                          className={`block ${actif ? "font-semibold text-indigo-800" : "font-medium text-slate-800"}`}
                        >
                          {o.label}
                          {actif && (
                            <span className="ml-2 text-xs font-normal text-indigo-700">
                              page actuelle
                            </span>
                          )}
                        </span>
                        <span className="block text-sm text-slate-500 leading-relaxed">
                          {o.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      <nav
        aria-label="Navigation principale"
        className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="max-w-3xl mx-auto px-1.5 flex items-stretch">
          {ONGLETS_PRINCIPAUX.map((o) => (
            <li key={o.id} className="flex-1 min-w-0 flex">
              <Cible
                icone={o.icone}
                label={o.label}
                actif={o.id === courant && !plusOuvert}
                onClick={() => {
                  onPlus(false);
                  onChoisir(o.id);
                }}
              />
            </li>
          ))}
          <li className="flex-1 min-w-0 flex">
            <Cible
              ref={boutonPlus}
              icone={plus.icone}
              label={plus.label}
              actif={plusActif}
              onClick={() => onPlus(!plusOuvert)}
              aria-haspopup="dialog"
              aria-expanded={plusOuvert}
            />
          </li>
        </ul>
      </nav>
    </>
  );
}
