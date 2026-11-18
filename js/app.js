import { getManifest, getPoet, getCat, getPoem, parentOf, clean, blocks, FEATURED, DAILY_POOL, TOP, NAMES, NICK, shelf, shelfHTML } from './data.js';
import { settings, apply, saved, history, bayts, exportData, importData } from './store.js';
import { baytImage, poemImage, shareBlob, withKashida } from './share.js';
import { search, highlight, norm as searchNorm } from './search.js';
import { mountWall, unmountWall, wallChoice, setWallChoice, WALL_ALL } from './wall.js';
import { attachSheetDrag } from './sheetdrag.js';
import { overlayOpened, overlayClosed, overlayNavigate, overlayIsOpen, overlaySwap, overlayForget } from './overlay.js';

const $ = (s, el = document) => el.querySelector(s);
const main = $('#main');
const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
// Some source texts put a space before a vowel mark ("کشتی ِ"); join the mark back to its letter.
const esc = (s) => String(s ?? '').replace(/\s+(?=[\u064B-\u065F\u0670])/g, '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HARAKAT = /[ً-ْٰ]/g;
const txt = (s) => esc(settings.get().harakat ? s : String(s).replace(HARAKAT, ''));
const vtxt = txt;
const initial = (name) => (String(name).replace(/^(شیخ|خواجه|ملک‌الشعرا|حکیم|امیر|میرزا|ملا)\s+/, '').trim()[0] || '؟');

const ICON = {
  chev: '<svg class="chev" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6"/></svg>',
  bookmark: '<svg viewBox="0 0 24 24"><path d="M7 4h10v16l-5-3.5L7 20z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 4v11M8 8l4-4 4 4"/><path d="M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9.5" cy="9.5" r="1.6"/><path d="M20 15l-4.5-4.5L6 20"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
  cloud: '<svg viewBox="0 0 24 24"><path d="M12 11v7M9 15l3 3 3-3"/><path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M4 11l8-7 8 7"/><path d="M6.5 9.5V20h11V9.5"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4-4"/></svg>',
  star: '<svg viewBox="0 0 24 24"><path d="M12 3l2.2 5.6L20 9.3l-4.5 3.8 1.4 5.9L12 15.9 7.1 19l1.4-5.9L4 9.3l5.8-.7z"/></svg>',
  shuffle: '<svg viewBox="0 0 24 24"><path d="M4 7h3.5c4.5 0 4.5 10 9 10H20M4 17h3.5c1.6 0 2.6-1.2 3.4-2.8M13.1 9.8C13.9 8.2 14.9 7 16.5 7H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
  lantern: '<svg viewBox="0 0 64 64"><path d="M32 6v6M24 12h16M22 18c0-3 4-6 10-6s10 3 10 6v22c0 6-4 10-10 10s-10-4-10-10z"/><path d="M26 54h12M28 58h8M32 24c3 3 4 6 4 9a4 4 0 0 1-8 0c0-3 1-6 4-9z"/></svg>',
};

/* ───────── Sheet & toast ───────── */
const sheet = $('#sheet'), backdrop = $('#sheetBackdrop'), sheetBody = $('#sheetBody');
let sheetReturn = null;
function openSheet(html, onMount) {
  sheetReturn = document.activeElement;
  sheetBody.innerHTML = `<button type="button" class="sheet-x" aria-label="بستن">${ICON.x}</button>${html}`;
  sheetBody.querySelector('.sheet-x').addEventListener('click', () => closeSheet());
  backdrop.hidden = false;
  requestAnimationFrame(() => { backdrop.classList.add('show'); sheet.classList.add('show'); sheet.setAttribute('aria-hidden', 'false'); sheet.focus(); });
  onMount?.(sheetBody);
  if (!overlayIsOpen(sheetBack)) overlayOpened(sheetBack);
}
const sheetBack = () => closeSheet(true);
function closeSheet(fromBack) {
  if (!sheet.classList.contains('show') && backdrop.hidden) return;
  if (fromBack !== true) overlayClosed(sheetBack);
  backdrop.classList.remove('show'); sheet.classList.remove('show'); sheet.setAttribute('aria-hidden', 'true');
  setTimeout(() => { backdrop.hidden = true; document.querySelectorAll('.bayt.lit').forEach((b) => b.classList.remove('lit')); }, 280);
  sheetReturn?.focus?.({ preventScroll: true });
}
backdrop.addEventListener('click', () => closeSheet());
document.addEventListener('keydown', (e) => {
  if (!sheet.classList.contains('show')) return;
  if (e.key === 'Escape') closeSheet();
  if (e.key === 'Tab') {
    const f = [...sheet.querySelectorAll('button, a[href], input')].filter((x) => x.offsetParent && !x.disabled);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (!sheet.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
// Drag the sheet down to close it.
(() => {
  let y0 = null, dy = 0;
  sheet.addEventListener('touchstart', (e) => { if (sheet.scrollTop <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
  sheet.addEventListener('touchmove', (e) => {
    if (y0 === null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    sheet.style.transition = 'none'; sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener('touchend', () => {
    if (y0 === null) return;
    sheet.style.transition = ''; sheet.style.transform = '';
    if (dy > 90) closeSheet();
    y0 = null;
  });
})();

let toastT;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ───────── Menu: a card in the middle of the screen with search, links and reading settings ───────── */
const menu = $('#menu'), mxQ = $('#mxQ'), mxNav = $('#mxNav'), mxRes = $('#mxRes');
let menuReturn = null;
function syncMenuSettings() {
  const s = settings.get();
  $('#mxSz').value = s.size;
  $('#mxWt').value = s.weight;
  $('#mxTheme').setAttribute('aria-checked', String(s.theme === 'dark'));
  $('#mxHk').setAttribute('aria-checked', String(!!s.harakat));
}
const menuBack = () => setMenu(false, true);
function setMenu(open, fromBack) {
  if (open === menu.classList.contains('open')) return;
  if (open) overlayOpened(menuBack); else if (!fromBack) overlayClosed(menuBack);
  menu.classList.toggle('open', open);
  menu.setAttribute('aria-hidden', String(!open));
  document.body.classList.toggle('menu-open', open);
  document.querySelectorAll('.menu-trigger').forEach((b) => b.setAttribute('aria-expanded', String(open)));
  if (open) {
    menuReturn = document.activeElement;
    syncMenuSettings();
    // Only jump into the search box where there is a real keyboard; on phones it would cover the menu.
    setTimeout(() => (matchMedia('(hover: hover) and (pointer: fine)').matches ? mxQ : menu.querySelector('.mx-card')).focus({ preventScroll: true }), 60);
  } else {
    mxQ.blur();
    menuReturn?.focus?.({ preventScroll: true });
  }
}
menu.querySelector('.mx-card').tabIndex = -1;
document.addEventListener('click', (e) => {
  const r = e.target.closest('.w-resume');
  if (r && r.dataset.line) pendingFind = { url: r.dataset.url, line: r.dataset.line };
});
document.addEventListener('click', (e) => { if (e.target.closest('.menu-trigger')) { e.preventDefault(); setMenu(!menu.classList.contains('open')); } });
menu.addEventListener('click', (e) => {
  if (e.target === menu) return setMenu(false);
  const a = e.target.closest('a');
  if (!a) return;
  // A search result: remember the line to show, and that closing the poem should come back here.
  if (a.dataset.line) { pendingFind = { url: a.dataset.url, line: a.dataset.line }; searchBack = true; }
  // The page the link opens takes the menu's place in the history.
  e.preventDefault();
  setMenu(false, true);
  overlayNavigate(menuBack, a.getAttribute('href'));
});
document.addEventListener('keydown', (e) => {
  const open = menu.classList.contains('open');
  if (e.key === 'Escape' && open) { e.stopImmediatePropagation(); if (mxQ.value && document.activeElement === mxQ) { mxQ.value = ''; $('#mxClr').hidden = true; runSearch(); } else setMenu(false); return; }
  // Ctrl/⌘+K or "/" opens search, as on most sites.
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName);
  if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing && !open)) {
    e.preventDefault(); setMenu(true); setTimeout(() => mxQ.focus(), 80);
  }
  // Keep Tab inside the card while it is open.
  if (e.key === 'Tab' && open) {
    const f = [...menu.querySelectorAll('input, button, a[href]')].filter((x) => x.offsetParent);
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}, true);
$('#mxX').addEventListener('click', () => setMenu(false));
$('#mxRandom').addEventListener('click', () => { setMenu(false, true); randomPoem((h) => overlayNavigate(menuBack, h)); });
$('#mxAbout').addEventListener('click', () => { setMenu(false, true); overlaySwap(menuBack, sheetBack); openAbout(); });
$('#mxBackup').addEventListener('click', () => { setMenu(false, true); overlaySwap(menuBack, sheetBack); openBackup(); });
$('#mxSz').addEventListener('input', (e) => { settings.set({ size: +e.target.value }); restretchSoon(); });
const nudgeSize = (d) => { const v = Math.min(1.6, Math.max(0.8, Math.round((settings.get().size + d) * 20) / 20)); settings.set({ size: v }); $('#mxSz').value = v; restretchSoon(); };
$('#mxSm').addEventListener('click', () => nudgeSize(-0.1));
$('#mxLg').addEventListener('click', () => nudgeSize(0.1));
$('#mxWt').addEventListener('input', (e) => { settings.set({ weight: +e.target.value }); restretchSoon(); });
const nudgeWeight = (d) => { const v = Math.min(600, Math.max(250, settings.get().weight + d)); settings.set({ weight: v }); $('#mxWt').value = v; restretchSoon(); };
$('#mxLt').addEventListener('click', () => nudgeWeight(-25));
$('#mxBd').addEventListener('click', () => nudgeWeight(25));
// On touch screens the switches have no hover: show their name for a moment after a tap.
document.querySelectorAll('.mx-sw').forEach((b) => b.addEventListener('click', () => {
  if (matchMedia('(hover: hover)').matches) return;
  b.classList.add('tip-show'); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove('tip-show'), 1400);
}));
$('#mxTheme').addEventListener('click', () => {
  const dark = settings.get().theme !== 'dark';
  settings.set({ theme: dark ? 'dark' : 'light', themeChosen: true }); syncMenuSettings();
  document.querySelectorAll('img.poet-pic, img.pl-face').forEach((im) => { im.src = im.src.replace(/(-dark)?\.webp/, dark ? '-dark.webp' : '.webp'); });
  document.querySelectorAll('img.w-lb-face').forEach((im) => { im.src = im.src.replace(/(-dark)?\.webp/, dark ? '.webp' : '-dark.webp'); });
});
$('#mxHk').addEventListener('click', () => {
  settings.set({ harakat: !settings.get().harakat }); syncMenuSettings();
  if (current.view === 'poem' && sheetEl) redrawVerses();
  else if (current.view === 'cat') rerender();
});

/* Search inside the menu */
let searchSeq = 0, searchT, searchMore = null;
mxQ.addEventListener('input', () => { $('#mxClr').hidden = !mxQ.value; clearTimeout(searchT); searchT = setTimeout(runSearch, 260); });
$('#mxClr').addEventListener('click', (e) => { e.preventDefault(); mxQ.value = ''; $('#mxClr').hidden = true; runSearch(); mxQ.focus(); });
mxQ.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(searchT); runSearch(); mxQ.blur(); } });
$('#mxBody').addEventListener('scroll', (e) => {
  const b = e.currentTarget;
  if (searchMore && b.scrollTop + b.clientHeight > b.scrollHeight - 200) searchMore();
});
const POET_NAME = (slug) => NAMES[slug] || NICK.get(slug) || slug;
async function runSearch() {
  const raw = mxQ.value, seq = ++searchSeq;
  searchMore = null;
  if (!raw.trim()) { mxRes.hidden = true; mxNav.hidden = false; mxRes.innerHTML = ''; menu.classList.remove('searching'); return; }
  mxNav.hidden = true; mxRes.hidden = false; menu.classList.add('searching');
  mxRes.innerHTML = '<p class="mx-note">در حال جست‌وجو…</p>';
  let r;
  getManifest().catch(() => {}); // fills NICK, the names of poets outside NAMES
  try { r = await search(raw); } catch { if (seq === searchSeq) mxRes.innerHTML = '<p class="mx-note">جست‌وجو نیاز به اینترنت دارد</p>'; return; }
  if (seq !== searchSeq) return;
  if (r.status === 'short') { mxRes.innerHTML = '<p class="mx-note">عبارت را کمی کامل‌تر بنویس؛ واژه‌های خیلی رایج مثل «دل» یا «که» به‌تنهایی جست‌وجو نمی‌شوند.</p>'; return; }
  if (r.status === 'none') { mxRes.innerHTML = '<p class="mx-note">چیزی پیدا نشد</p>'; return; }
  mxRes.innerHTML = '<ul class="mx-list"></ul><p class="mx-note mx-wait">…</p>';
  const ul = mxRes.querySelector('ul'), wait = mxRes.querySelector('.mx-wait');
  let busy = false, count = 0;
  const page = async () => {
    if (busy) return; busy = true;
    try {
      const { items, done } = await r.more(count ? 30 : 20);
      if (seq !== searchSeq) return;
      count += items.length;
      ul.insertAdjacentHTML('beforeend', items.map((it) =>
        `<li><a href="${poemHref(it.url)}" data-url="${esc(clean(it.url))}" data-line="${esc(it.text)}"><span class="mx-l">${highlight(it.text, r.words, r.typing, esc)}</span><small>${esc(POET_NAME(it.poet))} · ${esc(it.title)}</small></a></li>`).join(''));
      if (done) { searchMore = null; wait.textContent = count ? '' : 'چیزی پیدا نشد'; wait.hidden = !!count; }
      else { searchMore = page; wait.textContent = '…'; const b = $('#mxBody'); if (b.scrollHeight <= b.clientHeight + 200) setTimeout(page, 0); }
    } catch { if (seq === searchSeq) wait.textContent = 'اتصال برقرار نشد'; }
    finally { busy = false; }
  };
  page();
}

/* After opening a poem from a search result, bring that line into view and mark it briefly. */
let pendingFind = null, searchBack = false;
function findLine(card, path) {
  if (!pendingFind || pendingFind.url !== path) return;
  const want = searchNorm(pendingFind.line).replace(/[\s‌]+/g, '');
  pendingFind = null;
  const el = [...card.querySelectorAll('.verses [data-i], .verses .m, .verses p')].find((x) => searchNorm(x.textContent).replace(/[\s‌]+/g, '').includes(want));
  if (!el) return;
  setTimeout(() => {
    el.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    el.classList.add('found'); setTimeout(() => el.classList.remove('found'), 2600);
  }, 450);
}

function openAbout() {
  openSheet(`
    <h3>دربارهٔ شعر پارسی</h3>
    <div class="about">
      <p>شعر پارسی جایی ساده و آرام برای خواندن شعر فارسی است؛ بی‌آگهی و بی‌حواس‌پرتی.</p>
      <p>متن همهٔ اشعار از <a href="https://ganjoor.net" target="_blank" rel="noopener">گنجور</a> گرفته شده است. سپاس از گنجور و همهٔ کسانی که این گنجینه را گرد آورده‌اند.</p>
      <p>برای نصب روی گوشی: در سافاری دکمهٔ اشتراک‌گذاری و سپس «افزودن به صفحهٔ اصلی» را بزن؛ در کروم از منوی سه‌نقطه «نصب برنامه» را انتخاب کن.</p>
      <p>قلم این سایت «کهربا» از <a href="https://fontiran.com/license/YVO2HC8R" target="_blank" rel="noopener">فونت ایران</a> است و به صورت قانونی و با مجوز استفاده می‌شود.</p>
      <a class="font-badge" href="https://fontiran.com/license/YVO2HC8R" target="_blank" rel="noopener"><img src="https://fontiran.com/storage/uploads/images/2025/11/badge2-minjcHOH8rKPv7J.png" width="100" height="100" alt="فونت کهربا" loading="lazy"></a>
      <p class="muted">نسخهٔ ${fa(VERSION)}</p>
    </div>`);
}

/* ───────── Helpers ───────── */
// The one close button every page uses: a black disc, top left. Back to wherever the reader came from, else home.
const pageClose = (id = 'pageX') => `<button class="icon-btn page-x tip-l" id="${id}" aria-label="بستن" data-tip="بستن">${ICON.x}</button>`;
function wireClose(id, up = '#/') { $('#' + id)?.addEventListener('click', () => { if (navCount > 1) window.history.back(); else location.hash = up; }); }
function loading() {
  // The four verse strokes of the logo, twice, shimmering while the page loads.
  main.innerHTML = '<div class="wrap" aria-busy="true"><div class="skeleton sk-verses"></div></div>';
}
function failed(err, retry) {
  const offline = !navigator.onLine;
  main.innerHTML = `${pageClose('errX')}<div class="wrap"><div class="error-box fadein">
    <h2>${offline ? 'به اینترنت وصل نیستی' : 'این صفحه باز نشد'}</h2>
    <p>${offline ? 'این بخش هنوز روی دستگاه ذخیره نشده است. وقتی وصل شدی دوباره امتحان کن.' : 'شاید نشانی اشتباه است یا ارتباط قطع شد.'}</p>
    <button class="btn ghost" id="retry">دوباره</button></div></div>`;
  $('#retry').addEventListener('click', retry);
  wireClose('errX');
  console.warn(err);
}
function mono(name, cls = '') { return `<span class="mono ${cls}" aria-hidden="true">${esc(initial(name))}</span>`; }
function crumbs(parts) {
  return `<nav class="crumbs" aria-label="مسیر">${parts.map((p, i) =>
    (i ? '<span class="sep">›</span>' : '') + (p.href ? `<a href="${p.href}">${esc(p.t)}</a>` : `<span>${esc(p.t)}</span>`)).join('')}</nav>`;
}
async function poetName(slug) {
  try { return (await getPoet(slug)).Nickname; } catch { return ''; }
}
const catHref = (u) => `#/c/${clean(u)}`;
const poemHref = (u) => `#/p/${clean(u)}`;
function firstLines(poem, n = 2) {
  return blocks(poem).filter((b) => b.kind === 'bayt' || b.kind === 'single' || b.kind === 'center').slice(0, n);
}
async function randomFrom(catUrl, seed) {
  const cat = await getCat(catUrl);
  const list = cat.Poems || [];
  const i = seed === undefined ? Math.floor(Math.random() * list.length) : seed % list.length;
  return list[i];
}

/* ───────── Views ───────── */
// Temporary home page: the owner has their own design for it, to be built once shared.
async function viewHome() {
  const hist = history.all()[0];
  main.innerHTML = `<div class="wrap fadein">
    <div class="hero"><p class="date">${new Intl.DateTimeFormat('fa-IR-u-ca-persian', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</p>
      <h1>شعر پارسی</h1></div>
    <div class="tiles">
      <a class="card tile" href="#/fal"><span class="ic">${ICON.star}</span><b>فال حافظ</b><span>نیت کن و دیوان را بگشا</span></a>
      <button class="card tile" id="rnd"><span class="ic">${ICON.shuffle}</span><b>شعر تصادفی</b><span>یک غزل یا رباعی تازه</span></button>
    </div>
    ${hist ? `<div class="section"><a class="card continue" href="${poemHref(hist.url)}"><span class="ic">${ICON.clock}</span>
      <span class="t"><b>${esc(hist.title)}</b><span>ادامهٔ خواندن · ${esc(hist.poet)}</span></span>${ICON.chev}</a></div>` : ''}
    <div class="section"><div class="section-head"><h2>شاعران</h2><a class="link" href="#/poets">همه</a></div>
      <div class="poet-strip">${FEATURED.map(([s, n]) => `<a class="poet-chip" href="#/c/${s}">${mono(n)}<span>${n}</span></a>`).join('')}</div></div>
  </div>`;
  $('#rnd').addEventListener('click', randomPoem);
}

async function randomPoem(go = (h) => { location.hash = h; }) {
  try {
    const pick = await randomFrom(DAILY_POOL[Math.floor(Math.random() * DAILY_POOL.length)]);
    go(poemHref(pick.FullUrl));
  } catch (e) { go(location.hash); toast('اتصال برقرار نشد'); }
}

async function viewPoets() {
  loading(10);
  const m = await getManifest();
  const poets = m.Poets;
  document.body.classList.add('poet-bg');
  main.innerHTML = `${pageClose()}<div class="wrap fadein">
    <div class="page-title"><h1>شاعران</h1><p>${fa(poets.length)} شاعر</p></div>
    <p class="pl-hint">با تیک زدنِ شاعرانی که تصویر دارند، آنها را همیشه در صفحهٔ خانه داشته باشید.</p>
    <div class="search"><label>${ICON.search}<input type="search" id="q" placeholder="جست‌وجوی نام شاعر" autocomplete="off"></label></div>
    <label class="pl-allrow"><b id="plAllTxt">انتخاب همه</b><span class="pl-tick"><input type="checkbox" id="plAll"><i></i></span></label>
    <ul class="poet-list" id="pl"></ul></div>`;
  const pl = $('#pl');
  const norm = (s) => s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').trim();
  const draw = (q = '') => {
    const nq = norm(q);
    const list = nq ? poets.filter((p) => norm(p.Nickname).includes(nq)) : poets;
    const dark = settings.get().theme === 'dark';
    const face = (p) => { const s = clean(p.FullUrl); return TOP.includes(s) ? `<img class="pl-face" src="img/poets/${esc(s)}${dark ? '-dark' : ''}.webp" alt="" width="1024" height="1024" loading="lazy" decoding="async">` : mono(p.Nickname); };
    const wall = new Set(wallChoice());
    // A tick puts the poet on the home wall; only poets with a portrait have one.
    const tick = (p) => { const s = clean(p.FullUrl); return WALL_ALL.includes(s) ? `<label class="pl-tick" title="نمایش در خانه"><input type="checkbox" data-slug="${esc(s)}"${wall.has(s) ? ' checked' : ''}><i></i></label>` : ''; };
    pl.innerHTML = list.length ? list.map((p) => `<li><a href="${catHref(p.FullUrl)}">${face(p)}<b>${esc(p.Nickname)}</b>${ICON.chev}</a>${tick(p)}</li>`).join('')
      : `<li class="empty-state"><b>شاعری با این نام پیدا نشد</b></li>`;
  };
  const all = $('#plAll');
  const syncAll = () => {
    const n = wallChoice().length;
    all.checked = n === WALL_ALL.length; all.indeterminate = n > 1 && n < WALL_ALL.length;
    $('#plAllTxt').textContent = all.checked ? 'برداشتن همه' : 'انتخاب همه';
  };
  draw(); syncAll();
  wireClose('pageX');
  $('#q').addEventListener('input', (e) => draw(e.target.value));
  // Ticks choose the wall's portraits; at least one always stays.
  pl.addEventListener('change', (e) => {
    const box = e.target.closest('input[type=checkbox]');
    if (!box) return;
    const keep = new Set(wallChoice());
    if (box.checked) keep.add(box.dataset.slug); else keep.delete(box.dataset.slug);
    if (!keep.size) { box.checked = true; return; }
    setWallChoice([...keep]); syncAll();
  });
  all.addEventListener('change', () => { setWallChoice(all.checked ? WALL_ALL : WALL_ALL.slice(0, 1)); draw($('#q').value); syncAll(); });
}

async function viewCat(path) {
  loading(8);
  const slug = path.split('/')[0];
  // "Other poems": a poet's loose poems, listed as their own book when the poet also has books.
  const other = path.endsWith('/~other');
  const real = other ? path.slice(0, -7) : path;
  const [cat0, poet] = await Promise.all([getCat(real), getPoet(slug).catch(() => null)]);
  const cat = other ? { ...cat0, Title: 'سایر اشعار', ChildCats: [] } : cat0;
  const isPoet = !path.includes('/');
  const seen = history.seen();
  const looseAsBook = isPoet && (cat.ChildCats || []).length > 0 && (cat.Poems || []).length > 0;
  const poems = looseAsBook ? [] : cat.Poems || [];
  const PAGE = 120;
  let shown = Math.min(poems.length, Math.max(PAGE, restoreShown)); restoreShown = 0;

  let head;
  if (isPoet && poet) {
    const years = poet.BirthYearInLHijri && poet.DeathYearInLHijri ? `${fa(poet.BirthYearInLHijri)}–${fa(poet.DeathYearInLHijri)} ق` : '';
    const place = [poet.BirthPlace, poet.DeathPlace].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join('، ');
    const dark = document.documentElement.dataset.theme === 'dark';
    const pic = TOP.includes(slug) ? `<img class="poet-pic" src="img/poets/${esc(slug)}${dark ? '-dark' : ''}.webp" alt="" width="1024" height="1024" decoding="async">` : '';
    head = `<div class="poet-head">${pic}<div><h1>${esc(poet.Nickname)}</h1>
      <p class="meta">${[esc(poet.Name !== poet.Nickname ? poet.Name : ''), years, esc(place)].filter(Boolean).join(' · ')}</p></div></div>
      ${poet.Description ? `<p class="bio clamp" id="bio">${esc(poet.Description)}</p><button class="bio-toggle" id="bioT">بیشتر</button>` : ''}`;
  } else {
    const trail = [];
    let p = path;
    while (p.includes('/')) { p = parentOf(p); trail.unshift(p); }
    const titles = await Promise.all(trail.map((t) => (t.includes('/') ? getCat(t).then((c) => c.Title).catch(() => '') : Promise.resolve(poet?.Nickname || t))));
    head = crumbs(trail.map((t, i) => ({ t: titles[i], href: catHref(t) })))
      + `<h1 class="cat-title">${esc(cat.Title)}</h1>`;
  }

  // Works as a shelf of book covers: cloth colour picked from the title, so each book keeps its own.
  const author = poet?.Nickname || '';
  const cover = (href, title, i) => {
    const h = [...title].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    return `<a class="book" href="${href}" style="--d:${Math.min(i, 12) * 40}ms"><span class="cover c${h % 4}"><span class="frame"><b>${esc(title)}</b><small>${esc(author)}</small></span></span></a>`;
  };
  // On a poet's page the works are grouped (a divan's forms get their own shelf); deeper pages show one shelf.
  const groups = isPoet && !other ? await shelf(cat) : null;
  // Inside a book its parts are a plain list, not more covers.
  const books = groups ? '' : (cat.ChildCats || []).map((c) => `<a class="part" href="${catHref(c.FullUrl)}"><b>${esc(c.Title)}</b>${ICON.chev}</a>`).join('');
  const poemItem = (p, i) => `<li><a href="${poemHref(p.FullUrl)}" data-u="${esc(clean(p.FullUrl))}"><span class="n">${fa(i + 1)}</span><span class="tt"><span class="fl"></span><small>${esc(p.Title)}</small></span><span class="marks">${marksHTML(clean(p.FullUrl), seen)}</span></a></li>`;

  main.dataset.cat = path;
  document.body.classList.toggle('poet-bg', isPoet && !!poet && TOP.includes(slug));
  main.innerHTML = `<button class="icon-btn page-x tip-l" id="pageX" aria-label="بستن" data-tip="بستن">${ICON.x}</button><div class="wrap fadein">${head}
    ${groups ? shelfHTML(groups, author) : books ? `<div class="parts">${books}</div>` : ''}
    ${poems.length ? `<div class="list-tools"><span class="count">${fa(poems.length)} شعر</span></div>
      <ul class="poems" id="pm">${poems.slice(0, shown).map(poemItem).join('')}</ul>
      ${poems.length > shown ? `<button class="btn ghost more-btn" id="more">نمایش بیشتر</button>` : ''}` : ''}
    <div id="nextSec"></div>
  </div>`;
  // End of a section: a button on to the next one in the poet's works (the next sibling, or the parent's next).
  if (!isPoet && !other) nextSection(path).then((n) => {
    const box = $('#nextSec');
    if (n && box && main.dataset.cat === path) box.outerHTML = `<a class="btn next-sec" href="${catHref(n.FullUrl)}"><small>بخش بعد</small><b>${esc(n.Title)}</b>${ICON.chev}</a>`;
  }).catch(() => {});

  observeFirstLines();
  // Close: back to wherever the reader came from in the app; otherwise up one level.
  $('#pageX').addEventListener('click', () => {
    if (navCount > 1) window.history.back();
    else location.hash = isPoet ? '#/' : catHref(parentOf(path));
  });
  $('#bioT')?.addEventListener('click', (e) => {
    const b = $('#bio'); b.classList.toggle('clamp');
    e.currentTarget.textContent = b.classList.contains('clamp') ? 'بیشتر' : 'کمتر';
  });
  $('#more')?.addEventListener('click', (e) => {
    const next = poems.slice(shown, shown + PAGE);
    $('#pm').insertAdjacentHTML('beforeend', next.map((p, i) => poemItem(p, shown + i)).join(''));
    shown += next.length;
    observeFirstLines();
    if (shown >= poems.length) { e.currentTarget.remove(); moreObs?.disconnect(); }
  });
  moreObs?.disconnect(); moreObs = null;
  const moreBtn = $('#more');
  if (moreBtn) {
    moreObs = new IntersectionObserver((es) => { if (es[0].isIntersecting && moreBtn.isConnected) moreBtn.click(); }, { rootMargin: '600px 0px' });
    moreObs.observe(moreBtn);
  }
}
let moreObs = null;
async function nextSection(path) {
  let p = clean(path);
  while (p.includes('/')) {
    const parent = parentOf(p);
    const kids = (await getCat(parent)).ChildCats || [];
    const i = kids.findIndex((c) => clean(c.FullUrl) === p);
    if (i >= 0 && i < kids.length - 1) return kids[i + 1];
    p = parent;
  }
  return null;
}

// Show each poem's opening line in book lists, fetched lazily as rows scroll into view.
let flObserver;
function observeFirstLines() {
  flObserver?.disconnect();
  flObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const a = e.target; flObserver.unobserve(a);
      getPoem(a.dataset.u).then((poem) => {
        const f = firstLines(poem, 1)[0];
        const line = f ? f.m.find(Boolean) : '';
        if (line) { a.querySelector('.fl').innerHTML = txt(line); a.classList.add('has-fl'); }
      }).catch(() => {});
    }
  }, { rootMargin: '300px 0px' });
  document.querySelectorAll('.poems a[data-u]:not(.has-fl)').forEach((a) => flObserver.observe(a));
}

// Lines that are only a divider (***, ٭٭٭, ...) are centred.
const SEP_RE = /^[\s*٭⁂✱✲✳•·.…\-–—_=~]+$/;
function renderBlocks(bs, { tappable = true } = {}) {
  let n = 0; // couplet number, shown faintly in the poem card only (via CSS, so it is never copied or exported)
  return bs.map((b, i) => {
    if (b.kind === 'break') return '<div class="section-break"></div>';
    if ((b.kind === 'prose' || b.kind === 'note') && SEP_RE.test(b.text)) return `<p class="sep-line">${txt(b.text.trim())}</p>`;
    if (b.kind === 'prose') return `<p class="prose">${vtxt(b.text)}</p>`;
    if (b.kind === 'note') return `<p class="note">${txt(b.text)}</p>`;
    const cls = b.kind === 'center' ? 'bayt center-pair' : b.kind === 'single' ? 'bayt single' : 'bayt';
    const ms = b.m.map((m, j) => `<span class="m m${j + 1}">${vtxt(m)}</span>`).join('');
    const tag = tappable ? 'button' : 'div';
    const num = b.kind === 'bayt' && b.m.length === 2 ? ` data-n="${String(++n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])}"` : '';
    const label = tappable ? ` aria-label="${b.m.map(vtxt).join('، ')}"` : '';
    return `<${tag} class="${cls}" data-i="${i}"${num}${label}${tappable ? ' type="button"' : ''}>${ms}</${tag}>`;
  }).join('');
}

// The poem page is a stack of cards: the chosen poem first, then the poems after it
// in the same book. Each card sticks once fully read and the next one slides over it.
let stackObs = null, stackRO = null, stackCleanup = null;
const cardCtx = new WeakMap();

// List marks: a bookmark if the poem is saved, a dot if it has been read.
function marksHTML(u, seen = history.seen()) {
  return (saved.has(u) ? `<i class="mk-save" title="نشان‌شده">${ICON.bookmark}</i>` : '')
    + (seen.has(u) ? '<i class="seen" title="خوانده‌شده"></i>' : '');
}
// Keep the list under the poem sheet in step when a poem is read or saved.
function refreshMarks(u) {
  const m = main.querySelector(`a[data-u="${CSS.escape(u)}"] .marks`);
  if (m) m.innerHTML = marksHTML(u);
}

function cardHTML(path, poem, poetN, cat, opts = {}) {
  const slug = path.split('/')[0], parent = parentOf(path);
  // Books inside books (سعدی › مواعظ › غزلیات): name the outer book too, or two «غزلیات» look the same.
  const outer = cat?._outer ? ` · <a href="${catHref(parentOf(parent))}">${esc(cat._outer)}</a>` : '';
  const bookLink = cat && parent.includes('/') ? `${outer} · <a href="${catHref(parent)}">${esc(cat.Title)}</a>` : '';
  const on = saved.has(path);
  return `<article class="pcard" data-path="${esc(path)}">
    <div class="poem-bar">
      <div class="grp">
        <button class="icon-btn save ${on ? 'on' : ''}" aria-label="نشان کردن" data-tip="نشان کردن" aria-pressed="${on}">${ICON.bookmark}</button>
        <button class="icon-btn share" aria-label="اشتراک‌گذاری" data-tip="اشتراک‌گذاری">${ICON.share}</button>
      </div>
      <button class="icon-btn pclose tip-l" aria-label="بستن" data-tip="بستن">${ICON.x}</button>
    </div>
    <header class="poem-head">
      ${opts.fal ? `<div class="fal-badge">${ICON.star}فال تو</div><br>` : ''}
      <span class="who"><a href="${catHref(slug)}">${esc(poetN)}</a>${bookLink}</span>
      <h2 class="ptitle">${esc(poem.Title)}</h2>
    </header>
    <div class="verses">${renderBlocks(blocks(poem))}</div>
    ${poem.PoemSummary ? `<details class="about ${opts.fal ? 'fal' : ''}" ${opts.fal ? 'open' : ''}><summary>${opts.fal ? 'تعبیر فال' : 'دربارهٔ این شعر'}${ICON.down}</summary><p>${esc(poem.PoemSummary.replace(/\s*\n\s*/g, ' '))}</p></details>` : ''}
    ${opts.fal ? `<div class="poem-actions"><a class="btn ghost" href="#/fal">فال دوباره</a></div>` : ''}
  </article>`;
}

function mountCard(stack, path, poem, poetN, cat, opts) {
  stack.insertAdjacentHTML('beforeend', cardHTML(path, poem, poetN, cat, opts));
  const card = stack.lastElementChild;
  const first = firstLines(poem, 1)[0];
  const meta = { url: path, title: poem.Title, poet: poetN, book: cat?.Title || '', line: first ? first.m.join(' / ') : '' };
  const ctx = { poem, bs: blocks(poem), meta };
  cardCtx.set(card, ctx);
  card.querySelector('.verses').addEventListener('click', (e) => {
    const b = e.target.closest('.bayt');
    if (b) openBayt(ctx, +b.dataset.i, b);
  });
  card.querySelector('.save').addEventListener('click', (e) => {
    const on = saved.toggle(meta);
    refreshMarks(path);
    e.currentTarget.classList.toggle('on', on);
    e.currentTarget.setAttribute('aria-pressed', on);
    toast(on ? 'به نشان‌ها اضافه شد' : 'از نشان‌ها برداشته شد');
  });
  card.querySelector('.share').addEventListener('click', () => openPoemShare(card, ctx, path));
  stretchCard(card);
  stackRO?.observe(card);
  stackObs?.observe(card);
  return card;
}

// Sticky offset: a short card sticks at the top; a tall one sticks once its end is on screen.
function placeCard(card) {
  const sh = card.closest('.psheet');
  const H = sh ? sh.clientHeight : innerHeight;
  card.style.top = Math.min(sh ? 0 : 22, H - card.offsetHeight - (sh ? 0 : 16)) + 'px';
}

/* The poem sheet rises from the bottom over the book's list; pull it down to close. */
let sheetEl = null, sheetPushed = false, sheetCat = '';
function closePoemSheet(instant) {
  if (!sheetEl) return;
  if (sheet.classList.contains('show')) { overlayForget(sheetBack); closeSheet(true); }
  stackCleanup?.();
  const el = sheetEl; sheetEl = null;
  document.body.classList.remove('psheet-open');
  if (instant) { el.remove(); refreshTopEdge(); return; }
  const sh = el.querySelector('.psheet'), bd = el.querySelector('.psheet-backdrop');
  sh.style.transform = sh.style.transition = '';
  bd.style.opacity = bd.style.transition = '';
  el.classList.remove('open');
  setTimeout(() => { el.remove(); refreshTopEdge(); }, 450);
}
// Put the green strip under the status bar back in place, so iPhone Safari takes it again as the page's top edge.
function refreshTopEdge() {
  const t = document.querySelector('.top-edge');
  if (t) { t.remove(); document.body.prepend(t); }
}
function requestCloseSheet() {
  if (!sheetEl) return;
  // Opened from search: go back to the page we were on, with the menu and its results open again.
  if (searchBack) {
    searchBack = false; sheetPushed = false;
    window.history.back();
    setTimeout(() => setMenu(true), 380);
    return;
  }
  if (sheetPushed) { sheetPushed = false; window.history.back(); return; }
  window.history.replaceState(window.history.state, '', catHref(sheetCat));
  current.view = 'cat'; current.path = sheetCat;
  closePoemSheet();
}
let activeCard = null;
function syncTools() {
  const b = sheetEl?.querySelector('.pt-save');
  if (!b || !activeCard) return;
  const on = activeCard.querySelector('.save').classList.contains('on');
  b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
}
function openSheetShell() {
  closePoemSheet(true);
  const el = document.createElement('div');
  el.className = 'psheet-wrap';
  el.innerHTML = `<div class="psheet-backdrop"></div>
    <section class="psheet" role="dialog" aria-modal="true" aria-label="شعر" tabindex="-1">
      <div class="psheet-grip" aria-label="بستن"><i></i></div>
      <div class="stack" id="stack"></div><div class="stack-end" id="stackEnd"></div>
    </section>
    <div class="psheet-tools">
      <button class="icon-btn pt-x tip-l" aria-label="بستن" data-tip="بستن">${ICON.x}</button>
      <button class="icon-btn pt-home" aria-label="خانه" data-tip="خانه">${ICON.home}</button>
      <button class="icon-btn pt-share" aria-label="اشتراک‌گذاری" data-tip="اشتراک‌گذاری">${ICON.share}</button>
      <button class="icon-btn pt-save" aria-label="نشان کردن" data-tip="نشان کردن">${ICON.bookmark}</button>
    </div>`;
  document.body.appendChild(el);
  sheetEl = el;
  document.body.classList.add('psheet-open');
  const sh = el.querySelector('.psheet');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
  el.querySelector('.psheet-backdrop').addEventListener('click', requestCloseSheet);
  el.querySelector('.psheet-grip').addEventListener('click', requestCloseSheet);
  sh.addEventListener('click', (e) => { if (e.target.closest('.pclose')) requestCloseSheet(); });
  // The three buttons above the sheet act on the poem being read.
  el.querySelector('.pt-x').addEventListener('click', requestCloseSheet);
  el.querySelector('.pt-home').addEventListener('click', () => { searchBack = false; sheetPushed = false; closePoemSheet(); location.hash = '#/'; });
  el.querySelector('.pt-share').addEventListener('click', () => activeCard?.querySelector('.share').click());
  el.querySelector('.pt-save').addEventListener('click', () => { activeCard?.querySelector('.save').click(); syncTools(); });
  // Pull down from the top of the sheet to close it; it follows the finger.
  attachSheetDrag({ el: sh, handle: () => el.querySelector('.psheet-grip'), backdrop: el.querySelector('.psheet-backdrop'), onClose: requestCloseSheet });
  return sh;
}

async function viewPoem(path, opts = {}, fromList = false) {
  const slug = path.split('/')[0];
  const parent = parentOf(path);
  const listPath = parent || slug;
  if (!fromList && main.dataset.cat !== listPath && main.dataset.cat !== `${listPath}/~other`) { await viewCat(listPath).catch(() => {}); current.view = 'poem'; current.path = path; }
  const [poem, poet, cat] = await Promise.all([getPoem(path), getPoet(slug).catch(() => null), getCat(parent).catch(() => null)]);
  if (cat && !cat._outer && parentOf(parent).includes('/')) cat._outer = await getCat(parentOf(parent)).then((c) => c.Title).catch(() => '');
  const poetN = poet?.Nickname || '';
  const list = cat?.Poems || [];
  let idx = list.findIndex((p) => clean(p.FullUrl) === path);

  const sh = openSheetShell();
  sheetCat = main.dataset.cat === `${listPath}/~other` ? main.dataset.cat : listPath;
  const stack = $('#stack'), end = $('#stackEnd');
  stackRO = new ResizeObserver((es) => es.forEach((en) => placeCard(en.target)));
  // The card nearest the top of the screen is the one being read: keep the address in step.
  stackObs = new IntersectionObserver((es) => {
    for (const en of es) {
      if (!en.isIntersecting) continue;
      const c = cardCtx.get(en.target);
      if (!c || current.view !== 'poem') continue;
      activeCard = en.target; syncTools();
      const want = poemHref(c.meta.url);
      if (location.hash !== want) { window.history.replaceState(window.history.state, '', want); current.path = c.meta.url; }
      document.title = `${c.meta.title} · ${c.meta.poet} · شعر پارسی`;
      history.add(c.meta); refreshMarks(c.meta.url);
    }
  }, { root: sh, rootMargin: '-45% 0px -50% 0px' });

  // Remember where the reader is (poem and the first couplet in view) for «ادامه خواندن» on the home page.
  let resumeT;
  const saveSpot = () => {
    const c = activeCard && cardCtx.get(activeCard);
    if (!c || current.view !== 'poem') return;
    const top = sh.getBoundingClientRect().top + 60;
    const el = [...activeCard.querySelectorAll('.verses [data-i]')].find((x) => x.getBoundingClientRect().bottom > top);
    const line = el ? (el.querySelector('.m') || el).textContent.trim() : '';
    try { localStorage.setItem('sp.resume', JSON.stringify({ url: c.meta.url, line, at: Date.now() })); } catch { /* ignore */ }
  };
  sh.onscroll = () => { sh.classList.toggle('scrolled', sh.scrollTop > 8); clearTimeout(resumeT); resumeT = setTimeout(saveSpot, 400); };

  activeCard = mountCard(stack, path, poem, poetN, cat, opts);
  activeCard.classList.add('fadein'); syncTools();
  if (!pendingFind) setTimeout(saveSpot, 600);
  findLine(activeCard, path);
  // Widths must be measured in the real font: stretch again once it has loaded.
  document.fonts?.load('350 20px Kahroba', 'ـبـ').then(() => document.fonts.ready).then(restretchSoon);
  history.add(cardCtx.get(stack.firstElementChild).meta); refreshMarks(cardCtx.get(stack.firstElementChild).meta.url);
  document.title = `${poem.Title} · ${poetN} · شعر پارسی`;

  // Load the following poems of the book as the reader nears the end of the stack.
  let busy = false, done = opts.fal || idx < 0;
  const more = new IntersectionObserver(async (es) => {
    if (!es[0].isIntersecting || busy || done) return;
    busy = true;
    try {
      const n = list[idx + 1];
      if (!n) { done = true; end.innerHTML = cat ? `<p>پایان ${esc(cat.Title)}</p>` : ''; return; }
      const u = clean(n.FullUrl);
      const p = await getPoem(u);
      if (current.view !== 'poem' || !stack.isConnected) return;
      idx++;
      mountCard(stack, u, p, poetN, cat, {});
    } catch { done = true; } finally { busy = false; if (!done && stack.isConnected) { more.unobserve(end); more.observe(end); } }
  }, { root: sh, rootMargin: '0px 0px 150% 0px' });
  more.observe(end);

  let t;
  const onResize = () => { clearTimeout(t); t = setTimeout(() => stack.querySelectorAll('.pcard').forEach((c) => { stretchCard(c); placeCard(c); }), 150); };
  addEventListener('resize', onResize);
  stackCleanup = () => { more.disconnect(); stackObs?.disconnect(); stackRO?.disconnect(); removeEventListener('resize', onResize); stackObs = stackRO = stackCleanup = null; };
}

/* Kashida: every misra of a poem is drawn to the width of its longest misra by
   stretching letter joins (tatweel), never by widening the spaces. */
// "About this poem" opens and closes with a gentle slide instead of a jump.
document.addEventListener('click', (e) => {
  const sum = e.target.closest('.pcard .about > summary');
  if (!sum) return;
  const d = sum.parentElement, p = d.querySelector('p');
  if (!p || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  e.preventDefault();
  if (d.dataset.anim) return;
  d.dataset.anim = '1';
  const opening = !d.open;
  if (opening) d.open = true;
  const h = p.offsetHeight, mt = parseFloat(getComputedStyle(p).marginTop);
  const shut = { height: '0px', marginTop: '0px', opacity: 0, transform: 'translateY(-6px)' };
  const full = { height: h + 'px', marginTop: mt + 'px', opacity: 1, transform: 'none' };
  p.style.overflow = 'hidden';
  const a = p.animate(opening ? [shut, full] : [full, shut], { duration: opening ? 420 : 300, easing: 'cubic-bezier(.22,1,.36,1)' });
  a.onfinish = a.oncancel = () => { if (!opening) d.open = false; p.style.overflow = ''; delete d.dataset.anim; };
});
// Vowel marks switched while a poem is open: redraw the verses where they are, without reopening the sheet.
function redrawVerses() {
  document.querySelectorAll('.pcard').forEach((card) => {
    const c = cardCtx.get(card);
    if (c) card.querySelector('.verses').innerHTML = renderBlocks(c.bs);
  });
  restretchSoon();
  main.querySelectorAll('.poems a.has-fl').forEach((a) => { a.classList.remove('has-fl'); a.querySelector('.fl').textContent = ''; });
  observeFirstLines();
}
let meter, restretchT;
// Text size changed: work the kashida out again for every poem card on screen.
function restretchSoon() {
  clearTimeout(restretchT);
  restretchT = setTimeout(() => document.querySelectorAll('.pcard').forEach((c) => { stretchCard(c); placeCard(c); }), 60);
}
function stretchCard(card) {
  const verses = card.querySelector('.verses');
  const ms = [...verses.querySelectorAll('.bayt .m')];
  if (!ms.length) return;
  if (!meter) { meter = document.createElement('span'); meter.className = 'kmeter'; }
  verses.style.removeProperty('font-size');
  verses.appendChild(meter);
  const wOf = (t) => { meter.textContent = t; return meter.getBoundingClientRect().width; };
  const measure = () => { for (const m of ms) { if (m.dataset.o == null) m.dataset.o = m.textContent; m.dataset.w = wOf(m.dataset.o); } return Math.max(...ms.map((m) => +m.dataset.w)); };
  let natural = measure();
  // Couplet numbers sit centred between the card edge and the start of the verses. When the verses are
  // long, they give way so the number keeps the same space on both sides (NUM_EDGE from the edge, NUM_EDGE to the text).
  const numbered = !!verses.querySelector('.bayt[data-n]');
  const pad = parseFloat(getComputedStyle(card).paddingRight) || 0;
  const NUM_W = 16, NUM_EDGE = 8, minGap = NUM_EDGE * 2 + NUM_W;
  const avail = Math.min(verses.clientWidth - 12, numbered ? verses.clientWidth - 2 * Math.max(0, minGap - pad) : Infinity);
  // A misra wider than the screen: shrink this poem until every misra fits on one line (Navid: never break).
  for (let k = 1, guard = 6; natural > avail && guard--;) {
    k *= Math.max(0.3, avail / natural - 0.005);
    verses.style.fontSize = `calc(var(--poem-size) * ${(1.1 * k).toFixed(4)})`;
    natural = measure();
  }
  const tw = wOf('ـ'.repeat(10)) / 10;
  const pairGap = 48;
  const twoCol = innerWidth >= 760 && natural * 2 + pairGap <= avail;
  const W = Math.ceil(Math.min(natural, twoCol ? (avail - pairGap) / 2 : avail));
  card.classList.toggle('two-col', twoCol);
  // The notes under the poem are exactly as wide as the verses above them.
  card.style.setProperty('--vw', (twoCol ? W * 2 + pairGap : W) + 'px');
  if (numbered) {
    const gap = pad + (verses.clientWidth - (twoCol ? W * 2 + pairGap : W)) / 2; // card edge to where the verses start
    card.style.setProperty('--nr', (gap / 2 - pad - NUM_W / 2).toFixed(1) + 'px');
  }
  // In em, so the line width follows the text if its size changes before the next pass.
  verses.style.setProperty('--mw', (W / parseFloat(getComputedStyle(verses).fontSize)).toFixed(4) + 'em');
  for (const m of ms) {
    const w = +m.dataset.w;
    if (w > W) { m.textContent = m.dataset.o; m.classList.add('wraps'); continue; }
    m.classList.remove('wraps');
    let n = Math.floor((W - w) / tw);
    let t = withKashida(m.dataset.o, n);
    while (n > 0 && wOf(t) > W) t = withKashida(m.dataset.o, --n);
    m.textContent = t;
  }
  meter.remove();
}

async function copy(t) {
  try { await navigator.clipboard.writeText(t); return true; } catch {
    const a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select();
    try { document.execCommand('copy'); } catch { /* ignore */ } a.remove(); return true;
  }
}

// Share a whole poem: send the link, copy the text, or make a story image around the part being read.
function openPoemShare(card, ctx, path) {
  const { poem, bs, meta } = ctx;
  const strip = (m) => (settings.get().harakat ? m : m.replace(HARAKAT, ''));
  const idx = bs.map((b, i) => (b.m ? i : -1)).filter((i) => i >= 0);
  const groups = idx.map((i) => bs[i].m.map(strip));
  const url = `${location.origin}${location.pathname}#/p/${path}`;
  const full = `${groups.map((g) => g.filter(Boolean).join('\n')).join('\n\n')}\n\n${meta.poet} · ${poem.Title}`;
  openSheet(`
    <div class="actions">
      <button id="pSend">${ICON.share}ارسال</button>
      <button id="pCopy">${ICON.copy}کپی</button>
      ${groups.length ? `<button id="pShot">${ICON.image}اسکرین‌شات</button>` : ''}
    </div>`, (s) => {
    s.querySelector('#pSend').addEventListener('click', async () => {
      const text = `${poem.Title} · ${meta.poet}\n${meta.line}`;
      if (navigator.share) { try { await navigator.share({ title: poem.Title, text, url }); } catch { /* cancelled */ } }
      else { await copy(`${text}\n${url}`); toast('نشانی کپی شد'); }
    });
    s.querySelector('#pCopy').addEventListener('click', async () => { await copy(full); toast('شعر کپی شد'); closeSheet(); });
    s.querySelector('#pShot')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      // The couplet nearest the middle of the screen is the centre of the picture.
      const mid = innerHeight / 2;
      let best = 0, dist = Infinity;
      card.querySelectorAll('.bayt[data-i]').forEach((el) => {
        const r = el.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < dist) { dist = d; best = +el.dataset.i; }
      });
      const focus = Math.max(0, idx.indexOf(best));
      const dark = getComputedStyle(document.documentElement).colorScheme === 'dark';
      const blob = await poemImage({ groups, focus, poet: meta.poet, title: meta.title, dark });
      const r = await shareBlob(blob, `poem-${meta.url.replace(/\//g, '-')}.png`, `${meta.poet} · ${poem.Title}`);
      btn.disabled = false;
      if (r === 'downloaded') toast('تصویر ذخیره شد');
    });
  });
}

