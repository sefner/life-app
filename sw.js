/* sw.js — minimal offline shell.
 * Cache-first for app files so the PWA opens instantly and works with no signal.
 * Bump CACHE when you ship changes so clients pick them up.
 */
const CACHE = 'life-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './core/store.js',
  './core/app.js',
  './core/styles.css',
  './modules/training.js',
  './modules/supplements.js',
  './icons/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((hit) =>
      hit || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
        return res;
      }).catch(() => hit)
    )
  );
});
