import { getManifest, getPoet, getCat, getPoem, parentOf, clean, blocks, FEATURED, DAILY_POOL, TOP } from './data.js';
import { settings, apply, saved, history } from './store.js';
import { baytImage, shareBlob } from './share.js';
import { mountWall, unmountWall } from './wall.js';
import { attachSheetDrag } from './sheetdrag.js';

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
  sheetBody.innerHTML = html;
  backdrop.hidden = false;
  requestAnimationFrame(() => { backdrop.classList.add('show'); sheet.classList.add('show'); sheet.setAttribute('aria-hidden', 'false'); sheet.focus(); });
  onMount?.(sheetBody);
}
function closeSheet() {
  backdrop.classList.remove('show'); sheet.classList.remove('show'); sheet.setAttribute('aria-hidden', 'true');
  setTimeout(() => { backdrop.hidden = true; document.querySelectorAll('.bayt.lit').forEach((b) => b.classList.remove('lit')); }, 280);
  sheetReturn?.focus?.({ preventScroll: true });
}
backdrop.addEventListener('click', closeSheet);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && sheet.classList.contains('show')) closeSheet(); });
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

/* ───────── Settings sheet ───────── */
function openSettings() {
  const s = settings.get();
  const seg = (key, opts) => `<div class="seg" role="group">${opts.map(([v, label, sw]) =>
    `<button data-k="${key}" data-v="${v}" aria-pressed="${s[key] === v}">${sw ? `<i class="sw" style="background:${sw}"></i>` : ''}${label}</button>`).join('')}</div>`;
  openSheet(`
    <h3>تنظیمات خواندن</h3>
    <div class="setting"><span>اندازهٔ متن</span>
      <div class="size-row"><span class="a-sm">آ</span><input type="range" id="sz" min="0.8" max="1.6" step="0.05" value="${s.size}" aria-label="اندازهٔ متن"><span class="a-lg">آ</span></div>
      <div class="preview">${txt('دلا بسوز که سوز تو کارها بکند')}</div>
    </div>
    <div class="setting toggle-row"><span style="margin:0">حالت تیره</span>
      <button class="switch" role="switch" id="dk" aria-checked="${s.theme === 'dark'}" aria-label="حالت تیره"></button></div>
    <div class="setting toggle-row"><span style="margin:0">نمایش اِعراب (زیر و زبر)</span>
      <button class="switch" role="switch" id="hk" aria-checked="${s.harakat}" aria-label="نمایش اعراب"></button></div>
  `, (el) => {
    el.querySelector('#sz').addEventListener('input', (e) => { settings.set({ size: +e.target.value }); restretchSoon(); });
    el.querySelectorAll('.seg button').forEach((b) => b.addEventListener('click', () => {
      settings.set({ [b.dataset.k]: b.dataset.v });
      el.querySelectorAll(`.seg button[data-k="${b.dataset.k}"]`).forEach((x) => x.setAttribute('aria-pressed', x === b));
    }));
    el.querySelector('#dk').addEventListener('click', (e) => {
      const dark = settings.get().theme !== 'dark';
      settings.set({ theme: dark ? 'dark' : 'light', themeChosen: true });
      e.currentTarget.setAttribute('aria-checked', dark);
    });
    el.querySelector('#hk').addEventListener('click', (e) => {
      const v = !settings.get().harakat;
      settings.set({ harakat: v });
      e.currentTarget.setAttribute('aria-checked', v);
      el.querySelector('.preview').innerHTML = txt('دلا بسوز که سوز تو کارها بکند');
      if (current.view === 'poem') rerender();
    });
  });
}
/* ───────── Menu (hamburger, top left) ───────── */
const menu = $('#menu'), menuVeil = $('#menuVeil');
function setMenu(open) {
  menu.classList.toggle('open', open); menuVeil.classList.toggle('show', open);
  menu.setAttribute('aria-hidden', String(!open));
  document.querySelectorAll('.menu-trigger').forEach((b) => b.setAttribute('aria-expanded', String(open)));
}
document.addEventListener('click', (e) => { if (e.target.closest('.menu-trigger')) { e.preventDefault(); setMenu(!menu.classList.contains('open')); } });
menuVeil.addEventListener('click', () => setMenu(false));
menu.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
$('#menuSettings').addEventListener('click', () => { setMenu(false); openSettings(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu.classList.contains('open')) { e.stopImmediatePropagation(); setMenu(false); } }, true);

