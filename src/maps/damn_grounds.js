// Dam Grounds (1100 x 825 m, north up) - an original layout.
// Story: the regional hydro utility, Synergy Power & Light, missed one payment too many and the ARK came to
// repossess it. A curved arch dam (The Damn Dam) holds back the Overdue Reservoir along the north edge. Below
// it a sheer-walled gorge runs south past the powerhouse, under the collapsed highway (The Bridge To Nowhere)
// and opens onto the southern lowlands. Two plateaus flank the gorge:
//   * WEST plateau - the staff town: Golden Handshake Villa, the marina, Shoebox Flats, the Show Home
//     cul-de-sac, the Department of Synergy head office and the Ivory Tower at the dam's west end; the
//     Bottleneck intake tower stands in the reservoir on a causeway bridge.
//   * EAST plateau - the floodgates and the dry Spillway of Regret chute, the Paywall vault compound, the
//     Kale Bubble domes, the Impound Lot, the Eastside Squat and the Bottom Line Balcony on the escarpment.
//   * GORGE floor - the powerhouse (The Hamster Wheel turbine hall), transformer yard, the Corporate Ladder
//     stair house up the east wall, a ledge road down the west wall, the plunge pool hatch.
//   * LOWLANDS - Liquid Assets water treatment, the Beta Test Battlefield, the Surge Pricing Substation, the
//     red tailings ponds (Red Ink Lakes), the QA annex, Without-A-Paddle Creek, the Final Sale Scrapyard,
//     Recess Park and the Drip Pricing Towers, the Overdraft Marsh (SW) and the Ant Hills (SE).
// Levels: LOW = lowlands + gorge floor, PLAT = both plateaus + the dam crest (the reservoir lies below the
// crest). Design note + POI table: docs/maps/damn_grounds.md.
import './props_damn_grounds.js';
import { waterMaterial } from '../engine/materials.js';
import { pointInPoly, mulberry, rotFrame, rotPt, unrotPt } from '../engine/world.js';
import { TID } from '../engine/textures.js';
import { propInfo } from '../engine/models.js';

const W = 1100, H = 825;
const LOW = 2.4;              // lowland / gorge floor reference height
const PLAT = 14;              // plateaus and the dam crest
const RES_WATER = 11.6, RES_BED = 5;
const RIVER = 1.6;            // tailrace river surface (wadeable)
const MARSH = 2.2;            // marsh pools
const POND = 2.15;            // Red Ink Lakes surface
const PI = Math.PI;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (t) => t * t * (3 - 2 * t);
const sm = (e0, e1, v) => smooth(clamp((v - e0) / (e1 - e0), 0, 1));
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------------------------ the arch dam
// A circular arch, convex toward the reservoir: downstream face at radius rIn, upstream face at rOut, crest in
// between at PLAT; `half` = half the arch angle. t = 0 points due north from the centre.
const ARCH = { cx: 585, cz: 340, rIn: 180, rOut: 190, half: 0.74 };
const archPt = (r, t) => [ARCH.cx + r * Math.sin(t), ARCH.cz - r * Math.cos(t)];
const archRT = (x, z) => [Math.hypot(x - ARCH.cx, z - ARCH.cz), Math.atan2(x - ARCH.cx, ARCH.cz - z)];
const arc = (r, t0, t1, n) => Array.from({ length: n + 1 }, (_, i) => archPt(r, t0 + (t1 - t0) * i / n));
const CREST_R = (ARCH.rIn + ARCH.rOut) / 2;

// ------------------------------------------------------------------------------------ regions
const RESERVOIR = [[250, -6], [872, -6], [866, 36], [846, 74], [812, 108], [778, 140], [752, 170], [738, 188], [726, 193],
  ...arc(ARCH.rOut, ARCH.half, -ARCH.half, 30), [446, 194], [428, 176], [400, 165], [362, 163], [326, 158], [296, 147], [276, 126], [262, 94], [256, 48]];
const GORGE = [...arc(ARCH.rIn, -ARCH.half, ARCH.half, 30),
  [704, 240], [702, 290], [736, 296], [746, 322], [712, 346], [686, 382], [672, 430], [664, 476], [600, 486], [534, 476], [527, 424], [517, 372], [503, 322], [488, 272], [474, 236]];
const W_PLAT = [[-8, 110], [560, 110], [560, 392], [470, 404], [380, 398], [260, 402], [150, 410], [60, 402], [-8, 396]];
const E_PLAT = [[560, 110], [1108, 110], [1108, 446], [1040, 446], [990, 441], [940, 437], [880, 429], [820, 425], [760, 429], [700, 433], [560, 437]];
const NW_HILLS = [[-8, -8], [262, -8], [250, 40], [226, 70], [170, 84], [120, 120], [70, 160], [-8, 176]];
const NE_HILLS = [[860, -8], [1108, -8], [1108, 176], [1050, 168], [990, 152], [930, 140], [890, 112], [872, 60]];
const ANT_HILLS = [[850, 660], [930, 650], [1020, 660], [1108, 640], [1108, 832], [820, 832], [800, 760]];
const MARSH_POLY = [[-8, 548], [70, 552], [130, 580], [180, 640], [210, 700], [256, 736], [318, 760], [372, 796], [392, 832], [-8, 832]];
const CHUTE = { x0: 720, x1: 734, z0: 197, z1: 304, h0: 10.6 };          // Spillway of Regret (dry chute down the east wall)
const LEDGE = [[469, 210], [481, 238], [495, 274], [509, 320], [519, 346]]; // ledge road down the west gorge wall
const LEDGE_W = 7.5;
const BRIDGE = { z: 360, x0: 503, x1: 712, gap0: 590, gap1: 618, y: 14.35 };   // The Bridge To Nowhere
const PONDS = [[745, 478, 800, 536], [808, 478, 863, 536], [871, 480, 926, 538], [745, 544, 800, 604], [808, 544, 863, 604], [871, 546, 926, 606]];
const RIVER_PTS = [[588, 214], [594, 250], [604, 300], [612, 350], [614, 400], [608, 450], [602, 500], [590, 552], [566, 598], [528, 636], [482, 668], [432, 698], [388, 728], [342, 756], [292, 778], [230, 796], [150, 808], [60, 812], [-8, 814]];
const CREEK_PTS = [[1108, 606], [1060, 616], [1010, 628], [958, 636], [900, 642], [840, 650], [790, 662], [740, 666], [690, 656], [646, 634], [610, 606], [594, 580]];
const ROADS = [
  [[-4, 332], [90, 336], [200, 341], [320, 346], [420, 350], [480, 356], [506, 360]],                                    // Repo Road west
  [[709, 360], [760, 356], [840, 352], [920, 352], [1000, 346], [1060, 342], [1104, 340]],                               // Repo Road east
  [[452, 214], [447, 250], [442, 300], [440, 348]],                                                                       // dam access west
  [[742, 202], [780, 214], [800, 232], [804, 300], [800, 352]],                                                          // dam access east
  [[302, 346], [305, 400], [316, 446], [338, 478], [352, 520], [336, 580], [304, 640], [292, 720], [296, 790], [300, 830]], // Lowland Drive (south)
  [[352, 520], [420, 514], [500, 510], [560, 504], [604, 500], [650, 490], [700, 470], [760, 462], [840, 464], [920, 470], [980, 482], [1012, 500], [1060, 518], [1104, 524]],   // Collections Road
  [[650, 490], [664, 540], [674, 600], [664, 662], [646, 720], [640, 780], [644, 830]],                                   // Substation Road (south)
  [[1050, 343], [1052, 400], [1052, 448], [1050, 516]],                                                                   // east ramp road
];
const TRACKS = [
  [[200, 341], [180, 300], [140, 262], [150, 200], [200, 150], [260, 160], [310, 175], [380, 182], [420, 190], [446, 206]],   // staff town lane
  [[519, 346], [536, 330], [552, 300], [560, 250], [566, 214]],                                                           // gorge floor road north
  [[519, 346], [548, 380], [580, 420], [596, 470], [604, 498]],                                                           // gorge floor road south
  [[470, 512], [470, 548], [478, 590]],                                                                                   // battlefield track
  [[1012, 500], [1000, 560], [970, 620], [950, 668], [960, 720], [1000, 760], [1030, 776]],                               // Ant Hills track
  [[668, 640], [720, 676], [780, 686], [850, 680], [910, 690], [950, 700]],                                               // creek track
  [[650, 718], [610, 728], [580, 728]],                                                                                   // scrapyard spur
  [[300, 640], [260, 660], [200, 640], [150, 610], [118, 600]],                                                          // marsh track
  [[296, 760], [240, 765], [190, 762]],                                                                                   // pumping station lane
  [[900, 352], [900, 400], [905, 430]],                                                                                   // balcony lane
];
const BOARDWALKS = [
  [[118, 620], [100, 660], [92, 700], [110, 740], [160, 760]],
  [[160, 760], [120, 790], [70, 790]],
  [[150, 610], [190, 690], [218, 724]],
];
const SPAWNS = [[50, 186], [24, 420], [28, 520], [30, 690], [150, 806], [372, 812], [560, 812], [760, 808], [900, 806], [1078, 720], [1080, 580],
  [1086, 470], [1080, 270], [1010, 186], [880, 150], [222, 172], [372, 186], [776, 186], [196, 300], [448, 446], [700, 716], [1020, 410]];

