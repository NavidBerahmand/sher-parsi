// Home page: an endless wall of carved poet portraits.
// Drag (or scroll) in any direction; tap a portrait to bring it forward with its story.
import { getPoet, getCat } from './data.js';
import { attachSheetDrag } from './sheetdrag.js';

const POETS = [
  { slug: 'hafez', era: '۷۲۶ – ۷۹۲ ق · شیراز', full: 'خواجه حافظ شیرازی', name: 'حافظ', bayt: ['الا یا ایها الساقی ادر کأسا و ناولها', 'که عشق آسان نمود اول ولی افتاد مشکل‌ها'] },
  { slug: 'saadi', era: '۶۱۵ – ۶۹۴ ق · شیراز', full: 'سعدی شیرازی', name: 'سعدی', bayt: ['بنی آدم اعضای یکدیگرند', 'که در آفرینش ز یک گوهرند'] },
  { slug: 'moulavi', era: '۶۰۴ – ۶۷۲ ق · بلخ', full: 'مولانا جلال‌الدین محمد بلخی', name: 'مولانا', bayt: ['بشنو این نی چون شکایت می‌کند', 'از جدایی‌ها حکایت می‌کند'] },
  { slug: 'khayyam', era: '۴۳۹ – ۵۲۶ ق · نیشابور', full: 'حکیم عمر خیام نیشابوری', name: 'خیام', bayt: ['این قافلهٔ عمر عجب می‌گذرد', 'دریاب دمی که با طرب می‌گذرد'] },
  { slug: 'ferdousi', era: '۳۲۹ – ۴۱۱ ق · مشهد', full: 'حکیم ابوالقاسم فردوسی توسی', name: 'فردوسی', bayt: ['توانا بود هر که دانا بود', 'ز دانش دل پیر برنا بود'] },
  { slug: 'saeb', era: '۱۰۰۱ – ۱۰۸۰ ق · اصفهان', full: 'صائب تبریزی', name: 'صائب', bayt: ['اظهار عجز پیش ستم‌پیشگان خطاست', 'اشک کباب باعث طغیان آتش است'] },
];
const img = (p) => `img/poets/${p.slug}.webp`;
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
      <button class="w-menu menu-trigger" aria-label="منو" aria-haspopup="true"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </header>
    <main class="wall" id="wall" aria-label="دیوار شاعران"></main>
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
  const SEAM = 1;
  // The opening card is exactly one portrait tile, sitting on the centre one.
  document.documentElement.style.setProperty('--w-tile', TILE - SEAM + 'px');
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
  // 4 columns per row-step and 6 poets: horizontal and vertical neighbours never repeat.
  const touchNames = !matchMedia('(hover: hover)').matches;
  const poetAt = (r, c) => ((r * 4 + c) % POETS.length + POETS.length) % POETS.length;

  function render() {
    const vw = innerWidth, vh = innerHeight;
    grain.style.backgroundPosition = `${offX}px ${offY}px`;
    const c0 = Math.floor(-offX / TILE) - 1, r0 = Math.floor(-offY / TILE) - 1;
    const c1 = Math.ceil((vw - offX) / TILE) + 1, r1 = Math.ceil((vh - offY) / TILE) + 1;
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
    offX += dx; offY += dy; sx = e.clientX; sy = e.clientY;
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
    if (panel.contains(e.target) || focusEl.classList.contains('show')) return;
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
    fitName();
    drag?.reset(); panel.classList.remove('full'); root.classList.remove('panel-full');
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    panel.scrollTop = 0;
    setTimeout(() => panel.focus({ preventScroll: true }), 50);
    if (ready) return;
    try {
      // Not loaded yet: swap in the full story once the panel has finished rising.
      const [d] = await Promise.all([loadInfo(p.slug), new Promise((r) => setTimeout(r, 850))]);
      if (panel.dataset.slug === p.slug) { panel.innerHTML = panelHTML(p, d.poet, d.cat); fitName(); }
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

  function panelHTML(p, poet, cat) {
    panel.dataset.slug = p.slug;
    const years = poet?.BirthYearInLHijri && poet?.DeathYearInLHijri ? `${fa(poet.BirthYearInLHijri)} – ${fa(poet.DeathYearInLHijri)} ق` : '';
    const places = poet ? [poet.BirthPlace, poet.DeathPlace].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') : '';
    const intro = poet?.Description ? poet.Description.split(/(?<=[.!؟])\s+/).slice(0, 3).join(' ') : '';
    const books = cat?.ChildCats || [];
    return `
      <div class="wp-grip" id="wpClose" aria-hidden="true"><i></i></div>
      <h2 class="wp-name">${p.full}</h2>
      <p class="wp-era">${p.era || [years, esc(places)].filter(Boolean).join(' · ')}</p>
      <blockquote class="wp-bayt"><span>${p.bayt[0]}</span><span>${p.bayt[1]}</span></blockquote>
      ${intro ? `<p class="wp-intro">${esc(intro)}</p>` : poet ? '' : '<div class="wp-wait"><i></i><i></i><i></i></div>'}
      ${books.length ? `<div class="wp-rule"><span>آثار</span></div>
        <ol class="wp-books">${books.map((b) => `<li><a href="#/c/${b.FullUrl.replace(/^\//, '')}"><span>${esc(b.Title)}</span><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg></a></li>`).join('')}</ol>` : ''}`;
  }

  on(veil, 'click', closeFocus);
  on(focusEl, 'click', closeFocus);
  on(panel, 'click', (e) => { if (e.target.closest('#wpClose')) closeFocus(); });
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
