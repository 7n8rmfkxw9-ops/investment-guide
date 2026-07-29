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
import SimulatorPage from "./components/SimulatorPage";
import type { AmorceSimulation } from "./components/SimulatorPage";

type Tab =
  | "pistes"
  | "simuler"
  | "comprendre"
  | "investir"
  | "positions"
  | "historique"
  | "configuration"
  | "compte";

/**
 * Chaque onglet a son emoji : sur une barre defilante d'iPhone, un reperage
 * visuel vaut mieux qu'un mot tronque.
 */
const TABS: { id: Tab; label: string; icone: string }[] = [
  { id: "pistes", label: "Pistes", icone: "📡" },
  { id: "simuler", label: "S'entraîner", icone: "🎓" },
  { id: "comprendre", label: "Comprendre", icone: "📖" },
  { id: "investir", label: "Investir", icone: "🏦" },
  { id: "positions", label: "Positions", icone: "📋" },
  { id: "historique", label: "Historique", icone: "🕓" },
  { id: "configuration", label: "Réglages", icone: "⚙️" },
  { id: "compte", label: "Compte", icone: "👤" },
];

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("pistes");
  // Une piste peut lancer une simulation : on transporte le nom de la societe
  // jusqu'a l'onglet d'entrainement, sans rien valider a la place de l'utilisateur.
  const [amorce, setAmorce] = useState<AmorceSimulation | null>(null);

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

  function simulerDepuisPiste(a: AmorceSimulation) {
    setAmorce(a);
    setTab("simuler");
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <p className="text-sm text-slate-400">Chargement…</p>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-slate-50 to-slate-50">
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/70 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 pt-3.5 pb-1 flex items-baseline justify-between gap-4">
          <h1 className="text-base font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
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
        <nav className="max-w-3xl mx-auto px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 text-sm whitespace-nowrap rounded-full transition ${
                tab === t.id
                  ? "bg-indigo-600 text-white font-medium shadow-sm shadow-indigo-200"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              <span className="mr-1" aria-hidden>
                {t.icone}
              </span>
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-16">
        {tab === "pistes" && <Dashboard onSimuler={simulerDepuisPiste} />}
        {tab === "simuler" && (
          <SimulatorPage amorce={amorce} onAmorceConsommee={() => setAmorce(null)} />
        )}
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
