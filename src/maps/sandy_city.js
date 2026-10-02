// Sandy City — DarkRaiders' take on ARC Raiders' "Buried City" (the old town of Marano, half
// swallowed by desert dunes). Layout traced from docs/ref/buried_city_*.jpg: reference pixel p (2400 px
// annotated map) maps to world metres as  x = (px - 180) * 0.42453,  z = (pz - 80) * 0.42453  (north up).
// See docs/research/map_sandy_city.md for POI ids, aliases, extracts, key rooms and deviations.
//
// Top-down adaptations: the many rotated villas / civic blocks of the reference are rebuilt as
// axis-aligned "staircase" complexes (World buildings are axis-aligned); the elevated highway
// (Corso da Vinci) is a walkable deck with collapsed spans where the old streets ran underneath and
// sand drifts that ramp up onto it; upper storeys are visual only.
import './props_sandy_city.js';
import { propInfo } from '../engine/models.js';

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
  line(pts, wd, v = 1) { for (let j = 0; j < this.h; j++) for (let i = 0; i < this.w; i++) if (polyDist(i * this.r, j * this.r, pts)[0] < wd / 2) this.a[j * this.w + i] = Math.max(this.a[j * this.w + i], v); return this; }
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
const FLATS = [
  { pts: [[48, 326], [178, 326], [186, 444], [56, 446]], v: 1 },           // Warehouse yard
  { pts: [[186, 196], [262, 186], [266, 362], [192, 360]], v: 1 },         // Marano Station
  { pts: [[58, 596], [162, 592], [170, 682], [66, 690]], v: 0.95 },        // Maintenance Depot
  { pts: [[380, 40], [470, 22], [548, 26], [560, 110], [470, 120], [390, 118]], v: 0.72 }, // gas station / northern ruins
  { pts: [[600, 690], [760, 690], [780, 800], [640, 820]], v: 0.9 },       // church ruins
];

// Elevated highway "Corso da Vinci": centreline from the east edge, through Piazza Arbusto, over the
// old town and curving away south-west past the Abandoned Highway Camp to the corner of the map.
const HIGHWAY = [[904, 572], [850, 566], [800, 558], [748, 554], [700, 549], [660, 545], [622, 541], [570, 538], [530, 540], [505, 543],
  [478, 549], [455, 556], [428, 564], [402, 573], [378, 581], [352, 590], [330, 600], [312, 613], [292, 632], [272, 655], [255, 680],
  [240, 705], [222, 735], [204, 768], [186, 804], [168, 842], [150, 880], [136, 910]];
const HW_W = 11;          // deck width
// collapsed spans (arc-length windows along HIGHWAY) where the old streets pass underneath
const HW_GAPS = [[262, 276], [372, 385], [452, 465], [560, 572]];
// sand drifts that ramp up onto the deck: [arc length, side (+1 = right/south of travel, -1 = left/north)]
const HW_RAMPS = [[150, 1], [214, -1], [330, 1], [418, -1], [505, 1], [642, -1], [700, 1], [770, 1], [840, -1]];

// Marano rail line: north out of the station, south through the yard and onto the long viaduct SW.
const RAIL = [[304, 22], [288, 52], [262, 88], [250, 140], [247, 200], [245, 256], [245, 346], [236, 382], [214, 430], [196, 482],
  [180, 540], [166, 600], [152, 660], [138, 720], [126, 790], [114, 860], [104, 912]];
const RAIL_VIADUCT_FROM = 540;   // arc length where the rail climbs onto its viaduct

// Building complexes: [cx, cz, length, width, angleDeg(long axis, +x toward +z), storeys, kind, opts]
// kind: h house  a apartments  s shops  c civic  m medical  t tech  i industrial  p parking  o church  r ruin
const B = [
  // ---- north: gas station, northern ruins, Su Durante, supermarket, market ruins
  [446, 97, 11, 8, 60, 1, 's', { name: 'Gas Station Kiosk', tint: 'cream', poi: 'gas_station' }],
  [497, 57, 42, 27, 69, 2, 'r', { sunk: 1.2 }],
  [509, 99, 42, 28, 65, 3, 'a', { sunk: 1.5, tint: 'ochre' }],
  [391, 111, 20, 14, -35, 2, 'h', { sunk: 1 }],
  [404, 135, 30, 18, -30, 2, 'h'],
  [298, 129, 37, 33, -33, 2, 'i', { name: 'Su Durante Warehouse', poi: 'su_durante_warehouses' }],
  [331, 104, 22, 15, -33, 2, 'i', { poi: 'su_durante_warehouses', sunk: 1 }],
  [318, 161, 30, 15, -33, 1, 'i', { poi: 'su_durante_warehouses' }],
  [489, 184, 35, 29, 57, 1, 's', { name: 'Collapsed Supermarket', ruin: 0.5, poi: 'collapsed_supermarket' }],
  [534, 153, 38, 18, 55, 1, 'r', { poi: 'market_ruins' }],
  [520, 234, 32, 20, 55, 1, 'r', { poi: 'market_ruins' }],
  [556, 128, 28, 12, 62, 2, 'h', { sunk: 1 }],
  // ---- Dune's End
  [571, 206, 63, 28, 60, 3, 'a', { name: "Dune's End Block", poi: 'dunes_end', tint: 'pink' }],
  [589, 156, 25, 18, 50, 2, 'h', { poi: 'dunes_end', sunk: 2 }],
  [600, 247, 40, 30, -35, 3, 'a', { poi: 'dunes_end', tint: 'ochre' }],
  [674, 234, 20, 14, 30, 1, 'r', { sunk: 1.5 }],
  [692, 256, 18, 13, 40, 1, 'r', { sunk: 1.5 }],
  [624, 281, 38, 26, 30, 2, 'h', { sunk: 1 }],
  [657, 285, 25, 10, 60, 1, 'r'],
  // ---- hospital and the north-west lanes
  [453, 240, 109, 30, 58.5, 4, 'm', { name: 'Hospital', poi: 'hospital', key: 'hospital', keySeg: 1 }],
  [366, 238, 18, 14, 0, 1, 'r'],
  [286, 200, 16, 12, 0, 1, 'h', { sunk: 1.5 }],
  [267, 256, 24, 19, -20, 2, 'h'],
  [275, 281, 22, 17, -20, 2, 'h'],
  [352, 219, 24, 18, 0, 1, 'r', { sunk: 1 }],
  // ---- Marano Station / Warehouse / Maintenance Depot (west)
  [226, 300, 88, 18, 90, 2, 'c', { name: 'Marano Station', poi: 'marano_station', wall: 'brick', tint: 'cream' }],
  [94, 369, 50, 46, 0, 2, 'i', { name: 'Warehouse', poi: 'warehouse' }],
  [132, 361, 34, 28, 90, 2, 'i', { poi: 'warehouse' }],
  [149, 386, 22, 22, 0, 1, 'i', { poi: 'warehouse' }],
  [83, 408, 34, 32, 0, 1, 'i', { poi: 'warehouse' }],
  [94, 637, 32, 12, 80, 1, 'i', { name: 'Maintenance Depot', poi: 'maintenance_depot' }],
  [136, 658, 22, 15, 0, 1, 'i', { poi: 'maintenance_depot' }],
  // ---- Library / Parking Garage / Galleria / Research / Space Travel
  [375, 318, 80, 34, -22, 3, 'c', { name: 'Library', poi: 'library', kindLoot: 'old' }],
  [352, 285, 46, 26, -22, 3, 'c', { poi: 'library', kindLoot: 'old' }],
  [487, 333, 64, 56, -14, 3, 'p', { name: 'Parking Garage', poi: 'parking_garage' }],
  [568, 316, 112, 40, 61, 3, 's', { name: 'Galleria', poi: 'galleria', wall: 'concrete', tint: 'cream' }],
  [501, 396, 64, 30, 62, 3, 't', { name: 'Research', poi: 'research' }],
  [533, 377, 64, 28, 59, 3, 't', { name: 'Space Travel', poi: 'space_travel', key: 'space_travel', keySeg: -1 }],
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
  [348, 505, 30, 22, -25, 2, 'h'],
  [558, 429, 30, 19, 60, 2, 's'],
  // ---- Town Hall
  [477, 520, 92, 28, -26, 3, 'c', { name: 'Town Hall', poi: 'town_hall', key: 'town_hall', keySeg: 0, tint: 'cream', kindLoot: 'old' }],
  [532, 489, 38, 24, -26, 3, 'c', { poi: 'town_hall', tint: 'ochre' }],
  // ---- south of the Corso: Santa Maria Houses and Main Street
  [474, 597, 64, 18, 66, 3, 'a', { name: 'Santa Maria Houses', poi: 'santa_maria_houses', tint: 'pink' }],
  [512, 594, 70, 18, -56, 3, 'a', { poi: 'santa_maria_houses', tint: 'ochre' }],
  [439, 627, 54, 22, -30, 3, 'h', { poi: 'santa_maria_houses', tint: 'cream' }],
  [390, 637, 48, 34, -35, 3, 'a', { tint: 'terracotta' }],
  [412, 604, 34, 18, -30, 2, 'h'],
  [345, 630, 40, 26, 90, 2, 'h'],
  [553, 588, 56, 21, 80, 3, 'a', { tint: 'cream' }],
  // ---- Plaza Rosa / Red Tower / southern lanes
  [415, 707, 44, 15, 82, 3, 'h', { poi: 'plaza_rosa', key: 'residential', keyName: 'Residential (Plaza Rossa)', tint: 'pink' }],
  [490, 714, 30, 16, 90, 2, 'h', { poi: 'plaza_rosa', tint: 'ochre' }],
  [463, 750, 30, 17, -30, 2, 'h', { poi: 'plaza_rosa' }],
  [494, 772, 32, 21, -35, 2, 'h', { tint: 'terracotta' }],
  [527, 740, 48, 20, 60, 2, 'h', { poi: 'plaza_rosa', tint: 'cream' }],
  [362, 740, 42, 26, -20, 2, 'h', { tint: 'ochre' }],
  [352, 770, 42, 24, 0, 2, 'h'],
  [396, 768, 56, 22, 75, 2, 'h', { tint: 'pink' }],
  [439, 792, 54, 28, -20, 2, 'h', { tint: 'cream' }],
  [463, 813, 34, 24, -30, 2, 'h', { sunk: 1 }],
  [376, 698, 52, 30, -15, 2, 'h', { tint: 'terracotta' }],
  [545, 684, 50, 24, -35, 3, 'h', { poi: 'red_tower', tint: 'pink' }],
  [522, 666, 12, 12, 0, 7, 'h', { name: 'Red Tower', poi: 'red_tower', wall: 'brick', tint: 'red', flat: true }],
  // ---- Grandioso Apartments / west lanes / Old Town
  [228, 598, 40, 37, 15, 5, 'a', { name: 'Grandioso Apartments', poi: 'grandioso_apartments', key: 'residential', keySeg: 0, keyName: 'Residential (Grandiosa)', tint: 'cream' }],
  [217, 648, 40, 38, 15, 5, 'a', { poi: 'grandioso_apartments', tint: 'cream' }],
  [239, 540, 68, 44, -25, 3, 'a', { tint: 'ochre' }],
  [243, 510, 26, 20, -25, 2, 'h'],
  [298, 607, 52, 32, 75, 2, 'h', { tint: 'pink' }],
  [328, 566, 36, 22, 80, 2, 'h'],
  [311, 683, 52, 38, -30, 2, 'h', { poi: 'old_town', tint: 'terracotta' }],
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
  [636, 653, 34, 29, -30, 2, 'h', { tint: 'cream' }],
  [762, 614, 15, 15, 0, 2, 'h', { sunk: 1 }],
  [716, 639, 19, 15, 0, 1, 'h', { sunk: 1 }],
  [632, 321, 58, 30, 62, 2, 'h', { sunk: 1, poi: 'buried_properties' }],
  [661, 371, 36, 22, -30, 2, 'h', { sunk: 1.5, poi: 'buried_properties' }],
  [681, 398, 40, 24, -30, 2, 'h', { sunk: 2, poi: 'buried_properties', tint: 'ochre' }],
  [714, 388, 25, 10, 70, 1, 'r', { sunk: 1.5 }],
  [749, 380, 28, 27, 0, 1, 'h', { sunk: 2.5, poi: 'buried_properties' }],
  [590, 418, 64, 24, -30, 2, 'h', { tint: 'pink' }],
  [613, 473, 44, 28, -30, 2, 'h', { poi: 'buried_properties' }],
  [734, 469, 74, 38, -25, 2, 'a', { sunk: 2, name: 'Buried Properties', poi: 'buried_properties', tint: 'cream' }],
  // ---- church ruins and the south-east lanes
  [714, 774, 38, 34, -30, 2, 'o', { name: 'Church Ruins', poi: 'church_ruins', ruin: 1 }],
  [733, 743, 48, 19, 60, 2, 'o', { poi: 'church_ruins', ruin: 1 }],
  [690, 762, 34, 20, -20, 2, 'o', { poi: 'church_ruins', ruin: 1 }],
  [657, 724, 9, 9, 0, 7, 'o', { name: 'Bell Tower', poi: 'church_ruins', flat: true, wall: 'plaster', tint: 'cream' }],
  [663, 787, 18, 17, 0, 1, 'r'],
  [692, 798, 19, 17, 0, 1, 'h', { sunk: 1 }],
  [583, 702, 38, 20, -30, 2, 'h', { tint: 'ochre' }],
  [613, 718, 34, 19, -30, 2, 'h'],
  [577, 745, 30, 19, -30, 2, 'h', { tint: 'pink' }],
  [613, 755, 35, 21, -30, 2, 'h'],
  [646, 739, 24, 15, -30, 2, 'h', { tint: 'cream' }],
  [598, 779, 26, 17, -30, 1, 'h', { sunk: 1 }],
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
  { pts: [[464, 800], [572, 796], [578, 920], [462, 916]], d: 2.0, k: 'olive' },
  { pts: [[560, 778], [640, 776], [644, 920], [560, 920]], d: 1.8, k: 'olive' },
  { pts: [[706, 846], [802, 846], [806, 900], [712, 900]], d: 1.6, k: 'olive' },
  { pts: [[330, 822], [424, 826], [426, 900], [330, 900]], d: 0.9, k: 'mix' },
  { pts: [[2, 300], [126, 300], [134, 336], [118, 560], [4, 562]], d: 1.5, k: 'olive' },
  { pts: [[20, 536], [124, 540], [128, 654], [24, 650]], d: 1.4, k: 'mix' },
  { pts: [[150, 704], [330, 700], [338, 900], [160, 900]], d: 0.6, k: 'mix' },
  { pts: [[380, 336], [452, 330], [472, 372], [470, 460], [394, 460], [378, 400]], d: 2.6, k: 'park' },
  { pts: [[292, 470], [324, 470], [324, 500], [294, 500]], d: 2.0, k: 'palm' },
  { pts: [[490, 570], [524, 572], [522, 612], [494, 608]], d: 2.2, k: 'palm' },
  { pts: [[810, 600], [900, 610], [900, 740], [820, 720]], d: 1.0, k: 'mix' },
  { pts: [[240, 40], [300, 36], [300, 90], [246, 96]], d: 0.8, k: 'mix' },
];

