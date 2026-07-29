/**
 * Contenu pedagogique. Source unique pour le lexique, les explications de
 * signaux et les fiches de comprehension. Ecrit pour un lecteur qui debute
 * completement : aucun terme n'est employe sans etre defini.
 */

import type { SignalType } from "./types";

export interface Terme {
  mot: string;
  court: string; // une phrase, pour les bulles inline
  long?: string; // developpement, pour la page Comprendre
}

export const LEXIQUE: Terme[] = [
  {
    mot: "Action",
    court: "Une petite part de propriété d'une entreprise.",
    long:
      "Acheter une action, c'est devenir copropriétaire d'une entreprise, à hauteur " +
      "de ce que vous avez mis. Si l'entreprise prospère, la valeur de votre part " +
      "peut monter ; si elle va mal, elle peut baisser, voire ne plus rien valoir " +
      "si l'entreprise fait faillite. Vous pouvez aussi recevoir une partie des " +
      "bénéfices, appelée dividende — mais rien ne l'oblige.",
  },
  {
    mot: "ETF",
    court:
      "Un panier contenant des centaines d'actions à la fois, acheté en une seule fois.",
    long:
      "Un ETF (« fonds indiciel coté ») regroupe des centaines ou des milliers " +
      "d'entreprises dans un seul produit. En acheter une part, c'est posséder un " +
      "tout petit morceau de toutes ces entreprises d'un coup. L'intérêt : si une " +
      "entreprise s'effondre, elle ne représente qu'une fraction minuscule de " +
      "votre placement. C'est le contraire d'acheter une seule action, où tout " +
      "repose sur une seule société.",
  },
  {
    mot: "SEC",
    court: "Le gendarme de la bourse américaine.",
    long:
      "La Securities and Exchange Commission est l'autorité qui surveille les " +
      "marchés financiers aux États-Unis. Elle oblige les grands investisseurs et " +
      "les dirigeants d'entreprise à déclarer publiquement certaines opérations. " +
      "Ces déclarations sont gratuites et accessibles à tous. C'est la source " +
      "des pistes américaines de cet outil ; pour la Belgique, l'équivalent " +
      "est la FSMA.",
  },
  {
    mot: "EDGAR",
    court: "La base de données publique où la SEC publie tous ces documents.",
  },
  {
    mot: "13F",
    court:
      "Déclaration trimestrielle obligatoire des gros gérants : la liste de ce qu'ils détiennent.",
    long:
      "Tout gestionnaire américain qui gère plus de 100 millions de dollars doit " +
      "publier, chaque trimestre, la liste des actions qu'il détient. C'est ainsi " +
      "qu'on sait ce que possède Berkshire Hathaway (le fonds de Warren Buffett). " +
      "Attention à deux limites majeures : le document paraît jusqu'à 45 jours " +
      "après la fin du trimestre — les opérations peuvent donc dater de plusieurs " +
      "mois — et il ne montre que les paris à la hausse, pas les paris à la baisse " +
      "ni les obligations ou liquidités.",
  },
  {
    mot: "Form 4",
    court:
      "Déclaration d'un dirigeant qui achète ou vend des actions de sa propre entreprise.",
    long:
      "Quand un dirigeant, un administrateur ou un très gros actionnaire d'une " +
      "société américaine achète ou vend des actions de cette société, il doit le " +
      "déclarer sous deux jours ouvrés. C'est donc une information beaucoup plus " +
      "fraîche qu'un 13F. C'est pourquoi cet outil l'affiche en priorité.",
  },
  {
    mot: "Initié",
    court:
      "Une personne de l'intérieur : dirigeant, administrateur, ou actionnaire détenant plus de 10 %.",
    long:
      "Le mot n'a rien d'illégal ici. Un « initié » est simplement quelqu'un qui, " +
      "par sa fonction, connaît l'entreprise de l'intérieur. Ses opérations sont " +
      "encadrées et doivent être déclarées publiquement, précisément pour éviter " +
      "les abus.",
  },
  {
    mot: "Ticker",
    court: "Le code court d'une action en bourse (AAPL pour Apple).",
  },
  {
    mot: "CUSIP",
    court:
      "Un numéro d'identification d'un titre américain. Les 13F ne donnent que ce numéro, pas le ticker.",
  },
  {
    mot: "CIK",
    court: "Le numéro de dossier d'une entreprise ou d'un fonds auprès de la SEC.",
  },
  {
    mot: "Position",
    court: "Ce qu'un investisseur détient sur une entreprise donnée.",
    long:
      "« Avoir une position sur Apple » signifie simplement détenir des actions " +
      "Apple. La taille de la position, c'est le nombre d'actions ou le montant " +
      "investi.",
  },
  {
    mot: "Position longue",
    court: "Détenir un titre en espérant qu'il monte. C'est l'achat classique.",
    long:
      "L'inverse est la position courte (« vente à découvert ») : parier sur la " +
      "baisse. Les 13F ne montrent que les positions longues — un fonds peut donc " +
      "parier contre une entreprise sans que cela apparaisse nulle part ici.",
  },
  {
    mot: "Gestionnaire",
    court:
      "Une société qui investit l'argent de ses clients (Berkshire Hathaway, Bridgewater…).",
  },
  {
    mot: "Frais de courtage",
    court:
      "Ce que votre courtier prélève à chaque ordre. Décisif quand on investit de petites sommes.",
    long:
      "Si votre courtier prend 1 € par ordre et que vous investissez 50 €, cela " +
      "représente 2 % du montant à l'achat — et encore 2 % à la revente. Votre " +
      "placement doit donc gagner environ 4 % rien que pour rentrer dans vos frais. " +
      "C'est le calcul affiché sur chaque fiche de cet outil.",
  },
  {
    mot: "Diversification",
    court:
      "Répartir son argent sur beaucoup d'entreprises pour qu'aucune ne puisse tout emporter.",
    long:
      "Mettre 100 € sur une seule action, c'est faire dépendre le résultat d'une " +
      "seule entreprise. Mettre 100 € sur un ETF mondial, c'est le répartir sur " +
      "des centaines d'entreprises. La seconde approche ne garantit pas de gains, " +
      "mais elle supprime le risque de tout perdre à cause d'une seule société.",
  },
  {
    mot: "Fraction d'action",
    court:
      "Acheter un morceau d'action quand elle coûte plus cher que ce que vous voulez investir.",
    long:
      "Certaines actions valent plusieurs centaines d'euros l'unité. Beaucoup de " +
      "courtiers permettent d'en acheter une fraction — par exemple 0,2 action. " +
      "C'est indispensable pour investir 50 € sur un titre qui en vaut 250.",
  },
  {
    mot: "Volatilité",
    court: "L'ampleur des variations de prix. Forte volatilité = fortes secousses.",
  },
  {
    mot: "FSMA",
    court: "Le gendarme de la bourse belge, équivalent de la SEC américaine.",
    long:
      "La Financial Services and Markets Authority surveille les marchés " +
      "financiers en Belgique. Comme la SEC aux États-Unis, elle publie " +
      "gratuitement les opérations déclarées par les dirigeants des sociétés " +
      "belges cotées. C'est la source des pistes belges de cet outil.",
  },
  {
    mot: "MAR",
    court:
      "Le règlement européen qui oblige les dirigeants à déclarer leurs opérations.",
    long:
      "Le règlement sur les abus de marché (Market Abuse Regulation) est la " +
      "règle européenne équivalente au Form 4 américain. Son article 19 impose " +
      "aux dirigeants et à leurs proches de déclarer leurs achats et ventes " +
      "d'actions de leur propre société, dès que le total dépasse 20 000 € sur " +
      "l'année. Chaque régulateur national les publie — la FSMA pour la Belgique.",
  },
  {
    mot: "ISIN",
    court:
      "Le numéro d'identification international d'un titre (BE0974362940 pour Barco).",
    long:
      "Là où les Américains utilisent un ticker court, l'Europe identifie " +
      "chaque titre par un code ISIN de 12 caractères commençant par le pays " +
      "d'émission : BE pour la Belgique, FR pour la France. C'est ce code que " +
      "vous saisirez chez votre courtier pour être sûr d'acheter le bon titre.",
  },
  {
    mot: "TOB",
    court:
      "La taxe belge sur les opérations de bourse, prélevée à chaque achat ET à chaque vente.",
    long:
      "En Belgique, chaque transaction boursière est taxée, à l'achat comme à " +
      "la vente. Le taux dépend du produit (souvent 0,12 % pour un ETF, " +
      "davantage pour d'autres). Elle s'ajoute aux frais de votre courtier, ce " +
      "qui compte beaucoup sur de petits montants. Les taux évoluent : " +
      "vérifiez auprès d'une source officielle.",
  },
  {
    mot: "Précompte mobilier",
    court: "L'impôt belge de 30 % prélevé sur les dividendes que vous recevez.",
    long:
      "Il est retenu à la source et vous libère de toute déclaration " +
      "ultérieure. Une première tranche de dividendes d'actions est exonérée " +
      "chaque année, récupérable via votre déclaration fiscale. Les montants " +
      "évoluent : vérifiez auprès d'une source officielle.",
  },
  {
    mot: "PEA",
    court:
      "Enveloppe française avantageuse fiscalement, mais réservée aux entreprises européennes.",
    long:
      "Le Plan d'Épargne en Actions permet, après 5 ans de détention, d'être " +
      "exonéré d'impôt sur le revenu sur les gains (les prélèvements sociaux " +
      "restent dus). Point capital pour cet outil : les actions américaines ne " +
      "sont pas éligibles au PEA. Certains ETF conçus spécialement peuvent l'être " +
      "tout en suivant des indices américains. Les règles fiscales évoluent : " +
      "vérifiez auprès d'une source officielle.",
  },
  {
    mot: "CTO",
    court:
      "Le compte-titres ordinaire : aucune limite, mais les gains sont imposés dès le premier euro.",
    long:
      "Le compte-titres permet d'acheter n'importe quel titre mondial, y compris " +
      "les actions américaines suivies ici. En contrepartie, les gains et " +
      "dividendes sont imposés (prélèvement forfaitaire unique). Les règles " +
      "fiscales évoluent : vérifiez auprès d'une source officielle.",
  },
];

