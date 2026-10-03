const CACHE = "santa-vibes-v1";
const PRECACHE = ["/manifest.json", "/icon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  // Cache-first for static assets (images, fonts, manifest, icons)
  if (
    request.destination === "image" ||
    request.destination === "font" ||
    request.url.endsWith("manifest.json") ||
    request.url.endsWith("icon.svg")
  ) {
    event.respondWith(
      caches
        .match(request)
        .then((cached) => cached ?? fetch(request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone));
          return res;
        }))
    );
  }
  // Everything else: network-first (let Next.js handle it)
});

self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Santa Vibes", {
      body: data.body ?? "You have a new message!",
      icon: "/icon.svg",
      badge: "/icon.svg",
      data: { url: data.url ?? "/messages" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/messages";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) return client.focus();
        }
        return clients.openWindow(url);
      })
  );
});