// Plaza / park / street polygons painted on the town floor
const PLAZAS = [
  { id: 'plaza_rosa', pts: [[424, 690], [474, 698], [506, 712], [500, 744], [470, 742], [448, 736], [424, 728]], tex: 'tiles' },
  { id: 'piazza_roma', pts: [[290, 448], [334, 452], [340, 462], [318, 482], [292, 480], [284, 466]], tex: 'tiles' },
  { id: 'piazza_arbusto', pts: [[596, 540], [660, 538], [672, 560], [640, 572], [600, 566]], tex: 'tiles' },
  { id: 'northern_square', pts: [[400, 286], [450, 290], [452, 318], [414, 336], [398, 318]], tex: 'tiles' },
  { id: 'town_hall_square', pts: [[420, 470], [500, 452], [520, 470], [452, 498], [418, 500]], tex: 'tiles' },
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
  h: { wall: 'plaster', roof: 'roofTile', gable: 0.85, floor: ['tiles', 'wood'], loot: 'res' },
  a: { wall: 'plaster', roof: 'roofTar', gable: 0.3, floor: ['tiles', 'wood'], loot: 'res' },
  s: { wall: 'plaster', roof: 'roofTar', gable: 0.2, floor: ['tiles'], loot: 'com' },
  c: { wall: 'plaster', roof: 'roofTile', gable: 0.6, floor: ['tiles'], loot: 'civ' },
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
const KEY_LOOT = { hospital: ['medical_bag', 'security_locker', 'medical_bag', 'safe'], town_hall: ['safe', 'desk', 'security_locker', 'weapon_case'],
  space_travel: ['electronics', 'safe', 'security_locker', 'weapon_case'], res: ['safe', 'cabinet', 'suitcase', 'weapon_case'] };

function pickW(rng, list) { let t = 0; for (const e of list) t += e[2]; let r = rng() * t; for (const e of list) { r -= e[2]; if (r <= 0) return e; } return list[list.length - 1]; }
const R2 = v => Math.round(v * 2) / 2;

// =====================================================================================================
// BUILDING COMPLEXES  (rotated rects → axis-aligned staircase segments → World buildings)
// =====================================================================================================
function decompose(cx, cz, L, Wd, ang) {
  let a = ((ang % 180) + 180) % 180; if (a > 90) a -= 180;
  const r = a * D2R, ux = Math.cos(r), uz = Math.sin(r);
  const tilt = Math.min(Math.abs(a), 90 - Math.abs(a)), t = tilt * D2R;
  const nearX = Math.abs(a) <= 45, drift = L * Math.sin(t);
  if (tilt < 12 || drift < 11 || L < 24) {
    const ax = L * Math.cos(t) + Wd * Math.sin(t), az = L * Math.sin(t) + Wd * Math.cos(t), k = Math.sqrt(L * Wd / (ax * az));
    const ex = (nearX ? ax : az) * k, ez = (nearX ? az : ax) * k;
    return [[R2(cx - ex / 2), R2(cz - ez / 2), R2(cx + ex / 2), R2(cz + ez / 2)]];
  }
  const cut = Wd / Math.cos(t), along = L * Math.cos(t);
  let n = clamp(Math.round(drift / 8), 2, 7);
  while (n > 2 && along / n < 7.5) n--;
  while (cut - drift / n < 4 && n < 9) n++;
  const out = [], start = (nearX ? cx : cz) - along / 2 * Math.sign(nearX ? ux : uz || 1);
  const dir = Math.sign(nearX ? ux : uz) || 1;
  for (let k = 0; k < n; k++) {
    const tm = -L / 2 + (k + 0.5) * L / n, px = cx + ux * tm, pz = cz + uz * tm;
    const b0 = R2(start + dir * k * along / n), b1 = R2(start + dir * (k + 1) * along / n);
    const lo = Math.min(b0, b1), hi = Math.max(b0, b1);
    if (nearX) out.push([lo, R2(pz - cut / 2), hi, R2(pz + cut / 2)]);
    else out.push([R2(px - cut / 2), lo, R2(px + cut / 2), hi]);
  }
  return out;
}

class Occ { // 1 m occupancy raster of building segments
  constructor() { this.a = new Int32Array(MW * MH).fill(-1); }
  mark(x0, z0, x1, z1, id) { for (let z = Math.max(0, Math.floor(z0)); z < Math.min(MH, Math.ceil(z1)); z++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(MW, Math.ceil(x1)); x++) this.a[z * MW + x] = id; }
  at(x, z) { if (x < 0 || z < 0 || x >= MW || z >= MH) return -2; return this.a[Math.floor(z) * MW + Math.floor(x)]; }
  free(x0, z0, x1, z1) { for (let z = Math.max(0, Math.floor(z0)); z < Math.min(MH, Math.ceil(z1)); z++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(MW, Math.ceil(x1)); x++) if (this.a[z * MW + x] >= 0) return false; return true; }
}

// recursive room split inside a segment (local coords 0..w, 0..d). Records walls [x0,z0,x1,z1,gaps].
function bsp(rng, x0, z0, x1, z1, minR, maxR, walls, rooms, bgaps, depth = 0) {
  const w = x1 - x0, d = z1 - z0;
  const canX = w >= 2 * minR, canZ = d >= 2 * minR;
  const small = w <= maxR && d <= maxR;
  if ((!canX && !canZ) || depth > 5 || (small && (depth > 0 ? rng() < 0.55 : rng() < 0.25))) { rooms.push([x0, z0, x1, z1]); return; }
  for (let tries = 0; tries < 6; tries++) {
    const splitX = canX && (!canZ || w > d * (0.75 + rng() * 0.5));
    const span = splitX ? w : d, p = R2((splitX ? x0 : z0) + span * (0.36 + rng() * 0.28));
    // don't run a wall into a door gap of the enclosing walls
    const bad = bgaps.some(g => g.axis !== (splitX ? 'x' : 'z') && (splitX ? (g.pos === z0 || g.pos === z1) : (g.pos === x0 || g.pos === x1)) && p > g.a - 0.9 && p < g.b + 0.9);
    if (bad) continue;
    const len = splitX ? d : w, gw = len > 8 && rng() < 0.3 ? 2.4 : 1.6;
    const gat = R2(clamp(len * (0.15 + rng() * 0.7) - gw / 2, 0.7, len - gw - 0.7));
    const gap = { at: gat, w: gw };
    if (splitX) {
      walls.push([p, z0, p, z1, [gap]]);
      const ng = bgaps.concat([{ axis: 'x', pos: p, a: z0 + gat, b: z0 + gat + gw }]);
      bsp(rng, x0, z0, p, z1, minR, maxR, walls, rooms, ng, depth + 1); bsp(rng, p, z0, x1, z1, minR, maxR, walls, rooms, ng, depth + 1);
    } else {
      walls.push([x0, p, x1, p, [gap]]);
      const ng = bgaps.concat([{ axis: 'z', pos: p, a: x0 + gat, b: x0 + gat + gw }]);
      bsp(rng, x0, z0, x1, p, minR, maxR, walls, rooms, ng, depth + 1); bsp(rng, x0, p, x1, z1, minR, maxR, walls, rooms, ng, depth + 1);
    }
    return;
  }
  rooms.push([x0, z0, x1, z1]);
}

function layoutComplexes(ctx) {
  const { occ } = ctx;
  ctx.cxs = []; ctx.segs = [];
  const placed = (ctx.obstacles || []).slice();
  B.forEach((b, bi) => {
    const [cx, cz, L, Wd, ang, storeys, kind, o = {}] = b;
    const C = { bi, cx, cz, L, Wd, ang, storeys, kind, o, segs: [] };
    for (const r of decompose(cx, cz, L, Wd, ang)) {
      const s = { x0: r[0], z0: r[1], x1: r[2], z1: r[3], C };
      // resolve conflicts with other complexes: push the new segment back until it only touches
      let ok = true;
      for (let it = 0; it < 3 && ok; it++) for (const T of placed) {
        if (T.C === C) continue;
        const ox = Math.min(s.x1, T.x1) - Math.max(s.x0, T.x0), oz = Math.min(s.z1, T.z1) - Math.max(s.z0, T.z0);
        if (ox <= -1.2 || oz <= -1.2) continue;
        if (ox <= 0 || oz <= 0) { // a sliver alley < 1.2 m: snap to touching
          if (ox <= 0 && ox > -1.2) { if (s.x0 >= T.x1 - 0.01) s.x0 = T.x1; else if (s.x1 <= T.x0 + 0.01) s.x1 = T.x0; }
          else if (oz <= 0 && oz > -1.2) { if (s.z0 >= T.z1 - 0.01) s.z0 = T.z1; else if (s.z1 <= T.z0 + 0.01) s.z1 = T.z0; }
          continue;
        }
        if (ox < oz) { if ((s.x0 + s.x1) < (T.x0 + T.x1)) s.x1 = T.x0; else s.x0 = T.x1; }
        else { if ((s.z0 + s.z1) < (T.z0 + T.z1)) s.z1 = T.z0; else s.z0 = T.z1; }
        if (s.x1 - s.x0 < 5 || s.z1 - s.z0 < 5) { ok = false; break; }
      }
      if (!ok) continue;
      s.id = ctx.segs.length; ctx.segs.push(s); C.segs.push(s); placed.push(s);
    }
    if (C.segs.length) ctx.cxs.push(C);
  });
  for (const s of ctx.segs) occ.mark(s.x0, s.z0, s.x1, s.z1, s.id);
}

// floor height for each complex from the shaped terrain (sunk buildings sit at the low corner)
function complexFloors(ctx) {
  const { w } = ctx;
  for (const C of ctx.cxs) {
    let sum = 0, n = 0, mn = 1e9;
    for (const s of C.segs) for (let i = 0; i <= 4; i++) for (let j = 0; j <= 4; j++) {
      const g = w.groundAt(lerp(s.x0, s.x1, i / 4), lerp(s.z0, s.z1, j / 4)); sum += g; n++; mn = Math.min(mn, g);
    }
    C.floorY = C.o.sunk ? mn + 0.15 : sum / n;
  }
}

function sideInfo(s, side) { // wall line of a segment side in world coords
  if (side === 'n') return { horiz: true, a: s.x0, b: s.x1, fixed: s.z0, out: -1 };
  if (side === 's') return { horiz: true, a: s.x0, b: s.x1, fixed: s.z1, out: 1 };
  if (side === 'w') return { horiz: false, a: s.z0, b: s.z1, fixed: s.x0, out: -1 };
  return { horiz: false, a: s.z0, b: s.z1, fixed: s.x1, out: 1 };
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
    const keyIdx = o.key ? (o.keySeg === -1 ? -1 : (o.keySeg ?? 0)) : null;
    C.rooms = [];
    C.segs.forEach((s, k) => {
      const W = s.x1 - s.x0, D = s.z1 - s.z0;
      const isKey = keyIdx != null && (keyIdx === -1 || keyIdx === k);
      const lockId = isKey ? o.key : null;
      const ruin = ruinAll || (o.ruin && rng() < o.ruin);
      // ---- rooms
      const walls = [], rooms = [], innerGaps = [];
      const minR = C.kind === 'i' || C.kind === 'p' ? 7 : 3.6, maxR = C.kind === 'i' || C.kind === 'p' ? 22 : C.kind === 'o' ? 16 : 9;
      if (!(C.kind === 'o' && k === 0) && !(o.name === 'Red Tower' || o.name === 'Bell Tower')) bsp(rng, 0, 0, W, D, minR, maxR, walls, rooms, []);
      else rooms.push([0, 0, W, D]);
      for (const [a, b, c, d, gl] of walls) for (const g of gl) innerGaps.push(a === c ? [s.x0 + a, s.z0 + b + g.at + g.w / 2] : [s.x0 + a + g.at + g.w / 2, s.z0 + b]);
      // inner wall ends on each side (to keep exterior openings clear of T-junctions)
      const ends = { n: [], s: [], w: [], e: [] };
      for (const [a, b, c, d] of walls) {
        if (a === c) { if (b <= 0.01) ends.n.push(s.x0 + a); if (d >= D - 0.01) ends.s.push(s.x0 + a); }
        else { if (a <= 0.01) ends.w.push(s.z0 + b); if (c >= W - 0.01) ends.e.push(s.z0 + b); }
      }
      // ---- openings
      const doors = [], gapsWorld = [];
      const addGap = (side, at, gw, extra = {}) => {
        const si = sideInfo(s, side);
        doors.push({ side, at: R2(at - si.a), w: gw, ...extra });
        const c = at + gw / 2;
        gapsWorld.push(si.horiz ? [c, si.fixed] : [si.fixed, c]);
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
          const tKey = keyIdx != null && (keyIdx === -1 || C.segs.indexOf(T) === keyIdx);
          const lock = isKey !== tKey ? o.key : null;
          const first = s.id < T.id;  // only one of the two coincident walls spawns the door entity
          addGap(side, at, gw, lock && first ? { door: true, locked: lock } : {});
        }
      }
      // exterior: exposed runs per side
      const runsBy = {};
      for (const side of ['s', 'n', 'e', 'w']) {
        const si = sideInfo(s, side), runs = []; let cur = null;
        for (let p = si.a + 0.75; p <= si.b - 0.75; p += 0.5) {
          const ox = si.horiz ? p : si.fixed + si.out * 1.1, oz = si.horiz ? si.fixed + si.out * 1.1 : p;
          const free = occ.at(ox, oz) === -1;
          const g = free ? w.groundAt(ox, oz) - C.floorY : 99;
          const nearEnd = ends[side].some(e => Math.abs(e - p) < 0.9) || gapsWorld.some(([gx, gz]) => Math.hypot(gx - (si.horiz ? p : si.fixed), gz - (si.horiz ? si.fixed : p)) < 2.2);
          const okDoor = free && Math.abs(g) < 0.9 && !nearEnd, okWin = free && g < 1.2 && !nearEnd;
          if (okWin) { if (!cur) { cur = { a: p, b: p, door: [] }; runs.push(cur); } cur.b = p; if (okDoor) cur.door.push(p); }
          else cur = null;
        }
        runsBy[side] = runs;
      }
      // choose doors: prefer south/street-facing runs with the most walkable frontage
      const cand = [];
      for (const side of ['s', 'n', 'e', 'w']) for (const r of runsBy[side]) if (r.door.length >= 5) cand.push({ side, r, score: r.door.length * (side === 's' ? 1.3 : 1) * (0.6 + rng() * 0.8) });
      cand.sort((a, b) => b.score - a.score);
      const perim = 2 * (W + D);
      const wantDoors = ruin ? 3 : C.segs.length > 1 ? (k === 0 || k === C.segs.length - 1 ? 1 : (rng() < 0.4 ? 1 : 0)) + (perim > 90 ? 1 : 0) : 1 + (perim > 50 ? 1 : 0) + (perim > 100 ? 1 : 0);
      const doorPos = [];
      let made = 0;
      for (const c of cand) {
        if (made >= wantDoors) break;
        const pts = c.r.door; const p = pts[Math.floor(pts.length * (0.3 + rng() * 0.4))];
        if (doorPos.some(([sd, q]) => sd === c.side && Math.abs(q - p) < 4)) continue;
        const gw = ruin ? 2 + rng() * 1.5 : (C.kind === 'i' || C.kind === 'p') && rng() < 0.6 ? 3.5 : C.kind === 'c' || C.kind === 's' ? 2.4 : 1.6;
        const real = !ruin && !lockId && rng() < 0.45;
        addGap(c.side, p - gw / 2, gw, lockId ? { door: true, locked: lockId } : real ? { door: true } : {});
        doorPos.push([c.side, p]); made++;
        const si = sideInfo(s, c.side);
        ctx.doorsOut.push(si.horiz ? [p, si.fixed + si.out * 1.5] : [si.fixed + si.out * 1.5, p]);
      }
      s.doorCount = made;
      // windows (sills) along exposed runs; ruins get ragged breaches instead
      for (const side of ['s', 'n', 'e', 'w']) for (const r of runsBy[side]) {
        const step = ruin ? 3.2 + rng() * 2 : C.kind === 'i' ? 7 : 3.6 + rng() * 0.8;
        for (let p = r.a + 1.2; p + 1.2 <= r.b; p += step) {
          if (doorPos.some(([sd, q]) => sd === side && Math.abs(q - p) < 2.6)) continue;
          if (gapsWorld.some(([gx, gz]) => { const si = sideInfo(s, side); return Math.hypot(gx - (si.horiz ? p : si.fixed), gz - (si.horiz ? si.fixed : p)) < 2; })) continue;
          const ww = ruin ? 1.6 + rng() * 1.6 : C.kind === 's' && side === 's' ? 2.2 : 1.3;
          const si = sideInfo(s, side);
          if (p - ww / 2 < si.a + 0.6 || p + ww / 2 > si.b - 0.6) continue;
          addGap(side, p - ww / 2, ww, { sill: ruin ? 0.4 + rng() * 0.6 : C.kind === 's' && side === 's' ? 0.7 : 1.0, top: ruin ? 9 : undefined });
        }
      }
      // ---- the building itself
      const tower = o.name === 'Red Tower' || o.name === 'Bell Tower';
      const storeys = ruin ? 1 : C.storeys;
      const h = ruin ? 2.2 + rng() * 1.6 : undefined;
      const flat = !gable;
      const extras = [];
      if (flat && !ruin) {
        const nEx = Math.floor(W * D / 70);
        for (let i = 0; i < nEx; i++) {
          const ex = 1 + rng() * Math.max(0.5, W - 4), ez = 1 + rng() * Math.max(0.5, D - 4), t = rng();
          if (t < 0.35) extras.push(Object.assign([ex, ez, ex + 1.3, ez + 1.3, 1.6], { tex: 'metalPanel' }));        // water tank
          else if (t < 0.6) extras.push(Object.assign([ex, ez, ex + 2.2, ez + 1.2, 0.25], { tex: 'metalPanel' }));  // solar panel
          else if (t < 0.8) extras.push(Object.assign([ex, ez, ex + 0.7, ez + 0.7, 1.4], { tex: 'brick' }));        // chimney
          else extras.push(Object.assign([ex, ez, ex + 1.6, ez + 1.0, 0.8], { tex: 'rust' }));                     // AC unit
        }
      }
      const bb = w.building({
        x: s.x0, z: s.z0, w: W, d: D, storeys, h, wall: o.wall || st.wall, floor: floorTex, roof: gable ? 'roofTile' : st.roof,
        roofShape: gable ? 'gable' : undefined, roofTint: gable ? roofTint : undefined, tint, thick: 0.3,
        doors, inner: walls, peek: ruin ? 0 : tower ? 0.85 : 0.72, name: k === 0 ? (o.name || null) : null,
        roofExtras: extras, floorY: C.floorY, blend: C.o.sunk ? 0.8 : 1.6, trim: 'damConcrete', innerH: 3.0,
        vents: flat && !ruin ? undefined : 0, parapet: !ruin, facade: !ruin,
      });
      s.bid = bb.id; s.ruin = ruin; s.isKey = isKey;
      if (isKey) ctx.keySegs.push({ id: o.key, name: o.keyName || o.name || o.key, s, C });
      // ---- facade dressing on the visible (south) face: upper-storey windows, shutters, balconies
      if (!ruin && storeys > 1) dressFacade(ctx, s, C, bb.id, storeys, runsBy.s, tintName);
      if (ruin) for (let i = 0; i < Math.max(1, Math.floor(W * D / 60)); i++) w.prop(rng() < 0.5 ? 'sc_rubble' : 'sc_rubble2', s.x0 + 1.5 + rng() * (W - 3), s.z0 + 1.5 + rng() * (D - 3), rng() * 6, { solid: true });
      // ---- rooms → furniture + loot
      for (const r of rooms) C.rooms.push({ x0: s.x0 + r[0], z0: s.z0 + r[1], x1: s.x0 + r[2], z1: s.z0 + r[3], seg: s, key: isKey ? o.key : null, ruin, gaps: gapsWorld.concat(innerGaps) });
    });
  }
}

