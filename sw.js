const CACHE = 'ascii-v4';
const FILES = [
  './', 'index.html',
  'client-web/main.js', 'client-web/canvas-renderer.js', 'client-web/save-file.js',
  'client-core/screen.js', 'client-core/game.js', 'client-core/online.js',
  'client-core/controls.js', 'client-core/iso-view.js', 'client-core/palette.js',
  'client-core/menu.js', 'client-core/save.js',
  'shared/terrain.js', 'shared/chunk.js', 'shared/pool.js',
  'shared/objects.js', 'shared/hash.js', 'shared/ai.js', 'shared/mob.js', 'shared/constants.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }))
  );
});
