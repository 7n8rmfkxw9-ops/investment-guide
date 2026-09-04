import { useState } from "react";
import PositionsPage from "./PositionsPage";
import SimulatorPage, { type AmorceSimulation } from "./SimulatorPage";
import SousOnglets, { panneau } from "./SousOnglets";

/**
 * S'entrainer : passer un achat fictif, et suivre ceux qu'on a passes.
 *
 * C'etaient deux destinations, « S'entrainer » et « Positions ». La seconde ne
 * montrait rien d'autre que le resultat de la premiere : simuler un achat puis
 * devoir changer d'onglet pour le retrouver decoupe une seule activite en deux.
 *
 * L'ouverture se fait sur le simulateur, et non sur les positions : c'est le
 * geste qu'on vient faire. Les positions sont ce qu'on consulte ensuite.
 */

const BASE = "entrainement";

export default function EntrainementPage({
  amorce,
  onAmorceConsommee,
}: {
  amorce: AmorceSimulation | null;
  onAmorceConsommee: () => void;
}) {
  const [vue, setVue] = useState("simuler");

  return (
    <div className="space-y-5">
      <SousOnglets
        base={BASE}
        etiquette="Entraînement"
        courante={vue}
        onChange={setVue}
        vues={[
          { cle: "simuler", label: "Simuler un achat" },
          { cle: "positions", label: "Mes positions" },
        ]}
      />

      {vue === "simuler" ? (
        <div {...panneau(BASE, "simuler")} className="focus:outline-none">
          <SimulatorPage amorce={amorce} onAmorceConsommee={onAmorceConsommee} />
        </div>
      ) : (
        <div {...panneau(BASE, "positions")} className="focus:outline-none">
          <PositionsPage />
        </div>
      )}
    </div>
  );
}