const SHUTTER = { cream: 0x9ac0a0, ochre: 0x88b090, pink: 0xa8c8b0, terracotta: 0xd8c8a8, peach: 0x8ab09a, yellow: 0x7aa080, rose: 0xc0d0b8, sand: 0x90b8a0, white: 0x88a8c8, red: 0xd8c8a8 };
function dressFacade(ctx, s, C, bid, storeys, southRuns, tintName) {
  const { w, rng } = ctx;
  const W = s.x1 - s.x0, sh = 3.2, z = s.z1;
  const shutterTint = SHUTTER[tintName] || 0x9ac0a0;
  const opt = (y, extra = {}) => ({ onBuilding: bid, rel0: y, cutaway: true, collide: false, cast: false, ...extra });
  const balc = C.kind === 'a' || C.kind === 'h' ? rng() < 0.55 : false;
  for (let st = 1; st < storeys; st++) {
    const y = st * sh + 0.8;
    for (let x = s.x0 + 1.6; x <= s.x1 - 1.6; x += 3.2) {
      if (C.kind === 'i') continue;
      if (!ctx.occFreeSouth(s, x)) continue;
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
  const warp = fbm(N3, x, z, 95) * 70;
  const u = (x * 0.93 + z * 0.37 + warp) / 62, f = u - Math.floor(u);
  const crest = f < 0.7 ? f / 0.7 : (1 - f) / 0.3;                 // long windward slope, steep lee face
  const ridges = crest * crest * (2 + fbm(N4, x, z, 120) * 5.5);
  const north = Math.exp(-((z - 70) ** 2) / (2 * 60 * 60)) * sstep(100, 260, x) * (1 - sstep(780, 900, x)) * 7;
  return base + rim + ridges + north;
}
function shapeTerrain(ctx) {
  const { w } = ctx;
  const L = new Mask(3).poly(TOWN, 1);
  for (const f of FLATS) L.poly(f.pts, f.v);
  L.line(HIGHWAY, 30, 0.7); L.line(RAIL, 20, 0.7);
  L.blur(5, 2);
  ctx.low = L;
  w.heightFn((x, z) => townH(x, z) + duneH(x, z) * sstep(0.03, 0.97, 1 - L.at(x, z)), 'set');
}
// buried edge buildings: pile a dune against their windward (north-east) side
function sunkMounds(ctx) {
  const { w } = ctx;
  for (const C of ctx.cxs) {
    if (!C.o.sunk) continue;
    let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9;
    for (const s of C.segs) { x0 = Math.min(x0, s.x0); z0 = Math.min(z0, s.z0); x1 = Math.max(x1, s.x1); z1 = Math.max(z1, s.z1); }
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
    if (!occ.free(x - r * 0.6, z - r * 0.6, x + r * 0.6, z + r * 0.6)) continue;
    w.raiseCircle(x, z, r, 0.3 + rng() * 0.8, 0.85, 'add');
  }
  for (const s of ctx.segs) {
    if (rng() < 0.5) {
      const z = s.z0 - 2.8, ok = occ.free(s.x0, z - 2, s.x1, z + 1);
      if (ok) w.ridge([[s.x0 + 1, z], [s.x1 - 1, z]], 1.5, 0.5 + rng() * 0.7, 2.5, 'add');
    }
    if (rng() < 0.3) {
      const x = s.x0 - 2.8, ok = occ.free(x - 2, s.z0, x + 1, s.z1);
      if (ok) w.ridge([[x, s.z0 + 1], [x, s.z1 - 1]], 1.5, 0.4 + rng() * 0.6, 2.5, 'add');
    }
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
  const hw = width / 2, W1 = MW + 1, arr = new Float32Array(W1 * (MH + 1)).fill(NaN);
  const inGap = s => s < from || gaps.some(([a, b]) => s >= a && s <= b);
  let acc = 0;
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az);
    for (let z = Math.max(0, Math.floor(Math.min(az, bz) - hw - 1)); z <= Math.min(MH, Math.ceil(Math.max(az, bz) + hw + 1)); z++)
      for (let x = Math.max(0, Math.floor(Math.min(ax, bx) - hw - 1)); x <= Math.min(MW, Math.ceil(Math.max(ax, bx) + hw + 1)); x++) {
        const [d, t] = segDist(x, z, ax, az, bx, bz);
        if (d > hw || inGap(acc + t * L)) continue;
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
      if (across < hw - 0.5 || across > hw + r.len || Math.abs(along) > 7) continue;
      const k = 1 - (across - hw) / r.len, lat = 1 - sstep(3.5, 7, Math.abs(along));
      const h = r.y * k * lat + w.groundAt(x, z) * (1 - k * lat);
      if (h > w.groundAt(x, z)) best = Math.max(best ?? -1e9, h);
    }
    return best;
  }, 'set');
  D.R = R; D.inGap = inGap; D.arr = arr;
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
    for (const side of [1, -1]) {
      if (nearRamp(s, side)) continue;
      const nx = -tz * side, nz = tx * side;
      const hx = Math.abs(tx) * step / 2 + Math.abs(nx) * 0.35, hz = Math.abs(tz) * step / 2 + Math.abs(nz) * 0.35;
      const wx = px + nx * (hw + 0.35), wz = pz + nz * (hw + 0.35);
      const g = Math.min(w.groundAt(wx - hx, wz - hz), w.groundAt(wx + hx, wz + hz), w.groundAt(wx - hx, wz + hz), w.groundAt(wx + hx, wz - hz));
      if (y - g > 0.6) w.block(wx - hx, wz - hz, wx + hx, wz + hz, y - g + 0.5, wallTex, { y0: g - 0.5, xray: true });
      // parapet on the deck edge
      const rx = px + nx * (hw - 0.2), rz = pz + nz * (hw - 0.2);
      const qx = Math.abs(tx) * step / 2 + Math.abs(nx) * 0.18, qz = Math.abs(tz) * step / 2 + Math.abs(nz) * 0.18;
      if (rng() > 0.04) w.block(rx - qx, rz - qz, rx + qx, rz + qz, 0.95, rail, { y0: y - 0.05 });
      if (Math.round(s / step) % 6 === 0 && y - g > 1.5) {
        const ox = px + nx * (hw + 0.85), oz = pz + nz * (hw + 0.85), ex = Math.abs(tx) * 0.7 + Math.abs(nx) * 0.25, ez = Math.abs(tz) * 0.7 + Math.abs(nz) * 0.25;
        w.block(ox - ex, oz - ez, ox + ex, oz + ez, y - g + 0.2, pil, { y0: g - 0.5, xray: true });
      }
    }
  }
}
function brokenEnd(ctx, D, s, dir) {
  const { w, rng } = ctx;
  const [px, pz, tx, tz] = pointAt(D.pts, s), y = D.yAt(s), hw = D.width / 2;
  const ex = Math.abs(tz) * hw + Math.abs(tx) * 0.5, ez = Math.abs(tx) * hw + Math.abs(tz) * 0.5;
  const g = w.groundAt(px + tx * dir * 2.5, pz + tz * dir * 2.5);
  if (y - g > 0.8) w.block(px - ex, pz - ez, px + ex, pz + ez, y - g - 0.1, 'damConcrete', { y0: g - 0.5, xray: true });
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
      if (r.key) n = Math.max(n, 3);
      const placed = [];
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
        if (r.gaps.some(([gx, gz]) => Math.hypot(gx - x, gz - z) < hw + 1.6)) continue;
        if (placed.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < pr + hw + 0.5)) continue;
        if (kind) w.prop(kind, x, z, rot, { solid: true });
        placed.push([x, z, hw]);
        i++;
        const ck = keyLoot ? keyLoot[i % keyLoot.length] : e[1];
        if (!ck) continue;
        if (!keyLoot && rng() < ctx.lootSkip) continue;
        // container beside the furniture (or in its place)
        const off = kind ? hw + 0.55 : 0, sx = side < 2 ? 1 : 0, sz = side < 2 ? 0 : 1;
        const cx = x + sx * off * (rng() < 0.5 ? 1 : -1), cz = z + sz * off * (rng() < 0.5 ? 1 : -1);
        if (cx < r.x0 + 0.5 || cx > r.x1 - 0.5 || cz < r.z0 + 0.5 || cz > r.z1 - 0.5) continue;
        const tier = r.key ? 3 : C.o.poi ? (rng() < 0.2 ? 3 : 2) : (rng() < 0.18 ? 2 : 1);
        w.container(ck, cx, cz, rot, { tier, room: r.key || null });
        ctx.nCont++;
      }
      // interior light for named places (night raids)
      if (!r.ruin && (r.key || (C.o.poi && rng() < 0.22)) && area > 12) w.lamp((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, { y: 2.6, color: r.key ? 0xffd890 : 0xffe0b0, intensity: 0.9, range: 8, flicker: rng() < 0.3 ? 0.4 : 0, model: null });
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
    if (l > 0.8) {
      if (drift > 0.62 - (1 - l) * 0.9) return drift > 0.67 ? 'sand' : 'sandDark';
      const pv = N3(x / 11, z / 11);
      return pv > 0.64 ? 'tiles' : pv < 0.3 ? 'gravel' : 'concrete';
    }
    if (l > 0.5) return drift > 0.42 ? 'sand' : (N1(x / 5, z / 5) > 0.62 ? 'gravel' : 'sandDark');
    return N3(x / 40, z / 40) > 0.74 ? 'sandDark' : null;
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
    if (D.inGap(s)) { flush(); continue; }
    const p = pointAt(D.pts, s); run.push([p[0], p[1]]);
  }
  flush();
}

