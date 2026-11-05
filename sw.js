// Static, scoped, offline-ready application shell. Relative paths work under
// both https://USER.github.io/ and https://USER.github.io/REPO/.
const CACHE_PREFIX = `fenji-pwa-${new URL(self.registration.scope).pathname.replace(/[^a-z0-9]/gi, '_')}-`;
const CACHE = `${CACHE_PREFIX}v6.3.1-ios3-idb-flat`;
const SHELL_FILES = [
  './', './index.html', './styles.css', './app.js',
  './manifest.webmanifest', './logo.svg',
  './apple-touch-icon.png', './icon-192.png',
  './icon-512.png', './icon-maskable-512.png'
];
const SHELL_URLS = new Set(SHELL_FILES.map(path => new URL(path, self.registration.scope).href));
const FALLBACK_URL = new URL('./index.html', self.registration.scope).href;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;

  if (request.mode === 'navigate') {
    // Prefer up-to-date pages when connected; serve the cached shell offline.
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    }).catch(async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(request)) || (await cache.match(FALLBACK_URL)) || Response.error();
    }));
    return;
  }

  // Only cache public app assets, not user files or external requests.
  // Network-first prevents stale app.js/styles.css after normal GitHub updates.
  if (SHELL_URLS.has(url.href)) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        event.waitUntil(caches.open(CACHE).then(cache => cache.put(request, copy)));
      }
      return response;
    }).catch(async () => (await caches.match(request)) || Response.error()));
  }
});
