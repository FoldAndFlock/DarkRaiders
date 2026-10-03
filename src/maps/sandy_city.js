// Sandy City — a Mediterranean seaside resort that went bust twice: first the sea left, then the sand
// arrived. Sandy Properties sold it as "beachfront"; the beach is now a 200 m walk east across the dried-out
// sea bed, and the dunes are coming in from the west to collect what is left.
//
// Layout (north up, 900 x 900 m; design note in docs/maps/sandy_city.md):
//  * The town floor slopes gently down to the old shoreline, which runs north-south along the east side as a
//    sea wall with a promenade on top. East of it the dry sea bed: stranded yachts (Yacht Rock Bottom), the
//    marina basin with its piers, the breakwater out to the Red Flag lighthouse.
//  * Seven boulevards radiate from the Roundabout of Regret; ring lanes tie them together.
//  * Upper Sandy, the old town, sits on a hill in the north: cliffs to the north and east, the Hourglass
//    Terraces stepping down its south slope, the Sandphitheatre cut into its west flank, Piazza Sandwich on top.
//  * The Bypass, an elevated highway, runs along the north edge and leaves the land as a viaduct over the sea
//    bed (the Gridlock Campground lives on it). The dune sea fills the west and the south.
//  * Four metro stations under the streets (each runs one train per raid) and four Doggy Doors.
// Buildings are rotated World buildings (rows of them for terraces and multi-wing landmarks); the streets are
// lined by a frontage planner; upper storeys of named places, roofs, plank bridges and ladders are walkable.
import './props_sandy_city.js';
import { propInfo } from '../engine/models.js';
import { TERRAIN } from '../engine/textures.js';
import { rotFrame, rotPt, unrotPt } from '../engine/world.js';

const MW = 900, MH = 900;
const D2R = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function inPoly(x, z, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, zi] = pts[i], [xj, zj] = pts[j];
    if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi) inside = !inside;
  }
  return inside;
}
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return [Math.hypot(px - ax - dx * t, pz - az - dz * t), t];
}
function polyDist(px, pz, pts) { // distance to a polyline + arc-length position
  let best = 1e9, at = 0, acc = 0, bi = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az);
    const [d, t] = segDist(px, pz, ax, az, bx, bz);
    if (d < best) { best = d; at = acc + t * L; bi = k; }
    acc += L;
  }
  return [best, at, bi];
}
function polyLen(pts) { let s = 0; for (let k = 0; k < pts.length - 1; k++) s += Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); return s; }
function pointAt(pts, s) { // point + tangent at arc length s
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az);
    if (s <= L || k === pts.length - 2) { const t = clamp(s / L, 0, 1); return [ax + (bx - ax) * t, az + (bz - az) * t, (bx - ax) / L, (bz - az) / L, k]; }
    s -= L;
  }
}
// small deterministic value noise (independent of the World rng so terrain never shifts when content changes)
function makeNoise(seed) {
  const P = new Float32Array(1024); let s = seed >>> 0;
  for (let i = 0; i < 1024; i++) { s = (s * 1664525 + 1013904223) >>> 0; P[i] = s / 4294967296; }
  const h = (x, z) => P[((x * 73856093) ^ (z * 19349663)) & 1023];
  const sm = t => t * t * (3 - 2 * t);
  return (x, z) => {
    const ix = Math.floor(x), iz = Math.floor(z), fx = sm(x - ix), fz = sm(z - iz);
    const a = h(ix, iz), b = h(ix + 1, iz), c = h(ix, iz + 1), d = h(ix + 1, iz + 1);
    return a + (b - a) * fx + (c - a) * fz + (a - b - c + d) * fx * fz;
  };
}
const N1 = makeNoise(11), N2 = makeNoise(23), N3 = makeNoise(37), N4 = makeNoise(51);
const fbm = (n, x, z, s) => n(x / s, z / s) * 0.55 + n(x / s * 2.1 + 7.3, z / s * 2.1 + 1.7) * 0.3 + n(x / s * 4.7 + 3.1, z / s * 4.7 + 9.2) * 0.15;

// coarse raster mask (3 m cells) with box blur: used for the town / dune blend
class Mask {
  constructor(res = 3) { this.r = res; this.w = Math.ceil(MW / res) + 1; this.h = Math.ceil(MH / res) + 1; this.a = new Float32Array(this.w * this.h); }
  poly(pts, v = 1) { for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) if (inPoly(i * this.r, j * this.r, pts)) this.a[j * this.w + i] = Math.max(this.a[j * this.w + i], v); return this; }
  circle(cx, cz, rad, v = 1) { for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) if (Math.hypot(i * this.r - cx, j * this.r - cz) < rad) this.a[j * this.w + i] = Math.max(this.a[j * this.w + i], v); return this; }
  line(pts, wd, v = 1) {
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], r = wd / 2;
      for (let j = Math.max(0, Math.floor((Math.min(az, bz) - r) / this.r)); j <= Math.min(this.h - 1, Math.ceil((Math.max(az, bz) + r) / this.r)); j++)
        for (let i = Math.max(0, Math.floor((Math.min(ax, bx) - r) / this.r)); i <= Math.min(this.w - 1, Math.ceil((Math.max(ax, bx) + r) / this.r)); i++)
          if (segDist(i * this.r, j * this.r, ax, az, bx, bz)[0] < r) this.a[j * this.w + i] = Math.max(this.a[j * this.w + i], v);
    }
    return this;
  }
  blur(rad, passes = 2) {
    const { w, h } = this; let a = this.a, b = new Float32Array(a.length);
    for (let p = 0; p < passes; p++) {
      for (let j = 0; j < h; j++) { let s = 0, n = 0; for (let i = -rad; i < w + rad; i++) { if (i + rad < w) { s += a[j * w + i + rad]; n++; } if (i - rad - 1 >= 0) { s -= a[j * w + i - rad - 1]; n--; } if (i >= 0 && i < w) b[j * w + i] = s / n; } }
      for (let i = 0; i < w; i++) { let s = 0, n = 0; for (let j = -rad; j < h + rad; j++) { if (j + rad < h) { s += b[(j + rad) * w + i]; n++; } if (j - rad - 1 >= 0) { s -= b[(j - rad - 1) * w + i]; n--; } if (j >= 0 && j < h) a[j * w + i] = s / n; } }
    }
    this.a = a; return this;
  }
  at(x, z) {
    const fx = clamp(x / this.r, 0, this.w - 1.001), fz = clamp(z / this.r, 0, this.h - 1.001), i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, w = this.w;
    return (this.a[j * w + i] * (1 - u) + this.a[j * w + i + 1] * u) * (1 - v) + (this.a[(j + 1) * w + i] * (1 - u) + this.a[(j + 1) * w + i + 1] * u) * v;
  }
}


// =====================================================================================================
// GEOGRAPHY (world metres; x east, z south, north up)
// =====================================================================================================
// The old shoreline, north -> south. Land lies west of it, the dried-out sea bed east of it. The notch at
// z 283..400 is the marina basin; south of the town the dunes spill over the line onto the sea bed.
const COAST = [[688, 0], [694, 90], [710, 170], [716, 250], [702, 283], [646, 290], [624, 312], [626, 372], [660, 394], [710, 400],
  [724, 444], [718, 505], [730, 565], [750, 640], [782, 718], [822, 792], [862, 858], [884, 900]];
const SEA = COAST.concat([[MW, MH], [MW, 0]]);
// The town floor; outside it the dune sea. CORE is the swept-clear heart, TOWN minus CORE the drifted fringe.
const TOWN = [[226, 112], [340, 98], [470, 96], [600, 108], [692, 112], [710, 170], [716, 250], [702, 283], [646, 290], [624, 312],
  [626, 372], [660, 394], [710, 400], [724, 444], [718, 505], [730, 565], [750, 640], [782, 718], [812, 780], [760, 814], [680, 838],
  [580, 860], [480, 874], [400, 870], [320, 848], [250, 810], [200, 764], [166, 700], [148, 620], [140, 540], [148, 450], [168, 360],
  [190, 280], [204, 200], [212, 140]];
const CORE = [[262, 136], [360, 122], [470, 120], [600, 130], [680, 140], [694, 170], [700, 250], [690, 272], [640, 278], [610, 305],
  [608, 380], [650, 410], [700, 414], [706, 444], [702, 505], [712, 565], [730, 640], [760, 710], [780, 760], [730, 788], [660, 810],
  [570, 828], [480, 842], [400, 836], [330, 812], [272, 774], [232, 724], [204, 650], [186, 560], [188, 470], [204, 380], [226, 300],
  [240, 220], [250, 160]];
// flat-ish pads the dunes keep off: solar farm, water park, gas station apron
const FLATS = [
  { pts: [[84, 190], [214, 184], [222, 300], [92, 306]], v: 0.92 },
  { pts: [[176, 708], [306, 704], [312, 822], [190, 826]], v: 1 },
  { pts: [[430, 806], [530, 802], [534, 880], [436, 884]], v: 0.9 },
];
// Upper Sandy: the old town on its hill. Plateau rim + slope width at each rim vertex (m): cliffs to the
// north and east, a long terraced slope to the south, the amphitheatre bowl cut into the west flank.
const HILL = [[296, 178], [356, 152], [440, 142], [504, 160], [532, 208], [524, 268], [494, 314], [432, 330], [362, 330], [302, 310],
  [278, 262], [282, 214]];
const HILL_W = [1.6, 1.6, 1.6, 1.6, 1.6, 4, 46, 46, 30, 26, 26, 6];
const HILL_H = 7.5;
const THEATRE = { x: 250, z: 262, r0: 13, r1: 46, half: 72 * Math.PI / 180 };   // stage centre, seating rings, sector half-angle (opens west)
// The Bypass: elevated highway along the north edge; it leaves the land as a viaduct over the sea bed
const BYPASS = [[0, 196], [60, 180], [130, 156], [210, 128], [290, 104], [380, 88], [470, 82], [560, 86], [640, 98], [700, 116],
  [760, 138], [830, 160], [900, 182]];
const BP_W = 12;
const BP_GAPS_X = [[322, 9], [866, 8]];          // collapsed spans: [x, half length]
// sand drifts up onto the deck: [x, side (+1 = right / south of travel, -1 = north)]
const BP_RAMPS_X = [[96, 1], [180, -1], [420, 1], [520, -1], [650, 1], [772, 1], [892, 1]];
// The breakwater out to the lighthouse, with a footbridge over a gap you can walk under on the sea bed
const JETTY = [[716, 470], [770, 464]], JETTY2 = [[792, 462], [828, 458]], LIGHTHOUSE = [842, 456];

// Streets. The town hangs off one roundabout: seven boulevards radiate from it, ring lanes tie them
// together, the promenade runs along the sea wall and switchback lanes climb Upper Sandy.
const RB = [505, 455], RB_R = 24;
// [id, polyline, width, paving, frontage style | null]
const STREETS = [
  ['strip', [[482, 460], [430, 468], [370, 482], [300, 500], [230, 520], [166, 538]], 10, 'asphalt', 'shops'],
  ['hillroad', [[492, 434], [476, 400], [466, 362], [456, 324], [434, 292], [410, 270]], 8, 'concrete', 'hill'],
  ['marina', [[523, 438], [560, 404], [586, 372], [598, 344]], 9, 'asphalt', 'apts'],
  ['seaway', [[529, 456], [580, 461], [640, 465], [716, 470]], 9, 'asphalt', 'shops'],
  ['mallway', [[521, 473], [560, 515], [610, 560], [660, 610], [700, 662], [732, 704]], 9, 'asphalt', 'apts'],
  ['desert', [[505, 479], [500, 540], [492, 620], [484, 700], [477, 780], [470, 860], [466, 900]], 9, 'asphalt', 'mixed'],
  ['libraryway', [[487, 471], [440, 520], [380, 580], [320, 640], [270, 700], [234, 744]], 8, 'asphalt', 'houses'],
  ['hillfoot', [[300, 500], [312, 444], [340, 398], [380, 384], [462, 382]], 6, 'asphalt', 'houses'],
  ['southring', [[380, 580], [440, 606], [492, 618], [560, 612], [610, 560]], 6, 'asphalt', 'houses'],
  ['eastring', [[610, 560], [640, 520], [652, 466], [636, 424], [598, 344]], 6, 'asphalt', 'houses'],
  ['outer', [[270, 700], [350, 734], [420, 762], [477, 780], [560, 790], [650, 772], [732, 704]], 7, 'asphalt', 'houses'],
  ['northroad', [[410, 168], [420, 134], [434, 114]], 7, 'asphalt', null],
  ['frontage', [[300, 118], [434, 114], [520, 114], [600, 124], [692, 148]], 7, 'asphalt', 'sheds'],
  ['eaststair', [[508, 238], [548, 242], [592, 238]], 6, 'concrete', null],
  ['westroad', [[238, 262], [200, 266], [150, 254], [92, 248]], 7, 'asphalt', null],
  ['dunetrack', [[166, 538], [158, 486], [172, 430], [204, 384], [232, 338], [248, 292]], 6, 'gravel', null],
  ['hillN', [[298, 216], [346, 198], [470, 194], [510, 210]], 6, 'tiles', 'hill'],
  ['hillW', [[298, 216], [300, 258], [314, 292]], 6, 'tiles', 'hill'],
  ['hillE', [[510, 210], [508, 238], [500, 282], [474, 306]], 6, 'tiles', 'hill'],
  ['hillS', [[314, 292], [352, 312], [410, 270]], 6, 'tiles', 'hill'],
];
// The promenade along the sea wall top (shops and hotels on its inland side only)
const PROMENADE = [[688, 150], [698, 200], [700, 262], [690, 272], [640, 276], [612, 300], [606, 340], [614, 384], [650, 404], [700, 410],
  [708, 440], [704, 500], [714, 560], [732, 630], [762, 700], [796, 768], [828, 820]];
const PROM_W = 7;
// frontage styles: kinds [kind, weight], storeys, depth, length along the street, gap between buildings
const FRONT = {
  shops: { kinds: [['s', 3], ['a', 2]], st: [2, 4], dep: [12, 17], len: [14, 26], gap: [2.5, 6] },
  apts: { kinds: [['a', 3], ['s', 1]], st: [3, 5], dep: [13, 18], len: [16, 28], gap: [3, 7] },
  houses: { kinds: [['h', 4], ['a', 1]], st: [2, 3], dep: [9, 13], len: [10, 22], gap: [3, 8] },
  hill: { kinds: [['h', 5], ['a', 1]], st: [2, 3], dep: [8, 12], len: [9, 18], gap: [2, 6], tints: ['terracotta', 'ochre', 'cream', 'rose', 'peach', 'terracotta'] },
  mixed: { kinds: [['s', 2], ['h', 2], ['a', 1]], st: [1, 3], dep: [10, 15], len: [12, 22], gap: [3, 9] },
  sheds: { kinds: [['i', 1]], st: [1, 2], dep: [12, 18], len: [14, 24], gap: [6, 14] },
  seaside: { kinds: [['s', 2], ['a', 3]], st: [2, 5], dep: [12, 17], len: [14, 26], gap: [3, 7], tints: ['cream', 'white', 'peach', 'yellow', 'sand', 'rose'] },
};

// Landmarks: [cx, cz, length, width, angleDeg (long axis, +x toward +z), storeys, kind, opts]
// kind: h house  a apartments  s shops  c civic  m medical  t tech/office  i industrial  p parking  o chapel  r ruin
// opts.tag = internal handle for set pieces / perches; opts.name = the label players see indoors
const B = [
  // ---- Upper Sandy (the hill)
  [405, 176, 66, 20, -6, 3, 'c', { tag: 'townhall', name: 'Town Hall (Closed Since Lunch)', poi: 'town_hall', key: 'town_hall', keySeg: 'mid', keyName: 'Records Office (Do Not Disturb)', parts: 3, upper: 1, tint: 'cream', kindLoot: 'old' }],
  [346, 294, 26, 13, 18, 2, 'o', { tag: 'chapel', name: 'Our Lady of Perpetual Escrow', poi: 'upper_sandy', tint: 'cream' }],
  [231, 262, 24, 8, 90, 1, 'c', { tag: 'stage', name: 'Stage Door (No Refunds)', poi: 'sandphitheatre', tint: 'sand', flat: true }],
  // Hourglass Terraces: three rows stepping down the south slope
  [402, 339, 74, 9, 0, 2, 'h', { tag: 'terraceA', name: 'Hourglass Terraces', poi: 'santa_marta_houses', parts: 4, tint: 'terracotta' }],
  [398, 355, 70, 9, 0, 2, 'h', { poi: 'santa_marta_houses', parts: 4, tint: 'ochre', key: 'residential', keySeg: 1, keyName: 'Repossessed Townhouse (Hourglass Terraces)' }],
  [404, 371, 64, 9, 0, 2, 'h', { poi: 'santa_marta_houses', parts: 4, tint: 'rose' }],
  // ---- downtown
  [342, 518, 66, 22, -14.4, 4, 'm', { tag: 'hospital', name: "St. Copay's Hospital", poi: 'hospital', parts: 3, upper: 2, key: 'hospital', keySeg: 2, keyStorey: 2, keyName: 'Billing Department (Ward C)' }],
  [302, 562, 30, 18, 75.6, 2, 'm', { name: "St. Copay's Outpatients", poi: 'hospital', upper: 1 }],
  [466, 655, 46, 22, 95.7, 4, 't', { tag: 'travel', name: 'No Refunds Travel Agency', poi: 'space_travel', parts: 2, upper: 2, key: 'space_travel', keySeg: 1, keyStorey: 2, keyName: 'Staff-Only Floor (Very Exclusive)', tint: 'sky', wall: 'plaster' }],
  [556, 612, 84, 38, 0, 3, 's', { tag: 'mall', name: 'The Dune-Hill Mall', poi: 'galleria', parts: 2, upper: 1, wall: 'concrete', tint: 'cream', flat: true, rich: true }],
  [642, 654, 44, 36, 0, 3, 'p', { tag: 'garage', name: 'Park & Pray Garage', poi: 'parking_garage' }],
  [318, 627, 54, 24, -45, 3, 'c', { tag: 'library', name: 'The Overdue Library', poi: 'library', parts: 2, upper: 1, kindLoot: 'old', rich: true, tint: 'cream' }],
  // ---- the port and the north-east
  [606, 162, 46, 24, 4, 2, 'i', { tag: 'warehouse', name: 'Return-to-Sender Warehouse A', poi: 'su_duranti_warehouses' }],
  [656, 178, 26, 30, 4, 2, 'i', { name: 'Return-to-Sender Warehouse B', poi: 'su_duranti_warehouses' }],
  [562, 162, 26, 18, 4, 1, 'i', { name: 'Return-to-Sender Sorting Shed', poi: 'su_duranti_warehouses' }],
  [628, 226, 52, 24, 2, 3, 't', { tag: 'labs', name: 'Pivot Labs', poi: 'research', parts: 2, upper: 1, rich: true }],
  [592, 298, 20, 14, 30, 2, 'c', { tag: 'harbour', name: 'Harbourmaster (Gone Fishing)', poi: 'marino_station', tint: 'white' }],
  // ---- the waterfront
  [842.1, 456, 10.8, 10.8, 0, 7, 'h', { tag: 'lighthouse', name: 'The Red Flag', poi: 'red_tower', tower: true, wall: 'brick', tint: 'red', flat: true }],
  [710, 670, 26, 20, 67.7, 5, 'a', { tag: 'condoA', name: 'Ocean View* Condos, Tower A', poi: 'sandy_properties', upper: 1, tint: 'white' }],
  [736, 727, 34, 20, 67.7, 6, 'a', { tag: 'condoB', name: 'Ocean View* Condos, Tower B', poi: 'sandy_properties', parts: 2, upper: 2, key: 'residential', keySeg: 1, keyStorey: 2, keyName: 'Show Penthouse (Do Not Touch)', tint: 'sand' }],
  [764, 780, 24, 18, 67.7, 5, 'a', { name: 'Ocean View* Condos, Tower C', poi: 'sandy_properties', tint: 'peach', sunk: 1 }],
  [684, 704, 22, 12, 67.7, 1, 's', { tag: 'sales', name: 'Sandy Properties Sales Office', poi: 'sandy_properties', tint: 'yellow', flat: true }],
  // ---- the west edge and the dunes
  [192, 426, 30, 26, 18, 6, 'a', { tag: 'grainsA', name: 'Grains of Wrath Apartments', poi: 'grandiosa_apartments', parts: 2, upper: 2, sunk: 2, key: 'residential', keySeg: 0, keyName: 'Repossessed Unit (Grains of Wrath)', tint: 'peach', rich: true }],
  [176, 478, 28, 26, 18, 6, 'a', { tag: 'grainsB', name: 'Grains of Wrath Apartments, East Wing (West)', poi: 'grandiosa_apartments', upper: 2, sunk: 2.5, tint: 'sand', rich: true }],
  [150, 236, 18, 10, 2, 1, 'i', { tag: 'inverter', name: 'Inverter Shed (Still Inverting)', poi: 'solar_farm' }],
  // ---- the south-west and the south
  [274, 768, 9.5, 9.5, 0, 4, 'h', { tag: 'slidetower', name: 'Slide Tower', poi: 'water_park', tower: true, wall: 'concrete', tint: 'sky', flat: true }],
  [226, 723, 30, 9, 0, 1, 's', { name: 'Changing Rooms (Unisex, Unclean)', poi: 'water_park', tint: 'sky', flat: true }],
  [500, 836, 18, 12, 90, 1, 's', { tag: 'gaskiosk', name: 'Pump & Dump Mini-Mart', poi: 'gas_station', tint: 'yellow', flat: true }],
];

// Houses swallowed by the dunes: only roofs / attic windows still show. [cx, cz, w, d, ridgeAxis 'x'|'z', showH, deg?]
const BURIED = [
  [60, 120, 14, 10, 'x', 1.4], [120, 330, 12, 9, 'z', 1.2], [70, 420, 14, 10, 'x', 1.6], [96, 520, 12, 9, 'x', 1.1], [60, 610, 13, 9, 'z', 1.3],
  [110, 690, 14, 10, 'x', 1.5], [80, 800, 12, 9, 'z', 1.2], [170, 860, 14, 10, 'x', 1.0], [300, 880, 12, 9, 'x', 1.4], [400, 892, 13, 9, 'z', 1.2],
  [560, 886, 14, 10, 'x', 1.3], [660, 870, 12, 9, 'z', 1.1], [760, 850, 13, 10, 'x', 1.5], [250, 40, 12, 9, 'x', 1.3], [440, 30, 14, 10, 'z', 1.2],
  [600, 40, 12, 9, 'x', 1.4], [30, 300, 12, 8, 'z', 1.0], [150, 40, 12, 9, 'x', 1.2], [36, 880, 12, 9, 'x', 1.3], [230, 600, 12, 9, 'z', 1.1],
];

// Vegetation clusters: date palms by the water, olives and cypress on the hill, scrub in the dunes
const GROVES = [
  { pts: [[612, 404], [700, 412], [708, 452], [664, 458], [618, 446]], d: 2.2, k: 'park' },            // Low Tide Park
  { pts: [[300, 150], [356, 140], [362, 160], [300, 184]], d: 1.4, k: 'olive' },                         // hill, north-west shoulder
  { pts: [[486, 160], [520, 172], [528, 200], [500, 196]], d: 1.4, k: 'mix' },
  { pts: [[440, 300], [490, 292], [480, 320], [440, 326]], d: 1.6, k: 'olive' },
  { pts: [[252, 300], [292, 300], [300, 330], [262, 336]], d: 1.4, k: 'mix' },                          // below the theatre
  { pts: [[252, 192], [288, 186], [286, 226], [258, 228]], d: 1.4, k: 'mix' },
  { pts: [[214, 600], [262, 590], [270, 640], [222, 656]], d: 1.6, k: 'palm' },
  { pts: [[372, 600], [420, 616], [404, 650], [362, 640]], d: 1.4, k: 'palm' },
  { pts: [[560, 680], [610, 690], [596, 740], [548, 724]], d: 1.6, k: 'mix' },
  { pts: [[668, 740], [712, 760], [700, 800], [652, 790]], d: 1.8, k: 'palm' },
  { pts: [[520, 300], [560, 286], [570, 320], [530, 330]], d: 1.4, k: 'mix' },
  { pts: [[380, 640], [440, 650], [436, 700], [392, 696]], d: 1.0, k: 'olive' },
  { pts: [[10, 20], [160, 10], [200, 90], [60, 130], [10, 110]], d: 0.5, k: 'mix' },                    // dune oases
  { pts: [[40, 700], [130, 690], [140, 760], [50, 780]], d: 0.7, k: 'palm' },
  { pts: [[600, 860], [720, 850], [700, 896], [600, 896]], d: 0.6, k: 'palm' },
  { pts: [[300, 820], [380, 840], [370, 890], [300, 886]], d: 0.5, k: 'mix' },
];

// Squares and pads painted on the town floor (and kept free of frontage)
const PLAZAS = [
  { id: 'piazza_romana', pts: [[352, 210], [478, 204], [482, 274], [356, 278]], tex: 'tiles' },
  { id: 'hospital_front', pts: [[372, 489], [302, 507], [304, 516], [374, 498]], tex: 'concrete' },
  { id: 'mall_front', pts: [[514, 560], [600, 560], [602, 592], [514, 592]], tex: 'tiles' },
  { id: 'library_front', pts: [[336, 572], [372, 560], [384, 590], [348, 606]], tex: 'tiles' },
  { id: 'quay', pts: [[560, 276], [640, 276], [612, 300], [606, 384], [560, 384]], tex: 'concrete' },
  { id: 'travel_front', pts: [[420, 630], [444, 626], [446, 690], [420, 692]], tex: 'tiles' },
  { id: 'condo_lawn', pts: [[668, 640], [700, 628], [740, 700], [690, 724]], tex: 'tiles' },
];
// rects that frontage buildings keep out of: [x0, z0, x1, z1] (station sites, pads, open ground)
const KEEP_OUT = [
  [316, 232, 362, 264], [546, 318, 590, 356], [170, 562, 244, 596], [528, 782, 600, 826],      // metro sites (+ their street stairs)
  [176, 704, 312, 824], [426, 804, 536, 884], [84, 184, 222, 306], [540, 120, 700, 200],          // water park, gas station, solar farm, port yard
  [600, 400, 716, 460], [196, 220, 300, 306], [240, 160, 300, 230], [486, 590, 514, 634],                               // Low Tide Park, theatre + its shoulder
];

// Player / squad insertion points round the edges (dunes, the north road, the sea bed)
const SPAWNS = [[24, 300], [30, 470], [40, 640], [60, 840], [180, 890], [330, 892], [520, 892], [700, 880], [870, 760], [886, 560],
  [888, 330], [880, 90], [760, 24], [560, 30], [380, 28], [200, 60], [24, 120], [240, 400], [610, 880]];
const FIELD_DEPOTS = [[488, 252], [262, 600], [688, 532]];
// =====================================================================================================
// STYLES
// =====================================================================================================
const TINT = { cream: 0xfff4e4, ochre: 0xffd48e, pink: 0xffcbbb, terracotta: 0xf09a7a, peach: 0xffc296, yellow: 0xffe6a0,
  rose: 0xf4b0a0, white: 0xffffff, sage: 0xe2ead0, red: 0xd47862, grey: 0xe2ded6, sand: 0xf6e2be, sky: 0xcfe4f0 };
const TINT_CYCLE = ['cream', 'ochre', 'pink', 'terracotta', 'peach', 'yellow', 'rose', 'cream', 'ochre', 'sand'];
const ROOF_TINTS = [0xffffff, 0xf6dcc4, 0xeac6aa, 0xfff0e0, 0xdcb090];
const STYLE = {
  h: { wall: 'plaster', roof: 'roofTile', gable: 0.45, floor: ['tiles', 'wood'], loot: 'res' },
  a: { wall: 'plaster', roof: 'roofTar', gable: 0.15, floor: ['tiles', 'wood'], loot: 'res' },
  s: { wall: 'plaster', roof: 'roofTar', gable: 0.2, floor: ['tiles'], loot: 'com' },
  c: { wall: 'plaster', roof: 'roofTile', gable: 0.4, floor: ['tiles'], loot: 'civ' },
  m: { wall: 'concrete', roof: 'roofTar', gable: 0, floor: ['tiles'], loot: 'med' },
  t: { wall: 'concrete', roof: 'roofTar', gable: 0, floor: ['metalPanel', 'tiles'], loot: 'tech' },
  i: { wall: 'corrugated', roof: 'corrugated', gable: 0, floor: ['concrete'], loot: 'ind' },
  p: { wall: 'concrete', roof: 'roofTar', gable: 0, floor: ['asphalt'], loot: 'mech' },
  o: { wall: 'plaster', roof: 'roofTile', gable: 1, floor: ['tiles'], loot: 'old' },
  r: { wall: 'plaster', roof: 'roofTar', gable: 0, floor: ['sandDark', 'tiles'], loot: 'res' },
};
// furniture + container tables per loot family: [prop, containerKind|null, weight]
const FURN = {
  res: [['sc_bed', 'cabinet', 3], ['sc_bed2', 'suitcase', 2], ['sc_sofa', 'backpack', 2], ['sc_sofa2', null, 1], ['sc_table', 'basket', 2], ['sc_stove', 'fridge', 2],
    ['shelf', 'cabinet', 2], ['sc_bookshelf', 'desk', 1], [null, 'trash', 1], ['sc_vase', null, 1], ['sc_planter', 'plant', 1]],
  com: [['sc_counter', 'cabinet', 3], ['sc_rack', 'suitcase', 2], ['shelf', 'crate', 3], ['sc_cratestack', 'crate', 2], ['sc_table', 'basket', 1], [null, 'trash', 1], ['sc_stove', 'fridge', 1]],
  civ: [['sc_desk', 'desk', 3], ['sc_bookshelf', 'cabinet', 2], ['sc_table', 'suitcase', 1], ['shelf', 'cabinet', 2], [null, 'safe', 0.4], ['sc_sofa', null, 1], [null, 'security_locker', 0.5]],
  old: [['sc_bookshelf', 'cabinet', 3], ['sc_desk', 'desk', 2], ['sc_vase', 'basket', 1], ['sc_column', null, 1], ['sc_table', 'suitcase', 1], [null, 'safe', 0.3]],
  med: [['sc_hospbed', 'medical_bag', 4], ['shelf', 'cabinet', 2], ['sc_desk', 'desk', 1], [null, 'security_locker', 0.6], ['sc_stove', 'fridge', 0.6], [null, 'medical_bag', 1]],
  tech: [['sc_server', 'electronics', 3], ['sc_desk', 'desk', 3], ['shelf', 'electronics', 1], [null, 'security_locker', 1], ['workbench', 'toolbox', 1], [null, 'safe', 0.3]],
  ind: [['sc_cratestack', 'crate', 3], ['workbench', 'toolbox', 3], ['shelf', 'ammo_box', 1], ['barrel', null, 2], ['barrelBlue', null, 1], [null, 'locker', 1], ['lootCrate', 'crate', 1]],
  mech: [['sc_fiat', 'car_trunk', 3], ['sc_fiat2', 'car_trunk', 2], ['workbench', 'toolbox', 2], ['barrel', null, 1], ['sc_cratestack', 'crate', 1], [null, 'locker', 1]],
};
const KEY_LOOT = { hospital: ['medical_bag', 'security_locker', 'medical_bag', 'safe', 'cabinet'], town_hall: ['safe', 'desk', 'security_locker', 'weapon_case', 'cabinet'],
  space_travel: ['electronics', 'electronics', 'safe', 'security_locker', 'weapon_case'], res: ['safe', 'cabinet', 'suitcase', 'weapon_case', 'backpack'] };

