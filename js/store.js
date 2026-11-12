// Per-device storage for settings, bookmarks and reading history.
// Every access is guarded: storage can be unavailable (private mode, blocked site data).
function read(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

export const settings = {
  get() { return { theme: 'light', font: 'naskh', size: 1, harakat: true, ...read('sp.settings', {}) }; },
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