export default {
  id: 'damn_grounds', name: 'Dam Grounds', size: [W, H], seed: 9127,
  base: 'grass', cliff: 'rock',
  ambient: { music: 'damn_grounds', birds: true, frogs: true, insects: true },
  conditions: ['night_raid', 'em_storm', 'lush_blooms', 'uncovered_caches', 'husk_graveyard', 'prospecting_probes', 'harvester', 'matriarch', 'cold_snap', 'hurricane', 'close_scrutiny'],
  build(w, rng) {
    const C = makeCtx(w, rng), T = { t: performance.now() };
    const step = (name, fn) => { fn(C); const t = performance.now(); T[name] = Math.round(t - T.t); T.t = t; };
    step('terrain', terrain); step('under', undergrounds); step('dam', damAndGorge); step('west', westPlateau); step('east', eastPlateau);
    step('lowlands', lowlands); step('south', southlands); step('outskirts', outskirts); step('vegetation', vegetation); step('ark', arkSpawns); step('markers', markers);
    delete T.t; w.buildTimings = T;
  },
};

// tileless value noise in [0,1]
function makeNoise(seed) {
  const r = mulberry(seed), perm = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) perm[i] = r();
  const h = (a, b) => perm[((a * 73856093) ^ (b * 19349663)) & 1023];
  return (x, z) => {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
    const a = h(ix, iz), b = h(ix + 1, iz), c = h(ix, iz + 1), d = h(ix + 1, iz + 1);
    return (a + (b - a) * sx) * (1 - sz) + (c + (d - c) * sx) * sz;
  };
}

