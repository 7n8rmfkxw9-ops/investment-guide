import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Manager, Market, WatchedIssuer } from "../lib/types";
import { MARKET_LABELS } from "../lib/types";
import { DEFAULT_TOB_PCT } from "../lib/fees";
import { BOUTON_PRINCIPAL, CARTE, CHAMP } from "../lib/theme";
import { COURTIERS } from "../lib/courtiers";

export default function SettingsPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [issuers, setIssuers] = useState<WatchedIssuer[]>([]);
  const [fee, setFee] = useState("1.00");
  const [size, setSize] = useState("150");
  const [tob, setTob] = useState(String(DEFAULT_TOB_PCT));
  const [brokerName, setBrokerName] = useState<string | null>(null);
  const [courtierChoisi, setCourtierChoisi] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const [mName, setMName] = useState("");
  const [mCik, setMCik] = useState("");
  const [iName, setIName] = useState("");
  const [iTicker, setITicker] = useState("");
  const [iCik, setICik] = useState("");
  const [iMarket, setIMarket] = useState<Market>("BE");

  async function load() {
    const [{ data: m }, { data: i }, { data: s }] = await Promise.all([
      supabase.from("managers").select("*").order("name"),
      supabase.from("watched_issuers").select("*").order("name"),
      supabase.from("settings").select("*").maybeSingle(),
    ]);
    setManagers((m as Manager[]) ?? []);
    setIssuers((i as WatchedIssuer[]) ?? []);
    if (s) {
      setFee(String(s.broker_fixed_fee_eur));
      setSize(String(s.position_size_eur));
      if (s.tob_pct != null) setTob(String(s.tob_pct));
      setBrokerName(s.broker_name ?? null);
    }
  }

  /** Preremplit le frais fixe avec le tarif du courtier choisi, sans l'enregistrer
   * encore : l'utilisateur garde la main via le bouton « Enregistrer » plus bas. */
  function appliquerTarifCourtier(nom: string) {
    setCourtierChoisi(nom);
    const c = COURTIERS.find((x) => x.nom === nom);
    if (!c) return;
    setFee(String(c.fraisPetitOrdreEur));
    setBrokerName(c.nom);
  }

  useEffect(() => {
    void load();
  }, []);

  async function userId(): Promise<string> {
    const { data } = await supabase.auth.getUser();
    return data.user!.id;
  }

  async function addManager(e: React.FormEvent) {
    e.preventDefault();
    const cik = mCik.replace(/\D/g, "");
    if (!cik || !mName.trim()) return;
    const { error } = await supabase
      .from("managers")
      .insert({ user_id: await userId(), name: mName.trim(), cik });
    setMsg(error ? error.message : null);
    setMName("");
    setMCik("");
    await load();
  }

  async function addIssuer(e: React.FormEvent) {
    e.preventDefault();
    const cik = iCik.replace(/\D/g, "");
    // Une societe europeenne est identifiee par son nom exact au registre du
    // regulateur national ; une societe americaine par son CIK.
    if (!iName.trim()) return;
    if (iMarket === "US" && !cik) return;
    const { error } = await supabase.from("watched_issuers").insert({
      user_id: await userId(),
      market: iMarket,
      name: iName.trim(),
      ticker: iTicker.trim().toUpperCase(),
      cik: iMarket === "US" ? cik : null,
    });
    setMsg(error ? error.message : null);
    setIName("");
    setITicker("");
    setICik("");
    await load();
  }

  async function removeManager(id: string) {
    await supabase.from("managers").delete().eq("id", id);
    await load();
  }

  async function removeIssuer(id: string) {
    await supabase.from("watched_issuers").delete().eq("id", id);
    await load();
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("settings").upsert({
      user_id: await userId(),
      broker_fixed_fee_eur: Number(fee.replace(",", ".")),
      position_size_eur: Number(size.replace(",", ".")),
      tob_pct: Number(tob.replace(",", ".")),
      broker_name: brokerName,
      updated_at: new Date().toISOString(),
    });
    setMsg(error ? error.message : "Paramètres enregistrés.");
  }

  return (
    <div className="space-y-8">
      {msg && <p className="text-sm text-slate-600">{msg}</p>}

      <section className={`${CARTE} p-5 space-y-3`}>
        <h2 className="font-semibold">Gestionnaires suivis (13F)</h2>
        <p className="text-xs text-slate-500">
          Déposants institutionnels dont les 13F trimestriels seront analysés. Le CIK se
          trouve sur{" "}
          <a
            className="text-indigo-700 underline decoration-indigo-300 hover:decoration-indigo-600"
            href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany"
            target="_blank"
            rel="noreferrer"
          >
            la recherche EDGAR
          </a>{" "}
          (ex. Berkshire Hathaway : 1067983).
        </p>
        <ul className="text-sm divide-y">
          {managers.map((m) => (
            <li key={m.id} className="py-2 flex justify-between items-center">
              <span>
                {m.name} <span className="text-slate-400">CIK {m.cik}</span>
              </span>
              <button
                className="text-xs text-red-600 hover:underline"
                onClick={() => removeManager(m.id)}
              >
                Retirer
              </button>
            </li>
          ))}
          {managers.length === 0 && (
            <li className="py-2 text-slate-400">Aucun gestionnaire suivi.</li>
          )}
        </ul>
        <form onSubmit={addManager} className="flex flex-wrap gap-2">
          <input
            className={`${CHAMP} flex-1 min-w-40`}
            placeholder="Nom (ex. Berkshire Hathaway)"
            value={mName}
            onChange={(e) => setMName(e.target.value)}
          />
          <input
            className={`${CHAMP} w-36`}
            placeholder="CIK"
            value={mCik}
            onChange={(e) => setMCik(e.target.value)}
          />
          <button className={`${BOUTON_PRINCIPAL}`}>
            Ajouter
          </button>
        </form>
      </section>

      <section className={`${CARTE} p-5 space-y-3`}>
        <h2 className="font-semibold">Sociétés suivies (opérations de dirigeants)</h2>
        <p className="text-xs text-slate-500">
          Les achats et ventes déclarés par les dirigeants de ces sociétés seront
          détectés. Pour la <strong>Belgique</strong>, saisissez le nom exact tel
          qu'il figure au{" "}
          <a
            className="text-indigo-700 underline decoration-indigo-300 hover:decoration-indigo-600"
            href="https://www.fsma.be/fr/transaction-search"
            target="_blank"
            rel="noreferrer"
          >
            registre de la FSMA
          </a>{" "}
          (ex. AB INBEV, UCB, SOLVAY) — sans CIK. Pour la{" "}
          <strong>Suède</strong>, le nom exact du registre{" "}
          <a
            className="text-indigo-700 underline decoration-indigo-300 hover:decoration-indigo-600"
            href="https://marknadssok.fi.se/publiceringsklient"
            target="_blank"
            rel="noreferrer"
          >
            Finansinspektionen
          </a>{" "}
          (ex. AB Volvo, Investor AB, Sandvik Aktiebolag) — sans CIK non plus.
          Pour les <strong>États-Unis</strong>, il faut le CIK issu d'EDGAR.
        </p>
        <ul className="text-sm divide-y">
          {issuers.map((i) => (
            <li key={i.id} className="py-2 flex justify-between items-center">
              <span>
                {i.name}
                {i.ticker && ` (${i.ticker})`}{" "}
                <span className="text-slate-400">
                  {i.market === "US"
                    ? `${MARKET_LABELS.US} · CIK ${i.cik}`
                    : MARKET_LABELS[i.market]}
                </span>
              </span>
              <button
                className="text-xs text-red-600 hover:underline"
                onClick={() => removeIssuer(i.id)}
              >
                Retirer
              </button>
            </li>
          ))}
          {issuers.length === 0 && (
            <li className="py-2 text-slate-400">Aucune société suivie.</li>
          )}
        </ul>
        <form onSubmit={addIssuer} className="flex flex-wrap gap-2">
          <select
            className={`${CHAMP} bg-white`}
            value={iMarket}
            onChange={(e) => setIMarket(e.target.value as Market)}
          >
            <option value="BE">Belgique</option>
            <option value="SE">Suède</option>
            <option value="US">États-Unis</option>
          </select>
          <input
            className={`${CHAMP} flex-1 min-w-40`}
            placeholder={
              iMarket === "BE"
                ? "Nom FSMA (ex. UCB)"
                : iMarket === "SE"
                  ? "Nom FI (ex. AB Volvo)"
                  : "Nom (ex. Apple Inc.)"
            }
            value={iName}
            onChange={(e) => setIName(e.target.value)}
          />
          <input
            className={`${CHAMP} w-24`}
            placeholder="Ticker"
            value={iTicker}
            onChange={(e) => setITicker(e.target.value)}
          />
          {iMarket === "US" && (
            <input
              className={`${CHAMP} w-36`}
              placeholder="CIK"
              value={iCik}
              onChange={(e) => setICik(e.target.value)}
            />
          )}
          <button className={`${BOUTON_PRINCIPAL}`}>
            Ajouter
          </button>
        </form>
      </section>

      <section className={`${CARTE} p-5 space-y-3`}>
        <h2 className="font-semibold">Frais et taille de position</h2>
        <p className="text-xs text-slate-500">
          Utilisés pour le calcul affiché sur chaque fiche. En Belgique, la taxe
          sur les opérations de bourse (TOB) s'applique à l'achat comme à la
          vente : elle est donc comptée deux fois dans le gain minimum. Au-delà
          de 3 % de coût à l'achat, un avertissement est affiché.
        </p>

        <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-4 space-y-2.5">
          <label className="text-sm block">
            <span className="block text-xs text-slate-500 mb-1">
              Préremplir avec le tarif d'un courtier
            </span>
            <select
              className={`${CHAMP} bg-white w-full sm:w-72`}
              value={courtierChoisi}
              onChange={(e) => appliquerTarifCourtier(e.target.value)}
            >
              <option value="">— choisir un courtier —</option>
              {COURTIERS.map((c) => (
                <option key={c.nom} value={c.nom}>
                  {c.nom} — {c.fraisPetitOrdreEur.toFixed(2).replace(".", ",")} €
                </option>
              ))}
            </select>
          </label>
          {courtierChoisi &&
            (() => {
              const c = COURTIERS.find((x) => x.nom === courtierChoisi);
              if (!c) return null;
              return (
                <p className="text-xs text-slate-500 leading-relaxed">
                  {c.fraisNote}{" "}
                  {c.fraisSource === "estimation" ? (
                    <>
                      Chiffre <strong>non confirmé sur une source officielle</strong>{" "}
                      accessible au moment de l'écrire — vérifiez-le vous-même.
                    </>
                  ) : (
                    <>Tarif lu sur la grille officielle du courtier.</>
                  )}{" "}
                  Constaté en {c.fraisConstateLe}, les tarifs changent : reconfirmez
                  sur{" "}
                  <a
                    href={c.fraisLien}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-700 underline decoration-indigo-300 hover:decoration-indigo-600"
                  >
                    leur page de tarifs
                  </a>
                  .
                </p>
              );
            })()}
          {!courtierChoisi && brokerName && (
            <p className="text-xs text-slate-500">
              Tarif actuellement basé sur <strong>{brokerName}</strong>.
            </p>
          )}
        </div>

        <form onSubmit={saveSettings} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block text-xs text-slate-500">Frais fixes courtier (€)</span>
            <input
              className={`${CHAMP} w-32`}
              value={fee}
              onChange={(e) => {
                setFee(e.target.value);
                // Une saisie manuelle rompt le lien avec le courtier choisi :
                // le badge "tarif basé sur X" mentirait sinon.
                setBrokerName(null);
                setCourtierChoisi("");
              }}
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-slate-500">
              Taxe de bourse par transaction (%)
            </span>
            <input
              className={`${CHAMP} w-32`}
              value={tob}
              onChange={(e) => setTob(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-slate-500">
              Montant envisagé par position (€)
            </span>
            <input
              className={`${CHAMP} w-32`}
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </label>
          <button className={`${BOUTON_PRINCIPAL}`}>
            Enregistrer
          </button>
        </form>
      </section>
    </div>
  );
}