function openBayt(ctx, i, el) {
  const { bs, meta } = ctx;
  const b = bs[i];
  if (!b || !b.m) return;
  el.classList.add('lit');
  const plain = b.m.map((m) => (settings.get().harakat ? m : m.replace(HARAKAT, '')));
  openSheet(`
    <div class="q">${plain.map((m) => `<span class="m">${esc(m)}</span>`).join('')}</div>
    ${b.sum ? `<div class="meaning"><b>معنی بیت</b><p>${esc(b.sum.trim())}</p></div>` : ''}
    <div class="actions four">
      <button id="bSave" aria-pressed="${bayts.has(meta.url, i)}">${ICON.bookmark}<span>${bayts.has(meta.url, i) ? 'نشان‌شده' : 'نشان کردن'}</span></button>
      <button id="bCopy">${ICON.copy}کپی</button>
      <button id="bImg">${ICON.image}تصویر برای استوری</button>
      <button id="bShare">${ICON.share}ارسال متن</button>
    </div>`, (s) => {
    fitQuote(s.querySelector('.q'));
    const text = `${plain.join('\n')}\n— ${meta.poet}`;
    s.querySelector('#bSave').addEventListener('click', (e) => {
      const on = bayts.toggle({ url: meta.url, i, lines: b.m, title: meta.title, poet: meta.poet });
      e.currentTarget.setAttribute('aria-pressed', on);
      e.currentTarget.querySelector('span').textContent = on ? 'نشان‌شده' : 'نشان کردن';
      toast(on ? 'بیت نشان شد' : 'نشان بیت برداشته شد');
    });
    s.querySelector('#bCopy').addEventListener('click', async () => { await copy(text); toast('بیت کپی شد'); closeSheet(); });
    s.querySelector('#bShare').addEventListener('click', async () => {
      if (navigator.share) { try { await navigator.share({ text }); } catch { /* cancelled */ } } else { await copy(text); toast('بیت کپی شد'); }
    });
    s.querySelector('#bImg').addEventListener('click', async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      const dark = getComputedStyle(document.documentElement).colorScheme === 'dark';
      const blob = await baytImage({ lines: plain, poet: meta.poet, title: meta.title, dark });
      const r = await shareBlob(blob, `bayt-${meta.url.replace(/\//g, '-')}.png`, text);
      btn.disabled = false;
      if (r === 'downloaded') toast('تصویر ذخیره شد');
    });
  });
}

