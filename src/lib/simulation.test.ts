/**
 * Ces calculs decident de ce que l'utilisateur croit avoir gagne ou perdu.
 * Une erreur de signe ou de frais oublies enseignerait exactement le contraire
 * de ce que l'outil veut transmettre, d'ou ces verifications.
 */

import { describe, expect, it } from "vitest";
import { calculeSimulation, prepareEntree } from "./simulation";
import type { Simulation } from "./types";

const BASE: Simulation = {
  id: "s1",
  user_id: "u1",
  piste_id: null,
  symbole: "TEST.BR",
  company_name: "Test SA",
  devise: "EUR",
  montant_eur: 100,
  frais_entree_eur: 1,
  prix_entree: 10,
  taux_entree: 1,
  quantite: 9.9,
  date_entree: "2026-01-01",
  note: null,
  prix_actuel: null,
  taux_actuel: null,
  prix_maj_at: null,
  ref_symbole: null,
  ref_prix_entree: null,
  ref_prix_actuel: null,
  closed_at: null,
  prix_sortie: null,
  taux_sortie: null,
  frais_sortie_eur: null,
  note_sortie: null,
  created_at: "2026-01-01T00:00:00Z",
};

describe("prepareEntree", () => {
  it("retire les frais fixes et la taxe avant d'acheter des titres", () => {
    // 100 € - 1 € de frais = 99 €, dont 0,12 % de taxe sur le montant investi.
    const r = prepareEntree(100, 10, 1, 1, 0.12);
    expect(r.investiEur).toBeCloseTo(98.8814, 3);
    expect(r.taxeEur).toBeCloseTo(0.1186, 3);
    expect(r.fraisEntreeEur).toBeCloseTo(1.1186, 3);
    // Le total doit se conserver : rien ne doit disparaitre en route.
    expect(r.investiEur + r.fraisEntreeEur).toBeCloseTo(100, 6);
    expect(r.quantite).toBeCloseTo(9.88814, 4);
  });

  it("convertit le cours en euros pour un titre en devise etrangere", () => {
    // 110 SEK avec 1 EUR = 11 SEK, soit 10 € l'action.
    const r = prepareEntree(100, 110, 11, 0, 0);
    expect(r.prixEur).toBeCloseTo(10, 6);
    expect(r.quantite).toBeCloseTo(10, 6);
  });

  it("ne produit pas de quantite negative si les frais depassent la mise", () => {
    const r = prepareEntree(0.5, 10, 1, 1, 0);
    expect(r.investiEur).toBe(0);
    expect(r.quantite).toBe(0);
  });
});

describe("calculeSimulation", () => {
  it("signale une valorisation absente sans inventer de resultat", () => {
    const r = calculeSimulation(BASE, 1, 0);
    expect(r.enAttente).toBe(true);
    expect(r.gainEur).toBe(0);
  });

  it("compte les frais de vente : un cours stable fait perdre de l'argent", () => {
    const r = calculeSimulation(
      { ...BASE, prix_actuel: 10, taux_actuel: 1 },
      1,
      0,
    );
    // 9,9 titres a 10 € = 99 €, moins 1 € de frais de vente = 98 € pour 100 € engages.
    expect(r.valeurEur).toBeCloseTo(99, 6);
    expect(r.netEur).toBeCloseTo(98, 6);
    expect(r.gainEur).toBeCloseTo(-2, 6);
    expect(r.gainPct).toBeCloseTo(-2, 6);
    expect(r.variationCoursPct).toBeCloseTo(0, 6);
  });

  it("separe l'effet du cours de l'effet du change", () => {
    // Le cours monte de 10 %, mais la couronne se deprecie de 10 % : en euros,
    // le gain est presque nul. C'est la lecon que la fiche doit faire passer.
    const r = calculeSimulation(
      {
        ...BASE,
        devise: "SEK",
        prix_entree: 100,
        taux_entree: 10,
        quantite: 10,
        prix_actuel: 110,
        taux_actuel: 11,
      },
      0,
      0,
    );
    expect(r.variationCoursPct).toBeCloseTo(10, 6);
    expect(r.effetChangePct).toBeCloseTo(-10, 6);
    // 10 titres a 110 SEK / 11 = 100 €, contre 100 € engages.
    expect(r.valeurEur).toBeCloseTo(100, 6);
  });

  it("applique la taxe de bourse a la valeur de revente", () => {
    const r = calculeSimulation(
      { ...BASE, prix_actuel: 20, taux_actuel: 1 },
      1,
      0.12,
    );
    // 9,9 x 20 = 198 € ; frais de sortie = 1 + 198 x 0,12 %.
    expect(r.valeurEur).toBeCloseTo(198, 6);
    expect(r.fraisSortieEur).toBeCloseTo(1.2376, 3);
    expect(r.gainEur).toBeCloseTo(96.7624, 3);
  });

  it("utilise les frais reels une fois la simulation cloturee", () => {
    const r = calculeSimulation(
      {
        ...BASE,
        closed_at: "2026-03-01T00:00:00Z",
        prix_sortie: 12,
        taux_sortie: 1,
        frais_sortie_eur: 2.5,
        prix_actuel: 999, // ne doit pas etre utilise : la position est fermee
        taux_actuel: 1,
      },
      1,
      0.12,
    );
    expect(r.valeurEur).toBeCloseTo(118.8, 6);
    expect(r.fraisSortieEur).toBeCloseTo(2.5, 6);
    expect(r.gainEur).toBeCloseTo(16.3, 6);
  });

  it("compare a conditions egales avec le placement de reference", () => {
    const r = calculeSimulation(
      {
        ...BASE,
        prix_actuel: 10,
        taux_actuel: 1,
        ref_symbole: "IWDA.AS",
        ref_prix_entree: 100,
        ref_prix_actuel: 110,
      },
      1,
      0,
    );
    // 99 € places a 100 € l'unite = 0,99 part, revalorisee a 108,9 €,
    // moins 1 € de frais de vente = 107,9 € pour 100 € engages.
    expect(r.referenceGainEur).toBeCloseTo(7.9, 6);
    expect(r.referenceGainPct).toBeCloseTo(7.9, 6);
    // La reference supporte les memes frais que le titre : sinon la
    // comparaison serait truquee en sa faveur.
    expect(r.gainEur).toBeLessThan(r.referenceGainEur!);
  });

  it("compte les jours ecoules depuis l'achat fictif", () => {
    const r = calculeSimulation(
      {
        ...BASE,
        date_entree: "2026-01-01",
        closed_at: "2026-01-31T00:00:00Z",
        prix_sortie: 10,
        taux_sortie: 1,
        frais_sortie_eur: 0,
      },
      1,
      0,
    );
    expect(r.jours).toBe(30);
  });
});
