import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Simulation } from "../lib/types";
import { DISCLAIMER } from "../lib/types";
import {
  calculeSimulation,
  formatEur,
  formatPct,
  prepareEntree,
} from "../lib/simulation";
import {
  BOUTON_DOUX,
  BOUTON_PRINCIPAL,
  CARTE,
  CHAMP,
  couleurResultat,
  fondResultat,
} from "../lib/theme";

interface Candidat {
  symbole: string;
  nom: string;
  place: string;
  type: string;
}

interface CoursTrouve {
  symbole: string;
  nom: string | null;
  devise: string;
  prix: number;
  tauxEur: number;
  dateReelle?: string;
  reference?: { symbole: string; prix: number; devise: string } | null;
}

/** Prefill depose par le bouton « S'entrainer sur cette piste » d'une fiche. */
export interface AmorceSimulation {
  nom: string;
  ticker: string | null;
  pisteId: string;
}

interface Props {
  amorce?: AmorceSimulation | null;
  onAmorceConsommee?: () => void;
}

const AUJOURDHUI = () => new Date().toISOString().slice(0, 10);

async function appelCotations<T>(corps: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("cotations", { body: corps });
  if (error) throw new Error(error.message);
  const d = data as Record<string, unknown>;
  if (d?.erreur) throw new Error(String(d.erreur));
  return d as T;
}

