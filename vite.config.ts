import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Horodatage de la compilation, injecte dans le bundle.
 *
 * Sert a repondre a une question qu'on ne pouvait pas trancher autrement :
 * « est-ce que je regarde la derniere version ? » Sans ce reperage, une page
 * gardee en cache par le navigateur est indistinguable d'une publication qui
 * n'aurait pas eu lieu.
 */
const DATE_BUILD = new Date().toISOString();

export default defineConfig({
  define: { __DATE_BUILD__: JSON.stringify(DATE_BUILD) },
  plugins: [react()],
  // Base configurable pour servir l'app depuis un sous-chemin
  // (ex. /functions/v1/app/ quand elle est hebergee par l'Edge Function `app`).
  base: process.env.VITE_BASE ?? "/",
});
