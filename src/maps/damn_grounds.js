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
const BALCONY = [[712, 430], [760, 427], [820, 423], [880, 427], [897, 428]];   // escarpment edge under the Bottom Line Balcony
const CHUTE = { x0: 720, x1: 734, z0: 201, z1: 304, h0: PLAT - 0.05 };          // Spillway of Regret (dry chute down the east wall)
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
  [[743, 197], [767, 203], [770, 240], [770, 300], [772, 352]],                                                          // dam access east
  [[302, 346], [305, 400], [316, 446], [338, 478], [352, 520], [336, 580], [304, 640], [292, 720], [296, 790], [300, 830]], // Lowland Drive (south)
  [[352, 520], [420, 514], [500, 510], [560, 504], [604, 500], [650, 490], [700, 470], [760, 462], [840, 464], [920, 470], [980, 482], [1012, 500], [1060, 518], [1104, 524]],   // Collections Road
  [[650, 490], [652, 540], [655, 600], [662, 640], [664, 662], [646, 720], [640, 780], [644, 830]],                       // Substation Road (south)
  [[1050, 343], [1052, 400], [1052, 448], [1050, 516]],                                                                   // east ramp road
];
const TRACKS = [
  [[200, 341], [180, 300], [140, 262], [150, 200], [200, 150], [260, 160], [310, 175], [380, 182], [420, 190], [446, 206]],   // staff town lane
  [[519, 346], [536, 330], [552, 300], [560, 250], [566, 214]],                                                           // gorge floor road north
  [[519, 346], [548, 380], [580, 420], [596, 470], [604, 498]],                                                           // gorge floor road south
  [[470, 512], [470, 548], [478, 590]],                                                                                   // battlefield track
  [[1032, 510], [1030, 560], [1020, 610], [985, 650], [958, 676], [968, 724], [1000, 760], [1030, 776]],                 // Ant Hills track
  [[668, 640], [720, 676], [780, 686], [850, 680], [910, 690], [950, 700]],                                               // creek track
  [[650, 718], [610, 728], [580, 728]],                                                                                   // scrapyard spur
  [[302, 668], [260, 676], [210, 660], [160, 622], [120, 604]],                                                          // marsh track
  [[296, 760], [240, 765], [190, 762]],                                                                                   // pumping station lane
  [[900, 352], [900, 400], [905, 430]],                                                                                   // balcony lane
];
const BOARDWALKS = [
  [[118, 620], [100, 660], [92, 700], [110, 740], [160, 760]],
  [[160, 760], [120, 790], [70, 790]],
  [[150, 610], [190, 690], [218, 724]],
];
const SPAWNS = [[50, 186], [24, 420], [28, 520], [30, 690], [150, 806], [372, 812], [560, 812], [760, 808], [900, 806], [1078, 720], [1080, 580],
  [1086, 470], [1088, 236], [1010, 186], [880, 150], [222, 172], [392, 196], [776, 186], [196, 300], [448, 446], [700, 716], [1020, 410]];

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
  // building placed in a frame: o.x, o.z = design corner
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
const G_VILLA = frame(226, 118, -0.12);       // Golden Handshake Villa, turned to face the water
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
    let h = LOW + 0.9 + fbm(n1, x / 140, z / 140) * 1.4 + (n2(x / 38, z / 38) - 0.5) * 0.9;
    h += sm(770, 825, z) * 2.4 + sm(36, 0, x) * 2.6;
    // Overdraft Marsh: low and lumpy, pools wherever it dips under MARSH
    const ms = samp(marshS, x, z);
    if (ms > 0) h = lerp(h, MARSH - 0.12 + fbm(n2, x / 21, z / 21) * 0.8, ms);
    // Ant Hills: rolling hills in the south-east
    const an = samp(antS, x, z);
    if (an > 0) h += an * (5.2 + fbm(n1, x / 70 + 9, z / 70) * 3.6 + sm(700, 830, z) * 3);
    // plateaus: the west one slopes gently down to the lowlands, the east one ends in an escarpment
    const ws = samp(wSoft, x, z), es = eS[i], jit = (n2(x / 9, z / 9) - 0.5) * 3.2 + (n1(x / 3.5, z / 3.5) - 0.5) * 1.2;   // ragged cliff lines
    if (ws > 0 || es > -5) {
      const pl = PLAT + (n3(x / 90, z / 90) - 0.5) * 0.9;
      if (ws > 0) h = lerp(h, pl, ws);
      if (es > -5) h = lerp(h, pl, sm(-2.2, 2.2, es + jit));
    }
    // hills behind the plateaus (NW, NE)
    const nw = samp(nwS, x, z), ne = samp(neS, x, z);
    if (nw > 0) h = lerp(h, PLAT + 2 + nw * 11 + fbm(n1, x / 40, z / 40) * 3, nw);
    if (ne > 0) h = lerp(h, PLAT + 2 + ne * 12 + fbm(n2, x / 40 + 5, z / 40) * 3, ne);
    // reservoir: a short bank down to the bed
    if (rS[i] > -1.5) h = lerp(h, RES_BED + (n1(x / 50, z / 50) - 0.5) * 3, sm(-1, 9, rS[i] + jit * 0.4));
    // gorge: sheer walls down to a floor that falls gently toward the mouth
    const [r, t] = archRT(x, z), inArch = Math.abs(t) < ARCH.half + 0.07 && r > ARCH.rIn - 10 && r < ARCH.rOut + 13;
    if (gS[i] > -5 || inArch) {
      const gf = lerp(LOW + 0.7, LOW - 0.1, sm(200, 480, z)) + (n2(x / 30, z / 30) - 0.5) * 0.7;
      h = lerp(h, gf, sm(-2.4, 2.4, gS[i] + jit));
      // the arch: crest at PLAT, a clean toe below the downstream face, a sheer upstream face into the water
      if (inArch) {
        if (r >= ARCH.rIn && r <= ARCH.rOut) h = PLAT;
        else if (r < ARCH.rIn && Math.abs(t) < ARCH.half) h = gf;
        else if (r > ARCH.rOut && Math.abs(t) < ARCH.half - 0.01 && resBin[i]) h = Math.min(h, RES_BED + 1);
      }
    }
    w.hv[i] = h;
  }
  C.fbm = fbm;

  // ---------------- shaped ground
  // a clean edge under the Bottom Line Balcony (the promenade wall runs along it)
  { const ez = (x) => { for (let k = 0; k < BALCONY.length - 1; k++) { const [ax, az] = BALCONY[k], [bx, bz] = BALCONY[k + 1]; if (x <= bx) return lerp(az, bz, clamp((x - ax) / (bx - ax), 0, 1)); } return BALCONY[BALCONY.length - 1][1]; };
    C.areaFn(712, 396, 897, 446, (x, z, cur) => { const e = ez(x); return z <= e ? Math.max(cur, PLAT) : z <= e + 4 ? Math.min(cur, LOW + 1.6 + (z - e) * 0.05) : null; }); }
  // the Spillway of Regret: a dry concrete chute from the floodgates down to the plunge pool
  C.slope(CHUTE.x0, CHUTE.z0, CHUTE.x1, CHUTE.z1, CHUTE.h0, LOW + 0.3, 'z', 0);
  C.rampLine(LEDGE, LEDGE_W, PLAT, LOW + 0.5);                                         // ledge road down the west wall
  for (const [ax, bx] of [[486, 506], [730, 709]]) C.rampLine([[ax, BRIDGE.z], [bx, BRIDGE.z]], 11, w.groundAt(ax, BRIDGE.z), BRIDGE.y + 0.02, 2);   // approach ramps up to the Bridge To Nowhere
  C.slope(1042, 432, 1062, 524, PLAT, LOW + 1.1, 'z', 0);                               // east ramp road
  // plunge pool + tailrace basin
  w.raiseCircle(726, 318, 9, LOW - 0.6, 0.5, 'set');
  w.raiseRect(574, 196, 602, 212, RIVER - 1.3, 1, 'set');
  // Red Ink Lakes: a berm field with six tailings ponds dug into it
  w.raiseRect(738, 471, 933, 612, LOW + 0.85, 5, 'set');
  for (const [x0, z0, x1, z1] of PONDS) w.raiseRect(x0 + 2, z0 + 2, x1 - 2, z1 - 2, POND - 0.7, 4, 'set');   // gentle banks: you can wade in and walk out
  // Participation Trophy Hill (Beta Test Battlefield) and the Ant Farm hilltop
  w.raiseCircle(482, 566, 17, 4.2, 0.65, 'add');
  { const a = C.avg(924, 670, 972, 712); C.lshape(G_ANT, 920, 668, 978, 714, () => a); }
  // building pads / yards: [x0, z0, x1, z1, h | null (average), blend]
  for (const [x0, z0, x1, z1, h, b] of [
    [300, 460, 446, 548, null, 4],      // Liquid Assets
    [660, 528, 726, 592, null, 4],      // Surge Pricing Substation
    [222, 604, 292, 664, null, 4],      // Recess Park
    [318, 680, 362, 718, null, 3],      // Drip Pricing Towers
    [534, 694, 616, 756, null, 4],      // Final Sale Scrapyard
    [960, 506, 1028, 546, null, 3],     // QA annex
    [86, 578, 140, 626, MARSH + 0.7, 3],   // Soggy Bottom mound
    [164, 742, 206, 780, MARSH + 0.6, 3],  // pumping station
    [430, 588, 470, 612, null, 3],      // battlefield bunker
    [1010, 756, 1052, 794, null, 4],    // Total Write-Off
    [404, 204, 470, 252, PLAT, 4],      // Ivory Tower plaza
    [276, 210, 352, 272, PLAT, 4],      // Department of Synergy
    [60, 200, 136, 280, null, 4],       // Shoebox Flats
    [770, 226, 862, 298, PLAT, 4],      // the Paywall
    [866, 250, 966, 334, PLAT, 4],      // Kale Bubble
    [874, 172, 966, 234, null, 4],      // Impound Lot
    [984, 192, 1056, 256, null, 4],     // Eastside Squat
    [772, 200, 800, 228, PLAT, 3],      // floodgate control
  ]) w.raiseRect(x0, z0, x1, z1, h ?? C.avg(x0, z0, x1, z1), b, 'set');
  // turned pads: the villa terrace and the Show Home cul-de-sac
  { const a = Math.max(PLAT, C.avg(192, 94, 242, 146)); C.lshape(G_VILLA, 190, 92, 242, 148, () => a); }
  { const a = C.avg(160, 352, 236, 410); C.lshape(G_SHOW, 160, 350, 234, 412, () => a); }
  // the Bottleneck's island + the marina slipway down to the pier
  w.raiseCircle(420, 112, 16, PLAT, 0.3, 'set');
  C.rampLine([[309, 166], [309, 154]], 5, PLAT, 12.45, 1);

  // ---------------- roads (before the rivers so the crossings get bridges)
  for (const r of ROADS) w.road(r, 7, 'asphalt', { edge: 'gravel', edgeW: 1.2 });
  for (const r of TRACKS) w.road(r, 4, 'dirt', { edge: 'gravel', edgeW: 0.6 });
  w.path(LEDGE, LEDGE_W - 1.2, 'concrete');
  { const hf = w.groundAt(903, 465); C.slope(898, 427, 908, 465, PLAT, hf, 'z', 0); }       // Bottom Line Steps (down the escarpment to the road)

  // ---------------- water
  C.resMat = waterMaterial({ deep: 0x16384a, shallow: 0x2a5a66, opacity: 0.92 });
  C.redMat = waterMaterial({ deep: 0x4a1a12, shallow: 0x7a3422, opacity: 0.93 });
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
  C.roadBridge(662, 653, 663, 633, 7, { pillars: 0 });         // Substation Road over the creek

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
      else if (gorgeBin[vi]) t = a > 0.5 ? T.gravel : b > 0.66 ? T.rock : c > 0.7 ? T.dirt : b < 0.14 ? T.mud : null;
      else if (g > PLAT + 3.5) t = a > 0.48 ? T.rock : b > 0.5 ? T.gravel : null;
      else if (g > PLAT - 1.5) t = a > 0.72 && c > 0.45 ? T.dirt : b > 0.82 ? T.gravel : a < 0.24 ? T.moss : null;
      else if (samp(antS, x, z) > 0.4) t = a > 0.62 ? T.dirt : b > 0.7 ? T.rock : c > 0.6 ? T.moss : null;
      else t = a > 0.72 && c > 0.45 ? T.dirt : b > 0.82 ? T.gravel : a < 0.22 ? T.moss : b < 0.1 ? T.mud : null;
      if (t != null) w.tids[ci] = t;
    }
  }
  // worn ground round the plant: gorge floor near the powerhouse, east plateau works, the pond berms
  const repaint = (x0, z0, x1, z1, fn) => { for (let z = Math.max(0, Math.floor(z0)); z < Math.min(w.th, Math.ceil(z1)); z++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(w.tw, Math.ceil(x1)); x++) { const ci = z * w.tw + x, t = fn(x + 0.5, z + 0.5, w.tids[ci]); if (t != null) w.tids[ci] = t; } };
  for (const [cx, cz, r] of [[585, 215, 44], [650, 210, 30], [520, 205, 26], [745, 230, 28], [812, 258, 44], [690, 560, 30], [575, 724, 40]])
    repaint(cx - r, cz - r, cx + r, cz + r, (x, z, cur) => { if (cur !== TID.grass && cur !== TID.moss && cur !== TID.dirt) return null; const d = Math.hypot(x - cx, z - cz) / r; if (d > 1) return null; const a = n1(x / 9 + 3, z / 9), b = n2(x / 4, z / 4); return a > 0.35 + d * 0.3 ? (b > 0.55 ? TID.gravel : TID.dirt) : b > 0.86 ? TID.concrete : null; });
  // the dam crest, the chute, the pond berms
  w.paintPoly('damConcrete', [...arc(ARCH.rIn, -ARCH.half - 0.02, ARCH.half + 0.02, 40), ...arc(ARCH.rOut, ARCH.half + 0.02, -ARCH.half - 0.02, 40)]);
  w.path(arc(CREST_R, -ARCH.half - 0.04, ARCH.half + 0.04, 40), 5, 'asphalt');
  w.paint('concrete', CHUTE.x0, CHUTE.z0, CHUTE.x1, CHUTE.z1 + 2);
  for (let z = CHUTE.z0 + 6; z < CHUTE.z1; z += 9) w.paint('hazard', CHUTE.x0, z, CHUTE.x1, z + 0.8);
  w.paint('concrete', 897, 427, 909, 465);
  repaint(738, 471, 933, 612, (x, z) => (PONDS.some(([a, b, c, d]) => x > a - 1 && x < c + 1 && z > b - 1 && z < d + 1) ? TID.mud : n2(x / 5, z / 5) > 0.55 ? TID.gravel : TID.dirt));

  // ---------------- walls on the sheer edges: the dam faces, the ledge road, the chute, the ramps
  C.dropWalls(arc(ARCH.rIn + 0.2, -ARCH.half - 0.06, ARCH.half + 0.06, 72), 1, { tin: 0.8, tout: 1.4, piece: 4 });   // downstream face
  C.dropWalls(arc(ARCH.rOut - 0.2, -ARCH.half, ARCH.half, 72), -1, { tin: 0.8, tout: 1.2, piece: 4, so: 2.5 });   // upstream face into the reservoir
  C.dropWalls(LEDGE.map(([x, z]) => [x + 3.6, z - 1.2]), -1, { tin: 0.5, tout: 0.9 });                                           // ledge road, gorge side
  C.dropWalls([[CHUTE.x0, CHUTE.z0], [CHUTE.x0, CHUTE.z1 - 2]], -1, { tin: 0.9, tout: 0.3, drop: 1.6, tex: 'concrete' });   // chute side walls
  C.dropWalls([[CHUTE.x1, CHUTE.z0], [CHUTE.x1, CHUTE.z1 - 2]], 1, { tin: 0.9, tout: 0.3, drop: 1.6, tex: 'concrete' });
  for (const [x0, x1, z1] of [[898, 908, 461], [1042, 1062, 520]]) { C.dropWalls([[x0, 436], [x0, z1]], 1, { tin: 0.4, tout: 0.8 }); C.dropWalls([[x1, 436], [x1, z1]], -1, { tin: 0.4, tout: 0.8 }); }
}

// ==================================================================================== UNDERGROUND
// Engine `under` halls (sunk floor, 1 m earth walls, a walkable lid flush with the surface); `stairs to: 'top'`
// cut the lid. Built first so surface dressing placed over them later lands on the lid (C.hallAt in makeCtx).
function undergrounds(C) {
  const { w } = C;
  const hall = C.hall = (o) => {
    const bb = C.bld({ wall: 'concrete', floor: 'concrete', roof: o.lid || 'grass', blend: 0.5, ...o, under: o.depth, floorY: o.top });
    C.halls.push({ poly: bb.poly, b: [bb.ax0, bb.az0, bb.ax1, bb.az1], top: o.top, bb });
    // guard rails round every stairwell opening on the lid (open on the side you step off)
    for (const st of o.stairs || []) {
      const g = C.stairGeom(st, 3.2, o.depth, true), [x0, z0, x1, z1] = g.hole;
      const sides = { n: [[x0, z0], [x1, z0]], s: [[x0, z1], [x1, z1]], w: [[x0, z0], [x0, z1]], e: [[x1, z0], [x1, z1]] };
      for (const [sd, [[ax, az], [bx, bz]]] of Object.entries(sides)) {
        if (sd === g.dir) continue;
        const Ls = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(Ls / 2));
        for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; C.P(bb, 'dg_shaftrail', ax + (bx - ax) * t, az + (bz - az) * t, sd === 'n' || sd === 's' ? 0 : PI / 2, { yAbs: o.top, solid: true, scale: Ls / n / 2 }); }
      }
    }
    return bb;
  };
  const tl = (bb, lx, lz, col = 0xffd8a0, i = 1.4, r = 11) => C.IL(bb, lx, lz, col, i, r, 2.6);
  // ---------------- Floodgate Service Gallery: under the east plateau beside the spillway chute
  const fg = C.B.fgal = hall({ x: 739, z: 230, w: 9, d: 56, depth: 5.5, top: w.groundAt(744, 258), name: 'Floodgate Service Gallery',
    stairs: [{ x: 1.4, z: 3.4, w: 1.6, dir: 'n', to: 'top' }, { x: 6.0, z: 44.4, w: 1.6, dir: 's', to: 'top' }] });
  for (let z = 15; z < 42; z += 8) C.P(fg, 'dg_bigpipe', 7.4, z, PI / 2, { solid: true, scale: 0.7 });
  C.P(fg, 'dg_valve', 2.2, 24, 0, { solid: true }); C.P(fg, 'dg_valve', 2.2, 36, 0, { solid: true }); C.P(fg, 'dg_pump', 2.4, 30, PI / 2, { solid: true });
  for (const [k, lx, lz, r, t] of [['locker', 1.6, 16, PI / 2, 1], ['toolbox', 2.0, 19.5, 0, 2], ['crate', 2.2, 41, 0, 1], ['electronics', 2.0, 33, 0, 2], ['raider_cache', 4.6, 50, 0, 2], ['ammo_box', 2.0, 45, 0, 1], ['crate', 7.0, 6, 0, 1]]) C.Cn(fg, k, lx, lz, r, { tier: t });
  for (let z = 6; z < 56; z += 11) tl(fg, 4.5, z, 0xffd090, 1.3, 10);
  // ---------------- Flood Access Tunnel under the Bottom Line Balcony
  const fa = C.B.fat = hall({ x: 768, z: 401, w: 62, d: 9, depth: 5, top: PLAT + 0.1, name: 'Flood Access Tunnel',
    stairs: [{ x: 2.6, z: 3.6, w: 1.6, dir: 'w', to: 'top' }, { x: 51.6, z: 3.6, w: 1.6, dir: 'e', to: 'top' }] });
  C.P(fa, 'dg_pump', 18, 2.0, 0, { solid: true }); C.P(fa, 'dg_pump', 40, 7.0, PI, { solid: true });
  C.P(fa, 'dg_valve', 24, 7.2, 0, { solid: true }); C.P(fa, 'dg_bed', 30, 7.0, PI / 2, { solid: true }); C.P(fa, 'dg_table', 33.5, 6.8, 0, { solid: true });
  for (const [k, lx, lz, t] of [['raider_cache', 31.5, 2.0, 2], ['ammo_box', 27, 7.4, 1], ['crate', 14, 7.2, 1], ['medical_bag', 36, 7.4, 1], ['electronics', 44, 2.0, 2], ['desk', 35, 2.0, 1], ['toolbox', 21, 2.0, 1]]) C.Cn(fa, k, lx, lz, 0, { tier: t });
  for (const lx of [8, 20, 32, 44, 55]) tl(fa, lx, 4.5, 0xffc070, 1.3, 10);
  // ---------------- Cable Vault under the transformer yard (the switch at the foot of the stairs, a vent shaft above)
  const cvTop = C.avg(630, 220, 666, 230);
  const cv = C.B.cvault = hall({ x: 630, z: 220, w: 36, d: 9, depth: 4.6, top: cvTop, lid: 'gravel', name: 'Cable Vault',
    stairs: [{ x: 2.6, z: 3.6, w: 1.6, dir: 'w', to: 'top' }, { x: 26.0, z: 3.6, w: 1.6, dir: 'e', to: 'top' }] });
  C.P(cv, 'dg_switch', 11.0, 1.4, 0, { solid: true });                       // the power switch under the west stairs
  C.P(cv, 'dg_fusebox', 15, 1.3, 0, { solid: true }); C.P(cv, 'dg_generator', 20, 6.4, 0, { solid: true, scale: 0.6 });
  for (let x = 5; x < 33; x += 7) C.P(cv, 'dg_bigpipe', x, 7.7, 0, { solid: true, scale: 0.45 });
  for (const [k, lx, lz, t] of [['electronics', 17.5, 1.6, 2], ['toolbox', 24, 1.6, 2], ['crate', 32, 2.0, 1], ['locker', 13, 7.6, 1]]) C.Cn(cv, k, lx, lz, 0, { tier: t });
  for (const lx of [7, 18, 29]) tl(cv, lx, 4.5, 0xd8e8ff, 1.3, 10);
  w.prop('dg_ventbox', 640, 217.5, 0, { solid: true }); w.prop('dg_ventbox', 655, 217.5, 0, { solid: true });   // ventilation shafts
  // ---------------- Beta Test bunker beside Participation Trophy Hill
  const bkTop = C.avg(432, 590, 468, 610);
  const bk = C.B.bunker = hall({ x: 433, z: 591, w: 32, d: 10, depth: 4.4, top: bkTop, lid: 'dirt', name: 'Beta Test Bunker',
    stairs: [{ x: 2.6, z: 4.2, w: 1.6, dir: 'w', to: 'top' }, { x: 22.4, z: 4.2, w: 1.6, dir: 'e', to: 'top' }] });
  for (const lx of [12, 16, 20]) C.P(bk, 'dg_switch', lx, 1.3, 0, { solid: true });            // the three power switches
  C.P(bk, 'dg_console', 16, 8.6, PI, { solid: true }); C.P(bk, 'dg_desk', 12, 8.4, PI, { solid: true });
  for (const [k, lx, lz, t] of [['desk', 20, 8.5, 2], ['cabinet', 9.5, 8.6, 1], ['cabinet', 23.5, 1.4, 1], ['ammo_box', 26, 8.5, 1], ['weapon_case', 6.5, 8.5, 2], ['medical_bag', 8.5, 1.4, 1]]) C.Cn(bk, k, lx, lz, 0, { tier: t });
  for (const lx of [8, 16, 24]) tl(bk, lx, 5, 0xffb070, 1.2, 9);
}

