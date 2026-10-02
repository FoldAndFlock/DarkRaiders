// Pixel-art toolkit for item icons: a tiny indexed "pixel buffer" with shaded primitives
// (bevel / sphere / cylinder ramps), char-grid stamping, auto outline and damage/glitch filters.
// DOM-free: icons are composed as Int32 colour arrays and only turned into canvases by ui/icons.js.

export const OUT = 0x120f16;           // outline colour (near-black, slightly violet)
const SHADOW = 0x1c1834, LIGHT = 0xfff6dc;

export function col(v) { return typeof v === 'string' ? parseInt(v.replace('#', ''), 16) : v; }
export function mix(a, b, t) {
  a = col(a); b = col(b);
  const r = (a >> 16) & 255, g = (a >> 8) & 255, bl = a & 255;
  return (Math.round(r + (((b >> 16) & 255) - r) * t) << 16) | (Math.round(g + (((b >> 8) & 255) - g) * t) << 8) | Math.round(bl + ((b & 255) - bl) * t);
}
export const dk = (c, t = 0.28) => mix(c, SHADOW, t);
export const lt = (c, t = 0.28) => mix(c, LIGHT, t);
export function grey(c, t = 1) { c = col(c); const l = Math.round(((c >> 16) & 255) * 0.3 + ((c >> 8) & 255) * 0.59 + (c & 255) * 0.11); return mix(c, (l << 16) | (l << 8) | l, t); }

function rgb2hsl(c) {
  const r = ((c >> 16) & 255) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}
