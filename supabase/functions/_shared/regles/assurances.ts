/**
 * Domaine « assurances habitation et mutualite ».
 *
 * Quatre regles, toutes deterministes et testees. Ce qu'elles ne font jamais :
 *
 *   - appeler un modele de langage ;
 *   - inventer un montant, un delai ou un plafond ;
 *   - conclure quand une donnee manque — elles annoncent le manque.
 *
 * Elles ne declenchent aucune action. Leur seule sortie est un texte a lire.
 */

import {
  type Brouillon,
  type Contexte,
  type Signal,
  date,
  euros,
  fait,
  isoJour,
  joursEntre,
  moisEcoules,
  nombre,
  nombreSignal,
  signauxDu,
  texte,
} from "./types.ts";

/**
 * Fraction de la valeur assuree au-dela de laquelle des travaux justifient une
 * reevaluation, faute de seuil saisi par l'utilisateur.
 *
 * Exprimee en PROPORTION de la valeur que l'utilisateur a lui-meme declaree,
 * et non en euros. Un seuil en euros serait un chiffre venu d'ailleurs — dix
 * mille euros de travaux ne pesent pas la meme chose sur une maison a 200 000 €
 * et sur un appartement a 90 000 €. Un dixieme reste un choix de produit,
 * assume comme tel et remplacable par le fait `habitation.seuil_travaux_pct`.
 */
export const PART_TRAVAUX_DEFAUT = 0.1;

// ---------------------------------------------------------------------------
// R1 — Sous-assurance apres travaux

/**
 * Etat surveille : le cumul des travaux declares depuis la derniere revision
 * du contrat habitation, rapporte a la valeur assuree.
 *
 * Le mecanisme vise est la regle proportionnelle : quand la valeur declaree
 * d'un bien est inferieure a sa valeur reelle, l'indemnisation d'un sinistre
 * peut etre reduite dans la meme proportion — y compris pour un sinistre
 * partiel, ce qui est le cas contre-intuitif. La proposition invite a le
 * verifier dans le contrat ; elle n'affirme pas ce que ce contrat prevoit.
 */
