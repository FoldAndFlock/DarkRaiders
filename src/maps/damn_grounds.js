// Damn Grounds — faithful top-down adaptation of ARC Raiders' Dam Battlegrounds.
// 1100 x 825 m, north up. Reference: docs/ref/dam_annotated.jpg (POIs, extracts, spawns, key rooms)
// mapped as  X = px/2 - 90,  Z = py/2 - 18  (px,py in the 2400x1800 annotated image).
// Three terrain tiers: LOW = spillway basin / Red Lakes (east of the dam), MID = swamp, forests,
// ruins (west + south), HIGH = dam crest, Power Generation plateau and the Red Lakes Balcony.
import './props_damn_grounds.js';
import { waterMaterial } from '../engine/materials.js';
import { pointInPoly, mulberry } from '../engine/world.js';

const W = 1100, H = 825;
const LOW = 0, MID = 3, HIGH = 9;
const SWAMP_WATER = 2.62;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (t) => t * t * (3 - 2 * t);
const sm = (e0, e1, v) => smooth(clamp((v - e0) / (e1 - e0), 0, 1));
const lerp = (a, b, t) => a + (b - a) * t;
const PI = Math.PI;

// ------------------------------------------------------------------------------------ layout data
// Dam + plateau blocks (axis-aligned, stepped like the reference's dam monoliths) at HIGH
const DAM_RECTS = [
  // Power Generation plateau (Generator Hall at the NW end, transformer yards, east end)
  [628, 86, 712, 152], [700, 108, 784, 186], [772, 140, 852, 214], [840, 168, 884, 236], [634, 150, 716, 200],
  // upper dam: Controlled Access Zone, Pipeline Tower, broken south end above The Breach
  [634, 196, 714, 256], [712, 186, 772, 268], [648, 254, 712, 292],
  // Floodgates (stepping south-west)
  [598, 322, 654, 362], [582, 356, 638, 394], [566, 388, 622, 426], [550, 420, 608, 456],
  // Control Tower + Research & Administration block, Primary Facility platform
  [552, 452, 640, 548], [470, 424, 556, 500],
];
// Red Lakes Balcony: long raised walkway running ESE from the Control Tower block
const BALCONY = [[634, 494], [700, 532], [760, 570], [806, 598]];
// spillway chutes (dry concrete ramps from the crest down into the basin): [xFace, zCentre, len]
const CHUTES = [[654, 330, 40], [654, 348, 40], [638, 370, 40], [638, 386, 40], [622, 402, 40], [622, 418, 40], [608, 438, 38]];
// east basin (LOW)
const BASIN = [[650, 236], [700, 270], [780, 262], [860, 238], [905, 262], [928, 330], [934, 420], [930, 520], [900, 578], [850, 596], [804, 606], [760, 578], [700, 540], [642, 508], [640, 470], [645, 420], [658, 350], [664, 300]];
// swamp water polygon (water shows where the swamp floor dips below SWAMP_WATER)
const SWAMP = [[168, 212], [300, 196], [420, 206], [560, 228], [604, 262], [596, 300], [575, 330], [556, 372], [540, 404], [470, 412], [420, 404], [362, 408], [345, 450], [322, 512], [292, 548], [226, 548], [180, 522], [172, 452], [176, 380], [172, 300]];
const RED_LAKES = [[740, 432, 26, 1.1], [812, 492, 21, 0.8], [700, 498, 13, 0.5], [862, 404, 17, 1.6], [790, 382, 12, 2.3], [880, 520, 12, 0.2]];