// The couplet in its sheet: a long misra shrinks the type instead of breaking onto two lines.
function fitQuote(q) {
  if (!q) return;
  const ms = [...q.querySelectorAll('.m')];
  ms.forEach((m) => { m.style.whiteSpace = 'nowrap'; });
  const room = q.clientWidth - 16;
  const widest = Math.max(...ms.map((m) => { m.style.display = 'inline-block'; const w = m.scrollWidth; m.style.display = ''; return w; }));
  if (widest > room && room > 0) {
    const k = room / widest - 0.01;
    q.style.fontSize = `calc(var(--poem-size) * ${(1.02 * k).toFixed(3)})`;
  }
}

function viewFal() {
  main.innerHTML = `${pageClose()}<div class="fal-page fadein">
    <div class="fal-orb" id="orb">${ICON.lantern}</div>
    <h1>فال حافظ</h1>
    <p>چشم‌ها را ببند، نیتی در دل کن و وقتی آماده بودی دیوان را بگشا.</p>
    <button class="btn" id="open">بگشا</button>
    <blockquote>ای حافظ شیرازی، تو محرم هر رازی</blockquote>
  </div>`;
  wireClose('pageX');
  $('#open').addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    $('#orb').classList.add('opening');
    const wait = new Promise((r) => setTimeout(r, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1500));
    try {
      const [pick] = await Promise.all([randomFrom('hafez/ghazal'), wait]);
      falNext = clean(pick.FullUrl);
      location.hash = poemHref(pick.FullUrl);
    } catch {
      $('#orb').classList.remove('opening'); e.currentTarget.disabled = false;
      toast('برای گرفتن فال به اینترنت نیاز است');
    }
  });
}
let falNext = null;

