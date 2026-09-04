import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { BOUTON_DOUX, BOUTON_PRINCIPAL, CARTE, CHAMP, SURTITRE } from "../lib/theme";
import SousOnglets, { panneau } from "./SousOnglets";

/**
 * Boite de validation.
 *
 * Le seul endroit de l'application ou l'utilisateur decide. Trois principes
 * portes par l'ecran lui-meme :
 *
 *  1. rien ne s'execute. Approuver inscrit une decision et rien d'autre ; c'est
 *     ecrit sur l'ecran, pas seulement dans la documentation ;
 *  2. le niveau de preuve est visible sur chaque proposition, jamais replie ;
 *  3. ce qui manque est affiche avant ce qui est conclu. Une proposition
 *     construite sur des donnees incompletes le dit d'abord.
 */

type Statut = "pending" | "approved" | "rejected" | "expired";
type Niveau = "fait_verifie" | "mecanique_standard" | "sortie_modele";

interface Proposition {
  id: string;
  title: string;
  status: Statut;
  rationale_md: string;
  rationale_plain: string | null;
  rationale_plain_evidence: Niveau | null;
  evidence_level: Niveau;
  source_urls: string[];
  payload: Record<string, unknown> | null;
  expires_at: string | null;
  created_at: string;
  decided_at: string | null;
  decision_note: string | null;
  rules: { key: string; title: string; domain: string; severity: string } | null;
}

const NIVEAUX: Record<Niveau, { libelle: string; detail: string; classe: string }> = {
  fait_verifie: {
    libelle: "Fait vérifié",
    detail: "Adossé à une source identifiable, citée ci-dessous.",
    classe: "bg-emerald-100 text-emerald-800",
  },
  mecanique_standard: {
    libelle: "Calcul standard",
    detail:
      "Dérivation faite sur vos propres données et sur les sources citées. Vérifiable au crayon ; ce n'est pas une mesure publiée.",
    classe: "bg-slate-200 text-slate-700",
  },
  sortie_modele: {
    libelle: "Sortie de modèle",
    detail:
      "Reformulation écrite par un modèle de langage à partir du raisonnement ci-dessous. Elle ne prouve rien par elle-même.",
    classe: "bg-amber-100 text-amber-800",
  },
};

const SEVERITES: Record<string, string> = {
  info: "bg-slate-200 text-slate-700",
  attention: "bg-amber-100 text-amber-800",
  urgent: "bg-rose-100 text-rose-800",
};

