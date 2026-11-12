// Service worker: app shell is precached; poem data (immutable, pinned commit) is cached on first read.
const SHELL = 'sp-shell-v11';
const DATA = 'sp-data-v1';
const ASSETS = [
  './', 'index.html', 'css/app.css', 'js/app.js', 'js/data.js', 'js/store.js', 'js/share.js', 'js/wall.js', 'js/sheetdrag.js',
  'img/poets/hafez.webp', 'img/poets/saadi.webp', 'img/poets/moulavi.webp', 'img/poets/khayyam.webp', 'img/poets/ferdousi.webp', 'img/poets/saeb.webp',
  'img/poets/hafez-dark.webp', 'img/poets/saadi-dark.webp', 'img/poets/moulavi-dark.webp', 'img/poets/khayyam-dark.webp', 'img/poets/ferdousi-dark.webp', 'img/poets/saeb-dark.webp',
  'manifest.webmanifest', 'icons/icon.svg', 'icons/logo.svg', 'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/lateef-arabic-200-normal.woff2', 'fonts/lateef-arabic-300-normal.woff2', 'fonts/lateef-arabic-500-normal.woff2', 'fonts/lateef-latin-300-normal.woff2', 'fonts/lateef-latin-500-normal.woff2',
  ];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => ![SHELL, DATA].includes(k)).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
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

  // App shell: serve cached copy fast, refresh it in the background.
  e.respondWith(caches.open(SHELL).then(async (c) => {
    const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === 'navigate' ? await c.match('index.html') : null);
    const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});
