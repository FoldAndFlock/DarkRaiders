// Green Gate (1100 x 825 m, north up): a forested mountain valley run by the Gatekeeping Department.
// The highway enters from the west on a causeway across Lake Liquidity whose middle spans dropped into the
// shallows ("Infrastructure Week"), queues through the Toll Booth of Eternal Hold Music and runs east to the
// gate at the foot of the Shelf: two gate towers joined by a walkway over a jammed sliding gate, and behind them
// Tunnel Vision, a road tunnel cut into the Shelf with the Cloud's server vault, a repair depot and the Head
// Office plant room branching off it (cut-and-cover halls with walkable lids; roofs fade when you go in).
// Around it: the terrace village of Lower Foreclosure above the Grace Period Creek gorge, Fort Knocks on the north
// spur with the quarry and the sawmill woods beyond, the Peak Performance Retreat on its mesa in the south with
// orchards and a destruction trail at its feet, a decorated crash site in the south-west woods, and a luxury
// estate that never got past Phase 1 up on the Shelf. Everything is deterministic (seeded rng only).
import './props_green_gate.js';
import { pointInPoly, mulberry, rotFrame, rotPt, unrotPt } from '../engine/world.js';
import { propGeo } from '../engine/models.js';

const W = 1100, H = 825;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const PI = Math.PI;
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1e-9;
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
function polyEdgeDist(pts, x, z) { let m = 1e9; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) m = Math.min(m, segDist(x, z, pts[j][0], pts[j][1], pts[i][0], pts[i][1])); return m; }
function resample(pts, step) {
  const out = [pts[0]];
  for (let k = 0; k < pts.length - 1; k++) {
    const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step));
    for (let i = 1; i <= n; i++) out.push([ax + (bx - ax) * i / n, az + (bz - az) * i / n]);
  }
  return out;
}
function smoothArr(a, r) { if (r <= 0) return a; return a.map((_, i) => { let s = 0, n = 0; for (let k = -r; k <= r; k++) { const j = clamp(i + k, 0, a.length - 1); s += a[j]; n++; } return s / n; }); }
function makeNoise(seed) {
  const r = mulberry(seed), perm = new Float32Array(1024); for (let i = 0; i < 1024; i++) perm[i] = r();
  const h = (a, b) => perm[((a * 73856093) ^ (b * 19349663)) & 1023];
  const sm = t => t * t * (3 - 2 * t);
  const vn = (x, z) => { const ix = Math.floor(x), iz = Math.floor(z), fx = sm(x - ix), fz = sm(z - iz); const a = h(ix, iz), b = h(ix + 1, iz), c = h(ix, iz + 1), d = h(ix + 1, iz + 1); return (a + (b - a) * fx) * (1 - fz) + (c + (d - c) * fx) * fz; };
  return (x, z, sc = 40) => vn(x / sc, z / sc) * 0.55 + vn(x / sc * 2.13, z / sc * 2.13) * 0.28 + vn(x / sc * 4.7, z / sc * 4.7) * 0.17;
}
// cumulative length along a polyline (for linear grades)
const cumLen = (P) => { const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1])); return L; };

// ------------------------------------------------------------------------------------ LAYOUT
// playable valley (clockwise from the north-west); outside it the terrain climbs into terraced mountains.
// The north spur pushes in between x 430 and 570; Grace Period Creek comes down a gorge at x ~330.
const PLAY = [[62, 58], [118, 30], [220, 22], [298, 18], [322, 6], [350, 8], [384, 24], [418, 40], [432, 92], [562, 92], [590, 42], [680, 28], [780, 22], [880, 18], [962, 26],
  [1030, 50], [1064, 92], [1072, 200], [1076, 330], [1068, 450], [1060, 540], [1040, 600], [1012, 640], [998, 700], [984, 760], [940, 800], [840, 808], [700, 812], [600, 815],
  [480, 810], [380, 800], [300, 805], [200, 795], [120, 770], [72, 730], [48, 650], [40, 560], [38, 470], [40, 380], [44, 300], [50, 200], [55, 120]];
// the Shelf: raised plateau in the east (tunnels underneath); its west cliff steps back around the gate apron
const SHELF_Y = 10.5, TUN_Y = 5.0, UNDER = SHELF_Y - TUN_Y;
const SHELF = [[866, 140], [930, 122], [1000, 112], [1060, 90], [1092, 96], [1098, 200], [1100, 330], [1094, 450], [1086, 560], [1060, 610], [990, 612], [930, 618], [892, 612], [878, 584],
  [862, 552], [842, 530], [826, 506], [830, 486], [866, 476], [870, 470], [870, 370], [866, 364], [830, 354], [822, 336], [840, 316], [858, 296], [860, 230]];
// north spur nose (Fort Knocks) and the southern mesa (Peak Performance Retreat)
const SPUR_Y = 15, SPUR = [[430, 78], [566, 78], [574, 128], [558, 172], [524, 200], [478, 202], [450, 180], [436, 140]];
const MESA_Y = 21, MESA = [[478, 640], [552, 622], [606, 640], [620, 696], [596, 748], [524, 758], [476, 730], [466, 684]];
// Lake Liquidity (the causeway crosses it at z 392) and Grace Period Creek feeding it from the north
const LAKE_LVL = 1.6;
const LAKE = [[192, 382], [206, 356], [238, 342], [280, 338], [326, 344], [362, 360], [384, 388], [380, 418], [358, 440], [316, 454], [262, 456], [220, 446], [196, 424]];
const CREEK = [[336, -6], [334, 30], [322, 70], [304, 118], [306, 168], [314, 218], [302, 268], [290, 318], [284, 350]];
// roads (polylines)
const HWY_W = [[30, 392], [80, 392], [120, 392], [190, 392]];                 // west approach, climbing onto the causeway
const HWY_E = [[380, 392], [410, 395], [432, 400], [446, 402]];               // causeway east ramp, down to the toll plaza
const HWY_C = [[446, 402], [500, 402], [546, 403], [600, 413], [660, 426], [720, 428], [770, 422], [806, 420], [872, 420]];
const R_VILLAGE = [[100, 394], [104, 352], [118, 312], [150, 282], [196, 262], [228, 240], [236, 200], [236, 150], [236, 100], [232, 56], [226, 22]];
const R_VX = [[122, 150], [180, 150], [236, 150], [292, 156]];
const R_SPURW = [[330, 160], [360, 176], [396, 200], [430, 220], [470, 228], [520, 228], [566, 226], [606, 228]];
const R_FORT = [[606, 228], [598, 204], [584, 180], [568, 162], [550, 154]];
const R_NORTH = [[492, 372], [500, 330], [526, 290], [566, 252], [606, 228]];
const R_NE = [[606, 228], [640, 206], [652, 170], [646, 130], [632, 100]];
const R_GLADE = [[652, 172], [700, 160], [750, 150], [800, 130], [850, 104], [900, 92], [944, 70]];
const R_SHELFN = [[806, 404], [810, 372], [814, 330], [820, 296], [836, 258], [858, 226], [886, 212], [930, 206], [962, 206], [1034, 206]];
const R_SHELFS = [[790, 540], [812, 544], [838, 550], [866, 556], [892, 552], [940, 532], [990, 496], [996, 482]];
const R_SOUTH = [[492, 432], [490, 470], [476, 516], [452, 556], [430, 584]];
const R_SE = [[490, 470], [540, 494], [600, 516], [660, 534], [700, 530], [740, 516], [770, 500]];
const R_PEAK = [[700, 530], [692, 568], [676, 598], [650, 626], [626, 650], [604, 666]];
const R_LAKE = [[300, 464], [340, 474], [384, 488], [430, 476], [470, 456], [490, 440]];
const R_SW = [[124, 394], [136, 440], [150, 500], [168, 560], [196, 610], [214, 650], [196, 694], [150, 716], [120, 720]];
const R_SEE = [[790, 560], [790, 596], [812, 632], [850, 668], [900, 696], [950, 712]];

// player insertion points around the edges
const SPAWNS = [[90, 80], [180, 40], [270, 34], [395, 60], [610, 56], [720, 44], [830, 40], [940, 50], [1046, 140], [1052, 300], [1046, 420], [1036, 560], [990, 660], [900, 780], [780, 792],
  [640, 790], [520, 792], [400, 786], [290, 790], [180, 760], [70, 640], [56, 520], [60, 440], [62, 330], [76, 210]];

