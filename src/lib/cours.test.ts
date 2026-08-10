import { describe, expect, it } from "vitest";
import {
  CHAPITRES,
  construireDiapos,
  dureeTotale,
  etudesDuChapitre,
  nombreReferences,
} from "./cours";
import { ETUDES, lienDoi, TOUTES_LES_ETUDES } from "./etudes";

describe("catalogue des études", () => {
  it("donne à chaque étude un DOI de forme valide", () => {
    // Le DOI est ce qui rend la reference verifiable par le lecteur. Sans lui,
    // « source scientifique » n'est qu'une affirmation.
    for (const e of TOUTES_LES_ETUDES) {
      expect(e.doi, e.cle).toMatch(/^10\.\d{4,9}\/\S+$/);
    }
  });

  it("n'a aucun DOI en double", () => {
    const dois = TOUTES_LES_ETUDES.map((e) => e.doi);
    expect(new Set(dois).size).toBe(dois.length);
  });

  it("garde la clé de l'objet et celle de l'étude synchronisées", () => {
    for (const [k, e] of Object.entries(ETUDES)) expect(e.cle).toBe(k);
  });

  it("renseigne auteurs, année et publication pour chacune", () => {
    for (const e of TOUTES_LES_ETUDES) {
      expect(e.auteurs.trim().length, e.cle).toBeGreaterThan(2);
      expect(e.publication.trim().length, e.cle).toBeGreaterThan(4);
      expect(e.annee, e.cle).toBeGreaterThan(1950);
      expect(e.annee, e.cle).toBeLessThanOrEqual(new Date().getFullYear());
    }
  });

  it("expose les limites de chaque étude, sans exception", () => {
    // Une etude presentee sans ses limites se lit comme une loi de la nature.
    // Aucune de celles-ci n'en est une : ce sont des mesures, sur une periode
    // et un marche donnes.
    for (const e of TOUTES_LES_ETUDES) {
      expect(e.limites.trim().length, e.cle).toBeGreaterThan(40);
    }
  });

  it("décrit un résultat substantiel pour chacune", () => {
    for (const e of TOUTES_LES_ETUDES) {
      expect(e.resultat.trim().length, e.cle).toBeGreaterThan(60);
    }
  });

  it("construit un lien DOI résolvable", () => {
    expect(lienDoi("10.1111/0022-1082.00226")).toBe(
      "https://doi.org/10.1111/0022-1082.00226",
    );
  });
});

