/**
 * Calculs d'une simulation. Aucun ordre reel n'est passe : on enregistre une
 * decision, puis on la confronte aux cours reels.
 *
 * Deux principes tiennent tout le fichier :
 *
 *  1. Les frais comptent deux fois. Acheter coute, revendre coute. Un resultat
 *     affiche sans les frais de sortie donne l'illusion d'un gain qui n'existe
 *     pas encore. Tout ce qui est presente comme un resultat est donc net d'un
 *     aller-retour complet.
 *
 *  2. On raisonne en euros. Une action suedoise peut monter en couronnes et
 *     faire perdre de l'argent une fois reconvertie. Separer les deux effets
 *     est precisement ce qu'on veut faire comprendre.
 */

import type { Simulation } from "./types";
import { computeFeeImpact } from "./fees";

export interface ResultatSimulation {
  /** Somme fictive sortie de la poche, frais d'entree compris. */
  engageEur: number;
  /** Frais preleves a l'achat. */
  fraisEntreeEur: number;
  /** Valeur des titres aujourd'hui (ou au jour de la revente), en euros. */
  valeurEur: number;
  /** Frais qu'une revente couterait, estimes aux conditions actuelles. */
  fraisSortieEur: number;
  /** Ce qui resterait reellement en poche apres revente. */
  netEur: number;
  /** Resultat net, en euros puis en pourcentage de la somme engagee. */
  gainEur: number;
  gainPct: number;
  /** Part du mouvement due au seul cours, hors change et hors frais. */
  variationCoursPct: number;
  /** Part du mouvement due au taux de change. Nulle pour un titre en euros. */
  effetChangePct: number;
  /** Meme somme placee le meme jour sur un ETF mondial : resultat net. */
  referenceGainEur: number | null;
  referenceGainPct: number | null;
  /** Nombre de jours ecoules depuis l'achat fictif. */
  jours: number;
  /** Vrai si la valorisation n'a pas encore ete recuperee. */
  enAttente: boolean;
}

/** Prix unitaire ramene en euros. */
function enEuros(prix: number, taux: number): number {
  return prix / (taux || 1);
}

export function calculeSimulation(
  sim: Simulation,
  brokerFixedFeeEur: number,
  transactionTaxPct: number,
): ResultatSimulation {
  const cloturee = sim.closed_at != null;
  const prix = cloturee ? sim.prix_sortie : sim.prix_actuel;
  const taux = (cloturee ? sim.taux_sortie : sim.taux_actuel) ?? sim.taux_entree;

  const engageEur = Number(sim.montant_eur);
  const fraisEntreeEur = Number(sim.frais_entree_eur ?? 0);
  const jours = Math.max(
    0,
    Math.round(
      (+new Date(cloturee ? sim.closed_at! : Date.now()) -
        +new Date(`${sim.date_entree}T00:00:00`)) /
        86_400_000,
    ),
  );

  if (prix == null) {
    return {
      engageEur,
      fraisEntreeEur,
      valeurEur: 0,
      fraisSortieEur: 0,
      netEur: 0,
      gainEur: 0,
      gainPct: 0,
      variationCoursPct: 0,
      effetChangePct: 0,
      referenceGainEur: null,
      referenceGainPct: null,
      jours,
      enAttente: true,
    };
  }

  const valeurEur = Number(sim.quantite) * enEuros(Number(prix), Number(taux));

  // Frais de sortie : les memes regles qu'a l'achat, appliquees a la valeur du
  // jour. C'est une estimation, mais l'ignorer serait plus faux que l'estimer.
  const fraisSortieEur =
    cloturee && sim.frais_sortie_eur != null
      ? Number(sim.frais_sortie_eur)
      : brokerFixedFeeEur + (valeurEur * transactionTaxPct) / 100;

  const netEur = valeurEur - fraisSortieEur;
  const gainEur = netEur - engageEur;
  const gainPct = engageEur > 0 ? (gainEur / engageEur) * 100 : 0;

  // Decomposition : le cours dans sa devise d'un cote, le change de l'autre.
  const variationCoursPct = (Number(prix) / Number(sim.prix_entree) - 1) * 100;
  const variationTotalePct =
    (enEuros(Number(prix), Number(taux)) /
      enEuros(Number(sim.prix_entree), Number(sim.taux_entree)) -
      1) *
    100;
  const effetChangePct = variationTotalePct - variationCoursPct;

  // Reference : la meme somme, le meme jour, sur un ETF mondial, avec les
  // memes frais d'entree et de sortie. La comparaison n'a de sens qu'a
  // conditions egales.
  let referenceGainEur: number | null = null;
  let referenceGainPct: number | null = null;
  if (sim.ref_prix_entree != null && sim.ref_prix_actuel != null) {
    const partsRef = (engageEur - fraisEntreeEur) / Number(sim.ref_prix_entree);
    const valeurRef = partsRef * Number(sim.ref_prix_actuel);
    const fraisSortieRef =
      brokerFixedFeeEur + (valeurRef * transactionTaxPct) / 100;
    referenceGainEur = valeurRef - fraisSortieRef - engageEur;
    referenceGainPct = engageEur > 0 ? (referenceGainEur / engageEur) * 100 : 0;
  }

  return {
    engageEur,
    fraisEntreeEur,
    valeurEur,
    fraisSortieEur,
    netEur,
    gainEur,
    gainPct,
    variationCoursPct,
    effetChangePct,
    referenceGainEur,
    referenceGainPct,
    jours,
    enAttente: false,
  };
}

/**
 * Repartition d'une somme entre frais et titres, avant de valider un achat
 * fictif. Sert a montrer, au moment de la decision, ce qui part en frais.
 */
export function prepareEntree(
  montantEur: number,
  prixUnitaire: number,
  tauxEur: number,
  brokerFixedFeeEur: number,
  transactionTaxPct: number,
) {
  // La taxe porte sur le montant reellement investi, pas sur la somme totale :
  // on resout net * (1 + taxe) = montant - frais fixes.
  const apresFraisFixes = Math.max(0, montantEur - brokerFixedFeeEur);
  const investiEur = apresFraisFixes / (1 + transactionTaxPct / 100);
  const taxeEur = apresFraisFixes - investiEur;
  const fraisEntreeEur = brokerFixedFeeEur + taxeEur;
  const prixEur = enEuros(prixUnitaire, tauxEur);
  const quantite = prixEur > 0 ? investiEur / prixEur : 0;
  const impact = computeFeeImpact(brokerFixedFeeEur, montantEur, transactionTaxPct);
  return { investiEur, fraisEntreeEur, taxeEur, quantite, prixEur, impact };
}

export function formatEur(v: number, signe = false): string {
  const s = v.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${signe && v > 0 ? "+" : ""}${s} €`;
}

export function formatPct(v: number, signe = true): string {
  if (!isFinite(v)) return "—";
  const s = v.toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${signe && v > 0 ? "+" : ""}${s} %`;
}
