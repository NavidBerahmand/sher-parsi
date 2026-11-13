// Home page: an endless wall of carved poet portraits.
// Drag (or scroll) in any direction; tap a portrait to bring it forward with its story.
import { getPoet, getCat, getManifest, NAMES, TOP, savePoet, isPoetSaved, shelf, shelfHTML } from './data.js';
import { attachSheetDrag } from './sheetdrag.js';

// Hand-written era and a famous bayt for some poets; the rest take their years from the data.
const INFO = [
  { slug: 'hafez', era: '۷۲۶ – ۷۹۲ ق · شیراز', full: NAMES.hafez, name: 'حافظ', bayt: ['الا یا ایها الساقی ادر کأسا و ناولها', 'که عشق آسان نمود اول ولی افتاد مشکل‌ها'] },
  { slug: 'saadi', era: '۶۱۵ – ۶۹۴ ق · شیراز', full: NAMES.saadi, name: 'سعدی', bayt: ['بنی آدم اعضای یکدیگرند', 'که در آفرینش ز یک گوهرند'] },
  { slug: 'moulavi', era: '۶۰۴ – ۶۷۲ ق · بلخ', full: NAMES.moulavi, name: 'مولانا', bayt: ['بشنو این نی چون شکایت می‌کند', 'از جدایی‌ها حکایت می‌کند'] },
  { slug: 'khayyam', era: '۴۳۹ – ۵۲۶ ق · نیشابور', full: NAMES.khayyam, name: 'خیام', bayt: ['این قافلهٔ عمر عجب می‌گذرد', 'دریاب دمی که با طرب می‌گذرد'] },
  { slug: 'ferdousi', era: '۳۲۹ – ۴۱۱ ق · مشهد', full: NAMES.ferdousi, name: 'فردوسی', bayt: ['توانا بود هر که دانا بود', 'ز دانش دل پیر برنا بود'] },
  { slug: 'saeb', era: '۱۰۰۱ – ۱۰۸۰ ق · اصفهان', full: NAMES.saeb, name: 'صائب', bayt: ['اظهار عجز پیش ستم‌پیشگان خطاست', 'اشک کباب باعث طغیان آتش است'] },
  { slug: 'seyf', full: NAMES.seyf, name: 'سیف فرغانی', bayt: ['ای تیغتان چو نیزه برای ستم دراز', 'این تیزی سنان شما نیز بگذرد'] },
];
// Every poet has a portrait. The reader picks which of them show on the wall (ticks in the all-poets list).
const ALL = TOP.map((slug) => ({ slug, full: NAMES[slug], ...INFO.find((q) => q.slug === slug) }));
const WALL_KEY = 'sp.wall';
const chosen = () => {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(WALL_KEY)); } catch { /* storage blocked */ }
  const list = Array.isArray(v) ? ALL.filter((p) => v.includes(p.slug)) : [];
  return list.length ? list : ALL.slice();
};
let POETS = chosen();
const isDark = () => document.documentElement.dataset.theme === 'dark';
const img = (p) => `img/poets/${p.slug}${isDark() ? '-dark' : ''}.webp`;
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
const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let root = null;
let centre = null;
const info = new Map(); // slug -> { poet, cat }
let cleanup = [];

