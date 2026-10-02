// World v2: heightfield terrain, 2.5D collision/occlusion grid, structure + prop builders,
// fading roofs, water, and gameplay markers. Map modules describe a level through this API;
// everything is resolved and meshed in finalize() so call order of terrain vs structures is free.
import * as THREE from '../../vendor/three.module.js';
import { tex, TID } from './textures.js';
import { litTex, terrainMaterial, waterMaterial, GU, litVox } from './materials.js';
import { OBLIQUE_K } from './renderer.js';
import { propGeo, propInfo } from './models.js';

export const CELL = 0.5;      // collision grid resolution (m)
const CHUNK = 32;             // terrain / box batching chunk (m)
const PROP_REGION = 48;       // instanced prop culling region (m)
export const STEP_H = 0.45;   // max step-up height for walkers
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
    this.surf = new Uint8Array(n);
    this.bodies = [];                        // water bodies {level}
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
  // 2.5D DDA ray from (x,y,z) heading (dx,dz) with vertical slope dy per metre.
  // Returns distance travelled before hitting a cell whose top is above the ray.
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
      if (this.top[cz * this.cw + cx] > y + dy * t) return t;
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
      let bad = this.top[i] > feetY + STEP_H;
      if (!bad && this.water[i]) { const b = this.bodies[this.water[i] - 1]; bad = b.level - this.top[i] > 0.95; }
      if (bad) {
        const nx = Math.max(cx * CELL, Math.min(x, (cx + 1) * CELL)), nz = Math.max(cz * CELL, Math.min(z, (cz + 1) * CELL));
        if ((nx - x) ** 2 + (nz - z) ** 2 < r * r) return true;
      }
    }
    return false;
  }
  // circle movement with sliding; p = {x,z}; returns true if something was hit
  move(p, vx, vz, r) {
    const steps = Math.ceil(Math.max(Math.abs(vx), Math.abs(vz)) / (r * 0.5)) || 1;
    let x = p.x, z = p.z, hit = false;
    for (let s = 0; s < steps; s++) {
      const feet = this.groundAt(x, z);
      const nx = x + vx / steps;
      if (!this.blockedAt(nx, z, r, feet)) x = nx; else hit = true;
      const nz = z + vz / steps;
      if (!this.blockedAt(x, nz, r, this.groundAt(x, z))) z = nz; else hit = true;
    }
    p.x = x; p.z = z;
    return hit;
  }
}

