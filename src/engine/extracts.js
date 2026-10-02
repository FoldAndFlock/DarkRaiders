// Extraction points: animated, lit voxel rigs per kind + the shared local geometry the sim, view, bots and
// collision all use (call button, cabin, departure lever) + their collision boxes.
//
//   createExtractModel(kind, x) -> { root, update(dt, state, t, ctx), carry(age, c), loop, timeLeft, kind, dispose() }
//   extractPoints(kind, x)      -> local frame { call, departs[], depart, entry, cabin: { shape, cx, cz, hw, hd, r, y } }
//   extractWorldPoints(x)       -> same in world space ({ call: [wx, wz], ..., cabin: { cx, cz, hw, hd, r, y, face } })
//   inCabin(x, wx, wy, wz) / toLocal(x, wx, wz) / toWorld(x, lx, lz)
//   extractSolids(kind, x, world?) -> [[x0, z0, x1, z1, h, y0?], ...]  (World.extract rasterises + rotates them)
//   metroFit(x, world)          -> the underground hall around a metro extract (track ends = tunnel mouths)
//
// Frame: origin = the extract marker on its floor (x.y), +z = front (x.face rotates it, 0 = toward the camera),
// 1 unit = 1 m. The view places `root` at (x.x, x.y, x.z) with rotation.y = x.face.
//
// Flow (sim.js owns it, timers in seconds):
//   idle --hold E at the call button--> called (host picks 30-45 s, airshaft 30-38) --> open (doors open,
//   cabin lit; auto-departs after 90 s) --a raider in the cabin holds E on the departure lever (or 90 s
//   pass)--> closing (10 s: warning lights + buzzer, doors close) --> everyone inside the cabin extracts -->
//   gone (the car leaves; cooldown 75 s -> idle; the metro station closes for the raid -> offline 'used').
//   Hatch: idle --key--> open (15 s window, anyone stepping onto it extracts; one open hatch per map) --> idle.
//
// update(dt, state, t, ctx): state 'idle' | 'called' | 'open' | 'closing' | 'gone' | 'offline'; t = seconds
//   left on the state's timer (null -> the rig times it itself); ctx = { L (Lighting), fx (FX), play(name,
//   opts), shake(a), near (false = far off-screen: skip lights/particles), viewer: { x, y, z } (local player:
//   roofs fade / walls cut / the metro car roof hides while you are inside) }.
// carry(age, c): passenger offset for a raider extracted `age` s ago at world point c = { x, y, z } ->
//   { dx, dy, dz, hide } (rides down with the elevator car, out with the train, up into the dropship).
//
// Kinds:
//   elevator  Dam-style raider elevator: a squat flat-roofed concrete bunker with battered (sloping) walls
//             around the shaft, steel-framed front doorway with heavy sliding doors, faded orange band,
//             countdown display over the door, hoist house + antenna + 2 rotating beacons on the roof; a
//             yellow call gantry at the front-right corner (call button panel, status light on top: lit =
//             available, dark = shut down). Inside, the car rises out of the shaft: grate deck with glowing
//             edge LEDs, mesh walls, countdown display, two corner booths with the departure levers. The
//             roof dithers to 62% (you can peek in) and vanishes while you are inside; walls are cut above
//             your waist like building interiors.
//   metro     Station platform inside an underground hall: tiled platform, tactile strip, edge lamps, a
//             yellow platform fence with gated openings at the car doors, the call terminal against the fence,
//             roundel + double-sided departure board, benches, track (sleepers, rails, covered third rail)
//             running between two dark tunnel mouths at the hall's end walls (auto-fitted, see metroFit).
//             The 12 m car slides out of a mouth (clipped at the mouth plane, so nothing ever shows outside
//             the hall), stops, opens its platform doors; inside: seats, poles, the departure lever on the far
//             wall. The car roof hides and its walls are cut while you are inside.
//   airshaft  Shaft head: square concrete housing with louvres, hazard rim, corner lamps and a front doorway;
//             grated shaft floor inside, departure lever on the back wall; console on a post outside. When
//             called, a black-and-red VTOL dropship flies in and hovers over the shaft (ducted-fan glow,
//             downwash dust, winch line + rising light beam); at departure the raiders inside are pulled up
//             into it and it flies off.
//   hatch     Armoured round raider hatch (riveted ring, olive lid, red hand-wheel, key reader). A key opens it
//             for 15 s (lid up, steam, green ring sweeping down the window), then it seals again.
// Every kind draws a pixel decal around its cabin (state colour: idle soft green, called amber + countdown
// sweep, open bright green with chasing dashes + dithered fill, closing red, gone fading, offline red) and a
// small ring at the call button.
//
// Map options (w.extract(id, name, x, z, opts)):
//   face (rad), callTime (s, fixed countdown instead of the random 30-45 s), structure: false (no collision)
//   metro: trackZ (3) track centre in front of the marker; trackX0 / trackX1 tunnel mouth positions along the
//          local x axis (default: the hall's end walls via metroFit, else trackLen 26 centred); platformLen (16);
//          platformDepth (2.75, clamped to the hall); trainDir (1: arrives from -x, leaves toward +x).
//          Hall requirement (local frame): interior from z = -(platformDepth + 0.25) to z = trackZ + 1.75
//          (7.75 m deep across the track at the defaults) and >= 7 m clear on both sides of the marker along x
//          (tunnel mouths at the end walls; 26-36 m halls look best). Declare the hall before the extract so
//          the collision fits too. face = Math.PI puts the track along the far (north) wall: the car's doors
//          then face the camera and the near wall/earth never hides it.
// Triangles: see tools/extractgallery.html (window.__stats).
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
  rd: 0xa32c1e, rd2: 0x701c14, w0: 0xdcd5c2, w1: 0xb3ad9b,
  t0: 0x2f6866, t1: 0x234f4d, t2: 0x41837f,
  m0: 0xcfc4a6, m1: 0xb5aa8c, m2: 0x9a907a,       // faded cream (metro car)
  p0: 0xa25a3e, p1: 0x8a4a33, p2: 0xb86c4c,       // faded red-orange (metro car)
  g0: 0x46503f, g1: 0x37402f, g2: 0x5a6650,       // olive (hatch lid)
  weld: 0x6a6158, weld2: 0x9a8c78, glass: 0x1c2a33, glass2: 0x3c5664, seat: 0xb85a26, seat2: 0x8f4420,
};
// glow channels: voxels in these colours go to per-rig meshes whose material colour animates
const G = {
  BEA: 0xfefefe, BEA2: 0x8f8f8f, SCR: 0xfdfdfd, SCR2: 0x6d6d6d, LITE: 0xfcfcfc, RDY: 0xfbfbfb, XL: 0xfafafa,
  SEG: 0xf9f9f9, HA: 0xf8f8f8, HB: 0xf7f7f7, WIN: 0xf6f6f6, WIN2: 0xa0a0a0, LOCK: 0xf5f5f5, EDGE: 0xf4f4f4, SIG: 0xf3f3f3,
  STAT: 0xf2f2f2, DEP: 0xf1f1f1, DIG: 0xf0f0f0, ENG: 0xefefef, DOOR: 0xeeeeee,
};
const CHANNELS = {
  beacon: [G.BEA, G.BEA2], screen: [G.SCR, G.SCR2], lite: [G.LITE], ready: [G.RDY], xlamp: [G.XL], seg: [G.SEG],
  headA: [G.HA], headB: [G.HB], win: [G.WIN, G.WIN2], lock: [G.LOCK], edge: [G.EDGE], sig: [G.SIG],
  status: [G.STAT], depart: [G.DEP], digit: [G.DIG], eng: [G.ENG], door: [G.DOOR],
};
const CH_OF = new Map();
for (const [k, cs] of Object.entries(CHANNELS)) for (const c of cs) CH_OF.set(c, k);
const SG = { red: 0xff3c22, amber: 0xffb43c, dest: 0xffc25a, green: 0x46ff7a, white: 0xfff4dc };   // static glows
const COL = { amber: 0xffa21c, orange: 0xff5a12, green: 0x3cff6e, white: 0xfff1dc, red: 0xff2a18, warm: 0xffcf96, blue: 0x8fd8ff, engine: 0xff8a2a };

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

// Rig materials: litVox clones whose fragment stage also honours, per material group, a dithered fade
// (roofs), a height cut (walls above your waist while you are inside) and a clip range along the rig's
// local x axis (the metro car never renders past the tunnel mouths).
const XR_PARS = 'uniform float uFade; uniform float uCutY; uniform vec4 uClipA; uniform vec2 uClipX;\n';
const XR_CLIP = /* glsl */`
  {
    if (vWPos.y > uCutY) discard;
    vec2 xrd = vWPos.xz - uClipA.xy;
    float xrx = xrd.x * uClipA.z - xrd.y * uClipA.w;
    if (xrx < uClipX.x || xrx > uClipX.y) discard;
    if (uFade < 0.999 && dwBayer4(gl_FragCoord.xy) >= uFade) discard;
  }`;
function groupMat(cutaway, U) {
  const src = litVox({ xray: true, cutaway }), m = src.clone();
  m.vertexColors = true; m.defines = { ...(src.defines || {}) };
  m.onBeforeCompile = (sh) => {
    src.onBeforeCompile(sh);
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = sh.fragmentShader.replace('void main() {', XR_PARS + 'void main() {')
      .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + XR_CLIP);
  };
  const key = src.customProgramCacheKey() + '|xr';
  m.customProgramCacheKey = () => key;
  return m;
}