// roads (asphalt) and tracks
const ROADS = [
  [[450, -2], [450, 40]],
  [[450, 40], [442, 78], [420, 106], [390, 126], [350, 150], [310, 175], [270, 200], [228, 224], [192, 244], [160, 266]],
  [[450, 40], [462, 64], [482, 88], [518, 97], [552, 104], [590, 108], [618, 112], [636, 118]],
  [[160, 266], [164, 300], [166, 339], [162, 375], [146, 408], [118, 440], [78, 466], [30, 490], [-2, 506]],
  [[160, 266], [128, 262], [100, 246], [86, 218], [86, 186], [100, 160], [122, 142], [150, 128]],
  [[-2, 566], [60, 566], [120, 565], [175, 560], [233, 556], [280, 546], [330, 531], [370, 512], [405, 496], [440, 488]],
  [[290, 827], [318, 752], [360, 690], [417, 625], [445, 585], [470, 552], [490, 534]],
  [[440, 488], [468, 506], [490, 534], [540, 562], [600, 598], [650, 606], [700, 600]],
];
const TRACKS = [
  [[417, 625], [428, 660], [450, 690], [482, 700], [520, 705], [570, 712], [620, 728], [660, 736], [700, 745], [760, 752], [800, 757], [850, 770]],
  [[482, 700], [496, 740], [512, 772], [526, 798]],
  [[665, 318], [720, 352], [770, 395], [800, 440], [840, 470], [880, 486], [920, 470]],
  [[850, 236], [856, 262], [866, 290], [880, 302]],
  [[905, 262], [940, 246], [980, 220], [1020, 208], [1060, 222], [1102, 216]],
  [[925, 330], [960, 322], [990, 350], [1030, 334], [1070, 352], [1102, 346]],
  [[930, 430], [975, 452], [1010, 480], [1060, 470], [1102, 482]],
  [[850, 770], [880, 760], [910, 745], [950, 760], [990, 776], [1040, 760], [1070, 736], [1102, 728]],
  [[700, 600], [760, 606], [806, 612], [836, 620]],
  [[150, 128], [120, 100], [70, 92], [20, 60]],
  [[175, 560], [190, 610], [200, 650], [230, 690], [262, 720], [292, 760]],
  [[700, 745], [740, 700], [760, 660]],
];