function pickW(rng, list) { let t = 0; for (const e of list) t += e[2]; let r = rng() * t; for (const e of list) { r -= e[2]; if (r <= 0) return e; } return list[list.length - 1]; }
const R2 = v => Math.round(v * 2) / 2;

// =====================================================================================================
// BUILDING COMPLEXES  (rotated rects → rows of rotated World buildings sharing one frame)
// =====================================================================================================
// Each complex has its own frame C.R = rotFrame(cx, cz, rot): segment rects, rooms, doors and furniture are
// laid out axis-aligned in "complex coordinates" and mapped to the world with toW(). The rotation is folded
// into (-45°, 45°] so the local south face (facade bands, shutters, balconies) is the camera-facing one.
const toW = (C, x, z) => (C.R ? rotPt(C.R, x, z) : [x, z]);

// [[x1,z1],[x2,z2],[x3,z3], ...rest] (three consecutive corners) -> [cx, cz, L, W, angle, ...rest]
function fromCorners(b) {
  const [[x1, z1], [x2, z2], [x3, z3], ...rest] = b;
  const ax = x2 - x1, az = z2 - z1, bx = x3 - x2, bz = z3 - z2, la = Math.hypot(ax, az), lb = Math.hypot(bx, bz);
  const cx = (x1 + x3) / 2, cz = (z1 + z3) / 2;
  return la >= lb ? [cx, cz, la, lb, Math.atan2(az, ax) / D2R, ...rest] : [cx, cz, lb, la, Math.atan2(bz, bx) / D2R, ...rest];
}
class Occ { // 1 m occupancy raster of building segments (rotated footprints rasterised by cell centre)
  constructor() { this.a = new Int32Array(MW * MH).fill(-1); }
  mark(x0, z0, x1, z1, id) { for (let z = Math.max(0, Math.floor(z0)); z < Math.min(MH, Math.ceil(z1)); z++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(MW, Math.ceil(x1)); x++) this.a[z * MW + x] = id; }
  markPoly(pts, id) {
    const [a, b, c, d] = bounds(pts);
    for (let z = Math.max(0, Math.floor(b)); z < Math.min(MH, Math.ceil(d)); z++) for (let x = Math.max(0, Math.floor(a)); x < Math.min(MW, Math.ceil(c)); x++)
      if (inPoly(x + 0.5, z + 0.5, pts) || inPoly(x + 0.15, z + 0.15, pts) || inPoly(x + 0.85, z + 0.85, pts) || inPoly(x + 0.15, z + 0.85, pts) || inPoly(x + 0.85, z + 0.15, pts)) this.a[z * MW + x] = id;
  }
  at(x, z) { if (x < 0 || z < 0 || x >= MW || z >= MH) return -2; return this.a[Math.floor(z) * MW + Math.floor(x)]; }
  free(x0, z0, x1, z1) { for (let z = Math.max(0, Math.floor(z0)); z < Math.min(MH, Math.ceil(z1)); z++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(MW, Math.ceil(x1)); x++) if (this.a[z * MW + x] >= 0) return false; return true; }
}
// separating-axis test for convex quads: true when the gap between them is smaller than m
function quadsClash(P, Q, m = 0) {
  for (const poly of [P, Q]) for (let i = 0; i < poly.length; i++) {
    const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length], nx = -(bz - az), nz = bx - ax, l = Math.hypot(nx, nz) || 1;
    let a0 = 1e9, a1 = -1e9, b0 = 1e9, b1 = -1e9;
    for (const [x, z] of P) { const v = (x * nx + z * nz) / l; a0 = Math.min(a0, v); a1 = Math.max(a1, v); }
    for (const [x, z] of Q) { const v = (x * nx + z * nz) / l; b0 = Math.min(b0, v); b1 = Math.max(b1, v); }
    if (b0 - a1 >= m || a0 - b1 >= m) return false;
  }
  return true;
}
const rectPoly = (C, x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => toW(C, x, z));
const bboxHit = (P, Q, m) => { const a = bounds(P), b = bounds(Q); return a[0] < b[2] + m && b[0] < a[2] + m && a[1] < b[3] + m && b[1] < a[3] + m; };

// recursive room split inside a segment (local coords 0..w, 0..d). Records walls [x0,z0,x1,z1,gaps].
// res: reserved rects (stair flights + their landings / stairwell holes) that no wall may cross
function bsp(rng, x0, z0, x1, z1, minR, maxR, walls, rooms, bgaps, depth = 0, res = []) {
  const w = x1 - x0, d = z1 - z0;
  const canX = w >= 2 * minR, canZ = d >= 2 * minR;
  const small = w <= maxR && d <= maxR;
  if ((!canX && !canZ) || depth > 5 || (small && (depth > 0 ? rng() < 0.55 : rng() < 0.25))) { rooms.push([x0, z0, x1, z1]); return; }
  for (let tries = 0; tries < 8; tries++) {
    const splitX = canX && (!canZ || w > d * (0.75 + rng() * 0.5));
    const span = splitX ? w : d, p = R2((splitX ? x0 : z0) + span * (0.36 + rng() * 0.28));
    // don't run a wall into a door gap of the enclosing walls
    const bad = bgaps.some(g => g.axis !== (splitX ? 'x' : 'z') && (splitX ? (g.pos === z0 || g.pos === z1) : (g.pos === x0 || g.pos === x1)) && p > g.a - 0.9 && p < g.b + 0.9);
    if (bad) continue;
    if (res.some(r => splitX ? p > r[0] - 0.25 && p < r[2] + 0.25 && r[3] > z0 && r[1] < z1 : p > r[1] - 0.25 && p < r[3] + 0.25 && r[2] > x0 && r[0] < x1)) continue;
    const len = splitX ? d : w, gw = len > 8 && rng() < 0.3 ? 2.4 : 1.6;
    const gat = R2(clamp(len * (0.15 + rng() * 0.7) - gw / 2, 0.7, len - gw - 0.7));
    const gap = { at: gat, w: gw };
    if (splitX) {
      walls.push([p, z0, p, z1, [gap]]);
      const ng = bgaps.concat([{ axis: 'x', pos: p, a: z0 + gat, b: z0 + gat + gw }]);
      bsp(rng, x0, z0, p, z1, minR, maxR, walls, rooms, ng, depth + 1, res); bsp(rng, p, z0, x1, z1, minR, maxR, walls, rooms, ng, depth + 1, res);
    } else {
      walls.push([x0, p, x1, p, [gap]]);
      const ng = bgaps.concat([{ axis: 'z', pos: p, a: x0 + gat, b: x0 + gat + gw }]);
      bsp(rng, x0, z0, x1, p, minR, maxR, walls, rooms, ng, depth + 1, res); bsp(rng, x0, p, x1, z1, minR, maxR, walls, rooms, ng, depth + 1, res);
    }
    return;
  }
  rooms.push([x0, z0, x1, z1]);
}

function layoutComplexes(ctx) {
  const { occ, rng } = ctx;
  ctx.cxs = []; ctx.segs = [];
  const placed = (ctx.obstacles || []).map(o => ({ poly: o.poly, C: null }));
  ctx.B.forEach((b0, bi) => {
    const b = Array.isArray(b0[0]) ? fromCorners(b0) : b0;
    const [cx, cz, L, Wd, ang, storeys, kind, o = {}] = b;
    let a = ((ang % 180) + 180) % 180; if (a > 90) a -= 180;
    let r = a, longX = true;
    if (a > 45) { r = a - 90; longX = false; } else if (a < -45) { r = a + 90; longX = false; }
    const rot = r * D2R;
    const C = { bi, cx, cz, L, Wd, ang, storeys, kind, o, segs: [], rot, R: Math.abs(rot) > 1e-4 ? rotFrame(cx, cz, rot) : null, longX };
    // long terraces become rows of 2–3 houses (own storeys / plaster colour), civic + key wings as given
    const row = kind === 'h' || kind === 'a';
    const n = o.parts ?? (row ? (L > 62 ? 3 : L > 36 ? 2 : 1) : kind === 'c' || kind === 's' ? (L > 80 ? 2 : 1) : 1);
    const cuts = [0];
    for (let k = 1; k < n; k++) cuts.push(R2(L * k / n + (row && !o.key ? (rng() - 0.5) * 0.24 * L / n : 0)));
    cuts.push(L);
    for (let k = 0; k < n; k++) {
      const a0 = -L / 2 + cuts[k], a1 = -L / 2 + cuts[k + 1];
      const sg = longX ? { x0: cx + a0, z0: cz - Wd / 2, x1: cx + a1, z1: cz + Wd / 2 } : { x0: cx - Wd / 2, z0: cz + a0, x1: cx + Wd / 2, z1: cz + a1 };
      sg.C = C; sg.part = k;
      // resolve conflicts with earlier complexes / deck corridors: greedily trim the cheapest side
      const clash = (q) => { const P = rectPoly(C, q.x0, q.z0, q.x1, q.z1); return placed.filter(T => T.C !== C && bboxHit(P, T.poly, 0.5) && quadsClash(P, T.poly, 0.35)); };
      let bad = clash(sg), it = 0;
      const W0 = sg.x1 - sg.x0, D0 = sg.z1 - sg.z0;
      while (bad.length && it++ < 4) {
        let best = null;
        for (const side of ['n', 's', 'w', 'e']) {
          const max = (side === 'n' || side === 's' ? D0 : W0) * 0.6;
          for (let t = 0.5; t <= max && (!best || t < best.t); t += 0.5) {
            const q = { x0: sg.x0 + (side === 'w' ? t : 0), z0: sg.z0 + (side === 'n' ? t : 0), x1: sg.x1 - (side === 'e' ? t : 0), z1: sg.z1 - (side === 's' ? t : 0) };
            if (q.x1 - q.x0 < 5 || q.z1 - q.z0 < 5) break;
            const left = clash(q);
            if (!left.includes(bad[0])) { best = { t, q }; break; }
          }
        }
        if (!best) break;
        Object.assign(sg, best.q); bad = clash(sg);
      }
      if (bad.length) { (ctx.dropped = ctx.dropped || []).push(bi + ':' + k + '@' + Math.round(cx) + ',' + Math.round(cz)); continue; }
      sg.poly = rectPoly(C, sg.x0, sg.z0, sg.x1, sg.z1);
      sg.id = ctx.segs.length; ctx.segs.push(sg); C.segs.push(sg); placed.push({ poly: sg.poly, C });
    }
    if (C.segs.length) ctx.cxs.push(C);
  });
  for (const sg of ctx.segs) occ.markPoly(sg.poly, sg.id);
}

// floor height for each complex from the shaped terrain (sunk buildings sit lower, sand piled against them)
function complexFloors(ctx) {
  const { w } = ctx;
  for (const C of ctx.cxs) {
    let sum = 0, n = 0, mn = 1e9;
    for (const s of C.segs) for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      const [x, z] = toW(C, lerp(s.x0, s.x1, i / 4), lerp(s.z0, s.z1, j / 4)), g = w.groundAt(x, z); sum += g; n++; mn = Math.min(mn, g);
    }
    C.floorY = C.o.sunk ? lerp(mn, sum / n, 0.55) : sum / n;
  }
}

// a sloped cut (or fill) from a door of a sunk building out to the natural sand level, ≤ 0.28 m rise per metre
function digRamp(ctx, C, s, side, p, gw) {
  const { w } = ctx, si = sideInfo(s, side);
  const [ax, az] = toW(C, si.horiz ? p : si.fixed, si.horiz ? si.fixed : p);
  const lx = si.horiz ? 0 : si.out, lz = si.horiz ? si.out : 0, cs = C.R ? C.R.c : 1, sn = C.R ? C.R.s : 0;
  const dx = lx * cs - lz * sn, dz = lx * sn + lz * cs;
  const y0 = C.floorY;
  let L = 2;
  while (L < 16 && Math.abs(w.groundAt(ax + dx * L, az + dz * L) - y0) / L > 0.28) L += 1;
  const up = w.groundAt(ax + dx * L, az + dz * L) > y0;
  for (let u = 0; u < L; u += 0.5) {
    const h = y0 + (w.groundAt(ax + dx * L, az + dz * L) - y0) * (u / L);
    w.ridge([[ax + dx * u, az + dz * u], [ax + dx * (u + 0.5), az + dz * (u + 0.5)]], Math.max(2.4, gw + 0.8), h, 0.8, up ? 'min' : 'max');
  }
  (ctx.ramps = ctx.ramps || []).push([ax, az, dx, dz, L]);
}

function sideInfo(s, side) { // wall line of a segment side in complex coords
  if (side === 'n') return { horiz: true, a: s.x0, b: s.x1, fixed: s.z0, out: -1 };
  if (side === 's') return { horiz: true, a: s.x0, b: s.x1, fixed: s.z1, out: 1 };
  if (side === 'w') return { horiz: false, a: s.z0, b: s.z1, fixed: s.x0, out: -1 };
  return { horiz: false, a: s.z0, b: s.z1, fixed: s.x1, out: 1 };
}

// stair flights between walkable storeys, in building-local coords. Flights alternate between two
// columns at opposite ends so a storey holds the hole of the flight below and the foot of the next one.
// Each flight keeps 0.8 m clear along its sides and 1.2 m at foot and top (`res`, no wall may cross it).
function stairPlan(W, D, n, toTop, sh = 3.2, fw = 2.2) {
  const along = D >= 8.6 ? 'z' : W >= 8.6 ? 'x' : null;
  if (!along || (n > 1 && (along === 'z' ? W : D) < 8.8)) return null;
  const out = [];
  for (let k = 0; k < n; k++) {
    const top = toTop && k === n - 1, rise = top ? sh + 0.25 : sh, len = Math.max(2, Math.ceil(rise / 0.38)) * 0.55;
    const colB = k % 2 === 1;   // wide flights: the 2 m nav grid finds its way up them
    let f;
    if (along === 'z') {
      const x = colB ? W - 1.3 - fw : 1.3, z = (D - len) / 2;
      f = { x, z, w: fw, dir: colB ? 'n' : 's', rect: [x, z, x + fw, z + len], res: [x - 0.7, z - 1.2, x + fw + 0.7, z + len + 1.2] };
    } else {
      const z = colB ? D - 1.3 - fw : 1.3, x = (W - len) / 2;
      f = { x, z, w: fw, dir: colB ? 'w' : 'e', rect: [x, z, x + len, z + fw], res: [x - 1.2, z - 0.7, x + len + 1.2, z + fw + 0.7] };
    }
    if (f.res[0] < 0.25 || f.res[1] < 0.25 || f.res[2] > W - 0.25 || f.res[3] > D - 0.25) return null;
    f.from = k; f.to = top ? 'top' : k + 1;
    out.push(f);
  }
  return out;
}

