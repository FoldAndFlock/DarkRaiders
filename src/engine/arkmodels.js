// ARK machine models: detailed, part-based voxel rigs with procedural animation.
//
//   createArkModel(modelKey, def) -> { root: THREE.Group, update(dt, s), setBroken(zoneKey), hit(wx, wz, k, big, yaw), rig }
//
// Frames & origins
//   * +z is forward (the ARK's facing), +y is up. The game rotates `root` about y by the facing.
//   * data/arc.js hitzones use x = the machine's RIGHT. Facing +z, the machine's right-hand side
//     lies on three.js local -x, so zone (x, z) is drawn at local (-x, z). Mirrored zone keys follow
//     sim.js: name_0..name_3 in the order (+x,+z) (+x,-z) (-x,+z) (-x,-z) (sim frame).
//   * Walkers, rollers and static emplacements: origin = ground point under the machine's centre.
//   * Flyers (def.flying): origin = HULL CENTRE (the game places it at the hover altitude).
//   * Hover units (def.hover, e.g. shreddr): origin = ground point; the hull floats above it.
//   * Size: every model key is authored at the size of its base def (wazp, leapr, ...) and the
//     whole rig is scaled uniformly by def.radius / base radius, so variants (komet, spottr,
//     vaporiser, matriark ...) match their defs. shreddr and turbyne get dedicated rigs.
//   * Variants are picked from def.behavior / def.variant, never from the display name.
//
// Update state s (all optional):
//   { moving, speed (m/s), alert 0..1, tele 0..1 (attack telegraph / charge), gaze (radians,
//     relative to body facing), pitch (radians, + = aim down; optional), stunned, firing, leaping,
//     dmg 0..3 (damage state from the hp fraction: 2 = scorched tint + flickering eyes + wobble / limp,
//     3 = darker still, the view adds sparks / smoke / fire) }
// Hit reactions: hit(wx, wz, k, big, yaw) kicks a damped spring that tilts the whole machine away from a hit
// coming along world direction (wx, wz) (k 0..1 strength, yaw = current facing), with a dip + jolt; flyers
// swing more than walkers. It lives on a group between root and top, so it composes with every model's anim.
//
// Materials: everything uses litVox() (game lighting + shadows). Each rig owns three clones of it
// whose colour multiplier animates: eyeMat (sensor eyes: amber idle -> red alert, flare on
// telegraph, flicker when stunned), hotMat (weak points: slow "breathing" glow) and teleMat
// (laser/telegraph emitters). Voxels are routed to those meshes by colour (AK.EYE*, AK.HOT*, AK.YEL).
//
// Breakable parts: setBroken(zoneKey) hides / darkens / swaps-in a charred stub for the part that
// sits nearest that hitzone (keys come from def.hitzones exactly as sim.js expands them; unknown
// keys fall back to name + index, so it never throws). Model notes by model key (weak points in CAPS;
// display names from data/arc.js in brackets):
//   wasp       [Buzzkill] quad rotors in guard rings (ROTORS hide on break, hull lists towards them),
//              slit visor, white racing stripes
//   hornet     [Middle Manager] light armour slab with a two-lens visor and a necktie, armoured front
//              rotors, BARE GLOWING REAR ROTORS; flamer variant [Burnout]: flamer + yellow FUEL TANK
//              whose cover opens on attack, hazard brow, low-battery strip
//   snitch     [Narc] big searchlight (turns to gaze, amber -> red on alert), spinning two-tone light
//              bar; spotter variant [Plus One]: laser pod + party hat
//   tick       [Late Fee] six IK legs (tripod gait), amber pod, slit-visor eye; tucks legs when leaping
//   pop        [Pop-Up Ad] rolling bomb: yellow band + glowing slot over a non-rolling eye core, red
//              notification dot on the right hub; komet variant [Rolling Blackout] splits, caution rings
//   fireball   [Hot Take] rolling armoured ball, hazard rim + steam vent; stops, hinges its top shell
//              open -> white-hot CORE + flame
//   shredder   [Close Talker] (fireball key, behavior 'shredder') hover orb, two staring eyes,
//              spinning shrapnel ring, BLUE THRUSTERS
//   turret     [Wallflower] hazard base, slit eye, yawing head + pitching twin barrels (alternating
//              recoil), GLOWING REAR PACK
//   sentinel   [Neighborhood Watch] lattice mast with a watch sign, yawing sniper head (4 yellow
//              converge emitters), CANISTER behind the mast
//   surveyor   [Data Miner] rolling plated ball with barcoded plates; when stopped the top plate opens
//              and the blue CORE + antenna rise
//   rocketeer  [Rocket Surgeon] gunship: 4 ducted fans (THRUSTERS), rocket pods, EYEBROW over the
//              scanner, BACK CANISTER, first-aid decal; laser variant [Vape Lord]: laser pods + BELLY
//              PANEL over the core, teal trim; turbine variant [Cloud Service]: own rig
//   leaper     [Parkour Dad] 4 IK legs with glowing YELLOW KNEES, eye + cap-red visor plate, sweatband,
//              iris over the top CORE (opens while stunned after landing), crouches on telegraph
//   bastion    [HOA President] sloped front armour with eye row, 2 gatlings (spin when firing), YELLOW
//              KNEES, GLOWING REAR CANISTER that reveals the red REAR CORE, posted notice, picket trim
//   bombardier [Shell Company] mortar (recoils), shell magazine, uplink dish, slit eye under a barcode
//              brow, YELLOW KNEES, REAR CANISTER
//   queen      [The Landlady] 4 colossal IK legs (YELLOW KNEES), 4 armour PLATES, head + sweep laser
//              (gaze) + pearls, red reactor CORE in a top well (swells as plates fall); matriarch
//              variant [Helicopter Mom] adds MISSILE PODS and a propeller beanie
// Triangle budget (visible): small/medium ARK 1.7k-14k, heavies <= ~15.5k, queene/matriark ~43k.
// tools/arkgallery.html renders every model (zoom / state / rear / broken params) for review.
import * as THREE from '../../vendor/three.module.js';
import { Vox } from './voxel.js';
import { litVox } from './materials.js';

// ----------------------------------------------------------------------------- palette
export const AK = {
  g0: 0x131518, g1: 0x1e2126, g2: 0x2b2f35, g3: 0x3a3f46, g4: 0x4d535b, g5: 0x676d75,
  st: 0x878c92, st2: 0xaeb2b4, cab: 0x18191c,
  r0: 0x40261a, r1: 0x6a3920, r2: 0x8f5126,
  y0: 0xe6a21c, y1: 0xd06c18, y2: 0x8e5a1a, bk: 0x15161a,
  cer: 0xb6b2a5, cer2: 0x9a968b, cer3: 0xcdc9bc, cu: 0xad6a30,
  tie: 0x7a2428, cap: 0x8e3a2c, tl: 0x2c8a84,   // accents: Middle Manager necktie, Parkour Dad cap, Vape Lord trim
  // glowing (emissive) colours
  EYE: 0xff7424, EYE2: 0xffd2a8,          // pulsing sensor eyes        -> eyeMat
  HOT: 0xffa018, HOT2: 0xffe486, HOTR: 0xff4416,  // pulsing weak points / cores -> hotMat
  YEL: 0xffd436,                          // telegraph laser emitters   -> teleMat
  RED: 0xff2a14, BLUE: 0x48b8ff, BLUE2: 0xbaf0ff, EXH: 0xff9226, FLM: 0xffe27a, FLM2: 0xff7a1c, // static
};
const K = AK;
const GLOWS = [K.EYE, K.EYE2, K.HOT, K.HOT2, K.HOTR, K.YEL, K.RED, K.BLUE, K.BLUE2, K.EXH, K.FLM, K.FLM2];
const EYEC = new Set([K.EYE, K.EYE2]), HOTC = new Set([K.HOT, K.HOT2, K.HOTR]), TELC = new Set([K.YEL]);
const HAZ = new Set([K.y0, K.y1]);

// ----------------------------------------------------------------------------- small helpers
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const wrapA = (a) => { a = (a + Math.PI) % (Math.PI * 2); if (a < 0) a += Math.PI * 2; return a - Math.PI; };
const damp = (cur, tgt, k, dt) => cur + (tgt - cur) * Math.min(1, k * dt);
const rnd = (a = 1) => (Math.random() - 0.5) * 2 * a;
function hash3(i, j, k, s = 0) {
  let h = Math.imul(i | 0, 374761393) + Math.imul(j | 0, 668265263) + Math.imul(k | 0, 1440662683) + Math.imul(s | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, z, s = 0) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  xf = xf * xf * (3 - 2 * xf); yf = yf * yf * (3 - 2 * yf); zf = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d, s);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), xf), L(c(0, 1, 0), c(1, 1, 0), xf), yf), L(L(c(0, 0, 1), c(1, 0, 1), xf), L(c(0, 1, 1), c(1, 1, 1), xf), yf), zf);
}
function shade(c, f) {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * f)), g = Math.min(255, Math.round(((c >> 8) & 255) * f)), b = Math.min(255, Math.round((c & 255) * f));
  return (r << 16) | (g << 8) | b;
}
function mixc(a, b, t) {
  const r = ((a >> 16) & 255) * (1 - t) + ((b >> 16) & 255) * t, g = ((a >> 8) & 255) * (1 - t) + ((b >> 8) & 255) * t, bl = (a & 255) * (1 - t) + (b & 255) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(bl);
}
// diagonal hazard stripes colour function
const haz = (w = 2, a = K.y0, b = K.bk) => (X, Y, Z, i, j, k) => ((Math.floor((i + j + k) / w) & 1) ? b : a);
// every n-th voxel line along an axis -> seam colour (panel lines)
const seam = (n, axis, col, off = 0) => (X, Y, Z, i, j, k) => (((axis === 'x' ? i : axis === 'y' ? j : k) + off) % n === 0 ? col : undefined);
// stencilled inventory barcode (the repossession paperwork): fixed irregular bar pattern along an axis
const BAR = [1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1];
const barcode = (axis, light = K.cer3, dark = K.bk, off = 0) => (X, Y, Z, i, j, k) => (BAR[((axis === 'x' ? i : axis === 'y' ? j : k) + off) % BAR.length] ? dark : light);

// ----------------------------------------------------------------------------- voxel builder (metres)
// Shapes take metre coordinates relative to the part pivot; a voxel is filled when its centre lies
// inside the shape. Colours may be ints, -1 (carve) or fn(X,Y,Z,i,j,k,cur) -> colour.
class VB extends Vox {
  constructor(s, x0, y0, z0, x1, y1, z1) {
    const sx = Math.max(1, Math.round((x1 - x0) / s)), sy = Math.max(1, Math.round((y1 - y0) / s)), sz = Math.max(1, Math.round((z1 - z0) / s));
    super(sx, sy, sz, s, [-x0 / s, -y0 / s, -z0 / s]);
    for (const g of GLOWS) this.emissive.add(g);
  }
  X(i) { return (i + 0.5 - this.o[0]) * this.s; }
  Y(j) { return (j + 0.5 - this.o[1]) * this.s; }
  Z(k) { return (k + 0.5 - this.o[2]) * this.s; }
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
          const idx = this.i(i, j, k);
          const v = fn ? c(X, Y, Z, i, j, k, this.d[idx]) : c;
          if (v !== undefined && v !== null) this.d[idx] = v;
        }
      }
    }
    return this;
  }
  // axis-aligned box [x0,x1)x[y0,y1)x[z0,z1); ch: chamfer vertical edges (voxels), cht/chb: bevel top/bottom edges
  box(x0, y0, z0, x1, y1, z1, c, o = null) {
    const s = this.s, ch = o?.ch || 0, cht = o?.cht || 0, chb = o?.chb || 0;
    return this.fillIf(x0, y0, z0, x1, y1, z1, (X, Y, Z) => {
      if (X < x0 || X >= x1 || Y < y0 || Y >= y1 || Z < z0 || Z >= z1) return false;
      if (!ch && !cht && !chb) return true;
      const dx = Math.floor(Math.min(X - x0, x1 - X) / s), dz = Math.floor(Math.min(Z - z0, z1 - Z) / s);
      if (ch && dx + dz < ch) return false;
      if (cht) { const dy = Math.floor((y1 - Y) / s); if (dx + dy < cht || dz + dy < cht) return false; }
      if (chb) { const dy = Math.floor((Y - y0) / s); if (dx + dy < chb || dz + dy < chb) return false; }
      return true;
    }, c);
  }
  ell(cx, cy, cz, rx, ry, rz, c) {
    return this.fillIf(cx - rx, cy - ry, cz - rz, cx + rx, cy + ry, cz + rz, (X, Y, Z) => ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 + ((Z - cz) / rz) ** 2 <= 1, c);
  }
  // cylinders / cones / tubes along an axis; r -> r1 linear taper; rIn: hollow
  cylY(cx, cz, y0, y1, r, c, rIn = 0, r1 = r) {
    const R = Math.max(r, r1);
    return this.fillIf(cx - R, y0, cz - R, cx + R, y1, cz + R, (X, Y, Z) => {
      if (Y < y0 || Y >= y1) return false;
      const rr = r + (r1 - r) * (Y - y0) / ((y1 - y0) || 1), d = Math.hypot(X - cx, Z - cz);
      return d <= rr && d >= rIn;
    }, c);
  }
  cylX(cy, cz, x0, x1, r, c, rIn = 0, r1 = r) {
    const R = Math.max(r, r1);
    return this.fillIf(x0, cy - R, cz - R, x1, cy + R, cz + R, (X, Y, Z) => {
      if (X < x0 || X >= x1) return false;
      const rr = r + (r1 - r) * (X - x0) / ((x1 - x0) || 1), d = Math.hypot(Y - cy, Z - cz);
      return d <= rr && d >= rIn;
    }, c);
  }
  cylZ(cx, cy, z0, z1, r, c, rIn = 0, r1 = r) {
    const R = Math.max(r, r1);
    return this.fillIf(cx - R, cy - R, z0, cx + R, cy + R, z1, (X, Y, Z) => {
      if (Z < z0 || Z >= z1) return false;
      const rr = r + (r1 - r) * (Z - z0) / ((z1 - z0) || 1), d = Math.hypot(X - cx, Y - cy);
      return d <= rr && d >= rIn;
    }, c);
  }
  // capsule between two points, radius r -> r1
  seg(ax, ay, az, bx, by, bz, r, c, r1 = r) {
    const R = Math.max(r, r1), dx = bx - ax, dy = by - ay, dz = bz - az, l2 = dx * dx + dy * dy + dz * dz || 1e-9;
    return this.fillIf(Math.min(ax, bx) - R, Math.min(ay, by) - R, Math.min(az, bz) - R, Math.max(ax, bx) + R, Math.max(ay, by) + R, Math.max(az, bz) + R, (X, Y, Z) => {
      const t = clamp(((X - ax) * dx + (Y - ay) * dy + (Z - az) * dz) / l2, 0, 1);
      return Math.hypot(X - ax - dx * t, Y - ay - dy * t, Z - az - dz * t) <= r + (r1 - r) * t;
    }, c);
  }
  // recolour existing voxels inside a box
  paintBox(x0, y0, z0, x1, y1, z1, fn) {
    return this.fillIf(x0, y0, z0, x1, y1, z1, (X, Y, Z) => X >= x0 && X < x1 && Y >= y0 && Y < y1 && Z >= z0 && Z < z1,
      (X, Y, Z, i, j, k, cur) => (cur === -1 ? undefined : (typeof fn === 'function' ? fn(X, Y, Z, i, j, k, cur) : fn)));
  }
  paint(fn) {
    const { sx, sy, sz, d } = this;
    for (let j = 0; j < sy; j++) for (let k = 0; k < sz; k++) for (let i = 0; i < sx; i++) {
      const idx = (j * sz + k) * sx + i, c = d[idx]; if (c === -1) continue;
      const n = fn(this.X(i), this.Y(j), this.Z(k), i, j, k, c); if (n !== undefined && n !== null) d[idx] = n;
    }
    return this;
  }
  // exposure bitmask: 1 +x, 2 -x, 4 +y, 8 -y, 16 +z, 32 -z
  ex(i, j, k) {
    return (this.get(i + 1, j, k) === -1 ? 1 : 0) | (this.get(i - 1, j, k) === -1 ? 2 : 0) | (this.get(i, j + 1, k) === -1 ? 4 : 0)
      | (this.get(i, j - 1, k) === -1 ? 8 : 0) | (this.get(i, j, k + 1) === -1 ? 16 : 0) | (this.get(i, j, k - 1) === -1 ? 32 : 0);
  }
  // surface wear: value noise, lit worn top edges, darker undersides, chipped hazard paint, rust patches
  weather({ noise = 0.045, edge = 0.14, under = 0.16, chip = 0.12, rust = 0, rustScale = 5, seed = 1 } = {}) {
    return this.paint((X, Y, Z, i, j, k, c) => {
      if (this.emissive.has(c)) return;
      const e = this.ex(i, j, k); if (!e) return;
      const h = hash3(i, j, k, seed);
      let f = 1 + (h - 0.5) * 2 * noise;
      const side = e & 51, top = e & 4, bot = e & 8;
      if (top && side) f *= 1 + edge; else if (bot && !top) f *= 1 - under;
      let n = shade(c, f);
      if (HAZ.has(c) && top && side && hash3(i, j, k, seed + 7) < chip) n = shade(K.g5, f);
      if (rust > 0 && !HAZ.has(c)) {
        const rn = vnoise(X * rustScale, Y * rustScale * 1.6, Z * rustScale, seed + 3) + (top ? -0.1 : 0.06);
        if (rn > 1 - rust) n = mixc(n, h < 0.5 ? K.r1 : K.r2, 0.62);
      }
      return n;
    });
  }
  // move voxels whose colour is in `set` into a new builder (same grid) -> null when none
  extract(set) {
    let out = null;
    for (let n = 0; n < this.d.length; n++) {
      if (!set.has(this.d[n])) continue;
      if (!out) { out = new VB(this.s, 0, 0, 0, this.s, this.s, this.s); out.sx = this.sx; out.sy = this.sy; out.sz = this.sz; out.o = this.o; out.d = new Int32Array(this.d.length).fill(-1); }
      out.d[n] = this.d[n]; this.d[n] = -1;
    }
    return out;
  }
  count() { let n = 0; for (const c of this.d) if (c !== -1) n++; return n; }
}

// ----------------------------------------------------------------------------- geometry cache
const GEO = new Map();
// returns { base, eye, hot, tele } geometries (null when a channel is empty), split by colour
function gset(key, fn) {
  let g = GEO.get(key); if (g) return g;
  const v = fn();
  const eye = v.extract(EYEC), hot = v.extract(HOTC), tele = v.extract(TELC);
  g = { base: v.count() ? v.build() : null, eye: eye ? eye.build() : null, hot: hot ? hot.build() : null, tele: tele ? tele.build() : null };
  GEO.set(key, g); return g;
}
export function arkGeoStats() {
  const out = {};
  for (const [k, g] of GEO) out[k] = ['base', 'eye', 'hot', 'tele'].reduce((n, c) => n + (g[c] ? g[c].index.count / 3 : 0), 0);
  return out;
}

// ----------------------------------------------------------------------------- materials
let _base = null, _broken = null, _scorch = null, _char = null;
const baseMat = () => _base || (_base = litVox());
function cloneMat(r = 1, g = 1, b = 1) {
  const src = baseMat(), m = src.clone();
  m.onBeforeCompile = src.onBeforeCompile; m.customProgramCacheKey = src.customProgramCacheKey;
  m.defines = { ...(src.defines || {}) }; m.vertexColors = true;
  m.color.setRGB(r, g, b);
  return m;
}
const brokenMat = () => _broken || (_broken = cloneMat(0.3, 0.27, 0.25));
const scorchMat = () => _scorch || (_scorch = cloneMat(0.64, 0.57, 0.52));    // damage state 2: soot-stained
const charMat = () => _char || (_char = cloneMat(0.44, 0.39, 0.36));          // damage state 3: charred

