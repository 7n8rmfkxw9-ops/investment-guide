import { useId, useState } from "react";
import { COURTIERS } from "../lib/courtiers";

interface Props {
  /** Nom de l'entreprise ou de l'ETF, utilise pour prefiltrer une recherche. */
  nom: string;
  ticker?: string | null;
}

/**
 * Bouton d'achat, au sens exact ou l'utilisateur l'a demande apres avoir ete
 * prevenu que cela depassait le principe initial de l'outil (aucun bouton
 * d'achat, aucun lien profond) : un lien qui ouvre le site d'un courtier,
 * jamais un ordre passe par l'outil lui-meme.
 *
 * Aucune donnee de compte, de paiement ou d'identifiants ne transite ici —
 * seul un lien s'ouvre dans un nouvel onglet, vers un site que l'utilisateur
 * choisit lui-meme parmi plusieurs. C'est la limite qui distingue ce bouton
 * d'une integration courtier : l'outil ne sait jamais si l'achat a eu lieu.
 *
 * Presentation volontairement discrete depuis la refonte. Il occupait
 * auparavant un bouton pleine largeur, vert — la couleur du feu vert — a
 * poids egal avec « s'entrainer ». Le design disait donc « acheter vaut
 * s'entrainer », alors que tout l'outil est construit sur l'inverse. Le geste
 * reste accessible en un clic ; il n'est simplement plus mis en avant.
 */
export default function AchatCourtierButton({ nom, ticker }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const requete = ticker ? `${nom} ${ticker}` : nom;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        aria-expanded={ouvert}
        aria-controls={id}
        className="min-h-[44px] -my-1 py-1 text-sm text-slate-600 hover:text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-slate-500 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        {ouvert
          ? "− Masquer les courtiers"
          : "Pour investir réellement, ouvrez votre application de courtage"}
      </button>
      {ouvert && (
        <div id={id} className="mt-2.5 space-y-2">
          <p className="text-sm text-slate-600 leading-relaxed px-1">
            Chaque lien ouvre le site du courtier dans un nouvel onglet. Vous
            achetez avec votre propre compte, sous votre seule responsabilité :
            cet outil ne transmet aucun ordre et ne voit jamais votre compte.
            Vérifiez l'agrément dans le{" "}
            <a
              href="https://www.fsma.be/fr/data-portal"
              target="_blank"
              rel="noreferrer"
              className="text-indigo-700 underline decoration-indigo-300 hover:decoration-indigo-600"
            >
              registre de la FSMA
            </a>{" "}
            avant tout dépôt.
          </p>
          <ul className="divide-y divide-slate-100 border border-slate-200/70 rounded-xl overflow-hidden bg-white">
            {COURTIERS.map((c) => (
              <li key={c.nom}>
                <a
                  href={c.recherche ? c.recherche(requete) : c.lien}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 px-3.5 py-3 min-h-[56px] text-sm hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500"
                >
                  <span>
                    <span className="font-medium text-slate-800">{c.nom}</span>
                    <span className="block text-xs text-slate-500">{c.note}</span>
                  </span>
                  <span className="text-xs text-slate-500 shrink-0">
                    {c.recherche ? `rechercher « ${nom} » →` : "ouvrir →"}
                    <span className="sr-only"> (nouvel onglet)</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
