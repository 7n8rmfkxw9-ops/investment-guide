import { describe, expect, it } from "vitest";
import { CHAPITRES, construireDiapos } from "./cours";
import { ETUDES } from "./etudes";
import { FIGURES } from "../components/Figures";
import { lignesDuChapitre, lignesDuProgramme } from "./projection";
import { versFormeBloc } from "./contenu";

/**
 * Le contenu quitte le fichier TypeScript pour la base. Ce test est la seule
 * chose qui garantit que le lecteur retrouvera exactement ses chapitres, et pas
 * une version silencieusement abimee : il fait l'aller-retour complet et exige
 * l'egalite stricte.
 *
 * Sans lui, la migration serait une transformation de 196 ecrans verifiee a
 * l'oeil sur trois captures.
 */

describe("aller-retour diapositives → lignes → diapositives", () => {
  it("restitue chaque écran à l'identique", () => {
    for (const c of CHAPITRES) {
      const attendu = construireDiapos(c);
      const lignes = lignesDuChapitre(c);
      expect(lignes).toHaveLength(attendu.length);

      lignes.forEach((ligne, i) => {
        const forme = versFormeBloc({ block_type: ligne.blockType, payload: ligne.payload });
        expect(forme, `${c.cle} #${i + 1} (${ligne.blockType}) illisible`).not.toBeNull();

        const source = attendu[i];
        switch (source.kind) {
          case "contenu":
            expect(forme).toEqual({ type: "contenu", diapo: source.diapo });
            break;
          case "etude":
            expect(forme).toEqual({ type: "etude", cle: source.cle });
            break;
          case "appliquer":
            expect(forme).toEqual({ type: "appliquer", points: source.points });
            break;
          case "quiz":
            expect(forme).toEqual({ type: "quiz", questions: source.questions });
            break;
          case "retenir":
            expect(forme).toEqual({ type: "retenir", texte: source.texte });
            break;
        }
      });
    }
  });

  it("conserve le nombre total d'écrans", () => {
    const avant = CHAPITRES.reduce((s, c) => s + construireDiapos(c).length, 0);
    const apres = lignesDuProgramme().reduce((s, p) => s + p.lignes.length, 0);
    expect(apres).toBe(avant);
    expect(apres).toBe(196);
  });
});

describe("niveau de preuve", () => {
  const toutes = lignesDuProgramme().flatMap((p) => p.lignes);

  it("ne déclare vérifié qu'un bloc qui porte réellement sa source", () => {
    for (const l of toutes) {
      if (l.niveau === "fait_verifie") {
        expect(l.blockType).toBe("etude");
        expect(l.sources.length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  /**
   * Le sens inverse, qui est celui qu'on oublie : aucun bloc ne porte de source
   * sans etre declare verifie. Une source attachee a un bloc `mecanique_standard`
   * signalerait qu'on a commence a rattacher de la prose a des etudes.
   */
  it("ne rattache aucune source à un bloc non vérifié", () => {
    for (const l of toutes) {
      if (l.sources.length > 0) expect(l.niveau).toBe("fait_verifie");
    }
  });

  it("n'invente aucune étude : toutes existent au catalogue", () => {
    for (const l of toutes) {
      for (const cle of l.sources) expect(ETUDES[cle]).toBeDefined();
    }
  });

  it("cite les 29 références du catalogue, sans orpheline", () => {
    const citees = new Set(toutes.flatMap((l) => l.sources));
    expect(citees.size).toBe(Object.keys(ETUDES).length);
    expect(citees.size).toBe(29);
  });

  it("n'attribue jamais sortie_modele à du contenu de cours", () => {
    for (const l of toutes) expect(l.niveau).not.toBe("sortie_modele");
  });
});

describe("garde-fous du contenu, maintenus après la migration", () => {
  const toutes = lignesDuProgramme().flatMap((p) => p.lignes);

  /**
   * Ces trois controles vivaient dans `cours.test.ts` et portaient sur le
   * tableau statique. Le contenu partant en base, ils sont reecrits ici sur la
   * projection : sinon la migration les ferait disparaitre de la CI, et on
   * aurait supprime les garde-fous en croyant deplacer du contenu.
   */

  it("garde un plancher de matière sur chaque page de cours", () => {
    const pages = toutes.filter((l) => l.blockType === "cours");
    expect(pages.length).toBeGreaterThanOrEqual(18);
    for (const p of pages) {
      expect(p.bodyMd.length, `page trop courte : ${p.bodyMd.slice(0, 60)}…`).toBeGreaterThan(900);
    }
  });

  it("donne à chaque chapitre au moins une page de cours développée", () => {
    for (const { chapitre, lignes } of lignesDuProgramme()) {
      const pages = lignes.filter((l) => l.blockType === "cours");
      expect(pages.length, `chapitre ${chapitre} sans page de cours`).toBeGreaterThanOrEqual(1);
    }
  });

  it("ne référence que des figures qui existent", () => {
    const refs = toutes.map((l) => l.figureRef).filter((f): f is string => f !== null);
    expect(refs.length).toBe(8);
    for (const f of refs) expect(FIGURES[f], `figure « ${f} » introuvable`).toBeDefined();
  });

  it("n'écrit jamais deux figures sur une même page", () => {
    // `figureDe` leve dans ce cas ; ce test verifie que la projection entiere
    // passe, donc qu'aucune page n'est concernee.
    expect(() => lignesDuProgramme()).not.toThrow();
  });

  it("remplit body_md pour chaque bloc, pour la recherche et la lecture vocale", () => {
    for (const l of toutes) expect(l.bodyMd.trim().length).toBeGreaterThan(0);
  });
});