let savedTab = 'poems', savedSort = 'time';
function viewSaved() {
  const EMPTY = {
    poems: [ICON.bookmark, 'هنوز شعری نشان نکرده‌ای', 'هر جا شعری به دلت نشست، نشانه‌ی بالای صفحه را بزن.'],
    bayts: [ICON.bookmark, 'هنوز بیتی نشان نکرده‌ای', 'روی هر بیت بزن و «نشان کردن» را انتخاب کن.'],
    history: [ICON.clock, 'هنوز شعری نخوانده‌ای', 'شعرهایی که می‌خوانی اینجا می‌مانند.'],
  };
  const item = (x) => {
    if (savedTab === 'bayts') {
      return `<li class="saved-item bayt-item"><a href="${poemHref(x.url)}" data-url="${esc(x.url)}" data-line="${esc(x.lines[0])}">
        <span class="q">${x.lines.map((m) => `<span class="m">${txt(m)}</span>`).join('')}</span>
        <span class="s">${esc(x.title)}${savedSort === 'poet' ? '' : ` · ${esc(x.poet)}`}</span></a>
        <button class="icon-btn on" data-rmb="${esc(x.url)}" data-i="${x.i}" aria-label="برداشتن">${ICON.bookmark}</button></li>`;
    }
    return `<li class="saved-item"><a href="${poemHref(x.url)}">
      ${x.line ? `<span class="q">${txt(x.line.split(' / ')[0])}</span>` : ''}
      <span class="s">${esc(x.title)}${savedSort === 'poet' ? '' : ` · ${esc(x.poet)}`}</span></a>
      ${savedTab === 'poems' ? `<button class="icon-btn on" data-rm="${esc(x.url)}" aria-label="برداشتن">${ICON.bookmark}</button>` : ''}</li>`;
  };
  const draw = () => {
    const list = savedTab === 'poems' ? saved.all() : savedTab === 'bayts' ? bayts.all() : history.all();
    let html;
    if (!list.length) {
      const [ic, t, d] = EMPTY[savedTab];
      html = `<li class="empty-state">${ic}<b>${t}</b>${d}</li>`;
    } else if (savedSort === 'poet') {
      const groups = new Map();
      list.forEach((x) => { const k = x.poet || ''; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(x); });
      html = [...groups.keys()].sort((p, q) => p.localeCompare(q, 'fa')).map((k) =>
        `<li class="saved-group">${esc(k)}<small>${fa(groups.get(k).length)}</small></li>${groups.get(k).map(item).join('')}`).join('');
    } else html = list.map(item).join('');
    $('#sl').innerHTML = html;
    document.querySelector('#ssort [data-o="time"]').textContent = savedTab === 'history' ? 'زمان خواندن' : 'زمان نشان کردن';
    document.querySelectorAll('#stabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.t === savedTab));
    document.querySelectorAll('#ssort button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.o === savedSort));
  };
  main.innerHTML = `${pageClose('sX')}<div class="wrap fadein"><div class="page-title"><h1>نشان‌ها</h1></div>
    <div class="tabs" id="stabs" role="tablist"><button role="tab" data-t="poems">شعرها</button><button role="tab" data-t="bayts">بیت‌ها</button><button role="tab" data-t="history">خوانده‌ها</button></div>
    <div class="sort-row" id="ssort"><span>ترتیب:</span><button data-o="time">زمان نشان کردن</button><button data-o="poet">شاعر</button></div>
    <ul class="saved-list" id="sl"></ul></div>`;
  wireClose('sX');
  document.querySelectorAll('#stabs button').forEach((b) => b.addEventListener('click', () => { savedTab = b.dataset.t; draw(); }));
  document.querySelectorAll('#ssort button').forEach((b) => b.addEventListener('click', () => { savedSort = b.dataset.o; draw(); }));
  $('#sl').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]'), rmb = e.target.closest('[data-rmb]');
    if (rm) { e.preventDefault(); saved.remove(rm.dataset.rm); draw(); toast('برداشته شد'); return; }
    if (rmb) { e.preventDefault(); bayts.remove(rmb.dataset.rmb, +rmb.dataset.i); draw(); toast('برداشته شد'); return; }
    const a = e.target.closest('a[data-line]');
    if (a) pendingFind = { url: a.dataset.url, line: a.dataset.line };
  });
  draw();
}

