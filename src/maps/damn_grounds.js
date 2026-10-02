// Damn Grounds — top-down adaptation of ARC Raiders' Dam Battlegrounds (1100 x 825 m, north up).
// Reference: docs/ref/dam_annotated.jpg (POIs, extracts, spawns, key rooms, Sentinels, depots),
// mapped as  X = px/2 - 90,  Z = py/2 - 18  (px,py in the 2400x1800 annotated image), and the clean
// blank render for building footprints. See docs/research/map_damn_grounds.md.
// Three terrain tiers: LOW = spillway basin / Red Lakes (east of the dam), MID = swamp, forests and
// ruins (west + south), HIGH = dam crest, Power Generation plateau and the Red Lakes Balcony.
// The engine has no rotated buildings, so the reference's 30°-rotated dam monoliths are rebuilt as
// axis-aligned blocks laid out in the same diagonal staircase.
import './props_damn_grounds.js';
import { waterMaterial } from '../engine/materials.js';
import { pointInPoly, mulberry } from '../engine/world.js';
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

// ------------------------------------------------------------------------------------ layout data
// Dam + plateau monoliths (HIGH)
// Power Generation plateau + upper dam (Generator Hall, transformer yards, Controlled Access Zone,
// Pipeline Tower, broken end above The Breach): one polygon whose NE edge follows the highway, like the
// reference's diagonal band; its south side keeps the stepped monolith faces.
const PG_POLY = [[626, 70], [700, 104], [780, 146], [852, 184], [886, 200], [886, 236], [840, 236], [840, 214], [772, 214], [772, 268], [712, 268], [712, 292], [648, 292], [648, 256], [634, 256], [634, 152], [626, 152]];
// natural highland NE of the highway (rocky slopes up to the northern mountains)
const NE_HIGHLAND = [[560, -6], [1106, -6], [1106, 212], [906, 210], [886, 200], [852, 184], [780, 146], [700, 104], [636, 72], [606, 58]];
const DAM_RECTS = [
  // Floodgates (stepping south-west)
  [598, 322, 654, 362], [582, 356, 638, 394], [566, 388, 622, 426], [550, 420, 608, 456],
  // Control Tower + Research & Administration block, Primary Facility platform
  [552, 452, 640, 548], [470, 424, 556, 500],
];
const BALCONY = [[634, 494], [700, 532], [760, 570], [806, 598]];
// spillway chutes: dry concrete ramps from the crest into the basin [xFace, zCentre, length]
const CHUTES = [[654, 330, 40], [654, 348, 40], [638, 370, 40], [638, 386, 40], [622, 402, 40], [622, 418, 40], [608, 438, 36]];
const BASIN = [[640, 232], [700, 262], [780, 262], [860, 238], [905, 262], [928, 330], [934, 420], [930, 520], [900, 578], [850, 596], [804, 606], [760, 580], [700, 544], [636, 506], [632, 462], [602, 456], [618, 426], [634, 394], [650, 362], [650, 320], [664, 296]];
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
  [[628, 92], [660, 96], [700, 100]],
];
const SPAWNS = [[591, 17], [698, 40], [487, 73], [350, 80], [780, 114], [866, 136], [247, 141], [174, 322], [169, 447], [727, 262], [870, 306], [594, 450],
  [247, 566], [464, 600], [849, 554], [833, 616], [273, 663], [393, 709], [656, 734], [473, 746], [794, 758], [589, 795]];
