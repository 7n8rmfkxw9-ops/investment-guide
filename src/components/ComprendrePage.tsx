import { useState } from "react";
import LearnPage from "./LearnPage";
import InvestPage from "./InvestPage";
import SousOnglets, { panneau } from "./SousOnglets";

/**
 * Comprendre : l'outil d'un cote, l'investissement en Belgique de l'autre.
 *
 * C'etaient deux destinations, « Comprendre » et « Investir », toutes deux
 * faites de sections repliables qu'on lit une fois puis qu'on reconsulte. Rien
 * ne permettait de deviner laquelle contenait quoi : les frais de courtage
 * etaient dans l'une, la facon de lire une fiche dans l'autre, et le nom des
 * deux onglets ne le disait pas.
 *
 * La separation en deux vues garde la distinction utile — comment marche cet
 * outil, versus comment marche l'investissement ici — sans imposer de choisir
 * entre deux destinations avant d'avoir vu leur contenu.
 */

const BASE = "comprendre";

export default function ComprendrePage() {
  const [vue, setVue] = useState("outil");

  return (
    <div className="space-y-5">
      <SousOnglets
        base={BASE}
        etiquette="Que comprendre"
        courante={vue}
        onChange={setVue}
        vues={[
          { cle: "outil", label: "Cet outil" },
          { cle: "belgique", label: "Investir en Belgique" },
        ]}
      />

      {vue === "outil" ? (
        <div {...panneau(BASE, "outil")} className="focus:outline-none">
          <LearnPage />
        </div>
      ) : (
        <div {...panneau(BASE, "belgique")} className="focus:outline-none">
          <InvestPage />
        </div>
      )}
    </div>
  );
}
