// Render a couplet as a 1080×1350 image (good for stories and feeds) and share or download it.
function wrap(ctx, text, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

export async function baytImage({ lines, poet, title, dark }) {
  const W = 1080, H = 1350;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const bg = dark ? '#1d1f18' : '#f5f2e8';
  const ink = dark ? '#f1eee4' : '#2b2e22';
  const muted = dark ? '#a3a690' : '#7a7e69';
  const gold = dark ? '#a9af8e' : '#585e4a';

  await Promise.all([
    document.fonts.load('500 60px Lateef'),
    document.fonts.load('300 30px Lateef'),
    document.fonts.load('500 34px Lateef'),
  ]).catch(() => {});

  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  // Thin double frame
  ctx.strokeStyle = gold; ctx.globalAlpha = .55; ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, W - 112, H - 112);
  ctx.globalAlpha = .25; ctx.strokeRect(72, 72, W - 144, H - 144);
  ctx.globalAlpha = 1;

  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Prefer each hemistich on a single line: shrink to fit the widest one.
  ctx.font = '500 64px Lateef';
  const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
  let size = Math.max(40, Math.min(64, Math.floor((64 * (W - 260)) / widest)));
  let rendered;
  // Shrink until all lines fit.
  for (; size >= 36; size -= 4) {
    ctx.font = `500 ${size}px Lateef`;
    rendered = lines.flatMap((l, i) => [...wrap(ctx, l, W - 260).map((t) => ({ t })), ...(i < lines.length - 1 ? [{ gap: true }] : [])]);
    const h = rendered.reduce((a, r) => a + (r.gap ? size * .9 : size * 1.9), 0);
    if (h < H - 520) break;
  }
  const lh = size * 1.9;
  const total = rendered.reduce((a, r) => a + (r.gap ? size * .9 : lh), 0);
  let y = H / 2 - total / 2 - 30 + lh / 2;
  ctx.fillStyle = ink;
  for (const r of rendered) {
    if (r.gap) { y += size * .9; continue; }
    ctx.fillText(r.t, W / 2, y);
    y += lh;
  }

  // Ornament
  ctx.strokeStyle = gold; ctx.lineWidth = 2;
  const oy = H - 300;
  ctx.beginPath(); ctx.moveTo(W / 2 - 70, oy); ctx.lineTo(W / 2 - 14, oy); ctx.moveTo(W / 2 + 14, oy); ctx.lineTo(W / 2 + 70, oy); ctx.stroke();
  ctx.save(); ctx.translate(W / 2, oy); ctx.rotate(Math.PI / 4); ctx.strokeRect(-6, -6, 12, 12); ctx.restore();

  ctx.fillStyle = ink; ctx.font = '500 38px Lateef';
  ctx.fillText(poet || '', W / 2, oy + 60);
  ctx.fillStyle = muted; ctx.font = '300 28px Lateef';
  if (title) ctx.fillText(title, W / 2, oy + 110);
  ctx.fillStyle = gold; ctx.font = '500 26px Lateef';
  ctx.fillText('شعر پارسی', W / 2, H - 110);

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
