import { useState } from "react";
import MarketPage from "./MarketPage";
import HorizonPage from "./HorizonPage";
import SousOnglets, { panneau } from "./SousOnglets";

/**
 * Le marche : ce qu'il vaut aujourd'hui, et ce que la duree y a change.
 *
 * C'etaient deux destinations. Les rapprocher n'est pas qu'un gain de place :
 * le prix du jour et le rendement d'une detention longue sont les deux moities
 * d'une meme lecon, et les separer laissait le prix du jour seul a l'ecran —
 * c'est-a-dire dans la position exacte ou il invite a reagir.
 *
 * « Sur la durée » ouvre en second parce que la recherche d'un cours est le
 * geste courant, mais l'onglet reste au meme rang : ce n'est pas une annexe.
 */

const BASE = "marche";

export default function MarchePage() {
  const [vue, setVue] = useState("aujourdhui");

  return (
    <div className="space-y-5">
      <SousOnglets
        base={BASE}
        etiquette="Vue du marché"
        courante={vue}
        onChange={setVue}
        vues={[
          { cle: "aujourdhui", label: "Aujourd'hui" },
          { cle: "duree", label: "Sur la durée" },
        ]}
      />

      {vue === "aujourdhui" ? (
        <div {...panneau(BASE, "aujourdhui")} className="focus:outline-none">
          <MarketPage />
        </div>
      ) : (
        <div {...panneau(BASE, "duree")} className="focus:outline-none">
          <HorizonPage />
        </div>
      )}
    </div>
  );
}
