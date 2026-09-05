const CACHE_NAME = "nokta-transfer-pwa-v5";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/en/",
  "/de/",
  "/ilceler.html",
  "/izmir-havalimani-transfer/",
  "/izmir-vip-transfer/",
  "/izmir-sehir-ici-transfer/",
  "/styles.css",
  "/script.js",
  "/site.webmanifest",
  "/llms.txt",
  "/assets/nokta-transfer-logo.jpeg",
  "/assets/pwa-icon-192.png",
  "/assets/pwa-icon-512.png",
  "/assets/pwa-maskable-512.png",
  "/assets/izmir-saat-kulesi-hero.webp",
  "/assets/taxi-menu-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || (request.mode === "navigate" ? caches.match("/index.html") : undefined)))
  );
});
