// Render a couplet as a 1080×1920 story image: portrait green in dark mode, light cream in light mode, the site logo small at the top,
// the hemistichs justified to one width in the middle, poet name and poem title at the bottom. Nothing else.
const words = (t) => t.split(/\s+/).filter(Boolean);

// Draw one hemistich stretched to width w (right-aligned start, extra space shared between words).
function justify(ctx, text, cx, y, w) {
  const ws = words(text);
  const sizes = ws.map((x) => ctx.measureText(x).width);
  const natural = sizes.reduce((a, b) => a + b, 0);
  if (ws.length < 2) { ctx.textAlign = 'center'; ctx.fillText(text, cx, y); return; }
  const gap = (w - natural) / (ws.length - 1);
  ctx.textAlign = 'right';
  let x = cx + w / 2;
  ws.forEach((t, i) => { ctx.fillText(t, x, y); x -= sizes[i] + gap; });
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
  const maxW = W - 220;
  const fading = shown.length > b - a + 1;
  // Leave room above and below the sharp couplets for the fade.
  let size = fading ? 44 : 60;
  const font = () => { ctx.font = `300 ${size}px Lateef`; };
  font();
  const widest = (ls) => Math.max(...ls.map((l) => ctx.measureText(l).width));
  while (size > 34 && widest(sharp) > maxW) { size -= 2; font(); }
  const width = Math.min(maxW, widest(sharp));
  const lh = size * 2;
  const gap = size * 0.9;
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
  const top = mid - sharpH / 2, bottom = mid + sharpH / 2;
  shown.forEach((g) => {
    g.forEach((l) => {
      const fit = lc.measureText(l).width > width ? Math.max(width, lc.measureText(l).width) : width;
      if (fit > width) { lc.save(); lc.textAlign = 'center'; lc.fillText(l, W / 2, y + lh / 2, width); lc.restore(); }
      else justify(lc, l, W / 2, y + lh / 2, width);
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