// zone decal: pixel-snapped dashed circle (or rectangle around a cabin) + edge ticks + countdown sweep +
// dithered fill; additive, cut away like the world
const DECAL_VS = /* glsl */`
  varying vec2 vL; varying vec3 vW;
  void main(){ vL = position.xz; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const BAYER = /* glsl */`
  float bay(vec2 p){ ivec2 i = ivec2(mod(p, 4.0)); int k = i.x + i.y * 4;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    for (int j = 0; j < 16; j++) { if (j == k) return m[j] / 16.0; } return 0.0; }`;
const DECAL_FS = /* glsl */`
  uniform vec3 uCol; uniform float uA; uniform float uR; uniform vec2 uHalf; uniform float uSeg; uniform float uPh;
  uniform float uFill; uniform float uDim; uniform float uInner; uniform float uTicks;
  uniform vec4 uCut; uniform vec4 uCutR; uniform float uCutH;
  varying vec2 vL; varying vec3 vW;
  ${BAYER}
  void main(){
    vec2 cd = vW.xz - uCutR.xy;
    vec2 cl = uCutR.xy + vec2(cd.x * uCutR.z + cd.y * uCutR.w, -cd.x * uCutR.w + cd.y * uCutR.z);
    if (cl.x > uCut.x && cl.x < uCut.z && cl.y > uCut.y && cl.y < uCut.w && vW.y > uCutH) discard;
    vec2 q = (floor(vL * 16.0) + 0.5) / 16.0;
    float d = uHalf.x > 0.0 ? max(abs(q.x) - uHalf.x, abs(q.y) - uHalf.y) : length(q) - uR;
    if (d > 0.1) discard;
    float a = fract(atan(q.x, q.y) / 6.2831853);
    float edge = step(abs(d + 0.06), 0.07);
    float dash = step(fract(a * uSeg - uPh), 0.6);
    float lit = a < uFill ? 1.0 : uDim;
    float tick = 0.0;
    if (uTicks > 0.0) {
      float arc = abs(fract(a * uTicks + 0.5) - 0.5) * 6.2831853 / uTicks * length(q);
      tick = step(arc, 0.07) * step(-0.62, d) * step(d, -0.24);
    }
    float inner = uInner * step(d, -0.14) * step(bay(gl_FragCoord.xy), 0.49);
    float v = ((edge * dash + tick * 0.8) * lit + inner) * uA;
    if (v < 0.02) discard;
    gl_FragColor = vec4(uCol, v);
  }`;
function decalMesh({ r = 0, hw = 0, hd = 0, ticks = 0 } = {}) {
  const geo = new THREE.PlaneGeometry(2 * (hw || r) + 0.6, 2 * (hd || r) + 0.6); geo.rotateX(-Math.PI / 2);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uCol: { value: new THREE.Color(1, 1, 1) }, uA: { value: 0 }, uR: { value: r }, uHalf: { value: new THREE.Vector2(hw, hd) },
      uSeg: { value: hw > 0 ? Math.round((hw + hd) * 4) : Math.max(8, Math.round(r * 8)) }, uPh: { value: 0 }, uFill: { value: 1 },
      uDim: { value: 1 }, uInner: { value: 0 }, uTicks: { value: ticks }, uCut: GU.uCut, uCutR: GU.uCutR, uCutH: GU.uCutH,
    },
    vertexShader: DECAL_VS, fragmentShader: DECAL_FS,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8,
  });
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = 7; m.name = 'zone'; m.userData.ph = 0;
  return m;
}
// dropship winch beam: additive open cylinder with bands rising up it (the "pull")
function beamMesh() {
  const geo = new THREE.CylinderGeometry(1, 1, 1, 14, 1, true); geo.translate(0, 0.5, 0);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(COL.blue) }, uA: { value: 0 }, uTime: GU.uTime },
    vertexShader: /* glsl */`varying float vH; varying float vWy; void main(){ vH = position.y; vec4 w = modelMatrix * vec4(position, 1.0); vWy = w.y; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform vec3 uCol; uniform float uA; uniform float uTime; varying float vH; varying float vWy;
      ${BAYER}
      void main(){
        float band = step(0.55, fract(vWy * 1.6 - uTime * 2.2));
        float a = uA * (0.22 + 0.4 * band) * (0.35 + 0.65 * (1.0 - vH));
        if (bay(gl_FragCoord.xy) >= a * 1.8) discard;
        gl_FragColor = vec4(uCol, a);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(geo, mat); m.renderOrder = 8; m.name = 'zone';
  return m;
}

// ----------------------------------------------------------------------------- shared small parts
const hazD = (a, b) => (((a + b) >> 1) & 1 ? C.bk : C.y0);     // diagonal hazard stripes (2-voxel bands)
function beaconVox() {
  const v = new XB(0.0625, -0.25, 0, -0.25, 0.25, 0.5, 0.25);
  v.cylY(0, 0, 0, 0.125, 0.22, C.k2);
  v.cylY(0, 0, 0.125, 0.375, 0.17, (X, Y, Z, i, j) => ((j & 1) ? G.BEA2 : G.BEA));
  v.cylY(0, 0, 0.375, 0.4375, 0.125, C.k2);
  return v;
}
function ropeVox() { const v = new XB(0.0625, -0.03125, 0, -0.03125, 0.03125, 1, 0.03125); v.box(-1, 0, -1, 1, 1, 1, C.k3); return v; }
// red X glyph (offline) over a w x h voxel screen whose lower-left front corner is (x0, y0, z0)
function xGlyphVox(x0, y0, z0, w, h, s) {
  const v = new XB(s, x0, y0, z0, x0 + w * s, y0 + h * s, z0 + s);
  v.box(x0, y0, z0, x0 + w * s, y0 + h * s, z0 + s, (X, Y, Z, i, j) => (Math.abs(i * (h - 1) / (w - 1) - j) < 0.6 || Math.abs((w - 1 - i) * (h - 1) / (w - 1) - j) < 0.6 ? G.XL : undefined));
  return v;
}
function tapeVox(x0, x1, y0, y1, z) {    // two crossing hazard tapes in the plane z
  const v = new XB(0.0625, x0 - 0.125, y0 - 0.125, z - 0.0625, x1 + 0.125, y1 + 0.125, z + 0.0625);
  const c = (X, Y, Z, i) => ((i >> 2) & 1 ? C.bk : C.y0);
  v.seg(x0, y1, z + 0.03125, x1, y0, z + 0.03125, 0.07, c);
  v.seg(x0, y0, z + 0.03125, x1, y1, z + 0.03125, 0.07, c);
  return v;
}
// 3x5 pixel digits for the countdown displays (lit glyph + a dim '88' ghost one voxel behind)
const GLYPH = {
  0: ['XXX', 'X.X', 'X.X', 'X.X', 'XXX'], 1: ['.X.', 'XX.', '.X.', '.X.', 'XXX'], 2: ['XXX', '..X', 'XXX', 'X..', 'XXX'],
  3: ['XXX', '..X', '.XX', '..X', 'XXX'], 4: ['X.X', 'X.X', 'XXX', '..X', '..X'], 5: ['XXX', 'X..', 'XXX', '..X', 'XXX'],
  6: ['XXX', 'X..', 'XXX', 'X.X', 'XXX'], 7: ['XXX', '..X', '.X.', '.X.', '.X.'], 8: ['XXX', 'X.X', 'XXX', 'X.X', 'XXX'],
  9: ['XXX', 'X.X', 'XXX', '..X', 'XXX'], '-': ['...', '...', 'XXX', '...', '...'], X: ['X.X', 'X.X', '.X.', 'X.X', 'X.X'],
};
function digitVox(ch, s) { const v = new XB(s, 0, 0, 0, 3 * s, 5 * s, s); v.glyph(GLYPH[ch] || GLYPH[8], 0, 5 * s, 0, s, G.DIG); return v; }
function digitGhostVox(s) { const v = new XB(s, 0, 0, 0, 7 * s, 5 * s, s); v.glyph(GLYPH[8], 0, 5 * s, 0, s, 0x2a1e18); v.glyph(GLYPH[8], 4 * s, 5 * s, 0, s, 0x2a1e18); return v; }
const two = (n) => String(clamp(Math.ceil(n), 0, 99)).padStart(2, '0');

// ============================================================================= ELEVATOR (bunker)
// B outer half-width at the base, BT at the wall top, H wall top / roof underside, RT roof top, I shaft
// (cabin) half-width, DW / DH doorway half-width / height
const EB = { B: 3.75, BT: 3.125, H: 3.375, RT: 3.75, I: 2.25, DW: 1.25, DH: 2.625, DROP: 3.6, RISE: 6 };
const EL_PTS = { call: [3.125, 5.65], callR: 1.8, departs: [[1.6, -1.35], [-1.6, -1.35]], entry: [0, 4.6], cabin: { shape: 'rect', cx: 0, cz: 0, hw: 2.05, hd: 2.05, y: 0 } };
function elShellVox() {
  const { B, BT, H, I, DW, DH } = EB, outer = (Y) => B - (Y / H) * (B - BT);
  const v = new XB(0.125, -3.875, 0, -3.875, 3.875, 3.5, 5.25);
  v.fillIf(-B, 0, -B, B, H, B, (X, Y, Z) => {
    const m = Math.max(Math.abs(X), Math.abs(Z));
    return m <= outer(Y) && m >= I && !(Math.abs(X) < DW && Z > 0 && Y < DH);
  }, (X, Y, Z, i, j, k) => {
    const ax = Math.abs(X), m = Math.max(ax, Math.abs(Z));
    if (Z > I - 0.01 && ax < DW + 0.25 && Y < DH + 0.25) return Y >= DH ? hazD(i, j) : C.s1;          // steel door frame + hazard lintel
    if (m < I + 0.13) return Math.abs(ax - 1.25) < 0.07 || Math.abs(Math.abs(Z) - 1.25) < 0.07 ? C.s1 : C.c0;   // shaft walls + guide rails
    if (Y < 0.25) return C.c0;
    if (Y >= 2.75 && Y < 3.0) return ((i + k) >> 2) & 1 ? C.o1 : C.o2;                                    // faded orange band
    if (j % 4 === 0) return C.c0;                                                                           // formwork lines
    return hash3(i >> 1, j >> 3, k >> 1, 21) < 0.18 ? C.c2 : C.c1;                                           // weather streaks
  });
  v.box(-0.5, 2.75, 3.0, 0.5, 3.375, 3.375, C.k1);                                     // countdown display bezel over the door
  v.box(-DW, 0, I, DW, 0.125, B, (X, Y, Z, i, j, k) => hazD(i, k));                   // threshold
  v.box(-1.5, 0, B, 1.5, 0.125, 5.25, (X, Y, Z) => {                                    // apron with boarding chevrons
    const c1 = Math.abs(Z - 4.0 - Math.abs(X) * 0.6), c2 = Math.abs(Z - 4.75 - Math.abs(X) * 0.6);
    return c1 < 0.13 || c2 < 0.13 ? C.y0 : Math.abs(X) > 1.375 ? C.y1 : C.c0;
  });
  v.box(-EB.I, 0, -EB.I, EB.I, 0.125, EB.I, (X, Y, Z) => {                             // shaft top while the car is down
    const rail = Math.abs(Math.abs(X) - 1.25) < 0.07;
    if (Z < -1.875) return rail ? C.s2 : C.k3;
    if (Z < -1.5) return rail ? C.s0 : C.k2;
    if (Math.abs(X) > 1.875) return Math.abs(Z) < 0.07 ? C.s0 : C.k2;
    return Z < -0.75 ? C.k1 : C.k0;
  });
  return v;
}
function elRoofVox() {
  const { H, RT } = EB;
  const v = new XB(0.125, -3.375, H, -3.375, 3.375, 6.25, 3.375);
  v.box(-3.25, H, -3.25, 3.25, RT, 3.25, (X, Y, Z, i, j, k) => {
    if (Y < RT - 0.125) return C.c1;
    if (Math.max(Math.abs(X), Math.abs(Z)) > 3.0) return Z > 3.0 ? hazD(i, k) : C.c1;
    return i % 8 === 0 || k % 8 === 0 ? C.c0 : C.c2;
  });
  v.box(-3.25, RT, -3.25, 3.25, RT + 0.125, 3.25, (X, Y, Z) => (Math.max(Math.abs(X), Math.abs(Z)) > 3.125 ? C.c1 : undefined));   // parapet
  v.box(-1.25, RT, -2.875, 1.25, RT + 0.75, -1.375, (X, Y, Z, i, j) => (Y > RT + 0.625 ? C.s2 : (j & 1) && Z > -1.5 ? C.k2 : C.s1));   // hoist house
  v.box(1.5, RT, -0.5, 2.5, RT + 0.375, 0.5, (X, Y, Z, i) => (i % 2 ? C.s3 : C.k3));                                                  // vent
  v.box(-2.875, RT, -2.875, -2.625, RT + 2.25, -2.625, C.s1);                                                                          // antenna mast
  v.box(-2.875, RT + 2.25, -2.875, -2.625, RT + 2.375, -2.625, SG.red);
  return v;
}
function elDoorVox() {   // right leaf, x [0, 1.25); the left leaf is mirrored
  const v = new XB(0.125, 0, 0, 0, 1.25, EB.DH, 0.25);
  v.box(0, 0, 0, 1.25, EB.DH, 0.25, (X, Y, Z, i, j) => {
    if (X < 0.125) return C.y0;
    if (Y < 0.5) return hazD(i, j);
    if (Y > 1.5 && Y < 1.875 && X > 0.375 && X < 0.875) return Z > 0.125 ? C.glass2 : C.glass;
    if (i % 4 === 2 && j % 6 === 3) return C.s4;
    return C.s2;
  });
  return v;
}
function elCarVox() {
  const v = new XB(0.125, -2.25, -0.25, -2.25, 2.25, 2.75, 2.25);
  v.box(-2.125, 0.125, -2.125, 2.125, 0.25, 2.125, (X, Y, Z, i, j, k) => {      // deck: LED edge, hazard band, grate
    const m = Math.max(Math.abs(X), Math.abs(Z));
    if (m > 2.0) return G.EDGE;
    if (m > 1.75) return hazD(i, k);
    return i % 3 === 0 || k % 3 === 0 ? C.s3 : C.k2;
  });
  v.box(-2.125, -0.25, -2.125, 2.125, 0.125, 2.125, (X, Y, Z) => (Math.max(Math.abs(X), Math.abs(Z)) > 1.875 || (Y < 0 && (Math.abs(X) < 0.125 || Math.abs(Z) < 0.125)) ? C.s0 : undefined));
  const wall = (Y, along) => (Y >= 2.5 ? G.EDGE : Y >= 2.375 || Y < 0.5 ? C.s1 : (along & 1) ? C.k3 : C.s2);
  v.box(-2.125, 0.25, -2.25, 2.125, 2.625, -2.125, (X, Y, Z, i) => wall(Y, i));
  for (const sx of [-1, 1]) { const x0 = sx > 0 ? 2.125 : -2.25; v.box(x0, 0.25, -2.25, x0 + 0.125, 2.625, 2.125, (X, Y, Z, i, j, k) => wall(Y, k)); }
  v.box(-2.25, 2.5, 2.0, 2.25, 2.625, 2.125, G.EDGE);                            // front header LED (the car front is open)
  for (const sx of [-1, 1]) {                                                     // corner booths: half wall, console, lever
    const xw = sx > 0 ? 1.125 : -1.25;
    v.box(xw, 0.25, -2.125, xw + 0.125, 1.375, -1.125, (X, Y, Z, i, j, k) => (Y >= 1.25 ? hazD(j, k) : C.s2));
    v.box(sx > 0 ? 1.5 : -2.0, 0.25, -2.125, sx > 0 ? 2.0 : -1.5, 1.125, -1.75, (X, Y) => (Y > 1.0 ? C.y1 : C.s1));
    v.box(sx > 0 ? 1.625 : -1.875, 1.125, -2.0, sx > 0 ? 1.875 : -1.625, 1.5, -1.875, G.DEP);
  }
  v.box(-0.5, 1.5, -2.125, 0.5, 2.25, -2.0, C.k1);                               // display bezel
  v.box(-1.0, 2.375, -2.125, 1.0, 2.5, -2.0, G.LITE);                            // light bar
  return v;
}
function elGantryVox() {
  const x0 = 2.625, x1 = 3.625, z0 = 4.0, z1 = 5.0;
  const v = new XB(0.0625, 2.5, 0, 3.875, 3.75, 3.625, 5.25);
  for (const px of [x0, x1 - 0.125]) for (const pz of [z0, z1 - 0.125]) v.box(px, 0, pz, px + 0.125, 3.0, pz + 0.125, (X, Y, Z, i, j) => (Y < 0.5 ? hazD(i, j) : C.y1));
  for (const px of [x0 + 0.0625, x1 - 0.0625]) { v.seg(px, 0.4, z0 + 0.06, px, 2.9, z1 - 0.06, 0.05, C.y2); v.seg(px, 0.4, z1 - 0.06, px, 2.9, z0 + 0.06, 0.05, C.y2); }
  v.seg(x0 + 0.06, 0.4, z0 + 0.0625, x1 - 0.06, 2.9, z0 + 0.0625, 0.05, C.y2);
  v.box(x0, 3.0, z0, x1, 3.125, z1, C.s2);                                        // top deck
  v.cylY(3.125, 4.5, 3.125, 3.25, 0.19, C.k2);                                     // status light
  v.cylY(3.125, 4.5, 3.25, 3.5, 0.15, G.STAT);
  v.cylY(3.125, 4.5, 3.5, 3.5625, 0.1, C.k2);
  v.box(2.75, 0.875, 4.8125, 3.5, 1.75, 5.0, (X, Y) => (Y > 1.6875 || Y < 0.9375 ? C.y0 : C.s1));   // call panel
  v.box(2.875, 1.3125, 5.0, 3.25, 1.625, 5.0625, (X, Y, Z, i, j) => (j & 1 ? G.SCR : G.SCR2));
  v.cylZ(3.375, 1.125, 5.0, 5.0625, 0.09, G.RDY);                                  // call button
  v.box(2.5625, 1.0, 3.875, 2.6875, 1.125, 4.0, C.k3);                             // conduit to the bunker
  return v;
}
function buildElevator(R) {
  const S = {
    shell: gset('el_shell', elShellVox), roof: gset('el_roof', elRoofVox), door: gset('el_door', elDoorVox), car: gset('el_car', elCarVox),
    gantry: gset('el_gantry', elGantryVox), beacon: gset('beacon', beaconVox), xg: gset('el_x', () => xGlyphVox(2.875, 1.3125, 5.0625, 6, 5, 0.0625)),
    tape: gset('el_tape', () => tapeVox(-1.25, 1.25, 0.4, 2.3, 3.5)),
  };
  R.addGroup('shell'); R.addGroup('roof');
  R.part(S.shell, R.root, 0, 0, 0, { group: 'shell' });
  R.part(S.roof, R.root, 0, 0, 0, { group: 'roof' });
  R.beacons = [-1, 1].map((sx, b) => R.part(S.beacon, R.root, sx * 2.75, EB.RT + 0.125, 2.75, { group: 'roof', remap: { beacon: b ? 'beacon2' : 'beacon' } }));
  R.doorR = R.part(S.door, R.root, 0, 0, EB.I + 0.125, { group: 'shell' });
  R.doorL = R.part(S.door, R.root, 0, 0, EB.I + 0.125, { group: 'shell' }); R.doorL.scale.x = -1;
  R.car = R.g(R.root); R.part(S.car, R.car, 0, 0, 0, { group: 'shell' });
  R.part(S.gantry); R.xg = R.part(S.xg); R.tape = R.part(S.tape);
  R.disps = [R.display(R.root, -0.35, 2.8125, 3.375, 0.1, 0, 'shell'), R.display(R.car, -0.35, 1.625, -2.0, 0.1, 0, 'main')];
  R.zone = R.addDecal({ hw: 2.05, hd: 2.05 }, R.car, 0, 0.28, 0);
  R.callDec = R.addDecal({ r: 0.55 }, R.root, EL_PTS.call[0], 0.04, EL_PTS.call[1]);
  R.anim = animElevator; R.carryFn = carryElevator;
}
function animElevator(R, dt, st, t, el, ctx) {
  const T = R.time, fx = ctx.near !== false ? ctx.fx : null, off = st === 'offline', blink = (hz) => (T * hz) % 1 < 0.5;
  // car rises over the last RISE s of the call, waits through open + closing (doors grind shut over the
  // 10 s), drops away when gone
  let cy = -EB.DROP, doors = 0;
  if (st === 'called' && t < EB.RISE) { const u = t / EB.RISE; cy = -EB.DROP * u * u; }
  else if (st === 'open') { cy = 0; doors = ease(sat((el - 0.3) / 1.4)); }
  else if (st === 'closing') { cy = 0; doors = ease(sat((t - 0.4) / 9.0)); }
  else if (st === 'gone') { const u = sat((el - 0.6) / 4.6); cy = -EB.DROP * u * u; }
  cy = R.follow('cy', cy, dt); doors = R.follow('doors', doors, dt);
  R.car.position.y = cy; R.car.visible = cy > -2.9; R.carY = cy;
  R.doorR.position.x = 1.3 * doors; R.doorL.position.x = -1.3 * doors;
  R.tape.visible = R.xg.visible = off;
  // roof dithers to 62 % so you can peek in, vanishes while you are inside (walls cut above your waist)
  const v = R.viewLocal(ctx), inside = v && Math.abs(v.x) < EB.I + 0.3 && v.z > -EB.I - 0.3 && v.z < EB.B + 0.4 && v.y < EB.H;
  R.setFade('roof', inside ? 0 : v && v.y > EB.RT - 0.3 ? 1 : 0.62, dt);
  R.setCut('shell', inside ? ctx.viewer.y + 1.3 : 999); R.setCut('roof', inside ? ctx.viewer.y + 1.3 : 999);
  // roof beacons: rotating reflectors flash toward the camera; spots sweep while called / closing
  const spin = st === 'called' || st === 'closing' ? 7.5 : st === 'open' ? 2.2 : 0;
  R.spin = (R.spin || 0) + dt * spin;
  const yaw = R.root.rotation.y;
  for (let b = 0; b < 2; b++) {
    const a = R.spin + b * Math.PI, flash = Math.pow(Math.max(0, Math.cos(a + yaw)), 4), ch = b ? 'beacon2' : 'beacon', bx = (b ? 1 : -1) * 2.75;
    if (st === 'called' || st === 'closing') { R.col(ch, st === 'closing' ? COL.red : COL.orange, 0.45 + 1.3 * flash); R.spot(ctx, bx, EB.RT + 0.45, 2.75, a, 0.5, st === 'closing' ? 0xff3018 : 0xff6a1c, 2.2, 15, 1.4); }
    else if (st === 'open') R.col(ch, COL.green, 0.85 + 0.35 * flash);
    else if (st === 'gone') R.col(ch, COL.amber, 0.2 + 0.25 * Math.pow(Math.sin(T * 2.4), 2));
    else R.col(ch, COL.amber, off ? 0.04 : 0.1);
  }
  R.stateLamps(st, t, T);
  const lite = st === 'open' ? 1.3 : st === 'closing' ? (blink(2) ? 1.1 : 0.5) : st === 'called' && t < 1.5 ? (1.5 - t) / 1.5 * 1.3 : 0.12;
  R.col('lite', st === 'closing' ? COL.red : COL.white, lite);
  R.col('edge', st === 'closing' ? COL.red : st === 'open' ? COL.green : COL.amber, st === 'open' ? 1.2 : st === 'closing' ? (blink(3) ? 1.4 : 0.3) : st === 'called' ? 1.0 : st === 'gone' ? 0.5 * (1 - sat(el / 4)) : 0.1);
  // lights
  if (st === 'idle') R.light(ctx, 3.125, 3.45, 4.5, COL.green, 0.55, 3.5, 1.0);
  else if (st === 'called') { if (blink(2)) R.light(ctx, 3.125, 3.45, 4.5, COL.amber, 0.7, 4, 1.1); if (cy > -1.6) R.light(ctx, 0, cy + 1.4, 0, COL.amber, 0.9, 5, 1.3); }
  else if (st === 'open') { R.light(ctx, 0, 2.3, 0, COL.white, 1.9, 6.5, 1.5); R.light(ctx, 0, 1.4, 3.6, COL.white, 0.9, 5, 1.2); }
  else if (st === 'closing') R.light(ctx, 0, 2.3, 0, COL.red, blink(2) ? 1.7 : 0.6, 6.5, 1.5);
  else if (off) R.light(ctx, 3.125, 1.4, 5.3, COL.red, 0.5, 2.6, 0.9);
  // sparks off the guide rails while the car runs, dust when it lands / as the doors seal
  if (fx && ((st === 'called' && t < EB.RISE && t > 0.3) || (st === 'gone' && el > 0.6 && el < 5))) {
    if (Math.random() < dt * 6) { const sx = Math.random() < 0.5 ? -1 : 1, p = R.w(sx * 2.1, 0.3, -2.0 + Math.random() * 4.0); fx.sparks(p.x, p.y, p.z, 3, 0xffc070, 2.5); }
  }
  if (fx && st === 'open' && R.prev === 'called' && el < 0.1 && R.once('land')) R.dust(fx, 2.2, 22, 0, 0);
  if (fx && st === 'closing' && t < 0.5 && R.once('seal')) R.dust(fx, 1.0, 14, 0, 3.4);
  // sound cues: alarm cycles while it comes, winch, closing sequence, door slam, departure
  if (st === 'called' && t > EB.RISE + 0.3) R.cue(ctx, 'klax' + Math.floor((R.callDur() - t) / 4), 'extract_klaxon');
  if (st === 'called' && t < EB.RISE + 0.3) R.cue(ctx, 'rise', 'elevator_rise');
  if (st === 'closing' && el < 0.3) R.cue(ctx, 'close', 'extract_close_seq');
  if (st === 'closing' && t < 1.45) R.cue(ctx, 'slam', 'elevator_door');
  if (st === 'gone' && el > 0.6) R.cue(ctx, 'drop', 'elevator_depart');
  R.decals(st, t, el, dt);
}
function carryElevator(R, age) { const dy = Math.min(0, R.carY ?? 0); return { dx: 0, dy, dz: 0, hide: dy < -2.3 || age > 9 }; }

// ============================================================================= RAIDER HATCH
const HATCH_PTS = { call: [0, 0], callR: 2.4, departs: [], depart: null, entry: [0, 1.5], cabin: { shape: 'circle', cx: 0, cz: 0, r: 0.95, y: 0 } };
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
  v.box(0.75, 0.6875, 0.8125, 0.875, 0.75, 0.875, C.k0);
  v.box(0.75, 0.8125, 0.8125, 0.875, 0.875, 0.875, G.LOCK);
  v.box(0.75, 0.9375, 0.625, 0.875, 1.0, 0.75, G.LOCK);
  return v;
}
function hatchLidVox() {          // hinge frame: pivot at the back edge, lid centre at z = 0.625
  const v = new XB(0.0625, -0.6875, -0.125, -0.125, 0.6875, 0.125, 1.3125);
  const cz = 0.625;
  v.cylY(0, cz, -0.125, 0, 0.6, (X, Y, Z, i, j, k) => {
    const dz = Z - cz, d = Math.hypot(X, dz), a = Math.atan2(X, dz), fa = (((a / (TAU / 12)) % 1) + 1) % 1;
    if (d > 0.53) return C.s2;
    if (Math.abs(d - 0.47) < 0.035 && (fa < 0.15 || fa > 0.85)) return C.s4;
    if (Math.abs(dz - 0.47 + Math.abs(X) * 0.85) < 0.045 && Math.abs(X) < 0.2) return C.y0;
    if (dz < -0.4 && dz > -0.47 && Math.abs(X) < 0.22 && (i & 1)) return C.y0;
    return hash3(i, j, k, 4) < 0.1 ? C.g1 : C.g0;
  });
  v.cylY(0, cz, 0, 0.0625, 0.375, (X, Y, Z) => (Math.hypot(X, Z - cz) > 0.31 ? C.g2 : C.g1));
  v.box(-0.3125, -0.125, -0.125, 0.3125, -0.0625, 0.1875, C.s3);
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
  v.cylY(0, 0, 0.1875, 0.25, 0.68, (X, Y, Z, i, j, k) => (hash3(i, 0, k, 2) < 0.3 ? C.weld2 : C.weld), 0.58);
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
  R.zone = R.addDecal({ r: 1.05, ticks: 4 }, R.root, 0, 0.04, 0);
  R.anim = animHatch; R.carryFn = carryHatch;
}
function animHatch(R, dt, st, t, el, ctx) {
  const T = R.time, off = st === 'offline', fx = ctx.near !== false ? ctx.fx : null, isOpen = st === 'open';
  R.weld.visible = R.tape.visible = off;
  // 15 s window: wheel spins, lid swings up (0.6 s), seals again over the last 0.8 s
  let open = isOpen ? ease(sat(el / 0.6)) * (1 - ease(sat((0.9 - t) / 0.8))) : 0;
  open = R.follow('lid', open, dt, 16);
  if ((isOpen && el < 0.6) || (isOpen && t < 0.9)) R.wheel.rotation.y += dt * (el < 0.6 ? 10 : -10);
  R.lid.rotation.x = -1.95 * open;
  if (fx && isOpen) {
    const p = R.w(0, 0.3, 0);
    if (el > 0.3 && R.once('steam')) {
      for (let k = 0; k < 18; k++) { const a = Math.random() * TAU, s = 0.4 + Math.random() * 1.6; fx.parts.emit({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * s, vy: 1.6 + Math.random() * 2.2, vz: Math.sin(a) * s, life: 1.0 + Math.random() * 1.2, size: 6 + Math.random() * 5, size1: 18 + Math.random() * 10, color: 0xdfe4e4, color1: 0x9aa2a4, alpha: 0.6, shape: 1, drag: 1.6 }); }
      fx.sparks(p.x, p.y, p.z, 6, 0xffd090, 3);
    }
    if (el > 0.4 && el < 2.6 && Math.random() < dt * 14) fx.parts.emit({ x: p.x + (Math.random() - 0.5) * 0.6, y: p.y, z: p.z + (Math.random() - 0.5) * 0.6, vy: 1.2 + Math.random(), life: 1.4, size: 5, size1: 14, color: 0xd8dcdc, color1: 0x8a9294, alpha: 0.4, shape: 1, drag: 1 });
  }
  if (isOpen) { R.col('lock', COL.green, 1.4); R.light(ctx, 0.8, 1.0, 0.8, COL.green, 0.9, 4.5, 1.2); if (open > 0.3) R.light(ctx, 0, 0.6, 0.1, 0xd0e0e8, 0.6 * open, 3, 1.0); }
  else if (off) { R.col('lock', COL.red, 1.1); R.light(ctx, 0.8, 1.0, 0.9, COL.red, 0.5, 2.6, 0.9); }
  else { const k = 0.55 + 0.45 * Math.pow(Math.sin(T * 1.6), 8); R.col('lock', COL.red, k + 0.2); R.light(ctx, 0.8, 1.0, 0.9, COL.red, 0.3 * k, 2.0, 0.8); }
  R.decals(st, t, el, dt);
}
function carryHatch(R, age) { return { dx: 0, dy: -Math.min(1.8, age * 3.2), dz: 0, hide: age > 0.55 }; }

