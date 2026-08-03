import { describe, expect, it } from "vitest";
import {
  calculeExposition,
  concentrationsNotables,
  paysDuSymbole,
} from "./exposition";
import type { PositionExposee } from "./exposition";

const p = (
  symbole: string,
  devise: string,
  montantEur: number,
  secteur: string | null = null,
): PositionExposee => ({ symbole, devise, montantEur, secteur });

describe("paysDuSymbole", () => {
  it("reconnait les places europeennes par leur suffixe", () => {
    expect(paysDuSymbole("UCB.BR").code).toBe("BE");
    expect(paysDuSymbole("VOLV-B.ST").code).toBe("SE");
    expect(paysDuSymbole("IWDA.AS").code).toBe("NL");
  });

  it("traite un symbole sans suffixe comme americain", () => {
    expect(paysDuSymbole("AAPL").code).toBe("US");
  });

  it("ne se laisse pas tromper par un tiret dans le ticker", () => {
    // "VOLV-B" contient un tiret mais pas de point : c'est le suffixe qui
    // compte, pas la classe d'action.
    expect(paysDuSymbole("VOLV-B.ST").code).toBe("SE");
    expect(paysDuSymbole("BRK-B").code).toBe("US");
  });

  it("range une place inconnue a part plutot que de la dire americaine", () => {
    expect(paysDuSymbole("XYZ.TO").code).toBe("??");
  });
});

describe("calculeExposition", () => {
  it("additionne les montants et compte les positions", () => {
    const e = calculeExposition([p("AAPL", "USD", 100), p("UCB.BR", "EUR", 50)]);
    expect(e.totalEur).toBeCloseTo(150, 6);
    expect(e.positions).toBe(2);
  });

  it("révèle une concentration que le nombre de lignes masque", () => {
    // Quatre lignes, mais toutes americaines : ce n'est pas une
    // diversification, c'est le meme pari repete.
    const e = calculeExposition([
      p("AAPL", "USD", 100),
      p("GOOGL", "USD", 100),
      p("KO", "USD", 100),
      p("UCB.BR", "EUR", 100),
    ]);
    expect(e.parPays[0].cle).toBe("US");
    expect(e.parPays[0].partPct).toBeCloseTo(75, 6);
    expect(e.parPays[0].nombre).toBe(3);
  });

  it("classe du plus expose au moins expose", () => {
    const e = calculeExposition([
      p("UCB.BR", "EUR", 10),
      p("AAPL", "USD", 90),
    ]);
    expect(e.parPays.map((l) => l.cle)).toEqual(["US", "BE"]);
  });

  it("mesure la part hors zone euro, qui subit le risque de change", () => {
    const e = calculeExposition([
      p("AAPL", "USD", 60),
      p("VOLV-B.ST", "SEK", 20),
      p("UCB.BR", "EUR", 20),
    ]);
    expect(e.horsEuroPct).toBeCloseTo(80, 6);
  });

  it("mesure la plus grosse ligne", () => {
    const e = calculeExposition([p("AAPL", "USD", 70), p("UCB.BR", "EUR", 30)]);
    expect(e.concentrationMaxPct).toBeCloseTo(70, 6);
  });

  it("indique la part de secteur inconnu au lieu de la masquer", () => {
    // Les cotations publiques n'exposent pas le secteur sans authentification :
    // une simulation saisie a la main n'en a pas. Le dire vaut mieux que de
    // presenter une repartition sectorielle fausse parce qu'incomplete.
    const e = calculeExposition([
      p("AAPL", "USD", 50, "Technology"),
      p("UCB.BR", "EUR", 50, null),
    ]);
    expect(e.secteurInconnuPct).toBeCloseTo(50, 6);
    expect(e.parSecteur).toHaveLength(1);
    expect(e.parSecteur[0].cle).toBe("Technology");
  });

  it("ecarte les montants invalides sans planter", () => {
    const e = calculeExposition([
      p("AAPL", "USD", 100),
      p("X", "EUR", 0),
      p("Y", "EUR", Number.NaN),
      p("Z", "EUR", -50),
    ]);
    expect(e.positions).toBe(1);
    expect(e.totalEur).toBeCloseTo(100, 6);
  });

  it("ne divise pas par zero sur une liste vide", () => {
    const e = calculeExposition([]);
    expect(e.totalEur).toBe(0);
    expect(e.concentrationMaxPct).toBe(0);
    expect(e.horsEuroPct).toBe(0);
    expect(e.secteurInconnuPct).toBe(0);
    expect(e.parPays).toEqual([]);
  });
});

describe("concentrationsNotables", () => {
  it("signale une place qui domine largement", () => {
    const e = calculeExposition([
      p("AAPL", "USD", 80),
      p("UCB.BR", "EUR", 20),
    ]);
    expect(concentrationsNotables(e).join(" ")).toMatch(/États-Unis/);
  });

  it("signale une devise etrangere dominante", () => {
    const e = calculeExposition([
      p("AAPL", "USD", 80),
      p("UCB.BR", "EUR", 20),
    ]);
    expect(concentrationsNotables(e).join(" ")).toMatch(/USD/);
  });

  it("ne signale jamais l'euro comme un risque de change", () => {
    const e = calculeExposition([p("UCB.BR", "EUR", 80), p("AAPL", "USD", 20)]);
    expect(concentrationsNotables(e).join(" ")).not.toMatch(/libellés en EUR/);
  });

  it("se tait sur une seule position, ou la concentration est inevitable", () => {
    // Alerter sur 100 % quand il n'y a qu'une ligne serait du bruit pur.
    expect(concentrationsNotables(calculeExposition([p("AAPL", "USD", 100)]))).toEqual([]);
  });

  it("se tait sur un portefeuille reparti", () => {
    const e = calculeExposition([
      p("AAPL", "USD", 25),
      p("UCB.BR", "EUR", 25),
      p("VOLV-B.ST", "SEK", 25),
      p("IWDA.AS", "EUR", 25),
    ]);
    expect(concentrationsNotables(e)).toEqual([]);
  });
});
