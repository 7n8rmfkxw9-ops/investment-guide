/**
 * Cours en chapitres, adosses a des travaux de recherche verifies.
 *
 * Regle de construction : aucun chapitre ne peut affirmer quelque chose qui
 * ne soit pas rattache a une reference du catalogue `etudes.ts`, elle-meme
 * verifiee contre Crossref. Un test le verifie a chaque execution.
 *
 * Ce que ces cours ne sont pas : un programme pour battre le marche. Plusieurs
 * chapitres concluent d'ailleurs a l'inverse de ce qu'un debutant espere, et
 * deux d'entre eux nuancent directement l'interet des donnees que cet outil
 * affiche par ailleurs. C'est voulu — une formation qui ne contredit jamais
 * l'outil qui l'heberge n'est pas une formation.
 *
 * La partie « appliquer » ne dit jamais quoi acheter. Elle traduit un
 * resultat de recherche en question a se poser ou en geste concret, ce qui
 * est la difference entre transmettre une connaissance et donner un conseil.
 */

import { ETUDES } from "./etudes";
import type { Etude } from "./etudes";

/**
 * Une diapositive porte une seule idee.
 *
 * Le cours etait d'abord ecrit en sections de prose : cinq a dix lignes par
 * paragraphe, plusieurs paragraphes par section. Sur un telephone, cela
 * produit un mur de texte que personne ne lit jusqu'au bout — le contenu
 * etait juste, la forme le rendait inutilisable.
 *
 * D'ou ce decoupage. Chaque type correspond a une facon de faire passer une
 * idee : un texte court, un chiffre qui frappe, une liste de points. Le
 * contenu n'a pas ete allege, il a ete redecoupe — et la vue « tout lire »
 * permet de le retrouver d'un seul tenant.
 */
export type Diapo =
  | { type: "idee"; titre: string; texte: string }
  | { type: "chiffre"; valeur: string; legende: string; texte: string }
  | { type: "liste"; titre: string; points: string[] }
  | { type: "citation"; texte: string; source: string };

export interface Chapitre {
  cle: string;
  numero: number;
  titre: string;
  /** La question a laquelle le chapitre repond, telle qu'on se la pose. */
  question: string;
  /** Duree de lecture estimee, en minutes. */
  minutes: number;
  icone: string;
  diapos: Diapo[];
  /** Cles d'etudes du catalogue. Jamais vide. */
  etudes: string[];
  /** Ce que le chapitre change concretement. Jamais une recommandation. */
  appliquer: string[];
  aRetenir: string;
}

