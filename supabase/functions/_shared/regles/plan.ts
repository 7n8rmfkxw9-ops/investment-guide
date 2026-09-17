/**
 * Plan patrimonial : les montants, dans l'ordre ou ils comptent.
 *
 * ---------------------------------------------------------------------------
 * La ligne qui ne bouge pas
 *
 * Cet outil recommande des MONTANTS, jamais des titres. La distinction n'est
 * pas de la prudence juridique, c'est la difference entre ce qui se calcule et
 * ce qui se devine. Combien mettre de cote avant d'investir, a partir de quel
 * ticket les frais cessent de manger le rendement, a quel rythme passer les
 * ordres : tout cela se derive de chiffres que vous declarez, et se verifie au
 * crayon. « Acheter telle action maintenant » ne se derive de rien.
 *
 * ---------------------------------------------------------------------------
 * L'ordre des etapes
 *
 * Il n'est pas arbitraire, et il est le meme chez tous ceux dont c'est le
 * metier. Chaque etape domine la suivante pour une raison arithmetique, pas
 * par preference :
 *
 *  1. UNE DETTE CHERE d'abord. Rembourser un credit a 7 % rapporte 7 % de
 *     facon CERTAINE. Aucun placement ne peut promettre cela — non pas parce
 *     qu'il rapporterait moins, mais parce qu'il ne promet rien. Comparer un
 *     taux certain a un rendement espere revient a comparer une somme due a un
 *     pari ; c'est le seul arbitrage patrimonial qui se tranche sans opinion.
 *
 *  2. UNE EPARGNE DE PRECAUTION ensuite. Elle n'existe pas pour rapporter,
 *     elle existe pour qu'un imprevu ne vous oblige pas a vendre au pire
 *     moment. Investir sans elle, c'est accepter d'avance de vendre quand ca
 *     baisse — exactement ce que toute la suite cherche a eviter.
 *
 *  3. LE MONTANT INVESTISSABLE enfin, qui n'est que ce qui reste.
 *
 *  4. LA TAILLE DU TICKET, dictee par les frais de votre courtier. Un ordre
 *     trop petit paie ses frais en pourcentage, et ce pourcentage est certain
 *     la ou le rendement ne l'est pas.
 *
 *  5. LE RYTHME, qui decoule du ticket : si le montant mensuel est inferieur
 *     au ticket minimum, on accumule et on passe un ordre moins souvent.
 *
 * Aucune de ces etapes ne suppose que les marches montent.
 */

import { euros, nombreFr, pourcent, type Contexte, type Fait, nombre } from "./types.ts";

// ---------------------------------------------------------------------------
// Parametres
//
// Ce sont des CONVENTIONS, pas des faits mesures. Chacune est remplacable par
// un fait personnel, et le plan dit laquelle il a employee.

/**
 * Mois de charges couverts par l'epargne de precaution, a defaut de choix.
 *
 * Quatre mois est un point median entre les usages courants (souvent enonces
 * comme « trois a six »). Ce n'est pas un resultat d'etude et rien ici ne le
 * presente comme tel : c'est un curseur, remplacable par `profil.mois_precaution`.
 */
export const MOIS_PRECAUTION_DEFAUT = 4;

/**
 * Part maximale du ticket mangee par les frais d'entree, a defaut de choix.
 *
 * Un pour cent. Le seuil d'alerte existant de l'application est a trois, mais
 * c'est un seuil de DANGER, pas une cible : viser trois revient a accepter de
 * perdre trois ans de dividendes moyens a chaque achat. Remplacable par
 * `profil.frais_cible_pct`.
 */
export const FRAIS_CIBLE_PCT_DEFAUT = 1;

/**
 * Taux annuel au-dela duquel une dette passe avant l'investissement.
 *
 * Zero : toute dette dont le taux est connu passe avant, parce que son
 * rendement est certain. Le parametre existe pour qui voudrait exclure un
 * credit immobilier a taux tres bas d'un arbitrage qu'il juge deja tranche.
 */
export const TAUX_DETTE_PRIORITAIRE_PCT_DEFAUT = 0;

// ---------------------------------------------------------------------------
// Modele

export type StatutEtape = "fait" | "en_cours" | "a_venir" | "inconnu";

export interface Etape {
  cle: string;
  titre: string;
  statut: StatutEtape;
  /** Une phrase, chiffree quand c'est possible. */
  resume: string;
  /** Le calcul, ligne a ligne. Toujours verifiable. */
  calcul: { gauche: string; droite: string }[];
  /** Ce qui manque pour trancher cette etape. */
  manque: string[];
}

