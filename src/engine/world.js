// World: collision/occlusion grid + mesh builders (terrain, blocks, buildings w/ fading roofs, water, props).
import * as THREE from '../../vendor/three.module.js';
import { tex, TID } from './textures.js';
import { litTex, terrainMaterial, waterMaterial, GU } from './materials.js';
import { OBLIQUE_K } from './renderer.js';
import { propGeo } from './models.js';
import { litVox } from './materials.js';

export const CELL = 0.5;      // collision grid resolution (m)
const TCELL = 1;              // terrain id resolution (m)
const CHUNK = 32;

export class Grid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cw = Math.ceil(w / CELL); this.ch = Math.ceil(h / CELL);
    this.solid = new Float32Array(this.cw * this.ch);     // obstacle height (m), 0 = free
    this.water = new Uint8Array(this.cw * this.ch);       // 0 none, 1 shallow, 2 deep
    this.indoor = new Int16Array(this.cw * this.ch).fill(-1);
    this.noise = new Uint8Array(this.cw * this.ch);       // surface type for footsteps
  }
  idx(x, z) { const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL); if (cx < 0 || cz < 0 || cx >= this.cw || cz >= this.ch) return -1; return cz * this.cw + cx; }
  heightAt(x, z) { const i = this.idx(x, z); return i < 0 ? 99 : this.solid[i]; }
  waterAt(x, z) { const i = this.idx(x, z); return i < 0 ? 0 : this.water[i]; }
  indoorAt(x, z) { const i = this.idx(x, z); return i < 0 ? -1 : this.indoor[i]; }
  fillRect(arr, x0, z0, x1, z1, v, mode = 'set') {
    const a = Math.max(0, Math.floor(x0 / CELL + 1e-6)), b = Math.max(0, Math.floor(z0 / CELL + 1e-6));
    const c = Math.min(this.cw - 1, Math.ceil(x1 / CELL - 1e-6) - 1), d = Math.min(this.ch - 1, Math.ceil(z1 / CELL - 1e-6) - 1);
    for (let z = b; z <= d; z++) for (let x = a; x <= c; x++) {
      const i = z * this.cw + x;
      arr[i] = mode === 'max' ? Math.max(arr[i], v) : v;
    }
  }
  // DDA ray: distance until a cell with solid >= h (or max)
  ray(x, z, dx, dz, max, h = 1.2) {
    let cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = Math.abs(CELL / (dx || 1e-9)), tdz = Math.abs(CELL / (dz || 1e-9));
    let tx = ((dx > 0 ? (cx + 1) * CELL - x : x - cx * CELL)) / Math.abs(dx || 1e-9);
    let tz = ((dz > 0 ? (cz + 1) * CELL - z : z - cz * CELL)) / Math.abs(dz || 1e-9);
    let t = 0;
    while (t < max) {
      if (tx < tz) { t = tx; tx += tdx; cx += sx; } else { t = tz; tz += tdz; cz += sz; }
      if (t >= max) break;
      if (cx < 0 || cz < 0 || cx >= this.cw || cz >= this.ch) return t;
      if (this.solid[cz * this.cw + cx] >= h) return t;
    }
    return max;
  }
  los(x0, z0, x1, z1, h = 1.2) {
    const dx = x1 - x0, dz = z1 - z0, d = Math.hypot(dx, dz);
    if (d < 0.01) return true;
    return this.ray(x0, z0, dx / d, dz / d, d, h) >= d - 0.01;
  }
  // circle vs grid collision; returns resolved position
  move(p, vx, vz, r, maxStep = 0.35) {
    const blocked = (x, z) => {
      const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
      for (let cz = z0; cz <= z1; cz++) for (let cx = x0; cx <= x1; cx++) {
        if (cx < 0 || cz < 0 || cx >= this.cw || cz >= this.ch) return true;
        const i = cz * this.cw + cx;
        if (this.solid[i] > maxStep || this.water[i] === 2) {
          // precise circle-vs-cell test
          const nx = Math.max(cx * CELL, Math.min(x, (cx + 1) * CELL)), nz = Math.max(cz * CELL, Math.min(z, (cz + 1) * CELL));
          if ((nx - x) ** 2 + (nz - z) ** 2 < r * r) return true;
        }
      }
      return false;
    };
    const steps = Math.ceil(Math.max(Math.abs(vx), Math.abs(vz)) / (r * 0.5)) || 1;
    let x = p.x, z = p.z, hit = false;
    for (let s = 0; s < steps; s++) {
      const nx = x + vx / steps;
      if (!blocked(nx, z)) x = nx; else hit = true;
      const nz = z + vz / steps;
      if (!blocked(x, nz)) z = nz; else hit = true;
    }
    p.x = x; p.z = z;
    return hit;
  }
}