export const CHAPITRES: Chapitre[] = [
  {
    cle: "frais",
    numero: 1,
    titre: "Les frais, seule variable que vous maîtrisez",
    question: "Pourquoi commencer par les frais plutôt que par le choix des titres ?",
    minutes: 4,
    icone: "🧾",
    diapos: [
      {
        type: "idee",
        titre: "Tout le monde détient tout le marché",
        texte:
          "Ceux qui essaient de battre le marché et ceux qui se contentent de le suivre se partagent la même performance globale. Avant frais, les deux groupes obtiennent exactement la même chose.",
      },
      {
        type: "idee",
        titre: "Donc après frais, l'un perd",
        texte:
          "Le groupe qui paie davantage pour détenir la même chose obtient nécessairement moins. Ce n'est pas une observation de marché : c'est une soustraction.",
      },
      {
        type: "citation",
        texte:
          "Ce raisonnement tient quelle que soit l'époque, le pays ou le talent des gérants. Aucune donnée future ne peut le démentir.",
        source: "Sharpe, 1991",
      },
      {
        type: "idee",
        titre: "Les frais ne sont pas que la commission",
        texte:
          "S'y ajoutent l'écart entre prix d'achat et de vente, la taxe de bourse, et la commission de change si le titre est coté hors euro. Chacun se paie à l'aller comme au retour.",
      },
      {
        type: "chiffre",
        valeur: "5,00 %",
        legende: "à regagner sur un ticket de 100 €",
        texte:
          "Avec 2,50 € de frais par ordre, c'est ce qu'il faut gagner rien que pour revenir à zéro après un aller-retour. C'est le chiffre que l'outil affiche sur chaque fiche.",
      },
      {
        type: "idee",
        titre: "Le seul chiffre connu d'avance",
        texte:
          "Vous ne savez pas ce que fera un cours. Vous savez exactement ce que coûtera votre ordre. C'est pour cela que ce chapitre vient en premier.",
      },
    ],
    etudes: ["sharpe1991", "french2008"],
    appliquer: [
      "Regardez le seuil de rentabilité d'une piste avant de regarder l'entreprise : il ne dépend d'aucune prévision.",
      "Comparez ce seuil entre 50 € et 500 € chez le même courtier — même geste, coût relatif dix fois moindre.",
      "Vérifiez si votre courtier tarife les ETF différemment des actions : chez certains, c'est 0 € contre 2,50 €.",
    ],
    aRetenir:
      "Les frais sont la seule composante de votre rendement connue à l'avance et entièrement sous votre contrôle.",
  },
  {
    cle: "particuliers",
    numero: 2,
    titre: "Ce que font réellement les particuliers",
    question: "Les investisseurs individuels battent-ils le marché ?",
    minutes: 5,
    icone: "👥",
    diapos: [
      {
        type: "idee",
        titre: "Des relevés réels, pas un sondage",
        texte:
          "L'étude fondatrice a examiné les comptes de dizaines de milliers de ménages sur plusieurs années. Pas des intentions déclarées : des ordres réellement passés.",
      },
      {
        type: "idee",
        titre: "Le résultat surprend",
        texte:
          "Les titres choisis n'étaient pas absurdes. Pourtant le rendement net était nettement inférieur au marché. La différence ne venait pas du choix, mais de la fréquence des opérations.",
      },
      {
        type: "citation",
        texte:
          "Ce n'est pas d'abord la mauvaise société qui coûte cher. C'est le fait d'échanger souvent.",
        source: "Barber & Odean, 2000",
      },
      {
        type: "idee",
        titre: "Pourquoi échange-t-on autant ?",
        texte:
          "Les groupes qui échangent le plus obtiennent les rendements nets les plus faibles. L'excès de confiance est l'explication proposée : plus on se croit informé, plus on agit, et plus on paie.",
      },
      {
        type: "idee",
        titre: "Le cas extrême",
        texte:
          "Sur l'intégralité des opérations d'un marché national, une part infime des spéculateurs très actifs gagne durablement de l'argent une fois les frais déduits. La grande majorité perd.",
      },
    ],
    etudes: ["barberOdean2000", "barberOdean2001", "barber2014"],
    appliquer: [
      "Comptez les ordres que vous envisagez sur un an : c'est ce total de frais que votre sélection doit d'abord rembourser.",
      "Le simulateur sert exactement à ça : refaire vos gestes sans les payer, et constater après coup ce qu'ils auraient coûté.",
      "Écrivez votre règle de sortie avant d'entrer. Le champ existe sur chaque simulation.",
    ],
    aRetenir:
      "Ce qui distingue les particuliers perdants tient moins au choix des titres qu'à la fréquence des opérations.",
  },
  {
    cle: "biais",
    numero: 3,
    titre: "Pourquoi on vend ses gagnantes",
    question: "Qu'est-ce qui nous pousse à faire l'inverse de ce qu'on avait prévu ?",
    minutes: 5,
    icone: "🧠",
    diapos: [
      {
        type: "idee",
        titre: "Un réflexe mesuré",
        texte:
          "Sur des comptes réels, les investisseurs vendent leurs positions en gain bien plus volontiers que celles en perte. Ce réflexe porte un nom : l'effet de disposition.",
      },
      {
        type: "idee",
        titre: "Et il coûte de l'argent",
        texte:
          "Les gagnantes vendues se sont ensuite mieux comportées que les perdantes conservées. Le geste qui donne l'impression de « sécuriser » a, en moyenne, retiré du rendement.",
      },
      {
        type: "idee",
        titre: "D'où vient ce réflexe",
        texte:
          "Une perte pèse psychologiquement plus lourd qu'un gain de même montant. Vendre une gagnante fait exister un gain ; vendre une perdante fait exister une perte, ce qu'on repousse.",
      },
      {
        type: "idee",
        titre: "Regarder souvent change la décision",
        texte:
          "Plus on consulte son portefeuille, plus on rencontre de baisses, et moins on supporte le placement — alors que rien n'a changé dans le placement lui-même.",
      },
      {
        type: "citation",
        texte:
          "Le principal adversaire d'un plan d'investissement est celui qui l'a écrit, quelques mois plus tard.",
        source: "Odean 1998 · Kahneman & Tversky 1979 · Benartzi & Thaler 1995",
      },
    ],
    etudes: ["odean1998", "kahneman1979", "benartzi1995"],
    appliquer: [
      "Formulez votre condition de vente au moment de l'achat, quand rien n'est encore engagé émotionnellement.",
      "Choisissez délibérément la fréquence à laquelle vous regardez vos positions.",
      "Avant de vendre, demandez-vous si vous rachèteriez cette position aujourd'hui au prix actuel. Si oui, la vente ne vient pas de l'analyse.",
    ],
    aRetenir:
      "Le principal adversaire d'un plan d'investissement est celui qui l'a écrit, quelques mois plus tôt.",
  },
  {
    cle: "concentration",
    numero: 4,
    titre: "La plupart des actions ne rapportent rien",
    question: "Choisir quelques belles entreprises, est-ce raisonnable ?",
    minutes: 4,
    icone: "🎲",
    diapos: [
      {
        type: "idee",
        titre: "Un siècle, toutes les actions cotées",
        texte:
          "Une étude a examiné l'ensemble des actions d'un grand marché sur près de cent ans, en mesurant ce que chaque titre a rapporté sur toute sa durée de vie.",
      },
      {
        type: "chiffre",
        valeur: "la majorité",
        legende: "des actions ont rapporté moins qu'un placement sans risque",
        texte:
          "Sur toute leur durée de vie, la plupart des titres ont fait moins bien qu'un simple placement de trésorerie à court terme.",
      },
      {
        type: "idee",
        titre: "La richesse vient d'une minorité",
        texte:
          "Le rendement du marché entier est produit par une petite fraction d'entreprises. La moyenne du marché n'est donc pas le rendement d'une action moyenne : elle est tirée vers le haut par des exceptions.",
      },
      {
        type: "idee",
        titre: "Ce que ça implique pour peu de lignes",
        texte:
          "Détenir quelques titres revient à parier que vous avez attrapé une de ces exceptions. Le résultat le plus probable d'un portefeuille concentré n'est pas la moyenne du marché : il est en dessous.",
      },
      {
        type: "idee",
        titre: "Cinq lignes ne font pas une répartition",
        texte:
          "Il faut nettement plus de titres qu'on ne le croit pour être réellement diversifié. Pour un particulier, la question se règle autrement : un fonds indiciel détient des centaines de sociétés en un seul ordre.",
      },
    ],
    etudes: ["bessembinder2018", "statman1987"],
    appliquer: [
      "Ouvrez la vue « exposition » du simulateur : elle montre si vos lignes sont réparties ou si elles répètent le même pari.",
      "Distinguez « j'ai cinq positions » de « je suis diversifié ». Cinq sociétés du même pays et du même secteur constituent un seul pari.",
      "Devant une piste, demandez-vous ce que vous détiendriez si elle appartenait à la majorité qui ne rapporte rien.",
    ],
    aRetenir:
      "Le rendement moyen du marché n'est pas celui d'une action moyenne : il est produit par une minorité de titres.",
  },
  {
    cle: "inities",
    numero: 5,
    titre: "Suivre les initiés",
    question: "Les déclarations d'initiés que cet outil affiche sont-elles exploitables ?",
    minutes: 6,
    icone: "🔍",
    diapos: [
      {
        type: "idee",
        titre: "Les dirigeants gagnent, c'est établi",
        texte:
          "Les dirigeants réalisent des gains anormaux sur les titres de leur propre société. C'est précisément ce que la loi cherche à rendre visible en les obligeant à déclarer.",
      },
      {
        type: "idee",
        titre: "Ceux qui les copient, beaucoup moins",
        texte:
          "Un investisseur extérieur qui les imite après la publication officielle ne dégage pas, en moyenne, de quoi couvrir ses frais. L'information est réelle ; ce qui en reste après le délai et les coûts l'est nettement moins.",
      },
      {
        type: "idee",
        titre: "Un achat n'est pas l'inverse d'une vente",
        texte:
          "Les achats de dirigeants portent plus d'information que leurs ventes. On vend pour quantité de raisons étrangères à son opinion sur l'entreprise ; on achète pour beaucoup moins.",
      },
      {
        type: "idee",
        titre: "Routine ou rupture d'habitude",
        texte:
          "En séparant les dirigeants qui échangent selon un calendrier régulier de ceux qui rompent leurs habitudes, seuls les seconds portent une information. Les opérations de routine n'annoncent rien.",
      },
      {
        type: "citation",
        texte:
          "Cet outil ne fait pas cette distinction : il ne sait pas dire si une opération est de routine, faute d'historique par dirigeant. Une part de ce qu'il vous montre est donc du bruit.",
        source: "Ce que cela dit de cet outil",
      },
      {
        type: "idee",
        titre: "Comparez les deux nombres",
        texte:
          "Le gain anormal rapporté par la littérature est modeste. Le seuil de rentabilité affiché sur la fiche est souvent supérieur. C'est cette comparaison qui décide, pas l'intuition.",
      },
    ],
    etudes: ["seyhun1986", "lakonishok2001", "cohen2012"],
    appliquer: [
      "Traitez un achat et une vente de dirigeant comme deux informations de nature différente, pas comme un signal et son contraire.",
      "Mettez côte à côte le gain anormal moyen de la littérature et le seuil de rentabilité de la fiche.",
      "Éprouvez l'idée sur plusieurs pistes au simulateur plutôt que d'engager de l'argent sur la première qui convainc.",
    ],
    aRetenir:
      "Les déclarations d'initiés contiennent une information réelle, souvent inférieure aux frais nécessaires pour l'exploiter.",
  },
  {
    cle: "copier",
    numero: 6,
    titre: "Copier les grands fonds",
    question: "Peut-on répliquer un professionnel via ses positions publiées ?",
    minutes: 3,
    icone: "🗂️",
    diapos: [
      {
        type: "idee",
        titre: "Ce qui a été testé",
        texte:
          "Des chercheurs ont construit des portefeuilles recopiant les positions publiées par des fonds actifs. Résultat : des rendements proches des fonds copiés, l'économie de frais compensant en partie le retard de publication.",
      },
      {
        type: "idee",
        titre: "Le détail qui change tout",
        texte:
          "Ce qui a été répliqué, c'est le portefeuille entier. Pas une ligne prélevée dedans. Une position isolée peut être une couverture, ou une fraction marginale d'une stratégie d'ensemble.",
      },
      {
        type: "idee",
        titre: "L'âge de l'information",
        texte:
          "Les portefeuilles trimestriels sont publiés avec plusieurs semaines de décalage. La position peut avoir été soldée entre-temps, et vous ne le saurez qu'à la publication suivante.",
      },
    ],
    etudes: ["frank2004"],
    appliquer: [
      "Lisez la date de dépôt sur chaque piste issue d'un portefeuille trimestriel : c'est l'âge réel de l'information.",
      "Ne confondez pas « ce fonds détient ce titre » et « ce fonds mise sur ce titre ». Vous voyez une ligne, pas une intention.",
    ],
    aRetenir:
      "Répliquer un portefeuille entier a été étudié ; en prélever une ligne au hasard ne l'a pas été.",
  },
  {
    cle: "duree",
    numero: 7,
    titre: "Le temps réduit-il le risque ?",
    question: "« Sur le long terme, les actions montent toujours » — est-ce exact ?",
    minutes: 4,
    icone: "⏳",
    diapos: [
      {
        type: "idee",
        titre: "L'observation est réelle",
        texte:
          "Sur des périodes longues, les fenêtres perdantes deviennent rares. C'est ce que montre l'onglet Horizon de cet outil, sur données réelles.",
      },
      {
        type: "idee",
        titre: "Mais l'interprétation est contestée",
        texte:
          "Le prix d'une assurance contre le fait de terminer sous un placement sans risque augmente avec l'horizon. Si le risque diminuait vraiment avec le temps, cette assurance deviendrait moins chère, pas plus.",
      },
      {
        type: "idee",
        titre: "Comment tenir les deux",
        texte:
          "La probabilité de perdre diminue avec la durée. L'ampleur de ce qu'on peut perdre augmente. Un résultat médian plus stable ne signifie pas un risque disparu.",
      },
      {
        type: "citation",
        texte:
          "Le rendement long terme n'est acquis qu'à celui qui reste. La difficulté n'est pas statistique, elle est psychologique.",
        source: "Bodie 1995 · Benartzi & Thaler 1995",
      },
    ],
    etudes: ["bodie1995", "benartzi1995"],
    appliquer: [
      "Dans l'onglet Horizon, regardez la colonne « pire » autant que la médiane : c'est elle qui décrit ce qu'il faudrait supporter.",
      "Posez la question en euros : que feriez-vous si la somme engagée perdait un tiers de sa valeur pendant deux ans ?",
      "Si l'argent peut être nécessaire avant l'échéance, l'horizon n'est pas celui que vous croyez.",
    ],
    aRetenir:
      "Historiquement les périodes longues perdent rarement ; cela ne veut pas dire que le risque disparaît avec le temps.",
  },
  {
    cle: "gerants",
    numero: 8,
    titre: "Talent ou chance",
    question: "Si des professionnels y arrivent, pourquoi pas eux plutôt que moi ?",
    minutes: 4,
    icone: "🎯",
    diapos: [
      {
        type: "idee",
        titre: "Les bons fonds restent-ils bons ?",
        texte:
          "La persistance apparente des bons fonds s'explique largement par les frais et par des effets de style connus, plutôt que par le talent du gérant.",
      },
      {
        type: "idee",
        titre: "Ce qui persiste vraiment",
        texte:
          "La persistance la plus fiable concerne les mauvais fonds : ceux-là tendent à le rester. Les bons, beaucoup moins.",
      },
      {
        type: "idee",
        titre: "Simuler le hasard pur",
        texte:
          "En simulant ce que la chance seule produirait sur un grand nombre de gérants, très peu affichent une performance que le hasard n'expliquerait pas, une fois les frais déduits.",
      },
      {
        type: "idee",
        titre: "Le même raisonnement s'applique à vous",
        texte:
          "Une série de bons choix ne prouve pas une compétence tant que les observations sont peu nombreuses. C'est pourquoi cet outil enregistre vos simulations plutôt que vos impressions.",
      },
    ],
    etudes: ["carhart1997", "famaFrench2010"],
    appliquer: [
      "Méfiez-vous d'un palmarès sur un an ou trois ans : la durée est trop courte pour distinguer talent et chance.",
      "Tenez le compte de toutes vos simulations, y compris les mauvaises. Ne retenir que les bonnes reproduit le biais que ces études mesurent.",
    ],
    aRetenir:
      "Battre le marché est possible ; reconnaître à l'avance celui qui y parviendra ne l'est pas de façon fiable.",
  },
  {
    cle: "domestique",
    numero: 9,
    titre: "Le biais domestique",
    question: "Pourquoi ai-je surtout des entreprises de chez moi ?",
    minutes: 3,
    icone: "🗺️",
    diapos: [
      {
        type: "idee",
        titre: "Un réflexe universel",
        texte:
          "Les investisseurs de tous les pays détiennent une part écrasante d'actions de leur propre pays, très au-delà du poids de ce pays dans le marché mondial.",
      },
      {
        type: "idee",
        titre: "Sans contrepartie identifiée",
        texte:
          "Aucun avantage de rendement connu ne vient compenser cette concentration. Ce qui reste, c'est une exposition accrue à l'économie d'un seul pays.",
      },
      {
        type: "idee",
        titre: "Familier n'est pas moins risqué",
        texte:
          "Un ETF mondial n'est pas plus exotique qu'une action belge : il est réparti différemment. Ce qui change, c'est l'exposition, pas la réputation.",
      },
    ],
    etudes: ["frenchPoterba1991"],
    appliquer: [
      "Regardez la répartition par place de cotation dans la vue « exposition » : votre biais domestique s'y voit en un coup d'œil.",
      "Comparez deux expositions, pas deux réputations.",
    ],
    aRetenir:
      "Préférer les entreprises de son propre pays est un réflexe universel, mesuré, et sans avantage de rendement connu.",
  },
];

