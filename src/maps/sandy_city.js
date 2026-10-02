// Sandy City — DarkRaiders' take on ARC Raiders' "Buried City" (the old town of Marano, half
// swallowed by desert dunes). Layout traced from docs/ref/buried_city_*.jpg: reference pixel p (2400 px
// annotated map) maps to world metres as  x = (px - 180) * 0.42453,  z = (pz - 80) * 0.42453  (north up).
// See docs/research/map_sandy_city.md for POI ids, aliases, extracts, key rooms and deviations.
//
// Top-down adaptations: every traced block is a rotated World building (or a short row of collinear
// buildings sharing one frame, for long terraces and key-room wings); the elevated highway
// (Corso da Vinci) is a walkable deck with collapsed spans where the old streets ran underneath and
// sand drifts that ramp up onto it; upper storeys are visual only.
import './props_sandy_city.js';
import { propInfo } from '../engine/models.js';
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
// REFERENCE-TRACED TABLES (world metres)
// =====================================================================================================

// Town floor: where the old town lies low and (mostly) swept clear; outside it the dunes rise.
const TOWN = [[248, 196], [292, 172], [330, 150], [372, 112], [418, 92], [470, 112], [540, 118], [590, 150], [640, 205], [700, 268],
  [760, 330], [790, 420], [800, 500], [900, 528], [900, 606], [810, 622], [790, 690], [770, 790], [700, 826], [610, 812], [540, 836],
  [470, 846], [400, 836], [330, 806], [282, 760], [238, 716], [196, 690], [176, 640], [184, 560], [206, 470], [214, 380], [208, 300], [222, 236]];
// the swept-clear heart of the old town (paved lanes); TOWN minus CORE is the half-buried fringe
const CORE = [[296, 300], [336, 262], [396, 214], [452, 196], [512, 214], [552, 250], [600, 300], [612, 370], [604, 430], [640, 500],
  [700, 516], [800, 532], [900, 534], [900, 604], [790, 612], [730, 650], [706, 700], [700, 772], [640, 796], [560, 806], [480, 826],
  [410, 822], [350, 800], [300, 752], [262, 704], [232, 650], [222, 572], [246, 484], [262, 410], [276, 346]];
const FLATS = [
  { pts: [[48, 326], [178, 326], [186, 444], [56, 446]], v: 1 },           // Warehouse yard
  { pts: [[186, 196], [262, 186], [266, 362], [192, 360]], v: 1 },         // Marano Station
  { pts: [[58, 596], [162, 592], [170, 682], [66, 690]], v: 0.95 },        // Maintenance Depot
  { pts: [[380, 40], [470, 22], [548, 26], [560, 110], [470, 120], [390, 118]], v: 0.72 }, // gas station / northern ruins
  { pts: [[600, 690], [760, 690], [780, 800], [640, 820]], v: 0.9 },       // church ruins
];

// Elevated highway "Corso da Vinci": centreline from the east edge, through Piazza Arbusto, over the
// old town and curving away south-west past the Abandoned Highway Camp to the corner of the map.
const HIGHWAY = [[899, 572], [850, 566], [800, 558], [748, 554], [700, 549], [660, 545], [622, 541], [570, 538], [530, 540], [505, 543],
  [478, 549], [455, 556], [428, 564], [402, 573], [378, 581], [352, 591], [330, 603], [312, 617], [292, 636], [272, 658], [255, 681],
  [240, 705], [222, 735], [204, 768], [186, 804], [168, 842], [150, 880], [141, 899]];
const HW_W = 11;          // deck width
// collapsed spans (arc-length windows along HIGHWAY) where the old streets pass underneath
const HW_GAPS = [[262, 276], [372, 385], [452, 465], [560, 572]];
// sand drifts that ramp up onto the deck: [arc length, side (+1 = right/south of travel, -1 = left/north)]
const HW_RAMPS = [[150, 1], [214, -1], [330, 1], [418, -1], [505, 1], [642, -1], [700, 1], [770, 1], [840, -1]];

// Marano rail line: north out of the station, south through the yard and onto the long viaduct SW.
const RAIL = [[304, 22], [288, 52], [262, 88], [250, 140], [247, 200], [234, 258], [217, 340], [210, 382], [200, 430], [190, 482],
  [180, 540], [166, 600], [152, 660], [138, 720], [126, 790], [114, 860], [106, 899]];
const RAIL_VIADUCT_FROM = 540;   // arc length where the rail climbs onto its viaduct

// Building complexes: [cx, cz, length, width, angleDeg(long axis, +x toward +z), storeys, kind, opts]
// kind: h house  a apartments  s shops  c civic  m medical  t tech  i industrial  p parking  o church  r ruin
const B = [
  // ---- north: gas station, northern ruins, Su Durante, supermarket, market ruins
  [[437, 92], [447, 86], [453, 96], 1, 's', { name: 'Gas Station Kiosk', tint: 'cream', poi: 'gas_station' }],
  [[512, 38], [531, 118], [503, 127], 3, 'a', { sunk: 1.5, tint: 'ochre', parts: 2, ruin: 0.5 }],
  [391, 111, 20, 14, -35, 2, 'h', { sunk: 1 }],
  [404, 135, 30, 18, -30, 2, 'h'],
  [298, 129, 37, 33, -33, 2, 'i', { name: 'Su Duranti Warehouse', poi: 'su_durante_warehouses' }],
  [331, 104, 22, 15, -33, 2, 'i', { poi: 'su_durante_warehouses', sunk: 1 }],
  [318, 161, 30, 15, -33, 1, 'i', { poi: 'su_durante_warehouses' }],
  [489, 184, 35, 29, 57, 1, 's', { name: 'Collapsed Supermarket', ruin: 0.5, poi: 'collapsed_supermarket' }],
  [534, 153, 38, 18, 55, 1, 'r', { poi: 'market_ruins' }],
  [520, 234, 32, 20, 55, 1, 'r', { poi: 'market_ruins' }],
  [556, 128, 28, 12, 62, 2, 'h', { sunk: 1 }],
  // ---- Dune's End
  [571, 206, 63, 28, 60, 3, 'a', { name: "Dune's End Block", poi: 'dunes_end', tint: 'pink', upper: 1 }],
  [589, 156, 25, 18, 50, 2, 'h', { poi: 'dunes_end', sunk: 2 }],
  [600, 247, 40, 30, -35, 3, 'a', { poi: 'dunes_end', tint: 'ochre' }],
  [674, 234, 20, 14, 30, 1, 'r', { sunk: 1.5 }],
  [712, 255, 40, 22, 45, 1, 'r', { sunk: 1.5 }],
  [655, 352, 30, 12, -15, 1, 'h', { sunk: 1 }],
  [690, 350, 18, 9, -30, 1, 'r', { sunk: 1 }],
  [624, 281, 38, 26, 30, 2, 'h', { sunk: 1 }],
  [657, 285, 25, 10, 60, 1, 'r'],
  // ---- hospital and the north-west lanes
  [[412, 198], [432, 188], [491, 275], 4, 'm', { name: 'Hospital', poi: 'hospital', key: 'hospital', keySeg: 1, keyStorey: 2, parts: 3, upper: 2 }],
  [366, 238, 18, 14, 0, 1, 'r'],
  [286, 200, 16, 12, 0, 1, 'h', { sunk: 1.5 }],
  [267, 256, 24, 19, -20, 2, 'h'],
  [275, 281, 22, 17, -20, 2, 'h'],
  [352, 219, 24, 18, 0, 1, 'r', { sunk: 1 }],
  [352, 175, 30, 12, -35, 1, 'h', { sunk: 1 }],
  [326, 193, 18, 12, -30, 1, 'r', { sunk: 1 }],
  [302, 226, 44, 10, 30, 1, 'h', { sunk: 1.5 }],
  [330, 242, 20, 12, -30, 1, 'h', { sunk: 1 }],
  [356, 140, 22, 10, -50, 1, 'r', { sunk: 1 }],
  // ---- Marano Station / Warehouse / Maintenance Depot (west)
  [[240, 258], [254, 262], [237, 344], 2, 'c', { parts: 2, upper: 1, name: 'Marino Station', poi: 'marano_station', wall: 'brick', tint: 'cream' }],
  [94, 369, 50, 46, 0, 2, 'i', { name: 'Warehouse', poi: 'warehouse' }],
  [132, 361, 34, 28, 90, 2, 'i', { poi: 'warehouse' }],
  [149, 386, 22, 22, 0, 1, 'i', { poi: 'warehouse' }],
  [83, 408, 34, 32, 0, 1, 'i', { poi: 'warehouse' }],
  [94, 637, 32, 12, 80, 1, 'i', { name: 'Maintenance Depot', poi: 'maintenance_depot' }],
  [136, 658, 22, 15, 0, 1, 'i', { poi: 'maintenance_depot' }],
  // ---- Library / Parking Garage / Galleria / Research / Space Travel
  [375, 318, 80, 34, -22, 3, 'c', { name: 'Library', poi: 'library', kindLoot: 'old', rich: true, upper: 1 }],
  [352, 285, 46, 26, -22, 3, 'c', { poi: 'library', kindLoot: 'old', upper: 1 }],
  [487, 333, 64, 56, -14, 3, 'p', { name: 'Parking Garage', poi: 'parking_garage' }],
  [568, 316, 112, 40, 61, 3, 's', { name: 'Galleria', poi: 'galleria', wall: 'concrete', tint: 'cream', flat: true, upper: 1 }],
  [501, 396, 64, 30, 62, 3, 't', { name: 'Research', poi: 'research', rich: true, upper: 1 }],
  [533, 377, 64, 28, 59, 3, 't', { name: 'Space Travel', poi: 'space_travel', key: 'space_travel', keySeg: -1, parts: 2, upper: 1 }],
  // ---- Marano Park ring and Piazza Roma
  [326, 401, 70, 17, 50, 3, 'h', { tint: 'ochre' }],
  [298, 430, 40, 18, -42, 3, 'h'],
  [368, 472, 74, 21, 55, 3, 'a', { tint: 'pink' }],
  [333, 470, 28, 18, -20, 2, 'h', { poi: 'piazza_roma' }],
  [351, 502, 30, 20, 55, 2, 'h'],
  [275, 498, 33, 29, -28, 3, 'a', { poi: 'piazza_roma', tint: 'terracotta' }],
  [294, 530, 33, 29, -28, 3, 'a', { tint: 'cream' }],
  [376, 540, 34, 28, -30, 3, 'h', { tint: 'ochre' }],
  [401, 521, 28, 20, -30, 2, 'h'],
  [338, 553, 38, 20, -25, 2, 'h'],
  [558, 429, 30, 19, 60, 2, 's'],
  // ---- Town Hall
  [[430, 527], [511, 481], [523, 503], 3, 'c', { name: 'Town Hall', poi: 'town_hall', key: 'town_hall', keySeg: 'mid', parts: 3, upper: 1, tint: 'cream', kindLoot: 'old' }],
  [[512, 484], [528, 467], [551, 505], 3, 'c', { poi: 'town_hall', tint: 'ochre', upper: 1 }],
  [[536, 507], [550, 503], [553, 527], 2, 'c', { poi: 'town_hall', tint: 'cream' }],
  // ---- south of the Corso: Santa Maria Houses and Main Street
  [[460, 575], [485, 634], [504, 626], 3, 'a', { name: 'Santa Marta Houses', poi: 'santa_maria_houses', tint: 'pink', upper: 1 }],
  [[513, 610], [537, 568], [519, 557], 3, 'a', { poi: 'santa_maria_houses', tint: 'ochre' }],
  [[485, 566], [512, 560], [514, 572], 3, 'a', { poi: 'santa_maria_houses', tint: 'cream', parts: 1 }],
  [[411, 637], [452, 607], [461, 621], 3, 'h', { poi: 'santa_maria_houses', tint: 'cream' }],
  [391, 632, 50, 32, 60, 3, 'a', { tint: 'terracotta' }],
  [[395, 601], [413, 591], [422, 607], 2, 'h'],
  [334, 637, 25, 20, 90, 2, 'h'],
  [553, 588, 56, 21, 80, 3, 'a', { tint: 'cream' }],
  // ---- Plaza Rosa / southern lanes (corner-traced: [[x,z] x3 consecutive corners], storeys, kind, opts)
  [[405, 687], [422, 688], [417, 731], 3, 'h', { poi: 'plaza_rosa', key: 'residential', keyName: 'Residential (Plaza Rossa)', tint: 'pink' }],
  [487, 716, 28, 19, 90, 2, 'h', { poi: 'plaza_rosa', tint: 'ochre' }],
  [474, 738, 24, 13, -35, 2, 'h', { poi: 'plaza_rosa' }],
  [462, 752, 25, 21, -35, 2, 'h', { tint: 'cream' }],
  [[349, 674], [400, 684], [397, 700], 2, 'h', { tint: 'terracotta' }],
  [[350, 690], [363, 692], [358, 720], 2, 'h', { tint: 'terracotta' }],
  [[375, 705], [397, 707], [396, 716], 1, 'h'],
  [[343, 726], [383, 733], [378, 752], 2, 'h', { tint: 'ochre' }],
  [[336, 757], [374, 760], [373, 786], 2, 'h'],
  [[377, 737], [400, 739], [398, 790], 2, 'h', { tint: 'pink' }],
  [[416, 743], [449, 745], [448, 767], 2, 'h', { tint: 'cream' }],
  [446, 772, 30, 24, -30, 2, 'h'],
  [490, 779, 26, 24, 0, 2, 'h', { tint: 'terracotta' }],
  [510, 764, 22, 17, -30, 2, 'h'],
  [527, 740, 48, 20, 60, 2, 'h', { poi: 'plaza_rosa', tint: 'cream' }],
  [425, 805, 40, 24, -15, 2, 'h', { tint: 'cream' }],
  [463, 815, 34, 22, -30, 2, 'h', { sunk: 1 }],
  [533, 667, 16, 16, 0, 7, 'h', { name: 'Red Tower', poi: 'red_tower', wall: 'brick', tint: 'red', flat: true }],
  [538, 694, 30, 26, 80, 3, 'h', { poi: 'red_tower', tint: 'pink' }],
  [548, 652, 30, 20, -20, 2, 'h', { tint: 'cream' }],
  [603, 650, 28, 19, 0, 2, 'h', { tint: 'ochre' }],
  // ---- Grandioso Apartments / west lanes / Old Town
  [228, 598, 40, 37, 15, 5, 'a', { name: 'Grandiosa Apartments', poi: 'grandioso_apartments', upper: 2, key: 'residential', keySeg: 0, keyName: 'Residential (Grandiosa)', tint: 'cream' }],
  [217, 648, 40, 38, 15, 5, 'a', { poi: 'grandioso_apartments', tint: 'cream', upper: 2 }],
  [[236, 502], [275, 560], [262, 575], 3, 'a', { tint: 'ochre' }],
  [[202, 541], [222, 530], [241, 563], 3, 'h', { tint: 'cream', parts: 1 }],
  [[290, 579], [311, 586], [308, 626], 2, 'h', { tint: 'pink', parts: 1 }],
  [[286, 677], [349, 679], [348, 699], 2, 'h', { poi: 'old_town', tint: 'terracotta' }],
  [[317, 656], [342, 658], [340, 677], 2, 'h', { poi: 'old_town', tint: 'ochre' }],
  // ---- east: Piazza Arbusto, Buried Properties
  [642, 523, 40, 26, 0, 2, 'h', { poi: 'piazza_arbusto', tint: 'ochre' }],
  [673, 524, 36, 24, 0, 2, 'h', { poi: 'piazza_arbusto' }],
  [760, 507, 32, 27, 0, 2, 'h', { sunk: 1.5 }],
  [670, 581, 54, 24, -30, 3, 'h', { poi: 'piazza_arbusto', tint: 'pink' }],
  [688, 607, 18, 17, 0, 2, 'h'],
  [600, 584, 20, 18, 0, 2, 'h', { poi: 'piazza_arbusto', tint: 'cream' }],
  [618, 612, 36, 26, 60, 2, 'h', { tint: 'ochre' }],
  [590, 633, 58, 28, -35, 3, 'a', { key: 'residential', keySeg: 0, keyName: 'Residential (Arbusta)', tint: 'terracotta' }],
  [670, 638, 40, 21, -20, 2, 'h'],
  [636, 666, 46, 22, 70, 2, 'h', { tint: 'cream' }],
  [762, 614, 15, 15, 0, 2, 'h', { sunk: 1 }],
  [716, 639, 19, 15, 0, 1, 'h', { sunk: 1 }],
  [632, 321, 58, 30, 62, 2, 'h', { sunk: 1, poi: 'buried_properties' }],
  [661, 371, 36, 22, -30, 2, 'h', { sunk: 1.5, poi: 'buried_properties' }],
  [681, 398, 40, 24, -30, 2, 'h', { sunk: 2, poi: 'buried_properties', tint: 'ochre' }],
  [714, 388, 25, 10, 70, 1, 'r', { sunk: 1.5 }],
  [749, 380, 28, 27, 0, 1, 'h', { sunk: 2.5, poi: 'buried_properties' }],
  [590, 418, 64, 24, -30, 2, 'h', { tint: 'pink' }],
  [613, 473, 44, 28, -30, 2, 'h', { poi: 'buried_properties' }],
  [734, 469, 74, 38, -25, 2, 'a', { sunk: 2, name: 'Sandy Properties', poi: 'buried_properties', tint: 'cream' }],
  // ---- church ruins and the south-east lanes
  [714, 774, 38, 34, -30, 2, 'o', { name: 'Church Ruins', poi: 'church_ruins', ruin: 1 }],
  [733, 743, 48, 19, 60, 2, 'o', { poi: 'church_ruins', ruin: 1 }],
  [690, 762, 34, 20, -20, 2, 'o', { poi: 'church_ruins', ruin: 1 }],
  [657, 724, 9, 9, 0, 7, 'o', { name: 'Bell Tower', poi: 'church_ruins', flat: true, wall: 'plaster', tint: 'cream' }],
  [663, 787, 18, 17, 0, 1, 'r'],
  [692, 798, 19, 17, 0, 1, 'h', { sunk: 1 }],
  [572, 701, 54, 28, 15, 2, 'h', { tint: 'ochre' }],
  [621, 714, 32, 22, -35, 2, 'h'],
  [581, 743, 32, 27, 0, 2, 'h', { tint: 'pink' }],
  [613, 755, 35, 21, -30, 2, 'h'],
  [646, 739, 24, 15, -30, 2, 'h', { tint: 'cream' }],
  [551, 778, 48, 26, -25, 2, 'h', { sunk: 1 }],
];

