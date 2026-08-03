import { describe, expect, it } from "vitest";
import { computeFeeImpact, FEE_WARNING_THRESHOLD_PCT } from "./fees";

describe("computeFeeImpact", () => {
  it("compte les frais fixes en pourcentage de la mise", () => {
    const r = computeFeeImpact(1, 100);
    expect(r.feePct).toBeCloseTo(1, 6);
    // L'aller-retour double le cout : acheter puis revendre.
    expect(r.roundTripPct).toBeCloseTo(2, 6);
  });

  it("ajoute la taxe de bourse", () => {
    const r = computeFeeImpact(1, 100, 0.12);
    expect(r.feePct).toBeCloseTo(1.12, 6);
  });

  it("ajoute la commission de change sur un titre en devise etrangere", () => {
    const r = computeFeeImpact(1, 100, 0.12, 0.25, "USD");
    expect(r.fxPct).toBeCloseTo(0.25, 6);
    expect(r.feePct).toBeCloseTo(1.37, 6);
    // 2,74 % a couvrir avant le premier euro de gain sur un ticket de 100 €.
    expect(r.roundTripPct).toBeCloseTo(2.74, 6);
  });

  it("n'applique aucune commission de change a un titre cote en euros", () => {
    // Le point clef : sans cette exception, une action belge paraitrait aussi
    // chere qu'une action americaine alors qu'elle ne subit aucune conversion.
    const r = computeFeeImpact(1, 100, 0.12, 0.25, "EUR");
    expect(r.fxPct).toBe(0);
    expect(r.feePct).toBeCloseTo(1.12, 6);
  });

  it("ignore la commission de change quand elle n'est pas renseignee", () => {
    const r = computeFeeImpact(1, 100, 0.12, 0, "USD");
    expect(r.fxPct).toBe(0);
    expect(r.feePct).toBeCloseTo(1.12, 6);
  });

  it("montre qu'un petit ticket en devise devient tres couteux", () => {
    // 50 € sur un titre americain : 1 € de frais = 2 %, plus taxe et change.
    const r = computeFeeImpact(1, 50, 0.12, 0.25, "USD");
    expect(r.feePct).toBeCloseTo(2.37, 6);
    expect(r.tooSmall).toBe(false); // sous le seuil de 3 %…
    // …mais il faut quand meme gagner pres de 5 % rien que pour rentrer.
    expect(r.roundTripPct).toBeGreaterThan(4.7);
  });

  it("alerte au-dela du seuil", () => {
    const r = computeFeeImpact(1, 25, 0.12, 0.25, "USD");
    expect(r.feePct).toBeGreaterThan(FEE_WARNING_THRESHOLD_PCT);
    expect(r.tooSmall).toBe(true);
  });

  it("traite une mise nulle comme infiniment couteuse plutot que de diviser par zero", () => {
    const r = computeFeeImpact(1, 0, 0.12, 0.25, "USD");
    expect(r.feePct).toBe(Infinity);
    expect(r.tooSmall).toBe(true);
    expect(r.fxPct).toBe(0);
  });
});