// ============================================================================= METRO
// Local frame: platform on -z, track along x at z = T. The car stops at x = 0; the track runs between the
// tunnel mouths at x0 / x1 (the hall's end walls when metroFit finds the hall).
const r8 = (v) => Math.round(v * 8) / 8;
function metroOpts(x) {
  const fit = x?.fit || null, L = x?.trackLen ?? 26;
  const T = r8(clamp(x?.trackZ ?? 3, 2.25, 6));
  const x0 = r8(Math.min(-6.5, x?.trackX0 ?? fit?.x0 ?? -L / 2)), x1 = r8(Math.max(6.5, x?.trackX1 ?? fit?.x1 ?? L / 2));
  const PL = clamp(x?.platformLen ?? 16, 8, 80);
  const px0 = r8(Math.max(x0 + 0.5, -PL / 2)), px1 = r8(Math.min(x1 - 0.5, PL / 2));
  const PB = r8(clamp(x?.platformDepth ?? 2.75, 1.0, fit ? Math.max(1.0, fit.zBack - 0.25) : 12));
  return { T, x0, x1, px0, px1, PB, dir: (x?.trainDir ?? 1) < 0 ? -1 : 1, doors: [-2.75, 2.75], hall: !!fit, key: `${T}_${x0}_${x1}_${px0}_${px1}_${PB}` };
}
// the underground hall (World building with `under`) around a metro marker, in the marker's local frame:
// { x0, x1 } distances to the end walls along the track (negative / positive), zFront (track side), zBack
export function metroFit(x, world) {
  if (!world?.buildings || x?.x == null) return null;
  const f = x.face || 0, c = Math.cos(f), s = Math.sin(f);
  for (const b of world.buildings) {
    if (!b.under) continue;
    const R = b.R, rot = (dx, dz) => (R ? [dx * R.c + dz * R.s, -dx * R.s + dz * R.c] : [dx, dz]);
    const [qx, qz] = R ? [R.cx + (x.x - R.cx) * R.c + (x.z - R.cz) * R.s, R.cz - (x.x - R.cx) * R.s + (x.z - R.cz) * R.c] : [x.x, x.z];
    if (qx < b.x0 || qx > b.x1 || qz < b.z0 || qz > b.z1) continue;
    const th = b.def?.thick || 1.0, ix0 = b.x0 + th, ix1 = b.x1 - th, iz0 = b.z0 + th, iz1 = b.z1 - th;
    const dist = (dx, dz) => {
      const [ex, ez] = rot(dx, dz); let t = 1e9;
      if (ex > 1e-6) t = Math.min(t, (ix1 - qx) / ex); else if (ex < -1e-6) t = Math.min(t, (ix0 - qx) / ex);
      if (ez > 1e-6) t = Math.min(t, (iz1 - qz) / ez); else if (ez < -1e-6) t = Math.min(t, (iz0 - qz) / ez);
      return Math.max(0, t);
    };
    return { x0: -dist(-c, s), x1: dist(c, -s), zFront: dist(s, c), zBack: dist(-s, -c), bid: b.id, name: b.name || null };
  }
  return null;
}
function metroStaticVox(o) {
  const { T, x0, x1, px0, px1, PB } = o, E = T - 1.375, PT = 0.375;
  const v = new XB(0.125, x0 - 0.125, 0, -PB - 0.25, x1 + 0.125, 2.0, T + 2.375);
  v.box(px0, 0, -PB, px1, PT, E, (X, Y, Z, i, j, k) => {                         // platform: tiles, tactile strip, coping + edge lamps
    if (Y < PT - 0.125) return Z > E - 0.125 ? C.c0 : C.c1;
    if (Z >= E - 0.25) return Z < E - 0.125 && Math.abs((((X + 0.5) % 1) + 1) % 1 - 0.5) < 0.07 ? G.EDGE : C.w0;
    if (Z >= E - 0.375) return C.c2;
    if (Z >= E - 0.625) return (i + k) & 1 ? C.y1 : C.y0;
    return i % 4 === 0 || k % 4 === 0 ? C.c0 : ((i >> 2) + (k >> 2)) & 1 ? C.c2 : C.c1;
  });
  v.box(x0, 0, E, x1, 0.125, T + 1.75, (X, Y, Z) => {                             // trackbed, darkening into the mouths
    const dm = Math.min(X - x0, x1 - X);
    if (dm < 1.25) return dm < 0.5 ? C.k0 : C.k1;
    return Math.abs(Z - T) < 0.07 ? C.k2 : Z > T + 1.0 ? C.k3 : C.s0;
  });
  for (let x = x0 + 0.375; x < x1 - 0.5; x += 0.625) v.box(x, 0.125, T - 1.125, x + 0.25, 0.25, T + 1.125, C.c0);
  for (const z0 of [T - 0.875, T + 0.75]) { v.box(x0, 0.125, z0, x1, 0.25, z0 + 0.125, C.s1); v.box(x0, 0.25, z0, x1, 0.375, z0 + 0.125, C.s5); }
  for (let x = x0 + 1; x < x1; x += 2.5) v.box(x, 0.125, T + 1.25, x + 0.125, 0.25, T + 1.375, C.w1);
  v.box(x0, 0.25, T + 1.25, x1, 0.375, T + 1.375, C.s3);
  v.box(x0, 0.375, T + 1.125, x1, 0.5, T + 1.5, (X, Y, Z, i) => ((i >> 3) % 5 === 0 ? C.y2 : C.y1));
  // platform fence with gated openings at the car doors
  const fz = E - 0.375, gaps = o.doors.map((d) => [d - 0.75, d + 0.75]);
  const segs = [[px0, gaps[0][0]], [gaps[0][1], gaps[1][0]], [gaps[1][1], px1]];
  for (const [a, b] of segs) if (b > a) v.box(a, PT, fz, b, PT + 1.0, fz + 0.125, (X, Y, Z, i, j) => (Y >= PT + 0.875 ? hazD(i, j) : Y < PT + 0.125 || i % 8 === 0 ? C.y1 : (i & 1) ? C.s2 : undefined));
  // call terminal against the fence (screen + button face the platform, -z)
  v.box(-0.375, PT, E - 1.0, 0.375, PT + 1.375, E - 0.5, (X, Y, Z) => (Y >= PT + 1.25 ? C.t0 : Z < E - 0.875 && Y > PT + 0.5 ? C.m0 : C.t1));
  v.box(-0.25, PT + 0.75, E - 1.125, 0.25, PT + 1.125, E - 1.0, (X, Y, Z, i, j) => (j & 1 ? G.SCR : G.SCR2));
  v.box(-0.125, PT + 0.5, E - 1.125, 0.125, PT + 0.625, E - 1.0, G.RDY);
  v.box(-0.125, PT + 1.375, E - 0.875, 0.125, PT + 1.5, E - 0.625, G.STAT);
  // benches at the back of the platform, facing the track
  for (const bx of [-4.25, 4.25]) {
    if (bx - 0.75 < px0 || bx + 0.75 > px1) continue;
    const z0 = -PB + 0.375;
    v.box(bx - 0.75, PT + 0.375, z0, bx + 0.75, PT + 0.5, z0 + 0.375, (X, Y, Z, i) => (i & 1 ? C.o0 : C.o1));
    v.box(bx - 0.75, PT + 0.5, z0 - 0.125, bx + 0.75, PT + 0.875, z0, (X, Y, Z, i, j) => (j & 1 ? C.o1 : C.o0));
    for (const lx of [bx - 0.625, bx + 0.5]) v.box(lx, PT, z0 - 0.125, lx + 0.125, PT + 0.375, z0 + 0.375, C.s0);
  }
  return v;
}
function metroPortalVox(o) {   // tunnel mouths at the hall's end walls: concrete frame, dark void, signal lamp
  const { T, x0, x1 } = o, E = T - 1.375;
  const v = new XB(0.125, x0 - 0.75, 0, E - 0.625, x1 + 0.75, 4.0, T + 2.375);
  for (const [xa, sg] of [[x0, 1], [x1, -1]]) {
    const xi = sg > 0 ? xa : xa - 0.375;
    const pil = (X, Y, Z, i, j, k) => (Y < 0.75 ? hazD(j, k) : j % 4 === 0 ? C.c0 : C.c1);
    v.box(xi, 0, E - 0.5, xi + 0.375, 3.75, E, pil);
    v.box(xi, 0, T + 1.75, xi + 0.375, 3.75, T + 2.25, pil);
    v.box(xi, 3.25, E - 0.5, xi + 0.375, 3.75, T + 2.25, (X, Y, Z, i, j, k) => (Y < 3.375 ? C.c0 : C.c1));
    v.box(sg > 0 ? xa - 0.625 : xa, 0, E, sg > 0 ? xa : xa + 0.625, 3.25, T + 1.75, C.k0);
    v.box(xi + 0.125, 2.375, E - 0.625, xi + 0.25, 2.5, E - 0.5, G.SIG);
  }
  return v;
}
function metroSignVox() {   // pole + double-sided departure board (digits added by the rig) + roundel
  const v = new XB(0.0625, -1.125, 0, -0.25, 1.125, 3.375, 0.25);
  v.box(-0.1875, 0, -0.1875, 0.1875, 0.0625, 0.1875, C.s0);
  v.box(-0.0625, 0, -0.0625, 0.0625, 2.5, 0.0625, C.s1);
  v.box(-1.0, 1.875, -0.125, 1.0, 2.5, 0.125, (X, Y) => (Y < 1.9375 || Y >= 2.4375 || Math.abs(X) > 0.9375 ? C.s1 : C.k1));
  v.box(-0.875, 2.375, 0.125, -0.5, 2.4375, 0.1875, (X, Y, Z, i) => (i & 1 ? G.SCR : G.SCR2));
  v.cylZ(0, 2.875, -0.0625, 0.0625, 0.4375, (X, Y) => (Math.hypot(X, Y - 2.875) > 0.3125 ? C.o0 : C.w0));
  for (const [z0, z1] of [[0.0625, 0.125], [-0.125, -0.0625]]) v.glyph(['X...X', 'XX.XX', 'X.X.X', 'X...X', 'X...X'], -0.15625, 3.03125, z0, z1, C.k1);
  return v;
}
function metroCarVox(T) {   // body shell + interior; the roof is metroCarRoofVox (fades while you are inside)
  const v = new XB(0.125, -6.25, 0, T - 1.625, 6.25, 2.75, T + 1.625);
  const zA = T - 1.375, zB = T + 1.375, DOORS = [-2.75, 2.75];
  for (const sx of [-1, 1]) v.box(sx > 0 ? 5.75 : -6.0, 0.375, T - 0.25, sx > 0 ? 6.0 : -5.75, 0.625, T + 0.25, C.k2);   // couplers
  const inBody = (X, Z) => { const ex = Math.abs(X) - 4.875, dz = (Z - T) / 1.375; return !(ex > 0 && ex * ex + dz * dz > 1); };
  const inside = (X, Z) => Math.abs(X) < 5.5 && Math.abs(Z - T) < 1.125;
  v.box(-6, 0.25, zA, 6, 0.375, zB, (X, Y, Z, i, j, k) => (!inBody(X, Z) ? undefined : inside(X, Z) ? ((i + k) % 9 === 0 ? C.s3 : C.s2) : C.s1));   // floor (sits on the rails)
  v.fillIf(-6, 0.25, zA, 6, 2.625, zB, (X, Y, Z) => X >= -6 && X < 6 && Z >= zA && Z < zB && inBody(X, Z) && !inside(X, Z), (X, Y, Z, i, j, k) => {
    const ax = Math.abs(X), fade = vnoise(X * 0.7, Y * 1.3, Z * 0.7, 5) > 0.66;
    if (Y < 1.25) return fade ? C.p2 : C.p0;
    if (Y < 1.375) return C.m0;
    if (Y < 2.25) {
      if (ax > 5.125) return Y > 2.0 ? C.glass2 : C.glass;
      const px = (((X + 6) % 1.5) + 1.5) % 1.5;
      return px < 0.25 ? C.m1 : Y > 2.125 ? G.WIN2 : G.WIN;
    }
    return ax > 5.0 && Y < 2.5 && Math.abs(Z - T) < 0.5 ? SG.dest : fade ? C.m1 : C.m0;
  });
  v.fillIf(-6, 1.0, zA, 6, 1.25, zB, (X, Y, Z) => Math.abs(X) > 5.5 && Math.abs(Math.abs(Z - T) - 0.75) < 0.2, (X, Y, Z, i, j, k, cur) => (cur === -1 ? undefined : X < 0 ? G.HA : G.HB));
  for (const c of DOORS) {
    v.box(c - 0.625, 0.375, zA, c + 0.625, 2.5, zA + 0.25, -1);                                          // platform-side doorway
    v.box(c - 0.625, 0.25, zA, c + 0.625, 0.375, zA + 0.25, C.y1);                                         // yellow threshold
    v.box(c - 0.5, 2.5, zA - 0.125, c + 0.5, 2.625, zA, G.DOOR);                                           // door warning lamp strip
    v.paintBox(c - 0.625, 0.375, zB - 0.125, c + 0.625, 2.5, zB, (X, Y) => (Math.abs(X - c) < 0.07 ? C.k2 : Y > 1.375 && Y < 2.125 && Math.abs(Math.abs(X - c) - 0.3125) < 0.2 ? G.WIN : C.m1));
    v.box(c - 0.0625, 0.375, T - 0.0625, c + 0.0625, 2.625, T + 0.0625, C.y0);                              // grab pole
  }
  // seats along both walls (orange), clear of the doors, the far-wall lever and the cab ends
  const seatSpan = (X) => Math.abs(X) < 5.0 && DOORS.every((d) => Math.abs(X - d) > 0.875);
  v.box(-5.5, 0.375, zA + 0.25, 5.5, 0.75, zA + 0.625, (X, Y, Z, i) => (seatSpan(X) ? (Y > 0.625 ? C.seat : C.seat2) : undefined));
  v.box(-5.5, 0.75, zA + 0.25, 5.5, 1.125, zA + 0.375, (X) => (seatSpan(X) ? C.seat : undefined));
  v.box(-5.5, 0.375, zB - 0.625, 5.5, 0.75, zB - 0.25, (X, Y) => (seatSpan(X) && Math.abs(X) > 0.75 ? (Y > 0.625 ? C.seat : C.seat2) : undefined));
  v.box(-5.5, 0.75, zB - 0.375, 5.5, 1.125, zB - 0.25, (X) => (seatSpan(X) && Math.abs(X) > 0.75 ? C.seat : undefined));
  // departure lever panel on the far wall + cab partitions
  v.box(-0.375, 1.0, zB - 0.375, 0.375, 1.75, zB - 0.25, C.s1);
  v.box(-0.125, 1.25, zB - 0.5, 0.125, 1.625, zB - 0.375, G.DEP);
  for (const sx of [-1, 1]) v.box(sx > 0 ? 5.0 : -5.125, 0.375, zA + 0.25, sx > 0 ? 5.125 : -5.0, 2.5, zB - 0.25, (X, Y, Z) => (Math.abs(Z - T) < 0.375 && Y < 2.125 ? undefined : C.m1));
  return v;
}
function metroCarRoofVox(T) {
  const v = new XB(0.125, -6.25, 2.5, T - 1.625, 6.25, 3.375, T + 1.625);
  const inBody = (X, Z) => { const ex = Math.abs(X) - 4.875, dz = (Z - T) / 1.375; return !(ex > 0 && ex * ex + dz * dz > 1); };
  v.fillIf(-6, 2.625, T - 1.375, 6, 3.0, T + 1.375, (X, Y, Z) => {
    if (!(X >= -6 && X < 6 && inBody(X, Z))) return false;
    const ry = Y - 2.625, rz = Math.max(0, Math.abs(Z - T) - 1.0);
    return (ry / 0.375) ** 2 + (rz / 0.375) ** 2 <= 1;
  }, (X, Y, Z, i, j, k) => ((i + k) % 11 === 0 || vnoise(X * 1.1, 0, Z * 1.1, 8) > 0.72 ? C.s3 : C.s4));
  for (const sx of [-1, 1]) v.box(sx > 0 ? 1.0 : -3.5, 3.0, T - 0.75, sx > 0 ? 3.5 : -1.0, 3.25, T + 0.75, (X, Y, Z, i) => (Y > 3.125 && i % 2 ? C.k3 : C.s3));
  v.paintBox(-0.75, 2.875, T - 0.25, 0.75, 3.0, T + 0.25, C.s2);
  return v;
}
function metroLeafVox() {   // one sliding door leaf, x [0, 0.625), just outside the platform side
  const v = new XB(0.125, 0, 0.375, -0.125, 0.625, 2.5, 0);
  v.box(0, 0.375, -0.125, 0.625, 2.5, 0, (X, Y) => (Y > 1.5 && Y < 2.125 && X > 0.125 && X < 0.5 ? C.glass2 : Y > 1.25 && Y < 1.375 ? C.o0 : C.m1));
  return v;
}
function metroGateVox() {   // fence gate leaf, x [0, 0.75)
  const v = new XB(0.125, 0, 0.375, 0, 0.75, 1.375, 0.125);
  v.box(0, 0.375, 0, 0.75, 1.375, 0.125, (X, Y, Z, i, j) => (Y >= 1.25 ? hazD(i, j) : Y < 0.5 || X < 0.125 ? C.y1 : (i & 1) ? C.s2 : undefined));
  return v;
}
function buildMetro(R) {
  const o = R.o = metroOpts(R.x), E = o.T - 1.375, PT = 0.375;
  R.addGroup('main', { cutaway: false }); R.addGroup('portal'); R.addGroup('car', { cutaway: false, clip: true }); R.addGroup('carroof', { cutaway: false, clip: true });
  R.setClip('car', o.x0, o.x1); R.setClip('carroof', o.x0, o.x1);
  const S = {
    st: gset('m_static' + o.key, () => metroStaticVox(o)), portal: gset('m_portal' + o.key, () => metroPortalVox(o)), sign: gset('m_sign', metroSignVox),
    xg: gset('m_x' + o.T, () => xGlyphVox(-0.25, PT + 0.75, E - 1.25, 4, 3, 0.125)), car: gset('m_car' + o.T, () => metroCarVox(o.T)),
    roof: gset('m_roof' + o.T, () => metroCarRoofVox(o.T)), leaf: gset('m_leaf', metroLeafVox), gate: gset('m_gate', metroGateVox),
  };
  R.part(S.st); R.part(S.portal, R.root, 0, 0, 0, { group: 'portal' });
  R.xg = R.part(S.xg);
  const sx = Math.max(o.px0 + 1.25, -6.25), sz = -o.PB + 0.375;
  R.sign = R.part(S.sign, R.root, sx, PT, sz);
  R.disps = [R.display(R.sign, -0.35, 1.9375, 0.125, 0.1, 0), R.display(R.sign, 0.35, 1.9375, -0.125, 0.1, Math.PI)];
  R.gates = [];
  for (const d of o.doors) for (const s of [-1, 1]) { const g = R.part(S.gate, R.root, d, 0, E - 0.5); if (s < 0) g.scale.x = -1; R.gates.push({ g, base: d, s }); }
  R.car = R.g(R.root);
  R.part(S.car, R.car, 0, 0, 0, { group: 'car' }); R.part(S.roof, R.car, 0, 0, 0, { group: 'carroof' });
  R.leaves = [];
  for (const c of o.doors) for (const s of [-1, 1]) { const base = s < 0 ? c - 0.625 : c; R.leaves.push({ g: R.part(S.leaf, R.car, base, 0, E, { group: 'car' }), base, s }); }
  R.car.visible = false;
  R.zone = R.addDecal({ hw: 5.5, hd: 1.15 }, R.car, 0, PT + 0.03, o.T);
  const cp = extractPoints('metro', R.x).call;
  R.callDec = R.addDecal({ r: 0.55 }, R.root, cp[0], PT + 0.03, cp[1]);
  R.anim = animMetro; R.carryFn = carryMetro;
}
function animMetro(R, dt, st, t, el, ctx) {
  const o = R.o, T = R.time, dir = o.dir, E = o.T - 1.375, PT = 0.375, fx = ctx.near !== false ? ctx.fx : null, blink = (hz) => (T * hz) % 1 < 0.5;
  const startX = dir > 0 ? o.x0 - 6.5 : o.x1 + 6.5, endX = dir > 0 ? o.x1 + 6.5 : o.x0 - 6.5;
  // the car: out of the arrival mouth over the last 7 s of the call (decelerating), doors open, the doors
  // close over the last 2 s of closing, it pulls out through the other mouth
  let tx = null, doors = 0;
  if (st === 'called' && t < 7) { const u = t / 7; tx = startX * u * u; }
  else if (st === 'open') { tx = 0; doors = ease(sat((el - 0.6) / 1.0)); }
  else if (st === 'closing') { tx = 0; doors = 1 - ease(sat((el - 8.0) / 1.6)); }
  else if (st === 'gone') { const u = sat((el - 0.8) / 6.5); tx = u < 1 ? endX * u * u : null; }
  R.car.visible = tx != null; R.carX = tx;
  if (tx != null) R.car.position.x = tx;
  doors = R.follow('doors', doors, dt);
  for (const lf of R.leaves) lf.g.position.x = lf.base + lf.s * 0.6 * doors;
  const gate = R.follow('gate', st === 'open' || (st === 'closing' && el < 9.4) ? 1 : 0, dt, 5);
  for (const gt of R.gates) gt.g.position.x = gt.base + gt.s * 0.75 * gate;
  R.zone.visible = tx === 0;
  const off = st === 'offline';
  R.xg.visible = off;
  // car roof hides + walls cut while you are inside the car
  const v = R.viewLocal(ctx), inCar = tx === 0 && v && Math.abs(v.x) < 5.6 && Math.abs(v.z - o.T) < 1.3 && v.y < 2.6;
  R.setFade('carroof', inCar ? 0 : 1, dt);
  R.setCut('car', inCar ? ctx.viewer.y + 1.25 : 999); R.setCut('carroof', inCar ? ctx.viewer.y + 1.25 : 999);
  // lamps: windows, head/tail lights, door warning lamps, platform edge, signals, terminal, board
  const moving = tx != null && st !== 'open' && st !== 'closing', nk = ctx.L?.isNight ? 0.5 : 1;
  R.col('win', COL.warm, nk * (st === 'open' || st === 'closing' ? 1.15 : moving ? (Math.random() < 0.04 ? 0.4 : 1.0) : 0.9));
  const lead = dir > 0 ? 'headB' : 'headA', tail = dir > 0 ? 'headA' : 'headB';
  R.col(lead, COL.white, 1.5); R.col(tail, COL.red, 1.1);
  R.col('door', COL.amber, st === 'closing' ? (blink(2.5) ? 1.5 : 0.2) : st === 'open' ? 0.7 : 0.15);
  R.col('edge', st === 'called' ? COL.amber : st === 'open' ? COL.green : st === 'closing' ? COL.red : off ? COL.red : COL.white,
    st === 'called' ? (t < 10 ? (blink(2) ? 1.3 : 0.2) : 0.3) : st === 'open' ? 1.1 : st === 'closing' ? (blink(2.5) ? 1.3 : 0.2) : 0.2);
  R.col('sig', st === 'called' ? COL.amber : st === 'open' ? COL.green : COL.red, st === 'idle' ? 0.9 : 1.2);
  R.stateLamps(st, t, T);
  // dynamic lights: tunnel glow before the car shows, headlight + window spill, interior while boarding
  const la = dir > 0 ? Math.PI / 2 : -Math.PI / 2, mouthIn = dir > 0 ? o.x0 : o.x1;
  if (st === 'called' && t >= 7 && t < 16) R.spot(ctx, mouthIn, 1.2, o.T, la, 0.45, COL.white, sat((16 - t) / 9) * 2.0 * (0.85 + 0.15 * Math.random()), 14, 1.3);
  if (tx != null) {
    if (moving) R.spot(ctx, Math.min(o.x1, Math.max(o.x0, tx + dir * 6.1)), 1.15, o.T, la, 0.4, COL.white, 2.6, 18, 1.5);
    R.light(ctx, tx, PT + 1.8, o.T, COL.warm, st === 'open' ? 1.6 : st === 'closing' ? (blink(2.5) ? 1.5 : 0.9) : 0.9, 7, 1.4);
  }
  if (st === 'idle') R.light(ctx, 0, PT + 1.5, E - 1.1, COL.green, 0.45, 2.8, 1.0);
  else if (st === 'called') R.light(ctx, 0, PT + 1.5, E - 1.1, COL.amber, 0.55, 3.2, 1.1);
  else if (off) R.light(ctx, 0, PT + 1.4, E - 1.2, COL.red, 0.5, 3.0, 1.0);
  // sounds: station alarm while it comes, approach rumble + brakes, closing sequence, doors, departure
  if (st === 'called' && t > 10) R.cue(ctx, 'alarm' + Math.floor((R.callDur() - t) / 4), 'extract_metro_alarm');
  if (st === 'called' && t < 10) { R.cue(ctx, 'rumble', 'extract_metro_rumble'); if (t < 7) ctx.shake?.(0.05 * (1 - t / 7)); }
  if (st === 'called' && t < 2.4) R.cue(ctx, 'brake', 'extract_metro_arrive');
  if (st === 'closing' && el < 0.3) R.cue(ctx, 'close', 'extract_close_seq', { pitch: 1.1 });
  if (st === 'closing' && el > 7.9) R.cue(ctx, 'shut', 'elevator_door');
  if (st === 'gone' && el > 0.7) R.cue(ctx, 'depart', 'extract_metro_depart');
  if (fx && moving && Math.abs(tx) < Math.max(-o.x0, o.x1) && Math.random() < dt * 20) {
    const p = R.w(o.px0 + Math.random() * (o.px1 - o.px0), PT + 0.1, E - 0.6 - Math.random() * 0.6);
    fx.parts.emit({ x: p.x, y: p.y, z: p.z, vx: dir * (1 + Math.random() * 2), vy: 0.3 + Math.random() * 0.5, vz: 0, life: 0.9, size: 3, size1: 7, color: 0x8a8274, alpha: 0.4, shape: 1, drag: 1.5 });
  }
  R.decals(st, t, el, dt);
}
function carryMetro(R, age, c) {
  const o = R.o, tx = R.carX;
  if (tx == null || age > 14) return { dx: 0, dy: 0, dz: 0, hide: true };
  const [lx] = toLocal(R.x, c.x, c.z), f = R.x.face || 0;
  const hide = lx + tx < o.x0 + 0.4 || lx + tx > o.x1 - 0.4;
  return { dx: tx * Math.cos(f), dy: 0, dz: -tx * Math.sin(f), hide };
}