describe("chapitres", () => {
  it("s'appuie tous sur au moins une étude du catalogue", () => {
    // La regle centrale du cours : rien ne s'affirme sans reference.
    for (const c of CHAPITRES) {
      expect(c.etudes.length, c.cle).toBeGreaterThan(0);
    }
  });

  it("ne référence aucune étude inexistante", () => {
    for (const c of CHAPITRES) {
      for (const k of c.etudes) {
        expect(ETUDES[k], `${c.cle} → ${k}`).toBeDefined();
      }
    }
  });

  it("résout toutes les études citées", () => {
    for (const c of CHAPITRES) {
      expect(etudesDuChapitre(c).length, c.cle).toBe(c.etudes.length);
    }
  });

  it("mobilise chaque étude du catalogue au moins une fois", () => {
    // Une etude jamais citee est un travail de verification perdu, et un
    // catalogue qui gonfle sans que le lecteur en profite.
    const citees = new Set(CHAPITRES.flatMap((c) => c.etudes));
    for (const e of TOUTES_LES_ETUDES) {
      expect(citees.has(e.cle), `jamais citée : ${e.cle}`).toBe(true);
    }
  });

  it("numérote les chapitres sans trou ni doublon", () => {
    const nums = CHAPITRES.map((c) => c.numero);
    expect(nums).toEqual([...Array(CHAPITRES.length)].map((_, i) => i + 1));
  });

  it("n'a aucune clé de chapitre en double", () => {
    const cles = CHAPITRES.map((c) => c.cle);
    expect(new Set(cles).size).toBe(cles.length);
  });

  it("commence par les frais", () => {
    // Choix pedagogique assume : c'est la seule composante du rendement
    // connue a l'avance et entierement sous controle du lecteur.
    expect(CHAPITRES[0].cle).toBe("frais");
  });

  it("donne à chaque chapitre des diapositives et une application concrète", () => {
    for (const c of CHAPITRES) {
      expect(c.diapos.length, c.cle).toBeGreaterThan(2);
      expect(c.appliquer.length, c.cle).toBeGreaterThan(0);
      expect(c.aRetenir.trim().length, c.cle).toBeGreaterThan(30);
    }
  });

  it("garde chaque diapositive courte assez pour tenir sur un écran", () => {
    // Le defaut que cette refonte corrige : des pavés de prose illisibles sur
    // un telephone. Un plafond par diapositive empeche de les reintroduire
    // sans s'en apercevoir.
    const MAX = 320;
    for (const c of CHAPITRES) {
      for (const d of c.diapos) {
        const texte =
          d.type === "liste" ? d.points.join(" ") : d.type === "citation" ? d.texte : d.texte;
        expect(texte.length, `${c.cle} : « ${texte.slice(0, 40)}… »`).toBeLessThanOrEqual(MAX);
      }
    }
  });

  it("titre chaque diapositive de contenu", () => {
    for (const c of CHAPITRES) {
      for (const d of c.diapos) {
        if (d.type === "idee" || d.type === "liste") {
          expect(d.titre.trim().length, c.cle).toBeGreaterThan(3);
        }
      }
    }
  });

  it("garde chaque chapitre lisible d'une traite", () => {
    for (const c of CHAPITRES) {
      expect(c.minutes, c.cle).toBeGreaterThan(0);
      expect(c.minutes, c.cle).toBeLessThanOrEqual(12);
    }
  });

  it("ne formule aucune recommandation d'achat dans la partie « appliquer »", () => {
    // Garde-fou du principe fondateur : on traduit un resultat en question a
    // se poser, jamais en ordre a passer.
    const interdits = /\b(achetez|vendez|investissez dans|il faut acheter|placez votre argent)\b/i;
    for (const c of CHAPITRES) {
      for (const a of c.appliquer) {
        expect(interdits.test(a), `${c.cle} : « ${a} »`).toBe(false);
      }
      expect(interdits.test(c.aRetenir), c.cle).toBe(false);
    }
  });

  it("contredit l'outil là où la recherche le contredit", () => {
    // Un cours qui ne nuance jamais l'outil qui l'heberge n'est pas un cours.
    // Le chapitre sur les inities doit dire que l'outil ne distingue pas les
    // operations de routine, faute de quoi il vend la fonctionnalite au lieu
    // de l'expliquer.
    const inities = CHAPITRES.find((c) => c.cle === "inities")!;
    const texte = inities.diapos
      .map((d) => (d.type === "liste" ? d.points.join(" ") : d.texte))
      .join(" ");
    expect(texte).toMatch(/cet outil/i);
    expect(texte).toMatch(/routine/i);
  });
});

describe("construireDiapos", () => {
  it("termine chaque chapitre par ses sources, l'application et le à-retenir", () => {
    for (const c of CHAPITRES) {
      const d = construireDiapos(c);
      const fin = d.slice(-2).map((x) => x.kind);
      expect(fin, c.cle).toEqual(["appliquer", "retenir"]);
      const etudes = d.filter((x) => x.kind === "etude");
      expect(etudes.length, c.cle).toBe(c.etudes.length);
    }
  });

  it("place le contenu avant les sources", () => {
    for (const c of CHAPITRES) {
      const kinds = construireDiapos(c).map((x) => x.kind);
      const dernierContenu = kinds.lastIndexOf("contenu");
      const premiereEtude = kinds.indexOf("etude");
      expect(dernierContenu, c.cle).toBeLessThan(premiereEtude);
    }
  });

  it("garde un diaporama parcourable d'une traite", () => {
    for (const c of CHAPITRES) {
      const n = construireDiapos(c).length;
      expect(n, c.cle).toBeGreaterThanOrEqual(5);
      expect(n, c.cle).toBeLessThanOrEqual(14);
    }
  });
});

describe("agrégats", () => {
  it("annonce une durée totale cohérente", () => {
    expect(dureeTotale()).toBe(CHAPITRES.reduce((s, c) => s + c.minutes, 0));
    expect(dureeTotale()).toBeGreaterThan(20);
  });

  it("compte les références distinctes réellement mobilisées", () => {
    expect(nombreReferences()).toBe(
      new Set(CHAPITRES.flatMap((c) => c.etudes)).size,
    );
    expect(nombreReferences()).toBe(TOUTES_LES_ETUDES.length);
  });
});