// ----------------------------------------------------------------------------- zones (same expansion as sim.js)
function expandZones(def) {
  const out = [];
  for (const z0 of def?.hitzones || []) {
    const mx = z0.mirrorX ? [1, -1] : [1], mz = z0.mirrorZ ? [1, -1] : [1];
    let k = 0;
    for (const sx of mx) for (const sz of mz) out.push({ name: z0.name, key: z0.name + (mx.length * mz.length > 1 ? '_' + (k++) : ''), x: -(z0.x || 0) * sx, z: (z0.z || 0) * sz });
  }
  return out;
}

// ----------------------------------------------------------------------------- rig
const _v = new THREE.Vector3(), _m4 = new THREE.Matrix4();
class Rig {
  constructor(key, def) {
    this.key = key; this.def = def || {};
    this.root = new THREE.Group(); this.root.name = 'ark:' + key;
    this.hitG = this.g(this.root);          // hit wobble / damage lurch (spring), composes with the model anims
    this.top = this.g(this.hitG);           // uniform size scale lives here
    this.wb = { x: 0, z: 0, vx: 0, vz: 0, y: 0, vy: 0, jit: 0 }; this.dmg = 0;
    this.jit = this.top;                     // stunned twitch target (models may override)
    this.eyeMat = cloneMat(); this.hotMat = cloneMat(); this.teleMat = cloneMat();
    this.zones = []; this.zmap = null; this.broken = new Set(); this.nBroken = 0;
    this.flashes = [];
    this.t = Math.random() * 50; this.al = 0; this.mv = 0; this.fireK = 0; this.k = 1; this.refSpeed = 3;
    this.blink = null;                       // optional fn(t, s) -> eye intensity override
  }
  g(parent, x = 0, y = 0, z = 0) { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; }
  m(geo, parent, mat = 'base', x = 0, y = 0, z = 0) {
    const me = new THREE.Mesh(geo, mat === 'eye' ? this.eyeMat : mat === 'hot' ? this.hotMat : mat === 'tele' ? this.teleMat : baseMat());
    me.castShadow = true; me.receiveShadow = true; me.position.set(x, y, z); parent.add(me);
    return me;
  }
  // part from a gset: group + one mesh per material channel
  pm(gs, parent, x = 0, y = 0, z = 0) {
    const g = this.g(parent, x, y, z), o = { g };
    if (gs.base) o.base = this.m(gs.base, g, 'base');
    if (gs.eye) o.eye = this.m(gs.eye, g, 'eye');
    if (gs.hot) o.hot = this.m(gs.hot, g, 'hot');
    if (gs.tele) o.tele = this.m(gs.tele, g, 'tele');
    return o;
  }
  flash(gs, parent, x, y, z) { const f = this.pm(gs, parent, x, y, z).g; f.visible = false; this.flashes.push(f); return f; }
  // breakable part registration; x/z in local (three) base-model metres
  zone(names, x, z, fx = {}) { const zn = { names: [].concat(names), x, z, hide: [], dark: [], show: [], ...fx, broken: false }; for (const o of zn.show) o.visible = false; this.zones.push(zn); return zn; }
  setBroken(key) {
    if (this.broken.has(key)) return;
    this.broken.add(key);
    if (!this.zmap) this._mapZones();
    let zs = this.zmap.get(key);
    if (!zs) { // key not in def: match by name + index
      const m = /^(.*?)(?:_(\d+))?$/.exec(key), name = m[1], idx = +(m[2] || 0);
      const c = this.zones.filter(z => z.names.includes(name));
      zs = c.length ? [c[Math.min(idx, c.length - 1)]] : [];
    }
    for (const z of zs) this._break(z);
  }
  _break(z) {
    if (z.broken) return; z.broken = true; this.nBroken++;
    for (const o of z.hide) o.visible = false;
    for (const o of z.show) o.visible = true;
    for (const d of z.dark) d.traverse(o => { if (o.isMesh) o.material = brokenMat(); });
    z.fn && z.fn(this, z);
  }
  _mapZones() {
    this.zmap = new Map();
    for (const zn of expandZones(this.def)) {
      let best = null, bd = 1e9;
      for (const z of this.zones) {
        if (!z.names.includes(zn.name)) continue;
        const d = Math.hypot(z.x * this.k - zn.x, z.z * this.k - zn.z);
        if (d < bd) { bd = d; best = z; }
      }
      if (best) this.zmap.set(zn.key, [best]);
    }
  }
  isBroken(name) { return this.zones.some(z => z.broken && z.names.includes(name)); }
  // hit from world direction (wx, wz): tilt away (local frame of facing yaw), dip, jolt on big hits
  hit(wx, wz, k = 0.3, big = false, yaw = 0) {
    const c = Math.cos(yaw), s = Math.sin(yaw), lx = wx * c - wz * s, lz = wx * s + wz * c, W = this.wb;
    const fly = !!this.def.flying, a = clamp(k, 0, 1) * (fly ? 9 : 4.5) * (big ? 1.4 : 1);
    W.vx += lz * a; W.vz -= lx * a;
    W.vy -= clamp(k, 0, 1) * (fly ? 2.2 : 0.5) * (big ? 1.5 : 1);
    if (big) W.jit = Math.max(W.jit, 0.18);
  }
  // damage state (view: from the hp fraction): soot / char tint swaps the shared hull material
  setDamage(st) {
    st = clamp(st | 0, 0, 3);
    if (st === this.dmg) return;
    this.dmg = st;
    const want = st >= 3 ? charMat() : st >= 2 ? scorchMat() : baseMat(), hull = new Set([baseMat(), _scorch, _char]);
    this.root.traverse(o => { if (o.isMesh && hull.has(o.material)) o.material = want; });
  }
  _wobble(dt, s) {
    const W = this.wb, K = 70, D = 7, Ky = 45, Dy = 8;
    W.vx += (-K * W.x - D * W.vx) * dt; W.vz += (-K * W.z - D * W.vz) * dt; W.vy += (-Ky * W.y - Dy * W.vy) * dt;
    W.x = clamp(W.x + W.vx * dt, -0.55, 0.55); W.z = clamp(W.z + W.vz * dt, -0.55, 0.55); W.y = clamp(W.y + W.vy * dt, -0.6, 0.3);
    let ex = 0, ez = 0;
    if (W.jit > 0) { W.jit -= dt; ex += rnd(0.06); ez += rnd(0.06); }
    // badly damaged: flyers can't hold steady (roll / pitch wander), walkers lurch on a bad leg
    if (this.dmg >= 2) {
      const t = this.t, m = this.dmg >= 3 ? 1.6 : 1;
      if (this.def.flying) { ex += Math.sin(t * 5.3) * 0.045 * m; ez += Math.sin(t * 3.7 + 1) * 0.07 * m; }
      else { const mv = this.mv; ez += Math.max(0, Math.sin(t * 6.2)) * 0.06 * m * mv; ex += Math.sin(t * 3.1) * 0.02 * m; }
    }
    this.hitG.rotation.set(W.x + ex, 0, W.z + ez);
    this.hitG.position.y = W.y;
  }
  update(dt, s = {}) {
    dt = clamp(dt || 0, 0, 0.1);
    this.t += dt;
    this.al = damp(this.al, clamp(s.alert || 0, 0, 1), 3, dt);
    this.mv = damp(this.mv, s.moving ? Math.min(1, (s.speed ?? this.refSpeed) / this.refSpeed) : 0, 4, dt);
    this.fireK = s.firing ? Math.min(1, this.fireK + dt * 8) : Math.max(0, this.fireK - dt * 3);
    if (s.dmg != null && s.dmg !== this.dmg) this.setDamage(s.dmg);
    this._mats(s);
    this.anim && this.anim(dt, s, this.t);
    this._wobble(dt, s);
    for (const f of this.flashes) {
      const on = !!s.firing && Math.random() < 0.6; f.visible = on;
      if (on) { f.rotation.z = Math.random() * 6.3; f.scale.setScalar(0.6 + Math.random() * 0.7); }
    }
    const j = this.jit;
    if (s.stunned) { if (Math.random() < 0.4) j.rotation.set(rnd(0.07), rnd(0.07), rnd(0.07)); }
    else if (j.rotation.x || j.rotation.y || j.rotation.z) j.rotation.set(j.rotation.x * 0.7, j.rotation.y * 0.7, j.rotation.z * 0.7);
  }
  _mats(s) {
    const a = this.al, te = clamp(s.tele || 0, 0, 1.5), t = this.t;
    let I = 0.8 + 0.3 * a;
    if (te > 0) I += te * 0.8 + Math.sin(t * (10 + te * 26)) * 0.3 * te;
    if (this.blink) I = this.blink(t, s, I);
    if (this.dmg >= 2 && Math.random() < (this.dmg >= 3 ? 0.22 : 0.09)) I *= 0.08 + Math.random() * 0.3;   // failing: eyes / lights stutter
    if (s.stunned) I = Math.random() < 0.35 ? 0.12 : 0.5 + Math.random() * 0.6;
    if (s.eyeColor) {
      // match the vision-cone awareness colour (view passes it): divide out the amber base eye colour
      const ec = s.eyeColor, k = I * (1 + te * 0.2);
      this.eyeMat.color.setRGB(k * ec.r, k * ec.g / 0.455, k * ec.b / 0.141);
    } else this.eyeMat.color.setRGB(I, I * clamp(1.15 - 0.72 * a + te * 0.25, 0.3, 1.6), I * clamp(1.1 - 0.6 * a + te * 0.15, 0.3, 1.6));
    let h = 0.92 + 0.16 * Math.sin(t * 3.1) + this.fireK * 0.2;
    if (this.dmg >= 2 && Math.random() < 0.07 * this.dmg) h *= 0.25 + Math.random() * 0.4;   // shorting weak-point glow
    this.hotMat.color.setRGB(h, h, h);
    const tl = s.stunned ? 0.2 : 0.55 + 0.35 * a + te * (1.2 + 0.3 * Math.sin(t * 40));
    this.teleMat.color.setRGB(tl, tl, tl);
  }
  // procedural gait: legs[i].phase in [0,1); o = { A: half stride (m), H: lift (m), duty, maxHz, minHz }
  gait(dt, s, legs, o) {
    const sp = (s.moving ? (s.speed ?? 2) : 0) / this.k;
    this.gmv = damp(this.gmv || 0, s.moving ? 1 : 0, 5, dt);
    const hz = clamp(sp * o.duty / (2 * o.A), o.minHz ?? 0.5, o.maxHz ?? 3);
    if (s.moving) this.cyc = ((this.cyc || 0) + dt * hz) % 1000;
    const c = this.cyc || 0;
    for (const L of legs) {
      const ph = (c + L.phase) % 1;
      let dz, ly = 0;
      if (ph < o.duty) dz = o.A * (1 - 2 * ph / o.duty);
      else { const u = (ph - o.duty) / (1 - o.duty), e = u * u * (3 - 2 * u); dz = o.A * (-1 + 2 * e); ly = o.H * Math.sin(Math.PI * u); }
      const lim = L.limp ? 0.35 : 1;
      L.tgt.set(L.rest.x, L.rest.y + ly * this.gmv * lim, L.rest.z + dz * this.gmv * lim);
    }
    return c;
  }
}

// two-bone IK leg. hierarchy: body -> hip(pos) -> yaw -> up(pitch, upper mesh along +z) -> knee(z=L1, pitch, lower mesh along +z) [-> foot(z=L2, kept level)]
class Leg {
  constructor(R, body, hip, foot, L1, L2, parts = {}, o = {}) {
    this.R = R; this.body = body; this.L1 = L1; this.L2 = L2;
    this.hip = R.g(body, hip[0], hip[1], hip[2]);
    this.yaw = R.g(this.hip); this.up = R.g(this.yaw); this.knee = R.g(this.up, 0, 0, L1);
    this.pU = parts.upper ? R.pm(parts.upper, this.up) : null;
    this.pL = parts.lower ? R.pm(parts.lower, this.knee) : null;
    this.pJ = parts.joint ? R.pm(parts.joint, this.knee) : null;
    if (parts.foot) { this.footG = R.g(this.knee, 0, 0, L2); this.pF = R.pm(parts.foot, this.footG); }
    this.rest = new THREE.Vector3(foot[0], foot[1], foot[2]);
    this.tgt = this.rest.clone();
    this.phase = o.phase || 0; this.limp = false; this.kneeUp = o.kneeUp ?? 1;
  }
  solve() {
    const p = _v.copy(this.tgt);
    this.body.updateMatrix();
    p.applyMatrix4(_m4.copy(this.body.matrix).invert()).sub(this.hip.position);
    const L1 = this.L1, L2 = this.L2, d = Math.hypot(p.x, p.z);
    const D = clamp(Math.hypot(d, p.y), Math.abs(L1 - L2) + 1e-3, L1 + L2 - 1e-3);
    const at = Math.atan2(-p.y, d);
    const al = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1));
    const be = Math.acos(clamp((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2), -1, 1));
    this.yaw.rotation.y = Math.atan2(p.x, p.z);
    this.up.rotation.x = at - al * this.kneeUp;
    this.knee.rotation.x = (Math.PI - be) * this.kneeUp;
    if (this.footG) this.footG.rotation.x = -(this.up.rotation.x + this.knee.rotation.x);
  }
  // world-ish (top space) knee position at rest, for zone registration
  kneeRest() {
    const hp = this.hip.position, b = this.body.position;
    const dx = this.rest.x - hp.x - b.x, dz = this.rest.z - hp.z - b.z, yaw = Math.atan2(dx, dz);
    const L1 = this.L1, L2 = this.L2, d = Math.hypot(dx, dz), h = this.rest.y - hp.y - b.y, D = clamp(Math.hypot(d, h), 1e-3, L1 + L2);
    const at = Math.atan2(-h, d), al = Math.acos(clamp((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D), -1, 1)), p1 = at - al;
    const r = Math.cos(p1) * L1;
    return [hp.x + b.x + Math.sin(yaw) * r, hp.y + b.y - Math.sin(p1) * L1, hp.z + b.z + Math.cos(yaw) * r];
  }
}

// ----------------------------------------------------------------------------- shared part kits
// rotor blades (spin about y); n blades of radius r, light so the spin reads against dark hulls
function bladesGS(key, s, r, n = 2, col = K.g5, tip = K.y0) {
  return gset(`${key}.${s}.${r}.${n}`, () => {
    const v = new VB(s, -r - s, -s, -r - s, r + s, s * 2, r + s);
    for (let b = 0; b < n; b++) {
      const a = b * Math.PI * 2 / n + 0.3, ca = Math.cos(a), sa = Math.sin(a);
      v.seg(ca * s, s * 0.5, sa * s, ca * r, s * 0.5, sa * r, s * 0.62, (X, Y, Z) => (Math.hypot(X, Z) > r * 0.72 ? tip : col));
    }
    v.cylY(0, 0, 0, s * 2, s * 1.3, K.g2);
    v.cylY(0, 0, s, s * 2, s * 0.6, K.st2);
    return v;
  });
}
// thin guard ring around a rotor (two orange markers), spokes to the hub
function guardGS(key, s, r, col = K.g3, acc = K.y1, spokes = 3, thick = 1) {
  return gset(`${key}.${s}.${r}`, () => {
    const v = new VB(s, -r - s * 2, -s * 2, -r - s * 2, r + s * 2, s * 2, r + s * 2);
    v.cylY(0, 0, 0, s * thick, r, (X, Y, Z) => (Math.abs(X) < r * 0.3 ? acc : col), r - s * 1.05);
    for (let n = 0; n < spokes; n++) { const a = n * Math.PI * 2 / spokes + Math.PI / 6; v.seg(Math.sin(a) * s * 1.5, s * 0.5, Math.cos(a) * s * 1.5, Math.sin(a) * (r - s), s * 0.5, Math.cos(a) * (r - s), s * 0.5, K.g2); }
    return v.weather({ seed: 5, edge: 0.1 });
  });
}
// charred stump left where a part was shot off
function stubGS(key, s, r) {
  return gset(`stub.${s}.${r}`, () => {
    const v = new VB(s, -r, -r, -r, r, r, r);
    for (let n = 0; n < 7; n++) { const a = n * 2.4, l = r * (0.4 + hash3(n, 1, 2) * 0.6); v.seg(0, 0, 0, Math.sin(a) * l, (hash3(n, 3, 1) - 0.5) * r, Math.cos(a) * l, s * 0.6, n % 3 ? K.g0 : K.r0); }
    v.box(-s * 0.5, 0, -s * 0.5, s * 0.5, s, s * 0.5, K.EXH);
    return v;
  });
}
// muzzle flash star (shown at random while firing); points along +z
function flashGS(key, s, r, a = K.FLM, b = K.FLM2) {
  return gset(`flash.${s}.${r}.${a}`, () => {
    const v = new VB(s, -r, -r, -s, r, r, r * 1.6);
    v.seg(0, 0, 0, 0, 0, r * 1.5, s * 0.8, a);
    v.seg(-r, 0, s, r, 0, s, s * 0.55, b); v.seg(0, -r, s, 0, r, s, s * 0.55, b);
    return v;
  });
}
// gatling: n barrels around +z axis, length L, ring radius rr
function gatlingGS(key, s, L, rr, n = 6, br = null) {
  return gset(key, () => {
    br = br || s * 0.7;
    const R = rr + br + s;
    const v = new VB(s, -R, -R, -s, R, R, L + s);
    for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; v.cylZ(Math.cos(a) * rr, Math.sin(a) * rr, 0, L, br, K.st, br * 0.0); }
    v.cylZ(0, 0, 0, L * 0.92, rr * 0.55, K.g1);
    v.cylZ(0, 0, L * 0.12, L * 0.22, R - s * 0.5, K.g3); v.cylZ(0, 0, L * 0.72, L * 0.8, R - s * 0.5, K.g3);
    for (let i = 0; i < n; i++) { const a = i * Math.PI * 2 / n; v.cylZ(Math.cos(a) * rr, Math.sin(a) * rr, L - s, L, br * 0.6, K.g0); }
    return v.weather({ seed: 9, noise: 0.05 });
  });
}
// generic armoured limb along +z (0..L): tapered core, plating bands, hydraulic piston on top, cable
function limbGS(key, s, L, w0, h0, w1, h1, o = {}) {
  return gset(key, () => {
    const W = Math.max(w0, w1) + s * 3, H = Math.max(h0, h1) + s * 4;
    const v = new VB(s, -W, -H, -s * 2, W, H, L + s * 3);
    const col = o.col || K.g3, col2 = o.col2 || K.g2;
    v.fillIf(-W, -H, 0, W, H, L, (X, Y, Z) => {
      const u = Z / L, w = w0 + (w1 - w0) * u, h = h0 + (h1 - h0) * u;
      return Math.abs(X) <= w && Math.abs(Y) <= h && (Math.abs(X) / w + Math.abs(Y) / h) <= 1.55;
    }, (X, Y, Z, i, j, k) => {
      const band = Math.floor(Z / (o.band || L / 4));
      if ((k % Math.max(2, Math.round((o.band || L / 4) / s))) === 0) return K.g1;   // plate seams
      return band % 2 ? col : col2;
    });
    if (o.piston !== false) {
      const pr = Math.max(s * 0.6, Math.min(w0, w1) * 0.35);           // hydraulic ram along the top
      v.cylZ(0, h0 + pr * 0.6, L * 0.08, L * 0.5, pr * 1.25, K.g1);
      v.cylZ(0, (h0 + h1) / 2 + pr * 0.4, L * 0.5, L * 0.86, pr * 0.8, K.st2);
    }
    if (o.cable !== false) v.seg(-w0 * 0.9 - s * 0.4, 0, L * 0.05, -w1 * 0.9 - s * 0.4, 0, L * 0.95, s * 0.55, K.cab);
    if (o.haz) v.paintBox(-W, -H, L * o.haz[0], W, H, L * o.haz[1], (X, Y, Z, i, j, k) => (Y > 0 ? K.y1 : undefined));
    if (o.tip) o.tip(v, L);
    return v.weather({ seed: o.seed || 3, rust: o.rust ?? 0.12 });
  });
}
// knee / hip actuator: yellow drum along x, dark centre band with a thin glowing (weak point) ring
function jointGS(key, s, r, w, glow = true) {
  return gset(key, () => {
    const v = new VB(s, -w - s * 2, -r - s * 2, -r - s * 2, w + s * 2, r + s * 2, r + s * 2);
    v.cylX(0, 0, -w, w, r, K.y0);
    v.cylX(0, 0, -w * 0.4, w * 0.4, r + s * 0.3, K.g1);
    if (glow) v.cylX(0, 0, -w * 0.15 - s * 0.5, w * 0.15 + s * 0.5, r + s * 0.6, K.HOT, r - s);
    v.cylX(0, 0, -w - s, w + s, r * 0.4, K.st2);
    v.paint((X, Y, Z, i, j, k, c) => (c === K.y0 && Math.abs(Math.atan2(Y, Z) % (Math.PI / 3)) < 0.18 ? K.y2 : undefined));
    return v.weather({ seed: 11, chip: 0.15 });
  });
}

