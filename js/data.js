// Data layer: the public Ganjoor data set (github.com/ganjoor/ganjoor-data),
// served as static JSON through jsDelivr. Pinned to a commit so responses are
// immutable and safe to cache forever (offline reading).
export const DATA_SHA = '05d7bc88cca1fe5b95eb7038d4af2d271b320ab3';
export const DATA_BASE = `https://cdn.jsdelivr.net/gh/ganjoor/ganjoor-data@${DATA_SHA}/`;

const mem = new Map();

export async function getJSON(path) {
  if (mem.has(path)) return mem.get(path);
  const p = fetch(DATA_BASE + path).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });
  mem.set(path, p);
  p.catch(() => mem.delete(path));
  return p;
}

// FullUrl values look like "/hafez/ghazal/sh1".
export const clean = (u) => String(u || '').replace(/^\/+|\/+$/g, '');
export const parentOf = (url) => clean(url).split('/').slice(0, -1).join('/');

// Bundled mode: a self-contained build that ships a subset of poets as local files
// (data/), grouped one file per book plus 250-poem chunks. Used where the CDN is unreachable.
export const BUNDLED = !!document.querySelector('meta[name="sp-bundled"]');
const local = new Map();
function getLocal(path) {
  if (!local.has(path)) {
    const p = fetch(path).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); });
    local.set(path, p); p.catch(() => local.delete(path));
  }
  return local.get(path);
}
// Each poet's files live under a data root: 'data/' here, or another folder named in the manifest ("R"),
// e.g. a second GitHub Pages site on the same host that holds the poets that don't fit in this one.
let roots = null;
const rootOf = async (slug) => {
  if (!roots) roots = getLocal('data/manifest.json').then((m) => new Map((m.Poets || []).map((p) => [clean(p.FullUrl), p.R || 'data/'])));
  return (await roots).get(slug) || 'data/';
};
const bundleName = async (url) => `${await rootOf(clean(url).split('/')[0])}b/${clean(url).replace(/\//g, '~')}`;
const POS = { R: 'Right', L: 'Left', C1: 'CenteredVerse1', C2: 'CenteredVerse2', S: 'Single', P: 'Paragraph', N: 'Comment' };
// Ganjoor's text sometimes puts a half-space (or a space) before a vowel mark: «دل‌ِ», «درباره‌ٔ».
// The mark then has no letter to sit on, and iPhone draws it on a dotted circle. Put the mark first (Navid 2026-11-19).
export const fixMarks = (s) => (typeof s === 'string' ? s.replace(/([\u200c ]+)([\u064b-\u065f\u0670]+)/g, '$2$1') : s);
function fixPoem(p) {
  if (!p) return p;
  p.Title = fixMarks(p.Title);
  (p.Verses || []).forEach((v) => { v.Text = fixMarks(v.Text); });
  return p;
}
function expand(p) {
  if (!p || p.Verses) return p;
  p.Verses = p.V.map(([pos, Text, CoupletIndex, SectionIndex1, CoupletSummary]) => ({ Position: POS[pos], Text: fixMarks(Text), CoupletIndex, SectionIndex1, CoupletSummary }));
  p.Title = fixMarks(p.Title);
  delete p.V;
  return p;
}

