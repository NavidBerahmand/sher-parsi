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

  // Verses: one font size so the widest hemistich fits; every hemistich justified to that width.
  const maxW = W - 220;
  let size = 60;
  ctx.font = `300 ${size}px Lateef`;
  const widest = () => Math.max(...lines.map((l) => ctx.measureText(l).width));
  while (size > 40 && widest() > maxW) { size -= 2; ctx.font = `300 ${size}px Lateef`; }
  const width = Math.min(maxW, widest());
  const lh = size * 2.1;
  const pairGap = size * 0.9;
  const total = lines.length * lh + Math.floor((lines.length - 1) / 2) * pairGap;
  let y = H / 2 - total / 2 + lh / 2 - 40;
  ctx.fillStyle = ink;
  lines.forEach((l, i) => {
    justify(ctx, l, W / 2, y, width);
    y += lh + (i % 2 && i < lines.length - 1 ? pairGap : 0);
  });

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
