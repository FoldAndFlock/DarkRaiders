// Green Gate custom voxel props (all kinds prefixed `gg_`). Registered on import.
// Built procedurally and deterministically (local seeded hash, never Math.random) so every
// co-op client builds identical geometry. Local axes: x right, y up, z toward camera (+z = south).
import { Vox, registerProp } from '../engine/models.js';

const C = {
  conc: 0x8c887e, conc2: 0x7a766c, concD: 0x5e5b54, concL: 0xa29e92, concS: 0x6a675f,
  green: 0x3a7a5e, greenD: 0x285a44, greenL: 0x52967a, greenX: 0x1e4434,
  steel: 0x4c5256, steelD: 0x33373b, steelL: 0x6a7276, rust: 0x7a4a2a, rustD: 0x5a3420, rustL: 0x9a5e34,
  haz: 0xd8a020, black: 0x1c1c1e, red: 0xc8302a, redD: 0x8a2420, white: 0xd8d4c8, cream: 0xc8b890,
  wood: 0x6e4c32, woodD: 0x4a3222, woodL: 0x8a6440, woodG: 0x7a7060,
  leaf: 0x34562a, leafD: 0x24401e, leafL: 0x4a6a2e,
  olive: 0x7a8a62, oliveD: 0x5c6c48, oliveL: 0x98a67c, oliveB: 0x3a3a2c,
  bark: 0x4a3a2a, barkO: 0x6a5c4a, barkD: 0x34281e,
  rock: 0x7c766a, rockD: 0x5e594f, rockL: 0xa49c8c, rockS: 0x6a6458, moss: 0x56663a, mossD: 0x44522e,
  gY: 0xffd070, gR: 0xff3020, gG: 0x40ff80, gB: 0x60c8ff, gO: 0xff8a30, gW: 0xfff0c8,
  glass: 0x2a3a44, cloth1: 0xb83a2a, cloth2: 0xd8b030, cloth3: 0x3a6ab0, cloth4: 0x6a9a3a,
  hay: 0xc8a850, tarp: 0x3a6a9a, navy: 0x2a3446, tile: 0xa8623c,
};
// tiny deterministic hash rng (per-model seed)
function hrng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const P = (kind, build, info) => registerProp(kind, build, info);

// ------------------------------------------------------------------ helpers
function hazardBand(v, x0, y0, z0, x1, y1, z1, w = 2) {
  v.box(x0, y0, z0, x1, y1, z1, (x, y, z) => (((x + z + y) / w | 0) % 2 ? C.haz : C.black));
}
// rough rock blob: overlapping ellipsoids, strata on sides, lighter tops + moss
function rockBlob(v, seed, n, cx, cy, cz, rx, ry, rz) {
  const r = hrng(seed);
  for (let i = 0; i < n; i++) {
    const ox = (r() - 0.5) * rx, oz = (r() - 0.5) * rz, oy = r() * ry * 0.4;
    const rr = (0.45 + r() * 0.5) * Math.min(rx, rz) * 0.6;
    v.sphere(cx + ox, cy + oy, cz + oz, rr, C.rock, (ry / Math.max(rx, rz)) * (0.8 + r() * 0.6));
  }
  shadeRock(v, seed);
}
function shadeRock(v, seed) {
  const r = hrng(seed * 3 + 1);
  for (let y = 0; y < v.sy; y++) for (let z = 0; z < v.sz; z++) for (let x = 0; x < v.sx; x++) {
    if (v.get(x, y, z) === -1) continue;
    const top = !v.solid(x, y + 1, z);
    let c = (y % 3 === 0) ? C.rockD : ((x * 7 + z * 3 + y) % 11 === 0 ? C.rockS : C.rock);
    if (top) c = r() < 0.12 ? C.moss : (r() < 0.2 ? C.rockL : 0x948c7e);
    v.set(x, y, z, c);
  }
}

// ------------------------------------------------------------------ THE GATE
// Gate pylon: 8 x 8 m footprint, 24 m tall concrete tower with green steel bands + beacon.
P('gg_gatepylon', () => {
  const v = new Vox(16, 49, 16, 0.5, [8, 0, 8]);
  v.box(0, 0, 0, 15, 3, 15, C.concD);
  v.box(1, 4, 1, 14, 44, 14, (x, y, z) => ((x === 1 || x === 14 || z === 1 || z === 14) && (x + z) % 4 === 0 ? C.conc2 : C.conc));
  hazardBand(v, 0, 3, 0, 15, 4, 15, 2);
  for (const y of [16, 30, 40]) v.box(0, y, 0, 15, y + 2, 15, (x, yy, z) => (yy === y + 1 && (x + z) % 3 === 0 ? C.greenD : C.green));
  v.box(3, 33, 15, 12, 37, 15, C.greenL);              // panel
  for (let x = 4; x < 12; x += 2) v.set(x, 35, 15, C.gY);
  v.box(0, 45, 0, 15, 46, 15, C.concD); v.box(2, 47, 2, 13, 47, 13, C.steelD);
  v.box(7, 48, 7, 8, 48, 8, C.gR);
  for (const [x, z] of [[0, 0], [15, 0], [0, 15], [15, 15]]) v.box(x, 44, z, x, 46, z, C.gR);
  v.glow(C.gR).glow(C.gY);
  return v.build();
}, { solid: [4, 4, 24] });
// Gate wall: 24 m long (x) x 12 m deep (z) x 15 m tall; concrete base, green steel faces, and the
// row of heavy top beams that reads as stripes from above (as on the reference map).
P('gg_gatewall', () => {
  const v = new Vox(48, 31, 24, 0.5, [24, 0, 12]);
  v.box(0, 0, 0, 47, 9, 23, (x, y, z) => (y % 4 === 0 ? C.concS : C.conc));
  hazardBand(v, 0, 9, 0, 47, 9, 23, 2);
  for (const [z0, z1] of [[0, 4], [19, 23]]) {
    v.box(0, 10, z0, 47, 25, z1, C.green);
    for (let x = 0; x < 48; x += 6) v.box(x, 10, z0, x, 25, z1, C.greenD);
    for (const y of [14, 20]) v.box(0, y, z0, 47, y, z1, C.greenD);
  }
  v.box(0, 10, 5, 47, 22, 18, C.concS);
  v.box(0, 26, 0, 47, 26, 23, C.steelD);
  for (const z of [1, 6, 11, 16, 21]) v.box(0, 27, z - 1, 47, 29, z + 1, (x, y) => (y === 29 ? C.steelL : C.steel));
  for (let x = 2; x < 48; x += 8) { v.box(x, 23, 23, x + 1, 23, 23, C.gY); v.box(x, 23, 0, x + 1, 23, 0, C.gY); }
  v.glow(C.gY);
  return v.build();
}, { solid: [12, 6, 15] });
// Gate leaf: sliding green steel door 16 x 2 x 12 m.
P('gg_gateleaf', () => {
  const v = new Vox(32, 24, 4, 0.5, [16, 0, 2]);
  v.box(0, 0, 0, 31, 23, 3, (x, y, z) => (x % 4 === 0 ? C.greenD : (y % 6 === 0 ? C.greenX : C.green)));
  hazardBand(v, 0, 0, 0, 31, 1, 3, 2);
  v.box(15, 0, 0, 16, 23, 3, C.steelD);
  v.box(0, 22, 0, 31, 23, 3, C.steel);
  for (let x = 3; x < 31; x += 7) v.set(x, 19, 3, C.gY);
  v.glow(C.gY);
  return v.build();
}, { solid: [8, 1, 12] });
// overhead gantry with a green highway sign
P('gg_gantry', () => {
  const v = new Vox(64, 36, 4, 0.25, [32, 0, 2]);
  v.box(0, 0, 1, 1, 33, 2, C.steelD); v.box(62, 0, 1, 63, 33, 2, C.steelD);
  v.box(0, 30, 0, 63, 31, 3, C.steel);
  v.box(10, 22, 3, 53, 29, 3, C.green); v.box(10, 22, 3, 53, 22, 3, C.white); v.box(10, 29, 3, 53, 29, 3, C.white);
  const txt = [14, 15, 17, 19, 20, 23, 25, 26, 28, 31, 33, 34, 36, 39, 41, 42, 44, 47, 48];
  for (const x of txt) v.box(x, 25, 3, x, 27, 3, C.white);
  v.box(46, 24, 3, 50, 27, 3, C.white);
  return v.build();
}, { solid: [0.3, 0.3, 8] });
P('gg_portal', () => {   // tunnel portal facade: 22 m wide, 10 m tall, 3 m deep; opening 14 m
  const v = new Vox(44, 20, 6, 0.5, [22, 0, 3]);
  v.box(0, 0, 0, 43, 19, 5, C.conc);
  v.box(8, 0, 0, 35, 13, 5, -1);                        // opening
  for (let x = 8; x <= 35; x++) { const t = Math.abs(x - 21.5) / 14; const yy = 13 + Math.round(3 * (1 - t * t)); v.box(x, 13, 0, x, yy, 5, -1); }
  hazardBand(v, 7, 0, 5, 7, 16, 5, 2); hazardBand(v, 36, 0, 5, 36, 16, 5, 2);
  v.box(0, 18, 0, 43, 19, 5, C.concD);
  for (let x = 10; x < 34; x += 4) v.set(x, 17, 5, C.gY);
  v.box(2, 4, 5, 5, 8, 5, C.green); v.box(38, 4, 5, 41, 8, 5, C.green);
  v.glow(C.gY);
  return v.build();
}, {});
P('gg_rubble', () => {
  const v = new Vox(32, 14, 24, 0.25, [16, 0, 12]); const r = hrng(77);
  for (let i = 0; i < 26; i++) {
    const x = 3 + r() * 26, z = 3 + r() * 18, s = 2 + r() * 4, y = Math.max(0, 6 - Math.hypot(x - 16, z - 12) * 0.5) * r();
    v.box(x | 0, y | 0, z | 0, (x + s) | 0, (y + s * 0.6) | 0, (z + s * 0.8) | 0, r() < 0.7 ? C.conc2 : C.concD);
  }
  for (let i = 0; i < 8; i++) { const x = 4 + r() * 24 | 0, z = 4 + r() * 16 | 0; v.box(x, 4, z, x, 10 + (r() * 3 | 0), z, C.rust); }
  return v.build();
}, { solid: [3.6, 2.6, 2.2] });

