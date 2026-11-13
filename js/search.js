// Full-text search over every poem, served as static files (built by tools/build_search.py).
// Index shards (one per first two letters of a word) give line ids; text shards give the lines.
// The phone only downloads the few shards a query needs.

const BASE = 'data/s/';
const HARAKAT = /[ً-ٰٟـۖ-ۭ]/g;
const PUNCT = /[،؛؟٪-٭۔]/g;
const MAP = { 'ي': 'ی', 'ى': 'ی', 'ئ': 'ی', 'ك': 'ک', 'ة': 'ه', 'ۀ': 'ه', 'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ؤ': 'و' };
const NONWORD = /[^؀-ۿ‌0-9a-zA-Z]+/g;
const ZW = /‌/g;

export function norm(s) {
  return String(s).replace(HARAKAT, '')
    .replace(/[يىئكةۀأإآٱؤ]/g, (c) => MAP[c])
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(PUNCT, ' ').replace(NONWORD, ' ').trim();
}
const squash = (s) => s.replace(/\s+/g, '').replace(ZW, '');
const keyOf = (w) => [...w.slice(0, 2)].map((c) => c.charCodeAt(0).toString(16).padStart(4, '0')).join('-');

const cache = new Map();
function getJSON(path) {
  if (!cache.has(path)) {
    const p = fetch(BASE + path).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return cache.get(path);
}
let metaP;
const meta = () => (metaP ||= getJSON('meta.json').then((m) => ({ ...m, stopSet: new Set(m.stop), keySet: new Set(m.keys) })));

function undelta(a) { const out = new Array(a.length); let n = 0; for (let i = 0; i < a.length; i++) out[i] = n += a[i]; return out; }
function intersect(a, b) {
  const out = []; let i = 0, j = 0;
  while (i < a.length && j < b.length) { if (a[i] === b[j]) { out.push(a[i]); i++; j++; } else if (a[i] < b[j]) i++; else j++; }
  return out;
}
async function postings(m, word, prefix) {
  const k = keyOf(word);
  if (!m.keySet.has(k)) return [];
  const shard = await getJSON(`i/${k}.json`);
  if (!prefix) return shard[word] ? undelta(shard[word]) : [];
  const lists = Object.keys(shard).filter((w) => w.startsWith(word)).map((w) => undelta(shard[w]));
  if (lists.length === 1) return lists[0];
  const set = new Set(); lists.forEach((l) => l.forEach((x) => set.add(x)));
  return [...set].sort((a, b) => a - b);
}

/**
 * Prepare a query. Returns { status, more(n) } where more() yields the next n matching lines:
 * { text, url, title, poet, words }. status: 'ok' | 'short' (nothing searchable) | 'none'.
 */
export async function search(raw) {
  const m = await meta();
  const q = norm(raw);
  const typing = !/\s$/.test(raw);
  const words = q.split(/\s+/).filter(Boolean).map((w) => w.replace(ZW, '')).filter(Boolean);
  if (!words.length) return { status: 'short' };
  const last = words.length - 1;
  // Words we can look up: not too common; the last one (still being typed) as a prefix.
  const look = words.map((w, i) => ({ w, prefix: typing && i === last && w.length >= 2 }))
    .filter(({ w, prefix }) => (prefix ? true : !m.stopSet.has(w)) && w.length >= 1);
  const strong = look.filter((x) => !(x.prefix && x.w.length < 2));
  if (!strong.length || (strong.length === 1 && strong[0].prefix && strong[0].w.length < 2)) return { status: 'short' };

  // Exact words first (shorter lists), the typed prefix last.
  const lists = await Promise.all(strong.map((x) => postings(m, x.w, x.prefix)));
  lists.sort((a, b) => a.length - b.length);
  let ids = lists[0];
  for (let i = 1; i < lists.length && ids.length; i++) ids = intersect(ids, lists[i]);
  if (!ids.length) return { status: 'none' };

  const needle = squash(q);
  let pos = 0;
  async function more(n) {
    const found = [];
    while (found.length < n && pos < ids.length) {
      // Fetch the next few shards together, then check their lines in order.
      const batch = ids.slice(pos, pos + 60);
      const shards = [...new Set(batch.map((id) => Math.floor(id / m.per)))].slice(0, 6);
      const loaded = new Map(await Promise.all(shards.map((s) => getJSON(`t/${s}.json`).then((d) => [s, d]))));
      for (; pos < ids.length && found.length < n; pos++) {
        const id = ids[pos], s = Math.floor(id / m.per), d = loaded.get(s);
        if (!d) break;
        const [pi, text] = d.l[id - s * m.per];
        if (!squash(norm(text)).includes(needle)) continue;
        const [url, title, poet] = d.p[pi];
        found.push({ text, url, title, poet });
      }
    }
    return { items: found, done: pos >= ids.length };
  }
  return { status: 'ok', more, words, typing };
}

/** Wrap the words of a line that match the query in <mark>. Input is plain text; output is HTML. */
export function highlight(text, words, typing, esc) {
  const last = words.length - 1;
  return text.split(/(\s+)/).map((tok) => {
    if (/^\s+$/.test(tok)) return tok;
    const n = norm(tok).replace(ZW, '').replace(/\s/g, '');
    const hit = n && words.some((w, i) => (typing && i === last ? n.startsWith(w) : n === w) || (words.length > 1 && n.includes(w) && w.length > 2));
    return hit ? `<mark>${esc(tok)}</mark>` : esc(tok);
  }).join('');
}