// Houses swallowed by the dunes: only roofs / attic windows still show. [cx, cz, w, d, ridgeAxis 'x'|'z', showH]
const BURIED = [
  [196, 160, 14, 10, 'x', 1.6], [226, 120, 16, 11, 'z', 1.2], [348, 70, 12, 9, 'x', 1.4], [592, 98, 13, 9, 'x', 1.0],
  [620, 120, 10, 8, 'z', 1.3], [700, 300, 14, 10, 'x', 1.5], [728, 336, 12, 10, 'z', 1.2], [776, 430, 15, 11, 'x', 1.4],
  [812, 470, 12, 9, 'z', 1.1], [836, 640, 14, 10, 'x', 1.3], [800, 720, 12, 9, 'x', 1.6], [770, 840, 13, 10, 'z', 1.2],
  [640, 850, 14, 10, 'x', 1.0], [560, 860, 12, 9, 'z', 1.4], [420, 860, 14, 10, 'x', 1.2], [320, 838, 12, 9, 'z', 1.5],
  [262, 790, 14, 10, 'x', 1.1], [176, 742, 12, 8, 'z', 1.3], [150, 470, 13, 9, 'x', 1.2], [40, 520, 12, 9, 'x', 1.0],
  [168, 270, 12, 8, 'z', 1.4], [430, 30, 12, 9, 'x', 1.3], [660, 170, 12, 9, 'z', 1.2], [858, 380, 12, 9, 'x', 1.0],
];

// Vegetation clusters (palms / olives / cypress) traced from the green patches of the reference.
const GROVES = [
  { pts: [[98, 132], [170, 128], [192, 168], [172, 214], [108, 212]], d: 2.2, k: 'olive' },
  { pts: [[228, 104], [270, 108], [278, 200], [236, 206]], d: 2.4, k: 'mix' },
  { pts: [[206, 188], [262, 192], [258, 236], [210, 232]], d: 1.6, k: 'mix' },
  { pts: [[300, 36], [384, 32], [392, 88], [334, 104], [300, 88]], d: 1.6, k: 'mix' },
  { pts: [[340, 160], [420, 164], [424, 196], [400, 234], [346, 240]], d: 2.0, k: 'mix' },
  { pts: [[430, 128], [470, 124], [474, 156], [434, 160]], d: 1.4, k: 'palm' },
  { pts: [[590, 146], [662, 150], [664, 226], [600, 232]], d: 1.8, k: 'mix' },
  { pts: [[682, 142], [802, 136], [814, 292], [700, 288], [676, 210]], d: 2.6, k: 'olive' },
  { pts: [[770, 150], [862, 160], [866, 340], [790, 342]], d: 2.4, k: 'olive' },
  { pts: [[790, 396], [880, 400], [890, 560], [806, 548]], d: 1.2, k: 'mix' },
  { pts: [[720, 600], [758, 600], [758, 648], [720, 648]], d: 2.4, k: 'olive' },
  { pts: [[700, 680], [800, 676], [806, 790], [756, 760], [704, 712]], d: 1.6, k: 'mix' },
  { pts: [[464, 800], [572, 796], [578, 896], [462, 896]], d: 2.0, k: 'olive' },
  { pts: [[560, 778], [640, 776], [644, 896], [560, 896]], d: 1.8, k: 'olive' },
  { pts: [[706, 846], [802, 846], [806, 896], [712, 896]], d: 1.6, k: 'olive' },
  { pts: [[330, 822], [424, 826], [426, 896], [330, 896]], d: 0.9, k: 'mix' },
  { pts: [[2, 300], [126, 300], [134, 336], [118, 560], [4, 562]], d: 1.5, k: 'olive' },
  { pts: [[20, 536], [124, 540], [128, 654], [24, 650]], d: 1.4, k: 'mix' },
  { pts: [[150, 704], [330, 700], [338, 896], [160, 896]], d: 0.6, k: 'mix' },
  { pts: [[380, 336], [452, 330], [472, 372], [470, 460], [394, 460], [378, 400]], d: 2.6, k: 'park' },
  { pts: [[292, 470], [324, 470], [324, 500], [294, 500]], d: 2.0, k: 'palm' },
  { pts: [[490, 570], [524, 572], [522, 612], [494, 608]], d: 2.2, k: 'palm' },
  { pts: [[810, 600], [896, 610], [896, 740], [820, 720]], d: 1.0, k: 'mix' },
  { pts: [[240, 40], [300, 36], [300, 90], [246, 96]], d: 0.8, k: 'mix' },
];