// ------------------------------------------------------------------ CHECKPOINT KIT
P('gg_barrier', () => {     // concrete jersey barrier 3 m
  const v = new Vox(30, 9, 6, 0.1, [15, 0, 3]);
  v.box(0, 0, 0, 29, 3, 5, C.concL); v.box(0, 4, 1, 29, 8, 4, C.concL);
  v.box(0, 6, 1, 29, 6, 4, (x) => ((x >> 2) % 2 ? C.red : C.white));
  return v.build();
}, { solid: [1.5, 0.3, 0.9] });
P('gg_boom', () => {        // boom barrier: post at origin, arm along +x (6 m)
  const v = new Vox(62, 12, 4, 0.1, [1.5, 0, 2]);
  v.box(0, 0, 0, 3, 11, 3, C.steel); v.box(0, 8, 0, 3, 11, 3, C.haz);
  v.box(4, 9, 1, 61, 10, 2, (x) => ((x / 6 | 0) % 2 ? C.red : C.white));
  v.set(61, 11, 2, C.gR); v.glow(C.gR);
  return v.build();
}, { solid: [0.2, 0.2, 1.2] });
P('gg_toll', () => {        // small inspection kiosk (not enterable)
  const v = new Vox(20, 30, 24, 0.1, [10, 0, 12]);
  v.box(0, 0, 0, 19, 2, 23, C.concD);
  v.box(1, 3, 1, 18, 24, 22, C.white); v.box(1, 13, 1, 18, 21, 22, C.glass);
  v.box(2, 13, 2, 17, 21, 21, C.white); v.box(1, 3, 22, 18, 12, 22, C.green);
  v.box(0, 25, 0, 19, 27, 23, C.greenD); v.box(0, 28, 0, 19, 28, 23, C.steelD);
  v.box(8, 16, 23, 11, 18, 23, C.gY); v.glow(C.gY);
  return v.build();
}, { solid: [1.0, 1.2, 2.8] });
P('gg_watchtower', () => {  // 4 x 4 m, 10 m tall guard tower (Sentinel perch)
  const v = new Vox(16, 41, 16, 0.25, [8, 0, 8]);
  for (const [x, z] of [[1, 1], [13, 1], [1, 13], [13, 13]]) v.box(x, 0, z, x + 1, 26, z + 1, C.steelD);
  for (let y = 4; y < 26; y += 7) { v.box(1, y, 1, 14, y, 1, C.steel); v.box(1, y, 14, 14, y, 14, C.steel); v.box(1, y, 1, 1, y, 14, C.steel); v.box(14, y, 1, 14, y, 14, C.steel); }
  for (let i = 0; i < 12; i++) { v.set(2 + i, 5 + i * 1.6, 1, C.steel); v.set(2 + i, 5 + i * 1.6, 14, C.steel); }
  v.box(0, 26, 0, 15, 27, 15, C.woodD);
  v.box(0, 28, 0, 15, 33, 15, C.wood); v.box(1, 30, 0, 14, 32, 15, -1); v.box(0, 30, 1, 15, 32, 14, -1);
  v.box(1, 28, 1, 14, 29, 14, C.woodD);
  v.box(0, 34, 0, 15, 35, 15, C.steel);
  v.box(-1, 36, -1, 16, 36, 16, C.greenD);
  v.box(7, 37, 7, 8, 40, 8, C.steelD); v.set(7, 40, 7, C.gR); v.glow(C.gR);
  return v.build();
}, { solid: [2, 2, 8.5] });
P('gg_lightmast', () => {   // floodlight mast (use as lamp model)
  const v = new Vox(14, 82, 6, 0.1, [7, 0, 3]);
  v.box(6, 0, 2, 7, 76, 3, C.steelD); v.box(4, 0, 0, 9, 2, 5, C.concD);
  v.box(1, 76, 1, 12, 77, 4, C.steel);
  for (const x of [1, 5, 9]) { v.box(x, 78, 1, x + 3, 81, 4, C.steelL); v.box(x, 78, 5, x + 3, 80, 5, C.gW); }
  v.glow(C.gW);
  return v.build();
}, { solid: [0.2, 0.2, 5.5] });
P('gg_siren', () => {       // emergency siren on a pole
  const v = new Vox(10, 62, 10, 0.1, [5, 0, 5]);
  v.box(4, 0, 4, 5, 54, 5, C.steelD); v.box(2, 0, 2, 7, 1, 7, C.concD);
  v.box(1, 54, 1, 8, 59, 8, C.red); v.box(3, 55, 0, 6, 58, 9, C.steelD); v.box(0, 55, 3, 9, 58, 6, C.steelD);
  v.box(4, 60, 4, 5, 61, 5, C.gR); v.glow(C.gR);
  return v.build();
}, { solid: [0.2, 0.2, 5.5] });
P('gg_container', () => shipping(C.rust, C.rustD), { solid: [3, 1.2, 2.6] });
P('gg_container2', () => shipping(C.green, C.greenD), { solid: [3, 1.2, 2.6] });
P('gg_container3', () => shipping(0x3a5a7a, 0x2a425a), { solid: [3, 1.2, 2.6] });
function shipping(a, b) {
  const v = new Vox(30, 13, 12, 0.2, [15, 0, 6]);
  v.box(0, 0, 0, 29, 12, 11, (x, y, z) => (x % 2 ? a : b));
  v.box(0, 12, 0, 29, 12, 11, b);
  v.box(29, 0, 0, 29, 12, 11, C.steelD); v.box(29, 1, 2, 29, 11, 2, C.steel); v.box(29, 1, 9, 29, 11, 9, C.steel);
  for (let x = 4; x < 26; x += 7) v.box(x, 3, 11, x + 3, 5, 11, C.white);
  return v.build();
}