const WBB = [[504, -1], [533, 13], [560, 26]];                         // West Broken Bridge deck
const HIGHWAY = [[606, 58], [636, 72], [700, 104], [780, 146], [852, 184]];
const EBB = [[850, 186], [892, 208], [928, 226]];                      // East Broken Bridge deck
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
  [400, 428, 470, 502, MID + 0.2, 3],        // water treatment plaza
  [472, 502, 516, 544, MID, 4],              // clarifier yard
  [848, 136, 906, 178, HIGH + 0.2, 4],       // Raider Outpost East
  [888, 286, 920, 310, LOW + 0.7, 3],        // Pump House
  [756, 474, 774, 490, LOW + 0.5, 2],        // Spillway Hatch
  [702, 598, 760, 668, MID + 0.3, 4],        // Testing Annex
  [832, 610, 868, 644, MID + 0.2, 4],        // Electrical Tower
  [346, 540, 420, 612, MID + 0.2, 4],        // Electrical Substation
  [270, 616, 330, 664, MID + 0.1, 4],        // Water Towers
  [238, 596, 276, 618, MID + 0.1, 3],        // football pitch
  [226, 532, 266, 554, MID + 0.2, 3],        // Good Ol' Barron's pump station
  [478, 674, 540, 718, MID + 0.3, 5],        // Scrap Yard
  [196, 446, 246, 494, MID + 0.4, 3],        // South Swamp Outpost
  [346, 324, 366, 344, MID + 0.45, 1.5],     // Central Swamp Lift pad
  [340, 50, 396, 92, null, 4],               // Rubie Residence garden
  [316, 94, 392, 116, null, 3],
  [226, 140, 286, 196, null, 4],             // Pale Apartments
  [316, 184, 360, 212, null, 3],             // Ben Welda's Sunroof
  [658, 28, 718, 80, null, 4],               // Pattern House compound
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
    step('terrain', terrain); step('dam', damDetails); step('north', northPOIs); step('west', westPOIs); step('south', southPOIs);
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
  const C = { w, rng };
  const WV = w.tw + 1;
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
  const distSeg = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1; const t = clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
  C.distLine = (px, pz, pts) => { let d = 1e9; for (let k = 0; k < pts.length - 1; k++) d = Math.min(d, distSeg(px, pz, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1])); return d; };
  C.distEdge = (x, z, poly) => C.distLine(x, z, poly.concat([poly[0]]));
  C.strip = (pts, wd) => {
    const L = [], Rr = [];
    for (let k = 0; k < pts.length; k++) {
      const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * wd / 2, nz = dx / l * wd / 2;
      L.push([pts[k][0] + nx, pts[k][1] + nz]); Rr.push([pts[k][0] - nx, pts[k][1] - nz]);
    }
    return L.concat(Rr.reverse());
  };
  C.inDam = (x, z, pad = 0) => DAM_RECTS.some(([a, b, c, d]) => x > a - pad && x < c + pad && z > b - pad && z < d + pad) || C.distLine(x, z, BALCONY) < 6.5 + pad || (pad <= 0 ? pointInPoly(x, z, PG_POLY) && C.distEdge(x, z, PG_POLY) > -pad : pointInPoly(x, z, PG_POLY) || C.distEdge(x, z, PG_POLY) < pad);
  // clearings that vegetation / scatter avoid: [cx, cz, r] and rects [x0,z0,x1,z1]
  C.clear = []; C.clearRects = [];
  C.addClear = (x, z, r) => C.clear.push([x, z, r]);
  C.addClearRect = (a, b, c, d) => C.clearRects.push([a, b, c, d]);
  C.inBuilding = (x, z, pad = 0.8) => w.buildings.some(b => x > b.x0 - pad && x < b.x1 + pad && z > b.z0 - pad && z < b.z1 + pad);
  C.nearRoad = (x, z, extra = 1.5) => ROADS.some(r => C.distLine(x, z, r) < 3.5 + extra) || TRACKS.some(r => C.distLine(x, z, r) < 2 + extra);
  C.blocked = (x, z) => C.inBuilding(x, z) || C.clear.some(([cx, cz, r]) => (x - cx) ** 2 + (z - cz) ** 2 < r * r) || C.clearRects.some(([a, b, c, d]) => x > a && x < c && z > b && z < d);
  C.doorPts = [];
  // spatial hash of solid prop footprints so clutter / loot never land inside props or block doors
  const PH = new Map(), PC = 4, phKey = (cx, cz) => cx * 4096 + cz;
  const baseProp = w.prop.bind(w);
  w.prop = (kind, x, z, rot = 0, opts = {}) => {
    baseProp(kind, x, z, rot, opts);
    if (!opts.solid) return;
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
  C.reserved = SPAWNS.map(p => p.slice());   // spawn / extract points kept clear
  C.nearDoor = (x0, z0, x1, z1, m = 1.8) => C.doorPts.some(([dx, dz]) => dx > x0 - m && dx < x1 + m && dz > z0 - m && dz < z1 + m);
  C.free = (x, z, r = 0.5) => !C.propHit(x - r, z - r, x + r, z + r) && !C.inBuilding(x, z, r + 0.3) && !C.reserved.some(([a, b]) => Math.hypot(a - x, b - z) < 2.5);

  // ------------------------------------------------------------------ buildings
  C.bld = (o) => {
    const spec = Object.assign({ wall: 'concrete', floor: 'tiles', roof: 'roofTar', storeys: 1, thick: 0.3 }, o);
    const b = w.building(spec);
    const { x, z, w: bw, d } = spec;
    for (const dd of spec.doors || []) {
      if (dd.sill) continue;
      const c = dd.at + dd.w / 2;
      C.doorPts.push(dd.side === 'n' ? [x + c, z] : dd.side === 's' ? [x + c, z + d] : dd.side === 'w' ? [x, z + c] : [x + bw, z + c]);
    }
    for (const iw of spec.inner || []) for (const g of iw[4] || []) {
      const horiz = Math.abs(iw[1] - iw[3]) < 1e-6, c = g.at + g.w / 2;
      C.doorPts.push(horiz ? [x + iw[0] + c, z + iw[1]] : [x + iw[0], z + iw[1] + c]);
    }
    return b;
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
  // furnish a room (world rect): props along walls, containers, a ceiling light
  C.furnish = (type, x0, z0, x1, z1, o = {}) => {
    const F = FURN[type] || FURN.empty, tier = o.tier || 1, room = o.room || null;
    const slots = [];
    for (let x = x0 + 1.3; x <= x1 - 1.3; x += 2.3) slots.push([x, z0 + 0.7, 0]);
    if (z1 - z0 > 5) for (let x = x0 + 1.3; x <= x1 - 1.3; x += 2.3) slots.push([x, z1 - 0.7, PI]);
    for (let z = z0 + 1.7; z <= z1 - 1.7; z += 2.3) { slots.push([x0 + 0.6, z, PI / 2]); slots.push([x1 - 0.6, z, -PI / 2]); }
    const ok = slots.filter(([sx, sz]) => !C.doorPts.some(([dx, dz]) => Math.abs(dx - sx) < 2.0 && Math.abs(dz - sz) < 2.0));
    for (let i = ok.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ok[i], ok[j]] = [ok[j], ok[i]]; }
    const area = (x1 - x0) * (z1 - z0);
    const nProps = Math.min(Math.floor(ok.length * 0.55), F.props.length + (area > 90 ? 2 : 0));
    let k = 0;
    for (let i = 0; i < nProps; i++) { const [sx, sz, r] = ok[k++]; w.prop(F.props[i % F.props.length], sx, sz, r, { solid: true }); }
    let nc = 0;
    for (const [kind, p] of F.cont) {
      if (k >= ok.length) break;
      if (rng() < p * (o.mul || 1)) { const [sx, sz, r] = ok[k++]; w.container(kind, sx, sz, r, { tier, room }); nc++; }
    }
    for (const [kind, n] of o.extra || []) for (let i = 0; i < n && k < ok.length; i++) { const [sx, sz, r] = ok[k++]; w.container(kind, sx, sz, r, { tier, room }); }
    if (o.light !== false) w.lamp((x0 + x1) / 2, (z0 + z1) / 2, { y: o.ly || 2.7, model: null, color: LIGHT_COL[type] || 0xffd8a0, intensity: o.li || 1.25, range: Math.max(6, Math.hypot(x1 - x0, z1 - z0) * 0.75), flicker: o.flicker ?? (rng() < 0.18 ? 0.35 : 0) });
    return nc;
  };
  // scatter props around a centre (avoid buildings)
  const SOLID = new Set(['crate', 'barrel', 'barrelBlue', 'car', 'sandbag', 'rock', 'husk', 'pipe', 'dg_container', 'dg_containerB', 'dg_containerG', 'dg_truck', 'dg_barrier', 'dg_rubble', 'dg_hedgehog', 'dg_tankS', 'dg_toxic', 'dg_log', 'dg_stump', 'dg_huskbig', 'dg_slab', 'dg_transformer', 'dg_bigpipe', 'lootCrate', 'arcCrate', 'dg_scaffold', 'dg_tent', 'deadTree', 'tree', 'pine', 'dg_willow', 'dg_cypress']);
  C.clutter = (cx, cz, r, n, kinds, o = {}) => {
    let placed = 0, tries = 0;
    while (placed < n && tries++ < n * 12) {
      const a = rng() * 2 * PI, d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d * (o.sz || 1);
      if (x < 2 || z < 2 || x > W - 2 || z > H - 2) continue;
      if (C.inBuilding(x, z, o.pad ?? 1.2)) continue;
      if (o.avoid && o.avoid(x, z)) continue;
      const k = kinds[Math.floor(rng() * kinds.length)], sc = (o.scale || 1) * (1 + (rng() - 0.5) * (o.scaleVar ?? 0.2));
      const rot = o.rot ?? (BOXY.has(k) ? Math.floor(rng() * 4) * PI / 2 + (rng() - 0.5) * 0.12 : rng() * 2 * PI);
      const solid = SOLID.has(k);
      if (solid) {
        const sol = propInfo(k).solid || [0.5, 0.5]; let hw = sol[0] * sc, hd = sol[1] * sc; if (Math.abs(Math.sin(rot)) > 0.7) [hw, hd] = [hd, hw];
        if (C.propHit(x - hw - 0.3, z - hd - 0.3, x + hw + 0.3, z + hd + 0.3)) continue;
        if (w.buildings.some(bb => bb.x0 - 1 < x + hw && bb.x1 + 1 > x - hw && bb.z0 - 1 < z + hd && bb.z1 + 1 > z - hd)) continue;
        if (o.noDoor !== false && C.nearDoor(x - hw, z - hd, x + hw, z + hd, 2.2)) continue;
        if (C.reserved.some(([a, b]) => Math.hypot(a - x, b - z) < 3 + Math.max(hw, hd))) continue;
      } else if (o.noDoor !== false && C.nearDoor(x, z, x, z, 1.2)) continue;
      w.prop(k, x, z, rot, { solid: solid ? true : undefined, scale: sc });
      placed++;
    }
    return placed;
  };
  C.solidKind = (k) => SOLID.has(k);
  const BOXY = new Set(['dg_container', 'dg_containerB', 'dg_containerG', 'dg_truck', 'dg_scaffold', 'dg_transformer', 'dg_ventbox', 'dg_tent', 'car', 'dg_bigpipe', 'pipe', 'sandbag', 'dg_barrier']);
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
        if (x > 2 && z > 2 && x < W - 2 && z < H - 2 && !C.inBuilding(x, z, 0.6) && !(o.skip && o.skip(x, z)) && !(o.notDam && C.inDam(x, z, 2)) && !C.propHit(x - 0.5, z - 0.5, x + 0.5, z + 0.5)) w.lamp(x, z, { y: o.y || 4.0, color: o.color || 0xffc078, intensity: o.i || 1.6, range: o.range || 13, flicker: rng() < 0.12 ? 0.5 : 0, model: o.model || 'lamp' });
        side = -side;
      }
      acc = (acc - L) % spacing; if (acc < 0) acc += spacing;
    }
  };
  C.flood = (x, z, o = {}) => w.lamp(x, z, { y: 6.6, model: 'dg_floodlight', color: o.color || 0xe0ecff, intensity: o.i || 1.9, range: o.range || 18, rot: o.rot || 0, flicker: o.flicker || 0 });
  C.beacon = (x, z, o = {}) => w.lamp(x, z, { y: o.y || 3.9, model: o.model === undefined ? 'dg_beacon' : o.model, color: 0xff3020, intensity: o.i || 1.2, range: o.range || (o.y > 6 ? o.y + 5 : 8), flicker: 0.6 });
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
  C.sandbags = (pts) => {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 2)), rot = Math.atan2(bx - ax, bz - az) + PI / 2;
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; w.prop('sandbag', ax + (bx - ax) * t, az + (bz - az) * t, rot, { solid: true }); }
    }
  };
  // field depot: small resupply hut with antenna (quest target)
  C.fieldDepot = (x, z) => {
    C.bld({ x: x - 3, z: z - 2.5, w: 6, d: 5, wall: 'metalPanel', floor: 'metalPanel', roof: 'metalPanel', roofTint: 0x7a9ac0, name: 'Field Depot', doors: [{ side: 's', at: 2, w: 2 }], vents: 1 });
    w.container('field_depot', x, z - 1.4, 0, { tier: 2 });
    w.container('ammo_box', x + 1.8, z - 1.2, 0, { tier: 1 });
    w.prop('dg_antennamast', x + 4.2, z - 1.5, 0, { solid: true, scale: 0.75 });
    w.lamp(x, z + 3.2, { y: 3.2, model: null, color: 0x60e0ff, intensity: 1.55, range: 9 });
    w.poi('field_depot', 'Field Depot', x, z, 10, { tier: 1, aliases: ['field_depot'] });
  };
  // extraction points
  C.lift = (id, name, x, z, o = {}) => {
    w.prop('extractPad', x, z, 0, {});
    w.prop('dg_liftframe', x, z, 0, {});
    w.lamp(x, z + 0.5, { y: 1.6, model: null, color: 0x60ff88, intensity: 1.7, range: 10 });
    w.extract(id, name, x, z, { kind: 'elevator', ...o });
    C.addClear(x, z, 5); C.reserved.push([x, z]);
  };
  C.hatch = (id, name, x, z, o = {}) => {
    w.prop('hatch', x, z, 0, {});
    w.prop('dg_hatchring', x, z, 0, {});
    w.lamp(x + 1.8, z - 1.8, { y: 1.2, model: null, color: 0xffc040, intensity: 1.4, range: 8, flicker: 0.2 });
    w.extract(id, name, x, z, { kind: 'hatch', needsKey: 'raider_hatch_key', ...o });
    C.addClear(x, z, 3.5); C.reserved.push([x, z]);
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
  const { w, areaFn, slope } = C;
  const VW = w.tw + 1, VH = w.th + 1;
  // rasterised masks: binary ones at vertex resolution, smooth (blurred) ones on a 4 m grid
  const scanFill = (pts, fn, step = 1, cols = VW, rows = VH) => {
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
  const polyMask = (pts) => { const m = new Uint8Array(VW * VH); scanFill(pts, (i) => { m[i] = 1; }); return m; };
  const G = 4, GW = Math.ceil(VW / G) + 1, GH = Math.ceil(VH / G) + 1;
  const smoothMask = (pts, r) => {         // coarse mask + 2-pass running box blur (radius r metres)
    const a = new Float32Array(GW * GH), t = new Float32Array(GW * GH), k = Math.max(1, Math.round(r / G)), n = 2 * k + 1;
    scanFill(pts, (i) => { a[i] = 1; }, G, GW, GH);
    for (let pass = 0; pass < 2; pass++) {
      for (let z = 0; z < GH; z++) { const o = z * GW; let acc = 0; for (let x = -k; x <= k; x++) acc += a[o + clamp(x, 0, GW - 1)]; for (let x = 0; x < GW; x++) { t[o + x] = acc / n; acc += a[o + Math.min(GW - 1, x + k + 1)] - a[o + Math.max(0, x - k)]; } }
      for (let x = 0; x < GW; x++) { let acc = 0; for (let z = -k; z <= k; z++) acc += t[clamp(z, 0, GH - 1) * GW + x]; for (let z = 0; z < GH; z++) { a[z * GW + x] = acc / n; acc += t[Math.min(GH - 1, z + k + 1) * GW + x] - t[Math.max(0, z - k) * GW + x]; } }
    }
    return a;
  };
  const samp = (m, x, z) => { const fx = x / G, fz = z / G, ix = Math.min(GW - 2, fx | 0), iz = Math.min(GH - 2, fz | 0), tx = fx - ix, tz = fz - iz, i = iz * GW + ix;
    return (m[i] * (1 - tx) + m[i + 1] * tx) * (1 - tz) + (m[i + GW] * (1 - tx) + m[i + GW + 1] * tx) * tz; };
  const rectPts = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];
  const swampBin = polyMask(SWAMP), basinBin = polyMask(BASIN);
  C.swampAt = (x, z) => swampBin[clamp(Math.round(z), 0, VH - 1) * VW + clamp(Math.round(x), 0, VW - 1)] > 0;
  C.basinAt = (x, z) => basinBin[clamp(Math.round(z), 0, VH - 1) * VW + clamp(Math.round(x), 0, VW - 1)] > 0;
  const neS = smoothMask(NE_HIGHLAND, 9), swampS = smoothMask(SWAMP, 7), basinS = smoothMask(BASIN, 13);
  const coreS = smoothMask(rectPts(540, 70, 940, 620), 16), southS = smoothMask(rectPts(430, 580, 900, 770), 16);
  // macro relief on the coarse grid
  const macro = new Float32Array(GW * GH);
  for (let gz = 0; gz < GH; gz++) for (let gx = 0; gx < GW; gx++) {
    const x = gx * G, z = gz * G, i = gz * GW + gx;
    let h = MID;
    const north = sm(150, 96, z) * sm(330, 430, x);
    h += north * (HIGH - MID + 0.6);                                                   // northern highland (dam abutment)
    h += sm(250, 180, z) * sm(830, 870, x) * sm(965, 905, x) * (HIGH - MID + 0.2) * (1 - north);   // NE shoulder
    h += sm(48, 0, z) * sm(580, 660, x) * 9;                                           // north rim mountains
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
  // ---------------- dam
  for (const [x0, z0, x1, z1] of DAM_RECTS) w.raiseRect(x0, z0, x1, z1, HIGH, 0, 'set');
  scanFill(PG_POLY, (i) => { w.hv[i] = HIGH; });
  scanFill(C.strip(BALCONY, 13), (i) => { w.hv[i] = HIGH; });
  // The Breach: a rubble-strewn pass through the broken dam, swamp (west) -> basin (east)
  areaFn(586, 292, 676, 322, (x, z) => {
    const t = clamp((x - 588) / 84, 0, 1);
    let h = lerp(MID + 0.2, LOW + 0.4, smooth(t));
    const c = Math.hypot(x - 628, z - 307); if (c < 9) h -= (1 - c / 9) * 1.3;
    return h + Math.sin(x * 0.7 + z * 0.3) * 0.15;
  });
  slope(570, 292, 588, 322, MID, MID + 0.2, 'x', 4);
  slope(632, 302, 646, 322, 1.4, HIGH, 'z', 0);             // collapsed slab ramp up onto the Floodgates
  slope(666, 270, 690, 292, HIGH, 1.0, 'z', 0);             // rubble slope down from the upper dam
  for (const [xf, zc, len] of CHUTES) slope(xf, zc - 3.5, xf + len, zc + 3.5, HIGH, LOW + 0.3, 'x', 0);
  for (const [x0, z0, x1, z1] of [[704, 192, 720, 210], [732, 212, 752, 234]]) w.raiseRect(x0, z0, x1, z1, 1.0, 0, 'set');   // flooded turbine shafts
  // ramps between tiers
  slope(612, 220, 634, 232, MID + 0.5, HIGH, 'x', 0);       // swamp -> Controlled Access Zone
  slope(560, 366, 582, 376, MID + 0.3, HIGH, 'x', 0);       // swamp -> Floodgates
  slope(440, 438, 470, 452, MID + 0.2, HIGH, 'x', 0);       // Water Treatment plaza -> Primary Facility
  slope(522, 500, 536, 524, HIGH, MID + 0.1, 'z', 0);       // Primary Facility -> clarifier yard
  slope(572, 548, 586, 572, HIGH, MID + 0.3, 'z', 0);       // R&A -> south road
  slope(806, 590, 832, 604, HIGH, MID + 0.2, 'x', 0);       // balcony east end -> Electrical Tower
  slope(694, 538, 704, 558, HIGH, MID + 0.2, 'z', 0);       // balcony stairs -> field depot
  slope(604, 84, 628, 100, 7.2, HIGH, 'x', 4);              // north road climbs onto the plateau
  slope(772, 268, 790, 280, HIGH, 2.0, 'z', 0);             // service ramp from Pipeline Tower into the basin
  slope(884, 196, 904, 210, HIGH, HIGH, 'x', 3);            // plateau -> Raider Outpost East shoulder
  // raised walkways (West Broken Bridge reachable from the north rim via an embankment ramp)
  slope(486, -1, 506, 9, w.vh(486, 4), 12.4, 'x', 3);
  w.deck(WBB, 10, 12.4, 'asphalt', { rails: false, pillars: true, side: 'concrete' });
  w.deck(HIGHWAY, 9, HIGH + 0.25, 'asphalt', { rails: false, pillars: false });
  w.deck(EBB, 9, HIGH + 0.25, 'asphalt', { rails: false, pillars: true, side: 'concrete' });
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
  for (const [x0, z0, x1, z1] of [[704, 192, 720, 210], [732, 212, 752, 234]]) w.water(x0, z0, x1, z1, { level: 6.4, material: C.darkMat });
  w.waterPoly([[619, 299], [637, 299], [638, 315], [618, 315]], { level: 0.85, material: C.darkMat });
  w.river([[700, 360], [740, 392], [770, 420], [790, 456], [826, 486], [870, 500], [910, 540], [940, 600], [980, 660], [1010, 720]], 5, { level: LOW - 0.25, depth: 0.7, bank: 3 });
  w.river([[452, 600], [490, 608], [530, 603], [570, 613], [610, 633], [640, 660], [668, 676], [700, 688], [745, 690], [790, 682], [830, 692], [880, 704]], 4, { level: MID - 0.45, depth: 0.75, bank: 3 });

  // ---------------- roads
  for (const r of ROADS) w.road(r, 7, 'asphalt', { edge: 'gravel', edgeW: 1.2 });
  for (const r of TRACKS) w.road(r, 4, 'dirt', { edge: 'gravel', edgeW: 0.6 });
  w.path([[548, 452], [578, 420], [596, 392], [612, 360], [626, 330]], 5, 'concrete');           // crest service road
  w.path([[680, 288], [690, 262], [700, 236], [722, 200], [742, 176], [728, 150], [706, 140]], 5, 'concrete');

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
  for (const [x0, z0, x1, z1] of DAM_RECTS) w.paint('damConcrete', x0, z0, x1, z1);
  w.paintPoly('damConcrete', PG_POLY);
  w.paintPoly('damConcrete', C.strip(BALCONY, 12.5));
  w.paint('gravel', 586, 292, 676, 322);
  w.paintCircle('mud', 628, 307, 10, 0.4, 3);
  for (const [xf, zc, len] of CHUTES) { w.paint('concrete', xf, zc - 3.5, xf + len, zc + 3.5); w.paint('hazard', xf - 1, zc - 3.5, xf, zc + 3.5); }
  // re-paint the crest service roads over the dam paint
  w.path([[548, 452], [578, 420], [596, 392], [612, 360], [626, 330]], 5, 'concrete');
  w.path([[680, 288], [690, 262], [700, 236], [722, 200], [742, 176], [728, 150], [706, 140]], 5, 'concrete');
  w.path(HIGHWAY, 8, 'asphalt');
  w.paint('hazard', 704, 190, 722, 192); w.paint('hazard', 730, 210, 754, 212);
  // concrete facades on every sheer drop of the dam / plateau / decks (stepped where diagonal)
  facades(C, 440, 50, 935, 615, 'damConcrete');
  facades(C, 496, 0, 572, 34, 'concrete');
}

// Turn every vertical terrain step (> 2.2 m between neighbouring vertices) into concrete slabs:
// the dam faces, pier walls along the chutes, broken bridge ends, turbine shafts, balcony.
function facades(C, X0, Z0, X1, Z1, tex) {
  const { w, rng } = C;
  const VW = w.tw + 1, VH = w.th + 1, hv = w.hv;
  const V = (x, z) => hv[(z < 0 ? 0 : z >= VH ? VH - 1 : z) * VW + (x < 0 ? 0 : x >= VW ? VW - 1 : x)];
  const DROP = 2.2, PIECE = 6;
  const horizOf = (d) => d === 's' || d === 'n';
  const emit = (dir, a, b, line, top, low) => {
    const y0 = low - 0.25, gapTop = top + 0.06;
    const big = top - low > 7;
    // parapet: coherent 14 m stretches, solid on big basin-side drops, with gaps on lower faces
    const cx = horizOf(dir) ? (a + b) / 2 : line, cz = horizOf(dir) ? line : (a + b) / 2;
    const hsh = ((Math.floor(cx / 14) * 73856093) ^ (Math.floor(cz / 14) * 19349663) ^ (dir.charCodeAt(0) * 83492791)) >>> 0;
    const par = (hsh % 100) < (big ? 82 : 55) ? 0.95 : 0.06;
    const h = (par > 0.5 ? top + par : gapTop) - y0;
    if (dir === 's') w.block(a - 0.5, line - 0.3, b + 0.5, line + 1.0, h, tex, { y0 });
    else if (dir === 'n') w.block(a - 0.5, line - 1.0, b + 0.5, line + 0.3, h, tex, { y0 });
    else if (dir === 'e') w.block(line - 0.3, a - 0.5, line + 1.0, b + 0.5, h, tex, { y0 });
    else w.block(line - 1.0, a - 0.5, line + 0.3, b + 0.5, h, tex, { y0 });
  };
  const scan = (dir) => {
    const horiz = dir === 's' || dir === 'n';
    const [o0, o1, i0, i1] = horiz ? [Z0, Z1, X0, X1] : [X0, X1, Z0, Z1];
    for (let o = o0; o <= o1; o++) {
      let run = null;
      for (let i = i0; i <= i1 + 1; i++) {
        let ok = false, t = 0, l = 0;
        if (i <= i1) {
          const [x, z] = horiz ? [i, o] : [o, i];
          const [nx, nz] = dir === 's' ? [x, z + 1] : dir === 'n' ? [x, z - 1] : dir === 'e' ? [x + 1, z] : [x - 1, z];
          t = V(x, z); l = V(nx, nz);
          ok = t > 0.8 && t - l > DROP;
        }
        if (ok && run && i - run.a < PIECE) { run.top = Math.max(run.top, t); run.low = Math.min(run.low, l); }
        else {
          if (run) emit(dir, run.a, i - 1, o, run.top, run.low);
          run = ok ? { a: i, top: t, low: l } : null;
        }
      }
    }
  };
  for (const d of ['s', 'n', 'e', 'w']) scan(d);
}

// ==================================================================================== DAM DETAILS
function damDetails(C) {
  const { w, R, rng } = C;
  // ---------------- The Breach
  for (const [x, z, r] of [[606, 300, 0.4], [646, 312, 2.2], [614, 316, 1.1], [662, 300, 2.8], [590, 312, 0.2]]) w.prop('dg_slab', x, z, r, { solid: true, scale: 0.9 + rng() * 0.3 });
  C.clutter(628, 307, 26, 22, ['dg_rubble', 'dg_rubble', 'debris', 'dg_rubble', 'rock'], { sz: 0.5, scale: 1.2, avoid: (x, z) => z < 293 || z > 321 });
  w.prop('dg_brokenspan', 600, 296, 1.9, {});
  w.block(676, 300, 698, 320, 4.5, 'damConcrete', {});                     // fallen dam monolith
  C.clutter(687, 310, 16, 8, ['dg_rubble', 'debris'], { avoid: (x, z) => x > 674 && x < 700 && z > 298 && z < 322 });
  C.sandbags([[600, 318], [608, 320], [614, 318]]);
  w.prop('husk', 618, 296, 0.6, { solid: true }); w.prop('dg_huskbig', 652, 306, 2.1, { solid: true });
  C.loot(628, 307, 14, ['arc_husk', 'ammo_box', 'crate', 'arc_crate', 'trash'], 2);
  w.container('arc_husk', 656, 312, 0, { tier: 2 });
  for (const [x, z] of [[596, 304], [640, 296], [660, 316]]) w.lamp(x, z, { y: 4, color: 0xffb070, intensity: 1.55, range: 10, flicker: 0.7 });
  C.fire(624, 312);
  // ---------------- Floodgates crest machinery
  CHUTES.forEach(([xf, zc], ci) => {
    w.prop('dg_floodgate', xf - 2.2, zc, PI / 2, { solid: true });
    if (ci % 2 === 0) w.prop('dg_gantry', xf - 6, zc, PI / 2, {});
    w.prop('dg_spillgrate', xf + 6, zc, PI / 2, {});
    C.beacon(xf - 1.2, zc - 5, { y: 3.9 });
    C.clutter(xf + 22, zc, 12, 3, ['debris', 'dg_rubble', 'barrel'], { sz: 0.25, avoid: (x, z) => Math.abs(z - zc) > 3 });
  });
  // gantry rails along the chute heads
  for (const [x, z0, z1] of [[648, 324, 360], [632, 362, 392], [616, 394, 424], [602, 428, 452]]) for (let z = z0; z < z1; z += 4) w.prop('dg_rail', x, z + 2, 0, {});
  // crest lights
  for (const [x, z] of [[606, 330], [628, 324], [596, 360], [586, 384], [572, 404], [560, 430], [600, 412], [588, 444], [640, 354], [626, 378]]) C.flood(x, z, { rot: R(0, 6.28) });
  for (const [x, z] of [[652, 322], [652, 360], [636, 394], [620, 426], [606, 455], [598, 324], [582, 358], [566, 390], [551, 422]]) C.beacon(x, z);
  // Floodgate Control (F1)
  C.bld({ x: 606, z: 334, w: 18, d: 14, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Floodgate Control', floor: 'metalPanel', tint: 0xe8e0d0,
    doors: [{ side: 's', at: 3, w: 2.2, door: true }, { side: 'e', at: 5, w: 2, door: true }, { side: 'n', at: 4, w: 3, sill: 1.1 }, { side: 'n', at: 11, w: 3, sill: 1.1 }, { side: 'w', at: 5, w: 3, sill: 1.1 }],
    inner: [[10, 0, 10, 14, [{ at: 8, w: 1.8 }]]] });
  C.furnish('control', 606, 334, 616, 348, { tier: 2 });
  C.furnish('office', 616, 334, 624, 348, { tier: 2 });
  // Maintenance (F2) with tunnel access
  C.bld({ x: 590, z: 366, w: 14, d: 12, floorY: HIGH, blend: 0.5, name: 'Floodgate Maintenance', roof: 'corrugated', floor: 'concrete',
    doors: [{ side: 's', at: 2, w: 2.4 }, { side: 'e', at: 6, w: 2, door: true }, { side: 'n', at: 5, w: 3, sill: 1.1 }] });
  C.furnish('workshop', 590, 366, 604, 378, { tier: 2 });
  w.prop('dg_stairs', 600, 370, PI, {}); w.prop('dg_signred', 598, 379.5, 0, { solid: true });
  // Intake House (F3)
  C.bld({ x: 574, z: 398, w: 18, d: 14, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Intake House', floor: 'metalPanel',
    doors: [{ side: 's', at: 7, w: 2.4, door: true }, { side: 'e', at: 4, w: 2, door: true }, { side: 'w', at: 6, w: 3, sill: 1.1 }],
    inner: [[0, 7, 18, 7, [{ at: 12, w: 1.8 }]]] });
  C.furnish('industrial', 574, 398, 592, 405, { tier: 2, extra: [['toolbox', 1]] });
  w.prop('dg_pump', 580, 401.5, 0, { solid: true }); w.prop('dg_valve', 588, 401.5, 0, { solid: true });
  C.furnish('office', 574, 405, 592, 412, { tier: 1 });
  // F4 hut + parked gear
  C.bld({ x: 558, z: 428, w: 10, d: 8, floorY: HIGH, blend: 0.5, name: 'Gate Hut', roof: 'corrugated', doors: [{ side: 'e', at: 3, w: 2 }, { side: 's', at: 2, w: 3, sill: 1.1 }] });
  C.furnish('storage', 558, 428, 568, 436, { tier: 1 });
  C.clutter(590, 395, 30, 26, ['crate', 'barrel', 'barrelBlue', 'dg_barrier', 'dg_container', 'debris', 'pipe', 'dg_bigpipe'], { avoid: (x, z) => !C.inDam(x, z, -3) || CHUTES.some(([xf, zc]) => Math.abs(z - zc) < 6 && x > xf - 12) });
  C.loot(595, 395, 30, ['crate', 'toolbox', 'ammo_box', 'crate', 'trash', 'locker'], 1, { avoid: (x, z) => !C.inDam(x, z, -3) });
  // ---------------- upper dam (U3) broken end above the breach
  w.prop('dg_gantry', 690, 282, 0.25, {}); C.clutter(680, 274, 20, 12, ['dg_rubble', 'debris', 'dg_barrier', 'barrel'], { avoid: (x, z) => !C.inDam(x, z, -2) });
  for (const [x, z] of [[660, 262], [700, 262], [656, 288], [708, 290]]) C.beacon(x, z);
  C.flood(680, 260);
  // ---------------- Red Lakes Balcony
  for (let i = 0; i < 9; i++) {
    const t = (i + 0.5) / 9, seg = Math.min(2, Math.floor(t * 3)), a = BALCONY[seg], b = BALCONY[seg + 1], tt = t * 3 - seg;
    const x = lerp(a[0], b[0], tt), z = lerp(a[1], b[1], tt);
    if (i % 2 === 0) C.flood(x + 2, z - 3); else C.beacon(x - 3, z + 4.5);
  }
  C.clutter(720, 545, 70, 18, ['crate', 'barrel', 'dg_barrier', 'debris', 'dg_rubble'], { sz: 0.6, avoid: (x, z) => C.distLine(x, z, BALCONY) > 4.5 });
  C.loot(720, 545, 70, ['crate', 'toolbox', 'ammo_box', 'crate', 'trash'], 1, { avoid: (x, z) => C.distLine(x, z, BALCONY) > 4.5 });
  // Flood Access Tunnel portal on the basin side
  w.block(712, 528.6, 722, 530.4, 3.2, 'metalPanel', {});
  w.prop('dg_signred', 717, 527.5, PI, { solid: true });
  w.lamp(717, 526, { y: 3.2, model: null, color: 0xffb040, intensity: 1.55, range: 8, flicker: 0.3 });
  // big pipes down the dam face into the basin (penstocks)
  for (const [x, z, r] of [[782, 276, 0.6], [796, 286, 0.6], [810, 296, 0.6], [664, 266, 0], [672, 266, 0]]) w.prop('dg_bigpipe', x, z, r, { solid: true });
}

// ==================================================================================== NORTH
function northPOIs(C) {
  const { w, R, rng } = C;
  // ---------------- Generator Hall (NW end of the Power Generation plateau)
  C.bld({ x: 640, z: 112, w: 56, d: 26, storeys: 3, floorY: HIGH, blend: 0.5, name: 'Generator Hall', wall: 'concrete', floor: 'metalPanel', tint: 0xe0d8c8,
    doors: [{ side: 's', at: 6, w: 3.2 }, { side: 's', at: 44, w: 3.2 }, { side: 'w', at: 6, w: 2.4, door: true }, { side: 'e', at: 5, w: 2.4, door: true }, { side: 'n', at: 26, w: 2, door: true },
      { side: 's', at: 18, w: 3, sill: 1.1 }, { side: 's', at: 28, w: 3, sill: 1.1 }, { side: 's', at: 36, w: 3, sill: 1.1 }, { side: 'n', at: 8, w: 3, sill: 1.1 }, { side: 'n', at: 44, w: 3, sill: 1.1 }],
    inner: [[16, 0, 16, 26, [{ at: 10, w: 2.4 }]], [44, 0, 44, 26, [{ at: 14, w: 2.4 }]], [0, 13, 16, 13, [{ at: 6, w: 1.8 }]], [44, 12, 56, 12, [{ at: 5, w: 1.8 }]]],
    roofExtras: [[20, 4, 30, 10, 1.6], [34, 14, 42, 22, 1.2]] });
  C.furnish('control', 640, 112, 656, 125, { tier: 2 });
  C.furnish('workshop', 640, 125, 656, 138, { tier: 2 });
  C.furnish('storage', 684, 112, 696, 124, { tier: 2 });
  C.furnish('security', 684, 124, 696, 138, { tier: 2 });
  // the Generator Room
  w.prop('dg_generator', 664, 119, 0, { solid: true }); w.prop('dg_generator', 676, 119, 0, { solid: true });
  w.prop('dg_console', 670, 134.5, PI, { solid: true }); w.prop('dg_fusebox', 682.5, 132, -PI / 2, { solid: true });
  w.container('toolbox', 660, 132, 0, { tier: 2 }); w.container('electronics', 678, 128, 0, { tier: 2 }); w.container('crate', 662, 114, 0, { tier: 1 });
  C.inLight(664, 126, 0xffd090, 1.1, 10, 3.6); C.inLight(678, 126, 0xffd090, 1.1, 10, 3.6);
  C.lift('north_complex_elevator', 'North Complex Elevator', 706, 140);
  C.flood(700, 130); C.flood(640, 144); C.flood(698, 150);
  // ---------------- Power Generation Complex
  C.bld({ x: 714, z: 148, w: 26, d: 18, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Power Control', tint: 0xd8d0c0, floor: 'tiles',
    doors: [{ side: 's', at: 4, w: 2, door: true }, { side: 'w', at: 8, w: 2 }, { side: 'e', at: 6, w: 2.4, door: true }, { side: 'n', at: 4, w: 3, sill: 1.1 }, { side: 's', at: 16, w: 3, sill: 1.1 }],
    inner: [[12, 0, 12, 18, [{ at: 7, w: 1.8 }]], [12, 9, 26, 9, [{ at: 6, w: 1.6 }]]] });
  C.furnish('control', 714, 148, 726, 166, { tier: 2 });
  C.furnish('office', 726, 148, 740, 157, { tier: 2 });
  C.furnish('storage', 726, 157, 740, 166, { tier: 1 });
  w.prop('dg_ventbox', 737, 163.5, 0, { solid: true }); w.prop('dg_switch', 728, 165.3, PI, { solid: true });   // vent shaft + power switch under the stairs
  w.prop('dg_stairs', 732, 160, 0, {});
  // transformer yards (fenced grids of transformers, like the reference's gridded bays)
  for (const [x0, z0, x1, z1] of [[752, 156, 784, 182], [788, 186, 812, 210]]) {
    C.fenceRect(x0, z0, x1, z1, [[x0, (z0 + z1) / 2]]);
    for (let x = x0 + 5; x < x1 - 3; x += 8) for (let z = z0 + 6; z < z1 - 3; z += 9) w.prop('dg_transformer', x, z, 0, { solid: true });
    w.prop('dg_fusebox', x1 - 2, z0 + 1.2, 0, { solid: true });
    w.container('electronics', x0 + 2, z1 - 2, 0, { tier: 2 });
    C.flood(x0 + 1, z0 + 1, { color: 0xd0e0ff });
  }
  C.bld({ x: 816, z: 188, w: 22, d: 16, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Switchgear House', roof: 'corrugated', floor: 'concrete',
    doors: [{ side: 'w', at: 6, w: 2.4, door: true }, { side: 's', at: 14, w: 2 }, { side: 'n', at: 6, w: 3, sill: 1.1 }],
    inner: [[11, 0, 11, 16, [{ at: 6, w: 1.8 }]]] });
  C.furnish('industrial', 816, 188, 827, 204, { tier: 2 });
  C.furnish('server', 827, 188, 838, 204, { tier: 2 });
  C.fieldDepot(846, 205);
  // turbine access + loading yard between Generator Hall and the CAZ
  C.bld({ x: 650, z: 156, w: 20, d: 14, floorY: HIGH, blend: 0.5, name: 'Turbine Access', roof: 'corrugated', floor: 'metalPanel',
    doors: [{ side: 's', at: 8, w: 3.2 }, { side: 'e', at: 5, w: 2, door: true }] });
  C.furnish('industrial', 650, 156, 670, 170, { tier: 1 });
  for (const [x, z, r, k] of [[684, 158, 0, 'dg_container'], [684, 164, 0, 'dg_containerB'], [664, 188, PI / 2, 'dg_container'], [646, 184, 0.2, 'dg_truck'], [702, 166, 1.5, 'dg_containerG']]) w.prop(k, x, z, r, { solid: true });
  C.clutter(690, 180, 20, 14, ['crate', 'barrel', 'barrelBlue', 'dg_barrier', 'pipe', 'debris'], { avoid: (x, z) => !C.inDam(x, z, -2) });
  for (const [x0, z0, x1, z1] of [[704, 192, 720, 210], [732, 212, 752, 234]]) { C.beacon(x0 - 1, z0 - 1); C.beacon(x1 + 1, z1 + 1); }
  // more of the dense power complex: compressor + valve houses, cable hall, east gatehouse, pipe racks
  C.bld({ x: 676, z: 172, w: 24, d: 18, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Compressor House', roof: 'corrugated', floor: 'metalPanel', tint: 0xd0c8b8,
    doors: [{ side: 'w', at: 6, w: 2.4, door: true }, { side: 'n', at: 14, w: 3.2 }, { side: 's', at: 4, w: 3, sill: 1.1 }, { side: 's', at: 14, w: 3, sill: 1.1 }],
    inner: [[14, 0, 14, 18, [{ at: 10, w: 1.8 }]]] });
  C.furnish('industrial', 676, 172, 690, 190, { tier: 2 }); w.prop('dg_turbine', 683, 181, 0, { solid: true, scale: 0.8 });
  C.furnish('workshop', 690, 172, 700, 190, { tier: 1 });
  C.bld({ x: 754, z: 192, w: 16, d: 14, floorY: HIGH, blend: 0.5, name: 'Valve House', roof: 'corrugated', floor: 'concrete',
    doors: [{ side: 's', at: 5, w: 2.4, door: true }, { side: 'w', at: 6, w: 2 }] });
  C.furnish('industrial', 754, 192, 770, 206, { tier: 2 }); w.prop('dg_valve', 762, 199, 0, { solid: true });
  C.bld({ x: 790, z: 170, w: 24, d: 14, floorY: HIGH, blend: 0.5, name: 'Cable Hall', wall: 'concrete', tint: 0xc8c0b0, floor: 'metalPanel',
    doors: [{ side: 'w', at: 5, w: 2.4, door: true }, { side: 'e', at: 5, w: 2.4 }, { side: 's', at: 12, w: 3, sill: 1.1 }], inner: [[12, 0, 12, 14, [{ at: 4, w: 1.8 }]]] });
  C.furnish('storage', 790, 170, 802, 184, { tier: 1, extra: [['crate', 1]] }); C.furnish('server', 802, 170, 814, 184, { tier: 2 });
  C.bld({ x: 852, z: 214, w: 18, d: 14, floorY: HIGH, blend: 0.5, name: 'East Gatehouse', tint: 0xd8d0c0, floor: 'tiles',
    doors: [{ side: 's', at: 4, w: 2, door: true }, { side: 'n', at: 12, w: 2, door: true }, { side: 'e', at: 6, w: 3, sill: 1.1 }], inner: [[9, 0, 9, 14, [{ at: 6, w: 1.6 }]]] });
  C.furnish('security', 852, 214, 861, 228, { tier: 2 }); C.furnish('bunk', 861, 214, 870, 228, { tier: 1 });
  for (let x = 724; x < 750; x += 8) w.prop('dg_bigpipe', x, 178, 0, { solid: true });                 // pipe rack
  for (let z = 210; z < 260; z += 8) w.prop('dg_bigpipe', 727, z, PI / 2, { solid: true, scale: 0.8 });
  for (let x = 786; x < 830; x += 8) w.prop('dg_bigpipe', x, 214.5, 0, { scale: 0.7, solid: true });
  w.prop('dg_scaffold', 700, 150, 0, { solid: true }); w.prop('dg_scaffold', 778, 186, PI / 2, { solid: true });
  w.prop('dg_crane', 744, 202, 0.6, { solid: true });
  for (const [x, z] of [[740, 184], [706, 172], [788, 160], [876, 232]]) w.prop('dg_tankS', x, z, 0, { solid: true });
  C.loot(760, 175, 50, ['crate', 'toolbox', 'ammo_box', 'crate', 'trash', 'locker', 'toolbox'], 1, { avoid: (x, z) => !C.inDam(x, z, -2) });
  C.clutter(800, 175, 50, 22, ['barrel', 'crate', 'dg_container', 'dg_containerB', 'pipe', 'dg_bigpipe', 'debris', 'dg_scaffold'], { avoid: (x, z) => !C.inDam(x, z, -2) || C.distLine(x, z, HIGHWAY) < 6 });
  for (const [x, z] of [[730, 140], [760, 150], [796, 170], [846, 200], [870, 224], [740, 186], [760, 228], [660, 190]]) C.flood(x, z);
  // ---------------- Controlled Access Zone (puzzle vault)
  C.bld({ x: 646, z: 208, w: 46, d: 36, storeys: 3, floorY: HIGH, blend: 0.5, name: 'Controlled Access Zone', tint: 0xb8b8b0, floor: 'metalPanel',
    doors: [{ side: 's', at: 21, w: 2.4, door: true }, { side: 'w', at: 26, w: 1.8, door: true }, { side: 'e', at: 26, w: 1.8, door: true }, { side: 's', at: 6, w: 3, sill: 1.2 }, { side: 's', at: 36, w: 3, sill: 1.2 }],
    inner: [[0, 14, 46, 14, [{ at: 4.5, w: 2, door: true }, { at: 22, w: 2.4, door: true, locked: 'controlled_access_zone' }, { at: 39.5, w: 2, door: true }]],
      [12, 0, 12, 14, []], [34, 0, 34, 14, []], [0, 26, 46, 26, [{ at: 8, w: 2.4 }, { at: 35.5, w: 2.4 }]]],
    roofExtras: [[4, 4, 10, 10, 1.4], [36, 20, 42, 30, 1.0]] });
  C.furnish('storage', 646, 208, 658, 222, { tier: 2, extra: [['crate', 1]] });
  w.prop('barrelBlue', 650, 212, 0, { solid: true });                                       // fuel cell
  C.furnish('vault', 658, 208, 680, 222, { tier: 3, room: 'controlled_access_zone', extra: [['weapon_case', 1], ['raider_cache', 1]], light: true, li: 1.2 });
  w.keyRoom('controlled_access_zone', 658, 208, 680, 222, null, { name: 'Controlled Access Zone Vault' });
  C.furnish('control', 680, 208, 692, 222, { tier: 2 });
  w.prop('dg_fusebox', 690.8, 215, -PI / 2, { solid: true });                                // resource lock panel
  for (const [x, z, r] of [[648.5, 224, PI / 2], [689.5, 224, -PI / 2], [648.5, 233, PI / 2], [689.5, 233, -PI / 2]]) w.prop('dg_switch', x, z, r, { solid: true });
  w.prop('dg_puzzle', 669, 222.3, 0, { y: 2.3 });
  // the switch hall: work desks, shelving and dropped crates between the four switch panels
  for (const [x, z, k, r] of [[654, 228.5, 'dg_desk', 0], [684, 228.5, 'dg_desk', 0], [660, 233, 'shelf', PI], [678, 233, 'shelf', PI], [669, 229, 'dg_console', 0], [652, 231.5, 'crate', 0.3], [687, 231.8, 'barrel', 0]]) w.prop(k, x, z, r, { solid: true });
  w.container('electronics', 666, 233, PI, { tier: 2 }); w.container('toolbox', 673, 233, PI, { tier: 2 }); w.container('crate', 656, 233, 0, { tier: 1 });
  C.inLight(669, 228, 0xd0e8ff, 1.0, 12, 3.4);
  C.furnish('security', 646, 234, 668, 244, { tier: 2 });
  C.furnish('commercial', 670, 234, 692, 244, { tier: 1, mul: 0.6 });
  for (const [x, z] of [[662, 249], [678, 249]]) w.prop('dg_barrier', x, z, 0, { solid: true });
  C.flood(640, 202); C.flood(700, 250); C.beacon(636, 254); C.beacon(712, 198);
  // ---------------- Pipeline Tower
  w.prop('dg_pipetower', 752, 248, 0, { solid: true });
  C.bld({ x: 716, z: 240, w: 20, d: 18, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Pipeline Pumphouse', roof: 'corrugated', floor: 'metalPanel',
    doors: [{ side: 's', at: 4, w: 2.4, door: true }, { side: 'e', at: 7, w: 2.4 }, { side: 'w', at: 4, w: 2, door: true }],
    inner: [[11, 0, 11, 18, [{ at: 8, w: 1.8 }]]] });
  C.furnish('industrial', 716, 240, 727, 258, { tier: 2 });
  w.prop('dg_pump', 720, 246, PI / 2, { solid: true }); w.prop('dg_valve', 723.5, 253, 0, { solid: true });   // "the valve"
  C.furnish('control', 727, 240, 736, 258, { tier: 2 });
  for (const [x, z, r] of [[760, 244, 0], [762, 256, 0], [744, 262, PI / 2]]) w.prop('dg_bigpipe', x, z, r, { solid: true });
  C.clutter(750, 225, 18, 8, ['barrel', 'crate', 'pipe', 'dg_scaffold'], { avoid: (x, z) => !C.inDam(x, z, -2) || (x > 744 && x < 760 && z > 240 && z < 256) });
  w.prop('dg_scaffold', 744, 240, 0, { solid: true });
  C.flood(766, 232); C.flood(712, 262); C.beacon(770, 266); C.beacon(770, 188);
  // ---------------- Raider Outpost East
  for (const [x, z, bw, bd, nm] of [[856, 144, 10, 8, 'Raider Shack'], [872, 156, 9, 8, 'Raider Bunkhouse'], [890, 142, 10, 8, 'Raider Workshop']]) {
    C.bld({ x, z, w: bw, d: bd, wall: 'corrugated', floor: 'wood', roof: 'corrugated', roofTint: 0xb09070, name: nm, floorY: HIGH + 0.2, blend: 1,
      doors: [{ side: 's', at: 2, w: 1.8 }, { side: 'e', at: 2, w: 2, sill: 1.0 }] });
  }
  C.furnish('raider', 856, 144, 866, 152, { tier: 2 });
  C.furnish('bunk', 872, 156, 881, 164, { tier: 1 });
  C.furnish('workshop', 890, 142, 900, 150, { tier: 2 });
  w.prop('dg_watchtower', 902, 168, 0.3, { solid: true });
  w.prop('dg_tent', 862, 170, 0.2, { solid: true }); w.prop('dg_tent', 886, 170, -0.1, { solid: true });
  C.sandbags([[850, 160], [850, 176], [858, 180]]); C.sandbags([[896, 156], [906, 158]]);
  C.fire(876, 172);
  C.loot(876, 162, 16, ['raider_cache', 'ammo_box', 'crate', 'backpack', 'medical_bag', 'weapon_case'], 2);
  C.clutter(876, 162, 22, 14, ['crate', 'barrel', 'dg_hedgehog', 'debris', 'dg_barrier'], {});
  for (const [x, z] of [[866, 140], [906, 150], [858, 178]]) w.lamp(x, z, { y: 3.4, color: 0xffa860, intensity: 1.55, range: 10, flicker: 0.4 });
  // ---------------- West Broken Bridge (broken highway) + the hideout beneath
  w.prop('dg_brokenspan', 566, 31, 1.1, {}); w.prop('dg_brokenspan', 592, 52, 2.2, {});
  C.clutter(582, 46, 24, 16, ['dg_rubble', 'dg_rubble', 'debris', 'rock', 'dg_slab'], {});
  w.prop('dg_tent', 540, 34, 0.45, { solid: true }); w.prop('dg_bed', 534, 30, 0.45, { solid: true });
  C.fire(546, 30); w.container('raider_cache', 532, 35, 0.4, { tier: 2 }); w.container('suitcase', 548, 37, 0, { tier: 1 }); w.container('ammo_box', 537, 39, 0, { tier: 1 });
  C.sandbags([[524, 38], [532, 42], [540, 44]]);
  for (const [x, z] of [[510, 3], [530, 13], [552, 22]]) C.beacon(x, z, { model: null, y: 13.6 });
  // ---------------- East Broken Bridge
  w.prop('dg_brokenspan', 944, 244, 2.1, {}); w.prop('dg_brokenspan', 956, 262, 2.6, {});
  C.clutter(950, 256, 18, 14, ['dg_rubble', 'debris', 'rock', 'dg_slab'], {});
  C.loot(948, 252, 14, ['crate', 'trash', 'ammo_box'], 1);
  C.beacon(926, 225, { model: null, y: 10.5 });
  // ---------------- Pattern House (walled compound)
  for (const [ax, az, bx, bz, gaps] of [[660, 30, 716, 30, []], [660, 78, 716, 78, [[690, 78]]], [660, 30, 660, 78, [[660, 50]]], [716, 30, 716, 78, [[716, 64]]]]) {
    const horiz = az === bz, L = horiz ? bx - ax : bz - az;
    w.wallLine(ax, az, bx, bz, 0.5, 1.6, 'brick', gaps.map(([gx, gz]) => ({ at: (horiz ? gx - ax : gz - az) - 1.5, w: 3 })));
    for (const [gx, gz] of gaps) C.doorPts.push([gx, gz]);
  }
  C.bld({ x: 668, z: 40, w: 26, d: 18, storeys: 2, wall: 'brick', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', name: 'Pattern House', tint: 0xf0d8c8,
    doors: [{ side: 's', at: 11, w: 2, door: true }, { side: 'e', at: 7, w: 1.6, door: true }, { side: 's', at: 3, w: 2.4, sill: 0.9 }, { side: 's', at: 19, w: 2.4, sill: 0.9 }, { side: 'n', at: 6, w: 2.4, sill: 0.9 }, { side: 'n', at: 16, w: 2.4, sill: 0.9 }, { side: 'w', at: 7, w: 2, sill: 0.9 }],
    inner: [[9, 0, 9, 18, [{ at: 12, w: 1.6 }]], [18, 0, 18, 18, [{ at: 12, w: 1.6 }]], [0, 9, 9, 9, [{ at: 3, w: 1.6 }]], [18, 9, 26, 9, [{ at: 4, w: 1.6 }]]] });
  C.furnish('bedroom', 668, 40, 677, 49, { tier: 2 }); C.furnish('kitchen', 668, 49, 677, 58, { tier: 1 });
  C.furnish('living', 677, 40, 686, 58, { tier: 2 }); C.furnish('office', 686, 40, 694, 49, { tier: 2 }); C.furnish('storage', 686, 49, 694, 58, { tier: 1 });
  C.bld({ x: 700, z: 54, w: 10, d: 12, wall: 'brick', roof: 'roofTile', roofShape: 'gable', name: 'Pattern House Annex', doors: [{ side: 'w', at: 4, w: 1.6, door: true }, { side: 's', at: 3, w: 2, sill: 0.9 }] });
  C.furnish('workshop', 700, 54, 710, 66, { tier: 1 });
  C.bld({ x: 664, z: 62, w: 8, d: 8, wall: 'wood', roof: 'corrugated', name: 'Garden Shed', floor: 'wood', doors: [{ side: 'e', at: 3, w: 1.6 }] });
  C.furnish('storage', 664, 62, 672, 70, { tier: 1 });
  C.clutter(688, 68, 14, 10, ['bush', 'dg_planter', 'barrel', 'crate'], { avoid: (x, z) => x < 662 || x > 714 || z < 32 || z > 76 });
  w.prop('car', 688, 72, 1.5, { solid: true }); w.container('car_trunk', 688, 74.5, 0, { tier: 1 });
  w.lamp(681, 61, { y: 3, model: null, color: 0xffc890, intensity: 1, range: 9 }); w.lamp(712, 76, { y: 4, color: 0xffc078, intensity: 1.55, range: 10 });
  // ---------------- Rubie Residence (villa + garden + two houses)
  for (const [ax, az, bx, bz, gaps] of [[348, 50, 392, 50, []], [348, 90, 392, 90, [[370, 90]]], [348, 50, 348, 90, [[348, 76]]], [392, 50, 392, 90, [[392, 70]]]]) {
    const horiz = az === bz;
    w.wallLine(ax, az, bx, bz, 0.5, 1.5, 'plaster', gaps.map(([gx, gz]) => ({ at: (horiz ? gx - ax : gz - az) - 1.5, w: 3 })), { tint: 0xe8c8c0 });
    for (const [gx, gz] of gaps) C.doorPts.push([gx, gz]);
  }
  C.bld({ x: 356, z: 56, w: 28, d: 22, storeys: 2, wall: 'plaster', tint: 0xe8c0b8, floor: 'wood', roof: 'roofTile', roofShape: 'gable', name: 'Rubie Residence',
    doors: [{ side: 's', at: 12, w: 2, door: true }, { side: 'n', at: 22, w: 1.6, door: true }, { side: 's', at: 3, w: 2.4, sill: 0.9 }, { side: 's', at: 21, w: 2.4, sill: 0.9 }, { side: 'w', at: 6, w: 2, sill: 0.9 }, { side: 'e', at: 14, w: 2, sill: 0.9 }, { side: 'n', at: 4, w: 2.4, sill: 0.9 }],
    inner: [[10, 0, 10, 22, [{ at: 14, w: 1.8 }, { at: 4, w: 1.6 }]], [18, 0, 18, 22, [{ at: 4, w: 1.8 }, { at: 15, w: 1.6 }]], [0, 12, 10, 12, [{ at: 4, w: 1.6 }]], [18, 11, 28, 11, [{ at: 5, w: 1.6 }]]] });
  C.furnish('bedroom', 356, 56, 366, 68, { tier: 2 }); C.furnish('medical', 356, 68, 366, 78, { tier: 1, mul: 0.7 });
  C.furnish('living', 366, 56, 374, 78, { tier: 2 }); C.furnish('kitchen', 374, 56, 384, 67, { tier: 1 }); C.furnish('office', 374, 67, 384, 78, { tier: 2 });
  C.bld({ x: 322, z: 98, w: 18, d: 14, wall: 'plaster', tint: 0xd8c8b8, floor: 'wood', roof: 'roofTile', roofShape: 'gable', name: 'Rubie Cottage',
    doors: [{ side: 's', at: 3, w: 1.8, door: true }, { side: 'e', at: 4, w: 2, sill: 0.9 }, { side: 'w', at: 6, w: 2, sill: 0.9 }], inner: [[9, 0, 9, 14, [{ at: 6, w: 1.6 }]]] });
  C.furnish('living', 322, 98, 331, 112, { tier: 1 }); C.furnish('bedroom', 331, 98, 340, 112, { tier: 1 });
  C.bld({ x: 368, z: 98, w: 20, d: 14, storeys: 2, wall: 'plaster', tint: 0xe0d0c0, floor: 'tiles', roof: 'roofTile', roofShape: 'gable', name: 'Rubie Guesthouse',
    doors: [{ side: 's', at: 4, w: 1.8, door: true }, { side: 'n', at: 12, w: 1.6, door: true }, { side: 's', at: 12, w: 2.4, sill: 0.9 }], inner: [[10, 0, 10, 14, [{ at: 6, w: 1.6 }]]] });
  C.furnish('kitchen', 368, 98, 378, 112, { tier: 1 }); C.furnish('bedroom', 378, 98, 388, 112, { tier: 2 });
  C.clutter(370, 84, 20, 18, ['bush', 'bush', 'tree', 'dg_planter', 'rock'], { avoid: (x, z) => x < 350 || x > 390 || z < 52 || z > 88 });
  w.prop('car', 344, 120, 0.3, { solid: true }); w.prop('car', 392, 118, 1.2, { solid: true });
  C.loot(370, 84, 16, ['basket', 'plant', 'trash'], 1);
  for (const [x, z] of [[352, 86], [388, 54], [370, 92], [342, 112]]) w.lamp(x, z, { y: 3.6, color: 0xffc890, intensity: 1.55, range: 10 });
}

// ==================================================================================== WEST (swamp + NW ruins)
function westPOIs(C) {
  const { w, R, rng } = C;
  // ---------------- Pale Apartments
  C.bld({ x: 250, z: 146, w: 30, d: 14, storeys: 3, wall: 'plaster', tint: 0xd8d4c8, floor: 'wood', roof: 'roofTar', name: 'Pale Apartments A',
    doors: [{ side: 's', at: 4, w: 1.6, door: true }, { side: 's', at: 14, w: 1.6, door: true }, { side: 's', at: 24, w: 1.6, door: true }, { side: 'n', at: 3, w: 2.2, sill: 1 }, { side: 'n', at: 13, w: 2.2, sill: 1 }, { side: 'n', at: 23, w: 2.2, sill: 1 }, { side: 'w', at: 5, w: 2, sill: 1 }],
    inner: [[10, 0, 10, 14, []], [20, 0, 20, 14, []], [0, 7, 10, 7, [{ at: 6, w: 1.6 }]], [10, 7, 20, 7, [{ at: 2, w: 1.6 }]], [20, 7, 30, 7, [{ at: 6, w: 1.6 }]]] });
  for (let u = 0; u < 3; u++) { C.furnish(u === 1 ? 'kitchen' : 'bedroom', 250 + u * 10, 146, 260 + u * 10, 153, { tier: 1 }); C.furnish('living', 250 + u * 10, 153, 260 + u * 10, 160, { tier: u === 2 ? 2 : 1 }); }
  C.bld({ x: 232, z: 176, w: 26, d: 14, storeys: 3, wall: 'plaster', tint: 0xd0ccc0, floor: 'wood', name: 'Pale Apartments B',
    doors: [{ side: 'n', at: 5, w: 1.6, door: true }, { side: 'n', at: 18, w: 1.6, door: true }, { side: 's', at: 4, w: 2.2, sill: 1 }, { side: 's', at: 18, w: 2.2, sill: 1 }, { side: 'e', at: 6, w: 2, sill: 1 }],
    inner: [[13, 0, 13, 14, []], [0, 7, 13, 7, [{ at: 9, w: 1.6 }]], [13, 7, 26, 7, [{ at: 2, w: 1.6 }]]] });
  C.furnish('living', 232, 176, 245, 183, { tier: 1 }); C.furnish('bedroom', 232, 183, 245, 190, { tier: 2 });
  C.furnish('kitchen', 245, 176, 258, 183, { tier: 1 }); C.furnish('bunk', 245, 183, 258, 190, { tier: 1 });
  C.bld({ x: 264, z: 172, w: 14, d: 12, storeys: 2, wall: 'plaster', tint: 0xc8c4b8, floor: 'tiles', name: 'Pale Apartments C',
    doors: [{ side: 'w', at: 4, w: 1.6, door: true }, { side: 's', at: 4, w: 2.2, sill: 1 }], inner: [[0, 6, 14, 6, [{ at: 9, w: 1.6 }]]] });
  C.furnish('commercial', 264, 172, 278, 178, { tier: 1 }); C.furnish('medical', 264, 178, 278, 184, { tier: 1, mul: 0.8 });
  w.prop('car', 240, 168, 1.57, { solid: true }); w.container('car_trunk', 242.5, 168, 1.57, { tier: 1 });
  w.prop('car', 286, 160, 0.2, { solid: true });
  C.clutter(258, 168, 16, 14, ['barrel', 'bush', 'crate', 'debris', 'dg_table'], { avoid: (x, z) => x < 230 || x > 284 });
  C.loot(258, 167, 12, ['trash', 'basket', 'backpack'], 1);
  for (const [x, z] of [[246, 164], [282, 168], [262, 196]]) w.lamp(x, z, { y: 4, color: 0xffc078, intensity: 1.55, range: 11 });
  // ---------------- Ben Welda's Sunroof (house with a glass sunroof + welding garage)
  C.bld({ x: 324, z: 190, w: 20, d: 16, storeys: 2, wall: 'brick', tint: 0xd8c8b0, floor: 'wood', roof: 'metalPanel', roofTint: 0x9ad6e6, peek: 0.55, name: "Ben Welda's Sunroof",
    doors: [{ side: 'w', at: 6, w: 1.8, door: true }, { side: 's', at: 13, w: 1.8, door: true }, { side: 's', at: 4, w: 2.4, sill: 0.9 }, { side: 'n', at: 6, w: 2.4, sill: 0.9 }, { side: 'n', at: 14, w: 2.4, sill: 0.9 }],
    inner: [[10, 0, 10, 16, [{ at: 6, w: 1.6 }]], [10, 8, 20, 8, [{ at: 3, w: 1.6 }]]] });
  C.furnish('living', 324, 190, 334, 206, { tier: 2 }); C.furnish('bedroom', 334, 190, 344, 198, { tier: 2 }); C.furnish('kitchen', 334, 198, 344, 206, { tier: 1 });
  C.bld({ x: 346, z: 194, w: 10, d: 10, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: "Welda's Garage", doors: [{ side: 's', at: 2, w: 3.2 }, { side: 'w', at: 3, w: 1.6 }] });
  C.furnish('workshop', 346, 194, 356, 204, { tier: 2, extra: [['toolbox', 1]] });
  C.hatch('sunroof_hatch', 'Sunroof Hatch', 318, 194);
  w.prop('car', 352, 212, 1.4, { solid: true }); C.clutter(336, 212, 10, 6, ['barrel', 'crate', 'dg_planter', 'bush'], {});
  w.lamp(330, 208, { y: 3.4, color: 0xffc890, intensity: 1.55, range: 9 }); w.lamp(356, 206, { y: 3.4, color: 0xffd8a0, intensity: 1.55, range: 9, flicker: 0.3 });
  // ---------------- Hydroponic Dome Complex
  const dome = (cx, cz, s, kind) => {
    const r = 7.1 * s;
    w.raiseCircle(cx, cz, r + 3, MID + 0.28, 0.35, 'set');
    w.paintCircle('tiles', cx, cz, r - 0.5); w.paintCircle('concrete', cx, cz, r - 3.2);
    w.prop('dg_dome', cx, cz, 0.2, { scale: s });
    C.ring(cx, cz, r - 0.1, 1.0, 'concrete', [PI / 2, 0], 1.4);
    C.addClear(cx, cz, r + 3);
    C.doorPts.push([cx, cz + r], [cx + r, cz]);
    C.inLight(cx, cz, kind === 'archive' ? 0x90c0ff : 0xe0a0ff, 1.2, r + 3, 3.5);
    if (s > 0.8) {
      for (const [dx, dz, rot] of [[-3.2, -2.2, 0], [3.2, -2.2, 0], [-3.2, 2.2, PI], [3.2, 2.2, PI]]) w.prop(kind === 'archive' && dx > 0 ? 'dg_server' : 'dg_hydrorack', cx + dx, cz + dz, rot, { solid: true });
      if (kind === 'archive') { w.prop('dg_console', cx, cz - 4.3, 0, { solid: true }); w.container('electronics', cx + 2, cz + 4.6, PI, { tier: 3 }); w.container('electronics', cx - 4.8, cz, PI / 2, { tier: 2 }); }
      w.container('plant', cx - 1.2, cz + 0.2, 0, { tier: 2 }); w.container('plant', cx + 1.4, cz - 0.4, 0, { tier: 1 }); w.container('basket', cx, cz + 4.8, 0, { tier: 1 });
    } else {
      w.prop('dg_planter', cx, cz - 1.2, 0, { solid: true, scale: 0.8 }); w.container('plant', cx + 1, cz + 1, 0, { tier: 2 });
    }
  };
  dome(497, 206, 1, 'archive');
  dome(535, 200, 1, 'garden');
  dome(470, 290, 0.65, 'garden');
  dome(446, 234, 0.55, 'garden');
  // greenhouse tunnels (arched film houses)
  const tunnel = (a, b) => {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.round(L / 4), rot = Math.atan2(b[0] - a[0], b[1] - a[1]);
    w.ridge([a, b], 7, MID + 0.25, 2, 'set'); w.path([a, b], 6, 'tiles');
    for (let i = 0; i < n; i++) { const t = (i + 0.5) / n; w.prop('dg_arch', lerp(a[0], b[0], t), lerp(a[1], b[1], t), rot, {}); }
    for (let i = 1; i < n; i += 2) { const t = (i + 0.5) / n, x = lerp(a[0], b[0], t), z = lerp(a[1], b[1], t), ox = Math.cos(rot) * 1.8, oz = -Math.sin(rot) * 1.8; w.prop('dg_planter', x + ox, z + oz, rot + PI / 2, { solid: true }); w.prop('dg_planter', x - ox, z - oz, rot + PI / 2, { solid: true }); }
    for (let i = 0; i < 3; i++) { const t = (i + 0.7) / 3.4; w.container(i % 2 ? 'plant' : 'basket', lerp(a[0], b[0], t), lerp(a[1], b[1], t), rot, { tier: 1 }); }
    w.lamp(lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5), { y: 2.8, model: null, color: 0xd8a0ff, intensity: 0.9, range: L * 0.6 });
    C.addClear(lerp(a[0], b[0], 0.5), lerp(a[1], b[1], 0.5), L / 2 + 3);
  };
  tunnel([518, 248], [556, 262]);
  tunnel([469, 252], [469, 280]);
  C.bld({ x: 506, z: 222, w: 18, d: 12, wall: 'metalPanel', tint: 0xd8e0d8, floor: 'tiles', roof: 'metalPanel', roofTint: 0xb0c8c0, name: 'Hydroponics Lab',
    doors: [{ side: 's', at: 4, w: 1.8, door: true }, { side: 'n', at: 12, w: 1.8, door: true }, { side: 'e', at: 4, w: 2.4, sill: 1 }], inner: [[9, 0, 9, 12, [{ at: 5, w: 1.6 }]]] });
  C.furnish('lab', 506, 222, 515, 234, { tier: 2 }); C.furnish('greenhouse', 515, 222, 524, 234, { tier: 2 });
  C.bld({ x: 538, z: 218, w: 10, d: 8, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: 'Seed Store', doors: [{ side: 'w', at: 3, w: 1.8 }] });
  C.furnish('storage', 538, 218, 548, 226, { tier: 1, extra: [['plant', 1]] });
  C.bld({ x: 484, z: 226, w: 10, d: 8, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: 'Irrigation Shed', doors: [{ side: 'e', at: 3, w: 1.8 }] });
  C.furnish('industrial', 484, 226, 494, 234, { tier: 1 });
  w.prop('dg_pump', 488, 237, 0, { solid: true });
  C.fieldDepot(478, 244);
  for (const [x, z] of [[548, 236], [552, 242], [492, 252]]) w.prop('dg_tankS', x, z, 0, { solid: true });
  C.clutter(515, 238, 30, 22, ['dg_planter', 'barrel', 'dg_toxic', 'crate', 'dg_reeds', 'bush'], { avoid: (x, z) => C.clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) });
  C.fenceLine([[480, 194], [520, 190], [552, 190]], [[500, 192]]);
  C.loot(515, 240, 30, ['plant', 'plant', 'basket', 'crate', 'toolbox'], 1, { avoid: (x, z) => C.clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) });
  for (const [x, z] of [[516, 214], [482, 216], [548, 214], [528, 240], [500, 262], [476, 270]]) w.lamp(x, z, { y: 3.8, color: 0xd8ffd0, intensity: 1.55, range: 10 });
  C.addClearRect(478, 190, 556, 246);
  // ---------------- Central Swamp Lift
  w.paint('concrete', 346, 324, 366, 344);
  C.lift('central_swamp_lift', 'Central Swamp Lift', 355, 334);
  C.bld({ x: 360, z: 324, w: 6, d: 5, wall: 'corrugated', roof: 'corrugated', floor: 'wood', name: 'Lift Shack', floorY: MID + 0.45, blend: 0.5, doors: [{ side: 'w', at: 1.5, w: 1.6 }] });
  C.furnish('storage', 360, 324, 366, 329, { tier: 1, light: false });
  for (const [x, z] of [[348, 342], [364, 342]]) w.prop('crate', x, z, 0.3, { solid: true });
  C.loot(355, 334, 8, ['crate', 'ammo_box'], 1);
  w.lamp(347, 326, { y: 4, color: 0xffc078, intensity: 1.55, range: 11 });
  C.addClearRect(344, 322, 368, 346);
  // ---------------- Old Battleground
  w.prop('dg_emptrap', 232, 318, 0, { solid: true });
  for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.4; w.prop('dg_switch', 232 + Math.cos(a) * 6.5, 318 + Math.sin(a) * 6.5, -a + PI / 2, { solid: true }); }
  w.lamp(232, 318, { y: 3, model: null, color: 0x40c0ff, intensity: 1.3, range: 9, flicker: 0.5 });
  C.bld({ x: 194, z: 322, w: 10, d: 8, wall: 'concrete', roof: 'concrete', floor: 'concrete', name: 'Battleground Bunker', tint: 0xa8a498, doors: [{ side: 'e', at: 3, w: 1.8 }, { side: 'n', at: 3, w: 3, sill: 1.3 }] });
  C.furnish('security', 194, 322, 204, 330, { tier: 2 });
  C.bld({ x: 258, z: 292, w: 9, d: 7, wall: 'concrete', roof: 'concrete', floor: 'concrete', name: 'Pillbox', tint: 0xa8a498, doors: [{ side: 's', at: 3, w: 1.8 }, { side: 'w', at: 2, w: 3, sill: 1.3 }] });
  C.furnish('storage', 258, 292, 267, 299, { tier: 2, extra: [['ammo_box', 1]] });
  w.prop('dg_bigwreck', 256, 330, 0.7, { solid: true });                                     // Baron husk (reference ◎)
  w.container('arc_husk', 251, 324, 0, { tier: 3 });
  for (const [x, z, r] of [[214, 306, 0.2], [244, 344, 1.4], [270, 320, 2.3], [206, 340, 3.0]]) w.prop('dg_huskbig', x, z, r, { solid: true });
  C.clutter(238, 322, 40, 30, ['dg_hedgehog', 'dg_hedgehog', 'husk', 'deadTree', 'debris', 'dg_rubble', 'dg_stump'], { sz: 0.8 });
  C.sandbags([[208, 304], [218, 300], [226, 302]]); C.sandbags([[240, 336], [250, 338], [256, 344]]); C.sandbags([[268, 304], [276, 308]]);
  w.path([[200, 300], [214, 296], [226, 306], [238, 302], [250, 290], [262, 300], [278, 296]], 2.2, 'mud');
  C.loot(238, 322, 36, ['arc_husk', 'arc_crate', 'ammo_box', 'arc_crate', 'weapon_case', 'crate', 'arc_husk', 'raider_cache', 'backpack'], 2);
  C.addClear(238, 322, 30);
  // ---------------- Water Treatment Control (+ surveillance key room)
  C.bld({ x: 366, z: 414, w: 32, d: 44, storeys: 2, floorY: MID + 0.35, blend: 2, name: 'Water Treatment Control', wall: 'concrete', tint: 0xd0d4cc, floor: 'tiles', roof: 'corrugated', roofTint: 0xb8c0b8,
    doors: [{ side: 'e', at: 30, w: 2.4, door: true }, { side: 's', at: 22, w: 2, door: true }, { side: 'n', at: 14, w: 3 }, { side: 'e', at: 8, w: 3, sill: 1.1 }, { side: 'w', at: 10, w: 3, sill: 1.1 }, { side: 'w', at: 28, w: 3, sill: 1.1 }, { side: 'e', at: 18, w: 3, sill: 1.1 }],
    inner: [[0, 20, 32, 20, [{ at: 14, w: 2.4 }]], [0, 32, 32, 32, [{ at: 6, w: 1.8, door: true, locked: 'surveillance' }, { at: 24, w: 1.8 }]], [16, 32, 16, 44, []]] });
  for (const [x, z] of [[372, 420], [380, 420], [388, 420]]) w.prop('dg_pump', x, z, PI / 2, { solid: true });
  w.prop('dg_valve', 394, 427, 0, { solid: true }); w.prop('dg_bigpipe', 382, 431.5, 0, { solid: true, scale: 0.6 });
  w.container('toolbox', 370, 432, 0, { tier: 2 }); w.container('crate', 396, 416, 0, { tier: 1 }); w.container('locker', 368, 426, PI / 2, { tier: 1 });
  C.inLight(374, 424, 0xd0e0ff, 1.0, 10); C.inLight(390, 424, 0xd0e0ff, 1.0, 10);
  C.furnish('control', 366, 434, 398, 446, { tier: 2 });
  C.furnish('security', 366, 446, 382, 458, { tier: 3, room: 'surveillance', extra: [['electronics', 1], ['security_locker', 1]] });
  w.prop('dg_server', 370, 447, 0, { solid: true });
  w.keyRoom('surveillance', 366, 446, 382, 458, null, { name: 'Surveillance Room' });
  C.furnish('office', 382, 446, 398, 458, { tier: 2 });
  // intake below WTC
  w.prop('dg_bigpipe', 381, 404, PI / 2, { solid: true }); w.prop('dg_spillgrate', 381, 398, 0, {}); w.prop('dg_pump', 390, 408, 0, { solid: true });
  w.lamp(384, 402, { y: 3, model: null, color: 0xffd090, intensity: 0.9, range: 8, flicker: 0.4 });
  // plaza: settling basins, elevator
  w.paint('concrete', 400, 428, 470, 502);
  for (const [x0, z0, x1, z1] of [[404, 436, 430, 454], [404, 462, 430, 480]]) {
    w.raiseRect(x0 + 1, z0 + 1, x1 - 1, z1 - 1, MID - 1.3, 0, 'set');
    w.water(x0 + 1, z0 + 1, x1 - 1, z1 - 1, { level: MID - 0.4, material: C.swampMat });
    for (const [a, b, c, d] of [[x0, z0, x1, z0 + 1], [x0, z1 - 1, x1, z1], [x0, z0, x0 + 1, z1], [x1 - 1, z0, x1, z1]]) w.block(a, b, c, d, 0.9, 'concrete', { y0: MID + 0.2 });
    w.prop('dg_gantry', (x0 + x1) / 2, (z0 + z1) / 2, 0, { scale: 0.8 });
  }
  C.lift('water_treatment_elevator', 'Water Treatment Elevator', 440, 484);
  C.clutter(445, 470, 22, 14, ['barrelBlue', 'crate', 'dg_container', 'pipe', 'dg_barrier', 'dg_toxic'], { avoid: (x, z) => x < 434 || (x > 438 && z < 456 && x < 472) });
  C.loot(448, 470, 18, ['crate', 'toolbox', 'trash', 'ammo_box'], 1, { avoid: (x, z) => x < 434 });
  for (const [x, z] of [[402, 432], [434, 430], [466, 466], [402, 500], [436, 500], [362, 412], [400, 462]]) w.lamp(x, z, { y: 4, color: 0xffd8a0, intensity: 1.55, range: 12 });
  // clarifier (circular settling tank)
  w.raiseCircle(493, 522, 15, MID - 1.4, 0.15, 'set');
  w.waterPoly(Array.from({ length: 20 }, (_, i) => [493 + Math.cos(i / 20 * 2 * PI) * 15.5, 522 + Math.sin(i / 20 * 2 * PI) * 15.5]), { level: MID - 0.45, material: C.swampMat });
  C.ring(493, 522, 16.2, 1.0, 'concrete', [], 1.6);
  w.block(476, 521, 510, 523, 0.5, 'metalPanel', { y0: MID + 0.4, collide: false });     // rotating bridge
  w.prop('dg_ventbox', 493, 522, 0, { y: 0.9 });
  C.addClear(493, 522, 19);
  // ---------------- Primary Facility (on the dam platform)
  C.bld({ x: 476, z: 430, w: 56, d: 26, storeys: 3, floorY: HIGH, blend: 0.5, name: 'Primary Facility', wall: 'concrete', tint: 0xd8d2c4, floor: 'metalPanel',
    doors: [{ side: 's', at: 8, w: 3.2 }, { side: 's', at: 44, w: 3.2 }, { side: 'w', at: 10, w: 2.4, door: true }, { side: 'e', at: 10, w: 2.4, door: true }, { side: 'n', at: 30, w: 2, door: true },
      { side: 'n', at: 12, w: 3, sill: 1.1 }, { side: 'n', at: 44, w: 3, sill: 1.1 }, { side: 's', at: 20, w: 3, sill: 1.1 }, { side: 's', at: 32, w: 3, sill: 1.1 }],
    inner: [[18, 0, 18, 26, [{ at: 11, w: 2.4 }]], [40, 0, 40, 26, [{ at: 11, w: 2.4 }]], [0, 13, 18, 13, [{ at: 7, w: 1.8 }]]],
    roofExtras: [[22, 6, 36, 12, 1.8], [42, 16, 50, 22, 1.0]] });
  C.furnish('office', 476, 430, 494, 443, { tier: 2 }); C.furnish('workshop', 476, 443, 494, 456, { tier: 2 });
  w.prop('dg_turbine', 505, 441, 0, { solid: true }); w.prop('dg_console', 505, 452.5, PI, { solid: true }); w.prop('dg_generator', 505, 434, 0, { solid: true, scale: 0.7 });
  w.container('toolbox', 498, 450, 0, { tier: 2 }); w.container('electronics', 512, 451, 0, { tier: 2 }); w.container('crate', 497, 433, 0, { tier: 1 });
  C.inLight(500, 443, 0xffd090, 1.1, 11, 3.6); C.inLight(511, 443, 0xffd090, 1.1, 11, 3.6);
  C.furnish('industrial', 516, 430, 532, 456, { tier: 2, extra: [['crate', 1]] });
  C.bld({ x: 500, z: 464, w: 32, d: 18, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Primary Facility Annex', tint: 0xe0d8c8, floor: 'tiles',
    doors: [{ side: 'n', at: 6, w: 2, door: true }, { side: 'w', at: 8, w: 2, door: true }, { side: 's', at: 24, w: 2, door: true }, { side: 'e', at: 6, w: 3, sill: 1.1 }, { side: 's', at: 8, w: 3, sill: 1.1 }],
    inner: [[16, 0, 16, 18, [{ at: 4, w: 1.8 }]], [16, 9, 32, 9, [{ at: 6, w: 1.6 }]]] });
  C.furnish('office', 500, 464, 516, 482, { tier: 2 }); C.furnish('medical', 516, 464, 532, 473, { tier: 2 }); C.furnish('storage', 516, 473, 532, 482, { tier: 1 });
  C.fieldDepot(508, 492);
  C.clutter(540, 470, 18, 12, ['crate', 'barrel', 'dg_container', 'dg_scaffold', 'pipe', 'dg_barrier'], { avoid: (x, z) => !C.inDam(x, z, -2) });
  for (const [x, z] of [[472, 426], [534, 426], [472, 462], [540, 490], [490, 498]]) C.flood(x, z);
  C.beacon(471, 499); C.beacon(555, 425);
  // ---------------- Control Tower + Research & Administration
  C.bld({ x: 584, z: 458, w: 32, d: 26, storeys: 4, floorY: HIGH, blend: 0.5, name: 'Control Tower', tint: 0xe4dccc, floor: 'tiles',
    doors: [{ side: 's', at: 14, w: 2.4, door: true }, { side: 'w', at: 16, w: 1.8, door: true }, { side: 'e', at: 16, w: 1.8, door: true }, { side: 'n', at: 8, w: 4, sill: 1.0 }, { side: 'n', at: 20, w: 4, sill: 1.0 }, { side: 's', at: 4, w: 3, sill: 1.1 }, { side: 's', at: 24, w: 3, sill: 1.1 }],
    inner: [[0, 11, 32, 11, [{ at: 13, w: 2.4, door: true, locked: 'control_tower' }]], [10, 11, 10, 26, [{ at: 6, w: 1.8 }]], [22, 11, 22, 26, [{ at: 6, w: 1.8 }]]],
    roofExtras: [[4, 2, 12, 8, 2.0], [24, 14, 30, 22, 1.2]] });
  C.furnish('control', 584, 458, 616, 469, { tier: 3, room: 'control_tower', extra: [['security_locker', 1], ['weapon_case', 1], ['electronics', 1]], li: 1.2 });
  w.keyRoom('control_tower', 584, 458, 616, 469, null, { name: 'Control Tower Control Room' });
  C.furnish('security', 584, 469, 594, 484, { tier: 2 }); C.furnish('office', 594, 469, 606, 484, { tier: 1, mul: 0.7 }); C.furnish('storage', 606, 469, 616, 484, { tier: 1 });
  w.block(620, 458, 630, 468, 20, 'concrete', { y0: HIGH });                                // the tower shaft
  w.prop('dg_ctrltop', 625, 463, 0, { yAbs: HIGH + 20 });
  w.lamp(625, 469, { y: 21.5, model: null, color: 0x9ae8ff, intensity: 1.6, range: 13 });
  C.bld({ x: 558, z: 496, w: 44, d: 40, storeys: 2, floorY: HIGH, blend: 0.5, name: 'Research & Administration', tint: 0xe8e0d0, floor: 'tiles', roofTint: 0xd0d0c8,
    doors: [{ side: 's', at: 20, w: 2.4, door: true }, { side: 'n', at: 20, w: 2.4, door: true }, { side: 'w', at: 18, w: 1.8, door: true }, { side: 'e', at: 18, w: 1.8, door: true },
      { side: 's', at: 6, w: 3, sill: 1.1 }, { side: 's', at: 34, w: 3, sill: 1.1 }, { side: 'e', at: 6, w: 3, sill: 1.1 }, { side: 'w', at: 6, w: 3, sill: 1.1 }, { side: 'n', at: 6, w: 3, sill: 1.1 }, { side: 'n', at: 34, w: 3, sill: 1.1 }],
    inner: [[0, 14, 44, 14, [{ at: 6, w: 1.8 }, { at: 21, w: 1.8 }, { at: 36, w: 1.8 }]], [14, 0, 14, 14, []], [30, 0, 30, 14, []],
      [0, 26, 44, 26, [{ at: 6, w: 1.8, door: true, locked: 'staff_room' }, { at: 21, w: 2.4 }, { at: 36, w: 1.8 }]], [16, 26, 16, 40, []], [28, 26, 28, 40, []]],
    roofExtras: [[6, 4, 14, 10, 1.4], [30, 28, 38, 36, 1.4]] });
  C.furnish('lab', 558, 496, 572, 510, { tier: 2 });                     // Lab 2
  C.furnish('server', 572, 496, 588, 510, { tier: 2 });
  C.furnish('lab', 588, 496, 602, 510, { tier: 2, extra: [['electronics', 1]] });  // Lab 1
  C.furnish('commercial', 558, 510, 602, 522, { tier: 1 });
  w.prop('dg_noticeboard', 580, 510.8, 0, { solid: true });
  C.furnish('bunk', 558, 522, 574, 536, { tier: 3, room: 'staff_room', extra: [['security_locker', 1], ['weapon_case', 1], ['medical_bag', 1]] });
  w.keyRoom('staff_room', 558, 522, 574, 536, null, { name: 'Staff Room' });
  C.furnish('office', 574, 522, 586, 536, { tier: 1 });                  // reception
  C.furnish('office', 586, 522, 602, 536, { tier: 2 });
  w.prop('dg_sign', 580, 540.5, PI, { solid: true });
  w.prop('dg_satdish', 612, 532, 2.4, { solid: true }); w.prop('dg_satdish', 612, 524, 2.0, { solid: true, scale: 0.7 });
  w.prop('dg_barrier', 600, 452, 0, { solid: true }); w.prop('dg_barrier', 572, 454, 0, { solid: true });
  C.clutter(625, 520, 14, 8, ['crate', 'barrel', 'dg_barrier', 'dg_container'], { avoid: (x, z) => !C.inDam(x, z, -2) });
  for (const [x, z] of [[556, 456], [636, 456], [556, 544], [604, 544], [636, 500], [636, 540], [580, 490]]) C.flood(x, z);
  for (const [x, z] of [[553, 547], [639, 453], [639, 547]]) C.beacon(x, z);
  // ---------------- South Swamp Outpost
  w.prop('dg_radar', 213, 465, 0, { solid: true });
  for (const [x, z, bw, bd, nm] of [[220, 470, 10, 8, 'Outpost Hut'], [198, 476, 8, 7, 'Outpost Store'], [224, 450, 9, 7, 'Outpost Radio']]) {
    C.bld({ x, z, w: bw, d: bd, wall: 'corrugated', roof: 'corrugated', floor: 'wood', roofTint: 0xa89070, name: nm, floorY: MID + 0.45, blend: 1, doors: [{ side: 'w', at: 2, w: 1.8 }, { side: 's', at: 3, w: 2.2, sill: 1 }] });
  }
  C.furnish('raider', 220, 470, 230, 478, { tier: 2 }); C.furnish('storage', 198, 476, 206, 483, { tier: 1 }); C.furnish('control', 224, 450, 233, 457, { tier: 2 });
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
  w.prop('dg_bigwreck', 325, 474, 2.3, { solid: true }); w.container('arc_husk', 318, 468, 0, { tier: 2 }); w.container('arc_crate', 332, 480, 0, { tier: 2 });
  C.addClear(325, 474, 12);
  // ---------------- swamp field depot + scattered swamp caches
  w.raiseRect(283, 409, 293, 419, MID + 0.45, 1.5, 'set');
  C.fieldDepot(288, 414);
  C.addClear(288, 414, 7);
  C.powerLine([[150, 340], [190, 400], [240, 466], [290, 534], [322, 566], [344, 582]], { scale: 1 });
}

