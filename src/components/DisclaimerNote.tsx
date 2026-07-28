/**
 * Note obligatoire, affichée sur CHAQUE fiche. Volontairement non masquable :
 * pas de bouton de fermeture, pas d'état "vu", pas de condition d'affichage.
 */
export default function DisclaimerNote() {
  return (
    <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm italic text-amber-900">
      Ceci n'est pas un conseil d'investissement. Les données 13F ont jusqu'à 45 jours de
      retard et ne montrent que les positions longues. Aucune étude ne démontre de façon
      consensuelle qu'imiter les grands fonds génère un avantage après frais.
    </p>
  );
}
