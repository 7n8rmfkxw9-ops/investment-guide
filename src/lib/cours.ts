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
  | { type: "citation"; texte: string; source: string }
  /** Terme defini precisement, comme dans un glossaire de cours. */
  | { type: "definition"; terme: string; definition: string; precision?: string }
  /** Formule, avec chaque symbole nomme et une lecture en francais. */
  | {
      type: "formule";
      titre: string;
      formule: string;
      termes: { sym: string; sens: string }[];
      lecture: string;
    }
  /** Exemple chiffre, deroule etape par etape. */
  | {
      type: "exemple";
      titre: string;
      etapes: { calcul: string; resultat: string }[];
      conclusion: string;
    }
  /** Idee fausse repandue, corrigee. */
  | { type: "piege"; titre: string; croyance: string; realite: string };

/**
 * Parties du programme.
 *
 * Un cours universitaire progresse : on ne parle pas d'anomalies de marche
 * avant d'avoir defini le rendement. L'ordre des parties est celui de la
 * dependance logique, pas celui de l'interet.
 */
export type ClePartie =
  | "fondations"
  | "risque"
  | "efficience"
  | "comportement"
  | "application";

export interface Partie {
  cle: ClePartie;
  titre: string;
  sousTitre: string;
}

export const PARTIES: Partie[] = [
  {
    cle: "fondations",
    titre: "I. Fondations",
    sousTitre: "Le vocabulaire et les calculs sur lesquels tout le reste repose.",
  },
  {
    cle: "risque",
    titre: "II. Risque et diversification",
    sousTitre: "Ce qu'est le risque, comment on le mesure, comment on le réduit.",
  },
  {
    cle: "efficience",
    titre: "III. Les marchés sont-ils efficients ?",
    sousTitre: "La thèse dominante, ses anomalies et ses contradicteurs.",
  },
  {
    cle: "comportement",
    titre: "IV. Le facteur humain",
    sousTitre: "Ce que font réellement les investisseurs, et ce que ça leur coûte.",
  },
  {
    cle: "application",
    titre: "V. Application aux données de cet outil",
    sousTitre: "Ce que la recherche dit des signaux que l'application affiche.",
  },
];

/** Question a choix unique, pour verifier qu'on a compris et non survole. */
export interface Question {
  question: string;
  options: string[];
  /** Index de la bonne reponse dans `options`. */
  bonne: number;
  explication: string;
}

export interface Chapitre {
  cle: string;
  numero: number;
  partie: ClePartie;
  /**
   * Un chapitre « arithmetique » ne repose sur aucune etude : c'est du calcul,
   * verifiable au crayon. Le distinguer evite deux malhonnetetes symetriques —
   * citer une etude qui ne dit pas ce qu'on lui fait dire pour respecter une
   * regle, ou laisser croire qu'une identite mathematique est un resultat
   * empirique contestable.
   */
  nature: "empirique" | "arithmetique";
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
  /** Auto-evaluation de fin de chapitre. */
  quiz: Question[];
}

