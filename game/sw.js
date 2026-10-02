/* Boffi Man offline cache: the game is one file, so the whole app fits in one cache entry.
   Network first (so updates arrive), cache as the fallback when there is no connection. */
const CACHE = 'boffiman-v52';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && new URL(e.request.url).origin === location.origin) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html'))));
});