// ------------------------------------------------------------------ VEHICLES (long axis = z)
P('gg_truck', () => {
  const v = new Vox(13, 17, 44, 0.2, [6.5, 0, 22]);
  for (const z of [5, 12, 34]) { v.box(0, 0, z, 1, 3, z + 4, C.black); v.box(11, 0, z, 12, 3, z + 4, C.black); }
  v.box(1, 2, 2, 11, 3, 41, C.steelD);
  v.box(0, 4, 2, 12, 15, 30, (x, y, z) => (z % 3 === 0 ? C.greenD : C.green));   // cargo box
  v.box(1, 4, 32, 11, 12, 41, C.white); v.box(2, 9, 41, 10, 11, 41, C.glass); v.box(0, 9, 34, 0, 11, 39, C.glass); v.box(12, 9, 34, 12, 11, 39, C.glass);
  v.box(1, 13, 33, 11, 13, 39, C.steel); v.box(2, 4, 42, 10, 6, 43, C.steelD);
  v.set(2, 6, 42, C.gY); v.set(10, 6, 42, C.gY); v.glow(C.gY);
  for (let i = 0; i < 18; i++) v.set(i % 2 ? 0 : 12, 5 + (i * 7) % 9, 3 + (i * 11) % 26, C.rust);
  return v.build();
}, { solid: [1.3, 4.3, 3.2] });
P('gg_bus', () => {
  const v = new Vox(13, 17, 58, 0.2, [6.5, 0, 29]);
  for (const z of [7, 46]) { v.box(0, 0, z, 1, 3, z + 4, C.black); v.box(11, 0, z, 12, 3, z + 4, C.black); }
  v.box(0, 2, 1, 12, 15, 56, (x, y, z) => (y < 6 ? 0xc8a030 : C.cream));
  v.box(0, 9, 3, 0, 13, 54, (x, y, z) => (z % 6 === 0 ? C.cream : C.glass)); v.box(12, 9, 3, 12, 13, 54, (x, y, z) => (z % 6 === 0 ? C.cream : C.glass));
  v.box(1, 8, 57, 11, 13, 57, C.glass); v.box(1, 16, 4, 11, 16, 52, C.steelL);
  v.box(2, 16, 20, 10, 16, 30, C.steel);
  for (let i = 0; i < 24; i++) v.set(i % 2 ? 0 : 12, 3 + (i * 5) % 6, 2 + (i * 13) % 54, C.rust);
  return v.build();
}, { solid: [1.3, 5.6, 3.2] });
P('gg_van', () => {
  const v = new Vox(11, 12, 26, 0.2, [5.5, 0, 13]);
  for (const z of [4, 19]) { v.box(0, 0, z, 1, 2, z + 3, C.black); v.box(9, 0, z, 10, 2, z + 3, C.black); }
  v.box(0, 2, 1, 10, 10, 24, C.white); v.box(1, 6, 25, 9, 9, 25, C.glass); v.box(0, 7, 18, 0, 9, 23, C.glass); v.box(10, 7, 18, 10, 9, 23, C.glass);
  v.box(0, 4, 2, 10, 4, 17, C.red); v.box(1, 11, 3, 9, 11, 20, C.steelL);
  for (let i = 0; i < 12; i++) v.set(i % 2 ? 0 : 10, 3 + (i * 3) % 6, 2 + (i * 7) % 20, C.rust);
  return v.build();
}, { solid: [1.1, 2.6, 2.2] });
P('gg_patrolcar', () => {    // armoured patrol car with light bar
  const v = new Vox(12, 11, 26, 0.2, [6, 0, 13]);
  for (const z of [3, 19]) { v.box(0, 0, z, 1, 3, z + 4, C.black); v.box(10, 0, z, 11, 3, z + 4, C.black); }
  v.box(0, 2, 1, 11, 8, 24, C.navy); v.box(0, 4, 1, 11, 4, 24, C.white);
  v.box(1, 6, 25, 10, 7, 25, C.glass); v.box(1, 9, 8, 10, 9, 18, C.steelD);
  v.box(2, 10, 12, 4, 10, 13, C.gR); v.box(7, 10, 12, 9, 10, 13, C.gB);
  v.box(2, 3, 0, 9, 5, 0, C.steelL);
  v.glow(C.gR).glow(C.gB);
  return v.build();
}, { solid: [1.2, 2.6, 2.0] });

// ------------------------------------------------------------------ TUNNEL / INDUSTRIAL
P('gg_airshaft', () => {     // airshaft extraction vent, 7 x 7 m
  const v = new Vox(28, 19, 28, 0.25, [14, 0, 14]);
  v.box(0, 0, 0, 27, 4, 27, C.conc);
  hazardBand(v, 0, 4, 0, 27, 4, 27, 2);
  v.box(2, 5, 2, 25, 13, 25, (x, y, z) => ((y % 2) && (x === 2 || x === 25 || z === 2 || z === 25) ? C.steelD : C.steel));
  v.box(3, 14, 3, 24, 14, 24, C.steelD);
  for (let z = 4; z < 24; z++) for (let x = 4; x < 24; x++) {
    const dx = x - 13.5, dz = z - 13.5, d = Math.hypot(dx, dz);
    if (d < 9.5) v.set(x, 14, z, (Math.atan2(dz, dx) * 4 / Math.PI + 8 | 0) % 2 && d > 2 ? C.black : C.steelL);
  }
  v.box(12, 15, 12, 15, 16, 15, C.steelD);
  for (const [x, z] of [[1, 1], [26, 1], [1, 26], [26, 26]]) v.box(x, 5, z, x, 17, z, C.green), v.set(x, 18, z, C.gG);
  v.glow(C.gG);
  return v.build();
}, { solid: [3.5, 3.5, 3.6] });
P('gg_fan', () => {          // giant ventilation fan standing upright, 6 m
  const v = new Vox(24, 25, 6, 0.25, [12, 0, 3]);
  v.box(0, 0, 0, 23, 1, 5, C.concD);
  for (let y = 2; y < 25; y++) for (let x = 0; x < 24; x++) {
    const dx = x - 11.5, dy = y - 13, d = Math.hypot(dx, dy);
    if (d < 11.5 && d > 10) v.box(x, y, 0, x, y, 5, C.steelD);
    else if (d <= 10) v.set(x, y, 3, (Math.atan2(dy, dx) * 3 / Math.PI + 6 | 0) % 2 ? C.steel : C.black);
  }
  v.box(10, 11, 1, 13, 15, 4, C.haz);
  return v.build();
}, { solid: [3, 0.75, 6] });
P('gg_pipes', () => {
  const v = new Vox(40, 12, 10, 0.2, [20, 0, 5]);
  for (const [y, z, r, c] of [[4, 3, 2.6, C.steelL], [4, 7, 2.2, C.rust], [9, 5, 2, C.green]])
    for (let x = 0; x < 40; x++) for (let yy = 0; yy < 12; yy++) for (let zz = 0; zz < 10; zz++) if ((yy - y) ** 2 + (zz - z) ** 2 < r * r) v.set(x, yy, zz, x % 8 === 0 ? C.steelD : c);
  for (const x of [3, 20, 36]) v.box(x, 0, 2, x + 1, 2, 8, C.steelD);
  return v.build();
}, { solid: [4, 1, 2.2] });
P('gg_generator', () => {
  const v = new Vox(18, 11, 10, 0.1, [9, 0, 5]);
  v.box(0, 0, 0, 17, 1, 9, C.steelD); v.box(1, 2, 1, 16, 9, 8, C.haz); v.box(1, 2, 1, 16, 2, 8, C.black);
  v.box(3, 4, 9, 7, 8, 9, C.black); v.box(10, 5, 9, 15, 7, 9, C.steelD); v.box(13, 10, 3, 14, 10, 4, C.steelD);
  v.set(9, 7, 9, C.gG); v.glow(C.gG);
  return v.build();
}, { solid: [0.9, 0.5, 1.0] });
P('gg_transformer', () => {
  const v = new Vox(16, 20, 12, 0.1, [8, 0, 6]);
  v.box(0, 0, 0, 15, 2, 11, C.concD); v.box(1, 3, 1, 14, 15, 10, (x, y) => (y % 3 ? C.greenD : C.green));
  for (const x of [3, 7, 11]) v.box(x, 16, 5, x + 1, 19, 6, C.white);
  v.box(1, 8, 11, 6, 11, 11, C.haz);
  return v.build();
}, { solid: [0.8, 0.6, 1.6] });
P('gg_dish', () => {        // satellite dish (church roof quest + comms)
  const v = new Vox(24, 26, 16, 0.1, [12, 0, 8]);
  v.box(10, 0, 6, 13, 10, 9, C.steelD);
  for (let y = 0; y < 26; y++) for (let x = 0; x < 24; x++) {
    const dx = x - 11.5, dy = y - 15, d = Math.hypot(dx, dy);
    if (d < 10.5) { const zz = Math.round(8 + d * d * 0.04); v.set(x, y, zz, d > 9.5 ? C.steelL : C.white); }
  }
  v.box(11, 14, 3, 12, 15, 7, C.steelD); v.set(11, 15, 2, C.gR); v.glow(C.gR);
  return v.build();
}, { solid: [0.6, 0.6, 2.5] });
P('gg_commtower', () => {    // lattice communications tower, 31 m
  const v = new Vox(20, 125, 20, 0.25, [10, 0, 10]);
  for (let y = 0; y < 116; y++) {
    const w = Math.round(9 - y * 0.055), a = 10 - w, b = 9 + w;
    for (const [x, z] of [[a, a], [b, a], [a, b], [b, b]]) v.set(x, y, z, y % 16 < 2 ? C.white : C.red);
    if (y % 8 === 0) { v.box(a, y, a, b, y, a, C.steel); v.box(a, y, b, b, y, b, C.steel); v.box(a, y, a, a, y, b, C.steel); v.box(b, y, a, b, y, b, C.steel); }
    const k = y % 8; if (w > 1) { v.set(a + Math.round(k / 8 * (b - a)), y, a, C.steelD); v.set(b - Math.round(k / 8 * (b - a)), y, b, C.steelD); v.set(a, y, a + Math.round(k / 8 * (b - a)), C.steelD); v.set(b, y, b - Math.round(k / 8 * (b - a)), C.steelD); }
  }
  for (const y of [40, 80]) { const w = Math.round(9 - y * 0.055) + 2; v.box(10 - w, y, 10 - w, 9 + w, y, 9 + w, C.steelD); }
  v.box(9, 116, 9, 10, 124, 10, C.steelD); v.box(6, 110, 8, 7, 118, 11, C.white); v.box(13, 104, 8, 14, 112, 11, C.white);
  v.set(9, 124, 9, C.gR); v.set(9, 81, 9, C.gR); v.glow(C.gR);
  return v.build();
}, { solid: [1.6, 1.6, 30] });
P('gg_hwpillar', () => {     // elevated highway pillar 2.5 x 8 m
  const v = new Vox(12, 33, 8, 0.25, [6, 0, 4]);
  v.box(2, 0, 1, 9, 28, 6, (x, y) => (y % 6 === 0 ? C.concS : C.conc));
  v.box(0, 29, 0, 11, 32, 7, C.concD);
  for (let i = 0; i < 10; i++) v.set(2 + (i * 5) % 8, 4 + (i * 7) % 22, 6, C.rust);
  return v.build();
}, { solid: [1, 0.7, 8] });

