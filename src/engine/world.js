// World v2: heightfield terrain, 2.5D collision/occlusion grid, structure + prop builders,
// fading roofs, water, and gameplay markers. Map modules describe a level through this API;
// everything is resolved and meshed in finalize() so call order of terrain vs structures is free.
import * as THREE from '../../vendor/three.module.js';
import { tex, TID } from './textures.js';
import { litTex, terrainMaterial, waterMaterial, GU, litVox } from './materials.js';
import { OBLIQUE_K } from './renderer.js';
import { propGeo, propInfo } from './models.js';
import { extractSolids } from './extracts.js';

export const CELL = 0.5;      // collision grid resolution (m)
const CHUNK = 32;             // terrain / box batching chunk (m)
const PROP_REGION = 48;       // instanced prop culling region (m)
export const STEP_H = 0.45;   // max step-up height for walkers
export const BODY_H = 1.7;    // headroom a walker needs above its feet (low ceilings / slabs block)
export const SURF = { dirt: 0, concrete: 1, metal: 2, sand: 3, water: 4, wood: 5, grass: 6, tile: 7 };
const TERRAIN_SURF = { grass: 6, dirt: 0, sand: 3, sandDark: 3, concrete: 1, damConcrete: 1, asphalt: 1, rock: 1, tiles: 7, wood: 5, mud: 0, gravel: 0, moss: 6, forest: 6, metalPanel: 2, hazard: 2 };

export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = t => t * t * (3 - 2 * t);
export function pointInPoly(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi) inside = !inside;
  }
  return inside;
}
// rotated-building frame: angle a about (cx, cz); world = rot(local). three.js rotation.y equivalent is -a
export function rotFrame(cx, cz, a) { return { cx, cz, a, c: Math.cos(a), s: Math.sin(a) }; }
export function rotPt(R, x, z) { if (!R) return [x, z]; const dx = x - R.cx, dz = z - R.cz; return [R.cx + dx * R.c - dz * R.s, R.cz + dx * R.s + dz * R.c]; }
export function unrotPt(R, x, z) { if (!R) return [x, z]; const dx = x - R.cx, dz = z - R.cz; return [R.cx + dx * R.c + dz * R.s, R.cz - dx * R.s + dz * R.c]; }
function rectPts(R, x0, z0, x1, z1) { return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => rotPt(R, x, z)); }
// rotate the vertices / normals pushed into a geometry group since vertex index `start`
function rotTail(g, start, R) {
  for (let v = start, n = g.pos.length / 3; v < n; v++) {
    const i = v * 3, [x, z] = rotPt(R, g.pos[i], g.pos[i + 2]); g.pos[i] = x; g.pos[i + 2] = z;
    const nx = g.nor[i], nz = g.nor[i + 2]; g.nor[i] = nx * R.c - nz * R.s; g.nor[i + 2] = nx * R.s + nz * R.c;
  }
}
// [x0,z0,x1,z1] minus holes -> list of rects (slab openings for stairwells)
function subtractRects(rect, holes) {
  let out = [rect];
  for (const [hx0, hz0, hx1, hz1] of holes) {
    const next = [];
    for (const [x0, z0, x1, z1] of out) {
      if (hx1 <= x0 || hx0 >= x1 || hz1 <= z0 || hz0 >= z1) { next.push([x0, z0, x1, z1]); continue; }
      if (hz0 > z0) next.push([x0, z0, x1, hz0]);
      if (hz1 < z1) next.push([x0, hz1, x1, z1]);
      const a = Math.max(z0, hz0), b = Math.min(z1, hz1);
      if (hx0 > x0) next.push([x0, a, hx0, b]);
      if (hx1 < x1) next.push([hx1, a, x1, b]);
    }
    out = next;
  }
  return out.filter(([x0, z0, x1, z1]) => x1 - x0 > 0.05 && z1 - z0 > 0.05);
}
function polyBounds(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } return [a, b, c, d]; }
function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  const qx = ax + dx * t, qz = az + dz * t;
  return [Math.hypot(px - qx, pz - qz), t];
}