// ============================================================================= MODELS
const MODELS = {};
const BASE_R = {};
// common: rotor set registration (guard + spinning blades + stub on break)
function rotorSet(R, parent, pos, gs, names, y = 0.1) {
  const out = [];
  for (const [x, z] of pos) {
    const g = R.g(parent, x, y, z);
    const gd = R.pm(gs.guard(z), g, 0, -0.02, 0), bl = R.pm(gs.blades, g, 0, 0.01, 0), st = R.pm(gs.stub, g, 0, -0.05, 0);
    bl.g.rotation.y = Math.random() * 6;
    const r = { x, z, bl: bl.g, dir: x * z > 0 ? 1 : -1, broken: false };
    R.zone(typeof names === 'function' ? names(x, z) : names, x, z, { hide: [gd.g, bl.g], show: [st.g], fn: () => { r.broken = true; } });
    out.push(r);
  }
  return out;
}
// common flyer attitude: tilt into motion, idle sway, list towards shot-off rotors
function flyerTilt(R, hull, rotors, dt, s, t, k = 1, spin = 30) {
  let bx = 0, bz = 0;
  for (const r of rotors) { if (r.broken) { bx += Math.sign(r.x); bz += Math.sign(r.z); continue; } r.bl.rotation.y += (s.stunned ? spin * 0.25 : spin + 8 * R.al + 6 * R.mv) * dt * r.dir; }
  const steady = 1 - clamp(s.tele || 0, 0, 1) * 0.75;
  hull.rotation.x = damp(hull.rotation.x, (0.22 * R.mv + bz * 0.22 + Math.sin(t * 1.7) * 0.03 * steady) * k, 3.5, dt);
  hull.rotation.z = damp(hull.rotation.z, (-bx * 0.22 + Math.sin(t * 2.1) * 0.045 * steady) * k, 3.5, dt);
}

// ----------------------------------------------------------------------------- BUZZKILL (wazp, key 'wasp'): quad-rotor gun drone
BASE_R.wasp = 0.6;
MODELS.wasp = (R) => {
  const s = 0.05;
  R.refSpeed = 5.5;
  const body = gset('wasp.body', () => {
    const v = new VB(s, -0.65, -0.25, -0.65, 0.65, 0.35, 0.65);
    for (const sz of [1, -1]) {
      v.seg(-0.12, 0, 0.12 * sz, -0.46, 0.02, 0.46 * sz, 0.045, K.g3);                // arm tube
      v.seg(-0.13, 0.05, 0.09 * sz, -0.42, 0.065, 0.42 * sz, 0.022, K.cab);           // power cable
      v.seg(-0.29, 0.0, 0.29 * sz, -0.35, 0.012, 0.35 * sz, 0.058, K.y1);             // orange collar
      v.cylY(-0.5, 0.5 * sz, -0.1, 0.07, 0.072, K.g1);                                // motor can
      v.cylY(-0.5, 0.5 * sz, -0.04, 0.01, 0.086, K.g4);                               // cooling band
      v.cylY(-0.5, 0.5 * sz, 0.07, 0.1, 0.045, K.g5);
      v.cylY(-0.5, 0.5 * sz, -0.16, -0.1, 0.035, K.st);
      v.seg(-0.12, -0.08, 0.18 * sz, -0.2, -0.2, 0.22 * sz, 0.025, K.g2);            // landing claws
    }
    v.mirrorX();
    v.box(-0.15, -0.1, -0.3, 0.15, 0.1, 0.25, K.g2, { ch: 1, cht: 1, chb: 1 });      // fuselage
    v.box(-0.12, 0.1, -0.25, 0.12, 0.15, 0.2, K.g4, { ch: 1 });                        // top armour
    v.paintBox(-0.12, 0.1, -0.25, 0.12, 0.15, 0.2, seam(3, 'z', K.g3, 1));
    v.paintBox(-0.12, 0.1, -0.25, 0.12, 0.15, 0.2, (X, Y, Z, i, j, k) => (Math.abs(X) > 0.08 && k % 3 === 0 ? K.st : undefined));
    v.paintBox(-0.12, 0.1, -0.25, 0.12, 0.15, 0.1, (X, Y, Z) => (Math.abs(X) > 0.05 ? K.st2 : undefined));   // twin racing stripes
    v.box(-0.05, 0.15, -0.2, 0.05, 0.2, 0.05, K.g3);                                  // spine
    v.box(-0.12, 0.1, 0.1, 0.12, 0.17, 0.15, K.y1); v.box(-0.05, 0.12, 0.1, 0.0, 0.17, 0.15, K.bk);   // orange band
    v.box(-0.17, -0.06, -0.2, 0.17, 0.06, 0.1, K.g3); v.paintBox(-0.18, -0.06, -0.2, 0.18, 0.06, 0.1, seam(2, 'z', K.g1));   // side plates
    // sensor head: dark face, protruding eye cluster
    v.box(-0.1, -0.1, 0.25, 0.1, 0.1, 0.4, K.g3, { ch: 1, cht: 1 });
    v.box(-0.1, 0.1, 0.25, 0.1, 0.15, 0.35, K.g4, { ch: 1 });
    v.paintBox(-0.1, -0.1, 0.35, 0.1, 0.1, 0.4, K.g1);
    v.box(-0.1, -0.05, 0.38, 0.1, 0.0, 0.45, K.g0);                                    // slit visor: dark lid
    v.box(-0.1, 0.0, 0.38, 0.1, 0.05, 0.45, K.EYE); v.box(-0.05, 0.0, 0.4, 0.05, 0.05, 0.45, K.EYE2);
    v.seg(0.06, 0.15, -0.15, 0.12, 0.32, -0.22, 0.02, K.st); v.box(0.1, 0.3, -0.25, 0.15, 0.35, -0.2, K.RED);   // antenna
    // tail: vents + tail light
    v.box(-0.1, -0.07, -0.42, 0.1, 0.07, -0.3, K.g2, { ch: 1 });
    v.paintBox(-0.1, -0.07, -0.43, 0.1, 0.07, -0.38, seam(2, 'y', K.g0));
    v.box(-0.05, 0.07, -0.4, 0.05, 0.1, -0.3, K.y1);
    v.box(-0.025, 0.0, -0.45, 0.025, 0.05, -0.42, K.RED);
    v.box(-0.08, -0.15, -0.15, 0.08, -0.1, 0.12, K.g1); v.paintBox(-0.08, -0.15, -0.15, 0.08, -0.1, 0.12, seam(2, 'x', K.g0));
    return v.weather({ seed: 21, rust: 0.1 });
  });
  const gun = gset('wasp.gun', () => {
    const v = new VB(s, -0.1, -0.1, -0.1, 0.1, 0.1, 0.4);
    v.box(-0.05, -0.05, -0.05, 0.05, 0.05, 0.12, K.g1, { ch: 1 });
    v.cylZ(-0.025, 0, 0.05, 0.34, 0.03, K.st); v.cylZ(0.025, 0, 0.05, 0.34, 0.03, K.st);
    v.box(-0.05, -0.05, 0.3, 0.05, 0.05, 0.35, K.g0);
    v.seg(0.05, 0, 0, 0.08, -0.05, -0.08, 0.02, K.cab);
    return v.weather({ seed: 2 });
  });
  const kit = { guard: () => guardGS('wasp.guard', s, 0.24), blades: bladesGS('blades', s, 0.21, 2), stub: stubGS('', s, 0.1) };
  const hull = R.g(R.top); R.jit = hull;
  R.pm(body, hull);
  const gunP = R.pm(gun, hull, 0, -0.13, 0.2);
  R.flash(flashGS('', s, 0.12), gunP.g, 0, 0, 0.37);
  const rotors = rotorSet(R, hull, [[-0.5, 0.5], [-0.5, -0.5], [0.5, 0.5], [0.5, -0.5]], kit, 'rotor');
  R.anim = (dt, s, t) => {
    flyerTilt(R, hull, rotors, dt, s, t, 1, 30);
    gunP.g.position.z = 0.2 - (s.firing ? Math.random() * 0.04 : 0);
    gunP.g.rotation.x = damp(gunP.g.rotation.x, (s.tele || s.firing) ? 0.25 : 0.05, 5, dt);
  };
};

// ----------------------------------------------------------------------------- MIDDLE MANAGER (hornett, key 'hornet'): armoured stun drone (+ Burnout / fyrefly flamer variant)
BASE_R.hornet = 0.75;
MODELS.hornet = (R, def) => {
  const s = 0.05, flamer = def.variant === 'flamer';
  R.refSpeed = 4.5;
  const vk = flamer ? 'hornet.f.' : 'hornet.';
  const zfF = (X, Y) => 0.66 - 0.13 * (X / 0.52) ** 2 - 0.4 * Math.max(0, Y - 0.12) ** 1;
  const body = gset(vk + 'body', () => {
    const v = new VB(s, -0.85, -0.3, -0.9, 0.85, 0.35, 0.9);
    for (const sz of [1, -1]) {
      v.seg(-0.15, 0, 0.12 * sz, -0.53, 0.0, 0.48 * sz, 0.055, K.g3);
      v.seg(-0.16, 0.06, 0.1 * sz, -0.48, 0.05, 0.42 * sz, 0.026, K.cab);
      v.cylY(-0.55, 0.5 * sz, -0.11, 0.07, 0.085, K.g1);
      v.cylY(-0.55, 0.5 * sz, -0.05, 0.0, 0.1, sz > 0 ? K.g4 : K.y1);
      v.cylY(-0.55, 0.5 * sz, 0.07, 0.11, 0.045, K.g5);
      if (sz < 0) v.cylY(-0.55, -0.5, 0.06, 0.1, 0.09, flamer ? K.g4 : K.HOT, 0.05);       // bare rear motor coils (weak spot)
    }
    v.mirrorX();
    v.box(-0.2, -0.13, -0.38, 0.2, 0.14, 0.32, K.g2, { ch: 2, cht: 1, chb: 1 });       // fuselage
    v.box(-0.15, 0.14, -0.32, 0.15, 0.2, 0.26, K.g4, { ch: 1, cht: 1 });               // top armour
    v.paintBox(-0.15, 0.14, -0.32, 0.15, 0.2, 0.26, seam(4, 'z', K.g3, 1));
    v.paintBox(-0.15, 0.14, -0.32, 0.15, 0.2, 0.26, (X, Y, Z, i, j, k) => ((Math.abs(X) > 0.1 && k % 4 === 3) ? K.st : undefined));
    v.box(-0.05, 0.2, -0.28, 0.05, 0.25, 0.16, K.g3);                                    // spine
    v.box(-0.15, 0.14, -0.1, 0.15, 0.21, -0.05, K.y1);
    v.box(-0.2, -0.08, -0.48, 0.2, 0.1, -0.36, K.g1, { ch: 1 });                          // exhaust block
    v.paintBox(-0.2, -0.08, -0.5, 0.2, 0.1, -0.44, seam(2, 'x', K.g0));
    v.box(-0.15, -0.05, -0.5, -0.1, 0.0, -0.46, K.EXH); v.box(0.1, -0.05, -0.5, 0.15, 0.0, -0.46, K.EXH);
    v.box(-0.025, 0.1, -0.46, 0.025, 0.15, -0.42, K.RED);
    // armoured front slab: curved, light plate, orange top trim, hazard ends, flush sensor visor
    v.fillIf(-0.52, -0.18, 0.4, 0.52, 0.24, 0.72, (X, Y, Z) => {
      const zf = zfF(X, Y);
      return Math.abs(X) < 0.52 && Y >= -0.18 && Y < 0.24 && Z < zf && Z >= zf - 0.1 && !(Math.abs(X) > 0.42 && Y > 0.14);
    }, (X, Y, Z, i, j, k) => {
      const outer = Z >= zfF(X, Y) - s, ax = Math.abs(X);
      if (outer && ax < 0.15 && Y >= 0 && Y < 0.05) return ax < 0.05 ? K.g0 : K.EYE;      // two-lens visor ("reading glasses")
      if (outer && ax < 0.2 && Y >= -0.05 && Y < 0.1) return K.g0;
      if (!flamer && outer && Y < -0.05 && ax < (Y < -0.15 ? 0.1 : 0.05)) return K.tie;     // the necktie
      if (Y >= 0.14) return flamer ? haz(2, K.y1, K.bk)(X, Y, Z, i, j, k) : K.y1;
      if (Math.abs(X) > 0.4) return haz(2)(X, Y, Z, i, j, k);
      if (Math.abs(Math.abs(X) - 0.27) < 0.025) return K.g3;
      return K.g5;
    });
    v.paintBox(-0.1, 0, 0.4, -0.05, 0.05, 0.75, (X, Y, Z, i, j, k, c) => (c === K.EYE ? K.EYE2 : undefined));
    v.paintBox(0.05, 0, 0.4, 0.1, 0.05, 0.75, (X, Y, Z, i, j, k, c) => (c === K.EYE ? K.EYE2 : undefined));
    v.paintBox(-0.52, -0.18, 0.4, 0.52, 0.14, 0.75, (X, Y, Z, i, j, k, c) => (c === K.g5 && Math.abs(X) > 0.3 && (j % 3 === 1) && (i % 4 === 1) ? K.st : undefined));
    v.seg(-0.18, 0.05, 0.3, -0.25, 0.05, 0.5, 0.04, K.g2); v.seg(0.18, 0.05, 0.3, 0.25, 0.05, 0.5, 0.04, K.g2);   // plate brackets
    // armoured cowls over the front rotors
    for (const sx of [-1, 1]) v.fillIf(sx * 0.82, 0.12, 0.2, sx * 0.28, 0.17, 0.8, (X, Y, Z) => Math.hypot(X - sx * 0.55, Z - 0.5) < 0.28 && Z > 0.48, (X, Y, Z) => (Math.hypot(X - sx * 0.55, Z - 0.5) > 0.22 ? K.g3 : K.g4));
    if (flamer) v.box(-0.15, 0.2, -0.55, 0.15, 0.25, -0.3, K.g1);
    if (flamer) { v.box(-0.1, 0.15, 0.16, 0.1, 0.2, 0.26, K.g0); v.box(-0.1, 0.15, 0.2, -0.05, 0.21, 0.25, K.EXH); }   // low-battery strip: one cell left
    return v.weather({ seed: 31, rust: 0.12 });
  });
  const gun = gset(vk + 'gun', () => {
    const v = new VB(s, -0.12, -0.12, -0.15, 0.12, 0.12, 0.45);
    v.box(-0.08, -0.08, -0.12, 0.08, 0.06, 0.1, K.g1, { ch: 1 });
    if (flamer) {
      v.cylZ(0, 0, 0.05, 0.38, 0.05, K.g3); v.cylZ(0, 0, 0.32, 0.4, 0.07, K.g1, 0.03);
      v.cylZ(0, 0, 0.36, 0.4, 0.03, K.FLM2); v.seg(0.06, 0.04, -0.1, 0.06, 0.06, 0.3, 0.02, K.cu);
    } else {
      v.cylZ(0, 0, 0.05, 0.4, 0.04, K.st);
      for (let z = 0.12; z < 0.34; z += 0.1) v.cylZ(0, 0, z, z + 0.05, 0.075, K.cu);
      v.cylZ(0, 0, 0.38, 0.42, 0.04, K.BLUE);
    }
    return v.weather({ seed: 4 });
  });
  const kit = { guard: (z) => (z > 0 ? guardGS('hornet.guardF', s, 0.26, K.g4, K.g4, 4, 2) : guardGS('hornet.guardR', s, 0.26, K.g3, K.y1, 3)), blades: bladesGS('blades', s, 0.23, 3), stub: stubGS('', s, 0.1) };
  const hull = R.g(R.top); R.jit = hull;
  R.pm(body, hull);
  const gunP = R.pm(gun, hull, 0, -0.16, 0.22);
  R.flash(flashGS('', s, flamer ? 0.2 : 0.12, flamer ? K.FLM2 : K.FLM), gunP.g, 0, 0, 0.42);
  const rotors = rotorSet(R, hull, [[-0.55, 0.5], [0.55, 0.5], [-0.55, -0.5], [0.55, -0.5]], kit, (x, z) => [z > 0 ? 'front_rotor' : 'rear_rotor', 'thruster', 'rotor'], 0.12);
  let tank = null, tankOpen = 0;
  if (flamer) {
    const tg = gset('hornet.tank', () => {
      const v = new VB(s, -0.2, -0.15, -0.25, 0.2, 0.15, 0.25);
      v.cylZ(0, 0, -0.2, 0.2, 0.11, K.y0); v.cylZ(0, 0, -0.12, 0.12, 0.115, K.HOT);
      v.cylZ(0, 0, -0.22, -0.2, 0.07, K.g1); v.cylZ(0, 0, 0.2, 0.22, 0.07, K.g1);
      for (let z = -0.15; z < 0.2; z += 0.15) v.cylZ(0, 0, z, z + 0.04, 0.125, K.g2);
      return v.weather({ seed: 6, chip: 0.1 });
    });
    const cover = gset('hornet.tankcover', () => {
      const v = new VB(s, -0.2, 0, -0.3, 0.2, 0.1, 0.3);
      v.box(-0.18, 0, -0.28, 0.18, 0.05, 0.28, K.g4, { ch: 1 }); v.paintBox(-0.18, 0, -0.28, 0.18, 0.05, 0.28, seam(3, 'z', K.g3));
      v.box(-0.18, 0.0, 0.18, 0.18, 0.06, 0.28, K.y1);
      return v.weather({ seed: 8 });
    });
    tank = R.pm(tg, hull, 0, 0.3, -0.42);
    const cv = R.g(hull, 0, 0.3, -0.15); const cvp = R.pm(cover, cv, 0, 0.1, -0.27);
    tank.cover = cv;
    R.zone('fuel_tank', 0, -0.45, { hide: [tank.g, cvp.g], show: [R.pm(stubGS('', s, 0.16), hull, 0, 0.28, -0.42).g] });
  }
  R.anim = (dt, s, t) => {
    flyerTilt(R, hull, rotors, dt, s, t, 0.8, 26);
    gunP.g.position.z = 0.22 - (s.firing && !flamer ? Math.random() * 0.05 : 0);
    if (tank) { tankOpen = damp(tankOpen, (s.tele > 0 || s.firing) ? 1 : 0, 5, dt); tank.cover.rotation.x = -tankOpen * 1.9; }
  };
};

