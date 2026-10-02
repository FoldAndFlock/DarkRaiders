// Damn Grounds — top-down adaptation of ARC Raiders' Dam Battlegrounds (1100 x 825 m, north up).
// Reference: docs/ref/dam_annotated.jpg (POIs, extracts, spawns, key rooms, Sentinels, Baron husks,
// depots), mapped as  X = px/2 - 90,  Z = py/2 - 18  (px,py in the 2400x1800 annotated image), and the
// clean blank render for building footprints. See docs/research/map_damn_grounds.md.
// Three terrain tiers: LOW = spillway basin / Red Lakes (east of the dam), MID = swamp, forests and
// ruins (west + south), HIGH = dam crest, Power Generation plateau and the Red Lakes Balcony.
// The dam and everything on it is laid out in its own frame turned 30° (like the reference): design
// coords (u, v) are metres from (650, 300) with u pointing to the basin (ESE) and v running down the dam
// (SSW). Other turned POIs (Water Treatment, Rubie Residence, Testing Annex, ...) get their own frames.
import './props_damn_grounds.js';
import { waterMaterial } from '../engine/materials.js';
import { pointInPoly, mulberry, rotFrame, rotPt, unrotPt } from '../engine/world.js';
import { TID } from '../engine/textures.js';
import { propInfo } from '../engine/models.js';

const W = 1100, H = 825;
const LOW = 0, MID = 3, HIGH = 9;
const SWAMP_WATER = 2.62;
const PI = Math.PI;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (t) => t * t * (3 - 2 * t);
const sm = (e0, e1, v) => smooth(clamp((v - e0) / (e1 - e0), 0, 1));
const lerp = (a, b, t) => a + (b - a) * t;

// ------------------------------------------------------------------------------------ frames
// A frame turns design coords (X, Z) by angle a about the pivot (px, pz); off shifts design coords first
// (the dam frame uses off = pivot so its design coords are plain (u, v) offsets).
function frame(px, pz, a, offX = 0, offZ = 0) { return { px, pz, a, c: Math.cos(a), s: Math.sin(a), offX, offZ, R: rotFrame(px, pz, a) }; }
function GW(G, X, Z) { const rx = X + G.offX - G.px, rz = Z + G.offZ - G.pz; return [G.px + rx * G.c - rz * G.s, G.pz + rx * G.s + rz * G.c]; }
function GL(G, x, z) { const dx = x - G.px, dz = z - G.pz; return [G.px - G.offX + dx * G.c + dz * G.s, G.pz - G.offZ - dx * G.s + dz * G.c]; }
function GR(G, X0, Z0, X1, Z1) { return [GW(G, X0, Z0), GW(G, X1, Z0), GW(G, X1, Z1), GW(G, X0, Z1)]; }
const DAM = frame(650, 300, PI / 6, 650, 300);
const L = (u, v) => GW(DAM, u, v);
const toL = (x, z) => GL(DAM, x, z);
const LP = (pts) => pts.map(([u, v]) => L(u, v));
const G_WTC = frame(382, 436, -PI / 12);     // Water Treatment Control (-15°)
const G_RUB = frame(370, 84, -PI / 12);      // Rubie Residence
const G_PALE = frame(258, 170, -PI / 12);    // Pale Apartments
const G_BEN = frame(338, 200, -PI / 12);     // Ben Welda's Sunroof
const G_TA = frame(728, 630, -PI / 3);       // Testing Annex (-60°, i.e. the dam frame turned 90°)
const G_SS = frame(385, 580, PI / 6);        // Electrical Substation
const G_ET = frame(852, 630, PI / 6);        // Electrical Tower
const G_PH = frame(903, 297, PI / 6);        // Pump House

// ------------------------------------------------------------------------------------ dam layout (u, v)
const CHUTES = [52, 66, 80, 94, 108, 122, 136];               // spillway chute centres (v), 8 m wide, u 18..58
const PIERS = [[18, 40, 54, 48]].concat(CHUTES.map((c, i) => [18, c + 4, 54, i < CHUTES.length - 1 ? CHUTES[i + 1] - 4 : 150]));
const DAM_HIGH = [
  [-100, -201, 82, -112],     // Power Generation plateau (Generator Hall, Power Control, transformer yards, turbine pits)
  [82, -201, 140, -138],      // its east wing (switchgear, cable hall, gatehouse, field depot)
  [-60, -112, 25, -40],       // upper dam: Controlled Access Zone
  [25, -112, 82, -54],        // Pipeline Tower deck
  [-42, -40, 12, -26],        // broken stub above The Breach
  [-32, 40, 18, 152],         // Floodgates crest
  [-50, 150, 82, 242],        // south platform: Primary Facility, Control Tower, Research & Administration
  [-104, 200, -50, 240],      // west wing toward Water Treatment
  [78, 172, 286, 184],        // Red Lakes Balcony walkway
  ...PIERS,
];
const PITS = [[-30, -140, -15, -118], [-5, -140, 9, -118], [31, -140, 45, -118], [55, -140, 69, -118]];   // flooded turbine shafts
const HIGHWAY_L = [[-170, -206], [175, -206]], EBB_L = [[175, -206], [218, -206]], WBB_L = [[-268, -195], [-215, -195]];
const DECK_RECTS = [[-170, -210.5, 175, -201.5], [175, -210.5, 186, -201.5], [-268, -200, -250, -190]];   // terrain decks (the rest of both broken bridges are real bridges)
const CREST_ROADS = [[[-100, -158], [140, -158]], [[14, -158], [14, -40]], [[4, 40], [4, 150], [18, 192], [14, 242]]];
const HIGHWAY = LP(HIGHWAY_L), EBB = LP(EBB_L), WBB = LP(WBB_L);

// ------------------------------------------------------------------------------------ world layout data
const BASIN = [...LP([[82, -138], [140, -138]]), [905, 262], [928, 330], [934, 420], [930, 520], [900, 578], [850, 596],
  ...LP([[286, 172], [80, 172], [80, 150], [18, 150], [18, 40], [25, -40], [25, -56], [82, -56]])];
const NE_HIGHLAND = [[560, -6], [1106, -6], [1106, 238], ...LP([[230, -212], [-170, -212]])];
const SWAMP = [[168, 212], [300, 196], [420, 206], [560, 228], [604, 262], [596, 300], [575, 330], [556, 372], [540, 404], [470, 412], [420, 404], [362, 408], [345, 450], [322, 512], [292, 548], [226, 548], [180, 522], [172, 452], [176, 380], [172, 300]];
const RED_LAKES = [[742, 432, 25, 1.1], [814, 494, 20, 0.8], [702, 494, 12, 0.5], [862, 402, 17, 1.6], [792, 380, 12, 2.3], [884, 524, 12, 0.3]];
const ROADS = [
  [[450, -2], [450, 40]],
  [[450, 40], [442, 78], [420, 106], [390, 126], [350, 150], [310, 175], [270, 200], [228, 224], [192, 244], [160, 266]],
  [[450, 40], [462, 64], [482, 88], [518, 97], [552, 104], [590, 104], [612, 98], [628, 92]],
  [[160, 266], [164, 300], [166, 339], [162, 375], [146, 408], [118, 440], [78, 466], [30, 490], [-2, 506]],
  [[160, 266], [128, 262], [100, 246], [86, 218], [86, 186], [100, 160], [122, 142], [150, 128]],
  [[-2, 566], [60, 566], [120, 565], [175, 560], [233, 556], [280, 546], [330, 531], [370, 512], [405, 496], [436, 488]],
  [[290, 827], [318, 752], [360, 690], [417, 625], [445, 585], [470, 552], [492, 530]],
  [[436, 488], [468, 508], [492, 530], [540, 562], [600, 598], [650, 606], [700, 598]],
];
const TRACKS = [
  [[417, 625], [428, 660], [450, 690], [482, 700], [520, 706], [570, 714], [620, 730], [660, 738], [700, 745], [760, 752], [800, 757], [850, 770]],
  [[482, 700], [492, 740], [508, 770], [520, 784]],
  [[676, 318], [720, 352], [770, 398], [800, 440], [840, 468], [880, 482], [918, 466]],
  [[884, 236], [890, 262], [884, 290]],
  [[905, 262], [940, 246], [980, 222], [1020, 210], [1060, 222], [1102, 216]],
  [[928, 330], [960, 322], [990, 350], [1030, 334], [1070, 352], [1102, 346]],
  [[932, 430], [975, 452], [1010, 480], [1060, 470], [1102, 482]],
  [[850, 770], [880, 760], [910, 745], [950, 760], [990, 776], [1040, 760], [1070, 736], [1102, 728]],
  [[700, 598], [760, 604], [800, 612], [830, 618]],
  [[150, 128], [120, 100], [70, 92], [20, 60]],
  [[175, 560], [190, 610], [200, 650], [230, 690], [262, 720], [292, 760]],
  [[700, 745], [740, 704], [760, 668]],
];
const SPAWNS = [[591, 17], [698, 40], [487, 73], [350, 80], [780, 114], [866, 136], [247, 141], [174, 322], [169, 447], [727, 262], [870, 306], [592, 436],
  [247, 566], [464, 600], [849, 554], [833, 616], [273, 663], [393, 709], [656, 734], [473, 746], [794, 758], [589, 795]];
// boardwalks across the swamp (raised wooden decks)
const BOARDWALKS = [
  [[279, 330], [310, 326], [340, 330], [355, 334]],
  [[355, 334], [372, 318], [400, 300], [430, 290], [458, 284]],
  [[355, 334], [362, 360], [372, 386], [380, 404]],
  [[288, 414], [300, 440], [272, 470], [244, 482]],
  [[288, 414], [320, 404], [345, 380], [355, 350]],
  [[458, 284], [470, 262], [478, 244]],
];
// ground preparation (applied before ramps) [x0,z0,x1,z1,h|null,blend]
const FLATS = [
  [396, 420, 480, 502, MID + 0.2, 3],        // water treatment plaza
  [472, 502, 516, 544, MID, 4],              // clarifier yard
  [888, 280, 920, 314, LOW + 0.7, 3],        // Pump House
  [756, 474, 774, 490, LOW + 0.5, 2],        // Spillway Hatch
  [690, 590, 768, 672, MID + 0.3, 4],        // Testing Annex
  [826, 606, 878, 656, MID + 0.2, 4],        // Electrical Tower
  [344, 535, 428, 622, MID + 0.2, 4],        // Electrical Substation
  [270, 616, 330, 664, MID + 0.1, 4],        // Water Towers
  [238, 596, 276, 618, MID + 0.1, 3],        // football pitch
  [226, 532, 266, 554, MID + 0.2, 3],        // Good Ol' Barron's pump station
  [478, 674, 540, 718, MID + 0.3, 5],        // Scrap Yard
  [196, 446, 246, 494, MID + 0.4, 3],        // South Swamp Outpost
  [346, 324, 366, 344, MID + 0.45, 1.5],     // Central Swamp Lift pad
  [336, 46, 402, 124, null, 4],              // Rubie Residence garden
  [222, 136, 292, 200, null, 4],             // Pale Apartments
  [314, 182, 362, 216, null, 3],             // Ben Welda's Sunroof
  [500, 780, 560, 818, null, 4],             // Formikai Outpost
  [480, 192, 552, 240, MID + 0.25, 3],       // hydroponics core
];