function hsl2rgb(h, s, l) {
  const f = (p, q, t) => { t = (t % 1 + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  let r, g, b;
  if (s === 0) r = g = b = l; else { const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q; r = f(p, q, h + 1 / 3); g = f(p, q, h); b = f(p, q, h - 1 / 3); }
  return (Math.round(r * 255) << 16) | (Math.round(g * 255) << 8) | Math.round(b * 255);
}
export function hue(c, deg, sMul = 1, lAdd = 0) {
  const [h, s, l] = rgb2hsl(col(c));
  return hsl2rgb(h + deg / 360, Math.min(1, s * sMul), Math.max(0, Math.min(1, l + lAdd)));
}

// deterministic rng from a string
export function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
export function rng(seed) { let a = typeof seed === 'string' ? hashStr(seed) : seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// shared palette for char grids
export const PAL = {
  k: 0x1e1c22, d: 0x2e2e36, m: 0x4a4a54, M: 0x70727c, s: 0xa8acb4, S: 0xdcdee4,
  n: 0x5a3620, N: 0x8a5630, B: 0xb88048, o: 0x3e4a2e, O: 0x60703f, q: 0x8a9a5c, t: 0x8a7650, T: 0xbca878,
  r: 0x8a2418, R: 0xd84030, a: 0xb05a18, A: 0xf09030, y: 0xa07a28, Y: 0xe8c048, c: 0x1e7a98, C: 0x6ae8ff,
  W: 0xf4f2ea, w: 0xc8c8c0, g: 0x2e6a2a, G: 0x5cc860, b: 0x2a5aa0, L: 0x6aa8f0, p: 0x6a3090, P: 0xc870ff,
  e: 0x242428, x: OUT, h: 0xfff6dc, i: 0xe878a8, u: 0x3a2a4a,
};

// ---------------------------------------------------------------- pixel buffer
export class PB {
  constructor(w = 24, h = 24) { this.w = w; this.h = h; this.d = new Int32Array(w * h).fill(-1); }
  clone() { const p = new PB(this.w, this.h); p.d.set(this.d); return p; }
  in(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  get(x, y) { return this.in(x, y) ? this.d[y * this.w + x] : -1; }
  has(x, y) { return this.get(x, y) !== -1; }
  s(x, y, c) { x = Math.floor(x); y = Math.floor(y); if (this.in(x, y)) this.d[y * this.w + x] = c == null || c === -1 ? -1 : col(c); return this; }
  clear(x, y) { return this.s(x, y, -1); }
  dots(list, c) { for (let i = 0; i < list.length; i += 2) this.s(list[i], list[i + 1], c); return this; }

  // generic shaded fill over a bbox with an inside predicate
  fill(x0, y0, x1, y1, pred, c, mode = 'bevel', info = {}) {
    c = col(c);
    x0 = Math.floor(x0); y0 = Math.floor(y0); x1 = Math.ceil(x1); y1 = Math.ceil(y1);
    const pts = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (pred(x, y)) pts.push(x, y);
    // extents for cylinder ramps
    let mnx = 1e9, mxx = -1e9, mny = 1e9, mxy = -1e9;
    for (let i = 0; i < pts.length; i += 2) { mnx = Math.min(mnx, pts[i]); mxx = Math.max(mxx, pts[i]); mny = Math.min(mny, pts[i + 1]); mxy = Math.max(mxy, pts[i + 1]); }
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i], y = pts[i + 1];
      this.s(x, y, tone(mode, c, x, y, pred, info, mnx, mxx, mny, mxy));
    }
    return this;
  }
  r(x0, y0, x1, y1, c, m = 'bevel') { if (x1 < x0) [x0, x1] = [x1, x0]; if (y1 < y0) [y0, y1] = [y1, y0]; return this.fill(x0, y0, x1, y1, (x, y) => x >= x0 && x <= x1 && y >= y0 && y <= y1, c, m); }
  // rounded rect (corners clipped)
  rr(x0, y0, x1, y1, c, m = 'bevel', k = 1) {
    return this.fill(x0, y0, x1, y1, (x, y) => {
      if (x < x0 || x > x1 || y < y0 || y > y1) return false;
      const dx = Math.min(x - x0, x1 - x), dy = Math.min(y - y0, y1 - y);
      return dx + dy >= k;
    }, c, m);
  }
  e(cx, cy, rx, ry, c, m = 'sphere') {
    const pred = (x, y) => { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; return dx * dx + dy * dy <= 1; };
    return this.fill(cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1, pred, c, m, { cx, cy, rx, ry });
  }
  c(cx, cy, r, c, m = 'sphere') { return this.e(cx, cy, r, r, c, m); }
  o(cx, cy, r0, r1, c, m = 'flat', sy = 1) {   // ring between radii r0..r1
    const pred = (x, y) => { const dx = x + 0.5 - cx, dy = (y + 0.5 - cy) / sy, d = dx * dx + dy * dy; return d <= r1 * r1 && d >= r0 * r0; };
    return this.fill(cx - r1 - 1, cy - r1 * sy - 1, cx + r1 + 1, cy + r1 * sy + 1, pred, c, m, { cx, cy, rx: r1, ry: r1 * sy });
  }
  p(pts, c, m = 'bevel') {     // polygon in pixel-edge coordinates (rect x0..x1 == poly x0..x1+1)
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]); }
    const n = pts.length / 2;
    const pred = (x, y) => {
      const px = x + 0.5, py = y + 0.5; let ins = false;
      for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = pts[i * 2], yi = pts[i * 2 + 1], xj = pts[j * 2], yj = pts[j * 2 + 1];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins;
      }
      return ins;
    };
    return this.fill(x0 - 1, y0 - 1, x1 + 1, y1 + 1, pred, c, m);
  }
  l(x0, y0, x1, y1, c) {      // bresenham line
    c = col(c); x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) { this.s(x0, y0, c); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    return this;
  }
  // polyline
  pl(pts, c) { for (let i = 0; i + 3 < pts.length; i += 2) this.l(pts[i], pts[i + 1], pts[i + 2], pts[i + 3], c); return this; }
  // char grid stamp; pal entries may be numbers or '#hex'
  g(rows, pal = PAL, ox = 0, oy = 0) {
    rows.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const ch = row[x]; if (ch === '.' || ch === ' ') continue; const v = pal[ch] ?? PAL[ch]; if (v != null) this.s(ox + x, oy + y, v); } });
    return this;
  }
  // 1px outline around the silhouette (4-neighbour)
  outline(c = OUT, diag = false) {
    const src = this.d.slice(), w = this.w, h = this.h, C = col(c);
    const at = (x, y) => x >= 0 && y >= 0 && x < w && y < h && src[y * w + x] !== -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (src[y * w + x] !== -1) continue;
      if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1) || (diag && (at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1) || at(x + 1, y + 1)))) this.d[y * w + x] = C;
    }
    return this;
  }
  map(fn) { for (let i = 0; i < this.d.length; i++) if (this.d[i] !== -1) { const v = fn(this.d[i], i % this.w, (i / this.w) | 0); this.d[i] = v == null ? -1 : v; } return this; }
  blit(src, ox = 0, oy = 0) { for (let y = 0; y < src.h; y++) for (let x = 0; x < src.w; x++) { const v = src.d[y * src.w + x]; if (v !== -1) this.s(x + ox, y + oy, v); } return this; }
  flipX() { const s = this.d.slice(); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.d[y * this.w + x] = s[y * this.w + (this.w - 1 - x)]; return this; }
  shift(dx, dy) { const s = this.d.slice(); this.d.fill(-1); for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) { const v = s[y * this.w + x]; if (v !== -1) this.s(x + dx, y + dy, v); } return this; }
  bbox() { let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) if (this.d[y * this.w + x] !== -1) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return x1 < 0 ? null : { x0, y0, x1, y1 }; }
  // centre the drawing in the buffer (keeps a 1px margin when possible)
  centre(vert = true, horiz = true) {
    const b = this.bbox(); if (!b) return this;
    const dx = horiz ? Math.floor((this.w - (b.x1 - b.x0 + 1)) / 2) - b.x0 : 0;
    const dy = vert ? Math.floor((this.h - (b.y1 - b.y0 + 1)) / 2) - b.y0 : 0;
    return this.shift(dx, dy);
  }
  // wear & tear: desaturate/darken, rust/char specks, a crack and chipped edge pixels
  damage(rnd, { amt = 1, rust = false, char = false } = {}) {
    this.map(c => { let v = grey(c, 0.45 * amt); v = dk(v, 0.18 * amt); return v; });
    const filled = []; for (let i = 0; i < this.d.length; i++) if (this.d[i] !== -1 && this.d[i] !== OUT) filled.push(i);
    if (!filled.length) return this;
    const n = Math.round(filled.length * 0.06 * amt);
    for (let k = 0; k < n; k++) { const i = filled[(rnd() * filled.length) | 0]; this.d[i] = rust ? (rnd() < 0.5 ? 0x8a4a22 : 0xa86030) : char ? (rnd() < 0.6 ? 0x1a1614 : 0x3a2a20) : dk(this.d[i], 0.5); }
    // crack: random walk from a filled pixel
    let i = filled[(rnd() * filled.length) | 0], x = i % this.w, y = (i / this.w) | 0;
    for (let k = 0; k < 7; k++) { if (this.has(x, y)) this.s(x, y, 0x16121a); x += rnd() < 0.5 ? 1 : 0; y += rnd() < 0.7 ? 1 : -1; }
    // chip 2 edge pixels
    for (let k = 0, tries = 0; k < 2 && tries < 60; tries++) {
      const j = filled[(rnd() * filled.length) | 0], px = j % this.w, py = (j / this.w) | 0;
      if (!this.has(px - 1, py) || !this.has(px + 1, py) || !this.has(px, py - 1) || !this.has(px, py + 1)) { this.d[j] = -1; k++; }
    }
    return this;
  }
  // digital glitch: shifted rows with RGB-split tint
  glitch(rnd, rows = 3) {
    for (let k = 0; k < rows; k++) {
      const y = 3 + ((rnd() * 18) | 0), dx = rnd() < 0.5 ? -1 : 1, h = 1 + ((rnd() * 2) | 0);
      for (let yy = y; yy < y + h && yy < this.h; yy++) {
        const row = []; for (let x = 0; x < this.w; x++) row.push(this.get(x, yy));
        for (let x = 0; x < this.w; x++) { const v = row[x - dx] ?? -1; this.d[yy * this.w + x] = v === -1 ? -1 : mix(v, k % 2 ? 0xff40e0 : 0x40f0ff, 0.45); }
      }
    }
    return this;
  }
}

