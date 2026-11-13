// Per-device storage for settings, bookmarks and reading history.
// Every access is guarded: storage can be unavailable (private mode, blocked site data).
function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export const settings = {
  // Dark is the default; a theme saved before the reader chose one in settings is ignored.
  get() {
    const r = read('sp.settings', {});
    return { font: 'naskh', size: 1, weight: 350, harakat: true, ...r, theme: r.themeChosen ? r.theme : 'dark' };
  },
  set(patch) {
    const s = { ...this.get(), ...patch };
    write('sp.settings', s);
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
  const bg = getComputedStyle(document.body).backgroundColor;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', bg));
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

// Reading history: last 60 poems, newest first.
export const history = {
  all() { return read('sp.history', []); },
  add(item) {
    const list = this.all().filter((x) => x.url !== item.url);
    list.unshift({ ...item, at: Date.now() });
    write('sp.history', list.slice(0, 60));
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

// Backup: everything the reader made on this device, as one JSON file to carry to another device.
const BACKUP_KEYS = ['sp.settings', 'sp.saved', 'sp.bayts', 'sp.history', 'sp.wall'];
export function exportData() {
  const data = {};
  BACKUP_KEYS.forEach((k) => { const v = read(k, null); if (v !== null) data[k] = v; });
  return { app: 'sher-parsi', v: 1, at: new Date().toISOString(), data };
}
// Merges lists (nothing already here is lost); settings and chosen poets are taken from the file.
export function importData(obj) {
  if (!obj || obj.app !== 'sher-parsi' || typeof obj.data !== 'object') throw new Error('bad file');
  const d = obj.data;
  const merge = (key, id) => {
    if (!Array.isArray(d[key])) return;
    const mine = read(key, []), seen = new Set(mine.map(id));
    const all = [...mine, ...d[key].filter((x) => x && !seen.has(id(x)))];
    all.sort((a, b) => (b.at || 0) - (a.at || 0));
    write(key, key === 'sp.history' ? all.slice(0, 60) : all);
  };
  merge('sp.saved', (x) => x.url);
  merge('sp.bayts', (x) => bkey(x.url, x.i));
  merge('sp.history', (x) => x.url);
  if (d['sp.settings'] && typeof d['sp.settings'] === 'object') write('sp.settings', d['sp.settings']);
  if (Array.isArray(d['sp.wall'])) write('sp.wall', d['sp.wall']);
}
