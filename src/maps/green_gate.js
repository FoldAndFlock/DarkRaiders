// Green Gate — patterned after ARC Raiders' "The Blue Gate" (1100 x 825 m, north up).
// Layout traced from docs/ref/blue_gate_*.jpg (see docs/research/map_green_gate.md for the mapping,
// POI list, tunnel approach and deviations). A forested mountain valley: the highway climbs in from
// the collapsed bridges in the south-west, crosses the Checkpoint and ends at the colossal Outer
// Gates, behind which the Traffic Tunnel network is cut into the upper bench (cut-and-cover
// corridors whose roofs fade when entered). Everything is deterministic (seeded rng only).
import './props_green_gate.js';
import { pointInPoly, mulberry } from '../engine/world.js';

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
const BENCH_Y = 9.5, TUN_Y = 6.5;
const BENCH = [[508, 50], [600, 42], [700, 48], [790, 52], [858, 60], [862, 120], [858, 178], [850, 232], [868, 300], [845, 332], [800, 366], [760, 380], [700, 380],
  [684, 358], [640, 357], [626, 347], [558, 279], [530, 268], [500, 252], [484, 232], [478, 205], [486, 178], [498, 150], [500, 110], [505, 72]];
const PEAK_Y = 21;
const PEAK = [[868, 72], [930, 62], [984, 70], [994, 120], [978, 176], [920, 182], [874, 174], [864, 122]];
// gate frame: centre GC, NV = NE (toward the tunnels), UV = SE (along the gate)
const GC = [592, 313], NV = [R2, -R2], UV = [R2, R2];
const cp = (a, b) => [GC[0] + NV[0] * a + UV[0] * b, GC[1] + NV[1] * a + UV[1] * b];
const CHK_POLY = [cp(-8, -46), cp(-8, 46), cp(-160, 48), cp(-238, 40), cp(-238, -38), cp(-160, -48)];
const PLAZA = [cp(-10, -47), cp(-10, 47), cp(-152, 47), cp(-152, -47)];
const YARD = [[560, 277], [598, 240], [652, 240], [652, 304], [642, 322], [628, 345]];
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
const R_BENCH = [[545, 175], [576, 176.5], [600, 177], [620, 176]];
const R_PEAK = [[760, 164], [800, 170], [835, 186], [850, 190]];
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
    w.raisePoly(LAKE_NE, 1.0, 8, 'set'); w.waterPoly(LAKE_NE.map(([x, z]) => [x + (x - 1027) * 0.12, z + (z - 64) * 0.12]), { level: 3.4 });
    w.raisePoly(LAKE_SW, -2.2, 10, 'set'); w.waterPoly([[0, 680], [50, 678], [90, 700], [106, 736], [96, 778], [56, 802], [0, 804]], { level: 0.3 });
    w.raisePoly(GORGE, -1.4, 5, 'set'); w.waterPoly([[0, 606], [86, 606], [92, 650], [88, 694], [0, 694]], { level: 0.3 });
    w.raisePoly(POND, 0.2, 6, 'set'); w.waterPoly(POND.map(([x, z]) => [x + (x - 117) * 0.15, z + (z - 399) * 0.15]), { level: 1.4 });
    // local hills
    w.raiseCircle(612, 716, 50, 6.5, 0.75, 'add');          // Ancient Fort hill
    w.raiseCircle(678, 488, 24, 4.5, 0.55, 'add');          // Overlook knoll
    w.ridge([[905, 330], [902, 380], [897, 430], [903, 480], [916, 525]], 12, 17.5, 9, 'max');   // the Ridgeline crest
    w.ridge([[930, 560], [952, 620], [940, 680]], 18, 16, 14, 'max');
    for (const [cx, cz, r, h] of [[668, 562, 7, -2.4], [652, 580, 6, -2.2], [690, 548, 8, -2.6], [636, 596, 5, -1.8], [706, 534, 6, -2.0], [622, 612, 5, -1.6]]) w.raiseCircle(cx, cz, r, h, 0.6, 'add');  // Broken Earth craters

    // reserve POI footprints + roads before scattering outcrops
    const RES = [[235, 18, 378, 108], [378, 50, 530, 162], [520, 128, 632, 292], [548, 84, 706, 352], [640, 58, 800, 160], [630, 150, 800, 402], [836, 54, 1000, 236],
      [880, 262, 975, 372], [612, 466, 704, 540], [628, 540, 720, 612], [398, 540, 585, 672], [566, 676, 662, 762], [236, 268, 320, 322], [282, 186, 324, 224], [138, 132, 198, 188],
      [90, 250, 280, 500], [255, 560, 345, 615], [885, 400, 925, 460], [0, 588, 262, 672]];
    for (const r of RES) mark(...r, 4);
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
      w.raiseRect(252, 595, 272, 632, 8, 0.6, 'set');                    // span junction
      const C = resample([cp(-209, 0), cp(-40, 0), cp(-16, 0), cp(2, 0), cp(8, 0)], 5);
      levelPath(C, C.map(([x, z]) => { const a = (x - GC[0]) * NV[0] + (z - GC[1]) * NV[1]; return a < -40 ? 3.6 : a < 4 ? 3.6 + (TUN_Y - 3.6) * ss(-40, 4, a) : TUN_Y; }), 17, 2);
    }
    // the yard behind the gate (sunk into the bench), then tunnel ramps later
    w.raisePoly(YARD, TUN_Y, 0, 'set');
    w.road(resample(HWY_W, 5), 12, 'concrete', { edge: 'gravel', edgeW: 0.8, level: false });
    w.road(resample([cp(-212, 0), cp(4, 0), [606, 290], [626, 262], [637, 240]], 5), 15, 'concrete', { edge: 'gravel', edgeW: 1, level: false });
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
    const bldg = (o) => {
      const def = { storeys: 1, wall: 'plaster', floor: 'tiles', roof: 'roofTar', thick: 0.3, ...o };
      const b = w.building(def);
      mark(o.x - 1.5, o.z - 1.5, o.x + o.w + 1.5, o.z + o.d + 1.5, 2 | 4);
      return b;
    };
    // door gap world centres (for keeping furniture out of the way)
    const gapsOf = (o) => {
      const g = [];
      for (const d of o.doors || []) {
        const c = d.at + d.w / 2;
        if (d.side === 'n') g.push([o.x + c, o.z, d.w]); else if (d.side === 's') g.push([o.x + c, o.z + o.d, d.w]);
        else if (d.side === 'w') g.push([o.x, o.z + c, d.w]); else g.push([o.x + o.w, o.z + c, d.w]);
      }
      for (const iw of o.inner || []) { const [x0, z0, , z1, gs = []] = iw; const hz = Math.abs(z0 - z1) < 1e-6; for (const gg of gs) g.push(hz ? [o.x + x0 + gg.at + gg.w / 2, o.z + z0, gg.w] : [o.x + x0, o.z + z0 + gg.at + gg.w / 2, gg.w]); }
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
    const furnish = (o, kind, opts = {}) => {
      const { x, z } = o, ww = o.w, dd = o.d, gaps = gapsOf(o);
      const walls = (o.inner || []).map(([x0, z0, x1, z1]) => [x + x0, z + z0, x + x1, z + z1]);
      const slots = [], m = 0.72, step = opts.step ?? 2.0;
      for (let s = 1.3; s < ww - 1.1; s += step) { slots.push([x + s, z + m, 0]); slots.push([x + s, z + dd - m, PI]); }
      for (let s = 1.3; s < dd - 1.1; s += step) { slots.push([x + m, z + s, PI / 2]); slots.push([x + ww - m, z + s, -PI / 2]); }
      for (const iw of walls) {   // both faces of interior walls too
        const hz = Math.abs(iw[1] - iw[3]) < 1e-6, L = hz ? iw[2] - iw[0] : iw[3] - iw[1];
        for (let s = 1.2; s < L - 1; s += step) {
          if (hz) { slots.push([iw[0] + s, iw[1] - m, PI]); slots.push([iw[0] + s, iw[1] + m, 0]); }
          else { slots.push([iw[0] - m, iw[1] + s, -PI / 2]); slots.push([iw[0] + m, iw[1] + s, PI / 2]); }
        }
      }
      const ok = ([sx, sz]) => gaps.every(([gx, gz, gw]) => Math.hypot(sx - gx, sz - gz) > gw / 2 + 1.25) && walls.every(([a, b, c, d]) => segDist(sx, sz, a, b, c, d) > 0.55 || (Math.abs(a - c) < 1e-6 ? Math.abs(sx - a) > 0.5 : Math.abs(sz - b) > 0.5));
      const good = slots.filter(ok);
      const fl = FURN[kind] || FURN.home, cl = CONT[opts.cont || kind] || CONT.home;
      const nCont = opts.cont0 ?? Math.max(1, Math.round(ww * dd / (opts.density ?? 28)));
      let placedC = 0;
      // shuffle
      for (let i = good.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [good[i], good[j]] = [good[j], good[i]]; }
      const used = [];
      for (const [sx, sz, rot] of good) {
        if (used.some(([ux, uz]) => Math.hypot(ux - sx, uz - sz) < 1.7)) continue;
        if (placedC < nCont) {
          w.container(pick(cl), sx, sz, rot, { tier: opts.tier ?? 1, room: opts.room || null, poi: opts.poi || null });
          placedC++; used.push([sx, sz]);
          continue;
        }
        if (rng() < (opts.fill ?? 0.8)) {
          const k = pick(fl), off = (FOOT[k] || 0.6) - 0.6;   // deep items sit further from the wall
          w.prop(k, sx + Math.sin(rot) * off, sz + Math.cos(rot) * off, rot, { solid: true });
          used.push([sx, sz]);
        }
      }
      // free-standing centre pieces in bigger rooms (tables, crates, workbenches)
      if (ww >= 9 && dd >= 8 && opts.centre !== false) {
        const ck = { home: 'gg_table', office: 'gg_desk', barracks: 'gg_table', security: 'gg_table', industrial: 'workbench', lab: 'gg_console', shed: 'gg_crates', camp: 'gg_crates', ruin: 'debris', church: 'gg_altar' }[kind] || 'gg_table';
        const cells = [[x + ww * 0.3, z + dd * 0.5], [x + ww * 0.78, z + dd * 0.45]];
        for (const [cx, cz] of cells) if (gaps.every(([gx, gz, gw]) => Math.hypot(cx - gx, cz - gz) > gw / 2 + 1.6) && walls.every(([a, b, c, d]) => segDist(cx, cz, a, b, c, d) > 1.4)) { w.prop(ck, cx, cz, rng() < 0.5 ? 0 : PI / 2, { solid: true }); if (kind === 'home' || kind === 'barracks') { w.prop('gg_chair', cx + 1.1, cz, -PI / 2, {}); w.prop('gg_chair', cx - 1.1, cz, PI / 2, {}); } }
      }
      if (opts.light !== false && ww * dd > 30) w.lamp(x + ww / 2, z + dd / 2, { y: Math.min(3.0, (o.h || 3.2) - 0.3), model: null, color: opts.lightColor ?? 0xffd8a0, intensity: opts.lightI ?? 1.7, range: Math.min(12, Math.max(ww, dd) * 0.8 + 3), flicker: opts.flicker ?? 0 });
    };
    // building + furniture in one go
    const house = (o, kind = 'home', fo = {}) => { const b = bldg(o); furnish(o, kind, fo); return b; };
    // simple door/window generators
    const winRow = (side, len, from = 1.5, every = 3.2, w0 = 1.4) => { const out = []; for (let s = from; s + w0 < len - 0.8; s += every) out.push({ side, at: s, w: w0, sill: 1.0 }); return out; };
    // invisible collider band along a diagonal (props are rotated, collision grid is axis-aligned)
    const diagCollide = (ax, az, bx, bz, half, h, step = 1) => {
      const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(L / step));
      for (let i = 0; i <= n; i++) { const t = i / n; w.prop('gg_col', ax + (bx - ax) * t, az + (bz - az) * t, 0, { y: -0.5, solid: [half, half, h + 0.5] }); }
    };
    const vehicle = (kind, x, z, rot) => { w.prop(kind, x, z, rot, { solid: true }); mark(x - 3, z - 3, x + 3, z + 3, 2); };
    // scatter POI-flavoured clutter in a radius, never on roads / inside buildings
    const clutter = (cx, cz, r, kinds, n, o = {}) => { let k = 0, t = 0; while (k < n && t++ < n * 12) { const a = rng() * PI * 2, d = Math.sqrt(rng()) * r, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d; if (!free(x, z, o.m ?? 1.4, o.mask ?? 3) || !inPlay(x, z)) continue; w.prop(pick(kinds), x, z, rng() * PI * 2, { solid: o.solid ?? true, scale: R(o.s0 ?? 0.85, o.s1 ?? 1.15) }); mark(x - 0.8, z - 0.8, x + 0.8, z + 0.8, 2); k++; } };
    const paintPolyN = (tex, pts, edge = 8, sc = 9) => { const id = tex; let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (const [x, z] of pts) { a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x); d = Math.max(d, z); }
      for (let z = Math.max(0, Math.floor(b)); z < Math.min(H, d); z++) for (let x = Math.max(0, Math.floor(a)); x < Math.min(W, c); x++) { const px = x + 0.5, pz = z + 0.5; if (!pointInPoly(px, pz, pts)) continue; if (polyEdgeDist(pts, px, pz) < N2(px, pz, sc) * edge * 1.6) continue; if (occ(px, pz) & 3) continue; w.paint(id, x, z, x + 1, z + 1); } };
    // static ARK (Sentinels / turrets): the sim spawns them on the terrain at (x,z) and ignores perch
    // heights, so they're placed on open ground at the foot of their perch; `perch`/`y` (metres above
    // ground) are kept as metadata for when the engine supports elevated emplacements.
    const perched = (kind, x, z, perch, y, o = {}) => w.arkSpawn(kind, x, z, { count: 1, radius: 0, perch, y, ...o });
    const watchtower = (x, z, scale = 1, arkKind = null) => {
      w.prop('gg_watchtower', x, z, 0, { scale });
      for (const [dx, dz] of [[-1.55, -1.55], [1.55, -1.55], [-1.55, 1.55], [1.55, 1.55]]) w.prop('gg_col', x + dx * scale, z + dz * scale, 0, { y: -0.5, solid: [0.25, 0.25, 9 * scale] });
      mark(x - 3, z - 3, x + 3, z + 3, 2);
      if (arkKind) perched(arkKind, x, z, 'watchtower', 8.5 * scale);
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
      for (const t of [-3.2, 3.2]) { diagCollide(...at(-50, t), ...at(-7, t), 2.3, 15, 0.9); diagCollide(...at(7, t), ...at(50, t), 2.3, 15, 0.9); }
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
      perched('sentinel', ...at(12, -9), 'gate_pylon', 32); perched('sentinel', ...at(-44, -9), 'gate_pylon', 32);
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
      for (const [list, bb] of [[CK, -41], [CK2, 41]]) for (const [aa, kind, name, tier, cont] of list) {
        const [cx, cz] = cp(aa, bb), ww = 18, dd = 12, x = Math.round(cx - ww / 2), z = Math.round(cz - dd / 2);
        // NW wing: lanes lie to the south-east -> doors on s/e ; SE wing: lanes to the north-west -> doors on n/w
        const fs = bb < 0 ? 's' : 'n', fe = bb < 0 ? 'e' : 'w', bs = bb < 0 ? 'n' : 's';
        const doors = [{ side: fs, at: 3, w: 1.8 }, { side: fe, at: 5, w: 1.8 }, { side: bs, at: 13, w: 1.6 }, ...winRow(fs, ww, 7, 3.4, 1.6), ...winRow(fe, dd, 1.2, 3, 1.4).filter(d => d.at > 7.5 || d.at + d.w < 4.6)];
        const o = { x, z, w: ww, d: dd, storeys: kind === 'industrial' ? 1 : 2, h: kind === 'industrial' ? 4.4 : 6.2, wall: kind === 'industrial' ? 'corrugated' : 'concrete', floor: kind === 'industrial' ? 'concrete' : 'tiles',
          roof: 'roofTar', tint: kind === 'industrial' ? 0xb8c8c0 : 0xd8dcd0, name, doors: doors.filter((d, i, arr) => !arr.some((e, j) => j < i && e.side === d.side && d.at < e.at + e.w + 0.4 && e.at < d.at + d.w + 0.4)),
          inner: [[10, 0, 10, dd, [{ at: 5, w: 1.6 }]], [0, 6, 10, 6, [{ at: 4, w: 1.6 }]]], roofExtras: [[2, 2, 5, 4, 0.9], [12, 7, 16, 10, 0.7]] };
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
      for (const [a, b] of [[-158, -50], [-158, 50], [-20, -56], [-20, 56]]) watchtower(...cp(a, b), 1, 'turret');
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
      watchtower(414, 347, 1, 'sentinel');
      w.zone('Checkpoint', CHK_POLY, { tier: 2 });
      w.poi('checkpoint', 'Checkpoint', ...cp(-100, 0), 80, { tier: 2, aliases: ['checkpoint'] });
    }

    // ======================================================================== 6. UPPER BENCH: tunnels, Headhouse, Reception, Warehouse
    const TUN = { wall: 'damConcrete', floor: 'concrete', roof: 'moss', thick: 0.6, h: BENCH_Y - TUN_Y + 0.5, blend: 0, floorY: TUN_Y, peek: 0.9, facade: false, parapet: false, vents: 0, tint: 0xc8c8c0 };
    // soil-covered cut-and-cover roof with ventilation grates every ~20 m
    const grates = (len, along = 'z', wdt = 18) => { const out = []; for (let s = 8; s < len - 4; s += 20) { const e = along === 'z' ? [wdt / 2 - 1.5, s, wdt / 2 + 1.5, s + 2.2, 0.5] : [s, wdt / 2 - 1.5, s + 2.2, wdt / 2 + 1.5, 0.5]; e.tex = 'metalPanel'; out.push(e); } return out; };
    const full = (side, len) => ({ side, at: 0.6, w: len - 1.2, lintel: false });
    {
      // Traffic Tunnel main corridor (yard -> north cave-in), 22 m wide
      const T1 = { ...TUN, x: 626, z: 92, w: 22, d: 148, name: 'Traffic Tunnel', roofExtras: grates(148, 'z', 22),
        doors: [full('s', 22), { side: 'e', at: 30.6, w: 16.8, lintel: false }, { side: 'e', at: 92.6, w: 10.8, lintel: false }, { side: 'w', at: 90.6, w: 16.8, lintel: false }],
        inner: [[10.6, 20, 10.6, 30, []], [10.6, 50, 10.6, 62, []], [10.6, 104, 10.6, 116, []]] };
      bldg(T1);
      for (let z = 100; z < 236; z += 15) tunnelLamp(637, z, 3.6);
      w.paint('asphalt', 628, 92, 646, 240);
      for (let z = 108; z < 236; z += 6) w.prop('gg_laney', 637, z, PI / 2, { y: 0.03 });
      for (let z = 110; z < 236; z += 9) { w.prop('gg_lane', 631.5, z, PI / 2, { y: 0.03 }); w.prop('gg_lane', 642.5, z, PI / 2, { y: 0.03 }); }
      w.prop('gg_rubble', 637, 98, 0.2, { solid: true }); w.prop('gg_rubble', 631, 104, 2.1, { solid: true }); w.prop('gg_rubble', 643, 101, 4.0, { solid: true });
      for (const [x, z, r, k] of [[632, 130, PI, 'gg_truck'], [642, 160, 0.1, 'car'], [631, 176, PI + 0.2, 'gg_van'], [643, 214, 0.05, 'gg_bus'], [630, 222, PI, 'car']]) vehicle(k, x, z, r);
      // the armoured patrol car (key room 'patrol_car')
      vehicle('gg_patrolcar', 641, 140, 0.15);
      w.keyRoom('patrol_car', 638, 135, 645, 146, null, { name: 'Armoured Patrol Car', poi: 'traffic_tunnel' });
      w.container('car_trunk', 641, 137.2, PI, { tier: 3, room: 'patrol_car', locked: 'patrol_car', poi: 'traffic_tunnel' });
      for (const [x, z, k] of [[629, 150, 'toolbox'], [645, 186, 'crate'], [629, 200, 'arc_crate'], [645, 232, 'toolbox'], [629, 118, 'raider_cache'], [646, 112, 'ammo_box'], [630, 168, 'trash'], [644, 126, 'electronics']])
        w.container(k, x, z, 0, { tier: 2, poi: 'traffic_tunnel' });
      for (const [x, z] of [[631, 140], [645, 196], [631, 228], [645, 168]]) w.prop('gg_barrier', x, z, PI / 2, { solid: true });
      perched('sentinel', 637, 125, 'tunnel_ceiling', 3.5, { habitat: 'indoor' });
      w.arkSpawn('turret', 637, 108, { habitat: 'indoor' });
      w.arkSpawn('tick', 637, 190, { count: 3, habitat: 'indoor' });
      w.arkSpawn('pop', 637, 155, { count: 2, habitat: 'indoor' });
      w.arkSpawn('shredder', 637, 210, { habitat: 'indoor', patrol: [[637, 232], [637, 120]] });
      w.poi('traffic_tunnel', 'Traffic Tunnel', 637, 165, 40, { tier: 3, aliases: ['traffic_tunnel'], underground: true });

      // NE branch -> Data Vault
      bldg({ ...TUN, x: 648, z: 122, w: 94, d: 18, name: 'Vault Passage', roofExtras: grates(94, 'x', 18), doors: [full('w', 18), full('e', 18)], inner: [[30, 0, 30, 6, []], [30, 12, 30, 18, []], [62, 0, 62, 6, []], [62, 12, 62, 18, []]] });
      w.paint('concrete', 648, 122, 742, 140);
      for (let x = 660; x < 740; x += 16) tunnelLamp(x, 131);
      for (const [x, z, k] of [[652, 124, 'toolbox'], [676, 138, 'crate'], [700, 124, 'electronics'], [724, 138, 'locker']]) w.container(k, x, z, 0, { tier: 2, poi: 'traffic_tunnel' });
      w.prop('gg_pipes', 690, 123.6, 0, { solid: true }); w.prop('gg_pipes', 716, 138.4, PI, { solid: true });
      w.arkSpawn('tick', 700, 131, { count: 2, habitat: 'indoor' });
      // Data Vault: sunk vault hall with server rows + strongroom; surface stair on the east
      const DV = { ...TUN, x: 742, z: 112, w: 30, d: 38, h: 4.4, name: 'Data Vault', wall: 'concrete', floor: 'metalPanel', roof: 'metalPanel',
        doors: [{ side: 'w', at: 10.6, w: 16.8, lintel: false }, { side: 'e', at: 13, w: 3 }, { side: 's', at: 14.6, w: 12.8, lintel: false }],
        inner: [[0, 8, 18, 8, [{ at: 8, w: 2 }]], [18, 0, 18, 8, []], [10, 30, 30, 30, [{ at: 6, w: 2, door: true }]], [10, 30, 10, 38, []]] };
      bldg(DV);
      for (let row = 0; row < 3; row++) for (let i = 0; i < 4; i++) w.prop('gg_server', 752 + i * 4.2, 116 + row * 5 + (row ? 7 : 0), 0, { solid: true });
      w.prop('gg_console', 762, 135.5, PI, { solid: true }); w.prop('gg_console', 768, 135.5, PI, { solid: true });
      for (const [x, z, k] of [[745, 114, 'electronics'], [758, 114.5, 'electronics'], [769, 120, 'desk'], [746, 126, 'electronics'], [770, 128, 'electronics']]) w.container(k, x, z, 0, { tier: 2, poi: 'data_vault' });
      for (const [x, z, k] of [[754, 145, 'safe'], [762, 147, 'electronics'], [768, 145, 'security_locker']]) w.container(k, x, z, 0, { tier: 3, poi: 'data_vault' });
      w.lamp(756, 125, { y: 3.8, model: null, color: 0x80c8ff, intensity: 1.1, range: 12 }); w.lamp(764, 145, { y: 3.6, model: null, color: 0x80c8ff, intensity: 0.9, range: 8 });
      w.ramp(772.4, 124.5, 792, 128.5, TUN_Y, BENCH_Y, 'x'); w.paint('concrete', 772, 124, 792, 129);
      w.arkSpawn('surveyor', 790, 140, { count: 1, patrol: [[790, 140], [820, 100], [760, 80], [740, 170]] });
      w.poi('data_vault', 'Data Vault', 757, 130, 26, { tier: 3, aliases: ['data_vault'] });

      // Security Wing (W branch) + Confiscation Room; south leg exits through the cliff onto the Checkpoint
      const SW1 = { ...TUN, x: 546, z: 182, w: 80, d: 18, name: 'Security Wing', roofExtras: grates(80, 'x', 18),
        doors: [full('e', 18), { side: 'w', at: 0.6, w: 16.8, lintel: false }, { side: 'n', at: 32, w: 6, lintel: false }],
        inner: [[14, 0, 14, 10, [{ at: 4, w: 2, door: true, locked: 'confiscation_room' }]], [0, 10, 14, 10, []],
          [20, 0, 20, 6, []], [26, 0, 26, 6, []], [32, 0, 32, 6, []], [38, 0, 38, 6, []], [14, 6, 38, 6, [{ at: 2, w: 1.6, door: true }, { at: 8, w: 1.6, door: true }, { at: 14, w: 1.6, door: true }, { at: 20, w: 1.6, door: true }]],
          [46, 10, 58, 10, [{ at: 4, w: 2 }]], [46, 10, 46, 18, []], [58, 10, 58, 18, []]] };
      bldg(SW1);
      w.keyRoom('confiscation_room', 546, 182, 560, 192, null, { name: 'Confiscation Room', poi: 'security_wing' });
      for (const [x, z, k] of [[548, 184, 'weapon_case'], [552, 184, 'safe'], [557, 184, 'security_locker'], [548, 190, 'weapon_case'], [558, 189.5, 'ammo_box'], [553, 190.5, 'electronics']]) w.container(k, x, z, 0, { tier: 3, room: 'confiscation_room', poi: 'security_wing' });
      w.prop('shelf', 553, 182.9, 0, { solid: true }); w.lamp(553, 187, { y: 3.4, model: null, color: 0xffe0a0, intensity: 0.9, range: 7 });
      for (const cx of [563, 569, 575, 581]) { w.prop('gg_bunk', cx, 184.6, PI / 2, { solid: true }); w.container(pick(['backpack', 'trash', 'suitcase']), cx + 1.4, 185.5, 0, { tier: 2, poi: 'security_wing' }); }
      for (const [x, z, k] of [[594, 197, 'security_locker'], [601, 197, 'desk'], [598, 193.5, 'locker'], [610, 186, 'weapon_case'], [620, 198, 'ammo_box'], [570, 197, 'locker']]) w.container(k, x, z, 0, { tier: 2, poi: 'security_wing' });
      w.prop('gg_desk', 598, 197.6, PI, { solid: true }); w.prop('gg_lockers', 603, 192.9, 0, { solid: true }); w.prop('gg_console', 594, 192.9, 0, { solid: true });
      for (let x = 566; x < 626; x += 15) tunnelLamp(x, 196);
      w.paint('metalPanel', 546, 182, 626, 200);
      const SW2 = { ...TUN, x: 530, z: 182, w: 16, d: 90, name: 'Security Wing South', roofExtras: grates(90, 'z', 16), doors: [{ side: 'e', at: 0.6, w: 16.8, lintel: false }, { side: 's', at: 2.6, w: 10.8, lintel: false }],
        inner: [[0, 40, 6, 40, []], [10, 40, 16, 40, []], [0, 64, 5, 64, []], [11, 64, 16, 64, []]] };
      bldg(SW2);
      for (let z = 196; z < 270; z += 16) tunnelLamp(538, z);
      w.ramp(530.5, 272.4, 545.5, 288, TUN_Y, 3.8, 'z'); w.paint('concrete', 530, 272, 546, 288);
      w.prop('gg_portal', 538, 273.5, 0, {});
      for (const [x, z, k] of [[532, 220, 'locker'], [544, 236, 'ammo_box'], [532, 254, 'crate'], [544, 266, 'medical_bag']]) w.container(k, x, z, 0, { tier: 2, poi: 'security_wing' });
      w.arkSpawn('tick', 538, 230, { count: 2, habitat: 'indoor' }); w.arkSpawn('pop', 590, 191, { count: 2, habitat: 'indoor' });
      w.arkSpawn('turret', 612, 191, { habitat: 'indoor' });
      w.poi('security_wing', 'Security Wing', 580, 191, 26, { tier: 3, aliases: ['security_wing'], underground: true });

      // Reinforced Reception (surface): blast-walled reception hall with the security desk
      const RR = { x: 540, z: 138, w: 52, d: 32, storeys: 2, h: 6.4, wall: 'concrete', floor: 'tiles', roof: 'roofTar', tint: 0xc8ccc4, name: 'Reinforced Reception',
        doors: [{ side: 's', at: 37, w: 6 }, { side: 'w', at: 13, w: 2.4 }, { side: 'n', at: 10, w: 2 }, ...winRow('s', 30, 2, 4), ...winRow('e', 32, 2, 4.5)],
        inner: [[20, 0, 20, 32, [{ at: 6, w: 2 }, { at: 22, w: 2.4 }]], [20, 14, 52, 14, [{ at: 8, w: 2 }, { at: 22, w: 2.4 }]], [0, 12, 20, 12, [{ at: 9, w: 2 }]], [36, 0, 36, 14, [{ at: 5, w: 2 }]], [0, 22, 10, 22, [{ at: 4, w: 2 }]]],
        roofExtras: [[6, 6, 14, 14, 1.4], [30, 20, 46, 26, 0.8]] };
      house(RR, 'security', { tier: 2, poi: 'reinforced_reception', density: 70 });
      w.prop('gg_desk', 566, 150, PI, { solid: true }); w.prop('gg_desk', 570, 150, PI, { solid: true }); w.prop('gg_console', 568, 146.5, 0, { solid: true });
      w.container('security_locker', 562, 146, 0, { tier: 3, poi: 'reinforced_reception' });
      for (const [x, z] of [[548, 176], [596, 174], [536, 150], [596, 150]]) { w.prop('sandbag', x, z, x > 590 ? PI / 2 : 0, { solid: true }); }
      w.block(536, 173, 576, 174.2, 2.2, 'damConcrete', {}); w.block(586, 173, 600, 174.2, 2.2, 'damConcrete', {});     // blast walls
      w.ramp(578.5, 172.6, 583.5, 181.6, BENCH_Y, TUN_Y, 'z');
      lightPost(534, 172); lightPost(600, 166); lightPost(596, 136);
      perched('sentinel', 492, 192, 'cliff_edge', 0);
      w.arkSpawn('wasp', 570, 160, { count: 2, patrol: [[540, 128], [610, 128], [610, 178], [540, 178]] });
      w.arkSpawn('hornet', 520, 200, { count: 1, patrol: [[500, 170], [560, 230], [620, 175]] });
      w.zone('Reinforced Reception', [[530, 128], [630, 128], [630, 205], [530, 205]], { tier: 3 });
      w.poi('reinforced_reception', 'Reinforced Reception', 566, 156, 34, { tier: 3, aliases: ['reinforced_reception'] });

      // Headhouse: round concrete drum around the sunk ventilation hall (striped grille roof)
      const HC = [676, 190], HR = 26;
      const grille = []; for (let i = 0; i < 12; i++) { const e = [1.5 + i * 2.9, 1.2, 2.6 + i * 2.9, 34.8, 0.32]; e.tex = 'roofTar'; grille.push(e); }
      const hub = [15, 15, 21, 21, 0.9]; hub.tex = 'metalPanel'; grille.push(hub);
      const HH = { ...TUN, x: 658, z: 172, w: 36, d: 36, h: 6.0, name: 'Headhouse', wall: 'damConcrete', roof: 'metalPanel', roofExtras: grille, peek: 0.8,
        doors: [{ side: 'w', at: 12.6, w: 10.8, lintel: false }, { side: 's', at: 12.6, w: 10.8, lintel: false }], inner: [[8, 8, 8, 28, [{ at: 8, w: 4 }]], [28, 8, 28, 28, [{ at: 8, w: 4 }]]] };
      bldg(HH);
      bldg({ ...TUN, x: 648, z: 184, w: 10, d: 12, name: 'Headhouse Connector', doors: [full('w', 12), full('e', 12)] });
      const skip = (x, z) => (x > 657.4 && x < 694.6 && z > 171.4 && z < 208.6) || (x > 647.5 && x < 658.5 && z > 183.5 && z < 196.5) || (x > 669.4 && x < 682.6 && z > 200);
      for (let z = HC[1] - HR; z < HC[1] + HR; z++) {
        const hw = Math.sqrt(Math.max(0, HR * HR - (z + 0.5 - HC[1]) ** 2)); if (hw < 0.5) continue;
        let x0 = Math.round(HC[0] - hw), x1 = Math.round(HC[0] + hw), cur = null;
        for (let x = x0; x <= x1; x++) { const s = x < x1 && !skip(x + 0.5, z + 0.5); if (s && cur == null) cur = x; if ((!s || x === x1) && cur != null) { w.block(cur, z, x, z + 1, 3.35, 'damConcrete', { y0: BENCH_Y - 0.1, seed: 4 }); cur = null; } }
      }
      for (const [a, b, c, d] of [[657.3, 171.3, 694.7, 171.8], [657.3, 208.2, 669.4, 208.7], [682.6, 208.2, 694.7, 208.7], [657.3, 171.3, 657.8, 184], [657.3, 196, 657.8, 208.7], [694.2, 171.3, 694.7, 208.7]])
        w.block(a, b, c, d, 0.9, 'rust', { y0: BENCH_Y + 3.25, xray: false });
      for (let k = 0; k < 8; k++) w.block(690, 216.5 - (k + 1) * 0.72, 693, 216.5 - k * 0.72, 0.42 * (k + 1), 'damConcrete', { y0: BENCH_Y - 0.1 });
      w.ramp(669.6, 208.6, 682.4, 226, TUN_Y, BENCH_Y, 'z'); w.paint('concrete', 669, 208, 683, 226);
      for (const [x, z] of [[664, 178], [688, 178], [664, 202], [688, 202]]) w.prop('gg_fan', x, z, (x < 676 ? PI / 2 : -PI / 2), { solid: true });
      w.prop('gg_pipes', 676, 174, 0, { solid: true }); w.prop('gg_generator', 676, 198, 0, { solid: true }); w.prop('gg_transformer', 670, 190, PI / 2, { solid: true });
      for (const [x, z, k] of [[661, 190, 'toolbox'], [691, 190, 'toolbox'], [676, 182, 'arc_crate'], [668, 205, 'crate'], [684, 175, 'electronics'], [684, 205, 'toolbox']]) w.container(k, x, z, 0, { tier: 2, poi: 'headhouse' });
      w.container('raider_cache', 676, 190, 0, { tier: 3, poi: 'headhouse' });
      w.lamp(676, 190, { y: 5, model: null, color: 0xc8e0ff, intensity: 1.3, range: 16 });
      w.lamp(676, 190, { y: 10.5, model: null, color: 0xff4030, intensity: 0.6, range: 8, flicker: 0.3 });
      perched('sentinel', 676, 228, 'headhouse_roof', 6);
      w.arkSpawn('pop', 676, 186, { count: 2, habitat: 'indoor' });
      w.poi('headhouse', 'Headhouse', 676, 190, 32, { tier: 2, aliases: ['headhouse'] });

      // Maintenance Wing: yard -> sunk Warehouse hangar -> north to the vault, south-east to the cliff portal
      bldg({ ...TUN, x: 652, z: 286, w: 60, d: 16, name: 'Maintenance Wing', roofExtras: grates(60, 'x', 16), doors: [full('w', 16), full('e', 16)], inner: [[20, 0, 20, 5, []], [20, 11, 20, 16, []], [40, 0, 40, 5, []], [40, 11, 40, 16, []]] });
      for (let x = 660; x < 712; x += 15) tunnelLamp(x, 294);
      w.prop('gg_pipes', 672, 287.6, 0, { solid: true }); w.prop('gg_pipes', 700, 300.4, PI, { solid: true });
      for (const [x, z, k] of [[656, 288, 'toolbox'], [684, 300, 'locker'], [708, 288, 'electronics']]) w.container(k, x, z, 0, { tier: 2, poi: 'maintenance_wing' });
      const WH = { ...TUN, x: 712, z: 256, w: 68, d: 66, h: 7.6, name: 'Warehouse', wall: 'corrugated', roof: 'corrugated', floor: 'concrete', tint: 0xb8c4bc, peek: 0.8,
        doors: [{ side: 'w', at: 30.6, w: 14.8, lintel: false }, { side: 'n', at: 28, w: 12 }, { side: 'n', at: 44.3, w: 13.4, lintel: false }, { side: 's', at: 56.3, w: 13.4, lintel: false }, { side: 'e', at: 28, w: 8 }],
        inner: [[0, 18, 16, 18, [{ at: 6, w: 2 }]], [16, 0, 16, 18, [{ at: 8, w: 2 }]], [0, 48, 16, 48, [{ at: 6, w: 2 }]], [16, 48, 16, 66, [{ at: 8, w: 2 }]], [52, 48, 52, 66, [{ at: 4, w: 2 }]], [52, 48, 56, 48, []]],
        roofExtras: [[10, 10, 24, 14, 1.2], [40, 30, 58, 34, 1.2], [20, 46, 30, 52, 0.8]] };
      bldg(WH);
      for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) w.prop('shelf', 724 + i * 4.2 + 6, 266 + r * 9 + 8, 0, { solid: true });
      for (const [x, z, k] of [[740, 300, 'gg_container'], [756, 302, 'gg_container2'], [768, 268, 'gg_crates'], [734, 312, 'gg_pallet'], [772, 300, 'gg_generator'], [746, 280, 'gg_pallet']]) w.prop(k, x, z, 0, { solid: true });
      for (let r = 0; r < 4; r++) for (let i = 0; i < 6; i++) { const x = 730 + i * 4.2, z = 274 + r * 9 + 4.2; if (rng() < 0.55) w.prop(pick(['gg_pallet', 'gg_crates', 'barrel', 'barrelBlue', 'crate']), x + R(-0.6, 0.6), z, rng() * 6, { solid: true }); }
      for (let i = 0; i < 16; i++) { const x = R(732, 776), z = R(262, 318); if (rng() < 0.5) w.container(pick(['crate', 'toolbox', 'crate', 'arc_crate', 'electronics']), x, z, 0, { tier: 2, poi: 'warehouse_complex' }); }
      furnish({ x: 712, z: 256, w: 16, d: 18, inner: [] , doors: [{ side: 'e', at: 8, w: 2 }, { side: 's', at: 6, w: 2 }] }, 'office', { tier: 2, poi: 'warehouse_complex', light: true, cont0: 3 });
      furnish({ x: 712, z: 304, w: 16, d: 18, inner: [], doors: [{ side: 'e', at: 8, w: 2 }, { side: 'n', at: 6, w: 2 }] }, 'industrial', { tier: 2, poi: 'warehouse_complex', cont0: 3 });
      for (const [x, z] of [[730, 270], [760, 270], [730, 300], [760, 300]]) w.lamp(x, z, { y: 6.8, model: null, color: 0xfff0d0, intensity: 1.2, range: 14 });
      w.ramp(740.6, 237, 751.4, 256.4, BENCH_Y, TUN_Y, 'z'); w.paint('concrete', 740, 237, 752, 256);
      w.ramp(780.4, 283.6, 797, 292.4, TUN_Y, BENCH_Y, 'x'); w.paint('concrete', 780, 283, 797, 293);
      bldg({ ...TUN, x: 756, z: 150, w: 14, d: 106, name: 'Maintenance Wing North', roofExtras: grates(106, 'z', 14), doors: [full('n', 14), full('s', 14)], inner: [[0, 40, 4, 40, []], [10, 40, 14, 40, []]] });
      for (let z = 160; z < 256; z += 16) tunnelLamp(763, z);
      for (const [x, z, k] of [[758, 170, 'toolbox'], [768, 210, 'electronics'], [758, 240, 'locker']]) w.container(k, x, z, 0, { tier: 2, poi: 'maintenance_wing' });
      bldg({ ...TUN, x: 768, z: 322, w: 14, d: 56, name: 'Maintenance Wing South', roofExtras: grates(56, 'z', 14), doors: [full('n', 14), { side: 's', at: 2.6, w: 8.8, lintel: false }], inner: [[0, 28, 4, 28, []], [10, 28, 14, 28, []]] });
      for (let z = 330; z < 378; z += 16) tunnelLamp(775, z);
      w.prop('gg_portal', 775, 379.5, 0, {}); w.ramp(768.5, 378.4, 781.5, 392, TUN_Y, w.groundAt(775, 398), 'z'); w.paint('concrete', 768, 378, 782, 392);
      for (const [x, z, k] of [[770, 340, 'toolbox'], [780, 360, 'arc_crate']]) w.container(k, x, z, 0, { tier: 2, poi: 'maintenance_wing' });
      w.arkSpawn('tick', 700, 294, { count: 3, habitat: 'indoor' }); w.arkSpawn('pop', 763, 200, { count: 2, habitat: 'indoor' }); w.arkSpawn('fireball', 775, 350, { count: 2, habitat: 'indoor' });
      w.arkSpawn('leaper', 746, 290, { habitat: 'indoor', radius: 10 });
      w.poi('maintenance_wing', 'Maintenance Wing', 700, 294, 30, { tier: 2, aliases: ['maintenance_wing'], underground: true });
      // warehouse surface annexes, siren, white lookout tower (quest), airshaft
      house({ x: 786, z: 256, w: 16, d: 12, h: 3.4, wall: 'corrugated', roof: 'corrugated', floor: 'concrete', name: 'Loading Office', doors: [{ side: 'w', at: 4, w: 1.8 }, { side: 's', at: 9, w: 3 }, ...winRow('n', 16, 2, 4)] }, 'industrial', { tier: 2, poi: 'warehouse_complex' });
      house({ x: 720, z: 226, w: 14, d: 10, h: 3.4, wall: 'concrete', roof: 'roofTar', floor: 'tiles', name: 'Dispatch', doors: [{ side: 's', at: 5, w: 1.8 }, ...winRow('w', 10, 2, 3)] }, 'office', { tier: 2, poi: 'warehouse_complex' });
      w.prop('gg_siren', 792, 250, 0, { solid: true });
      watchtower(745, 344, 1, 'turret'); w.block(743.2, 342.2, 746.8, 345.8, 0.2, 'plaster', { y0: BENCH_Y + 8.5, collide: false });   // the white lookout tower (quest)
      for (const [x, z] of [[708, 246], [790, 246], [790, 330], [700, 330]]) lightPost(x, z, 0xe8f4ff, 'gg_lightmast', 6.5, 2.6, 21);
      for (const [x, z, k, r] of [[800, 300, 'gg_container3', 0.1], [806, 312, 'gg_container', 1.6], [700, 236, 'gg_truck', 1.4], [727, 336, 'gg_crates', 0], [812, 262, 'gg_pallet', 0]]) w.prop(k, x, z, r, { solid: true });
      w.prop('gg_airshaft', 806, 283, 0, { solid: true }); w.lamp(806, 283, { y: 5, model: null, color: 0x40ff80, intensity: 1.5, range: 9 });
      w.extract('warehouse_airshaft', 'Warehouse Airshaft', 806, 288.5, { kind: 'airshaft' });
      w.arkSpawn('rocketeer', 760, 230, { count: 1, patrol: [[700, 220], [820, 230], [820, 340], [700, 340]] });
      w.arkSpawn('wasp', 740, 330, { count: 3, patrol: [[710, 330], [790, 330], [790, 250], [710, 250]] });
      w.zone('Warehouse Complex', [[700, 226], [820, 226], [820, 330], [700, 330]], { tier: 2 });
      w.poi('warehouse_complex', 'Warehouse Complex', 746, 289, 46, { tier: 2, aliases: ['warehouse_complex'] });

      // Gate Control Room on the bench edge above the yard, windows over the Checkpoint
      const GCR = { x: 640, z: 324, w: 44, d: 26, storeys: 2, h: 6.2, wall: 'concrete', floor: 'tiles', roof: 'roofTar', tint: 0xd0d4c8, name: 'Gate Control Room',
        doors: [{ side: 'w', at: 6, w: 2.2 }, { side: 'n', at: 30, w: 2 }, ...winRow('s', 44, 2, 3.4, 2), ...winRow('w', 26, 12, 3.4, 2)],
        inner: [[18, 0, 18, 26, [{ at: 10, w: 2 }]], [18, 12, 44, 12, [{ at: 10, w: 2 }]], [32, 0, 32, 12, [{ at: 4, w: 2 }]]] };
      house(GCR, 'office', { tier: 3, cont: 'lab', poi: 'gate_control_room', density: 60 });
      for (let i = 0; i < 4; i++) w.prop('gg_console', 662 + i * 4.6, 348.7, PI, { solid: true });
      w.prop('gg_server', 642, 326, 0, { solid: true }); w.prop('gg_server', 644, 326, 0, { solid: true });
      w.container('electronics', 664, 346.5, 0, { tier: 3, poi: 'gate_control_room' }); w.container('safe', 680, 327, 0, { tier: 3, poi: 'gate_control_room' });
      w.ramp(629, 328.6, 640.2, 333.4, TUN_Y, BENCH_Y, 'x');
      w.lamp(662, 345, { y: 5.6, model: null, color: 0x9affc8, intensity: 0.8, range: 10 });
      w.arkSpawn('snitch', 660, 360, { count: 1, patrol: [[640, 365], [700, 385], [640, 420]] });
      w.poi('gate_control_room', 'Gate Control Room', 662, 337, 26, { tier: 3, aliases: ['gate_control_room'] });

      // the yard: tunnel mouth staging area (+ stair ramp up to the bench pocket west of the tunnel)
      w.ramp(603.6, 226, 612.4, 241.6, BENCH_Y, TUN_Y, 'z'); w.paint('concrete', 603, 226, 613, 242);
      w.paintPoly('concrete', YARD);
      for (const [x, z, k, r] of [[600, 262, 'gg_container', PI / 4], [612, 252, 'gg_container2', PI / 4], [640, 300, 'gg_truck', 0.2], [622, 296, 'gg_crates', 0], [605, 278, 'gg_barrier', PI / 4], [632, 268, 'gg_barrier', 0.4], [645, 255, 'gg_generator', 0]]) w.prop(k, x, z, r, { solid: true });
      for (const [x, z, k] of [[618, 252, 'crate'], [644, 310, 'toolbox'], [600, 270, 'ammo_box']]) w.container(k, x, z, 0, { tier: 2, poi: 'outer_gates' });
      for (const [x, z] of [[610, 248], [648, 270], [636, 318]]) lightPost(x, z, 0xe8f4ff, 'gg_lightmast', 6.5, 2.6, 21);
      w.arkSpawn('leaper', 625, 275, { count: 1, radius: 14 });
      w.zone('Gate & Tunnels', [[530, 85], [800, 85], [800, 392], [626, 347], [558, 279], [530, 272]], { tier: 3 });

      // church north of the Data Vault (satellite dishes on its roof — quest)
      const CH = { x: 712, z: 66, w: 16, d: 28, storeys: 2, h: 7.4, wall: 'plaster', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', tint: 0xe8e0d0, name: 'Bench Chapel',
        doors: [{ side: 's', at: 6.6, w: 2.8 }, ...winRow('w', 28, 3, 5, 1.2), ...winRow('e', 28, 3, 5, 1.2)], inner: [[0, 6, 16, 6, [{ at: 7, w: 2 }]]] };
      bldg(CH);
      for (let r = 0; r < 5; r++) { w.prop('gg_pew', 717, 79 + r * 3, PI, { solid: true }); w.prop('gg_pew', 723, 79 + r * 3, PI, { solid: true }); }
      w.prop('gg_altar', 720, 74, PI, { solid: true });
      w.container('cabinet', 714, 68, 0, { tier: 2, poi: 'data_vault' }); w.container('basket', 726, 68, 0, { tier: 1, poi: 'data_vault' });
      w.block(706, 66, 712, 72, 13, 'plaster', { tint: 0xe8e0d0 });   // bell tower
      w.block(705.6, 65.6, 712.4, 72.4, 0.8, 'roofTile', { y0: w.groundAt(709, 69) + 12.8, collide: false });
      w.prop('gg_dish', 716, 82, 0.6, { y: 8.2 }); w.prop('gg_dish', 724, 88, -0.4, { y: 8.2 });
      w.lamp(720, 80, { y: 4.4, model: null, color: 0xffc880, intensity: 0.8, range: 10, flicker: 0.2 });
    }

    // ======================================================================== 7. PILGRIM'S PEAK
    {
      // ramps: main road along the south face, footpath up the west face
      w.ramp(848, 186, 905, 194, BENCH_Y + 0.6, PEAK_Y, 'x'); w.raiseRect(898, 174, 912, 194, PEAK_Y, 0, 'set');
      w.paint('gravel', 848, 186, 912, 194); w.paint('gravel', 898, 174, 912, 186);
      w.ramp(862, 112, 868, 168, PEAK_Y, BENCH_Y, 'z'); w.paint('dirt', 862, 112, 868, 168);
      w.paintPoly('grass', PEAK);
      w.paint('gravel', 884, 100, 972, 132); w.paint('concrete', 940, 76, 972, 120);
      w.paint('tiles', 896, 102, 928, 130); w.path(resample([[905, 190], [905, 160], [912, 132]], 4), 5, 'gravel'); w.path(resample([[866, 120], [884, 116]], 4), 3, 'dirt');
      for (let i = 0; i < 26; i++) { const x = R(872, 984), z = R(70, 176); if (free(x, z, 1.5, 3) && pointInPoly(x, z, PEAK)) w.prop(pick(['gg_bush', 'gg_flowers', 'gg_grass', 'gg_rock_s', 'gg_cypress', 'gg_olive']), x, z, rng() * 6, { solid: true, scale: R(0.7, 1) }); }
      // retaining walls + railings along the plateau edges
      for (const [a, b, c, d] of [[870, 172, 898, 173], [912, 178, 976, 179], [976, 120, 977, 176], [868, 74, 868.8, 110]]) w.block(a, b, c, d, 1.0, 'concrete', { y0: PEAK_Y - 0.1 });
      // monastery-hotel complex (pilgrims' refuge) around a cloister
      const PK = [
        { x: 890, z: 84, w: 34, d: 16, storeys: 3, h: 9.6, wall: 'plaster', roof: 'roofTile', tint: 0xe0d4c0, name: 'Pilgrim Hostel', kind: 'home', doors: [{ side: 's', at: 15, w: 2.4 }, ...winRow('s', 34, 2, 4), { side: 'w', at: 6, w: 1.8 }], inner: [[12, 0, 12, 16, [{ at: 9, w: 2 }]], [24, 0, 24, 16, [{ at: 9, w: 2 }]]] },
        { x: 928, z: 84, w: 16, d: 30, storeys: 2, h: 6.6, wall: 'plaster', roof: 'roofTile', tint: 0xe0d4c0, name: 'Refectory', kind: 'home', doors: [{ side: 'w', at: 20, w: 2.2 }, { side: 's', at: 6, w: 1.8 }, ...winRow('e', 30, 2, 4)], inner: [[0, 14, 16, 14, [{ at: 6, w: 2 }]]] },
        { x: 890, z: 130, w: 22, d: 14, storeys: 2, h: 6.4, wall: 'concrete', roof: 'roofTar', name: 'Research Annex', kind: 'lab', doors: [{ side: 'n', at: 9, w: 2 }, { side: 'e', at: 5, w: 1.8 }, ...winRow('s', 22, 2, 4)], inner: [[11, 0, 11, 14, [{ at: 5, w: 2 }]]] },
        { x: 918, z: 136, w: 18, d: 16, storeys: 1, h: 3.6, wall: 'concrete', roof: 'roofTar', name: 'Generator House', kind: 'industrial', doors: [{ side: 'w', at: 6, w: 2.4 }, { side: 'n', at: 4, w: 1.8 }] },
      ];
      for (const p of PK) house({ ...p, floor: p.kind === 'lab' ? 'tiles' : 'wood' }, p.kind, { tier: 2, poi: 'pilgrims_peak', cont: p.kind === 'lab' ? 'lab' : undefined });
      // communication tower + its locked basement room (key room 'communication_tower')
      const CT = { x: 948, z: 84, w: 16, d: 14, storeys: 1, h: 3.6, wall: 'concrete', floor: 'metalPanel', roof: 'metalPanel', name: 'Comms Tower Base',
        doors: [{ side: 's', at: 2, w: 2 }, { side: 'w', at: 8, w: 1.8 }], inner: [[8, 0, 8, 14, [{ at: 9, w: 2, door: true, locked: 'communication_tower' }]]] };
      bldg(CT);
      w.keyRoom('communication_tower', 956, 84, 964, 98, null, { name: 'Communication Tower Basement', poi: 'pilgrims_peak' });
      for (const [x, z, k] of [[958, 86, 'electronics'], [962, 86, 'safe'], [962, 92, 'weapon_case'], [958, 96, 'electronics'], [962, 96.5, 'security_locker']]) w.container(k, x, z, 0, { tier: 3, room: 'communication_tower', poi: 'pilgrims_peak' });
      w.prop('gg_server', 958.5, 90, PI / 2, { solid: true }); w.prop('gg_console', 952, 85, 0, { solid: true }); w.container('desk', 951, 95, 0, { tier: 2, poi: 'pilgrims_peak' });
      w.lamp(960, 91, { y: 3.2, model: null, color: 0x80c8ff, intensity: 0.8, range: 7 });
      w.prop('gg_commtower', 970, 92, 0, { solid: true }); w.lamp(970, 92, { y: 30, model: null, color: 0xff3020, intensity: 1.0, range: 10, flicker: 0.5 });
      w.prop('gg_dish', 950, 104, 2.4, { solid: true }); w.prop('gg_dish', 965, 108, -2.2, { solid: true });
      // cloister court: well, olive trees, shrine
      w.paint('gravel', 900, 104, 926, 128);
      w.prop('gg_well', 913, 116, 0, { solid: true }); w.prop('gg_shrine', 900, 120, 0, { solid: true });
      for (const [x, z] of [[903, 108], [923, 108], [903, 126], [923, 126]]) w.prop('gg_olive', x, z, rng() * 6, { solid: true, scale: 0.7 });
      for (const [x, z] of [[884, 100], [884, 150], [940, 160], [972, 150], [960, 128]]) lightPost(x, z, 0xffd8a0);
      w.prop('gg_container2', 950, 150, 0.3, { solid: true }); w.prop('gg_generator', 940, 132, 0, { solid: true }); w.prop('gg_crates', 945, 158, 0, { solid: true });
      perched('sentinel', 913, 104, 'hostel_roof', 10); perched('sentinel', 972, 104, 'comms_tower', 20);
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
        if (ww >= 11) inner.push([Math.round(ww * 0.55), 0, Math.round(ww * 0.55), dd, [{ at: dd / 2 - 0.8, w: 1.6 }]]);
        if (dd >= 11 && ww >= 11) inner.push([0, Math.round(dd * 0.5), Math.round(ww * 0.55), Math.round(dd * 0.5), [{ at: 1.0, w: 1.4 }]]);
        const o = cleanDoors({ x, z, w: ww, d: dd, storeys: st, wall: o2.wall || (i % 5 === 2 ? 'brick' : 'plaster'), floor: i % 2 ? 'wood' : 'tiles', roof: 'roofTile', roofShape: 'gable',
          tint: tints[i % tints.length], roofTint: roofT[i % roofT.length], doors, inner, name: o2.name || 'Village House', blend: 1.5 });
        if (o2.locked) {
          bldg(o); w.keyRoom(o2.locked, x, z, x + ww, z + dd, null, { name: o.name, poi: 'village' });
          furnish(o, 'home', { tier: 3, room: o2.locked, poi: 'village', cont0: 6, cont: 'office' });
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
      vhouse(357, 16, 18, 11, 2, 's', { detached: true, name: 'Village Barn', wall: 'brick' });
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
      const VC = { x: 366, z: 108, w: 12, d: 18, storeys: 2, h: 6.8, wall: 'plaster', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', tint: 0xf0e8d8, name: 'Village Chapel', doors: [{ side: 'w', at: 7.8, w: 2.4 }, ...winRow('e', 18, 3, 5, 1), ...winRow('s', 12, 3, 5, 1)] };
      bldg(VC); for (let r = 0; r < 4; r++) w.prop('gg_pew', 373, 113 + r * 3, 0, { solid: true }); w.prop('gg_altar', 373, 110, 0, { solid: true });
      w.container('basket', 368, 110, 0, { tier: 1, poi: 'village' }); w.container('cabinet', 377, 124, 0, { tier: 2, poi: 'village' });
      w.block(374, 104, 378, 108, 11, 'plaster', { tint: 0xf0e8d8 }); w.block(373.6, 103.6, 378.4, 108.4, 0.8, 'roofTile', { y0: w.groundAt(376, 106) + 10.8, collide: false });
      w.prop('gg_well', 355, 117, 0, { solid: true });
      w.prop('gg_table', 350, 108, 0, { solid: true }); w.prop('gg_tarp', 350, 108, 0, {}); w.container('electronics', 351, 109.4, 0, { tier: 1, poi: 'village', note: 'boom_box' });
      for (const [x, z] of [[350, 125], [360, 126]]) { w.prop('gg_table', x, z, 0, { solid: true }); w.prop('gg_tarp', x, z, 0, {}); w.container(pick(['basket', 'crate']), x, z + 1.4, 0, { tier: 1, poi: 'village' }); }
      for (const [x, z] of [[347, 112], [347, 120]]) w.prop('gg_bench', x, z, PI / 2, { solid: true });
      w.prop('gg_shrine', 362, 104, 0, { solid: true });
      // walled lane, terrace walls, laundry lines, cypresses, lamps
      const stoneWall = (ax, az, bx, bz, h = 1.1) => { const n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / 1.6)); for (let i = 0; i < n; i++) { const x = ax + (bx - ax) * (i + 0.5) / n, z = az + (bz - az) * (i + 0.5) / n; w.block(x - 0.8, z - 0.4, x + 0.8, z + 0.4, h, 'plaster', { tint: 0xa89880 }); } };
      for (const [ax, az, bx, bz] of [[300, 8, 290, 20], [306, 14, 296, 26], [288, 22, 277, 30], [296, 28, 284, 38], [228, 98, 236, 120], [250, 100, 248, 118], [262, 96, 296, 98], [380, 132, 440, 136], [470, 150, 500, 154], [300, 118, 340, 112], [232, 30, 244, 40]]) stoneWall(ax, az, bx, bz);
      for (const [x, z, r] of [[270, 66.2, 0], [420, 77.8, 0], [455, 121.5, 0], [415, 120.5, 0], [300, 60, PI / 2]]) w.prop('gg_laundry', x, z, r, { solid: true });
      for (const [x, z] of [[240, 40], [262, 66], [306, 54], [328, 66], [346, 92], [366, 100], [384, 58], [432, 98], [476, 120], [470, 140], [410, 120], [306, 100], [248, 88], [480, 104], [344, 132], [382, 132], [398, 78], [300, 26]]) w.prop('gg_cypress', x, z, 0, { solid: true, scale: R(0.8, 1.15) });
      for (const [x, z] of [[230, 70], [360, 60], [470, 60], [338, 110], [260, 110]]) w.prop('gg_olive', x, z, rng() * 6, { solid: true });
      for (const [x, z] of [[230, 64], [262, 64], [300, 64], [330, 72], [358, 88], [384, 97], [410, 97], [438, 104], [470, 104], [500, 118], [256, 30], [286, 36], [441, 70]]) lightPost(x, z, 0xffd090);
      for (let i = 0; i < 30; i++) { const x = R(236, 504), z = R(12, 158); if (free(x, z, 1.5, 3)) w.prop(pick(['gg_flowers', 'gg_grass', 'gg_bush', 'barrel', 'gg_woodpile', 'gg_haybale', 'gg_cart', 'gg_planter']), x, z, rng() * 6, { solid: true }); }
      for (let i = 0; i < 16; i++) { const x = R(236, 504), z = R(12, 158); if (free(x, z, 2, 3)) w.container(pick(['trash', 'basket', 'plant', 'crate']), x, z, 0, { tier: 1, poi: 'village' }); }
      vehicle('gg_truck', 216, 70, 1.4); vehicle('car', 386, 94.5, 1.6); vehicle('gg_van', 286, 64, 1.55); vehicle('car', 500, 108, 0.7);
      w.arkSpawn('wasp', 300, 70, { count: 2, patrol: [[250, 50], [340, 60], [360, 110], [270, 100]] });
      w.arkSpawn('wasp', 430, 100, { count: 2, patrol: [[390, 60], [480, 100], [450, 150], [390, 130]] });
      w.arkSpawn('pop', 300, 90, { count: 2 }); w.arkSpawn('tick', 420, 90, { count: 2, habitat: 'indoor' }); w.arkSpawn('fireball', 360, 30, { count: 2 });
      w.arkSpawn('leaper', 380, 140, { count: 1, radius: 30 });
      w.arkSpawn('snitch', 330, 40, { patrol: [[260, 30], [400, 30], [400, 90]] });
      w.zone('Village', [[245, 22], [278, 18], [432, 44], [520, 108], [505, 166], [300, 125], [238, 60]], { tier: 2 });
      w.poi('village', 'Village', 372, 88, 100, { tier: 2, aliases: ['village'] });
      // Lucky Hatch
      w.prop('hatch', 500, 108, 0, {}); w.lamp(500, 108, { y: 1.2, model: null, color: 0xffd040, intensity: 1.4, range: 7 });
      w.extract('lucky_hatch', 'Lucky Hatch', 500, 108, { kind: 'hatch', needsKey: 'raider_hatch' });
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
      const TC = { x: 250, z: 294, w: 12, d: 10, h: 3.2, wall: 'wood', floor: 'wood', roof: 'roofTile', roofShape: 'gable', name: 'Trapper Cabin', doors: [{ side: 'e', at: 2, w: 1.6 }, ...winRow('s', 12, 2, 4, 1.2)], inner: [[6, 0, 6, 10, [{ at: 6, w: 1.6, door: true }]]] };
      bldg(TC);   // trapper's store room (not a key room in the reference)
      for (const [x, z, k] of [[251.5, 296, 'safe'], [254.5, 296, 'weapon_case'], [251.5, 302, 'plant'], [254.5, 302.5, 'raider_cache']]) w.container(k, x, z, 0, { tier: 2, poi: 'trappers_glade' });
      furnish({ ...TC, x: 256, w: 6, inner: [] , doors: [{ side: 'e', at: 2, w: 1.6 }, { side: 'w', at: 6, w: 1.6 }] }, 'home', { tier: 1, poi: 'trappers_glade', cont0: 2 });
      house({ x: 284, z: 300, w: 9, d: 8, h: 3.0, wall: 'corrugated', floor: 'wood', roof: 'corrugated', name: 'Raider Structure', doors: [{ side: 'n', at: 3, w: 1.6 }, { side: 'w', at: 3, w: 1.2, sill: 1 }] }, 'camp', { tier: 2, poi: 'trappers_glade', cont0: 2 });
      w.prop('gg_tent', 270, 276, 0.6, { solid: true }); w.prop('gg_woodpile', 264, 292, 0, { solid: true }); w.prop('gg_campfire', 276, 288, 0, {}); w.lamp(276, 288, { y: 0.8, model: null, color: 0xff9040, intensity: 1.8, range: 9, flicker: 0.6 });
      for (const [x, z] of [[292, 280], [300, 288], [272, 312], [296, 318], [260, 282]]) w.container(pick(['plant', 'basket', 'plant']), x, z, 0, { tier: 1, poi: 'trappers_glade' });
      for (const [x, z] of [[268, 262], [306, 270], [312, 300]]) watchtower(x, z, 0.6);
      w.arkSpawn('tick', 285, 290, { count: 2 }); w.arkSpawn('leaper', 260, 250, { radius: 40 });
      w.poi('trappers_glade', "Trapper's Glade", 282, 292, 32, { tier: 1, aliases: ['trappers_glade'] });
      w.prop('hatch', 216, 306, 0, {}); w.lamp(216, 306, { y: 1.2, model: null, color: 0xffd040, intensity: 1.4, range: 7 });
      w.extract('reinforced_hatch', 'Reinforced Hatch', 216, 306, { kind: 'hatch', needsKey: 'raider_hatch' });

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
      w.prop('gg_airshaft', 273, 472, 0.3, { solid: true }); w.lamp(273, 472, { y: 5, model: null, color: 0x40ff80, intensity: 1.5, range: 9 }); mark(266, 465, 280, 479, 2 | 4);
      w.extract('forest_airshaft', 'Forest Airshaft', 273, 477.5, { kind: 'airshaft' });
    }

    // ======================================================================== 10. HIGHWAY COLLAPSE (SW)
    {
      const span = (x0, x1, z0, top, tex = 'concrete') => {
        w.block(x0, z0, x1, z0 + 12, 1.1, tex, { y0: top - 1.1 });
        for (let x = x0 + 2; x < x1 - 2; x += 7) { w.prop('gg_laney', x, z0 + 6, 0, { yAbs: top + 0.02 }); w.prop('gg_lane', x + 3.5, z0 + 3, 0, { yAbs: top + 0.02 }); w.prop('gg_lane', x + 3.5, z0 + 9, 0, { yAbs: top + 0.02 }); }
        w.block(x0, z0, x1, z0 + 0.5, 1.0, 'damConcrete', { y0: top }); w.block(x0, z0 + 11.5, x1, z0 + 12, 1.0, 'damConcrete', { y0: top });
        for (let x = x0 + 6; x < x1 - 2; x += 18) { const g = w.groundAt(x, z0 + 6); w.block(x - 1.2, z0 + 3.5, x + 1.2, z0 + 8.5, top - 1.1 - (g - 0.6), 'damConcrete', { y0: g - 0.6, seed: 2 }); }
        mark(x0, z0 - 1, x1, z0 + 13, 2 | 4);
      };
      span(145, 255, 596, 8); span(145, 255, 618, 8);
      span(0, 72, 626, 8); span(0, 66, 648, 8);
      // collapsed slab: stepped ramp from the ground up onto the north span
      for (let k = 0; k < 18; k++) { const x0 = 145 - (k + 1) * 1.4, top = 8 - (k + 1) * 0.4; if (top < w.groundAt(x0, 602) + 0.3) break; w.block(x0, 597, x0 + 1.4, 607, 0.9, 'concrete', { y0: top - 0.9 }); }
      for (let k = 0; k < 6; k++) w.block(72 + k * 1.6, 628, 73.6 + k * 1.6, 637, 0.8, 'concrete', { y0: 7.2 - k * 1.1, collide: false });
      for (const [x, z, r] of [[100, 615, 0.3], [118, 640, 1.2], [92, 632, 2.0], [128, 612, 2.6]]) w.prop('gg_rubble', x, z, r, { solid: true });
      for (const [x, z, k, r] of [[200, 602, 'car', 1.5], [168, 624, 'gg_truck', 1.7], [230, 626, 'car', 4.6], [186, 600, 'gg_van', 1.4], [40, 632, 'car', 1.6]]) w.prop(k, x, z, r, { solid: true, y: 0 , yAbs: 8.0 });
      for (const [x, z] of [[200, 600], [168, 622], [230, 628]]) w.container('car_trunk', x + 2, z, 0, { tier: 1, poi: 'highway_collapse' });
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
      furnish({ ...FH, inner: [[6, 0, 6, 5, []], [0, 5, 6, 5, []]] }, 'home', { tier: 1, poi: 'ruined_homestead', cont0: 2 });
      for (const [x, z] of [[502, 600], [560, 622], [520, 652]]) lightPost(x, z, 0xffc880);
      w.arkSpawn('pop', 530, 625, { count: 2 }); w.arkSpawn('tick', 556, 634, { count: 2, habitat: 'indoor' });
      w.arkSpawn('hornet', 520, 620, { count: 1, patrol: [[480, 600], [560, 600], [560, 660], [480, 660]] });
      w.zone('Ruined Homestead', [[496, 580], [572, 580], [572, 660], [426, 660], [426, 636]], { tier: 2 });
      w.poi('ruined_homestead', 'Ruined Homestead', 532, 624, 34, { tier: 2, aliases: ['ruined_homestead'] });

      // Ancient Fort on its hill: curtain walls, corner towers, keep, merlons
      const FX = 590, FZ = 696, FW = 46, FD = 42, FY = w.groundAt(613, 717);
      w.raiseRect(FX - 4, FZ - 4, FX + FW + 4, FZ + FD + 4, FY, 6, 'set'); w.paint('gravel', FX, FZ, FX + FW, FZ + FD);
      const wallSeg = (x0, z0, x1, z1) => { w.block(x0, z0, x1, z1, 5.2, 'brick', { tint: 0xc0b098, y0: FY - 0.3 }); const horiz = (x1 - x0) > (z1 - z0), L = horiz ? x1 - x0 : z1 - z0; for (let s = 0.5; s < L - 0.8; s += 2) w.prop('gg_merlon', horiz ? x0 + s + 0.6 : (x0 + x1) / 2, horiz ? (z0 + z1) / 2 : z0 + s + 0.6, 0, { yAbs: FY + 4.9 }); };
      wallSeg(FX, FZ, FX + FW, FZ + 1.6); wallSeg(FX, FZ, FX + 1.6, FZ + FD);
      wallSeg(FX + FW - 1.6, FZ, FX + FW, FZ + 18); wallSeg(FX + FW - 1.6, FZ + 26, FX + FW, FZ + FD);      // east gate gap
      wallSeg(FX, FZ + FD - 1.6, FX + 18, FZ + FD); wallSeg(FX + 28, FZ + FD - 1.6, FX + FW, FZ + FD);      // south breach
      for (const [x, z] of [[FX, FZ], [FX + FW - 6, FZ], [FX, FZ + FD - 6], [FX + FW - 6, FZ + FD - 6]]) w.block(x - 1, z - 1, x + 7, z + 7, 8.2, 'brick', { tint: 0xb0a088, y0: FY - 0.3 });
      w.prop('gg_fortruin', FX + 23, FZ + FD + 2, 0, { solid: true }); w.prop('gg_rubble', FX + 23, FZ + FD - 2, 0, { solid: true, scale: 0.6 });
      const KEEP = { x: FX + 12, z: FZ + 10, w: 20, d: 16, storeys: 3, h: 9.0, wall: 'brick', floor: 'tiles', roof: 'roofTile', tint: 0xc8b8a0, name: 'Fort Keep', floorY: FY,
        doors: [{ side: 's', at: 9, w: 2 }, { side: 'e', at: 6, w: 1.6 }, ...winRow('n', 20, 3, 5, 0.8), ...winRow('w', 16, 3, 5, 0.8)], inner: [[10, 0, 10, 16, [{ at: 6, w: 2 }]], [0, 9, 10, 9, [{ at: 4, w: 1.6 }]]] };
      house(KEEP, 'office', { tier: 2, cont: 'lab', poi: 'ancient_fort' });
      w.container('weapon_case', FX + 14, FZ + 12, 0, { tier: 3, poi: 'ancient_fort' }); w.container('electronics', FX + 30, FZ + 12, 0, { tier: 3, poi: 'ancient_fort' });
      house({ x: FX + 4, z: FZ + 28, w: 10, d: 8, h: 3.2, wall: 'brick', floor: 'tiles', roof: 'roofTile', roofShape: 'gable', tint: 0xc8b8a0, name: 'Fort Chapel', floorY: FY, doors: [{ side: 'e', at: 3, w: 1.6 }] }, 'church', { tier: 2, poi: 'ancient_fort', cont0: 2 });
      house({ x: FX + 34, z: FZ + 30, w: 8, d: 7, h: 3.2, wall: 'brick', floor: 'tiles', roof: 'roofTar', tint: 0xc8b8a0, name: 'Fort Storeroom', floorY: FY, doors: [{ side: 'n', at: 3, w: 1.6 }] }, 'shed', { tier: 2, poi: 'ancient_fort', cont0: 2 });
      w.prop('gg_dish', FX + 22, FZ + 34, 0.4, { solid: true }); w.prop('gg_generator', FX + 26, FZ + 34, 0, { solid: true }); w.container('electronics', FX + 24, FZ + 36, 0, { tier: 2, poi: 'ancient_fort', note: 'transmitter' });
      for (const [x, z] of [[FX + 8, FZ + 8], [FX + 38, FZ + 8], [FX + 22, FZ + 30], [FX + 50, FZ + 22]]) lightPost(x, z, 0xffc880);
      perched('sentinel', FX + 9, FZ + 6, 'fort_tower', 8.2); w.arkSpawn('rocketeer', FX + 23, FZ + 20, { patrol: [[FX - 10, FZ - 10], [FX + 60, FZ - 10], [FX + 60, FZ + 55], [FX - 10, FZ + 55]] });
      w.arkSpawn('tick', FX + 22, FZ + 18, { count: 2, habitat: 'indoor' }); w.arkSpawn('leaper', 640, 760, { radius: 30 });
      w.zone('Ancient Fort', [[FX - 6, FZ - 6], [FX + FW + 6, FZ - 6], [FX + FW + 6, FZ + FD + 6], [FX - 6, FZ + FD + 6]], { tier: 2 });
      w.poi('ancient_fort', 'Ancient Fort', FX + FW / 2, FZ + FD / 2, 34, { tier: 2, aliases: ['ancient_fort'] });
      // Fragrant Hatch
      w.prop('hatch', 444, 527, 0, {}); w.lamp(444, 527, { y: 1.2, model: null, color: 0xffd040, intensity: 1.4, range: 7 });
      w.extract('fragrant_hatch', 'Fragrant Hatch', 444, 527, { kind: 'hatch', needsKey: 'raider_hatch' });
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
      w.prop('gg_airshaft', 680, 486, 0, { solid: true }); w.lamp(680, 486, { y: 5, model: null, color: 0x40ff80, intensity: 1.5, range: 9 });
      w.extract('overlook_airshaft', 'Overlook Airshaft', 680, 491.5, { kind: 'airshaft' });
      // Cliffside Airshaft at the foot of the bench cliff
      w.prop('gg_airshaft', 460, 218, 0, { solid: true }); w.lamp(460, 218, { y: 5, model: null, color: 0x40ff80, intensity: 1.5, range: 9 }); mark(452, 210, 468, 226, 2 | 4);
      w.extract('cliffside_airshaft', 'Cliffside Airshaft', 460, 223.5, { kind: 'airshaft' });
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
      for (let i = 0; i < 16; i++) { const t = i / 15, x = 905 + Math.sin(t * 5) * 6 + R(-4, 4), z = 335 + t * 185; w.prop(pick(['gg_crag', 'gg_rock_l', 'gg_rock_m', 'gg_rock_l2']), x + 8, z, rng() * 6, { solid: true }); }
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
      for (const [x, z, k, r] of [[950, 318, 'gg_pallet', 0], [888, 330, 'gg_container3', 1.6], [950, 332, 'gg_logs', 0.2], [900, 268, 'gg_truck', 1.5], [944, 360, 'gg_crates', 0]]) w.prop(k, x, z, r, { solid: true });
      for (const [x, z] of [[902, 296], [930, 296], [918, 318], [930, 340]]) lightPost(x, z, 0xffd8a0);
      w.prop('hatch', 955, 292, 0, {}); w.lamp(955, 292, { y: 1.2, model: null, color: 0xffd040, intensity: 1.4, range: 7 });
      w.extract('prefab_hatch', 'Prefab Hatch', 955, 292, { kind: 'hatch', needsKey: 'raider_hatch' });
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
        for (let i = 0; i < n; i++) { const p = o.pts[Math.floor(rng() * o.pts.length)]; w.prop(pick(['gg_rock_m', 'gg_rock_m2', 'gg_rock_l', 'gg_boulder', 'gg_rock_s', 'gg_slab', 'gg_crag']), p[0] + R(-2, 2), p[1] + R(-2, 2), rng() * 6, { solid: true, scale: R(0.7, 1.2) }); }
        w.prop('gg_scree', o.pts[0][0] + R(-3, 3), o.pts[0][1] + R(2, 5), rng() * 6, {});
      }
      for (let i = 0; i < 900; i++) {
        const x = R(40, 1060), z = R(15, 810); if (avoidT(x, z)) continue;
        w.prop(pick(['gg_rock_s', 'gg_rock_s', 'gg_boulder', 'gg_rock_m', 'rock', 'gg_scree', 'gg_rock_m2']), x, z, rng() * 6, { solid: true, scale: R(0.6, 1.3) });
      }
      for (let i = 0; i < 1100; i++) {   // big boulders and crags on the mountain foot
        const x = R(0, W), z = R(0, H), d = dAt(x, z); if (d < -6 || d > 50) continue;
        w.prop(pick(['gg_rock_l', 'gg_rock_l2', 'gg_crag', 'gg_slab', 'gg_rock_m']), x, z, rng() * 6, { solid: true, scale: R(0.9, 1.8) });
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
      for (let i = 0; i < 70; i++) { const x = R(60, 1040), z = R(30, 800); if (avoidT(x, z)) continue; w.prop(pick(['husk', 'debris', 'husk', 'barrel', 'crate']), x, z, rng() * 6, { solid: true }); if (rng() < 0.45) w.container(pick(['arc_husk', 'crate', 'raider_cache', 'backpack', 'trash']), x + 1.5, z + 1, 0, { tier: 1 }); }
      for (let i = 0; i < 70; i++) { const x = R(60, 1040), z = R(30, 800); if (avoidT(x, z)) continue; w.container(pick(['plant', 'plant', 'basket', 'plant']), x, z, 0, { tier: 1 }); }
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
      // player insertion points (reference "player spawn" icons, pulled inside the boundary)
      for (const [x, z] of [[263, 32], [377, 27], [402, 124], [500, 125], [222, 105], [558, 68], [694, 58], [810, 50], [955, 245], [126, 262], [294, 306], [315, 387], [152, 430],
        [230, 541], [279, 540], [300, 579], [417, 602], [747, 602], [906, 587], [919, 368], [548, 800]]) w.spawnPoint(x, z);
      // loot tier zones for the open map
      w.zone('Outskirts', PLAY, { tier: 1 });
      w.zone('Raider’s Refuge', [[284, 188], [324, 188], [324, 224], [284, 224]], { tier: 1 });
      w.zone("Trapper's Glade", [[244, 270], [318, 270], [318, 322], [244, 322]], { tier: 1 });
    }
  },
};
