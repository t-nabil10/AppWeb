/* Service worker : fichiers de l'app = réseau d'abord (mises à jour immédiates), bibliothèques CDN = cache d'abord */
const CACHE = 'heures-ecole-v4';
const LOCAL = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(LOCAL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.hostname === 'api.github.com') return;
  const store = res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {}); return res; };
  if (u.origin === location.origin) {
    e.respondWith(fetch(e.request).then(store).catch(() => caches.match(e.request).then(h => h || caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(e.request).then(h => h || fetch(e.request).then(store)));
  }
});
