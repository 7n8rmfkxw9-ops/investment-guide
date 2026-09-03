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
  | { type: "piege"; titre: string; croyance: string; realite: string }
  /**
   * Notes de cours : un developpement suivi, de la longueur d'une page de
   * polycopie. C'est le format principal — les autres types servent a
   * marquer un point precis, celui-ci sert a expliquer.
   */
  | { type: "cours"; titre: string; blocs: BlocCours[] };

/** Elements d'une page de notes de cours. */
export type BlocCours =
  | { b: "p"; texte: string }
  | { b: "soustitre"; texte: string }
  /** Terme technique defini au fil du texte, mis en evidence. */
  | { b: "terme"; mot: string; texte: string }
  | { b: "puces"; points: string[] }
  /** Encadre : remarque importante, mise en garde, ou point d'histoire. */
  | { b: "encadre"; titre: string; texte: string }
  /** Figure du registre `Figures.tsx`, avec sa legende. */
  | { b: "figure"; fig: string; legende: string }
  /** Calcul deroule, aligne. */
  | { b: "calcul"; lignes: { gauche: string; droite: string }[] };

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
        type: "cours",
        titre: "Pourquoi une somme a une date",
        blocs: [
          {
            b: "p",
            texte:
              "Toute la finance repose sur une observation banale : un euro disponible aujourd'hui n'est pas le même bien qu'un euro disponible dans dix ans. Le premier peut être placé, prêté, investi ; le second ne le peut pas encore. Deux sommes numériquement identiques mais situées à des dates différentes sont donc deux objets économiques différents, et les additionner directement n'a pas plus de sens que d'additionner des mètres et des kilogrammes.",
          },
          {
            b: "terme",
            mot: "Valeur temps de l'argent",
            texte:
              "principe selon lequel la valeur d'une somme dépend de la date à laquelle elle est disponible. C'est la convention qui permet de ramener des flux étalés dans le temps à une unité commune, et donc de les comparer.",
          },
          {
            b: "p",
            texte:
              "Ce principe a une conséquence pratique immédiate : avant de comparer deux placements, il faut les ramener à une même date. C'est l'opération que font tous les modèles d'évaluation, du plus simple au plus sophistiqué. Une action vaut la somme, ramenée à aujourd'hui, de tout ce qu'elle rapportera ; une obligation vaut la somme, ramenée à aujourd'hui, de ses coupons et de son remboursement. Le désaccord entre investisseurs porte sur les montants futurs et sur le taux employé, jamais sur la méthode.",
          },
          { b: "soustitre", texte: "Capitaliser : aller vers le futur" },
          {
            b: "p",
            texte:
              "Placer une somme à un taux r pendant une période la multiplie par (1 + r). Recommencer une deuxième période multiplie de nouveau par (1 + r), mais en partant d'un montant déjà accru. C'est cette réapplication du taux sur un capital qui inclut les intérêts déjà acquis qu'on appelle capitalisation, ou intérêts composés.",
          },
          {
            b: "calcul",
            lignes: [
              { gauche: "1 000 € à 6 %, après 1 an", droite: "1 060 €" },
              { gauche: "après 10 ans", droite: "1 791 €" },
              { gauche: "après 30 ans", droite: "5 743 €" },
              { gauche: "intérêts simples sur 30 ans", droite: "2 800 €" },
            ],
          },
          {
            b: "p",
            texte:
              "L'écart entre les deux dernières lignes est l'objet même du chapitre. Avec des intérêts simples — le taux appliqué chaque année au seul capital initial — trente ans à 6 % rapportent 1 800 € d'intérêts. Avec des intérêts composés, ils en rapportent 4 743 €, soit plus du double. Aucun taux n'a changé : seule la réapplication a produit la différence.",
          },
          {
            b: "figure",
            fig: "croissance",
            legende:
              "Les deux courbes se confondent presque pendant cinq ans. C'est ce qui rend l'effet contre-intuitif : il ne se voit pas quand on l'observe, seulement quand on attend.",
          },
          {
            b: "encadre",
            titre: "Pourquoi l'intuition échoue",
            texte:
              "Le cerveau extrapole linéairement. Devant une croissance de 6 % par an sur trente ans, l'intuition annonce 180 % ; la réalité est 474 %. Cette erreur est systématique et documentée en psychologie de la décision : elle explique une bonne part de la difficulté à épargner tôt, puisque le bénéfice de l'anticipation est précisément celui qu'on n'imagine pas.",
          },
        ],
      },
      {
        type: "cours",
        titre: "Actualiser, et lire un taux correctement",
        blocs: [
          { b: "soustitre", texte: "Actualiser : revenir vers le présent" },
          {
            b: "p",
            texte:
              "L'opération inverse consiste à diviser par (1 + r) autant de fois qu'il y a de périodes. Elle répond à la question : combien vaut aujourd'hui la promesse de recevoir 1 000 € dans huit ans ? À 5 %, la réponse est 677 €. Ce n'est pas une opinion : c'est le montant qui, placé aujourd'hui à 5 %, produirait exactement 1 000 € dans huit ans. Les deux propositions sont donc équivalentes pour qui peut placer à ce taux.",
          },
          {
            b: "terme",
            mot: "Taux d'actualisation",
            texte:
              "le taux employé pour ramener une somme future au présent. Le choisir n'est pas neutre : plus il est élevé, moins les flux lointains pèsent. C'est le principal levier de désaccord entre deux évaluations d'une même entreprise.",
          },
          { b: "soustitre", texte: "La règle de 72" },
          {
            b: "p",
            texte:
              "Divisez 72 par le rendement annuel exprimé en pourcentage : vous obtenez, à un an près, le nombre d'années nécessaires pour doubler. À 6 %, douze ans. À 9 %, huit ans. À 2 %, trente-six ans. L'approximation est fiable entre 4 et 12 %, et elle suffit largement pour juger de tête si une promesse commerciale est plausible.",
          },
          {
            b: "puces",
            points: [
              "Elle permet de vérifier un ordre de grandeur sans calculatrice, y compris en face d'un conseiller.",
              "Elle rend visible la brutalité des taux faibles : à 1 %, doubler demande soixante-douze ans, soit davantage qu'une vie d'épargne.",
              "Elle fonctionne aussi à l'envers, pour l'inflation : à 3 % de hausse des prix, le pouvoir d'achat d'une somme dormante est divisé par deux en vingt-quatre ans.",
            ],
          },
          {
            b: "encadre",
            titre: "Ce qui rend un taux comparable",
            texte:
              "Un taux ne veut rien dire sans sa période ni sa méthode de composition. « 12 % » peut désigner 12 % par an, ou 1 % par mois — soit 12,68 % par an une fois composé. Dans le crédit à la consommation, cette différence est la source la plus courante de malentendu, et c'est pourquoi la réglementation européenne impose un taux annuel effectif global, calculé de façon uniforme.",
          },
        ],
      },
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
        type: "cours",
        titre: "Deux moyennes, deux réponses",
        blocs: [
          {
            b: "p",
            texte:
              "Il existe plusieurs manières de résumer une série de rendements par un seul nombre, et elles ne donnent pas le même résultat. Ce n'est pas une subtilité de statisticien : l'écart entre elles est précisément ce qui sépare la performance annoncée d'un placement de celle que son détenteur a réellement obtenue.",
          },
          {
            b: "terme",
            mot: "Rendement arithmétique",
            texte:
              "la somme des rendements de chaque période divisée par leur nombre. Il répond à la question « quel rendement puis-je attendre l'année prochaine, en moyenne ? ».",
          },
          {
            b: "terme",
            mot: "Rendement géométrique",
            texte:
              "le taux constant qui, appliqué à chaque période, aurait produit exactement le capital final observé. Il répond à la question « qu'ai-je réellement gagné sur toute la durée ? ».",
          },
          { b: "soustitre", texte: "L'exemple qui règle la question" },
          {
            b: "calcul",
            lignes: [
              { gauche: "Année 1", droite: "+50 %" },
              { gauche: "Année 2", droite: "−50 %" },
              { gauche: "Moyenne arithmétique", droite: "0 %" },
              { gauche: "Capital final (100 € au départ)", droite: "75 €" },
              { gauche: "Rendement géométrique", droite: "−13,4 %/an" },
            ],
          },
          {
            b: "p",
            texte:
              "La moyenne arithmétique annonce l'équilibre ; le détenteur a perdu un quart de sa mise. Aucun des deux chiffres n'est faux : ils répondent à deux questions différentes. Mais un seul décrit ce qui s'est passé, et c'est le second. La raison est mécanique : une baisse de 50 % exige une hausse de 100 % pour être effacée, parce qu'elle s'applique à un capital réduit.",
          },
          { b: "soustitre", texte: "La règle générale" },
          {
            b: "p",
            texte:
              "Le rendement géométrique est toujours inférieur ou égal à l'arithmétique, avec égalité seulement si tous les rendements sont identiques. L'écart entre les deux croît avec la dispersion des rendements. Deux placements affichant la même moyenne arithmétique n'ont donc pas la même valeur finale si l'un est plus agité que l'autre — le plus volatil finit plus bas, à moyenne égale.",
          },
          {
            b: "encadre",
            titre: "Conséquence pratique",
            texte:
              "La volatilité n'est pas seulement inconfortable : elle coûte du rendement réalisé. C'est un argument en faveur de la diversification qui ne dépend d'aucune prévision de marché, et qui tient même si l'on croit tous les actifs également prometteurs.",
          },
        ],
      },
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
        type: "cours",
        titre: "L'arithmétique de la gestion active",
        blocs: [
          {
            b: "p",
            texte:
              "En 1991, William Sharpe publie un argument d'une page qui n'a jamais été réfuté, parce qu'il n'est pas réfutable : c'est une identité comptable, pas une hypothèse. Partagez l'ensemble des détenteurs d'un marché en deux groupes — ceux qui détiennent le marché tel quel, et tous les autres. Le premier groupe obtient, par construction, le rendement du marché. Comme les deux groupes réunis détiennent l'intégralité du marché, le second groupe obtient également le rendement du marché, en moyenne pondérée.",
          },
          {
            b: "p",
            texte:
              "Avant frais, les deux camps font donc jeu égal. Mais le second supporte des coûts nettement supérieurs : recherche, rotation du portefeuille, écarts entre prix d'achat et de vente, rémunération des gérants. Après frais, il obtient nécessairement moins. Non pas parce que ses membres seraient incompétents, mais parce que l'arithmétique l'impose.",
          },
          {
            b: "encadre",
            titre: "Ce que l'argument ne dit pas",
            texte:
              "Il ne dit pas qu'aucun gérant ne bat le marché : il en existe. Il dit que leur gain est pris à d'autres gérants actifs, et que le groupe pris dans son ensemble perd la valeur de ses frais. Repérer à l'avance ceux qui gagneront est une question distincte, traitée au chapitre 18.",
          },
          { b: "soustitre", texte: "Le coût, composante par composante" },
          {
            b: "puces",
            points: [
              "Frais de courtage : montant fixe ou proportionnel prélevé à chaque ordre, à l'achat comme à la vente.",
              "Taxe sur les opérations de bourse : en Belgique, un pourcentage du montant, variable selon le produit et son lieu d'enregistrement.",
              "Écart achat-vente : la différence permanente entre le prix auquel on peut vendre et celui auquel on peut acheter. Invisible sur le relevé, réel dans le résultat.",
              "Commission de change : marge appliquée par le courtier sur le taux, dès que le titre n'est pas coté dans votre devise.",
              "Frais courants du fonds : prélevés en continu sur la valeur, donc déjà intégrés au cours publié.",
            ],
          },
          {
            b: "figure",
            fig: "fraisTemps",
            legende:
              "Un et demi pour cent de frais annuels sur trente ans. La zone colorée n'est pas un détail de gestion : c'est près d'un tiers du capital final.",
          },
          {
            b: "p",
            texte:
              "La particularité des frais est qu'ils sont certains. Le rendement d'une action est une hypothèse ; le coût de l'ordre est un fait connu avant même de passer l'ordre. C'est la seule composante du résultat sur laquelle un investisseur individuel exerce un contrôle complet, et c'est pourquoi un cours d'investissement sérieux commence par là plutôt que par la sélection de titres.",
          },
        ],
      },
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
        type: "cours",
        titre: "Ce que mesure vraiment un rendement",
        blocs: [
          {
            b: "p",
            texte:
              "Un rendement s'exprime en euros, mais un euro n'est pas une unité stable. Si les prix montent de 3 % pendant qu'un placement rapporte 3 %, le détenteur possède davantage d'euros et exactement autant de biens. Son enrichissement est nul, alors que son relevé affiche un gain. Distinguer les deux lectures est la première hygiène d'un investisseur.",
          },
          {
            b: "terme",
            mot: "Rendement nominal",
            texte: "la variation exprimée en unités monétaires, telle qu'elle apparaît sur un relevé de compte.",
          },
          {
            b: "terme",
            mot: "Rendement réel",
            texte:
              "la variation du pouvoir d'achat, c'est-à-dire le rendement nominal corrigé de la hausse générale des prix sur la même période.",
          },
          {
            b: "p",
            texte:
              "La correction exacte ne consiste pas à soustraire mais à diviser : on rapporte le facteur de croissance du capital au facteur de croissance des prix. Sur des taux faibles, la soustraction donne une approximation acceptable ; dès que les taux montent, l'écart devient sensible et joue toujours dans le même sens, celui qui flatte.",
          },
          {
            b: "figure",
            fig: "inflationReel",
            legende:
              "Trente ans à 7 % nominal, avec 2 % d'inflation. La courbe pleine est ce que le relevé affiche ; la courbe pointillée est ce que la somme permet réellement d'acheter.",
          },
          {
            b: "p",
            texte:
              "L'écart n'est pas marginal : sur cet exemple, 341 € des 761 € affichés n'existent que dans l'unité de compte. C'est la raison pour laquelle un objectif d'épargne gagne à être formulé en biens — « de quoi vivre deux ans », « l'apport d'un logement » — plutôt qu'en montant nominal, qui perd sa signification à mesure qu'on s'éloigne.",
          },
          {
            b: "encadre",
            titre: "L'illusion monétaire",
            texte:
              "Les économistes appellent ainsi la tendance à raisonner en unités nominales plutôt qu'en pouvoir d'achat. Elle explique qu'un livret rémunéré 1 % avec 3 % d'inflation paraisse sûr : son solde ne baisse jamais. Il perd pourtant 2 % de valeur réelle par an, de façon quasi certaine — un rendement négatif garanti, ce qu'aucun placement en actions ne peut offrir.",
          },
        ],
      },
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
        type: "cours",
        titre: "Définir le risque avant de le mesurer",
        blocs: [
          {
            b: "p",
            texte:
              "La finance a adopté une mesure du risque commode et discutable : la dispersion des rendements autour de leur moyenne, appelée volatilité ou écart-type. Elle a l'avantage de se calculer sur des données passées et d'entrer dans des modèles. Elle a l'inconvénient de traiter la hausse et la baisse à égalité, alors qu'aucun investisseur ne se plaint d'une bonne surprise.",
          },
          {
            b: "terme",
            mot: "Volatilité",
            texte:
              "écart-type des rendements sur une période. Une volatilité annuelle de 20 % signifie qu'environ deux années sur trois, le rendement s'écarte de sa moyenne de moins de vingt points, dans un sens ou dans l'autre.",
          },
          {
            b: "terme",
            mot: "Perte maximale",
            texte:
              "recul le plus important entre un sommet et le creux qui le suit. C'est la mesure qui décrit ce qu'il faut supporter sans vendre, et elle ne se déduit pas de la volatilité.",
          },
          { b: "soustitre", texte: "Pourquoi les deux ne se confondent pas" },
          {
            b: "p",
            texte:
              "Un placement peut monter régulièrement pendant des années puis s'effondrer une fois. Sa volatilité mesurée reste modeste, parce que la plupart des périodes sont calmes ; sa perte maximale est catastrophique. Inversement, un actif qui oscille beaucoup sans jamais chuter durablement affiche une forte volatilité pour un risque vécu faible. Les deux nombres décrivent des choses différentes et il faut les regarder ensemble.",
          },
          {
            b: "encadre",
            titre: "La définition qui compte vraiment",
            texte:
              "Pour un épargnant, le risque n'est ni la volatilité ni la perte maximale : c'est la probabilité de ne pas disposer de la somme nécessaire au moment où elle est nécessaire. Cette définition dépend de l'objectif et de l'horizon, pas seulement du produit. Un livret d'épargne est très peu volatil et parfaitement inadapté à un objectif de retraite dans trente ans ; un fonds actions est très volatil et parfaitement inadapté à un apport immobilier prévu dans dix-huit mois.",
          },
          {
            b: "p",
            texte:
              "Cette dernière remarque a une portée pratique immédiate : le même produit n'a pas le même niveau de risque selon la personne qui le détient et l'usage prévu de la somme. Toute affirmation du type « ce placement est risqué » sans mention d'un horizon est incomplète.",
          },
        ],
      },
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
        type: "cours",
        titre: "Le seul repas gratuit de la finance",
        blocs: [
          {
            b: "p",
            texte:
              "En 1952, Harry Markowitz démontre un résultat qui change la discipline : le risque d'un portefeuille n'est pas la moyenne des risques de ses composants. Il dépend aussi, et surtout, de la façon dont ces composants bougent les uns par rapport aux autres. Deux actions également risquées prises isolément peuvent former un ensemble nettement moins risqué, si elles ne montent et ne baissent pas en même temps.",
          },
          {
            b: "terme",
            mot: "Corrélation",
            texte:
              "mesure comprise entre −1 et +1 de la tendance de deux actifs à varier ensemble. À +1 ils sont interchangeables ; à 0 leurs mouvements sont sans rapport ; à −1 l'un monte exactement quand l'autre baisse.",
          },
          {
            b: "p",
            texte:
              "La conséquence est remarquable : en combinant des actifs imparfaitement corrélés, on réduit le risque total sans réduire le rendement attendu, qui reste la moyenne pondérée des rendements attendus. C'est la seule opération en finance qui améliore un terme sans en dégrader un autre — d'où l'expression consacrée de repas gratuit.",
          },
          {
            b: "figure",
            fig: "frontiere",
            legende:
              "Chaque point est un portefeuille possible. La courbe supérieure rassemble ceux qui offrent le meilleur rendement pour un risque donné : la frontière efficiente. Tout ce qui est en dessous est dominé.",
          },
          { b: "soustitre", texte: "Là où le modèle rencontre la réalité" },
          {
            b: "p",
            texte:
              "Construire ce portefeuille optimal suppose de connaître trois choses : les rendements attendus, les volatilités et les corrélations futures. Aucune n'est observable. On les estime sur le passé, et cette estimation est instable — surtout celle des rendements attendus, dont une erreur modeste déplace massivement le portefeuille recommandé.",
          },
          {
            b: "encadre",
            titre: "Le défaut au pire moment",
            texte:
              "Les corrélations ne sont pas constantes : elles augmentent nettement pendant les krachs. Des actifs qui se comportaient indépendamment en régime calme chutent ensemble quand la liquidité se raréfie. La diversification s'affaiblit donc précisément au moment où l'on comptait sur elle — limite bien documentée, qui ne l'annule pas mais interdit d'y voir une protection absolue.",
          },
        ],
      },
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
        type: "cours",
        titre: "Décomposer le risque en deux",
        blocs: [
          {
            b: "p",
            texte:
              "Si la diversification réduit le risque, jusqu'où peut-elle aller ? La réponse, formalisée par William Sharpe en 1964, structure encore aujourd'hui la façon dont la profession parle du risque. Le risque d'une action se décompose en deux parties de nature différente.",
          },
          {
            b: "terme",
            mot: "Risque spécifique",
            texte:
              "ce qui n'affecte qu'une entreprise : un procès, un incendie d'usine, un dirigeant qui démissionne, un produit qui échoue. Il se dilue à mesure qu'on détient d'autres titres, parce que ces événements ne se produisent pas tous en même temps.",
          },
          {
            b: "terme",
            mot: "Risque systématique",
            texte:
              "ce qui affecte l'ensemble du marché : une récession, une remontée des taux, une crise financière. Aucune diversification à l'intérieur du marché ne le supprime, puisqu'il frappe tout le monde ensemble.",
          },
          {
            b: "figure",
            fig: "risqueDiversification",
            legende:
              "Le risque chute vite entre un et vingt titres, puis se stabilise. Le plancher est le risque systématique : la diversification n'y peut rien.",
          },
          { b: "soustitre", texte: "La conclusion, contre-intuitive" },
          {
            b: "p",
            texte:
              "Seul le risque systématique est rémunéré. Le raisonnement est le suivant : si un risque peut être supprimé gratuitement en diversifiant, personne n'acceptera de payer une prime à celui qui choisit de le porter. Le marché ne récompense donc pas le courage, il récompense l'exposition à ce qu'on ne peut pas éviter.",
          },
          {
            b: "p",
            texte:
              "Concentrer un portefeuille sur trois titres ajoute donc massivement du risque spécifique — celui qui n'est pas payé — sans augmenter le rendement attendu. C'est la réponse la plus directe à l'idée répandue selon laquelle « plus de risque égale plus de rendement » : encore faut-il que ce soit le bon risque.",
          },
          {
            b: "terme",
            mot: "Bêta",
            texte:
              "sensibilité d'un titre aux mouvements du marché. Un bêta de 1,4 signifie qu'historiquement, quand le marché varie de 10 %, ce titre varie d'environ 14 %, dans le même sens.",
          },
          {
            b: "encadre",
            titre: "Un modèle contesté, une idée robuste",
            texte:
              "Les tests empiriques des années 1990 montrent que le bêta explique mal les écarts de rendement entre actions — c'est le point de départ des travaux de Fama et French étudiés au chapitre 11. Le modèle est donc enseigné pour son idée centrale, qui tient, plutôt que pour sa précision prédictive, qui ne tient pas.",
          },
        ],
      },
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
        type: "cours",
        titre: "La forme de la distribution",
        blocs: [
          {
            b: "p",
            texte:
              "On parle couramment du « rendement des actions » comme s'il s'agissait d'une grandeur homogène. En 2018, Hendrik Bessembinder examine l'intégralité des actions américaines cotées depuis 1926 et mesure ce que chacune a rapporté sur toute sa durée de vie. Le résultat contredit frontalement l'intuition : la majorité des titres ont fait moins bien qu'un placement de trésorerie sans risque.",
          },
          {
            b: "p",
            texte:
              "La totalité de la création de richesse du marché est attribuable à une petite fraction des entreprises. Le reste, pris ensemble, n'a rien produit de plus qu'un placement monétaire. Le rendement du marché n'est donc pas le rendement d'une action typique : c'est une moyenne tirée vers le haut par une poignée de réussites extrêmes.",
          },
          {
            b: "figure",
            fig: "asymetrie",
            legende:
              "La masse des titres se situe à gauche ; quelques exceptions très à droite déplacent la moyenne loin au-dessus de la médiane. C'est la signature d'une distribution asymétrique.",
          },
          {
            b: "terme",
            mot: "Distribution asymétrique",
            texte:
              "distribution dont la moyenne et la médiane diffèrent nettement, parce que des valeurs extrêmes d'un seul côté tirent la moyenne. Sur ce type de distribution, la moyenne cesse d'être un bon résumé du cas typique.",
          },
          { b: "soustitre", texte: "Ce que cela implique pour un portefeuille" },
          {
            b: "p",
            texte:
              "Si l'essentiel du rendement provient d'une minorité de titres, détenir peu de lignes revient à parier qu'on en a attrapé au moins une. Le résultat le plus probable d'un portefeuille concentré n'est pas la moyenne du marché : il est inférieur, puisque la moyenne est produite par des exceptions que l'on n'a statistiquement pas.",
          },
          {
            b: "encadre",
            titre: "L'argument le plus solide pour l'indiciel",
            texte:
              "Il ne repose ni sur l'efficience des marchés, ni sur l'incompétence des gérants, mais sur la forme de la distribution : détenir tout le marché garantit de détenir les quelques titres qui produiront l'essentiel du résultat. On renonce à surperformer, on s'assure de ne pas manquer les exceptions.",
          },
        ],
      },
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
        type: "cours",
        titre: "Le poids de la familiarité",
        blocs: [
          {
            b: "p",
            texte:
              "En 1991, Kenneth French et James Poterba mesurent la composition des portefeuilles d'actions dans les grands pays développés. Le constat est frappant et régulier : dans chaque pays, les investisseurs détiennent une écrasante majorité de titres nationaux, très au-delà du poids de leur pays dans la capitalisation mondiale.",
          },
          {
            b: "p",
            texte:
              "Ce déséquilibre est incompatible avec la théorie du portefeuille étudiée au chapitre 6, qui recommanderait une répartition proche des poids mondiaux. Aucune prime de rendement identifiée ne compense la concentration ainsi acceptée. Ce qui reste, c'est une exposition renforcée à une seule économie, une seule devise et un seul cadre réglementaire.",
          },
          { b: "soustitre", texte: "Les explications avancées" },
          {
            b: "puces",
            points: [
              "Coûts et frictions : autrefois substantiels sur les marchés étrangers, aujourd'hui marginaux pour un particulier via un fonds indiciel mondial.",
              "Couverture du risque de change : argument sérieux, mais qui justifie une préférence modérée, pas les proportions observées.",
              "Familiarité : on surestime ce qu'on croit connaître. Un investisseur belge juge Anheuser-Busch InBev moins risquée que Nestlé parce qu'il en connaît le nom, pas parce qu'il en a analysé le bilan.",
            ],
          },
          {
            b: "encadre",
            titre: "Le cas belge",
            texte:
              "La Belgique représente une fraction très minoritaire de la capitalisation boursière mondiale. Un portefeuille composé d'actions belges n'est donc pas un portefeuille prudent : c'est un pari concentré sur une économie de taille modeste, exposée à quelques grands secteurs. Le biais est d'autant plus coûteux que le marché domestique est petit.",
          },
          {
            b: "p",
            texte:
              "Le phénomène s'est atténué depuis la publication, sans disparaître. Il reste l'un des écarts les mieux documentés entre ce que la théorie recommande et ce que les investisseurs font réellement — y compris les investisseurs professionnels.",
          },
        ],
      },
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
        type: "cours",
        titre: "Ce que signifie « efficient »",
        blocs: [
          {
            b: "p",
            texte:
              "En 1970, Eugene Fama rassemble deux décennies de travaux épars sous une formulation unique. Un marché est dit efficient au regard d'un ensemble d'information si les prix reflètent déjà pleinement cette information. La conséquence pratique est immédiate : personne ne peut tirer de gain systématique d'une information déjà intégrée dans les prix.",
          },
          {
            b: "p",
            texte:
              "Le mécanisme invoqué n'est pas la sagesse des foules mais la concurrence. Si une information permettait de gagner, quelqu'un l'exploiterait, et son action ferait bouger le prix jusqu'à ce que l'occasion disparaisse. L'efficience est donc le résultat de l'effort de ceux qui cherchent à la démentir — ce qui contient un paradoxe : si tout le monde renonçait à chercher, elle cesserait de tenir.",
          },
          { b: "soustitre", texte: "Les trois degrés" },
          {
            b: "puces",
            points: [
              "Forme faible : les prix intègrent l'historique des cours. Conséquence : l'analyse des graphiques passés ne procure aucun avantage.",
              "Forme semi-forte : ils intègrent toute l'information publique — bilans, communiqués, annonces. Conséquence : lire les publications au moment où tout le monde les lit ne suffit pas.",
              "Forme forte : ils intègrent jusqu'à l'information privée. Conséquence : même un dirigeant ne gagnerait rien sur ses propres titres.",
            ],
          },
          {
            b: "p",
            texte:
              "La forme forte est contredite par les faits, et le chapitre 16 le montre : les dirigeants réalisent bien des gains anormaux. Les deux premières formes résistent nettement mieux, sans faire l'unanimité — les chapitres 11 et 12 exposent les anomalies et les critiques.",
          },
          {
            b: "encadre",
            titre: "Le problème de l'hypothèse jointe",
            texte:
              "On ne peut jamais tester l'efficience seule. Pour dire qu'un rendement est anormal, il faut d'abord un modèle du rendement normal. Tout rejet peut donc venir du modèle plutôt que du marché, et Fama le reconnaît lui-même. C'est la difficulté centrale du domaine, et la raison pour laquelle le débat dure depuis un demi-siècle sans se clore.",
          },
          {
            b: "terme",
            mot: "Ce que l'efficience ne dit pas",
            texte:
              "elle n'affirme pas que les prix sont justes, ni que les marchés sont sages. Elle affirme qu'ils intègrent l'information disponible. Un marché peut se tromper collectivement et rester impossible à battre après frais : ce sont deux propositions distinctes.",
          },
        ],
      },
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
        type: "cours",
        titre: "Trois écarts qui ont résisté",
        blocs: [
          {
            b: "p",
            texte:
              "À partir de la fin des années 1970, des chercheurs constatent des rendements systématiquement supérieurs pour certaines catégories d'actions, que leur sensibilité au marché ne suffit pas à expliquer. Ces écarts, appelés anomalies, sont la principale contestation empirique du modèle d'équilibre étudié au chapitre 7.",
          },
          { b: "soustitre", texte: "Effet de taille" },
          {
            b: "p",
            texte:
              "Rolf Banz montre en 1981 que les petites capitalisations ont dégagé un rendement supérieur à ce que leur bêta justifiait. L'effet s'est nettement affaibli après publication, et une partie s'explique par les coûts de transaction élevés sur les très petites valeurs, que l'étude ne déduisait pas.",
          },
          { b: "soustitre", texte: "Effet valeur" },
          {
            b: "p",
            texte:
              "Fama et French établissent en 1992 que le rapport entre valeur comptable et valeur boursière explique bien mieux les écarts de rendement que le bêta. Les titres « bon marché » selon ce critère ont surperformé les titres chers, sur longue période et sur plusieurs marchés.",
          },
          { b: "soustitre", texte: "Momentum" },
          {
            b: "p",
            texte:
              "Narasimhan Jegadeesh et Sheridan Titman documentent en 1993 le plus dérangeant des trois : sur trois à douze mois, les titres qui ont le mieux performé continuent en moyenne de surperformer. C'est directement contraire à l'efficience sous forme faible, qui affirme que les cours passés n'informent sur rien.",
          },
          {
            b: "encadre",
            titre: "Deux lectures irréconciliées",
            texte:
              "Ou bien ces catégories portent un risque réel que le modèle ne capte pas, et la prime est méritée ; ou bien les investisseurs se trompent systématiquement, et la prime est une erreur persistante. Quarante ans plus tard, la profession reste partagée. Fama défend la première lecture, Thaler la seconde ; ils ont reçu le prix Nobel à trois ans d'intervalle.",
          },
          {
            b: "p",
            texte:
              "L'usage professionnel dominant de ces facteurs n'est plus d'en tirer une stratégie mais d'en faire un étalon : comparer un gérant à un indice de même style permet de distinguer ce qu'il a réellement apporté de ce qu'une exposition connue aurait procuré sans lui.",
          },
        ],
      },
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
        type: "cours",
        titre: "Les prix bougent-ils trop ?",
        blocs: [
          {
            b: "p",
            texte:
              "En 1980, Robert Shiller construit un argument d'une simplicité redoutable. Si le prix d'une action n'est que la somme actualisée des revenus qu'elle versera, alors ce prix est une moyenne pondérée d'un grand nombre de flux futurs. Or une moyenne est mécaniquement plus stable que les grandeurs qu'elle résume. Les cours devraient donc varier moins que les dividendes effectivement versés.",
          },
          {
            b: "p",
            texte:
              "L'observation donne l'inverse, et de très loin. Les cours varient bien davantage que ne le justifient les revenus constatés ensuite. Si le modèle d'évaluation est juste, quelque chose d'autre que l'anticipation rationnelle des revenus fait bouger les prix.",
          },
          {
            b: "encadre",
            titre: "Une contestation méthodologique nourrie",
            texte:
              "Le résultat a fait l'objet de critiques statistiques sérieuses, notamment sur le traitement des séries dont la moyenne n'est pas stable dans le temps. Le débat n'a jamais été tranché à la satisfaction des deux camps — raison de plus pour le présenter comme un débat et non comme un acquis.",
          },
          { b: "soustitre", texte: "La surréaction" },
          {
            b: "p",
            texte:
              "Werner De Bondt et Richard Thaler apportent en 1985 un élément complémentaire : sur trois à cinq ans, les titres les plus délaissés ont ensuite surperformé les plus recherchés. Leur interprétation est que les investisseurs réagissent trop fortement aux nouvelles, puis corrigent lentement.",
          },
          {
            b: "p",
            texte:
              "Ces travaux fondent la finance comportementale comme discipline. Ils ne fournissent pas de méthode d'investissement : savoir que les prix s'écartent parfois de leur valeur ne dit ni quand, ni dans quel sens, ni pour combien de temps.",
          },
          {
            b: "encadre",
            titre: "Une contradiction ouverte",
            texte:
              "Momentum et surréaction coexistent dans la littérature : continuation sur quelques mois, retournement sur plusieurs années. Aucun cadre théorique ne les réconcilie proprement. C'est le genre de tension qu'un cours doit signaler plutôt que masquer — l'état réel du savoir comporte des zones non résolues.",
          },
        ],
      },
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
        type: "cours",
        titre: "Ce que révèlent les relevés de courtage",
        blocs: [
          {
            b: "p",
            texte:
              "Jusqu'aux années 1990, la performance des investisseurs individuels relevait de l'anecdote. Brad Barber et Terrance Odean obtiennent l'accès aux relevés réels de dizaines de milliers de ménages américains sur plusieurs années : non pas des intentions déclarées, mais chaque ordre effectivement passé. C'est le premier examen à grande échelle de ce que font les particuliers, par opposition à ce qu'ils disent faire.",
          },
          {
            b: "p",
            texte:
              "Le résultat est double et c'est le second qui surprend. D'abord, les titres sélectionnés ne sont pas absurdes : bruts de frais, les choix ne détruisent pas de valeur de façon spectaculaire. Ensuite, le rendement net est nettement inférieur au marché — et l'écart s'explique par la fréquence des opérations, non par la qualité de la sélection.",
          },
          {
            b: "encadre",
            titre: "La conclusion en une phrase",
            texte:
              "Ce n'est pas d'abord le mauvais choix d'entreprise qui coûte cher au particulier. C'est le fait d'échanger souvent, chaque opération prélevant sa dîme en frais et en écart de cotation.",
          },
          { b: "soustitre", texte: "Pourquoi échange-t-on autant ?" },
          {
            b: "p",
            texte:
              "L'année suivante, les mêmes auteurs proposent une explication : l'excès de confiance. En comparant les comportements d'échange selon le sexe — le sexe servant d'indicateur indirect d'un trait mesuré par ailleurs en psychologie — ils constatent que le groupe qui échange le plus est aussi celui dont le rendement net souffre le plus. Plus on se croit informé, plus on agit ; plus on agit, plus on paie.",
          },
          {
            b: "p",
            texte:
              "Le cas extrême a été étudié à l'échelle d'un marché national entier, sur les spéculateurs les plus actifs. Une part infime d'entre eux dégage un rendement anormal positif de façon persistante après frais. La grande majorité perd de l'argent, et l'attrition est rapide.",
          },
          {
            b: "encadre",
            titre: "Portée et limites",
            texte:
              "Ces données sont américaines et datent d'une époque où le courtage coûtait bien plus cher qu'aujourd'hui. L'ampleur chiffrée n'est plus transposable. Le mécanisme — l'activité coûte, et l'excès de confiance la nourrit — a été retrouvé sur d'autres marchés et d'autres périodes.",
          },
        ],
      },
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
        type: "cours",
        titre: "Vendre les gagnantes, garder les perdantes",
        blocs: [
          {
            b: "p",
            texte:
              "En 1998, Terrance Odean documente sur comptes réels un comportement d'une régularité remarquable : les investisseurs vendent leurs positions en gain nettement plus volontiers que celles en perte. Le phénomène porte un nom, l'effet de disposition, et il ne dépend ni du niveau de richesse ni de l'expérience déclarée.",
          },
          {
            b: "p",
            texte:
              "Ce qui rend ce réflexe coûteux est la suite de l'histoire. Les positions gagnantes vendues se sont ensuite mieux comportées que les positions perdantes conservées. Le geste qui donne le sentiment de « sécuriser un gain » a donc, en moyenne, retiré du rendement — auquel s'ajoute, dans les régimes fiscaux qui taxent les plus-values, un impôt payé plus tôt que nécessaire.",
          },
          { b: "soustitre", texte: "D'où vient le mécanisme" },
          {
            b: "p",
            texte:
              "L'explication précède de vingt ans l'observation. En 1979, Daniel Kahneman et Amos Tversky établissent que les décisions ne se prennent pas sur les niveaux de richesse mais sur les écarts à un point de référence, et que les pertes pèsent nettement plus que les gains de même ampleur. Face à une perte, on devient preneur de risque : on conserve, on espère revenir au point de départ.",
          },
          {
            b: "terme",
            mot: "Point de référence",
            texte:
              "niveau à partir duquel un résultat est perçu comme gain ou perte. Pour un investisseur, c'est presque toujours le prix d'achat — un nombre sans aucune pertinence pour la valeur future du titre, mais qui gouverne la décision.",
          },
          { b: "soustitre", texte: "La fréquence de consultation" },
          {
            b: "p",
            texte:
              "Shlomo Benartzi et Richard Thaler ajoutent une dimension pratique en 1995. Plus on évalue son portefeuille souvent, plus on rencontre de périodes négatives, et moins les actions paraissent supportables — alors que rien n'a changé dans le placement. Un même portefeuille examiné chaque jour et examiné chaque année produit deux expériences vécues très différentes.",
          },
          {
            b: "encadre",
            titre: "Conséquence opérationnelle",
            texte:
              "Deux décisions valent d'être prises à froid, avant tout engagement : la condition de vente, et la fréquence de consultation. La première évite d'improviser sous le coup de l'émotion ; la seconde réduit le nombre d'occasions d'improviser.",
          },
        ],
      },
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
        type: "cours",
        titre: "Deux lectures d'un même fait",
        blocs: [
          {
            b: "p",
            texte:
              "L'observation historique n'est pas contestée : sur des périodes longues, les fenêtres de détention perdantes deviennent rares, et l'éventail des rendements annualisés se resserre. C'est ce que montre l'onglet Horizon de cette application, sur données réelles. La question est de savoir ce qu'on en déduit.",
          },
          {
            b: "figure",
            fig: "dispersionHorizon",
            legende:
              "L'écart entre le meilleur et le pire cas se réduit avec la durée. Attention à ce que la figure montre : des rendements annualisés, pas des montants.",
          },
          { b: "soustitre", texte: "L'objection de Bodie" },
          {
            b: "p",
            texte:
              "Zvi Bodie formule en 1995 une objection restée célèbre. Considérons le coût d'une assurance garantissant qu'au terme, le placement en actions n'aura pas fait moins bien qu'un placement sans risque. Si le risque diminuait réellement avec l'horizon, cette assurance deviendrait moins chère à mesure que l'horizon s'allonge. On observe l'inverse : son prix augmente.",
          },
          {
            b: "p",
            texte:
              "La réconciliation tient à ce que l'on mesure. La probabilité de terminer en perte diminue effectivement avec la durée. Mais l'ampleur de ce que l'on peut perdre, elle, augmente : sur trente ans, un écart annualisé de deux points représente une différence de capital considérable. Rendement médian plus stable ne signifie pas risque disparu.",
          },
          {
            b: "encadre",
            titre: "Le facteur qui décide vraiment",
            texte:
              "Le rendement long terme n'est acquis qu'à celui qui reste investi pendant toute la période, y compris au creux. Or plus l'horizon est long, plus il faudra traverser de baisses sans vendre. La difficulté n'est pas statistique, elle est psychologique — et le chapitre 14 explique pourquoi elle est plus grande qu'on ne l'anticipe.",
          },
        ],
      },
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
        type: "cours",
        titre: "Ce que gagnent les initiés, et ce qu'il en reste",
        blocs: [
          {
            b: "p",
            texte:
              "Les dirigeants d'une société connaissent son état avant le public. La loi américaine les oblige à déclarer leurs opérations sur les titres de leur propre entreprise, dans un délai aujourd'hui de deux jours ouvrés. Cette obligation crée un jeu de données que les chercheurs exploitent depuis quarante ans, et que cette application affiche.",
          },
          {
            b: "p",
            texte:
              "Le premier résultat, établi par Nejat Seyhun dès 1986, confirme l'intuition : les dirigeants réalisent bien des gains anormaux sur leurs propres titres. Le second résultat, dans le même article, la contredit : un investisseur extérieur qui les imite après la publication officielle ne dégage pas, en moyenne, de quoi couvrir ses frais de transaction.",
          },
          {
            b: "figure",
            fig: "delaiPublication",
            legende:
              "Entre l'opération et le moment où vous la lisez, le marché a déjà intégré une partie de l'information. Ce qui reste à capter est la différence, pas le gain total du dirigeant.",
          },
          { b: "soustitre", texte: "Tous les signaux ne se valent pas" },
          {
            b: "p",
            texte:
              "Josef Lakonishok et Inmoo Lee affinent en 2001 : les achats de dirigeants portent nettement plus d'information que leurs ventes. La raison est de bon sens — on vend pour financer un achat immobilier, un divorce, un impôt, une diversification personnelle ; on achète des titres de son employeur pour une raison plus étroite. L'effet est aussi plus marqué sur les petites sociétés, moins suivies par les analystes.",
          },
          {
            b: "p",
            texte:
              "Lauren Cohen, Christopher Malloy et Lukasz Pomorski franchissent une étape supplémentaire en 2012 en séparant deux populations. Certains dirigeants échangent selon un calendrier régulier — même mois chaque année, plan d'épargne automatique. D'autres rompent leurs habitudes. Seuls les seconds portent une information exploitable ; les opérations de routine n'annoncent rien.",
          },
          {
            b: "encadre",
            titre: "Ce que cela dit de cette application",
            texte:
              "Cet outil n'opère pas cette distinction : établir le caractère routinier d'un dirigeant demande plusieurs années d'historique individuel, dont il ne dispose pas. Une part de ce qu'il affiche est donc, selon cette littérature, du bruit. C'est pourquoi il ne classe ni ne note les pistes, et rappelle sur chaque fiche que les motifs d'une opération ne sont jamais déclarés.",
          },
          {
            b: "p",
            texte:
              "La conclusion opérationnelle est une comparaison de deux nombres : le gain anormal moyen rapporté par la littérature, qui est modeste, et le seuil de rentabilité affiché sur la fiche, qui ne l'est pas toujours. Quand le second dépasse le premier, l'espérance est négative avant même d'avoir eu raison.",
          },
        ],
      },
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
        type: "cours",
        titre: "Répliquer un portefeuille déclaré",
        blocs: [
          {
            b: "p",
            texte:
              "Les gestionnaires américains dépassant un certain encours doivent publier chaque trimestre la liste de leurs positions en actions. L'idée de s'en servir pour copier les meilleurs est ancienne et séduisante : pourquoi payer des frais de gestion si le portefeuille est public ?",
          },
          {
            b: "p",
            texte:
              "Murray Frank, James Poterba, Douglas Shackelford et John Shoven testent la proposition en 2004 en construisant des portefeuilles qui répliquent les positions publiées, puis en comparant leur performance à celle des fonds copiés. Le résultat est nuancé : les copies obtiennent des rendements proches, l'économie de frais compensant en partie le retard de publication.",
          },
          {
            b: "encadre",
            titre: "Ce qui a été testé, exactement",
            texte:
              "La réplication du portefeuille entier, ligne par ligne, avec rééquilibrage à chaque publication. Ce n'est pas la même chose que prélever une position dans une liste de plusieurs centaines et l'acheter seule. Cette seconde pratique — celle que suggère spontanément un flux de déclarations — n'a pas été étudiée par cet article.",
          },
          { b: "soustitre", texte: "Trois limites à garder en tête" },
          {
            b: "puces",
            points: [
              "Le décalage : plusieurs semaines entre la constitution de la position et sa publication. Elle peut avoir été soldée entre-temps, et vous ne l'apprendrez qu'au trimestre suivant.",
              "L'incomplétude : seules les actions cotées sont déclarées. Les positions vendeuses, les obligations et les instruments dérivés n'y figurent pas — une ligne apparemment offensive peut être la couverture d'autre chose.",
              "Le contexte : une position de 0,3 % dans un portefeuille de plusieurs centaines de lignes n'exprime pas la même conviction que la même ligne isolée dans un portefeuille de cinq titres.",
            ],
          },
          {
            b: "p",
            texte:
              "Ces publications restent instructives : elles montrent comment un professionnel construit un ensemble, quels secteurs il privilégie, à quel rythme il tourne. C'est un matériau d'étude solide. En faire un signal d'achat sur un titre isolé est un usage que la recherche n'a pas validé.",
          },
        ],
      },
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
        type: "cours",
        titre: "Distinguer le talent de la chance",
        blocs: [
          {
            b: "p",
            texte:
              "Sur plusieurs milliers de gérants, certains afficheront de bons résultats plusieurs années de suite par le seul effet du hasard, comme certains joueurs enchaînent les faces à pile ou face. La question n'est donc pas de savoir si des gérants surperforment — il y en a — mais si l'on peut distinguer, à l'avance, ceux qui le feront de ceux à qui la chance a souri.",
          },
          {
            b: "p",
            texte:
              "Michael Jensen pose la première pierre en 1968 en mesurant la performance des fonds corrigée du risque pris. En moyenne, les fonds ne dégagent pas de surperformance suffisante pour couvrir leurs frais. Le résultat a été reproduit de nombreuses fois depuis, sur d'autres périodes et d'autres marchés.",
          },
          { b: "soustitre", texte: "La performance passée persiste-t-elle ?" },
          {
            b: "p",
            texte:
              "Mark Carhart montre en 1997 que la persistance apparente des bons fonds s'explique en grande partie par les frais et par des expositions de style connues — notamment le momentum étudié au chapitre 11 — plutôt que par le talent du gérant. Détail éloquent : la persistance la plus fiable concerne les mauvais fonds, qui tendent à le rester, car des frais élevés sont un handicap durable là où une bonne année ne l'est pas.",
          },
          { b: "soustitre", texte: "Simuler le hasard" },
          {
            b: "p",
            texte:
              "Eugene Fama et Kenneth French adoptent en 2010 une approche différente : simuler des milliers d'univers où aucun gérant n'a de talent, puis comparer la distribution obtenue à la distribution réelle. Si le talent existait largement, la queue supérieure réelle devrait être nettement plus épaisse que celle du hasard. Elle l'est très peu, une fois les frais déduits.",
          },
          {
            b: "encadre",
            titre: "Le même raisonnement s'applique à vous",
            texte:
              "Une série de bons choix ne démontre pas une compétence tant que les observations sont peu nombreuses. C'est précisément pourquoi cette application enregistre vos simulations, y compris les mauvaises, plutôt que vos impressions : ne retenir que les réussites reproduit exactement le biais que ces travaux mesurent.",
          },
        ],
      },
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
/**
 * Blocs dont le contenu restitue une etude precise, nommee dans le texte.
 *
 * Les etudes sont attachees au chapitre, pas au paragraphe : c'est la limite
 * relevee au moment de porter le cours en base. Rattacher a la main chaque
 * paragraphe a une reference serait une invention — sauf dans un cas, celui-ci :
 * quand le texte NOMME lui-meme les auteurs et decrit leur travail. Le lien
 * n'est alors pas un choix editorial, c'est une lecture de ce qui est ecrit.
 *
 * Cinq autres blocs avaient ete signales comme ambigus et sont restes
 * `mecanique_standard`, deliberement :
 *
 *   - « 5,00 % a regagner sur un ticket de 100 € » et l'exemple de correlation
 *     sont de l'arithmetique, pas des mesures. Les dire verifies laisserait
 *     croire qu'une etude les a observes ;
 *   - la decomposition du risque du chapitre MEDAF cite bien Sharpe 1964, mais
 *     ce qu'elle expose est un MODELE, pas un resultat mesure ;
 *   - les deux blocs du biais domestique generalisent (« tous les grands
 *     marches ») au-dela de ce que French et Poterba ont mesure. Les marquer
 *     verifies ferait porter a la source une affirmation plus large que la
 *     sienne.
 *
 * L'identification se fait par le titre du bloc, pas par sa position : un
 * chapitre reordonne ne doit pas deplacer silencieusement une attribution. Un
 * test exige que chaque entree corresponde a exactement un bloc, et que
 * l'etude citee figure deja parmi celles du chapitre.
 */