// ==================================================================================== THE DAM + THE GORGE
function damAndGorge(C) {
  const { w, rng } = C;
  const CR = (t) => archPt(CREST_R, t);
  // ---------------- The Damn Dam: the crest
  // pilasters on the downstream face + a toll booth (the dam crest is a toll road; nobody has paid in years)
  for (let k = -5; k <= 5; k++) {
    const t = k * 0.13, [x, z] = archPt(ARCH.rIn - 1.6, t), g = w.groundAt(...archPt(ARCH.rIn - 4, t));
    w.block(x - 1.2, z - 0.9, x + 1.2, z + 0.9, PLAT + 0.6 - g, 'damConcrete', { y0: g - 0.3, R: rotFrame(x, z, t) });
  }
  const toll = C.bld({ x: 582, z: 153.3, w: 6, d: 3.4, wall: 'concrete', floor: 'tiles', roof: 'metalPanel', roofTint: 0xd8a020, name: 'Crest Toll Booth', floorY: PLAT,
    doors: [{ side: 'e', at: 0.8, w: 1.8, door: true }, { side: 'n', at: 0.6, w: 2.4, sill: 1.0 }, { side: 's', at: 0.6, w: 2.4, sill: 1.0 }, { side: 'w', at: 0.8, w: 1.8, sill: 1.0 }] });
  C.Cn(toll, 'desk', 1.0, 1.7, PI / 2, { tier: 1 }); C.Cn(toll, 'cabinet', 4.6, 0.6, 0, { tier: 1 }); C.IL(toll, 3, 1.7, 0xfff0c0, 1.2, 7);
  for (const t of [-0.07, 0.07]) { const [x, z] = archPt(CREST_R, t); w.prop('dg_barrier', x, z, -t + PI / 2, { solid: true }); }
  // crest lights, beacons at the ends, wrecks and a barricade
  for (let k = -9; k <= 9; k++) {
    const t = k * 0.08, side = k % 2 ? ARCH.rIn + 1.6 : ARCH.rOut - 1.6, [x, z] = archPt(side, t);
    C.flood(x, z, { rot: -t + (k % 2 ? PI : 0), i: 1.7 });
  }
  for (const t of [-ARCH.half - 0.02, ARCH.half + 0.02]) for (const r of [ARCH.rIn + 1, ARCH.rOut - 1]) C.beacon(...archPt(r, t));
  for (const [t, k, dr] of [[-0.5, 'car', -2.4], [-0.32, 'dg_truck', 2.0], [0.24, 'car', 2.6], [0.42, 'husk', -1.6], [0.58, 'car', -2.2], [-0.62, 'dg_barrier', 2.4], [-0.61, 'dg_barrier', -2.6]])
    w.prop(k, ...archPt(CREST_R + dr, t), -t + PI / 2 + (rng() - 0.5) * 0.4, { solid: true });
  for (const t of [-0.45, 0.33]) w.container('car_trunk', ...archPt(CREST_R, t), -t, { tier: 1 });
  C.sandbags([CR(0.16), CR(0.19)]); C.sandbags([CR(-0.2), CR(-0.17)]);
  w.container('ammo_box', ...CR(0.175), 0, { tier: 1 }); w.container('arc_husk', ...archPt(CREST_R - 2, 0.43), 0, { tier: 2 });
  // penstock intakes on the upstream face (grilles just above the water)
  for (const t of [-0.12, -0.04, 0.04, 0.12]) w.prop('dg_spillgrate', ...archPt(ARCH.rOut + 0.6, t), -t + PI / 2, { yAbs: RES_WATER - 1.2 });

  // ---------------- The Hamster Wheel (turbine hall at the foot of the dam) + its control wing
  const fy = C.avg(533, 168, 617, 192);
  const gh = C.B.gh = C.bld({ x: 553, z: 167, w: 64, d: 24, h: 11, floorY: fy, blend: 1, name: 'The Hamster Wheel', wall: 'concrete', floor: 'metalPanel', tint: 0xd8d0c0, roofTint: 0x8a8478,
    doors: [{ side: 's', at: 4, w: 6 }, { side: 's', at: 54, w: 6 }, { side: 'e', at: 9, w: 3 }, { side: 'n', at: 30, w: 2.2, door: true }, { side: 'w', at: 15, w: 2.2, door: true },
      ...[14, 22, 30, 38, 46].map(at => ({ side: 's', at, w: 3, sill: 2.4, top: 5.5 })), ...[6, 22, 38, 54].map(at => ({ side: 'n', at, w: 3, sill: 3.0, top: 6 }))],
    roofExtras: [[6, 4, 18, 10, 1.4], [40, 14, 56, 20, 1.2]] });
  for (const [i, lx] of [[0, 9], [1, 23], [2, 41], [3, 55]]) { C.P(gh, 'dg_turbine', lx, 11, i * 0.4, { solid: true }); C.P(gh, 'dg_generator', lx, 4.6, 0, { solid: true, scale: 0.7 }); }
  C.P(gh, 'dg_gantry', 32, 12, 0, {}); C.P(gh, 'dg_console', 32, 21.6, PI, { solid: true }); C.P(gh, 'dg_console', 29, 21.6, PI, { solid: true }); C.P(gh, 'dg_fusebox', 63.3, 18, -PI / 2, { solid: true });
  for (const [k, lx, lz, t] of [['toolbox', 3, 20, 2], ['electronics', 35, 21.4, 2], ['crate', 3, 3, 1], ['toolbox', 61, 3, 1], ['crate', 47, 21.3, 1], ['locker', 16, 21.4, 1]]) C.Cn(gh, k, lx, lz, 0, { tier: t });
  for (const lx of [9, 23, 41, 55]) C.IL(gh, lx, 12, 0xffd090, 1.3, 12, 6);
  const cw = C.B.ghw = C.bld({ x: 529, z: 172, w: 22, d: 24, storeys: 3, floorY: fy, blend: 1, name: 'Hamster Wheel Control Wing', wall: 'concrete', floor: 'tiles', tint: 0xe0d8c8,
    doors: [{ side: 's', at: 4, w: 2.4, door: true }, { side: 'w', at: 16, w: 2.2, door: true }, { side: 'e', at: 15, w: 2.2 }, { side: 'n', at: 9, w: 3, sill: 1.1 }, { side: 's', at: 14, w: 3, sill: 1.1 }, { side: 'w', at: 5, w: 3, sill: 1.1 }],
    inner: [[0, 12, 22, 12, [{ at: 9, w: 2 }]], [11, 12, 11, 24, [{ at: 5, w: 1.8 }]], [0, 12, 22, 12, [{ at: 9, w: 2 }], 1], [0, 12, 22, 12, [{ at: 9, w: 2 }], 2], [11, 0, 11, 12, [{ at: 4, w: 1.8 }], 2]],
    stairs: [{ x: 19.2, z: 2.4, w: 1.8, dir: 's', from: 0, to: 1 }, { x: 1.2, z: 14.2, w: 1.8, dir: 'n', from: 1, to: 2 }], ladders: [{ x: 20.6, z: 21.5, from: 2, to: 'top', face: PI }] });
  C.F(cw, 'control', 0, 0, 19, 12, { tier: 2 }); C.F(cw, 'workshop', 0, 12, 11, 24, { tier: 1 }); C.F(cw, 'storage', 11, 12, 22, 24, { tier: 1 });
  C.F(cw, 'office', 0, 0, 22, 12, { tier: 2, storey: 1 }); C.F(cw, 'bunk', 4, 12, 22, 24, { tier: 1, storey: 1 });
  C.F(cw, 'server', 0, 0, 11, 12, { tier: 2, storey: 2 }); C.F(cw, 'security', 11, 0, 22, 12, { tier: 2, storey: 2 }); C.F(cw, 'office', 0, 12, 22, 24, { tier: 2, storey: 2 });
  C.P(cw, 'dg_satdish', 6, 6, 0.5, { yAbs: C.roofY(cw), solid: true }); C.P(cw, 'dg_antennamast', 3, 20, 0, { yAbs: C.roofY(cw), solid: true, scale: 0.7 });
  // penstocks from the dam face into the hall's north wall
  for (const lx of [9, 23, 41, 55]) { const [x, z] = C.Wp(gh, lx, -2.2); w.prop('dg_bigpipe', x, z, PI / 2, { solid: true, scale: 0.55 }); }
  // tailrace: the catwalk over the basin and the outfall
  w.bridge([[570, 204], [606, 204]], 2.4, w.groundAt(568, 204) + 0.25, 'metalPanel', { pillars: 0, thick: 0.35 });
  for (const x of [578, 588, 598]) w.prop('dg_spillgrate', x, 194.6, 0, {});
  // ---------------- transformer yard + switch house (east of the hall)
  C.fenceRect(622, 181, 660, 215, [[622, 198], [641, 215]]);
  for (let x = 628; x < 658; x += 8) for (let z = 187; z < 212; z += 8.5) w.prop('dg_transformer', x, z, 0, { solid: true });
  w.prop('dg_gantry', 641, 184, 0, {});
  for (const [x, z] of [[624, 183], [658, 213]]) C.flood(x, z, { color: 0xd0e0ff });
  w.container('electronics', 655, 209, 0, { tier: 2 }); w.container('toolbox', 627, 210, 0, { tier: 1 });
  const sh = C.bld({ x: 668, z: 200, w: 14, d: 10, wall: 'concrete', floor: 'concrete', roof: 'corrugated', name: 'Switch House',
    doors: [{ side: 'w', at: 3, w: 2.2, door: true }, { side: 's', at: 8, w: 2.4 }, { side: 'n', at: 5, w: 3, sill: 1.1 }] });
  C.F(sh, 'server', 0, 0, 14, 10, { tier: 2 });
  C.fieldDepot(652, 238, 0);
  // ---------------- maintenance shop (west of the hall, below the ledge road)
  const ms = C.B.mshop = C.bld({ x: 496, z: 190, w: 28, d: 18, storeys: 2, name: 'Maintenance Shop', wall: 'corrugated', roof: 'corrugated', roofTint: 0x9a7a58, floor: 'concrete', tint: 0xc8c0b0,
    doors: [{ side: 's', at: 4, w: 4 }, { side: 'e', at: 7, w: 2.2, door: true }, { side: 's', at: 20, w: 3, sill: 1.1 }, { side: 'n', at: 12, w: 3, sill: 1.2 }],
    inner: [[16, 0, 16, 18, [{ at: 7, w: 2 }]], [16, 0, 16, 18, [{ at: 4, w: 1.8 }], 1]],
    stairs: [{ x: 13.2, z: 1.8, w: 1.6, dir: 's', from: 0, to: 1 }] });
  C.F(ms, 'industrial', 0, 0, 16, 18, { tier: 1, extra: [['toolbox', 1]] }); C.F(ms, 'workshop', 16, 0, 28, 18, { tier: 2 });
  C.F(ms, 'storage', 0, 0, 16, 18, { tier: 1, storey: 1 }); C.F(ms, 'bunk', 16, 0, 28, 18, { tier: 1, storey: 1 });
  // spare parts store (east of the tailrace)
  const sp = C.B.spares = C.bld({ x: 610, z: 252, w: 24, d: 14, name: 'Spare Parts Store', wall: 'corrugated', floor: 'concrete', roof: 'corrugated', roofTint: 0x5a7a8a, tint: 0xb8c0c0,
    doors: [{ side: 'w', at: 5, w: 3.5 }, { side: 's', at: 16, w: 2.2, door: true }, { side: 'n', at: 6, w: 3, sill: 1.4 }, { side: 'e', at: 5, w: 3, sill: 1.4 }],
    inner: [[14, 0, 14, 14, [{ at: 7, w: 2 }]]] });
  C.F(sp, 'storage', 0, 0, 14, 14, { tier: 1, extra: [['crate', 2]] }); C.F(sp, 'industrial', 14, 0, 24, 14, { tier: 2 });
  // the Down Round (cargo elevator on the gorge floor)
  C.lift('the_down_round', 'The Down Round', 538, 286, 0);
  // ---------------- The Corporate Ladder: a stair house up the east wall (gorge floor -> plateau)
  const lfy = C.avg(686, 244, 700, 258), lsh = (PLAT - lfy) / 3;
  const lad = C.B.ladder = C.bld({ x: 686, z: 244, w: 14, d: 14, storeys: 4, storeyH: lsh, floorY: lfy, blend: 1, name: 'The Corporate Ladder', wall: 'concrete', floor: 'concrete', tint: 0xb8b4a8, upWin: false,
    doors: [{ side: 'w', at: 5, w: 2.4, door: true }, { side: 's', at: 3, w: 2.2 }, { side: 'e', at: 5.8, w: 2.4, storey: 3 },
      { side: 's', at: 8, w: 3, sill: 1.1, storey: 1 }, { side: 'w', at: 8, w: 3, sill: 1.1, storey: 2 }, { side: 's', at: 8, w: 3, sill: 1.1, storey: 3 }, { side: 'n', at: 4, w: 3, sill: 1.1, storey: 2 }],
    stairs: [{ x: 1.2, z: 6.4, w: 1.6, dir: 'n', from: 0, to: 1 }, { x: 11.2, z: 1.6, w: 1.6, dir: 's', from: 1, to: 2 }, { x: 1.2, z: 6.4, w: 1.6, dir: 'n', from: 2, to: 3 }],
    ladders: [{ x: 12.0, z: 12.6, from: 3, to: 'top', face: PI }] });
  C.Cn(lad, 'locker', 7, 13.4, PI, { tier: 1 }); C.Cn(lad, 'crate', 7.5, 0.8, 0, { tier: 1, storey: 1 }); C.Cn(lad, 'cabinet', 7, 13.4, PI, { tier: 1, storey: 2 }); C.Cn(lad, 'toolbox', 5, 13.4, PI, { tier: 2, storey: 3 });
  for (let k = 0; k < 4; k++) C.IL(lad, 7, 7, 0xfff0d0, 1.2, 8, 2.6, k);
  w.bridge([[700.1, 251], [711, 251]], 2.6, PLAT + 0.02, 'metalPanel', { pillars: 0, thick: 0.35 });
  w.block(700.4, 249.75, 709.5, 252.25, PLAT + 0.02 - lfy + 0.6, 'concrete', { y0: lfy - 0.6 });   // its pier over the cliff band
  C.P(lad, 'dg_signred', 15.2, 3, PI / 2, { yAbs: PLAT, solid: true });
  // ---------------- plunge pool + the Spillway Doggy Door (hydraulic pipes leak here)
  C.hatch('spillway_hatch', 'Spillway Doggy Door', 706, 314, 0);
  for (const [x, z, r] of [[700, 302, 0.2], [712, 300, -0.15], [716, 330, 0.6]]) w.prop('dg_bigpipe', x, z, r, { solid: true, scale: 0.6 });
  w.prop('dg_valve', 696, 309, 0, { solid: true }); w.prop('dg_pump', 698, 322, PI / 2, { solid: true }); w.prop('dg_toxic', 712, 323, 0, { solid: true });
  w.waterPoly([[699, 315], [703, 314], [704, 317], [700, 318]], { level: w.groundAt(701, 316) + 0.1, material: C.darkMat });
  C.loot(708, 316, 10, ['toolbox', 'crate', 'trash'], 1, { avoid: (x, z) => Math.hypot(x - 706, z - 314) < 3 || Math.hypot(x - 726, z - 318) < 10 });
  C.inLight(704, 306, 0xffb040, 1.3, 9); C.beacon(716, 300);

  // ---------------- The Bridge To Nowhere (collapsed highway span across the gorge)
  const B = BRIDGE;
  w.bridge([[B.x0, B.z], [B.gap0, B.z]], 9, B.y, 'asphalt', { thick: 1.0, pillars: 21, pillarW: 1.8, rails: true });
  w.bridge([[B.gap1, B.z], [B.x1, B.z]], 9, B.y, 'asphalt', { thick: 1.0, pillars: 23, pillarW: 1.8, rails: true });
  // abutments: solid from the gorge floor to the deck across each rim (no half-buried deck over the cliff band)
  for (const [x0, x1] of [[504, 520], [694, 710]]) w.block(x0, B.z - 4.5, x1, B.z + 4.5, B.y - 1.6, 'damConcrete', { y0: 1.6 });
  for (const x of [B.gap0 - 1.0, B.gap1 + 1.0]) for (const dz of [-3, 0, 3]) w.prop('dg_barrier', x, B.z + dz, PI / 2, { solid: true, yAbs: B.y });
  for (const x of [B.gap0 - 2.4, B.gap1 + 2.4]) C.beacon(x, B.z - 4, { base: B.y });
  for (const [x, dz, k, r] of [[540, -2, 'car', 1.6], [566, 2.5, 'dg_truck', 1.5], [650, -2.5, 'car', 1.4], [690, 2, 'car', 1.7]]) w.prop(k, x, B.z + dz, r, { solid: true, yAbs: B.y });
  w.container('car_trunk', 566, B.z - 0.6, 0, { tier: 1, yAbs: B.y }); w.container('car_trunk', 650, B.z + 0.4, 0, { tier: 1, yAbs: B.y });
  w.ladder(B.gap0 - 4, B.z + 5.6, null, B.gap0 - 4, B.z + 3.4, B.y, 0);                        // climb up from the gorge floor
  w.prop('dg_brokenspan', 603, 364, 1.62, {}); w.prop('dg_slab', 596, 352, 0.4, { solid: true }); w.prop('dg_slab', 611, 371, 2.2, { solid: true });
  C.clutter(604, 362, 16, 12, ['dg_rubble', 'dg_rubble', 'debris', 'rock'], { scale: 1.1, avoid: (x, z) => Math.abs(x - 612) < 6 });
  // the hideout under the west span
  const hide = C.B.hide = C.bld({ x: 528, z: 364, w: 9, d: 7, wall: 'corrugated', floor: 'wood', roof: 'corrugated', roofTint: 0x8a6a48, name: 'Under-Bridge Hideout',
    doors: [{ side: 'e', at: 2, w: 1.8, door: true }, { side: 's', at: 5, w: 2.2, sill: 1.0 }] });
  C.F(hide, 'raider', 0, 0, 9, 7, { tier: 2, extra: [['desk', 1], ['cabinet', 1]] });
  C.P(hide, 'dg_noticeboard', 4.5, 0.4, 0, { solid: true });
  const hide2 = C.bld({ x: 552, z: 366, w: 7, d: 6, wall: 'wood', floor: 'wood', roof: 'corrugated', roofTint: 0x7a5a3a, name: 'Lookout Shack', doors: [{ side: 'w', at: 2, w: 1.8, door: true }] });
  C.F(hide2, 'raider', 0, 0, 7, 6, { tier: 1, extra: [['cabinet', 1]] });
  w.prop('dg_tent', 545, 352, 0.3, { solid: true }); C.fire(546, 376); C.sandbags([[524, 376], [532, 380], [542, 380]]);
  C.loot(540, 366, 9, ['raider_cache', 'crate', 'backpack', 'ammo_box', 'cabinet'], 2);
  w.lamp(540, 371, { y: 3.0, color: 0xffa050, intensity: 1.4, range: 9, flicker: 0.4 });

  // ---------------- gorge floor dressing
  const onFloor = (x, z) => !C.gorgeAt(x, z) || w.groundAt(x, z) > LOW + 2 || C.distLine(x, z, RIVER_PTS) < 7.5 || C.distLine(x, z, LEDGE) < 6 || C.nearRoad(x, z, 0.5);
  C.clutter(585, 245, 60, 26, ['dg_container', 'dg_containerB', 'barrel', 'barrelBlue', 'crate', 'dg_tankS', 'dg_scaffold', 'pipe', 'dg_truck', 'dg_barrier'], { avoid: onFloor });
  C.clutter(590, 300, 70, 30, ['dg_rubble', 'rock', 'debris', 'debris', 'dg_slab', 'husk'], { scale: 1.1, avoid: onFloor });
  C.clutter(600, 420, 60, 18, ['dg_rubble', 'rock', 'debris', 'husk', 'car'], { scale: 1.1, avoid: onFloor });
  C.loot(585, 250, 55, ['crate', 'toolbox', 'arc_husk', 'trash', 'ammo_box', 'crate', 'barron_husk'], 1, { avoid: onFloor });
  C.loot(600, 410, 50, ['arc_husk', 'crate', 'trash', 'backpack'], 1, { avoid: onFloor });
  for (const [x, z] of [[540, 230], [620, 240], [560, 330], [636, 300], [600, 380], [560, 440], [640, 450]]) w.lamp(x, z, { y: 4.4, color: 0xffb070, intensity: 1.5, range: 12, flicker: 0.3 });
  for (const [x, z] of [[548, 196], [620, 196], [528, 214], [586, 218], [604, 262], [566, 262], [626, 236], [690, 236], [700, 270], [548, 316]]) C.flood(x, z, { rot: 0.5 });
  w.bridge([[596, 302], [614, 302]], 2.4, w.groundAt(596, 302) + 0.3, 'wood', { pillars: 0, thick: 0.3 });   // footbridge over the tailrace
  w.prop('dg_crane', 520, 250, 0.7, { solid: true }); C.mastLight(520, 250, 21);
}