// ------------------------------------------------------------------------------------ GRID
export class Grid {
  constructor(w, h, groundFn) {
    this.w = w; this.h = h; this.groundAt = groundFn;
    this.cw = Math.ceil(w / CELL); this.ch = Math.ceil(h / CELL);
    const n = this.cw * this.ch;
    this.top = new Float32Array(n);          // absolute top height (ground or obstacle)
    this.water = new Uint8Array(n);          // water body index + 1 (0 = dry)
    this.indoor = new Int16Array(n).fill(-1);
    this.indoor2 = new Int16Array(n).fill(-1); // second (stacked) building, e.g. a tunnel under a house
    this.surf = new Uint8Array(n);
    this.bodies = [];                        // water bodies {level}
    // multi-level: each cell is a ground column (top) plus floating solid spans above it
    // (floor slabs, roofs, tunnel lids, bridge decks, lintels): spans[spanRef[i]] = [y0,y1, y0,y1…]
    this.spanRef = new Int32Array(n).fill(-1);
    this.spans = [];
    this.solidBase = new Uint8Array(n);      // 1 = column top raised by a solid (else smooth terrain)
    this.door = new Int16Array(n).fill(-1);  // dynamic door blockers -> doorBlocks[k] = { y0, y1, closed }
    this.door2 = new Int16Array(n).fill(-1); // a second door in the same cell (stacked storeys)
    this.doorBlocks = [];
    this._pend = new Map();                  // build time: floating solids per cell
  }
  // ---- multi-level queries
  // add a solid [y0, y1] to cell i (build time); touching the column merges into it
  addSolid(i, y0, y1) {
    if (y0 <= this.top[i] + 0.06) { if (y1 > this.top[i]) { this.top[i] = y1; this.solidBase[i] = 1; } return; }
    let l = this._pend.get(i); if (!l) this._pend.set(i, l = []); l.push(y0, y1);
  }
  // merge pending floating solids into sorted disjoint spans (end of build)
  packSpans() {
    for (const [i, l] of this._pend) {
      const iv = []; for (let k = 0; k < l.length; k += 2) iv.push([l[k], l[k + 1]]);
      const old = this.spanRef[i]; if (old >= 0) { const sp = this.spans[old]; for (let k = 0; k < sp.length; k += 2) iv.push([sp[k], sp[k + 1]]); }
      iv.sort((a, b) => a[0] - b[0]);
      let t = this.top[i]; const out = [];
      for (const [a, b] of iv) {
        if (!out.length && a <= t + 0.06) { if (b > t) { t = b; this.solidBase[i] = 1; } continue; }
        const L = out.length; if (L && a <= out[L - 1] + 0.06) { out[L - 1] = Math.max(out[L - 1], b); continue; }
        out.push(a, b);
      }
      this.top[i] = t;
      if (out.length) { if (old >= 0) this.spans[old] = Float32Array.from(out); else { this.spanRef[i] = this.spans.length; this.spans.push(Float32Array.from(out)); } }
      else if (old >= 0) { this.spans[old] = new Float32Array(0); this.spanRef[i] = -1; }
    }
    this._pend = new Map();
  }
  // highest standable surface at or below y + STEP_H in cell i (column top or a span top);
  // inside a solid (no surface within reach) it returns y unchanged - never pops you onto a roof
  floorI(i, y) {
    let f = this.top[i] <= y + STEP_H ? this.top[i] : -Infinity; const r = this.spanRef[i];
    if (r >= 0) { const s = this.spans[r]; for (let k = 1; k < s.length; k += 2) if (s[k] <= y + STEP_H && s[k] > f) f = s[k]; }
    return f === -Infinity ? y : f;
  }
  // any solid inside the vertical range (ya, yb) of cell i?
  solidIn(i, ya, yb) {
    if (this.top[i] > ya) return true;
    const r = this.spanRef[i];
    if (r >= 0) { const s = this.spans[r]; for (let k = 0; k < s.length; k += 2) if (s[k] < yb && s[k + 1] > ya) return true; }
    return this._doorIn(this.door[i], ya, yb) || this._doorIn(this.door2[i], ya, yb);
  }
  _doorIn(d, ya, yb) { if (d < 0) return false; const b = this.doorBlocks[d]; return b.closed && b.y0 < yb && b.y1 > ya; }
  // is height y inside a solid of cell i?
  solidAtI(i, y) {
    if (this.top[i] > y) return true;
    const r = this.spanRef[i];
    if (r >= 0) { const s = this.spans[r]; for (let k = 0; k < s.length; k += 2) if (y > s[k] && y < s[k + 1]) return true; }
    return this._doorIn(this.door[i], y, y) || this._doorIn(this.door2[i], y, y);
  }
  // lowest solid bottom above y in cell i (ceiling), or Infinity
  ceilI(i, y) {
    let c = Infinity; const r = this.spanRef[i];
    if (r >= 0) { const s = this.spans[r]; for (let k = 0; k < s.length; k += 2) if (s[k] > y && s[k] < c) c = s[k]; }
    return c;
  }
  // walkable surfaces of cell i with enough headroom (ascending)
  surfacesI(i) {
    const r = this.spanRef[i]; if (r < 0) return [this.top[i]];
    const s = this.spans[r], out = [];
    if (s[0] - this.top[i] >= BODY_H) out.push(this.top[i]);
    for (let k = 0; k < s.length; k += 2) { const next = k + 2 < s.length ? s[k + 2] : Infinity; if (next - s[k + 1] >= BODY_H) out.push(s[k + 1]); }
    return out;
  }
  // iterate the cells of a (rotated) rect; pad widens thin pieces so diagonals stay 4-connected
  eachCell(x0, z0, x1, z1, R, pad, fn) {
    if (!R || Math.abs(R.s) < 1e-6 && R.c > 0) {
      const a = Math.max(0, Math.floor(x0 / CELL + 1e-6)), b = Math.max(0, Math.floor(z0 / CELL + 1e-6));
      const c = Math.min(this.cw - 1, Math.ceil(x1 / CELL - 1e-6) - 1), d = Math.min(this.ch - 1, Math.ceil(z1 / CELL - 1e-6) - 1);
      for (let z = b; z <= d; z++) for (let x = a; x <= c; x++) fn(z * this.cw + x);
      return;
    }
    const P = CELL * 0.5, px = pad && x1 - x0 < 2 * CELL && x1 - x0 <= z1 - z0 ? P : 0, pz = pad && z1 - z0 < 2 * CELL && z1 - z0 < x1 - x0 ? P : 0;
    const [a, b, c, d] = polyBounds(rectPts(R, x0 - px, z0 - pz, x1 + px, z1 + pz));
    const ca = Math.max(0, Math.floor(a / CELL)), cb = Math.max(0, Math.floor(b / CELL)), cc = Math.min(this.cw - 1, Math.floor(c / CELL)), cd = Math.min(this.ch - 1, Math.floor(d / CELL));
    for (let cz = cb; cz <= cd; cz++) for (let cx = ca; cx <= cc; cx++) {
      const [lx, lz] = unrotPt(R, (cx + 0.5) * CELL, (cz + 0.5) * CELL);
      if (lx < x0 - px || lx > x1 + px || lz < z0 - pz || lz > z1 + pz) continue;
      fn(cz * this.cw + cx);
    }
  }
  idx(x, z) { const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL); if (cx < 0 || cz < 0 || cx >= this.cw || cz >= this.ch) return -1; return cz * this.cw + cx; }
  topAt(x, z) { const i = this.idx(x, z); return i < 0 ? 999 : this.top[i]; }
  indoorAt(x, z) { const i = this.idx(x, z); return i < 0 ? -1 : this.indoor[i]; }
  surfAt(x, z) { const i = this.idx(x, z); return i < 0 ? 0 : this.surf[i]; }
  // water depth at a point (0 if dry)
  waterDepth(x, z) {
    const i = this.idx(x, z); if (i < 0 || !this.water[i]) return 0;
    return Math.max(0, this.bodies[this.water[i] - 1].level - this.groundAt(x, z));
  }
  waterLevel(x, z) { const i = this.idx(x, z); return i < 0 || !this.water[i] ? null : this.bodies[this.water[i] - 1].level; }
  waterAt(x, z) { const d = this.waterDepth(x, z); return d <= 0.02 ? 0 : d < 0.9 ? 1 : 2; }
  fillRect(arr, x0, z0, x1, z1, v, mode = 'set') {
    const a = Math.max(0, Math.floor(x0 / CELL + 1e-6)), b = Math.max(0, Math.floor(z0 / CELL + 1e-6));
    const c = Math.min(this.cw - 1, Math.ceil(x1 / CELL - 1e-6) - 1), d = Math.min(this.ch - 1, Math.ceil(z1 / CELL - 1e-6) - 1);
    for (let z = b; z <= d; z++) for (let x = a; x <= c; x++) {
      const i = z * this.cw + x;
      arr[i] = mode === 'max' ? Math.max(arr[i], v) : v;
    }
  }
  // fillRect in a rotated frame R (local rect x0..x1, z0..z1). pad: thin pieces (walls) are widened by
  // ~half a cell diagonal so diagonal walls rasterise as a 4-connected band (no movement / light leaks)
  fillRotRect(arr, x0, z0, x1, z1, R, v, mode = 'set', pad = false) {
    if (!R || Math.abs(R.s) < 1e-6 && R.c > 0) return this.fillRect(arr, x0, z0, x1, z1, v, mode);
    this.eachCell(x0, z0, x1, z1, R, pad, (i) => { arr[i] = mode === 'max' ? Math.max(arr[i], v) : v; });
  }
  // 2.5D DDA ray from (x,y,z) heading (dx,dz) with vertical slope dy per metre.
  // Returns distance travelled before hitting solid. Each cell is tested over the whole height range
  // the ray covers inside it, so a steep ray can't slip through a thin slab, roof or lid.
  ray(x, z, dx, dz, max, y = 1.2, dy = 0) {
    let cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const adx = Math.abs(dx) || 1e-9, adz = Math.abs(dz) || 1e-9;
    const tdx = CELL / adx, tdz = CELL / adz;
    let tx = (dx > 0 ? (cx + 1) * CELL - x : x - cx * CELL) / adx;
    let tz = (dz > 0 ? (cz + 1) * CELL - z : z - cz * CELL) / adz;
    let t = 0;
    while (t < max) {
      if (tx < tz) { t = tx; tx += tdx; cx += sx; } else { t = tz; tz += tdz; cz += sz; }
      if (t >= max) break;
      if (cx < 0 || cz < 0 || cx >= this.cw || cz >= this.ch) return t;
      const ya = y + dy * t, yb = y + dy * Math.min(max, tx, tz);
      if (this.solidIn(cz * this.cw + cx, Math.min(ya, yb), Math.max(ya, yb))) return t;
    }
    return max;
  }
  los(x0, y0, z0, x1, y1, z1) {
    const dx = x1 - x0, dz = z1 - z0, d = Math.hypot(dx, dz);
    if (d < 0.01) return true;
    return this.ray(x0, z0, dx / d, dz / d, d - 0.05, y0, (y1 - y0) / d) >= d - 0.06;
  }
  // can a walker with feet at height feetY stand at x,z with radius r?
  blockedAt(x, z, r, feetY) {
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
      if (cx < 0 || cz < 0 || cx >= this.cw || cz >= this.ch) return true;
      const i = cz * this.cw + cx;
      let bad = this.solidIn(i, feetY + STEP_H, feetY + BODY_H);
      if (!bad && this.water[i] && feetY < this.top[i] + 1) { const b = this.bodies[this.water[i] - 1]; bad = b.level - this.top[i] > 0.95; }
      if (bad) {
        const nx = Math.max(cx * CELL, Math.min(x, (cx + 1) * CELL)), nz = Math.max(cz * CELL, Math.min(z, (cz + 1) * CELL));
        if ((nx - x) ** 2 + (nz - z) ** 2 < r * r) return true;
      }
    }
    return false;
  }
  // circle movement with sliding; p = {x,z,y?}. Feet follow step-ups (stairs, kerbs); dropping off
  // ledges is left to the caller (gravity / snap via floorAt). Returns true if something was hit.
  move(p, vx, vz, r) {
    const steps = Math.ceil(Math.max(Math.abs(vx), Math.abs(vz)) / (r * 0.5)) || 1;
    let x = p.x, z = p.z, hit = false;
    let feet = p.y ?? this.floorAt(x, z, 1e9);
    for (let s = 0; s < steps; s++) {
      const nx = x + vx / steps;
      if (!this.blockedAt(nx, z, r, feet)) x = nx; else hit = true;
      const nz = z + vz / steps;
      if (!this.blockedAt(x, nz, r, feet)) z = nz; else hit = true;
      const f = this.floorAt(x, z, feet); if (f > feet) feet = f;
    }
    p.x = x; p.z = z; p.y = feet;
    return hit;
  }
  // standable height under (x, z) for someone at height y (smooth on bare terrain)
  floorAt(x, z, y = 1e9) {
    const i = this.idx(x, z); if (i < 0) return this.groundAt(x, z);
    const f = this.floorI(i, y);
    return f === this.top[i] && !this.solidBase[i] ? this.groundAt(x, z) : f;
  }
  // highest walkable surface (e.g. the ground above a tunnel, a roof)
  topFloorAt(x, z) { return this.floorAt(x, z, 1e9); }
  ceilAt(x, z, y) { const i = this.idx(x, z); return i < 0 ? Infinity : this.ceilI(i, y); }
  // building the point is inside at height y (stacked buildings resolved by their vertical extent)
  insideAt(x, z, y, buildings) {
    const i = this.idx(x, z); if (i < 0) return -1;
    for (const id of [this.indoor[i], this.indoor2[i]]) {
      if (id < 0) continue; const b = buildings[id];
      if (y >= b.floorY - 1.0 && y < b.roofY - 0.4) return id;
    }
    return -1;
  }
}

// ------------------------------------------------------------------------------------ BOX BATCH
class BoxBatch {
  constructor() { this.groups = new Map(); }
  add(matKey, material, x0, y0, z0, x1, y1, z1, opts = {}) {
    const [mx, mz] = rotPt(opts.R, (x0 + x1) / 2, (z0 + z1) / 2);
    const ck = Math.floor(mx / CHUNK) + ',' + Math.floor(mz / CHUNK);
    const key = matKey + '|' + ck + '|' + (opts.cast === false ? 0 : 1);
    let g = this.groups.get(key);
    if (!g) { g = { material, pos: [], nor: [], uv: [], idx: [], cast: opts.cast !== false }; this.groups.set(key, g); }
    const start = g.pos.length / 3;
    pushBox(g, x0, y0, z0, x1, y1, z1, opts.rep || 4, opts);
    if (opts.R) rotTail(g, start, opts.R);
  }
  build(parent) {
    for (const g of this.groups.values()) {
      const m = new THREE.Mesh(geoFrom(g), g.material);
      m.castShadow = g.cast; m.receiveShadow = true;
      parent.add(m);
    }
  }
}
function pushBox(g, x0, y0, z0, x1, y1, z1, rep, opts = {}) {
  const K = OBLIQUE_K;
  const quad = (a, b, c, d, n, uvs) => {
    const base = g.pos.length / 3;
    g.pos.push(...a, ...b, ...c, ...d);
    for (let i = 0; i < 4; i++) g.nor.push(...n);
    g.uv.push(...uvs);
    if (g.bid) for (let i = 0; i < 4; i++) g.bid.push(opts.bid);
    g.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  // vertical faces map 1 texel / screen pixel: v uses y*K
  const vy0 = y0 * K / rep, vy1 = y1 * K / rep;
  if (!opts.noTop) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0],
    [x0 / rep, -z1 / rep, x1 / rep, -z1 / rep, x1 / rep, -z0 / rep, x0 / rep, -z0 / rep]);
  quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [x0 / rep, vy0, x1 / rep, vy0, x1 / rep, vy1, x0 / rep, vy1]);
  quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [x1 / rep, vy0, x0 / rep, vy0, x0 / rep, vy1, x1 / rep, vy1]);
  quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [z1 / rep, vy0, z0 / rep, vy0, z0 / rep, vy1, z1 / rep, vy1]);
  quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [z0 / rep, vy0, z1 / rep, vy0, z1 / rep, vy1, z0 / rep, vy1]);
}
function geoFrom(g) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
  if (g.bid) geo.setAttribute('aBid', new THREE.Float32BufferAttribute(g.bid, 1));
  geo.setIndex(g.idx);
  geo.computeBoundingSphere();
  return geo;
}

