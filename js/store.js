// Per-device storage for settings, bookmarks and reading history.
// Every access is guarded: storage can be unavailable (private mode, blocked site data).
function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

const darkQuery = matchMedia('(prefers-color-scheme: dark)');
const deviceTheme = () => (darkQuery.matches ? 'dark' : 'light');
// The device switches light/dark (e.g. at sunset) while no theme is chosen: follow it live.
export function onDeviceTheme(fn) {
  darkQuery.addEventListener?.('change', () => { if (!read('sp.settings', {}).themeChosen) { apply(); fn(settings.get().theme === 'dark'); } });
}

export const settings = {
  // Until the reader picks a theme in reading settings, the device's light/dark setting decides
  // (Navid, 2026-11-19); a theme saved before the reader chose one is ignored.
  get() {
    const r = read('sp.settings', {});
    return { font: 'naskh', size: 1, weight: 390, harakat: true, ...r, theme: r.themeChosen ? r.theme : deviceTheme() };
  },
  set(patch) {
    const s = { ...this.get(), ...patch };
    const keep = { ...s }; if (!keep.themeChosen) delete keep.theme; // don't freeze the device theme
    write('sp.settings', keep);
    apply(s);
    return s;
  },
};

export function apply(s = settings.get()) {
  const root = document.documentElement;
  if (s.theme === 'dark') root.dataset.theme = 'dark'; else delete root.dataset.theme;
  root.dataset.font = s.font === 'sans' ? 'sans' : 'naskh';
  root.style.setProperty('--poem-scale', s.size);
  root.style.setProperty('--fw-verse', s.weight);
  // The home-screen app paints its status bar from theme-color. It used to copy the page colour at that moment
  // (green on the wall, cream elsewhere), so the top changed and blurred depending on where the app opened.
  // Now always the site green, as on the wall (Navid, 2026-11-18).
  const bar = s.theme === 'dark' ? '#2f3526' : '#585e4a';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bar));
}

// Saved poems: newest first. Each: { url, title, poet, line, at }
export const saved = {
  all() { return read('sp.saved', []); },
  has(url) { return this.all().some((x) => x.url === url); },
  toggle(item) {
    const list = this.all();
    const i = list.findIndex((x) => x.url === item.url);
    if (i >= 0) list.splice(i, 1); else list.unshift({ ...item, at: Date.now() });
    write('sp.saved', list);
    return i < 0;
  },
  remove(url) { write('sp.saved', this.all().filter((x) => x.url !== url)); },
};

// Every poem ever opened (not only the last 60): the reading percent of books and poets in «کتابخانهٔ من».
export const readPoems = {
  all() { return [...new Set([...read('sp.read', []), ...read('sp.history', []).map((x) => x.url)])]; },
  add(url) { const l = read('sp.read', []); if (url && !l.includes(url)) { l.push(url); write('sp.read', l); } },
  addAll(urls) { write('sp.read', [...new Set([...read('sp.read', []), ...urls])]); },
  // «خوانده‌شده» by hand on a book (key = its href): remembers which poems it added, so «حذف از خوانده‌شده‌ها» can take back only those.
  mark(key, urls) {
    const had = new Set(this.all()), added = urls.filter((u) => !had.has(u));
    const m = read('sp.markedRead', {}); m[key] = [...new Set([...(m[key] || []), ...added])]; write('sp.markedRead', m);
    this.addAll(urls);
  },
  unmark(key, urls) {
    const m = read('sp.markedRead', {});
    // A book read to the end by itself has no record: then every poem of it leaves the read list.
    const drop = new Set(m[key] || urls);
    delete m[key]; write('sp.markedRead', m);
    write('sp.read', read('sp.read', []).filter((u) => !drop.has(u)));
    // The last 60 opened poems count as read too: without this the book would stay partly read.
    write('sp.history', read('sp.history', []).filter((x) => !drop.has(x.url)));
  },
};
// Reading history: last 60 poems, newest first.
export const history = {
  all() { return read('sp.history', []); },
  add(item) {
    const list = this.all().filter((x) => x.url !== item.url);
    list.unshift({ ...item, at: Date.now() });
    write('sp.history', list.slice(0, 60));
    readPoems.add(item.url);
  },
  seen() { return new Set(this.all().map((x) => x.url)); },
  clear() { write('sp.history', []); },
};

// Saved couplets: newest first. Each: { url, i, lines: [m1, m2], title, poet, at }
const bkey = (url, i) => `${url}#${i}`;
export const bayts = {
  all() { return read('sp.bayts', []); },
  has(url, i) { return this.all().some((x) => bkey(x.url, x.i) === bkey(url, i)); },
  toggle(item) {
    const list = this.all();
    const k = list.findIndex((x) => bkey(x.url, x.i) === bkey(item.url, item.i));
    if (k >= 0) list.splice(k, 1); else list.unshift({ ...item, at: Date.now() });
    write('sp.bayts', list);
    return k < 0;
  },
  remove(url, i) { write('sp.bayts', this.all().filter((x) => bkey(x.url, x.i) !== bkey(url, i))); },
};

// Saved books: newest first. Each: { href, title, author, at }
export const books = {
  all() { return read('sp.books', []); },
  has(href) { return this.all().some((x) => x.href === href); },
  toggle(item) {
    const list = this.all();
    const i = list.findIndex((x) => x.href === item.href);
    if (i >= 0) list.splice(i, 1); else list.unshift({ ...item, at: Date.now() });
    write('sp.books', list);
    return i < 0;
  },
};