export default {
  id: 'damn_grounds', name: 'Damn Grounds', size: [W, H], seed: 4471,
  base: 'grass', cliff: 'rock',
  ambient: { music: 'damn_grounds', birds: true, frogs: true, insects: true },
  conditions: ['night_raid', 'em_storm', 'lush_blooms', 'uncovered_caches', 'husk_graveyard', 'prospecting_probes', 'harvester', 'matriarch', 'cold_snap', 'hurricane', 'close_scrutiny'],
  build(w, rng) {
    const R = (a, b) => a + rng() * (b - a);
    const pick = (a) => a[Math.floor(rng() * a.length)];
    const WV = w.tw + 1;
    const T0 = performance.now();

    // ---------------------------------------------------------------- terrain helpers
    function areaFn(x0, z0, x1, z1, fn) {
      for (let z = Math.max(0, Math.floor(z0)); z <= Math.min(w.th, Math.ceil(z1)); z++)
        for (let x = Math.max(0, Math.floor(x0)); x <= Math.min(w.tw, Math.ceil(x1)); x++) {
          const i = z * WV + x, v = fn(x, z, w.hv[i]);
          if (v != null) w.hv[i] = v;
        }
    }
    // linear ramp inside rect along axis with soft (side>0) or hard (side=0) sides
    function slope(x0, z0, x1, z1, h0, h1, axis, side = 3) {
      const ex = axis === 'z' ? side : 0, ez = axis === 'x' ? side : 0;
      areaFn(x0 - ex, z0 - ez, x1 + ex, z1 + ez, (x, z, cur) => {
        const t = axis === 'x' ? (x - x0) / (x1 - x0) : (z - z0) / (z1 - z0);
        if (t < 0 || t > 1) return null;
        const d = axis === 'x' ? Math.max(z0 - z, 0, z - z1) : Math.max(x0 - x, 0, x - x1);
        const f = d <= 0 ? 1 : side > 0 ? 1 - smooth(clamp(d / side, 0, 1)) : 0;
        if (f <= 0) return null;
        return cur + (lerp(h0, h1, t) - cur) * f;
      });
    }
    const distSeg = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, l = dx * dx + dz * dz || 1; const t = clamp(((px - ax) * dx + (pz - az) * dz) / l, 0, 1); return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
    const distLine = (px, pz, pts) => { let d = 1e9; for (let k = 0; k < pts.length - 1; k++) d = Math.min(d, distSeg(px, pz, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1])); return d; };
    const strip = (pts, wd) => {   // polygon around a polyline (for raised walkways)
      const L = [], Rr = [];
      for (let k = 0; k < pts.length; k++) {
        const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)];
        const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * wd / 2, nz = dx / l * wd / 2;
        L.push([pts[k][0] + nx, pts[k][1] + nz]); Rr.push([pts[k][0] - nx, pts[k][1] - nz]);
      }
      return L.concat(Rr.reverse());
    };

    // ================================================================ 1. TERRAIN
    // macro relief: MID everywhere, highlands in the north (dam abutment), mountains on the rim
    w.heightFn((x, z) => {
      let h = MID;
      h += sm(150, 96, z) * sm(330, 430, x) * (HIGH - MID + 0.6);                // northern highland (dam abutment)
      h += sm(244, 176, z) * sm(820, 870, x) * sm(960, 900, x) * (HIGH - MID) * (1 - sm(150, 96, z) * sm(330, 430, x));   // NE shoulder
      h += sm(48, 0, z) * sm(580, 660, x) * 9;                                    // north rim mountains
      h += sm(870, 1010, x) * sm(210, 60, z) * 11;                                // NE mountains
      h += sm(950, 1090, x) * 6;                                                  // east hills
      h += sm(126, 30, x) * sm(200, 300, z) * 7 + sm(126, 30, x) * (1 - sm(200, 300, z)) * 4;   // west hills past the ring road
      h += sm(730, 820, z) * sm(380, 470, x) * 7;                                 // southern (Formikai) hills
      h += sm(130, 20, z) * sm(320, 200, x) * 5;                                  // NW hills
      h += sm(600, 700, x) * sm(640, 700, z) * sm(1000, 900, x) * 2.5;            // Wreckage rise
      return h;
    }, 'set');
    w.raisePoly(BASIN, LOW, 34, 'set');
    // general relief noise (gentle where structures go)
    w.noiseHills(2.2, 90, 11, (x, z) => {
      if (x > 540 && x < 900 && z > 80 && z < 620) return 0.35;
      return 1;
    });
    w.noiseHills(0.9, 26, 23, (x, z) => (pointInPoly(x, z, SWAMP) ? 1 : 0.35));        // swamp hummocks + puddles
    // depression north of the West Broken Bridge where the span fell
    w.raiseCircle(566, 46, 46, -4.6, 0.6, 'add');
    // East Broken Bridge ravine
    w.ridge([[925, 120], [938, 200], [944, 262], [960, 320]], 22, 1.5, 16, 'min');
    // Old Battleground craters + Victory Rise
    w.raiseCircle(232, 318, 15, 2.8, 0.7, 'add');
    for (const [cx, cz, r] of [[212, 336, 6], [262, 306, 5], [248, 338, 7], [276, 330, 4], [222, 300, 5], [205, 312, 4]]) w.raiseCircle(cx, cz, r, -1.4, 0.5, 'add');
    // deeper swamp ponds (impassable centres)
    for (const [cx, cz, r] of [[318, 380, 11], [420, 344, 9], [270, 420, 10], [455, 300, 7], [372, 262, 8], [300, 500, 9], [528, 344, 8]]) w.raiseCircle(cx, cz, r, -1.9, 0.6, 'add');

    // ---------------------------------------------------------------- 2. DAM
    for (const [x0, z0, x1, z1] of DAM_RECTS) w.raiseRect(x0, z0, x1, z1, HIGH, 0, 'set');
    w.raisePoly(strip(BALCONY, 13), HIGH, 0, 'set');
    // The Breach: the dam is broken between the upper dam and the Floodgates; a rubble-strewn
    // pass slopes from the swamp (west) down into the basin (east)
    areaFn(586, 292, 676, 322, (x, z) => {
      const t = clamp((x - 588) / 84, 0, 1);
      let h = lerp(MID + 0.2, LOW + 0.4, smooth(t));
      const c = Math.hypot(x - 628, z - 307); if (c < 9) h -= (1 - c / 9) * 1.3;
      return h + Math.sin(x * 0.7 + z * 0.3) * 0.15;
    });
    slope(574, 292, 588, 322, MID, MID + 0.2, 'x', 4);
    slope(632, 300, 646, 322, 1.2, HIGH, 'z', 0);            // collapsed slab ramp up onto the Floodgates
    slope(668, 276, 690, 292, HIGH, 1.0, 'z', 0);            // rubble slope down from the upper dam
    // spillway chutes (hard-sided ramps; facades turn their sides into pier walls)
    for (const [xf, zc, len] of CHUTES) slope(xf, zc - 3.5, xf + len, zc + 3.5, HIGH, LOW + 0.3, 'x', 0);
    // turbine shafts in the plateau (flooded, impassable)
    for (const [x0, z0, x1, z1] of [[704, 192, 720, 210], [732, 212, 752, 234]]) w.raiseRect(x0, z0, x1, z1, 1.0, 0, 'set');
    // ramps between tiers
    slope(612, 220, 634, 232, MID + 0.5, HIGH, 'x', 0);       // swamp -> Controlled Access Zone
    slope(560, 366, 582, 376, MID + 0.3, HIGH, 'x', 0);       // swamp -> Floodgates
    slope(440, 438, 470, 452, MID + 0.2, HIGH, 'x', 0);       // Water Treatment plaza -> Primary Facility
    slope(522, 500, 536, 524, HIGH, MID + 0.2, 'z', 0);       // Primary Facility -> clarifier yard
    slope(572, 548, 586, 572, HIGH, MID + 0.3, 'z', 0);       // R&A -> south road
    slope(806, 592, 830, 606, HIGH, MID + 0.2, 'x', 0);       // balcony east end -> Electrical Tower trail
    slope(694, 538, 704, 556, HIGH, MID + 0.2, 'z', 0);       // balcony stairs down to the field depot
    slope(600, 64, 628, 100, 6.5, HIGH, 'x', 3);              // road climbs onto the plateau
    slope(772, 268, 790, 280, HIGH, 2.0, 'z', 0);             // service ramp from Pipeline Tower into the basin
    // deck strips (highway, broken at both ends)
    const WBB = [[504, -1], [533, 13], [560, 26]];
    const EBB = [[850, 186], [892, 208], [928, 226]];
    w.deck(WBB, 10, 12.4, 'asphalt', { rails: false, pillars: true, side: 'concrete' });
    w.deck([[606, 58], [636, 72], [700, 104], [780, 146], [852, 184]], 9, HIGH + 0.25, 'asphalt', { rails: false, pillars: false });
    w.deck(EBB, 9, HIGH + 0.25, 'asphalt', { rails: false, pillars: true, side: 'concrete' });

    // ---------------------------------------------------------------- 3. WATER
    const redMat = waterMaterial({ deep: 0x5a1e18, shallow: 0x8a3a26, opacity: 0.9 });
    const darkMat = waterMaterial({ deep: 0x14262a, shallow: 0x23403e, opacity: 0.92 });
    const swampMat = waterMaterial({ deep: 0x2a3e2c, shallow: 0x4a5e3a, opacity: 0.88 });
    w.waterPoly(SWAMP, { level: SWAMP_WATER, material: swampMat });
    for (const [cx, cz, r, d] of RED_LAKES) {
      w.raiseCircle(cx, cz, r * 1.15, -1.0 - d, 0.7, 'add');
      const pts = []; for (let a = 0; a < 18; a++) { const rr = r * (1.15 + 0.12 * Math.sin(a * 2.3 + cx)); pts.push([cx + Math.cos(a / 18 * 2 * PI) * rr, cz + Math.sin(a / 18 * 2 * PI) * rr * 0.8]); }
      w.waterPoly(pts, { level: LOW - 0.25, material: redMat });
    }
    for (const [x0, z0, x1, z1] of [[704, 192, 720, 210], [732, 212, 752, 234]]) w.water(x0, z0, x1, z1, { level: 6.2, material: darkMat });
    w.waterPoly([[620, 298], [636, 298], [638, 316], [618, 316]], { level: 0.9, material: darkMat });   // breach crater pool
    // spillway stream through the basin, Small Creek through the southern forest
    w.river([[700, 360], [740, 392], [770, 420], [790, 456], [826, 486], [870, 500], [910, 540], [940, 600], [980, 660]], 5, { level: LOW - 0.25, depth: 0.7, bank: 3 });
    w.river([[452, 600], [490, 608], [530, 603], [570, 613], [610, 633], [640, 660], [668, 676], [700, 688], [745, 690], [790, 682], [830, 692], [880, 704]], 4, { level: MID - 0.45, depth: 0.75, bank: 3 });

    // ---------------------------------------------------------------- 4. ROADS
    for (const r of ROADS) w.road(r, 7, 'asphalt', { edge: 'gravel', edgeW: 1.2 });
    for (const r of TRACKS) w.road(r, 4, 'dirt', { edge: 'gravel', edgeW: 0.6 });
    // crest service road
    w.path([[548, 452], [578, 420], [596, 392], [612, 360], [626, 330]], 6, 'asphalt');
    w.path([[680, 288], [690, 262], [700, 236], [722, 200], [742, 176], [728, 150]], 6, 'asphalt');

    w.__dg = { areaFn, slope, distLine, strip, T0 };
    this.terrainDone = performance.now() - T0;
    buildRest(w, rng, { R, pick, areaFn, slope, distLine, strip, redMat, darkMat, WBB, EBB });
  },
};

function buildRest() {}