export default {
  id: 'damn_grounds', name: 'Damn Grounds', size: [W, H], seed: 4471,
  base: 'grass', cliff: 'rock',
  ambient: { music: 'damn_grounds', birds: true, frogs: true, insects: true },
  conditions: ['night_raid', 'em_storm', 'lush_blooms', 'uncovered_caches', 'husk_graveyard', 'prospecting_probes', 'harvester', 'matriarch', 'cold_snap', 'hurricane', 'close_scrutiny'],
  build(w, rng) {
    const C = makeCtx(w, rng), T = { t: performance.now() };
    const step = (name, fn) => { fn(C); const t = performance.now(); T[name] = Math.round(t - T.t); T.t = t; };
    step('terrain', terrain); step('under', undergrounds); step('dam', damComplex); step('north', northPOIs); step('west', westPOIs); step('south', southPOIs);
    step('east', eastPOIs); step('outskirts', roadsideAndOutskirts); step('vegetation', vegetation); step('ark', arkSpawns); step('markers', markers);
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
  // inside the dam's raised surfaces (pad > 0 grows them, pad < 0 insets)
  C.inDam = (x, z, pad = 0) => { const [u, v] = toL(x, z); return DAM_HIGH.some(([a, b, c, d]) => u > a - pad && u < c + pad && v > b - pad && v < d + pad); };
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
  C.reserved = SPAWNS.map(([x, z]) => [x, z, 3]);   // spawn / extract points kept clear: [x, z, radius]
  C.nearDoor = (x0, z0, x1, z1, m = 1.8) => C.doorPts.some(([dx, dz]) => dx > x0 - m && dx < x1 + m && dz > z0 - m && dz < z1 + m);

  // ------------------------------------------------------------------ buildings
  // C.bld: building in world coords (optional rot about its centre). Resolves floorY up front (so upper
  // storeys / roofs have known heights), adds upper-storey windows, records door points and stair keep-outs.
  C.ringAvg = (spec) => {
    let pts = [[spec.x, spec.z], [spec.x + spec.w, spec.z], [spec.x + spec.w, spec.z + spec.d], [spec.x, spec.z + spec.d]];
    if (spec.rot) { const Rr = rotFrame(spec.x + spec.w / 2, spec.z + spec.d / 2, spec.rot); pts = pts.map(([a, c]) => rotPt(Rr, a, c)); }
    const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
    let sum = 0, n = 0; C.areaFn(Math.min(...xs) - 0.5, Math.min(...zs) - 0.5, Math.max(...xs) + 0.5, Math.max(...zs) + 0.5, (x, z, cur) => { sum += cur; n++; return null; });
    return n ? sum / n : MID;
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
  C.dbld = (o) => C.gbld(DAM, { ...o, x: o.u, z: o.v });
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
      C.gwall(G, ax, az, bx, bz, 0.5, h, tex, g, opts);
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
  // loose containers outside
  C.loot = (cx, cz, r, list, tier = 1, o = {}) => {
    for (const kind of list) {
      for (let t = 0; t < 30; t++) {
        const a = rng() * 2 * PI, d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d;
        if (C.inBuilding(x, z, 0.8) && !o.inside) continue;
        if (o.avoid && o.avoid(x, z)) continue;
        if (C.propHit(x - 0.7, z - 0.7, x + 0.7, z + 0.7) || C.nearDoor(x, z, x, z, 1.5)) continue;
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
  // field depot: small resupply hut with antenna (quest target); rot turns it about its centre
  C.fieldDepot = (x, z, rot = 0) => {
    const bb = C.bld({ x: x - 3, z: z - 2.5, w: 6, d: 5, rot, wall: 'metalPanel', floor: 'metalPanel', roof: 'metalPanel', roofTint: 0x7a9ac0, name: 'Field Depot', doors: [{ side: 's', at: 2, w: 2 }], vents: 1 });
    C.Cn(bb, 'field_depot', 3, 1.1, 0, { tier: 2 });
    C.Cn(bb, 'ammo_box', 4.8, 1.3, 0, { tier: 1 });
    C.P(bb, 'dg_antennamast', 7.2, 1, 0, { solid: true, scale: 0.75 });
    C.IL(bb, 3, 5.7, 0x60e0ff, 1.55, 9, 3.2);
    w.poi('field_depot', 'Field Depot', x, z, 10, { tier: 1, aliases: ['field_depot'] });
    return bb;
  };
  // extraction points: the structure (cage / hatch) is modelled + collided by the engine (engine/extracts.js);
  // the map gives it a facing (0 = +z, toward where players arrive), keeps it clear and dresses the spot.
  C.lift = (id, name, x, z, face, o = {}) => {
    const base = o.yAbs ?? null, Rf = rotFrame(x, z, -face), P2 = (lx, lz) => rotPt(Rf, x + lx, z + lz);
    if (o.paint !== false) { const q = [[-5, -5], [5, -5], [5, 5], [-5, 5]].map(([a, b]) => P2(a, b)); w.paintPoly('concrete', q); w.paintPoly('hazard', [P2(-5, 4.2), P2(5, 4.2), P2(5, 5), P2(-5, 5)]); }
    const lampY = (lx, lz, oo) => { const [px, pz] = P2(lx, lz); if (base != null) C.lampAt(px, pz, base, oo); else w.lamp(px, pz, oo); };
    lampY(-4.2, -3.8, { y: 6.6, model: 'dg_floodlight', color: 0xe0ffe8, intensity: 1.6, range: 14, rot: -face });
    lampY(0, 4.8, { y: 1.8, model: null, color: 0x60ff88, intensity: 1.6, range: 9 });
    const [sx, sz] = P2(4.6, 4.4); w.prop('dg_extsign', sx, sz, -face, base != null ? { solid: true, yAbs: base } : { solid: true });
    w.extract(id, name, x, z, { kind: 'elevator', face, ...(base != null ? { yAbs: base } : {}), ...o });
    C.addClear(x, z, 7); C.reserved.push([x, z, 6.5]);
  };
  C.hatch = (id, name, x, z, face, o = {}) => {
    const Rf = rotFrame(x, z, -face), P2 = (lx, lz) => rotPt(Rf, x + lx, z + lz);
    w.paintCircle('concrete', x, z, 2.4, 0.15, 5);
    const [sx, sz] = P2(1.8, 1.6); w.prop('dg_hatchsign', sx, sz, -face, { solid: true });
    const [lx, lz] = P2(-1.6, 1.8); w.lamp(lx, lz, { y: 1.4, model: null, color: 0xffc040, intensity: 1.4, range: 8, flicker: 0.2 });
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
  return C;
}

// ==================================================================================== TERRAIN
function terrain(C) {
  const { w, areaFn } = C;
  const VW = w.tw + 1, VH = w.th + 1, scanFill = C.scanFill;
  // rasterised masks: binary ones at vertex resolution, smooth (blurred) ones on a 4 m grid
  const polyMask = (pts) => { const m = new Uint8Array(VW * VH); scanFill(pts, (i) => { m[i] = 1; }); return m; };
  const G = 4, GW_ = Math.ceil(VW / G) + 1, GH_ = Math.ceil(VH / G) + 1;
  const smoothMask = (pts, r) => {         // coarse mask + 2-pass running box blur (radius r metres)
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
  const rectPts = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const swampBin = polyMask(SWAMP), basinBin = polyMask(BASIN);
  C.swampAt = (x, z) => swampBin[clamp(Math.round(z), 0, VH - 1) * VW + clamp(Math.round(x), 0, VW - 1)] > 0;
  C.basinAt = (x, z) => basinBin[clamp(Math.round(z), 0, VH - 1) * VW + clamp(Math.round(x), 0, VW - 1)] > 0;
  const neS = smoothMask(NE_HIGHLAND, 9), swampS = smoothMask(SWAMP, 7), basinS = smoothMask(BASIN, 13);
  const coreS = smoothMask(rectPts(540, 70, 940, 620), 16), southS = smoothMask(rectPts(430, 580, 900, 770), 16);
  // macro relief on the coarse grid
  const macro = new Float32Array(GW_ * GH_);
  for (let gz = 0; gz < GH_; gz++) for (let gx = 0; gx < GW_; gx++) {
    const x = gx * G, z = gz * G, i = gz * GW_ + gx;
    let h = MID;
    const north = sm(150, 96, z) * sm(330, 430, x);
    h += north * (HIGH - MID + 0.6);                                                   // northern highland (dam abutment)
    h += sm(250, 180, z) * sm(830, 870, x) * sm(965, 905, x) * (HIGH - MID + 0.2) * (1 - north);   // NE shoulder
    h += sm(30, 0, z) * sm(600, 680, x) * 9;                                           // north rim mountains
    h += sm(870, 1010, x) * sm(210, 60, z) * 11;                                       // NE mountains
    h += sm(950, 1090, x) * 6;                                                         // east hills
    h += sm(126, 30, x) * (sm(200, 300, z) * 7 + (1 - sm(200, 300, z)) * 4);           // west hills past the ring road
    h += sm(730, 820, z) * sm(380, 470, x) * 7;                                        // southern (Formikai) hills
    h += sm(130, 20, z) * sm(320, 200, x) * 5;                                         // NW hills
    h += sm(600, 700, x) * sm(690, 730, z) * sm(1000, 900, x) * 2.5;                   // Wreckage rise
    h = lerp(h, Math.max(h, HIGH + 0.9), neS[i]);                                      // highland NE of the highway
    h = lerp(h, LOW, smooth(clamp(basinS[i] / 0.55, 0, 1)));                           // spillway basin
    macro[i] = h;
    const amp = Math.min(1 - swampS[i] * 0.78, 1 - coreS[i] * 0.65, 1 - southS[i] * 0.5);
    coreS[i] = amp;                                                                    // reuse buffer: noise amplitude
  }
  const n1 = makeNoise(11), n2 = makeNoise(23);
  C.noise = n1; C.noise2 = n2;
  const fbm = (n, x, z) => (n(x, z) * 0.6 + n(x * 2.3, z * 2.3) * 0.28 + n(x * 5.1, z * 5.1) * 0.12 - 0.5) * 2;
  for (let z = 0; z < VH; z++) for (let x = 0; x < VW; x++) {
    const sw = samp(swampS, x, z);
    w.hv[z * VW + x] = samp(macro, x, z) + fbm(n1, x / 90, z / 90) * 2.2 * samp(coreS, x, z)
      + (n2(x / 24, z / 24) * 0.7 + n2(x / 10.5, z / 10.5) * 0.3 - 0.5) * 1.5 * (0.3 + 0.7 * sw);
  }
  C.southAt = (x, z) => samp(southS, x, z);
  w.raiseCircle(566, 46, 46, -4.6, 0.6, 'add');                       // where the West Broken Bridge span fell
  w.ridge([[925, 110], [938, 200], [944, 262], [960, 320]], 22, 1.5, 16, 'min');   // East Broken Bridge ravine
  w.raiseCircle(232, 318, 15, 2.8, 0.7, 'add');                       // Victory Rise (Old Battleground)
  for (const [cx, cz, r] of [[212, 340, 6], [270, 312, 5], [248, 342, 7], [282, 330, 4], [222, 298, 5], [244, 300, 4], [198, 312, 4]]) w.raiseCircle(cx, cz, r, -1.4, 0.5, 'add');
  for (const [cx, cz, r] of [[318, 380, 11], [420, 344, 9], [262, 424, 10], [452, 314, 7], [372, 262, 8], [300, 498, 9], [528, 344, 8], [212, 380, 7], [404, 372, 6]]) w.raiseCircle(cx, cz, r, -1.9, 0.6, 'add');
  // POI ground
  for (const [x0, z0, x1, z1, h, b] of FLATS) {
    let hh = h;
    if (hh == null) { let s = 0, n = 0; areaFn(x0, z0, x1, z1, (x, z, cur) => { s += cur; n++; return null; }); hh = s / n; }
    w.raiseRect(x0, z0, x1, z1, hh, b, 'set');
  }
  // turned terraces: Pattern House compound + Raider Outpost East (dam frame)
  {
    const avgIn = (pts) => { let s = 0, n = 0; scanFill(pts, (i) => { s += w.hv[i]; n++; }); return n ? s / n : MID; };
    const ph = GR(DAM, -114, -270, -66, -224); w.raisePoly(ph, avgIn(ph), 4, 'set');
    w.raisePoly(GR(DAM, 100, -266, 154, -214), HIGH + 0.6, 3, 'set');
  }

  // ---------------- the dam (30° dam frame)
  // The Breach floor first (the monoliths override it): swamp level in the west falling to the basin in the east
  C.breachAt = (u, v) => {
    let h = lerp(MID + 0.2, LOW + 0.4, smooth(clamp((u + 72) / 144, 0, 1)));
    const c = Math.hypot(u - 8, v - 6); if (c < 9) h -= (1 - c / 9) * 1.3;
    return h + Math.sin(u * 0.7 + v * 0.3) * 0.15;
  };
  C.lshape(DAM, -86, -54, 86, 54, (u, v, cur) => { const f = 1 - smooth(clamp((Math.abs(v) - 40) / 12, 0, 1)); return cur + (C.breachAt(u, v) - cur) * f; });
  for (const r of DAM_HIGH) C.lfill(DAM, ...r, HIGH);
  for (const r of PITS) C.lfill(DAM, ...r, 1.0);
  C.lslope(DAM, -8, -26, 10, -10, HIGH, C.breachAt(0, -10), 'v');          // rubble slope off the broken stub
  C.lslope(DAM, 0, 22, 16, 40, C.breachAt(8, 22), HIGH, 'v');              // collapsed slab up onto the Floodgates
  for (const c of CHUTES) C.lslope(DAM, 18, c - 4, 58, c + 4, HIGH, LOW + 0.3, 'u');
  // ramps between tiers
  C.lslope(DAM, -82, -56, -60, -46, MID + 0.5, HIGH, 'u');                  // swamp -> Controlled Access Zone
  C.lslope(DAM, -56, 86, -32, 94, MID + 0.3, HIGH, 'u');                    // swamp -> Floodgates
  C.lslope(DAM, -126, 214, -104, 224, MID + 0.2, HIGH, 'u');                // Water Treatment plaza -> west wing
  C.lslope(DAM, 4, 242, 24, 272, HIGH, MID + 0.3, 'v');                     // south spine down to the creek road
  C.lslope(DAM, 56, 242, 72, 262, HIGH, MID + 0.3, 'v');                    // R&A -> south road
  C.lslope(DAM, 134, 184, 144, 204, HIGH, MID + 0.2, 'v');                  // balcony stairs -> field depot
  C.lslope(DAM, 286, 172, 306, 184, HIGH, MID + 0.2, 'u');                  // balcony east end -> Electrical Tower
  C.lslope(DAM, -124, -174, -100, -162, w.groundAt(...L(-126, -168)), HIGH, 'u');   // north road onto the plateau
  C.lslope(DAM, 82, -78, 104, -70, HIGH, 1.5, 'u');                         // Pipeline deck service ramp into the basin
  C.lslope(DAM, -262, -190, -250, -172, 12.4, w.groundAt(...L(-256, -168)), 'v');   // embankment onto the West Broken Bridge
  // raised walkways
  w.deck(LP([[-268, -195], [-250, -195]]), 10, 12.4, 'asphalt', { rails: false, pillars: false });       // WBB embankment end
  w.deck(HIGHWAY, 9, HIGH + 0.25, 'asphalt', { rails: false, pillars: false });
  w.deck(LP([[175, -206], [186, -206]]), 9, HIGH + 0.25, 'asphalt', { rails: false, pillars: false });   // EBB abutment
  for (const b of BOARDWALKS) w.deck(b, 2.4, MID + 0.32, 'wood', { rails: false, pillars: false });

  // ---------------- water
  C.redMat = waterMaterial({ deep: 0x5a1e18, shallow: 0x8e3c28, opacity: 0.9 });
  C.darkMat = waterMaterial({ deep: 0x14262a, shallow: 0x23403e, opacity: 0.92 });
  C.swampMat = waterMaterial({ deep: 0x26382a, shallow: 0x46583a, opacity: 0.88 });
  w.waterPoly(SWAMP, { level: SWAMP_WATER, material: C.swampMat });
  for (const [cx, cz, r, d] of RED_LAKES) {
    w.raiseCircle(cx, cz, r * 1.15, -1.0 - d, 0.7, 'add');
    const pts = []; for (let a = 0; a < 18; a++) { const rr = r * (1.2 + 0.12 * Math.sin(a * 2.3 + cx)); pts.push([cx + Math.cos(a / 18 * 2 * PI) * rr, cz + Math.sin(a / 18 * 2 * PI) * rr * 0.85]); }
    w.waterPoly(pts, { level: LOW - 0.25, material: C.redMat });
  }
  for (const p of PITS) w.waterPoly(GR(DAM, ...p), { level: 6.4, material: C.darkMat });
  w.waterPoly(Array.from({ length: 14 }, (_, i) => L(8 + Math.cos(i / 14 * 2 * PI) * 7.5, 6 + Math.sin(i / 14 * 2 * PI) * 7.5)), { level: 0.85, material: C.darkMat });   // breach crater pool
  w.river([[700, 360], [740, 392], [770, 420], [790, 456], [826, 486], [870, 500], [910, 540], [940, 600], [980, 660], [1010, 720]], 5, { level: LOW - 0.25, depth: 0.7, bank: 3 });
  w.river([[452, 600], [490, 608], [530, 603], [570, 613], [610, 633], [640, 660], [668, 676], [700, 688], [745, 690], [790, 682], [830, 692], [880, 704]], 4, { level: MID - 0.45, depth: 0.75, bank: 3 });

  // ---------------- roads
  for (const r of ROADS) w.road(r, 7, 'asphalt', { edge: 'gravel', edgeW: 1.2 });
  for (const r of TRACKS) w.road(r, 4, 'dirt', { edge: 'gravel', edgeW: 0.6 });

  // ---------------- terrain paint
  {
    const T = TID, tw = w.tw;
    for (let z = 0; z < w.th; z++) for (let x = 0; x < tw; x++) {
      const ci = z * tw + x; if (w.tids[ci] !== T.grass) continue;          // only repaint plain grass
      const vi = z * VW + x, g = w.hv[vi];
      const a = n1(x / 19, z / 19), b = n2(x / 7, z / 7), c = n1(x / 47 + 31, z / 47 + 17);
      let t = null;
      if (swampBin[vi]) t = g < SWAMP_WATER + 0.1 ? T.mud : a > 0.66 ? T.moss : b > 0.72 ? T.mud : c > 0.42 ? T.dirt : a < 0.3 ? T.gravel : null;
      else if (basinBin[vi]) t = g < 0.3 ? T.mud : a > 0.66 ? T.rock : b < 0.3 ? T.gravel : c > 0.6 ? T.mud : T.dirt;
      else if (samp(southS, x, z) > 0.6) t = a > 0.64 ? T.moss : b > 0.6 ? T.dirt : c > 0.62 ? T.mud : null;
      else if (g > 13) t = a > 0.45 ? T.rock : T.gravel;
      else if (x > 920 || z > 760 || x < 120) t = a > 0.72 ? T.rock : c > 0.62 ? T.dirt : b > 0.78 ? T.gravel : null;
      else t = a > 0.74 && c > 0.45 ? T.dirt : b > 0.8 ? T.gravel : a < 0.22 ? T.moss : null;
      if (t != null) w.tids[ci] = t;
    }
  }
  // worn, rubble-strewn ground around the dam and the central facilities (the bright zone of the reference)
  {
    const T = TID, tw = w.tw;
    const zoneList = [
      polyMask([[330, 470], [400, 400], [470, 404], [552, 420], [600, 300], [640, 230], [628, 150], [600, 100], [640, 60], [720, 60], [900, 170], [910, 240], [790, 280], [700, 300], [664, 330], [650, 470], [640, 560], [560, 590], [470, 640], [420, 660], [330, 620]]),
      polyMask([[440, 20], [520, -2], [640, -2], [700, 20], [620, 120], [560, 130], [470, 110]]),
      polyMask([[200, 520], [330, 520], [360, 600], [330, 690], [250, 690], [200, 620]]),
      polyMask([[600, 690], [740, 680], [760, 740], [640, 760]]),
    ];
    const zones = zoneList[0]; for (const m of zoneList.slice(1)) for (let i = 0; i < m.length; i++) if (m[i]) zones[i] = 1;
    for (let z = 0; z < Math.min(w.th, 760); z++) for (let x = 160; x < Math.min(tw, 920); x++) {
      const ci = z * tw + x, cur = w.tids[ci];
      if (cur !== T.grass && cur !== T.moss && cur !== T.forest) continue;
      const vi = z * VW + x; if (!zones[vi]) continue;
      if (swampBin[vi]) continue;
      const a = n1(x / 13 + 7, z / 13 + 3), b = n2(x / 5, z / 5), c = n1(x / 31, z / 31 + 40);
      const t = a > 0.58 ? (b > 0.5 ? T.gravel : T.dirt) : c > 0.6 ? T.rock : b > 0.82 ? T.concrete : a < 0.3 ? null : (b > 0.45 ? T.gravel : null);
      if (t != null) w.tids[ci] = t;
    }
  }
  // dam surfaces
  w.paintPoly('concrete', GR(DAM, 54, 40, 96, 150));                         // spillway apron (basin level)
  w.paintPoly('concrete', GR(DAM, 26, -54, 92, -16));
  w.paintPoly('gravel', GR(DAM, -70, -26, 70, 40));
  w.paintCircle('mud', ...L(8, 6), 10, 0.4, 3);
  for (const r of DAM_HIGH) w.paintPoly('damConcrete', GR(DAM, ...r));
  for (const c of CHUTES) { w.paintPoly('concrete', GR(DAM, 18, c - 4, 58, c + 4)); w.paintPoly('hazard', GR(DAM, 17, c - 4, 18.2, c + 4)); }
  for (const [a, b, c, d] of PITS) { w.paintPoly('hazard', GR(DAM, a - 1, b - 1, c + 1, b)); w.paintPoly('hazard', GR(DAM, a - 1, d, c + 1, d + 1)); }
  for (const r of CREST_ROADS) w.path(LP(r), 5, 'concrete');
  w.path(HIGHWAY, 8, 'asphalt'); w.path(LP([[175, -206], [186, -206]]), 8, 'asphalt'); w.path(LP([[-268, -195], [-250, -195]]), 9, 'asphalt');
  // concrete walls on every sheer drop along the dam / deck edges, and inside the turbine shafts
  frameWalls(C, DAM, [...DAM_HIGH, DECK_RECTS[0]], {});
  frameWalls(C, DAM, DECK_RECTS.slice(1), { parapet: false });     // bridge abutments: no lip where the bridge deck continues
  frameWalls(C, DAM, PITS, { inward: true });
}

// Walls along the edges of turned rects wherever the ground just outside drops more than 2.2 m below the
// ground just inside: dam faces, pier walls along the chutes, broken bridge ends, balcony, turbine shafts
// (inward). Straight pieces (<= 6 m) in the frame, with parapets in coherent 14 m stretches.
function frameWalls(C, G, rects, o = {}) {
  const { w } = C;
  const DROP = 2.2, PIECE = 6, tex = o.tex || 'damConcrete', TIN = 0.5, TOUT = 1.3;
  for (const [x0, z0, x1, z1] of rects) {
    const edges = [[x0, z0, x1, z0, 0, -1], [x0, z1, x1, z1, 0, 1], [x0, z0, x0, z1, -1, 0], [x1, z0, x1, z1, 1, 0]];
    for (const [ax, az, bx, bz, n0x, n0z] of edges) {
      const nx = o.inward ? -n0x : n0x, nz = o.inward ? -n0z : n0z;
      const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len, n = Math.max(1, Math.round(len)), stp = len / n;
      let run = null;
      const emit = (r) => {
        const a = r.a <= 0.01 ? -TOUT : r.a, b = r.b >= len - 0.01 ? len + TOUT : r.b;      // close the corners at edge ends
        const sx = ax + ux * a, sz = az + uz * a, ex = ax + ux * b, ez = az + uz * b;
        const xs = [sx - nx * TIN, sx + nx * TOUT, ex - nx * TIN, ex + nx * TOUT], zs = [sz - nz * TIN, sz + nz * TOUT, ez - nz * TIN, ez + nz * TOUT];
        const y0 = r.low - 0.3, big = r.top - r.low > 7, mid = (a + b) / 2;
        const hsh = ((Math.floor((ax + ux * mid) / 14) * 73856093) ^ (Math.floor((az + uz * mid) / 14) * 19349663) ^ (((nx + 2) * 3 + nz + 7) * 83492791)) >>> 0;
        const par = o.parapet === false ? 0.06 : (hsh % 100) < (big ? 82 : 55) ? 0.95 : 0.06;
        C.gblock(G, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), r.top + par - y0, tex, { y0 });
      };
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) * stp, px = ax + ux * t, pz = az + uz * t;
        const top = w.groundAt(...GW(G, px - nx * 2.0, pz - nz * 2.0)), low = w.groundAt(...GW(G, px + nx * 1.9, pz + nz * 1.9));
        const ok = top - low > DROP;
        if (ok && run && t - run.a < PIECE && Math.abs(top - run.top) < 0.6) { run.b = t + stp / 2; run.low = Math.min(run.low, low); }
        else { if (run) emit(run); run = ok ? { a: t - stp / 2, b: t + stp / 2, top, low } : null; }
      }
      if (run) emit(run);
    }
  }
}

// ==================================================================================== UNDERGROUND
// Halls under the dam and Water Treatment (engine `under` buildings): sunk floor, 1 m walls, a walkable lid
// flush with the surface; `stairs to: 'top'` cut the lid. Built first so surface dressing placed over them
// later lands on the lid (see C.hallAt in makeCtx).
function undergrounds(C) {
  const { w } = C;
  const hall = C.hall = (G, o) => {
    const bb = C.gbld(G, { wall: 'concrete', floor: 'concrete', roof: o.lid || 'damConcrete', blend: 0.5, ...o, under: o.depth, floorY: o.top });
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
  // ---------------- Floodgate maintenance tunnel: runs under the Floodgates crest (quest: "the maintenance tunnels under the Floodgates")
  const ft = C.B.ftun = hall(DAM, { x: -5, z: 44, w: 8, d: 104, depth: 6, top: HIGH, name: 'Floodgate Maintenance Tunnel',
    stairs: [{ x: 1.3, z: 6, w: 1.6, dir: 'n', to: 'top' }, { x: 1.3, z: 89.2, w: 1.6, dir: 's', to: 'top' }] });
  for (let z = 19; z < 87; z += 8.5) C.P(ft, 'dg_bigpipe', 5.75, z, PI / 2, { solid: true });
  for (const [k, lx, lz, r, t] of [['locker', 1.6, 30, PI / 2, 1], ['locker', 1.6, 72, PI / 2, 1], ['crate', 2.2, 45, 0, 1], ['crate', 2.2, 80, 0, 1], ['toolbox', 2.2, 55, 0, 2], ['ammo_box', 2.2, 62, 0, 1],
    ['electronics', 2.2, 38, 0, 2], ['raider_cache', 2.4, 50, 0, 2], ['toolbox', 2.2, 24, 0, 1], ['crate', 6, 95, 0, 1]]) C.Cn(ft, k, lx, lz, r, { tier: t });
  C.P(ft, 'dg_valve', 2.2, 66, 0, { solid: true }); C.P(ft, 'dg_fusebox', 1.4, 34, PI / 2, { solid: true });
  for (let z = 10; z < 104; z += 13) tl(ft, 3.4, z, 0xffd090, 1.3, 10);
  C.P(ft, 'dg_signred', 6.2, 3.2, PI, { yAbs: HIGH, solid: true }); C.P(ft, 'dg_signred', 6.2, 100.6, 0, { yAbs: HIGH, solid: true });
  // ---------------- Flood Access Tunnel under the Red Lakes Balcony (quest: "Locate the Flood Access Tunnel")
  const fa = C.B.fat = hall(DAM, { x: 96, z: 174, w: 50, d: 8, depth: 5.5, top: HIGH, name: 'Flood Access Tunnel',
    stairs: [{ x: 2.5, z: 3.2, w: 1.6, dir: 'w', to: 'top' }, { x: 39.25, z: 3.2, w: 1.6, dir: 'e', to: 'top' }] });
  C.P(fa, 'dg_pump', 16, 2.0, 0, { solid: true }); C.P(fa, 'dg_pump', 34, 6.0, PI, { solid: true });
  C.P(fa, 'dg_valve', 21, 6.2, 0, { solid: true }); C.P(fa, 'dg_valve', 29, 1.8, 0, { solid: true });
  C.P(fa, 'dg_bed', 25, 6.0, PI / 2, { solid: true }); C.P(fa, 'crate', 13.5, 6.2, 0.2, { solid: true });
  for (const [k, lx, lz, t] of [['raider_cache', 27.5, 5.9, 2], ['ammo_box', 23, 6.3, 1], ['crate', 24, 1.8, 1], ['toolbox', 18.5, 6.2, 1], ['medical_bag', 31, 6.2, 1], ['electronics', 36.5, 1.8, 2]]) C.Cn(fa, k, lx, lz, 0, { tier: t });
  for (const lx of [7, 19, 31, 44]) tl(fa, lx, 1.6, 0xffc070, 1.3, 10);
  // ---------------- Turbine Gallery under the Power Generation plateau (quest: the ventilation shaft + the power switch underneath the stairs)
  const tg = C.B.tgal = hall(DAM, { x: -73, z: -134, w: 38, d: 8, depth: 5, top: HIGH, name: 'Turbine Gallery',
    stairs: [{ x: 2.5, z: 3.2, w: 1.6, dir: 'w', to: 'top' }, { x: 27.8, z: 3.2, w: 1.6, dir: 'e', to: 'top' }] });
  C.P(tg, 'dg_switch', 6.2, 1.5, 0, { solid: true });                                  // the power switch, under the west stairs
  C.P(tg, 'dg_fusebox', 14, 1.3, 0, { solid: true }); C.P(tg, 'dg_generator', 19.5, 5.6, 0, { solid: true, scale: 0.6 });
  C.P(tg, 'dg_locker', 12.5, 6.6, PI, { solid: true });
  for (const [k, lx, lz, t] of [['electronics', 16, 6.3, 2], ['toolbox', 23.5, 6.3, 2], ['crate', 24.5, 1.8, 1], ['locker', 11.2, 1.6, 1], ['ammo_box', 26, 6.3, 1]]) C.Cn(tg, k, lx, lz, 0, { tier: t });
  for (const lx of [6, 18, 31]) tl(tg, lx, 4, 0xd8e8ff, 1.3, 10);
  C.gprop(DAM, 'dg_ventbox', -75.5, -130, 0, { solid: true }); C.gprop(DAM, 'dg_ventbox', -33, -134.5, 0, { solid: true });
}

// ==================================================================================== THE DAM (30° frame)
function damComplex(C) {
  const { w, R, rng } = C;
  const G = DAM;
  const P = (kind, u, v, r = 0, o = {}) => C.gprop(G, kind, u, v, r, o);
  const lamp = (u, v, o) => C.glamp(G, u, v, o);
  const flood = (u, v, o = {}) => C.flood(...L(u, v), { ...o, rot: (o.rot || 0) - G.a });
  const beacon = (u, v, o = {}) => C.beacon(...L(u, v), o);

  // ================================================================ Power Generation Complex (plateau + east wing)
  // Generator Hall: two 2-storey office wings (real upper floors + roof ladders) either side of a tall generator room
  const ghW = C.dbld({ u: -98, v: -190, w: 16, d: 26, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Generator Hall West Wing', wall: 'concrete', floor: 'metalPanel', tint: 0xe0d8c8,
    doors: [{ side: 's', at: 5, w: 3.2 }, { side: 'w', at: 6, w: 2.4, door: true }, { side: 'e', at: 4, w: 2, door: true }, { side: 'e', at: 18, w: 2.4 }, { side: 'n', at: 4, w: 3, sill: 1.1 }, { side: 's', at: 11, w: 2.4, sill: 1.1 }],
    inner: [[0, 13, 16, 13, [{ at: 6, w: 1.8 }]], [0, 13, 16, 13, [{ at: 9, w: 1.8 }], 1]],
    stairs: [{ x: 0.6, z: 15.4, w: 1.4, dir: 'n', from: 0, to: 1 }], ladders: [{ side: 'n', at: 11 }] });
  C.F(ghW, 'control', 0, 0, 16, 13, { tier: 2 }); C.F(ghW, 'workshop', 0, 13, 16, 26, { tier: 2 });
  C.F(ghW, 'office', 0, 0, 16, 13, { tier: 2, storey: 1 }); C.F(ghW, 'security', 0, 13, 16, 26, { tier: 2, storey: 1 });
  const gh = C.B.gh = C.dbld({ u: -82, v: -190, w: 28, d: 26, h: 8.4, floorY: HIGH, blend: 0.5, name: 'Generator Hall', wall: 'concrete', floor: 'metalPanel', tint: 0xd8d0c0,
    doors: [{ side: 's', at: 11, w: 4.5 }, { side: 'n', at: 13, w: 2, door: true }, { side: 'w', at: 4, w: 2 }, { side: 'w', at: 18, w: 2.4 }, { side: 'e', at: 8, w: 2.4 },
      { side: 's', at: 3, w: 3, sill: 1.1, top: 4 }, { side: 's', at: 21, w: 3, sill: 1.1, top: 4 }, { side: 'n', at: 4, w: 3, sill: 2.2, top: 5 }, { side: 'n', at: 21, w: 3, sill: 2.2, top: 5 }],
    roofExtras: [[6, 4, 16, 10, 1.6], [18, 14, 26, 22, 1.2]] });
  C.P(gh, 'dg_generator', 9, 7, 0, { solid: true }); C.P(gh, 'dg_generator', 20, 7, 0, { solid: true });
  C.P(gh, 'dg_console', 21, 22.5, PI, { solid: true }); C.P(gh, 'dg_fusebox', 26.5, 18, -PI / 2, { solid: true });
  C.Cn(gh, 'toolbox', 4, 20, 0, { tier: 2 }); C.Cn(gh, 'electronics', 25, 14, 0, { tier: 2 }); C.Cn(gh, 'crate', 4, 2, 0, { tier: 1 });
  C.IL(gh, 9, 14, 0xffd090, 1.2, 11, 5); C.IL(gh, 20, 14, 0xffd090, 1.2, 11, 5);
  const ghE = C.dbld({ u: -54, v: -190, w: 12, d: 26, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Generator Hall East Wing', wall: 'concrete', floor: 'metalPanel', tint: 0xe0d8c8,
    doors: [{ side: 'e', at: 5, w: 2.4, door: true }, { side: 'w', at: 8, w: 2.4, door: true }, { side: 'e', at: 20.6, w: 2, door: true }, { side: 'n', at: 4, w: 3, sill: 1.1 }, { side: 's', at: 4, w: 3, sill: 1.1 }],
    inner: [[0, 12, 12, 12, [{ at: 5, w: 1.8 }]]],
    stairs: [{ x: 10.0, z: 14.4, w: 1.4, dir: 'n', from: 0, to: 1 }], ladders: [{ side: 'n', at: 8 }] });
  C.F(ghE, 'storage', 0, 0, 12, 12, { tier: 2 }); C.F(ghE, 'security', 0, 12, 12, 26, { tier: 2 }); C.F(ghE, 'server', 0, 0, 12, 26, { tier: 2, storey: 1 });
  C.lift('north_complex_elevator', 'North Complex Elevator', 706, 140, -PI / 6);
  // Power Control: 2 storeys, roof ladder (Sentinal on the roof), the vent shaft + power switch beside the stairs
  const pc = C.B.pc = C.dbld({ u: -12, v: -182, w: 26, d: 22, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Power Control', tint: 0xd8d0c0, floor: 'tiles',
    doors: [{ side: 's', at: 4, w: 2, door: true }, { side: 'w', at: 10, w: 2 }, { side: 'e', at: 6, w: 2.4, door: true }, { side: 'n', at: 4, w: 3, sill: 1.1 }, { side: 'n', at: 16, w: 3, sill: 1.1 }, { side: 's', at: 16.5, w: 3, sill: 1.1 }],
    inner: [[12, 0, 12, 22, [{ at: 9, w: 1.8 }]], [12, 11, 26, 11, [{ at: 6, w: 1.6 }]], [12, 0, 12, 22, [{ at: 4, w: 1.8 }], 1]],
    stairs: [{ x: 15, z: 19.9, w: 1.4, dir: 'e', from: 0, to: 1 }], ladders: [{ side: 'w', at: 17 }] });
  C.F(pc, 'control', 0, 0, 12, 22, { tier: 2 }); C.F(pc, 'office', 12, 0, 26, 11, { tier: 2 }); C.F(pc, 'storage', 12, 11, 26, 22, { tier: 1 });
  C.F(pc, 'server', 0, 0, 12, 22, { tier: 2, storey: 1 }); C.F(pc, 'office', 12, 0, 26, 22, { tier: 2, storey: 1 });
  C.P(pc, 'dg_ventbox', 23.6, 18.4, 0, { solid: true }); C.P(pc, 'dg_switch', 21.7, 21.4, PI, { solid: true });
  // transformer yards (fenced grids of transformers, the reference's gridded bays)
  for (const [a, b, c, d] of [[22, -194, 54, -164], [58, -192, 80, -164]]) {
    C.gfence(G, a, b, c, d, [[a, (b + d) / 2]]);
    for (let u = a + 5; u < c - 3; u += 8) for (let v = b + 6; v < d - 3; v += 9) P('dg_transformer', u, v, 0, { solid: true });
    P('dg_fusebox', c - 2, b + 1.2, 0, { solid: true });
    C.gcont(G, 'electronics', a + 2, d - 2, 0, { tier: 2 });
    flood(a + 1, b + 1, { color: 0xd0e0ff });
  }
  const ch = C.dbld({ u: -68, v: -154, w: 24, d: 18, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Compressor House', roof: 'corrugated', floor: 'metalPanel', tint: 0xd0c8b8,
    doors: [{ side: 'w', at: 6, w: 2.4, door: true }, { side: 'n', at: 14, w: 3.2 }, { side: 's', at: 4, w: 3, sill: 1.1 }, { side: 's', at: 14, w: 3, sill: 1.1 }],
    inner: [[14, 0, 14, 18, [{ at: 10, w: 1.8 }]]] });
  C.F(ch, 'industrial', 0, 0, 14, 18, { tier: 2 }); C.P(ch, 'dg_turbine', 7, 9, 0, { solid: true, scale: 0.8 }); C.F(ch, 'workshop', 14, 0, 24, 18, { tier: 1 });
  const ta = C.dbld({ u: -96, v: -152, w: 22, d: 14, floorY: HIGH, blend: 0.5, name: 'Turbine Access', roof: 'corrugated', floor: 'metalPanel',
    doors: [{ side: 's', at: 8, w: 3.2 }, { side: 'e', at: 5, w: 2, door: true }] });
  C.F(ta, 'industrial', 0, 0, 22, 14, { tier: 1 });
  const sg = C.dbld({ u: 86, v: -194, w: 22, d: 16, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Switchgear House', roof: 'corrugated', floor: 'concrete',
    doors: [{ side: 'w', at: 6, w: 2.4, door: true }, { side: 's', at: 14, w: 2 }, { side: 'n', at: 6, w: 3, sill: 1.1 }],
    inner: [[11, 0, 11, 16, [{ at: 6, w: 1.8 }]]] });
  C.F(sg, 'industrial', 0, 0, 11, 16, { tier: 2 }); C.F(sg, 'server', 11, 0, 22, 16, { tier: 2 });
  const cb = C.dbld({ u: 112, v: -194, w: 24, d: 14, floorY: HIGH, blend: 0.5, name: 'Cable Hall', wall: 'concrete', tint: 0xc8c0b0, floor: 'metalPanel',
    doors: [{ side: 'w', at: 5, w: 2.4, door: true }, { side: 's', at: 18, w: 2.4 }, { side: 's', at: 6, w: 3, sill: 1.1 }], inner: [[12, 0, 12, 14, [{ at: 4, w: 1.8 }]]] });
  C.F(cb, 'storage', 0, 0, 12, 14, { tier: 1, extra: [['crate', 1]] }); C.F(cb, 'server', 12, 0, 24, 14, { tier: 2 });
  const eg = C.dbld({ u: 88, v: -152, w: 18, d: 12, floorY: HIGH, blend: 0.5, name: 'East Gatehouse', tint: 0xd8d0c0, floor: 'tiles',
    doors: [{ side: 'n', at: 4, w: 2, door: true }, { side: 'n', at: 12, w: 2, door: true }, { side: 'e', at: 5, w: 3, sill: 1.1 }, { side: 's', at: 7, w: 3, sill: 1.1 }], inner: [[9, 0, 9, 12, [{ at: 5, w: 1.6 }]]] });
  C.F(eg, 'security', 0, 0, 9, 12, { tier: 2 }); C.F(eg, 'bunk', 9, 0, 18, 12, { tier: 1 });
  const vh = C.dbld({ u: 112, v: -152, w: 16, d: 12, floorY: HIGH, blend: 0.5, name: 'Valve House', roof: 'corrugated', floor: 'concrete',
    doors: [{ side: 'n', at: 5, w: 2.4, door: true }, { side: 'w', at: 6, w: 2 }] });
  C.F(vh, 'industrial', 0, 0, 16, 12, { tier: 2 }); C.P(vh, 'dg_valve', 8, 6, 0, { solid: true });
  C.fieldDepot(...L(115, -168), G.a);
  // pits (with a catwalk across them), pipe racks, cranes, tanks, parked containers
  for (const [a, b, c, d] of PITS) { beacon(a - 1.5, b - 1.5); beacon(c + 1.5, d + 1.5); }
  w.bridge([L(-36, -129), L(74, -129)], 2.2, HIGH + 0.02, 'metalPanel', { pillars: 0, thick: 0.4 });       // service catwalk over the turbine shafts
  for (let v = -150; v < -120; v += 8) P('dg_bigpipe', -36, v, PI / 2, { solid: true, scale: 0.8 });
  for (let u = 86; u < 136; u += 8) P('dg_bigpipe', u, -170, 0, { solid: true, scale: 0.7 });
  P('dg_crane', 20, -124, 0.6, { solid: true }); C.mastLight(...L(20, -124), 22);
  for (const [u, v] of [[-50, -122], [75, -122], [100, -170]]) P('dg_tankS', u, v, 0, { solid: true });
  for (const [u, v, r, k] of [[-60, -118, 0, 'dg_container'], [-84, -118, PI / 2, 'dg_container'], [-90, -124, 0, 'dg_truck'], [74, -146, PI / 2, 'dg_containerG']]) P(k, u, v, r, { solid: true });
  P('dg_scaffold', -40, -196, 0, { solid: true }); P('dg_scaffold', 60, -148, PI / 2, { solid: true });
  for (const [u, v] of [[-100, -196], [-40, -198], [20, -198], [84, -198], [140, -196], [-60, -114], [80, -114], [140, -140], [-100, -114]]) flood(u, v, { rot: 0 });

  // ================================================================ Controlled Access Zone (puzzle vault; real upper floor with switches 3 + 4)
  const caz = C.B.caz = C.dbld({ u: -46, v: -96, w: 50, d: 38, storeys: 2, storeyH: 3.6, innerH: 3.6, floorY: HIGH, blend: 0.5, name: 'Controlled Access Zone', tint: 0xb8b8b0, floor: 'metalPanel',
    doors: [{ side: 's', at: 23.8, w: 2.4, door: true }, { side: 'w', at: 30, w: 1.8, door: true }, { side: 'e', at: 30, w: 1.8, door: true }, { side: 's', at: 6, w: 3, sill: 1.2 }, { side: 's', at: 40, w: 3, sill: 1.2 }],
    inner: [[0, 15, 50, 15, [{ at: 4.5, w: 2, door: true }, { at: 24, w: 2.4, door: true, locked: 'controlled_access_zone' }, { at: 43.5, w: 2, door: true }]],
      [13, 0, 13, 15, []], [37, 0, 37, 15, []], [0, 27, 50, 27, [{ at: 8, w: 2.4 }, { at: 39.6, w: 2.4 }]],
      [13, 0, 13, 15, [{ at: 6, w: 1.6 }], 1], [37, 0, 37, 15, [{ at: 6, w: 1.6 }], 1], [0, 15, 50, 15, [{ at: 6, w: 2 }, { at: 24, w: 2.4 }, { at: 42, w: 2 }], 1]],
    stairs: [{ x: 18, z: 24.8, w: 1.4, dir: 'e', from: 0, to: 1 }],
    roofExtras: [[4, 4, 10, 10, 1.4], [40, 20, 46, 30, 1.0]] });
  C.F(caz, 'storage', 0, 0, 13, 15, { tier: 2, extra: [['crate', 1]] });
  C.P(caz, 'barrelBlue', 4, 4, 0, { solid: true });                                         // fuel cell
  C.F(caz, 'vault', 13, 0, 37, 15, { tier: 3, room: 'controlled_access_zone', extra: [['weapon_case', 1], ['raider_cache', 1]], li: 1.2 });
  C.K(caz, 'controlled_access_zone', 13, 0, 37, 15, 'Controlled Access Zone Vault');
  C.F(caz, 'control', 37, 0, 50, 15, { tier: 2 });
  C.P(caz, 'dg_fusebox', 48.8, 7.5, -PI / 2, { solid: true });                               // resource lock panel
  for (const [lx, lz, r] of [[2.5, 17.5, PI / 2], [47.5, 17.5, -PI / 2]]) C.P(caz, 'dg_switch', lx, lz, r, { solid: true });
  C.P(caz, 'dg_puzzle', 25.2, 15.3, 0, { y: 2.3 });
  for (const [lx, lz, k, r] of [[8, 21.5, 'dg_desk', 0], [42, 21.5, 'dg_desk', 0], [14, 26, 'shelf', PI], [36, 26, 'shelf', PI], [25, 21.5, 'dg_console', 0], [6, 24.5, 'crate', 0.3], [45, 24.8, 'barrel', 0]]) C.P(caz, k, lx, lz, r, { solid: true });
  C.Cn(caz, 'electronics', 29, 26, PI, { tier: 2 }); C.Cn(caz, 'toolbox', 32, 26, PI, { tier: 2 }); C.Cn(caz, 'crate', 10, 26, 0, { tier: 1 });
  C.IL(caz, 25, 20.5, 0xd0e8ff, 1.0, 12, 3.2);
  C.F(caz, 'security', 0, 27, 24, 38, { tier: 2 }); C.F(caz, 'commercial', 26, 27, 50, 38, { tier: 1, mul: 0.6 });
  // upper floor: the gallery over the vault holds switches 3 + 4 and the fuel-cell receptacle
  for (const lx of [16, 34]) C.P(caz, 'dg_switch', lx, 1.0, 0, { solid: true, storey: 1 });
  C.P(caz, 'dg_fusebox', 25, 0.9, 0, { solid: true, storey: 1 });
  C.F(caz, 'storage', 0, 0, 13, 15, { tier: 2, storey: 1 }); C.F(caz, 'control', 13, 0, 37, 15, { tier: 2, storey: 1 }); C.F(caz, 'security', 37, 0, 50, 15, { tier: 2, storey: 1 });
  C.F(caz, 'industrial', 0, 15, 50, 38, { tier: 1, storey: 1 });
  for (const u of [-34, -10]) P('dg_barrier', u, -50, 0, { solid: true });
  flood(-58, -110); flood(22, -44); beacon(-58, -42); beacon(23, -110);

  // ================================================================ Pipeline Tower deck: pumphouse (2 storeys) + catwalk rings round the tower
  const TC = [62, -84];
  P('dg_pipetower', TC[0], TC[1], 0, { solid: true }); C.mastLight(...L(TC[0], TC[1]), 19.6);
  const pp = C.B.pp = C.dbld({ u: 28, v: -108, w: 20, d: 18, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Pipeline Pumphouse', roof: 'corrugated', floor: 'metalPanel',
    doors: [{ side: 's', at: 4, w: 2.4, door: true }, { side: 'e', at: 7, w: 2.4 }, { side: 'w', at: 4, w: 2, door: true }, { side: 'e', at: 12, w: 2, door: true, storey: 1 }],
    inner: [[11, 0, 11, 18, [{ at: 8, w: 1.8 }]], [11, 0, 11, 18, [{ at: 4, w: 1.8 }], 1]],
    stairs: [{ x: 18.0, z: 10.6, w: 1.4, dir: 'n', from: 0, to: 1 }] });
  C.F(pp, 'industrial', 0, 0, 11, 18, { tier: 2 });
  C.P(pp, 'dg_pump', 4, 6, PI / 2, { solid: true }); C.P(pp, 'dg_valve', 7.5, 13, 0, { solid: true });     // "the valve"
  C.F(pp, 'control', 11, 0, 20, 18, { tier: 2 });
  C.F(pp, 'storage', 0, 0, 11, 18, { tier: 1, storey: 1 }); C.F(pp, 'control', 11, 0, 20, 18, { tier: 2, storey: 1 });
  // catwalks: a lower ring at the pumphouse's first floor (bridge from its east door), an upper ring by ladder
  const ring = (y, rad, rails = () => true) => {
    const pts = Array.from({ length: 9 }, (_, i) => L(TC[0] + Math.cos(i / 8 * 2 * PI + PI / 8) * rad, TC[1] + Math.sin(i / 8 * 2 * PI + PI / 8) * rad));
    for (let i = 0; i < 8; i++) w.bridge([pts[i], pts[i + 1]], 1.6, y, 'metalPanel', { pillars: 0, thick: 0.35, rails: rails(i) });
    return pts;
  };
  const yLo = HIGH + 3.2, yHi = HIGH + 9.2, door = [48.2, -95];
  const ang = Math.atan2(door[1] - TC[1], door[0] - TC[0]), seg = Math.floor((((ang - PI / 8) / (2 * PI) * 8) % 8 + 8) % 8);
  ring(yLo, 5.2, (i) => i !== seg); ring(yHi, 5.2);
  w.bridge([L(...door), L(TC[0] + Math.cos(ang) * 5.0, TC[1] + Math.sin(ang) * 5.0)], 1.8, yLo, 'metalPanel', { pillars: 0, thick: 0.35 });
  { const a = ang + PI, [bx, bz] = L(TC[0] + Math.cos(a) * 6.9, TC[1] + Math.sin(a) * 6.9), [tx, tz] = L(TC[0] + Math.cos(a) * 5.2, TC[1] + Math.sin(a) * 5.2); w.ladder(bx, bz, null, tx, tz, yLo, -Math.atan2(tx - bx, tz - bz)); }
  { const a = ang + PI / 2, [x, z] = L(TC[0] + Math.cos(a) * 5.2, TC[1] + Math.sin(a) * 5.2); w.ladder(x, z, yLo, x, z, yHi, a); }
  for (const [u, v, r] of [[74, -100, PI / 2], [74, -70, PI / 2], [50, -60, 0], [92, -100, 0], [92, -90, 0]]) P('dg_bigpipe', u, v, r, { solid: true });   // penstocks + racks
  P('dg_scaffold', 54, -101, 0, { solid: true });
  flood(80, -110); flood(30, -58); beacon(81, -56); beacon(81, -110);

  // ================================================================ The Breach
  for (const [u, v, r] of [[-40, -8, 0.4], [24, -14, 2.2], [-14, 34, 1.1], [46, 34, 2.8], [-56, 6, 0.2], [58, -6, 1.7]]) P('dg_slab', u, v, r, { solid: true, scale: 0.9 + rng() * 0.3 });
  P('dg_brokenspan', -44, -18, 1.4, {});
  C.gblock(G, 28, 14, 46, 30, 4.6, 'damConcrete', { y0: 0.6 });                            // fallen dam monolith (Sentinal perch)
  const inBreach = (x, z) => { const [u, v] = toL(x, z); return u > -70 && u < 72 && Math.abs(v) < 34; };
  C.clutter(...L(0, 4), 42, 24, ['dg_rubble', 'dg_rubble', 'debris', 'dg_rubble', 'rock'], { scale: 1.2, avoid: (x, z) => !inBreach(x, z) || (C.inDam(x, z, 1)) || Math.hypot(x - 620, z - 316) < 5 });
  C.sandbags(LP([[-56, -4], [-48, 0], [-40, -4]]));
  P('husk', -24, -8, 0.6, { solid: true }); P('dg_huskbig', 22, -2, 2.1, { solid: true });
  w.container('barron_husk', 620, 316, 0.6, { tier: 2 });                                  // Baron husk (reference ◎)
  w.paintCircle('rock', 620, 316, 4.5, 0.4, 5);
  C.loot(...L(0, 4), 30, ['arc_husk', 'ammo_box', 'crate', 'arc_crate', 'trash'], 2, { avoid: (x, z) => !inBreach(x, z) || C.inDam(x, z, 1) });
  for (const [u, v] of [[-36, 0], [14, -18], [40, 4]]) lamp(u, v, { y: 4, color: 0xffb070, intensity: 1.55, range: 10, flicker: 0.7 });
  C.fire(...L(-8, 14));
  const onApron = (x, z) => { const [u, v] = toL(x, z); return u > 60 && u < 94 && v > 42 && v < 148; };
  C.clutter(...L(76, 95), 50, 26, ['dg_rubble', 'debris', 'debris', 'barrel', 'dg_slab', 'husk', 'pipe'], { frame: G, avoid: (x, z) => !onApron(x, z) });
  for (const [u, v, r] of [[70, 60, 4], [84, 98, 5], [74, 130, 3.5], [88, 74, 3]]) w.waterPoly(Array.from({ length: 10 }, (_, i) => L(u + Math.cos(i / 10 * 2 * PI) * r, v + Math.sin(i / 10 * 2 * PI) * r * 0.7)), { level: w.groundAt(...L(u, v)) + 0.12, material: C.darkMat });
  C.loot(...L(76, 95), 34, ['arc_husk', 'crate', 'trash'], 1, { avoid: (x, z) => !onApron(x, z) });
  C.clutter(...L(-20, 4), 46, 30, ['dg_rubble', 'dg_rubble', 'dg_slab', 'debris', 'debris', 'rock', 'dg_huskbig'], { scale: 1.1, avoid: (x, z) => !inBreach(x, z) || C.inDam(x, z, 1) || Math.hypot(x - 620, z - 316) < 5 });
  P('dg_sentmast', -18, -32, 0, { solid: true });                                         // Sentinal perch on the broken stub
  beacon(-41, -27); beacon(11, -27);

  // ================================================================ Floodgates
  CHUTES.forEach((c, i) => {
    P('dg_floodgate', 15.8, c, PI / 2, { solid: true });
    if (i % 2 === 0) P('dg_gantry', 11.5, c, PI / 2, {});
    P('dg_spillgrate', 26, c, PI / 2, {});
    beacon(17.2, c - 5.6);
    C.clutter(...L(44, c), 10, 3, ['debris', 'dg_rubble', 'barrel'], { sz: 0.3, avoid: (x, z) => { const [u, v] = toL(x, z); return Math.abs(v - c) > 3 || u < 39; } });
  });
  // service bridge over the chute heads, resting on the piers: walk along it, or under it down the chutes
  w.bridge([L(36, 42), L(36, 150)], 2.4, HIGH + 0.02, 'metalPanel', { pillars: 0, thick: 0.45 });
  for (let v = 42; v < 150; v += 4) P('dg_rail', 11.5, v + 2, 0, {});
  for (const u of [24, 44, 52]) beacon(u, 151);
  const fc = C.B.fc = C.dbld({ u: -28, v: 46, w: 22, d: 16, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Floodgate Control', floor: 'metalPanel', tint: 0xe8e0d0,
    doors: [{ side: 's', at: 3, w: 2.2, door: true }, { side: 'e', at: 9, w: 2, door: true }, { side: 'n', at: 4, w: 3, sill: 1.1 }, { side: 'n', at: 14, w: 3, sill: 1.1 }, { side: 'w', at: 6, w: 3, sill: 1.1 },
      { side: 'e', at: 3, w: 3, sill: 1.0, storey: 1 }, { side: 'e', at: 10, w: 4, sill: 1.0, storey: 1 }],
    inner: [[12, 0, 12, 16, [{ at: 9, w: 1.8 }]]],
    stairs: [{ x: 19.8, z: 1.4, w: 1.4, dir: 's', from: 0, to: 1 }], ladders: [{ side: 'n', at: 9 }] });
  C.F(fc, 'control', 0, 0, 12, 16, { tier: 2 }); C.F(fc, 'office', 12, 0, 22, 16, { tier: 2 });
  C.F(fc, 'control', 0, 0, 22, 16, { tier: 2, storey: 1, extra: [['electronics', 1]] });
  const fm = C.dbld({ u: -28, v: 72, w: 16, d: 12, floorY: HIGH, blend: 0.5, name: 'Floodgate Maintenance', roof: 'corrugated', floor: 'concrete',
    doors: [{ side: 's', at: 2, w: 2.4 }, { side: 'e', at: 6, w: 2, door: true }, { side: 'n', at: 5, w: 3, sill: 1.1 }] });
  C.F(fm, 'workshop', 0, 0, 16, 12, { tier: 2 });
  P('dg_signred', -10.5, 86, 0, { solid: true });                                          // maintenance tunnel sign
  const ih = C.dbld({ u: -28, v: 96, w: 22, d: 16, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Intake House', floor: 'metalPanel',
    doors: [{ side: 's', at: 10, w: 2.4, door: true }, { side: 'e', at: 5, w: 2, door: true }, { side: 'w', at: 6, w: 3, sill: 1.1 }],
    inner: [[0, 8, 22, 8, [{ at: 14, w: 1.8 }]]],
    stairs: [{ x: 2, z: 14.0, w: 1.4, dir: 'e', from: 0, to: 1 }] });
  C.F(ih, 'industrial', 0, 0, 22, 8, { tier: 2, extra: [['toolbox', 1]] });
  C.P(ih, 'dg_pump', 6, 3.5, 0, { solid: true }); C.P(ih, 'dg_valve', 15, 3.5, 0, { solid: true });
  C.F(ih, 'office', 0, 8, 22, 16, { tier: 1 }); C.F(ih, 'office', 0, 0, 22, 16, { tier: 2, storey: 1 });
  const gt = C.B.gt = C.dbld({ u: -28, v: 120, w: 12, d: 10, floorY: HIGH, blend: 0.5, name: 'Gate Hut', roof: 'corrugated', doors: [{ side: 'e', at: 3, w: 2 }, { side: 's', at: 2, w: 3, sill: 1.1 }] });
  C.F(gt, 'storage', 0, 0, 12, 10, { tier: 1 });
  for (const v of [56, 128, 140]) C.gblock(G, -39, v, -32, v + 7, HIGH - 2.6, 'damConcrete', { y0: 2.1 });   // buttresses on the swamp face
  for (const [u, v] of [[-30, 42], [-30, 68], [-30, 116], [-30, 148], [8, 68], [8, 122]]) flood(u, v);
  for (const [u, v] of [[-31, 41], [-31, 151], [17, 41]]) beacon(u, v);

  // ================================================================ South platform: Primary Facility, Control Tower, R&A
  // Primary Facility: offices + workshops (2 storeys each) around a tall turbine hall
  const pfW = C.dbld({ u: -46, v: 158, w: 18, d: 26, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Primary Facility Offices', wall: 'concrete', tint: 0xd8d2c4, floor: 'tiles',
    doors: [{ side: 's', at: 8, w: 3.2 }, { side: 'w', at: 10, w: 2.4, door: true }, { side: 'e', at: 4, w: 2, door: true }, { side: 'e', at: 18, w: 2.4 }, { side: 'n', at: 12, w: 3, sill: 1.1 }, { side: 's', at: 14, w: 2.4, sill: 1.1 }],
    inner: [[0, 13, 18, 13, [{ at: 7, w: 1.8 }]], [0, 13, 18, 13, [{ at: 12, w: 1.8 }], 1]],
    stairs: [{ x: 0.6, z: 15.4, w: 1.4, dir: 'n', from: 0, to: 1 }], ladders: [{ side: 'n', at: 5 }] });
  C.F(pfW, 'office', 0, 0, 18, 13, { tier: 2 }); C.F(pfW, 'workshop', 0, 13, 18, 26, { tier: 2 });
  C.F(pfW, 'office', 0, 0, 18, 13, { tier: 2, storey: 1 }); C.F(pfW, 'lab', 0, 13, 18, 26, { tier: 2, storey: 1 });
  const pf = C.B.pf = C.dbld({ u: -28, v: 158, w: 22, d: 26, h: 8.4, floorY: HIGH, blend: 0.5, name: 'Primary Facility', wall: 'concrete', tint: 0xd8d2c4, floor: 'metalPanel',
    doors: [{ side: 's', at: 9, w: 4.5 }, { side: 'n', at: 10, w: 2, door: true }, { side: 'w', at: 4, w: 2 }, { side: 'w', at: 18, w: 2.4 }, { side: 'e', at: 11, w: 2.4 },
      { side: 's', at: 2, w: 3, sill: 1.1, top: 4 }, { side: 's', at: 17, w: 3, sill: 1.1, top: 4 }, { side: 'n', at: 3, w: 3, sill: 2.2, top: 5 }, { side: 'n', at: 16, w: 3, sill: 2.2, top: 5 }],
    roofExtras: [[4, 6, 18, 12, 1.8]] });
  C.P(pf, 'dg_turbine', 11, 11, 0, { solid: true }); C.P(pf, 'dg_console', 18, 22.5, PI, { solid: true }); C.P(pf, 'dg_generator', 11, 3.5, 0, { solid: true, scale: 0.7 });
  C.Cn(pf, 'toolbox', 4, 20, 0, { tier: 2 }); C.Cn(pf, 'electronics', 18.5, 19.5, 0, { tier: 2 }); C.Cn(pf, 'crate', 3, 3, 0, { tier: 1 });
  C.IL(pf, 6, 13, 0xffd090, 1.2, 11, 5); C.IL(pf, 17, 13, 0xffd090, 1.2, 11, 5);
  const pfE = C.dbld({ u: -6, v: 158, w: 16, d: 26, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Primary Facility Workshops', wall: 'concrete', tint: 0xd8d2c4, floor: 'metalPanel',
    doors: [{ side: 'w', at: 11, w: 2.4, door: true }, { side: 'e', at: 10, w: 2.4, door: true }, { side: 's', at: 4, w: 3, sill: 1.1 }, { side: 'n', at: 6, w: 3, sill: 1.1 }],
    inner: [[0, 13, 16, 13, [{ at: 6, w: 1.8 }]]],
    stairs: [{ x: 14.0, z: 15.4, w: 1.4, dir: 'n', from: 0, to: 1 }] });
  C.F(pfE, 'industrial', 0, 0, 16, 13, { tier: 2, extra: [['crate', 1]] }); C.F(pfE, 'workshop', 0, 13, 16, 26, { tier: 1 });
  C.F(pfE, 'storage', 0, 0, 16, 26, { tier: 1, storey: 1, extra: [['ammo_box', 1]] });
  const pa = C.dbld({ u: -44, v: 196, w: 32, d: 18, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Primary Facility Annex', tint: 0xe0d8c8, floor: 'tiles',
    doors: [{ side: 'n', at: 6, w: 2, door: true }, { side: 'w', at: 8, w: 2, door: true }, { side: 's', at: 24, w: 2, door: true }, { side: 'e', at: 6, w: 3, sill: 1.1 }, { side: 's', at: 8, w: 3, sill: 1.1 }],
    inner: [[16, 0, 16, 18, [{ at: 4, w: 1.8 }]], [16, 9, 32, 9, [{ at: 6, w: 1.6 }]], [16, 0, 16, 18, [{ at: 12, w: 1.8 }], 1]],
    stairs: [{ x: 0.6, z: 11.4, w: 1.4, dir: 'n', from: 0, to: 1 }] });
  C.F(pa, 'office', 0, 0, 16, 18, { tier: 2 }); C.F(pa, 'medical', 16, 0, 32, 9, { tier: 2 }); C.F(pa, 'storage', 16, 9, 32, 18, { tier: 1 });
  C.F(pa, 'medical', 0, 0, 16, 18, { tier: 2, storey: 1 }); C.F(pa, 'office', 16, 0, 32, 18, { tier: 1, storey: 1 });
  C.fieldDepot(...L(-32, 230), G.a);
  const vg = C.dbld({ u: -92, v: 204, w: 20, d: 12, floorY: HIGH, blend: 0.5, name: 'Valve Gallery', roof: 'corrugated', floor: 'concrete',
    doors: [{ side: 'e', at: 4, w: 2.4, door: true }, { side: 'n', at: 12, w: 2 }, { side: 's', at: 6, w: 3, sill: 1.1 }] });
  C.F(vg, 'industrial', 0, 0, 20, 12, { tier: 1 });
  // Control Tower: a 2-storey base and a 5-storey tower (stairs all the way; the locked control room is the
  // glass top floor; a roof ladder; the tower's 2nd floor opens onto the base's roof terrace)
  const ct = C.B.ctb = C.dbld({ u: 30, v: 162, w: 44, d: 28, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Control Tower Base', tint: 0xe4dccc, floor: 'tiles', parapet: false,
    doors: [{ side: 's', at: 21, w: 2.4, door: true }, { side: 'w', at: 18, w: 1.8, door: true }, { side: 'e', at: 18, w: 1.8, door: true }, { side: 'n', at: 20, w: 2.4 }, { side: 'n', at: 20, w: 2.4, storey: 1 },
      { side: 'n', at: 26, w: 3, sill: 1.0 }, { side: 'n', at: 34, w: 3, sill: 1.0 }, { side: 's', at: 4, w: 3, sill: 1.1 }, { side: 's', at: 36, w: 3, sill: 1.1 }],
    inner: [[0, 12, 44, 12, [{ at: 20.8, w: 2.4 }]], [14, 12, 14, 28, [{ at: 6.5, w: 1.8 }]], [30, 12, 30, 28, [{ at: 6.5, w: 1.8 }]],
      [0, 12, 44, 12, [{ at: 6, w: 2 }, { at: 30, w: 2 }], 1], [22, 12, 22, 28, [{ at: 8, w: 1.8 }], 1]],
    stairs: [{ x: 6, z: 0.7, w: 1.4, dir: 'e', from: 0, to: 1 }] });
  C.F(ct, 'control', 0, 0, 44, 12, { tier: 2 });
  C.F(ct, 'security', 0, 12, 14, 28, { tier: 2 }); C.F(ct, 'office', 14, 12, 30, 28, { tier: 1, mul: 0.7 }); C.F(ct, 'storage', 30, 12, 44, 28, { tier: 1 });
  C.F(ct, 'office', 0, 0, 44, 12, { tier: 2, storey: 1 }); C.F(ct, 'office', 0, 12, 22, 28, { tier: 1, storey: 1 }); C.F(ct, 'security', 22, 12, 44, 28, { tier: 2, storey: 1 });
  const win4 = (side, ats) => ats.map(at => ({ side, at, w: 2.4, sill: 0.9, top: 2.9, storey: 4 }));
  const tw = C.B.ct = C.dbld({ u: 48, v: 150, w: 12, d: 12, storeys: 5, floorY: HIGH, blend: 0.5, name: 'Control Tower', tint: 0xece4d4, floor: 'tiles', upWin: false,
    doors: [{ side: 's', at: 2, w: 2.4 }, { side: 'w', at: 7, w: 1.8, door: true }, { side: 's', at: 2, w: 2.4, storey: 1 }, { side: 's', at: 2, w: 2.4, door: true, storey: 2 },
      ...[1, 2, 3].flatMap(k => [{ side: 'n', at: 4.8, w: 2.4, sill: 1.0, storey: k }, { side: 'e', at: 9, w: 2, sill: 1.0, storey: k }, { side: 'w', at: 9, w: 2, sill: 1.0, storey: k }]),
      ...win4('n', [0.8, 4.8, 8.8]), ...win4('w', [0.8, 4.8, 8.8]), ...win4('s', [0.8, 4.8]), { side: 'e', at: 0.8, w: 2.4, sill: 0.9, top: 2.9, storey: 4 }],
    inner: [[8.5, 0, 8.5, 12, [{ at: 9, w: 2, door: true, locked: 'control_tower' }], 4]],
    stairs: [{ x: 0.8, z: 2.5, w: 1.4, dir: 'n', from: 0, to: 1 }, { x: 9.8, z: 2.5, w: 1.4, dir: 's', from: 1, to: 2 }, { x: 0.8, z: 2.5, w: 1.4, dir: 'n', from: 2, to: 3 }, { x: 9.8, z: 2.5, w: 1.4, dir: 's', from: 3, to: 4 }],
    ladders: [{ x: 10.6, z: 10.8, from: 4, to: 'top' }] });
  for (let k = 0; k < 4; k++) C.IL(tw, 6, 6, 0xfff0d0, 1.2, 8, 2.7, k);
  C.Cn(tw, 'locker', 5.5, 11.2, PI, { tier: 1, storey: 1 }); C.Cn(tw, 'cabinet', 5.5, 11.2, PI, { tier: 1, storey: 3 }); C.Cn(tw, 'ammo_box', 6, 0.8, 0, { tier: 1, storey: 2 });
  C.F(tw, 'control', 0, 0, 8.5, 12, { tier: 3, storey: 4, room: 'control_tower', extra: [['security_locker', 1], ['weapon_case', 1], ['electronics', 1], ['safe', 1]], li: 1.4 });
  C.K(tw, 'control_tower', 0, 0, 8.5, 12, 'Control Tower Control Room', 4);
  const tr = C.roofY(tw);
  C.P(tw, 'dg_antennamast', 2, 2, 0, { yAbs: tr, solid: true, scale: 0.7 }); C.P(tw, 'dg_satdish', 3, 9.5, 0.6, { yAbs: tr, solid: true, scale: 0.8 });
  { const [x, z] = C.Wp(tw, 2, 2); C.lampAt(x, z, tr + 8, { y: 0.4, model: null, color: 0xff3020, intensity: 0.8, range: 6, flicker: 0.6 }); }
  { const [x, z] = C.Wp(tw, 4, 6); C.lampAt(x, z, C.storeyY(tw, 4), { y: 2.6, model: null, color: 0x9ae8ff, intensity: 1.2, range: 10 }); }
  // Research & Administration: 2 storeys (Lab 1 upstairs above the reception), roof ladder, Sentinal + dishes on the roof
  const ra = C.B.ra = C.dbld({ u: 28, v: 196, w: 48, d: 42, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Research & Administration', tint: 0xe8e0d0, floor: 'tiles', roofTint: 0xd0d0c8,
    doors: [{ side: 's', at: 23, w: 2.4, door: true }, { side: 'n', at: 23, w: 2.4, door: true }, { side: 'w', at: 20, w: 1.8, door: true }, { side: 'e', at: 20, w: 1.8, door: true },
      { side: 's', at: 7, w: 3, sill: 1.1 }, { side: 's', at: 38, w: 3, sill: 1.1 }, { side: 'e', at: 6, w: 3, sill: 1.1 }, { side: 'w', at: 6, w: 3, sill: 1.1 }, { side: 'n', at: 7, w: 3, sill: 1.1 }, { side: 'n', at: 38, w: 3, sill: 1.1 }],
    inner: [[0, 14, 48, 14, [{ at: 6, w: 1.8 }, { at: 23, w: 1.8 }, { at: 40, w: 1.8 }]], [16, 0, 16, 14, []], [32, 0, 32, 14, []],
      [0, 28, 48, 28, [{ at: 6, w: 1.8, door: true, locked: 'staff_room' }, { at: 23, w: 2.4 }, { at: 40, w: 1.8 }]], [17, 28, 17, 42, []], [31, 28, 31, 42, []],
      [0, 14, 48, 14, [{ at: 6, w: 1.8 }, { at: 23, w: 1.8 }, { at: 40, w: 1.8 }], 1], [16, 0, 16, 14, [{ at: 6, w: 1.6 }], 1],
      [0, 30, 48, 30, [{ at: 20, w: 2 }, { at: 40, w: 1.8 }], 1], [17, 30, 17, 42, [{ at: 6, w: 1.8 }], 1], [31, 30, 31, 42, [{ at: 6, w: 1.8 }], 1]],
    stairs: [{ x: 10, z: 26.0, w: 1.4, dir: 'e', from: 0, to: 1 }], ladders: [{ side: 'e', at: 30 }],
    roofExtras: [[6, 4, 14, 10, 1.4], [33, 30, 41, 38, 1.4]] });
  C.F(ra, 'lab', 0, 0, 16, 14, { tier: 2 });                     // Lab 2
  C.F(ra, 'server', 16, 0, 32, 14, { tier: 2 }); C.F(ra, 'lab', 32, 0, 48, 14, { tier: 2 });
  C.F(ra, 'commercial', 0, 14, 48, 28, { tier: 1 });
  C.P(ra, 'dg_noticeboard', 24, 14.8, 0, { solid: true });
  C.F(ra, 'bunk', 0, 28, 17, 42, { tier: 3, room: 'staff_room', extra: [['security_locker', 1], ['weapon_case', 1], ['medical_bag', 1]] });
  C.K(ra, 'staff_room', 0, 28, 17, 42, 'Staff Room');
  C.F(ra, 'office', 17, 28, 31, 42, { tier: 1 });                // reception
  C.F(ra, 'office', 31, 28, 48, 42, { tier: 2 });
  C.F(ra, 'office', 0, 0, 16, 14, { tier: 2, storey: 1 }); C.F(ra, 'lab', 16, 0, 48, 14, { tier: 2, storey: 1 });
  C.F(ra, 'commercial', 0, 14, 48, 30, { tier: 1, storey: 1, mul: 0.6 });
  C.F(ra, 'bunk', 0, 30, 17, 42, { tier: 1, storey: 1 }); C.F(ra, 'lab', 17, 30, 31, 42, { tier: 2, storey: 1, extra: [['electronics', 1]] });   // Lab 1
  C.F(ra, 'server', 31, 30, 48, 42, { tier: 2, storey: 1 });
  C.P(ra, 'dg_sign', 24, 44.6, PI, { solid: true });
  C.P(ra, 'dg_satdish', 44, 33, 2.4, { yAbs: C.roofY(ra), solid: true }); C.P(ra, 'dg_satdish', 44, 26, 2.0, { yAbs: C.roofY(ra), solid: true, scale: 0.7 });
  for (const [u, v, r] of [[16, 152, PI / 2], [26, 152, PI / 2], [-30, 192, 0]]) P('dg_barrier', u, v, r, { solid: true });
  for (const [u, v] of [[-48, 152], [80, 152], [-48, 240], [80, 240], [20, 220], [-102, 202], [-102, 238], [24, 156]]) flood(u, v);
  for (const [u, v] of [[-49, 151], [81, 151], [-49, 241], [81, 241]]) beacon(u, v);

  // ================================================================ Red Lakes Balcony (the Flood Access Tunnel runs under its west end)
  for (let u = 92; u < 286; u += 24) { if ((u / 24) % 2 < 1) flood(u, 174.5); else beacon(u, 183); }
  C.gblock(G, 116, 169.6, 126, 170.8, 3.2, 'metalPanel', {});                              // flood gate of the tunnel (sealed, basin side)
  P('dg_signred', 121, 168.6, PI, { solid: true });
  lamp(121, 168, { y: 3.2, model: null, color: 0xffb040, intensity: 1.55, range: 8, flicker: 0.3 });
  C.fieldDepot(...L(154, 198), G.a);
}

// ==================================================================================== NORTH
function northPOIs(C) {
  const { w, R, rng } = C;
  const G = DAM;
  // ---------------- Raider Outpost East (dam frame, north of the highway)
  const shack = (u, v, ww, d, nm, type, tier) => {
    const bb = C.dbld({ u, v, w: ww, d, wall: 'corrugated', floor: 'wood', roof: 'corrugated', roofTint: 0xb09070, name: nm, floorY: HIGH + 0.6, blend: 1,
      doors: [{ side: 's', at: 2, w: 1.8 }, { side: 'e', at: 2, w: 2, sill: 1.0 }] });
    C.F(bb, type, 0, 0, ww, d, { tier });
    return bb;
  };
  C.B.roe = shack(112, -258, 10, 8, 'Raider Shack', 'raider', 2);
  shack(126, -240, 9, 8, 'Raider Bunkhouse', 'bunk', 1);
  shack(138, -258, 10, 8, 'Raider Workshop', 'workshop', 2);
  C.gprop(G, 'dg_watchtower', 150, -228, 0.3, { solid: true });
  C.gprop(G, 'dg_tent', 108, -230, 0.2, { solid: true }); C.gprop(G, 'dg_tent', 140, -236, -0.1, { solid: true });
  C.sandbags(LP([[104, -262], [104, -244], [110, -238]])); C.sandbags(LP([[146, -262], [152, -250]]));
  C.fire(...L(122, -232));
  C.loot(...L(126, -244), 16, ['raider_cache', 'ammo_box', 'crate', 'backpack', 'medical_bag', 'weapon_case'], 2);
  C.clutter(...L(126, -244), 22, 14, ['crate', 'barrel', 'dg_hedgehog', 'debris', 'dg_barrier'], { frame: G, avoid: (x, z) => { const [u, v] = toL(x, z); return v > -214; } });
  for (const [u, v] of [[110, -262], [150, -262], [104, -236]]) C.glamp(G, u, v, { y: 3.4, color: 0xffa860, intensity: 1.55, range: 10, flicker: 0.4 });
  // ---------------- West Broken Bridge: the standing span is a real bridge (walk on it, or under it to the
  // raider hideout in its shadow); it ends in a sheer break over the fallen spans
  const WB_Y = 12.4;
  w.bridge(LP([[-250.2, -195], [-215, -195]]), 10, WB_Y, 'asphalt', { thick: 0.8, pillars: 11, pillarW: 1.6, side: 'concrete' });
  for (const u of [-246, -232, -219]) C.beacon(...L(u, -199), { base: WB_Y });
  C.lampAt(...L(-238, -191.5), WB_Y, { y: 4.2, model: 'lamp', color: 0xe0ecff, intensity: 1.4, range: 12 });
  w.prop('dg_brokenspan', 566, 31, 1.1, {}); w.prop('dg_brokenspan', 592, 52, 2.2, {});
  C.clutter(582, 46, 24, 16, ['dg_rubble', 'dg_rubble', 'debris', 'rock', 'dg_slab'], { avoid: (x, z) => C.inDam(x, z, 2) || C.distLine(...toL(x, z), [[-252, -195], [-213, -195]]) < 6 });
  // the hideout under the deck (between the pillars)
  C.gprop(G, 'dg_tent', -238, -191.6, PI / 2, { solid: true }); C.gprop(G, 'dg_bed', -226, -191.8, PI / 2, { solid: true }); C.gprop(G, 'dg_bed', -226, -198.2, PI / 2, { solid: true });
  C.fire(...L(-232, -195.6));
  C.gcont(G, 'raider_cache', -243, -198.4, 0, { tier: 2 }); C.gcont(G, 'suitcase', -229.5, -191.4, 0, { tier: 1 }); C.gcont(G, 'ammo_box', -236, -198.6, 0, { tier: 1 });
  C.gcont(G, 'backpack', -221, -192, 0, { tier: 1 });
  C.sandbags(LP([[-246, -189.5], [-240, -188.5], [-232, -188.5]])); C.sandbags(LP([[-246, -200.5], [-240, -201.5]]));
  C.gprop(G, 'crate', -244, -191.6, 0, { solid: true }); C.gprop(G, 'barrel', -219.5, -198.6, 0, { solid: true });
  // ---------------- East Broken Bridge: real span off the dam abutment, broken off over the basin
  const EB_Y = HIGH + 0.25;
  w.bridge(LP([[185.8, -206], [218, -206]]), 9, EB_Y, 'asphalt', { thick: 0.8, pillars: 12, pillarW: 1.6, side: 'concrete' });
  for (const u of [192, 204, 214]) C.beacon(...L(u, -202.2), { base: EB_Y });
  C.gprop(G, 'dg_barrier', 196, -208, 0, { solid: true, yAbs: EB_Y }); C.gcont(G, 'car_trunk', 208, -204, 0.1, { tier: 1, yAbs: EB_Y });
  C.gprop(G, 'car', 208, -206.6, PI / 2 + 0.1, { solid: true, yAbs: EB_Y });
  w.prop('dg_brokenspan', 944, 244, 2.1, {}); w.prop('dg_brokenspan', 956, 262, 2.6, {});
  C.clutter(950, 256, 18, 14, ['dg_rubble', 'debris', 'rock', 'dg_slab'], {});
  C.loot(948, 252, 14, ['crate', 'trash', 'ammo_box'], 1);
  // ---------------- Pattern House (walled compound, dam frame): 2 storeys, stairs in the hall
  C.compound(G, -110, -266, -70, -228, 1.6, 'brick', [['s', 18], ['w', 16], ['e', 30]]);
  const ph = C.B.ph = C.dbld({ u: -104, v: -244, w: 24, d: 12, storeys: 2, wall: 'brick', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', name: 'Pattern House', tint: 0xf0d8c8,
    doors: [{ side: 's', at: 10, w: 2, door: true }, { side: 'e', at: 8, w: 1.6, door: true }, { side: 's', at: 3, w: 2.4, sill: 0.9 }, { side: 's', at: 19, w: 2.4, sill: 0.9 }, { side: 'n', at: 3, w: 2.4, sill: 0.9 }, { side: 'n', at: 11, w: 2.4, sill: 0.9 }, { side: 'n', at: 19, w: 2.4, sill: 0.9 }, { side: 'w', at: 4, w: 2, sill: 0.9 }],
    inner: [[8, 0, 8, 12, [{ at: 7, w: 1.6 }]], [16, 0, 16, 12, [{ at: 7, w: 1.6 }]], [16, 6, 24, 6, [{ at: 3, w: 1.6 }]],
      [8, 0, 8, 12, [{ at: 4, w: 1.6 }], 1], [16, 0, 16, 12, [{ at: 4, w: 1.6 }], 1]],
    stairs: [{ x: 9.35, z: 10.1, w: 1.4, dir: 'e', from: 0, to: 1 }] });
  C.F(ph, 'bedroom', 0, 0, 8, 12, { tier: 2 }); C.F(ph, 'living', 8, 0, 16, 12, { tier: 2 }); C.F(ph, 'office', 16, 0, 24, 6, { tier: 2 }); C.F(ph, 'storage', 16, 6, 24, 12, { tier: 1 });
  C.F(ph, 'bedroom', 0, 0, 8, 12, { tier: 2, storey: 1 }); C.F(ph, 'living', 8, 0, 16, 12, { tier: 1, storey: 1 }); C.F(ph, 'office', 16, 0, 24, 12, { tier: 2, storey: 1, extra: [['cabinet', 1]] });
  const pk = C.dbld({ u: -80, v: -262, w: 8, d: 12, wall: 'brick', roof: 'roofTile', roofShape: 'gable', name: 'Pattern House Kitchen', doors: [{ side: 'w', at: 4, w: 1.6, door: true }, { side: 's', at: 3, w: 2, sill: 0.9 }] });
  C.F(pk, 'kitchen', 0, 0, 8, 12, { tier: 1 });
  const ps = C.dbld({ u: -108, v: -264, w: 8, d: 8, wall: 'wood', roof: 'corrugated', name: 'Garden Shed', floor: 'wood', doors: [{ side: 'e', at: 3, w: 1.6 }] });
  C.F(ps, 'workshop', 0, 0, 8, 8, { tier: 1 });
  const inPH = (x, z) => { const [u, v] = toL(x, z); return u > -108 && u < -72 && v > -264 && v < -230; };
  C.clutter(...L(-90, -252), 16, 10, ['bush', 'dg_planter', 'barrel', 'crate'], { frame: G, avoid: (x, z) => !inPH(x, z) || C.reserved.some(([a, b]) => Math.hypot(a - x, b - z) < 3) });
  C.gprop(G, 'car', -76, -236, PI / 2, { solid: true }); C.gcont(G, 'car_trunk', -76, -233.4, 0, { tier: 1 });
  C.glamp(G, -90, -238, { y: 3, model: null, color: 0xffc890, intensity: 1.2, range: 9 }); C.glamp(G, -72, -229, { y: 4, color: 0xffc078, intensity: 1.55, range: 10 });
  // ---------------- Rubie Residence (villa + garden + two houses, turned -15°); the villa and the guesthouse have real upper floors
  const RU = G_RUB;
  C.compound(RU, 348, 50, 392, 90, 1.5, 'plaster', [['s', 22], ['w', 26], ['e', 20]], { tint: 0xe8c8c0 });
  const rv = C.B.rubie = C.gbld(RU, { x: 356, z: 56, w: 28, d: 22, storeys: 2, wall: 'plaster', tint: 0xe8c0b8, floor: 'wood', roof: 'roofTile', roofShape: 'gable', name: 'Rubie Residence',
    doors: [{ side: 's', at: 12, w: 2, door: true }, { side: 'n', at: 22, w: 1.6, door: true }, { side: 's', at: 3, w: 2.4, sill: 0.9 }, { side: 's', at: 21, w: 2.4, sill: 0.9 }, { side: 'w', at: 6, w: 2, sill: 0.9 }, { side: 'e', at: 14, w: 2, sill: 0.9 }, { side: 'n', at: 4, w: 2.4, sill: 0.9 }],
    inner: [[10, 0, 10, 22, [{ at: 8.6, w: 1.6 }, { at: 15, w: 1.6 }]], [18, 0, 18, 22, [{ at: 4, w: 1.8 }, { at: 15, w: 1.6 }]], [0, 12, 10, 12, []], [18, 11, 28, 11, [{ at: 5, w: 1.6 }]],
      [10, 0, 10, 22, [{ at: 9, w: 1.6 }, { at: 15, w: 1.6 }], 1], [0, 12, 10, 12, [], 1], [18, 0, 18, 22, [{ at: 8.5, w: 1.6 }, { at: 15, w: 1.6 }], 1], [18, 11, 28, 11, [], 1]],
    stairs: [{ x: 10.6, z: 2, w: 1.4, dir: 's', from: 0, to: 1 }] });
  C.F(rv, 'bedroom', 0, 0, 10, 12, { tier: 2 }); C.F(rv, 'medical', 0, 12, 10, 22, { tier: 1, mul: 0.7 });
  C.F(rv, 'living', 10, 0, 18, 22, { tier: 2 }); C.F(rv, 'kitchen', 18, 0, 28, 11, { tier: 1 }); C.F(rv, 'office', 18, 11, 28, 22, { tier: 2 });
  C.F(rv, 'bedroom', 0, 0, 10, 12, { tier: 2, storey: 1, extra: [['suitcase', 1]] }); C.F(rv, 'bedroom', 0, 12, 10, 22, { tier: 1, storey: 1 });
  C.F(rv, 'living', 10, 0, 18, 22, { tier: 1, storey: 1, mul: 0.6 }); C.F(rv, 'office', 18, 0, 28, 11, { tier: 2, storey: 1 }); C.F(rv, 'bedroom', 18, 11, 28, 22, { tier: 2, storey: 1 });
  const rc = C.gbld(RU, { x: 322, z: 98, w: 18, d: 14, wall: 'plaster', tint: 0xd8c8b8, floor: 'wood', roof: 'roofTile', roofShape: 'gable', name: 'Rubie Cottage',
    doors: [{ side: 's', at: 3, w: 1.8, door: true }, { side: 'e', at: 4, w: 2, sill: 0.9 }, { side: 'w', at: 6, w: 2, sill: 0.9 }], inner: [[9, 0, 9, 14, [{ at: 6, w: 1.6 }]]] });
  C.F(rc, 'living', 0, 0, 9, 14, { tier: 1 }); C.F(rc, 'bedroom', 9, 0, 18, 14, { tier: 1 });
  const rg = C.gbld(RU, { x: 368, z: 98, w: 20, d: 14, storeys: 2, wall: 'plaster', tint: 0xe0d0c0, floor: 'tiles', roof: 'roofTile', roofShape: 'gable', name: 'Rubie Guesthouse',
    doors: [{ side: 's', at: 4, w: 1.8, door: true }, { side: 'n', at: 12, w: 1.6, door: true }, { side: 's', at: 12, w: 2.4, sill: 0.9 }],
    inner: [[10, 0, 10, 14, [{ at: 6, w: 1.6 }]], [10, 0, 10, 14, [{ at: 6, w: 1.6 }], 1]],
    stairs: [{ x: 2, z: 0.7, w: 1.4, dir: 'e', from: 0, to: 1 }] });
  C.F(rg, 'kitchen', 0, 0, 10, 14, { tier: 1 }); C.F(rg, 'bedroom', 10, 0, 20, 14, { tier: 2 });
  C.F(rg, 'living', 0, 0, 10, 14, { tier: 1, storey: 1 }); C.F(rg, 'bedroom', 10, 0, 20, 14, { tier: 2, storey: 1 });
  const inRU = (x, z) => { const [X, Z] = GL(RU, x, z); return X > 350 && X < 390 && Z > 52 && Z < 88; };
  C.clutter(...GW(RU, 370, 84), 20, 18, ['bush', 'bush', 'tree', 'dg_planter', 'rock'], { avoid: (x, z) => !inRU(x, z) });
  w.prop('car', 344, 120, 0.3, { solid: true }); w.prop('car', 392, 118, 1.2, { solid: true });
  C.loot(...GW(RU, 370, 84), 16, ['basket', 'plant', 'trash'], 1, { avoid: (x, z) => !inRU(x, z) });
  for (const [X, Z] of [[352, 86], [388, 54], [370, 92], [342, 112]]) C.glamp(RU, X, Z, { y: 3.6, color: 0xffc890, intensity: 1.55, range: 10 });
}

// ==================================================================================== WEST (swamp + NW ruins + Water Treatment)
function westPOIs(C) {
  const { w, R, rng } = C;
  // ---------------- Pale Apartments (-15°): A = 3 storeys (common stairwell in the middle flat, roof ladder), B = 3 storeys, C = 2 storeys (shop below)
  const PA = G_PALE;
  const flatWalls = (k) => [[10, 0, 10, 14, [{ at: 9.5, w: 1.6 }], k], [20, 0, 20, 14, [{ at: 9.5, w: 1.6 }], k],
    [0, 7, 10, 7, [{ at: 6, w: 1.6 }], k], [10, 7, 20, 7, [{ at: 0.3, w: 1.6 }], k], [20, 7, 30, 7, [{ at: 6, w: 1.6 }], k]];
  const paA = C.B.pale = C.gbld(PA, { x: 250, z: 146, w: 30, d: 14, storeys: 3, wall: 'plaster', tint: 0xd8d4c8, floor: 'wood', roof: 'roofTar', name: 'Pale Apartments A',
    doors: [{ side: 's', at: 4, w: 1.6, door: true }, { side: 's', at: 14, w: 1.6, door: true }, { side: 's', at: 24, w: 1.6, door: true }, { side: 'n', at: 3, w: 2.2, sill: 1 }, { side: 'n', at: 13, w: 2.2, sill: 1 }, { side: 'n', at: 23, w: 2.2, sill: 1 }, { side: 'w', at: 5, w: 2, sill: 1 }],
    inner: [[10, 0, 10, 14, []], [20, 0, 20, 14, []], [0, 7, 10, 7, [{ at: 6, w: 1.6 }]], [10, 7, 20, 7, [{ at: 2, w: 1.6 }]], [20, 7, 30, 7, [{ at: 6, w: 1.6 }]], ...flatWalls(1), ...flatWalls(2)],
    stairs: [{ x: 11.3, z: 0.7, w: 1.4, dir: 'e', from: 0, to: 1 }, { x: 13.3, z: 4.5, w: 1.4, dir: 'w', from: 1, to: 2 }], ladders: [{ side: 'n', at: 27 }] });
  for (let k = 0; k < 3; k++) for (let u = 0; u < 3; u++) {
    C.F(paA, u === 1 ? 'kitchen' : 'bedroom', u * 10, 0, u * 10 + 10, 7, { tier: 1, storey: k, mul: k ? 0.8 : 1 });
    C.F(paA, 'living', u * 10, 7, u * 10 + 10, 14, { tier: u === 2 || k === 2 ? 2 : 1, storey: k, mul: k ? 0.8 : 1 });
  }
  const paB = C.gbld(PA, { x: 232, z: 176, w: 26, d: 14, storeys: 3, wall: 'plaster', tint: 0xd0ccc0, floor: 'wood', name: 'Pale Apartments B',
    doors: [{ side: 'n', at: 5, w: 1.6, door: true }, { side: 'n', at: 18, w: 1.6, door: true }, { side: 's', at: 4, w: 2.2, sill: 1 }, { side: 's', at: 18, w: 2.2, sill: 1 }, { side: 'e', at: 6, w: 2, sill: 1 }],
    inner: [[13, 0, 13, 14, []], [0, 7, 13, 7, [{ at: 9, w: 1.6 }]], [13, 7, 26, 7, [{ at: 2, w: 1.6 }]],
      ...[1, 2].flatMap(k => [[13, 0, 13, 14, [{ at: 10, w: 1.6 }], k], [0, 7, 13, 7, [{ at: 9, w: 1.6 }], k], [13, 7, 26, 7, [{ at: 4, w: 1.6 }], k]])],
    stairs: [{ x: 6.4, z: 0.7, w: 1.4, dir: 'e', from: 0, to: 1 }, { x: 1.6, z: 4.6, w: 1.4, dir: 'e', from: 1, to: 2 }] });
  C.F(paB, 'living', 0, 0, 13, 7, { tier: 1 }); C.F(paB, 'bedroom', 0, 7, 13, 14, { tier: 2 });
  C.F(paB, 'kitchen', 13, 0, 26, 7, { tier: 1 }); C.F(paB, 'bunk', 13, 7, 26, 14, { tier: 1 });
  for (const k of [1, 2]) { C.F(paB, 'living', 0, 0, 13, 7, { tier: 1, storey: k, mul: 0.7 }); C.F(paB, 'bedroom', 0, 7, 13, 14, { tier: k, storey: k }); C.F(paB, 'bedroom', 13, 0, 26, 14, { tier: 1, storey: k }); }
  const paC = C.gbld(PA, { x: 264, z: 172, w: 14, d: 12, storeys: 2, wall: 'plaster', tint: 0xc8c4b8, floor: 'tiles', name: 'Pale Apartments C',
    doors: [{ side: 'w', at: 4, w: 1.6, door: true }, { side: 's', at: 4, w: 2.2, sill: 1 }], inner: [[0, 6, 14, 6, [{ at: 9, w: 1.6 }]]] });
  C.F(paC, 'commercial', 0, 0, 14, 6, { tier: 1 }); C.F(paC, 'medical', 0, 6, 14, 12, { tier: 1, mul: 0.8 });
  C.gprop(PA, 'car', 240, 168, 1.57, { solid: true }); C.gcont(PA, 'car_trunk', 242.6, 168, 1.57, { tier: 1 });
  w.prop('car', 286, 160, 0.2, { solid: true });
  C.clutter(...GW(PA, 258, 168), 16, 14, ['barrel', 'bush', 'crate', 'debris', 'dg_table'], { frame: PA, avoid: (x, z) => { const [X] = GL(PA, x, z); return X < 230 || X > 284; } });
  C.loot(...GW(PA, 258, 167), 12, ['trash', 'basket', 'backpack'], 1);
  for (const [X, Z] of [[246, 164], [282, 168], [262, 196]]) C.glamp(PA, X, Z, { y: 4, color: 0xffc078, intensity: 1.55, range: 11 });
  // ---------------- Ben Welda's Sunroof (house with a glass sunroof + welding garage, -15°): bedrooms upstairs under the glass
  const BW = G_BEN;
  const bw = C.B.ben = C.gbld(BW, { x: 324, z: 190, w: 20, d: 16, storeys: 2, wall: 'brick', tint: 0xd8c8b0, floor: 'wood', roof: 'metalPanel', roofTint: 0x9ad6e6, peek: 0.55, name: "Ben Welda's Sunroof",
    doors: [{ side: 'w', at: 6, w: 1.8, door: true }, { side: 's', at: 13, w: 1.8, door: true }, { side: 's', at: 4, w: 2.4, sill: 0.9 }, { side: 'n', at: 6, w: 2.4, sill: 0.9 }, { side: 'n', at: 14, w: 2.4, sill: 0.9 }],
    inner: [[10, 0, 10, 16, [{ at: 6, w: 1.6 }]], [10, 8, 20, 8, [{ at: 3, w: 1.6 }]], [10, 0, 10, 16, [{ at: 4, w: 1.6 }], 1]],
    stairs: [{ x: 0.6, z: 9, w: 1.4, dir: 'n', from: 0, to: 1 }] });
  C.F(bw, 'living', 0, 0, 10, 16, { tier: 2 }); C.F(bw, 'bedroom', 10, 0, 20, 8, { tier: 2 }); C.F(bw, 'kitchen', 10, 8, 20, 16, { tier: 1 });
  C.F(bw, 'living', 0, 0, 10, 16, { tier: 1, storey: 1, mul: 0.6 }); C.F(bw, 'bedroom', 10, 0, 20, 16, { tier: 2, storey: 1, extra: [['suitcase', 1]] });
  const bg = C.gbld(BW, { x: 346, z: 194, w: 10, d: 10, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: "Welda's Garage", doors: [{ side: 's', at: 2, w: 3.2 }, { side: 'w', at: 3, w: 1.6 }] });
  C.F(bg, 'workshop', 0, 0, 10, 10, { tier: 2, extra: [['toolbox', 1]] });
  C.hatch('sunroof_hatch', 'Sunroof Hatch', 318, 194, PI / 2);
  w.prop('car', 352, 214, 1.4, { solid: true }); C.clutter(...GW(BW, 336, 212), 10, 6, ['barrel', 'crate', 'dg_planter', 'bush'], { frame: BW });
  C.glamp(BW, 330, 208, { y: 3.4, color: 0xffc890, intensity: 1.55, range: 9 }); C.glamp(BW, 356, 206, { y: 3.4, color: 0xffd8a0, intensity: 1.55, range: 9, flicker: 0.3 });
  // ---------------- Hydroponic Dome Complex (reference: two big domes north, one south at the end of a glass tube,
  // a small dome + tube east; no lab block - the domes ARE the facility)
  const dome = (cx, cz, s, kind) => {
    const r = 7.1 * s;
    w.raiseCircle(cx, cz, r + 3, MID + 0.28, 0.35, 'set');
    w.paintCircle('tiles', cx, cz, r - 0.5); w.paintCircle('concrete', cx, cz, r - 3.2);
    w.prop('dg_dome', cx, cz, 0.2, { scale: s });
    C.ring(cx, cz, r - 0.1, 1.0, 'concrete', [PI / 2, 0, -PI / 2], 1.4);
    C.addClear(cx, cz, r + 3);
    C.doorPts.push([cx, cz + r], [cx + r, cz], [cx, cz - r]);
    C.inLight(cx, cz, kind === 'archive' ? 0x90c0ff : 0xe0a0ff, 1.2, r + 3, 3.5);
    if (s > 0.8) {
      for (const [dx, dz, rot] of [[-3.2, -2.2, 0], [3.2, -2.2, 0], [-3.2, 2.2, PI], [3.2, 2.2, PI]]) w.prop(kind === 'archive' && dx > 0 ? 'dg_server' : 'dg_hydrorack', cx + dx, cz + dz, rot, { solid: true });
      if (kind === 'archive') { w.prop('dg_console', cx - 4.3, cz, PI / 2, { solid: true }); w.container('electronics', cx + 2, cz + 4.6, PI, { tier: 3 }); w.container('electronics', cx - 4.8, cz + 2.4, PI / 2, { tier: 2 }); }
      w.container('plant', cx - 1.2, cz + 0.2, 0, { tier: 2 }); w.container('plant', cx + 1.4, cz - 0.4, 0, { tier: 1 }); w.container('basket', cx + 4.6, cz + 2.6, 0, { tier: 1 });
    } else {
      w.prop('dg_planter', cx - 1.4, cz - 1.2, 0, { solid: true, scale: 0.8 }); w.container('plant', cx + 1, cz + 1, 0, { tier: 2 });
    }
  };
  dome(496.6, 206.6, 1, 'archive');
  dome(535, 201, 1, 'garden');
  dome(468.6, 285.6, 1, 'garden');
  dome(545, 262, 0.7, 'garden');
  // greenhouse tubes (arched film houses)
  const tunnel = (a, b) => {
    const L_ = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(L_ / 4), rot = Math.atan2(b[0] - a[0], b[1] - a[1]);
    w.ridge([a, b], 7, MID + 0.25, 2, 'set'); w.path([a, b], 6, 'tiles');
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; w.prop('dg_arch', lerp(a[0], b[0], t), lerp(a[1], b[1], t), rot, {}); }
    for (let i = 1; i < n; i += 2) { const t = (i + 0.5) / n, x = lerp(a[0], b[0], t), z = lerp(a[1], b[1], t), ox = Math.cos(rot) * 1.8, oz = -Math.sin(rot) * 1.8; w.prop('dg_planter', x + ox, z + oz, rot + PI / 2, { solid: true }); w.prop('dg_planter', x - ox, z - oz, rot + PI / 2, { solid: true }); }
    for (let i = 0; i < 3; i++) { const t = (i + 0.7) / 3.4; w.container(i % 2 ? 'plant' : 'basket', lerp(a[0], b[0], t), lerp(a[1], b[1], t), rot, { tier: 1 }); }
    w.lamp(lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5), { y: 2.8, model: null, color: 0xd8a0ff, intensity: 0.9, range: L_ * 0.6 });
    C.addClear(lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5), L_ / 2 + 3);
  };
  tunnel([465, 259], [466.5, 278]);
  tunnel([524, 258], [553, 249]);
  // two small sheds (irrigation + seed store) between the domes
  const sh1 = C.bld({ x: 479, z: 235, w: 8, d: 6, rot: 0.2, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: 'Irrigation Shed', doors: [{ side: 's', at: 3, w: 1.8 }] });
  C.F(sh1, 'industrial', 0, 0, 8, 6, { tier: 1 });
  C.B.hydro = C.bld({ x: 507, z: 243, w: 8, d: 6, rot: -0.15, wall: 'metalPanel', tint: 0xd8e0d8, roof: 'metalPanel', roofTint: 0xb0c8c0, floor: 'tiles', name: 'Seed Store', doors: [{ side: 's', at: 3, w: 1.8, door: true }] });
  C.F(C.B.hydro, 'greenhouse', 0, 0, 8, 6, { tier: 2, extra: [['plant', 1]] });
  w.prop('dg_pump', 476, 244, 0, { solid: true });
  C.fieldDepot(517, 229, 0.1);
  for (const [x, z] of [[527, 236], [531, 240], [492, 252]]) w.prop('dg_tankS', x, z, 0, { solid: true });
  C.clutter(510, 240, 30, 22, ['dg_planter', 'barrel', 'dg_toxic', 'crate', 'dg_reeds', 'bush'], { avoid: (x, z) => C.clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) });
  C.fenceLine([[480, 190], [516, 188], [552, 190]], [[500, 189]]);
  C.loot(510, 240, 30, ['plant', 'plant', 'basket', 'crate', 'toolbox'], 1, { avoid: (x, z) => C.clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) });
  for (const [x, z] of [[516, 214], [482, 216], [552, 214], [528, 246], [500, 262], [476, 270], [556, 268]]) w.lamp(x, z, { y: 3.8, color: 0xd8ffd0, intensity: 1.55, range: 10 });
  // ---------------- Central Swamp Lift (cargo elevator facing the boardwalk that comes in from the west)
  C.lift('central_swamp_lift', 'Central Swamp Lift', 355, 334, -PI / 2);
  const ls = C.bld({ x: 362, z: 340, w: 6, d: 5, wall: 'corrugated', roof: 'corrugated', floor: 'wood', name: 'Lift Shack', floorY: MID + 0.45, blend: 0.5, doors: [{ side: 'w', at: 1.5, w: 1.6 }] });
  C.F(ls, 'storage', 0, 0, 6, 5, { tier: 1, light: false });
  for (const [x, z] of [[370, 342], [367, 347]]) w.prop('crate', x, z, 0.3, { solid: true });
  w.container('ammo_box', 370.2, 345.4, 0.2, { tier: 1 });
  w.lamp(361, 338.5, { y: 3.6, color: 0xffc078, intensity: 1.4, range: 10 });
  C.addClearRect(360, 338, 372, 349);
  // ---------------- Old Battleground
  w.prop('dg_emptrap', 232, 318, 0, { solid: true });
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.4; w.prop('dg_switch', 232 + Math.cos(a) * 6.5, 318 + Math.sin(a) * 6.5, -a + PI / 2, { solid: true }); }
  w.lamp(232, 318, { y: 3, model: null, color: 0x40c0ff, intensity: 1.3, range: 9, flicker: 0.5 });
  C.bld({ x: 194, z: 322, w: 10, d: 8, rot: 0.35, wall: 'concrete', roof: 'concrete', floor: 'concrete', name: 'Battleground Bunker', tint: 0xa8a498, doors: [{ side: 'e', at: 3, w: 1.8 }, { side: 'n', at: 3, w: 3, sill: 1.3 }], ladders: [{ side: 'w', at: 4 }] });
  C.F(w.buildings[w.buildings.length - 1], 'security', 0, 0, 10, 8, { tier: 2 });
  const pbx = C.bld({ x: 258, z: 292, w: 9, d: 7, rot: -0.4, wall: 'concrete', roof: 'concrete', floor: 'concrete', name: 'Pillbox', tint: 0xa8a498, doors: [{ side: 's', at: 3, w: 1.8 }, { side: 'w', at: 2, w: 3, sill: 1.3 }] });
  C.F(pbx, 'storage', 0, 0, 9, 7, { tier: 2, extra: [['ammo_box', 1]] });
  w.container('barron_husk', 250, 322, 0.7, { tier: 2 });                                   // Baron husk (reference ◎)
  w.paintCircle('rock', 250, 322, 4.5, 0.4, 9);
  for (const [x, z, r] of [[214, 306, 0.2], [244, 344, 1.4], [270, 320, 2.3], [206, 340, 3.0]]) w.prop('dg_huskbig', x, z, r, { solid: true });
  C.clutter(238, 322, 40, 30, ['dg_hedgehog', 'dg_hedgehog', 'husk', 'deadTree', 'debris', 'dg_rubble', 'dg_stump'], { sz: 0.8, avoid: (x, z) => Math.hypot(x - 250, z - 322) < 5 });
  C.sandbags([[208, 304], [218, 300], [226, 302]]); C.sandbags([[240, 336], [250, 338], [256, 344]]); C.sandbags([[268, 304], [276, 308]]);
  w.path([[200, 300], [214, 296], [226, 306], [238, 302], [250, 290], [262, 300], [278, 296]], 2.2, 'mud');
  C.loot(238, 322, 36, ['arc_husk', 'arc_crate', 'ammo_box', 'arc_crate', 'weapon_case', 'crate', 'arc_husk', 'raider_cache', 'backpack'], 2);
  C.addClear(238, 322, 30);
  // ---------------- Water Treatment Control (+ surveillance key room), turned -15° with its plaza.
  // 2 storeys (offices + a lab gallery upstairs, roof ladder); the pump hall sits on the Water Intake basement.
  const WT = G_WTC;
  const wtc = C.B.wtc = C.gbld(WT, { x: 366, z: 414, w: 32, d: 44, storeys: 2, floorY: MID + 0.35, blend: 2, name: 'Water Treatment Control', wall: 'concrete', tint: 0xd0d4cc, floor: 'tiles', roof: 'corrugated', roofTint: 0xb8c0b8,
    doors: [{ side: 'e', at: 26, w: 2.4, door: true }, { side: 's', at: 22, w: 2, door: true }, { side: 'n', at: 14, w: 3 }, { side: 'e', at: 8, w: 3, sill: 1.1 }, { side: 'w', at: 10, w: 3, sill: 1.1 }, { side: 'w', at: 26, w: 3, sill: 1.1 }, { side: 'e', at: 36, w: 3, sill: 1.1 }],
    inner: [[0, 20, 32, 20, [{ at: 14, w: 2.4 }]], [0, 32, 32, 32, [{ at: 6, w: 1.8, door: true, locked: 'surveillance' }, { at: 24, w: 1.8 }]], [16, 32, 16, 44, []],
      [0, 20, 32, 20, [{ at: 10, w: 2 }], 1], [0, 32, 32, 32, [{ at: 8, w: 1.8 }, { at: 26, w: 1.8 }], 1], [16, 32, 16, 44, [{ at: 6, w: 1.6 }], 1]],
    stairs: [{ x: 20, z: 20.6, w: 1.4, dir: 'e', from: 0, to: 1 }], ladders: [{ side: 'e', at: 4 }] });
  for (const lx of [5, 11, 17]) C.P(wtc, 'dg_pump', lx, 6, PI / 2, { solid: true });
  C.P(wtc, 'dg_valve', 28, 13, 0, { solid: true }); C.P(wtc, 'dg_bigpipe', 12, 17.5, 0, { solid: true, scale: 0.6 });
  C.Cn(wtc, 'toolbox', 4, 18, 0, { tier: 2 }); C.Cn(wtc, 'crate', 30, 2, 0, { tier: 1 }); C.Cn(wtc, 'locker', 2, 12, PI / 2, { tier: 1 });
  C.IL(wtc, 8, 10, 0xd0e0ff, 1.0, 10); C.IL(wtc, 26, 14, 0xd0e0ff, 1.0, 10);
  C.F(wtc, 'control', 0, 20, 32, 32, { tier: 2 });
  C.F(wtc, 'security', 0, 32, 16, 44, { tier: 3, room: 'surveillance', extra: [['electronics', 1], ['security_locker', 1]] });
  C.P(wtc, 'dg_server', 4, 33, 0, { solid: true });
  C.K(wtc, 'surveillance', 0, 32, 16, 44, 'Surveillance Room');
  C.F(wtc, 'office', 16, 32, 32, 44, { tier: 2 });
  C.F(wtc, 'lab', 0, 0, 32, 20, { tier: 2, storey: 1 }); C.F(wtc, 'office', 0, 20, 32, 32, { tier: 1, storey: 1 });
  C.F(wtc, 'server', 0, 32, 16, 44, { tier: 2, storey: 1 }); C.F(wtc, 'office', 16, 32, 32, 44, { tier: 2, storey: 1 });
  // the water intake basement under the pump hall (quest: "the water intake below Water Treatment Control").
  // Built after the WTC so the WTC's floor flatten does not fill it back in.
  const wi = C.B.wint = C.hall(WT, { x: 367, z: 415, w: 30, d: 18, depth: 4.5, top: MID + 0.35, lid: 'tiles', wall: 'concrete', name: 'Water Intake',
    stairs: [{ x: 21, z: 2.5, w: 1.6, dir: 'n', to: 'top' }] });
  C.P(wi, 'dg_pump', 5, 5, PI / 2, { solid: true }); C.P(wi, 'dg_pump', 5, 12, PI / 2, { solid: true });
  C.P(wi, 'dg_bigpipe', 11, 15.6, 0, { solid: true, scale: 0.85 }); C.P(wi, 'dg_bigpipe', 25, 15.6, 0, { solid: true, scale: 0.85 });
  C.P(wi, 'dg_valve', 27, 4.5, 0, { solid: true }); C.P(wi, 'dg_spillgrate', 14, 1.4, 0, {});
  for (const [k, lx, lz, r, t] of [['crate', 10, 3, 0, 1], ['crate', 26.5, 11, 0, 1], ['toolbox', 13, 8, 0, 2], ['electronics', 28.5, 8, 0, 2], ['locker', 1.8, 9, PI / 2, 1], ['raider_cache', 16.5, 10.5, 0, 2]]) C.Cn(wi, k, lx, lz, r, { tier: t });
  C.IL(wi, 8, 9, 0xd0e8ff, 1.4, 11, 2.6); C.IL(wi, 24, 12, 0xd0e8ff, 1.4, 11, 2.6);
  // intake outfall north of WTC
  C.gprop(WT, 'dg_bigpipe', 381, 404, PI / 2, { solid: true }); C.gprop(WT, 'dg_spillgrate', 381, 398, 0, {}); C.gprop(WT, 'dg_pump', 392, 406, 0, { solid: true });
  C.glamp(WT, 386, 402, { y: 3, model: null, color: 0xffd090, intensity: 0.9, range: 8, flicker: 0.4 });
  // plaza: settling basins, elevator
  w.paintPoly('concrete', GR(WT, 400, 424, 440, 492));
  for (const [x0, z0, x1, z1] of [[404, 434, 430, 452], [404, 460, 430, 478]]) {
    C.lfill(WT, x0 + 1, z0 + 1, x1 - 1, z1 - 1, MID - 1.3);
    w.waterPoly(GR(WT, x0 + 1, z0 + 1, x1 - 1, z1 - 1), { level: MID - 0.4, material: C.swampMat });
    for (const [a, b, c, d] of [[x0, z0, x1, z0 + 1], [x0, z1 - 1, x1, z1], [x0, z0, x0 + 1, z1], [x1 - 1, z0, x1, z1]]) C.gblock(WT, a, b, c, d, 0.9, 'concrete', { y0: MID + 0.2 });
    C.gprop(WT, 'dg_gantry', (x0 + x1) / 2, (z0 + z1) / 2, 0, { scale: 0.8 });
  }
  C.lift('water_treatment_elevator', 'Water Treatment Elevator', 443, 477, -0.55);
  const nearWE = (x, z) => Math.hypot(x - 443, z - 477) < 9;
  C.clutter(448, 466, 20, 12, ['barrelBlue', 'crate', 'dg_container', 'pipe', 'dg_barrier', 'dg_toxic'], { frame: WT, avoid: (x, z) => { const [X] = GL(WT, x, z); return X < 434 || C.inDam(x, z, 2) || nearWE(x, z); } });
  C.loot(448, 466, 18, ['crate', 'toolbox', 'trash', 'ammo_box'], 1, { avoid: (x, z) => { const [X] = GL(WT, x, z); return X < 434 || C.inDam(x, z, 2) || nearWE(x, z); } });
  for (const [X, Z] of [[402, 430], [434, 428], [402, 496], [362, 410], [400, 456]]) C.glamp(WT, X, Z, { y: 4, color: 0xffd8a0, intensity: 1.55, range: 12 });
  // clarifier (circular settling tank)
  w.raiseCircle(493, 522, 15, MID - 1.4, 0.15, 'set');
  w.waterPoly(Array.from({ length: 20 }, (_, i) => [493 + Math.cos(i / 20 * 2 * PI) * 15.5, 522 + Math.sin(i / 20 * 2 * PI) * 15.5]), { level: MID - 0.45, material: C.swampMat });
  C.ring(493, 522, 16.2, 1.0, 'concrete', [0, PI], 1.6);
  w.bridge([[474.5, 522], [511.5, 522]], 1.6, MID + 0.4, 'metalPanel', { pillars: 0, thick: 0.3 });     // the skimmer bridge across the tank (walkable)
  w.prop('dg_valve', 493, 520.4, 0, { yAbs: MID + 0.4 });
  C.addClear(493, 522, 19);
  // ---------------- South Swamp Outpost
  w.prop('dg_radar', 213, 465, 0, { solid: true }); C.mastLight(213, 465, 9.6);
  for (const [x, z, bw2, bd, nm, rot] of [[220, 470, 10, 8, 'Outpost Hut', 0.12], [198, 476, 8, 7, 'Outpost Store', -0.2], [224, 450, 9, 7, 'Outpost Radio', 0.3]]) {
    C.bld({ x, z, w: bw2, d: bd, rot, wall: 'corrugated', roof: 'corrugated', floor: 'wood', roofTint: 0xa89070, name: nm, floorY: MID + 0.45, blend: 1, doors: [{ side: 'w', at: 2, w: 1.8 }, { side: 's', at: 3, w: 2.2, sill: 1 }] });
  }
  const nb = w.buildings.length;
  C.F(w.buildings[nb - 3], 'raider', 0, 0, 10, 8, { tier: 2 }); C.F(w.buildings[nb - 2], 'storage', 0, 0, 8, 7, { tier: 1 }); C.F(w.buildings[nb - 1], 'control', 0, 0, 9, 7, { tier: 2 });
  w.prop('dg_watchtower', 238, 488, 0, { solid: true }); w.prop('dg_tent', 206, 456, 0.3, { solid: true });
  C.sandbags([[196, 448], [206, 446], [214, 446]]); C.fire(212, 484);
  C.fenceLine([[196, 494], [214, 494], [230, 494]]);
  w.prop('dg_bigpipe', 246, 500, 0.3, { solid: true }); w.prop('dg_spillgrate', 252, 503, 1.85, {});      // flood spill intake
  C.loot(216, 468, 18, ['raider_cache', 'ammo_box', 'medical_bag', 'crate', 'backpack', 'plant', 'trash'], 2);
  C.clutter(218, 470, 22, 12, ['barrel', 'crate', 'dg_toxic', 'debris', 'dg_reeds'], {});
  for (const [x, z] of [[204, 470], [230, 462], [236, 482]]) w.lamp(x, z, { y: 3.4, color: 0xffa860, intensity: 1.55, range: 10, flicker: 0.3 });
  C.addClearRect(194, 444, 248, 496);
  // Baron husk in the southern swamp (reference ◎ between the outpost and Water Treatment)
  w.raiseRect(316, 466, 334, 482, MID + 0.4, 3, 'set');
  w.container('barron_husk', 324, 474, 2.3, { tier: 2 }); w.container('arc_crate', 332, 480, 0, { tier: 2 });
  w.paintCircle('rock', 324, 474, 5, 0.4, 4);
  C.clutter(325, 474, 9, 7, ['dg_rubble', 'debris', 'husk'], { avoid: (x, z) => Math.hypot(x - 324, z - 474) < 4.5 });
  C.addClear(325, 474, 12);
  // ---------------- swamp field depot + power line through the swamp
  w.raiseRect(283, 409, 293, 419, MID + 0.45, 1.5, 'set');
  C.fieldDepot(288, 414);
  C.addClear(288, 414, 7);
  C.powerLine([[150, 340], [190, 400], [240, 466], [290, 534], [322, 566], [344, 582]], { scale: 1 });
}

