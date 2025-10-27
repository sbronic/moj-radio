// --- Moj Radio PWA Service Worker ---
// Verzija: 2.0 (auto update + minimal cache)

const CACHE_NAME = "moj-radio-cache-v2";
const URLS_TO_CACHE = [
  "/", 
  "/index.html",
  "/style.css",
  "/script.js",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// --- Automatsko ažuriranje bez čekanja reload ---
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener("activate", (event) => {
  self.clients.claim();
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// --- Fetch handler: koristi cache, ali audio uvijek ide uživo ---
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Ne keširaj radio streamove i API pozive
  if (url.href.includes("/api/proxy") || url.pathname.endsWith(".m3u8") || url.protocol === "data:") {
    return; // prepusti mreži
  }

  // HTML stranice: network first, fallback na cache
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Ostalo (JS, CSS, ikone): cache first
  event.respondWith(
    caches.match(req).then((res) => res || fetch(req))
  );
});