function buildComplexes(ctx) {
  const { w, rng, occ } = ctx;
  let tintI = 0;
  for (const C of ctx.cxs) {
    const st = STYLE[C.kind], o = C.o;
    const ruinAll = C.kind === 'r' || o.ruin === 1;
    const tintName = o.tint || TINT_CYCLE[(tintI++ * 7 + C.bi) % TINT_CYCLE.length];
    const tint = C.kind === 'i' || C.kind === 't' || C.kind === 'p' || C.kind === 'm' ? (o.tint ? TINT[o.tint] : null) : TINT[tintName];
    const gable = !o.flat && !ruinAll && rng() < st.gable;
    const roofTint = ROOF_TINTS[Math.floor(rng() * ROOF_TINTS.length)];
    const floorTex = st.floor[Math.floor(rng() * st.floor.length)];
    const keyIdx = o.key ? (o.keySeg === -1 ? -1 : o.keySeg === 'mid' ? Math.floor(C.segs.length / 2) : (o.keySeg ?? 0)) : null;
    const tower = !!o.tower, garage = C.kind === 'p';
    // a key wing may be locked only from storey `keyStorey` up (e.g. the hospital ward on the 3rd floor,
    // reached by the neighbouring wing's stairs and a locked door; the wing below is open)
    const keyLvOf = (k) => keyIdx != null && (keyIdx === -1 || keyIdx === k) ? (o.keyStorey || 0) : Infinity;
    const planFlights = (k, W, D, storeys) => {
      if (tower || garage) return stairPlan(W, D, storeys, true, 3.2, garage ? 4.0 : 2.2);
      if (!o.upper || storeys < 2) return null;
      const kl = keyLvOf(k), n = Math.min(o.upper, storeys - 1, kl > 0 && kl < Infinity ? kl - 1 : 99);
      return n > 0 ? stairPlan(W, D, n, false, 3.2, Math.min(W, D) >= 12 ? 3.8 : 2.2) : null;
    };
    const levelsOf = (k, flights, storeys) => {
      const kl = keyLvOf(k);
      let lv = flights ? (tower || garage ? storeys : flights.length + 1) : 1;
      if (kl > 0 && kl < Infinity && storeys > kl) lv = Math.max(lv, kl + 1);
      return lv;
    };
    // multi-storey public blocks: plan every wing's floors up front so the wings connect upstairs too
    // (doorways in the shared walls on each common storey, locked where a key area begins)
    const upConn = [];   // [segA, segB, side of A, at, width, storey, lock]
    if (o.upper && !ruinAll && !o.ruin && C.segs.length > 1) {
      const plan = C.segs.map((sg, k) => { const W = sg.x1 - sg.x0, D = sg.z1 - sg.z0, f = planFlights(k, W, D, C.storeys); return { f, lv: levelsOf(k, f, C.storeys) }; });
      C.segs.forEach((sg, k) => C.segs.forEach((T, j) => {
        if (j <= k) return;
        for (const side of ['n', 's', 'w', 'e']) {
          const si = sideInfo(sg, side), ti = sideInfo(T, { n: 's', s: 'n', w: 'e', e: 'w' }[side]);
          if (si.horiz !== ti.horiz || Math.abs(si.fixed - ti.fixed) > 0.01) continue;
          const a = Math.max(si.a, ti.a), b = Math.min(si.b, ti.b);
          if (b - a < 4) continue;
          // a grid cell holds one door blocker, so upstairs doorways never sit above the ground one or each other
          const g0 = Math.min(3, b - a - 1.2), used = [[(a + b) / 2 - g0 / 2 - 0.4, (a + b) / 2 + g0 / 2 + 0.4]];
          for (let lv = 1; lv < Math.min(plan[k].lv, plan[j].lv); lv++) {
            const gw = 1.8;
            const resOf = (S, pl) => (pl.f || []).filter(f => f.from === lv || f.to === lv).map(f => [S.x0 + f.res[0], S.z0 + f.res[1], S.x0 + f.res[2], S.z0 + f.res[3]]);
            const res = resOf(sg, plan[k]).concat(resOf(T, plan[j]));
            let at = null;
            for (let d = 0; d <= (b - a) / 2 && at == null; d += 0.5) for (const sgn of [1, -1]) {
              const c = (a + b) / 2 + sgn * d; if (c - gw / 2 < a + 0.8 || c + gw / 2 > b - 0.8) continue;
              if (used.some(([u0, u1]) => c + gw / 2 + 0.4 > u0 && c - gw / 2 - 0.4 < u1)) continue;
              const box = si.horiz ? [c - gw / 2 - 0.6, si.fixed - 1.6, c + gw / 2 + 0.6, si.fixed + 1.6] : [si.fixed - 1.6, c - gw / 2 - 0.6, si.fixed + 1.6, c + gw / 2 + 0.6];
              if (!res.some(r => box[0] < r[2] && box[2] > r[0] && box[1] < r[3] && box[3] > r[1])) { at = c - gw / 2; break; }
            }
            if (at == null) continue;
            used.push([at, at + gw]);
            const lock = (lv >= keyLvOf(k)) !== (lv >= keyLvOf(j)) ? o.key : null;
            upConn.push([sg, T, side, at, gw, lv, lock]);
          }
        }
      }));
    }
    C.rooms = [];
    C.segs.forEach((s, k) => {
      const W = s.x1 - s.x0, D = s.z1 - s.z0;
      const isKey = keyIdx != null && (keyIdx === -1 || keyIdx === k);
      const keyLv = keyLvOf(k), keyAt = (lv) => lv >= keyLv;
      const lockId = keyAt(0) ? o.key : null;
      const ruin = ruinAll || (o.ruin && rng() < o.ruin);
      // row houses: each house of a terrace gets its own height and plaster colour
      const rowVar = C.segs.length > 1 && (C.kind === 'h' || C.kind === 'a') && !o.key && !o.upper;
      const storeys = ruin ? 1 : rowVar ? clamp(C.storeys + Math.round((rng() - 0.5) * 2.2), 2, 5) : C.storeys;
      // walkable storeys: towers and the garage all the way up (+ roof), POI blocks get a real first floor
      const flights = ruin ? null : planFlights(k, W, D, storeys);
      const levels = ruin ? 1 : levelsOf(k, flights, storeys);
      // upstairs doorways to the neighbouring wings stay clear of BSP walls (reserved like the stairs)
      const myConn = upConn.filter(q => q[0] === s || q[1] === s).map(q => {
        const side = q[0] === s ? q[2] : { n: 's', s: 'n', w: 'e', e: 'w' }[q[2]], si = sideInfo(s, side), c = q[3] + q[4] / 2;
        const box = si.horiz ? [c - 1.4 - s.x0, si.fixed - 1.3 - s.z0, c + 1.4 - s.x0, si.fixed + 1.3 - s.z0] : [si.fixed - 1.3 - s.x0, c - 1.4 - s.z0, si.fixed + 1.3 - s.x0, c + 1.4 - s.z0];
        return { side, at: q[3], w: q[4], lv: q[5], lock: q[6], first: q[0] === s, box };
      });
      const resAt = (lv) => (flights ? flights.filter(f => f.from === lv || f.to === lv).map(f => f.res) : []).concat(myConn.filter(q => q.lv === lv).map(q => q.box));
      // ---- rooms, one BSP per walkable storey (stair flights + holes kept clear)
      const walls = [], roomsBy = [], innerGapsBy = [];
      const minR = C.kind === 'i' ? 7 : 3.6, maxR = C.kind === 'i' ? 22 : C.kind === 'o' ? 16 : 9;
      for (let lv = 0; lv < levels; lv++) {
        const wl = [], rl = [];
        if (!(C.kind === 'o' && k === 0) && !tower && !garage) bsp(rng, 0, 0, W, D, minR, maxR, wl, rl, [], 0, resAt(lv));
        else rl.push([0, 0, W, D]);
        for (const wv of wl) walls.push([...wv, lv]);
        roomsBy.push(rl);
        const ig = [];
        for (const [a, b, c, d, gl] of wl) for (const g of gl) ig.push(a === c ? [s.x0 + a, s.z0 + b + g.at + g.w / 2, true] : [s.x0 + a + g.at + g.w / 2, s.z0 + b, true]);
        innerGapsBy.push(ig);
      }
      const innerGaps = innerGapsBy[0];
      // inner wall ends on each side (to keep exterior openings clear of T-junctions)
      const ends = { n: [], s: [], w: [], e: [] };
      for (const [a, b, c, d] of walls) {
        if (a === c) { if (b <= 0.01) ends.n.push(s.x0 + a); if (d >= D - 0.01) ends.s.push(s.x0 + a); }
        else { if (a <= 0.01) ends.w.push(s.z0 + b); if (c >= W - 0.01) ends.e.push(s.z0 + b); }
      }
      // ---- openings
      const doors = [], gapsWorld = [], gapsUp = [];
      const addGap = (side, at, gw, extra = {}) => {
        const si = sideInfo(s, side);
        doors.push({ side, at: R2(at - si.a), w: gw, ...extra });
        const c = at + gw / 2, pt = si.horiz ? [c, si.fixed, !extra.sill] : [si.fixed, c, !extra.sill];
        if (extra.storey) (gapsUp[extra.storey] ||= []).push(pt); else gapsWorld.push(pt);
      };
      // connections to the next segment of the same complex (shared wall line)
      for (const T of C.segs) {
        if (T === s) continue;
        for (const side of ['n', 's', 'w', 'e']) {
          const si = sideInfo(s, side), ti = sideInfo(T, { n: 's', s: 'n', w: 'e', e: 'w' }[side]);
          if (si.horiz !== ti.horiz || Math.abs(si.fixed - ti.fixed) > 0.01) continue;
          const a = Math.max(si.a, ti.a), b = Math.min(si.b, ti.b);
          if (b - a < 3) continue;
          const gw = Math.min(3, b - a - 1.2), at = R2((a + b) / 2 - gw / 2);
          const lock = keyAt(0) !== (0 >= keyLvOf(C.segs.indexOf(T))) ? o.key : null;
          const first = s.id < T.id;  // only one of the two coincident walls spawns the door entity
          addGap(side, at, gw, lock && first ? { door: true, locked: lock } : {});
        }
      }
      for (const q of myConn) addGap(q.side, q.at, q.w, q.lock && q.first ? { door: true, locked: q.lock, storey: q.lv } : { storey: q.lv });
      // exterior: exposed runs per side
      const runsBy = {};
      for (const side of ['s', 'n', 'e', 'w']) {
        const si = sideInfo(s, side), runs = []; let cur = null;
        for (let p = si.a + 0.75; p <= si.b - 0.75; p += 0.5) {
          const [ox, oz] = toW(C, si.horiz ? p : si.fixed + si.out * 1.1, si.horiz ? si.fixed + si.out * 1.1 : p);
          const free = occ.at(ox, oz) === -1 && !ctx.onDeck(ox, oz);
          const g = free ? w.groundAt(ox, oz) - C.floorY : 99;
          const nearEnd = ends[side].some(e => Math.abs(e - p) < 0.9) || gapsWorld.some(([gx, gz]) => Math.hypot(gx - (si.horiz ? p : si.fixed), gz - (si.horiz ? si.fixed : p)) < 2.2);
          // sunk / half-buried blocks may open onto higher (or lower) sand: a ramp is dug to the door
          const okDoor = free && Math.abs(g) < (o.sunk ? 3.4 : 0.9) && !nearEnd, okWin = free && g < 1.2 && !nearEnd;
          if (okWin || (o.sunk && okDoor)) { if (!cur) { cur = { a: p, b: p, door: [], g: [], free: [] }; runs.push(cur); } cur.b = p; if (okDoor) { cur.door.push(p); cur.g.push(g); } }
          else cur = null;
        }
        runsBy[side] = runs;
      }
      // choose doors: prefer south/street-facing runs with the most walkable frontage
      const cand = [];
      for (const side of ['s', 'n', 'e', 'w']) for (const r of runsBy[side]) if (r.door.length >= 5) {
        const mg = r.g.reduce((a, v) => a + Math.abs(v), 0) / r.g.length;
        cand.push({ side, r, score: r.door.length * (side === 's' ? 1.3 : 1) * (0.6 + rng() * 0.8) / (1 + mg * 2) });
      }
      cand.sort((a, b) => b.score - a.score);
      const perim = 2 * (W + D);
      const wantDoors = ruin ? 3 : garage ? 4 : C.segs.length > 1 ? (k === 0 || k === C.segs.length - 1 ? 1 : (rng() < 0.4 ? 1 : 0)) + (perim > 90 ? 1 : 0) : 1 + (perim > 50 ? 1 : 0) + (perim > 100 ? 1 : 0);
      const doorPos = [];
      let made = 0;
      for (const c of cand) {
        if (made >= wantDoors) break;
        const pts = c.r.door, pi = Math.floor(pts.length * (0.3 + rng() * 0.4)), p = pts[pi], pg = c.r.g[pi];
        if (doorPos.some(([sd, q]) => sd === c.side && Math.abs(q - p) < 4)) continue;
        const gw = ruin ? 2 + rng() * 1.5 : garage ? 5 : C.kind === 'i' && rng() < 0.6 ? 3.5 : C.kind === 'c' || C.kind === 's' ? 2.4 : 1.6;
        const si0 = sideInfo(s, c.side);
        if (p - gw / 2 < si0.a + 0.5 || p + gw / 2 > si0.b - 0.5) continue;
        const real = !ruin && !lockId && !garage && rng() < 0.45;
        addGap(c.side, p - gw / 2, gw, lockId ? { door: true, locked: lockId } : real ? { door: true } : {});
        doorPos.push([c.side, p]); made++;
        if (Math.abs(pg) > 0.35) digRamp(ctx, C, s, c.side, p, gw);
        ctx.doorsOut.push(si0.horiz ? toW(C, p, si0.fixed + si0.out * 1.5) : toW(C, si0.fixed + si0.out * 1.5, p));
      }
      const lastOfSealed = C.segs.length === 1 ? !gapsWorld.length : k === C.segs.length - 1 && !C.segs.some(t => t !== s && t.doorCount);
      if (!made && lastOfSealed) {   // sealed building: open the free wall spot nearest to the sand level (dig a ramp if needed)
        let best = null;
        for (const side of ['s', 'n', 'e', 'w']) {
          const si = sideInfo(s, side);
          for (let p = si.a + 1.6; p <= si.b - 1.6; p += 0.5) {
            const [ox, oz] = toW(C, si.horiz ? p : si.fixed + si.out * 1.1, si.horiz ? si.fixed + si.out * 1.1 : p);
            if (occ.at(ox, oz) !== -1 || ctx.onDeck(ox, oz) || ends[side].some(e => Math.abs(e - p) < 1.2)) continue;
            const g = w.groundAt(ox, oz) - C.floorY;
            if (!best || Math.abs(g) < Math.abs(best.g)) best = { side, p, g };
          }
        }
        if (best && Math.abs(best.g) < 4) {
          const gw = 1.8;
          addGap(best.side, best.p - gw / 2, gw, lockId ? { door: true, locked: lockId } : {});
          doorPos.push([best.side, best.p]); made++;
          if (Math.abs(best.g) > 0.35) digRamp(ctx, C, s, best.side, best.p, gw);
          const si = sideInfo(s, best.side);
          ctx.doorsOut.push(si.horiz ? toW(C, best.p, si.fixed + si.out * 1.5) : toW(C, si.fixed + si.out * 1.5, best.p));
        } else (ctx.sealed = ctx.sealed || []).push(C.bi);
      }
      s.doorCount = made;
      // windows (sills) along exposed runs; ruins get ragged breaches instead
      for (const side of ['s', 'n', 'e', 'w']) for (const r of runsBy[side]) {
        const step = ruin ? 3.2 + rng() * 2 : C.kind === 'i' ? 7 : garage ? 7 : 3.6 + rng() * 0.8;
        for (let p = r.a + 1.2; p + 1.2 <= r.b; p += step) {
          if (doorPos.some(([sd, q]) => sd === side && Math.abs(q - p) < 2.6 + (garage ? 2 : 0))) continue;
          if (gapsWorld.some(([gx, gz]) => { const si = sideInfo(s, side); return Math.hypot(gx - (si.horiz ? p : si.fixed), gz - (si.horiz ? si.fixed : p)) < 2; })) continue;
          const ww = ruin ? 1.6 + rng() * 1.6 : garage ? 4.5 : C.kind === 's' && side === 's' ? 2.2 : 1.3;
          const si = sideInfo(s, side);
          if (p - ww / 2 < si.a + 0.6 || p + ww / 2 > si.b - 0.6) continue;
          addGap(side, p - ww / 2, ww, { sill: ruin ? 0.4 + rng() * 0.6 : C.kind === 's' && side === 's' ? 0.7 : 1.0, top: ruin ? 9 : garage ? 2.6 : undefined });
        }
      }
      // upper walkable storeys: windows on every side that is not shared with a neighbour of the complex
      for (let lv = 1; lv < levels; lv++) for (const side of ['s', 'n', 'e', 'w']) {
        const si = sideInfo(s, side), step = garage ? 7 : tower ? 4.2 : 3.6;
        for (let p = si.a + (garage ? 3 : 1.6); p + (garage ? 3 : 1.6) <= si.b; p += step) {
          const [ox, oz] = toW(C, si.horiz ? p : si.fixed + si.out * 1.1, si.horiz ? si.fixed + si.out * 1.1 : p);
          const oc = occ.at(ox, oz); if (oc !== -1 && oc < 90000 && ctx.segs[oc] && ctx.segs[oc].C === C) continue;
          if (walls.some(([a, b, c, d, , l2]) => l2 === lv && (a === c ? (side === 'n' && b <= 0.01 || side === 's' && d >= D - 0.01) && Math.abs(s.x0 + a - p) < 1.2 : (side === 'w' && a <= 0.01 || side === 'e' && c >= W - 0.01) && Math.abs(s.z0 + b - p) < 1.2))) continue;
          const ww = garage ? 5 : 1.3;
          addGap(side, p - ww / 2, ww, { sill: 1.0, storey: lv, top: garage ? 2.7 : undefined });
        }
      }
      // ---- the building itself
      const segTintName = rowVar && k > 0 && !o.tint ? TINT_CYCLE[Math.floor(rng() * TINT_CYCLE.length)] : tintName;
      const segTint = tint == null ? null : TINT[segTintName];
      const h = ruin ? 2.2 + rng() * 1.6 : undefined;
      const segGable = (rowVar ? (gable ? rng() < 0.8 : rng() < 0.25) : gable) && !tower && !garage;
      const extras = [];
      const keepRoof = flights ? flights.filter(f => f.to === 'top').map(f => f.res) : [];
      if (!segGable && !ruin && !garage) {
        const nEx = Math.floor(W * D / 70);
        for (let i = 0; i < nEx; i++) {
          const ex = 1 + rng() * Math.max(0.5, W - 4), ez = 1 + rng() * Math.max(0.5, D - 4), t = rng();
          if (keepRoof.some(r => ex < r[2] + 1 && ex + 2.2 > r[0] - 1 && ez < r[3] + 1 && ez + 1.3 > r[1] - 1)) continue;
          if (t < 0.35) extras.push(Object.assign([ex, ez, ex + 1.3, ez + 1.3, 1.6], { tex: 'metalPanel' }));        // water tank
          else if (t < 0.6) extras.push(Object.assign([ex, ez, ex + 2.2, ez + 1.2, 0.25], { tex: 'metalPanel' }));  // solar panel
          else if (t < 0.8) extras.push(Object.assign([ex, ez, ex + 0.7, ez + 0.7, 1.4], { tex: 'brick' }));        // chimney
          else extras.push(Object.assign([ex, ez, ex + 1.6, ez + 1.0, 0.8], { tex: 'rust' }));                     // AC unit
        }
      }
      // exterior roof ladder (flat roofs, never on key wings): a spot on a ground-level run away from openings
      let ladder = null;
      if (!ruin && !isKey && !segGable && !tower && storeys >= 1 && (o.upper || garage ? true : C.o.poi ? rng() < 0.45 : ctx.low.at(...toW(C, (s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2)) > 0.75 && rng() < 0.3)) {
        const opts = [];
        for (const side of ['n', 'e', 'w', 's']) for (const r of runsBy[side]) for (const p of r.door) {
          const si = sideInfo(s, side);
          if (p < si.a + 1.2 || p > si.b - 1.2) continue;
          const near = gapsWorld.concat(...gapsUp.filter(Boolean)).some(([gx, gz]) => Math.hypot(gx - (si.horiz ? p : si.fixed), gz - (si.horiz ? si.fixed : p)) < 1.8);
          if (!near) opts.push([side, p]);
        }
        if (opts.length) { const [side, p] = opts[Math.floor(rng() * opts.length)]; ladder = { side, at: R2(p - sideInfo(s, side).a) }; }
      }
      const [wcx, wcz] = toW(C, (s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2);
      const realFloors = levels > 1;
      const bb = w.building({
        x: wcx - W / 2, z: wcz - D / 2, w: W, d: D, rot: C.rot || undefined, storeys, h, wall: o.wall || st.wall, floor: floorTex, roof: segGable ? 'roofTile' : st.roof,
        roofShape: segGable ? 'gable' : undefined, roofTint: segGable ? roofTint : undefined, tint: segTint, thick: 0.3,
        doors, inner: walls, peek: ruin ? 0 : tower ? 0.85 : 0.72, name: o.name || null,
        roofExtras: extras, floorY: C.floorY, blend: C.o.sunk ? 0.8 : 1.6, trim: 'damConcrete', innerH: 3.0,
        vents: !segGable && !ruin && !garage ? undefined : 0, parapet: !ruin, facade: !ruin,
        floors: realFloors, perStorey: realFloors,
        stairs: flights ? flights.map(f => ({ x: f.x, z: f.z, w: f.w, dir: f.dir, from: f.from, to: f.to })) : undefined,
        ladders: ladder ? [ladder] : undefined,
      });
      s.bid = bb.id; s.ruin = ruin; s.isKey = isKey; s.bb = bb; s.levels = levels; s.flights = flights; s.gable = segGable; s.ladder = !!ladder; s.storeys = storeys;
      const hh = h ?? storeys * 3.2, span = Math.min(W, D);
      s.roofY = C.floorY + hh + 0.25;
      s.roofTop = s.roofY + (segGable ? Math.max(0, Math.floor(Math.max(2, Math.floor(span / 0.9)) / 2 - 0.01)) * 0.45 : 0);
      if (isKey) ctx.keySegs.push({ id: o.key, name: o.keyName || o.name || o.key, s, C, y0: C.floorY + (keyLv || 0) * 3.2 });
      // ---- facade dressing on the visible (south) face for the storeys that are only visual
      if (!ruin && storeys > levels) dressFacade(ctx, s, C, bb.id, storeys, runsBy.s, segTintName, levels);
      if (ruin) for (let i = 0; i < Math.max(1, Math.floor(W * D / 60)); i++) w.prop(rng() < 0.5 ? 'sc_rubble' : 'sc_rubble2', ...toW(C, s.x0 + 1.5 + rng() * (W - 3), s.z0 + 1.5 + rng() * (D - 3)), rng() * 6, { solid: true });
      if (garage) garageDressing(ctx, C, s, levels);
      if (tower) towerDressing(ctx, C, s, levels);
      // ---- rooms → furniture + loot (per walkable storey)
      const resW = (lv) => resAt(lv).map(r => [s.x0 + r[0], s.z0 + r[1], s.x0 + r[2], s.z0 + r[3]]);
      if (!garage && !tower) roomsBy.forEach((rl, lv) => {
        for (const r of rl) C.rooms.push({ x0: s.x0 + r[0], z0: s.z0 + r[1], x1: s.x0 + r[2], z1: s.z0 + r[3], seg: s, C, key: keyAt(lv) ? o.key : null, ruin, storey: lv,
          gaps: (lv ? (gapsUp[lv] || []) : gapsWorld).concat(innerGapsBy[lv]), res: resW(lv) });
      });
    });
  }
}

// ---- rooftop routes ------------------------------------------------------------------------------
// Sandy City is crossed as much over its roofs as through its lanes. Neighbouring flat roofs of the
// same height get plank bridges; a roof up to one storey higher gets a plank + ladder; every connected
// cluster of roofs gets at least one ladder from the street. Key wings are fine as stepping stones
// (their roofs have no hatch, their upper windows have sills).
function closestOnPoly(P, x, z) { let best = null; for (let i = 0; i < P.length; i++) { const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length], [d, t] = segDist(x, z, ax, az, bx, bz); if (!best || d < best.d) best = { d, x: ax + (bx - ax) * t, z: az + (bz - az) * t, t, i }; } return best; }
function roofRoutes(ctx) {
  const { w, rng, occ } = ctx;
  const roofs = ctx.segs.filter(s => s.bb && !s.ruin && !s.gable && s.storeys >= 1 && !s.C.o.tower);
  const parent = new Map(roofs.map(s => [s, s])), find = (s) => { while (parent.get(s) !== s) s = parent.get(s); return s; };
  const join = (a, b) => parent.set(find(a), find(b));
  const pairs = [];
  for (let i = 0; i < roofs.length; i++) for (let j = i + 1; j < roofs.length; j++) {
    const A = roofs[i], Bs = roofs[j]; if (!bboxHit(A.poly, Bs.poly, 7)) continue;
    if (A.C === Bs.C && Math.abs(A.roofY - Bs.roofY) < 0.3) { join(A, Bs); continue; }   // touching parts of one block
    // closest boundary points (sampled), away from corners
    let best = null;
    for (let e = 0; e < 4; e++) { const [ax, az] = A.poly[e], [bx, bz] = A.poly[(e + 1) % 4], L = Math.hypot(bx - ax, bz - az);
      for (let t = 1.5; t <= L - 1.5; t += 1) { const x = ax + (bx - ax) * t / L, z = az + (bz - az) * t / L, q = closestOnPoly(Bs.poly, x, z); if (!best || q.d < best.d) best = { d: q.d, ax: x, az: z, bx: q.x, bz: q.z, qi: q.i, qt: q.t }; } }
    if (!best || best.d > 9) continue;
    const [qx0, qz0] = Bs.poly[best.qi], [qx1, qz1] = Bs.poly[(best.qi + 1) % 4], ql = Math.hypot(qx1 - qx0, qz1 - qz0);
    if (Math.hypot(best.bx - qx0, best.bz - qz0) < 1.5 || Math.hypot(best.bx - qx1, best.bz - qz1) < 1.5 || ql < 4) continue;
    pairs.push({ A, B: Bs, ...best, dh: Bs.roofY - A.roofY });
  }
  pairs.sort((p, q) => p.d - q.d);
  ctx.pairDbg = { pairs: pairs.length, dh: pairs.map(p => +p.dh.toFixed(1)) };
  let planks = 0, ladders = 0;
  const used = new Map();
  for (const pr of pairs) {
    if (planks >= 70) break;
    const { A, B: Bs, dh } = pr;
    if ((used.get(A) || 0) >= 3 || (used.get(Bs) || 0) >= 3) continue;
    if (Math.abs(dh) > 3.5 || (Math.abs(dh) > 0.45 && pr.d > 5)) continue;
    if (find(A) === find(Bs) && rng() < 0.6) continue;
    if (pr.d < 0.25) {
      // walls touching: same height = one roofscape already; otherwise a ladder up the taller wall
      if (Math.abs(dh) > 0.45) {
        const [ccx, ccz] = (() => { const P = dh >= 0 ? A.poly : Bs.poly; return [P.reduce((q, p) => q + p[0], 0) / 4, P.reduce((q, p) => q + p[1], 0) / 4]; })();
        let vx = pr.ax - ccx, vz = pr.az - ccz; const vl = Math.hypot(vx, vz); vx /= vl; vz /= vl;   // from the lower roof's centre toward the joint
        const lo = dh >= 0 ? A : Bs, hi = dh >= 0 ? Bs : A;
        const n = closestOnPoly(lo.poly, pr.ax, pr.az), [p0x, p0z] = lo.poly[n.i], [p1x, p1z] = lo.poly[(n.i + 1) % 4], el = Math.hypot(p1x - p0x, p1z - p0z);
        let nx = (p1z - p0z) / el, nz = -(p1x - p0x) / el; if (nx * vx + nz * vz < 0) { nx = -nx; nz = -nz; }   // outward normal of the lower block at the joint
        w.ladder(pr.ax - nx * 0.6, pr.az - nz * 0.6, lo.roofY, pr.ax + nx * 0.8, pr.az + nz * 0.8, hi.roofY, Math.atan2(-nx, -nz));
        ladders++;
      }
      join(A, Bs); continue;
    }
    const ux = (pr.bx - pr.ax) / pr.d, uz = (pr.bz - pr.az) / pr.d;
    // the span between the two walls must be open air (no third building in the way)
    let clear = true;
    for (let t = 0.3; t < pr.d - 0.3; t += 0.5) { const o = occ.at(pr.ax + ux * t, pr.az + uz * t); if (o !== -1 && o < 90000 && ctx.segs[o] !== A && ctx.segs[o] !== Bs) { clear = false; break; } }
    if (!clear) continue;
    const lo = dh >= 0 ? A : Bs, hi = dh >= 0 ? Bs : A, y = lo.roofY;
    const [sx, sz, ex, ez] = dh >= 0 ? [pr.ax - ux * 1.0, pr.az - uz * 1.0, pr.bx + ux * 1.0, pr.bz + uz * 1.0] : [pr.bx + ux * 1.0, pr.bz + uz * 1.0, pr.ax - ux * 1.0, pr.az - uz * 1.0];
    if (Math.abs(dh) <= 0.45) {
      w.bridge([[sx, sz], [ex, ez]], 1.4, Math.max(A.roofY, Bs.roofY), 'wood', { thick: 0.18, rails: false, pillars: 0 });
    } else {
      // plank from the lower roof to the higher wall, ladder up its face
      const dx = ex - sx, dz = ez - sz, dl = Math.hypot(dx, dz), vx = dx / dl, vz = dz / dl;
      const wx = ex - vx * 1.0, wz = ez - vz * 1.0;                   // the higher building's wall face
      w.bridge([[sx, sz], [wx - vx * 0.1, wz - vz * 0.1]], 1.4, y, 'wood', { thick: 0.18, rails: false, pillars: 0 });
      w.ladder(wx - vx * 0.55, wz - vz * 0.55, y, wx + vx * 0.75, wz + vz * 0.75, hi.roofY, Math.atan2(-vx, -vz));
      ladders++;
    }
    planks++; used.set(A, (used.get(A) || 0) + 1); used.set(Bs, (used.get(Bs) || 0) + 1); join(A, Bs);
    (ctx.planks ||= []).push([sx, sz, ex, ez, y]);
  }
  // every cluster of two or more roofs gets a way up from the street
  const clusters = new Map();
  for (const s of roofs) { const r = find(s); if (!clusters.has(r)) clusters.set(r, []); clusters.get(r).push(s); }
  let added = 0;
  for (const list of clusters.values()) {
    if (list.length < 2 || list.some(s => s.ladder)) continue;
    for (const s of list) {
      if (s.isKey) continue;
      const C = s.C; let spot = null;
      for (const side of ['s', 'n', 'e', 'w']) {
        const si = sideInfo(s, side);
        for (let p = si.a + 1.5; p <= si.b - 1.5 && !spot; p += 1) {
          const [ox, oz] = toW(C, si.horiz ? p : si.fixed + si.out * 1.2, si.horiz ? si.fixed + si.out * 1.2 : p);
          if (occ.at(ox, oz) !== -1 || ctx.onDeck(ox, oz) || ctx.nearDoor(ox, oz, 2) || Math.abs(w.groundAt(ox, oz) - C.floorY) > 0.6) continue;
          const [bx, bz] = toW(C, si.horiz ? p : si.fixed + si.out * 0.55, si.horiz ? si.fixed + si.out * 0.55 : p);
          const [tx, tz] = toW(C, si.horiz ? p : si.fixed - si.out * 0.75, si.horiz ? si.fixed - si.out * 0.75 : p);
          spot = [bx, bz, tx, tz];
        }
        if (spot) break;
      }
      if (!spot) continue;
      const [bx, bz, tx, tz] = spot;
      w.ladder(bx, bz, null, tx, tz, s.roofY, Math.atan2(bx - tx, bz - tz));
      ctx.keepClear.push([bx, bz, 1.2]); s.ladder = true; added++; break;
    }
  }
  ctx.routeStats = { roofs: roofs.length, planks, roofLadders: ladders, streetLadders: added, clusters: [...clusters.values()].filter(l => l.length > 1).length };
}

// Parking Garage: open decks on a column grid, cars and loot on every level and on the roof
function garageDressing(ctx, C, s, levels) {
  const { w, rng } = ctx, W = s.x1 - s.x0, D = s.z1 - s.z0, R = C.R || undefined;
  const res = (s.flights || []).map(f => f.res);
  const freeOf = (lx, lz, m) => !res.some(r => lx > r[0] - m && lx < r[2] + m && lz > r[1] - m && lz < r[3] + m);
  const cols = [];
  for (let lx = 9; lx < W - 6; lx += 10) for (let lz = 8; lz < D - 6; lz += 10) if (freeOf(lx, lz, 1.2)) cols.push([lx, lz]);
  for (let lv = 0; lv < levels; lv++) {
    for (const [lx, lz] of cols) w.block(s.x0 + lx - 0.4, s.z0 + lz - 0.4, s.x0 + lx + 0.4, s.z0 + lz + 0.4, 2.95, 'concrete', { onBuilding: s.bid, rel0: lv * 3.2 || 0, R, cutaway: true });
    const y = lv ? C.floorY + lv * 3.2 : null;
    const at = (o) => (y != null ? { ...o, yAbs: y } : o);
    // parking bays along the long sides: cars nose-in, a few trunks to search
    for (let i = 0; i < 7; i++) {
      const lx = 6 + rng() * (W - 12), lz = rng() < 0.5 ? 3.4 : D - 3.4;
      if (!freeOf(lx, lz, 1.5) || cols.some(([cx, cz]) => Math.hypot(cx - lx, cz - lz) < 2.6)) continue;
      const rot = (lz < D / 2 ? 0 : Math.PI) - C.rot + (rng() - 0.5) * 0.2, [x, z] = toW(C, s.x0 + lx, s.z0 + lz);
      w.prop(['sc_fiat', 'sc_fiat2', 'sc_fiat3', 'sc_fiat4'][Math.floor(rng() * 4)], x, z, rot, at({ solid: true }));
      if (rng() < 0.45) w.container('car_trunk', ...toW(C, s.x0 + lx, s.z0 + (lz < D / 2 ? lz + 2.6 : lz - 2.6)), rot, at({ tier: lv >= 2 ? 2 : 1 }));
    }
    for (let i = 0; i < 3; i++) {
      const lx = 3 + rng() * (W - 6), lz = 3 + rng() * (D - 6);
      if (!freeOf(lx, lz, 1) || cols.some(([cx, cz]) => Math.hypot(cx - lx, cz - lz) < 1.6)) continue;
      const t = rng(), k = t < 0.4 ? 'barrel' : t < 0.7 ? 'sc_cratestack' : 'sc_barrier';
      w.prop(k, ...toW(C, s.x0 + lx, s.z0 + lz), rng() * 6, at({ solid: true }));
      if (rng() < 0.5) w.container(rng() < 0.5 ? 'toolbox' : 'locker', ...toW(C, s.x0 + lx + 1.3, s.z0 + lz), 0, at({ tier: 2 }));
    }
    for (let i = 0; i < 2; i++) { const [x, z] = toW(C, s.x0 + W * (0.3 + i * 0.4), s.z0 + D / 2); w.lamp(x, z, { yAbs: (y ?? C.floorY) + 2.7, color: 0xd8e8ff, intensity: 1.0, range: 11, flicker: rng() < 0.4 ? 0.5 : 0, model: null }); }
  }
  // roof deck: a couple of abandoned cars + a lamp mast
  for (let i = 0; i < 4; i++) {
    const lx = 6 + rng() * (W - 12), lz = 6 + rng() * (D - 12);
    if (!freeOf(lx, lz, 2)) continue;
    w.prop(['sc_fiat2', 'sc_fiat4', 'sc_carroof'][i % 3], ...toW(C, s.x0 + lx, s.z0 + lz), rng() * 6, { yAbs: s.roofY, solid: true });
  }
  w.container('raider_cache', ...toW(C, s.x0 + W / 2, s.z0 + D / 2 + 3), 0, { yAbs: s.roofY, tier: 3 });
  w.lamp(...toW(C, s.x0 + W / 2, s.z0 + D / 2), { yAbs: s.roofY + 2.8, color: 0xffe0b0, intensity: 1.2, range: 12, model: null });
}
// towers (lighthouse, slide tower): stairs to the top, a crate or two on the landings, lights on every floor
function towerDressing(ctx, C, s, levels) {
  const { w, rng } = ctx, W = s.x1 - s.x0, D = s.z1 - s.z0;
  const res = (s.flights || []).map(f => f.res);
  for (let lv = 0; lv < levels; lv++) {
    const y = C.floorY + lv * 3.2, free = [];
    for (const [lx, lz] of [[W / 2, 1.0], [W / 2, D - 1.0], [1.0, D / 2], [W - 1.0, D / 2]]) if (!res.some(r => lx > r[0] - 0.4 && lx < r[2] + 0.4 && lz > r[1] - 0.4 && lz < r[3] + 0.4)) free.push([lx, lz]);
    if (free.length && (lv % 2 === 1 || lv === levels - 1)) { const [lx, lz] = free[Math.floor(rng() * free.length)]; w.container(lv === levels - 1 ? 'weapon_case' : rng() < 0.5 ? 'crate' : 'ammo_box', ...toW(C, s.x0 + lx, s.z0 + lz), -C.rot, lv ? { yAbs: y, tier: lv === levels - 1 ? 3 : 2 } : { tier: 2 }); }
    w.lamp(...toW(C, s.x0 + W / 2, s.z0 + D / 2), { yAbs: y + 2.6, color: 0xffd090, intensity: 0.8, range: 7, flicker: 0.3, model: null });
  }
}

const SHUTTER = { cream: 0x9ac0a0, ochre: 0x88b090, pink: 0xa8c8b0, terracotta: 0xd8c8a8, peach: 0x8ab09a, yellow: 0x7aa080, rose: 0xc0d0b8, sand: 0x90b8a0, white: 0x88a8c8, red: 0xd8c8a8, sky: 0xe8d0a0 };
function dressFacade(ctx, s, C, bid, storeys, southRuns, tintName, from = 1) {
  const { w, rng } = ctx;
  const W = s.x1 - s.x0, sh = 3.2, z = s.z1;
  const shutterTint = SHUTTER[tintName] || 0x9ac0a0;
  const opt = (y, extra = {}) => ({ onBuilding: bid, rel0: y, cutaway: true, collide: false, cast: false, R: C.R || undefined, ...extra });
  const balc = C.kind === 'a' || C.kind === 'h' ? rng() < 0.55 : false;
  for (let st = Math.max(1, from); st < storeys; st++) {
    const y = st * sh + 0.8;
    for (let x = s.x0 + 1.6; x <= s.x1 - 1.6; x += 3.2) {
      if (C.kind === 'i') continue;
      if (!ctx.occFreeSouth(C, s, x)) continue;
      w.block(x - 0.55, z - 0.02, x + 0.55, z + 0.1, 1.5, 'roofTar', opt(y));
      if (C.kind !== 'm' && C.kind !== 't' && C.kind !== 'p') {
        w.block(x - 1.0, z, x - 0.58, z + 0.12, 1.5, 'wood', opt(y, { tint: shutterTint }));
        w.block(x + 0.58, z, x + 1.0, z + 0.12, 1.5, 'wood', opt(y, { tint: shutterTint }));
      }
      if (balc && (Math.round((x - s.x0) / 3.2) + st) % 3 === 0) {
        w.block(x - 1.1, z, x + 1.1, z + 0.28, 0.15, 'damConcrete', opt(y - 0.75));
        w.block(x - 1.1, z + 0.2, x + 1.1, z + 0.28, 0.85, 'rust', opt(y - 0.6));
        if (rng() < 0.35) w.block(x - 0.9, z + 0.05, x - 0.4, z + 0.27, 0.5, 'roofTile', opt(y - 0.6, { tint: 0xffffff }));
      }
    }
  }
}


// =====================================================================================================
// TERRAIN: a town on a gentle slope down to the old shore, a hill in the north, dune sea to the west and
// south, the dried-out sea bed to the east
// =====================================================================================================
// town floor: ~6 m at the sea wall rising inland to ~9.5 m at the dune edge
function townH(x, z) { return 6 + clamp((700 - x) * 0.0055, 0, 3.6) + (fbm(N1, x, z, 160) - 0.5) * 1.4; }
// dune sea: crests marching in from the south-west (steep lee faces to the north-east) and a high rim
// along the west, north and south edges; the east edge is the sea bed
function duneH(x, z) {
  const edge = Math.min(x, z * 1.15, MH - z);
  const rim = Math.pow(1 - sstep(0, 190, edge), 1.6) * 12;
  const base = 2.2 + fbm(N2, x, z, 150) * 8;
  const warp = fbm(N3, x, z, 90) * 80, per = 48 + fbm(N1, x + 300, z, 200) * 36;
  const u = (x * 0.62 - z * 0.78 + warp) / per, f = u - Math.floor(u);
  const crest = f < 0.72 ? f / 0.72 : (1 - f) / 0.28;              // long windward slope, steep lee face
  const amp = fbm(N4, x, z, 110), on = sstep(0.3, 0.6, amp);
  const u2 = (x * 0.95 + z * 0.3 + warp * 0.5) / 82, f2 = u2 - Math.floor(u2), c2 = f2 < 0.6 ? f2 / 0.6 : (1 - f2) / 0.4;
  return base + rim + crest * crest * (1.5 + amp * 6.5) * on + c2 * c2 * 2.2 * (1 - on);
}
// Upper Sandy: distance to the plateau rim, slope width interpolated along the rim
function hillAdd(x, z) {
  if (x < 220 || x > 590 || z < 100 || z > 390) return 0;
  const inside = inPoly(x, z, HILL);
  if (inside) return HILL_H + (fbm(N3, x, z, 40) - 0.5) * 0.5;
  let best = 1e9, wd = 5;
  for (let i = 0, n = HILL.length; i < n; i++) {
    const j = (i + 1) % n, [d, t] = segDist(x, z, HILL[i][0], HILL[i][1], HILL[j][0], HILL[j][1]);
    if (d < best) { best = d; wd = lerp(HILL_W[i], HILL_W[j], t); }
  }
  return best >= wd ? 0 : HILL_H * (1 - sstep(0, wd, best));
}
// the Sandphitheatre: stepped seating rings cut into the hill's west flank, a flat stage at its foot
function theatreH(x, z, h) {
  const dx = x - THEATRE.x, dz = z - THEATRE.z, r = Math.hypot(dx, dz);
  if (r > THEATRE.r1 + 1) return h;
  const base = townH(THEATRE.x, THEATRE.z);
  if (r <= THEATRE.r0) return dx > -9 ? base : h;                     // stage + orchestra
  if (Math.abs(Math.atan2(dz, dx)) > THEATRE.half) return h;
  return base + Math.min(HILL_H + 0.2, (Math.floor((r - THEATRE.r0) / 1.8) + 1) * 0.42);
}
// sea bed: rippled flats around 1 m, sand bars, the old harbour channel out of the marina
function seabedH(x, z) {
  const rip = Math.sin((x * 0.8 + z * 0.6) / 2.6 + fbm(N2, x, z, 30) * 6) * 0.08;
  const bars = sstep(0.55, 0.8, fbm(N4, x * 1.4, z, 70)) * 1.6;
  const chan = Math.exp(-((z - 352 - (x - 700) * 0.12) ** 2) / (2 * 14 * 14)) * sstep(640, 700, x) * 0.9;
  return 0.9 + (fbm(N3, x, z, 80) - 0.5) * 0.9 + rip + bars - chan;
}
function shapeTerrain(ctx) {
  const { w } = ctx;
  const L = new Mask(3).poly(TOWN, 0.66).poly(CORE, 1);
  for (const f of FLATS) L.poly(f.pts, f.v);
  L.line(BYPASS, 26, 0.45);
  L.blur(5, 2);
  ctx.low = L;
  ctx.isSea = (x, z, m = 0) => { if (inPoly(x, z, SEA)) return true; return m > 0 && x > 600 && polyDist(x, z, COAST)[0] < m; };
  // evaluate on a 2 m lattice and interpolate (dune features are >= ~15 m)
  const G = 2, gw = MW / G + 1, gh = MH / G + 1, hg = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) {
    const x = i * G, z = j * G, l = L.at(x, z), d = sstep(0.03, 0.97, 1 - l);
    let h = townH(x, z) + (d > 0.002 ? duneH(x, z) * d : 0) + hillAdd(x, z);
    h = theatreH(x, z, h);
    if (x > 600) {
      // the sea wall: a sharp drop where the town meets the old shore, a long sandy slope where the dunes do
      const inSea = inPoly(x, z, SEA), [cd] = polyDist(x, z, COAST);
      if (inSea || cd < 2) {
        const sd = inSea ? cd : -cd, cw = lerp(16, 1.2, sstep(0.45, 0.75, l));
        const t = sstep(-0.5, cw, sd);
        h = lerp(h, seabedH(x, z), t);
      }
    }
    hg[j * gw + i] = h;
  }
  w.heightFn((x, z) => {
    const fx = x / G, fz = z / G, i = Math.min(gw - 2, Math.floor(fx)), j = Math.min(gh - 2, Math.floor(fz)), u = fx - i, v = fz - j;
    return (hg[j * gw + i] * (1 - u) + hg[j * gw + i + 1] * u) * (1 - v) + (hg[(j + 1) * gw + i] * (1 - u) + hg[(j + 1) * gw + i + 1] * u) * v;
  }, 'set');
  // Upper Sandy's walled cliffs: the 2 m lattice smears the plateau edge into a slope just inside the rim,
  // a slot between the town wall and the plateau you could drop into but not climb out of. The plateau is
  // held at full height up to the rim and 0.9 m past it, so the drop happens under the wall (hillWalls).
  const walled = [];
  for (let i = 0; i < HILL.length; i++) { const j = (i + 1) % HILL.length; if (HILL_W[i] <= 4 && HILL_W[j] <= 4) walled.push([HILL[i], HILL[j]]); }
  const ramps = STREETS.filter(st => st[0] === 'northroad' || st[0] === 'eaststair').map(st => st[1]);
  w.heightFn((x, z) => {
    if (x < 286 || x > 545 || z < 132 || z > 280) return null;
    let best = 1e9; for (const [[ax, az], [bx, bz]] of walled) best = Math.min(best, segDist(x, z, ax, az, bx, bz)[0]);
    if (best > 3.5 || (best > 0.9 && !inPoly(x, z, HILL)) || ramps.some(r => polyDist(x, z, r)[0] < 7)) return null;
    const d = sstep(0.03, 0.97, 1 - L.at(x, z));
    return townH(x, z) + (d > 0.002 ? duneH(x, z) * d : 0) + HILL_H + (fbm(N3, x, z, 40) - 0.5) * 0.5;
  }, 'max');
}
// works on the old shore: breakwater + lighthouse platform, boat slipways down the sea wall
const SLIPS = [[708, 214, 1], [702, 268, 2], [624, 342, 3], [686, 398, 4], [721, 530, 5], [742, 610, 6], [775, 700, 7], [812, 778, 8]];
function coastWorks(ctx) {
  const { w } = ctx;
  const qy = townH(720, 466) + 0.1;
  ctx.jettyY = qy;
  w.ridge(JETTY, 8, qy, 2.5, 'max');
  w.ridge(JETTY2, 8, qy, 2.5, 'max');
  w.raiseCircle(LIGHTHOUSE[0], LIGHTHOUSE[1], 14, qy, 0.22, 'max');
  // slipways: a 4.5 m concrete ramp from the quay edge straight down onto the sea bed (seaward normal of the coast)
  ctx.slips = [];
  for (const [x, z] of SLIPS) {
    const [, s] = polyDist(x, z, COAST), [cx, cz, tx, tz] = pointAt(COAST, s);
    let nx = tz, nz = -tx;                                                // coast runs north->south: east-ish = right of travel
    if (!inPoly(cx + nx * 6, cz + nz * 6, SEA)) { nx = -nx; nz = -nz; }
    const a = [cx - nx * 3, cz - nz * 3], b = [cx + nx * 24, cz + nz * 24];
    const ya = w.groundAt(a[0], a[1]), yb = seabedH(b[0], b[1]);
    for (let u = 0; u <= 27; u += 0.5) {
      const t = u / 27, y = lerp(ya, yb, t), px = a[0] + (b[0] - a[0]) * t, pz = a[1] + (b[1] - a[1]) * t;
      w.ridge([[px, pz], [px + nx * 0.5, pz + nz * 0.5]], 4.6, y, 0.6, u < 3 ? 'min' : 'set');
    }
    w.path([a, b], 4.2, 'concrete');
    ctx.slips.push({ x: cx, z: cz, nx, nz, a, b });
  }
}
// buried edge buildings: pile a dune against their windward (south-west) side
function sunkMounds(ctx) {
  const { w } = ctx;
  for (const C of ctx.cxs) {
    if (!C.o.sunk) continue;
    const [x0, z0, x1, z1] = bounds(C.segs.flatMap(s => s.poly));
    const W = x1 - x0, D = z1 - z0, r = Math.max(W, D) * 0.85 + 6;
    w.raiseCircle(x0 + W * 0.15, z1 - D * 0.15, r, C.o.sunk * 1.7, 0.75, 'add');
  }
}
// drifts in streets and against walls
function sandDrifts(ctx) {
  const { w, rng, occ } = ctx;
  for (let i = 0; i < 420; i++) {
    const x = 150 + rng() * 640, z = 110 + rng() * 740;
    if (ctx.low.at(x, z) < 0.55 || ctx.isSea(x, z, 6)) continue;
    const r = 3 + rng() * 6;
    if (polyDist(x, z, BYPASS)[0] < BP_W / 2 + r + 2) continue;
    if (!occ.free(x - r * 0.6, z - r * 0.6, x + r * 0.6, z + r * 0.6)) continue;
    w.raiseCircle(x, z, r, 0.3 + rng() * 0.8, 0.85, 'add');
  }
  // drifts banked against the windward (local south / west) walls, only where the lane is open
  const openAlong = (C, ax, az, bx, bz) => { for (let t = 0; t <= 1; t += 0.2) { const [x, z] = toW(C, lerp(ax, bx, t), lerp(az, bz, t)); if (!occ.free(x - 1.5, z - 1.5, x + 1.5, z + 1.5) || ctx.isSea(x, z, 3)) return false; } return true; };
  for (const s of ctx.segs) {
    const C = s.C;
    if (rng() < 0.45 && openAlong(C, s.x0 + 1, s.z1 + 2.8, s.x1 - 1, s.z1 + 2.8)) w.ridge([toW(C, s.x0 + 1, s.z1 + 2.8), toW(C, s.x1 - 1, s.z1 + 2.8)], 1.5, 0.5 + rng() * 0.7, 2.5, 'add');
    if (rng() < 0.3 && openAlong(C, s.x0 - 2.8, s.z0 + 1, s.x0 - 2.8, s.z1 - 1)) w.ridge([toW(C, s.x0 - 2.8, s.z0 + 1), toW(C, s.x0 - 2.8, s.z1 - 1)], 1.5, 0.4 + rng() * 0.6, 2.5, 'add');
  }
}

