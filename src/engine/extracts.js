// Extraction point structures: animated, lit voxel rigs per extract kind + their collision boxes.
//
//   createExtractModel(kind, x) -> { root, update(dt, state, t, ctx), trigger(name), loop, timeLeft, kind, dispose() }
//   extractSolids(kind, x)      -> [[x0, z0, x1, z1, h, y0?], ...]  collision in the extract's local frame
//                                  (origin = extract point, front = +z), rasterised by World.extract()
//
// Frame: origin = the extract point on its floor (x.y), +z = the structure's front, 1 unit = 1 m. The view
// puts `root` at (x.x, x.y, x.z) with rotation.y = x.face. Collision never covers the 3.4 m zone floor.
//
// update(dt, state, t, ctx)
//   state  'idle' | 'called' | 'open' | 'gone' | 'offline'
//   t      seconds left on the state's timer (called: until arrival, open: until departure, gone: cooldown);
//          null/undefined -> the rig times the state itself (callTime from x.callTime, open 12 s, gone 75 s)
//   ctx    { L: Lighting (dynamic shader lights), fx: FX (dust / steam / sparks), play(name, opts) (positional
//            one-shot at the extract), shake(amount) (camera rumble, the view applies it when nearby),
//            near: false when far off-screen (skips lights + particles) } - every field optional
// trigger('use')  raider hatch: hand-wheel spins, lid swings open with a steam puff, closes again
// loop            { name, vol, pitch } | null: ambience the view keeps running nearby (airshaft fan)
//
// Kinds (shared look: worn steel, hazard paint, glow channels animated through per-rig material clones):
//   elevator  4.5 m cargo lift: concrete collar with a hazard band around the shaft, 4-post frame with
//             X-braced, waist-high sides (front open), crosshead + orange sheave wheel, 2 rotating beacons,
//             8-lamp countdown bar on the front header, call console (screen, ready lamp) at the front-right.
//             idle: dark shaft, green ready lamp. called: beacons spin orange and sweep the ground, the bar
//             fills, the yellow cage rises out of the shaft over the last 6 s. open: the gate sinks into the
//             collar, white cage light, green beacons, the bar drains to departure. gone: gate up, cage drops.
//             offline: dark, red X on the console screen, hazard tape across the front, red bar lamps.
//   hatch     1.4 m armoured round hatch in a concrete seat: riveted ring, olive lid with yellow stencil,
//             red hand-wheel, hinge, key-reader post with a red lock lamp. trigger('use'): lamp turns green,
//             wheel spins, lid swings up with steam, closes after ~4 s. offline: welded seam + red tape X.
//   metro     station platform (raised 0.375 m, tiles, tactile strip, edge lamps), 28 m of track along x at
//             z = trackZ (sleepers, rails, covered third rail), signals, benches, station roundel + departure
//             board, ticket-machine call console. called: tunnel headlight glow + rumble, the 12 m car slides
//             in over the last 6 s. open: platform-side doors slide open, lit windows. gone: doors shut, it
//             pulls away. offline: barriers + tape at the platform edge, red X.
//   airshaft  3.5 m concrete shaft head: back block with a roof fan (spinning rotor under a grille) and
//             louvres, shaft walls around a front doorway, A-frame winch gantry (sheave, drum, motor) with a
//             beacon, 5-lamp countdown lintel, wall-mounted console. called: fan spins down, the service
//             cage rises. open: cage gate slides into the walls, interior light. gone: cage descends, fan spins up.
// Every kind draws its zone ring (3.4 m; hatch 1.35 m) as a pixel decal in the state colour: idle soft
// green, called amber (sweeps round with the countdown), open bright green (chasing dashes + dithered fill),
// gone fading orange, offline red.
//
// Map options (w.extract(id, name, x, z, opts)):
//   face (rad)       which way the front points (0 = +z / toward the camera). Metro reads best with
//                    face = Math.PI (track behind the platform, car doors facing the camera).
//   callTime (s)     countdown length (sim + console bar)
//   metro: trackZ (3)  distance from the point to the track centreline; trackLen (28) drawn track length;
//          platform (true) raised 0.375 m platform slab (+ collision); platformLen (14); platformDepth (2.75)
//          how far the slab reaches behind the point; trainDir (1) +1 = arrives from -x, leaves toward +x.
//   structure: false  (world.js) no collision boxes.
// Triangle budget (visible): elevator ~11k, hatch ~3k, metro ~16k incl. the car, airshaft ~12k
// (tools/extractgallery.html prints exact counts).
import * as THREE from '../../vendor/three.module.js';
import { Vox } from './voxel.js';
import { litVox, GU } from './materials.js';

// ----------------------------------------------------------------------------- helpers
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const sat = (v) => clamp(v, 0, 1);
const ease = (u) => u * u * (3 - 2 * u);
const TAU = Math.PI * 2;
function hash3(i, j, k, s = 0) {
  let h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(k | 0, 1440662683) + Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf); zf = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t, c = (a, b, d) => hash3(xi + a, yi + b, zi + d, s);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), xf), L(c(0, 1, 0), c(1, 1, 0), xf), yf), L(L(c(0, 0, 1), c(1, 0, 1), xf), L(c(0, 1, 1), c(1, 1, 1), xf), yf), zf);
}

// ----------------------------------------------------------------------------- palette
const C = {
  k0: 0x07080a, k1: 0x101215, k2: 0x181b1f, k3: 0x23272c,
  s0: 0x2b2f35, s1: 0x393e45, s2: 0x4a5058, s3: 0x5e656d, s4: 0x7a8189, s5: 0x9aa0a5, s6: 0xbcc0c1,
  c0: 0x4c4a45, c1: 0x64615a, c2: 0x7b776e, c3: 0x939086, c4: 0xaba69b,
  y0: 0xdfa222, y1: 0xb47c1a, y2: 0x86601c, bk: 0x18181b,
  o0: 0xcf6a22, o1: 0xa4521c, o2: 0x7a3e18,
  rd: 0xa32c1e, w0: 0xdcd5c2, w1: 0xb3ad9b,
  t0: 0x2f6866, t1: 0x234f4d, t2: 0x41837f,
  m0: 0xcfc4a6, m1: 0xb5aa8c, m2: 0x9a907a,       // faded cream (metro car)
  p0: 0xa25a3e, p1: 0x8a4a33, p2: 0xb86c4c,       // faded red-orange (metro car)
  g0: 0x46503f, g1: 0x37402f, g2: 0x5a6650,       // olive (hatch lid)
  weld: 0x8f8170, weld2: 0xb7a88f, glass: 0x1c2a33, glass2: 0x3c5664,
};
// glow channels: voxels in these colours go to per-rig meshes whose material colour animates
const G = {
  BEA: 0xfefefe, BEA2: 0x8f8f8f, SCR: 0xfdfdfd, SCR2: 0x6d6d6d, LITE: 0xfcfcfc, RDY: 0xfbfbfb, XL: 0xfafafa,
  SEG: 0xf9f9f9, HA: 0xf8f8f8, HB: 0xf7f7f7, WIN: 0xf6f6f6, WIN2: 0xa0a0a0, LOCK: 0xf5f5f5, EDGE: 0xf4f4f4, SIG: 0xf3f3f3,
};
const CHANNELS = {
  beacon: [G.BEA, G.BEA2], screen: [G.SCR, G.SCR2], lite: [G.LITE], ready: [G.RDY], xlamp: [G.XL], seg: [G.SEG],
  headA: [G.HA], headB: [G.HB], win: [G.WIN, G.WIN2], lock: [G.LOCK], edge: [G.EDGE], sig: [G.SIG],
};
const CH_OF = new Map();
for (const [k, cs] of Object.entries(CHANNELS)) for (const c of cs) CH_OF.set(c, k);
const SG = { red: 0xff3c22, amber: 0xffb43c, dest: 0xffc25a };   // static glows (shared base material)
const COL = { amber: 0xffa21c, orange: 0xff5a12, green: 0x3cff6e, white: 0xfff1dc, red: 0xff2a18, warm: 0xffcf96 };