/** Explication du signal, en langage courant, avec ce qu'il ne dit pas. */
export interface ExplicationSignal {
  titre: string;
  cequecest: string;
  cequecelanedit: string;
}

export const EXPLICATIONS: Record<SignalType, ExplicationSignal> = {
  "13f_new": {
    titre: "Un grand fonds a acheté cette entreprise pour la première fois",
    cequecest:
      "Ce gestionnaire ne détenait pas cette entreprise au trimestre précédent, " +
      "et il en détient maintenant. Une nouvelle position est souvent le signal " +
      "13F le plus commenté, car elle traduit une décision délibérée plutôt qu'un " +
      "simple ajustement.",
    cequecelanedit:
      "Ni quand l'achat a eu lieu exactement (il peut dater de plusieurs mois), " +
      "ni à quel prix, ni pourquoi. Un fonds peut acheter pour se couvrir, pour " +
      "des raisons fiscales, ou parce qu'un gérant junior l'a décidé. Le fonds a " +
      "peut-être déjà tout revendu depuis.",
  },
  "13f_increase": {
    titre: "Un grand fonds a augmenté sa position existante",
    cequecest:
      "Le gestionnaire détenait déjà cette entreprise et en a acheté davantage " +
      "(au moins 10 % de titres en plus).",
    cequecelanedit:
      "Un renforcement peut simplement rééquilibrer un portefeuille après des " +
      "mouvements de marché, sans traduire un enthousiasme particulier.",
  },
  "13f_decrease": {
    titre: "Un grand fonds a réduit sa position",
    cequecest:
      "Le gestionnaire a vendu une partie de ses titres (au moins 10 % en moins), " +
      "tout en en conservant.",
    cequecelanedit:
      "Une réduction peut venir d'un besoin de liquidités, d'une règle interne " +
      "limitant le poids d'une ligne, ou d'une optimisation fiscale — pas " +
      "forcément d'un avis négatif sur l'entreprise.",
  },
  "13f_exit": {
    titre: "Un grand fonds a soldé toute sa position",
    cequecest:
      "L'entreprise figurait au trimestre précédent et a totalement disparu du " +
      "portefeuille déclaré.",
    cequecelanedit:
      "La sortie peut avoir eu lieu il y a plusieurs mois. Elle peut aussi " +
      "résulter d'une fusion ou d'un rachat de l'entreprise, sans aucune décision " +
      "de vente.",
  },
  form4_buy: {
    titre: "Un dirigeant a acheté des actions de sa propre entreprise",
    cequecest:
      "Une personne de l'intérieur a engagé son argent personnel pour acheter sur " +
      "le marché. C'est le signal considéré comme le plus informatif des deux : " +
      "un dirigeant n'a en général qu'une raison d'acheter, alors qu'il a mille " +
      "raisons de vendre. La donnée est fraîche (déclarée sous 2 jours ouvrés).",
    cequecelanedit:
      "Le montant compte : quelques milliers d'euros pour un dirigeant très bien " +
      "payé peut être un geste symbolique. Un achat ne garantit évidemment rien — " +
      "les dirigeants se trompent aussi sur leur propre entreprise.",
  },
  mar_buy: {
    titre:
      "Un dirigeant européen a acheté des actions de sa propre entreprise",
    cequecest:
      "Une personne de l'intérieur — dirigeant, administrateur, ou un de ses " +
      "proches — a acheté des actions de sa société, et l'a déclaré à son " +
      "régulateur national comme l'exige le règlement européen sur les abus de " +
      "marché. Comme pour les États-Unis, l'achat est le signal considéré " +
      "comme le plus informatif : il engage l'argent personnel du dirigeant.",
    cequecelanedit:
      "L'obligation de déclarer ne commence qu'au-delà de 20 000 € cumulés sur " +
      "l'année : les petites opérations n'apparaissent pas, et un premier achat " +
      "de l'année peut être déclaré avec du retard. Les motifs ne sont jamais " +
      "déclarés, et un dirigeant peut se tromper sur sa propre entreprise.",
  },
  mar_sell: {
    titre: "Un dirigeant européen a vendu des actions de sa propre entreprise",
    cequecest:
      "Une personne de l'intérieur a vendu des actions de sa société et l'a " +
      "déclaré à son régulateur national au titre du règlement européen sur les " +
      "abus de marché.",
    cequecelanedit:
      "C'est le signal le moins informatif, pour les mêmes raisons qu'aux " +
      "États-Unis : les dirigeants vendent régulièrement pour des raisons " +
      "personnelles — payer leurs impôts, acheter un logement, ou ne pas " +
      "concentrer toute leur fortune sur une seule société. Ne concluez pas " +
      "qu'un dirigeant qui vend anticipe une baisse.",
  },
  form4_sell: {
    titre: "Un dirigeant a vendu des actions de sa propre entreprise",
    cequecest:
      "Une personne de l'intérieur a vendu sur le marché. La donnée est fraîche " +
      "(déclarée sous 2 jours ouvrés).",
    cequecelanedit:
      "C'est le signal le moins informatif. Les dirigeants sont souvent payés en " +
      "actions et en vendent régulièrement pour des raisons personnelles : acheter " +
      "un logement, payer leurs impôts, ou simplement ne pas avoir toute leur " +
      "fortune dans une seule entreprise. Beaucoup de ventes suivent un calendrier " +
      "programmé des mois à l'avance. Ne concluez pas qu'un dirigeant qui vend " +
      "anticipe une baisse.",
  },
};
