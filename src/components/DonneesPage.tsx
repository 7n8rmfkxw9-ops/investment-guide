import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  DOMAINES,
  FAITS,
  SIGNAUX,
  faitsDuDomaine,
  type DefinitionFait,
  type DefinitionSignal,
} from "../lib/faits";
import { BOUTON_DOUX, BOUTON_PRINCIPAL, CARTE, CHAMP } from "../lib/theme";
import Repliable from "./Repliable";

/**
 * Saisie de l'etat personnel et des changements exterieurs.
 *
 * Sans cet ecran, l'assistant ne peut rien faire : les regles lisent des faits
 * et des signaux, et personne n'avait de moyen d'en deposer. La boite de
 * validation restait vide et paraissait cassee alors qu'elle etait simplement
 * a jeun.
 *
 * Deux choix de conception qui ne sont pas cosmetiques :
 *
 *  - on ne saisit que des cles du catalogue. Un champ libre laisserait passer
 *    une faute de frappe, et une cle mal ecrite donne une regle qui ne se
 *    declenche jamais sans que rien ne le signale ;
 *  - la fraicheur est affichee au meme rang que la valeur. Un montant assure
 *    de 2019 ne produit pas moins de propositions qu'un montant a jour, il en
 *    produit de fausses et de rassurantes.
 */

interface Fait {
  key: string;
  value: unknown;
  verified_at: string;
  review_cadence_months: number | null;
  notes: string | null;
}

interface SignalLigne {
  id: string;
  source_url: string;
  observed_at: string;
  summary: string;
  domain: string;
  payload: Record<string, unknown>;
}