/* Backup: carry bookmarks, reading history, chosen poets and settings to another device as one file. */
function openBackup() {
  const n = (k) => fa(k.length);
  openSheet(`
    <h3>پشتیبان</h3>
    <div class="about">
      <p>همهٔ نشان‌ها (${n(saved.all())} شعر، ${n(bayts.all())} بیت)، خوانده‌ها، شاعران انتخابی و تنظیمات در یک فایل. این فایل را روی گوشی یا رایانهٔ دیگر بارگذاری کن تا همه‌چیز آنجا هم باشد.</p>
    </div>
    <div class="actions two">
      <button id="bkOut">${ICON.down}گرفتن فایل</button>
      <button id="bkIn">${ICON.cloud}بارگذاری فایل</button>
    </div>
    <input type="file" id="bkFile" accept=".json,application/json" hidden>`, (s) => {
    s.querySelector('#bkOut').addEventListener('click', async () => {
      const d = new Date(), name = `sher-parsi-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}.json`;
      const blob = new Blob([JSON.stringify(exportData())], { type: 'application/json' });
      const file = new File([blob], name, { type: 'application/json' });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare?.({ files: [file] })) {
        try { await navigator.share({ files: [file] }); return; } catch (e) { if (e.name === 'AbortError') return; }
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('فایل پشتیبان ذخیره شد');
    });
    const inp = s.querySelector('#bkFile');
    s.querySelector('#bkIn').addEventListener('click', () => inp.click());
    inp.addEventListener('change', async () => {
      const f = inp.files[0];
      if (!f) return;
      try {
        importData(JSON.parse(await f.text()));
        toast('بارگذاری شد');
        setTimeout(() => location.reload(), 700);
      } catch { toast('این فایل پشتیبان شعر پارسی نیست'); }
      inp.value = '';
    });
  });
}

