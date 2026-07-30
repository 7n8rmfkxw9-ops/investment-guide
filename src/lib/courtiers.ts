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
 *
 * `fraisPetitOrdreEur` est le frais de courtage pour un ordre d'actions sur
 * Euronext Bruxelles jusqu'a 250 €, la tranche la plus pertinente pour des
 * tickets de 50-100 €. Deux niveaux de confiance, indiques par `fraisSource` :
 *
 *  - "officiel" : lu directement dans la grille tarifaire publiee par le
 *    courtier (PDF ou page officielle), a la date `fraisConstateLe`.
 *  - "estimation" : le site officiel n'a pas pu etre consulte depuis cet
 *    environnement (page rendue en JavaScript, domaine bloque) ; le chiffre
 *    vient de plusieurs sources tierces concordantes, sans confirmation
 *    directe. L'interface doit le presenter avec cette reserve.
 *
 * Ces tarifs changent : ne jamais les afficher comme une verite figee, et
 * toujours proposer le lien vers la grille du courtier pour verification.
 */
export interface Courtier {
  nom: string;
  lien: string;
  note: string;
  recherche?: (q: string) => string;
  fraisPetitOrdreEur: number;
  fraisNote: string;
  fraisSource: "officiel" | "estimation";
  fraisConstateLe: string;
  fraisLien: string;
}

export const COURTIERS: Courtier[] = [
  {
    nom: "Bolero (KBC)",
    lien: "https://www.bolero.be/",
    note: "Courtier en ligne belge, agréé FSMA, adossé à KBC.",
    recherche: (q) => `https://www.bolero.be/fr/chercher?query=${encodeURIComponent(q)}`,
    fraisPetitOrdreEur: 2.5,
    fraisNote: "Ordre jusqu'à 250 € sur Euronext Bruxelles.",
    fraisSource: "officiel",
    fraisConstateLe: "juillet 2026, grille en vigueur depuis janvier 2026",
    fraisLien: "https://www.bolero.be/fr/tarifs",
  },
  {
    nom: "DEGIRO",
    lien: "https://www.degiro.be/",
    note: "Courtier en ligne néerlandais, opérant en Belgique sous passeport européen.",
    fraisPetitOrdreEur: 1.0,
    fraisNote:
      "Ordre sur Euronext, structure historiquement stable de ce courtier (frais de courtage nul + frais de connexion).",
    fraisSource: "estimation",
    fraisConstateLe: "juillet 2026, non vérifié sur une page officielle depuis cet environnement",
    fraisLien: "https://www.degiro.be/tarifs",
  },
  {
    nom: "Keytrade Bank",
    lien: "https://www.keytradebank.be/",
    note: "Banque en ligne belge, agréée FSMA, avec courtage intégré.",
    fraisPetitOrdreEur: 2.45,
    fraisNote: "Ordre de 0 à 250 € sur Bruxelles, Amsterdam ou Paris.",
    fraisSource: "officiel",
    fraisConstateLe: "juillet 2026, grille tarifaire 2026",
    fraisLien: "https://www.keytradebank.be/fr/aide/quels-sont-les-couts-impots-et-montant-minimum",
  },
  {
    nom: "Saxo Bank",
    lien: "https://www.home.saxo/fr-be",
    note: "Courtier danois, opérant en Belgique sous passeport européen.",
    recherche: (q) => `https://www.home.saxo/fr-be/search-results?q=${encodeURIComponent(q)}`,
    fraisPetitOrdreEur: 2.0,
    fraisNote: "Commission minimale approximative sur actions européennes, compte Classic.",
    fraisSource: "estimation",
    fraisConstateLe: "juillet 2026, non vérifié sur une page officielle depuis cet environnement",
    fraisLien: "https://www.home.saxo/rates-and-conditions/stocks/commissions",
  },
  {
    nom: "Trade Republic",
    lien: "https://www.traderepublic.com/fr-be",
    note: "Courtier allemand, propose des fractions d'actions et d'ETF.",
    fraisPetitOrdreEur: 1.0,
    fraisNote: "Tarif forfaitaire par ordre, quel que soit le montant.",
    fraisSource: "estimation",
    fraisConstateLe: "juillet 2026, non vérifié sur une page officielle depuis cet environnement",
    fraisLien: "https://www.traderepublic.com/fr-be",
  },
];