// ----------------------------------------------------------------------------- NARC (snytch, key 'snitch'): scout drone with a big searchlight (+ Plus One / spottr)
BASE_R.snitch = 0.5;
MODELS.snitch = (R, def) => {
  const s = 0.05, spot = def.behavior === 'spotter';
  R.refSpeed = 4.5;
  const vk = spot ? 'snitch.s.' : 'snitch.';
  const body = gset(vk + 'body', () => {
    const v = new VB(s, -0.6, -0.3, -0.6, 0.6, 0.45, 0.6);
    for (const sz of [1, -1]) {
      v.seg(-0.1, 0.02, 0.1 * sz, -0.4, 0.04, 0.4 * sz, 0.035, K.g3);
      v.seg(-0.26, 0.03, 0.26 * sz, -0.31, 0.04, 0.31 * sz, 0.05, K.y1);
      v.cylY(-0.42, 0.42 * sz, -0.06, 0.06, 0.06, K.g1);
      v.cylY(-0.42, 0.42 * sz, 0.06, 0.09, 0.04, K.g5);
    }
    v.mirrorX();
    v.ell(0, 0.0, -0.02, 0.2, 0.14, 0.22, K.g2);
    v.ell(0, 0.06, -0.04, 0.17, 0.11, 0.19, (X, Y, Z, i, j, k) => (k % 3 === 0 ? K.g3 : K.g4));
    v.box(-0.2, -0.02, -0.05, 0.2, 0.03, 0.05, K.y1);                                  // equator band
    v.box(-0.05, -0.2, -0.05, 0.05, -0.1, 0.05, K.g1);
    v.box(-0.1, 0.0, -0.3, 0.1, 0.1, -0.2, K.g1); v.paintBox(-0.1, 0.0, -0.31, 0.1, 0.1, -0.27, seam(2, 'y', K.g0));
    v.seg(-0.08, 0.14, -0.1, -0.12, 0.4, -0.16, 0.022, K.st); v.box(-0.15, 0.4, -0.2, -0.1, 0.45, -0.15, K.RED);    // antennae
    v.seg(0.08, 0.14, -0.12, 0.1, 0.3, -0.2, 0.022, K.st);
    if (spot) { v.box(-0.05, -0.18, 0.05, 0.05, -0.1, 0.3, K.g1); v.box(-0.025, -0.15, 0.3, 0.025, -0.1, 0.34, K.RED); v.cylY(0, -0.05, 0.12, 0.16, 0.06, K.y0); }
    if (spot) v.cylY(0, -0.05, 0.16, 0.34, 0.07, (X, Y, Z, i, j, k) => (Y > 0.29 ? K.st2 : j % 2 ? K.y0 : K.st2), 0, 0.012);   // party hat
    return v.weather({ seed: 41, rust: 0.1 });
  });
  const lamp = gset('snitch.lamp', () => {
    const v = new VB(s, -0.2, -0.2, -0.1, 0.2, 0.2, 0.25);
    v.cylZ(0, 0, -0.05, 0.12, 0.15, K.g2); v.cylZ(0, 0, 0.1, 0.2, 0.17, K.g4, 0.125);
    v.cylZ(0, 0, 0.1, 0.17, 0.13, K.EYE); v.cylZ(0, 0, 0.12, 0.18, 0.06, K.EYE2);
    v.box(-0.1, 0.12, -0.05, 0.1, 0.18, 0.05, K.g3); v.box(-0.1, 0.17, -0.05, 0.1, 0.2, 0.05, K.y1);
    for (const x of [-0.2, 0.15]) v.box(x, -0.05, -0.05, x + 0.05, 0.05, 0.1, K.g1);
    return v.weather({ seed: 2 });
  });
  const siren = gset(spot ? 'snitch.siren.s' : 'snitch.siren', () => {
    const v = new VB(s, -0.1, 0, -0.1, 0.1, 0.15, 0.1);
    v.box(-0.05, 0, -0.05, 0.05, 0.05, 0.05, K.g1);
    if (spot) v.box(-0.05, 0.05, -0.05, 0.0, 0.1, 0.0, K.EYE);
    else { v.box(-0.1, 0.05, -0.05, 0.0, 0.1, 0.0, K.EYE); v.box(0.0, 0.05, -0.05, 0.1, 0.1, 0.0, K.BLUE); }   // two-tone light bar
    return v;
  });
  const kit = { guard: () => guardGS('snitch.guard', s, 0.19, K.g3, K.g3, 3), blades: bladesGS('blades', s, 0.16, 2), stub: stubGS('', s, 0.08) };
  const hull = R.g(R.top); R.jit = hull;
  R.pm(body, hull);
  const lampG = R.g(hull, 0, -0.06, 0.2); R.pm(lamp, lampG);
  const sir = R.pm(siren, hull, 0.05, 0.15, -0.05);
  const rotors = rotorSet(R, hull, [[-0.42, 0.42], [0.42, 0.42], [-0.42, -0.42], [0.42, -0.42]], kit, 'rotor');
  R.anim = (dt, s, t) => {
    flyerTilt(R, hull, rotors, dt, s, t, 1, 32);
    const gz = clamp(wrapA(s.gaze || 0), -1.2, 1.2);
    lampG.rotation.y = damp(lampG.rotation.y, gz, 6, dt);
    lampG.rotation.x = damp(lampG.rotation.x, 0.12 + Math.sin(t * 0.9) * 0.08, 4, dt);
    sir.g.rotation.y += dt * (2 + (s.tele || 0) * 14);
    sir.g.scale.y = 1 + (s.tele > 0 ? 0.4 * Math.abs(Math.sin(t * 9)) : 0);
  };
};

// ----------------------------------------------------------------------------- LATE FEE (tikk, key 'tick'): six-legged latcher
BASE_R.tick = 0.3;
MODELS.tick = (R) => {
  const s = 0.04;
  R.refSpeed = 6.5;
  const body = gset('tick.body', () => {
    const v = new VB(s, -0.2, -0.16, -0.28, 0.2, 0.2, 0.28);
    v.ell(0, 0.0, -0.02, 0.12, 0.08, 0.15, K.g1);
    v.ell(0, 0.04, -0.04, 0.135, 0.09, 0.17, (X, Y, Z, i, j, k) => (k % 3 === 0 ? K.g2 : Math.abs(X) < 0.04 ? K.g5 : K.g4));
    v.paintBox(-0.2, -0.02, -0.25, 0.2, 0.02, 0.25, barcode('z', K.y1, K.bk));        // barcoded band
    v.ell(0, 0.02, 0.12, 0.08, 0.065, 0.07, K.g2);
    v.box(-0.08, 0.0, 0.12, 0.08, 0.04, 0.2, K.g0);                                    // slit visor: dark lid
    v.box(-0.08, 0.04, 0.12, 0.08, 0.08, 0.2, K.EYE); v.box(-0.04, 0.04, 0.16, 0.04, 0.08, 0.24, K.EYE2);
    v.seg(-0.03, -0.02, 0.16, -0.02, -0.08, 0.23, 0.022, K.st); v.seg(0.03, -0.02, 0.16, 0.02, -0.08, 0.23, 0.022, K.st);
    v.cylZ(0, 0.11, -0.18, -0.04, 0.045, K.HOT); v.cylZ(0, 0.11, -0.2, -0.18, 0.05, K.g1); v.cylZ(0, 0.11, -0.04, -0.02, 0.05, K.g1);   // tikk pod
    v.box(-0.06, 0.08, -0.12, -0.02, 0.12, -0.08, K.g1); v.box(0.02, 0.08, -0.12, 0.06, 0.12, -0.08, K.g1);
    return v.weather({ seed: 51, rust: 0.08, edge: 0.2 });
  });
  const upper = limbGS('tick.up', s, 0.16, 0.022, 0.022, 0.02, 0.02, { piston: false, cable: false, col: K.g2, col2: K.g3, band: 0.08, rust: 0 });
  const lower = limbGS('tick.lo', s, 0.25, 0.02, 0.02, 0.01, 0.01, { piston: false, cable: false, col: K.g3, col2: K.g2, band: 0.1, rust: 0, tip: (v, L) => v.box(-0.02, -0.02, L - 0.04, 0.02, 0.02, L + 0.02, K.st) });
  const joint = gset('tick.knee', () => { const v = new VB(s, -0.04, -0.04, -0.04, 0.04, 0.04, 0.04); v.box(-0.04, -0.04, -0.04, 0.04, 0.04, 0.04, K.g4); v.box(0, 0, 0, 0.04, 0.04, 0.04, K.y1); return v; });
  const bodyG = R.g(R.top, 0, 0.19, 0);
  const hullG = R.g(bodyG); R.jit = hullG;
  R.pm(body, hullG);
  const legs = [];
  const zs = [0.07, 0.0, -0.07], fz = [0.2, 0.01, -0.19];
  for (const sx of [-1, 1]) for (let n = 0; n < 3; n++) legs.push(new Leg(R, bodyG, [sx * 0.08, -0.02, zs[n]], [sx * 0.27, 0, fz[n]], 0.16, 0.25, { upper, lower, joint }, { phase: ((n + (sx > 0 ? 1 : 0)) % 2) * 0.5 }));
  R.blink = (t, s, I) => (s.tele > 0 ? ((t * (3 + s.tele * 12)) % 1 < 0.5 ? 2.2 : 0.35) : I);
  R.anim = (dt, s, t) => {
    const c = R.gait(dt, s, legs, { A: 0.06, H: 0.07, duty: 0.5, maxHz: 7, minHz: 1.5 });
    bodyG.position.y = 0.19 + Math.abs(Math.sin(c * Math.PI * 4)) * 0.012 * R.gmv;
    R.lp = damp(R.lp || 0, s.leaping ? 1 : 0, 10, dt);
    bodyG.rotation.x = -R.lp * 0.5 + (s.tele || 0) * 0.08;
    if (R.lp > 0.01) for (const L of legs) L.tgt.set(L.rest.x * (1 - R.lp * 0.2), L.rest.y + R.lp * 0.16, L.rest.z + R.lp * 0.12);
    for (const L of legs) L.solve();
  };
};

// ----------------------------------------------------------------------------- POP-UP AD (popp, key 'pop'): rolling proximity bomb (+ Rolling Blackout / komet)
BASE_R.pop = 0.35;
MODELS.pop = (R, def) => {
  const s = 0.04, komet = def.variant === 'komet', Rb = 0.34, vk = komet ? 'pop.k.' : 'pop.';
  R.refSpeed = 7.5;
  const half = (side) => gset(vk + 'shell' + side, () => {
    const v = new VB(s, -0.36, -0.36, -0.36, 0.36, 0.36, 0.36);
    v.fillIf(-0.36, -0.36, -0.36, 0.36, 0.36, 0.36, (X, Y, Z) => { const r = Math.hypot(X, Y, Z); return r <= Rb && r >= 0.22 && X * side >= 0.04; },
      (X, Y, Z, i, j, k) => {
        const th = Math.atan2(Y, Z), ax = Math.abs(X), q = Math.floor(((th + Math.PI) / (Math.PI * 2)) * 4 + 0.5) % 4;
        if (Math.abs(Math.sin(th * 2)) < 0.12) return K.g1;                         // panel seams
        if (Math.abs(ax - 0.2) < 0.022) return K.g1;                                 // latitude seam
        if (ax > 0.28) return (i + j + k) % 3 === 0 ? K.st : K.g4;                   // pole hub + bolts
        if (komet) return q % 2 ? K.g3 : (ax > 0.2 ? K.r2 : K.g2);
        if (ax < 0.2) return q % 2 ? K.y1 : K.y0;
        return q % 2 ? K.g3 : K.g4;
      });
    if (komet) v.paint((X, Y, Z, i, j, k, c) => (Math.abs(Math.abs(X) - 0.12) < 0.02 && Math.hypot(Y, Z) > 0.3 ? ((Math.floor((Math.atan2(Y, Z) + Math.PI) * 2.5) & 1) ? K.y0 : K.bk) : undefined));   // caution-tape rings
    if (!komet && side > 0) v.paint((X, Y, Z) => (X > 0.28 && Math.hypot(Y, Z) < 0.075 ? K.RED : undefined));   // notification dot (1 unread)
    return v.weather({ seed: komet ? 62 : 61, rust: komet ? 0.22 : 0.06, edge: 0.18 });
  });
  const core = gset('pop.core', () => {
    const v = new VB(s, -0.24, -0.24, -0.24, 0.24, 0.24, 0.24);
    v.ell(0, 0, 0, 0.2, 0.2, 0.2, (X, Y, Z) => (Math.abs(X) < 0.04 && Math.hypot(Y, Z) > 0.15 ? K.EYE : K.g1));
    v.box(-0.04, -0.04, 0.16, 0.04, 0.04, 0.22, K.EYE2);
    v.box(-0.08, -0.04, 0.17, -0.04, 0.04, 0.2, K.EYE); v.box(0.04, -0.04, 0.17, 0.08, 0.04, 0.2, K.EYE);
    return v;
  });
  const roll = R.g(R.top, 0, 0.35, 0); R.jit = roll;
  const halves = [R.pm(half(-1), roll), R.pm(half(1), roll)];
  R.pm(core, R.top, 0, 0.35, 0);
  R.blink = (t, s, I) => (s.tele > 0 ? ((t * (2 + s.tele * 10)) % 1 < 0.45 ? 2.4 : 0.25) : 0.7 + 0.3 * Math.sin(t * 4));
  R.anim = (dt, s, t) => {
    const sp = s.moving ? (s.speed ?? 3) / R.k : 0;
    if (!s.stunned) roll.rotation.x += sp * dt / Rb;
    const te = clamp(s.tele || 0, 0, 1), split = komet ? te * 0.09 : te * 0.02;
    halves[0].g.position.x = -split; halves[1].g.position.x = split;
    roll.position.y = 0.35 + (te > 0 ? rnd(0.006 * te) : 0);
  };
};

// ----------------------------------------------------------------------------- HOT TAKE (fyreball, key 'fireball'): armoured roller that opens to flame
BASE_R.fireball = 0.45;
MODELS.fireball = (R) => {
  const s = 0.05, Rb = 0.44;
  R.refSpeed = 5;
  const shell = (top) => gset('fireball.shell' + (top ? 'T' : 'B'), () => {
    const v = new VB(s, -0.45, -0.45, -0.45, 0.45, top ? 0.55 : 0.45, 0.45);
    v.fillIf(-0.45, -0.45, -0.45, 0.45, 0.45, 0.45, (X, Y, Z) => { const r = Math.hypot(X, Y, Z); return r <= Rb && r >= 0.31 && (top ? Y >= 0 : Y < 0); },
      (X, Y, Z, i, j, k) => {
        const lon = Math.atan2(X, Z), lat = Math.abs(Y) / Rb, sl = Math.abs(Math.sin(lon * 2));
        if (lat < 0.13) return haz(2, K.y1, K.g1)(X, Y, Z, i, j, k);              // hazard-striped rim band
        if (sl < 0.1 && lat < 0.86) return K.g0;                                    // plate seams (carved below)
        if (top && lat > 0.42 && lat < 0.6 && sl > 0.35 && sl < 0.75 && (j % 2 === 0)) return K.EXH;   // heat vents
        if (lat > 0.86) return Math.abs(lat - 0.93) < 0.03 ? K.st : K.g5;
        return Math.cos(lon * 2) > 0 ? K.g4 : K.g3;
      });
    v.paint((X, Y, Z, i, j, k, c) => (c === K.g0 && Math.hypot(X, Y, Z) > Rb - 0.04 ? -1 : undefined));
    v.paint((X, Y, Z, i, j, k, c) => { const lon = Math.atan2(X, Z), lat = Math.abs(Y) / Rb; return (Math.abs(Math.sin(lon * 2)) < 0.3 && Math.abs(lat - 0.72) < 0.06 && (c === K.g3 || c === K.g4)) ? K.st : undefined; });
    if (top) { v.cylY(0, 0, 0.38, 0.5, 0.06, K.g1); v.cylY(0, 0, 0.47, 0.5, 0.03, K.EXH); }   // steam vent on the crown
    return v.weather({ seed: top ? 71 : 72, rust: 0.12, rustScale: 6, edge: 0.18 });
  });
  const core = gset('fireball.core', () => {
    const v = new VB(s, -0.32, -0.32, -0.32, 0.32, 0.32, 0.42);
    v.ell(0, 0, 0, 0.27, 0.27, 0.27, (X, Y, Z) => (Math.abs(Y) < 0.06 || Math.abs(X) < 0.05 ? K.g2 : Math.hypot(X, Y, Z) > 0.24 ? K.HOT : K.HOT2));
    v.cylZ(0, 0, 0.18, 0.38, 0.11, K.g1, 0.055); v.cylZ(0, 0, 0.3, 0.37, 0.055, K.HOT2);
    v.box(-0.1, 0.2, 0.05, -0.05, 0.25, 0.2, K.EYE); v.box(0.05, 0.2, 0.05, 0.1, 0.25, 0.2, K.EYE);
    return v;
  });
  const flame = gset('fireball.flame', () => {
    const v = new VB(s, -0.3, -0.3, 0, 0.3, 0.3, 1.2);
    v.fillIf(-0.3, -0.3, 0, 0.3, 0.3, 1.2, (X, Y, Z) => Math.hypot(X, Y) < 0.05 + Z * 0.22 && hash3(Math.round(X * 20), Math.round(Y * 20), Math.round(Z * 20)) < 0.55 - Z * 0.3, (X, Y, Z) => (Z < 0.45 ? K.FLM : K.FLM2));
    return v;
  });
  const roll = R.g(R.top, 0, 0.45, 0); R.jit = roll;
  const hinge = R.g(roll, 0, 0, -0.38);
  R.pm(shell(true), hinge, 0, 0, 0.38);
  R.pm(shell(false), roll);
  const cp = R.pm(core, R.top, 0, 0.45, 0);
  const fl = R.pm(flame, cp.g, 0, 0, 0.36); fl.g.visible = false;
  let open = 0;
  R.anim = (dt, s, t) => {
    const atk = (s.tele > 0 || s.firing) && !s.stunned;
    const sp = s.moving ? (s.speed ?? 3) / R.k : 0;
    if (atk) roll.rotation.x = damp(roll.rotation.x, Math.round(roll.rotation.x / (Math.PI * 2)) * Math.PI * 2, 8, dt);
    else if (!s.stunned) roll.rotation.x += sp * dt / Rb;
    const settled = Math.abs(wrapA(roll.rotation.x)) < 0.15;
    open = damp(open, atk && settled ? 1 : 0, 6, dt);
    hinge.rotation.x = -open * 1.2;
    fl.g.visible = !!s.firing && open > 0.8;
    if (fl.g.visible) fl.g.scale.set(0.8 + Math.random() * 0.4, 0.8 + Math.random() * 0.4, 0.7 + Math.random() * 0.6);
  };
};