// ==================================================================================== SOUTH
function southPOIs(C) {
  const { w, R, rng } = C;
  // ---------------- Electrical Substation (30°): the control house has a real upper floor + roof ladder
  const SS = G_SS;
  C.gfence(SS, 366, 580, 400, 606, [[366, 593], [383, 580]]);
  w.paintPoly('gravel', GR(SS, 366, 580, 400, 606));
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const X = 372 + i * 11, Z = 587 + j * 12;
    C.gprop(SS, 'dg_transformer', X, Z, 0, { solid: true });
    if ((i + j) % 2 === 0) C.gprop(SS, 'dg_pylon', X + 4.5, Z + 3, PI / 2, { solid: true, scale: 0.45 });
  }
  C.gprop(SS, 'dg_fusebox', 368, 603, PI / 2, { solid: true });
  C.gcont(SS, 'electronics', 397, 603, 0, { tier: 2 }); C.gcont(SS, 'electronics', 369, 583, 0, { tier: 2 }); C.gcont(SS, 'toolbox', 388, 604, 0, { tier: 1 });
  for (const [X, Z] of [[366, 580], [400, 606], [400, 580]]) C.flood(...GW(SS, X, Z), { color: 0xd8e8ff, rot: -SS.a });
  const sc = C.B.sub = C.gbld(SS, { x: 370, z: 550, w: 18, d: 16, storeys: 2, name: 'Substation Control', tint: 0xd0ccc0, floor: 'tiles', floorY: MID + 0.2, blend: 2,
    doors: [{ side: 'w', at: 10, w: 2, door: true }, { side: 's', at: 12, w: 2.4, door: true }, { side: 'n', at: 6, w: 3, sill: 1.1 }, { side: 'e', at: 6, w: 3, sill: 1.1 }],
    inner: [[9, 0, 9, 16, [{ at: 10, w: 1.8 }]], [9, 8, 18, 8, [{ at: 4, w: 1.6 }]], [9, 0, 9, 16, [{ at: 4, w: 1.6 }], 1]],
    stairs: [{ x: 0.6, z: 1.6, w: 1.4, dir: 's', from: 0, to: 1 }], ladders: [{ side: 'e', at: 13 }] });
  C.F(sc, 'control', 0, 0, 9, 16, { tier: 2 }); C.F(sc, 'server', 9, 0, 18, 8, { tier: 2 }); C.F(sc, 'workshop', 9, 8, 18, 16, { tier: 1 });
  C.F(sc, 'office', 0, 0, 9, 16, { tier: 1, storey: 1 }); C.F(sc, 'server', 9, 0, 18, 16, { tier: 2, storey: 1 });
  const sh = C.gbld(SS, { x: 392, z: 556, w: 8, d: 7, wall: 'brick', roof: 'corrugated', name: 'Switch Hut', floor: 'concrete', floorY: MID + 0.2, blend: 1.5, doors: [{ side: 's', at: 3, w: 1.6, door: true }] });
  C.F(sh, 'storage', 0, 0, 8, 7, { tier: 1 });
  C.clutter(...GW(SS, 390, 572), 14, 8, ['barrel', 'crate', 'dg_barrier', 'debris'], { frame: SS, avoid: (x, z) => { const [, Z] = GL(SS, x, z); return Z > 578; } });
  w.prop('dg_truck', 340, 612, 1.75, { solid: true }); w.container('car_trunk', 336.2, 611.4, 1.75, { tier: 1 }); w.container('toolbox', 344, 616, 0, { tier: 1 });
  // ---------------- Water Towers + football pitch
  for (const [x, z] of [[283, 626], [301, 624], [320, 645], [284, 656]]) { w.prop('dg_watertower', x, z, R(0, 6.28), { solid: true }); C.mastLight(x, z, 12.8); C.addClear(x, z, 5); }
  C.bld({ x: 298, z: 638, w: 8, d: 8, wall: 'brick', roof: 'corrugated', floor: 'concrete', name: 'Water Tower Pump Hut', doors: [{ side: 's', at: 3, w: 1.6, door: true }] });
  C.furnish('industrial', 298, 638, 306, 646, { tier: 1 });
  w.paint('grass', 238, 596, 276, 618); w.path([[257, 596], [257, 618]], 0.5, 'sand'); w.path([[238.5, 596], [238.5, 618]], 0.5, 'sand'); w.path([[275.5, 596], [275.5, 618]], 0.5, 'sand');
  w.prop('dg_goal', 240.5, 607, PI / 2, { solid: true }); w.prop('dg_goal', 273.5, 607, -PI / 2, { solid: true });
  C.addClearRect(236, 594, 278, 620);
  C.clutter(300, 640, 30, 14, ['barrel', 'crate', 'debris', 'rock'], { avoid: (x, z) => C.clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) });
  C.loot(300, 640, 28, ['crate', 'trash', 'toolbox', 'backpack'], 1, { avoid: (x, z) => C.clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) });
  for (const [x, z] of [[292, 612], [312, 660], [262, 620]]) w.lamp(x, z, { y: 4, color: 0xffc078, intensity: 1.55, range: 11 });
  // Tower Hill: the open rise SE of the Water Towers where the reference spawns the Matriarch (kept clear)
  w.prop('dg_huskbig', 366, 694, 0.9, { solid: true }); w.container('arc_husk', 362, 690, 0, { tier: 2 });
  w.prop('dg_hedgehog', 334, 670, 0.4, { solid: true }); w.prop('dg_hedgehog', 358, 668, 1.1, { solid: true });
  C.addClear(347, 680, 16);
  // the old dirt-bike circuit west of the Water Towers
  w.path([[178, 628], [186, 618], [198, 622], [204, 634], [214, 628], [226, 624], [232, 636], [222, 648], [210, 646], [204, 660], [192, 664], [182, 654], [190, 642], [180, 636], [178, 628]], 2.6, 'dirt');
  w.path([[204, 660], [214, 676], [226, 690], [222, 704], [208, 708], [200, 696], [206, 684]], 2.6, 'dirt');
  for (const [x, z, r] of [[196, 630, 0.4], [216, 642, 1.2], [188, 660, 2.0]]) w.prop('dg_barrier', x, z, r, { solid: true });
  w.prop('dg_tent', 240, 650, 1.2, { solid: true }); w.prop('dg_flagpole', 236, 644, 0, { solid: true }); C.loot(236, 652, 6, ['backpack', 'crate', 'toolbox'], 1);
  // ruined blocks between the Primary Facility and the substation (foundations + shells)
  for (const [x, z, bw2, bd, nm, rot] of [[452, 552, 14, 10, 'Ruined Workshop', PI / 6], [492, 566, 12, 9, 'Ruined Garage', PI / 6], [426, 520, 10, 8, 'Guard Post', 0]]) {
    const bb = C.bld({ x, z, w: bw2, d: bd, rot, wall: 'concrete', tint: 0xb0aaa0, roof: 'corrugated', floor: 'concrete', name: nm, blend: 2,
      doors: [{ side: 's', at: 2, w: 2.2 }, { side: 'n', at: bw2 - 4, w: 2.2 }, { side: 'e', at: 2, w: 2.4, sill: 1.1 }] });
    C.F(bb, nm === 'Guard Post' ? 'security' : 'workshop', 0, 0, bw2, bd, { tier: 1 });
  }
  C.clutter(470, 560, 26, 14, ['dg_rubble', 'debris', 'barrel', 'crate', 'dg_container', 'car'], { avoid: (x, z) => C.inDam(x, z, 3) });

  // ---------------- Good Ol' Barron's Hatch (pump station; the hatch faces back toward the station)
  const bps = C.bld({ x: 234, z: 538, w: 14, d: 10, storeys: 2, name: "Barron's Pump Station", wall: 'brick', tint: 0xc8b8a8, floor: 'concrete', floorY: MID + 0.2, blend: 1.5,
    doors: [{ side: 's', at: 5, w: 2, door: true }, { side: 'e', at: 3, w: 2.4, sill: 1.1 }], inner: [[7, 0, 7, 10, [{ at: 6, w: 1.6 }]]] });
  C.F(bps, 'industrial', 0, 0, 7, 10, { tier: 1 }); C.F(bps, 'office', 7, 0, 14, 10, { tier: 1 });
  w.prop('dg_tankS', 255, 542, 0, { solid: true }); w.prop('dg_pump', 228, 546, PI / 2, { solid: true });
  C.fenceLine([[226, 551], [226, 534], [262, 534], [262, 551]]);
  C.hatch('good_ol_barrons_hatch', "Good Ol' Barron's Hatch", 267, 574, PI, { aliases: ['good_old_barons_hatch'] });
  w.prop('dg_bigpipe', 259, 565, 0.3, { solid: true });
  w.lamp(250, 552, { y: 4, color: 0xffc078, intensity: 1.55, range: 11 });
  // ---------------- Small Creek (fishing shack + the barrel truck)
  C.bld({ x: 556, z: 584, w: 6, d: 6, rot: 0.3, wall: 'wood', roof: 'corrugated', floor: 'wood', name: 'Fishing Shack', doors: [{ side: 's', at: 2, w: 1.6 }] });
  C.F(w.buildings[w.buildings.length - 1], 'storage', 0, 0, 6, 6, { tier: 1, light: false });
  w.prop('dg_truck', 580, 624, 0.45, { solid: true }); w.container('car_trunk', 578.4, 627.5, 0.45, { tier: 2 });
  for (let i = 0; i < 7; i++) w.prop('dg_toxic', 586 + R(-4, 4), 628 + R(-3, 4), R(0, 6), { solid: true });
  w.lamp(583, 620, { y: 1.0, model: null, color: 0x90ff40, intensity: 0.8, range: 6, flicker: 0.3 });
  w.deck([[598, 618], [604, 640]], 2.6, MID + 0.35, 'wood', { rails: false, pillars: false });
  w.deck([[688, 676], [690, 698]], 2.6, MID + 0.35, 'wood', { rails: false, pillars: false });
  C.loot(570, 610, 20, ['crate', 'plant', 'basket', 'trash'], 1);
  // ---------------- Testing Annex (-60°): tall ground floor round the test rig, offices upstairs, roof ladder; + Red Lakes Balcony Lift
  const TA = G_TA;
  const ta = C.B.ta = C.gbld(TA, { x: 700, z: 610, w: 56, d: 40, storeys: 2, storeyH: 4.4, innerH: 4.4, name: 'Testing Annex', wall: 'concrete', tint: 0xece8e0, floor: 'tiles', roofTint: 0xd8d8d0, floorY: MID + 0.3, blend: 2,
    doors: [{ side: 'n', at: 30, w: 2.4, door: true }, { side: 's', at: 30, w: 2.4, door: true }, { side: 'w', at: 26, w: 1.8, door: true }, { side: 'e', at: 6, w: 1.8, door: true },
      { side: 'n', at: 6, w: 3, sill: 1.1 }, { side: 'n', at: 20, w: 3, sill: 1.1 }, { side: 's', at: 6, w: 3, sill: 1.1 }, { side: 's', at: 46, w: 3, sill: 1.1 }, { side: 'e', at: 26, w: 3, sill: 1.1 }],
    inner: [[16, 0, 16, 40, [{ at: 9, w: 1.8 }, { at: 29, w: 1.8 }]], [0, 20, 16, 20, [{ at: 6, w: 1.8 }]], [16, 26, 40, 26, [{ at: 9, w: 2.4 }]],
      [40, 0, 40, 40, [{ at: 6, w: 1.8 }, { at: 24, w: 1.8, door: true, locked: 'testing_annex' }]], [40, 14, 56, 14, []],
      [16, 0, 16, 40, [{ at: 9, w: 1.8 }, { at: 30, w: 1.8 }], 1], [0, 20, 16, 20, [{ at: 6, w: 1.8 }], 1], [40, 0, 40, 40, [{ at: 6, w: 1.8 }, { at: 24, w: 1.8 }], 1],
      [16, 26, 40, 26, [{ at: 14, w: 2 }], 1], [40, 20, 56, 20, [{ at: 6, w: 1.8 }], 1]],
    stairs: [{ x: 20, z: 38, w: 1.4, dir: 'e', from: 0, to: 1 }], ladders: [{ side: 'w', at: 10 }],
    roofExtras: [[20, 6, 30, 16, 2.2], [44, 30, 52, 36, 1.0]] });
  C.F(ta, 'medical', 0, 0, 16, 20, { tier: 2, extra: [['medical_bag', 1]] });
  C.F(ta, 'commercial', 0, 20, 16, 40, { tier: 1, extra: [['cabinet', 1]] });
  C.P(ta, 'dg_testrig', 28, 13, 0, { scale: 0.9 }); w.paintCircle('metalPanel', ...C.Wp(ta, 28, 13), 6.5);
  C.Cn(ta, 'electronics', 19, 3, PI / 2, { tier: 2 }); C.Cn(ta, 'arc_crate', 37, 23, 0, { tier: 2 });
  C.IL(ta, 28, 13, 0x70e8ff, 1.4, 12, 3.9);
  C.F(ta, 'office', 16, 26, 40, 40, { tier: 1 });
  C.F(ta, 'office', 40, 0, 56, 14, { tier: 2 });
  C.F(ta, 'lab', 40, 14, 56, 40, { tier: 3, room: 'testing_annex', extra: [['medical_bag', 1], ['weapon_case', 1], ['electronics', 1]] });
  C.K(ta, 'testing_annex', 40, 14, 56, 40, 'Testing Annex Secure Lab');
  C.F(ta, 'office', 0, 0, 16, 20, { tier: 1, storey: 1 }); C.F(ta, 'lab', 0, 20, 16, 40, { tier: 2, storey: 1 });
  C.F(ta, 'lab', 16, 0, 40, 26, { tier: 2, storey: 1, extra: [['arc_crate', 1]] }); C.F(ta, 'office', 16, 26, 40, 40, { tier: 1, storey: 1 });
  C.F(ta, 'server', 40, 0, 56, 20, { tier: 2, storey: 1 }); C.F(ta, 'medical', 40, 20, 56, 40, { tier: 2, storey: 1 });
  const ts = C.gbld(TA, { x: 706, z: 656, w: 16, d: 12, name: 'Annex Storage', wall: 'corrugated', roof: 'corrugated', floor: 'concrete', floorY: MID + 0.3, blend: 1.5, doors: [{ side: 'w', at: 4, w: 2.4 }, { side: 'n', at: 10, w: 1.8, door: true }] });
  C.F(ts, 'storage', 0, 0, 16, 12, { tier: 1, extra: [['crate', 1]] });
  C.lift('red_lakes_balcony_lift', 'Red Lakes Balcony Lift', 744, 594, 2.6);
  for (const [X, Z, r] of [[690, 640, 0.1], [692, 628, 0.2], [762, 664, 1.5]]) C.gprop(TA, 'car', X, Z, r, { solid: true });
  C.clutter(...GW(TA, 728, 604), 14, 10, ['dg_barrier', 'crate', 'barrel', 'dg_container'], { frame: TA, avoid: (x, z) => C.inDam(x, z, 2) });
  for (const [X, Z] of [[698, 606], [758, 606], [698, 652], [758, 652], [728, 672], [760, 630]]) C.glamp(TA, X, Z, { y: 4, color: 0xe8f0ff, intensity: 1.55, range: 12 });
  C.addClearRect(694, 592, 764, 672);
  // ---------------- Electrical Tower (30°)
  const ET = G_ET;
  const et = C.gbld(ET, { x: 838, z: 624, w: 14, d: 12, wall: 'brick', tint: 0xb8a898, roof: 'corrugated', floor: 'concrete', name: 'Electrical Tower Station', floorY: MID + 0.2, blend: 1.5,
    doors: [{ side: 'w', at: 4, w: 1.8, door: true }, { side: 's', at: 8, w: 3, sill: 1.1 }], inner: [[7, 0, 7, 12, [{ at: 4, w: 1.6 }]]] });
  C.F(et, 'industrial', 0, 0, 7, 12, { tier: 1 }); C.F(et, 'server', 7, 0, 14, 12, { tier: 2 });
  C.gprop(ET, 'dg_pylon', 864, 619, 0.4, { solid: true, scale: 1.25 }); C.mastLight(...GW(ET, 864, 619), 21);
  for (const [X, Z] of [[860, 634], [868, 642]]) C.gprop(ET, 'dg_transformer', X, Z, 0, { solid: true });
  C.gfence(ET, 855, 610, 874, 648, [[855, 642]]);
  C.loot(...GW(ET, 846, 630), 14, ['electronics', 'toolbox', 'crate'], 1);
  C.glamp(ET, 834, 622, { y: 4, color: 0xffc078, intensity: 1.55, range: 11 });
  C.powerLine([[880, 606], [920, 596], [960, 590], [1020, 560], [1080, 520]], { scale: 1 });
  // ---------------- Scrap Yard (+ the graves: hallowed ground)
  C.bld({ x: 488, z: 682, w: 10, d: 8, rot: -0.2, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: 'Scrap Office', floorY: MID + 0.3, blend: 1.5, doors: [{ side: 's', at: 3, w: 1.8, door: true }, { side: 'e', at: 3, w: 2, sill: 1 }] });
  C.F(w.buildings[w.buildings.length - 1], 'office', 0, 0, 10, 8, { tier: 1 });
  C.bld({ x: 506, z: 700, w: 8, d: 6, rot: 0.25, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: 'Scrap Shed', floorY: MID + 0.3, blend: 1.5, doors: [{ side: 'n', at: 2, w: 2.4 }] });
  C.F(w.buildings[w.buildings.length - 1], 'workshop', 0, 0, 8, 6, { tier: 1 });
  w.prop('dg_crane', 528, 688, PI, { solid: true }); C.mastLight(528, 688, 22);
  for (const [x, z, r, k] of [[520, 678, 0, 'dg_container'], [520, 678, 0.05, 'dg_containerB'], [534, 708, 1.6, 'dg_containerG'], [500, 712, 0.3, 'dg_container']]) w.prop(k, x, z, r, { solid: true, y: k === 'dg_containerB' ? 2.6 : 0 });
  C.clutter(512, 696, 26, 40, ['car', 'debris', 'debris', 'dg_rubble', 'barrel', 'pipe', 'crate', 'husk', 'dg_truck'], {});
  for (let i = 0; i < 7; i++) w.prop('dg_grave', 470 + (i % 4) * 2.6, 690 + Math.floor(i / 4) * 3.2, 0, { solid: true });
  w.prop('dg_memorial', 476, 700, 0, { solid: true });
  C.loot(512, 696, 26, ['car_trunk', 'car_trunk', 'toolbox', 'crate', 'crate', 'trash', 'locker', 'ammo_box', 'car_trunk', 'toolbox'], 2);
  for (const [x, z] of [[482, 680], [540, 696], [496, 716], [470, 704]]) w.lamp(x, z, { y: 4, color: 0xffb070, intensity: 1.55, range: 11, flicker: 0.3 });
  C.addClearRect(476, 672, 542, 720);
  // ---------------- Wreckage (crashed ARK hulk in the Formikai hills)
  w.prop('dg_bigwreck', 606, 690, 1.35, { solid: true });
  w.prop('dg_huskbig', 588, 678, 0.6, { solid: true }); w.prop('dg_slab', 626, 700, 2.0, { solid: true });
  C.clutter(606, 690, 26, 30, ['dg_rubble', 'debris', 'debris', 'husk', 'rock', 'dg_log', 'dg_stump'], { sz: 0.7 });
  C.loot(606, 690, 22, ['arc_crate', 'arc_crate', 'arc_husk', 'arc_husk', 'ammo_box', 'arc_crate', 'weapon_case'], 2, { avoid: (x, z) => Math.abs(x - 606) < 10 && Math.abs(z - 690) < 6 });
  C.fire(590, 684); C.fire(622, 696); C.fire(610, 704, { i: 1.6 });
  w.paintCircle('mud', 606, 690, 20, 0.5, 7); w.paintCircle('rock', 606, 690, 11, 0.5, 9);
  C.addClear(606, 690, 20);
  // ARK debris field on the hill east of the creek ford
  w.prop('dg_huskbig', 690, 716, 1.2, { solid: true }); w.prop('husk', 700, 726, 0.3, { solid: true }); w.container('arc_husk', 694, 712, 0, { tier: 1 });
  // ---------------- Formikai Outpost
  for (const [x, z, bw2, bd, nm, rot] of [[510, 786, 12, 9, 'Outpost Barracks', -0.25], [528, 800, 10, 8, 'Outpost Armory', 0.1], [540, 784, 8, 6, 'Outpost Radio', 0.35]]) {
    C.bld({ x, z, w: bw2, d: bd, rot, wall: 'wood', roof: 'corrugated', floor: 'wood', roofTint: 0x9a8a6a, name: nm, blend: 1.5, doors: [{ side: 's', at: 2, w: 1.8, door: true }, { side: 'e', at: 2, w: 2.2, sill: 1 }] });
  }
  const nf = w.buildings.length;
  C.F(w.buildings[nf - 3], 'bunk', 0, 0, 12, 9, { tier: 1 }); C.F(w.buildings[nf - 2], 'security', 0, 0, 10, 8, { tier: 2 }); C.F(w.buildings[nf - 1], 'control', 0, 0, 8, 6, { tier: 2 });
  w.prop('dg_watchtower', 554, 796, 0.2, { solid: true });                                   // platform overlooking the valley
  w.prop('dg_memorial', 520, 778, 0, { solid: true }); w.prop('dg_flagpole', 526, 777, 0, { solid: true });
  C.sandbags([[504, 782], [504, 798], [510, 806]]); C.sandbags([[546, 806], [556, 808]]);
  C.fire(526, 794);
  C.loot(528, 796, 16, ['raider_cache', 'ammo_box', 'weapon_case', 'medical_bag', 'crate', 'backpack'], 2);
  C.clutter(528, 794, 22, 12, ['crate', 'barrel', 'dg_hedgehog', 'dg_tent', 'debris'], {});
  for (const [x, z] of [[506, 780], [548, 800], [520, 812]]) w.lamp(x, z, { y: 3.6, color: 0xffa860, intensity: 1.55, range: 10, flicker: 0.3 });
}

