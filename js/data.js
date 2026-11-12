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
const bundleName = (url) => `data/b/${clean(url).replace(/\//g, '~')}`;
const POS = { R: 'Right', L: 'Left', C1: 'CenteredVerse1', C2: 'CenteredVerse2', S: 'Single', P: 'Paragraph', N: 'Comment' };
function expand(p) {
  if (!p || p.Verses) return p;
  p.Verses = p.V.map(([pos, Text, CoupletIndex, SectionIndex1, CoupletSummary]) => ({ Position: POS[pos], Text, CoupletIndex, SectionIndex1, CoupletSummary }));
  delete p.V;
  return p;
}

// One name per poet, used everywhere on the site (wall, lists, poet pages, poems, share images).
export const NAMES = {
  hafez: 'حافظ شیرازی',
  saadi: 'سعدی',
  moulavi: 'مولانا جلال‌الدین محمد بلخی',
  khayyam: 'خیام نیشابوری',
  ferdousi: 'فردوسی',
  saeb: 'صائب تبریزی',
};
const named = (slug, o) => { if (o && NAMES[slug]) o.Nickname = o.Name = NAMES[slug]; return o; };
export const getManifest = () => (BUNDLED ? getLocal('data/manifest.json') : getJSON('manifest.json'))
  .then((m) => { (m.Poets || []).forEach((p) => named(clean(p.FullUrl), p)); return m; });
export const getPoet = (slug) => (BUNDLED ? getLocal(`data/p/${slug}.json`) : getJSON(`poets/${slug}/poet.json`))
  .then((p) => named(slug, p));
export async function getCat(url) {
  if (!BUNDLED) return getJSON(`poets/${clean(url)}/_cat.json`);
  return (await getLocal(`${bundleName(url)}.json`)).cat;
}
export async function getPoem(url) {
  if (!BUNDLED) return getJSON(`poets/${clean(url)}.json`);
  const parent = parentOf(url), key = clean(url).split('/').pop();
  const cat = await getCat(parent);
  const i = cat.Poems.findIndex((p) => clean(p.FullUrl) === clean(url));
  if (i < 0) throw new Error('not found');
  const n = Math.floor(i / cat._chunk);
  const body = await getLocal(`${bundleName(parent)}${n ? '.' + n : ''}.json`);
  return expand(body.poems[key]);
}

// Curated poets for the home page, in the order a reader is likely to look for them.
export const FEATURED = [
  ['hafez', NAMES.hafez], ['saadi', NAMES.saadi], ['moulavi', NAMES.moulavi], ['khayyam', NAMES.khayyam],
  ['ferdousi', NAMES.ferdousi], ['nezami', 'نظامی'], ['attar', 'عطار'], ['babataher', 'باباطاهر'],
  ['parvin', 'پروین'], ['shahriar', 'شهریار'], ['rahi', 'رهی'], ['vahshi', 'وحشی'],
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