export const CHAPITRES: Chapitre[] = [
  {
    cle: "temps",
    numero: 1,
    partie: "fondations",
    nature: "arithmetique",
    titre: "La valeur temps de l'argent",
    question: "Pourquoi 100 € aujourd'hui ne valent pas 100 € dans dix ans ?",
    minutes: 6,
    icone: "⏱️",
    diapos: [
      {
        type: "definition",
        terme: "Valeur temps de l'argent",
        definition:
          "Principe selon lequel une somme disponible aujourd'hui vaut davantage que la même somme plus tard, parce qu'elle peut être placée entre-temps.",
        precision:
          "C'est le fondement de tout le reste : sans lui, on ne peut comparer ni deux placements, ni un placement et une dette.",
      },
      {
        type: "formule",
        titre: "Capitalisation",
        formule: "Vₙ = V₀ × (1 + r)ⁿ",
        termes: [
          { sym: "V₀", sens: "somme placée aujourd'hui" },
          { sym: "r", sens: "rendement par période, en décimal (5 % → 0,05)" },
          { sym: "n", sens: "nombre de périodes" },
          { sym: "Vₙ", sens: "somme obtenue au bout de n périodes" },
        ],
        lecture:
          "On multiplie par (1 + r) une fois par période. L'exposant est ce qui rend le résultat non intuitif.",
      },
      {
        type: "exemple",
        titre: "1 000 € à 6 % par an",
        etapes: [
          { calcul: "Après 1 an : 1 000 × 1,06", resultat: "1 060 €" },
          { calcul: "Après 10 ans : 1 000 × 1,06¹⁰", resultat: "1 791 €" },
          { calcul: "Après 30 ans : 1 000 × 1,06³⁰", resultat: "5 743 €" },
        ],
        conclusion:
          "Tripler la durée ne triple pas le gain : il est multiplié par plus de six. C'est l'effet de l'exposant, pas du taux.",
      },
      {
        type: "piege",
        titre: "L'erreur la plus courante",
        croyance: "6 % pendant 30 ans, c'est 180 % de gain.",
        realite:
          "C'est 474 %. Multiplier le taux par la durée revient à ignorer que les intérêts produisent eux-mêmes des intérêts.",
      },
      {
        type: "formule",
        titre: "Actualisation — l'opération inverse",
        formule: "V₀ = Vₙ ÷ (1 + r)ⁿ",
        termes: [
          { sym: "Vₙ", sens: "somme attendue dans n périodes" },
          { sym: "r", sens: "taux d'actualisation par période" },
          { sym: "V₀", sens: "ce que cette somme future vaut aujourd'hui" },
        ],
        lecture:
          "Ramener une somme future à aujourd'hui. C'est ainsi qu'on évalue une action : la somme actualisée de ce qu'elle rapportera.",
      },
      {
        type: "idee",
        titre: "La règle de 72",
        texte:
          "Divisez 72 par le rendement annuel en pourcentage : vous obtenez le nombre d'années pour doubler. À 6 %, environ douze ans. Approximation de tête, mais fiable entre 4 et 12 %.",
      },
    ],
    etudes: [],
    appliquer: [
      "Avant de comparer deux placements, ramenez-les à la même durée : un rendement annuel ne se compare pas à un rendement total.",
      "Quand un rendement vous est annoncé, demandez sur quelle période il porte. « 40 % » sur dix ans font 3,4 % par an.",
    ],
    aRetenir:
      "L'exposant fait tout le travail : c'est la durée, plus que le taux, qui produit l'essentiel du résultat final.",
    quiz: [
      {
        question: "1 000 € placés à 7 % pendant 20 ans donnent environ :",
        options: ["2 400 €", "3 870 €", "1 400 €", "14 000 €"],
        bonne: 1,
        explication:
          "1 000 × 1,07²⁰ ≈ 3 870 €. L'intuition linéaire (1 000 + 20 × 70 = 2 400) sous-estime largement.",
      },
      {
        question: "Actualiser une somme, c'est :",
        options: [
          "La corriger de l'inflation",
          "Calculer ce qu'une somme future vaut aujourd'hui",
          "La convertir en devise étrangère",
          "Retirer les frais",
        ],
        bonne: 1,
        explication:
          "C'est l'opération inverse de la capitalisation. L'inflation est une question distincte, traitée au chapitre 4.",
      },
    ],
  },
  {
    cle: "mesurer",
    numero: 2,
    partie: "fondations",
    nature: "arithmetique",
    titre: "Mesurer un rendement sans se tromper",
    question: "Pourquoi la moyenne des rendements annuels est-elle trompeuse ?",
    minutes: 6,
    icone: "📐",
    diapos: [
      {
        type: "definition",
        terme: "Rendement arithmétique",
        definition:
          "La moyenne simple des rendements de chaque période : on additionne et on divise par le nombre de périodes.",
        precision: "C'est celui que citent la plupart des publicités.",
      },
      {
        type: "definition",
        terme: "Rendement géométrique",
        definition:
          "Le taux constant qui, appliqué chaque période, aurait produit le résultat final réellement obtenu.",
        precision:
          "C'est le seul qui décrive ce que vous avez vraiment gagné. On l'appelle aussi rendement annualisé.",
      },
      {
        type: "exemple",
        titre: "+50 % puis −50 %",
        etapes: [
          { calcul: "Moyenne arithmétique : (50 − 50) ÷ 2", resultat: "0 %" },
          { calcul: "Réalité : 100 € × 1,5 × 0,5", resultat: "75 €" },
          { calcul: "Rendement géométrique : √0,75 − 1", resultat: "−13,4 % par an" },
        ],
        conclusion:
          "La moyenne annonce l'équilibre, la réalité est une perte d'un quart. L'écart n'est pas une subtilité : il vient de la volatilité elle-même.",
      },
      {
        type: "idee",
        titre: "La règle générale",
        texte:
          "Le rendement géométrique est toujours inférieur ou égal à l'arithmétique, et l'écart grandit avec la volatilité. Deux placements de même moyenne n'ont donc pas la même valeur finale.",
      },
      {
        type: "formule",
        titre: "Annualiser un rendement total",
        formule: "rₐₙ = (Vfin ÷ Vdébut)^(1/n) − 1",
        termes: [
          { sym: "Vdébut / Vfin", sens: "valeurs de départ et d'arrivée" },
          { sym: "n", sens: "nombre d'années" },
        ],
        lecture:
          "C'est exactement ce calcul que fait l'onglet Horizon pour chaque période observée.",
      },
      {
        type: "piege",
        titre: "Le piège du rendement affiché",
        croyance: "Ce fonds a fait 12 % de moyenne, donc j'aurais gagné 12 % par an.",
        realite:
          "Seulement si « moyenne » désigne le géométrique. Si c'est l'arithmétique, votre résultat réel a été inférieur — d'autant plus que le fonds était volatil.",
      },
    ],
    etudes: [],
    appliquer: [
      "Devant un rendement annoncé, cherchez le mot « annualisé » ou « géométrique ». En son absence, supposez le chiffre flatteur.",
      "Comparez toujours des valeurs finales, pas des moyennes de pourcentages.",
    ],
    aRetenir:
      "Seul le rendement géométrique décrit ce que vous avez réellement gagné ; l'arithmétique flatte d'autant plus que le placement est volatil.",
    quiz: [
      {
        question: "Un placement fait +100 % puis −50 %. Vous avez :",
        options: ["Gagné 25 %", "Perdu 25 %", "Ni gagné ni perdu", "Doublé"],
        bonne: 2,
        explication:
          "100 × 2 × 0,5 = 100. La moyenne arithmétique (+25 %) suggère un gain qui n'existe pas.",
      },
      {
        question: "L'écart entre rendement arithmétique et géométrique grandit avec :",
        options: ["Les frais", "La volatilité", "La durée", "L'inflation"],
        bonne: 1,
        explication:
          "Plus les rendements varient d'une période à l'autre, plus la moyenne simple surestime le résultat réel.",
      },
    ],
  },
  {
    cle: "frais",
    numero: 3,
    partie: "fondations",
    nature: "empirique",
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
        type: "formule",
        titre: "Seuil de rentabilité d'un aller-retour",
        formule: "s = 2 × (f ÷ M) + 2t + 2x",
        termes: [
          { sym: "f", sens: "frais fixes par ordre, en euros" },
          { sym: "M", sens: "montant investi" },
          { sym: "t", sens: "taxe de bourse, en décimal" },
          { sym: "x", sens: "commission de change (0 si le titre est coté en euros)" },
        ],
        lecture:
          "Le facteur 2 vient de l'aller-retour : tout se paie à l'achat et se repaie à la vente.",
      },
      {
        type: "definition",
        terme: "Frais courants (TER)",
        definition:
          "Coût annuel de fonctionnement d'un fonds, prélevé en continu sur sa valeur et donc invisible sur votre relevé.",
        precision:
          "Il est déjà déduit du cours publié : les rendements de l'onglet Horizon en sont nets, il ne faut pas le retrancher une seconde fois.",
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
    quiz: [
      {
        question: "Pourquoi la gestion active sous-performe-t-elle en moyenne, après frais ?",
        options: [
          "Les gérants sont incompétents",
          "Actifs et passifs détiennent ensemble le marché : après frais, celui qui paie plus obtient moins",
          "Les marchés sont irrationnels",
          "À cause de la fiscalité",
        ],
        bonne: 1,
        explication:
          "C'est une identité arithmétique, indépendante du talent des gérants et de l'époque.",
      },
    ],
  },
  {
    cle: "inflation",
    numero: 4,
    partie: "fondations",
    nature: "arithmetique",
    titre: "Inflation et rendement réel",
    question: "Gagner 5 % quand les prix montent de 3 %, c'est gagner combien ?",
    minutes: 4,
    icone: "🛒",
    diapos: [
      {
        type: "definition",
        terme: "Rendement nominal",
        definition: "Ce que votre relevé affiche : la variation en euros, sans autre correction.",
      },
      {
        type: "definition",
        terme: "Rendement réel",
        definition:
          "Ce que votre argent permet réellement d'acheter en plus. C'est le nominal corrigé de la hausse des prix.",
        precision:
          "C'est le seul qui compte pour un objectif exprimé en biens : une maison, une retraite, des études.",
      },
      {
        type: "formule",
        titre: "La correction exacte",
        formule: "rréel = (1 + rnom) ÷ (1 + i) − 1",
        termes: [
          { sym: "rnom", sens: "rendement nominal" },
          { sym: "i", sens: "taux d'inflation sur la même période" },
        ],
        lecture:
          "Soustraire simplement (5 % − 3 % = 2 %) est une approximation. L'exact donne 1,94 % : l'écart se creuse quand les taux montent.",
      },
      {
        type: "exemple",
        titre: "Trente ans à 7 %, avec 2 % d'inflation",
        etapes: [
          { calcul: "Nominal : 100 × 1,07³⁰", resultat: "761 €" },
          { calcul: "Réel : 100 × (1,07 ÷ 1,02)³⁰", resultat: "420 €" },
        ],
        conclusion:
          "Près de la moitié du gain affiché n'existe qu'à l'écran. C'est ce que fait le bouton « retirer l'inflation » de l'onglet Horizon.",
      },
      {
        type: "piege",
        titre: "L'illusion du compte d'épargne",
        croyance: "Mon épargne ne peut pas perdre de valeur, elle ne baisse jamais.",
        realite:
          "Son solde ne baisse pas ; son pouvoir d'achat, si, dès que l'inflation dépasse le taux servi. La perte est réelle, simplement invisible sur le relevé.",
      },
    ],
    etudes: [],
    appliquer: [
      "Fixez vos objectifs en pouvoir d'achat, pas en euros nominaux : « de quoi vivre un an » plutôt que « 30 000 € ».",
      "Sur l'onglet Horizon, comparez systématiquement l'affichage nominal et l'affichage réel avant de conclure.",
    ],
    aRetenir:
      "Un rendement qui ne dépasse pas l'inflation ne fait pas croître votre pouvoir d'achat, même quand le solde augmente.",
    quiz: [
      {
        question: "Rendement 4 %, inflation 4 %. Votre pouvoir d'achat :",
        options: ["Augmente de 4 %", "Reste stable", "Baisse de 4 %", "Double en 18 ans"],
        bonne: 1,
        explication:
          "Le gain nominal compense exactement la hausse des prix : vous pouvez acheter la même chose qu'avant.",
      },
    ],
  },
  {
    cle: "risque",
    numero: 5,
    partie: "risque",
    nature: "arithmetique",
    titre: "Qu'est-ce que le risque, au juste ?",
    question: "Comment mesure-t-on quelque chose qui n'est pas encore arrivé ?",
    minutes: 6,
    icone: "📊",
    diapos: [
      {
        type: "definition",
        terme: "Volatilité (écart-type)",
        definition:
          "Mesure de la dispersion des rendements autour de leur moyenne. Plus elle est élevée, plus les résultats s'écartent de ce qui était attendu, dans les deux sens.",
        precision:
          "C'est la mesure standard du risque en finance — et sa principale limite est justement de traiter la hausse et la baisse à égalité.",
      },
      {
        type: "idee",
        titre: "Ce que la volatilité ne capture pas",
        texte:
          "Un placement qui monte lentement puis s'effondre une fois peut afficher une volatilité modeste. La perte maximale subie, elle, est immense. Deux mesures, deux réalités différentes.",
      },
      {
        type: "definition",
        terme: "Perte maximale (drawdown)",
        definition:
          "Le recul le plus important entre un sommet et le creux qui le suit, avant de retrouver ce sommet.",
        precision:
          "C'est cette mesure, et non la volatilité, qui décrit ce qu'il faut supporter sans vendre.",
      },
      {
        type: "piege",
        titre: "Risque n'est pas volatilité",
        croyance: "Un placement peu volatil est un placement peu risqué.",
        realite:
          "Le vrai risque est de ne pas atteindre son objectif. Une épargne stable qui rapporte moins que l'inflation est peu volatile et pourtant certaine de vous appauvrir.",
      },
      {
        type: "idee",
        titre: "Le risque dépend de l'horizon",
        texte:
          "Un placement volatil est dangereux pour une somme nécessaire dans six mois, et bien moins pour une somme dont vous n'avez pas besoin avant vingt ans. Le risque n'est pas une propriété du produit seul.",
      },
    ],
    etudes: [],
    appliquer: [
      "Devant un placement, posez deux questions distinctes : combien ça bouge, et quelle est la pire chute historique.",
      "Dans l'onglet Horizon, la colonne « pire » approche cette seconde question.",
    ],
    aRetenir:
      "La volatilité mesure l'agitation ; le risque, c'est de ne pas atteindre son objectif. Les deux ne se confondent pas.",
    quiz: [
      {
        question: "Un livret d'épargne à 1 % avec 3 % d'inflation est :",
        options: [
          "Sans risque",
          "Peu volatil mais risqué pour le pouvoir d'achat",
          "Volatil et risqué",
          "Volatil mais sûr",
        ],
        bonne: 1,
        explication:
          "Son solde ne bouge pas — volatilité quasi nulle — mais il perd 2 % de pouvoir d'achat par an, de façon quasi certaine.",
      },
    ],
  },
  {
    cle: "diversification",
    numero: 6,
    partie: "risque",
    nature: "empirique",
    titre: "Diversification et corrélation",
    question: "Pourquoi mélanger réduit-il le risque sans réduire le rendement ?",
    minutes: 7,
    icone: "🧩",
    diapos: [
      {
        type: "idee",
        titre: "Le résultat qui a fondé la finance moderne",
        texte:
          "Un portefeuille ne se juge pas titre par titre. Ce qui compte n'est pas le risque de chaque ligne, mais la façon dont les lignes bougent les unes par rapport aux autres.",
      },
      {
        type: "definition",
        terme: "Corrélation",
        definition:
          "Mesure, entre −1 et +1, de la tendance de deux actifs à varier ensemble. +1 : ils bougent à l'identique. 0 : aucun lien. −1 : ils bougent en sens opposé.",
        precision:
          "Deux actifs parfaitement corrélés ne diversifient rien, même s'il y en a deux.",
      },
      {
        type: "exemple",
        titre: "Deux actions, même rendement attendu",
        etapes: [
          { calcul: "Corrélation +1 : risque du mélange", resultat: "inchangé" },
          { calcul: "Corrélation 0 : risque du mélange", resultat: "réduit d'environ 30 %" },
          { calcul: "Rendement attendu du mélange", resultat: "identique" },
        ],
        conclusion:
          "C'est la seule chose en finance qui s'obtienne sans contrepartie : moins de risque, pour le même rendement attendu.",
      },
      {
        type: "idee",
        titre: "Là où ça se complique",
        texte:
          "Le modèle suppose connues les corrélations futures. Or elles varient — et elles augmentent précisément lors des krachs, c'est-à-dire au moment où l'on comptait sur elles.",
      },
      {
        type: "piege",
        titre: "Compter les lignes ne suffit pas",
        croyance: "J'ai dix positions, donc je suis diversifié.",
        realite:
          "Dix banques européennes forment un seul pari. La diversification se mesure aux corrélations, pas au nombre de lignes.",
      },
    ],
    etudes: ["markowitz1952"],
    appliquer: [
      "Regardez la vue « exposition » : la répartition par pays, devise et secteur approche la question des corrélations.",
      "Devant un ajout à votre portefeuille, demandez-vous s'il baissera en même temps que le reste.",
    ],
    aRetenir:
      "La diversification est le seul repas gratuit de la finance — à condition de porter sur des actifs qui ne bougent pas ensemble.",
    quiz: [
      {
        question: "Deux actifs de corrélation +1 dans un portefeuille :",
        options: [
          "Réduisent fortement le risque",
          "Ne réduisent pas le risque",
          "Augmentent le rendement",
          "Suppriment le risque de marché",
        ],
        bonne: 1,
        explication:
          "Ils varient à l'identique : les détenir tous les deux revient à détenir deux fois le même pari.",
      },
      {
        question: "Quand les corrélations augmentent-elles le plus souvent ?",
        options: [
          "En période calme",
          "Pendant les krachs",
          "Elles sont stables",
          "Au changement d'année",
        ],
        bonne: 1,
        explication:
          "C'est la faiblesse pratique du modèle : la diversification s'affaiblit au moment précis où on en aurait besoin.",
      },
    ],
  },
  {
    cle: "medaf",
    numero: 7,
    partie: "risque",
    nature: "empirique",
    titre: "Quel risque est rémunéré ?",
    question: "Pourquoi prendre plus de risque ne rapporte-t-il pas toujours plus ?",
    minutes: 6,
    icone: "⚖️",
    diapos: [
      {
        type: "idee",
        titre: "Deux risques, pas un",
        texte:
          "Le risque d'une action se sépare en deux : celui propre à l'entreprise — un procès, un dirigeant qui part — et celui du marché entier, qui touche tout le monde en même temps.",
      },
      {
        type: "definition",
        terme: "Risque spécifique",
        definition:
          "La part du risque propre à une entreprise, qui disparaît quand on en détient beaucoup d'autres.",
      },
      {
        type: "definition",
        terme: "Risque systématique",
        definition:
          "La part qui affecte l'ensemble du marché et qu'aucune diversification ne supprime.",
      },
      {
        type: "idee",
        titre: "La conséquence, contre-intuitive",
        texte:
          "Seul le risque systématique est rémunéré. Le risque spécifique ne l'est pas : puisqu'on peut le supprimer gratuitement en diversifiant, personne n'accepte de payer pour que vous le portiez.",
      },
      {
        type: "piege",
        titre: "Le malentendu le plus coûteux",
        croyance: "Je prends beaucoup de risque, donc j'aurai beaucoup de rendement.",
        realite:
          "Concentrer sur trois titres ajoute surtout du risque spécifique — celui qui n'est pas rémunéré. Vous portez davantage sans espérer davantage.",
      },
      {
        type: "definition",
        terme: "Bêta",
        definition:
          "Sensibilité d'un titre aux mouvements du marché. Bêta 1 : il suit le marché. Bêta 2 : il amplifie ses mouvements du double, à la hausse comme à la baisse.",
      },
      {
        type: "idee",
        titre: "Ce modèle a été contesté",
        texte:
          "Les tests ultérieurs montrent que le bêta explique mal les écarts de rendement entre actions. Le cadre reste enseigné pour son idée centrale — tout risque n'est pas payé — plus que pour sa précision prédictive.",
      },
    ],
    etudes: ["sharpe1964", "famaFrench1992"],
    appliquer: [
      "Devant une position concentrée, demandez-vous quelle part du risque pris est rémunérée, et laquelle est simplement subie.",
      "Comparez la volatilité d'un titre isolé à celle d'un fonds indiciel : l'écart est du risque spécifique.",
    ],
    aRetenir:
      "Prendre un risque qu'on aurait pu supprimer gratuitement n'apporte aucun rendement supplémentaire attendu.",
    quiz: [
      {
        question: "Le risque spécifique d'une entreprise est :",
        options: [
          "Rémunéré par le marché",
          "Non rémunéré, car diversifiable",
          "Impossible à réduire",
          "Toujours supérieur au risque de marché",
        ],
        bonne: 1,
        explication:
          "Il peut être supprimé sans coût en diversifiant : le marché ne paie donc personne pour le porter.",
      },
    ],
  },
  {
    cle: "concentration",
    numero: 8,
    partie: "risque",
    nature: "empirique",
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
        type: "definition",
        terme: "Distribution asymétrique",
        definition:
          "Distribution dont la moyenne et la médiane diffèrent fortement, parce que quelques valeurs extrêmes tirent la moyenne.",
        precision:
          "Les rendements d'actions sur longue période en sont l'exemple type : la moyenne est bien supérieure au résultat du titre médian.",
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
    quiz: [
      {
        question: "Sur près d'un siècle, la majorité des actions américaines ont :",
        options: [
          "Battu le marché",
          "Rapporté moins qu'un placement sans risque à court terme",
          "Doublé tous les dix ans",
          "Suivi l'inflation",
        ],
        bonne: 1,
        explication:
          "La création de richesse du marché provient d'une petite minorité d'entreprises.",
      },
    ],
  },
  {
    cle: "domestique",
    numero: 9,
    partie: "risque",
    nature: "empirique",
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
    quiz: [
      {
        question: "Le biais domestique désigne :",
        options: [
          "Investir dans l'immobilier plutôt qu'en bourse",
          "Détenir surtout des actions de son propre pays",
          "Préférer les grandes entreprises",
          "Éviter les devises étrangères",
        ],
        bonne: 1,
        explication:
          "Il est mesuré dans tous les grands marchés, sans avantage de rendement identifié.",
      },
    ],
  },
  {
    cle: "efficience",
    numero: 10,
    partie: "efficience",
    nature: "empirique",
    titre: "L'hypothèse d'efficience",
    question: "Si tout est déjà dans le prix, que reste-t-il à analyser ?",
    minutes: 7,
    icone: "🎯",
    diapos: [
      {
        type: "definition",
        terme: "Marché efficient",
        definition:
          "Marché dont les prix reflètent déjà l'information disponible. Toute nouvelle information est intégrée si vite qu'on ne peut en tirer un gain systématique.",
      },
      {
        type: "liste",
        titre: "Trois degrés d'efficience",
        points: [
          "Faible : les cours passés sont déjà dans le prix — l'analyse des graphiques ne sert à rien.",
          "Semi-forte : toute l'information publique est intégrée — les communiqués et les bilans non plus.",
          "Forte : même l'information privée est dans le prix — les initiés eux-mêmes ne gagneraient rien.",
        ],
      },
      {
        type: "idee",
        titre: "Où en est le débat",
        texte:
          "La forme forte est contredite par les faits : les dirigeants gagnent bien de l'argent sur leurs propres titres. Les deux premières résistent nettement mieux, sans être unanimement acceptées.",
      },
      {
        type: "piege",
        titre: "Ce que l'efficience ne dit pas",
        croyance: "Marché efficient veut dire que les prix sont justes.",
        realite:
          "Elle dit qu'ils intègrent l'information disponible, pas qu'ils sont corrects. Un marché peut se tromper collectivement tout en étant impossible à battre.",
      },
      {
        type: "idee",
        titre: "Le problème de l'hypothèse jointe",
        texte:
          "On ne peut jamais tester l'efficience seule : il faut supposer un modèle de rendement normal. Un résultat anormal peut donc venir du modèle, pas du marché. C'est la difficulté centrale du domaine.",
      },
      {
        type: "citation",
        texte:
          "Les écarts documentés sont réels, mais souvent trop faibles, trop instables ou trop coûteux à exploiter pour dégager un gain net après frais.",
        source: "Malkiel, 2003 — revue des critiques de l'efficience",
      },
    ],
    etudes: ["fama1970", "malkiel2003", "jensen1968"],
    appliquer: [
      "Devant une méthode présentée comme gagnante, demandez si elle a été testée après frais, et sur une période qui n'a pas servi à la construire.",
      "Retenez la question utile : non pas « le marché a-t-il tort ? » mais « puis-je en tirer un gain net ? ».",
    ],
    aRetenir:
      "Un marché peut se tromper et rester impossible à battre après frais : ce sont deux affirmations différentes.",
    quiz: [
      {
        question: "L'efficience sous forme faible implique que :",
        options: [
          "Les prix sont toujours justes",
          "L'analyse des cours passés ne procure pas d'avantage",
          "Les initiés ne gagnent rien",
          "Les frais n'ont pas d'importance",
        ],
        bonne: 1,
        explication:
          "La forme faible ne concerne que l'information contenue dans l'historique des cours.",
      },
      {
        question: "Le « problème de l'hypothèse jointe » signifie que :",
        options: [
          "Deux chercheurs doivent valider le résultat",
          "On teste toujours l'efficience et un modèle de rendement ensemble",
          "Les données sont insuffisantes",
          "Les marchés sont inefficients",
        ],
        bonne: 1,
        explication:
          "Un rejet peut donc venir du modèle de rendement normal plutôt que de l'efficience elle-même.",
      },
    ],
  },
  {
    cle: "anomalies",
    numero: 11,
    partie: "efficience",
    nature: "empirique",
    titre: "Les anomalies : taille, valeur, momentum",
    question: "Certaines catégories d'actions rapportent-elles durablement plus ?",
    minutes: 7,
    icone: "🔬",
    diapos: [
      {
        type: "idee",
        titre: "Des écarts que le modèle n'expliquait pas",
        texte:
          "À partir des années 1980, plusieurs travaux constatent des rendements systématiquement supérieurs pour certaines catégories, sans que leur sensibilité au marché le justifie.",
      },
      {
        type: "liste",
        titre: "Les trois principales",
        points: [
          "Taille : les petites capitalisations ont dégagé davantage que leur bêta ne le prévoyait.",
          "Valeur : les titres bon marché rapportés à leur valeur comptable ont surperformé les titres chers.",
          "Momentum : sur trois à douze mois, ce qui a monté a continué de monter.",
        ],
      },
      {
        type: "idee",
        titre: "Deux lectures possibles",
        texte:
          "Soit ces catégories portent un risque réel non capté par le modèle, et la prime est méritée. Soit les investisseurs se trompent systématiquement. Le débat n'est pas tranché.",
      },
      {
        type: "piege",
        titre: "L'anomalie qui s'évapore",
        croyance: "Une anomalie documentée est une méthode pour gagner.",
        realite:
          "Plusieurs se sont fortement affaiblies après publication. Et le momentum, en particulier, exige une rotation coûteuse et subit des effondrements brutaux aux retournements.",
      },
      {
        type: "idee",
        titre: "Ce qu'il en reste d'utile",
        texte:
          "Moins une méthode qu'un outil de mesure : ces facteurs servent aujourd'hui à juger si un gérant a réellement ajouté quelque chose, ou s'il a simplement pris une exposition connue.",
      },
    ],
    etudes: ["banz1981", "famaFrench1993", "jegadeesh1993"],
    appliquer: [
      "Devant une performance flatteuse, demandez si elle s'explique par une exposition connue plutôt que par une compétence.",
      "Comparez toujours la performance annoncée à un indice de même style, pas au marché général.",
    ],
    aRetenir:
      "Les primes documentées sont réelles dans les données passées ; les capter après frais, sur la durée, est une tout autre affaire.",
    quiz: [
      {
        question: "Le momentum désigne :",
        options: [
          "La tendance des titres bon marché à surperformer",
          "La persistance des performances récentes sur 3 à 12 mois",
          "La volatilité d'un titre",
          "La taille de l'entreprise",
        ],
        bonne: 1,
        explication:
          "C'est directement contraire à l'efficience sous forme faible, qui dit que les cours passés n'informent sur rien.",
      },
    ],
  },
  {
    cle: "critiques",
    numero: 12,
    partie: "efficience",
    nature: "empirique",
    titre: "Les prix bougent-ils trop ?",
    question: "Les marchés peuvent-ils se tromper collectivement ?",
    minutes: 5,
    icone: "🌊",
    diapos: [
      {
        type: "idee",
        titre: "Un raisonnement simple et dévastateur",
        texte:
          "Si le prix d'une action ne reflète que les revenus qu'elle versera, il devrait être plus stable que ces revenus — puisqu'il en est une moyenne actualisée. Or on observe l'inverse.",
      },
      {
        type: "chiffre",
        valeur: "beaucoup trop",
        legende: "les cours varient davantage que les revenus qui les justifient",
        texte:
          "Ce constat a ouvert un demi-siècle de débat sur la rationalité des marchés, et fondé la finance comportementale comme discipline.",
      },
      {
        type: "idee",
        titre: "La surréaction",
        texte:
          "Sur trois à cinq ans, les titres les plus délaissés ont ensuite surperformé les plus recherchés. Interprétation proposée : les investisseurs réagissent trop fort aux nouvelles, puis corrigent.",
      },
      {
        type: "piege",
        titre: "Contradiction apparente",
        croyance: "Momentum et surréaction ne peuvent pas être vrais en même temps.",
        realite:
          "Ils portent sur des horizons différents : continuation sur quelques mois, retournement sur plusieurs années. Aucun cadre théorique ne les réconcilie proprement, et c'est un problème ouvert.",
      },
    ],
    etudes: ["shiller1980", "deBondt1985"],
    appliquer: [
      "Distinguez « le marché a tort » de « je peux en profiter » : la première affirmation est bien plus facile à défendre que la seconde.",
      "Méfiez-vous des explications qui rendent compte du passé sans avoir rien prédit.",
    ],
    aRetenir:
      "Que les prix s'écartent parfois de leur valeur est bien documenté ; savoir quand, et dans quel sens, ne l'est pas.",
    quiz: [
      {
        question: "L'argument de la volatilité excessive dit que :",
        options: [
          "Les cours varient moins que les revenus",
          "Les cours varient plus que ce que les revenus justifient",
          "Les revenus sont imprévisibles",
          "Les marchés sont efficients",
        ],
        bonne: 1,
        explication:
          "Un prix étant une moyenne actualisée de revenus futurs, il devrait être plus lisse qu'eux, pas plus agité.",
      },
    ],
  },
  {
    cle: "particuliers",
    numero: 13,
    partie: "comportement",
    nature: "empirique",
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
    quiz: [
      {
        question: "Dans l'étude fondatrice sur les comptes de particuliers, la sous-performance venait surtout :",
        options: [
          "Du mauvais choix des titres",
          "De la fréquence des opérations et de leur coût",
          "De la fiscalité",
          "Du manque de diversification",
        ],
        bonne: 1,
        explication:
          "Les titres choisis n'étaient pas mauvais : c'est l'activité elle-même qui coûtait cher.",
      },
    ],
  },
  {
    cle: "biais",
    numero: 14,
    partie: "comportement",
    nature: "empirique",
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
    quiz: [
      {
        question: "L'effet de disposition, c'est la tendance à :",
        options: [
          "Vendre ses perdantes et garder ses gagnantes",
          "Vendre ses gagnantes et garder ses perdantes",
          "Acheter au plus haut",
          "Trop diversifier",
        ],
        bonne: 1,
        explication:
          "Et les gagnantes vendues se sont ensuite mieux comportées que les perdantes conservées.",
      },
    ],
  },
  {
    cle: "duree",
    numero: 15,
    partie: "comportement",
    nature: "empirique",
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
    quiz: [
      {
        question: "L'argument de Bodie contre « les actions sont sûres à long terme » est que :",
        options: [
          "Les rendements passés sont faux",
          "Le coût d'assurer contre une perte augmente avec l'horizon",
          "L'inflation annule les gains",
          "Les krachs sont imprévisibles",
        ],
        bonne: 1,
        explication:
          "Si le risque diminuait vraiment avec le temps, cette assurance coûterait moins cher, pas plus.",
      },
    ],
  },
  {
    cle: "inities",
    numero: 16,
    partie: "application",
    nature: "empirique",
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
    quiz: [
      {
        question: "Selon la recherche, quelles opérations d'initiés portent une information ?",
        options: [
          "Toutes, indifféremment",
          "Celles des dirigeants qui rompent leurs habitudes",
          "Uniquement les ventes",
          "Celles des grandes entreprises",
        ],
        bonne: 1,
        explication:
          "Les opérations « de routine » n'annoncent rien. Cet outil ne fait pas cette distinction.",
      },
    ],
  },
  {
    cle: "copier",
    numero: 17,
    partie: "application",
    nature: "empirique",
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
    quiz: [
      {
        question: "Ce que la recherche a testé sur les fonds copiés, c'est :",
        options: [
          "Prélever la meilleure ligne du portefeuille",
          "Répliquer le portefeuille entier",
          "Copier les gérants les mieux classés",
          "Suivre les ventes déclarées",
        ],
        bonne: 1,
        explication:
          "Prélever une ligne isolée n'a pas été étudié : elle peut être une couverture ou une position marginale.",
      },
    ],
  },
  {
    cle: "gerants",
    numero: 18,
    partie: "application",
    nature: "empirique",
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
    quiz: [
      {
        question: "Que montre la comparaison entre performance des gérants et pur hasard ?",
        options: [
          "Aucun gérant n'a de talent",
          "Très peu affichent une performance que la chance n'expliquerait pas, après frais",
          "La moitié bat le marché",
          "Le talent se repère sur trois ans",
        ],
        bonne: 1,
        explication:
          "Le problème n'est pas l'absence de talent, c'est l'impossibilité de l'identifier à l'avance.",
      },
    ],
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
  | { kind: "quiz"; questions: Question[] }
  | { kind: "retenir"; texte: string };

/**
 * Tout le texte d'une diapositive, quel que soit son type.
 *
 * Sert aux controles de longueur et de contenu. Ecrit ici plutot que dans les
 * tests pour qu'un nouveau type de diapositive ne puisse pas echapper
 * silencieusement aux garde-fous : ajouter un type sans l'ajouter ici fait
 * echouer la compilation.
 */
export function texteDiapo(d: Diapo): string {
  switch (d.type) {
    case "idee":
      return `${d.titre} ${d.texte}`;
    case "chiffre":
      return `${d.valeur} ${d.legende} ${d.texte}`;
    case "liste":
      return `${d.titre} ${d.points.join(" ")}`;
    case "citation":
      return `${d.texte} ${d.source}`;
    case "definition":
      return `${d.terme} ${d.definition} ${d.precision ?? ""}`;
    case "formule":
      return `${d.titre} ${d.formule} ${d.termes.map((t) => t.sens).join(" ")} ${d.lecture}`;
    case "exemple":
      return `${d.titre} ${d.etapes.map((e) => `${e.calcul} ${e.resultat}`).join(" ")} ${d.conclusion}`;
    case "piege":
      return `${d.titre} ${d.croyance} ${d.realite}`;
  }
}

export function construireDiapos(c: Chapitre): DiapoProjetee[] {
  return [
    ...c.diapos.map((d) => ({ kind: "contenu" as const, diapo: d })),
    ...c.etudes.map((cle) => ({ kind: "etude" as const, cle })),
    { kind: "appliquer" as const, points: c.appliquer },
    // Le quiz avant le « a retenir » : on se teste sur ce qu'on vient de lire,
    // et la derniere diapositive donne ensuite la formule a emporter.
    { kind: "quiz" as const, questions: c.quiz },
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
