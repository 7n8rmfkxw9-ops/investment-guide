import { useEffect, useState, type FormEvent } from "react";
import {
  addIssuer,
  addManager,
  fetchIssuers,
  fetchManagers,
  removeIssuer,
  removeManager,
} from "../lib/data";
import type { Manager, WatchedIssuer } from "../lib/types";

function cleanCik(raw: string): string | null {
  const c = raw.trim().replace(/\D/g, "").padStart(10, "0");
  return c.length === 10 && /[1-9]/.test(c) ? c : null;
}

export default function Managers() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [issuers, setIssuers] = useState<WatchedIssuer[]>([]);
  const [mName, setMName] = useState("");
  const [mCik, setMCik] = useState("");
  const [iName, setIName] = useState("");
  const [iTicker, setITicker] = useState("");
  const [iCik, setICik] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchManagers(), fetchIssuers()])
      .then(([m, i]) => {
        setManagers(m);
        setIssuers(i);
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  async function onAddManager(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cik = cleanCik(mCik);
    if (!mName.trim() || !cik) {
      setError("Renseigne un nom et un CIK EDGAR valide (jusqu'à 10 chiffres).");
      return;
    }
    try {
      const m = await addManager(cik, mName.trim());
      setManagers((prev) => [...prev, m].sort((a, b) => a.name.localeCompare(b.name)));
      setMName("");
      setMCik("");
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    }
  }

  async function onAddIssuer(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const cik = cleanCik(iCik);
    if (!iName.trim() || !iTicker.trim() || !cik) {
      setError("Renseigne un nom, un ticker et un CIK EDGAR valide.");
      return;
    }
    try {
      const iss = await addIssuer(cik, iTicker.trim().toUpperCase(), iName.trim());
      setIssuers((prev) => [...prev, iss].sort((a, b) => a.ticker.localeCompare(b.ticker)));
      setIName("");
      setITicker("");
      setICik("");
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    }
  }

  const inputCls = "rounded-md border border-slate-300 px-2 py-1";

  return (
    <div className="max-w-2xl space-y-10">
      {error && <p className="text-sm text-red-700">{error}</p>}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Gestionnaires suivis (13F)</h2>
        <p className="text-sm text-slate-600">
          Leurs dépôts 13F trimestriels sont récupérés chaque semaine. Le CIK est l'identifiant
          EDGAR du fonds — trouvable via la{" "}
          <a
            href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany"
            target="_blank"
            rel="noreferrer"
            className="text-blue-700 underline"
          >
            recherche d'entités SEC
          </a>
          . Exemple : Berkshire Hathaway = 0001067983.
        </p>
        <form onSubmit={onAddManager} className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">Nom</span>
            <input value={mName} onChange={(e) => setMName(e.target.value)} placeholder="Berkshire Hathaway" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">CIK</span>
            <input value={mCik} onChange={(e) => setMCik(e.target.value)} placeholder="0001067983" className={`${inputCls} font-mono`} />
          </label>
          <button type="submit" className="rounded-md bg-slate-800 px-3 py-1.5 text-white hover:bg-slate-700">
            Ajouter
          </button>
        </form>
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {managers.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>
                {m.name} <span className="ml-2 font-mono text-slate-400">{m.cik}</span>
              </span>
              <button
                onClick={() => removeManager(m.id).then(() => setManagers((p) => p.filter((x) => x.id !== m.id)))}
                className="text-slate-400 hover:text-red-600"
              >
                Retirer
              </button>
            </li>
          ))}
          {managers.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">Aucun gestionnaire suivi.</li>
          )}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Sociétés suivies (Form 4 — initiés)</h2>
        <p className="text-sm text-slate-600">
          Les achats/ventes de dirigeants et administrateurs (Form 4, publiés sous 2 jours
          ouvrables) sont surveillés pour ces sociétés. Le CIK est ici celui de la société
          cotée, pas du fonds.
        </p>
        <form onSubmit={onAddIssuer} className="flex flex-wrap items-end gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">Nom</span>
            <input value={iName} onChange={(e) => setIName(e.target.value)} placeholder="Occidental Petroleum" className={inputCls} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">Ticker</span>
            <input value={iTicker} onChange={(e) => setITicker(e.target.value)} placeholder="OXY" className={`${inputCls} w-24 font-mono`} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-slate-500">CIK</span>
            <input value={iCik} onChange={(e) => setICik(e.target.value)} placeholder="0000797468" className={`${inputCls} font-mono`} />
          </label>
          <button type="submit" className="rounded-md bg-slate-800 px-3 py-1.5 text-white hover:bg-slate-700">
            Ajouter
          </button>
        </form>
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {issuers.map((iss) => (
            <li key={iss.id} className="flex items-center justify-between px-4 py-2 text-sm">
              <span>
                <span className="font-mono">{iss.ticker}</span> — {iss.name}{" "}
                <span className="ml-2 font-mono text-slate-400">{iss.cik}</span>
              </span>
              <button
                onClick={() => removeIssuer(iss.id).then(() => setIssuers((p) => p.filter((x) => x.id !== iss.id)))}
                className="text-slate-400 hover:text-red-600"
              >
                Retirer
              </button>
            </li>
          ))}
          {issuers.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500">Aucune société suivie.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
