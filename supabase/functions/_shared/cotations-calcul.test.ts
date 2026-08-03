/**
 * Ces fonctions decident du cours retenu pour un achat fictif et du resultat
 * affiche ensuite. Une erreur ici ne fait pas planter l'outil : elle affiche
 * un chiffre faux, ce qui est pire. Les reponses utilisees dans les tests
 * reprennent la forme reelle renvoyee par le fournisseur de cours.
 */

import { describe, expect, it } from "vitest";
import {
  choisirSeance,
  deviseDe,
  enEuros,
  extraireSerie,
  fenetreHistorique,
  prixCourant,
  variationDecomposee,
} from "./cotations-calcul";

/** Construit une reponse a la forme du fournisseur de cours. */
function reponse(
  dates: string[],
  closes: (number | null)[],
  meta: Record<string, unknown> = {},
) {
  return {
    chart: {
      result: [
        {
          meta,
          timestamp: dates.map((d) => Math.floor(+new Date(`${d}T12:00:00Z`) / 1000)),
          indicators: { quote: [{ close: closes }] },
        },
      ],
    },
  };
}

describe("extraireSerie", () => {
  it("aligne dates et clotures", () => {
    const s = extraireSerie(reponse(["2026-06-01", "2026-06-02"], [100, 110]));
    expect(s.dates).toEqual(["2026-06-01", "2026-06-02"]);
    expect(s.cloture).toEqual([100, 110]);
  });

  it("ecarte les trous en gardant l'alignement date/cours", () => {
    // Un jour ferie laisse un null : la date correspondante doit disparaitre
    // elle aussi, sinon tous les cours suivants seraient decales d'un jour.
    const s = extraireSerie(
      reponse(["2026-06-01", "2026-06-02", "2026-06-03"], [100, null, 120]),
    );
    expect(s.dates).toEqual(["2026-06-01", "2026-06-03"]);
    expect(s.cloture).toEqual([100, 120]);
  });

  it("ecarte aussi les valeurs non finies", () => {
    const s = extraireSerie(
      reponse(["2026-06-01", "2026-06-02"], [100, Number.NaN as unknown as number]),
    );
    expect(s.cloture).toEqual([100]);
  });

  it("remonte le message d'erreur du fournisseur quand le symbole est inconnu", () => {
    expect(() =>
      extraireSerie({ chart: { result: null, error: { description: "No data found" } } }),
    ).toThrow("No data found");
  });

  it("echoue proprement sur une reponse vide plutot que de renvoyer une serie vide", () => {
    expect(() => extraireSerie({})).toThrow();
  });

  it("tolere une serie sans aucune donnee de cours", () => {
    const s = extraireSerie({
      chart: { result: [{ meta: { currency: "EUR" }, timestamp: [], indicators: {} }] },
    });
    expect(s.dates).toEqual([]);
    expect(s.cloture).toEqual([]);
  });
});

describe("choisirSeance", () => {
  const dates = ["2026-06-11", "2026-06-12", "2026-06-15"]; // 13-14 = week-end

  it("retient la seance exacte quand elle existe", () => {
    expect(choisirSeance(dates, "2026-06-12")).toBe(1);
  });

  it("recule au vendredi quand on demande un samedi — jamais le lundi suivant", () => {
    // Le point critique : retenir le lundi reviendrait a simuler un achat a un
    // cours qui n'existait pas encore le jour de la decision.
    expect(choisirSeance(dates, "2026-06-13")).toBe(1);
    expect(choisirSeance(dates, "2026-06-14")).toBe(1);
  });

  it("retient la derniere seance connue si la date demandee est posterieure", () => {
    expect(choisirSeance(dates, "2026-06-30")).toBe(2);
  });

  it("renvoie -1 si aucune seance n'est assez ancienne", () => {
    expect(choisirSeance(dates, "2026-06-01")).toBe(-1);
    expect(choisirSeance([], "2026-06-12")).toBe(-1);
  });
});

describe("fenetreHistorique", () => {
  it("remonte 12 jours en arriere et va jusqu'au lendemain", () => {
    const { debut, fin } = fenetreHistorique("2026-06-15");
    const jours = (fin - debut) / 86400;
    expect(jours).toBeCloseTo(13, 6);
    expect(new Date(debut * 1000).toISOString().slice(0, 10)).toBe("2026-06-03");
    expect(new Date(fin * 1000).toISOString().slice(0, 10)).toBe("2026-06-16");
  });
});

describe("prixCourant", () => {
  it("prefere le cours temps reel de la place", () => {
    expect(prixCourant({ regularMarketPrice: 250.9 }, [240, 245])).toBe(250.9);
  });

  it("retombe sur la derniere cloture si le temps reel manque", () => {
    expect(prixCourant({}, [240, 245])).toBe(245);
  });

  it("renvoie null plutot qu'un cours nul ou negatif", () => {
    expect(prixCourant({ regularMarketPrice: 0 }, [])).toBeNull();
    expect(prixCourant({ regularMarketPrice: -5 }, [])).toBeNull();
    expect(prixCourant({}, [])).toBeNull();
  });
});

describe("deviseDe", () => {
  it("met la devise en majuscules", () => {
    expect(deviseDe({ currency: "sek" })).toBe("SEK");
  });
  it("suppose l'euro en l'absence d'indication", () => {
    expect(deviseDe({})).toBe("EUR");
  });
});

describe("enEuros", () => {
  it("divise par le taux, ne multiplie pas", () => {
    // 110 SEK avec 1 EUR = 11 SEK font 10 €, pas 1210 €.
    expect(enEuros(110, 11)).toBeCloseTo(10, 6);
  });
  it("laisse un prix en euros inchange", () => {
    expect(enEuros(250, 1)).toBe(250);
  });
  it("traite un taux nul comme 1 plutot que de diviser par zero", () => {
    expect(enEuros(250, 0)).toBe(250);
  });
});

describe("variationDecomposee", () => {
  it("sépare la hausse du titre de l'effet du change", () => {
    // Le cours monte de 10 % en couronnes, mais la couronne se deprecie de
    // 10 % : en euros le gain est presque nul.
    const v = variationDecomposee(100, 10, 110, 11);
    expect(v.coursPct).toBeCloseTo(10, 6);
    expect(v.totalPct).toBeCloseTo(0, 6);
    expect(v.changePct).toBeCloseTo(-10, 6);
  });

  it("n'attribue aucun effet au change pour un titre en euros", () => {
    const v = variationDecomposee(200, 1, 220, 1);
    expect(v.coursPct).toBeCloseTo(10, 6);
    expect(v.totalPct).toBeCloseTo(10, 6);
    expect(v.changePct).toBeCloseTo(0, 6);
  });

  it("compte une baisse en negatif", () => {
    const v = variationDecomposee(100, 1, 80, 1);
    expect(v.coursPct).toBeCloseTo(-20, 6);
    expect(v.totalPct).toBeCloseTo(-20, 6);
  });

  it("cumule hausse du titre et devise favorable", () => {
    // Le titre monte de 10 % et la devise se renforce (taux qui baisse) :
    // les deux effets s'additionnent en euros.
    const v = variationDecomposee(100, 11, 110, 10);
    expect(v.coursPct).toBeCloseTo(10, 6);
    expect(v.totalPct).toBeGreaterThan(v.coursPct);
    expect(v.changePct).toBeGreaterThan(0);
  });
});