export default function PropositionsPage() {
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [historique, setHistorique] = useState(false);
  const [evaluation, setEvaluation] = useState(false);
  const [echecMoteur, setEchecMoteur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    const { data, error } = await supabase
      .from("proposals")
      .select(
        "id,title,status,rationale_md,rationale_plain,rationale_plain_evidence,evidence_level," +
          "source_urls,payload,expires_at,created_at,decided_at,decision_note," +
          "rules(key,title,domain,severity)",
      )
      .order("created_at", { ascending: false });
    if (error) setErreur(error.message);
    else setPropositions((data ?? []) as unknown as Proposition[]);
    setChargement(false);
  }, []);

  /**
   * Reevaluer les regles a l'ouverture de la page.
   *
   * Pas de tache planifiee : une tache planifiee suppose de deposer la cle de
   * role service quelque part pour qu'elle puisse s'authentifier, alors que la
   * session de l'utilisateur suffit — la fonction en deduit son identite. Et le
   * moment ou ces verifications sont utiles est precisement celui ou l'on ouvre
   * cette page.
   *
   * Le calcul est idempotent : une proposition en attente au raisonnement
   * inchange n'est pas redeposee. Rouvrir la page ne cree donc pas de doublon.
   */
  const evaluer = useCallback(async () => {
    setEvaluation(true);
    setEchecMoteur(null);
    const { error } = await supabase.functions.invoke("propositions", { body: {} });
    setEvaluation(false);
    // Un echec du moteur ne doit pas cacher les propositions deja deposees :
    // on le signale et on affiche quand meme ce qui existe.
    if (error) setEchecMoteur(error.message);
    await charger();
  }, [charger]);

  useEffect(() => {
    evaluer();
    // Une seule fois par montage de la page : `evaluer` depend de `charger`,
    // stable, donc cet effet ne se rejoue pas a chaque rendu.
  }, [evaluer]);

  const enAttente = propositions.filter((p) => p.status === "pending");
  const decidees = propositions.filter((p) => p.status !== "pending");
  const liste = historique ? decidees : enAttente;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">À valider</h2>
        <p className="text-base text-slate-500 leading-snug">
          Des vérifications à faire vous-même, calculées à partir de vos données
          et de sources citées. Rien ne s'exécute ici.
        </p>
      </header>

      {/* La promesse structurante de l'outil, ecrite la ou l'utilisateur
          decide — pas releguee dans une page « a propos ». */}
      <div className={`${CARTE} p-4 border-l-4 border-l-indigo-500`}>
        <p className={`${SURTITRE} text-indigo-800`}>Ce que fait « approuver »</p>
        <p className="text-sm text-slate-700 leading-relaxed mt-1.5">
          Approuver enregistre votre décision et sort la proposition de cette
          liste. Aucun courrier n'est envoyé, aucun contrat n'est modifié, aucun
          ordre n'est passé. Les démarches, s'il y en a, restent les vôtres.
        </p>
      </div>

      {/* Meme composant que les autres destinations a deux vues : une rangee de
          boutons ne s'annonce pas comme un groupe d'onglets et n'accepte pas
          les fleches, alors qu'elle joue exactement ce role. */}
      <SousOnglets
        base="propositions"
        etiquette="Filtrer les propositions"
        courante={historique ? "decidees" : "attente"}
        onChange={(c) => setHistorique(c === "decidees")}
        vues={[
          { cle: "attente", label: "En attente", compte: enAttente.length },
          { cle: "decidees", label: "Décidées", compte: decidees.length },
        ]}
      />

      <button
        type="button"
        onClick={evaluer}
        disabled={evaluation}
        className="text-sm text-indigo-700 underline hover:text-indigo-900 min-h-[44px]"
      >
        ↻ Revérifier maintenant
      </button>

      {(chargement || evaluation) && (
        <p className="text-sm text-slate-600" role="status">
          {evaluation ? "Vérification en cours…" : "Chargement…"}
        </p>
      )}

      {echecMoteur && (
        <div className={`${CARTE} p-4 border-l-4 border-l-amber-500`}>
          <p className="text-sm text-slate-700 leading-relaxed">
            Les vérifications n'ont pas pu être relancées ({echecMoteur}). Ce qui
            s'affiche ci-dessous a été calculé plus tôt et peut être daté.
          </p>
        </div>
      )}

      {erreur && (
        <div className={`${CARTE} p-4 border-l-4 border-l-rose-500`}>
          <p className="text-sm text-slate-700">
            Les propositions n'ont pas pu être chargées : {erreur}
          </p>
          <button type="button" onClick={charger} className={`${BOUTON_DOUX} mt-3`}>
            Réessayer
          </button>
        </div>
      )}

      {!chargement && !erreur && liste.length === 0 && (
        <div className={`${CARTE} p-5`}>
          <p className="text-base text-slate-700 leading-relaxed">
            {historique
              ? "Aucune décision enregistrée pour l'instant."
              : "Rien à valider. Les règles ne se déclenchent que lorsqu'un seuil est franchi, qu'une échéance approche ou qu'un changement sourcé a été enregistré."}
          </p>
          {!historique && (
            <p className="text-base text-slate-700 leading-relaxed mt-3">
              Si vous n'avez encore rien saisi, c'est attendu : les vérifications
              se calculent sur vos données, et l'outil n'en invente aucune.
              Renseignez-les dans <strong>Mes données</strong>.
            </p>
          )}
        </div>
      )}

      <ul
        {...panneau("propositions", historique ? "decidees" : "attente")}
        className="space-y-4 focus:outline-none"
      >
        {liste.map((p) => (
          <li key={p.id}>
            <Fiche proposition={p} onDecide={charger} />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------

function Fiche({ proposition: p, onDecide }: { proposition: Proposition; onDecide: () => void }) {
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  const manque = Array.isArray(p.payload?.manque) ? (p.payload!.manque as string[]) : [];
  const niveau = NIVEAUX[p.evidence_level];

  async function decider(status: "approved" | "rejected") {
    setEnvoi(true);
    setEchec(null);
    const { error } = await supabase
      .from("proposals")
      .update({
        status,
        decided_at: new Date().toISOString(),
        decision_note: note.trim() || null,
      })
      .eq("id", p.id);
    setEnvoi(false);
    if (error) setEchec(error.message);
    else onDecide();
  }

  return (
    <article className={`${CARTE} p-5 space-y-4`}>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {p.rules && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SEVERITES[p.rules.severity] ?? SEVERITES.info}`}
            >
              {p.rules.severity}
            </span>
          )}
          {/* Le niveau de preuve est affiche, jamais masque : c'est la
              difference entre « on a mesuré » et « on a calculé ». */}
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${niveau.classe}`}>
            {niveau.libelle}
          </span>
          {p.status !== "pending" && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
              {p.status === "approved" ? "approuvée" : p.status === "rejected" ? "rejetée" : "périmée"}
            </span>
          )}
        </div>
        <h3 className="text-lg font-semibold text-slate-900 leading-snug">{p.title}</h3>
        <p className="text-xs text-slate-600">
          {p.rules ? `${p.rules.title} · ` : ""}
          {new Date(p.created_at).toLocaleDateString("fr-BE")}
          {p.expires_at ? ` · valable jusqu'au ${new Date(p.expires_at).toLocaleDateString("fr-BE")}` : ""}
        </p>
      </div>

      {/* Ce qui manque passe AVANT ce qui est conclu : une conclusion tirée de
          données incomplètes doit être lue en sachant lesquelles. */}
      {manque.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5">
          <p className={`${SURTITRE} text-amber-800`}>Données manquantes</p>
          <ul className="mt-1.5 space-y-1 text-sm text-slate-700">
            {manque.map((m) => (
              <li key={m}>— {m}</li>
            ))}
          </ul>
          <p className="text-xs text-slate-600 mt-2">
            Aucune estimation n'a été substituée à ces valeurs.
          </p>
        </div>
      )}

      {p.rationale_plain && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5">
          <p className={`${SURTITRE} text-slate-600`}>
            En clair · {NIVEAUX[p.rationale_plain_evidence ?? "sortie_modele"].libelle}
          </p>
          <p className="text-base text-slate-800 leading-relaxed mt-1.5">{p.rationale_plain}</p>
          <p className="text-xs text-slate-600 mt-2">
            {NIVEAUX.sortie_modele.detail}
          </p>
        </div>
      )}

      <Raisonnement texte={p.rationale_md} />

      <p className="text-xs text-slate-600">{niveau.detail}</p>

      {p.source_urls.length > 0 && (
        <div>
          <p className={`${SURTITRE} text-slate-600`}>Sources</p>
          <ul className="mt-1.5 space-y-1">
            {p.source_urls.map((u) => (
              <li key={u}>
                <a
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-700 underline break-all hover:text-indigo-900"
                >
                  {u}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.status === "pending" ? (
        <div className="space-y-3 pt-1">
          <label className="block">
            <span className="text-sm text-slate-700">Note (facultative)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ce que vous en faites, pour vous en souvenir"
              className={`${CHAMP} w-full mt-1`}
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => decider("approved")}
              disabled={envoi}
              className={`${BOUTON_PRINCIPAL} flex-1`}
            >
              Approuver
            </button>
            <button
              type="button"
              onClick={() => decider("rejected")}
              disabled={envoi}
              className={`${BOUTON_DOUX} flex-1`}
            >
              Rejeter
            </button>
          </div>
          {echec && <p className="text-sm text-rose-700">Décision non enregistrée : {echec}</p>}
        </div>
      ) : (
        p.decision_note && (
          <p className="text-sm text-slate-600 border-l-4 border-slate-200 pl-3">
            Votre note : {p.decision_note}
          </p>
        )
      )}
    </article>
  );
}

// ---------------------------------------------------------------------------

/**
 * Rendu du raisonnement.
 *
 * Volontairement minimal : gras, listes, tableaux et paragraphes. Pas de
 * bibliotheque markdown, et surtout pas de HTML injecte — le texte vient d'un
 * gabarit deterministe, mais il transporte des valeurs venues de signaux
 * externes. Le rendre par `dangerouslySetInnerHTML` ferait dependre la
 * securite de l'ecran de la propreté d'un flux tiers.
 */
function Raisonnement({ texte }: { texte: string }) {
  const lignes = texte.split("\n");
  const sortie: JSX.Element[] = [];
  let i = 0;

  while (i < lignes.length) {
    const l = lignes[i];
    if (l.trim() === "") {
      i += 1;
      continue;
    }

    if (l.startsWith("|")) {
      const bloc: string[] = [];
      while (i < lignes.length && lignes[i].startsWith("|")) {
        bloc.push(lignes[i]);
        i += 1;
      }
      sortie.push(<Tableau key={`t${i}`} lignes={bloc} />);
      continue;
    }

    if (l.startsWith("- ")) {
      const points: string[] = [];
      while (i < lignes.length && lignes[i].startsWith("- ")) {
        points.push(lignes[i].slice(2));
        i += 1;
      }
      sortie.push(
        <ul key={`u${i}`} className="space-y-1 text-base text-slate-700 leading-relaxed">
          {points.map((p, k) => (
            <li key={k} className="flex gap-2">
              <span aria-hidden className="text-slate-400">
                —
              </span>
              <span>{gras(p)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    sortie.push(
      <p key={`p${i}`} className="text-base text-slate-700 leading-relaxed">
        {gras(l)}
      </p>,
    );
    i += 1;
  }

  return <div className="space-y-3">{sortie}</div>;
}

function Tableau({ lignes }: { lignes: string[] }) {
  const cellules = lignes.map((l) =>
    l.split("|").slice(1, -1).map((c) => c.trim()),
  );
  // La deuxieme ligne d'un tableau markdown est la ligne de separation.
  const [entete, , ...corps] = cellules;
  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            {entete?.map((c, k) => (
              <th key={k} scope="col" className="text-left font-semibold text-slate-700 py-1.5 pr-4">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {corps.map((r, k) => (
            <tr key={k} className="border-t border-slate-200">
              {r.map((c, j) => (
                <td key={j} className="py-1.5 pr-4 text-slate-700 tabular-nums">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** `**gras**`, sans passer par du HTML. */
function gras(s: string): JSX.Element {
  const parts = s.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, k) =>
        k % 2 === 1 ? (
          <strong key={k} className="font-semibold text-slate-900">
            {p}
          </strong>
        ) : (
          <span key={k}>{p}</span>
        ),
      )}
    </>
  );
}