// ============================================================================= AIRSHAFT + DROPSHIP
const AS = { O: 2.0, I: 1.5, H: 2.5, DW: 0.875, DH: 2.125, SHIP_Y: 7.2 };
const AS_PTS = { call: [2.6, 3.05], callR: 1.8, departs: [[0, -0.85]], entry: [0, 2.7], cabin: { shape: 'rect', cx: 0, cz: 0, hw: 1.35, hd: 1.35, y: 0 } };
function asHouseVox() {
  const { O, I, H, DW, DH } = AS;
  const v = new XB(0.125, -2.125, 0, -2.125, 2.125, 2.875, 2.25);
  v.fillIf(-O, 0, -O, O, H + 0.125, O, (X, Y, Z) => {
    const m = Math.max(Math.abs(X), Math.abs(Z));
    return m <= O && m >= I && !(Math.abs(X) < DW && Z > 0 && Y < DH);
  }, (X, Y, Z, i, j, k) => {
    const ax = Math.abs(X), az = Math.abs(Z), m = Math.max(ax, az);
    if (Y >= H) return hazD(i, k);
    if (Z > I - 0.01 && ax < DW + 0.25 && Y < DH + 0.25) return C.s1;
    if (m < I + 0.13) return Math.abs(ax - 0.75) < 0.07 || Math.abs(az - 0.75) < 0.07 ? C.s1 : C.k3;
    if (ax > O - 0.25 && az > O - 0.25) return Y < 0.5 ? hazD(j, i + k) : C.s2;
    const along = az > ax ? ax : az;
    if (Y > 0.75 && Y < 2.0 && along < 1.0 && !(Z > 0 && az >= ax)) return j & 1 ? C.k2 : C.s3;
    if (Y < 0.25) return C.c0;
    return j % 4 === 0 ? C.c0 : hash3(i >> 1, j >> 2, k >> 1, 6) < 0.15 ? C.c2 : C.c1;
  });
  v.box(-I, 0, -I, I, 0.125, I, (X, Y, Z, i, j, k) => (Math.max(Math.abs(X), Math.abs(Z)) > 1.25 ? hazD(i, k) : i % 3 === 0 || k % 3 === 0 ? C.s2 : C.k0));
  v.box(-DW, 0, I, DW, 0.125, O, (X, Y, Z, i, j, k) => hazD(i, k));
  v.box(-0.375, 0.875, -I, 0.375, 1.625, -I + 0.125, C.s1);                            // departure lever panel
  v.box(-0.125, 1.0, -I + 0.125, 0.125, 1.5, -I + 0.25, G.DEP);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.box(sx * 1.75 - 0.125, H + 0.125, sz * 1.75 - 0.125, sx * 1.75 + 0.125, H + 0.375, sz * 1.75 + 0.125, G.EDGE);
  v.box(-0.5, DH, O, 0.5, DH + 0.625, O + 0.125, C.k1);                                // display bezel
  return v;
}
function asConsoleVox() {
  const v = new XB(0.0625, 2.25, 0, 2.0, 2.9375, 1.75, 2.625);
  v.box(2.3125, 0, 2.125, 2.875, 0.0625, 2.5, C.s1);
  v.box(2.5, 0.0625, 2.25, 2.625, 0.9375, 2.375, C.s2);
  v.box(2.3125, 0.9375, 2.1875, 2.875, 1.5, 2.4375, (X, Y, Z, i, j) => ((X < 2.375 || X >= 2.8125) && (j >> 1) & 1 ? C.y1 : C.s1));
  v.box(2.25, 1.5, 2.125, 2.9375, 1.5625, 2.5, C.y1);
  v.box(2.375, 1.0625, 2.4375, 2.75, 1.375, 2.5, (X, Y, Z, i, j) => (j & 1 ? G.SCR : G.SCR2));
  v.box(2.5, 0.9375, 2.4375, 2.625, 1.0, 2.5, G.RDY);
  v.box(2.75, 1.5625, 2.25, 2.875, 1.6875, 2.375, G.STAT);
  return v;
}
function dropshipVox() {   // black-and-red VTOL, nose along +x
  const v = new XB(0.125, -3.75, -0.75, -3.875, 3.75, 1.75, 3.875);
  const nose = (X) => (X > 2 ? Math.sqrt(Math.max(0, 1 - ((X - 2) / 1.6) ** 2)) : X < -2.25 ? 1 - (-2.25 - X) / 1.6 * 0.5 : 1);
  v.fillIf(-3.75, -0.75, -1, 3.75, 0.75, 1, (X, Y, Z) => { const k = nose(X), w = 0.875 * k, h = 0.625 * k + 0.05; return w > 0.06 && (Z / w) ** 2 + (Y / h) ** 2 <= 1; },
    (X, Y, Z, i) => {
      if (X > 1.25 && X < 3.2 && Y > 0.15) return Y > 0.45 ? C.glass2 : C.glass;
      if (X >= 3.2) return C.rd;
      if (Math.abs(Z) < 0.2 && Y > 0.45) return C.rd;
      if (Y < -0.35) return C.k1;
      return i % 6 === 0 ? C.k1 : C.k3;
    });
  for (const sz of [-1, 1]) v.fillIf(-3.6, 0.25, sz * 0.625 - 0.0625, -2.4, 1.6, sz * 0.625 + 0.0625, (X, Y) => Y < 0.25 + (X + 3.6) * 1.2 && Y < 1.5, C.rd);   // twin tail fins
  v.box(-0.75, 0, -3.0, 0.75, 0.25, 3.0, (X, Y, Z) => (Math.abs(Z) > 2.25 ? C.rd : C.k2));   // stub wings
  for (const sz of [-1, 1]) {
    v.cylY(0, sz * 3.0, -0.375, 0.5, 0.75, (X, Y) => (Y > 0.25 ? C.rd : C.k2), 0.5);              // ducted-fan nacelles
    v.cylY(0, sz * 3.0, -0.25, -0.125, 0.5, G.ENG);
    v.cylY(0, sz * 3.0, -0.125, 0.0, 0.16, C.s1);
    v.box(-0.125, 0.125, sz * 3.75 - 0.0625, 0.125, 0.25, sz * 3.75 + 0.0625, sz < 0 ? SG.red : SG.green);   // nav lights
  }
  v.box(-0.5, -0.75, -0.375, 0.5, -0.625, 0.375, C.k0);                                      // winch hatch
  v.box(-2.0, 0.6, -0.125, -1.75, 0.75, 0.125, SG.white);                                    // strobe
  return v;
}
function hookVox() { const v = new XB(0.0625, -0.25, 0, -0.25, 0.25, 0.25, 0.25); v.cylY(0, 0, 0, 0.0625, 0.25, C.y0, 0.15); v.box(-0.0625, 0.0625, -0.0625, 0.0625, 0.25, 0.0625, C.s2); return v; }
function buildAirshaft(R) {
  const S = {
    house: gset('as_house', asHouseVox), cons: gset('as_cons', asConsoleVox), xg: gset('as_x', () => xGlyphVox(2.375, 1.0625, 2.5, 6, 5, 0.0625)),
    ship: gset('as_ship', dropshipVox), hook: gset('as_hook', hookVox), rope: gset('rope', ropeVox), tape: gset('as_tape', () => tapeVox(-0.875, 0.875, 0.4, 1.9, 2.125)),
  };
  R.addGroup('shell');
  R.part(S.house, R.root, 0, 0, 0, { group: 'shell' }); R.part(S.cons);
  R.xg = R.part(S.xg); R.tape = R.part(S.tape);
  R.disps = [R.display(R.root, -0.35, 2.1875, 2.125, 0.1, 0, 'shell')];
  R.ship = R.g(R.root); R.part(S.ship, R.ship);
  R.beam = beamMesh(); R.root.add(R.beam);
  R.rope = R.part(S.rope, R.root); R.hook = R.part(S.hook, R.root);
  R.ship.visible = R.beam.visible = R.rope.visible = R.hook.visible = false;
  R.zone = R.addDecal({ hw: 1.35, hd: 1.35 }, R.root, 0, 0.15, 0);
  R.callDec = R.addDecal({ r: 0.55 }, R.root, AS_PTS.call[0], 0.04, AS_PTS.call[1]);
  R.anim = animAirshaft; R.carryFn = carryAirshaft;
}
function animAirshaft(R, dt, st, t, el, ctx) {
  const T = R.time, H = AS.SHIP_Y, fx = ctx.near !== false ? ctx.fx : null, off = st === 'offline', blink = (hz) => (T * hz) % 1 < 0.5;
  // dropship: flies in over the last 8 s of the call, hovers through open + closing, lifts the raiders
  // (first 1.6 s of gone) then climbs away
  let sx = null, sy = H, sz = 0, pitch = 0, roll = 0;
  if (st === 'called' && t < 8) { const u = 1 - t / 8, e = 1 - (1 - u) ** 3; sx = -46 * (1 - e); sy = H + 20 * (1 - e) ** 1.6; sz = -10 * (1 - e); pitch = 0.22 * (1 - e) - 0.12 * Math.sin(Math.PI * e); }
  else if (st === 'open' || st === 'closing') { sx = 0; sy = H + 0.15 * Math.sin(T * 1.6); roll = 0.03 * Math.sin(T * 1.1); }
  else if (st === 'gone') { const u = sat((el - 1.6) / 6.0); if (u < 1) { sx = 52 * u * u; sy = H + 0.15 * Math.sin(T * 1.6) + 22 * u ** 1.5; sz = 8 * u * u; pitch = -0.2 * sat(u * 4); } }
  R.ship.visible = sx != null;
  if (sx != null) { R.ship.position.set(sx, sy, sz); R.ship.rotation.set(roll, 0, pitch); }
  R.shipY = sy;
  // winch beam + line: lowered while it waits, brightening as it departs, the pull in the first 1.6 s of gone
  const hover = sx === 0 || (st === 'gone' && el < 1.6);
  let ba = st === 'open' ? 0.45 : st === 'closing' ? 0.5 + 0.35 * (1 - t / 10) + (blink(3) ? 0.1 : 0) : st === 'gone' && el < 1.6 ? 0.95 * (1 - el / 1.6) : 0;
  ba = R.follow('beam', hover ? ba : 0, dt, 6);
  R.beam.visible = ba > 0.02; R.beam.material.uniforms.uA.value = ba;
  R.beam.position.set(0, 0.1, 0); R.beam.scale.set(0.95, Math.max(0.1, sy - 0.9), 0.95);
  const hookY = st === 'gone' ? 1.4 + (sy - 2.0) * sat(el / 1.6) : 1.4;
  R.rope.visible = R.hook.visible = hover;
  R.rope.position.set(0, hookY + 0.25, 0); R.rope.scale.y = Math.max(0.05, sy - 0.75 - hookY - 0.25);
  R.hook.position.set(0, hookY, 0);
  // fans: engine glow; downwash dust around the shaft while it hovers
  R.col('eng', COL.engine, sx == null ? 0 : hover ? 1.1 + 0.2 * Math.sin(T * 9) : 1.5);
  if (fx && sx != null && sy < H + 3 && Math.random() < dt * 30) {
    const a = Math.random() * TAU, r = 2.2 + Math.random() * 1.6, p = R.w(Math.cos(a) * r, 0.1, Math.sin(a) * r);
    fx.parts.emit({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * 3, vy: 0.4, vz: Math.sin(a) * 3, life: 0.9, size: 4, size1: 10, color: 0x8a8274, alpha: 0.4, shape: 1, drag: 2 });
  }
  R.loop = sx != null ? { name: 'extract_dropship_loop', vol: 1, pitch: hover ? 1 : 1.12 } : null;
  R.tape.visible = R.xg.visible = off;
  R.setCut('shell', (() => { const v = R.viewLocal(ctx); return v && Math.abs(v.x) < AS.I + 0.3 && v.z > -AS.I - 0.3 && v.z < AS.O + 0.3 && v.y < AS.H ? ctx.viewer.y + 1.3 : 999; })());
  R.stateLamps(st, t, T);
  R.col('edge', st === 'called' ? COL.amber : st === 'open' ? COL.green : st === 'closing' ? COL.red : COL.amber, st === 'called' ? (blink(2) ? 1.3 : 0.25) : st === 'open' ? 1.1 : st === 'closing' ? (blink(3) ? 1.4 : 0.2) : 0.12);
  // lights: engine pods, beam, status
  if (sx != null) for (const s of [-1, 1]) R.light(ctx, sx, sy - 0.8, sz + s * 3.0, COL.engine, 1.2, 7, 1.3);
  if (ba > 0.05) R.light(ctx, 0, 1.4, 0, COL.blue, 1.6 * ba + 0.4, 5.5, 1.4);
  if (st === 'idle') R.light(ctx, 2.6, 1.7, 2.6, COL.green, 0.45, 2.8, 1.0);
  else if (st === 'called') R.light(ctx, 2.6, 1.7, 2.7, COL.amber, 0.55, 3.2, 1.1);
  else if (st === 'closing') R.light(ctx, 0, 1.8, 0, COL.red, blink(2) ? 1.2 : 0.4, 5, 1.3);
  else if (off) R.light(ctx, 2.6, 1.4, 2.8, COL.red, 0.5, 2.6, 0.9);
  // sounds: engine approach cycles while called (no siren), arrival, closing sequence, the pull, departure
  if (st === 'called' && t > 8.5) { const k = Math.floor((R.callDur() - t) / 9); R.cue(ctx, 'eng' + k, 'extract_airshaft_engine', { pitch: 1 + 0.07 * k, vol: 0.75 + 0.15 * k }); }
  if (st === 'called' && t < 8.5) R.cue(ctx, 'arrive', 'extract_dropship_arrive');
  if (st === 'closing' && el < 0.3) R.cue(ctx, 'close', 'extract_close_seq', { pitch: 0.92 });
  if (st === 'gone' && el < 0.4) R.cue(ctx, 'lift', 'extract_beam_lift');
  if (st === 'gone' && el > 1.5) R.cue(ctx, 'leave', 'extract_dropship_depart');
  R.decals(st, t, el, dt);
}
function carryAirshaft(R, age, c) {
  const top = (R.shipY ?? AS.SHIP_Y) - 1.0, u = ease(sat(age / 1.5));
  return { dx: 0, dy: u * Math.max(0, top - (c.y - (R.root.position.y || 0))), dz: 0, hide: age > 1.55 };
}