// ------------------------------------------------------------------ NATURE
P('gg_olive', () => {        // olive tree: gnarled trunk, wide silver-green crown
  const v = new Vox(36, 30, 36, 0.15, [18, 0, 18]); const r = hrng(11);
  v.box(16, 0, 16, 19, 8, 19, C.barkO); v.box(15, 0, 15, 20, 1, 20, C.bark);
  v.box(13, 8, 15, 17, 12, 18, C.bark); v.box(19, 7, 17, 23, 12, 20, C.barkO); v.box(16, 9, 20, 18, 13, 23, C.bark);
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, rr = 7 + r() * 5;
    v.sphere(18 + Math.cos(a) * rr * 0.9, 16 + r() * 7, 18 + Math.sin(a) * rr * 0.9, 5 + r() * 2.5, (x, y, z) => ((x * 5 + y * 3 + z * 7) % 6 === 0 ? C.oliveL : (y % 3 === 0 ? C.oliveD : C.olive)), 0.75);
  }
  v.sphere(18, 21, 18, 6, C.olive, 0.7);
  for (let i = 0; i < 30; i++) { const x = 6 + r() * 24 | 0, z = 6 + r() * 24 | 0, y = 13 + r() * 8 | 0; if (v.get(x, y, z) !== -1) v.set(x, y, z, C.oliveB); }
  return v.build();
}, { solid: [0.35, 0.35, 4] });
P('gg_cypress', () => {      // Italian cypress
  const v = new Vox(16, 66, 16, 0.15, [8, 0, 8]);
  v.box(7, 0, 7, 8, 6, 8, C.bark);
  for (let y = 4; y < 66; y++) {
    const t = (y - 4) / 62, rr = 5.6 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.15 + 0.08)), 0.8) * (1 - t * 0.35);
    v.cyl(8, 8, y, y, Math.max(0.6, rr), (y % 5 < 2) ? 0x223a20 : 0x2c4a28);
  }
  return v.build();
}, { solid: [0.4, 0.4, 7] });
P('gg_pinebig', () => {      // tall mountain pine, 14 m
  const v = new Vox(26, 72, 26, 0.2, [13, 0, 13]);
  v.box(12, 0, 12, 13, 20, 13, C.barkD);
  for (let y = 14; y < 70; y++) {
    const band = (y - 14) % 9, rr = (70 - y) * 0.19 + (band < 3 ? 2.2 : 0.4);
    v.cyl(13, 13, y, y, rr, band < 3 ? 0x1c3420 : (band < 6 ? 0x24422a : 0x2c4e30));
  }
  return v.build();
}, { solid: [0.4, 0.4, 6] });
P('gg_spruce', () => {
  const v = new Vox(20, 58, 20, 0.15, [10, 0, 10]);
  v.box(9, 0, 9, 10, 10, 10, C.barkD);
  for (let y = 8; y < 57; y++) { const band = y % 7; v.cyl(10, 10, y, y, (57 - y) * 0.17 + (band < 2 ? 1.6 : 0), band < 2 ? 0x18301e : 0x203c26); }
  return v.build();
}, { solid: [0.35, 0.35, 5] });
P('gg_birch', () => {        // pale deciduous tree for glades
  const v = new Vox(22, 46, 22, 0.15, [11, 0, 11]); const r = hrng(5);
  v.box(10, 0, 10, 11, 26, 11, (x, y) => (y % 5 === 0 ? 0x3a3a34 : 0xc8c4b4));
  for (let i = 0; i < 6; i++) v.sphere(11 + (r() - 0.5) * 8, 28 + r() * 12, 11 + (r() - 0.5) * 8, 5 + r() * 2, (x, y, z) => ((x + y * 2 + z) % 5 === 0 ? 0x7a9a3a : 0x5a7a2e), 0.85);
  return v.build();
}, { solid: [0.25, 0.25, 4] });
P('gg_stump', () => { const v = new Vox(8, 5, 8, 0.12, [4, 0, 4]); v.cyl(4, 4, 0, 3, 3.4, C.barkO); v.cyl(4, 4, 4, 4, 3, 0xa88a5a); v.cyl(4, 4, 4, 4, 1.2, C.wood); return v.build(); }, { solid: [0.4, 0.4, 0.5] });
P('gg_logs', () => {
  const v = new Vox(34, 8, 12, 0.12, [17, 0, 6]);
  for (const [y, z] of [[2, 2], [2, 7], [5, 4.5]]) for (let x = 0; x < 34; x++) for (let yy = 0; yy < 8; yy++) for (let zz = 0; zz < 12; zz++) if ((yy - y) ** 2 + (zz - z) ** 2 < 6.5) v.set(x, yy, zz, x === 0 || x === 33 ? 0xa88a5a : ((x + yy) % 5 ? C.barkO : C.bark));
  return v.build();
}, { solid: [2, 0.7, 0.9] });
P('gg_fern', () => {
  const v = new Vox(12, 5, 12, 0.1, [6, 0, 6]);
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; for (let t = 0; t < 6; t++) v.set(6 + Math.cos(a) * t, Math.min(4, 1 + t * 0.6) | 0, 6 + Math.sin(a) * t, t % 2 ? 0x3e6a2a : 0x4e7a32); }
  return v.build();
}, { cast: false });
P('gg_grass', () => {
  const v = new Vox(8, 5, 8, 0.1, [4, 0, 4]); const r = hrng(3);
  for (let i = 0; i < 16; i++) { const x = r() * 8 | 0, z = r() * 8 | 0, h = 1 + r() * 4 | 0; v.box(x, 0, z, x, h, z, i % 3 ? 0x6a7a3a : 0x8a8a4a); }
  return v.build();
}, { cast: false });
P('gg_flowers', () => {
  const v = new Vox(8, 3, 8, 0.1, [4, 0, 4]); const r = hrng(9);
  for (let i = 0; i < 14; i++) { const x = r() * 8 | 0, z = r() * 8 | 0; v.box(x, 0, z, x, 1, z, 0x4a6a2a); v.set(x, 2, z, [0xd84a3a, 0xe8d040, 0xe8e0f0, 0xb060c8][i % 4]); }
  return v.build();
}, { cast: false });
P('gg_bush', () => {         // dense mediterranean shrub
  const v = new Vox(14, 9, 14, 0.12, [7, 0, 7]);
  v.sphere(7, 3, 7, 6.2, (x, y, z) => ((x * 3 + y * 5 + z) % 7 === 0 ? 0x5a7236 : ((x + z) % 3 ? 0x34502a : 0x2a4422)), 0.7);
  return v.build();
}, {});