// ==================================================================================== WEST PLATEAU (staff town)
function westPlateau(C) {
  const { w, rng } = C;
  // ---------------- Golden Handshake Villa (slightly turned): house + garage, terrace and pool on the lake side, a quay
  const G = G_VILLA;
  const vh = C.B.villa = C.gbld(G, { x: 198, z: 100, w: 18, d: 28, storeys: 2, name: 'Golden Handshake Villa', wall: 'plaster', tint: 0xeee2c8, floor: 'wood', roof: 'roofTile', roofShape: 'gable', roofTint: 0xb05a3a,
    doors: [{ side: 'e', at: 12, w: 2.2, door: true }, { side: 'w', at: 6, w: 2.0, door: true }, { side: 's', at: 8, w: 1.8, door: true },
      { side: 'e', at: 3, w: 3.2, sill: 0.9 }, { side: 'e', at: 20, w: 3.2, sill: 0.9 }, { side: 'w', at: 16, w: 2.6, sill: 1.0 }, { side: 'n', at: 7, w: 3, sill: 1.0 }],
    inner: [[0, 11, 18, 11, [{ at: 12, w: 1.8 }]], [9, 11, 9, 28, [{ at: 7, w: 1.8 }]], [0, 20, 9, 20, [{ at: 3, w: 1.6 }]],
      [0, 11, 18, 11, [{ at: 4, w: 1.8 }], 1], [9, 11, 9, 28, [{ at: 12, w: 1.6 }], 1], [9, 20, 18, 20, [{ at: 3, w: 1.6 }], 1]],
    stairs: [{ x: 1.0, z: 13.2, w: 1.6, dir: 's', from: 0, to: 1 }] });
  C.F(vh, 'living', 0, 0, 18, 11, { tier: 2, extra: [['desk', 1]] }); C.F(vh, 'kitchen', 9, 11, 18, 28, { tier: 1 }); C.F(vh, 'office', 0, 20, 9, 28, { tier: 2 }); C.P(vh, 'dg_table', 13, 18, 0, { solid: true });
  C.F(vh, 'bedroom', 0, 0, 18, 11, { tier: 2, storey: 1, extra: [['safe', 1]] }); C.F(vh, 'bedroom', 9, 11, 18, 20, { tier: 1, storey: 1 }); C.F(vh, 'living', 9, 20, 18, 28, { tier: 1, storey: 1 }); C.F(vh, 'office', 0, 11, 9, 28, { tier: 2, storey: 1 });
  const vg = C.gbld(G, { x: 196, z: 131, w: 14, d: 10, name: 'Villa Garage', wall: 'plaster', tint: 0xe2d6bc, floor: 'concrete', roof: 'roofTile', roofTint: 0xa85438,
    doors: [{ side: 's', at: 2, w: 6 }, { side: 'n', at: 10, w: 1.8, door: true }] });
  C.gprop(G, 'car', 201, 136, 0, { solid: true }); C.Cn(vg, 'car_trunk', 5, 9.2, 0, { tier: 2 }); C.Cn(vg, 'toolbox', 12.5, 2, -PI / 2, { tier: 1 }); C.IL(vg, 7, 5, 0xffd8a0, 1.2, 8);
  // terrace + pool on the lake side, a quay out over the water
  w.paintPoly('tiles', GR(G, 217, 100, 240, 128));
  w.paintPoly('concrete', GR(G, 223, 105, 237, 122));
  { const g = w.groundAt(...GW(G, 230, 113)); C.lshape(G, 224.6, 106.6, 235.4, 120.4, () => g - 1.3); w.waterPoly(GR(G, 224, 106, 236, 121), { level: g - 0.25, material: C.poolMat }); }
  for (const X of [219, 238]) for (const Z of [102, 126]) C.gprop(G, 'bush', X, Z, 0, { scale: 0.8 });
  for (const Z of [104, 112, 120]) C.gprop(G, 'dg_table', 220, Z, 0, { solid: true, scale: 0.8 });
  w.bridge([GW(G, 240, 113), GW(G, 284, 113)], 3, PLAT + 0.08, 'wood', { pillars: 0, thick: 0.4 });
  C.gblock(G, 250, 111.6, 274, 114.4, PLAT + 0.08 - RES_BED + 0.5, 'damConcrete', { y0: RES_BED - 0.5 });
  for (let X = 278; X < 284; X += 5) C.gblock(G, X - 0.25, 111.8, X + 0.25, 114.2, PLAT - 0.32 - RES_BED, 'wood', { y0: RES_BED, collide: false });
  C.gprop(G, 'dg_boat', 280, 118, 0.1, { yAbs: RES_WATER - 0.05 }); C.gprop(G, 'dg_boat', 272, 108, 2.9, { yAbs: RES_WATER - 0.05 });
  C.gfence(G, 192, 94, 241, 146, [[241, 113], [203, 146]]);
  for (const [X, Z] of [[194, 98], [240, 98], [194, 144], [238, 144]]) C.glamp(G, X, Z, { y: 3.4, color: 0xffd8a0, intensity: 1.4, range: 10 });
  for (const [X, Z] of [[220, 140], [234, 132], [228, 96], [214, 143]]) C.gprop(G, 'tree', X, Z, rng() * 6, { solid: true, scale: 1.1 });
  C.gcont(G, 'suitcase', 221, 108, 0, { tier: 2 }); C.gcont(G, 'basket', 238, 124, 0, { tier: 1 });

  // ---------------- Overdue Reservoir marina: boathouse, pier, rental boats, the Boathouse Doggy Door
  const bh = C.B.boat = C.bld({ x: 282, z: 160, w: 16, d: 11, name: 'Overdue Boat Rentals', wall: 'wood', floor: 'wood', roof: 'corrugated', roofTint: 0x4a7a8a, tint: 0xc8b8a0,
    doors: [{ side: 'n', at: 10, w: 3 }, { side: 's', at: 3, w: 2.0, door: true }, { side: 'e', at: 4, w: 2.4, sill: 1.0 }, { side: 'w', at: 4, w: 2.4, sill: 1.0 }],
    inner: [[8, 0, 8, 11, [{ at: 4, w: 1.6 }]]] });
  C.F(bh, 'commercial', 0, 0, 8, 11, { tier: 1, extra: [['desk', 1]] }); C.F(bh, 'storage', 8, 0, 16, 11, { tier: 1 });
  w.bridge([[309, 156], [309, 128]], 3.2, 12.5, 'wood', { pillars: 0, thick: 0.4 });
  w.bridge([[302, 134], [317, 134]], 3.0, 12.5, 'wood', { pillars: 0, thick: 0.4, rails: false });
  w.block(307.4, 146, 310.6, 157, 12.5 - RES_BED + 0.5, 'damConcrete', { y0: RES_BED - 0.5 });
  for (const [x, z] of [[307.8, 140], [310.2, 140], [307.8, 131], [310.2, 131], [302.5, 134], [316.5, 134]]) w.block(x - 0.25, z - 0.25, x + 0.25, z + 0.25, 12.1 - RES_BED, 'wood', { y0: RES_BED, collide: false });
  for (const [x, z, r] of [[302, 142, 1.6], [316, 146, 1.5], [298, 128, 0.2], [321, 128, -0.3], [330, 120, 2.4]]) w.prop('dg_boat', x, z, r, { yAbs: RES_WATER - 0.05 });
  w.container('suitcase', 309, 130, 0, { tier: 1, yAbs: 12.5 }); w.container('backpack', 314, 134, 0, { tier: 1, yAbs: 12.5 });
  C.hatch('boathouse_hatch', 'Boathouse Doggy Door', 322, 176, 0);
  C.lampAt(309, 129, 12.5, { y: 3.2, color: 0xffc070, intensity: 1.4, range: 10 });
  w.lamp(300, 176, { y: 3.6, color: 0xffd8a0, intensity: 1.4, range: 10 });
  C.clutter(300, 178, 10, 6, ['barrel', 'crate', 'barrelBlue', 'dg_log'], {});
  w.prop('dg_billboard2', 352, 188, 0.1, { solid: true });

  // ---------------- The Bottleneck: intake tower in the reservoir on a causeway bridge (the valve is upstairs)
  w.paintCircle('damConcrete', 420, 112, 11);
  for (let k = 0; k < 30; k++) {                                  // caisson wall round the island (open where the causeway lands)
    const a = k / 30 * 2 * PI, x = 420 + Math.cos(a) * 11.4, z = 112 + Math.sin(a) * 11.4;
    if (Math.abs(x - 419.5) < 3 && z > 112) continue;
    w.block(x - 1.25, z - 1.25, x + 1.25, z + 1.25, PLAT + 1.0 - RES_BED, 'damConcrete', { y0: RES_BED, R: rotFrame(x, z, a) });
  }
  w.bridge([[419.5, 175], [419.5, 121]], 4, PLAT + 0.12, 'concrete', { pillars: 0, thick: 0.8 });
  for (const [z0, z1] of [[162, 178], [120, 130]]) w.block(417.5, z0, 421.5, z1, PLAT + 0.12 - RES_BED + 0.5, 'damConcrete', { y0: RES_BED - 0.5 });
  for (const z of [138, 146, 154]) w.block(418.6, z - 0.7, 420.4, z + 0.7, PLAT - 0.68 - RES_BED, 'damConcrete', { y0: RES_BED, collide: false });
  for (const z of [140, 158]) C.lampAt(421.6, z, PLAT + 0.12, { y: 3.6, color: 0xe0ecff, intensity: 1.4, range: 11 });
  const bt = C.B.bneck = C.bld({ x: 413, z: 105, w: 14, d: 14, storeys: 3, floorY: PLAT + 0.1, blend: 0.5, name: 'The Bottleneck', wall: 'damConcrete', floor: 'metalPanel', tint: 0xc8c4b8, upWin: false,
    doors: [{ side: 's', at: 5.8, w: 2.4, door: true }, { side: 'w', at: 5, w: 2.4, sill: 1.1 }, { side: 'e', at: 5, w: 2.4, sill: 1.1 }, { side: 'n', at: 5.8, w: 2.4, sill: 1.1 },
      ...[1, 2].flatMap(k => [{ side: 'n', at: 2, w: 2.4, sill: 1.0, storey: k }, { side: 'e', at: 9, w: 2.4, sill: 1.0, storey: k }, { side: 'w', at: 2, w: 2.4, sill: 1.0, storey: k }, { side: 's', at: 9.5, w: 2.4, sill: 1.0, storey: k }])],
    stairs: [{ x: 1.0, z: 7.0, w: 1.6, dir: 'n', from: 0, to: 1 }, { x: 11.4, z: 2.0, w: 1.6, dir: 's', from: 1, to: 2 }], ladders: [{ x: 2.2, z: 12.4, from: 2, to: 'top', face: PI }] });
  C.P(bt, 'dg_pump', 7, 9, 0, { solid: true }); C.P(bt, 'dg_bigpipe', 7, 3, 0, { solid: true, scale: 0.6 });
  C.Cn(bt, 'toolbox', 12.6, 12.4, 0, { tier: 1 }); C.Cn(bt, 'crate', 4, 1, 0, { tier: 1 });
  C.P(bt, 'dg_valve', 7, 7, 0, { solid: true, storey: 2 }); C.P(bt, 'dg_console', 5, 0.8, 0, { solid: true, storey: 2 });   // "the valve"
  C.F(bt, 'control', 0, 0, 14, 14, { tier: 2, storey: 1, mul: 0.8 }); C.Cn(bt, 'electronics', 9, 13.2, PI, { tier: 2, storey: 2 }); C.Cn(bt, 'locker', 12.8, 6, -PI / 2, { tier: 1, storey: 2 });
  for (let k = 0; k < 3; k++) C.IL(bt, 7, 7, 0xd8ecff, 1.2, 9, 2.7, k);
  C.P(bt, 'dg_antennamast', 11, 3, 0, { yAbs: C.roofY(bt), solid: true, scale: 0.8 }); C.mastLight(...C.Wp(bt, 11, 3), C.roofY(bt) + 10);
  for (const [lx, lz] of [[-1.5, -1.5], [15.5, -1.5], [-1.5, 15.5], [15.5, 15.5]]) C.beacon(...C.Wp(bt, lx, lz), { base: PLAT + 0.1 });

  // ---------------- Ivory Tower (west end of the dam): 5 storeys, the Corner Office on top, a lobby plaza
  w.paint('concrete', 406, 206, 468, 250);
  const win4 = (side, ats) => ats.map(at => ({ side, at, w: 2.4, sill: 0.9, top: 2.9, storey: 4 }));
  const it = C.B.ivory = C.bld({ x: 422, z: 224, w: 12, d: 12, storeys: 5, floorY: PLAT, blend: 0.5, name: 'Ivory Tower', wall: 'concrete', tint: 0xf6f2ea, floor: 'tiles', roofTint: 0xe8e4dc, upWin: false,
    doors: [{ side: 's', at: 4.8, w: 2.4, door: true }, { side: 'e', at: 7.5, w: 1.8, door: true }, { side: 's', at: 0.8, w: 2.6, sill: 1.0 }, { side: 's', at: 8.6, w: 2.6, sill: 1.0 },
      ...[1, 2, 3].flatMap(k => [{ side: 's', at: 4.8, w: 2.4, sill: 1.0, storey: k }, { side: 'n', at: 4.8, w: 2.4, sill: 1.0, storey: k }, { side: 'w', at: 8.5, w: 2.2, sill: 1.0, storey: k }, { side: 'e', at: 1.5, w: 2.2, sill: 1.0, storey: k }]),
      ...win4('n', [0.8, 4.8, 8.8]), ...win4('w', [0.8, 4.8, 8.8]), ...win4('s', [0.8, 4.8]), { side: 'e', at: 0.8, w: 2.4, sill: 0.9, top: 2.9, storey: 4 }],
    inner: [[8.5, 0, 8.5, 12, [{ at: 9.2, w: 2, door: true, locked: 'control_tower' }], 4]],
    stairs: [{ x: 0.8, z: 2.5, w: 1.4, dir: 'n', from: 0, to: 1 }, { x: 9.8, z: 2.5, w: 1.4, dir: 's', from: 1, to: 2 }, { x: 0.8, z: 2.5, w: 1.4, dir: 'n', from: 2, to: 3 }, { x: 9.8, z: 2.5, w: 1.4, dir: 's', from: 3, to: 4 }] });
  // roof hatch ladder from the top landing (outside the Corner Office)
  { const [x0, z0] = C.Wp(it, 10.6, 10.9), [x1, z1] = C.Wp(it, 10.6, 9.6); w.ladder(x0, z0, C.storeyY(it, 4), x1, z1, C.roofY(it), 0); it.keep.push([4, 9.2, 9.4, 12, 12]); }
  C.P(it, 'dg_desk', 3, 1.2, 0, { solid: true }); C.P(it, 'dg_sofa', 2.5, 10.8, PI, { solid: true }); C.P(it, 'dg_vending', 6.5, 11.4, PI, { solid: true });
  C.Cn(it, 'desk', 5.5, 1.2, 0, { tier: 1 }); C.Cn(it, 'cabinet', 0.6, 2, PI / 2, { tier: 1, storey: 1 }); C.Cn(it, 'desk', 5, 1, 0, { tier: 1, storey: 2 }); C.Cn(it, 'cabinet', 5, 11.3, PI, { tier: 1, storey: 3 });
  C.Cn(it, 'locker', 5.5, 11.3, PI, { tier: 1, storey: 1 }); C.Cn(it, 'ammo_box', 6, 0.8, 0, { tier: 1, storey: 2 });
  for (let k = 0; k < 4; k++) C.IL(it, 6, 6, 0xfff0d0, 1.2, 8, 2.7, k);
  C.F(it, 'office', 0, 0, 8.5, 12, { tier: 3, storey: 4, room: 'control_tower', extra: [['safe', 1], ['security_locker', 1], ['weapon_case', 1], ['electronics', 1]], li: 1.4 });
  C.K(it, 'control_tower', 0, 0, 8.5, 12, 'The Corner Office', 4);
  const tr = C.roofY(it);
  C.P(it, 'dg_antennamast', 2, 2, 0, { yAbs: tr, solid: true, scale: 0.8 }); C.P(it, 'dg_satdish', 3, 9.5, 0.6, { yAbs: tr, solid: true, scale: 0.8 });
  { const [x, z] = C.Wp(it, 2, 2); C.lampAt(x, z, tr + 9, { y: 0.4, model: null, color: 0xff3020, intensity: 0.8, range: 6, flicker: 0.6 }); }
  { const [x, z] = C.Wp(it, 4, 6); C.lampAt(x, z, C.storeyY(it, 4), { y: 2.6, model: null, color: 0x9ae8ff, intensity: 1.2, range: 10 }); }
  for (const [x, z] of [[414, 214], [442, 214], [414, 244], [442, 244]]) w.prop('dg_planter', x, z, 0, { solid: true });
  for (const x of [424, 428, 432]) w.prop('dg_flagpole', x, 240.5, 0, { solid: true });
  for (const [x, z, r] of [[412, 220, 0], [412, 226, 0], [446, 224, PI], [420, 246, PI / 2], [438, 246, PI / 2]]) w.prop('dg_bench', x, z, r, { solid: true });
  w.prop('dg_huskbig', 456, 244, 0.6, { solid: true });   // corporate art: "Disruption" (a decommissioned ARK)
  for (const [x, z] of [[409, 236], [463, 220]]) w.prop('bush', x, z, 0, { scale: 1.2 });
  for (const [x, z] of [[408, 208], [466, 210], [408, 248], [460, 248]]) C.flood(x, z, { rot: 0.4 });
  const gate = C.bld({ x: 436, z: 209, w: 6, d: 5, wall: 'concrete', floor: 'tiles', roof: 'metalPanel', roofTint: 0xd8a020, name: 'Dam Gatehouse',
    doors: [{ side: 's', at: 2, w: 1.8, door: true }, { side: 'n', at: 1, w: 3, sill: 1.0 }, { side: 'e', at: 1.4, w: 2.2, sill: 1.0 }] });
  C.Cn(gate, 'security_locker', 4.8, 4.2, PI, { tier: 2 }); C.Cn(gate, 'desk', 1.4, 1.2, 0, { tier: 1 }); C.IL(gate, 3, 2.5, 0xfff0c0, 1.2, 7);
  for (const x of [447, 457]) w.prop('dg_barrier', x, 210, 0, { solid: true });
  for (const [x, z, r, k] of [[412, 232, 0.1, 'car'], [452, 240, 1.6, 'car'], [462, 230, 0.2, 'dg_truck']]) { w.prop(k, x, z, r, { solid: true }); }
  w.container('car_trunk', 412, 235, 0, { tier: 1 });

  // ---------------- Department of Synergy (head office): 2 storeys, Lab 1 upstairs above the reception
  const ds = C.B.synergy = C.bld({ x: 288, z: 222, w: 48, d: 36, storeys: 2, floorY: PLAT, blend: 0.5, name: 'Department of Synergy', wall: 'concrete', tint: 0xe6e0d2, floor: 'tiles', roofTint: 0xc8c8c0,
    doors: [{ side: 's', at: 22.8, w: 2.4, door: true }, { side: 'n', at: 6, w: 2.0, door: true }, { side: 'w', at: 18, w: 1.8, door: true }, { side: 'e', at: 18, w: 1.8, door: true },
      { side: 's', at: 4, w: 3, sill: 1.1 }, { side: 's', at: 10, w: 3, sill: 1.1 }, { side: 's', at: 33, w: 3, sill: 1.1 }, { side: 's', at: 40, w: 3, sill: 1.1 },
      { side: 'n', at: 14, w: 3, sill: 1.1 }, { side: 'n', at: 26, w: 3, sill: 1.1 }, { side: 'n', at: 38, w: 3, sill: 1.1 }, { side: 'e', at: 6, w: 3, sill: 1.1 }, { side: 'e', at: 28, w: 3, sill: 1.1 }, { side: 'w', at: 6, w: 3, sill: 1.1 }, { side: 'w', at: 28, w: 3, sill: 1.1 }],
    inner: [[0, 16, 48, 16, [{ at: 7, w: 1.8 }, { at: 22, w: 1.8 }, { at: 38, w: 1.8 }]], [0, 20, 48, 20, [{ at: 6, w: 1.8, door: true, locked: 'staff_room' }, { at: 19, w: 2.4 }, { at: 26.6, w: 2.4 }, { at: 40, w: 1.8 }]],
      [16, 0, 16, 16, []], [30, 0, 30, 16, []], [14, 20, 14, 36, []], [34, 20, 34, 36, []],
      [0, 16, 48, 16, [{ at: 7, w: 1.8 }, { at: 38, w: 1.8 }], 1], [0, 20, 48, 20, [{ at: 6, w: 1.8 }, { at: 22, w: 2.4 }, { at: 40, w: 1.8 }], 1], [24, 0, 24, 16, [{ at: 6, w: 1.8 }], 1], [14, 20, 14, 36, [{ at: 8, w: 1.8 }], 1], [34, 20, 34, 36, [{ at: 8, w: 1.8 }], 1]],
    stairs: [{ x: 15.2, z: 23.6, w: 1.8, dir: 'n', from: 0, to: 1 }], ladders: [{ side: 'e', at: 32 }],
    roofExtras: [[4, 4, 12, 10, 1.4], [36, 26, 44, 32, 1.4]] });
  C.F(ds, 'lab', 0, 0, 16, 16, { tier: 2 });                                   // Lab 2
  C.F(ds, 'server', 16, 0, 30, 16, { tier: 2 }); C.F(ds, 'office', 30, 0, 48, 16, { tier: 2, extra: [['desk', 1]] });   // the Synergy Room
  C.F(ds, 'bunk', 0, 20, 14, 36, { tier: 3, room: 'staff_room', extra: [['security_locker', 1], ['fridge', 1], ['medical_bag', 1]] });
  C.K(ds, 'staff_room', 0, 20, 14, 36, 'Mandatory Fun Room');
  C.F(ds, 'office', 14, 20, 34, 36, { tier: 1, mul: 0.7 });                    // reception
  C.P(ds, 'dg_noticeboard', 24, 20.4, 0, { solid: true }); C.P(ds, 'dg_vending', 32.8, 34.8, PI, { solid: true });
  C.F(ds, 'office', 34, 20, 48, 36, { tier: 2 });                              // mail room
  C.F(ds, 'office', 0, 0, 24, 16, { tier: 2, storey: 1 }); C.F(ds, 'office', 24, 0, 48, 16, { tier: 2, storey: 1, extra: [['safe', 1]] });   // open plan + the corner office (sadly not that one)
  C.F(ds, 'commercial', 0, 16, 48, 20, { tier: 1, storey: 1, light: false });
  C.F(ds, 'bunk', 0, 20, 14, 36, { tier: 1, storey: 1 }); C.F(ds, 'lab', 14, 20, 34, 36, { tier: 2, storey: 1, extra: [['electronics', 1]] });   // Lab 1 (above the reception)
  C.F(ds, 'medical', 34, 20, 48, 36, { tier: 2, storey: 1 });
  C.P(ds, 'dg_sign', 24, 38.4, PI, { solid: true });
  C.P(ds, 'dg_satdish', 42, 6, 2.4, { yAbs: C.roofY(ds), solid: true }); C.P(ds, 'dg_satdish', 42, 12, 2.0, { yAbs: C.roofY(ds), solid: true, scale: 0.7 });
  w.paint('concrete', 296, 258, 330, 272); w.paint('asphalt', 340, 226, 356, 262);
  for (let k = 0; k < 4; k++) { const z = 229 + k * 8.5; w.prop('car', 348, z, PI / 2 + (rng() - 0.5) * 0.3, { solid: true }); if (k % 2) w.container('car_trunk', 345, z, 0, { tier: 1 }); }
  for (const [x, z] of [[292, 268], [332, 268], [286, 218], [338, 218]]) C.flood(x, z, { rot: 0.2 });

  // ---------------- Shoebox Flats: two 3-storey blocks round a courtyard, garages
  const flats = (z0, nm) => {
    const bb = C.bld({ x: 66, z: z0, w: 36, d: 14, storeys: 3, name: nm, wall: 'brick', tint: 0xd8c8b0, floor: 'wood', roofTint: 0x8a7a68,
      doors: [{ side: 's', at: 16.8, w: 2.4, door: true }, { side: 'n', at: 16.8, w: 2.4, door: true }, { side: 's', at: 4, w: 2.6, sill: 1.0 }, { side: 's', at: 10, w: 2.6, sill: 1.0 }, { side: 's', at: 23, w: 2.6, sill: 1.0 }, { side: 's', at: 29, w: 2.6, sill: 1.0 },
        { side: 'n', at: 5, w: 2.6, sill: 1.0 }, { side: 'n', at: 28, w: 2.6, sill: 1.0 }, { side: 'w', at: 5, w: 2.4, sill: 1.0 }, { side: 'e', at: 5, w: 2.4, sill: 1.0 }],
      inner: [0, 1, 2].flatMap(k => [[14, 0, 14, 14, [{ at: 6, w: 1.6, door: true }], k], [22, 0, 22, 14, [{ at: 6, w: 1.6, door: true }], k], [0, 7, 14, 7, [{ at: 9, w: 1.6 }], k], [22, 7, 36, 7, [{ at: 3, w: 1.6 }], k]]),
      stairs: [{ x: 15.0, z: 6.5, w: 1.6, dir: 'n', from: 0, to: 1 }, { x: 19.4, z: 1.4, w: 1.6, dir: 's', from: 1, to: 2 }], ladders: [{ side: 'w', at: 10 }] });
    for (let k = 0; k < 3; k++) {
      C.F(bb, k === 1 ? 'bedroom' : 'living', 0, 0, 14, 7, { tier: 1, storey: k, extra: [['cabinet', 1]] }); C.F(bb, 'kitchen', 0, 7, 14, 14, { tier: 1, storey: k });
      C.F(bb, 'bedroom', 22, 0, 36, 7, { tier: 1, storey: k, extra: [['desk', 1]] }); C.F(bb, k === 2 ? 'storage' : 'living', 22, 7, 36, 14, { tier: 1, storey: k });
    }
    return bb;
  };
  C.B.flatsA = flats(206, 'Shoebox Flats A'); C.B.flatsB = flats(250, 'Shoebox Flats B');
  w.paint('gravel', 66, 220, 102, 250);
  for (const [x, z] of [[72, 232], [92, 232], [82, 240]]) w.prop('dg_table', x, z, 0, { solid: true });
  C.clutter(84, 235, 14, 8, ['barrel', 'crate', 'bush', 'dg_tent', 'car'], {});
  const gar = C.bld({ x: 108, z: 250, w: 16, d: 8, name: 'Flats Garages', wall: 'concrete', floor: 'concrete', roof: 'corrugated',
    doors: [{ side: 'w', at: 2, w: 3.5 }, { side: 's', at: 2, w: 3.5 }, { side: 's', at: 9, w: 3.5 }], inner: [[8, 0, 8, 8, [{ at: 3, w: 1.6 }]]] });
  C.F(gar, 'storage', 0, 0, 8, 8, { tier: 1, light: false }); C.F(gar, 'workshop', 8, 0, 16, 8, { tier: 1 });
  for (const [x, z] of [[64, 202], [104, 202], [64, 268], [104, 268], [84, 246]]) w.lamp(x, z, { y: 4, color: 0xffc078, intensity: 1.5, range: 12 });

  // ---------------- the Show Home cul-de-sac (turned): three model homes + the Show Home with its roof antenna
  const S = G_SHOW;
  w.paintPoly('asphalt', Array.from({ length: 16 }, (_, i) => GW(S, 196 + Math.cos(i / 16 * 2 * PI) * 10, 376 + Math.sin(i / 16 * 2 * PI) * 10)));
  w.path([GW(S, 196, 366), GW(S, 196, 344)], 6, 'asphalt');
  const house = (X, Z, ww, dd, nm, tint, roofTint, door) => {
    const bb = C.gbld(S, { x: X, z: Z, w: ww, d: dd, storeys: 2, name: nm, wall: 'plaster', tint, floor: 'wood', roof: 'roofTile', roofShape: 'gable', roofTint,
      doors: [{ side: door, at: ww / 2 - 1, w: 1.8, door: true }, { side: door === 's' ? 'n' : 's', at: 2, w: 2.4, sill: 1.0 }, { side: 'e', at: 3, w: 2.4, sill: 1.0 }, { side: 'w', at: dd - 5, w: 2.4, sill: 1.0 }],
      inner: [[ww / 2, 0, ww / 2, dd, [{ at: dd / 2 - 1, w: 1.6 }]], [ww / 2, 0, ww / 2, dd, [{ at: 2, w: 1.6 }], 1]], stairs: [{ x: 0.9, z: dd - 6.3, w: 1.5, dir: 'n', from: 0, to: 1 }] });
    C.F(bb, 'living', ww / 2, 0, ww, dd, { tier: 1 }); C.F(bb, 'kitchen', 0, 0, ww / 2, dd - 7, { tier: 1 });
    C.F(bb, 'bedroom', 0, 0, ww / 2, dd, { tier: 1, storey: 1 }); C.F(bb, 'bedroom', ww / 2, 0, ww, dd, { tier: 1, storey: 1, extra: [['desk', 1]] });
    return bb;
  };
  house(172, 356, 13, 11, 'Model Home "Starter"', 0xe8dcc0, 0x8a5a3a, 'e');
  house(207, 356, 13, 11, 'Model Home "Upsell"', 0xd8e0e8, 0x5a6a8a, 'w');
  house(166, 382, 13, 12, 'Model Home "Bubble"', 0xe8d0d0, 0x8a4a4a, 'e');
  const sh = C.B.show = C.gbld(S, { x: 202, z: 384, w: 18, d: 13, storeys: 2, name: 'The Show Home', wall: 'plaster', tint: 0xf4f0e4, floor: 'wood', roof: 'roofTar', roofTint: 0x6a6a70,
    doors: [{ side: 'n', at: 4, w: 2.0, door: true }, { side: 'w', at: 6, w: 1.8, door: true }, { side: 's', at: 3, w: 3, sill: 0.9 }, { side: 's', at: 11, w: 3, sill: 0.9 }, { side: 'e', at: 5, w: 2.4, sill: 1.0 }, { side: 'n', at: 11, w: 3, sill: 1.0 }],
    inner: [[9, 0, 9, 13, [{ at: 4, w: 1.8 }]], [9, 6.5, 18, 6.5, [{ at: 3, w: 1.6 }]], [9, 0, 9, 13, [{ at: 9, w: 1.8 }], 1]],
    stairs: [{ x: 0.9, z: 6.6, w: 1.5, dir: 'n', from: 0, to: 1 }], ladders: [{ side: 'e', at: 10 }] });
  C.F(sh, 'living', 9, 0, 18, 6.5, { tier: 2, extra: [['cabinet', 1]] }); C.F(sh, 'office', 9, 6.5, 18, 13, { tier: 2 }); C.F(sh, 'kitchen', 3, 0, 9, 6, { tier: 1 });
  C.P(sh, 'dg_switch', 0.5, 2.0, PI / 2, { solid: true }); C.P(sh, 'dg_fusebox', 0.5, 4.2, PI / 2, { solid: true });   // the power switch
  C.F(sh, 'bedroom', 0, 0, 9, 13, { tier: 2, storey: 1, extra: [['safe', 1]] }); C.F(sh, 'office', 9, 0, 18, 13, { tier: 2, storey: 1 });
  C.P(sh, 'dg_antennamast', 14, 9, 0, { yAbs: C.roofY(sh), solid: true, scale: 0.7 }); C.P(sh, 'crate', 12, 4, 0, { yAbs: C.roofY(sh), solid: true });
  C.gprop(S, 'dg_sign', 196, 364, 0, { solid: true });
  for (const [X, Z] of [[185, 368], [207, 368], [188, 392], [214, 401]]) C.glamp(S, X, Z, { y: 3.4, color: 0xffd8a0, intensity: 1.4, range: 10 });
  for (const [X, Z] of [[162, 352], [228, 352], [160, 400], [226, 404], [180, 404], [196, 352]]) C.gprop(S, 'tree', X, Z, rng() * 6, { solid: true });
  for (const [X, Z] of [[187, 352], [214, 382], [176, 378]]) C.gprop(S, 'car', X, Z, rng() * 6, { solid: true });
  C.gcont(S, 'car_trunk', 189, 352.5, 0, { tier: 1 }); C.gcont(S, 'trash', 200, 368, 0, { tier: 1 }); C.gcont(S, 'trash', 190, 384, 0, { tier: 1 });

  // ---------------- Middle Management Row (cottages along the staff lane) + the Synergy Cafeteria
  for (const [x, z, rot, nm, tint] of [[160, 202, 0.1, 'Cottage "Synergy"', 0xe0d4b8], [170, 226, -0.05, 'Cottage "Bandwidth"', 0xd4dce0], [162, 250, 0.08, 'Cottage "Circle Back"', 0xe4d0c4]]) {
    const bb = C.bld({ x, z, w: 12, d: 9, rot, name: nm, wall: 'plaster', tint, floor: 'wood', roof: 'roofTile', roofShape: 'gable', roofTint: 0x8a5040,
      doors: [{ side: 'w', at: 3, w: 1.8, door: true }, { side: 's', at: 7, w: 2.4, sill: 1.0 }, { side: 'n', at: 3, w: 2.4, sill: 1.0 }, { side: 'e', at: 3, w: 2.2, sill: 1.0 }],
      inner: [[6, 0, 6, 9, [{ at: 3, w: 1.6 }]]] });
    C.F(bb, 'living', 0, 0, 6, 9, { tier: 1, extra: [['cabinet', 1]] }); C.F(bb, 'bedroom', 6, 0, 12, 9, { tier: 1 });
    C.P(bb, 'bush', -1.5, 2, 0); C.P(bb, 'bush', -1.5, 7, 0);
  }
  const caf = C.bld({ x: 288, z: 278, w: 24, d: 13, name: 'Synergy Cafeteria', wall: 'plaster', tint: 0xe8dcc8, floor: 'tiles', roofTint: 0x9a6a4a,
    doors: [{ side: 'n', at: 10.8, w: 2.4, door: true }, { side: 'e', at: 4, w: 2.0, door: true }, { side: 's', at: 3, w: 3.2, sill: 0.9 }, { side: 's', at: 10, w: 3.2, sill: 0.9 }, { side: 'w', at: 4, w: 2.6, sill: 0.9 }],
    inner: [[16, 0, 16, 13, [{ at: 5, w: 1.8 }]]] });
  C.F(caf, 'commercial', 0, 0, 16, 13, { tier: 1, extra: [['fridge', 1]] }); C.F(caf, 'kitchen', 16, 0, 24, 13, { tier: 1, extra: [['fridge', 1]] });
  for (const [lx, lz] of [[4, 6.5], [9, 6.5], [4, 10], [9, 10]]) C.P(caf, 'dg_table', lx, lz, 0, { solid: true });

  // ---------------- odds and ends: the west Supply Shack, Elevator Pitch, a bus stop, picnic site
  C.fieldDepot(388, 366, 0);
  C.lift('elevator_pitch', 'Elevator Pitch', 48, 296, 0);
  const stop = C.bld({ x: 150, z: 346, w: 7, d: 3, wall: 'metalPanel', floor: 'concrete', roof: 'metalPanel', roofTint: 0x4a8ab0, name: 'Bus Stop', doors: [{ side: 'n', at: 0.6, w: 5.8 }] });
  C.Cn(stop, 'trash', 1, 2, 0, { tier: 1 }); C.Cn(stop, 'suitcase', 5.5, 2, 0, { tier: 1 });
  for (const [x, z] of [[250, 300], [262, 306], [244, 312]]) w.prop('dg_table', x, z, rng(), { solid: true });
  C.loot(255, 306, 10, ['basket', 'backpack', 'trash'], 1);
}