/* ───────── Router ───────── */
const current = { view: '', path: '' };
function rerender() { route(true); }
// Each history entry remembers how far its page was scrolled (and how long its list had grown),
// so coming back with the back button lands on the same row instead of the top.
try { window.history.scrollRestoration = 'manual'; } catch { /* old browser */ }
const scrollMemo = new Map();
let pageId = '', pageSeq = 0, restoreShown = 0;

async function route(keepScroll = false) {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [head, ...rest] = h.split('/');
  const path = clean(rest.join('/'));
  const view = head === 'p' ? 'poem' : head === 'c' ? 'cat' : head || 'home';
  const y = window.scrollY;
  if (!keepScroll && pageId) scrollMemo.set(pageId, { y, shown: document.querySelectorAll('#pm > li').length });
  let st = window.history.state;
  if (!st || !st.pg) { st = { ...(st || {}), pg: `${Date.now()}-${++pageSeq}` }; window.history.replaceState(st, ''); }
  const memo = keepScroll ? null : scrollMemo.get(st.pg);
  pageId = st.pg; restoreShown = keepScroll ? document.querySelectorAll('#pm > li').length : memo?.shown || 0;
  const listBefore = main.dataset.cat;
  current.view = view; current.path = path;
  document.title = 'شعر پارسی';
  const navKey = { home: 'home', poets: 'poets', cat: 'poets', fal: 'fal', saved: 'saved', poem: falNext === path ? 'fal' : '' }[view];
  document.querySelectorAll('.mx-nav a').forEach((a) => (a.dataset.nav === navKey ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  if (view !== 'poem') closePoemSheet(true);
  if (view !== 'poem' && view !== 'poets') document.body.classList.remove('poet-bg');
  if (view !== 'poem') searchBack = false;
  try {
    if (view === 'home') { main.innerHTML = ''; mountWall(); } else unmountWall();
    if (view === 'home') { /* the wall is the home page */ }
    else if (view === 'poets') await viewPoets();
    else if (view === 'fal') viewFal();
    else if (view === 'saved') viewSaved();
    else if (view === 'cat' && path) await viewCat(path);
    else if (view === 'poem' && path) await viewPoem(path, { fal: falNext === path });
    else location.hash = '#/';
  } catch (e) { failed(e, () => route()); }
  if (view === 'poem' && falNext !== path) falNext = null;
  // A poem opened over the very list that was on screen (e.g. from search): leave the list where it was.
  const sameList = view === 'poem' && listBefore && main.dataset.cat === listBefore;
  window.scrollTo(0, keepScroll || (sameList && !memo) ? y : memo?.y || 0);
  if (!keepScroll) main.focus({ preventScroll: true });
}
// Site version, shown very small in the bottom-right corner, in the menu and in «درباره». Bump it with each release.
export const VERSION = '0.9.87';
{
  const v = document.createElement('div');
  v.className = 'site-ver'; v.setAttribute('aria-hidden', 'true');
  v.textContent = 'نسخه ' + fa(VERSION);
  document.body.appendChild(v);
  $('#mxVer').textContent = 'شعر پارسی · ' + v.textContent + ' · برگرفته از گنجور';
}
let navCount = 0; // in-app navigations this visit, so "close" can step back safely
window.addEventListener('hashchange', () => {
  navCount++;
  // Back from an open poem to its own list: just lower the sheet, keep the list where it was.
  if (sheetEl && location.hash === catHref(sheetCat)) {
    sheetPushed = false; current.view = 'cat'; current.path = sheetCat;
    if (window.history.state?.pg) pageId = window.history.state.pg;
    closePoemSheet();
    return;
  }
  route();
});
// Tapping a poem in a list opens it over the list instead of on a new page.
main.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#/p/"]');
  if (!a || current.view !== 'cat' || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault();
  const href = a.getAttribute('href');
  const path = clean(decodeURIComponent(href.slice(4)));
  window.history.pushState(null, '', href);
  sheetPushed = true;
  current.view = 'poem'; current.path = path;
  viewPoem(path, {}, true).catch(() => { toast('شعر باز نشد'); requestCloseSheet(); });
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheetEl && !sheet.classList.contains('show')) requestCloseSheet(); }, true);