// rocks of several sizes (mountain debris, outcrop dressing)
P('gg_rock_s', () => { const v = new Vox(12, 8, 12, 0.15, [6, 0, 6]); rockBlob(v, 101, 3, 6, 1, 6, 8, 6, 8); return v.build(); }, { solid: [0.7, 0.7, 0.9] });
P('gg_rock_m', () => { const v = new Vox(18, 14, 16, 0.2, [9, 0, 8]); rockBlob(v, 202, 5, 9, 1, 8, 13, 11, 12); return v.build(); }, { solid: [1.5, 1.3, 2.2] });
P('gg_rock_m2', () => { const v = new Vox(20, 12, 14, 0.2, [10, 0, 7]); rockBlob(v, 303, 6, 10, 1, 7, 16, 9, 10); return v.build(); }, { solid: [1.7, 1.1, 1.9] });
P('gg_rock_l', () => { const v = new Vox(28, 24, 24, 0.25, [14, 0, 12]); rockBlob(v, 404, 8, 14, 2, 12, 22, 20, 18); return v.build(); }, { solid: [3, 2.6, 4.5] });
P('gg_rock_l2', () => { const v = new Vox(32, 20, 22, 0.25, [16, 0, 11]); rockBlob(v, 505, 9, 16, 2, 11, 26, 16, 16); return v.build(); }, { solid: [3.5, 2.4, 3.8] });
P('gg_boulder', () => { const v = new Vox(14, 12, 14, 0.2, [7, 0, 7]); v.sphere(7, 5.5, 7, 6.2, C.rock, 0.9); shadeRock(v, 66); return v.build(); }, { solid: [1.2, 1.2, 2.1] });
P('gg_crag', () => {         // tall limestone spire
  const v = new Vox(16, 40, 16, 0.25, [8, 0, 8]); const r = hrng(808);
  for (let y = 0; y < 40; y++) { const rr = 6.5 * (1 - y / 46) + Math.sin(y * 0.7) * 0.6; v.cyl(8 + Math.sin(y * 0.21) * 1.2, 8 + Math.cos(y * 0.17), y, y, rr * (0.8 + r() * 0.25), C.rock); }
  shadeRock(v, 808);
  return v.build();
}, { solid: [1.6, 1.6, 9] });
P('gg_slab', () => {         // flat layered limestone shelf
  const v = new Vox(30, 8, 20, 0.25, [15, 0, 10]); const r = hrng(909);
  for (let y = 0; y < 8; y++) { const sh = y * 1.1; for (let z = 0; z < 20; z++) for (let x = 0; x < 30; x++) { const dx = (x - 15) / (15 - sh * 0.6), dz = (z - 10) / (10 - sh * 0.5); if (dx * dx + dz * dz < 1 - r() * 0.08) v.set(x, y, z, C.rock); } }
  shadeRock(v, 909);
  return v.build();
}, { solid: [3.2, 2, 1.8] });
P('gg_scree', () => {
  const v = new Vox(16, 3, 16, 0.12, [8, 0, 8]); const r = hrng(41);
  for (let i = 0; i < 26; i++) { const x = r() * 15 | 0, z = r() * 15 | 0, s = r() * 2 | 0; v.box(x, 0, z, x + s, r() * 2 | 0, z + s, [C.rock, C.rockL, C.rockD][i % 3]); }
  return v.build();
}, { cast: false });

// ------------------------------------------------------------------ WRECKAGE (Adorned Wreckage, Broken Earth)
P('gg_wreck_ring', () => {   // giant fuselage ring lying on its side, adorned with cloth + string lights
  const v = new Vox(38, 36, 22, 0.25, [19, 0, 11]); const r = hrng(12);
  for (let y = 0; y < 36; y++) for (let x = 0; x < 38; x++) {
    const d = Math.hypot(x - 18.5, y - 17.5);
    if (d < 17.5 && d > 14.5) v.box(x, y, 0, x, y, 21, (xx, yy, zz) => (zz % 7 === 0 ? C.steelD : (d > 16.8 ? C.concL : ((xx + yy) % 9 === 0 ? C.rust : 0xc8c2b4))));
  }
  for (let i = 0; i < 18; i++) { const a = r() * Math.PI, x = 18.5 + Math.cos(a) * 17.6, y = 17.5 + Math.sin(a) * 17.6; const c = [C.cloth1, C.cloth2, C.cloth3, C.cloth4][i % 4]; for (let k = 0; k < 4; k++) v.set(x, y - k, 21 - (i % 3), c); }
  for (let i = 0; i < 30; i++) { const a = Math.PI * i / 30, x = 18.5 + Math.cos(a) * 17.6, y = 17.5 + Math.sin(a) * 17.6; if (i % 2) v.set(x, y, 21, C.gY); }
  v.glow(C.gY);
  return v.build();
}, { solid: [4.6, 2.7, 8] });
P('gg_wreck_engine', () => {
  const v = new Vox(26, 20, 42, 0.25, [13, 0, 21]);
  for (let z = 0; z < 42; z++) for (let y = 0; y < 20; y++) for (let x = 0; x < 26; x++) {
    const rr = 9.5 - Math.max(0, z - 30) * 0.4, d = Math.hypot(x - 12.5, y - 9.5);
    if (d < rr) v.set(x, y, z, d > rr - 1.2 ? ((z % 6 === 0) ? C.steelD : 0xb8b4a6) : (z < 2 ? C.black : -1));
  }
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; for (let t = 2; t < 8; t++) v.set(12.5 + Math.cos(a) * t, 9.5 + Math.sin(a) * t, 3, C.steelL); }
  for (let i = 0; i < 40; i++) v.set(3 + (i * 7) % 20, 1 + (i * 5) % 18, 6 + (i * 11) % 30, C.rust);
  return v.build();
}, { solid: [3.2, 5.2, 4.8] });
P('gg_wreck_fin', () => {
  const v = new Vox(6, 30, 26, 0.25, [3, 0, 13]);
  for (let y = 0; y < 30; y++) { const z0 = Math.round(y * 0.5), z1 = 25 - Math.round(y * 0.15); v.box(2, y, z0, 3, y, z1, (x, yy, z) => ((z + yy) % 8 === 0 ? C.steelD : 0xc8c2b4)); }
  v.box(1, 0, 0, 4, 2, 25, C.rust);
  for (let y = 4; y < 26; y += 5) v.box(1, y, 14, 1, y + 2, 16, C.cloth1);
  return v.build();
}, { solid: [0.6, 3.2, 6] });
P('gg_husk_big', () => {    // felled heavy ARK walker (Deforestr / Broken Earth set dressing)
  const v = new Vox(40, 18, 40, 0.25, [20, 0, 20]); const r = hrng(51);
  v.box(10, 2, 12, 29, 12, 29, 0x34363a); v.box(12, 12, 14, 27, 14, 27, 0x4a4e54); v.box(16, 14, 17, 23, 16, 24, 0x2a2c30);
  v.box(17, 7, 30, 22, 10, 33, 0x4a4e54); v.box(18, 8, 34, 21, 9, 34, C.rustD);
  for (const [ax, az, bx, bz] of [[10, 14, 0, 2], [29, 14, 39, 4], [10, 27, 2, 39], [29, 27, 38, 37]]) for (let t = 0; t <= 1; t += 0.04) { const x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = 6 - 5 * t; v.box(x | 0, y | 0, z | 0, (x | 0) + 1, (y | 0) + 1, (z | 0) + 1, t > 0.5 ? 0x2a2c30 : 0x3a3c42); }
  for (let i = 0; i < 60; i++) { const x = 10 + r() * 20 | 0, z = 12 + r() * 18 | 0; v.set(x, 12 + (r() * 3 | 0), z, i % 3 ? C.rust : 0x6a4a30); }
  v.box(16, 15, 30, 23, 15, 31, 0x5a1a10);
  return v.build();
}, { solid: [5, 4.2, 3.4] });