// Accumulates textured boxes into chunked merged meshes
class BoxBatch {
  constructor() { this.groups = new Map(); }
  add(matKey, material, x0, y0, z0, x1, y1, z1, opts = {}) {
    const ck = Math.floor((x0 + x1) / 2 / CHUNK) + ',' + Math.floor((z0 + z1) / 2 / CHUNK);
    const key = matKey + '|' + ck + '|' + (opts.cast === false ? 0 : 1);
    let g = this.groups.get(key);
    if (!g) { g = { material, pos: [], nor: [], uv: [], idx: [], cast: opts.cast !== false }; this.groups.set(key, g); }
    const rep = opts.rep || 4, K = OBLIQUE_K;
    const quad = (a, b, c, d, n, uvs) => {
      const base = g.pos.length / 3;
      g.pos.push(...a, ...b, ...c, ...d);
      for (let i = 0; i < 4; i++) g.nor.push(...n);
      g.uv.push(...uvs);
      g.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const ox = opts.uOff || 0;
    // top
    if (!opts.noTop) quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0],
      [x0 / rep, -z1 / rep, x1 / rep, -z1 / rep, x1 / rep, -z0 / rep, x0 / rep, -z0 / rep]);
    // south (+z) - the face the camera sees
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1],
      [(x0 + ox) / rep, y0 * K / rep, (x1 + ox) / rep, y0 * K / rep, (x1 + ox) / rep, y1 * K / rep, (x0 + ox) / rep, y1 * K / rep]);
    // north
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1],
      [x1 / rep, y0 * K / rep, x0 / rep, y0 * K / rep, x0 / rep, y1 * K / rep, x1 / rep, y1 * K / rep]);
    // east / west
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0],
      [z1 / rep, y0 * K / rep, z0 / rep, y0 * K / rep, z0 / rep, y1 * K / rep, z1 / rep, y1 * K / rep]);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0],
      [z0 / rep, y0 * K / rep, z1 / rep, y0 * K / rep, z1 / rep, y1 * K / rep, z0 / rep, y1 * K / rep]);
  }
  build(parent) {
    for (const g of this.groups.values()) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
      geo.setIndex(g.idx);
      geo.computeBoundingSphere();
      const m = new THREE.Mesh(geo, g.material);
      m.castShadow = g.cast; m.receiveShadow = true;
      parent.add(m);
    }
  }
}

