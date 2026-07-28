import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Base configurable pour servir l'app depuis un sous-chemin
  // (ex. /functions/v1/app/ quand elle est hebergee par l'Edge Function `app`).
  base: process.env.VITE_BASE ?? "/",
});