/**
 * Diapositives reellement projetees pour un chapitre.
 *
 * Les diapositives pedagogiques viennent du chapitre ; la fin est toujours la
 * meme et n'est donc pas repetee dans les donnees : une diapositive par etude
 * citee, puis « appliquer », puis « a retenir ». Cela garantit qu'aucun
 * chapitre ne puisse etre publie sans ses sources.
 */
export type DiapoProjetee =
  | { kind: "contenu"; diapo: Diapo }
  | { kind: "etude"; cle: string }
  | { kind: "appliquer"; points: string[] }
  | { kind: "retenir"; texte: string };

export function construireDiapos(c: Chapitre): DiapoProjetee[] {
  return [
    ...c.diapos.map((d) => ({ kind: "contenu" as const, diapo: d })),
    ...c.etudes.map((cle) => ({ kind: "etude" as const, cle })),
    { kind: "appliquer" as const, points: c.appliquer },
    { kind: "retenir" as const, texte: c.aRetenir },
  ];
}

/** Etudes d'un chapitre, resolues depuis le catalogue. */
export function etudesDuChapitre(c: Chapitre): Etude[] {
  return c.etudes.map((k) => ETUDES[k]).filter(Boolean);
}

/** Duree totale de lecture, en minutes. */
export function dureeTotale(): number {
  return CHAPITRES.reduce((s, c) => s + c.minutes, 0);
}

