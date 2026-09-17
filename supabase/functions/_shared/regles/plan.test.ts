import { describe, expect, it } from "vitest";
import {
  FRAIS_CIBLE_PCT_DEFAUT,
  MOIS_PRECAUTION_DEFAUT,
  construirePlan,
  ticketMinimum,
} from "./plan.ts";
import type { Contexte, Fait } from "./types.ts";

/**
 * Ce plan annonce a quelqu'un combien investir de son argent. Une erreur ici
 * ne produit pas un bogue visible : elle produit un conseil credible et faux.
 * Chaque etape est donc testee dans les deux sens — ce qu'elle dit quand les
 * chiffres sont la, et ce qu'elle refuse de dire quand ils manquent.
 */

const MAINTENANT = new Date("2026-09-17T12:00:00Z");

function f(key: string, value: unknown): Fait {
  return { key, value, domain: "profil", verifiedAt: "2026-09-01T00:00:00Z" };
}

function ctx(faits: Fait[]): Contexte {
  return { maintenant: MAINTENANT, faits, signaux: [] };
}

/** Profil complet et sain : marge confortable, precaution constituee. */
const COMPLET = [
  f("profil.revenus_mensuels_eur", 2600),
  f("profil.charges_mensuelles_eur", 1800),
  f("profil.epargne_precaution_eur", 8000),
  f("courtier.frais_fixes_eur", 2.5),
  f("courtier.taxe_pct", 0.12),
  f("courtier.change_pct", 0),
  f("credit.capital_restant_eur", 0),
  f("credit.taux_annuel_pct", 0),
];

/**
 * Remplace des faits, au lieu d'en ajouter par-dessus.
 *
 * `fait()` renvoie la premiere occurrence d'une cle : empiler un second fait de
 * meme cle ne l'ecrase pas, il est simplement ignore. En base c'est impossible
 * — `personal_facts` porte une contrainte d'unicite sur (user_id, key) — mais
 * dans un test, un profil « complet plus une variante » masquerait la variante
 * et ferait passer des tests qui ne testent rien.
 */
function avec(base: Fait[], ...remplacements: Fait[]): Fait[] {
  const cles = new Set(remplacements.map((r) => r.key));
  return [...base.filter((b) => !cles.has(b.key)), ...remplacements];
}

const etape = (p: ReturnType<typeof construirePlan>, cle: string) =>
  p.etapes.find((e) => e.cle === cle)!;

// ---------------------------------------------------------------------------