// One name per poet, used everywhere on the site (wall, lists, poet pages, poems, share images).
export const NAMES = {
  moulavi: 'مولانا',
  saadi: 'سعدی شیرازی',
  hafez: 'حافظ شیرازی',
  khayyam: 'خیام',
  ferdousi: 'فردوسی',
  attar: 'عطار نیشابوری',
  saeb: 'صائب تبریزی',
  parvin: 'پروین اعتصامی',
  shahriar: 'شهریار',
  vahshi: 'وحشی بافقی',
  bahar: 'ملک‌الشعرا بهار',
  bidel: 'بیدل دهلوی',
  sanaee: 'سنایی غزنوی',
  shahnematollah: 'شاه نعمت‌الله ولی',
  rahi: 'رهی معیری',
  nezami: 'نظامی گنجوی',
  babataher: 'باباطاهر',
  abusaeed: 'ابوسعید ابوالخیر',
  khaghani: 'خاقانی شروانی',
  iraj: 'ایرج میرزا',
  iqbal: 'اقبال لاهوری',
  roodaki: 'رودکی سمرقندی',
  jami: 'جامی',
  forooghi: 'فروغی بسطامی',
  eraghi: 'عراقی',
  bahaee: 'شیخ بهایی',
  anvari: 'انوری ابیوردی',
  naserkhosro: 'ناصرخسرو قبادیانی',
  khajoo: 'خواجوی کرمانی',
  shabestari: 'شیخ محمود شبستری',
  khosro: 'امیرخسرو دهلوی',
  obeyd: 'عبید زاکانی',
  eshghi: 'میرزاده عشقی',
  feyz: 'فیض کاشانی',
  abdullah: 'خواجه عبدالله انصاری',
  seyf: 'سیف فرغانی',
  aref: 'عارف قزوینی',
  hatef: 'هاتف اصفهانی',
  mohtasham: 'محتشم کاشانی',
  ouhadi: 'اوحدی مراغه‌ای',
  yazdi: 'فرخی یزدی',
  jahan: 'جهان ملک خاتون',
  farrokhi: 'فرخی سیستانی',
  manoochehri: 'منوچهری دامغانی',
};
// Ganjoor's home page «دسته‌بندی بر اساس قرن»: each century and its poets in Ganjoor's order (ganjoor.net, 2026-11-18).
export const CENTURIES = [
  ['قرن سوم', 'soghdi,gorgani,bassam,hanzale,roodaki,firooz,mokhallad,vasif,varragh'],
  ['قرن چهارم', 'abueshagh,abolhoseyn,abolala,abolmoayyed,bolmasal,abusaeed,mosabi,barmaki,balami,kashi,jollab,daghighi,rownaghi,sepehri,shaker,shahid,sane,tokhari,onsori,ayyooghi,faralavi,ferdousi,kesayee,moradi,masoudi'],
  ['قرن پنجم', 'rooni,beyhaghi,osmani,azraghi,asadi,amir,iranshan,babataher,abdullah,khayyam,nashenas,sanaee,asjadi,amagh,keikavus,ghazzali,asad,farrokhi,ghatran,labibi,masood,manoochehri,naserkhosro,hojviri'],
  ['قرن ششم', 'akhsikati,saber,afzal,anvari,ouhad,babaafzal,baha,jamal,hamid,khaghani,rn,ghomri,soozani,hasan,zahir,zahiri,ayeshe,abbadi,gilani,jabali,mokhtari,attar,emadi,eynolghozat,falaki,ghavami,beylaghani,mmon,mahsati,meybodi,monshi,nezami,aroozi,vatvat'],
  ['قرن هفتم', 'emami,hoseyni,khosro,nezari,khajenasir,varavini,saadi,valad,eraghi,kamal,hamgar,moulavi,bajeyee,daye,homam'],
  ['قرن هشتم', 'ebneemad,ebneyamin,ouhadi,jalal,joneyd,jahan,hafez,heydar,khajoo,rooh,salman,seyf,shahnematollah,maghrebi,shabestari,obeyd,ghasem,khojandi,koosaj,naser,nasimi'],
  ['قرن نهم', 'ebnehesam,asiri,shahi,fani,jami,hoseyn,khiali,jarooni,soofi,koohi,ghari'],
  ['قرن دهم', 'ahli,faghani,razi,sam,shahedi,bahaee,orfi,fozooli,mohtasham,meyli,naziri,vahshi,helali'],
  ['قرن یازدهم', 'abolhasan,shahrestani,pazevari,bidel,jooya,bahoo,salim,nasafi,saeb,taleb,toghra,ghani,fasihi,fayyaz,feyz,ghodsi,kalim,majzoob,masih,mir,nowras,nouee,vaez,vahid'],
  ['قرن دوازدهم', 'azar,hazin,rafigh,saeeda,tabib,ghassab,moshtagh,noorali,waqif,hatef'],
  ['قرن سیزدهم', 'ashofte,eshraghb,kermani,elhami,bolandeghbal,torki,jeyhoon,asrar,khaled,rashhe,rhedayat,saaghar,sahab,shater,samet,safa,safayee,safi,omman,ghaleb,ghobar,fayez,fathalishah,forooghi,ghaani,ghaemmagham,mohit,naraghi,aghakhan,habib,neshat,frasheri,nayyer,vahdat,shooshtari,mahabadi,yaghma'],
  ['قرن چهاردهم', 'ayatib,adib,afsar,iqbal,iraj,parvin,hajeb,khalili,rahi,shahriar,hamedani,saghir,toghrol,aref,fosooli,ashtari,emad,moftagher,yazdi,fanoodi,bahar,eshghi,khusfi'],
].map(([title, s]) => [title, s.split(',')]);
// The poets on the site, ranked by readership (Ganjoor recitations and comments + Persian Wikipedia views); lists follow this order.
export const TOP = Object.keys(NAMES);
// Ganjoor's short name for every poet in the manifest (filled when it loads); NAMES wins where it has one.
export const NICK = new Map();
// A poet's portrait; poets without one get the faceless plaster bust (img/poets/blank, Navid 2026-11-19).
export const portrait = (slug, dark) => `img/poets/${TOP.includes(slug) ? slug : 'blank'}${dark ? '-dark' : ''}.webp`;
const named = (slug, o) => { if (o && NAMES[slug]) o.Nickname = o.Name = NAMES[slug]; return o; };
export const getManifest = () => (BUNDLED ? getLocal('data/manifest.json') : getJSON('manifest.json'))
  .then((m) => {
    const by = new Map((m.Poets || []).map((p) => [clean(p.FullUrl), p]));
    by.forEach((p, s) => NICK.set(s, p.Nickname));
    // The named poets first, in readership order; then everyone else, in the order the manifest lists them.
    m.Poets = [...TOP.filter((s) => by.has(s)).map((s) => named(s, by.get(s))), ...(m.Poets || []).filter((p) => !NAMES[clean(p.FullUrl)])];
    return m;
  });