export function mountWall() {
  if (root) return;
  document.body.classList.add('wall-mode');

  root = document.createElement('div');
  root.className = 'wall-root';
  root.innerHTML = `
    <header class="w-header">
      <button class="w-menu menu-trigger" aria-label="منو" aria-haspopup="true"><img src="icons/logo-2.svg" alt=""></button>
    </header>
    <main class="wall" id="wall" aria-label="دیوار شاعران"></main>
    <button class="w-all" type="button" aria-haspopup="dialog">همه شاعران</button>
    <div class="w-lb" id="wLb" aria-hidden="true">
      <div class="w-lb-card" role="dialog" aria-modal="true" aria-label="همه شاعران">
        <button type="button" class="lb-x" id="wLbX" aria-label="بستن"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2l8 8M10 2l-8 8"/></svg></button>
        <h2>همه شاعران</h2>
        <p class="w-lb-hint">با تیک زدن، شاعران منتخب خود را همیشه در صفحهٔ اصلی داشته باشید.</p>
        <input type="search" class="w-lb-q" placeholder="جست‌وجوی نام شاعر" autocomplete="off">
        <div class="w-lb-cap"><label class="w-lb-allrow"><b id="wAllTxt">انتخاب همه</b><span class="w-lb-tick"><input type="checkbox" id="wAllTick"><i></i></span></label></div>
        <ul class="w-lb-list"></ul>
      </div>
    </div>
    <div class="w-grain" aria-hidden="true"></div>
    <div class="w-veil" id="wVeil"></div>
    <div class="w-focus" id="wFocus" aria-hidden="true"><div class="w-glow"></div><img alt=""></div>
    <aside class="w-panel" id="wPanel" role="dialog" aria-modal="true" aria-hidden="true" tabindex="-1"></aside>`;
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
  const touchNames = !matchMedia('(hover: hover)').matches;
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
          el.tabIndex = 0;
          el.setAttribute('role', 'button');
          el.setAttribute('aria-label', p.full);
          el.innerHTML = `<div class="w-tglow"></div><img src="${img(p)}" alt="" draggable="false" loading="lazy" onload="this.classList.add('loaded')"><div class="w-name">${p.full}</div>`;
          wall.appendChild(el);
          pool.set(key, el);
        }
        el.style.transform = `translate(${c * TILE + offX}px, ${r * TILE + offY}px)`;
        if (touchNames) {
          // Phones: the portrait nearest the centre of the screen shows its name; it fades as it moves away.
          const dx = c * TILE + offX + TILE / 2 - vw / 2, dy = r * TILE + offY + TILE / 2 - vh / 2;
          const o = Math.max(0, 1 - Math.hypot(dx, dy) / (TILE * 0.7));
          if (POETS.length === 1) { el.lastElementChild.style.opacity = '1'; continue; }
          el.lastElementChild.style.opacity = o.toFixed(3);
        }
      }
    }
    for (const [key, el] of pool) if (!needed.has(key)) { el.remove(); pool.delete(key); }
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
      if (tile) openFocus(+tile.dataset.pi, tile);
    }
  };
  on(wall, 'pointerup', end);
  on(wall, 'pointercancel', end);
  on(wall, 'keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const tile = e.target.closest('.w-tile');
    if (!tile) return;
    e.preventDefault();
    openFocus(+tile.dataset.pi, tile);
  });
  on(window, 'wheel', (e) => {
    if (panel.contains(e.target) || focusEl.classList.contains('show') || root.classList.contains('listing')) return;
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
      if (root.classList.contains('focused') || root.classList.contains('listing') || document.hidden) { rest(1200); return; }
      if (POETS.length === 1) return;
      const e = Math.min(1, Math.max(0, (t - calmSince) / 4000)); // ease back in over 4s
      const k = e * e * (3 - 2 * e);
      if (!k) return;
      offX += vx * dt * k; offY += vy * dt * k;
      render();
    };
    raf = requestAnimationFrame(tick);
    cleanup.push(() => cancelAnimationFrame(raf));
  }

  /* ── Focus: the portrait comes forward, its story opens beside it ── */
  const focusEl = root.querySelector('#wFocus');
  const focusImg = focusEl.querySelector('img');
  const veil = root.querySelector('#wVeil');
  const panel = root.querySelector('#wPanel');
  let fromTile = null, returnFocus = null, drag = null;

  function targetRect() {
    if (innerWidth < 768) {
      const free = innerHeight * 0.36; // the panel takes the bottom 64%
      const s = Math.min(innerWidth * 0.5, free * 0.84, 230);
      return { x: (innerWidth - s) / 2, y: (free - s) / 2, s };
    }
    const panelW = Math.min(480, innerWidth * 0.36);
    const free = innerWidth - panelW; // panel sits on the left in RTL
    const s = Math.min(free * 0.62, innerHeight * 0.72);
    return { x: panelW + (free - s) / 2, y: (innerHeight - s) / 2, s };
  }
  function place(r) {
    focusEl.style.width = focusEl.style.height = r.s + 'px';
    focusEl.style.transform = `translate(${r.x}px, ${r.y}px)`;
  }

  // Each poet's story and works, fetched quietly as soon as the wall shows,
  // so the panel opens complete and nothing appears or shifts afterwards.
  const loadInfo = (slug) => Promise.all([getPoet(slug), getCat(slug)]).then(([poet, cat]) => { const d = { poet, cat }; info.set(slug, d); return d; });
  POETS.forEach((q) => { if (!info.has(q.slug)) loadInfo(q.slug).catch(() => {}); });

  async function openFocus(pi, tile) {
    const p = POETS[pi];
    fromTile = tile; returnFocus = document.activeElement;
    const b = tile.getBoundingClientRect();
    focusImg.src = img(p);
    focusEl.style.transition = 'none';
    place({ x: b.left, y: b.top, s: b.width });
    focusEl.offsetWidth; // commit start position
    focusEl.style.transition = '';
    tile.classList.add('w-hidden');
    root.classList.add('focused');
    focusEl.classList.add('show');
    veil.classList.add('show');
    place(targetRect());
    const ready = info.get(p.slug); // loaded in the background when the wall opened
    panel.innerHTML = panelHTML(p, ready?.poet || null, ready?.cat || null);
    fitName(); fillShelves(p, ready?.cat);
    drag?.reset(); panel.classList.remove('full'); root.classList.remove('panel-full');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    panel.scrollTop = 0;
    setTimeout(() => panel.focus({ preventScroll: true }), 50);
    if (ready) return;
    try {
      // Not loaded yet: swap in the full story once the panel has finished rising.
      const [d] = await Promise.all([loadInfo(p.slug), new Promise((r) => setTimeout(r, 850))]);
      if (panel.dataset.slug === p.slug) { panel.innerHTML = panelHTML(p, d.poet, d.cat); fitName(); fillShelves(p, d.cat); }
    } catch { /* offline: the short panel is still useful */ }
  }

  function closeFocus() {
    if (!focusEl.classList.contains('show')) return;
    drag?.reset(); panel.classList.remove('full'); root.classList.remove('panel-full');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    veil.classList.remove('show');
    root.classList.remove('focused');
    const t = fromTile;
    if (t && t.isConnected) {
      const b = t.getBoundingClientRect();
      place({ x: b.left, y: b.top, s: b.width });
    }
    focusEl.classList.remove('show');
    setTimeout(() => { t?.classList.remove('w-hidden'); if (!focusEl.classList.contains('show')) focusImg.removeAttribute('src'); }, 680);
    returnFocus?.focus?.({ preventScroll: true });
  }

  // The full name stays on one line: shrink it if the panel is too narrow.
  function fitName() {
    const h = panel.querySelector('.wp-name');
    if (!h) return;
    h.style.fontSize = '';
    const over = h.scrollWidth / h.clientWidth;
    if (over > 1) h.style.fontSize = `calc(${getComputedStyle(h).fontSize} / ${(over * 1.02).toFixed(3)})`;
  }

  // Download the whole poet for offline reading: a small icon that fills in once saved.
  const saving = new Map(); // slug -> progress 0..1
  function dlButton(slug) {
    const saved = isPoetSaved(slug), prog = saving.get(slug);
    const label = saved ? 'برای خواندن آفلاین ذخیره شده' : 'دانلود همه آثار برای خواندن آفلاین';
    return `<button class="wp-dl${saved ? ' saved' : ''}${prog != null ? ' busy' : ''}" data-slug="${p_esc(slug)}" aria-label="${label}" data-tip="${saved ? 'ذخیره شده' : 'دانلود برای آفلاین'}" style="--p:${prog ?? 0}"><svg viewBox="0 0 24 24"><path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19h14"/></svg></button>`;
  }
  const p_esc = esc;
  async function startSave(btn) {
    const slug = btn.dataset.slug;
    if (isPoetSaved(slug) || saving.has(slug)) return;
    saving.set(slug, 0);
    const cur = () => panel.querySelector(`.wp-dl[data-slug="${slug}"]`);
    cur()?.classList.add('busy');
    const ok = await savePoet(slug, (f) => { saving.set(slug, f); cur()?.style.setProperty('--p', f.toFixed(3)); }).catch(() => false);
    saving.delete(slug);
    const b = cur();
    if (b) { b.classList.remove('busy'); b.classList.toggle('saved', ok); b.style.setProperty('--p', 0); if (ok) { b.setAttribute('aria-label', 'برای خواندن آفلاین ذخیره شده'); b.dataset.tip = 'ذخیره شده'; } }
  }

  const shelves = new Map();
  async function fillShelves(p, cat) {
    if (!cat) return;
    if (!shelves.has(p.slug)) shelves.set(p.slug, shelf(cat).catch(() => { shelves.delete(p.slug); return []; }));
    const groups = await shelves.get(p.slug);
    const box = panel.querySelector('#wpShelves');
    if (box && panel.dataset.slug === p.slug) box.innerHTML = shelfHTML(groups, p.full, 'wp-shelf');
  }
  function panelHTML(p, poet, cat) {
    panel.dataset.slug = p.slug;
    const years = poet?.BirthYearInLHijri && poet?.DeathYearInLHijri ? `${fa(poet.BirthYearInLHijri)} – ${fa(poet.DeathYearInLHijri)} ق` : '';
    const places = poet ? [poet.BirthPlace, poet.DeathPlace].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') : '';
    const intro = poet?.Description ? poet.Description.split(/(?<=[.!؟])\s+/).slice(0, 3).join(' ') : '';
    return `
      <div class="wp-grip" id="wpClose" aria-hidden="true"><i></i></div>
      ${dlButton(p.slug)}
      <button class="wp-x" id="wpX" aria-label="بستن" data-tip="بستن"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button>
      <h2 class="wp-name">${p.full}</h2>
      <p class="wp-era">${p.era || [years, esc(places)].filter(Boolean).join(' · ')}</p>
      ${p.bayt ? `<blockquote class="wp-bayt"><span>${p.bayt[0]}</span><span>${p.bayt[1]}</span></blockquote>` : ''}
      ${intro ? `<p class="wp-intro">${esc(intro)}</p>` : poet ? '' : '<div class="wp-wait"><i></i><i></i><i></i></div>'}
      <div class="wp-shelves" id="wpShelves"></div>`;
  }

  /* ── All poets: a lightbox over the wall ── */
  const lb = root.querySelector('#wLb'), lbList = lb.querySelector('.w-lb-list'), lbQ = lb.querySelector('.w-lb-q');
  let lbPoets = null;
  const norm = (x) => String(x).replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/\u200c/g, ' ').trim();
  const allTick = lb.querySelector('#wAllTick');
  const syncAll = () => {
    allTick.checked = POETS.length === ALL.length;
    allTick.indeterminate = POETS.length > 1 && POETS.length < ALL.length;
    lb.querySelector('#wAllTxt').textContent = allTick.checked ? 'برداشتن همه' : 'انتخاب همه';
  };
  const drawList = () => {
    syncAll();
    if (!lbPoets) { lbList.innerHTML = '<li class="w-lb-empty">…</li>'; return; }
    const q = norm(lbQ.value);
    const list = q ? lbPoets.filter((p) => norm(p.Nickname).includes(q)) : lbPoets;
    lbList.innerHTML = list.length
      ? list.map((p) => {
        const slug = p.FullUrl.replace(/^\//, ''), has = ALL.some((q) => q.slug === slug);
        const on = POETS.some((q) => q.slug === slug);
        // The opposite portrait reads best on the card: dark portrait on the light card, light on the dark.
        const face = has ? `<img class="w-lb-face" src="img/poets/${esc(slug)}${document.documentElement.dataset.theme === 'dark' ? '' : '-dark'}.webp" alt="" loading="lazy" decoding="async">` : '<i class="w-lb-face"></i>';
        return `<li><a href="#/c/${esc(slug)}">${face}<span>${esc(p.Nickname)}</span></a><label class="w-lb-tick${has ? '' : ' off'}" title="${has ? 'نمایش در خانه' : 'هنوز تصویری ندارد'}"><input type="checkbox" data-slug="${esc(slug)}"${on ? ' checked' : ''}${has ? '' : ' disabled'}><i></i></label></li>`;
      }).join('')
      : '<li class="w-lb-empty">شاعری با این نام پیدا نشد</li>';
  };
  const openList = async () => {
    root.classList.add('listing'); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
    drawList();
    if (!lbPoets) { try { lbPoets = (await getManifest()).Poets; } catch { lbPoets = []; } drawList(); }
  };
  const closeList = () => { root.classList.remove('listing'); lb.classList.remove('open'); lb.setAttribute('aria-hidden', 'true'); };
  on(root.querySelector('.w-all'), 'click', openList);
  on(lb, 'click', (e) => { if (e.target === lb) closeList(); });
  on(root.querySelector('#wLbX'), 'click', closeList);
  on(lbQ, 'input', drawList);
  // Ticks choose which portraits make up the wall; at least one always stays.
  on(lbList, 'change', (e) => {
    const box = e.target.closest('input[type=checkbox]');
    if (!box) return;
    const keep = new Set(POETS.map((q) => q.slug));
    if (box.checked) keep.add(box.dataset.slug); else keep.delete(box.dataset.slug);
    if (!keep.size) { box.checked = true; return; }
    setWall(keep);
  });
  // Select all / none. The wall can't be empty, so "none" keeps only the first poet.
  on(allTick, 'change', () => {
    setWall(new Set(allTick.checked ? ALL.map((q) => q.slug) : [ALL[0].slug]));
    drawList();
  });
  function setWall(keep) {
    POETS = ALL.filter((q) => keep.has(q.slug));
    syncAll();
    try { localStorage.setItem(WALL_KEY, JSON.stringify(POETS.map((q) => q.slug))); } catch { /* ignore */ }
    for (const el of pool.values()) el.remove();
    pool.clear();
    render();
    POETS.forEach((q) => { if (!info.has(q.slug)) loadInfo(q.slug).catch(() => {}); });
  }
  on(document, 'keydown', (e) => { if (e.key === 'Escape') closeList(); });

  on(veil, 'click', closeFocus);
  on(focusEl, 'click', closeFocus);
  on(panel, 'click', (e) => {
    if (e.target.closest('#wpClose, #wpX')) closeFocus();
    const dl = e.target.closest('.wp-dl'); if (dl) startSave(dl);
  });
  on(document, 'keydown', (e) => { if (e.key === 'Escape') closeFocus(); });
  // Phones: the panel rests at 64% height; drag up to open it fully, down to close.
  // It follows the finger and settles by position and flick speed.
  const half = () => panel.offsetHeight - innerHeight * 0.64;
  drag = attachSheetDrag({
    el: panel, backdrop: veil, start: 1, handle: () => panel.querySelector('.wp-grip'),
    snapMs: 760, ease: 'cubic-bezier(.22,1,.36,1)', // rises and settles gently
    snaps: () => [0, half()],
    enabled: () => innerWidth < 768 && panel.classList.contains('open'),
    canScroll: (i) => i === 0,
    onSnap: (i) => { panel.classList.toggle('full', i === 0); root.classList.toggle('panel-full', i === 0); if (i === 1) panel.scrollTop = 0; },
    onClose: closeFocus,
  });
}

export function unmountWall() {
  if (!root) return;
  cleanup.forEach((f) => f()); cleanup = [];
  root.remove(); root = null;
  document.body.classList.remove('wall-mode');
}
