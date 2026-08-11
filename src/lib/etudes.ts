/**
 * Catalogue des travaux de recherche cites par les cours.
 *
 * Chaque entree a ete verifiee une par une contre l'API Crossref avant d'etre
 * ecrite ici : titre, auteurs, annee, revue et DOI proviennent de la notice
 * officielle de l'editeur, pas de ma memoire. Trois references pointaient
 * d'abord vers une reedition en recueil de 2000 plutot que vers l'article
 * d'origine — citer 2000 pour un article de 1979 aurait fausse la
 * chronologie, et elles ont ete corrigees vers l'original.
 *
 * C'est la seule maniere honnete de tenir la promesse « sources reelles » :
 * une reference inventee est indetectable a la lecture et parfaitement
 * credible, et quelqu'un engagerait de l'argent dessus.
 *
 * Chaque etude porte son resultat ET ses limites. Une etude sans limites
 * affichees se lit comme une loi de la nature, ce qu'aucune d'entre elles
 * n'est : ce sont des mesures, sur une periode, un marche et un echantillon
 * donnes.
 */

export interface Etude {
  cle: string;
  titre: string;
  auteurs: string;
  annee: number;
  /** Revue, ou nature du document quand il n'a pas ete publie en revue. */
  publication: string;
  doi: string;
  /** Ce que le travail a mesure, en langage courant. */
  resultat: string;
  /** Ce qu'il ne dit pas. Jamais vide. */
  limites: string;
}

/** Adresse stable d'une reference, resolue par l'agence DOI. */
export function lienDoi(doi: string): string {
  return `https://doi.org/${doi}`;
}