// ==================================================================================== EAST PLATEAU
function eastPlateau(C) {
  const { w, rng } = C;
  // ---------------- Floodgates: the gate deck over the chute head, radial gates, the control house, the intake
  w.bridge([[711, 196.5], [743, 196.5]], 6, PLAT + 0.02, 'damConcrete', { pillars: 0, thick: 0.8, rails: true });
  for (const x of [723.5, 730.5]) w.prop('dg_floodgate', x, 191.8, 0, { solid: true, yAbs: RES_WATER - 1.2 });
  for (const x of [718, 736]) C.beacon(x, 201, { base: PLAT });
  const fc = C.B.fctrl = C.bld({ x: 776, z: 207, w: 20, d: 16, storeys: 2, floorY: PLAT, blend: 0.5, name: 'Floodgate Control', wall: 'concrete', tint: 0xe8e0d0, floor: 'metalPanel',
    doors: [{ side: 'w', at: 10, w: 2.2, door: true }, { side: 's', at: 14, w: 2.2, door: true }, { side: 'n', at: 4, w: 3, sill: 1.1 }, { side: 'n', at: 13, w: 3, sill: 1.1 }, { side: 'e', at: 5, w: 3, sill: 1.1 },
      { side: 'w', at: 2, w: 3, sill: 1.0, storey: 1 }, { side: 'n', at: 8, w: 4, sill: 1.0, storey: 1 }],
    inner: [[11, 0, 11, 16, [{ at: 10, w: 1.8 }]], [11, 0, 11, 16, [{ at: 3, w: 1.8 }], 1]],
    stairs: [{ x: 13, z: 1.4, w: 1.6, dir: 's', from: 0, to: 1 }], ladders: [{ side: 'e', at: 12 }] });
  C.F(fc, 'control', 0, 0, 11, 16, { tier: 2 }); C.F(fc, 'workshop', 11, 0, 20, 16, { tier: 1 });
  C.F(fc, 'control', 0, 0, 11, 16, { tier: 2, storey: 1, extra: [['electronics', 1]] }); C.F(fc, 'office', 11, 0, 20, 16, { tier: 2, storey: 1 });
  // the intake platform where the town's water supply leaves the reservoir
  w.bridge([[748, 186], [744, 172]], 5, PLAT - 0.6, 'metalPanel', { pillars: 0, thick: 0.4 });
  w.block(745.2, 178.5, 750.4, 187, PLAT - 0.6 - RES_BED + 0.5, 'concrete', { y0: RES_BED - 0.5, rot: -0.28 });
  C.rampLine([[750, 193], [748, 186]], 5, PLAT, PLAT - 0.62, 1);
  w.prop('dg_spillgrate', 744, 170, 0, { yAbs: RES_WATER - 1 }); w.prop('dg_pump', 742, 176, PI / 2, { solid: true, yAbs: PLAT - 0.6 }); w.prop('dg_valve', 747, 174, 0, { solid: true, yAbs: PLAT - 0.6 });
  C.lampAt(749, 178, PLAT - 0.6, { y: 3.2, color: 0xe0ecff, intensity: 1.4, range: 10 });
  for (const [x, z] of [[740, 226], [760, 228], [798, 206]]) C.flood(x, z, { rot: 0.3 });
  C.clutter(754, 214, 9, 6, ['barrel', 'barrelBlue', 'crate', 'dg_tankS'], {});

  // ---------------- The Paywall: a walled compound around a vault building (the vault needs a key, obviously)
  const P0 = frame(0, 0, 0);
  C.compound(P0, 776, 232, 856, 292, 3.4, 'concrete', [['s', 40], ['w', 30], ['e', 46]]);
  w.paint('concrete', 777, 233, 855, 291);
  const pw = C.B.paywall = C.bld({ x: 790, z: 240, w: 50, d: 30, storeys: 2, storeyH: 3.6, innerH: 3.6, floorY: PLAT, blend: 0.5, name: 'The Paywall', wall: 'concrete', tint: 0xb8b8b4, floor: 'metalPanel', roofTint: 0x7a7a80,
    doors: [{ side: 's', at: 23.8, w: 2.4, door: true }, { side: 'w', at: 22, w: 1.8, door: true }, { side: 'e', at: 22, w: 1.8, door: true }, { side: 's', at: 6, w: 3, sill: 1.2 }, { side: 's', at: 41, w: 3, sill: 1.2 }, { side: 'n', at: 6, w: 3, sill: 1.6 }, { side: 'n', at: 41, w: 3, sill: 1.6 }],
    inner: [[0, 18, 50, 18, [{ at: 5, w: 2, door: true }, { at: 23.8, w: 2.4, door: true, locked: 'controlled_access_zone' }, { at: 43, w: 2, door: true }]], [15, 0, 15, 18, []], [35, 0, 35, 18, []],
      [0, 18, 50, 18, [{ at: 6, w: 2 }, { at: 42, w: 2 }], 1], [15, 0, 15, 18, [{ at: 8, w: 1.8 }], 1], [35, 0, 35, 18, [{ at: 8, w: 1.8 }], 1], [25, 18, 25, 30, [{ at: 5, w: 1.8 }], 1]],
    stairs: [{ x: 1.2, z: 20.4, w: 1.8, dir: 'e', from: 0, to: 1 }], ladders: [{ side: 'n', at: 25 }],
    roofExtras: [[4, 4, 10, 10, 1.4], [40, 20, 46, 26, 1.0]] });
  C.F(pw, 'server', 0, 0, 15, 18, { tier: 2 });
  C.F(pw, 'vault', 15, 0, 35, 18, { tier: 3, room: 'controlled_access_zone', extra: [['weapon_case', 1], ['raider_cache', 1]], li: 1.2 });
  C.K(pw, 'controlled_access_zone', 15, 0, 35, 18, 'Premium Content Vault');
  C.F(pw, 'office', 35, 0, 50, 18, { tier: 2, extra: [['cabinet', 1]] });   // records
  C.P(pw, 'dg_puzzle', 25.2, 18.3, 0, { y: 2.3 });
  for (const [lx, lz, k, r] of [[12, 26.5, 'dg_desk', PI], [38, 26.5, 'dg_desk', PI], [25, 21.2, 'dg_console', 0], [45, 28.5, 'dg_vending', PI], [21, 28.5, 'dg_sofa', PI]]) C.P(pw, k, lx, lz, r, { solid: true });
  C.Cn(pw, 'security_locker', 48.8, 24, -PI / 2, { tier: 2 }); C.Cn(pw, 'desk', 15, 26.6, PI, { tier: 1 }); C.Cn(pw, 'electronics', 33, 28.6, PI, { tier: 2 });
  C.IL(pw, 25, 24, 0xd0e8ff, 1.0, 12, 3.2);
  C.F(pw, 'security', 0, 0, 15, 18, { tier: 2, storey: 1 }); C.F(pw, 'control', 15, 0, 35, 18, { tier: 2, storey: 1 }); C.F(pw, 'office', 35, 0, 50, 18, { tier: 2, storey: 1 });
  C.F(pw, 'commercial', 0, 18, 25, 30, { tier: 1, storey: 1, mul: 0.7 }); C.F(pw, 'medical', 25, 18, 50, 30, { tier: 2, storey: 1 });
  // turnstile booths at the gate ("subscribe to continue"), guard tower, sandbags
  for (const x of [811, 822]) { const tb = C.bld({ x, z: 284, w: 3.6, d: 3, wall: 'metalPanel', floor: 'concrete', roof: 'metalPanel', roofTint: 0xd8a020, name: 'Turnstile Booth', doors: [{ side: 'n', at: 0.8, w: 2 }] }); C.Cn(tb, 'cabinet', 1.8, 2.4, PI, { tier: 1 }); }
  w.prop('dg_watchtower', 852, 236, 0, { solid: true }); w.prop('dg_watchtower', 780, 288, 0, { solid: true });
  C.sandbags([[806, 296], [812, 300], [820, 300], [826, 296]]);
  for (const [x, z] of [[778, 234], [854, 290], [854, 234], [778, 290]]) C.flood(x, z, { rot: 0.8 });
  C.clutter(816, 280, 12, 5, ['dg_barrier', 'crate', 'barrel'], {});
  w.prop('dg_sign', 816, 297, 0, { solid: true });

  // ---------------- The Kale Bubble: three greenhouse domes, polytunnels and a lab with the data archive
  const domes = [[886, 268], [914, 296], [884, 318]];
  for (const [cx, cz] of domes) {
    C.ring(cx, cz, 7.2, 1.1, 'concrete', [PI / 2, -PI / 2], 1.5);
    w.prop('dg_dome', cx, cz, 0, {});
    w.paintCircle('tiles', cx, cz, 7);
    for (const [dx, dz, r] of [[-3, -2, 0], [3, -2, 0], [-3, 2.5, 0], [3, 2.5, 0]]) w.prop('dg_hydrorack', cx + dx, cz + dz, r, { solid: true });
    w.container('plant', cx, cz - 4.4, 0, { tier: 1 }); w.container('plant', cx - 4.6, cz, 0, { tier: 1 }); w.container('basket', cx + 4.4, cz + 1, 0, { tier: 1 });
    w.lamp(cx, cz, { y: 3.4, model: null, color: 0xe0a0ff, intensity: 1.5, range: 10 });
  }
  // the data archive lives in the middle dome
  w.prop('dg_server', 912, 299.5, 0, { solid: true }); w.prop('dg_console', 916, 299.5, 0, { solid: true }); w.container('electronics', 914, 293, 0, { tier: 2 });
  for (let k = 0; k < 4; k++) { const z = 264 + k * 8; w.prop('dg_arch', 936, z, 0, {}); w.prop('dg_planter', 936, z, 0, { solid: true }); if (k % 2) w.container('plant', 938, z + 2, 0, { tier: 1 }); }
  const kl = C.B.kale = C.bld({ x: 946, z: 262, w: 18, d: 14, storeys: 2, name: 'Microgreens Lab', wall: 'plaster', tint: 0xe8ece0, floor: 'tiles', roofTint: 0x5a8a5a,
    doors: [{ side: 'w', at: 6, w: 2.2, door: true }, { side: 's', at: 12, w: 2.0, door: true }, { side: 'n', at: 4, w: 3, sill: 1.0 }, { side: 'e', at: 5, w: 3, sill: 1.0 }],
    inner: [[9, 0, 9, 14, [{ at: 9, w: 1.8 }]], [9, 0, 9, 14, [{ at: 3, w: 1.8 }], 1]], stairs: [{ x: 6.6, z: 1.2, w: 1.6, dir: 's', from: 0, to: 1 }] });
  C.F(kl, 'greenhouse', 0, 0, 9, 14, { tier: 1 }); C.F(kl, 'lab', 9, 0, 18, 14, { tier: 2 });
  C.F(kl, 'lab', 9, 0, 18, 14, { tier: 2, storey: 1 }); C.F(kl, 'office', 0, 6, 9, 14, { tier: 1, storey: 1 });
  C.fenceRect(870, 252, 968, 332, [[870, 290], [920, 332], [968, 300], [900, 252]]);
  w.path([[886, 276], [900, 296], [914, 296]], 2.4, 'gravel'); w.path([[884, 310], [900, 296]], 2.4, 'gravel'); w.path([[920, 296], [946, 272]], 2.4, 'gravel'); w.path([[914, 304], [920, 330]], 2.4, 'gravel');
  for (const [x, z] of [[874, 262], [874, 300], [904, 258], [956, 300], [956, 320], [930, 322]]) w.prop('dg_planter', x, z, 0, { solid: true });
  C.clutter(924, 312, 14, 8, ['barrel', 'crate', 'barrelBlue', 'dg_tent'], { avoid: (x, z) => [[886, 268], [914, 296], [884, 318]].some(([a, b]) => Math.hypot(x - a, z - b) < 9) || x > 944 });
  for (const [x, z] of [[872, 254], [966, 330]]) C.flood(x, z);
  C.loot(918, 292, 40, ['plant', 'basket', 'crate', 'trash'], 1, { avoid: (x, z) => domes.some(([a, b]) => Math.hypot(x - a, z - b) < 8.5) });

  // ---------------- Impound Lot: the ARK's repossessed cars, stacked; the repo office
  C.fenceRect(880, 178, 960, 228, [[920, 228], [880, 200]]);
  w.paint('asphalt', 881, 179, 959, 227);
  let car = 0;
  for (let x = 888; x < 956; x += 6) for (const z of [186, 198, 210, 220]) {
    if ((x > 930 && z < 195) || C.chance(0.18)) continue;
    const k = C.chance(0.2) ? 'dg_truck' : 'car', r = (z === 198 || z === 220 ? PI / 2 : -PI / 2) + (rng() - 0.5) * 0.2;
    w.prop(k, x, z, r, { solid: true });
    if (k === 'car' && C.chance(0.35)) w.prop('car', x, z, r + (rng() - 0.5) * 0.3, { yAbs: w.groundAt(x, z) + 1.35 });
    if (++car % 4 === 0) w.container('car_trunk', x + 2.6, z, 0, { tier: 1 });
  }
  const ro = C.B.repo = C.bld({ x: 934, z: 180, w: 20, d: 10, name: 'Repo Office', wall: 'metalPanel', floor: 'tiles', roof: 'metalPanel', roofTint: 0xc04030, tint: 0xd8d8d0,
    doors: [{ side: 's', at: 4, w: 2.0, door: true }, { side: 'w', at: 4, w: 2.2 }, { side: 's', at: 12, w: 3, sill: 1.0 }], inner: [[10, 0, 10, 10, [{ at: 4, w: 1.8 }]]] });
  C.F(ro, 'office', 0, 0, 10, 10, { tier: 2, extra: [['cabinet', 1]] }); C.F(ro, 'security', 10, 0, 20, 10, { tier: 2 });
  w.prop('dg_truck', 900, 235, PI / 2, { solid: true }); w.prop('arcCrate', 884, 222, 0, { solid: true }); w.prop('arcCrate', 887, 224, 0.4, { solid: true });
  w.container('arc_crate', 890, 222, 0, { tier: 2 });
  for (const [x, z] of [[882, 180], [958, 226], [958, 180]]) C.flood(x, z, { rot: 0.5 });

  // ---------------- The Eastside Squat (raider camp on the hill shoulder)
  const shack = (x, z, ww, d, nm, type, tier, extra = []) => {
    const bb = C.bld({ x, z, w: ww, d, wall: 'corrugated', floor: 'wood', roof: 'corrugated', roofTint: 0xa88060, name: nm, blend: 1.5,
      doors: [{ side: 's', at: 2, w: 1.8 }, { side: 'e', at: 2, w: 2, sill: 1.0 }] });
    C.F(bb, type, 0, 0, ww, d, { tier, extra });
    return bb;
  };
  C.B.squat = shack(992, 200, 11, 8, 'Squat HQ', 'raider', 2, [['desk', 1], ['cabinet', 1]]);
  shack(1010, 214, 9, 7, 'Squat Bunkhouse', 'bunk', 1, [['cabinet', 1]]);
  shack(1030, 198, 10, 8, 'Squat Workshop', 'workshop', 2);
  shack(1036, 228, 8, 7, 'Squat Larder', 'kitchen', 1);
  w.prop('dg_watchtower', 1050, 214, 0.2, { solid: true });
  for (const [x, z, r] of [[996, 236, 0.3], [1020, 242, -0.2], [1046, 244, 0.1]]) w.prop('dg_tent', x, z, r, { solid: true });
  C.sandbags([[988, 230], [988, 246], [998, 252]]); C.sandbags([[1054, 236], [1058, 250]]);
  C.fire(1016, 232);
  C.loot(1018, 228, 18, ['raider_cache', 'ammo_box', 'crate', 'backpack', 'medical_bag', 'weapon_case', 'cabinet'], 2);
  for (const [x, z] of [[1000, 226], [1034, 222]]) w.lamp(x, z, { y: 3.0, color: 0xffa050, intensity: 1.4, range: 9, flicker: 0.4 });

  // ---------------- Golden Parachute Lift + the east Supply Shack
  C.lift('golden_parachute_lift', 'Golden Parachute Lift', 1064, 272, 0);
  C.fieldDepot(944, 396, 0);

  // ---------------- Customer Retention Center (where the ARK keep the customers who tried to leave)
  const cr = C.B.retain = C.bld({ x: 856, z: 362, w: 28, d: 18, storeys: 2, name: 'Customer Retention Center', wall: 'concrete', tint: 0xc8ccd0, floor: 'tiles', roofTint: 0x6a7a8a,
    doors: [{ side: 'n', at: 12.8, w: 2.4, door: true }, { side: 'w', at: 6, w: 2.0, door: true }, { side: 'n', at: 3, w: 3, sill: 1.1 }, { side: 'n', at: 21, w: 3, sill: 1.1 }, { side: 's', at: 6, w: 3, sill: 1.4 }, { side: 's', at: 20, w: 3, sill: 1.4 }],
    inner: [[0, 9, 28, 9, [{ at: 6, w: 1.8 }, { at: 13, w: 2.4 }, { at: 22, w: 1.8 }]], [9, 9, 9, 18, []], [19, 9, 19, 18, []], [0, 9, 28, 9, [{ at: 4, w: 1.8 }, { at: 22, w: 1.8 }], 1], [14, 0, 14, 18, [{ at: 4, w: 1.8 }], 1]],
    stairs: [{ x: 24.2, z: 1.2, w: 1.6, dir: 's', from: 0, to: 1 }], ladders: [{ side: 'e', at: 12 }] });
  C.F(cr, 'office', 0, 0, 22, 9, { tier: 1, extra: [['desk', 1]] }); C.F(cr, 'security', 0, 9, 9, 18, { tier: 2 }); C.F(cr, 'bunk', 9, 9, 19, 18, { tier: 1 }); C.F(cr, 'bunk', 19, 9, 28, 18, { tier: 1 });
  C.F(cr, 'office', 0, 0, 14, 18, { tier: 2, storey: 1, extra: [['cabinet', 1]] }); C.F(cr, 'control', 14, 0, 28, 18, { tier: 2, storey: 1 });
  w.prop('dg_sign', 870, 359.6, 0, { solid: true });

  // ---------------- Bottom Line Balcony: the promenade along the escarpment over the Red Ink Lakes
  w.paint('concrete', 716, 412, 900, 425);
  C.dropWalls(BALCONY.map(([x, z]) => [x, z - 0.4]), 1, { tin: 0.6, tout: 0.5, par: 1.05, tex: 'concrete', drop: 1.5, gap: (x) => Math.abs(x - 800) < 4.6 });
  for (let x = 724; x < 896; x += 16) { w.prop('dg_bench', x, 416, 0, { solid: true }); C.lampAt(x + 8, 414, PLAT, { y: 3.6, color: 0xffd8a0, intensity: 1.5, range: 12 }); }
  for (const x of [742, 790, 846, 884]) w.prop('dg_binocs', x, 420.5, 0, { solid: true });
  // the lookout deck jutting out over the drop
  w.bridge([[800, 418], [800, 438]], 9, PLAT + 0.1, 'wood', { pillars: 0, thick: 0.6, rails: true });
  w.block(795.4, 437.6, 804.6, 437.9, 1.0, 'rust', { y0: PLAT + 0.1, xray: false });
  w.prop('dg_binocs', 798, 436.4, 0, { solid: true, yAbs: PLAT + 0.1 }); w.prop('dg_bench', 802, 426, PI / 2, { solid: true, yAbs: PLAT + 0.1 });
  const vc = C.B.visitor = C.bld({ x: 838, z: 392, w: 18, d: 12, name: 'Visitor Center', wall: 'plaster', tint: 0xe8e0d0, floor: 'tiles', roofTint: 0x3a7aa0,
    doors: [{ side: 's', at: 7.8, w: 2.4, door: true }, { side: 'w', at: 4, w: 2, door: true }, { side: 's', at: 2, w: 3, sill: 0.9 }, { side: 's', at: 13, w: 3, sill: 0.9 }, { side: 'n', at: 8, w: 3, sill: 1.0 }],
    inner: [[11, 0, 11, 12, [{ at: 4, w: 1.8 }]]] });
  C.F(vc, 'commercial', 0, 0, 11, 12, { tier: 1, extra: [['suitcase', 1]] }); C.F(vc, 'office', 11, 0, 18, 12, { tier: 1 });
  C.P(vc, 'dg_vending', 1, 10.8, PI, { solid: true });
  w.prop('dg_sign', 760, 410, 0, { solid: true });
  C.loot(810, 416, 30, ['trash', 'suitcase', 'backpack'], 1, { avoid: (x, z) => z > 425 || z < 408 });
}

