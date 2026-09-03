// Service worker : notifications push, et fraicheur de la page.
//
// Ce fichier ne mettait rien en cache, par choix. Le probleme est que
// l'absence de cache PROPRE ne supprime pas le cache : elle laisse celui du
// navigateur, sur lequel on n'a aucune prise. GitHub Pages sert `index.html`
// avec `max-age=600` et rien ne permet de changer cet en-tete ; ajoutee a
// l'ecran d'accueil d'un iPhone, l'application peut alors continuer d'afficher
// une version publiee depuis longtemps, sans aucun moyen de le savoir ni de
// forcer la mise a jour.
//
// D'ou cette strategie, limitee aux navigations : reseau d'abord, cache en
// secours. En ligne, on voit toujours la derniere version publiee. Hors ligne,
// on voit la derniere vue au lieu d'une page d'erreur. Les fichiers d'assets
// portent une empreinte dans leur nom et ne peuvent pas devenir perimes : ils
// ne sont pas touches ici.

const CACHE = "coquille-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Une version anterieure du service worker a pu laisser d'autres caches.
      const noms = await caches.keys();
      await Promise.all(noms.filter((n) => n !== CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Uniquement la page elle-meme : c'est la seule ressource dont la peremption
  // silencieuse fait afficher une application entierement obsolete.
  if (req.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const reponse = await fetch(req);
        // `cache: "reload"` n'est pas utilise : la requete telle qu'elle vient
        // du navigateur suffit, et la reponse fraiche remplace la precedente.
        const copie = reponse.clone();
        const c = await caches.open(CACHE);
        await c.put("page", copie);
        return reponse;
      } catch {
        const c = await caches.open(CACHE);
        const secours = await c.match("page");
        if (secours) return secours;
        throw new Error("hors ligne et aucune page en cache");
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let data = { title: "Veille investissement", body: "Nouvelle activité détectée.", url: "./" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch {
    // Message non-JSON : on garde le texte par defaut plutot que d'echouer.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const cible = new URL(event.notification.data?.url ?? "./", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === cible && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(cible);
    }),
  );
});