// ==================================================================================== SOUTH
function southPOIs(C) {
  const { w, R, rng } = C;
  // ---------------- Electrical Substation
  C.fenceRect(352, 572, 394, 604, [[352, 588], [373, 572]]);
  w.paint('gravel', 352, 572, 394, 604);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const x = 360 + i * 13, z = 580 + j * 15;
    w.prop('dg_transformer', x, z, 0, { solid: true });
    if ((i + j) % 2 === 0) w.prop('dg_pylon', x + 5, z + 3, PI / 2, { solid: true, scale: 0.45 });
  }
  w.prop('dg_fusebox', 354, 599, PI / 2, { solid: true });
  w.container('electronics', 391, 600, 0, { tier: 2 }); w.container('electronics', 356, 575, 0, { tier: 2 }); w.container('toolbox', 380, 602, 0, { tier: 1 });
  for (const [x, z] of [[352, 572], [394, 604], [394, 572]]) C.flood(x, z, { color: 0xd8e8ff });
  C.bld({ x: 398, z: 546, w: 18, d: 16, storeys: 2, name: 'Substation Control', tint: 0xd0ccc0, floor: 'tiles', floorY: MID + 0.2, blend: 2,
    doors: [{ side: 'w', at: 10, w: 2, door: true }, { side: 's', at: 12, w: 2.4, door: true }, { side: 'n', at: 6, w: 3, sill: 1.1 }, { side: 'e', at: 6, w: 3, sill: 1.1 }],
    inner: [[9, 0, 9, 16, [{ at: 10, w: 1.8 }]], [9, 8, 18, 8, [{ at: 4, w: 1.6 }]]] });
  C.furnish('control', 398, 546, 407, 562, { tier: 2 }); C.furnish('server', 407, 546, 416, 554, { tier: 2 }); C.furnish('workshop', 407, 554, 416, 562, { tier: 1 });
  C.bld({ x: 380, z: 554, w: 8, d: 7, wall: 'brick', roof: 'corrugated', name: 'Switch Hut', floor: 'concrete', floorY: MID + 0.2, blend: 1.5, doors: [{ side: 's', at: 3, w: 1.6, door: true }] });
  C.furnish('storage', 380, 554, 388, 561, { tier: 1 });
  C.clutter(390, 560, 16, 8, ['barrel', 'crate', 'dg_barrier', 'debris'], { avoid: (x, z) => x > 350 && x < 396 && z > 570 });
  w.prop('dg_truck', 340, 612, 1.75, { solid: true }); w.container('car_trunk', 336.2, 611.4, 1.75, { tier: 1 }); w.container('toolbox', 344, 616, 0, { tier: 1 });
  // ---------------- Water Towers + football pitch
  for (const [x, z] of [[283, 626], [301, 624], [320, 645], [284, 656]]) { w.prop('dg_watertower', x, z, R(0, 6.28), { solid: true }); C.addClear(x, z, 5); }
  C.bld({ x: 298, z: 638, w: 8, d: 8, wall: 'brick', roof: 'corrugated', floor: 'concrete', name: 'Water Tower Pump Hut', doors: [{ side: 's', at: 3, w: 1.6, door: true }] });
  C.furnish('industrial', 298, 638, 306, 646, { tier: 1 });
  w.paint('grass', 238, 596, 276, 618); w.path([[257, 596], [257, 618]], 0.5, 'sand'); w.path([[238.5, 596], [238.5, 618]], 0.5, 'sand'); w.path([[275.5, 596], [275.5, 618]], 0.5, 'sand');
  w.prop('dg_goal', 240.5, 607, PI / 2, { solid: true }); w.prop('dg_goal', 273.5, 607, -PI / 2, { solid: true });
  C.addClearRect(236, 594, 278, 620);
  C.clutter(300, 640, 30, 14, ['barrel', 'crate', 'debris', 'rock'], { avoid: (x, z) => C.clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) });
  C.loot(300, 640, 28, ['crate', 'trash', 'toolbox', 'backpack'], 1, { avoid: (x, z) => C.clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) });
  w.prop('dg_huskbig', 347, 681, 0.9, { solid: true }); w.container('arc_husk', 344, 678, 0, { tier: 2 });   // Baron husk
  for (const [x, z] of [[292, 612], [312, 660], [262, 620]]) w.lamp(x, z, { y: 4, color: 0xffc078, intensity: 1.55, range: 11 });
  // the old dirt-bike circuit west of the Water Towers
  w.path([[178, 628], [186, 618], [198, 622], [204, 634], [214, 628], [226, 624], [232, 636], [222, 648], [210, 646], [204, 660], [192, 664], [182, 654], [190, 642], [180, 636], [178, 628]], 2.6, 'dirt');
  w.path([[204, 660], [214, 676], [226, 690], [222, 704], [208, 708], [200, 696], [206, 684]], 2.6, 'dirt');
  for (const [x, z, r] of [[196, 630, 0.4], [216, 642, 1.2], [188, 660, 2.0]]) w.prop('dg_barrier', x, z, r, { solid: true });
  w.prop('dg_tent', 240, 650, 1.2, { solid: true }); w.prop('dg_flagpole', 236, 644, 0, { solid: true }); C.loot(236, 652, 6, ['backpack', 'crate', 'toolbox'], 1);
  // ruined blocks between the Primary Facility and the substation (foundations + shells)
  for (const [x, z, bw, bd, nm] of [[452, 552, 14, 10, 'Ruined Workshop'], [492, 566, 12, 9, 'Ruined Garage'], [426, 520, 10, 8, 'Guard Post']]) {
    C.bld({ x, z, w: bw, d: bd, wall: 'concrete', tint: 0xb0aaa0, roof: 'corrugated', floor: 'concrete', name: nm, blend: 2,
      doors: [{ side: 's', at: 2, w: 2.2 }, { side: 'n', at: bw - 4, w: 2.2 }, { side: 'e', at: 2, w: 2.4, sill: 1.1 }] });
    C.furnish(nm === 'Guard Post' ? 'security' : 'workshop', x, z, x + bw, z + bd, { tier: 1 });
  }
  C.clutter(470, 560, 26, 14, ['dg_rubble', 'debris', 'barrel', 'crate', 'dg_container', 'car'], {});

  // ---------------- Good Ol' Barron's Hatch (pump station)
  C.bld({ x: 234, z: 538, w: 14, d: 10, storeys: 2, name: "Barron's Pump Station", wall: 'brick', tint: 0xc8b8a8, floor: 'concrete', floorY: MID + 0.2, blend: 1.5,
    doors: [{ side: 's', at: 5, w: 2, door: true }, { side: 'e', at: 3, w: 2.4, sill: 1.1 }], inner: [[7, 0, 7, 10, [{ at: 6, w: 1.6 }]]] });
  C.furnish('industrial', 234, 538, 241, 548, { tier: 1 }); C.furnish('office', 241, 538, 248, 548, { tier: 1 });
  w.prop('dg_tankS', 255, 542, 0, { solid: true }); w.prop('dg_pump', 228, 546, PI / 2, { solid: true });
  C.fenceLine([[226, 551], [226, 534], [262, 534], [262, 551]]);
  C.hatch('good_ol_barrons_hatch', "Good Ol' Barron's Hatch", 267, 574, { aliases: ['good_old_barons_hatch'] });
  w.lamp(250, 552, { y: 4, color: 0xffc078, intensity: 1.55, range: 11 });
  // ---------------- Small Creek (fishing shack + the barrel truck)
  C.bld({ x: 556, z: 584, w: 6, d: 6, wall: 'wood', roof: 'corrugated', floor: 'wood', name: 'Fishing Shack', doors: [{ side: 's', at: 2, w: 1.6 }] });
  C.furnish('storage', 556, 584, 562, 590, { tier: 1, light: false });
  w.prop('dg_truck', 580, 624, 0.45, { solid: true }); w.container('car_trunk', 578.4, 627.5, 0.45, { tier: 2 });
  for (let i = 0; i < 7; i++) w.prop('dg_toxic', 586 + R(-4, 4), 628 + R(-3, 4), R(0, 6), { solid: true });
  w.lamp(583, 620, { y: 1.0, model: null, color: 0x90ff40, intensity: 0.8, range: 6, flicker: 0.3 });
  w.deck([[598, 618], [604, 640]], 2.6, MID + 0.35, 'wood', { rails: false, pillars: false });
  w.deck([[688, 676], [690, 698]], 2.6, MID + 0.35, 'wood', { rails: false, pillars: false });
  C.loot(570, 610, 20, ['crate', 'plant', 'basket', 'trash'], 1);
  // ---------------- Testing Annex (+ Red Lakes Balcony Lift)
  C.bld({ x: 708, z: 606, w: 44, d: 40, storeys: 2, name: 'Testing Annex', wall: 'concrete', tint: 0xece8e0, floor: 'tiles', roofTint: 0xd8d8d0, floorY: MID + 0.3, blend: 2,
    doors: [{ side: 'n', at: 24, w: 2.4, door: true }, { side: 's', at: 18, w: 2.4, door: true }, { side: 'w', at: 26, w: 1.8, door: true }, { side: 'e', at: 10, w: 1.8, door: true },
      { side: 'n', at: 6, w: 3, sill: 1.1 }, { side: 'n', at: 16, w: 3, sill: 1.1 }, { side: 's', at: 6, w: 3, sill: 1.1 }, { side: 's', at: 34, w: 3, sill: 1.1 }, { side: 'e', at: 26, w: 3, sill: 1.1 }],
    inner: [[14, 0, 14, 40, [{ at: 9, w: 1.8 }, { at: 29, w: 1.8 }]], [0, 20, 14, 20, [{ at: 6, w: 1.8 }]], [14, 26, 32, 26, [{ at: 8, w: 2.4 }]],
      [32, 0, 32, 40, [{ at: 6, w: 1.8 }, { at: 24, w: 1.8, door: true, locked: 'testing_annex' }]], [32, 14, 44, 14, []]],
    roofExtras: [[18, 6, 28, 16, 2.2], [36, 30, 42, 36, 1.0]] });
  C.furnish('medical', 708, 606, 722, 626, { tier: 2, extra: [['medical_bag', 1]] });
  C.furnish('commercial', 708, 626, 722, 646, { tier: 1, extra: [['cabinet', 1]] });
  w.prop('dg_testrig', 731, 618, 0, {}); w.paintCircle('metalPanel', 731, 618, 6.5);
  w.container('electronics', 724, 609, PI / 2, { tier: 2 }); w.container('arc_crate', 738, 628, 0, { tier: 2 });
  C.inLight(731, 618, 0x70e8ff, 1.4, 12, 3.6);
  C.furnish('office', 722, 632, 740, 646, { tier: 1 });
  C.furnish('office', 740, 606, 752, 620, { tier: 2 });
  C.furnish('lab', 740, 620, 752, 646, { tier: 3, room: 'testing_annex', extra: [['medical_bag', 1], ['weapon_case', 1], ['electronics', 1]] });
  w.keyRoom('testing_annex', 740, 620, 752, 646, null, { name: 'Testing Annex Secure Lab' });
  C.bld({ x: 736, z: 650, w: 16, d: 12, name: 'Annex Storage', wall: 'corrugated', roof: 'corrugated', floor: 'concrete', floorY: MID + 0.3, blend: 1.5, doors: [{ side: 'w', at: 4, w: 2.4 }, { side: 'n', at: 10, w: 1.8, door: true }] });
  C.furnish('storage', 736, 650, 752, 662, { tier: 1, extra: [['crate', 1]] });
  C.lift('red_lakes_balcony_lift', 'Red Lakes Balcony Lift', 744, 594);
  for (const [x, z, r] of [[716, 656, 0.1], [724, 657, 3.0], [704, 640, 1.5]]) w.prop('car', x, z, r, { solid: true });
  C.clutter(730, 600, 26, 12, ['dg_barrier', 'crate', 'barrel', 'dg_container'], { avoid: (x, z) => z > 604 && z < 664 && x > 704 && x < 756 });
  for (const [x, z] of [[706, 604], [754, 604], [706, 648], [754, 664], [730, 666], [760, 630]]) w.lamp(x, z, { y: 4, color: 0xe8f0ff, intensity: 1.55, range: 12 });
  C.addClearRect(700, 590, 762, 668);
  C.fieldDepot(682, 548);
  // ---------------- Electrical Tower
  C.bld({ x: 838, z: 624, w: 14, d: 12, wall: 'brick', tint: 0xb8a898, roof: 'corrugated', floor: 'concrete', name: 'Electrical Tower Station', floorY: MID + 0.2, blend: 1.5,
    doors: [{ side: 'w', at: 4, w: 1.8, door: true }, { side: 's', at: 8, w: 3, sill: 1.1 }], inner: [[7, 0, 7, 12, [{ at: 4, w: 1.6 }]]] });
  C.furnish('industrial', 838, 624, 845, 636, { tier: 1 }); C.furnish('server', 845, 624, 852, 636, { tier: 2 });
  w.prop('dg_pylon', 864, 617, 0.4, { solid: true, scale: 1.25 });
  for (const [x, z] of [[860, 632], [868, 640]]) w.prop('dg_transformer', x, z, 0, { solid: true });
  C.fenceRect(855, 608, 874, 648, [[855, 642]]);
  C.loot(846, 630, 14, ['electronics', 'toolbox', 'crate'], 1);
  w.lamp(834, 622, { y: 4, color: 0xffc078, intensity: 1.55, range: 11 });
  C.powerLine([[880, 606], [920, 596], [960, 590], [1020, 560], [1080, 520]], { scale: 1 });
  // ---------------- Scrap Yard (+ the graves: hallowed ground)
  C.bld({ x: 488, z: 682, w: 10, d: 8, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: 'Scrap Office', floorY: MID + 0.3, blend: 1.5, doors: [{ side: 's', at: 3, w: 1.8, door: true }, { side: 'e', at: 3, w: 2, sill: 1 }] });
  C.furnish('office', 488, 682, 498, 690, { tier: 1 });
  C.bld({ x: 506, z: 700, w: 8, d: 6, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: 'Scrap Shed', floorY: MID + 0.3, blend: 1.5, doors: [{ side: 'n', at: 2, w: 2.4 }] });
  C.furnish('workshop', 506, 700, 514, 706, { tier: 1 });
  w.prop('dg_crane', 528, 688, PI, { solid: true });
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
  for (const [x, z, bw, bd, nm] of [[510, 786, 12, 9, 'Outpost Barracks'], [528, 800, 10, 8, 'Outpost Armory'], [540, 784, 8, 6, 'Outpost Radio']]) {
    C.bld({ x, z, w: bw, d: bd, wall: 'wood', roof: 'corrugated', floor: 'wood', roofTint: 0x9a8a6a, name: nm, blend: 1.5, doors: [{ side: 's', at: 2, w: 1.8, door: true }, { side: 'e', at: 2, w: 2.2, sill: 1 }] });
  }
  C.furnish('bunk', 510, 786, 522, 795, { tier: 1 }); C.furnish('security', 528, 800, 538, 808, { tier: 2 }); C.furnish('control', 540, 784, 548, 790, { tier: 2 });
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
  // ---------------- Pump House (+ hatch)
  C.bld({ x: 892, z: 290, w: 22, d: 14, storeys: 2, name: 'Pump House', wall: 'brick', tint: 0xc0b0a0, floor: 'concrete', roof: 'corrugated', floorY: LOW + 0.7, blend: 1.5,
    doors: [{ side: 'w', at: 8, w: 2.4, door: true }, { side: 's', at: 16, w: 2, door: true }, { side: 'n', at: 4, w: 3, sill: 1.1 }],
    inner: [[13, 0, 13, 14, [{ at: 9, w: 1.8 }]]] });
  for (const [x, z] of [[897, 294], [904, 294]]) w.prop('dg_pump', x, z, 0, { solid: true });
  w.container('toolbox', 896, 302, 0, { tier: 2 }); w.container('crate', 909, 302, 0, { tier: 1 });
  C.inLight(899, 297, 0xffd090, 1.0, 9);
  C.furnish('office', 905, 290, 914, 304, { tier: 1 });
  C.hatch('pump_house_hatch', 'Pump House Hatch', 884, 302);
  w.prop('dg_bigpipe', 872, 296, 0, { solid: true }); w.prop('dg_bigpipe', 862, 296, 0, { solid: true });
  w.lamp(888, 292, { y: 4, color: 0xffc078, intensity: 1.55, range: 11 });
  // ---------------- Spillway Hatch (leaking hydraulic pipes)
  w.paint('concrete', 756, 474, 774, 490);
  C.hatch('spillway_hatch', 'Spillway Hatch', 765, 482);
  w.prop('dg_bigpipe', 760, 476, 0.2, { solid: true }); w.prop('dg_valve', 771, 476, 0, { solid: true }); w.prop('pipe', 770, 488, 1.3, { solid: true });
  for (const [x, z] of [[757, 487], [773, 484]]) w.prop('dg_toxic', x, z, 0, { solid: true });
  w.waterPoly([[758, 478], [764, 477], [766, 480], [759, 481]], { level: LOW + 0.55, material: C.darkMat });
  C.loot(765, 482, 8, ['toolbox', 'crate'], 1);
  // ---------------- basin: Red Lakes shores, wrecks, the queen husk site
  w.prop('dg_bigwreck', 862, 368, 2.2, { solid: true }); w.container('arc_husk', 856, 374, 0, { tier: 2 });
  w.prop('dg_truck', 752, 372, 0.1, { solid: true }); w.container('car_trunk', 752, 376, 0.1, { tier: 1 });
  for (const [x, z, r] of [[720, 330, 0.4], [820, 330, 2.1], [700, 470, 1.0], [850, 560, 0.2], [780, 520, 2.6], [900, 450, 1.5]]) w.prop('husk', x, z, r, { solid: true });
  C.loot(800, 430, 110, ['arc_husk', 'arc_crate', 'crate', 'arc_husk', 'trash', 'ammo_box', 'arc_crate', 'toolbox'], 1, { avoid: (x, z) => !C.basinAt(x, z) || w.groundAt(x, z) < -0.2 });
  for (const [x, z] of [[700, 330], [770, 400], [840, 466], [760, 510], [880, 380], [826, 300]]) w.lamp(x, z, { y: 4.4, color: 0xffb070, intensity: 1.55, range: 12, flicker: 0.5 });
  // ---------------- east hills: farm ruins, power line
  C.bld({ x: 1000, z: 560, w: 12, d: 9, wall: 'brick', tint: 0xb0a090, roof: 'roofTile', roofShape: 'gable', floor: 'wood', name: 'Hill Farmhouse', blend: 2, doors: [{ side: 's', at: 4, w: 1.8, door: true }, { side: 'w', at: 3, w: 2, sill: 1 }] });
  C.furnish('living', 1000, 560, 1012, 569, { tier: 1 });
  C.bld({ x: 1016, z: 566, w: 8, d: 8, wall: 'wood', roof: 'corrugated', floor: 'wood', name: 'Hill Barn', blend: 2, doors: [{ side: 'w', at: 2, w: 2.4 }] });
  C.furnish('storage', 1016, 566, 1024, 574, { tier: 1, light: false });
  w.lamp(1006, 572, { y: 3.4, color: 0xffb070, intensity: 1.55, range: 9, flicker: 0.4 });
  C.powerLine([[1000, 130], [1018, 230], [1040, 330], [1056, 420], [1070, 500]], { scale: 1 });
  C.bld({ x: 960, z: 180, w: 10, d: 8, wall: 'concrete', roof: 'concrete', floor: 'concrete', name: 'Ridge Bunker', blend: 2, tint: 0xa8a498, doors: [{ side: 's', at: 3, w: 1.8 }] });
  C.furnish('security', 960, 180, 970, 188, { tier: 2 });
}

