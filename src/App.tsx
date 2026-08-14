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
import CoursPage from "./components/CoursPage";
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
    // `preventScroll` est indispensable : donner le focus a un element le fait
    // defiler dans la vue par defaut, ce qui annulait la remontee juste
    // au-dessus et glissait le titre de page sous l'en-tete collant. Le focus
    // sert ici a annoncer la destination, pas a deplacer la page.
    zoneContenu.current?.focus({ preventScroll: true });
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
    <div className="min-h-screen bg-slate-50">
      {/* Halo tres doux en haut de page : donne une profondeur a l'ecran sans
          teinter le contenu ni gener la lecture. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-gradient-to-b from-indigo-100/50 to-transparent"
      />
      {/* Premier arret de la tabulation : sauter la navigation pour aller au
          contenu, faute de quoi chaque changement de page impose de traverser
          toute la barre au clavier. */}
      <a
        href="#contenu"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-xl focus:bg-indigo-700 focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-white"
      >
        Aller au contenu
      </a>

      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-900/[0.06] sticky top-0 z-20">
        <div className="max-w-3xl mx-auto px-5 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600/80 leading-none">
              Veille investissement
            </p>
            <h1 className="text-xl font-semibold text-slate-900 leading-tight truncate mt-0.5">
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

      {/* `key` sur la zone de contenu : chaque changement d'onglet remonte un
          nouveau noeud, ce qui rejoue l'animation d'entree. Sans cela la
          transition ne se produirait qu'au premier rendu. */}
      <main
        key={tab}
        id="contenu"
        ref={zoneContenu}
        tabIndex={-1}
        aria-label={courant?.label}
        className="relative max-w-3xl mx-auto px-5 py-6 focus:outline-none motion-safe:animate-entreePage"
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
        {tab === "cours" && <CoursPage />}
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
