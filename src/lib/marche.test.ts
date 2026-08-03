import { describe, expect, it } from "vitest";
import {
  cheminSvg,
  compareStrategies,
  indicateurs,
  marcheDePiste,
  poidsDesFrais,
  symboleYahoo,
} from "./marche";
import type { PointSerie } from "./marche";

/** Serie synthetique : un point par jour a partir du 1er janvier. */
function serie(prix: number[], depart = "2026-01-01"): PointSerie[] {
  const t0 = +new Date(`${depart}T00:00:00Z`);
  return prix.map((p, i) => ({
    date: new Date(t0 + i * 86_400_000).toISOString().slice(0, 10),
    prix: p,
  }));
}

describe("indicateurs", () => {
  it("situe le dernier cours dans sa fourchette", () => {
    const r = indicateurs(serie([100, 50, 200, 125]))!;
    expect(r.plusBas).toBe(50);
    expect(r.plusHaut).toBe(200);
    // 125 est a la moitie de l'intervalle 50-200.
    expect(r.positionPct).toBeCloseTo(50, 6);
  });

  it("mesure la plus forte baisse subie, pas la baisse finale", () => {
    // Le cours finit a son sommet, mais a perdu 50 % en cours de route.
    const r = indicateurs(serie([100, 50, 100]))!;
    expect(r.pireBaissePct).toBeCloseTo(-50, 6);
  });

  it("ne calcule pas une variation sur un horizon plus long que l'historique", () => {
    const r = indicateurs(serie([100, 101, 102]))!;
    expect(r.var1m).toBeNull();
    expect(r.var1a).toBeNull();
  });

  it("calcule la variation quand l'historique couvre l'horizon", () => {
    // 400 jours de hausse reguliere de 100 a 200.
    const prix = Array.from({ length: 400 }, (_, i) => 100 + (i * 100) / 399);
    const r = indicateurs(serie(prix))!;
    expect(r.var1a).not.toBeNull();
    expect(r.var1a!).toBeGreaterThan(0);
  });

  it("renvoie null sur une serie vide", () => {
    expect(indicateurs([])).toBeNull();
  });
});

describe("compareStrategies", () => {
  // Cours qui plonge puis remonte au point de depart : le meilleur jour est
  // clairement le creux, le pire est le depart.
  const creux = serie([100, 80, 60, 80, 100]);

  it("borne le timing entre le meilleur et le pire jour", () => {
    const c = compareStrategies(creux, 100, 4, 0, 0)!;
    expect(c.dateMeilleurJour).toBe("2026-01-03"); // le point a 60
    expect(c.meilleurJour.gainEur).toBeGreaterThan(c.programme.gainEur);
    expect(c.pireJour.gainEur).toBeLessThan(c.programme.gainEur);
  });

  it("l'achat programme lisse le prix paye", () => {
    const c = compareStrategies(creux, 100, 4, 0, 0)!;
    // Acheter regulierement pendant la baisse fait mieux que tout mettre au
    // depart, sans avoir rien eu a deviner.
    expect(c.programme.gainEur).toBeGreaterThan(c.toutDeSuite.gainEur);
  });

  it("compte un frais fixe par ordre : fractionner coute plus cher", () => {
    const plat = serie([100, 100, 100, 100, 100, 100]);
    const c = compareStrategies(plat, 50, 4, 1, 0)!;
    // 4 ordres a 1 € contre un seul ordre a 1 €.
    expect(c.programme.fraisEur).toBeCloseTo(4, 6);
    expect(c.toutDeSuite.fraisEur).toBeCloseTo(1, 6);
    // A cours constant, seuls les frais font la difference.
    expect(c.programme.gainEur).toBeCloseTo(-4, 6);
    expect(c.toutDeSuite.gainEur).toBeCloseTo(-1, 6);
  });

  it("engage la meme somme totale dans toutes les strategies", () => {
    const c = compareStrategies(creux, 100, 4, 1, 0.12)!;
    expect(c.programme.engageEur).toBeCloseTo(400, 6);
    expect(c.meilleurJour.engageEur).toBeCloseTo(400, 6);
    expect(c.pireJour.engageEur).toBeCloseTo(400, 6);
    expect(c.toutDeSuite.engageEur).toBeCloseTo(400, 6);
  });

  it("refuse une serie ou un budget inexploitables", () => {
    expect(compareStrategies([], 100, 4, 1, 0)).toBeNull();
    expect(compareStrategies(creux, 0, 4, 1, 0)).toBeNull();
    expect(compareStrategies(creux, 100, 0, 1, 0)).toBeNull();
  });
});

describe("poidsDesFrais", () => {
  it("montre que fractionner une petite somme la ronge", () => {
    // 600 € en une fois : 1 € de frais, soit 0,17 %.
    expect(poidsDesFrais(600, 1, 1, 0).fraisPct).toBeCloseTo(0.1667, 3);
    // Les memes 600 € en 12 fois : 12 € de frais, soit 2 %.
    const douze = poidsDesFrais(600, 12, 1, 0);
    expect(douze.fraisEur).toBeCloseTo(12, 6);
    expect(douze.fraisPct).toBeCloseTo(2, 6);
    expect(douze.parOrdreEur).toBeCloseTo(50, 6);
  });

  it("ajoute la taxe proportionnelle, qui ne depend pas du decoupage", () => {
    const a = poidsDesFrais(1000, 1, 0, 0.12);
    const b = poidsDesFrais(1000, 10, 0, 0.12);
    expect(a.fraisEur).toBeCloseTo(1.2, 6);
    expect(b.fraisEur).toBeCloseTo(1.2, 6);
  });
});

describe("cheminSvg", () => {
  it("normalise la courbe dans la boite fournie", () => {
    const d = cheminSvg(serie([10, 20]), 100, 50);
    // Premier point en bas a gauche, dernier en haut a droite.
    expect(d).toBe("M0.00,50.00 L100.00,0.00");
  });

  it("ne trace rien avec moins de deux points", () => {
    expect(cheminSvg(serie([10]), 100, 50)).toBe("");
  });
});

describe("marcheDePiste", () => {
  it("reconnait les signaux americains", () => {
    expect(marcheDePiste({ signal: "13f_new", source_url: "https://www.sec.gov/x" })).toBe("US");
    expect(marcheDePiste({ signal: "form4_buy", source_url: "https://www.sec.gov/x" })).toBe("US");
  });

  it("distingue la Belgique et la Suede par l'URL de la source, pas seulement le signal", () => {
    expect(marcheDePiste({ signal: "mar_buy", source_url: "https://www.fsma.be/fr/x" })).toBe("BE");
    expect(
      marcheDePiste({ signal: "mar_buy", source_url: "https://marknadssok.fi.se/x" }),
    ).toBe("SE");
  });

  it("renvoie null pour un signal ou une source qu'elle ne reconnait pas", () => {
    expect(marcheDePiste({ signal: "mar_buy", source_url: "https://example.com" })).toBeNull();
    expect(marcheDePiste({ signal: "inconnu", source_url: "https://www.sec.gov/x" })).toBeNull();
  });
});

describe("symboleYahoo", () => {
  it("n'ajoute aucun suffixe pour les tickers americains", () => {
    expect(symboleYahoo("AAPL", "US")).toBe("AAPL");
  });

  it("ajoute .BR pour Bruxelles et .ST pour Stockholm", () => {
    expect(symboleYahoo("UCB", "BE")).toBe("UCB.BR");
    // Les classes d'action suedoises font deja partie du ticker stocke.
    expect(symboleYahoo("VOLV-B", "SE")).toBe("VOLV-B.ST");
  });
});
