import { describe, expect, it } from "vitest";
import {
  cadenceMensuelle,
  fenetresGlissantes,
  mediane,
  MIN_FENETRES,
} from "./horizons";
import type { PointMensuel } from "./horizons";

/** Serie mensuelle a croissance constante, pour verifier l'annualisation. */
function croissance(mois: number, tauxMensuel: number, depart = 100): PointMensuel[] {
  const pts: PointMensuel[] = [];
  let v = depart;
  for (let i = 0; i < mois; i++) {
    const d = new Date(Date.UTC(2000, i, 1));
    pts.push({ date: d.toISOString().slice(0, 10), valeur: v });
    v *= 1 + tauxMensuel;
  }
  return pts;
}

describe("mediane", () => {
  it("prend la valeur centrale sur un nombre impair", () => {
    expect(mediane([3, 1, 2])).toBe(2);
  });

  it("moyenne les deux valeurs centrales sur un nombre pair", () => {
    expect(mediane([1, 2, 3, 4])).toBe(2.5);
  });

  it("ne depend pas de l'ordre d'entree", () => {
    expect(mediane([9, 1, 5, 3])).toBe(mediane([1, 3, 5, 9]));
  });

  it("renvoie NaN sur une liste vide plutot que zero", () => {
    // Zero serait un rendement plausible : il passerait inapercu.
    expect(mediane([])).toBeNaN();
  });
});

describe("cadenceMensuelle", () => {
  it("accepte une vraie serie mensuelle", () => {
    expect(cadenceMensuelle(croissance(60, 0).map((p) => p.date))).toBe(true);
  });

  it("refuse une serie trimestriellement degradee", () => {
    // Le cas reel : le fournisseur accepte `interval=1mo` sur un historique
    // de 40 ans mais renvoie un pas trimestriel sans le dire. Sans ce
    // refus, une fenetre de 10 ans en compterait 30.
    const dates: string[] = [];
    for (let i = 0; i < 60; i++) {
      dates.push(new Date(Date.UTC(1990, i * 3, 1)).toISOString().slice(0, 10));
    }
    expect(cadenceMensuelle(dates)).toBe(false);
  });

  it("refuse une serie quotidienne", () => {
    const dates: string[] = [];
    for (let i = 0; i < 60; i++) {
      dates.push(new Date(Date.UTC(2020, 0, 1 + i)).toISOString().slice(0, 10));
    }
    expect(cadenceMensuelle(dates)).toBe(false);
  });

  it("refuse un historique trop court pour etre juge", () => {
    expect(cadenceMensuelle(croissance(10, 0).map((p) => p.date))).toBe(false);
  });

  it("refuse des dates non croissantes", () => {
    const dates = croissance(30, 0).map((p) => p.date);
    [dates[5], dates[6]] = [dates[6], dates[5]];
    expect(cadenceMensuelle(dates)).toBe(false);
  });

  it("tolere un mois manquant au milieu d'une serie par ailleurs mensuelle", () => {
    const dates = croissance(60, 0).map((p) => p.date);
    dates.splice(20, 1);
    expect(cadenceMensuelle(dates)).toBe(true);
  });
});

