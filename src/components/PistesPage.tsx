import { useState } from "react";
import Dashboard from "./Dashboard";
import History from "./History";
import SousOnglets, { panneau } from "./SousOnglets";
import type { AmorceSimulation } from "./SimulatorPage";

/**
 * Les pistes, en cours et passees.
 *
 * C'etaient deux destinations : « Pistes » et « Historique ». Le meme objet,
 * a deux endroits — une piste passee n'est qu'une piste dont on connait la
 * suite. Les separer obligeait a se demander, avant chaque consultation,
 * laquelle des deux ouvrir ; et surtout, le bilan honnete de ce que les pistes
 * sont devenues vivait dans l'onglet que personne n'ouvre.
 *
 * Reunies, la suite d'une piste est a un geste de la piste elle-meme. C'est
 * exactement ce qu'on veut d'un outil qui promet de ne rien enjoliver.
 */

const BASE = "pistes";

export default function PistesPage({ onSimuler }: { onSimuler: (a: AmorceSimulation) => void }) {
  const [vue, setVue] = useState("en-cours");

  return (
    <div className="space-y-5">
      <SousOnglets
        base={BASE}
        etiquette="Pistes à consulter"
        courante={vue}
        onChange={setVue}
        vues={[
          { cle: "en-cours", label: "Cette semaine" },
          { cle: "passees", label: "Ce qu'elles sont devenues" },
        ]}
      />

      {vue === "en-cours" ? (
        <div {...panneau(BASE, "en-cours")} className="focus:outline-none">
          <Dashboard onSimuler={onSimuler} />
        </div>
      ) : (
        <div {...panneau(BASE, "passees")} className="focus:outline-none">
          <History />
        </div>
      )}
    </div>
  );
}