// ----------------------------------------------------------------------------- CLOSE TALKER (shreddr): hovering shrapnel orb (fireball key, behavior 'shredder')
BASE_R.shredder = 0.9;
MODELS.shredder = (R) => {
  const s = 0.07, hullY = 1.25;
  R.refSpeed = 4.2;
  const body = gset('shred.body', () => {
    const v = new VB(s, -0.84, -0.84, -1.05, 0.84, 0.84, 1.05);
    v.ell(0, 0, 0, 0.66, 0.6, 0.66, (X, Y, Z, i, j, k) => {
      const lon = Math.atan2(X, Z);
      if (Math.abs(Math.sin(lon * 3)) < 0.1 && Y > -0.2) return K.g1;
      if (Y > 0.4) return K.g4;
      return Math.cos(lon * 3) > 0 ? K.g3 : K.g2;
    });
    v.cylY(0, 0, 0.5, 0.64, 0.22, K.g2); v.cylY(0, 0, 0.56, 0.66, 0.12, K.g5);       // top hatch
    v.paintBox(-0.7, 0.3, -0.7, 0.7, 0.7, 0.7, (X, Y, Z, i, j, k, c) => (c === K.g4 && (i + k) % 6 === 0 ? K.st : undefined));
    // armoured head (front) with a wide red visor
    v.box(-0.32, -0.18, 0.42, 0.32, 0.28, 0.84, K.g3, { ch: 2, cht: 2 });
    v.box(-0.25, -0.04, 0.77, 0.25, 0.14, 0.84, K.g0);
    for (const sx of [-1, 1]) { v.box(sx * 0.07, 0.0, 0.84, sx * 0.21, 0.14, 0.91, K.EYE); v.box(sx * 0.07, 0.07, 0.84, sx * 0.14, 0.14, 0.91, K.EYE2); }   // two staring eyes
    v.box(-0.18, -0.25, 0.63, 0.18, -0.11, 0.91, K.g1); v.cylZ(0, -0.18, 0.84, 0.98, 0.05, K.st);   // blast emitter
    // rear thruster bells (blue = weak spot), visible from above
    for (const sx of [-1, 1]) {
      v.cylZ(sx * 0.42, 0.1, -0.98, -0.42, 0.21, K.g3, 0.13);
      v.cylZ(sx * 0.42, 0.1, -0.98, -0.84, 0.14, K.BLUE, 0.0);
      v.cylZ(sx * 0.42, 0.1, -1.0, -0.91, 0.07, K.BLUE2);
      v.cylZ(sx * 0.42, 0.1, -0.7, -0.63, 0.22, K.y0);
      v.box(sx * 0.42 - 0.07, 0.28, -0.91, sx * 0.42 + 0.07, 0.35, -0.7, K.BLUE);
    }
    return v.weather({ seed: 81, rust: 0.12 });
  });
  const ring = gset('shred.ring', () => {
    const v = new VB(s, -0.98, -0.14, -0.98, 0.98, 0.14, 0.98);
    v.cylY(0, 0, -0.07, 0.07, 0.84, (X, Y, Z) => { const a = Math.atan2(X, Z); return Math.abs(Math.sin(a * 6)) < 0.3 ? K.y0 : K.g2; }, 0.66);
    for (let n = 0; n < 12; n++) { const a = (n + 0.5) * Math.PI * 2 / 12; v.seg(Math.sin(a) * 0.8, 0, Math.cos(a) * 0.8, Math.sin(a) * 0.95, 0, Math.cos(a) * 0.95, 0.04, K.st); }
    return v.weather({ seed: 3, chip: 0.1 });
  });
  const headPlate = gset('shred.headplate', () => {
    const v = new VB(s, -0.42, 0.14, 0.35, 0.42, 0.49, 0.91);
    v.box(-0.35, 0.21, 0.42, 0.35, 0.35, 0.84, K.g4, { ch: 1, cht: 1 });
    v.box(-0.35, 0.21, 0.7, 0.35, 0.36, 0.84, K.y1, { ch: 1 }); v.box(-0.07, 0.21, 0.7, 0.07, 0.37, 0.84, K.bk);
    v.box(-0.28, 0.35, 0.49, 0.28, 0.42, 0.63, K.g3);
    v.paintBox(-0.42, 0.28, 0.42, 0.42, 0.43, 0.7, (X) => (Math.abs(Math.abs(X) - 0.175) < 0.03 ? K.st2 : undefined));   // racing stripes
    return v.weather({ seed: 5, chip: 0.15 });
  });
  const glow = gset('shred.glow', () => { const v = new VB(s, -0.6, -0.1, -0.6, 0.6, 0.1, 0.6); v.cylY(0, 0, -0.07, 0.0, 0.42, K.BLUE, 0.28); v.cylY(0, 0, -0.07, 0.0, 0.2, K.BLUE2); return v; });
  const hull = R.g(R.top, 0, hullY, 0); R.jit = hull;
  R.pm(body, hull);
  const rg = R.pm(ring, hull, 0, 0, 0);
  R.pm(glow, hull, 0, -0.58, 0);
  for (const sx of [-1, 1]) { const st = R.pm(stubGS('', s, 0.21), hull, sx * 0.42, 0.1, -0.84); R.zone('thruster', sx * 0.45, -0.65, { show: [st.g] }); }
  const jet = gset('shred.jet', () => {
    const v = new VB(s, -0.07, -0.21, -0.21, 0.35, 0.21, 0.21);
    v.cylX(0, 0, 0, 0.28, 0.15, K.g2, 0.07); v.cylX(0, 0, 0.21, 0.28, 0.07, K.BLUE); v.cylX(0, 0, 0.07, 0.14, 0.17, K.y1);
    return v.weather({ seed: 4 });
  });
  for (const sx of [-1, 1]) {
    const jg = R.g(hull, sx * 0.58, 0, 0); jg.rotation.y = sx > 0 ? 0 : Math.PI;
    const jp = R.pm(jet, jg);
    R.zone('side_jet', sx * 0.85, 0, { hide: [jp.g], show: [R.pm(stubGS('', s, 0.14), hull, sx * 0.66, 0, 0).g] });
  }
  const hp = R.pm(headPlate, hull);
  R.zone('head', 0, 0.6, { hide: [hp.g], show: [R.pm(stubGS('', s, 0.21), hull, 0, 0.3, 0.6).g] });
  R.flash(flashGS('', s, 0.3), hull, 0, -0.18, 0.98);
  R.anim = (dt, s, t) => {
    hull.position.y = hullY + Math.sin(t * 2.2) * 0.06;
    hull.rotation.x = damp(hull.rotation.x, 0.15 * R.mv - (s.tele || 0) * 0.12, 3, dt);
    rg.g.rotation.y += dt * (s.firing ? 16 : 1.2 + (s.tele || 0) * 6);
  };
};

// ----------------------------------------------------------------------------- WALLFLOWER (turrett, key 'turret'): gun emplacement
BASE_R.turret = 0.5;
MODELS.turret = (R) => {
  const s = 0.05;
  const base = gset('turret.base', () => {
    const v = new VB(s, -0.5, 0, -0.5, 0.5, 0.65, 0.5);
    v.fillIf(-0.45, 0, -0.45, 0.45, 0.1, 0.45, (X, Y, Z) => Math.abs(X) + Math.abs(Z) < 0.6 && Math.abs(X) < 0.44 && Math.abs(Z) < 0.44, (X, Y, Z, i, j, k) => (Y > 0.05 && (Math.abs(X) > 0.36 || Math.abs(Z) > 0.36 || Math.abs(X) + Math.abs(Z) > 0.52) ? haz(2)(X, Y, Z, i, j, k) : K.g2));
    for (const [x, z] of [[-0.3, -0.15], [0.3, -0.15], [-0.3, 0.15], [0.3, 0.15], [-0.15, 0.3], [0.15, 0.3], [-0.15, -0.3], [0.15, -0.3]]) v.box(x - 0.025, 0.1, z - 0.025, x + 0.025, 0.15, z + 0.025, K.st);
    v.cylY(0, 0, 0.1, 0.55, 0.14, (X, Y, Z, i, j, k) => (j % 3 === 0 ? K.g2 : K.g3));
    v.cylY(0, 0, 0.5, 0.6, 0.22, K.g4); v.cylY(0, 0, 0.55, 0.6, 0.2, K.g1);
    v.seg(0.12, 0.12, -0.1, 0.12, 0.5, -0.12, 0.03, K.cab); v.seg(-0.12, 0.12, -0.08, -0.13, 0.5, -0.1, 0.03, K.cab);
    return v.weather({ seed: 91, rust: 0.18 });
  });
  const head = gset('turret.head', () => {
    const v = new VB(s, -0.35, 0, -0.5, 0.35, 0.55, 0.45);
    v.box(-0.25, 0.0, -0.3, 0.25, 0.35, 0.25, K.g2, { ch: 2, cht: 1 });
    v.box(-0.2, 0.35, -0.25, 0.2, 0.4, 0.15, K.g4, { ch: 1 }); v.paintBox(-0.2, 0.35, -0.25, 0.2, 0.4, 0.15, seam(3, 'z', K.g3));
    v.box(-0.2, 0.35, -0.25, -0.15, 0.41, 0.15, K.y1); v.box(0.15, 0.35, -0.25, 0.2, 0.41, 0.15, K.y1);
    v.box(-0.3, 0.05, -0.15, -0.25, 0.3, 0.15, K.g3); v.box(0.25, 0.05, -0.15, 0.3, 0.3, 0.15, K.g3);  // side cheeks
    // gun shield: sloped light slab with orange edges + barrel ports
    v.fillIf(-0.3, 0.0, 0.2, 0.3, 0.42, 0.45, (X, Y, Z) => Z < 0.4 - Y * 0.3 && Z >= 0.31 - Y * 0.3 && Math.abs(X) < 0.3 - (Y > 0.35 ? 0.05 : 0),
      (X, Y, Z, i, j, k) => (Math.abs(X) > 0.22 ? K.y1 : Y < 0.05 ? K.g3 : K.g5));
    v.box(-0.15, 0.1, 0.2, -0.05, 0.2, 0.45, -1); v.box(0.05, 0.1, 0.2, 0.15, 0.2, 0.45, -1);
    // scanner eye cluster on the brow
    v.box(-0.15, 0.3, 0.12, 0.15, 0.5, 0.27, K.g1, { ch: 1 });
    v.box(-0.1, 0.35, 0.27, 0.1, 0.4, 0.32, K.g0); v.box(-0.1, 0.4, 0.27, 0.1, 0.45, 0.32, K.EYE); v.box(-0.05, 0.4, 0.27, 0.05, 0.45, 0.32, K.EYE2);   // shy slit eye
    v.box(0.1, 0.45, 0.22, 0.15, 0.5, 0.27, K.YEL);
    v.box(-0.22, 0.0, -0.33, 0.22, 0.05, -0.3, K.g1);
    v.paintBox(0.0, 0.35, -0.2, 0.15, 0.4, -0.05, (X, Y, Z) => { const dx = Math.abs(X - 0.075), dz = Math.abs(Z + 0.125); return dx + dz < 0.01 ? K.y0 : dx + dz < 0.06 ? K.cer3 : undefined; });   // a little flower decal
    return v.weather({ seed: 92, rust: 0.16 });
  });
  const rear = gset('turret.rear', () => {
    const v = new VB(s, -0.25, 0, -0.2, 0.25, 0.4, 0.05);
    v.box(-0.2, 0.05, -0.15, 0.2, 0.3, 0.0, K.g1);
    for (let x = -0.15; x < 0.18; x += 0.1) v.box(x, 0.05, -0.17, x + 0.05, 0.3, -0.05, K.HOT);
    v.box(-0.2, 0.3, -0.15, 0.2, 0.35, 0.0, K.y0);
    return v.weather({ seed: 3 });
  });
  const barrel = gset('turret.barrel', () => {
    const v = new VB(s, -0.06, -0.06, -0.15, 0.06, 0.06, 0.55);
    v.cylZ(0, 0, -0.1, 0.5, 0.032, K.st); v.cylZ(0, 0, -0.1, 0.12, 0.05, K.g1); v.cylZ(0, 0, 0.42, 0.5, 0.05, K.g2); v.cylZ(0, 0, 0.45, 0.5, 0.02, K.g0);
    return v.weather({ seed: 5 });
  });
  R.pm(base, R.top);
  const yaw = R.g(R.top, 0, 0.6, 0); R.jit = yaw;
  R.pm(head, yaw);
  const rp = R.pm(rear, yaw, 0, 0, -0.3);
  const st = R.pm(stubGS('', s, 0.12), yaw, 0, 0.15, -0.35);
  R.zone(['rear_housing'], 0, -0.35, { hide: [rp.g], show: [st.g] });
  const pitch = R.g(yaw, 0, 0.15, 0.1);
  const bars = [R.pm(barrel, pitch, -0.1, 0, 0), R.pm(barrel, pitch, 0.1, 0, 0)];
  R.flash(flashGS('', s, 0.14), bars[0].g, 0, 0, 0.52); R.flash(flashGS('', s, 0.14), bars[1].g, 0, 0, 0.52);
  R.anim = (dt, s, t) => {
    const gz = wrapA(s.gaze || 0);
    yaw.rotation.y += clamp(wrapA(gz - yaw.rotation.y), -4 * dt, 4 * dt);
    pitch.rotation.x = damp(pitch.rotation.x, s.pitch ?? (0.05 + Math.sin(t * 0.7) * 0.04 + R.al * 0.08), 5, dt);
    const ph = (t * 14) % 1;
    bars[0].g.position.z = s.firing ? (ph < 0.5 ? -0.07 * (1 - ph * 2) : 0) : damp(bars[0].g.position.z, 0, 8, dt);
    bars[1].g.position.z = s.firing ? (ph >= 0.5 ? -0.07 * (1 - (ph - 0.5) * 2) : 0) : damp(bars[1].g.position.z, 0, 8, dt);
  };
};

// ----------------------------------------------------------------------------- NEIGHBORHOOD WATCH (sentinal, key 'sentinel'): rooftop sniper mast
BASE_R.sentinel = 0.6;
MODELS.sentinel = (R) => {
  const s = 0.05, mastH = 3.0;
  const base = gset('sent.base', () => {
    const v = new VB(0.06, -0.66, 0, -0.66, 0.66, mastH + 0.12, 0.66);
    v.box(-0.24, 0, -0.24, 0.24, 0.24, 0.24, K.g2, { ch: 2, cht: 1 });
    v.box(-0.24, 0.12, -0.24, 0.24, 0.18, 0.24, K.y1, { ch: 2 });
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      v.seg(x * 0.15, 0.12, z * 0.15, x * 0.52, 0.04, z * 0.52, 0.05, K.g3);
      v.box(x * 0.52 - 0.09, 0, z * 0.52 - 0.09, x * 0.52 + 0.09, 0.06, z * 0.52 + 0.09, K.g1);
      v.box(x * 0.52 - 0.03, 0.06, z * 0.52 - 0.03, x * 0.52 + 0.03, 0.12, z * 0.52 + 0.03, K.st);
    }
    // lattice mast
    const c = 0.11;
    for (const [x, z] of [[-c, -c], [c, -c], [-c, c], [c, c]]) v.seg(x, 0.2, z, x * 0.7, mastH, z * 0.7, 0.035, K.g3);
    for (let y = 0.3, n = 0; y < mastH - 0.2; y += 0.42, n++) {
      const w0 = c * (1 - 0.3 * y / mastH), w1 = c * (1 - 0.3 * (y + 0.42) / mastH), a = n % 2 ? 1 : -1;
      v.seg(-w0, y, a * w0, w1, y + 0.42, a * w1, 0.022, K.g2); v.seg(a * w0, y, -w0, a * w1, y + 0.42, w1, 0.022, K.g2);
    }
    v.cylY(0, 0, 0.2, mastH, 0.045, K.st);
    v.seg(0.05, 0.25, 0.02, 0.04, mastH - 0.1, 0.03, 0.025, K.cab);
    v.box(-0.12, 1.4, -0.12, 0.12, 1.5, 0.12, K.y1);
    v.seg(0, 2.5, -0.05, -0.25, 2.5, -0.42, 0.04, K.g3); v.seg(0, 2.1, -0.05, -0.25, 2.25, -0.42, 0.03, K.g2);   // canister bracket
    v.cylY(0, 0, mastH - 0.12, mastH + 0.12, 0.17, K.g4); v.cylY(0, 0, mastH - 0.06, mastH + 0.06, 0.2, K.y1);
    // "we are watching" sign bolted to the mast: yellow plate, dark rim, one dark eye
    v.box(0.06, 1.8, -0.06, 0.12, 1.92, 0.0, K.st);
    v.box(0.12, 1.74, -0.06, 0.42, 1.98, 0.0, (X, Y, Z) => (Y < 1.8 || Y > 1.92 || X < 0.18 || X > 0.36 ? K.bk : Math.abs(X - 0.27) < 0.04 ? K.g0 : K.y0));
    return v.weather({ seed: 101, rust: 0.18 });
  });
  const canister = gset('sent.can', () => {
    const v = new VB(s, -0.2, -0.3, -0.2, 0.2, 0.3, 0.2);
    v.cylY(0, 0, -0.22, 0.22, 0.13, K.HOT); v.cylY(0, 0, -0.17, 0.17, 0.135, K.HOT2, 0.1);
    for (const y of [-0.27, 0.22]) v.cylY(0, 0, y, y + 0.05, 0.11, K.g1);
    for (const y of [-0.12, 0.03]) v.cylY(0, 0, y, y + 0.05, 0.14, K.y0);
    for (let n = 0; n < 4; n++) { const a = n * Math.PI / 2 + 0.4; v.seg(Math.sin(a) * 0.15, -0.25, Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0.25, Math.cos(a) * 0.15, 0.022, K.g2); }
    return v.weather({ seed: 7, chip: 0.1 });
  });
  const head = gset('sent.head', () => {
    const v = new VB(s, -0.3, -0.3, -0.55, 0.3, 0.7, 1.15);
    v.box(-0.18, -0.15, -0.4, 0.18, 0.2, 0.45, K.g2, { ch: 2, cht: 1, chb: 1 });
    v.box(-0.15, 0.2, -0.35, 0.15, 0.27, 0.35, K.g4, { ch: 1 }); v.paintBox(-0.15, 0.2, -0.35, 0.15, 0.28, 0.35, seam(3, 'z', K.g3));
    v.box(-0.15, 0.2, 0.25, 0.15, 0.28, 0.35, K.y1); v.box(-0.05, 0.2, 0.25, 0.05, 0.29, 0.35, K.bk);
    v.box(-0.22, -0.1, -0.2, -0.18, 0.15, 0.2, K.g3); v.box(0.18, -0.1, -0.2, 0.22, 0.15, 0.2, K.g3);
    v.cylZ(0, 0, 0.4, 1.05, 0.04, K.st); v.cylZ(0, 0, 0.4, 0.62, 0.075, K.g1); v.cylZ(0, 0, 0.95, 1.1, 0.07, K.g2); v.box(-0.07, -0.015, 1.0, 0.07, 0.015, 1.05, -1);
    v.box(-0.14, -0.02, 0.43, 0.14, 0.18, 0.5, K.g0);
    v.box(-0.05, 0.05, 0.45, 0.05, 0.15, 0.53, K.EYE); v.box(0, 0.1, 0.48, 0.05, 0.15, 0.54, K.EYE2);
    for (const [x, y] of [[-0.1, 0.13], [0.1, 0.13], [-0.1, 0.03], [0.1, 0.03]]) v.box(x - 0.025, y - 0.025, 0.46, x + 0.025, y + 0.025, 0.54, K.YEL);
    v.box(-0.14, -0.12, -0.55, 0.14, 0.12, -0.38, K.g1); v.paintBox(-0.15, -0.12, -0.56, 0.15, 0.12, -0.5, seam(2, 'y', K.g0));
    v.seg(0.1, 0.2, -0.3, 0.12, 0.65, -0.35, 0.02, K.st); v.box(0.1, 0.62, -0.38, 0.15, 0.67, -0.33, K.RED);
    return v.weather({ seed: 102, rust: 0.1 });
  });
  R.pm(base, R.top);
  const cp = R.pm(canister, R.top, -0.25, 2.25, -0.45);
  const cst = R.pm(stubGS('', s, 0.12), R.top, -0.25, 2.45, -0.42);
  R.zone('canister', -0.25, -0.45, { hide: [cp.g], show: [cst.g] });
  const yaw = R.g(R.top, 0, mastH + 0.15, 0); R.jit = yaw;
  const pitch = R.g(yaw, 0, 0.05, 0);
  const hp = R.pm(head, pitch);
  R.flash(flashGS('', s, 0.2), pitch, 0, 0, 1.1);
  let kick = 0;
  R.anim = (dt, s, t) => {
    const gz = wrapA(s.gaze || 0);
    yaw.rotation.y += clamp(wrapA(gz - yaw.rotation.y), -1.6 * dt, 1.6 * dt);
    if (s.firing) kick = 1; kick = Math.max(0, kick - dt * 3);
    pitch.rotation.x = damp(pitch.rotation.x, s.pitch ?? (0.12 + 0.14 * R.al + Math.sin(t * 0.6) * 0.03), 3, dt) - kick * 0.02;
    hp.g.position.z = -kick * 0.12;
  };
};