/** Nombre de references distinctes mobilisees par l'ensemble des cours. */
export function nombreReferences(): number {
  return new Set(CHAPITRES.flatMap((c) => c.etudes)).size;
}

// ---------------------------------------------------------------------------
// Navigation dans un diaporama

/**
 * Index de la diapositive atteinte apres un deplacement de `pas`.
 *
 * Borne aux extremites plutot que circulaire : revenir a la premiere
 * diapositive apres la derniere donnerait l'impression d'avoir manque
 * quelque chose, alors que le chapitre est termine.
 */
export function indexApres(courant: number, pas: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(total - 1, Math.max(0, courant + pas));
}

/**
 * Le plein ecran natif est-il disponible ?
 *
 * Safari sur iPhone ne l'implemente pas — `requestFullscreen` y est
 * simplement absent. Un bouton qui se contenterait de l'appeler ne ferait
 * donc rien sur l'appareil vise en priorite par cette application. C'est
 * pourquoi le mode immersif de l'interface ne depend pas de cette API : elle
 * n'est qu'un supplement la ou elle existe.
 */
export function pleinEcranNatifDisponible(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: unknown;
  };
  return (
    typeof el.requestFullscreen === "function" ||
    typeof el.webkitRequestFullscreen === "function"
  );
}

// ---------------------------------------------------------------------------
// Progression

const CLE_STOCKAGE = "cours-chapitres-lus";

/**
 * La progression vit dans le navigateur et non en base.
 *
 * Deux raisons : elle n'a d'interet que pour son proprietaire, et la stocker
 * cote serveur imposerait une migration et un redeploiement de fonction pour
 * une information qui ne vaut pas ce prix. L'inconvenient assume est qu'elle
 * ne suit pas d'un appareil a l'autre.
 */
export function chapitresLus(): string[] {
  try {
    const brut = localStorage.getItem(CLE_STOCKAGE);
    const v = brut ? JSON.parse(brut) : [];
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    // Mode navigation privee, quota plein, stockage desactive : la lecture
    // des cours ne doit pas en dependre.
    return [];
  }
}

export function basculerLu(cle: string): string[] {
  const actuels = chapitresLus();
  const suivants = actuels.includes(cle)
    ? actuels.filter((c) => c !== cle)
    : [...actuels, cle];
  try {
    localStorage.setItem(CLE_STOCKAGE, JSON.stringify(suivants));
  } catch {
    /* la progression n'est pas essentielle : on n'interrompt pas la lecture */
  }
  return suivants;
}
