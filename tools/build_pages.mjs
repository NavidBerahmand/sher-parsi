// Cloudflare build step (tools/cf-build.sh), run on dist/ once both data folders are in it:
//  • dist/seo/<book>.tsv: for every book (category) of every poet, the names, titles and first couplets the server
//    needs to give each page its own title and description (functions/[[path]].js reads one small file per page);
//  • dist/sitemap.xml + dist/sitemap-N.xml: every poet, book and poem address, for search engines;
//  • dist/_routes.json: only page addresses go to the function; files are served straight.
// Usage: node tools/build_pages.mjs dist
import fs from 'node:fs';
import path from 'node:path';

const DIST = process.argv[2] || 'dist';
const SITE = 'https://sorayesh.com/';
const read = (f) => JSON.parse(fs.readFileSync(path.join(DIST, f), 'utf8'));
const exists = (f) => fs.existsSync(path.join(DIST, f));
const clean = (u) => String(u || '').replace(/^\/+|\/+$/g, '');

// The site's own poet names (js/data.js NAMES), so titles read exactly as the app writes them.
const NAMES = {};
{
  const src = fs.readFileSync(path.join(DIST, 'js/data.js'), 'utf8');
  const block = /export const NAMES = \{([\s\S]*?)\n\};/.exec(src)[1];
  for (const m of block.matchAll(/^\s*([a-z0-9]+): '([^']*)',?$/gm)) NAMES[m[1]] = m[2];
  if (Object.keys(NAMES).length < 40) throw new Error('NAMES not found in js/data.js');
}