export function r1SousAssurance(ctx: Contexte): Brouillon[] {
  const valeurAssuree = nombre(ctx, "habitation.valeur_assuree_eur");
  const travaux = nombre(ctx, "habitation.travaux_cumules_eur");
  const reviseLe = date(ctx, "habitation.valeur_revisee_le");

  const manque: string[] = [];
  if (valeurAssuree === null) manque.push("le montant assuré figurant sur votre contrat habitation");
  if (travaux === null) manque.push("le cumul des travaux réalisés depuis la dernière révision");

  if (manque.length > 0) {
    // Ne rien dire serait le pire choix : l'utilisateur ignorerait qu'une
    // verification le concerne. On signale le trou, sans rien supposer.
    return [
      {
        regle: "r1_sous_assurance",
        titre: "Vérification de la valeur assurée : données manquantes",
        severite: "info",
        rationaleMd:
          "Cette vérification compare le montant des travaux réalisés à la valeur assurée de votre habitation. " +
          `Elle ne peut pas être faite tant qu'il manque : ${manque.join(", ")}.\n\n` +
          "Aucune estimation n'a été substituée à ces valeurs.",
        payload: { manque },
        sourceUrls: [],
        donneesManquantes: manque,
        expiresAt: null,
        expliquePar: null,
      },
    ];
  }

  const pct = nombre(ctx, "habitation.seuil_travaux_pct") ?? PART_TRAVAUX_DEFAUT;
  const seuil = valeurAssuree! * pct;
  if (travaux! < seuil) return [];

  const part = (travaux! / valeurAssuree!) * 100;
  const depuis = reviseLe ? `${moisEcoules(reviseLe, ctx.maintenant)} mois` : "une date inconnue";

  return [
    {
      regle: "r1_sous_assurance",
      titre: "Faire réévaluer la valeur assurée de votre habitation",
      severite: "attention",
      rationaleMd:
        `Vous avez déclaré ${euros(travaux!)} de travaux depuis la dernière révision ` +
        `(${depuis}), pour une valeur assurée de ${euros(valeurAssuree!)} — ` +
        `soit ${part.toFixed(0)} % de cette valeur, au-delà du seuil de ` +
        `${(pct * 100).toFixed(0)} % à partir duquel cette vérification se déclenche.\n\n` +
        "**Ce qu'il y a à vérifier.** Quand la valeur déclarée d'un bien est inférieure à sa " +
        "valeur réelle, l'indemnisation d'un sinistre peut être réduite dans la même " +
        "proportion — c'est ce qu'on appelle la règle proportionnelle. Elle s'applique aussi " +
        "aux sinistres partiels, ce qui est le cas auquel on ne pense pas : un dégât de " +
        "5 000 € sur un bien sous-assuré d'un cinquième peut n'être indemnisé qu'à hauteur " +
        "de 4 000 €.\n\n" +
        "Les modalités exactes dépendent de votre contrat. Ouvrez-le, ou demandez à votre " +
        "assureur si la valeur assurée couvre encore le bien après travaux.",
      payload: {
        valeurAssureeEur: valeurAssuree,
        travauxCumulesEur: travaux,
        seuilEur: Math.round(seuil),
        partPct: Number(part.toFixed(1)),
      },
      sourceUrls: [],
      donneesManquantes: [],
      // Une reevaluation prend quelques semaines ; au-dela d'un trimestre la
      // proposition n'est plus un rappel, c'est un reproche.
      expiresAt: isoJour(new Date(ctx.maintenant.getTime() + 90 * 86_400_000)),
      expliquePar: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// R2 — Revue annuelle de mutualite

/** Postes compares. Ce sont ceux qui concernent le foyer, pas une liste generale. */
export const POSTES_MUTUALITE = [
  { cle: "orthodontie", libelle: "Orthodontie" },
  { cle: "psychomotricite", libelle: "Psychomotricité" },
  { cle: "sport", libelle: "Activités sportives" },
  { cle: "sejours_enfants", libelle: "Séjours pour enfants" },
] as const;

interface AvantageCaisse {
  caisse: string;
  sourceUrl: string;
  observeLe: string;
  montants: Record<string, number>;
}

/**
 * Avantages par caisse, reconstruits depuis les signaux.
 *
 * Un signal = une caisse observee a une date, avec l'adresse de la page ou le
 * bareme a ete lu. Le plus recent gagne. Aucun montant n'est jamais genere :
 * s'il n'est pas dans le signal, il n'existe pas pour la regle.
 */
function avantages(signaux: Signal[]): AvantageCaisse[] {
  const parCaisse = new Map<string, AvantageCaisse>();
  for (const s of signaux) {
    const caisse = typeof s.payload.caisse === "string" ? s.payload.caisse : null;
    if (!caisse) continue;
    // Les signaux arrivent tries du plus recent au plus ancien : le premier vu
    // pour une caisse est le bon, les suivants sont des observations perimees.
    if (parCaisse.has(caisse)) continue;

    const montants: Record<string, number> = {};
    for (const p of POSTES_MUTUALITE) {
      const v = nombreSignal(s, p.cle);
      if (v !== null) montants[p.cle] = v;
    }
    parCaisse.set(caisse, {
      caisse,
      sourceUrl: s.sourceUrl,
      observeLe: s.observedAt.slice(0, 10),
      montants,
    });
  }
  return [...parCaisse.values()];
}

export function r2RevueMutualite(ctx: Contexte): Brouillon[] {
  const derniereRevue = date(ctx, "mutualite.derniere_revue_le");
  // Declenchement calendaire : une fois par an, ou immediatement si l'on n'a
  // jamais fait la revue.
  if (derniereRevue && moisEcoules(derniereRevue, ctx.maintenant) < 12) return [];

  const caisses = avantages(signauxDu(ctx, "mutualite"));
  const actuelle = texte(ctx, "mutualite.caisse_actuelle");

  const manque: string[] = [];
  if (caisses.length === 0) {
    manque.push("les barèmes d'au moins une caisse (aucun signal enregistré pour ce domaine)");
  }
  if (!actuelle) manque.push("le nom de votre mutualité actuelle");

  const postesSansDonnee = POSTES_MUTUALITE.filter(
    (p) => !caisses.some((c) => p.cle in c.montants),
  );
  for (const p of postesSansDonnee) {
    manque.push(`les montants « ${p.libelle} » (aucune caisse observée ne les documente)`);
  }

  const sourceUrls = [...new Set(caisses.map((c) => c.sourceUrl))];

  if (caisses.length === 0) {
    return [
      {
        regle: "r2_revue_mutualite",
        titre: "Revue annuelle de mutualité : aucune donnée à comparer",
        severite: "info",
        rationaleMd:
          "La revue annuelle est due, mais aucun barème de caisse n'est enregistré. " +
          "Cette comparaison ne fonctionne qu'avec des montants relevés sur les pages " +
          "officielles des caisses, avec leur adresse — rien n'est estimé ni complété.\n\n" +
          `Il manque : ${manque.join(" ; ")}.`,
        payload: { manque },
        sourceUrls: [],
        donneesManquantes: manque,
        expiresAt: null,
        expliquePar: null,
      },
    ];
  }

  const lignes: string[] = [];
  lignes.push(`| Poste | ${caisses.map((c) => c.caisse).join(" | ")} |`);
  lignes.push(`| --- | ${caisses.map(() => "---:").join(" | ")} |`);
  for (const p of POSTES_MUTUALITE) {
    const cells = caisses.map((c) =>
      p.cle in c.montants ? euros(c.montants[p.cle]) : "non documenté",
    );
    lignes.push(`| ${p.libelle} | ${cells.join(" | ")} |`);
  }

  const totalPar = caisses.map((c) => ({
    caisse: c.caisse,
    total: Object.values(c.montants).reduce((s, v) => s + v, 0),
    postes: Object.keys(c.montants).length,
  }));
  // Comparer des totaux calcules sur des nombres de postes differents ferait
  // gagner la caisse la mieux documentee, pas la plus avantageuse.
  const comparable = new Set(totalPar.map((t) => t.postes)).size === 1 && totalPar.length > 1;
  const meilleure = [...totalPar].sort((a, b) => b.total - a.total)[0];

  return [
    {
      regle: "r2_revue_mutualite",
      titre: "Revue annuelle de mutualité",
      severite: "info",
      rationaleMd:
        (derniereRevue
          ? `Dernière revue il y a ${moisEcoules(derniereRevue, ctx.maintenant)} mois.`
          : "Aucune revue enregistrée à ce jour.") +
        (actuelle ? ` Mutualité actuelle : **${actuelle}**.` : "") +
        "\n\nMontants relevés sur les pages officielles des caisses, aux dates indiquées. " +
        "Aucun chiffre n'a été estimé : un poste non documenté est écrit comme tel.\n\n" +
        `${lignes.join("\n")}\n\n` +
        caisses.map((c) => `- ${c.caisse} — relevé le ${c.observeLe} : ${c.sourceUrl}`).join("\n") +
        (comparable
          ? `\n\nSur les ${Object.keys(caisses[0].montants).length} postes documentés pour toutes ` +
            `les caisses comparées, le cumul le plus élevé est celui de **${meilleure.caisse}**.`
          : "\n\nLes caisses ne documentent pas les mêmes postes : leurs cumuls ne sont pas " +
            "comparables, et aucun classement n'est proposé.") +
        (manque.length > 0 ? `\n\nCe qui manque : ${manque.join(" ; ")}.` : "") +
        "\n\nCes montants sont des plafonds d'intervention, pas des sommes acquises : " +
        "ils dépendent de conditions que seule la caisse peut confirmer.",
      payload: { caisses, comparable },
      sourceUrls,
      donneesManquantes: manque,
      expiresAt: null,
      expliquePar: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// R3 — Assurance solde restant du

/**
 * Declenchee par un evenement : fin ou modification d'un credit.
 *
 * L'assurance solde restant du couvre le capital qui resterait a rembourser au
 * deces de l'emprunteur. Ce capital diminue a chaque mensualite ; la couverture,
 * elle, ne diminue que si le contrat le prevoit. Un credit rembourse par
 * anticipation, ou remanie, casse l'alignement des deux.
 */
export function r3SoldeRestantDu(ctx: Contexte): Brouillon[] {
  const evenements = signauxDu(ctx, "credit").filter((s) => {
    const t = s.payload.evenement;
    return t === "fin" || t === "modification";
  });
  if (evenements.length === 0) return [];

  const s = evenements[0];
  const capitalSignal = nombreSignal(s, "capital_restant_eur");
  const capitalFait = nombre(ctx, "credit.capital_restant_eur");
  const capital = capitalSignal ?? capitalFait;
  const couverture = nombre(ctx, "credit.srd_couverture_eur");

  const manque: string[] = [];
  if (capital === null) manque.push("le capital restant dû après cet événement");
  if (couverture === null) manque.push("le montant couvert par votre assurance solde restant dû");

  const nature = s.payload.evenement === "fin" ? "s'est terminé" : "a été modifié";

  if (manque.length > 0) {
    return [
      {
        regle: "r3_solde_restant_du",
        titre: "Assurance solde restant dû : à vérifier, données manquantes",
        severite: "attention",
        rationaleMd:
          `Un crédit ${nature} (${s.summary}). C'est le moment où la couverture de ` +
          "l'assurance solde restant dû peut cesser de correspondre au capital réellement dû.\n\n" +
          `La comparaison n'a pas pu être faite : il manque ${manque.join(", ")}.\n\n` +
          `Source : ${s.sourceUrl}`,
        payload: { manque, evenement: s.payload.evenement },
        sourceUrls: [s.sourceUrl],
        donneesManquantes: manque,
        expiresAt: null,
        expliquePar: null,
      },
    ];
  }

  const ecart = couverture! - capital!;
  // Un écart nul ou négligeable ne mérite pas d'interrompre quelqu'un.
  if (Math.abs(ecart) < 1) return [];

  const sur = ecart > 0;
  return [
    {
      regle: "r3_solde_restant_du",
      titre: sur
        ? "Assurance solde restant dû : couverture supérieure au capital"
        : "Assurance solde restant dû : couverture inférieure au capital",
      severite: sur ? "info" : "urgent",
      rationaleMd:
        `Un crédit ${nature} (${s.summary}).\n\n` +
        `- Capital restant dû : **${euros(capital!)}**\n` +
        `- Couverture déclarée : **${euros(couverture!)}**\n` +
        `- Écart : **${euros(Math.abs(ecart))}** ${sur ? "de couverture en trop" : "non couverts"}\n\n` +
        (sur
          ? "Vous payez une prime sur un capital que vous ne devez plus. Demandez à votre " +
            "assureur si la couverture peut être ajustée, et ce que cela change à la prime."
          : "Une partie du capital n'est pas couverte. En cas de décès, cette partie resterait " +
            "à charge de vos héritiers. C'est le sens même de ce contrat : vérifiez auprès de " +
            "votre assureur.") +
        `\n\nSource : ${s.sourceUrl}`,
      payload: {
        capitalRestantEur: capital,
        couvertureEur: couverture,
        ecartEur: Math.round(ecart),
        sens: sur ? "sur_couverture" : "sous_couverture",
      },
      sourceUrls: [s.sourceUrl],
      donneesManquantes: [],
      expiresAt: null,
      expliquePar: null,
    },
  ];
}

// ---------------------------------------------------------------------------
// R4 — Echeance et preavis de resiliation

/**
 * La regle qui refuse de se declencher.
 *
 * La date d'echeance est un fait personnel. Le delai de preavis applicable est
 * une valeur reglementaire : il ne vient PAS de ce code. Tant qu'aucun signal
 * sourcé ne le porte, la regle ne produit rien — pas meme une proposition
 * disant que ca manque.
 *
 * C'est volontairement plus strict que R2. Une comparaison de baremes
 * incomplete reste lisible et sans danger : on voit les trous. Un delai de
 * preavis approximatif produit une date, et une date fausse fait manquer une
 * resiliation d'un an. Mieux vaut se taire que se tromper de jour.
 */
export function r4EcheancePreavis(ctx: Contexte): Brouillon[] {
  const echeance = date(ctx, "assurance.echeance_le");
  if (!echeance) return [];

  const signaux = signauxDu(ctx, "assurance_preavis");
  const porteur = signaux.find((s) => nombreSignal(s, "preavis_jours") !== null);
  if (!porteur) return [];

  const preavis = nombreSignal(porteur, "preavis_jours")!;
  const limite = new Date(echeance.getTime() - preavis * 86_400_000);
  const joursAvantLimite = joursEntre(ctx.maintenant, limite);

  // Rien a dire tant que la fenetre n'est pas ouverte, ni une fois passee : une
  // proposition qui annonce une date depassee n'aide personne.
  if (joursAvantLimite > 60 || joursAvantLimite < 0) return [];

  const contrat = texte(ctx, "assurance.contrat") ?? "votre contrat";
  const f = fait(ctx, "assurance.echeance_le");
  const ageJours = f ? joursEntre(new Date(f.verifiedAt), ctx.maintenant) : null;

  return [
    {
      regle: "r4_echeance_preavis",
      titre: `Résiliation de ${contrat} : ${joursAvantLimite} jour${joursAvantLimite > 1 ? "s" : ""} avant la date limite`,
      severite: joursAvantLimite <= 14 ? "urgent" : "attention",
      rationaleMd:
        `Échéance de ${contrat} : **${isoJour(echeance)}**.\n\n` +
        `Le préavis applicable est de **${preavis} jours** — valeur relevée à la source ` +
        `citée ci-dessous, jamais déduite. La date limite d'envoi est donc le ` +
        `**${isoJour(limite)}**, dans ${joursAvantLimite} jour${joursAvantLimite > 1 ? "s" : ""}.\n\n` +
        (ageJours !== null && ageJours > 365
          ? `⚠️ La date d'échéance enregistrée n'a pas été reconfirmée depuis ${Math.floor(ageJours / 30)} mois. ` +
            "Vérifiez-la sur votre contrat avant d'agir sur cette base.\n\n"
          : "") +
        `Préavis relevé le ${porteur.observedAt.slice(0, 10)} : ${porteur.sourceUrl}\n\n` +
        "Ce rappel ne résilie rien et n'envoie rien. Il signale une date.",
      payload: {
        echeance: isoJour(echeance),
        preavisJours: preavis,
        dateLimite: isoJour(limite),
        joursAvantLimite,
      },
      sourceUrls: [porteur.sourceUrl],
      donneesManquantes: [],
      expiresAt: isoJour(limite),
      expliquePar: null,
    },
  ];
}

// ---------------------------------------------------------------------------

export const REGLES_ASSURANCES = {
  r1_sous_assurance: r1SousAssurance,
  r2_revue_mutualite: r2RevueMutualite,
  r3_solde_restant_du: r3SoldeRestantDu,
  r4_echeance_preavis: r4EcheancePreavis,
} as const;

/** Toutes les regles du domaine, dans l'ordre ou elles sont evaluees. */
export function evaluerAssurances(ctx: Contexte): Brouillon[] {
  return Object.values(REGLES_ASSURANCES).flatMap((r) => r(ctx));
}
