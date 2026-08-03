import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Enregistrement systematique : ne demande aucune permission et ne fait rien
// tant que l'utilisateur n'a pas active les notifications dans Compte. Le
// faire tot permet de detecter un abonnement deja actif des le chargement.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
    // Echec silencieux : certains navigateurs (ou le mode prive) refusent les
    // service workers, ce qui ne doit pas empecher le reste de l'app.
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