// =====================================================================================================
// FRONTAGE: rows of houses, shops and flats lining the streets (planned before layout, resolved with it)
// =====================================================================================================
function rectQuad(cx, cz, L, W, a) {
  const ux = Math.cos(a), uz = Math.sin(a), nx = -uz, nz = ux, hl = L / 2, hw = W / 2;
  return [[cx - ux * hl - nx * hw, cz - uz * hl - nz * hw], [cx + ux * hl - nx * hw, cz + uz * hl - nz * hw], [cx + ux * hl + nx * hw, cz + uz * hl + nz * hw], [cx - ux * hl + nx * hw, cz - uz * hl + nz * hw]];
}
function planFrontage(ctx) {
  const { w, rng } = ctx;
  const planned = B.map(b => rectQuad(b[0], b[1], b[2], b[3], b[4] * D2R));
  const keep = KEEP_OUT.map(([a, b, c, d]) => [[a, b], [c, b], [c, d], [a, d]]).concat(PLAZAS.map(p => p.pts));
  const corridors = STREETS.map(s => ({ pts: s[1], hw: s[2] / 2 })).concat([{ pts: PROMENADE, hw: PROM_W / 2 }, { pts: BYPASS, hw: BP_W / 2 + 4 }],
    ctx.slips.map(s => ({ pts: [s.a, s.b], hw: 4 })), [{ pts: [[RB[0] - 1, RB[1]], [RB[0] + 1, RB[1]]], hw: RB_R + 4 }]);
  const inTheatre = (x, z) => Math.hypot(x - THEATRE.x, z - THEATRE.z) < THEATRE.r1 + 6 && x > THEATRE.x - 16;
  const pointOk = (x, z) => {
    if (!inPoly(x, z, TOWN) || ctx.low.at(x, z) < 0.6 || ctx.isSea(x, z, 6) || inTheatre(x, z)) return false;
    if (keep.some(p => inPoly(x, z, p))) return false;
    for (const c of corridors) if (polyDist(x, z, c.pts)[0] < c.hw + 1.4) return false;
    return true;
  };
  const tryPlace = (cx, cz, L, Wd, a, style, extra = {}) => {
    const Q = rectQuad(cx, cz, L, Wd, a);
    const pts = Q.concat([[cx, cz]], Q.map((p, i) => [(p[0] + Q[(i + 1) % 4][0]) / 2, (p[1] + Q[(i + 1) % 4][1]) / 2]));
    if (!pts.every(([x, z]) => pointOk(x, z))) return false;
    let mn = 1e9, mx = -1e9; for (const [x, z] of pts) { const g = w.groundAt(x, z); mn = Math.min(mn, g); mx = Math.max(mx, g); }
    const fringe = ctx.low.at(cx, cz) < 0.85;
    if (mx - mn > (fringe ? 2.4 : 1.5)) return false;
    if (planned.some(P => bboxHit(Q, P, 3) && quadsClash(Q, P, 2.6))) return false;
    planned.push(Q);
    const F = FRONT[style], kind = pickW(rng, F.kinds.map(([k, wt]) => [k, null, wt]))[0];
    let st = F.st[0] + Math.floor(rng() * (F.st[1] - F.st[0] + 1));
    if (kind === 'i') st = Math.min(st, 2); if (kind === 'h') st = Math.min(st, 3);
    const o = { ...extra };
    if (F.tints) o.tint = F.tints[Math.floor(rng() * F.tints.length)];
    if (fringe && rng() < 0.6) o.sunk = 1 + Math.round(rng() * 2) * 0.5;
    if (kind === 's' && rng() < 0.35) o.flat = true;
    ctx.gen.push([cx, cz, L, Wd, a / D2R, st, kind, o]);
    return true;
  };
  ctx.gen = [];
  const lines = STREETS.filter(s => s[4]).map(s => ({ pts: s[1], hw: s[2] / 2, style: s[4], sides: [1, -1] }))
    .concat([{ pts: PROMENADE, hw: PROM_W / 2, style: 'seaside', sides: [1] }]);
  for (const ln of lines) {
    const total = polyLen(ln.pts), F = FRONT[ln.style];
    for (const side of ln.sides) for (const row of [0, 1]) {
      if (row === 1 && (ln.style === 'hill' || ln.style === 'sheds' || ln.style === 'seaside' || ln.style === 'houses')) continue;
      let s = 7 + rng() * 4;
      while (s < total - 7) {
        const L = R2(lerp(F.len[0], F.len[1], rng())), D = R2(lerp(F.dep[0], F.dep[1], rng()));
        const p0 = pointAt(ln.pts, s), p1 = pointAt(ln.pts, Math.min(total, s + L));
        if (p0[4] !== p1[4]) {   // a bend within the building: restart at the next leg
          let acc = 0; for (let k = 0; k <= p0[4]; k++) acc += Math.hypot(ln.pts[k + 1][0] - ln.pts[k][0], ln.pts[k + 1][1] - ln.pts[k][1]);
          s = acc + 6; continue;
        }
        const [mx, mz, tx, tz] = pointAt(ln.pts, s + L / 2), nx = -tz * side, nz = tx * side;
        const set = ln.hw + 2.6 + rng() * 1.6 + (row ? 20 + rng() * 4 : 0);
        const ok = tryPlace(mx + nx * (set + D / 2), mz + nz * (set + D / 2), L, D, Math.atan2(tz, tx), ln.style);
        s += ok ? L + lerp(F.gap[0], F.gap[1], rng()) : 3;
      }
    }
  }
  // generated buildings inside a named place count as part of it (its loot density, its quest searches)
  for (const g of ctx.gen) {
    let best = null; for (const P of POIS) { const d = Math.hypot(P[2] - g[0], P[3] - g[1]); if (d < P[4] - 4 && (!best || P[4] < best[4])) best = P; }
    if (best) g[7].poi = best[0];
  }
  ctx.B = B.concat(ctx.gen);
}
// =====================================================================================================
// ELEVATED DECKS: the Bypass (elevated highway along the north, viaduct over the dry sea bed)
// =====================================================================================================
function deckProfile(ctx, pts, lift, from = 0, rampLen = 0) {
  const { w } = ctx;
  let acc = 0;
  const raw = pts.map(([x, z], k) => {
    if (k) acc += Math.hypot(x - pts[k - 1][0], z - pts[k - 1][1]);
    const g = w.groundAt(x, z), t = rampLen ? sstep(from, from + rampLen, acc) : 1;
    return Math.max(townH(x, z) + lift * t, g + 0.25);
  });
  for (let p = 0; p < 2; p++) for (let k = 1; k < raw.length - 1; k++) raw[k] = Math.max(raw[k] * 0.5 + (raw[k - 1] + raw[k + 1]) * 0.25, w.groundAt(pts[k][0], pts[k][1]) + 0.25);
  return raw;
}
// returns { pts, prof, width, gaps, ramps, from } and writes the deck into the heightfield
function makeDeck(ctx, D) {
  const { w } = ctx;
  const { pts, prof, width, gaps = [], ramps = [], from = 0 } = D;
  const hw = width / 2, W1 = MW + 1, arr = new Float32Array(W1 * (MH + 1)).fill(NaN), foot = new Uint8Array(W1 * (MH + 1));
  const inGap = s => s < from || gaps.some(([a, b]) => s >= a && s <= b);
  // bridge mode: where the deck stands > 1.6 m above the old street it becomes a real overpass (a slab on
  // piers you can walk under); low stretches stay a terrain embankment. Runs shorter than 8 m are merged.
  const total0 = polyLen(pts), yAt0 = s => { const p = pointAt(pts, s), k = p[4]; let a0 = 0; for (let i = 0; i < k; i++) a0 += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); const L = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); return lerp(prof[k], prof[k + 1], clamp((s - a0) / L, 0, 1)); };
  const elev = new Uint8Array(Math.ceil(total0) + 2);
  if (D.bridge) {
    for (let s2 = 0; s2 <= total0; s2++) { const [x, z] = pointAt(pts, s2); elev[s2] = yAt0(s2) - w.groundAt(x, z) > 1.6 ? 1 : 0; }
    for (let s2 = 0, run = 0; s2 <= total0 + 1; s2++) { if (elev[s2]) run++; else { if (run && run < 8) for (let q = s2 - run; q < s2; q++) elev[q] = 0; run = 0; } }
    for (const [a, b] of D.embank || []) for (let s2 = Math.max(0, a); s2 <= Math.min(total0, b); s2++) elev[s2] = 0;
  }
  const isBridge = s => D.bridge && !inGap(s) && !!elev[clamp(Math.round(s), 0, elev.length - 1)];
  let acc = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az);
    for (let z = Math.max(0, Math.floor(Math.min(az, bz) - hw - 1)); z <= Math.min(MH, Math.ceil(Math.max(az, bz) + hw + 1)); z++)
      for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - hw - 1)); x <= Math.min(MW, Math.ceil(Math.max(ax, bx) + hw + 1)); x++) {
        const [d, t] = segDist(x, z, ax, az, bx, bz);
        if (d > hw || inGap(acc + t * L)) continue;
        if (isBridge(acc + t * L)) { foot[z * W1 + x] = 1; continue; }
        arr[z * W1 + x] = lerp(prof[k], prof[k + 1], t);
      }
    acc += L;
  }
  D.total = acc;
  D.yAt = s => { const p = pointAt(pts, s), k = p[4]; let a0 = 0; for (let i = 0; i < k; i++) a0 += Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]); const L = Math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]); return lerp(prof[k], prof[k + 1], clamp((s - a0) / L, 0, 1)); };
  // sand ramps beside the deck (mode max)
  const R = ramps.map(([s, side]) => { const [px, pz, tx, tz] = pointAt(pts, s); const nx = -tz * side, nz = tx * side; return { s, side, px, pz, tx, tz, nx, nz, y: D.yAt(s), len: 15 }; });
  w.heightFn((x, z) => {
    const v = arr[z * W1 + x];
    let best = Number.isNaN(v) ? null : v;
    if (best == null) for (const r of R) {
      const dx = x - r.px, dz = z - r.pz, along = dx * r.tx + dz * r.tz, across = dx * r.nx + dz * r.nz;
      // on an overpass the drift runs on under the slab edge so its crest meets the deck flush
      if (across < hw - (D.bridge ? 1.6 : 0.5) || across > hw + r.len || Math.abs(along) > 7) continue;
      const k = Math.min(1, 1 - (across - hw) / r.len), lat = 1 - sstep(3.5, 7, Math.abs(along));
      const h = r.y * k * lat + w.groundAt(x, z) * (1 - k * lat);
      if (h > w.groundAt(x, z)) best = Math.max(best ?? -1e9, h);
    }
    return best;
  }, 'set');
  D.R = R; D.inGap = inGap; D.arr = arr; D.foot = foot; D.from = from; D.gaps = gaps; D.isBridge = isBridge;
  // deck surface height at a world point (null = not on the deck footprint)
  D.deckY = (x, z) => { const i = Math.round(z) * W1 + Math.round(x); if (i < 0 || i >= arr.length || (Number.isNaN(arr[i]) && !foot[i])) return null; return D.yAt(polyDist(x, z, pts)[1]); };
  return D;
}
// side walls, parapets, pilasters, broken ends — called after the heightfield is final
function dressDeck(ctx, D, { wallTex = 'damConcrete', pil = 'concrete', rail = 'damConcrete', step = 2 } = {}) {
  const { w, rng } = ctx;
  const hw = D.width / 2;
  const nearRamp = (s, side) => D.R.some(r => r.side === side && Math.abs(r.s - s) < 6.5);
  let lastGap = true;
  for (let s = D.from + step / 2; s < D.total; s += step) {
    const gap = D.inGap(s);
    const [px, pz, tx, tz] = pointAt(D.pts, s), y = D.yAt(s);
    if (gap) {
      if (!lastGap) brokenEnd(ctx, D, s - step / 2, 1);
      lastGap = true; continue;
    }
    if (lastGap && s > D.from + step) brokenEnd(ctx, D, s - step / 2, -1);
    lastGap = false;
    // side walls, parapets and pilasters as blocks turned to the deck's tangent (clean diagonals)
    const ang = Math.atan2(tz, tx), L2 = step / 2 + 0.12;
    const rblock = (cx, cz, hl, ht, h, tex, opts) => w.block(cx - hl, cz - ht, cx + hl, cz + ht, h, tex, { ...opts, rot: ang });
    const br = D.isBridge && D.isBridge(s);
    if (br) {
      // overpass: a slab you can walk on and under (overlapping pieces close the wedges on curves),
      // a pier pair + cap every 18 m, painted centre line, drifted sand on the asphalt
      w.bridge([[px - tx * (L2 + 0.5), pz - tz * (L2 + 0.5)], [px + tx * (L2 + 0.5), pz + tz * (L2 + 0.5)]], D.width, y, 'roofTar', { thick: 0.9, rails: false, pillars: 0 });
      const si = Math.round(s / step);
      if (si % 9 === 0) {
        for (const o2 of [-1, 1]) { const qx = px - tz * o2 * (hw - 2), qz = pz + tx * o2 * (hw - 2); rblock(qx, qz, 0.7, 0.55, 0, 'damConcrete', { pillarTo: y - 0.9 }); }
        rblock(px, pz, 0.55, hw - 0.6, 0.7, 'damConcrete', { y0: y - 1.6 });
      }
      if (si % 3 === 0) rblock(px, pz, 0.9, 0.08, 0.02, 'concrete', { y0: y, collide: false, cast: false, tint: 0xffd040 });
      if (rng() < 0.08) { const o2 = (rng() - 0.5) * (D.width - 3); rblock(px - tz * o2, pz + tx * o2, 1.5 + rng() * 2.5, 0.8 + rng() * 1.6, 0.06, 'sand', { y0: y, collide: false, cast: false }); }
    }
    for (const side of [1, -1]) {
      if (nearRamp(s, side)) continue;
      const nx = -tz * side, nz = tx * side;
      const wx = px + nx * (hw + 0.35), wz = pz + nz * (hw + 0.35);
      const g = Math.min(w.groundAt(wx - tx * L2, wz - tz * L2), w.groundAt(wx + tx * L2, wz + tz * L2), w.groundAt(wx + nx * 0.4, wz + nz * 0.4));
      if (!br && y - g > 0.6) rblock(wx, wz, L2, 0.35, y - g + 0.5, wallTex, { y0: g - 0.5, xray: true });
      // parapet on the deck edge
      if (rng() > 0.04) rblock(px + nx * (hw - 0.2), pz + nz * (hw - 0.2), L2, 0.18, 0.95, rail, { y0: y - 0.05 });
      if (!br && Math.round(s / step) % 6 === 0 && y - g > 1.5) rblock(px + nx * (hw + 0.85), pz + nz * (hw + 0.85), 0.7, 0.3, y - g + 0.2, pil, { y0: g - 0.5, xray: true });
    }
  }
}
function brokenEnd(ctx, D, s, dir) {
  const { w, rng } = ctx;
  const [px, pz, tx, tz] = pointAt(D.pts, s), y = D.yAt(s), hw = D.width / 2;
  const g = w.groundAt(px + tx * dir * 2.5, pz + tz * dir * 2.5);
  if (y - g > 0.8) w.block(px - 0.5, pz - hw - 0.4, px + 0.5, pz + hw + 0.4, y - g - 0.1, 'damConcrete', { y0: g - 0.5, xray: true, rot: Math.atan2(tz, tx) });
  // spilled slabs, rubble and rebar into the gap
  for (let i = 0; i < 4; i++) {
    const a = (rng() - 0.5) * D.width * 0.8, f = 2 + rng() * 5;
    w.prop(rng() < 0.5 ? 'sc_slab' : 'sc_slab2', px + tx * f * dir + (-tz) * a, pz + tz * f * dir + tx * a, Math.atan2(tx, tz) + (rng() - 0.5), { solid: true });
  }
  w.prop('sc_rubble', px + tx * 3 * dir, pz + tz * 3 * dir, rng() * 6, { solid: true });
  if (rng() < 0.6) w.prop('sc_pillar', px + tx * 4 * dir + tz * hw * 0.6, pz + tz * 4 * dir - tx * hw * 0.6, rng() * 6, { solid: true, scale: 0.8 });
}

