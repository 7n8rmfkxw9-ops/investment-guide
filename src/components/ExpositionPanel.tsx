import type { Simulation } from "../lib/types";
import { calculeExposition, concentrationsNotables } from "../lib/exposition";
import type { LigneExposition, PositionExposee } from "../lib/exposition";
import { formatEur } from "../lib/simulation";
import { CARTE } from "../lib/theme";

/**
 * Exposition agregee des simulations ouvertes.
 *
 * Cinq positions dont quatre sur le meme pays ne sont pas cinq paris : c'est
 * un seul pari repete quatre fois. Aucune fiche prise isolement ne peut le
 * montrer — d'ou cette vue. Elle decrit ce qui est deja engage, ne recommande
 * jamais d'acheter ni de vendre, et ne se declenche qu'a partir de deux
 * positions, ou la question de la repartition commence a se poser.
 */

function Barre({ lignes }: { lignes: LigneExposition[] }) {
  if (lignes.length === 0) {
    return <p className="text-xs text-slate-400">Donnée indisponible.</p>;
  }
  return (
    <ul className="space-y-1.5">
      {lignes.map((l) => (
        <li key={l.cle} className="text-sm">
          <div className="flex justify-between gap-3 text-slate-600">
            <span className="truncate">{l.libelle}</span>
            <span className="tabular-nums shrink-0 text-slate-500">
              {l.partPct.toFixed(0)} %{" "}
              <span className="text-xs text-slate-400">
                ({formatEur(l.montantEur)})
              </span>
            </span>
          </div>
          <div className="mt-0.5 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-400"
              style={{ width: `${Math.min(100, l.partPct)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ExpositionPanel({ sims }: { sims: Simulation[] }) {
  // Seules les positions ouvertes constituent une exposition : une simulation
  // cloturee n'engage plus rien.
  const positions: PositionExposee[] = sims
    .filter((s) => !s.closed_at)
    .map((s) => ({
      symbole: s.symbole,
      devise: s.devise,
      secteur: s.secteur,
      montantEur: Number(s.montant_eur),
    }));

  if (positions.length < 2) return null;

  const e = calculeExposition(positions);
  const alertes = concentrationsNotables(e);

  return (
    <div className={`${CARTE} p-5 space-y-4`}>
      <div>
        <h3 className="font-semibold text-slate-800">Votre exposition</h3>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">
          Ce que vos {e.positions} positions ouvertes représentent une fois
          additionnées — {formatEur(e.totalEur)} engagés. Plusieurs lignes ne
          font pas une répartition : c'est ici que ça se voit.
        </p>
      </div>

      {alertes.length > 0 && (
        <ul className="space-y-1.5">
          {alertes.map((m) => (
            <li
              key={m}
              className="text-sm text-amber-800 bg-amber-50 border border-amber-200/70 rounded-xl px-3.5 py-2.5"
            >
              {m}
            </li>
          ))}
        </ul>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Par place de cotation
          </p>
          <Barre lignes={e.parPays} />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Par devise
          </p>
          <Barre lignes={e.parDevise} />
          {e.horsEuroPct > 0 && (
            <p className="text-xs text-slate-500 leading-relaxed">
              {e.horsEuroPct.toFixed(0)} % hors zone euro : sur cette part, le
              taux de change compte autant que le cours, et la conversion se
              paie à l'aller comme au retour.
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-wide text-slate-400">
          Par secteur
        </p>
        <Barre lignes={e.parSecteur} />
        {e.secteurInconnuPct > 0 && (
          <p className="text-xs text-slate-500 leading-relaxed">
            Secteur inconnu pour {e.secteurInconnuPct.toFixed(0)} % du total :
            il n'est repris que sur les simulations parties d'une piste. Les
            données de cotation publiques ne l'exposent pas librement, et une
            répartition sectorielle incomplète présentée comme complète serait
            trompeuse.
          </p>
        )}
      </div>

      <p className="text-xs text-slate-400 leading-relaxed border-t border-slate-100 pt-3">
        Ces chiffres décrivent ce que vous avez déjà engagé. Ils ne disent pas
        qu'une répartition serait meilleure qu'une autre, et ne constituent pas
        un conseil.
      </p>
    </div>
  );
}
