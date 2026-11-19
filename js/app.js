import { getManifest, getPoet, getCat, getPoem, parentOf, clean, blocks, FEATURED, DAILY_POOL, TOP, NAMES, NICK, portrait, shelf, shelfHTML, savePoet, isPoetSaved, saveBook, isBookSaved, unsaveBook, unsavePoet, setBookSaved, coverHTML, CENTURIES } from './data.js';
import { settings, apply, onDeviceTheme, saved, history, bayts, books, doneBooks, readPoems, exportData, importData } from './store.js';

import { baytImage, poemImage, shareBlob, withKashida } from './share.js';
import { search, highlight, norm as searchNorm } from './search.js';
import { mountWall, unmountWall, wallChoice, setWallChoice } from './wall.js';
import { attachSheetDrag } from './sheetdrag.js';
import { ms } from './icons.js';
import { overlayOpened, overlayClosed, overlayNavigate, overlayIsOpen, overlaySwap, overlayForget } from './overlay.js';

const $ = (s, el = document) => el.querySelector(s);
const main = $('#main');
const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
// Some source texts put a space before a vowel mark ("کشتی ِ"); join the mark back to its letter.
const esc = (s) => String(s ?? '').replace(/\s+(?=[\u064B-\u065F\u0670])/g, '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const HARAKAT = /[ً-ْٰ]/g;
const txt = (s) => esc(settings.get().harakat ? s : String(s).replace(HARAKAT, ''));
const vtxt = txt;

// Book bookmarks: the ribbon on every cover toggles it; saved books show under «کتابخانهٔ من» › «کتاب‌ها».
setBookSaved((href) => books.has(href));
function toggleBook(el) {
  const on = books.toggle({ href: el.dataset.href, title: el.dataset.title, author: el.dataset.author, d: +el.dataset.d, p: +el.dataset.p });
  document.querySelectorAll('.bk-mark').forEach((m) => { if (m.dataset.href === el.dataset.href) { m.classList.toggle('on', on); m.setAttribute('aria-pressed', on); } });
  toast(on ? 'کتاب نشان شد' : 'نشان کتاب برداشته شد');
  if (!on && current.view === 'saved' && savedTab === 'books') viewSaved();
}
// Cover art is drawn by js/covers/, loaded the first time a page shows a cover.
let coverJob = 0;
function paintCovers() {
  coverJob = 0;
  const els = document.querySelectorAll('.cover .art:empty');
  if (els.length) import('./covers/covergen.js').then((m) => els.forEach((el) => { if (!el.firstChild) m.paint(el); }));
}
new MutationObserver(() => { if (!coverJob) coverJob = requestAnimationFrame(paintCovers); }).observe(document.body, { childList: true, subtree: true });
document.addEventListener('click', (e) => {
  const m = e.target.closest('.bk-mark');
  if (!m) return;
  e.preventDefault(); e.stopPropagation(); toggleBook(m);
}, true);
document.addEventListener('keydown', (e) => {
  const m = e.target.closest?.('.bk-mark');
  if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); toggleBook(m); }
}, true);

// Story images: the poet's dark portrait when there is one.
const storyPic = (url) => { const s = clean(url).split('/')[0]; return TOP.includes(s) ? `img/poets/${s}-dark.webp` : null; };
// «معنی بیت» from the commentaries comes with editor marks: a second explanation in { }, word glosses in [ a = b / c = d ],
// and «- منبع: …» at the end. Shown as plain paragraphs, a word list and a small source line (Navid 2026-11-18).
function meaningHTML(raw) {
  let t = String(raw).replace(/ /g, ' ').trim();
  let src = '';
  const sm = t.match(/[\s\-–—]*منبع\s*:\s*([^{}\[\]]+?)\s*\}?\s*$/);
  if (sm) { src = sm[1].trim(); t = t.slice(0, sm.index).trim(); }
  const gloss = [];
  const takeGloss = (inner) => inner.split(/\s\/\s/).forEach((part) => {
    const m = part.match(/^\s*(.+?)\s*=\s*(.+?)\s*$/);
    if (m) gloss.push([m[1], m[2]]); else if (part.trim()) gloss.push(['', part.trim()]);
  });
  // [ … = … ] blocks are glossaries; other [ … ] (editor insertions) stay in the text.
  t = t.replace(/\[([^\[\]]*=[^\[\]]*)\]/g, (_, inner) => { takeGloss(inner); return ' '; });
  // { … } (closed or running to the end) is a second explanation.
  const paras = [];
  t.split(/[{}]/).map((x) => x.trim()).filter(Boolean).forEach((p) => {
    // A part made only of «a = b / c = d» items is a glossary too.
    if (/=/.test(p) && p.split(/\s\/\s/).every((q) => /=/.test(q))) takeGloss(p);
    else paras.push(p.replace(/\s{2,}/g, ' ').replace(/\s+([.،؟!])/g, '$1'));
  });
  return paras.map((p) => `<p>${esc(p)}</p>`).join('')
    + (gloss.length ? `<ul class="gloss">${gloss.map(([w, m]) => `<li>${w ? `<b>${esc(w)}</b>: ` : ''}${esc(m)}</li>`).join('')}</ul>` : '')
    + (src ? `<small class="m-src">منبع: ${esc(src)}</small>` : '');
}
const ICON = {
  chev: ms('chevron_left', 'chev'),
  back: ms('chevron_right'),
  next: ms('chevron_left'),
  bookmark: ms('bookmark', 'tog', 'bookmark_fill'),
  share: ms('ios_share'),
  copy: ms('content_copy'),
  image: ms('image'),
  down: ms('expand_more'),
  download: ms('download'),
  cloud: ms('upload'),
  x: ms('close'),
  dots: ms('more_horiz', 'dots3'),
  user: ms('person'),
  trash: ms('delete'),
  home: ms('home'),
  check: ms('check'),
  search: ms('search'),
  star: ms('star'),
  shuffle: ms('shuffle'),
  clock: ms('history'),
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
// Home search button: opens the menu with the cursor already in the search box.
document.addEventListener('click', (e) => { if (e.target.closest('.w-search:not(.w-lib)')) { e.preventDefault(); location.hash = '#/search'; } });
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
// «شعر تصادفی»: the poem opens as a sheet over whatever page is on screen; closing it leaves you exactly there (Navid 2026-11-19).
$('#mxRandom').addEventListener('click', () => { setMenu(false, true); randomPoem((h) => { overlayForget(menuBack); openPoemOver(h, true); }); });
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
  settings.set({ theme: dark ? 'dark' : 'light', themeChosen: true }); syncMenuSettings(); swapPortraits(dark);
});
function swapPortraits(dark) {
  document.querySelectorAll('img.poet-pic, img.pl-face').forEach((im) => { im.src = im.src.replace(/(-dark)?\.webp/, dark ? '-dark.webp' : '.webp'); });
  document.querySelectorAll('img.w-lb-face').forEach((im) => { im.src = im.src.replace(/(-dark)?\.webp/, dark ? '.webp' : '-dark.webp'); });
}
onDeviceTheme((dark) => { syncMenuSettings(); swapPortraits(dark); });
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

