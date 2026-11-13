// Render a couplet as a 1080×1920 story image: portrait green in dark mode, light cream in light mode, the site logo small at the top,
// the hemistichs justified to one width in the middle, poet name and poem title at the bottom. Nothing else.
/* Kashida (shared with the poem page): stretch letter joins with tatweel. */
const NONJOIN = new Set([...'اآأإٱدذرزژوؤةءى']);
const MARK = /[ً-ٰٟۖ-ۭ]/;
const LETTER = /[ؠ-يٮ-ۓۺ-ۿ]/;
function joinSlots(s) {
  // Positions after a letter that joins forward to the next letter, best ones first:
  // the last join of each word, then the rest from the end of the word backwards.
  const ch = [...s];
  const words = [];
  let cur = [];
  for (let i = 0; i < ch.length; i++) {
    if (!LETTER.test(ch[i]) || NONJOIN.has(ch[i]) || ch[i] === 'ـ') { if (ch[i] === ' ' || ch[i] === '‌') { if (cur.length) words.push(cur); cur = []; } continue; }
    let j = i + 1;
    while (j < ch.length && MARK.test(ch[j])) j++;
    if (j < ch.length && LETTER.test(ch[j]) && !(ch[i] === 'ل' && 'اآأإ'.includes(ch[j]))) cur.push(j);
  }
  if (cur.length) words.push(cur);
  const order = [];
  const maxLen = Math.max(0, ...words.map((w) => w.length));
  for (let k = 0; k < maxLen; k++) for (const w of words) if (w.length > k) order.push(w[w.length - 1 - k]);
  return { ch, order };
}
export function withKashida(s, n) {
  if (n <= 0) return s;
  const { ch, order } = joinSlots(s);
  if (!order.length) return s;
  const add = new Map();
  for (let k = 0; k < n; k++) { const p = order[k % order.length]; add.set(p, (add.get(p) || 0) + 1); }
  let out = '';
  for (let i = 0; i < ch.length; i++) out += 'ـ'.repeat(add.get(i) || 0) + ch[i];
  return out;
}
const words = (t) => t.split(/\s+/).filter(Boolean);

// Draw one hemistich stretched to width w around centre cx: about half the extra room goes into
// letter joins (kashida), the rest into the spaces between words.
function justify(ctx, text, cx, y, w) {
  const natural = ctx.measureText(text).width;
  if (natural >= w || words(text).length < 2) { ctx.textAlign = 'center'; ctx.fillText(text, cx, y, w); return; }
  const tw = ctx.measureText('ـ'.repeat(10)).width / 10;
  let n = Math.floor(((w - natural) * 0.55) / tw);
  let t = withKashida(text, n);
  while (n > 0 && ctx.measureText(t).width > w) t = withKashida(text, --n);
  const ws = words(t);
  const sizes = ws.map((x) => ctx.measureText(x).width);
  const gap = (w - sizes.reduce((a, b) => a + b, 0)) / (ws.length - 1);
  ctx.textAlign = 'right';
  let x = cx + w / 2;
  ws.forEach((x0, i) => { ctx.fillText(x0, x, y); x -= sizes[i] + gap; });
}

function loadImg(src) {
  return new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; });
}

export async function baytImage({ lines, poet, title, dark }) {
  return poemImage({ groups: [lines], focus: 0, poet, title, dark });
}