export interface Plan {
  etapes: Etape[];
  /** Ce que vous pouvez investir chaque mois, une fois le reste servi. */
  investissableMensuel: number | null;
  /** Montant d'un ordre en dessous duquel les frais deviennent absurdes. */
  ticketMinimum: number | null;
  /** Nombre de mois a accumuler avant de passer un ordre. */
  moisParOrdre: number | null;
  /** Tout ce qui manque, tous domaines confondus. */
  manque: string[];
  /** Vrai quand assez de chiffres sont connus pour annoncer un montant. */
  exploitable: boolean;
  /** Cle de l'etape a traiter maintenant, ou nulle si tout est en place. */
  prochaineEtape: string | null;
}

/**
 * Ordre dans lequel REMPLIR, qui n'est pas l'ordre de PRIORITE.
 *
 * Les etapes s'affichent par priorite patrimoniale — la dette d'abord, parce
 * qu'elle domine tout le reste. Mais pointer quelqu'un vers le taux de son
 * credit en premier serait absurde : ce champ est facultatif, beaucoup n'ont
 * aucun credit, et tant que les revenus et les charges manquent, le plan ne
 * peut rien dire du tout.
 *
 * On oriente donc vers ce qui debloque le plus : les deux chiffres dont tout
 * decoule, puis l'epargne, puis les frais, et le credit en dernier.
 */
const ORDRE_SAISIE = ["capacite", "precaution", "ticket", "dette"];