export default function DonneesPage() {
  const [faits, setFaits] = useState<Fait[]>([]);
  const [signaux, setSignaux] = useState<SignalLigne[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    setChargement(true);
    const [f, s] = await Promise.all([
      supabase
        .from("personal_facts")
        .select("key,value,verified_at,review_cadence_months,notes"),
      supabase
        .from("signals")
        .select("id,source_url,observed_at,summary,domain,payload")
        .order("observed_at", { ascending: false })
        .limit(50),
    ]);
    if (f.error || s.error) setErreur((f.error ?? s.error)!.message);
    else {
      setErreur(null);
      setFaits((f.data ?? []) as Fait[]);
      setSignaux((s.data ?? []) as SignalLigne[]);
    }
    setChargement(false);
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const renseignes = faits.length;
  const requis = FAITS.filter((f) => !f.facultatif).length;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h2 className="text-2xl font-semibold text-slate-900">Vos données</h2>
        <p className="text-base text-slate-500 leading-snug">
          Ce que l'assistant sait de vous. Rien n'est deviné : un champ vide
          reste vide, et une vérification qui en dépend le dit au lieu
          d'estimer.
        </p>
      </header>

      <div className={`${CARTE} p-4`}>
        <p className="text-sm text-slate-700 leading-relaxed">
          {renseignes} champ{renseignes > 1 ? "s" : ""} renseigné
          {renseignes > 1 ? "s" : ""} sur {requis} utile
          {requis > 1 ? "s" : ""}. Ces données restent dans votre compte et ne
          sont visibles que de vous.
        </p>
      </div>

      {erreur && (
        <div className={`${CARTE} p-4 border-l-4 border-l-rose-500`}>
          <p className="text-sm text-slate-700">Chargement impossible : {erreur}</p>
          <button type="button" onClick={charger} className={`${BOUTON_DOUX} mt-3`}>
            Réessayer
          </button>
        </div>
      )}

      {chargement && (
        <p className="text-sm text-slate-600" role="status">
          Chargement…
        </p>
      )}

      {Object.entries(DOMAINES).map(([cle, d]) => (
        <section key={cle} className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{d.titre}</h3>
            <p className="text-sm text-slate-500 leading-snug">{d.detail}</p>
          </div>
          <div className="space-y-3">
            {faitsDuDomaine(cle).map((def) => (
              <ChampFait
                key={def.cle}
                definition={def}
                fait={faits.find((f) => f.key === def.cle) ?? null}
                onEnregistre={charger}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="space-y-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Changements extérieurs</h3>
          <p className="text-sm text-slate-500 leading-snug">
            Un barème relevé, un crédit qui se termine, un délai de préavis. Chacun
            demande l'adresse où vous l'avez lu — sans elle, ce n'est pas une
            information vérifiable.
          </p>
        </div>
        {SIGNAUX.map((s) => (
          <FormulaireSignal
            key={s.domaine}
            definition={s}
            existants={signaux.filter((x) => x.domain === s.domaine)}
            onEnregistre={charger}
          />
        ))}
      </section>

      <Repliable
        id="donnees-pourquoi"
        titre="Pourquoi l'outil ne complète jamais un champ vide"
        icone="🕳️"
        resume="Ce qu'une estimation coûterait, et pourquoi la date compte autant que la valeur."
      >
        <p>
          Un assistant qui estime les données qui lui manquent produit des
          conclusions de la même apparence que celles qu'il a calculées. Rien ne
          les distingue à la lecture, et c'est précisément sur celles-là qu'on
          se tromperait. Ici, une vérification à laquelle il manque une valeur
          annonce ce qui manque et s'arrête.
        </p>
        <p>
          La date de confirmation compte autant que la valeur elle-même. Une
          valeur assurée saisie il y a quatre ans ne produit pas moins de
          vérifications qu'une valeur à jour : elle en produit de rassurantes et
          de fausses. C'est pourquoi chaque champ affiche depuis quand il n'a
          pas été reconfirmé, et pourquoi le bouton « C'est toujours exact »
          existe.
        </p>
      </Repliable>
    </div>
  );
}

// ---------------------------------------------------------------------------

function versValeur(def: DefinitionFait, brut: string): unknown | null {
  const t = brut.trim();
  if (t === "") return null;
  if (def.type === "euros" || def.type === "nombre") {
    const n = Number(t.replace(/\s/g, "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  if (def.type === "pourcentage") {
    const n = Number(t.replace(",", "."));
    // Saisi en pourcent, stocke en proportion : la regle raisonne en fraction
    // de la valeur assuree, l'utilisateur pense en « dix pour cent ».
    return Number.isFinite(n) ? n / 100 : null;
  }
  if (def.type === "date") {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return t;
}

function versTexte(def: DefinitionFait, v: unknown): string {
  if (v === null || v === undefined) return "";
  if (def.type === "pourcentage" && typeof v === "number") return String(Math.round(v * 1000) / 10);
  if (def.type === "date" && typeof v === "string") return v.slice(0, 10);
  return String(v);
}

function moisDepuis(iso: string): number {
  const d = new Date(iso);
  const n = new Date();
  return (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth());
}

function ChampFait({
  definition: def,
  fait,
  onEnregistre,
}: {
  definition: DefinitionFait;
  fait: Fait | null;
  onEnregistre: () => void;
}) {
  const [valeur, setValeur] = useState(() => versTexte(def, fait?.value));
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  useEffect(() => setValeur(versTexte(def, fait?.value)), [def, fait]);

  const age = fait ? moisDepuis(fait.verified_at) : null;
  const perime =
    fait && def.cadenceMois !== null && age !== null && age >= def.cadenceMois;

  async function enregistrer(valeurBrute: string) {
    const v = versValeur(def, valeurBrute);
    setEnvoi(true);
    setEchec(null);
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid) {
      setEnvoi(false);
      setEchec("session expirée");
      return;
    }

    const { error } =
      v === null
        ? await supabase.from("personal_facts").delete().eq("key", def.cle).eq("user_id", uid)
        : await supabase.from("personal_facts").upsert(
            {
              user_id: uid,
              key: def.cle,
              value: v,
              domain: def.domaine,
              source: "saisie_manuelle",
              verified_at: new Date().toISOString(),
              review_cadence_months: def.cadenceMois,
            },
            { onConflict: "user_id,key" },
          );
    setEnvoi(false);
    if (error) setEchec(error.message);
    else onEnregistre();
  }

  const idAide = `aide-${def.cle.replace(/\./g, "-")}`;

  return (
    <div className={`${CARTE} p-4 space-y-2`}>
      <label className="block">
        <span className="text-base font-medium text-slate-900">
          {def.libelle}
          {def.facultatif && (
            <span className="text-sm font-normal text-slate-500"> · facultatif</span>
          )}
        </span>
        <div className="flex gap-2 mt-1.5">
          <input
            type={def.type === "date" ? "date" : def.type === "texte" ? "text" : "text"}
            inputMode={def.type === "date" || def.type === "texte" ? undefined : "decimal"}
            value={valeur}
            onChange={(e) => setValeur(e.target.value)}
            aria-describedby={idAide}
            placeholder={def.type === "euros" ? "€" : def.type === "pourcentage" ? "%" : ""}
            className={`${CHAMP} flex-1 min-w-0`}
          />
          <button
            type="button"
            onClick={() => enregistrer(valeur)}
            disabled={envoi || valeur === versTexte(def, fait?.value)}
            className={BOUTON_PRINCIPAL}
          >
            Enregistrer
          </button>
        </div>
      </label>

      <p id={idAide} className="text-sm text-slate-600 leading-relaxed">
        {def.aQuoi}
        {def.ou && <span className="block text-slate-500 mt-0.5">Où : {def.ou}</span>}
      </p>

      {fait && (
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <span className={`text-xs ${perime ? "text-amber-800 font-medium" : "text-slate-500"}`}>
            {perime ? "⚠ " : ""}
            Confirmé il y a {age} mois
            {def.cadenceMois !== null && ` · à revoir tous les ${def.cadenceMois} mois`}
          </span>
          <button
            type="button"
            onClick={() => enregistrer(valeur)}
            disabled={envoi}
            className="text-xs text-indigo-700 underline hover:text-indigo-900 min-h-[44px] px-1"
          >
            C'est toujours exact
          </button>
        </div>
      )}

      {echec && <p className="text-sm text-rose-700">Non enregistré : {echec}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------

function FormulaireSignal({
  definition: def,
  existants,
  onEnregistre,
}: {
  definition: DefinitionSignal;
  existants: SignalLigne[];
  onEnregistre: () => void;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [url, setUrl] = useState("");
  const [champs, setChamps] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [echec, setEchec] = useState<string | null>(null);

  async function enregistrer() {
    setEchec(null);
    if (!/^https?:\/\/\S+/.test(url.trim())) {
      // La contrainte existe aussi en base ; la doubler ici evite un aller-retour
      // et permet d'expliquer pourquoi plutot que d'afficher une erreur Postgres.
      setEchec(
        "Une adresse est obligatoire : un changement que personne ne peut aller relire n'est pas une information vérifiable.",
      );
      return;
    }

    const payload: Record<string, unknown> = {};
    for (const c of def.champs) {
      const brut = (champs[c.cle] ?? "").trim();
      if (brut === "") continue;
      if (c.type === "euros" || c.type === "pourcentage" || c.type === "nombre") {
        const n = Number(brut.replace(/\s/g, "").replace(",", "."));
        if (Number.isFinite(n)) payload[c.cle] = n;
      } else {
        payload[c.cle] = brut;
      }
    }
    if (Object.keys(payload).length === 0) {
      setEchec("Renseignez au moins une valeur.");
      return;
    }

    setEnvoi(true);
    const { data: session } = await supabase.auth.getUser();
    const uid = session.user?.id;
    if (!uid) {
      setEnvoi(false);
      setEchec("session expirée");
      return;
    }
    const { error } = await supabase.from("signals").insert({
      user_id: uid,
      source_url: url.trim(),
      domain: def.domaine,
      summary: def.titre,
      payload,
      observed_at: new Date().toISOString(),
    });
    setEnvoi(false);
    if (error) setEchec(error.message);
    else {
      setUrl("");
      setChamps({});
      setOuvert(false);
      onEnregistre();
    }
  }

  return (
    <div className={`${CARTE} p-4 space-y-3`}>
      <div>
        <p className="text-base font-medium text-slate-900">{def.titre}</p>
        <p className="text-sm text-slate-600 leading-relaxed mt-0.5">{def.aQuoi}</p>
      </div>

      {existants.length > 0 && (
        <ul className="space-y-1.5">
          {existants.slice(0, 3).map((s) => (
            <li key={s.id} className="text-sm text-slate-600">
              {new Date(s.observed_at).toLocaleDateString("fr-BE")} —{" "}
              {Object.entries(s.payload)
                .map(([k, v]) => `${k} : ${String(v)}`)
                .join(", ")}
              <a
                href={s.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-xs text-indigo-700 underline break-all"
              >
                {s.source_url}
              </a>
            </li>
          ))}
        </ul>
      )}

      {ouvert ? (
        <div className="space-y-2.5">
          {def.champs.map((c) => (
            <label key={c.cle} className="block">
              <span className="text-sm text-slate-700">{c.libelle}</span>
              {c.type === "choix" ? (
                <select
                  value={champs[c.cle] ?? ""}
                  onChange={(e) => setChamps({ ...champs, [c.cle]: e.target.value })}
                  className={`${CHAMP} w-full mt-1`}
                >
                  <option value="">—</option>
                  {c.choix?.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  inputMode={c.type === "texte" ? undefined : "decimal"}
                  value={champs[c.cle] ?? ""}
                  onChange={(e) => setChamps({ ...champs, [c.cle]: e.target.value })}
                  className={`${CHAMP} w-full mt-1`}
                />
              )}
            </label>
          ))}
          <label className="block">
            <span className="text-sm text-slate-700">Adresse de la source</span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={def.exempleUrl}
              className={`${CHAMP} w-full mt-1`}
            />
          </label>
          {echec && <p className="text-sm text-rose-700 leading-relaxed">{echec}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={enregistrer}
              disabled={envoi}
              className={`${BOUTON_PRINCIPAL} flex-1`}
            >
              Enregistrer
            </button>
            <button type="button" onClick={() => setOuvert(false)} className={BOUTON_DOUX}>
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOuvert(true)} className={BOUTON_DOUX}>
          Ajouter un relevé
        </button>
      )}
    </div>
  );
}
