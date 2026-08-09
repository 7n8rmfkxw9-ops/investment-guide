import { CARTE } from "../lib/theme";

/**
 * Section repliable, batie sur `<details>`/`<summary>` natifs.
 *
 * Le choix du natif plutot que d'un accordeon maison n'est pas de la
 * paresse : le navigateur fournit deja le comportement clavier, l'annonce
 * « developpe / reduit » aux lecteurs d'ecran, et la recherche dans la page
 * qui ouvre automatiquement la section contenant le terme cherche. Une
 * reimplementation en `useState` perd ce dernier point sans que personne ne
 * s'en apercoive avant qu'un utilisateur ne cherche un mot introuvable.
 *
 * Mesure a l'origine de ce composant : « Comprendre » faisait douze ecrans de
 * prose d'affilee sur un telephone, sans sommaire ni repere. Le contenu etait
 * bon, il etait juste impossible d'y retrouver quoi que ce soit.
 */

interface Props {
  id: string;
  titre: string;
  /** Une ligne pour decider d'ouvrir sans avoir a ouvrir. */
  resume?: string;
  icone?: string;
  /** Ouverte au chargement : reserver aux sections d'entree. */
  ouvertParDefaut?: boolean;
  children: React.ReactNode;
}

export default function Repliable({
  id,
  titre,
  resume,
  icone,
  ouvertParDefaut = false,
  children,
}: Props) {
  return (
    <details
      id={id}
      open={ouvertParDefaut}
      className={`${CARTE} overflow-hidden group scroll-mt-24 motion-safe:transition-shadow open:shadow-carteSurvol`}
    >
      <summary
        className={[
          "list-none cursor-pointer select-none px-5 py-4 min-h-[60px]",
          "flex items-start gap-3.5 hover:bg-slate-50/80 transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
          "focus-visible:ring-indigo-500",
          // Safari affiche un triangle par defaut : on le retire pour poser le
          // notre, qui indique aussi le sens par la rotation.
          "[&::-webkit-details-marker]:hidden [&::marker]:content-['']",
        ].join(" ")}
      >
        {icone && (
          <span className="text-xl leading-none mt-0.5" aria-hidden>
            {icone}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-semibold text-slate-900 leading-snug">
            {titre}
          </span>
          {resume && (
            <span className="block text-sm text-slate-500 leading-normal mt-1">
              {resume}
            </span>
          )}
        </span>
        {/* Chevron : l'etat reste lisible sans couleur, et l'animation est
            desactivee si le systeme demande de reduire les animations. */}
        <span
          className="shrink-0 mt-1.5 grid h-7 w-7 place-items-center rounded-full bg-slate-100 text-slate-600 text-xs motion-safe:transition-transform group-open:rotate-180"
          aria-hidden
        >
          ▾
        </span>
      </summary>
      <div className="px-5 pb-5 pt-1 text-base text-slate-600 leading-relaxed space-y-3">
        {children}
      </div>
    </details>
  );
}