// ==================================================================================== ROADSIDE + OUTSKIRTS
function roadsideAndOutskirts(C) {
  const { w, R, rng } = C;
  // general clutter over every dam / plateau surface (kept off buildings, doors, roads, chutes)
  {
    const crest = (x, z) => C.inDam(x, z, -2.5) && !C.inBuilding(x, z, 2.5) && !C.nearRoad(x, z, 0.5) &&
      C.distLine(x, z, [[548, 452], [578, 420], [596, 392], [612, 360], [626, 330]]) > 4 && C.distLine(x, z, [[680, 288], [690, 262], [700, 236], [722, 200], [742, 176], [728, 150], [706, 140]]) > 4 &&
      !CHUTES.some(([xf, zc]) => Math.abs(z - zc) < 6 && x > xf - 12) && C.distLine(x, z, HIGHWAY) > 6 &&
      !(x > 700 && x < 724 && z > 188 && z < 214) && !(x > 728 && x < 756 && z > 208 && z < 238);
    const kinds = ['dg_container', 'dg_containerB', 'dg_containerG', 'dg_barrier', 'dg_barrier', 'crate', 'crate', 'barrel', 'barrelBlue', 'dg_ventbox', 'dg_transformer', 'pipe', 'dg_bigpipe', 'sandbag', 'car', 'dg_truck', 'dg_rubble', 'dg_scaffold', 'dg_tankS'];
    for (const [cx, cz, r, n] of [[600, 520, 34, 26], [596, 476, 22, 10], [508, 480, 30, 14], [620, 380, 40, 18], [680, 230, 34, 12], [740, 230, 30, 10], [700, 150, 40, 14], [800, 200, 40, 14], [760, 560, 50, 10], [860, 210, 24, 8]]) {
      C.clutter(cx, cz, r, n, kinds, { avoid: (x, z) => !crest(x, z) });
      C.clutter(cx, cz, r, Math.round(n * 0.8), ['debris', 'debris', 'dg_grass'], { avoid: (x, z) => !crest(x, z) });
      C.loot(cx, cz, r, ['crate', 'trash', 'toolbox', 'ammo_box', 'crate', 'locker'].slice(0, 2 + (n > 12 ? 4 : 2)), 1, { avoid: (x, z) => !crest(x, z) });
    }
  }
  // street lamps along the asphalt roads
  for (const r of ROADS) C.street(r, 34, 5.2, { notDam: true });
  C.street(TRACKS[0], 40, 3.5, { color: 0xffb070, i: 1.0 });
  C.street(TRACKS[2], 44, 3.5, { color: 0xffb070, i: 1.0 });
  C.street(HIGHWAY, 30, 5.5, { color: 0xe0ecff, model: 'dg_floodlight', i: 1.4, range: 14 });
  // abandoned vehicles + barricades along roads
  const cars = [[448, 20, 0.05], [436, 90, 0.5], [372, 138, 1.0], [296, 184, 1.1], [205, 236, 1.2], [166, 320, 0.0], [130, 432, 0.8], [52, 476, 1.2], [90, 566, 1.6], [300, 540, 1.3], [352, 676, 0.7], [433, 600, 0.6], [520, 553, 1.1], [626, 604, 1.5], [540, 101, 1.5], [598, 105, 1.4]];
  for (const [x, z, r] of cars) { w.prop(C.chance(0.75) ? 'car' : 'dg_truck', x, z, r + C.R(-0.2, 0.2), { solid: true }); if (C.chance(0.6)) w.container('car_trunk', x + Math.cos(r) * 2.4, z - Math.sin(r) * 2.4, r, { tier: 1 }); }
  for (const [x, z, r] of [[452, 56, 0], [455, 50, 0.4], [168, 280, 1.6], [150, 400, 0.6], [438, 492, 0.9], [418, 620, 0.6], [700, 600, 0.1]]) w.prop('dg_barrier', x, z, r, { solid: true });
  // outskirts ruins: SW camp huts, far-west ruins, ridge shacks
  for (const [x, z, bw, bd] of [[8, 530, 10, 8], [44, 602, 8, 7], [60, 622, 8, 6], [18, 262, 10, 10], [100, 708, 8, 6], [1060, 640, 9, 7], [140, 30, 10, 8]]) {
    C.bld({ x, z, w: bw, d: bd, wall: C.pick(['brick', 'wood', 'corrugated']), roof: 'corrugated', floor: 'wood', name: 'Ruined Hut', blend: 2, doors: [{ side: 's', at: 2, w: 1.8 }, { side: 'e', at: 2, w: 2, sill: 1 }] });
    C.furnish(C.pick(['storage', 'raider', 'living', 'bunk']), x, z, x + bw, z + bd, { tier: 1, light: C.chance(0.5) });
  }
  for (const [x0, z0, x1, z1] of [[0, 274, 14, 275], [6, 284, 7, 300], [16, 292, 30, 293], [24, 280, 25, 292]]) w.block(x0, z0, x1, z1, 2.2, 'brick', {});
  C.powerLine([[30, 650], [80, 720], [130, 790], [150, 826]], {});
  C.powerLine([[60, 640], [110, 706], [160, 772], [184, 810]], {});
  // husks + caches scattered in the wild
  const wild = [[120, 360], [80, 300], [60, 420], [200, 620], [160, 680], [240, 760], [380, 780], [620, 790], [760, 790], [900, 700], [980, 640], [1040, 600], [1000, 300], [1060, 260], [1040, 120], [940, 120], [800, 60], [720, 20], [600, 140], [520, 140], [420, 160], [380, 30], [260, 60], [160, 120], [60, 200], [40, 760], [960, 800], [1080, 800], [880, 640]];
  for (const [x, z] of wild) {
    if (C.blocked(x, z)) continue;
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
  for (const r of ROADS) markLine(r, 4.5);
  for (const r of TRACKS) markLine(r, 3);
  markLine(WBB, 7); markLine(EBB, 7); for (const b of BOARDWALKS) markLine(b, 2.2);
  for (const [a0, b0, c0, d0] of DAM_RECTS) markRect(a0 - 3, b0 - 3, c0 + 3, d0 + 3);
  markLine(BALCONY, 9.5);
  for (let z = 50; z < 300; z++) for (let x = 600; x < 910; x++) if (C.inDam(x + 0.5, z + 0.5, 3)) AV[z * W + x] = 1;
  for (const b of w.buildings) markRect(b.x0 - 0.8, b.z0 - 0.8, b.x1 + 0.8, b.z1 + 0.8);
  for (const [cx, cz, r] of C.clear) markLine([[cx, cz], [cx + 0.01, cz]], r);
  for (const [a0, b0, c0, d0] of C.clearRects) markRect(a0, b0, c0, d0);
  for (const [dx, dz] of C.doorPts) markRect(dx - 2.6, dz - 2.6, dx + 2.6, dz + 2.6);
  for (const [rx, rz] of C.reserved) markRect(rx - 3, rz - 3, rx + 3, rz + 3);
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
  w.scatter('dg_reeds', SWAMP, 1300, { seed: 501, scaleVar: 0.4, avoid: (x, z) => { const g = w.groundAt(x, z); return g > SWAMP_WATER + 0.25 || g < SWAMP_WATER - 0.7 || C.blocked(x, z); } });
  w.scatter('dg_lily', SWAMP, 340, { seed: 502, avoid: (x, z) => w.groundAt(x, z) > SWAMP_WATER - 0.25 || C.blocked(x, z) });
  for (const p of w.props) if (p.kind === 'dg_lily') { p.opts.yAbs = SWAMP_WATER + 0.02; }
  w.scatter('dg_reeds', BASIN, 220, { seed: 503, avoid: (x, z) => { const g = w.groundAt(x, z); return g > 0.25 || g < -0.6; } });
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
    const x = b.x0 - 1.4, z = b.z1 + 1.6;
    const gy = w.groundAt(x, z), by = w.groundAt((b.x0 + b.x1) / 2, (b.z0 + b.z1) / 2);
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
  // Sentinels (reference positions) — fixed long-range lasers on the dam
  for (const [x, z, roof] of [[731, 162, true], [646, 272, false], [607, 345, true], [668, 340, false], [568, 397, false], [592, 542, false]]) A('sentinel', x, z, { radius: 0, roof });
  // turrets on rooftops / towers
  for (const [x, z] of [[668, 116], [668, 214], [600, 462], [730, 612], [380, 418], [580, 500], [504, 434], [373, 588], [726, 240], [612, 340]]) A('turret', x, z, { radius: 0, roof: true });
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
  // Ticks lurking in buildings
  for (const [x, z] of [[670, 126], [520, 440], [380, 428], [715, 615], [565, 505], [900, 296], [495, 686], [405, 552], [260, 152], [370, 66], [615, 340], [680, 48], [330, 198]]) A('tick', x, z, { count: 2, radius: 4 });
  // Pops in the swamp / forest
  for (const [x, z] of [[300, 300], [400, 330], [250, 470], [330, 450], [560, 650], [640, 690], [500, 280], [240, 330], [440, 250]]) A('pop', x, z, { count: 3, radius: 10 });
  // Fireballs in industrial areas
  for (const [x, z] of [[760, 170], [500, 460], [370, 590], [510, 700], [606, 700], [720, 250]]) A('fireball', x, z, { count: 2, radius: 6 });
  // Snitches over open ground
  for (const [x, z, p] of [[500, 150, [[460, 120], [560, 160], [500, 180]]], [780, 420, [[720, 380], [840, 420], [780, 480]]], [300, 360, [[260, 340], [340, 380]]], [600, 650, [[560, 640], [650, 680]]], [900, 300, [[880, 260], [940, 320]]], [420, 560, [[380, 540], [460, 580]]]]) A('snitch', x, z, { radius: 6, patrol: p });
  // Surveyors (high loot, flee) in open terrain
  for (const [x, z, p] of [[800, 330, [[760, 300], [860, 340], [820, 400]]], [880, 450, [[850, 420], [910, 480], [860, 520]]], [620, 780, [[580, 760], [680, 790]]]]) A('surveyor', x, z, { patrol: p, radius: 8 });
  // Rocketeers over the basin / dam
  for (const [x, z, p] of [[720, 400, [[680, 360], [800, 380], [760, 460]]], [600, 300, [[560, 260], [650, 300], [620, 360]]], [820, 560, [[780, 540], [880, 560]]], [450, 480, [[420, 460], [480, 520]]]]) A('rocketeer', x, z, { patrol: p, radius: 10 });
  // Leapers roam open areas
  for (const [x, z, p] of [[790, 460, [[740, 420], [860, 480], [800, 540]]], [560, 760, [[520, 740], [620, 780]]], [990, 500, [[960, 460], [1040, 520]]], [170, 640, [[140, 600], [220, 680]]]]) A('leaper', x, z, { patrol: p, radius: 12 });
  // Bastions — heavy walkers
  for (const [x, z, p] of [[760, 330, [[720, 310], [820, 340], [780, 380]]], [850, 520, [[820, 500], [900, 540]]], [760, 170, [[720, 160], [820, 190]]], [380, 740, [[340, 720], [420, 760]]]]) A('bastion', x, z, { patrol: p, radius: 10 });
  // Bombardiers + spotters
  A('bombardier', 990, 420, { radius: 8 }); A('spotter', 900, 400, { radius: 10, patrol: [[880, 380], [920, 420]] });
  A('bombardier', 180, 700, { radius: 8 }); A('spotter', 250, 640, { radius: 10, patrol: [[230, 620], [270, 660]] });
}

// ==================================================================================== MARKERS
function markers(C) {
  const { w } = C;
  const P = (id, name, x, z, r, tier, aliases = []) => w.poi(id, name, x, z, r, { tier, aliases: aliases.length ? aliases : [id] });
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
  // player insertion points (reference spawn icons)
  for (const [x, z] of SPAWNS) w.spawnPoint(x, z);
  // loot tier zones
  w.zone('Outskirts', [[0, 0], [W, 0], [W, H], [0, H]], { tier: 1 });
  const Z = (name, tier, x0, z0, x1, z1) => w.zone(name, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], { tier });
  w.zone('Power Generation Complex', PG_POLY, { tier: 2 }); Z('Controlled Access Zone', 3, 646, 208, 692, 244); Z('Pipeline Tower', 2, 712, 186, 772, 268);
  Z('Floodgates', 2, 550, 322, 654, 456); Z('Control Tower', 3, 584, 458, 630, 484); Z('Research & Administration', 3, 558, 496, 602, 536);
  Z('Primary Facility', 2, 470, 424, 556, 500); Z('Water Treatment Control', 2, 362, 400, 470, 502); Z('Hydroponic Dome Complex', 2, 460, 186, 560, 296);
  Z('Testing Annex', 3, 704, 600, 756, 664); Z('Pattern House', 2, 660, 30, 716, 78); Z('Rubie Residence', 2, 320, 50, 392, 116); Z('Pale Apartments', 2, 226, 140, 286, 196);
  Z("Ben Welda's Sunroof", 2, 316, 186, 358, 210); Z('Old Battleground', 2, 196, 290, 284, 350); Z('Electrical Substation', 2, 346, 540, 420, 612);
  Z('Scrap Yard', 2, 470, 672, 542, 720); Z('Wreckage', 2, 582, 670, 630, 710); Z('Formikai Outpost', 2, 500, 776, 560, 816); Z('The Breach', 2, 586, 292, 700, 322);
}