// ------------------------------------------------------------------ FORT / VILLAGE / RURAL
P('gg_merlon', () => { const v = new Vox(5, 5, 5, 0.25, [2.5, 0, 2.5]); v.box(0, 0, 0, 4, 4, 4, (x, y, z) => ((x + y * 2 + z) % 5 === 0 ? 0x8a7e66 : 0xa0947a)); return v.build(); }, {});
P('gg_fortruin', () => {
  const v = new Vox(24, 18, 10, 0.25, [12, 0, 5]); const r = hrng(61);
  for (let x = 0; x < 24; x++) { const h = 6 + Math.round(10 * Math.abs(Math.sin(x * 0.31 + 1)) * (0.6 + r() * 0.4)); v.box(x, 0, 1, x, h, 8, (xx, y, z) => ((xx + y * 3) % 7 === 0 ? 0x7a6e58 : ((y >> 1) % 2 ? 0x9a8e74 : 0xa89a80))); }
  for (let i = 0; i < 20; i++) v.set(r() * 24 | 0, 0, r() * 10 | 0, 0x8a7e66);
  return v.build();
}, { solid: [3, 1, 3.5] });
P('gg_well', () => {
  const v = new Vox(16, 22, 16, 0.1, [8, 0, 8]);
  for (let y = 0; y < 8; y++) for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, z - 7.5); if (d < 7.5 && d > 5.5) v.set(x, y, z, (x + y * 3 + z) % 4 ? 0xa0947a : 0x7a6e58); }
  v.box(1, 8, 7, 1, 18, 8, C.woodD); v.box(14, 8, 7, 14, 18, 8, C.woodD); v.box(1, 18, 7, 14, 18, 8, C.wood);
  v.box(0, 19, 3, 15, 20, 12, C.tile); v.box(7, 12, 7, 8, 14, 8, C.woodL);
  for (let z = 6; z < 10; z++) for (let x = 6; x < 10; x++) v.set(x, 2, z, 0x2a4048);
  return v.build();
}, { solid: [0.8, 0.8, 1.0] });
P('gg_cart', () => {
  const v = new Vox(14, 10, 26, 0.1, [7, 0, 13]);
  v.box(1, 4, 2, 12, 5, 19, C.wood); v.box(1, 6, 2, 1, 9, 19, C.woodL); v.box(12, 6, 2, 12, 9, 19, C.woodL); v.box(1, 6, 2, 12, 9, 2, C.woodL);
  for (const x of [0, 13]) for (let a = 0; a < 16; a++) v.set(x, 4 + Math.round(Math.sin(a / 16 * 6.28) * 3.5), 10 + Math.round(Math.cos(a / 16 * 6.28) * 3.5), C.woodD);
  v.box(5, 4, 20, 5, 4, 25, C.woodD); v.box(8, 4, 20, 8, 4, 25, C.woodD);
  v.box(2, 6, 4, 11, 7, 16, C.hay);
  return v.build();
}, { solid: [0.7, 1.2, 0.9] });
P('gg_haybale', () => { const v = new Vox(12, 10, 12, 0.1, [6, 0, 6]); for (let x = 0; x < 12; x++) for (let y = 0; y < 10; y++) for (let z = 0; z < 12; z++) if ((y - 4.5) ** 2 + (z - 5.5) ** 2 < 25) v.set(x, y, z, (x + y) % 3 ? C.hay : 0xa88838); return v.build(); }, { solid: [0.6, 0.6, 1] });
P('gg_woodpile', () => {
  const v = new Vox(20, 10, 8, 0.1, [10, 0, 4]);
  for (let y = 0; y < 10; y += 2) for (let x = (y % 4 ? 1 : 0); x < 20; x += 2) v.box(x, y, 0, x + 1, y + 1, 7, (xx, yy, z) => (z === 7 ? 0xb89868 : C.barkO));
  v.box(0, 0, 0, 0, 9, 7, C.woodD); v.box(19, 0, 0, 19, 9, 7, C.woodD);
  return v.build();
}, { solid: [1, 0.4, 1] });
P('gg_beehive', () => {
  const v = new Vox(7, 10, 7, 0.1, [3.5, 0, 3.5]);
  v.box(1, 0, 1, 1, 2, 1, C.woodD); v.box(5, 0, 5, 5, 2, 5, C.woodD); v.box(1, 0, 5, 1, 2, 5, C.woodD); v.box(5, 0, 1, 5, 2, 1, C.woodD);
  v.box(0, 3, 0, 6, 8, 6, (x, y) => (y % 2 ? 0xe8e0c0 : 0xd8b040)); v.box(0, 9, 0, 6, 9, 6, C.steelL); v.box(2, 3, 6, 4, 3, 6, C.black);
  return v.build();
}, { solid: [0.35, 0.35, 0.9] });
P('gg_shrine', () => {      // wayside shrine with a candle
  const v = new Vox(8, 20, 6, 0.1, [4, 0, 3]);
  v.box(1, 0, 1, 6, 14, 4, 0xb0a48a); v.box(2, 8, 4, 5, 12, 4, -1); v.box(2, 8, 3, 5, 12, 3, 0x3a5a8a);
  v.box(0, 15, 0, 7, 16, 5, C.tile); v.box(1, 17, 1, 6, 17, 4, C.tile); v.box(3, 18, 2, 4, 19, 3, C.white);
  v.set(3, 8, 4, C.gO); v.glow(C.gO);
  return v.build();
}, { solid: [0.35, 0.25, 1.6] });
P('gg_tent', () => {
  const v = new Vox(20, 12, 26, 0.15, [10, 0, 13]);
  for (let y = 0; y < 12; y++) { const hw = Math.round(9.5 - y * 0.8); v.box(10 - hw, y, 1, 9 + hw, y, 24, (x, yy, z) => (z === 1 || z === 24 ? 0x4a5a3a : (yy % 3 ? 0x6a7a4a : 0x5a6a3e))); }
  v.box(8, 0, 24, 11, 6, 24, 0x2a2a22);
  return v.build();
}, { solid: [1.4, 1.8, 1.6] });
P('gg_tarp', () => {        // blue tarp lean-to on poles (raider camps)
  const v = new Vox(30, 16, 24, 0.12, [15, 0, 12]);
  for (const x of [1, 28]) { v.box(x, 0, 2, x, 15, 2, C.woodD); v.box(x, 0, 21, x, 8, 21, C.woodD); }
  for (let z = 2; z <= 21; z++) { const y = 15 - Math.round((z - 2) * 7 / 19); v.box(0, y, z, 29, y, z, (x) => (x % 6 === 0 ? 0x2a5a8a : C.tarp)); }
  return v.build();
}, { solid: [0.15, 0.15, 1.8] });
P('gg_campfire', () => {
  const v = new Vox(10, 5, 10, 0.1, [5, 0, 5]);
  for (let a = 0; a < 12; a++) v.set(5 + Math.cos(a / 12 * 6.28) * 4, 0, 5 + Math.sin(a / 12 * 6.28) * 4, 0x6a665e);
  v.box(3, 0, 4, 6, 1, 5, C.barkO); v.box(4, 0, 3, 5, 1, 6, C.bark);
  v.box(4, 2, 4, 5, 3, 5, C.gO); v.set(4, 4, 5, C.gY); v.glow(C.gO).glow(C.gY);
  return v.build();
}, { cast: false });
P('gg_sign', () => {
  const v = new Vox(14, 18, 3, 0.1, [7, 0, 1.5]);
  v.box(6, 0, 1, 7, 14, 1, C.woodD); v.box(0, 10, 0, 13, 15, 2, C.woodL); v.box(1, 12, 2, 12, 13, 2, C.white);
  return v.build();
}, { solid: [0.15, 0.15, 1.5] });
P('gg_crates', () => {      // stacked supply crates
  const v = new Vox(16, 14, 12, 0.12, [8, 0, 6]);
  v.box(0, 0, 0, 7, 6, 11, (x, y, z) => (x === 0 || x === 7 || y === 6 ? C.woodD : C.wood));
  v.box(8, 0, 1, 15, 6, 10, (x, y, z) => (x === 8 || x === 15 || y === 6 ? C.woodD : C.woodL));
  v.box(2, 7, 2, 11, 13, 9, (x, y, z) => (y === 13 || x === 2 || x === 11 ? 0x3a4a3a : 0x4a5a46));
  v.box(5, 10, 10, 8, 11, 10, C.haz);
  return v.build();
}, { solid: [0.95, 0.7, 1.6] });
P('gg_pallet', () => {
  const v = new Vox(12, 8, 10, 0.1, [6, 0, 5]);
  v.box(0, 0, 0, 11, 1, 9, C.woodL);
  for (const [x, z] of [[0, 0], [6, 0], [0, 5], [6, 5]]) v.box(x + 1, 2, z + 1, x + 5, 5, z + 4, (xx, y) => (y === 5 ? 0xb8a878 : 0xa89868));
  v.box(3, 6, 2, 8, 7, 7, 0xb8a878);
  return v.build();
}, { solid: [0.6, 0.5, 0.8] });
P('gg_col', () => { const v = new Vox(1, 1, 1, 0.05, [0.5, 0, 0.5]); v.set(0, 0, 0, C.black); return v.build(); }, { cast: false });