// ==================================================================================== LOWLANDS (north half of the south)
function lowlands(C) {
  const { w, rng } = C;
  // ---------------- Liquid Assets Water Treatment: control building, clarifiers, filter beds, pump hall
  const wt = C.B.wtc = C.bld({ x: 352, z: 460, w: 26, d: 20, storeys: 2, name: 'Liquid Assets Control', wall: 'concrete', tint: 0xd8dcd8, floor: 'tiles', roofTint: 0x5a8aa0,
    doors: [{ side: 's', at: 4, w: 2.2, door: true }, { side: 'e', at: 13, w: 2.0, door: true }, { side: 'w', at: 4, w: 1.8, door: true }, { side: 's', at: 15, w: 3, sill: 1.1 }, { side: 'n', at: 4, w: 3, sill: 1.1 }, { side: 'n', at: 17, w: 3, sill: 1.1 }, { side: 'e', at: 4, w: 3, sill: 1.1 }],
    inner: [[10, 0, 10, 20, [{ at: 12.5, w: 1.8 }]], [10, 10, 26, 10, [{ at: 4, w: 1.8, door: true, locked: 'surveillance' }]], [18, 10, 18, 20, []],
      [13, 0, 13, 20, [{ at: 4, w: 1.8 }], 1], [13, 10, 26, 10, [{ at: 6, w: 1.8 }], 1]],
    stairs: [{ x: 1.2, z: 13.2, w: 1.6, dir: 'n', from: 0, to: 1 }], ladders: [{ side: 'n', at: 22 }] });
  C.F(wt, 'lab', 0, 0, 10, 20, { tier: 2, extra: [['medical_bag', 1]] });
  C.F(wt, 'security', 10, 0, 26, 10, { tier: 3, room: 'surveillance', extra: [['security_locker', 1], ['electronics', 1], ['weapon_case', 1]] });
  C.K(wt, 'surveillance', 10, 0, 26, 10, 'The Snooping Room');
  for (const lx of [13, 17, 21]) C.P(wt, 'dg_server', lx, 0.6, 0, { solid: true });
  C.F(wt, 'office', 10, 10, 18, 20, { tier: 1 }); C.F(wt, 'storage', 18, 10, 26, 20, { tier: 1 });
  C.F(wt, 'control', 0, 0, 13, 20, { tier: 2, storey: 1 }); C.F(wt, 'office', 13, 0, 26, 10, { tier: 2, storey: 1 }); C.F(wt, 'bunk', 13, 10, 26, 20, { tier: 1, storey: 1 });
  C.P(wt, 'dg_satdish', 6, 6, 0.4, { yAbs: C.roofY(wt), solid: true, scale: 0.8 });
  // two clarifiers with a bridge arm, four filter beds, the chlorine shed, the pump hall on the far side of the road
  for (const [cx, cz] of [[400, 476], [430, 497]]) {
    const g = w.groundAt(cx, cz);
    C.ring(cx, cz, 10.5, 1.5, 'concrete', [], 1.4);
    w.raiseCircle(cx, cz, 10, g - 1.2, 0.15, 'set');
    w.waterPoly(Array.from({ length: 20 }, (_, i) => [cx + Math.cos(i / 20 * 2 * PI) * 10.3, cz + Math.sin(i / 20 * 2 * PI) * 10.3]), { level: g + 0.9, material: C.darkMat });
    w.bridge([[cx - 11.5, cz], [cx + 11.5, cz]], 1.6, g + 1.6, 'metalPanel', { pillars: 0, thick: 0.3 });
    w.block(cx - 0.8, cz - 0.8, cx + 0.8, cz + 0.8, 1.6, 'concrete', { y0: g - 1.2 });
    w.ladder(cx - 12.6, cz + 0.5, null, cx - 11.2, cz + 0.5, g + 1.6, PI / 2);
  }
  for (let k = 0; k < 4; k++) {
    const x0 = 356 + k * 13, z0 = 488, g = w.groundAt(x0 + 5, z0 + 8);
    w.raiseRect(x0 + 0.6, z0 + 0.6, x0 + 10.4, z0 + 15.4, g - 0.9, 0.3, 'set');
    w.waterPoly([[x0, z0], [x0 + 11, z0], [x0 + 11, z0 + 16], [x0, z0 + 16]], { level: g - 0.25, material: C.darkMat });
    for (const [a, b, c, d] of [[x0, z0, x0 + 11, z0 + 0.5], [x0, z0 + 15.5, x0 + 11, z0 + 16], [x0, z0, x0 + 0.5, z0 + 16], [x0 + 10.5, z0, x0 + 11, z0 + 16]]) w.block(a, b, c, d, 1.5, 'concrete', { y0: g - 0.9 });
  }
  const cl = C.bld({ x: 420, z: 460, w: 14, d: 10, name: 'Chlorine Shed', wall: 'corrugated', floor: 'concrete', roof: 'corrugated', roofTint: 0x7aa070,
    doors: [{ side: 's', at: 5, w: 3 }, { side: 'w', at: 3, w: 2, door: true }] });
  C.F(cl, 'industrial', 0, 0, 14, 10, { tier: 1 }); w.prop('dg_toxic', 436, 470, 0, { solid: true }); w.prop('dg_toxic', 437, 466, 0.5, { solid: true });
  const ph = C.B.pumpHall = C.bld({ x: 378, z: 522, w: 26, d: 16, storeys: 2, name: 'Liquid Assets Pump Hall', wall: 'brick', tint: 0xc8a888, floor: 'concrete', roof: 'corrugated', roofTint: 0x6a8a9a,
    doors: [{ side: 'n', at: 11, w: 3.5 }, { side: 'e', at: 6, w: 2.2, door: true }, { side: 's', at: 4, w: 3, sill: 1.1 }, { side: 's', at: 18, w: 3, sill: 1.1 }],
    inner: [[18, 0, 18, 16, [{ at: 6, w: 1.8 }]], [18, 0, 18, 16, [{ at: 10, w: 1.8 }], 1]], stairs: [{ x: 20, z: 1.2, w: 1.6, dir: 's', from: 0, to: 1 }] });
  for (const lx of [5, 12]) C.P(ph, 'dg_pump', lx, 8, PI / 2, { solid: true });
  C.P(ph, 'dg_valve', 8.5, 13.5, 0, { solid: true }); C.Cn(ph, 'toolbox', 2, 14.6, 0, { tier: 2 }); C.Cn(ph, 'crate', 16, 1.2, 0, { tier: 1 }); C.IL(ph, 9, 8, 0xffd090, 1.3, 11);
  C.F(ph, 'workshop', 18, 0, 26, 16, { tier: 1 }); C.F(ph, 'office', 0, 0, 18, 16, { tier: 1, storey: 1, extra: [['cabinet', 1]] }); C.F(ph, 'storage', 18, 0, 26, 16, { tier: 1, storey: 1 });
  C.fenceLine([[346, 456], [446, 456], [446, 510]], [[396, 456]]);
  for (const [x, z] of [[350, 456], [444, 458], [444, 508], [380, 512], [410, 540]]) C.flood(x, z, { rot: 0.3 });
  C.clutter(392, 470, 30, 10, ['barrel', 'barrelBlue', 'crate', 'pipe', 'dg_tankS'], { avoid: (x, z) => Math.hypot(x - 400, z - 476) < 12.5 || Math.hypot(x - 430, z - 497) < 12.5 || (x > 354 && x < 409 && z > 486 && z < 506) });
  C.loot(392, 490, 40, ['crate', 'toolbox', 'trash', 'medical_bag'], 1, { avoid: (x, z) => Math.hypot(x - 400, z - 476) < 12.5 || Math.hypot(x - 430, z - 497) < 12.5 || (x > 354 && x < 409 && z > 486 && z < 506) });
  C.fieldDepot(272, 522, 0);

  // ---------------- Overdraft Acres: a farmstead at the foot of the west slope (farmhouse, barn, silos)
  const fh = C.B.farm = C.bld({ x: 160, z: 482, w: 14, d: 11, storeys: 2, rot: 0.08, name: 'Overdraft Acres Farmhouse', wall: 'wood', tint: 0xd8c8a8, floor: 'wood', roof: 'roofTile', roofShape: 'gable', roofTint: 0x7a3a2a,
    doors: [{ side: 's', at: 5, w: 1.8, door: true }, { side: 'e', at: 4, w: 1.8, door: true }, { side: 'n', at: 3, w: 2.4, sill: 1.0 }, { side: 'w', at: 4, w: 2.4, sill: 1.0 }, { side: 's', at: 10, w: 2.4, sill: 1.0 }],
    inner: [[7, 0, 7, 11, [{ at: 4, w: 1.6 }]], [7, 0, 7, 11, [{ at: 7, w: 1.6 }], 1]], stairs: [{ x: 0.9, z: 4.6, w: 1.5, dir: 'n', from: 0, to: 1 }] });
  C.F(fh, 'kitchen', 2.6, 0, 7, 11, { tier: 1 }); C.F(fh, 'living', 7, 0, 14, 11, { tier: 1, extra: [['cabinet', 1]] }); C.F(fh, 'bedroom', 0, 0, 7, 11, { tier: 1, storey: 1 }); C.F(fh, 'bedroom', 7, 0, 14, 11, { tier: 1, storey: 1, extra: [['desk', 1]] });
  const barn = C.bld({ x: 186, z: 496, w: 18, d: 13, rot: -0.04, name: 'Overdraft Acres Barn', wall: 'wood', tint: 0xa85a40, floor: 'dirt', roof: 'corrugated', roofShape: 'gable', roofTint: 0x5a4a3a, h: 5,
    doors: [{ side: 'w', at: 4, w: 4.5 }, { side: 's', at: 7, w: 3.5 }] });
  C.F(barn, 'storage', 0, 0, 18, 13, { tier: 1, extra: [['crate', 1], ['basket', 1]] });
  for (const [x, z] of [[212, 486], [218, 494]]) w.prop('dg_tankS', x, z, 0, { solid: true, scale: 1.5 });
  C.fenceLine([[150, 474], [228, 474], [228, 520], [150, 520], [150, 474]], [[189, 474], [228, 497], [150, 497]]);
  w.prop('dg_truck', 176, 512, 1.4, { solid: true }); w.container('car_trunk', 178, 515, 0, { tier: 1 });
  C.loot(190, 498, 26, ['basket', 'plant', 'trash', 'crate'], 1);
  w.lamp(180, 492, { y: 3.6, color: 0xffc078, intensity: 1.4, range: 10 });

  // ---------------- Beta Test Battlefield: Participation Trophy Hill with the old EMP trap, trenches, a Legacy System wreck
  const hillTop = w.groundAt(482, 566);
  w.prop('dg_emptrap', 482, 566, 0.3, { solid: true });
  for (const a of [0.4, 2.5, 4.6]) w.prop('dg_fusebox', 482 + Math.cos(a) * 5, 566 + Math.sin(a) * 5, -a, { solid: true });
  w.lamp(482, 566, { y: 3.2, model: null, color: 0x80c0ff, intensity: 1.4, range: 10, flicker: 0.5 });
  w.paintCircle('dirt', 482, 566, 8, 0.4, 7);
  for (const pts of [[[452, 548], [462, 542], [470, 538]], [[496, 538], [506, 544], [512, 552]], [[460, 584], [468, 592]], [[500, 586], [510, 580], [516, 570]], [[446, 562], [446, 574]]]) C.sandbags(pts);
  w.prop('dg_bigwreck', 520, 600, 2.4, { solid: true }); w.container('barron_husk', 514, 598, 0.6, { tier: 2 });
  for (const [x, z, r] of [[452, 530, 0.3], [530, 560, 1.8], [500, 616, 0.9], [440, 616, 2.2]]) { w.prop('husk', x, z, r, { solid: true }); w.container('arc_husk', x + 2, z + 1.5, 0, { tier: 1 }); }
  for (const [x, z] of [[458, 526], [470, 524], [514, 532], [526, 545], [450, 604], [536, 588]]) w.prop('dg_hedgehog', x, z, rng() * 3, { solid: true });
  for (let k = 0; k < 7; k++) w.prop('dg_grave', 492 + k * 2.2, 618 + (k % 2) * 0.6, 0, { solid: true });
  w.prop('dg_memorial', 499, 623, 0, { solid: true });
  C.clutter(482, 570, 44, 22, ['dg_rubble', 'debris', 'debris', 'rock', 'dg_slab'], { avoid: (x, z) => Math.hypot(x - 482, z - 566) < 9 });
  C.loot(482, 570, 42, ['plant', 'plant', 'arc_husk', 'ammo_box', 'crate', 'basket'], 1, { avoid: (x, z) => Math.hypot(x - 482, z - 566) < 6 });
  C.fire(508, 594); w.lamp(446, 586, { y: 3.4, color: 0xffb070, intensity: 1.4, range: 10, flicker: 0.3 });
  const med = C.bld({ x: 500, z: 540, w: 12, d: 8, name: 'Beta Test Field Hospital', wall: 'corrugated', floor: 'wood', roof: 'corrugated', roofTint: 0x6a7a4a, tint: 0xa8a890,
    doors: [{ side: 's', at: 2, w: 2, door: true }, { side: 'w', at: 3, w: 2, sill: 1.0 }] });
  C.F(med, 'medical', 0, 0, 12, 8, { tier: 1, extra: [['desk', 1], ['cabinet', 1]] });

  // ---------------- Surge Pricing Substation: fenced transformer yard + control house
  C.fenceRect(662, 532, 724, 590, [[662, 548], [693, 590], [724, 560]]);
  w.paint('gravel', 663, 533, 723, 589);
  for (let x = 694; x < 720; x += 8) for (let z = 538; z < 586; z += 9) w.prop('dg_transformer', x, z, 0, { solid: true });
  w.prop('dg_gantry', 707, 536, 0, {}); w.prop('dg_gantry', 707, 584, 0, {});
  const ss = C.B.sub = C.bld({ x: 666, z: 536, w: 20, d: 16, storeys: 2, name: 'Surge Pricing Control', wall: 'concrete', tint: 0xd0ccc0, floor: 'concrete', roofTint: 0x7a7a6a,
    doors: [{ side: 's', at: 4, w: 2.2, door: true }, { side: 'e', at: 10, w: 2.2, door: true }, { side: 'n', at: 6, w: 3, sill: 1.1 }, { side: 'w', at: 8, w: 3, sill: 1.1 }],
    inner: [[11, 0, 11, 16, [{ at: 10, w: 1.8 }]], [11, 0, 11, 16, [{ at: 4, w: 1.8 }], 1]], stairs: [{ x: 13, z: 1.2, w: 1.6, dir: 's', from: 0, to: 1 }] });
  C.F(ss, 'control', 0, 0, 11, 16, { tier: 2 }); C.P(ss, 'dg_fusebox', 0.5, 8, PI / 2, { solid: true });          // the empty fuse slot
  C.F(ss, 'workshop', 11, 0, 20, 16, { tier: 1 }); C.F(ss, 'server', 0, 0, 11, 16, { tier: 2, storey: 1 }); C.F(ss, 'bunk', 11, 0, 20, 16, { tier: 1, storey: 1, extra: [['backpack', 1]] });   // the engineer's cot
  for (const [x, z] of [[664, 534], [722, 588], [722, 534]]) C.flood(x, z, { color: 0xd0e0ff });
  w.container('electronics', 690, 586, 0, { tier: 2 }); w.container('toolbox', 668, 586, 0, { tier: 1 });
  C.powerLine([[690, 528], [690, 490], [656, 432], [652, 384], [650, 336], [648, 290], [630, 244]]);
  C.powerLine([[724, 586], [790, 628], [870, 664], [950, 622], [1030, 602], [1104, 588]]);
  C.powerLine([[470, 262], [380, 298], [280, 308], [176, 312], [90, 318], [-4, 318]]);

  // ---------------- Red Ink Lakes: the tailings ponds (and, on a bad day, the Landlady's front yard)
  for (const [x0, z0, x1, z1] of PONDS) {
    w.prop('dg_bigpipe', (x0 + x1) / 2, z0 - 2.4, 0, { solid: true, scale: 0.55 });
    w.prop('dg_signred', x1 + 2, z1 - 4, PI / 2, { solid: true });
  }
  for (const [x, z, r] of [[804, 506, 0.2], [867, 572, 1.4], [778, 612, 2.0], [930, 500, 0.8]]) w.prop('husk', x, z, r, { solid: true });
  w.prop('dg_truck', 742, 470, 0.4, { solid: true }); w.container('car_trunk', 744, 474, 0, { tier: 1 });
  for (const [x, z] of [[772, 541], [835, 541], [898, 543], [804, 474], [866, 476], [740, 576], [932, 574]]) w.lamp(x, z, { y: 4.2, color: 0xffb070, intensity: 1.5, range: 12, flicker: 0.25 });
  C.loot(835, 540, 95, ['arc_husk', 'crate', 'trash', 'arc_crate', 'toolbox', 'ammo_box', 'arc_husk'], 1, { avoid: (x, z) => PONDS.some(([a, b, c, d]) => x > a - 1.5 && x < c + 1.5 && z > b - 1.5 && z < d + 1.5) || x < 738 || x > 933 || z < 471 || z > 612 });
  const hut = C.bld({ x: 912, z: 614, w: 10, d: 8, name: 'Pond Monitor Hut', wall: 'corrugated', floor: 'wood', roof: 'corrugated', roofTint: 0x9a5030,
    doors: [{ side: 'n', at: 4, w: 1.8, door: true }, { side: 'w', at: 3, w: 2, sill: 1.0 }] });
  C.F(hut, 'office', 0, 0, 10, 8, { tier: 1 });
  C.addClear(835, 540, 20);

  // ---------------- Works-On-My-Machine Annex (QA): test labs, the Staging Environment (locked), a rig yard
  const qa = C.B.qa = C.bld({ x: 966, z: 512, w: 40, d: 24, storeys: 2, name: 'Works-On-My-Machine Annex', wall: 'concrete', tint: 0xdcdcd4, floor: 'tiles', roofTint: 0x9a9aa8,
    doors: [{ side: 'n', at: 18.8, w: 2.4, door: true }, { side: 's', at: 6, w: 2.0, door: true }, { side: 'w', at: 16, w: 2.0, door: true }, { side: 'e', at: 6, w: 2.2, door: true },
      { side: 'n', at: 5, w: 3, sill: 1.1 }, { side: 'n', at: 32, w: 3, sill: 1.1 }, { side: 's', at: 20, w: 3, sill: 1.1 }, { side: 's', at: 32, w: 3, sill: 1.1 }],
    inner: [[0, 10, 40, 10, [{ at: 4, w: 1.8 }, { at: 19, w: 2.4 }]], [24, 10, 24, 24, [{ at: 4, w: 1.8, door: true, locked: 'testing_annex' }]], [12, 10, 12, 24, [{ at: 6, w: 1.8 }]],
      [0, 10, 40, 10, [{ at: 4, w: 1.8 }, { at: 34, w: 1.8 }], 1], [20, 0, 20, 10, [{ at: 4, w: 1.8 }], 1], [20, 10, 20, 24, [{ at: 6, w: 1.8 }], 1]],
    stairs: [{ x: 1.2, z: 14.4, w: 1.6, dir: 'n', from: 0, to: 1 }], ladders: [{ side: 'e', at: 18 }] });
  C.F(qa, 'lab', 0, 0, 40, 10, { tier: 2, extra: [['desk', 1]] }); C.P(qa, 'dg_testrig', 20, 5, 0, { solid: true });
  C.F(qa, 'storage', 0, 10, 12, 24, { tier: 1 }); C.F(qa, 'office', 12, 10, 24, 24, { tier: 2 });
  C.F(qa, 'lab', 24, 10, 40, 24, { tier: 3, room: 'testing_annex', extra: [['weapon_case', 1], ['electronics', 1], ['safe', 1]] });
  C.K(qa, 'testing_annex', 24, 10, 40, 24, 'The Staging Environment');
  C.F(qa, 'office', 0, 0, 20, 10, { tier: 2, storey: 1 }); C.F(qa, 'server', 20, 0, 40, 10, { tier: 2, storey: 1 });
  C.F(qa, 'office', 0, 10, 20, 24, { tier: 1, storey: 1, extra: [['cabinet', 1]] }); C.F(qa, 'medical', 20, 10, 40, 24, { tier: 2, storey: 1 });
  C.fenceRect(1010, 510, 1024, 540, [[1010, 520]]);
  for (const z of [516, 528]) w.prop('dg_testrig', 1017, z, PI / 2, { solid: true });
  w.container('electronics', 1020, 536, 0, { tier: 2 });
  for (const [x, z] of [[964, 510], [1008, 538], [964, 538]]) C.flood(x, z, { rot: 0.2 });
  w.prop('dg_sign', 986, 509, 0, { solid: true });
}

