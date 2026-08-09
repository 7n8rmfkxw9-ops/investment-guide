import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { COURTIERS } from "../lib/courtiers";
import {
  anneesPourAbsorber,
  AVERTISSEMENT_DEVISE,
  capitalApres,
  coutAllerRetour,
  enReel,
  ETF_MONDE,
  REGIMES_TOB,
} from "../lib/etf";
import { formatEur } from "../lib/simulation";
import { BOUTON_DOUX, BOUTON_PRINCIPAL, CARTE, CHAMP, couleurResultat } from "../lib/theme";
import Repliable from "./Repliable";

/**
 * Horizon de detention : ce que la duree a change, dans le passe.
 *
 * La question « vaut-il mieux attendre 5, 10 ou 30 ans ? » n'a pas de reponse
 * honnete sous forme de prevision. Elle en a une sous forme de constat : sur
 * l'historique reellement disponible, on peut compter combien de periodes de
 * N annees se sont terminees en perte, et montrer a quel point l'ecart entre
 * le meilleur et le pire cas se resserre quand N augmente.
 *
 * Toute la page est ecrite au passe. Aucun chiffre n'y est presente comme
 * attendu, probable ou vise, et les horizons que l'historique ne couvre pas
 * sont affiches comme manquants plutot que combles par extrapolation.
 */

interface StatsHorizon {
  ans: number;
  fenetres: number;
  pireAnnualisePct: number;
  medianAnnualisePct: number;
  meilleurAnnualisePct: number;
  pireFinal100: number;
  medianFinal100: number;
  meilleurFinal100: number;
  partPositivePct: number;
  pireDepart: string;
  meilleurDepart: string;
}

interface SerieHorizon {
  cle: string;
  symbole: string;
  titre: string;
  detail: string;
  principal: boolean;
  devise: string;
  debut: string | null;
  fin: string | null;
  points: number;
  horizons: { ans: number; stats: StatsHorizon | null }[];
  erreur: string | null;
}

interface Reponse {
  series: SerieHorizon[];
  mesureA: string;
}

function annee(iso: string | null): string {
  return iso ? iso.slice(0, 4) : "—";
}

/** « 1 an » mais « 5 ans » : la faute saute aux yeux sur la premiere carte. */
function duree(ans: number): string {
  return `${ans} ${ans > 1 ? "ans" : "an"}`;
}

/** Montant arrondi a l'euro, pour les capitaux finaux. */
function euroRond(v: number): string {
  return `${Math.round(v).toLocaleString("fr-BE")} €`;
}

function pct(v: number, decimales = 1): string {
  const s = v.toFixed(decimales).replace(".", ",");
  return `${v > 0 ? "+" : ""}${s} %`;
}

/**
 * Barre d'amplitude : du pire au meilleur cas, avec la mediane reperee.
 *
 * C'est la representation qui repond visuellement a la question posee. Sur un
 * an la barre est tres large et deborde largement sous zero ; a mesure que
 * l'horizon s'allonge elle se resserre et remonte. Le lecteur voit le
 * phenomene avant de lire le moindre chiffre.
 *
 * La zone negative est hachuree en plus d'etre coloree : rouge et vert sont
 * indistinguables pour la forme la plus courante du daltonisme, et une barre
 * n'a pas de signe ecrit pour compenser.
 */
