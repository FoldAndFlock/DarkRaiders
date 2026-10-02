// Procedural pixel-art textures (16 texels / metre), generated once at boot.
import * as THREE from '../../vendor/three.module.js';

export function rng(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
function hex(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }

// tileable value noise on an integer lattice
function makeNoise(size, cells, seed) {
  const r = rng(seed), g = [];
  for (let i = 0; i < cells * cells; i++) g.push(r());
  const at = (x, y) => g[((y % cells + cells) % cells) * cells + ((x % cells + cells) % cells)];
  return (x, y) => {
    const fx = x / size * cells, fy = y / size * cells;
    const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const a = at(ix, iy), b = at(ix + 1, iy), c = at(ix, iy + 1), d = at(ix + 1, iy + 1);
    return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
  };
}
function fbm(size, seed, octaves = [[4, .5], [8, .3], [16, .2]]) {
  const ns = octaves.map(([c], i) => makeNoise(size, c, seed * 7 + i * 131));
  return (x, y) => { let v = 0; octaves.forEach(([, w], i) => v += ns[i](x, y) * w); return v; };
}

// palette ramp helper: t in [0,1] -> colour from list
function ramp(cols, t) {
  t = clamp(t, 0, 0.9999) * (cols.length);
  return hex(cols[Math.floor(t)]);
}

class Tex {
  constructor(w, h = w) {
    this.w = w; this.h = h;
    this.c = document.createElement('canvas'); this.c.width = w; this.c.height = h;
    this.x = this.c.getContext('2d');
    this.img = this.x.createImageData(w, h);
  }
  px(x, y, [r, g, b], a = 255) {
    x = ((x % this.w) + this.w) % this.w; y = ((y % this.h) + this.h) % this.h;
    const i = (y * this.w + x) * 4, d = this.img.data;
    if (a < 255) { const t = a / 255; d[i] = d[i] * (1 - t) + r * t; d[i + 1] = d[i + 1] * (1 - t) + g * t; d[i + 2] = d[i + 2] * (1 - t) + b * t; }
    else { d[i] = r; d[i + 1] = g; d[i + 2] = b; }
    d[i + 3] = 255;
  }
  get(x, y) {
    x = ((x % this.w) + this.w) % this.w; y = ((y % this.h) + this.h) % this.h;
    const i = (y * this.w + x) * 4, d = this.img.data; return [d[i], d[i + 1], d[i + 2]];
  }
  shade(x, y, f) { const c = this.get(x, y); this.px(x, y, [clamp(c[0] * f, 0, 255), clamp(c[1] * f, 0, 255), clamp(c[2] * f, 0, 255)]); }
  fill(fn) { for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) this.px(x, y, fn(x, y)); }
  flush() { this.x.putImageData(this.img, 0, 0); return this; }
}

