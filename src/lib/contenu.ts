/**
 * Lecture du cours depuis la base.
 *
 * ---------------------------------------------------------------------------
 * Le compromis de disponibilite, explicitement
 *
 * Le cours vivait dans le bundle JavaScript : il s'affichait instantanement,
 * sans reseau et sans compte. En base, il demande une session et un
 * aller-retour. Sur un telephone dans un tunnel, cela suffit a rendre dix-huit
 * chapitres inaccessibles.
 *
 * D'ou le cache local : le contenu recu est ecrit dans `localStorage`, et
 * c'est lui qu'on affiche en premier au chargement suivant. Le reseau ne sert
 * plus qu'a rafraichir en arriere-plan. Consequences honnetes :
 *
 *   - apres une premiere lecture reussie, le cours fonctionne hors ligne ;
 *   - au tout premier lancement sans reseau, il n'y a rien a afficher, et
 *     l'ecran le dit au lieu de tourner dans le vide ;
 *   - un contenu corrige en base met un chargement a apparaitre.
 *
 * Ce n'est pas equivalent a l'ancien comportement. C'est ce qui s'en approche
 * le plus une fois le contenu sorti du bundle.
 */

import { supabase } from "./supabase";
import type { Diapo, DiapoProjetee, Question } from "./cours";
import type { Etude } from "./etudes";

// ---------------------------------------------------------------------------
// Modele

export interface PartieBd {
  cle: string;
  titre: string;
  sousTitre: string | null;
}

export type NiveauPreuve = "fait_verifie" | "mecanique_standard" | "sortie_modele";

/** La forme du bloc et sa charge utile, telles qu'elles arrivent de la base. */
export type FormeBloc =
  | { type: "contenu"; diapo: Diapo }
  | { type: "etude"; cle: string }
  | { type: "appliquer"; points: string[] }
  | { type: "quiz"; questions: Question[] }
  | { type: "retenir"; texte: string };

/**
 * Un bloc porte toujours son niveau de preuve.
 *
 * Il voyage avec le contenu jusqu'a l'ecran, ou il est affiche. Le masquer
 * reviendrait a presenter une derivation standard et une mesure publiee du
 * meme ton, ce qui est exactement la confusion que ce champ existe pour
 * empecher.
 */
export type BlocBd = FormeBloc & { niveau: NiveauPreuve };

export interface ChapitreBd {
  cle: string;
  numero: number;
  partie: string;
  titre: string;
  question: string;
  minutes: number;
  icone: string | null;
  nature: "empirique" | "arithmetique";
  blocs: BlocBd[];
  /** Cles des etudes citees, dans l'ordre d'apparition. */
  etudes: string[];
}

export interface Programme {
  parties: PartieBd[];
  chapitres: ChapitreBd[];
  etudes: Record<string, Etude>;
  /** Date de la reponse qui a produit ce programme. */
  recuLe: string;
}

const CLE_CACHE = "veille.cours.v1";

// ---------------------------------------------------------------------------
// Conversion

/**
 * Reconstitue un bloc a partir de sa ligne.
 *
 * Les types de diapositive du cours (`idee`, `formule`, `cours`, ...) sont
 * stockes tels quels dans `payload` : le rendu attend exactement la structure
 * qu'il attendait quand elle venait du fichier TypeScript. Les quatre types de
 * fin de chapitre sont projetes vers la meme forme que `construireDiapos()`
 * produisait, pour que le composant de diaporama n'ait rien a apprendre.
 */
export function versFormeBloc(ligne: { block_type: string; payload: unknown }): FormeBloc | null {
  const p = ligne.payload as Record<string, unknown>;
  switch (ligne.block_type) {
    case "etude":
      return typeof p.cle === "string" ? { type: "etude", cle: p.cle } : null;
    case "appliquer":
      return { type: "appliquer", points: Array.isArray(p.points) ? (p.points as string[]) : [] };
    case "quiz":
      return {
        type: "quiz",
        questions: Array.isArray(p.questions) ? (p.questions as Question[]) : [],
      };
    case "retenir":
      return { type: "retenir", texte: typeof p.texte === "string" ? p.texte : "" };
    default:
      // Tous les autres types sont des diapositives de cours, stockees dans
      // leur forme d'origine. Un type inconnu est ignore plutot que rendu :
      // mieux vaut un ecran de moins qu'un ecran casse.
      return typeof p.type === "string" ? { type: "contenu", diapo: p as unknown as Diapo } : null;
  }
}

// ---------------------------------------------------------------------------
// Cache

export function programmeEnCache(): Programme | null {
  try {
    const brut = localStorage.getItem(CLE_CACHE);
    if (!brut) return null;
    const p = JSON.parse(brut) as Programme;
    // Un cache d'une version anterieure du modele ferait planter le rendu plus
    // loin, a un endroit ou l'origine du probleme serait illisible.
    if (!Array.isArray(p?.chapitres) || !Array.isArray(p?.parties)) return null;
    return p;
  } catch {
    return null;
  }
}

