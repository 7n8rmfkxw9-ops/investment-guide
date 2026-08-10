import { describe, expect, it } from "vitest";
import {
  definitionDe,
  estPrincipal,
  libellePlus,
  MAX_ONGLETS_PRINCIPAUX,
  ONGLETS_PRINCIPAUX,
  ONGLETS_SECONDAIRES,
  TOUS_LES_ONGLETS,
} from "./onglets";
import type { Onglet } from "./onglets";

describe("répartition de la navigation", () => {
  it("laisse la place au bouton « Plus » dans la barre du bas", () => {
    // Le garde-fou central de la refonte : la barre compte au plus cinq
    // cibles, dont « Plus ». Ajouter une cinquieme destination principale
    // sans y penser ferait retomber dans le defilement horizontal.
    expect(ONGLETS_PRINCIPAUX.length).toBeLessThanOrEqual(
      MAX_ONGLETS_PRINCIPAUX - 1,
    );
  });

  it("ne place aucune destination à deux endroits", () => {
    const ids = TOUS_LES_ONGLETS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rend chaque destination atteignable", () => {
    // Une destination absente des deux listes existerait dans le code sans
    // qu'aucun bouton n'y mene : exactement ce qui est arrive a
    // « Comprendre », noyee hors ecran dans l'ancienne barre.
    const attendus: Onglet[] = [
      "pistes", "marche", "horizon", "simuler", "journal", "comprendre",
      "cours", "investir", "positions", "historique", "configuration", "compte",
    ];
    const ids = new Set(TOUS_LES_ONGLETS.map((o) => o.id));
    for (const a of attendus) expect(ids.has(a), a).toBe(true);
    expect(ids.size).toBe(attendus.length);
  });

  it("donne à chaque destination un libellé, une icône et un détail", () => {
    for (const o of TOUS_LES_ONGLETS) {
      expect(o.label.trim().length, o.id).toBeGreaterThan(0);
      expect(o.icone.trim().length, o.id).toBeGreaterThan(0);
      expect(o.detail.trim().length, o.id).toBeGreaterThan(10);
    }
  });

  it("garde des libellés courts pour la barre du bas", () => {
    // Au-dela d'une douzaine de caracteres, le libelle se tronque sur un
    // ecran de 390 px divise en cinq.
    for (const o of ONGLETS_PRINCIPAUX) {
      expect(o.label.length, o.label).toBeLessThanOrEqual(12);
    }
  });

  it("met en avant les pistes en première position", () => {
    expect(ONGLETS_PRINCIPAUX[0].id).toBe("pistes");
  });

  it("garde l'apprentissage en tête de la feuille secondaire", () => {
    // Ce que doit voir en premier quelqu'un qui ouvre « Plus » sans savoir
    // quoi y chercher : de quoi apprendre, pas les reglages.
    expect(ONGLETS_SECONDAIRES.slice(0, 2).map((o) => o.id)).toEqual([
      "cours",
      "comprendre",
    ]);
  });
});

describe("estPrincipal", () => {
  it("reconnait une destination de la barre du bas", () => {
    expect(estPrincipal("pistes")).toBe(true);
    expect(estPrincipal("journal")).toBe(true);
  });

  it("reconnait une destination de la feuille", () => {
    expect(estPrincipal("configuration")).toBe(false);
  });
});

describe("definitionDe", () => {
  it("retrouve une destination par son identifiant", () => {
    expect(definitionDe("horizon")?.label).toBe("Horizon");
  });

  it("renvoie undefined pour un identifiant inconnu", () => {
    expect(definitionDe("inexistant" as Onglet)).toBeUndefined();
  });
});

describe("libellePlus", () => {
  it("affiche « Plus » quand la page courante est dans la barre", () => {
    expect(libellePlus("pistes").label).toBe("Plus");
  });

  it("affiche le nom de la page courante quand elle vit dans la feuille", () => {
    // Sans cela, un utilisateur dans « Réglages » ne verrait aucun onglet
    // actif et perdrait le fil de l'endroit ou il se trouve.
    expect(libellePlus("configuration").label).toBe("Réglages");
    expect(libellePlus("comprendre").icone).toBe("📖");
  });

  it("retombe sur « Plus » pour un identifiant inconnu", () => {
    expect(libellePlus("inexistant" as Onglet).label).toBe("Plus");
  });
});