// =====================================================================================================
// INTERIORS: furniture against the walls + loot containers
// =====================================================================================================
function furnish(ctx) {
  const { w, rng } = ctx;
  for (const C of ctx.cxs) {
    const fam = C.o.kindLoot || STYLE[C.kind].loot;
    const table = FURN[fam] || FURN.res;
    for (const r of C.rooms) {
      const W = r.x1 - r.x0, D = r.z1 - r.z0, area = W * D;
      const keyLoot = r.key ? (KEY_LOOT[r.key] || KEY_LOOT.res) : null;
      let n = r.ruin ? (rng() < 0.45 ? 1 : 0) : clamp(Math.round(area / 24 + rng() * 0.8), 1, 6);
      if (r.key) n = Math.max(n, 4);
      // stair flights / stairwells reserved in this room count as furniture (nothing placed on them)
      const placed = (r.res || []).filter(q => q[2] > r.x0 && q[0] < r.x1 && q[3] > r.z0 && q[1] < r.z1).map(q => q.slice()), conts = [];
      const clearOf = (x, z, m) => placed.every(([a, b, c, d]) => x < a - m || x > c + m || z < b - m || z > d + m);
      const lvY = r.storey ? C.floorY + r.storey * 3.2 : null, up = (o) => (lvY != null ? { ...o, yAbs: lvY } : o);
      for (let i = 0, tries = 0; i < n && tries < n * 8; tries++) {
        const e = pickW(rng, table);
        const kind = e[0], info = kind ? (propInfoSafe(kind)) : { solid: [0.4, 0.3, 0.8] };
        const [hw, hd] = info.solid || [0.4, 0.3];
        const side = Math.floor(rng() * 4), inset = hd + 0.3;
        let x, z, rot;
        if (side === 0) { x = lerp(r.x0 + hw + 0.4, r.x1 - hw - 0.4, rng()); z = r.z0 + inset; rot = 0; }
        else if (side === 1) { x = lerp(r.x0 + hw + 0.4, r.x1 - hw - 0.4, rng()); z = r.z1 - inset; rot = Math.PI; }
        else if (side === 2) { x = r.x0 + inset; z = lerp(r.z0 + hw + 0.4, r.z1 - hw - 0.4, rng()); rot = Math.PI / 2; }
        else { x = r.x1 - inset; z = lerp(r.z0 + hw + 0.4, r.z1 - hw - 0.4, rng()); rot = -Math.PI / 2; }
        if ((side < 2 ? W : D) < hw * 2 + 1 || (side < 2 ? D : W) < hd * 2 + 1.6) continue;
        if (r.gaps.some(([gx, gz, door]) => Math.hypot(gx - x, gz - z) < hw + (door ? 1.6 : 0.2))) continue;
        const ex = side < 2 ? hw : hd, ez = side < 2 ? hd : hw;
        const rect = [x - ex, z - ez, x + ex, z + ez];
        if (!placed.every(([a, b, c, d]) => rect[2] < a - 0.6 || rect[0] > c + 0.6 || rect[3] < b - 0.6 || rect[1] > d + 0.6)) continue;
        if (conts.some(([px, pz]) => px > rect[0] - 0.6 && px < rect[2] + 0.6 && pz > rect[1] - 0.6 && pz < rect[3] + 0.6)) continue;
        if (kind) { w.prop(kind, ...toW(C, x, z), rot - C.rot, up({ solid: true })); placed.push(rect); }
        i++;
        const ck = keyLoot ? keyLoot[Math.floor(rng() * keyLoot.length)] : e[1];
        if (!ck) continue;
        if (!keyLoot && rng() < (C.o.rich ? ctx.lootSkip - 0.3 : C.o.poi ? ctx.lootSkip - 0.12 : ctx.lootSkip + 0.03)) continue;
        const capKey = r.key === 'residential' ? 'res' + C.bi : r.key === 'space_travel' ? 'st' + r.seg.id : r.key, cap = { residential: 8, space_travel: 8 }[r.key] || 10;
        if (keyLoot && ((ctx.keyLoot[capKey] || 0) >= cap || conts.length >= 2)) continue;
        // container beside the furniture (or in its place), clear of walls, furniture and doorways
        const sgn = rng() < 0.5 ? 1 : -1;
        let cx = x, cz = z;
        if (kind) { if (side < 2) cx = x + sgn * (hw + 0.6); else cz = z + sgn * (hw + 0.6); }
        const wm = C.R ? 1.0 : 0.8, fm = C.R ? 0.5 : 0.45;   // rotated walls/furniture rasterise a little fatter
        if (side < 2) cz = clamp(cz, r.z0 + wm, r.z1 - wm); else cx = clamp(cx, r.x0 + wm, r.x1 - wm);   // off the wall
        if (cx < r.x0 + wm || cx > r.x1 - wm || cz < r.z0 + wm || cz > r.z1 - wm) { if (!kind) continue; cx = x - (cx - x); cz = z - (cz - z); }
        if (cx < r.x0 + wm || cx > r.x1 - wm || cz < r.z0 + wm || cz > r.z1 - wm) continue;
        if (!clearOf(cx, cz, fm) || conts.some(([px, pz]) => Math.hypot(px - cx, pz - cz) < 1)) continue;
        if (r.gaps.some(([gx, gz, door]) => Math.hypot(gx - cx, gz - cz) < (door ? 1.4 : 0.8))) continue;
        const tier = r.key ? 3 : C.o.rich ? (rng() < 0.35 ? 3 : 2) : C.o.poi ? (rng() < 0.07 ? 3 : 2) : (rng() < 0.15 ? 2 : 1);
        w.container(ck, ...toW(C, cx, cz), rot - C.rot, up({ tier: r.storey && tier < 3 && rng() < 0.3 ? tier + 1 : tier, room: r.key || null }));
        conts.push([cx, cz]);
        if (keyLoot) ctx.keyLoot[capKey] = (ctx.keyLoot[capKey] || 0) + 1;
        ctx.nCont++;
      }
      // interior light for named places (night raids)
      if (!r.ruin && (r.key || (C.o.poi && rng() < 0.22)) && area > 12) w.lamp(...toW(C, (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2), { y: 2.6, yAbs: lvY != null ? lvY + 2.6 : null, color: r.key ? 0xffd890 : 0xffe0b0, intensity: 0.9, range: 8, flicker: rng() < 0.3 ? 0.4 : 0, model: null });
    }
  }
}
function propInfoSafe(kind) { const i = propInfo(kind); return i && i.solid ? i : { solid: [0.5, 0.4, 1] }; }


// =====================================================================================================
// GROUND PAINT, ROADS, OBSTACLES
// =====================================================================================================
// streets that climb (or cut through the dunes) are levelled into the terrain; the rest are only painted
const LEVELLED = new Set(['hillroad', 'northroad', 'eaststair', 'westroad']);
function levelRoads(ctx) {
  const { w } = ctx;
  for (const [id, pts, wd] of STREETS) if (LEVELLED.has(id)) w.road(pts, wd + 1, 'concrete', { edge: null, level: true });
}
// sea-wall ladders: [x, z] on the coast line
const WALL_LADDERS = [[700, 140], [714, 228], [664, 287], [625, 358], [716, 418], [724, 482], [736, 590], [764, 676]];
// Bypass: collapsed spans and sand drifts, given by x along the road -> arc length
function bypassAt(x) { let best = 0, bd = 1e9; for (let s = 0, L = polyLen(BYPASS); s <= L; s += 1) { const p = pointAt(BYPASS, s); if (Math.abs(p[0] - x) < bd) { bd = Math.abs(p[0] - x); best = s; } } return best; }
function bypassGaps() { return BP_GAPS_X.map(([x, h]) => { const s = bypassAt(x); return [s - h, s + h]; }); }
function bypassRamps() { return BP_RAMPS_X.map(([x, side]) => [bypassAt(x), side]); }

function paintGround(ctx) {
  const { w } = ctx; const L = ctx.low;
  w.paintFn((x, z) => {
    if (x > 600 && inPoly(x, z, SEA)) {
      // dried sea bed: cracked mud flats, pale sand bars, darker damp hollows
      const n = N2(x / 9, z / 9) * 0.6 + N4(x / 31, z / 31) * 0.4, g = w.groundAt(x, z);
      if (g > 1.75 && polyDist(x, z, COAST)[0] > 4) return 'sand';                 // sand bars
      if (g < 0.45 && n < 0.5) return 'mud';                                         // damp hollows, the old channel
      return n > 0.66 ? 'sand' : n < 0.3 ? 'gravel' : 'sandDark';
    }
    const l = L.at(x, z);
    const drift = N4(x / 7, z / 7) * 0.55 + N2(x / 26, z / 26) * 0.45;
    if (l > 0.62) {
      if (drift > 0.6 - (1 - l) * 1.6) return drift > 0.64 - (1 - l) * 1.2 ? 'sand' : 'sandDark';
      const pv = N3(x / 11, z / 11);
      if (x > 260 && x < 540 && z > 130 && z < 340 && inPoly(x, z, HILL)) return pv > 0.55 ? 'tiles' : pv < 0.3 ? 'gravel' : 'concrete';   // cobbled old town
      return pv > 0.74 ? 'tiles' : pv < 0.3 ? 'gravel' : 'concrete';
    }
    if (l > 0.5) return drift > 0.36 ? 'sand' : (N1(x / 5, z / 5) > 0.62 ? 'gravel' : 'sandDark');
    // dunes: darker sand on the steep lee faces (wind from the south-west)
    const gx = w.groundAt(x + 1, z) - w.groundAt(x - 1, z), gz = w.groundAt(x, z + 1) - w.groundAt(x, z - 1);
    const lee = (gx * 0.62 - gz * 0.78) * 0.5;
    return lee < -0.3 + N1(x / 9, z / 9) * 0.12 ? 'sandDark' : null;
  });
  for (const p of PLAZAS) w.paintPoly(p.tex, p.pts);
  for (const [id, pts, wd, tex] of STREETS) w.road(pts, wd, tex, { edge: tex === 'asphalt' && wd >= 8 ? 'concrete' : null, edgeW: 1.4, level: false });
  w.road(PROMENADE, PROM_W, 'tiles', { edge: 'concrete', edgeW: 1, level: false });
  // drifted sand tongues across the paving
  for (let i = 0; i < 170; i++) {
    const x = 150 + ctx.rng() * 640, z = 110 + ctx.rng() * 740;
    if (L.at(x, z) < 0.7 || ctx.isSea(x, z, 2)) continue;
    w.paintCircle(ctx.rng() < 0.7 ? 'sand' : 'sandDark', x, z, 2 + ctx.rng() * 5, 0.5, i);
  }
}
// obstacles that buildings must keep clear of (the Bypass corridor)
function addObstacles(ctx) {
  const obs = [];
  let acc = 0;
  for (let k = 0; k < BYPASS.length - 1; k++) {
    const [ax, az] = BYPASS[k], [bx, bz] = BYPASS[k + 1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L, half = BP_W / 2 + 2.5, nx = -uz * half, nz = ux * half;
    const sx = ax - ux, sz = az - uz, ex = bx + ux, ez = bz + uz;
    obs.push({ poly: [[sx + nx, sz + nz], [ex + nx, ez + nz], [ex - nx, ez - nz], [sx - nx, sz - nz]] });
    acc += L;
  }
  ctx.obstacles = obs;
}
function paintDeck(ctx, D, tex, edge = null) {
  const { w } = ctx;
  let run = [];
  const flush = () => { if (run.length > 1) w.road(run, D.width - 0.6, tex, { edge, edgeW: 0.3, level: false }); run = []; };
  for (let s = D.from; s <= D.total; s += 4) {
    if (D.inGap(s) || (D.isBridge && D.isBridge(s))) { flush(); continue; }
    const p = pointAt(D.pts, s); run.push([p[0], p[1]]);
  }
  flush();
}

// obstacles that buildings must keep clear of (deck corridors, spiral ramp, station platforms)
function canopy(ctx, x, z, wd, dp, h, opts = {}) {
  // open-sided roof on corner posts (fades like any roof when you step under it)
  const g = { lintel: false };
  const bb = ctx.w.building({ x, z, w: wd, d: dp, h, rot: opts.rot, wall: opts.wall || 'concrete', floor: opts.floor || false, roof: opts.roof || 'metalPanel', roofTint: opts.roofTint,
    tint: opts.tint, thick: 0.45, parapet: opts.parapet ?? false, facade: false, vents: 0, name: opts.name || null, peek: opts.peek ?? 0.8, blend: 1,
    doors: [{ side: 'n', at: 0.6, w: wd - 1.2, ...g }, { side: 's', at: 0.6, w: wd - 1.2, ...g }, { side: 'w', at: 0.6, w: dp - 1.2, ...g }, { side: 'e', at: 0.6, w: dp - 1.2, ...g }] });
  ctx.occ.markPoly(bb.poly, 99998);
  return bb;
}

// =====================================================================================================
// SET PIECES (named places)
// =====================================================================================================
function freeSpot(ctx, x, z, r = 1.5, max = 18) {
  const ok = (px, pz) => ctx.occ.free(px - r, pz - r, px + r, pz + r) && !ctx.onDeck(px, pz);
  if (ok(x, z)) return [x, z];
  for (let d = 1; d <= max; d += 1) for (let a = 0; a < 12; a++) { const px = x + Math.cos(a * 0.5236) * d, pz = z + Math.sin(a * 0.5236) * d; if (ok(px, pz)) return [px, pz]; }
  return [x, z];
}
// sand-buried street lamp: light sits above the post so the post does not shadow its own light
function stLamp(w, x, z, o = {}) { w.lamp(x, z, { color: 0xffd8a0, ...o, y: 2.8, model: null }); w.prop('sc_lamppost', x, z, (x * 7.31 + z) % 6.28, { solid: [0.15, 0.15, 2.1] }); }
function ring(ctx, cx, cz, r, n, fn) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; fn(cx + Math.cos(a) * r, cz + Math.sin(a) * r, a, i); } }
// ---- underground metro stations ------------------------------------------------------------------
// A 34 x 16 m hall (32 x 14 m inside) sunk 5 m under the street (World `under`). The metro extract rig
// (engine/extracts.js) brings the track + tunnel mouths (fitted to the end walls), the raised platform with
// edge lamps, the yellow fence with gates at the car doors, the call terminal, two benches, the departure
// board + "M" roundel and the 12 m car. It faces the far (north) wall: the track bed fills hall-local
// z 1..4.1 against that wall, the car is seen doors-on from the camera, and the platform runs the full
// length of the hall (z 4.1..8.5, so nobody walks onto the track). South of it a floor-level concourse
// (z 8.5..15) with pillars, kiosk and a little loot; two 4 m street stairwells (railings, M totems, lamps)
// come down at both ends of the concourse (z 11..15), one 0.375 m step below the platform.
const ST_L = 34, ST_D = 16, ST_UNDER = 5, ST_STAIR = 7.7, ST_T = 3, ST_PZ = ST_T + 2.75;   // marker: track far edge (T + 1.75) on the north wall
function siteFree(ctx, cx, cz, rot, L, D, pad) {
  const R = rotFrame(cx, cz, rot), { w } = ctx;
  let gmin = 1e9, gmax = -1e9;
  for (let lz = -pad; lz <= D + pad; lz += 1.5) for (let lx = -pad - 4; lx <= L + pad + 4; lx += 1.5) {
    const inEnt = lx < -pad || lx > L + pad;                       // street in front of the two stair exits
    if (inEnt && (lz < D - 6 || lz > D)) continue;
    const [x, z] = rotPt(R, cx - L / 2 + lx, cz - D / 2 + lz);
    if (x < 8 || z < 8 || x > MW - 8 || z > MH - 8) return null;
    if (ctx.occ.at(x, z) !== -1 || ctx.onDeck(x, z) || ctx.keepClear.some(([kx, kz, kr]) => Math.hypot(kx - x, kz - z) < kr)) return null;
    if (ctx.decks.some(D => polyDist(x, z, D.pts)[0] < D.width / 2 + 3) || ctx.isSea(x, z, 3)) return null;
    const g = w.groundAt(x, z); gmin = Math.min(gmin, g); gmax = Math.max(gmax, g);
  }
  return gmax - gmin < 1.6 ? { gmin, gmax } : null;
}
function metroStation(ctx, id, name, rx, rz, opts = {}) {
  const { w, rng } = ctx, L = ST_L, D = ST_D;
  let best = null;
  // axis-aligned halls (the stairwells line up with the 2 m nav grid); east-west (track along the north
  // wall) preferred, north-south only when nothing fits nearby
  for (let r = 0; r <= 40; r += 2) for (let a = 0; a < (r ? Math.ceil(r * 1.6) : 1); a++) {
    const an = a / Math.ceil(r * 1.6 || 1) * Math.PI * 2, cx = rx + Math.cos(an) * r, cz = rz + Math.sin(an) * r;
    for (const deg of [0, 90]) {
      const sc = r + (deg ? 24 : 0); if (best && sc >= best.sc) continue;
      const f = siteFree(ctx, cx, cz, deg * D2R, L, D, 1.5);
      if (f) best = { sc, cx, cz, rot: deg * D2R, ...f };
    }
  }
  if (!best) { (ctx.stationFail ||= []).push(id); return null; }
  // snap so the 4 m wide stair flights (local z 11..15) fill whole 2 m nav cells (the AI walks them)
  if (best.rot === 0) best.cz += Math.round((best.cz + 3) / 2) * 2 - (best.cz + 3);
  else best.cx += Math.round((best.cx - 7) / 2) * 2 - (best.cx - 7);
  const { cx, cz, rot } = best, R = rotFrame(cx, cz, rot);
  let sum = 0, n = 0; for (let lz = 0; lz <= D; lz += 3) for (let lx = 0; lx <= L; lx += 3) { sum += w.groundAt(...rotPt(R, cx - L / 2 + lx, cz - D / 2 + lz)); n++; }
  const surf = sum / n, floor = surf - ST_UNDER;
  const L2 = (lx, lz) => rotPt(R, cx - L / 2 + lx, cz - D / 2 + lz);
  const blk = (x0, z0, x1, z1, h, tex, o) => w.block(cx - L / 2 + x0, cz - D / 2 + z0, cx - L / 2 + x1, cz - D / 2 + z1, h, tex, { R, ...o });
  const hallPoly = [[0, 0], [L, 0], [L, D], [0, D]].map(([lx, lz]) => L2(lx, lz));
  const lid = opts.lid || 'concrete';
  w.building({ x: cx - L / 2, z: cz - D / 2, w: L, d: D, rot: rot || undefined, under: ST_UNDER, floorY: surf, wall: 'concrete', floor: 'tiles', roof: lid, tint: 0xf0e8dc, name,
    stairs: [{ x: 0.8, z: 11.0, w: 4.0, dir: 'w', from: 0, to: 'top' }, { x: L - 0.8 - ST_STAIR, z: 11.0, w: 4.0, dir: 'e', from: 0, to: 'top' }] });
  const hall = { id, poly: hallPoly, surf, floor, cx, cz, rot, R };
  ctx.halls.push(hall);
  ctx.occ.markPoly([[-1.5, -1.5], [L + 1.5, -1.5], [L + 1.5, D + 1.5], [-1.5, D + 1.5]].map(([lx, lz]) => L2(lx, lz)), 99990);
  // ---- inside. The rig owns the track, platform (z 4.1..8.5), fence, benches, board and tunnel mouths; the
  // hall only dresses the concourse (z 8.5..15) and the two dead-end bays beside the stair flights
  // (x 1..8.5 / 25.5..33, z 8.5..11). Stair feet (x 8.5..9.5 / 24.5..25.5, z 11..15) stay clear.
  const face = Math.PI - rot, fS = -rot;   // face: extract-local +z (track side) = hall north; fS: toward the camera
  for (const lx of [12, 17, 22]) blk(lx - 0.4, 13.7, lx + 0.4, 14.5, ST_UNDER, 'concrete', { y0: floor, tint: 0xd8d0c4, cutaway: true });
  w.prop('sc_kiosk', ...L2(29.4, 9.75), fS - Math.PI / 2, { inHall: true, solid: true });   // newsstand in the east bay, window toward the concourse
  w.container('locker', ...L2(3.0, 8.85), fS, { tier: 1, inHall: true });                   // west bay, back to the platform edge
  w.container('trash', ...L2(10.4, 14.1), fS, { tier: 1, inHall: true });
  w.container(rng() < 0.5 ? 'backpack' : 'suitcase', ...L2(23.6, 14.1), fS, { tier: 2, inHall: true });
  for (const lx of [9, 17, 25]) w.lamp(...L2(lx, 6.4), { yAbs: floor + 3.6, color: 0xe8f0ff, intensity: 1.3, range: 12, flicker: rng() < 0.4 ? 0.4 : 0, model: null });
  for (const lx of [4.6, L - 4.6]) w.lamp(...L2(lx, 13), { yAbs: floor + 3.0, color: 0xfff0d0, intensity: 0.9, range: 8, model: null });
  w.lamp(...L2(L / 2, 11.6), { yAbs: floor + 3.4, color: 0xfff0d0, intensity: 1.0, range: 10, model: null });
  // ---- the extract (final position: its collision is placed now). The rig fits the track and the tunnel
  // mouths to the hall's end walls (metroFit); the platform runs the full length up to the mouths.
  const [ex, ez] = L2(L / 2, ST_PZ);
  w.extract(id, name, ex, ez, { kind: 'metro', face, trackZ: ST_T, platformLen: L - 3 });
  // ---- street level: railings round both stairwells, M totems + lamps at the entrances
  const rail = (x0, z0, x1, z1) => blk(x0, z0, x1, z1, 1.0, 'rust', { y0: surf + 0.02, xray: false });
  for (const [xa, xb, xe] of [[1.0, 9.1, 9.1], [L - 9.1, L - 1.0, L - 9.25]]) {
    rail(xa, 10.38, xb, 10.5); rail(xa, 15.5, xb, 15.62); rail(xe, 10.38, xe + 0.15, 15.62);
  }
  for (const [lx, f] of [[-1.3, -rot + Math.PI / 2], [L + 1.3, -rot - Math.PI / 2]]) {
    w.prop('sc_metro_sign', ...L2(lx, D + 0.4), f, { solid: true });
    w.lamp(...L2(lx, 9.6), { y: 2.6, color: 0xfff0d0, intensity: 1.2, range: 10, model: 'sc_lamppost' });
  }
  for (const lx of [-3, L + 3]) w.paintPoly('concrete', [L2(lx - 2.5, D - 6.5), L2(lx + 2.5, D - 6.5), L2(lx + 2.5, D + 0.5), L2(lx - 2.5, D + 0.5)]);
  return [cx, cz];
}
// raider hatch: the animated hatch, key post and its lights come from the extract set; keep ~2 m clear
// and face the most open side. Hatches are placed after the street clutter / dune vegetation, so loose
// clutter that landed within 2 m of the lid is dropped here (no random draws: the layout stays put).
const HATCH_LOOSE = new Set(['debris', 'sc_rubble', 'sc_rubble2', 'sc_slab', 'sc_slab2', 'sc_shrub', 'sc_shrub_dry', 'sc_grass', 'sc_agave', 'bush', 'rock', 'barrel', 'crate']);
function hatch(ctx, id, name, x, z) {
  const { w } = ctx; [x, z] = freeSpot(ctx, x, z, 2.2);
  w.props = w.props.filter(p => {
    if (!HATCH_LOOSE.has(p.kind) || Math.abs(p.x - x) > 5 || Math.abs(p.z - z) > 5) return true;
    const s = propInfo(p.kind).solid, reach = (Array.isArray(s) ? Math.max(s[0], s[1]) : 0.5) * (p.opts?.scale || 1);
    return Math.hypot(p.x - x, p.z - z) - reach >= 2.0;
  });
  let face = 0, best = -1;
  for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4, dx = Math.sin(an), dz = Math.cos(an); let free = 0; for (let d = 2; d <= 8; d += 2) if (ctx.occ.at(x + dx * d, z + dz * d) === -1 && !ctx.onDeck(x + dx * d, z + dz * d)) free++; if (free > best) { best = free; face = an; } }
  w.paint('metalPanel', x - 1.5, z - 1.5, x + 1.5, z + 1.5);
  w.extract(id, name, x, z, { kind: 'hatch', needsKey: 'raider_hatch_key', face });
  ctx.keepClear.push([x, z, 2.4]);
  return [x, z];
}
function fountainPlaza(ctx, x, z, opts = {}) {
  const { w, rng } = ctx; [x, z] = freeSpot(ctx, x, z, 4);
  w.paintCircle('tiles', x, z, 6.5, 0.05, 3);
  w.prop('sc_fountain', x, z, 0, { solid: true });
  ring(ctx, x, z, 7.2, 4, (px, pz, a) => w.prop('sc_bench', px, pz, -a + Math.PI / 2, { solid: true }));
  ring(ctx, x, z, 9, 6, (px, pz, a, i) => { if (i % 2 === 0) w.prop(i % 4 ? 'sc_palm' : 'sc_palm3', px, pz, rng() * 6, { solid: true }); else w.prop('sc_planter', px, pz, 0, { solid: true }); });
  if (opts.lamps !== false) ring(ctx, x, z, 11, 4, (px, pz) => stLamp(w, px, pz, { intensity: 1.6, range: 11 }));
  return [x, z];
}
function cafe(ctx, x, z, n = 4) {
  const { w, rng } = ctx;
  for (let i = 0; i < n; i++) {
    const [px, pz] = freeSpot(ctx, x + (i % 2) * 3.4 - 1.7, z + Math.floor(i / 2) * 3.4, 1.2, 6);
    w.prop(rng() < 0.5 ? 'sc_cafe' : 'sc_cafe2', px, pz, rng() * 6, {});
    if (i % 2 === 0) w.prop(rng() < 0.5 ? 'sc_parasol' : 'sc_parasol2', px + 0.2, pz + 0.2, 0, { solid: true });
  }
}

// =====================================================================================================
// SET PIECES (named places)
// =====================================================================================================
const BOATS = ['sc_yacht', 'sc_yacht2', 'sc_fishboat', 'sc_fishboat', 'sc_hull', 'sc_dinghy', 'sc_yacht2'];
const CARS = ['sc_fiat', 'sc_fiat2', 'sc_fiat3', 'sc_fiat4'];
const seaward = (s) => { const [cx, cz, tx, tz] = pointAt(COAST, s); let nx = tz, nz = -tx; if (!inPoly(cx + nx * 6, cz + nz * 6, SEA)) { nx = -nx; nz = -nz; } return [cx, cz, tx, tz, nx, nz]; };

