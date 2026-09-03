/**
 * Projection du cours vers des lignes de base.
 *
 * Extrait du script de migration pour une seule raison : cette projection doit
 * etre testable. C'est elle qui decide si le lecteur retrouvera ses dix-huit
 * chapitres a l'identique ou une version abimee, et une transformation de cette
 * portee ne se verifie pas a l'oeil.
 *
 * Le test associe fait l'aller-retour complet — diapositives d'aujourd'hui vers
 * lignes, puis lignes vers diapositives — et exige l'egalite stricte.
 */

import {
  CHAPITRES,
  construireDiapos,
  texteDiapo,
  type Chapitre,
  type Diapo,
  type DiapoProjetee,
} from "./cours";
import { ETUDES } from "./etudes";
import type { NiveauPreuve } from "./contenu";

export interface LigneBloc {
  blockType: string;
  payload: unknown;
  bodyMd: string;
  figureRef: string | null;
  niveau: NiveauPreuve;
  /** Cles d'etudes a lier. Vide sauf pour les blocs `etude`. */
  sources: string[];
}

/**
 * Figure portee par une diapositive.
 *
 * `figure_ref` n'en tient qu'une. Aucune page n'en porte deux aujourd'hui, et
 * le jour ou l'une en portera deux il vaut mieux un echec bruyant qu'une figure
 * silencieusement perdue.
 */
export function figureDe(d: Diapo): string | null {
  if (d.type !== "cours") return null;
  const figures = d.blocs.filter((b) => b.b === "figure").map((b) => b.fig);
  if (figures.length > 1) {
    throw new Error(
      `La page « ${d.titre} » porte ${figures.length} figures alors que figure_ref n'en tient qu'une.`,
    );
  }
  return figures[0] ?? null;
}

/**
 * Lignes d'un chapitre, dans l'ordre ou le lecteur les rencontre.
 *
 * L'ordre est celui de `construireDiapos()`, dont cette fonction consomme
 * directement la sortie : les deux ne peuvent donc pas diverger.
 *
 * Le niveau de preuve n'est jamais devine. Un bloc `etude` presente une
 * reference et rien d'autre — il est `fait_verifie` et porte sa source. Tout le
 * reste est `mecanique_standard`, y compris la prose qui commente une etude :
 * les etudes sont attachees au chapitre dans la source, jamais au paragraphe,
 * et choisir a la place de l'auteur quel paragraphe telle reference justifie
 * fabriquerait une chaine de justification credible et fausse.
 */
export function lignesDuChapitre(c: Chapitre): LigneBloc[] {
  return construireDiapos(c).map((d) => ligneDe(d));
}

function ligneDe(d: DiapoProjetee): LigneBloc {
  switch (d.kind) {
    case "contenu":
      return {
        blockType: d.diapo.type,
        payload: d.diapo,
        bodyMd: texteDiapo(d.diapo),
        figureRef: figureDe(d.diapo),
        niveau: "mecanique_standard",
        sources: [],
      };
    case "etude": {
      const e = ETUDES[d.cle];
      if (!e) throw new Error(`Etude « ${d.cle} » absente du catalogue.`);
      return {
        blockType: "etude",
        payload: { type: "etude", cle: d.cle },
        bodyMd: `${e.titre} ${e.auteurs} ${e.resultat} ${e.limites}`,
        figureRef: null,
        niveau: "fait_verifie",
        sources: [d.cle],
      };
    }
    case "appliquer":
      return {
        blockType: "appliquer",
        payload: { type: "appliquer", points: d.points },
        bodyMd: d.points.join(" "),
        figureRef: null,
        niveau: "mecanique_standard",
        sources: [],
      };
    case "quiz":
      return {
        blockType: "quiz",
        payload: { type: "quiz", questions: d.questions },
        bodyMd: d.questions.map((q) => `${q.question} ${q.explication}`).join(" "),
        figureRef: null,
        niveau: "mecanique_standard",
        sources: [],
      };
    case "retenir":
      return {
        blockType: "retenir",
        payload: { type: "retenir", texte: d.texte },
        bodyMd: d.texte,
        figureRef: null,
        niveau: "mecanique_standard",
        sources: [],
      };
  }
}

/** Toutes les lignes du programme, chapitre par chapitre. */
export function lignesDuProgramme(): { chapitre: string; lignes: LigneBloc[] }[] {
  return CHAPITRES.map((c) => ({ chapitre: c.cle, lignes: lignesDuChapitre(c) }));
}