// Plaza / park / street polygons painted on the town floor
const PLAZAS = [
  { id: 'plaza_rosa', pts: [[424, 690], [474, 698], [506, 712], [500, 744], [470, 742], [448, 736], [424, 728]], tex: 'tiles' },
  { id: 'piazza_roma', pts: [[290, 448], [334, 452], [340, 462], [318, 482], [292, 480], [284, 466]], tex: 'tiles' },
  { id: 'piazza_arbusto', pts: [[596, 540], [660, 538], [672, 560], [640, 572], [600, 566]], tex: 'tiles' },
  { id: 'northern_square', pts: [[400, 286], [450, 290], [452, 318], [414, 336], [398, 318]], tex: 'concrete' },
  { id: 'town_hall_square', pts: [[420, 470], [500, 452], [520, 470], [452, 498], [418, 500]], tex: 'concrete' },
  { id: 'market_square', pts: [[500, 196], [552, 180], [566, 206], [536, 226], [506, 222]], tex: 'tiles' },
  { id: 'main_street', pts: [[300, 664], [420, 660], [470, 664], [512, 650], [560, 662], [640, 690], [700, 716], [694, 730], [636, 706], [556, 676], [512, 664], [470, 680], [420, 676], [300, 680]], tex: 'concrete' },
  { id: 'church_square', pts: [[660, 742], [700, 744], [702, 760], [668, 768], [652, 760]], tex: 'tiles' },
];
// asphalt / gravel roads linking the districts (painted only; terrain already shaped)
const ROADS = [
  { pts: [[436, 96], [430, 150], [420, 196], [404, 250], [406, 286]], w: 7, tex: 'asphalt' },         // gas station road
  { pts: [[300, 150], [360, 150], [430, 150]], w: 6, tex: 'gravel' },
  { pts: [[436, 96], [500, 130], [560, 168]], w: 6, tex: 'gravel' },
  { pts: [[158, 380], [200, 372], [236, 362]], w: 7, tex: 'asphalt' },                                  // warehouse yard → station
  { pts: [[236, 362], [262, 400], [286, 444]], w: 6, tex: 'concrete' },
  { pts: [[406, 286], [440, 352], [452, 420], [450, 470]], w: 5, tex: 'gravel' },                       // through Marano Park
  { pts: [[540, 258], [548, 300], [560, 338]], w: 5, tex: 'concrete' },
  { pts: [[450, 470], [470, 446], [520, 440], [560, 448], [600, 446], [650, 432], [700, 430], [780, 440]], w: 6, tex: 'concrete' },
  { pts: [[330, 590], [300, 650], [276, 690], [256, 740]], w: 6, tex: 'concrete' },
  { pts: [[620, 548], [610, 600], [560, 662]], w: 5, tex: 'concrete' },
  { pts: [[700, 556], [720, 640], [700, 716]], w: 5, tex: 'gravel' },
  { pts: [[456, 556], [448, 600], [432, 662]], w: 5, tex: 'concrete' },
  { pts: [[80, 430], [110, 520], [100, 596]], w: 5, tex: 'gravel' },
];

// Gameplay markers traced from the annotated reference
const SPAWNS = [[434, 76], [295, 146], [589, 160], [708, 221], [669, 367], [866, 571], [302, 433], [367, 283], [532, 481],
  [530, 561], [407, 600], [305, 605], [179, 704], [357, 779], [536, 872], [603, 652], [753, 779], [79, 412], [52, 611]];
const METRO_STAIRS = [[436, 203], [361, 230], [405, 324], [505, 345], [408, 447], [324, 433], [331, 527], [527, 549], [508, 654], [561, 680], [637, 584], [562, 681]];
const SENTINELS = [[478, 497], [546, 546]];
const FIELD_DEPOTS = [[425, 239], [386, 711], [740, 491]];