// ---------- individual generators (all 64x64 = 4m x 4m unless noted) ----------
const GEN = {
  grass(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x2c3a1c, 0x3a4a22, 0x4a5a2a, 0x5a6a30, 0x6d7a3a], n(x, y) * 1.1 + r() * 0.18 - 0.1));
    for (let i = 0; i < 260; i++) { const x = r() * 64 | 0, y = r() * 64 | 0; t.px(x, y, hex(r() < .5 ? 0x7d8a44 : 0x26331a)); t.px(x, y - 1, hex(0x6d7a3a), 140); }
    for (let i = 0; i < 6; i++) { const x = r() * 64 | 0, y = r() * 64 | 0; t.px(x, y, hex([0xc8b04a, 0xb85a3a, 0xd8d0b0][i % 3])); }
  },
  dirt(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x3a2e22, 0x4a3a2a, 0x5a4632, 0x6a543a], n(x, y) + r() * 0.15 - 0.07));
    for (let i = 0; i < 90; i++) { const x = r() * 64 | 0, y = r() * 64 | 0; t.px(x, y, hex(0x7a6448)); t.px(x + 1, y + 1, hex(0x2a2018)); }
  },
  sand(t, s) {
    const n = fbm(64, s, [[4, .6], [16, .4]]), r = rng(s);
    t.fill((x, y) => {
      const ripple = Math.sin((y + n(x, y) * 10) * 0.55) * 0.5 + 0.5;
      return ramp([0x9a7a4e, 0xae8c58, 0xc09c64, 0xd0ac72, 0xdcbc84], n(x, y) * 0.6 + ripple * 0.35 + r() * 0.08);
    });
  },
  sandDark(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x6e5436, 0x7e623e, 0x8e7046, 0x9e7e50], n(x, y) + r() * 0.1));
  },
  concrete(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x5a5a56, 0x66665f, 0x727068, 0x7e7b72], n(x, y) * 0.9 + r() * 0.12));
    for (let x = 0; x < 64; x++) { t.shade(x, 0, 0.7); t.shade(x, 32, 0.78); }
    for (let y = 0; y < 64; y++) { t.shade(0, y, 0.7); t.shade(32, y, 0.78); }
    for (let i = 0; i < 4; i++) { let x = r() * 64 | 0, y = r() * 64 | 0; for (let k = 0; k < 14; k++) { t.shade(x, y, 0.65); x += (r() * 3 | 0) - 1; y += 1; } }
    for (let i = 0; i < 3; i++) { const cx = r() * 64, cy = r() * 64, rad = 3 + r() * 6; for (let y = -8; y < 8; y++) for (let x = -8; x < 8; x++) if (x * x + y * y < rad * rad * (0.6 + 0.4 * n(x + cx, y + cy))) t.shade(cx + x | 0, cy + y | 0, 0.86); }
  },
  damConcrete(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x6a665c, 0x787266, 0x857e70, 0x948c7c], n(x, y) * 0.8 + r() * 0.1));
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x++) t.shade(x, y, 0.72);
    for (let x = 0; x < 64; x++) for (let y = 0; y < 64; y++) if (n(x * 2, y) > 0.68) t.shade(x, y, 0.8 - (y % 16) * 0.004); // water stains
    for (let i = 0; i < 40; i++) { const x = r() * 64 | 0, y = r() * 64 | 0; t.px(x, y, hex(0x3e4a2c)); }
  },
  asphalt(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x2a2a2c, 0x323234, 0x3a3a3c, 0x434244], n(x, y) * 0.7 + r() * 0.3));
    for (let i = 0; i < 3; i++) { let x = r() * 64 | 0, y = r() * 64 | 0; for (let k = 0; k < 20; k++) { t.px(x, y, hex(0x1a1a1c)); x += (r() * 3 | 0) - 1; y += (r() * 2 | 0); } }
    for (let y = 0; y < 64; y++) if ((y >> 3) % 2 === 0) { t.px(31, y, hex(0xb8a050)); t.px(32, y, hex(0xa89040)); }
  },
  rock(t, s) {
    const n = fbm(64, s, [[3, .5], [6, .3], [24, .2]]), r = rng(s);
    t.fill((x, y) => ramp([0x3e3a36, 0x4c4742, 0x5a544c, 0x6a6258, 0x7a7266], n(x, y) * 1.1 - 0.05 + r() * 0.06));
    for (let y = 1; y < 64; y++) for (let x = 0; x < 64; x++) if (n(x, y) - n(x, y - 1) > 0.025) t.shade(x, y, 1.25);
  },
  rust(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => {
      const v = n(x, y);
      if (v > 0.55) return ramp([0x6a3a1e, 0x7e4622, 0x92522a], (v - 0.55) * 3 + r() * .2);
      return ramp([0x46504e, 0x525c58, 0x5e6862], v * 1.6 + r() * .1);
    });
    for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x++) { t.shade(x, y, 0.6); t.shade(x, y + 1, 1.15); }
  },
  corrugated(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => {
      const ridge = (x % 4) < 2 ? 1.12 : 0.86;
      const c = ramp([0x55605c, 0x606b66, 0x6d7772], n(x, y) + r() * 0.08);
      const rr = n(x + 13, y + 7) > 0.6 ? hex(0x7a4424) : c;
      return rr.map(v => clamp(v * ridge, 0, 255));
    });
  },
  roofTar(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x2c2a28, 0x353230, 0x3e3a36, 0x48433e], n(x, y) + r() * 0.15));
    for (let x = 0; x < 64; x++) { t.shade(x, 0, 0.7); t.shade(x, 31, 0.7); }
  },
  roofTile(t, s) {
    const r = rng(s), n = fbm(64, s);
    t.fill((x, y) => {
      const row = y >> 2, off = (row % 2) * 3, col = ((x + off) / 6) | 0;
      const edge = (y % 4 === 3) || ((x + off) % 6 === 0);
      const base = ramp([0x8a4a2e, 0x9a5634, 0xa8623c, 0xb46e44], n(x, y) * 0.8 + ((col * 7 + row * 3) % 5) * 0.04 + r() * 0.06);
      return edge ? base.map(v => v * 0.62) : base;
    });
  },
  plaster(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x9a8268, 0xa88e72, 0xb69a7c, 0xc2a686], n(x, y) + r() * 0.1));
    for (let i = 0; i < 5; i++) { const cx = r() * 64, cy = r() * 64, rad = 2 + r() * 5; for (let y = -6; y < 6; y++) for (let x = -6; x < 6; x++) if (x * x + y * y < rad * rad) t.px(cx + x | 0, cy + y | 0, hex(0x8a6c50), 160); }
    for (let x = 0; x < 64; x++) t.shade(x, 63, 0.8);
  },
  brick(t, s) {
    const r = rng(s), n = fbm(64, s);
    t.fill((x, y) => {
      const row = y >> 2, off = (row % 2) * 4, mortar = (y % 4 === 0) || ((x + off) % 8 === 0);
      if (mortar) return hex(0x5a544c);
      return ramp([0x6a3a2a, 0x7a4430, 0x8a4e38, 0x9a5a40], n(x, y) * 0.7 + r() * 0.3);
    });
  },
  tiles(t, s) {
    const r = rng(s), n = fbm(64, s);
    t.fill((x, y) => {
      const a = ((x >> 3) + (y >> 3)) % 2;
      const grout = x % 8 === 0 || y % 8 === 0;
      if (grout) return hex(0x4a4640);
      return ramp(a ? [0x8a8478, 0x96907e, 0xa29c88] : [0x6e6a62, 0x7a756c, 0x868076], n(x, y) + r() * 0.1);
    });
  },
  wood(t, s) {
    const r = rng(s), n = fbm(64, s);
    t.fill((x, y) => {
      const plank = x >> 3, seam = x % 8 === 0 || ((y + plank * 23) % 48 === 0);
      const grain = Math.sin(y * 0.4 + plank * 3 + n(x, y) * 6) * 0.5 + 0.5;
      const c = ramp([0x4a3222, 0x56392a, 0x624432, 0x6e4c38], grain * 0.5 + n(x, y) * 0.4 + (plank % 3) * 0.05);
      return seam ? c.map(v => v * 0.6) : c;
    });
  },
  metalPanel(t, s) {
    const r = rng(s), n = fbm(64, s);
    t.fill((x, y) => {
      const seam = x % 32 === 0 || y % 32 === 0, rivet = (x % 32 === 3 || x % 32 === 28) && (y % 8 === 4);
      const c = ramp([0x3e4446, 0x485052, 0x525a5c, 0x5c6466], n(x, y) + r() * 0.08);
      if (rivet) return hex(0x7a8486);
      return seam ? c.map(v => v * 0.6) : c;
    });
  },
  hazard(t, s) {
    t.fill((x, y) => (((x + y) >> 3) % 2) ? hex(0xd8a020) : hex(0x202020));
  },
  mud(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x2a2418, 0x342c1e, 0x3e3424, 0x4a3e2a], n(x, y) + r() * 0.1));
  },
  gravel(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x4a4640, 0x5a5650, 0x6a665e, 0x7a766c], n(x, y) * 0.5 + r() * 0.5));
  },
  moss(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x26301a, 0x303c20, 0x3a4826, 0x46542c], n(x, y) + r() * 0.15));
  },
  forest(t, s) {
    const n = fbm(64, s), r = rng(s);
    t.fill((x, y) => ramp([0x1e2614, 0x26301a, 0x2e3a1e, 0x384624], n(x, y) + r() * 0.2));
    for (let i = 0; i < 70; i++) { const x = r() * 64 | 0, y = r() * 64 | 0; t.px(x, y, hex(r() < .5 ? 0x5a4428 : 0x6a5a30)); }
  },
};

