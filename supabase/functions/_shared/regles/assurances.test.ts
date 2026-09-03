import { describe, expect, it } from "vitest";
import {
  PART_TRAVAUX_DEFAUT,
  POSTES_MUTUALITE,
  evaluerAssurances,
  r1SousAssurance,
  r2RevueMutualite,
  r3SoldeRestantDu,
  r4EcheancePreavis,
} from "./assurances.ts";
import type { Contexte, Fait, Signal } from "./types.ts";

/**
 * Ces regles decident de ce que l'utilisateur croit devoir verifier sur ses
 * contrats. Une regle qui se declenche a tort le fait courir apres rien ; une
 * regle qui se tait a tort lui coute une couverture. Les deux sens sont donc
 * testes a chaque fois.
 */

const MAINTENANT = new Date("2026-09-03T12:00:00Z");

function f(key: string, value: unknown, extra: Partial<Fait> = {}): Fait {
  return {
    key,
    value,
    domain: "assurances",
    verifiedAt: "2026-08-01T00:00:00Z",
    ...extra,
  };
}

function s(domain: string, payload: Record<string, unknown>, extra: Partial<Signal> = {}): Signal {
  return {
    id: Math.random().toString(36).slice(2),
    sourceUrl: "https://exemple.be/bareme",
    observedAt: "2026-08-15T00:00:00Z",
    summary: "résumé",
    domain,
    payload,
    ...extra,
  };
}

function ctx(faits: Fait[] = [], signaux: Signal[] = []): Contexte {
  return { maintenant: MAINTENANT, faits, signaux };
}

// ---------------------------------------------------------------------------