// ----------------------------------------------------------------------------- DATA MINER (surveyr, key 'surveyor'): armoured rolling scanner
BASE_R.surveyor = 0.9;
MODELS.surveyor = (R) => {
  const s = 0.07, Rb = 0.86, cy = 0.88, rIn = 0.62;
  R.refSpeed = 6;
  const sector = (X, Y, Z) => (Math.abs(X) > 0.6 ? 'side' : Math.abs(Y) > Math.abs(Z) ? (Y > 0 ? 'top' : 'bottom') : (Z > 0 ? 'front' : 'rear'));
  const plate = (which) => gset('surv.' + which, () => {
    const v = new VB(s, -0.91, -0.91, -0.91, 0.91, 0.91, 0.91);
    v.fillIf(-0.91, -0.91, -0.91, 0.91, 0.91, 0.91, (X, Y, Z) => {
      const r = Math.hypot(X, Y, Z); if (r > Rb || r <= rIn) return false;
      const sc = sector(X, Y, Z), side = which === 'sideL' || which === 'sideR';
      if (side ? (sc !== 'side' || (which === 'sideL') !== (X < 0)) : sc !== which) return false;
      if (sc !== 'side' && (Math.abs(Math.abs(Y) - Math.abs(Z)) < 0.08 || Math.abs(X) > 0.53)) return false;   // seams
      return true;
    }, (X, Y, Z, i, j, k) => {
      if (which === 'sideL' || which === 'sideR') { const d = Math.hypot(Y, Z); return d < 0.2 ? (d < 0.09 ? K.st2 : K.g2) : (Math.abs(d - 0.36) < 0.045 ? K.BLUE : Math.abs(d - 0.5) < 0.04 ? K.y1 : K.g3); }
      const a = Math.abs(X);
      if (a > 0.42) return K.y1;
      const along = (which === 'top' || which === 'bottom') ? Math.abs(Z) : Math.abs(Y);
      if (along < 0.05) return K.g4;
      if (a < 0.25 && along > 0.12 && along < 0.3) return barcode('x', K.cer3, K.bk)(X, Y, Z, i, j, k);   // inventory barcode
      return a < 0.07 ? K.cer2 : K.cer;
    });
    if (which !== 'sideL' && which !== 'sideR') v.paint((X, Y, Z, i, j, k, c) => (c === K.cer && Math.abs(X) > 0.3 && (i + j + k) % 4 === 0 ? K.cer2 : undefined));
    return v.weather({ seed: 111 + which.length, rust: 0.12, noise: 0.04 });
  });
  const inner = gset('surv.inner', () => {
    const v = new VB(s, -0.7, -0.7, -0.7, 0.7, 0.7, 0.7);
    v.ell(0, 0, 0, rIn, rIn, rIn, (X, Y, Z, i, j, k) => ((i + j * 2 + k) % 5 === 0 ? K.g3 : K.g1));
    v.cylY(0, 0, 0.0, 0.7, 0.3, -1);
    return v;
  });
  const core = gset('surv.core', () => {
    const v = new VB(s, -0.4, -0.5, -0.4, 0.4, 1.4, 0.4);
    v.ell(0, 0, 0, 0.25, 0.25, 0.25, (X, Y, Z) => (Math.abs(Y) < 0.05 ? K.g1 : K.BLUE));
    v.ell(0, 0, 0.05, 0.14, 0.14, 0.18, K.BLUE2);
    v.cylY(0, 0, -0.45, -0.18, 0.2, K.g2);
    for (let n = 0; n < 4; n++) { const a = n * Math.PI / 2 + 0.78; v.seg(Math.sin(a) * 0.28, -0.3, Math.cos(a) * 0.28, Math.sin(a) * 0.18, 0.3, Math.cos(a) * 0.18, 0.035, K.g4); }
    v.cylY(0, 0, 0.25, 1.2, 0.04, K.st); v.cylY(0, 0, 0.25, 0.5, 0.07, K.g2);
    v.cylY(0, 0, 1.1, 1.18, 0.18, K.g3); v.cylY(0, 0, 1.18, 1.26, 0.11, K.BLUE2);
    return v.weather({ seed: 3, noise: 0.04 });
  });
  const roll = R.g(R.top, 0, cy, 0); R.jit = roll;
  R.pm(inner, roll);
  const parts = {};
  for (const w of ['front', 'rear', 'bottom']) parts[w] = R.pm(plate(w), roll);
  const hinge = R.g(roll, 0, 0.6, -0.55); parts.top = R.pm(plate('top'), hinge, 0, -0.6, 0.55);
  const sideL = R.pm(plate('sideL'), roll), sideR = R.pm(plate('sideR'), roll);
  const coreG = R.g(R.top, 0, cy, 0); R.pm(core, coreG);
  R.zone('plate_front', 0, 0.75, { hide: [parts.front.g] });
  R.zone('plate_rear', 0, -0.75, { hide: [parts.rear.g] });
  R.zone('plate_side', -0.75, 0, { hide: [sideL.g] }); R.zone('plate_side', 0.75, 0, { hide: [sideR.g] });
  let scan = 0;
  R.anim = (dt, s, t) => {
    const sp = s.moving ? (s.speed ?? 3) / R.k : 0;
    if (s.moving && !s.stunned) roll.rotation.x += sp * dt / Rb;
    else roll.rotation.x = damp(roll.rotation.x, Math.round(roll.rotation.x / (Math.PI * 2)) * Math.PI * 2, 3, dt);
    const settled = Math.abs(wrapA(roll.rotation.x)) < 0.1;
    scan = damp(scan, !s.moving && !s.stunned && settled ? 1 : 0, 2.5, dt);
    hinge.rotation.x = -scan * 1.7;
    coreG.position.y = cy + scan * 0.52;
    coreG.rotation.y += dt * (0.5 + scan * 2);
    coreG.scale.y = 0.35 + 0.65 * scan;
  };
};

// ----------------------------------------------------------------------------- ROCKET SURGEON (rocketier, key 'rocketeer'): heavy rocket gunship (+ Vape Lord / vaporiser)
BASE_R.rocketeer = 1.6;
MODELS.rocketeer = (R, def) => {
  const s = 0.08, laser = def.variant === 'laser', vk = laser ? 'rkt.l.' : 'rkt.';
  R.refSpeed = 3.2;
  const hullG = gset(vk + 'hull', () => {
    const v = new VB(s, -1.04, -0.64, -1.36, 1.04, 0.8, 1.2);
    v.box(-0.72, -0.4, -0.96, 0.72, 0.4, 0.8, K.g2, { ch: 3, cht: 2, chb: 2 });
    v.box(-0.56, 0.4, -0.8, 0.56, 0.56, 0.64, K.g4, { ch: 2, cht: 1 });
    v.paintBox(-0.56, 0.4, -0.8, 0.56, 0.6, 0.64, seam(4, 'z', K.g3, 2));
    v.paintBox(-0.56, 0.4, -0.8, 0.56, 0.6, 0.64, (X, Y, Z, i, j, k) => (Math.abs(Math.abs(X) - 0.32) < 0.04 ? K.g3 : undefined));
    v.paintBox(-0.56, 0.4, -0.8, 0.56, 0.6, 0.64, (X, Y, Z, i, j, k, c) => (c === K.g4 && Math.abs(X) > 0.4 && k % 4 === 0 ? K.st : undefined));
    v.box(-0.16, 0.56, -0.72, 0.16, 0.64, 0.24, K.g3);                          // spine vent
    v.paintBox(-0.16, 0.56, -0.72, 0.16, 0.65, 0.24, seam(2, 'z', K.g1));
    v.box(-0.56, 0.4, 0.48, -0.4, 0.58, 0.64, laser ? K.tl : K.y1); v.box(0.4, 0.4, 0.48, 0.56, 0.58, 0.64, laser ? K.tl : K.y1);
    if (!laser) v.paintBox(0.24, 0.48, -0.48, 0.48, 0.58, -0.24, (X, Y, Z) => (Math.abs(X - 0.36) < 0.05 || Math.abs(Z + 0.36) < 0.05 ? K.cer3 : K.g1));   // first-aid decal
    for (const sx of [-1, 1]) { v.box(sx > 0 ? 0.72 : -0.8, -0.32, -0.72, sx > 0 ? 0.8 : -0.72, 0.24, 0.56, K.g3); }
    v.paintBox(-0.81, -0.32, -0.72, 0.81, 0.24, 0.56, seam(3, 'z', K.g1));
    // scanner face under the brow: big red eye, four yellow laser emitters
    v.box(-0.48, -0.24, 0.8, 0.48, 0.16, 0.96, K.g1, { ch: 1 });
    v.box(-0.16, -0.16, 0.96, 0.16, 0.08, 1.04, K.EYE); v.box(-0.08, -0.08, 0.98, 0.0, 0.0, 1.06, K.EYE2);
    for (const x of [-0.4, -0.28, 0.2, 0.32]) v.box(x, -0.08, 0.96, x + 0.08, 0.0, 1.02, K.YEL);
    v.box(-0.48, -0.24, -1.12, 0.48, 0.24, -0.96, K.g1);                     // canister cradle
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.seg(sx * 0.6, 0.0, sz * 0.6, sx * 0.95, 0.0, sz * 0.84, 0.09, K.g3);
    for (const sx of [-1, 1]) v.box(sx > 0 ? 0.72 : -0.96, -0.12, -0.16, sx > 0 ? 0.96 : -0.72, 0.08, 0.16, K.g1);   // pod pylons
    if (laser) { v.box(-0.32, 0.36, -0.36, 0.32, 0.68, 0.28, -1); v.box(-0.32, 0.32, -0.36, 0.32, 0.4, 0.28, K.g0); }   // core bay under the belly panel
    return v.weather({ seed: 121, rust: 0.14 });
  });
  const brow = gset('rkt.brow', () => {
    const v = new VB(s, -0.64, -0.08, -0.24, 0.64, 0.4, 0.48);
    v.fillIf(-0.64, 0, -0.24, 0.64, 0.4, 0.48, (X, Y, Z) => Math.abs(X) < 0.6 - Y * 0.3 && Z < 0.4 - Y * 0.5 && Z > -0.2,
      (X, Y, Z, i, j, k) => (Z > 0.33 - Y * 0.5 && Y < 0.12 ? K.y1 : (Math.abs(X) > 0.44 ? K.g3 : K.g5)));
    v.paintBox(-0.64, 0, -0.24, 0.64, 0.4, 0.48, (X, Y, Z, i, j, k, c) => (c === K.g5 && k % 3 === 0 ? K.g4 : undefined));
    return v.weather({ seed: 9, chip: 0.15 });
  });
  const pod = gset(vk + 'pod', () => {
    const v = new VB(s, -0.32, -0.32, -0.56, 0.32, 0.32, 0.8);
    if (laser) {
      v.box(-0.2, -0.2, -0.48, 0.2, 0.2, 0.24, K.g2, { ch: 1 });
      v.cylZ(0, 0, 0.2, 0.72, 0.08, K.st); for (let z = 0.24; z < 0.56; z += 0.16) v.cylZ(0, 0, z, z + 0.08, 0.15, K.cu);
      v.cylZ(0, 0, 0.6, 0.76, 0.1, K.g1, 0.05); v.cylZ(0, 0, 0.64, 0.76, 0.05, K.RED);
      v.box(-0.2, 0.2, -0.48, 0.2, 0.24, 0.24, K.tl);
    } else {
      v.box(-0.24, -0.24, -0.48, 0.24, 0.24, 0.64, K.g3, { ch: 1 });
      v.box(-0.24, 0.16, -0.48, 0.24, 0.26, 0.64, K.g4, { ch: 1 }); v.paintBox(-0.25, 0.16, -0.48, 0.25, 0.27, 0.4, seam(3, 'z', K.g3));
      v.box(-0.24, 0.16, 0.4, 0.24, 0.27, 0.64, K.y1, { ch: 1 }); v.box(-0.24, 0.16, 0.48, 0.24, 0.28, 0.56, K.bk);
      for (const x of [-0.16, 0.0]) for (const y of [-0.16, 0.0]) { v.box(x + 0.02, y + 0.02, 0.48, x + 0.14, y + 0.14, 0.66, K.g0); v.box(x + 0.04, y + 0.04, 0.5, x + 0.12, y + 0.12, 0.58, K.HOT); }
      v.paintBox(-0.25, -0.25, -0.48, 0.25, 0.16, 0.4, seam(3, 'z', K.g2));
    }
    return v.weather({ seed: 13, rust: 0.16 });
  });
  const canister = gset('rkt.can', () => {
    const v = new VB(s, -0.48, -0.24, -0.24, 0.48, 0.24, 0.24);
    v.cylX(0, 0, -0.4, 0.4, 0.17, K.HOT); v.cylX(0, 0, -0.3, 0.3, 0.18, K.HOT2, 0.12);
    for (const x of [-0.48, 0.32]) v.cylX(0, 0, x, x + 0.16, 0.14, K.g1);
    for (const x of [-0.16, 0.08]) v.cylX(0, 0, x, x + 0.08, 0.2, K.y0);
    return v.weather({ seed: 6 });
  });
  const duct = gset('rkt.duct', () => {
    const v = new VB(s, -0.5, -0.24, -0.5, 0.5, 0.24, 0.5);
    v.cylY(0, 0, -0.16, 0.16, 0.44, (X, Y, Z) => (Y > 0.08 ? (Math.abs(Math.sin(Math.atan2(X, Z) * 2)) < 0.38 ? K.y1 : K.g4) : K.g3), 0.34);
    v.cylY(0, 0, -0.08, 0.0, 0.34, K.g1, 0.27);
    v.cylY(0, 0, -0.2, -0.12, 0.12, K.g1); v.cylY(0, 0, -0.24, -0.2, 0.08, K.EXH);
    for (let n = 0; n < 3; n++) { const a = n * Math.PI * 2 / 3; v.seg(0, -0.16, 0, Math.sin(a) * 0.36, -0.12, Math.cos(a) * 0.36, 0.04, K.g2); }
    return v.weather({ seed: 15, rust: 0.1 });
  });
  const fan = bladesGS('fan', s, 0.32, 5, K.g5, K.g4);
  const stubM = stubGS('', s, 0.3);
  const hull = R.g(R.top); R.jit = hull;
  R.pm(hullG, hull);
  const browP = R.pm(brow, hull, 0, 0.3, 0.76);
  R.zone('eyebrow', 0, 0.9, { hide: [browP.g] });
  R.pm(canister, hull, 0, 0.08, -1.12);
  const pods = [];
  for (const sx of [-1, 1]) {
    const pg = R.g(hull, sx * 1.04, -0.04, 0.0);
    R.pm(pod, pg); const st = R.pm(stubM, hull, sx * 0.9, 0, 0.0);
    R.zone('rocket_pod', sx * 1.0, 0.1, { hide: [pg], show: [st.g] });
    R.flash(flashGS('', s, 0.28), pg, 0, 0, 0.76);
    pods.push(pg);
  }
  const thr = [];
  for (const [x, z] of [[-1.15, 0.95], [1.15, 0.95], [-1.15, -0.95], [1.15, -0.95]]) {
    const g = R.g(hull, x, 0.0, z);
    const d = R.pm(duct, g), f = R.pm(fan, g, 0, -0.04, 0), st = R.pm(stubM, g, 0, 0, 0);
    const o = { x, z, bl: f.g, dir: x * z > 0 ? 1 : -1, broken: false };
    R.zone(['thruster', 'gear_gap'], x, z, { hide: [f.g], dark: [d.g], show: [st.g], fn: () => { o.broken = true; } });
    thr.push(o);
  }
  if (laser) {
    const panel = gset('rkt.panel', () => { const v = new VB(s, -0.4, 0, -0.4, 0.4, 0.16, 0.4); v.box(-0.32, 0, -0.32, 0.32, 0.08, 0.32, K.g4, { ch: 1 }); v.box(-0.32, 0, -0.32, 0.32, 0.09, -0.16, K.tl); v.box(-0.08, 0.08, -0.08, 0.08, 0.12, 0.08, K.g1); return v.weather({ seed: 4 }); });
    const lcore = gset('rkt.lcore', () => { const v = new VB(s, -0.32, -0.24, -0.32, 0.32, 0.24, 0.32); v.ell(0, 0, 0, 0.26, 0.15, 0.28, K.HOT); v.ell(0, 0.04, 0, 0.16, 0.12, 0.16, K.HOT2); for (const x of [-0.16, 0.08]) v.box(x, -0.2, -0.32, x + 0.08, 0.16, 0.32, K.g1); return v; });
    const pp = R.pm(panel, hull, 0, 0.66, -0.04);
    R.pm(lcore, hull, 0, 0.5, -0.04);
    R.zone('belly_panel', 0, 0, { hide: [pp.g] });
  }
  R.anim = (dt, s, t) => {
    flyerTilt(R, hull, thr, dt, s, t, 0.45, 18);
    const te = clamp(s.tele || 0, 0, 1);
    for (const p of pods) { p.rotation.x = damp(p.rotation.x, -te * 0.25, 4, dt); p.position.z = s.firing ? -Math.random() * 0.06 : damp(p.position.z, 0, 6, dt); }
  };
};

// ----------------------------------------------------------------------------- CLOUD SERVICE (turbyne): armoured sky-engine (rocketeer key, variant 'turbine')
BASE_R.turbine = 2.8;
MODELS.turbine = (R) => {
  const s = 0.12;
  R.refSpeed = 2;
  const gearXZ = [0, 1, 2, 3].map(n => { const a = n * Math.PI / 2 + Math.PI / 4; return [Math.sin(a) * 2.15, Math.cos(a) * 2.15]; });
  const shellG = gset('turb.shell', () => {
    const v = new VB(0.15, -2.7, -1.35, -2.7, 2.7, 1.2, 2.7);
    const ring = (y0, y1, r0, r1, fn) => v.fillIf(-r1, y0, -r1, r1, y1, r1, (X, Y, Z) => { const r = Math.hypot(X, Z); return Y >= y0 && Y < y1 && r < r1 && r >= r0; }, fn);
    ring(-0.84, 0.0, 1.08, 2.4, (X, Y, Z, i, j, k) => { const a = Math.atan2(X, Z); if (Y > -0.36 && Y < -0.12) return (Math.floor((a + Math.PI) / (Math.PI * 2) * 48) & 1) ? K.y0 : K.bk; return Math.abs(Math.sin(a * 6)) < 0.1 ? K.g1 : Math.cos(a * 6) > 0 ? K.g3 : K.g2; });
    ring(0.0, 0.36, 1.08, 2.16, (X, Y, Z, i, j, k) => { const a = Math.atan2(X, Z); return Math.abs(Math.sin(a * 6)) < 0.08 ? K.g2 : (Math.abs(Math.sin(a * 6)) < 0.3 && Math.hypot(X, Z) > 1.95 ? K.st : K.g4); });
    ring(0.36, 0.6, 1.08, 1.68, (X, Y, Z, i, j, k) => {
      const a = Math.atan2(X, Z);
      if (Math.hypot(X, Z) < 1.3) return (Math.floor((a + Math.PI) / (Math.PI * 2) * 12 + 0.5) % 3) ? K.y1 : K.g1;   // loading-spinner hub ring
      return Math.abs(a) < 0.42 && Y > 0.48 ? barcode('x', K.cer3, K.bk)(X, Y, Z, i, j, k) : K.g3;                   // service tag at the front
    });
    v.cylY(0, 0, -0.72, -0.48, 1.08, K.g1);
    v.cylY(0, 0, -0.48, -0.24, 0.3, K.g2); v.cylY(0, 0, -0.24, -0.12, 0.18, K.EXH);
    for (const [x, z] of gearXZ) { v.cylY(x, z, -1.32, 0.6, 0.5, -1); v.cylY(x, z, 0.24, 0.48, 0.62, K.g2, 0.5); v.cylY(x, z, -0.84, -0.6, 0.6, K.g1, 0.5); }
    for (let n = 0; n < 4; n++) {   // rim sensors
      const a = n * Math.PI / 2, x = Math.sin(a), z = Math.cos(a);
      v.box(x * 2.34 - 0.18, -0.6, z * 2.34 - 0.18, x * 2.34 + 0.18, -0.36, z * 2.34 + 0.18, K.g0);
      v.box(x * 2.4 - 0.12, -0.6, z * 2.4 - 0.12, x * 2.4 + 0.12, -0.48, z * 2.4 + 0.12, K.EYE);
      v.box(x * 1.92 - 0.24, 0.36, z * 1.92 - 0.24, x * 1.92 + 0.24, 0.6, z * 1.92 + 0.24, K.g2, { ch: 1 });   // nacelle bases
    }
    return v.weather({ seed: 141, rust: 0.16, rustScale: 2.5 });
  });
  const fan = bladesGS('fan', s, 1.02, 7, K.g4, K.y1);
  const nfan = bladesGS('fan', s, 0.3, 3, K.g5, K.y0);
  const tank = gset('turb.tank', () => { const v = new VB(s, -0.5, -0.8, -0.5, 0.5, 0.8, 0.5); v.cylY(0, 0, -0.72, 0.72, 0.4, (X, Y, Z, i, j, k) => (j % 3 === 0 ? K.bk : K.y0)); v.cylY(0, 0, -0.36, 0.36, 0.42, K.HOT, 0.3); v.cylY(0, 0, 0.72, 0.84, 0.2, K.st); return v.weather({ seed: 5 }); });
  const hull = R.g(R.top); R.jit = hull;
  R.pm(shellG, hull);
  const f = R.pm(fan, hull, 0, 0.36, 0);
  const fans = [f.g];
  for (let n = 0; n < 4; n++) { const a = n * Math.PI / 2; fans.push(R.pm(nfan, hull, Math.sin(a) * 1.92, 0.6, Math.cos(a) * 1.92).g); }
  const tanks = [];
  for (const [x, z] of gearXZ) { const tp = R.pm(tank, hull, x, -0.22, z); tanks.push(tp.g); R.zone('gear_gap', x, z, { hide: [tp.g] }); }
  R.anim = (dt, s, t) => {
    for (let n = 0; n < fans.length; n++) fans[n].rotation.y += dt * (s.stunned ? 1 : (n ? 14 : 4) + R.al * 2) * (n % 2 ? -1 : 1);
    for (const tg of tanks) tg.rotation.y += dt * 3;
    hull.rotation.x = damp(hull.rotation.x, Math.sin(t * 0.5) * 0.03 + R.mv * 0.05, 2, dt);
    hull.rotation.z = damp(hull.rotation.z, Math.sin(t * 0.4) * 0.03, 2, dt);
  };
};

