const CACHE = 'mediapp-v1';
const ASSETS = [
  './triage-ia.html',
  './mediapp.html',
  './triage-manifest.json',
  './medi-manifest.json',
  './triage-icon-192.png',
  './triage-icon-512.png',
  './medi-icon-192.png',
  './medi-icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
