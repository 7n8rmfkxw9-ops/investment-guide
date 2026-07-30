import { useState } from "react";
import { LEXIQUE, EXPLICATIONS } from "../lib/glossaire";
import { SIGNAL_LABELS } from "../lib/types";
import type { SignalType } from "../lib/types";
import { CARTE } from "../lib/theme";

function Card({
  titre,
  children,
}: {
  titre: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${CARTE} p-5 space-y-3`}>
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

      <Card titre="États-Unis et Europe : deux règles différentes">
        <p>
          Vous verrez deux origines de pistes, et il est important de ne pas les
          confondre.
        </p>
        <ul className="space-y-2">
          <li>
            <strong className="text-slate-800">États-Unis</strong> — les
            dirigeants déclarent leurs opérations (Form 4), et en plus les gros
            gestionnaires publient chaque trimestre l'intégralité de leur
            portefeuille (13F). C'est une transparence exceptionnelle : elle
            n'existe nulle part ailleurs.
          </li>
          <li>
            <strong className="text-slate-800">Europe</strong> — les dirigeants
            déclarent également leurs opérations, au titre du règlement européen
            sur les abus de marché, mais{" "}
            <strong>il n'existe pas de registre européen unique</strong> :
            chaque pays publie les siennes de son côté. En revanche,{" "}
            <strong>l'équivalent du 13F n'existe pas</strong> : aucun fonds
            européen n'est tenu de publier tout son portefeuille chaque
            trimestre. Vous ne verrez donc pas de piste « nouvelle position d'un
            grand fonds » sur une société européenne — non par oubli de l'outil,
            mais parce que l'information n'est pas publique.
          </li>
        </ul>
        <p>
          Deuxième différence : en Europe, l'obligation de déclarer ne démarre
          qu'au-delà de 20 000 € cumulés sur l'année pour un même dirigeant. Les
          petites opérations passent donc sous le radar, alors qu'aux États-Unis
          tout achat ou vente est déclaré.
        </p>
      </Card>

      <Card titre="Quels pays européens sont couverts, et pourquoi pas tous">
        <p>
          Le règlement est européen, mais sa publication ne l'est pas : il n'y a
          pas de base de données commune. Chaque régulateur national publie ses
          déclarations dans son propre format, et tous ne sont pas exploitables
          automatiquement.
        </p>
        <ul className="space-y-2">
          <li>
            <strong className="text-slate-800">Belgique — couverte.</strong> La
            FSMA publie un registre consultable, opération par opération, avec
            le nom du dirigeant, la quantité, le prix et le montant.
          </li>
          <li>
            <strong className="text-slate-800">Suède — couverte.</strong>{" "}
            Finansinspektionen publie l'un des meilleurs registres d'Europe : un
            fichier complet, téléchargeable, qui indique en plus si l'opération
            relève d'un programme de stock-options.
          </li>
          <li>
            <strong className="text-slate-800">
              Pays-Bas, France, Allemagne — pas encore.
            </strong>{" "}
            Leurs registres existent et sont publics, mais soit ils ne
            publient pas le sens de l'opération, la quantité et le prix dans un
            format lisible par un programme, soit la consultation passe par un
            site qui ne fonctionne qu'avec un navigateur. Reprendre ces données
            demanderait de copier des pages de sites tiers, ce que cet outil
            s'interdit : il ne lit que des sources officielles mises à
            disposition pour cela.
          </li>
        </ul>
        <p>
          Autrement dit, l'absence d'une société française ou allemande ne
          signifie pas qu'il ne s'y passe rien : cela signifie que la donnée
          n'est pas disponible proprement. C'est une limite de l'outil, et il
          vaut mieux que vous la connaissiez.
        </p>
      </Card>

      <Card titre="S'entraîner avant de risquer quoi que ce soit">
        <p>
          L'onglet <strong>S'entraîner</strong> permet d'enregistrer un achat
          fictif : vous choisissez une société, une somme et une date, et l'outil
          retient le vrai cours de ce jour-là. Ensuite il suit ce que votre
          décision aurait donné. Rien n'est acheté, aucun compte n'est débité.
        </p>
        <p>Trois choses s'y apprennent mieux que dans n'importe quel texte.</p>
        <ul className="space-y-2">
          <li>
            <strong className="text-slate-800">Les frais</strong> — vous partez
            perdant. Sur 50 € avec 1 € de frais, il faut déjà gagner environ 4 %
            pour revenir à zéro. La simulation le montre dès l'enregistrement,
            avant même que le cours ait bougé.
          </li>
          <li>
            <strong className="text-slate-800">Le temps</strong> — trois jours ne
            prouvent rien. Une hausse peut n'être que du bruit. C'est en laissant
            passer des mois qu'on distingue une intuition d'un coup de chance.
          </li>
          <li>
            <strong className="text-slate-800">La comparaison</strong> — chaque
            simulation est confrontée à la même somme placée le même jour sur un
            ETF actions mondiales. C'est la seule question qui compte vraiment :
            votre choix valait-il mieux que <em>ne pas choisir</em> ? Le plus
            souvent la réponse est non, y compris pour des professionnels — et
            c'est exactement ce que l'exercice doit vous faire constater
            vous-même.
          </li>
        </ul>
        <p>
          Un piège à connaître : choisir une date passée en sachant déjà ce qui
          s'est produit ne prouve rien. On trouve toujours une date où un achat
          aurait été brillant. L'entraînement n'a de valeur que si vous décidez
          d'abord et regardez ensuite.
        </p>
        <p>
          Le champ « pourquoi ce choix » est le plus utile de tous. Relire dans
          six mois ce que vous pensiez au moment de décider vous en apprendra
          davantage sur vous que le résultat lui-même.
        </p>
      </Card>

      <Card titre="Marché et Journal : lire des faits, jamais des prédictions">
        <p>
          L'onglet <strong>Marché</strong> affiche le cours d'une société, sa
          fourchette sur un an et l'ampleur de ses secousses passées — des faits,
          jamais une prévision. Un comparateur y montre ce qu'auraient donné,
          sur des cours <em>déjà connus</em>, des achats mensuels réguliers face
          à deux bornes théoriques impossibles à connaître à l'avance : le
          meilleur et le pire moment. Personne ne peut deviner ces bornes avant
          coup ; l'exercice sert seulement à comprendre pourquoi étaler ses
          achats évite d'avoir à deviner.
        </p>
        <p>
          L'onglet <strong>Journal</strong> relaie les actualités et les mises en
          garde publiées par la FSMA, ainsi qu'une sélection de ses fiches
          d'éducation financière (Wikifin). Rien n'y est résumé ou réécrit :
          vous lisez le régulateur lui-même, y compris ses avertissements contre
          des acteurs non agréés — la lecture la plus utile pour se protéger
          d'une arnaque.
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
                  ? "bg-indigo-600 text-white border-indigo-600"
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