// ============================================================================= shared geometry (sim / view / bots)
export function extractPoints(kind, x = {}) {
  switch (kind) {
    case 'hatch': return HATCH_PTS;
    case 'airshaft': return { ...AS_PTS, depart: AS_PTS.departs[0] };
    case 'metro': {
      const o = metroOpts(x), E = o.T - 1.375;
      const departs = [[0, o.T + 0.55]];
      return { call: [0, E - 1.55], callR: 1.8, departs, depart: departs[0], entry: [o.doors[1], E - 1.1], cabin: { shape: 'rect', cx: 0, cz: o.T, hw: 5.5, hd: 1.15, y: 0.375 } };
    }
    default: return { ...EL_PTS, depart: EL_PTS.departs[0] };
  }
}
export function toWorld(x, lx, lz) { const f = x.face || 0, c = Math.cos(f), s = Math.sin(f); return [x.x + lx * c + lz * s, x.z - lx * s + lz * c]; }
export function toLocal(x, wx, wz) { const f = x.face || 0, c = Math.cos(f), s = Math.sin(f), dx = wx - x.x, dz = wz - x.z; return [dx * c - dz * s, dx * s + dz * c]; }
export function extractWorldPoints(x) {
  const P = extractPoints(x.kind || 'elevator', x), w = (p) => (p ? toWorld(x, p[0], p[1]) : null);
  const [cx, cz] = toWorld(x, P.cabin.cx, P.cabin.cz);
  return { call: w(P.call), callR: P.callR || 1.8, departs: P.departs.map(w), depart: w(P.departs[0]), entry: w(P.entry), y: (x.y ?? 0),
    cabin: { ...P.cabin, cx, cz, face: x.face || 0, y: (x.y ?? 0) + (P.cabin.y || 0) } };
}
export function inCabin(x, wx, wy, wz) {
  const c = extractPoints(x.kind || 'elevator', x).cabin, [lx, lz] = toLocal(x, wx, wz);
  if (wy != null && Math.abs(wy - ((x.y ?? 0) + (c.y || 0))) > 1.6) return false;
  return c.shape === 'circle' ? Math.hypot(lx - c.cx, lz - c.cz) <= c.r : Math.abs(lx - c.cx) <= c.hw && Math.abs(lz - c.cz) <= c.hd;
}