// ----------------------------------------------------------------------------- PARKOUR DAD (leapr, key 'leaper'): four-legged leaping brute
BASE_R.leaper = 1.8;
MODELS.leaper = (R) => {
  const s = 0.08, bodyY = 1.45;
  R.refSpeed = 3.4;
  const hull = gset('leap.hull', () => {
    const v = new VB(s, -0.8, -0.56, -1.36, 0.8, 0.64, 1.6);
    v.box(-0.56, -0.32, -0.72, 0.56, 0.32, 0.72, K.g2, { ch: 3, cht: 2, chb: 2 });
    v.ell(0, 0.16, 0, 0.62, 0.34, 0.82, (X, Y, Z, i, j, k) => (k % 4 === 0 ? K.g3 : Math.abs(X) < 0.08 ? K.g4 : K.g5));
    v.paintBox(-0.7, 0.0, -0.9, 0.7, 0.24, 0.9, (X, Y, Z, i, j, k, c) => (c !== K.g2 && Math.abs(X) > 0.52 ? K.y1 : undefined));
    // core well on top (core + iris are separate parts)
    v.cylY(0, 0, 0.24, 0.64, 0.36, -1); v.cylY(0, 0, 0.2, 0.28, 0.38, K.g0); v.cylY(0, 0, 0.28, 0.5, 0.44, K.g1, 0.36);
    // rear abdomen with vents
    v.ell(0, 0.0, -0.92, 0.46, 0.34, 0.44, K.g2);
    v.paintBox(-0.5, -0.3, -1.4, 0.5, 0.3, -0.8, seam(2, 'y', K.g0));
    v.box(-0.16, 0.16, -1.36, 0.16, 0.24, -1.2, K.RED);
    // head + big round eye (eye_plate visor is a separate part)
    v.box(-0.36, -0.28, 0.64, 0.36, 0.24, 1.28, K.g3, { ch: 2, cht: 2, chb: 1 });
    v.box(-0.28, -0.24, 1.2, 0.28, 0.16, 1.36, K.g1);
    v.cylZ(0, -0.04, 1.28, 1.44, 0.2, K.EYE); v.cylZ(0, -0.04, 1.36, 1.48, 0.09, K.EYE2);
    v.box(-0.36, -0.12, 1.2, -0.28, -0.04, 1.32, K.EYE); v.box(0.28, -0.12, 1.2, 0.36, -0.04, 1.32, K.EYE);
    for (const sx of [-1, 1]) v.seg(sx * 0.16, -0.24, 1.16, sx * 0.12, -0.5, 1.4, 0.05, K.st);   // pulse prongs
    v.paintBox(-0.37, 0.16, 0.64, 0.37, 0.25, 1.0, seam(2, 'z', K.g2));
    v.paintBox(-0.37, -0.29, 0.88, 0.37, 0.25, 0.96, K.st2);                          // sweatband
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.cylY(sx * 0.5, sz * 0.5, -0.24, 0.2, 0.2, K.g3);
    return v.weather({ seed: 151, rust: 0.16 });
  });
  const plate = gset('leap.eyeplate', () => {
    const v = new VB(s, -0.4, -0.08, -0.16, 0.4, 0.32, 0.32);
    v.fillIf(-0.4, 0, -0.16, 0.4, 0.32, 0.32, (X, Y, Z) => Math.abs(X) < 0.34 - Y * 0.2 && Z < 0.24 - Y * 0.5 && Z > -0.12, (X, Y, Z) => (Math.abs(X) > 0.2 ? K.y1 : K.cap));   // dad-cap red brim
    return v.weather({ seed: 8, chip: 0.2 });
  });
  const core = gset('leap.core', () => { const v = new VB(s, -0.4, -0.2, -0.4, 0.4, 0.2, 0.4); v.cylY(0, 0, -0.16, 0.08, 0.34, K.HOT); v.cylY(0, 0, -0.16, 0.12, 0.2, K.HOT2); v.cylY(0, 0, 0.08, 0.16, 0.08, K.g1); return v; });
  const petal = gset('leap.petal', () => {
    const v = new VB(s, -0.08, -0.08, -0.08, 0.48, 0.16, 0.48);
    v.fillIf(0, 0, 0, 0.44, 0.08, 0.44, (X, Y, Z) => Math.hypot(X, Z) < 0.4 && X >= 0.01 && Z >= 0.01, (X, Y, Z, i, j, k) => (Math.hypot(X, Z) > 0.3 ? K.y1 : (i + k) % 3 === 0 ? K.g3 : K.g4));
    return v.weather({ seed: 2 });
  });
  const upper = limbGS('leap.up', s, 1.56, 0.17, 0.16, 0.13, 0.12, { haz: [0.72, 0.84], band: 0.4, seed: 4 });
  const lower = limbGS('leap.lo', s, 2.5, 0.13, 0.12, 0.05, 0.05, { band: 0.5, seed: 5, piston: false, col: K.g2, col2: K.g3, tip: (v, L) => { v.seg(0, 0, L - 0.2, 0, -0.08, L + 0.08, 0.06, K.st); v.seg(0, 0, L - 0.3, 0.12, -0.1, L - 0.05, 0.035, K.st); v.seg(0, 0, L - 0.3, -0.12, -0.1, L - 0.05, 0.035, K.st); } });
  const joint = jointGS('leap.knee', s, 0.17, 0.2);
  const body = R.g(R.top, 0, bodyY, 0);
  const hullG = R.g(body); R.jit = hullG;
  R.pm(hull, hullG);
  const ep = R.pm(plate, hullG, 0, 0.12, 1.2);
  R.zone('eye_plate', 0, 1.45, { hide: [ep.g] });
  R.pm(core, hullG, 0, 0.32, 0);
  const petals = [];
  for (let n = 0; n < 4; n++) { const g = R.g(hullG, 0, 0.5, 0); g.rotation.y = n * Math.PI / 2; petals.push(R.pm(petal, g).g); }
  const legs = [];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, -1, 0], [1, 1, 0.5], [-1, -1, 0.5]]) {
    const L = new Leg(R, body, [sx * 0.5, 0, sz * 0.5], [sx * 1.75, 0.13, sz * 1.75], 1.56, 2.5, { upper, lower, joint }, { phase: ph });
    const kn = L.kneeRest();
    R.zone('leg', kn[0], kn[2], { dark: [L.pJ.g], fn: () => { L.limp = true; } });
    legs.push(L);
  }
  let open = 0, crouch = 0;
  R.anim = (dt, s, t) => {
    const c = R.gait(dt, s, legs, { A: 0.32, H: 0.35, duty: 0.6, maxHz: 1.6, minHz: 0.6 });
    const te = clamp(s.tele || 0, 0, 1);
    crouch = damp(crouch, s.leaping ? -0.2 : te * 0.55 + (s.stunned ? 0.35 : 0), 6, dt);
    body.position.y = bodyY - crouch + Math.abs(Math.sin(c * Math.PI * 2)) * 0.05 * R.gmv;
    body.rotation.x = damp(body.rotation.x, s.leaping ? -0.3 : -te * 0.12, 4, dt);
    if (s.leaping) for (const L of legs) L.tgt.set(L.rest.x * 0.85, L.rest.y + 0.9, L.rest.z * 0.85 - 0.3);
    for (const L of legs) L.solve();
    open = damp(open, s.stunned ? 1 : 0, 3, dt);
    for (const p of petals) { p.position.set(open * 0.22, open * 0.04, open * 0.22); p.rotation.set(open * 0.35, 0, -open * 0.35); }
  };
};

// ----------------------------------------------------------------------------- HOA PRESIDENT (bastian, key 'bastion'): armoured gatling fortress
BASE_R.bastion = 2.2;
MODELS.bastion = (R) => {
  const s = 0.12, bodyY = 2.5;
  R.refSpeed = 1.8;
  const zfA = (X, Y) => 1.56 - 0.2 * (X / 1.2) ** 2 - Math.max(0, Y - 0.24) * 0.4;
  const hull = gset('bast.hull', () => {
    const v = new VB(s, -1.32, -0.96, -1.56, 1.32, 1.44, 1.8);
    v.box(-0.96, -0.6, -1.2, 0.96, 0.72, 1.08, K.g2, { ch: 2, cht: 2, chb: 1 });
    v.box(-0.84, 0.72, -1.08, 0.84, 0.96, 0.84, K.g4, { ch: 2, cht: 1 });
    v.paintBox(-0.84, 0.72, -1.08, 0.84, 0.98, 0.84, seam(4, 'z', K.g3, 1));
    v.paintBox(-0.84, 0.72, -1.08, 0.84, 0.98, 0.84, (X, Y, Z, i, j, k) => (Math.abs(Math.abs(X) - 0.42) < 0.06 ? K.g3 : undefined));
    v.paintBox(-0.84, 0.72, -1.08, 0.84, 0.98, 0.84, (X, Y, Z, i, j, k, c) => (c === K.g4 && Math.abs(X) > 0.6 && k % 4 === 2 ? K.st : undefined));
    v.box(-0.36, 0.96, -0.84, 0.36, 1.08, 0.12, K.g3); v.paintBox(-0.36, 0.96, -0.84, 0.36, 1.1, 0.12, seam(2, 'z', K.g1));   // top vent
    v.box(-0.84, 0.72, 0.6, 0.84, 1.0, 0.84, K.y1); v.box(-0.12, 0.72, 0.6, 0.12, 1.01, 0.84, K.bk);
    v.seg(0.54, 0.96, -0.66, 0.6, 1.4, -0.78, 0.05, K.st); v.box(0.48, 1.32, -0.84, 0.6, 1.44, -0.72, K.RED);
    for (const sx of [-1, 1]) v.box(sx > 0 ? 0.96 : -1.08, -0.48, -0.96, sx > 0 ? 1.08 : -0.96, 0.48, 0.84, K.g3);      // side skirts
    v.paintBox(-1.09, 0.36, -0.96, 1.09, 0.48, 0.84, (X, Y, Z, i, j, k) => (k % 2 ? K.cer3 : K.g1));   // picket-fence trim
    v.paintBox(-1.09, -0.48, -0.96, 1.09, 0.36, 0.84, seam(4, 'z', K.g1));
    // massive sloped front armour with a flush row of red eyes
    v.fillIf(-1.2, -0.96, 0.84, 1.2, 1.08, 1.68, (X, Y, Z) => { const zf = zfA(X, Y); return Z < zf && Z >= zf - 0.36 && Math.abs(X) < 1.2 - Math.max(0, Y - 0.72) * 0.8; },
      (X, Y, Z, i, j, k) => {
        const outer = Z >= zfA(X, Y) - s;
        if (outer && Y >= 0.24 && Y < 0.36 && Math.abs(X) < 0.66 && (i % 2 === 0)) return K.EYE;
        if (outer && Y >= 0.12 && Y < 0.48 && Math.abs(X) < 0.78) return K.g0;
        if (Math.abs(X) > 0.96) return haz(2)(X, Y, Z, i, j, k);
        if (Y < -0.72) return K.y1;
        return j % 4 === 0 ? K.g3 : K.g5;
      });
    v.paintBox(-1.3, -1, 0.84, 1.3, 1.1, 1.8, (X, Y, Z, i, j, k, c) => (c === K.g5 && (i % 5 === 2) && (j % 4 === 2) ? K.st : undefined));
    v.box(-0.48, -0.36, -1.32, 0.48, 0.36, -1.2, K.g0);                                   // rear core recess
    v.box(-0.6, -0.48, -1.44, -0.48, 0.6, -1.2, K.g3); v.box(0.48, -0.48, -1.44, 0.6, 0.6, -1.2, K.g3);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.box(sx * 0.7 - 0.24, -0.84, sz * 0.6 - 0.24, sx * 0.7 + 0.24, -0.48, sz * 0.6 + 0.24, K.g3, { ch: 1 });
    // violation notice posted on the deck: red header, two lines of small print, a signature
    v.paintBox(0.36, 0.84, -0.48, 0.72, 0.97, 0.0, (X, Y, Z) => (Z < -0.36 ? K.tie : (Z < -0.12 && X < 0.6) || (Z > -0.12 && X < 0.48) ? K.g2 : K.cer3));
    return v.weather({ seed: 161, rust: 0.18 });
  });
  const canister = gset('bast.can', () => {
    const v = new VB(s, -0.48, -0.6, -0.48, 0.48, 0.72, 0.48);
    v.cylY(0, 0, -0.48, 0.6, 0.33, K.HOT); v.cylY(0, 0, -0.24, 0.36, 0.34, K.HOT2, 0.26);
    for (const y of [-0.6, 0.48]) v.cylY(0, 0, y, y + 0.12, 0.28, K.g1);
    for (const y of [-0.36, 0.36]) v.cylY(0, 0, y, y + 0.12, 0.37, K.y0);
    for (let n = 0; n < 4; n++) { const a = n * Math.PI / 2 + Math.PI / 4; v.seg(Math.sin(a) * 0.38, -0.48, Math.cos(a) * 0.38, Math.sin(a) * 0.38, 0.6, Math.cos(a) * 0.38, 0.06, K.g2); }
    return v.weather({ seed: 7, chip: 0.1 });
  });
  const rcore = gset('bast.core', () => { const v = new VB(s, -0.5, -0.4, -0.3, 0.5, 0.4, 0.2); v.ell(0, 0, 0, 0.44, 0.36, 0.2, K.HOTR); v.ell(0, 0, 0.05, 0.26, 0.2, 0.15, K.HOT2); return v; });
  const mount = gset('bast.mount', () => {
    const v = new VB(s, -0.48, -0.48, -0.6, 0.48, 0.48, 0.6);
    v.box(-0.36, -0.36, -0.48, 0.36, 0.36, 0.36, K.g3, { ch: 1, cht: 1 });
    v.cylX(0, -0.12, -0.48, 0.48, 0.3, K.g2); v.box(-0.36, 0.24, -0.48, 0.36, 0.37, 0.36, K.y1);
    v.cylX(0.0, -0.36, -0.36, 0.36, 0.2, K.y2);
    return v.weather({ seed: 9, rust: 0.18 });
  });
  const gat = gatlingGS('bast.gat', 0.1, 1.1, 0.15, 6, 0.07);
  const upper = limbGS('bast.up', 0.15, 1.0, 0.27, 0.27, 0.22, 0.22, { band: 0.45, seed: 6 });
  const lower = limbGS('bast.lo', 0.15, 2.3, 0.25, 0.27, 0.18, 0.18, { band: 0.45, seed: 7, col: K.g2, col2: K.g3, haz: [0.06, 0.16] });
  const joint = jointGS('bast.knee', 0.15, 0.3, 0.3);
  const foot = gset('bast.foot', () => { const v = new VB(s, -0.48, -0.36, -0.48, 0.48, 0.24, 0.48); v.box(-0.36, -0.24, -0.36, 0.36, -0.0, 0.36, K.g2, { ch: 2, cht: 1 }); v.box(-0.12, 0, -0.12, 0.12, 0.12, 0.12, K.g3); v.paintBox(-0.37, -0.24, -0.37, 0.37, -0.12, 0.37, K.y1); return v.weather({ seed: 3 }); });
  const body = R.g(R.top, 0, bodyY, 0);
  const hullG = R.g(body); R.jit = hullG;
  R.pm(hull, hullG);
  const cp = R.pm(canister, hullG, 0, 0.12, -1.44);
  const core = R.pm(rcore, hullG, 0, 0, -1.2);
  R.zone('rear_canister', 0, -1.35, { hide: [cp.g], show: [core.g] });
  const guns = [];
  for (const sx of [-1, 1]) {
    const yawG = R.g(hullG, sx * 1.4, 0.06, 0.5);
    const mt = R.pm(mount, yawG);
    const spin = R.g(yawG, 0, -0.12, 0.3); R.pm(gat, spin);
    const st = R.pm(stubGS('', s, 0.3), yawG, 0, 0, 0.3);
    R.flash(flashGS('', s, 0.36), yawG, 0, -0.12, 1.46);
    R.zone('chaingun', sx * 1.45, 0.5, { hide: [spin], dark: [mt.g], show: [st.g] });
    guns.push({ yawG, spin });
  }
  const legs = [];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, -1, 0], [1, 1, 0.5], [-1, -1, 0.5]]) {
    const L = new Leg(R, body, [sx * 0.7, -0.66, sz * 0.6], [sx * 1.55, 0.24, sz * 1.45], 1.0, 2.3, { upper, lower, joint, foot }, { phase: ph });
    const kn = L.kneeRest();
    R.zone('leg_joint', kn[0], kn[2], { dark: [L.pJ.g], fn: () => { L.limp = true; } });
    legs.push(L);
  }
  R.anim = (dt, s, t) => {
    const c = R.gait(dt, s, legs, { A: 0.35, H: 0.3, duty: 0.62, maxHz: 1.1, minHz: 0.4 });
    body.position.y = bodyY + Math.abs(Math.sin(c * Math.PI * 2)) * 0.06 * R.gmv - (s.tele || 0) * 0.1;
    body.rotation.z = Math.sin(c * Math.PI * 2) * 0.02 * R.gmv;
    for (const L of legs) L.solve();
    const gz = clamp(wrapA(s.gaze || 0), -0.5, 0.5);
    for (const g of guns) { g.yawG.rotation.y = damp(g.yawG.rotation.y, gz, 3, dt); if (s.firing || s.tele > 0) g.spin.rotation.z += dt * (s.firing ? 30 : 8 * s.tele); }
  };
};

