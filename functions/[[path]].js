// Cloudflare Pages Function: every page address of sorayesh.com (sorayesh.com/hafez/ghazal/sh1, /hafez, /poets …)
// gets the app (index.html) with that page's own title, description and canonical address written in, so search
// engines and link previews see each poem as its own page. The app itself then draws the page as before.
// Files (css, js, data, images, sitemaps…) never come here (dist/_routes.json, written by tools/build_pages.mjs).
// The titles and first couplets come from dist/seo/<book>.tsv, one small file per book, built with the site.

const SITE = 'https://sorayesh.com/';
const NAME = 'سُرایش';
// The app's own pages; the last field says whether search engines should list it.
const PAGES = {
  poets: ['همه سخنوران', 'فهرست همهٔ سخنوران شعر فارسی در سُرایش، به ترتیب الفبا یا قرن.', true],
  saved: ['کتابخانهٔ من', 'کتاب‌ها، سخنوران، شعرها و بیت‌هایی که نشان کرده‌ای.', false],
  search: ['جست‌وجو', 'جست‌وجو در همهٔ اشعار سُرایش.', false],
  fal: ['فال حافظ', 'فال حافظ در سُرایش.', false],
};
const fa = (n) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d]);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  // Anything that looks like a file (favicon.ico, sitemap-1.xml…) is served, or not found, as a file.
  if ((request.method !== 'GET' && request.method !== 'HEAD') || url.pathname === '/' || /\.[a-z0-9]+$/i.test(url.pathname)) return ctx.next();
  // One address per page: «/hafez/» → «/hafez».
  if (/.\/+$/.test(url.pathname)) return Response.redirect(`${url.origin}${url.pathname.replace(/\/+$/, '')}${url.search}`, 301);
  const shell = await env.ASSETS.fetch(new URL('/', url));
  let html = await shell.text(), status = 200;
  try {
    const page = await describe(url, env);
    if (!page) { status = 404; html = rewrite(html, { title: NAME, noindex: true }); }
    else html = rewrite(html, page);
  } catch (e) {
    // Whatever goes wrong here, the reader still gets the app as it is.
    console.error(e);
  }
  return new Response(request.method === 'HEAD' ? null : html, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=0, must-revalidate' },
  });
}

// The page's title and description (the title exactly as the app writes it on the browser tab), or null if there is no such page.
async function describe(url, env) {
  let p;
  try { p = decodeURIComponent(url.pathname); } catch { return null; }
  p = p.replace(/^\/+|\/+$/g, '');
  const seg = p.split('/'), last = seg[seg.length - 1];
  const canon = SITE + encodeURI(p);
  if (seg.length === 1 && Object.prototype.hasOwnProperty.call(PAGES, p)) {
    const [t, d, index] = PAGES[p];
    return { title: `${t} · ${NAME}`, desc: d, canon, noindex: !index };
  }
  const book = async (u, part = '') => {
    const r = await env.ASSETS.fetch(new URL(`/seo/${encodeURIComponent(u.replace(/\//g, '~'))}${part}.tsv`, url));
    return r.ok ? r.text() : null;
  };
  const shard = (u, key, k) => { let h = 0; for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return book(u, `.${h % k}`); };
  // A poet's page, or a poet's loose poems («سایر اشعار»).
  if (seg.length === 1 || (seg.length === 2 && last === '~other')) {
    const text = await book(seg[0]);
    if (!text) return null;
    const [, name, , about] = text.slice(0, text.indexOf('\n')).split('\t');
    if (seg.length === 2) return { title: `سایر اشعار · ${name} · ${NAME}`, desc: `سایر اشعار ${name} در ${NAME}.`, canon };
    return { title: `${name} · ${NAME}`, desc: about || `اشعار ${name} در ${NAME}.`, canon };
  }
  // A poem, or a book (or a part of one), found in the list of its parent book.
  const text = await book(seg.slice(0, -1).join('/'));
  if (!text) return null;
  const name = text.slice(0, text.indexOf('\n')).split('\t')[1];
  // A big book keeps its poems in k files, by a hash of the poem's name (tools/build_pages.mjs).
  const k = /\nk\t(\d+)\n/.exec(text)?.[1];
  const poems = k ? await shard(seg.slice(0, -1).join('/'), last, +k) : text;
  const row = (kind, text) => {
    const at = text.indexOf(`\n${kind}\t${last}\t`);
    if (at < 0) return null;
    const end = text.indexOf('\n', at + 1);
    return text.slice(at + 1, end < 0 ? undefined : end).split('\t');
  };
  const poem = poems && row('p', poems);
  if (poem) {
    const [, , title, line] = poem;
    return { title: `${title} · ${name} · ${NAME}`, desc: line ? `${line} — ${title}، ${name}` : `${title}، ${name}`, canon, poem: true };
  }
  const cat = row('c', text);
  if (cat) {
    const [, , title, poems, parts] = cat;
    const size = +poems ? `${fa(poems)} شعر` : `${fa(parts)} بخش`;
    return { title: `${title} · ${name} · ${NAME}`, desc: `${title}، ${name}: ${size} در ${NAME}.`, canon };
  }
  return null;
}

// Writes the page's own title, description and addresses over the home page's in index.html.
function rewrite(html, { title, desc, canon, noindex, poem }) {
  const set = (re, v) => { html = html.replace(re, (m, a, b) => `${a}${esc(v)}${b}`); };
  set(/(<title>)[^<]*(<\/title>)/, title);
  set(/(<meta property="og:title" content=")[^"]*(")/, title);
  if (desc) {
    set(/(<meta name="description" content=")[^"]*(")/, desc);
    set(/(<meta property="og:description" content=")[^"]*(")/, desc);
  }
  if (canon) {
    set(/(<link rel="canonical" href=")[^"]*(")/, canon);
    set(/(<meta property="og:url" content=")[^"]*(")/, canon);
  }
  if (poem) set(/(<meta property="og:type" content=")[^"]*(")/, 'article');
  if (noindex) html = html.replace('</head>', '  <meta name="robots" content="noindex">\n</head>');
  return html;
}