// ============================================================================= rig
const STATES = new Set(['idle', 'called', 'open', 'closing', 'gone', 'offline']);
const ZONE_LOOK = {   // colour, alpha, dash chase speed, inner fill
  idle: [0x7dffb0, 0.3, 0.04, 0], called: [0xffa21c, 0.85, 0.12, 0.04], open: [0x3cff6e, 1.0, 0.8, 0.1],
  closing: [0xff2a18, 1.0, 1.6, 0.14], gone: [0xff8a2a, 0.15, 0, 0], offline: [0xff2a18, 0.4, 0, 0],
};
const _v = new THREE.Vector3(), _vl = new THREE.Vector3(), _inv = new THREE.Matrix4();
class Rig {
  constructor(kind, x) {
    this.kind = kind; this.x = x || {};
    this.root = new THREE.Group(); this.root.name = 'extract:' + kind;
    this.groups = {}; this.addGroup('main');
    this.f = {}; this.done = new Set(); this.cued = new Set(); this.decs = []; this.disps = [];
    this.st = null; this.prev = null; this.age = 0; this.tl = 0; this.el = 0; this.time = Math.random() * 20;
    this.snap = true; this.loop = null;
  }
  callDur() { return +this.x.callDur || +this.x.callTime || 38; }
  dur(st) { return st === 'called' ? this.callDur() : st === 'open' ? (this.kind === 'hatch' ? 15 : 90) : st === 'closing' ? 10 : st === 'gone' ? (this.kind === 'metro' ? 9 : 75) : null; }
  addGroup(name, { cutaway = true, clip = false } = {}) {
    const U = { uFade: { value: 1 }, uCutY: { value: 999 }, uClipA: { value: new THREE.Vector4(0, 0, 1, 0) }, uClipX: { value: new THREE.Vector2(-1e9, 1e9) } };
    return (this.groups[name] = { U, cutaway, clip, mats: {} });
  }
  mat(ch, group = 'main') { const g = this.groups[group]; return g.mats[ch] || (g.mats[ch] = groupMat(g.cutaway, g.U)); }
  g(parent = this.root, x = 0, y = 0, z = 0) { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; }
  // part from a gset: group + one mesh per channel; o = { group, remap: { channel: newName } }
  part(gs, parent = this.root, x = 0, y = 0, z = 0, o = null) {
    const g = this.g(parent, x, y, z), grp = o?.group || 'main';
    for (const k in gs) {
      if (!gs[k]) continue;
      const ch = o?.remap?.[k] || k, m = new THREE.Mesh(gs[k], this.mat(ch, grp));
      m.castShadow = true; m.receiveShadow = true; m.userData.ch = ch;
      g.add(m);
    }
    return g;
  }
  col(ch, hex, k = 1) { for (const n in this.groups) { const m = this.groups[n].mats[ch]; if (m) m.color.setHex(hex).multiplyScalar(k); } }
  follow(key, v, dt, k = 12) { const c = this.f[key]; return (this.f[key] = this.snap || c == null ? v : c + (v - c) * Math.min(1, dt * k)); }
  once(key) { if (this.done.has(key)) return false; this.done.add(key); return true; }
  w(lx, ly, lz) { return _v.set(lx, ly, lz).applyMatrix4(this.root.matrixWorld); }
  viewLocal(ctx) { const v = ctx.viewer; if (!v) return null; return _vl.set(v.x, v.y, v.z).applyMatrix4(_inv.copy(this.root.matrixWorld).invert()); }
  setFade(group, target, dt) { const u = this.groups[group].U.uFade; u.value = this.snap ? target : u.value + (target - u.value) * Math.min(1, dt * 6); }
  setCut(group, y) { this.groups[group].U.uCutY.value = y; }
  setClip(group, x0, x1) { this.groups[group].U.uClipX.value.set(x0, x1); }
  light(ctx, lx, ly, lz, col, I, range, prio = 1.2) {
    if (!ctx.L || ctx.near === false || !(I > 0.01)) return;
    const p = this.w(lx, ly, lz); ctx.L.light(p.x, p.y, p.z, col, I, range, prio);
  }
  spot(ctx, lx, ly, lz, a, half, col, I, range, prio = 1.3) {
    if (!ctx.L || ctx.near === false || !(I > 0.01)) return;
    const p = this.w(lx, ly, lz); ctx.L.spot(p.x, p.y, p.z, a + this.root.rotation.y, half, col, I, range, prio);
  }
  cue(ctx, key, name, o) { if (this.cued.has(key)) return; this.cued.add(key); if (!this.snap) ctx.play?.(name, o); }
  dust(fx, r, n, cx = 0, cz = 0) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * TAU, p = this.w(cx + Math.cos(a) * r, 0.15, cz + Math.sin(a) * r);
      fx.parts.emit({ x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * 1.2, vy: 0.5 + Math.random() * 0.9, vz: Math.sin(a) * 1.2, life: 1.2 + Math.random() * 0.8, size: 5, size1: 14, color: 0x8a8274, alpha: 0.5, shape: 1, drag: 1.5 });
    }
  }
  addDecal(o, parent, x, y, z) { const d = decalMesh(o); d.position.set(x, y, z); parent.add(d); this.decs.push(d); return d; }
  // countdown display: 2 pixel digits (s m voxels) over a dim '88' ghost; origin = lower-left of the left digit
  display(parent, x, y, z, s, rotY = 0, group = 'main') {
    const g = this.g(parent, x, y, z); g.rotation.y = rotY;
    this.part(gset('dg' + s, () => digitGhostVox(s)), g, 0, 0, -s, { group });
    const d = [0, 1].map((i) => this.part(gset('d' + s + '8', () => digitVox('8', s)), g, i * 4 * s, 0, 0, { group }).children[0]);
    const disp = { g, d, s, txt: null }; this.disps.push(disp);
    return disp;
  }
  setDisplays(txt) {
    for (const disp of this.disps) {
      if (disp.txt === txt) continue;
      disp.txt = txt;
      for (let i = 0; i < 2; i++) {
        const c = txt[i] || ' ', m = disp.d[i];
        m.visible = c !== ' ';
        if (m.visible) m.geometry = gset('d' + disp.s + c, () => digitVox(c, disp.s)).digit;
      }
    }
  }
  // console / status light / call button / screen / departure lever / displays per state (shared by kinds)
  stateLamps(st, t, T) {
    const blink = (hz) => (T * hz) % 1 < 0.5, off = st === 'offline';
    const stat = { idle: [COL.green, 1.1], called: [COL.amber, blink(2) ? 1.3 : 0.4], open: [COL.green, blink(1) ? 1.3 : 0.6], closing: [COL.red, blink(3) ? 1.4 : 0.3], gone: [COL.red, 0.25], offline: [COL.red, 0.03] }[st] || [COL.green, 1];
    this.col('status', stat[0], stat[1]);
    this.col('ready', st === 'idle' ? COL.green : COL.red, st === 'idle' ? 0.9 + 0.3 * Math.sin(T * 4) : 0.25);
    if (st === 'idle') this.col('screen', COL.green, 0.5 + 0.08 * Math.sin(T * 2));
    else if (st === 'called') this.col('screen', COL.amber, blink(2.5) ? 1.15 : 0.6);
    else if (st === 'open') this.col('screen', COL.green, 1.25);
    else if (st === 'closing') this.col('screen', COL.red, blink(2.5) ? 1.2 : 0.5);
    else if (st === 'gone') this.col('screen', COL.amber, 0.3);
    else this.col('screen', COL.red, 0.75);
    this.col('xlamp', COL.red, blink(1.2) ? 1.4 : 0.9);
    this.col('depart', st === 'closing' ? COL.green : COL.amber, st === 'open' ? (blink(1.5) ? 1.5 : 0.7) : st === 'closing' ? 1.3 : 0.12);
    const dc = { idle: [COL.green, 0.45], called: [COL.amber, 1.2], open: [COL.green, 1.25], closing: [COL.red, 1.3], gone: [COL.amber, 0.35], offline: [COL.red, 0.7] }[st] || [COL.green, 1];
    this.col('digit', dc[0], dc[1]);
    this.setDisplays(st === 'called' || st === 'open' || st === 'closing' ? two(t) : off ? 'XX' : '--');
  }
  // the cabin decal and the call-button ring
  decals(st, t, el, dt) {
    for (const d of this.decs) {
      const u = d.material.uniforms, isCall = d === this.callDec;
      let [c, a, chase, inner] = ZONE_LOOK[st] || ZONE_LOOK.idle, fill = 1, dim = 1;
      if (isCall) { if (st === 'idle') { c = 0x3cff6e; a = 0.85; chase = 0.3; inner = 0.06; } else if (st === 'offline') { c = 0xff2a18; a = 0.35; chase = 0; inner = 0; } else { c = 0xffa21c; a = 0.3; chase = 0; inner = 0; } }
      else if (this.kind === 'hatch') {
        if (st === 'open') { c = 0x3cff6e; a = 1.0; chase = 0.8; inner = 0.1; fill = t / 15; dim = 0.25; } else if (st !== 'offline') { c = 0xffc23c; a = 0.4; chase = 0.03; inner = 0; }
      } else if (st === 'called') { fill = 1 - t / this.callDur(); dim = 0.3; }
      else if (st === 'open') { fill = t / 90; dim = 0.35; }
      else if (st === 'closing') { fill = t / 10; dim = 0.3; inner *= (this.time * 4) % 1 < 0.5 ? 1 : 0.3; }
      else if (st === 'gone') a = 0.12 + 0.2 * (1 - sat(el / 10));
      d.userData.ph = (d.userData.ph + dt * chase) % 1;
      u.uCol.value.setHex(c); u.uA.value = a; u.uPh.value = d.userData.ph; u.uFill.value = fill; u.uDim.value = dim;
      u.uInner.value = inner * (0.65 + 0.35 * Math.sin(this.time * 6));
    }
  }
  update(dt, st, t, ctx = {}) {
    dt = clamp(+dt || 0, 0, 0.1);
    st = STATES.has(st) ? st : 'idle';
    if (this.kind === 'hatch' && st !== 'offline' && st !== 'open') st = 'idle';
    if (st !== this.st) { this.prev = this.st; this.st = st; this.age = 0; this.cued.clear(); this.done.clear(); this._tl = null; }
    else this.age += dt;
    const dur = this.dur(st);
    if (dur == null) this.tl = 0;
    else if (typeof t === 'number' && isFinite(t)) {   // follow the authoritative timer smoothly between sim ticks
      const tt = clamp(t, 0, dur), p = this._tl == null ? tt : this._tl - dt;   // never drifts > 1 tick from it (pause-safe)
      this.tl = this._tl = Math.abs(p - tt) > 1 ? tt : clamp(p, Math.max(0, tt - 0.04), tt + 0.04);
    } else this.tl = Math.max(0, dur - this.age);
    this.el = dur == null ? this.age : dur - this.tl;
    this.time += dt;
    this.root.updateMatrixWorld();
    const e = this.root.matrixWorld.elements;
    for (const n in this.groups) { const g = this.groups[n]; if (g.clip) g.U.uClipA.value.set(e[12], e[14], e[0], -e[2]); }
    this.anim(this, dt, st, this.tl, this.el, ctx || {});
    this.snap = false;
  }
  dispose() {
    for (const n in this.groups) for (const m of Object.values(this.groups[n].mats)) m.dispose();
    for (const d of this.decs) { d.material.dispose(); d.geometry.dispose(); }
    if (this.beam) { this.beam.material.dispose(); this.beam.geometry.dispose(); }
  }
}