// ==================================================================================== EAST
function eastPOIs(C) {
  const { w, R } = C;
  // ---------------- Pump House (+ hatch), 30°: pump hall + an office with a mezzanine upstairs, roof ladder
  const PH = G_PH;
  const ph = C.B.pump = C.gbld(PH, { x: 892, z: 290, w: 22, d: 14, storeys: 2, name: 'Pump House', wall: 'brick', tint: 0xc0b0a0, floor: 'concrete', roof: 'corrugated', floorY: LOW + 0.7, blend: 1.5,
    doors: [{ side: 'w', at: 8, w: 2.4, door: true }, { side: 's', at: 16, w: 2, door: true }, { side: 'n', at: 4, w: 3, sill: 1.1 }],
    inner: [[13, 0, 13, 14, [{ at: 9, w: 1.8 }]], [13, 0, 13, 14, [{ at: 9, w: 1.8 }], 1]],
    stairs: [{ x: 20, z: 1.6, w: 1.4, dir: 's', from: 0, to: 1 }], ladders: [{ side: 'n', at: 6 }] });
  for (const lx of [5, 10]) C.P(ph, 'dg_pump', lx, 4, 0, { solid: true });
  C.Cn(ph, 'toolbox', 4, 12, 0, { tier: 2 }); C.Cn(ph, 'crate', 11, 12, 0, { tier: 1 });
  C.IL(ph, 7, 7, 0xffd090, 1.0, 9);
  C.F(ph, 'office', 13, 0, 22, 14, { tier: 1 });
  C.F(ph, 'storage', 0, 0, 13, 14, { tier: 1, storey: 1 }); C.F(ph, 'office', 13, 0, 22, 14, { tier: 2, storey: 1 });
  C.hatch('pump_house_hatch', 'Pump House Hatch', 884, 302, -PI / 2);
  C.gprop(PH, 'dg_bigpipe', 878, 294, 0, { solid: true }); C.gprop(PH, 'dg_bigpipe', 868, 294, 0, { solid: true });
  C.glamp(PH, 888, 288, { y: 4, color: 0xffc078, intensity: 1.55, range: 11 });
  // ---------------- Spillway Hatch (leaking hydraulic pipes)
  C.hatch('spillway_hatch', 'Spillway Hatch', 765, 482, 0);
  w.prop('dg_bigpipe', 759, 475.5, 0.2, { solid: true }); w.prop('dg_valve', 771.5, 476, 0, { solid: true }); w.prop('pipe', 771, 488.5, 1.3, { solid: true });
  for (const [x, z] of [[757, 488], [774, 484]]) w.prop('dg_toxic', x, z, 0, { solid: true });
  w.waterPoly([[757, 478], [762, 477.5], [762.4, 479.6], [757.6, 480.6]], { level: LOW + 0.55, material: C.darkMat });
  C.loot(765, 482, 9, ['toolbox', 'crate'], 1, { avoid: (x, z) => Math.hypot(x - 765, z - 482) < 3 });
  // ---------------- basin: Red Lakes shores, wrecks; the Queen's arena (reference ♛ at 862,368) is kept open
  w.prop('dg_bigwreck', 902, 344, 2.2, { solid: true }); w.container('arc_husk', 896, 350, 0, { tier: 2 });
  w.prop('dg_truck', 752, 372, 0.1, { solid: true }); w.container('car_trunk', 752, 376, 0.1, { tier: 1 });
  for (const [x, z, r] of [[720, 330, 0.4], [820, 330, 2.1], [700, 470, 1.0], [850, 560, 0.2], [780, 520, 2.6], [900, 450, 1.5]]) w.prop('husk', x, z, r, { solid: true });
  C.loot(800, 430, 110, ['arc_husk', 'arc_crate', 'crate', 'arc_husk', 'trash', 'ammo_box', 'arc_crate', 'toolbox'], 1, { avoid: (x, z) => !C.basinAt(x, z) || w.groundAt(x, z) < -0.2 || C.inDam(x, z, 3) });
  for (const [x, z] of [[740, 330], [770, 400], [840, 466], [760, 510], [880, 380], [826, 300]]) w.lamp(x, z, { y: 4.4, color: 0xffb070, intensity: 1.55, range: 12, flicker: 0.5 });
  C.addClear(862, 368, 18);
  // ---------------- east hills: farm ruins, power line
  C.bld({ x: 1000, z: 560, w: 12, d: 9, rot: 0.15, wall: 'brick', tint: 0xb0a090, roof: 'roofTile', roofShape: 'gable', floor: 'wood', name: 'Hill Farmhouse', blend: 2, doors: [{ side: 's', at: 4, w: 1.8, door: true }, { side: 'w', at: 3, w: 2, sill: 1 }] });
  C.F(w.buildings[w.buildings.length - 1], 'living', 0, 0, 12, 9, { tier: 1 });
  C.bld({ x: 1016, z: 566, w: 8, d: 8, rot: 0.15, wall: 'wood', roof: 'corrugated', floor: 'wood', name: 'Hill Barn', blend: 2, doors: [{ side: 'w', at: 2, w: 2.4 }] });
  C.F(w.buildings[w.buildings.length - 1], 'storage', 0, 0, 8, 8, { tier: 1, light: false });
  w.lamp(1006, 572, { y: 3.4, color: 0xffb070, intensity: 1.55, range: 9, flicker: 0.4 });
  C.powerLine([[1000, 130], [1018, 230], [1040, 330], [1056, 420], [1070, 500]], { scale: 1 });
  C.bld({ x: 960, z: 180, w: 10, d: 8, rot: 0.5, wall: 'concrete', roof: 'concrete', floor: 'concrete', name: 'Ridge Bunker', blend: 2, tint: 0xa8a498, doors: [{ side: 's', at: 3, w: 1.8 }] });
  C.F(w.buildings[w.buildings.length - 1], 'security', 0, 0, 10, 8, { tier: 2 });
}