// ----------------------------------------------------------------------------- voxel builder (metres)
// Shapes take metre coordinates; a voxel is filled when its centre lies inside. Colours: int, -1 (carve) or
// fn(X,Y,Z,i,j,k,cur) -> colour | undefined (leave). geo() greedy-merges coplanar faces of equal colour + AO.
const FACES = [   // same corner order as voxel.js (winding + AO match)
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];
const tmpC = new THREE.Color();
class XB extends Vox {
  constructor(s, x0, y0, z0, x1, y1, z1) {
    super(Math.max(1, Math.round((x1 - x0) / s)), Math.max(1, Math.round((y1 - y0) / s)), Math.max(1, Math.round((z1 - z0) / s)), s, [-x0 / s, -y0 / s, -z0 / s]);
    for (const c of CH_OF.keys()) this.emissive.add(c);
    for (const c of Object.values(SG)) this.emissive.add(c);
  }
  fillIf(x0, y0, z0, x1, y1, z1, test, c) {
    const s = this.s, [ox, oy, oz] = this.o;
    const lo = (a, o) => Math.floor(a / s + o - 0.5), hi = (b, o) => Math.ceil(b / s + o - 0.5);
    const i0 = Math.max(0, lo(Math.min(x0, x1), ox)), i1 = Math.min(this.sx - 1, hi(Math.max(x0, x1), ox));
    const j0 = Math.max(0, lo(Math.min(y0, y1), oy)), j1 = Math.min(this.sy - 1, hi(Math.max(y0, y1), oy));
    const k0 = Math.max(0, lo(Math.min(z0, z1), oz)), k1 = Math.min(this.sz - 1, hi(Math.max(z0, z1), oz));
    const fn = typeof c === 'function';
    for (let j = j0; j <= j1; j++) {
      const Y = (j + 0.5 - oy) * s;
      for (let k = k0; k <= k1; k++) {
        const Z = (k + 0.5 - oz) * s;
        for (let i = i0; i <= i1; i++) {
          const X = (i + 0.5 - ox) * s;
          if (!test(X, Y, Z)) continue;
          const idx = this.i(i, j, k), v = fn ? c(X, Y, Z, i, j, k, this.d[idx]) : c;
          if (v !== undefined && v !== null) this.d[idx] = v;
        }
      }
    }
    return this;
  }
  box(x0, y0, z0, x1, y1, z1, c) { return this.fillIf(x0, y0, z0, x1, y1, z1, (X, Y, Z) => X >= x0 && X < x1 && Y >= y0 && Y < y1 && Z >= z0 && Z < z1, c); }
  cylY(cx, cz, y0, y1, r, c, rIn = 0) { return this.fillIf(cx - r, y0, cz - r, cx + r, y1, cz + r, (X, Y, Z) => { if (Y < y0 || Y >= y1) return false; const d = Math.hypot(X - cx, Z - cz); return d <= r && d >= rIn; }, c); }
  cylX(cy, cz, x0, x1, r, c, rIn = 0) { return this.fillIf(x0, cy - r, cz - r, x1, cy + r, cz + r, (X, Y, Z) => { if (X < x0 || X >= x1) return false; const d = Math.hypot(Y - cy, Z - cz); return d <= r && d >= rIn; }, c); }
  cylZ(cx, cy, z0, z1, r, c, rIn = 0) { return this.fillIf(cx - r, cy - r, z0, cx + r, cy + r, z1, (X, Y, Z) => { if (Z < z0 || Z >= z1) return false; const d = Math.hypot(X - cx, Y - cy); return d <= r && d >= rIn; }, c); }
  seg(ax, ay, az, bx, by, bz, r, c) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, l2 = dx * dx + dy * dy + dz * dz || 1e-9;
    return this.fillIf(Math.min(ax, bx) - r, Math.min(ay, by) - r, Math.min(az, bz) - r, Math.max(ax, bx) + r, Math.max(ay, by) + r, Math.max(az, bz) + r, (X, Y, Z) => {
      const t = clamp(((X - ax) * dx + (Y - ay) * dy + (Z - az) * dz) / l2, 0, 1);
      return Math.hypot(X - ax - dx * t, Y - ay - dy * t, Z - az - dz * t) <= r;
    }, c);
  }
  paintBox(x0, y0, z0, x1, y1, z1, fn) {
    return this.fillIf(x0, y0, z0, x1, y1, z1, (X, Y, Z) => X >= x0 && X < x1 && Y >= y0 && Y < y1 && Z >= z0 && Z < z1,
      (X, Y, Z, i, j, k, cur) => (cur === -1 ? undefined : typeof fn === 'function' ? fn(X, Y, Z, i, j, k, cur) : fn));
  }
  // pixel glyph rows ('X' = set) on a face plane z0..z1, top-left voxel at (x0, yTop)
  glyph(rows, x0, yTop, z0, z1, c) {
    const s = this.s;
    rows.forEach((row, r) => { for (let q = 0; q < row.length; q++) if (row[q] === 'X') this.box(x0 + q * s, yTop - (r + 1) * s, z0, x0 + (q + 1) * s, yTop - r * s, z1, c); });
    return this;
  }
  // faces of voxels whose colour passes `pick`, culled + AO'd against ALL voxels, greedy-merged
  geo(pick) {
    const pos = [], nor = [], col = [], emi = [], idx = [];
    const s = this.s, [ox, oy, oz] = this.o, D = [this.sx, this.sy, this.sz], d = this.d, SX = this.sx, SY = this.sy, SZ = this.sz;
    const at = (x, y, z) => (x < 0 || y < 0 || z < 0 || x >= SX || y >= SY || z >= SZ) ? -1 : d[(y * SZ + z) * SX + x];
    const so = (x, y, z) => (at(x, y, z) !== -1 ? 1 : 0);
    const occ = [0, 0, 0, 0], P = [0, 0, 0], d1 = [0, 0, 0], d2 = [0, 0, 0], E = [1, 1, 1];
    const quad = (f, x, y, z, ex, ey, ez, c, a) => {
      tmpC.setHex(c);
      const g = this.emissive.has(c) ? 1 : 0, b = pos.length / 3;
      for (let q = 0; q < 4; q++) {
        const cc = f.c[q], ao = g ? 1 : 1 - a[q] * 0.14;
        pos.push((x + cc[0] * ex - ox) * s, (y + cc[1] * ey - oy) * s, (z + cc[2] * ez - oz) * s);
        nor.push(f.n[0], f.n[1], f.n[2]); col.push(tmpC.r * ao, tmpC.g * ao, tmpC.b * ao); emi.push(g);
      }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    for (let fi = 0; fi < 6; fi++) {
      const f = FACES[fi], n = f.n, ax = n[0] ? 0 : n[1] ? 1 : 2, ua = ax === 0 ? 1 : 0, va = ax === 2 ? 1 : 2;
      const du = D[ua], dv = D[va], mask = new Float64Array(du * dv), fl = new Uint8Array(du * dv);
      for (let l = 0; l < D[ax]; l++) {
        mask.fill(-1); let any = false;
        for (let v = 0; v < dv; v++) for (let u = 0; u < du; u++) {
          P[ax] = l; P[ua] = u; P[va] = v;
          const x = P[0], y = P[1], z = P[2], c = at(x, y, z);
          if (c === -1 || !pick(c)) continue;
          const px = x + n[0], py = y + n[1], pz = z + n[2];
          if (so(px, py, pz)) continue;
          if (this.emissive.has(c)) occ[0] = occ[1] = occ[2] = occ[3] = 0;
          else for (let q = 0; q < 4; q++) {
            const cc = f.c[q];
            d1[0] = d1[1] = d1[2] = d2[0] = d2[1] = d2[2] = 0;
            d1[ua] = cc[ua] ? 1 : -1; d2[va] = cc[va] ? 1 : -1;
            const s1 = so(px + d1[0], py + d1[1], pz + d1[2]), s2 = so(px + d2[0], py + d2[1], pz + d2[2]);
            const s3 = so(px + d1[0] + d2[0], py + d1[1] + d2[1], pz + d1[2] + d2[2]);
            occ[q] = s1 && s2 ? 3 : s1 + s2 + s3;
          }
          // AO that only varies across a direction still merges exactly along it (strips beside edges)
          let uInv = 1, vInv = 2;
          for (let q = 0; q < 4; q++) for (let r = q + 1; r < 4; r++) {
            if (occ[q] === occ[r]) continue;
            const cq = f.c[q], cr = f.c[r];
            if (cq[va] === cr[va]) uInv = 0;
            if (cq[ua] === cr[ua]) vInv = 0;
          }
          mask[u + v * du] = c * 256 + (occ[0] | (occ[1] << 2) | (occ[2] << 4) | (occ[3] << 6));
          fl[u + v * du] = uInv | vInv; any = true;
        }
        if (!any) continue;
        for (let v = 0; v < dv; v++) for (let u = 0; u < du;) {
          const k = mask[u + v * du]; if (k < 0) { u++; continue; }
          const fg = fl[u + v * du];
          let w = 1; if (fg & 1) while (u + w < du && mask[u + w + v * du] === k) w++;
          let h = 1;
          if (fg & 2) grow: for (; v + h < dv; h++) for (let q = 0; q < w; q++) if (mask[u + q + (v + h) * du] !== k) break grow;
          for (let hh = 0; hh < h; hh++) mask.fill(-1, u + (v + hh) * du, u + w + (v + hh) * du);
          P[ax] = l; P[ua] = u; P[va] = v; E[0] = E[1] = E[2] = 1; E[ua] = w; E[va] = h;
          const c = Math.floor(k / 256), pk = k - c * 256;
          occ[0] = pk & 3; occ[1] = (pk >> 2) & 3; occ[2] = (pk >> 4) & 3; occ[3] = (pk >> 6) & 3;
          quad(f, P[0], P[1], P[2], E[0], E[1], E[2], c, occ);
          u += w;
        }
      }
    }
    if (!idx.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('glow', new THREE.Float32BufferAttribute(emi, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
  // { base, <channel>... } geometries (only channels that have voxels)
  geos() {
    const have = new Set();
    for (const c of this.d) if (c !== -1 && CH_OF.has(c)) have.add(CH_OF.get(c));
    const out = { base: this.geo((c) => !CH_OF.has(c)) };
    for (const ch of have) out[ch] = this.geo((c) => CH_OF.get(c) === ch);
    return out;
  }
}

// ----------------------------------------------------------------------------- geometry cache + materials
const GEO = new Map();
function gset(key, fn) { let g = GEO.get(key); if (!g) { g = fn().geos(); GEO.set(key, g); } return g; }
let _base = null;
const baseMat = () => _base || (_base = litVox({ xray: true, cutaway: true }));
function cloneMat() {
  const src = baseMat(), m = src.clone();
  m.onBeforeCompile = src.onBeforeCompile; m.customProgramCacheKey = src.customProgramCacheKey;
  m.defines = { ...(src.defines || {}) }; m.vertexColors = true;
  return m;
}

// zone ring: pixel-snapped dashed circle + 8 edge ticks + dithered fill, additive, cut away like the world
const RING_VS = /* glsl */`
  varying vec2 vL; varying vec3 vW;
  void main(){ vL = position.xz; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const RING_FS = /* glsl */`
  uniform vec3 uCol; uniform float uA; uniform float uR; uniform float uSeg; uniform float uPh; uniform float uFill;
  uniform float uDim; uniform float uInner; uniform float uClip; uniform float uTicks;
  uniform vec4 uCut; uniform vec4 uCutR; uniform float uCutH;
  varying vec2 vL; varying vec3 vW;
  float bay(vec2 p){ ivec2 i = ivec2(mod(p, 4.0)); int k = i.x + i.y * 4;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    for (int j = 0; j < 16; j++) { if (j == k) return m[j] / 16.0; } return 0.0; }
  void main(){
    vec2 cd = vW.xz - uCutR.xy;
    vec2 cl = uCutR.xy + vec2(cd.x * uCutR.z + cd.y * uCutR.w, -cd.x * uCutR.w + cd.y * uCutR.z);
    if (cl.x > uCut.x && cl.x < uCut.z && cl.y > uCut.y && cl.y < uCut.w && vW.y > uCutH) discard;
    vec2 q = (floor(vL * 16.0) + 0.5) / 16.0;
    if (q.y > uClip) discard;
    float d = length(q);
    if (d > uR + 0.1) discard;
    float a = fract(atan(q.x, q.y) / 6.2831853);
    float edge = step(abs(d - (uR - 0.06)), 0.07);
    float dash = step(fract(a * uSeg - uPh), 0.6);
    float lit = a < uFill ? 1.0 : uDim;
    float arc = abs(fract(a * uTicks + 0.5) - 0.5) * 6.2831853 / uTicks * d;
    float tick = step(arc, 0.07) * step(uR - 0.62, d) * step(d, uR - 0.24);
    float inner = uInner * step(d, uR - 0.14) * step(bay(gl_FragCoord.xy), 0.49);
    float v = (edge * dash + tick * 0.8) * lit + inner;
    v *= uA;
    if (v < 0.02) discard;
    gl_FragColor = vec4(uCol, v);
  }`;
function ringMesh(r, clip = 99) {
  const geo = new THREE.PlaneGeometry(2 * r + 0.6, 2 * r + 0.6); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uCol: { value: new THREE.Color(1, 1, 1) }, uA: { value: 0 }, uR: { value: r }, uSeg: { value: Math.round(r * 8) }, uPh: { value: 0 },
      uFill: { value: 1 }, uDim: { value: 1 }, uInner: { value: 0 }, uClip: { value: clip }, uTicks: { value: 8 },
      uCut: GU.uCut, uCutR: GU.uCutR, uCutH: GU.uCutH,
    },
    vertexShader: RING_VS, fragmentShader: RING_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 7; m.name = 'zone';
  return m;
}

// ----------------------------------------------------------------------------- shared small parts
function beaconVox() {
  const v = new XB(0.0625, -0.25, 0, -0.25, 0.25, 0.5, 0.25);
  v.cylY(0, 0, 0, 0.125, 0.22, C.k2);
  v.cylY(0, 0, 0.125, 0.375, 0.17, (X, Y, Z, i, j) => ((j & 1) ? G.BEA2 : G.BEA));
  v.cylY(0, 0, 0.375, 0.4375, 0.125, C.k2);
  return v;
}
// rope / cable: 1 m tall, scaled in y by the rig
function ropeVox() { const v = new XB(0.0625, -0.03125, 0, -0.03125, 0.03125, 1, 0.03125); v.box(-1, 0, -1, 1, 1, 1, C.k3); return v; }
// countdown lamp: w x h, one voxel deep, centred
function segVox(w, h, s) { const v = new XB(s, -w / 2, -h / 2, -s / 2, w / 2, h / 2, s / 2); v.box(-w, -h, -s, w, h, s, G.SEG); return v; }
// sheave wheel in the x-y plane (axle along z), centred: grooved rim, painted ring, 6 spokes, hub
function sheaveVox(r) {
  const v = new XB(0.0625, -r, -r, -0.125, r, r, 0.125);
  v.cylZ(0, 0, -0.125, 0.125, r, (X, Y, Z) => {
    const d = Math.hypot(X, Y);
    if (d > r - 0.07) return Math.abs(Z) < 0.07 ? C.k2 : C.s3;
    if (d > r - 0.16) return C.o0;
    if (d < 0.11) return C.s4;
    const a = Math.atan2(Y, X), sa = Math.round(a / (Math.PI / 3)) * (Math.PI / 3);
    return d * Math.abs(Math.sin(a - sa)) < 0.045 ? C.o1 : -1;
  });
  return v;
}
// red X glyph (offline) over a w x h voxel screen whose lower-left front corner is (x0, y0, z0)
function xGlyphVox(x0, y0, z0, w, h, s) {
  const v = new XB(s, x0, y0, z0, x0 + w * s, y0 + h * s, z0 + s);
  v.box(x0, y0, z0, x0 + w * s, y0 + h * s, z0 + s, (X, Y, Z, i, j) => (Math.abs(i * (h - 1) / (w - 1) - j) < 0.6 || Math.abs((w - 1 - i) * (h - 1) / (w - 1) - j) < 0.6 ? G.XL : undefined));
  return v;
}
const hazD = (a, b) => ((a + b) >> 1) & 1 ? C.bk : C.y0;     // diagonal hazard stripes (2-voxel bands)

// ============================================================================= ELEVATOR
const EL = { DROP: 3.4, RISE: 6, SEGS: 8 };
function elFrameVox() {
  const v = new XB(0.125, -2.375, 0, -2.375, 2.375, 4.25, 2.375);
  // collar: concrete curb + tread-plate top with a hazard band around the shaft
  v.box(-2.25, 0, -2.25, 2.25, 0.25, 2.25, (X, Y, Z, i, j, k) => {
    const m = Math.max(Math.abs(X), Math.abs(Z));
    if (m < 1.75) return undefined;
    if (Y < 0.125) return C.c1;
    if (m < 2.0) return hazD(i, k);
    return (i * 3 + k * 5) % 7 === 0 ? C.s4 : C.s2;
  });
  // shaft top while the cage is down: a dark well - lit far wall, guide rails and side walls painted in
  v.box(-1.75, 0, -1.75, 1.75, 0.125, 1.75, (X, Y, Z) => {
    const rail = Math.abs(Math.abs(X) - 0.875) < 0.07;
    if (Z < -1.5) return rail ? C.s2 : C.k3;
    if (Z < -1.25) return rail ? C.s0 : C.k2;
    if (Math.abs(X) > 1.5) return Math.abs(Z) < 0.07 ? C.s0 : C.k2;
    return Z < -0.5 ? C.k1 : C.k0;
  });
  // corner columns: hazard-painted feet, I-beam grooves
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const cx = sx * 1.9375, cz = sz * 1.9375;
    v.box(cx - 0.1875, 0.25, cz - 0.1875, cx + 0.1875, 3.5, cz + 0.1875, (X, Y, Z, i, j, k) => {
      if (Y < 1.0) return ((i + j + k) >> 1) & 1 ? C.bk : C.y0;
      return Math.abs(X - cx) < 0.07 || Math.abs(Z - cz) < 0.07 ? C.s0 : C.s2;
    });
  }
  // headers: front carries the countdown lamps (dark bezel) under a hazard-striped top edge
  v.box(-2.125, 3.0, 1.75, 2.125, 3.625, 2.125, (X, Y, Z, i, j, k) => (Y > 3.5 ? hazD(i, k) : C.s1));
  v.paintBox(-2.0, 3.125, 2.0, 2.0, 3.375, 2.125, C.k1);
  v.box(-2.125, 3.25, -2.125, 2.125, 3.625, -1.75, C.s1);
  for (const sx of [-1, 1]) v.box(sx > 0 ? 1.75 : -2.125, 3.25, -1.75, sx > 0 ? 2.125 : -1.75, 3.625, 1.75, C.s1);
  // crosshead + sheave bearing blocks
  v.box(-1.75, 3.375, -0.25, 1.75, 3.625, 0.25, (X, Y, Z, i) => (Y > 3.5 && (i & 3) === 0 ? C.s3 : C.s1));
  for (const z0 of [-0.25, 0.125]) v.box(-0.125, 3.625, z0, 0.125, 4.25, z0 + 0.125, C.s3);
  // waist-high kick panels (sides + back, the front stays open) with X-bracing up to the headers
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? 1.875 : -2.0;
    v.box(x0, 0.25, -1.75, x0 + 0.125, 1.125, 1.75, (X, Y, Z, i, j, k) => (Y > 1.0 ? hazD(j, k) : (k & 3) === 0 ? C.s2 : C.s1));
    v.seg(sx * 1.9375, 1.125, -1.75, sx * 1.9375, 3.25, 1.75, 0.09, C.s2);
    v.seg(sx * 1.9375, 1.125, 1.75, sx * 1.9375, 3.25, -1.75, 0.09, C.s2);
  }
  v.box(-1.75, 0.25, -2.0, 1.75, 1.125, -1.875, (X, Y, Z, i, j) => (Y > 1.0 ? hazD(i, j) : (i & 3) === 0 ? C.s2 : C.s1));
  v.seg(-1.75, 1.125, -1.9375, 1.75, 3.25, -1.9375, 0.09, C.s2);
  v.seg(1.75, 1.125, -1.9375, -1.75, 3.25, -1.9375, 0.09, C.s2);
  // static red marker lamps on the rear post tops
  for (const sx of [-1, 1]) v.box(sx * 1.9375 - 0.0625, 3.625, -2.0, sx * 1.9375 + 0.0625, 3.75, -1.875, SG.red);
  return v;
}
function elConsoleVox() {
  const v = new XB(0.0625, 2.25, 0, 2.375, 3.0, 1.625, 2.9375);
  v.box(2.4375, 0, 2.4375, 2.8125, 0.0625, 2.8125, C.s1);                                   // foot plate
  v.box(2.5625, 0.0625, 2.5625, 2.6875, 0.8125, 2.6875, C.s2);                              // post
  v.box(2.375, 0.8125, 2.4375, 2.875, 1.375, 2.75, (X, Y, Z, i, j) => ((X < 2.4375 || X >= 2.8125) && (j >> 1) & 1 ? C.y1 : C.s1));
  v.box(2.3125, 1.375, 2.375, 2.9375, 1.4375, 2.8125, C.y1);                                // rain hood
  v.box(2.4375, 0.9375, 2.75, 2.8125, 1.3125, 2.8125, (X, Y, Z, i, j) => {                   // screen in a bezel
    if (X < 2.5 || X >= 2.75 || Y < 1.0 || Y >= 1.25) return C.k1;
    return j & 1 ? G.SCR : G.SCR2;
  });
  v.box(2.5, 0.8125, 2.75, 2.5625, 0.875, 2.8125, C.rd);                                    // call button
  v.box(2.6875, 1.4375, 2.5, 2.8125, 1.5625, 2.625, G.RDY);                                 // ready lamp
  return v;
}
function elCageVox() {
  const v = new XB(0.125, -1.625, -0.25, -1.625, 1.625, 2.875, 1.625);
  const wear = (i, j, k) => (hash3(i, j, k, 3) < 0.12 ? C.y1 : C.y0);
  // deck: hazard edging + steel grate, frame + under-beams
  v.box(-1.625, 0.125, -1.625, 1.625, 0.25, 1.625, (X, Y, Z, i, j, k) => {
    if (Math.max(Math.abs(X), Math.abs(Z)) > 1.375) return hazD(i, k);
    return i % 3 === 0 || k % 3 === 0 ? C.s3 : C.k2;
  });
  v.box(-1.625, 0, -1.625, 1.625, 0.125, 1.625, (X, Y, Z) => (Math.max(Math.abs(X), Math.abs(Z)) > 1.5 ? C.s0 : undefined));
  v.box(-1.5, -0.25, -0.125, 1.5, 0, 0.125, C.s0); v.box(-0.125, -0.25, -1.5, 0.125, 0, 1.5, C.s0);
  // yellow cage: corner posts, side + back railings (toe board, mid + top rail, bar infill)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x0 = sx > 0 ? 1.375 : -1.625, z0 = sz > 0 ? 1.375 : -1.625;
    v.box(x0, 0.25, z0, x0 + 0.25, 2.5, z0 + 0.25, (X, Y, Z, i, j, k) => wear(i, j, k));
  }
  const rail = (Y, i, j, k, along) => {
    if (Y < 0.375) return hazD(along, j);
    if ((Y > 0.625 && Y < 0.75) || (Y > 1.125 && Y < 1.25)) return wear(i, j, k);
    if (Y < 1.125 && (along & 1) === 0) return C.s2;
    return undefined;
  };
  for (const sx of [-1, 1]) { const x0 = sx > 0 ? 1.5 : -1.625; v.box(x0, 0.25, -1.375, x0 + 0.125, 1.25, 1.375, (X, Y, Z, i, j, k) => rail(Y, i, j, k, k)); }
  v.box(-1.375, 0.25, -1.625, 1.375, 1.25, -1.5, (X, Y, Z, i, j, k) => rail(Y, i, j, k, i));
  // top frame, crosshead with rope shackles, light fixture
  v.box(-1.625, 2.375, -1.625, 1.625, 2.5, 1.625, (X, Y, Z, i, j, k) => (Math.max(Math.abs(X), Math.abs(Z)) > 1.5 ? wear(i, j, k) : undefined));
  v.box(-1.5, 2.5, -0.125, 1.5, 2.75, 0.125, C.s1);
  for (const x of [-0.625, 0.375]) v.box(x, 2.75, -0.125, x + 0.25, 2.875, 0.125, C.s3);
  v.box(-0.5, 2.375, -0.125, 0.5, 2.5, 0.125, G.LITE);
  return v;
}
function elGateVox() {
  const v = new XB(0.125, -1.75, 0.25, 1.875, 1.75, 1.75, 2.0);
  v.box(-1.75, 0.25, 1.875, 1.75, 1.75, 2.0, (X, Y, Z, i, j) => {
    if (Y < 0.5) return hazD(i, j);
    if (Y > 1.625 || (Y > 1.0 && Y < 1.125) || Math.abs(X) > 1.625) return C.s3;
    return (i & 1) === 0 ? C.s2 : undefined;
  });
  return v;
}
function tapeVox(x0, x1, y0, y1, z, zs) {    // two crossing hazard tapes in the plane z
  const v = new XB(0.0625, x0 - 0.125, y0 - 0.125, z - 0.0625, x1 + 0.125, y1 + 0.125, z + 0.0625);
  const c = (X, Y, Z, i) => ((i >> 2) & 1 ? C.bk : C.y0);
  v.seg(x0, y1, z + zs, x1, y0, z + zs, 0.07, c);
  v.seg(x0, y0, z + zs, x1, y1, z + zs, 0.07, c);
  return v;
}

function buildElevator(R) {
  const S = {
    frame: gset('el_frame', elFrameVox), cons: gset('el_console', elConsoleVox), xg: gset('el_x', () => xGlyphVox(2.4375, 0.9375, 2.8125, 6, 6, 0.0625)),
    beacon: gset('beacon', beaconVox), sheave: gset('el_sheave', () => sheaveVox(0.5)), seg: gset('seg_el', () => segVox(0.25, 0.25, 0.125)),
    cage: gset('el_cage', elCageVox), gate: gset('el_gate', elGateVox), rope: gset('rope', ropeVox),
    tape: gset('el_tape', () => tapeVox(-1.75, 1.75, 0.5, 1.5, 2.125, 0.03125)),
  };
  R.part(S.frame); R.part(S.cons);
  R.xg = R.part(S.xg);
  R.beacons = [-1, 1].map((sx, b) => R.part(S.beacon, R.root, sx * 1.9375, 3.625, 1.9375, { beacon: b ? 'beacon2' : 'beacon' }));
  R.sheave = R.part(S.sheave, R.root, 0, 4.125, 0);
  R.segM = [];
  for (let i = 0; i < EL.SEGS; i++) R.segM.push(R.part(S.seg, R.root, -1.75 + i * 0.5, 3.25, 2.1875).children[0]);
  R.cage = R.part(S.cage); R.gate = R.part(S.gate);
  R.ropes = [-0.5, 0.5].map((x) => R.part(S.rope, R.root, x, 0, 0));
  R.tape = R.part(S.tape);
  R.addRing(3.4);
  R.anim = animElevator;
}
function animElevator(R, dt, st, t, el, ctx) {
  const T = R.time, fx = ctx.near !== false ? ctx.fx : null;
  // cage + gate timeline (the cage rises over the last RISE s of the call, drops after the gate closes)
  let cy = -EL.DROP, gate = 0;
  if (st === 'called' && t < EL.RISE) { const u = t / EL.RISE; cy = -EL.DROP * u * u; }
  else if (st === 'open') { cy = 0; gate = ease(sat((el - 0.35) / 1.1)); }
  else if (st === 'gone') { gate = 1 - ease(sat(el / 1.1)); const u = sat((el - 1.4) / 4.6); cy = -EL.DROP * u * u; }
  cy = R.follow('cy', cy, dt); gate = R.follow('gate', gate, dt);
  R.cage.position.y = cy; R.cage.visible = cy > -2.7;
  R.gate.position.y = -1.5 * gate; R.gate.visible = gate < 0.99;
  R.sheave.rotation.z = cy / 0.5;
  for (const r of R.ropes) { const b = cy + 2.8; r.position.y = b; r.scale.y = Math.max(0.01, 4.125 - b); }
  const off = st === 'offline';
  R.tape.visible = R.xg.visible = off;
  // beacons: rotating reflectors flash toward the camera; spots sweep the ground while called
  const spin = st === 'called' ? 7.5 : st === 'open' ? 2.2 : 0;
  R.spin = (R.spin || 0) + dt * spin;
  const yaw = R.root.rotation.y;
  for (let b = 0; b < 2; b++) {
    const a = R.spin + b * Math.PI, flash = Math.pow(Math.max(0, Math.cos(a + yaw)), 4), ch = b ? 'beacon2' : 'beacon', bx = (b ? 1 : -1) * 1.9375;
    if (st === 'called') { R.col(ch, COL.orange, 0.45 + 1.3 * flash); R.spot(ctx, bx, 3.95, 1.9375, a, 0.5, 0xff6a1c, 2.4, 15, 1.4); }
    else if (st === 'open') R.col(ch, COL.green, 0.85 + 0.35 * flash);
    else if (st === 'gone') R.col(ch, COL.amber, 0.25 + 0.3 * Math.pow(Math.sin(T * 2.4), 2));
    else R.col(ch, COL.amber, off ? 0.05 : 0.1);
  }
  // console, cage light, countdown bar
  const blink = (hz) => (T * hz) % 1 < 0.5;
  if (st === 'idle') { R.col('screen', COL.green, 0.5 + 0.08 * Math.sin(T * 2)); R.col('ready', COL.green, 0.75 + 0.35 * Math.sin(T * 3)); }
  else if (st === 'called') { R.col('screen', COL.amber, blink(2.5) ? 1.15 : 0.6); R.col('ready', COL.amber, 1); }
  else if (st === 'open') { R.col('screen', COL.green, 1.25); R.col('ready', COL.green, 1.2); }
  else if (st === 'gone') { R.col('screen', COL.amber, 0.3); R.col('ready', COL.amber, 0.15); }
  else { R.col('screen', COL.red, 0.75); R.col('ready', COL.red, 0.9); R.col('xlamp', COL.red, blink(1.2) ? 1.4 : 0.9); }
  const lite = st === 'open' ? 1.4 : st === 'called' && t < 1.5 ? (1.5 - t) / 1.5 * (Math.random() < 0.15 ? 0.3 : 1.4) : st === 'gone' && el < 1.5 ? 1.4 : 0.1;
  R.col('lite', COL.white, lite);
  R.segBar(R.segM, st, t, T, R.callDur, 12);
  // lights
  if (st === 'idle') R.light(ctx, 2.6, 1.5, 2.6, COL.green, 0.45, 2.8, 1.0);
  else if (st === 'called') R.light(ctx, 2.6, 1.5, 2.7, COL.amber, 0.55, 3.2, 1.1);
  else if (st === 'open') { R.light(ctx, 0, 2.3, 0, COL.white, 1.9, 7.5, 1.5); R.light(ctx, 0, 3.4, 2.2, COL.green, 1.1, 7, 1.3); }
  else if (st === 'gone') R.light(ctx, 0, 3.4, 2.2, COL.amber, 0.25 + 0.3 * Math.pow(Math.sin(T * 2.4), 2), 5, 1.0);
  else R.light(ctx, 2.6, 1.3, 2.9, COL.red, 0.65, 3.4, 1.0);
  if (lite > 0.5 && st !== 'open') R.light(ctx, 0, cy + 2.3, 0, COL.white, lite, 6, 1.4);
  // sparks off the guide rails while the cage runs, dust when it lands
  if (fx && ((st === 'called' && t < EL.RISE && t > 0.3) || (st === 'gone' && el > 1.4 && el < 5))) {
    if (Math.random() < dt * 6) { const sx = Math.random() < 0.5 ? -1 : 1, p = R.w(sx * 1.7, 0.25, -1.7 + Math.random() * 3.4); fx.sparks(p.x, p.y, p.z, 3, 0xffc070, 2.5); }
  }
  if (st === 'called' && t < EL.RISE + 0.3) R.cue(ctx, 'rise', 'elevator_rise');
  if (st === 'gone' && el > 1.3) R.cue(ctx, 'drop', 'elevator_depart');
  if (st === 'open' && R.prev === 'called' && el < 0.1 && R.once('land') && fx) R.dust(fx, 2.2, 26);
  R.ringState(st, t, el, dt);
}

// ============================================================================= RAIDER HATCH
function hatchBaseVox() {
  const v = new XB(0.0625, -1.0, 0, -1.0, 1.0, 1.0625, 1.0);
  v.box(-0.9375, 0, -0.9375, 0.9375, 0.0625, 0.9375, (X, Y, Z, i, j, k) => {      // concrete seat, chamfered
    if (Math.abs(X) + Math.abs(Z) > 1.55 || Math.hypot(X, Z) < 0.625) return undefined;
    return hash3(i, 0, k, 9) < 0.1 ? C.c0 : Math.max(Math.abs(X), Math.abs(Z)) > 0.875 ? C.c2 : C.c1;
  });
  v.cylY(0, 0, 0, 0.0625, 0.625, (X, Y, Z, i, j, k) => {                          // the well (seen with the lid up)
    if (Math.abs(Math.abs(X) - 0.25) < 0.04 && Z > -0.5) return C.k3;
    if (Math.abs(X) < 0.25 && Z > -0.5 && k % 3 === 0) return C.k2;
    return Math.hypot(X, Z + 0.1) > 0.5 ? C.k1 : C.k0;
  });
  v.cylY(0, 0, 0.0625, 0.1875, 0.8125, (X, Y, Z) => {                             // riveted ring
    if (Y < 0.125) return C.s1;
    const d = Math.hypot(X, Z), a = Math.atan2(X, Z);
    if (d > 0.77) return C.s3;
    const fa = (((a / (TAU / 16)) % 1) + 1) % 1;
    if (Math.abs(d - 0.71) < 0.04 && (fa < 0.13 || fa > 0.87)) return C.s5;
    const qa = (((a / (TAU / 4) + 0.5) % 1) + 1) % 1;
    if (qa > 0.42 && qa < 0.58) return C.y0;
    return C.s2;
  }, 0.625);
  for (const x0 of [-0.375, 0.1875]) v.cylX(0.1875, -0.6875, x0, x0 + 0.1875, 0.07, C.s3);   // hinge knuckles
  v.box(0.75, 0.0625, 0.625, 0.875, 0.625, 0.75, C.s1);                           // key reader post
  v.box(0.6875, 0.625, 0.5625, 0.9375, 0.9375, 0.8125, (X, Y) => (Y > 0.875 ? C.y1 : C.s0));
  v.box(0.75, 0.6875, 0.8125, 0.875, 0.75, 0.875, C.k0);                         // card slot
  v.box(0.75, 0.8125, 0.8125, 0.875, 0.875, 0.875, G.LOCK);                     // lock lamp (front)
  v.box(0.75, 0.9375, 0.625, 0.875, 1.0, 0.75, G.LOCK);                          // lock lamp (top)
  return v;
}
function hatchLidVox() {          // hinge frame: pivot at the back edge, lid centre at z = 0.625
  const v = new XB(0.0625, -0.6875, -0.125, -0.125, 0.6875, 0.125, 1.3125);
  const cz = 0.625;
  v.cylY(0, cz, -0.125, 0, 0.6, (X, Y, Z, i, j, k) => {
    const dz = Z - cz, d = Math.hypot(X, dz), a = Math.atan2(X, dz), fa = (((a / (TAU / 12)) % 1) + 1) % 1;
    if (d > 0.53) return C.s2;
    if (Math.abs(d - 0.47) < 0.035 && (fa < 0.15 || fa > 0.85)) return C.s4;
    if (Math.abs(dz - 0.47 + Math.abs(X) * 0.85) < 0.045 && Math.abs(X) < 0.2) return C.y0;          // stencil chevron
    if (dz < -0.4 && dz > -0.47 && Math.abs(X) < 0.22 && (i & 1)) return C.y0;                      // stencil text
    return hash3(i, j, k, 4) < 0.1 ? C.g1 : C.g0;
  });
  v.cylY(0, cz, 0, 0.0625, 0.375, (X, Y, Z) => (Math.hypot(X, Z - cz) > 0.31 ? C.g2 : C.g1));
  v.box(-0.3125, -0.125, -0.125, 0.3125, -0.0625, 0.1875, C.s3);                  // hinge strap
  return v;
}
function hatchWheelVox() {
  const v = new XB(0.0625, -0.3125, 0, -0.3125, 0.3125, 0.125, 0.3125);
  v.cylY(0, 0, 0, 0.125, 0.1, C.s3);
  v.cylY(0, 0, 0.0625, 0.125, 0.3125, C.rd, 0.24);
  v.box(-0.25, 0.0625, -0.0625, 0.25, 0.125, 0.0625, C.s2); v.box(-0.0625, 0.0625, -0.25, 0.0625, 0.125, 0.25, C.s2);
  return v;
}
function hatchWeldVox() {
  const v = new XB(0.0625, -0.75, 0.1875, -0.75, 0.75, 0.25, 0.75);
  v.cylY(0, 0, 0.1875, 0.25, 0.69, (X, Y, Z, i, j, k) => (hash3(i, 0, k, 2) < 0.35 ? C.weld2 : C.weld), 0.56);
  return v;
}
function hatchTapeVox() {
  const v = new XB(0.0625, -0.75, 0.1875, -0.75, 0.75, 0.5, 0.75);
  const top = (X, Z) => { const d = Math.hypot(X, Z); return d < 0.3125 ? 0.375 : d < 0.375 ? 0.25 : 0.1875; };
  for (const sg of [-1, 1]) v.fillIf(-0.72, 0.1875, -0.72, 0.72, 0.5, 0.72, (X, Y, Z) => Math.abs(X - sg * Z) < 0.09 && Math.hypot(X, Z) < 0.74 && Y >= top(X, Z) && Y < top(X, Z) + 0.0625,
    (X, Y, Z, i) => ((i >> 2) & 1 ? C.w0 : C.rd));
  return v;
}
function buildHatch(R) {
  const S = { base: gset('h_base', hatchBaseVox), lid: gset('h_lid', hatchLidVox), wheel: gset('h_wheel', hatchWheelVox), weld: gset('h_weld', hatchWeldVox), tape: gset('h_tape', hatchTapeVox) };
  R.part(S.base);
  R.lid = R.g(R.root, 0, 0.1875, -0.625);
  R.part(S.lid, R.lid);
  R.wheel = R.part(S.wheel, R.lid, 0, 0.0625, 0.625);
  R.weld = R.part(S.weld); R.tape = R.part(S.tape);
  R.use = null;
  R.addRing(1.35);
  R.anim = animHatch;
}
function animHatch(R, dt, st, t, el, ctx) {
  const T = R.time, off = st === 'offline', fx = ctx.near !== false ? ctx.fx : null;
  R.weld.visible = R.tape.visible = off;
  let open = 0, green = 0;
  if (R.use != null && !off) {
    const u = (R.use += dt);
    if (u < 0.6) R.wheel.rotation.y += dt * 10;
    open = ease(sat((u - 0.45) / 0.6)) * (1 - ease(sat((u - 4.4) / 1.1)));
    green = u < 4.6 ? 1 : 0;
    if (fx) {
      const p = R.w(0, 0.3, 0);
      if (u > 0.45 && R.once('steam')) {
        for (let k = 0; k < 18; k++) { const a = Math.random() * TAU, s = 0.4 + Math.random() * 1.6; fx.parts.emit({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * s, vy: 1.6 + Math.random() * 2.2, vz: Math.sin(a) * s, life: 1.0 + Math.random() * 1.2, size: 6 + Math.random() * 5, size1: 18 + Math.random() * 10, color: 0xdfe4e4, color1: 0x9aa2a4, alpha: 0.6, shape: 1, drag: 1.6 }); }
        fx.sparks(p.x, p.y, p.z, 6, 0xffd090, 3);
      }
      if (u > 0.5 && u < 2.6 && Math.random() < dt * 14) fx.parts.emit({ x: p.x + (Math.random() - 0.5) * 0.6, y: p.y, z: p.z + (Math.random() - 0.5) * 0.6, vy: 1.2 + Math.random(), life: 1.4, size: 5, size1: 14, color: 0xd8dcdc, color1: 0x8a9294, alpha: 0.4, shape: 1, drag: 1 });
    }
    if (u > 5.6) { R.use = null; R.done.delete('steam'); }
  }
  R.lid.rotation.x = -1.95 * open;
  // lock lamp: red (locked), green while in use; offline steady red
  if (green) { R.col('lock', COL.green, 1.4); R.light(ctx, 0.8, 1.0, 0.8, COL.green, 1.1 * (1 - sat(((R.use || 0) - 3) / 1.6)) + 0.3, 4.5, 1.2); }
  else if (off) { R.col('lock', COL.red, 1.1); R.light(ctx, 0.8, 1.0, 0.9, COL.red, 0.5, 2.6, 0.9); }
  else { const k = 0.55 + 0.45 * Math.pow(Math.sin(T * 1.6), 8); R.col('lock', COL.red, k + 0.2); R.light(ctx, 0.8, 1.0, 0.9, COL.red, 0.3 * k, 2.0, 0.8); }
  if (open > 0.3) R.light(ctx, 0, 0.6, 0.1, 0xd0e0e8, 0.6 * open, 3, 1.0);
  R.ringState(st, t, el, dt);
}

// ============================================================================= METRO
function metroOpts(x) {
  const r4 = (v) => Math.round(v * 4) / 4, r8 = (v) => Math.round(v * 8) / 8;
  return {
    trackZ: r8(clamp(x?.trackZ ?? 3, 2.25, 5)), L: r4(clamp(x?.trackLen ?? 28, 14, 60)), PL: r4(clamp(x?.platformLen ?? 14, 4, 40)),
    PB: r8(clamp(x?.platformDepth ?? 2.75, 0.5, 8)), plat: x?.platform !== false, dir: (x?.trainDir ?? 1) < 0 ? -1 : 1,
  };
}
function metroStaticVox(o) {
  const { trackZ, L, PL, PB, plat } = o, E = trackZ - 1.375, PT = plat ? 0.375 : 0.125;
  const v = new XB(0.125, -L / 2, 0, -PB - 0.25, L / 2, PT + 1.0, trackZ + 2.0);
  // platform slab: tiles, tactile strip, edge lamps in the coping, darker face
  v.box(-PL / 2, 0, -PB, PL / 2, PT, E, (X, Y, Z, i, j, k) => {
    if (Y < PT - 0.125) return Z > E - 0.125 ? C.c0 : C.c1;
    if (Z >= E - 0.25) return Z < E - 0.125 && Math.abs((((X + 0.5) % 1) + 1) % 1 - 0.5) < 0.07 ? G.EDGE : C.w0;
    if (Z >= E - 0.375) return C.c2;
    if (Z >= E - 0.625) return (i + k) & 1 ? C.y1 : C.y0;
    return i % 4 === 0 || k % 4 === 0 ? C.c0 : ((i >> 2) + (k >> 2)) & 1 ? C.c2 : C.c1;
  });
  // trackbed, sleepers, rails, covered third rail on insulators
  v.box(-L / 2, 0, E, L / 2, 0.125, trackZ + 1.75, (X, Y, Z) => (Math.abs(Z - trackZ) < 0.07 ? C.k2 : Z > trackZ + 1.0 ? C.k3 : C.s0));
  for (let x = -L / 2 + 0.25; x < L / 2 - 0.2; x += 0.625) v.box(x, 0.125, trackZ - 1.125, x + 0.25, 0.25, trackZ + 1.125, C.c0);
  for (const z0 of [trackZ - 0.875, trackZ + 0.75]) { v.box(-L / 2, 0.125, z0, L / 2, 0.25, z0 + 0.125, C.s1); v.box(-L / 2, 0.25, z0, L / 2, 0.375, z0 + 0.125, C.s5); }
  for (let x = -L / 2 + 1; x < L / 2; x += 2.5) v.box(x, 0.125, trackZ + 1.25, x + 0.125, 0.25, trackZ + 1.375, C.w1);
  v.box(-L / 2, 0.25, trackZ + 1.25, L / 2, 0.375, trackZ + 1.375, C.s3);
  v.box(-L / 2, 0.375, trackZ + 1.125, L / 2, 0.5, trackZ + 1.5, (X, Y, Z, i) => ((i >> 3) % 5 === 0 ? C.y2 : C.y1));
  // signals at both platform ends (lamp faces the track)
  for (const sx of [-1, 1]) {
    const x0 = sx * (PL / 2 - 0.5) - 0.0625;
    v.box(x0, PT, E - 0.875, x0 + 0.125, PT + 2.25, E - 0.75, C.s1);
    v.box(x0 - 0.125, PT + 2.0, E - 0.875, x0 + 0.25, PT + 2.5, E - 0.625, C.k1);
    v.box(x0, PT + 2.25, E - 0.625, x0 + 0.125, PT + 2.375, E - 0.5, G.SIG);
  }
  // benches (orange retro seats)
  for (const bx of [-3.25, 3.25]) {
    v.box(bx - 0.75, PT + 0.375, -1.875, bx + 0.75, PT + 0.5, -1.5, (X, Y, Z, i) => (i & 1 ? C.o0 : C.o1));
    v.box(bx - 0.75, PT + 0.5, -2.0, bx + 0.75, PT + 0.875, -1.875, (X, Y, Z, i, j) => (j & 1 ? C.o1 : C.o0));
    for (const lx of [bx - 0.625, bx + 0.5]) v.box(lx, PT, -2.0, lx + 0.125, PT + 0.375, -1.5, C.s0);
  }
  return v;
}
// station roundel + departure board on a pole, ticket-machine console (relative to the platform top)
function metroSignVox() {
  const v = new XB(0.0625, -3.375, 0, -2.5, -1.125, 3.25, -2.0);
  v.box(-2.4375, 0, -2.4375, -2.0625, 0.0625, -2.0625, C.s0);
  v.box(-2.3125, 0, -2.3125, -2.1875, 2.375, -2.1875, C.s1);
  v.box(-3.3125, 1.75, -2.375, -1.1875, 2.1875, -2.1875, (X, Y) => (Y < 1.8125 || Y >= 2.125 ? C.s1 : C.k1));
  v.box(-3.1875, 2.0625, -2.1875, -1.3125, 2.125, -2.125, (X, Y, Z, i) => ((i % 3) ? G.SCR2 : G.SCR));
  v.cylZ(-2.25, 2.75, -2.3125, -2.1875, 0.4375, (X, Y) => (Math.hypot(X + 2.25, Y - 2.75) > 0.3125 ? C.o0 : C.w0));
  v.glyph(['X...X', 'XX.XX', 'X.X.X', 'X...X', 'X...X'], -2.4375, 2.90625, -2.1875, -2.125, C.k1);
  return v;
}
function metroConsoleVox() {
  const v = new XB(0.0625, 1.875, 0, -2.375, 2.625, 1.625, -1.6875);
  v.box(1.9375, 0, -2.3125, 2.5625, 1.5, -1.875, (X, Y, Z, i, j) => (Z >= -1.9375 && Y > 0.25 && Y < 1.375 ? C.m0 : Y < 0.25 ? C.t1 : C.t0));
  v.box(1.875, 1.5, -2.375, 2.625, 1.5625, -1.8125, C.t1);
  v.box(2.0625, 0.9375, -1.875, 2.4375, 1.25, -1.8125, (X, Y, Z, i, j) => (j & 1 ? G.SCR : G.SCR2));
  v.box(2.125, 0.75, -1.875, 2.375, 0.8125, -1.8125, C.k0);
  v.box(2.1875, 0.5625, -1.875, 2.3125, 0.6875, -1.8125, C.rd);
  v.box(2.375, 1.5625, -2.125, 2.5, 1.625, -2.0, G.RDY);
  return v;
}
function metroBarrierVox(E) {
  const v = new XB(0.0625, -2.0, 0, E - 1.125, 2.0, 1.0, E - 0.375);
  const z = E - 0.75 + 0.03125;
  for (const sx of [-1.25, 1.25]) {
    v.box(sx - 0.5, 0.6875, z - 0.0625, sx + 0.5, 0.8125, z + 0.0625, (X, Y, Z, i) => ((i >> 2) & 1 ? C.w0 : C.rd));
    for (const lx of [sx - 0.4375, sx + 0.375]) for (const dz of [-0.25, 0.25]) v.seg(lx + 0.03, 0, z + dz, lx + 0.03, 0.7, z, 0.045, C.s3);
  }
  v.seg(-0.75, 0.75, z, 0.75, 0.75, z, 0.04, (X, Y, Z, i) => ((i >> 2) & 1 ? C.w0 : C.rd));
  return v;
}
function metroCarVox(trackZ) {
  const v = new XB(0.125, -6.25, 0, trackZ - 1.625, 6.25, 3.375, trackZ + 1.625);
  const zA = trackZ - 1.375, zB = trackZ + 1.375, DOORS = [-2.75, 2.75];
  // bogies + skirt
  for (const bx of [-4, 4]) { v.box(bx - 0.875, 0.125, zA + 0.375, bx + 0.875, 0.5, zB - 0.375, (X, Y, Z, i) => (i % 4 === 0 ? C.y2 : C.k2)); }
  v.box(-5.5, 0.375, zA + 0.125, 5.5, 0.75, zB - 0.125, C.s0);
  for (const sx of [-1, 1]) v.box(sx > 0 ? 5.75 : -6.0, 0.5, trackZ - 0.25, sx > 0 ? 6.0 : -5.75, 0.75, trackZ + 0.25, C.k2);   // couplers
  // body: elliptical noses in plan, rounded roof edges; faded two-tone paint, window band, roof gear
  const inBody = (X, Y, Z) => {
    const ex = Math.abs(X) - 4.875, dz = (Z - trackZ) / 1.375;
    if (ex > 0 && (ex / 1.0) ** 2 + dz * dz > 1) return false;
    const ry = Y - 2.625, rz = Math.max(0, Math.abs(Z - trackZ) - 1.0);
    return !(ry > 0 && (ry / 0.375) ** 2 + (rz / 0.375) ** 2 > 1);
  };
  v.fillIf(-6, 0.75, zA, 6, 3.0, zB, (X, Y, Z) => X >= -6 && X < 6 && Y >= 0.75 && Y < 3.0 && Z >= zA && Z < zB && inBody(X, Y, Z), (X, Y, Z, i, j, k) => {
    const ax = Math.abs(X), fade = vnoise(X * 0.7, Y * 1.3, Z * 0.7, 5) > 0.66;
    if (Y < 1.25) return fade ? C.p2 : C.p0;
    if (Y < 1.375) return C.m0;
    if (Y < 2.25) {
      if (ax > 5.125) return Y > 2.0 ? C.glass2 : C.glass;                         // cab windscreen
      const px = (((X + 6) % 1.5) + 1.5) % 1.5;
      return px < 0.25 ? C.m1 : Y > 2.125 ? G.WIN2 : G.WIN;
    }
    if (Y < 2.625) return ax > 5.0 && Y < 2.5 && Math.abs(Z - trackZ) < 0.5 ? SG.dest : fade ? C.m1 : C.m0;
    return ((i + k) % 11 === 0 || vnoise(X * 1.1, 0, Z * 1.1, 8) > 0.72) ? C.s3 : C.s4;            // grimy roof
  });
  // roof: AC units + walkway
  for (const sx of [-1, 1]) v.box(sx > 0 ? 1.0 : -3.5, 3.0, trackZ - 0.75, sx > 0 ? 3.5 : -1.0, 3.25, trackZ + 0.75, (X, Y, Z, i) => (Y > 3.125 && i % 2 ? C.k3 : C.s3));
  v.paintBox(-0.75, 2.875, trackZ - 0.25, 0.75, 3.0, trackZ + 0.25, C.s2);
  // headlights (end A = -x, end B = +x)
  v.fillIf(-6, 1.0, zA, 6, 1.25, zB, (X, Y, Z) => Math.abs(X) > 5.5 && Math.abs(Math.abs(Z - trackZ) - 0.75) < 0.2, (X, Y, Z, i, j, k, cur) => (cur === -1 ? undefined : X < 0 ? G.HA : G.HB));
  // platform-side doorways (carved, glowing interior behind) and the far side's closed doors
  for (const c of DOORS) {
    v.box(c - 0.625, 0.75, zA, c + 0.625, 2.5, zA + 0.25, -1);
    v.box(c - 0.625, 0.75, zA + 0.25, c + 0.625, 2.5, zA + 0.375, (X, Y) => (Y > 2.25 ? G.WIN2 : G.WIN));
    v.box(c - 0.625, 0.625, zA, c + 0.625, 0.75, zA + 0.25, C.s3);
    v.paintBox(c - 0.625, 0.75, zB - 0.125, c + 0.625, 2.5, zB, (X, Y) => (Math.abs(X - c) < 0.07 ? C.k2 : Y > 1.375 && Y < 2.125 && Math.abs(Math.abs(X - c) - 0.3125) < 0.2 ? G.WIN : C.m1));
  }
  return v;
}
function metroLeafVox() {          // one sliding door leaf, x [0, 0.625), on the platform side (z just outside zA)
  const v = new XB(0.125, 0, 0.75, -0.125, 0.625, 2.5, 0);
  v.box(0, 0.75, -0.125, 0.625, 2.5, 0, (X, Y) => (Y > 1.5 && Y < 2.125 && X > 0.125 && X < 0.5 ? C.glass2 : Y > 1.25 && Y < 1.375 ? C.o0 : C.m1));
  return v;
}
function buildMetro(R) {
  const o = R.o = metroOpts(R.x), E = o.trackZ - 1.375, PT = o.plat ? 0.375 : 0.125, key = `${o.trackZ}_${o.L}_${o.PL}_${o.PB}_${o.plat}`;
  const S = {
    st: gset('m_static' + key, () => metroStaticVox(o)), sign: gset('m_sign', metroSignVox), cons: gset('m_cons', metroConsoleVox),
    xg: gset('m_x', () => xGlyphVox(2.0625, 0.9375, -1.8125, 6, 5, 0.0625)), seg: gset('seg_m', () => segVox(0.1875, 0.1875, 0.0625)),
    bar: gset('m_bar' + E, () => metroBarrierVox(E)), car: gset('m_car' + o.trackZ, () => metroCarVox(o.trackZ)), leaf: gset('m_leaf', metroLeafVox),
  };
  R.part(S.st);
  R.plat = R.g(R.root, 0, PT, 0);
  R.part(S.sign, R.plat); R.part(S.cons, R.plat);
  R.xg = R.part(S.xg, R.plat);
  R.segM = [];
  for (let i = 0; i < 8; i++) R.segM.push(R.part(S.seg, R.plat, -3.15625 + i * 0.25, 1.96875, -2.15625).children[0]);
  R.bar = R.part(S.bar, R.plat);
  R.car = R.g(R.root);
  R.part(S.car, R.car);
  R.leaves = [];
  for (const c of [-2.75, 2.75]) for (const s of [-1, 1]) {
    const base = s < 0 ? c - 0.625 : c;
    R.leaves.push({ g: R.part(S.leaf, R.car, base, 0, E), base, s });
  }
  R.car.visible = false;
  R.addRing(3.4, E - 0.02).position.y = PT + 0.03;
  R.anim = animMetro;
}
function animMetro(R, dt, st, t, el, ctx) {
  const o = R.o, T = R.time, D = o.L / 2 + 7, dir = o.dir, E = o.trackZ - 1.375, PT = o.plat ? 0.375 : 0.125, fx = ctx.near !== false ? ctx.fx : null;
  // car along the track (null = not in the station)
  let tx = null, doors = 0;
  if (st === 'called' && t < 6) tx = -dir * D * (t / 6) ** 2;
  else if (st === 'open') { tx = 0; doors = ease(sat((el - 0.5) / 1.0)) * (1 - ease(sat((1.2 - t) / 1.0))); }
  else if (st === 'gone') { const u = sat((el - 1.0) / 6.5); tx = u < 1 ? dir * D * u * u : null; }
  R.car.visible = tx != null;
  if (tx != null) R.car.position.x = tx;
  doors = R.follow('doors', doors, dt);
  for (const lf of R.leaves) lf.g.position.x = lf.base + lf.s * 0.6 * doors;
  const off = st === 'offline';
  R.bar.visible = R.xg.visible = off;
  // lamps: windows, head/tail lights, edge lamps, signals, console, departure board
  const moving = tx != null && st !== 'open', blink = (hz) => (T * hz) % 1 < 0.5;
  R.col('win', COL.warm, st === 'open' ? 1.15 : moving ? (Math.random() < 0.04 ? 0.4 : 1.0) : 0.9);
  const lead = dir > 0 ? 'headB' : 'headA', tail = dir > 0 ? 'headA' : 'headB';
  R.col(lead, COL.white, 1.5); R.col(tail, COL.red, 1.1);
  if (st === 'called') { R.col('edge', COL.amber, t < 10 ? (blink(2) ? 1.3 : 0.2) : 0.3); R.col('sig', COL.amber, 1.2); R.col('screen', COL.amber, blink(2.5) ? 1.1 : 0.6); R.col('ready', COL.amber, 1); }
  else if (st === 'open') { R.col('edge', COL.green, 1.1); R.col('sig', COL.green, 1.3); R.col('screen', COL.green, 1.2); R.col('ready', COL.green, 1.2); }
  else if (st === 'gone') { R.col('edge', COL.amber, 0.15); R.col('sig', COL.red, 1.1); R.col('screen', COL.amber, 0.3); R.col('ready', COL.amber, 0.15); }
  else if (st === 'idle') { R.col('edge', COL.white, 0.2); R.col('sig', COL.red, 0.9); R.col('screen', COL.green, 0.5 + 0.08 * Math.sin(T * 2)); R.col('ready', COL.green, 0.75 + 0.35 * Math.sin(T * 3)); }
  else { R.col('edge', COL.red, 0.25); R.col('sig', COL.red, 0.6); R.col('screen', COL.red, 0.75); R.col('ready', COL.red, 0.9); R.col('xlamp', COL.red, blink(1.2) ? 1.4 : 0.9); }
  R.segBar(R.segM, st, t, T, R.callDur, 12);
  // dynamic lights: tunnel glow before the car shows, headlight + window spill while it is in, platform light
  const la = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  if (st === 'called' && t >= 6 && t < 15) R.spot(ctx, -dir * o.L / 2, 1.2, o.trackZ, la, 0.45, COL.white, sat((15 - t) / 8) * 2.0 * (0.85 + 0.15 * Math.random()), 15, 1.3);
  if (tx != null) {
    R.spot(ctx, tx + dir * 6.1, 1.15, o.trackZ, la, 0.4, COL.white, 2.6, 18, 1.5);
    R.light(ctx, tx, 2.0, E - 0.4, COL.warm, st === 'open' ? 1.5 : 1.0, 7, 1.3);
  }
  if (st === 'idle') R.light(ctx, 2.25, PT + 1.4, -1.6, COL.green, 0.45, 2.8, 1.0);
  else if (st === 'called') R.light(ctx, 2.25, PT + 1.4, -1.6, COL.amber, 0.55, 3.2, 1.1);
  else if (off) R.light(ctx, 2.25, PT + 1.3, -1.5, COL.red, 0.6, 3.2, 1.0);
  // rumble, brakes, departure; dust whipped up along the edge
  if (st === 'called' && t < 9.5) { R.cue(ctx, 'rumble', 'extract_metro_rumble'); if (t < 6) ctx.shake?.(0.05 * (1 - t / 6)); }
  if (st === 'called' && t < 2.4) R.cue(ctx, 'brake', 'extract_metro_arrive');
  if (st === 'gone' && el > 0.9) R.cue(ctx, 'depart', 'extract_metro_depart');
  if (fx && moving && Math.abs(tx) < D - 4 && Math.random() < dt * 20) {
    const p = R.w((Math.random() - 0.5) * o.PL, PT + 0.1, E - 0.3 - Math.random() * 0.6);
    fx.parts.emit({ x: p.x, y: p.y, z: p.z, vx: dir * (1 + Math.random() * 2), vy: 0.3 + Math.random() * 0.5, vz: 0, life: 0.9, size: 3, size1: 7, color: 0x8a8274, alpha: 0.4, shape: 1, drag: 1.5 });
  }
  R.ringState(st, t, el, dt);
}

// ============================================================================= AIRSHAFT
const AS = { DROP: 2.6, RISE: 6 };
function asHousingVox() {
  const v = new XB(0.125, -1.875, 0, -2.875, 1.875, 3.875, 1.25);
  const conc = (i, j, k) => (i % 8 === 0 || k % 8 === 0 ? C.c0 : hash3(i >> 1, j >> 2, k >> 1, 6) < 0.15 ? C.c2 : C.c1);
  // back block with the fan well, louvres; roof slab + raised fan collar
  v.box(-1.75, 0, -2.75, 1.75, 2.25, -0.75, (X, Y, Z, i, j, k) => (Y < 0.25 ? C.c0 : conc(i, j, k)));
  v.box(-1.875, 2.25, -2.875, 1.875, 2.5, -0.625, (X, Y, Z, i, j, k) => (Y < 2.375 ? C.c1 : Math.abs(X) > 1.75 || Z < -2.75 || Z > -0.75 ? C.c2 : (i + k) % 9 === 0 ? C.c2 : C.s1));
  v.cylY(0, -1.875, 2.5, 2.625, 0.8125, C.s2, 0.6875);
  v.cylY(0, -1.875, 1.75, 2.5, 0.6875, -1);
  v.cylY(0, -1.875, 1.625, 1.75, 0.6875, C.k1);
  for (const sx of [-1, 1]) v.paintBox(sx > 0 ? 1.625 : -1.75, 0.75, -2.5, sx > 0 ? 1.75 : -1.625, 1.875, -1.0, (X, Y, Z, i, j) => (j & 1 ? C.s3 : C.k2));
  v.paintBox(-0.75, 1.0, -0.875, 0.75, 2.0, -0.75, (X, Y, Z, i, j) => (j & 1 ? C.s3 : C.k2));
  // shaft walls around the front doorway: louvre (left), hazard corner stripes, wall caps
  for (const sx of [-1, 1]) {
    const x0 = sx > 0 ? 1.0 : -1.75;
    v.box(x0, 0, -0.75, x0 + 0.75, 2.25, 1.0, (X, Y, Z, i, j, k) => (Y < 0.25 ? C.c0 : conc(i, j, k)));
    v.box(x0, 2.25, -0.75, x0 + 0.75, 2.375, 1.125, C.c2);
    v.paintBox(sx > 0 ? 1.0 : -1.125, 0, 0.875, sx > 0 ? 1.125 : -1.0, 2.0, 1.0, (X, Y, Z, i, j) => (((j >> 1) & 1) ? C.bk : C.y0));
  }
  v.box(-1.625, 0.75, 1.0, -1.125, 1.75, 1.125, (X, Y, Z, i, j) => (j & 1 ? C.s3 : C.k2));
  // lintel (countdown lamps sit on its face), sill, dark shaft top
  v.box(-1.0, 2.0, 0.75, 1.0, 2.375, 1.0, (X, Y, Z, i, j, k) => (Y > 2.25 ? hazD(i, k) : C.s1));
  v.box(-1.0, 0, 0.875, 1.0, 0.125, 1.125, (X, Y, Z, i, j, k) => hazD(i, k));
  v.box(-1.0, 0, -0.75, 1.0, 0.125, 0.875, (X, Y, Z) => (Z < -0.5 ? C.k3 : Math.abs(X) > 0.75 ? C.k2 : Z < 0 ? C.k1 : C.k0));
  // A-frame winch gantry, top beam, drum + motor on the back block roof, rope from the drum to the sheave
  for (const sx of [-1, 1]) {
    const x = sx * 1.375;
    v.seg(x, 2.375, -0.625, x, 3.5, 0.125, 0.09, C.y1);
    v.seg(x, 2.375, 0.875, x, 3.5, 0.125, 0.09, C.y1);
  }
  v.box(-1.5, 3.5, 0, 1.5, 3.75, 0.25, (X, Y, Z, i, j, k) => (Y > 3.625 ? hazD(i, k) : C.s1));
  v.cylX(2.75, -0.875, -0.5, 0.5, 0.25, (X, Y, Z, i) => (i & 1 ? C.s2 : C.k3));
  for (const x of [-0.625, 0.5]) v.box(x, 2.5, -1.125, x + 0.125, 3.0, -0.625, C.s1);
  v.box(0.625, 2.5, -1.125, 1.25, 3.0, -0.625, (X, Y) => (Y > 2.875 ? C.y1 : C.s1));
  v.seg(0.25, 3.0, -0.875, 0.3125, 3.1875, 0.125, 0.04, C.k3);
  v.box(1.375, 2.5, -2.75, 1.625, 2.75, -2.5, SG.red);
  return v;
}
function asFanVox() {   // rotor, centred, spins about y
  const v = new XB(0.0625, -0.6875, 0, -0.6875, 0.6875, 0.25, 0.6875);
  v.cylY(0, 0, 0, 0.25, 0.1875, C.s1);
  for (let b = 0; b < 5; b++) { const a = b * TAU / 5; v.seg(Math.cos(a) * 0.15, 0.125, Math.sin(a) * 0.15, Math.cos(a) * 0.6, 0.125, Math.sin(a) * 0.6, 0.08, C.s4); }
  return v;
}
function asGrilleVox() {
  const v = new XB(0.0625, -0.75, 0, -0.75, 0.75, 0.0625, 0.75);
  v.cylY(0, 0, 0, 0.0625, 0.6875, (X, Y, Z) => {
    const d = Math.hypot(X, Z);
    if (d > 0.625 || Math.abs(d - 0.4) < 0.035 || Math.abs(d - 0.19) < 0.035) return C.s3;
    if (Math.abs(X) < 0.035 || Math.abs(Z) < 0.035) return C.s2;
    return undefined;
  });
  return v;
}
function asConsoleVox() {
  const v = new XB(0.0625, 1.0625, 0.8125, 1.0, 1.6875, 1.625, 1.3125);
  v.box(1.125, 0.875, 1.0, 1.625, 1.4375, 1.1875, (X, Y, Z, i, j) => ((X < 1.1875 || X >= 1.5625) && (j >> 1) & 1 ? C.y1 : C.s1));
  v.box(1.0625, 1.4375, 1.0, 1.6875, 1.5, 1.25, C.y1);
  v.box(1.1875, 1.0, 1.1875, 1.5625, 1.3125, 1.25, (X, Y, Z, i, j) => (X < 1.25 || X >= 1.5 || Y < 1.0625 || Y >= 1.25 ? C.k1 : j & 1 ? G.SCR : G.SCR2));
  v.box(1.25, 0.875, 1.1875, 1.3125, 0.9375, 1.25, C.rd);
  v.box(1.4375, 1.5, 1.0625, 1.5625, 1.625, 1.1875, G.RDY);
  return v;
}
function asCageVox() {
  const v = new XB(0.125, -0.875, 0, -0.625, 0.875, 2.25, 0.875);
  const wear = (i, j, k) => (hash3(i, j, k, 7) < 0.12 ? C.y1 : C.y0);
  v.box(-0.875, 0.125, -0.625, 0.875, 0.25, 0.875, (X, Y, Z, i, j, k) => (Math.abs(X) > 0.625 || Z < -0.375 || Z > 0.625 ? hazD(i, k) : i % 3 === 0 || k % 3 === 0 ? C.s3 : C.k2));
  v.box(-0.875, 0, -0.625, 0.875, 0.125, 0.875, C.s0);
  for (const x0 of [-0.875, 0.75]) for (const z0 of [-0.625, 0.75]) v.box(x0, 0.25, z0, x0 + 0.125, 2.0, z0 + 0.125, (X, Y, Z, i, j, k) => wear(i, j, k));
  const mesh = (Y, along, i, j, k) => (Y < 0.375 ? hazD(along, j) : (Y > 1.0 && Y < 1.125) || Y > 1.875 ? wear(i, j, k) : (along & 1) === 0 ? C.s2 : undefined);
  for (const x0 of [-0.875, 0.75]) v.box(x0, 0.25, -0.5, x0 + 0.125, 2.0, 0.75, (X, Y, Z, i, j, k) => mesh(Y, k, i, j, k));
  v.box(-0.75, 0.25, -0.625, 0.75, 2.0, -0.5, (X, Y, Z, i, j, k) => mesh(Y, i, i, j, k));
  v.box(-0.875, 1.875, 0.75, 0.875, 2.0, 0.875, (X, Y, Z, i, j, k) => wear(i, j, k));
  v.box(-0.75, 2.0, 0.0, 0.75, 2.125, 0.25, C.s1);
  v.box(-0.375, 2.125, 0.0, -0.25, 2.25, 0.25, C.s3);
  v.box(-0.375, 1.875, -0.125, 0.375, 2.0, 0.0, G.LITE);
  return v;
}
function asLeafVox() {   // gate leaf x [0, 0.875) (mirrored by the rig for the right leaf)
  const v = new XB(0.125, 0, 0.25, 0.75, 0.875, 1.875, 0.875);
  v.box(0, 0.25, 0.75, 0.875, 1.875, 0.875, (X, Y, Z, i, j) => (Y < 0.375 ? hazD(i, j) : Y > 1.75 || (Y > 1.0 && Y < 1.125) || X < 0.125 ? C.s3 : (i & 1) === 0 ? C.s2 : undefined));
  return v;
}
function buildAirshaft(R) {
  const S = {
    house: gset('as_house', asHousingVox), fan: gset('as_fan', asFanVox), grille: gset('as_grille', asGrilleVox), cons: gset('as_cons', asConsoleVox),
    xg: gset('as_x', () => xGlyphVox(1.25, 1.0625, 1.25, 4, 3, 0.0625)), beacon: gset('beacon', beaconVox), sheave: gset('as_sheave', () => sheaveVox(0.3125)),
    seg: gset('seg_as', () => segVox(0.25, 0.125, 0.125)), cage: gset('as_cage', asCageVox), leaf: gset('as_leaf', asLeafVox), rope: gset('rope', ropeVox),
    tape: gset('as_tape', () => tapeVox(-1.0, 1.0, 0.45, 1.6, 1.125, 0.03125)),
  };
  R.part(S.house); R.part(S.cons);
  R.fan = R.part(S.fan, R.root, 0, 1.75, -1.875);
  R.part(S.grille, R.root, 0, 2.4375, -1.875);
  R.xg = R.part(S.xg);
  R.beacons = [R.part(S.beacon, R.root, 0, 3.75, 0.125)];
  R.sheave = R.part(S.sheave, R.root, 0, 3.1875, 0.125);
  R.segM = [];
  for (let i = 0; i < 5; i++) R.segM.push(R.part(S.seg, R.root, -0.75 + i * 0.375, 2.125, 1.0625).children[0]);
  R.cage = R.part(S.cage);
  R.leafL = R.part(S.leaf, R.cage, -0.875, 0, 0);
  R.leafR = R.part(S.leaf, R.cage, 0.875, 0, 0); R.leafR.scale.x = -1;
  R.rope = R.part(S.rope, R.root, -0.3125, 0, 0.125);
  R.tape = R.part(S.tape);
  R.addRing(3.4);
  R.fanW = 14;
  R.anim = animAirshaft;
}
function animAirshaft(R, dt, st, t, el, ctx) {
  const T = R.time, off = st === 'offline', fx = ctx.near !== false ? ctx.fx : null;
  // fan: spins down while called, stopped while open / offline, spins back up after the cage left
  let fw = 14;
  if (st === 'called') fw = 14 * (1 - sat(el / 5));
  else if (st === 'open' || off) fw = 0;
  else if (st === 'gone') fw = 14 * sat((el - 5) / 6);
  R.fanW = R.snap ? fw : R.fanW + (fw - R.fanW) * Math.min(1, dt * 0.9);
  R.fan.rotation.y += R.fanW * dt;
  R.loop = R.fanW > 0.6 ? { name: 'extract_fan_loop', vol: Math.min(1, R.fanW / 14), pitch: 0.55 + 0.45 * R.fanW / 14 } : null;
  if (fx && R.fanW > 6 && Math.random() < dt * 3) { const p = R.w((Math.random() - 0.5) * 1.0, 2.6, -1.875 + (Math.random() - 0.5) * 1.0); fx.parts.emit({ x: p.x, y: p.y, z: p.z, vy: 1.5 + Math.random(), life: 1.6, size: 2, size1: 5, color: 0x9a9890, alpha: 0.25, shape: 1, drag: 0.6 }); }
  // cage + gate
  let cy = -AS.DROP, gate = 0;
  if (st === 'called' && t < AS.RISE) { const u = t / AS.RISE; cy = -AS.DROP * u * u; }
  else if (st === 'open') { cy = 0; gate = ease(sat((el - 0.4) / 0.9)); }
  else if (st === 'gone') { gate = 1 - ease(sat(el / 0.9)); const u = sat((el - 1.2) / 4.5); cy = -AS.DROP * u * u; }
  cy = R.follow('cy', cy, dt); gate = R.follow('gate', gate, dt);
  R.cage.position.y = cy; R.cage.visible = cy > -2.2;
  R.leafL.position.x = -0.875 - 0.85 * gate; R.leafR.position.x = 0.875 + 0.85 * gate;
  R.sheave.rotation.z = cy / 0.3125;
  { const b = cy + 2.25; R.rope.position.y = b; R.rope.scale.y = Math.max(0.01, 3.1875 - b); }
  R.tape.visible = R.xg.visible = off;
  // beacon, console, cage light, countdown lintel, lights
  const spin = st === 'called' ? 7.5 : st === 'open' ? 2.2 : 0;
  R.spin = (R.spin || 0) + dt * spin;
  const flash = Math.pow(Math.max(0, Math.cos(R.spin + R.root.rotation.y)), 4), blink = (hz) => (T * hz) % 1 < 0.5;
  if (st === 'called') { R.col('beacon', COL.orange, 0.45 + 1.3 * flash); R.spot(ctx, 0, 3.95, 0.125, R.spin, 0.5, 0xff6a1c, 2.4, 15, 1.4); R.col('screen', COL.amber, blink(2.5) ? 1.15 : 0.6); R.col('ready', COL.amber, 1); }
  else if (st === 'open') { R.col('beacon', COL.green, 0.85 + 0.35 * flash); R.col('screen', COL.green, 1.25); R.col('ready', COL.green, 1.2); }
  else if (st === 'gone') { R.col('beacon', COL.amber, 0.25 + 0.3 * Math.pow(Math.sin(T * 2.4), 2)); R.col('screen', COL.amber, 0.3); R.col('ready', COL.amber, 0.15); }
  else if (st === 'idle') { R.col('beacon', COL.amber, 0.1); R.col('screen', COL.green, 0.5 + 0.08 * Math.sin(T * 2)); R.col('ready', COL.green, 0.75 + 0.35 * Math.sin(T * 3)); }
  else { R.col('beacon', COL.amber, 0.05); R.col('screen', COL.red, 0.75); R.col('ready', COL.red, 0.9); R.col('xlamp', COL.red, blink(1.2) ? 1.4 : 0.9); }
  const lite = st === 'open' ? 1.4 : st === 'called' && t < 1.5 ? (1.5 - t) / 1.5 * (Math.random() < 0.15 ? 0.3 : 1.4) : st === 'gone' && el < 1.2 ? 1.4 : 0.1;
  R.col('lite', COL.white, lite);
  R.segBar(R.segM, st, t, T, R.callDur, 12);
  if (st === 'idle') R.light(ctx, 1.35, 1.6, 1.4, COL.green, 0.45, 2.8, 1.0);
  else if (st === 'called') R.light(ctx, 1.35, 1.6, 1.5, COL.amber, 0.55, 3.2, 1.1);
  else if (st === 'open') { R.light(ctx, 0, 1.7, 0.2, COL.white, 1.8, 6.5, 1.5); R.light(ctx, 0, 3.6, 0.6, COL.green, 1.0, 6.5, 1.3); }
  else if (st === 'gone') R.light(ctx, 0, 3.6, 0.6, COL.amber, 0.25 + 0.3 * Math.pow(Math.sin(T * 2.4), 2), 5, 1.0);
  else R.light(ctx, 1.35, 1.4, 1.6, COL.red, 0.65, 3.4, 1.0);
  if (lite > 0.5 && st !== 'open') R.light(ctx, 0, cy + 1.7, 0.2, COL.white, lite, 5, 1.4);
  if (st === 'called' && t < AS.RISE + 0.3) R.cue(ctx, 'rise', 'elevator_rise', { pitch: 1.15 });
  if (st === 'gone' && el > 1.1) R.cue(ctx, 'drop', 'elevator_depart', { pitch: 1.15 });
  if (st === 'open' && R.prev === 'called' && el < 0.1 && R.once('land') && fx) R.dust(fx, 1.1, 14);
  R.ringState(st, t, el, dt);
}

// ============================================================================= rig
const DUR = { open: 12, gone: 75 };
const STATES = new Set(['idle', 'called', 'open', 'gone', 'offline']);
const RING_LOOK = {   // colour, alpha, dash chase speed, inner fill
  idle: [0x7dffb0, 0.34, 0.04, 0], called: [0xffa21c, 0.9, 0.12, 0.05], open: [0x3cff6e, 1.0, 0.8, 0.11],
  gone: [0xff8a2a, 0.3, 0, 0], offline: [0xff2a18, 0.45, 0, 0],
};
const _v = new THREE.Vector3();
class Rig {
  constructor(kind, x) {
    this.kind = kind; this.x = x || {};
    this.root = new THREE.Group(); this.root.name = 'extract:' + kind;
    this.mats = {}; this.f = {}; this.done = new Set(); this.cued = new Set();
    this.st = null; this.prev = null; this.age = 0; this.tl = 0; this.el = 0; this.time = Math.random() * 20;
    this.snap = true; this.loop = null; this.ring = null; this.ph = 0;
    this.callDur = +this.x.callTime || 25;
  }
  mat(ch) { return this.mats[ch] || (this.mats[ch] = cloneMat()); }
  g(parent = this.root, x = 0, y = 0, z = 0) { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; }
  // part from a gset: group + one mesh per channel (remap renames channels -> per-instance materials)
  part(gs, parent = this.root, x = 0, y = 0, z = 0, remap = null) {
    const g = this.g(parent, x, y, z);
    for (const k in gs) {
      if (!gs[k]) continue;
      const ch = remap?.[k] || k, m = new THREE.Mesh(gs[k], ch === 'base' ? baseMat() : this.mat(ch));
      m.castShadow = true; m.receiveShadow = true; m.userData.ch = ch;
      g.add(m);
    }
    return g;
  }
  col(ch, hex, k = 1) { const m = this.mats[ch]; if (m) m.color.setHex(hex).multiplyScalar(k); }
  follow(key, v, dt, k = 12) { const c = this.f[key]; return (this.f[key] = this.snap || c == null ? v : c + (v - c) * Math.min(1, dt * k)); }
  once(key) { if (this.done.has(key)) return false; this.done.add(key); return true; }
  w(lx, ly, lz) { return _v.set(lx, ly, lz).applyMatrix4(this.root.matrixWorld); }
  light(ctx, lx, ly, lz, col, I, range, prio = 1.2) {
    if (!ctx.L || ctx.near === false || !(I > 0.01)) return;
    const p = this.w(lx, ly, lz); ctx.L.light(p.x, p.y, p.z, col, I, range, prio);
  }
  spot(ctx, lx, ly, lz, a, half, col, I, range, prio = 1.3) {
    if (!ctx.L || ctx.near === false || !(I > 0.01)) return;
    const p = this.w(lx, ly, lz); ctx.L.spot(p.x, p.y, p.z, a + this.root.rotation.y, half, col, I, range, prio);
  }
  cue(ctx, key, name, o) { if (this.cued.has(key)) return; this.cued.add(key); if (!this.snap) ctx.play?.(name, o); }
  dust(fx, r, n) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU, p = this.w(Math.cos(a) * r, 0.15, Math.sin(a) * r);
      fx.parts.emit({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * 1.2, vy: 0.5 + Math.random() * 0.9, vz: Math.sin(a) * 1.2, life: 1.2 + Math.random() * 0.8, size: 5, size1: 14, color: 0x8a8274, alpha: 0.5, shape: 1, drag: 1.5 });
    }
  }
  addRing(r, clip = 99) { this.ring = ringMesh(r, clip); this.ring.position.y = 0.04; this.root.add(this.ring); return this.ring; }
  ringState(st, t, el, dt) {
    const u = this.ring?.material.uniforms; if (!u) return;
    let [c, a, chase, inner] = RING_LOOK[st] || RING_LOOK.idle;
    if (this.kind === 'hatch') { c = st === 'offline' ? 0xff2a18 : this.use != null ? 0x3cff6e : 0xffc23c; a = st === 'offline' ? 0.45 : this.use != null ? 0.95 : 0.4; chase = this.use != null ? 0.8 : 0.03; inner = 0; }
    this.ph = (this.ph + dt * chase) % 1;
    u.uCol.value.setHex(c); u.uA.value = a; u.uPh.value = this.ph;
    u.uFill.value = st === 'called' ? 1 - t / this.callDur : 1;
    u.uDim.value = st === 'called' ? 0.3 : 1;
    u.uInner.value = inner * (0.65 + 0.35 * Math.sin(this.time * 6));
    if (st === 'gone') u.uA.value = 0.12 + 0.2 * (1 - sat(el / 10));
  }
  // countdown lamps: called fills (newest blinks, all flash for the last 5 s), open drains to departure,
  // offline every other lamp dim red, otherwise dark
  segBar(ms, st, t, T, callDur, openDur) {
    const n = ms.length, fast = (T * 6) % 1 < 0.5;
    const on = st === 'open' ? COL.green : st === 'offline' ? COL.red : COL.amber;
    this.mat('seg').color.setHex(on).multiplyScalar(st === 'offline' ? 0.55 : 1.0); this.mat('segHi').color.setHex(on).multiplyScalar(1.6);
    this.mat('segOff').color.setRGB(0.06, 0.06, 0.06);
    for (let i = 0; i < n; i++) {
      let m = 'segOff';
      if (st === 'called') {
        const lit = Math.min(n, Math.floor((1 - t / callDur) * n) + 1);
        m = t < 5 ? (fast ? 'segHi' : 'seg') : i < lit - 1 ? 'seg' : i === lit - 1 && (T * 2) % 1 < 0.5 ? 'segHi' : 'segOff';
      } else if (st === 'open') m = i < Math.ceil((t / openDur) * n) && !(t < 3 && fast) ? 'seg' : 'segOff';
      else if (st === 'offline') m = i & 1 ? 'seg' : 'segOff';
      ms[i].material = this.mat(m);
    }
  }
  update(dt, st, t, ctx = {}) {
    dt = clamp(+dt || 0, 0, 0.1);
    st = STATES.has(st) ? st : 'idle';
    if (this.kind === 'hatch' && st !== 'offline') st = 'idle';
    if (st !== this.st) { this.prev = this.st; this.st = st; this.age = 0; this.cued.clear(); this.done.clear(); this._tl = null; }
    else this.age += dt;
    const dur = st === 'called' ? this.callDur : DUR[st];
    if (dur == null) this.tl = 0;
    else if (typeof t === 'number' && isFinite(t)) {   // follow the authoritative timer smoothly between sim ticks
      const tt = clamp(t, 0, dur);
      this._tl = this._tl == null || Math.abs(this._tl - tt) > 0.15 ? tt : Math.max(0, this._tl - dt);
      this.tl = this._tl;
    } else this.tl = Math.max(0, dur - this.age);
    this.el = dur == null ? this.age : dur - this.tl;
    this.time += dt;
    this.root.updateMatrixWorld();
    this.anim(this, dt, st, this.tl, this.el, ctx || {});
    this.snap = false;
  }
  trigger(name) { if (name === 'use' && this.kind === 'hatch' && this.st !== 'offline') { this.use = 0; this.done.delete('steam'); } }
  dispose() { for (const m of Object.values(this.mats)) m.dispose(); this.ring?.material.dispose(); this.ring?.geometry.dispose(); }
}

const BUILD = { elevator: buildElevator, hatch: buildHatch, metro: buildMetro, airshaft: buildAirshaft };
export const EXTRACT_KINDS = Object.keys(BUILD);

export function createExtractModel(kind, x = {}) {
  const k = BUILD[kind] ? kind : 'elevator';
  const R = new Rig(k, x);
  BUILD[k](R);
  R.root.userData.extract = R;
  R.root.addEventListener('removed', () => R.dispose());
  return {
    root: R.root, kind: k, rig: R,
    update: (dt, state, t, ctx) => R.update(dt, state, t, ctx),
    trigger: (name) => R.trigger(name),
    get loop() { return R.loop; },
    get timeLeft() { return R.tl; },
    dispose: () => R.dispose(),
  };
}

// collision boxes in the local frame [x0, z0, x1, z1, h, y0?] - posts, waist-high walls, platform slab;
// the zone floor (and the doorway into it) always stays walkable
export function extractSolids(kind, x = {}) {
  switch (kind) {
    case 'hatch': return [];
    case 'metro': {
      const o = metroOpts(x), E = o.trackZ - 1.375, PT = o.plat ? 0.375 : 0;
      const out = [];
      if (o.plat) out.push([-o.PL / 2, -o.PB, o.PL / 2, E, 0.375]);
      out.push([-2.35, -2.35, -2.15, -2.15, 3.2, PT]);                 // sign pole
      out.push([1.94, -2.31, 2.56, -1.88, 1.55, PT]);                  // ticket machine
      return out;
    }
    case 'airshaft': return [
      [-1.75, -2.75, 1.75, -0.75, 2.5],                                 // back block (fan, winch)
      [-1.75, -0.75, -1.125, 1.0, 2.375], [1.125, -0.75, 1.75, 1.0, 2.375],   // shaft walls (doorway stays open)
    ];
    default: {
      const out = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push([sx * 1.9375 - 0.19, sz * 1.9375 - 0.19, sx * 1.9375 + 0.19, sz * 1.9375 + 0.19, 3.6]);
      out.push([1.8, -1.75, 2.1, 1.75, 1.15], [-2.1, -1.75, -1.8, 1.75, 1.15], [-1.75, -2.1, 1.75, -1.8, 1.15]);   // waist-high sides + back
      out.push([2.4, 2.4, 2.85, 2.85, 1.45]);                           // call console
      return out;
    }
  }
}

// visible triangles per kind (all parts, every state) - for the gallery / budgets
export function extractTris(model) {
  let n = 0;
  model.root.traverse((o) => { if (o.isMesh && o.geometry.index && o.name !== 'zone') n += o.geometry.index.count / 3; });
  return n;
}
