// Search QA: sample real lines from the text shards, query them many ways, check the line comes back.
import fs from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname; // usage: node tools/check_search.mjs [lines] [seed]
globalThis.fetch = async (p) => {
  const f = ROOT + p;
  if (!fs.existsSync(f)) return { ok: false, status: 404, json: async () => ({}) };
  return { ok: true, status: 200, json: async () => JSON.parse(fs.readFileSync(f, 'utf8')) };
};
const { search, norm } = await import(ROOT + 'js/search.js');
const meta = JSON.parse(fs.readFileSync(ROOT + 'data/s/meta.json', 'utf8'));
const N = +(process.argv[2] || 400);
let seed = +(process.argv[3] || 7);
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

async function finds(q, url, text) {
  const r = await search(q);
  if (r.status !== 'ok') return r.status;
  let guard = 0;
  for (;;) {
    const { items, done } = await r.more(200);
    if (items.some((x) => x.url === url && x.text === text)) return 'hit';
    if (done || ++guard > 400) return 'miss';
  }
}
const fails = {}, totals = {};
const shards = Math.ceil(meta.lines / meta.per);
for (let k = 0; k < N; k++) {
  const s = Math.floor(rnd() * shards);
  const d = JSON.parse(fs.readFileSync(`${ROOT}data/s/t/${s}.json`, 'utf8'));
  const [pi, text] = d.l[Math.floor(rnd() * d.l.length)];
  const url = d.p[pi][0];
  const ws = text.split(/\s+/).filter(Boolean);
  if (ws.length < 3) continue;
  const qs = {
    full: text,
    fullSpace: text + ' ',
    first3: ws.slice(0, 3).join(' '),
    mid: ws.slice(1, 4).join(' '),
    last2: ws.slice(-2).join(' '),
    typing2: ws.slice(0, 2).join(' ') + ' ' + ws[2].slice(0, 2),
    typing1: ws.slice(0, 2).join(' ') + ' ' + ws[2].slice(0, 1),
    noZwnj: text.replace(/‌/g, ''),
    arabicLetters: ws.slice(0, 3).join(' ').replace(/ی/g, 'ي').replace(/ک/g, 'ك'),
    harakat: ws.slice(0, 3).join(' ').replace(/([بتدرس])/g, '$1\u064e'),
    spaces: '  ' + ws.slice(0, 3).join('   ') + '  ',
    punct: ws.slice(0, 2).join('، ') + '! ' + ws[2],
    oneRare: ws.reduce((a, b) => (b.length > a.length ? b : a), ''),
    secondHalf: ws.slice(Math.floor(ws.length / 2)).join(' '),
    zwnjAsSpace: text.replace(/‌/g, ' '),
  };
  for (const [kind, q] of Object.entries(qs)) {
    if (kind.startsWith('noZ') || kind.startsWith('zwnjA')) { if (!text.includes('‌')) continue; }
    totals[kind] = (totals[kind] || 0) + 1;
    const r = await finds(q, url, text);
    if (r !== 'hit') { (fails[kind] ||= []).push(`${r}: «${q}» ← ${url}`); }
  }
}
for (const k of Object.keys(totals)) {
  const f = fails[k] || [];
  console.log(`${k}: ${totals[k] - f.length}/${totals[k]}`);
  f.slice(0, 12).forEach((x) => console.log('   ', x));
}
