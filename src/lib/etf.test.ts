import { describe, expect, it } from "vitest";
import {
  anneesPourAbsorber,
  capitalApres,
  coutAllerRetour,
  enReel,
  ETF_MONDE,
  REGIMES_TOB,
} from "./etf";
import type { RegimeTob } from "./etf";

const nonInscrit = REGIMES_TOB.find((r) => r.cle === "non-inscrit")!;
const inscrit = REGIMES_TOB.find((r) => r.cle === "inscrit")!;

describe("coutAllerRetour", () => {
  it("compte le courtage a l'aller et au retour", () => {
    // 2,50 € par ordre chez un courtier qui tarife les ETF comme des actions.
    const r = coutAllerRetour(100, 2.5, nonInscrit);
    expect(r.courtageEur).toBeCloseTo(5, 6);
  });

  it("rend un petit ticket presque gratuit quand le courtage ETF est nul", () => {
    // Le fait central pour MeDirect : 0 € de courtage sur les ETF. Sur 100 €,
    // il ne reste que la taxe, soit 0,24 % aller-retour.
    const r = coutAllerRetour(100, 0, nonInscrit);
    expect(r.courtageEur).toBe(0);
    expect(r.taxeEur).toBeCloseTo(0.24, 6);
    expect(r.seuilRentabilitePct).toBeCloseTo(0.24, 6);
  });

  it("applique la taxe a la vente seulement dans le regime inscrit", () => {
    const r = coutAllerRetour(100, 0, inscrit);
    expect(r.taxeEur).toBeCloseTo(1.32, 6);
    expect(r.seuilRentabilitePct).toBeCloseTo(1.32, 6);
  });

  it("montre l'ecart considerable entre les deux regimes fiscaux", () => {
    // Un facteur cinq et demi : c'est pourquoi l'outil refuse de deviner
    // lequel s'applique et affiche les deux.
    const a = coutAllerRetour(1000, 0, nonInscrit).totalEur;
    const b = coutAllerRetour(1000, 0, inscrit).totalEur;
    expect(b / a).toBeCloseTo(5.5, 1);
  });

  it("plafonne la taxe sur un ordre important", () => {
    // 1,32 % de 1 000 000 € font 13 200 €, mais le plafond est de 4 000 €.
    const r = coutAllerRetour(1_000_000, 0, inscrit);
    expect(r.taxeEur).toBe(4000);
  });

  it("ne plafonne rien sur un petit ordre", () => {
    const r = coutAllerRetour(100, 0, inscrit);
    expect(r.taxeEur).toBeLessThan(inscrit.plafondEur);
  });

  it("additionne courtage et taxe dans le total", () => {
    const r = coutAllerRetour(200, 2.5, nonInscrit);
    expect(r.totalEur).toBeCloseTo(r.courtageEur + r.taxeEur, 6);
    expect(r.totalEur).toBeCloseTo(5 + 0.48, 6);
  });

  it("exprime le seuil de rentabilite en part de la mise", () => {
    // 5,48 € a recuperer sur 200 € engages.
    const r = coutAllerRetour(200, 2.5, nonInscrit);
    expect(r.seuilRentabilitePct).toBeCloseTo(2.74, 6);
  });

  it("montre qu'un courtage fixe ecrase un petit ticket", () => {
    // Le meme courtier, la meme taxe : seul le montant change.
    const petit = coutAllerRetour(50, 2.5, nonInscrit).seuilRentabilitePct;
    const gros = coutAllerRetour(2000, 2.5, nonInscrit).seuilRentabilitePct;
    expect(petit).toBeGreaterThan(10);
    expect(gros).toBeLessThan(0.5);
  });

  it("traite une mise nulle comme infiniment couteuse plutot que de diviser par zero", () => {
    const r = coutAllerRetour(0, 2.5, nonInscrit);
    expect(r.seuilRentabilitePct).toBe(Infinity);
  });

  it("ne renvoie pas NaN sur une mise invalide", () => {
    expect(coutAllerRetour(Number.NaN, 2.5, nonInscrit).totalEur).toBe(0);
  });
});

