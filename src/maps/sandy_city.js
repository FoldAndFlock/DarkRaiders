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
const RAIL = [[304, 22], [288, 52], [262, 88], [248, 140], [242, 200], [240, 256], [238, 346], [232, 382], [214, 430], [196, 482],
  [180, 540], [166, 600], [152, 660], [138, 720], [126, 790], [114, 860], [104, 912]];
const RAIL_VIADUCT_FROM = 395;   // arc length where the rail climbs onto its viaduct

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
  [238, 300, 88, 24, 90, 2, 'c', { name: 'Marano Station', poi: 'marano_station', wall: 'brick', tint: 'cream' }],
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
  [415, 707, 44, 15, 82, 3, 'h', { poi: 'plaza_rosa', key: 'residential_plaza_rosa', tint: 'pink' }],
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
  [228, 598, 40, 37, 15, 5, 'a', { name: 'Grandioso Apartments', poi: 'grandioso_apartments', key: 'residential_grandioso', keySeg: 0, tint: 'cream' }],
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
  [590, 633, 58, 28, -35, 3, 'a', { key: 'residential_arbusto', keySeg: 0, tint: 'terracotta' }],
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
const FIELD_DEPOTS = [[425, 239], [386, 711], [740, 491], [64, 630]];

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
