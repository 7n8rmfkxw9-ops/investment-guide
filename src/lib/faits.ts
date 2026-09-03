/**
 * Catalogue des donnees personnelles que l'assistant sait lire.
 *
 * Pourquoi un catalogue plutot qu'un editeur libre de couples cle/valeur :
 * une regle lit ses faits par leur cle exacte, et une cle mal orthographiee ne
 * produit aucune erreur. Elle produit un fait que personne ne lit, donc une
 * regle qui ne se declenche jamais — silencieusement. Quelqu'un croirait sa
 * couverture surveillee alors que rien ne la surveille.
 *
 * Un test verifie que ce catalogue couvre toutes les cles que les regles
 * lisent reellement : ajouter une lecture dans une regle sans l'ajouter ici
 * fait echouer la CI.
 */

export type TypeFait = "euros" | "pourcentage" | "nombre" | "date" | "texte";

export interface DefinitionFait {
  cle: string;
  domaine: string;
  libelle: string;
  /** A quoi ca sert, en une phrase. Sans cela, on saisit sans savoir pourquoi. */
  aQuoi: string;
  type: TypeFait;
  /** Ou trouver l'information. Une question sans reponse accessible reste vide. */
  ou?: string;
  /** Cadence de reconfirmation proposee, en mois. Nul = ne perime pas. */
  cadenceMois: number | null;
  /** Facultatif : le laisser vide n'empeche aucune regle de conclure. */
  facultatif?: boolean;
}

export const DOMAINES: Record<string, { titre: string; detail: string }> = {
  habitation: {
    titre: "Habitation",
    detail: "Pour vérifier que la valeur assurée suit la valeur réelle du bien.",
  },
  mutualite: {
    titre: "Mutualité",
    detail: "Pour comparer les avantages des caisses une fois par an.",
  },
  credit: {
    titre: "Crédit",
    detail: "Pour vérifier que l'assurance solde restant dû couvre le bon montant.",
  },
  assurance: {
    titre: "Contrat d'assurance",
    detail: "Pour être prévenu avant la date limite de résiliation.",
  },
};

export const FAITS: DefinitionFait[] = [
  {
    cle: "habitation.valeur_assuree_eur",
    domaine: "habitation",
    libelle: "Valeur assurée",
    aQuoi:
      "Le montant pour lequel votre habitation est assurée. Sert de référence à tout le reste : sans lui, aucune vérification de sous-assurance n'est possible.",
    ou: "Sur votre police d'assurance habitation, souvent appelée « capital assuré » ou « valeur de reconstruction ».",
    type: "euros",
    cadenceMois: 24,
  },
  {
    cle: "habitation.travaux_cumules_eur",
    domaine: "habitation",
    libelle: "Travaux depuis la dernière révision",
    aQuoi:
      "Le total dépensé en travaux depuis la dernière fois que la valeur assurée a été revue. C'est ce cumul qui déclenche l'alerte.",
    ou: "Vos factures. Comptez ce qui augmente la valeur du bien (extension, toiture, cuisine), pas l'entretien courant.",
    type: "euros",
    cadenceMois: 12,
  },
  {
    cle: "habitation.valeur_revisee_le",
    domaine: "habitation",
    libelle: "Dernière révision de la valeur",
    aQuoi: "Sert seulement à dire depuis combien de temps le cumul court.",
    type: "date",
    cadenceMois: null,
    facultatif: true,
  },
  {
    cle: "habitation.seuil_travaux_pct",
    domaine: "habitation",
    libelle: "Seuil d'alerte",
    aQuoi:
      "Part de la valeur assurée à partir de laquelle les travaux déclenchent une vérification. Laissé vide : un dixième.",
    type: "pourcentage",
    cadenceMois: null,
    facultatif: true,
  },
  {
    cle: "mutualite.caisse_actuelle",
    domaine: "mutualite",
    libelle: "Votre mutualité",
    aQuoi: "Pour situer votre caisse dans la comparaison annuelle.",
    type: "texte",
    cadenceMois: null,
  },
  {
    cle: "mutualite.derniere_revue_le",
    domaine: "mutualite",
    libelle: "Dernière comparaison des caisses",
    aQuoi:
      "La comparaison est proposée douze mois après cette date. Laissé vide, elle est proposée tout de suite.",
    type: "date",
    cadenceMois: null,
    facultatif: true,
  },
  {
    cle: "credit.capital_restant_eur",
    domaine: "credit",
    libelle: "Capital restant dû",
    aQuoi:
      "Ce qu'il reste à rembourser. Comparé à la couverture de l'assurance solde restant dû quand un crédit change.",
    ou: "Sur votre tableau d'amortissement, ou l'espace client de votre banque.",
    type: "euros",
    cadenceMois: 6,
  },
  {
    cle: "credit.srd_couverture_eur",
    domaine: "credit",
    libelle: "Montant couvert par l'assurance solde restant dû",
    aQuoi:
      "Le capital que l'assurance rembourserait. S'il ne suit pas le capital restant dû, l'écart reste à charge de vos héritiers — ou vous payez pour rien.",
    ou: "Sur le contrat d'assurance solde restant dû, pas sur le contrat de crédit.",
    type: "euros",
    cadenceMois: 12,
  },
  {
    cle: "assurance.contrat",
    domaine: "assurance",
    libelle: "Nom du contrat surveillé",
    aQuoi: "Pour nommer le contrat dans le rappel d'échéance.",
    type: "texte",
    cadenceMois: null,
    facultatif: true,
  },
  {
    cle: "assurance.echeance_le",
    domaine: "assurance",
    libelle: "Date d'échéance",
    aQuoi:
      "La date anniversaire du contrat. Le rappel de préavis se calcule à partir d'elle — et seulement si un délai de préavis sourcé a été enregistré.",
    ou: "Sur les conditions particulières du contrat.",
    type: "date",
    cadenceMois: 12,
  },
];