export const getPoet = (slug) => (BUNDLED ? rootOf(slug).then((r) => getLocal(`${r}p/${slug}.json`)) : getJSON(`poets/${slug}/poet.json`))
  .then((p) => named(slug, p));
export async function getCat(url) {
  if (!BUNDLED) return getJSON(`poets/${clean(url)}/_cat.json`);
  return (await getLocal(`${await bundleName(url)}.json`)).cat;
}
export async function getPoem(url) {
  if (!BUNDLED) return getJSON(`poets/${clean(url)}.json`).then(fixPoem);
  const parent = parentOf(url), key = clean(url).split('/').pop();
  const cat = await getCat(parent);
  const i = cat.Poems.findIndex((p) => clean(p.FullUrl) === clean(url));
  if (i < 0) throw new Error('not found');
  const n = Math.floor(i / cat._chunk);
  const body = await getLocal(`${await bundleName(parent)}${n ? '.' + n : ''}.json`);
  return expand(body.poems[key]);
}

// Whole-poet offline copy: every data file of one poet goes into the same cache the
// service worker reads from, so the poet opens with no connection.
export const DATA_CACHE = 'sp-data-v1';
const SAVED_KEY = 'sp.savedPoets';
const savedSet = () => { try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY)) || []); } catch { return new Set(); } };
export const isPoetSaved = (slug) => savedSet().has(slug);

// Lists every data file of a poet, calling found(url) as soon as each one is known.
async function poetFiles(slug, found = () => {}, books = () => {}) {
  const urls = [];
  const add = (u) => { urls.push(u); found(u); };
  const walk = async (url, top, tick) => {
    const cat = await getCat(url);
    if (BUNDLED) {
      const base = await bundleName(url);
      for (let i = 0; i < (cat._chunks || 1); i++) add(`${base}${i ? '.' + i : ''}.json`);
    } else {
      add(`${DATA_BASE}poets/${clean(url)}/_cat.json`);
      (cat.Poems || []).forEach((p) => add(`${DATA_BASE}poets/${clean(p.FullUrl)}.json`));
    }
    let i = 0;
    for (const c of cat.ChildCats || []) { await walk(c.FullUrl); if (top) tick(++i, top.length); }
  };
  // books(done, total): how many of the poet's top-level books are listed so far.
  const root = await getCat(slug), kids = root.ChildCats || [];
  books(0, kids.length);
  await walk(slug, kids, books);
  add(BUNDLED ? `${await rootOf(slug)}p/${slug}.json` : `${DATA_BASE}poets/${slug}/poet.json`);
  return urls;
}

