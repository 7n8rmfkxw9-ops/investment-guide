import { describe, expect, it } from "vitest";
import { DOMAINES, FAITS, SIGNAUX, definitionFait } from "./faits";
import {
  CLES_FAITS,
  DOMAINES_SIGNAUX,
} from "../../supabase/functions/_shared/regles/assurances";

/**
 * Le catalogue de saisie et les regles doivent parler des memes cles.
 *
 * Le mode de defaillance qu'on evite ici est silencieux : une cle presente
 * dans une regle mais absente du catalogue donne une regle qui ne se declenche
 * jamais, parce que personne ne peut saisir ce qu'elle lit. Rien ne planterait,
 * rien ne s'afficherait, et quelqu'un croirait sa couverture surveillee.
 */

describe("catalogue et règles", () => {
  it("propose à la saisie chaque fait que les règles lisent", () => {
    for (const cle of CLES_FAITS) {
      expect(definitionFait(cle), `« ${cle} » lue par une règle, absente du catalogue`).toBeDefined();
    }
  });

  it("ne propose aucun fait qu'aucune règle ne lit", () => {
    // Le sens inverse : un champ que l'utilisateur remplit sans que rien ne
    // s'en serve est du travail demande pour rien.
    for (const f of FAITS) {
      expect(
        (CLES_FAITS as readonly string[]).includes(f.cle),
        `« ${f.cle} » proposée à la saisie, lue par aucune règle`,
      ).toBe(true);
    }
  });

  it("couvre chaque domaine de signal lu par une règle", () => {
    for (const d of DOMAINES_SIGNAUX) {
      const s = SIGNAUX.find((x) => x.domaine === d.domaine);
      expect(s, `domaine de signal « ${d.domaine} » sans formulaire`).toBeDefined();
      for (const cle of d.cles) {
        expect(
          s!.champs.some((c) => c.cle === cle),
          `champ « ${cle} » du domaine ${d.domaine} absent du formulaire`,
        ).toBe(true);
      }
    }
  });
});

describe("qualité du catalogue", () => {
  it("rattache chaque fait à un domaine décrit", () => {
    for (const f of FAITS) expect(DOMAINES[f.domaine], f.cle).toBeDefined();
  });

  it("explique à quoi sert chaque champ", () => {
    // Un formulaire qui demande un montant sans dire pourquoi obtient soit un
    // champ vide, soit un chiffre approximatif — les deux sont pires que rien.
    for (const f of FAITS) expect(f.aQuoi.length, f.cle).toBeGreaterThan(30);
  });

  it("donne une cadence de reconfirmation aux faits qui périment", () => {
    // Un montant assuré ou un capital restant du vieillit ; un nom de contrat
    // non. La distinction doit etre portee par le catalogue, pas devinee.
    const perissables = FAITS.filter((f) => f.type === "euros" && !f.facultatif);
    expect(perissables.length).toBeGreaterThan(0);
    for (const f of perissables) expect(f.cadenceMois, f.cle).not.toBeNull();
  });

  it("n'a aucune clé en double", () => {
    expect(new Set(FAITS.map((f) => f.cle)).size).toBe(FAITS.length);
  });

  it("donne un exemple d'adresse à chaque type de signal", () => {
    for (const s of SIGNAUX) expect(s.exempleUrl).toMatch(/^https:\/\//);
  });
});
