self.addEventListener('install', (e) => {
  e.waitUntil(caches.open('mojiradio-v1').then(cache => cache.addAll([
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
  ])));
});
self.addEventListener('activate', () => self.clients.claim());
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === location.origin) {
    event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)));
  } else {
    event.respondWith(fetch(event.request));
  }
});