// groups: the poem's couplets (each an array of hemistichs). The three couplets around `focus` are sharp;
// a few more above and below fade away towards the logo and the names.
export async function poemImage({ groups, focus, poet, title, dark }) {
  const W = 1080, H = 1920;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const bg = dark ? '#2f3526' : '#f5f2e8';
  const ink = dark ? '#f3f1e7' : '#2b2e22';
  const soft = dark ? '#b9bca6' : '#7a7e69';

  await Promise.all([
    document.fonts.load('300 72px Lateef'),
    document.fonts.load('300 40px Lateef'),
  ]).catch(() => {});
  const logo = await loadImg(dark ? 'icons/logo-2.svg' : 'icons/logo.svg');

  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.direction = 'rtl';
  ctx.textBaseline = 'middle';

  // Logo, small, top centre.
  if (logo) { const lw = 120, lh = lw * 119.36 / 154.66; ctx.drawImage(logo, (W - lw) / 2, 250, lw, lh); }

  // Which couplets: the sharp three, plus up to three on each side to fade out.
  groups = groups.map((g) => g.filter((l) => l && l.trim())).filter((g) => g.length);
  focus = Math.max(0, Math.min(groups.length - 1, focus));
  const a = Math.max(0, focus - 1), b = Math.min(groups.length - 1, a + 2);
  const from = Math.max(0, a - 3), to = Math.min(groups.length - 1, b + 3);
  const shown = groups.slice(from, to + 1);
  const sharp = shown.slice(a - from, b - from + 1).flat();

  // One font size so the widest sharp hemistich fits; every hemistich justified to that width.
  const off = 46; // first hemistich sits a little right, the second a little left
  const maxW = W - 220 - 2 * off;
  const fading = shown.length > b - a + 1;
  // Leave room above and below the sharp couplets for the fade.
  let size = 58; // the same size as the single-couplet image
  const font = () => { ctx.font = `300 ${size}px Lateef`; };
  font();
  const widest = (ls) => Math.max(...ls.map((l) => ctx.measureText(l).width));
  while (size > 34 && widest(sharp) > maxW) { size -= 2; font(); }
  const width = Math.min(maxW, widest(sharp));
  const lh = size * (fading ? 1.65 : 2);
  const gap = size * (fading ? 0.55 : 0.9);
  const hOf = (g) => g.length * lh;

  // Lay the couplets out on their own layer, centred on the sharp block.
  const layer = document.createElement('canvas');
  layer.width = W; layer.height = H;
  const lc = layer.getContext('2d');
  lc.direction = 'rtl'; lc.textBaseline = 'middle'; lc.font = ctx.font; lc.fillStyle = ink;
  const sharpH = shown.slice(a - from, b - from + 1).reduce((t, g) => t + hOf(g), 0) + (b - a) * gap;
  const fadeTop = 400, fadeBottom = H - 450;
  const mid = fading ? (fadeTop + fadeBottom) / 2 : H / 2 - 40;
  let y = mid - sharpH / 2;
  for (let i = a - from - 1; i >= 0; i--) y -= hOf(shown[i]) + gap;
  // The clear band: the sharp couplets, but never more than ~55% of the room, so the fade always shows.
  const clearH = Math.min(sharpH, 0.55 * (fadeBottom - fadeTop));
  const top = mid - clearH / 2, bottom = mid + clearH / 2;
  shown.forEach((g) => {
    g.forEach((l, j) => {
      const cx = W / 2 + (g.length > 1 ? (j % 2 ? -off : off) : 0);
      justify(lc, l, cx, y + lh / 2, width);
      y += lh;
    });
    y += gap;
  });

  // Fade: fully visible over the sharp block, gone by the logo above and the names below.
  if (fading) {
    lc.globalCompositeOperation = 'destination-in';
    const gr = lc.createLinearGradient(0, fadeTop, 0, fadeBottom);
    const t0 = Math.max(0.01, (top - 10 - fadeTop) / (fadeBottom - fadeTop));
    const t1 = Math.min(0.99, (bottom + 10 - fadeTop) / (fadeBottom - fadeTop));
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(t0, 'rgba(0,0,0,1)');
    gr.addColorStop(t1, 'rgba(0,0,0,1)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    lc.fillStyle = gr;
    lc.fillRect(0, 0, W, H);
    lc.clearRect(0, 0, W, fadeTop); lc.clearRect(0, fadeBottom, W, H - fadeBottom);
  }
  ctx.drawImage(layer, 0, 0);

  // Poet name, and the poem title under it.
  ctx.textAlign = 'center';
  ctx.fillStyle = ink; ctx.font = '300 48px Lateef';
  ctx.fillText(poet || '', W / 2, H - 380);
  if (title) { ctx.fillStyle = soft; ctx.font = '300 36px Lateef'; ctx.fillText(title, W / 2, H - 310); }

  return new Promise((res) => c.toBlob(res, 'image/png'));
}

export async function shareBlob(blob, name, text) {
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text }); return 'shared'; } catch (e) { if (e.name === 'AbortError') return 'cancel'; }
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  return 'downloaded';
}