// ==================================================================================== SOUTHLANDS (marsh, park, scrapyard, creek, Ant Hills)
function southlands(C) {
  const { w, rng } = C;
  // ---------------- Without-A-Paddle Creek: the barrel truck that went in and never came out
  w.prop('dg_truck', 790, 663, 1.25, { solid: true }); w.container('car_trunk', 787, 667, 1.25, { tier: 2 }); w.container('car_trunk', 794, 659, 1.25, { tier: 1 });
  for (const [x, z] of [[784, 656], [798, 668], [802, 660], [779, 670], [806, 671]]) w.prop('dg_toxic', x, z, rng() * 3, { solid: true });
  w.prop('car', 742, 672, 0.4, { solid: true }); w.container('car_trunk', 745, 676, 0.4, { tier: 1 });
  w.bridge([[840, 660], [841, 640]], 2.4, w.groundAt(840, 662) + 0.3, 'wood', { pillars: 0, thick: 0.3 });
  w.prop('dg_tent', 856, 676, 0.4, { solid: true }); C.fire(850, 680); w.prop('dg_log', 846, 684, 0.3, { solid: true });
  C.loot(800, 668, 34, ['basket', 'plant', 'trash', 'backpack'], 1, { avoid: (x, z) => C.distLine(x, z, CREEK_PTS) < 4 });
  w.lamp(792, 676, { y: 3.4, color: 0xffb070, intensity: 1.3, range: 9, flicker: 0.4 });

  // ---------------- The Ant Farm: raider outpost on the hilltop, memorial, the flag platform facing the Red Ink Lakes
  const A = G_ANT, aTop = w.groundAt(...GW(A, 948, 690));
  C.compound(A, 926, 672, 972, 710, 2.2, 'wood', [['n', 22], ['s', 30], ['w', 18]]);
  const ah = C.B.ant = C.gbld(A, { x: 930, z: 676, w: 12, d: 9, name: 'Ant Farm HQ', wall: 'wood', floor: 'wood', roof: 'corrugated', roofTint: 0x8a6a40, floorY: aTop,
    doors: [{ side: 's', at: 5, w: 1.8, door: true }, { side: 'e', at: 3, w: 2, sill: 1.0 }] });
  C.F(ah, 'raider', 0, 0, 12, 9, { tier: 2, extra: [['desk', 1], ['cabinet', 1]] });
  const ab = C.gbld(A, { x: 952, z: 676, w: 11, d: 8, name: 'Ant Farm Bunks', wall: 'wood', floor: 'wood', roof: 'corrugated', roofTint: 0x7a5a38, floorY: aTop,
    doors: [{ side: 's', at: 2, w: 1.8, door: true }, { side: 'w', at: 3, w: 2, sill: 1.0 }] });
  C.F(ab, 'bunk', 0, 0, 11, 8, { tier: 1, extra: [['cabinet', 1]] });
  const aw = C.gbld(A, { x: 954, z: 698, w: 10, d: 8, name: 'Ant Farm Workshop', wall: 'corrugated', floor: 'wood', roof: 'corrugated', roofTint: 0x9a7048, floorY: aTop,
    doors: [{ side: 'n', at: 3, w: 2.4 }, { side: 'w', at: 3, w: 2, sill: 1.0 }] });
  C.F(aw, 'workshop', 0, 0, 10, 8, { tier: 2 });
  C.gprop(A, 'dg_memorial', 936, 702, 0, { solid: true });
  for (let k = 0; k < 5; k++) C.gprop(A, 'dg_grave', 930 + k * 2.4, 706.5, 0, { solid: true });
  for (const X of [933, 939]) C.glamp(A, X, 701, { y: 0.8, model: null, color: 0xffb040, intensity: 1.2, range: 5, flicker: 0.6 });
  C.gprop(A, 'dg_watchtower', 969, 674, 0, { solid: true });
  C.gprop(A, 'dg_tent', 946, 690, 0.2, { solid: true }); C.fire(...GW(A, 941, 690));
  C.gcont(A, 'raider_cache', 950, 692, 0, { tier: 2 }); C.gcont(A, 'ammo_box', 962, 694, 0, { tier: 1 }); C.gcont(A, 'crate', 928, 694, 0, { tier: 1 });
  // the flag platform: a timber deck on posts at the north-west lip of the hill, ladder up
  { const a = GW(A, 914, 676), b = GW(A, 922, 676), y = aTop + 2.6;
    w.bridge([a, b], 5, y, 'wood', { pillars: 4, pillarW: 0.5, thick: 0.4, rails: true, side: 'wood' });
    const [lx, lz] = GW(A, 924.6, 676), [tx, tz] = GW(A, 921.4, 676); w.ladder(lx, lz, null, tx, tz, y, -PI / 2 - A.a);
    const [fx, fz] = GW(A, 915.5, 676); w.prop('dg_flagpole', fx, fz, 0, { solid: true, yAbs: y }); }
  C.hatch('ant_farm_hatch', 'Ant Farm Doggy Door', ...GW(A, 948, 718), 0);

  // ---------------- Subprime Trailer Park (east lowlands)
  [[1040, 534, 0.15], [1060, 532, -0.1], [1080, 538, 0.2], [1044, 556, -0.2], [1066, 558, 0.05], [1084, 566, -0.15]].forEach(([x, z, rot], i) => {
    const bb = C.bld({ x, z, w: 11, d: 4.4, rot, name: 'Trailer ' + (i + 1), wall: i % 2 ? 'metalPanel' : 'corrugated', tint: [0xd8d0b8, 0xb8c8d0, 0xd8b8a8][i % 3], floor: 'wood', roof: 'metalPanel', roofTint: 0xa8a8a0, h: 2.6, parapet: false,
      doors: [{ side: 's', at: 2, w: 1.4, door: true }, { side: 's', at: 7, w: 1.8, sill: 1.0 }, { side: 'n', at: 5, w: 1.8, sill: 1.0 }] });
    C.F(bb, ['living', 'bedroom', 'kitchen'][i % 3], 0, 0, 11, 4.4, { tier: 1, extra: i % 2 ? [['cabinet', 1]] : [['suitcase', 1]] });
  });
  for (const [x, z] of [[1052, 548], [1074, 548], [1060, 578]]) w.prop('dg_table', x, z, 0.3, { solid: true });
  for (const [x, z, r] of [[1096, 552, 1.5], [1034, 576, 0.3]]) w.prop('car', x, z, r, { solid: true });
  C.clutter(1064, 556, 26, 10, ['barrel', 'crate', 'dg_tent', 'debris', 'bush'], {});
  C.fire(1070, 549); w.lamp(1056, 546, { y: 3.2, color: 0xffb070, intensity: 1.4, range: 10, flicker: 0.3 });

  // ---------------- Total Write-Off: a crashed ARK lander strewn down the hillside
  w.paintCircle('rock', 1031, 775, 12, 0.5, 3); w.paintCircle('mud', 1018, 766, 7, 0.5, 9);
  w.prop('dg_bigwreck', 1032, 776, 0.7, { solid: true }); w.prop('dg_huskbig', 1012, 764, 2.4, { solid: true }); w.prop('dg_slab', 1048, 790, 1.2, { solid: true });
  w.container('arc_crate', 1024, 784, 0, { tier: 2 }); w.container('arc_husk', 1040, 768, 0, { tier: 2 }); w.container('backpack', 1016, 772, 0, { tier: 1 });
  C.clutter(1026, 772, 26, 16, ['debris', 'dg_rubble', 'husk', 'debris', 'rock'], { avoid: (x, z) => Math.hypot(x - 1032, z - 776) < 9 });
  C.fire(1022, 790); C.fire(1044, 760);

  // ---------------- Final Sale Scrapyard (+ the little Beta Test cemetery next door)
  C.fenceRect(536, 696, 614, 754, [[614, 727], [575, 754]]);
  w.paint('gravel', 537, 697, 613, 753);
  for (let x = 544; x < 600; x += 7) for (const z of [704, 716]) { w.prop(C.chance(0.75) ? 'car' : 'dg_truck', x, z, PI / 2 + (rng() - 0.5) * 0.4, { solid: true }); if (C.chance(0.45)) w.prop('car', x, z, PI / 2 + rng(), { yAbs: w.groundAt(x, z) + 1.35 }); }
  for (const [x, z, k] of [[550, 740, 'dg_container'], [550, 746, 'dg_containerB'], [597, 742, 'dg_containerG']]) w.prop(k, x, z, 0, { solid: true });
  w.prop('dg_crane', 606, 706, 2.1, { solid: true }); C.mastLight(606, 706, 20);
  const so = C.B.scrap = C.bld({ x: 568, z: 732, w: 16, d: 10, name: 'Final Sale Office', wall: 'corrugated', floor: 'wood', roof: 'corrugated', roofTint: 0xb04030, tint: 0xc8c0a8,
    doors: [{ side: 'n', at: 6, w: 2.0, door: true }, { side: 'e', at: 3, w: 2.4 }, { side: 's', at: 3, w: 3, sill: 1.0 }], inner: [[8, 0, 8, 10, [{ at: 6, w: 1.6 }]]] });
  C.F(so, 'office', 0, 0, 8, 10, { tier: 2, extra: [['cabinet', 1], ['desk', 1]] }); C.F(so, 'workshop', 8, 0, 16, 10, { tier: 1 });
  for (let x = 542; x < 566; x += 6.5) for (const z of [728, 740]) if (C.chance(0.8)) { w.prop('car', x, z, PI / 2 + (rng() - 0.5) * 0.5, { solid: true }); if (C.chance(0.5)) w.prop('car', x, z, rng() * 6, { yAbs: w.groundAt(x, z) + 1.35 }); }
  C.clutter(590, 742, 18, 14, ['debris', 'dg_rubble', 'barrel', 'pipe', 'crate', 'husk', 'dg_slab'], { avoid: (x, z) => x < 538 || x > 612 || z < 698 || z > 752 });
  C.clutter(575, 722, 34, 22, ['debris', 'dg_rubble', 'barrel', 'pipe', 'crate', 'husk'], { avoid: (x, z) => x < 538 || x > 612 || z < 698 || z > 752 });
  C.loot(575, 726, 34, ['crate', 'toolbox', 'car_trunk', 'trash', 'ammo_box', 'cabinet'], 1, { avoid: (x, z) => x < 538 || x > 612 || z < 698 || z > 752 });
  for (let k = 0; k < 8; k++) w.prop('dg_grave', 620 + (k % 4) * 2.6, 744 + Math.floor(k / 4) * 3.2, 0, { solid: true });
  w.prop('dg_memorial', 625, 736, 0, { solid: true }); w.lamp(624, 738, { y: 0.8, model: null, color: 0xffb040, intensity: 1.2, range: 5, flicker: 0.6 });
  for (const [x, z] of [[538, 698], [612, 752], [612, 698]]) C.flood(x, z, { rot: 0.4 });

  // ---------------- Exit Interview Elevator + the south Supply Shack
  C.lift('exit_interview_elevator', 'Exit Interview Elevator', 670, 786, 0);
  C.fieldDepot(744, 768, 0);

  // ---------------- Recess Park: the pitch, a playground, the park shelter (open sky for anyone who hovers)
  w.paint('grass', 228, 610, 286, 658);
  for (const [a, b, c, d] of [[228, 610, 286, 610.4], [228, 657.6, 286, 658], [228, 610, 228.4, 658], [285.6, 610, 286, 658], [256.8, 610, 257.2, 658]]) w.paint('concrete', a, b, c, d);
  w.prop('dg_goal', 230.5, 634, PI / 2, { solid: true }); w.prop('dg_goal', 283.5, 634, -PI / 2, { solid: true });
  for (const [k, x, z, r] of [[ 'dg_swing', 244, 600, 0], ['dg_slide', 256, 600, 0.2], ['dg_swing', 268, 600, 0], ['dg_bench', 240, 664, 0], ['dg_bench', 272, 664, 0], ['dg_bench', 292, 620, PI / 2]]) w.prop(k, x, z, r, { solid: true });
  const shel = C.bld({ x: 222, z: 664, w: 10, d: 6, name: 'Park Shelter', wall: 'wood', floor: 'concrete', roof: 'roofTile', roofShape: 'gable', roofTint: 0x7a4a30,
    doors: [{ side: 'n', at: 1, w: 8 }, { side: 'e', at: 1.5, w: 3, sill: 0.9 }] });
  C.Cn(shel, 'trash', 1, 5, 0, { tier: 1 }); C.Cn(shel, 'backpack', 8.6, 5, 0, { tier: 1 }); C.Cn(shel, 'cabinet', 5, 5.4, PI, { tier: 1 });
  for (const [x, z] of [[226, 606], [290, 606], [226, 662], [290, 662]]) w.lamp(x, z, { y: 5, color: 0xfff0d0, intensity: 1.6, range: 14 });
  C.addClear(257, 634, 30);

  // ---------------- Drip Pricing Towers (with the kickabout goal underneath)
  w.prop('dg_watertower', 330, 692, 0, { solid: true }); w.prop('dg_watertower', 352, 706, 0.3, { solid: true });
  C.mastLight(330, 692, 13); C.mastLight(352, 706, 13);
  w.prop('dg_goal', 338, 714.5, 0.1, { solid: true });
  const pump = C.bld({ x: 322, z: 704, w: 8, d: 7, name: 'Tower Pump Shed', wall: 'brick', floor: 'concrete', roof: 'corrugated', doors: [{ side: 'n', at: 3, w: 1.8, door: true }] });
  C.F(pump, 'industrial', 0, 0, 8, 7, { tier: 1, extra: [['cabinet', 1]] });
  C.loot(340, 700, 14, ['trash', 'toolbox', 'crate'], 1);

  // ---------------- Soggy Bottom Outpost: stilt huts on a mound in the marsh, the radar mast
  const sb = C.B.soggy = C.bld({ x: 96, z: 586, w: 14, d: 10, name: 'Soggy Bottom Radio Hut', wall: 'wood', floor: 'wood', roof: 'corrugated', roofTint: 0x5a7a5a,
    doors: [{ side: 's', at: 2, w: 1.8, door: true }, { side: 'e', at: 4, w: 2, door: true }, { side: 'n', at: 6, w: 3, sill: 1.0 }], inner: [[8, 0, 8, 10, [{ at: 5, w: 1.6 }]]] });
  C.F(sb, 'office', 0, 0, 8, 10, { tier: 2, extra: [['desk', 1], ['cabinet', 1]] }); C.F(sb, 'bunk', 8, 0, 14, 10, { tier: 1 });
  const sb2 = C.bld({ x: 118, z: 604, w: 10, d: 8, name: 'Soggy Bottom Stores', wall: 'wood', floor: 'wood', roof: 'corrugated', roofTint: 0x6a6a4a,
    doors: [{ side: 'w', at: 3, w: 1.8, door: true }, { side: 'n', at: 4, w: 2, sill: 1.0 }] });
  C.F(sb2, 'storage', 0, 0, 10, 8, { tier: 1, extra: [['cabinet', 1]] });
  w.prop('dg_radar', 124, 590, 0, { solid: true }); C.mastLight(124, 590, 8.5);
  w.prop('dg_generator', 100, 614, 0, { solid: true, scale: 0.6 }); w.prop('barrel', 104, 618, 0, { solid: true }); w.prop('barrel', 106, 616, 0, { solid: true });
  C.hatch('soggy_bottom_hatch', 'Soggy Bottom Doggy Door', 134, 620, 0);
  C.loot(112, 602, 16, ['crate', 'ammo_box', 'medical_bag', 'backpack'], 1);
  for (const [x, z] of [[94, 600], [130, 584]]) w.lamp(x, z, { y: 3.2, color: 0xffc070, intensity: 1.4, range: 9, flicker: 0.3 });
  for (const b of BOARDWALKS) w.deck(b, 2.4, MARSH + 0.32, 'wood', { rails: false, pillars: false });

  // ---------------- Synergy Pumping Station (keeps the marsh exactly as soggy as the budget allows)
  const sp = C.B.pumpst = C.bld({ x: 168, z: 748, w: 28, d: 18, storeys: 2, name: 'Synergy Pumping Station', wall: 'brick', tint: 0xb89878, floor: 'concrete', roof: 'corrugated', roofTint: 0x4a6a8a,
    doors: [{ side: 'n', at: 12, w: 3.5 }, { side: 'w', at: 6, w: 2.2, door: true }, { side: 's', at: 4, w: 3, sill: 1.1 }, { side: 's', at: 20, w: 3, sill: 1.1 }, { side: 'e', at: 6, w: 3, sill: 1.1 }],
    inner: [[20, 0, 20, 18, [{ at: 7, w: 1.8 }]], [20, 0, 20, 18, [{ at: 12, w: 1.8 }], 1]], stairs: [{ x: 22, z: 1.4, w: 1.6, dir: 's', from: 0, to: 1 }] });
  for (const lx of [5, 12]) { C.P(sp, 'dg_pump', lx, 10, PI / 2, { solid: true }); C.P(sp, 'dg_valve', lx, 15, 0, { solid: true }); }
  C.Cn(sp, 'toolbox', 2, 2, 0, { tier: 2 }); C.Cn(sp, 'crate', 17, 16.4, 0, { tier: 1 }); C.IL(sp, 10, 9, 0xffd090, 1.3, 12);
  C.F(sp, 'workshop', 20, 0, 28, 18, { tier: 1 }); C.F(sp, 'control', 0, 0, 20, 18, { tier: 2, storey: 1 }); C.F(sp, 'bunk', 20, 0, 28, 18, { tier: 1, storey: 1 });
  for (const [x, z] of [[200, 752], [200, 760]]) w.prop('dg_bigpipe', x + 4, z, 0, { solid: true, scale: 0.7 });
  w.prop('dg_transformer', 160, 752, 0, { solid: true }); C.flood(166, 746, { rot: 0.3 });
}