export interface Attribution {
  chapitre: string;
  /** Titre exact du bloc concerne. */
  titre: string;
  etudes: string[];
}

export const ATTRIBUTIONS: Attribution[] = [
  {
    chapitre: "particuliers",
    titre: "Ce que révèlent les relevés de courtage",
    etudes: ["barberOdean2000"],
  },
  {
    chapitre: "biais",
    titre: "Un réflexe mesuré",
    etudes: ["odean1998"],
  },
  {
    chapitre: "copier",
    titre: "Répliquer un portefeuille déclaré",
    etudes: ["frank2004"],
  },
];

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
    case "cours":
      return `${d.titre} ${d.blocs.map(texteBloc).join(" ")}`;
  }
}

export function texteBloc(b: BlocCours): string {
  switch (b.b) {
    case "p":
    case "soustitre":
      return b.texte;
    case "terme":
      return `${b.mot} ${b.texte}`;
    case "puces":
      return b.points.join(" ");
    case "encadre":
      return `${b.titre} ${b.texte}`;
    case "figure":
      return b.legende;
    case "calcul":
      return b.lignes.map((l) => `${l.gauche} ${l.droite}`).join(" ");
  }
}

/** Figures referencees par l'ensemble des cours. */
export function figuresReferencees(): string[] {
  const out = new Set<string>();
  for (const c of CHAPITRES) {
    for (const d of c.diapos) {
      if (d.type === "cours") {
        for (const b of d.blocs) if (b.b === "figure") out.add(b.fig);
      }
    }
  }
  return [...out];
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