// Roofs: merged meshes, per-building alpha from a data texture (fade in/out + "peek" bias)
function roofMaterial(texture, alphaTex, tint = 0xffffff) {
  const m = new THREE.MeshLambertMaterial({ map: texture, color: tint, transparent: true, depthWrite: false });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tRoofA = { value: alphaTex };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aBid; varying float vBid;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBid = aBid;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tRoofA; varying float vBid;')
      .replace('#include <alphatest_fragment>', `
        float ra = texture2D(tRoofA, vec2((mod(vBid, 256.0) + 0.5) / 256.0, (floor(vBid / 256.0) + 0.5) / 8.0)).r;
        diffuseColor.a *= ra;
        if (diffuseColor.a < 0.03) discard;
      `);
  };
  m.customProgramCacheKey = () => 'roof';
  return m;
}

// ------------------------------------------------------------------------------------ WORLD
export class World {
  constructor(scene, w, h, opts = {}) {
    this.scene = scene; this.w = w; this.h = h; this.seed = opts.seed || 1;
    this.rng = mulberry(this.seed * 7919 + 17);
    this.root = new THREE.Group(); scene.add(this.root);
    // 1 m terrain: vertex heights (w+1)x(h+1), terrain ids per 1 m cell
    this.tw = Math.ceil(w); this.th = Math.ceil(h);
    this.hv = new Float32Array((this.tw + 1) * (this.th + 1));
    this.tids = new Uint8Array(this.tw * this.th).fill(TID[opts.base || 'grass']);
    this.grid = new Grid(w, h, (x, z) => this.groundAt(x, z));
    this.boxes = new BoxBatch();
    this.solids = [];        // deferred blocks {x0,z0,x1,z1,h,y0?,texName,opts}
    this.roofBoxes = [];     // deferred roof boxes
    this.buildings = [];
    this.waters = [];
    this.props = [];
    this.lamps = [];
    this.flattens = [];
    // gameplay markers
    this.pois = []; this.extracts = []; this.spawns = []; this.containers = []; this.doors = [];
    this.arkSpawns = []; this.keyRooms = []; this.zones = []; this.ladders = [];   // ladders: climb points between levels
    this.alphaData = new Uint8Array(256 * 8 * 4).fill(255);
    this.alphaTex = new THREE.DataTexture(this.alphaData, 256, 8, THREE.RGBAFormat);
    this.alphaTex.magFilter = this.alphaTex.minFilter = THREE.NearestFilter;
    this.cliffTile = TID[opts.cliff || 'rock'];
  }