describe("ticket minimum", () => {
  it("calcule le montant qui maintient les frais sous la cible", () => {
    // 2,50 € fixes, cible 1 %, taxe 0,12 % → marge 0,88 % → 284 € → arrondi 290
    expect(ticketMinimum(2.5, 1, 0.12, 0)).toBe(290);
  });

  it("monte le ticket quand les frais fixes montent", () => {
    expect(ticketMinimum(7.5, 1, 0.12, 0)).toBeGreaterThan(ticketMinimum(2.5, 1, 0.12, 0)!);
  });

  /**
   * Le cas qu'il ne faut surtout pas arrondir sous le tapis : quand la taxe et
   * le change atteignent deja la cible, aucun montant ne la respecte. Renvoyer
   * un nombre gigantesque laisserait croire qu'un ticket suffisamment gros
   * reglerait un probleme qui est proportionnel.
   */
  it("refuse de répondre quand la cible est déjà dépassée par les frais proportionnels", () => {
    expect(ticketMinimum(2.5, 1, 0.8, 0.25)).toBeNull();
    expect(ticketMinimum(2.5, 0.3, 0.12, 0.25)).toBeNull();
  });

  it("n'exige aucun minimum sans frais fixes", () => {
    expect(ticketMinimum(0, 1, 0.12, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------

describe("ordre des priorités", () => {
  it("place la dette avant la précaution, et la précaution avant l'investissement", () => {
    const p = construirePlan(ctx(COMPLET));
    const ordre = p.etapes.map((e) => e.cle);
    expect(ordre.indexOf("dette")).toBeLessThan(ordre.indexOf("precaution"));
    expect(ordre.indexOf("precaution")).toBeLessThan(ordre.indexOf("capacite"));
    expect(ordre.indexOf("capacite")).toBeLessThan(ordre.indexOf("ticket"));
  });

  it("compare la dette à une certitude, jamais à un rendement espéré", () => {
    const p = construirePlan(
      ctx(avec(COMPLET, f("credit.capital_restant_eur", 12000), f("credit.taux_annuel_pct", 7))),
    );
    const e = etape(p, "dette");
    expect(e.statut).toBe("en_cours");
    expect(e.resume).toMatch(/avec certitude/);
    // Rien ne doit laisser entendre un rendement de marche attendu.
    for (const mot of ["rapporterait", "en moyenne", "historiquement", "devrait"]) {
      expect(e.resume).not.toContain(mot);
    }
  });

  it("chiffre les intérêts évités plutôt que de conseiller en creux", () => {
    const p = construirePlan(
      ctx(avec(COMPLET, f("credit.capital_restant_eur", 10000), f("credit.taux_annuel_pct", 5))),
    );
    expect(etape(p, "dette").calcul).toContainEqual({
      gauche: "Intérêts évités sur un an",
      droite: "500 €",
    });
  });
});

// ---------------------------------------------------------------------------

describe("épargne de précaution", () => {
  it("bloque l'investissement tant qu'elle n'est pas constituée", () => {
    const p = construirePlan(
      ctx(avec(COMPLET, f("profil.epargne_precaution_eur", 1000))),
    );
    expect(etape(p, "precaution").statut).toBe("en_cours");
    expect(p.investissableMensuel).toBe(0);
    expect(etape(p, "capacite").statut).toBe("a_venir");
  });

  it("annonce dans combien de mois l'investissement devient possible", () => {
    // Cible 1800 × 4 = 7200, déjà 1200 → manque 6000. Marge 800/mois → 8 mois.
    const p = construirePlan(
      ctx(avec(COMPLET, f("profil.epargne_precaution_eur", 1200))),
    );
    expect(etape(p, "capacite").resume).toMatch(/environ 8 mois/);
  });

  it("débloque l'investissement une fois la cible atteinte", () => {
    const p = construirePlan(ctx(COMPLET));
    expect(etape(p, "precaution").statut).toBe("fait");
    expect(p.investissableMensuel).toBe(800);
  });

  it("respecte une cible personnalisée en mois", () => {
    const strict = construirePlan(ctx(avec(COMPLET, f("profil.mois_precaution", 6))));
    expect(etape(strict, "precaution").statut).toBe("en_cours"); // 1800 × 6 = 10 800 > 8 000
    expect(MOIS_PRECAUTION_DEFAUT).toBe(4);
  });
});

// ---------------------------------------------------------------------------

describe("montant investissable", () => {
  it("arrondit vers le bas, jamais vers le haut", () => {
    const p = construirePlan(
      ctx(avec(COMPLET, f("profil.revenus_mensuels_eur", 2637))),
    );
    // 2637 − 1800 = 837 → 830, pas 840 : on ne promet pas un effort non vérifié.
    expect(p.investissableMensuel).toBe(830);
  });

  it("ne propose rien quand les charges absorbent les revenus", () => {
    const p = construirePlan(
      ctx(avec(COMPLET, f("profil.charges_mensuelles_eur", 2600))),
    );
    expect(p.investissableMensuel).toBe(0);
    expect(etape(p, "capacite").resume).toMatch(/atteignent vos revenus/);
  });
});

// ---------------------------------------------------------------------------

describe("rythme des ordres", () => {
  it("garde un ordre mensuel quand le montant dépasse le ticket", () => {
    const p = construirePlan(ctx(COMPLET)); // 800 €/mois, ticket 290 €
    expect(p.moisParOrdre).toBe(1);
  });

  /** Le conseil qui fait une vraie différence sur un petit montant. */
  it("espace les ordres quand le montant mensuel est trop petit", () => {
    const p = construirePlan(
      ctx(avec(COMPLET, f("profil.revenus_mensuels_eur", 1900))),
    );
    expect(p.investissableMensuel).toBe(100);
    expect(p.moisParOrdre).toBe(3); // ticket 290 / 100 → 3 mois
    expect(etape(p, "rythme").resume).toMatch(/300 €/);
  });

  it("montre la baisse de frais obtenue en espaçant", () => {
    const p = construirePlan(
      ctx(avec(COMPLET, f("profil.revenus_mensuels_eur", 1900))),
    );
    // 2,50 € sur 300 € = 0,83 %, contre 2,50 % si l'ordre était passé chaque mois.
    expect(etape(p, "rythme").resume).toMatch(/0,83|0\.83/);
  });
});

// ---------------------------------------------------------------------------

describe("mise en forme des chiffres", () => {
  it("garde les centimes sur les frais de courtier", () => {
    // 2,50 € affiches « 3 € » fausseraient tout ce qui en decoule, dans un
    // outil dont le sujet est precisement le cout d'un ordre.
    const p = construirePlan(ctx(COMPLET));
    expect(etape(p, "ticket").calcul).toContainEqual({
      gauche: "Frais fixes par ordre",
      droite: "2,50 €",
    });
  });

  it("écrit les décimales à la française", () => {
    const p = construirePlan(ctx(COMPLET));
    const texte = JSON.stringify(p);
    // Un « 0.99 % » dans un texte francais se lit comme une faute ou comme un
    // chiffre anglais ; sur de l'argent, les deux entament la confiance.
    expect(texte).not.toMatch(/\d\.\d+ ?%/);
    expect(texte).not.toMatch(/\d\.\d+ mois/);
  });
});

describe("commission de change", () => {
  const AVEC_CHANGE = [
    ...COMPLET.filter((x) => x.key !== "courtier.change_pct"),
    f("courtier.change_pct", 0.25),
  ];

  /**
   * Le defaut de modele a ne pas laisser passer : la commission de change ne se
   * paie QUE hors zone euro. L'inclure toujours gonfle le ticket minimum de
   * quelqu'un qui achete un fonds cote en euros — le cas le plus courant ici —
   * et lui fait attendre pour rien.
   */
  it("ne gonfle pas le ticket d'un achat en euros", () => {
    const sans = construirePlan(ctx(COMPLET));
    const avec = construirePlan(ctx(AVEC_CHANGE));
    expect(avec.ticketMinimum).toBe(sans.ticketMinimum);
  });

  it("chiffre le cas hors zone euro séparément, au lieu de le fondre", () => {
    const p = construirePlan(ctx(AVEC_CHANGE));
    const e = etape(p, "ticket");
    expect(e.resume).toMatch(/hors zone euro/i);
    expect(e.calcul.some((l) => /hors zone euro/i.test(l.gauche))).toBe(true);
  });

  it("ne mentionne pas le change quand le courtier n'en prend pas", () => {
    const e = etape(construirePlan(ctx(COMPLET)), "ticket");
    expect(e.resume).not.toMatch(/change/i);
  });
});

describe("données manquantes", () => {
  it("ne produit aucun montant sur un contexte vide", () => {
    const p = construirePlan(ctx([]));
    expect(p.investissableMensuel).toBeNull();
    expect(p.ticketMinimum).toBeNull();
    expect(p.exploitable).toBe(false);
    expect(p.manque.length).toBeGreaterThan(0);
  });

  it("nomme précisément ce qui manque", () => {
    const p = construirePlan(ctx([f("profil.revenus_mensuels_eur", 2600)]));
    expect(p.manque.join(" ")).toMatch(/charges mensuelles/);
    expect(p.manque.join(" ")).toMatch(/épargne disponible/);
    expect(p.manque.join(" ")).toMatch(/frais fixes/);
  });

  it("marque « inconnu » plutôt que de supposer", () => {
    const p = construirePlan(ctx([]));
    for (const e of p.etapes) {
      if (e.statut === "inconnu") expect(e.calcul).toHaveLength(0);
    }
  });

  it("traite une valeur du mauvais type comme absente", () => {
    const p = construirePlan(ctx([f("profil.revenus_mensuels_eur", "2600")]));
    expect(p.manque.join(" ")).toMatch(/revenus mensuels/);
  });
});

// ---------------------------------------------------------------------------

describe("propriétés valables pour tout le plan", () => {
  const p = construirePlan(ctx(COMPLET));

  it("est déterministe", () => {
    expect(JSON.stringify(construirePlan(ctx(COMPLET)))).toBe(JSON.stringify(p));
  });

  it("ne nomme jamais un titre, un secteur ni un support", () => {
    // La ligne qui ne bouge pas : des montants, jamais des titres.
    const texte = JSON.stringify(p).toLowerCase();
    for (const mot of ["action ", "etf", "iwda", "acheter des", "nasdaq", "s&p"]) {
      expect(texte).not.toContain(mot);
    }
  });

  it("ne promet aucun rendement", () => {
    const texte = JSON.stringify(p).toLowerCase();
    for (const mot of ["rendement attendu", "vous gagnerez", "performance de", "% par an sur"]) {
      expect(texte).not.toContain(mot);
    }
  });

  it("accompagne chaque étape chiffrée de son calcul", () => {
    for (const e of p.etapes) {
      if (e.statut === "fait" || e.statut === "en_cours") {
        expect(e.calcul.length, e.cle).toBeGreaterThan(0);
        expect(e.resume.length, e.cle).toBeGreaterThan(30);
      }
    }
  });

  it("garde la cible de frais par défaut à un pour cent", () => {
    // Le seuil d'alerte de l'application est a 3 % : c'est un seuil de danger,
    // pas une cible. Viser 3 % reviendrait a accepter de perdre a chaque achat.
    expect(FRAIS_CIBLE_PCT_DEFAUT).toBe(1);
  });
});

// ---------------------------------------------------------------------------

describe("la prochaine marche", () => {
  /**
   * L'ordre d'affichage suit la priorite patrimoniale — la dette d'abord. Mais
   * pointer quelqu'un vers le taux de son credit en premier serait absurde :
   * ce champ est facultatif, beaucoup n'ont aucun credit, et tant que les
   * revenus manquent le plan ne peut rien dire.
   */
  it("oriente vers ce qui débloque le plus, pas vers le premier affiché", () => {
    const p = construirePlan(ctx([]));
    expect(p.etapes[0].cle).toBe("dette");
    expect(p.prochaineEtape).toBe("capacite");
  });

  it("préfère une action à mener à un champ à remplir", () => {
    const p = construirePlan(
      ctx(avec(COMPLET, f("profil.epargne_precaution_eur", 500))),
    );
    expect(p.prochaineEtape).toBe("precaution");
  });

  it("ne réclame plus rien quand tout est en place", () => {
    expect(construirePlan(ctx(COMPLET)).prochaineEtape).toBeNull();
  });

  it("demande l'épargne une fois revenus et charges connus", () => {
    const p = construirePlan(
      ctx([f("profil.revenus_mensuels_eur", 2600), f("profil.charges_mensuelles_eur", 1800)]),
    );
    expect(p.prochaineEtape).toBe("precaution");
  });
});
