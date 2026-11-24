/* Service worker : fichiers de l'app = réseau d'abord (mises à jour immédiates, repli sur le cache si le réseau est lent ou absent),
   bibliothèques CDN = cache d'abord */
const CACHE = 'heures-ecole-v5';
const LOCAL = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icon-192.png', './icon-512.png'];
const TIMEOUT = 4000; // ms avant de se rabattre sur le cache si le réseau est trop lent

self.addEventListener('install', e => {
  // Un fichier manquant ne doit pas empêcher l'installation : on met en cache chaque fichier séparément
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(LOCAL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE).map(n => caches.delete(n)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, u = new URL(req.url);
  if (req.method !== 'GET' || u.hostname === 'api.github.com') return;
  // On ne garde que les réponses valides (jamais une erreur 404/500)
  const store = res => {
    if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {}); }
    return res;
  };
  if (u.origin === location.origin) {
    e.respondWith(caches.match(req).then(hit => {
      const net = fetch(req).then(store);
      if (!hit) return net.catch(() => req.mode === 'navigate' ? caches.match('./index.html') : Response.error());
      return Promise.race([net, new Promise(r => setTimeout(() => r(hit), TIMEOUT))]).catch(() => hit);
    }));
  } else {
    e.respondWith(caches.match(req).then(h => h || fetch(req).then(store)));
  }
});