// =====================================================================================================
// STYLES
// =====================================================================================================
const TINT = { cream: 0xfff4e4, ochre: 0xffd48e, pink: 0xffcbbb, terracotta: 0xf09a7a, peach: 0xffc296, yellow: 0xffe6a0,
  rose: 0xf4b0a0, white: 0xffffff, sage: 0xe2ead0, red: 0xd47862, grey: 0xe2ded6, sand: 0xf6e2be };
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
// BUILDING COMPLEXES  (traced rotated rects → rows of rotated World buildings sharing one frame)
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
  B.forEach((b0, bi) => {
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
    const tower = o.name === 'Red Tower' || o.name === 'Bell Tower', garage = C.kind === 'p';
    // a key wing may be locked only from storey `keyStorey` up (Hospital: the key room is on the 3rd floor,
    // reached by the main wing's stairs and a locked door; the wing below is open)
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
        doors, inner: walls, peek: ruin ? 0 : tower ? 0.85 : 0.72, name: k === 0 ? (o.name || null) : null,
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
// Buried City's signature: you can cross the old town over its terraces. Neighbouring flat roofs of the
// same height get plank bridges; a roof up to one storey higher gets a plank + ladder; every connected
// cluster of roofs gets at least one ladder from the street. Key wings are fine as stepping stones
// (their roofs have no hatch, their upper windows have sills).
function closestOnPoly(P, x, z) { let best = null; for (let i = 0; i < P.length; i++) { const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length], [d, t] = segDist(x, z, ax, az, bx, bz); if (!best || d < best.d) best = { d, x: ax + (bx - ax) * t, z: az + (bz - az) * t, t, i }; } return best; }
function roofRoutes(ctx) {
  const { w, rng, occ } = ctx;
  const roofs = ctx.segs.filter(s => s.bb && !s.ruin && !s.gable && s.storeys >= 1 && !(s.C.o.name === 'Red Tower' || s.C.o.name === 'Bell Tower'));
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
// Red Tower / bell tower: stairs to the top, a crate or two on the landings, lights on every floor
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

const SHUTTER = { cream: 0x9ac0a0, ochre: 0x88b090, pink: 0xa8c8b0, terracotta: 0xd8c8a8, peach: 0x8ab09a, yellow: 0x7aa080, rose: 0xc0d0b8, sand: 0x90b8a0, white: 0x88a8c8, red: 0xd8c8a8 };
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
// TERRAIN: the town floor in a bowl of dunes
// =====================================================================================================
function townH(x, z) { return 0.8 + fbm(N1, x, z, 150) * 2.4 + (x - z) * 0.0015; }
function duneH(x, z) {
  const edge = Math.min(x, MW - x, z, MH - z);
  const rim = Math.pow(1 - sstep(0, 200, edge), 1.5) * 13;
  const base = 2.5 + fbm(N2, x, z, 170) * 9;
  const warp = fbm(N3, x, z, 95) * 90, per = 52 + fbm(N1, x + 300, z, 210) * 40;
  const u = (x * 0.93 + z * 0.37 + warp) / per, f = u - Math.floor(u);
  const crest = f < 0.7 ? f / 0.7 : (1 - f) / 0.3;                 // long windward slope, steep lee face
  const amp = fbm(N4, x, z, 120), on = sstep(0.32, 0.6, amp);       // crest fields fade in and out
  const u2 = (x * 0.42 - z * 0.91 + warp * 0.6) / 88, f2 = u2 - Math.floor(u2), c2 = f2 < 0.65 ? f2 / 0.65 : (1 - f2) / 0.35;
  const ridges = crest * crest * (1.5 + amp * 6) * on + c2 * c2 * 2.5 * (1 - on);
  const north = Math.exp(-((z - 70) ** 2) / (2 * 60 * 60)) * sstep(100, 260, x) * (1 - sstep(780, 900, x)) * 7;
  return base + rim + ridges + north;
}
function shapeTerrain(ctx) {
  const { w } = ctx;
  const L = new Mask(3).poly(TOWN, 0.66).poly(CORE, 1);
  for (const f of FLATS) L.poly(f.pts, f.v);
  L.line(HIGHWAY, 30, 0.7); L.line(RAIL, 20, 0.7);
  L.blur(5, 2);
  ctx.low = L;
  // evaluate on a 2 m lattice and interpolate (dune features are >= ~15 m)
  const G = 2, gw = MW / G + 1, gh = MH / G + 1, hg = new Float32Array(gw * gh);
  for (let j = 0; j < gh; j++) for (let i = 0; i < gw; i++) { const x = i * G, z = j * G, d = sstep(0.03, 0.97, 1 - L.at(x, z)); hg[j * gw + i] = townH(x, z) + (d > 0.002 ? duneH(x, z) * d : 0); }
  w.heightFn((x, z) => {
    const fx = x / G, fz = z / G, i = Math.min(gw - 2, Math.floor(fx)), j = Math.min(gh - 2, Math.floor(fz)), u = fx - i, v = fz - j;
    return (hg[j * gw + i] * (1 - u) + hg[j * gw + i + 1] * u) * (1 - v) + (hg[(j + 1) * gw + i] * (1 - u) + hg[(j + 1) * gw + i + 1] * u) * v;
  }, 'set');
}
// buried edge buildings: pile a dune against their windward (north-east) side
function sunkMounds(ctx) {
  const { w } = ctx;
  for (const C of ctx.cxs) {
    if (!C.o.sunk) continue;
    const [x0, z0, x1, z1] = bounds(C.segs.flatMap(s => s.poly));
    const W = x1 - x0, D = z1 - z0, r = Math.max(W, D) * 0.85 + 6;
    w.raiseCircle(x1 - W * 0.15, z0 + D * 0.15, r, C.o.sunk * 1.7, 0.75, 'add');
  }
}
// drifts in streets and against walls
function sandDrifts(ctx) {
  const { w, rng, occ } = ctx;
  for (let i = 0; i < 420; i++) {
    const x = 160 + rng() * 680, z = 60 + rng() * 800;
    if (ctx.low.at(x, z) < 0.55) continue;
    const r = 3 + rng() * 6;
    if (polyDist(x, z, HIGHWAY)[0] < HW_W / 2 + r + 2) continue;   // the street under the overpass stays clear
    if (!occ.free(x - r * 0.6, z - r * 0.6, x + r * 0.6, z + r * 0.6)) continue;
    w.raiseCircle(x, z, r, 0.3 + rng() * 0.8, 0.85, 'add');
  }
  // drifts banked against the windward (local north / west) walls, only where the lane is open
  const openAlong = (C, ax, az, bx, bz) => { for (let t = 0; t <= 1; t += 0.2) { const [x, z] = toW(C, lerp(ax, bx, t), lerp(az, bz, t)); if (!occ.free(x - 1.5, z - 1.5, x + 1.5, z + 1.5)) return false; } return true; };
  for (const s of ctx.segs) {
    const C = s.C;
    if (rng() < 0.5 && openAlong(C, s.x0 + 1, s.z0 - 2.8, s.x1 - 1, s.z0 - 2.8)) w.ridge([toW(C, s.x0 + 1, s.z0 - 2.8), toW(C, s.x1 - 1, s.z0 - 2.8)], 1.5, 0.5 + rng() * 0.7, 2.5, 'add');
    if (rng() < 0.3 && openAlong(C, s.x0 - 2.8, s.z0 + 1, s.x0 - 2.8, s.z1 - 1)) w.ridge([toW(C, s.x0 - 2.8, s.z0 + 1), toW(C, s.x0 - 2.8, s.z1 - 1)], 1.5, 0.4 + rng() * 0.6, 2.5, 'add');
  }
}

// =====================================================================================================
// ELEVATED DECKS: highway (Corso da Vinci) + Marano rail viaduct
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
// GROUND PAINT
// =====================================================================================================
function paintGround(ctx) {
  const { w } = ctx; const L = ctx.low;
  w.paintFn((x, z) => {
    const l = L.at(x, z);
    const drift = N4(x / 7, z / 7) * 0.55 + N2(x / 26, z / 26) * 0.45;
    if (l > 0.62) {
      if (drift > 0.58 - (1 - l) * 1.6) return drift > 0.62 - (1 - l) * 1.2 ? 'sand' : 'sandDark';
      const pv = N3(x / 11, z / 11);
      return pv > 0.72 ? 'tiles' : pv < 0.3 ? 'gravel' : 'concrete';
    }
    if (l > 0.5) return drift > 0.36 ? 'sand' : (N1(x / 5, z / 5) > 0.62 ? 'gravel' : 'sandDark');
    // dunes: darker sand on the steep lee faces (wind from the west-north-west)
    const gx = w.groundAt(x + 1, z) - w.groundAt(x - 1, z), gz = w.groundAt(x, z + 1) - w.groundAt(x, z - 1);
    const lee = (gx * 0.93 + gz * 0.37) * 0.5;
    return lee < -0.32 + N1(x / 9, z / 9) * 0.12 ? 'sandDark' : null;
  });
  for (const p of PLAZAS) w.paintPoly(p.tex, p.pts);
  for (const r of ROADS) w.path(r.pts, r.w, r.tex);
  // drifted sand tongues across the paving
  for (let i = 0; i < 160; i++) {
    const x = 180 + ctx.rng() * 640, z = 80 + ctx.rng() * 760;
    if (L.at(x, z) < 0.7) continue;
    w.paintCircle(ctx.rng() < 0.7 ? 'sand' : 'sandDark', x, z, 2 + ctx.rng() * 5, 0.5, i);
  }
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
function addObstacles(ctx) {
  const obs = [];
  const box = (x0, z0, x1, z1) => obs.push({ poly: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]] });
  // deck corridors as oriented strips along each polyline leg
  const corridor = (pts, half, from = 0, to = 1e9) => {
    let acc = 0;
    for (let k = 0; k < pts.length - 1; k++) {
      const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az);
      if (acc + L > from && acc < to) {
        const t0 = Math.max(0, (from - acc) / L), t1 = Math.min(1, (to - acc) / L), ux = (bx - ax) / L, uz = (bz - az) / L, nx = -uz * half, nz = ux * half;
        const sx = ax + (bx - ax) * t0 - ux, sz = az + (bz - az) * t0 - uz, ex = ax + (bx - ax) * t1 + ux, ez = az + (bz - az) * t1 + uz;
        obs.push({ poly: [[sx + nx, sz + nz], [ex + nx, ez + nz], [ex - nx, ez - nz], [sx - nx, sz - nz]] });
      }
      acc += L;
    }
  };
  corridor(HIGHWAY, HW_W / 2 + 2.5);
  corridor(RAIL, 6, RAIL_VIADUCT_FROM - 10);
  box(484, 287, 510, 313);           // parking garage spiral ramp
  corridor(RAIL, 4.2, 150, 372);    // station tracks + platform strip
  ctx.obstacles = obs;
}
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
// A 34 x 16 m hall sunk 5 m under the street (World `under`). The metro extract set (platform, 32 m of track,
// signals, roundel, console, the 12 m car) faces the far (north) wall, so the train runs along the back of
// the hall and is seen doors-on from the camera; two 4 m street stairwells (railings, M totems, lamps)
// come down at both ends of the concourse on the near side. 16 x 8 m around the point stays clear.
const ST_L = 34, ST_D = 16, ST_UNDER = 5, ST_STAIR = 7.7, ST_PZ = 8.5;
function siteFree(ctx, cx, cz, rot, L, D, pad) {
  const R = rotFrame(cx, cz, rot), { w } = ctx;
  let gmin = 1e9, gmax = -1e9;
  for (let lz = -pad; lz <= D + pad; lz += 1.5) for (let lx = -pad - 4; lx <= L + pad + 4; lx += 1.5) {
    const inEnt = lx < -pad || lx > L + pad;                       // street in front of the two stair exits
    if (inEnt && (lz < D - 6 || lz > D)) continue;
    const [x, z] = rotPt(R, cx - L / 2 + lx, cz - D / 2 + lz);
    if (x < 8 || z < 8 || x > MW - 8 || z > MH - 8) return null;
    if (ctx.occ.at(x, z) !== -1 || ctx.onDeck(x, z) || ctx.keepClear.some(([kx, kz, kr]) => Math.hypot(kx - x, kz - z) < kr)) return null;
    if (polyDist(x, z, RAIL)[0] < 8 || polyDist(x, z, HIGHWAY)[0] < HW_W / 2 + 2) return null;
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
  // ---- inside. The extract set brings platform (x 9..25, z 6.9..11.25), track bed (z 3.75..6.9) and car;
  // ours: dark tunnel mouths where the track meets the end walls, concourse pillars / benches / sign, kiosk,
  // a little loot in the corners, ceiling lights
  const inH = { inHall: true }, face = Math.PI - rot;   // extract-local +z (toward the track) = hall north
  for (const lx of [0.95, L - 1.05]) blk(lx, 3.3, lx + 0.1, 7.6, 3.8, 'roofTar', { y0: floor, collide: false, cast: false, tint: 0x202020 });
  for (const lx of [12, 17, 22]) blk(lx - 0.4, 13.7, lx + 0.4, 14.5, ST_UNDER, 'concrete', { y0: floor, tint: 0xd8d0c4, cutaway: true });
  for (const lx of [14.5, 19.5]) w.prop('sc_bench', ...L2(lx, 12.5), face, inH);
  w.prop('sc_sign', ...L2(17, 14.6), face, inH);
  w.prop('sc_kiosk', ...L2(30.2, 9.2), face, { inHall: true, solid: true });
  w.container('locker', ...L2(3.4, 8.8), face, { tier: 1, inHall: true });
  w.container('trash', ...L2(10.4, 14.1), face, { tier: 1, inHall: true });
  w.container(rng() < 0.5 ? 'backpack' : 'suitcase', ...L2(23.6, 14.1), face, { tier: 2, inHall: true });
  for (const lx of [9, 17, 25]) w.lamp(...L2(lx, 9.5), { yAbs: floor + 3.6, color: 0xe8f0ff, intensity: 1.3, range: 12, flicker: rng() < 0.4 ? 0.4 : 0, model: null });
  for (const lx of [4.6, L - 4.6]) w.lamp(...L2(lx, 13), { yAbs: floor + 3.0, color: 0xfff0d0, intensity: 0.9, range: 8, model: null });
  // ---- the extract on the platform, facing the track (final position: its collision is placed now)
  const [ex, ez] = L2(L / 2, ST_PZ);
  w.extract(id, name, ex, ez, { kind: 'metro', face, trackZ: 3, trackLen: L - 2, platformLen: 16 });
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
// and face the most open side
function hatch(ctx, id, name, x, z) {
  const { w } = ctx; [x, z] = freeSpot(ctx, x, z, 2.2);
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
function setPieces(ctx, HW, RL) {
  const { w, rng } = ctx;
  // ---------------- Gas Station
  // forecourt rotated with the reference block (-31°): pump canopy north of the kiosk
  w.paintPoly('concrete', [[421, 76], [440, 65], [461, 99], [443, 110]]); w.paintPoly('asphalt', [[426, 78], [440, 70], [452, 90], [438, 98]]);
  const gsR = -31 * D2R, gs = canopy(ctx, 438.5 - 5.85, 82.6 - 7.4, 11.7, 14.8, 4.6, { name: 'Gas Station', roof: 'metalPanel', wall: 'plaster', tint: TINT.cream, rot: gsR });
  for (const lx of [2.4, 9.3]) for (const lz of [3.5, 11.3]) w.prop('sc_pump', ...w.local(gs, lx, lz), -gsR, { solid: true });
  w.prop('sc_fiat3', ...w.local(gs, 5.9, 7.4), -gsR + 0.15, { solid: true }); w.container('car_trunk', ...w.local(gs, 5.9, 10.4), -gsR, { tier: 1 });
  w.prop('sc_carroof', 452, 74, 0.3, { solid: true }); w.prop('sc_sign', 420, 70, 0, { solid: true, scale: 1.6 });
  w.prop('barrel', 456, 92, 0, { solid: true }); w.prop('barrel', 457, 93.4, 0, { solid: true }); w.prop('barrelBlue', 455.6, 94, 0, { solid: true });
  w.container('toolbox', 454, 90, 0, { tier: 1 }); w.container('trash', 422, 98, 0);
  w.lamp(...w.local(gs, 3, 7), { y: 4.2, color: 0xfff4e0, intensity: 1.2, range: 12, model: null, flicker: 0.3 });
  w.lamp(...w.local(gs, 9, 7), { y: 4.2, color: 0xfff4e0, intensity: 1.2, range: 12, model: null });
  // ---------------- Su Durante Warehouses yard
  w.paint('concrete', 282, 140, 336, 176);
  for (let i = 0; i < 5; i++) w.prop(i % 2 ? 'sc_container' : 'sc_container2', 286 + i * 3.2, 172, 0.05 * (i - 2), { solid: true });
  w.prop('sc_container', 330, 146, Math.PI / 2, { solid: true });
  for (let i = 0; i < 8; i++) { const [x, z] = freeSpot(ctx, 290 + rng() * 40, 140 + rng() * 30, 1); w.prop(rng() < 0.5 ? 'sc_cratestack' : 'crate', x, z, rng() * 6, { solid: true }); if (i % 2) w.container(rng() < 0.5 ? 'crate' : 'toolbox', x + 2, z, 0, { tier: 2 }); }
  w.fence([[280, 138], [280, 178], [338, 178]], 1.6, 'rust');
  w.lamp(300, 176, { y: 4, color: 0xffd8a0, intensity: 1.2, range: 12 });
  // ---------------- Collapsed Supermarket: car park of half-buried cars
  for (let i = 0; i < 9; i++) { const [x, z] = freeSpot(ctx, 455 + (i % 3) * 5, 196 + Math.floor(i / 3) * 6, 1.4, 6); w.prop(i % 3 ? 'sc_carroof' : 'sc_carroof2', x, z, 0.2 + rng() * 0.3, { solid: true }); if (i % 3 === 0) w.container('car_trunk', x, z + 2.2, 0, { tier: 1 }); }
  // ---------------- Market Ruins: stalls, crates, amphorae
  w.paintPoly('tiles', PLAZAS[5].pts);
  for (let i = 0; i < 10; i++) {
    const [x, z] = freeSpot(ctx, 508 + (i % 5) * 9 + rng() * 2, 194 + Math.floor(i / 5) * 12 + rng() * 2, 1.6, 8);
    w.prop(i % 2 ? 'sc_stall' : 'sc_stall2', x, z, (i % 2) * Math.PI + (rng() - 0.5) * 0.3, { solid: true });
    w.container(i % 3 === 0 ? 'basket' : i % 3 === 1 ? 'crate' : 'suitcase', x + 1.9, z, 0, { tier: 2 });
    if (rng() < 0.5) w.prop('sc_vase', x - 1.9, z + 0.4, 0, { solid: true });
  }
  stLamp(w, 530, 205, { intensity: 1.0, range: 10, flicker: 0.4 });
  // ---------------- Hospital forecourt + field depot
  for (const [x, z] of FIELD_DEPOTS) {
    const [px, pz] = freeSpot(ctx, x, z, 2.2);
    w.prop('sc_fielddepot', px, pz, 0, { solid: true }); w.container('field_depot', px, pz + 2.2, 0, { tier: 2 });
    w.prop('lootCrate', px + 2.6, pz + 1, 0.3, { solid: true });
    w.lamp(px - 1.6, pz + 1.6, { y: 2.2, color: 0x80c8ff, intensity: 0.9, range: 7, model: null });
  }
  for (let i = 0; i < 4; i++) { const [x, z] = freeSpot(ctx, 404 + i * 3, 218 + i * 6, 1.3); w.prop('sc_barrier', x, z, 0.9, { solid: true }); }
  w.prop('sc_fiat', ...freeSpot(ctx, 410, 262, 1.6), 0.4, { solid: true });
  // ---------------- Northern square: Library forecourt, statue, metro
  w.prop('sc_statue', ...freeSpot(ctx, 410, 312, 1.2), 0.3, { solid: true });
  for (let i = 0; i < 6; i++) w.prop(i % 2 ? 'sc_cypress' : 'sc_palm', ...freeSpot(ctx, 400 + i * 6, 290 + (i % 2) * 22, 1), rng() * 6, { solid: true });
  // ---------------- Parking Garage spiral ramp (stacked concrete rings)
  for (let lv = 0; lv < 3; lv++) ring(ctx, 497, 300, 11, 14, (x, z, a) => {
    const g = w.groundAt(497, 300);
    w.block(x - 2.6, z - 2.6, x + 2.6, z + 2.6, 0.7, 'damConcrete', { y0: g + lv * 2.8 + 1.8, collide: false });
    if (lv === 0) w.block(x - 2.2, z - 2.2, x + 2.2, z + 2.2, 1.5, 'concrete', { y0: g - 0.3 });
  });
  w.block(491, 294, 503, 306, 9.5, 'concrete', {});
  w.block(489, 292, 505, 308, 0.4, 'damConcrete', { y0: w.groundAt(497, 300) + 9.2, collide: false });
  ctx.occ.markPoly([[484, 287], [510, 287], [510, 313], [484, 313]], 99997);   // nothing spawns inside the ring
  // ---------------- Galleria entrances: cafés
  cafe(ctx, 536, 270, 4); cafe(ctx, 600, 368, 4);
  // ---------------- Research / Space Travel: antennae + barriers
  w.prop('antenna', ...freeSpot(ctx, 548, 352, 1), 0, { solid: true });
  w.prop('antenna', ...freeSpot(ctx, 478, 420, 1), 0, { solid: true });
  for (let i = 0; i < 5; i++) w.prop('sc_barrier', ...freeSpot(ctx, 486 + i * 2.2, 432 + i * 1.2, 1.1), 0.5, { solid: true });
  // ---------------- Marano Park
  ctx.park = fountainPlaza(ctx, 420, 396);
  w.prop('sc_statue', ...freeSpot(ctx, 404, 430, 1.2), 1, { solid: true });
  for (let i = 0; i < 10; i++) w.prop('sc_bench', ...freeSpot(ctx, 392 + rng() * 70, 345 + rng() * 105, 1), rng() * 6, { solid: true });
  // ---------------- Piazza Roma + Western Station
  fountainPlaza(ctx, 306, 458);
  cafe(ctx, 322, 446, 4);
  // ---------------- Town Hall: scaffold on the facade, square statue, barricades
  w.prop('sc_statue', ...freeSpot(ctx, 452, 478, 1.3), 0.2, { solid: true });
  for (let i = 0; i < 5; i++) w.prop('sc_scaffold', ...freeSpot(ctx, 440 + i * 14, 540 - i * 6.5, 1.6), -0.45, { solid: true });
  for (let i = 0; i < 6; i++) w.prop('sandbag', ...freeSpot(ctx, 430 + i * 4, 492 - i * 2, 1), -0.45, { solid: true });
  // ---------------- Piazza Arbusto: market under the highway + Eastern Station
  w.paintPoly('tiles', PLAZAS[2].pts);
  for (let i = 0; i < 6; i++) { const [x, z] = freeSpot(ctx, 604 + i * 9, 560 + (i % 2) * 5, 1.6, 6); w.prop(i % 2 ? 'sc_stall' : 'sc_stall2', x, z, (rng() - 0.5) * 0.4, { solid: true }); w.container(i % 2 ? 'medical_bag' : 'basket', x + 1.8, z, 0, { tier: 2 }); }
  cafe(ctx, 650, 566, 4);
  w.prop('sc_kiosk', ...freeSpot(ctx, 596, 552, 1.3), 0, { solid: true });
  // ---------------- Plaza Rosa + Southern Station
  w.paintPoly('tiles', PLAZAS[0].pts);
  ctx.rosa = fountainPlaza(ctx, 462, 716);
  cafe(ctx, 478, 704, 6); cafe(ctx, 436, 700, 4);
  // ---------------- Church Ruins: pews, altar, columns, bell tower bell, cypress avenue
  const nave = ctx.cxs.find(C => C.o.name === 'Church Ruins');
  if (nave) {
    // nave laid out in the church's own frame: altar at the far end of the long axis, two rows of pews
    const C = nave, s = nave.segs[0], alongZ = s.z1 - s.z0 >= s.x1 - s.x0;
    const P = (u, v) => toW(C, alongZ ? (s.x0 + s.x1) / 2 + v : s.x0 + u, alongZ ? s.z0 + u : (s.z0 + s.z1) / 2 + v);   // u along nave, v across
    const len = alongZ ? s.z1 - s.z0 : s.x1 - s.x0, half = (alongZ ? s.x1 - s.x0 : s.z1 - s.z0) / 2;
    const face = (alongZ ? Math.PI : -Math.PI / 2) - C.rot;
    for (let r = 0; r < 5 && 5 + r * 2.6 < len - 2; r++) { w.prop('sc_pew', ...P(5 + r * 2.6, -3.2), face, { solid: true }); w.prop('sc_pew', ...P(5 + r * 2.6, 3.2), face, { solid: true }); }
    w.prop('sc_altar', ...P(2.2, 0), face + Math.PI, { solid: true }); w.container('safe', ...P(1.6, 2.6), face + Math.PI, { tier: 3 });
    w.container('cabinet', ...P(2, -half + 1.2), face, { tier: 2 }); w.container('basket', ...P(len - 2, half - 1.2), face, { tier: 2 });
    for (let i = 0; i < 4 && 4 + i * 5 < len - 1; i++) { w.prop('sc_column', ...P(4 + i * 5, -half + 2.4), 0, { solid: true }); w.prop(i === 2 ? 'sc_column_fallen' : 'sc_column', ...P(4 + i * 5, half - 2.4), 1.2 - C.rot, { solid: true }); }
    w.lamp(...P(3, 0), { y: 1.4, color: 0xffb060, intensity: 0.8, range: 6, flicker: 0.5, model: null });
  }
  const tower = ctx.cxs.find(C => C.o.name === 'Bell Tower');
  if (tower) { const s = tower.segs[0], [bx, bz] = toW(tower, (s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2); w.prop('sc_bell', bx, bz, -tower.rot, { y: tower.storeys * 3.2 + 0.3 + (tower.floorY - w.groundAt(bx, bz)) }); }
  for (let i = 0; i < 8; i++) w.prop('sc_cypress', ...freeSpot(ctx, 662 + i * 5, 738 + i * 0.5, 1), 0, { solid: true });
  for (let i = 0; i < 12; i++) w.prop(rng() < 0.5 ? 'sc_column' : 'sc_vase', ...freeSpot(ctx, 640 + rng() * 60, 770 + rng() * 40, 1), rng() * 6, { solid: true });
  // ---------------- Old Town / Grandioso: laundry between the blocks, parked cars
  for (let i = 0; i < 6; i++) w.prop(i % 2 ? 'sc_laundry' : 'sc_laundry2', ...freeSpot(ctx, 214 + rng() * 30, 616 + rng() * 10, 1), Math.PI * 0.08, {});
  for (let i = 0; i < 4; i++) { const [x, z] = freeSpot(ctx, 252 + i * 3, 600 + i * 9, 1.6); w.prop(['sc_fiat', 'sc_fiat2', 'sc_fiat3', 'sc_fiat4'][i], x, z, 0.3, { solid: true }); w.container('car_trunk', x, z + 2.1, 0, { tier: 1 }); }
  // ---------------- Marano Station: platform canopy, wagons, benches, sign
  { // platform strip between the track and the (rotated) station hall: benches, lamps, two stranded carriages
    const a0 = polyDist(236, 250, RAIL)[1], a1 = polyDist(219, 336, RAIL)[1];
    const at = (s2, off) => { const [x, z, tx, tz] = pointAt(RAIL, s2); return [x - tz * off, z + tx * off, Math.atan2(tx, tz)]; };
    const strip = []; for (let s2 = a0; s2 <= a1; s2 += 6) strip.push(at(s2, 4.2).slice(0, 2));
    w.path(strip, 3, 'concrete');
    for (let s2 = a0 + 8, i = 0; s2 < a1 - 4; s2 += 15, i++) {
      const [bx, bz, r] = at(s2, 4.6); w.prop('sc_bench', bx, bz, r + Math.PI / 2, { solid: true });
      const [lx, lz] = at(s2 + 7, 4.4); w.lamp(lx, lz, { y: 3.6, color: 0xffe0b0, intensity: 1.0, range: 9, model: 'lamp', flicker: i === 3 ? 0.6 : 0 });
    }
    for (const s2 of [a0 + 26, a0 + 44]) { const [x, z, r] = at(s2, 0); w.prop('sc_wagon', x, z, r, { solid: true }); }
    const [sx, sz] = at(a0 - 3, 4.5); w.prop('sc_streetsign', sx, sz, 0, { solid: true });
  }
  // the three round cisterns north-west of the station, and a derailed wagon beside them
  for (const [x, z, sc] of [[155, 213, 2.0], [182, 221, 1.85], [152, 240, 2.4]]) { w.prop('sc_cistern', x, z, 0, { solid: true, scale: sc }); w.paintCircle('concrete', x, z, sc * 4.3, 0.05, x); }
  w.prop('sc_wagon', 203, 258, -0.28, { solid: true }); w.container('suitcase', 206.5, 252, 0, { tier: 1 });
  // rail yard wagons south of the station (half buried)
  const yard = [[198, 405, -0.32], [178, 412, -0.3], [206, 432, -0.33], [160, 520, -0.25], [150, 548, -0.26], [146, 580, -0.24]];
  for (const [x, z, r] of yard) { w.prop('sc_wagon', x, z, r, { solid: true }); w.container('suitcase', x + 2.4, z, 0, { tier: 1 }); }
  // ---------------- Warehouse yard
  w.paint('concrete', 60, 330, 180, 440);
  for (let i = 0; i < 6; i++) w.prop(i % 2 ? 'sc_container' : 'sc_container2', ...freeSpot(ctx, 160 + (i % 3) * 3.2, 410 + Math.floor(i / 3) * 8, 1.5), 0, { solid: true });
  for (let i = 0; i < 12; i++) { const [x, z] = freeSpot(ctx, 60 + rng() * 115, 335 + rng() * 100, 1); w.prop(['barrel', 'barrelBlue', 'crate', 'sc_cratestack'][i % 4], x, z, rng() * 6, { solid: true }); }
  w.fence([[58, 328], [178, 328]], 2, 'rust'); w.fence([[58, 328], [58, 442]], 2, 'rust');
  w.lamp(120, 404, { y: 4.5, color: 0xffd8a0, intensity: 1.4, range: 14 }); w.lamp(170, 360, { y: 4.5, color: 0xffd8a0, intensity: 1.2, range: 12 });
  // ---------------- Maintenance Depot
  w.paint('concrete', 76, 616, 152, 672);
  w.prop('workbench', ...freeSpot(ctx, 112, 645, 1), 0, { solid: true }); w.container('toolbox', ...freeSpot(ctx, 116, 646, 0.6), 0, { tier: 2 });
  for (let i = 0; i < 5; i++) w.prop(i % 2 ? 'barrel' : 'sc_cratestack', ...freeSpot(ctx, 104 + rng() * 40, 620 + rng() * 45, 1), rng() * 6, { solid: true });
  w.prop('sc_container2', ...freeSpot(ctx, 150, 640, 1.5), 0, { solid: true });
  w.lamp(118, 630, { y: 4, color: 0xffd8a0, intensity: 1.1, range: 11 });
  // ---------------- Abandoned Highway Camp (on the deck)
  {
    const s0 = 690;
    for (let i = 0; i < 6; i++) {
      const [x, z, tx, tz] = pointAt(HW.pts, s0 + i * 7), y = 0;
      const side = i % 2 ? 1 : -1, nx = -tz * side * 2.6, nz = tx * side * 2.6;
      w.prop(['sc_tent', 'sc_tarp', 'sc_tent2', 'sc_tarp2', 'sc_container', 'sc_tent'][i], x + nx, z + nz, Math.atan2(tx, tz) + (side > 0 ? 0 : Math.PI), { solid: i % 2 === 0 || i === 4 });
    }
    const [cx, cz] = pointAt(HW.pts, s0 + 18);
    w.prop('sc_campfire', cx, cz, 0, {}); w.lamp(cx, cz, { y: 0.8, color: 0xff9040, intensity: 1.6, range: 10, flicker: 0.6, model: null });
    w.container('raider_cache', cx + 1.5, cz + 1.5, 0, { tier: 3 }); w.container('raider_cache', ...pointAt(HW.pts, s0 + 34).slice(0, 2), 0, { tier: 2 });
    w.container('ammo_box', cx - 1.8, cz + 0.6, 0, { tier: 2 }); w.container('backpack', cx + 0.4, cz - 1.9, 0, { tier: 1 });
    for (let i = 0; i < 6; i++) { const [x, z, tx, tz] = pointAt(HW.pts, s0 - 6 + i * 9); w.prop('sandbag', x + tz * 3.6, z - tx * 3.6, Math.atan2(tz, -tx), { solid: true }); }
    w.prop('sc_barrier', ...pointAt(HW.pts, s0 - 10).slice(0, 2), 0.9, { solid: true });
    w.prop('sc_barrier', ...pointAt(HW.pts, s0 + 50).slice(0, 2), 0.9, { solid: true });
  }
  // ---------------- Highway traffic jam: wrecks, a bus, barriers, sand on the deck
  for (let s = 20; s < HW.total - 10; s += 9 + rng() * 14) {
    if (HW.inGap(s) || HW.inGap(s + 6) || HW.inGap(s - 6) || (s > 676 && s < 750)) continue;
    const [x, z, tx, tz] = pointAt(HW.pts, s), side = rng() < 0.5 ? 1 : -1, off = 1.5 + rng() * 2;
    const px = x - tz * side * off, pz = z + tx * side * off, rot = Math.atan2(tx, tz) + (rng() - 0.5) * 0.6 + (rng() < 0.5 ? Math.PI : 0);
    const t = rng();
    if (t < 0.55) { w.prop(['sc_fiat', 'sc_fiat2', 'sc_fiat3', 'sc_fiat4'][Math.floor(rng() * 4)], px, pz, rot, { solid: true }); if (rng() < 0.55) w.container('car_trunk', px + Math.sin(rot) * 2.7, pz + Math.cos(rot) * 2.7, rot, { tier: 1 }); }
    else if (t < 0.62) w.prop('sc_bus', px, pz, rot, { solid: true });
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
  // ---------------- rail line: sleepers + rails on the yard and viaduct
  for (let s = 0; s < RL.total; s += 4) {
    const [x, z, tx, tz] = pointAt(RL.pts, s);
    w.prop('sc_rails', x, z, Math.atan2(tx, tz), {});
  }
}

// =====================================================================================================
// VEGETATION + CLUTTER
// =====================================================================================================
function vegetation(ctx) {
  const { w, rng } = ctx;
  const avoid = (x, z) => ctx.blocked(x, z, 1.5);
  const kinds = {
    olive: [['sc_olive', 4], ['sc_olive2', 4], ['sc_palm2', 1], ['sc_cypress', 0.6]],
    palm: [['sc_palm', 4], ['sc_palm2', 2], ['sc_palm3', 2]],
    mix: [['sc_palm', 3], ['sc_olive', 3], ['sc_olive2', 2], ['sc_palm3', 1.5], ['sc_cypress', 1.2], ['sc_palm2', 1]],
    park: [['sc_cypress', 3], ['sc_palm', 2], ['sc_olive', 2], ['sc_palm3', 1], ['tree', 0.6]],
  };
  GROVES.forEach((g, gi) => {
    let a = 0; for (let i = 0, j = g.pts.length - 1; i < g.pts.length; j = i++) a += (g.pts[j][0] + g.pts[i][0]) * (g.pts[j][1] - g.pts[i][1]);
    const area = Math.abs(a / 2), n = Math.round(area / 100 * g.d);
    const ks = kinds[g.k];
    let tot = 0; for (const k of ks) tot += k[1];
    // wild plants / herbs worth picking in the groves (nature loot); trees keep clear of them
    for (let i = 0, k = 0, [bx0, bz0, bx1, bz1] = bounds(g.pts); i < 20 && k < (g.k === 'park' ? 4 : 1 + (area > 6000 ? 1 : 0)); i++) {
      const px = lerp(bx0, bx1, rng()), pz = lerp(bz0, bz1, rng());
      if (!inPoly(px, pz, g.pts) || avoid(px, pz)) continue;
      w.container('plant', px, pz, rng() * 6, { tier: rng() < 0.2 ? 2 : 1 }); ctx.keepClear.push([px, pz, 1]); k++;
    }
    for (const [k, wgt] of ks) w.scatter(k, g.pts, Math.round(n * wgt / tot), { solid: true, seed: 1000 + gi * 17 + k.length, avoid, scale: k.startsWith('sc_olive') ? 1.45 : k === 'sc_cypress' ? 1.1 : 1.25, scaleVar: 0.4 });
    w.scatter(gi % 3 ? 'sc_shrub' : 'bush', g.pts, Math.round(n * 0.5), { seed: 2000 + gi, avoid, scaleVar: 0.5 });
    w.scatter('sc_agave', g.pts, Math.round(n * 0.12), { seed: 3000 + gi, avoid });
    // dappled earth under the trees
    const [x0, z0, x1, z1] = bounds(g.pts);
    for (let i = 0; i < Math.round(area / 900); i++) { const px = lerp(x0, x1, rng()), pz = lerp(z0, z1, rng()); if (inPoly(px, pz, g.pts) && !avoid(px, pz)) w.paintCircle(g.k === 'park' ? 'grass' : rng() < 0.5 ? 'dirt' : 'sandDark', px, pz, 3 + rng() * 5, 0.6, i); }
  });
  // palms dotted through the town (courtyards, street corners)
  let placed = 0;
  for (let i = 0; i < 2500 && placed < 230; i++) {
    const x = 190 + rng() * 620, z = 90 + rng() * 740;
    if (ctx.low.at(x, z) < 0.75 || ctx.blocked(x, z, 2.2)) continue;
    w.prop(['sc_palm', 'sc_palm2', 'sc_palm3', 'sc_olive', 'sc_cypress'][Math.floor(rng() * 5)], x, z, rng() * 6, { solid: true, scale: 0.85 + rng() * 0.3 });
    placed++;
  }
  // dune scrub
  w.scatter('sc_grass', [0, 0, MW, MH], 2600, { seed: 77, avoid: (x, z) => ctx.low.at(x, z) > 0.6 || ctx.blocked(x, z, 0.5), scaleVar: 0.6 });
  w.scatter('sc_shrub_dry', [0, 0, MW, MH], 700, { seed: 78, avoid: (x, z) => ctx.low.at(x, z) > 0.75 || ctx.blocked(x, z, 1), scaleVar: 0.5 });
  w.scatter('deadTree', [0, 0, MW, MH], 90, { seed: 79, solid: true, avoid: (x, z) => ctx.low.at(x, z) > 0.5 || ctx.blocked(x, z, 2) });
  w.scatter('cactus', [0, 0, MW, MH], 60, { seed: 80, solid: true, avoid: (x, z) => ctx.low.at(x, z) > 0.4 || ctx.blocked(x, z, 2) });
  // wind-cut rock outcrops (north-east slab, east spikes)
  w.raisePoly([[708, 122], [752, 116], [766, 128], [744, 142], [712, 138]], w.groundAt(735, 130) + 4.5, 2.5, 'max');
  w.paintPoly('rock', [[708, 122], [752, 116], [766, 128], [744, 142], [712, 138]]);
  w.scatter('rock', [[700, 112], [770, 110], [774, 150], [700, 150]], 18, { seed: 81, solid: true, scale: 1.4 });
  w.scatter('rock', [[862, 190], [900, 190], [900, 320], [862, 320]], 26, { seed: 82, solid: true, scale: 1.6 });
  w.scatter('rock', [0, 0, MW, MH], 140, { seed: 83, solid: true, avoid: (x, z) => ctx.low.at(x, z) > 0.45 || ctx.blocked(x, z, 2), scaleVar: 0.8 });
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
  const lanes = (x, z, r) => ctx.low.at(x, z) > 0.6 && !ctx.blocked(x, z, r);
  const B = { car: 170, lamp: 230, deb: 900, sign: 70, husk: 40, trash: 60, barricade: 70, market: 50, weeds: 700, junk: 160 };
  const cnt = {}; for (const k in B) cnt[k] = 0;
  const near = (x, z, r) => { const a = rng() * 6.283, d = rng() * r; return [x + Math.cos(a) * d, z + Math.sin(a) * d]; };
  for (let i = 0; i < 26000; i++) {
    const x = 160 + rng() * 680, z = 60 + rng() * 800, t = rng();
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
  // Barron husks: fixed landmark wrecks of giant ARK half swallowed by the dunes (breachable, tier 3)
  for (const [x0, z0, r] of [[150, 560, 0.6], [790, 300, -0.4], [620, 862, 1.1]]) {
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
    if (t < 0.35) { w.prop('husk', x, z, rng() * 6, { solid: true }); w.container('arc_husk', x + 2.1, z, 0, { tier: 2 }); }
    else if (t < 0.6) w.prop(rng() < 0.5 ? 'sc_carroof' : 'sc_carroof2', x, z, rng() * 6, { solid: true });
    else if (t < 0.75) { w.prop('arcCrate', x, z, rng() * 6, { solid: true }); w.container('arc_crate', x + 1.1, z, 0, { tier: 2 }); }
    else w.prop('sc_lamppost', x, z, 0, { solid: true, y: -1.2 });
    n++;
  }
  // metro stairs (sealed secondary entrances)
  for (const [x, z] of METRO_STAIRS) { const [px, pz] = freeSpot(ctx, x, z, 1.6, 10); w.prop('sc_metro_stairs', px, pz, rng() < 0.5 ? 0 : Math.PI / 2, {}); }
}

// =====================================================================================================
// GAMEPLAY MARKERS
// =====================================================================================================
// [id, display name (lightly tweaked), x, z, radius, tier, original ARC Raiders name]
const POIS = [
  ['gas_station', 'Gas Station', 438, 86, 26, 1, 'Gas Station'],
  ['su_duranti_warehouses', 'Su Duranti Warehouses', 306, 138, 40, 2, 'Su Durante Warehouses'],
  ['collapsed_supermarket', 'Collapsed Supermarket', 486, 186, 28, 2, 'Collapsed Supermarket'],
  ['market_ruins', 'Market Ruins', 528, 206, 34, 2, 'Market Ruins'],
  ['hospital', 'Hospital', 452, 238, 50, 3, 'Hospital'],
  ['dunes_end', "Dune's End", 590, 226, 44, 2, "Dune's End"],
  ['library', 'Library', 366, 308, 46, 2, 'Library'],
  ['parking_garage', 'Parking Garage', 488, 330, 36, 2, 'Parking Garage'],
  ['galleria', 'Galleria', 568, 318, 56, 2, 'Galleria'],
  ['research', 'Research', 500, 398, 34, 3, 'Research'],
  ['space_travel', 'Space Travel', 533, 378, 34, 3, 'Space Travel'],
  ['marino_station', 'Marino Station', 236, 300, 50, 2, 'Marano Station'],
  ['warehouse', 'Warehouse', 104, 382, 50, 2, 'Warehouse'],
  ['marino_park', 'Marino Park', 424, 402, 42, 1, 'Marano Park'],
  ['piazza_romana', 'Piazza Romana', 308, 458, 32, 2, 'Piazza Roma'],
  ['sandy_properties', 'Sandy Properties', 690, 440, 70, 2, 'Buried Properties'],
  ['town_hall', 'Town Hall', 482, 512, 56, 3, 'Town Hall'],
  ['piazza_arbusta', 'Piazza Arbusta', 628, 556, 36, 2, 'Piazza Arbusto'],
  ['corso_da_vinchi', 'Corso da Vinchi', 420, 566, 40, 1, 'Corso da Vinci'],
  ['santa_marta_houses', 'Santa Marta Houses', 476, 604, 48, 2, 'Santa Maria Houses'],
  ['grandiosa_apartments', 'Grandiosa Apartments', 224, 622, 44, 2, 'Grandioso Apartments'],
  ['main_street', 'Main Street', 430, 670, 46, 1, 'Main Street'],
  ['abandoned_highway_camp', 'Abandoned Highway Camp', 236, 704, 36, 2, 'Abandoned Highway Camp'],
  ['red_tower', 'Red Tower', 536, 680, 30, 2, 'Red Tower'],
  ['plaza_rossa', 'Plaza Rossa', 458, 722, 40, 2, 'Plaza Rosa'],
  ['church_ruins', 'Church Ruins', 705, 765, 46, 2, 'Church Ruins'],
  ['maintenance_depot', 'Maintenance Depot', 108, 640, 36, 1, 'Maintenance Depot'],
  ['old_town', 'Old Town', 304, 668, 30, 1, 'Old Town'],
];
// open ground big enough for a condition boss (Queene / Matriark) and its escorts. Sandy City's condition
// roster (MAP_CONDITIONS) has no boss today, so these only matter if one is added: the park ring, the
// warehouse yard and the half-buried east blocks are the reference's widest open spaces.
const BOSS_ARENAS = { marino_park: true, warehouse: true, sandy_properties: true };
// metro stations are named places too (quests visit them); positions resolved from the placed entrances
const STATION_POIS = [['northern_station', 'Northern Station', 'northern'], ['western_station', 'Western Station', 'western'],
  ['eastern_station', 'Eastern Station', 'eastern'], ['southern_station', 'Southern Station', 'southern']];

function markers(ctx) {
  const { w, rng } = ctx;
  for (const [id, name, x, z, r, tier, orig] of POIS) {
    const al = orig.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    w.poi(id, name, x, z, r, { tier, aliases: al === id ? [] : [al], ...(BOSS_ARENAS[id] ? { bossPoi: BOSS_ARENAS[id] } : {}) });
  }
  for (const [id, name, k] of STATION_POIS) { const m = ctx.metro[k]; if (m) w.poi(id, name, m[0], m[1], 18, { tier: 1, aliases: [] }); }
  // key rooms (one entry per locked building; multi-wing key areas list each rotated wing in `polys`)
  const byId = new Map();
  for (const k of ctx.keySegs) {
    const key = k.id + '|' + k.C.bi;
    if (!byId.has(key)) byId.set(key, { id: k.id, name: k.name, polys: [], bids: [], floorYs: [] });
    byId.get(key).polys.push(k.s.poly.map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]));
    byId.get(key).bids.push(k.s.bid);
    byId.get(key).floorYs.push(+k.y0.toFixed(2));
  }
  // rotated key wings: x0..z1 is the world bounding box, `polys` the exact (rotated) footprints
  for (const e of byId.values()) {
    const [x0, z0, x1, z1] = bounds(e.polys.flat());
    w.keyRoom(e.id, x0, z0, x1, z1, null, { name: e.name, polys: e.polys, bids: e.bids, floorYs: e.floorYs });
  }
  hatch(ctx, 'collapsed_supermarket_hatch', 'Collapsed Supermarket Hatch', 478, 172);
  hatch(ctx, 'train_station_hatch', 'Train Station Hatch', 252, 344);
  hatch(ctx, 'highway_overpass_hatch', 'Highway Overpass Hatch', 524, 516);
  hatch(ctx, 'old_town_hatch', 'Old Town Hatch', 306, 658);
  for (const [x, z] of ctx.spawnPts) w.spawnPoint(x, z);

  // ---------------------------------------------------------------- ARK
  // static perches sit on the actual roof (absolute height of the chosen segment's roof)
  const roofOf = (name, fx = 0.5, fz = 0.5, si = null) => { const C = ctx.cxs.find(c => c.o.name === name); if (!C) return null; const s = C.segs[si ?? Math.floor(C.segs.length / 2)]; const [x, z] = toW(C, lerp(s.x0, s.x1, fx), lerp(s.z0, s.z1, fz)); return [x, z, { surface: true, roof: true }]; };
  const roofAt = (name, x, z) => {   // roof point of the named complex nearest to (x, z)
    const C = ctx.cxs.find(c => c.o.name === name); if (!C) return null;
    const [lx, lz] = C.R ? unrotPt(C.R, x, z) : [x, z];
    let best = null;
    for (const s of C.segs) { const qx = clamp(lx, s.x0 + 1.5, s.x1 - 1.5), qz = clamp(lz, s.z0 + 1.5, s.z1 - 1.5), d = Math.hypot(qx - lx, qz - lz); if (!best || d < best.d) best = { d, s, qx, qz }; }
    const [wx, wz] = toW(C, best.qx, best.qz); return [wx, wz, { surface: true, roof: true }];
  };
  // sentinels on rooftops / towers (reference icons at Town Hall + the overpass, plus towers)
  { const r = roofAt('Town Hall', 478, 497); if (r) w.arkSpawn('sentinel', r[0], r[1], r[2]); }   // reference Sentinel icon on the Town Hall roof
  { // reference Sentinel icon on the overpass: snapped onto the Corso deck
    const [d, sa] = polyDist(546, 546, HIGHWAY), [hx, hz, tx, tz] = pointAt(HIGHWAY, sa), side = Math.sign((546 - hx) * -tz + (546 - hz) * tx) || 1;
    const off = Math.min(d, HW_W / 2 - 1.5) * side;
    w.arkSpawn('sentinel', hx - tz * off, hz + tx * off, { surface: true });
  }
  for (const [n, fx, fz] of [['Red Tower', 0.62, 0.5], ['Bell Tower', 0.7, 0.3], ['Hospital', 0.5, 0.5]]) { const r = roofOf(n, fx, fz); if (r) w.arkSpawn('sentinel', r[0], r[1], r[2]); }
  for (const n of ['Galleria', 'Grandiosa Apartments', 'Library']) { const r = roofOf(n, 0.6, 0.4); if (r) w.arkSpawn('turret', r[0], r[1], r[2]); }
  // the Hospital rooftop cache (reached in the game by zipline / snap hook; here by the main wing's roof ladder)
  { const r = roofOf('Hospital', 0.72, 0.5, 0); if (r) w.container('raider_cache', r[0], r[1], 0, { tier: 3, surface: true }); }
  for (const n of ['Research', 'Space Travel', 'Warehouse', 'Marino Station']) { const r = roofOf(n, 0.3, 0.6); if (r) w.arkSpawn('turret', r[0], r[1], r[2]); }
  { const [x, z] = pointAt(HIGHWAY, 735); w.arkSpawn('turret', x, z, { surface: true }); }
  // drones patrolling the plazas and streets
  const loops = [
    ['wasp', 448, 706, [[440, 700], [486, 704], [494, 740], [448, 746]]], ['wasp', 306, 458, [[290, 446], [330, 446], [334, 482], [292, 486]]],
    ['wasp', 424, 400, [[392, 352], [460, 360], [462, 444], [396, 444]]], ['wasp', 628, 556, [[596, 540], [668, 540], [664, 576], [600, 576]]],
    ['wasp', 528, 206, [[500, 190], [560, 186], [556, 226], [504, 226]]], ['wasp', 452, 240, [[420, 200], [480, 230], [492, 286], [430, 262]]],
    ['wasp', 568, 318, [[530, 262], [600, 300], [610, 370], [546, 340]]], ['wasp', 236, 300, [[226, 250], [262, 260], [258, 350], [216, 344]]],
    ['wasp', 104, 382, [[64, 340], [170, 344], [166, 430], [70, 432]]], ['wasp', 590, 226, [[560, 180], [630, 210], [620, 270], [570, 250]]],
    ['wasp', 690, 440, [[640, 400], [760, 400], [760, 490], [640, 486]]], ['wasp', 224, 622, [[196, 580], [256, 590], [250, 676], [190, 664]]],
    ['wasp', 705, 765, [[660, 730], [750, 730], [752, 800], [660, 800]]], ['wasp', 306, 138, [[278, 110], [340, 100], [336, 176], [282, 176]]],
    ['wasp', 438, 86, [[410, 64], [470, 70], [466, 110], [414, 110]]], ['wasp', 536, 680, [[506, 656], [570, 664], [566, 704], [510, 700]]],
  ];
  for (const [k, x, z, p] of loops) { const [px, pz] = freeSpot(ctx, x, z, 2, 20); w.arkSpawn(k, px, pz, { count: 2, radius: 8, patrol: p }); }
  const hornets = [[482, 512, [[430, 480], [540, 470], [550, 520], [440, 548]]], [568, 318, [[540, 270], [610, 360]]], [533, 378, [[500, 350], [560, 400], [520, 430]]],
    [452, 240, [[420, 205], [490, 285]]], [705, 765, [[670, 740], [740, 790]]], [420, 566, [[330, 598], [455, 556], [570, 538], [455, 556]]]];
  for (const [x, z, p] of hornets) { const [px, pz] = freeSpot(ctx, x, z, 2, 24); w.arkSpawn('hornet', px, pz, { count: 1, radius: 6, patrol: p }); }
  w.arkSpawn('rocketeer', 700, 549, { count: 1, radius: 10, patrol: [[640, 545], [800, 558], [880, 568]] });
  w.arkSpawn('rocketeer', 220, 740, { count: 1, radius: 10, patrol: [[272, 655], [204, 768], [160, 860]] });
  w.arkSpawn('rocketeer', 640, 120, { count: 1, radius: 14, patrol: [[600, 80], [760, 90], [700, 160]], notCondition: 'hurricane' });
  w.arkSpawn('rocketeer', 500, 860, { count: 1, radius: 14, patrol: [[400, 860], [600, 870], [520, 820]], notCondition: 'hurricane' });
  // ground ARK in the lanes and inside buildings
  const roomPick = (pred) => { const rs = ctx.cxs.filter(pred).flatMap(C => C.rooms).filter(r => !r.ruin && !r.key && (r.x1 - r.x0) * (r.z1 - r.z0) > 20); return rs[Math.floor(rng() * rs.length)]; };
  for (let i = 0; i < 16; i++) { const r = roomPick(C => C.o.poi); if (r) w.arkSpawn('tick', ...toW(r.C, (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2), { count: 2 + (i % 2), radius: 3 }); }
  const lanes = [[438, 160], [398, 470], [520, 460], [612, 500], [462, 664], [380, 690], [560, 650], [300, 560], [262, 420], [604, 690], [660, 610], [548, 248], [340, 260], [430, 760], [650, 470], [736, 520]];
  lanes.forEach(([x, z], i) => { const [px, pz] = freeSpot(ctx, x, z, 1.5, 15); w.arkSpawn(i % 3 === 2 ? 'fireball' : 'pop', px, pz, { count: i % 3 === 2 ? 1 : 3, radius: 6 }); });
  const shred = [[430, 668], [490, 630], [300, 690], [640, 640]];
  for (const [x, z] of shred) { const [px, pz] = freeSpot(ctx, x, z, 1.5, 15); w.arkSpawn('shredder', px, pz, { count: 1, radius: 8, patrol: [[px - 20, pz], [px + 20, pz + 6]] }); }
  const snitch = [[420, 130], [610, 160], [770, 420], [320, 780], [160, 470], [600, 820], [250, 230]];
  for (const [x, z] of snitch) w.arkSpawn('snitch', x, z, { count: 1, radius: 10, patrol: [[x - 25, z - 10], [x + 25, z + 10]] });
  for (const [x, z] of [[650, 90], [820, 300], [120, 760], [380, 880], [40, 450]]) w.arkSpawn('surveyor', x, z, { count: 1, radius: 20, patrol: [[x - 30, z], [x, z - 30], [x + 30, z], [x, z + 30]] });
  // heavies roam the open dunes and the highway ends
  w.arkSpawn('leaper', 760, 210, { count: 1, radius: 30, patrol: [[700, 180], [820, 240], [780, 320]] });
  w.arkSpawn('leaper', 580, 860, { count: 1, radius: 30, patrol: [[480, 860], [660, 860], [600, 820]] });
  w.arkSpawn('leaper', 60, 500, { count: 1, radius: 30, patrol: [[40, 440], [80, 560], [120, 470]] });
  w.arkSpawn('leaper', 330, 60, { count: 1, radius: 30, patrol: [[260, 60], [380, 50], [330, 100]] });
  w.arkSpawn('bastion', 470, 60, { count: 1, radius: 24, patrol: [[420, 40], [520, 60], [470, 110]] });
  w.arkSpawn('bastion', 850, 570, { count: 1, radius: 24, patrol: [[820, 566], [880, 572]] });
  w.arkSpawn('bastion', 330, 860, { count: 1, radius: 24, patrol: [[280, 840], [380, 870]] });
  w.arkSpawn('bombardier', 830, 420, { count: 1, radius: 20 }); w.arkSpawn('spotter', 760, 470, { count: 1, radius: 20, patrol: [[720, 440], [790, 500]] });
  w.arkSpawn('bombardier', 70, 250, { count: 1, radius: 20 }); w.arkSpawn('spotter', 150, 300, { count: 1, radius: 20, patrol: [[120, 270], [190, 330]] });

  // ---------------------------------------------------------------- condition-gated groups
  const lane = (x, z) => freeSpot(ctx, x, z, 2, 20);
  // Bird City: "ARC drones of all types patrol the sky in significantly greater numbers" over the rooftops
  const birdLoops = [[[300, 470], [380, 440], [420, 520], [330, 560]], [[430, 590], [520, 560], [560, 640], [470, 700]], [[540, 280], [620, 300], [600, 380], [520, 360]],
    [[360, 690], [440, 700], [430, 790], [350, 780]], [[600, 690], [680, 700], [700, 790], [610, 780]], [[400, 200], [500, 200], [520, 280], [420, 290]]];
  birdLoops.forEach((p, i) => { const [x, z] = lane(...p[0]); w.arkSpawn(['wasp', 'hornet', 'snitch'][i % 3], x, z, { count: i % 3 === 0 ? 3 : 1, radius: 10, patrol: p, condition: 'bird_city' }); });
  for (const [x, z] of [[470, 640], [600, 330]]) w.arkSpawn('rocketeer', x, z, { count: 1, radius: 12, patrol: [[x - 40, z], [x + 40, z + 10]], condition: 'bird_city' });
  // Night Raid: increased ARK spawn rates — extra drone sweeps of the lit plazas + a hornet over Main Street
  for (const [x, z, p] of [[458, 722, [[430, 700], [500, 720], [470, 760]]], [306, 458, [[290, 440], [340, 470], [300, 490]]], [628, 556, [[600, 540], [670, 550], [640, 580]]], [452, 238, [[420, 210], [480, 260]]]])
    w.arkSpawn('wasp', ...lane(x, z), { count: 2, radius: 8, patrol: p, condition: 'night_raid' });
  w.arkSpawn('hornet', ...lane(430, 670), { count: 1, radius: 8, patrol: [[330, 670], [560, 670], [690, 720]], condition: 'night_raid' });
  // Hurricane: "the Hurricanes have drawn more ARC" — heavies push into the town edges; flyers grounded
  w.arkSpawn('leaper', ...lane(640, 470), { count: 1, radius: 20, patrol: [[600, 430], [700, 480], [640, 520]], condition: 'hurricane' });
  w.arkSpawn('bastion', ...lane(300, 700), { count: 1, radius: 16, patrol: [[260, 690], [350, 720]], condition: 'hurricane' });
  w.arkSpawn('bastion', ...lane(470, 140), { count: 1, radius: 16, patrol: [[420, 120], [520, 160]], condition: 'hurricane' });
  // Close Scrutiny: Surveyrs scanning the open squares, each guarded by Vaporisers
  for (const [x, z] of [[424, 402], [104, 400], [540, 206], [628, 556], [700, 440]]) {
    const [sx, sz] = lane(x, z);
    w.arkSpawn('surveyor', sx, sz, { count: 1, radius: 10, patrol: [[sx - 15, sz], [sx, sz - 15], [sx + 15, sz], [sx, sz + 15]], condition: 'close_scrutiny' });
    w.arkSpawn('vaporiser', sx + 4, sz + 4, { count: 2, radius: 8, condition: 'close_scrutiny' });
  }
  // Prospecting Probes: probes land in the open dunes "protected by flying ARC" — wasp escorts over the landing fields
  for (const [x, z] of [[760, 220], [140, 500], [600, 850], [300, 60]]) w.arkSpawn('wasp', x, z, { count: 2, radius: 16, patrol: [[x - 25, z - 10], [x + 25, z + 10]], condition: 'prospecting_probes' });

  // ---------------------------------------------------------------- loot zones
  w.zone('Dunes', [[0, 0], [MW, 0], [MW, MH], [0, MH]], { tier: 1 });
  w.zone('Old Town', TOWN, { tier: 2 });
  // high-value areas outlined on the reference (red = locked key areas, yellow = rich loot buildings)
  w.zone('Hospital', [[409, 196], [433, 184], [494, 276], [470, 290]], { tier: 3 });
  w.zone('Space Travel', [[502, 356], [528, 341], [564, 398], [536, 413]], { tier: 3 });
  w.zone('Town Hall', [[428, 529], [531, 466], [554, 501], [518, 507], [445, 549]], { tier: 3 });
  w.zone('Library', [[317, 295], [368, 265], [382, 289], [407, 289], [420, 311], [350, 352]], { tier: 3 });
  w.zone('Research', [[470, 372], [498, 359], [531, 415], [502, 434]], { tier: 3 });
  w.zone('Grandiosa Apartments', [[216, 575], [255, 584], [232, 675], [200, 667]], { tier: 3 });
  w.zone('Plaza Rossa', [[411, 685], [508, 708], [499, 749], [463, 768], [401, 731]], { tier: 3 });
  w.zone('Galleria', [[520, 256], [566, 248], [622, 364], [584, 384]], { tier: 2 });
  w.zone('Abandoned Highway Camp', [[210, 680], [262, 690], [246, 740], [200, 730]], { tier: 2 });
}

// =====================================================================================================
export default {
  id: 'sandy_city', name: 'Sandy City', size: [MW, MH], seed: 4417,
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
    shapeTerrain(ctx); mark('terrain');
    addObstacles(ctx);
    layoutComplexes(ctx);
    sunkMounds(ctx);
    sandDrifts(ctx); mark('layout+drifts');
    ctx.HW = makeDeck(ctx, { pts: HIGHWAY, prof: deckProfile(ctx, HIGHWAY, 5.2), width: HW_W, gaps: HW_GAPS, ramps: HW_RAMPS, bridge: true, embank: [[0, 36]] });
    ctx.RL = makeDeck(ctx, { pts: RAIL, prof: deckProfile(ctx, RAIL, 4.0, RAIL_VIADUCT_FROM, 60), width: 7, from: RAIL_VIADUCT_FROM, ramps: [[700, 1], [820, -1]] });
    ctx.decks.push(ctx.HW, ctx.RL); mark('decks');
    complexFloors(ctx);
    paintGround(ctx);
    paintDeck(ctx, ctx.HW, 'asphalt');
    w.path(RAIL.slice(0, 9), 6, 'gravel');
    paintDeck(ctx, ctx.RL, 'gravel', 'concrete'); mark('paint');
    buildComplexes(ctx); buriedHouses(ctx); mark('buildings');
    // underground metro stations (reference positions; the search keeps them clear of buildings / decks)
    ctx.halls = [];
    ctx.metro.northern = metroStation(ctx, 'northern_station', 'Northern Station', 425, 303, { lid: 'concrete', deg: -20 });
    ctx.metro.western = metroStation(ctx, 'western_station', 'Western Station', 310, 477, { lid: 'tiles', deg: 30 });
    ctx.metro.eastern = metroStation(ctx, 'eastern_station', 'Eastern Station', 555, 621, { lid: 'concrete', deg: -30 });
    ctx.metro.southern = metroStation(ctx, 'southern_station', 'Southern Station', 451, 737, { lid: 'tiles', deg: 10 });
    // raider hatches (reference positions, ~2 m clear)
            roofRoutes(ctx);
    // level-aware placement: anything put over a station lid sits on the lid, anything on the overpass on the deck
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
    dressDeck(ctx, ctx.RL, { wallTex: 'brick', pil: 'damConcrete', rail: 'rust', step: 2 });
    ctx.spawnPts = SPAWNS.map(([x, z]) => {
      if (x > 840) { const pt = pointAt(HIGHWAY, polyDist(x, z, HIGHWAY)[1]); return [pt[0], pt[1]]; }   // east end: on the Corso embankment
      return freeSpot(ctx, x, z, 1.5, 12);
    });
    for (const [x, z] of ctx.spawnPts) ctx.keepClear.push([x, z, 2.5]);
    setPieces(ctx, ctx.HW, ctx.RL); mark('decks+setpieces');
    vegetation(ctx); mark('veg');
    streetClutter(ctx); mark('clutter');
    markers(ctx); mark('markers');
    if (typeof window === 'undefined') this._ctx = ctx;   // node-side debug hook for map tools only
  },
};
