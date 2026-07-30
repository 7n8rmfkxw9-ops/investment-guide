import { useState } from "react";
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
 */
export default function AchatCourtierButton({ nom, ticker }: Props) {
  const [ouvert, setOuvert] = useState(false);
  const requete = ticker ? `${nom} ${ticker}` : nom;

  return (
    <div>
      <button
        onClick={() => setOuvert(!ouvert)}
        className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100 transition"
      >
        🏦 {ouvert ? "− Masquer les courtiers" : `Acheter ${nom} chez un courtier`}
      </button>
      {ouvert && (
        <div className="mt-2.5 space-y-2">
          <p className="text-xs text-slate-500 leading-relaxed px-1">
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
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm hover:bg-slate-50 transition"
                >
                  <span>
                    <span className="font-medium text-slate-800">{c.nom}</span>
                    <span className="block text-xs text-slate-400">{c.note}</span>
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {c.recherche ? `rechercher « ${nom} » →` : "ouvrir →"}
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
