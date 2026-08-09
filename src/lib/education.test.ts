import { describe, expect, it } from "vitest";
import {
  LECTURES,
  lecturesDuTheme,
  parcoursEssentiel,
  SOURCES,
  THEMES,
} from "./education";

describe("intégrité de la bibliothèque", () => {
  it("ne référence aucun lien en double", () => {
    // Deux entrees pointant la meme page donneraient l'illusion d'une
    // bibliotheque plus fournie qu'elle ne l'est.
    const liens = LECTURES.map((l) => l.lien);
    expect(new Set(liens).size).toBe(liens.length);
  });

  it("n'utilise que des liens https absolus", () => {
    for (const l of LECTURES) {
      expect(l.lien.startsWith("https://"), l.titre).toBe(true);
    }
  });

  it("rattache chaque lecture à un thème déclaré", () => {
    const connus = new Set(THEMES.map((t) => t.cle));
    for (const l of LECTURES) {
      expect(connus.has(l.theme), `${l.titre} → ${l.theme}`).toBe(true);
    }
  });

  it("rattache chaque lecture à une source déclarée", () => {
    for (const l of LECTURES) {
      expect(SOURCES[l.source], l.titre).toBeDefined();
    }
  });

  it("fait pointer chaque lecture vers le domaine de sa source", () => {
    // Le garde-fou qui compte : une entree Wikifin qui pointerait ailleurs
    // afficherait le mauvais drapeau et la mauvaise mise en garde fiscale.
    for (const l of LECTURES) {
      const domaine = new URL(SOURCES[l.source].accueil).hostname;
      expect(new URL(l.lien).hostname, l.titre).toBe(domaine);
    }
  });

  it("explique chaque lecture par une phrase non vide", () => {
    for (const l of LECTURES) {
      expect(l.pourquoi.trim().length, l.titre).toBeGreaterThan(10);
    }
  });

  it("ne laisse aucun thème vide", () => {
    // Un thème sans lecture s'afficherait comme une section vide.
    for (const t of THEMES) {
      expect(lecturesDuTheme(t.cle).length, t.libelle).toBeGreaterThan(0);
    }
  });

  it("couvre au moins les trois quarts des lectures avec la source belge", () => {
    // L'outil s'adresse a un investisseur belge : le cadre fiscal et le
    // regulateur cites doivent rester majoritairement les siens.
    const belges = LECTURES.filter((l) => !SOURCES[l.source].horsBelgique);
    expect(belges.length / LECTURES.length).toBeGreaterThanOrEqual(0.75);
  });

  it("signale les sources dont le cadre fiscal n'est pas le cadre belge", () => {
    expect(SOURCES.lfpt.horsBelgique).toBe(true);
    expect(SOURCES.wikifin.horsBelgique).toBeUndefined();
  });
});

describe("parcoursEssentiel", () => {
  it("reste court assez pour être lu", () => {
    // Une bibliotheque de trente entrees decourage : le parcours doit tenir.
    const p = parcoursEssentiel();
    expect(p.length).toBeGreaterThanOrEqual(8);
    expect(p.length).toBeLessThanOrEqual(16);
  });

  it("ne contient que des lectures marquées essentielles", () => {
    expect(parcoursEssentiel().every((l) => l.essentiel)).toBe(true);
  });

  it("suit l'ordre des thèmes plutôt que l'ordre de déclaration", () => {
    const rang = new Map(THEMES.map((t, i) => [t.cle, i]));
    const rangs = parcoursEssentiel().map((l) => rang.get(l.theme)!);
    expect([...rangs]).toEqual([...rangs].sort((a, b) => a - b));
  });

  it("fait passer la protection contre la fraude avant le choix des produits", () => {
    // Choix delibere : une arnaque coute plus cher que n'importe quelle
    // erreur de selection de produit.
    const p = parcoursEssentiel();
    const fraude = p.findIndex((l) => l.theme === "proteger");
    const produits = p.findIndex((l) => l.theme === "produits");
    expect(fraude).toBeGreaterThanOrEqual(0);
    expect(produits).toBeGreaterThanOrEqual(0);
    expect(fraude).toBeLessThan(produits);
  });

  it("commence par la distinction épargner / investir", () => {
    expect(parcoursEssentiel()[0].titre).toMatch(/épargner et investir/i);
  });
});

describe("lecturesDuTheme", () => {
  it("ne renvoie que le thème demandé", () => {
    expect(lecturesDuTheme("produits").every((l) => l.theme === "produits")).toBe(true);
  });

  it("renvoie une liste vide pour un thème sans lecture", () => {
    // @ts-expect-error thème volontairement inexistant
    expect(lecturesDuTheme("inexistant")).toEqual([]);
  });

  it("expose bien la fiche des trackers, produit central de l'outil", () => {
    const t = lecturesDuTheme("produits").find((l) => l.titre === "Tracker");
    expect(t).toBeDefined();
    expect(t!.essentiel).toBe(true);
  });
});
