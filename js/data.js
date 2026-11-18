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
function expand(p) {
  if (!p || p.Verses) return p;
  p.Verses = p.V.map(([pos, Text, CoupletIndex, SectionIndex1, CoupletSummary]) => ({ Position: POS[pos], Text, CoupletIndex, SectionIndex1, CoupletSummary }));
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
  if (!BUNDLED) return getJSON(`poets/${clean(url)}.json`);
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

async function poetFiles(slug) {
  const urls = [];
  const walk = async (url) => {
    const cat = await getCat(url);
    if (BUNDLED) {
      const base = await bundleName(url);
      for (let i = 0; i < (cat._chunks || 1); i++) urls.push(`${base}${i ? '.' + i : ''}.json`);
    } else {
      urls.push(`${DATA_BASE}poets/${clean(url)}/_cat.json`);
      (cat.Poems || []).forEach((p) => urls.push(`${DATA_BASE}poets/${clean(p.FullUrl)}.json`));
    }
    for (const c of cat.ChildCats || []) await walk(c.FullUrl);
  };
  await walk(slug);
  urls.push(BUNDLED ? `${await rootOf(slug)}p/${slug}.json` : `${DATA_BASE}poets/${slug}/poet.json`);
  return urls;
}

// onProgress(0..1). Resolves true when every file is stored.
export async function savePoet(slug, onProgress = () => {}) {
  const urls = await poetFiles(slug);
  const cache = 'caches' in self ? await caches.open(DATA_CACHE) : null;
  let done = 0, fails = 0;
  const queue = urls.slice();
  const worker = async () => {
    while (queue.length) {
      const u = queue.shift();
      try {
        if (cache) { if (!(await cache.match(u))) await cache.add(u); } else { const r = await fetch(u); if (!r.ok) throw 0; }
      } catch { fails++; }
      onProgress(++done / urls.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
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
export function coverHTML(b, author, i) {
  const h = [...b.title].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const e = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const on = bookSaved(b.href);
  // A bookmark ribbon at the top left: outline, red once the book is saved.
  const mark = `<span class="bk-mark${on ? ' on' : ''}" role="button" tabindex="0" aria-pressed="${on}" aria-label="نشان کردن کتاب" data-href="${e(b.href)}" data-title="${e(b.title)}" data-author="${e(author)}">${RIBBON}</span>`;
  return `<a class="book" href="${e(b.href)}" style="--d:${Math.min(i, 12) * 40}ms"><span class="cover c${h % 4}">${mark}<span class="frame"><b>${e(b.title)}</b><small>${e(author)}</small></span></span></a>`;
}
export function shelfHTML(groups, author, extra = '') {
  let n = 0;
  // The non-divan works read «دیگر آثار» beside divans; a lone shelf needs no heading.
  const lone = groups.length === 1;
  return groups.map((g) => `<section class="shelf">${lone ? '' : `<h3 class="shelf-h"><span>${coverEsc(g.title === 'آثار' ? 'دیگر آثار' : g.title)}</span></h3>`}<div class="books ${extra}">${g.books.map((b) => coverHTML(b, author, n++)).join('')}</div></section>`).join('');
}
const coverEsc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