// onProgress(0..1, bytes stored so far, whole size or 0). Files are stored while the poet's books are still being
// listed, so the size grows from the first moment; the fill never goes backwards. Resolves true when every file is stored.
export async function savePoet(slug, onProgress = () => {}) {
  // Whole size, worked out once by tools/poet_sizes.py (manifest "S"); 0 when unknown.
  const total = BUNDLED ? ((await getLocal('data/manifest.json')).Poets || []).find((p) => clean(p.FullUrl) === slug)?.S || 0 : 0;
  onProgress(0, 0, total);
  const cache = 'caches' in self ? await caches.open(DATA_CACHE) : null;
  let found = 0, done = 0, fails = 0, bytes = 0, listing = true, shown = 0, active = 0, booksDone = 0, booksAll = 0;
  const waiting = [], jobs = [];
  const size = async (r) => { try { return (await r.clone().blob()).size; } catch { return 0; } };
  const report = () => {
    const f = total ? Math.min(1, bytes / total) : listing ? 0.92 * (booksAll ? booksDone / booksAll : 0) * (done / Math.max(found, 1)) : done / Math.max(found, 1);
    shown = Math.max(shown, f); onProgress(shown, bytes, total);
  };
  const store = async (u) => {
    try {
      const hit = cache && await cache.match(u);
      if (hit) { const n = await size(hit); bytes += n; }
      else {
        const r = await fetch(u); if (!r.ok) throw 0;
        const n = await size(r); bytes += n; // read the size first: «bytes += await …» would lose sizes counted meanwhile
        if (cache) await cache.put(u, r);
      }
    } catch { fails++; }
    done++; report();
  };
  // At most 6 files at a time.
  const run = (u) => new Promise((resolve) => {
    const go = async () => { active++; await store(u); active--; resolve(); waiting.shift()?.(); };
    if (active < 6) go(); else waiting.push(go);
  });
  await poetFiles(slug, (u) => { found++; jobs.push(run(u)); }, (n, all) => { booksDone = n; booksAll = all; report(); });
  listing = false; report();
  await Promise.all(jobs);
  if (fails) return false;
  const s = savedSet(); s.add(slug);
  try { localStorage.setItem(SAVED_KEY, JSON.stringify([...s])); } catch { /* ignore */ }
  return true;
}

// Curated poets for the home page, in the order a reader is likely to look for them.
export const FEATURED = [
  ['hafez', NAMES.hafez], ['saadi', NAMES.saadi], ['moulavi', NAMES.moulavi], ['khayyam', NAMES.khayyam],
  ['ferdousi', NAMES.ferdousi], ['nezami', NAMES.nezami], ['attar', NAMES.attar], ['babataher', NAMES.babataher],
  ['parvin', NAMES.parvin], ['shahriar', NAMES.shahriar], ['rahi', NAMES.rahi], ['vahshi', NAMES.vahshi],
];

// Pools for "poem of the day" and "random poem": short forms read best on a phone.
export const DAILY_POOL = [
  'hafez/ghazal', 'saadi/divan/ghazals', 'khayyam/robaee', 'babataher/2beytiha',
  'moulavi/shams/ghazalsh', 'hafez/ghazal', 'saadi/divan/robaees', 'moulavi/shams/robaeesh',
];

// Group raw Verses into renderable blocks: couplets, centred pairs, single lines, prose.
export function blocks(poem) {
  const out = [];
  let cur = null;
  let lastSection = null;
  for (const v of poem.Verses || []) {
    if (lastSection !== null && v.SectionIndex1 !== lastSection && out.length) out.push({ kind: 'break' });
    lastSection = v.SectionIndex1;
    switch (v.Position) {
      case 'Right':
        cur = { kind: 'bayt', m: [v.Text], idx: v.CoupletIndex, sum: v.CoupletSummary };
        out.push(cur);
        break;
      case 'Left':
        if (cur && cur.kind === 'bayt' && cur.m.length === 1) cur.m.push(v.Text);
        else out.push({ kind: 'bayt', m: ['', v.Text], idx: v.CoupletIndex, sum: v.CoupletSummary });
        cur = null;
        break;
      case 'CenteredVerse1':
        cur = { kind: 'center', m: [v.Text], idx: v.CoupletIndex, sum: v.CoupletSummary };
        out.push(cur);
        break;
      case 'CenteredVerse2':
        if (cur && cur.kind === 'center' && cur.m.length === 1) cur.m.push(v.Text);
        else out.push({ kind: 'center', m: [v.Text], idx: v.CoupletIndex });
        cur = null;
        break;
      case 'Single':
        out.push({ kind: 'single', m: [v.Text], idx: v.CoupletIndex, sum: v.CoupletSummary });
        cur = null;
        break;
      case 'Paragraph':
        out.push({ kind: 'prose', text: v.Text, idx: v.CoupletIndex });
        cur = null;
        break;
      default:
        out.push({ kind: 'note', text: v.Text });
        cur = null;
    }
  }
  return out;
}

// Small, stable hash for picking "today's" poem.
export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* A poet's shelf: works grouped for display as book covers.
   A work whose parts are verse forms (a divan: غزلیات، قصاید…) becomes its own titled group with a cover per part;
   every other work (a masnavi, a book of prose, a single collection) is one cover in the «آثار» group. */
