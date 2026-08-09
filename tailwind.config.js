/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      /**
       * Echelle typographique.
       *
       * L'application etait ecrite a 12 et 14 px : 132 usages de `text-xs`,
       * 139 de `text-sm`, un seul de `text-base`. C'est dense a l'ecran et
       * fatigant sur un telephone. Redefinir l'echelle ici plutot que de
       * modifier 270 endroits remonte tout d'un cran, et permet surtout de
       * donner a chaque taille l'interlignage et l'approche qui lui vont —
       * ce que les valeurs par defaut de Tailwind ne font pas.
       *
       * Les grandes tailles resserrent l'approche (`letterSpacing` negatif) :
       * c'est ce qui distingue un titre compose d'un titre simplement
       * agrandi. Les petites gardent un interlignage genereux, parce que
       * c'est la que la lisibilite se perd en premier.
       */
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.5" }], // 13 px — mentions marginales
        sm: ["0.9375rem", { lineHeight: "1.6" }], // 15 px — texte secondaire
        base: ["1.0625rem", { lineHeight: "1.65" }], // 17 px — lecture courante
        lg: ["1.1875rem", { lineHeight: "1.5", letterSpacing: "-0.01em" }],
        xl: ["1.375rem", { lineHeight: "1.35", letterSpacing: "-0.015em" }],
        "2xl": ["1.75rem", { lineHeight: "1.25", letterSpacing: "-0.02em" }],
        "3xl": ["2.125rem", { lineHeight: "1.2", letterSpacing: "-0.025em" }],
      },
      fontFamily: {
        /**
         * Aucune police distante : elle couterait une requete bloquante, un
         * tiers qui voit passer chaque visite, et un rendu casse hors ligne
         * pour une application installee sur l'ecran d'accueil. Sur iPhone,
         * `-apple-system` donne San Francisco, dessinee pour cet ecran — on
         * ne fera pas mieux en telechargeant.
         */
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI Variable Text",
          "Segoe UI",
          "Inter",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        /** Elevation douce : une ombre portee large et tres diffuse, plus un
         *  liseré d'un pixel. Plus proche d'une carte posee que d'un cadre. */
        carte:
          "0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -16px rgba(15,23,42,0.16)",
        carteSurvol:
          "0 1px 2px rgba(15,23,42,0.05), 0 16px 40px -18px rgba(15,23,42,0.22)",
        flottant:
          "0 -1px 2px rgba(15,23,42,0.03), 0 -12px 32px -20px rgba(15,23,42,0.18)",
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        /** Entree d'une page : une montee de quelques pixels, jamais un
         *  glissement lateral qui ferait croire a un retour en arriere. */
        entreePage: {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "none" },
        },
        ouvertureRepli: {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "none" },
        },
        monteeFeuille: {
          from: { transform: "translateY(100%)" },
          to: { transform: "none" },
        },
      },
      animation: {
        fadeIn: "fadeIn 120ms ease-out",
        entreePage: "entreePage 260ms cubic-bezier(0.22, 1, 0.36, 1)",
        ouvertureRepli: "ouvertureRepli 180ms ease-out",
        monteeFeuille: "monteeFeuille 260ms cubic-bezier(0.22, 1, 0.36, 1)",
      },
    },
  },
  plugins: [],
};