/* ───────── Helpers ───────── */
function loading(lines = 8) {
  main.innerHTML = `<div class="wrap" aria-busy="true"><div class="skeleton" style="height:28px;width:40%;margin:32px auto 8px"></div>${
    Array.from({ length: lines }, (_, i) => `<div class="skeleton sk-line" style="width:${i % 2 ? 70 : 82}%;margin-inline-start:${i % 2 ? 'auto' : '0'}"></div>`).join('')}</div>`;
}
function failed(err, retry) {
  const offline = !navigator.onLine;
  main.innerHTML = `<div class="wrap"><div class="error-box fadein">
    <h2>${offline ? 'به اینترنت وصل نیستی' : 'این صفحه باز نشد'}</h2>
    <p>${offline ? 'این بخش هنوز روی دستگاه ذخیره نشده است. وقتی وصل شدی دوباره امتحان کن.' : 'شاید نشانی اشتباه است یا ارتباط قطع شد.'}</p>
    <button class="btn ghost" id="retry">دوباره</button></div></div>`;
  $('#retry').addEventListener('click', retry);
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

async function randomPoem() {
  try {
    const pick = await randomFrom(DAILY_POOL[Math.floor(Math.random() * DAILY_POOL.length)]);
    location.hash = poemHref(pick.FullUrl);
  } catch (e) { toast('اتصال برقرار نشد'); }
}

async function viewPoets() {
  loading(10);
  const m = await getManifest();
  const poets = m.Poets;
  main.innerHTML = `<div class="wrap fadein">
    <div class="page-title"><h1>شاعران</h1><p>${fa(poets.length)} شاعر</p></div>
    <div class="search"><label>${ICON.search}<input type="search" id="q" placeholder="جست‌وجوی نام شاعر" autocomplete="off"></label></div>
    <ul class="poet-list" id="pl"></ul></div>`;
  const pl = $('#pl');
  const norm = (s) => s.replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/‌/g, ' ').trim();
  const draw = (q = '') => {
    const nq = norm(q);
    const list = nq ? poets.filter((p) => norm(p.Nickname).includes(nq)) : poets;
    pl.innerHTML = list.length ? list.map((p) => `<li><a href="${catHref(p.FullUrl)}">${mono(p.Nickname)}<b>${esc(p.Nickname)}</b>${ICON.chev}</a></li>`).join('')
      : `<li class="empty-state"><b>شاعری با این نام پیدا نشد</b></li>`;
  };
  draw();
  $('#q').addEventListener('input', (e) => draw(e.target.value));
}

async function viewCat(path) {
  loading(8);
  const slug = path.split('/')[0];
  const [cat, poet] = await Promise.all([getCat(path), getPoet(slug).catch(() => null)]);
  const isPoet = !path.includes('/');
  const seen = history.seen();
  const poems = cat.Poems || [];
  const PAGE = 120;
  let shown = Math.min(poems.length, PAGE);

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

  const books = (cat.ChildCats || []).map((c) => `<a class="book" href="${catHref(c.FullUrl)}"><b>${esc(c.Title)}</b>${ICON.chev}</a>`).join('');
  const poemItem = (p, i) => `<li><a href="${poemHref(p.FullUrl)}" data-u="${esc(clean(p.FullUrl))}"><span class="n">${fa(i + 1)}</span><span class="tt"><span class="fl"></span><small>${esc(p.Title)}</small></span><span class="marks">${marksHTML(clean(p.FullUrl), seen)}</span></a></li>`;

  main.dataset.cat = path;
  document.body.classList.toggle('poet-bg', isPoet && !!poet && TOP.includes(slug));
  main.innerHTML = `<button class="icon-btn page-x tip-l" id="pageX" aria-label="بستن" data-tip="بستن">${ICON.x}</button><div class="wrap fadein">${head}
    ${books ? `<div class="books">${books}</div>` : ''}
    ${poems.length ? `<div class="list-tools"><span class="count">${fa(poems.length)} شعر</span></div>
      <ul class="poems" id="pm">${poems.slice(0, shown).map(poemItem).join('')}</ul>
      ${poems.length > shown ? `<button class="btn ghost more-btn" id="more">نمایش بیشتر</button>` : ''}` : ''}
  </div>`;

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
    if (shown >= poems.length) e.currentTarget.remove();
  });
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