// ------------------------------------------------------------------ FURNITURE (interiors)
P('gg_bed', () => { const v = new Vox(10, 6, 20, 0.1, [5, 0, 10]); v.box(0, 0, 0, 9, 2, 19, C.woodD); v.box(0, 3, 0, 9, 3, 19, 0xd8d0c0); v.box(0, 4, 6, 9, 4, 19, 0x6a3a3a); v.box(1, 4, 1, 8, 5, 4, C.white); v.box(0, 0, 0, 9, 6, 0, C.wood); return v.build(); }, { solid: [0.5, 1.0, 0.6] });
P('gg_bunk', () => { const v = new Vox(10, 19, 20, 0.1, [5, 0, 10]); for (const y of [2, 11]) { v.box(0, y, 0, 9, y, 19, C.steelD); v.box(0, y + 1, 0, 9, y + 2, 19, 0x6a7a5a); v.box(1, y + 3, 1, 8, y + 3, 3, C.white); } for (const [x, z] of [[0, 0], [9, 0], [0, 19], [9, 19]]) v.box(x, 0, z, x, 18, z, C.steel); return v.build(); }, { solid: [0.5, 1.0, 1.8] });
P('gg_table', () => { const v = new Vox(16, 9, 10, 0.1, [8, 0, 5]); v.box(0, 7, 0, 15, 8, 9, C.woodL); for (const [x, z] of [[1, 1], [14, 1], [1, 8], [14, 8]]) v.box(x, 0, z, x, 6, z, C.woodD); v.box(3, 9 - 0, 3, 5, 8, 4, C.white); v.set(10, 8, 5, 0x3a6a8a); return v.build(); }, { solid: [0.8, 0.5, 0.85] });
P('gg_chair', () => { const v = new Vox(5, 10, 5, 0.1, [2.5, 0, 2.5]); v.box(0, 4, 0, 4, 4, 4, C.wood); v.box(0, 5, 0, 4, 9, 0, C.wood); for (const [x, z] of [[0, 0], [4, 0], [0, 4], [4, 4]]) v.box(x, 0, z, x, 3, z, C.woodD); return v.build(); }, {});
P('gg_sofa', () => { const v = new Vox(20, 8, 9, 0.1, [10, 0, 4.5]); v.box(0, 0, 0, 19, 3, 8, 0x5a4a6a); v.box(0, 4, 0, 19, 7, 2, 0x5a4a6a); v.box(0, 4, 0, 1, 5, 8, 0x4a3a5a); v.box(18, 4, 0, 19, 5, 8, 0x4a3a5a); return v.build(); }, { solid: [1.0, 0.45, 0.75] });
P('gg_stove', () => { const v = new Vox(8, 10, 7, 0.1, [4, 0, 3.5]); v.box(0, 0, 0, 7, 8, 6, C.steelD); v.box(1, 2, 6, 6, 5, 6, C.black); v.set(3, 3, 6, C.gO); v.box(5, 9, 2, 6, 9, 3, C.steel); v.glow(C.gO); return v.build(); }, { solid: [0.4, 0.35, 0.9] });
P('gg_wardrobe', () => { const v = new Vox(12, 20, 6, 0.1, [6, 0, 3]); v.box(0, 0, 0, 11, 19, 5, C.wood); v.box(5, 1, 5, 6, 18, 5, C.woodD); v.set(4, 10, 5, C.haz); v.set(7, 10, 5, C.haz); return v.build(); }, { solid: [0.6, 0.3, 2] });
P('gg_desk', () => { const v = new Vox(14, 13, 7, 0.1, [7, 0, 3.5]); v.box(0, 7, 0, 13, 7, 6, C.steelL); v.box(0, 0, 0, 0, 6, 6, C.steel); v.box(9, 0, 0, 13, 6, 6, C.steel); v.box(4, 8, 1, 8, 12, 2, C.black); v.box(5, 9, 2, 7, 11, 2, C.gB); v.box(4, 8, 4, 8, 8, 5, C.steelD); v.glow(C.gB); return v.build(); }, { solid: [0.7, 0.35, 0.8] });
P('gg_console', () => { const v = new Vox(18, 13, 7, 0.1, [9, 0, 3.5]); v.box(0, 0, 0, 17, 8, 6, C.steelD); v.box(0, 9, 0, 17, 12, 2, C.steel); for (let x = 1; x < 17; x += 2) v.set(x, 8, 5, [C.gG, C.gR, C.gY, C.gB][x % 4]); v.box(2, 10, 3, 7, 11, 3, C.gB); v.box(10, 10, 3, 15, 11, 3, C.gG); v.glow(C.gG).glow(C.gR).glow(C.gY).glow(C.gB); return v.build(); }, { solid: [0.9, 0.35, 0.9] });
P('gg_server', () => { const v = new Vox(7, 21, 9, 0.1, [3.5, 0, 4.5]); v.box(0, 0, 0, 6, 20, 8, C.black); for (let y = 2; y < 19; y += 2) { v.box(1, y, 8, 5, y, 8, C.steelD); v.set(1 + (y % 4), y, 8, y % 6 ? C.gG : C.gB); } v.glow(C.gG).glow(C.gB); return v.build(); }, { solid: [0.35, 0.45, 2] });
P('gg_lockers', () => { const v = new Vox(16, 19, 5, 0.1, [8, 0, 2.5]); v.box(0, 0, 0, 15, 18, 4, (x) => (x % 4 === 0 ? C.steelD : 0x5a6a62)); for (let x = 2; x < 16; x += 4) { v.box(x, 13, 4, x + 1, 13, 4, C.black); v.set(x + 1, 9, 4, C.steelL); } return v.build(); }, { solid: [0.8, 0.25, 1.9] });
P('gg_cabinet', () => { const v = new Vox(9, 12, 6, 0.1, [4.5, 0, 3]); v.box(0, 0, 0, 8, 11, 5, 0x6a6e66); for (const y of [2, 6, 10]) v.box(1, y, 5, 7, y, 5, C.steelD); return v.build(); }, { solid: [0.45, 0.3, 1.2] });
P('gg_fridge', () => { const v = new Vox(7, 18, 7, 0.1, [3.5, 0, 3.5]); v.box(0, 0, 0, 6, 17, 6, 0xd8d8d0); v.box(5, 8, 6, 5, 12, 6, C.steelD); v.box(0, 13, 6, 6, 13, 6, C.steelL); return v.build(); }, { solid: [0.35, 0.35, 1.8] });
P('gg_altar', () => { const v = new Vox(22, 11, 9, 0.1, [11, 0, 4.5]); v.box(0, 0, 0, 21, 9, 8, 0xc8bca0); v.box(1, 10, 1, 20, 10, 7, C.white); for (const x of [3, 18]) { v.box(x, 11 - 1, 4, x, 10, 4, C.haz); } return v.build(); }, { solid: [1.1, 0.45, 1] });
P('gg_pew', () => { const v = new Vox(30, 9, 6, 0.1, [15, 0, 3]); v.box(0, 4, 1, 29, 4, 5, C.wood); v.box(0, 5, 5, 29, 8, 5, C.wood); for (const x of [0, 29]) v.box(x, 0, 1, x, 8, 5, C.woodD); return v.build(); }, { solid: [1.5, 0.3, 0.8] });

// ------------------------------------------------------------------ ROAD MARKINGS + SMALL KIT (flat, rotatable along diagonal roads)
P('gg_lane', () => { const v = new Vox(26, 1, 2, 0.1, [13, 0, 1]); v.box(0, 0, 0, 25, 0, 1, 0xd8d4c4); return v.build(); }, { cast: false });
P('gg_laney', () => { const v = new Vox(26, 1, 2, 0.1, [13, 0, 1]); v.box(0, 0, 0, 25, 0, 1, 0xd8a828); return v.build(); }, { cast: false });
P('gg_stopline', () => { const v = new Vox(40, 1, 5, 0.1, [20, 0, 2.5]); v.box(0, 0, 0, 39, 0, 4, 0xd8d4c4); return v.build(); }, { cast: false });
P('gg_chevron', () => { const v = new Vox(30, 1, 30, 0.1, [15, 0, 15]); for (let z = 0; z < 30; z++) for (let x = 0; x < 30; x++) if ((((x + z) / 5) | 0) % 2 === 0 && x > 1 && x < 28) v.set(x, 0, z, z < 2 || z > 27 ? 0xd8a828 : 0xd8a828); return v.build(); }, { cast: false });
P('gg_cone', () => { const v = new Vox(5, 8, 5, 0.1, [2.5, 0, 2.5]); v.box(0, 0, 0, 4, 0, 4, C.black); for (let y = 1; y < 8; y++) { v.box(2 - (y < 6 ? 1 : 0), y, 2 - (y < 6 ? 1 : 0), 2 + (y < 6 ? 1 : 0), y, 2 + (y < 6 ? 1 : 0), y === 4 || y === 5 ? C.white : 0xe86a20); } return v.build(); }, { cast: true });
P('gg_curb', () => { const v = new Vox(40, 3, 5, 0.1, [20, 0, 2.5]); v.box(0, 0, 0, 39, 2, 4, (x) => ((x / 5 | 0) % 2 ? C.haz : C.concL)); return v.build(); }, { solid: [2, 0.25, 0.3] });
P('gg_flag', () => { const v = new Vox(14, 70, 3, 0.1, [1, 0, 1.5]); v.box(0, 0, 1, 1, 69, 1, C.steelL); v.box(2, 56, 1, 13, 66, 1, (x, y) => (y > 61 ? C.green : (y > 58 ? C.white : C.green))); return v.build(); }, { solid: [0.1, 0.1, 7] });
P('gg_fence', () => { const v = new Vox(30, 20, 1, 0.1, [15, 0, 0.5]); for (const x of [0, 29]) v.box(x, 0, 0, x, 19, 0, C.steelD); for (let y = 2; y < 19; y++) for (let x = 1; x < 29; x++) if ((x + y) % 3 === 0 || (x - y + 60) % 3 === 0) v.set(x, y, 0, 0x7a8288); v.box(0, 19, 0, 29, 19, 0, C.steel); return v.build(); }, { solid: [1.5, 0.08, 2] });
P('gg_laundry', () => { const v = new Vox(40, 24, 2, 0.1, [20, 0, 1]); v.box(0, 0, 1, 0, 23, 1, C.woodD); v.box(39, 0, 1, 39, 23, 1, C.woodD); v.box(1, 22, 1, 38, 22, 1, C.steelL); for (let i = 0; i < 6; i++) v.box(3 + i * 6, 15 + (i % 2) * 2, 0, 6 + i * 6, 21, 0, [C.white, C.cloth1, C.cloth3, C.cream, C.cloth2, 0x8a9aa8][i]); return v.build(); }, { solid: [0.1, 0.1, 2.2] });
P('gg_planter', () => { const v = new Vox(10, 8, 10, 0.1, [5, 0, 5]); v.box(1, 0, 1, 8, 4, 8, 0xa8623c); v.box(2, 4, 2, 7, 4, 7, 0x3a2a1a); v.sphere(5, 6, 5, 3.2, (x, y, z) => ((x + y + z) % 4 ? 0x4a7a2e : 0xd84a3a), 0.8); return v.build(); }, { solid: [0.45, 0.45, 0.8] });
P('gg_bench', () => { const v = new Vox(16, 8, 5, 0.1, [8, 0, 2.5]); v.box(0, 4, 0, 15, 4, 4, C.woodL); v.box(0, 5, 4, 15, 7, 4, C.woodL); for (const x of [1, 14]) v.box(x, 0, 0, x, 3, 4, C.steelD); return v.build(); }, { solid: [0.8, 0.25, 0.8] });