function prochaine(etapes: Etape[]): string | null {
  // Une etape « en cours » est une action a mener, pas un champ a remplir :
  // elle passe avant toute demande de saisie, dans l'ordre de priorite.
  const enCours = etapes.find((e) => e.statut === "en_cours");
  if (enCours) return enCours.cle;

  for (const cle of ORDRE_SAISIE) {
    const e = etapes.find((x) => x.cle === cle);
    if (e && e.statut === "inconnu") return e.cle;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Calcul

function arrondiPrudent(n: number): number {
  // Vers le bas, au multiple de 10. Annoncer « 137 € » donnerait a une
  // soustraction de deux chiffres declares une precision qu'elle n'a pas, et
  // arrondir vers le haut ferait promettre un effort qu'on n'a pas verifie.
  return Math.max(0, Math.floor(n / 10) * 10);
}

/**
 * Ticket minimal pour que les frais d'entree restent sous la cible.
 *
 * feePct = frais_fixes / montant * 100 + taxe + change  <=  cible
 *   => montant >= frais_fixes / ((cible - taxe - change) / 100)
 *
 * Quand la taxe et le change atteignent deja la cible, aucun montant ne suffit
 * et la fonction le dit plutot que de renvoyer un nombre astronomique.
 */
export function ticketMinimum(
  fraisFixesEur: number,
  ciblePct: number,
  taxePct: number,
  changePct: number,
): number | null {
  const marge = ciblePct - taxePct - changePct;
  if (marge <= 0) return null;
  if (fraisFixesEur <= 0) return 0;
  return Math.ceil(fraisFixesEur / (marge / 100) / 10) * 10;
}

export function construirePlan(ctx: Contexte): Plan {
  const revenus = nombre(ctx, "profil.revenus_mensuels_eur");
  const charges = nombre(ctx, "profil.charges_mensuelles_eur");
  const epargne = nombre(ctx, "profil.epargne_precaution_eur");
  const moisCible = nombre(ctx, "profil.mois_precaution") ?? MOIS_PRECAUTION_DEFAUT;
  const ciblePct = nombre(ctx, "profil.frais_cible_pct") ?? FRAIS_CIBLE_PCT_DEFAUT;

  const fraisFixes = nombre(ctx, "courtier.frais_fixes_eur");
  const taxePct = nombre(ctx, "courtier.taxe_pct") ?? 0;
  const changePct = nombre(ctx, "courtier.change_pct") ?? 0;

  const capitalDette = nombre(ctx, "credit.capital_restant_eur");
  const tauxDette = nombre(ctx, "credit.taux_annuel_pct");
  const seuilDette =
    nombre(ctx, "profil.taux_dette_prioritaire_pct") ?? TAUX_DETTE_PRIORITAIRE_PCT_DEFAUT;

  const etapes: Etape[] = [];
  const manque: string[] = [];

  // --- 1. Dette chere ------------------------------------------------------
  if (tauxDette === null || capitalDette === null) {
    etapes.push({
      cle: "dette",
      titre: "Vos dettes",
      statut: "inconnu",
      resume:
        "Rembourser une dette rapporte son taux, de façon certaine. Impossible de le comparer sans connaître ce taux.",
      calcul: [],
      manque:
        tauxDette === null
          ? ["le taux annuel de votre crédit"]
          : ["le capital restant dû"],
    });
    manque.push(
      tauxDette === null ? "le taux annuel de votre crédit" : "le capital restant dû",
    );
  } else if (tauxDette > seuilDette) {
    const gainAnnuel = (capitalDette * tauxDette) / 100;
    etapes.push({
      cle: "dette",
      titre: "Rembourser avant d'investir",
      statut: "en_cours",
      resume: `Chaque euro remboursé vous rapporte ${pourcent(tauxDette, 2)} par an, avec certitude. Aucun placement ne peut promettre cela.`,
      calcul: [
        { gauche: "Capital restant dû", droite: euros(capitalDette) },
        { gauche: "Taux annuel", droite: pourcent(tauxDette, 2) },
        { gauche: "Intérêts évités sur un an", droite: euros(gainAnnuel) },
      ],
      manque: [],
    });
  } else {
    etapes.push({
      cle: "dette",
      titre: "Vos dettes",
      statut: "fait",
      resume: `À ${pourcent(tauxDette, 2)}, ce crédit ne passe pas avant le reste selon le seuil que vous avez fixé.`,
      calcul: [
        { gauche: "Taux du crédit", droite: pourcent(tauxDette, 2) },
        { gauche: "Seuil de priorité", droite: pourcent(seuilDette, 2) },
      ],
      manque: [],
    });
  }

  // --- 2. Epargne de precaution -------------------------------------------
  let precautionComplete = false;
  if (charges === null || epargne === null) {
    const quoi: string[] = [];
    if (charges === null) quoi.push("vos charges mensuelles");
    if (epargne === null) quoi.push("votre épargne disponible actuelle");
    etapes.push({
      cle: "precaution",
      titre: "Épargne de précaution",
      statut: "inconnu",
      resume:
        "Elle n'existe pas pour rapporter, mais pour qu'un imprévu ne vous oblige pas à vendre au pire moment.",
      calcul: [],
      manque: quoi,
    });
    manque.push(...quoi);
  } else {
    const cible = charges * moisCible;
    const restant = Math.max(0, cible - epargne);
    precautionComplete = restant === 0;
    etapes.push({
      cle: "precaution",
      titre: precautionComplete ? "Épargne de précaution constituée" : "Constituer l'épargne de précaution",
      statut: precautionComplete ? "fait" : "en_cours",
      resume: precautionComplete
        ? `Vous couvrez ${nombreFr(epargne / charges)} mois de charges. C'est la condition pour ne jamais être forcé de vendre.`
        : `Il manque ${euros(restant)} pour couvrir ${moisCible} mois de charges. C'est la première marche, avant tout placement.`,
      calcul: [
        { gauche: "Charges mensuelles", droite: euros(charges) },
        { gauche: `Cible (${moisCible} mois)`, droite: euros(cible) },
        { gauche: "Déjà disponible", droite: euros(epargne) },
        { gauche: precautionComplete ? "Excédent" : "Reste à constituer", droite: euros(Math.abs(cible - epargne)) },
      ],
      manque: [],
    });
  }

  // --- 3. Montant investissable -------------------------------------------
  let investissable: number | null = null;
  if (revenus === null || charges === null) {
    const quoi: string[] = [];
    if (revenus === null) quoi.push("vos revenus mensuels nets");
    if (charges === null && !manque.includes("vos charges mensuelles")) {
      quoi.push("vos charges mensuelles");
    }
    etapes.push({
      cle: "capacite",
      titre: "Ce que vous pouvez investir",
      statut: "inconnu",
      resume: "Ce montant n'est que ce qui reste une fois le reste servi.",
      calcul: [],
      manque: quoi,
    });
    manque.push(...quoi);
  } else {
    const reste = revenus - charges;
    if (reste <= 0) {
      etapes.push({
        cle: "capacite",
        titre: "Ce que vous pouvez investir",
        statut: "a_venir",
        resume:
          "Vos charges déclarées atteignent vos revenus. Investir viendrait après avoir dégagé une marge, pas avant.",
        calcul: [
          { gauche: "Revenus nets", droite: euros(revenus) },
          { gauche: "Charges", droite: euros(charges) },
          { gauche: "Marge", droite: euros(reste) },
        ],
        manque: [],
      });
      investissable = 0;
    } else if (!precautionComplete) {
      const restantPrecaution = epargne !== null ? Math.max(0, charges * moisCible - epargne) : null;
      const mois = restantPrecaution !== null ? Math.ceil(restantPrecaution / reste) : null;
      etapes.push({
        cle: "capacite",
        titre: "Ce que vous pouvez investir",
        statut: "a_venir",
        resume:
          mois !== null
            ? `${euros(arrondiPrudent(reste))} par mois de marge, dirigés vers l'épargne de précaution. Investissement possible dans environ ${mois} mois.`
            : `${euros(arrondiPrudent(reste))} par mois de marge, à diriger d'abord vers l'épargne de précaution.`,
        calcul: [
          { gauche: "Revenus nets", droite: euros(revenus) },
          { gauche: "Charges", droite: euros(charges) },
          { gauche: "Marge mensuelle", droite: euros(arrondiPrudent(reste)) },
        ],
        manque: [],
      });
      investissable = 0;
    } else {
      investissable = arrondiPrudent(reste);
      etapes.push({
        cle: "capacite",
        titre: "Ce que vous pouvez investir",
        statut: "fait",
        resume: `${euros(investissable)} par mois, une fois vos charges payées et votre précaution constituée.`,
        calcul: [
          { gauche: "Revenus nets", droite: euros(revenus) },
          { gauche: "Charges", droite: euros(charges) },
          { gauche: "Investissable, arrondi au plus bas", droite: euros(investissable) },
        ],
        manque: [],
      });
    }
  }

  // --- 4. Taille du ticket -------------------------------------------------
  let ticket: number | null = null;
  if (fraisFixes === null) {
    etapes.push({
      cle: "ticket",
      titre: "Taille minimale d'un ordre",
      statut: "inconnu",
      resume:
        "Un ordre trop petit paie ses frais en pourcentage — et ce pourcentage-là est certain, contrairement au rendement.",
      calcul: [],
      manque: ["les frais fixes par ordre de votre courtier"],
    });
    manque.push("les frais fixes par ordre de votre courtier");
  } else {
    // La commission de change ne se paie QUE hors zone euro. L'inclure toujours
    // gonflerait le ticket minimum de quelqu'un qui achete un fonds cote en
    // euros — c'est-a-dire le cas le plus courant ici — et lui ferait attendre
    // pour rien. Le ticket de reference est donc calcule sans elle, et le cas
    // hors zone euro est chiffre a part plutot que fondu dans un seul nombre.
    ticket = ticketMinimum(fraisFixes, ciblePct, taxePct, 0);
    const ticketHorsEuro = ticketMinimum(fraisFixes, ciblePct, taxePct, changePct);
    if (ticket === null) {
      etapes.push({
        cle: "ticket",
        titre: "Taille minimale d'un ordre",
        statut: "a_venir",
        resume: `La taxe sur l'opération atteint déjà ${pourcent(taxePct)}, soit la cible de ${pourcent(ciblePct)}. Aucun montant ne la respecte : relevez la cible, ou choisissez un support moins taxé.`,
        calcul: [
          { gauche: "Taxe sur l'opération", droite: pourcent(taxePct) },
          { gauche: "Cible de frais", droite: pourcent(ciblePct) },
        ],
        manque: [],
      });
    } else {
      const coutSur = ticket === 0 ? taxePct : (fraisFixes / ticket) * 100 + taxePct;
      const calcul = [
        { gauche: "Frais fixes par ordre", droite: euros(fraisFixes) },
        { gauche: "Taxe sur l'opération", droite: pourcent(taxePct) },
        { gauche: "Ticket minimum", droite: euros(ticket) },
        { gauche: "Frais à ce montant", droite: pourcent(coutSur) },
      ];
      if (changePct > 0) {
        calcul.push({
          gauche: "Hors zone euro (change en plus)",
          droite: ticketHorsEuro === null ? "impossible" : euros(ticketHorsEuro),
        });
      }
      etapes.push({
        cle: "ticket",
        titre: "Taille minimale d'un ordre",
        statut: "fait",
        resume:
          `${euros(ticket)} par ordre pour que les frais restent sous ${pourcent(ciblePct)}. En dessous, vous payez surtout votre courtier.` +
          (changePct > 0
            ? ` Pour un titre coté hors zone euro, la commission de change de ${pourcent(changePct)} porte ce seuil à ${ticketHorsEuro === null ? "un montant inatteignable" : euros(ticketHorsEuro)}.`
            : ""),
        calcul,
        manque: [],
      });
    }
  }

  // --- 5. Rythme -----------------------------------------------------------
  let moisParOrdre: number | null = null;
  if (investissable !== null && investissable > 0 && ticket !== null) {
    moisParOrdre = ticket <= investissable ? 1 : Math.ceil(ticket / investissable);
    const montantOrdre = investissable * moisParOrdre;
    const fraisMensuel = fraisFixes !== null ? (fraisFixes / montantOrdre) * 100 : 0;
    etapes.push({
      cle: "rythme",
      titre: moisParOrdre === 1 ? "Un ordre par mois" : `Un ordre tous les ${moisParOrdre} mois`,
      statut: "fait",
      resume:
        moisParOrdre === 1
          ? `Votre montant mensuel dépasse le ticket minimum : un ordre par mois reste raisonnable.`
          : `En accumulant ${moisParOrdre} mois, l'ordre atteint ${euros(montantOrdre)} et les frais tombent à ${pourcent(fraisMensuel)}.`,
      calcul: [
        { gauche: "Investissable par mois", droite: euros(investissable) },
        { gauche: "Ticket minimum", droite: euros(ticket) },
        { gauche: "Montant par ordre", droite: euros(montantOrdre) },
        { gauche: "Fréquence", droite: moisParOrdre === 1 ? "mensuelle" : `tous les ${moisParOrdre} mois` },
      ],
      manque: [],
    });
  }

  return {
    etapes,
    investissableMensuel: investissable,
    ticketMinimum: ticket,
    moisParOrdre,
    manque: [...new Set(manque)],
    prochaineEtape: prochaine(etapes),
    // Un plan est exploitable des qu'il annonce un montant mensuel, meme nul :
    // « zero pour l'instant, et voici pourquoi » est une reponse.
    exploitable: investissable !== null,
  };
}

// ---------------------------------------------------------------------------
// Ce que le plan lit

/**
 * Cles saisies par l'utilisateur, proposees a l'ecran.
 */
export const CLES_PLAN_SAISIES = [
  "profil.revenus_mensuels_eur",
  "profil.charges_mensuelles_eur",
  "profil.epargne_precaution_eur",
  "profil.mois_precaution",
  "profil.frais_cible_pct",
  "credit.taux_annuel_pct",
] as const;

/**
 * Cles DERIVEES, jamais saisies deux fois.
 *
 * Les frais du courtier vivent deja dans les reglages, ou ils servent aux
 * fiches de piste et au simulateur. Les redemander ici creerait deux sources de
 * verite pour le meme nombre, et la premiere divergence passerait inapercue —
 * un plan calcule sur 2,50 € pendant que les fiches affichent 7,50 €.
 *
 * Elles sont donc injectees dans le contexte au moment de l'evaluation, avec
 * `source: 'calcul'`, a partir de la table `settings`.
 */
export const CLES_PLAN_DERIVEES = [
  "courtier.frais_fixes_eur",
  "courtier.taxe_pct",
  "courtier.change_pct",
] as const;

/** Reglages du courtier, tels que stockes dans `settings`. */
export interface ReglagesCourtier {
  broker_fixed_fee_eur?: number | null;
  transaction_tax_pct?: number | null;
  fx_spread_pct?: number | null;
}

/** Transforme les reglages en faits derives, prets a rejoindre le contexte. */
export function faitsDuCourtier(r: ReglagesCourtier | null, maintenant: Date): Fait[] {
  if (!r) return [];
  const iso = maintenant.toISOString();
  const out: Fait[] = [];
  const pousser = (key: string, v: number | null | undefined) => {
    if (typeof v === "number" && Number.isFinite(v)) {
      out.push({ key, value: v, domain: "courtier", verifiedAt: iso, source: "calcul" });
    }
  };
  pousser("courtier.frais_fixes_eur", r.broker_fixed_fee_eur);
  pousser("courtier.taxe_pct", r.transaction_tax_pct);
  pousser("courtier.change_pct", r.fx_spread_pct);
  return out;
}