// obstacles that buildings must keep clear of (deck corridors, spiral ramp, station platforms)
function addObstacles(ctx) {
  const obs = [];
  const corridor = (pts, half, from = 0) => {
    const total = polyLen(pts);
    for (let s = from; s < total; s += 6) {
      const [x, z, tx, tz] = pointAt(pts, Math.min(total, s + 3));
      const hx = Math.abs(tx) * 3.5 + Math.abs(tz) * half, hz = Math.abs(tz) * 3.5 + Math.abs(tx) * half;
      obs.push({ x0: x - hx, z0: z - hz, x1: x + hx, z1: z + hz, C: null });
    }
  };
  corridor(HIGHWAY, HW_W / 2 + 2.5);
  corridor(RAIL, 6, RAIL_VIADUCT_FROM - 10);
  obs.push({ x0: 484, z0: 287, x1: 510, z1: 313, C: null });           // parking garage spiral ramp
  obs.push({ x0: 236, z0: 236, x1: 255, z1: 352, C: null });           // station platform + tracks
  ctx.obstacles = obs;
}
function canopy(ctx, x, z, wd, dp, h, opts = {}) {
  // open-sided roof on corner posts (fades like any roof when you step under it)
  const g = { lintel: false };
  return ctx.w.building({ x, z, w: wd, d: dp, h, wall: opts.wall || 'concrete', floor: opts.floor || false, roof: opts.roof || 'metalPanel', roofTint: opts.roofTint,
    tint: opts.tint, thick: 0.45, parapet: opts.parapet ?? false, facade: false, vents: 0, name: opts.name || null, peek: opts.peek ?? 0.8, blend: 1,
    doors: [{ side: 'n', at: 0.6, w: wd - 1.2, ...g }, { side: 's', at: 0.6, w: wd - 1.2, ...g }, { side: 'w', at: 0.6, w: dp - 1.2, ...g }, { side: 'e', at: 0.6, w: dp - 1.2, ...g }] });
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
function ring(ctx, cx, cz, r, n, fn) { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; fn(cx + Math.cos(a) * r, cz + Math.sin(a) * r, a, i); } }
function metroStation(ctx, id, name, x, z, rot = 0) {
  const { w } = ctx; [x, z] = freeSpot(ctx, x, z, 3);
  w.paint('concrete', x - 4, z - 5, x + 4, z + 5);
  w.prop('sc_metro', x, z, rot, {});
  w.extract(id, name, x, z, { kind: 'metro' });
  w.lamp(x + 2.2, z - 2.6, { y: 3.2, color: 0xfff0d0, intensity: 1.3, range: 10, model: null });
  w.lamp(x - 3.2, z + 3.4, { y: 2.6, color: 0x80ffb0, intensity: 0.9, range: 7, model: 'sc_lamppost' });
  return [x, z];
}
function hatch(ctx, id, name, x, z) {
  const { w } = ctx; [x, z] = freeSpot(ctx, x, z, 2);
  w.paint('metalPanel', x - 1.5, z - 1.5, x + 1.5, z + 1.5);
  w.prop('hatch', x, z, 0, {});
  w.extract(id, name, x, z, { kind: 'hatch', needsKey: 'raider_hatch_key' });
  w.lamp(x + 1.6, z - 1.2, { y: 1.2, color: 0xffc040, intensity: 0.8, range: 6, flicker: 0.2, model: null });
  w.prop('sandbag', x, z - 2.4, 0, { solid: true }); w.prop('sandbag', x + 2.4, z, Math.PI / 2, { solid: true });
  return [x, z];
}
function fountainPlaza(ctx, x, z, opts = {}) {
  const { w, rng } = ctx; [x, z] = freeSpot(ctx, x, z, 4);
  w.paintCircle('tiles', x, z, 6.5, 0.05, 3);
  w.prop('sc_fountain', x, z, 0, { solid: true });
  ring(ctx, x, z, 7.2, 4, (px, pz, a) => w.prop('sc_bench', px, pz, -a + Math.PI / 2, { solid: true }));
  ring(ctx, x, z, 9, 6, (px, pz, a, i) => { if (i % 2 === 0) w.prop(i % 4 ? 'sc_palm' : 'sc_palm3', px, pz, rng() * 6, { solid: true }); else w.prop('sc_planter', px, pz, 0, { solid: true }); });
  if (opts.lamps !== false) ring(ctx, x, z, 11, 4, (px, pz) => w.lamp(px, pz, { y: 2.4, model: 'sc_lamppost', intensity: 1.1, range: 9 }));
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
  w.paint('concrete', 420, 68, 458, 104); w.paint('asphalt', 424, 72, 452, 100);
  canopy(ctx, 425, 76, 22, 12, 4.6, { name: 'Gas Station', roof: 'metalPanel', wall: 'plaster', tint: TINT.cream });
  for (let i = 0; i < 4; i++) w.prop('sc_pump', 429 + i * 4.6, 82, 0, { solid: true });
  w.prop('sc_fiat3', 433, 86, 1.4, { solid: true }); w.container('car_trunk', 434.6, 86, 0, { tier: 1 });
  w.prop('sc_carroof', 452, 74, 0.3, { solid: true }); w.prop('sc_sign', 420, 70, 0, { solid: true, scale: 1.6 });
  w.prop('barrel', 456, 92, 0, { solid: true }); w.prop('barrel', 457, 93.4, 0, { solid: true }); w.prop('barrelBlue', 455.6, 94, 0, { solid: true });
  w.container('toolbox', 454, 90, 0, { tier: 1 }); w.container('trash', 422, 98, 0);
  w.lamp(424, 78, { y: 4.2, color: 0xfff4e0, intensity: 1.2, range: 12, model: null, flicker: 0.3 });
  w.lamp(446, 78, { y: 4.2, color: 0xfff4e0, intensity: 1.2, range: 12, model: null });
  // ---------------- Su Durante Warehouses yard
  w.paint('concrete', 282, 140, 336, 176);
  for (let i = 0; i < 5; i++) w.prop(i % 2 ? 'sc_container' : 'sc_container2', 286 + i * 3.2, 172, 0.05 * (i - 2), { solid: true });
  w.prop('sc_container', 330, 146, Math.PI / 2, { solid: true });
  for (let i = 0; i < 8; i++) { const [x, z] = freeSpot(ctx, 290 + rng() * 40, 140 + rng() * 30, 1); w.prop(rng() < 0.5 ? 'sc_cratestack' : 'crate', x, z, rng() * 6, { solid: true }); if (i % 2) w.container(rng() < 0.5 ? 'crate' : 'toolbox', x + 1.2, z, 0, { tier: 2 }); }
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
  w.lamp(530, 205, { y: 2.4, model: 'sc_lamppost', intensity: 1.0, range: 10, flicker: 0.4 });
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
  ctx.metro.northern = metroStation(ctx, 'northern_station', 'Northern Station', 425, 303, Math.PI / 2);
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
  ctx.metro.western = metroStation(ctx, 'western_station', 'Western Station', 310, 477, 0);
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
  ctx.metro.eastern = metroStation(ctx, 'eastern_station', 'Eastern Station', 551, 613, 0);
  // ---------------- Plaza Rosa + Southern Station
  w.paintPoly('tiles', PLAZAS[0].pts);
  ctx.rosa = fountainPlaza(ctx, 462, 716);
  cafe(ctx, 478, 704, 6); cafe(ctx, 436, 700, 4);
  ctx.metro.southern = metroStation(ctx, 'southern_station', 'Southern Station', 451, 737, 0);
  // ---------------- Church Ruins: pews, altar, columns, bell tower bell, cypress avenue
  const nave = ctx.cxs.find(C => C.o.name === 'Church Ruins');
  if (nave) {
    const s = nave.segs[0], cx = (s.x0 + s.x1) / 2;
    for (let r = 0; r < 5; r++) { w.prop('sc_pew', cx - 3.2, s.z0 + 5 + r * 2.6, Math.PI, { solid: true }); w.prop('sc_pew', cx + 3.2, s.z0 + 5 + r * 2.6, Math.PI, { solid: true }); }
    w.prop('sc_altar', cx, s.z0 + 2.2, 0, { solid: true }); w.container('safe', cx + 2.6, s.z0 + 1.6, 0, { tier: 3 });
    w.container('cabinet', s.x0 + 1.2, s.z0 + 2, Math.PI / 2, { tier: 2 }); w.container('basket', s.x1 - 1.2, s.z1 - 2, -Math.PI / 2, { tier: 2 });
    for (let i = 0; i < 4; i++) { w.prop('sc_column', s.x0 + 2.4, s.z0 + 4 + i * 5, 0, { solid: true }); w.prop(i === 2 ? 'sc_column_fallen' : 'sc_column', s.x1 - 2.4, s.z0 + 4 + i * 5, 1.2, { solid: true }); }
    w.lamp(cx, s.z0 + 3, { y: 1.4, color: 0xffb060, intensity: 0.8, range: 6, flicker: 0.5, model: null });
  }
  const tower = ctx.cxs.find(C => C.o.name === 'Bell Tower');
  if (tower) { const s = tower.segs[0]; w.prop('sc_bell', (s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2, 0, { y: tower.storeys * 3.2 + 0.3 + (tower.floorY - w.groundAt((s.x0 + s.x1) / 2, (s.z0 + s.z1) / 2)) }); }
  for (let i = 0; i < 8; i++) w.prop('sc_cypress', ...freeSpot(ctx, 662 + i * 5, 738 + i * 0.5, 1), 0, { solid: true });
  for (let i = 0; i < 12; i++) w.prop(rng() < 0.5 ? 'sc_column' : 'sc_vase', ...freeSpot(ctx, 640 + rng() * 60, 770 + rng() * 40, 1), rng() * 6, { solid: true });
  // ---------------- Old Town / Grandioso: laundry between the blocks, parked cars
  for (let i = 0; i < 6; i++) w.prop(i % 2 ? 'sc_laundry' : 'sc_laundry2', ...freeSpot(ctx, 214 + rng() * 30, 616 + rng() * 10, 1), Math.PI * 0.08, {});
  for (let i = 0; i < 4; i++) { const [x, z] = freeSpot(ctx, 252 + i * 3, 600 + i * 9, 1.6); w.prop(['sc_fiat', 'sc_fiat2', 'sc_fiat3', 'sc_fiat4'][i], x, z, 0.3, { solid: true }); w.container('car_trunk', x, z + 2.1, 0, { tier: 1 }); }
  // ---------------- Marano Station: platform canopy, wagons, benches, sign
  canopy(ctx, 237, 252, 15, 92, 4.2, { name: 'Marano Station Platform', roof: 'corrugated', wall: 'rust', peek: 0.75 });
  w.paint('concrete', 237, 252, 241, 344);
  for (let i = 0; i < 5; i++) w.prop('sc_bench', 238.6, 262 + i * 16, Math.PI / 2, { solid: true });
  w.prop('sc_wagon', 246, 300, 0, { solid: true }); w.prop('sc_wagon', 246, 323, 0.02, { solid: true });
  for (let i = 0; i < 6; i++) w.lamp(239, 258 + i * 16, { y: 3.6, color: 0xffe0b0, intensity: 1.0, range: 9, model: null, flicker: i === 3 ? 0.6 : 0 });
  w.prop('sc_streetsign', 230, 250, 0, { solid: true });
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
    if (t < 0.55) { w.prop(['sc_fiat', 'sc_fiat2', 'sc_fiat3', 'sc_fiat4'][Math.floor(rng() * 4)], px, pz, rot, { solid: true }); if (rng() < 0.55) w.container('car_trunk', px + tx * 2, pz + tz * 2, rot, { tier: 1 }); }
    else if (t < 0.62) w.prop('sc_bus', px, pz, rot, { solid: true });
    else if (t < 0.8) w.prop('sc_barrier', px, pz, Math.atan2(tz, -tx) + (rng() - 0.5), { solid: true });
    else if (t < 0.9) { w.prop('husk', px, pz, rng() * 6, { solid: true }); w.container('arc_husk', px + 1.6, pz, 0, { tier: 2 }); }
    else w.prop('sc_rubble', px, pz, rng() * 6, { solid: true });
  }
  for (let s = 10; s < HW.total; s += 26) {
    if (HW.inGap(s)) continue;
    const [x, z, tx, tz] = pointAt(HW.pts, s);
    w.paintCircle('sand', x + (rng() - 0.5) * 6, z + (rng() - 0.5) * 6, 2 + rng() * 3.5, 0.5, s);
    if (rng() < 0.5) w.lamp(x - tz * (HW.width / 2 - 0.6), z + tx * (HW.width / 2 - 0.6), { y: 2.4, model: 'sc_lamppost', intensity: 1.0, range: 9, flicker: rng() < 0.3 ? 0.5 : 0 });
  }
  // ---------------- rail line: sleepers + rails on the yard and viaduct
  for (let s = 0; s < RL.total; s += 4) {
    const [x, z, tx, tz] = pointAt(RL.pts, s);
    if (s > 242 && s < 340) continue;            // under the platform canopy the wagons sit on painted track
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
    for (const [k, wgt] of ks) w.scatter(k, g.pts, Math.round(n * wgt / tot), { solid: true, seed: 1000 + gi * 17 + k.length, avoid, scaleVar: 0.35 });
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

function streetClutter(ctx) {
  const { w, rng } = ctx;
  // shop fronts: awnings, planters, parked scooters along exposed south/north walls
  for (const s of ctx.segs) {
    if (s.ruin || s.C.kind === 'i' || s.C.kind === 'p' || s.C.kind === 'm' || s.C.kind === 't') continue;
    const shop = s.C.kind === 's' || (s.C.o.poi && rng() < 0.6) || rng() < 0.22;
    for (const [side, z, rot] of [['s', s.z1, 0], ['n', s.z0, Math.PI]]) {
      const out = side === 's' ? 1 : -1;
      for (let x = s.x0 + 2.2; x < s.x1 - 2.2; x += 3.6 + rng() * 3) {
        const oz = z + out * 1.2;
        if (ctx.occ.at(x, oz) !== -1 || ctx.onDeck(x, oz)) continue;
        if (Math.abs(w.groundAt(x, oz) - s.C.floorY) > 0.8) continue;
        const t = rng();
        if (shop && t < 0.4) w.prop(['sc_awning', 'sc_awning2', 'sc_awning3'][Math.floor(rng() * 3)], x, z + out * 0.16, rot, { y: s.C.floorY - w.groundAt(x, z + out * 0.5) });
        else if (t < 0.52) w.prop(rng() < 0.5 ? 'sc_planter' : 'sc_planter2', x, z + out * 0.7, 0, { solid: true });
        else if (t < 0.56 && !ctx.nearDoor(x, z + out * 1.2, 2)) w.prop(rng() < 0.5 ? 'sc_vespa' : 'sc_vespa2', x, z + out * 1.1, Math.PI / 2 + (rng() - 0.5) * 0.3, { solid: true });
        else if (t < 0.6 && !ctx.nearDoor(x, z + out * 1.2, 2)) { w.prop('barrel', x, z + out * 0.7, 0, { solid: true }); }
        else if (t < 0.63) w.prop('sc_laundry', x, z + out * 1.6, 0, {});
      }
    }
  }
  // parked / abandoned cars, debris, signs and street lamps in the open lanes
  const lanes = (x, z, r) => ctx.low.at(x, z) > 0.72 && !ctx.blocked(x, z, r);
  let cars = 0, lamps = 0, deb = 0, signs = 0, husks = 0, trash = 0;
  for (let i = 0; i < 9000; i++) {
    const x = 180 + rng() * 640, z = 80 + rng() * 760, t = rng();
    if (t < 0.12 && cars < 70 && lanes(x, z, 2.4)) {
      const sunk = ctx.low.at(x, z) < 0.86;
      const rot = rng() * 6.283, k = sunk ? (rng() < 0.5 ? 'sc_carroof' : 'sc_carroof2') : ['sc_fiat', 'sc_fiat2', 'sc_fiat3', 'sc_fiat4'][Math.floor(rng() * 4)];
      w.prop(k, x, z, rot, { solid: true }); if (rng() < 0.5) w.container('car_trunk', x + Math.sin(rot) * 2.2, z + Math.cos(rot) * 2.2, rot, { tier: 1 });
      cars++;
    } else if (t < 0.3 && lamps < 150 && lanes(x, z, 1.2)) {
      w.lamp(x, z, { y: 2.4, model: 'sc_lamppost', intensity: 0.95, range: 9, color: 0xffd8a0, flicker: rng() < 0.15 ? 0.6 : 0 }); lamps++;
    } else if (t < 0.6 && deb < 700 && lanes(x, z, 0.8)) {
      const k = rng(); w.prop(k < 0.45 ? 'debris' : k < 0.7 ? 'sc_rubble' : k < 0.8 ? 'sc_rubble2' : k < 0.9 ? 'sc_slab' : 'crate', x, z, rng() * 6, { solid: k > 0.45 }); deb++;
    } else if (t < 0.66 && signs < 40 && lanes(x, z, 1)) {
      w.prop(rng() < 0.5 ? 'sc_sign' : 'sc_streetsign', x, z, rng() * 6, { solid: true }); signs++;
    } else if (t < 0.7 && husks < 26 && lanes(x, z, 2)) {
      w.prop('husk', x, z, rng() * 6, { solid: true }); w.container('arc_husk', x + 1.6, z + 0.4, 0, { tier: 2 }); husks++;
    } else if (t < 0.78 && trash < 70 && lanes(x, z, 1)) {
      w.container('trash', x, z, rng() * 6, { tier: 1 }); trash++;
    }
  }
  // husks + buried cars out in the dunes, ARK crates
  for (let i = 0, n = 0; i < 3000 && n < 46; i++) {
    const x = 20 + rng() * 860, z = 20 + rng() * 860;
    if (ctx.low.at(x, z) > 0.5 || ctx.blocked(x, z, 2)) continue;
    const t = rng();
    if (t < 0.35) { w.prop('husk', x, z, rng() * 6, { solid: true }); w.container('arc_husk', x + 1.6, z, 0, { tier: 2 }); }
    else if (t < 0.6) w.prop(rng() < 0.5 ? 'sc_carroof' : 'sc_carroof2', x, z, rng() * 6, { solid: true });
    else if (t < 0.75) { w.prop('arcCrate', x, z, rng() * 6, { solid: true }); w.container('arc_crate', x + 1.1, z, 0, { tier: 2 }); }
    else w.prop('sc_lamppost', x, z, 0, { solid: true, y: -1.2 });
    n++;
  }
  // buried houses: roofs and attic windows poking from the sand
  for (const [cx, cz, W, D, ax, show] of BURIED) {
    if (!ctx.occ.free(cx - W / 2, cz - D / 2, cx + W / 2, cz + D / 2)) continue;
    const g = Math.min(w.groundAt(cx - W / 2, cz - D / 2), w.groundAt(cx + W / 2, cz + D / 2), w.groundAt(cx - W / 2, cz + D / 2), w.groundAt(cx + W / 2, cz - D / 2));
    const top = g + show, tint = TINT[TINT_CYCLE[Math.floor(rng() * TINT_CYCLE.length)]];
    w.block(cx - W / 2, cz - D / 2, cx + W / 2, cz + D / 2, show + 2.5, 'plaster', { y0: g - 2.5, tint });
    const steps = Math.floor((ax === 'x' ? D : W) / 1.8);
    for (let k = 0; k < steps; k++) {
      const ins = k * 0.9;
      if (ax === 'x') w.block(cx - W / 2 - 0.3, cz - D / 2 + ins - 0.3, cx + W / 2 + 0.3, cz + D / 2 - ins + 0.3, 0.45, 'roofTile', { y0: top + k * 0.45, tint: ROOF_TINTS[k % 3] === 0xffffff ? 0xffffff : 0xf4dcc8 });
      else w.block(cx - W / 2 + ins - 0.3, cz - D / 2 - 0.3, cx + W / 2 - ins + 0.3, cz + D / 2 + 0.3, 0.45, 'roofTile', { y0: top + k * 0.45 });
    }
    w.block(cx - 0.6, cz + D / 2 - 0.05, cx + 0.6, cz + D / 2 + 0.1, 1.0, 'roofTar', { y0: top - 1.1, collide: false });
    if (rng() < 0.5) w.container(rng() < 0.5 ? 'cabinet' : 'suitcase', cx, cz + D / 2 + 1.2, Math.PI, { tier: 2 });
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
  ['hospital', 'Hospital', 452, 240, 50, 3, 'Hospital'],
  ['dunes_ende', "Dune's Ende", 590, 226, 44, 2, "Dune's End"],
  ['library', 'Library', 366, 308, 46, 2, 'Library'],
  ['parking_garage', 'Parking Garage', 488, 330, 36, 2, 'Parking Garage'],
  ['galeria', 'Galeria', 568, 318, 56, 2, 'Galleria'],
  ['research', 'Research', 500, 398, 34, 3, 'Research'],
  ['space_travel', 'Space Travel', 533, 378, 34, 3, 'Space Travel'],
  ['marena_station', 'Marena Station', 236, 300, 50, 2, 'Marano Station'],
  ['warehouse', 'Warehouse', 104, 382, 50, 2, 'Warehouse'],
  ['marena_park', 'Marena Park', 424, 402, 42, 1, 'Marano Park'],
  ['piazza_rome', 'Piazza Rome', 308, 458, 32, 2, 'Piazza Roma'],
  ['burried_properties', 'Burried Properties', 690, 440, 70, 2, 'Buried Properties'],
  ['town_hall', 'Town Hall', 482, 512, 56, 3, 'Town Hall'],
  ['piazza_arbusta', 'Piazza Arbusta', 628, 556, 36, 2, 'Piazza Arbusto'],
  ['corso_da_vinchi', 'Corso da Vinchi', 420, 566, 40, 1, 'Corso da Vinci'],
  ['santa_mara_houses', 'Santa Mara Houses', 476, 604, 48, 2, 'Santa Maria Houses'],
  ['grandiosa_apartments', 'Grandiosa Apartments', 224, 622, 44, 2, 'Grandioso Apartments'],
  ['main_street', 'Main Street', 430, 670, 46, 1, 'Main Street'],
  ['abandoned_highway_camp', 'Abandoned Highway Camp', 236, 704, 36, 2, 'Abandoned Highway Camp'],
  ['red_tower', 'Red Tower', 536, 680, 30, 2, 'Red Tower'],
  ['plaza_rossa', 'Plaza Rossa', 458, 722, 40, 2, 'Plaza Rosa'],
  ['church_ruins', 'Church Ruins', 705, 765, 46, 2, 'Church Ruins'],
  ['maintenance_depot', 'Maintenance Depot', 108, 640, 36, 1, 'Maintenance Depot'],
  ['old_town', 'Old Town', 304, 668, 30, 1, 'Old Town'],
];

function markers(ctx) {
  const { w, rng } = ctx;
  for (const [id, name, x, z, r, tier, orig] of POIS) {
    const al = orig.toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    w.poi(id, name, x, z, r, { tier, aliases: al === id ? [] : [al] });
  }
  // key rooms (one entry per locked id; staircase complexes list their segment rects)
  const byId = new Map();
  for (const k of ctx.keySegs) {
    const key = k.id + '|' + k.C.bi;
    if (!byId.has(key)) byId.set(key, { id: k.id, name: k.name, rects: [] });
    byId.get(key).rects.push([k.s.x0, k.s.z0, k.s.x1, k.s.z1]);
  }
  for (const e of byId.values()) {
    const [x0, z0, x1, z1] = e.rects.reduce((a, r) => [Math.min(a[0], r[0]), Math.min(a[1], r[1]), Math.max(a[2], r[2]), Math.max(a[3], r[3])], [1e9, 1e9, -1e9, -1e9]);
    w.keyRoom(e.id, x0, z0, x1, z1, null, { name: e.name, rects: e.rects });
  }
  // raider hatches (reference positions)
  hatch(ctx, 'collapsed_supermarket_hatch', 'Collapsed Supermarket Hatch', 478, 172);
  hatch(ctx, 'train_station_hatch', 'Train Station Hatch', 252, 344);
  hatch(ctx, 'highway_overpass_hatch', 'Highway Overpass Hatch', 524, 516);
  hatch(ctx, 'old_town_hatch', 'Old Town Hatch', 306, 658);
  for (const [x, z] of SPAWNS) { const [px, pz] = freeSpot(ctx, x, z, 1.5, 12); w.spawnPoint(px, pz); }

  // ---------------------------------------------------------------- ARK
  const roofY = name => { const C = ctx.cxs.find(c => c.o.name === name); return C ? { y: C.floorY + C.storeys * 3.2 + 0.3, roof: true } : {}; };
  const roofOf = (name, fx = 0.5, fz = 0.5) => { const C = ctx.cxs.find(c => c.o.name === name); if (!C) return null; const s = C.segs[Math.floor(C.segs.length / 2)]; return [lerp(s.x0, s.x1, fx), lerp(s.z0, s.z1, fz), { y: C.floorY + C.storeys * 3.2 + 0.3, roof: true }]; };
  // sentinels on rooftops / towers (reference icons at Town Hall + the overpass, plus towers)
  w.arkSpawn('sentinel', 478, 497, { ...roofY('Town Hall') });
  w.arkSpawn('sentinel', 546, 546, { y: ctx.HW.yAt(polyDist(546, 546, HIGHWAY)[1]) + 0.2 });
  for (const n of ['Red Tower', 'Bell Tower', 'Hospital', 'Galleria', 'Grandioso Apartments', 'Library', "Dune's End Block"]) { const r = roofOf(n); if (r) w.arkSpawn('sentinel', r[0], r[1], r[2]); }
  for (const n of ['Research', 'Space Travel', 'Warehouse', 'Marano Station']) { const r = roofOf(n, 0.3, 0.6); if (r) w.arkSpawn('turret', r[0], r[1], r[2]); }
  { const [x, z] = pointAt(HIGHWAY, 735); w.arkSpawn('turret', x, z, { y: ctx.HW.yAt(735) }); }
  // drones patrolling the plazas and streets
  const loops = [
    ['wasp', 462, 716, [[440, 700], [486, 704], [494, 740], [448, 746]]], ['wasp', 306, 458, [[290, 446], [330, 446], [334, 482], [292, 486]]],
    ['wasp', 424, 400, [[392, 352], [460, 360], [462, 444], [396, 444]]], ['wasp', 628, 556, [[596, 540], [668, 540], [664, 576], [600, 576]]],
    ['wasp', 528, 206, [[500, 190], [560, 186], [556, 226], [504, 226]]], ['wasp', 452, 240, [[420, 200], [480, 230], [492, 286], [430, 262]]],
    ['wasp', 568, 318, [[530, 262], [600, 300], [610, 370], [546, 340]]], ['wasp', 236, 300, [[226, 250], [262, 260], [258, 350], [216, 344]]],
    ['wasp', 104, 382, [[64, 340], [170, 344], [166, 430], [70, 432]]], ['wasp', 590, 226, [[560, 180], [630, 210], [620, 270], [570, 250]]],
    ['wasp', 690, 440, [[640, 400], [760, 400], [760, 490], [640, 486]]], ['wasp', 224, 622, [[196, 580], [256, 590], [250, 676], [190, 664]]],
    ['wasp', 705, 765, [[660, 730], [750, 730], [752, 800], [660, 800]]], ['wasp', 306, 138, [[278, 110], [340, 100], [336, 176], [282, 176]]],
    ['wasp', 438, 86, [[410, 64], [470, 70], [466, 110], [414, 110]]], ['wasp', 536, 680, [[506, 656], [570, 664], [566, 704], [510, 700]]],
  ];
  for (const [k, x, z, p] of loops) w.arkSpawn(k, x, z, { count: 2, radius: 8, patrol: p });
  const hornets = [[482, 512, [[430, 480], [540, 470], [550, 520], [440, 548]]], [568, 318, [[540, 270], [610, 360]]], [533, 378, [[500, 350], [560, 400], [520, 430]]],
    [452, 240, [[420, 205], [490, 285]]], [705, 765, [[670, 740], [740, 790]]], [420, 566, [[330, 598], [455, 556], [570, 538], [455, 556]]]];
  for (const [x, z, p] of hornets) w.arkSpawn('hornet', x, z, { count: 1, radius: 6, patrol: p });
  w.arkSpawn('rocketeer', 700, 549, { count: 1, radius: 10, patrol: [[640, 545], [800, 558], [880, 568]] });
  w.arkSpawn('rocketeer', 220, 740, { count: 1, radius: 10, patrol: [[272, 655], [204, 768], [160, 860]] });
  w.arkSpawn('rocketeer', 640, 120, { count: 1, radius: 14, patrol: [[600, 80], [760, 90], [700, 160]] });
  w.arkSpawn('rocketeer', 500, 860, { count: 1, radius: 14, patrol: [[400, 860], [600, 870], [520, 820]] });
  // ground ARK in the lanes and inside buildings
  const roomPick = (pred) => { const rs = ctx.cxs.filter(pred).flatMap(C => C.rooms).filter(r => !r.ruin && (r.x1 - r.x0) * (r.z1 - r.z0) > 20); return rs[Math.floor(rng() * rs.length)]; };
  for (let i = 0; i < 16; i++) { const r = roomPick(C => C.o.poi); if (r) w.arkSpawn('tick', (r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2, { count: 2 + (i % 2), radius: 3 }); }
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

  // ---------------------------------------------------------------- loot zones
  w.zone('Dunes', [[0, 0], [MW, 0], [MW, MH], [0, MH]], { tier: 1 });
  w.zone('Old Town', TOWN, { tier: 2 });
  w.zone('Hospital', [[404, 186], [446, 176], [500, 286], [462, 300]], { tier: 3 });
  w.zone('Town Hall', [[426, 528], [548, 468], [560, 500], [438, 554]], { tier: 3 });
  w.zone('Research Campus', [[468, 340], [530, 330], [566, 400], [532, 436], [480, 430]], { tier: 3 });
  w.zone('Galeria', [[520, 256], [566, 248], [622, 364], [584, 384]], { tier: 2 });
  w.zone('Plaza Rossa', PLAZAS[0].pts, { tier: 2 });
}

// =====================================================================================================
export default {
  id: 'sandy_city', name: 'Sandy City', size: [MW, MH], seed: 4417,
  base: 'sand', cliff: 'sandDark',
  ambient: { music: 'sandy_city', birds: false, wind: true },
  conditions: ['night_raid', 'hurricane', 'lush_blooms', 'uncovered_caches', 'husk_graveyard', 'prospecting_probes', 'close_scrutiny', 'cold_snap', 'bird_city'],
  build(w, rng) {
    const ctx = { w, rng, occ: new Occ(), doorsOut: [], keySegs: [], metro: {}, nCont: 0, lootSkip: 0.84 };
    ctx.occFreeSouth = (s, x) => ctx.occ.at(x, s.z1 + 1.2) === -1;
    ctx.decks = [];
    ctx.onDeck = (x, z) => ctx.decks.some(D => { const i = Math.round(z) * (MW + 1) + Math.round(x); return i >= 0 && i < D.arr.length && !Number.isNaN(D.arr[i]); });
    ctx.nearDoor = (x, z, r) => ctx.doorsOut.some(([dx, dz]) => Math.abs(dx - x) < r && Math.abs(dz - z) < r);
    ctx.blocked = (x, z, r) => !ctx.occ.free(x - r - 0.5, z - r - 0.5, x + r + 0.5, z + r + 0.5) || ctx.onDeck(x, z) || ctx.onDeck(x + r + 1, z) || ctx.onDeck(x - r - 1, z) || ctx.onDeck(x, z + r + 1) || ctx.onDeck(x, z - r - 1) || ctx.nearDoor(x, z, r + 1.6);

    const T = [performance.now()], mark = n => { T.push(performance.now()); ctx.times = ctx.times || []; ctx.times.push(n + ' ' + (T[T.length - 1] - T[T.length - 2]).toFixed(0)); };
    shapeTerrain(ctx); mark('terrain');
    addObstacles(ctx);
    layoutComplexes(ctx);
    sunkMounds(ctx);
    sandDrifts(ctx); mark('layout+drifts');
    ctx.HW = makeDeck(ctx, { pts: HIGHWAY, prof: deckProfile(ctx, HIGHWAY, 5.2), width: HW_W, gaps: HW_GAPS, ramps: HW_RAMPS });
    ctx.RL = makeDeck(ctx, { pts: RAIL, prof: deckProfile(ctx, RAIL, 4.0, RAIL_VIADUCT_FROM, 60), width: 7, from: RAIL_VIADUCT_FROM, ramps: [[700, 1], [820, -1]] });
    ctx.decks.push(ctx.HW, ctx.RL); mark('decks');
    complexFloors(ctx);
    paintGround(ctx);
    paintDeck(ctx, ctx.HW, 'asphalt');
    w.path(RAIL.slice(0, 9), 6, 'gravel');
    paintDeck(ctx, ctx.RL, 'gravel', 'concrete'); mark('paint');
    buildComplexes(ctx); mark('buildings');
    furnish(ctx); mark('furnish');
    dressDeck(ctx, ctx.HW);
    dressDeck(ctx, ctx.RL, { wallTex: 'brick', pil: 'damConcrete', rail: 'rust', step: 2 });
    setPieces(ctx, ctx.HW, ctx.RL); mark('decks+setpieces');
    vegetation(ctx); mark('veg');
    streetClutter(ctx); mark('clutter');
    markers(ctx); mark('markers');
    this._ctx = ctx;   // debug hook for tools (not used by the game)
  },
};
