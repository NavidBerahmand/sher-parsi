// Generative book covers: every motif is drawn from a seed made of the book title + poet, so a book keeps its picture.
const W = 300, H = 420, ART = 250; // art box height (top), text below
export const PALETTES = [
  { bg: '#3d4232', ink: '#e9e4d0', ac: '#c98a5e' }, // olive + clay
  { bg: '#a9ad91', ink: '#2b2e22', ac: '#8a4630' }, // sage + rust
  { bg: '#e7e1cf', ink: '#3d4232', ac: '#b2653f' }, // cream + terracotta
  { bg: '#262b1f', ink: '#e9e4d0', ac: '#c4a05a' }, // near black + ochre
  { bg: '#8a4b33', ink: '#f1e7d3', ac: '#e3b47e' }, // rust + sand
  { bg: '#34463f', ink: '#e7e1cf', ac: '#c9a24f' }, // deep green-teal + ochre
];
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) { let a = seed; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const f = (n) => +n.toFixed(2);

// 1) Girih: 8-point stars on a grid, some cells filled with the accent colour.
function girih(r, p) {
  const n = 3 + Math.floor(r() * 2), s = W / n; let o = '';
  for (let y = 0; y * s < ART + s; y++) for (let x = 0; x < n; x++) {
    const cx = x * s + s / 2, cy = y * s + s / 2 - (ART % s) / 2, R = s * .46, k = R * .72;
    const pts = []; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8 + Math.PI / 8, rr = i % 2 ? R * .62 : R; pts.push(f(cx + rr * Math.cos(a)) + ',' + f(cy + rr * Math.sin(a))); }
    const fill = r() < .28 ? p.ac : 'none';
    o += `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${p.ink}" stroke-width="1.6"/>`;
    o += `<rect x="${f(cx - k / 2)}" y="${f(cy - k / 2)}" width="${f(k)}" height="${f(k)}" transform="rotate(45 ${f(cx)} ${f(cy)})" fill="none" stroke="${p.ink}" stroke-width="1" opacity=".55"/>`;
    o += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R * .14)}" fill="${p.ink}"/>`;
  }
  return o;
}
// 2) Eslimi: spiralling vines with leaves.
function eslimi(r, p) {
  let o = ''; const vines = 3 + Math.floor(r() * 3);
  for (let v = 0; v < vines; v++) {
    let cx = 30 + r() * 240, cy = 30 + r() * (ART - 60), a = r() * 6.28, rad = 70 + r() * 40, d = `M${f(cx + rad * Math.cos(a))},${f(cy + rad * Math.sin(a))}`; const leaves = [];
    for (let i = 1; i < 90; i++) { const t = a + i * .12, rr = rad * (1 - i / 100); const x = cx + rr * Math.cos(t), y = cy + rr * Math.sin(t); d += ` L${f(x)},${f(y)}`; if (i % 11 === 0) leaves.push([x, y, t]); }
    o += `<path d="${d}" fill="none" stroke="${p.ink}" stroke-width="2" stroke-linecap="round"/>`;
    for (const [x, y, t] of leaves) { const deg = f(t * 180 / Math.PI); o += `<path d="M0,0 C6,-10 18,-10 24,0 C18,10 6,10 0,0Z" transform="translate(${f(x)} ${f(y)}) rotate(${deg})" fill="${r() < .5 ? p.ac : p.ink}"/>`; }
    o += `<circle cx="${f(cx)}" cy="${f(cy)}" r="5" fill="${p.ac}"/>`;
  }
  return o;
}
// 3) Boteh (paisley) in rows, alternating direction.
function boteh(r, p) {
  let o = ''; const cols = 4, rows = 4, sx = W / cols, sy = ART / rows;
  const shape = 'M0,22 C-16,22 -18,2 -6,-8 C2,-16 4,-26 0,-32 C14,-24 18,-4 14,8 C10,18 6,22 0,22Z';
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const cx = x * sx + sx / 2 + (y % 2 ? sx / 4 : -sx / 4), cy = y * sy + sy / 2, flip = (x + y) % 2 ? -1 : 1, acc = r() < .35;
    o += `<g transform="translate(${f(cx)} ${f(cy)}) scale(${flip * .95} .95)"><path d="${shape}" fill="${acc ? p.ac : 'none'}" stroke="${p.ink}" stroke-width="1.6"/><path d="M0,14 C-8,14 -8,4 -3,-2" fill="none" stroke="${p.ink}" stroke-width="1.2"/><circle cx="-1" cy="8" r="2.4" fill="${p.ink}"/></g>`;
  }
  return o;
}
// 4) Cypress row, heights from the seed.
function cypress(r, p) {
  let o = `<line x1="0" y1="${ART - 18}" x2="${W}" y2="${ART - 18}" stroke="${p.ink}" stroke-width="1.4"/>`; const n = 5 + Math.floor(r() * 3), step = W / n;
  for (let i = 0; i < n; i++) {
    const cx = step * i + step / 2, h = 90 + r() * 120, w = step * .3, base = ART - 18, top = base - h, acc = r() < .3;
    o += `<path d="M${f(cx)},${f(top)} C${f(cx + w * 1.4)},${f(top + h * .45)} ${f(cx + w)},${f(base)} ${f(cx)},${f(base)} C${f(cx - w)},${f(base)} ${f(cx - w * 1.4)},${f(top + h * .45)} ${f(cx)},${f(top)}Z" fill="${acc ? p.ac : p.ink}"/>`;
    o += `<path d="M${f(cx)},${f(top + 14)} L${f(cx)},${f(base)}" stroke="${acc ? p.ink : p.bg}" stroke-width="1" opacity=".5"/>`;
  }
  for (let i = 0; i < 18; i++) o += `<circle cx="${f(r() * W)}" cy="${f(10 + r() * 70)}" r="${f(.8 + r() * 1.4)}" fill="${p.ink}" opacity=".7"/>`;
  return o;
}
// 5) Moon and stars, with rings like a turning sky.
function moon(r, p) {
  let o = ''; const cx = 70 + r() * 160, cy = 70 + r() * 90, R = 38 + r() * 14;
  for (let i = 1; i < 9; i++) o += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R + i * 22)}" fill="none" stroke="${p.ink}" stroke-width="1" opacity="${f(.6 - i * .055)}"/>`;
  o += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(R)}" fill="${p.ac}"/><circle cx="${f(cx + R * .42)}" cy="${f(cy - R * .18)}" r="${f(R * .86)}" fill="${p.bg}"/>`;
  for (let i = 0; i < 40; i++) { const x = r() * W, y = r() * ART; if (Math.hypot(x - cx, y - cy) < R + 8) continue; const s = 1 + r() * 2.4; o += `<path d="M${f(x)},${f(y - s * 2)} L${f(x + s * .5)},${f(y)} L${f(x)},${f(y + s * 2)} L${f(x - s * .5)},${f(y)}Z M${f(x - s * 2)},${f(y)} L${f(x)},${f(y + s * .5)} L${f(x + s * 2)},${f(y)} L${f(x)},${f(y - s * .5)}Z" fill="${p.ink}"/>`; }
  return o;
}
// 6) Toranj: a medallion of dot rings, like a whirling skirt seen from above.
function toranj(r, p) {
  let o = ''; const cx = W / 2, cy = ART / 2 + 4, rings = 9;
  for (let k = rings; k >= 1; k--) {
    const rr = k * 12.5, n = Math.round(rr * .55) + 4, off = r() * 6.28;
    for (let i = 0; i < n; i++) { const a = off + i * 6.28 / n, s = 1.4 + (rings - k) * .32; o += `<circle cx="${f(cx + rr * Math.cos(a))}" cy="${f(cy + rr * .92 * Math.sin(a))}" r="${f(s)}" fill="${k % 3 === 0 ? p.ac : p.ink}"/>`; }
  }
  const pts = []; for (let i = 0; i < 16; i++) { const a = i * Math.PI / 8, rr = i % 2 ? 9 : 22; pts.push(f(cx + rr * Math.cos(a)) + ',' + f(cy + rr * Math.sin(a))); }
  o += `<polygon points="${pts.join(' ')}" fill="${p.ac}"/>`;
  for (const [x, y] of [[18, 18], [W - 18, 18], [18, ART - 14], [W - 18, ART - 14]]) o += `<circle cx="${x}" cy="${y}" r="5" fill="none" stroke="${p.ink}" stroke-width="1.2"/>`;
  return o;
}
export const MOTIFS = { girih, eslimi, boteh, cypress, moon, toranj };

export function coverSVG({ title, author, motif, palette }) {
  const seed = hash(title + '|' + author), r = rng(seed);
  const p = palette ?? PALETTES[seed % PALETTES.length];
  const m = MOTIFS[motif] ?? Object.values(MOTIFS)[seed % 6];
  return { p, svg: `<svg viewBox="0 0 ${W} ${ART}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="${W}" height="${ART}" fill="${p.bg}"/>${m(r, p)}</svg>` };
}