  // =============================================================== TERRAIN HEIGHT
  _hi(x, z) { return z * (this.tw + 1) + x; }
  vh(x, z) { x = clamp(x, 0, this.tw); z = clamp(z, 0, this.th); return this.hv[this._hi(x, z)]; }
  groundAt(x, z) {
    x = clamp(x, 0, this.tw - 1e-4); z = clamp(z, 0, this.th - 1e-4);
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, W = this.tw + 1;
    const a = this.hv[iz * W + ix], b = this.hv[iz * W + ix + 1], c = this.hv[(iz + 1) * W + ix], d = this.hv[(iz + 1) * W + ix + 1];
    return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fz;
  }
  // fn(x,z) -> height; applied at every vertex. mode: 'set' | 'add' | 'max' | 'min'
  heightFn(fn, mode = 'set') {
    const W = this.tw + 1;
    for (let z = 0; z <= this.th; z++) for (let x = 0; x <= this.tw; x++) {
      const v = fn(x, z); if (v == null) continue;
      const i = z * W + x;
      this.hv[i] = mode === 'add' ? this.hv[i] + v : mode === 'max' ? Math.max(this.hv[i], v) : mode === 'min' ? Math.min(this.hv[i], v) : v;
    }
  }
  _area(x0, z0, x1, z1, fn) {
    const W = this.tw + 1;
    for (let z = Math.max(0, Math.floor(z0)); z <= Math.min(this.th, Math.ceil(z1)); z++)
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(this.tw, Math.ceil(x1)); x++) fn(x, z, z * W + x);
  }
  // raise/lower a rectangle to height h with an edge blend of `blend` metres (mode set|add|max|min)
  raiseRect(x0, z0, x1, z1, h, blend = 4, mode = 'set') {
    this._area(x0 - blend, z0 - blend, x1 + blend, z1 + blend, (x, z, i) => {
      const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1);
      const d = Math.hypot(dx, dz), t = blend > 0 ? 1 - smooth(clamp(d / blend, 0, 1)) : (d <= 0 ? 1 : 0);
      this._apply(i, h, t, mode);
    });
  }
  raiseCircle(cx, cz, r, h, falloff = 0.5, mode = 'add') {
    this._area(cx - r, cz - r, cx + r, cz + r, (x, z, i) => {
      const d = Math.hypot(x - cx, z - cz) / r; if (d >= 1) return;
      const t = d < 1 - falloff ? 1 : smooth(clamp((1 - d) / Math.max(falloff, 1e-3), 0, 1));
      this._apply(i, h, t, mode);
    });
  }
  raisePoly(pts, h, blend = 4, mode = 'set') {
    const [a, b, c, d] = polyBounds(pts);
    if (blend <= 0) { this._area(a, b, c, d, (x, z, i) => { if (pointInPoly(x, z, pts)) this._apply(i, h, 1, mode); }); return; }
    this._area(a - blend, b - blend, c + blend, d + blend, (x, z, i) => {
      let t;
      if (pointInPoly(x, z, pts)) t = 1;
      else {
        let md = 1e9; for (let k = 0; k < pts.length; k++) { const p = pts[k], q = pts[(k + 1) % pts.length]; md = Math.min(md, distToSeg(x, z, p[0], p[1], q[0], q[1])[0]); }
        t = blend > 0 ? 1 - smooth(clamp(md / blend, 0, 1)) : 0;
      }
      if (t > 0) this._apply(i, h, t, mode);
    });
  }
  // ridge / embankment along a polyline: height h at centre, width w, blend edges
  ridge(points, w, h, blend = 4, mode = 'max') { this._along(points, w, blend, (i, t) => this._apply(i, h, t, mode)); }
  _apply(i, h, t, mode) {
    const cur = this.hv[i];
    if (mode === 'add') this.hv[i] = cur + h * t;
    else if (mode === 'max') this.hv[i] = Math.max(cur, cur + (h - cur) * t);
    else if (mode === 'min') this.hv[i] = Math.min(cur, cur + (h - cur) * t);
    else this.hv[i] = cur + (h - cur) * t;
  }
  _along(points, w, blend, fn) {
    for (let k = 0; k < points.length - 1; k++) {
      const [ax, az] = points[k], [bx, bz] = points[k + 1];
      const r = w / 2 + blend;
      this._area(Math.min(ax, bx) - r, Math.min(az, bz) - r, Math.max(ax, bx) + r, Math.max(az, bz) + r, (x, z, i) => {
        const [d, t] = distToSeg(x, z, ax, az, bx, bz);
        const f = d <= w / 2 ? 1 : blend > 0 ? 1 - smooth(clamp((d - w / 2) / blend, 0, 1)) : 0;
        if (f > 0) fn(i, f, t, k, x, z);
      });
    }
  }
  // fractal noise hills over the whole map (amp metres, scale metres)
  noiseHills(amp = 4, scale = 80, seed = 1, mask = null) {
    const r = mulberry(seed), perm = [];
    for (let i = 0; i < 512; i++) perm.push(r());
    const vn = (x, z) => {
      const ix = Math.floor(x), iz = Math.floor(z), fx = smooth(x - ix), fz = smooth(z - iz);
      const h = (a, b) => perm[((a * 73856093) ^ (b * 19349663)) & 511];
      return (h(ix, iz) + (h(ix + 1, iz) - h(ix, iz)) * fx) * (1 - fz) + (h(ix, iz + 1) + (h(ix + 1, iz + 1) - h(ix, iz + 1)) * fx) * fz;
    };
    this.heightFn((x, z) => {
      const m = mask ? mask(x, z) : 1; if (!m) return null;
      const n = vn(x / scale, z / scale) * 0.6 + vn(x / scale * 2.3, z / scale * 2.3) * 0.28 + vn(x / scale * 5.1, z / scale * 5.1) * 0.12;
      return (n - 0.5) * 2 * amp * m;
    }, 'add');
  }
  flatten(x0, z0, x1, z1, h = null, blend = 2) { this.flattens.push({ x0, z0, x1, z1, h, blend }); }
  // linear ramp inside a rectangle from height h0 to h1 along axis 'x' (west->east) or 'z' (north->south)
  ramp(x0, z0, x1, z1, h0, h1, axis = 'z') {
    this._area(x0, z0, x1, z1, (x, z, i) => {
      const t = axis === 'x' ? (x - x0) / Math.max(1e-6, x1 - x0) : (z - z0) / Math.max(1e-6, z1 - z0);
      this.hv[i] = h0 + (h1 - h0) * clamp(t, 0, 1);
    });
  }

  // =============================================================== PAINT
  paint(name, x0, z0, x1, z1) {
    const id = TID[name];
    for (let z = Math.max(0, Math.floor(z0)); z < Math.min(this.th, Math.ceil(z1)); z++)
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(this.tw, Math.ceil(x1)); x++) this.tids[z * this.tw + x] = id;
  }
  paintCircle(name, cx, cz, r, noise = 0, seed = 1) {
    const id = TID[name];
    for (let z = Math.floor(cz - r * 1.6); z <= cz + r * 1.6; z++) for (let x = Math.floor(cx - r * 1.6); x <= cx + r * 1.6; x++) {
      if (x < 0 || z < 0 || x >= this.tw || z >= this.th) continue;
      const a = Math.atan2(z - cz, x - cx);
      const rr = r * (1 + noise * (Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 7 + seed * 2) * 0.3));
      if ((x + .5 - cx) ** 2 + (z + .5 - cz) ** 2 < rr * rr) this.tids[z * this.tw + x] = id;
    }
  }
  paintPoly(name, pts) {
    const id = TID[name], [a, b, c, d] = polyBounds(pts);
    for (let z = Math.max(0, Math.floor(b)); z <= Math.min(this.th - 1, Math.ceil(d)); z++)
      for (let x = Math.max(0, Math.floor(a)); x <= Math.min(this.tw - 1, Math.ceil(c)); x++)
        if (pointInPoly(x + .5, z + .5, pts)) this.tids[z * this.tw + x] = id;
  }
  paintFn(fn) { for (let z = 0; z < this.th; z++) for (let x = 0; x < this.tw; x++) { const n = fn(x + .5, z + .5, this.tids[z * this.tw + x]); if (n != null) this.tids[z * this.tw + x] = typeof n === 'string' ? TID[n] : n; } }
  terrainAt(x, z) { const tx = clamp(Math.floor(x), 0, this.tw - 1), tz = clamp(Math.floor(z), 0, this.th - 1); return this.tids[tz * this.tw + tx]; }
  // road along a polyline: paints + smooths terrain across its width to the centreline height
  road(points, width, texName = 'asphalt', { edge = 'gravel', edgeW = 1, level = true } = {}) {
    const id = TID[texName], eid = edge ? TID[edge] : null;
    if (level) {
      const centre = points.map(([x, z]) => this.groundAt(x, z));
      this._along(points, width, 3, (i, f, t, k) => {
        const h = centre[k] + (centre[k + 1] - centre[k]) * t;
        this.hv[i] += (h - this.hv[i]) * f;
      });
    }
    for (let k = 0; k < points.length - 1; k++) {
      const [ax, az] = points[k], [bx, bz] = points[k + 1], r = width / 2 + edgeW + 1;
      for (let z = Math.floor(Math.min(az, bz) - r); z <= Math.max(az, bz) + r; z++) for (let x = Math.floor(Math.min(ax, bx) - r); x <= Math.max(ax, bx) + r; x++) {
        if (x < 0 || z < 0 || x >= this.tw || z >= this.th) continue;
        const [d] = distToSeg(x + .5, z + .5, ax, az, bx, bz);
        if (d <= width / 2) this.tids[z * this.tw + x] = id;
        else if (eid != null && d <= width / 2 + edgeW && this.tids[z * this.tw + x] !== id) this.tids[z * this.tw + x] = eid;
      }
    }
  }
  path(points, width, texName = 'dirt') { this.road(points, width, texName, { edge: null, level: false }); }

  // =============================================================== WATER
  // rectangular water surface at absolute `level`; terrain below level is submerged
  water(x0, z0, x1, z1, opts = {}) { this.waters.push({ x0, z0, x1, z1, level: opts.level ?? 0, opts }); }
  waterPoly(pts, opts = {}) { const [a, b, c, d] = polyBounds(pts); this.waters.push({ x0: a, z0: b, x1: c, z1: d, poly: pts, level: opts.level ?? 0, opts }); }
  // river: carves a channel along points to `depth` below surrounding and fills with water at `level`
  river(points, width, { level = 0, depth = 1.2, bank = 3, bed = 'mud' } = {}) {
    this._along(points, width, bank, (i, f) => { this.hv[i] = Math.min(this.hv[i], this.hv[i] + (level - depth - this.hv[i]) * f); });
    for (let k = 0; k < points.length - 1; k++) {
      const [ax, az] = points[k], [bx, bz] = points[k + 1];
      const nx = -(bz - az), nz = bx - ax, nl = Math.hypot(nx, nz) || 1, ox = nx / nl * (width / 2 + 1), oz = nz / nl * (width / 2 + 1);
      this.waterPoly([[ax + ox, az + oz], [bx + ox, bz + oz], [bx - ox, bz - oz], [ax - ox, az - oz]], { level });
    }
    this.road(points, width, bed, { edge: 'mud', edgeW: 1.5, level: false });
  }

  // =============================================================== STRUCTURES
  // solid box; base defaults to the lowest ground under the footprint (sinks into slopes)
  // opts.rot: rotate this block about its own centre; opts.R: a shared rotFrame() for groups of blocks
  block(x0, z0, x1, z1, h, texName = 'concrete', opts = {}) {
    if (opts.rot && !opts.R) opts = { ...opts, R: rotFrame((x0 + x1) / 2, (z0 + z1) / 2, opts.rot) };
    this.solids.push({ x0, z0, x1, z1, h, texName, opts });
  }
  wallLine(ax, az, bx, bz, thick, h, texName, gaps = [], opts = {}) {
    const horiz = Math.abs(az - bz) < 1e-6;
    const len = horiz ? bx - ax : bz - az;
    const pieces = []; let cur = 0;
    gaps.slice().sort((a, b) => a.at - b.at).forEach(g => { if (g.at > cur) pieces.push([cur, g.at]); pieces.push([g.at, g.at + g.w, g]); cur = g.at + g.w; });
    if (cur < len) pieces.push([cur, len]);
    const t2 = thick / 2;
    const r0 = opts.rel0 || 0;
    const seg = (s, e, y0, y1, o) => {
      if (e - s < 0.01 || y1 - y0 < 0.01) return;
      if (horiz) this.block(ax + s, az - t2, ax + e, az + t2, y1 - y0, texName, { ...opts, ...o, rel0: r0 + y0 });
      else this.block(ax - t2, az + s, ax + t2, az + e, y1 - y0, texName, { ...opts, ...o, rel0: r0 + y0 });
    };
    for (const [s, e, g] of pieces) {
      if (!g) { seg(s, e, 0, h); continue; }
      // window heads / lintels are real floating solids now (block shots + headroom), not just visuals
      if (g.sill) { seg(s, e, 0, g.sill, {}); seg(s, e, g.top || Math.min(h, g.sill + 1.4), h, {}); }
      else if (g.lintel !== false && h > (g.h || 2.4)) seg(s, e, g.h || 2.4, h, {});
      if (g.door) {
        const lx = horiz ? ax + s + g.w / 2 : ax, lz = horiz ? az : az + s + g.w / 2, [wx, wz] = rotPt(opts.R, lx, lz);
        this.doors.push({ x: wx, z: wz, lx, lz, R: opts.R || null, axis: horiz ? 'x' : 'z', w: g.w, locked: g.locked || null, bid: opts.bid ?? -1, thick, rel0: opts.rel0 || 0, y0abs: opts.y0 ?? null, closed: g.closed || false });
      }
    }
  }
  /*
   building({ x, z, w, d, storeys=1, storeyH=3.2, h?, wall, floor, roof, roofTint, tint, thick, rot,
              doors:[{side:'n'|'s'|'e'|'w', at, w, sill?, door?:true, locked?:keyId, storey?}],
              inner:[[x0,z0,x1,z1,[gaps], storey?]] (relative), peek=0.72, parapet=true, vents, name,
              floors (default: storeys > 1) - walkable floor slabs between storeys,
              stairs:[{x, z, w, len?, dir:'n'|'s'|'e'|'w' (ascent direction), from=0, to=from+1|'top', tex}],
              ladders:[{side, at} (exterior, ground -> roof) | {x, z, to:k|'top'} (interior)],
              under (m): underground hall/tunnel - floor sunk `under` m, roof = walkable ground-level lid,
              containers/props:[[kind, lx, lz, rot?, {storey?, ...}]] })
   Levels: storey k floor = floorY + k*storeyH; 'top' = roof (walkable; lid of an underground hall).
  */
  building(b) {
    const id = this.buildings.length;
    const storeys = b.storeys || 1, sh = b.storeyH || 3.2;
    const under = b.under || 0;
    const h = b.h || (under ? under : storeys * sh);
    // rot (radians): footprint rotated about its centre; everything else (doors, inner walls, local
    // containers/props) is given in the unrotated frame and rotated with it
    const R = b.rot ? rotFrame(b.x + b.w / 2, b.z + b.d / 2, b.rot) : null;
    const poly = rectPts(R, b.x, b.z, b.x + b.w, b.z + b.d), [ax0, az0, ax1, az1] = polyBounds(poly);
    const bb = { id, x0: b.x, z0: b.z, x1: b.x + b.w, z1: b.z + b.d, R, poly, ax0, az0, ax1, az1, h, storeys, sh, under, deck: !!(b.deck ?? under),
      alpha: under ? 1 : (b.peek ?? 0.72), target: 0.72, def: b, floorY: 0, roofY: 0, name: b.name || null, holes: {} };
    this.buildings.push(bb);
    const lev = (v) => v === 'top' ? h : (v || 0) * sh;
    // ground: flatten the footprint (underground: flatten the surface ring, then sink the floor)
    const ring = { x0: ax0 - 0.5, z0: az0 - 0.5, x1: ax1 + 0.5, z1: az1 + 0.5, poly: R ? rectPts(R, b.x - 0.5, b.z - 0.5, b.x + b.w + 0.5, b.z + b.d + 0.5) : null, h: b.floorY ?? null, blend: b.blend ?? 2.5 };
    if (!R) delete ring.poly;
    this.flattens.push(ring);
    // underground: carve only inside the (1 m) walls so the surrounding ground stays level up to the lid
    if (under) this.flattens.push({ x0: b.x + 1, z0: b.z + 1, x1: b.x + b.w - 1, z1: b.z + b.d - 1, poly: R ? rectPts(R, b.x + 1, b.z + 1, b.x + b.w - 1, b.z + b.d - 1) : null, ref: ring, depth: under, blend: 0 });
    if (b.floor !== false) { if (R) this.paintPoly(b.floor || 'tiles', poly); else this.paint(b.floor || 'tiles', b.x, b.z, b.x + b.w, b.z + b.d); }
    const th = b.thick || (under ? 1.0 : 0.3), wall = b.wall || 'plaster';
    const o = { cutaway: true, seed: b.seed ?? (id % 7) + 3, tint: b.tint, bid: id, onBuilding: id, R };
    const { x, z, w, d } = b;
    // walls: one storey at a time so every storey has its own doors / windows
    // underground walls sit fully inside the footprint (they hold back the earth under the lid)
    const wi = under ? th / 2 : 0;
    const sides = [['n', x, z + wi, x + w, z + wi], ['s', x, z + d - wi, x + w, z + d - wi], ['w', x + wi, z, x + wi, z + d], ['e', x + w - wi, z, x + w - wi, z + d]];
    const perStorey = storeys > 1 && b.perStorey !== false;
    for (const [side, x0, z0, x1, z1] of sides) {
      if (!perStorey) { this.wallLine(x0, z0, x1, z1, th, h, wall, (b.doors || []).filter(dd => dd.side === side), o); continue; }
      for (let k = 0; k < storeys; k++) {
        const hk = k === storeys - 1 ? h - k * sh : sh;
        this.wallLine(x0, z0, x1, z1, th, hk, wall, (b.doors || []).filter(dd => dd.side === side && (dd.storey || 0) === k), { ...o, rel0: k * sh });
      }
    }
    for (const iw of b.inner || []) { const k = iw[5] || 0; this.wallLine(x + iw[0], z + iw[1], x + iw[2], z + iw[3], 0.2, Math.min(storeys > 1 ? sh : h, b.innerH || 3.2), b.innerWall || wall, iw[4] || [], { ...o, rel0: k * sh }); }
    // stairs (solid steps) + the slab openings they need
    const ST = b.stairTex || 'concrete';
    for (const st of b.stairs || []) {
      let from = st.from ?? 0, to = st.to ?? (from === 'top' ? 0 : from + 1), sdir = st.dir || 'n';
      if (lev(from) > lev(to)) { [from, to] = [to, from]; sdir = { n: 's', s: 'n', e: 'w', w: 'e' }[sdir]; }
      const y0 = lev(from), y1 = lev(to) + (to === 'top' && !under ? 0.25 : 0) + (to === 'top' && under ? 0.02 : 0), rise = y1 - y0;
      const n = Math.max(2, Math.ceil(Math.abs(rise) / 0.38)), len = st.len ?? n * 0.55, sw = st.w ?? 1.4;
      const dir = sdir, alongX = dir === 'e' || dir === 'w';
      const fx0 = x + st.x, fz0 = z + st.z, fx1 = fx0 + (alongX ? len : sw), fz1 = fz0 + (alongX ? sw : len);
      for (let k = 0; k < n; k++) {
        const t0 = k / n, t1 = (k + 1) / n, top = y0 + rise * t1;
        let r;
        if (dir === 'e') r = [fx0 + len * t0, fz0, fx0 + len * t1, fz1];
        else if (dir === 'w') r = [fx1 - len * t1, fz0, fx1 - len * t0, fz1];
        else if (dir === 's') r = [fx0, fz0 + len * t0, fx1, fz0 + len * t1];
        else r = [fx0, fz1 - len * t1, fx1, fz1 - len * t0];
        // each step is solid down to the lower level (a stair block), resting on that level's floor
        this.block(r[0], r[1], r[2], r[3], top - y0, st.tex || ST, { ...o, rel0: y0 || 0, sink: 0.3, rep: 2 });
      }
      const hk = to === 'top' ? 'top' : to, m = CELL;   // stairwell opening: a cell wider than the flight
      (bb.holes[hk] ||= []).push([fx0 - m, fz0 - m, fx1 + m, fz1 + m]);
      (bb.stairs ||= []).push({ rect: [fx0, fz0, fx1, fz1], from, to });
    }
    // floor slabs between storeys (walkable, cut away with the walls when you are below them)
    if (storeys > 1 && b.floors !== false) {
      const t2 = th / 2;
      for (let k = 1; k < storeys; k++) for (const [rx0, rz0, rx1, rz1] of subtractRects([x + t2, z + t2, x + w - t2, z + d - t2], bb.holes[k] || [])) {
        this.block(rx0, rz0, rx1, rz1, 0.25, b.floor || 'tiles', { ...o, rel0: k * sh - 0.25, rep: 4 });
      }
    }
    // ladders: exterior (side/at: ground outside the wall -> roof inside the parapet) or interior
    for (const ld of b.ladders || []) {
      if (ld.side) {
        const at = ld.at ?? 1;
        const out = { n: [x + at, z - 0.55, x + at, z + 0.75], s: [x + at, z + d + 0.55, x + at, z + d - 0.75], w: [x - 0.55, z + at, x + 0.75, z + at], e: [x + w + 0.55, z + at, x + w - 0.75, z + at] }[ld.side];
        const [bx, bz] = rotPt(R, out[0], out[1]), [tx, tz] = rotPt(R, out[2], out[3]);
        const face = { n: Math.PI, s: 0, w: -Math.PI / 2, e: Math.PI / 2 }[ld.side] - (b.rot || 0);
        this.ladders.push({ x0: bx, z0: bz, x1: tx, z1: tz, bid: id, rel0: 0, rel1: ld.to === undefined || ld.to === 'top' ? h + 0.25 : lev(ld.to), face, wall: rotPt(R, (out[0] + out[2]) / 2, (out[1] + out[3]) / 2) });
      } else {
        const [lx, lz] = rotPt(R, x + ld.x, z + ld.z);
        const to = ld.to ?? 'top', from = ld.from ?? 0;
        this.ladders.push({ x0: lx, z0: lz, x1: lx, z1: lz, bid: id, rel0: lev(from), rel1: lev(to) + (to === 'top' && !under ? 0.25 : 0), face: (ld.face || 0) - (b.rot || 0), inside: true });
        (bb.holes[to] ||= []).push([x + ld.x - 0.5, z + ld.z - 0.5, x + ld.x + 0.5, z + ld.z + 0.5]);
      }
    }
    // facade detail: storey bands on the south face (visual only)
    if (b.facade !== false && storeys > 1) {
      for (let k = 1; k < storeys; k++) this.block(x - 0.05, z + d - 0.05, x + w + 0.05, z + d + 0.12, 0.18, b.trim || 'concrete', { ...o, rel0: k * sh - 0.1, collide: false, cast: false });
    }
    this.roofBoxes.push({ bid: id, b, h });
    // local-frame contents: [kind, lx, lz, rot?, opts?] relative to (x, z); opts.storey puts them upstairs
    const upOpts = (op = {}) => (op.storey != null ? { ...op, bid: id, yRel: lev(op.storey) + (op.storey === 'top' && !under ? 0.25 : 0) } : op);
    for (const c of b.containers || []) { const [cx, cz] = this.local(bb, c[1], c[2]); this.container(c[0], cx, cz, (c[3] || 0) - (b.rot || 0), upOpts(c[4])); }
    for (const p of b.props || []) { const [px, pz] = this.local(bb, p[1], p[2]); this.prop(p[0], px, pz, (p[3] || 0) - (b.rot || 0), upOpts(p[4])); }
    return bb;
  }
  // elevated walkable slab along a polyline (bridge / overpass / catwalk): you can walk on it AND under it
  bridge(points, width, y, texName = 'concrete', { thick = 0.6, railH = 1.0, rails = true, pillars = 8, side = 'damConcrete', pillarW = 1.2 } = {}) {
    for (let k = 0; k < points.length - 1; k++) {
      const [ax, az] = points[k], [bx, bz] = points[k + 1];
      const L = Math.hypot(bx - ax, bz - az), a = Math.atan2(bz - az, bx - ax);
      const cx = (ax + bx) / 2, cz = (az + bz) / 2, R = rotFrame(cx, cz, a), hw = width / 2;
      this.block(cx - L / 2 - 0.05, cz - hw, cx + L / 2 + 0.05, cz + hw, thick, texName, { y0: y - thick, R, xray: true, bridge: true });
      if (rails) for (const sgn of [-1, 1]) this.block(cx - L / 2, cz + sgn * (hw - 0.12) - 0.1, cx + L / 2, cz + sgn * (hw - 0.12) + 0.1, railH, 'rust', { y0: y, R, xray: false });
      if (pillars) for (let t = pillars / 2; t < L; t += pillars) this.block(cx - L / 2 + t - pillarW / 2, cz - pillarW / 2, cx - L / 2 + t + pillarW / 2, cz + pillarW / 2, 0, side, { R, pillarTo: y - thick });
    }
  }
  // ladder between two points/heights (absolute y); the player climbs with the interact key
  ladder(x0, z0, y0, x1, z1, y1, face = 0) { this.ladders.push({ x0, z0, x1, z1, y0abs: y0, y1abs: y1, face }); }
  // building-local offset (from the footprint's x, z corner) -> world [x, z]
  local(bb, lx, lz) { return rotPt(bb.R, bb.x0 + lx, bb.z0 + lz); }
  fence(points, h = 1.2, texName = 'rust', thick = 0.1, opts = {}) {
    for (let k = 0; k < points.length - 1; k++) {
      const [ax, az] = points[k], [bx, bz] = points[k + 1];
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 0.5));
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        const x0 = ax + (bx - ax) * t0, z0 = az + (bz - az) * t0, x1 = ax + (bx - ax) * t1, z1 = az + (bz - az) * t1;
        this.block(Math.min(x0, x1) - thick / 2, Math.min(z0, z1) - thick / 2, Math.max(x0, x1) + thick / 2, Math.max(z0, z1) + thick / 2, h, texName, { ...opts, xray: false });
      }
    }
  }
  // walkable raised deck (bridge, dam crest, platform): sets terrain to deck height along a strip
  deck(points, width, y, texName = 'concrete', { railH = 1.0, rails = true, pillars = true, side = 'damConcrete' } = {}) {
    this._along(points, width, 0, (i, f) => { if (f > 0.99) this.hv[i] = y; });
    for (let k = 0; k < points.length - 1; k++) {
      const [ax, az] = points[k], [bx, bz] = points[k + 1];
      const L = Math.hypot(bx - ax, bz - az), n = Math.ceil(L / 2);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, cx = ax + (bx - ax) * t, cz = az + (bz - az) * t;
        const hw = width / 2;
        const ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz, nz = ux;
        if (rails) for (const s of [-1, 1]) {
          const rx = cx + nx * s * (hw - 0.1), rz = cz + nz * s * (hw - 0.1);
          this.block(rx - 0.12 - Math.abs(ux) * 0.9, rz - 0.12 - Math.abs(uz) * 0.9, rx + 0.12 + Math.abs(ux) * 0.9, rz + 0.12 + Math.abs(uz) * 0.9, railH, 'rust', { y0: y, xray: false });
        }
        if (pillars && i % 6 === 0) this.block(cx - 0.6, cz - 0.6, cx + 0.6, cz + 0.6, y, side, { y0: -4, collide: false });
      }
    }
    this.road(points, width, texName, { edge: null, level: false });
  }

  // =============================================================== PROPS + LIGHTS
  // kind: registered prop model; opts: { scale, y (relative), solid:[hw,hd,h] | true (use model info), rotSolid }
  prop(kind, x, z, rot = 0, opts = {}) { this.props.push({ kind, x, z, rot, opts }); }
  scatter(kind, area, count, opts = {}) {
    const r = mulberry(opts.seed ?? (this.props.length * 31 + count));
    const [a, b, c, d] = Array.isArray(area[0]) ? polyBounds(area) : area;
    let placed = 0, tries = 0;
    while (placed < count && tries++ < count * 20) {
      const x = a + r() * (c - a), z = b + r() * (d - b);
      if (Array.isArray(area[0]) && !pointInPoly(x, z, area)) continue;
      if (opts.avoid && opts.avoid(x, z)) continue;
      const s = (opts.scale || 1) * (1 + (r() - 0.5) * (opts.scaleVar ?? 0.3));
      this.prop(kind, x, z, opts.rot ?? r() * Math.PI * 2, { ...opts, scale: s });
      placed++;
    }
  }
  forest(area, density, kinds = ['pine', 'tree'], opts = {}) {
    const [a, b, c, d] = Array.isArray(area[0]) ? polyBounds(area) : area;
    const n = Math.round((c - a) * (d - b) / 100 * density);
    const r = mulberry(opts.seed ?? n);
    kinds.forEach((k, i) => this.scatter(k, area, Math.round(n / kinds.length), { solid: true, seed: Math.floor(r() * 1e6) + i, ...opts }));
    if (opts.undergrowth !== false) this.scatter('bush', area, Math.round(n * 0.6), { seed: Math.floor(r() * 1e6), ...opts, solid: false });
  }
  lamp(x, z, { y = 3.6, yAbs = null, color = 0xffd8a0, intensity = 1.2, range = 10, flicker = 0, spot = null, model = 'lamp', rot = 0, condition = null, notCondition = null } = {}) {
    this.lamps.push({ x, z, yRel: y, yAbs, color, intensity, range, flicker, spot, condition, notCondition });
    if (model) this.prop(model, x, z, rot, { solid: [0.15, 0.15, 3], condition, notCondition });
  }

  // =============================================================== GAMEPLAY MARKERS
  poi(id, name, x, z, r = 30, opts = {}) { this.pois.push({ id, name, x, z, r, tier: opts.tier ?? 1, ...opts }); }
  // extraction point; face = radians the structure faces (0 = +z). The structure's collision comes from
  // engine/extracts.js (elevator frame, metro platform edge...), its visuals are built by the view.
  extract(id, name, x, z, opts = {}) {
    const e = { id, name, x, z, kind: opts.kind || 'elevator', needsKey: opts.needsKey || null, face: opts.face || 0, ...opts };
    this.extracts.push(e);
    if (opts.structure === false) return e;
    const R = rotFrame(x, z, -(e.face || 0));
    for (const [x0, z0, x1, z1, h, y0] of extractSolids(e.kind, e)) {
      this.block(x + x0, z + z0, x + x1, z + z1, h, 'metalPanel', { R, nodraw: true, ...(e.yAbs != null ? { y0: e.yAbs + (y0 || 0) } : y0 ? { rel0: y0 } : {}) });
    }
    return e;
  }
  spawnPoint(x, z, opts = {}) { this.spawns.push({ x, z, ...opts }); }
  container(kind, x, z, rot = 0, opts = {}) { this.containers.push({ kind, x, z, rot, tier: opts.tier ?? 1, locked: opts.locked || null, room: opts.room || null, ...opts }); }
  arkSpawn(kind, x, z, opts = {}) { this.arkSpawns.push({ kind, x, z, count: opts.count || 1, radius: opts.radius || 6, patrol: opts.patrol || null, ...opts }); }
  keyRoom(id, x0, z0, x1, z1, key, opts = {}) { this.keyRooms.push({ id, x0, z0, x1, z1, key, ...opts }); }
  zone(name, poly, opts = {}) { this.zones.push({ name, poly, tier: opts.tier ?? 1, ...opts }); }

  // =============================================================== FINALIZE
  finalize() {
    const g = this.grid;
    // 1) building / explicit flattens (underground halls: sink the floor below the flattened ring)
    for (const f of this.flattens) {
      let h = f.h;
      if (f.ref) h = f.ref.h - f.depth;
      else if (h == null) { // average of footprint
        let s = 0, n = 0; this._area(f.x0, f.z0, f.x1, f.z1, (x, z, i) => { s += this.hv[i]; n++; }); h = n ? s / n : 0;
      }
      f.h = h;
      if (f.poly) this.raisePoly(f.poly, h, f.blend, 'set');
      else this.raiseRect(f.x0, f.z0, f.x1, f.z1, h, f.blend, 'set');
    }
    this.buildings.forEach(b => {
      const [cx, cz] = rotPt(b.R, (b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
      b.floorY = this.groundAt(cx, cz); b.roofY = b.floorY + b.h;
    });
    // 2) ground into grid
    for (let cz = 0; cz < g.ch; cz++) for (let cx = 0; cx < g.cw; cx++) {
      const x = (cx + 0.5) * CELL, z = (cz + 0.5) * CELL, i = cz * g.cw + cx;
      g.top[i] = this.groundAt(x, z);
      const tn = TERRAIN_SURF[TERRAIN_NAME[this.terrainAt(x, z)]];
      g.surf[i] = tn ?? 0;
    }
    // 3) buildings: indoor cells (a second id where buildings stack, e.g. a tunnel under a house)
    for (const b of this.buildings) g.eachCell(b.x0 + 0.01, b.z0 + 0.01, b.x1 - 0.01, b.z1 - 0.01, b.R, false, (i) => {
      if (g.indoor[i] < 0 || g.indoor[i] === b.id) g.indoor[i] = b.id; else g.indoor2[i] = b.id;
    });
    // 4) solids: ground-resting ones raise the column, floating ones (slabs, lintels, decks) become spans
    for (const s of this.solids) {
      let y0, y1;
      const gmin = () => Math.min(...rectPts(s.opts.R, s.x0, s.z0, s.x1, s.z1).map(([x, z]) => this.groundAt(x, z)));
      if (s.opts.pillarTo != null) { y0 = gmin() - 0.3; y1 = s.opts.pillarTo; }
      else if (s.opts.y0 != null) { y0 = s.opts.y0 - (s.opts.sink ?? 0); y1 = s.opts.y0 + s.h; }
      else {
        const base = s.opts.onBuilding != null ? this.buildings[s.opts.onBuilding].floorY + (s.opts.rel0 || 0) : gmin() + (s.opts.rel0 || 0);
        y0 = base - (s.opts.rel0 ? 0 : (s.opts.sink ?? 0.3)); y1 = base + s.h;
      }
      const t = tex(s.texName, s.opts.seed || 5);
      // floating pieces (decks, platforms, overpasses) and their pillars open up when you walk under them
      const cut = s.opts.cutaway ?? (s.opts.y0 != null || s.opts.pillarTo != null);
      const mat = litTex(t, { cutaway: !!cut, xray: s.opts.xray !== false, color: s.opts.tint || 0xffffff });
      if (!s.opts.nodraw) this.boxes.add(s.texName + (cut ? 'c' : '') + (s.opts.tint || '') + (s.opts.xray === false ? 'n' : ''), mat, s.x0, y0, s.z0, s.x1, y1, s.z1, s.opts);
      if (s.opts.collide !== false) g.eachCell(s.x0, s.z0, s.x1, s.z1, s.opts.R, true, (i) => g.addSolid(i, y0, y1));
    }
    // 4b) roofs are solid and walkable (gables step up), underground lids are the ground above
    for (const B of this.buildings) if (B.def.roofWalk !== false) for (const r of this._roofParts(B)) {
      if (r.nocol) continue;
      g.eachCell(r.x0, r.z0, r.x1, r.z1, B.R, true, (i) => g.addSolid(i, r.y0, r.y1));
    }
    // 5) water bodies -> grid
    this.waters.forEach((wv, wi) => {
      g.bodies.push({ level: wv.level });
      const a = Math.max(0, Math.floor(wv.x0 / CELL)), b = Math.max(0, Math.floor(wv.z0 / CELL));
      const c = Math.min(g.cw - 1, Math.ceil(wv.x1 / CELL)), d = Math.min(g.ch - 1, Math.ceil(wv.z1 / CELL));
      for (let cz = b; cz <= d; cz++) for (let cx = a; cx <= c; cx++) {
        const x = (cx + 0.5) * CELL, z = (cz + 0.5) * CELL, i = cz * g.cw + cx;
        if (wv.poly && !pointInPoly(x, z, wv.poly)) continue;
        if (wv.level > g.top[i] + 0.02) { g.water[i] = wi + 1; g.surf[i] = SURF.water; }
      }
    });
    g.packSpans();
    // 6) props: resolve height (ground, building storey, absolute or the top surface) + solidity
    const yFor = (o, x, z) => o.yAbs ?? (o.bid != null && o.yRel != null ? this.buildings[o.bid].floorY + o.yRel + (o.y || 0)
      : o.surface ? g.floorAt(x, z, 1e9) + (o.y || 0) : this.groundAt(x, z) + (o.y || 0));
    for (const p of this.props) {
      p.y = yFor(p.opts, p.x, p.z);
      const info = propInfo(p.kind);
      let sol = p.opts.solid === true ? info.solid : p.opts.solid;
      if (sol) {
        const s = p.opts.scale || 1;
        let [hw, hd, hh] = sol; hw *= s; hd *= s; hh *= s;
        const q = Math.abs(Math.sin(2 * p.rot)) > 0.05;        // not a right angle: rasterise the turned box
        const y0 = p.y - (p.y <= this.groundAt(p.x, p.z) + 0.1 ? 0.3 : 0);
        if (q) g.eachCell(p.x - hw, p.z - hd, p.x + hw, p.z + hd, rotFrame(p.x, p.z, -p.rot), true, (i) => g.addSolid(i, y0, p.y + hh));
        else {
          if (Math.abs(Math.sin(p.rot)) > 0.7) [hw, hd] = [hd, hw];
          g.eachCell(p.x - hw, p.z - hd, p.x + hw, p.z + hd, null, false, (i) => g.addSolid(i, y0, p.y + hh));
        }
      }
    }
    g.packSpans();
    // 7) doors: storey height + dynamic blockers (closed doors are solid only over their own storey)
    for (const d of this.doors) {
      d.y = d.y0abs ?? ((d.bid >= 0 ? this.buildings[d.bid].floorY : this.groundAt(d.x, d.z)) + (d.rel0 || 0));
      const hw = d.w / 2, ht = (d.thick || 0.3) / 2 + 0.05, x = d.lx ?? d.x, z = d.lz ?? d.z;
      const k = g.doorBlocks.length, blk = { y0: d.y - 0.05, y1: d.y + 2.4, closed: false, cells: [] }; g.doorBlocks.push(blk);
      d.blk = k;
      const mark = (i) => { if (g.door[i] < 0 || g.door[i] === k) g.door[i] = k; else g.door2[i] = k; blk.cells.push(i); };
      if (d.axis === 'x') g.eachCell(x - hw, z - ht, x + hw, z + ht, d.R, true, mark);
      else g.eachCell(x - ht, z - hw, x + ht, z + hw, d.R, true, mark);
    }
    // 8) ladders: absolute ends
    for (const l of this.ladders) {
      l.y0 = l.y0abs ?? (l.bid != null ? this.buildings[l.bid].floorY + l.rel0 : g.floorAt(l.x0, l.z0, 1e9));
      l.y1 = l.y1abs ?? (l.bid != null ? this.buildings[l.bid].floorY + l.rel1 : g.floorAt(l.x1, l.z1, 1e9));
    }
    this._buildLadders();
    this._buildTerrain();
    this._buildWater();
    this.boxes.build(this.root);
    this._buildRoofs();
    this._buildProps();
    this._buildOcclusion();
    // high fixtures: the light itself sits ~2.8 m up (3D falloff would leave the ground dark), range compensated;
    // yAbs lamps (upper floors, tunnels) stay exactly where they are put
    this.lamps.forEach(l => {
      if (l.yAbs != null) { l.y = l.yAbs; return; }
      const hy = Math.min(l.yRel, 2.8); l.y = this.groundAt(l.x, l.z) + hy; l.range += Math.max(0, l.yRel - hy) * 0.6;
    });
    for (const c of this.containers) c.y = yFor(c, c.x, c.z);
    for (const e of this.extracts) e.y = e.yAbs ?? (e.surface ? g.floorAt(e.x, e.z, 1e9) : this.groundAt(e.x, e.z));
    this.buildings.forEach(b => this._setAlpha(b.id, b.alpha));
  }

  _buildTerrain() {
    const g = this.grid;
    // terrain id texture
    const rgba = new Uint8Array(this.tw * this.th * 4);
    for (let i = 0; i < this.tids.length; i++) { rgba[i * 4] = this.tids[i]; rgba[i * 4 + 3] = 255; }
    const idTex = new THREE.DataTexture(rgba, this.tw, this.th, THREE.RGBAFormat);
    idTex.magFilter = idTex.minFilter = THREE.NearestFilter; idTex.needsUpdate = true;
    // contact-shadow AO from obstacles relative to the ground
    const ao = new Uint8Array(g.cw * g.ch * 4);
    for (let z = 0; z < g.ch; z++) for (let x = 0; x < g.cw; x++) {
      let occ = 0;
      const gi = z * g.cw + x, gh = this.groundAt((x + .5) * CELL, (z + .5) * CELL);
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= g.cw || zz >= g.ch) continue;
        const hgt = g.top[zz * g.cw + xx] - gh; if (hgt <= 0.3) continue;
        const dd = Math.hypot(dx, dz); occ += Math.min(1, hgt / 2) * (dd === 0 ? 0.3 : 1 / (dd * dd + 0.5));
      }
      const i = gi * 4;
      ao[i] = 255 - Math.min(255, Math.round(occ * 70));
      ao[i + 1] = g.water[gi] ? 255 : 0;
      ao[i + 3] = 255;
    }
    const aoTex = new THREE.DataTexture(ao, g.cw, g.ch, THREE.RGBAFormat);
    aoTex.magFilter = aoTex.minFilter = THREE.LinearFilter; aoTex.needsUpdate = true;
    this.aoTex = aoTex;
    const tmat = terrainMaterial(idTex, 1, [0, 0], aoTex, [g.cw * CELL, g.ch * CELL], this.cliffTile);
    this.terrainMat = tmat;
    const W = this.tw + 1;
    for (let cz = 0; cz < this.th; cz += CHUNK) for (let cx = 0; cx < this.tw; cx += CHUNK) {
      const gw = Math.min(CHUNK, this.tw - cx), gh = Math.min(CHUNK, this.th - cz);
      let mn = 1e9, mx = -1e9;
      for (let z = cz; z <= cz + gh; z++) for (let x = cx; x <= cx + gw; x++) { const v = this.hv[z * W + x]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
      let geo;
      if (mx - mn < 0.01) {
        geo = new THREE.PlaneGeometry(gw, gh); geo.rotateX(-Math.PI / 2); geo.translate(cx + gw / 2, mn, cz + gh / 2);
      } else {
        const pos = [], nor = [], idx = [];
        for (let z = 0; z <= gh; z++) for (let x = 0; x <= gw; x++) {
          const X = cx + x, Z = cz + z;
          pos.push(X, this.hv[Z * W + X], Z);
          const hl = this.vh(X - 1, Z), hr = this.vh(X + 1, Z), hu = this.vh(X, Z - 1), hd = this.vh(X, Z + 1);
          const n = new THREE.Vector3(hl - hr, 2, hu - hd).normalize();
          nor.push(n.x, n.y, n.z);
        }
        for (let z = 0; z < gh; z++) for (let x = 0; x < gw; x++) {
          const a = z * (gw + 1) + x, b = a + 1, c = a + gw + 1, d = c + 1;
          idx.push(a, c, b, b, c, d);
        }
        geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
        geo.setIndex(idx); geo.computeBoundingSphere();
      }
      const m = new THREE.Mesh(geo, tmat); m.receiveShadow = true; m.castShadow = mx - mn > 1.5;
      this.root.add(m);
    }
  }
  _buildWater() {
    const wmat = waterMaterial(), mats = new Map();
    const matFor = (o) => {
      if (o.material) return o.material;
      if (o.deep == null && o.shallow == null && o.opacity == null) return wmat;
      const k = [o.deep, o.shallow, o.opacity].join('|');
      if (!mats.has(k)) mats.set(k, waterMaterial({ deep: o.deep ?? 0x2a5058, shallow: o.shallow ?? 0x4a7a78, opacity: o.opacity ?? 0.86 }));
      return mats.get(k);
    };
    for (const wv of this.waters) {
      let geo;
      if (wv.poly) {
        const shape = new THREE.Shape(wv.poly.map(([x, z]) => new THREE.Vector2(x, z)));
        geo = new THREE.ShapeGeometry(shape); geo.rotateX(Math.PI / 2);
        // ShapeGeometry is in XY; after rotateX(+90deg) y->z. Fix winding to face up:
        geo.index && geo.setIndex(Array.from(geo.index.array).reverse());
        geo.computeVertexNormals();
        const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, wv.level);
      } else {
        geo = new THREE.PlaneGeometry(wv.x1 - wv.x0, wv.z1 - wv.z0); geo.rotateX(-Math.PI / 2);
        geo.translate((wv.x0 + wv.x1) / 2, wv.level, (wv.z0 + wv.z1) / 2);
      }
      const m = new THREE.Mesh(geo, matFor(wv.opts)); m.receiveShadow = true; m.renderOrder = 2;
      this.root.add(m);
    }
  }
  // roof boxes of a building in its local (unrotated) frame; shared by rendering and collision
  _roofParts(B) {
    const b = B.def, out = [], fy = B.floorY;
    const x = b.x, z = b.z, w = b.w, d = b.d, wall = b.wall || 'plaster';
    const box = (texName, tint, x0, y0, z0, x1, y1, z1, nocol = false) => out.push({ texName, tint, x0, y0, z0, x1, y1, z1, nocol });
    const holes = B.holes.top || [];
    if (B.under) {
      // lid = the ground above the hall: flush with the surface, walkable, opaque from outside
      const top = fy + B.h + 0.02;
      for (const [rx0, rz0, rx1, rz1] of subtractRects([x, z, x + w, z + d], holes)) box(b.roof || 'grass', b.roofTint, rx0, top - 0.32, rz0, rx1, top, rz1);
      for (const rb of b.roofExtras || []) box(rb.tex || 'metalPanel', null, x + rb[0], top, z + rb[1], x + rb[2], top + rb[4], z + rb[3]);
      return out;
    }
    const rt = b.roof || 'roofTar', top = fy + B.h;
    for (const [rx0, rz0, rx1, rz1] of subtractRects([x - 0.15, z - 0.15, x + w + 0.15, z + d + 0.15], holes)) box(rt, b.roofTint, rx0, top, rz0, rx1, top + 0.25, rz1);
    if (b.roofShape === 'gable') {
      // stepped voxel gable along the long axis
      const alongX = w >= d, span = alongX ? d : w, steps = Math.max(2, Math.floor(span / 0.9));
      for (let s2 = 1; s2 < steps / 2; s2++) {
        const inset = s2 * span / steps, y0 = top + 0.25 + (s2 - 1) * 0.45, y1 = y0 + 0.45;
        if (alongX) box(rt, b.roofTint, x - 0.3, y0, z + inset - 0.3, x + w + 0.3, y1, z + d - inset + 0.3);
        else box(rt, b.roofTint, x + inset - 0.3, y0, z - 0.3, x + w - inset + 0.3, y1, z + d + 0.3);
      }
    } else if (b.parapet !== false) {
      const p = 0.4, y0 = top + 0.25, y1 = y0 + p;
      box(wall, b.tint, x - 0.15, y0, z - 0.15, x + w + 0.15, y1, z + 0.15);
      box(wall, b.tint, x - 0.15, y0, z + d - 0.15, x + w + 0.15, y1, z + d + 0.15);
      box(wall, b.tint, x - 0.15, y0, z - 0.15, x + 0.15, y1, z + d + 0.15);
      box(wall, b.tint, x + w - 0.15, y0, z - 0.15, x + w + 0.15, y1, z + d + 0.15);
    }
    // vents keep clear of ladder tops / roof hatches so you never climb into one
    const keep = [...holes.map(([a, c, e, f]) => [(a + e) / 2, (c + f) / 2]), ...this.ladders.filter(l => l.bid === B.id).map(l => unrotPt(B.R, l.x1, l.z1))];
    const rnd = mulberry(B.id * 977 + 13);
    for (let i = 0; i < (b.vents ?? Math.floor(w * d / 30)); i++) {
      const vx = x + 1 + rnd() * Math.max(0.5, w - 3), vz = z + 1 + rnd() * Math.max(0.5, d - 3), sz = 0.6 + rnd() * 1.0, vh = 0.4 + rnd() * 0.6, vt = rnd() < .5 ? 'metalPanel' : 'rust', vd = sz * (0.6 + rnd());
      if (keep.some(([kx, kz]) => Math.abs(kx - (vx + sz / 2)) < sz / 2 + 1.2 && Math.abs(kz - (vz + vd / 2)) < vd / 2 + 1.2)) continue;
      box(vt, null, vx, top + 0.25, vz, vx + sz, top + 0.25 + vh, vz + vd);
    }
    for (const rb of b.roofExtras || []) box(rb.tex || 'metalPanel', null, x + rb[0], top + 0.25, z + rb[1], x + rb[2], top + 0.25 + rb[4], z + rb[3]);
    return out;
  }
  _buildRoofs() {
    const groups = new Map();
    for (const { bid } of this.roofBoxes) {
      const B = this.buildings[bid], R = B.R;
      for (const r of this._roofParts(B)) {
        const key = r.texName + '|' + (r.tint || '');
        let gr = groups.get(key);
        if (!gr) { gr = { texName: r.texName, tint: r.tint, pos: [], nor: [], uv: [], idx: [], bid: [] }; groups.set(key, gr); }
        const start = gr.pos.length / 3;
        pushBox(gr, r.x0, r.y0, r.z0, r.x1, r.y1, r.z1, 4, { bid });
        if (R) rotTail(gr, start, R);
      }
    }
    for (const r of groups.values()) {
      const m = new THREE.Mesh(geoFrom(r), roofMaterial(tex(r.texName, 9), this.alphaTex, r.tint || 0xffffff));
      m.castShadow = true; m.receiveShadow = true; m.renderOrder = 30;
      this.root.add(m);
    }
  }
  // ladders: two rails + rungs against the wall, from y0 to y1
  _buildLadders() {
    const mat = litTex(tex('rust', 4), { cutaway: true, xray: true });
    for (const l of this.ladders) {
      const R = rotFrame(l.x0, l.z0, -(l.face || 0) + Math.PI / 2);
      const bx = l.wall ? l.wall[0] : l.x0, bz = l.wall ? l.wall[1] : l.z0;
      const R2 = rotFrame(bx, bz, R.a);
      const H = l.y1 - l.y0, y0 = l.y0;
      for (const sx of [-0.28, 0.28]) this.boxes.add('ladder', mat, bx - 0.04, y0, bz + sx - 0.04, bx + 0.04, y0 + H + 0.9, bz + sx + 0.04, { R: R2, cast: true });
      for (let yy = 0.3; yy < H + 0.6; yy += 0.35) this.boxes.add('ladder', mat, bx - 0.03, y0 + yy, bz - 0.28, bx + 0.03, y0 + yy + 0.05, bz + 0.28, { R: R2, cast: false });
    }
  }
  _buildProps() {
    const dummy = new THREE.Object3D();
    const byKey = new Map();
    for (const p of this.props) {
      const key = p.kind + '|' + Math.floor(p.x / PROP_REGION) + ',' + Math.floor(p.z / PROP_REGION);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(p);
    }
    const xrayMat = litVox({ xray: true, cutaway: true }), swayMat = litVox({ xray: true, sway: true, cutaway: true });
    const SWAY = /tree|pine|palm|bush|olive|reed|grass|fern|shrub|cypress|willow|birch|oak|foliage|hedge|vine|weed/i;
    for (const [key, list] of byKey) {
      const kind = key.split('|')[0];
      const geo = propGeo(kind);
      if (!geo) { console.warn('unknown prop', kind); continue; }
      const im = new THREE.InstancedMesh(geo, (propInfo(kind).sway ?? SWAY.test(kind)) ? swayMat : xrayMat, list.length);
      list.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.rot, 0); dummy.scale.setScalar(p.opts.scale || 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
      im.castShadow = propInfo(kind).cast !== false; im.receiveShadow = true;
      im.computeBoundingSphere();
      this.root.add(im);
    }
  }
  // RGBA occlusion texture for 2D light / gaze raymarching (0.25 m units, -8 m offset):
  // R = column top (incl. closed ground-floor doors), G/B = first floating span (slab / roof / tunnel lid)
  _occAt(i) {
    const g = this.grid, enc = (y) => clamp(Math.round((y + 8) * 4), 0, 255);
    let top = g.top[i];
    const dk = g.door[i]; if (dk >= 0) { const b = g.doorBlocks[dk]; if (b.closed && b.y0 <= top + 0.3) top = Math.max(top, b.y1); }
    const r = g.spanRef[i], sp = r >= 0 ? g.spans[r] : null;
    const o = i * 4; this.occData[o] = enc(top);
    if (sp && sp.length) { this.occData[o + 1] = enc(sp[0]); this.occData[o + 2] = enc(sp[1]); } else { this.occData[o + 1] = 0; this.occData[o + 2] = 0; }
    this.occData[o + 3] = 255;
  }
  _buildOcclusion() {
    const g = this.grid, n = g.cw * g.ch;
    this.occData = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) this._occAt(i);
    this.occTex = new THREE.DataTexture(this.occData, g.cw, g.ch, THREE.RGBAFormat, THREE.UnsignedByteType);
    this.occTex.magFilter = this.occTex.minFilter = THREE.NearestFilter; this.occTex.needsUpdate = true;
    GU.tOcc.value = this.occTex;
    GU.uOccSize.value.set(g.cw * CELL, g.ch * CELL);
  }
  // runtime change to the ground column (barricades). Re-uploads the occlusion texture.
  setTop(x0, z0, x1, z1, top, R = null) {
    const g = this.grid;
    g.eachCell(x0, z0, x1, z1, R, true, (i) => { g.top[i] = top; g.solidBase[i] = 1; this._occAt(i); });
    this.occTex.needsUpdate = true;
  }
  // open / close a door blocker (only blocks its own storey)
  setDoor(k, closed) {
    const g = this.grid, b = g.doorBlocks[k]; if (!b || b.closed === closed) return;
    b.closed = closed;
    if (!this.occData) return;
    for (const i of b.cells) this._occAt(i);
    this.occTex.needsUpdate = true;
  }
  _setAlpha(id, a) { const i = id * 4; this.alphaData[i] = Math.round(a * 255); this.alphaTex.needsUpdate = true; }

  // per-frame: roof fades + cutaway for the building the local player is inside (height-aware: on a
  // roof or on the ground above a tunnel you are not "inside"); walls/slabs above your feet are cut
  update(dt, px, pz, py = 0) {
    const g = this.grid, ci = g.idx(px, pz);
    const inside = g.insideAt(px, pz, py, this.buildings);
    const onRoof = (b) => ci >= 0 && (g.indoor[ci] === b.id || g.indoor2[ci] === b.id) && py >= b.roofY - 0.4;
    this.inside = inside;
    for (const b of this.buildings) {
      b.target = b.id === inside ? 0 : (b.deck || onRoof(b)) ? 1 : (b.def.peek ?? 0.72);
      if (b.alpha !== b.target) {
        const sp = dt * 2.6;
        b.alpha = b.alpha < b.target ? Math.min(b.target, b.alpha + sp) : Math.max(b.target, b.alpha - sp);
        this._setAlpha(b.id, b.alpha);
      }
    }
    // stepped out onto the roof / lid of the building we were cut into: drop the cut at once so its
    // interior doesn't show through the surface we now stand on
    const was = this._cutB ?? -1; this._cutB = inside;
    if (inside < 0 && was >= 0 && py >= this.buildings[was].roofY - 0.6) { GU.uCutH.value = 999; GU.uCut.value.set(1e9, 1e9, -1e9, -1e9); }
    if (inside >= 0) {
      const b = this.buildings[inside];
      GU.uCut.value.set(b.x0 - 0.3, b.z0 - 0.3, b.x1 + 0.3, b.z1 + 0.3);
      if (b.R) GU.uCutR.value.set(b.R.cx, b.R.cz, b.R.c, b.R.s); else GU.uCutR.value.set(0, 0, 1, 0);
      const want = Math.max(b.floorY, py) + 1.15;
      if (GU.uCutH.value > b.roofY + 1) GU.uCutH.value = b.roofY + 1;
      GU.uCutH.value = GU.uCutH.value > want ? Math.max(want, GU.uCutH.value - dt * 7) : Math.min(want, GU.uCutH.value + dt * 7);
    } else if ([[0, 0], [1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2]].filter(([dx, dz]) => g.ceilAt(px + dx, pz + dz, py + 0.5) < py + 9).length >= 4) {
      // under a deck / overpass / overhang: cut a window around us so we stay visible underneath
      GU.uCut.value.set(px - 7, pz - 4, px + 7, pz + 6); GU.uCutR.value.set(0, 0, 1, 0);
      const want = py + 2.2;
      if (GU.uCutH.value > want + 5) GU.uCutH.value = want + 5;
      GU.uCutH.value = GU.uCutH.value > want ? Math.max(want, GU.uCutH.value - dt * 9) : want;
    } else {
      GU.uCutH.value = Math.min(999, GU.uCutH.value + dt * 9);
      if (GU.uCutH.value > py + 9) { GU.uCutH.value = 999; GU.uCut.value.set(1e9, 1e9, -1e9, -1e9); }
    }
    GU.uXray.value.set(px, pz - OBLIQUE_K * (py + 0.9), py + 0.9 + OBLIQUE_K * pz, 2.4);
    GU.uXrayY.value = py;
  }
  // is a point hidden by the current cutaway (inside the cut building's footprint and above the cut)?
  cutHides(x, z, y) {
    const c = GU.uCut.value; if (c.x > c.z) return false;
    const H = GU.uCutH.value; if (y <= H - 0.2) return false;
    const R = GU.uCutR.value, inRect = (px, pz) => {
      const dx = px - R.x, dz = pz - R.y, lx = R.x + dx * R.z + dz * R.w, lz = R.y - dx * R.w + dz * R.z;
      return lx > c.x && lx < c.z && lz > c.y && lz < c.w;
    };
    return inRect(x, z) || inRect(x, z - OBLIQUE_K * (y - (H - 1.15)));
  }
}
const TERRAIN_NAME = Object.fromEntries(Object.entries(TID).map(([k, v]) => [v, k]));