// ------------------------------------------------------------------------------------ BOX BATCH
class BoxBatch {
  constructor() { this.groups = new Map(); }
  add(matKey, material, x0, y0, z0, x1, y1, z1, opts = {}) {
    const ck = Math.floor((x0 + x1) / 2 / CHUNK) + ',' + Math.floor((z0 + z1) / 2 / CHUNK);
    const key = matKey + '|' + ck + '|' + (opts.cast === false ? 0 : 1);
    let g = this.groups.get(key);
    if (!g) { g = { material, pos: [], nor: [], uv: [], idx: [], cast: opts.cast !== false }; this.groups.set(key, g); }
    pushBox(g, x0, y0, z0, x1, y1, z1, opts.rep || 4, opts);
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
    this.arkSpawns = []; this.keyRooms = []; this.zones = []; this.ladders = [];
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
  block(x0, z0, x1, z1, h, texName = 'concrete', opts = {}) {
    this.solids.push({ x0, z0, x1, z1, h, texName, opts });
  }
  wallLine(ax, az, bx, bz, thick, h, texName, gaps = [], opts = {}) {
    const horiz = Math.abs(az - bz) < 1e-6;
    const len = horiz ? bx - ax : bz - az;
    const pieces = []; let cur = 0;
    gaps.slice().sort((a, b) => a.at - b.at).forEach(g => { if (g.at > cur) pieces.push([cur, g.at]); pieces.push([g.at, g.at + g.w, g]); cur = g.at + g.w; });
    if (cur < len) pieces.push([cur, len]);
    const t2 = thick / 2;
    const seg = (s, e, y0, y1, o) => {
      if (e - s < 0.01 || y1 - y0 < 0.01) return;
      if (horiz) this.block(ax + s, az - t2, ax + e, az + t2, y1 - y0, texName, { ...opts, ...o, rel0: y0 });
      else this.block(ax - t2, az + s, ax + t2, az + e, y1 - y0, texName, { ...opts, ...o, rel0: y0 });
    };
    for (const [s, e, g] of pieces) {
      if (!g) { seg(s, e, 0, h); continue; }
      if (g.sill) { seg(s, e, 0, g.sill, {}); seg(s, e, g.top || Math.min(h, g.sill + 1.4), h, { collide: false }); }
      else if (g.lintel !== false && h > (g.h || 2.4)) seg(s, e, g.h || 2.4, h, { collide: false });
      if (g.door) this.doors.push({ x: horiz ? ax + s + g.w / 2 : ax, z: horiz ? az : az + s + g.w / 2, axis: horiz ? 'x' : 'z', w: g.w, locked: g.locked || null, bid: opts.bid ?? -1, thick });
    }
  }
  /*
   building({ x, z, w, d, storeys=1, storeyH=3.2, h?, wall, floor, roof, roofTint, tint, thick,
              doors:[{side:'n'|'s'|'e'|'w', at, w, sill?, door?:true, locked?:keyId}],
              inner:[[x0,z0,x1,z1,[gaps]]] (relative), peek=0.72, parapet=true, vents, id?, name? })
  */
  building(b) {
    const id = this.buildings.length;
    const storeys = b.storeys || 1;
    const h = b.h || storeys * (b.storeyH || 3.2);
    const bb = { id, x0: b.x, z0: b.z, x1: b.x + b.w, z1: b.z + b.d, h, alpha: b.peek ?? 0.72, target: 0.72, def: b, floorY: 0, name: b.name || null };
    this.buildings.push(bb);
    this.flatten(b.x - 0.5, b.z - 0.5, b.x + b.w + 0.5, b.z + b.d + 0.5, b.floorY ?? null, b.blend ?? 2.5);
    if (b.floor !== false) this.paint(b.floor || 'tiles', b.x, b.z, b.x + b.w, b.z + b.d);
    const th = b.thick || 0.3, wall = b.wall || 'plaster';
    const o = { cutaway: true, seed: b.seed ?? (id % 7) + 3, tint: b.tint, bid: id, onBuilding: id };
    const gapsFor = side => (b.doors || []).filter(dd => dd.side === side);
    const { x, z, w, d } = b;
    this.wallLine(x, z, x + w, z, th, h, wall, gapsFor('n'), o);
    this.wallLine(x, z + d, x + w, z + d, th, h, wall, gapsFor('s'), o);
    this.wallLine(x, z, x, z + d, th, h, wall, gapsFor('w'), o);
    this.wallLine(x + w, z, x + w, z + d, th, h, wall, gapsFor('e'), o);
    for (const iw of b.inner || []) this.wallLine(x + iw[0], z + iw[1], x + iw[2], z + iw[3], 0.2, Math.min(h, b.innerH || 3.2), b.innerWall || wall, iw[4] || [], o);
    // facade detail: storey bands + window strips on the south face (visual only)
    if (b.facade !== false && storeys > 1) {
      for (let s = 1; s < storeys; s++) this.block(x - 0.05, z + d - 0.05, x + w + 0.05, z + d + 0.12, 0.18, b.trim || 'concrete', { ...o, rel0: s * (h / storeys) - 0.1, collide: false, cast: false });
    }
    this.roofBoxes.push({ bid: id, b, h });
    return bb;
  }
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
  lamp(x, z, { y = 3.6, color = 0xffd8a0, intensity = 1.2, range = 10, flicker = 0, spot = null, model = 'lamp', rot = 0 } = {}) {
    this.lamps.push({ x, z, yRel: y, color, intensity, range, flicker, spot });
    if (model) this.prop(model, x, z, rot, { solid: [0.15, 0.15, 3] });
  }

  // =============================================================== GAMEPLAY MARKERS
  poi(id, name, x, z, r = 30, opts = {}) { this.pois.push({ id, name, x, z, r, tier: opts.tier ?? 1, ...opts }); }
  extract(id, name, x, z, opts = {}) { this.extracts.push({ id, name, x, z, kind: opts.kind || 'elevator', needsKey: opts.needsKey || null, ...opts }); }
  spawnPoint(x, z, opts = {}) { this.spawns.push({ x, z, ...opts }); }
  container(kind, x, z, rot = 0, opts = {}) { this.containers.push({ kind, x, z, rot, tier: opts.tier ?? 1, locked: opts.locked || null, room: opts.room || null, ...opts }); }
  arkSpawn(kind, x, z, opts = {}) { this.arkSpawns.push({ kind, x, z, count: opts.count || 1, radius: opts.radius || 6, patrol: opts.patrol || null, ...opts }); }
  keyRoom(id, x0, z0, x1, z1, key, opts = {}) { this.keyRooms.push({ id, x0, z0, x1, z1, key, ...opts }); }
  zone(name, poly, opts = {}) { this.zones.push({ name, poly, tier: opts.tier ?? 1, ...opts }); }

  // =============================================================== FINALIZE
  finalize() {
    const g = this.grid;
    // 1) building / explicit flattens
    for (const f of this.flattens) {
      let h = f.h;
      if (h == null) { // average of footprint
        let s = 0, n = 0; this._area(f.x0, f.z0, f.x1, f.z1, (x, z, i) => { s += this.hv[i]; n++; }); h = n ? s / n : 0;
        f.h = h;
      }
      this.raiseRect(f.x0, f.z0, f.x1, f.z1, h, f.blend, 'set');
    }
    this.buildings.forEach(b => { b.floorY = this.groundAt((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2); });
    // 2) ground into grid
    for (let cz = 0; cz < g.ch; cz++) for (let cx = 0; cx < g.cw; cx++) {
      const x = (cx + 0.5) * CELL, z = (cz + 0.5) * CELL, i = cz * g.cw + cx;
      g.top[i] = this.groundAt(x, z);
      const tn = TERRAIN_SURF[TERRAIN_NAME[this.terrainAt(x, z)]];
      g.surf[i] = tn ?? 0;
    }
    // 3) buildings: indoor cells
    for (const b of this.buildings) g.fillRect(g.indoor, b.x0 + 0.01, b.z0 + 0.01, b.x1 - 0.01, b.z1 - 0.01, b.id);
    // 4) solids
    for (const s of this.solids) {
      let base;
      if (s.opts.y0 != null) base = s.opts.y0;
      else if (s.opts.onBuilding != null) base = this.buildings[s.opts.onBuilding].floorY + (s.opts.rel0 || 0);
      else { base = Math.min(this.groundAt(s.x0, s.z0), this.groundAt(s.x1, s.z0), this.groundAt(s.x0, s.z1), this.groundAt(s.x1, s.z1)) + (s.opts.rel0 || 0); }
      const y0 = base - (s.opts.rel0 ? 0 : (s.opts.sink ?? 0.3)), y1 = base + s.h;
      const t = tex(s.texName, s.opts.seed || 5);
      const mat = litTex(t, { cutaway: !!s.opts.cutaway, xray: s.opts.xray !== false, color: s.opts.tint || 0xffffff });
      this.boxes.add(s.texName + (s.opts.cutaway ? 'c' : '') + (s.opts.tint || '') + (s.opts.xray === false ? 'n' : ''), mat, s.x0, y0, s.z0, s.x1, y1, s.z1, s.opts);
      if (s.opts.collide !== false) g.fillRect(g.top, s.x0, s.z0, s.x1, s.z1, y1, 'max');
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
    // 6) props: resolve height + solidity
    for (const p of this.props) {
      p.y = (p.opts.yAbs ?? (this.groundAt(p.x, p.z) + (p.opts.y || 0)));
      const info = propInfo(p.kind);
      let sol = p.opts.solid === true ? info.solid : p.opts.solid;
      if (sol) {
        const s = p.opts.scale || 1;
        let [hw, hd, hh] = sol; hw *= s; hd *= s; hh *= s;
        if (Math.abs(Math.sin(p.rot)) > 0.7) [hw, hd] = [hd, hw];
        g.fillRect(g.top, p.x - hw, p.z - hd, p.x + hw, p.z + hd, p.y + hh, 'max');
      }
    }
    this._buildTerrain();
    this._buildWater();
    this.boxes.build(this.root);
    this._buildRoofs();
    this._buildProps();
    this._buildOcclusion();
    this.lamps.forEach(l => { l.y = this.groundAt(l.x, l.z) + l.yRel; });
    for (const c of this.containers) c.y = this.groundAt(c.x, c.z);
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
    const wmat = waterMaterial();
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
      const m = new THREE.Mesh(geo, wv.opts.material || wmat); m.receiveShadow = true; m.renderOrder = 2;
      this.root.add(m);
    }
  }
  _buildRoofs() {
    const groups = new Map();
    const box = (texName, tint, bid, x0, y0, z0, x1, y1, z1) => {
      const key = texName + '|' + (tint || '');
      let r = groups.get(key);
      if (!r) { r = { texName, tint, pos: [], nor: [], uv: [], idx: [], bid: [] }; groups.set(key, r); }
      pushBox(r, x0, y0, z0, x1, y1, z1, 4, { bid });
    };
    for (const { bid, b, h } of this.roofBoxes) {
      const B = this.buildings[bid], fy = B.floorY, x = b.x, z = b.z, w = b.w, d = b.d, wall = b.wall || 'plaster';
      const rt = b.roof || 'roofTar', top = fy + h;
      box(rt, b.roofTint, bid, x - 0.15, top, z - 0.15, x + w + 0.15, top + 0.25, z + d + 0.15);
      if (b.parapet !== false) {
        const p = 0.4, y0 = top + 0.25, y1 = y0 + p;
        box(wall, b.tint, bid, x - 0.15, y0, z - 0.15, x + w + 0.15, y1, z + 0.15);
        box(wall, b.tint, bid, x - 0.15, y0, z + d - 0.15, x + w + 0.15, y1, z + d + 0.15);
        box(wall, b.tint, bid, x - 0.15, y0, z - 0.15, x + 0.15, y1, z + d + 0.15);
        box(wall, b.tint, bid, x + w - 0.15, y0, z - 0.15, x + w + 0.15, y1, z + d + 0.15);
      }
      const rnd = mulberry(bid * 977 + 13);
      for (let i = 0; i < (b.vents ?? Math.floor(w * d / 30)); i++) {
        const vx = x + 1 + rnd() * Math.max(0.5, w - 3), vz = z + 1 + rnd() * Math.max(0.5, d - 3), s = 0.6 + rnd() * 1.0;
        box(rnd() < .5 ? 'metalPanel' : 'rust', null, bid, vx, top + 0.25, vz, vx + s, top + 0.25 + 0.4 + rnd() * 0.6, vz + s * (0.6 + rnd()));
      }
      for (const rb of b.roofExtras || []) box(rb.tex || 'metalPanel', null, bid, x + rb[0], top + 0.25, z + rb[1], x + rb[2], top + 0.25 + rb[4], z + rb[3]);
    }
    for (const r of groups.values()) {
      const m = new THREE.Mesh(geoFrom(r), roofMaterial(tex(r.texName, 9), this.alphaTex, r.tint || 0xffffff));
      m.castShadow = true; m.receiveShadow = true; m.renderOrder = 30;
      this.root.add(m);
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
    const xrayMat = litVox({ xray: true });
    for (const [key, list] of byKey) {
      const kind = key.split('|')[0];
      const geo = propGeo(kind);
      if (!geo) { console.warn('unknown prop', kind); continue; }
      const im = new THREE.InstancedMesh(geo, xrayMat, list.length);
      list.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.rot, 0); dummy.scale.setScalar(p.opts.scale || 1); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
      im.castShadow = propInfo(kind).cast !== false; im.receiveShadow = true;
      im.computeBoundingSphere();
      this.root.add(im);
    }
  }
  // R8 occlusion texture of absolute tops (0.25 m units) for 2D light/cone raymarching
  _buildOcclusion() {
    const g = this.grid, data = new Uint8Array(g.cw * g.ch);
    for (let i = 0; i < data.length; i++) data[i] = clamp(Math.round((g.top[i] + 8) * 4), 0, 255);
    this.occData = data;
    this.occTex = new THREE.DataTexture(data, g.cw, g.ch, THREE.RedFormat, THREE.UnsignedByteType);
    this.occTex.magFilter = this.occTex.minFilter = THREE.NearestFilter; this.occTex.needsUpdate = true;
    GU.tOcc.value = this.occTex;
    GU.uOccSize.value.set(g.cw * CELL, g.ch * CELL);
  }
  // runtime change to the occlusion grid (doors, barricades). Re-uploads the texture.
  setTop(x0, z0, x1, z1, top) {
    const g = this.grid; g.fillRect(g.top, x0, z0, x1, z1, top);
    const a = Math.max(0, Math.floor(x0 / CELL)), b = Math.max(0, Math.floor(z0 / CELL)), c = Math.min(g.cw - 1, Math.ceil(x1 / CELL) - 1), d = Math.min(g.ch - 1, Math.ceil(z1 / CELL) - 1);
    for (let z = b; z <= d; z++) for (let x = a; x <= c; x++) this.occData[z * g.cw + x] = clamp(Math.round((g.top[z * g.cw + x] + 8) * 4), 0, 255);
    this.occTex.needsUpdate = true;
  }
  _setAlpha(id, a) { const i = id * 4; this.alphaData[i] = Math.round(a * 255); this.alphaTex.needsUpdate = true; }

  // per-frame: roof fades + cutaway for the building the local player is inside
  update(dt, px, pz, py = 0) {
    const inside = this.grid.indoorAt(px, pz);
    for (const b of this.buildings) {
      b.target = b.id === inside ? 0 : (b.def.peek ?? 0.72);
      if (b.alpha !== b.target) {
        const sp = dt * 2.6;
        b.alpha = b.alpha < b.target ? Math.min(b.target, b.alpha + sp) : Math.max(b.target, b.alpha - sp);
        this._setAlpha(b.id, b.alpha);
      }
    }
    if (inside >= 0) {
      const b = this.buildings[inside];
      GU.uCut.value.set(b.x0 - 0.3, b.z0 - 0.3, b.x1 + 0.3, b.z1 + 0.3);
      const want = b.floorY + 1.15;
      if (GU.uCutH.value > b.floorY + b.h + 1) GU.uCutH.value = b.floorY + b.h + 1;
      GU.uCutH.value = Math.max(want, GU.uCutH.value - dt * 7);
    } else {
      GU.uCutH.value = Math.min(999, GU.uCutH.value + dt * 9);
      if (GU.uCutH.value > py + 9) { GU.uCutH.value = 999; GU.uCut.value.set(1e9, 1e9, -1e9, -1e9); }
    }
    GU.uXray.value.set(px, pz - OBLIQUE_K * (py + 0.9), py + 0.9 + OBLIQUE_K * pz, 2.4);
    GU.uXrayY.value = py;
  }
}
const TERRAIN_NAME = Object.fromEntries(Object.entries(TID).map(([k, v]) => [v, k]));