// ==================================================================================== OUTSKIRTS
function outskirts(C) {
  const { w, rng } = C;
  // street lamps along the roads (not on the dam crest), work lights along the ledge road
  for (const r of ROADS) C.street(r, 36, 5.4, { notDam: true });
  C.street(LEDGE, 24, 2.6, { color: 0xffd090, i: 1.3, skip: (x, z) => C.gorgeAt(x, z) && w.groundAt(x, z) < LOW + 3 });
  // abandoned vehicles + barricades along the roads
  const cars = [[60, 338, 0.05], [236, 344, 1.5], [400, 349, 1.6], [312, 420, 1.3], [344, 552, 0.4], [300, 690, 1.6], [470, 512, 1.5], [540, 506, 1.6],
    [700, 470, 1.9], [880, 466, 1.5], [1060, 522, 1.2], [790, 354, 1.6], [960, 350, 1.4], [1050, 420, 0.05], [652, 560, 0.1], [646, 700, 0.3], [770, 270, 0.1]];
  for (const [x, z, r] of cars) { w.prop(C.chance(0.75) ? 'car' : 'dg_truck', x, z, r + C.R(-0.2, 0.2), { solid: true }); if (C.chance(0.6)) w.container('car_trunk', x + Math.cos(r) * 2.4, z - Math.sin(r) * 2.4, r, { tier: 1 }); }
  for (const [x, z, r] of [[502, 356, PI / 2], [502, 364, PI / 2], [716, 356, PI / 2], [716, 364, PI / 2], [600, 497, 0], [1052, 452, 0]]) w.prop('dg_barrier', x, z, r, { solid: true });
  // billboards (the ARK's notices are mostly about late payment)
  [[120, 326, 0], [470, 340, 0.2], [880, 342, -0.1], [436, 524, 0.1], [960, 476, 0.2], [312, 600, 0.05]].forEach(([x, z, r], i) => w.prop(['dg_billboard', 'dg_billboard2', 'dg_billboard3'][i % 3], x, z, r, { solid: true }));
  // ruins in the wilds
  for (const [x, z, bw, bd, rot] of [[30, 470, 10, 8, 0.2], [40, 760, 9, 7, -0.3], [470, 790, 10, 8, 0.4], [880, 760, 9, 7, 0.3], [1070, 470, 8, 7, -0.2], [520, 640, 8, 6, 0.6], [140, 140, 10, 8, -0.2]]) {
    const bb = C.bld({ x, z, w: bw, d: bd, rot, wall: C.pick(['brick', 'wood', 'corrugated']), roof: 'corrugated', floor: 'wood', name: 'Ruined Hut', blend: 2, doors: [{ side: 's', at: 2, w: 1.8 }, { side: 'e', at: 2, w: 2, sill: 1 }] });
    C.F(bb, C.pick(['storage', 'raider', 'living', 'bunk']), 0, 0, bw, bd, { tier: 1, light: C.chance(0.5) });
  }
  // husks + caches scattered in the wild
  const wild = [[60, 380], [150, 440], [230, 470], [60, 520], [180, 530], [380, 600], [420, 660], [520, 680], [700, 640], [760, 720], [860, 720], [960, 780], [1080, 760], [1080, 640],
    [1000, 580], [940, 460], [1070, 400], [1000, 320], [830, 330], [730, 300], [980, 150], [800, 160], [340, 300], [200, 230], [60, 240], [420, 420], [560, 560], [700, 520], [400, 760], [240, 800]];
  for (const [x, z] of wild) {
    if (C.blocked(x, z) || C.inDam(x, z, 4) || C.resAt(x, z) || C.marshAt(x, z) && w.groundAt(x, z) < MARSH) continue;
    const k = C.pick(['husk', 'husk', 'dg_huskbig', 'dg_container', 'car']);
    w.prop(k, x, z, C.R(0, 6.28), { solid: true });
    w.container(C.pick(['arc_husk', 'crate', 'trash', 'arc_crate', 'backpack']), x + 2.4, z + 1.6, 0, { tier: 1 });
  }
  // condition extras: Mass Layoffs leaves more wrecks around, Allergy Season grows more to pick
  for (const [x, z] of [[540, 300], [470, 440], [700, 410], [600, 640], [820, 700], [320, 560], [180, 360], [960, 360]]) {
    w.prop('dg_huskbig', x, z, rng() * 6, { solid: true, condition: 'husk_graveyard' });
    w.container('arc_husk', x + 2.6, z + 1.2, 0, { tier: 2, condition: 'husk_graveyard' });
  }
  for (const [x, z] of [[150, 650], [240, 720], [900, 700], [1000, 690], [430, 570], [880, 300], [300, 120], [1060, 230]]) w.container('plant', x, z, 0, { tier: 1, condition: 'lush_blooms' });
}

// ==================================================================================== VEGETATION + ROCKS
function vegetation(C) {
  const { w } = C;
  // rasterise everything vegetation must avoid into a 1 m bitmap (fast lookups for ~40k candidates)
  const AV = new Uint8Array(W * H);
  const markRect = (x0, z0, x1, z1) => { for (let z = Math.max(0, Math.floor(z0)); z < Math.min(H, Math.ceil(z1)); z++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) AV[z * W + x] = 1; };
  const markLine = (pts, r) => { for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
    for (let z = Math.max(0, Math.floor(Math.min(az, bz) - r)); z < Math.min(H, Math.ceil(Math.max(az, bz) + r)); z++) for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - r)); x < Math.min(W, Math.ceil(Math.max(ax, bx) + r)); x++)
      if (C.distLine(x + 0.5, z + 0.5, [[ax, az], [bx, bz]]) < r) AV[z * W + x] = 1; } };
  const markPoly = (pts) => { const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
    for (let z = Math.max(0, Math.floor(Math.min(...zs))); z < Math.min(H, Math.ceil(Math.max(...zs))); z++) for (let x = Math.max(0, Math.floor(Math.min(...xs))); x < Math.min(W, Math.ceil(Math.max(...xs))); x++) if (pointInPoly(x + 0.5, z + 0.5, pts)) AV[z * W + x] = 1; };
  for (const r of ROADS) markLine(r, 4.6);
  for (const r of TRACKS) markLine(r, 3);
  for (const b of BOARDWALKS) markLine(b, 2.2);
  markLine(LEDGE, 5); markLine(RIVER_PTS, 6.5); markLine(CREEK_PTS, 3.6);
  markPoly([...arc(ARCH.rIn - 10, -ARCH.half - 0.1, ARCH.half + 0.1, 30), ...arc(ARCH.rOut + 2, ARCH.half + 0.1, -ARCH.half - 0.1, 30)]);   // crest + toe
  markRect(CHUTE.x0 - 3, CHUTE.z0 - 4, CHUTE.x1 + 3, CHUTE.z1 + 22); markRect(BRIDGE.x0 - 4, BRIDGE.z - 7, BRIDGE.x1 + 4, BRIDGE.z + 7);
  markRect(710, 400, 900, 440); markRect(896, 425, 910, 472); markRect(1040, 425, 1064, 528); markRect(738, 471, 933, 612);
  for (const b of w.buildings) markPoly(b.R ? [[-0.8, -0.8], [b.x1 - b.x0 + 0.8, -0.8], [b.x1 - b.x0 + 0.8, b.z1 - b.z0 + 0.8], [-0.8, b.z1 - b.z0 + 0.8]].map(([a, c]) => w.local(b, a, c)) : [[b.x0 - 0.8, b.z0 - 0.8], [b.x1 + 0.8, b.z0 - 0.8], [b.x1 + 0.8, b.z1 + 0.8], [b.x0 - 0.8, b.z1 + 0.8]]);
  for (const [cx, cz, r] of C.clear) markLine([[cx, cz], [cx + 0.01, cz]], r);
  for (const [a0, b0, c0, d0] of C.clearRects) markRect(a0, b0, c0, d0);
  for (const [dx, dz] of C.doorPts) markRect(dx - 2.6, dz - 2.6, dx + 2.6, dz + 2.6);
  for (const [rx, rz, rr] of C.reserved) markRect(rx - rr, rz - rr, rx + rr, rz + rr);
  const avoidBase = (x, z) => x < 0 || z < 0 || x >= W || z >= H || AV[(z | 0) * W + (x | 0)] === 1 || C.resAt(x, z) && w.groundAt(x, z) < RES_WATER + 0.3;
  const wet = (x, z) => C.marshAt(x, z) && w.groundAt(x, z) < MARSH - 0.6;
  // forests: NW + NE hills, the wooded west slope, the Ant Hills, the marsh, the south rim
  w.forest(NW_HILLS, 1.7, ['pine', 'pine', 'tree'], { seed: 301, avoid: avoidBase });
  w.forest(NE_HILLS, 1.6, ['pine', 'pine', 'deadTree', 'pine'], { seed: 302, avoid: avoidBase });
  const westSlope = [[-4, 388], [150, 404], [282, 398], [292, 440], [262, 472], [150, 476], [60, 486], [-4, 480]];
  w.forest(westSlope, 2.0, ['pine', 'tree', 'pine'], { seed: 303, avoid: avoidBase, scaleVar: 0.35 });
  w.forest([[340, 396], [470, 404], [520, 440], [470, 452], [400, 446]], 1.4, ['tree', 'pine'], { seed: 304, avoid: avoidBase });
  w.forest(ANT_HILLS, 1.5, ['pine', 'tree', 'deadTree', 'pine'], { seed: 305, avoid: (x, z) => avoidBase(x, z) || Math.hypot(x - 946, z - 690) < 36 || Math.hypot(x - 1030, z - 776) < 24 });
  w.forest(MARSH_POLY, 1.5, ['dg_willow', 'dg_cypress', 'dg_cypress', 'tree'], { seed: 306, avoid: (x, z) => avoidBase(x, z) || wet(x, z), scaleVar: 0.35 });
  w.forest([[380, 782], [860, 784], [860, 826], [380, 826]], 1.0, ['pine', 'tree'], { seed: 307, avoid: avoidBase });
  w.forest([[-4, 486], [60, 492], [90, 548], [-4, 548]], 1.4, ['pine', 'tree'], { seed: 308, avoid: avoidBase });
  w.forest([[150, 160], [250, 170], [260, 210], [160, 200]], 1.1, ['tree', 'pine'], { seed: 310, avoid: avoidBase });
  w.forest([[960, 236], [1060, 260], [1060, 330], [980, 340]], 0.9, ['pine', 'tree'], { seed: 311, avoid: avoidBase });
  w.forest([[700, 440], [740, 450], [736, 470], [690, 470]], 1.2, ['tree', 'dg_willow'], { seed: 312, avoid: avoidBase });
  w.forest([[1060, 250], [1104, 250], [1104, 440], [1070, 440]], 0.6, ['pine', 'tree'], { seed: 309, avoid: avoidBase });
  // groves + shrubs on the plateaus (kept loose so the long sightlines stay)
  for (const [poly, d, seed] of [[[[350, 290], [420, 296], [430, 330], [356, 330]], 1.3, 321], [[[20, 330], [80, 340], [90, 380], [20, 384]], 1.2, 322], [[[240, 196], [276, 200], [280, 230], [244, 226]], 1.2, 323],
    [[[730, 300], [760, 300], [762, 344], [732, 344]], 1.1, 324], [[[960, 380], [1030, 380], [1030, 420], [960, 424]], 1.0, 325], [[[790, 300], [850, 304], [850, 340], [790, 340]], 0.9, 326]]) w.forest(poly, d, ['tree', 'pine', 'tree'], { seed, avoid: avoidBase });
  w.scatter('bush', [20, 150, 480, 400], 260, { seed: 331, avoid: avoidBase });
  w.scatter('bush', [710, 150, 1100, 430], 240, { seed: 332, avoid: avoidBase });
  w.scatter('bush', [0, 430, 1100, 825], 380, { seed: 333, avoid: (x, z) => avoidBase(x, z) || wet(x, z) });
  // scattered trees: plateaus, lowlands, the river banks; dead trees + bushes on the gorge floor
  w.scatter('tree', [20, 160, 470, 390], 70, { solid: true, seed: 401, avoid: avoidBase });
  w.scatter('tree', [720, 150, 1100, 400], 60, { solid: true, seed: 402, avoid: avoidBase });
  w.scatter('tree', [200, 440, 1100, 780], 150, { solid: true, seed: 403, avoid: (x, z) => avoidBase(x, z) || C.marshAt(x, z) });
  w.scatter('dg_willow', [300, 480, 640, 800], 40, { solid: true, seed: 404, avoid: (x, z) => avoidBase(x, z) || C.distLine(x, z, RIVER_PTS) > 14 });
  w.scatter('dg_willow', [600, 600, 1100, 700], 30, { solid: true, seed: 405, avoid: (x, z) => avoidBase(x, z) || C.distLine(x, z, CREEK_PTS) > 10 });
  w.scatter('deadTree', GORGE, 40, { solid: true, seed: 406, avoid: avoidBase });
  w.scatter('bush', GORGE, 120, { seed: 407, avoid: avoidBase });
  // rocks: outcrops + general scatter
  const outcrop = (cx, cz, r, n, s = 2) => C.clutter(cx, cz, r, n, ['rock'], { scale: s, scaleVar: 0.6, avoid: (x, z) => avoidBase(x, z) });
  for (const [x, z, r, n, s] of [[100, 60, 30, 14, 2.8], [190, 40, 24, 10, 2.6], [40, 130, 22, 9, 2.4], [960, 60, 30, 14, 2.8], [1060, 100, 30, 12, 3], [900, 120, 18, 8, 2.4],
    [1000, 700, 24, 10, 2.4], [1060, 790, 26, 10, 2.6], [880, 780, 22, 9, 2.2], [480, 440, 18, 8, 2], [520, 400, 14, 6, 2.2], [690, 420, 14, 6, 2.2], [40, 600, 18, 7, 2],
    [420, 620, 14, 6, 1.8], [740, 640, 14, 6, 1.8], [1080, 440, 16, 7, 2.2], [980, 420, 16, 6, 1.8], [160, 520, 16, 6, 1.8], [560, 470, 16, 7, 2], [300, 790, 18, 7, 2]]) outcrop(x, z, r, n, s);
  w.scatter('rock', [0, 0, W, H], 480, { solid: true, seed: 408, scale: 1.2, scaleVar: 0.6, avoid: (x, z) => avoidBase(x, z) || C.marshAt(x, z) || C.resAt(x, z) });
  // ground cover
  w.scatter('dg_reeds', MARSH_POLY, 1200, { seed: 501, scaleVar: 0.4, avoid: (x, z) => { const g = w.groundAt(x, z); return g > MARSH + 0.25 || g < MARSH - 0.7 || avoidBase(x, z); } });
  w.scatter('dg_lily', MARSH_POLY, 300, { seed: 502, avoid: (x, z) => w.groundAt(x, z) > MARSH - 0.25 || avoidBase(x, z) });
  for (const p of w.props) if (p.kind === 'dg_lily') p.opts.yAbs = MARSH + 0.02;
  w.scatter('dg_reeds', [300, 200, 1100, 825], 520, { seed: 503, avoid: (x, z) => { const d = Math.min(C.distLine(x, z, RIVER_PTS), C.distLine(x, z, CREEK_PTS) + 2); return d < 4.4 || d > 9 || (AV[(z | 0) * W + (x | 0)] === 1 && d > 7); } });
  w.scatter('dg_reeds', RESERVOIR, 260, { seed: 504, avoid: (x, z) => { const g = w.groundAt(x, z); return g > RES_WATER + 0.3 || g < RES_WATER - 0.5 || C.inDam(x, z, 6); } });
  w.scatter('dg_grass', MARSH_POLY, 1200, { seed: 506, avoid: (x, z) => w.groundAt(x, z) < MARSH || avoidBase(x, z) });
  w.scatter('dg_grass', [0, 0, W, H], 2800, { seed: 507, avoid: (x, z) => avoidBase(x, z) || C.marshAt(x, z) || C.resAt(x, z) });
  w.scatter('dg_log', MARSH_POLY, 60, { solid: true, seed: 508, avoid: avoidBase });
  w.scatter('dg_stump', MARSH_POLY, 50, { solid: true, seed: 509, avoid: avoidBase });
  w.scatter('dg_toxic', MARSH_POLY, 24, { solid: true, seed: 510, avoid: avoidBase });
  w.scatter('dg_log', ANT_HILLS, 40, { solid: true, seed: 511, avoid: avoidBase });
  w.scatter('debris', [440, 150, 1000, 640], 260, { seed: 512, avoid: (x, z) => C.inBuilding(x, z, 0.5) || C.resAt(x, z) });
  w.scatter('dg_rubble', GORGE, 40, { solid: true, seed: 513, scale: 1.1, avoid: (x, z) => avoidBase(x, z) || C.propHit(x - 2, z - 2, x + 2, z + 2) });
  // nature loot in the marsh, the woods and the Ant Hills; buried raider caches in the wilds
  const lootScatter = (area, n, kinds, tier, seed, extraAvoid) => {
    const r = C.rng; let placed = 0, tries = 0;
    const [a0, b0, c0, d0] = Array.isArray(area[0]) ? [Math.min(...area.map(p => p[0])), Math.min(...area.map(p => p[1])), Math.max(...area.map(p => p[0])), Math.max(...area.map(p => p[1]))] : area;
    while (placed < n && tries++ < n * 40) {
      const x = a0 + r() * (c0 - a0), z = b0 + r() * (d0 - b0);
      if (Array.isArray(area[0]) && !pointInPoly(x, z, area)) continue;
      if (avoidBase(x, z) || C.propHit(x - 0.6, z - 0.6, x + 0.6, z + 0.6) || (extraAvoid && extraAvoid(x, z))) continue;
      w.container(kinds[placed % kinds.length], x, z, r() * 2 * PI, { tier }); placed++;
    }
  };
  lootScatter(MARSH_POLY, 30, ['plant', 'basket', 'plant', 'backpack'], 1, 601, (x, z) => w.groundAt(x, z) < MARSH + 0.05);
  lootScatter(westSlope, 16, ['plant', 'basket', 'trash'], 1, 602);
  lootScatter(ANT_HILLS, 18, ['plant', 'basket', 'trash', 'backpack'], 1, 603);
  lootScatter([0, 0, W, H], 14, ['raider_cache'], 2, 604, (x, z) => C.marshAt(x, z) || C.resAt(x, z) || C.gorgeAt(x, z));
  lootScatter(GORGE, 10, ['arc_husk', 'trash', 'crate'], 1, 605, (x, z) => w.groundAt(x, z) > LOW + 2);
  for (const b of w.buildings) {                       // a bin or crate outside most buildings
    if (b.under || b.x1 - b.x0 < 7 || C.rng() < 0.35) continue;
    const [x, z] = w.local(b, -1.4, b.z1 - b.z0 + 1.6);
    const gy = w.groundAt(x, z), by = w.groundAt((b.ax0 + b.ax1) / 2, (b.az0 + b.az1) / 2);
    if (Math.abs(gy - by) < 0.6 && !C.propHit(x - 0.6, z - 0.6, x + 0.6, z + 0.6) && !C.nearDoor(x, z, x, z, 1.6) && !C.inBuilding(x, z, 0.6) && !C.resAt(x, z)) w.container(C.rng() < 0.6 ? 'trash' : 'crate', x, z, 0, { tier: 1 });
  }
  // extraction rigs keep their footprint, call gantry and approach (rig-local, see C.lift) free of loose ground
  // clutter; hatches keep 2 m. Removed after the fact: no random draws, nothing else moves.
  const LOOSE = new Set(['debris', 'dg_rubble', 'dg_grass', 'dg_reeds', 'bush', 'rock', 'dg_log', 'dg_stump', 'deadTree', 'tree', 'pine', 'dg_toxic', 'dg_willow', 'dg_cypress']);
  const inRig = (x, lx, lz) => (x.kind === 'hatch' ? Math.hypot(lx, lz) < 2.0
    : (Math.abs(lx) < 4.4 && lz > -4.4 && lz < 5.6) || (Math.abs(lx) < 1.9 && lz > 0 && lz < 9.6) || (lx > 2.2 && lx < 4.3 && lz > 3.6 && lz < 6.8));
  for (const x of w.extracts) {
    const c = Math.cos(x.face || 0), s = Math.sin(x.face || 0);
    w.props = w.props.filter(p => {
      if (!LOOSE.has(p.kind) || Math.abs(p.x - x.x) > 12 || Math.abs(p.z - x.z) > 12) return true;
      const dx = p.x - x.x, dz = p.z - x.z;
      return !inRig(x, dx * c - dz * s, dx * s + dz * c);
    });
  }
}