export default function SimulatorPage({ amorce, onAmorceConsommee }: Props) {
  const [sims, setSims] = useState<Simulation[]>([]);
  const [fee, setFee] = useState(1);
  const [tob, setTob] = useState(0);
  const [taille, setTaille] = useState(150);
  const [chargement, setChargement] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [rafraichit, setRafraichit] = useState(false);

  // Formulaire
  const [ouvert, setOuvert] = useState(false);
  const [requete, setRequete] = useState("");
  const [candidats, setCandidats] = useState<Candidat[] | null>(null);
  const [cherche, setCherche] = useState(false);
  const [choisi, setChoisi] = useState<Candidat | null>(null);
  const [coursTrouve, setCoursTrouve] = useState<CoursTrouve | null>(null);
  const [montant, setMontant] = useState("100");
  const [date, setDate] = useState(AUJOURDHUI());
  const [note, setNote] = useState("");
  const [pisteId, setPisteId] = useState<string | null>(null);
  const [enregistre, setEnregistre] = useState(false);

  const charge = useCallback(async () => {
    const [{ data: rows, error }, { data: reglages }] = await Promise.all([
      supabase
        .from("simulations")
        .select("*")
        .order("closed_at", { ascending: true, nullsFirst: true })
        .order("date_entree", { ascending: false }),
      supabase.from("settings").select("*").maybeSingle(),
    ]);
    if (error) setErreur(error.message);
    setSims((rows as Simulation[]) ?? []);
    if (reglages) {
      setFee(Number(reglages.broker_fixed_fee_eur));
      setTob(Number(reglages.tob_pct ?? 0));
      setTaille(Number(reglages.position_size_eur));
      setMontant(String(reglages.position_size_eur));
    }
    setChargement(false);
  }, []);

  useEffect(() => {
    void charge();
  }, [charge]);

  // Une piste peut amorcer le formulaire : le nom est prerempli et la
  // recherche de symbole lancee, mais rien n'est valide sans l'utilisateur.
  useEffect(() => {
    if (!amorce) return;
    setOuvert(true);
    setPisteId(amorce.pisteId);
    setRequete(amorce.nom);
    setChoisi(null);
    setCoursTrouve(null);
    void lanceRecherche(amorce.nom);
    onAmorceConsommee?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amorce]);

  async function lanceRecherche(q: string) {
    const texte = q.trim();
    if (!texte) return;
    setCherche(true);
    setErreur(null);
    setCandidats(null);
    try {
      const r = await appelCotations<{ resultats: Candidat[] }>({
        action: "recherche",
        q: texte,
      });
      setCandidats(r.resultats);
      if (r.resultats.length === 0) {
        setErreur("Aucune société trouvée sous ce nom. Essayez une autre orthographe.");
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    }
    setCherche(false);
  }

  async function choisirCandidat(c: Candidat) {
    setChoisi(c);
    setCoursTrouve(null);
    setErreur(null);
    try {
      const r = await appelCotations<CoursTrouve>({
        action: "historique",
        symbole: c.symbole,
        date,
      });
      setCoursTrouve(r);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    }
  }

  // Changer la date apres avoir choisi la société doit reprendre le cours de
  // ce jour-la : sinon on achèterait au prix d'un autre jour.
  useEffect(() => {
    if (choisi) void choisirCandidat(choisi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const apercu = useMemo(() => {
    if (!coursTrouve) return null;
    const m = Number(montant.replace(",", "."));
    if (!isFinite(m) || m <= 0) return null;
    return prepareEntree(m, coursTrouve.prix, coursTrouve.tauxEur, fee, tob);
  }, [coursTrouve, montant, fee, tob]);

  async function enregistrer(e: React.FormEvent) {
    e.preventDefault();
    if (!coursTrouve || !apercu || apercu.quantite <= 0) return;
    setEnregistre(true);
    setErreur(null);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("simulations").insert({
      user_id: u.user!.id,
      piste_id: pisteId,
      symbole: coursTrouve.symbole,
      company_name: coursTrouve.nom ?? choisi?.nom ?? coursTrouve.symbole,
      devise: coursTrouve.devise,
      montant_eur: Number(montant.replace(",", ".")),
      frais_entree_eur: apercu.fraisEntreeEur,
      prix_entree: coursTrouve.prix,
      taux_entree: coursTrouve.tauxEur,
      quantite: apercu.quantite,
      date_entree: coursTrouve.dateReelle ?? date,
      note: note.trim() || null,
      ref_symbole: coursTrouve.reference?.symbole ?? null,
      ref_prix_entree: coursTrouve.reference?.prix ?? null,
    });
    if (error) {
      setErreur(error.message);
    } else {
      setMessage("Achat fictif enregistré. Revenez dans quelques semaines : c'est le temps qui donne la leçon.");
      reinitialise();
      await charge();
      void rafraichirCours();
    }
    setEnregistre(false);
  }

  function reinitialise() {
    setOuvert(false);
    setRequete("");
    setCandidats(null);
    setChoisi(null);
    setCoursTrouve(null);
    setNote("");
    setPisteId(null);
    setDate(AUJOURDHUI());
    setMontant(String(taille));
  }

  async function rafraichirCours() {
    setRafraichit(true);
    setErreur(null);
    try {
      const r = await appelCotations<{ misesAJour: number; erreurs: string[] }>({
        action: "rafraichir",
      });
      if (r.erreurs?.length) setErreur(`Cours indisponibles : ${r.erreurs.join(" ; ")}`);
      await charge();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    }
    setRafraichit(false);
  }

  async function cloturer(sim: Simulation) {
    const res = calculeSimulation(sim, fee, tob);
    if (res.enAttente) {
      setErreur("Actualisez les cours avant de clôturer : la valeur du jour manque.");
      return;
    }
    const { error } = await supabase
      .from("simulations")
      .update({
        closed_at: new Date().toISOString(),
        prix_sortie: sim.prix_actuel,
        taux_sortie: sim.taux_actuel,
        frais_sortie_eur: res.fraisSortieEur,
      })
      .eq("id", sim.id);
    if (error) setErreur(error.message);
    else {
      setMessage("Simulation clôturée. Elle rejoint votre historique d'entraînement.");
      await charge();
    }
  }

  async function supprimer(id: string) {
    await supabase.from("simulations").delete().eq("id", id);
    await charge();
  }

  const ouvertes = sims.filter((s) => !s.closed_at);
  const fermees = sims.filter((s) => s.closed_at);

  // Bilan d'ensemble : c'est le chiffre qui compte, pas la meilleure ligne.
  const bilan = useMemo(() => {
    const calc = sims.map((s) => calculeSimulation(s, fee, tob));
    const exploitables = calc.filter((c) => !c.enAttente);
    const engage = exploitables.reduce((a, c) => a + c.engageEur, 0);
    const gain = exploitables.reduce((a, c) => a + c.gainEur, 0);
    const avecRef = exploitables.filter((c) => c.referenceGainEur != null);
    const gainRef = avecRef.reduce((a, c) => a + (c.referenceGainEur ?? 0), 0);
    return {
      nombre: exploitables.length,
      engage,
      gain,
      pct: engage > 0 ? (gain / engage) * 100 : 0,
      gainRef: avecRef.length > 0 ? gainRef : null,
      pctRef:
        avecRef.length > 0 && engage > 0
          ? (gainRef / avecRef.reduce((a, c) => a + c.engageEur, 0)) * 100
          : null,
      fraisTotal: exploitables.reduce((a, c) => a + c.fraisEntreeEur + c.fraisSortieEur, 0),
    };
  }, [sims, fee, tob]);

  return (
    <div className="space-y-5">
      {/* Cadrage : sans cette phrase, l'exercice pourrait etre pris pour un
          portefeuille reel. */}
      <div className={`${CARTE} p-5 bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-200/60`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl leading-none" aria-hidden>
            🎓
          </span>
          <div className="space-y-2">
            <h2 className="font-semibold text-slate-800">
              S'entraîner sans risquer un euro
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Enregistrez un achat <strong>fictif</strong> : l'outil retient le cours
              réel du jour choisi, puis suit ce que votre décision aurait donné. Rien
              n'est acheté, aucun compte n'est débité, aucun courtier n'est connecté.
            </p>
            <p className="text-sm text-slate-600 leading-relaxed">
              Trois choses à observer : les <strong>frais</strong>, qui vous font
              partir perdant ; le <strong>temps</strong>, car quelques jours ne
              prouvent rien ; et la <strong>comparaison</strong> avec un ETF mondial,
              qui répond à la vraie question — votre choix valait-il mieux que ne rien
              choisir ?
            </p>
          </div>
        </div>
      </div>

      {message && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200/70 rounded-xl px-4 py-3">
          {message}
        </p>
      )}
      {erreur && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200/70 rounded-xl px-4 py-3">
          {erreur}
        </p>
      )}

      {/* Bilan */}
      {bilan.nombre > 0 && (
        <div className={`${CARTE} p-5 space-y-3`}>
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-semibold text-slate-800">Votre bilan d'entraînement</h3>
            <span className="text-xs text-slate-400">
              {bilan.nombre} simulation{bilan.nombre > 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Chiffre libelle="Engagé" valeur={formatEur(bilan.engage)} />
            <Chiffre
              libelle="Résultat net"
              valeur={formatEur(bilan.gain, true)}
              couleur={couleurResultat(bilan.gain)}
            />
            <Chiffre
              libelle="Soit"
              valeur={formatPct(bilan.pct)}
              couleur={couleurResultat(bilan.gain)}
            />
            <Chiffre
              libelle="Frais payés"
              valeur={formatEur(bilan.fraisTotal)}
              couleur="text-amber-700"
            />
          </div>
          {bilan.gainRef != null && (
            <p className="text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3">
              Les mêmes sommes placées les mêmes jours sur un ETF mondial auraient
              donné{" "}
              <strong className={couleurResultat(bilan.gainRef)}>
                {formatEur(bilan.gainRef, true)}
              </strong>
              {bilan.pctRef != null && <> ({formatPct(bilan.pctRef)})</>}.{" "}
              {bilan.gain > bilan.gainRef
                ? "Vos choix font mieux pour l'instant — sur une durée courte, cela peut n'être que de la chance."
                : "Ne rien choisir aurait fait mieux : c'est le résultat le plus fréquent, et il n'a rien d'humiliant."}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Une fois le formulaire ouvert, il porte son propre bouton d'annulation :
            en afficher deux ferait hesiter sur celui qui efface la saisie. */}
        {!ouvert && (
          <button className={BOUTON_PRINCIPAL} onClick={() => setOuvert(true)}>
            ＋ Nouvel achat fictif
          </button>
        )}
        {sims.length > 0 && (
          <button
            className={BOUTON_DOUX}
            onClick={rafraichirCours}
            disabled={rafraichit}
          >
            {rafraichit ? "Mise à jour…" : "Actualiser les cours"}
          </button>
        )}
      </div>

      {/* Formulaire */}
      {ouvert && (
        <form onSubmit={enregistrer} className={`${CARTE} p-5 space-y-4`}>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Quelle société ou quel ETF ?
            </label>
            <div className="flex gap-2">
              <input
                className={`${CHAMP} flex-1`}
                placeholder="Nom (ex. UCB, Apple, iShares World)"
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
          </div>

          {candidats && candidats.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-slate-500">
                Une même société est cotée sur plusieurs places. Choisissez celle de
                votre marché : c'est le cours et la devise qui changent.
              </p>
              <ul className="divide-y divide-slate-100 border border-slate-200/70 rounded-xl overflow-hidden">
                {candidats.map((c) => (
                  <li key={c.symbole}>
                    <button
                      type="button"
                      onClick={() => choisirCandidat(c)}
                      className={`w-full text-left px-3.5 py-2.5 text-sm transition ${
                        choisi?.symbole === c.symbole
                          ? "bg-indigo-50 text-indigo-900"
                          : "hover:bg-slate-50"
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
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              <span className="block text-xs text-slate-500 mb-1">Montant (€)</span>
              <input
                className={`${CHAMP} w-32`}
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <label className="text-sm">
              <span className="block text-xs text-slate-500 mb-1">
                Date de l'achat fictif
              </span>
              <input
                type="date"
                className={`${CHAMP} w-44`}
                value={date}
                max={AUJOURDHUI()}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Vous pouvez choisir une date passée pour voir ce qu'un achat d'il y a
            trois mois aurait donné. Choisir la date après coup en sachant ce qui
            s'est produit ne prouve rien — l'exercice n'a de valeur que si vous
            décidez d'abord et regardez ensuite.
          </p>

          <label className="block text-sm">
            <span className="block text-xs text-slate-500 mb-1">
              Pourquoi ce choix ? (à relire plus tard)
            </span>
            <textarea
              className={`${CHAMP} w-full h-20 resize-none`}
              placeholder="Ex. un dirigeant a acheté pour 200 000 € et je veux voir ce que ça donne."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>

          {coursTrouve && apercu && (
            <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 space-y-2 text-sm">
              <p className="text-slate-700">
                Cours retenu :{" "}
                <strong>
                  {coursTrouve.prix.toLocaleString("fr-FR", {
                    maximumFractionDigits: 2,
                  })}{" "}
                  {coursTrouve.devise}
                </strong>
                {coursTrouve.dateReelle && coursTrouve.dateReelle !== date && (
                  <span className="text-slate-500">
                    {" "}
                    — dernière clôture connue, celle du{" "}
                    {new Date(coursTrouve.dateReelle).toLocaleDateString("fr-FR")} (la
                    bourse était fermée le jour demandé, ou la séance n'est pas
                    terminée)
                  </span>
                )}
                {coursTrouve.devise !== "EUR" && (
                  <span className="text-slate-500">
                    {" "}
                    · 1 € = {coursTrouve.tauxEur.toFixed(2).replace(".", ",")}{" "}
                    {coursTrouve.devise}
                  </span>
                )}
              </p>
              <ul className="text-slate-600 space-y-1">
                <li>
                  Frais et taxe prélevés à l'achat :{" "}
                  <strong className="text-amber-700">
                    {formatEur(apercu.fraisEntreeEur)}
                  </strong>
                </li>
                <li>
                  Réellement investi : <strong>{formatEur(apercu.investiEur)}</strong>,
                  soit{" "}
                  <strong>
                    {apercu.quantite.toLocaleString("fr-FR", {
                      maximumFractionDigits: 4,
                    })}
                  </strong>{" "}
                  action(s)
                </li>
                <li>
                  Il faudra gagner{" "}
                  <strong className="text-amber-700">
                    {formatPct(apercu.impact.roundTripPct, false)}
                  </strong>{" "}
                  rien que pour rentrer dans vos frais.
                </li>
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <button
              className={BOUTON_PRINCIPAL}
              disabled={!coursTrouve || !apercu || enregistre}
            >
              {enregistre ? "Enregistrement…" : "Enregistrer cet achat fictif"}
            </button>
            <button type="button" className={BOUTON_DOUX} onClick={reinitialise}>
              Annuler
            </button>
          </div>
        </form>
      )}

      {chargement && <p className="text-sm text-slate-400">Chargement…</p>}

      {!chargement && sims.length === 0 && !ouvert && (
        <div className={`${CARTE} p-6 text-sm text-slate-500 leading-relaxed`}>
          <p className="text-slate-700 font-medium mb-1.5">
            Aucune simulation pour l'instant.
          </p>
          <p>
            Commencez par une somme que vous envisageriez vraiment — 50 ou 100 € —
            sur une société qui vous intrigue. Vous verrez immédiatement ce que les
            frais représentent, et dans quelques mois si votre intuition tenait.
          </p>
        </div>
      )}

      {ouvertes.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            En cours
          </h3>
          {ouvertes.map((s) => (
            <CarteSimulation
              key={s.id}
              sim={s}
              fee={fee}
              tob={tob}
              onCloturer={() => cloturer(s)}
              onSupprimer={() => supprimer(s.id)}
            />
          ))}
        </section>
      )}

      {fermees.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Clôturées
          </h3>
          {fermees.map((s) => (
            <CarteSimulation
              key={s.id}
              sim={s}
              fee={fee}
              tob={tob}
              onSupprimer={() => supprimer(s.id)}
            />
          ))}
        </section>
      )}

      <p className="text-xs text-slate-400 leading-relaxed">
        Les cours proviennent d'un service public de données de marché et peuvent
        être différés. Ils servent uniquement à valoriser un exercice : cet outil ne
        passe aucun ordre et ne se connecte à aucun courtier. {DISCLAIMER}
      </p>
    </div>
  );
}

function Chiffre({
  libelle,
  valeur,
  couleur = "text-slate-800",
}: {
  libelle: string;
  valeur: string;
  couleur?: string;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{libelle}</p>
      <p className={`text-lg font-semibold tabular-nums ${couleur}`}>{valeur}</p>
    </div>
  );
}

function CarteSimulation({
  sim,
  fee,
  tob,
  onCloturer,
  onSupprimer,
}: {
  sim: Simulation;
  fee: number;
  tob: number;
  onCloturer?: () => void;
  onSupprimer: () => void;
}) {
  const [detail, setDetail] = useState(false);
  const r = calculeSimulation(sim, fee, tob);
  const cloturee = sim.closed_at != null;

  return (
    <article className={`${CARTE} overflow-hidden`}>
      <div className={`h-1 ${r.enAttente ? "bg-slate-300" : r.gainEur >= 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
      <div className="p-5 space-y-3.5">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 className="font-semibold text-slate-800 leading-snug">
              {sim.company_name}
            </h4>
            <p className="text-xs text-slate-400">
              {sim.symbole} · achat fictif du{" "}
              {new Date(sim.date_entree).toLocaleDateString("fr-FR")} ·{" "}
              {r.jours} jour{r.jours > 1 ? "s" : ""}
              {cloturee && " · clôturée"}
            </p>
          </div>
          {!r.enAttente && (
            <div className="text-right shrink-0">
              <p className={`text-lg font-semibold tabular-nums ${couleurResultat(r.gainEur)}`}>
                {formatEur(r.gainEur, true)}
              </p>
              <p className={`text-xs tabular-nums ${couleurResultat(r.gainEur)}`}>
                {formatPct(r.gainPct)}
              </p>
            </div>
          )}
        </header>

        {r.enAttente ? (
          <p className="text-sm text-slate-500">
            Valorisation pas encore récupérée. Utilisez « Actualiser les cours ».
          </p>
        ) : (
          <div className={`rounded-xl border px-4 py-3 text-sm ${fondResultat(r.gainEur)}`}>
            <p className="text-slate-700">
              Vous avez engagé <strong>{formatEur(r.engageEur)}</strong>. Si vous
              revendiez {cloturee ? "au moment de la clôture" : "aujourd'hui"}, il
              vous resterait <strong>{formatEur(r.netEur)}</strong>, frais de vente
              déduits.
            </p>
          </div>
        )}

        {sim.note && (
          <p className="text-sm text-slate-600 italic leading-relaxed border-l-2 border-slate-200 pl-3">
            « {sim.note} »
          </p>
        )}

        {!r.enAttente && (
          <>
            <button
              onClick={() => setDetail(!detail)}
              className="text-xs font-medium text-indigo-700 hover:text-indigo-900"
            >
              {detail ? "− Masquer le détail" : "+ D'où vient ce résultat ?"}
            </button>

            {detail && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-2.5 text-sm">
                <Ligne
                  libelle="Somme engagée"
                  valeur={formatEur(r.engageEur)}
                />
                <Ligne
                  libelle="dont frais et taxe à l'achat"
                  valeur={`− ${formatEur(r.fraisEntreeEur)}`}
                  couleur="text-amber-700"
                />
                <Ligne
                  libelle="Valeur des titres"
                  valeur={formatEur(r.valeurEur)}
                />
                <Ligne
                  libelle={cloturee ? "Frais de vente" : "Frais de vente estimés"}
                  valeur={`− ${formatEur(r.fraisSortieEur)}`}
                  couleur="text-amber-700"
                />
                <Ligne
                  libelle="Résultat net"
                  valeur={formatEur(r.gainEur, true)}
                  couleur={couleurResultat(r.gainEur)}
                  gras
                />

                <p className="text-slate-600 leading-relaxed pt-1.5 border-t border-slate-200">
                  Le cours a varié de{" "}
                  <strong className={couleurResultat(r.variationCoursPct)}>
                    {formatPct(r.variationCoursPct)}
                  </strong>{" "}
                  en {sim.devise}.
                  {Math.abs(r.effetChangePct) > 0.05 && (
                    <>
                      {" "}
                      Le taux de change a{" "}
                      {r.effetChangePct >= 0 ? "ajouté" : "retiré"}{" "}
                      <strong className={couleurResultat(r.effetChangePct)}>
                        {formatPct(Math.abs(r.effetChangePct), false)}
                      </strong>
                      . Un titre étranger peut monter et vous faire perdre de
                      l'argent une fois reconverti en euros.
                    </>
                  )}{" "}
                  Après frais, il reste{" "}
                  <strong className={couleurResultat(r.gainPct)}>
                    {formatPct(r.gainPct)}
                  </strong>{" "}
                  — l'écart entre les deux, ce sont les frais.
                </p>

                {r.referenceGainEur != null && (
                  <p className="text-slate-600 leading-relaxed pt-1.5 border-t border-slate-200">
                    La même somme, le même jour, sur un ETF actions mondiales aurait
                    donné{" "}
                    <strong className={couleurResultat(r.referenceGainEur)}>
                      {formatEur(r.referenceGainEur, true)}
                    </strong>
                    {r.referenceGainPct != null && (
                      <> ({formatPct(r.referenceGainPct)})</>
                    )}
                    .{" "}
                    {r.gainEur > r.referenceGainEur
                      ? "Votre choix fait mieux ici."
                      : "Ne rien choisir aurait mieux valu ici."}{" "}
                    Sur quelques semaines, cet écart ne dit presque rien : c'est en
                    répétant l'exercice qu'il devient instructif.
                  </p>
                )}

                {sim.prix_maj_at && (
                  <p className="text-xs text-slate-400">
                    Cours du{" "}
                    {new Date(sim.prix_maj_at).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                    .
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div className="flex gap-3 pt-1">
          {onCloturer && !r.enAttente && (
            <button
              onClick={onCloturer}
              className="text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Clôturer (revente fictive)
            </button>
          )}
          <button
            onClick={onSupprimer}
            className="text-xs text-slate-400 hover:text-rose-600 ml-auto"
          >
            Supprimer
          </button>
        </div>
      </div>
    </article>
  );
}

function Ligne({
  libelle,
  valeur,
  couleur = "text-slate-800",
  gras = false,
}: {
  libelle: string;
  valeur: string;
  couleur?: string;
  gras?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-500">{libelle}</span>
      <span className={`tabular-nums ${couleur} ${gras ? "font-semibold" : ""}`}>
        {valeur}
      </span>
    </div>
  );
}