function renderBlocks(bs, { tappable = true } = {}) {
  return bs.map((b, i) => {
    if (b.kind === 'break') return '<div class="section-break"></div>';
    if (b.kind === 'prose') return `<p class="prose">${vtxt(b.text)}</p>`;
    if (b.kind === 'note') return `<p class="note">${txt(b.text)}</p>`;
    const cls = b.kind === 'center' ? 'bayt center-pair' : b.kind === 'single' ? 'bayt single' : 'bayt';
    const ms = b.m.map((m, j) => `<span class="m m${j + 1}">${vtxt(m)}</span>`).join('');
    const tag = tappable ? 'button' : 'div';
    return `<${tag} class="${cls}" data-i="${i}"${tappable ? ' type="button"' : ''}>${ms}</${tag}>`;
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
  const bookLink = cat && parent.includes('/') ? ` · <a href="${catHref(parent)}">${esc(cat.Title)}</a>` : '';
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
  card.querySelector('.share').addEventListener('click', async () => {
    const url = `${location.origin}${location.pathname}#/p/${path}`;
    const text = `${poem.Title} · ${poetN}\n${meta.line}`;
    if (navigator.share) { try { await navigator.share({ title: poem.Title, text, url }); } catch { /* cancelled */ } }
    else { await copy(`${text}\n${url}`); toast('نشانی کپی شد'); }
  });
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
  stackCleanup?.();
  const el = sheetEl; sheetEl = null;
  document.body.classList.remove('psheet-open');
  if (instant) { el.remove(); return; }
  const sh = el.querySelector('.psheet'), bd = el.querySelector('.psheet-backdrop');
  sh.style.transform = sh.style.transition = '';
  bd.style.opacity = bd.style.transition = '';
  el.classList.remove('open');
  setTimeout(() => el.remove(), 450);
}
function requestCloseSheet() {
  if (!sheetEl) return;
  if (sheetPushed) { sheetPushed = false; window.history.back(); return; }
  window.history.replaceState(null, '', catHref(sheetCat));
  current.view = 'cat'; current.path = sheetCat;
  closePoemSheet();
}
function openSheetShell() {
  closePoemSheet(true);
  const el = document.createElement('div');
  el.className = 'psheet-wrap';
  el.innerHTML = `<div class="psheet-backdrop"></div>
    <section class="psheet" role="dialog" aria-modal="true" aria-label="شعر" tabindex="-1">
      <div class="psheet-grip" aria-label="بستن"><i></i></div>
      <div class="stack" id="stack"></div><div class="stack-end" id="stackEnd"></div>
    </section>`;
  document.body.appendChild(el);
  sheetEl = el;
  document.body.classList.add('psheet-open');
  const sh = el.querySelector('.psheet');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('open')));
  el.querySelector('.psheet-backdrop').addEventListener('click', requestCloseSheet);
  el.querySelector('.psheet-grip').addEventListener('click', requestCloseSheet);
  sh.addEventListener('click', (e) => { if (e.target.closest('.pclose')) requestCloseSheet(); });
  // Pull down from the top of the sheet to close it; it follows the finger.
  attachSheetDrag({ el: sh, handle: () => el.querySelector('.psheet-grip'), backdrop: el.querySelector('.psheet-backdrop'), onClose: requestCloseSheet });
  return sh;
}