export const ETUDES: Record<string, Etude> = {
  sharpe1991: {
    cle: "sharpe1991",
    titre: "The Arithmetic of Active Management",
    auteurs: "Sharpe",
    annee: 1991,
    publication: "Financial Analysts Journal",
    doi: "10.2469/faj.v47.n1.7",
    resultat:
      "Avant frais, le rendement du dollar géré activement égale celui du dollar géré passivement, puisque les deux ensembles composent le marché entier. Après frais, la gestion active rapporte donc nécessairement moins en moyenne. C'est une identité arithmétique, pas une observation.",
    limites:
      "L'argument porte sur la moyenne, pas sur chaque gérant : certains battent le marché, mais mécaniquement au détriment d'autres. Il ne dit pas non plus lesquels, ni comment les reconnaître à l'avance.",
  },
  french2008: {
    cle: "french2008",
    titre: "Presidential Address: The Cost of Active Investing",
    auteurs: "French",
    annee: 2008,
    publication: "The Journal of Finance",
    doi: "10.1111/j.1540-6261.2008.01368.x",
    resultat:
      "Chiffre le coût total que les investisseurs américains paient collectivement pour tenter de battre le marché — frais de gestion, de courtage et d'intermédiation — et le compare au gain qu'aurait procuré une détention passive du marché.",
    limites:
      "Porte sur le marché américain sur une période donnée. Les niveaux de frais ont fortement baissé depuis, notamment avec les ETF ; l'ordre de grandeur reste instructif, le montant exact n'est plus d'actualité.",
  },
  barberOdean2000: {
    cle: "barberOdean2000",
    titre:
      "Trading Is Hazardous to Your Wealth: The Common Stock Investment Performance of Individual Investors",
    auteurs: "Barber, Odean",
    annee: 2000,
    publication: "The Journal of Finance",
    doi: "10.1111/0022-1082.00226",
    resultat:
      "Sur les comptes réels de dizaines de milliers de ménages américains, ceux qui échangeaient le plus ont obtenu, après frais, des rendements nettement inférieurs au marché, alors que leurs choix bruts n'étaient pas mauvais. C'est l'activité elle-même, et son coût, qui détruisait le rendement.",
    limites:
      "Données d'un seul courtier américain, sur les années 1990, avec des frais de courtage bien supérieurs à ceux d'aujourd'hui. La conclusion sur le coût du sur-échange reste valable, son ampleur chiffrée non.",
  },
  barberOdean2001: {
    cle: "barberOdean2001",
    titre: "Boys will be Boys: Gender, Overconfidence, and Common Stock Investment",
    auteurs: "Barber, Odean",
    annee: 2001,
    publication: "The Quarterly Journal of Economics",
    doi: "10.1162/003355301556400",
    resultat:
      "Les hommes échangent sensiblement plus que les femmes, et cet excès d'activité réduit davantage leur rendement net. L'excès de confiance est proposé comme explication du surcroît d'échanges.",
    limites:
      "Le sexe sert ici d'indicateur indirect de l'excès de confiance, qui n'est pas mesuré directement. Le résultat porte sur des moyennes de groupe et ne dit rien d'un individu.",
  },
  barber2014: {
    cle: "barber2014",
    titre: "The cross-section of speculator skill: Evidence from day trading",
    auteurs: "Barber, Lee, Liu, Odean",
    annee: 2014,
    publication: "Journal of Financial Markets",
    doi: "10.1016/j.finmar.2013.05.006",
    resultat:
      "Sur l'intégralité des opérations d'un marché national pendant plusieurs années, une part minime des spéculateurs très actifs dégage un rendement anormal positif de façon persistante, une fois les frais déduits. La grande majorité perd de l'argent.",
    limites:
      "Porte sur le day trading à Taïwan, une pratique très différente d'un investissement de long terme. Ne dit rien de la détention longue d'actions ou d'ETF.",
  },
  odean1998: {
    cle: "odean1998",
    titre: "Are Investors Reluctant to Realize Their Losses?",
    auteurs: "Odean",
    annee: 1998,
    publication: "The Journal of Finance",
    doi: "10.1111/0022-1082.00072",
    resultat:
      "Les investisseurs vendent leurs positions gagnantes bien plus volontiers que leurs perdantes. Or les gagnantes vendues se sont ensuite mieux comportées que les perdantes conservées : le réflexe coûte du rendement, en plus de l'impôt anticipé.",
    limites:
      "Comportement observé sur des comptes américains des années 1990. L'écart de performance mesuré est modeste, et les motivations individuelles (besoin de liquidités, fiscalité) ne sont pas observables.",
  },
  kahneman1979: {
    cle: "kahneman1979",
    titre: "Prospect Theory: An Analysis of Decision under Risk",
    auteurs: "Kahneman, Tversky",
    annee: 1979,
    publication: "Econometrica",
    doi: "10.2307/1914185",
    resultat:
      "Une perte pèse psychologiquement davantage qu'un gain de même montant, et l'on devient preneur de risque quand on est en perte — ce qui explique qu'on garde une position perdante en espérant « se refaire ».",
    limites:
      "Travail de psychologie expérimentale, mené en laboratoire sur des choix hypothétiques, pas sur des portefeuilles réels. Il décrit un mécanisme de décision, il ne prédit aucun cours.",
  },
  benartzi1995: {
    cle: "benartzi1995",
    titre: "Myopic Loss Aversion and the Equity Premium Puzzle",
    auteurs: "Benartzi, Thaler",
    annee: 1995,
    publication: "The Quarterly Journal of Economics",
    doi: "10.2307/2118511",
    resultat:
      "Plus on regarde souvent son portefeuille, plus on voit de baisses, et moins les actions paraissent supportables. La fréquence de consultation, à elle seule, change la décision — sans que rien n'ait changé dans le placement.",
    limites:
      "Explication proposée d'une énigme de marché, appuyée sur un modèle et des données agrégées ; ce n'est pas une expérience contrôlée sur des épargnants.",
  },
  bessembinder2018: {
    cle: "bessembinder2018",
    titre: "Do stocks outperform Treasury bills?",
    auteurs: "Bessembinder",
    annee: 2018,
    publication: "Journal of Financial Economics",
    doi: "10.1016/j.jfineco.2018.06.004",
    resultat:
      "Sur près d'un siècle et l'ensemble des actions américaines cotées, la majorité des titres ont rapporté moins, sur toute leur durée de vie, qu'un placement sans risque à court terme. La création de richesse du marché est concentrée sur une très petite minorité d'entreprises.",
    limites:
      "Marché américain, mesuré sur la durée de vie complète de chaque titre. Le résultat porte sur la distribution des titres, pas sur l'impossibilité de bien choisir — mais il montre que le choix moyen est perdant.",
  },
  statman1987: {
    cle: "statman1987",
    titre: "How Many Stocks Make a Diversified Portfolio?",
    auteurs: "Statman",
    annee: 1987,
    publication: "The Journal of Financial and Quantitative Analysis",
    doi: "10.2307/2330969",
    resultat:
      "Le nombre de titres nécessaires pour qu'un portefeuille soit réellement diversifié est sensiblement plus élevé que la dizaine souvent avancée, une fois pris en compte le coût de la diversification.",
    limites:
      "Analyse ancienne, sur le marché américain, avant l'existence des ETF à bas coût qui rendent la question largement théorique pour un particulier aujourd'hui.",
  },
  seyhun1986: {
    cle: "seyhun1986",
    titre: "Insiders' profits, costs of trading, and market efficiency",
    auteurs: "Seyhun",
    annee: 1986,
    publication: "Journal of Financial Economics",
    doi: "10.1016/0304-405x(86)90060-7",
    resultat:
      "Les dirigeants réalisent bien des gains anormaux sur les titres de leur propre société. En revanche, un investisseur extérieur qui les imite après la publication officielle ne dégage pas de gain suffisant pour couvrir ses frais.",
    limites:
      "Période antérieure à la publication électronique : aujourd'hui les déclarations arrivent en deux jours ouvrés et non plus en plusieurs semaines, ce qui change le délai — sans nécessairement changer la conclusion sur les frais.",
  },
  lakonishok2001: {
    cle: "lakonishok2001",
    titre: "Are Insider Trades Informative?",
    auteurs: "Lakonishok, Lee",
    annee: 2001,
    publication: "Review of Financial Studies",
    doi: "10.1093/rfs/14.1.79",
    resultat:
      "Les achats de dirigeants portent une information exploitable, davantage que leurs ventes, et surtout dans les petites sociétés. L'ampleur du rendement anormal reste toutefois modérée.",
    limites:
      "Les ventes sont bien moins informatives que les achats : un dirigeant vend pour de nombreuses raisons étrangères à son avis sur l'entreprise. L'effet mesuré est un agrégat, pas une prédiction par titre.",
  },
  cohen2012: {
    cle: "cohen2012",
    titre: "Decoding Inside Information",
    auteurs: "Cohen, Malloy, Pomorski",
    annee: 2012,
    publication: "The Journal of Finance",
    doi: "10.1111/j.1540-6261.2012.01740.x",
    resultat:
      "En séparant les dirigeants qui échangent selon un calendrier régulier de ceux qui rompent leurs habitudes, seuls les seconds portent une information : les opérations « de routine » n'annoncent rien. Toutes les déclarations d'initiés ne se valent donc pas.",
    limites:
      "La distinction routine / opportuniste demande plusieurs années d'historique par dirigeant pour être établie. Cet outil ne fait pas ce classement : il affiche toutes les déclarations sans les distinguer.",
  },
  frank2004: {
    cle: "frank2004",
    titre:
      "Copycat Funds: Information Disclosure Regulation and the Returns to Active Management in the Mutual Fund Industry",
    auteurs: "Frank, Poterba, Shackelford, Shoven",
    annee: 2004,
    publication: "The Journal of Law and Economics",
    doi: "10.1086/422982",
    resultat:
      "Des portefeuilles recopiant les positions publiées par des fonds actifs obtiennent des rendements proches de ceux des fonds copiés, l'économie de frais compensant en partie le retard de publication.",
    limites:
      "Le résultat dépend étroitement du délai de publication et suppose de répliquer l'intégralité du portefeuille, pas d'en prélever une ligne. Copier une seule position déclarée n'est pas ce qui a été testé.",
  },
  bodie1995: {
    cle: "bodie1995",
    titre: "On the Risk of Stocks in the Long Run",
    auteurs: "Bodie",
    annee: 1995,
    publication: "Financial Analysts Journal",
    doi: "10.2469/faj.v51.n3.1901",
    resultat:
      "Conteste l'idée que les actions deviendraient sûres avec le temps : le coût d'une assurance contre le fait de finir sous un placement sans risque augmente avec l'horizon, ce qui indique que le risque ne disparaît pas en s'allongeant.",
    limites:
      "Raisonnement fondé sur le prix théorique d'une option ; d'autres auteurs contestent que ce soit la bonne mesure du risque pour un épargnant. Le débat n'est pas clos — c'est justement pourquoi il figure ici.",
  },
  frenchPoterba1991: {
    cle: "frenchPoterba1991",
    titre: "Investor Diversification and International Equity Markets",
    auteurs: "French, Poterba",
    annee: 1991,
    publication: "Document de travail NBER",
    doi: "10.3386/w3609",
    resultat:
      "Les investisseurs détiennent une part écrasante d'actions de leur propre pays, très au-delà de ce que justifierait la taille de ce pays dans le marché mondial. Ce « biais domestique » réduit la diversification sans contrepartie de rendement identifiée.",
    limites:
      "Document de travail, sur des données du début des années 1990. Le biais s'est atténué depuis, sans disparaître.",
  },
  markowitz1952: {
    cle: "markowitz1952",
    titre: "Portfolio Selection",
    auteurs: "Markowitz",
    annee: 1952,
    publication: "The Journal of Finance",
    doi: "10.2307/2975974",
    resultat:
      "Montre qu'un portefeuille ne se juge pas titre par titre mais dans son ensemble : ce qui compte n'est pas le risque de chaque ligne, c'est la façon dont elles bougent les unes par rapport aux autres. Combiner des actifs peu corrélés réduit le risque total sans réduire le rendement attendu.",
    limites:
      "Le modèle suppose connus les rendements attendus, les variances et les corrélations futures. Aucun de ces trois nombres n'est observable : on les estime sur le passé, et cette estimation est fragile.",
  },
  sharpe1964: {
    cle: "sharpe1964",
    titre: "Capital Asset Prices: A Theory of Market Equilibrium under Conditions of Risk",
    auteurs: "Sharpe",
    annee: 1964,
    publication: "The Journal of Finance",
    doi: "10.2307/2977928",
    resultat:
      "Sépare le risque en deux : celui propre à une entreprise, qui disparaît par diversification, et celui du marché entier, qui ne disparaît pas. Conclusion centrale : seul le second doit être rémunéré, puisque le premier peut être supprimé gratuitement.",
    limites:
      "Repose sur des hypothèses fortes (mêmes anticipations pour tous, emprunt sans risque illimité). Les tests empiriques ultérieurs le contredisent partiellement, et l'un d'eux montre qu'il est peut-être intestable en pratique.",
  },
  fama1970: {
    cle: "fama1970",
    titre: "Efficient Capital Markets: A Review of Theory and Empirical Work",
    auteurs: "Fama",
    annee: 1970,
    publication: "The Journal of Finance",
    doi: "10.2307/2325486",
    resultat:
      "Formalise l'hypothèse d'efficience : si les prix reflètent déjà l'information disponible, aucune information de ce type ne permet de gagner davantage. Distingue trois degrés selon l'information intégrée — les cours passés, l'information publique, l'information privée.",
    limites:
      "L'efficience ne se teste jamais seule : il faut supposer un modèle de rendement attendu. Un rejet peut donc venir du modèle plutôt que de l'efficience — c'est le problème dit de l'hypothèse jointe, que l'article reconnaît lui-même.",
  },
  malkiel2003: {
    cle: "malkiel2003",
    titre: "The Efficient Market Hypothesis and Its Critics",
    auteurs: "Malkiel",
    annee: 2003,
    publication: "Journal of Economic Perspectives",
    doi: "10.1257/089533003321164958",
    resultat:
      "Passe en revue trente ans de contestations de l'efficience et conclut que les écarts documentés sont réels mais souvent trop faibles, trop instables ou trop coûteux à exploiter pour dégager un gain net après frais.",
    limites:
      "C'est une revue de littérature, donc un point de vue argumenté plutôt qu'une mesure nouvelle. D'autres chercheurs lisent les mêmes travaux et concluent différemment.",
  },
  jensen1968: {
    cle: "jensen1968",
    titre: "The Performance of Mutual Funds in the Period 1945-1964",
    auteurs: "Jensen",
    annee: 1968,
    publication: "The Journal of Finance",
    doi: "10.2307/2325404",
    resultat:
      "Première mesure systématique de la performance des fonds une fois corrigée du risque pris. Résultat : en moyenne les fonds ne dégagent pas de surperformance suffisante pour couvrir leurs frais.",
    limites:
      "Période et marché anciens, et méthode de correction du risque depuis raffinée. La conclusion a néanmoins été reproduite de nombreuses fois depuis.",
  },
  banz1981: {
    cle: "banz1981",
    titre: "The relationship between return and market value of common stocks",
    auteurs: "Banz",
    annee: 1981,
    publication: "Journal of Financial Economics",
    doi: "10.1016/0304-405x(81)90018-0",
    resultat:
      "Constate que les petites capitalisations ont dégagé un rendement supérieur à ce que leur risque de marché justifiait. Première anomalie majeure documentée contre le modèle d'équilibre alors dominant.",
    limites:
      "L'effet s'est affaibli après publication, et une partie s'explique par la difficulté et le coût d'échanger de très petites valeurs — coûts que l'étude ne déduit pas.",
  },
  famaFrench1992: {
    cle: "famaFrench1992",
    titre: "The Cross-Section of Expected Stock Returns",
    auteurs: "Fama, French",
    annee: 1992,
    publication: "The Journal of Finance",
    doi: "10.2307/2329112",
    resultat:
      "Montre que la sensibilité au marché explique mal les écarts de rendement entre actions, alors que la taille de l'entreprise et son rapport valeur comptable / valeur boursière les expliquent bien mieux.",
    limites:
      "Établit une corrélation, pas un mécanisme. Le débat reste ouvert entre une prime de risque non identifiée et une erreur d'évaluation systématique des investisseurs.",
  },
  famaFrench1993: {
    cle: "famaFrench1993",
    titre: "Common risk factors in the returns on stocks and bonds",
    auteurs: "Fama, French",
    annee: 1993,
    publication: "Journal of Financial Economics",
    doi: "10.1016/0304-405x(93)90023-5",
    resultat:
      "Propose de décrire le rendement d'un portefeuille par trois facteurs plutôt qu'un seul : le marché, la taille, et le caractère « value ». Ce cadre est devenu la référence pour juger si un gérant a réellement ajouté quelque chose.",
    limites:
      "Les facteurs sont construits à partir des données qu'ils expliquent : le pouvoir explicatif ne prouve pas l'existence d'une cause économique sous-jacente.",
  },
  jegadeesh1993: {
    cle: "jegadeesh1993",
    titre:
      "Returns to Buying Winners and Selling Losers: Implications for Stock Market Efficiency",
    auteurs: "Jegadeesh, Titman",
    annee: 1993,
    publication: "The Journal of Finance",
    doi: "10.1111/j.1540-6261.1993.tb04702.x",
    resultat:
      "Documente le momentum : sur des horizons de trois à douze mois, les titres qui ont le mieux performé continuent en moyenne de surperformer. C'est directement contraire à l'idée que les cours passés ne renseignent sur rien.",
    limites:
      "L'effet exige une rotation fréquente du portefeuille, donc des frais élevés, et s'accompagne d'effondrements brutaux lors des retournements de marché.",
  },
  deBondt1985: {
    cle: "deBondt1985",
    titre: "Does the Stock Market Overreact?",
    auteurs: "De Bondt, Thaler",
    annee: 1985,
    publication: "The Journal of Finance",
    doi: "10.1111/j.1540-6261.1985.tb05004.x",
    resultat:
      "Sur des horizons de trois à cinq ans, les titres les plus délaissés ont ensuite surperformé les plus recherchés. Les auteurs y voient une surréaction des investisseurs aux nouvelles, corrigée ensuite.",
    limites:
      "Horizon long et sensible à la période retenue. Le résultat coexiste avec le momentum sur horizon court, ce que le cadre théorique peine à réconcilier.",
  },
  shiller1980: {
    cle: "shiller1980",
    titre:
      "Do Stock Prices Move Too Much to be Justified by Subsequent Changes in Dividends?",
    auteurs: "Shiller",
    annee: 1980,
    publication: "Document de travail NBER",
    doi: "10.3386/w0456",
    resultat:
      "Constate que les cours varient bien davantage que ne le justifieraient les revenus effectivement versés ensuite. Si les prix reflétaient uniquement les revenus futurs, ils devraient être plus stables que ces revenus, pas moins.",
    limites:
      "Document de travail, publié ensuite en revue. La méthode a fait l'objet de contestations statistiques nourries, notamment sur le traitement des séries non stationnaires.",
  },
  carhart1997: {
    cle: "carhart1997",
    titre: "On Persistence in Mutual Fund Performance",
    auteurs: "Carhart",
    annee: 1997,
    publication: "The Journal of Finance",
    doi: "10.1111/j.1540-6261.1997.tb03808.x",
    resultat:
      "La persistance apparente des bons fonds s'explique en grande partie par les frais et par des effets de style connus, plutôt que par le talent du gérant. La persistance la plus nette concerne les plus mauvais fonds, qui restent mauvais.",
    limites:
      "Porte sur les fonds actions américains sur une période donnée. Ne dit pas qu'aucun gérant n'a de talent, mais que la performance passée ne permet pas de le repérer de façon fiable.",
  },
  famaFrench2010: {
    cle: "famaFrench2010",
    titre: "Luck versus Skill in the Cross-Section of Mutual Fund Returns",
    auteurs: "Fama, French",
    annee: 2010,
    publication: "The Journal of Finance",
    doi: "10.1111/j.1540-6261.2010.01598.x",
    resultat:
      "En simulant ce que le hasard seul produirait, très peu de gérants affichent une performance que la chance n'explique pas, une fois les frais déduits. Collectivement, les fonds actifs sous-performent d'un montant proche de leurs frais.",
    limites:
      "Fonds américains, méthode de simulation dont les hypothèses sont discutées dans la littérature. Le résultat porte sur l'ensemble des gérants, pas sur un fonds particulier.",
  },
};

export const TOUTES_LES_ETUDES: Etude[] = Object.values(ETUDES);
