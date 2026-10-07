const CACHE = 'media-suite-v51';
const ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './icon.svg',
  './favicon-32.png',
  './icon-maskable-192.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, {cache: 'reload'})))).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.matchAll({includeUncontrolled: true, type: 'window'}))
      .then(clients => {
        // Avisa a todas las ventanas/tabs que hay versión nueva → dispara controllerchange → recarga
        clients.forEach(client => client.postMessage({type: 'SW_UPDATED', cache: CACHE}));
      })
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Network first para index.html y módulos JS de /src/ — siempre trae la versión más nueva
  if (e.request.url.includes('index.html') || e.request.url.endsWith('/') || e.request.url.includes('/src/')) {
    e.respondWith(
      // cache:'no-cache' = siempre pregunta al servidor (si no cambió, responde rápido con 304)
      fetch(e.request, {cache: 'no-cache'}).then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // Cache first para el resto (iconos, manifest, fuentes)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});

// Tocar la notificación de "paciente rojo vencido" abre la app en la cola
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(cs => {
    if (cs.length) { cs[0].focus(); cs[0].postMessage({type: 'OPEN_COLA'}); }
    else self.clients.openWindow('./index.html');
  }));
});