describe("anneesPourAbsorber", () => {
  it("chiffre la duree qui rend les frais negligeables", () => {
    // 2,74 % de frais, 6 % par an : un peu moins de six mois suffisent a les
    // couvrir — si le rendement se produit, ce que nul ne garantit.
    const a = anneesPourAbsorber(2.74, 6)!;
    expect(a).toBeGreaterThan(0.4);
    expect(a).toBeLessThan(0.5);
  });

  it("montre qu'un courtage nul rend la question sans objet", () => {
    expect(anneesPourAbsorber(0.24, 6)!).toBeLessThan(0.05);
  });

  it("refuse de conclure sans hypothese de rendement positive", () => {
    // Sans rendement, les frais ne sont jamais absorbes : renvoyer un nombre
    // laisserait croire le contraire.
    expect(anneesPourAbsorber(2.74, 0)).toBeNull();
    expect(anneesPourAbsorber(2.74, -3)).toBeNull();
  });

  it("renvoie zero quand il n'y a aucun frais a absorber", () => {
    expect(anneesPourAbsorber(0, 6)).toBe(0);
  });

  it("croit avec le montant des frais", () => {
    expect(anneesPourAbsorber(10, 6)!).toBeGreaterThan(anneesPourAbsorber(2, 6)!);
  });
});

describe("enReel", () => {
  it("retire l'inflation du rendement nominal", () => {
    expect(enReel(7, 2)).toBeCloseTo(4.902, 3);
  });

  it("ne se contente pas de soustraire l'inflation", () => {
    // L'ecart parait negligeable sur un an et devient considerable une fois
    // compose sur trente : il merite le calcul exact.
    expect(enReel(7, 2)).not.toBeCloseTo(5, 3);
  });

  it("laisse le rendement inchange sans inflation", () => {
    expect(enReel(7, 0)).toBeCloseTo(7, 6);
  });

  it("peut rendre negatif un rendement nominal positif", () => {
    expect(enReel(1, 3)).toBeLessThan(0);
  });
});

describe("capitalApres", () => {
  it("compose le rendement sur la duree", () => {
    expect(capitalApres(7, 30)).toBeCloseTo(761.23, 1);
  });

  it("chiffre l'ecart entre affichage et pouvoir d'achat sur trente ans", () => {
    // Le chiffre qui justifie d'afficher le rendement reel : 761 € affiches
    // ne valent que 420 € en euros d'aujourd'hui. Pres de la moitie du gain
    // nominal n'existe que dans l'affichage.
    expect(capitalApres(enReel(7, 2), 30)).toBeCloseTo(420.25, 1);
  });

  it("ne change rien sur une duree nulle", () => {
    expect(capitalApres(7, 0)).toBe(100);
  });

  it("accepte une mise differente de cent", () => {
    expect(capitalApres(10, 2, 50)).toBeCloseTo(60.5, 6);
  });
});

describe("description de l'ETF", () => {
  it("cite la devise de cotation et non celle des actifs", () => {
    expect(ETF_MONDE.devise).toBe("EUR");
  });

  it("assume ce qui n'a pas pu etre verifie", () => {
    // La liste doit rester non vide : le jour ou l'ISIN et les frais annuels
    // seront lus sur une source officielle, ce test rappellera de la mettre
    // a jour plutot que de la laisser mentir par omission.
    expect(ETF_MONDE.aVerifier.length).toBeGreaterThan(0);
    expect(ETF_MONDE.aVerifier.join(" ")).toMatch(/ISIN/);
  });

  it("ne presente jamais les deux regimes fiscaux comme certains a la fois", () => {
    const officiels = REGIMES_TOB.filter((r: RegimeTob) => r.source === "officiel");
    expect(officiels).toHaveLength(1);
  });
});