document.fonts?.addEventListener?.('loadingdone', restretchSoon);

/* ───────── Boot ───────── */
apply();
route();
if ('serviceWorker' in navigator && location.protocol !== 'file:' && !document.querySelector('meta[name="sp-no-sw"]')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

/* Opening card: show the name for a moment, then fade it out. */
{
  const sp = document.getElementById('splash');
  if (sp && document.documentElement.classList.contains('no-splash')) sp.remove();
  else if (sp) {
    // Keep the name clear of the card's edges: first take out stretch (kashida), then shrink the type.
    const box = sp.querySelector('.splash-box'), t = box.querySelector('b'), full = t.textContent;
    const fit = () => {
      const room = box.clientWidth * 0.78;
      t.textContent = full; t.style.fontSize = '';
      let guard = 40;
      while (t.scrollWidth > room && guard--) {
        const runs = t.textContent.match(/ـ+/g);
        if (runs) { const longest = runs.reduce((a, b) => (b.length > a.length ? b : a)); t.textContent = t.textContent.replace(longest, longest.slice(1)); }
        else t.style.fontSize = `${parseFloat(getComputedStyle(t).fontSize) * 0.94}px`;
      }
    };
    fit(); document.fonts?.ready.then(fit);
    setTimeout(() => { sp.classList.add('out'); setTimeout(() => { sp.remove(); logoHint(); }, 800); }, 1500);
  }
}

/* On the home page, once per load: a black bubble under the logo pointing at it, then gone. */
function logoHint() {
  const logo = [...document.querySelectorAll('.menu-trigger')].find((b) => b.getBoundingClientRect().width > 0);
  if (!logo || current.view !== 'home' || menu.classList.contains('open')) return;
  const r = logo.getBoundingClientRect();
  const tip = document.createElement('div');
  tip.className = 'logo-hint'; tip.setAttribute('role', 'status'); tip.textContent = 'پیکربندی اینجاست';
  document.body.appendChild(tip);
  const w = tip.offsetWidth, cx = r.left + r.width / 2;
  const left = Math.max(12, Math.min(innerWidth - w - 12, cx - w / 2));
  tip.style.left = `${left}px`; tip.style.top = `${r.bottom + 12}px`;
  tip.style.setProperty('--ax', `${cx - left}px`);
  requestAnimationFrame(() => tip.classList.add('show'));
  const bye = () => { tip.classList.remove('show'); setTimeout(() => tip.remove(), 400); };
  const t = setTimeout(bye, 4500);
  logo.addEventListener('click', () => { clearTimeout(t); bye(); }, { once: true });
}
