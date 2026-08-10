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

export interface SectionChapitre {
  titre: string;
  paragraphes: string[];
}

export interface Chapitre {
  cle: string;
  numero: number;
  titre: string;
  /** La question a laquelle le chapitre repond, telle qu'on se la pose. */
  question: string;
  /** Duree de lecture estimee, en minutes. */
  minutes: number;
  icone: string;
  sections: SectionChapitre[];
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
    minutes: 6,
    icone: "🧾",
    sections: [
      {
        titre: "Une soustraction, pas une opinion",
        paragraphes: [
          "L'ensemble des investisseurs détient l'ensemble du marché. Ceux qui essaient de le battre et ceux qui se contentent de le suivre se partagent donc exactement la même performance globale, avant frais. Une fois les frais retirés, le premier groupe obtient nécessairement moins que le second, puisqu'il paie davantage pour détenir la même chose.",
          "Ce raisonnement n'est pas une observation de marché que de nouvelles données pourraient démentir : c'est une identité comptable. Elle tient quelle que soit l'époque, le pays, ou le talent des gérants.",
        ],
      },
      {
        titre: "Ce que cela coûte en pratique",
        paragraphes: [
          "Le coût total payé pour tenter de battre le marché a été chiffré à l'échelle d'un pays entier. Il ne se limite pas aux frais de gestion affichés : s'y ajoutent les frais de courtage, l'écart entre prix d'achat et de vente, et l'impact des ordres sur le marché.",
          "Pour vous, à votre échelle, cela se traduit simplement : sur un ticket de 100 €, chaque euro de frais est un euro de performance qu'il faudra regagner avant de commencer à gagner quoi que ce soit. C'est le calcul que l'outil affiche sur chaque fiche.",
        ],
      },
    ],
    etudes: ["sharpe1991", "french2008"],
    appliquer: [
      "Regardez le seuil de rentabilité affiché sur chaque piste avant de regarder l'entreprise elle-même : il ne dépend pas de vos prévisions, seulement de votre courtier et de votre montant.",
      "Comparez ce seuil entre un ticket de 50 € et de 500 € chez le même courtier — c'est le même geste, et pas du tout le même coût relatif.",
      "Vérifiez si votre courtier tarife les ETF différemment des actions : chez certains, c'est la différence entre 2,50 € et 0 € par ordre.",
    ],
    aRetenir:
      "Les frais sont la seule composante de votre rendement qui soit connue à l'avance et entièrement sous votre contrôle.",
  },
  {
    cle: "particuliers",
    numero: 2,
    titre: "Ce que font réellement les particuliers en bourse",
    question: "Les investisseurs individuels battent-ils le marché ?",
    minutes: 7,
    icone: "👥",
    sections: [
      {
        titre: "Le résultat qui a fondé le domaine",
        paragraphes: [
          "L'étude de référence a examiné les relevés réels de dizaines de milliers de ménages sur plusieurs années. Constat central : les titres que ces investisseurs choisissaient n'étaient pas absurdes, mais leur rendement net était nettement inférieur à celui du marché. La différence venait de la fréquence des opérations et de leur coût.",
          "Autrement dit, ce n'est pas d'abord le mauvais choix de société qui coûtait cher, c'était le fait d'échanger souvent.",
        ],
      },
      {
        titre: "Pourquoi on échange trop",
        paragraphes: [
          "Une seconde étude, sur les mêmes données, montre que les groupes qui échangent le plus obtiennent les rendements nets les plus faibles, et propose l'excès de confiance comme explication : plus on se croit informé, plus on agit, et plus on paie.",
          "Le cas extrême a été étudié à l'échelle d'un marché national entier, sur les spéculateurs les plus actifs : une part très minime d'entre eux gagne durablement de l'argent une fois les frais déduits.",
        ],
      },
    ],
    etudes: ["barberOdean2000", "barberOdean2001", "barber2014"],
    appliquer: [
      "Comptez le nombre d'ordres que vous envisagez sur une année : c'est ce nombre, multiplié par vos frais, que votre sélection doit d'abord rembourser.",
      "Le simulateur de cet outil sert exactement à ça : refaire vos gestes sans les payer, et constater après coup ce qu'ils auraient coûté.",
      "Écrivez votre règle de sortie avant d'entrer. Le champ existe sur chaque simulation, et il est là pour réduire les décisions prises dans l'instant.",
    ],
    aRetenir:
      "Ce qui distingue les particuliers perdants des autres tient moins au choix des titres qu'à la fréquence des opérations.",
  },
  {
    cle: "biais",
    numero: 3,
    titre: "Pourquoi on vend ses gagnantes et garde ses perdantes",
    question: "Qu'est-ce qui nous pousse à faire l'inverse de ce qu'on avait prévu ?",
    minutes: 7,
    icone: "🧠",
    sections: [
      {
        titre: "Un réflexe mesuré, pas une impression",
        paragraphes: [
          "Sur des comptes réels, les investisseurs vendent leurs positions en gain nettement plus volontiers que celles en perte. Le nom donné à ce réflexe est l'effet de disposition.",
          "Ce qui le rend coûteux, c'est la suite : les positions gagnantes vendues se sont ensuite mieux comportées que les perdantes conservées. Le réflexe qui donne l'impression de « sécuriser » a donc, en moyenne, retiré du rendement.",
        ],
      },
      {
        titre: "D'où vient ce réflexe",
        paragraphes: [
          "Le mécanisme sous-jacent a été décrit bien avant, en psychologie de la décision : une perte pèse davantage qu'un gain de même montant, et face à une perte on devient preneur de risque. Vendre une gagnante fait exister un gain ; vendre une perdante fait exister une perte, ce que l'on repousse.",
          "Un troisième travail ajoute une dimension pratique : plus on consulte son portefeuille souvent, plus on rencontre de baisses, et moins on supporte le placement — alors que rien n'a changé dans le placement lui-même.",
        ],
      },
    ],
    etudes: ["odean1998", "kahneman1979", "benartzi1995"],
    appliquer: [
      "Formulez votre condition de vente au moment de l'achat, quand aucune somme n'est encore en jeu émotionnellement.",
      "Choisissez délibérément la fréquence à laquelle vous regardez vos positions. La consultation quotidienne n'apporte aucune information sur un horizon de dix ans, mais elle change ce que vous ressentez.",
      "Quand vous envisagez de vendre, demandez-vous si vous rachèteriez cette position aujourd'hui au prix actuel. Si oui, la vente ne vient pas de l'analyse.",
    ],
    aRetenir:
      "Le principal adversaire d'un plan d'investissement est celui qui l'a écrit, quelques mois plus tard.",
  },
  {
    cle: "concentration",
    numero: 4,
    titre: "La plupart des actions ne rapportent rien",
    question: "Choisir quelques belles entreprises, est-ce raisonnable ?",
    minutes: 6,
    icone: "🎲",
    sections: [
      {
        titre: "Une distribution très déséquilibrée",
        paragraphes: [
          "En examinant l'ensemble des actions cotées d'un grand marché sur près d'un siècle, une étude montre que la majorité des titres ont, sur toute leur durée de vie, rapporté moins qu'un placement sans risque à court terme.",
          "La richesse créée par le marché dans son ensemble provient d'une minorité d'entreprises. Le rendement du marché n'est donc pas le rendement typique d'une action : c'est une moyenne tirée vers le haut par quelques exceptions.",
        ],
      },
      {
        titre: "Ce que cela implique pour un petit portefeuille",
        paragraphes: [
          "Si l'essentiel du rendement vient d'une petite fraction de titres, détenir peu de lignes revient à parier que vous en avez attrapé au moins une. Le résultat le plus probable d'un portefeuille concentré n'est pas la moyenne du marché : il est inférieur, parce que la moyenne est tirée par les exceptions que vous n'avez statistiquement pas.",
          "Une littérature plus ancienne s'est demandé combien de titres sont nécessaires pour être réellement diversifié, et trouve un nombre plus élevé que la dizaine souvent avancée. Pour un particulier, la question est aujourd'hui largement résolue autrement : un fonds indiciel détient plusieurs centaines de sociétés en un seul ordre.",
        ],
      },
    ],
    etudes: ["bessembinder2018", "statman1987"],
    appliquer: [
      "Regardez la vue « exposition » du simulateur : elle montre si vos lignes sont réellement réparties ou si elles répètent le même pari.",
      "Distinguez « j'ai cinq positions » de « je suis diversifié ». Cinq sociétés du même pays et du même secteur constituent un seul pari.",
      "Si une piste vous intéresse, demandez-vous ce que vous détiendriez si elle se révélait être l'une des majorités qui ne rapportent rien.",
    ],
    aRetenir:
      "Le rendement moyen du marché n'est pas le rendement d'une action moyenne ; il est produit par une petite minorité de titres.",
  },
  {
    cle: "inities",
    numero: 5,
    titre: "Suivre les initiés : ce que la recherche dit vraiment",
    question: "Les déclarations d'initiés que cet outil affiche sont-elles exploitables ?",
    minutes: 8,
    icone: "🔍",
    sections: [
      {
        titre: "Les dirigeants gagnent, ceux qui les copient moins",
        paragraphes: [
          "Le point de départ est établi de longue date : les dirigeants réalisent des gains anormaux sur les titres de leur propre société. C'est précisément ce que la loi cherche à rendre visible en les obligeant à déclarer.",
          "Mais la même étude ajoute une nuance décisive : un investisseur extérieur qui les imite après la publication officielle ne dégage pas, en moyenne, de quoi couvrir ses frais. L'information est réelle ; ce qui en reste après le délai de publication et les coûts l'est beaucoup moins.",
        ],
      },
      {
        titre: "Toutes les déclarations ne se valent pas",
        paragraphes: [
          "Des travaux plus récents affinent : les achats de dirigeants portent davantage d'information que leurs ventes — un dirigeant vend pour quantité de raisons étrangères à son opinion sur l'entreprise, un achat est moins ambigu. L'effet est plus marqué sur les petites sociétés.",
          "Un troisième travail va plus loin en séparant les dirigeants qui échangent selon un calendrier régulier de ceux qui rompent leurs habitudes. Seuls les seconds portent une information ; les opérations de routine n'annoncent rien.",
        ],
      },
      {
        titre: "Ce que cela dit de cet outil",
        paragraphes: [
          "Cet outil affiche les déclarations d'initiés sans faire cette distinction : il ne sait pas dire si une opération est de routine ou non, faute d'un historique suffisant par dirigeant. Une part de ce qu'il vous montre est donc, selon cette littérature, du bruit.",
          "C'est la raison pour laquelle chaque fiche indique que les motifs d'une opération ne sont jamais déclarés, et pourquoi l'outil ne classe ni ne note les pistes.",
        ],
      },
    ],
    etudes: ["seyhun1986", "lakonishok2001", "cohen2012"],
    appliquer: [
      "Traitez un achat de dirigeant et une vente de dirigeant comme deux informations de nature différente, pas comme un signal et son inverse.",
      "Avant de considérer une piste, comparez le gain anormal moyen rapporté par la littérature — modeste — au seuil de rentabilité affiché sur la fiche. Souvent, le second dépasse le premier.",
      "Servez-vous du simulateur pour éprouver l'idée sur plusieurs pistes plutôt que d'engager de l'argent sur la première qui vous convainc.",
    ],
    aRetenir:
      "Les déclarations d'initiés contiennent une information réelle, souvent inférieure aux frais nécessaires pour l'exploiter.",
  },
  {
    cle: "copier",
    numero: 6,
    titre: "Copier les grands fonds à partir de leurs déclarations",
    question: "Peut-on répliquer un investisseur professionnel via ses positions publiées ?",
    minutes: 5,
    icone: "🗂️",
    sections: [
      {
        titre: "Ce qui a été testé",
        paragraphes: [
          "Des chercheurs ont construit des portefeuilles recopiant les positions publiées par des fonds actifs, puis comparé leur performance à celle des fonds copiés. Résultat : les copies obtiennent des rendements proches, l'économie de frais compensant en partie le retard de publication.",
          "Le détail compte : ce qui a été répliqué, c'est le portefeuille entier, pas une ligne isolée. Et la conclusion dépend étroitement du délai entre la constitution de la position et sa publication.",
        ],
      },
      {
        titre: "La limite pour vous",
        paragraphes: [
          "Les déclarations trimestrielles de portefeuille sont publiées avec un décalage de plusieurs semaines. La position peut avoir été soldée entre-temps, et vous n'en saurez rien avant la publication suivante.",
          "Prélever une seule ligne dans un portefeuille de plusieurs centaines n'est pas non plus ce qui a été étudié : une position isolée peut jouer un rôle de couverture, ou n'être qu'une fraction marginale d'une stratégie d'ensemble.",
        ],
      },
    ],
    etudes: ["frank2004"],
    appliquer: [
      "Lisez la date de dépôt affichée sur chaque piste issue d'un portefeuille trimestriel : c'est l'âge réel de l'information.",
      "Ne confondez pas « ce fonds détient ce titre » avec « ce fonds mise sur ce titre ». Vous voyez une ligne, pas une intention.",
    ],
    aRetenir:
      "Répliquer un portefeuille entier a été étudié ; en prélever une ligne au hasard ne l'a pas été.",
  },
  {
    cle: "duree",
    numero: 7,
    titre: "Le temps réduit-il vraiment le risque ?",
    question: "« Sur le long terme, les actions montent toujours » — est-ce exact ?",
    minutes: 6,
    icone: "⏳",
    sections: [
      {
        titre: "Deux lectures opposées, toutes deux sérieuses",
        paragraphes: [
          "L'observation historique est réelle : sur des périodes longues, les fenêtres perdantes deviennent rares. C'est ce que montre l'onglet Horizon de cet outil, sur données réelles.",
          "Mais un travail marquant conteste l'interprétation. Il observe que le prix d'une assurance contre le fait de terminer sous un placement sans risque augmente avec l'horizon. Si le risque diminuait vraiment avec le temps, cette assurance deviendrait moins chère, pas plus.",
        ],
      },
      {
        titre: "Comment tenir les deux",
        paragraphes: [
          "Les deux constats se concilient : la probabilité de perdre diminue avec la durée, mais l'ampleur de ce que l'on peut perdre augmente. Un rendement médian plus stable ne signifie pas un risque disparu.",
          "S'y ajoute un facteur humain déjà rencontré : plus la période est longue, plus il faudra traverser de baisses sans vendre. Le rendement long terme n'est acquis qu'à celui qui reste, et la difficulté n'est pas statistique mais psychologique.",
        ],
      },
    ],
    etudes: ["bodie1995", "benartzi1995"],
    appliquer: [
      "Dans l'onglet Horizon, regardez la colonne « pire » autant que la médiane : c'est elle qui décrit ce qu'il faudrait supporter.",
      "Posez-vous la question en euros, pas en pourcentages : que feriez-vous si la somme engagée perdait un tiers de sa valeur pendant deux ans ?",
      "Un horizon n'est utile que s'il est tenu. Si l'argent peut être nécessaire avant, l'horizon n'est pas celui que vous croyez.",
    ],
    aRetenir:
      "Historiquement, les périodes longues perdent rarement ; cela ne veut pas dire que le risque disparaît avec le temps.",
  },
  {
    cle: "gerants",
    numero: 8,
    titre: "Talent ou chance : les gérants qui battent le marché",
    question: "Si des professionnels y arrivent, pourquoi pas eux plutôt que moi ?",
    minutes: 6,
    icone: "🎓",
    sections: [
      {
        titre: "La performance passée ne se reproduit guère",
        paragraphes: [
          "Une étude devenue classique montre que la persistance apparente des bons fonds s'explique largement par les frais et par des effets de style connus, plutôt que par le talent du gérant. La persistance la plus fiable concerne les mauvais fonds, qui tendent à le rester.",
          "Un travail ultérieur simule ce que le pur hasard produirait sur un grand nombre de gérants, puis compare. Très peu affichent une performance que la chance seule n'expliquerait pas, une fois les frais déduits.",
        ],
      },
      {
        titre: "La conséquence pratique",
        paragraphes: [
          "Le problème n'est pas qu'aucun gérant n'ait de talent : c'est qu'on ne peut pas l'identifier à l'avance de façon fiable, et que le classement des dernières années n'y suffit pas.",
          "Le même raisonnement s'applique à vous. Une série de bons choix ne prouve pas une compétence tant que le nombre d'observations reste faible — et c'est exactement pourquoi cet outil enregistre vos simulations plutôt que vos impressions.",
        ],
      },
    ],
    etudes: ["carhart1997", "famaFrench2010"],
    appliquer: [
      "Méfiez-vous d'un palmarès sur un an ou trois ans, quel que soit son auteur : la durée est trop courte pour distinguer talent et chance.",
      "Tenez le compte de toutes vos simulations, y compris les mauvaises. Ne retenir que les bonnes revient à reproduire le biais que ces études mesurent.",
    ],
    aRetenir:
      "Battre le marché est possible ; reconnaître à l'avance celui qui y parviendra ne l'est pas de façon fiable.",
  },
  {
    cle: "domestique",
    numero: 9,
    titre: "Le biais domestique",
    question: "Pourquoi ai-je surtout des entreprises de chez moi ?",
    minutes: 4,
    icone: "🗺️",
    sections: [
      {
        titre: "Un déséquilibre général",
        paragraphes: [
          "Les investisseurs de tous les pays détiennent une part très majoritaire d'actions de leur propre pays, bien au-delà du poids de ce pays dans le marché mondial. Le phénomène a été documenté sur les grands marchés développés.",
          "Aucun avantage de rendement identifié ne vient compenser cette concentration. Ce qui reste, c'est une exposition accrue à l'économie d'un seul pays.",
        ],
      },
    ],
    etudes: ["frenchPoterba1991"],
    appliquer: [
      "Regardez la répartition par place de cotation dans la vue « exposition » : elle montre votre biais domestique en un coup d'œil.",
      "Un ETF mondial n'est pas plus exotique qu'une action belge — il est simplement réparti différemment. Comparez les deux expositions, pas les deux réputations.",
    ],
    aRetenir:
      "Préférer les entreprises de son propre pays est un réflexe universel, mesuré, et sans avantage de rendement connu.",
  },
];

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