export function faitsDuDomaine(domaine: string): DefinitionFait[] {
  return FAITS.filter((f) => f.domaine === domaine);
}

export function definitionFait(cle: string): DefinitionFait | undefined {
  return FAITS.find((f) => f.cle === cle);
}

// ---------------------------------------------------------------------------
// Signaux
//
// Un signal porte un changement du monde exterieur ET l'adresse ou on l'a lu.
// Les regles calculent sur son `payload` ; le resume est pour l'humain.

export interface DefinitionSignal {
  domaine: string;
  titre: string;
  aQuoi: string;
  /** Champs numeriques ou textuels attendus dans le payload. */
  champs: { cle: string; libelle: string; type: TypeFait | "choix"; choix?: string[] }[];
  /** Exemple d'adresse acceptable, pour que « source » ne reste pas abstrait. */
  exempleUrl: string;
}

export const SIGNAUX: DefinitionSignal[] = [
  {
    domaine: "mutualite",
    titre: "Barème d'une caisse",
    aQuoi:
      "Les montants d'intervention relevés sur la page officielle d'une caisse. Un poste que vous ne renseignez pas est affiché comme « non documenté » — jamais estimé.",
    champs: [
      { cle: "caisse", libelle: "Nom de la caisse", type: "texte" },
      { cle: "orthodontie", libelle: "Orthodontie", type: "euros" },
      { cle: "psychomotricite", libelle: "Psychomotricité", type: "euros" },
      { cle: "sport", libelle: "Activités sportives", type: "euros" },
      { cle: "sejours_enfants", libelle: "Séjours pour enfants", type: "euros" },
    ],
    exempleUrl: "https://www.exemple-mutualite.be/avantages",
  },
  {
    domaine: "credit",
    titre: "Changement sur un crédit",
    aQuoi:
      "Fin ou modification d'un crédit. C'est le moment où la couverture de l'assurance solde restant dû peut cesser de correspondre au capital réellement dû.",
    champs: [
      {
        cle: "evenement",
        libelle: "Nature",
        type: "choix",
        choix: ["fin", "modification"],
      },
      { cle: "capital_restant_eur", libelle: "Capital restant dû après", type: "euros" },
    ],
    exempleUrl: "https://banque.example.be/mes-credits",
  },
  {
    domaine: "assurance_preavis",
    titre: "Délai de préavis applicable",
    aQuoi:
      "Le nombre de jours de préavis, relevé à sa source. Aucun délai n'est écrit dans le code de cet outil : sans ce signal, le rappel d'échéance ne se déclenche pas du tout.",
    champs: [{ cle: "preavis_jours", libelle: "Préavis (jours)", type: "nombre" }],
    exempleUrl: "https://www.exemple-officiel.be/resiliation",
  },
];
