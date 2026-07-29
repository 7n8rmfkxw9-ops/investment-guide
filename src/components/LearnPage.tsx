import { useState } from "react";
import { LEXIQUE, EXPLICATIONS } from "../lib/glossaire";
import { SIGNAL_LABELS } from "../lib/types";
import type { SignalType } from "../lib/types";

function Card({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-slate-200/80 rounded-xl p-5 space-y-3">
      <h2 className="font-semibold text-slate-800">{titre}</h2>
      <div className="text-sm text-slate-600 leading-relaxed space-y-3">
        {children}
      </div>
    </section>
  );
}

export default function LearnPage() {
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [signal, setSignal] = useState<SignalType>("form4_buy");
  const exp = EXPLICATIONS[signal];

  return (
    <div className="space-y-4">
      <Card titre="En une minute : à quoi sert cet outil">
        <p>
          Aux États-Unis, la loi oblige deux catégories de personnes à rendre
          publiques leurs opérations en bourse : les très gros gestionnaires de
          fonds, et les dirigeants qui achètent ou vendent des actions de leur
          propre entreprise.
        </p>
        <p>
          Cet outil lit automatiquement ces déclarations officielles chaque
          semaine et vous les présente en français, avec leurs limites. Il ne
          prédit rien, ne note rien, et ne vous dira jamais d'acheter. Il vous
          donne de la matière pour vous forger votre propre opinion.
        </p>
      </Card>

      <Card titre="Comment lire une fiche, ligne par ligne">
        <ul className="space-y-2">
          <li>
            <strong className="text-slate-800">Le titre</strong> — l'entreprise
            concernée, et son code boursier entre parenthèses (le « ticker »).
          </li>
          <li>
            <strong className="text-slate-800">L'étiquette de couleur</strong> —
            le type de signal. Orange pour une opération de dirigeant (donnée
            fraîche, publiée sous 2 jours), bleu pour une déclaration
            trimestrielle de fonds (donnée pouvant dater de plusieurs mois).
          </li>
          <li>
            <strong className="text-slate-800">Source</strong> — qui a déclaré
            l'opération, avec le lien vers le document officiel. Vous pouvez
            toujours aller vérifier vous-même : rien n'est inventé.
          </li>
          <li>
            <strong className="text-slate-800">Contexte</strong> — le résumé de
            ce qui s'est passé, en français.
          </li>
          <li>
            <strong className="text-slate-800">Coût de transaction</strong> —
            combien vos frais représentent sur la somme que vous envisagez, et
            ce que votre placement doit gagner rien que pour les couvrir.
          </li>
          <li>
            <strong className="text-slate-800">
              Le rappel gris en bas
            </strong>{" "}
            — les limites de la donnée. Il est volontairement impossible de le
            masquer.
          </li>
        </ul>
      </Card>

      <Card titre="Les signaux, expliqués un par un">
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SIGNAL_LABELS) as SignalType[]).map((s) => (
            <button
              key={s}
              onClick={() => setSignal(s)}
              className={`text-xs px-2.5 py-1.5 rounded-full border transition ${
                signal === s
                  ? "bg-slate-800 text-white border-slate-800"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
              }`}
            >
              {SIGNAL_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="pt-1 space-y-3">
          <p className="font-medium text-slate-800">{exp.titre}</p>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Ce que c'est
            </p>
            <p>{exp.cequecest}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
              Ce que cela ne dit pas
            </p>
            <p>{exp.cequecelanedit}</p>
          </div>
        </div>
      </Card>

      <Card titre="Pourquoi vous ne verrez jamais de note ni de recommandation">
        <p>
          Beaucoup d'applications affichent des scores du type « 72 % de chances
          de hausse ». Ces chiffres n'ont aucune valeur démontrée : ils donnent
          une impression de précision qui pousse à agir avec une confiance
          injustifiée.
        </p>
        <p>
          Cet outil a été conçu pour faire l'inverse. Pas de score, pas de
          notification pressante, pas de bouton d'achat. Chaque fiche affiche au
          contraire son degré d'incertitude. L'objectif est que vous décidiez
          lentement, en comprenant, et jamais sous le coup de l'urgence.
        </p>
      </Card>

      <Card titre="Lexique — tous les mots employés dans l'application">
        <p className="text-xs text-slate-500">
          Touchez un mot pour voir sa définition complète.
        </p>
        <div className="divide-y divide-slate-100 -mx-1">
          {LEXIQUE.map((t) => {
            const open = ouvert === t.mot;
            return (
              <div key={t.mot} className="py-2.5 px-1">
                <button
                  className="w-full text-left"
                  onClick={() => setOuvert(open ? null : t.mot)}
                >
                  <span className="font-medium text-slate-800">{t.mot}</span>
                  <span className="text-slate-500"> — {t.court}</span>
                </button>
                {open && t.long && (
                  <p className="mt-2 text-slate-600 bg-slate-50 rounded-lg p-3">
                    {t.long}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
