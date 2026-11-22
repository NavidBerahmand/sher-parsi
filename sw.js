// Service worker: app shell is precached; poem data (immutable, pinned commit) is cached on first read.
const SHELL = 'sp-shell-v138';
const DATA = 'sp-data-v1';
// Every portrait (light and dark) and the faceless bust: fetched quietly after install, so the wall, the poet pages
// and «کتابخانهٔ من» show their pictures offline too. A failed one never blocks the install.
const PORTRAITS = 'abdullah abusaeed anvari aref attar babataher bahaee bahar bidel blank eraghi eshghi farrokhi ferdousi feyz forooghi hafez hatef iqbal iraj jahan jami khaghani khajoo khayyam khosro manoochehri mohtasham moulavi naserkhosro nezami obeyd ouhadi parvin rahi roodaki saadi saeb sanaee seyf shabestari shahnematollah shahriar vahshi yazdi'.split(' ');
const ASSETS = [
  './', 'index.html', 'css/app.css', 'js/app.js', 'js/data.js', 'js/store.js', 'js/share.js', 'js/wall.js', 'js/icons.js', 'js/sheetdrag.js', 'js/search.js', 'js/overlay.js', 'js/covers/covergen.js', 'js/covers/emblems.js', 'js/covers/layouts.js',
  'img/poets/hafez.webp', 'img/poets/saadi.webp', 'img/poets/moulavi.webp', 'img/poets/khayyam.webp', 'img/poets/ferdousi.webp', 'img/poets/saeb.webp',
  'img/poets/hafez-dark.webp', 'img/poets/saadi-dark.webp', 'img/poets/moulavi-dark.webp', 'img/poets/khayyam-dark.webp', 'img/poets/ferdousi-dark.webp', 'img/poets/saeb-dark.webp',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/logo.svg', 'icons/logo-2.svg', 'icons/verses.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/kahroba-vf.woff2',
  ];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => ![SHELL, DATA].includes(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
  e.waitUntil(caches.open(SHELL).then((c) => Promise.allSettled(PORTRAITS.flatMap((p) => [`img/poets/${p}.webp`, `img/poets/${p}-dark.webp`])
    .map(async (u) => { if (!(await c.match(u))) await c.add(u); }))));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Poetry data: cache-first, it never changes for a pinned commit.
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(caches.open(DATA).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // Bundled poetry files: cache-first from the data cache, which "download poet" fills
  // and which survives app updates.
  // The search index is rebuilt with the data, so it is never kept in the long-lived cache.
  if (url.pathname.includes('/data/s/')) return;
  // The poet list and the random-poem pool change with the data, so they are fetched fresh (cached copy only when offline).
  if (url.pathname.endsWith('/data/manifest.json') || url.pathname.endsWith('/data/random.json')) {
    e.respondWith(caches.open(DATA).then(async (c) => {
      try { const res = await fetch(req, { cache: 'no-cache' }); if (res.ok) c.put(req, res.clone()); return res; }
      catch { return (await c.match(req, { ignoreSearch: true })) || Response.error(); }
    }));
    return;
  }
  if (url.pathname.includes('/data/')) {
    e.respondWith(caches.open(DATA).then(async (c) => {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }

  // App shell: network first so every update shows on the next open; the cache is the offline fallback.
  e.respondWith(shell(e, req));
});

// Network first, but never wait long for it: on a weak connection (or the "lie-fi" of a dead Wi-Fi) the saved copy
// answers after SLOW ms, while the fresh one keeps loading in the background and is there on the next open.
const SLOW = 3000;
let slowUntil = 0; // after one slow answer, the whole page comes from the saved copy, so its files stay one version
async function shell(e, req) {
  const c = await caches.open(SHELL);
  const hit = (await c.match(req, { ignoreSearch: true })) || (req.mode === 'navigate' ? await c.match('index.html') : undefined);
  const net = fetch(req, { cache: 'no-cache' }).then(async (res) => { if (res.ok) await c.put(req, res.clone()); return res; });
  if (!hit) return net;
  const fresh = net.catch(() => null);
  e.waitUntil(fresh);
  if (Date.now() < slowUntil) return hit;
  let timer;
  const res = await Promise.race([fresh, new Promise((r) => { timer = setTimeout(() => r(null), SLOW); })]);
  clearTimeout(timer);
  if (res) return res;
  if (navigator.onLine !== false) slowUntil = Date.now() + 15000;
  return hit;
}