function BarreAmplitude({
  pire,
  median,
  meilleur,
  min,
  max,
}: {
  pire: number;
  median: number;
  meilleur: number;
  min: number;
  max: number;
}) {
  const etendue = max - min || 1;
  const pos = (v: number) => ((v - min) / etendue) * 100;
  const zero = pos(0);

  // Sur trente ans, l'amplitude observee est si faible qu'elle occupe moins
  // d'un pour cent de l'echelle : le trace disparaissait derriere le repere
  // de la mediane et donnait l'impression d'un affichage casse. On lui impose
  // une largeur minimale visible, centree sur l'intervalle reel pour ne pas
  // le decaler — la barre reste alors le signe que l'ecart est tres etroit,
  // au lieu de n'etre le signe de rien.
  const LARGEUR_MINI = 3;
  const brut = pos(meilleur) - pos(pire);
  const largeur = Math.max(brut, LARGEUR_MINI);
  const gauche = Math.max(0, Math.min(100 - largeur, pos(pire) - (largeur - brut) / 2));

  return (
    <div className="relative h-7">
      {/* Fond + zone des pertes, hachuree */}
      <div className="absolute inset-y-2 inset-x-0 rounded-full bg-slate-100 overflow-hidden">
        {min < 0 && (
          <div
            className="absolute inset-y-0 left-0 bg-rose-100"
            style={{
              width: `${zero}%`,
              backgroundImage:
                "repeating-linear-gradient(45deg, transparent 0 3px, rgba(190,18,60,0.22) 3px 6px)",
            }}
          />
        )}
      </div>

      {/* Amplitude observee */}
      <div
        className="absolute inset-y-2 rounded-full bg-gradient-to-r from-indigo-300 to-indigo-500"
        style={{ left: `${gauche}%`, width: `${largeur}%` }}
      />

      {/* Repere du zero */}
      {min < 0 && max > 0 && (
        <div
          className="absolute inset-y-0 w-px bg-slate-400"
          style={{ left: `${zero}%` }}
          aria-hidden
        />
      )}

      {/* Mediane */}
      <div
        className="absolute inset-y-1 w-0.5 rounded-full bg-slate-900 ring-1 ring-white"
        style={{ left: `calc(${pos(median)}% - 1px)` }}
        title={`Médiane : ${pct(median)}`}
      />
    </div>
  );
}