const FORMS = /غزل|قصا?ید|قصیده|رباعی|قطعات|قطعه|ترجیع|ترکیب|مسمط|مثنوی|مثنویات|مستدرک|ملحقات|مفردات|مراثی|دوبیتی|اشعار|منتسب|تصنیف|مستزاد|چکامه|سایر/;
const catUrl = (u) => String(u).replace(/^\/+/, '');
export async function shelf(poetCat) {
  // One cover per work (Navid, 2026-11-13): a divan is one book, its parts are listed inside it.
  const kids = poetCat.ChildCats || [];
  const books = kids.map((c) => ({ href: `#/c/${catUrl(c.FullUrl)}`, title: c.Title }));
  if (kids.length && (poetCat.Poems || []).length) books.push({ href: `#/c/${catUrl(poetCat.FullUrl || '')}/~other`, title: 'سایر اشعار' });
  return books.length ? [{ title: 'آثار', books }] : [];
}
// Whether a book is bookmarked; set by the app (store lives there), so covers draw their ribbon filled.
let bookSaved = () => false;
export function setBookSaved(fn) { bookSaved = fn; }
const RIBBON = '<svg viewBox="0 0 14 22" aria-hidden="true"><path d="M1 0v20.5l6-4.6 6 4.6V0"/></svg>';
// Book covers (Navid, 2026-11-18): the top of each cover is a Persian motif drawn by js/covers/ (loaded only when a page has covers),
// on one of these grounds; the bottom is a cream band with the title. Design and palette come from the title + poet, so a book keeps its cover;
// on a shelf no two books share a design. A saved book stores its design, so «کتابخانهٔ من» shows the same cover.
export const PALETTES = [
  { bg: '#3d4232', ink: '#e9e4d0', ac: '#c98a5e' }, { bg: '#a9ad91', ink: '#2b2e22', ac: '#8a4630' }, { bg: '#c29b57', ink: '#2b2e22', ac: '#f1e7d3' },
  { bg: '#262b1f', ink: '#e9e4d0', ac: '#c4a05a' }, { bg: '#8a4b33', ink: '#f1e7d3', ac: '#e3b47e' }, { bg: '#34463f', ink: '#e7e1cf', ac: '#c9a24f' },
];
export const NDESIGNS = 60; // must match DESIGNS.length in js/covers/covergen.js
const coverHash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
function coverPick(b, author) {
  const s = coverHash(b.title + '|' + author);
  return { s, d: b.d != null ? +b.d : s % NDESIGNS, p: b.p != null ? +b.p : (s >>> 8) % PALETTES.length };
}
export function coverHTML(b, author, i, after = '') {
  const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const on = bookSaved(b.href);
  const { s, d, p } = coverPick(b, author), pal = PALETTES[p];
  // A bookmark ribbon at the top left: outline, red once the book is saved.
  const mark = `<span class="bk-mark${on ? ' on' : ''}" role="button" tabindex="0" aria-pressed="${on}" aria-label="نشان کردن کتاب" data-href="${e(b.href)}" data-title="${e(b.title)}" data-author="${e(author)}" data-d="${d}" data-p="${p}">${RIBBON}</span>`;
  return `<a class="book" href="${e(b.href)}" style="--d:${Math.min(i, 12) * 40}ms"><span class="cover" style="--cloth:${pal.bg};--ink-c:${pal.ink}">${mark}<span class="art" data-d="${d}" data-p="${p}" data-s="${s}"></span><span class="frame"><b>${e(b.title)}</b><small>${e(author)}</small></span></span>${after}</a>`;
}
export function shelfHTML(groups, author, extra = '') {
  let n = 0;
  // No design twice on one poet's page, and no two neighbours in the same colour.
  const used = new Set(); let prevP = -1;
  const place = (b) => {
    let { d, p } = coverPick(b, author);
    for (let k = 0; used.has(d) && k < NDESIGNS; k++) d = (d + 7) % NDESIGNS;
    used.add(d);
    if (p === prevP) p = (p + 1) % PALETTES.length;
    prevP = p;
    return { ...b, d, p };
  };
  // The non-divan works read «دیگر آثار» beside divans; a lone shelf needs no heading.
  const lone = groups.length === 1;
  return groups.map((g) => `<section class="shelf">${lone ? '' : `<h3 class="shelf-h"><span>${coverEsc(g.title === 'آثار' ? 'دیگر آثار' : g.title)}</span></h3>`}<div class="books ${extra}">${g.books.map((b) => coverHTML(place(b), author, n++)).join('')}</div></section>`).join('');
}
const coverEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
