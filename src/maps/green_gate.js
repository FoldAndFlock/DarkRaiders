// Green Gate — patterned after ARC Raiders' "The Blue Gate" (1100 x 825 m, north up).
// Layout traced from docs/ref/blue_gate_*.jpg (see docs/research/map_green_gate.md for the mapping,
// POI list, tunnel approach and deviations). A forested mountain valley: the highway climbs in from
// the collapsed bridges in the south-west, crosses the Checkpoint and ends at the colossal Outer
// Gates, behind which the Traffic Tunnel network is cut into the upper bench (cut-and-cover
// corridors whose roofs fade when entered). Everything is deterministic (seeded rng only).
import './props_green_gate.js';
import { pointInPoly, mulberry, rotFrame, rotPt, unrotPt } from '../engine/world.js';

const W = 1100, H = 825;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const PI = Math.PI, R2 = Math.SQRT1_2;
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

// ------------------------------------------------------------------------------------ LAYOUT
// playable valley; outside it the terrain climbs into terraced mountains
const PLAY = [[112, 78], [150, 40], [205, 16], [290, 10], [380, 8], [440, 6], [470, 3], [515, 4], [555, 9], [600, 17], [650, 23], [700, 28], [750, 33], [790, 37], [825, 35], [860, 29],
  [895, 33], [930, 37], [965, 43], [992, 30], [1000, 12], [1062, 10], [1078, 40], [1072, 110], [1042, 138], [1002, 165], [990, 230], [983, 300], [978, 380], [972, 460], [962, 540],
  [945, 610], [915, 670], [870, 725], [800, 762], [720, 782], [640, 797], [580, 806], [540, 812], [490, 800], [400, 780], [320, 764], [240, 756], [160, 754], [100, 762], [60, 738],
  [38, 700], [38, 612], [44, 560], [50, 510], [52, 470], [44, 430], [44, 380], [52, 330], [66, 285], [78, 230], [84, 170], [98, 115]];
// upper bench (Reinforced Reception, Headhouse, Data Vault, Warehouse, tunnels) — 9.5 m
const BENCH_Y = 9.5, TUN_Y = 5.0;   // tunnels: 4.5 m under the bench (underground halls with walkable lids)
const BENCH = [[508, 50], [600, 42], [700, 48], [790, 52], [858, 60], [862, 120], [858, 178], [850, 232], [868, 300], [845, 332], [800, 366], [760, 380], [700, 380],
  [684, 358], [640, 357], [626, 347], [558, 279], [530, 268], [500, 252], [484, 232], [478, 205], [486, 178], [498, 150], [500, 110], [505, 72]];
const PEAK_Y = 21;
const PEAK = [[868, 72], [930, 62], [984, 70], [994, 120], [978, 176], [920, 182], [874, 174], [864, 122]];
// gate frame: centre GC, NV = NE (toward the tunnels), UV = SE (along the gate)
const GC = [592, 313], NV = [R2, -R2], UV = [R2, R2];
const cp = (a, b) => [GC[0] + NV[0] * a + UV[0] * b, GC[1] + NV[1] * a + UV[1] * b];
const CHK_POLY = [cp(-8, -46), cp(-8, 46), cp(-160, 48), cp(-238, 40), cp(-238, -38), cp(-160, -48)];
const PLAZA = [cp(-10, -47), cp(-10, 47), cp(-152, 47), cp(-152, -47)];
// gate frame (a, b): a along NV (north-east, into the complex), b along UV (south-east, along the gate).
// The reference's Security Wing, Maintenance Wing, Warehouse zone, Control Room and Checkpoint all sit on
// this 45° grid; the Traffic Tunnel band runs at its own ~84° (NNE).
const toGF = (x, z) => [(x - GC[0]) * NV[0] + (z - GC[1]) * NV[1], (x - GC[0]) * UV[0] + (z - GC[1]) * UV[1]];
// open-sky tunnel yard behind the gate (TUN_Y): gate mouth, Security Wing apron, band mouth, Maintenance Wing mouth
const YARD = [[1, -46], [49, -59], [85, -59], [72, -34], [84, -13], [84, 8], [64, 24], [46, 38], [41, 39], [41, 59], [1, 59]].map(([a, b]) => cp(a, b));
// Traffic Tunnel band: south mouth on the yard -> north cave-in
const TT_S = [624, 246], TT_N = [641, 88], TT_W = 32;
const CREEK = [[1000, 58], [965, 50], [930, 44], [895, 40], [860, 37], [825, 42], [790, 44], [750, 40], [700, 35], [650, 30], [600, 24], [555, 17], [515, 12], [482, 11]];
const LAKE_NE = [[1000, 22], [1040, 16], [1060, 40], [1058, 86], [1036, 114], [1008, 108], [996, 70]];
const LAKE_SW = [[0, 686], [44, 684], [82, 702], [98, 734], [88, 772], [52, 794], [0, 796]];
const GORGE = [[0, 612], [80, 612], [84, 650], [80, 690], [0, 690]];
const POND = [[96, 384], [122, 378], [140, 392], [136, 414], [112, 420], [94, 406]];
// roads (polylines)
const HWY_W = [[262, 606], [300, 578], [340, 547], [380, 515], [415, 487], [444, 461]];
const HWY_C = [cp(-209, 0), cp(-150, 0), cp(-100, 0), cp(-40, 0)];
const R_SOUTH = [[300, 642], [350, 646], [400, 636], [450, 621], [500, 628], [540, 650], [580, 664], [620, 672], [660, 684], [690, 668], [722, 636], [760, 598], [800, 568], [835, 540], [862, 505], [876, 465], [874, 420], [880, 380], [890, 345], [905, 312], [935, 284], [962, 268]];
const R_VILLAGE = [[176, 60], [210, 64], [240, 66], [270, 67], [300, 68], [330, 76], [360, 92], [380, 100], [440, 101], [480, 101], [502, 122], [522, 150], [545, 175]];
const R_VNORTH = [[303, 10], [293, 22], [279, 33], [264, 42], [260, 52], [258, 64]];
const R_VSOUTH = [[240, 66], [244, 86], [242, 104], [234, 122], [215, 142], [190, 150]];
const R_WEST = [[452, 392], [440, 340], [446, 290], [452, 245], [446, 200], [438, 160], [430, 122]];
const R_CHK_S = [cp(-150, 30), [478, 470], [486, 520], [498, 575], [505, 625]];
const R_BENCH = [[545, 175], [576, 176.5], [604, 177]];
const R_PEAK = [[800, 168], [820, 176], [835, 186], [850, 190]];
const R_EAST = [[780, 288], [830, 300], [880, 302], [905, 312]];
const R_FORT = [[690, 668], [668, 700], [640, 716]];