const BUILD = { elevator: buildElevator, hatch: buildHatch, metro: buildMetro, airshaft: buildAirshaft };
export const EXTRACT_KINDS = Object.keys(BUILD);

// x: the extract marker (world.extracts / sim.extracts entry); x.world (optional) lets a metro fit its hall
export function createExtractModel(kind, x = {}) {
  const k = BUILD[kind] ? kind : 'elevator';
  const R = new Rig(k, x);
  BUILD[k](R);
  R.root.userData.extract = R;
  R.root.addEventListener('removed', () => R.dispose());
  return {
    root: R.root, kind: k, rig: R,
    update: (dt, state, t, ctx) => R.update(dt, state, t, ctx),
    carry: (age, c) => (R.carryFn ? R.carryFn(R, age, c) : { dx: 0, dy: 0, dz: 0, hide: true }),
    trigger: () => {},
    get loop() { return R.loop; },
    get timeLeft() { return R.tl; },
    dispose: () => R.dispose(),
  };
}

// collision boxes in the local frame [x0, z0, x1, z1, h, y0?]; the cabins and their doorways stay walkable
export function extractSolids(kind, x = {}, world = null) {
  switch (kind) {
    case 'hatch': return [];
    case 'metro': {
      if (!x.fit && world) { const f = metroFit(x, world); if (f) x.fit = f; }
      const o = metroOpts(x), E = o.T - 1.375, PT = 0.375, g = o.doors;
      const out = [[o.px0, -o.PB, o.px1, E, PT], [-5.875, E - 0.05, 5.875, o.T + 1.25, PT]];   // platform + car floor (one walkable level)
      for (const [a, b] of [[o.px0, g[0] - 0.75], [g[0] + 0.75, g[1] - 0.75], [g[1] + 0.75, o.px1]]) if (b > a) out.push([a, E - 0.45, b, E - 0.3, 1.05, PT]);   // platform fence
      out.push([-6.0, o.T + 1.25, 6.0, o.T + 1.5, 1.1, PT], [-6.125, E, -5.875, o.T + 1.25, 1.1, PT], [5.875, E, 6.125, o.T + 1.25, 1.1, PT]);   // car far side + ends
      out.push([-0.4, E - 1.05, 0.4, E - 0.45, 1.4, PT]);                                                          // call terminal
      const sx = Math.max(o.px0 + 1.25, -6.25), sz = -o.PB + 0.375;
      out.push([sx - 0.15, sz - 0.15, sx + 0.15, sz + 0.15, 2.6, PT]);                                              // sign pole
      return out;
    }
    case 'airshaft': {
      const { O, I, H, DW, DH } = AS, h = H + 0.125;
      return [[-O, -O, -I, O, h], [I, -O, O, O, h], [-I, -O, I, -I, h], [-I, I, -DW, O, h], [DW, I, I, O, h], [-DW, I, DW, O, h - DH, DH], [2.3, 2.125, 2.9, 2.5, 1.6]];
    }
    default: {
      const { B, I, DW, DH, H, RT } = EB;
      return [
        [-B, -B, -I, B, RT], [I, -B, B, B, RT], [-I, -B, I, -I, RT],            // side + back walls
        [-I, I, -DW, B, RT], [DW, I, I, B, RT], [-DW, I, DW, B, RT - DH, DH],   // front wall + lintel over the doorway
        [-I, -I, I, I, RT - H, H],                                               // roof over the car
        [-I, -I, I, I, 0.25],                                                    // car / shaft floor
        [2.625, 4.0, 3.625, 5.0, 3.6],                                           // call gantry
      ];
    }
  }
}

// triangles of a model (all parts, every state) - for the gallery / budgets
export function extractTris(model) {
  let n = 0;
  model.root.traverse((o) => { if (o.isMesh && o.geometry.index && o.name !== 'zone') n += o.geometry.index.count / 3; });
  return n;
}
