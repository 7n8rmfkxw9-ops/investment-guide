import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  construirePlan,
  faitsDuCourtier,
  type Etape,
  type Plan,
} from "../../supabase/functions/_shared/regles/plan";
import type { Fait } from "../../supabase/functions/_shared/regles/types";
import { CARTE } from "../lib/theme";
import type { Onglet } from "../lib/onglets";

/**
 * L'ecran d'ouverture : combien, et pourquoi.
 *
 * ---------------------------------------------------------------------------
 * Ce qu'il remplace
 *
 * L'application ouvrait sur une liste de declarations boursieres. C'est une
 * information, pas une reponse : quelqu'un qui ouvre son outil de patrimoine se
 * demande d'abord « qu'est-ce que je fais, ce mois-ci ». Cet ecran repond a
 * cette question et a aucune autre.
 *
 * ---------------------------------------------------------------------------
 * Le montant, puis le raisonnement
 *
 * Le chiffre est en haut, en grand, seul. Le calcul qui le produit est juste
 * en dessous, deplie, ligne a ligne — jamais cache derriere un « en savoir
 * plus ». Un montant qu'on ne peut pas verifier est un ordre ; un montant dont
 * on voit la soustraction est un conseil.
 *
 * Le meme module calcule ce qui s'affiche ici et ce que le moteur depose dans
 * la boite de validation. Les deux ne peuvent donc pas diverger.
 */

interface LigneFait {
  key: string;
  value: unknown;
  verified_at: string;
  domain: string;
}

const PASTILLES: Record<Etape["statut"], { texte: string; classe: string }> = {
  fait: { texte: "En place", classe: "bg-emerald-100 text-emerald-800" },
  en_cours: { texte: "En cours", classe: "bg-amber-100 text-amber-900" },
  a_venir: { texte: "Plus tard", classe: "bg-stone-200 text-stone-700" },
  inconnu: { texte: "À compléter", classe: "bg-stone-200 text-stone-700" },
};