// ------------------------------------------------------------------------------------ MAP
export default {
  id: 'green_gate', name: 'Green Gate', size: [W, H], seed: 7313,
  base: 'grass', cliff: 'rock',
  conditions: ['normal', 'lush_blooms', 'uncovered_caches', 'harvester', 'husk_graveyard', 'matriarch', 'prospecting_probes', 'em_storm', 'night_raid', 'cold_snap', 'locked_gate', 'hurricane', 'close_scrutiny'],
  ambient: { music: 'green_gate', birds: true, wind: 0.6 },
  build(w, rng) {
    const R = (a, b) => a + rng() * (b - a);
    const pick = a => a[Math.floor(rng() * a.length)];
    const N1 = makeNoise(7001), N2 = makeNoise(7002);

    // occupancy (1 m): 1 road, 2 structure, 4 reserved (no outcrops / dense trees), 8 water
    const OCC = new Uint8Array(W * H);
    const mark = (x0, z0, x1, z1, v) => { for (let z = Math.max(0, Math.floor(z0)); z < Math.min(H, Math.ceil(z1)); z++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) OCC[z * W + x] |= v; };
    const markLine = (pts, hw, v) => { for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1]; for (let z = Math.floor(Math.min(az, bz) - hw); z <= Math.max(az, bz) + hw; z++) for (let x = Math.floor(Math.min(ax, bx) - hw); x <= Math.max(ax, bx) + hw; x++) { if (x < 0 || z < 0 || x >= W || z >= H) continue; if (segDist(x + .5, z + .5, ax, az, bx, bz) <= hw) OCC[z * W + x] |= v; } } };
    const markPoly = (pts, v) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } for (let z = Math.max(0, Math.floor(b)); z < Math.min(H, d); z++) for (let x = Math.max(0, Math.floor(a)); x < Math.min(W, c); x++) if (pointInPoly(x + .5, z + .5, pts)) OCC[z * W + x] |= v; };
    const occ = (x, z) => (x < 0 || z < 0 || x >= W || z >= H) ? 255 : OCC[Math.floor(z) * W + Math.floor(x)];
    const free = (x, z, m = 0, mask = 7) => { for (const [dx, dz] of [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]]) if (occ(x + dx, z + dz) & mask) return false; return true; };
    const inPlay = (x, z) => pointInPoly(x, z, PLAY);

    // ======================================================================== 1. TERRAIN
    // scanline 'set' of every heightfield vertex inside pts (same inside test as pointInPoly; much faster on big polys)
    const fillPoly = (pts, h) => {
      const W1 = w.tw + 1; let z0 = 1e9, z1 = -1e9; for (const p of pts) { z0 = Math.min(z0, p[1]); z1 = Math.max(z1, p[1]); }
      for (let z = Math.max(0, Math.ceil(z0)); z <= Math.min(w.th, Math.floor(z1)); z++) {
        const xs = []; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z)) xs.push((xj - xi) * (z - zi) / (zj - zi + 1e-12) + xi); }
        xs.sort((p, q) => p - q);
        for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.max(0, Math.ceil(xs[k])); x < xs[k + 1] && x <= w.tw; x++) w.hv[z * W1 + x] = h;
      }
    };
    // coarse signed distance to the playable polygon (positive = outside)
    const DS = 4, dw = Math.ceil(W / DS) + 1, dh = Math.ceil(H / DS) + 1, DF = new Float32Array(dw * dh);
    for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) { const x = i * DS, z = j * DS, d = polyEdgeDist(PLAY, x, z); DF[j * dw + i] = pointInPoly(x, z, PLAY) ? -d : d; }
    const dAt = (x, z) => { const fx = x / DS, fz = z / DS, i = Math.min(dw - 2, Math.floor(fx)), j = Math.min(dh - 2, Math.floor(fz)), tx = fx - i, tz = fz - j; const a = DF[j * dw + i], b = DF[j * dw + i + 1], c = DF[(j + 1) * dw + i], d = DF[(j + 1) * dw + i + 1]; return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz; };
    const onPlateau = (x, z) => pointInPoly(x, z, SHELF) || pointInPoly(x, z, SPUR) || pointInPoly(x, z, MESA);

    w.noiseHills(2.2, 72, 51);
    w.noiseHills(0.8, 19, 52);
    w.heightFn((x, z) => 3.0
      + 3.8 * ss(300, 236, z) * ss(330, 296, x)                       // Lower Foreclosure's terrace (north-west)
      + 2.6 * ss(270, 150, z) * ss(330, 390, x) * ss(880, 840, x)     // northern woods rising toward the spur and the sawmill
      + 1.8 * ss(540, 700, z) * ss(330, 420, x)                       // southern farmland
      + 2.2 * ss(470, 580, z) * ss(340, 280, x)                       // south-west woods
      + 2.4 * ss(630, 740, z) * ss(840, 900, x)                       // south-east meadows
      - 1.2 * ss(300, 380, z) * ss(470, 430, x) * ss(150, 200, x), 'add');   // the lake basin's gentle rim
    // settle the built-up areas: blend the noisy valley toward a target height inside a rectangle (fade metres outside)
    const blendTo = (x0, z0, x1, z1, fade, target) => {
      const W1 = w.tw + 1;
      w._area(x0 - fade, z0 - fade, x1 + fade, z1 + fade, (x, z, i) => {
        const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(z0 - z, 0, z - z1)), m = 1 - ss(0, fade, d);
        if (m > 0) w.hv[i] = w.hv[i] * (1 - m) + target(x, z) * m;
      });
      void W1;
    };
    blendTo(112, 26, 296, 252, 14, (x, z) => 6.9 - (z - 26) * 0.004 - (x - 112) * 0.002);   // Lower Foreclosure's terrace
    blendTo(54, 236, 136, 334, 14, () => 5.6);                                              // the farm
    blendTo(440, 334, 556, 470, 18, () => 3.8);                                             // the toll plaza
    blendTo(700, 300, 880, 620, 34, () => TUN_Y);                                           // the gate apron, reception, warehouses
    // plateaus (soft pass: cliffs all round, ramps are cut later)
    w.raisePoly(SHELF, SHELF_Y, 4, 'set');
    w.raisePoly(SPUR, SPUR_Y, 5, 'set');
    w.raisePoly(MESA, MESA_Y, 5, 'set');
    // mountains around the valley: terraced limestone with ridged noise (plateau tops stay flat)
    w.heightFn((x, z) => {
      const d = dAt(x, z);
      if (d < -34) return null;
      if (d < 0) { if (onPlateau(x, z)) return null; const t = 1 + d / 34; return 3.2 * t * t * (0.6 + N1(x, z, 30)); }
      const n = N1(x, z, 46), n2 = N2(x, z, 14);
      let h = 4.5 + Math.min(d, 46) * 0.9 + n * 12 + n2 * 3 + Math.min(14, Math.max(0, d - 46) * 0.2);
      const st = 3.4, q = h / st, f = q - Math.floor(q);
      h = (Math.floor(q) + ss(0.5, 0.86, f)) * st;
      return h + 8 * ss(0, 2.4, d);          // sheer limestone cliff along the whole boundary
    }, 'add');
    // the Shelf's north-east is broken scrubland: gentle bumps away from the estate and the tunnels
    w.heightFn((x, z) => (x > 880 && z > 300 && z < 600 && (x > 1040 || z > 540) && pointInPoly(x, z, SHELF)) ? (N2(x, z, 24) - 0.5) * 1.4 * ss(0, 14, polyEdgeDist(SHELF, x, z)) : null, 'add');
    // Lake Liquidity: a bowl with shallow margins and a sand bar under the fallen causeway spans
    w.raisePoly(LAKE, -0.8, 14, 'set');
    w.raiseRect(262, 385, 309, 399, 1.0, 5, 'set');
    w.waterPoly(LAKE.map(([x, z]) => [x + (x - 286) * 0.16, z + (z - 398) * 0.28]), { level: LAKE_LVL, deep: 0x1c4652, shallow: 0x3a7c80 });
    // Grace Period Creek: cut through the terrace as a gorge, wadeable bed
    w.river(CREEK, 9, { level: LAKE_LVL, depth: 0.8, bank: 5, bed: 'mud' });
    // quarry pit in the spur's east flank
    const QPIT = [[596, 60], [664, 56], [674, 108], [660, 134], [608, 130], [594, 100]];
    w.raisePoly(QPIT, 2.6, 7, 'set');
    w.raisePoly([[608, 70], [652, 68], [660, 104], [646, 120], [614, 118], [604, 96]], 1.4, 3, 'set');
    // the Scenic Overlook's ridge: a rocky crest dropping south-west off the Shelf's promontory
    const RIDGE = [[884, 606], [858, 634], [832, 662], [806, 692], [782, 722]];
    for (let k = 0; k < RIDGE.length - 1; k++) w.ridge([RIDGE[k], RIDGE[k + 1]], 12, 10.4 - k * 1.2, 8, 'max');
    // Buy The Dip: a chain of impact craters
    const CRATERS = [[572, 488, 8], [596, 508, 6], [620, 530, 9], [646, 552, 7], [668, 574, 8], [692, 598, 6]];
    for (const [cx, cz, r] of CRATERS) w.raiseCircle(cx, cz, r, -2.4, 0.6, 'add');
    // small knolls
    w.raiseCircle(600, 336, 30, 1.2, 0.8, 'add');           // the meadow knoll north of the highway
    w.raiseCircle(372, 268, 16, 0.8, 0.6, 'add');

    // reserve POI footprints + roads before scattering outcrops
    const RES = [[110, 30, 300, 260], [52, 236, 176, 340], [440, 330, 560, 470], [740, 320, 1040, 480], [700, 460, 840, 610], [860, 560, 910, 620], [430, 90, 610, 240], [586, 46, 690, 150],
      [730, 80, 810, 170], [870, 40, 960, 110], [630, 260, 700, 320], [360, 540, 480, 660], [460, 610, 630, 770], [540, 470, 720, 620], [170, 590, 310, 710], [80, 690, 150, 750],
      [880, 640, 1000, 780], [340, 440, 420, 500], [210, 310, 270, 345], [570, 300, 640, 370], [780, 620, 880, 720]];
    for (const r of RES) mark(...r, 4);
    for (const [x, z, r] of [[1034, 330, 12], [372, 268, 12], [146, 548, 12], [716, 714, 12], [668, 150, 6], [452, 532, 6], [978, 748, 6], [108, 122, 6], ...SPAWNS.map(([x, z]) => [x, z, 12])]) mark(x - r, z - r, x + r, z + r, 4);
    for (const [pts, hw] of [[HWY_W, 9], [HWY_E, 9], [HWY_C, 10], [R_VILLAGE, 5], [R_VX, 4], [R_SPURW, 5], [R_FORT, 5], [R_NORTH, 5], [R_NE, 5], [R_GLADE, 4], [R_SHELFN, 5], [R_SHELFS, 5],
      [R_SOUTH, 5], [R_SE, 5], [R_PEAK, 5], [R_LAKE, 4], [R_SW, 4], [R_SEE, 4]]) markLine(pts, hw, 1);
    markLine(CREEK, 10, 8); markPoly(LAKE, 8); markLine([[190, 392], [380, 392]], 9, 1);

    // --- rocky outcrops: steep curved ridges + rock paint, mostly in the woods and on the mountain feet
    const outcrops = [];
    const OZ = [[340, 40, 430, 330, 14], [580, 140, 860, 300, 14], [690, 30, 870, 90, 10], [60, 420, 190, 620, 10], [300, 480, 470, 560, 8], [640, 620, 800, 790, 16],
      [400, 660, 470, 790, 8], [880, 620, 1000, 790, 12], [880, 300, 1060, 600, 10], [60, 60, 120, 230, 6], [150, 720, 330, 800, 8], [560, 760, 700, 812, 6]];
    for (const [x0, z0, x1, z1, n] of OZ) {
      let made = 0, tries = 0;
      while (made < n && tries++ < n * 30) {
        const cx = R(x0, x1), cz = R(z0, z1), rad = R(8, 22), a0 = R(0, PI * 2), span = R(0.7, 2.2), wd = R(2.5, 6), hh = R(2.2, 5.6);
        const pts = []; const np = Math.max(3, Math.round(rad * span / 6));
        for (let i = 0; i <= np; i++) { const a = a0 + span * i / np; pts.push([cx + Math.cos(a) * rad, cz + Math.sin(a) * rad * R(0.85, 1.1)]); }
        if (!pts.every(([x, z]) => inPlay(x, z) && free(x, z, wd / 2 + 3, 15))) continue;
        w.ridge(pts, wd, hh, 1.7, 'add');
        w.path(pts, wd + 6, rng() < 0.5 ? 'gravel' : 'dirt');
        w.path(pts, wd + 1.5, 'rock');
        markLine(pts, wd / 2 + 2, 4 | 2);
        outcrops.push({ pts, wd, hh }); made++;
      }
    }

    // ======================================================================== 2. ROADS
    const levelPath = (pts, hs, width, blend) => w._along(pts, width, blend, (i, f, t, k) => { const h = hs[k] + (hs[k + 1] - hs[k]) * t; w.hv[i] += (h - w.hv[i]) * f; });
    const roadL = (pts, width, tex = 'asphalt', o = {}) => {
      const P = resample(pts, 6);
      const hs = smoothArr(P.map(([x, z]) => w.groundAt(x, z)), o.smooth ?? 3);
      if (o.level !== false) levelPath(P, hs, width + 1.5, o.blend ?? 3);
      w.road(P, width, tex, { edge: o.edge === undefined ? 'gravel' : o.edge, edgeW: o.edgeW ?? 1, level: false });
      return P;
    };
    // graded road: linear climb from the ground at `from` (index along the resampled line) to height y1 at the end
    const gradeRoad = (pts, width, tex, y0, y1, o = {}) => {
      const P = resample(pts, 4), L = cumLen(P), T = L[L.length - 1];
      const hs = P.map((_, i) => { const t = L[i] / T; return y0 + (y1 - y0) * ss(o.t0 ?? 0, o.t1 ?? 1, t); });
      levelPath(P, hs, width + 1.5, o.blend ?? 2.5);
      w.road(P, width, tex, { edge: o.edge === undefined ? 'gravel' : o.edge, edgeW: o.edgeW ?? 1, level: false });
      return P;
    };
    const dashLine = (pts, kind = 'gg_lane', period = 6, from = 0, y = 0.03, abs = false) => {
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), rot = Math.atan2(-(bz - az), bx - ax);
        for (let s = from; s < L; s += period) w.prop(kind, ax + (bx - ax) * s / L, az + (bz - az) * s / L, rot, abs ? { yAbs: y } : { y });
      }
    };
    const offLine = (pts, o) => pts.map(([x, z], i) => { const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(bx - ax, bz - az) || 1; return [x - (bz - az) / L * o, z + (bx - ax) / L * o]; });
    // --- the highway: west approach climbs onto the causeway deck (7.6 m), east ramp drops to the toll plaza
    const DECK_Y = 7.6;
    {
      const P = resample(HWY_W, 4), g0 = w.groundAt(60, 392);
      levelPath(P, P.map(([x]) => x < 70 ? w.groundAt(x, 392) : g0 + (DECK_Y - g0) * ss(70, 188, x)), 15, 1.2);
      w.road(P, 13, 'asphalt', { edge: 'gravel', edgeW: 1, level: false });
      const E = resample(HWY_E, 4), gE = w.groundAt(452, 402);
      levelPath(E, E.map(([x]) => DECK_Y + (gE - DECK_Y) * ss(382, 446, x)), 15, 1.2);
      w.road(E, 13, 'asphalt', { edge: 'gravel', edgeW: 1, level: false });
    }
    // through the plaza to the gate apron (forced to tunnel-floor height at the gate)
    {
      const P = resample(HWY_C, 5), L = cumLen(P), base = smoothArr(P.map(([x, z]) => w.groundAt(x, z)), 4);
      const hs = P.map(([x], i) => { const t = ss(720, 800, x); return base[i] * (1 - t) + TUN_Y * t; });
      levelPath(P, hs, 15, 3);
      w.road(P, 13, 'asphalt', { edge: 'gravel', edgeW: 1, level: false });
      dashLine(P, 'gg_laney', 7); dashLine(offLine(P, 5.8), 'gg_lane', 2.6); dashLine(offLine(P, -5.8), 'gg_lane', 2.6);
      void L;
    }
    dashLine(resample(HWY_W, 7), 'gg_laney', 7); dashLine(offLine(resample(HWY_W, 7), 5.8), 'gg_lane', 2.6); dashLine(offLine(resample(HWY_W, 7), -5.8), 'gg_lane', 2.6);
    roadL(R_VILLAGE, 5, 'gravel', { edge: 'dirt', smooth: 2 });
    roadL(R_VX, 4.5, 'gravel', { edge: 'dirt', smooth: 2 });
    roadL(R_NORTH, 6, 'asphalt', { smooth: 3 });
    roadL(R_NE, 5, 'gravel', { smooth: 2 });
    roadL(R_GLADE, 4, 'dirt', { edge: null, smooth: 2 });
    roadL(R_SOUTH, 5, 'gravel', { smooth: 3 });
    roadL(R_SE, 5.5, 'asphalt', { smooth: 3 });
    roadL(R_LAKE, 4, 'gravel', { edge: 'dirt', smooth: 2 });
    roadL(R_SW, 4, 'dirt', { edge: null, smooth: 2 });
    roadL(R_SEE, 4, 'gravel', { edge: 'dirt', smooth: 2 });
    const VBR_Y = w.groundAt(286, 155);                    // village bridge deck height
    gradeRoad(R_SPURW, 5, 'gravel', VBR_Y, w.groundAt(606, 228), { t0: 0, t1: 0.35, edge: 'dirt' });
    gradeRoad(R_FORT, 5, 'gravel', w.groundAt(606, 228), SPUR_Y, { blend: 2 });
    gradeRoad(R_SHELFN, 6, 'asphalt', TUN_Y, SHELF_Y, { t0: 0.18, t1: 0.52, blend: 2 });
    gradeRoad(R_SHELFS, 6, 'asphalt', TUN_Y, SHELF_Y, { t0: 0.05, t1: 0.42, blend: 2 });
    gradeRoad(R_PEAK, 5, 'gravel', w.groundAt(700, 530), MESA_Y, { t0: 0.08, t1: 1, blend: 2 });
    // footpaths up the plateaus: the fort's west stair-path and the retreat's orchard path
    gradeRoad([[404, 220], [430, 196], [454, 174]], 4.5, 'gravel', w.groundAt(404, 220), SPUR_Y, { edge: null, blend: 2 });
    gradeRoad([[420, 652], [450, 670], [482, 684]], 4.5, 'gravel', 7.6, MESA_Y, { edge: null, blend: 2 });
    // forest trails (unlevelled dirt)
    for (const t of [
      [[226, 22], [180, 40], [120, 70], [96, 120], [80, 180], [70, 240]],
      [[330, 160], [352, 120], [372, 70], [390, 40]],
      [[396, 200], [380, 240], [372, 268], [350, 300], [330, 330]],
      [[566, 252], [600, 290], [630, 300], [660, 292]],
      [[700, 160], [690, 220], [668, 270]],
      [[800, 130], [812, 190], [830, 250]],
      [[900, 92], [940, 120]],
      [[168, 560], [146, 548], [90, 520], [70, 470]],
      [[214, 650], [260, 640], [300, 660], [340, 700], [400, 720], [470, 740]],
      [[452, 556], [440, 600]],
      [[540, 494], [520, 560], [500, 610]],
      [[660, 534], [700, 640], [716, 714], [740, 740], [800, 780]],
      [[850, 668], [880, 720], [930, 760], [978, 748]],
      [[300, 464], [250, 500], [200, 530], [168, 560]],
      [[120, 720], [100, 680], [80, 620], [70, 560]],
      [[1000, 260], [1034, 330], [1040, 400], [1030, 470]],
    ]) { const P = resample(t, 5); w.path(P, 2.6, 'dirt'); markLine(P, 1.6, 1); }

    // ======================================================================== 3. STRUCTURE HELPERS
    const defPoly = (o, m = 0) => { const Rf = o.rot ? rotFrame(o.x + o.w / 2, o.z + o.d / 2, o.rot) : null; return [[o.x - m, o.z - m], [o.x + o.w + m, o.z - m], [o.x + o.w + m, o.z + o.d + m], [o.x - m, o.z + o.d + m]].map(([x, z]) => rotPt(Rf, x, z)); };
    // the AI's layered nav samples one fine cell at the centre of each 2 m cell (odd world coordinates): nudge narrow
    // doorways and partition gaps (axis-aligned buildings) so their centres sit on one, clear of junctions and other openings
    const navAlign = (o) => {
      if (o.rot || o._aligned) return; o._aligned = true;
      const fix = (d, base, L, others) => {
        if (d.sill || d.w >= 3) return;
        const c = base + d.at + d.w / 2, ct = 2 * Math.round((c - 1) / 2) + 1;
        for (const sh of [ct - c, ct - c + 2, ct - c - 2]) {
          const at = d.at + sh;
          if (at < 0.5 || at + d.w > L - 0.5) continue;
          if (others.some(e => e !== d && at < e.at + e.w + 0.3 && e.at < at + d.w + 0.3)) continue;
          d.at = at; return;
        }
      };
      const inner = o.inner || [];
      // inner-wall ends / crossings along a line, as pseudo-openings to keep doors off them
      const junctions = (horiz, line, base, storey) => inner.filter(iw => (iw[5] || 0) === storey).flatMap(([x0, z0, x1, z1]) => {
        const ih = Math.abs(z0 - z1) < 1e-6; if (ih === horiz) return [];
        const along = horiz ? x0 : z0, a0 = horiz ? Math.min(z0, z1) : Math.min(x0, x1), a1 = horiz ? Math.max(z0, z1) : Math.max(x0, x1);
        return a0 - 0.2 <= line && line <= a1 + 0.2 ? [{ at: along - base - 0.2, w: 0.4 }] : [];
      });
      for (const d of o.doors || []) {
        const horiz = d.side === 'n' || d.side === 's', L = horiz ? o.w : o.d, k = d.storey || 0;
        const others = [...(o.doors || []).filter(e => e.side === d.side && (e.storey || 0) === k), ...junctions(horiz, d.side === 'n' || d.side === 'w' ? 0 : (horiz ? o.d : o.w), 0, k)];
        fix(d, horiz ? o.x : o.z, L, others);
      }
      for (const iw of inner) {
        const [x0, z0, x1, z1, gs = []] = iw, horiz = Math.abs(z0 - z1) < 1e-6, k = iw[5] || 0;
        const base = horiz ? Math.min(x0, x1) : Math.min(z0, z1), L = horiz ? Math.abs(x1 - x0) : Math.abs(z1 - z0);
        const others = [...gs, ...junctions(horiz, horiz ? z0 : x0, base, k).filter(j => j.at > 0.1 && j.at < L - 0.5)];
        for (const g0 of gs) fix(g0, (horiz ? o.x : o.z) + base, L, others);
      }
    };
    const bldg = (o) => {
      navAlign(o);
      const def = { storeys: 1, wall: 'plaster', floor: 'tiles', roof: 'roofTar', thick: 0.3, ...o };
      const b = w.building(def);
      // close the stairwell's 0.5 m margin beyond each flight's top step with a landing at the upper floor level
      if ((def.storeys || 1) > 1 && def.floors !== false) for (const st of def.stairs || []) {
        if (st.to === 'top' || st.landing === false) continue;
        const sh = def.storeyH || 3.2, from = st.from || 0, to = st.to ?? from + 1, up = to > from, top = Math.max(from, to);
        const dir = up ? (st.dir || 'n') : { n: 's', s: 'n', e: 'w', w: 'e' }[st.dir || 'n'];
        const L = st.len ?? Math.max(2, Math.ceil(Math.abs(to - from) * sh / 0.38)) * 0.55, sw = st.w ?? 1.4, ax = dir === 'e' || dir === 'w';
        const fx0 = def.x + st.x, fz0 = def.z + st.z, fx1 = fx0 + (ax ? L : sw), fz1 = fz0 + (ax ? sw : L);
        const r = { n: [fx0 - 0.5, fz0 - 0.55, fx1 + 0.5, fz0 + 0.02], s: [fx0 - 0.5, fz1 - 0.02, fx1 + 0.5, fz1 + 0.55], w: [fx0 - 0.55, fz0 - 0.5, fx0 + 0.02, fz1 + 0.5], e: [fx1 - 0.02, fz0 - 0.5, fx1 + 0.55, fz1 + 0.5] }[dir];
        w.block(r[0], r[1], r[2], r[3], 0.25, def.floor || 'tiles', { cutaway: true, bid: b.id, onBuilding: b.id, R: b.R, rel0: top * sh - 0.25 });
      }
      if (o.rot) markPoly(defPoly(o, 1.5), 2 | 4); else mark(o.x - 1.5, o.z - 1.5, o.x + o.w + 1.5, o.z + o.d + 1.5, 2 | 4);
      return b;
    };
    const gapsOf = (o) => {
      const g = [];
      for (const d of o.doors || []) {
        const c = d.at + d.w / 2;
        if (d.side === 'n') g.push([c, 0, d.w]); else if (d.side === 's') g.push([c, o.d, d.w]);
        else if (d.side === 'w') g.push([0, c, d.w]); else g.push([o.w, c, d.w]);
      }
      for (const iw of o.inner || []) { const [x0, z0, , z1, gs = []] = iw; const hz = Math.abs(z0 - z1) < 1e-6; for (const gg of gs) g.push(hz ? [x0 + gg.at + gg.w / 2, z0, gg.w] : [x0, z0 + gg.at + gg.w / 2, gg.w]); }
      return g;
    };
    const FURN = {
      home: ['gg_wardrobe', 'gg_bed', 'gg_table', 'gg_sofa', 'gg_stove', 'shelf', 'gg_cabinet', 'gg_fridge'],
      office: ['gg_desk', 'gg_cabinet', 'shelf', 'gg_desk', 'gg_console', 'gg_lockers'],
      barracks: ['gg_bunk', 'gg_lockers', 'gg_bunk', 'gg_table', 'gg_cabinet'],
      security: ['gg_lockers', 'gg_desk', 'shelf', 'gg_console', 'gg_cabinet'],
      industrial: ['shelf', 'workbench', 'gg_crates', 'barrel', 'gg_pallet', 'gg_generator', 'crate'],
      lab: ['gg_server', 'gg_console', 'gg_desk', 'gg_server', 'shelf'],
      shed: ['workbench', 'barrel', 'crate', 'gg_woodpile', 'shelf'],
      church: ['gg_pew', 'gg_pew', 'gg_cabinet'],
      ruin: ['debris', 'crate', 'barrel', 'gg_rock_s'],
      camp: ['gg_crates', 'barrel', 'gg_pallet', 'crate'],
    };
    const CONT = {
      home: ['cabinet', 'fridge', 'suitcase', 'basket', 'trash', 'desk', 'medical_bag', 'backpack'],
      office: ['desk', 'cabinet', 'electronics', 'locker', 'trash', 'safe'],
      barracks: ['locker', 'ammo_box', 'backpack', 'medical_bag', 'security_locker', 'weapon_case'],
      security: ['security_locker', 'weapon_case', 'ammo_box', 'locker', 'desk', 'safe'],
      industrial: ['toolbox', 'crate', 'toolbox', 'electronics', 'locker', 'arc_crate'],
      lab: ['electronics', 'electronics', 'desk', 'safe', 'cabinet'],
      shed: ['toolbox', 'crate', 'trash', 'basket'],
      church: ['cabinet', 'basket', 'suitcase'],
      ruin: ['trash', 'crate', 'backpack', 'raider_cache'],
      camp: ['raider_cache', 'backpack', 'ammo_box', 'medical_bag', 'crate'],
      vault: ['safe', 'electronics', 'security_locker', 'weapon_case'],
      medical: ['medical_bag', 'medical_bag', 'cabinet', 'locker', 'trash'],
      spa: ['medical_bag', 'cabinet', 'suitcase', 'basket', 'fridge'],
    };
    const FOOT = { gg_bed: 1.0, gg_bunk: 1.0, gg_sofa: 1.0, gg_table: 0.8, gg_pew: 1.5, workbench: 0.8, gg_wardrobe: 0.6, gg_lockers: 0.8, gg_desk: 0.7, gg_console: 0.9, shelf: 0.8, gg_crates: 0.95, gg_generator: 0.9, gg_woodpile: 1 };
    // furniture + loot along walls, computed in the building's local frame and mapped to the world
    const furnish = (o, kind, opts = {}, bb = null) => {
      const ww = o.w, dd = o.d, a = o.rot || 0, k = opts.storey || 0, sh = o.storeyH || 3.2;
      const gaps = gapsOf({ ...o, doors: (o.doors || []).filter(d0 => (d0.storey || 0) === k), inner: (o.inner || []).filter(iw => (iw[5] || 0) === k) });
      const T = bb ? (lx, lz) => w.local(bb, lx, lz) : (o.rot ? ((Rf) => (lx, lz) => rotPt(Rf, o.x + lx, o.z + lz))(rotFrame(o.x + o.w / 2, o.z + o.d / 2, o.rot)) : (lx, lz) => [o.x + lx, o.z + lz]);
      const lvl = k && bb ? { bid: bb.id, yRel: k * sh } : {};
      const walls = (o.inner || []).filter(iw => (iw[5] || 0) === k).map(([x0, z0, x1, z1]) => [x0, z0, x1, z1]);
      const keepOut = [...(o.stairs || []).filter(st => st.from === k || st.to === k || (st.to === 'top' && k === 0)).map(st => stairRect(o, st, 1.3)),
        ...(o.ladders || []).filter(ld => ld.x != null && ((ld.from || 0) === k || ld.to === k)).map(ld => [ld.x - 1.4, ld.z - 1.4, ld.x + 1.4, ld.z + 1.6])];
      const freeOf = (sx, sz, m = 0) => keepOut.every(([x0, z0, x1, z1]) => sx < x0 - m || sx > x1 + m || sz < z0 - m || sz > z1 + m) && (opts.avoid || []).every(([x0, z0, x1, z1]) => sx < x0 - m || sx > x1 + m || sz < z0 - m || sz > z1 + m);
      const slots = [], m = 0.72, step = opts.step ?? 2.0;
      for (let s = 1.3; s < ww - 1.1; s += step) { slots.push([s, m, 0]); slots.push([s, dd - m, PI]); }
      for (let s = 1.3; s < dd - 1.1; s += step) { slots.push([m, s, PI / 2]); slots.push([ww - m, s, -PI / 2]); }
      for (const iw of walls) {
        const hz = Math.abs(iw[1] - iw[3]) < 1e-6, L = hz ? iw[2] - iw[0] : iw[3] - iw[1];
        for (let s = 1.2; s < L - 1; s += step) {
          if (hz) { slots.push([iw[0] + s, iw[1] - m, PI]); slots.push([iw[0] + s, iw[1] + m, 0]); }
          else { slots.push([iw[0] - m, iw[1] + s, -PI / 2]); slots.push([iw[0] + m, iw[1] + s, PI / 2]); }
        }
      }
      const ok = ([sx, sz]) => freeOf(sx, sz) && gaps.every(([gx, gz, gw]) => Math.hypot(sx - gx, sz - gz) > gw / 2 + 1.25) && walls.every(([a0, b0, c0, d0]) => segDist(sx, sz, a0, b0, c0, d0) > 0.55 || (Math.abs(a0 - c0) < 1e-6 ? Math.abs(sx - a0) > 0.5 : Math.abs(sz - b0) > 0.5));
      const good = slots.filter(ok);
      const fl = FURN[kind] || FURN.home, cl = CONT[opts.cont || kind] || CONT.home;
      const nCont = opts.cont0 ?? Math.max(1, Math.round(ww * dd / (opts.density ?? 28)));
      let placedC = 0;
      for (let i = good.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [good[i], good[j]] = [good[j], good[i]]; }
      const used = [];
      for (const [sx, sz, rot] of good) {
        if (used.some(([ux, uz]) => Math.hypot(ux - sx, uz - sz) < 1.7)) continue;
        if (placedC < nCont) {
          w.container(pick(cl), ...T(sx, sz), rot - a, { tier: opts.tier ?? 1, room: opts.room || null, poi: opts.poi || null, ...lvl });
          placedC++; used.push([sx, sz]);
          continue;
        }
        if (rng() < (opts.fill ?? 0.8)) {
          const kk = pick(fl), off = (FOOT[kk] || 0.6) - 0.6;
          w.prop(kk, ...T(sx + Math.sin(rot) * off, sz + Math.cos(rot) * off), rot - a, { solid: true, ...lvl });
          used.push([sx, sz]);
        }
      }
      if (ww >= 9 && dd >= 8 && opts.centre !== false) {
        const ck = { home: 'gg_table', office: 'gg_desk', barracks: 'gg_table', security: 'gg_table', industrial: 'workbench', lab: 'gg_console', shed: 'gg_crates', camp: 'gg_crates', ruin: 'debris', church: 'gg_altar' }[kind] || 'gg_table';
        const cells = [[ww * 0.3, dd * 0.5], [ww * 0.78, dd * 0.45]];
        for (const [cx, cz] of cells) if (freeOf(cx, cz, 0.6) && gaps.every(([gx, gz, gw]) => Math.hypot(cx - gx, cz - gz) > gw / 2 + 1.6) && walls.every(([a0, b0, c0, d0]) => segDist(cx, cz, a0, b0, c0, d0) > 1.4)) {
          const r0 = rng() < 0.5 ? 0 : PI / 2; w.prop(ck, ...T(cx, cz), r0 - a, { solid: true, ...lvl });
          if (kind === 'home' || kind === 'barracks') { w.prop('gg_chair', ...T(cx + 1.1, cz), -PI / 2 - a, { ...lvl }); w.prop('gg_chair', ...T(cx - 1.1, cz), PI / 2 - a, { ...lvl }); }
        }
      }
      if (opts.light !== false && ww * dd > 30 && !k) w.lamp(...T(ww / 2, dd / 2), { y: Math.min(3.0, (o.h || 3.2) - 0.3), model: null, color: opts.lightColor ?? 0xffd8a0, intensity: opts.lightI ?? 1.7, range: Math.min(12, Math.max(ww, dd) * 0.8 + 3), flicker: opts.flicker ?? 0 });
    };
    // ---- stairs: local rect of a flight (+ landing margin), and an automatic planner for multi-storey buildings
    const flightLen = (o, st) => { const sh = o.storeyH || 3.2, lev = (v) => v === 'top' ? (o.under || o.h || (o.storeys || 1) * sh) : v * sh; const rise = Math.abs(lev(st.to) - lev(st.from || 0)) + (st.to === 'top' ? 0.02 : 0); return st.len ?? Math.max(2, Math.ceil(rise / 0.38)) * 0.55; };
    function stairRect(o, st, mg = 0) { const L = flightLen(o, st), sw = st.w ?? 1.4, ax = st.dir === 'e' || st.dir === 'w'; return [st.x - mg, st.z - mg, st.x + (ax ? L : sw) + mg, st.z + (ax ? sw : L) + mg]; }
    const segHitsRect = ([x0, z0, x1, z1], [a0, b0, a1, b1]) => Math.max(x0, x1) > a0 && Math.min(x0, x1) < a1 && Math.max(z0, z1) > b0 && Math.min(z0, z1) < b1;
    const planStairs = (o, sw = 1.3) => {
      const sh = o.storeyH || 3.2, n = Math.max(2, Math.ceil(sh / 0.38)), L = n * 0.55, W0 = o.w, D0 = o.d;
      const snap = (v, base) => { const t = base + v; return v + (0.25 - (((t % 0.5) + 0.5) % 0.5)); };
      const cands = [];
      // lateral snap: the flight must cover a nav-cell centre line (odd world coordinate), so start it at 0.6 mod 2,
      // moving away from the wall it hugs (sgn +1: from the west / north wall, -1: from the east / south wall)
      const lat = (v, base, sgn) => { const m = (((base + v - 0.6) % 2) + 2) % 2; return sgn > 0 ? v + (m > 0.01 ? 2 - m : 0) : v - m; };
      const xE = lat(W0 - 0.4 - sw, o.x, -1), xW = lat(0.4, o.x, 1), zN = lat(0.4, o.z, 1), zS = lat(D0 - 0.4 - sw, o.z, -1);
      for (const x of [xE, xW]) { cands.push({ x, z: snap(1.35, o.z), w: sw, dir: 'n' }); cands.push({ x, z: snap(D0 - 1.35, o.z) - L, w: sw, dir: 's' }); }
      for (const z of [zS, zN]) { cands.push({ x: snap(1.35, o.x), z, w: sw, dir: 'w' }); cands.push({ x: snap(W0 - 1.35, o.x) - L, z, w: sw, dir: 'e' }); }
      const doors = (o.doors || []).filter(d0 => !d0.sill).map(d0 => { const c = d0.at + d0.w / 2; return d0.side === 'n' ? [c, 0, d0.w] : d0.side === 's' ? [c, D0, d0.w] : d0.side === 'w' ? [0, c, d0.w] : [W0, c, d0.w]; });
      const okSt = (st) => {
        const [x0, z0, x1, z1] = stairRect(o, st), ax = st.dir === 'e' || st.dir === 'w';
        if (ax ? (x0 < 1.2 || x1 > W0 - 1.2) : (z0 < 1.2 || z1 > D0 - 1.2)) return false;
        const C = [x0 - (ax ? 1.1 : 0.3), z0 - (ax ? 0.3 : 1.1), x1 + (ax ? 1.1 : 0.3), z1 + (ax ? 0.3 : 1.1)];
        if (doors.some(([gx, gz, gw]) => Math.max(C[0] - gx, 0, gx - C[2]) ** 2 + Math.max(C[1] - gz, 0, gz - C[3]) ** 2 < (gw / 2 + 0.8) ** 2)) return false;
        return !(o.inner || []).some(iw => segHitsRect(iw, [C[0] - 0.2, C[1] - 0.2, C[2] + 0.2, C[3] + 0.2]));
      };
      for (const c of cands) {
        const A = { ...c, from: 0, to: 1 };
        if (!okSt(A)) continue;
        const out = [A];
        for (let k = 1; k < (o.storeys || 1) - 1; k++) {
          const prev = out[out.length - 1], ax = prev.dir === 'e' || prev.dir === 'w', inward = ax ? (prev.z < D0 / 2 ? 1 : -1) : (prev.x < W0 / 2 ? 1 : -1);
          const B = { ...prev, from: k, to: k + 1, dir: { n: 's', s: 'n', e: 'w', w: 'e' }[prev.dir], x: ax ? prev.x : prev.x + inward * 2.0, z: ax ? prev.z + inward * 2.0 : prev.z };
          if (!okSt(B)) { out.length = 0; break; }
          out.push(B);
        }
        if (out.length) return out;
      }
      return [];
    };
    const cuts = [];
    const cut = (pts, h = TUN_Y) => cuts.push([pts, h]);
    const winRow = (side, len, from = 1.5, every = 3.2, w0 = 1.4) => { const out = []; for (let s = from; s + w0 < len - 0.8; s += every) out.push({ side, at: s, w: w0, sill: 1.0 }); return out; };
    // building + furniture in one go
    const house = (o, kind = 'home', fo = {}) => {
      navAlign(o);
      const S = o.storeys || 1;
      if (S > 1 && o.floors !== false && !o.stairs) o.stairs = planStairs(o);
      if (S > 1 && o.floors !== false && o.upWin !== false) for (let k = 1; k < S; k++) for (const sd of ['n', 's', 'e', 'w']) {
        const L = sd === 'n' || sd === 's' ? o.w : o.d; if (L < 6) continue;
        for (const d0 of winRow(sd, L, 1.6, 3.4, 1.2)) if (!(o.doors || []).some(e => (e.storey || 0) === k && e.side === sd && d0.at < e.at + e.w + 0.4 && e.at < d0.at + d0.w + 0.4)) (o.doors ||= []).push({ ...d0, storey: k });
      }
      if (S > 1 && o.floors !== false && o.upInner !== false && o.w >= 10) {
        const xw = Math.round(o.w * 0.5), iw = [xw, 0, xw, o.d, [{ at: o.d / 2 - 0.8, w: 1.6 }]];
        for (let k = 1; k < S; k++) if (!(o.stairs || []).some(st => segHitsRect(iw, stairRect(o, st, 1.3)))) (o.inner ||= []).push([...iw, k]);
      }
      o._aligned = false; navAlign(o);          // the upstairs partitions too
      const b = bldg(o); furnish(o, kind, fo, b);
      if (S > 1 && o.floors !== false) for (let k = 1; k < S; k++) furnish(o, kind, { ...fo, storey: k, cont0: fo.upCont ?? Math.max(1, Math.round(o.w * o.d / 45)), fill: 0.6 }, b);
      return b;
    };
    const localOf = (o, x, z) => { const [ux, uz] = unrotPt(o.rot ? rotFrame(o.x + o.w / 2, o.z + o.d / 2, o.rot) : null, x, z); return [ux - o.x, uz - o.z]; };
    const worldOf = (o, lx, lz) => rotPt(o.rot ? rotFrame(o.x + o.w / 2, o.z + o.d / 2, o.rot) : null, o.x + lx, o.z + lz);
    const vehicle = (kind, x, z, rot) => { w.prop(kind, x, z, rot, { solid: true }); mark(x - 3, z - 3, x + 3, z + 3, 2); };
    const clutter = (cx, cz, r, kinds, n, o = {}) => { let k = 0, t = 0; while (k < n && t++ < n * 12) { const a = rng() * PI * 2, d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (!free(x, z, o.m ?? 1.4, o.mask ?? 3) || !inPlay(x, z)) continue; w.prop(pick(kinds), x, z, rng() * PI * 2, { solid: o.solid ?? true, scale: R(o.s0 ?? 0.85, o.s1 ?? 1.15) }); mark(x - 0.8, z - 0.8, x + 0.8, z + 0.8, 2); k++; } };
    const paintPolyN = (tex, pts, edge = 8, sc = 9) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); }
      for (let z = Math.max(0, Math.floor(b)); z < Math.min(H, d); z++) for (let x = Math.max(0, Math.floor(a)); x < Math.min(W, c); x++) { const px = x + 0.5, pz = z + 0.5; if (!pointInPoly(px, pz, pts)) continue; if (polyEdgeDist(pts, px, pz) < N2(px, pz, sc) * edge * 1.6) continue; if (occ(px, pz) & 3) continue; w.paint(tex, x, z, x + 1, z + 1); } };
    const perched = (kind, x, z, perch, y, o = {}) => w.arkSpawn(kind, x, z, { count: 1, radius: 0, perch, y, ...o });
    const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
    // open-deck perch tower (deck top 7.0 m); only the legs collide so the deck's ARK sees out
    const perchTower = (x, z, arkKind = null, model = 'gg_perchtower', f = null, yb = null) => {
      const Y = (y) => (yb == null ? { y } : { yAbs: yb + y });
      w.prop(model, x, z, 0, yb == null ? {} : { yAbs: yb });
      for (const [dx, dz] of [[-1.55, -1.55], [1.55, -1.55], [-1.55, 1.55], [1.55, 1.55]]) w.prop('gg_col', x + dx, z + dz, 0, { ...Y(-0.5), solid: [0.25, 0.25, 7.5] });
      w.prop('gg_col', x, z, 0, { ...Y(6.5), solid: [2.0, 2.0, 0.5] });
      w.prop('gg_col', x, z - 1.95, 0, { ...Y(7.0), solid: [2.0, 0.08, 1.0] });
      w.prop('gg_col', x - 1.95, z, 0, { ...Y(7.0), solid: [0.08, 2.0, 1.0] }); w.prop('gg_col', x + 1.95, z, 0, { ...Y(7.0), solid: [0.08, 2.0, 1.0] });
      w.prop('gg_col', x - 1.35, z + 1.95, 0, { ...Y(7.0), solid: [0.65, 0.08, 1.0] }); w.prop('gg_col', x + 1.35, z + 1.95, 0, { ...Y(7.0), solid: [0.65, 0.08, 1.0] });
      w.ladder(x, z + 2.55, null, x, z + 1.45, null, 0);
      mark(x - 3, z - 3, x + 3, z + 4, 2 | 4);
      if (arkKind) perched(arkKind, x, z - 0.4, 'perch_tower', 7.0, { ...(f == null ? {} : { f }), ...(yb == null ? {} : { yAbs: yb + 7.0 }) });
      w.lamp(x + 1.6, z + 1.6, yb == null ? { y: 7.8, model: null, color: 0xe8f4ff, intensity: 1.6, range: 14 } : { yAbs: yb + 7.8, model: null, color: 0xe8f4ff, intensity: 1.6, range: 14 });
    };
    const lightPost = (x, z, color = 0xffe0b0, model = 'lamp', y = 3.6, intensity = 2.2, range = 13) => w.lamp(x, z, { y, color, intensity: Math.max(intensity, 2.2), range: Math.max(range, 13), model });
    const tunnelLamp = (x, z, y = 3.0) => w.lamp(x, z, { y: Math.min(y, 3.2), model: null, color: 0xffd890, intensity: 2.4, range: 12, flicker: rng() < 0.25 ? 0.4 : 0 });
    // extraction sites: the engine draws the lift head / hatch at the marker (engine/extracts.js); keep its clear zone
    const airshaftSite = (id, name, x, z, f) => {
      w.flatten(x - 6.5, z - 6.5, x + 6.5, z + 6.5, null, 3);
      w.paintCircle('concrete', x, z, 6.5, 0.15, x); w.paintCircle('gravel', x, z, 8.5, 0.3, z);
      mark(x - 8, z - 8, x + 8, z + 8, 2 | 4);
      for (let k = -5; k <= 5; k++) { const a = f + PI + k * 0.24, fx = x + Math.sin(a) * 9.5, fz = z + Math.cos(a) * 9.5; w.prop('gg_fence', fx, fz, -a + PI / 2, { solid: [1.2, 0.15, 2] }); }
      for (const sgn of [-1, 1]) { const lx = sgn * 7, lz = -2; lightPost(x + lx * Math.cos(f) + lz * Math.sin(f), z - lx * Math.sin(f) + lz * Math.cos(f), 0xe8f4ff, 'gg_lightmast', 6.5, 2.2, 16); }
      const av = f + PI + 0.9; w.prop('gg_venthouse', x + Math.sin(av) * 7.2, z + Math.cos(av) * 7.2, -av, { solid: true });
      return w.extract(id, name, x, z, { kind: 'airshaft', face: f });
    };
    const hatchSite = (id, name, x, z, f) => {
      w.flatten(x - 2.5, z - 2.5, x + 2.5, z + 2.5, null, 1.5);
      w.paintCircle('gravel', x, z, 3.2, 0.3, x); mark(x - 3, z - 3, x + 3, z + 3, 2 | 4);
      return w.extract(id, name, x, z, { kind: 'hatch', needsKey: 'raider_hatch', face: f });
    };
    const watchtower = (x, z, scale = 1) => {
      w.prop('gg_watchtower', x, z, 0, { scale });
      for (const [dx, dz] of [[-1.55, -1.55], [1.55, -1.55], [-1.55, 1.55], [1.55, 1.55]]) w.prop('gg_col', x + dx * scale, z + dz * scale, 0, { y: -0.5, solid: [0.25, 0.25, 9 * scale] });
      mark(x - 3, z - 3, x + 3, z + 3, 2);
    };
    const stoneWall = (ax, az, bx, bz, h = 1.1, tint = 0xa89880) => { const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.6)); for (let i = 0; i < n; i++) { const x = ax + (bx - ax) * (i + 0.5) / n, z = az + (bz - az) * (i + 0.5) / n; if (w.buildings.some(b => x > b.ax0 - 1.2 && x < b.ax1 + 1.2 && z > b.az0 - 1.2 && z < b.az1 + 1.2)) continue; w.block(x - 0.8, z - 0.4, x + 0.8, z + 0.4, h, 'plaster', { tint, rot: Math.atan2(bz - az, bx - ax) }); } };
    const fenceRun = (pts, gapAt = []) => { for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / 3)), a = Math.atan2(bz - az, bx - ax); for (let t = 0; t < n; t++) { const x = ax + (bx - ax) * (t + 0.5) / n, z = az + (bz - az) * (t + 0.5) / n; if (gapAt.some(([gx, gz, r]) => Math.hypot(x - gx, z - gz) < r)) continue; w.prop('gg_fence', x, z, -a, { solid: true }); } } };
    // local-frame placement helpers for (rotated) defs
    const pl = (o, k, lx, lz, r = 0, opts = { solid: true }) => w.prop(k, ...worldOf(o, lx, lz), r - (o.rot || 0), opts);
    const ct = (o, k, lx, lz, opts = {}) => w.container(k, ...worldOf(o, lx, lz), -(o.rot || 0), opts);
    const tlampL = (o, lx, lz) => tunnelLamp(...worldOf(o, lx, lz));

    // ======================================================================== 4. GATEKEEPING DEPARTMENT (the gate, its towers and the apron)
    const GX = 831, GZ = 420;                       // gate centre: leaves slide north / south across the highway
    const ST_H = 3.4;
    {
      w.raiseRect(752, 368, 866, 472, TUN_Y, 3, 'set');               // the apron + gate yard at tunnel-floor height
      w.paint('concrete', 752, 372, 870, 468); markPoly([[752, 368], [870, 368], [870, 472], [752, 472]], 1 | 4);
      w.paintCircle('concrete', 790, 420, 30, 0.2, 7);
      // north tower: the Lost & Confiscated office (key room upstairs)
      const NT = { x: 820, z: 384, w: 22, d: 24, storeys: 3, storeyH: ST_H, h: ST_H * 3, wall: 'concrete', floor: 'tiles', roof: 'roofTar', tint: 0xc4d0c4, name: 'Lost & Confiscated', floorY: TUN_Y, blend: 1,
        doors: [{ side: 'w', at: 15, w: 2.2 }, { side: 'e', at: 4, w: 2 }, { side: 's', at: 3, w: 2 }, { side: 's', at: 11.8, w: 2.4, storey: 2 }, ...winRow('w', 24, 2, 4, 1.4).filter(d => d.at + d.w < 14.6 || d.at > 17.6), ...winRow('n', 22, 2, 4, 1.4)],
        inner: [[11, 0, 11, 24, [{ at: 6, w: 2 }]], [0, 12, 11, 12, [{ at: 4, w: 1.8 }]],
          [10, 0, 10, 24, [{ at: 17, w: 1.8, door: true, locked: 'confiscation_room' }], 1], [0, 12, 10, 12, [{ at: 3, w: 1.8 }], 1]],
        stairs: [{ x: 18.5, z: 13.75, w: 1.4, dir: 'n', from: 0, to: 1 }, { x: 16.6, z: 4.25, w: 1.4, dir: 's', from: 1, to: 2 }],
        ladders: [{ side: 'n', at: 18 }], upWin: true, upInner: false };
      const NTb = house(NT, 'security', { tier: 2, poi: 'gatekeeping_department', density: 34, upCont: 2 });
      w.keyRoom('confiscation_room', 820, 384, 830, 408, null, { name: 'Lost & Confiscated (Finders Keepers)', poi: 'gatekeeping_department' });
      for (const [lx, lz, k] of [[1.2, 2, 'weapon_case'], [1.2, 6, 'safe'], [1.2, 10, 'security_locker'], [5, 1.2, 'weapon_case'], [8.6, 3, 'ammo_box'], [1.2, 15, 'electronics'], [1.2, 20, 'suitcase'], [6, 22.6, 'weapon_case']])
        w.container(k, 820 + lx, 384 + lz, 0, { tier: 3, room: 'confiscation_room', poi: 'gatekeeping_department', bid: NTb.id, yRel: ST_H });
      for (const [lx, lz] of [[4, 8], [7, 16], [4, 19]]) w.prop('shelf', 820 + lx, 384 + lz, PI / 2, { solid: true, bid: NTb.id, yRel: ST_H });
      w.lamp(825, 396, { yAbs: TUN_Y + ST_H + 2.6, model: null, color: 0xffe0a0, intensity: 1.2, range: 9 });
      // south tower: the Password Reset Center (gate control room on the top floor)
      const ST = { x: 820, z: 432, w: 22, d: 24, storeys: 3, storeyH: ST_H, h: ST_H * 3, wall: 'concrete', floor: 'tiles', roof: 'roofTar', tint: 0xc4d0c4, name: 'Password Reset Center', floorY: TUN_Y, blend: 1,
        doors: [{ side: 'w', at: 6, w: 2.2 }, { side: 'e', at: 18, w: 2 }, { side: 'n', at: 3, w: 2 }, { side: 'n', at: 11.8, w: 2.4, storey: 2 },
          ...winRow('w', 24, 10, 4, 1.4), ...winRow('s', 22, 2, 4, 1.4), ...[1.5, 6, 14.5, 19].map(at => ({ side: 'w', at, w: 3, sill: 0.9, storey: 2 })), ...[1.5, 6, 11, 16].map(at => ({ side: 's', at, w: 3.4, sill: 0.9, storey: 2 }))],
        inner: [[11, 0, 11, 24, [{ at: 14, w: 2 }]], [11, 12, 22, 12, [{ at: 4, w: 1.8 }]], [0, 12, 11, 12, [{ at: 6, w: 1.8 }], 1]],
        stairs: [{ x: 18.5, z: 3.0, w: 1.4, dir: 's', from: 0, to: 1 }, { x: 16.6, z: 12.75, w: 1.4, dir: 'n', from: 1, to: 2 }],
        ladders: [{ side: 's', at: 19.5 }], upWin: false, upInner: false };
      const STb = house(ST, 'office', { tier: 2, cont: 'security', poi: 'gate_control_room', density: 40, upCont: 2 });
      for (let i = 0; i < 4; i++) w.prop('gg_console', 820.8, 434 + i * 5.2, PI / 2, { solid: true, bid: STb.id, yRel: ST_H * 2 });
      for (let i = 0; i < 4; i++) w.prop('gg_console', 822.5 + i * 4.6, 455.2, PI, { solid: true, bid: STb.id, yRel: ST_H * 2 });
      w.prop('gg_server', 840.6, 440, -PI / 2, { solid: true, bid: STb.id, yRel: ST_H * 2 }); w.prop('gg_server', 840.6, 443, -PI / 2, { solid: true, bid: STb.id, yRel: ST_H * 2 });
      for (const [x, z, k] of [[826, 446, 'electronics'], [834, 452, 'safe'], [836, 438, 'electronics']]) w.container(k, x, z, 0, { tier: 3, poi: 'gate_control_room', bid: STb.id, yRel: ST_H * 2 });
      w.lamp(828, 446, { yAbs: TUN_Y + ST_H * 2 + 2.6, model: null, color: 0x9affc8, intensity: 1.3, range: 10 });
      w.prop('gg_bb_gate', 831, 455, 0, { yAbs: TUN_Y + ST_H * 3 + 0.25 });
      // the gate walk: a steel bridge across the gate between the towers' top floors (sentinel post)
      const WALK_Y = TUN_Y + ST_H * 2;
      w.bridge([[GX + 2, 408.1], [GX + 2, 431.9]], 2.6, WALK_Y, 'metalPanel', { pillars: 0, thick: 0.5 });
      perched('sentinel', GX + 2, 420, 'gate_walk', 0, { yAbs: WALK_Y, f: PI / 2 + PI });
      w.prop('gg_txt_gate', 831, 394, 0, { bid: NTb.id, yRel: ST_H * 3 + 0.27 });
      // the leaves: jammed two-thirds shut (Forgot My Password), a 10 m gap left for traffic
      w.prop('gg_gateleaf', GX, 411.6, -PI / 2, { solid: true }); w.prop('gg_gateleaf', GX, 428.4, -PI / 2, { solid: true });
      w.block(GX - 1.2, 408, GX + 1.2, 408.6, 0.3, 'metalPanel', { tint: 0x707070 }); w.block(GX - 1.2, 431.4, GX + 1.2, 432, 0.3, 'metalPanel', { tint: 0x707070 });
      for (let z = 409; z < 432; z += 1) w.prop('gg_lane', GX, z, PI / 2, { y: 0.03 });   // the leaves' track
      for (let z = 416; z < 425; z += 3) w.prop('gg_chevron', GX - 4, z, 0, { y: 0.03 });
      // curtain walls from the towers back into the Shelf's buttresses
      for (const [z0, z1] of [[346, 384], [456, 494]]) { w.block(GX - 3, z0, GX + 3, z1, 7.6, 'damConcrete', { tint: 0xb8c4b8, seed: 3 }); w.block(GX - 3.3, z0, GX + 3.3, z1, 0.5, 'metalPanel', { y0: TUN_Y + 7.6, tint: 0x4a7a5e }); mark(GX - 4, z0, GX + 4, z1, 2 | 4); }
      // apron dressing: inspection lanes, turnstiles for pedestrians, queue of trucks, chicane, floodlights, gantry
      w.prop('gg_gantry', 796, 420, -PI / 2, {}); w.prop('gg_col', 796, 410.2, 0, { y: -0.5, solid: [0.4, 0.4, 9] }); w.prop('gg_col', 796, 429.8, 0, { y: -0.5, solid: [0.4, 0.4, 9] });
      for (const z of [408, 432]) for (let x = 762; x < 816; x += 3.2) w.prop('gg_curb', x, z, 0, { solid: true });
      for (const [x, z] of [[806, 414], [806, 426]]) w.prop('gg_txt_hold', x, z, 0, { y: 0.03 });
      for (const [x, z] of [[814, 394], [814, 446]]) w.prop('gg_turnstile', x, z, PI / 2, { solid: true });
      for (const [x, z, k, r] of [[770, 414, 'gg_truck', -PI / 2 + 0.05], [782, 426, 'gg_van', -PI / 2], [758, 425, 'car', -PI / 2 + 0.1], [790, 414, 'car', -PI / 2], [804, 426, 'gg_truck', -PI / 2 - 0.08]]) { vehicle(k, x, z, r); w.container('car_trunk', x - 3.4, z, 0, { tier: 1, poi: 'gatekeeping_department' }); }
      for (const [x, z] of [[766, 392], [774, 388], [782, 392], [766, 448], [774, 452], [782, 448]]) w.prop('gg_barrier', x, z, 0.3 * (x % 2 ? 1 : -1), { solid: true });
      for (const [x, z] of [[800, 388], [800, 452]]) { for (let k = -1; k <= 1; k++) w.prop('sandbag', x + k * 1.8, z, 0, { solid: true }); w.container('ammo_box', x, z + (z < 420 ? -1.4 : 1.4), 0, { tier: 2, poi: 'gatekeeping_department' }); }
      for (const [x, z] of [[760, 376], [760, 464], [814, 376], [814, 464], [852, 378], [852, 462]]) w.lamp(x, z, { y: 6.5, model: 'gg_lightmast', color: 0xe8f4ff, intensity: 2.6, range: 21 });
      for (const [x, z] of [[GX - 4, 388], [GX - 4, 452]]) w.prop('gg_flag', x, z, 0, { solid: true });
      // the gate yard behind it: barrier stacks, a generator, crates, the portal facade on the Shelf face
      for (const [x, z, k, r] of [[848, 386, 'gg_container2', PI / 2], [848, 456, 'gg_container3', PI / 2], [858, 392, 'gg_generator', 0], [856, 448, 'gg_crates', 0.3], [846, 404, 'gg_barrier', PI / 2], [846, 436, 'gg_barrier', PI / 2]]) w.prop(k, x, z, r, { solid: true });
      for (const [x, z, k] of [[852, 398, 'crate'], [852, 444, 'toolbox'], [860, 404, 'ammo_box']]) w.container(k, x, z, 0, { tier: 2, poi: 'gatekeeping_department' });
      w.prop('gg_portal', 869.6, 420, -PI / 2, {});
      w.lamp(GX, 420, { yAbs: WALK_Y + 3.4, model: null, color: 0x9affc8, intensity: 0.9, range: 12 });
      w.zone('Gatekeeping Department', [[750, 340], [872, 340], [872, 500], [750, 500]], { tier: 3 });
      w.poi('gatekeeping_department', 'Gatekeeping Department', GX, 420, 38, { tier: 3 });
      w.poi('gate_control_room', 'Password Reset Center', 831, 444, 13, { tier: 3 });
      perchTower(756, 378, 'turret', 'gg_perchtower', faceTo(756, 378, 800, 420));
      perchTower(756, 462, 'turret', 'gg_perchtower', faceTo(756, 462, 800, 420));
      w.arkSpawn('bastion', 790, 420, { count: 1, radius: 16, patrol: [[760, 420], [700, 428], [640, 420]], notCondition: 'matriarch' });
      w.arkSpawn('wasp', 790, 404, { count: 3, patrol: [[760, 380], [860, 380], [860, 460], [760, 460]] });
      w.arkSpawn('tick', 826, 396, { count: 2, radius: 4, habitat: 'indoor' }); w.arkSpawn('tick', 826, 446, { count: 2, radius: 4, habitat: 'indoor' });
      w.arkSpawn('turret', 826, 393, { habitat: 'indoor', f: faceTo(826, 393, 826, 405) });
    }

    // ---------------------------------------------------------------- Take-a-Number Reception (fortified visitor centre north of the apron)
    {
      const RC = { x: 762, z: 334, w: 34, d: 26, storeys: 2, storeyH: 3.4, h: 6.8, wall: 'concrete', floor: 'tiles', roof: 'roofTar', tint: 0xd4d6cc, name: 'Take-a-Number Reception', floorY: TUN_Y, blend: 2,
        doors: [{ side: 's', at: 14, w: 3.4 }, { side: 'e', at: 4, w: 2 }, { side: 'w', at: 18, w: 2 }, { side: 'n', at: 26, w: 2 }, ...winRow('s', 34, 2, 4, 1.6).filter(d => d.at + d.w < 13.6 || d.at > 17.8), ...winRow('w', 26, 2, 4, 1.4).filter(d => d.at + d.w < 17.6 || d.at > 20.4)],
        inner: [[0, 12, 22, 12, [{ at: 4, w: 2 }, { at: 14, w: 2 }]], [22, 0, 22, 26, [{ at: 6, w: 2 }, { at: 18, w: 2 }]], [10, 0, 10, 12, [{ at: 5, w: 1.8 }]]],
        ladders: [{ side: 'w', at: 6 }], upInner: true };
      const RCb = house(RC, 'office', { tier: 2, cont: 'security', poi: 'reinforced_reception', density: 40, upCont: 4, avoid: [[1, 13, 21, 25]] });
      // the waiting room: rows of benches facing the security desk, the ticket machine, a "now serving" board
      for (let r = 0; r < 3; r++) for (const lx of [6, 15]) w.prop('gg_pew', 762 + lx, 334 + 18 + r * 2.6, 0, { solid: true });
      w.prop('gg_desk', 770, 347.4, 0, { solid: true }); w.prop('gg_desk', 773.4, 347.4, 0, { solid: true }); w.prop('gg_console', 781, 347.6, 0, { solid: true });   // the security desk (quest)
      w.prop('gg_ticket', 781, 358, 0, { solid: true });
      w.container('security_locker', 763.4, 347.6, 0, { tier: 3, poi: 'reinforced_reception' });
      w.prop('gg_printer', 790, 340, 0, { solid: true }); w.container('electronics', 790, 341.4, 0, { tier: 2, poi: 'reinforced_reception', note: 'security_code_printer' });
      void RCb;
      // fortifications: sandbag walls, barriers, a guard booth at the door
      for (const [x, z, r] of [[770, 364, 0], [773, 364, 0], [786, 364, 0], [789, 364, 0], [760, 344, PI / 2], [760, 347, PI / 2]]) w.prop('sandbag', x, z, r, { solid: true });
      for (const [x, z] of [[774, 368], [784, 368], [798, 356]]) w.prop('gg_barrier', x, z, 0, { solid: true });
      w.prop('gg_toll', 792, 366, 0, { solid: true });
      for (const [x, z] of [[760, 332], [798, 332]]) lightPost(x, z);
      w.zone('Take-a-Number Reception', [[752, 326], [804, 326], [804, 370], [752, 370]], { tier: 3 });
      w.poi('reinforced_reception', 'Take-a-Number Reception', 779, 347, 28, { tier: 3 });
      w.arkSpawn('wasp', 779, 347, { count: 2, patrol: [[750, 320], [810, 320], [810, 372], [750, 372]] });
      w.arkSpawn('tick', 770, 342, { count: 2, habitat: 'indoor' });
      perched('turret', 794, 340, 'reception_roof', 6.8 + 0.25, { f: faceTo(794, 340, 780, 400) });
    }

    // ======================================================================== 5. THE SHELF: tunnels (cut-and-cover halls) + the surface
    const UND = { under: UNDER, floorY: SHELF_Y, blend: 0, wall: 'damConcrete', floor: 'concrete', roof: 'grass', vents: 0, tint: 0xc8c8c0, perStorey: false };
    const grates = (len, along = 'x', wdt = 18) => { const out = []; for (let s = 8; s < len - 4; s += 20) { const e = along === 'z' ? [wdt / 2 - 1.5, s, wdt / 2 + 1.5, s + 2.2, 0.3] : [s, wdt / 2 - 1.5, s + 2.2, wdt / 2 + 1.5, 0.3]; e.tex = 'metalPanel'; out.push(e); } return out; };
    const full = (side, len) => ({ side, at: 0.6, w: len - 1.2, lintel: false });
    const stTop = (x, z, dir, sw = 2.4) => ({ x, z, w: sw, dir, from: 0, to: 'top' });
    const L_TOP = Math.ceil((UNDER + 0.02) / 0.38) * 0.55;
    const underHalls = [];
    const hall = (o) => { const b = bldg(o); underHalls.push(o); return b; };
    // --- surface buildings next to the halls first (flatten order)
    // Chapel of Five-Nines Uptime: the server vault's congregation (satellite dishes on its roof)
    {
      const CH = { x: 908, z: 222, w: 16, d: 28, storeys: 2, h: 7.4, floors: false, wall: 'plaster', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', tint: 0xe8e2d4, name: 'Chapel of Five-Nines Uptime', floorY: SHELF_Y, blend: 2,
        doors: [{ side: 'n', at: 6.6, w: 2.8 }, ...winRow('w', 28, 3, 5, 1.2), ...winRow('e', 28, 3, 5, 1.2)], inner: [[0, 22, 16, 22, [{ at: 7, w: 2 }]]] };
      bldg(CH);
      for (let r = 0; r < 5; r++) { w.prop('gg_pew', 913, 228 + r * 3, 0, { solid: true }); w.prop('gg_pew', 919, 228 + r * 3, 0, { solid: true }); }
      w.prop('gg_server', 916, 246, PI, { solid: true });   // the altar is a server rack. Of course it is.
      w.container('cabinet', 910, 247, 0, { tier: 2, poi: 'data_vault' }); w.container('electronics', 922, 247, 0, { tier: 2, poi: 'data_vault' }); w.container('basket', 922.4, 225, 0, { tier: 1, poi: 'data_vault' });
      w.block(924, 238, 930, 244, 13, 'plaster', { tint: 0xe8e2d4 }); w.block(923.6, 237.6, 930.4, 244.4, 0.8, 'roofTile', { y0: SHELF_Y + 12.8, collide: false });
      w.prop('gg_dish', 912, 232, 0.6, { y: 8.2 }); w.prop('gg_dish', 920, 240, -0.4, { y: 8.2 }); w.prop('gg_dish', 914, 244, 2.0, { y: 8.2 });
      w.lamp(916, 236, { y: 4.4, model: null, color: 0x9ad0ff, intensity: 0.9, range: 10, flicker: 0.15 });
    }
    // Head Office: the ventilation headhouse on the Shelf (its plant room is the hall to the west)
    const HO = { x: 998, z: 442, w: 32, d: 30, storeys: 2, storeyH: 3.6, h: 7.2, wall: 'concrete', floor: 'concrete', roof: 'roofTar', tint: 0xc8ccc0, name: 'Head Office', floorY: SHELF_Y, blend: 2,
      doors: [{ side: 'w', at: 11, w: 3 }, { side: 's', at: 22, w: 2.4 }, { side: 'n', at: 6, w: 2 }, ...winRow('s', 32, 2, 4, 1.6).filter(d => d.at + d.w < 21.6 || d.at > 24.8), ...winRow('e', 30, 2, 4, 1.4)],
      inner: [[16, 0, 16, 30, [{ at: 6, w: 2 }, { at: 20, w: 2 }]], [0, 18, 16, 18, [{ at: 6, w: 2 }]]], ladders: [{ side: 'e', at: 26 }], upInner: true,
      roofExtras: [[3, 3, 9, 9, 0.6], [20, 3, 28, 9, 0.6]] };
    {
      const HOb = house(HO, 'industrial', { tier: 2, poi: 'headhouse', density: 36, upCont: 3 });
      for (const [x, z] of [[1004, 448], [1022, 448]]) w.prop('gg_bigfan', x, z, 0, { bid: HOb.id, yRel: 7.2 + 0.25 + 0.6 });
      for (const [x, z] of [[994, 446], [994, 466], [1034, 446], [1034, 470]]) lightPost(x, z, 0xe8f4ff, 'gg_lightmast', 6.5, 2.2, 16);
      w.prop('gg_transformer', 1036, 458, PI / 2, { solid: true }); w.prop('gg_pipes', 1014, 478, 0, { solid: true });
      w.container('raider_cache', 1027, 476, 0, { tier: 3, poi: 'headhouse' });
    }
    // Take a look from the top: Scenic Overlook (Premium Tier) on the Shelf's south-west promontory
    {
      const OY = w.groundAt(884, 600), DY = OY + 2.2;
      w.block(878, 594, 892, 606, 0.5, 'wood', { y0: DY - 0.5 }); for (const [x, z] of [[878.5, 594.5], [891.5, 594.5], [878.5, 605.5], [891.5, 605.5]]) w.block(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 2.4, 'wood', { y0: OY - 0.2, collide: false });
      for (let k = 0; k < 6; k++) w.block(892 + k, 597, 893 + k, 601, 0.4 * (6 - k), 'wood', { y0: OY - 0.1 });
      for (const [a, b, c, d] of [[878, 594, 892, 594.3], [878, 605.7, 892, 606], [878, 594, 878.3, 606]]) w.block(a, b, c, d, 1.0, 'wood', { y0: DY, xray: false });
      w.prop('gg_scope', 881, 597, 0, { yAbs: DY }); w.prop('gg_scope', 885, 596.5, 0, { yAbs: DY }); w.prop('gg_dish', 889, 603, -0.6, { yAbs: DY + 0.5 });
      w.container('electronics', 884, 603, 0, { tier: 2, poi: 'ridgeline', note: 'observation_deck', yAbs: DY });
      w.prop('gg_bench', 872, 590, 0.3, { solid: true }); w.prop('gg_bench', 896, 610, -0.4, { solid: true });
      mark(870, 588, 904, 612, 2 | 4);
      // shacks along the crest below
      house({ x: 836, z: 640, w: 9, d: 7, h: 3, wall: 'wood', floor: 'wood', roof: 'corrugated', name: 'Overlook Ticket Hut', doors: [{ side: 'e', at: 2, w: 1.6 }, { side: 'n', at: 2, w: 1.2, sill: 1 }] }, 'shed', { tier: 1, poi: 'ridgeline' });
      w.prop('gg_forsale', 846, 652, 0, { solid: true });
      house({ x: 800, z: 684, w: 8, d: 7, h: 3, wall: 'wood', floor: 'wood', roof: 'corrugated', name: 'Ridge Hut', doors: [{ side: 'n', at: 2, w: 1.6 }] }, 'shed', { tier: 1, poi: 'ridgeline' });
      w.poi('ridgeline', 'Scenic Overlook (Premium Tier)', 862, 628, 46, { tier: 1 });
      w.arkSpawn('leaper', 840, 650, { radius: 30 }); w.arkSpawn('wasp', 870, 620, { count: 2, patrol: [[890, 600], [840, 640], [800, 700], [850, 690]] });
      perched('sentinel', 885, 600, 'overlook_deck', 0, { yAbs: DY, f: faceTo(885, 600, 790, 520) });
    }

    // --- the halls
    {
      // Tunnel Vision: the road tunnel straight into the Shelf (portal on the gate yard, cave-in at the far end)
      const TT = { ...UND, x: 870, z: 404, w: 160, d: 32, name: 'Tunnel Vision', roofExtras: grates(160, 'x', 32),
        doors: [full('w', 32), { side: 'n', at: 54.6, w: 14.8, lintel: false }, { side: 's', at: 22.4, w: 11.2, lintel: false }, { side: 's', at: 96.4, w: 11.2, lintel: false }] };
      hall(TT);
      cut([[864, 404.6], [872.4, 404.6], [872.4, 435.4], [864, 435.4]]);
      for (let lx = 8; lx < 146; lx += 6) pl(TT, 'gg_laney', lx, 16, 0, { y: 0.03 });
      for (let lx = 10; lx < 146; lx += 9) { pl(TT, 'gg_lane', lx, 9.5, 0, { y: 0.03 }); pl(TT, 'gg_lane', lx, 22.5, 0, { y: 0.03 }); }
      for (let lx = 10; lx < 156; lx += 15) tlampL(TT, lx, 16);
      for (const [lx, lz, r] of [[155, 6, 0.2], [153, 15, 2.1], [156, 24, 4.0], [149, 28, 1.0], [146, 10, 2.6]]) pl(TT, 'gg_rubble', lx, lz, r);   // the cave-in
      for (const [lx, lz, r, k] of [[16, 10, PI / 2, 'car'], [34, 22, -PI / 2, 'gg_bus'], [72, 9, PI / 2 + 0.2, 'gg_van'], [92, 23, -PI / 2, 'car'], [118, 10, PI / 2, 'gg_truck'], [134, 22, -PI / 2 + 0.15, 'car']]) { pl(TT, k, lx, lz, r); mark(870 + lx - 3, 404 + lz - 3, 870 + lx + 3, 404 + lz + 3, 2); }
      pl(TT, 'gg_patrolcar', 104, 9, PI / 2 + 0.12);       // the armoured patrol car (key room 'patrol_car': its locked trunk)
      w.keyRoom('patrol_car', 870 + 100.5, 404 + 6, 870 + 107.5, 404 + 12, null, { name: 'Patrol Car Trunk (Full of Fines)', poi: 'traffic_tunnel' });
      ct(TT, 'car_trunk', 101.2, 9, { tier: 3, room: 'patrol_car', locked: 'patrol_car', poi: 'traffic_tunnel' });
      for (const [lx, lz, k] of [[8, 2.6, 'toolbox'], [40, 29.4, 'crate'], [62, 2.6, 'arc_crate'], [84, 29.4, 'toolbox'], [126, 2.6, 'raider_cache'], [140, 29.4, 'ammo_box'], [112, 29.4, 'trash'], [144, 2.6, 'electronics'], [24, 29.4, 'locker']])
        ct(TT, k, lx, lz, { tier: 2, poi: 'traffic_tunnel' });
      for (const [lx, lz] of [[28, 5], [56, 26], [88, 5], [122, 27]]) pl(TT, 'gg_barrier', lx, lz, 0);
      for (let i = 0; i < 26; i++) { const lx = R(6, 144), lz = pick([R(3, 6), R(26, 29)]); pl(TT, pick(['debris', 'barrel', 'gg_cone', 'gg_crates', 'barrelBlue', 'gg_pallet', 'debris']), lx, lz, rng() * 6, { solid: true }); }
      for (const lx of [20, 60, 100, 140]) { pl(TT, 'gg_lockers', lx, 1.7, 0); pl(TT, 'gg_lockers', lx + 18, 30.3, PI); }   // emergency cabinets along the walls
      pl(TT, 'gg_txt_slow', 10, 9.5, 0, { y: 0.03 }); pl(TT, 'gg_txt_slow', 10, 22.5, 0, { y: 0.03 });
      perched('sentinel', ...worldOf(TT, 150, 16), 'tunnel_floor', 0, { habitat: 'indoor', f: faceTo(1020, 420, 870, 420) });
      w.arkSpawn('tick', ...worldOf(TT, 40, 16), { count: 3, habitat: 'indoor' });
      w.arkSpawn('pop', ...worldOf(TT, 100, 16), { count: 2, habitat: 'indoor' });
      w.arkSpawn('shredder', ...worldOf(TT, 70, 16), { habitat: 'indoor', patrol: [worldOf(TT, 12, 16), worldOf(TT, 140, 16)] });
      w.poi('traffic_tunnel', 'Tunnel Vision', 965, 402, 50, { tier: 3, underground: true });

      // the service gallery north to the Cloud
      const GA = { ...UND, x: 924, z: 300, w: 16, d: 104, name: 'Server Gallery', roofExtras: grates(104, 'z', 16), doors: [full('n', 16), full('s', 16)], inner: [[1, 40, 4, 40, []], [12, 40, 15, 40, []], [1, 72, 4, 72, []], [12, 72, 15, 72, []]] };
      hall(GA);
      cut([[924.6, 402.6], [939.4, 402.6], [939.4, 407.4], [924.6, 407.4]]);
      for (let lz = 8; lz < 100; lz += 16) tlampL(GA, 8, lz);
      for (let lz = 6; lz < 100; lz += 7) { pl(GA, 'gg_pipes', 1.9, lz, PI / 2); }
      for (const [lx, lz, k] of [[13.4, 20, 'toolbox'], [13.4, 58, 'electronics'], [13.4, 88, 'locker']]) ct(GA, k, lx, lz, { tier: 2, poi: 'data_vault' });
      w.arkSpawn('tick', 932, 350, { count: 2, habitat: 'indoor' });

      // The Cloud (Basement): server vault with a strongroom; emergency stair up to the Shelf
      const DV = { ...UND, x: 902, z: 254, w: 48, d: 46, name: 'The Cloud (Basement)', wall: 'concrete', floor: 'metalPanel',
        doors: [{ side: 's', at: 22.4, w: 15.2, lintel: false }],
        inner: [[34, 1, 34, 14, [{ at: 4, w: 2, door: true }]], [34, 14, 47, 14, []], [1, 12, 14, 12, [{ at: 5, w: 2 }]], [14, 1, 14, 12, []]],
        stairs: [stTop(48 - 0.8 - L_TOP, 26, 'e')] };
      hall(DV);
      cut([[924.6, 298.6], [939.4, 298.6], [939.4, 301.4], [924.6, 301.4]]);
      for (let row = 0; row < 4; row++) for (const x0 of [906, 920]) for (let i = 0; i < 12; i++) w.prop('gg_server', x0 + i * 0.72, 272 + row * 5, row % 2 ? PI : 0, { solid: true });   // the Cloud, physically
      w.prop('gg_console', 906, 256.6, 0, { solid: true }); w.prop('gg_desk', 910, 256.6, 0, { solid: true }); w.prop('gg_console', 944, 296, -PI / 2, { solid: true });
      for (const [x, z, k] of [[904.6, 258, 'electronics'], [912, 265, 'desk'], [930, 296, 'electronics'], [946, 290, 'electronics'], [904.6, 290, 'cabinet'], [920, 258, 'electronics']]) w.container(k, x, z, 0, { tier: 2, poi: 'data_vault' });
      for (const [x, z, k] of [[938, 256.4, 'safe'], [944, 256.4, 'electronics'], [947.4, 262, 'security_locker'], [941, 265, 'weapon_case']]) w.container(k, x, z, 0, { tier: 3, poi: 'data_vault' });   // strongroom
      w.lamp(918, 280, { y: 2.8, model: null, color: 0x80c8ff, intensity: 1.5, range: 13 }); w.lamp(942, 260, { y: 2.8, model: null, color: 0x80c8ff, intensity: 1.1, range: 8 }); w.lamp(908, 260, { y: 2.8, model: null, color: 0x80c8ff, intensity: 1.0, range: 8 });
      w.arkSpawn('tick', 920, 282, { count: 2, habitat: 'indoor' }); w.arkSpawn('turret', 930, 290, { habitat: 'indoor', f: faceTo(930, 290, 930, 262) });
      w.poi('data_vault', 'The Cloud (Basement)', 924, 268, 40, { tier: 3, underground: true });

      // Pothole Repair Depot: the tunnel's maintenance garage (south side, by the portal)
      const DP = { ...UND, x: 878, z: 436, w: 40, d: 26, name: 'Pothole Repair Depot', roofExtras: grates(40, 'x', 26),
        doors: [{ side: 'n', at: 14.4, w: 11.2, lintel: false }], inner: [[28, 12, 39, 12, [{ at: 3, w: 2 }]], [28, 1, 28, 12, [{ at: 4, w: 2 }]]],
        stairs: [stTop(2, 25 - 0.8 - L_TOP, 's')] };
      hall(DP);
      cut([[892.6, 432.6], [903.4, 432.6], [903.4, 437.4], [892.6, 437.4]]);
      for (const [lx, lz, k, r] of [[10, 14, 'gg_truck', 0.1], [20, 18, 'gg_pallet', 0], [6, 2.4, 'workbench', 0], [12, 2.4, 'workbench', 0], [22, 21, 'gg_generator', 0], [36, 20, 'gg_crates', 0], [32, 7, 'gg_desk', 0], [36, 4, 'shelf', -PI / 2], [18, 2.4, 'gg_cone', 0]]) pl(DP, k, lx, lz, r);
      for (const [lx, lz, k, t] of [[2.6, 10, 'toolbox', 2], [26, 2.6, 'toolbox', 2], [30, 23.4, 'arc_crate', 2], [37.4, 9, 'electronics', 2], [33, 10.4, 'desk', 2], [16, 23.4, 'crate', 1]]) ct(DP, k, lx, lz, { tier: t, poi: 'traffic_tunnel' });
      for (const [lx, lz] of [[10, 8], [24, 8], [33, 18]]) tlampL(DP, lx, lz);
      w.arkSpawn('pop', ...worldOf(DP, 18, 12), { count: 2, habitat: 'indoor' });

      // Head Office plant room: the fan hall under the headhouse yard
      const PR = { ...UND, x: 950, z: 436, w: 44, d: 36, name: 'Head Office Plant Room', roofExtras: [],
        doors: [{ side: 'n', at: 16.4, w: 11.2, lintel: false }], inner: [[1, 24, 14, 24, [{ at: 5, w: 3 }]], [30, 24, 43, 24, [{ at: 5, w: 3 }]]],
        stairs: [stTop(44 - 0.8 - L_TOP, 13, 'e')] };
      for (const [x0, z0] of [[8, 8], [28, 8], [8, 26], [28, 26]]) { const e = [x0 - 1, z0 - 1, x0 + 7, z0 + 7, 0.5]; e.tex = 'metalPanel'; PR.roofExtras.push(e); }
      hall(PR);
      cut([[966.6, 432.6], [977.4, 432.6], [977.4, 437.4], [966.6, 437.4]]);
      for (const [lx, lz] of [[11, 11], [31, 11], [11, 29], [31, 29]]) pl(PR, 'gg_fan', lx, lz, lx < 20 ? PI / 2 : -PI / 2, { solid: true, scale: 0.8 });
      pl(PR, 'gg_pipes', 22, 2.2, 0); pl(PR, 'gg_generator', 22, 20, 0); pl(PR, 'gg_transformer', 22, 33.4, 0);
      for (const [lx, lz, k] of [[2.6, 18, 'electronics'], [41.4, 30, 'toolbox'], [16, 33.4, 'arc_crate'], [40, 4, 'locker']]) ct(PR, k, lx, lz, { tier: 2, poi: 'headhouse' });
      for (const [lx, lz] of [[11, 18], [31, 18], [22, 28]]) w.lamp(...worldOf(PR, lx, lz), { y: 2.8, model: null, color: 0xc8e0ff, intensity: 1.5, range: 14 });
      w.arkSpawn('fireball', ...worldOf(PR, 22, 16), { count: 2, habitat: 'indoor' });
      for (const [lx, lz] of [[11, 11], [31, 11], [11, 29], [31, 29]]) w.prop('gg_bigfan', ...worldOf(PR, lx, lz), 0, { surface: true });
      w.poi('headhouse', 'Head Office', 1000, 460, 34, { tier: 2 });
    }

    // --- Coming Soon Estates: an unfinished luxury cul-de-sac up on the Shelf
    {
      w.paint('moss', 962, 192, 1046, 218); w.paint('moss', 962, 168, 1046, 178);
      w.road([[956, 205], [1030, 205]], 7, 'asphalt', { edge: 'concrete', edgeW: 1.4, level: false }); w.paintCircle('asphalt', 1036, 205, 9, 0, 2); w.paintCircle('concrete', 1036, 205, 3, 0, 2);
      w.prop('gg_well', 1036, 205, 0, { solid: true });   // the decorative fountain (dry since Phase 1)
      for (let x = 964; x < 1028; x += 4) { if ((x / 4) % 4 === 1) continue; w.prop('gg_bush', x, 197.2, rng() * 6, { solid: true, scale: 0.7 }); w.prop('gg_bush', x + 2, 213, rng() * 6, { solid: true, scale: 0.7 }); }
      for (const [x, z, r] of [[978, 196, PI / 2], [1012, 196, PI / 2 + 0.1], [990, 215, -PI / 2], [1026, 214, -PI / 2 + 0.1]]) w.prop('car', x, z, r, { solid: true });
      const AH = [[966, 180, 12, 10, 's'], [982, 178, 13, 10, 's'], [999, 180, 12, 10, 's'], [1016, 178, 12, 10, 's'], [1032, 182, 11, 10, 's'],
        [966, 218, 12, 10, 'n'], [983, 220, 12, 10, 'n'], [1000, 218, 13, 10, 'n'], [1018, 220, 12, 10, 'n'], [1048, 218, 11, 10, 'n']];
      for (const [x0, z0] of [[968, 136], [990, 134], [1012, 136], [1034, 132]]) { w.paint('concrete', x0, z0, x0 + 13, z0 + 11); for (let k = 0; k < 3; k++) w.prop('gg_strut', x0 + 3 + k * 3.5, z0 + 5.5, PI / 2 + (k - 1) * 0.1, { solid: true, scale: 0.5 }); w.prop('gg_pallet', x0 + 11, z0 + 2, 0.3, { solid: true }); mark(x0, z0, x0 + 13, z0 + 11, 2 | 4); }
      AH.forEach(([x, z, ww, dd, fr], i) => {
        const unfinished = i % 3 === 2, back = fr === 's' ? 'n' : 's';
        const def = { x, z, w: ww, d: dd, storeys: unfinished ? 1 : 2, wall: i % 2 ? 'metalPanel' : 'plaster', tint: [0xe8e0d0, 0xd0d8e0, 0xe8dcc0][i % 3], floor: 'wood', roof: unfinished ? 'corrugated' : 'roofTar', name: unfinished ? 'Unfinished Villa' : 'Luxury Villa', peek: unfinished ? 0.4 : undefined, floorY: SHELF_Y,
          doors: [{ side: fr, at: 2, w: 1.6 }, { side: back, at: ww - 3.5, w: 1.4 }, ...winRow(fr, ww, 5, 3, 1.4), ...(unfinished ? [{ side: 'e', at: 1, w: dd - 2.5 }] : [])],
          inner: [[Math.round(ww / 2), 0, Math.round(ww / 2), dd, [{ at: dd / 2 - 0.8, w: 1.6 }]]] };
        house(def, unfinished ? 'shed' : 'home', { tier: i % 3 === 0 ? 2 : 1, poi: 'abandoned_housing_project' });
        w.prop(unfinished ? 'gg_forsale' : 'gg_mailbox', x + 1, fr === 's' ? z + dd + 1.6 : z - 1.6, 0, { solid: true });
      });
      // the sales pavilion at the head of the cul-de-sac
      house({ x: 1046, z: 192, w: 14, d: 22, storeys: 2, wall: 'plaster', tint: 0xf0e8d8, floor: 'wood', roof: 'roofTile', name: 'Sales Pavilion (Deposit Non-Refundable)', floorY: SHELF_Y,
        doors: [{ side: 'w', at: 9, w: 2 }, { side: 'n', at: 3, w: 1.6 }, ...winRow('w', 22, 2, 4, 1.4).filter(d => d.at + d.w < 8.6 || d.at > 11.4), ...winRow('s', 14, 2, 4)], inner: [[0, 11, 14, 11, [{ at: 4, w: 1.8 }]]] }, 'office', { tier: 2, poi: 'abandoned_housing_project', upCont: 3 });
      w.prop('gg_bb_estates', 958, 214, 0, { solid: true });
      w.prop('gg_crane', 1004, 156, -0.6, { solid: true }); mark(1000, 152, 1008, 160, 2 | 4);
      for (const [x, z, k, r] of [[1030, 246, 'gg_pallet', 0], [1026, 252, 'gg_container3', 0.3], [990, 242, 'gg_logs', 1.2], [958, 166, 'gg_truck', 1.6], [1052, 170, 'gg_crates', 0]]) w.prop(k, x, z, r, { solid: true });
      for (const [x, z] of [[970, 212], [994, 212], [1018, 212], [1030, 198]]) lightPost(x, z, 0xffd8a0);
      w.zone('Coming Soon Estates', [[958, 128], [1062, 128], [1062, 250], [958, 250]], { tier: 2 });
      w.poi('abandoned_housing_project', 'Coming Soon Estates', 994, 200, 56, { tier: 2 });
      w.arkSpawn('pop', 1000, 210, { count: 3 }); w.arkSpawn('tick', 1010, 230, { count: 2, habitat: 'indoor' }); w.arkSpawn('hornet', 1010, 200, { count: 2, patrol: [[960, 150], [1060, 150], [1060, 260], [960, 260]] });
    }
    // the Cloud's chillers + the vault stair on the lid, the Shelf's north road, the airshaft
    {
      for (const [x, z] of [[908, 262], [908, 284], [930, 284]]) w.prop('gg_coolers', x, z, 0, { surface: true, solid: true });
      w.prop('gg_bb_cloud', 954, 252, 0, { solid: true });
      for (const [x, z] of [[952, 272], [952, 286]]) lightPost(x, z, 0x9ad0ff);
      airshaftSite('rage_quit_airshaft', 'Rage Quit Airshaft', 1034, 330, faceTo(1034, 330, 1020, 330));
      w.arkSpawn('surveyor', 990, 330, { count: 1, patrol: [[960, 300], [1040, 280], [1050, 400], [960, 380]] });
      w.arkSpawn('rocketeer', 960, 360, { count: 1, patrol: [[900, 320], [1040, 320], [1040, 520], [900, 520]] });
      w.zone('Shelf', SHELF, { tier: 2 });
    }

    // ======================================================================== 6. TOLL BOOTH OF ETERNAL HOLD MUSIC (checkpoint on the highway)
    {
      const PZ = [[442, 372], [550, 372], [550, 434], [442, 434]];
      w.paintPoly('concrete', PZ); markPoly(PZ, 1 | 4);
      // the booth line across the lanes, under a walkable canopy (ladder at its south end)
      const BX = 500, ZB = [378, 386, 394, 410, 418, 426];
      for (const z of ZB) { w.prop('gg_toll', BX, z, 0, { solid: true }); w.prop('gg_boom', BX + 1.6, z + 1.6, -PI / 2, { solid: true }); w.lamp(BX, z, { y: 3.2, model: null, color: 0xfff0c0, intensity: 0.9, range: 7 }); }
      const CY = w.groundAt(BX, 402) + 5.4;
      w.block(BX - 6, 372.5, BX + 6, 431.5, 0.6, 'metalPanel', { y0: CY, tint: 0xd8dcd0 });
      w.block(BX - 6, 372.5, BX + 6, 373.1, 0.5, 'metalPanel', { y0: CY + 0.6, tint: 0x3a7a5e }); w.block(BX - 6, 430.9, BX + 1.8, 431.5, 0.5, 'metalPanel', { y0: CY + 0.6, tint: 0x3a7a5e }); w.block(BX + 4.2, 430.9, BX + 6, 431.5, 0.5, 'metalPanel', { y0: CY + 0.6, tint: 0x3a7a5e });
      for (const z of [373.4, 389, 402, 415, 430.6]) for (const x of [BX - 5.4, BX + 5.4]) w.block(x - 0.3, z - 0.3, x + 0.3, z + 0.3, CY - w.groundAt(x, z) + 0.05, 'damConcrete', { seed: 2 });
      w.ladder(BX + 3, 433.2, null, BX + 3, 430.6, CY + 0.6, 0);
      w.prop('gg_bb_toll', BX, 431, 0, { yAbs: CY + 0.6 });
      w.container('ammo_box', BX - 3, 380, 0, { tier: 2, poi: 'checkpoint', yAbs: CY + 0.6 }); w.prop('sandbag', BX - 3, 378, 0, { yAbs: CY + 0.6, solid: true });
      perched('sentinel', BX + 2, 398, 'toll_canopy', 0, { yAbs: CY + 0.6, f: PI / 2 + PI });
      // lanes, stop lines, the "wait here" paint
      for (const z of [381, 389, 397, 407, 415, 423]) dashLine([[446, z], [494, z]], 'gg_lane', 2.6);
      for (const z of [381, 389, 397, 407, 415, 423, 429]) dashLine([[507, z], [548, z]], 'gg_lane', 2.6);
      for (const z of [381, 389, 415, 423]) w.prop('gg_txt_wait', 488, z, 0, { y: 0.03 });
      dashLine([[446, 402], [548, 402]], 'gg_laney', 3.2);
      for (const z of [380, 392, 412, 424]) w.prop('gg_chevron', 510, z, 0, { y: 0.03 });
      // queue of vehicles that have been on hold since the Beta Test (buses for the horn quest)
      const VQ = [['gg_bus', 470, 378, -PI / 2], ['gg_truck', 452, 386, -PI / 2], ['car', 484, 386, -PI / 2], ['gg_van', 466, 394, -PI / 2], ['car', 450, 410, -PI / 2], ['gg_bus', 474, 418, -PI / 2],
        ['car', 456, 426, -PI / 2], ['gg_truck', 486, 410, -PI / 2], ['car', 530, 388, -PI / 2], ['gg_van', 540, 418, -PI / 2], ['gg_patrolcar', 520, 426, PI / 2]];
      for (const [k, x, z, r] of VQ) { vehicle(k, x, z, r + (rng() - 0.5) * 0.2); if (k !== 'gg_patrolcar') w.container('car_trunk', x + 3.6, z, 0, { tier: 1, poi: 'checkpoint' }); }
      for (const [x, z] of [[462, 402], [526, 398], [458, 430]]) w.prop('husk', x, z, rng() * 6, { solid: true });
      w.container('arc_husk', 462, 404, 0, { tier: 2, poi: 'checkpoint' });
      // Customer Disservice Centre (customs offices) and the Hold Music Studio north of the plaza
      house({ x: 452, z: 338, w: 28, d: 20, storeys: 2, h: 6.4, wall: 'concrete', floor: 'tiles', roof: 'roofTar', tint: 0xd8dcd0, name: 'Customer Disservice Centre',
        doors: [{ side: 's', at: 12, w: 2.4 }, { side: 'e', at: 4, w: 1.8 }, { side: 'w', at: 14, w: 1.8 }, ...winRow('s', 28, 2, 3.6, 1.6).filter(d => d.at + d.w < 11.6 || d.at > 14.8), ...winRow('n', 28, 2, 4, 1.4)],
        inner: [[10, 0, 10, 20, [{ at: 13, w: 2 }]], [18, 0, 18, 20, [{ at: 13, w: 2 }]], [0, 10, 10, 10, [{ at: 4, w: 1.6 }]], [18, 10, 28, 10, [{ at: 4, w: 1.6 }]]], roofExtras: [[2, 2, 6, 5, 0.9], [20, 12, 25, 16, 0.7]] }, 'office', { tier: 2, poi: 'checkpoint', density: 26 });
      house({ x: 506, z: 344, w: 16, d: 16, h: 3.6, wall: 'concrete', floor: 'tiles', roof: 'roofTar', tint: 0xc8d0c8, name: 'Hold Music Studio', doors: [{ side: 's', at: 7, w: 1.8 }, { side: 'w', at: 3, w: 1.6 }, ...winRow('e', 16, 2, 4)], inner: [[8, 0, 8, 16, [{ at: 4, w: 1.6 }]]] }, 'lab', { tier: 2, poi: 'checkpoint' });
      w.prop('gg_dish', 510, 348, 0.8, { y: 3.85 }); w.prop('antenna', 518, 350, 0, { y: 3.85 });
      // Bus Depot (next bus: never) + staff barracks south of it
      const BD = { x: 450, z: 444, w: 34, d: 22, h: 6.0, wall: 'corrugated', floor: 'concrete', roof: 'corrugated', tint: 0xb8c4bc, name: 'Bus Depot (Next Bus: Never)', doors: [{ side: 'n', at: 3, w: 12, lintel: false }, { side: 'n', at: 19, w: 12, lintel: false }, { side: 's', at: 15, w: 2 }, ...winRow('w', 22, 2, 4, 1.4)] };
      bldg(BD); w.prop('gg_bus', 459, 456, PI, { solid: true }); w.prop('gg_bus', 475, 454, PI + 0.06, { solid: true });
      for (const [x, z, k] of [[452.6, 450, 'workbench'], [482, 462, 'shelf'], [452.6, 460, 'gg_crates']]) w.prop(k, x, z, k === 'shelf' ? PI : PI / 2, { solid: true });
      for (const [x, z, k] of [[452.6, 455, 'toolbox'], [482.6, 448, 'locker'], [466, 464.6, 'crate'], [452.6, 464, 'car_trunk']]) w.container(k, x, z, 0, { tier: 1, poi: 'checkpoint' });
      w.lamp(467, 455, { y: 5.0, model: null, color: 0xfff0d0, intensity: 1.6, range: 14 });
      house({ x: 498, z: 446, w: 26, d: 16, storeys: 2, wall: 'concrete', floor: 'tiles', roof: 'roofTar', tint: 0xd0d4c8, name: 'Staff Barracks', doors: [{ side: 'n', at: 4, w: 2 }, { side: 'e', at: 8, w: 1.8 }, ...winRow('n', 26, 8, 3.4, 1.4)], inner: [[13, 0, 13, 16, [{ at: 7, w: 1.8 }]]] }, 'barracks', { tier: 2, poi: 'checkpoint' });
      // perimeter, watchtowers, floodlights, flags, cones
      for (let i = 0; i < 36; i++) w.prop('gg_cone', R(446, 548), R(374, 432), rng() * 6, {});
      for (const [x, z] of [[446, 434], [548, 372]]) w.prop('gg_flag', x, z, 0, { solid: true });
      for (const [x, z] of [[446, 372], [548, 434], [470, 436], [530, 368]]) w.lamp(x, z, { y: 6.5, model: 'gg_lightmast', color: 0xe8f4ff, intensity: 2.6, range: 21 });
      perchTower(442, 366, 'turret', 'gg_perchtower', faceTo(442, 366, 490, 402));
      perchTower(554, 440, 'turret', 'gg_perchtower', faceTo(554, 440, 500, 402));
      w.arkSpawn('bastion', 520, 402, { count: 1, radius: 20, patrol: [[450, 402], [600, 410]] });
      w.arkSpawn('wasp', 490, 390, { count: 3, patrol: [[446, 376], [548, 376], [548, 430], [446, 430]] });
      w.arkSpawn('tick', 466, 348, { count: 3, radius: 6, habitat: 'indoor' });
      w.arkSpawn('pop', 470, 440, { count: 2 });
      w.arkSpawn('snitch', 500, 360, { count: 1, patrol: [[440, 340], [560, 340], [560, 470], [440, 470]] });
      w.zone('Toll Booth', [[440, 334], [556, 334], [556, 470], [440, 470]], { tier: 2 });
      w.poi('checkpoint', 'Toll Booth of Eternal Hold Music', 496, 402, 62, { tier: 2 });
    }

    // ======================================================================== 7. LAKE ESCROW: the fallen causeway, the boathouse, the purification bunker
    {
      // the causeway: two surviving deck runs; the middle spans lie tilted into the shallows (walk down, wade, climb up)
      w.bridge([[186, 392], [262, 392]], 15, DECK_Y, 'asphalt', { pillars: 14, thick: 0.9, pillarW: 2.2 });
      w.bridge([[308, 392], [384, 392]], 15, DECK_Y, 'asphalt', { pillars: 14, thick: 0.9, pillarW: 2.2 });
      for (const [a, b] of [[190, 262], [308, 380]]) { for (let x = a + 3; x < b - 2; x += 7) { w.prop('gg_laney', x, 392, 0, { yAbs: DECK_Y + 0.02 }); w.prop('gg_lane', x + 3.5, 388, 0, { yAbs: DECK_Y + 0.02 }); w.prop('gg_lane', x + 3.5, 396, 0, { yAbs: DECK_Y + 0.02 }); } }
      for (let k = 0; k < 17; k++) { const top = DECK_Y - (k + 1) * 0.4, y0 = top > 3.2 ? top - 0.9 : -1.2; if (top < 1.2) break; w.block(262 + k * 1.15, 386, 262 + (k + 1) * 1.15, 398, top - y0, 'asphalt', { y0, cutaway: false }); w.block(308 - (k + 1) * 1.15, 386.5, 308 - k * 1.15, 397.5, top - y0, 'asphalt', { y0, cutaway: false }); }
      for (const [x, z, r] of [[284, 384, 0.4], [287, 401, 2.0], [278, 380, 1.2], [295, 403, 2.8]]) w.prop('gg_rubble', x, z, r, { solid: true });
      w.prop('gg_bus', 287, 377, 0.5, { solid: true }); w.prop('car', 293, 405, 2.2, { solid: true });
      for (const [x, z, k, r] of [[204, 389, 'car', PI / 2 + 0.2], [222, 395, 'gg_truck', -PI / 2 + 0.3], [240, 389, 'car', PI / 2 - 0.1], [254, 394, 'gg_van', -PI / 2 + 0.6], [322, 389, 'car', PI / 2], [340, 395, 'gg_truck', PI / 2 - 0.2], [366, 390, 'car', -PI / 2]]) {
        w.prop(k, x, z, r, { solid: true, yAbs: DECK_Y });
        if (k !== 'gg_van') w.container('car_trunk', x + (x < 280 ? -2.8 : 2.8), z, 0, { tier: 1, poi: 'highway_collapse', yAbs: DECK_Y });
      }
      w.prop('gg_bb_bridge', 254, 386, 0, { yAbs: DECK_Y }); w.prop('gg_bb_bridge', 316, 386, 0, { yAbs: DECK_Y });
      for (const z of [386.5, 397.5]) { w.prop('gg_barrier', 258, z, PI / 2, { yAbs: DECK_Y, solid: true }); w.prop('gg_barrier', 312, z, PI / 2, { yAbs: DECK_Y, solid: true }); }
      for (let x = 198; x < 380; x += 24) { if (x > 256 && x < 314) continue; w.lamp(x, 384.8, { yAbs: DECK_Y + 4, color: 0xffd890, intensity: 2.2, range: 13, model: null }); }
      w.container('raider_cache', 285, 395, 0, { tier: 2, poi: 'highway_collapse' }); w.container('backpack', 281, 389, 0, { tier: 1, poi: 'highway_collapse' });
      w.zone('Infrastructure Week', [[180, 370], [390, 370], [390, 414], [180, 414]], { tier: 1 });
      w.poi('highway_collapse', 'Infrastructure Week', 280, 378, 58, { tier: 1 });
      w.arkSpawn('bombardier', 300, 470, { count: 1, radius: 20 }); w.arkSpawn('spotter', 286, 392, { count: 1, patrol: [[200, 380], [380, 380], [380, 420], [200, 420]] });
      w.arkSpawn('hornet', 230, 420, { count: 2, patrol: [[190, 392], [290, 430], [380, 392], [290, 360]] });

      // the boathouse + pier on the north shore
      house({ x: 222, z: 318, w: 18, d: 12, h: 3.6, wall: 'wood', floor: 'wood', roof: 'roofTile', roofShape: 'gable', tint: 0xc8b090, name: 'Liquidity Boathouse', doors: [{ side: 's', at: 5, w: 6 }, { side: 'w', at: 4, w: 1.6 }, ...winRow('n', 18, 2, 4, 1.2)] }, 'shed', { tier: 1, poi: 'lake_liquidity', cont0: 3 });
      const PY = Math.max(LAKE_LVL + 0.5, w.groundAt(231, 331.5));
      w.bridge([[231, 331], [231, 352]], 3, PY, 'wood', { pillars: 4, thick: 0.3, railH: 0.8, pillarW: 0.4 });
      w.bridge([[231, 352], [248, 352]], 3, PY, 'wood', { pillars: 4, thick: 0.3, railH: 0.8, pillarW: 0.4 });
      for (const [x, z, r] of [[226, 344, 0.1], [237, 346, -0.2], [244, 357, 1.5]]) w.prop('gg_boat', x, z, r, { yAbs: LAKE_LVL - 0.15 });
      w.container('suitcase', 246, 352, 0, { tier: 1, poi: 'lake_liquidity', yAbs: PY });
      w.prop('gg_bb_lake', 214, 334, 0, { solid: true });
      for (const [x, z] of [[220, 334], [244, 334]]) lightPost(x, z, 0xffd090);
      w.poi('lake_liquidity', 'Lake Liquidity', 238, 336, 22, { tier: 1 });

      // Deferred Maintenance Bunker: the half-buried water purification plant on the south-east shore
      const MB = { x: 372, z: 470, w: 24, d: 14, storeys: 1, h: 3.6, wall: 'damConcrete', floor: 'concrete', roof: 'damConcrete', tint: 0xc8c8c0, name: 'Deferred Maintenance Bunker', blend: 4,
        doors: [{ side: 'n', at: 4, w: 2.2 }, { side: 'e', at: 5, w: 1.8 }, { side: 'w', at: 9, w: 1.6, sill: 1 }], inner: [[11, 0, 11, 14, [{ at: 4, w: 2 }]], [11, 7, 24, 7, [{ at: 5, w: 1.8 }]]], roofExtras: [[2, 2, 6, 6, 1.0], [15, 3, 21, 5, 0.6]] };
      house(MB, 'industrial', { tier: 2, poi: 'maintenance_bunker', density: 22 });
      w.prop('gg_desk', 374, 482.6, PI, { solid: true }); w.container('desk', 377, 482.6, PI, { tier: 2, poi: 'maintenance_bunker' });   // the blueprints (quest)
      for (const [x, z] of [[352, 476], [356, 494]]) w.prop('gg_tank', x, z, 0, { solid: true });
      w.prop('gg_pump', 360, 458, 0.4, { solid: true }); w.prop('gg_pipes', 366, 466, 0.4, { solid: true }); w.prop('gg_pipes', 386, 466, 0, { solid: true });
      w.lamp(384, 477, { y: 3.0, model: null, color: 0xd0f0ff, intensity: 1.0, range: 10 }); lightPost(370, 468); lightPost(398, 486);
      mark(344, 450, 400, 502, 2 | 4);
      w.arkSpawn('tick', 382, 476, { count: 2, habitat: 'indoor' }); w.arkSpawn('pop', 360, 496, { count: 2 });
      w.poi('maintenance_bunker', 'Deferred Maintenance Bunker', 380, 478, 26, { tier: 2 });
    }

    // ======================================================================== 8. LOWER FORECLOSURE (the village on the terrace)
    {
      const tints = [0xf0e0c8, 0xe8d0b0, 0xd8c8b0, 0xf0d8c0, 0xe0c8a8, 0xd0c0a8, 0xf0e8d8, 0xe8c8a0];
      const roofT = [0xa8706a, 0x9a6a5a, 0xb88a7a, 0x8a5a4a, 0xc89a88, 0x9a7a6a];
      let vi = 0;
      const cleanDoors = (o) => {
        const len = sd => (sd === 'n' || sd === 's' ? o.w : o.d);
        const out = [];
        for (const d of o.doors) { if (d.at < 0.4 || d.at + d.w > len(d.side) - 0.4) continue; if (out.some(e => e.side === d.side && d.at < e.at + e.w + 0.5 && e.at < d.at + d.w + 0.5)) continue; out.push(d); }
        o.doors = out; return o;
      };
      const vhouse = (x, z, ww, dd, st, front, o2 = {}) => {
        const i = vi++, back = { n: 's', s: 'n', e: 'w', w: 'e' }[front];
        const fl = front === 'n' || front === 's' ? ww : dd;
        const sides = front === 'n' || front === 's' ? ['w', 'e'] : ['n', 's'];
        const doors = [{ side: front, at: clamp(fl / 2 - 0.8 + ((i % 3) - 1) * 2, 1, fl - 2.6), w: 1.6, ...(o2.locked ? { door: true, locked: o2.locked } : {}) }];
        if (!o2.locked) doors.push({ side: back, at: 1.2, w: 1.4 });
        doors.push(...winRow(front, fl, 1.0, 3.0, 1.2), ...winRow(back, fl, 2.8, 3.4, 1.2));
        if (o2.detached) for (const sd of sides) doors.push(...winRow(sd, sd === 'n' || sd === 's' ? ww : dd, 2, 3.6, 1.2));
        const inner = [];
        if (ww >= 11) inner.push([Math.round(ww * 0.55), 0, Math.round(ww * 0.55), dd, [{ at: (dd >= 11 ? dd * 0.74 : dd / 2) - 0.8, w: 1.6 }]]);
        if (dd >= 11 && ww >= 11) inner.push([0, Math.round(dd * 0.5), Math.round(ww * 0.55), Math.round(dd * 0.5), [{ at: 1.0, w: 1.4 }]]);
        const o = cleanDoors({ x, z, w: ww, d: dd, storeys: st, wall: o2.wall || (i % 4 === 1 ? 'brick' : 'plaster'), floor: i % 2 ? 'wood' : 'tiles', roof: 'roofTile', roofShape: 'gable',
          tint: tints[i % tints.length], roofTint: roofT[i % roofT.length], doors, inner: [], name: o2.name || 'Village House', blend: 3, floors: o2.floors });
        if (st > 1 && o2.floors !== false) {
          o.inner = inner; navAlign(o); o.inner = [];
          o.stairs = planStairs(o);
          if (!o.stairs.length) o.stairs = undefined;
          const keepOut = (o.stairs || []).map(s0 => stairRect(o, s0, 1.2));
          o.inner = inner.filter(iw => !keepOut.some(r0 => segHitsRect(iw, r0)));
          if (!o.stairs) o.ladders = [{ x: 1.0, z: 1.0, to: 1 }, ...(st > 2 ? [{ x: ww - 1.0, z: 1.0, from: 1, to: 2 }] : [])];
        } else o.inner = inner;
        if (o2.locked) {
          house(o, 'home', { tier: 3, room: o2.locked, poi: 'village', cont0: 5, cont: 'office', upCont: 3 }); w.keyRoom(o2.locked, x, z, x + ww, z + dd, null, { name: o.name, poi: 'village' });
          for (const [dx, dz, k] of [[1.2, dd - 1.2, 'safe'], [ww - 1.2, dd - 1.2, 'weapon_case'], [ww * 0.3, dd * 0.5, 'suitcase']]) w.container(k, x + dx, z + dz, 0, { tier: 3, room: o2.locked, poi: 'village' });
        } else house(o, 'home', { tier: i % 6 === 0 ? 2 : 1, poi: 'village' });
        const [fx, fz] = front === 's' ? [x + ww * 0.3, z + dd + 1.4] : front === 'n' ? [x + ww * 0.7, z - 1.4] : front === 'w' ? [x - 1.4, z + dd * 0.3] : [x + ww + 1.4, z + dd * 0.7];
        if (rng() < 0.7) w.prop(pick(['gg_planter', 'gg_planter', 'barrel', 'gg_woodpile', 'gg_bench', 'gg_flowers', 'gg_mailbox']), fx, fz, front === 'n' || front === 's' ? 0 : PI / 2, { solid: true });
        return o;
      };
      // a terrace of houses along a north-south street: consecutive in z, front faces the street
      const rowZ = (x, z0, specs, front, o2) => { let z = z0; for (const [ww, dd, st] of specs) { vhouse(front === 'e' ? x - ww : x, z, ww, dd, st, front, o2); z += dd; } };
      const rowX = (x0, z, specs, front, o2) => { let x = x0; for (const [ww, dd, st] of specs) { vhouse(x, front === 's' ? z - dd : z, ww, dd, st, front, o2); x += ww; } };
      // main street (x 236): west side fronts east, east side fronts west
      rowZ(229, 40, [[12, 12, 2], [13, 11, 2], [11, 12, 3]], 'e');
      rowZ(229, 82, [[12, 11, 2], [14, 12, 2], [12, 11, 2]], 'e');
      rowZ(243, 38, [[11, 12, 2], [12, 12, 2]], 'w');
      vhouse(243, 66, 13, 12, 2, 'w', { detached: true });
      rowZ(243, 86, [[12, 11, 2], [11, 12, 3], [12, 11, 2]], 'w');
      rowZ(229, 166, [[12, 12, 2], [13, 12, 2]], 'e');
      vhouse(214, 196, 15, 13, 2, 'e', { detached: true });
      rowZ(243, 186, [[12, 11, 2], [12, 12, 2]], 'w');
      vhouse(243, 214, 13, 11, 1, 'w', { detached: true });
      // cross street (z 150) toward the barns in the west: north side fronts south, south side fronts north
      rowX(150, 144, [[12, 11, 2], [12, 12, 2], [13, 11, 2]], 's');
      rowX(152, 157, [[13, 12, 2], [12, 11, 1]], 'n');
      vhouse(126, 118, 14, 11, 2, 's', { detached: true, name: 'Village Barn', wall: 'brick', floors: false });
      vhouse(128, 160, 11, 10, 1, 'n', { detached: true });
      // the landlord's holiday home: big detached house in a walled garden (key room 'village')
      vhouse(150, 196, 16, 13, 2, 'n', { detached: true, locked: 'village', name: "The Landlord's Holiday Home" });
      stoneWall(144, 190, 154, 190, 1.2); stoneWall(161, 190, 170, 190, 1.2); stoneWall(144, 190, 144, 214, 1.2); stoneWall(170, 190, 170, 214, 1.2); stoneWall(144, 214, 170, 214, 1.2);
      for (const [x, z] of [[147, 210], [167, 210]]) w.prop('gg_cypress', x, z, 0, { solid: true });
      // Repossession Square: tiles, well, market stalls, the boom box (quest), the chapel and the inn
      w.paint('tiles', 246, 138, 286, 164); w.paint('gravel', 244, 136, 246, 166);
      const VC = { x: 260, z: 112, w: 14, d: 22, storeys: 2, h: 6.8, floors: false, wall: 'plaster', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', tint: 0xf0e8d8, name: 'Chapel of Late Payments', doors: [{ side: 's', at: 5.8, w: 2.4 }, ...winRow('e', 22, 3, 5, 1), ...winRow('w', 22, 3, 5, 1)] };
      bldg(VC); for (let r = 0; r < 4; r++) { w.prop('gg_pew', 264, 120 + r * 3, PI, { solid: true }); w.prop('gg_pew', 270, 120 + r * 3, PI, { solid: true }); } w.prop('gg_altar', 267, 115, PI, { solid: true });
      w.container('basket', 262, 114, 0, { tier: 1, poi: 'village' }); w.container('cabinet', 272, 132, 0, { tier: 2, poi: 'village' });
      w.block(274, 112, 278, 116, 11, 'plaster', { tint: 0xf0e8d8 }); w.block(273.6, 111.6, 278.4, 116.4, 0.8, 'roofTile', { y0: w.groundAt(276, 114) + 10.8, collide: false });
      vhouse(262, 168, 20, 13, 2, 'n', { detached: true, name: 'The Interest-Only Inn' });
      w.prop('gg_well', 266, 150, 0, { solid: true });
      w.prop('gg_table', 252, 142, 0, { solid: true }); w.prop('gg_tarp', 252, 142, 0, {}); w.container('electronics', 253, 143.4, 0, { tier: 1, poi: 'village', note: 'boom_box' });
      for (const [x, z] of [[278, 142], [278, 158]]) { w.prop('gg_table', x, z, 0, { solid: true }); w.prop('gg_tarp', x, z, 0, {}); w.container(pick(['basket', 'crate']), x, z + 1.4, 0, { tier: 1, poi: 'village' }); }
      for (const [x, z] of [[250, 154], [258, 160]]) w.prop('gg_bench', x, z, 0, { solid: true });
      w.prop('gg_shrine', 284, 136, 0, { solid: true }); w.prop('gg_bb_village', 236, 30, 0, { solid: true });
      for (const [x, z] of [[270, 160], [276, 160]]) { w.prop('gg_table', x, z, 0, { solid: true }); w.prop('gg_chair', x - 1.1, z, PI / 2, {}); w.prop('gg_chair', x + 1.1, z, -PI / 2, {}); }
      for (const [x, z] of [[248, 139], [284, 139], [248, 163], [284, 163], [258, 139], [274, 139]]) w.prop('gg_planter', x, z, 0, { solid: true });
      w.prop('gg_forsale', 262, 156, 0, { solid: true }); w.prop('gg_cart', 282, 148, 1.6, { solid: true }); w.prop('gg_crates', 276, 140.5, 0, { solid: true });
      // the village bridge over the Grace Period Creek gorge
      levelPath(resample([[276, 155], [292, 156]], 2), new Array(9).fill(VBR_Y), 6, 2);
      w.bridge([[290, 156], [332, 160]], 6, VBR_Y, 'wood', { pillars: 10, thick: 0.5 });
      // walls, laundry, cypresses, lamps, clutter, the vehicles left on the street
      for (const [ax, az, bx, bz] of [[200, 56, 200, 132], [256, 30, 290, 30], [200, 168, 200, 186], [262, 186, 296, 186], [120, 136, 146, 136]]) stoneWall(ax, az, bx, bz);
      for (const [x, z, r] of [[222, 76, PI / 2], [252, 80, PI / 2], [182, 166, 0], [262, 200, PI / 2]]) w.prop('gg_laundry', x, z, r, { solid: true });
      for (const [x, z] of [[208, 40], [208, 110], [262, 60], [286, 96], [210, 180], [290, 205], [140, 104], [176, 128], [196, 230], [262, 240], [118, 176]]) w.prop('gg_cypress', x, z, 0, { solid: true, scale: R(0.8, 1.15) });
      for (const [x, z] of [[232.2, 46], [239.8, 92], [232.2, 134], [239.8, 176], [232.2, 222], [176, 147.2], [138, 152.8], [262, 146.4], [282, 153.6]]) lightPost(x, z, 0xffd090);
      for (let i = 0; i < 30; i++) { const x = R(112, 296), z = R(28, 248); if (free(x, z, 1.5, 3)) w.prop(pick(['gg_flowers', 'gg_grass', 'gg_bush', 'barrel', 'gg_woodpile', 'gg_haybale', 'gg_cart', 'gg_planter']), x, z, rng() * 6, { solid: true }); }
      for (let i = 0; i < 16; i++) { const x = R(112, 296), z = R(28, 248); if (free(x, z, 2, 3)) w.container(pick(['trash', 'basket', 'plant', 'crate']), x, z, 0, { tier: 1, poi: 'village' }); }
      vehicle('gg_truck', 238, 112, 0.05); vehicle('car', 233, 196, PI + 0.1); vehicle('gg_van', 200, 150, PI / 2 + 0.05);
      w.arkSpawn('wasp', 236, 100, { count: 2, patrol: [[236, 40], [236, 240], [180, 200], [180, 100]] });
      w.arkSpawn('wasp', 200, 160, { count: 2, patrol: [[130, 150], [290, 150], [270, 200], [150, 200]] });
      w.arkSpawn('pop', 250, 70, { count: 2 }); w.arkSpawn('tick', 222, 190, { count: 2, habitat: 'indoor' }); w.arkSpawn('fireball', 160, 120, { count: 2 });
      w.arkSpawn('leaper', 180, 240, { count: 1, radius: 30 });
      w.arkSpawn('snitch', 236, 150, { patrol: [[160, 60], [290, 60], [290, 240], [160, 240]] });
      w.zone('Lower Foreclosure', [[112, 28], [296, 28], [298, 250], [112, 250]], { tier: 2 });
      w.poi('village', 'Lower Foreclosure', 218, 140, 96, { tier: 2 });
      hatchSite('village_doggy_door', 'Village Doggy Door', 108, 122, faceTo(108, 122, 118, 128));
    }

    // ======================================================================== 9. FIXER-UPPER FARM (west of the village road)
    {
      w.paintCircle('dirt', 96, 286, 30, 0.35, 4);
      for (let k = 0; k < 7; k++) w.path([[124 + k * 6, 316], [150 + k * 6, 344]], 2.2, k % 2 ? 'mud' : 'dirt');   // furrows
      const FH = { x: 66, z: 250, w: 16, d: 12, storeys: 2, wall: 'plaster', floor: 'wood', roof: 'roofTile', roofShape: 'gable', tint: 0xe0d0b8, name: 'Farmhouse (Sold As Seen)',
        doors: [{ side: 's', at: 10, w: 1.6 }, { side: 'e', at: 2, w: 1.4 }, ...winRow('s', 16, 1.6, 3.4, 1.2).filter(d => d.at + d.w < 9.6 || d.at > 12), ...winRow('n', 16, 9, 3.4, 1.2)],
        inner: [[7, 6, 7, 12, [{ at: 2, w: 1.6, door: true, locked: 'cellar' }]], [0, 6, 7, 6, []], [10, 0, 10, 12, [{ at: 6, w: 1.6 }]]], upInner: false };
      house(FH, 'home', { tier: 1, poi: 'ruined_homestead', cont0: 3, avoid: [[0, 6, 7, 12]] });
      w.keyRoom('cellar', 66, 256, 73, 262, null, { name: 'Root Cellar of Questionable Jars', poi: 'ruined_homestead' });
      for (const [x, z, k] of [[67.4, 257.4, 'safe'], [71.6, 257.4, 'weapon_case'], [67.4, 260.6, 'fridge'], [71, 260.8, 'raider_cache']]) w.container(k, x, z, 0, { tier: 3, room: 'cellar', poi: 'ruined_homestead' });
      w.prop('shelf', 70, 257, 0, { solid: true });
      const RH = [
        { x: 86, z: 276, w: 20, d: 14, storeys: 1, h: 5.4, name: 'Barn (Needs Work)', kind: 'shed', wall: 'wood', roof: 'corrugated' },
        { x: 62, z: 300, w: 12, d: 10, storeys: 1, name: 'Cottage (Charming)', kind: 'ruin' },
        { x: 118, z: 246, w: 12, d: 8, storeys: 1, name: 'Stable (Rustic)', kind: 'shed', wall: 'wood', roof: 'corrugated' },
        { x: 82, z: 312, w: 10, d: 9, storeys: 1, name: 'Shed (Potential)', kind: 'ruin' },
      ];
      for (const r of RH) {
        const doors = [{ side: 's', at: 2, w: r.kind === 'shed' ? 3 : 1.6 }, { side: 'n', at: r.w - 4, w: 1.4 }, ...winRow('e', r.d, 2, 3.5, 1.2)];
        if (r.kind === 'ruin') doors.push({ side: 'w', at: 1, w: r.d - 3 }, { side: 'n', at: 1, w: 3 });
        house({ x: r.x, z: r.z, w: r.w, d: r.d, storeys: r.storeys, h: r.h, wall: r.wall || 'brick', floor: 'wood', roof: r.roof || 'roofTile', roofShape: r.kind === 'ruin' ? undefined : 'gable', tint: 0xd8c8b0, name: r.name, peek: r.kind === 'ruin' ? 0.45 : undefined,
          doors: doors.filter((d, i, a) => d.at + d.w < (d.side === 'n' || d.side === 's' ? r.w : r.d) - 0.4 && !a.some((e, j) => j < i && e.side === d.side && Math.abs(e.at - d.at) < 2.5)),
          inner: r.w >= 12 ? [[Math.round(r.w / 2), 0, Math.round(r.w / 2), r.d, [{ at: r.d / 2 - 0.8, w: 1.6 }]]] : [] }, r.kind, { tier: 1, poi: 'ruined_homestead', cont: r.kind === 'ruin' ? 'ruin' : undefined });
      }
      w.prop('gg_silo', 120, 272, 0, { solid: true }); w.prop('gg_silo', 120, 263, 0, { solid: true, scale: 0.8 }); mark(114, 258, 126, 278, 2);
      for (const [x, z] of [[88, 268], [100, 296], [60, 290]]) w.prop('gg_haybale', x, z, rng() * 3, { solid: true });
      w.prop('gg_cart', 86, 300, 0.4, { solid: true }); w.prop('gg_forsale', 96, 266, 0, { solid: true });
      fenceRun([[56, 240], [112, 240], [112, 330], [56, 330], [56, 240]], [[112, 268, 4], [80, 330, 4], [56, 280, 3]]);
      for (const [x, z] of [[84, 266], [110, 296]]) lightPost(x, z, 0xffc880);
      w.arkSpawn('pop', 96, 290, { count: 2 }); w.arkSpawn('tick', 102, 282, { count: 2, habitat: 'indoor' });
      w.arkSpawn('hornet', 96, 290, { count: 1, patrol: [[60, 250], [130, 250], [130, 330], [60, 330]] });
      w.zone('Fixer-Upper Farm', [[54, 238], [134, 238], [134, 332], [54, 332]], { tier: 2 });
      w.poi('ruined_homestead', 'Fixer-Upper Farm', 94, 286, 40, { tier: 2 });
    }

    // ======================================================================== 10. FORT KNOCKS (the old fortifications on the north spur)
    {
      const FY = SPUR_Y, FT = [[500, 108], [548, 128], [540, 178], [470, 184], [456, 132]];
      w.paintPoly('gravel', FT);
      const GATE = [544, 153, 4.2], BREACH = [505, 181, 4];
      for (let k = 0; k < FT.length; k++) {
        const [ax, az] = FT[k], [bx, bz] = FT[(k + 1) % FT.length], L = Math.hypot(bx - ax, bz - az), a = Math.atan2(bz - az, bx - ax);
        const n = Math.ceil(L / 2);
        for (let i = 0; i < n; i++) {
          const t0 = i / n, t1 = (i + 1) / n, cx = ax + (bx - ax) * (t0 + t1) / 2, cz = az + (bz - az) * (t0 + t1) / 2;
          if ([GATE, BREACH].some(([gx, gz, r]) => Math.hypot(cx - gx, cz - gz) < r)) continue;
          if (Math.hypot(cx - ax, cz - az) < 4.5 || Math.hypot(cx - bx, cz - bz) < 4.5) continue;
          const Rf = rotFrame(cx, cz, a), sl = L / n / 2 + 0.06;
          w.block(cx - sl, cz - 0.8, cx + sl, cz + 0.8, 5.2, 'brick', { tint: 0xc0b098, y0: FY - 0.3, R: Rf });
          if (i % 1 === 0) w.prop('gg_merlon', cx, cz, -a, { yAbs: FY + 4.9 });
        }
        // octagonal corner towers (two crossed squares)
        for (const ang of [0, PI / 4]) w.block(ax - 4, az - 4, ax + 4, az + 4, 8.4, 'brick', { tint: 0xb0a088, y0: FY - 0.3, R: rotFrame(ax, az, ang) });
        mark(ax - 6, az - 6, ax + 6, az + 6, 2 | 4);
      }
      // gatehouse posts + the breach rubble
      { const ga = Math.atan2(50, -8), ux = Math.cos(ga), uz = Math.sin(ga); for (const s of [-1, 1]) { const cx = GATE[0] + ux * s * 4.6, cz = GATE[1] + uz * s * 4.6; w.block(cx - 1.6, cz - 1.4, cx + 1.6, cz + 1.4, 7.2, 'brick', { tint: 0xa89878, y0: FY - 0.3, rot: ga }); } }
      w.prop('gg_fortruin', BREACH[0], BREACH[1] + 2, 0.1, { solid: true }); w.prop('gg_rubble', BREACH[0], BREACH[1] - 2.5, 0.4, { solid: true, scale: 0.6 });
      w.prop('gg_bb_fort', 560, 160, 0, { solid: true });
      // ladders from the courtyard up the north and the south-west towers
      w.ladder(500, 116.2, null, 500, 113.0, null, 0);
      w.ladder(475.6, 178.4, null, 473.2, 180.8, null, Math.atan2(2.4, -2.4));
      const KEEP = { x: 486, z: 132, w: 22, d: 18, storeys: 3, h: 9.6, wall: 'brick', floor: 'tiles', roof: 'roofTile', tint: 0xc8b8a0, name: 'Fort Keep', floorY: FY,
        doors: [{ side: 's', at: 10, w: 2 }, { side: 'e', at: 7, w: 1.6 }, ...winRow('n', 22, 3, 5, 0.8), ...winRow('w', 18, 3, 5, 0.8)], inner: [[11, 0, 11, 18, [{ at: 7, w: 2 }]], [0, 9, 11, 9, [{ at: 4, w: 1.6 }]]], ladders: [{ side: 'e', at: 14 }], upInner: false };
      house(KEEP, 'office', { tier: 2, cont: 'lab', poi: 'ancient_fort' });
      w.container('weapon_case', 488, 134, 0, { tier: 3, poi: 'ancient_fort' }); w.container('electronics', 505, 134, 0, { tier: 3, poi: 'ancient_fort' });
      house({ x: 468, z: 146, w: 10, d: 14, h: 3.4, wall: 'brick', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', tint: 0xc8b8a0, name: 'Garrison Chapel', floorY: FY, doors: [{ side: 'e', at: 5, w: 1.6 }] }, 'church', { tier: 2, poi: 'ancient_fort', cont0: 2 });
      house({ x: 516, z: 160, w: 12, d: 9, h: 3.2, wall: 'brick', floor: 'tiles', roof: 'roofTar', tint: 0xc8b8a0, name: 'Fort Storeroom', floorY: FY, doors: [{ side: 'n', at: 4, w: 1.6 }, { side: 'w', at: 3, w: 1.4 }] }, 'shed', { tier: 2, poi: 'ancient_fort', cont0: 3 });
      w.prop('gg_well', 500, 162, 0, { solid: true });
      w.prop('gg_dish', 522, 142, 0.4, { solid: true }); w.prop('gg_generator', 526, 146, 0, { solid: true }); w.container('electronics', 524, 148.4, 0, { tier: 2, poi: 'ancient_fort', note: 'transmitter' });
      w.prop('gg_printer', 480, 168, 0, { solid: true }); w.container('electronics', 480, 169.4, 0, { tier: 2, poi: 'ancient_fort', note: 'security_code_printer' });
      for (const [x, z] of [[476, 140], [532, 136], [490, 170], [530, 172]]) lightPost(x, z, 0xffc880);
      for (const [x, z, r] of [[536, 132, 0.4], [462, 140, -2.0], [520, 112, 1.2]]) w.prop('pipe', x, z, r, { solid: true });   // old cannon barrels
      w.arkSpawn('rocketeer', 505, 150, { patrol: [[450, 110], [570, 110], [570, 200], [450, 200]] });
      w.arkSpawn('tick', 498, 140, { count: 2, habitat: 'indoor' }); w.arkSpawn('wasp', 505, 150, { count: 2, patrol: [[470, 130], [540, 130], [530, 175], [475, 178]] });
      perched('sentinel', 500, 108, 'fort_tower', 8.4 + 0.02, { f: faceTo(500, 108, 500, 260) });
      w.zone('Fort Knocks', [[446, 100], [566, 100], [566, 196], [446, 196]], { tier: 2 });
      w.poi('ancient_fort', 'Fort Knocks', 504, 148, 40, { tier: 2 });
    }

    // ======================================================================== 11. THE NORTHERN WOODS: Quarterly Quarry, Free Trial Glade, the Downsizing Sawmill, Clear-Cut Savings
    {
      // Quarterly Quarry
      w.paint('gravel', 600, 62, 668, 128); w.paintCircle('rock', 632, 92, 22, 0.4, 3);
      w.prop('gg_crane', 618, 78, 0.6, { solid: true }); w.prop('gg_crusher', 646, 100, 0, { solid: true }); w.prop('gg_conveyor', 632, 104, PI, {});
      for (const [x, z] of [[612, 110], [656, 76], [624, 70]]) { w.prop('gg_rock_l', x, z, rng() * 6, { solid: true }); w.prop('gg_scree', x + 3, z + 2, rng() * 6, {}); }
      vehicle('gg_truck', 640, 120, 0.4);
      house({ x: 596, z: 126, w: 12, d: 8, h: 3, wall: 'metalPanel', floor: 'wood', roof: 'corrugated', tint: 0xd8c040, name: 'Quarry Office', doors: [{ side: 's', at: 2, w: 1.6 }, ...winRow('e', 8, 2, 3)] }, 'office', { tier: 1, poi: 'quarry', cont0: 3 });
      w.prop('gg_bb_quarry', 620, 140, 0, { solid: true });
      for (const [x, z] of [[606, 92], [658, 120]]) lightPost(x, z, 0xe8f4ff, 'gg_lightmast', 6.5, 2.2, 16);
      for (const [x, z, k] of [[630, 86, 'toolbox'], [652, 110, 'crate'], [610, 100, 'arc_crate']]) w.container(k, x, z, 0, { tier: 1, poi: 'quarry' });
      w.arkSpawn('leaper', 630, 96, { radius: 24 }); w.arkSpawn('pop', 620, 110, { count: 2 });
      w.poi('quarry', 'Quarterly Quarry', 630, 96, 38, { tier: 1 });
      hatchSite('quarry_doggy_door', 'Quarry Doggy Door', 668, 150, faceTo(668, 150, 660, 160));
      // Free Trial Glade: trapper cabins in the woods, the cellar (key room), the raider shack with loose roof plates
      w.paintCircle('moss', 770, 110, 26, 0.5, 7);
      const TC = { x: 752, z: 96, w: 14, d: 10, h: 3.2, wall: 'wood', floor: 'wood', roof: 'roofTile', roofShape: 'gable', name: 'Trapper Cabin', doors: [{ side: 's', at: 10, w: 1.6 }, ...winRow('n', 14, 2, 4, 1.2)], inner: [[6, 0, 6, 10, [{ at: 6, w: 1.6, door: true, locked: 'cellar' }]]] };
      bldg(TC); w.keyRoom('cellar', 752, 96, 758, 106, null, { name: 'The Cellar (Cancel Anytime)', poi: 'trappers_glade' });
      for (const [x, z, k] of [[753.5, 98, 'safe'], [756.5, 98, 'weapon_case'], [753.5, 104, 'plant'], [756.5, 104.5, 'raider_cache']]) w.container(k, x, z, 0, { tier: 3, room: 'cellar', poi: 'trappers_glade' });
      furnish({ ...TC, x: 758, w: 8, inner: [], doors: [{ side: 's', at: 4, w: 1.6 }, { side: 'w', at: 6, w: 1.6 }] }, 'home', { tier: 1, poi: 'trappers_glade', cont0: 2 });
      const RSb = house({ x: 780, z: 112, w: 10, d: 8, h: 3.0, wall: 'corrugated', floor: 'wood', roof: 'corrugated', name: 'Raider Shack (Roof Pending)', doors: [{ side: 'w', at: 3, w: 1.6 }, { side: 's', at: 3, w: 1.2, sill: 1 }] }, 'camp', { tier: 2, poi: 'trappers_glade', cont0: 2 });
      for (const [x, z, r] of [[784, 114.5, 0.1], [788, 117, 2.0]]) w.prop('gg_hullplate', x, z, r, { bid: RSb.id, yRel: 3.25, scale: 0.6 });
      for (const [x, z, r] of [[766, 124, 0], [776, 92, 0.4], [744, 118, PI / 2]]) w.prop('gg_rack', x, z, r, { solid: true });
      for (const [x, z] of [[760, 130], [784, 98], [742, 104], [796, 128], [770, 134]]) w.prop('gg_trap', x, z, rng() * 6, {});
      w.prop('gg_campfire', 770, 118, 0, {}); w.lamp(770, 118, { y: 0.8, model: null, color: 0xff9040, intensity: 1.8, range: 9, flicker: 0.6 });
      w.prop('gg_woodpile', 748, 110, 0, { solid: true }); w.prop('gg_bb_trial', 790, 140, 0, { solid: true });
      for (const [x, z] of [[740, 90], [800, 104]]) watchtower(x, z, 0.6);
      for (const [x, z] of [[788, 102], [746, 128], [776, 104]]) w.container(pick(['plant', 'basket', 'plant']), x, z, 0, { tier: 1, poi: 'trappers_glade' });
      w.arkSpawn('tick', 772, 112, { count: 2 }); w.arkSpawn('leaper', 760, 160, { radius: 40 });
      w.poi('trappers_glade', 'Free Trial Glade (Auto-Renews)', 770, 122, 34, { tier: 1 });
      // the Downsizing Sawmill
      const SM = { x: 884, z: 54, w: 30, d: 16, h: 6.4, wall: 'wood', floor: 'concrete', roof: 'corrugated', tint: 0xb89878, name: 'Downsizing Sawmill', peek: 0.6,
        doors: [{ side: 's', at: 2, w: 10, lintel: false }, { side: 's', at: 18, w: 10, lintel: false }, { side: 'w', at: 4, w: 8, lintel: false }, { side: 'e', at: 5, w: 6, lintel: false }] };
      bldg(SM); w.prop('gg_saw', 899, 62, 0, { solid: true }); w.prop('gg_logs', 888, 60, 0, { solid: true }); w.prop('workbench', 910, 56, 0, { solid: true }); w.prop('shelf', 886, 56, 0, { solid: true });
      for (const [x, z, k] of [[886.6, 66, 'toolbox'], [911, 66, 'crate'], [904, 56, 'toolbox']]) w.container(k, x, z, 0, { tier: 1, poi: 'sawmill' });
      w.lamp(899, 62, { y: 5, model: null, color: 0xfff0d0, intensity: 1.6, range: 14 });
      house({ x: 920, z: 84, w: 10, d: 8, h: 3, wall: 'wood', floor: 'wood', roof: 'roofTile', roofShape: 'gable', name: 'Mill Office (Restructured)', doors: [{ side: 'w', at: 3, w: 1.6 }, ...winRow('s', 10, 2, 3)] }, 'office', { tier: 2, poi: 'sawmill', cont0: 3 });
      for (const [x, z, r] of [[870, 80, 0.1], [874, 88, 0.3], [880, 96, 1.4], [930, 64, 1.6], [936, 74, 1.5]]) w.prop('gg_logs', x, z, r, { solid: true, scale: 1.4 });
      vehicle('gg_truck', 912, 84, PI / 2 + 0.2); w.prop('gg_bb_saw', 870, 106, 0, { solid: true });
      for (let i = 0; i < 14; i++) w.prop('gg_stump', R(860, 950), R(40, 120), rng() * 6, { solid: true });
      w.arkSpawn('fireball', 900, 80, { count: 2 }); w.arkSpawn('wasp', 900, 70, { count: 2, patrol: [[860, 50], [950, 50], [950, 120], [860, 120]] });
      w.poi('sawmill', 'The Downsizing Sawmill', 902, 72, 36, { tier: 1 });
      // Clear-Cut Savings: a scorched clearing around a dead Legacy System, with a drifter's shelter
      w.paintCircle('dirt', 662, 290, 24, 0.4, 3); w.paintCircle('mud', 668, 296, 8, 0.5, 4);
      w.prop('gg_husk_big', 668, 296, 0.7, { solid: true }); w.container('barron_husk', 668, 301.5, 0, { tier: 3, poi: 'barren_clearing' });
      house({ x: 644, z: 272, w: 8, d: 7, h: 2.8, wall: 'wood', floor: 'wood', roof: 'corrugated', name: "Drifter's Shelter", doors: [{ side: 's', at: 3, w: 1.4 }, { side: 'e', at: 2.5, w: 1.2, sill: 1 }] }, 'camp', { tier: 2, poi: 'barren_clearing', cont0: 2 });
      for (const [x, z] of [[656, 306], [680, 288], [672, 312]]) w.prop('gg_forsale', x, z, rng() - 0.5, { solid: true });
      for (let i = 0; i < 12; i++) w.prop(pick(['gg_stump', 'gg_stump', 'deadTree', 'gg_logs', 'gg_rock_s']), R(642, 690), R(270, 314), rng() * 6, { solid: true });
      w.arkSpawn('surveyor', 662, 290, { count: 1, patrol: [[662, 290], [620, 340], [700, 330], [700, 250]] });
      w.arkSpawn('tick', 676, 284, { count: 3 });
      w.poi('barren_clearing', 'Clear-Cut Savings', 664, 292, 30, { tier: 1 });
      // Severance Package Airshaft in the creek valley north of the lake
      airshaftSite('severance_airshaft', 'Severance Package Airshaft', 372, 268, faceTo(372, 268, 360, 280));
    }

    // ======================================================================== 12. THE SOUTH: Peak Performance Retreat (mesa), Olive Branch Office, Buy The Dip
    {
      w.paintPoly('grass', MESA);
      w.paint('concrete', 488, 670, 580, 676); w.paint('concrete', 576, 660, 604, 676);
      // Retreat Lodge (3 storeys), Breakout Rooms, Synergy Spa
      house({ x: 488, z: 646, w: 40, d: 16, storeys: 3, h: 9.6, wall: 'plaster', floor: 'wood', roof: 'roofTile', tint: 0xf0e8dc, name: 'Retreat Lodge',
        doors: [{ side: 's', at: 18, w: 2.4 }, { side: 'w', at: 6, w: 1.8 }, { side: 'e', at: 8, w: 1.8 }, ...winRow('s', 40, 2, 4).filter(d => d.at + d.w < 17.6 || d.at > 20.8)],
        inner: [[13, 0, 13, 16, [{ at: 9, w: 2 }]], [27, 0, 27, 16, [{ at: 9, w: 2 }]], [13, 0, 13, 16, [{ at: 9, w: 2 }], 1], [27, 0, 27, 16, [{ at: 9, w: 2 }], 2]], upInner: false, ladders: [{ side: 'n', at: 34 }] }, 'home', { tier: 2, poi: 'pilgrims_peak', cont: 'spa' });
      house({ x: 552, z: 680, w: 24, d: 16, storeys: 2, wall: 'concrete', floor: 'tiles', roof: 'roofTar', name: 'Breakout Rooms', doors: [{ side: 'n', at: 10, w: 2 }, { side: 'w', at: 5, w: 1.8 }, ...winRow('s', 24, 2, 4)], inner: [[12, 0, 12, 16, [{ at: 5, w: 2 }]]] }, 'lab', { tier: 2, poi: 'pilgrims_peak', cont: 'lab' });
      house({ x: 488, z: 692, w: 26, d: 14, h: 3.6, wall: 'plaster', floor: 'tiles', roof: 'roofTar', tint: 0xe8f0f0, name: 'Synergy Spa', doors: [{ side: 'n', at: 4, w: 2 }, { side: 's', at: 18, w: 2.4 }, ...winRow('s', 26, 2, 4).filter(d => d.at + d.w < 17.6 || d.at > 20.8)], inner: [[13, 0, 13, 14, [{ at: 5, w: 2 }]]] }, 'home', { tier: 2, poi: 'pilgrims_peak', cont: 'spa' });
      for (const [x, z] of [[496, 714], [506, 714], [516, 716]]) w.prop('gg_hottub', x, z, 0, { solid: true });
      // the comms tower and its locked basement room (key room 'communication_tower')
      const CT = { x: 552, z: 708, w: 18, d: 14, h: 3.6, wall: 'concrete', floor: 'metalPanel', roof: 'metalPanel', name: 'Comms Tower Base',
        doors: [{ side: 'w', at: 5, w: 2 }, { side: 'n', at: 2, w: 1.8 }], inner: [[9, 0, 9, 14, [{ at: 9, w: 2, door: true, locked: 'communication_tower' }]]] };
      bldg(CT);
      w.keyRoom('communication_tower', 561, 708, 570, 722, null, { name: 'Server Room of Unread Emails', poi: 'pilgrims_peak' });
      for (const [x, z, k] of [[562.4, 710, 'electronics'], [568.6, 710, 'safe'], [568.6, 715, 'weapon_case'], [562.4, 720, 'electronics'], [568.6, 720.4, 'security_locker']]) w.container(k, x, z, 0, { tier: 3, room: 'communication_tower', poi: 'pilgrims_peak' });
      w.prop('gg_server', 565, 714, 0, { solid: true }); w.prop('gg_console', 556, 710, 0, { solid: true }); w.container('desk', 554, 719, 0, { tier: 2, poi: 'pilgrims_peak' });
      w.lamp(565, 716, { y: 3.2, model: null, color: 0x80c8ff, intensity: 1.2, range: 7 });
      { const tx = 584, tz = 716, tg = MESA_Y;
        w.prop('gg_commtower', tx, tz, 0, {});
        for (const sx of [-2.0, 2.0]) for (const sz of [-2.0, 2.0]) w.prop('gg_col', tx + sx, tz + sz, 0, { y: -0.5, solid: [0.25, 0.25, 10.5] });
        for (const sx of [-1.5, 1.5]) for (const sz of [-1.5, 1.5]) w.prop('gg_col', tx + sx, tz + sz, 0, { yAbs: tg + 10.25, solid: [0.2, 0.2, 9.75] });
        w.prop('gg_col', tx, tz, 0, { yAbs: tg + 10.0, solid: [2.25, 2.25, 0.25] }); w.prop('gg_col', tx, tz, 0, { yAbs: tg + 20.0, solid: [1.75, 1.75, 0.25] });
        w.ladder(tx, tz + 2.75, null, tx, tz + 1.85, tg + 10.25, 0);
        w.ladder(tx + 2.0, tz - 0.9, tg + 10.25, tx + 1.3, tz - 0.9, tg + 20.25, PI / 2);
        w.prop('gg_console', tx - 0.6, tz - 1.0, 0, { yAbs: tg + 20.25 }); w.container('electronics', tx + 0.6, tz + 0.9, 0, { tier: 3, poi: 'pilgrims_peak', yAbs: tg + 20.25, note: 'comms_terminal' });
        w.container('toolbox', tx - 1.4, tz + 1.4, 0, { tier: 2, poi: 'pilgrims_peak', yAbs: tg + 10.25 });
        w.lamp(tx, tz, { yAbs: tg + 30, model: null, color: 0xff3020, intensity: 1.0, range: 10, flicker: 0.5 });
        w.lamp(tx, tz + 0.5, { yAbs: tg + 22, model: null, color: 0xe8f4ff, intensity: 1.2, range: 8 });
        mark(tx - 4, tz - 4, tx + 4, tz + 4, 2 | 4); }
      // helipad, dish array, gardens, the arrival sign
      w.paintCircle('concrete', 532, 736, 9, 0, 1); w.prop('gg_txt_h', 532, 736, 0, { y: 0.03 });
      for (const [x, z, r] of [[594, 696, 2.4], [600, 704, -2.2], [590, 734, 1.0]]) w.prop('gg_dish', x, z, r, { solid: true });
      for (const [x, z] of [[540, 654], [560, 660], [580, 690], [478, 690], [478, 668]]) w.prop('gg_cypress', x, z, 0, { solid: true });
      for (const [x, z] of [[540, 700], [548, 742], [510, 740], [574, 744]]) w.prop('gg_olive', x, z, rng() * 6, { solid: true, scale: 0.7 });
      w.prop('gg_bb_retreat', 596, 684, 0, { solid: true });
      for (const pth of [[[516, 676], [516, 692]], [[540, 676], [540, 708], [560, 708]], [[564, 676], [564, 680]], [[500, 706], [500, 720], [532, 727]], [[578, 676], [584, 712]]]) w.path(resample(pth, 2), 2.4, 'gravel');
      w.raiseRect(494, 720, 516, 730, MESA_Y - 0.8, 0, 'set'); w.water(494, 720, 516, 730, { level: MESA_Y - 0.15, deep: 0x2a8aa8, shallow: 0x58c0d8 });
      for (let x = 494; x < 516; x += 1.6) { w.block(x, 719.4, x + 1.6, 720, 0.3, 'tiles', { tint: 0xe8f0f0, y0: MESA_Y - 0.05 }); w.block(x, 730, x + 1.6, 730.6, 0.3, 'tiles', { tint: 0xe8f0f0, y0: MESA_Y - 0.05 }); }
      for (const x of [497, 503, 509]) w.prop('gg_bench', x, 733, 0, { solid: true });
      for (const [x, z] of [[488, 650], [488, 640], [600, 650], [606, 700], [480, 700], [480, 712], [596, 730], [560, 750], [536, 754]]) w.prop('gg_cypress', x, z, 0, { solid: true, scale: R(0.8, 1.1) });
      for (const [x, z] of [[486, 666], [530, 666], [578, 666], [546, 700], [520, 726], [596, 668]]) lightPost(x, z, 0xffd8a0);
      w.prop('gg_printer', 534, 674, 0, { solid: true }); w.container('electronics', 534, 675.4, 0, { tier: 2, poi: 'pilgrims_peak', note: 'security_code_printer' });
      for (let i = 0; i < 24; i++) { const x = R(472, 616), z = R(628, 756); if (free(x, z, 1.5, 3) && pointInPoly(x, z, MESA)) w.prop(pick(['gg_bush', 'gg_flowers', 'gg_grass', 'gg_rock_s', 'gg_planter', 'gg_bench']), x, z, rng() * 6, { solid: true, scale: R(0.7, 1) }); }
      w.arkSpawn('rocketeer', 545, 690, { count: 2, condition: 'locked_gate', patrol: [[480, 650], [610, 650], [610, 740], [480, 740]] });
      w.arkSpawn('rocketeer', 545, 700, { count: 1, patrol: [[470, 640], [620, 640], [610, 750], [480, 750]] });
      w.arkSpawn('wasp', 520, 680, { count: 2, patrol: [[490, 640], [600, 660], [560, 750]] });
      w.arkSpawn('tick', 508, 652, { count: 2, habitat: 'indoor' });
      perched('turret', 508, 658, 'lodge_roof', 9.6 + 0.25, { f: faceTo(508, 658, 600, 640) });
      w.zone('Peak Performance Retreat', MESA, { tier: 3 });
      w.poi('pilgrims_peak', 'Peak Performance Retreat', 540, 692, 56, { tier: 3 });
      // Olive Branch Office: terraced orchard under the mesa's west cliff
      const OG = [[368, 562], [458, 556], [470, 600], [462, 648], [376, 648], [362, 604]];
      w.raisePoly([[368, 562], [458, 556], [466, 588], [364, 590]], 5.6, 3, 'max');
      w.raisePoly([[364, 590], [466, 588], [470, 620], [366, 620]], 6.6, 3, 'max');
      w.raisePoly([[366, 620], [470, 620], [462, 648], [376, 648]], 7.6, 3, 'max');
      paintPolyN('dirt', OG, 5, 7);
      for (const z of [590, 620]) for (let x = 368; x < 466; x += 1.6) { if (Math.abs(x - 410) < 3 || Math.abs(x - 446) < 3) continue; w.block(x - 0.8, z - 0.4, x + 0.8, z + 0.4, 0.9, 'plaster', { tint: 0xa89880 }); }
      for (let z = 566; z < 646; z += 7) for (let x = 372; x < 462; x += 7.5) { const xx = x + (rng() - 0.5) * 1.6, zz = z + (rng() - 0.5) * 1.6; if (pointInPoly(xx, zz, OG) && free(xx, zz, 1.5, 3) && Math.abs(zz - 590) > 2 && Math.abs(zz - 620) > 2) w.prop('gg_olive', xx, zz, rng() * 6, { solid: true, scale: R(0.85, 1.15) }); }
      for (const [x, z] of [[384, 598], [390, 598], [396, 598], [402, 598], [430, 630], [436, 630]]) { w.prop('gg_beehive', x, z, 0, { solid: true }); w.container('bee_hive', x, z + 0.8, 0, { tier: 1, poi: 'olive_grove' }); }
      house({ x: 438, z: 562, w: 14, d: 8, h: 3.0, wall: 'metalPanel', floor: 'wood', roof: 'corrugated', tint: 0xd8dccc, name: 'The Branch Office', doors: [{ side: 's', at: 3, w: 1.6 }, ...winRow('s', 14, 6, 3, 1.4), ...winRow('w', 8, 2, 3)] }, 'office', { tier: 1, poi: 'olive_grove', cont0: 3 });
      w.prop('gg_console', 434, 574, PI, { solid: true }); w.prop('antenna', 432, 572, 0, { solid: true }); w.container('electronics', 436, 573, 0, { tier: 2, poi: 'olive_grove', note: 'comms_terminal' });
      house({ x: 378, z: 626, w: 10, d: 8, h: 3.0, wall: 'brick', floor: 'wood', roof: 'roofTile', roofShape: 'gable', name: 'Press Shed', doors: [{ side: 'n', at: 3, w: 1.6 }] }, 'shed', { tier: 1, poi: 'olive_grove' });
      for (const [x, z] of [[400, 576], [450, 612], [420, 640]]) w.container(pick(['plant', 'basket']), x, z, 0, { tier: 1, poi: 'olive_grove' });
      w.prop('gg_cart', 420, 610, 1.2, { solid: true }); w.prop('gg_haybale', 452, 600, 0, { solid: true }); w.prop('gg_bb_olive', 400, 556, 0, { solid: true });
      w.arkSpawn('wasp', 415, 600, { count: 2, patrol: [[370, 566], [460, 566], [460, 644], [380, 644]] });
      w.zone('Olive Branch Office', OG, { tier: 1 });
      w.poi('olive_grove', 'Olive Branch Office', 416, 602, 44, { tier: 1 });
      hatchSite('orchard_doggy_door', 'Orchard Doggy Door', 452, 532, faceTo(452, 532, 470, 520));
      // Buy The Dip: the crater chain, upturned slabs and the machines that caused it
      paintPolyN('dirt', [[560, 474], [584, 478], [708, 590], [700, 612], [676, 606], [560, 500]], 7, 8);
      for (const [cx, cz, r] of CRATERS) w.paintCircle('mud', cx, cz, r + 1, 0.35, cx + cz);
      for (const [x, z, k, r] of [[620, 530, 'gg_husk_big', 0.8], [596, 510, 'husk', 1.2], [668, 576, 'husk', 2.0], [690, 598, 'gg_rubble', 0.4], [646, 552, 'gg_slab', 0.7], [580, 492, 'gg_slab', 2.2], [700, 584, 'gg_rock_l2', 1.0], [632, 544, 'gg_strut', 0.6]])
        w.prop(k, x, z, r, { solid: true });
      for (const [x, z] of [[623, 535], [599, 513], [671, 579]]) w.container('arc_husk', x + 3, z + 2, 0, { tier: 2, poi: 'broken_earth' });
      for (let i = 0; i < 20; i++) w.prop(pick(['debris', 'gg_scree', 'gg_rock_s', 'deadTree']), R(560, 710), R(480, 610), rng() * 6, { solid: false });
      w.arkSpawn('bastion', 640, 550, { radius: 30, patrol: [[580, 500], [700, 600], [660, 620]] }); w.arkSpawn('surveyor', 630, 540, { patrol: [[580, 490], [700, 580], [650, 610]] });
      w.poi('broken_earth', 'Buy The Dip', 632, 545, 44, { tier: 1 });
      airshaftSite('two_weeks_notice_airshaft', "Two Weeks' Notice Airshaft", 716, 714, faceTo(716, 714, 704, 722));
    }

    // ======================================================================== 13. THE SOUTH-WEST WOODS: Feng Shui Crash Site, Squatters' Rights
    {
      // the hull came in from the north-west, ploughed a gouge through the trees and came to rest by the glade
      for (let i = 0; i < 10; i++) { const t = i / 9, x = 186 + t * 100, z = 598 + t * 84 + Math.sin(t * 6) * 5; w.raiseCircle(x, z, 6 + t * 3, -0.9, 0.7, 'add'); w.paintCircle(i % 2 ? 'mud' : 'dirt', x, z, 7 + t * 2, 0.5, i); mark(x - 6, z - 6, x + 6, z + 6, 4); }
      w.prop('gg_hull', 282, 682, -0.7, { solid: true }); mark(270, 670, 294, 694, 2);
      for (const [x, z, k, r] of [[204, 612, 'gg_wreck_ring', 0.6], [236, 640, 'gg_wreck_fin', 2.4], [258, 660, 'gg_wreck_engine', -0.6], [190, 626, 'gg_wreck_fin', 0.5], [300, 700, 'gg_wreck_ring', 2.2]]) { w.prop(k, x, z, r, { solid: true }); mark(x - 5, z - 5, x + 5, z + 5, 2); }
      for (let i = 0; i < 24; i++) { const t = rng(), x = 186 + t * 110 + R(-12, 12), z = 598 + t * 90 + R(-12, 12); if (free(x, z, 2, 3)) { w.prop(pick(['gg_hullplate', 'gg_strut', 'gg_hullplate', 'debris', 'gg_rubble', 'husk']), x, z, rng() * 6, { solid: true, scale: R(0.7, 1.1) }); mark(x - 2, z - 2, x + 2, z + 2, 2); } }
      // feng shui: lanterns in balanced pairs, totems, cloth, a raked gravel circle
      w.paintCircle('gravel', 246, 668, 7, 0, 3); w.prop('gg_rock_m', 246, 668, 0.3, { solid: true });
      for (const [x, z] of [[228, 652], [264, 652], [228, 684], [264, 684], [212, 630], [272, 700]]) { w.prop('gg_lantern', x, z, 0, { solid: true }); w.lamp(x, z, { y: 1.5, model: null, color: 0xffa040, intensity: 1.4, range: 7, flicker: 0.35 }); }
      for (const [x, z] of [[240, 626], [216, 676], [290, 664]]) w.prop('gg_totem', x, z, rng() * 6, { solid: true });
      // the Hedge Fund: a felled forest-clearing giant behind a ring of fire vents
      w.paintCircle('dirt', 208, 664, 13, 0.3, 5);
      w.prop('gg_husk_big', 208, 664, 2.2, { solid: true, scale: 1.3 }); w.container('deforestr_husk', 208, 671.5, 0, { tier: 3, poi: 'adorned_wreckage' });
      for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2, x = 208 + Math.cos(a) * 10, z = 664 + Math.sin(a) * 10; w.prop('gg_firevent', x, z, a, {}); w.lamp(x, z, { y: 0.6, model: null, color: 0xff7020, intensity: 1.6, range: 6, flicker: 0.8 }); }
      house({ x: 250, z: 604, w: 9, d: 7, h: 3.0, wall: 'corrugated', floor: 'concrete', roof: 'corrugated', name: 'Salvage Hut', doors: [{ side: 's', at: 3, w: 1.8 }] }, 'industrial', { tier: 2, poi: 'adorned_wreckage', cont0: 2 });
      w.prop('antenna', 246, 616, 0, { solid: true }); w.prop('gg_console', 256, 615, 0, { solid: true }); w.container('electronics', 258, 616.5, 0, { tier: 2, poi: 'adorned_wreckage', note: 'communications_device' });
      for (const [x, z] of [[202, 620], [244, 650], [270, 676], [292, 690]]) w.container(pick(['arc_crate', 'arc_husk', 'toolbox', 'crate']), x, z, 0, { tier: 2, poi: 'adorned_wreckage' });
      w.arkSpawn('leaper', 240, 660, { radius: 30 }); w.arkSpawn('wasp', 240, 650, { count: 2, patrol: [[190, 610], [290, 640], [300, 700], [210, 700]] });
      w.arkSpawn('fireball', 220, 690, { count: 2 });
      w.zone('Feng Shui Crash Site', [[180, 590], [310, 590], [310, 712], [180, 712]], { tier: 2 });
      w.poi('adorned_wreckage', 'Feng Shui Crash Site', 242, 656, 50, { tier: 2 });
      // Squatters' Rights: the raider camp in the far corner of the woods
      house({ x: 100, z: 704, w: 10, d: 8, h: 3.0, wall: 'wood', floor: 'wood', roof: 'corrugated', name: "Squatters' Shack", doors: [{ side: 'e', at: 2, w: 1.6 }, { side: 'n', at: 3, w: 1.2, sill: 1 }, { side: 's', at: 3, w: 1.2, sill: 1 }] }, 'camp', { tier: 2, poi: 'raiders_refuge', cont0: 3 });
      w.prop('gg_tarp', 122, 712, 0.4, { solid: true }); w.prop('gg_tent', 114, 726, 1.2, { solid: true }); w.prop('gg_tent', 126, 700, -0.5, { solid: true });
      w.prop('gg_campfire', 118, 714, 0, {}); w.lamp(118, 714, { y: 0.8, model: null, color: 0xff9040, intensity: 1.8, range: 9, flicker: 0.6 });
      for (const [x, z] of [[114, 718], [122, 718], [118, 708]]) w.prop('gg_logs', x, z, rng() * 3, { solid: true, scale: 0.6 });
      for (const [x, z, k] of [[124, 710, 'raider_cache'], [110, 712, 'backpack'], [128, 704, 'ammo_box'], [108, 724, 'medical_bag']]) w.container(k, x, z, 0, { tier: 2, poi: 'raiders_refuge' });
      w.prop('gg_crates', 96, 698, 0.2, { solid: true }); w.prop('antenna', 104, 700, 0, { solid: true });
      w.prop('gg_bb_squat', 134, 696, 0, { solid: true }); w.prop('gg_laundry', 98, 716, PI / 2, { solid: true });
      w.prop('gg_printer', 106, 714, 0.3, { solid: true }); w.container('electronics', 106, 715.4, 0.3, { tier: 2, poi: 'raiders_refuge', note: 'security_code_printer' });
      watchtower(132, 724, 0.6);
      w.arkSpawn('wasp', 116, 714, { count: 2, patrol: [[90, 690], [140, 690], [140, 740], [90, 740]] });
      w.poi('raiders_refuge', "Squatters' Rights", 116, 712, 24, { tier: 1 });
      airshaftSite('early_retirement_airshaft', 'Early Retirement Airshaft', 146, 548, faceTo(146, 548, 158, 542));
    }

    // ======================================================================== 14. THE EAST VALLEY: Unfulfillment Center, the lookout, the glamping site
    {
      w.paint('concrete', 716, 470, 830, 566); markPoly([[716, 468], [832, 468], [832, 568], [716, 568]], 1 | 4);
      const HA = { x: 722, z: 474, w: 44, d: 28, h: 7.6, name: 'Unfulfillment Hangar A', wall: 'corrugated', roof: 'corrugated', floor: 'concrete', tint: 0xb8c4bc, parapet: false,
        doors: [{ side: 'n', at: 4, w: 12, lintel: false }, { side: 'n', at: 26, w: 4 }, { side: 's', at: 8, w: 10, lintel: false }, { side: 'e', at: 10, w: 8, lintel: false }, { side: 'w', at: 12, w: 2 }],
        inner: [[30, 16, 44, 16, [{ at: 6, w: 2 }]], [30, 16, 30, 28, [{ at: 4, w: 2 }]]], ladders: [{ side: 'w', at: 4 }], roofExtras: [[6, 6, 18, 10, 1.2], [24, 18, 36, 22, 1.2]] };
      const HAb = bldg(HA);
      for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) pl(HA, 'shelf', 5 + i * 6.3, 13 + r * 8, 0);
      for (let r = 0; r < 2; r++) for (let i = 0; i < 4; i++) if (rng() < 0.6) pl(HA, pick(['gg_pallet', 'gg_crates', 'barrel', 'barrelBlue', 'crate']), 5 + i * 6.3 + R(-0.6, 0.6), 17 + r * 8, rng() * 6);
      for (let i = 0; i < 9; i++) ct(HA, pick(['crate', 'toolbox', 'crate', 'arc_crate', 'electronics']), R(3, 28), R(4, 26), { tier: 2, poi: 'warehouse_complex' });
      furnish({ x: 0, z: 0, w: 14, d: 12, rot: 0, inner: [], doors: [{ side: 'n', at: 6, w: 2 }, { side: 'w', at: 4, w: 2 }] }, 'office', { tier: 2, poi: 'warehouse_complex', cont0: 3, light: false }, { R: null, x0: 722 + 30, z0: 474 + 16, id: HAb.id });
      for (const [lx, lz] of [[10, 10], [24, 10], [10, 22], [38, 8]]) w.lamp(722 + lx, 474 + lz, { y: 2.6, model: null, color: 0xfff0d0, intensity: 1.6, range: 14 });
      w.prop('gg_bb_fulfil', 744, 501.4, 0, { bid: HAb.id, yRel: 7.6 + 0.25 });
      const HB = { x: 774, z: 478, w: 36, d: 24, h: 7.0, name: 'Unfulfillment Hangar B', wall: 'corrugated', roof: 'corrugated', floor: 'concrete', tint: 0xc4b8a8, parapet: false,
        doors: [{ side: 'n', at: 4, w: 10, lintel: false }, { side: 's', at: 20, w: 10, lintel: false }, { side: 'w', at: 8, w: 6, lintel: false }] };
      bldg(HB);
      for (const [x, z, k, r] of [[786, 486, 'gg_truck', 0.05], [798, 492, 'gg_container', PI / 2], [804, 482, 'gg_crates', 0], [780, 496, 'gg_pallet', 0.3], [806, 498, 'gg_generator', 0]]) w.prop(k, x, z, r, { solid: true });
      for (const [x, z, k] of [[776.6, 482, 'toolbox'], [808, 486, 'locker'], [792, 499.6, 'crate'], [776.6, 498, 'electronics']]) w.container(k, x, z, 0, { tier: 2, poi: 'warehouse_complex' });
      w.lamp(792, 490, { y: 2.6, model: null, color: 0xfff0d0, intensity: 1.6, range: 14 });
      house({ x: 722, z: 518, w: 20, d: 16, storeys: 2, wall: 'concrete', floor: 'tiles', roof: 'roofTar', name: 'Dispatch Office', doors: [{ side: 'n', at: 4, w: 2 }, { side: 'e', at: 8, w: 1.8 }, ...winRow('e', 16, 2, 4).filter(d => d.at + d.w < 7.6 || d.at > 10.2)], inner: [[10, 0, 10, 16, [{ at: 6, w: 1.8 }]]] }, 'office', { tier: 2, poi: 'warehouse_complex' });
      house({ x: 802, z: 516, w: 14, d: 10, h: 3.4, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: 'Returns Desk (Closed)', doors: [{ side: 'w', at: 4, w: 1.8 }, ...winRow('s', 14, 2, 4)] }, 'industrial', { tier: 2, poi: 'warehouse_complex' });
      // the yard: container stacks, trucks at the docks, the emergency siren (quest)
      for (const [x, z, k, r, y] of [[752, 530, 'gg_container', 0, 0], [752, 530, 'gg_container2', 0, 2.6], [752, 538, 'gg_container3', 0, 0], [774, 536, 'gg_container2', PI / 2, 0], [782, 536, 'gg_container', PI / 2, 0], [782, 536, 'gg_container3', PI / 2, 2.6], [796, 552, 'gg_container', 0, 0], [760, 556, 'gg_container3', 0.1, 0]])
        w.prop(k, x, z, r, { solid: true, y });
      for (const [x, z, k, r] of [[740, 509, 'gg_truck', PI], [762, 509, 'gg_van', PI + 0.1], [822, 530, 'gg_truck', -PI / 2]]) vehicle(k, x, z, r);
      w.prop('gg_siren', 768, 516, 0, { solid: true });
      for (const [x, z] of [[718, 470], [830, 470], [718, 566], [830, 566], [770, 566]]) lightPost(x, z, 0xe8f4ff, 'gg_lightmast', 6.5, 2.6, 21);
      for (const [x, z, k] of [[766, 546, 'crate'], [790, 562, 'toolbox'], [742, 556, 'arc_crate']]) w.container(k, x, z, 0, { tier: 1, poi: 'warehouse_complex' });
      for (let x = 724; x < 812; x += 4) { w.prop('gg_lane', x, 506, PI / 2, { y: 0.03 }); if (x > 768) w.prop('gg_lane', x, 509, PI / 2, { y: 0.03 }); }   // loading bays
      for (const [x, z] of [[736, 512], [748, 512], [790, 510], [800, 512], [744, 548], [806, 548], [818, 556], [730, 560]]) { w.prop(pick(['gg_pallet', 'gg_crates', 'gg_pallet']), x, z, rng() * 0.4, { solid: true }); if (rng() < 0.5) w.prop(pick(['barrel', 'barrelBlue', 'gg_cone']), x + 1.6, z + 1, 0, { solid: true }); }
      // the white lookout tower south of the warehouses (quest)
      perchTower(772, 590, 'turret', 'gg_perchtower_w', faceTo(772, 590, 772, 520));
      w.arkSpawn('rocketeer', 770, 520, { count: 1, patrol: [[720, 470], [830, 470], [830, 570], [720, 570]] });
      w.arkSpawn('wasp', 770, 540, { count: 3, patrol: [[730, 530], [810, 530], [810, 560], [740, 560]] });
      w.arkSpawn('leaper', 744, 488, { radius: 10 });
      w.arkSpawn('tick', 730, 526, { count: 2, habitat: 'indoor' });
      w.zone('Unfulfillment Center', [[714, 466], [834, 466], [834, 568], [714, 568]], { tier: 2 });
      w.poi('warehouse_complex', 'Unfulfillment Center', 772, 516, 48, { tier: 2 });
      // Glamping Pyramid Scheme: tents for people who paid to sleep outside
      w.paintCircle('dirt', 930, 716, 20, 0.4, 9);
      for (const [x, z, r, s] of [[914, 704, 0.3, 1.2], [926, 698, -0.2, 1.4], [940, 704, 0.5, 1.2], [912, 724, 2.8, 1.3], [944, 728, 3.4, 1.2], [928, 734, 3.1, 1.5]]) w.prop('gg_tent', x, z, r, { solid: true, scale: s });
      house({ x: 950, z: 690, w: 12, d: 8, h: 3, wall: 'wood', floor: 'wood', roof: 'roofTile', roofShape: 'gable', name: 'Glamping Reception (Upsell Desk)', doors: [{ side: 'w', at: 3, w: 1.6 }, ...winRow('s', 12, 2, 3)] }, 'office', { tier: 1, poi: 'glamping_site', cont0: 3 });
      w.prop('gg_campfire', 928, 716, 0, {}); w.lamp(928, 716, { y: 0.8, model: null, color: 0xff9040, intensity: 1.8, range: 9, flicker: 0.6 });
      for (const [x, z] of [[910, 712], [946, 716], [920, 742]]) { w.prop('gg_lantern', x, z, 0, { solid: true }); w.lamp(x, z, { y: 1.5, model: null, color: 0xfff0b0, intensity: 1.2, range: 7 }); }
      for (const [x, z] of [[922, 716], [934, 712]]) w.prop('gg_logs', x, z, rng() * 3, { solid: true, scale: 0.6 });
      w.prop('gg_hottub', 958, 708, 0, { solid: true });
      for (const [x, z, k] of [[916, 708, 'backpack'], [940, 700, 'suitcase'], [912, 728, 'basket'], [946, 732, 'medical_bag']]) w.container(k, x, z, 0, { tier: 1, poi: 'glamping_site' });
      w.arkSpawn('pop', 930, 720, { count: 2 }); w.arkSpawn('hornet', 930, 720, { count: 1, patrol: [[890, 680], [970, 680], [980, 760], [900, 770]] });
      w.poi('glamping_site', 'Glamping Pyramid Scheme', 930, 716, 30, { tier: 1 });
      hatchSite('glampsite_doggy_door', 'Glampsite Doggy Door', 978, 748, faceTo(978, 748, 960, 740));
    }

    // ======================================================================== 15. ISOLATED SHEDS + POI CLUTTER
    {
      const MISC = [[150, 456, 'shed'], [326, 520, 'ruin'], [560, 300, 'shed'], [700, 380, 'ruin'], [620, 650, 'shed'], [680, 760, 'ruin'], [400, 730, 'camp'], [860, 760, 'ruin'], [360, 110, 'camp'], [430, 280, 'shed'], [818, 160, 'ruin'], [60, 600, 'shed'], [1010, 560, 'camp'], [260, 540, 'ruin']];
      for (const [x, z, k] of MISC) {
        if (!free(x + 4, z + 4, 6, 3)) continue;
        house({ x, z, w: 8, d: 7, h: 3, wall: k === 'camp' ? 'corrugated' : pick(['brick', 'wood', 'plaster']), floor: 'wood', roof: k === 'ruin' ? 'roofTile' : 'corrugated', name: k === 'ruin' ? 'Ruin' : k === 'camp' ? 'Lean-to' : 'Shed', peek: k === 'ruin' ? 0.4 : undefined,
          doors: [{ side: pick(['s', 'w', 'e']), at: 2, w: 1.6 }, { side: 'n', at: 3, w: 1.2, sill: 1 }] }, k, { tier: 1, cont0: 2 });
      }
      const CL = [
        [496, 402, 64, ['gg_cone', 'gg_barrier', 'barrel', 'gg_crates', 'sandbag', 'debris', 'gg_pallet', 'barrelBlue'], 34, { mask: 2 }],
        [218, 140, 100, ['barrel', 'gg_woodpile', 'gg_planter', 'gg_cart', 'gg_haybale', 'crate', 'gg_bench', 'gg_flowers'], 30],
        [664, 292, 28, ['gg_stump', 'deadTree', 'gg_logs', 'debris', 'husk', 'gg_scree'], 12],
        [116, 712, 18, ['gg_crates', 'barrel', 'gg_pallet', 'gg_logs', 'debris', 'gg_lantern'], 8],
        [770, 110, 28, ['gg_stump', 'gg_logs', 'gg_woodpile', 'gg_haybale', 'barrel', 'gg_fern'], 14],
        [285, 392, 60, ['debris', 'gg_rubble', 'gg_strut', 'gg_barrier', 'gg_cone'], 16],
        [416, 602, 44, ['gg_haybale', 'gg_cart', 'barrel', 'gg_woodpile', 'gg_beehive'], 8],
        [94, 286, 40, ['gg_woodpile', 'gg_haybale', 'barrel', 'debris', 'gg_cart', 'gg_laundry', 'gg_rubble'], 16],
        [504, 148, 40, ['debris', 'gg_rock_s', 'barrel', 'gg_fortruin', 'gg_crates'], 10],
        [632, 545, 44, ['debris', 'gg_rubble', 'husk', 'gg_rock_m', 'gg_slab', 'gg_strut'], 14],
        [380, 478, 24, ['barrel', 'barrelBlue', 'gg_pipes', 'gg_crates', 'gg_generator'], 8],
        [862, 628, 46, ['gg_rock_s', 'gg_boulder', 'deadTree', 'gg_logs', 'gg_rock_m'], 12],
        [1010, 200, 50, ['gg_pallet', 'gg_crates', 'barrel', 'debris', 'gg_logs', 'gg_cone', 'gg_container3'], 18],
        [540, 692, 56, ['gg_planter', 'gg_bench', 'barrel', 'gg_crates', 'gg_flowers'], 10],
        [772, 516, 60, ['gg_pallet', 'gg_crates', 'barrel', 'barrelBlue', 'gg_cone'], 16],
        [779, 347, 30, ['sandbag', 'gg_barrier', 'barrel', 'gg_crates', 'gg_cone'], 10],
        [930, 268, 34, ['gg_crates', 'barrel', 'gg_generator', 'gg_dish'], 6],
        [1010, 460, 40, ['gg_pipes', 'gg_crates', 'barrel', 'gg_generator', 'gg_transformer'], 10],
        [242, 656, 54, ['gg_hullplate', 'gg_strut', 'debris', 'gg_lantern', 'husk'], 14],
        [630, 96, 38, ['gg_rock_s', 'gg_scree', 'barrel', 'gg_pallet', 'debris'], 12],
        [902, 72, 36, ['gg_logs', 'gg_stump', 'gg_woodpile', 'barrel', 'gg_pallet'], 12],
        [930, 716, 30, ['gg_flowers', 'gg_bench', 'gg_woodpile', 'barrel'], 8],
      ];
      for (const [cx, cz, r, kinds, n, o] of CL) clutter(cx, cz, r, kinds, n, o || {});
    }

    // ======================================================================== 16. VEGETATION + DRESSING
    {
      const steep = (x, z) => Math.max(Math.abs(w.groundAt(x + 1.2, z) - w.groundAt(x - 1.2, z)), Math.abs(w.groundAt(x, z + 1.2) - w.groundAt(x, z - 1.2))) > 1.2;
      const avoidT = (x, z) => !inPlay(x, z) || !free(x, z, 1.2, 3) || (occ(x, z) & 8);
      const avoidS = (x, z) => avoidT(x, z) || (occ(x, z) & 4);
      const clearings = [[770, 110, 26], [902, 72, 30], [664, 292, 26], [242, 656, 30], [116, 712, 18], [146, 548, 12], [372, 268, 12], [668, 150, 6], [930, 716, 24], [716, 714, 12], [630, 96, 34], [890, 690, 22], [600, 336, 26]];
      const inClear = (x, z) => clearings.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r);
      // the northern woods (spur valley to the sawmill)
      const NFA = [[326, 20], [430, 40], [432, 92], [562, 92], [590, 42], [880, 18], [1040, 60], [1000, 110], [930, 122], [866, 140], [860, 230], [760, 240], [700, 250], [640, 250], [560, 240], [440, 245], [400, 330], [326, 320]];
      paintPolyN('forest', NFA, 14);
      w.forest(NFA, 2.4, ['pine', 'gg_pinebig', 'gg_spruce', 'tree', 'gg_spruce'], { avoid: (x, z) => avoidT(x, z) || inClear(x, z) || onPlateau(x, z), undergrowth: false });
      w.scatter('gg_fern', NFA, 800, { avoid: (x, z) => avoidT(x, z), solid: false });
      // the south-west woods (crash site, squatters, airshaft)
      const SWF = [[50, 440], [180, 470], [300, 500], [340, 560], [350, 640], [330, 720], [300, 800], [120, 770], [72, 730], [48, 650], [40, 560]];
      paintPolyN('forest', SWF, 14);
      w.forest(SWF, 2.6, ['pine', 'gg_pinebig', 'gg_spruce', 'tree', 'gg_birch'], { avoid: (x, z) => avoidT(x, z) || inClear(x, z), undergrowth: false });
      w.scatter('gg_fern', SWF, 600, { avoid: (x, z) => avoidT(x, z), solid: false });
      w.scatter('bush', SWF, 300, { avoid: (x, z) => avoidT(x, z), solid: false });
      // the woods west of the village + along the creek gorge
      const WF = [[56, 120], [110, 30], [120, 120], [110, 236], [50, 236]];
      w.forest(WF, 2.0, ['pine', 'gg_pinebig', 'tree'], { avoid: (x, z) => avoidT(x, z) || inClear(x, z), undergrowth: false });
      // south-east woods around the ridge and the glamping meadow
      const SEF = [[740, 600], [840, 600], [880, 640], [1000, 640], [990, 790], [700, 812], [640, 780], [640, 700]];
      w.forest(SEF, 1.4, ['pine', 'gg_spruce', 'gg_birch', 'tree'], { avoid: (x, z) => avoidT(x, z) || inClear(x, z), undergrowth: false });
      // sparse trees everywhere else (open valley), heavier toward the boundary
      const kinds = ['pine', 'tree', 'gg_spruce', 'gg_birch', 'deadTree', 'gg_pinebig'];
      for (let i = 0; i < 2600; i++) {
        const x = R(40, 1080), z = R(10, 815); if (avoidS(x, z)) continue;
        const d = dAt(x, z), p = d > -40 ? 0.8 : (N1(x, z, 60) > 0.56 ? 0.55 : 0.14);
        if (rng() > p) continue;
        w.prop(pick(kinds), x, z, rng() * 6, { solid: true, scale: R(0.8, 1.25) });
      }
      // the Shelf: wind-bent pines on the rim and the scrub
      const shelfOpen = (x, z) => pointInPoly(x, z, SHELF) && inPlay(x, z) && !avoidT(x, z) && !(occ(x, z) & 2);
      for (let i = 0; i < 1400; i++) { const x = R(860, 1070), z = R(110, 615); if (!shelfOpen(x, z) || N1(x, z, 50) < 0.42) continue; w.prop(pick(['pine', 'gg_spruce', 'gg_pinebig', 'deadTree', 'gg_bush', 'pine']), x, z, rng() * 6, { solid: true, scale: R(0.75, 1.1) }); }
      for (let i = 0; i < 90; i++) { const cx = R(870, 1065), cz = R(115, 610); if (!shelfOpen(cx, cz) || (occ(cx, cz) & 4)) continue; for (let k = 0; k < 4; k++) { const x = cx + R(-4, 4), z = cz + R(-4, 4); if (shelfOpen(x, z) && !(occ(x, z) & 4)) { w.prop(pick(['gg_rock_m', 'gg_rock_l', 'gg_slab', 'gg_boulder', 'gg_rock_s']), x, z, rng() * 6, { solid: true, scale: R(0.7, 1.3) }); mark(x - 1.5, z - 1.5, x + 1.5, z + 1.5, 2); } } }
      // mountain flanks just outside the playable area (visual framing)
      for (let i = 0; i < 3200; i++) {
        const x = R(0, W), z = R(0, H), d = dAt(x, z); if (d < 2 || d > 70) continue;
        if (N2(x, z, 30) < 0.42) continue;
        w.prop(pick(['pine', 'gg_spruce', 'gg_pinebig', 'pine', 'deadTree']), x, z, rng() * 6, { solid: true, scale: R(0.8, 1.3) });
      }
      // undergrowth + grass tufts + flowers in the open
      w.scatter('gg_grass', [40, 20, 1060, 800], 5200, { avoid: (x, z) => !inPlay(x, z) || (occ(x, z) & 11) });
      w.scatter('gg_bush', [40, 20, 1060, 800], 1400, { avoid: (x, z) => avoidT(x, z) });
      w.scatter('bush', [40, 20, 1060, 800], 800, { avoid: (x, z) => avoidT(x, z) });
      w.scatter('gg_flowers', [300, 440, 1000, 800], 500, { avoid: (x, z) => avoidT(x, z) });
      // reeds along the lake shore
      for (let i = 0; i < 260; i++) { const a = rng() * PI * 2, x = 286 + Math.cos(a) * R(96, 112), z = 398 + Math.sin(a) * R(58, 72); if (!avoidT(x, z) && Math.abs(z - 392) > 12) w.prop(pick(['gg_grass', 'gg_fern', 'bush']), x, z, rng() * 6, { scale: R(0.9, 1.4) }); }
      // rocks + boulders dressing the outcrops and the slopes
      for (const o of outcrops) {
        const n = Math.round(o.pts.length * 0.9);
        for (let i = 0; i < n; i++) { const p = o.pts[Math.floor(rng() * o.pts.length)], k = pick(['gg_rock_m', 'gg_rock_m2', 'gg_rock_l', 'gg_boulder', 'gg_rock_s', 'gg_slab', 'gg_crag']), x = p[0] + R(-2, 2), z = p[1] + R(-2, 2), r = rng() * 6, sc = R(0.7, 1.2); w.prop(k, x, z, r, { solid: true, scale: sc }); mark(x - 1.6 * sc, z - 1.6 * sc, x + 1.6 * sc, z + 1.6 * sc, 2); }
        w.prop('gg_scree', o.pts[0][0] + R(-3, 3), o.pts[0][1] + R(2, 5), rng() * 6, {});
      }
      // boulders at the plateau cliff feet (shelf, spur, mesa)
      for (const P of [SHELF, SPUR, MESA]) for (let i = 0; i < P.length; i++) {
        const [ax, az] = P[i], [bx, bz] = P[(i + 1) % P.length], L = Math.hypot(bx - ax, bz - az);
        for (let s = 4; s < L; s += 9) { const t = s / L, nx = (bz - az) / L, nz = -(bx - ax) / L, off = R(4, 7); const x = ax + (bx - ax) * t + nx * off, z = az + (bz - az) * t + nz * off; if (avoidT(x, z) || onPlateau(x, z) || rng() < 0.4) continue; w.prop(pick(['gg_rock_l', 'gg_rock_m', 'gg_crag', 'gg_slab', 'gg_boulder']), x, z, rng() * 6, { solid: true, scale: R(0.8, 1.4) }); }
      }
      for (let i = 0; i < 800; i++) {
        const x = R(40, 1060), z = R(15, 810); if (avoidT(x, z)) continue;
        const k = pick(['gg_rock_s', 'gg_rock_s', 'gg_boulder', 'gg_rock_m', 'rock', 'gg_scree', 'gg_rock_m2']), r = rng() * 6, sc = R(0.6, 1.3);
        w.prop(k, x, z, r, { solid: true, scale: sc }); mark(x - 1.2 * sc, z - 1.2 * sc, x + 1.2 * sc, z + 1.2 * sc, 2);
      }
      for (let i = 0; i < 1100; i++) {
        const x = R(0, W), z = R(0, H), d = dAt(x, z); if (d < -6 || d > 50) continue;
        const k = pick(['gg_rock_l', 'gg_rock_l2', 'gg_crag', 'gg_slab', 'gg_rock_m']), r = rng() * 6, sc = R(0.9, 1.8);
        w.prop(k, x, z, r, { solid: true, scale: sc }); mark(x - 2 * sc, z - 2 * sc, x + 2 * sc, z + 2 * sc, 2);
      }
      // paint: terrain variety (moss under trees, gravel washes, dirt patches)
      w.paintFn((x, z, t) => {
        const n = N1(x, z, 26), n2 = N2(x, z, 9), d = dAt(x, z);
        if (t !== 0) return null;
        if (d > 4) return n2 > 0.62 ? 'gravel' : (n > 0.5 ? 'rock' : 'moss');
        const big = N2(x, z, 85), rocky = big > 0.5 && !(occ(x, z) & 4);
        if (rocky) { if (n2 > 0.66) return 'rock'; if (n2 > 0.48) return 'gravel'; if (n < 0.4) return 'dirt'; return null; }
        if (n > 0.68) return 'moss';
        if (n < 0.3 && n2 > 0.45) return 'dirt';
        if (n2 > 0.72) return 'gravel';
        return null;
      });
      // ARK husks + debris strewn across the valley; raider caches & field loot outdoors
      for (let i = 0; i < 70; i++) { const x = R(60, 1040), z = R(30, 800); if (avoidT(x, z)) continue; w.prop(pick(['husk', 'debris', 'husk', 'barrel', 'crate']), x, z, rng() * 6, { solid: true }); if (rng() < 0.45) { const k = pick(['arc_husk', 'crate', 'raider_cache', 'backpack', 'trash']); if (!steep(x + 1.5, z + 1)) w.container(k, x + 1.5, z + 1, 0, { tier: 1 }); } }
      for (let i = 0; i < 70; i++) { const x = R(60, 1040), z = R(30, 800); if (avoidT(x, z)) continue; const k = pick(['plant', 'plant', 'basket', 'plant']); if (!steep(x, z)) w.container(k, x, z, 0, { tier: 1 }); }
    }

    // ======================================================================== 17. ROAMING ARK, BOSSES, CONDITIONS, SPAWNS
    {
      const R0 = [
        ['wasp', 600, 420, 2, [[560, 400], [640, 440], [700, 420]]], ['wasp', 380, 300, 2, [[340, 260], [420, 300], [380, 340]]], ['wasp', 380, 560, 2, [[320, 520], [440, 560], [380, 600]]],
        ['hornet', 700, 700, 2, [[660, 660], [760, 700], [720, 760]]], ['hornet', 160, 420, 1, [[120, 380], [200, 440], [160, 480]]], ['rocketeer', 640, 460, 1, [[580, 440], [700, 470], [640, 500]]],
        ['wasp', 980, 540, 2, [[940, 500], [1040, 520], [1000, 590]]], ['snitch', 620, 380, 1, [[580, 360], [660, 400], [620, 440]]], ['snitch', 850, 180, 1, [[820, 160], [880, 220]]],
        ['wasp', 1000, 140, 2, [[960, 130], [1050, 150], [1000, 260]]], ['hornet', 200, 560, 1, [[160, 520], [240, 580], [200, 620]]], ['wasp', 560, 780, 2, [[480, 780], [640, 790]]],
        ['wasp', 470, 260, 2, [[430, 240], [520, 260], [480, 300]]], ['hornet', 860, 520, 1, [[820, 500], [880, 560], [840, 600]]],
      ];
      for (const [k, x, z, c, p] of R0) w.arkSpawn(k, x, z, { count: c, patrol: p });
      for (const [k, x, z, c] of [['leaper', 700, 640, 1], ['leaper', 400, 330, 1], ['bastion', 880, 740, 1], ['bombardier', 700, 360, 1], ['spotter', 680, 380, 1], ['tick', 420, 420, 3], ['pop', 560, 600, 2],
        ['fireball', 740, 620, 2], ['fireball', 360, 200, 2], ['tick', 860, 600, 2], ['pop', 200, 760, 2], ['surveyor', 480, 760, 1], ['surveyor', 160, 340, 1], ['shredder', 820, 460, 1],
        ['tick', 130, 470, 2], ['pop', 960, 640, 2], ['leaper', 1000, 400, 1], ['fireball', 700, 100, 2], ['tick', 540, 260, 3], ['spotter', 560, 640, 1], ['rocketeer', 330, 600, 1],
        ['pop', 600, 700, 2], ['leaper', 300, 560, 1], ['tick', 760, 240, 2]])
        w.arkSpawn(k, x, z, { count: c, radius: 12 });
      // ---- condition bosses: arenas for spawnBoss (The Landlady guards the Juicer in the north meadow; Helicopter Mom over the south-east)
      w.paintCircle('dirt', 600, 336, 24, 0.35, 5); w.paintCircle('mud', 600, 336, 9, 0.5, 6);
      for (const [x, z, k, r] of [[584, 322, 'husk', 0.4], [616, 350, 'gg_strut', 1.2], [610, 318, 'debris', 0], [586, 352, 'gg_hullplate', 2.2], [622, 332, 'debris', 1]]) w.prop(k, x, z, r, { solid: true });
      w.poi('harvester_site', 'Juicer Meadow', 600, 336, 0.5, { tier: 3, bossPoi: ['queene'], hideLabel: true });
      w.arkSpawn('hornet', 600, 336, { count: 2, condition: 'harvester', patrol: [[570, 310], [630, 312], [632, 362], [570, 362]] });
      w.arkSpawn('rocketeer', 610, 350, { count: 1, condition: 'harvester', patrol: [[560, 300], [650, 330], [590, 380]] });
      w.arkSpawn('wasp', 590, 320, { count: 3, condition: 'harvester', patrol: [[580, 300], [630, 340], [580, 370]] });
      w.poi('matriarch_arena', 'Mom\'s Landing', 890, 690, 0.5, { tier: 3, bossPoi: ['matriark'], hideLabel: true });
      w.arkSpawn('wasp', 890, 690, { count: 3, condition: 'matriarch', patrol: [[850, 650], [940, 650], [950, 740], [860, 740]] });
      w.arkSpawn('hornet', 870, 700, { count: 2, condition: 'matriarch', patrol: [[820, 660], [900, 640], [940, 720], [860, 760]] });
      // ---- Forgot My Password: the shutdown puts a HOA President in the gate yard; printers hold the four codes
      w.arkSpawn('bastion', 852, 420, { count: 1, radius: 8, condition: 'locked_gate' });
      // player insertion points around the edges
      for (const [x, z] of SPAWNS) w.spawnPoint(x, z);
      w.zone('Outskirts', PLAY, { tier: 1 });
      w.zone("Squatters' Rights", [[92, 694], [140, 694], [140, 732], [92, 732]], { tier: 1 });
      w.zone('Free Trial Glade', [[738, 84], [804, 84], [804, 136], [738, 136]], { tier: 1 });
    }

    // ======================================================================== 18. CUTTINGS + LEVEL FIX-UPS
    for (const [pts, h] of cuts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } w.flattens.push({ x0: a, z0: b, x1: c, z1: d, poly: pts, h, blend: 0 }); }
    // outdoor ARK groups whose anchor lies over an underground hall spawn on the surface (the lid), not in the tunnel
    const inHall = (x, z) => underHalls.some(o => { const [lx, lz] = localOf(o, x, z); return lx > 0 && lz > 0 && lx < o.w && lz < o.d; });
    for (const s of w.arkSpawns) if (!s.habitat && s.y == null && s.yAbs == null && inHall(s.x, s.z)) s.surface = true;
    // the Shelf over the halls is scrub and broken rock: dress the lids (props standing on a lid are cut away with it
    // while you are inside the hall below). Keep clear of stairwells, grates, buildings and perches.
    {
      const keep = [[GX, 420, 6], ...w.spawns.map(p => [p.x, p.z, 4]), ...w.extracts.map(e => [e.x, e.z, 8])];
      const solidB = w.buildings.filter(b => !b.under);
      const kinds = ['gg_rock_s', 'gg_rock_s', 'gg_rock_m', 'gg_boulder', 'gg_scree', 'gg_bush', 'bush', 'gg_grass', 'gg_grass', 'gg_bush'];
      for (const o of underHalls) {
        const holes = [...(o.stairs || []).map(st => stairRect(o, st, 2.5)), ...(o.roofExtras || []).map(([x0, z0, x1, z1]) => [x0 - 1.2, z0 - 1.2, x1 + 1.2, z1 + 1.2])];
        const n = Math.round(o.w * o.d / 42);
        for (let i = 0; i < n; i++) {
          const lx = R(2.5, o.w - 2.5), lz = R(2.5, o.d - 2.5), k = pick(kinds), r = rng() * 6, sc = R(0.6, 1.1);
          if (holes.some(([x0, z0, x1, z1]) => lx > x0 && lx < x1 && lz > z0 && lz < z1)) continue;
          const [x, z] = worldOf(o, lx, lz);
          if (keep.some(([cx, cz, rr]) => Math.hypot(x - cx, z - cz) < rr)) continue;
          if (occ(x, z) & 1) continue;
          if (solidB.some(b => x > b.ax0 - 2 && x < b.ax1 + 2 && z > b.az0 - 2 && z < b.az1 + 2)) continue;
          w.prop(k, x, z, r, { surface: true, scale: sc, solid: k.includes('rock') || k === 'gg_boulder' });
        }
      }
      // a rail round each stair hole in a lid (open on the stair's top end)
      for (const o of underHalls) for (const st of o.stairs || []) {
        const [x0, z0, x1, z1] = stairRect(o, st, 0.75), topSide = st.dir;
        const sides = { n: [[x0, z0, x1, z0]], s: [[x0, z1, x1, z1]], w: [[x0, z0, x0, z1]], e: [[x1, z0, x1, z1]] };
        for (const sd of ['n', 's', 'w', 'e']) { if (sd === topSide) continue; for (const [a, b, c, d] of sides[sd]) w.block(Math.min(a, c) - 0.08 + o.x, Math.min(b, d) - 0.08 + o.z, Math.max(a, c) + 0.08 + o.x, Math.max(b, d) + 0.08 + o.z, 1.0, 'rust', { y0: SHELF_Y + 0.02, xray: false }); }
      }
    }

    // insertion points stand on open ground: drop solid scatter (rocks, trees, scrub) within 3 m of each
    w.props = w.props.filter(p => !(p.opts?.solid && !p.opts?.bid && p.opts?.yAbs == null && SPAWNS.some(([x, z]) => Math.abs(p.x - x) < 3 && Math.abs(p.z - z) < 3)));

    // ======================================================================== 19. DROPSHIP SKY
    // The airshaft dropship (engine/extracts.js) comes in low from behind the shaft (rig-local -z), hovers ~7 m up
    // and climbs away forward. Drop the few tall trees whose crowns sit in that flight path. No random draws.
    {
      const TREE = /pine|spruce|tree|birch/i, dims = new Map();
      const dim = (k) => { if (!dims.has(k)) { const g = propGeo(k); if (g && !g.boundingBox) g.computeBoundingBox(); const b = g?.boundingBox; dims.set(k, b ? [b.max.y, Math.max(b.max.x - b.min.x, b.max.z - b.min.z) / 2] : null); } return dims.get(k); };
      const path = [];
      for (let k = 0; k <= 1.0001; k += 0.02) path.push([-12 * k, 7.2 + 20 * k ** 1.6, -46 * k], [8 * k * k, 7.2 + 22 * k ** 1.5, 52 * k * k]);
      for (const x of w.extracts.filter(e => e.kind === 'airshaft')) {
        const c = Math.cos(x.face || 0), sn = Math.sin(x.face || 0), gy = x.yAbs ?? w.groundAt(x.x, x.z);
        w.props = w.props.filter(p => {
          if (!TREE.test(p.kind) || Math.abs(p.x - x.x) > 60 || Math.abs(p.z - x.z) > 60) return true;
          const d = dim(p.kind); if (!d) return true;
          const sc = p.opts?.scale || 1, h = d[0] * sc, r = d[1] * sc, top = (p.opts?.yAbs ?? w.groundAt(p.x, p.z)) - gy + h;
          if (top < 6) return true;
          const dx = p.x - x.x, dz = p.z - x.z, lx = dx * c - dz * sn, lz = dx * sn + dz * c;
          return !path.some(([sx, sy, sz]) => {
            const yb = sy - 0.8; if (yb >= top) return false;
            return Math.hypot(Math.max(0, Math.abs(lx - sx) - 3.75), Math.max(0, Math.abs(lz - sz) - 3.75)) < r * Math.min(1, (top - yb) / (0.7 * h));
          });
        });
      }
    }
    void defPoly; void fillPoly;
  },
};