// ----------------------------------------------------------------------------- SHELL COMPANY (bombardeer, key 'bombardier'): artillery walker
BASE_R.bombardier = 2.2;
MODELS.bombardier = (R) => {
  const s = 0.12, bodyY = 2.0;
  R.refSpeed = 1.6;
  const hull = gset('bomb.hull', () => {
    const v = new VB(s, -1.32, -0.96, -1.56, 1.32, 1.08, 1.56);
    v.box(-0.96, -0.6, -1.08, 0.96, 0.48, 0.96, K.g2, { ch: 3, cht: 2, chb: 2 });
    v.box(-0.84, 0.48, -0.84, 0.84, 0.6, 0.72, K.g4, { ch: 3 });
    v.paintBox(-0.84, 0.48, -0.84, 0.84, 0.62, 0.72, seam(4, 'x', K.g3, 1));
    v.paintBox(-0.84, 0.48, -0.84, 0.84, 0.62, 0.72, (X, Y, Z, i, j, k, c) => (Math.abs(Math.hypot(X, Z - 0.1) - 0.78) < 0.07 ? K.y1 : undefined));
    v.cylY(0, 0.1, 0.48, 0.72, 0.62, K.g3); v.cylY(0, 0.1, 0.6, 0.72, 0.5, K.g1);       // turret ring
    for (let n = 0; n < 5; n++) { v.cylY(0.74, -0.6 + n * 0.25, 0.48, 0.84, 0.1, K.r2); v.cylY(0.74, -0.6 + n * 0.25, 0.84, 0.96, 0.07, K.y0); }   // shell magazine
    v.box(0.6, 0.48, -0.78, 0.9, 0.6, 0.48, K.g1);
    v.cylY(-0.72, -0.6, 0.48, 0.84, 0.06, K.st); v.cylY(-0.72, -0.6, 0.84, 0.96, 0.3, K.g4, 0.18); v.box(-0.78, 0.96, -0.66, -0.66, 1.08, -0.54, K.RED);   // spotter uplink dish
    v.box(-0.6, -0.36, 0.96, 0.6, 0.36, 1.2, K.g3, { ch: 2 });                                // sensor face
    v.box(-0.48, -0.12, 1.08, 0.48, 0.24, 1.2, K.g0);
    v.box(-0.36, 0.0, 1.2, 0.36, 0.12, 1.32, K.EYE); v.box(-0.12, 0.0, 1.2, 0.12, 0.12, 1.32, K.EYE2);   // one long slit eye
    v.box(-0.6, 0.24, 0.96, 0.6, 0.37, 1.2, barcode('x', K.cer3, K.bk));                          // barcoded brow
    v.box(-0.6, -0.48, -1.32, -0.48, 0.36, -1.08, K.g3); v.box(0.48, -0.48, -1.32, 0.6, 0.36, -1.08, K.g3);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.box(sx * 0.74 - 0.24, -0.84, sz * 0.74 - 0.24, sx * 0.74 + 0.24, -0.48, sz * 0.74 + 0.24, K.g3, { ch: 1 });
    v.paintBox(-0.97, -0.6, -1.08, 0.97, -0.36, 0.96, K.y1);
    return v.weather({ seed: 171, rust: 0.22 });
  });
  const mortar = gset('bomb.mortar', () => {
    const v = new VB(s, -0.48, -0.36, -0.48, 0.48, 2.4, 0.48);
    v.box(-0.36, -0.24, -0.36, 0.36, 0.24, 0.36, K.g3, { ch: 1, cht: 1 });
    v.cylX(0, 0, -0.48, 0.48, 0.2, K.g1);
    v.cylY(0, 0, 0.0, 2.16, 0.33, (X, Y, Z, i, j, k) => (j % 5 === 0 ? K.g2 : Y > 1.9 ? K.g4 : K.g3), 0.2);
    v.cylY(0, 0, 0.36, 0.84, 0.38, K.g2, 0.3); v.cylY(0, 0, 1.92, 2.16, 0.38, K.g2, 0.2);
    v.cylY(0, 0, 1.2, 1.44, 0.36, K.y1, 0.3);
    v.cylY(0, 0, 0.6, 0.72, 0.18, K.HOT);
    return v.weather({ seed: 13, rust: 0.18 });
  });
  const canister = gset('bomb.can', () => {
    const v = new VB(s, -0.6, -0.36, -0.36, 0.6, 0.36, 0.36);
    v.cylX(0, 0, -0.48, 0.48, 0.3, K.HOT); v.cylX(0, 0, -0.36, 0.36, 0.31, K.HOT2, 0.25);
    for (const x of [-0.6, 0.48]) v.cylX(0, 0, x, x + 0.12, 0.25, K.g1);
    for (const x of [-0.18, 0.06]) v.cylX(0, 0, x, x + 0.12, 0.33, K.y0);
    return v.weather({ seed: 3 });
  });
  const upper = limbGS('bomb.up', s, 1.3, 0.22, 0.22, 0.18, 0.18, { band: 0.36, seed: 8, haz: [0.75, 0.9] });
  const lower = limbGS('bomb.lo', s, 2.4, 0.2, 0.2, 0.12, 0.12, { band: 0.48, seed: 9, col: K.g2, col2: K.g3, piston: false, tip: (v, L) => v.box(-0.18, -0.18, L - 0.12, 0.18, 0.12, L + 0.12, K.g1) });
  const joint = jointGS('bomb.knee', s, 0.24, 0.24);
  const body = R.g(R.top, 0, bodyY, 0);
  const hullG = R.g(body); R.jit = hullG;
  R.pm(hull, hullG);
  const turret = R.g(hullG, 0, 0.72, 0.1);
  const pitch = R.g(turret, 0, 0.12, 0); pitch.rotation.x = 0.4;
  const mp = R.pm(mortar, pitch);
  const mst = R.pm(stubGS('', s, 0.4), turret, 0, 0.2, 0);
  R.zone('mortar', 0, 0.2, { hide: [mp.g], show: [mst.g] });
  R.flash(flashGS('', s, 0.5), pitch, 0, 2.3, 0).rotation.x = -Math.PI / 2;
  const cp = R.pm(canister, hullG, 0, 0.0, -1.32);
  const cst = R.pm(stubGS('', s, 0.36), hullG, 0, 0, -1.2);
  R.zone('rear_canister', 0, -1.4, { hide: [cp.g], show: [cst.g] });
  const legs = [];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, -1, 0], [1, 1, 0.5], [-1, -1, 0.5]]) {
    const L = new Leg(R, body, [sx * 0.74, -0.66, sz * 0.74], [sx * 1.8, 0.16, sz * 1.8], 1.3, 2.4, { upper, lower, joint }, { phase: ph });
    const kn = L.kneeRest();
    R.zone('leg_joint', kn[0], kn[2], { dark: [L.pJ.g], fn: () => { L.limp = true; } });
    legs.push(L);
  }
  let kick = 0;
  R.anim = (dt, s, t) => {
    const c = R.gait(dt, s, legs, { A: 0.3, H: 0.32, duty: 0.62, maxHz: 1.0, minHz: 0.4 });
    if (s.firing) kick = 1; kick = Math.max(0, kick - dt * 2);
    body.position.y = bodyY + Math.abs(Math.sin(c * Math.PI * 2)) * 0.05 * R.gmv - kick * 0.15;
    for (const L of legs) L.solve();
    turret.rotation.y = damp(turret.rotation.y, clamp(wrapA(s.gaze || 0), -0.6, 0.6), 2, dt);
    pitch.rotation.x = damp(pitch.rotation.x, 0.35 + (s.tele || 0) * 0.2, 2, dt);
    mp.g.position.y = -kick * 0.35;
  };
};

// ----------------------------------------------------------------------------- THE LANDLADY (queene, key 'queen'): colossal walker boss (+ Helicopter Mom / matriark)
BASE_R.queen = 4.5;
MODELS.queen = (R, def) => {
  const s = 0.15, matri = def.behavior === 'matriarch' || def.variant === 'matriarch', bodyY = 6.0;
  R.refSpeed = 1.4;
  const vk = matri ? 'queen.m.' : 'queen.';
  const hull = gset(vk + 'hull', () => {
    const v = new VB(s, -3.0, -1.8, -3.45, 3.0, 2.25, 3.6);
    v.ell(0, 0, 0, 2.5, 1.3, 2.7, (X, Y, Z) => (Math.abs(Math.sin(Math.atan2(X, Z) * 4)) < 0.08 ? K.g1 : Y > 0.6 ? K.g4 : K.g3));
    v.box(-1.95, -1.35, -1.95, 1.95, 0.45, 1.95, K.g2, { ch: 4 });
    v.ell(0, 0.9, 0, 1.95, 0.75, 2.1, (X, Y, Z, i, j, k) => (k % 5 === 0 || i % 6 === 0 ? K.g4 : matri ? K.g4 : K.g5));
    v.paint((X, Y, Z, i, j, k, c) => (c === K.g5 && i % 6 === 3 && k % 5 === 2 ? K.st : undefined));
    // reactor well on top: the core sits inside, ringed by hazard + cooling fins
    v.cylY(0, 0, 0.6, 2.25, 1.05, -1); v.cylY(0, 0, 0.45, 0.6, 1.05, K.g0);
    v.cylY(0, 0, 1.2, 1.8, 1.3, (X, Y, Z) => (Math.abs(Math.sin(Math.atan2(X, Z) * 8)) < 0.35 ? K.bk : K.y1), 1.05);
    for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4 + 0.39; v.box(Math.sin(a) * 1.12 - 0.08, 0.6, Math.cos(a) * 1.12 - 0.08, Math.sin(a) * 1.12 + 0.08, 1.5, Math.cos(a) * 1.12 + 0.08, K.g2); }
    // under-plate machinery (visible once plates are shot off)
    for (const [x, z] of [[0, 2.5], [0, -2.5], [2.3, 0], [-2.3, 0]]) { v.box(x - 0.6, -0.75, z - 0.6, x + 0.6, 0.3, z + 0.6, K.g1); v.box(x - 0.3, -0.45, z - 0.3, x + 0.3, 0.0, z + 0.3, K.EXH); }
    // mortar racks on the back (the Matriark carries missile pods there instead)
    if (!matri) for (const sx of [-1, 1]) {
      v.box(sx * 1.2 - 0.6, 1.05, -2.25, sx * 1.2 + 0.6, 1.8, -1.2, K.g3, { ch: 1 });
      for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) { v.cylY(sx * 1.2 - 0.38 + a * 0.38, -1.95 + b * 0.45, 1.65, 1.95, 0.15, K.g0); v.cylY(sx * 1.2 - 0.38 + a * 0.38, -1.95 + b * 0.45, 1.65, 1.8, 0.08, K.EXH); }
      v.box(sx * 1.2 - 0.61, 1.05, -2.26, sx * 1.2 + 0.61, 1.35, -1.19, K.y1);
    }
    if (matri) for (const sx of [-1, 1]) v.box(sx * 1.45 - 0.45, 0.9, -2.4, sx * 1.45 + 0.45, 1.2, -1.2, K.g1);   // pod cradles
    v.seg(0.45, 1.65, -1.05, 0.6, 2.1, -1.5, 0.07, K.st); v.box(0.45, 1.95, -1.65, 0.75, 2.25, -1.35, K.RED);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { v.ell(sx * 1.9, -0.2, sz * 1.9, 0.68, 0.62, 0.68, K.g2); v.ell(sx * 1.9, 0.15, sz * 1.9, 0.52, 0.45, 0.52, K.g4); }
    return v.weather({ seed: matri ? 182 : 181, rust: 0.2, rustScale: 2.5 });
  });
  const plateGS = (w, h) => gset(vk + 'plate' + w, () => {
    const v = new VB(s, -w / 2 - 0.15, -h / 2 - 0.15, -0.3, w / 2 + 0.15, h / 2 + 0.15, 0.6);
    const zfP = (X, Y) => 0.45 - 0.3 * (X / (w / 2)) ** 2 - Math.max(0, Y) * 0.1;
    v.fillIf(-w / 2, -h / 2, -0.3, w / 2, h / 2, 0.6, (X, Y, Z) => { const zf = zfP(X, Y); return Z < zf && Z >= zf - 0.3 && Math.abs(X) < w / 2 - Math.max(0, Y - h * 0.25) * 0.5; },
      (X, Y, Z, i, j, k) => {
        if (Y > h / 2 - 0.3) return K.y1;
        if (Math.abs(X) > w / 2 - 0.3) return haz(2)(X, Y, Z, i, j, k);
        if (Math.abs(Math.abs(X) - w / 6) < 0.07 || Math.abs(Y + h / 6) < 0.07) return K.g3;
        return matri ? K.g4 : K.g5;
      });
    v.paint((X, Y, Z, i, j, k, c) => ((c === K.g5 || c === K.g4) && i % 4 === 1 && j % 4 === 2 ? K.st : undefined));
    return v.weather({ seed: 19, rust: 0.16, chip: 0.2 });
  });
  const core = gset('queen.core', () => { const v = new VB(s, -1.05, -0.6, -1.05, 1.05, 0.9, 1.05); v.ell(0, 0, 0, 0.92, 0.7, 0.92, K.HOTR); v.ell(0, 0.2, 0, 0.55, 0.5, 0.55, K.HOT2); for (let n = 0; n < 6; n++) { const a = n * Math.PI / 3; v.seg(0, 0.75, 0, Math.sin(a) * 0.95, 0.2, Math.cos(a) * 0.95, 0.09, K.g1); } return v; });
  const head = gset(vk + 'head', () => {
    const v = new VB(s, -1.05, -0.9, -0.6, 1.05, 0.9, 1.95);
    v.box(-0.75, -0.6, -0.45, 0.75, 0.6, 1.2, K.g2, { ch: 2, cht: 2, chb: 1 });
    v.box(-0.6, 0.6, -0.3, 0.6, 0.75, 1.05, K.g4, { ch: 1 }); v.paintBox(-0.6, 0.6, -0.3, 0.6, 0.8, 1.05, seam(3, 'z', K.g3));
    v.box(-0.6, 0.6, 0.75, 0.6, 0.77, 1.05, K.y1);
    v.box(-0.6, -0.3, 1.05, 0.6, 0.3, 1.2, K.g0);
    v.cylZ(0, 0.0, 1.05, 1.35, 0.3, K.EYE); v.cylZ(0, 0.0, 1.2, 1.5, 0.15, K.EYE2);
    for (const sx of [-1, 1]) v.box(sx * 0.48 - 0.08, 0.0, 1.13, sx * 0.48 + 0.08, 0.15, 1.35, K.EYE);
    v.cylZ(0, -0.45, 1.0, 1.8, 0.12, K.st); v.cylZ(0, -0.45, 1.65, 1.8, 0.17, K.g1); v.cylZ(0, -0.45, 1.75, 1.88, 0.08, K.YEL);   // sweep laser
    for (const sx of [-1, 1]) v.seg(sx * 0.6, -0.5, 1.0, sx * 0.4, -0.85, 1.6, 0.11, K.g3);   // mandibles
    if (!matri) for (const sx of [-1, 1]) {                                                   // string of pearls round the jaw
      for (const x of [0.225, 0.525]) v.box(sx * x - 0.07, -0.6, 1.2, sx * x + 0.07, -0.45, 1.35, K.cer3);
      for (const z of [0.525, 0.825]) v.box(sx * 0.825 - 0.07, -0.6, z - 0.07, sx * 0.825 + 0.07, -0.45, z + 0.07, K.cer3);
    }
    return v.weather({ seed: 183, rust: 0.14 });
  });
  const upper = limbGS(vk + 'up', s, 3.4, 0.48, 0.48, 0.4, 0.4, { band: 0.75, seed: 10, rust: 0.16 });
  const lower = limbGS(vk + 'lo', s, 8.4, 0.42, 0.45, 0.2, 0.2, { band: 1.05, seed: 11, col: K.g2, col2: K.g3, haz: [0.03, 0.09], tip: (v, L) => { v.seg(0, 0, L - 0.6, 0, -0.1, L + 0.15, 0.18, K.st); } });
  const joint = jointGS('queen.knee', s, 0.52, 0.52);
  const body = R.g(R.top, 0, bodyY, 0);
  const hullG = R.g(body); R.jit = hullG;
  R.pm(hull, hullG);
  const cg = R.pm(core, hullG, 0, 0.8, 0);
  const plates = [];
  const pdefs = [['plate_front', 0, 2.7, 0, 3.0, 1.95], ['plate_rear', 0, -2.7, Math.PI, 3.0, 1.95], ['plate_side', -2.45, 0, -Math.PI / 2, 3.3, 1.95], ['plate_side', 2.45, 0, Math.PI / 2, 3.3, 1.95]];
  for (const [name, x, z, ry, w, h] of pdefs) {
    const g = R.g(hullG, x, -0.3, z); g.rotation.y = ry;
    R.pm(plateGS(w, h), g);
    plates.push(R.zone(name, x * 1.27, z * 1.15, { hide: [g] }));
  }
  if (matri) {
    const pod = gset('queen.m.pod', () => {
      const v = new VB(s, -0.75, -0.15, -0.9, 0.75, 1.2, 0.9);
      v.box(-0.6, 0, -0.75, 0.6, 0.9, 0.75, K.g2, { ch: 1, cht: 1 });
      v.box(-0.6, 0.75, -0.75, 0.6, 0.92, -0.15, K.y1, { ch: 1 }); v.box(-0.6, 0.75, -0.45, 0.6, 0.93, -0.3, K.bk);
      v.box(-0.6, 0.75, -0.15, 0.6, 0.9, 0.75, K.g4, { ch: 1 });
      for (let a = 0; a < 3; a++) for (let b = 0; b < 2; b++) { v.box(-0.45 + a * 0.33, 0.15 + b * 0.3, -0.9, -0.27 + a * 0.33, 0.33 + b * 0.3, -0.6, K.g0); v.box(-0.42 + a * 0.33, 0.18 + b * 0.3, -0.84, -0.3 + a * 0.33, 0.3 + b * 0.3, -0.72, K.RED); }
      return v.weather({ seed: 23, rust: 0.15 });
    });
    for (const sx of [-1, 1]) {
      const pg = R.pm(pod, hullG, sx * 1.45, 1.2, -2.0);
      R.zone('missile_pod', sx * 1.45, -2.35, { hide: [pg.g], show: [R.pm(stubGS('', s, 0.5), hullG, sx * 1.45, 1.3, -1.8).g] });
    }
  }
  let prop = null;
  if (matri) {   // propeller beanie on a short mast at the back
    const mast = gset('queen.m.mast', () => { const v = new VB(s, -0.2, 0, -0.2, 0.2, 1.05, 0.2); v.cylY(0, 0, 0, 0.9, 0.08, K.st); v.cylY(0, 0, 0.75, 1.05, 0.16, K.y0); return v.weather({ seed: 2 }); });
    R.pm(mast, hullG, -0.6, 1.5, -1.3);
    prop = R.pm(bladesGS('mprop', s, 0.66, 4, K.g5, K.y0), hullG, -0.6, 2.5, -1.3).g;
  }
  const headYaw = R.g(hullG, 0, -0.3, 2.85);
  R.pm(head, headYaw);
  const legs = [];
  for (const [sx, sz, ph] of [[-1, 1, 0], [1, -1, 0], [1, 1, 0.5], [-1, -1, 0.5]]) {
    const L = new Leg(R, body, [sx * 1.9, 0, sz * 1.9], [sx * 3.9, 0.3, sz * 3.9], 3.4, 8.4, { upper, lower, joint }, { phase: ph });
    const kn = L.kneeRest();
    R.zone('leg_joint', kn[0], kn[2], { dark: [L.pJ.g], fn: () => { L.limp = true; } });
    legs.push(L);
  }
  R.anim = (dt, s, t) => {
    const c = R.gait(dt, s, legs, { A: 0.8, H: 0.9, duty: 0.65, maxHz: 0.6, minHz: 0.25 });
    body.position.y = bodyY + Math.abs(Math.sin(c * Math.PI * 2)) * 0.12 * R.gmv - (s.tele || 0) * 0.2;
    body.rotation.z = Math.sin(c * Math.PI * 2) * 0.015 * R.gmv;
    for (const L of legs) L.solve();
    headYaw.rotation.y += clamp(wrapA(clamp(wrapA(s.gaze || 0), -0.9, 0.9) - headYaw.rotation.y), -1.2 * dt, 1.2 * dt);
    headYaw.rotation.x = damp(headYaw.rotation.x, s.pitch ?? (0.12 + R.al * 0.1), 2, dt);
    const nb = plates.filter(p => p.broken).length;
    cg.g.scale.setScalar(1 + nb * 0.06 + Math.sin(t * 3) * 0.02);
    if (prop) prop.rotation.y += dt * (s.stunned ? 0.5 : 2.5 + R.al * 6);   // spins faster when she's worried
  };
};

// ============================================================================= factory
const FALLBACK = (def) => (def?.flying ? 'wasp' : (def?.height || 1) > 2.5 ? 'bastion' : (def?.radius || 0.5) > 1 ? 'leaper' : 'tick');
export function createArkModel(modelKey, def = {}) {
  def = def || {};
  let key = MODELS[modelKey] ? modelKey : FALLBACK(def);
  const R = new Rig(key, def);
  // dedicated rigs for variants that share a model key with a different silhouette
  let built = key;
  if (key === 'fireball' && (def.behavior === 'shredder' || def.hover)) built = 'shredder';
  if (key === 'rocketeer' && def.variant === 'turbine') built = 'turbine';
  MODELS[built](R, def);
  const baseR = BASE_R[built] || BASE_R[key] || 1;
  const r = def.size?.radius ?? def.radius ?? baseR;
  R.k = r / baseR;
  R.top.scale.setScalar(R.k);
  R.root.userData.ark = R;
  // free the per-rig material clones when the game removes the ARK from the scene (shared programs stay cached)
  R.root.addEventListener('removed', () => { R.eyeMat.dispose(); R.hotMat.dispose(); R.teleMat.dispose(); });
  return { root: R.root, update: (dt, s) => R.update(dt, s), setBroken: (z) => R.setBroken(z), hit: (wx, wz, k, big, yaw) => R.hit(wx, wz, k, big, yaw), rig: R };
}
export const ARK_MODEL_KEYS = Object.keys(MODELS);
