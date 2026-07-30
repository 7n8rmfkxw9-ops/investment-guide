/**
 * Plateformes de courtage reellement agreees et accessibles depuis la
 * Belgique. Ordre alphabetique : ce n'est pas un classement, et aucune entree
 * n'est une recommandation.
 *
 * `recherche` construit un lien vers la recherche du titre sur le site du
 * courtier, quand une URL de recherche publique et verifiee existe. Pour les
 * autres, seul le lien vers l'accueil est propose plutot que de deviner une
 * URL non verifiee qui risquerait de mener a une page inexistante — mieux
 * vaut un lien qui fonctionne a coup sur qu'un lien plus precis qui casse.
 *
 * Ces liens n'ouvrent jamais un tunnel d'achat pre-rempli ni ne transmettent
 * d'ordre : l'utilisateur arrive sur le site du courtier et agit lui-meme,
 * avec son propre compte.
 */
export interface Courtier {
  nom: string;
  lien: string;
  note: string;
  recherche?: (q: string) => string;
}

export const COURTIERS: Courtier[] = [
  {
    nom: "Bolero (KBC)",
    lien: "https://www.bolero.be/",
    note: "Courtier en ligne belge, agréé FSMA, adossé à KBC.",
    recherche: (q) => `https://www.bolero.be/fr/chercher?query=${encodeURIComponent(q)}`,
  },
  {
    nom: "DEGIRO",
    lien: "https://www.degiro.be/",
    note: "Courtier en ligne néerlandais, opérant en Belgique sous passeport européen.",
  },
  {
    nom: "Keytrade Bank",
    lien: "https://www.keytradebank.be/",
    note: "Banque en ligne belge, agréée FSMA, avec courtage intégré.",
  },
  {
    nom: "Saxo Bank",
    lien: "https://www.home.saxo/fr-be",
    note: "Courtier danois, opérant en Belgique sous passeport européen.",
    recherche: (q) => `https://www.home.saxo/fr-be/search-results?q=${encodeURIComponent(q)}`,
  },
  {
    nom: "Trade Republic",
    lien: "https://www.traderepublic.com/fr-be",
    note: "Courtier allemand, propose des fractions d'actions et d'ETF.",
  },
];