// ==================================================================================== CONTEXT
function makeCtx(w, rng) {
  const C = { w, rng, B: {} };
  const WV = w.tw + 1, VH = w.th + 1;
  C.R = (a, b) => a + rng() * (b - a);
  C.pick = (a) => a[Math.floor(rng() * a.length)];
  C.chance = (p) => rng() < p;
  C.areaFn = (x0, z0, x1, z1, fn) => {
    for (let z = Math.max(0, Math.floor(z0)); z <= Math.min(w.th, Math.ceil(z1)); z++)
      for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(w.tw, Math.ceil(x1)); x++) {
        const i = z * WV + x, v = fn(x, z, w.hv[i]);
        if (v != null) w.hv[i] = v;
      }
  };
  // linear ramp inside a rect along axis; side = soft side blend (0 = hard sides)
  C.slope = (x0, z0, x1, z1, h0, h1, axis, side = 3) => {
    const ex = axis === 'z' ? side : 0, ez = axis === 'x' ? side : 0;
    C.areaFn(x0 - ex, z0 - ez, x1 + ex, z1 + ez, (x, z, cur) => {
      const t = axis === 'x' ? (x - x0) / (x1 - x0) : (z - z0) / (z1 - z0);
      if (t < 0 || t > 1) return null;
      const d = axis === 'x' ? Math.max(z0 - z, 0, z - z1) : Math.max(x0 - x, 0, x - x1);
      const f = d <= 0 ? 1 : side > 0 ? 1 - smooth(clamp(d / side, 0, 1)) : 0;
      if (f <= 0) return null;
      return cur + (lerp(h0, h1, t) - cur) * f;
    });
  };
  // scanline polygon fill over terrain vertices (fn(vertexIndex, col, row))
  C.scanFill = (pts, fn, step = 1, cols = WV, rows = VH) => {
    for (let r = 0; r < rows; r++) {
      const z = r * step, xs = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, zi] = pts[i], [xj, zj] = pts[j];
        if ((zi > z) !== (zj > z)) xs.push(xi + (z - zi) / (zj - zi) * (xj - xi));
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) for (let c = Math.max(0, Math.ceil(xs[k] / step)); c <= Math.min(cols - 1, Math.floor(xs[k + 1] / step)); c++) fn(r * cols + c, c, r);
    }
  };
  // terrain ops in a turned frame (design rect X0..X1 x Z0..Z1)
  C.lshape = (G, X0, Z0, X1, Z1, fn) => {
    const q = GR(G, X0, Z0, X1, Z1), xs = q.map(p => p[0]), zs = q.map(p => p[1]);
    C.areaFn(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), (x, z, cur) => {
      const [X, Z] = GL(G, x, z); if (X < X0 || X > X1 || Z < Z0 || Z > Z1) return null;
      return fn(X, Z, cur);
    });
  };
  C.lslope = (G, X0, Z0, X1, Z1, h0, h1, axis) => C.lshape(G, X0, Z0, X1, Z1, (X, Z) => lerp(h0, h1, axis === 'u' ? (X - X0) / (X1 - X0) : (Z - Z0) / (Z1 - Z0)));
  C.lfill = (G, X0, Z0, X1, Z1, h) => C.scanFill(GR(G, X0, Z0, X1, Z1), (i) => { w.hv[i] = h; });
  const distSeg = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1; const t = clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
  C.distLine = (px, pz, pts) => { let d = 1e9; for (let k = 0; k < pts.length - 1; k++) d = Math.min(d, distSeg(px, pz, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1])); return d; };
  // on the dam crest (pad > 0 grows it, pad < 0 insets)
  C.inDam = (x, z, pad = 0) => { const [r, t] = archRT(x, z); return Math.abs(t) < ARCH.half + 0.06 && r > ARCH.rIn - pad && r < ARCH.rOut + pad; };
  // clearings that vegetation / scatter avoid: [cx, cz, r] and rects [x0,z0,x1,z1]
  C.clear = []; C.clearRects = [];
  C.addClear = (x, z, r) => C.clear.push([x, z, r]);
  C.addClearRect = (a, b, c, d) => C.clearRects.push([a, b, c, d]);
  C.inBuilding = (x, z, pad = 0.8) => w.buildings.some(b => {
    if (x < b.ax0 - pad || x > b.ax1 + pad || z < b.az0 - pad || z > b.az1 + pad) return false;
    const [lx, lz] = b.R ? unrotPt(b.R, x, z) : [x, z];
    return lx > b.x0 - pad && lx < b.x1 + pad && lz > b.z0 - pad && lz < b.z1 + pad;
  });
  C.nearRoad = (x, z, extra = 1.5) => ROADS.some(r => C.distLine(x, z, r) < 3.5 + extra) || TRACKS.some(r => C.distLine(x, z, r) < 2 + extra);
  C.blocked = (x, z) => C.inBuilding(x, z) || C.clear.some(([cx, cz, r]) => (x - cx) ** 2 + (z - cz) ** 2 < r * r) || C.clearRects.some(([a, b, c, d]) => x > a && x < c && z > b && z < d);
  C.doorPts = [];
  // spatial hash of solid prop footprints so clutter / loot never land inside props or block doors
  const PH = new Map(), PC = 4, phKey = (cx, cz) => cx * 4096 + cz;
  // underground halls: anything placed over one without an explicit level goes on the lid (surface)
  C.halls = [];
  C.hallAt = (x, z) => C.halls.find(h => x >= h.b[0] && x <= h.b[2] && z >= h.b[1] && z <= h.b[3] && pointInPoly(x, z, h.poly));
  const lvlFree = (o) => o.yAbs == null && o.bid == null && !o.surface;
  const baseProp = w.prop.bind(w), baseCont = w.container.bind(w), baseLamp = w.lamp.bind(w);
  w.container = (kind, x, z, rot = 0, opts = {}) => baseCont(kind, x, z, rot, lvlFree(opts) && C.halls.length && C.hallAt(x, z) ? { ...opts, surface: true } : opts);
  // lamp whose fixture stands at absolute height `base` (decks, bridges, roofs, tunnel lids)
  C.lampAt = (x, z, base, o = {}) => {
    const y = o.y ?? 3.6, model = o.model === undefined ? 'lamp' : o.model;
    baseLamp(x, z, { ...o, yAbs: base + Math.min(y, 2.8), range: (o.range ?? 10) + Math.max(0, y - 2.8) * 0.6, model: null });
    if (model) baseProp(model, x, z, o.rot || 0, { solid: [0.15, 0.15, 3], yAbs: base });
  };
  w.lamp = (x, z, o = {}) => { if (o.yAbs == null && C.halls.length) { const h = C.hallAt(x, z); if (h) return C.lampAt(x, z, h.top, o); } return baseLamp(x, z, o); };
  w.prop = (kind, x, z, rot = 0, opts = {}) => {
    if (lvlFree(opts) && C.halls.length && C.hallAt(x, z)) opts = { ...opts, surface: true };
    baseProp(kind, x, z, rot, opts);
    if (!opts.solid || (opts.yRel || 0) > 0.5 || opts.yAbs != null || opts.surface) return;
    const sol = opts.solid === true ? propInfo(kind).solid : opts.solid; if (!sol) return;
    const sc = opts.scale || 1; let hw = sol[0] * sc, hd = sol[1] * sc; if (Math.abs(Math.sin(rot)) > 0.7) [hw, hd] = [hd, hw];
    const box = [x - hw, z - hd, x + hw, z + hd];
    for (let cz = Math.floor(box[1] / PC); cz <= Math.floor(box[3] / PC); cz++) for (let cx = Math.floor(box[0] / PC); cx <= Math.floor(box[2] / PC); cx++) {
      const k = phKey(cx, cz); if (!PH.has(k)) PH.set(k, []); PH.get(k).push(box);
    }
  };
  C.propHit = (x0, z0, x1, z1) => {
    for (let cz = Math.floor(z0 / PC); cz <= Math.floor(z1 / PC); cz++) for (let cx = Math.floor(x0 / PC); cx <= Math.floor(x1 / PC); cx++) {
      const l = PH.get(phKey(cx, cz)); if (!l) continue;
      for (const b of l) if (b[0] < x1 && b[2] > x0 && b[1] < z1 && b[3] > z0) return true;
    }
    return false;
  };
  C.reserved = SPAWNS.map(([x, z]) => [x, z, 8]);   // spawn / extract points kept clear: [x, z, radius]
  C.nearDoor = (x0, z0, x1, z1, m = 1.8) => C.doorPts.some(([dx, dz]) => dx > x0 - m && dx < x1 + m && dz > z0 - m && dz < z1 + m);

  // ------------------------------------------------------------------ buildings
  // C.bld: building in world coords (optional rot about its centre). Resolves floorY up front (so upper
  // storeys / roofs have known heights), adds upper-storey windows, records door points and stair keep-outs.
  C.ringAvg = (spec) => {
    let pts = [[spec.x, spec.z], [spec.x + spec.w, spec.z], [spec.x + spec.w, spec.z + spec.d], [spec.x, spec.z + spec.d]];
    if (spec.rot) { const Rr = rotFrame(spec.x + spec.w / 2, spec.z + spec.d / 2, spec.rot); pts = pts.map(([a, c]) => rotPt(Rr, a, c)); }
    const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
    let sum = 0, n = 0; C.areaFn(Math.min(...xs) - 0.5, Math.min(...zs) - 0.5, Math.max(...xs) + 0.5, Math.max(...zs) + 0.5, (x, z, cur) => { sum += cur; n++; return null; });
    return n ? sum / n : LOW;
  };
  C.stairGeom = (st, sh, h, under) => {
    const lev = (v) => v === 'top' ? h : (v || 0) * sh;
    let from = st.from ?? 0, to = st.to ?? (from + 1), dir = st.dir || 'n';
    if (lev(from) > lev(to)) { [from, to] = [to, from]; dir = { n: 's', s: 'n', e: 'w', w: 'e' }[dir]; }
    const rise = lev(to) + (to === 'top' ? (under ? 0.02 : 0.25) : 0) - lev(from);
    const n = Math.max(2, Math.ceil(Math.abs(rise) / 0.38)), len = st.len ?? n * 0.55, sw = st.w ?? 1.4, ax = dir === 'e' || dir === 'w';
    const r = [st.x, st.z, st.x + (ax ? len : sw), st.z + (ax ? sw : len)];
    // landings kept clear of furniture: 1.8 m deep, 0.6 m wider than the flight each side
    const D = 1.8, P = 0.6;
    const foot = { e: [r[0] - D, r[1] - P, r[0], r[3] + P], w: [r[2], r[1] - P, r[2] + D, r[3] + P], s: [r[0] - P, r[1] - D, r[2] + P, r[1]], n: [r[0] - P, r[3], r[2] + P, r[3] + D] }[dir];
    const top = { e: [r[2], r[1] - P, r[2] + D, r[3] + P], w: [r[0] - D, r[1] - P, r[0], r[3] + P], s: [r[0] - P, r[3], r[2] + P, r[3] + D], n: [r[0] - P, r[1] - D, r[2] + P, r[1]] }[dir];
    return { from, to, dir, r, foot, top, hole: [r[0] - 0.5, r[1] - 0.5, r[2] + 0.5, r[3] + 0.5] };
  };
  C.bld = (o) => {
    const spec = Object.assign({ wall: 'concrete', floor: 'tiles', roof: 'roofTar', storeys: 1, thick: 0.3 }, o);
    const storeys = spec.storeys || 1, sh = spec.storeyH || 3.2;
    if (spec.floorY == null) spec.floorY = C.ringAvg(spec);
    if (storeys > 1 && !spec.under) {
      if (!(spec.stairs && spec.stairs.length) && spec.floors == null) spec.floors = false;   // no stairs: upper storeys stay visual
      if (spec.upWin !== false) {                                    // upper-storey windows above the ground-floor openings
        const add = [], all = spec.doors || [];
        for (let k = 1; k < storeys; k++) for (const d of all) {
          if ((d.storey || 0) !== 0) continue;
          const ww = Math.min(d.w, 2.4), at = d.at + (d.w - ww) / 2;
          if (all.concat(add).some(e => (e.storey || 0) === k && e.side === d.side && e.at < at + ww + 0.4 && e.at + e.w > at - 0.4)) continue;
          add.push({ side: d.side, at, w: ww, sill: 1.0, storey: k });
        }
        spec.doors = all.concat(add);
      }
    }
    const bb = w.building(spec);
    bb.fy = spec.under ? spec.floorY - spec.under : spec.floorY;     // floor height (known now; finalize agrees)
    bb.sh = sh; bb.keep = [];
    const { w: bw, d } = spec;
    for (const dd of spec.doors || []) {
      if (dd.sill || (dd.storey || 0) > 0) continue;
      const c = dd.at + dd.w / 2;
      const [lx, lz] = dd.side === 'n' ? [c, 0] : dd.side === 's' ? [c, d] : dd.side === 'w' ? [0, c] : [bw, c];
      C.doorPts.push(w.local(bb, lx, lz));
    }
    for (const iw of spec.inner || []) for (const g of iw[4] || []) {
      const horiz = Math.abs(iw[1] - iw[3]) < 1e-6, c = g.at + g.w / 2;
      bb.keep.push([iw[5] || 0, ...(horiz ? [iw[0] + c - 1.4, iw[1] - 1.4, iw[0] + c + 1.4, iw[1] + 1.4] : [iw[0] - 1.4, iw[1] + c - 1.4, iw[0] + 1.4, iw[1] + c + 1.4])]);
      if (!(iw[5] > 0)) C.doorPts.push(w.local(bb, horiz ? iw[0] + c : iw[0], horiz ? iw[1] : iw[1] + c));
    }
    for (const dd of spec.doors || []) if (!dd.sill && (dd.storey || 0) > 0) {
      const c = dd.at + dd.w / 2, [lx, lz] = dd.side === 'n' ? [c, 0] : dd.side === 's' ? [c, d] : dd.side === 'w' ? [0, c] : [bw, c];
      bb.keep.push([dd.storey, lx - 1.4, lz - 1.4, lx + 1.4, lz + 1.4]);
    }
    for (const st of spec.stairs || []) {
      const g = C.stairGeom(st, sh, bb.h, spec.under);
      const kf = g.from === 'top' ? 'top' : g.from, kt = g.to;
      bb.keep.push([kf, g.r[0] - 0.4, g.r[1] - 0.4, g.r[2] + 0.4, g.r[3] + 0.4], [kf, ...g.foot], [kt, ...g.hole], [kt, ...g.top]);
      // landing plate over the stairwell margin at the top end of the flight: the engine cuts the opening a cell
      // wider than the flight on every side, which leaves a 0.5 m drop between the last step and the floor
      const [r0, r1, r2, r3] = g.r, M = 0.5;
      const lr = { e: [r2, r1 - M, r2 + M, r3 + M], w: [r0 - M, r1 - M, r0, r3 + M], s: [r0 - M, r3, r2 + M, r3 + M], n: [r0 - M, r1 - M, r2 + M, r1] }[g.dir];
      const top = g.to === 'top' ? bb.h : g.to * sh, lid = g.to === 'top' && spec.under;
      w.block(spec.x + lr[0], spec.z + lr[1], spec.x + lr[2], spec.z + lr[3], lid ? 0.32 : 0.25, lid ? (spec.roof || 'grass') : g.to === 'top' ? (spec.roof || 'roofTar') : (spec.floor || 'tiles'),
        { cutaway: !lid, seed: 3, tint: lid ? spec.roofTint : undefined, bid: bb.id, onBuilding: bb.id, rel0: lid ? top - 0.3 : g.to === 'top' ? top : top - 0.25, R: bb.R, rep: 4 });
    }
    for (const ld of spec.ladders || []) {
      if (ld.side) { const at = ld.at ?? 1, o2 = { n: [at, -1.2], s: [at, d + 1.2], w: [-1.2, at], e: [bw + 1.2, at] }[ld.side]; C.doorPts.push(w.local(bb, o2[0], o2[1])); }
      else bb.keep.push([ld.from ?? 0, ld.x - 1.2, ld.z - 1.2, ld.x + 1.2, ld.z + 1.2], [ld.to ?? 'top', ld.x - 1.2, ld.z - 1.2, ld.x + 1.2, ld.z + 1.2]);
    }
    return bb;
  };
  C.roofY = (bb) => bb.fy + bb.h + 0.25;                            // walkable roof surface
  C.storeyY = (bb, k) => bb.fy + k * bb.sh;
  // building placed in a frame: o.x, o.z = design corner (dam frame: o.u, o.v)
  C.gbld = (G, o) => { const [cx, cz] = GW(G, o.x + o.w / 2, o.z + o.d / 2); return C.bld({ ...o, x: cx - o.w / 2, z: cz - o.d / 2, rot: G.a }); };
  // building-local helpers (lx, lz from the footprint corner, before rotation); o.storey = upper floors
  const ba = (bb) => (bb.R ? bb.R.a : 0);
  const lvl = (bb, o = {}) => { if (o.yAbs != null) return o; const k = o.storey || 0; const { storey, ...r } = o; return { ...r, bid: bb.id, yRel: k * (bb.sh || 3.2) }; };
  C.Wp = (bb, lx, lz) => w.local(bb, lx, lz);
  C.F = (bb, type, lx0, lz0, lx1, lz1, o = {}) => C.furnish(type, bb.x0 + lx0, bb.z0 + lz0, bb.x0 + lx1, bb.z0 + lz1, { ...o, R: bb.R, bb });
  C.P = (bb, kind, lx, lz, rot = 0, opts = {}) => { const [x, z] = w.local(bb, lx, lz); w.prop(kind, x, z, rot - ba(bb), lvl(bb, opts)); };
  C.Cn = (bb, kind, lx, lz, rot = 0, opts = {}) => { const [x, z] = w.local(bb, lx, lz); w.container(kind, x, z, rot - ba(bb), lvl(bb, opts)); };
  C.IL = (bb, lx, lz, color, i, range, y = 2.7, storey = 0) => { const [x, z] = w.local(bb, lx, lz); w.lamp(x, z, { yAbs: bb.fy + storey * (bb.sh || 3.2) + y, model: null, color, intensity: Math.max(i, 1.2), range }); };
  C.K = (bb, id, lx0, lz0, lx1, lz1, name, storey = 0) => {
    const poly = [[lx0, lz0], [lx1, lz0], [lx1, lz1], [lx0, lz1]].map(([a, b]) => w.local(bb, a, b));
    const xs = poly.map(p => p[0]), zs = poly.map(p => p[1]);
    w.keyRoom(id, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), null, { name, poly, storey, y0: C.storeyY(bb, storey), y1: C.storeyY(bb, storey) + (bb.sh || 3.2) });
  };
  // frame helpers for things outside buildings
  C.gprop = (G, kind, X, Z, rot = 0, opts = {}) => { const [x, z] = GW(G, X, Z); w.prop(kind, x, z, rot - G.a, opts); };
  C.gcont = (G, kind, X, Z, rot = 0, opts = {}) => { const [x, z] = GW(G, X, Z); w.container(kind, x, z, rot - G.a, opts); };
  C.gblock = (G, X0, Z0, X1, Z1, h, tex, opts = {}) => w.block(X0 + G.offX, Z0 + G.offZ, X1 + G.offX, Z1 + G.offZ, h, tex, { ...opts, R: G.R });
  C.gwall = (G, ax, az, bx, bz, thick, h, tex, gaps = [], opts = {}) => w.wallLine(ax + G.offX, az + G.offZ, bx + G.offX, bz + G.offZ, thick, h, tex, gaps, { ...opts, R: G.R });
  C.glamp = (G, X, Z, o = {}) => { const [x, z] = GW(G, X, Z); w.lamp(x, z, { ...o, rot: (o.rot || 0) - G.a }); };
  // a walled compound in a frame: rect + gates [[side, at]] (3 m wide)
  C.compound = (G, X0, Z0, X1, Z1, h, tex, gates = [], opts = {}) => {
    const sides = { n: [X0, Z0, X1, Z0], s: [X0, Z1, X1, Z1], w: [X0, Z0, X0, Z1], e: [X1, Z0, X1, Z1] };
    for (const [sd, [ax, az, bx, bz]] of Object.entries(sides)) {
      const g = gates.filter(q => q[0] === sd).map(q => ({ at: q[1] - 1.5, w: 3 }));
      C.gwall(G, ax, az, bx, bz, 0.5, h, tex, g, sd === 'n' || sd === 's' ? { ...opts, endPad: [0.25, 0.25] } : opts);   // n / s run over the corners
      for (const q of gates.filter(q => q[0] === sd)) C.doorPts.push(GW(G, sd === 'n' || sd === 's' ? ax + q[1] : ax, sd === 'n' || sd === 's' ? az : az + q[1]));
    }
  };
  const FURN = {
    office: { props: ['dg_desk', 'dg_cabinet', 'dg_desk', 'shelf'], cont: [['desk', 1], ['cabinet', 0.8], ['electronics', 0.35], ['trash', 0.4]] },
    lab: { props: ['dg_desk', 'dg_server', 'dg_console', 'shelf'], cont: [['electronics', 1], ['medical_bag', 0.45], ['desk', 0.5], ['cabinet', 0.5]] },
    server: { props: ['dg_server', 'dg_server', 'dg_server', 'dg_console', 'dg_server'], cont: [['electronics', 1], ['electronics', 0.6]] },
    control: { props: ['dg_console', 'dg_console', 'dg_desk', 'dg_server'], cont: [['electronics', 1], ['desk', 0.6], ['security_locker', 0.3]] },
    storage: { props: ['shelf', 'shelf', 'crate', 'barrel'], cont: [['crate', 1], ['crate', 0.5], ['toolbox', 0.5]] },
    workshop: { props: ['workbench', 'shelf', 'barrel', 'dg_locker'], cont: [['toolbox', 1], ['crate', 0.5], ['locker', 0.45]] },
    medical: { props: ['dg_medbed', 'dg_medbed', 'dg_cabinet', 'shelf'], cont: [['medical_bag', 1], ['medical_bag', 0.6], ['cabinet', 0.5]] },
    bunk: { props: ['dg_bed', 'dg_bed', 'dg_locker'], cont: [['locker', 1], ['backpack', 0.45], ['suitcase', 0.35]] },
    living: { props: ['dg_sofa', 'dg_table', 'shelf'], cont: [['cabinet', 0.8], ['suitcase', 0.45], ['trash', 0.35], ['backpack', 0.3]] },
    bedroom: { props: ['dg_bed', 'dg_cabinet'], cont: [['suitcase', 0.8], ['cabinet', 0.6], ['backpack', 0.3]] },
    kitchen: { props: ['dg_table', 'shelf'], cont: [['fridge', 1], ['cabinet', 0.6], ['trash', 0.5]] },
    security: { props: ['dg_locker', 'dg_desk', 'dg_console'], cont: [['security_locker', 1], ['weapon_case', 0.55], ['ammo_box', 0.8]] },
    industrial: { props: ['workbench', 'barrel', 'barrelBlue', 'crate', 'dg_locker'], cont: [['toolbox', 1], ['crate', 0.7], ['locker', 0.4], ['ammo_box', 0.25]] },
    commercial: { props: ['shelf', 'dg_vending', 'shelf', 'dg_table'], cont: [['cabinet', 0.8], ['crate', 0.5], ['trash', 0.6], ['suitcase', 0.3]] },
    greenhouse: { props: ['dg_hydrorack', 'dg_hydrorack', 'dg_planter'], cont: [['plant', 1], ['plant', 0.7], ['basket', 0.5]] },
    vault: { props: ['dg_server', 'shelf', 'dg_server'], cont: [['weapon_case', 1], ['safe', 1], ['security_locker', 1], ['electronics', 0.9], ['arc_crate', 0.7], ['ammo_box', 1]] },
    raider: { props: ['dg_bed', 'crate', 'barrel', 'workbench'], cont: [['raider_cache', 0.6], ['crate', 0.7], ['ammo_box', 0.5], ['backpack', 0.45]] },
    empty: { props: ['crate', 'barrel'], cont: [['trash', 0.6], ['crate', 0.3]] },
  };
  const LIGHT_COL = { office: 0xfff0d0, lab: 0xd8f0ff, server: 0x9ad8ff, control: 0xb8e0ff, storage: 0xffd8a0, workshop: 0xffd8a0, medical: 0xe0fff0, bunk: 0xffc890, living: 0xffc890, bedroom: 0xffb880, kitchen: 0xfff0c0, security: 0xffe0c0, industrial: 0xffd090, commercial: 0xfff0d0, greenhouse: 0xe0a0ff, vault: 0xffe0a0, raider: 0xff9a50, empty: 0xffc890 };
  // furnish a room: props along the walls, containers, a ceiling light. Coords are the building's
  // pre-rotation frame when o.R is given (use C.F for building-local offsets).
  C.furnish = (type, x0, z0, x1, z1, o = {}) => {
    const F = FURN[type] || FURN.empty, tier = o.tier || 1, room = o.room || null, bb = o.bb || null, k0 = o.storey || 0;
    const T = (x, z) => (o.R ? rotPt(o.R, x, z) : [x, z]), ra = o.R ? o.R.a : 0;
    const lv = bb ? { bid: bb.id, yRel: k0 * (bb.sh || 3.2) } : {};
    const kept = (sx, sz) => bb && bb.keep.some(([k, a, b, c, d]) => k === k0 && sx - bb.x0 > a - 0.7 && sx - bb.x0 < c + 0.7 && sz - bb.z0 > b - 0.7 && sz - bb.z0 < d + 0.7);   // slot ± prop half-size
    const slots = [];
    for (let x = x0 + 1.3; x <= x1 - 1.3; x += 2.3) slots.push([x, z0 + 0.7, 0]);
    if (z1 - z0 > 5) for (let x = x0 + 1.3; x <= x1 - 1.3; x += 2.3) slots.push([x, z1 - 0.7, PI]);
    for (let z = z0 + 1.7; z <= z1 - 1.7; z += 2.3) { slots.push([x0 + 0.6, z, PI / 2]); slots.push([x1 - 0.6, z, -PI / 2]); }
    const ok = slots.filter(([sx, sz]) => !kept(sx, sz)).map(([sx, sz, r]) => [...T(sx, sz), r - ra]).filter(([sx, sz]) => k0 > 0 || !C.doorPts.some(([dx, dz]) => Math.abs(dx - sx) < 2.0 && Math.abs(dz - sz) < 2.0));
    for (let i = ok.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ok[i], ok[j]] = [ok[j], ok[i]]; }
    const area = (x1 - x0) * (z1 - z0);
    const nProps = Math.min(Math.floor(ok.length * 0.55), F.props.length + (area > 90 ? 2 : 0));
    let k = 0;
    for (let i = 0; i < nProps; i++) { const [sx, sz, r] = ok[k++]; w.prop(F.props[i % F.props.length], sx, sz, r, { solid: true, ...lv }); }
    let nc = 0;
    for (const [kind, p] of F.cont) {
      if (k >= ok.length) break;
      if (rng() < p * (o.mul || 1)) { const [sx, sz, r] = ok[k++]; w.container(kind, sx, sz, r, { tier, room, ...lv }); nc++; }
    }
    for (const [kind, n] of o.extra || []) for (let i = 0; i < n && k < ok.length; i++) { const [sx, sz, r] = ok[k++]; w.container(kind, sx, sz, r, { tier, room, ...lv }); }
    if (o.light !== false) { const [lx, lz] = T((x0 + x1) / 2, (z0 + z1) / 2); w.lamp(lx, lz, { y: o.ly || 2.7, ...(bb ? { yAbs: bb.fy + k0 * (bb.sh || 3.2) + (o.ly || 2.6) } : {}), model: null, color: LIGHT_COL[type] || 0xffd8a0, intensity: o.li || 1.25, range: Math.max(6, Math.hypot(x1 - x0, z1 - z0) * 0.75), flicker: o.flicker ?? (rng() < 0.18 ? 0.35 : 0) }); }
    return nc;
  };
  // scatter props around a centre (avoid buildings)
  const SOLID = new Set(['crate', 'barrel', 'barrelBlue', 'car', 'sandbag', 'rock', 'husk', 'pipe', 'dg_container', 'dg_containerB', 'dg_containerG', 'dg_truck', 'dg_barrier', 'dg_rubble', 'dg_hedgehog', 'dg_tankS', 'dg_toxic', 'dg_log', 'dg_stump', 'dg_huskbig', 'dg_slab', 'dg_transformer', 'dg_bigpipe', 'lootCrate', 'arcCrate', 'dg_scaffold', 'dg_tent', 'deadTree', 'tree', 'pine', 'dg_willow', 'dg_cypress', 'dg_ventbox']);
  const BOXY = new Set(['dg_container', 'dg_containerB', 'dg_containerG', 'dg_truck', 'dg_scaffold', 'dg_transformer', 'dg_ventbox', 'dg_tent', 'car', 'dg_bigpipe', 'pipe', 'sandbag', 'dg_barrier']);
  C.clutter = (cx, cz, r, n, kinds, o = {}) => {
    let placed = 0, tries = 0;
    const ga = o.frame ? o.frame.a : 0;      // boxy clutter snaps to this frame's axes
    while (placed < n && tries++ < n * 12) {
      const a = rng() * 2 * PI, d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * (o.sz || 1);
      if (x < 2 || z < 2 || x > W - 2 || z > H - 2) continue;
      if (C.inBuilding(x, z, o.pad ?? 1.2)) continue;
      if (o.avoid && o.avoid(x, z)) continue;
      const k = kinds[Math.floor(rng() * kinds.length)], sc = (o.scale || 1) * (1 + (rng() - 0.5) * (o.scaleVar ?? 0.2));
      const rot = o.rot ?? (BOXY.has(k) ? Math.floor(rng() * 4) * PI / 2 + (rng() - 0.5) * 0.12 - ga : rng() * 2 * PI);
      const solid = SOLID.has(k);
      if (solid) {
        const sol = propInfo(k).solid || [0.5, 0.5]; let hw = sol[0] * sc, hd = sol[1] * sc; if (Math.abs(Math.sin(rot)) > 0.7) [hw, hd] = [hd, hw];
        if (C.propHit(x - hw - 0.3, z - hd - 0.3, x + hw + 0.3, z + hd + 0.3)) continue;
        if (C.inBuilding(x, z, Math.max(hw, hd) + 1)) continue;
        if (o.noDoor !== false && C.nearDoor(x - hw, z - hd, x + hw, z + hd, 2.2)) continue;
        if (C.reserved.some(([a, b, r]) => Math.hypot(a - x, b - z) < r + Math.max(hw, hd))) continue;
      } else if (o.noDoor !== false && C.nearDoor(x, z, x, z, 1.2)) continue;
      w.prop(k, x, z, rot, { solid: solid ? true : undefined, scale: sc });
      placed++;
    }
    return placed;
  };
  C.solidKind = (k) => SOLID.has(k);
  // standing water deeper than ~0.8 m over the terrain (ponds, flooded craters, swamp channels)
  C.deepAt = (x, z) => { const g0 = w.groundAt(x, z); return w.waters.some(q => x >= q.x0 && x <= q.x1 && z >= q.z0 && z <= q.z1 && q.level - g0 > 0.8 && (!q.poly || pointInPoly(x, z, q.poly))); };
  // loose containers outside
  C.loot = (cx, cz, r, list, tier = 1, o = {}) => {
    for (const kind of list) {
      for (let t = 0; t < 30; t++) {
        const a = rng() * 2 * PI, d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (C.inBuilding(x, z, 0.8) && !o.inside) continue;
        if (o.avoid && o.avoid(x, z)) continue;
        if (C.propHit(x - 0.7, z - 0.7, x + 0.7, z + 0.7) || C.nearDoor(x, z, x, z, 1.5)) continue;
        if ([[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]].filter(([a, c]) => C.propHit(x + a - 0.3, z + c - 0.3, x + a + 0.3, z + c + 0.3)).length >= 3) continue;   // not boxed in
        if (C.deepAt(x, z)) continue;                                                // not under water
        w.container(kind, x, z, rng() * 2 * PI, { tier, room: o.room || null });
        break;
      }
    }
  };
  // lights
  C.street = (pts, spacing = 34, off = 5, o = {}) => {
    let acc = spacing * 0.5, side = 1;
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
      for (let t = acc; t < L; t += spacing) {
        const x = ax + ux * t - uz * off * side, z = az + uz * t + ux * off * side;
        if (x > 2 && z > 2 && x < W - 2 && z < H - 2 && !C.inBuilding(x, z, 0.6) && !(o.skip && o.skip(x, z)) && !(o.notDam && C.inDam(x, z, 2)) && !C.propHit(x - 0.5, z - 0.5, x + 0.5, z + 0.5)) w.lamp(x, z, { y: o.y || 4.0, color: o.color || 0xffc078, intensity: o.i || 1.6, range: o.range || 13, flicker: rng() < 0.12 ? 0.5 : 0, model: o.model || 'lamp', rot: o.rot || 0 });
        side = -side;
      }
      acc = (acc - L) % spacing; if (acc < 0) acc += spacing;
    }
  };
  C.flood = (x, z, o = {}) => { const oo = { y: 6.6, model: 'dg_floodlight', color: o.color || 0xe0ecff, intensity: o.i || 1.9, range: o.range || 14, rot: o.rot || 0, flicker: o.flicker || 0 }; return o.base != null ? C.lampAt(x, z, o.base, oo) : w.lamp(x, z, oo); };
  C.beacon = (x, z, o = {}) => { const oo = { y: o.y || 3.9, model: o.model === undefined ? 'dg_beacon' : o.model, color: 0xff3020, intensity: o.i || 1.2, range: o.range || 6, flicker: 0.6 }; return o.base != null ? C.lampAt(x, z, o.base, oo) : w.lamp(x, z, oo); };
  // red aviation light on a tall mast/tower top (the engine drops the light to ~2.8 m and widens it)
  C.mastLight = (x, z, y, o = {}) => w.lamp(x, z, { y, model: null, color: o.color || 0xff3020, intensity: o.i || 0.55, range: o.range || 1, flicker: o.flicker ?? 0.6 });
  C.fire = (x, z, o = {}) => { w.lamp(x, z, { y: 0.8, model: null, color: 0xff8a30, intensity: o.i || 2.2, range: o.range || 10, flicker: 0.8 }); w.prop('debris', x, z, 0, { scale: 0.5 }); };
  C.inLight = (x, z, color = 0xffd8a0, i = 1.2, range = 8, y = 2.9) => w.lamp(x, z, { y, model: null, color, intensity: Math.max(i, 1.2), range });
  // ring of low blocks (dome footings, clarifier walls): gaps = angles (rad) kept open
  C.ring = (cx, cz, r, h, tex, gaps = [], seg = 1.4, opts = {}) => {
    const n = Math.round(2 * PI * r / seg);
    const s = seg * 0.55, gapA = (1.4 + s) / r;
    for (let i = 0; i < n; i++) {
      const a = i / n * 2 * PI;
      if (gaps.some(g => Math.abs(((a - g + 3 * PI) % (2 * PI)) - PI) < gapA)) continue;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      w.block(x - s, z - s, x + s, z + s, h, tex, opts);
    }
  };
  // fence of chain-link panels along a polyline (3 m panels)
  C.fenceLine = (pts, gapAt = []) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 3)), rot = Math.atan2(bx - ax, bz - az) + PI / 2;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t;
        if (gapAt.some(([gx, gz]) => Math.hypot(gx - x, gz - z) < 2.2)) continue;
        w.prop('dg_fence', x, z, rot, { solid: true, scale: L / n / 3 });
      }
    }
  };
  C.fenceRect = (x0, z0, x1, z1, gaps = []) => { C.addClearRect(x0 - 1, z0 - 1, x1 + 1, z1 + 1); C.fenceLine([[x0, z0], [x1, z0], [x1, z1], [x0, z1], [x0, z0]], gaps); };
  // fenced yard in a frame (gaps in design coords)
  C.gfence = (G, X0, Z0, X1, Z1, gaps = []) => {
    const q = GR(G, X0 - 1, Z0 - 1, X1 + 1, Z1 + 1), xs = q.map(p => p[0]), zs = q.map(p => p[1]);
    C.addClearRect(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs));
    C.fenceLine([[X0, Z0], [X1, Z0], [X1, Z1], [X0, Z1], [X0, Z0]].map(([a, b]) => GW(G, a, b)), gaps.map(([a, b]) => GW(G, a, b)));
  };
  C.sandbags = (pts) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2)), rot = Math.atan2(bx - ax, bz - az) + PI / 2;
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; w.prop('sandbag', ax + (bx - ax) * t, az + (bz - az) * t, rot, { solid: true }); }
    }
  };
  // Supply Shack (generic `field_depot` POI): small resupply hut with a roof antenna; rot turns it about its centre
  C.fieldDepot = (x, z, rot = 0) => {
    const bb = C.bld({ x: x - 3, z: z - 2.5, w: 6, d: 5, rot, wall: 'metalPanel', floor: 'metalPanel', roof: 'metalPanel', roofTint: 0x7a9ac0, name: 'Supply Shack', doors: [{ side: 's', at: 2, w: 2 }], vents: 1 });
    C.Cn(bb, 'field_depot', 3, 1.1, 0, { tier: 2 });
    C.Cn(bb, 'ammo_box', 4.8, 1.3, 0, { tier: 1 });
    C.P(bb, 'dg_antennamast', 7.2, 1, 0, { solid: true, scale: 0.75 });
    C.IL(bb, 3, 5.7, 0x60e0ff, 1.55, 9, 3.2);
    w.poi('field_depot', 'Supply Shack', x, z, 10, { tier: 1, aliases: [] });
    return bb;
  };
  // extraction points: the structure (bunker / hatch, its lights and beacons) is modelled + collided by the engine
  // (engine/extracts.js); the map gives it a facing (0 = +z = toward the camera; keep the doorway within ~60° of
  // it so the car stays readable), keeps it clear and dresses the spot. Elevator rig (local frame, +z = front):
  // battered bunker +-3.75 m, call gantry x 2.6..3.6 / z 4..5, apron to z 5.25, approach kept clear in front.
  // P2 maps rig-local -> world exactly like the rig (rotation.y = face); props that should line up with the rig
  // take rot = face, the signs take rot 0 so they face the camera at any facing.
  C.lift = (id, name, x, z, face, o = {}) => {
    const base = o.yAbs ?? null, Rf = rotFrame(x, z, -face), P2 = (lx, lz) => rotPt(Rf, x + lx, z + lz);
    if (o.paint !== false) { const q = [[-6.6, -5.2], [6.6, -5.2], [6.6, 5.6], [-6.6, 5.6]].map(([a, b]) => P2(a, b)); w.paintPoly('concrete', q); w.paintPoly('hazard', [P2(-3, 5.6), P2(3, 5.6), P2(3, 6.3), P2(-3, 6.3)]); }
    // yard floodlight on the corner farthest from the camera (never in front of the bunker), clear of the walls
    const [fx, fz] = [[-4.6, -4.5], [4.6, -4.5], [-4.6, 4.5]].map(([a, b]) => P2(a, b)).reduce((m, c) => (c[1] < m[1] - 0.01 ? c : m));
    const fl = { y: 6.6, model: 'dg_floodlight', color: 0xe0ffe8, intensity: 1.5, range: 14, rot: face };
    if (base != null) C.lampAt(fx, fz, base, fl); else w.lamp(fx, fz, fl);
    // lit board beside the bunker on the side nearer the camera, turned to face it; 1.55 m off the wall base
    const sd = [P2(-5.3, 0.8), P2(5.3, 0.8)], [sx, sz] = sd[1][1] > sd[0][1] + 0.01 ? sd[1] : sd[0];
    w.prop('dg_extsign', sx, sz, 0, base != null ? { solid: true, yAbs: base } : { solid: true });
    w.extract(id, name, x, z, { kind: 'elevator', face, ...(base != null ? { yAbs: base } : {}), ...o });
    C.addClear(x, z, 7); C.reserved.push([x, z, 6.5]);
    C.reserved.push([...P2(0, 6.5), 3.5]);                                        // the approach in front
  };
  C.hatch = (id, name, x, z, face, o = {}) => {
    const Rf = rotFrame(x, z, -face), P2 = (lx, lz) => rotPt(Rf, x + lx, z + lz);
    w.paintCircle('concrete', x, z, 2.4, 0.15, 5);
    const [sx, sz] = P2(2.4, 1.4); w.prop('dg_hatchsign', sx, sz, 0, { solid: true });   // post sign beside the key reader, facing the camera
    w.extract(id, name, x, z, { kind: 'hatch', needsKey: 'raider_hatch_key', face, ...o });
    C.addClear(x, z, 3.5); C.reserved.push([x, z, 2.5]);
  };
  // power line with pylons every ~40 m and cables between them
  C.powerLine = (pts, o = {}) => {
    const poles = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 40));
      for (let i = 0; i < n; i++) poles.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n]);
    }
    poles.push(pts[pts.length - 1]);
    const s = o.scale || 1;
    poles.forEach(([x, z], i) => {
      const nx = poles[Math.min(i + 1, poles.length - 1)], pv = poles[Math.max(i - 1, 0)];
      const dir = Math.atan2(nx[0] - pv[0], nx[1] - pv[1]);
      w.prop('dg_pylon', x, z, dir + PI / 2, { solid: true, scale: s });
      C.addClear(x, z, 3);
    });
    for (let i = 0; i < poles.length - 1; i++) {
      const [ax, az] = poles[i], [bx, bz] = poles[i + 1], L = Math.hypot(bx - ax, bz - az);
      const ya = w.groundAt(ax, az) + 14.5 * s, yb = w.groundAt(bx, bz) + 14.5 * s;
      w.prop('dg_cable40', ax, az, Math.atan2(bx - ax, bz - az), { yAbs: (ya + yb) / 2, scale: L / 40 });
    }
    return poles;
  };
  // concrete retaining walls along an edge polyline wherever the ground on `side` (+1 = left of the direction of
  // travel, i.e. (-dz, dx)) lies more than `drop` below the near side: dam faces, the ledge road, the spillway
  // chute, ramps down the escarpment. Pieces <= `piece` m with a parapet `par` above the high side.
  C.dropWalls = (pts, side, o = {}) => {
    const DROP = o.drop ?? 2.0, PIECE = o.piece ?? 5, TIN = o.tin ?? 0.4, TOUT = o.tout ?? 1.0, tex = o.tex || 'damConcrete', si = o.si ?? 1.6, so = o.so ?? 1.8, ext = o.ext ?? 0.3;
    let made = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az); if (L < 0.1) continue;
      const ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz * side, nz = ux * side, ang = Math.atan2(uz, ux);
      const steps = Math.max(1, Math.round(L)), stp = L / steps;
      let run = null;
      const emit = (r) => {
        const mid = (r.a + r.b) / 2, len = r.b - r.a + 2 * ext, hw = (TIN + TOUT) / 2;
        const cx = ax + ux * mid + nx * (TOUT - TIN) / 2, cz = az + uz * mid + nz * (TOUT - TIN) / 2;
        const y0 = (o.y0 ?? r.low) - 0.4, top = (o.top ?? r.top) + (o.par ?? 1.0);
        w.block(cx - len / 2, cz - hw, cx + len / 2, cz + hw, top - y0, tex, { y0, R: rotFrame(cx, cz, ang), tint: o.tint });
        made++;
      };
      for (let i = 0; i < steps; i++) {
        const t = (i + 0.5) * stp, px = ax + ux * t, pz = az + uz * t;
        const top = w.groundAt(px - nx * si, pz - nz * si), low = w.groundAt(px + nx * so, pz + nz * so);
        const ok = top - low > DROP && !(o.gap && o.gap(px, pz));
        if (ok && run && t - run.a < PIECE && Math.abs(top - run.top) < 0.5) { run.b = t + stp / 2; run.low = Math.min(run.low, low); }
        else { if (run) emit(run); run = ok ? { a: t - stp / 2, b: t + stp / 2, top, low } : null; }
      }
      if (run) emit(run);
    }
    return made;
  };
  // ramp along a polyline: terrain set to a height interpolated by arc length from h0 to h1
  C.rampLine = (pts, width, h0, h1, blend = 0) => {
    const lens = [0]; for (let k = 1; k < pts.length; k++) lens.push(lens[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
    const tot = lens[lens.length - 1];
    w._along(pts, width, blend, (i, f, t, k) => { const h = lerp(h0, h1, (lens[k] + t * (lens[k + 1] - lens[k])) / tot); w.hv[i] += (h - w.hv[i]) * f; });
  };
  // average terrain height over a rect (before buildings flatten it)
  C.avg = (x0, z0, x1, z1) => { let s = 0, n = 0; C.areaFn(x0, z0, x1, z1, (x, z, cur) => { s += cur; n++; return null; }); return n ? s / n : LOW; };
  // a plain level bridge between two road ends: deck height = the higher end (+ a short ramp up from the lower end)
  C.roadBridge = (ax, az, bx, bz, width = 7, o = {}) => {
    const ha = w.groundAt(ax, az), hb = w.groundAt(bx, bz), y = Math.max(ha, hb) + 0.12;
    w.bridge([[ax, az], [bx, bz]], width, y, o.tex || 'asphalt', { thick: 0.7, pillars: o.pillars ?? 9, rails: true });
    const L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    for (const [px, pz, h, sg] of [[ax, az, ha, -1], [bx, bz, hb, 1]]) if (y - h > 0.3) C.rampLine([[px + ux * sg * 0.5, pz + uz * sg * 0.5], [px + ux * sg * 8, pz + uz * sg * 8]], width + 1, y - 0.05, h, 1.5);
    C.addClear((ax + bx) / 2, (az + bz) / 2, L / 2 + 3);
    return y;
  };
  return C;
}

// ------------------------------------------------------------------------------------ frames
// A frame turns design coords (X, Z) by angle a about the pivot (px, pz) - for the few turned compounds.
function frame(px, pz, a, offX = 0, offZ = 0) { return { px, pz, a, c: Math.cos(a), s: Math.sin(a), offX, offZ, R: rotFrame(px, pz, a) }; }
function GW(G, X, Z) { const rx = X + G.offX - G.px, rz = Z + G.offZ - G.pz; return [G.px + rx * G.c - rz * G.s, G.pz + rx * G.s + rz * G.c]; }
function GL(G, x, z) { const dx = x - G.px, dz = z - G.pz; return [G.px - G.offX + dx * G.c + dz * G.s, G.pz - G.offZ - dx * G.s + dz * G.c]; }
function GR(G, X0, Z0, X1, Z1) { return [GW(G, X0, Z0), GW(G, X1, Z0), GW(G, X1, Z1), GW(G, X0, Z1)]; }
const G_VILLA = frame(205, 122, -0.22);       // Golden Handshake Villa, turned to face the water
const G_SHOW = frame(196, 384, 0.12);         // Show Home cul-de-sac
const G_ANT = frame(948, 690, -0.35);         // The Ant Farm

// ==================================================================================== TERRAIN
function terrain(C) {
  const { w } = C;
  const VW = w.tw + 1, VH = w.th + 1, N = VW * VH, scanFill = C.scanFill;
  const polyMask = (pts) => { const m = new Uint8Array(N); scanFill(pts, (i) => { m[i] = 1; }); return m; };
  // smooth masks on a 4 m grid (2-pass box blur, radius r metres) for soft transitions
  const G = 4, GW_ = Math.ceil(VW / G) + 1, GH_ = Math.ceil(VH / G) + 1;
  const smoothMask = (pts, r) => {
    const a = new Float32Array(GW_ * GH_), t = new Float32Array(GW_ * GH_), k = Math.max(1, Math.round(r / G)), n = 2 * k + 1;
    scanFill(pts, (i) => { a[i] = 1; }, G, GW_, GH_);
    for (let pass = 0; pass < 2; pass++) {
      for (let z = 0; z < GH_; z++) { const o = z * GW_; let acc = 0; for (let x = -k; x <= k; x++) acc += a[o + clamp(x, 0, GW_ - 1)]; for (let x = 0; x < GW_; x++) { t[o + x] = acc / n; acc += a[o + Math.min(GW_ - 1, x + k + 1)] - a[o + Math.max(0, x - k)]; } }
      for (let x = 0; x < GW_; x++) { let acc = 0; for (let z = -k; z <= k; z++) acc += t[clamp(z, 0, GH_ - 1) * GW_ + x]; for (let z = 0; z < GH_; z++) { a[z * GW_ + x] = acc / n; acc += t[Math.min(GH_ - 1, z + k + 1) * GW_ + x] - t[Math.max(0, z - k) * GW_ + x]; } }
    }
    return a;
  };
  const samp = (m, x, z) => { const fx = x / G, fz = z / G, ix = Math.min(GW_ - 2, fx | 0), iz = Math.min(GH_ - 2, fz | 0), tx = fx - ix, tz = fz - iz, i = iz * GW_ + ix;
    return (m[i] * (1 - tx) + m[i + 1] * tx) * (1 - tz) + (m[i + GW_] * (1 - tx) + m[i + GW_ + 1] * tx) * tz; };
  // signed distance (m) to a binary mask's edge: > 0 inside, < 0 outside, capped (two-pass chamfer)
  const CAP = 14;
  const sdist = (m) => {
    const dIn = new Float32Array(N), dOut = new Float32Array(N);
    for (let i = 0; i < N; i++) { dIn[i] = m[i] ? CAP : 0; dOut[i] = m[i] ? 0 : CAP; }
    const pass = (d) => {
      for (let z = 0; z < VH; z++) for (let x = 0; x < VW; x++) {
        const i = z * VW + x; let v = d[i]; if (!v) continue;
        if (x > 0) v = Math.min(v, d[i - 1] + 1);
        if (z > 0) { v = Math.min(v, d[i - VW] + 1); if (x > 0) v = Math.min(v, d[i - VW - 1] + 1.414); if (x < VW - 1) v = Math.min(v, d[i - VW + 1] + 1.414); }
        d[i] = v;
      }
      for (let z = VH - 1; z >= 0; z--) for (let x = VW - 1; x >= 0; x--) {
        const i = z * VW + x; let v = d[i]; if (!v) continue;
        if (x < VW - 1) v = Math.min(v, d[i + 1] + 1);
        if (z < VH - 1) { v = Math.min(v, d[i + VW] + 1); if (x < VW - 1) v = Math.min(v, d[i + VW + 1] + 1.414); if (x > 0) v = Math.min(v, d[i + VW - 1] + 1.414); }
        d[i] = v;
      }
    };
    pass(dIn); pass(dOut);
    for (let i = 0; i < N; i++) dIn[i] -= dOut[i];
    return dIn;
  };
  const gorgeBin = polyMask(GORGE), resBin = polyMask(RESERVOIR), marshBin = polyMask(MARSH_POLY);
  const gS = sdist(gorgeBin), eS = sdist(polyMask(E_PLAT)), rS = sdist(resBin);
  const wSoft = smoothMask(W_PLAT, 26), nwS = smoothMask(NW_HILLS, 34), neS = smoothMask(NE_HILLS, 34), antS = smoothMask(ANT_HILLS, 44), marshS = smoothMask(MARSH_POLY, 22);
  const at = (m, x, z) => m[clamp(Math.round(z), 0, VH - 1) * VW + clamp(Math.round(x), 0, VW - 1)] > 0;
  C.gorgeAt = (x, z) => at(gorgeBin, x, z);
  C.resAt = (x, z) => at(resBin, x, z);
  C.marshAt = (x, z) => at(marshBin, x, z);
  C.antAt = (x, z) => samp(antS, x, z) > 0.45;
  C.plateauAt = (x, z) => w.groundAt(x, z) > PLAT - 2.5 && !C.resAt(x, z);
  const n1 = makeNoise(31), n2 = makeNoise(57), n3 = makeNoise(83);
  C.noise = n1; C.noise2 = n2;
  const fbm = (n, x, z) => (n(x, z) * 0.6 + n(x * 2.3, z * 2.3) * 0.28 + n(x * 5.1, z * 5.1) * 0.12 - 0.5) * 2;   // about -1..1
  for (let z = 0; z < VH; z++) for (let x = 0; x < VW; x++) {
    const i = z * VW + x;
    // lowlands: broad swells, a rim along the south and west edges
    let h = LOW + 0.9 + fbm(n1, x / 140, z / 140) * 1.4 + fbm(n2, x / 38, z / 38) * 0.45;
    h += sm(770, 825, z) * 2.4 + sm(36, 0, x) * 2.6;
    // Overdraft Marsh: low and lumpy, pools wherever it dips under MARSH
    h = lerp(h, MARSH - 0.12 + fbm(n2, x / 21, z / 21) * 0.8, samp(marshS, x, z));
    // Ant Hills: rolling hills in the south-east
    const an = samp(antS, x, z); h += an * (5.2 + fbm(n1, x / 70 + 9, z / 70) * 3.6 + sm(700, 830, z) * 3);
    // plateaus: the west one slopes gently down to the lowlands, the east one ends in an escarpment
    const pl = PLAT + fbm(n3, x / 90, z / 90) * 0.45;
    h = lerp(h, pl, samp(wSoft, x, z));
    const jit = (n2(x / 9, z / 9) - 0.5) * 3.2 + (n1(x / 3.5, z / 3.5) - 0.5) * 1.2;   // ragged cliff lines
    h = lerp(h, pl, sm(-2.2, 2.2, eS[i] + jit));
    // hills behind the plateaus (NW, NE)
    const nw = samp(nwS, x, z), ne = samp(neS, x, z);
    if (nw > 0) h = lerp(h, PLAT + 2 + nw * 11 + fbm(n1, x / 40, z / 40) * 3, nw);
    if (ne > 0) h = lerp(h, PLAT + 2 + ne * 12 + fbm(n2, x / 40 + 5, z / 40) * 3, ne);
    // reservoir: a short bank down to the bed
    if (rS[i] > -1.5) h = lerp(h, RES_BED + fbm(n1, x / 50, z / 50) * 1.5, sm(-1, 9, rS[i] + jit * 0.4));
    // gorge: sheer walls down to a floor that falls gently toward the mouth
    const gf = lerp(LOW + 0.7, LOW - 0.1, sm(200, 480, z)) + fbm(n2, x / 30, z / 30) * 0.35;
    h = lerp(h, gf, sm(-2.4, 2.4, gS[i] + jit));
    // the arch: crest at PLAT, a clean toe below the downstream face, a sheer upstream face into the water
    const [r, t] = archRT(x, z);
    if (Math.abs(t) < ARCH.half + 0.07) {
      if (r >= ARCH.rIn && r <= ARCH.rOut) h = PLAT;
      else if (r < ARCH.rIn && r > ARCH.rIn - 9 && Math.abs(t) < ARCH.half) h = gf;
      else if (r > ARCH.rOut && r < ARCH.rOut + 12 && Math.abs(t) < ARCH.half - 0.01 && resBin[i]) h = Math.min(h, RES_BED + 1);
    }
    w.hv[i] = h;
  }
  C.fbm = fbm;

  // ---------------- shaped ground
  // the Spillway of Regret: a dry concrete chute from the floodgates down to the plunge pool
  C.slope(CHUTE.x0, CHUTE.z0, CHUTE.x1, CHUTE.z1, CHUTE.h0, LOW + 0.3, 'z', 0);
  C.rampLine(LEDGE, LEDGE_W, PLAT, LOW + 0.5);                                         // ledge road down the west wall
  C.slope(898, 427, 908, 486, PLAT, LOW + 0.9, 'z', 0);                                 // Bottom Line Steps (down the escarpment)
  C.slope(1042, 432, 1062, 524, PLAT, LOW + 1.1, 'z', 0);                               // east ramp road
  // plunge pool + tailrace basin
  w.raiseCircle(726, 318, 9, LOW - 0.6, 0.5, 'set');
  w.raiseRect(574, 196, 602, 212, RIVER - 1.3, 1, 'set');
  // Red Ink Lakes: a berm field with six tailings ponds dug into it
  w.raiseRect(738, 471, 933, 612, LOW + 1.25, 5, 'set');
  for (const [x0, z0, x1, z1] of PONDS) w.raiseRect(x0, z0, x1, z1, POND - 0.72, 1.5, 'set');
  // Participation Trophy Hill (Beta Test Battlefield) and the Ant Farm hilltop
  w.raiseCircle(482, 566, 17, 4.2, 0.65, 'add');
  { const a = C.avg(924, 670, 972, 712); C.lshape(G_ANT, 920, 668, 978, 714, () => a); }
  // building pads / yards: [x0, z0, x1, z1, h | null (average), blend]
  for (const [x0, z0, x1, z1, h, b] of [
    [300, 460, 446, 548, null, 4],      // Liquid Assets
    [640, 530, 708, 590, null, 4],      // Surge Pricing Substation
    [232, 608, 312, 668, null, 4],      // Recess Park
    [318, 680, 362, 718, null, 3],      // Drip Pricing Towers
    [534, 694, 616, 756, null, 4],      // Final Sale Scrapyard
    [966, 486, 1026, 532, null, 3],     // QA annex
    [86, 578, 140, 626, MARSH + 0.7, 3],   // Soggy Bottom mound
    [164, 742, 206, 780, MARSH + 0.6, 3],  // pumping station
    [430, 588, 470, 612, null, 3],      // battlefield bunker
    [1010, 756, 1052, 794, null, 4],    // Total Write-Off
  ]) w.raiseRect(x0, z0, x1, z1, h ?? C.avg(x0, z0, x1, z1), b, 'set');

  // ---------------- roads (before the rivers so the crossings get bridges)
  for (const r of ROADS) w.road(r, 7, 'asphalt', { edge: 'gravel', edgeW: 1.2 });
  for (const r of TRACKS) w.road(r, 4, 'dirt', { edge: 'gravel', edgeW: 0.6 });
  w.path(LEDGE, LEDGE_W - 1.2, 'concrete');

  // ---------------- water
  C.resMat = waterMaterial({ deep: 0x16384a, shallow: 0x2a5a66, opacity: 0.92 });
  C.redMat = waterMaterial({ deep: 0x6a2016, shallow: 0x9a4228, opacity: 0.9 });
  C.darkMat = waterMaterial({ deep: 0x14262a, shallow: 0x23403e, opacity: 0.92 });
  C.marshMat = waterMaterial({ deep: 0x26382a, shallow: 0x46583a, opacity: 0.88 });
  C.poolMat = waterMaterial({ deep: 0x2a7a8a, shallow: 0x5ab0b8, opacity: 0.85 });
  w.waterPoly(RESERVOIR, { level: RES_WATER, material: C.resMat });
  w.river(RIVER_PTS, 9, { level: RIVER, depth: 0.85, bank: 3 });
  w.river(CREEK_PTS, 5, { level: LOW - 0.05, depth: 0.6, bank: 2.5 });
  w.waterPoly(MARSH_POLY, { level: MARSH, material: C.marshMat });
  for (const [x0, z0, x1, z1] of PONDS) w.waterPoly([[x0 - 1, z0 - 1], [x1 + 1, z0 - 1], [x1 + 1, z1 + 1], [x0 - 1, z1 + 1]], { level: POND, material: C.redMat });
  w.waterPoly(Array.from({ length: 16 }, (_, i) => [726 + Math.cos(i / 16 * 2 * PI) * 9.5, 318 + Math.sin(i / 16 * 2 * PI) * 9.5]), { level: LOW - 0.05, material: C.darkMat });
  w.waterPoly([[572, 194], [604, 194], [604, 214], [572, 214]], { level: RIVER, material: C.darkMat });
  // bridges over the river / creek where roads cross
  C.roadBridge(588, 501.5, 619, 498.5, 8);                    // Collections Road
  C.roadBridge(282, 786, 305, 768, 7.5);                     // Lowland Drive
  C.roadBridge(661, 652, 671, 636, 7, { pillars: 0 });         // Substation Road over the creek

  // ---------------- terrain paint
  {
    const T = TID, tw = w.tw;
    for (let z = 0; z < w.th; z++) for (let x = 0; x < tw; x++) {
      const ci = z * tw + x; if (w.tids[ci] !== T.grass) continue;
      const vi = z * VW + x, g = w.hv[vi];
      const a = n1(x / 19, z / 19), b = n2(x / 7, z / 7), c = n1(x / 47 + 31, z / 47 + 17);
      let t = null;
      if (marshBin[vi]) t = g < MARSH + 0.1 ? T.mud : a > 0.62 ? T.moss : b > 0.72 ? T.mud : c > 0.45 ? T.dirt : null;
      else if (resBin[vi]) t = g < RES_WATER + 0.4 ? (b > 0.5 ? T.mud : T.sand) : a > 0.6 ? T.rock : T.gravel;
      else if (gorgeBin[vi]) t = a > 0.6 ? T.gravel : b > 0.7 ? T.rock : c > 0.55 ? T.dirt : a < 0.3 ? T.mud : null;
      else if (g > PLAT + 3.5) t = a > 0.48 ? T.rock : b > 0.5 ? T.gravel : null;
      else if (g > PLAT - 1.5) t = a > 0.72 && c > 0.45 ? T.dirt : b > 0.82 ? T.gravel : a < 0.24 ? T.moss : null;
      else if (samp(antS, x, z) > 0.4) t = a > 0.62 ? T.dirt : b > 0.7 ? T.rock : c > 0.6 ? T.moss : null;
      else t = a > 0.7 && c > 0.42 ? T.dirt : b > 0.8 ? T.gravel : a < 0.22 ? T.moss : c < 0.25 ? T.mud : null;
      if (t != null) w.tids[ci] = t;
    }
  }
  // worn ground round the plant: gorge floor near the powerhouse, east plateau works, the pond berms
  for (const [cx, cz, r] of [[585, 228, 60], [650, 210, 34], [520, 205, 30], [745, 230, 30], [812, 258, 44], [690, 560, 30], [830, 545, 100], [575, 724, 40]])
    w.paintFn((x, z, cur) => { if (cur !== TID.grass && cur !== TID.moss && cur !== TID.dirt) return null; const d = Math.hypot(x - cx, z - cz) / r; if (d > 1) return null; const a = n1(x / 9 + 3, z / 9), b = n2(x / 4, z / 4); return a > 0.35 + d * 0.3 ? (b > 0.55 ? TID.gravel : TID.dirt) : b > 0.86 ? TID.concrete : null; });
  // the dam crest, the chute, the pond berms
  w.paintPoly('damConcrete', [...arc(ARCH.rIn, -ARCH.half - 0.02, ARCH.half + 0.02, 40), ...arc(ARCH.rOut, ARCH.half + 0.02, -ARCH.half - 0.02, 40)]);
  w.path(arc(CREST_R, -ARCH.half - 0.04, ARCH.half + 0.04, 40), 5, 'asphalt');
  w.paint('concrete', CHUTE.x0, CHUTE.z0, CHUTE.x1, CHUTE.z1 + 2);
  for (let z = CHUTE.z0 + 6; z < CHUTE.z1; z += 9) w.paint('hazard', CHUTE.x0, z, CHUTE.x1, z + 0.8);
  w.paint('concrete', 897, 427, 909, 486);
  w.paintFn((x, z, cur) => { if (x < 738 || x > 933 || z < 471 || z > 612) return null; if (PONDS.some(([a, b, c, d]) => x > a - 1 && x < c + 1 && z > b - 1 && z < d + 1)) return TID.mud; return n2(x / 5, z / 5) > 0.55 ? TID.gravel : TID.dirt; });

  // ---------------- walls on the sheer edges: the dam faces, the ledge road, the chute, the ramps
  C.dropWalls(arc(ARCH.rIn + 0.2, -ARCH.half - 0.06, ARCH.half + 0.06, 72), 1, { tin: 0.8, tout: 1.4, piece: 4 });   // downstream face
  C.dropWalls(arc(ARCH.rOut - 0.2, -ARCH.half, ARCH.half, 72), -1, { tin: 0.8, tout: 1.2, piece: 4, so: 2.5 });   // upstream face into the reservoir
  C.dropWalls(LEDGE.map(([x, z]) => [x + 3.6, z - 1.2]), -1, { tin: 0.5, tout: 0.9 });                                           // ledge road, gorge side
  C.dropWalls([[CHUTE.x0, CHUTE.z0], [CHUTE.x0, CHUTE.z1 - 2]], -1, { tin: 0.9, tout: 0.3, drop: 1.6, tex: 'concrete' });   // chute side walls
  C.dropWalls([[CHUTE.x1, CHUTE.z0], [CHUTE.x1, CHUTE.z1 - 2]], 1, { tin: 0.9, tout: 0.3, drop: 1.6, tex: 'concrete' });
  for (const [x0, x1] of [[898, 908], [1042, 1062]]) { C.dropWalls([[x0, 440], [x0, 520]], 1, { tin: 0.4, tout: 0.8 }); C.dropWalls([[x1, 440], [x1, 520]], -1, { tin: 0.4, tout: 0.8 }); }
}

function undergrounds(C) {}
function damAndGorge(C) {}
function westPlateau(C) {}
function eastPlateau(C) {}
function lowlands(C) {}
function southlands(C) {}
function outskirts(C) {}
function vegetation(C) {}
function arkSpawns(C) {}
function markers(C) { for (const [x, z] of SPAWNS) C.w.spawnPoint(x, z); }