// ------------------------------------------------------------------ CRASH DEBRIS
P('gg_hullplate', () => {    // curved hull panel half-buried in the ground
  const v = new Vox(30, 10, 18, 0.2, [15, 0, 9]); const r = hrng(71);
  for (let x = 0; x < 30; x++) for (let z = 0; z < 18; z++) { const y = Math.round(Math.sin(z / 17 * Math.PI) * 6 + (x % 9 === 0 ? 1 : 0)); const c = (x + z) % 11 === 0 ? C.rust : (z % 6 === 0 ? C.steelD : 0xc8c2b4); v.set(x, y, z, c); v.set(x, Math.max(0, y - 1), z, C.steelL); }
  for (let i = 0; i < 6; i++) { const x = 2 + r() * 26 | 0, z = 2 + r() * 14 | 0; v.box(x, 0, z, x + 1, 9, z, C.steelD); }
  return v.build();
}, { solid: [2.8, 1.6, 1.4] });
P('gg_strut', () => {        // bent structural girder
  const v = new Vox(44, 12, 4, 0.2, [22, 0, 2]);
  for (let x = 0; x < 44; x++) { const y = Math.round(Math.max(0, 10 - Math.abs(x - 26) * 0.5)); v.box(x, y, 1, x, y + 1, 2, x % 6 === 0 ? C.steelD : C.rust); if (x % 4 === 0) v.box(x, Math.max(0, y - 2), 1, x, y, 2, C.steel); }
  return v.build();
}, { solid: [3.5, 0.4, 1.4] });
P('gg_lantern', () => { const v = new Vox(5, 16, 5, 0.1, [2.5, 0, 2.5]); v.box(2, 0, 2, 2, 11, 2, C.woodD); v.box(1, 11, 1, 3, 14, 3, C.gO); v.box(1, 15, 1, 3, 15, 3, C.steelD); v.glow(C.gO); return v.build(); }, { solid: [0.15, 0.15, 1.4] });
P('gg_totem', () => {        // raider shrine of ARK parts adorned with cloth
  const v = new Vox(12, 30, 12, 0.1, [6, 0, 6]);
  v.box(5, 0, 5, 6, 26, 6, C.woodD); v.box(2, 18, 2, 9, 23, 9, 0x3a3c42); v.box(4, 20, 9, 7, 21, 9, C.gR); v.box(3, 24, 3, 8, 26, 8, 0x5a5e66);
  for (let y = 6; y < 18; y += 3) v.box(0, y, 5, 11, y, 6, [C.cloth1, C.cloth2, C.cloth3, C.cloth4][y % 4]);
  v.glow(C.gR);
  return v.build();
}, { solid: [0.5, 0.5, 2.6] });

// ------------------------------------------------------------------ ARK PERCHES (v2: static ARK stand ON these, platform top = 7.0 m)
function perchTower(wall, trim) {
  const v = new Vox(16, 34, 16, 0.25, [8, 0, 8]);
  for (const [x, z] of [[1, 1], [13, 1], [1, 13], [13, 13]]) v.box(x, 0, z, x + 1, 26, z + 1, C.steelD);
  for (let y = 5; y < 26; y += 7) { v.box(1, y, 1, 14, y, 1, C.steel); v.box(1, y, 14, 14, y, 14, C.steel); v.box(1, y, 1, 1, y, 14, C.steel); v.box(14, y, 1, 14, y, 14, C.steel); }
  for (let i = 0; i < 12; i++) { v.set(2 + i, 4 + i * 1.8, 1, C.steel); v.set(13 - i, 4 + i * 1.8, 14, C.steel); }
  for (let y = 0; y < 27; y += 2) v.box(7, y, 15, 8, y, 15, C.steelL);            // ladder (south face)
  v.box(6, 0, 15, 6, 27, 15, C.steelD); v.box(9, 0, 15, 9, 27, 15, C.steelD);
  v.box(0, 26, 0, 15, 27, 15, wall);                                              // deck (top at 7.0 m)
  v.box(0, 26, 0, 15, 26, 15, trim);
  for (let i = 0; i < 16; i++) { if (i % 3 !== 1) { v.box(i, 28, 0, i, 31, 0, C.steel); v.box(i, 28, 15, i, 31, 15, C.steel); v.box(0, 28, i, 0, 31, i, C.steel); v.box(15, 28, i, 15, 31, i, C.steel); } }
  v.box(0, 31, 0, 15, 31, 0, trim); v.box(0, 31, 15, 15, 31, 15, trim); v.box(0, 31, 0, 0, 31, 15, trim); v.box(15, 31, 0, 15, 31, 15, trim);
  v.box(0, 28, 0, 3, 29, 1, 0x8a7a56); v.box(12, 28, 14, 15, 29, 15, 0x8a7a56);   // sandbags
  v.box(14, 28, 14, 15, 33, 15, C.steelD); v.set(14, 33, 15, C.gW); v.set(1, 32, 1, C.gR);
  v.glow(C.gW).glow(C.gR);
  return v.build();
}
P('gg_perchtower', () => perchTower(C.woodD, C.haz), {});
P('gg_perchtower_w', () => perchTower(C.white, C.white), {});      // the white lookout tower (quest)
P('gg_printer', () => {        // field printer that spits the Locked Gate security code
  const v = new Vox(10, 11, 7, 0.1, [5, 0, 3.5]);
  v.box(0, 0, 0, 9, 6, 6, C.steelD); v.box(1, 7, 1, 8, 9, 5, 0xd8d4c8); v.box(2, 9, 6, 7, 9, 6, C.white);
  v.box(1, 3, 7 - 1, 3, 4, 6, C.gG); v.box(6, 8, 6, 8, 8, 6, C.gR); v.glow(C.gG).glow(C.gR);
  return v.build();
}, { solid: [0.5, 0.35, 1.0] });
P('gg_gatebalcony', () => {      // steel sentry balcony cantilevered off the gate face; deck top 8.0 m, back edge at local z = -1.75
  const v = new Vox(16, 36, 14, 0.25, [8, 0, 7]);
  v.box(0, 30, 0, 15, 31, 13, C.steelD); v.box(0, 31, 0, 15, 31, 13, (x, y, z) => ((x + z) % 4 === 0 ? C.steel : C.steelD));
  for (let i = 0; i < 16; i++) if (i % 3 !== 1) { v.box(i, 32, 13, i, 35, 13, C.steel); }
  for (let i = 0; i < 14; i++) if (i % 3 !== 1) { v.box(0, 32, i, 0, 35, i, C.steel); v.box(15, 32, i, 15, 35, i, C.steel); }
  v.box(0, 35, 0, 0, 35, 13, C.haz); v.box(15, 35, 0, 15, 35, 13, C.haz); v.box(0, 35, 13, 15, 35, 13, C.haz);
  for (const x of [1, 14]) for (let t = 0; t <= 12; t++) v.box(x, 18 + t, Math.round(t), x, 18 + t, Math.round(t), C.steelD);   // diagonal struts into the wall
  v.box(0, 17, 0, 15, 18, 1, C.steelD);
  v.box(14, 32, 1, 15, 34, 2, C.steelD); v.set(15, 34, 2, C.gW); v.glow(C.gW);
  return v.build();
}, {});
P('gg_venthouse', () => {     // small ventilation housing next to an airshaft head: louvred box + duct
  const v = new Vox(16, 12, 12, 0.15, [8, 0, 6]);
  v.box(0, 0, 0, 15, 1, 11, C.concD);
  v.box(1, 2, 1, 14, 9, 10, (x, y) => (y % 2 ? C.steel : C.steelD));
  v.box(1, 10, 1, 14, 10, 10, C.steelL); v.box(5, 11, 4, 10, 11, 7, C.steelD);
  for (let y = 3; y < 9; y += 2) v.box(2, y, 11, 13, y, 11, C.black);
  v.box(0, 4, 4, 0, 7, 7, C.haz);
  return v.build();
}, { solid: [1.2, 0.9, 1.7] });
P('gg_hatchsign', () => {     // raider hatch marker post with a yellow plate
  const v = new Vox(6, 22, 3, 0.1, [3, 0, 1.5]);
  v.box(2, 0, 1, 3, 20, 1, C.steelD); v.box(0, 14, 0, 5, 19, 2, C.haz); v.box(1, 16, 2, 4, 17, 2, C.black);
  v.set(2, 21, 1, C.gY); v.glow(C.gY);
  return v.build();
}, { solid: [0.12, 0.12, 2] });
