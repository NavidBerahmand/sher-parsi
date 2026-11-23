// Page addresses (Navid 2026-11-23): real paths that search engines can index, sorayesh.com/hafez/ghazal/sh1,
// in place of the old sorayesh.com/#/p/hafez/ghazal/sh1. Inside the app every page is still named by its old
// route string: '#/p/…' a poem, '#/c/…' a book or a poet, '#/poets', '#/saved', '#/search', '#/fal', '#/' home.
// The address bar shows the path. A path alone can't always tell a poem from a book (108 poems don't end in
// «shN»), so every history entry also keeps its route in history.state.r, and every link the app draws is
// remembered with its route.

// '/' on sorayesh.com ('/sher-parsi/' on the old GitHub Pages copy): <base> in index.html.
export const BASE = new URL(document.baseURI).pathname.replace(/[^/]*$/, '');
export const SITE = 'https://sorayesh.com/';
const PAGES = new Set(['poets', 'saved', 'search', 'fal']);
const known = new Map(); // address path → route, for every link drawn
const trim = (s) => String(s || '').replace(/^\/+|\/+$/g, '');

export const isRoute = (s) => typeof s === 'string' && s.startsWith('#/');

// A route's address path, e.g. '#/p/hafez/ghazal/sh1' → '/hafez/ghazal/sh1'. Anything else comes back as it was.
export function toHref(r) {
  if (!isRoute(r)) return r;
  const m = /^#\/([pc])\/(.*)$/.exec(r);
  const p = BASE + encodeURI(trim(m ? m[2] : r.slice(2)));
  if (m) known.set(p, r);
  return p;
}

// The route of an address path (or of a link's href).
export function fromHref(h) {
  if (isRoute(h)) return h;
  let p;
  try { p = new URL(h, document.baseURI).pathname; } catch { return '#/'; }
  if (known.has(p)) return known.get(p);
  if (!p.startsWith(BASE)) return '#/';
  let t;
  try { t = trim(decodeURIComponent(p.slice(BASE.length))); } catch { return '#/'; } // a broken % code: home
  if (!t || t === 'index.html') return '#/';
  if (PAGES.has(t)) return `#/${t}`;
  const seg = t.split('/'), last = seg[seg.length - 1];
  if (seg.length === 1 || last === '~other') return `#/c/${t}`;
  // A best guess: every book ends in a name, almost every poem in «shN». The app checks the data when it must (resolveHere).
  return (/^sh\d+$/.test(last) ? '#/p/' : '#/c/') + t;
}

// The route of the page in the address bar.
export function here() {
  const r = window.history.state?.r;
  if (isRoute(r) && toHref(r) === location.pathname) return r;
  return fromHref(location.pathname);
}

// The page's canonical address follows the address bar (the server writes the same one into each page it sends).
function syncCanon() {
  const p = location.pathname.startsWith(BASE) ? location.pathname.slice(BASE.length) : '';
  const c = SITE + p.replace(/^\/+/, '');
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', c);
  document.querySelector('meta[property="og:url"]')?.setAttribute('content', c);
}

// pushState / replaceState take a route (or a path) as the address, and stamp the route on the entry.
// With no address the entry keeps the route of the page it is on (the overlays' own history steps).
let lastPath = location.pathname;
for (const name of ['pushState', 'replaceState']) {
  const real = window.history[name].bind(window.history);
  window.history[name] = function (state, title, url) {
    const obj = state && typeof state === 'object' ? state : {};
    if (url === undefined || url === null || url === '') {
      real({ ...obj, r: isRoute(obj.r) ? obj.r : here() }, title);
    } else {
      const r = isRoute(url) ? url : fromHref(url);
      real({ ...obj, r }, title, toHref(r));
    }
    lastPath = location.pathname;
    syncCanon();
  };
}

// What the app does when the page in the address bar changes (once called on 'hashchange').
let onNav = () => {};
export function onNavigate(fn) { onNav = fn; }
// Like the old «location.hash = route» (or location.replace): a new page in the history, then the app follows.
export function go(r, replace = false) {
  r = fromHref(r);
  if (r === here()) return;
  window.history[replace ? 'replaceState' : 'pushState'](null, '', r);
  setTimeout(() => onNav(), 0);
}
// Back and forward: when the address changed, the app follows a moment later, as 'hashchange' did,
// after every popstate listener (the overlays' in overlay.js) has had its say.
window.addEventListener('popstate', () => {
  syncCanon();
  if (location.pathname === lastPath) return;
  lastPath = location.pathname;
  setTimeout(() => onNav(), 0);
});
// An old address typed or pasted while the site is open (sorayesh.com/#/p/…): take it to its path.
window.addEventListener('hashchange', () => {
  if (!/^#\//.test(location.hash)) return;
  window.history.replaceState(null, '', fromOldHash());
  onNav();
});
function fromOldHash() {
  let h;
  try { h = decodeURIComponent(location.hash); } catch { return '#/'; }
  return h.replace(/\/+$/, '') || '#/';
}

// On opening the site: an old #/ address becomes its path, and an entry with no route yet gets one.
// isPoem(path) answers from the data whether a path the guess can't settle is a poem.
export async function resolveHere(isPoem) {
  if (/^#\//.test(location.hash)) window.history.replaceState(window.history.state, '', fromOldHash());
  const st = window.history.state;
  if (isRoute(st?.r) && toHref(st.r) === location.pathname) { syncCanon(); return; }
  let r = fromHref(location.pathname);
  const m = /^#\/c\/(.+\/.+)$/.exec(r);
  if (m && !m[1].endsWith('/~other')) { try { if (await isPoem(m[1])) r = `#/p/${m[1]}`; } catch { /* offline: keep the guess */ } }
  window.history.replaceState(window.history.state, '', r);
}

// A whole address to share: always sorayesh.com, wherever the app runs.
export const shareURL = (r) => SITE + toHref(r).slice(BASE.length);