// ==================================================================================== ROADSIDE + OUTSKIRTS
function roadsideAndOutskirts(C) {
  const { w, R, rng } = C;
  // general clutter over the dam surfaces (kept off buildings, doors, crest roads, chutes, pits, the tower)
  {
    const crest = (x, z) => {
      if (!C.inDam(x, z, -2.5) || C.inBuilding(x, z, 2.5)) return false;
      const [u, v] = toL(x, z);
      if (CREST_ROADS.some(r => C.distLine(u, v, r) < 4.5)) return false;
      if (u > 8 && u < 60 && v > 38 && v < 152) return false;                                  // chute heads, gantries, piers
      if (PITS.some(([a, b, c, d]) => u > a - 3 && u < c + 3 && v > b - 3 && v < d + 3)) return false;
      if (u > 22 && u < 50 && v > 142 && v < 166) return false;                                  // tower shaft + spawn
      if (v > -214 && v < -198) return false;                                                    // highway
      return true;
    };
    const kinds = ['dg_container', 'dg_containerB', 'dg_containerG', 'dg_barrier', 'dg_barrier', 'crate', 'crate', 'barrel', 'barrelBlue', 'dg_ventbox', 'dg_transformer', 'pipe', 'dg_bigpipe', 'sandbag', 'car', 'dg_truck', 'dg_rubble', 'dg_scaffold', 'dg_tankS'];
    for (const [u, v, r, n] of [[-40, -176, 44, 14], [40, -150, 40, 12], [110, -170, 30, 8], [-20, -76, 34, 12], [55, -76, 24, 8], [-10, 95, 44, 18], [-10, 214, 44, 18], [52, 206, 30, 10], [-78, 220, 24, 8], [180, 178, 100, 12]]) {
      C.clutter(...L(u, v), r, n, kinds, { frame: DAM, avoid: (x, z) => !crest(x, z) });
      C.clutter(...L(u, v), r, Math.round(n * 0.8), ['debris', 'debris', 'dg_grass'], { avoid: (x, z) => !crest(x, z) });
      C.loot(...L(u, v), r, ['crate', 'trash', 'toolbox', 'ammo_box', 'crate', 'locker'].slice(0, 2 + (n > 12 ? 4 : 2)), 1, { avoid: (x, z) => !crest(x, z) });
    }
  }
  // street lamps along the asphalt roads
  for (const r of ROADS) C.street(r, 34, 5.2, { notDam: true });
  C.street(TRACKS[0], 40, 3.5, { color: 0xffb070, i: 1.0 });
  C.street(TRACKS[2], 44, 3.5, { color: 0xffb070, i: 1.0 });
  C.street(HIGHWAY, 30, 5.6, { color: 0xe0ecff, model: 'dg_floodlight', i: 1.4, range: 14, rot: -DAM.a });
  // abandoned vehicles + barricades along roads
  const cars = [[448, 20, 0.05], [436, 90, 0.5], [372, 138, 1.0], [296, 184, 1.1], [205, 236, 1.2], [166, 320, 0.0], [130, 432, 0.8], [52, 476, 1.2], [90, 566, 1.6], [300, 540, 1.3], [352, 676, 0.7], [433, 600, 0.6], [520, 553, 1.1], [626, 604, 1.5], [540, 101, 1.5], [598, 105, 1.4]];
  for (const [x, z, r] of cars) { w.prop(C.chance(0.75) ? 'car' : 'dg_truck', x, z, r + C.R(-0.2, 0.2), { solid: true }); if (C.chance(0.6)) w.container('car_trunk', x + Math.cos(r) * 2.4, z - Math.sin(r) * 2.4, r, { tier: 1 }); }
  for (const [x, z, r] of [[452, 56, 0], [455, 50, 0.4], [168, 280, 1.6], [150, 400, 0.6], [438, 492, 0.9], [418, 620, 0.6], [700, 600, 0.1]]) w.prop('dg_barrier', x, z, r, { solid: true });
  // outskirts ruins: SW camp huts, far-west ruins, ridge shacks
  for (const [x, z, bw, bd, rot] of [[8, 530, 10, 8, 0.2], [44, 602, 8, 7, -0.3], [60, 622, 8, 6, 0.5], [18, 262, 10, 10, 0.1], [100, 708, 8, 6, -0.4], [1060, 640, 9, 7, 0.3], [140, 30, 10, 8, -0.2]]) {
    const bb = C.bld({ x, z, w: bw, d: bd, rot, wall: C.pick(['brick', 'wood', 'corrugated']), roof: 'corrugated', floor: 'wood', name: 'Ruined Hut', blend: 2, doors: [{ side: 's', at: 2, w: 1.8 }, { side: 'e', at: 2, w: 2, sill: 1 }] });
    C.F(bb, C.pick(['storage', 'raider', 'living', 'bunk']), 0, 0, bw, bd, { tier: 1, light: C.chance(0.5) });
  }
  for (const [x0, z0, x1, z1] of [[0, 274, 14, 275], [6, 284, 7, 300], [16, 292, 30, 293], [24, 280, 25, 292]]) w.block(x0, z0, x1, z1, 2.2, 'brick', {});
  C.powerLine([[30, 650], [80, 720], [130, 790], [150, 826]], {});
  C.powerLine([[60, 640], [110, 706], [160, 772], [184, 810]], {});
  // husks + caches scattered in the wild
  const wild = [[120, 360], [80, 300], [60, 420], [200, 620], [160, 680], [240, 760], [380, 780], [620, 790], [760, 790], [900, 700], [980, 640], [1040, 600], [1000, 300], [1060, 260], [1040, 120], [940, 120], [800, 60], [720, 20], [600, 140], [520, 140], [420, 160], [380, 30], [260, 60], [160, 120], [60, 200], [40, 760], [960, 800], [1080, 800], [880, 640]];
  for (const [x, z] of wild) {
    if (C.blocked(x, z) || C.inDam(x, z, 4)) continue;
    const k = C.pick(['husk', 'husk', 'dg_huskbig', 'dg_container', 'car']);
    w.prop(k, x, z, C.R(0, 6.28), { solid: true });
    w.container(C.pick(['arc_husk', 'crate', 'trash', 'arc_crate', 'backpack']), x + 2.2, z + 1.5, 0, { tier: 1 });
  }
}

