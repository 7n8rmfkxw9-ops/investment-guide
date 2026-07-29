import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import SettingsPage from "./components/SettingsPage";
import AccountPage from "./components/AccountPage";
import PositionsPage from "./components/PositionsPage";
import LearnPage from "./components/LearnPage";
import InvestPage from "./components/InvestPage";

type Tab =
  | "pistes"
  | "comprendre"
  | "investir"
  | "positions"
  | "historique"
  | "configuration"
  | "compte";

const TABS: { id: Tab; label: string }[] = [
  { id: "pistes", label: "Pistes" },
  { id: "comprendre", label: "Comprendre" },
  { id: "investir", label: "Investir" },
  { id: "positions", label: "Positions" },
  { id: "historique", label: "Historique" },
  { id: "configuration", label: "Réglages" },
  { id: "compte", label: "Compte" },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pistes");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="p-8 text-slate-400 text-sm">Chargement…</div>;
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 pt-3.5 pb-1 flex items-baseline justify-between gap-4">
          <h1 className="text-base font-semibold text-slate-800">
            Veille investissement
          </h1>
          <button
            className="text-xs text-slate-400 hover:text-slate-700 shrink-0"
            onClick={() => supabase.auth.signOut()}
          >
            Déconnexion
          </button>
        </div>
        {/* Barre d'onglets defilante : tient sur un ecran de telephone */}
        <nav className="max-w-3xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-2.5 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition ${
                tab === t.id
                  ? "border-slate-800 text-slate-800 font-medium"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-16">
        {tab === "pistes" && <Dashboard />}
        {tab === "comprendre" && <LearnPage />}
        {tab === "investir" && <InvestPage />}
        {tab === "positions" && <PositionsPage />}
        {tab === "historique" && <History />}
        {tab === "configuration" && <SettingsPage />}
        {tab === "compte" && <AccountPage />}
      </main>
    </div>
  );
}
