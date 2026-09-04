import { useState } from "react";
import SettingsPage from "./SettingsPage";
import AccountPage from "./AccountPage";
import SousOnglets, { panneau } from "./SousOnglets";

/**
 * Reglages : ce que l'outil surveille, et le compte qui l'heberge.
 *
 * C'etaient deux destinations, « Reglages » et « Compte ». La frontiere entre
 * les deux n'existait que dans la tete de qui les avait ecrites : les frais de
 * courtage etaient d'un cote, les notifications de l'autre, alors que les deux
 * sont des reglages. Chercher dans quel onglet se trouve un parametre est un
 * cout paye a chaque fois.
 *
 * La separation retenue est celle qui se devine : « Surveillance » regroupe ce
 * que l'outil observe et avec quels parametres, « Compte » ce qui touche a
 * l'acces, aux donnees et a l'appareil.
 */

const BASE = "reglages";

export default function ReglagesPage() {
  const [vue, setVue] = useState("surveillance");

  return (
    <div className="space-y-5">
      <SousOnglets
        base={BASE}
        etiquette="Réglages"
        courante={vue}
        onChange={setVue}
        vues={[
          { cle: "surveillance", label: "Surveillance" },
          { cle: "compte", label: "Compte" },
        ]}
      />

      {vue === "surveillance" ? (
        <div {...panneau(BASE, "surveillance")} className="focus:outline-none">
          <SettingsPage />
        </div>
      ) : (
        <div {...panneau(BASE, "compte")} className="focus:outline-none">
          <AccountPage />
        </div>
      )}
    </div>
  );
}
