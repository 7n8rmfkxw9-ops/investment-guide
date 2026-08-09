import { useEffect, useRef, useState } from "react";
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
import MarketPage from "./components/MarketPage";
import HorizonPage from "./components/HorizonPage";
import JournalPage from "./components/JournalPage";
import NavigationBasse from "./components/NavigationBasse";
import SyncStatusBanner from "./components/SyncStatusBanner";
import { definitionDe } from "./lib/onglets";
import type { Onglet } from "./lib/onglets";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Onglet>("pistes");
  const [plusOuvert, setPlusOuvert] = useState(false);
  // Une piste peut lancer une simulation : on transporte le nom de la societe
  // jusqu'a l'onglet d'entrainement, sans rien valider a la place de l'utilisateur.
  const [amorce, setAmorce] = useState<AmorceSimulation | null>(null);
  const zoneContenu = useRef<HTMLElement>(null);
  const premierRendu = useRef(true);

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

  // Changer d'onglet remplace tout l'ecran sans changer d'URL : rien
  // n'avertirait un lecteur d'ecran ni ne ramenerait en haut de page. On
  // remonte donc, et on annonce la destination en deplacant le focus.
  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
    zoneContenu.current?.focus();
  }, [tab]);

  function simulerDepuisPiste(a: AmorceSimulation) {
    setAmorce(a);
    setTab("simuler");
  }

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <p className="text-sm text-slate-500" role="status">
          Chargement…
        </p>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  const courant = definitionDe(tab);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 via-slate-50 to-slate-50">
      {/* Premier arret de la tabulation : sauter la navigation pour aller au
          contenu, faute de quoi chaque changement de page impose de traverser
          toute la barre au clavier. */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-indigo-700 focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
      >
        Aller au contenu
      </a>

      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/70 sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 leading-none">
              Veille investissement
            </p>
            <h1 className="text-base font-semibold text-slate-800 leading-tight truncate">
              <span className="mr-1" aria-hidden>
                {courant?.icone}
              </span>
              {courant?.label}
            </h1>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {/* Etat des synchronisations : information de maintenance, donc
                repliee ici plutot que posee au-dessus du contenu. */}
            <SyncStatusBanner />
            <button
              className="min-h-[44px] px-2.5 text-xs text-slate-500 hover:text-slate-800 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              onClick={() => supabase.auth.signOut()}
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main
        id="contenu"
        ref={zoneContenu}
        tabIndex={-1}
        aria-label={courant?.label}
        className="max-w-3xl mx-auto px-4 py-5 focus:outline-none"
        // Hauteur de la barre du bas plus la zone sûre de l'iPhone : sans
        // cela, la derniere carte de chaque page passe sous la navigation.
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
      >
        {tab === "pistes" && <Dashboard onSimuler={simulerDepuisPiste} />}
        {tab === "marche" && <MarketPage />}
        {tab === "horizon" && <HorizonPage />}
        {tab === "simuler" && (
          <SimulatorPage amorce={amorce} onAmorceConsommee={() => setAmorce(null)} />
        )}
        {tab === "journal" && <JournalPage />}
        {tab === "comprendre" && <LearnPage />}
        {tab === "investir" && <InvestPage />}
        {tab === "positions" && <PositionsPage />}
        {tab === "historique" && <History />}
        {tab === "configuration" && <SettingsPage />}
        {tab === "compte" && <AccountPage />}
      </main>

      <NavigationBasse
        courant={tab}
        onChoisir={setTab}
        plusOuvert={plusOuvert}
        onPlus={setPlusOuvert}
      />
    </div>
  );
}