describe("fenetresGlissantes", () => {
  it("annualise correctement une croissance constante", () => {
    // 1 % par mois pendant 10 ans : (1,01^12 - 1) = 12,68 % par an, quelle
    // que soit la fenetre choisie.
    const s = croissance(180, 0.01);
    const r = fenetresGlissantes(s, 5);
    expect(r).not.toBeNull();
    expect(r!.medianAnnualisePct).toBeCloseTo(12.6825, 3);
    expect(r!.pireAnnualisePct).toBeCloseTo(12.6825, 3);
    expect(r!.meilleurAnnualisePct).toBeCloseTo(12.6825, 3);
  });

  it("compte exactement les fenetres disponibles", () => {
    // 180 points, fenetre de 60 mois : les departs vont de l'indice 0 a 119.
    const r = fenetresGlissantes(croissance(180, 0.01), 5);
    expect(r!.fenetres).toBe(120);
  });

  it("mesure la duree en mois, pas en nombre de points", () => {
    // Le garde-fou contre l'erreur la plus couteuse : confondre 120 points
    // avec 10 ans. Une fenetre de 10 ans doit consommer 120 pas.
    const s = croissance(150, 0.01);
    expect(fenetresGlissantes(s, 10)!.fenetres).toBe(30);
    expect(fenetresGlissantes(s, 1)!.fenetres).toBe(138);
  });

  it("traduit le pire cas en euros sur une mise de 100", () => {
    const r = fenetresGlissantes(croissance(180, 0.01), 5)!;
    // 100 € x 1,01^60 = 181,67 €
    expect(r.pireFinal100).toBeCloseTo(181.67, 1);
  });

  it("repere la periode perdante et la date qui l'a produite", () => {
    // Baisse reguliere pendant 30 mois (100 -> 42), puis remontee lente.
    const s: PointMensuel[] = [];
    for (let i = 0; i < 100; i++) {
      const d = new Date(Date.UTC(2000, i, 1)).toISOString().slice(0, 10);
      s.push({ date: d, valeur: i < 30 ? 100 - i * 2 : 40 + (i - 30) });
    }
    const r = fenetresGlissantes(s, 1)!;
    // Contre l'intuition, la pire annee ne commence pas au sommet : elle
    // s'acheve au creux. Partir de 100 pour finir a 76 coute 24 % ; partir de
    // 64 pour finir a 40 en coute 37,5 %, parce qu'une meme baisse absolue
    // pese davantage sur une base plus faible. C'est aussi la raison pour
    // laquelle « le pire moment pour entrer » n'est pas un sommet de marche,
    // et pourquoi l'outil ne pretend jamais le designer a l'avance.
    expect(r.pireDepart).toBe("2001-07-01");
    expect(r.pireAnnualisePct).toBeCloseTo(-37.5, 1);
    expect(r.pireFinal100).toBeCloseTo(62.5, 1);
  });

  it("mesure la part des periodes terminees au-dessus de la mise", () => {
    // 48 mois : plat sur la premiere moitie, en hausse ensuite. Sur une
    // fenetre d'un an, seuls les departs situes avant la hausse gagnent.
    const s: PointMensuel[] = [];
    for (let i = 0; i < 48; i++) {
      const d = new Date(Date.UTC(2000, i, 1)).toISOString().slice(0, 10);
      s.push({ date: d, valeur: i < 24 ? 100 : 100 + (i - 23) });
    }
    const r = fenetresGlissantes(s, 1)!;
    expect(r.partPositivePct).toBeGreaterThan(0);
    expect(r.partPositivePct).toBeLessThan(100);
  });

  it("donne 100 % quand aucune periode ne perd", () => {
    expect(fenetresGlissantes(croissance(120, 0.01), 1)!.partPositivePct).toBe(100);
  });

  it("refuse de conclure quand l'historique est plus court que l'horizon", () => {
    // Le cas concret : 17 ans d'historique ne disent rien sur 30 ans. Mieux
    // vaut null, que l'interface traduira en « donnée inexistante », qu'un
    // chiffre extrapole.
    expect(fenetresGlissantes(croissance(204, 0.005), 30)).toBeNull();
  });

  it("refuse de conclure sur trop peu de periodes", () => {
    // 130 points, fenetre de 10 ans : 10 periodes seulement. Le « pire cas »
    // decrirait un mois d'entree particulier, pas le placement.
    const r = fenetresGlissantes(croissance(130, 0.005), 10);
    expect(r).toBeNull();
    // La meme serie avec le seuil abaisse produit bien un resultat : c'est
    // le seuil qui refuse, pas un manque de donnees brutes.
    expect(fenetresGlissantes(croissance(130, 0.005), 10, 5)).not.toBeNull();
  });

  it("expose le seuil utilise par defaut", () => {
    expect(MIN_FENETRES).toBe(12);
  });

  it("ecarte les valeurs nulles ou negatives sans planter", () => {
    const s = croissance(120, 0.01);
    s[5].valeur = 0;
    s[7].valeur = -3;
    const r = fenetresGlissantes(s, 1);
    expect(r).not.toBeNull();
    expect(Number.isFinite(r!.medianAnnualisePct)).toBe(true);
  });

  it("refuse un horizon nul ou negatif", () => {
    expect(fenetresGlissantes(croissance(120, 0.01), 0)).toBeNull();
    expect(fenetresGlissantes(croissance(120, 0.01), -5)).toBeNull();
  });
});