// The same clean-ups the app makes (js/data.js fixMarks, plainText).
const fixMarks = (s) => (typeof s === 'string' ? s.replace(/([‌ ]+)([ً-ٰٟ]+)/g, '$2$1') : s);
const ENT = { quot: '"', laquo: '«', raquo: '»', amp: '&', lt: '<', gt: '>', nbsp: ' ', zwnj: '‌', apos: "'" };
const plainText = (s) => (typeof s === 'string' && /[&<]/.test(s)
  ? s.replace(/<\/?[a-z][^>]*>?/gi, '').replace(/&(#\d+|[a-z]+);/gi, (m, e) => (e[0] === '#' ? String.fromCodePoint(+e.slice(1)) : ENT[e.toLowerCase()] ?? m))
  : s);
const one = (s) => String(s ?? '').replace(/[\t\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
const cut = (s, n) => (s.length > n ? `${s.slice(0, n).replace(/\s+\S*$/, '')}…` : s);

// A poem's description: its first couplet (or the start of its prose).
function firstLines(body) {
  if (!body?.V) return '';
  const rows = body.V.map(([pos, t]) => [pos, one(fixMarks(plainText(t)))]).filter(([, t]) => t);
  const verse = rows.filter(([pos]) => ['R', 'L', 'C1', 'C2', 'S'].includes(pos)).slice(0, 2).map(([, t]) => t);
  if (verse.length) return cut(verse.join(' / '), 150);
  const prose = rows.find(([pos]) => pos === 'P');
  return prose ? cut(prose[1], 150) : '';
}

// A big book's poems are split over several files (at most SHARD poems each, by a hash of the poem's name), so the
// server never reads more than a few dozen kilobytes for one page (Cloudflare gives a function 10 ms of work).
const SHARD = 400;
const shardOf = (key, k) => { let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % k; };

const manifest = read('data/manifest.json');
const order = [...Object.keys(NAMES), ...manifest.Poets.map((p) => clean(p.FullUrl))].filter((s, i, a) => a.indexOf(s) === i);
const rootOf = new Map(manifest.Poets.map((p) => [clean(p.FullUrl), path.posix.normalize(path.posix.join('data', p.R || './'))]));
const urls = [SITE, `${SITE}poets`];
fs.mkdirSync(path.join(DIST, 'seo'), { recursive: true });
let files = 0, poems = 0, cats = 0, noLine = 0, orphans = 0;

for (const slug of order) {
  if (!rootOf.has(slug)) continue;
  const root = rootOf.get(slug);
  const poet = read(`${root}/p/${slug}.json`);
  const name = NAMES[slug] || poet.Nickname || slug;
  const about = cut(one(poet.Description), 155);
  urls.push(SITE + encodeURI(slug));
  const walk = (url) => {
    const base = `${root}/b/${clean(url).replace(/\//g, '~')}`;
    const first = read(`${base}.json`), cat = first.cat;
    const bodies = { ...first.poems };
    for (let i = 1; i < (cat._chunks || 1); i++) Object.assign(bodies, read(`${base}.${i}.json`).poems);
    const lines = [`#\t${one(name)}\t${one(cat.Title)}\t${clean(url) === slug ? about : ''}`];
    for (const c of cat.ChildCats || []) {
      const kid = read(`${root}/b/${clean(c.FullUrl).replace(/\//g, '~')}.json`).cat;
      lines.push(`c\t${clean(c.FullUrl).split('/').pop()}\t${one(c.Title)}\t${(kid.Poems || []).length}\t${(kid.ChildCats || []).length}`);
    }
    const list = cat.Poems || [], k = Math.ceil(list.length / SHARD);
    const shards = Array.from({ length: k }, () => []);
    if (k > 1) lines.push(`k\t${k}`);
    for (const p of list) {
      const key = clean(p.FullUrl).split('/').pop(), body = bodies[key];
      const line = firstLines(body);
      if (!line) noLine++;
      const row = `p\t${key}\t${one(fixMarks(body?.Title ?? p.Title))}\t${line}`;
      if (k > 1) shards[shardOf(key, k)].push(row); else lines.push(row);
      // A few poems in Ganjoor's data name a book that doesn't exist (6, under osmani/qushayriyya/bab3): they don't open, so they aren't listed.
      if (clean(p.FullUrl).split('/').slice(0, -1).join('/') === clean(url)) urls.push(SITE + encodeURI(clean(p.FullUrl))); else orphans++;
      poems++;
    }
    const file = clean(url).replace(/\//g, '~');
    fs.writeFileSync(path.join(DIST, 'seo', `${file}.tsv`), `${lines.join('\n')}\n`);
    if (k > 1) shards.forEach((rows, i) => { fs.writeFileSync(path.join(DIST, 'seo', `${file}.${i}.tsv`), `#\n${rows.join('\n')}\n`); files++; });
    files++; cats++;
    for (const c of cat.ChildCats || []) { urls.push(SITE + encodeURI(clean(c.FullUrl))); walk(c.FullUrl); }
  };
  walk(slug);
}

// Sitemaps: at most 45,000 addresses a file (the limit is 50,000), listed in sitemap.xml at the root.
const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const PER = 45000, parts = [];
for (let i = 0; i < urls.length; i += PER) parts.push(urls.slice(i, i + PER));
parts.forEach((list, i) => fs.writeFileSync(path.join(DIST, `sitemap-${i + 1}.xml`),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${list.map((u) => `<url><loc>${xml(u)}</loc></url>`).join('\n')}\n</urlset>\n`));
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${parts.map((_, i) => `<sitemap><loc>${SITE}sitemap-${i + 1}.xml</loc><lastmod>${today}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`);

// Only page addresses run the function; every file is served as it is.
fs.writeFileSync(path.join(DIST, '_routes.json'), `${JSON.stringify({
  version: 1,
  include: ['/*'],
  exclude: ['/', '/index.html', '/css/*', '/js/*', '/fonts/*', '/icons/*', '/img/*', '/data/*', '/sher-parsi-data/*', '/seo/*',
    '/sw.js', '/manifest.webmanifest', '/robots.txt', '/sitemap.xml', '/LICENSE', '/404.html'],
}, null, 1)}\n`);

if (!exists('seo/hafez.tsv') || poems < 100000) throw new Error(`too few pages: ${poems}`);
console.log(`seo files: ${files}, books: ${cats}, poems: ${poems} (no first line: ${noLine}, not listed: ${orphans}), sitemap addresses: ${urls.length} in ${parts.length} files`);
