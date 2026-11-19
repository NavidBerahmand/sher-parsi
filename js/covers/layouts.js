// Layouts place an emblem on the art box (300 x 250); backgrounds draw a faint pattern under it.
import { EMBLEMS } from './emblems.js';
const W = 300, A = 250, f = (n) => +n.toFixed(2);
const put = (e, x, y, s, rot, a, b, bg, r) => `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(s)})">${EMBLEMS[e](a, b, bg, r)}</g>`;

export const LAYOUTS = {
  center: (e, p, r) => put(e, W / 2, A / 2 + 4, 1.75, 0, p.ac, p.ink, p.bg, r),
  crop: (e, p, r) => put(e, W * (.3 + r() * .4), A * (.55 + r() * .2), 3.4, -20 + r() * 40, p.ac, p.ink, p.bg, r),
  grid: (e, p, r) => { const n = 3 + Math.floor(r() * 2), s = W / n; let o = ''; for (let y = 0; y * s < A; y++) for (let x = 0; x < n; x++) o += put(e, x * s + s / 2, y * s + s / 2 + (A % s) / 2 - s / 2 + s / 2, s / 125, 0, r() < .3 ? p.ac : p.ink, r() < .3 ? p.ac : p.bg, p.bg, r); return o; },
  halfdrop: (e, p, r) => { const n = 4, s = W / n; let o = ''; for (let y = -1; y * s * .85 < A + s; y++) for (let x = 0; x <= n; x++) o += put(e, x * s + (y % 2 ? s / 2 : 0), y * s * .85 + s / 2, s / 135, (y % 2 ? 180 : 0), (x + y) % 3 ? p.ink : p.ac, p.bg, p.bg, r); return o; },
  row: (e, p, r) => { const n = 4 + Math.floor(r() * 3), s = W / n; let o = `<line x1="0" y1="${A - 22}" x2="${W}" y2="${A - 22}" stroke="${p.ink}" stroke-width="1.4"/>`; for (let i = 0; i < n; i++) { const k = (s / 105) * (.8 + r() * .7); o += put(e, i * s + s / 2, A - 22 - 50 * k, k, 0, r() < .35 ? p.ac : p.ink, p.bg, p.bg, r); } return o; },
  scatter: (e, p, r) => { let o = ''; const pts = []; for (let t = 0; t < 200 && pts.length < 11; t++) { const x = 20 + r() * 260, y = 20 + r() * 210, s = .28 + r() * .32; if (pts.every(([u, v, w]) => Math.hypot(u - x, v - y) > (w + s) * 55)) pts.push([x, y, s]); } for (const [x, y, s] of pts) o += put(e, x, y, s, -40 + r() * 80, r() < .4 ? p.ac : p.ink, p.bg, p.bg, r); return o; },
  ring: (e, p, r) => { const n = 8 + Math.floor(r() * 5), R = 82; let o = put(e, W / 2, A / 2, .8, 0, p.ac, p.ink, p.bg, r); for (let i = 0; i < n; i++) { const t = i * 6.283 / n; o += put(e, W / 2 + R * Math.cos(t), A / 2 + R * Math.sin(t), .32, t * 180 / Math.PI + 90, p.ink, p.bg, p.bg, r); } return o; },
  band: (e, p, r) => { const y0 = A * (.22 + r() * .12), h = A * .46; let o = `<rect x="0" y="${f(y0)}" width="${W}" height="${f(h)}" fill="${p.ac}"/>`; const n = 3, s = W / n; for (let i = 0; i < n; i++) o += put(e, i * s + s / 2, y0 + h / 2, h / 125, 0, p.ink, p.ac, p.ac, r); o += `<line x1="0" y1="${f(y0 - 7)}" x2="${W}" y2="${f(y0 - 7)}" stroke="${p.ink}" stroke-width="1.2"/><line x1="0" y1="${f(y0 + h + 7)}" x2="${W}" y2="${f(y0 + h + 7)}" stroke="${p.ink}" stroke-width="1.2"/>`; return o; },
};
export const BGS = {
  none: () => '',
  dots: (p, r) => { let o = ''; const s = 14 + Math.floor(r() * 8); for (let y = s / 2; y < A; y += s) for (let x = s / 2; x < W; x += s) o += `<circle cx="${x}" cy="${y}" r="1.3" fill="${p.ink}"/>`; return `<g opacity=".28">${o}</g>`; },
  rings: (p, r) => { let o = ''; const cx = r() * W, cy = r() * A; for (let i = 1; i < 16; i++) o += `<circle cx="${f(cx)}" cy="${f(cy)}" r="${i * 22}" fill="none" stroke="${p.ink}" stroke-width="1"/>`; return `<g opacity=".25">${o}</g>`; },
  rays: (p) => { let o = ''; for (let i = 0; i < 48; i++) { const t = i * Math.PI / 24; o += `<line x1="${W / 2}" y1="${A / 2}" x2="${f(W / 2 + 300 * Math.cos(t))}" y2="${f(A / 2 + 300 * Math.sin(t))}" stroke="${p.ink}" stroke-width="1"/>`; } return `<g opacity=".22">${o}</g>`; },
  stripes: (p, r) => { let o = ''; const s = 10 + Math.floor(r() * 8); for (let x = -A; x < W; x += s) o += `<line x1="${x}" y1="${A}" x2="${x + A}" y2="0" stroke="${p.ink}" stroke-width="1"/>`; return `<g opacity=".18">${o}</g>`; },
  lattice: (p, r) => { let o = ''; const s = 26 + Math.floor(r() * 14); for (let y = 0; y < A + s; y += s) for (let x = 0; x < W + s; x += s) o += `<polygon points="${x},${y - s / 2} ${x + s / 2},${y} ${x},${y + s / 2} ${x - s / 2},${y}" fill="none" stroke="${p.ink}" stroke-width="1"/>`; return `<g opacity=".22">${o}</g>`; },
  waves: (p, r) => { let o = ''; const amp = 4 + r() * 4; for (let y = 10; y < A; y += 16) { let d = `M0,${y}`; for (let x = 0; x <= W; x += 6) d += ` L${x},${f(y + amp * Math.sin(x / 24))}`; o += `<path d="${d}" fill="none" stroke="${p.ink}" stroke-width="1"/>`; } return `<g opacity=".22">${o}</g>`; },
  stars: (p, r) => { let o = ''; for (let i = 0; i < 46; i++) { const x = r() * W, y = r() * A, s = 1 + r() * 2; o += `<path d="M${f(x)},${f(y - s * 2)} L${f(x + s * .5)},${f(y)} L${f(x)},${f(y + s * 2)} L${f(x - s * .5)},${f(y)}Z M${f(x - s * 2)},${f(y)} L${f(x)},${f(y + s * .5)} L${f(x + s * 2)},${f(y)} L${f(x)},${f(y - s * .5)}Z" fill="${p.ink}"/>`; } return `<g opacity=".55">${o}</g>`; },
};
