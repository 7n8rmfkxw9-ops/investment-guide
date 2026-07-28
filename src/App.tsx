import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Managers from "./pages/Managers";
import History from "./pages/History";

type Tab = "dashboard" | "managers" | "history";

const TABS: { id: Tab; label: string }[] = [
  { id: "dashboard", label: "Pistes récentes" },
  { id: "managers", label: "Gestionnaires suivis" },
  { id: "history", label: "Historique" },
];

/** Réglages de frais persistés localement (outil mono-utilisateur). */
function usePersistedNumber(key: string, initial: number) {
  const [value, setValue] = useState<number>(() => {
    const raw = localStorage.getItem(key);
    const parsed = raw === null ? NaN : Number(raw);
    return Number.isFinite(parsed) ? parsed : initial;
  });
  useEffect(() => {
    localStorage.setItem(key, String(value));
  }, [key, value]);
  return [value, setValue] as const;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [brokerFee, setBrokerFee] = usePersistedNumber("brokerFee", 5);
  const [amount, setAmount] = usePersistedNumber("amount", 150);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="text-xl font-semibold">Veille investissement</h1>
            <p className="text-sm text-slate-500">
              Outil personnel d'information — données publiques SEC. Aucune exécution d'ordre,
              aucune recommandation.
            </p>
          </div>
          <div className="flex items-end gap-3 text-sm">
            <label className="flex flex-col gap-1">
              <span className="text-slate-500">Frais fixes broker (€)</span>
              <input
                type="number"
                min="0"
                step="0.5"
                value={brokerFee}
                onChange={(e) => setBrokerFee(Number(e.target.value))}
                className="w-24 rounded-md border border-slate-300 px-2 py-1"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-slate-500">Ticket envisagé (€)</span>
              <input
                type="number"
                min="1"
                step="10"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-24 rounded-md border border-slate-300 px-2 py-1"
              />
            </label>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-t-md px-3 py-2 text-sm ${
                tab === t.id
                  ? "border border-b-0 border-slate-200 bg-slate-100 font-medium"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {tab === "dashboard" && <Dashboard brokerFee={brokerFee} amount={amount} />}
        {tab === "managers" && <Managers />}
        {tab === "history" && <History />}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-xs text-slate-400">
        Sources : SEC EDGAR (13F-HR, Form 4). Cet outil présente des informations, jamais des
        recommandations ; toute décision d'investissement t'appartient.
      </footer>
    </div>
  );
}
