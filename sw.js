/* Motor Manager Pro — service worker.
   Fichiers de l'app : réseau d'abord, mais jamais plus de TIMEOUT ms si une copie est en cache (réseau lent ou sans signal = on ouvre
   la copie locale). Bibliothèques CDN, feuilles de style et POLICES (icônes, Plus Jakarta Sans) : copiées à l'installation, puis
   servies depuis le cache. L'application peut demander de recompléter le cache (message « precache »).
   Ne touche qu'à ses propres caches (préfixe « mmp- »), pour ne jamais effacer ceux d'une autre application hébergée sur la même adresse. */
const PREFIX = 'mmp-', CACHE = 'mmp-v15', TIMEOUT = 4000;
const LOCAL = ['./', './index.html', './styles.css', './app.js', './manifest.json', './icon-192.png', './icon-512.png', './icon-maskable-192.png', './icon-maskable-512.png', './apple-touch-icon.png'];
const CSS = ['https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css', 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&display=swap'];
const JS = ['https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'];

const own = (req, opt) => caches.open(CACHE).then(c => c.match(req, Object.assign({ ignoreVary: true }, opt)));
const offline = () => new Response('Hors ligne', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
/* polices (.woff2) référencées par une feuille de style, en URL absolue */
const fontUrls = (css, base) => [...css.matchAll(/url\(\s*['"]?([^'")\s]+\.woff2[^'")\s]*)['"]?\s*\)/g)].map(m => new URL(m[1], base).href).slice(0, 24);

/* copie une ressource externe (en mode CORS : réponse lisible, pas « opaque ») ; renvoie la réponse, ou null en cas d'échec */
async function getCors(c, u) {
  const hit = await c.match(u, { ignoreVary: true });
  if (hit) return hit;
  try {
    const r = await fetch(u, { mode: 'cors', credentials: 'omit' });
    if (r && r.ok) { await c.put(u, r.clone()); return r; }
  } catch (_) {}
  return null;
}
/* télécharge ce qui manque : fichiers de l'app (en ignorant le cache HTTP du navigateur), bibliothèques, feuilles de style et leurs polices */
async function ensure(c) {
  await Promise.all(LOCAL.map(async u => {
    if (await c.match(u, { ignoreVary: true })) return;
    try { await c.add(new Request(u, { cache: 'reload' })); } catch (_) {}
  }));
  await Promise.all(JS.map(u => getCors(c, u)));
  for (const u of CSS) {
    const r = await getCors(c, u);
    if (!r) continue;
    let css = '';
    try { css = await r.clone().text(); } catch (_) {}
    await Promise.all(fontUrls(css, u).map(f => getCors(c, f)));
  }
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    await ensure(await caches.open(CACHE));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith(PREFIX) && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => {
  if (e.data === 'precache') e.waitUntil(caches.open(CACHE).then(ensure).catch(() => {}));
});

/* on ne met jamais en cache une réponse redirigée ou en erreur : elle empêcherait l'ouverture de l'app */
const keep = r => res => {
  if (res && (res.ok || res.type === 'opaque') && !res.redirected) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)).catch(() => {}); }
  return res;
};
const fallback = async r => (await own(r, { ignoreSearch: true })) || (r.mode === 'navigate' ? await own('./index.html') : undefined);

async function netFirst(r) {
  /* pas de cache HTTP du navigateur pour les fichiers de l'app (sauf navigation : on ne reconstruit pas la requête) */
  const req = r.mode === 'navigate' ? r : new Request(r, { cache: 'no-cache' });
  const net = fetch(req).then(keep(r));
  net.catch(() => {});                                   /* évite une erreur non gérée si on a déjà répondu depuis le cache */
  let timer;
  const slow = new Promise(res => { timer = setTimeout(() => res(null), TIMEOUT); });
  try {
    const hit = await Promise.race([net, slow]);
    clearTimeout(timer);
    if (hit && hit.status < 500) return hit;
    return (await fallback(r)) || hit || net.catch(offline); /* trop lent ou erreur serveur : copie locale si elle existe */
  } catch (_) {
    clearTimeout(timer);
    return (await fallback(r)) || offline();             /* pas de réseau */
  }
}

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.hostname === 'api.github.com') return;
  if (u.origin === location.origin) e.respondWith(netFirst(r));
  else e.respondWith(own(r).then(h => h || fetch(r).then(keep(r)).catch(() => offline())));
});
