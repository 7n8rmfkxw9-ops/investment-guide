/**
 * Types du moteur de regles.
 *
 * Trois principes, tenus par la forme meme de ces types :
 *
 * 1. Une regle est une fonction PURE. Elle recoit un contexte, elle renvoie
 *    des brouillons. Aucun acces reseau, aucune horloge implicite (`maintenant`
 *    est fourni), aucun modele de langage. Un modele qui hallucine une regle
 *    sur de l'argent est pire qu'inutile ; ici il n'a simplement pas de porte
 *    d'entree.
 *
 * 2. Une regle ne comble jamais un trou. Quand une donnee manque, elle le DIT
 *    (`donneesManquantes`) au lieu d'estimer. Une proposition qui annonce
 *    « il vous manque le montant de votre couverture » est utile ; une
 *    proposition qui suppose ce montant est dangereuse.
 *
 * 3. Aucune valeur reglementaire n'est ecrite dans le code. Delais de preavis,
 *    plafonds, taux : tout cela vient d'un `Signal` porteur d'une URL, sinon la
 *    regle concernee ne se declenche pas du tout.
 */

/** Un fait sur l'utilisateur, tel que stocke dans `personal_facts`. */
export interface Fait {
  key: string;
  value: unknown;
  unit?: string | null;
  domain: string;
  /** Date de derniere confirmation par l'utilisateur, au format ISO. */
  verifiedAt: string;
  reviewCadenceMonths?: number | null;
}

/** Un changement du monde exterieur, tel que stocke dans `signals`. */
export interface Signal {
  id: string;
  /** Non vide par construction : sans adresse relisable, ce n'est pas un signal. */
  sourceUrl: string;
  observedAt: string;
  summary: string;
  domain: string;
  /** Valeurs exploitables. Une regle deterministe ne calcule pas sur du texte. */
  payload: Record<string, unknown>;
}

export interface Contexte {
  /** Fourni, jamais lu de l'horloge : une regle testable est une regle datee. */
  maintenant: Date;
  faits: Fait[];
  signaux: Signal[];
}

export type Severite = "info" | "attention" | "urgent";

/**
 * Ce qu'une regle produit. Pas une proposition : un brouillon.
 *
 * La difference compte. Le brouillon est calcule hors ligne, sans identite
 * d'utilisateur et sans identifiant de regle en base ; c'est le moteur qui le
 * transforme en ligne de `proposals`. Une regle ne peut donc pas ecrire
 * directement dans la boite de validation.
 */
export interface Brouillon {
  regle: string;
  titre: string;
  severite: Severite;
  /** Le raisonnement, en gabarit deterministe. Toujours present. */
  rationaleMd: string;
  payload: Record<string, unknown>;
  /** Adresses relisables. Non vide des que la regle est declenchee par un evenement. */
  sourceUrls: string[];
  /**
   * Ce qui manque pour conclure. Non vide = la proposition annonce le trou.
   * Elle reste utile : savoir quelle information reunir est deja une action.
   */
  donneesManquantes: string[];
  /** Peremption. Une proposition sans date de fin devient un reproche permanent. */
  expiresAt?: string | null;
  /**
   * Cle du chapitre dont un bloc explique le mecanisme sous-jacent.
   *
   * Nulle pour les quatre regles actuelles, et ce n'est pas un oubli : le cours
   * porte sur l'investissement, aucun de ses dix-huit chapitres n'explique la
   * regle proportionnelle, la mutualite ou le solde restant du. Y rattacher un
   * chapitre d'investissement produirait un lien credible et faux — exactement
   * ce que ce champ existe pour eviter. Le cablage est en place ; il se
   * remplira le jour ou un chapitre traitera reellement de ces mecanismes.
   */
  expliquePar?: string | null;
}

export type Regle = (ctx: Contexte) => Brouillon[];

// ---------------------------------------------------------------------------
// Lecture du contexte
//
// Ces accesseurs existent pour une raison : une regle qui lit `f.value as
// number` accepte silencieusement une chaine, un nul ou un objet, et calcule
// dessus. Ici, une valeur d'un type inattendu est traitee comme absente.

export function fait(ctx: Contexte, key: string): Fait | null {
  return ctx.faits.find((f) => f.key === key) ?? null;
}

export function nombre(ctx: Contexte, key: string): number | null {
  const f = fait(ctx, key);
  if (!f) return null;
  const v = f.value;
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function date(ctx: Contexte, key: string): Date | null {
  const f = fait(ctx, key);
  if (!f) return null;
  if (typeof f.value !== "string") return null;
  const d = new Date(f.value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function texte(ctx: Contexte, key: string): string | null {
  const f = fait(ctx, key);
  return typeof f?.value === "string" && f.value.length > 0 ? f.value : null;
}

/** Signaux d'un domaine, du plus recent au plus ancien. */
export function signauxDu(ctx: Contexte, domain: string): Signal[] {
  return ctx.signaux
    .filter((s) => s.domain === domain)
    .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime());
}

/** Nombre porte par un signal. Toute autre forme est traitee comme absente. */
export function nombreSignal(s: Signal, cle: string): number | null {
  const v = s.payload[cle];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ---------------------------------------------------------------------------
// Mise en forme
//
// Les montants apparaissent dans le texte des propositions. Les formater ici
// plutot que dans chaque regle evite qu'une proposition annonce « 1234.5 € »
// et la suivante « 1 234,50 € » pour la meme somme.

export function euros(n: number): string {
  return `${n.toLocaleString("fr-BE", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
}

export function moisEcoules(depuis: Date, jusqu: Date): number {
  return (
    (jusqu.getFullYear() - depuis.getFullYear()) * 12 +
    (jusqu.getMonth() - depuis.getMonth()) -
    (jusqu.getDate() < depuis.getDate() ? 1 : 0)
  );
}

export function joursEntre(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000);
}

export function isoJour(d: Date): string {
  return d.toISOString().slice(0, 10);
}