describe("R1 — sous-assurance après travaux", () => {
  it("ne conclut pas quand la valeur assurée manque, et le dit", () => {
    const [p] = r1SousAssurance(ctx([f("habitation.travaux_cumules_eur", 30_000)]));
    expect(p.donneesManquantes).toHaveLength(1);
    expect(p.donneesManquantes[0]).toMatch(/montant assuré/);
    expect(p.rationaleMd).toMatch(/Aucune estimation n'a été substituée/);
  });

  it("ne se déclenche pas sous le seuil", () => {
    const c = ctx([
      f("habitation.valeur_assuree_eur", 200_000),
      f("habitation.travaux_cumules_eur", 5_000),
    ]);
    expect(r1SousAssurance(c)).toHaveLength(0);
  });

  it("se déclenche au-delà du seuil, et rappelle la règle proportionnelle", () => {
    const c = ctx([
      f("habitation.valeur_assuree_eur", 200_000),
      f("habitation.travaux_cumules_eur", 25_000),
      f("habitation.valeur_revisee_le", "2024-03-03T00:00:00Z"),
    ]);
    const [p] = r1SousAssurance(c);
    expect(p.severite).toBe("attention");
    expect(p.rationaleMd).toMatch(/règle proportionnelle/);
    expect(p.payload.partPct).toBeCloseTo(12.5, 1);
    expect(p.donneesManquantes).toHaveLength(0);
  });

  /**
   * Le seuil est une proportion de la valeur declaree par l'utilisateur, pas un
   * montant venu d'ailleurs : 25 000 € de travaux alertent sur un bien a
   * 200 000 € et pas sur un bien a 400 000 €.
   */
  it("le seuil suit la valeur du bien, pas un montant absolu", () => {
    const travaux = f("habitation.travaux_cumules_eur", 25_000);
    expect(r1SousAssurance(ctx([f("habitation.valeur_assuree_eur", 200_000), travaux]))).toHaveLength(1);
    expect(r1SousAssurance(ctx([f("habitation.valeur_assuree_eur", 400_000), travaux]))).toHaveLength(0);
  });

  it("respecte un seuil personnalisé", () => {
    const c = ctx([
      f("habitation.valeur_assuree_eur", 200_000),
      f("habitation.travaux_cumules_eur", 5_000),
      f("habitation.seuil_travaux_pct", 0.02),
    ]);
    expect(r1SousAssurance(c)).toHaveLength(1);
    expect(PART_TRAVAUX_DEFAUT).toBe(0.1);
  });

  it("traite une valeur du mauvais type comme absente plutôt que de calculer dessus", () => {
    const c = ctx([
      f("habitation.valeur_assuree_eur", "200000"),
      f("habitation.travaux_cumules_eur", 25_000),
    ]);
    const [p] = r1SousAssurance(c);
    expect(p.donneesManquantes[0]).toMatch(/montant assuré/);
  });

  it("ne propose aucune action automatique", () => {
    const c = ctx([
      f("habitation.valeur_assuree_eur", 200_000),
      f("habitation.travaux_cumules_eur", 25_000),
    ]);
    const [p] = r1SousAssurance(c);
    expect(p.rationaleMd).toMatch(/Ouvrez-le, ou demandez à votre assureur/);
    expect(p).not.toHaveProperty("action");
  });
});

// ---------------------------------------------------------------------------

describe("R2 — revue annuelle de mutualité", () => {
  const bareme = (caisse: string, montants: Record<string, number>, url: string) =>
    s("mutualite", { caisse, ...montants }, { sourceUrl: url });

  it("ne se déclenche pas avant douze mois", () => {
    const c = ctx([f("mutualite.derniere_revue_le", "2026-05-01T00:00:00Z")]);
    expect(r2RevueMutualite(c)).toHaveLength(0);
  });

  it("se déclenche au-delà de douze mois", () => {
    const c = ctx([f("mutualite.derniere_revue_le", "2025-05-01T00:00:00Z")]);
    expect(r2RevueMutualite(c)).toHaveLength(1);
  });

  it("sans aucun barème, annonce le manque au lieu de comparer", () => {
    const [p] = r2RevueMutualite(ctx());
    expect(p.donneesManquantes.length).toBeGreaterThan(0);
    expect(p.rationaleMd).toMatch(/aucun barème de caisse n'est enregistré/);
    expect(p.sourceUrls).toHaveLength(0);
  });

  /** Le point non negociable : aucun montant ne sort de nulle part. */
  it("n'affiche que des montants venus des signaux, et cite leur source", () => {
    const c = ctx(
      [],
      [
        bareme("Caisse A", { orthodontie: 500, sport: 40 }, "https://a.be/avantages"),
        bareme("Caisse B", { orthodontie: 300, sport: 60 }, "https://b.be/avantages"),
      ],
    );
    const [p] = r2RevueMutualite(c);
    expect(p.rationaleMd).toMatch(/500 €/);
    expect(p.rationaleMd).toMatch(/https:\/\/a\.be\/avantages/);
    expect(p.sourceUrls).toEqual(
      expect.arrayContaining(["https://a.be/avantages", "https://b.be/avantages"]),
    );
    // Les postes non documentes sont ecrits comme tels, jamais completes.
    expect(p.rationaleMd).toMatch(/non documenté/);
    expect(p.donneesManquantes.join(" ")).toMatch(/Psychomotricité/);
  });

  it("refuse de classer des caisses qui ne documentent pas les mêmes postes", () => {
    const c = ctx(
      [],
      [
        bareme("Caisse A", { orthodontie: 500 }, "https://a.be/x"),
        bareme("Caisse B", { orthodontie: 300, sport: 900 }, "https://b.be/x"),
      ],
    );
    const [p] = r2RevueMutualite(c);
    expect(p.payload.comparable).toBe(false);
    expect(p.rationaleMd).toMatch(/ne sont pas comparables/);
    expect(p.rationaleMd).not.toMatch(/le cumul le plus élevé/);
  });

  it("classe quand les postes documentés sont les mêmes", () => {
    const c = ctx(
      [],
      [
        bareme("Caisse A", { orthodontie: 500, sport: 40 }, "https://a.be/x"),
        bareme("Caisse B", { orthodontie: 300, sport: 60 }, "https://b.be/x"),
      ],
    );
    const [p] = r2RevueMutualite(c);
    expect(p.payload.comparable).toBe(true);
    expect(p.rationaleMd).toMatch(/\*\*Caisse A\*\*/);
  });

  it("garde le relevé le plus récent quand une caisse apparaît deux fois", () => {
    const c = ctx(
      [],
      [
        bareme("Caisse A", { orthodontie: 100 }, "https://a.be/vieux"),
        { ...bareme("Caisse A", { orthodontie: 700 }, "https://a.be/neuf"), observedAt: "2026-08-30T00:00:00Z" },
      ],
    );
    const [p] = r2RevueMutualite(c);
    expect(p.rationaleMd).toMatch(/700 €/);
    expect(p.rationaleMd).not.toMatch(/100 €/);
  });

  it("présente les montants comme des plafonds, pas comme des sommes acquises", () => {
    const c = ctx([], [bareme("Caisse A", { orthodontie: 500 }, "https://a.be/x")]);
    const [p] = r2RevueMutualite(c);
    expect(p.rationaleMd).toMatch(/plafonds d'intervention, pas des sommes acquises/);
  });

  it("couvre les quatre postes du foyer", () => {
    expect(POSTES_MUTUALITE.map((p) => p.cle)).toEqual([
      "orthodontie",
      "psychomotricite",
      "sport",
      "sejours_enfants",
    ]);
  });
});

// ---------------------------------------------------------------------------

describe("R3 — assurance solde restant dû", () => {
  const evt = (evenement: string, payload: Record<string, unknown> = {}) =>
    s("credit", { evenement, ...payload }, { sourceUrl: "https://banque.be/credit/42" });

  it("ne se déclenche pas sans événement de crédit", () => {
    expect(r3SoldeRestantDu(ctx([f("credit.srd_couverture_eur", 100_000)]))).toHaveLength(0);
  });

  it("ne se déclenche pas sur un événement d'un autre type", () => {
    const c = ctx([], [s("credit", { evenement: "mensualite" })]);
    expect(r3SoldeRestantDu(c)).toHaveLength(0);
  });

  it("signale la sous-couverture comme urgente", () => {
    const c = ctx(
      [f("credit.srd_couverture_eur", 80_000)],
      [evt("modification", { capital_restant_eur: 100_000 })],
    );
    const [p] = r3SoldeRestantDu(c);
    expect(p.severite).toBe("urgent");
    expect(p.payload.sens).toBe("sous_couverture");
    expect(p.payload.ecartEur).toBe(-20_000);
    expect(p.sourceUrls).toEqual(["https://banque.be/credit/42"]);
  });

  it("signale la sur-couverture, mais sans urgence", () => {
    const c = ctx(
      [f("credit.srd_couverture_eur", 120_000)],
      [evt("fin", { capital_restant_eur: 100_000 })],
    );
    const [p] = r3SoldeRestantDu(c);
    expect(p.severite).toBe("info");
    expect(p.payload.sens).toBe("sur_couverture");
    expect(p.rationaleMd).toMatch(/prime sur un capital que vous ne devez plus/);
  });

  it("se tait quand couverture et capital coïncident", () => {
    const c = ctx(
      [f("credit.srd_couverture_eur", 100_000)],
      [evt("fin", { capital_restant_eur: 100_000 })],
    );
    expect(r3SoldeRestantDu(c)).toHaveLength(0);
  });

  it("préfère le capital du signal à celui du fait, plus ancien", () => {
    const c = ctx(
      [f("credit.capital_restant_eur", 150_000), f("credit.srd_couverture_eur", 100_000)],
      [evt("modification", { capital_restant_eur: 100_000 })],
    );
    expect(r3SoldeRestantDu(c)).toHaveLength(0);
  });

  it("sans montants, annonce le manque et garde la source de l'événement", () => {
    const [p] = r3SoldeRestantDu(ctx([], [evt("fin")]));
    expect(p.donneesManquantes).toHaveLength(2);
    expect(p.sourceUrls).toEqual(["https://banque.be/credit/42"]);
  });

  /**
   * La contrainte de base l'exige aussi, mais une regle declenchee par un
   * evenement ne doit pas pouvoir produire un brouillon sans source : la
   * verification ne doit pas reposer sur la seule base.
   */
  it("porte toujours une source, y compris en cas de données manquantes", () => {
    for (const p of [
      ...r3SoldeRestantDu(ctx([], [evt("fin")])),
      ...r3SoldeRestantDu(
        ctx([f("credit.srd_couverture_eur", 1)], [evt("fin", { capital_restant_eur: 2 })]),
      ),
    ]) {
      expect(p.sourceUrls.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ---------------------------------------------------------------------------

describe("R4 — échéance et préavis", () => {
  const preavis = (jours: number) =>
    s("assurance_preavis", { preavis_jours: jours }, { sourceUrl: "https://autorite.be/preavis" });

  /** Le comportement central de cette regle : se taire plutot que deduire. */
  it("ne se déclenche pas sans délai de préavis sourcé", () => {
    const c = ctx([f("assurance.echeance_le", "2026-10-01T00:00:00Z")]);
    expect(r4EcheancePreavis(c)).toHaveLength(0);
  });

  it("ne se déclenche pas si le signal existe mais ne porte pas le délai", () => {
    const c = ctx(
      [f("assurance.echeance_le", "2026-10-01T00:00:00Z")],
      [s("assurance_preavis", { commentaire: "voir la page" })],
    );
    expect(r4EcheancePreavis(c)).toHaveLength(0);
  });

  it("ne se déclenche pas sans date d'échéance", () => {
    expect(r4EcheancePreavis(ctx([], [preavis(90)]))).toHaveLength(0);
  });

  it("calcule la date limite à partir du délai sourcé, et le cite", () => {
    // Échéance au 15/01/2027, préavis 90 j → date limite au 17/10/2026,
    // soit 43 jours après le « maintenant » de ces tests.
    const c = ctx([f("assurance.echeance_le", "2027-01-15T00:00:00Z")], [preavis(90)]);
    const [p] = r4EcheancePreavis(c);
    expect(p.payload.dateLimite).toBe("2026-10-17");
    expect(p.payload.joursAvantLimite).toBe(43);
    expect(p.payload.preavisJours).toBe(90);
    expect(p.severite).toBe("attention");
    expect(p.sourceUrls).toEqual(["https://autorite.be/preavis"]);
    expect(p.rationaleMd).toMatch(/jamais déduite/);
  });

  it("un délai différent donne une date différente : rien n'est codé en dur", () => {
    const a = r4EcheancePreavis(
      ctx([f("assurance.echeance_le", "2027-01-15T00:00:00Z")], [preavis(90)]),
    )[0];
    const b = r4EcheancePreavis(
      ctx([f("assurance.echeance_le", "2026-10-15T00:00:00Z")], [preavis(30)]),
    )[0];
    expect(a.payload.dateLimite).toBe("2026-10-17");
    expect(b.payload.dateLimite).toBe("2026-09-15");
  });

  it("se tait tant que la fenêtre n'est pas ouverte", () => {
    const c = ctx([f("assurance.echeance_le", "2027-06-01T00:00:00Z")], [preavis(30)]);
    expect(r4EcheancePreavis(c)).toHaveLength(0);
  });

  it("se tait une fois la date limite passée", () => {
    const c = ctx([f("assurance.echeance_le", "2026-09-10T00:00:00Z")], [preavis(90)]);
    expect(r4EcheancePreavis(c)).toHaveLength(0);
  });

  it("devient urgente dans les quinze derniers jours", () => {
    // Échéance au 15/12/2026, préavis 90 j → date limite au 16/09/2026, à 12 jours.
    const c = ctx([f("assurance.echeance_le", "2026-12-15T00:00:00Z")], [preavis(90)]);
    const [p] = r4EcheancePreavis(c);
    expect(p.payload.joursAvantLimite).toBe(12);
    expect(p.severite).toBe("urgent");
  });

  it("avertit quand la date d'échéance n'a pas été reconfirmée depuis longtemps", () => {
    const c = ctx(
      [f("assurance.echeance_le", "2027-01-15T00:00:00Z", { verifiedAt: "2024-01-01T00:00:00Z" })],
      [preavis(90)],
    );
    const [p] = r4EcheancePreavis(c);
    expect(p.rationaleMd).toMatch(/n'a pas été reconfirmée depuis/);
  });

  it("ne résilie rien et le dit", () => {
    const c = ctx([f("assurance.echeance_le", "2027-01-15T00:00:00Z")], [preavis(90)]);
    const [p] = r4EcheancePreavis(c);
    expect(p.rationaleMd).toMatch(/ne résilie rien et n'envoie rien/);
  });
});

// ---------------------------------------------------------------------------

describe("propriétés valables pour toutes les règles", () => {
  const complet = ctx(
    [
      f("habitation.valeur_assuree_eur", 200_000),
      f("habitation.travaux_cumules_eur", 25_000),
      f("credit.srd_couverture_eur", 80_000),
      f("assurance.echeance_le", "2027-01-15T00:00:00Z"),
      f("mutualite.caisse_actuelle", "Caisse A"),
    ],
    [
      s("mutualite", { caisse: "Caisse A", orthodontie: 500 }, { sourceUrl: "https://a.be/x" }),
      s("credit", { evenement: "fin", capital_restant_eur: 100_000 }, { sourceUrl: "https://b.be/c" }),
      s("assurance_preavis", { preavis_jours: 90 }, { sourceUrl: "https://c.be/p" }),
    ],
  );

  it("produit un raisonnement non vide pour chaque proposition", () => {
    for (const p of evaluerAssurances(complet)) {
      expect(p.rationaleMd.trim().length).toBeGreaterThan(80);
      expect(p.titre.trim().length).toBeGreaterThan(0);
    }
  });

  it("est déterministe : deux évaluations donnent le même résultat", () => {
    expect(JSON.stringify(evaluerAssurances(complet))).toBe(
      JSON.stringify(evaluerAssurances(complet)),
    );
  });

  it("ne dépend jamais de l'horloge du système", () => {
    const plusTard = { ...complet, maintenant: new Date("2027-09-03T12:00:00Z") };
    expect(JSON.stringify(evaluerAssurances(complet))).not.toBe(
      JSON.stringify(evaluerAssurances(plusTard)),
    );
  });

  it("laisse expliquePar nul faute de chapitre traitant de ces mécanismes", () => {
    // Le cours porte sur l'investissement : aucun de ses chapitres n'explique
    // la regle proportionnelle ni le solde restant du. Y accrocher un chapitre
    // d'investissement fabriquerait une justification credible et fausse.
    for (const p of evaluerAssurances(complet)) {
      expect(p.expliquePar ?? null).toBeNull();
    }
  });

  it("n'expose aucun champ d'action exécutable", () => {
    for (const p of evaluerAssurances(complet)) {
      for (const interdit of ["action", "execute", "url_action", "endpoint", "commande"]) {
        expect(p).not.toHaveProperty(interdit);
        expect(p.payload).not.toHaveProperty(interdit);
      }
    }
  });
});