// shading ramps
function tone(mode, c, x, y, pred, info, mnx, mxx, mny, mxy) {
  switch (mode) {
    case 'flat': return c;
    case 'bevel': {
      if (!pred(x, y - 1)) return lt(c, 0.3);
      if (!pred(x, y + 1)) return dk(c, 0.32);
      if (!pred(x - 1, y)) return lt(c, 0.13);
      if (!pred(x + 1, y)) return dk(c, 0.18);
      return c;
    }
    case 'soft': {   // top light / bottom dark only
      if (!pred(x, y - 1)) return lt(c, 0.22);
      if (!pred(x, y + 1)) return dk(c, 0.25);
      return c;
    }
    case 'cylH': case 'cylV': {
      const horiz = mode === 'cylH';
      const a = horiz ? y - mny : x - mnx, n = horiz ? mxy - mny + 1 : mxx - mnx + 1;
      if (n <= 1) return lt(c, 0.12);
      if (n === 2) return a === 0 ? lt(c, 0.25) : dk(c, 0.22);
      if (a === 0) return lt(c, 0.18);
      if (a === 1 && n >= 4) return lt(c, 0.4);
      if (a === n - 1) return dk(c, 0.4);
      if (a >= n * 0.62) return dk(c, 0.18);
      return c;
    }
    case 'sphere': {
      const { cx, cy, rx, ry } = info;
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry;
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny));
      const lam = -0.5 * nx - 0.62 * ny + 0.6 * nz;
      if (lam > 0.82) return lt(c, 0.55);
      if (lam > 0.5) return lt(c, 0.22);
      if (lam > 0.05) return c;
      if (lam > -0.35) return dk(c, 0.22);
      return dk(c, 0.42);
    }
    case 'glow': {   // bright core, coloured rim
      if (!pred(x, y - 1) || !pred(x, y + 1) || !pred(x - 1, y) || !pred(x + 1, y)) return c;
      return lt(c, 0.55);
    }
    default: return c;
  }
}