// ---- the sea wall: a concrete face from the sea bed up to the quay, a cream balustrade on top; gaps for the
// slipways, the breakwater, the marina piers and the sea-wall ladders
function seaWall(ctx) {
  const { w, rng } = ctx, total = polyLen(COAST);
  const gaps = ctx.slips.map(s => [s.x, s.z, 3.2]).concat([[716, 470, 5.5]], ctx.pierRoots.map(([x, z]) => [x, z, 2.6]), ctx.wallLadders.map(([x, z]) => [x, z, 0.9]));
  let lampAcc = 0;
  for (let s = 1; s < total - 1; s += 2) {
    const [cx, cz, tx, tz, nx, nz] = seaward(s), ang = Math.atan2(tz, tx);
    const inland = ctx.low.at(cx - nx * 4, cz - nz * 4);
    if (inland < 0.55 || cz > 800 || cz < 120) continue;
    const top = w.groundAt(cx - nx * 1.2, cz - nz * 1.2), low = Math.min(w.groundAt(cx + nx * 1.6, cz + nz * 1.6), w.groundAt(cx + nx * 3, cz + nz * 3));
    if (top - low < 2) continue;
    const gap = gaps.some(([gx, gz, gr]) => Math.hypot(gx - cx, gz - cz) < gr + 1.1);
    const wx = cx + nx * 0.35, wz = cz + nz * 0.35;
    w.block(wx - 1.12, wz - 0.45, wx + 1.12, wz + 0.45, top - low + 0.25, 'damConcrete', { y0: low - 0.6, rot: ang, xray: true });
    if (!gap) w.block(cx - 1.08 + nx * 0.1, cz - 0.18 + nz * 0.1, cx + 1.08 + nx * 0.1, cz + 0.18 + nz * 0.1, 0.95, 'plaster', { y0: top - 0.05, rot: ang, tint: 0xfff0dc, xray: false });
    lampAcc += 2;
    if (lampAcc >= 26 && !gap) { lampAcc = 0; stLamp(w, cx - nx * 1.4, cz - nz * 1.4, { intensity: 1.5, range: 11, flicker: rng() < 0.2 ? 0.5 : 0 }); }
    if (rng() < 0.12 && !gap) w.prop('sc_bollard', cx - nx * 1.0 + tx * 0.6, cz - nz * 1.0 + tz * 0.6, 0, { solid: true });
  }
  // ladders down the sea wall (players climb them; the AI uses the slipways)
  for (const [x, z, s] of ctx.wallLadders) {
    const [cx, cz, , , nx, nz] = seaward(s);
    w.ladder(cx + nx * 1.4, cz + nz * 1.4, null, cx - nx * 1.0, cz - nz * 1.0, w.groundAt(cx - nx * 1.2, cz - nz * 1.2), Math.atan2(-nx, -nz));
  }
  for (const sl of ctx.slips) {   // slipway kerbs + a winch post
    w.prop('sc_bollard', sl.a[0] + sl.nz * 2.6, sl.a[1] - sl.nx * 2.6, 0, { solid: true });
    if (rng() < 0.5) w.prop('sc_dinghy', sl.b[0] + sl.nz * 4, sl.b[1] - sl.nx * 4, Math.atan2(sl.nx, sl.nz) + 0.4, { solid: true });
  }
}
// solid fill under a deck between arc positions [t0, t1] along a -> b, from below the ground up to `top`
function abutment(ctx, a, b, spans, top) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L, ang = Math.atan2(uz, ux);
  for (const [t0, t1] of spans) {
    const cx = a[0] + ux * (t0 + t1) / 2, cz = a[1] + uz * (t0 + t1) / 2, hl = (t1 - t0) / 2;
    ctx.w.block(cx - hl, cz - 1.6, cx + hl, cz + 1.6, top + 0.5, 'damConcrete', { y0: -0.5, rot: ang, xray: true });
  }
}
// ---- the marina: wooden piers over the dry basin, boats sitting on the sand under them
function marina(ctx) {
  const { w, rng } = ctx, y = w.groundAt(616, 342) + 0.08;
  const piers = [[[625, 320], [668, 320]], [[626, 346], [676, 346]], [[627, 368], [662, 368]], [[688, 397], [688, 350]]];
  for (const p of piers) {
    w.bridge(p, 3.6, y, 'wood', { thick: 0.35, rails: true, railH: 0.9, pillars: 4, side: 'wood', pillarW: 0.45 });
    abutment(ctx, p[0], p[1], [[-0.5, 2.6]], y - 0.33);
    const [ax, az] = p[0], [bx, bz] = p[1], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    // a ladder down the far end, bollards along it
    w.ladder(bx + ux * 1.2, bz + uz * 1.2, null, bx - ux * 0.6, bz - uz * 0.6, y, Math.atan2(-ux, -uz));
    for (let t = 6; t < L - 2; t += 9) w.prop('sc_bollard', ax + ux * t - uz * 1.45, az + uz * t + ux * 1.45, 0, { yAbs: y, solid: false });
    w.lamp(ax + ux * (L - 1.5) + uz * 1.4, az + uz * (L - 1.5) - ux * 1.4, { yAbs: y + 2.4, color: 0xffe0b0, intensity: 1.0, range: 9, model: null, flicker: rng() < 0.4 ? 0.4 : 0 });
    // boats moored alongside, now resting on the sand under the deck line
    for (let t = 8; t < L - 4; t += 12 + rng() * 6) {
      const sd = rng() < 0.5 ? 1 : -1, ox = -uz * sd * 5.2, oz = ux * sd * 5.2;
      const k = BOATS[Math.floor(rng() * BOATS.length)], bx2 = ax + ux * t + ox, bz2 = az + uz * t + oz;
      if (!inPoly(bx2, bz2, SEA)) continue;
      w.prop(k, bx2, bz2, Math.atan2(ux, uz) + (rng() - 0.5) * 0.3, { solid: true });
      if (rng() < 0.6) w.container(rng() < 0.5 ? 'suitcase' : 'locker', bx2 + ox * 0.5, bz2 + oz * 0.5, 0, { tier: rng() < 0.3 ? 2 : 1 });
    }
  }
  ctx.pierRoots = piers.map(p => p[0]);
  // quay furniture: life rings, nets, crates, the harbourmaster's notice board
  for (let i = 0; i < 8; i++) { const [x, z] = freeSpot(ctx, 600 + rng() * 20, 300 + rng() * 80, 1); w.prop(['crate', 'sc_cratestack', 'barrel', 'sc_buoy'][i % 4], x, z, rng() * 6, { solid: true }); }
  w.container('cabinet', ...freeSpot(ctx, 604, 312, 0.8), 0, { tier: 2 }); w.container('desk', ...freeSpot(ctx, 606, 360, 0.8), 0, { tier: 2 });
}
// ---- the breakwater, its footbridge and the lighthouse at the end
function jettyAndLighthouse(ctx) {
  const { w, rng } = ctx, y = ctx.jettyY;
  w.path(JETTY, 6.4, 'concrete'); w.path(JETTY2, 6.4, 'concrete');
  w.paintCircle('concrete', LIGHTHOUSE[0], LIGHTHOUSE[1], 10, 0.05, 2);
  w.bridge([[766, 464], [796, 462]], 6.4, y + 0.02, 'concrete', { thick: 0.7, rails: true, railH: 1.0, pillars: 0 });
  // abutments fill the sloping ends of the breakwater under the deck (a deck hovering just over a slope reads as
  // no floor to the nav grid); 7 m of clear span stays open to walk under
  abutment(ctx, [766, 464], [796, 462], [[7.5, 11.5], [18.5, 22.5]], y - 0.66);
  for (const [a, b] of [JETTY, JETTY2]) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]), ux = (b[0] - a[0]) / L, uz = (b[1] - a[1]) / L;
    for (let t = 2; t < L; t += 2.4) for (const sd of [-1, 1]) {
      const r = 5.6 + rng() * 1.6, px = a[0] + ux * t - uz * sd * r, pz = a[1] + uz * t + ux * sd * r, rot = rng() * 6, sc = 1.2 + rng() * 0.8;
      // riprap only out on the sea bed: on the promenade at the root boulders left notches you could drop into
      if (ctx.isSea(px, pz) && polyDist(px, pz, COAST)[0] > 3) w.prop('rock', px, pz, rot, { solid: true, scale: sc });
    }
    for (let t = 6; t < L; t += 16) stLamp(w, a[0] + ux * t + uz * 2.9, a[1] + uz * t - ux * 2.9, { intensity: 1.4, range: 10 });
  }
  // riprap round the platform (the breakwater side left open), out on the flat sea bed past the platform's foot:
  // boulders on its slope made crevices you could drop into from one rock and never leave
  for (let i = 0; i < 20; i++) { const a = 0.6 + rng() * 5.08, r = 16.5 + rng() * 3; w.prop('rock', LIGHTHOUSE[0] - Math.cos(a) * r, LIGHTHOUSE[1] + Math.sin(a) * r, rng() * 6, { solid: true, scale: 1.4 + rng() }); }
  const LH = ctx.cxs.find(C => C.o.tag === 'lighthouse');
  if (LH) {
    // the lantern sits on the east half of the roof: the stair from the top storey comes up on the west side
    const s = LH.segs[0], [x, z] = toW(LH, s.x1 - 2.4, (s.z0 + s.z1) / 2);
    w.prop('sc_lantern', x, z, 0, { yAbs: s.roofY, scale: 0.8, solid: [1.3, 1.3, 2.2] });
    w.lamp(x, z, { yAbs: s.roofY + 2.2, color: 0xffe6a0, intensity: 2.0, range: 16, model: null });
    // white bands on the lighthouse (visual)
    for (let k = 1; k < LH.storeys; k += 2) w.block(s.x0 - 0.32, s.z0 - 0.32, s.x1 + 0.32, s.z1 + 0.32, 1.2, 'plaster', { onBuilding: s.bid, rel0: k * 3.2 + 0.9, collide: false, cast: false, cutaway: true, tint: 0xfff8f0, R: LH.R || undefined });
    w.prop('sc_bench', x - 7, z + 4, 0.4, { solid: true }); w.prop('sc_buoy', x + 6, z - 6, 0, { solid: true });
  }
}
// ---- Yacht Rock Bottom: the marina's fleet, stranded on the sea bed north of the breakwater
function yachtGraveyard(ctx) {
  const { w, rng } = ctx;
  const spots = [[752, 300], [778, 268], [812, 296], [846, 270], [770, 340], [806, 352], [842, 330], [872, 300], [760, 404], [800, 410], [850, 392],
    [880, 430], [736, 362], [826, 236], [868, 360]];
  spots.forEach(([x0, z0], i) => {
    const [x, z] = freeSpot(ctx, x0 + (rng() - 0.5) * 8, z0 + (rng() - 0.5) * 8, 4, 10), k = i < 4 ? 'sc_yacht' : BOATS[Math.floor(rng() * BOATS.length)], r = rng() * 6.283;
    w.prop(k, x, z, r, { solid: true });
    const cx = x + Math.cos(r) * 3.6, cz = z - Math.sin(r) * 3.6;
    if (rng() < 0.75) w.container(i < 4 ? (rng() < 0.4 ? 'safe' : 'locker') : ['suitcase', 'backpack', 'locker', 'crate'][Math.floor(rng() * 4)], cx, cz, r, { tier: i < 4 ? 2 + (rng() < 0.3 ? 1 : 0) : 1 + (rng() < 0.3 ? 1 : 0) });
    if (rng() < 0.4) w.prop('sc_anchor', x - Math.cos(r) * 5, z + Math.sin(r) * 5, rng() * 6, { solid: true });
    ctx.keepClear.push([x, z, 4]);
  });
  for (let i = 0; i < 26; i++) { const x = 730 + rng() * 160, z = 220 + rng() * 220; if (!ctx.blocked(x, z, 1)) w.prop(rng() < 0.6 ? 'sc_buoy' : 'debris', x, z, rng() * 6, { solid: rng() < 0.6 }); }
  // the stragglers: boats that drifted south of the breakwater before the water gave up
  for (const [x0, z0] of [[790, 520], [846, 548], [800, 640], [862, 680], [830, 760], [880, 820], [770, 600], [852, 610]]) {
    const [x, z] = freeSpot(ctx, x0 + (rng() - 0.5) * 10, z0 + (rng() - 0.5) * 10, 4, 12), r = rng() * 6.283;
    if (!ctx.isSea(x, z)) continue;
    w.prop(BOATS[Math.floor(rng() * BOATS.length)], x, z, r, { solid: true });
    if (rng() < 0.5) w.container(rng() < 0.5 ? 'suitcase' : 'locker', x + Math.cos(r) * 3.4, z - Math.sin(r) * 3.4, r, { tier: 1 });
    ctx.keepClear.push([x, z, 4]);
  }
}
// ---- Return-to-Sender Warehouses: a container yard on the old quay under the Bypass
function port(ctx) {
  const { w, rng } = ctx;
  w.paint('concrete', 544, 124, 696, 150); w.paint('asphalt', 548, 196, 694, 206);
  const stacks = [[552, 132, 0], [560, 132, 0], [568, 132, 0], [584, 136, 0.04], [592, 136, 0.04], [650, 134, 1.57], [664, 140, 1.57], [678, 146, 1.57], [690, 204, 1.57]];
  for (const [x, z, r] of stacks) { w.prop(rng() < 0.5 ? 'sc_container' : 'sc_container2', x, z, r, { solid: true }); if (rng() < 0.4) w.prop(rng() < 0.5 ? 'sc_container' : 'sc_container2', x, z, r, { y: 2.6, solid: true }); }
  w.prop('sc_crane', 694, 182, Math.PI / 2, { solid: [2.2, 6, 14] });
  for (let i = 0; i < 10; i++) { const [x, z] = freeSpot(ctx, 548 + rng() * 140, 196 + rng() * 10, 1); w.prop(rng() < 0.5 ? 'sc_cratestack' : 'crate', x, z, rng() * 6, { solid: true }); }
  // the quest cache: weapon cases in the yard and the sheds ("returned to sender")
  for (const [x, z] of [[600, 140], [636, 146], [580, 152], [640, 186]]) w.container('weapon_case', ...freeSpot(ctx, x, z, 0.8), 0, { tier: 2 });
  for (const [x, z] of [[556, 140], [620, 200], [680, 160]]) w.container(rng() < 0.5 ? 'crate' : 'toolbox', ...freeSpot(ctx, x, z, 0.8), 0, { tier: 2 });
  w.fence([[542, 122], [542, 208]], 1.8, 'rust'); w.fence([[542, 122], [600, 122]], 1.8, 'rust');
  for (const [x, z] of [[570, 128], [640, 140], [620, 204]]) w.lamp(x, z, { y: 4.4, color: 0xffd8a0, intensity: 1.3, range: 13 });
}
// ---- Pivot Labs: dishes and antennas on the roof, a sculpture of a pivot in the courtyard
function labs(ctx) {
  const { w, rng } = ctx;
  const C = ctx.cxs.find(c => c.o.tag === 'labs'); if (!C) return;
  for (const s of C.segs) {
    const W = s.x1 - s.x0, D = s.z1 - s.z0;
    w.prop('sc_dish', ...toW(C, s.x0 + W * 0.3, s.z0 + D * 0.35), 0.6, { yAbs: s.roofY, solid: [0.9, 0.9, 2] });
    w.prop('antenna', ...toW(C, s.x0 + W * 0.75, s.z0 + D * 0.7), 0, { yAbs: s.roofY, solid: [0.2, 0.2, 3] });
  }
  w.prop('sc_statue', ...freeSpot(ctx, 628, 252, 1.2), 2.2, { solid: true });
  for (let i = 0; i < 4; i++) w.prop('sc_barrier', ...freeSpot(ctx, 600 + i * 3, 254, 1.1), 0, { solid: true });
  w.prop('sc_billboard', ...freeSpot(ctx, 662, 254, 1.4), 0.1, { solid: true });
  w.container('electronics', ...freeSpot(ctx, 650, 254, 0.8), 0, { tier: 2 });
}
// ---- Upper Sandy: Piazza Sandwich, the chapel, the town hall steps
function upperSandy(ctx) {
  const { w, rng } = ctx;
  ctx.piazza = fountainPlaza(ctx, 392, 238);
  cafe(ctx, 366, 222, 6); cafe(ctx, 414, 262, 4); cafe(ctx, 456, 252, 6);
  for (let i = 0; i < 4; i++) w.prop('sc_parasol', ...freeSpot(ctx, 440 + i * 9, 266, 1, 4), 0, { solid: true });
  for (let i = 0; i < 6; i++) {
    const [x, z] = freeSpot(ctx, 362 + i * 9, 266 + (i % 2) * 2, 1.6, 6);
    w.prop(i % 2 ? 'sc_stall' : 'sc_stall2', x, z, Math.PI + (rng() - 0.5) * 0.3, { solid: true });
    w.container(['basket', 'desk', 'cabinet', 'suitcase', 'basket', 'desk'][i], x + 1.9, z, 0, { tier: 2 });
  }
  w.prop('sc_statue', ...freeSpot(ctx, 432, 216, 1.2), 0.3, { solid: true });
  // the west half: an olive garden with benches and the café counters (drawers worth a look)
  for (let i = 0; i < 12; i++) { const [x, z] = freeSpot(ctx, 362 + (i % 4) * 7, 226 + Math.floor(i / 4) * 12, 1, 3); w.prop(i % 3 ? 'sc_olive' : 'sc_planter', x, z, i, { solid: true, scale: i % 3 ? 1.2 : 1 }); }
  for (let i = 0; i < 6; i++) w.prop('sc_bench', ...freeSpot(ctx, 365 + (i % 3) * 7, 232 + Math.floor(i / 3) * 12, 1, 3), 0, { solid: true });
  for (const [x, z, k] of [[420, 222, 'desk'], [446, 222, 'cabinet'], [372, 270, 'desk'], [470, 232, 'cabinet']]) { const [px, pz] = freeSpot(ctx, x, z, 1, 6); w.prop('sc_counter', px, pz, 0, { solid: true }); w.container(k, px + 2, pz, 0, { tier: 2 }); }
  for (let i = 0; i < 6; i++) w.prop(i % 2 ? 'sc_cypress' : 'sc_palm', ...freeSpot(ctx, 356 + i * 22, 208, 1), rng() * 6, { solid: true });
  // the town hall: scaffolding on the facade, sandbagged steps
  for (let i = 0; i < 4; i++) w.prop('sc_scaffold', ...freeSpot(ctx, 380 + i * 15, 192, 1.6), -0.1, { solid: true });
  for (let i = 0; i < 6; i++) w.prop('sandbag', ...freeSpot(ctx, 392 + i * 4, 196, 1), 0, { solid: true });
  // the chapel: pews, altar, a collection box that collected sand
  const ch = ctx.cxs.find(C => C.o.tag === 'chapel');
  if (ch) {
    const C = ch, s = ch.segs[0], len = s.x1 - s.x0, half = (s.z1 - s.z0) / 2;
    const P = (u, v) => toW(C, s.x0 + u, (s.z0 + s.z1) / 2 + v), face = -Math.PI / 2 - C.rot;
    for (let r = 0; r < 4; r++) { w.prop('sc_pew', ...P(7 + r * 3, -2.6), face, { solid: true }); w.prop('sc_pew', ...P(7 + r * 3, 2.6), face, { solid: true }); }
    w.prop('sc_altar', ...P(2.4, 0), face + Math.PI, { solid: true }); w.container('safe', ...P(1.6, half - 1.4), face + Math.PI, { tier: 3 });
    w.container('basket', ...P(len - 2, half - 1.2), face, { tier: 2 });
    w.lamp(...P(3, 0), { y: 1.4, color: 0xffb060, intensity: 0.8, range: 6, flicker: 0.5, model: null });
  }
}
// ---- the old town walls: sandstone retaining walls round the cliffs of Upper Sandy, a parapet on top,
// buttresses below; open where the north ramp and the east stair street come up
function hillWalls(ctx) {
  const { w, rng } = ctx, n = HILL.length;
  const roads = STREETS.filter(st => st[0] === 'northroad' || st[0] === 'eaststair').map(st => st[1]);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n; if (HILL_W[i] > 4 || HILL_W[j] > 4) continue;
    const [ax, az] = HILL[i], [bx, bz] = HILL[j], L = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / L, uz = (bz - az) / L;
    let nx = -uz, nz = ux; if (inPoly((ax + bx) / 2 + nx * 3, (az + bz) / 2 + nz * 3, HILL)) { nx = -nx; nz = -nz; }   // outward
    const ang = Math.atan2(uz, ux);
    for (let t = 1; t < L - 0.5; t += 2) {
      const px = ax + ux * t, pz = az + uz * t;
      if (roads.some(r => polyDist(px, pz, r)[0] < 6)) continue;
      const top = w.groundAt(px - nx * 1.5, pz - nz * 1.5), foot = Math.min(w.groundAt(px + nx * 2.4, pz + nz * 2.4), w.groundAt(px + nx * 4, pz + nz * 4));
      if (top - foot < 2) continue;
      // the parapet: 1 m over the walk with a capping bar 1.55-1.75 m up on posts (posts visual only). Nobody can
      // stand on it (or climb over and drop to the buttress notches at the cliff foot), and a standing raider
      // still shoots out through the gap under the cap
      let walk = top; for (const d of [0.2, 0.7, 1.1]) for (const e of [-0.9, 0, 0.9]) walk = Math.max(walk, w.groundAt(px - nx * d + ux * e, pz - nz * d + uz * e));
      const cx = px + nx * 0.55, cz = pz + nz * 0.55;
      w.block(cx - 1.08, cz - 0.6, cx + 1.08, cz + 0.6, walk - foot + 1.6, 'brick', { y0: foot - 0.6, rot: ang, tint: 0xf0d8b0, xray: true });
      w.block(cx - 1.08, cz - 0.6, cx + 1.08, cz + 0.6, 0.2, 'brick', { y0: walk + 1.55, rot: ang, tint: 0xe4c89c, xray: true });
      w.block(cx - 0.12, cz - 0.12, cx + 0.12, cz + 0.12, 0.55, 'brick', { y0: walk + 1.0, rot: ang, tint: 0xe4c89c, xray: true, collide: false });
      if (Math.round(t) % 12 === 1 && t > 3 && t < L - 3) { const bxx = px + nx * 1.6, bzz = pz + nz * 1.6; w.block(bxx - 0.7, bzz - 0.9, bxx + 0.7, bzz + 0.9, top - foot - 0.4, 'brick', { y0: foot - 0.5, rot: ang, tint: 0xe4c89c, xray: true }); }
      if (Math.round(t) % 24 === 11) w.lamp(px - nx * 2.2, pz - nz * 2.2, { y: 2.8, color: 0xffd8a0, intensity: 1.2, range: 10, model: 'sc_lamppost' });   // (well clear of the wall: no pocket behind the post)
    }
  }
  // a squat bastion where two walled runs meet (their blocks leave a wedge open at the corner)
  const outN = (i, j) => { const [ax, az] = HILL[i], [bx, bz] = HILL[j], L = Math.hypot(bx - ax, bz - az); let nx = -(bz - az) / L, nz = (bx - ax) / L; if (inPoly((ax + bx) / 2 + nx * 3, (az + bz) / 2 + nz * 3, HILL)) { nx = -nx; nz = -nz; } return [nx, nz]; };
  for (let i = 0; i < n; i++) {
    const h = (i + n - 1) % n, j = (i + 1) % n;
    if (HILL_W[h] > 4 || HILL_W[i] > 4 || HILL_W[j] > 4) continue;
    const [n1x, n1z] = outN(h, i), [n2x, n2z] = outN(i, j), bl = Math.hypot(n1x + n2x, n1z + n2z), bx = (n1x + n2x) / bl, bz = (n1z + n2z) / bl;
    const [vx, vz] = HILL[i], foot = Math.min(w.groundAt(vx + bx * 2.6, vz + bz * 2.6), w.groundAt(vx + bx * 4, vz + bz * 4));
    let walk = -1e9; for (const d of [0.3, 0.9, 1.5]) for (const e of [-1, 0, 1]) walk = Math.max(walk, w.groundAt(vx - bx * d - bz * e, vz - bz * d + bx * e));
    const cx = vx + bx * 0.5, cz = vz + bz * 0.5;
    w.block(cx - 1.5, cz - 1.5, cx + 1.5, cz + 1.5, walk - foot + 2.3, 'brick', { y0: foot - 0.6, rot: Math.atan2(bz, bx), tint: 0xe8cca0, xray: true });
  }
}
// ---- the Sandphitheatre: stage columns, drifted seats, a raider band's abandoned rehearsal
function theatre(ctx) {
  const { w, rng } = ctx, T = THEATRE;
  for (let k = 0; k < 18; k++) {
    const r = T.r0 + k * 1.8 + 0.9;
    for (let a = -T.half; a <= T.half; a += 0.02) {
      const x = T.x + Math.cos(a) * r, z = T.z + Math.sin(a) * r;
      if (x >= 0 && z >= 0) w.paint(k % 2 ? 'concrete' : 'tiles', x - 0.5, z - 0.5, x + 0.5, z + 0.5);
    }
  }
  w.paintCircle('wood', T.x, T.z, T.r0 - 1, 0.02, 4);
  for (let i = 0; i < 8; i++) { const a = -1.2 + i * 0.34, r = T.r0 + 2 + rng() * 26; w.paintCircle('sand', T.x + Math.cos(a) * r, T.z + Math.sin(a) * r, 3 + rng() * 4, 0.6, i); }
  for (let i = 0; i < 6; i++) w.prop(i === 2 ? 'sc_column_fallen' : 'sc_column', T.x - 6, T.z - 10 + i * 4, 0, { solid: true });
  w.prop('sc_campfire', T.x + 4, T.z, 0, {}); w.lamp(T.x + 4, T.z, { y: 0.8, color: 0xff9040, intensity: 1.6, range: 10, flicker: 0.6, model: null });
  for (const [dx, dz, k] of [[1, -5, 'sc_tent'], [1, 5, 'sc_tarp'], [7, -7, 'barrel'], [7, 7, 'sc_cratestack']]) w.prop(k, T.x + dx, T.z + dz, 1.57, { solid: true });
  w.container('raider_cache', T.x + 2.5, T.z + 2.5, 0, { tier: 3 }); w.container('ammo_box', T.x + 6, T.z - 3, 0, { tier: 2 });
  w.container('backpack', T.x + 22, T.z - 14, 0, { tier: 1 }); w.container('suitcase', T.x + 30, T.z + 10, 0, { tier: 2 });
  for (const a of [-1, 0, 1]) stLamp(w, T.x + Math.cos(a) * (T.r1 - 2), T.z + Math.sin(a) * (T.r1 - 2), { intensity: 1.2, range: 10, flicker: 0.3 });
}
// ---- Hourglass Terraces: laundry between the rows, the raiders' stash
function terraces(ctx) {
  const { w, rng } = ctx;
  for (const z of [347, 363]) for (let x = 370; x < 440; x += 9) w.prop(rng() < 0.5 ? 'sc_laundry' : 'sc_laundry2', x + rng() * 3, z, 0, {});
  for (const z of [347, 363, 379]) for (let i = 0; i < 3; i++) w.prop(rng() < 0.5 ? 'sc_planter' : 'sc_planter2', ...freeSpot(ctx, 368 + rng() * 70, z, 0.8, 4), 0, { solid: true });
  w.container('raider_cache', ...freeSpot(ctx, 424, 347, 0.9, 6), 0, { tier: 3 });
  w.container('raider_cache', ...freeSpot(ctx, 384, 363, 0.9, 6), 0, { tier: 2 });
  w.container('trash', ...freeSpot(ctx, 400, 379, 0.8, 6), 0, { tier: 1 });
  for (const x of [362, 444]) stLamp(w, x, 347, { intensity: 1.1, range: 9 });
}
// ---- the Roundabout of Regret: the Founder points at where the sea used to be
function roundabout(ctx) {
  const { w, rng } = ctx, [x, z] = RB;
  w.paintCircle('asphalt', x, z, RB_R + 4, 0, 1); w.paintCircle('concrete', x, z, RB_R - 6, 0, 1); w.paintCircle('tiles', x, z, RB_R - 9, 0.04, 2);
  w.prop('sc_statue', x, z, Math.PI / 2 + 0.2, { solid: true, scale: 1.6 });
  ring(ctx, x, z, 9, 8, (px, pz, a, i) => w.prop(i % 2 ? 'sc_planter' : 'sc_palm', px, pz, rng() * 6, { solid: true }));
  ring(ctx, x, z, RB_R + 7, 10, (px, pz, a, i) => { if (i % 2) stLamp(w, px, pz, { intensity: 1.5, range: 11 }); });
  // the ring of kiosks and stalls on the outer pavement (desks and drawers worth rifling)
  for (let i = 0; i < 7; i++) {
    const a = 0.45 + i * 0.9, [px, pz] = freeSpot(ctx, x + Math.cos(a) * (RB_R + 11), z + Math.sin(a) * (RB_R + 11), 1.4, 6);
    w.prop(i % 3 === 0 ? 'sc_kiosk' : i % 2 ? 'sc_stall' : 'sc_stall2', px, pz, -a + Math.PI / 2, { solid: true });
    w.container(['desk', 'cabinet', 'basket', 'desk', 'crate', 'cabinet', 'suitcase'][i], px + Math.cos(a) * 1.9, pz + Math.sin(a) * 1.9, -a, { tier: 2 });
  }
  for (let i = 0; i < 5; i++) { const [cx, cz] = freeSpot(ctx, x - 30 + rng() * 60, z + 30 + rng() * 10, 1.6, 8); w.prop(CARS[i % 4], cx, cz, rng() * 6, { solid: true }); }
}
// ---- the Clearance Sale Strip: everything is 90% off, including the roof
function strip(ctx) {
  const { w, rng } = ctx, pts = STREETS[0][1], L = polyLen(pts);
  for (let s = 10; s < L - 6; s += 14 + rng() * 10) {
    const [x, z, tx, tz] = pointAt(pts, s), sd = rng() < 0.5 ? 1 : -1, off = 6.8;
    const px = x - tz * sd * off, pz = z + tx * sd * off, k = rng();
    if (ctx.blocked(px, pz, 0.8)) continue;
    if (k < 0.35) w.prop('sc_salesign', px, pz, Math.atan2(tx, tz) + (sd > 0 ? 0 : Math.PI), { solid: true });
    else if (k < 0.6) { w.prop(rng() < 0.5 ? 'sc_stall' : 'sc_stall2', px, pz, Math.atan2(tx, tz) + (sd > 0 ? Math.PI / 2 : -Math.PI / 2), { solid: true }); if (rng() < 0.6) w.container(rng() < 0.5 ? 'basket' : 'suitcase', px + tx * 2, pz + tz * 2, 0, { tier: 1 }); }
    else if (k < 0.8) w.prop('sc_cart', px, pz, rng() * 6, { solid: true });
    else w.prop(CARS[Math.floor(rng() * 4)], x - tz * sd * 2.4, z + tx * sd * 2.4, Math.atan2(tx, tz) + (rng() - 0.5) * 0.3, { solid: true });
  }
}
// ---- St. Copay's: ambulances queued at the door, a triage tent, barriers
function hospital(ctx) {
  const { w, rng } = ctx;
  for (let i = 0; i < 3; i++) { const [x, z] = freeSpot(ctx, 318 + i * 18, 507 - i * 4.6, 1.8, 6); w.prop('sc_ambulance', x, z, 1.32 + (rng() - 0.5) * 0.3, { solid: true }); if (i !== 1) w.container('medical_bag', x + 1.2, z + 2.9, 0, { tier: 2 }); }
  const [tx, tz] = freeSpot(ctx, 286, 520, 2.2, 8); w.prop('sc_tent', tx, tz, 1.3, { solid: true }); w.prop('sc_hospbed', tx + 3, tz + 0.5, 1.3, { solid: true }); w.container('medical_bag', tx - 2.6, tz, 0, { tier: 2 });
  for (let i = 0; i < 5; i++) w.prop('sc_barrier', ...freeSpot(ctx, 300 + i * 4, 512 - i, 1.1), -0.25, { solid: true });
  w.prop('sc_billboard', ...freeSpot(ctx, 380, 500, 1.4), -0.25, { solid: true });
}
// ---- the Dune-Hill Mall: a dune climbed the west wall to the roof (someone laid planks across the last gap)
function mall(ctx) {
  const { w, rng } = ctx;
  const C = ctx.cxs.find(c => c.o.tag === 'mall'); if (!C) return;
  const s = C.segs[0], [wx, wz] = toW(C, s.x0, (s.z0 + s.z1) / 2), y = s.roofY;
  // the dune: crest 3 m west of the wall at roof height, tailing off into the street
  // a wedge of sand: crest 3 m off the wall at roof height, running 20 m down into the street, narrowing to the sides
  w.heightFn((x, z) => {
    if (x < wx - 26 || x > wx - 2 || Math.abs(z - wz) > 13) return null;
    const f = clamp(1 - (wx - 3.2 - x) / 20, 0, 1) * (1 - sstep(5, 13, Math.abs(z - wz)));
    return f > 0 ? Math.max(w.groundAt(x, z), lerp(w.groundAt(x, z), y - 0.15, f)) : null;
  }, 'set');
  for (let i = 0; i < 9; i++) w.paintCircle(i % 3 ? 'sand' : 'sandDark', wx - 4 - i * 2.2, wz - 8 + (i % 4) * 5, 7 - i * 0.4, 0.5, i);
  for (let i = 0; i < 6; i++) w.paintCircle('sand', wx - 1.5, wz - 11 + i * 4.4, 3.2, 0.4, 20 + i);   // right up to the wall (backfill banks it there)
  w.bridge([[wx - 4, wz], [wx + 2.2, wz]], 2.4, y, 'wood', { thick: 0.2, rails: false, pillars: 0 });
  ctx.keepClear.push([wx - 10, wz, 12]);
  cafe(ctx, 530, 572, 6); cafe(ctx, 584, 574, 4);
  for (let i = 0; i < 8; i++) w.prop('sc_cart', ...freeSpot(ctx, 520 + rng() * 80, 562 + rng() * 26, 0.8, 6), rng() * 6, { solid: true });
  w.prop('sc_billboard', ...freeSpot(ctx, 560, 566, 1.4), 0, { solid: true });
  for (let i = 0; i < 4; i++) stLamp(w, 520 + i * 26, 588, { intensity: 1.4, range: 11 });
}
// ---- No Refunds Travel Agency: a rocket on the billboard, the queue barrier still up
function travel(ctx) {
  const { w, rng } = ctx;
  const C = ctx.cxs.find(c => c.o.tag === 'travel'); if (!C) return;
  const s = C.segs[0], [x, z] = toW(C, (s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2);
  w.prop('sc_billboard', x, z, 0, { yAbs: s.roofY, solid: [2.2, 0.4, 4] });
  for (let i = 0; i < 6; i++) w.prop('sc_barrier', ...freeSpot(ctx, 432, 634 + i * 8, 1), Math.PI / 2, { solid: true });
  for (let i = 0; i < 4; i++) w.prop('sc_bench', ...freeSpot(ctx, 426, 640 + i * 12, 1), Math.PI / 2, { solid: true });
  w.container('desk', ...freeSpot(ctx, 438, 660, 0.8), 0, { tier: 2 }); w.container('suitcase', ...freeSpot(ctx, 436, 676, 0.8), 0, { tier: 2 });
}
// ---- Low Tide Park: a bandstand, a fountain with no water and pedal boats with no lake
function lowTidePark(ctx) {
  const { w, rng } = ctx;
  canopy(ctx, 660, 420, 10, 10, 3.4, { name: 'The Bandstand (No Band)', roof: 'roofTile', wall: 'plaster', tint: TINT.white, roofTint: 0xd47862 });
  w.prop('sc_fountain', ...freeSpot(ctx, 690, 438, 3), 0, { solid: true });
  for (let i = 0; i < 4; i++) w.prop('sc_pedalo', ...freeSpot(ctx, 628 + i * 7, 446, 1.4, 6), rng() * 6, { solid: true });
  for (let i = 0; i < 10; i++) w.prop('sc_bench', ...freeSpot(ctx, 616 + rng() * 90, 410 + rng() * 44, 1), rng() * 6, { solid: true });
  w.prop('sc_kiosk', ...freeSpot(ctx, 640, 412, 1.3), 0, { solid: true });
  w.container('basket', ...freeSpot(ctx, 646, 414, 0.8), 0, { tier: 1 }); w.container('plant', ...freeSpot(ctx, 700, 452, 0.8), 0, { tier: 1 });
  w.container('trash', ...freeSpot(ctx, 676, 420, 0.8), 0, { tier: 1 });
  for (const [x, z] of [[630, 430], [676, 452], [700, 418]]) stLamp(w, ...freeSpot(ctx, x, z, 1), { intensity: 1.4, range: 11 });
}
// ---- Ocean View* Condos: flags, a show-home sign, a pool with no water and a view with no ocean
function condos(ctx) {
  const { w, rng } = ctx;
  for (let i = 0; i < 6; i++) w.prop('sc_flag', ...freeSpot(ctx, 672 + i * 5, 690 - i * 12, 1), 0, { solid: true });
  const px = 700, pz = 652;
  w.ramp(px - 7, pz - 4, px + 7, pz + 4, w.groundAt(px, pz) - 0.3, w.groundAt(px, pz) - 1.6, 'x');
  w.paint('tiles', px - 8, pz - 5, px + 8, pz + 5);
  w.ladder(px + 6.4, pz, null, px + 8, pz, w.groundAt(px + 9, pz), -Math.PI / 2);
  for (let i = 0; i < 6; i++) w.prop('sc_sunbed', px - 8 + i * 3, pz + 7, 0, { solid: true });
  w.prop('sc_lifeguard', px + 10, pz - 6, Math.PI, { solid: true });
  w.container('backpack', px - 4, pz + 9, 0, { tier: 1 }); w.container('suitcase', px + 6, pz + 9, 0, { tier: 2 });
  ctx.keepClear.push([px, pz, 9]);
  w.prop('sc_billboard', ...freeSpot(ctx, 690, 732, 1.4), 1.2, { solid: true });
}
// ---- the Overdue Library: book returns, reading benches, the founder's other statue
function library(ctx) {
  const { w, rng } = ctx;
  w.prop('sc_statue', ...freeSpot(ctx, 360, 584, 1.2), 0.8, { solid: true });
  for (let i = 0; i < 4; i++) w.prop('sc_bench', ...freeSpot(ctx, 344 + i * 8, 596 - i * 3, 1), 0.8, { solid: true });
  w.container('cabinet', ...freeSpot(ctx, 352, 572, 0.8), 0, { tier: 2 }); w.container('desk', ...freeSpot(ctx, 372, 598, 0.8), 0, { tier: 2 });
}
// ---- Dry Run Water Park: empty pools, a lazy river with no river, the slide tower
function waterPark(ctx) {
  const { w, rng } = ctx;
  const gy = w.groundAt(244, 770);
  w.paint('tiles', 186, 714, 312, 824);                                                  // the pool deck
  // the wave pool (shallow end to the west) and the kiddie pool
  for (const [x0, z0, x1, z1, dep] of [[210, 752, 262, 784, 1.8], [272, 788, 292, 806, 0.9]]) {
    w.ramp(x0, z0, x1, z1, gy - 0.25, gy - dep, 'x');
    w.paint('concrete', x0 - 1, z0 - 1, x1 + 1, z1 + 1); w.paint('metalPanel', x0, z0, x1, z1);
    w.ladder(x1 - 1.2, (z0 + z1) / 2, null, x1 + 1, (z0 + z1) / 2, gy, -Math.PI / 2);
  }
  w.water(250, 752, 262, 784, { level: gy - 1.45, deep: 0x2a6a70, shallow: 0x4a9a98, opacity: 0.8 });   // the last of the wave pool
  // the lazy river: a dry walkable channel looping round the pools
  const loop = [[198, 742], [298, 738], [304, 780], [302, 816], [200, 818], [194, 780], [198, 742]];
  w.ridge(loop, 3.4, gy - 0.8, 1.6, 'min');
  w.path(loop, 3.4, 'metalPanel');
  for (const [a, b] of [[[246, 734], [246, 746]], [[188, 800], [200, 800]]]) w.bridge([a, b], 2.2, gy + 0.1, 'wood', { thick: 0.2, rails: true, railH: 0.8, pillars: 0 });
  // slides from the tower into the wave pool, sunbeds, parasols, the lifeguard
  w.prop('sc_slide', 265.5, 764, -Math.PI / 2, { solid: [1.2, 3.5, 3] });
  w.prop('sc_slide', 265.5, 773, -Math.PI / 2 - 0.25, { solid: [1.2, 3.5, 3] });
  for (let i = 0; i < 10; i++) { const [x, z] = freeSpot(ctx, 212 + i * 5, 794 + (i % 2) * 6, 1, 4); w.prop('sc_sunbed', x, z, 0, { solid: true }); if (i % 3 === 0) w.prop(rng() < 0.5 ? 'sc_parasol' : 'sc_parasol2', x + 1.4, z, 0, { solid: true }); if (i % 4 === 1) w.container(rng() < 0.5 ? 'backpack' : 'suitcase', x, z + 2, 0, { tier: 1 }); }
  w.prop('sc_lifeguard', 236, 748, 0, { solid: true });
  w.prop('sc_kiosk', ...freeSpot(ctx, 290, 724, 1.3), 0, { solid: true }); w.container('fridge', ...freeSpot(ctx, 294, 726, 0.8), 0, { tier: 1 });
  w.fence([[184, 712], [312, 712]], 1.6, 'rust'); w.fence([[312, 712], [314, 826]], 1.6, 'rust');
  for (const [x, z] of [[220, 720], [270, 724], [204, 804], [300, 800]]) stLamp(w, x, z, { intensity: 1.3, range: 10 });
  ctx.keepClear.push([244, 770, 30], [290, 800, 14]);
}
// ---- Pump & Dump: canopy over the pumps, a car wash that only washed sand
function gasStation(ctx) {
  const { w, rng } = ctx;
  w.paint('concrete', 480, 808, 528, 876); w.paint('asphalt', 482, 816, 496, 846);
  const gs = canopy(ctx, 480, 816, 14, 26, 4.6, { name: 'Pump & Dump Gas Station', roof: 'metalPanel', wall: 'plaster', tint: TINT.yellow });
  for (const lx of [3.5, 10.5]) for (const lz of [5, 13, 21]) w.prop('sc_pump', ...w.local(gs, lx, lz), 0, { solid: true });
  w.prop(CARS[2], ...w.local(gs, 7, 9), 0.1, { solid: true }); w.container('car_trunk', ...w.local(gs, 7, 12), 0, { tier: 1 });
  canopy(ctx, 482, 856, 10, 12, 3.6, { name: 'Car Wash (Sand Rinse)', roof: 'corrugated', wall: 'concrete' });
  w.prop('sc_sign', 470, 812, 0, { solid: true, scale: 1.6 }); w.prop('sc_salesign', 474, 872, 0.2, { solid: true });
  for (const [x, z] of [[516, 812], [518, 814], [517, 870]]) w.prop(rng() < 0.6 ? 'barrel' : 'barrelBlue', x, z, 0, { solid: true });
  w.container('toolbox', 520, 816, 0, { tier: 1 }); w.container('trash', 478, 872, 0);
  w.lamp(...w.local(gs, 4, 13), { y: 4.2, color: 0xfff4e0, intensity: 1.2, range: 12, model: null, flicker: 0.3 });
  w.lamp(...w.local(gs, 10, 13), { y: 4.2, color: 0xfff4e0, intensity: 1.2, range: 12, model: null });
}
// ---- Sunk Cost Solar Farm: rows of panels slowly going under
function solarFarm(ctx) {
  const { w, rng } = ctx;
  for (let z = 196; z <= 296; z += 7) for (let x = 94; x <= 206; x += 3.2) {
    if (Math.abs(x - 150) < 14 && Math.abs(z - 236) < 10) continue;   // the inverter shed
    if (polyDist(x, z, STREETS[14][1])[0] < 6) continue;              // the road through it
    const r = rng(); if (r < 0.12) continue;
    w.prop('sc_solar', x, z, 0, { solid: [1.0, 0.6, 1.2], y: r < 0.35 ? -0.7 : 0 });
  }
  w.fence([[86, 190], [216, 186]], 1.6, 'rust'); w.fence([[86, 190], [90, 304]], 1.6, 'rust'); w.fence([[90, 304], [218, 300]], 1.6, 'rust');
  for (const [x, z] of [[140, 248], [166, 224], [112, 270]]) w.container(rng() < 0.6 ? 'electronics' : 'toolbox', ...freeSpot(ctx, x, z, 0.8, 6), 0, { tier: 2 });
  for (const [x, z] of [[132, 230], [172, 248]]) w.lamp(x, z, { y: 4, color: 0xffd8a0, intensity: 1.1, range: 11 });
}
// ---- the Bypass: traffic jam, sand on the asphalt, the Gridlock Campground on the viaduct
function bypassLife(ctx) {
  const { w, rng } = ctx, HW = ctx.HW;
  const campS = polyDist(800, 160, HW.pts)[1];
  for (let s = 20; s < HW.total - 10; s += 9 + rng() * 14) {
    if (HW.inGap(s) || HW.inGap(s + 6) || HW.inGap(s - 6) || Math.abs(s - campS) < 40) continue;
    const [x, z, tx, tz] = pointAt(HW.pts, s), side = rng() < 0.5 ? 1 : -1, off = 1.5 + rng() * 2;
    const px = x - tz * side * off, pz = z + tx * side * off, rot = Math.atan2(tx, tz) + (rng() - 0.5) * 0.6 + (rng() < 0.5 ? Math.PI : 0);
    const t = rng();
    if (t < 0.55) { w.prop(CARS[Math.floor(rng() * 4)], px, pz, rot, { solid: true }); if (rng() < 0.55) w.container('car_trunk', px + Math.sin(rot) * 2.7, pz + Math.cos(rot) * 2.7, rot, { tier: 1 }); }
    else if (t < 0.64) w.prop('sc_bus', px, pz, rot, { solid: true });
    else if (t < 0.8) w.prop('sc_barrier', px, pz, Math.atan2(tz, -tx) + (rng() - 0.5), { solid: true });
    else if (t < 0.9) { w.prop('husk', px, pz, rng() * 6, { solid: true }); w.container('arc_husk', px + 2.1, pz, 0, { tier: 2 }); }
    else w.prop('sc_rubble', px, pz, rng() * 6, { solid: true });
  }
  for (let s = 10; s < HW.total; s += 26) {
    if (HW.inGap(s)) continue;
    const [x, z, tx, tz] = pointAt(HW.pts, s);
    w.paintCircle('sand', x + (rng() - 0.5) * 6, z + (rng() - 0.5) * 6, 2 + rng() * 3.5, 0.5, s);
    if (rng() < 0.5) stLamp(w, x - tz * (HW.width / 2 - 0.6), z + tx * (HW.width / 2 - 0.6), { intensity: 1.5, range: 11, flicker: rng() < 0.3 ? 0.5 : 0 });
  }
  // the campground: tents along both parapets, a fire in the middle lane, sandbag walls at both ends
  for (let i = 0; i < 8; i++) {
    const [x, z, tx, tz] = pointAt(HW.pts, campS - 24 + i * 7), side = i % 2 ? 1 : -1, nx = -tz * side * 3.4, nz = tx * side * 3.4;
    w.prop(['sc_tent', 'sc_tarp', 'sc_tent2', 'sc_tarp2', 'sc_container', 'sc_tent', 'sc_tarp', 'sc_tent2'][i], x + nx, z + nz, Math.atan2(tx, tz) + (side > 0 ? 0 : Math.PI), { solid: i % 2 === 0 || i === 4 });
  }
  const [cx, cz] = pointAt(HW.pts, campS);
  w.prop('sc_campfire', cx, cz, 0, {}); w.lamp(cx, cz, { y: 0.8, color: 0xff9040, intensity: 1.6, range: 10, flicker: 0.6, model: null });
  w.container('raider_cache', cx + 1.5, cz + 1.5, 0, { tier: 3 }); w.container('raider_cache', ...pointAt(HW.pts, campS + 20).slice(0, 2), 0, { tier: 2 });
  w.container('ammo_box', cx - 1.8, cz + 0.6, 0, { tier: 2 }); w.container('backpack', cx + 0.4, cz - 1.9, 0, { tier: 1 });
  w.container('suitcase', ...pointAt(HW.pts, campS - 14).slice(0, 2), 0, { tier: 1 });
  for (const ds of [-34, 30]) for (let i = -2; i <= 2; i++) { const [x, z, tx, tz] = pointAt(HW.pts, campS + ds); w.prop('sandbag', x - tz * i * 2.2, z + tx * i * 2.2, Math.atan2(tx, tz) + Math.PI / 2, { solid: true }); }
  // a ladder up a pier from the sea bed to the camp
  { const [x, z, tx, tz] = pointAt(HW.pts, campS + 12), nx = -tz, nz = tx, hw = HW.width / 2, y = HW.yAt(campS + 12);
    w.ladder(x + nx * (hw + 1.0), z + nz * (hw + 1.0), null, x + nx * (hw - 1.2), z + nz * (hw - 1.2), y, Math.atan2(-nx, -nz)); }
}
function fieldDepots(ctx) {
  const { w } = ctx;
  for (const [x, z] of FIELD_DEPOTS) {
    const [px, pz] = freeSpot(ctx, x, z, 2.2);
    w.prop('sc_fielddepot', px, pz, 0, { solid: true }); w.container('field_depot', px, pz + 2.2, 0, { tier: 2, label: 'Supply Shack' });
    w.prop('lootCrate', px + 2.6, pz + 1, 0.3, { solid: true });
    w.lamp(px - 1.6, pz + 1.6, { y: 2.2, color: 0x80c8ff, intensity: 0.9, range: 7, model: null });
  }
}
function setPieces(ctx) {
  seaWall(ctx); hillWalls(ctx); jettyAndLighthouse(ctx); yachtGraveyard(ctx); port(ctx); labs(ctx); upperSandy(ctx); theatre(ctx); terraces(ctx);
  roundabout(ctx); strip(ctx); hospital(ctx); mall(ctx); travel(ctx); lowTidePark(ctx); condos(ctx); library(ctx); waterPark(ctx);
  gasStation(ctx); solarFarm(ctx); bypassLife(ctx); fieldDepots(ctx);
}

// =====================================================================================================
// VEGETATION + CLUTTER
// =====================================================================================================
function vegetation(ctx) {
  const { w, rng } = ctx;
  const avoid = (x, z) => ctx.blocked(x, z, 1.5) || ctx.isSea(x, z, 2);
  const kinds = {
    olive: [['sc_olive', 4], ['sc_olive2', 4], ['sc_palm2', 1], ['sc_cypress', 1.2]],
    palm: [['sc_palm', 4], ['sc_palm2', 2], ['sc_palm3', 2]],
    mix: [['sc_palm', 3], ['sc_olive', 3], ['sc_olive2', 2], ['sc_palm3', 1.5], ['sc_cypress', 1.2], ['sc_palm2', 1]],
    park: [['sc_palm', 3], ['sc_palm3', 2], ['sc_cypress', 1], ['sc_olive', 1], ['tree', 0.6]],
  };
  GROVES.forEach((g, gi) => {
    let a = 0; for (let i = 0, j = g.pts.length - 1; i < g.pts.length; j = i++) a += (g.pts[j][0] + g.pts[i][0]) * (g.pts[j][1] - g.pts[i][1]);
    const area = Math.abs(a / 2), n = Math.round(area / 100 * g.d);
    const ks = kinds[g.k];
    let tot = 0; for (const k of ks) tot += k[1];
    // wild plants worth picking in the groves (nature loot); trees keep clear of them
    for (let i = 0, k = 0, [bx0, bz0, bx1, bz1] = bounds(g.pts); i < 20 && k < (g.k === 'park' ? 4 : 1 + (area > 5000 ? 1 : 0)); i++) {
      const px = lerp(bx0, bx1, rng()), pz = lerp(bz0, bz1, rng());
      if (!inPoly(px, pz, g.pts) || avoid(px, pz)) continue;
      w.container('plant', px, pz, rng() * 6, { tier: rng() < 0.2 ? 2 : 1 }); ctx.keepClear.push([px, pz, 1]); k++;
    }
    for (const [k, wgt] of ks) w.scatter(k, g.pts, Math.round(n * wgt / tot), { solid: true, seed: 1000 + gi * 17 + k.length, avoid, scale: k.startsWith('sc_olive') ? 1.45 : k === 'sc_cypress' ? 1.1 : 1.25, scaleVar: 0.4 });
    w.scatter(gi % 3 ? 'sc_shrub' : 'bush', g.pts, Math.round(n * 0.5), { seed: 2000 + gi, avoid, scaleVar: 0.5 });
    w.scatter('sc_agave', g.pts, Math.round(n * 0.12), { seed: 3000 + gi, avoid });
    const [x0, z0, x1, z1] = bounds(g.pts);
    for (let i = 0; i < Math.round(area / 900); i++) { const px = lerp(x0, x1, rng()), pz = lerp(z0, z1, rng()); if (inPoly(px, pz, g.pts) && !avoid(px, pz)) w.paintCircle(g.k === 'park' ? 'grass' : rng() < 0.5 ? 'dirt' : 'sandDark', px, pz, 3 + rng() * 5, 0.6, i); }
  });
  // palms along the promenade and dotted through the town (courtyards, corners)
  for (let s = 8, L = polyLen(PROMENADE); s < L; s += 17) {
    const [x, z, tx, tz] = pointAt(PROMENADE, s), px = x + tz * (PROM_W / 2 + 1.4), pz = z - tx * (PROM_W / 2 + 1.4);
    if (!ctx.blocked(px, pz, 1.2) && !ctx.isSea(px, pz, 1.5)) w.prop(s % 34 < 17 ? 'sc_palm' : 'sc_palm3', px, pz, rng() * 6, { solid: true });
  }
  let placed = 0;
  for (let i = 0; i < 2500 && placed < 220; i++) {
    const x = 160 + rng() * 620, z = 110 + rng() * 740;
    if (ctx.low.at(x, z) < 0.75 || ctx.blocked(x, z, 2.2) || ctx.isSea(x, z, 4)) continue;
    w.prop(['sc_palm', 'sc_palm2', 'sc_palm3', 'sc_olive', 'sc_cypress'][Math.floor(rng() * 5)], x, z, rng() * 6, { solid: true, scale: 0.85 + rng() * 0.3 });
    placed++;
  }
  // dune scrub; dried weed and shell grit on the sea bed
  const dune = (x, z) => ctx.low.at(x, z) > 0.6 || ctx.isSea(x, z, 2);
  w.scatter('sc_grass', [0, 0, MW, MH], 3400, { seed: 77, avoid: (x, z) => dune(x, z) || ctx.blocked(x, z, 0.5), scaleVar: 0.6 });
  w.scatter('sc_shrub_dry', [0, 0, MW, MH], 650, { seed: 78, avoid: (x, z) => ctx.low.at(x, z) > 0.75 || ctx.isSea(x, z, 2) || ctx.blocked(x, z, 1), scaleVar: 0.5 });
  w.scatter('deadTree', [0, 0, MW, MH], 80, { seed: 79, solid: true, avoid: (x, z) => ctx.low.at(x, z) > 0.5 || ctx.isSea(x, z, 2) || ctx.blocked(x, z, 2) });
  w.scatter('cactus', [0, 0, MW, MH], 70, { seed: 80, solid: true, avoid: (x, z) => ctx.low.at(x, z) > 0.4 || ctx.isSea(x, z, 2) || ctx.blocked(x, z, 2) });
  w.scatter('sc_shrub_dry', [600, 0, MW, MH], 420, { seed: 84, scale: 0.7, avoid: (x, z) => !ctx.isSea(x, z) || ctx.blocked(x, z, 1), scaleVar: 0.5 });
  w.scatter('rock', [600, 0, MW, MH], 90, { seed: 85, solid: true, scale: 0.9, avoid: (x, z) => !ctx.isSea(x, z) || polyDist(x, z, COAST)[0] < 6 || ctx.blocked(x, z, 2), scaleVar: 0.7 });
  // wind-cut rock outcrops in the dune sea
  for (const [cx, cz, r, hh] of [[70, 340, 18, 4.5], [110, 760, 14, 3.5], [640, 880, 16, 4]]) {
    const pts = []; for (let i = 0; i < 7; i++) { const a = i / 7 * 6.283, rr = r * (0.7 + N2(cx + i, cz) * 0.6); pts.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr * 0.6]); }
    w.raisePoly(pts, w.groundAt(cx, cz) + hh, 2.5, 'max'); w.paintPoly('rock', pts);
    w.scatter('rock', [cx - r - 6, cz - r, cx + r + 6, cz + r], 14, { seed: 86 + cx, solid: true, scale: 1.4 });
  }
  w.scatter('rock', [0, 0, MW, MH], 130, { seed: 83, solid: true, avoid: (x, z) => ctx.low.at(x, z) > 0.45 || ctx.isSea(x, z, 2) || ctx.blocked(x, z, 2), scaleVar: 0.8 });
}
function bounds(pts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } return [a, b, c, d]; }

