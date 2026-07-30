import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  cheminSvg,
  compareStrategies,
  indicateurs,
  poidsDesFrais,
} from "../lib/marche";
import type { PointSerie } from "../lib/marche";
import { formatEur, formatPct } from "../lib/simulation";
import { BOUTON_DOUX, CARTE, CHAMP, couleurResultat } from "../lib/theme";

interface Candidat {
  symbole: string;
  nom: string;
  place: string;
  type: string;
}

interface Graphique {
  symbole: string;
  nom: string | null;
  devise: string;
  prix: number;
  tauxEur: number;
  haut52: number | null;
  bas52: number | null;
  serie: PointSerie[];
}

interface Indice {
  symbole: string;
  nom: string;
  pays: string;
  devise: string;
  prix: number | null;
  varJourPct: number | null;
  serie: PointSerie[];
}

type Periode = "1m" | "6m" | "1a" | "5a";
const PERIODES: { id: Periode; label: string }[] = [
  { id: "1m", label: "1 mois" },
  { id: "6m", label: "6 mois" },
  { id: "1a", label: "1 an" },
  { id: "5a", label: "5 ans" },
];

async function appel<T>(corps: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("cotations", { body: corps });
  if (error) throw new Error(error.message);
  const d = data as Record<string, unknown>;
  if (d?.erreur) throw new Error(String(d.erreur));
  return d as T;
}

