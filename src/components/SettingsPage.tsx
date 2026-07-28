import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Manager, WatchedIssuer } from "../lib/types";

export default function SettingsPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [issuers, setIssuers] = useState<WatchedIssuer[]>([]);
  const [fee, setFee] = useState("1.00");
  const [size, setSize] = useState("150");
  const [msg, setMsg] = useState<string | null>(null);

  const [mName, setMName] = useState("");
  const [mCik, setMCik] = useState("");
  const [iName, setIName] = useState("");
  const [iTicker, setITicker] = useState("");
  const [iCik, setICik] = useState("");

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
    }
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
    if (!cik || !iName.trim() || !iTicker.trim()) return;
    const { error } = await supabase.from("watched_issuers").insert({
      user_id: await userId(),
      name: iName.trim(),
      ticker: iTicker.trim().toUpperCase(),
      cik,
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
      updated_at: new Date().toISOString(),
    });
    setMsg(error ? error.message : "Paramètres enregistrés.");
  }

  return (
    <div className="space-y-8">
      {msg && <p className="text-sm text-slate-600">{msg}</p>}

      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <h2 className="font-semibold">Gestionnaires suivis (13F)</h2>
        <p className="text-xs text-slate-500">
          Déposants institutionnels dont les 13F trimestriels seront analysés. Le CIK se
          trouve sur{" "}
          <a
            className="text-sky-700 underline"
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
            className="border rounded px-2 py-1 text-sm flex-1 min-w-40"
            placeholder="Nom (ex. Berkshire Hathaway)"
            value={mName}
            onChange={(e) => setMName(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1 text-sm w-36"
            placeholder="CIK"
            value={mCik}
            onChange={(e) => setMCik(e.target.value)}
          />
          <button className="text-sm border rounded px-3 py-1 bg-slate-800 text-white">
            Ajouter
          </button>
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <h2 className="font-semibold">Sociétés suivies (Form 4 — initiés)</h2>
        <p className="text-xs text-slate-500">
          Les achats/ventes de dirigeants et administrateurs de ces sociétés seront
          détectés (publiés sous 2 jours ouvrables — donnée plus fraîche que le 13F).
        </p>
        <ul className="text-sm divide-y">
          {issuers.map((i) => (
            <li key={i.id} className="py-2 flex justify-between items-center">
              <span>
                {i.name} ({i.ticker}){" "}
                <span className="text-slate-400">CIK {i.cik}</span>
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
          <input
            className="border rounded px-2 py-1 text-sm flex-1 min-w-40"
            placeholder="Nom (ex. Apple Inc.)"
            value={iName}
            onChange={(e) => setIName(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1 text-sm w-24"
            placeholder="Ticker"
            value={iTicker}
            onChange={(e) => setITicker(e.target.value)}
          />
          <input
            className="border rounded px-2 py-1 text-sm w-36"
            placeholder="CIK"
            value={iCik}
            onChange={(e) => setICik(e.target.value)}
          />
          <button className="text-sm border rounded px-3 py-1 bg-slate-800 text-white">
            Ajouter
          </button>
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <h2 className="font-semibold">Frais et taille de position</h2>
        <p className="text-xs text-slate-500">
          Utilisés pour le calcul affiché sur chaque fiche : (frais fixes / montant
          investi) × 100. Au-delà de 3 %, un avertissement est affiché.
        </p>
        <form onSubmit={saveSettings} className="flex flex-wrap items-end gap-3">
          <label className="text-sm">
            <span className="block text-xs text-slate-500">Frais fixes courtier (€)</span>
            <input
              className="border rounded px-2 py-1 text-sm w-32"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-slate-500">
              Montant envisagé par position (€)
            </span>
            <input
              className="border rounded px-2 py-1 text-sm w-32"
              value={size}
              onChange={(e) => setSize(e.target.value)}
            />
          </label>
          <button className="text-sm border rounded px-3 py-1 bg-slate-800 text-white">
            Enregistrer
          </button>
        </form>
      </section>
    </div>
  );
}