// ==================================================================================== VEGETATION + ROCKS
function vegetation(C) {
  const { w, rng } = C;
  const swampDeep = (x, z) => C.swampAt(x, z) && w.groundAt(x, z) < SWAMP_WATER - 0.75;
  // rasterise everything vegetation must avoid into a 1 m bitmap (fast lookups for ~40k candidates)
  const AV = new Uint8Array(W * H);
  const markRect = (x0, z0, x1, z1) => { for (let z = Math.max(0, Math.floor(z0)); z < Math.min(H, Math.ceil(z1)); z++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) AV[z * W + x] = 1; };
  const markLine = (pts, r) => { for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1];
    for (let z = Math.max(0, Math.floor(Math.min(az, bz) - r)); z < Math.min(H, Math.ceil(Math.max(az, bz) + r)); z++) for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - r)); x < Math.min(W, Math.ceil(Math.max(ax, bx) + r)); x++)
      if (C.distLine(x + 0.5, z + 0.5, [[ax, az], [bx, bz]]) < r) AV[z * W + x] = 1; } };
  const markPoly = (pts) => { const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
    for (let z = Math.max(0, Math.floor(Math.min(...zs))); z < Math.min(H, Math.ceil(Math.max(...zs))); z++) for (let x = Math.max(0, Math.floor(Math.min(...xs))); x < Math.min(W, Math.ceil(Math.max(...xs))); x++) if (pointInPoly(x + 0.5, z + 0.5, pts)) AV[z * W + x] = 1; };
  for (const r of ROADS) markLine(r, 4.5);
  for (const r of TRACKS) markLine(r, 3);
  for (const b of BOARDWALKS) markLine(b, 2.2);
  for (const [a, b, c, d] of [...DAM_HIGH, ...DECK_RECTS]) markPoly(GR(DAM, a - 3, b - 3, c + 3, d + 3));
  markPoly(GR(DAM, -86, -50, 86, 50)); markPoly(GR(DAM, 18, 36, 100, 154));                   // breach + spillway apron
  for (const b of w.buildings) markPoly(b.R ? [[-0.8, -0.8], [b.x1 - b.x0 + 0.8, -0.8], [b.x1 - b.x0 + 0.8, b.z1 - b.z0 + 0.8], [-0.8, b.z1 - b.z0 + 0.8]].map(([a, c]) => w.local(b, a, c)) : [[b.x0 - 0.8, b.z0 - 0.8], [b.x1 + 0.8, b.z0 - 0.8], [b.x1 + 0.8, b.z1 + 0.8], [b.x0 - 0.8, b.z1 + 0.8]]);
  for (const [cx, cz, r] of C.clear) markLine([[cx, cz], [cx + 0.01, cz]], r);
  for (const [a0, b0, c0, d0] of C.clearRects) markRect(a0, b0, c0, d0);
  for (const [dx, dz] of C.doorPts) markRect(dx - 2.6, dz - 2.6, dx + 2.6, dz + 2.6);
  for (const [rx, rz, rr] of C.reserved) markRect(rx - rr, rz - rr, rx + rr, rz + rr);
  const avoidBase = (x, z) => x < 0 || z < 0 || x >= W || z >= H || AV[(z | 0) * W + (x | 0)] === 1;
  // dense swamp forest
  const swampForest = [[170, 210], [300, 196], [420, 206], [560, 228], [600, 262], [592, 300], [572, 330], [552, 372], [536, 402], [470, 410], [420, 402], [362, 406], [345, 450], [320, 512], [292, 548], [226, 548], [180, 522], [172, 452], [176, 380], [172, 300]];
  w.forest(swampForest, 1.6, ['dg_willow', 'dg_cypress', 'tree', 'dg_cypress'], { seed: 101, avoid: (x, z) => avoidBase(x, z) || swampDeep(x, z), scaleVar: 0.35 });
  // southern forest (Small Creek / Scrap Yard)
  const southForest = [[462, 596], [556, 594], [640, 612], [700, 668], [726, 700], [712, 760], [630, 776], [550, 772], [480, 752], [452, 700]];
  w.forest(southForest, 2.2, ['tree', 'tree', 'dg_willow', 'pine'], { seed: 202, avoid: (x, z) => avoidBase(x, z) || C.distLine(x, z, [[452, 600], [490, 608], [530, 603], [570, 613], [610, 633], [640, 660], [668, 676], [700, 688], [745, 690]]) < 3.5, scaleVar: 0.35 });
  // north / NW scattered forest + pale ruins groves
  w.forest([[170, 120], [330, 110], [440, 150], [420, 200], [300, 200], [180, 250]], 0.5, ['tree', 'pine'], { seed: 303, avoid: avoidBase });
  w.forest([[0, 0], [430, 0], [430, 40], [330, 50], [200, 120], [120, 140], [0, 120]], 0.35, ['pine', 'pine', 'tree'], { seed: 304, avoid: avoidBase });
  w.forest([[0, 140], [120, 150], [130, 280], [110, 460], [0, 500]], 0.6, ['pine', 'tree', 'pine'], { seed: 305, avoid: avoidBase });
  w.forest([[0, 520], [180, 580], [220, 700], [280, 825], [0, 825]], 0.4, ['pine', 'tree', 'deadTree'], { seed: 306, avoid: avoidBase });
  w.forest([[700, 0], [1100, 0], [1100, 160], [960, 200], [880, 120], [760, 60]], 0.45, ['pine', 'pine', 'deadTree'], { seed: 307, avoid: avoidBase });
  w.forest([[960, 200], [1100, 180], [1100, 560], [960, 520], [940, 360]], 0.5, ['pine', 'tree', 'deadTree'], { seed: 308, avoid: avoidBase });
  w.forest([[740, 640], [1100, 580], [1100, 825], [700, 825], [720, 760]], 0.5, ['pine', 'tree', 'pine'], { seed: 309, avoid: avoidBase });
  w.forest([[330, 690], [450, 690], [520, 780], [500, 825], [300, 825]], 0.6, ['pine', 'tree'], { seed: 310, avoid: avoidBase });
  w.forest([[560, 780], [720, 780], [740, 825], [560, 825]], 0.7, ['pine', 'tree'], { seed: 311, avoid: avoidBase });
  // open-area singles: basin dead trees, hillside trees
  w.scatter('deadTree', BASIN, 50, { solid: true, seed: 401, avoid: (x, z) => avoidBase(x, z) || w.groundAt(x, z) < 0 });
  w.scatter('bush', BASIN, 90, { seed: 402, avoid: (x, z) => avoidBase(x, z) || w.groundAt(x, z) < 0 });
  w.scatter('tree', [440, 30, 640, 110], 40, { solid: true, seed: 403, avoid: avoidBase });
  w.scatter('tree', [300, 520, 470, 700], 60, { solid: true, seed: 404, avoid: avoidBase });
  // rocks: outcrops from the reference + general scatter
  const outcrop = (cx, cz, r, n, s = 2) => C.clutter(cx, cz, r, n, ['rock'], { scale: s, scaleVar: 0.6, avoid: (x, z) => avoidBase(x, z) });
  for (const [x, z, r, n, s] of [[220, 66, 24, 18, 2.5], [158, 196, 22, 16, 2.4], [274, 112, 14, 9, 2], [80, 160, 20, 10, 2], [40, 380, 25, 12, 2.2], [90, 260, 16, 8, 2],
    [510, 120, 18, 10, 2.4], [560, 70, 20, 12, 2.2], [620, 40, 18, 9, 2.6], [760, 70, 30, 14, 2.6], [830, 100, 30, 14, 2.8], [1060, 80, 30, 14, 3], [960, 60, 30, 12, 2.6],
    [1000, 400, 30, 14, 2.4], [1060, 330, 24, 10, 2.4], [980, 480, 22, 9, 2.2], [880, 610, 30, 12, 2], [940, 650, 30, 12, 2.2], [1050, 700, 30, 12, 2.6], [930, 780, 30, 12, 2.4],
    [640, 760, 22, 10, 2.2], [420, 760, 24, 10, 2.2], [200, 740, 30, 12, 2.2], [60, 690, 30, 12, 2.4], [380, 650, 18, 8, 2], [800, 330, 30, 8, 1.6], [740, 500, 20, 6, 1.5]]) outcrop(x, z, r, n, s);
  w.scatter('rock', [0, 0, W, H], 520, { solid: true, seed: 405, scale: 1.2, scaleVar: 0.6, avoid: (x, z) => avoidBase(x, z) || C.swampAt(x, z) });
  // ground cover
  w.scatter('dg_reeds', SWAMP, 1300, { seed: 501, scaleVar: 0.4, avoid: (x, z) => { const g = w.groundAt(x, z); return g > SWAMP_WATER + 0.25 || g < SWAMP_WATER - 0.7 || avoidBase(x, z); } });
  w.scatter('dg_lily', SWAMP, 340, { seed: 502, avoid: (x, z) => w.groundAt(x, z) > SWAMP_WATER - 0.25 || avoidBase(x, z) });
  for (const p of w.props) if (p.kind === 'dg_lily') { p.opts.yAbs = SWAMP_WATER + 0.02; }
  w.scatter('dg_reeds', BASIN, 220, { seed: 503, avoid: (x, z) => { const g = w.groundAt(x, z); return g > 0.25 || g < -0.6 || avoidBase(x, z); } });
  w.scatter('dg_grass', SWAMP, 1400, { seed: 504, avoid: (x, z) => w.groundAt(x, z) < SWAMP_WATER || avoidBase(x, z) });
  w.scatter('dg_grass', [0, 0, W, H], 2600, { seed: 505, avoid: (x, z) => avoidBase(x, z) || w.groundAt(x, z) < 0.3 || C.swampAt(x, z) });
  w.scatter('dg_log', SWAMP, 70, { solid: true, seed: 506, avoid: avoidBase });
  w.scatter('dg_stump', SWAMP, 60, { solid: true, seed: 507, avoid: avoidBase });
  w.scatter('dg_toxic', SWAMP, 30, { solid: true, seed: 508, avoid: avoidBase });
  w.scatter('dg_log', [440, 590, 740, 780], 40, { solid: true, seed: 509, avoid: avoidBase });
  w.scatter('dg_reeds', [440, 590, 900, 720], 160, { seed: 510, avoid: (x, z) => C.distLine(x, z, [[452, 600], [530, 603], [610, 633], [668, 676], [745, 690], [830, 692], [880, 704]]) > 4 });
  w.scatter('debris', [540, 80, 900, 620], 160, { seed: 511, avoid: (x, z) => C.inBuilding(x, z, 0.5) });
  // nature loot: plants + baskets in the swamp and southern forest, buried raider caches in the wilds
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
  lootScatter(swampForest, 34, ['plant', 'basket', 'plant', 'backpack'], 1, 601, (x, z) => w.groundAt(x, z) < SWAMP_WATER + 0.05);
  lootScatter(southForest, 18, ['plant', 'basket', 'trash'], 1, 602, (x, z) => w.groundAt(x, z) < MID - 0.2);
  lootScatter([0, 0, W, H], 14, ['raider_cache'], 2, 603, (x, z) => C.swampAt(x, z) || C.basinAt(x, z) || w.groundAt(x, z) < 0.4);
  lootScatter(BASIN, 14, ['arc_husk', 'trash', 'crate'], 1, 604, (x, z) => w.groundAt(x, z) < 0.05 || C.inDam(x, z, 7));
  for (const b of w.buildings) {                       // a bin or crate outside most buildings
    if (b.x1 - b.x0 < 7 || C.rng() < 0.35) continue;
    const [x, z] = w.local(b, -1.4, b.z1 - b.z0 + 1.6);
    const gy = w.groundAt(x, z), by = w.groundAt((b.ax0 + b.ax1) / 2, (b.az0 + b.az1) / 2);
    if (Math.abs(gy - by) < 0.6 && !C.propHit(x - 0.6, z - 0.6, x + 0.6, z + 0.6) && !C.nearDoor(x, z, x, z, 1.6) && !C.inBuilding(x, z, 0.6)) w.container(C.rng() < 0.6 ? 'trash' : 'crate', x, z, 0, { tier: 1 });
  }
  const worn = [[330, 470], [400, 400], [470, 404], [552, 420], [600, 300], [640, 230], [628, 150], [600, 100], [640, 60], [720, 60], [900, 170], [910, 240], [790, 280], [700, 300], [664, 330], [650, 470], [640, 560], [560, 590], [470, 640], [420, 660], [330, 620]];
  w.scatter('dg_rubble', worn, 70, { solid: true, seed: 512, scale: 1.1, avoid: (x, z) => avoidBase(x, z) || C.swampAt(x, z) || C.propHit(x - 2, z - 2, x + 2, z + 2) });
  w.scatter('debris', worn, 260, { seed: 513, avoid: (x, z) => C.inBuilding(x, z, 0.5) || C.swampAt(x, z) });
  w.scatter('rock', [[440, 20], [520, -2], [640, -2], [700, 20], [620, 120], [560, 130], [470, 110]], 60, { solid: true, seed: 514, scale: 1.6, scaleVar: 0.7, avoid: avoidBase });
}