function buriedHouses(ctx) {
  const { w, rng } = ctx;
  // buried houses: roofs and attic windows poking from the sand (each at its own angle)
  for (const [cx, cz, W, D, ax, show, deg0] of BURIED) {
    const deg = deg0 ?? (((cx * 7 + cz * 13) % 70) - 35);   // half-buried villas lie at the town's skewed angles
    const R = rotFrame(cx, cz, deg * D2R), F = { R }, poly = rectPoly(F, cx - W / 2, cz - D / 2, cx + W / 2, cz + D / 2);
    if (poly.some(([x, z]) => ctx.occ.at(x, z) !== -1) || !ctx.occ.free(cx - 2, cz - 2, cx + 2, cz + 2)) continue;
    const gs = poly.map(([x, z]) => w.groundAt(x, z)).concat([w.groundAt(cx, cz)]);
    const g = Math.min(...gs), top = Math.max(...gs) + show, tint = TINT[TINT_CYCLE[Math.floor(rng() * TINT_CYCLE.length)]];
    w.block(cx - W / 2, cz - D / 2, cx + W / 2, cz + D / 2, top - g + 2.5, 'plaster', { y0: g - 2.5, tint, R });
    const steps = Math.floor((ax === 'x' ? D : W) / 1.8);
    for (let k = 0; k < steps; k++) {
      const ins = k * 0.9;
      if (ax === 'x') w.block(cx - W / 2 - 0.3, cz - D / 2 + ins - 0.3, cx + W / 2 + 0.3, cz + D / 2 - ins + 0.3, 0.45, 'roofTile', { y0: top + k * 0.45, R, tint: ROOF_TINTS[k % 3] === 0xffffff ? 0xffffff : 0xf4dcc8 });
      else w.block(cx - W / 2 + ins - 0.3, cz - D / 2 - 0.3, cx + W / 2 - ins + 0.3, cz + D / 2 + 0.3, 0.45, 'roofTile', { y0: top + k * 0.45, R });
    }
    w.block(cx - 0.6, cz + D / 2 - 0.05, cx + 0.6, cz + D / 2 + 0.1, 1.0, 'roofTar', { y0: top - 1.1, collide: false, R });
    ctx.occ.markPoly(poly, 99999);
    if (rng() < 0.5) w.container(rng() < 0.5 ? 'cabinet' : 'suitcase', ...rotPt(R, cx, cz + D / 2 + 1.6), Math.PI - deg * D2R, { tier: 2 });
  }
}

function streetClutter(ctx) {
  const { w, rng } = ctx;
  // shop fronts: awnings, planters, parked scooters along exposed (local) south/north walls
  for (const s of ctx.segs) {
    const C = s.C;
    if (s.ruin || C.kind === 'i' || C.kind === 'p' || C.kind === 'm' || C.kind === 't') continue;
    const shop = C.kind === 's' || (C.o.poi && rng() < 0.6) || rng() < 0.22;
    for (const [side, z, rot] of [['s', s.z1, 0], ['n', s.z0, Math.PI]]) {
      const out = side === 's' ? 1 : -1, wr = rot - C.rot;
      for (let x = s.x0 + 2.2; x < s.x1 - 2.2; x += 3.6 + rng() * 3) {
        const [ox, oz] = toW(C, x, z + out * 1.2);
        if (ctx.occ.at(ox, oz) !== -1 || ctx.onDeck(ox, oz)) continue;
        if (Math.abs(w.groundAt(ox, oz) - C.floorY) > 0.8) continue;
        const t = rng(), P = d => toW(C, x, z + out * d);
        if (shop && t < 0.4) { const [ax, az] = P(0.16); w.prop(['sc_awning', 'sc_awning2', 'sc_awning3'][Math.floor(rng() * 3)], ax, az, wr, { y: C.floorY - w.groundAt(...P(0.5)) }); }
        else if (t < 0.52) w.prop(rng() < 0.5 ? 'sc_planter' : 'sc_planter2', ...P(0.7), 0, { solid: true });
        else if (t < 0.56 && !ctx.nearDoor(ox, oz, 2)) w.prop(rng() < 0.5 ? 'sc_vespa' : 'sc_vespa2', ...P(1.1), Math.PI / 2 + wr + (rng() - 0.5) * 0.3, { solid: true });
        else if (t < 0.6 && !ctx.nearDoor(ox, oz, 2)) w.prop('barrel', ...P(0.7), 0, { solid: true });
        else if (t < 0.63) w.prop('sc_laundry', ...P(1.6), wr, {});
      }
    }
  }
  // parked / abandoned cars, debris, signs and street lamps in the open lanes (clustered vignettes)
  const lanes = (x, z, r) => ctx.low.at(x, z) > 0.6 && !ctx.isSea(x, z, 3) && !ctx.blocked(x, z, r);
  const B = { car: 190, lamp: 230, deb: 1150, sign: 70, husk: 40, trash: 60, barricade: 70, market: 55, weeds: 950, junk: 180 };
  const cnt = {}; for (const k in B) cnt[k] = 0;
  const near = (x, z, r) => { const a = rng() * 6.283, d = rng() * r; return [x + Math.cos(a) * d, z + Math.sin(a) * d]; };
  for (let i = 0; i < 26000; i++) {
    const x = 140 + rng() * 660, z = 100 + rng() * 780, t = rng();
    if (t < 0.1) {
      if (cnt.car >= B.car || !lanes(x, z, 2.4)) continue;
      const sunk = ctx.low.at(x, z) < 0.8;
      const rot = rng() * 6.283, k = sunk ? (rng() < 0.5 ? 'sc_carroof' : 'sc_carroof2') : ['sc_fiat', 'sc_fiat2', 'sc_fiat3', 'sc_fiat4'][Math.floor(rng() * 4)];
      w.prop(k, x, z, rot, { solid: true }); if (rng() < 0.3) w.container('car_trunk', x + Math.sin(rot) * 2.7, z + Math.cos(rot) * 2.7, rot, { tier: 1 });
      if (rng() < 0.5) { const [px, pz] = near(x, z, 3); if (!ctx.blocked(px, pz, 0.4)) w.prop('debris', px, pz, rng() * 6, {}); }
      cnt.car++;
    } else if (t < 0.2) {
      if (cnt.lamp >= B.lamp || !lanes(x, z, 1.2)) continue;
      stLamp(w, x, z, { intensity: 1.5, range: 11, color: 0xffd8a0, flicker: rng() < 0.15 ? 0.6 : 0 }); cnt.lamp++;
    } else if (t < 0.45) {
      if (cnt.deb >= B.deb || !lanes(x, z, 0.8)) continue;
      const k = rng(); w.prop(k < 0.4 ? 'debris' : k < 0.62 ? 'sc_rubble' : k < 0.78 ? 'sc_rubble2' : k < 0.9 ? 'sc_slab' : 'sc_slab2', x, z, rng() * 6, { solid: k > 0.4 }); cnt.deb++;
    } else if (t < 0.5) {
      if (cnt.sign >= B.sign || !lanes(x, z, 1)) continue;
      w.prop(rng() < 0.5 ? 'sc_sign' : 'sc_streetsign', x, z, rng() * 6, { solid: true }); cnt.sign++;
    } else if (t < 0.53) {
      if (cnt.husk >= B.husk || !lanes(x, z, 2)) continue;
      w.prop('husk', x, z, rng() * 6, { solid: true }); if (rng() < 0.7) w.container('arc_husk', x + 2.1, z + 0.4, 0, { tier: 2 }); cnt.husk++;
      for (let j = 0; j < 3; j++) { const [px, pz] = near(x, z, 4); if (!ctx.blocked(px, pz, 0.4)) w.prop('debris', px, pz, rng() * 6, {}); }
    } else if (t < 0.58) {
      if (cnt.trash >= B.trash || !lanes(x, z, 1)) continue;
      w.container('trash', x, z, rng() * 6, { tier: 1 }); cnt.trash++;
    } else if (t < 0.64) {
      // raider barricade: sandbags in an arc, barrels, a crate
      if (cnt.barricade >= B.barricade || !lanes(x, z, 3)) continue;
      const a0 = rng() * 6.283;
      for (let j = 0; j < 3; j++) { const a = a0 + (j - 1) * 0.6; w.prop('sandbag', x + Math.cos(a) * 2.6, z + Math.sin(a) * 2.6, -a + Math.PI / 2, { solid: true }); }
      w.prop(rng() < 0.6 ? 'barrel' : 'barrelBlue', x - Math.cos(a0) * 0.6, z - Math.sin(a0) * 0.6, 0, { solid: true });
      if (rng() < 0.6) w.prop('crate', x - Math.cos(a0 + 1.2) * 1.4, z - Math.sin(a0 + 1.2) * 1.4, a0, { solid: true });
      if (rng() < 0.35) w.container(rng() < 0.5 ? 'ammo_box' : 'backpack', x - Math.cos(a0) * 1.8, z - Math.sin(a0) * 1.8, a0, { tier: 1 });
      cnt.barricade++;
    } else if (t < 0.68) {
      // abandoned market corner: crates, baskets, amphorae, planters, a parasol
      if (cnt.market >= B.market || !lanes(x, z, 2.5)) continue;
      for (let j = 0; j < 4; j++) { const [px, pz] = near(x, z, 2.4); if (!ctx.blocked(px, pz, 0.5)) w.prop(['crate', 'sc_vase', 'sc_planter', 'sc_cratestack', 'sc_planter2'][Math.floor(rng() * 5)], px, pz, rng() * 6, { solid: true }); }
      if (rng() < 0.5) w.prop(rng() < 0.5 ? 'sc_parasol' : 'sc_parasol2', x, z, 0, { solid: true });
      if (rng() < 0.3) w.container('basket', x, z + 2.9, 0, { tier: 1 });
      cnt.market++;
    } else if (t < 0.9) {
      if (cnt.weeds >= B.weeds || !lanes(x, z, 0.3)) continue;
      w.prop(rng() < 0.7 ? 'sc_grass' : rng() < 0.6 ? 'sc_shrub_dry' : 'sc_agave', x, z, rng() * 6, { scale: 0.7 + rng() * 0.5 }); cnt.weeds++;
    } else {
      if (cnt.junk >= B.junk || !lanes(x, z, 1)) continue;
      const k = rng();
      if (k < 0.3) { w.prop('barrel', x, z, 0, { solid: true }); w.prop(rng() < 0.5 ? 'barrel' : 'barrelBlue', x + 0.7, z + 0.2, 0, { solid: true }); }
      else if (k < 0.5) w.prop('pipe', x, z, rng() * 6, { solid: true });
      else if (k < 0.65) w.prop('sc_bench', x, z, rng() * 6, { solid: true });
      else if (k < 0.8) w.prop(rng() < 0.5 ? 'sc_vespa' : 'sc_vespa2', x, z, rng() * 6, { solid: true });
      else if (k < 0.9) w.prop('sc_column_fallen', x, z, rng() * 6, { solid: true });
      else w.prop('sc_kiosk', x, z, rng() < 0.5 ? 0 : Math.PI / 2, { solid: true });
      cnt.junk++;
    }
  }
  ctx.clutterCounts = cnt;
  // Legacy Systems (barron_husk): fixed landmark wrecks of giant Beta Test machines on the sea bed and in the dunes (tier 3)
  for (const [x0, z0, r] of [[786, 580, 0.6], [62, 262, -0.4], [330, 862, 1.1]]) {
    const [x, z] = freeSpot(ctx, x0, z0, 4, 30);
    w.container('barron_husk', x, z, r, { tier: 3 });
    w.prop('husk', x + Math.cos(r) * 4.5, z - Math.sin(r) * 4.5, r + 0.8, { solid: true, scale: 1.6 });
    for (let i = 0; i < 6; i++) { const a = i * 1.05 + r, d = 5 + (i % 3) * 1.5; w.prop(i % 2 ? 'debris' : 'sc_slab2', x + Math.cos(a) * d, z + Math.sin(a) * d, a, { solid: i % 2 === 0 }); }
    ctx.keepClear.push([x, z, 3.5]);
  }
  // husks + buried cars out in the dunes, ARK crates
  for (let i = 0, n = 0; i < 3000 && n < 46; i++) {
    const x = 20 + rng() * 860, z = 20 + rng() * 860;
    if (ctx.low.at(x, z) > 0.5 || ctx.blocked(x, z, 2)) continue;
    const t = rng();
    const sea = ctx.isSea(x, z);
    if (sea && t >= 0.35 && t < 0.6) { w.prop(BOATS[Math.floor(rng() * BOATS.length)], x, z, rng() * 6, { solid: true }); n++; continue; }
    if (t < 0.35) { w.prop('husk', x, z, rng() * 6, { solid: true }); w.container('arc_husk', x + 2.1, z, 0, { tier: 2 }); }
    else if (t < 0.6) w.prop(rng() < 0.5 ? 'sc_carroof' : 'sc_carroof2', x, z, rng() * 6, { solid: true });
    else if (t < 0.75) { w.prop('arcCrate', x, z, rng() * 6, { solid: true }); w.container('arc_crate', x + 1.1, z, 0, { tier: 2 }); }
    else w.prop(sea ? 'sc_buoy' : 'sc_lamppost', x, z, 0, { solid: true, y: sea ? 0 : -1.2 });
    n++;
  }
}

// =====================================================================================================
// MAGPIE MAFIA (bird_city): chimney nests full of stolen trinkets, extra zipline catwalks between roofs
// =====================================================================================================
function birdCity(ctx) {
  const { w, rng, occ } = ctx;
  const roofs = ctx.segs.filter(s => s.bb && !s.ruin && !s.gable && !s.C.o.tower && s.C.kind !== 'p' && s.C.kind !== 'i');
  // chimneys on a share of the flat roofs (always there); under the condition each one holds a nest
  let nests = 0;
  for (const s of roofs) {
    if (rng() > 0.42) continue;
    const C = s.C, W = s.x1 - s.x0, D = s.z1 - s.z0;
    if (W < 7 || D < 7) continue;
    const lx = s.x0 + 2 + rng() * (W - 4), lz = s.z0 + 2 + rng() * (D - 4);
    if ((s.flights || []).some(f => { const r = f.res; return lx - s.x0 > r[0] - 1.2 && lx - s.x0 < r[2] + 1.2 && lz - s.z0 > r[1] - 1.2 && lz - s.z0 < r[3] + 1.2; })) continue;
    const [x, z] = toW(C, lx, lz);
    w.prop('sc_chimney', x, z, -C.rot, { yAbs: s.roofY, solid: [0.45, 0.45, 1.5] });
    w.prop('sc_nest', x, z, rng() * 6, { yAbs: s.roofY + 1.5, condition: 'bird_city' });
    const [cx, cz] = toW(C, lx + (lx - s.x0 < W / 2 ? 1.2 : -1.2), lz);
    w.container(rng() < 0.5 ? 'suitcase' : 'basket', cx, cz, rng() * 6, { yAbs: s.roofY, tier: rng() < 0.25 ? 3 : 2, label: 'Magpie Nest', condition: 'bird_city' });
    nests++;
  }
  // zipline catwalks: a cable with a hanging plank walk between two flat roofs of one height, 6-22 m apart,
  // across open air (built from 2 m segments so every peer drops them together when the condition is off)
  const pairs = [];
  for (let i = 0; i < roofs.length; i++) for (let j = i + 1; j < roofs.length; j++) {
    const A = roofs[i], Bs = roofs[j];
    if (A.C === Bs.C || Math.abs(A.roofY - Bs.roofY) > 0.45 || !bboxHit(A.poly, Bs.poly, 24)) continue;
    const ca = bounds(A.poly), cb = bounds(Bs.poly);
    const ax = (ca[0] + ca[2]) / 2, az = (ca[1] + ca[3]) / 2, bx = (cb[0] + cb[2]) / 2, bz = (cb[1] + cb[3]) / 2;
    const pa = closestOnPoly(A.poly, bx, bz), pb = closestOnPoly(Bs.poly, ax, az), d = Math.hypot(pb.x - pa.x, pb.z - pa.z);
    if (d < 6 || d > 22) continue;
    pairs.push({ A, B: Bs, pa, pb, d });
  }
  pairs.sort((p, q) => p.d - q.d);
  const used = new Map(); let lines = 0;
  for (const pr of pairs) {
    if (lines >= 26) break;
    if ((used.get(pr.A) || 0) >= 2 || (used.get(pr.B) || 0) >= 2) continue;
    const ux = (pr.pb.x - pr.pa.x) / pr.d, uz = (pr.pb.z - pr.pa.z) / pr.d;
    const sx = pr.pa.x - ux * 1.6, sz = pr.pa.z - uz * 1.6, L = pr.d + 3.2;
    let clear = true;
    for (let t = 1.8; t < L - 1.8; t += 0.5) { const o = occ.at(sx + ux * t, sz + uz * t); if (o !== -1 && o < 90000 && ctx.segs[o] !== pr.A && ctx.segs[o] !== pr.B) { clear = false; break; } }
    if (!clear || (ctx.planks || []).some(([px, pz]) => Math.hypot(px - sx, pz - sz) < 4)) continue;
    const y = Math.max(pr.A.roofY, pr.B.roofY), n = Math.ceil(L / 2), rot = Math.atan2(-uz, ux);
    for (let k = 0; k < n; k++) {
      const t = (k + 0.5) * L / n;
      w.prop('sc_zipwalk', sx + ux * t, sz + uz * t, rot, { yAbs: y - 0.12, solid: [L / n / 2 + 0.05, 0.7, 0.12], condition: 'bird_city' });
    }
    for (const [px, pz] of [[sx, sz], [sx + ux * L, sz + uz * L]]) w.prop('sc_zippost', px, pz, rot, { yAbs: y, solid: [0.2, 0.2, 2.6], condition: 'bird_city' });
    used.set(pr.A, (used.get(pr.A) || 0) + 1); used.set(pr.B, (used.get(pr.B) || 0) + 1); lines++;
  }
  ctx.birdStats = { nests, catwalks: lines };
}

