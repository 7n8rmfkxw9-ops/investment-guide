import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  computeFeeImpact,
  DEFAULT_TOB_PCT,
  FEE_WARNING_THRESHOLD_PCT,
} from "../lib/fees";
import { CARTE } from "../lib/theme";

/**
 * Page "Investir" : information pedagogique pour passer a l'acte par soi-meme.
 * Conformement au principe de l'outil, aucune integration courtier, aucun
 * bouton d'achat, aucun lien profond vers un tunnel de commande — uniquement
 * de quoi comprendre et choisir seul.
 */

function Section({
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

export default function InvestPage() {
  const [montant, setMontant] = useState("50");
  const [frais, setFrais] = useState("1");
  const [tob, setTob] = useState(String(DEFAULT_TOB_PCT));

  useEffect(() => {
    supabase
      .from("settings")
      .select("*")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFrais(String(data.broker_fixed_fee_eur));
          setMontant(String(data.position_size_eur));
          if (data.tob_pct != null) setTob(String(data.tob_pct));
        }
      });
  }, []);

  const m = Number(montant.replace(",", ".")) || 0;
  const f = Number(frais.replace(",", ".")) || 0;
  const t = Number(tob.replace(",", ".")) || 0;
  const impact = computeFeeImpact(f, m, t);
  const pct = (v: number) =>
    isFinite(v) ? `${v.toFixed(2).replace(".", ",")} %` : "—";

  return (
    <div className="space-y-4">
      <Section titre="Avant tout : ce que cet outil ne fait pas">
        <p>
          Cet outil vous montre ce que déclarent de gros investisseurs et des
          dirigeants d'entreprise. Il ne vous dit pas quoi acheter, et il n'a
          aucun moyen de savoir si une piste sera gagnante. Personne ne le sait
          à l'avance.
        </p>
        <p>
          Recopier les mouvements des grands fonds est une idée séduisante, mais
          aucune étude ne démontre de façon consensuelle que cela rapporte plus
          qu'un placement ordinaire, une fois les frais déduits. Traitez ces
          fiches comme un point de départ pour apprendre, pas comme des
          instructions.
        </p>
      </Section>

      <Section titre="Une action ou un ETF ? La question la plus importante quand on débute">
        <p>
          <strong className="text-slate-800">Acheter une action</strong>, c'est
          miser sur une seule entreprise. Si elle chute de 40 %, votre argent
          chute de 40 %. Avec 50 €, vous ne pouvez raisonnablement en acheter
          qu'une ou deux : tout repose alors sur très peu de sociétés.
        </p>
        <p>
          <strong className="text-slate-800">Acheter un ETF</strong>, c'est
          acheter d'un coup un panier de centaines d'entreprises. Une faillite
          isolée devient indolore. C'est la façon la plus courante de commencer
          avec de petites sommes régulières, et c'est ce que recommandent la
          plupart des sources publiques d'éducation financière — dont Wikifin, le
          site de la FSMA, l'autorité belge des marchés financiers.
        </p>
        <p className="bg-indigo-50 border border-indigo-200/70 rounded-xl p-4 text-slate-700">
          Une façon saine d'utiliser cet outil : garder l'essentiel de votre
          épargne sur un placement diversifié et n'utiliser qu'une petite part,
          que vous acceptez de perdre entièrement, pour les pistes qui vous
          intéressent. Vous apprenez sans jouer gros.
        </p>
      </Section>

      <Section titre="Le calcul qui décide de tout : les frais">
        <p>
          Sur de petits montants, les frais fixes pèsent énormément. Testez
          votre situation :
        </p>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="block text-xs text-slate-500 mb-1">
              Somme investie (€)
            </span>
            <input
              className="border rounded-lg px-3 py-2 text-sm w-32"
              inputMode="decimal"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-slate-500 mb-1">
              Frais par ordre (€)
            </span>
            <input
              className="border rounded-lg px-3 py-2 text-sm w-32"
              inputMode="decimal"
              value={frais}
              onChange={(e) => setFrais(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-slate-500 mb-1">
              Taxe de bourse (%)
            </span>
            <input
              className="border rounded-lg px-3 py-2 text-sm w-32"
              inputMode="decimal"
              value={tob}
              onChange={(e) => setTob(e.target.value)}
            />
          </label>
        </div>
        <div
          className={`rounded-lg p-3 border ${
            impact.tooSmall
              ? "bg-amber-50 border-amber-200"
              : "bg-emerald-50 border-emerald-200"
          }`}
        >
          <p className="text-slate-700">
            Les frais représentent <strong>{pct(impact.feePct)}</strong> de votre
            mise à l'achat. En comptant la revente, votre placement doit gagner
            environ <strong>{pct(impact.roundTripPct)}</strong> avant de vous
            rapporter le moindre euro.
          </p>
          {impact.tooSmall && (
            <p className="mt-2 text-amber-900">
              Au-delà de {FEE_WARNING_THRESHOLD_PCT} %, la somme est
              probablement trop petite pour ce courtier. Deux solutions :
              investir un montant plus élevé en une seule fois plutôt que
              plusieurs petits ordres, ou choisir un courtier moins cher à
              l'ordre.
            </p>
          )}
        </div>
      </Section>

      <Section titre="Ce que le fisc belge prélève, et quand">
        <p>
          La Belgique n'a pas d'équivalent du PEA français : il n'existe pas
          d'enveloppe fiscale privilégiée pour les actions. Quatre prélèvements
          peuvent vous concerner, et deux comptent vraiment pour de petits
          montants :
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-slate-800">
              La taxe sur les opérations de bourse (TOB)
            </strong>{" "}
            est prélevée <strong>à chaque achat et à chaque vente</strong>. Son
            taux dépend du produit — souvent 0,12 % pour un ETF, davantage pour
            d'autres. Elle s'ajoute aux frais de votre courtier : c'est pour
            cela que le calcul ci-dessus permet de la saisir.
          </li>
          <li>
            <strong className="text-slate-800">Le précompte mobilier</strong> de
            30 % est retenu sur les dividendes que vous recevez. Une première
            tranche de dividendes d'actions est exonérée chaque année, mais
            elle se récupère via votre déclaration fiscale — beaucoup de gens
            l'oublient.
          </li>
          <li>
            <strong className="text-slate-800">
              L'impôt sur les plus-values
            </strong>{" "}
            existe en Belgique depuis 2026 : les gains réalisés à la revente
            d'actifs financiers sont taxés à 10 %, au-delà d'une exonération
            annuelle de l'ordre de 10 000 €. Avec des tickets de 50 à 100 €,
            vous en serez très probablement loin.
          </li>
          <li>
            <strong className="text-slate-800">
              La taxe annuelle sur les comptes-titres
            </strong>{" "}
            ne vise que les portefeuilles de plus d'un million d'euros : elle ne
            vous concerne pas au départ.
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          Ces règles ont changé récemment et les montants sont indexés. Vérifiez
          sur{" "}
          <a
            className="text-indigo-700 underline decoration-indigo-300 hover:decoration-indigo-600"
            href="https://www.wikifin.be"
            target="_blank"
            rel="noreferrer"
          >
            Wikifin
          </a>{" "}
          — le site d'éducation financière de la FSMA, l'autorité belge — ou
          auprès d'un professionnel avant de vous décider.
        </p>
      </Section>

      <Section titre="Acheter belge ou acheter américain ?">
        <p>
          Une action américaine n'est ni meilleure ni pire qu'une action belge.
          Deux différences pratiques méritent d'être connues quand on part de
          Belgique :
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong className="text-slate-800">La devise.</strong> Acheter une
            action américaine implique de convertir des euros en dollars. Votre
            courtier prélève souvent une commission de change, parfois discrète
            dans sa grille tarifaire, et la valeur de votre placement bougera
            aussi avec le taux de change — dans les deux sens.
          </li>
          <li>
            <strong className="text-slate-800">
              La retenue à la source sur les dividendes.
            </strong>{" "}
            Les dividendes américains subissent une retenue aux États-Unis avant
            même le précompte belge. Une convention entre les deux pays permet
            d'en réduire une partie, mais la démarche existe.
          </li>
        </ul>
        <p>
          Les sociétés belges suivies dans cet outil se négocient en euros sur
          Euronext Bruxelles : ni change, ni retenue étrangère. C'est plus
          simple pour commencer.
        </p>
      </Section>

      <Section titre="Choisir un courtier : les 4 points à vérifier">
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong className="text-slate-800">Qu'il soit bien agréé.</strong>{" "}
            C'est le point vital, celui qui vous protège des arnaques. Vérifiez
            son nom dans les registres officiels de la{" "}
            <a
              className="text-indigo-700 underline decoration-indigo-300 hover:decoration-indigo-600"
              href="https://www.fsma.be/fr/data-portal"
              target="_blank"
              rel="noreferrer"
            >
              FSMA
            </a>{" "}
            et consultez ses{" "}
            <a
              className="text-indigo-700 underline decoration-indigo-300 hover:decoration-indigo-600"
              href="https://www.fsma.be/fr/warnings"
              target="_blank"
              rel="noreferrer"
            >
              mises en garde
            </a>
            . Si un site vous promet des gains rapides ou vous appelle pour vous
            convaincre, fuyez.
          </li>
          <li>
            <strong className="text-slate-800">Le coût par ordre.</strong>{" "}
            Reprenez le calcul ci-dessus avec leur tarif réel.
          </li>
          <li>
            <strong className="text-slate-800">
              Les fractions d'actions.
            </strong>{" "}
            Indispensable si vous voulez investir 50 € sur une action qui en
            vaut 250. Tous les courtiers ne le proposent pas.
          </li>
          <li>
            <strong className="text-slate-800">
              L'accès à Euronext Bruxelles et à la bourse américaine
            </strong>
            , ainsi que les frais de change euro/dollar, souvent oubliés.
          </li>
        </ol>
        <p className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          Des courtiers agréés et accessibles depuis la Belgique existent en
          nombre : banques belges, courtiers en ligne spécialisés, courtiers
          européens opérant sous passeport. Je ne vous en recommande aucun —
          ce choix vous appartient, et les tarifs changent trop souvent pour
          qu'une liste reste fiable. Comparez sur les 4 critères ci-dessus, en
          commençant toujours par la vérification de l'agrément.
        </p>
      </Section>

      <Section titre="Une fois le courtier choisi">
        <p>
          Ouvrez son application ou son site, cherchez l'entreprise ou l'ETF par
          son nom ou son ticker, et passez votre ordre vous-même. Cet outil ne
          se connecte à aucun compte et ne transmet jamais d'ordre : c'est
          volontaire, et cela garantit que la décision reste entièrement la
          vôtre.
        </p>
        <p className="text-xs text-slate-500">
          Ceci n'est pas un conseil en investissement. Les informations de cette
          page sont générales et ne tiennent pas compte de votre situation
          personnelle. En cas de doute, consultez un conseiller agréé.
        </p>
      </Section>
    </div>
  );
}