function MiniCourbe({ serie, couleur }: { serie: PointSerie[]; couleur: string }) {
  const d = cheminSvg(serie, 200, 48);
  if (!d) return <div className="h-12" />;
  return (
    <svg viewBox="0 0 200 48" className="w-full h-12" preserveAspectRatio="none">
      <path d={d} fill="none" stroke={couleur} strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function MarketPage() {
  const [indices, setIndices] = useState<Indice[] | null>(null);
  const [erreurIndices, setErreurIndices] = useState<string | null>(null);

  const [requete, setRequete] = useState("");
  const [cherche, setCherche] = useState(false);
  const [candidats, setCandidats] = useState<Candidat[] | null>(null);
  const [choisi, setChoisi] = useState<Candidat | null>(null);
  const [periode, setPeriode] = useState<Periode>("1a");
  const [graph, setGraph] = useState<Graphique | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargeGraph, setChargeGraph] = useState(false);

  const [fee, setFee] = useState(1);
  const [tob, setTob] = useState(0);
  const [budgetMensuel, setBudgetMensuel] = useState(50);
  const [nbMois, setNbMois] = useState(6);

  useEffect(() => {
    supabase
      .from("settings")
      .select("*")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFee(Number(data.broker_fixed_fee_eur));
          setTob(Number(data.tob_pct ?? 0));
          setBudgetMensuel(Number(data.position_size_eur) || 50);
        }
      });
    appel<{ indices: Indice[] }>({ action: "marche" })
      .then((r) => setIndices(r.indices))
      .catch((e) => setErreurIndices(e instanceof Error ? e.message : String(e)));
  }, []);

  async function lanceRecherche(q: string) {
    const texte = q.trim();
    if (!texte) return;
    setCherche(true);
    setErreur(null);
    setCandidats(null);
    try {
      const r = await appel<{ resultats: Candidat[] }>({ action: "recherche", q: texte });
      setCandidats(r.resultats);
      if (r.resultats.length === 0) setErreur("Aucune société trouvée sous ce nom.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    }
    setCherche(false);
  }

  async function charger(c: Candidat, p: Periode) {
    setChoisi(c);
    setChargeGraph(true);
    setErreur(null);
    try {
      const r = await appel<Graphique>({ action: "graphique", symbole: c.symbole, periode: p });
      setGraph(r);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    }
    setChargeGraph(false);
  }

  const ind = useMemo(() => (graph ? indicateurs(graph.serie) : null), [graph]);

  const comparaison = useMemo(() => {
    if (!graph) return null;
    return compareStrategies(graph.serie, budgetMensuel, nbMois, fee, tob);
  }, [graph, budgetMensuel, nbMois, fee, tob]);

  const poids = useMemo(
    () => poidsDesFrais(budgetMensuel * nbMois, nbMois, fee, tob),
    [budgetMensuel, nbMois, fee, tob],
  );

  return (
    <div className="space-y-5">
      <div className={`${CARTE} p-5 bg-gradient-to-br from-sky-50 to-indigo-50 border-sky-200/60`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            📈
          </span>
          <div className="space-y-2">
            <h2 className="font-semibold text-slate-800">Cours de bourse, en clair</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Ce que vous verrez ici décrit ce qui s'est <strong>déjà produit</strong> :
              un cours, une fourchette sur un an, l'ampleur des secousses passées.
              Aucun de ces chiffres n'indique où le cours ira ensuite — personne ne le
              sait, et un outil qui prétendrait le savoir mentirait.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              En revanche, une question a une réponse factuelle utile :{" "}
              <strong>comment répartir un même budget dans le temps</strong> change le
              résultat, à cause des frais et du hasard du calendrier. C'est ce que
              montre le comparateur plus bas — toujours avec des cours déjà connus,
              jamais une prédiction.
            </p>
          </div>
        </div>
      </div>

      {/* Ambiance generale des marches */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
          Grands indices, à titre de repère
        </h3>
        {erreurIndices && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200/70 rounded-xl px-4 py-3">
            {erreurIndices}
          </p>
        )}
        {!indices && !erreurIndices && (
          <p className="text-sm text-slate-400">Chargement…</p>
        )}
        {indices && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {indices.map((i) => (
              <div key={i.symbole} className={`${CARTE} p-3.5`}>
                <p className="text-xs text-slate-500">
                  {i.pays} {i.nom}
                </p>
                {i.prix != null ? (
                  <>
                    <p className="font-semibold text-slate-800 tabular-nums">
                      {i.prix.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}{" "}
                      <span className="text-xs font-normal text-slate-400">{i.devise}</span>
                    </p>
                    <p className={`text-xs tabular-nums ${couleurResultat(i.varJourPct ?? 0)}`}>
                      {formatPct(i.varJourPct ?? 0)} aujourd'hui
                    </p>
                    <MiniCourbe
                      serie={i.serie}
                      couleur={(i.varJourPct ?? 0) >= 0 ? "#10b981" : "#f43f5e"}
                    />
                  </>
                ) : (
                  <p className="text-xs text-slate-400">indisponible</p>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-slate-500">
          Un indice mélange des centaines d'entreprises : il sert de repère
          d'ambiance générale, pas de prévision pour une société en particulier.
        </p>
      </section>

      {/* Recherche d'une societe */}
      <section className={`${CARTE} p-5 space-y-4`}>
        <h3 className="font-semibold text-slate-800">Le cours d'une société</h3>
        <div className="flex gap-2">
          <input
            className={`${CHAMP} flex-1`}
            placeholder="Nom (ex. UCB, Volvo, Apple)"
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void lanceRecherche(requete);
              }
            }}
          />
          <button
            type="button"
            className={BOUTON_DOUX}
            onClick={() => lanceRecherche(requete)}
            disabled={cherche}
          >
            {cherche ? "…" : "Chercher"}
          </button>
        </div>

        {erreur && (
          <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200/70 rounded-xl px-4 py-3">
            {erreur}
          </p>
        )}

        {candidats && candidats.length > 0 && (
          <ul className="divide-y divide-slate-100 border border-slate-200/70 rounded-xl overflow-hidden">
            {candidats.map((c) => (
              <li key={c.symbole}>
                <button
                  type="button"
                  onClick={() => charger(c, periode)}
                  className={`w-full text-left px-3.5 py-2.5 text-sm transition ${
                    choisi?.symbole === c.symbole ? "bg-indigo-50 text-indigo-900" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="font-medium">{c.nom || c.symbole}</span>
                  <span className="text-slate-400"> · {c.symbole}</span>
                  <span className="block text-xs text-slate-400">
                    {c.place} · {c.type}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {choisi && (
          <div className="flex gap-1.5">
            {PERIODES.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPeriode(p.id);
                  void charger(choisi, p.id);
                }}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  periode === p.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {chargeGraph && <p className="text-sm text-slate-400">Chargement…</p>}

        {graph && !chargeGraph && (
          <div className="space-y-3">
            <div>
              <p className="font-semibold text-slate-800">
                {graph.nom ?? graph.symbole}{" "}
                <span className="text-slate-400 font-normal text-sm">{graph.symbole}</span>
              </p>
              <p className="text-2xl font-semibold text-slate-800 tabular-nums">
                {graph.prix.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}{" "}
                <span className="text-sm font-normal text-slate-400">{graph.devise}</span>
              </p>
            </div>

            <svg viewBox="0 0 400 120" className="w-full h-28" preserveAspectRatio="none">
              <path
                d={cheminSvg(graph.serie, 400, 120)}
                fill="none"
                stroke="#4f46e5"
                strokeWidth={2}
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {ind && (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Sur la période</p>
                  <p className="text-slate-700">
                    Plus bas <strong>{ind.plusBas.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</strong>{" "}
                    · Plus haut <strong>{ind.plusHaut.toLocaleString("fr-FR", { maximumFractionDigits: 2 })}</strong>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Cours actuel à {ind.positionPct.toFixed(0)} % de cette fourchette.
                  </p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">Ce que le cours a fait</p>
                  <p className="text-slate-700">
                    {[
                      ind.var1m != null && `1 mois : ${formatPct(ind.var1m)}`,
                      ind.var6m != null && `6 mois : ${formatPct(ind.var6m)}`,
                      ind.var1a != null && `1 an : ${formatPct(ind.var1a)}`,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "historique trop court"}
                  </p>
                </div>
                {ind.volatilitePct != null && (
                  <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3">
                    <p className="text-xs text-amber-800">Amplitude des secousses</p>
                    <p className="text-slate-700">
                      Variations quotidiennes équivalentes à environ{" "}
                      <strong>{ind.volatilitePct.toFixed(0)} % par an</strong>. Plus ce
                      chiffre est élevé, plus la valeur peut bouger fort dans les deux
                      sens — à la hausse comme à la baisse.
                    </p>
                  </div>
                )}
                {ind.pireBaissePct != null && (
                  <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-3">
                    <p className="text-xs text-amber-800">Pire creux traversé</p>
                    <p className="text-slate-700">
                      Sur cette période, quelqu'un qui aurait acheté au plus mauvais
                      moment aurait vu sa position perdre jusqu'à{" "}
                      <strong>{Math.abs(ind.pireBaissePct).toFixed(0)} %</strong> avant
                      de se reprendre (ou pas).
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Comparateur retrospectif : jamais une prediction */}
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">
                Le timing, mesuré après coup — pas prédit
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Il n'existe pas de réponse fiable à « quel est le meilleur moment pour
                investir ? ». Ce qui suit compare, sur les cours déjà connus de la
                période affichée, ce qu'aurait donné un budget étalé en achats
                mensuels réguliers face à deux bornes théoriques — tout miser au
                meilleur jour possible, tout miser au pire — que l'on ne peut connaître
                qu'après coup. Ce n'est pas un conseil pour la suite.
              </p>
              <div className="flex flex-wrap gap-3">
                <label className="text-sm">
                  <span className="block text-xs text-slate-500 mb-1">
                    Budget mensuel (€)
                  </span>
                  <input
                    className={`${CHAMP} w-28`}
                    inputMode="decimal"
                    value={budgetMensuel}
                    onChange={(e) => setBudgetMensuel(Number(e.target.value) || 0)}
                  />
                </label>
                <label className="text-sm">
                  <span className="block text-xs text-slate-500 mb-1">
                    Nombre de mois
                  </span>
                  <input
                    className={`${CHAMP} w-24`}
                    inputMode="numeric"
                    value={nbMois}
                    onChange={(e) => setNbMois(Math.max(1, Number(e.target.value) || 1))}
                  />
                </label>
              </div>

              {comparaison ? (
                <div className="space-y-2 text-sm">
                  <LigneStrategie
                    libelle="Achats mensuels réguliers (sans rien deviner)"
                    s={comparaison.programme}
                    accent
                  />
                  <LigneStrategie
                    libelle={`Tout misé au plus bas connu (${new Date(comparaison.dateMeilleurJour).toLocaleDateString("fr-FR")}) — borne théorique`}
                    s={comparaison.meilleurJour}
                  />
                  <LigneStrategie
                    libelle={`Tout misé au plus haut connu (${new Date(comparaison.datePireJour).toLocaleDateString("fr-FR")}) — borne théorique`}
                    s={comparaison.pireJour}
                  />
                  <LigneStrategie libelle="Tout misé dès le premier jour" s={comparaison.toutDeSuite} />
                  <p className="text-xs text-slate-500 leading-relaxed pt-1">
                    Les achats réguliers ne battent jamais la meilleure borne théorique
                    — c'est normal, elle suppose de deviner juste à chaque fois. Leur
                    intérêt est ailleurs : ils évitent de devoir deviner, et lissent le
                    prix payé sans qu'il faille surveiller le marché.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">
                  Choisissez un budget et un nombre de mois valides.
                </p>
              )}

              <div className="bg-slate-50 rounded-xl p-3.5 text-sm text-slate-600">
                <p>
                  Avec {nbMois} ordre{nbMois > 1 ? "s" : ""} de{" "}
                  {formatEur(budgetMensuel)} chacun, les frais représentent{" "}
                  <strong className="text-amber-700">{poids.fraisPct.toFixed(2)} %</strong>{" "}
                  du total investi ({formatEur(poids.fraisEur)}). Grouper les mêmes
                  achats en moins d'ordres réduit ce coût, au prix de devoir réunir la
                  somme avant d'investir.
                </p>
              </div>
            </div>
          </div>
        )}
      </section>

      <p className="text-xs text-slate-400 leading-relaxed">
        Les cours proviennent d'un service public de données de marché et peuvent
        être différés. Rien sur cette page ne prédit un cours futur ni ne recommande
        un achat ou une vente. Les performances passées ne préjugent pas des
        performances futures.
      </p>
    </div>
  );
}

function LigneStrategie({
  libelle,
  s,
  accent,
}: {
  libelle: string;
  s: { gainEur: number; gainPct: number; fraisEur: number; ordres: number };
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 border ${
        accent ? "bg-indigo-50 border-indigo-200/70" : "bg-slate-50 border-slate-200/70"
      }`}
    >
      <span className="text-slate-600">{libelle}</span>
      <span className={`shrink-0 font-medium tabular-nums ${couleurResultat(s.gainEur)}`}>
        {formatEur(s.gainEur, true)} ({formatPct(s.gainPct)})
      </span>
    </div>
  );
}