/* Search page (from the home search button): the same search as the menu, on its own page.
   The query and results are kept, so closing a poem opened from here comes back to them. */
let pageQuery = '', pageSeq2 = 0;
function viewSearch() {
  main.innerHTML = `${pageClose()}<div class="wrap fadein">
    <div class="page-title"><h1>جست‌وجو</h1></div>
    <div class="search"><label>${ICON.search}<input type="search" id="sq" placeholder="جست‌وجو در همهٔ اشعار" autocomplete="off" enterkeyhint="search" aria-label="جست‌وجو در اشعار"></label></div>
    <div id="sRes" class="s-res"></div></div>`;
  wireClose('pageX');
  const q = $('#sq'), res = $('#sRes');
  q.value = pageQuery;
  let t, more = null;
  const onScroll = () => { if (more && innerHeight + scrollY > document.body.scrollHeight - 300) more(); };
  window.addEventListener('scroll', onScroll, { passive: true });
  const stop = new MutationObserver(() => { if (!res.isConnected) { window.removeEventListener('scroll', onScroll); stop.disconnect(); } });
  stop.observe(main, { childList: true });
  const run = async () => {
    const raw = q.value, seq = ++pageSeq2; pageQuery = raw; more = null;
    if (!raw.trim()) { res.innerHTML = ''; return; }
    res.innerHTML = '<p class="mx-note">در حال جست‌وجو…</p>';
    let r;
    getManifest().catch(() => {});
    try { r = await search(raw); } catch { if (seq === pageSeq2) res.innerHTML = '<p class="mx-note">جست‌وجو نیاز به اینترنت دارد</p>'; return; }
    if (seq !== pageSeq2) return;
    if (r.status === 'short') { res.innerHTML = '<p class="mx-note">عبارت را کمی کامل‌تر بنویس؛ واژه‌های خیلی رایج مثل «دل» یا «که» به‌تنهایی جست‌وجو نمی‌شوند.</p>'; return; }
    if (r.status === 'none') { res.innerHTML = '<p class="mx-note">چیزی پیدا نشد</p>'; return; }
    res.innerHTML = '<ul class="mx-list"></ul><p class="mx-note mx-wait">…</p>';
    const ul = res.querySelector('ul'), wait = res.querySelector('.mx-wait');
    let busy = false, count = 0;
    const page = async () => {
      if (busy) return; busy = true;
      try {
        const { items, done } = await r.more(count ? 30 : 20);
        if (seq !== pageSeq2) return;
        count += items.length;
        ul.insertAdjacentHTML('beforeend', items.map((it) =>
          `<li><a href="${poemHref(it.url)}" data-url="${esc(clean(it.url))}" data-line="${esc(it.text)}"><span class="mx-l">${highlight(it.text, r.words, r.typing, esc)}</span><small>${esc(POET_NAME(it.poet))} · ${esc(it.title)}</small></a></li>`).join(''));
        if (done) { more = null; wait.textContent = count ? '' : 'چیزی پیدا نشد'; wait.hidden = !!count; }
        else { more = page; wait.textContent = '…'; if (document.body.scrollHeight <= innerHeight + 300) setTimeout(page, 0); }
      } catch { if (seq === pageSeq2) wait.textContent = 'اتصال برقرار نشد'; }
      finally { busy = false; }
    };
    page();
  };
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 260); });
  q.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); clearTimeout(t); run(); q.blur(); } });
  res.addEventListener('click', (e) => { const a = e.target.closest('a[data-line]'); if (a) pendingFind = { url: a.dataset.url, line: a.dataset.line }; });
  if (pageQuery) run(); else setTimeout(() => q.focus({ preventScroll: true }), 60);
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
      <p>شعر پارسی ساده ساخته شده تا فقط شعر بخوانی، بی‌شلوغی و بی‌حواس‌پرتی. شعر سخنوران دلخواهت را دانلود کن تا بدون اینترنت هم همیشه در گوشی‌ات باشد و هر جا که هستی به‌راحتی بخوانی. هر بیتی را که دوست داری نشان کن تا بماند، یا از آن تصویری بساز و با دیگران به اشتراک بگذار.</p>
      <p>متن همهٔ اشعار از <a href="https://ganjoor.net" target="_blank" rel="noopener">گنجور</a> گرفته شده است. سپاس از گنجور و همهٔ کسانی که این گنجینه را گرد آورده‌اند.</p>
      <p>برای نصب روی گوشی: در سافاری دکمهٔ اشتراک‌گذاری و سپس «افزودن به صفحهٔ اصلی» را بزن؛ در کروم از منوی سه‌نقطه «نصب برنامه» را انتخاب کن.</p>
      <p>قلم این سایت «کهربا» از <a href="https://fontiran.com/license/YVO2HC8R" target="_blank" rel="noopener">فونت ایران</a> است و به صورت قانونی و با مجوز استفاده می‌شود.</p>
      <a class="font-badge" href="https://fontiran.com/license/YVO2HC8R" target="_blank" rel="noopener"><img src="https://fontiran.com/storage/uploads/images/2025/11/badge2-minjcHOH8rKPv7J.png" width="100" height="100" alt="فونت کهربا" loading="lazy"></a>
      <p class="muted">نسخهٔ ${fa(VERSION)}</p>
      <p class="about-credit">ساختهٔ نوید برهمند · <a href="https://berahmand.com" target="_blank" rel="noopener" dir="ltr">Berahmand.com</a></p>
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
function crumbs(parts) {
  return `<nav class="crumbs" aria-label="مسیر">${parts.map((p, i) =>
    (i ? '<span class="sep">›</span>' : '') + (p.href ? `<a href="${p.href}">${esc(p.t)}</a>` : `<span>${esc(p.t)}</span>`)).join('')}</nav>`;
}
async function poetName(slug) {
  try { return (await getPoet(slug)).Nickname; } catch { return ''; }
}
const catHref = (u) => `#/c/${clean(u)}`;
// Poet squares (poets page and «کتابخانهٔ من» › «سخنوران»): portrait, name, and the book ribbon at the top left.
// A marked (red) poet shows on the home wall (Navid 2026-11-19); the mark is the wall choice (sp.wall).
const POET_RIBBON = '<svg viewBox="0 0 14 22" aria-hidden="true"><path d="M1 0v20.5l6-4.6 6 4.6V0"/></svg>';
function poetTile(slug, name, marked, extra = '') {
  const dark = settings.get().theme === 'dark';
  return `<li class="pt"><a href="#/c/${esc(slug)}"><span class="pt-pic"><img class="pl-face" src="${esc(portrait(slug, dark))}" alt="" width="1024" height="1024" loading="lazy" decoding="async"></span><b>${esc(name)}</b></a>${extra}`
    + `<span class="pt-mark${marked ? ' on' : ''}" role="button" tabindex="0" aria-pressed="${marked}" aria-label="نشان کردن سخنور" data-slug="${esc(slug)}">${POET_RIBBON}</span></li>`;
}
function togglePoetMark(slug) {
  const keep = new Set(wallChoice());
  const on = !keep.has(slug);
  if (on) keep.add(slug); else keep.delete(slug);
  if (!keep.size) { toast('دست‌کم یک سخنور در خانه می‌ماند'); return; }
  setWallChoice([...keep]);
  document.querySelectorAll('.pt-mark').forEach((m) => { if (m.dataset.slug === slug) { m.classList.toggle('on', on); m.setAttribute('aria-pressed', on); } });
  toast(on ? 'سخنور نشان شد و در خانه می‌آید' : 'نشان سخنور برداشته شد');
  if (!on && current.view === 'saved' && savedTab === 'poets') viewSaved();
}
document.addEventListener('click', (e) => {
  const m = e.target.closest('.pt-mark');
  if (!m) return;
  e.preventDefault(); e.stopPropagation(); togglePoetMark(m.dataset.slug);
}, true);
// «کتابخانهٔ من»: under each book and poet, the reading percent (poems opened / poems in it) and the offline cloud.
// cat = the book's category url (or the poet's slug); other = the poet's loose poems («سایر اشعار»), only the top category's own poems.
function libMeta(cat, other = false, info = {}) {
  cat = clean(cat);
  const book = info.kind !== 'poet';
  const saved = book ? isBookSaved(cat) : isPoetSaved(cat);
  const data = Object.entries({ kind: book ? 'book' : 'poet', href: info.href || '', title: info.title || '', author: info.author || '', where: info.where || 'lib' }).map(([k, v]) => ` data-${k}="${esc(v)}"`).join('');
  // Right to left: «…» menu, the cloud, then the percent at the far left (Navid 2026-11-19).
  return `<span class="lib-meta" data-cat="${esc(cat)}"${other ? ' data-other="1"' : ''}${data}><button type="button" class="lib-dots" aria-label="گزینه‌ها">${ICON.dots}</button><span class="lib-cl">${saved ? OK_ICON : DL_ICON}</span><span class="lib-pct">${fa(0)}٪</span></span>`;
}
// A cover's href → [category url, is it the poet's loose poems].
const bookCat = (href) => [href.replace(/^#\/c\//, '').replace(/\/~other$/, ''), /\/~other$/.test(href)];
// After a download or its removal: every cloud on screen, and the poet page's top button.
function refreshClouds() {
  document.querySelectorAll('.lib-meta').forEach((m) => {
    const ok = m.dataset.kind === 'poet' ? isPoetSaved(m.dataset.cat) : isBookSaved(m.dataset.cat);
    m.querySelector('.lib-cl').innerHTML = ok ? OK_ICON : DL_ICON;
  });
  const top = $('#pageDl');
  if (top && !top.classList.contains('busy')) { const sl = top.dataset.slug; top.outerHTML = dlButton(sl); $('#pageDl')?.addEventListener('click', () => startPoetSave(sl)); }
}
// The «…» menu under a book or poet in «کتابخانهٔ من», and under each book on a poet's page.
async function catPoemUrls(cat, other) {
  const out = [];
  const walk = async (u, deep) => { const c = await getCat(u); (c.Poems || []).forEach((p) => out.push(clean(p.FullUrl))); if (deep) for (const k of c.ChildCats || []) await walk(clean(k.FullUrl), true); };
  await walk(cat, !other);
  return out;
}
function openLibMenu(el) {
  const { cat, kind, href, title, author } = el.dataset, other = !!el.dataset.other, book = kind === 'book';
  const slug = cat.split('/')[0];
  // On a poet's page (Navid 2026-11-19): دانلود، اضافه به کتابخانهٔ من، خوانده‌شده، اشتراک‌گذاری.
  const page = el.dataset.where === 'page', mark = el.closest('.book')?.querySelector('.bk-mark');
  const inLib = book && books.has(href);
  const done = book && el.querySelector('.lib-pct')?.textContent === `${fa(100)}٪`;
  const saved = book ? isBookSaved(cat) : isPoetSaved(slug);
  const row = (id, icon, label, dis = false) => `<button type="button" id="${id}"${dis ? ' disabled' : ''}>${icon}<span>${label}</span></button>`;
  openSheet(`<h3>${esc(book ? title : POET_NAME(slug))}</h3>${book && author ? `<p class="lib-menu-sub">${esc(author)}</p>` : ''}
    <div class="lib-menu">
      ${book && !page ? row('lmPoet', ICON.user, 'صفحهٔ سخنور') : ''}
      ${saved ? row('lmUndl', ICON.trash, 'حذف دانلود') : row('lmDl', DL_ICON, 'دانلود')}
      ${page ? (inLib ? row('lmDel', ICON.trash, 'حذف از کتابخانه') : row('lmAdd', ICON.bookmark, 'اضافه به کتابخانهٔ من')) : ''}
      ${book ? (done ? row('lmUnread', ICON.x, 'حذف از خوانده‌شده‌ها') : row('lmRead', ICON.check, 'خوانده‌شده')) : ''}
      ${row('lmShare', ICON.share, 'اشتراک‌گذاری')}
      ${page ? '' : row('lmDel', ICON.trash, 'حذف از کتابخانه')}
    </div>`, (s) => {
    // The sheet holds a history step: the poet page takes it over (closing first would let «back» undo the jump).
    s.querySelector('#lmPoet')?.addEventListener('click', () => { overlayNavigate(sheetBack, `#/c/${slug}`); closeSheet(true); });
    s.querySelector('#lmUndl')?.addEventListener('click', async () => {
      closeSheet();
      try { await (book ? unsaveBook(cat, other) : unsavePoet(slug)); toast('دانلود حذف شد'); } catch { toast('حذف دانلود کامل نشد'); }
      if (current.view === 'saved') viewSaved(); else refreshClouds();
    });
    s.querySelector('#lmDl')?.addEventListener('click', async () => {
      closeSheet();
      if (!book) { toast('دانلود آثار سخنور شروع شد'); await startPoetSave(slug); if (current.view === 'saved') viewSaved(); return; }
      toast('دانلود کتاب شروع شد');
      const ok = await saveBook(cat, other).catch(() => false);
      toast(ok ? 'کتاب برای خواندن آفلاین ذخیره شد' : 'دانلود کامل نشد، دوباره امتحان کن');
      if (current.view === 'saved') viewSaved(); else refreshClouds();
    });
    s.querySelector('#lmUnread')?.addEventListener('click', async () => {
      closeSheet();
      try {
        readPoems.unmark(href, await catPoemUrls(cat, other));
        // A book that was in the library only as «خوانده‌شده» goes back up into the main list.
        const d = doneBooks.all().find((x) => x.href === href);
        if (d) { if (!books.has(href)) books.toggle(d); doneBooks.remove(href); }
        toast('از خوانده‌شده‌ها برداشته شد');
      } catch { toast('اتصال برقرار نشد'); }
      if (current.view === 'saved') viewSaved(); else fillLibMeta(el.parentElement);
    });
    s.querySelector('#lmAdd')?.addEventListener('click', () => { closeSheet(); if (mark) toggleBook(mark); });
    s.querySelector('#lmRead')?.addEventListener('click', async () => {
      closeSheet();
      try {
        readPoems.mark(href, await catPoemUrls(cat, other));
        // On a poet page only the number turns ١٠٠٪; the book still joins «خوانده‌شده‌ها» in the library.
        if (page && mark && !books.has(href)) doneBooks.add({ href, title, author, d: +mark.dataset.d, p: +mark.dataset.p });
        toast('کتاب خوانده‌شده شد');
      } catch { toast('اتصال برقرار نشد'); }
      if (current.view === 'saved') viewSaved(); else fillLibMeta(el.parentElement);
    });
    s.querySelector('#lmShare').addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}${book ? href : `#/c/${slug}`}`;
      const name = book ? `${title} · ${author}` : POET_NAME(slug);
      closeSheet();
      if (navigator.share) { try { await navigator.share({ title: name, url }); } catch { /* cancelled */ } } else { await copy(url); toast('پیوند کپی شد'); }
    });
    s.querySelector('#lmDel')?.addEventListener('click', () => {
      closeSheet();
      if (!book) { togglePoetMark(slug); return; }
      if (page) { if (mark) toggleBook(mark); return; }
      const item = books.all().find((x) => x.href === href);
      if (item) books.toggle(item);
      doneBooks.remove(href);
      toast('از کتابخانه حذف شد');
      if (current.view === 'saved') viewSaved();
    });
  });
}
document.addEventListener('click', (e) => {
  const d = e.target.closest('.lib-dots');
  if (!d) return;
  e.preventDefault(); e.stopPropagation(); openLibMenu(d.closest('.lib-meta'));
}, true);
const COUNT_KEY = 'sp.counts';
async function poemCount(cat, other) {
  const key = `${cat}${other ? '/~other' : ''}`;
  let all = {};
  try { all = JSON.parse(localStorage.getItem(COUNT_KEY)) || {}; } catch { /* storage blocked */ }
  if (all[key]) return all[key];
  const walk = async (u, deep) => { const c = await getCat(u); let n = (c.Poems || []).length; if (deep) for (const k of c.ChildCats || []) n += await walk(clean(k.FullUrl), true); return n; };
  const n = await walk(cat, !other);
  all[key] = n;
  try { localStorage.setItem(COUNT_KEY, JSON.stringify(all)); } catch { /* storage full */ }
  return n;
}
function fillLibMeta(root) {
  const urls = readPoems.all().map(clean);
  root.querySelectorAll('.lib-meta').forEach(async (el) => {
    const cat = el.dataset.cat, other = !!el.dataset.other;
    const read = urls.filter((u) => (other ? parentOf(u) === cat : u.startsWith(`${cat}/`))).length;
    if (!read) { el.querySelector('.lib-pct').textContent = `${fa(0)}٪`; return; }
    try {
      const n = await poemCount(cat, other);
      const done = n > 0 && read >= n;
      el.querySelector('.lib-pct').textContent = `${fa(done ? 100 : n ? Math.min(99, Math.max(1, Math.round((read / n) * 100))) : 0)}٪`;
      // A book read to the end moves down to «خوانده‌شده‌ها», faded (Navid 2026-11-19).
      const book = el.closest('.book'), shelfDone = root.querySelector('.lib-done');
      if (done && book && shelfDone && !shelfDone.contains(book)) { book.classList.add('read-done'); shelfDone.append(book); shelfDone.hidden = false; root.querySelector('.lib-done-head').hidden = false; }
    } catch { /* offline: leave 0 */ }
  });
}
document.addEventListener('keydown', (e) => {
  const m = e.target.closest?.('.pt-mark');
  if (m && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); togglePoetMark(m.dataset.slug); }
}, true);
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
    <div class="section"><div class="section-head"><h2>سخنوران</h2><a class="link" href="#/poets">همه</a></div>
      <div class="poet-strip">${FEATURED.map(([s, n]) => `<a class="poet-chip" href="#/c/${s}"><img class="pl-face" src="${portrait(s, settings.get().theme === 'dark')}" alt="" width="1024" height="1024" loading="lazy" decoding="async"><span>${n}</span></a>`).join('')}</div></div>
  </div>`;
  $('#rnd').addEventListener('click', () => randomPoem((h) => openPoemOver(h)));
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
  main.innerHTML = `${pageClose()}<div class="wrap fadein pl-page">
    <div class="page-title"><h1>همه سخنوران</h1><p>${fa(poets.length)} سخنور</p></div>
    <p class="pl-hint">هر سخنوری را نشان کنی، در صفحهٔ خانه‌ات می‌آید.</p>
    <div class="search"><label>${ICON.search}<input type="search" id="q" placeholder="جست‌وجوی نام سخنور" autocomplete="off"></label></div>
    <div class="pl-tools"><span class="pl-sorts"><button type="button" class="pl-sort" id="plSort"></button><button type="button" class="pl-sort" id="plCent"></button></span></div>
    <div class="poet-groups" id="pl"></div></div>`;
  const pl = $('#pl');
  // Order: by readership (default), alphabetical, or by century as on Ganjoor's home page; remembered on this device.
  let mode = 'fame';
  try { const v = localStorage.getItem('sp.poetsAlpha'); mode = v === '1' ? 'alpha' : v === 'c' ? 'cent' : 'fame'; } catch { /* storage blocked */ }
  const sortBtn = $('#plSort'), centBtn = $('#plCent');
  const syncSort = () => {
    sortBtn.innerHTML = `<span>${mode === 'alpha' ? 'به ترتیب شهرت' : 'به ترتیب الفبا'}</span>${ICON.chev}`;
    centBtn.innerHTML = `<span>${mode === 'cent' ? 'به ترتیب شهرت' : 'بر اساس قرن'}</span>${ICON.chev}`;
  };
  syncSort();
  const setMode = (m) => {
    mode = mode === m ? 'fame' : m; syncSort();
    try { localStorage.setItem('sp.poetsAlpha', mode === 'alpha' ? '1' : mode === 'cent' ? 'c' : '0'); } catch { /* storage blocked */ }
    draw($('#q').value);
  };
  sortBtn.addEventListener('click', () => setMode('alpha'));
  centBtn.addEventListener('click', () => setMode('cent'));
  const centOf = new Map(), centPos = new Map();
  CENTURIES.forEach(([title, slugs], ci) => slugs.forEach((s, i) => { centOf.set(s, title); centPos.set(s, ci * 1000 + i); }));
  const norm = (s) => s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').trim();
  const draw = (q = '') => {
    const nq = norm(q);
    let list = nq ? poets.filter((p) => norm(p.Nickname).includes(nq)) : poets;
    if (mode === 'alpha') list = [...list].sort((a, b) => norm(a.Nickname).localeCompare(norm(b.Nickname), 'fa'));
    if (mode === 'cent') list = [...list].sort((a, b) => (centPos.get(clean(a.FullUrl)) ?? 1e9) - (centPos.get(clean(b.FullUrl)) ?? 1e9));
    const wall = new Set(wallChoice());
    const tile = (p) => { const sl = clean(p.FullUrl); return poetTile(sl, p.Nickname, wall.has(sl)); };
    // Alphabetical: one group per letter (آ goes with ا); by century: one group per century; by readership: a single group.
    const key = (p) => mode === 'alpha' ? norm(p.Nickname).charAt(0).replace('آ', 'ا') : mode === 'cent' ? (centOf.get(clean(p.FullUrl)) || '') : '';
    const groups = [];
    list.forEach((p) => { const k = key(p); if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, ps: [] }); groups[groups.length - 1].ps.push(p); });
    pl.innerHTML = list.length ? groups.map((g) => `<section class="pl-group">${g.k ? `<h2 class="pl-head${mode === 'cent' ? ' pl-cent' : ''}"><span>${esc(g.k)}</span></h2>` : ''}<ul class="poet-grid">${g.ps.map(tile).join('')}</ul></section>`).join('')
      : `<p class="empty-state"><b>سخنوری با این نام پیدا نشد</b></p>`;
  };
  draw();
  wireClose('pageX');
  $('#q').addEventListener('input', (e) => draw(e.target.value));
}

// Whole-poet download for offline reading, beside the close button on the poet's page.
const poetSaving = new Map(); // slug -> { f: progress 0..1, b: bytes }
// Offline state (Navid 2026-11-19): an empty cloud = not downloaded; a filled cloud with a tick = downloaded.
const DL_ICON = ms('cloud', 'cl');
const OK_ICON = ms('cloud_done', 'cl ok');
// Size in Persian: «۸۵۰ کیلوبایت» / «۲٫۴ مگابایت».
// With the whole size: «۲٫۴ از ۹٫۱ مگابایت», both in the unit of the whole.
const faNum = (b, mb) => mb ? fa((b / 1048576).toFixed(1)).replace('.', '٫') : fa(Math.round(b / 1024));
const faSize = (b, t = 0) => { const mb = (t || b) >= 1048576; return `${t ? `${faNum(Math.min(b, t), mb)}\u00a0از\u00a0` : ''}${faNum(t || b, mb)}\u00a0${mb ? 'مگابایت' : 'کیلوبایت'}`; };
function dlButton(slug) {
  const ok = isPoetSaved(slug), prog = poetSaving.get(slug);
  const tip = ok ? 'ذخیره شده برای آفلاین' : 'دانلود برای آفلاین';
  return `<button class="icon-btn page-dl tip-l${ok ? ' saved' : ''}${prog ? ' busy' : ''}" id="pageDl" data-slug="${esc(slug)}" aria-label="${tip}" data-tip="${tip}" style="--p:${prog?.f ?? 0}"><span class="dl-ico">${ok ? OK_ICON : DL_ICON}</span><span class="dl-txt">${prog ? faSize(prog.b, prog.t) : ''}</span></button>`;
}
// Tapping download slides the disc open to the right into a capsule that fills as files are stored and counts the size; it closes back into a tick when done.
async function startPoetSave(slug) {
  if (isPoetSaved(slug) || poetSaving.has(slug)) return;
  const cur = () => document.querySelector(`#pageDl[data-slug="${slug}"]`);
  poetSaving.set(slug, { f: 0, b: 0 });
  const b0 = cur(); if (b0) { b0.classList.add('busy'); b0.querySelector('.dl-txt').textContent = faSize(0); }
  let last = 0;
  const ok = await savePoet(slug, (f, b, t) => {
    poetSaving.set(slug, { f, b, t });
    const el = cur(); if (!el) return;
    el.style.setProperty('--p', f.toFixed(3));
    const now = performance.now();
    if (now - last > 120 || f === 1) { last = now; el.querySelector('.dl-txt').textContent = faSize(b, t); }
  }).catch(() => false);
  const fin = poetSaving.get(slug) || { b: 0 };
  const el = cur();
  if (el && ok) { el.style.setProperty('--p', '1'); el.querySelector('.dl-ico').innerHTML = OK_ICON; el.querySelector('.dl-txt').textContent = faSize(fin.t || fin.b); }
  await new Promise((r) => setTimeout(r, ok ? 1400 : 0));
  poetSaving.delete(slug);
  const b = cur(); if (b) { b.classList.remove('busy'); await new Promise((r) => setTimeout(r, 380)); }
  const b2 = cur(); if (b2) b2.outerHTML = dlButton(slug);
  cur()?.addEventListener('click', () => startPoetSave(slug));
  toast(ok ? `آثار برای خواندن آفلاین ذخیره شد (${faSize(fin.b)})` : 'دانلود کامل نشد، دوباره امتحان کن');
  refreshClouds();
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
    const pic = `<img class="poet-pic" src="${esc(portrait(slug, dark))}" alt="" width="1024" height="1024" decoding="async">`;
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

  const author = poet?.Nickname || '';
  // On a poet's page the works are grouped (a divan's forms get their own shelf); deeper pages show one shelf.
  const groups = isPoet && !other ? await shelf(cat) : null;
  // Inside a book its parts are a plain list, not more covers.
  const books = groups ? '' : (cat.ChildCats || []).map((c) => `<a class="part" href="${catHref(c.FullUrl)}"><b>${esc(c.Title)}</b>${ICON.chev}</a>`).join('');
  const poemItem = (p, i) => `<li><a href="${poemHref(p.FullUrl)}" data-u="${esc(clean(p.FullUrl))}"><span class="n">${fa(i + 1)}</span><span class="tt"><span class="fl"></span><small>${esc(p.Title)}</small></span><span class="marks">${marksHTML(clean(p.FullUrl), seen)}</span></a></li>`;

  main.dataset.cat = path;
  document.body.classList.toggle('poet-bg', isPoet && !!poet);
  const dl = isPoet && poet ? dlButton(slug) : '';
  main.innerHTML = `<button class="icon-btn page-x tip-l" id="pageX" aria-label="بستن" data-tip="بستن">${ICON.x}</button>${dl}<div class="wrap fadein">${head}
    ${groups ? shelfHTML(groups, author, '', (b) => libMeta(...bookCat(b.href), { href: b.href, title: b.title, author, where: 'page' })) : books ? `<div class="parts">${books}</div>` : ''}
    ${poems.length ? `<div class="list-tools"><span class="count">${fa(poems.length)} شعر</span></div>
      <ul class="poems" id="pm">${poems.slice(0, shown).map(poemItem).join('')}</ul>
      ${poems.length > shown ? `<button class="btn ghost more-btn" id="more">نمایش بیشتر</button>` : ''}` : ''}
    <div id="nextSec"></div>
  </div>`;
  if (groups) fillLibMeta(main);
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
  $('#pageDl')?.addEventListener('click', () => startPoetSave(slug));
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
        // A poem with no couplets (a tasnif or prose written as paragraphs) shows its first line instead.
        const line = f ? f.m.find(Boolean) : ((poem.Verses || []).find((v) => v.Position === 'Paragraph' && v.Text.trim())?.Text || '');
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
    toast(on ? 'به کتابخانهٔ من اضافه شد' : 'از کتابخانهٔ من برداشته شد');
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
// A poem opened on top of any page (random poem): the address of that page and what it showed.
let sheetOver = null;
function openPoemOver(href, replace = false) {
  const path = clean(decodeURIComponent(href.replace(/^#\/p\//, '')));
  sheetOver = { hash: location.hash, view: current.view, path: current.path };
  // Opened over a poem being read: remember it, and where in it, to put it back on close.
  if (sheetEl && current.view === 'poem') sheetOver.poem = { path: current.path, pushed: sheetPushed, searchBack, top: sheetEl.querySelector('.psheet')?.scrollTop || 0 };
  // From the menu the poem takes the menu's history entry, so back lands on the page itself.
  if (replace) window.history.replaceState(null, '', href); else window.history.pushState(null, '', href);
  sheetPushed = true;
  current.view = 'poem'; current.path = path;
  viewPoem(path, { random: true }, true).catch(() => { toast('شعر باز نشد'); requestCloseSheet(); });
}
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
    if (!c || current.view !== 'poem' || opts.random) return; // a random poem is not «ادامه خواندن»
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
    // Phones: centred in that space. Desktop: split 8 to 2, nearer the poem (Navid, 0.9.130).
    const fromEdge = innerWidth >= 860 ? (gap - NUM_W) * 0.8 : gap / 2 - NUM_W / 2;
    card.style.setProperty('--nr', (fromEdge - pad).toFixed(1) + 'px');
  }
  // In em, so the line width follows the text if its size changes before the next pass.
  verses.style.setProperty('--mw', (W / parseFloat(getComputedStyle(verses).fontSize)).toFixed(4) + 'em');
  for (const m of ms) {
    const w = +m.dataset.w;
    // Centred lines (the green ones, a lone *) are never stretched: they stay centred at their own width (Navid).
    if (m.closest('.center-pair')) { m.textContent = m.dataset.o; m.classList.remove('wraps'); continue; }
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
      const blob = await poemImage({ groups, focus, poet: meta.poet, title: meta.title, pic: storyPic(meta.url) });
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
    ${b.sum ? `<div class="meaning"><b>معنی بیت</b>${meaningHTML(b.sum)}</div>` : ''}
    <div class="actions four">
      <button id="bSave" aria-pressed="${bayts.has(meta.url, i)}">${ICON.bookmark}<span>${bayts.has(meta.url, i) ? 'نشان‌شده' : 'نشان کردن'}</span></button>
      <button id="bCopy">${ICON.copy}کپی</button>
      <button id="bImg">${ICON.image}اسکرین‌شات</button>
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
      const blob = await baytImage({ lines: plain, poet: meta.poet, title: meta.title, pic: storyPic(meta.url) });
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

let savedTab = 'books', savedSort = 'time';
function viewSaved() {
  const EMPTY = {
    poems: [ICON.bookmark, 'هنوز شعری نشان نکرده‌ای', 'هر جا شعری به دلت نشست، نشانه‌ی بالای صفحه را بزن.'],
    bayts: [ICON.bookmark, 'هنوز بیتی نشان نکرده‌ای', 'روی هر بیت بزن و «نشان کردن» را انتخاب کن.'],
    history: [ICON.clock, 'هنوز شعری نخوانده‌ای', 'شعرهایی که می‌خوانی اینجا می‌مانند.'],
    books: [ICON.bookmark, 'هنوز کتابی نشان نکرده‌ای', 'نوار نشانِ گوشهٔ جلد هر کتاب را بزن.'],
    poets: [ICON.bookmark, 'هنوز سخنوری نشان نکرده‌ای', 'در صفحهٔ «همه سخنوران» نوار نشانِ گوشهٔ هر سخنور را بزن.'],
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
    const isBooks = savedTab === 'books';
    $('#ssort').style.display = isBooks || savedTab === 'poets' ? 'none' : '';
    if (savedTab === 'poets') {
      const ps = wallChoice();
      $('#sl').hidden = true; $('#sbooks').hidden = false;
      $('#sbooks').innerHTML = ps.length ? `<div class="saved-poets"><ul class="poet-grid">${ps.map((sl) => poetTile(sl, POET_NAME(sl), true, libMeta(sl, false, { kind: 'poet' }))).join('')}</ul></div>`
        : `<ul class="saved-list"><li class="empty-state">${EMPTY.poets.join('')}</li></ul>`;
      fillLibMeta($('#sbooks'));
      document.querySelectorAll('#stabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.t === savedTab));
      return;
    }
    if (isBooks) {
      const bl0 = books.all(), have = new Set(bl0.map((x) => x.href));
      const bl = [...bl0, ...doneBooks.all().filter((x) => !have.has(x.href))];
      let html;
      if (!bl.length) { const [ic, t, d] = EMPTY.books; html = `<ul class="saved-list"><li class="empty-state">${ic}<b>${t}</b>${d}</li></ul>`; }
      else {
        const list2 = savedSort === 'poet' ? [...bl].sort((p, q) => (p.author || '').localeCompare(q.author || '', 'fa')) : bl;
        html = `<div class="books">${list2.map((b, i) => coverHTML(b, b.author, i, libMeta(...bookCat(b.href), { href: b.href, title: b.title, author: b.author }))).join('')}</div>`
          + '<h2 class="lib-done-head" hidden>خوانده‌شده‌ها</h2><div class="books lib-done" hidden></div>';
      }
      $('#sl').hidden = true; $('#sbooks').hidden = false; $('#sbooks').innerHTML = html; fillLibMeta($('#sbooks'));
      document.querySelectorAll('#stabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.t === savedTab));
      return;
    }
    $('#sl').hidden = false; $('#sbooks').hidden = true;
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
  main.innerHTML = `${pageClose('sX')}<div class="wrap fadein"><div class="page-title"><h1>کتابخانهٔ من</h1></div>
    <div class="tabs" id="stabs" role="tablist"><button role="tab" data-t="books">کتاب‌ها</button><button role="tab" data-t="poets">سخنوران</button><button role="tab" data-t="poems">شعرها</button><button role="tab" data-t="bayts">ابیات</button><button role="tab" data-t="history">خوانده‌ها</button></div>
    <div class="sort-row" id="ssort"><span>ترتیب:</span><button data-o="time">زمان نشان کردن</button><button data-o="poet">سخنور</button></div>
    <ul class="saved-list" id="sl"></ul><div id="sbooks" hidden></div></div>`;
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
      <p>همهٔ نشان‌ها (${n(saved.all())} شعر، ${n(bayts.all())} بیت)، خوانده‌ها، سخنوران انتخابی و تنظیمات در یک فایل. این فایل را روی گوشی یا رایانهٔ دیگر بارگذاری کن تا همه‌چیز آنجا هم باشد.</p>
    </div>
    <div class="actions two">
      <button id="bkOut">${ICON.download}گرفتن فایل</button>
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
    else if (view === 'search') viewSearch();
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
export const VERSION = '0.9.159';
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
  // Back from a poem opened on the search page: lower the sheet, keep the results.
  if (sheetEl && location.hash === '#/search' && $('#sRes')) {
    sheetPushed = false; current.view = 'search'; current.path = '';
    if (window.history.state?.pg) pageId = window.history.state.pg;
    closePoemSheet();
    return;
  }
  if (sheetEl && sheetOver && location.hash === sheetOver.hash) {
    const under = sheetOver.poem;
    sheetPushed = false; current.view = sheetOver.view; current.path = sheetOver.path; sheetOver = null;
    if (under) {
      // Back to the poem that was open under the random one, at the same place.
      viewPoem(under.path, { instant: true }, true).then(() => {
        sheetPushed = under.pushed; searchBack = under.searchBack;
        const sh = sheetEl?.querySelector('.psheet'); if (sh) sh.scrollTop = under.top;
      }).catch(() => closePoemSheet());
      return;
    }
    if (window.history.state?.pg) pageId = window.history.state.pg;
    closePoemSheet();
    return;
  }
  sheetOver = null;
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
  if (!a || (current.view !== 'cat' && current.view !== 'search') || e.metaKey || e.ctrlKey || e.shiftKey) return;
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
  const r = (logo.querySelector('.dots') || logo).getBoundingClientRect();
  const tip = document.createElement('div');
  tip.className = 'logo-hint'; tip.setAttribute('role', 'status'); tip.textContent = 'منو و تنظیمات';
  document.body.appendChild(tip);
  const w = tip.offsetWidth, cx = r.left + r.width / 2;
  const left = Math.max(12, Math.min(innerWidth - w - 12, cx - w / 2));
  tip.style.left = `${left}px`; tip.style.top = `${r.bottom + 10}px`;
  tip.style.setProperty('--ax', `${cx - left}px`);
  requestAnimationFrame(() => tip.classList.add('show'));
  const bye = () => { tip.classList.remove('show'); setTimeout(() => tip.remove(), 400); };
  const t = setTimeout(bye, 4500);
  logo.addEventListener('click', () => { clearTimeout(t); bye(); }, { once: true });
}