// ==================================================================================== ARK
function arkSpawns(C) {
  const { w } = C;
  const A = (k, x, z, o = {}) => w.arkSpawn(k, x, z, o);
  const B = C.B;
  const centre = (bb) => C.Wp(bb, (bb.x1 - bb.x0) / 2, (bb.z1 - bb.z0) / 2);
  const onRoof = (bb, lx, lz) => [...C.Wp(bb, lx, lz), { radius: 0, yAbs: C.roofY(bb) }];
  // Sentinals on the reference icons, perched on the real roof surfaces / the mast / the fallen monolith
  for (const [bb, lx, lz] of [[B.pc, 13, 18], [B.fc, 13.3, 13.5], [B.gt, 5.5, 5], [B.ra, 42, 38]]) { const [x, z, o] = onRoof(bb, lx, lz); A('sentinel', x, z, o); }
  A('sentinel', ...L(-18, -32), { radius: 0, y: 4.2 });                         // mast on the broken stub (ref 646,272)
  A('sentinel', ...L(37, 22), { radius: 0, yAbs: 5.2 });                        // fallen monolith in The Breach (ref 668,340)
  // turrets on rooftops (clear of roof plant, ladder heads and masts)
  for (const [k, lx, lz] of [['gh', 22, 6], ['caz', 30, 8], ['ct', 8, 4], ['ta', 36, 8], ['wtc', 24, 30], ['pf', 16, 20], ['sub', 13, 5], ['pump', 16, 8]]) {
    const bb = B[k]; if (!bb) continue;
    const [x, z, o] = onRoof(bb, lx, lz); A('turret', x, z, o);
  }
  A('turret', ...L(62 + 5.2 * Math.cos(PI / 8), -84 + 5.2 * Math.sin(PI / 8)), { radius: 0, yAbs: HIGH + 9.2 });   // Pipeline Tower upper catwalk
  // Wasps on patrol loops
  const loops = [
    [[200, 260], [300, 240], [320, 320], [230, 360]], [[360, 300], [450, 280], [470, 360], [380, 380]], [[220, 420], [320, 430], [330, 500], [240, 510]],
    [[470, 200], [560, 200], [560, 270], [470, 280]], [[560, 440], [600, 380], [640, 330], [600, 400]], [[660, 120], [760, 150], [840, 190], [740, 200]],
    [[700, 300], [800, 300], [860, 360], [760, 380]], [[700, 460], [800, 450], [880, 520], [760, 540]], [[350, 70], [450, 60], [540, 90], [400, 130]],
    [[240, 150], [330, 190], [300, 220], [230, 190]], [[500, 620], [620, 620], [660, 700], [520, 700]], [[280, 600], [380, 580], [400, 640], [300, 660]],
    [[700, 600], [780, 600], [780, 670], [700, 670]], [[500, 780], [600, 790], [640, 760], [520, 750]], [[950, 250], [1050, 300], [1000, 400], [940, 350]],
    [[900, 620], [1000, 650], [1000, 750], [900, 720]], [[100, 300], [160, 400], [120, 470], [60, 420]], [[560, 470], [640, 480], [620, 550], [560, 540]],
  ];
  loops.forEach((p, i) => A('wasp', p[0][0], p[0][1], { count: i % 3 === 0 ? 3 : 2, radius: 8, patrol: p }));
  // Hornets around high-value areas
  for (const [x, z, p] of [[668, 226, [[650, 200], [700, 240], [690, 260]]], [600, 480, [[590, 455], [630, 520], [570, 530]]], [730, 626, [[710, 600], [760, 650], [700, 650]]],
    [515, 220, [[480, 200], [550, 210], [530, 260]]], [780, 170, [[740, 150], [820, 190]]], [390, 436, [[370, 410], [420, 450], [380, 470]]], [630, 306, [[600, 300], [670, 310]]], [240, 320, [[210, 300], [270, 340]]]]) A('hornet', x, z, { count: 1, radius: 6, patrol: p });
  // Ticks lurking in buildings: ground floors, upper floors and the tunnels
  for (const k of ['gh', 'pf', 'wtc', 'ta', 'ra', 'pump', 'sub', 'pale', 'rubie', 'fc', 'ph', 'ben', 'caz']) if (B[k]) A('tick', ...centre(B[k]), { count: 2, radius: 4 });
  for (const [k, s] of [['ra', 1], ['wtc', 1], ['ta', 1], ['pale', 2], ['ctb', 1], ['pp', 1]]) if (B[k]) A('tick', ...centre(B[k]), { count: 1, radius: 4, yAbs: C.storeyY(B[k], s) + 0.05 });
  for (const k of ['ftun', 'fat', 'tgal', 'wint']) if (B[k]) A('tick', ...centre(B[k]), { count: 2, radius: 5, yAbs: B[k].fy + 0.05 });
  A('tick', 495, 686, { count: 2, radius: 4 });
  // Pops in the swamp / forest
  for (const [x, z] of [[300, 300], [400, 330], [250, 470], [330, 450], [560, 650], [640, 690], [500, 280], [240, 330], [440, 250]]) A('pop', x, z, { count: 3, radius: 10 });
  // Fireballs in industrial areas
  for (const [x, z] of [[...L(30, -168)], [...L(-20, 200)], [370, 590], [510, 700], [606, 700], [...L(50, -80)]]) A('fireball', x, z, { count: 2, radius: 6 });
  // Snitches over open ground
  for (const [x, z, p] of [[500, 150, [[460, 120], [560, 160], [500, 180]]], [780, 420, [[720, 380], [840, 420], [780, 480]]], [300, 360, [[260, 340], [340, 380]]], [600, 650, [[560, 640], [650, 680]]], [900, 300, [[880, 260], [940, 320]]], [420, 560, [[380, 540], [460, 580]]]]) A('snitch', x, z, { radius: 6, patrol: p });
  // Surveyors (high loot, flee) in open terrain
  for (const [x, z, p] of [[800, 330, [[760, 300], [860, 340], [820, 400]]], [880, 450, [[850, 420], [910, 480], [860, 520]]], [620, 780, [[580, 760], [680, 790]]]]) A('surveyor', x, z, { patrol: p, radius: 8 });
  // Rocketeers over the basin / dam
  for (const [x, z, p] of [[720, 400, [[680, 360], [800, 380], [760, 460]]], [600, 300, [[560, 260], [650, 300], [620, 360]]], [820, 560, [[780, 540], [880, 560]]], [450, 480, [[420, 460], [480, 520]]]]) A('rocketeer', x, z, { patrol: p, radius: 10 });
  // Leapers roam open areas (the one by the Red Lakes stands down while the Queene holds the basin)
  A('leaper', 790, 460, { patrol: [[740, 420], [860, 480], [800, 540]], radius: 12, notCondition: 'harvester' });
  for (const [x, z, p] of [[560, 760, [[520, 740], [620, 780]]], [990, 500, [[960, 460], [1040, 520]]], [170, 640, [[140, 600], [220, 680]]]]) A('leaper', x, z, { patrol: p, radius: 12 });
  // Bastions — heavy walkers
  for (const [x, z, p] of [[760, 330, [[720, 310], [820, 340], [780, 380]]], [850, 520, [[820, 500], [900, 540]]], [...L(40, -150), [L(-40, -150), L(120, -150)]], [380, 740, [[340, 720], [420, 760]]]]) A('bastion', x, z, { patrol: p, radius: 10 });
  // Bombardiers + spotters
  A('bombardier', 990, 420, { radius: 8, notCondition: 'harvester' }); A('spotter', 900, 400, { radius: 10, patrol: [[880, 380], [920, 420]] });
  A('bombardier', 180, 700, { radius: 8 }); A('spotter', 250, 640, { radius: 10, patrol: [[230, 620], [270, 660]] });
  // condition-only groups: the Queene's escort at the Red Lakes, the Matriark's brood on Tower Hill, night fireballs
  A('hornet', 862, 368, { count: 2, radius: 16, condition: 'harvester', patrol: [[830, 340], [900, 360], [880, 410], [830, 400]] });
  A('rocketeer', 820, 400, { count: 1, radius: 10, condition: 'harvester', patrol: [[790, 380], [860, 420]] });
  A('wasp', 347, 680, { count: 3, radius: 12, condition: 'matriarch', patrol: [[320, 660], [370, 660], [370, 700], [320, 700]] });
  A('hornet', 360, 700, { count: 2, radius: 10, condition: 'matriarch', patrol: [[330, 690], [380, 670]] });
  A('fireball', 300, 380, { count: 2, radius: 8, condition: 'night_raid' }); A('fireball', 560, 650, { count: 2, radius: 8, condition: 'night_raid' });
  A('snitch', ...L(20, 100), { radius: 6, condition: 'close_scrutiny', patrol: [L(-20, 60), L(-20, 140), L(40, 140)] });
}

