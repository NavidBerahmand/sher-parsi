// Home page: an endless wall of carved poet portraits.
// Drag (or scroll) in any direction; tap a portrait to open the poet's page.
import { getPoet, getCat, getManifest, NAMES, NICK, TOP, portrait } from './data.js';
import { ms } from './icons.js';

// Every poet has a portrait. The reader picks which of them show on the wall (ticks in the all-poets list).
// Names under the portraits match ganjoor.net's home page exactly (Navid 2026-11-18); NAMES stays as is elsewhere.
const GANJOOR_NAME = { saadi: 'سعدی', hafez: 'حافظ', attar: 'عطار', saeb: 'صائب', sanaee: 'سنایی', nezami: 'نظامی', khaghani: 'خاقانی', roodaki: 'رودکی', anvari: 'انوری', naserkhosro: 'ناصرخسرو', manoochehri: 'منوچهری' };
const ALL = TOP.map((slug) => ({ slug, full: GANJOOR_NAME[slug] || NAMES[slug] }));
// Any other poet can be ticked too (Navid 2026-11-19): it shows the faceless bust, with Ganjoor's name once the manifest is in.
const entry = (slug) => ALL.find((p) => p.slug === slug) || { slug, get full() { return NICK.get(slug) || ''; } };
const WALL_KEY = 'sp.wall';
// A first visit (nothing chosen yet) shows only these seven on the wall.
const FIRST = ['moulavi', 'saadi', 'hafez', 'khayyam', 'ferdousi', 'attar', 'saeb'];
// «ادامه خواندن»: back to the poem (and couplet) the reader was last on. Hidden until something has been read.
function resumeLink() {
  let r = null;
  try { r = JSON.parse(localStorage.getItem('sp.resume')); } catch { /* storage blocked */ }
  if (!r || !r.url) return '';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  return `<a class="w-all w-resume" href="#/p/${esc(r.url)}" data-url="${esc(r.url)}" data-line="${esc(r.line || '')}">ادامه خواندن</a>`;
}
const chosen = () => {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(WALL_KEY)); } catch { /* storage blocked */ }
  // Named poets keep readership order; the others follow in the order they were ticked.
  const list = Array.isArray(v) ? [...ALL.filter((p) => v.includes(p.slug)), ...v.filter((s) => typeof s === 'string' && s && !TOP.includes(s)).map(entry)] : [];
  return list.length ? list : ALL.filter((p) => FIRST.includes(p.slug)); // first visit: Navid's seven (2026-11-19)
};
let POETS = chosen();
// The poets page (#/poets) holds the ticks that choose the wall; these let it read and change the choice.
export const wallChoice = () => chosen().map((p) => p.slug);
export function setWallChoice(slugs) {
  const keep = new Set(slugs);
  const list = [...ALL.filter((q) => keep.has(q.slug)).map((q) => q.slug), ...slugs.filter((x) => !TOP.includes(x))];
  try { localStorage.setItem(WALL_KEY, JSON.stringify(list.length ? list : [ALL[0].slug])); } catch { /* ignore */ }
}
const isDark = () => document.documentElement.dataset.theme === 'dark';
const img = (p) => portrait(p.slug, isDark());
// Swap portraits live when the reader toggles dark mode.
new MutationObserver(() => {
  document.querySelectorAll('.w-tile img, #wFocus img').forEach((i) => {
    const src = i.getAttribute('src');
    if (src) i.setAttribute('src', src.replace(/(-dark)?\.webp$/, isDark() ? '-dark.webp' : '.webp'));
  });
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
// The light pool is drawn once into an image with fine noise mixed in (dithering),
// so its very faint falloff has no visible rings, then it only slides around.
function sunImage(r, peak = 0.055) {
  const d = r * 2, c = document.createElement('canvas');
  c.width = c.height = d;
  const ctx = c.getContext('2d'), img = ctx.createImageData(d, d), px = img.data;
  const MAX = peak * 255;
  for (let y = 0; y < d; y++) {
    for (let x = 0; x < d; x++) {
      const t = Math.hypot(x - r + 0.5, y - r + 0.5) / r;
      if (t >= 1) continue;
      const f = (1 - t * t) ** 2.2; // smooth, soft edge
      const a = Math.round(MAX * f + Math.random() - 0.5);
      if (a <= 0) continue;
      const i = (y * d + x) * 4;
      px[i] = px[i + 1] = px[i + 2] = 255; px[i + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let root = null;
let centre = null;
const info = new Map(); // slug -> { poet, cat }
let cleanup = [];

export function mountWall() {
  if (root) return;
  POETS = chosen();
  // Names of ticked poets outside the named 44 come from the manifest; fill them in when it arrives.
  if (POETS.some((p) => !p.full)) getManifest().then(() => document.querySelectorAll('.w-tile').forEach((el) => {
    const p = POETS[+el.dataset.pi]; if (!p) return;
    el.setAttribute('aria-label', p.full); el.querySelector('.w-name').textContent = p.full;
  })).catch(() => {});
  document.body.classList.add('wall-mode');

  root = document.createElement('div');
  root.className = 'wall-root';
  root.innerHTML = `
    <header class="w-header">
      <button class="w-menu menu-trigger" aria-label="منو" aria-haspopup="true"><span class="dots" aria-hidden="true"><i></i><i></i><i></i></span></button>
    </header>
    <div class="wall" id="wall" role="region" aria-label="دیوار سخنوران"></div>
    <div class="w-bar"><a class="w-all" href="#/poets">همه سخنوران</a><a class="w-search w-lib" href="#/saved" aria-label="کتابخانهٔ من">${ms('library')}</a><button type="button" class="w-search" aria-label="جست‌وجو در اشعار">${ms('search')}</button>${resumeLink()}</div>
    <div class="w-grain" aria-hidden="true"></div>`;
  document.body.appendChild(root);

  const wall = root.querySelector('#wall');
  const grain = root.querySelector('.w-grain');
  const mobile = innerWidth < 768;
  // About four portraits across a desktop, however wide; larger tiles on big screens.
  const TILE = mobile ? 220 : Math.round(Math.max(360, Math.min(innerWidth / 3.6, innerHeight / 2.4)));
  const SEAM = 0; // no line between portraits (Navid, 2026-11-12)
  // The opening card is exactly one portrait tile, sitting on the centre one.
  document.documentElement.style.setProperty('--w-tile', TILE - SEAM + 'px');
  // Tile hover glow, drawn the same banding-free way.
  root.style.setProperty('--w-tglow', `url(${sunImage(Math.round((TILE - SEAM) / 2), 0.085)})`);
  // Start with a portrait centred, offset half a tile so the grid feels like a wall, not a table.
  // A different poet in the centre each time the site opens (column c of row 0 holds poet c).
  // Coming back to the wall during the same visit keeps the same one.
  if (centre == null) {
    let last = -1;
    try { last = +(localStorage.getItem('sp.centre') ?? -1); } catch { /* storage blocked */ }
    centre = Math.floor(Math.random() * (POETS.length - 1));
    if (centre >= last && last >= 0) centre++;
    try { localStorage.setItem('sp.centre', centre); } catch { /* ignore */ }
  }
  let offX = Math.round(innerWidth / 2 - TILE * (centre + 0.5));
  let offY = Math.round(innerHeight / 2 - TILE * 0.5);
  const pool = new Map();
  // Poets run in order along the rows, W to a row, so any W × floor(n/W) patch of the wall shows each poet
  // at most once: everyone appears side by side before anyone repeats.
  const poetAt = (r, c) => { const n = POETS.length, W = Math.max(1, Math.round(Math.sqrt(n))); return ((r * W + c) % n + n) % n; };

  function render() {
    const vw = innerWidth, vh = innerHeight;
    grain.style.backgroundPosition = `${offX}px ${offY}px`;
    // One poet chosen: just that portrait, still, in the middle of the screen.
    const solo = POETS.length === 1;
    root.classList.toggle('solo', solo);
    if (solo) { offX = Math.round(vw / 2 - TILE / 2); offY = Math.round(vh / 2 - TILE / 2); }
    const c0 = solo ? 0 : Math.floor(-offX / TILE) - 1, r0 = solo ? 0 : Math.floor(-offY / TILE) - 1;
    const c1 = solo ? 0 : Math.ceil((vw - offX) / TILE) + 1, r1 = solo ? 0 : Math.ceil((vh - offY) / TILE) + 1;
    const needed = new Set();
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        const key = r + ',' + c;
        needed.add(key);
        let el = pool.get(key);
        if (!el) {
          const pi = poetAt(r, c), p = POETS[pi];
          el = document.createElement('div');
          el.className = 'w-tile';
          el.style.width = el.style.height = TILE - SEAM + 'px';
          el.dataset.pi = pi;
          el.setAttribute('role', 'button');
          el.setAttribute('aria-label', p.full);
          setFirst(el, !firstOf.has(pi));
          el.innerHTML = `<div class="w-tglow"></div><img src="${img(p)}" alt="" draggable="false" loading="lazy" onload="this.classList.add('loaded')"><div class="w-name">${esc(p.full)}</div>`;
          wall.appendChild(el);
          pool.set(key, el);
        }
        el.style.transform = `translate(${c * TILE + offX}px, ${r * TILE + offY}px)`;
        {
          // Every portrait shows its name at 30%; near the centre of the screen it rises to full (Navid 2026-11-18).
          const dx = c * TILE + offX + TILE / 2 - vw / 2, dy = r * TILE + offY + TILE / 2 - vh / 2;
          const k = Math.max(0, 1 - Math.hypot(dx, dy) / (TILE * 0.9));
          if (POETS.length === 1) { el.lastElementChild.style.opacity = '1'; continue; }
          el.lastElementChild.style.opacity = (0.3 + 0.7 * k * k * (3 - 2 * k)).toFixed(3);
        }
      }
    }
    for (const [key, el] of pool) {
      if (needed.has(key)) continue;
      el.remove(); pool.delete(key);
      // The copy the keyboard could reach went off screen: hand that over to another copy of the same poet.
      if (firstOf.get(+el.dataset.pi) === el) {
        firstOf.delete(+el.dataset.pi);
        for (const other of pool.values()) if (other.dataset.pi === el.dataset.pi) { setFirst(other, true); break; }
      }
    }
  }
  // The wall repeats every poet many times: only one copy of each takes the Tab key and is read by a screen reader.
  const firstOf = new Map(); // poet index -> its reachable tile
  function setFirst(el, yes) {
    el.tabIndex = yes ? 0 : -1;
    if (yes) { el.removeAttribute('aria-hidden'); firstOf.set(+el.dataset.pi, el); } else el.setAttribute('aria-hidden', 'true');
  }
  render();

  const on = (t, ev, fn, o) => { t.addEventListener(ev, fn, o); cleanup.push(() => t.removeEventListener(ev, fn, o)); };
  on(window, 'resize', render);

  // Drag to pan; a press that barely moves is a tap.
  let dragging = false, sx = 0, sy = 0, moved = 0;
  on(wall, 'pointerdown', (e) => {
    dragging = true; moved = 0; sx = e.clientX; sy = e.clientY;
    wall.classList.add('dragging');
    wall.setPointerCapture(e.pointerId);
  });
  on(wall, 'pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    moved += Math.abs(dx) + Math.abs(dy);
    sx = e.clientX; sy = e.clientY;
    if (POETS.length === 1) return;
    offX += dx; offY += dy;
    render();
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    wall.classList.remove('dragging');
    if (e.type === 'pointerup' && moved < 6) {
      const tile = document.elementFromPoint(e.clientX, e.clientY)?.closest('.w-tile');
      if (tile) openPoet(+tile.dataset.pi);
    }
  };
  on(wall, 'pointerup', end);
  on(wall, 'pointercancel', end);
  on(wall, 'keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tile = e.target.closest('.w-tile');
    if (!tile) return;
    e.preventDefault();
    openPoet(+tile.dataset.pi);
  });
  on(window, 'wheel', (e) => {
    if (POETS.length === 1) return;
    offX -= e.deltaX; offY -= e.deltaY;
    render();
  }, { passive: true });

  // Sunlight: a soft warm pool of light drifting after the mouse.
  if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
    const sun = document.createElement('div');
    sun.className = 'w-sun';
    const R = TILE * 0.95;
    sun.style.width = sun.style.height = R * 2 + 'px';
    sun.style.margin = `-${R}px 0 0 -${R}px`;
    sun.style.backgroundImage = `url(${sunImage(Math.round(R))})`;
    root.appendChild(sun);
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, lit = 0, target = 0, loop = false, raf = 0;
    const step = () => {
      x += (tx - x) * 0.1; y += (ty - y) * 0.1; lit += (target - lit) * 0.07;
      sun.style.transform = `translate(${x}px, ${y}px)`;
      sun.style.opacity = lit;
      if (Math.abs(tx - x) + Math.abs(ty - y) > 0.3 || Math.abs(target - lit) > 0.005) raf = requestAnimationFrame(step); else loop = false;
    };
    on(wall, 'pointerenter', (e) => { x = tx = e.clientX; y = ty = e.clientY; });
    on(wall, 'pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = e.clientX; ty = e.clientY; target = 1;
      if (!loop) { loop = true; raf = requestAnimationFrame(step); }
    });
    on(wall, 'pointerleave', () => { target = 0; if (!loop) { loop = true; raf = requestAnimationFrame(step); } });
    cleanup.push(() => cancelAnimationFrame(raf));
  }

  // Slow drift at 30° once the opening card has gone. When the reader drags or scrolls the
  // wall it stops for 30 seconds, then eases back in; it also rests while a poet is open.
  {
    const SPEED = 9; // px per second
    const still = matchMedia('(prefers-reduced-motion: reduce)'); // the device asks for less motion: no drift
    const vx = Math.cos(Math.PI / 6) * SPEED, vy = -Math.sin(Math.PI / 6) * SPEED;
    let last = 0, calmSince = 0, raf = 0;
    const rest = (ms) => { calmSince = Math.max(calmSince, performance.now() + ms); };
    const touch = () => rest(30000);
    on(wall, 'pointerdown', touch);
    on(wall, 'pointermove', () => { if (dragging) touch(); });
    on(window, 'wheel', touch, { passive: true });
    const tick = (t) => {
      raf = requestAnimationFrame(tick);
      const dt = last ? Math.min(t - last, 100) / 1000 : 0; last = t;
      if (document.getElementById('splash')) { calmSince = t; return; }
      if (dragging) { touch(); return; }
      if (document.hidden) { rest(1200); return; }
      if (POETS.length === 1 || still.matches) return;
      const e = Math.min(1, Math.max(0, (t - calmSince) / 4000)); // ease back in over 4s
      const k = e * e * (3 - 2 * e);
      if (!k) return;
      offX += vx * dt * k; offY += vy * dt * k;
      render();
    };
    raf = requestAnimationFrame(tick);
    cleanup.push(() => cancelAnimationFrame(raf));
  }

  // Each poet's story and works, fetched quietly as soon as the wall shows,
  // so a poet's page opens at once (and offline) when its portrait is tapped.
  const loadInfo = (slug) => Promise.all([getPoet(slug), getCat(slug)]).then(([poet, cat]) => { const d = { poet, cat }; info.set(slug, d); return d; });
  // Fetched once the wall has painted and the browser is idle, so it never slows the first view.
  const prefetch = () => POETS.slice(0, 24).forEach((q) => { if (!info.has(q.slug)) loadInfo(q.slug).catch(() => {}); });
  { const t = setTimeout(() => (window.requestIdleCallback ? requestIdleCallback(prefetch, { timeout: 3000 }) : prefetch()), 1200); cleanup.push(() => clearTimeout(t)); }

  // A tap on a portrait opens the poet's own page (the half card is gone, Navid 2026-11-18).
  function openPoet(pi) { location.hash = `#/c/${POETS[pi].slug}`; }
}

export function unmountWall() {
  if (!root) return;
  cleanup.forEach((f) => f()); cleanup = [];
  root.remove(); root = null;
  document.body.classList.remove('wall-mode');
}