// Books marked «خوانده‌شده» on a poet page without being in the library (Navid 2026-11-19): they still show in
// «کتابخانهٔ من» › کتاب‌ها › «خوانده‌شده‌ها». Each: { href, title, author, d, p, at }
export const doneBooks = {
  all() { return read('sp.doneBooks', []); },
  add(item) { const list = this.all().filter((x) => x.href !== item.href); list.unshift({ ...item, at: Date.now() }); write('sp.doneBooks', list); },
  remove(href) { write('sp.doneBooks', this.all().filter((x) => x.href !== href)); },
};

// Backup: everything the reader made on this device, as one JSON file to carry to another device.
const BACKUP_KEYS = ['sp.settings', 'sp.saved', 'sp.books', 'sp.bayts', 'sp.history', 'sp.read', 'sp.markedRead', 'sp.doneBooks', 'sp.wall', 'sp.resume'];
export function exportData() {
  const data = {};
  BACKUP_KEYS.forEach((k) => { const v = read(k, null); if (v !== null) data[k] = v; });
  return { app: 'sher-parsi', v: 1, at: new Date().toISOString(), data };
}
// Merges lists (nothing already here is lost); settings and chosen poets are taken from the file.
// Everything in the file is checked first: only well-formed items with plain site addresses get in,
// so a damaged or tampered file can't break the pages that list them.
const PATH = /^[A-Za-z0-9_~.-]+(\/[A-Za-z0-9_~.-]+)*$/;
const isPath = (u) => typeof u === 'string' && u.length < 300 && PATH.test(u);
const str = (v) => (typeof v === 'string' ? v.slice(0, 2000) : '');
const at = (v) => (Number.isFinite(v) ? v : 0);
const CHECK = {
  'sp.saved': (x) => isPath(x.url) && { url: x.url, title: str(x.title), poet: str(x.poet), book: str(x.book), line: str(x.line), at: at(x.at) },
  'sp.history': (x) => isPath(x.url) && { url: x.url, title: str(x.title), poet: str(x.poet), book: str(x.book), line: str(x.line), at: at(x.at) },
  'sp.bayts': (x) => isPath(x.url) && Number.isInteger(x.i) && x.i >= 0 && Array.isArray(x.lines) && x.lines.length > 0 && x.lines.length <= 8
    && { url: x.url, i: x.i, lines: x.lines.map(str), title: str(x.title), poet: str(x.poet), at: at(x.at) },
  'sp.books': (x) => isBook(x.href) && { href: x.href, title: str(x.title), author: str(x.author), at: at(x.at) },
  'sp.doneBooks': (x) => isBook(x.href) && { href: x.href, title: str(x.title), author: str(x.author), d: at(x.d), p: at(x.p), at: at(x.at) },
};
const isBook = (h) => typeof h === 'string' && h.startsWith('#/c/') && isPath(h.slice(4));
const checked = (key, list) => (Array.isArray(list) ? list.map((x) => (x && typeof x === 'object' ? CHECK[key](x) : false)).filter(Boolean) : null);
export function importData(obj) {
  if (!obj || obj.app !== 'sher-parsi' || !obj.data || typeof obj.data !== 'object') throw new Error('bad file');
  const d = obj.data;
  const merge = (key, id) => {
    const theirs = checked(key, d[key]);
    if (!theirs) return;
    const mine = read(key, []), seen = new Set(mine.map(id));
    const all = [...mine, ...theirs.filter((x) => !seen.has(id(x)))];
    all.sort((a, b) => (b.at || 0) - (a.at || 0));
    write(key, key === 'sp.history' ? all.slice(0, 60) : all);
  };
  merge('sp.saved', (x) => x.url);
  merge('sp.books', (x) => x.href);
  merge('sp.doneBooks', (x) => x.href);
  merge('sp.bayts', (x) => bkey(x.url, x.i));
  merge('sp.history', (x) => x.url);
  if (Array.isArray(d['sp.read'])) write('sp.read', [...new Set([...read('sp.read', []), ...d['sp.read'].filter(isPath)])]);
  // Which poems a hand-made «خوانده‌شده» added, per book: joined with this device's record.
  const mr = d['sp.markedRead'];
  if (mr && typeof mr === 'object' && !Array.isArray(mr)) {
    const m = read('sp.markedRead', {});
    Object.keys(mr).forEach((k) => { if (isBook(k) && Array.isArray(mr[k])) m[k] = [...new Set([...(m[k] || []), ...mr[k].filter(isPath)])]; });
    write('sp.markedRead', m);
  }
  const st = d['sp.settings'];
  if (st && typeof st === 'object' && !Array.isArray(st)) {
    const keep = {};
    if (st.font === 'sans' || st.font === 'naskh') keep.font = st.font;
    if (Number.isFinite(st.size) && st.size >= 0.5 && st.size <= 3) keep.size = st.size;
    if (Number.isFinite(st.weight) && st.weight >= 100 && st.weight <= 900) keep.weight = st.weight;
    if (typeof st.harakat === 'boolean') keep.harakat = st.harakat;
    if (st.themeChosen === true && (st.theme === 'dark' || st.theme === 'light')) { keep.themeChosen = true; keep.theme = st.theme; }
    write('sp.settings', keep);
  }
  if (Array.isArray(d['sp.wall'])) write('sp.wall', d['sp.wall'].filter((x) => isPath(x) && !x.includes('/')));
  // Reading position («ادامه خواندن»): keep whichever is newer, this device's or the file's.
  const r = d['sp.resume'];
  if (r && typeof r === 'object' && isPath(r.url) && at(r.at) > (read('sp.resume', {})?.at || 0)) write('sp.resume', { url: r.url, line: str(r.line), at: at(r.at) });
}