// ==================================================================================== MARKERS
function markers(C) {
  const { w } = C;
  const P = (id, name, x, z, r, tier, aliases = [], extra = {}) => w.poi(id, name, x, z, r, { tier, aliases: aliases.length ? aliases : [id], ...extra });
  P('west_broken_bridge', 'West Broken Bridge', 540, 17, 35, 1);
  P('pattern_house', 'Pattern House', 688, 54, 30, 2);
  P('rubie_residence', 'Rubie Residence', 368, 84, 45, 2, ['ruby_residence']);
  P('pale_apartments', 'Pale Apartments', 258, 170, 38, 2);
  P('ben_weldas_sunroof', "Ben Welda's Sunroof", 336, 200, 24, 2, ['ben_welders_sunroof']);
  P('hydroponic_dome_complex', 'Hydroponic Dome Complex', 505, 240, 68, 2);
  P('generator_hall', 'Generator Hall', 668, 125, 34, 2);
  P('power_generation_complex', 'Power Generation Complex', 770, 170, 80, 2);
  P('raider_outpost_east', 'Raider Outpost East', 876, 160, 30, 1);
  P('controlled_access_zone', 'Controlled Access Zone', 669, 226, 32, 3);
  P('pipeline_tower', 'Pipeline Tower', 740, 250, 30, 2);
  P('east_broken_bridge', 'East Broken Bridge', 928, 236, 35, 1);
  P('pump_house', 'Pump House', 900, 298, 25, 1);
  P('the_breach', 'The Breach', 630, 306, 36, 2);
  P('old_battleground', 'Old Battleground', 240, 322, 45, 2);
  P('central_swamp_lift', 'Central Swamp Lift', 355, 334, 18, 1);
  P('floodgates', 'Floodgates', 600, 388, 55, 2);
  P('water_treatment_control', 'Water Treatment Control', 386, 440, 36, 2);
  P('primary_facility', 'Primary Facility', 512, 458, 50, 2);
  P('control_tower', 'Control Tower', 602, 472, 30, 3);
  P('research_and_administration', 'Research & Administration', 580, 518, 34, 3);
  P('south_swamp_outpost', 'South Swamp Outpost', 220, 468, 36, 1);
  P('spillway_hatch', 'Spillway Hatch', 765, 482, 18, 1);
  P('red_lakes_balcony', 'Red Lakes Balcony', 714, 546, 55, 2);
  P('electrical_substation', 'Electrical Substation', 380, 582, 36, 2);
  P('water_towers', 'Water Towers', 296, 640, 36, 1);
  P('small_creek', 'Small Creek', 568, 606, 40, 1);
  P('testing_annex', 'Testing Annex', 730, 628, 40, 3);
  P('electrical_tower', 'Electrical Tower', 848, 628, 26, 1);
  P('scrap_yard', 'Scrap Yard', 510, 696, 36, 2);
  P('wreckage', 'Wreckage', 606, 690, 30, 2);
  P('formikai_outpost', 'Formikai Outpost', 528, 796, 34, 2, ['formicai_outpost']);
  // boss arenas from the reference's Queen / Matriarch icons (condition bosses spawn here)
  P('red_lakes', 'Red Lakes', 862, 368, 60, 2, ['red_lakes'], { bossPoi: ['queene'] });
  P('tower_hill', 'Tower Hill', 347, 680, 40, 1, ['tower_hill'], { bossPoi: ['matriark'] });
  // player insertion points (reference spawn icons)
  for (const [x, z] of SPAWNS) w.spawnPoint(x, z);
  // loot tier zones
  w.zone('Outskirts', [[0, 0], [W, 0], [W, H], [0, H]], { tier: 1 });
  const Z = (name, tier, x0, z0, x1, z1) => w.zone(name, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], { tier });
  const ZG = (name, tier, G, X0, Z0, X1, Z1) => w.zone(name, GR(G, X0, Z0, X1, Z1), { tier });
  ZG('Power Generation Complex', 2, DAM, -100, -201, 140, -112); ZG('Controlled Access Zone', 3, DAM, -46, -96, 4, -58); ZG('Pipeline Tower', 2, DAM, 25, -112, 82, -54);
  ZG('Floodgates', 2, DAM, -32, 40, 58, 152); ZG('Control Tower', 3, DAM, 30, 148, 74, 190); ZG('Research & Administration', 3, DAM, 28, 196, 76, 238);
  ZG('Primary Facility', 2, DAM, -104, 150, 26, 242); ZG('The Breach', 2, DAM, -60, -40, 70, 40); ZG('Red Lakes Balcony', 2, DAM, 78, 168, 306, 210);
  ZG('Water Treatment Control', 2, G_WTC, 362, 400, 440, 494); ZG('Testing Annex', 3, G_TA, 694, 604, 762, 672); ZG('Electrical Substation', 2, G_SS, 362, 546, 404, 610);
  ZG('Pattern House', 2, DAM, -112, -268, -68, -226); ZG('Rubie Residence', 2, G_RUB, 320, 50, 392, 116); ZG('Pale Apartments', 2, G_PALE, 226, 140, 286, 196);
  ZG("Ben Welda's Sunroof", 2, G_BEN, 316, 186, 358, 210);
  Z('Hydroponic Dome Complex', 2, 460, 186, 560, 296); Z('Old Battleground', 2, 196, 290, 284, 350);
  Z('Scrap Yard', 2, 470, 672, 542, 720); Z('Wreckage', 2, 582, 670, 630, 710); Z('Formikai Outpost', 2, 500, 776, 560, 816);
}
