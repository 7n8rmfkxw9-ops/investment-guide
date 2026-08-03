// Service worker minimal : uniquement les notifications push et leur clic.
// Aucune mise en cache, aucun mode hors-ligne — ce n'est pas l'objet de cet
// outil, et un cache mal invalide serait plus genant qu'utile ici.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