function memoriser(p: Programme): void {
  try {
    localStorage.setItem(CLE_CACHE, JSON.stringify(p));
  } catch {
    // Quota depasse ou stockage refuse (navigation privee) : le cours reste
    // lisible dans cette session, il sera simplement recharge la prochaine fois.
  }
}

// ---------------------------------------------------------------------------
// Chargement

export async function chargerProgramme(): Promise<Programme> {
  const [parts, chapters, blocks, sources] = await Promise.all([
    supabase.from("parts").select("id,key,title,subtitle,position").order("position"),
    supabase.from("chapters").select("key,number,title,question,minutes,icon,nature,part_id,id").order("number"),
    supabase
      .from("content_blocks")
      .select("chapter_id,block_type,payload,position,evidence_level")
      .order("position"),
    supabase.from("sources").select("key,title,authors,year,publisher,doi,url,finding,limitations"),
  ]);

  const erreur = parts.error ?? chapters.error ?? blocks.error ?? sources.error;
  if (erreur) throw erreur;

  const clePartieParId = new Map(
    (parts.data ?? []).map((p) => [p.id as string, p.key as string]),
  );

  const etudes: Record<string, Etude> = {};
  for (const s of sources.data ?? []) {
    etudes[s.key as string] = {
      cle: s.key as string,
      titre: s.title as string,
      auteurs: s.authors as string,
      annee: (s.year as number) ?? 0,
      publication: (s.publisher as string) ?? "",
      doi: (s.doi as string) ?? "",
      resultat: (s.finding as string) ?? "",
      limites: s.limitations as string,
    };
  }

  const blocsParChapitre = new Map<string, BlocBd[]>();
  const etudesParChapitre = new Map<string, string[]>();
  for (const b of blocks.data ?? []) {
    const forme = versFormeBloc(b as { block_type: string; payload: unknown });
    if (!forme) continue;
    const bloc: BlocBd = { ...forme, niveau: b.evidence_level as NiveauPreuve };
    const cid = b.chapter_id as string;
    if (!blocsParChapitre.has(cid)) blocsParChapitre.set(cid, []);
    blocsParChapitre.get(cid)!.push(bloc);
    if (bloc.type === "etude") {
      if (!etudesParChapitre.has(cid)) etudesParChapitre.set(cid, []);
      etudesParChapitre.get(cid)!.push(bloc.cle);
    }
  }

  const programme: Programme = {
    parties: (parts.data ?? []).map((p) => ({
      cle: p.key as string,
      titre: p.title as string,
      sousTitre: (p.subtitle as string) ?? null,
    })),
    chapitres: (chapters.data ?? []).map((c) => ({
      cle: c.key as string,
      numero: c.number as number,
      partie: clePartieParId.get(c.part_id as string) ?? "",
      titre: c.title as string,
      question: c.question as string,
      minutes: c.minutes as number,
      icone: (c.icon as string) ?? null,
      nature: c.nature as "empirique" | "arithmetique",
      blocs: blocsParChapitre.get(c.id as string) ?? [],
      etudes: etudesParChapitre.get(c.id as string) ?? [],
    })),
    etudes,
    recuLe: new Date().toISOString(),
  };

  memoriser(programme);
  return programme;
}

// ---------------------------------------------------------------------------
// Vers les ecrans

/**
 * Ecrans d'un chapitre, dans la forme qu'attend le diaporama.
 *
 * L'ordre est celui des positions en base, qui reproduit celui que
 * `construireDiapos()` produisait — contenu, etudes, appliquer, quiz, retenir.
 * Le tri n'est pas refait ici : le reordonner cote client autoriserait la base
 * et l'ecran a diverger sans que rien ne le signale.
 */
export function versDiapos(c: ChapitreBd): DiapoProjetee[] {
  return c.blocs.map((b): DiapoProjetee => {
    switch (b.type) {
      case "contenu":
        return { kind: "contenu", diapo: b.diapo };
      case "etude":
        return { kind: "etude", cle: b.cle };
      case "appliquer":
        return { kind: "appliquer", points: b.points };
      case "quiz":
        return { kind: "quiz", questions: b.questions };
      case "retenir":
        return { kind: "retenir", texte: b.texte };
    }
  });
}

// ---------------------------------------------------------------------------
// Agregats, calcules sur le programme recu plutot qu'ecrits en dur

export function dureeTotale(p: Programme): number {
  return p.chapitres.reduce((s, c) => s + c.minutes, 0);
}

export function nombreReferences(p: Programme): number {
  return new Set(p.chapitres.flatMap((c) => c.etudes)).size;
}