export const TERRAIN = ['grass', 'dirt', 'sand', 'sandDark', 'concrete', 'damConcrete', 'asphalt', 'rock', 'tiles', 'wood', 'mud', 'gravel', 'moss', 'forest', 'metalPanel', 'hazard'];
export const TID = Object.fromEntries(TERRAIN.map((n, i) => [n, i]));

const cache = {};
export function tex(name, seed = 7, repeatMeters = 4) {
  const key = name + seed;
  if (cache[key]) return cache[key];
  const t = new Tex(64);
  GEN[name](t, seed);
  t.flush();
  const tx = new THREE.CanvasTexture(t.c);
  tx.magFilter = tx.minFilter = THREE.NearestFilter;
  tx.generateMipmaps = false;
  tx.wrapS = tx.wrapT = THREE.RepeatWrapping;
  tx.colorSpace = THREE.SRGBColorSpace;
  tx.userData.canvas = t.c;
  return cache[key] = tx;
}

// 4x4 atlas of 64px terrain textures for the terrain shader
export function terrainAtlas(seed = 3) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  TERRAIN.forEach((n, i) => x.drawImage(tex(n, seed + i).userData.canvas, (i % 4) * 64, (i >> 2) * 64));
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;  // shader addresses atlas tiles with row 0 at v=0
  t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export { GEN, Tex, hex, fbm };
