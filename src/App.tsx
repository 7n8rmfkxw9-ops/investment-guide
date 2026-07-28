import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import AuthPage from "./components/AuthPage";
import Dashboard from "./components/Dashboard";
import History from "./components/History";
import SettingsPage from "./components/SettingsPage";

type Tab = "pistes" | "historique" | "configuration";

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
    return <div className="p-8 text-slate-500">Chargement…</div>;
  }

  if (!session) {
    return <AuthPage />;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "pistes", label: "Pistes récentes" },
    { id: "historique", label: "Historique" },
    { id: "configuration", label: "Configuration" },
  ];

  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Veille investissement — SEC EDGAR</h1>
            <p className="text-xs text-slate-500">
              Outil personnel d'information. Aucune exécution d'ordre. Vous décidez seul,
              chez votre propre courtier.
            </p>
          </div>
          <button
            className="text-sm text-slate-500 hover:text-slate-800"
            onClick={() => supabase.auth.signOut()}
          >
            Se déconnecter
          </button>
        </div>
        <nav className="max-w-4xl mx-auto px-4 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-sm rounded-t-md border-b-2 ${
                tab === t.id
                  ? "border-slate-800 font-medium"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">
        {tab === "pistes" && <Dashboard />}
        {tab === "historique" && <History />}
        {tab === "configuration" && <SettingsPage />}
      </main>
    </div>
  );
}
