const CACHE_STATIC = 'media-static-v5';
const CACHE_CDN    = 'media-cdn-v5';

const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './triage-manifest.json',
  './medi-manifest.json',
  './triage-icon-192.png',
  './triage-icon-512.png',
  './medi-icon-192.png',
  './medi-icon-512.png',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
];

const CDN_PREFIXES = [
  'https://cdn.jsdelivr.net',
  'https://cdnjs.cloudflare.com',
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
  'https://unpkg.com',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(c => c.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_STATIC && k !== CACHE_CDN).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = e.request.url;

  // Firebase, Worker proxy, API, Overpass → network only, no cache
  if (url.includes('firestore.googleapis.com') ||
      url.includes('firebase') ||
      url.includes('workers.dev') ||
      url.includes('googleapis.com/identitytoolkit') ||
      url.includes('securetoken') ||
      url.includes('overpass-api.de') ||
      url.includes('overpass.kumi.systems') ||
      url.includes('mail.ru/osm')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // CDN resources → cache-first, fallback network
  if (CDN_PREFIXES.some(p => url.startsWith(p))) {
    e.respondWith(
      caches.open(CACHE_CDN).then(async cache => {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        try {
          const res = await fetch(e.request);
          if (res.ok) cache.put(e.request, res.clone());
          return res;
        } catch {
          return cached || new Response('', { status: 503 });
        }
      })
    );
    return;
  }

  // Static assets → stale-while-revalidate
  e.respondWith(
    caches.open(CACHE_STATIC).then(async cache => {
      const cached = await cache.match(e.request);
      const fetchPromise = fetch(e.request).then(res => {
        if (res.ok) cache.put(e.request, res.clone());
        return res;
      }).catch(() => null);
      return cached || fetchPromise || new Response('Sin conexion', { status: 503 });
    })
  );
});