// Roofs: one merged mesh, per-building alpha from a data texture (fade in/out + "peek" bias)
function roofMaterial(texture, alphaTex) {
  const m = new THREE.MeshLambertMaterial({ map: texture, transparent: true, depthWrite: false });
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

export class World {
  constructor(scene, w, h, opts = {}) {
    this.scene = scene; this.w = w; this.h = h;
    this.grid = new Grid(w, h);
    this.root = new THREE.Group(); scene.add(this.root);
    this.tw = Math.ceil(w / TCELL); this.th = Math.ceil(h / TCELL);
    this.tids = new Uint8Array(this.tw * this.th).fill(TID[opts.base || 'grass']);
    this.boxes = new BoxBatch();
    this.roofs = new Map(); // texName -> {pos,nor,uv,bid,idx}
    this.buildings = [];
    this.waters = [];
    this.props = new Map();
    this.lamps = [];
    this.alphaData = new Uint8Array(256 * 8 * 4).fill(255);
    this.alphaTex = new THREE.DataTexture(this.alphaData, 256, 8, THREE.RGBAFormat);
    this.alphaTex.magFilter = this.alphaTex.minFilter = THREE.NearestFilter;
    this.roofAlpha = [];
  }
  // ---------- terrain painting
  paint(name, x0, z0, x1, z1) {
    const id = TID[name];
    for (let z = Math.max(0, Math.floor(z0)); z < Math.min(this.th, Math.ceil(z1)); z++)
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(this.tw, Math.ceil(x1)); x++) this.tids[z * this.tw + x] = id;
  }
  paintCircle(name, cx, cz, r, noise = 0, seed = 1) {
    const id = TID[name];
    for (let z = Math.floor(cz - r - 2); z <= cz + r + 2; z++) for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++) {
      if (x < 0 || z < 0 || x >= this.tw || z >= this.th) continue;
      const a = Math.atan2(z - cz, x - cx);
      const rr = r * (1 + noise * (Math.sin(a * 3 + seed) * 0.5 + Math.sin(a * 7 + seed * 2) * 0.3));
      if ((x + .5 - cx) ** 2 + (z + .5 - cz) ** 2 < rr * rr) this.tids[z * this.tw + x] = id;
    }
  }
  paintFn(fn) { for (let z = 0; z < this.th; z++) for (let x = 0; x < this.tw; x++) { const n = fn(x + .5, z + .5, TID); if (n != null) this.tids[z * this.tw + x] = typeof n === 'string' ? TID[n] : n; } }
  terrainAt(x, z) { const tx = Math.floor(x), tz = Math.floor(z); return this.tids[tz * this.tw + tx]; }

  // ---------- solids
  block(x0, z0, x1, z1, h, texName = 'concrete', opts = {}) {
    const t = tex(texName, opts.seed || 5);
    const mat = litTex(t, { cutaway: !!opts.cutaway, xray: opts.xray !== false, color: opts.tint || 0xffffff });
    this.boxes.add(texName + (opts.cutaway ? 'c' : '') + (opts.tint || ''), mat, x0, opts.y0 || 0, z0, x1, (opts.y0 || 0) + h, z1, opts);
    if (opts.collide !== false) this.grid.fillRect(this.grid.solid, x0, z0, x1, z1, h + (opts.y0 || 0), 'max');
  }
  // walls with door gaps: segs along a line
  wallLine(ax, az, bx, bz, thick, h, texName, gaps = [], opts = {}) {
    const horiz = az === bz;
    const len = horiz ? bx - ax : bz - az;
    const pieces = []; let cur = 0;
    gaps.slice().sort((a, b) => a.at - b.at).forEach(g => { if (g.at > cur) pieces.push([cur, g.at, g]); cur = g.at + g.w; pieces.push([g.at, g.at + g.w, g, true]); });
    if (cur < len) pieces.push([cur, len]);
    for (const [s, e, g, isGap] of pieces) {
      if (e - s < 0.01) continue;
      const lo = isGap ? (g.sill || 0) : 0, top = isGap ? (g.sill ? g.sill : 0) : h;
      if (isGap) {
        if (g.sill) { // window: low wall + lintel
          this._seg(horiz, ax, az, s, e, thick, 0, g.sill, texName, opts);
          this._seg(horiz, ax, az, s, e, thick, g.top || h - 0.6, h, texName, { ...opts, collide: false });
          this._mark(horiz, ax, az, s, e, thick, g.sill);
        } else if (g.lintel !== false) {
          this._seg(horiz, ax, az, s, e, thick, h - 0.5, h, texName, { ...opts, collide: false });
        }
      } else this._seg(horiz, ax, az, s, e, thick, 0, h, texName, opts);
      void lo; void top;
    }
  }
  _seg(horiz, ax, az, s, e, thick, y0, y1, texName, opts) {
    const t2 = thick / 2;
    if (horiz) this.block(ax + s, az - t2, ax + e, az + t2, y1 - y0, texName, { ...opts, y0, uOff: 0 });
    else this.block(ax - t2, az + s, ax + t2, az + e, y1 - y0, texName, { ...opts, y0 });
  }
  _mark(horiz, ax, az, s, e, thick, h) {
    const t2 = thick / 2;
    if (horiz) this.grid.fillRect(this.grid.solid, ax + s, az - t2, ax + e, az + t2, h, 'max');
    else this.grid.fillRect(this.grid.solid, ax - t2, az + s, ax + t2, az + e, h, 'max');
  }
  // building: rect, walls with doors/windows, floor, fading roof
  building(b) {
    const id = this.buildings.length;
    const { x, z, w, d } = b, h = b.h || 3.2, th = b.thick || 0.3, wall = b.wall || 'plaster';
    const bb = { id, x0: x, z0: z, x1: x + w, z1: z + d, h, alpha: 0.72, target: 0.72, def: b };
    this.buildings.push(bb);
    this.paint(b.floor || 'tiles', x, z, x + w, z + d);
    this.grid.fillRect(this.grid.indoor, x + 0.01, z + 0.01, x + w - 0.01, z + d - 0.01, id);
    const o = { cutaway: true, seed: b.seed || id + 3, tint: b.tint };
    const doors = b.doors || [];
    const gapsFor = side => doors.filter(dd => dd.side === side);
    this.wallLine(x, z, x + w, z, th, h, wall, gapsFor('n'), o);
    this.wallLine(x, z + d, x + w, z + d, th, h, wall, gapsFor('s'), o);
    this.wallLine(x, z, x, z + d, th, h, wall, gapsFor('w'), o);
    this.wallLine(x + w, z, x + w, z + d, th, h, wall, gapsFor('e'), o);
    for (const iw of b.inner || []) this.wallLine(x + iw[0], z + iw[1], x + iw[2], z + iw[3], 0.2, h, b.innerWall || wall, iw[4] || [], o);
    // roof slab (+ parapet, vents) into roof batch
    const rt = b.roof || 'roofTar';
    this._roofBox(rt, id, x - 0.15, h, z - 0.15, x + w + 0.15, h + 0.25, z + d + 0.15);
    if (b.parapet !== false) {
      const p = 0.35;
      this._roofBox(wall, id, x - 0.15, h + 0.25, z - 0.15, x + w + 0.15, h + 0.25 + p, z + 0.15);
      this._roofBox(wall, id, x - 0.15, h + 0.25, z + d - 0.15, x + w + 0.15, h + 0.25 + p, z + d + 0.15);
      this._roofBox(wall, id, x - 0.15, h + 0.25, z - 0.15, x + 0.15, h + 0.25 + p, z + d + 0.15);
      this._roofBox(wall, id, x + w - 0.15, h + 0.25, z - 0.15, x + w + 0.15, h + 0.25 + p, z + d + 0.15);
    }
    const rnd = mulberry(id * 977 + 13);
    for (let i = 0; i < (b.vents ?? Math.floor(w * d / 30)); i++) {
      const vx = x + 1 + rnd() * (w - 3), vz = z + 1 + rnd() * (d - 3), s = 0.6 + rnd() * 1.0;
      this._roofBox(rnd() < .5 ? 'metalPanel' : 'rust', id, vx, h + 0.25, vz, vx + s, h + 0.25 + 0.4 + rnd() * 0.6, vz + s * (0.6 + rnd()));
    }
    return bb;
  }
  _roofBox(texName, bid, x0, y0, z0, x1, y1, z1) {
    let r = this.roofs.get(texName);
    if (!r) { r = { pos: [], nor: [], uv: [], bid: [], idx: [] }; this.roofs.set(texName, r); }
    const K = OBLIQUE_K, rep = 4;
    const quad = (a, b, c, d, n, uvs) => {
      const base = r.pos.length / 3; r.pos.push(...a, ...b, ...c, ...d);
      for (let i = 0; i < 4; i++) { r.nor.push(...n); r.bid.push(bid); }
      r.uv.push(...uvs); r.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], [x0 / rep, -z1 / rep, x1 / rep, -z1 / rep, x1 / rep, -z0 / rep, x0 / rep, -z0 / rep]);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], [x0 / rep, y0 * K / rep, x1 / rep, y0 * K / rep, x1 / rep, y1 * K / rep, x0 / rep, y1 * K / rep]);
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], [0, 0, 0, 0, 0, 0, 0, 0]);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], [0, 0, 0, 0, 0, 0, 0, 0]);
  }
  water(x0, z0, x1, z1, opts = {}) {
    this.waters.push({ x0, z0, x1, z1, level: opts.level ?? -0.15, deep: !!opts.deep, opts });
    this.grid.fillRect(this.grid.water, x0, z0, x1, z1, opts.deep ? 2 : 1);
    this.paint(opts.bed || 'mud', x0, z0, x1, z1);
  }
  prop(kind, x, z, rot = 0, opts = {}) {
    let list = this.props.get(kind);
    if (!list) { list = []; this.props.set(kind, list); }
    list.push({ x, z, rot, y: opts.y || 0, s: opts.scale || 1 });
    if (opts.solid) {
      const [hw, hd, hh] = opts.solid;
      this.grid.fillRect(this.grid.solid, x - hw, z - hd, x + hw, z + hd, hh, 'max');
    }
  }
  lamp(x, y, z, color = 0xffd8a0, intensity = 12, distance = 9, flicker = 0) { this.lamps.push({ x, y, z, color, intensity, distance, flicker }); }

  finalize() {
    // terrain
    const idTex = new THREE.DataTexture(this.tids, this.tw, this.th, THREE.RedFormat, THREE.UnsignedByteType);
    idTex.magFilter = idTex.minFilter = THREE.NearestFilter; idTex.needsUpdate = true;
    // need RGBA for broad compatibility -> expand
    const rgba = new Uint8Array(this.tw * this.th * 4);
    for (let i = 0; i < this.tids.length; i++) rgba[i * 4] = this.tids[i];
    const idTex2 = new THREE.DataTexture(rgba, this.tw, this.th, THREE.RGBAFormat);
    idTex2.magFilter = idTex2.minFilter = THREE.NearestFilter; idTex2.needsUpdate = true;
    // contact-shadow AO texture from the solid grid (linear filtered, dithered in shader)
    const g = this.grid, ao = new Uint8Array(g.cw * g.ch * 4);
    for (let z = 0; z < g.ch; z++) for (let x = 0; x < g.cw; x++) {
      let occ = 0;
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) {
        const xx = x + dx, zz = z + dz; if (xx < 0 || zz < 0 || xx >= g.cw || zz >= g.ch) continue;
        const hgt = g.solid[zz * g.cw + xx]; if (hgt <= 0.2) continue;
        const d = Math.hypot(dx, dz); occ += Math.min(1, hgt / 2) * (d === 0 ? 0.3 : 1 / (d * d + 0.5));
      }
      const i = (z * g.cw + x) * 4;
      ao[i] = 255 - Math.min(255, Math.round(occ * 70));
      ao[i + 1] = g.water[z * g.cw + x] ? 255 : 0;
      ao[i + 3] = 255;
    }
    const aoTex = new THREE.DataTexture(ao, g.cw, g.ch, THREE.RGBAFormat);
    aoTex.magFilter = aoTex.minFilter = THREE.LinearFilter; aoTex.needsUpdate = true;
    this.aoTex = aoTex;
    const tmat = terrainMaterial(idTex2, TCELL, [0, 0], aoTex, [g.cw * 0.5, g.ch * 0.5]);
    for (let cz = 0; cz < this.h; cz += CHUNK) for (let cx = 0; cx < this.w; cx += CHUNK) {
      const gw = Math.min(CHUNK, this.w - cx), gh = Math.min(CHUNK, this.h - cz);
      const g = new THREE.PlaneGeometry(gw, gh); g.rotateX(-Math.PI / 2); g.translate(cx + gw / 2, 0, cz + gh / 2);
      const m = new THREE.Mesh(g, tmat); m.receiveShadow = true; this.root.add(m);
    }
    // water
    const wmat = waterMaterial();
    for (const wv of this.waters) {
      const g = new THREE.PlaneGeometry(wv.x1 - wv.x0, wv.z1 - wv.z0); g.rotateX(-Math.PI / 2);
      g.translate((wv.x0 + wv.x1) / 2, 0.02, (wv.z0 + wv.z1) / 2);
      const m = new THREE.Mesh(g, wv.opts.material || wmat); m.receiveShadow = true; m.renderOrder = 2; this.root.add(m);
    }
    this.boxes.build(this.root);
    // roofs
    for (const [tn, r] of this.roofs) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(r.pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(r.nor, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(r.uv, 2));
      geo.setAttribute('aBid', new THREE.Float32BufferAttribute(r.bid, 1));
      geo.setIndex(r.idx); geo.computeBoundingSphere();
      const t = tex(tn, 9);
      const m = new THREE.Mesh(geo, roofMaterial(t, this.alphaTex));
      m.castShadow = true; m.receiveShadow = true; m.renderOrder = 30;
      // roofs still cast full shadows regardless of fade
      m.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
      this.root.add(m);
    }
    // instanced props
    const dummy = new THREE.Object3D();
    for (const [kind, list] of this.props) {
      const im = new THREE.InstancedMesh(propGeo(kind), litVox({ xray: true }), list.length);
      list.forEach((p, i) => { dummy.position.set(p.x, p.y, p.z); dummy.rotation.set(0, p.rot, 0); dummy.scale.setScalar(p.s); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
      im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere();
      this.root.add(im);
    }
    this.buildings.forEach(b => this._setAlpha(b.id, b.alpha));
  }
  _setAlpha(id, a) { const i = (id % 256 + Math.floor(id / 256) * 256) * 4; this.alphaData[i] = Math.round(a * 255); this.alphaTex.needsUpdate = true; }

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
      GU.uCutH.value = Math.max(1.1, GU.uCutH.value - dt * 6);
      if (GU.uCutH.value > b.h + 1) GU.uCutH.value = b.h + 1;
    } else {
      GU.uCutH.value = Math.min(99, GU.uCutH.value + dt * 8);
      if (GU.uCutH.value > 8) GU.uCut.value.set(1e9, 1e9, -1e9, -1e9);
    }
    GU.uXray.value.set(px, pz - OBLIQUE_K * (py + 0.9), py + 0.9 + OBLIQUE_K * pz, 2.2);
  }
}

export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