// =====================================================================================================
// NO DEAD ENDS: places a raider could drop into but not climb out of (tools/stucktest.mjs finds them).
// These passes draw no random numbers, so the layout above never shifts.
// =====================================================================================================
// doorways of a storey a raider can use, as { u0, u1 } along the side (segment-relative). Upstairs ones lead
// into the next wing; on the ground storey: into the next wing, onto ground within a metre of the floor (a ramp
// was dug to it), or, in a cut up to 3.5 m deep, down a flight of steps that backfill() builds (steps: the
// flight's span and rise). A doorway a dune has buried deeper (the mall's west door) counts as wall.
function usableDoors(ctx, s, side, storey = 0) {
  const { w, occ } = ctx, si = sideInfo(s, side), C = s.C, fy = C.floorY, reach = 0.5 + (C.o.sunk ? 0.8 : 1.6) + 0.1;
  const out = (p, d) => toW(C, si.horiz ? p : si.fixed + si.out * d, si.horiz ? si.fixed + si.out * d : p);
  const res = [];
  for (const d of s.bb.def.doors || []) {
    if (d.side !== side || (d.storey || 0) !== storey || d.sill) continue;
    const u0 = d.at, u1 = d.at + d.w, door = { u0, u1 };
    if (storey) { res.push(door); continue; }
    const p = si.a + (u0 + u1) / 2, o = occ.at(...out(p, 1.2));
    const rise = w.groundAt(...out(p, reach + 0.3)) - fy;
    if ((o >= 0 && o < 90000 && o !== s.id) || rise < 1.0) { res.push(door); continue; }
    if (rise > 3.5) continue;
    // steps along the wall, rising away from a landing in front of the doorway (toward the longer side)
    for (const dir of si.b - si.a - u1 > u0 ? [1, -1] : [-1, 1]) {
      const st = dir > 0 ? u1 + 0.3 : u0 - 0.3, endRise = w.groundAt(...out(si.a + st + dir * rise / 0.36 * 0.55, reach + 0.3)) - fy;
      const top = Math.max(rise, endRise), n = Math.ceil(top / 0.36), e = st + dir * n * 0.55;
      if (Math.min(st, e) < 0.3 || Math.max(st, e) > si.b - si.a - 0.3) continue;
      res.push({ u0, u1, steps: { from: st, dir, n, top } }); break;
    }
  }
  return res;
}
// A building's ground flatten leaves a 0.5 m apron at floor level and a steep blend up to the natural
// ground: on a slope (the Hourglass Terraces) or against a dune piled on a sunk block (Grains of Wrath, the
// condos, the mall's dune) that is a slot along the uphill wall, too narrow to walk along and too steep to
// climb. Those slots are banked up to the natural ground (in its own paving: a sand bank in the dunes, a
// cobbled terrace step on the hill); doorways a raider can use keep their way in.
function backfill(ctx) {
  const { w, occ } = ctx;
  const runs = [], flights = [];
  for (const s of ctx.segs) {
    if (!s.bb) continue;
    // the blend is walkable (<= a step per grid cell) up to ~0.6 x its width; deeper cuts get banked
    const C = s.C, fy = C.floorY, blend = C.o.sunk ? 0.8 : 1.6, reach = 0.5 + blend + 0.1, deep = 0.6 * blend;
    for (const side of ['n', 's', 'w', 'e']) {
      const si = sideInfo(s, side), open = [];
      for (const d of usableDoors(ctx, s, side)) {
        if (!d.steps) { open.push([si.a + d.u0 - 0.7, si.a + d.u1 + 0.7]); continue; }
        const { from, dir, n, top } = d.steps, e = from + dir * n * 0.55;
        open.push([si.a + Math.min(d.u0 - 0.3, e), si.a + Math.max(d.u1 + 0.3, e)]);
        for (let k = 0; k < n; k++) flights.push({ s, si, reach, fy, a: si.a + from + dir * k * 0.55, b: si.a + from + dir * (k + 1) * 0.55, y: fy + top * (k + 1) / n });
      }
      const at = (p, d) => toW(C, si.horiz ? p : si.fixed + si.out * d, si.horiz ? si.fixed + si.out * d : p);
      let cur = null;
      for (let p = si.a - reach + 0.25; p < si.b + reach; p += 0.5) {
        let top = null, tex = null;
        if (!open.some(([u0, u1]) => p > u0 && p < u1)) {
          const [gx, gz] = at(p, reach + 0.3), g = w.groundAt(gx, gz);
          let free = g - fy > deep;
          for (const d of [0.3, reach / 2, reach - 0.1]) { if (!free) break; const [x, z] = at(p, d), o = occ.at(x, z); if ((o !== -1 && o !== s.id) || ctx.onDeck(x, z)) free = false; }
          if (free) { top = g; tex = TERRAIN[w.terrainAt(gx, gz)] || 'sand'; }
        }
        if (top != null && cur && tex === cur.tex && Math.abs(top - cur.t0) < 0.3 && p - cur.p1 < 0.6) { cur.p1 = p; cur.top = Math.max(cur.top, top); }
        else { cur = top == null ? null : { s, side, si, p0: p, p1: p, t0: top, top, fy, reach, tex }; if (cur) runs.push(cur); }
      }
    }
  }
  // steps down to a doorway in a cut (the Hourglass Terraces' back doors)
  for (const f of flights) {
    const { s, si, reach } = f, o = si.out, c0 = si.fixed - (o < 0 ? reach : 0), c1 = si.fixed + (o > 0 ? reach : 0);
    const a = Math.min(f.a, f.b), b = Math.max(f.a, f.b), rect = si.horiz ? [a, c0, b, c1] : [c0, a, c1, b];
    w.block(rect[0], rect[1], rect[2], rect[3], f.y - f.fy + 0.4, 'concrete', { y0: f.fy - 0.4, R: s.C.R || undefined, step: true });
  }
  const boxes = [];
  for (const r of runs) {
    const { s, si, reach } = r, a = r.p0 - 0.25, b = r.p1 + 0.25, o = si.out;
    const c0 = si.fixed - (o < 0 ? reach : 0), c1 = si.fixed + (o > 0 ? reach : 0);
    const rect = si.horiz ? [a, c0, b, c1] : [c0, a, c1, b];
    w.block(rect[0], rect[1], rect[2], rect[3], r.top - r.fy + 0.4, r.tex, { y0: r.fy - 0.4, R: s.C.R || undefined });
    boxes.push({ C: s.C, rect, top: r.top });
  }
  // anything left standing in the slot sits on the bank now (an awning or a washing line over a buried
  // stretch of wall goes)
  const grid8 = new Map(), key = (x, z) => Math.floor(x / 8) * 1000 + Math.floor(z / 8);
  for (const bx of boxes) {
    const P = [[bx.rect[0], bx.rect[1]], [bx.rect[2], bx.rect[3]], [bx.rect[0], bx.rect[3]], [bx.rect[2], bx.rect[1]]].map(([x, z]) => toW(bx.C, x, z)), [x0, z0, x1, z1] = bounds(P);
    for (let gx = Math.floor((x0 - 1) / 8); gx <= Math.floor((x1 + 1) / 8); gx++) for (let gz = Math.floor((z0 - 1) / 8); gz <= Math.floor((z1 + 1) / 8); gz++) { const k = gx * 1000 + gz; if (!grid8.has(k)) grid8.set(k, []); grid8.get(k).push(bx); }
  }
  const near = (x, z) => grid8.get(key(x, z)) || [];
  const inBox = (x, z, m) => near(x, z).some(({ C, rect }) => { const [lx, lz] = C.R ? unrotPt(C.R, x, z) : [x, z]; return lx > rect[0] - m && lx < rect[2] + m && lz > rect[1] - m && lz < rect[3] + m; });
  for (const c of w.containers) if (c.yAbs == null && !c.surface && !c.inHall && c.bid == null && inBox(c.x, c.z, 0.2)) c.surface = true;
  // a roof ladder whose foot is now in the bank starts on top of it
  for (const l of w.ladders) {
    if (l.bid == null || l.inside) continue;
    let top = -1e9; for (const bx of near(l.x0, l.z0)) { const [lx, lz] = bx.C.R ? unrotPt(bx.C.R, l.x0, l.z0) : [l.x0, l.z0]; if (lx > bx.rect[0] - 0.3 && lx < bx.rect[2] + 0.3 && lz > bx.rect[1] - 0.3 && lz < bx.rect[3] + 0.3) top = Math.max(top, bx.top); }
    const s = ctx.segs.find(q => q.bid === l.bid);
    if (s && top - s.C.floorY > (l.rel0 || 0)) l.rel0 = top - s.C.floorY;
  }
  w.props = w.props.filter(q => {
    const o = q.opts || {};
    if (o.yAbs != null || o.surface || o.bid != null || o.inHall || !inBox(q.x, q.z, 0)) return true;
    if (/^sc_(awning|laundry)/.test(q.kind)) return false;
    q.opts = { ...o, surface: true }; return true;
  });
  ctx.backfill = { runs: runs.length, steps: flights.length };
}
// Stairwells: a flight 1.3 m from an outer wall leaves a strip between them that the collision grid turns
// into a slot narrower than a raider (worst in the turned wings), and the slab above is cut open over it.
// Step off the flight's side or the floor above into it and you are wedged. A dead-end strip is walled in
// up to the next floor; one a doorway opens into stays the way in, with the slab closed over it.
function stairStrips(ctx) {
  const { w } = ctx;
  for (const s of ctx.segs) {
    if (!s.flights || !s.bb) continue;
    const C = s.C, W = s.x1 - s.x0, D = s.z1 - s.z0, R = C.R || undefined, H = s.bb.h;
    const wall = C.o.wall || STYLE[C.kind].wall, tint = s.bb.def.tint ?? undefined;
    const lev = (v) => (v === 'top' ? H + 0.25 : v * 3.2);
    for (const f of s.flights) {
      const alongZ = f.dir === 'n' || f.dir === 's', [rx0, rz0, rx1, rz1] = f.rect;
      let a0 = alongZ ? rz0 : rx0, a1 = alongZ ? rz1 : rx1;
      if (f.dir === 'n' || f.dir === 'w') a1 += 0.5; else a0 -= 0.5;            // + the hole's margin at the foot end
      const y0 = lev(f.from), y1 = lev(f.to);
      for (const [side, c0, c1] of alongZ ? [['w', 0, rx0], ['e', rx1, W]] : [['n', 0, rz0], ['s', rz1, D]]) {
        if (c1 - c0 > 1.6) continue;
        // a doorway in that wall uses the strip as its way in: then only the slab is closed over it
        const passage = usableDoors(ctx, s, side, f.from).some(d => d.u1 > a0 - 0.6 && d.u0 < a1 + 0.6);
        const r = alongZ ? [c0, a0, c1, a1] : [a0, c0, a1, c1];
        w.block(s.x0 + r[0], s.z0 + r[1], s.x0 + r[2], s.z0 + r[3], passage ? 0.25 : y1 - y0, wall, { onBuilding: s.bid, rel0: passage ? y1 - 0.25 : y0, R, tint, cutaway: true });
      }
    }
  }
}
// The Red Flag's platform ends in a 5 m drop to the sea bed (the riprap used to stand on that slope, its rock
// pockets were dead ends; it now lies out past the foot): a railing round it, open toward the breakwater.
function lighthouseRail(ctx) {
  const { w } = ctx, [cx, cz] = LIGHTHOUSE, r = 10.3, gap = 0.5, pts = [];
  for (let a = -Math.PI + gap; a <= Math.PI - gap + 1e-6; a += (2 * Math.PI - 2 * gap) / 36) pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r]);
  w.fence(pts, 1.35, 'rust', 0.1, { tint: 0xf4f0e8 });
}

// =====================================================================================================
// GAMEPLAY MARKERS
// =====================================================================================================
// [id, display name, x, z, radius, tier]  (ids are internal and stable: quests target them)
const POIS = [
  ['town_hall', 'Town Hall (Closed Since Lunch)', 405, 178, 32, 3],
  ['piazza_romana', 'Piazza Sandwich', 414, 242, 46, 2],
  ['escrow_chapel', 'Our Lady of Perpetual Escrow', 344, 296, 22, 1],
  ['sandphitheatre', 'The Sandphitheatre', 268, 262, 40, 2],
  ['santa_marta_houses', 'Hourglass Terraces', 404, 356, 34, 2],
  ['hospital', "St. Copay's Hospital", 330, 522, 40, 3],
  ['main_street', 'Clearance Sale Strip', 414, 474, 38, 1],
  ['piazza_arbusta', 'The Roundabout of Regret', 505, 455, 40, 2],
  ['galleria', 'The Dune-Hill Mall', 556, 606, 46, 2],
  ['parking_garage', 'Park & Pray Garage', 642, 654, 30, 2],
  ['space_travel', 'No Refunds Travel Agency', 466, 656, 32, 3],
  ['library', 'The Overdue Library', 318, 625, 36, 2],
  ['water_park', 'Dry Run Water Park', 246, 770, 50, 1],
  ['gas_station', 'Pump & Dump Gas Station', 494, 842, 32, 1],
  ['grandiosa_apartments', 'Grains of Wrath Apartments', 184, 452, 44, 2],
  ['solar_farm', 'Sunk Cost Solar Farm', 150, 245, 62, 1],
  ['su_duranti_warehouses', 'Return-to-Sender Warehouses', 606, 160, 42, 2],
  ['research', 'Pivot Labs', 628, 230, 30, 3],
  ['yacht_rock_bottom', 'Yacht Rock Bottom', 806, 330, 72, 2],
  ['abandoned_highway_camp', 'Gridlock Campground', 800, 160, 36, 2],
  ['marino_park', 'Low Tide Park', 662, 432, 34, 1],
  ['red_tower', 'The Red Flag', 840, 456, 26, 2],
  ['sandy_properties', 'Ocean View* Condos', 726, 712, 50, 2],
];
// open ground for a condition boss and its escorts (Sandy City's roster has none today; ready if one is added)
const BOSS_ARENAS = { sandphitheatre: true, yacht_rock_bottom: true, solar_farm: true };
// metro stations: [id, display name, wanted hall centre, lid paving]; their POIs follow the placed halls
const STATIONS = [
  ['northern_station', 'Uphill Both Ways Station', 338, 246, 'tiles'],
  ['marino_station', 'Dry Dock Station', 568, 337, 'concrete'],
  ['southern_station', 'Signal Failure Station', 564, 804, 'concrete'],
  ['western_station', 'Sand Trap Station', 207, 579, 'tiles'],
];
const HATCHES = [
  ['sunk_cost_doggy_door', 'Sunk Cost Doggy Door', 214, 300], ['splash_zone_doggy_door', 'Splash Zone Doggy Door', 322, 792],
  ['low_tide_doggy_door', 'Low Tide Doggy Door', 742, 236], ['valet_doggy_door', 'Valet Doggy Door', 690, 600],
];

function markers(ctx) {
  const { w, rng } = ctx;
  for (const [id, name, x, z, r, tier] of POIS) w.poi(id, name, x, z, r, { tier, aliases: [], ...(BOSS_ARENAS[id] ? { bossPoi: BOSS_ARENAS[id] } : {}) });
  for (const [id, name] of STATIONS) { const m = ctx.metro[id]; if (m) w.poi(id, name, m[0], m[1], id === 'marino_station' || id === 'southern_station' ? 24 : 16, { tier: 1, aliases: [] }); }
  // key rooms (one entry per locked building; multi-wing key areas list each rotated wing in `polys`)
  const byId = new Map();
  for (const k of ctx.keySegs) {
    const key = k.id + '|' + k.C.bi;
    if (!byId.has(key)) byId.set(key, { id: k.id, name: k.name, polys: [], bids: [], floorYs: [] });
    byId.get(key).polys.push(k.s.poly.map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]));
    byId.get(key).bids.push(k.s.bid);
    byId.get(key).floorYs.push(+k.y0.toFixed(2));
  }
  for (const e of byId.values()) {
    const [x0, z0, x1, z1] = bounds(e.polys.flat());
    w.keyRoom(e.id, x0, z0, x1, z1, null, { name: e.name, polys: e.polys, bids: e.bids, floorYs: e.floorYs });
  }
  for (const [id, name, x, z] of HATCHES) hatch(ctx, id, name, x, z);
  for (const [x, z] of ctx.spawnPts) w.spawnPoint(x, z);

  // ---------------------------------------------------------------- ARK
  const roofOf = (tag, fx = 0.5, fz = 0.5, si = null) => { const C = ctx.cxs.find(c => c.o.tag === tag); if (!C) return null; const s = C.segs[si ?? Math.floor(C.segs.length / 2)]; const [x, z] = toW(C, lerp(s.x0, s.x1, fx), lerp(s.z0, s.z1, fz)); return [x, z, { surface: true, roof: true }]; };
  const lane = (x, z) => freeSpot(ctx, x, z, 2, 20);
  // rooftop snipers and turrets
  for (const [t, fx, fz] of [['lighthouse', 0.75, 0.15], ['townhall', 0.5, 0.5], ['grainsA', 0.6, 0.4], ['condoB', 0.5, 0.5], ['slidetower', 0.5, 0.5], ['labs', 0.7, 0.6], ['hospital', 0.5, 0.5]]) { const r = roofOf(t, fx, fz); if (r) w.arkSpawn('sentinel', r[0], r[1], r[2]); }
  for (const [t, fx, fz] of [['mall', 0.6, 0.4], ['library', 0.4, 0.5], ['garage', 0.3, 0.7], ['warehouse', 0.5, 0.5], ['travel', 0.5, 0.5], ['grainsB', 0.5, 0.5], ['condoA', 0.5, 0.5], ['terraceA', 0.5, 0.5]]) { const r = roofOf(t, fx, fz); if (r) w.arkSpawn('turret', r[0], r[1], r[2]); }
  { const s = polyDist(600, 96, BYPASS)[1], [x, z] = pointAt(BYPASS, s); w.arkSpawn('sentinel', x, z, { surface: true }); }
  { const s = polyDist(740, 132, BYPASS)[1], [x, z] = pointAt(BYPASS, s); w.arkSpawn('turret', x, z, { surface: true }); }
  // drones patrolling the squares, the quay and the sea bed
  const loops = [
    ['wasp', 400, 238, [[360, 214], [470, 210], [474, 268], [360, 272]]], ['wasp', 505, 455, [[470, 420], [545, 425], [540, 490], [470, 490]]],
    ['wasp', 330, 520, [[280, 480], [380, 470], [380, 550], [290, 560]]], ['wasp', 556, 606, [[510, 570], [600, 568], [604, 640], [512, 640]]],
    ['wasp', 466, 656, [[430, 620], [500, 630], [496, 700], [430, 690]]], ['wasp', 318, 625, [[280, 590], [360, 590], [350, 660], [280, 660]]],
    ['wasp', 246, 770, [[200, 730], [300, 734], [300, 812], [200, 812]]], ['wasp', 606, 160, [[550, 130], [690, 140], [680, 205], [556, 205]]],
    ['wasp', 628, 230, [[590, 205], [670, 205], [664, 262], [596, 262]]], ['wasp', 662, 432, [[620, 410], [710, 414], [706, 456], [622, 452]]],
    ['wasp', 806, 330, [[740, 260], [870, 270], [870, 400], [750, 410]]], ['wasp', 726, 712, [[680, 660], [770, 690], [780, 780], [690, 750]]],
    ['wasp', 184, 452, [[150, 400], [230, 410], [220, 500], [150, 500]]], ['wasp', 268, 262, [[236, 220], [300, 230], [300, 300], [236, 300]]],
    ['wasp', 404, 356, [[360, 334], [450, 334], [450, 380], [360, 380]]], ['wasp', 494, 842, [[460, 810], [530, 812], [530, 876], [460, 870]]],
  ];
  for (const [k, x, z, p] of loops) { const [px, pz] = lane(x, z); w.arkSpawn(k, px, pz, { count: 2, radius: 8, patrol: p }); }
  const hornets = [[405, 178, [[370, 160], [440, 160], [440, 200], [370, 200]]], [556, 606, [[520, 580], [600, 640]]], [466, 656, [[440, 630], [490, 690]]],
    [330, 520, [[300, 490], [370, 550]]], [834, 456, [[730, 468], [840, 456]]], [505, 455, [[420, 470], [505, 455], [610, 560], [505, 455]]]];
  for (const [x, z, p] of hornets) { const [px, pz] = lane(x, z); w.arkSpawn('hornet', px, pz, { count: 1, radius: 6, patrol: p }); }
  w.arkSpawn('rocketeer', 520, 90, { count: 1, radius: 10, patrol: [[300, 104], [520, 86], [700, 116]] });
  w.arkSpawn('rocketeer', 820, 300, { count: 1, radius: 12, patrol: [[760, 160], [860, 320], [800, 520]] });
  w.arkSpawn('rocketeer', 110, 600, { count: 1, radius: 14, patrol: [[60, 420], [120, 640], [80, 820]], notCondition: 'hurricane' });
  w.arkSpawn('rocketeer', 520, 880, { count: 1, radius: 14, patrol: [[360, 880], [640, 870], [520, 840]], notCondition: 'hurricane' });
  // ground ARK in the lanes and inside buildings
  const roomPick = (pred) => { const rs = ctx.cxs.filter(pred).flatMap(C => C.rooms).filter(r => !r.ruin && !r.key && (r.x1 - r.x0) * (r.z1 - r.z0) > 20); return rs[Math.floor(rng() * rs.length)]; };
  for (let i = 0; i < 16; i++) { const r = roomPick(C => C.o.poi); if (r) w.arkSpawn('tick', ...toW(r.C, (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2), { count: 2 + (i % 2), radius: 3, ...(r.storey ? { yAbs: r.C.floorY + r.storey * 3.2 } : {}) }); }
  const lanes = [[440, 520], [380, 580], [560, 515], [598, 360], [640, 466], [492, 618], [420, 762], [650, 772], [300, 500], [230, 520], [470, 194], [500, 282],
    [560, 790], [700, 662], [340, 398], [600, 124]];
  lanes.forEach(([x, z], i) => { const [px, pz] = freeSpot(ctx, x, z, 1.5, 15); w.arkSpawn(i % 3 === 2 ? 'fireball' : 'pop', px, pz, { count: i % 3 === 2 ? 1 : 3, radius: 6 }); });
  for (const [x, z] of [[404, 347], [314, 270], [420, 482], [612, 300]]) { const [px, pz] = freeSpot(ctx, x, z, 1.5, 15); w.arkSpawn('shredder', px, pz, { count: 1, radius: 8, patrol: [[px - 18, pz], [px + 18, pz + 4]] }); }
  for (const [x, z] of [[300, 150], [600, 280], [760, 600], [380, 720], [160, 360], [620, 840], [460, 300]]) w.arkSpawn('snitch', x, z, { count: 1, radius: 10, patrol: [[x - 25, z - 10], [x + 25, z + 10]] });
  for (const [x, z] of [[840, 600], [800, 860], [60, 360], [300, 40], [120, 860]]) w.arkSpawn('surveyor', x, z, { count: 1, radius: 20, patrol: [[x - 30, z], [x, z - 30], [x + 30, z], [x, z + 30]] });
  // heavies roam the dunes and the sea bed
  w.arkSpawn('leaper', 80, 520, { count: 1, radius: 30, patrol: [[40, 440], [110, 600], [70, 700]] });
  w.arkSpawn('leaper', 840, 540, { count: 1, radius: 30, patrol: [[780, 500], [880, 600], [860, 700]] });
  w.arkSpawn('leaper', 360, 880, { count: 1, radius: 30, patrol: [[260, 870], [460, 880], [380, 840]] });
  w.arkSpawn('leaper', 120, 120, { count: 1, radius: 30, patrol: [[40, 100], [200, 70], [160, 170]] });
  w.arkSpawn('bastion', 820, 420, { count: 1, radius: 24, patrol: [[760, 430], [870, 420]] });
  w.arkSpawn('bastion', 470, 880, { count: 1, radius: 24, patrol: [[440, 870], [520, 885]] });
  w.arkSpawn('bastion', 380, 50, { count: 1, radius: 24, patrol: [[300, 40], [460, 45]] });
  w.arkSpawn('bombardier', 860, 640, { count: 1, radius: 20 }); w.arkSpawn('spotter', 790, 620, { count: 1, radius: 20, patrol: [[760, 580], [820, 660]] });
  w.arkSpawn('bombardier', 60, 760, { count: 1, radius: 20 }); w.arkSpawn('spotter', 140, 700, { count: 1, radius: 20, patrol: [[110, 660], [170, 740]] });

  // ---------------------------------------------------------------- condition-gated groups
  // Magpie Mafia: drones of every kind over the rooftops
  const birdLoops = [[[360, 210], [480, 206], [480, 280], [360, 280]], [[420, 440], [600, 450], [600, 520], [430, 520]], [[520, 570], [660, 600], [650, 680], [520, 660]],
    [[280, 480], [380, 470], [380, 560], [290, 580]], [[680, 650], [780, 700], [770, 790], [690, 760]], [[560, 140], [690, 150], [680, 260], [570, 250]]];
  birdLoops.forEach((p, i) => { const [x, z] = lane(...p[0]); w.arkSpawn(['wasp', 'hornet', 'snitch'][i % 3], x, z, { count: i % 3 === 0 ? 3 : 1, radius: 10, patrol: p, condition: 'bird_city' }); });
  for (const [x, z] of [[470, 620], [420, 300]]) w.arkSpawn('rocketeer', x, z, { count: 1, radius: 12, patrol: [[x - 40, z], [x + 40, z + 10]], condition: 'bird_city' });
  // Night Shift: extra sweeps of the lit squares + a hornet down the Clearance Sale Strip
  for (const [x, z, p] of [[400, 238, [[370, 220], [440, 230], [420, 268]]], [505, 455, [[480, 430], [540, 450], [500, 490]]], [556, 590, [[520, 570], [600, 580], [560, 600]]], [662, 432, [[630, 416], [700, 430], [660, 452]]]])
    w.arkSpawn('wasp', ...lane(x, z), { count: 2, radius: 8, patrol: p, condition: 'night_raid' });
  w.arkSpawn('hornet', ...lane(300, 500), { count: 1, radius: 8, patrol: [[170, 538], [300, 500], [482, 460]], condition: 'night_raid' });
  // Bad Hair Day: heavies push into the town edges; flyers stay grounded
  w.arkSpawn('leaper', ...lane(640, 520), { count: 1, radius: 20, patrol: [[600, 480], [700, 540], [640, 580]], condition: 'hurricane' });
  w.arkSpawn('bastion', ...lane(300, 700), { count: 1, radius: 16, patrol: [[260, 690], [350, 730]], condition: 'hurricane' });
  w.arkSpawn('bastion', ...lane(560, 200), { count: 1, radius: 16, patrol: [[540, 200], [600, 210]], condition: 'hurricane' });
  // Audit Season: Data Miners scanning the open squares, each with a Vape Lord escort
  for (const [x, z] of [[505, 455], [150, 245], [400, 238], [662, 432], [806, 330]]) {
    const [sx, sz] = lane(x, z);
    w.arkSpawn('surveyor', sx, sz, { count: 1, radius: 10, patrol: [[sx - 15, sz], [sx, sz - 15], [sx + 15, sz], [sx, sz + 15]], condition: 'close_scrutiny' });
    w.arkSpawn('vaporiser', sx + 4, sz + 4, { count: 2, radius: 8, condition: 'close_scrutiny' });
  }
  // Survey Season: probes land in the open dunes and on the sea bed; drones fly cover
  for (const [x, z] of [[100, 420], [820, 560], [400, 870], [300, 50]]) w.arkSpawn('wasp', x, z, { count: 2, radius: 16, patrol: [[x - 25, z - 10], [x + 25, z + 10]], condition: 'prospecting_probes' });
  // Mass Layoffs: a line of laid-off machines dumped on the sea bed
  for (let i = 0; i < 9; i++) {
    const [x, z] = freeSpot(ctx, 760 + (i % 3) * 36 + rng() * 10, 500 + Math.floor(i / 3) * 60 + rng() * 10, 3, 12);
    w.prop('husk', x, z, rng() * 6, { solid: true, scale: 1.1 + rng() * 0.4, condition: 'husk_graveyard' });
    w.container('arc_husk', x + 2.2, z + 0.4, 0, { tier: 2, condition: 'husk_graveyard' });
  }
  // Allergy Season: the parks and planters bloom
  for (const [x, z] of [[662, 432], [392, 238], [505, 455], [246, 640], [700, 780]]) w.container('plant', ...freeSpot(ctx, x + 6, z + 6, 0.8, 10), 0, { tier: 1, condition: 'lush_blooms' });

  // ---------------------------------------------------------------- loot zones
  w.zone('Dune Sea', [[0, 0], [MW, 0], [MW, MH], [0, MH]], { tier: 1 });
  w.zone('Sandy City', TOWN, { tier: 2 });
  w.zone('Dry Sea Bed', SEA, { tier: 1 });
  w.zone("St. Copay's Hospital", [[300, 480], [380, 470], [384, 540], [290, 572]], { tier: 3 });
  w.zone('Town Hall', [[368, 160], [442, 154], [444, 196], [368, 200]], { tier: 3 });
  w.zone('No Refunds Travel Agency', [[450, 628], [482, 628], [482, 684], [450, 684]], { tier: 3 });
  w.zone('Pivot Labs', [[598, 210], [658, 210], [658, 244], [598, 244]], { tier: 3 });
  w.zone('The Overdue Library', [[290, 596], [346, 596], [346, 656], [290, 656]], { tier: 3 });
  w.zone('The Dune-Hill Mall', [[512, 590], [600, 590], [600, 634], [512, 634]], { tier: 2 });
  w.zone('Gridlock Campground', [[760, 140], [840, 150], [836, 182], [756, 170]], { tier: 2 });
}

// =====================================================================================================
export default {
  id: 'sandy_city', name: 'Sandy City', size: [MW, MH], seed: 9113,
  base: 'sand', cliff: 'sandDark',
  ambient: { music: 'sandy_city', birds: false, wind: true },
  conditions: ['night_raid', 'hurricane', 'lush_blooms', 'uncovered_caches', 'husk_graveyard', 'prospecting_probes', 'close_scrutiny', 'cold_snap', 'bird_city'],
  build(w, rng) {
    const ctx = { w, rng, occ: new Occ(), doorsOut: [], keySegs: [], metro: {}, nCont: 0, lootSkip: 0.97, keyLoot: {} };
    ctx.occFreeSouth = (C, s, x) => ctx.occ.at(...toW(C, x, s.z1 + 1.2)) === -1;
    ctx.decks = [];
    ctx.onDeck = (x, z) => ctx.decks.some(D => { const i = Math.round(z) * (MW + 1) + Math.round(x); return i >= 0 && i < D.arr.length && (!Number.isNaN(D.arr[i]) || D.foot[i] === 1); });
    ctx.nearDoor = (x, z, r) => ctx.doorsOut.some(([dx, dz]) => Math.abs(dx - x) < r && Math.abs(dz - z) < r);
    ctx.keepClear = [];
    ctx.blocked = (x, z, r) => ctx.keepClear.some(([kx, kz, kr]) => Math.abs(kx - x) < kr + r && Math.abs(kz - z) < kr + r) || !ctx.occ.free(x - r - 0.5, z - r - 0.5, x + r + 0.5, z + r + 0.5) || ctx.onDeck(x, z) || ctx.onDeck(x + r + 1, z) || ctx.onDeck(x - r - 1, z) || ctx.onDeck(x, z + r + 1) || ctx.onDeck(x, z - r - 1) || ctx.nearDoor(x, z, r + 1.6);

    const T = [performance.now()], mark = n => { T.push(performance.now()); ctx.times = ctx.times || []; ctx.times.push(n + ' ' + (T[T.length - 1] - T[T.length - 2]).toFixed(0)); };
    shapeTerrain(ctx); coastWorks(ctx); levelRoads(ctx); mark('terrain');
    planFrontage(ctx); mark('frontage');
    addObstacles(ctx);
    layoutComplexes(ctx);
    sunkMounds(ctx);
    sandDrifts(ctx); mark('layout+drifts');
    ctx.HW = makeDeck(ctx, { pts: BYPASS, prof: deckProfile(ctx, BYPASS, 5.4), width: BP_W, gaps: bypassGaps(), ramps: bypassRamps(), bridge: true });
    ctx.decks.push(ctx.HW); mark('decks');
    complexFloors(ctx);
    paintGround(ctx);
    paintDeck(ctx, ctx.HW, 'asphalt'); mark('paint');
    buildComplexes(ctx); buriedHouses(ctx); mark('buildings');
    // underground metro stations (the search keeps them clear of buildings and the Bypass)
    ctx.halls = [];
    for (const [id, name, x, z, lid] of STATIONS) ctx.metro[id] = metroStation(ctx, id, name, x, z, { lid });
    roofRoutes(ctx);
    // level-aware placement: anything put over a station lid sits on the lid, anything on the Bypass on its deck
    const overHall = (x, z) => ctx.halls.find(h => inPoly(x, z, h.poly));
    const lvl = (o, x, z, lampY) => {
      if (!o || o.yAbs != null || o.surface || o.inHall || o.under) return o;
      const hl = overHall(x, z);
      if (hl) return lampY != null ? { ...o, yAbs: hl.surf + 0.02 + lampY } : { ...o, surface: true };
      const dy = ctx.HW.deckY(x, z);
      if (dy != null) return lampY != null ? { ...o, yAbs: dy + lampY } : { ...o, yAbs: dy + (o.y || 0) };
      return o;
    };
    const P0 = w.prop, C0 = w.container, L0 = w.lamp;
    w.prop = function (kind, x, z, rot = 0, opts = {}) { return P0.call(this, kind, x, z, rot, lvl(opts, x, z)); };
    w.container = function (kind, x, z, rot = 0, opts = {}) { return C0.call(this, kind, x, z, rot, lvl(opts, x, z)); };
    w.lamp = function (x, z, opts = {}) { return L0.call(this, x, z, lvl(opts, x, z, Math.min(opts.y ?? 3.6, 2.8))); };
    furnish(ctx); mark('furnish');
    dressDeck(ctx, ctx.HW);
    ctx.spawnPts = SPAWNS.map(([x, z]) => freeSpot(ctx, x, z, 1.5, 12));
    for (const [x, z] of ctx.spawnPts) ctx.keepClear.push([x, z, 2.5]);
    ctx.wallLadders = WALL_LADDERS.map(([x, z]) => [x, z, polyDist(x, z, COAST)[1]]);
    marina(ctx);
    setPieces(ctx); mark('setpieces');
    vegetation(ctx); mark('veg');
    streetClutter(ctx); mark('clutter');
    birdCity(ctx);
    markers(ctx); mark('markers');
    backfill(ctx); stairStrips(ctx); lighthouseRail(ctx); mark('no dead ends');
    if (typeof window === 'undefined' || globalThis.__mapDebug) this._ctx = ctx;   // debug hook for map tools only
  },
};