async function viewPoem(path, opts = {}, fromList = false) {
  const slug = path.split('/')[0];
  const parent = parentOf(path);
  const listPath = parent || slug;
  if (!fromList && main.dataset.cat !== listPath) { await viewCat(listPath).catch(() => {}); current.view = 'poem'; current.path = path; }
  const [poem, poet, cat] = await Promise.all([getPoem(path), getPoet(slug).catch(() => null), getCat(parent).catch(() => null)]);
  const poetN = poet?.Nickname || '';
  const list = cat?.Poems || [];
  let idx = list.findIndex((p) => clean(p.FullUrl) === path);

  const sh = openSheetShell();
  sheetCat = listPath;
  const stack = $('#stack'), end = $('#stackEnd');
  stackRO = new ResizeObserver((es) => es.forEach((en) => placeCard(en.target)));
  // The card nearest the top of the screen is the one being read: keep the address in step.
  stackObs = new IntersectionObserver((es) => {
    for (const en of es) {
      if (!en.isIntersecting) continue;
      const c = cardCtx.get(en.target);
      if (!c || current.view !== 'poem') continue;
      const want = poemHref(c.meta.url);
      if (location.hash !== want) { window.history.replaceState(null, '', want); current.path = c.meta.url; }
      document.title = `${c.meta.title} · ${c.meta.poet} · شعر پارسی`;
      history.add(c.meta); refreshMarks(c.meta.url);
    }
  }, { root: sh, rootMargin: '-45% 0px -50% 0px' });

  mountCard(stack, path, poem, poetN, cat, opts).classList.add('fadein');
  // Widths must be measured in the real font: stretch again once it has loaded.
  document.fonts?.load('300 20px Lateef', 'ـبـ').then(() => document.fonts.ready).then(restretchSoon);
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
const NONJOIN = new Set([...'اآأإٱدذرزژوؤةءى']);
const MARK = /[ً-ٰٟۖ-ۭ]/;
const LETTER = /[ؠ-يٮ-ۓۺ-ۿ]/;
function joinSlots(s) {
  // Positions after a letter that joins forward to the next letter, best ones first:
  // the last join of each word, then the rest from the end of the word backwards.
  const ch = [...s];
  const words = [];
  let cur = [];
  for (let i = 0; i < ch.length; i++) {
    if (!LETTER.test(ch[i]) || NONJOIN.has(ch[i]) || ch[i] === 'ـ') { if (ch[i] === ' ' || ch[i] === '‌') { if (cur.length) words.push(cur); cur = []; } continue; }
    let j = i + 1;
    while (j < ch.length && MARK.test(ch[j])) j++;
    if (j < ch.length && LETTER.test(ch[j]) && !(ch[i] === 'ل' && 'اآأإ'.includes(ch[j]))) cur.push(j);
  }
  if (cur.length) words.push(cur);
  const order = [];
  const maxLen = Math.max(0, ...words.map((w) => w.length));
  for (let k = 0; k < maxLen; k++) for (const w of words) if (w.length > k) order.push(w[w.length - 1 - k]);
  return { ch, order };
}
function withKashida(s, n) {
  if (n <= 0) return s;
  const { ch, order } = joinSlots(s);
  if (!order.length) return s;
  const add = new Map();
  for (let k = 0; k < n; k++) { const p = order[k % order.length]; add.set(p, (add.get(p) || 0) + 1); }
  let out = '';
  for (let i = 0; i < ch.length; i++) out += 'ـ'.repeat(add.get(i) || 0) + ch[i];
  return out;
}
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
  const avail = verses.clientWidth - 12;
  if (natural > avail) {
    // A misra wider than the screen: shrink this poem a little rather than break the line.
    const k = Math.max(0.8, avail / natural - 0.005);
    verses.style.fontSize = `calc(var(--poem-size) * ${(1.1 * k).toFixed(3)})`;
    natural = measure();
  }
  const tw = wOf('ـ'.repeat(10)) / 10;
  const pairGap = 48;
  const twoCol = innerWidth >= 760 && natural * 2 + pairGap <= avail;
  const W = Math.ceil(Math.min(natural, twoCol ? (avail - pairGap) / 2 : avail));
  card.classList.toggle('two-col', twoCol);
  // The notes under the poem are exactly as wide as the verses above them.
  card.style.setProperty('--vw', (twoCol ? W * 2 + pairGap : W) + 'px');
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

function openBayt(ctx, i, el) {
  const { bs, meta } = ctx;
  const b = bs[i];
  if (!b || !b.m) return;
  el.classList.add('lit');
  const plain = b.m.map((m) => (settings.get().harakat ? m : m.replace(HARAKAT, '')));
  openSheet(`
    <div class="q">${plain.map((m) => `<span class="m">${esc(m)}</span>`).join('')}</div>
    ${b.sum ? `<div class="meaning"><b>معنی بیت</b><p>${esc(b.sum.trim())}</p></div>` : ''}
    <div class="actions">
      <button id="bCopy">${ICON.copy}کپی</button>
      <button id="bImg">${ICON.image}تصویر برای استوری</button>
      <button id="bShare">${ICON.share}ارسال متن</button>
    </div>`, (s) => {
    const text = `${plain.join('\n')}\n— ${meta.poet}`;
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

function viewFal() {
  main.innerHTML = `<div class="fal-page fadein">
    <div class="fal-orb" id="orb">${ICON.lantern}</div>
    <h1>فال حافظ</h1>
    <p>چشم‌ها را ببند، نیتی در دل کن و وقتی آماده بودی دیوان را بگشا.</p>
    <button class="btn" id="open">بگشا</button>
    <blockquote>ای حافظ شیرازی، تو محرم هر رازی</blockquote>
  </div>`;
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

function viewSaved(tab = 'saved') {
  const draw = (t) => {
    const list = t === 'saved' ? saved.all() : history.all();
    const items = list.map((x) => `<li class="saved-item"><a href="${poemHref(x.url)}">
      ${x.line ? `<span class="q">${txt(x.line.split(' / ')[0])}</span>` : ''}
      <span class="s">${esc(x.title)} · ${esc(x.poet)}</span></a>
      ${t === 'saved' ? `<button class="icon-btn on" data-rm="${esc(x.url)}" aria-label="برداشتن">${ICON.bookmark}</button>` : ''}</li>`).join('');
    $('#sl').innerHTML = items || `<li class="empty-state">${t === 'saved' ? ICON.bookmark : ICON.clock}
      <b>${t === 'saved' ? 'هنوز شعری نشان نکرده‌ای' : 'هنوز شعری نخوانده‌ای'}</b>
      ${t === 'saved' ? 'هر جا شعری به دلت نشست، نشانه‌ی بالای صفحه را بزن.' : 'شعرهایی که می‌خوانی اینجا می‌مانند.'}</li>`;
    document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.t === t));
  };
  main.innerHTML = `<div class="wrap fadein"><div class="page-title"><h1>نشان‌ها</h1></div>
    <div class="tabs" role="tablist"><button role="tab" data-t="saved">نشان‌شده</button><button role="tab" data-t="history">خوانده‌ها</button></div>
    <ul class="saved-list" id="sl"></ul></div>`;
  document.querySelectorAll('.tabs button').forEach((b) => b.addEventListener('click', () => draw(b.dataset.t)));
  $('#sl').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { e.preventDefault(); saved.remove(rm.dataset.rm); draw('saved'); toast('برداشته شد'); }
  });
  draw(tab);
}

/* ───────── Router ───────── */
const current = { view: '', path: '' };
function rerender() { route(true); }

async function route(keepScroll = false) {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  const [head, ...rest] = h.split('/');
  const path = clean(rest.join('/'));
  const view = head === 'p' ? 'poem' : head === 'c' ? 'cat' : head || 'home';
  const y = window.scrollY;
  current.view = view; current.path = path;
  document.body.classList.remove('immersive');
  document.title = 'شعر پارسی';
  const navKey = { home: 'home', poets: 'poets', cat: 'poets', fal: 'fal', saved: 'saved', poem: falNext === path ? 'fal' : '' }[view];
  document.querySelectorAll('.menu a').forEach((a) => (a.dataset.nav === navKey ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  setProgress(false);
  if (view !== 'poem') closePoemSheet(true);
  if (view !== 'poem') document.body.classList.remove('poet-bg');
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
  window.scrollTo(0, keepScroll ? y : 0);
  if (!keepScroll) main.focus({ preventScroll: true });
}
// Site version, shown very small in the bottom-right corner. Bump it with each release.
export const VERSION = '0.9.6';
{
  const v = document.createElement('div');
  v.className = 'site-ver'; v.setAttribute('aria-hidden', 'true');
  v.textContent = 'نسخه ' + VERSION.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
  document.body.appendChild(v);
}
let navCount = 0; // in-app navigations this visit, so "close" can step back safely
window.addEventListener('hashchange', () => {
  navCount++;
  // Back from an open poem to its own list: just lower the sheet, keep the list where it was.
  if (sheetEl && location.hash === catHref(sheetCat)) {
    sheetPushed = false; current.view = 'cat'; current.path = sheetCat;
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

/* ───────── Reading chrome: progress bar, immersive scroll, swipe & keys ───────── */
let bar;
function setProgress(on) {
  if (on && !bar) {
    bar = document.createElement('div'); bar.className = 'progress'; bar.innerHTML = '<i></i>';
    document.body.appendChild(bar);
  }
  if (bar) bar.hidden = !on;
}
let lastY = 0;
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  if (current.view === 'poem') {
    const max = document.documentElement.scrollHeight - innerHeight;
    if (bar) bar.firstChild.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 1})`;
    if (y > lastY + 6 && y > 120) document.body.classList.add('immersive');
    else if (y < lastY - 6 || y + innerHeight >= document.documentElement.scrollHeight - 40) document.body.classList.remove('immersive');
  }
  lastY = y;
}, { passive: true });

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
  else if (sp) setTimeout(() => { sp.classList.add('out'); setTimeout(() => sp.remove(), 800); }, 1500);
}