// ==================================================================================== ARK
function arkSpawns(C) {
  const { w } = C;
  const A = (k, x, z, o = {}) => w.arkSpawn(k, x, z, o);
  const B = C.B;
  const centre = (bb) => C.Wp(bb, (bb.x1 - bb.x0) / 2, (bb.z1 - bb.z0) / 2);
  const onRoof = (bb, lx, lz) => [...C.Wp(bb, lx, lz), { radius: 0, yAbs: C.roofY(bb) }];
  // Neighborhood Watch snipers on the tall roofs + a mast in the middle of the crest
  for (const [k, lx, lz] of [['ivory', 6, 7], ['bneck', 6, 10], ['paywall', 30, 12], ['ghw', 14, 8], ['synergy', 20, 30], ['qa', 30, 16], ['wtc', 20, 15]]) { const bb = B[k]; if (!bb) continue; const [x, z, o] = onRoof(bb, lx, lz); A('sentinel', x, z, o); }
  { const [x, z] = archPt(CREST_R + 2.4, -0.21); w.prop('dg_sentmast', x, z, 0, { solid: true }); A('sentinel', x, z, { radius: 0, y: 4.2 }); }
  // Wallflower turrets on roofs (clear of roof plant, ladder heads and masts)
  for (const [k, lx, lz] of [['gh', 26, 16], ['gh', 52, 6], ['paywall', 8, 24], ['fctrl', 6, 8], ['sub', 6, 4], ['pumpHall', 10, 8], ['mshop', 8, 9], ['kale', 4, 4], ['pumpst', 8, 8], ['repo', 15, 5]]) {
    const bb = B[k]; if (!bb) continue;
    const [x, z, o] = onRoof(bb, lx, lz); A('turret', x, z, o);
  }
  // Buzzkills on patrol loops
  const loops = [
    [[80, 220], [180, 200], [200, 300], [90, 310]], [[260, 210], [370, 210], [380, 290], [270, 300]], [[400, 200], [470, 230], [460, 300], [400, 300]],
    [[520, 220], [640, 220], [650, 300], [530, 300]], [[540, 330], [660, 330], [650, 440], [550, 440]], [[740, 230], [860, 230], [860, 330], [740, 320]],
    [[880, 180], [1040, 190], [1040, 300], [900, 330]], [[740, 360], [900, 370], [900, 410], [740, 410]], [[320, 470], [450, 470], [450, 540], [330, 540]],
    [[430, 530], [540, 530], [540, 620], [430, 620]], [[640, 520], [730, 520], [730, 600], [640, 600]], [[760, 480], [920, 480], [920, 600], [760, 600]],
    [[950, 480], [1060, 490], [1060, 560], [950, 560]], [[520, 680], [640, 680], [640, 760], [520, 760]], [[720, 640], [880, 640], [880, 720], [720, 720]],
    [[900, 650], [1040, 660], [1040, 780], [920, 770]], [[200, 590], [320, 590], [340, 720], [220, 700]], [[60, 560], [170, 570], [190, 700], [60, 720]],
    [[200, 740], [380, 740], [400, 800], [220, 810]],
  ];
  loops.forEach((p, i) => A('wasp', p[0][0], p[0][1], { count: i % 3 === 0 ? 3 : 2, radius: 8, patrol: p }));
  // Middle Managers round the high-value spots
  for (const [x, z, p] of [[816, 262, [[790, 230], [850, 250], [840, 300]]], [432, 230, [[410, 210], [460, 240], [430, 260]]], [585, 200, [[550, 196], [620, 200], [600, 230]]],
    [312, 240, [[290, 220], [340, 240], [320, 270]]], [990, 524, [[960, 500], [1020, 520], [990, 550]]], [390, 492, [[360, 470], [430, 480], [410, 520]]],
    [692, 560, [[660, 540], [720, 560], [700, 590]]], [916, 292, [[880, 270], [950, 300], [900, 320]]]]) A('hornet', x, z, { count: 1, radius: 6, patrol: p });
  // Late Fees lurking indoors: ground floors, upper floors, the tunnels
  for (const k of ['gh', 'ghw', 'synergy', 'ivory', 'flatsA', 'villa', 'show', 'paywall', 'fctrl', 'kale', 'wtc', 'pumpHall', 'sub', 'qa', 'retain', 'farm']) if (B[k]) A('tick', ...centre(B[k]), { count: 2, radius: 4 });
  for (const [k, s] of [['synergy', 1], ['ivory', 3], ['flatsB', 2], ['paywall', 1], ['qa', 1], ['ghw', 2], ['ladder', 2]]) if (B[k]) A('tick', ...centre(B[k]), { count: 1, radius: 4, yAbs: C.storeyY(B[k], s) + 0.05 });
  for (const k of ['fgal', 'fat', 'cvault', 'bunker']) if (B[k]) A('tick', ...centre(B[k]), { count: 2, radius: 5, yAbs: B[k].fy + 0.05 });
  // Pop-Up Ads in the marsh, the woods and the battlefield
  for (const [x, z] of [[120, 680], [60, 760], [150, 450], [480, 600], [900, 720], [1000, 640], [760, 700], [600, 650]]) A('pop', x, z, { count: 3, radius: 10 });
  // Hot Takes in the industrial bits
  for (const [x, z] of [[600, 230], [400, 500], [692, 560], [575, 726], [1018, 228], [816, 262]]) A('fireball', x, z, { count: 2, radius: 6 });
  // Narcs over open ground
  for (const [x, z, p] of [[600, 300, [[560, 280], [640, 300], [600, 340]]], [835, 540, [[780, 510], [890, 520], [850, 590]]], [300, 340, [[240, 330], [360, 350]]], [700, 700, [[650, 680], [760, 700]]],
    [1000, 360, [[960, 340], [1060, 370]]], [200, 640, [[150, 620], [260, 660]]]]) A('snitch', x, z, { radius: 6, patrol: p });
  // Data Miners (high loot, flee) in open terrain
  for (const [x, z, p] of [[835, 540, [[770, 500], [900, 520], [850, 600]]], [560, 420, [[530, 380], [600, 460]]], [980, 740, [[940, 720], [1040, 760]]], [120, 520, [[80, 500], [160, 540]]]]) A('surveyor', x, z, { patrol: p, radius: 8 });
  // Rocket Surgeons over the gorge, the lowlands and the plateaus
  for (const [x, z, p] of [[590, 300, [[540, 250], [650, 300], [600, 400]]], [835, 540, [[760, 500], [920, 560]]], [480, 640, [[420, 600], [560, 680]]], [880, 300, [[820, 260], [960, 330]]], [200, 260, [[140, 240], [280, 300]]]]) A('rocketeer', x, z, { patrol: p, radius: 10 });
  // Parkour Dads roam (the one at the ponds stands down while the Landlady holds them)
  A('leaper', 835, 560, { patrol: [[780, 520], [900, 540], [850, 600]], radius: 12, notCondition: 'harvester' });
  for (const [x, z, p] of [[600, 700, [[560, 680], [660, 720]]], [1020, 400, [[980, 380], [1060, 420]]], [150, 400, [[100, 380], [220, 420]]], [960, 720, [[920, 700], [1020, 760]]]]) A('leaper', x, z, { patrol: p, radius: 12 });
  // HOA Presidents: heavy walkers on the crest, the gorge floor, the plateaus
  for (const [x, z, p] of [[585, 158, [archPt(CREST_R, -0.5), archPt(CREST_R, 0.5)]], [600, 280, [[560, 250], [640, 320]]], [860, 360, [[800, 352], [960, 350]]], [350, 600, [[320, 580], [400, 620]]], [760, 760, [[700, 740], [820, 780]]]]) A('bastion', x, z, { patrol: p, radius: 10 });
  // Shell Companies + their Plus Ones
  A('bombardier', 940, 460, { radius: 8, notCondition: 'harvester' }); A('spotter', 880, 480, { radius: 10, patrol: [[850, 470], [920, 490]] });
  A('bombardier', 240, 560, { radius: 8 }); A('spotter', 300, 580, { radius: 10, patrol: [[270, 560], [330, 600]] });
  A('bombardier', 1040, 160, { radius: 8 }); A('spotter', 980, 200, { radius: 10, patrol: [[950, 180], [1010, 220]] });
  // condition-only groups: the Landlady's escort at the Red Ink Lakes, Helicopter Mom's brood over Recess Park,
  // Night Shift Hot Takes, an Audit Season Narc on the dam crest
  A('hornet', 835, 540, { count: 2, radius: 16, condition: 'harvester', patrol: [[790, 500], [880, 510], [880, 580], [790, 590]] });
  A('rocketeer', 835, 560, { count: 1, radius: 10, condition: 'harvester', patrol: [[780, 540], [900, 560]] });
  A('wasp', 257, 634, { count: 3, radius: 12, condition: 'matriarch', patrol: [[230, 610], [285, 610], [285, 658], [230, 658]] });
  A('hornet', 270, 640, { count: 2, radius: 10, condition: 'matriarch', patrol: [[240, 620], [290, 650]] });
  A('fireball', 480, 570, { count: 2, radius: 8, condition: 'night_raid' }); A('fireball', 120, 700, { count: 2, radius: 8, condition: 'night_raid' }); A('fireball', 920, 290, { count: 2, radius: 8, condition: 'night_raid' });
  A('snitch', 585, 156, { radius: 6, condition: 'close_scrutiny', patrol: [archPt(CREST_R, -0.6), archPt(CREST_R, 0), archPt(CREST_R, 0.6)] });
}

// ==================================================================================== MARKERS
function markers(C) {
  const { w } = C;
  const P = (id, name, x, z, r, tier, extra = {}) => w.poi(id, name, x, z, r, { tier, aliases: [], ...extra });
  // west plateau
  P('rubie_residence', 'Golden Handshake Villa', 222, 116, 36, 2);
  P('overdue_reservoir', 'Overdue Reservoir', 300, 150, 30, 1);
  P('pale_apartments', 'Shoebox Flats', 88, 238, 40, 2);
  P('pattern_house', 'The Show Home', 202, 382, 32, 2);
  P('research_and_administration', 'Department of Synergy', 312, 240, 36, 3);
  P('control_tower', 'The Ivory Tower', 432, 230, 28, 3);
  P('pipeline_tower', 'The Bottleneck', 420, 132, 34, 2);
  // the dam + the gorge
  P('dam_crest', 'The Damn Dam', 585, 160, 70, 2);
  P('power_generation_complex', 'Synergy Power & Light (In Receivership)', 590, 230, 82, 2, { hideLabel: true });
  P('generator_hall', 'The Hamster Wheel', 576, 180, 36, 2);
  P('corporate_ladder', 'The Corporate Ladder', 693, 251, 14, 1);
  P('spillway_hatch', 'The Spillway of Regret', 712, 298, 28, 1);
  P('west_broken_bridge', 'The Bridge To Nowhere', 548, 362, 34, 1);
  // east plateau
  P('floodgates', 'Floodgates of Feedback', 740, 206, 32, 2);
  P('controlled_access_zone', 'The Paywall', 816, 262, 44, 3);
  P('hydroponic_dome_complex', 'The Kale Bubble', 916, 292, 50, 2);
  P('impound_lot', 'The Impound Lot', 928, 200, 40, 2);
  P('raider_outpost_east', 'The Eastside Squat', 1020, 222, 36, 1);
  P('red_lakes_balcony', 'Bottom Line Balcony', 796, 414, 50, 2);
  // lowlands + the south
  P('water_treatment_control', 'Liquid Assets Water Treatment', 400, 494, 50, 2);
  P('old_battleground', 'Beta Test Battlefield', 482, 574, 46, 2);
  P('electrical_substation', 'Surge Pricing Substation', 692, 560, 40, 2);
  P('red_ink_lakes', 'The Red Ink Lakes', 850, 580, 100, 2, { bossPoi: ['queene'] });
  P('testing_annex', 'Works-On-My-Machine Annex', 962, 522, 52, 3);
  P('small_creek', 'Without-A-Paddle Creek', 790, 664, 38, 1);
  P('formikai_outpost', 'The Ant Farm', 944, 688, 40, 2);
  P('wreckage', 'Total Write-Off', 1030, 776, 30, 2);
  P('scrap_yard', 'Final Sale Scrapyard', 582, 728, 46, 2);
  P('recess_park', 'Recess Park', 257, 634, 42, 1, { bossPoi: ['matriark'] });
  P('water_towers', 'Drip Pricing Towers', 338, 702, 26, 1);
  P('south_swamp_outpost', 'Soggy Bottom Outpost', 106, 592, 34, 1);
  P('synergy_pumping_station', 'Synergy Pumping Station', 182, 757, 28, 1);
  P('overdraft_acres', 'Overdraft Acres', 180, 496, 36, 1);
  P('subprime_trailer_park', 'Subprime Trailer Park', 1040, 560, 40, 1);
  // player insertion points round the edges
  for (const [x, z] of SPAWNS) w.spawnPoint(x, z);
  // loot tier zones
  w.zone('Outskirts', [[0, 0], [W, 0], [W, H], [0, H]], { tier: 1 });
  const Z = (name, tier, x0, z0, x1, z1) => w.zone(name, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], { tier });
  Z('Synergy Power & Light', 2, 470, 150, 710, 260); Z('The Paywall', 3, 776, 232, 856, 292); Z('The Ivory Tower', 3, 404, 204, 470, 252); Z('Department of Synergy', 3, 280, 214, 344, 266);
  Z('Works-On-My-Machine Annex', 3, 960, 506, 1028, 546); Z('The Kale Bubble', 2, 870, 252, 968, 332); Z('The Impound Lot', 2, 880, 178, 960, 228); Z('Floodgates of Feedback', 2, 712, 190, 800, 290);
  Z('Golden Handshake Villa', 2, 186, 88, 250, 148); Z('Shoebox Flats', 2, 60, 200, 128, 272); Z('The Show Home', 2, 160, 350, 236, 412); Z('Liquid Assets Water Treatment', 2, 340, 456, 446, 540);
  Z('Beta Test Battlefield', 2, 436, 524, 530, 624); Z('Surge Pricing Substation', 2, 660, 528, 726, 592); Z('The Red Ink Lakes', 2, 738, 471, 933, 612); Z('Final Sale Scrapyard', 2, 536, 696, 614, 754);
  Z('The Ant Farm', 2, 910, 660, 980, 720); Z('The Bottleneck', 2, 405, 96, 436, 176); Z('Bottom Line Balcony', 2, 712, 390, 900, 430);
}