function CarteHorizon({
  ans,
  stats,
  min,
  max,
  inflation,
  reel,
}: {
  ans: number;
  stats: StatsHorizon | null;
  min: number;
  max: number;
  inflation: number;
  reel: boolean;
}) {
  const ajuste = (v: number) => (reel ? enReel(v, inflation) : v);

  if (!stats) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold text-slate-700">{duree(ans)}</span>
          <span className="text-xs text-slate-500">Historique insuffisant</span>
        </div>
        <p className="text-sm text-slate-500 leading-relaxed mt-1.5">
          Cet historique ne contient pas assez de périodes de {duree(ans)} pour que
          le résultat décrive autre chose qu'un hasard de date d'entrée. Rien
          n'est affiché plutôt qu'un chiffre extrapolé.
        </p>
      </div>
    );
  }

  const p = ajuste(stats.pireAnnualisePct);
  const m = ajuste(stats.medianAnnualisePct);
  const b = ajuste(stats.meilleurAnnualisePct);

  return (
    <div className={`${CARTE} p-4 space-y-3`}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-slate-800">{duree(ans)}</span>
        <span className="text-xs text-slate-500 tabular-nums">
          {stats.fenetres} périodes observées
        </span>
      </div>

      <BarreAmplitude
        pire={p}
        median={m}
        meilleur={b}
        min={reel ? enReel(min, inflation) : min}
        max={reel ? enReel(max, inflation) : max}
      />

      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          { l: "Pire", v: p, e: stats.pireFinal100, d: stats.pireDepart },
          { l: "Médiane", v: m, e: stats.medianFinal100, d: null },
          { l: "Meilleur", v: b, e: stats.meilleurFinal100, d: stats.meilleurDepart },
        ].map((c) => (
          <div key={c.l} className="rounded-xl bg-slate-50 px-2 py-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {c.l}
            </p>
            <p className={`text-sm font-semibold tabular-nums ${couleurResultat(c.v)}`}>
              {pct(c.v)}
              <span className="font-normal text-slate-500 text-xs"> /an</span>
            </p>
            {/* Arrondi a l'euro : sur un capital final, les centimes sont du
                bruit, et ils faisaient passer le montant a la ligne. */}
            <p className="text-xs text-slate-500 tabular-nums">
              {euroRond(reel ? capitalApres(c.v, ans) : c.e)}
            </p>
            {c.d && (
              <p className="text-xs text-slate-500 tabular-nums">
                dès {c.d.slice(0, 7).replace("-", "/")}
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-600 leading-relaxed">
        <span className="font-semibold tabular-nums">
          {stats.partPositivePct.toFixed(0)} %
        </span>{" "}
        de ces périodes de {duree(ans)} se sont terminées au-dessus de la mise
        {stats.partPositivePct < 100 && (
          <>
            {" "}
            — soit {(100 - stats.partPositivePct).toFixed(0)} % qui se sont
            terminées en dessous
          </>
        )}
        . La colonne « pire » indique combien 100 € seraient devenus en entrant
        au plus mauvais mois possible.
      </p>
    </div>
  );
}

export default function HorizonPage() {
  const [donnees, setDonnees] = useState<Reponse | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargement, setChargement] = useState(true);
  const [cle, setCle] = useState("etf");
  const [reel, setReel] = useState(false);
  const [inflation, setInflation] = useState(2);
  const [montant, setMontant] = useState(100);
  const [courtierNom, setCourtierNom] = useState("MeDirect");

  useEffect(() => {
    let vivant = true;
    (async () => {
      setChargement(true);
      const { data, error } = await supabase.functions.invoke("cotations", {
        body: { action: "horizons" },
      });
      if (!vivant) return;
      const d = data as Record<string, unknown> | null;
      if (error) setErreur(error.message);
      else if (d?.erreur) setErreur(String(d.erreur));
      // Une reponse inattendue ne doit pas produire un ecran blanc : sans ce
      // controle, une charge utile sans `series` faisait planter le rendu au
      // premier `.find`, et l'utilisateur ne voyait plus rien du tout.
      else if (Array.isArray((d as { series?: unknown })?.series)) {
        setDonnees(d as unknown as Reponse);
      } else {
        setErreur("réponse inattendue du service de cotations");
      }
      setChargement(false);
    })();
    return () => {
      vivant = false;
    };
  }, []);

  const serie = donnees?.series?.find((s) => s.cle === cle) ?? null;

  // Domaine commun a tous les horizons de la serie : sans cela, chaque barre
  // aurait sa propre echelle et le resserrement — qui est tout le propos —
  // deviendrait invisible.
  const [min, max] = useMemo(() => {
    const dispo = (serie?.horizons ?? [])
      .map((h) => h.stats)
      .filter((s): s is StatsHorizon => !!s);
    if (dispo.length === 0) return [-20, 20];
    const lo = Math.min(0, ...dispo.map((s) => s.pireAnnualisePct));
    const hi = Math.max(0, ...dispo.map((s) => s.meilleurAnnualisePct));
    const marge = (hi - lo) * 0.05;
    return [lo - marge, hi + marge];
  }, [serie]);

  const courtier =
    COURTIERS.find((c) => c.nom === courtierNom) ?? COURTIERS[0];
  const fraisEtf = courtier.fraisEtfEur ?? courtier.fraisPetitOrdreEur;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">
          Attendre 5, 10 ou 30&nbsp;ans&nbsp;?
        </h2>
        <p className="text-base text-slate-500 leading-snug">
          Toutes les périodes qui se sont réellement produites, et combien se
          sont terminées en perte. Un constat sur le passé, pas une projection.
        </p>
      </header>

      {chargement && (
        <div className={`${CARTE} p-5 text-sm text-slate-500`}>
          Lecture des historiques de cours…
        </div>
      )}

      {erreur && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Historiques indisponibles : {erreur}
        </div>
      )}

      {donnees && (
        <>
          <div className="flex flex-wrap gap-2">
            {(donnees.series ?? []).map((s) => (
              <button
                key={s.cle}
                onClick={() => setCle(s.cle)}
                className={`${s.cle === cle ? BOUTON_PRINCIPAL : BOUTON_DOUX} text-sm`}
              >
                {s.principal ? "🌍 " : "📊 "}
                {s.titre}
              </button>
            ))}
          </div>

          {serie && (
            <>
              <div className={`${CARTE} p-4 space-y-2`}>
                <p className="text-base text-slate-600 leading-relaxed">
                  {serie.detail}
                </p>
                {serie.erreur ? (
                  <p className="text-sm text-rose-700">
                    Série indisponible : {serie.erreur}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 tabular-nums">
                    {serie.symbole} · {serie.points} relevés mensuels de{" "}
                    {annee(serie.debut)} à {annee(serie.fin)} · mesuré en{" "}
                    {serie.devise}
                  </p>
                )}
              </div>

              {serie.principal && (
                <div className="rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3.5 space-y-2">
                  <p className="text-sm font-semibold text-amber-900">
                    Pourquoi ces chiffres sont trop beaux
                  </p>
                  <p className="text-sm text-amber-900 leading-relaxed">
                    L'historique de cet ETF commence en {annee(serie.debut)},
                    c'est-à-dire juste après le krach de 2008. Il ne contient
                    donc <strong>aucune entrée au sommet d'un grand marché
                    haussier</strong> : les pires cas affichés ici sont
                    mécaniquement flattés, et le « 100 % de périodes gagnantes »
                    dit surtout que ce produit est jeune.
                  </p>
                  <p className="text-sm text-amber-900 leading-relaxed">
                    L'autre série, qui remonte à 1988 et traverse 2000 et 2008,
                    montre ce que cet historique-ci ne peut pas montrer : une
                    période de <strong>dix ans</strong> qui s'est terminée en
                    perte. Regardez-la avant de conclure quoi que ce soit sur la
                    durée.
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setReel((v) => !v)}
                  className={reel ? BOUTON_PRINCIPAL : BOUTON_DOUX}
                >
                  {reel ? "✓ " : ""}Retirer l'inflation
                </button>
                {reel && (
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    Hypothèse
                    <input
                      type="number"
                      step="0.1"
                      value={inflation}
                      onChange={(e) => setInflation(Number(e.target.value))}
                      className={`${CHAMP} w-20 tabular-nums`}
                    />
                    % par an
                  </label>
                )}
              </div>

              {reel && (
                <p className="text-sm text-slate-500 leading-relaxed">
                  Les montants ci-dessous sont exprimés en pouvoir d'achat
                  d'aujourd'hui, sous l'hypothèse que vous venez de saisir. Ce
                  taux est une hypothèse de votre part : l'outil ne prévoit pas
                  l'inflation et n'en propose ici qu'une valeur d'usage.
                </p>
              )}

              <div className="space-y-3">
                {(serie.horizons ?? []).map((h) => (
                  <CarteHorizon
                    key={h.ans}
                    ans={h.ans}
                    stats={h.stats}
                    min={min}
                    max={max}
                    inflation={inflation}
                    reel={reel}
                  />
                ))}
              </div>

              <Repliable
                id="h-lecture"
                titre="Comment lire ces chiffres sans se tromper"
                icone="🧭"
                resume="Quatre réserves qui changent l'interprétation."
              >
                <ul className="text-base text-slate-600 leading-relaxed space-y-2 list-disc pl-4">
                  <li>
                    <strong>Les périodes se chevauchent.</strong> Les périodes
                    de 30 ans tirées de 38 ans d'historique partagent presque
                    tout leur contenu : elles se comptent par dizaines mais ne
                    constituent qu'une poignée d'expériences réellement
                    distinctes. Le « pire cas » est donc le pire des cas
                    observés, pas le pire cas possible.
                  </li>
                  <li>
                    <strong>Un horizon long n'annule pas le risque, il
                    change sa forme.</strong> Ce que montre la barre, c'est un
                    resserrement de l'amplitude, pas une garantie. Rien
                    n'interdit à une période future de sortir de tout ce qui a
                    été observé ici.
                  </li>
                  <li>
                    <strong>La durée n'est utile que si elle est tenue.</strong>{" "}
                    Ces résultats supposent de ne pas vendre pendant toute la
                    période, y compris au creux. Vendre au milieu d'une baisse
                    transforme le pire mois en résultat définitif.
                  </li>
                  <li>
                    <strong>Aucun versement régulier n'est modélisé.</strong>{" "}
                    Chaque période correspond à une somme placée en une fois et
                    laissée en place. Étaler ses achats donne un autre profil,
                    que cette page ne calcule pas.
                  </li>
                </ul>
              </Repliable>
            </>
          )}
        </>
      )}

      {/* --------------------------------------------------------------- */}

      <Repliable
        id="h-etf"
        titre={ETF_MONDE.nom}
        icone="🌍"
        resume="Ce que contient ce produit, et ce qui n'a pas pu être vérifié."
      >
        <p className="text-xs text-slate-500 tabular-nums">
          {ETF_MONDE.symbole} · {ETF_MONDE.place} · coté en {ETF_MONDE.devise}
        </p>
        <ul className="text-base text-slate-600 leading-relaxed space-y-2 list-disc pl-4">
          {ETF_MONDE.faits.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200/70 rounded-xl px-3.5 py-2.5 leading-relaxed">
          {AVERTISSEMENT_DEVISE}
        </p>
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Ce que l'outil n'a pas pu vérifier
          </p>
          {ETF_MONDE.aVerifier.map((a) => (
            <p key={a} className="text-sm text-slate-500 leading-relaxed">
              {a}
            </p>
          ))}
        </div>
      </Repliable>

      {/* --------------------------------------------------------------- */}

      <Repliable
        id="h-cout"
        titre="Ce qu'un aller-retour vous coûterait"
        icone="🧾"
        resume="Acheter puis revendre : le montant à regagner avant le premier euro de gain."
      >

        <div className="flex flex-wrap gap-3">
          <label className="text-sm text-slate-600 space-y-1">
            <span className="block text-xs uppercase tracking-wide text-slate-500">
              Courtier
            </span>
            <select
              value={courtierNom}
              onChange={(e) => setCourtierNom(e.target.value)}
              className={CHAMP}
            >
              {COURTIERS.map((c) => (
                <option key={c.nom} value={c.nom}>
                  {c.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-slate-600 space-y-1">
            <span className="block text-xs uppercase tracking-wide text-slate-500">
              Montant placé
            </span>
            <input
              type="number"
              min="0"
              step="10"
              value={montant}
              onChange={(e) => setMontant(Number(e.target.value))}
              className={`${CHAMP} w-32 tabular-nums`}
            />
          </label>
        </div>

        <p className="text-base text-slate-600 leading-relaxed">
          {courtier.fraisEtfNote ? (
            <>
              <strong>{courtier.nom}</strong> — {courtier.fraisEtfNote}
            </>
          ) : (
            <>
              <strong>{courtier.nom}</strong> ne publie pas de tarif ETF
              distinct dans ce que l'outil a pu vérifier : le tarif actions est
              appliqué ici, soit {formatEur(courtier.fraisPetitOrdreEur)} par
              ordre.
            </>
          )}{" "}
          <span className="text-xs text-slate-500">
            ({courtier.fraisSource === "officiel" ? "grille officielle" : "estimation non confirmée"},{" "}
            {courtier.fraisConstateLe}.{" "}
            <a
              href={courtier.fraisLien}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Vérifier
            </a>
            )
          </span>
        </p>

        {courtier.fxSpreadPct !== undefined && (
          <p className="text-sm text-slate-500 leading-relaxed">
            Ce courtier applique une marge de {courtier.fxSpreadPct} % sur le
            taux de change. Elle ne s'applique pas ici : l'ETF est coté en
            euros, donc aucune conversion n'a lieu. Elle s'appliquerait, deux
            fois, sur un titre coté en dollars.
          </p>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {REGIMES_TOB.map((r) => {
            const c = coutAllerRetour(montant, fraisEtf, r);
            const ans = anneesPourAbsorber(c.seuilRentabilitePct, 6);
            return (
              <div key={r.cle} className="rounded-2xl bg-slate-50 px-4 py-3 space-y-1.5">
                <p className="text-sm font-medium text-slate-700">{r.libelle}</p>
                <p className="text-2xl font-semibold text-slate-900 tabular-nums">
                  {formatEur(c.totalEur)}
                </p>
                <p className="text-xs text-slate-600 tabular-nums">
                  soit {c.seuilRentabilitePct.toFixed(2).replace(".", ",")} % à
                  regagner · courtage {formatEur(c.courtageEur)} + taxe{" "}
                  {formatEur(c.taxeEur)}
                </p>
                {ans !== null && (
                  <p className="text-sm text-slate-500 leading-relaxed">
                    À 6 % par an — hypothèse d'illustration, pas une prévision —
                    il faudrait environ{" "}
                    {ans < 1
                      ? `${Math.round(ans * 12)} mois`
                      : `${ans.toFixed(1).replace(".", ",")} ans`}{" "}
                    pour absorber ce coût.
                  </p>
                )}
                <p className="text-xs text-slate-500 leading-relaxed">
                  {r.note}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-sm text-slate-500 leading-relaxed border-t border-slate-100 pt-3">
          Lequel de ces deux régimes s'applique dépend de l'inscription de cet
          ETF précis auprès de la FSMA, que l'outil n'a pas pu vérifier —
          l'écart est d'un facteur cinq, il serait donc malhonnête d'en choisir
          un à votre place. Votre courtier calcule et retient la taxe lui-même :
          le décompte d'ordre indique le taux réellement appliqué, et c'est la
          seule source qui fasse foi.
        </p>
      </Repliable>

      <p className="text-sm text-slate-500 leading-relaxed">
        Ceci n'est pas un conseil en investissement. Cette page décrit des
        périodes passées et des tarifs publiés ; elle ne prévoit aucun cours, ne
        recommande aucun achat et ne tient pas compte de votre situation
        personnelle. Les performances passées ne préjugent pas des performances
        futures, et un placement en actions peut perdre de la valeur, y compris
        durablement. En cas de doute, consultez un conseiller agréé.
      </p>
    </div>
  );
}