// ------------------------------------------------------------------------------------ MAP
export default {
  id: 'green_gate', name: 'Green Gate', size: [W, H], seed: 4127,
  base: 'grass', cliff: 'rock',
  conditions: ['normal', 'lush_blooms', 'uncovered_caches', 'harvester', 'husk_graveyard', 'matriarch', 'prospecting_probes', 'em_storm', 'night_raid', 'cold_snap', 'locked_gate', 'hurricane', 'close_scrutiny'],
  ambient: { music: 'green_gate', birds: true, wind: 0.6 },
  build(w, rng) {
    const R = (a, b) => a + rng() * (b - a);
    const pick = a => a[Math.floor(rng() * a.length)];
    const N1 = makeNoise(9001), N2 = makeNoise(9002);

    // occupancy (1 m): 1 road, 2 structure, 4 reserved (no outcrops / dense trees), 8 water
    const OCC = new Uint8Array(W * H);
    const mark = (x0, z0, x1, z1, v) => { for (let z = Math.max(0, Math.floor(z0)); z < Math.min(H, Math.ceil(z1)); z++) for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) OCC[z * W + x] |= v; };
    const markLine = (pts, hw, v) => { for (let k = 0; k < pts.length - 1; k++) { const [ax, az] = pts[k], [bx, bz] = pts[k + 1]; for (let z = Math.floor(Math.min(az, bz) - hw); z <= Math.max(az, bz) + hw; z++) for (let x = Math.floor(Math.min(ax, bx) - hw); x <= Math.max(ax, bx) + hw; x++) { if (x < 0 || z < 0 || x >= W || z >= H) continue; if (segDist(x + .5, z + .5, ax, az, bx, bz) <= hw) OCC[z * W + x] |= v; } } };
    const markPoly = (pts, v) => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } for (let z = Math.max(0, Math.floor(b)); z < Math.min(H, d); z++) for (let x = Math.max(0, Math.floor(a)); x < Math.min(W, c); x++) if (pointInPoly(x + .5, z + .5, pts)) OCC[z * W + x] |= v; };
    const occ = (x, z) => (x < 0 || z < 0 || x >= W || z >= H) ? 255 : OCC[Math.floor(z) * W + Math.floor(x)];
    const free = (x, z, m = 0, mask = 7) => { for (const [dx, dz] of [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]]) if (occ(x + dx, z + dz) & mask) return false; return true; };
    const inPlay = (x, z) => pointInPoly(x, z, PLAY);

    // ======================================================================== 1. TERRAIN
    // coarse signed distance to the playable polygon (positive = outside)
    const DS = 4, dw = Math.ceil(W / DS) + 1, dh = Math.ceil(H / DS) + 1, DF = new Float32Array(dw * dh);
    for (let j = 0; j < dh; j++) for (let i = 0; i < dw; i++) { const x = i * DS, z = j * DS, d = polyEdgeDist(PLAY, x, z); DF[j * dw + i] = pointInPoly(x, z, PLAY) ? -d : d; }
    const dAt = (x, z) => { const fx = x / DS, fz = z / DS, i = Math.min(dw - 2, Math.floor(fx)), j = Math.min(dh - 2, Math.floor(fz)), tx = fx - i, tz = fz - j; const a = DF[j * dw + i], b = DF[j * dw + i + 1], c = DF[(j + 1) * dw + i], d = DF[(j + 1) * dw + i + 1]; return (a + (b - a) * tx) * (1 - tz) + (c + (d - c) * tx) * tz; };

    w.noiseHills(2.6, 70, 41);
    w.noiseHills(0.9, 19, 42);
    w.heightFn((x, z) => 2.6
      + 4.2 * ss(250, 70, z) * ss(150, 290, x)
      + 2.4 * ss(190, 60, z) * ss(200, 260, x) * (1 - ss(470, 520, x))
      + 3.6 * ss(780, 930, x) * (1 - ss(560, 700, z))
      - 2.6 * ss(500, 600, z) * ss(400, 260, x)
      + 3.2 * ss(610, 730, z) * ss(640, 800, x)
      + 1.6 * ss(130, 60, x)
      + 1.4 * ss(260, 200, z) * ss(430, 330, x) * ss(110, 190, x), 'add');
    // mountains around the valley: terraced limestone with ridged noise
    w.heightFn((x, z) => {
      const d = dAt(x, z);
      if (d < -34) return null;
      if (d < 0) { const t = 1 + d / 34; return 3.2 * t * t * (0.6 + N1(x, z, 30)); }
      const n = N1(x, z, 46), n2 = N2(x, z, 14);
      let h = 4.5 + Math.min(d, 46) * 0.9 + n * 12 + n2 * 3 + Math.min(14, Math.max(0, d - 46) * 0.2);
      const st = 3.4, q = h / st, f = q - Math.floor(q);
      h = (Math.floor(q) + ss(0.5, 0.86, f)) * st;
      return h + 8 * ss(0, 2.4, d);          // sheer limestone cliff along the whole boundary
    }, 'add');

    // --- bench + peak (soft pass, low areas, hard pass -> cliffs only where low areas cut in)
    w.raisePoly(PEAK, PEAK_Y, 26, 'set');
    w.raisePoly(BENCH, BENCH_Y, 22, 'set');
    const WCORR = [[428, 150], [486, 168], [474, 206], [480, 236], [498, 256], [530, 272], [552, 284], [520, 312], [430, 312], [418, 240]];
    w.raisePoly(WCORR, 5.6, 10, 'set');
    w.raisePoly(CHK_POLY, 3.6, 12, 'set');
    const EFIELD = [[628, 352], [690, 386], [760, 388], [820, 360], [860, 336], [880, 420], [800, 470], [660, 450], [612, 380]];
    w.raisePoly(EFIELD, 6.6, 14, 'set');
    w.raisePoly([[858, 186], [995, 186], [995, 230], [858, 230]], 10.2, 10, 'set');      // peak south foot
    w.river(CREEK, 9, { level: 3.4, depth: 1.3, bank: 4, bed: 'mud' });
    w.raisePoly(BENCH, BENCH_Y, 0, 'set');
    w.raisePoly(PEAK, PEAK_Y, 0, 'set');
    // gentle bumps on the bench / peak tops away from structures
    w.heightFn((x, z) => (x > 476 && x < 870 && z > 40 && z < 382 && pointInPoly(x, z, BENCH) && (x > 800 || (z < 110 && x < 600))) ? (N2(x, z, 24) - 0.5) * 1.6 * ss(0, 14, polyEdgeDist(BENCH, x, z)) : null, 'add');
    // lakes, gorge, pond
    w.raisePoly(LAKE_NE, 1.0, 8, 'set'); w.waterPoly(LAKE_NE.map(([x, z]) => [x + (x - 1027) * 0.12, z + (z - 64) * 0.12]), { level: 3.4, deep: 0x1c4a5c, shallow: 0x3a8088 });
    w.raisePoly(LAKE_SW, -2.2, 10, 'set'); w.waterPoly([[0, 680], [50, 678], [90, 700], [106, 736], [96, 778], [56, 802], [0, 804]], { level: 0.3, deep: 0x1a3a44, shallow: 0x30605c });
    w.raisePoly(GORGE, -1.4, 5, 'set'); w.waterPoly([[0, 606], [86, 606], [92, 650], [88, 694], [0, 694]], { level: 0.3, deep: 0x1a3a44, shallow: 0x30605c });
    w.raisePoly(POND, 0.2, 6, 'set'); w.waterPoly(POND.map(([x, z]) => [x + (x - 117) * 0.15, z + (z - 399) * 0.15]), { level: 1.4, deep: 0x26442e, shallow: 0x46684a });
    // local hills
    w.raiseCircle(612, 716, 50, 6.5, 0.75, 'add');          // Ancient Fort hill
    w.raiseCircle(678, 488, 24, 4.5, 0.55, 'add');          // Overlook knoll
    w.ridge([[905, 330], [902, 380], [897, 430], [903, 480], [916, 525]], 12, 17.5, 9, 'max');   // the Ridgeline crest
    w.ridge([[930, 560], [952, 620], [940, 680]], 18, 16, 14, 'max');
    for (const [cx, cz, r, h] of [[668, 562, 7, -2.4], [652, 580, 6, -2.2], [690, 548, 8, -2.6], [636, 596, 5, -1.8], [706, 534, 6, -2.0], [622, 612, 5, -1.6]]) w.raiseCircle(cx, cz, r, h, 0.6, 'add');  // Broken Earth craters

    // reserve POI footprints + roads before scattering outcrops
    const RES = [[235, 18, 378, 108], [378, 50, 530, 162], [520, 128, 632, 292], [548, 84, 706, 352], [640, 58, 800, 160], [630, 150, 800, 402], [836, 54, 1000, 236],
      [880, 262, 975, 372], [612, 466, 704, 540], [628, 540, 720, 612], [398, 540, 585, 672], [566, 676, 662, 762], [236, 268, 320, 322], [282, 186, 324, 224], [138, 132, 198, 188],
      [90, 250, 280, 500], [255, 560, 345, 615], [885, 400, 925, 460], [0, 588, 262, 672], [383, 258, 439, 314]];
    for (const r of RES) mark(...r, 4);
    // extraction sites (hatches / airshafts) stay clear of the rock outcrops
    for (const [x, z, r] of [[500, 108, 6], [216, 307, 6], [273, 472, 12], [444, 527, 8], [679, 486, 12], [459, 218, 12], [955, 292, 6], [802, 281, 12]]) mark(x - r, z - r, x + r, z + r, 4);
    markPoly(CHK_POLY, 4); markPoly(YARD, 4 | 1); markPoly(PLAZA, 1);
    markPoly([cp(-14, -52), cp(12, -52), cp(12, 52), cp(-14, 52)], 1 | 4);
    for (const [pts, hw] of [[HWY_W, 9], [HWY_C, 10], [R_SOUTH, 6], [R_VILLAGE, 5], [R_VNORTH, 4], [R_WEST, 5], [R_CHK_S, 5], [R_BENCH, 5], [R_PEAK, 6], [R_EAST, 5], [R_FORT, 5]]) markLine(pts, hw, 1);
    markLine(CREEK, 9, 8); markPoly(LAKE_NE, 8); markPoly(LAKE_SW, 8); markPoly(GORGE, 8); markPoly(POND, 8);

    // --- rocky outcrops (the pale crescents all over the reference): steep ridges + rock paint
    const outcrops = [];
    const OZ = [[480, 45, 860, 140, 22], [320, 140, 440, 300, 16], [330, 300, 430, 520, 18], [640, 380, 870, 545, 46], [790, 150, 860, 330, 10], [540, 515, 770, 690, 26],
      [700, 540, 950, 770, 34], [110, 600, 300, 745, 8], [100, 60, 240, 250, 10], [860, 190, 975, 580, 16], [440, 620, 640, 790, 14], [240, 400, 380, 520, 8]];
    for (const [x0, z0, x1, z1, n] of OZ) {
      let made = 0, tries = 0;
      while (made < n && tries++ < n * 30) {
        const cx = R(x0, x1), cz = R(z0, z1), rad = R(8, 24), a0 = R(0, PI * 2), span = R(0.7, 2.3), wd = R(2.5, 6), hh = R(2.2, 6.2);
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
    // highway: elevated causeway from the collapsed bridges up to the Checkpoint, then the gate ramp
    {
      const P = resample(HWY_W, 5), L = P.length - 1;
      levelPath(P, P.map((_, i) => 8 - 4.4 * ss(0, 1, i / L)), 13, 0.6);
        const C = resample([cp(-209, 0), cp(-40, 0), cp(-16, 0), cp(2, 0), cp(8, 0)], 5);
      levelPath(C, C.map(([x, z]) => { const a = (x - GC[0]) * NV[0] + (z - GC[1]) * NV[1]; return a < -40 ? 3.6 : a < 4 ? 3.6 + (TUN_Y - 3.6) * ss(-40, 4, a) : TUN_Y; }), 17, 2);
    }
    // the yard behind the gate (sunk into the bench), then tunnel ramps later
    w.raisePoly(YARD, TUN_Y, 0, 'set');
    w.road(resample(HWY_W, 5), 12, 'concrete', { edge: 'gravel', edgeW: 0.8, level: false });
    w.road(resample([cp(-212, 0), cp(4, 0), [610, 284], [621, 256]], 5), 15, 'concrete', { edge: 'gravel', edgeW: 1, level: false });
    // painted lane markings (flat rotatable props: the terrain atlas can't draw diagonal lines)
    const dashLine = (pts, kind = 'gg_lane', period = 6, from = 0) => {
      for (let k = 0; k < pts.length - 1; k++) {
        const [ax, az] = pts[k], [bx, bz] = pts[k + 1], L = Math.hypot(bx - ax, bz - az), rot = Math.atan2(-(bz - az), bx - ax);
        for (let s = from; s < L; s += period) w.prop(kind, ax + (bx - ax) * s / L, az + (bz - az) * s / L, rot, { y: 0.03 });
      }
    };
    const offLine = (pts, o) => pts.map(([x, z], i) => { const [ax, az] = pts[Math.max(0, i - 1)], [bx, bz] = pts[Math.min(pts.length - 1, i + 1)], L = Math.hypot(bx - ax, bz - az) || 1; return [x - (bz - az) / L * o, z + (bx - ax) / L * o]; });
    dashLine(HWY_W, 'gg_laney', 7); dashLine(offLine(HWY_W, 3), 'gg_lane', 7, 3); dashLine(offLine(HWY_W, -3), 'gg_lane', 7, 3);
    dashLine(offLine(HWY_W, 5.6), 'gg_lane', 2.4); dashLine(offLine(HWY_W, -5.6), 'gg_lane', 2.4);
    const HC2 = [cp(-212, 0), cp(-152, 0)];
    dashLine(HC2, 'gg_laney', 7); dashLine(offLine(HC2, 3.6), 'gg_lane', 7, 3); dashLine(offLine(HC2, -3.6), 'gg_lane', 7, 3);
    dashLine(offLine(HC2, 7), 'gg_lane', 2.4); dashLine(offLine(HC2, -7), 'gg_lane', 2.4);
    const RS = roadL(R_SOUTH, 6, 'concrete', { smooth: 4 }); dashLine(RS, 'gg_laney', 8);
    roadL(R_VILLAGE, 5, 'gravel', { edge: 'dirt', smooth: 2 });
    roadL(R_VNORTH, 4, 'gravel', { edge: 'dirt' });
    roadL(R_VSOUTH, 4, 'gravel', { edge: 'dirt', smooth: 2 });
    w.path(resample([[441, 58], [441, 100]], 4), 4, 'gravel'); markLine([[441, 58], [441, 100]], 2.5, 1);
    roadL(R_WEST, 5, 'gravel', { edge: 'dirt', smooth: 3 });
    dashLine(roadL(R_CHK_S, 6, 'concrete', { smooth: 3 }), 'gg_laney', 8);
    roadL(R_BENCH, 6, 'concrete', { level: false });
    roadL(R_PEAK, 6, 'gravel', { level: false });
    roadL(R_EAST, 5, 'gravel', { smooth: 3 });
    roadL(R_FORT, 4, 'dirt', { edge: null, smooth: 2 });
    // forest trails (unlevelled dirt)
    for (const t of [
      [[438, 160], [400, 175], [350, 192], [318, 205], [290, 228], [282, 262], [284, 290], [262, 318], [240, 350], [222, 372]],
      [[180, 58], [168, 100], [168, 150], [190, 196], [240, 212], [290, 210]],
      [[222, 372], [200, 420], [214, 470], [262, 480], [290, 520], [300, 560]],
      [[446, 290], [400, 300], [350, 320], [320, 360], [300, 400], [276, 455]],
      [[505, 625], [470, 610], [440, 600], [420, 580], [398, 560], [370, 548]],
      [[540, 650], [560, 690], [590, 712], [612, 716]],
      [[660, 684], [670, 640], [664, 600], [655, 560], [640, 528], [636, 512]],
      [[722, 636], [700, 590], [688, 548], [682, 500]],
      [[876, 465], [895, 440], [905, 430]],
      [[900, 312], [930, 300], [950, 292]],
      [[835, 186], [860, 210], [900, 205], [935, 215], [952, 240]],
      [[160, 160], [130, 210], [120, 260], [140, 330], [130, 380]],
      [[240, 350], [180, 340], [150, 300], [176, 266]],
    ]) { const P = resample(t, 5); w.path(P, 2.6, 'dirt'); markLine(P, 1.6, 1); }

    // ======================================================================== 3. STRUCTURE HELPERS
    // outline of a building def (optionally grown by m), rotated like the building
    const defPoly = (o, m = 0) => { const Rf = o.rot ? rotFrame(o.x + o.w / 2, o.z + o.d / 2, o.rot) : null; return [[o.x - m, o.z - m], [o.x + o.w + m, o.z - m], [o.x + o.w + m, o.z + o.d + m], [o.x - m, o.z + o.d + m]].map(([x, z]) => rotPt(Rf, x, z)); };
    const bldg = (o) => {
      const def = { storeys: 1, wall: 'plaster', floor: 'tiles', roof: 'roofTar', thick: 0.3, ...o };
      const b = w.building(def);
      // close the stairwell's 0.5 m margin beyond each flight's top step with a landing at the upper floor level
      // (the engine opens the slab a cell wider than the flight on every side)
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
    // door gap centres in the building's own frame (for keeping furniture out of the way)
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
    };
    const FOOT = { gg_bed: 1.0, gg_bunk: 1.0, gg_sofa: 1.0, gg_table: 0.8, gg_pew: 1.5, workbench: 0.8, gg_wardrobe: 0.6, gg_lockers: 0.8, gg_desk: 0.7, gg_console: 0.9, shelf: 0.8, gg_crates: 0.95, gg_generator: 0.9, gg_woodpile: 1 };
    // furniture + loot along walls, computed in the building's local frame and mapped to the world
    // through w.local(bb, …) so rotated buildings furnish exactly like axis-aligned ones
    const furnish = (o, kind, opts = {}, bb = null) => {
      const ww = o.w, dd = o.d, a = o.rot || 0, k = opts.storey || 0, sh = o.storeyH || 3.2;
      const gaps = gapsOf({ ...o, doors: (o.doors || []).filter(d0 => (d0.storey || 0) === k), inner: (o.inner || []).filter(iw => (iw[5] || 0) === k) });
      const T = bb ? (lx, lz) => w.local(bb, lx, lz) : (o.rot ? ((Rf) => (lx, lz) => rotPt(Rf, o.x + lx, o.z + lz))(rotFrame(o.x + o.w / 2, o.z + o.d / 2, o.rot)) : (lx, lz) => [o.x + lx, o.z + lz]);
      const lvl = k && bb ? { bid: bb.id, yRel: k * sh } : {};
      const walls = (o.inner || []).filter(iw => (iw[5] || 0) === k).map(([x0, z0, x1, z1]) => [x0, z0, x1, z1]);
      // keep clear of stair flights (+ their foot / top landings) on both levels they join
      const keepOut = (o.stairs || []).filter(st => st.from === k || st.to === k || (st.to === 'top' && k === 0)).map(st => stairRect(o, st, 1.3));
      const freeOf = (sx, sz, m = 0) => keepOut.every(([x0, z0, x1, z1]) => sx < x0 - m || sx > x1 + m || sz < z0 - m || sz > z1 + m);
      const slots = [], m = 0.72, step = opts.step ?? 2.0;
      for (let s = 1.3; s < ww - 1.1; s += step) { slots.push([s, m, 0]); slots.push([s, dd - m, PI]); }
      for (let s = 1.3; s < dd - 1.1; s += step) { slots.push([m, s, PI / 2]); slots.push([ww - m, s, -PI / 2]); }
      for (const iw of walls) {   // both faces of interior walls too
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
          const kk = pick(fl), off = (FOOT[kk] || 0.6) - 0.6;   // deep items sit further from the wall
          w.prop(kk, ...T(sx + Math.sin(rot) * off, sz + Math.cos(rot) * off), rot - a, { solid: true, ...lvl });
          used.push([sx, sz]);
        }
      }
      // free-standing centre pieces in bigger rooms (tables, crates, workbenches)
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
    // try flights along each outer wall (both ends); avoid doors (any storey), inner walls and their landings. Top ends
    // land on world coords = .25 mod .5 so the 0.5 m stairwell margin never leaves a gap cell at the top step.
    const planStairs = (o, sw = 1.3) => {
      const sh = o.storeyH || 3.2, n = Math.max(2, Math.ceil(sh / 0.38)), L = n * 0.55, W0 = o.w, D0 = o.d;
      const snap = (v, base) => { const t = base + v; return v + (0.25 - (((t % 0.5) + 0.5) % 0.5)); };
      const cands = [];
      const xE = W0 - 0.4 - sw, xW = 0.4, zN = 0.4, zS = D0 - 0.4 - sw;
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
        for (let k = 1; k < (o.storeys || 1) - 1; k++) {   // further flights alongside, alternating direction
          const prev = out[out.length - 1], ax = prev.dir === 'e' || prev.dir === 'w', inward = ax ? (prev.z < D0 / 2 ? 1 : -1) : (prev.x < W0 / 2 ? 1 : -1);
          const B = { ...prev, from: k, to: k + 1, dir: { n: 's', s: 'n', e: 'w', w: 'e' }[prev.dir], x: ax ? prev.x : prev.x + inward * (sw + 0.45), z: ax ? prev.z + inward * (sw + 0.45) : prev.z };
          if (!okSt(B)) { out.length = 0; break; }
          out.push(B);
        }
        if (out.length) return out;
      }
      return [];
    };
    // flatten cuttings applied after every building (tunnel mouths, hall junctions, the yard and the pit): halls
    // flatten their footprint ring to the bench, so openings onto sunk ground are re-cut at the very end
    const cuts = [];
    const cut = (pts, h = TUN_Y) => cuts.push([pts, h]);
    // building + furniture in one go
    const house = (o, kind = 'home', fo = {}) => {
      const S = o.storeys || 1;
      if (S > 1 && o.floors !== false && !o.stairs) o.stairs = planStairs(o);
      if (S > 1 && o.floors !== false && o.upWin !== false) for (let k = 1; k < S; k++) for (const sd of ['n', 's', 'e', 'w']) {
        const L = sd === 'n' || sd === 's' ? o.w : o.d; if (L < 6) continue;
        for (const d0 of winRow(sd, L, 1.6, 3.4, 1.2)) if (!(o.doors || []).some(e => (e.storey || 0) === k && e.side === sd && d0.at < e.at + e.w + 0.4 && e.at < d0.at + d0.w + 0.4)) (o.doors ||= []).push({ ...d0, storey: k });
      }
      if (S > 1 && o.floors !== false && o.upInner !== false && o.w >= 10) {   // one partition upstairs where it clears the stairs
        const xw = Math.round(o.w * 0.5), iw = [xw, 0, xw, o.d, [{ at: o.d / 2 - 0.8, w: 1.6 }]];
        for (let k = 1; k < S; k++) if (!(o.stairs || []).some(st => segHitsRect(iw, stairRect(o, st, 1.3)))) (o.inner ||= []).push([...iw, k]);
      }
      const b = bldg(o); furnish(o, kind, fo, b);
      if (S > 1 && o.floors !== false) for (let k = 1; k < S; k++) furnish(o, kind, { ...fo, storey: k, cont0: fo.upCont ?? Math.max(1, Math.round(o.w * o.d / 45)), fill: 0.6 }, b);
      return b;
    };
    // gate-frame building: local x = a (north-east), local z = b (south-east); 'w' faces SW, 'e' NE, 'n' NW, 's' SE
    const gfDef = (a0, a1, b0, b1, o = {}) => { const [cx, cz] = cp((a0 + a1) / 2, (b0 + b1) / 2), ww = a1 - a0, dd = b1 - b0; return { ...o, x: cx - ww / 2, z: cz - dd / 2, w: ww, d: dd, rot: -PI / 4 }; };
    // hall from A to B (local x along A->B, local z to the right of travel; 'n' = left wall, 's' = right wall)
    const hallDef = ([ax, az], [bx, bz], width, o = {}) => { const L = Math.hypot(bx - ax, bz - az), cx = (ax + bx) / 2, cz = (az + bz) / 2; return { ...o, x: cx - L / 2, z: cz - width / 2, w: L, d: width, rot: Math.atan2(bz - az, bx - ax) }; };
    // world point -> building-local (lx, lz) for a def
    const localOf = (o, x, z) => { const [ux, uz] = unrotPt(o.rot ? rotFrame(o.x + o.w / 2, o.z + o.d / 2, o.rot) : null, x, z); return [ux - o.x, uz - o.z]; };
    const worldOf = (o, lx, lz) => rotPt(o.rot ? rotFrame(o.x + o.w / 2, o.z + o.d / 2, o.rot) : null, o.x + lx, o.z + lz);
    // linear ramp inside a rotated rectangle given in a def's local frame (h0 at lx0/lz0 side -> h1)
    const rampLocal = (o, lx0, lz0, lx1, lz1, h0, h1, axis = 'x') => {
      const pts = [[lx0, lz0], [lx1, lz0], [lx1, lz1], [lx0, lz1]].map(([u, v]) => worldOf(o, u, v));
      const xs = pts.map(p => p[0]), zs = pts.map(p => p[1]);
      w._area(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), (x, z, i) => {
        const [u, v] = localOf(o, x, z); if (u < lx0 - 0.01 || u > lx1 + 0.01 || v < lz0 - 0.01 || v > lz1 + 0.01) return;
        const t = axis === 'x' ? (u - lx0) / (lx1 - lx0) : (v - lz0) / (lz1 - lz0); w.hv[i] = h0 + (h1 - h0) * clamp(t, 0, 1);
      });
      w.paintPoly('concrete', pts); markPoly(pts, 1 | 4);
    };
    const rampGF = (a0, a1, b0, b1, h0, h1, axis) => rampLocal(gfDef(a0, a1, b0, b1), 0, 0, a1 - a0, b1 - b0, h0, h1, axis);
    // simple door/window generators
    const winRow = (side, len, from = 1.5, every = 3.2, w0 = 1.4) => { const out = []; for (let s = from; s + w0 < len - 0.8; s += every) out.push({ side, at: s, w: w0, sill: 1.0 }); return out; };
    // invisible collider band along a diagonal (props are rotated, collision grid is axis-aligned)
    // base: absolute height the band's top is measured from (default: local ground at each step)
    const diagCollide = (ax, az, bx, bz, half, h, step = 1, base = null) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step));
      for (let i = 0; i <= n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; w.prop('gg_col', x, z, 0, base == null ? { y: -0.5, solid: [half, half, h + 0.5] } : { yAbs: base - 0.5, solid: [half, half, h + 0.5] }); }
    };
    const vehicle = (kind, x, z, rot) => { w.prop(kind, x, z, rot, { solid: true }); mark(x - 3, z - 3, x + 3, z + 3, 2); };
    // scatter POI-flavoured clutter in a radius, never on roads / inside buildings
    const clutter = (cx, cz, r, kinds, n, o = {}) => { let k = 0, t = 0; while (k < n && t++ < n * 12) { const a = rng() * PI * 2, d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (!free(x, z, o.m ?? 1.4, o.mask ?? 3) || !inPlay(x, z)) continue; w.prop(pick(kinds), x, z, rng() * PI * 2, { solid: o.solid ?? true, scale: R(o.s0 ?? 0.85, o.s1 ?? 1.15) }); mark(x - 0.8, z - 0.8, x + 0.8, z + 0.8, 2); k++; } };
    const paintPolyN = (tex, pts, edge = 8, sc = 9) => { const id = tex; let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); }
      for (let z = Math.max(0, Math.floor(b)); z < Math.min(H, d); z++) for (let x = Math.max(0, Math.floor(a)); x < Math.min(W, c); x++) { const px = x + 0.5, pz = z + 0.5; if (!pointInPoly(px, pz, pts)) continue; if (polyEdgeDist(pts, px, pz) < N2(px, pz, sc) * edge * 1.6) continue; if (occ(px, pz) & 3) continue; w.paint(id, x, z, x + 1, z + 1); } };
    // static ARK (Sentinels / turrets) stand ON their perch: y = metres above the terrain at (x, z)
    const perched = (kind, x, z, perch, y, o = {}) => w.arkSpawn(kind, x, z, { count: 1, radius: 0, perch, y, ...o });
    // open-deck perch tower (deck top 7.0 m); only the legs collide so the deck's ARK sees out
    // facing (sim convention: 0 = +z/south, atan2(dx, dz)) toward a world point — fixed ARK sweep about it
    const faceTo = (x, z, tx, tz) => Math.atan2(tx - x, tz - z);
    const perchTower = (x, z, arkKind = null, model = 'gg_perchtower', f = null) => {
      w.prop(model, x, z, 0, {});
      for (const [dx, dz] of [[-1.55, -1.55], [1.55, -1.55], [-1.55, 1.55], [1.55, 1.55]]) w.prop('gg_col', x + dx, z + dz, 0, { y: -0.5, solid: [0.25, 0.25, 7.5] });
      // walkable 4 x 4 m deck (top 7.0 m) with railings, a gap where the south-face ladder arrives
      w.prop('gg_col', x, z, 0, { y: 6.5, solid: [2.0, 2.0, 0.5] });
      w.prop('gg_col', x, z - 1.95, 0, { y: 7.0, solid: [2.0, 0.08, 1.0] });
      w.prop('gg_col', x - 1.95, z, 0, { y: 7.0, solid: [0.08, 2.0, 1.0] }); w.prop('gg_col', x + 1.95, z, 0, { y: 7.0, solid: [0.08, 2.0, 1.0] });
      w.prop('gg_col', x - 1.35, z + 1.95, 0, { y: 7.0, solid: [0.65, 0.08, 1.0] }); w.prop('gg_col', x + 1.35, z + 1.95, 0, { y: 7.0, solid: [0.65, 0.08, 1.0] });
      w.ladder(x, z + 2.55, null, x, z + 1.45, null, 0);
      mark(x - 3, z - 3, x + 3, z + 4, 2 | 4);
      if (arkKind) perched(arkKind, x, z - 0.4, 'perch_tower', 7.0, f == null ? {} : { f });
      w.lamp(x + 1.6, z + 1.6, { y: 7.8, model: null, color: 0xe8f4ff, intensity: 1.6, range: 14 });
    };
    // extraction sites: the engine draws the lift head / hatch at the marker (engine/extracts.js); keep its clear zone
    // (5 m airshaft, 2 m hatch) and dress around it — pad, fence arc behind, floodlights either side, vent housing
    const airshaftSite = (id, name, x, z, f) => {
      w.flatten(x - 6.5, z - 6.5, x + 6.5, z + 6.5, null, 3);   // level pad for the lift head
      w.paintCircle('concrete', x, z, 6.5, 0.15, x); w.paintCircle('gravel', x, z, 8.5, 0.3, z);
      mark(x - 8, z - 8, x + 8, z + 8, 2 | 4);
      for (let k = -5; k <= 5; k++) { const a = f + PI + k * 0.24, fx = x + Math.sin(a) * 9.5, fz = z + Math.cos(a) * 9.5; w.prop('gg_fence', fx, fz, -a + PI / 2, { solid: [1.2, 0.15, 2] }); }
      for (const sgn of [-1, 1]) { const a = f + sgn * 1.15; lightPost(x + Math.sin(a) * 7, z + Math.cos(a) * 7, 0xe8f4ff, 'gg_lightmast', 6.5, 2.2, 16); }
      const av = f + PI + 0.9; w.prop('gg_venthouse', x + Math.sin(av) * 7.2, z + Math.cos(av) * 7.2, -av, { solid: true });
      w.lamp(x + Math.sin(f) * 3, z + Math.cos(f) * 3, { y: 2.4, model: null, color: 0x40ff80, intensity: 1.4, range: 9 });
      return w.extract(id, name, x, z, { kind: 'airshaft', face: f });
    };
    const hatchSite = (id, name, x, z, f) => {
      w.flatten(x - 2.5, z - 2.5, x + 2.5, z + 2.5, null, 1.5);
      w.paintCircle('gravel', x, z, 3.2, 0.3, x); mark(x - 3, z - 3, x + 3, z + 3, 2 | 4);
      const as = f + 1.4; w.prop('gg_hatchsign', x + Math.sin(as) * 2.6, z + Math.cos(as) * 2.6, -as, { solid: true });
      w.lamp(x + Math.sin(as) * 2.6, z + Math.cos(as) * 2.6, { y: 2.2, model: null, color: 0xffd040, intensity: 1.4, range: 7 });
      return w.extract(id, name, x, z, { kind: 'hatch', needsKey: 'raider_hatch', face: f });
    };
    const watchtower = (x, z, scale = 1) => {   // roofed decorative guard tower
      w.prop('gg_watchtower', x, z, 0, { scale });
      for (const [dx, dz] of [[-1.55, -1.55], [1.55, -1.55], [-1.55, 1.55], [1.55, 1.55]]) w.prop('gg_col', x + dx * scale, z + dz * scale, 0, { y: -0.5, solid: [0.25, 0.25, 9 * scale] });
      mark(x - 3, z - 3, x + 3, z + 3, 2);
    };
    const lightPost = (x, z, color = 0xffe0b0, model = 'lamp', y = 3.6, intensity = 2.2, range = 13) => w.lamp(x, z, { y, color, intensity: Math.max(intensity, 2.2), range: Math.max(range, 13), model });
    const tunnelLamp = (x, z, y = 3.0) => w.lamp(x, z, { y: Math.min(y, 3.2), model: null, color: 0xffd890, intensity: 2.4, range: 12, flicker: rng() < 0.25 ? 0.4 : 0 });

    // ======================================================================== 4. THE OUTER GATES
    {
      const at = (s, t = 0) => [GC[0] + UV[0] * s + NV[0] * t, GC[1] + UV[1] * s + NV[1] * t];
      const ROT = -PI / 4;   // local +x along the gate (SE), local +z faces the Checkpoint (SW)
      for (const s of [-44, -12, 12, 44]) { const [x, z] = at(s); w.prop('gg_gatepylon', x, z, ROT, { scale: 1.35, solid: [3.7, 3.7, 23.7] }); mark(x - 8, z - 8, x + 8, z + 8, 2 | 4); }
      for (const s of [-28, 28]) { const [x, z] = at(s); w.prop('gg_gatewall', x, z, ROT, {}); }
      for (const s of [-24, 24]) { const [x, z] = at(s, -7.4); w.prop('gg_gateleaf', x, z, ROT, {}); }
      // the gate stands on the plaza (3.6 m) along its whole length; the road opening keeps its ramp up into the yard
      rampGF(-6, 4, -54, -11, 3.6, 3.6, 'x'); rampGF(-6, 4, 11, 54, 3.6, 3.6, 'x');
      // wall colliders measured from each wall block's own base so their top matches the visible beams (15 m)
      const gWall = (sg) => w.groundAt(...at(28 * sg, 0));
      for (const t of [-3.2, 3.2]) { diagCollide(...at(-50, t), ...at(-7, t), 2.3, 15, 0.9, gWall(-1)); diagCollide(...at(7, t), ...at(50, t), 2.3, 15, 0.9, gWall(1)); }
      diagCollide(...at(-31, -7.4), ...at(-17, -7.4), 0.9, 12, 0.8);
      diagCollide(...at(17, -7.4), ...at(31, -7.4), 0.9, 12, 0.8);
      // floodlights on the pylons' checkpoint side + beacon lights
      for (const s of [-44, -12, 12, 44]) { const [x, z] = at(s, -8.5); w.lamp(x, z, { y: 6, model: null, color: 0xd8f0ff, intensity: 2.6, range: 21 }); }
      const [gx, gz] = at(0, -10); w.lamp(gx, gz, { y: 12, model: null, color: 0x9affc8, intensity: 0.9, range: 12 });
      w.paintPoly('concrete', [at(-52, -12), at(52, -12), at(52, 8), at(-52, 8)]);
      for (let s = -6; s <= 6; s += 3) w.prop('gg_chevron', ...at(s, -1), ROT, { y: 0.03 });
      for (let s = -6; s <= 6; s += 4) w.prop('gg_stopline', ...at(s, -11), ROT, { y: 0.03 });
      // staging inside the gate mouth (checkpoint side)
      for (const [s, t] of [[-5, -16], [4, -20], [-2, -26]]) { const [x, z] = at(s, t); w.prop('gg_barrier', x, z, ROT + (rng() - 0.5) * 0.3, { solid: true }); }
      // reference Sentinel icon sits on the gate itself. Pylon tops (32 m) or the wall walk (15 m) would draw it
      // 12-26 m up-screen — off the 22 m view while it lasers you — so it stands on a sentry balcony 8 m up the face
      w.prop('gg_gatebalcony', ...at(19.4, -10.15), ROT, { yAbs: gWall(1) });                     // bolted to the sliding leaf's face (t -8.4)
      perched('sentinel', ...at(19.4, -10.6), 'gate_balcony', 8, { yAbs: gWall(1) + 8, f: Math.atan2(-NV[0], -NV[1]) });   // sweeps the plaza, back to the gate
      w.poi('outer_gates', 'Outer Gates', ...at(0, -2), 44, { tier: 3, aliases: ['outer_gates'] });
    }

    // ======================================================================== 5. CHECKPOINT
    {
      w.paintPoly('concrete', PLAZA);
      for (const b of [-30, -20, -8, 8, 20, 30]) dashLine([cp(-150, b), cp(-96, b)], 'gg_lane', 2.4);
      for (const b of [-14, -2, 2, 14, 25]) dashLine([cp(-150, b), cp(-100, b)], b === -2 || b === 2 ? 'gg_laney' : 'gg_lane', 6);
      dashLine([cp(-80, -2), cp(-12, -2)], 'gg_laney', 3.2); dashLine([cp(-80, 2), cp(-12, 2)], 'gg_laney', 3.2);
      for (const a of [-84, -38]) dashLine([cp(a, -30), cp(a, 30)], 'gg_stopline', 4.4);
      for (const b of [-26, -14, 14, 26]) w.prop('gg_chevron', ...cp(-97, b), -PI / 4, { y: 0.03 });
      const RB = -PI / 4, RV = 3 * PI / 4;
      // inspection line: kiosks between lanes + boom barriers
      for (const b of [-20, -8, 8, 20]) { const [x, z] = cp(-92, b); w.prop('gg_toll', x, z, RB, { solid: true }); w.lamp(x, z, { y: 3.4, model: null, color: 0xfff0c0, intensity: 0.9, range: 7 }); }
      for (const b of [-30, -20, -8, 8, 20]) { const [x, z] = cp(-86, b + 0.6); w.prop('gg_boom', x, z, RB, { solid: true }); }
      const [gx, gz] = cp(-122, 0); w.prop('gg_gantry', gx, gz, RB, {}); w.prop('gg_col', ...cp(-122, -16), 0, { y: -0.5, solid: [0.4, 0.4, 9] }); w.prop('gg_col', ...cp(-122, 16), 0, { y: -0.5, solid: [0.4, 0.4, 9] });
      // chicane of jersey barriers near the gate + sandbag nests
      for (const [a, b0, b1] of [[-34, -30, -4], [-26, 4, 30], [-50, -30, -14], [-50, 14, 30]]) for (let b = b0; b <= b1; b += 3.2) { const [x, z] = cp(a, b); w.prop('gg_barrier', x, z, RB, { solid: true }); }
      for (const [a, b] of [[-60, -26], [-60, 26], [-18, -34], [-18, 34]]) { const [x, z] = cp(a, b); for (let k = -1; k <= 1; k++) { const [sx, sz] = cp(a + k * 1.8, b + (k === 0 ? 1.2 : 0)); w.prop('sandbag', sx, sz, RB, { solid: true }); } w.container('ammo_box', x + 1, z + 1, 0, { tier: 2, poi: 'checkpoint' }); }
      // queued vehicles (buses = quest horn), husks
      const veh = [['gg_bus', -138, -14], ['gg_truck', -130, -26], ['car', -128, 4], ['gg_van', -112, 14], ['car', -140, 24], ['gg_truck', -106, -4], ['gg_bus', -64, 14],
        ['gg_patrolcar', -70, -24], ['car', -58, -12], ['gg_van', -148, -24], ['car', -100, 26], ['gg_truck', -30, 18]];
      for (const [k, a, b] of veh) { const [x, z] = cp(a, b); vehicle(k, x, z, RV + (rng() - 0.5) * 0.25); if (k !== 'gg_patrolcar') w.container('car_trunk', ...cp(a - 3, b), 0, { tier: 1, poi: 'checkpoint' }); }
      for (const [a, b] of [[-118, 34], [-44, -10], [-76, 30]]) w.prop('husk', ...cp(a, b), rng() * 6, { solid: true });
      w.container('arc_husk', ...cp(-44, -12), 0, { tier: 2, poi: 'checkpoint' });
      // shipping containers stacked along the edges
      // buildings in echelon along both edges: axis-aligned blocks stepping along the diagonal so the
      // long NW / SE halls of the reference read as continuous saw-tooth wings
      CONT.medical = ['medical_bag', 'medical_bag', 'cabinet', 'locker', 'trash'];
      const CK = [
        [-148, 'barracks', 'Barracks', 1], [-128, 'office', 'Customs Office', 1], [-108, 'security', 'Inspection Hall', 2], [-88, 'home', 'Mess Hall', 1], [-68, 'office', 'Records Office', 1], [-48, 'office', 'Radio Room', 2],
      ];
      const CK2 = [
        [-148, 'industrial', 'Vehicle Bay', 1], [-128, 'office', 'Medical Post', 1, 'medical'], [-108, 'security', 'Armoury', 2], [-88, 'barracks', 'Barracks East', 1], [-68, 'industrial', 'Workshop', 1], [-48, 'industrial', 'Generator Shed', 1],
      ];
      // rotated with the plaza (gate frame): two continuous saw-tooth wings of 18 x 12 m blocks, 2 m alleys
      for (const [list, bb] of [[CK, -41], [CK2, 41]]) for (const [aa, kind, name, tier, cont] of list) {
        const nw = bb < 0, fs = nw ? 's' : 'n', bs = nw ? 'n' : 's', ww = 18, dd = 12;
        const doors = [{ side: fs, at: 3, w: 1.8 }, { side: 'e', at: 5, w: 1.8 }, { side: bs, at: 13, w: 1.6 }, ...winRow(fs, ww, 7, 3.4, 1.6), ...winRow('w', dd, 1.2, 3, 1.4)];
        const o = gfDef(aa - 9, aa + 9, bb - 6, bb + 6, { storeys: kind === 'industrial' ? 1 : 2, h: kind === 'industrial' ? 4.4 : 6.2, wall: kind === 'industrial' ? 'corrugated' : 'concrete', floor: kind === 'industrial' ? 'concrete' : 'tiles',
          roof: 'roofTar', tint: kind === 'industrial' ? 0xb8c8c0 : 0xd8dcd0, name, doors: doors.filter((d, i, arr) => !arr.some((e, j) => j < i && e.side === d.side && d.at < e.at + e.w + 0.4 && e.at < d.at + d.w + 0.4)),
          inner: [[10, 0, 10, dd, [{ at: 5, w: 1.6 }]], [0, 6, 10, 6, [{ at: 4, w: 1.6 }]]], roofExtras: [[2, 2, 5, 4, 0.9], [12, 7, 16, 10, 0.7]] });
        house(o, kind, { tier, cont, poi: 'checkpoint', density: 32 });
      }
      // chain-link perimeter along both outer edges (gaps for the side gates)
      for (const bb of [-53, 53]) for (let aa = -150; aa < -14; aa += 3) { if (Math.abs(aa + 100) < 4 || Math.abs(aa + 60) < 4) continue; w.prop('gg_fence', ...cp(aa + 1.5, bb), PI / 4, { solid: [1.5, 0.15, 2] }); }
      // traffic cones, lane dividers, sandbagged MG nest near the gate, flags
      for (let i = 0; i < 40; i++) { const aa = R(-150, -20), bb = R(-30, 30); w.prop('gg_cone', ...cp(aa, bb), rng() * 6, {}); }
      for (const bb of [-14, 14]) for (let aa = -150; aa < -100; aa += 3.2) w.prop('gg_curb', ...cp(aa, bb), PI / 4, { solid: true });
      for (const [aa, bb] of [[-24, -48], [-24, 48], [-150, -30], [-150, 30]]) w.prop('gg_flag', ...cp(aa, bb), 0, { solid: true });
      for (const [aa, bb, k] of [[-150, -52, 'gg_container'], [-146, -52, 'gg_container2'], [-134, 52, 'gg_container3'], [-30, -50, 'gg_container2'], [-30, 50, 'gg_container'], [-112, -52, 'gg_crates'], [-80, 52, 'gg_pallet']]) w.prop(k, ...cp(aa, bb), PI / 4, { solid: true });
      // watchtowers at the plaza corners (turrets / sentinel perches) + floodlight masts
      for (const [a, b] of [[-158, -50], [-158, 50], [-20, -56], [-20, 56]]) { const [x, z] = cp(a, b); perchTower(x, z, 'turret', 'gg_perchtower', faceTo(x, z, ...cp(-90, 0))); }
      for (const [a, b] of [[-130, -32], [-130, 32], [-100, -32], [-100, 32], [-70, -32], [-70, 32], [-44, -30], [-44, 30], [-150, 0], [-20, 0]]) { const [x, z] = cp(a, b); w.lamp(x, z, { y: 6.5, model: 'gg_lightmast', color: 0xe8f4ff, intensity: 2.6, range: 21 }); }
      // forested south-west half of the Checkpoint (the reference polygon covers dense woods)
      const FW = [cp(-158, -44), cp(-158, -12), cp(-236, -12), cp(-236, -36)], FE = [cp(-158, 12), cp(-158, 46), cp(-236, 40), cp(-236, 12)];
      for (const f of [FW, FE]) w.forest(f, 2.6, ['pine', 'gg_spruce', 'tree'], { avoid: (x, z) => !free(x, z, 1.2, 3) });
      paintPolyN('moss', FW, 6); paintPolyN('moss', FE, 6);
      w.arkSpawn('bastion', ...cp(-110, 0), { count: 1, radius: 30, patrol: [cp(-140, 0), cp(-40, 0)] });
      w.arkSpawn('wasp', ...cp(-80, -20), { count: 3, patrol: [cp(-140, -30), cp(-40, -30), cp(-40, 30), cp(-140, 30)] });
      w.arkSpawn('hornet', ...cp(-60, 20), { count: 2, patrol: [cp(-30, 30), cp(-120, 40), cp(-150, -20)] });
      w.arkSpawn('tick', ...cp(-92, -42), { count: 3, radius: 6, habitat: 'indoor' });
      w.arkSpawn('pop', ...cp(-64, 40), { count: 2 });
      w.arkSpawn('snitch', ...cp(-180, 20), { count: 1, patrol: [cp(-200, 0), cp(-160, 30), cp(-120, 0)] });
      perchTower(414, 347, 'sentinel', 'gg_perchtower', faceTo(414, 347, 470, 400));   // reference Sentinel icon west of the Checkpoint: covers the plaza's west woods + highway
      w.zone('Checkpoint', CHK_POLY, { tier: 2 });
      w.poi('checkpoint', 'Checkpoint', ...cp(-100, 0), 80, { tier: 2, aliases: ['checkpoint'] });
    }

    // ======================================================================== 6. UPPER BENCH: tunnels, Headhouse, Reception, Warehouse
    // Underground complex = `under` halls: floor 4.5 m below the bench (TUN_Y), 1 m earth walls, a grass lid flush with
    // the bench surface you walk on. Surface buildings that touch a hall are declared BEFORE it (flatten order), and
    // every opening onto sunk ground (yard, pit, junctions, portal) is re-cut at the end of build().
    const UNDER = BENCH_Y - TUN_Y;
    const UND = { under: UNDER, floorY: BENCH_Y, blend: 0, wall: 'damConcrete', floor: 'concrete', roof: 'grass', vents: 0, tint: 0xc8c8c0, perStorey: false };
    const grates = (len, along = 'z', wdt = 18) => { const out = []; for (let s = 8; s < len - 4; s += 20) { const e = along === 'z' ? [wdt / 2 - 1.5, s, wdt / 2 + 1.5, s + 2.2, 0.3] : [s, wdt / 2 - 1.5, s + 2.2, wdt / 2 + 1.5, 0.3]; e.tex = 'metalPanel'; out.push(e); } return out; };
    const full = (side, len) => ({ side, at: 0.6, w: len - 1.2, lintel: false });
    const stTop = (x, z, dir, sw = 2.4) => ({ x, z, w: sw, dir, from: 0, to: 'top' });     // under-hall stair up through the lid (top end against the earth wall)
    const L_TOP = Math.ceil((UNDER + 0.02) / 0.38) * 0.55;
    // local-frame placement helpers for (rotated) defs
    const pl = (o, k, lx, lz, r = 0, opts = { solid: true }) => w.prop(k, ...worldOf(o, lx, lz), r - (o.rot || 0), opts);
    const ct = (o, k, lx, lz, opts = {}) => w.container(k, ...worldOf(o, lx, lz), -(o.rot || 0), opts);
    const lampL = (o, lx, lz, opts) => w.lamp(...worldOf(o, lx, lz), opts);
    const tlampL = (o, lx, lz) => tunnelLamp(...worldOf(o, lx, lz));
    const roomPoly = (o, lx0, lz0, lx1, lz1) => [[lx0, lz0], [lx1, lz0], [lx1, lz1], [lx0, lz1]].map(([u, v]) => worldOf(o, u, v));
    const keyRoomL = (id, o, lx0, lz0, lx1, lz1, opts) => { const P = roomPoly(o, lx0, lz0, lx1, lz1), xs = P.map(q => q[0]), zs = P.map(q => q[1]); w.keyRoom(id, Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), null, { ...opts, poly: P }); };
    const gfPoly = (a0, a1, b0, b1) => [[a0, b0], [a1, b0], [a1, b1], [a0, b1]].map(([a, b]) => cp(a, b));
    const underHalls = [];
    const hall = (o) => { const b = bldg(o); underHalls.push(o); return b; };
    {
      // ================================================================ SURFACE first (flatten order)
      // ---------------------------------------------------------------- Reinforced Reception: the long gate-frame wing NW of the band
      const RR = gfDef(93, 107, -150, -78, { storeys: 2, h: 6.4, wall: 'concrete', floor: 'tiles', roof: 'roofTar', tint: 0xc8ccc4, name: 'Reinforced Reception', floorY: BENCH_Y, blend: 1,
        doors: [{ side: 's', at: 4, w: 6 }, { side: 'w', at: 30, w: 2.4 }, { side: 'w', at: 58, w: 2 }, { side: 'e', at: 18, w: 2 }, { side: 'n', at: 6, w: 2 },
          ...winRow('w', 72, 2, 4, 1.4).filter(d => d.at + d.w < 29.6 || (d.at > 32.8 && d.at + d.w < 57.6) || d.at > 60.4), ...winRow('e', 72, 2, 4.5, 1.4).filter(d => d.at + d.w < 17.6 || d.at > 20.4)],
        inner: [[0, 14, 14, 14, [{ at: 5, w: 2 }]], [0, 28, 14, 28, [{ at: 5, w: 2.4 }]], [0, 44, 14, 44, [{ at: 6, w: 2.4 }]], [0, 56, 14, 56, [{ at: 4, w: 2 }]], [7, 28, 7, 44, [{ at: 6, w: 1.8 }]],
          [0, 14, 14, 14, [{ at: 5, w: 2 }], 1], [0, 36, 14, 36, [{ at: 5, w: 2 }], 1], [7, 36, 7, 56, [{ at: 8, w: 1.8 }], 1], [0, 56, 14, 56, [{ at: 4, w: 2 }], 1]],
        ladders: [{ side: 'e', at: 46 }], roofExtras: [[3, 20, 10, 26, 1.0], [4, 48, 10, 52, 0.8]], upInner: false });
      house(RR, 'security', { tier: 2, poi: 'reinforced_reception', density: 60, upCont: 5 });
      pl(RR, 'gg_desk', 6, 62, PI); pl(RR, 'gg_desk', 9, 62, PI); pl(RR, 'gg_console', 7.5, 65.5, 0);     // the security desk (quest)
      ct(RR, 'security_locker', 12.6, 60, { tier: 3, poi: 'reinforced_reception' });
      for (const [a, b, r] of [[95, -70, 0], [104, -70, 0], [90, -76, PI / 2], [110, -76, PI / 2]]) w.prop('sandbag', ...cp(a, b), r - PI / 4, { solid: true });
      for (const [a, b] of [[100, -66], [96, -62], [104, -62]]) w.prop('gg_barrier', ...cp(a, b), -PI / 4, { solid: true });
      for (const [a, b] of [[88, -80], [112, -80], [88, -150], [112, -150]]) lightPost(...cp(a, b));
      // guard post on the bench over the Security Wing's NW wall: the wing's stair comes up inside it
      const GP = gfDef(58, 74, -108, -92, { h: 3.4, wall: 'concrete', floor: 'tiles', roof: 'roofTar', tint: 0xc8ccc4, name: 'Security Wing Guard Post', floorY: BENCH_Y, blend: 0,
        doors: [{ side: 'n', at: 7, w: 2 }, { side: 'w', at: 3, w: 2 }, ...winRow('e', 16, 2, 4, 1.4)] });
      bldg(GP); pl(GP, 'gg_lockers', 1, 8, PI / 2); pl(GP, 'gg_desk', 14.8, 4, -PI / 2); ct(GP, 'security_locker', 1.2, 4, { tier: 2, poi: 'security_wing' }); ct(GP, 'ammo_box', 14.6, 1.4, { tier: 2, poi: 'security_wing' });
      lampL(GP, 8, 3, { y: 2.6, model: null, color: 0xffe0a0, intensity: 1.4, range: 8 });
      w.zone('Reinforced Reception', gfPoly(52, 114, -156, -60), { tier: 3 });
      w.poi('reinforced_reception', 'Reinforced Reception', ...cp(100, -112), 40, { tier: 3, aliases: ['reinforced_reception'] });
      perchTower(467.5, 191.5, 'sentinel', 'gg_perchtower', faceTo(467.5, 191.5, 455, 240));      // reference Sentinel icon above the Cliffside Airshaft
      w.arkSpawn('wasp', ...cp(100, -112), { count: 2, patrol: [cp(80, -160), cp(120, -160), cp(120, -70), cp(80, -70)] });
      w.arkSpawn('hornet', 520, 200, { count: 1, patrol: [[500, 170], [560, 230], [620, 175]] });

      // ---------------------------------------------------------------- Gate Control Room complex (reference: a 25..78, b 60..105)
      const GCR = gfDef(28, 76, 62, 88, { storeys: 2, storeyH: 3.4, h: 6.8, wall: 'concrete', floor: 'tiles', roof: 'roofTar', tint: 0xd0d4c8, name: 'Gate Control Room', floorY: BENCH_Y, blend: 1,
        doors: [{ side: 'w', at: 3, w: 2.2 }, { side: 'n', at: 30, w: 2 }, { side: 's', at: 40, w: 2 }, ...winRow('n', 48, 2, 3.4, 2).filter(d => d.at + d.w < 29.6 || d.at > 32.4), ...winRow('w', 26, 8, 3.4, 2),
          ...[2, 6, 10, 14, 18, 22].map(at => ({ side: 'w', at, w: 3, sill: 0.9, storey: 1 })), ...[3, 8, 13, 18, 23, 28].map(at => ({ side: 'n', at, w: 3.4, sill: 0.9, storey: 1 }))],
        inner: [[18, 0, 18, 26, [{ at: 10, w: 2 }]], [18, 12, 48, 12, [{ at: 10, w: 2 }, { at: 24, w: 2 }]], [32, 0, 32, 12, [{ at: 4, w: 2 }]], [34, 12, 34, 26, [{ at: 6, w: 2 }], 1]],
        ladders: [{ side: 'e', at: 20 }], upWin: false, upInner: false });
      const GCRb = house(GCR, 'office', { tier: 2, cont: 'lab', poi: 'gate_control_room', density: 60, upCont: 1 });
      // upstairs: the control room proper, consoles along the windows over the gate and the yard
      for (let i = 0; i < 5; i++) pl(GCR, 'gg_console', 0.8, 3 + i * 4, PI / 2, { solid: true, bid: GCRb.id, yRel: 3.4 });
      for (let i = 0; i < 5; i++) pl(GCR, 'gg_console', 4 + i * 5, 0.8, 0, { solid: true, bid: GCRb.id, yRel: 3.4 });
      for (const [lx, lz, k] of [[6, 10, 'electronics'], [22, 4, 'safe'], [12, 20, 'electronics']]) ct(GCR, k, lx, lz, { tier: 3, poi: 'gate_control_room', bid: GCRb.id, yRel: 3.4 });
      pl(GCR, 'gg_server', 44, 24, PI); pl(GCR, 'gg_server', 41.5, 24, PI);
      lampL(GCR, 9, 6, { y: 2.6, model: null, color: 0x9affc8, intensity: 1.2, range: 10 });
      const GCA = gfDef(26, 56, 90, 104, { h: 3.6, wall: 'concrete', floor: 'concrete', roof: 'roofTar', tint: 0xc0c8c0, name: 'Gate Control Annex', floorY: BENCH_Y, blend: 1,
        doors: [{ side: 'n', at: 4, w: 2.2 }, { side: 'w', at: 5, w: 2 }, ...winRow('s', 30, 2, 4, 1.4)], inner: [[14, 0, 14, 14, [{ at: 5, w: 2 }]]] });
      house(GCA, 'industrial', { tier: 2, poi: 'gate_control_room' });
      rampGF(12, 22, 59, 70, TUN_Y, BENCH_Y, 'z');            // yard -> Control Room terrace
      w.arkSpawn('snitch', 660, 360, { count: 1, patrol: [[640, 365], [700, 385], [640, 420]] });
      w.poi('gate_control_room', 'Gate Control Room', ...cp(52, 80), 30, { tier: 3, aliases: ['gate_control_room'] });

      // ---------------------------------------------------------------- Warehouse (surface hangar on the reference diamond) + yard buildings
      const WH = gfDef(92, 144, 58.3, 118, { h: 7.6, name: 'Warehouse', wall: 'corrugated', roof: 'corrugated', floor: 'concrete', tint: 0xb8c4bc, floorY: BENCH_Y, blend: 0, parapet: false,
        doors: [{ side: 'n', at: 2, w: 12, lintel: false }, { side: 'n', at: 26, w: 4 }, { side: 'e', at: 25, w: 10, lintel: false }, { side: 's', at: 6, w: 12, lintel: false }, { side: 'w', at: 20, w: 8, lintel: false }],
        inner: [[32, 46, 52, 46, [{ at: 6, w: 2 }]], [32, 46, 32, 59.7, [{ at: 5, w: 2 }]]],
        ladders: [{ side: 'w', at: 40 }], roofExtras: [[10, 10, 24, 14, 1.2], [30, 30, 46, 34, 1.2], [8, 40, 18, 46, 0.8]] });
      const WHb = bldg(WH);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) pl(WH, 'shelf', 8 + i * 6.3, 16 + r * 9, 0);
      for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) if (rng() < 0.55) pl(WH, pick(['gg_pallet', 'gg_crates', 'barrel', 'barrelBlue', 'crate']), 8 + i * 6.3 + R(-0.6, 0.6), 20.5 + r * 9, rng() * 6);
      for (const [lx, lz, k] of [[22, 44, 'gg_container'], [10, 52, 'gg_container2'], [40, 6, 'gg_crates'], [46, 22, 'gg_generator'], [24, 53, 'gg_pallet']]) pl(WH, k, lx, lz, 0);
      for (let i = 0; i < 14; i++) { const lx = R(4, 48), lz = R(14, 44); ct(WH, pick(['crate', 'toolbox', 'crate', 'arc_crate', 'electronics']), lx, lz, { tier: 2, poi: 'warehouse_complex' }); }
      furnish({ x: 0, z: 0, w: 20, d: 13.7, rot: WH.rot, inner: [], doors: [{ side: 'n', at: 6, w: 2 }, { side: 'w', at: 5, w: 2 }] }, 'office', { tier: 2, poi: 'warehouse_complex', cont0: 3, light: false },
        { R: rotFrame(WH.x + WH.w / 2, WH.z + WH.d / 2, WH.rot), x0: WH.x + 32, z0: WH.z + 46, id: WHb.id });
      for (const [lx, lz] of [[14, 14], [40, 14], [14, 40], [40, 36]]) lampL(WH, lx, lz, { y: 2.6, model: null, color: 0xfff0d0, intensity: 1.6, range: 14 });
      house(gfDef(164, 180, 98, 110, { h: 3.4, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: 'Loading Office', floorY: BENCH_Y, doors: [{ side: 'w', at: 4, w: 1.8 }, { side: 'n', at: 9, w: 3 }, ...winRow('s', 16, 2, 4)] }), 'industrial', { tier: 2, poi: 'warehouse_complex' });
      house(gfDef(162, 176, 62, 72, { h: 3.4, wall: 'concrete', roof: 'roofTar', floor: 'tiles', name: 'Dispatch', floorY: BENCH_Y, doors: [{ side: 'w', at: 4, w: 1.8 }, ...winRow('e', 10, 2, 3)] }), 'office', { tier: 2, poi: 'warehouse_complex' });
      w.prop('gg_siren', 792, 250, 0, { solid: true });
      perchTower(800, 192, 'sentinel', 'gg_perchtower', faceTo(800, 192, 746, 289));      // reference Sentinel icon east of the Headhouse, over the Maintenance Hall lid
      perchTower(745, 344, 'turret', 'gg_perchtower_w', faceTo(745, 344, 760, 420));      // the white lookout tower south of the Warehouse (quest)
      for (const [a, b] of [[166, 72], [196, 112], [120, 128], [84, 62]]) lightPost(...cp(a, b), 0xe8f4ff, 'gg_lightmast', 6.5, 2.6, 21);
      for (const [a, b, k, r] of [[188, 74, 'gg_container3', PI / 4], [196, 124, 'gg_container', -PI / 4], [176, 84, 'gg_truck', PI / 4 + 0.2], [130, 130, 'gg_crates', 0], [184, 96, 'gg_pallet', 0]]) w.prop(k, ...cp(a, b), r, { solid: true });
      // Warehouse Airshaft: lift head in the reference's fenced compound (x 770..825, z 255..295), opening west to the yard
      { const AX = 802, AZ = 281;
        w.flatten(772, 257, 823, 293, BENCH_Y, 3);   // level compound yard (the bench east of x 800 is noise-roughened)
        w.paint('concrete', 772, 257, 823, 293);
        const F = [[778, 255], [825, 255], [825, 295], [770, 295], [770, 268]];
        for (let k2 = 0; k2 < F.length - 1; k2++) { const [ax, az] = F[k2], [bx, bz] = F[k2 + 1], L = Math.hypot(bx - ax, bz - az), n = Math.round(L / 3); for (let t = 0; t < n; t++) { const x = ax + (bx - ax) * (t + 0.5) / n, z = az + (bz - az) * (t + 0.5) / n; w.prop('gg_fence', x, z, Math.abs(bz - az) > Math.abs(bx - ax) ? PI / 2 : 0, { solid: Math.abs(bz - az) > Math.abs(bx - ax) ? [0.15, 1.5, 2] : [1.5, 0.15, 2] }); } }
        mark(768, 253, 827, 297, 2 | 4);
        w.prop('gg_fan', 818, 266, -PI / 2, { solid: true }); w.prop('gg_transformer', 816, 290, 0, { solid: true }); w.prop('gg_pipes', 790, 290, 0, { solid: true });
        for (const [x, z] of [[772, 257], [823, 257], [823, 293], [772, 293]]) lightPost(x, z, 0xe8f4ff, 'gg_lightmast', 6.5, 2.2, 16);
        w.lamp(AX - 3, AZ, { y: 2.6, model: null, color: 0x40ff80, intensity: 1.4, range: 9 });
        w.extract('warehouse_airshaft', 'Warehouse Airshaft', AX, AZ, { kind: 'airshaft', face: faceTo(AX, AZ, 780, 282) });
      }
      w.arkSpawn('rocketeer', 760, 230, { count: 1, patrol: [[700, 220], [820, 230], [820, 340], [700, 340]] });
      w.arkSpawn('wasp', 770, 300, { count: 3, patrol: [[740, 330], [800, 330], [800, 250], [760, 250]] });
      w.zone('Warehouse Complex', gfPoly(32, 146, 43, 119), { tier: 2 });
      w.poi('warehouse_complex', 'Warehouse Complex', 746, 289, 46, { tier: 2, aliases: ['warehouse_complex'] });

      // ---------------------------------------------------------------- Headhouse: drum + sunk fan hall with a gallery at bench level
      const HC = [676, 190], HR = 26;
      const grille = []; for (let i = 0; i < 12; i++) { const e = [1.5 + i * 2.9, 1.2, 2.6 + i * 2.9, 34.8, 0.3]; e.tex = 'roofTar'; grille.push(e); }
      const hub = [15, 15, 21, 21, 0.9]; hub.tex = 'metalPanel'; grille.push(hub);
      const HH = { x: 658, z: 172, w: 36, d: 36, storeys: 2, storeyH: UNDER, h: UNDER + 3, floors: false, name: 'Headhouse', wall: 'damConcrete', floor: 'concrete', roof: 'metalPanel', roofExtras: grille,
        floorY: TUN_Y, blend: 0, thick: 0.6, parapet: false, vents: 0, tint: 0xc8c8c0, peek: 0.8,
        doors: [{ side: 'w', at: 12.6, w: 10.8, lintel: false }, { side: 's', at: 12.6, w: 10.8, lintel: false }, ...[4, 10, 22, 28].map(at => ({ side: 'n', at, w: 3, sill: 1.0, storey: 1 }))],
        stairs: [{ x: 3.5, z: 2.3, w: 1.6, dir: 'e', from: 0, to: 1 }], ladders: [{ x: 34.6, z: 18, from: 1, to: 'top', face: -PI / 2 }] };
      const HHb = bldg(HH);
      // bench-level gallery ring (walkable slab 4.5 m up) around the fan hall; the stair lands on its north strip
      const hL = flightLen(HH, HH.stairs[0]), gal = (x0, z0, x1, z1) => w.block(658 + x0, 172 + z0, 658 + x1, 172 + z1, 0.25, 'metalPanel', { onBuilding: HHb.id, rel0: UNDER - 0.25, cutaway: true, bid: HHb.id });
      gal(3.5 + hL, 0.3, 35.7, 4.6); gal(0.3, 0.3, 2.6, 35.7); gal(33.4, 4.6, 35.7, 35.7); gal(2.6, 33.4, 33.4, 35.7);
      for (const [lx, lz, k] of [[20, 1.6, 'electronics'], [34.4, 30, 'toolbox'], [1.4, 20, 'crate'], [12, 34.4, 'arc_crate']]) w.container(k, 658 + lx, 172 + lz, 0, { tier: 2, poi: 'headhouse', bid: HHb.id, yRel: UNDER });
      for (const [lx, lz] of [[12, 12], [24, 12], [12, 24], [24, 24]]) w.prop('gg_fan', 658 + lx, 172 + lz, lx < 18 ? PI / 2 : -PI / 2, { solid: true });
      w.prop('gg_pipes', 676, 178.5, 0, { solid: true }); w.prop('gg_generator', 676, 202, 0, { solid: true }); w.prop('gg_transformer', 688, 190, PI / 2, { solid: true });
      for (const [x, z, k] of [[662, 190, 'toolbox'], [690, 184, 'toolbox'], [676, 184, 'arc_crate'], [668, 205, 'crate'], [690, 197, 'electronics']]) w.container(k, x, z, 0, { tier: 2, poi: 'headhouse' });
      w.container('raider_cache', 676, 190, 0, { tier: 3, poi: 'headhouse' });
      w.lamp(676, 190, { y: 2.8, model: null, color: 0xc8e0ff, intensity: 1.5, range: 16 });
      // the drum: a 3.35 m concrete collar on the bench whose top is flush with the hall roof (12.75 m); stairs up its south side
      const skip = (x, z) => (x > 658 && x < 694 && z > 172 && z < 208) || (x > 644.5 && x < 658.5 && z > 183.5 && z < 196.5) || (x > 669.4 && x < 682.6 && z > 200);
      for (let z = HC[1] - HR; z < HC[1] + HR; z++) {
        const hw = Math.sqrt(Math.max(0, HR * HR - (z + 0.5 - HC[1]) ** 2)); if (hw < 0.5) continue;
        let x0 = Math.round(HC[0] - hw), x1 = Math.round(HC[0] + hw), cur = null;
        for (let x = x0; x <= x1; x++) { const s2 = x < x1 && !skip(x + 0.5, z + 0.5); if (s2 && cur == null) cur = x; if ((!s2 || x === x1) && cur != null) { w.block(cur, z, x, z + 1, 3.35, 'damConcrete', { y0: BENCH_Y - 0.1, seed: 4 }); cur = null; } }
      }
      for (const [a, b, c, d] of [[657.3, 171.3, 694.7, 171.8], [657.3, 208.2, 669.4, 208.7], [682.6, 208.2, 687.6, 208.7], [657.3, 171.3, 657.8, 184], [657.3, 196, 657.8, 208.7], [694.2, 171.3, 694.7, 208.7]])
        w.block(a, b, c, d, 0.9, 'rust', { y0: BENCH_Y + 3.25, xray: false });
      for (let k = 0; k < 8; k++) w.block(689.6, 216.5 - (k + 1) * 0.72, 693.6, 216.5 - k * 0.72, 0.42 * (k + 1), 'damConcrete', { y0: BENCH_Y - 0.1 });
      w.ramp(669.6, 208.6, 682.4, 226, TUN_Y, BENCH_Y, 'z'); w.paint('concrete', 669, 208, 683, 226);
      // reference Sentinel icon: on the roof hub (13.65 m). Roofs block line of sight, so it can't see into the hall below.
      perched('sentinel', 676, 190, 'headhouse_roof', 0, { yAbs: TUN_Y + UNDER + 3 + 0.25 + 0.9, f: faceTo(676, 190, 636, 258) });
      w.arkSpawn('pop', 676, 186, { count: 2, habitat: 'indoor' });
      w.poi('headhouse', 'Headhouse', 676, 190, 32, { tier: 2, aliases: ['headhouse'] });

      // church north of the Data Vault (satellite dishes on its roof — quest)
      const CH = { x: 712, z: 66, w: 16, d: 28, storeys: 2, h: 7.4, floors: false, wall: 'plaster', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', tint: 0xe8e0d0, name: 'Bench Chapel',
        doors: [{ side: 's', at: 6.6, w: 2.8 }, ...winRow('w', 28, 3, 5, 1.2), ...winRow('e', 28, 3, 5, 1.2)], inner: [[0, 6, 16, 6, [{ at: 7, w: 2 }]]] };
      bldg(CH);
      for (let r = 0; r < 5; r++) { w.prop('gg_pew', 717, 79 + r * 3, PI, { solid: true }); w.prop('gg_pew', 723, 79 + r * 3, PI, { solid: true }); }
      w.prop('gg_altar', 720, 74, PI, { solid: true });
      w.container('cabinet', 714, 68, 0, { tier: 2, poi: 'data_vault' }); w.container('basket', 726, 68, 0, { tier: 1, poi: 'data_vault' });
      w.block(706, 66, 712, 72, 13, 'plaster', { tint: 0xe8e0d0 });   // bell tower
      w.block(705.6, 65.6, 712.4, 72.4, 0.8, 'roofTile', { y0: w.groundAt(709, 69) + 12.8, collide: false });
      w.prop('gg_dish', 716, 82, 0.6, { y: 8.2 }); w.prop('gg_dish', 724, 88, -0.4, { y: 8.2 });
      w.lamp(720, 80, { y: 4.4, model: null, color: 0xffc880, intensity: 0.8, range: 10, flicker: 0.2 });

      // ================================================================ UNDERGROUND HALLS
      // ---------------------------------------------------------------- Traffic Tunnel band (rotated ~84°), south mouth on the yard
      const TT = hallDef(TT_S, TT_N, TT_W, { ...UND, name: 'Traffic Tunnel', roofExtras: grates(Math.hypot(TT_N[0] - TT_S[0], TT_N[1] - TT_S[1]), 'x', TT_W) });
      const TL = TT.w, ez0 = worldOf(TT, 0, TT_W)[1], dzA = (TT_N[1] - TT_S[1]) / TL, lxAtZ = (z) => (z - ez0) / dzA;
      const eastX = (z) => worldOf(TT, lxAtZ(z), TT_W)[0];
      const HHC = [lxAtZ(196), lxAtZ(184)], VPZ = [lxAtZ(140), lxAtZ(122)];
      TT.doors = [full('w', TT_W), { side: 's', at: HHC[0] + 0.4, w: HHC[1] - HHC[0] - 0.8, lintel: false }, { side: 's', at: VPZ[0] + 0.4, w: VPZ[1] - VPZ[0] - 0.8, lintel: false }];
      TT.inner = [[24, 15.9, 32, 15.9, []], [62, 15.9, 70, 15.9, []], [100, 15.9, 108, 15.9, []], [136, 15.9, 142, 15.9, []]];
      TT.stairs = [stTop(140, 0.8, 'n')];       // emergency stair up the west wall near the cave-in
      hall(TT);
      for (let lx = 8; lx < TL - 12; lx += 6) pl(TT, 'gg_laney', lx, TT_W / 2, 0, { y: 0.03 });
      for (let lx = 10; lx < TL - 12; lx += 9) { pl(TT, 'gg_lane', lx, TT_W / 2 - 6.5, 0, { y: 0.03 }); pl(TT, 'gg_lane', lx, TT_W / 2 + 6.5, 0, { y: 0.03 }); }
      for (let lx = 10; lx < TL - 6; lx += 15) tlampL(TT, lx, TT_W / 2);
      for (const [lx, lz, r] of [[TL - 5, 6, 0.2], [TL - 7, 15, 2.1], [TL - 4, 24, 4.0], [TL - 10, 28, 1.0]]) pl(TT, 'gg_rubble', lx, lz, r);   // north cave-in
      for (const [lx, lz, r, k] of [[18, 9, PI / 2, 'car'], [46, 23, -PI / 2, 'gg_bus'], [80, 9, PI / 2 + 0.2, 'gg_van'], [104, 24, -PI / 2, 'car'], [126, 9, PI / 2, 'gg_truck']]) { pl(TT, k, lx, lz, r); mark(...worldOf(TT, lx - 3, lz - 3), ...worldOf(TT, lx + 3, lz + 3), 2); }
      pl(TT, 'gg_patrolcar', 60, 9, PI / 2 + 0.15);      // the armoured patrol car (key room 'patrol_car': its locked trunk)
      keyRoomL('patrol_car', TT, 57, 6, 64, 12, { name: 'Armoured Patrol Car', poi: 'traffic_tunnel' });
      ct(TT, 'car_trunk', 57.2, 9, { tier: 3, room: 'patrol_car', locked: 'patrol_car', poi: 'traffic_tunnel' });
      // rotated hall: the carved floor keeps a ~1 m earth bank along each wall, so loot stands 2.5 m in
      for (const [lx, lz, k] of [[12, 2.5, 'toolbox'], [36, 29.5, 'crate'], [52, 2.5, 'arc_crate'], [88, 29.5, 'toolbox'], [116, 2.5, 'raider_cache'], [138, 29.5, 'ammo_box'], [96, 2.5, 'trash'], [150, 2.5, 'electronics'], [70, 29.5, 'locker']])
        ct(TT, k, lx, lz, { tier: 2, poi: 'traffic_tunnel' });
      for (const [lx, lz] of [[30, 4], [58, 28], [92, 4], [120, 28], [150, 10]]) pl(TT, 'gg_barrier', lx, lz, 0);
      perched('sentinel', ...worldOf(TT, 128, 16), 'tunnel_floor', 0, { habitat: 'indoor', f: faceTo(...TT_N, ...TT_S) });
      w.arkSpawn('turret', ...worldOf(TT, 146, 16), { habitat: 'indoor', f: faceTo(...TT_N, ...TT_S) });   // looks down the band toward the yard
      w.arkSpawn('tick', ...worldOf(TT, 40, 16), { count: 3, habitat: 'indoor' });
      w.arkSpawn('pop', ...worldOf(TT, 90, 16), { count: 2, habitat: 'indoor' });
      w.arkSpawn('shredder', ...worldOf(TT, 70, 16), { habitat: 'indoor', patrol: [worldOf(TT, 14, 16), worldOf(TT, 140, 16)] });
      w.poi('traffic_tunnel', 'Traffic Tunnel', ...worldOf(TT, TL / 2, TT_W / 2), 40, { tier: 3, aliases: ['traffic_tunnel'], underground: true });

      // ---------------------------------------------------------------- Vault Passage + Data Vault (axis-aligned NE branch)
      const vx0 = Math.floor(Math.min(eastX(122), eastX(140)));
      hall({ ...UND, x: vx0, z: 122, w: 742 - vx0, d: 18, name: 'Vault Passage', roofExtras: grates(742 - vx0, 'x', 18), doors: [full('w', 18), full('e', 18)], inner: [[30, 1, 30, 6, []], [30, 12, 30, 17, []], [62, 1, 62, 6, []], [62, 12, 62, 17, []]] });
      cut([[eastX(122.6) - 1.8, 122.6], [vx0 + 1.8, 122.6], [vx0 + 1.8, 139.4], [eastX(139.4) - 1.8, 139.4]]);
      for (let x = vx0 + 10; x < 740; x += 16) tunnelLamp(x, 131);
      for (const [x, z, k] of [[vx0 + 4, 124.4, 'toolbox'], [676, 137.6, 'crate'], [700, 124.4, 'electronics'], [724, 137.6, 'locker']]) w.container(k, x, z, 0, { tier: 2, poi: 'traffic_tunnel' });
      w.prop('gg_pipes', 690, 124.6, 0, { solid: true }); w.prop('gg_pipes', 716, 137.4, PI, { solid: true });
      w.arkSpawn('tick', 700, 131, { count: 2, habitat: 'indoor' });
      const DV = { ...UND, x: 742, z: 112, w: 30, d: 38, name: 'Data Vault', wall: 'concrete', floor: 'metalPanel',
        doors: [{ side: 'w', at: 10.6, w: 16.8, lintel: false }, { side: 's', at: 11, w: 18, lintel: false }],
        inner: [[18, 1, 18, 10, [{ at: 2, w: 2, door: true }]], [18, 10, 29, 10, []], [1, 8, 12, 8, [{ at: 3, w: 2 }]], [12, 1, 12, 8, []]],
        stairs: [stTop(30 - 0.8 - L_TOP, 22, 'e')] };
      hall(DV);
      cut([[740.2, 122.6], [743.8, 122.6], [743.8, 139.4], [740.2, 139.4]]);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) w.prop('gg_server', 748 + i * 4.2, 126 + row * 5, 0, { solid: true });
      w.prop('gg_console', 746, 114.5, 0, { solid: true }); w.prop('gg_desk', 752, 114.6, 0, { solid: true });
      for (const [x, z, k] of [[745, 117, 'electronics'], [757, 120, 'electronics'], [769, 131, 'desk'], [746, 140, 'electronics'], [758, 146, 'electronics']]) w.container(k, x, z, 0, { tier: 2, poi: 'data_vault' });
      for (const [x, z, k] of [[763, 114, 'safe'], [769, 114, 'electronics'], [766, 119.5, 'security_locker']]) w.container(k, x, z, 0, { tier: 3, poi: 'data_vault' });   // strongroom
      w.lamp(756, 132, { y: 2.8, model: null, color: 0x80c8ff, intensity: 1.4, range: 12 }); w.lamp(766, 116, { y: 2.8, model: null, color: 0x80c8ff, intensity: 1.1, range: 8 });
      w.arkSpawn('surveyor', 790, 140, { count: 1, surface: true, patrol: [[790, 140], [820, 100], [760, 80], [740, 170]] });
      w.poi('data_vault', 'Data Vault', 757, 130, 26, { tier: 3, aliases: ['data_vault'], underground: true });

      // ---------------------------------------------------------------- Security Wing (gate frame a 50-84, b -100..-58), yard door + stair up into the guard post
      const SW = gfDef(50, 84, -100, -58, { ...UND, name: 'Security Wing', floor: 'metalPanel', roofExtras: grates(34, 'x', 42),
        doors: [{ side: 's', at: 6, w: 22, lintel: false }],
        inner: [[24, 1, 24, 12, [{ at: 3, w: 2, door: true, locked: 'confiscation_room' }]], [24, 12, 33, 12, []],
          [8, 4, 8, 40, [{ at: 2, w: 1.6, door: true }, { at: 11, w: 1.6, door: true }, { at: 20, w: 1.6, door: true }, { at: 29, w: 1.6, door: true }]],
          [1, 4, 8, 4, []], [1, 13, 8, 13, []], [1, 22, 8, 22, []], [1, 31, 8, 31, []], [1, 40, 8, 40, []],
          [24, 28, 33, 28, [{ at: 3, w: 2 }]], [24, 28, 24, 41, [{ at: 5, w: 2 }]]],
        stairs: [stTop(14, 0.8, 'n')] });
      hall(SW);
      keyRoomL('confiscation_room', SW, 24, 1, 33, 12, { name: 'Confiscation Room', poi: 'security_wing' });
      for (const [lx, lz, k] of [[26, 1.6, 'weapon_case'], [29.5, 1.6, 'safe'], [32.2, 4, 'security_locker'], [26, 10.6, 'weapon_case'], [29.5, 10.6, 'ammo_box'], [32.2, 8, 'electronics']]) ct(SW, k, lx, lz, { tier: 3, room: 'confiscation_room', poi: 'security_wing' });
      pl(SW, 'shelf', 28, 1.4, 0); lampL(SW, 29, 6, { y: 2.8, model: null, color: 0xffe0a0, intensity: 1.2, range: 7 });
      for (const lz of [8.5, 17.5, 26.5, 35.5]) { pl(SW, 'gg_bunk', 1.8, lz, 0); ct(SW, pick(['backpack', 'trash', 'suitcase']), 6, lz + 2, { tier: 2, poi: 'security_wing' }); }
      for (const [lx, lz, k] of [[32.2, 36, 'security_locker'], [30, 40.4, 'desk'], [26, 30, 'locker'], [20, 1.6, 'weapon_case'], [20, 40.4, 'ammo_box'], [12, 22, 'locker']]) ct(SW, k, lx, lz, { tier: 2, poi: 'security_wing' });
      pl(SW, 'gg_desk', 29, 34, PI); pl(SW, 'gg_lockers', 32.7, 32, -PI / 2); pl(SW, 'gg_console', 29, 29.4, 0);
      for (const [lx, lz] of [[16, 12], [16, 30], [30, 20]]) tlampL(SW, lx, lz);
      w.arkSpawn('tick', ...worldOf(SW, 16, 22), { count: 2, habitat: 'indoor' }); w.arkSpawn('pop', ...worldOf(SW, 18, 36), { count: 2, habitat: 'indoor' });
      w.arkSpawn('turret', ...worldOf(SW, 20, 6), { habitat: 'indoor', f: faceTo(...worldOf(SW, 20, 6), ...worldOf(SW, 17, 42)) });
      w.poi('security_wing', 'Security Wing', ...worldOf(SW, 17, 21), 26, { tier: 3, aliases: ['security_wing'], underground: true });

      // ---------------------------------------------------------------- Maintenance Wing (yard -> NE) + Maintenance Hall + south leg
      const MW1 = gfDef(40, 108, 40, 58, { ...UND, name: 'Maintenance Wing', roofExtras: grates(68, 'x', 18), doors: [full('w', 18), full('e', 18)], inner: [[22, 1, 22, 5, []], [22, 13, 22, 17, []], [44, 1, 44, 5, []], [44, 13, 44, 17, []]],
        stairs: [stTop(56, 18 - 0.8 - L_TOP, 's')] });       // comes up at the Warehouse's north door
      hall(MW1);
      const MW2 = gfDef(108, 226, 24, 58, { ...UND, name: 'Maintenance Hall', roofExtras: grates(118, 'x', 34),
        doors: [{ side: 'w', at: 16.3, w: 17.4, lintel: false }, full('e', 34), { side: 's', at: 37.6, w: 12.8, lintel: false }],
        inner: [[20, 1, 20, 10, []], [20, 10, 40, 10, [{ at: 8, w: 2 }]], [40, 1, 40, 10, []], [70, 1, 70, 10, []], [70, 10, 90, 10, [{ at: 8, w: 2 }]], [90, 1, 90, 10, []], [100, 22, 117, 22, [{ at: 6, w: 3 }]]],
        stairs: [stTop(100, 34 - 0.8 - L_TOP, 's')] });
      hall(MW2);
      cut(gfPoly(106.2, 109.8, 40.6, 57.4));
      for (const o of [MW1, MW2]) for (let lx = 8; lx < o.w - 4; lx += 15) tlampL(o, lx, o.d / 2);
      for (const [lx, lz, k, r] of [[12, 27, 'gg_truck', PI / 2], [30, 26, 'gg_container3', 0], [48, 28, 'gg_van', -PI / 2], [64, 22, 'gg_crates', 0], [66, 28, 'gg_pallet', 0.3], [82, 27, 'gg_container2', 0], [96, 14, 'gg_generator', 0], [58, 14, 'gg_barrier', 0], [76, 14, 'gg_barrier', 0], [26, 14, 'gg_barrier', 0], [44, 18, 'barrelBlue', 0], [45, 19.2, 'barrel', 0], [104, 6, 'gg_crates', 0]])
        pl(MW2, k, lx, lz, r);
      for (let lx = 6; lx < 100; lx += 10) pl(MW2, 'gg_lane', lx, 20.5, 0, { y: 0.03 });
      pl(MW1, 'gg_pipes', 30, 2.1, 0); pl(MW1, 'gg_pipes', 30, 15.9, PI); pl(MW2, 'gg_pipes', 54, 2.1, 0); pl(MW2, 'gg_pipes', 60, 31.9, PI); pl(MW2, 'gg_generator', 30, 5, 0); pl(MW2, 'gg_transformer', 80, 5, 0); pl(MW2, 'gg_fan', 112, 12, -PI / 2);
      for (const [o, lx, lz, k] of [[MW1, 4, 1.6, 'toolbox'], [MW1, 34, 16.4, 'locker'], [MW1, 62, 1.6, 'electronics'], [MW2, 24, 2, 'toolbox'], [MW2, 36, 2, 'crate'], [MW2, 74, 2, 'electronics'], [MW2, 86, 2, 'toolbox'], [MW2, 104, 25, 'arc_crate'], [MW2, 114, 30, 'locker'], [MW2, 50, 32.4, 'crate']]) ct(o, k, lx, lz, { tier: 2, poi: 'maintenance_wing' });
      const MWS = gfDef(145, 159, 57, 191.5, { ...UND, name: 'Maintenance Wing South', roofExtras: grates(134.5, 'z', 14), doors: [full('n', 14), full('s', 14)], inner: [[1, 60, 4, 60, []], [10, 60, 13, 60, []]] });
      hall(MWS);
      cut(gfPoly(145.6, 158.4, 55.2, 59.8));
      // south portal onto the east fields: re-cut the mouth, ramp up to the field outside, portal facade
      { const o = MWS, gEnd = w.groundAt(...cp(152, 200)); cut(gfPoly(145.6, 158.4, 188.6, 192.2));
        rampLocal(gfDef(145, 159, 191.5, 203), 0, 0, 14, 11.5, TUN_Y, Math.max(TUN_Y, gEnd), 'z'); pl(o, 'gg_portal', 7, 134.0, 0, {}); }
      for (let lz = 8; lz < 130; lz += 16) tlampL(MWS, 7, lz);
      for (const [lx, lz, k] of [[1.6, 20, 'toolbox'], [12.4, 50, 'arc_crate'], [1.6, 96, 'crate'], [12.4, 118, 'locker']]) ct(MWS, k, lx, lz, { tier: 2, poi: 'maintenance_wing' });
      w.arkSpawn('tick', ...worldOf(MW1, 34, 9), { count: 3, habitat: 'indoor' }); w.arkSpawn('pop', ...worldOf(MW2, 60, 20), { count: 2, habitat: 'indoor' }); w.arkSpawn('fireball', ...worldOf(MWS, 7, 40), { count: 2, habitat: 'indoor' });
      w.arkSpawn('shredder', ...worldOf(MW2, 90, 20), { habitat: 'indoor', patrol: [worldOf(MW2, 10, 25), worldOf(MW2, 112, 25)] });
      w.arkSpawn('leaper', ...worldOf(WH, 27, 30), { radius: 10 });
      w.poi('maintenance_wing', 'Maintenance Wing', ...worldOf(MW2, 30, 20), 34, { tier: 2, aliases: ['maintenance_wing'], underground: true });
      // junction pit: open-sky cutting between the Maintenance Hall's NE mouth and the Data Vault's south door, with a footbridge over it
      const PIT = [[752.4, 148.4], [771.6, 148.4], cp(224.4, 58.6), cp(224.4, 23.4)];
      cut(PIT); w.paintPoly('concrete', PIT); markPoly(PIT, 1 | 4);
      for (const [x, z] of [[760, 156], [781, 186]]) w.prop('gg_crates', x, z, 0.4, { solid: true });
      w.lamp(772, 165, { y: 2.6, model: null, color: 0xffd890, intensity: 1.6, range: 11 });
      w.bridge([[757, 165], [785, 165]], 3, BENCH_Y + 0.05, 'metalPanel', { pillars: 9 });
      // ---------------------------------------------------------------- Headhouse connector (TT east wall -> fan hall west door)
      hall({ ...UND, x: 645, z: 184, w: 14, d: 12, name: 'Headhouse Connector', doors: [full('w', 12), full('e', 12)] });
      cut([[eastX(184.6) - 1.8, 184.6], [647.8, 184.6], [647.8, 195.4], [eastX(195.4) - 1.8, 195.4]]);
      cut([[656.2, 184.6], [660.8, 184.6], [660.8, 195.4], [656.2, 195.4]]);

      // ---------------------------------------------------------------- the yard (open pit behind the gate)
      w.paintPoly('concrete', YARD); cut(YARD);
      rampGF(84, 96, -8, 4, TUN_Y, BENCH_Y, 'x');             // yard stair up to the Headhouse terrace
      for (const [a, b, k, r] of [[20, -30, 'gg_container', 0], [30, -40, 'gg_container2', 0], [28, 30, 'gg_truck', PI / 4 + 0.2], [36, 20, 'gg_crates', 0], [14, -20, 'gg_barrier', -PI / 4], [34, 8, 'gg_barrier', -PI / 4 + 0.3], [60, -2, 'gg_generator', 0]]) w.prop(k, ...cp(a, b), r, { solid: true });
      for (const [a, b, k] of [[36, -24, 'crate'], [22, 44, 'toolbox'], [12, -36, 'ammo_box']]) w.container(k, ...cp(a, b), 0, { tier: 2, poi: 'outer_gates' });
      for (const [a, b] of [[30, -50], [62, -14], [36, 52]]) lightPost(...cp(a, b), 0xe8f4ff, 'gg_lightmast', 6.5, 2.6, 21);
      w.arkSpawn('leaper', ...cp(30, 0), { count: 1, radius: 14, notCondition: 'matriarch' });
      w.zone('Gate & Tunnels', [[530, 80], [800, 80], [812, 200], [806, 380], [740, 392], [626, 347], [558, 279], [530, 272]], { tier: 3 });
    }

    // ======================================================================== 7. PILGRIM'S PEAK
    {
      // ramps: main road along the south face, footpath up the west face
      w.ramp(848, 186, 905, 194, BENCH_Y + 0.6, PEAK_Y, 'x'); w.raiseRect(898, 174, 912, 194, PEAK_Y, 0, 'set');
      w.paint('gravel', 848, 186, 912, 194); w.paint('gravel', 898, 174, 912, 186);
      w.ramp(862, 112, 868, 168, PEAK_Y, BENCH_Y, 'z'); w.paint('dirt', 862, 112, 868, 168);
      w.paintPoly('grass', PEAK);
      // the monastery-hotel complex sits on the reference's 45° grid (rigid group rotation about the plateau centre, nudged NW)
      const PA = PI / 4, PF = rotFrame(925, 120, PA), gP = (x, z) => { const [u, v] = rotPt(PF, x, z); return [u - 14, v + 6]; };
      const gDef = (o) => { const [cx, cz] = gP(o.x + o.w / 2, o.z + o.d / 2); return { ...o, x: cx - o.w / 2, z: cz - o.d / 2, rot: PA }; };
      const gRect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => gP(x, z));
      const gProp = (k, x, z, r = 0, opts = { solid: true }) => w.prop(k, ...gP(x, z), r - PA, opts);
      const gCont = (k, x, z, opts) => w.container(k, ...gP(x, z), -PA, opts);
      w.paintPoly('gravel', gRect(884, 100, 972, 132)); w.paintPoly('concrete', gRect(940, 76, 972, 120)); w.paintPoly('tiles', gRect(896, 102, 928, 130));
      w.path(resample([[905, 190], [905, 168], gP(912, 134)], 4), 5, 'gravel'); w.path(resample([[866, 120], gP(884, 116)], 4), 3, 'dirt');
      // retaining walls + railings along the plateau edges
      for (const [a, b, c, d] of [[870, 172, 898, 173], [912, 178, 976, 179], [976, 120, 977, 176], [868, 74, 868.8, 110]]) w.block(a, b, c, d, 1.0, 'concrete', { y0: PEAK_Y - 0.1 });
      // monastery-hotel complex (pilgrims' refuge) around a cloister
      const PK = [
        { x: 890, z: 84, w: 34, d: 16, storeys: 3, h: 9.6, wall: 'plaster', roof: 'roofTile', tint: 0xe0d4c0, name: 'Pilgrim Hostel', kind: 'home', doors: [{ side: 's', at: 15, w: 2.4 }, ...winRow('s', 34, 2, 4), { side: 'w', at: 6, w: 1.8 }], inner: [[12, 0, 12, 16, [{ at: 9, w: 2 }]], [24, 0, 24, 16, [{ at: 9, w: 2 }]], [12, 0, 12, 16, [{ at: 9, w: 2 }], 1], [22, 0, 22, 16, [{ at: 9, w: 2 }], 2]], upInner: false, ladders: [{ side: 'n', at: 30 }] },
        { x: 928, z: 84, w: 16, d: 30, storeys: 2, h: 6.6, wall: 'plaster', roof: 'roofTile', tint: 0xe0d4c0, name: 'Refectory', kind: 'home', doors: [{ side: 'w', at: 20, w: 2.2 }, { side: 's', at: 6, w: 1.8 }, ...winRow('e', 30, 2, 4)], inner: [[0, 14, 16, 14, [{ at: 6, w: 2 }]]] },
        { x: 890, z: 130, w: 22, d: 14, storeys: 2, h: 6.4, wall: 'concrete', roof: 'roofTar', name: 'Research Annex', kind: 'lab', doors: [{ side: 'n', at: 9, w: 2 }, { side: 'e', at: 5, w: 1.8 }, ...winRow('s', 22, 2, 4)], inner: [[11, 0, 11, 14, [{ at: 5, w: 2 }]]] },
        { x: 918, z: 136, w: 18, d: 16, storeys: 1, h: 3.6, wall: 'concrete', roof: 'roofTar', name: 'Generator House', kind: 'industrial', doors: [{ side: 'w', at: 6, w: 2.4 }, { side: 'n', at: 4, w: 1.8 }] },
      ];
      for (const p of PK) house(gDef({ ...p, floor: p.kind === 'lab' ? 'tiles' : 'wood' }), p.kind, { tier: 2, poi: 'pilgrims_peak', cont: p.kind === 'lab' ? 'lab' : undefined });
      // communication tower + its locked basement room (key room 'communication_tower')
      const CT = gDef({ x: 948, z: 84, w: 16, d: 14, storeys: 1, h: 3.6, wall: 'concrete', floor: 'metalPanel', roof: 'metalPanel', name: 'Comms Tower Base',
        doors: [{ side: 's', at: 2, w: 2 }, { side: 'w', at: 8, w: 1.8 }], inner: [[8, 0, 8, 14, [{ at: 9, w: 2, door: true, locked: 'communication_tower' }]]] });
      bldg(CT);
      keyRoomL('communication_tower', CT, 8, 0, 16, 14, { name: 'Communication Tower Basement', poi: 'pilgrims_peak' });
      for (const [x, z, k] of [[958, 86, 'electronics'], [962, 86, 'safe'], [962, 92, 'weapon_case'], [958, 96, 'electronics'], [962, 96.5, 'security_locker']]) gCont(k, x, z, { tier: 3, room: 'communication_tower', poi: 'pilgrims_peak' });
      gProp('gg_server', 958.5, 90, PI / 2); gProp('gg_console', 952, 85, 0); gCont('desk', 951, 95, { tier: 2, poi: 'pilgrims_peak' });
      w.lamp(...gP(960, 91), { y: 3.2, model: null, color: 0x80c8ff, intensity: 1.2, range: 7 });
      // the 31 m lattice comms tower is climbable: ladders to its 10 m and 20 m platforms (terminal + loot on top)
      { const [tx, tz] = gP(970, 92), tg = PEAK_Y;
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
      gProp('gg_dish', 950, 104, 2.4); gProp('gg_dish', 965, 108, -2.2);
      // cloister court: well, olive trees, shrine
      gProp('gg_well', 913, 116, 0); gProp('gg_shrine', 900, 120, 0);
      for (const [x, z] of [[903, 108], [923, 108], [903, 126], [923, 126]]) gProp('gg_olive', x, z, rng() * 6, { solid: true, scale: 0.7 });
      for (const [x, z] of [[884, 100], [884, 150], [940, 160], [972, 150], [960, 128]]) lightPost(...gP(x, z), 0xffd8a0);
      gProp('gg_container2', 950, 150, 0.3); gProp('gg_generator', 940, 132, 0); gProp('gg_crates', 945, 158, 0);
      for (let i = 0; i < 26; i++) { const [x, z] = gP(R(872, 984), R(70, 176)); if (free(x, z, 1.5, 3) && pointInPoly(x, z, PEAK)) w.prop(pick(['gg_bush', 'gg_flowers', 'gg_grass', 'gg_rock_s', 'gg_cypress', 'gg_olive']), x, z, rng() * 6, { solid: true, scale: R(0.7, 1) }); }
      // reference Sentinel icon: on the Pilgrim Hostel roof (3 storeys, 9.85 m) by its north edge, sweeping west over the
      // footpath ramp and the plateau's north side (the roof itself screens the cloister and the rooms below)
      perched('sentinel', ...gP(917, 86), 'hostel_roof', 0, { yAbs: PEAK_Y + 9.6 + 0.25, f: faceTo(...gP(917, 86), 862, 110) });
      // Locked Gate condition: security-code printer + its rocket escort
      gProp('gg_printer', 932, 120, 0); gCont('electronics', 932, 121.4, { tier: 2, poi: 'pilgrims_peak', note: 'security_code_printer' });
      w.arkSpawn('rocketeer', 925, 130, { count: 2, condition: 'locked_gate', patrol: [[880, 100], [960, 80], [970, 160], [890, 170]] });
      w.arkSpawn('rocketeer', 920, 120, { count: 2, patrol: [[880, 90], [970, 90], [970, 170], [880, 170]] });
      w.arkSpawn('wasp', 900, 160, { count: 2, patrol: [[860, 200], [930, 200], [930, 140]] });
      w.zone("Pilgrim's Peak", PEAK, { tier: 3 });
      w.spawnPoint(941, 115, { poi: 'pilgrims_peak' });
      w.poi('pilgrims_peak', "Pilgrim's Peak", 925, 120, 52, { tier: 3, aliases: ['pilgrims_peak'] });
    }

    // ======================================================================== 8. THE VILLAGE (NW)
    {
      const tints = [0xf0e0c8, 0xe8d0b0, 0xd8c8b0, 0xf0d8c0, 0xe0c8a8, 0xd0c0a8, 0xf0e8d8, 0xe8c8a0];
      const roofT = [0xb8aca0, 0xa89a8c, 0xc8b8a8, 0x9a8c80, 0xd0c4b4, 0xb0a090];   // weathered stone-grey tiles (reference roofs read pale grey)
      let vi = 0;
      const cleanDoors = (o) => {
        const len = sd => (sd === 'n' || sd === 's' ? o.w : o.d);
        const out = [];
        for (const d of o.doors) { if (d.at < 0.4 || d.at + d.w > len(d.side) - 0.4) continue; if (out.some(e => e.side === d.side && d.at < e.at + e.w + 0.5 && e.at < d.at + d.w + 0.5)) continue; out.push(d); }
        o.doors = out; return o;
      };
      // front = side facing the lane; row houses (attached) get no side windows
      const vhouse = (x, z, ww, dd, st, front, o2 = {}) => {
        const i = vi++, back = { n: 's', s: 'n', e: 'w', w: 'e' }[front];
        const fl = front === 'n' || front === 's' ? ww : dd;
        const sides = front === 'n' || front === 's' ? ['w', 'e'] : ['n', 's'];
        const doors = [{ side: front, at: clamp(fl / 2 - 0.8 + ((i % 3) - 1) * 2, 1, fl - 2.6), w: 1.6, ...(o2.locked ? { door: true, locked: o2.locked } : {}) }];
        if (!o2.locked) doors.push({ side: back, at: 1.2, w: 1.4 });
        doors.push(...winRow(front, fl, 1.0, 3.0, 1.2), ...winRow(back, fl, 2.8, 3.4, 1.2));
        if (o2.detached) for (const sd of sides) doors.push(...winRow(sd, sd === 'n' || sd === 's' ? ww : dd, 2, 3.6, 1.2));
        const inner = [];
        if (ww >= 11) inner.push([Math.round(ww * 0.55), 0, Math.round(ww * 0.55), dd, [{ at: (dd >= 11 ? dd * 0.74 : dd / 2) - 0.8, w: 1.6 }]]);   // door clear of the cross wall's T-junction
        if (dd >= 11 && ww >= 11) inner.push([0, Math.round(dd * 0.5), Math.round(ww * 0.55), Math.round(dd * 0.5), [{ at: 1.0, w: 1.4 }]]);
        const o = cleanDoors({ x, z, w: ww, d: dd, storeys: st, wall: o2.wall || (i % 5 === 2 ? 'brick' : 'plaster'), floor: i % 2 ? 'wood' : 'tiles', roof: 'roofTile', roofShape: 'gable',
          tint: tints[i % tints.length], roofTint: roofT[i % roofT.length], doors, inner, name: o2.name || 'Village House', blend: 1.5, floors: o2.floors });
        if (o2.locked) {
          house(o, 'home', { tier: 3, room: o2.locked, poi: 'village', cont0: 5, cont: 'office', upCont: 3 }); w.keyRoom(o2.locked, x, z, x + ww, z + dd, null, { name: o.name, poi: 'village' });
          for (const [dx, dz, k] of [[1.2, dd - 1.2, 'safe'], [ww - 1.2, dd - 1.2, 'weapon_case'], [ww * 0.3, dd * 0.5, 'suitcase']]) w.container(k, x + dx, z + dz, 0, { tier: 3, room: o2.locked, poi: 'village' });
        } else house(o, 'home', { tier: i % 6 === 0 ? 2 : 1, poi: 'village' });
        // doorstep clutter
        const [fx, fz] = front === 's' ? [x + ww * 0.3, z + dd + 1.4] : front === 'n' ? [x + ww * 0.7, z - 1.4] : front === 'w' ? [x - 1.4, z + dd * 0.3] : [x + ww + 1.4, z + dd * 0.7];
        if (rng() < 0.7) w.prop(pick(['gg_planter', 'gg_planter', 'barrel', 'gg_woodpile', 'gg_bench', 'gg_flowers']), fx, fz, front === 'n' || front === 's' ? 0 : PI / 2, { solid: true });
        return o;
      };
      const row = (x0, z0, specs, front, o2) => { let x = x0; for (const [ww, dd, st] of specs) { vhouse(x, z0, ww, dd, st, front, o2); x += ww; } };
      // west cluster (around the walled lane)
      vhouse(244, 44, 12, 10, 2, 's', { detached: true });
      row(264, 49, [[13, 12, 2], [12, 12, 3]], 's');
      vhouse(292, 30, 10, 10, 2, 'w', { detached: true });
      vhouse(313, 38, 12, 12, 2, 's', { detached: true });
      row(330, 50, [[11, 11, 2], [12, 11, 2]], 's');
      vhouse(357, 16, 18, 11, 2, 's', { detached: true, name: 'Village Barn', wall: 'brick', floors: false });
      vhouse(326, 12, 10, 8, 1, 'e', { detached: true });
      vhouse(252, 76, 11, 10, 2, 'n', { detached: true });
      row(277, 74, [[11, 13, 2], [11, 13, 2]], 'n');
      vhouse(312, 80, 13, 12, 2, 'n', { detached: true, locked: 'village', name: 'Village Key House' });
      vhouse(336, 96, 12, 10, 1, 'n', { detached: true });
      // east cluster (compact block; main street z≈101, cross lane x≈441)
      vhouse(389, 84, 13, 11, 2, 's');
      row(404, 81, [[11, 13, 2], [11, 13, 3], [11, 13, 2]], 's');
      row(400, 62, [[12, 13, 2], [12, 13, 2]], 's');
      vhouse(447, 64, 12, 12, 2, 'w', { detached: true });
      vhouse(459, 76, 11, 10, 1, 'w', { detached: true });
      vhouse(447, 84, 12, 11, 2, 'w');
      row(386, 106, [[13, 12, 2]], 'n'); row(404, 106, [[12, 11, 2]], 'n'); vhouse(424, 110, 13, 12, 2, 'n', { detached: true });
      row(446, 107, [[15, 12, 3], [15, 12, 2]], 'n');
      vhouse(404, 124, 10, 9, 1, 'n', { detached: true }); vhouse(420, 128, 11, 10, 1, 'n', { detached: true });
      row(446, 125, [[12, 12, 2], [13, 12, 2]], 'n');
      vhouse(484, 126, 16, 13, 2, 'e', { detached: true, name: 'Village Inn' });
      vhouse(452, 141, 10, 10, 1, 'n', { detached: true });
      // chapel + piazza (boom box quest table, market stalls, well)
      w.paint('tiles', 346, 104, 366, 130); w.paint('gravel', 344, 102, 346, 132);
      const VC = { x: 366, z: 108, w: 12, d: 18, storeys: 2, h: 6.8, floors: false, wall: 'plaster', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', tint: 0xf0e8d8, name: 'Village Chapel', doors: [{ side: 'w', at: 7.8, w: 2.4 }, ...winRow('e', 18, 3, 5, 1), ...winRow('s', 12, 3, 5, 1)] };
      bldg(VC); for (let r = 0; r < 4; r++) w.prop('gg_pew', 373, 113 + r * 3, 0, { solid: true }); w.prop('gg_altar', 373, 110, 0, { solid: true });
      w.container('basket', 368, 110, 0, { tier: 1, poi: 'village' }); w.container('cabinet', 377, 124, 0, { tier: 2, poi: 'village' });
      w.block(374, 104, 378, 108, 11, 'plaster', { tint: 0xf0e8d8 }); w.block(373.6, 103.6, 378.4, 108.4, 0.8, 'roofTile', { y0: w.groundAt(376, 106) + 10.8, collide: false });
      w.prop('gg_well', 355, 117, 0, { solid: true });
      w.prop('gg_table', 350, 108, 0, { solid: true }); w.prop('gg_tarp', 350, 108, 0, {}); w.container('electronics', 351, 109.4, 0, { tier: 1, poi: 'village', note: 'boom_box' });
      for (const [x, z] of [[350, 125], [360, 126]]) { w.prop('gg_table', x, z, 0, { solid: true }); w.prop('gg_tarp', x, z, 0, {}); w.container(pick(['basket', 'crate']), x, z + 1.4, 0, { tier: 1, poi: 'village' }); }
      for (const [x, z] of [[347, 112], [347, 120]]) w.prop('gg_bench', x, z, PI / 2, { solid: true });
      w.prop('gg_shrine', 362, 104, 0, { solid: true });
      // walled lane, terrace walls, laundry lines, cypresses, lamps
      const stoneWall = (ax, az, bx, bz, h = 1.1) => { const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.6)); for (let i = 0; i < n; i++) { const x = ax + (bx - ax) * (i + 0.5) / n, z = az + (bz - az) * (i + 0.5) / n; if (w.buildings.some(b => pointInPoly(x, z, b.poly) || (x > b.ax0 - 1.2 && x < b.ax1 + 1.2 && z > b.az0 - 1.2 && z < b.az1 + 1.2))) continue; w.block(x - 0.8, z - 0.4, x + 0.8, z + 0.4, h, 'plaster', { tint: 0xa89880 }); } };
      for (const [ax, az, bx, bz] of [[300, 8, 290, 20], [306, 14, 296, 26], [288, 22, 277, 30], [296, 28, 284, 38], [228, 98, 236, 120], [250, 100, 248, 118], [262, 96, 296, 98], [380, 132, 440, 136], [470, 150, 500, 154], [300, 118, 340, 112], [232, 30, 244, 40]]) stoneWall(ax, az, bx, bz);
      for (const [x, z, r] of [[270, 66.2, 0], [420, 77.8, 0], [455, 121.5, 0], [415, 120.5, 0], [300, 60, PI / 2]]) w.prop('gg_laundry', x, z, r, { solid: true });
      for (const [x, z] of [[240, 40], [262, 66], [306, 54], [328, 66], [346, 92], [366, 100], [384, 58], [432, 98], [476, 120], [470, 140], [410, 120], [306, 100], [248, 88], [480, 104], [344, 132], [382, 132], [398, 78], [300, 26]]) w.prop('gg_cypress', x, z, 0, { solid: true, scale: R(0.8, 1.15) });
      for (const [x, z] of [[230, 70], [360, 60], [470, 60], [338, 110], [260, 110]]) w.prop('gg_olive', x, z, rng() * 6, { solid: true });
      for (const [x, z] of [[230, 64], [262, 64], [300, 64], [330, 72], [358, 88], [384, 97], [410, 97], [438, 104], [470, 104], [500, 118], [256, 30], [286, 36], [441, 70]]) lightPost(x, z, 0xffd090);
      for (let i = 0; i < 30; i++) { const x = R(236, 504), z = R(12, 158); if (free(x, z, 1.5, 3)) w.prop(pick(['gg_flowers', 'gg_grass', 'gg_bush', 'barrel', 'gg_woodpile', 'gg_haybale', 'gg_cart', 'gg_planter']), x, z, rng() * 6, { solid: true }); }
      for (let i = 0; i < 16; i++) { const x = R(236, 504), z = R(12, 158); if (free(x, z, 2, 3)) w.container(pick(['trash', 'basket', 'plant', 'crate']), x, z, 0, { tier: 1, poi: 'village' }); }
      vehicle('gg_truck', 216, 70, 1.4); vehicle('car', 386, 94.5, 1.6); vehicle('gg_van', 286, 64, 1.55); vehicle('car', 510, 101, 0.7);
      w.arkSpawn('wasp', 300, 70, { count: 2, patrol: [[250, 50], [340, 60], [360, 110], [270, 100]] });
      w.arkSpawn('wasp', 430, 100, { count: 2, patrol: [[390, 60], [480, 100], [450, 150], [390, 130]] });
      w.arkSpawn('pop', 300, 90, { count: 2 }); w.arkSpawn('tick', 420, 90, { count: 2, habitat: 'indoor' }); w.arkSpawn('fireball', 360, 30, { count: 2 });
      w.arkSpawn('leaper', 380, 140, { count: 1, radius: 30 });
      w.arkSpawn('snitch', 330, 40, { patrol: [[260, 30], [400, 30], [400, 90]] });
      w.zone('Village', [[245, 22], [278, 18], [432, 44], [520, 108], [505, 166], [300, 125], [238, 60]], { tier: 2 });
      w.poi('village', 'Village', 372, 88, 100, { tier: 2, aliases: ['village'] });
      // Lucky Hatch
      hatchSite('lucky_hatch', 'Lucky Hatch', 500, 108, faceTo(500, 108, 492, 116));
    }

    // ======================================================================== 9. WEST WOODS: Barren Clearing, Raider's Refuge, Trapper's Glade, Adorned Wreckage
    {
      // Barren Clearing: scorched clearing with the Baron husk + Bilgun's shelter
      w.paintCircle('dirt', 168, 158, 22, 0.4, 3); w.paintCircle('mud', 176, 166, 8, 0.5, 4);
      w.prop('gg_husk_big', 176, 166, 0.7, { solid: true }); w.container('barron_husk', 176, 171.5, 0, { tier: 3, poi: 'barren_clearing' });
      house({ x: 150, z: 140, w: 8, d: 7, h: 2.8, wall: 'wood', floor: 'wood', roof: 'corrugated', name: "Bilgun's Shelter", doors: [{ side: 's', at: 3, w: 1.4 }, { side: 'e', at: 2.5, w: 1.2, sill: 1 }] }, 'camp', { tier: 2, poi: 'barren_clearing', cont0: 2 });
      for (let i = 0; i < 10; i++) w.prop(pick(['gg_stump', 'deadTree', 'gg_logs', 'gg_rock_s']), R(150, 190), R(140, 178), rng() * 6, { solid: true });
      w.arkSpawn('surveyor', 165, 150, { count: 1, patrol: [[165, 150], [130, 200], [200, 210], [210, 130]] });
      w.arkSpawn('tick', 180, 150, { count: 3 });
      w.poi('barren_clearing', 'Barren Clearing', 168, 158, 32, { tier: 1, aliases: ['barren_clearing'] });

      // Raider's Refuge: hidden raider camp
      house({ x: 296, z: 196, w: 10, d: 8, h: 3.0, wall: 'wood', floor: 'wood', roof: 'corrugated', name: "Raider's Refuge Shack", doors: [{ side: 's', at: 2, w: 1.6 }, { side: 'w', at: 3, w: 1.2, sill: 1 }, { side: 'e', at: 3, w: 1.2, sill: 1 }] }, 'camp', { tier: 2, poi: 'raiders_refuge', cont0: 3 });
      w.prop('gg_tarp', 312, 212, 0.4, { solid: true }); w.prop('gg_tent', 292, 214, 1.2, { solid: true }); w.prop('gg_tent', 318, 198, -0.5, { solid: true });
      w.prop('gg_campfire', 304, 210, 0, {}); w.lamp(304, 210, { y: 0.8, model: null, color: 0xff9040, intensity: 1.8, range: 9, flicker: 0.6 });
      for (const [x, z] of [[300, 214], [308, 216], [310, 205]]) w.prop('gg_logs', x, z, rng() * 3, { solid: true, scale: 0.6 });
      for (const [x, z, k] of [[313, 210, 'raider_cache'], [290, 211, 'backpack'], [318, 202, 'ammo_box'], [293, 217, 'medical_bag']]) w.container(k, x, z, 0, { tier: 2, poi: 'raiders_refuge' });
      w.prop('gg_crates', 286, 200, 0.2, { solid: true }); w.prop('antenna', 300, 194, 0, { solid: true });
      w.arkSpawn('wasp', 302, 205, { count: 2, patrol: [[280, 190], [330, 190], [330, 230], [280, 230]] });
      w.poi('raiders_refuge', "Raider's Refuge", 304, 206, 22, { tier: 1, aliases: ['raiders_refuge'] });

      // Trapper's Glade: trapper cabins + cellar (key room 'cellar'), raider structure w/ roof plates
      w.paintCircle('moss', 282, 290, 26, 0.5, 7);
      const TC = { x: 250, z: 294, w: 12, d: 10, h: 3.2, wall: 'wood', floor: 'wood', roof: 'roofTile', roofShape: 'gable', name: 'Trapper Cabin', doors: [{ side: 'e', at: 2, w: 1.6 }, ...winRow('s', 12, 2, 4, 1.2)], inner: [[6, 0, 6, 10, [{ at: 6, w: 1.6, door: true, locked: 'cellar' }]]] };
      bldg(TC); w.keyRoom('cellar', 250, 294, 256, 304, null, { name: "Trapper's Cellar", poi: 'trappers_glade' });   // reference: second Cellar Key icon
      for (const [x, z, k] of [[251.5, 296, 'safe'], [254.5, 296, 'weapon_case'], [251.5, 302, 'plant'], [254.5, 302.5, 'raider_cache']]) w.container(k, x, z, 0, { tier: 3, room: 'cellar', poi: 'trappers_glade' });
      furnish({ ...TC, x: 256, w: 6, inner: [] , doors: [{ side: 'e', at: 2, w: 1.6 }, { side: 'w', at: 6, w: 1.6 }] }, 'home', { tier: 1, poi: 'trappers_glade', cont0: 2 });
      house({ x: 284, z: 300, w: 9, d: 8, h: 3.0, wall: 'corrugated', floor: 'wood', roof: 'corrugated', name: 'Raider Structure', doors: [{ side: 'n', at: 3, w: 1.6 }, { side: 'w', at: 3, w: 1.2, sill: 1 }] }, 'camp', { tier: 2, poi: 'trappers_glade', cont0: 2 });
      w.prop('gg_tent', 270, 276, 0.6, { solid: true }); w.prop('gg_woodpile', 264, 292, 0, { solid: true }); w.prop('gg_campfire', 276, 288, 0, {}); w.lamp(276, 288, { y: 0.8, model: null, color: 0xff9040, intensity: 1.8, range: 9, flicker: 0.6 });
      for (const [x, z] of [[292, 280], [300, 288], [272, 312], [296, 318], [260, 282]]) w.container(pick(['plant', 'basket', 'plant']), x, z, 0, { tier: 1, poi: 'trappers_glade' });
      for (const [x, z] of [[268, 262], [306, 270], [312, 300]]) watchtower(x, z, 0.6);
      w.arkSpawn('tick', 285, 290, { count: 2 }); w.arkSpawn('leaper', 260, 250, { radius: 40 });
      w.poi('trappers_glade', "Trapper's Glade", 282, 292, 32, { tier: 1, aliases: ['trappers_glade'] });
      hatchSite('reinforced_hatch', 'Reinforced Hatch', 216, 307, faceTo(216, 307, 232, 306));

      // Adorned Wreckage: fallen ARK hull rings, engines and the Deforestr husk
      for (const [x, z, k, r] of [[205, 346, 'gg_wreck_ring', 0.5], [152, 377, 'gg_wreck_ring', 1.9], [112, 362, 'gg_wreck_ring', -0.6], [147, 404, 'gg_wreck_ring', 2.6], [176, 266, 'gg_wreck_ring', 0.2],
        [131, 440, 'gg_wreck_engine', 0.4], [258, 480, 'gg_wreck_ring', 1.2], [186, 392, 'gg_wreck_fin', 0.9], [232, 330, 'gg_wreck_fin', -0.4], [168, 420, 'gg_wreck_engine', 2.1]]) { w.prop(k, x, z, r, { solid: true }); mark(x - 5, z - 5, x + 5, z + 5, 2); w.paintCircle('dirt', x, z, 7, 0.5, x); }
      // crash trail: the hull ploughed in from the west — gouge, plates, girders, adorned with cloth + lanterns
      for (let i = 0; i < 9; i++) { const t = i / 8, x = 96 + t * 120, z = 336 + t * 30 + Math.sin(t * 7) * 6; w.raiseCircle(x, z, 6 + t * 3, -0.9, 0.7, 'add'); w.paintCircle(i % 2 ? 'mud' : 'dirt', x, z, 7 + t * 2, 0.5, i); }
      for (let i = 0; i < 26; i++) { const t = rng(), x = 96 + t * 140 + R(-14, 14), z = 330 + t * 40 + R(-16, 18); if (free(x, z, 2, 3)) { w.prop(pick(['gg_hullplate', 'gg_strut', 'gg_hullplate', 'debris', 'gg_rubble', 'husk']), x, z, rng() * 6, { solid: true, scale: R(0.7, 1.1) }); mark(x - 2, z - 2, x + 2, z + 2, 2); } }
      for (const [x, z] of [[198, 360], [160, 390], [126, 372], [226, 356], [182, 346], [150, 360]]) { w.prop('gg_lantern', x, z, 0, { solid: true }); w.lamp(x, z, { y: 1.5, model: null, color: 0xffa040, intensity: 1.4, range: 7, flicker: 0.35 }); }
      for (const [x, z] of [[190, 372], [136, 392], [210, 336]]) w.prop('gg_totem', x, z, rng() * 6, { solid: true });
      w.prop('gg_husk_big', 214, 372, 2.2, { solid: true, scale: 1.25 }); w.container('deforestr_husk', 214, 378.5, 0, { tier: 3, poi: 'adorned_wreckage' });
      for (let i = 0; i < 18; i++) { const x = R(100, 270), z = R(250, 490); if (free(x, z, 2, 2)) { w.prop(pick(['debris', 'husk', 'gg_rubble', 'debris']), x, z, rng() * 6, { solid: true }); } }
      for (const [x, z] of [[198, 352], [160, 380], [120, 368], [222, 368], [240, 344]]) w.container(pick(['arc_crate', 'arc_husk', 'toolbox', 'crate']), x, z, 0, { tier: 2, poi: 'adorned_wreckage' });
      house({ x: 236, z: 336, w: 9, d: 7, h: 3.0, wall: 'corrugated', floor: 'concrete', roof: 'corrugated', name: 'Salvage Hut', doors: [{ side: 's', at: 3, w: 1.8 }] }, 'industrial', { tier: 2, poi: 'adorned_wreckage', cont0: 2 });
      w.prop('antenna', 228, 352, 0, { solid: true }); w.prop('gg_console', 242, 345, 0, { solid: true }); w.container('electronics', 244, 346.5, 0, { tier: 2, poi: 'adorned_wreckage', note: 'communications_device' });
      for (const [x, z] of [[205, 352], [150, 384], [230, 340]]) w.lamp(x, z, { y: 2.5, model: null, color: 0xffd070, intensity: 0.7, range: 7, flicker: 0.3 });
      w.arkSpawn('leaper', 180, 380, { radius: 30 }); w.arkSpawn('wasp', 200, 360, { count: 2, patrol: [[120, 360], [240, 330], [250, 420], [150, 420]] });
      w.arkSpawn('fireball', 140, 420, { count: 2 });
      w.zone('Adorned Wreckage', [[96, 330], [250, 320], [270, 420], [130, 450]], { tier: 2 });
      w.poi('adorned_wreckage', 'Adorned Wreckage', 205, 360, 50, { tier: 2, aliases: ['adorned_wreckage'] });
      // Forest Airshaft
      airshaftSite('forest_airshaft', 'Forest Airshaft', 273, 472, faceTo(273, 472, 262, 482));
    }

    // ======================================================================== 10. HIGHWAY COLLAPSE (SW)
    {
      // elevated spans, each turned to its reference heading; deck top at `top`, rails, pillars down to the ground
      const span = ([ax, az], [bx, bz], top) => {
        const cx = (ax + bx) / 2, cz = (az + bz) / 2, L = Math.hypot(bx - ax, bz - az), a = Math.atan2(bz - az, bx - ax), Rs = rotFrame(cx, cz, a);
        const x0 = cx - L / 2, x1 = cx + L / 2, z0 = cz - 6;
        w.block(x0, z0, x1, z0 + 12, 1.1, 'concrete', { y0: top - 1.1, R: Rs });
        w.block(x0, z0, x1, z0 + 0.5, 1.0, 'damConcrete', { y0: top, R: Rs }); w.block(x0, z0 + 11.5, x1, z0 + 12, 1.0, 'damConcrete', { y0: top, R: Rs });
        for (let x = x0 + 2; x < x1 - 2; x += 7) { w.prop('gg_laney', ...rotPt(Rs, x, z0 + 6), -a, { yAbs: top + 0.02 }); w.prop('gg_lane', ...rotPt(Rs, x + 3.5, z0 + 3), -a, { yAbs: top + 0.02 }); w.prop('gg_lane', ...rotPt(Rs, x + 3.5, z0 + 9), -a, { yAbs: top + 0.02 }); }
        for (let x = x0 + 6; x < x1 - 2; x += 18) { const g = w.groundAt(...rotPt(Rs, x, z0 + 6)); w.block(x - 1.2, z0 + 3.5, x + 1.2, z0 + 8.5, top - 1.1 - (g - 0.6), 'damConcrete', { y0: g - 0.6, seed: 2, R: Rs }); }
        markPoly([[x0, z0 - 1], [x1, z0 - 1], [x1, z0 + 13], [x0, z0 + 13]].map(([x, z]) => rotPt(Rs, x, z)), 2 | 4);
        return { Rs, x0, x1, z0, a };
      };
      const SA = span([130, 632], [254, 591], 8), SB = span([130, 647], [264, 619], 8);
      const SC = span([-4, 647], [56, 642], 8); span([-4, 663], [40, 660], 8);
      w.raisePoly([[248, 584], [262, 579], [279, 600], [279, 628], [258, 628]], 8, 0.6, 'set');   // junction pad where the spans meet the causeway
      // collapsed slab: stepped ramp from the ground up onto the north span, and the fallen end of the far-west span
      for (let k = 0; k < 18; k++) { const xa = SA.x0 - (k + 1) * 1.4, top = 8 - (k + 1) * 0.4; if (top < w.groundAt(...rotPt(SA.Rs, xa, SA.z0 + 6)) + 0.3) break; w.block(xa, SA.z0 + 1, xa + 1.4, SA.z0 + 11, 0.9, 'concrete', { y0: top - 0.9, R: SA.Rs }); }
      for (let k = 0; k < 6; k++) w.block(SC.x1 + k * 1.6, SC.z0 + 2, SC.x1 + 1.6 + k * 1.6, SC.z0 + 11, 0.8, 'concrete', { y0: 7.2 - k * 1.1, collide: false, R: SC.Rs });
      for (const [x, z, r] of [[100, 615, 0.3], [118, 640, 1.2], [92, 632, 2.0], [128, 612, 2.6]]) w.prop('gg_rubble', x, z, r, { solid: true });
      for (const [S, lx, lz, k, r] of [[SA, 55, 6, 'car', 1.5], [SB, 20, 5, 'gg_truck', 1.7], [SB, 82, 7, 'car', 4.6], [SA, 41, 7.5, 'gg_van', 1.4], [SC, 40, 6, 'car', 1.6]]) {
        const [x, z] = rotPt(S.Rs, S.x0 + lx, S.z0 + lz); w.prop(k, x, z, r - S.a, { solid: true, yAbs: 8.0 });
        if (k !== 'gg_van' && S !== SC) w.container('car_trunk', ...rotPt(S.Rs, S.x0 + lx + 2.6, S.z0 + lz), -S.a, { tier: 1, poi: 'highway_collapse' });
      }
      // upper broken highway from the west: isolated elevated pieces
      for (const seg of [[[50, 388], [86, 410]], [[104, 424], [140, 462]], [[160, 498], [200, 538]], [[214, 552], [252, 588]]]) {
        const P = resample(seg, 3); levelPath(P, P.map(() => 7.6), 11, 0.6); w.road(P, 10, 'asphalt', { edge: 'concrete', edgeW: 0.5, level: false }); markLine(P, 7, 2 | 4);
      }
      // pillars along the causeway (viaduct look) + highway lamps
      const HW = resample(HWY_W, 12);
      for (let i = 1; i < HW.length - 1; i++) { const [x, z] = HW[i], [x2, z2] = HW[i + 1], a = Math.atan2(x2 - x, z2 - z); for (const s of [-1, 1]) w.prop('gg_hwpillar', x + Math.cos(a) * 7.6 * s, z - Math.sin(a) * 7.6 * s, a, {}); if (i % 2) w.lamp(x, z, { y: 4, color: 0xffd890, intensity: 2.2, range: 13 }); }
      w.prop('gg_toll', 270, 612, 0.9, { solid: true, yAbs: 8 });
      w.arkSpawn('bombardier', 220, 640, { count: 1, radius: 20 }); w.arkSpawn('spotter', 260, 600, { count: 1, patrol: [[200, 600], [300, 580], [340, 548]] });
      w.arkSpawn('hornet', 300, 570, { count: 2, patrol: [[260, 610], [380, 515], [300, 520]] });
      w.arkSpawn('leaper', 160, 690, { radius: 30 });
      w.zone('Highway Collapse', [[140, 560], [350, 530], [360, 650], [140, 680]], { tier: 1 });
      w.poi('highway_collapse', 'Highway Collapse', 290, 580, 60, { tier: 1, aliases: ['highway_collapse'] });
    }

    // ======================================================================== 11. SOUTH: Olive Grove, Ruined Homestead, Ancient Fort, Fragrant Hatch
    {
      // Olive Grove: terraced rows + bee hives + farm shed + comms terminal
      const OG = [[420, 560], [500, 556], [516, 600], [500, 640], [430, 632]];
      w.paintPoly('dirt', OG);
      for (let z = 562; z < 636; z += 7) for (let x = 424; x < 512; x += 7.5) { const xx = x + (rng() - 0.5) * 1.6, zz = z + (rng() - 0.5) * 1.6; if (pointInPoly(xx, zz, OG) && free(xx, zz, 1.5, 3)) w.prop('gg_olive', xx, zz, rng() * 6, { solid: true, scale: R(0.85, 1.15) }); }
      for (const [x, z] of [[440, 600], [446, 600], [452, 600], [458, 600], [470, 572], [476, 572]]) { w.prop('gg_beehive', x, z, 0, { solid: true }); w.container('bee_hive', x, z + 0.8, 0, { tier: 1, poi: 'olive_grove' }); }
      house({ x: 482, z: 590, w: 10, d: 8, h: 3.0, wall: 'brick', floor: 'wood', roof: 'roofTile', roofShape: 'gable', name: 'Grove Shed', doors: [{ side: 'w', at: 3, w: 1.6 }, { side: 's', at: 3, w: 1.2, sill: 1 }] }, 'shed', { tier: 1, poi: 'olive_grove' });
      w.prop('gg_console', 478, 584, PI, { solid: true }); w.prop('antenna', 476, 586, 0, { solid: true }); w.container('electronics', 480, 583, 0, { tier: 2, poi: 'olive_grove', note: 'comms_terminal' });
      for (const [x, z] of [[456, 580], [492, 612], [434, 618]]) w.container(pick(['plant', 'basket']), x, z, 0, { tier: 1, poi: 'olive_grove' });
      w.prop('gg_cart', 466, 610, 1.2, { solid: true }); w.prop('gg_haybale', 498, 604, 0, { solid: true });
      w.arkSpawn('wasp', 466, 596, { count: 2, patrol: [[430, 570], [510, 570], [500, 630], [440, 630]] });
      w.zone('Olive Grove', OG, { tier: 1 });
      w.poi('olive_grove', 'Olive Grove', 466, 596, 42, { tier: 1, aliases: ['olive_grove'] });

      // Ruined Homestead: broken farmhouses, barn, the farmhouse cellar (key room 'cellar')
      const RH = [
        { x: 506, z: 604, w: 14, d: 11, storeys: 2, name: 'Farmhouse', kind: 'home' },
        { x: 526, z: 616, w: 12, d: 10, storeys: 1, name: 'Ruined House', kind: 'ruin' },
        { x: 548, z: 628, w: 18, d: 12, storeys: 1, h: 4.8, name: 'Barn', kind: 'shed', wall: 'wood', roof: 'corrugated' },
        { x: 532, z: 640, w: 10, d: 9, storeys: 1, name: 'Ruined Cottage', kind: 'ruin' },
        { x: 516, z: 586, w: 10, d: 9, storeys: 1, name: 'Stable', kind: 'shed', wall: 'wood', roof: 'corrugated' },
      ];
      for (const r of RH) {
        const doors = [{ side: 's', at: 2, w: 1.6 }, { side: 'n', at: r.w - 4, w: 1.4 }, ...winRow('e', r.d, 2, 3.5, 1.2)];
        if (r.kind === 'ruin') doors.push({ side: 'w', at: 1, w: r.d - 3 }, { side: 'n', at: 1, w: 3 });
        house({ x: r.x, z: r.z, w: r.w, d: r.d, storeys: r.storeys, h: r.h, wall: r.wall || (r.kind === 'ruin' ? 'brick' : 'plaster'), floor: 'wood', roof: r.roof || 'roofTile', roofShape: r.kind === 'ruin' ? undefined : 'gable', tint: 0xd8c8b0, name: r.name, peek: r.kind === 'ruin' ? 0.45 : undefined,
          doors: doors.filter((d, i, a) => d.at + d.w < (d.side === 'n' || d.side === 's' ? r.w : r.d) - 0.4 && !a.some((e, j) => j < i && e.side === d.side && Math.abs(e.at - d.at) < 2.5)),
          inner: r.w >= 12 ? [[Math.round(r.w / 2), 0, Math.round(r.w / 2), r.d, [{ at: r.d / 2 - 0.8, w: 1.6 }]]] : [] }, r.kind, { tier: 1, poi: 'ruined_homestead', cont: r.kind === 'ruin' ? 'ruin' : undefined });
      }
      for (let i = 0; i < 10; i++) w.prop(pick(['debris', 'gg_rubble', 'gg_rock_s', 'gg_woodpile']), R(500, 570), R(580, 655), rng() * 6, { solid: true, scale: 0.6 });
      const FH = { x: 432, z: 640, w: 12, d: 10, storeys: 1, wall: 'plaster', floor: 'wood', roof: 'roofTile', roofShape: 'gable', tint: 0xe0d0b8, name: 'Farmhouse Cellar', doors: [{ side: 'e', at: 2, w: 1.6 }, ...winRow('n', 12, 2, 4, 1.2)], inner: [[0, 5, 6, 5, [{ at: 2, w: 1.6, door: true, locked: 'cellar' }]], [6, 0, 6, 5, []]] };
      bldg(FH); w.keyRoom('cellar', 432, 640, 438, 645, null, { name: 'Farmhouse Cellar', poi: 'ruined_homestead' });
      for (const [x, z, k] of [[433.5, 641.5, 'safe'], [436.5, 641.5, 'weapon_case'], [435, 643.8, 'raider_cache']]) w.container(k, x, z, 0, { tier: 3, room: 'cellar', poi: 'ruined_homestead' });
      furnish({ ...FH, inner: [[6, 0, 6, 5, []], [0, 5, 6, 5, [{ at: 2, w: 1.6 }]]] }, 'home', { tier: 1, poi: 'ruined_homestead', cont0: 2 });
      for (const [x, z] of [[502, 600], [560, 622], [520, 652]]) lightPost(x, z, 0xffc880);
      w.arkSpawn('pop', 530, 625, { count: 2 }); w.arkSpawn('tick', 556, 634, { count: 2, habitat: 'indoor' });
      w.arkSpawn('hornet', 520, 620, { count: 1, patrol: [[480, 600], [560, 600], [560, 660], [480, 660]] });
      w.zone('Ruined Homestead', [[496, 580], [572, 580], [572, 660], [426, 660], [426, 636]], { tier: 2 });
      w.poi('ruined_homestead', 'Ruined Homestead', 532, 624, 34, { tier: 2, aliases: ['ruined_homestead'] });

      // Ancient Fort on its hill: curtain walls, corner towers, keep, merlons — turned -17.6° like the reference outline
      const FA = -0.307, FCX = 610, FCZ = 708, FW = 46, FD = 48, FX = FCX - FW / 2, FZ = FCZ - FD / 2, FR = rotFrame(FCX, FCZ, FA), FY = w.groundAt(FCX, FCZ);
      const fP = (x, z) => rotPt(FR, x, z), fRect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => fP(x, z));
      const fDef = (o) => { const [cx, cz] = fP(o.x + o.w / 2, o.z + o.d / 2); return { ...o, x: cx - o.w / 2, z: cz - o.d / 2, rot: FA }; };
      w.raisePoly(fRect(FX - 4, FZ - 4, FX + FW + 4, FZ + FD + 4), FY, 6, 'set'); w.paintPoly('gravel', fRect(FX, FZ, FX + FW, FZ + FD));
      const wallSeg = (x0, z0, x1, z1) => { w.block(x0, z0, x1, z1, 5.2, 'brick', { tint: 0xc0b098, y0: FY - 0.3, R: FR }); const horiz = (x1 - x0) > (z1 - z0), L = horiz ? x1 - x0 : z1 - z0; for (let s = 0.5; s < L - 0.8; s += 2) w.prop('gg_merlon', ...fP(horiz ? x0 + s + 0.6 : (x0 + x1) / 2, horiz ? (z0 + z1) / 2 : z0 + s + 0.6), -FA, { yAbs: FY + 4.9 }); };
      wallSeg(FX, FZ, FX + FW, FZ + 1.6); wallSeg(FX, FZ, FX + 1.6, FZ + FD);
      wallSeg(FX + FW - 1.6, FZ, FX + FW, FZ + 20); wallSeg(FX + FW - 1.6, FZ + 28, FX + FW, FZ + FD);      // east gate gap
      wallSeg(FX, FZ + FD - 1.6, FX + 18, FZ + FD); wallSeg(FX + 28, FZ + FD - 1.6, FX + FW, FZ + FD);      // south breach
      for (const [x, z] of [[FX, FZ], [FX + FW - 6, FZ], [FX, FZ + FD - 6], [FX + FW - 6, FZ + FD - 6]]) w.block(x - 1, z - 1, x + 7, z + 7, 8.2, 'brick', { tint: 0xb0a088, y0: FY - 0.3, R: FR });
      // ladders from the courtyard onto the NW and SE corner towers (8.2 m lookouts over the curtain walls)
      { const [l1x, l1z] = fP(FX + 7.6, FZ + 3), [t1x, t1z] = fP(FX + 5.6, FZ + 3); w.ladder(l1x, l1z, null, t1x, t1z, null, PI / 2 - FA);
        const [l2x, l2z] = fP(FX + FW - 7.6, FZ + FD - 3), [t2x, t2z] = fP(FX + FW - 5.6, FZ + FD - 3); w.ladder(l2x, l2z, null, t2x, t2z, null, -PI / 2 - FA); }
      w.prop('gg_fortruin', ...fP(FX + 23, FZ + FD + 2), -FA, { solid: true }); w.prop('gg_rubble', ...fP(FX + 23, FZ + FD - 2), -FA, { solid: true, scale: 0.6 });
      const KEEP = fDef({ x: FX + 12, z: FZ + 10, w: 20, d: 16, storeys: 3, h: 9.0, wall: 'brick', floor: 'tiles', roof: 'roofTile', tint: 0xc8b8a0, name: 'Fort Keep', floorY: FY,
        doors: [{ side: 's', at: 9, w: 2 }, { side: 'e', at: 6, w: 1.6 }, ...winRow('n', 20, 3, 5, 0.8), ...winRow('w', 16, 3, 5, 0.8)], inner: [[10, 0, 10, 16, [{ at: 6, w: 2 }]], [0, 9, 10, 9, [{ at: 4, w: 1.6 }]]], ladders: [{ side: 'e', at: 12 }], upInner: false });
      house(KEEP, 'office', { tier: 2, cont: 'lab', poi: 'ancient_fort' });
      w.container('weapon_case', ...fP(FX + 14, FZ + 12), -FA, { tier: 3, poi: 'ancient_fort' }); w.container('electronics', ...fP(FX + 30, FZ + 12), -FA, { tier: 3, poi: 'ancient_fort' });
      house(fDef({ x: FX + 4, z: FZ + 30, w: 10, d: 8, h: 3.2, wall: 'brick', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', tint: 0xc8b8a0, name: 'Fort Chapel', floorY: FY, doors: [{ side: 'e', at: 3, w: 1.6 }] }), 'church', { tier: 2, poi: 'ancient_fort', cont0: 2 });
      house(fDef({ x: FX + 34, z: FZ + 32, w: 8, d: 7, h: 3.2, wall: 'brick', floor: 'tiles', roof: 'roofTar', tint: 0xc8b8a0, name: 'Fort Storeroom', floorY: FY, doors: [{ side: 'n', at: 3, w: 1.6 }] }), 'shed', { tier: 2, poi: 'ancient_fort', cont0: 2 });
      w.prop('gg_dish', ...fP(FX + 22, FZ + 36), 0.4 - FA, { solid: true }); w.prop('gg_generator', ...fP(FX + 26, FZ + 36), -FA, { solid: true }); w.container('electronics', ...fP(FX + 24, FZ + 38), -FA, { tier: 2, poi: 'ancient_fort', note: 'transmitter' });
      w.prop('gg_printer', ...fP(FX + 18, FZ + 30), -FA, { solid: true }); w.container('electronics', ...fP(FX + 18, FZ + 31.4), -FA, { tier: 2, poi: 'ancient_fort', note: 'security_code_printer' });
      for (const [x, z] of [[FX + 8, FZ + 8], [FX + 38, FZ + 8], [FX + 22, FZ + 28], [FX + 50, FZ + 24]]) lightPost(...fP(x, z), 0xffc880);
      w.arkSpawn('rocketeer', ...fP(FX + 23, FZ + 20), { patrol: [fP(FX - 10, FZ - 10), fP(FX + 60, FZ - 10), fP(FX + 60, FZ + 58), fP(FX - 10, FZ + 58)] });
      w.arkSpawn('tick', ...fP(FX + 22, FZ + 18), { count: 2, habitat: 'indoor' }); w.arkSpawn('leaper', 640, 760, { radius: 30 });
      w.zone('Ancient Fort', fRect(FX - 6, FZ - 6, FX + FW + 6, FZ + FD + 6), { tier: 2 });
      w.poi('ancient_fort', 'Ancient Fort', FCX, FCZ, 34, { tier: 2, aliases: ['ancient_fort'] });
      // Fragrant Hatch
      hatchSite('fragrant_hatch', 'Fragrant Hatch', 444, 527, faceTo(444, 527, 478, 527));
      for (let i = 0; i < 14; i++) { const x = R(420, 470), z = R(510, 545); if (free(x, z, 1, 3)) w.prop(pick(['gg_flowers', 'gg_bush', 'gg_flowers']), x, z, rng() * 6, {}); }
    }

    // ======================================================================== 12. EAST + CENTRE-SOUTH: Maintenance Bunker, Overlook, Broken Earth, Ridgeline, Housing Project
    {
      // Maintenance Bunker: half-buried bunker w/ purification plant
      const MB = { x: 624, z: 506, w: 22, d: 14, storeys: 1, h: 3.6, wall: 'damConcrete', floor: 'concrete', roof: 'damConcrete', tint: 0xc8c8c0, name: 'Maintenance Bunker', blend: 4,
        doors: [{ side: 's', at: 4, w: 2.2 }, { side: 'e', at: 5, w: 1.8 }, { side: 'w', at: 9, w: 1.6, sill: 1 }], inner: [[10, 0, 10, 14, [{ at: 4, w: 2 }]], [10, 7, 22, 7, [{ at: 5, w: 1.8 }]]], roofExtras: [[2, 2, 6, 6, 1.0], [14, 3, 20, 5, 0.6]] };
      house(MB, 'industrial', { tier: 2, poi: 'maintenance_bunker', density: 22 });
      for (const [x, z] of [[612, 512], [612, 520]]) { w.block(x - 3, z - 2.5, x + 3, z + 2.5, 3.0, 'metalPanel', {}); }
      w.prop('gg_pipes', 618, 526, 0, { solid: true }); w.prop('gg_transformer', 650, 524, 0, { solid: true });
      w.lamp(635, 513, { y: 3.0, model: null, color: 0xd0f0ff, intensity: 1.0, range: 10 }); lightPost(620, 530); lightPost(652, 504);
      w.arkSpawn('tick', 635, 512, { count: 2, habitat: 'indoor' }); w.arkSpawn('pop', 650, 535, { count: 2 });
      w.spawnPoint(649, 498, { poi: 'maintenance_bunker' });
      w.poi('maintenance_bunker', 'Maintenance Bunker', 635, 514, 24, { tier: 2, aliases: ['maintenance_bunker'] });
      // Overlook Airshaft on its knoll
      airshaftSite('overlook_airshaft', 'Overlook Airshaft', 679, 486, faceTo(679, 486, 682, 502));
      // Cliffside Airshaft at the foot of the bench cliff
      airshaftSite('cliffside_airshaft', 'Cliffside Airshaft', 459, 218, faceTo(459, 218, 447, 224));
      // Broken Earth: a trail of destruction — craters, upturned slabs, downed ARK machines
      w.paintPoly('mud', [[706, 528], [722, 540], [672, 590], [632, 622], [616, 610], [660, 566]]);
      for (const [x, z, k, r] of [[690, 550, 'gg_husk_big', 0.8], [656, 578, 'husk', 1.2], [638, 600, 'husk', 2.0], [710, 538, 'gg_rubble', 0.4], [668, 566, 'gg_slab', 0.7], [646, 590, 'gg_slab', 2.2], [700, 560, 'gg_rock_l2', 1.0], [628, 612, 'gg_rubble', 2.4]])
        w.prop(k, x, z, r, { solid: true });
      for (const [x, z] of [[690, 552], [656, 580], [638, 602]]) w.container('arc_husk', x + 3, z + 2, 0, { tier: 2, poi: 'broken_earth' });
      for (let i = 0; i < 20; i++) w.prop(pick(['debris', 'gg_scree', 'gg_rock_s', 'deadTree']), R(620, 720), R(530, 620), rng() * 6, { solid: false });
      w.arkSpawn('bastion', 670, 575, { radius: 30, patrol: [[700, 540], [640, 600], [680, 620]] }); w.arkSpawn('surveyor', 660, 590, { patrol: [[640, 560], [720, 560], [700, 620]] });
      w.poi('broken_earth', 'Broken Earth', 670, 572, 40, { tier: 1, aliases: ['broken_earth'] });
      // Ridgeline: crest path + observation deck (quest) + shacks
      const deckY = w.groundAt(902, 432);
      w.block(896, 426, 908, 438, 0.5, 'wood', { y0: deckY + 2.2 }); for (const [x, z] of [[896.5, 426.5], [907.5, 426.5], [896.5, 437.5], [907.5, 437.5]]) w.block(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 2.4, 'wood', { y0: deckY - 0.2, collide: false });
      for (let k = 0; k < 6; k++) w.block(890 + k * 1, 430, 891 + k * 1, 434, 0.4 * (k + 1), 'wood', { y0: deckY - 0.1 });
      w.prop('gg_dish', 904, 428, 0.2, { yAbs: deckY + 2.7 }); w.container('electronics', 900, 434, 0, { tier: 2, poi: 'ridgeline', note: 'observation_deck' });
      house({ x: 860, z: 392, w: 9, d: 7, h: 3, wall: 'wood', floor: 'wood', roof: 'corrugated', name: 'Ridge Hut', doors: [{ side: 'w', at: 2, w: 1.6 }] }, 'shed', { tier: 1, poi: 'ridgeline' });
      house({ x: 860, z: 470, w: 8, d: 7, h: 3, wall: 'wood', floor: 'wood', roof: 'corrugated', name: 'Ridge Hut', doors: [{ side: 'w', at: 2, w: 1.6 }] }, 'shed', { tier: 1, poi: 'ridgeline' });
      w.arkSpawn('leaper', 880, 440, { radius: 40 }); w.arkSpawn('rocketeer', 870, 500, { patrol: [[840, 420], [900, 520], [940, 460]] });
      w.arkSpawn('wasp', 880, 400, { count: 2, patrol: [[860, 360], [900, 380], [880, 470]] });
      w.poi('ridgeline', 'Ridgeline', 885, 436, 52, { tier: 1, aliases: ['ridgeline'] });
      // Abandoned Housing Project: rows of unfinished prefab houses
      const AH = [[892, 284, 12, 9], [910, 280, 12, 9], [928, 278, 12, 9], [896, 300, 12, 9], [914, 302, 12, 9], [936, 300, 11, 9], [904, 320, 12, 9], [924, 324, 12, 9], [912, 344, 12, 10], [934, 342, 10, 9]];
      AH.forEach(([x, z, ww, dd], i) => {
        const unfinished = i % 4 === 3;
        house({ x, z, w: ww, d: dd, storeys: unfinished ? 1 : 2, wall: i % 2 ? 'metalPanel' : 'plaster', tint: [0xd8d0c0, 0xc8d0d8, 0xe0d0b0][i % 3], floor: 'wood', roof: unfinished ? 'corrugated' : 'roofTar', name: 'Prefab House', peek: unfinished ? 0.4 : undefined,
          doors: [{ side: 's', at: 2, w: 1.6 }, { side: 'n', at: ww - 3.5, w: 1.4 }, ...winRow('s', ww, 5, 3, 1.4), ...(unfinished ? [{ side: 'e', at: 1, w: dd - 2.5 }] : [])],
          inner: [[Math.round(ww / 2), 0, Math.round(ww / 2), dd, [{ at: dd / 2 - 0.8, w: 1.6 }]]] }, unfinished ? 'shed' : 'home', { tier: i % 3 === 0 ? 2 : 1, poi: 'abandoned_housing_project' });
      });
      // boulders along the Ridgeline foot (after the prefab houses so they keep out of them)
      for (let i = 0; i < 16; i++) { const t = i / 15, x = 905 + Math.sin(t * 5) * 6 + R(-4, 4), z = 335 + t * 185; if (free(x + 8, z, 3.5, 3)) w.prop(pick(['gg_crag', 'gg_rock_l', 'gg_rock_m', 'gg_rock_l2']), x + 8, z, rng() * 6, { solid: true }); }
      for (const [x, z, k, r] of [[950, 318, 'gg_pallet', 0], [888, 330, 'gg_container3', 1.6], [950, 332, 'gg_logs', 0.2], [900, 268, 'gg_truck', 1.5], [944, 360, 'gg_crates', 0]]) w.prop(k, x, z, r, { solid: true });
      for (const [x, z] of [[902, 296], [930, 296], [918, 318], [930, 340]]) lightPost(x, z, 0xffd8a0);
      hatchSite('prefab_hatch', 'Prefab Hatch', 955, 292, faceTo(955, 292, 940, 286));
      w.arkSpawn('pop', 916, 312, { count: 3 }); w.arkSpawn('tick', 928, 330, { count: 2, habitat: 'indoor' }); w.arkSpawn('hornet', 920, 300, { count: 2, patrol: [[880, 270], [960, 270], [960, 360], [880, 360]] });
      w.zone('Abandoned Housing Project', [[884, 270], [962, 266], [962, 360], [884, 360]], { tier: 2 });
      w.poi('abandoned_housing_project', 'Abandoned Housing Project', 920, 316, 44, { tier: 2, aliases: ['abandoned_housing_project'] });
      // isolated farm buildings / shelters across the map
      const MISC = [[352, 254, 'shed'], [420, 470, 'shed'], [600, 470, 'shed'], [760, 470, 'ruin'], [820, 620, 'ruin'], [720, 700, 'shed'], [380, 700, 'ruin'], [200, 220, 'camp'], [820, 120, 'ruin'], [530, 92, 'shed'], [140, 640, 'ruin'], [880, 640, 'camp'], [600, 560, 'shed'], [350, 590, 'shed']];
      for (const [x, z, k] of MISC) {
        if (!free(x + 4, z + 4, 6, 2)) continue;
        house({ x, z, w: 8, d: 7, h: 3, wall: k === 'camp' ? 'corrugated' : pick(['brick', 'wood', 'plaster']), floor: 'wood', roof: k === 'ruin' ? 'roofTile' : 'corrugated', name: k === 'ruin' ? 'Ruin' : 'Shed', peek: k === 'ruin' ? 0.4 : undefined,
          doors: [{ side: pick(['s', 'w', 'e']), at: 2, w: 1.6 }, { side: 'n', at: 3, w: 1.2, sill: 1 }] }, k, { tier: 1, cont0: 2 });
      }
    }

    // ======================================================================== 12b. POI CLUTTER (detail bar: every POI dressed outside too)
    {
      const CL = [
        [...cp(-100, 0), 62, ['gg_cone', 'gg_barrier', 'barrel', 'gg_crates', 'sandbag', 'debris', 'gg_pallet', 'barrelBlue'], 46, { mask: 2 }],
        [372, 92, 105, ['barrel', 'gg_woodpile', 'gg_planter', 'gg_cart', 'gg_haybale', 'crate', 'gg_bench', 'gg_flowers'], 34],
        [168, 158, 28, ['gg_stump', 'deadTree', 'gg_logs', 'debris', 'husk', 'gg_scree'], 14],
        [304, 206, 18, ['gg_crates', 'barrel', 'gg_pallet', 'gg_logs', 'debris', 'gg_lantern'], 10],
        [282, 292, 28, ['gg_stump', 'gg_logs', 'gg_woodpile', 'gg_haybale', 'barrel', 'gg_laundry', 'gg_fern'], 16],
        [290, 580, 55, ['debris', 'gg_rubble', 'car', 'husk', 'gg_strut', 'gg_hullplate', 'gg_barrier', 'gg_cone'], 22],
        [466, 596, 44, ['gg_haybale', 'gg_cart', 'barrel', 'gg_woodpile', 'gg_beehive'], 10],
        [532, 624, 34, ['gg_woodpile', 'gg_haybale', 'barrel', 'debris', 'gg_cart', 'gg_laundry', 'gg_rubble'], 16],
        [613, 717, 34, ['debris', 'gg_rock_s', 'barrel', 'gg_fortruin', 'gg_crates'], 12],
        [670, 572, 40, ['debris', 'gg_rubble', 'husk', 'gg_rock_m', 'gg_slab', 'gg_strut'], 16],
        [635, 514, 22, ['barrel', 'barrelBlue', 'gg_pipes', 'gg_crates', 'gg_generator', 'gg_transformer'], 10],
        [885, 436, 44, ['gg_rock_s', 'gg_boulder', 'deadTree', 'gg_logs', 'gg_rock_m'], 12],
        [920, 316, 44, ['gg_pallet', 'gg_crates', 'barrel', 'debris', 'gg_logs', 'gg_cone', 'gg_container3', 'gg_laundry'], 20],
        [925, 120, 50, ['gg_planter', 'gg_bench', 'barrel', 'gg_crates', 'gg_flowers'], 12],
        [746, 289, 60, ['gg_pallet', 'gg_crates', 'barrel', 'barrelBlue', 'gg_container', 'gg_cone', 'gg_container2'], 18],
        [566, 156, 34, ['sandbag', 'gg_barrier', 'barrel', 'gg_crates', 'gg_cone'], 12],
        [757, 130, 30, ['gg_crates', 'barrel', 'gg_generator', 'gg_dish'], 6],
        [662, 337, 28, ['gg_barrier', 'gg_crates', 'sandbag', 'barrel'], 8],
        [676, 190, 40, ['gg_pipes', 'gg_crates', 'barrel', 'gg_generator', 'gg_transformer'], 10],
        [205, 360, 60, ['gg_hullplate', 'gg_strut', 'debris', 'gg_lantern', 'husk'], 16],
      ];
      for (const [cx, cz, r, kinds, n, o] of CL) clutter(cx, cz, r, kinds, n, o || {});
    }

    // ======================================================================== 13. VEGETATION + DRESSING
    {
      const steep = (x, z) => Math.max(Math.abs(w.groundAt(x + 1.2, z) - w.groundAt(x - 1.2, z)), Math.abs(w.groundAt(x, z + 1.2) - w.groundAt(x, z - 1.2))) > 1.2;
      const avoidT = (x, z) => !inPlay(x, z) || !free(x, z, 1.2, 3) || (occ(x, z) & 8);
      const avoidS = (x, z) => avoidT(x, z) || (occ(x, z) & 4);
      // dense west forest (Trapper's Glade / Raider's Refuge woods) — leaving the clearings open
      const WF = [[176, 186], [250, 150], [330, 160], [348, 240], [340, 330], [320, 400], [300, 470], [230, 500], [182, 450], [190, 330], [150, 260]];
      const clearings = [[168, 158, 30], [304, 206, 16], [282, 292, 22], [205, 360, 34], [273, 472, 12], [216, 306, 8]];
      const inClear = (x, z) => clearings.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r);
      paintPolyN('forest', WF, 14);
      w.forest(WF, 2.7, ['pine', 'gg_pinebig', 'gg_spruce', 'tree', 'gg_spruce'], { avoid: (x, z) => avoidT(x, z) || inClear(x, z), undergrowth: false });
      w.scatter('gg_fern', WF, 900, { avoid: (x, z) => avoidT(x, z), solid: false });
      w.scatter('bush', WF, 500, { avoid: (x, z) => avoidT(x, z), solid: false });
      // highway collapse woods
      const HF = [[190, 470], [300, 480], [340, 520], [330, 600], [270, 625], [200, 590], [180, 530]];
      paintPolyN('forest', HF, 12);
      w.forest(HF, 2.4, ['pine', 'tree', 'gg_spruce', 'gg_birch'], { avoid: avoidT, undergrowth: false });
      w.scatter('gg_fern', HF, 300, { avoid: avoidT });
      // north-west forest around the Village and Barren Clearing
      const NWF = [[100, 110], [160, 60], [236, 40], [240, 110], [200, 140], [140, 180], [110, 230], [92, 190]];
      w.forest(NWF, 2.2, ['pine', 'gg_pinebig', 'tree'], { avoid: (x, z) => avoidT(x, z) || inClear(x, z), undergrowth: false });
      // sparse trees everywhere else (open rocky valley), heavier toward the boundary
      const kinds = ['pine', 'tree', 'gg_spruce', 'gg_birch', 'deadTree', 'gg_pinebig'];
      for (let i = 0; i < 2600; i++) {
        const x = R(40, 1080), z = R(10, 815); if (avoidS(x, z)) continue;
        const d = dAt(x, z), p = d > -40 ? 0.85 : (N1(x, z, 60) > 0.55 ? 0.6 : 0.16);
        if (rng() > p) continue;
        w.prop(pick(kinds), x, z, rng() * 6, { solid: true, scale: R(0.8, 1.25) });
      }
      // mountain flanks just outside the playable area (visual framing)
      for (let i = 0; i < 3200; i++) {
        const x = R(0, W), z = R(0, H), d = dAt(x, z); if (d < 2 || d > 70) continue;
        if (N2(x, z, 30) < 0.42) continue;
        w.prop(pick(['pine', 'gg_spruce', 'gg_pinebig', 'pine', 'deadTree']), x, z, rng() * 6, { solid: true, scale: R(0.8, 1.3) });
      }
      // undergrowth + grass tufts + flowers in the open
      w.scatter('gg_grass', [40, 20, 1060, 800], 5200, { avoid: (x, z) => !inPlay(x, z) || (occ(x, z) & 11) });
      w.scatter('gg_bush', [40, 20, 1060, 800], 1400, { avoid: (x, z) => avoidT(x, z) });
      w.scatter('bush', [40, 20, 1060, 800], 900, { avoid: (x, z) => avoidT(x, z) });
      w.scatter('gg_flowers', [100, 400, 700, 760], 500, { avoid: (x, z) => avoidT(x, z) });
      // rocks + boulders dressing the outcrops and the slopes
      for (const o of outcrops) {
        const n = Math.round(o.pts.length * 0.9);
        for (let i = 0; i < n; i++) { const p = o.pts[Math.floor(rng() * o.pts.length)], k = pick(['gg_rock_m', 'gg_rock_m2', 'gg_rock_l', 'gg_boulder', 'gg_rock_s', 'gg_slab', 'gg_crag']), x = p[0] + R(-2, 2), z = p[1] + R(-2, 2), r = rng() * 6, sc = R(0.7, 1.2); w.prop(k, x, z, r, { solid: true, scale: sc }); mark(x - 1.6 * sc, z - 1.6 * sc, x + 1.6 * sc, z + 1.6 * sc, 2); }
        w.prop('gg_scree', o.pts[0][0] + R(-3, 3), o.pts[0][1] + R(2, 5), rng() * 6, {});
      }
      for (let i = 0; i < 900; i++) {
        const x = R(40, 1060), z = R(15, 810); if (avoidT(x, z)) continue;
        const k = pick(['gg_rock_s', 'gg_rock_s', 'gg_boulder', 'gg_rock_m', 'rock', 'gg_scree', 'gg_rock_m2']), r = rng() * 6, sc = R(0.6, 1.3);
        w.prop(k, x, z, r, { solid: true, scale: sc }); mark(x - 1.2 * sc, z - 1.2 * sc, x + 1.2 * sc, z + 1.2 * sc, 2);
      }
      for (let i = 0; i < 1100; i++) {   // big boulders and crags on the mountain foot
        const x = R(0, W), z = R(0, H), d = dAt(x, z); if (d < -6 || d > 50) continue;
        const k = pick(['gg_rock_l', 'gg_rock_l2', 'gg_crag', 'gg_slab', 'gg_rock_m']), r = rng() * 6, sc = R(0.9, 1.8);
        w.prop(k, x, z, r, { solid: true, scale: sc }); mark(x - 2 * sc, z - 2 * sc, x + 2 * sc, z + 2 * sc, 2);
      }
      // paint: terrain variety (moss under trees, gravel washes, dirt patches)
      w.paintFn((x, z, t) => {
        const n = N1(x, z, 26), n2 = N2(x, z, 9), d = dAt(x, z);
        if (t !== 0) return null;   // only over grass
        if (d > 4) return n2 > 0.62 ? 'gravel' : (n > 0.5 ? 'rock' : 'moss');
        const big = N2(x, z, 85), rocky = big > 0.47 && !(occ(x, z) & 4);
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

    // ======================================================================== 14. ROAMING ARK + SPAWNS + ZONES
    {
      const R0 = [
        ['wasp', 520, 470, 2, [[480, 450], [560, 520], [620, 470]]], ['wasp', 820, 420, 2, [[780, 400], [860, 450], [820, 520]]], ['wasp', 380, 600, 2, [[340, 560], [420, 640], [380, 680]]],
        ['hornet', 760, 640, 2, [[720, 600], [820, 640], [780, 700]]], ['hornet', 420, 250, 1, [[380, 230], [460, 280], [420, 320]]], ['rocketeer', 560, 600, 1, [[520, 560], [620, 600], [580, 660]]],
        ['wasp', 220, 260, 2, [[200, 230], [260, 260], [230, 300]]], ['snitch', 600, 420, 1, [[560, 400], [640, 440], [600, 480]]], ['snitch', 820, 200, 1, [[790, 180], [850, 240]]],
        ['wasp', 980, 200, 2, [[960, 180], [990, 240], [940, 230]]], ['hornet', 160, 560, 1, [[120, 520], [200, 580], [140, 620]]], ['wasp', 700, 760, 2, [[660, 740], [760, 760]]],
      ];
      for (const [k, x, z, c, p] of R0) w.arkSpawn(k, x, z, { count: c, patrol: p });
      for (const [k, x, z, c] of [['leaper', 760, 520, 1], ['leaper', 360, 420, 1], ['bastion', 840, 700, 1], ['bombardier', 800, 560, 1], ['spotter', 760, 560, 1], ['tick', 400, 380, 3], ['pop', 560, 560, 2],
        ['fireball', 720, 460, 2], ['fireball', 330, 300, 2], ['tick', 860, 600, 2], ['pop', 200, 700, 2], ['surveyor', 480, 700, 1], ['surveyor', 900, 520, 1], ['shredder', 780, 470, 1],
        ['tick', 120, 300, 2], ['pop', 940, 640, 2], ['leaper', 960, 400, 1], ['fireball', 560, 40, 2], ['tick', 700, 90, 3], ['spotter', 640, 650, 1], ['rocketeer', 380, 470, 1]])
        w.arkSpawn(k, x, z, { count: c, radius: 12 });
      // ---- condition bosses: arenas at the reference Queen / Matriarch icons (spawnBoss picks a bossPoi), escorts gated by condition
      w.paintCircle('dirt', 411, 286, 24, 0.35, 5); w.paintCircle('mud', 411, 286, 9, 0.5, 6);
      for (const [x, z, k, r] of [[396, 272, 'husk', 0.4], [428, 300, 'gg_strut', 1.2], [420, 268, 'debris', 0], [398, 302, 'gg_hullplate', 2.2], [434, 282, 'debris', 1]]) w.prop(k, x, z, r, { solid: true });
      w.poi('harvester_site', 'Harvester Clearing', 411, 286, 0.5, { tier: 3, bossPoi: ['queene'], hideLabel: true });
      w.arkSpawn('hornet', 411, 286, { count: 2, condition: 'harvester', patrol: [[380, 260], [445, 262], [445, 312], [380, 312]] });
      w.arkSpawn('rocketeer', 420, 300, { count: 1, condition: 'harvester', patrol: [[370, 250], [460, 280], [400, 330]] });
      w.arkSpawn('wasp', 400, 270, { count: 3, condition: 'harvester', patrol: [[390, 250], [440, 290], [390, 320]] });
      w.poi('matriarch_arena', 'Gate Yard', 636, 258, 0.5, { tier: 3, bossPoi: ['matriark'], hideLabel: true });
      w.arkSpawn('wasp', ...cp(40, -20), { count: 3, condition: 'matriarch', patrol: [cp(10, -40), cp(70, -40), cp(70, 40), cp(10, 40)] });
      w.arkSpawn('hornet', ...cp(-40, 0), { count: 2, condition: 'matriarch', patrol: [cp(-80, -30), cp(-10, -30), cp(-10, 30), cp(-80, 30)] });
      // ---- Locked Gate: the emergency shutdown brings a Bastian into the yard; printers hold the four codes
      w.arkSpawn('bastion', ...cp(28, 0), { count: 1, radius: 10, condition: 'locked_gate' });
      w.prop('gg_printer', 310, 197, 0.3, { solid: true }); w.container('electronics', 310, 198.4, 0.3, { tier: 2, poi: 'raiders_refuge', note: 'security_code_printer' });
      w.prop('gg_printer', 561, 156, 0, { solid: true }); w.container('electronics', 561, 157.4, 0, { tier: 2, poi: 'reinforced_reception', note: 'security_code_printer' });
      // player insertion points (reference "player spawn" icons, pulled inside the boundary)
      for (const [x, z] of [[263, 32], [377, 27], [402, 124], [500, 125], [222, 105], [558, 68], [694, 58], [810, 50], [955, 245], [126, 262], [294, 306], [315, 387], [152, 430],
        [230, 541], [279, 540], [300, 579], [417, 602], [747, 602], [906, 587], [919, 368], [548, 800]]) w.spawnPoint(x, z);
      // loot tier zones for the open map
      w.zone('Outskirts', PLAY, { tier: 1 });
      w.zone('Raider’s Refuge', [[284, 188], [324, 188], [324, 224], [284, 224]], { tier: 1 });
      w.zone("Trapper's Glade", [[244, 270], [318, 270], [318, 322], [244, 322]], { tier: 1 });
    }

    // ======================================================================== 15. CUTTINGS + LEVEL FIX-UPS
    // re-cut every opening onto sunk ground after all building flattens (tunnel mouths, hall junctions, yard, pit)
    for (const [pts, h] of cuts) { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); } w.flattens.push({ x0: a, z0: b, x1: c, z1: d, poly: pts, h, blend: 0 }); }
    // outdoor ARK groups whose anchor lies over an underground hall spawn on the surface (the lid), not in the tunnel
    const inHall = (x, z) => underHalls.some(o => { const [lx, lz] = localOf(o, x, z); return lx > 0 && lz > 0 && lx < o.w && lz < o.d; });
    for (const s of w.arkSpawns) if (!s.habitat && s.y == null && s.yAbs == null && inHall(s.x, s.z)) s.surface = true;
  },
};