export default function AccueilPage({ onAller }: { onAller: (o: Onglet) => void }) {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [enAttente, setEnAttente] = useState(0);
  const [aRevoir, setARevoir] = useState(0);
  const [chargement, setChargement] = useState(true);

  const charger = useCallback(async () => {
    const [faits, reglages, props, perimes] = await Promise.all([
      supabase.from("personal_facts").select("key,value,verified_at,domain"),
      supabase
        .from("settings")
        .select("broker_fixed_fee_eur,transaction_tax_pct,fx_spread_pct")
        .maybeSingle(),
      supabase.from("proposals").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("stale_facts").select("key", { count: "exact", head: true }),
    ]);

    const maintenant = new Date();
    const saisis: Fait[] = ((faits.data ?? []) as LigneFait[]).map((f) => ({
      key: f.key,
      value: f.value,
      domain: f.domain,
      verifiedAt: f.verified_at,
      source: "saisie_manuelle",
    }));
    // Les frais du courtier rejoignent le contexte depuis les reglages, jamais
    // depuis une seconde saisie.
    const derives = faitsDuCourtier(reglages.data ?? null, maintenant);

    setPlan(construirePlan({ maintenant, faits: [...saisis, ...derives], signaux: [] }));
    setEnAttente(props.count ?? 0);
    setARevoir(perimes.count ?? 0);
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  // L'etape a traiter est choisie par le moteur, pas par l'ordre d'affichage :
  // l'ordre de priorite patrimoniale et l'ordre de saisie ne coincident pas.
  const premiereAction = useMemo(() => {
    if (!plan || plan.prochaineEtape === null) return null;
    return plan.etapes.find((e) => e.cle === plan.prochaineEtape) ?? null;
  }, [plan]);

  if (chargement) {
    return (
      <p className="text-base text-stone-600 py-8" role="status">
        Un instant…
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <Montant plan={plan} onAller={onAller} />

      {premiereAction && <ProchainePas etape={premiereAction} onAller={onAller} />}

      {(enAttente > 0 || aRevoir > 0) && (
        <section className="space-y-2.5">
          {enAttente > 0 && (
            <Rappel
              texte={`${enAttente} vérification${enAttente > 1 ? "s" : ""} à valider`}
              detail="Rien ne s'exécute : vous décidez."
              onClick={() => onAller("propositions")}
            />
          )}
          {aRevoir > 0 && (
            <Rappel
              texte={`${aRevoir} information${aRevoir > 1 ? "s" : ""} à reconfirmer`}
              detail="Une donnée périmée produit des conseils faux, pas moins de conseils."
              onClick={() => onAller("donnees")}
            />
          )}
        </section>
      )}

      {plan && plan.etapes.length > 0 && <Cascade plan={plan} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Montant({ plan, onAller }: { plan: Plan | null; onAller: (o: Onglet) => void }) {
  if (!plan || !plan.exploitable) {
    return (
      <section className="space-y-4 pt-2">
        <h2 className="text-3xl font-semibold text-stone-900">
          Quatre chiffres, et je calcule le reste
        </h2>
        <p className="text-base text-stone-600 leading-relaxed max-w-prose">
          Vos revenus, vos charges, votre épargne disponible et les frais de votre
          courtier. À partir de là : combien mettre de côté d'abord, combien vous
          pouvez investir chaque mois, et à partir de quel montant un ordre cesse
          d'être mangé par ses frais.
        </p>
        <button
          type="button"
          onClick={() => onAller("donnees")}
          className="rounded-2xl px-5 py-3 min-h-[52px] text-base font-medium text-white bg-stone-900 hover:bg-stone-800 active:bg-stone-950 transition-colors motion-safe:active:scale-[0.98] motion-safe:transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900 focus-visible:ring-offset-2 focus-visible:ring-offset-creme-50"
        >
          Commencer
        </button>
      </section>
    );
  }

  const m = plan.investissableMensuel ?? 0;
  const bloque = m === 0;

  return (
    <section className="pt-2">
      <p className="text-sm font-medium text-stone-500 uppercase tracking-wider">
        {bloque ? "Ce mois-ci" : "Vous pouvez investir"}
      </p>
      {bloque ? (
        <p className="mt-2 text-3xl font-semibold text-stone-900 leading-tight max-w-prose">
          Rien, et c'est volontaire.
        </p>
      ) : (
        <p className="mt-1 flex items-baseline gap-2">
          <span className="text-[3.25rem] leading-none font-semibold text-stone-900 tabular-nums">
            {m.toLocaleString("fr-BE")}
          </span>
          <span className="text-2xl font-medium text-stone-500">€ / mois</span>
        </p>
      )}

      {!bloque && plan.moisParOrdre !== null && plan.ticketMinimum !== null && (
        <p className="mt-3 text-base text-stone-600 leading-relaxed max-w-prose">
          {plan.moisParOrdre === 1 ? (
            <>
              Un ordre par mois reste raisonnable : votre montant dépasse le ticket
              minimum de <strong className="text-stone-900">{plan.ticketMinimum} €</strong> en
              dessous duquel les frais deviennent absurdes.
            </>
          ) : (
            <>
              Passez un ordre tous les{" "}
              <strong className="text-stone-900">{plan.moisParOrdre} mois</strong>, soit{" "}
              <strong className="text-stone-900">
                {(m * plan.moisParOrdre).toLocaleString("fr-BE")} €
              </strong>{" "}
              à la fois. En dessous de {plan.ticketMinimum} €, les frais mangent plus
              que ce que l'attente vous coûte.
            </>
          )}
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------

function ProchainePas({ etape, onAller }: { etape: Etape; onAller: (o: Onglet) => void }) {
  return (
    <section className={`${CARTE} p-5 space-y-3`}>
      <p className="text-sm font-medium text-stone-500 uppercase tracking-wider">
        La prochaine marche
      </p>
      <h3 className="text-xl font-semibold text-stone-900 leading-snug">{etape.titre}</h3>
      <p className="text-base text-stone-700 leading-relaxed">{etape.resume}</p>

      {etape.manque.length > 0 && (
        <div className="pt-1">
          <p className="text-sm text-stone-600 leading-relaxed">
            Il me manque {etape.manque.join(", ")}.
          </p>
          <button
            type="button"
            onClick={() => onAller("donnees")}
            className="mt-2 min-h-[44px] text-base font-medium text-stone-900 underline decoration-stone-300 underline-offset-4 hover:decoration-stone-900 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900"
          >
            Le renseigner
          </button>
        </div>
      )}
    </section>
  );
}

function Rappel({
  texte,
  detail,
  onClick,
}: {
  texte: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${CARTE} w-full text-left p-4 flex items-center gap-3 motion-safe:transition-all hover:shadow-carteSurvol focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900`}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium text-stone-900">{texte}</span>
        <span className="block text-sm text-stone-600 leading-snug mt-0.5">{detail}</span>
      </span>
      <span className="text-stone-400 text-xl leading-none" aria-hidden>
        ›
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------

/**
 * La cascade des priorites, dans l'ordre ou elles comptent.
 *
 * Chaque etape montre son calcul. Ce n'est pas du detail pour les curieux :
 * c'est ce qui separe un montant verifiable d'un montant a croire sur parole.
 */
function Cascade({ plan }: { plan: Plan }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">
        Dans quel ordre, et pourquoi
      </h3>
      <ol className="space-y-3">
        {plan.etapes.map((e) => {
          const p = PASTILLES[e.statut];
          return (
            <li key={e.cle} className={`${CARTE} p-5 space-y-3`}>
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-semibold text-stone-900 leading-snug">
                  {e.titre}
                </h4>
                <span
                  className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${p.classe}`}
                >
                  {p.texte}
                </span>
              </div>
              <p className="text-base text-stone-700 leading-relaxed">{e.resume}</p>

              {e.calcul.length > 0 && (
                <dl className="text-sm rounded-xl bg-creme-100 px-4 py-3 space-y-1.5">
                  {e.calcul.map((l) => (
                    <div key={l.gauche} className="flex justify-between gap-4">
                      <dt className="text-stone-600">{l.gauche}</dt>
                      <dd className="text-stone-900 font-medium tabular-nums">{l.droite}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {e.manque.length > 0 && (
                <p className="text-sm text-stone-600 leading-relaxed">
                  Manque : {e.manque.join(", ")}.
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <p className="text-sm text-stone-500 leading-relaxed pt-1 max-w-prose">
        Ces montants sont de l'arithmétique sur vos propres chiffres, pas un conseil
        en investissement. Ils ne disent pas quoi acheter, et rien ici ne suppose
        que les marchés montent.
      </p>
    </section>
  );
}
