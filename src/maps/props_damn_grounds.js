// Dam Grounds custom voxel props (prefix dg_): plant machinery, dam hardware, marsh plants, furniture, the
// marina boats, billboards, playground kit. Imported for its side effects by damn_grounds.js.
// Everything here is procedural + deterministic (no Math.random).
import { registerProp, Vox } from '../engine/models.js';

// ---------------------------------------------------------------- palette
const P = {
  conc: 0x8a8476, concD: 0x6a655c, concL: 0xa49e8e, stain: 0x5a584e,
  steel: 0x5a6266, steelD: 0x3a4044, steelL: 0x7a8488, rust: 0x7e4622, rustD: 0x5a3018,
  yellow: 0xd8a020, black: 0x1e1e20, red: 0xb83a2a, white: 0xd8d4c8, glass: 0x9ec8d0, glassD: 0x6a9aa8,
  wood: 0x6e5030, woodD: 0x4a3420, leaf: 0x34562a, leafD: 0x24401e, leafL: 0x4a6a2e, moss: 0x5a6a34,
  bark: 0x4a3a2a, barkD: 0x34281e, reed: 0x6a7a3a, reedT: 0x5a3a22, water: 0x2a5058,
  // emissive (unique colours so only these glow)
  gRed: 0xff3020, gAmber: 0xffb040, gLamp: 0xfff0c0, gCyan: 0x50e8ff, gGreen: 0x50ff70, gPurple: 0xd070ff, gToxic: 0x90ff40,
};
const R = (a) => { let s = a >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };

// 3D voxel line
function line(v, x0, y0, z0, x1, y1, z1, c, th = 0) {
  const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)) * 1.5));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t), z = Math.round(z0 + (z1 - z0) * t);
    if (th) v.box(x - th, y, z - th, x + th, y, z + th, c); else v.set(x, y, z, c);
  }
}
const reg = (k, fn, info) => registerProp(k, fn, info);

// ---------------------------------------------------------------- hydroponics
// geodesic dome frame (Ø14 m, 7.5 m tall), mostly open/broken panes so the inside stays readable
reg('dg_dome', () => {
  const S = 0.25, N = 58, H = 31, v = new Vox(N, H, N, S, [N / 2, 0, N / 2]);
  const cx = N / 2, cz = N / 2, r = 27.5, rnd = R(77);
  for (let y = 0; y < H; y++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) {
    const dx = x + 0.5 - cx, dz = z + 0.5 - cz, dy = (y + 0.5) / 1.08;
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (d > r || d < r - 1.3) continue;
    const lat = Math.asin(Math.min(1, dy / r)), lon = Math.atan2(dz, dx);
    const ml = Math.abs(((lon * 10 / Math.PI) % 1 + 1) % 1 - 0.5) > 0.42;          // meridians
    const pl = Math.abs(((lat * 9 / Math.PI) % 1 + 1) % 1 - 0.5) > 0.40;           // parallels
    const diag = Math.abs((((lon * 10 + lat * 9) / Math.PI) % 1 + 1) % 1 - 0.5) > 0.45;
    if (ml || pl || diag) v.set(x, y, z, y < 2 ? P.concD : (x + z) % 7 === 0 ? P.rust : P.white);
    else {
      const cell = Math.floor(lon * 10 / Math.PI) * 31 + Math.floor(lat * 9 / Math.PI) * 7;
      const keep = ((cell * 2654435761) >>> 0) % 100;
      if (keep < 26 && y > 3) v.set(x, y, z, keep < 8 ? P.glassD : P.glass);      // some intact panes
    }
  }
  v.box(27, 29, 27, 30, 30, 30, P.steelL);                                         // crown hub
  v.cyl(cx, cz, 0, 1, r, P.concD); v.cyl(cx, cz, 0, 1, r - 2, -1);                // footing ring (hollow)
  for (let y = 0; y < 2; y++) for (let z = 0; z < N; z++) for (let x = 0; x < N; x++) { const d = Math.hypot(x + .5 - cx, z + .5 - cz); if (d < r - 1.6) v.set(x, y, z, -1); }
  return v.build();
}, { cast: true });

// greenhouse tunnel segment (4 m long along z, 6 m wide, 3.4 m tall): hoops + torn film
reg('dg_arch', () => {
  const v = new Vox(26, 15, 17, 0.25, [13, 0, 8.5]);
  for (let z = 0; z < 17; z++) for (let y = 0; y < 15; y++) for (let x = 0; x < 26; x++) {
    const dx = (x + .5 - 13) / 12.5, dy = (y + .5) / 13.5, d = Math.hypot(dx, dy);
    if (d > 1 || d < 0.9) continue;
    if (z % 8 === 0) v.set(x, y, z, P.steelL);
    else if (((x * 3 + z * 5 + y) % 11) < 4 && y > 2) v.set(x, y, z, (x + y) % 3 ? 0xc8d4c8 : 0xa8b8b0);
  }
  for (let z = 0; z < 17; z++) v.set(13, 13, z, P.steel);
  return v.build();
}, { cast: true });

reg('dg_hydrorack', () => {
  const v = new Vox(20, 19, 8, 0.1, [10, 0, 4]);
  for (const x of [0, 19]) v.box(x, 0, 0, x, 18, 7, P.steelL);
  for (const y of [3, 9, 15]) {
    v.box(0, y, 0, 19, y, 7, P.steel);
    for (let x = 1; x < 19; x++) for (let z = 1; z < 7; z++) if ((x + z) % 2 === 0) v.box(x, y + 1, z, x, y + 2 + ((x * 7 + z) % 3 === 0 ? 1 : 0), z, (x * 3 + z) % 4 ? P.leafL : 0x7ab040);
    v.box(1, y + 5, 3, 18, y + 5, 4, P.gPurple);
  }
  v.box(0, 18, 0, 19, 18, 7, P.steelD);
  v.glow(P.gPurple);
  return v.build();
}, { solid: [1.0, 0.4, 1.9] });

reg('dg_planter', () => {
  const v = new Vox(24, 7, 10, 0.1, [12, 0, 5]);
  v.box(0, 0, 0, 23, 3, 9, P.woodD); v.box(1, 3, 1, 22, 3, 8, 0x3a2c1c);
  for (let x = 2; x < 22; x += 2) for (let z = 2; z < 8; z += 3) v.box(x, 4, z, x, 4 + ((x + z) % 3), z, (x + z) % 4 ? P.leafL : 0xa8c040);
  return v.build();
}, { solid: [1.2, 0.5, 0.5] });

// ---------------------------------------------------------------- swamp vegetation
reg('dg_reeds', () => {
  const v = new Vox(12, 18, 12, 0.1, [6, 0, 6]), r = R(5);
  for (let i = 0; i < 26; i++) {
    const x = 1 + Math.floor(r() * 10), z = 1 + Math.floor(r() * 10), h = 7 + Math.floor(r() * 9);
    v.box(x, 0, z, x, h, z, r() < 0.5 ? P.reed : 0x7a8a46);
    if (r() < 0.45) v.box(x, h + 1, z, x, h + 2, z, P.reedT);
  }
  return v.build();
}, { cast: false });

reg('dg_grass', () => {
  const v = new Vox(10, 6, 10, 0.1, [5, 0, 5]), r = R(9);
  for (let i = 0; i < 22; i++) { const x = Math.floor(r() * 10), z = Math.floor(r() * 10); v.box(x, 0, z, x, 1 + Math.floor(r() * 4), z, r() < 0.3 ? 0x7a7a3a : r() < 0.6 ? 0x4a6a2a : 0x5a7430); }
  return v.build();
}, { cast: false });

reg('dg_lily', () => {
  const v = new Vox(16, 1, 16, 0.1, [8, 0, 8]), r = R(13);
  for (let i = 0; i < 6; i++) { const x = 2 + r() * 12, z = 2 + r() * 12, rr = 1.2 + r() * 1.6; v.cyl(x, z, 0, 0, rr, i % 3 ? 0x3e6a2a : 0x4e7a32); }
  v.set(7, 0, 7, 0xe8d0e0); v.set(11, 0, 4, 0xf0e8f0);
  return v.build();
}, { cast: false });

// drooping swamp willow (~7 m)
reg('dg_willow', () => {
  const v = new Vox(30, 46, 30, 0.15, [15, 0, 15]), r = R(21);
  v.box(14, 0, 14, 16, 22, 16, P.bark); v.box(13, 0, 13, 17, 2, 17, P.barkD);
  line(v, 15, 18, 15, 6, 30, 10, P.bark); line(v, 15, 20, 15, 24, 31, 20, P.bark); line(v, 15, 22, 15, 14, 34, 25, P.bark);
  for (let k = 0; k < 5; k++) v.sphere(15 + (r() - .5) * 12, 32 + r() * 6, 15 + (r() - .5) * 12, 6 + r() * 3, (x, y, z) => (x * 3 + y + z * 5) % 7 === 0 ? P.leafL : (y % 4 === 0 ? P.leafD : 0x3a5a28), 0.7);
  for (let z = 0; z < 30; z++) for (let x = 0; x < 30; x++) {                    // hanging fronds
    const d = Math.hypot(x - 15, z - 15); if (d < 6 || d > 14 || (x * 7 + z * 13) % 4) continue;
    let top = -1; for (let y = 45; y > 20; y--) if (v.solid(x, y, z)) { top = y; break; }
    if (top > 0) v.box(x, Math.max(6, top - 10 - ((x + z) % 6)), z, x, top, z, (x + z) % 3 ? 0x46602a : 0x56702e);
  }
  return v.build();
}, { solid: [0.35, 0.35, 4.5] });

// bald cypress with buttress roots + hanging moss (~9 m)
reg('dg_cypress', () => {
  const v = new Vox(30, 60, 30, 0.15, [15, 0, 15]), r = R(33);
  for (let y = 0; y < 44; y++) { const rr = y < 7 ? 4.4 - y * 0.42 : 1.5 - y * 0.008; v.cyl(15, 15, y, y, rr, y % 5 === 0 ? P.barkD : 0x5e4a38); }
  for (const [dx, dz] of [[7, 1], [-7, 2], [1, 7], [-2, -7], [5, -5]]) line(v, 15, 3, 15, 15 + dx, 0, 15 + dz, P.barkD);
  for (const [dx, dz] of [[9, 4], [-8, -6], [3, -9]]) v.box(15 + dx, 0, 15 + dz, 15 + dx, 1, 15 + dz, P.barkD);   // knees
  const layers = [[30, 10, 0, 0], [37, 12, 3, -2], [44, 10, -3, 3], [50, 7, 1, 1], [55, 4, 0, 0]];
  for (const [y, rad, ox, oz] of layers) for (let z = 0; z < 30; z++) for (let x = 0; x < 30; x++) {
    const d = Math.hypot(x + .5 - 15 - ox, z + .5 - 15 - oz); if (d > rad + (x * 7 + z * 13) % 3 * 0.5) continue;
    const th = d < rad * 0.6 ? 3 : 2;
    for (let yy = y; yy < y + th; yy++) v.set(x, yy, z, (x * 3 + z + yy) % 7 === 0 ? 0x4e6230 : (yy === y ? 0x26381e : (x + z) % 4 ? 0x30482a : 0x3a5430));
  }
  for (let i = 0; i < 40; i++) { const a = r() * 6.283, d = 5 + r() * 6, x = Math.round(15 + Math.cos(a) * d), z = Math.round(15 + Math.sin(a) * d); let top = -1; for (let y = 59; y > 20; y--) if (v.solid(x, y, z)) { top = y; break; } if (top > 0) v.box(x, top - 4 - Math.floor(r() * 6), z, x, top - 1, z, r() < 0.5 ? 0x8a9a78 : 0x7a8a6a); }
  return v.build();
}, { solid: [0.45, 0.45, 6] });

reg('dg_log', () => {
  const v = new Vox(44, 6, 8, 0.1, [22, 0, 4]);
  for (let x = 0; x < 44; x++) v.box(x, 0, 1, x, 4, 6, (x % 9 === 0) ? P.barkD : P.bark);
  v.box(0, 1, 2, 0, 3, 5, 0x9a7a52); v.box(43, 1, 2, 43, 3, 5, 0x9a7a52);
  for (let x = 4; x < 40; x += 3) v.set(x, 5, 3 + (x % 3), P.moss);
  return v.build();
}, { solid: [2.1, 0.35, 0.5] });

reg('dg_stump', () => { const v = new Vox(10, 8, 10, 0.1, [5, 0, 5]); v.cyl(5, 5, 0, 6, 3.6, P.bark); v.cyl(5, 5, 7, 7, 3.2, 0x9a7a52); v.cyl(5, 5, 0, 1, 4.8, P.barkD); return v.build(); }, { solid: [0.35, 0.35, 0.7] });

reg('dg_toxic', () => {
  const v = new Vox(6, 9, 6, 0.1, [3, 0, 3]);
  v.cyl(3, 3, 0, 8, 3, 0xa8a020); v.cyl(3, 3, 3, 4, 3, P.black); v.box(2, 8, 2, 3, 8, 3, P.gToxic); v.box(1, 0, 5, 3, 0, 6, P.gToxic);
  v.glow(P.gToxic);
  return v.build();
}, { solid: [0.3, 0.3, 0.9] });

// ---------------------------------------------------------------- power / electrical
// lattice pylon (16 m): arms at y=14.5 m, x = ±3 m
reg('dg_pylon', () => {
  const S = 0.2, v = new Vox(36, 84, 12, S, [18, 0, 6]);
  const lat = (y) => 1 + Math.min(10, Math.max(0, (70 - y) * 0.14));
  for (let y = 0; y < 78; y++) {
    const w = lat(y), c = y % 8 < 1 ? P.steelD : P.steel;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.set(18 + sx * w, y, 6 + sz * Math.min(4, w * 0.4), c);
    if (y % 8 === 0) { v.box(18 - w, y, 6 - Math.min(4, w * 0.4), 18 + w, y, 6 - Math.min(4, w * 0.4), c); v.box(18 - w, y, 6 + Math.min(4, w * 0.4), 18 + w, y, 6 + Math.min(4, w * 0.4), c); }
    if (y % 8 === 4) { line(v, 18 - w, y - 4, 6, 18 + w, y + 4, 6, P.steelD); }
  }
  v.box(2, 72, 5, 33, 73, 7, P.steel); v.box(9, 78, 5, 26, 79, 7, P.steel);
  for (const x of [3, 18, 32]) v.box(x, 69, 6, x, 71, 6, 0xd8d0b0);
  v.box(17, 80, 5, 19, 83, 7, P.steelD); v.set(18, 83, 6, P.gRed); v.glow(P.gRed);
  return v.build();
}, { solid: [1.4, 0.8, 14] });

// three sagging cables spanning 40 m along +z, attach height at y=0 (place with yAbs)
reg('dg_cable40', () => {
  const S = 0.125, L = 320, v = new Vox(50, 26, L + 1, S, [25, 24, 0]);
  for (const x of [1, 25, 49]) for (let z = 0; z <= L; z++) { const t = z / L, sag = 4 * t * (1 - t) * 2.6 / S; v.set(x, 24 - Math.round(sag), z, 0x1a1a1c); }
  return v.build();
}, { cast: false });

reg('dg_transformer', () => {
  const v = new Vox(24, 30, 18, 0.1, [12, 0, 9]);
  v.box(0, 0, 0, 23, 2, 17, P.concD);
  v.box(3, 3, 3, 20, 18, 14, 0x5a6a5a); for (let x = 3; x <= 20; x += 2) { v.box(x, 4, 1, x, 17, 2, 0x4a5a4a); v.box(x, 4, 15, x, 17, 16, 0x4a5a4a); }
  for (const x of [6, 12, 18]) { v.box(x, 19, 8, x, 26, 9, 0xc8c0a8); for (let y = 20; y < 27; y += 2) v.box(x - 1, y, 7, x + 1, y, 10, 0x9a9488); }
  v.box(8, 10, 15, 15, 13, 15, P.yellow); v.box(10, 11, 15, 13, 12, 15, P.black);
  return v.build();
}, { solid: [1.2, 0.9, 2.4] });

reg('dg_fusebox', () => {
  const v = new Vox(10, 16, 5, 0.1, [5, 0, 2.5]);
  v.box(0, 0, 0, 9, 15, 4, 0x4a5a5a); v.box(1, 2, 5, 8, 13, 5, 0x3a4848); v.box(2, 10, 5, 3, 11, 5, P.gAmber); v.box(6, 10, 5, 7, 11, 5, P.gGreen);
  v.box(2, 4, 5, 7, 5, 5, P.yellow); v.glow(P.gAmber); v.glow(P.gGreen);
  return v.build();
}, { solid: [0.5, 0.25, 1.6] });

reg('dg_generator', () => {
  const v = new Vox(35, 24, 20, 0.15, [17.5, 0, 10]);
  v.box(0, 0, 0, 34, 1, 19, P.concD);
  for (let x = 3; x < 32; x++) for (let y = 2; y < 23; y++) for (let z = 2; z < 18; z++) {
    const dy = (y - 12) / 9.5, dz = (z - 10) / 8; if (dy * dy + dz * dz <= 1) v.set(x, y, z, x % 7 === 0 ? P.steelD : (y > 17 ? 0x5a7a8a : 0x4a6a7a));
  }
  v.box(1, 2, 5, 2, 19, 15, P.steelD); v.box(32, 2, 5, 33, 19, 15, P.steelD);
  for (let x = 4; x < 31; x += 2) v.set(x, 12, 18, P.yellow);
  v.box(13, 22, 8, 20, 23, 12, P.steel); v.box(15, 13, 18, 18, 15, 19, P.gAmber); v.glow(P.gAmber);
  return v.build();
}, { solid: [2.5, 1.4, 3.3] });

reg('dg_turbine', () => {
  const v = new Vox(40, 24, 40, 0.15, [20, 0, 20]);
  v.cyl(20, 20, 0, 3, 19.5, P.concD); v.cyl(20, 20, 4, 14, 15, 0x4a6a7a); v.cyl(20, 20, 15, 16, 16, P.steelD);
  v.cyl(20, 20, 17, 22, 7, 0x5a7a8a); v.cyl(20, 20, 23, 23, 4, P.yellow);
  for (let a = 0; a < 12; a++) { const x = 20 + Math.cos(a * Math.PI / 6) * 15.5, z = 20 + Math.sin(a * Math.PI / 6) * 15.5; v.box(x, 4, z, x + 1, 15, z + 1, P.steelD); }
  return v.build();
}, { solid: [2.9, 2.9, 3.4] });

// ---------------------------------------------------------------- dam machinery
// radial floodgate + hoist house (7 m wide along x, faces +z)
reg('dg_floodgate', () => {
  const v = new Vox(36, 40, 16, 0.2, [18, 0, 8]);
  v.box(0, 0, 0, 3, 30, 15, P.conc); v.box(32, 0, 0, 35, 30, 15, P.conc);                 // piers
  for (let x = 4; x < 32; x++) for (let y = 0; y < 22; y++) { const z = 10 - Math.round(Math.sqrt(Math.max(0, 22 * 22 - (y - 2) * (y - 2))) * 0.25); v.set(x, y, Math.max(0, z), y % 4 === 0 ? P.rustD : P.rust); }
  for (const x of [5, 30]) line(v, x, 4, 4, x, 20, 13, P.steelD, 0);
  v.box(0, 30, 0, 35, 31, 15, P.concD); v.box(6, 32, 2, 29, 38, 13, 0x6a7a6a); v.box(6, 39, 1, 29, 39, 14, P.steelD);
  v.box(10, 34, 14, 14, 36, 14, P.glassD); v.box(20, 34, 14, 24, 36, 14, P.glassD);
  for (let x = 0; x < 36; x += 2) v.set(x, 31, 15, P.yellow);
  v.box(17, 33, 14, 18, 33, 14, P.gAmber); v.glow(P.gAmber);
  return v.build();
}, { solid: [3.6, 1.5, 7.8] });

// gantry crane spanning 12 m along x, 9 m tall
reg('dg_gantry', () => {
  const v = new Vox(62, 46, 10, 0.2, [31, 0, 5]);
  for (const x of [1, 60]) { v.box(x - 1, 0, 1, x + 1, 42, 2, P.yellow); v.box(x - 1, 0, 7, x + 1, 42, 8, P.yellow); for (let y = 2; y < 42; y += 6) line(v, x, y, 2, x, y + 5, 7, P.steelD); v.box(x - 2, 0, 0, x + 2, 1, 9, P.black); }
  v.box(0, 42, 0, 61, 45, 9, P.yellow); for (let x = 0; x < 62; x += 4) v.box(x, 43, 0, x + 1, 44, 0, P.black);
  v.box(26, 37, 2, 35, 41, 7, P.steelD); line(v, 30, 36, 4, 30, 18, 4, 0x2a2a2a); v.box(28, 16, 3, 32, 18, 6, P.rust);
  v.box(30, 46 - 1, 4, 31, 45, 5, P.gRed); v.glow(P.gRed);
  return v.build();
}, { solid: [6.2, 1.0, 9] });

reg('dg_bigpipe', () => {
  const v = new Vox(54, 17, 17, 0.15, [27, 0, 8.5]);
  for (let x = 0; x < 54; x++) for (let y = 0; y < 17; y++) for (let z = 0; z < 17; z++) { const d = Math.hypot(y - 8.5, z - 8.5); if (d < 8.3) v.set(x, y, z, x % 13 < 1 ? P.steelD : (y > 12 ? 0x6a7a7a : 0x5a6a6a)); }
  for (let x = 2; x < 54; x += 13) v.box(x, 0, 1, x + 1, 1, 15, P.concD);
  return v.build();
}, { solid: [4, 1.25, 2.4] });

reg('dg_valve', () => {
  const v = new Vox(16, 18, 12, 0.1, [8, 0, 6]);
  for (let y = 0; y < 10; y++) for (let z = 0; z < 12; z++) for (let x = 0; x < 16; x++) if (Math.hypot(y - 5, z - 6) < 4.5) v.set(x, y, z, x === 0 || x === 15 ? P.steelD : P.steel);
  v.box(7, 10, 5, 8, 13, 6, P.steelD);
  for (let a = 0; a < 20; a++) { const x = 8 + Math.cos(a / 20 * 6.283) * 5, z = 6 + Math.sin(a / 20 * 6.283) * 5; v.set(x, 14, z, P.red); }
  line(v, 3, 14, 6, 13, 14, 6, P.red); line(v, 8, 14, 1, 8, 14, 11, P.red);
  return v.build();
}, { solid: [0.8, 0.6, 1.2] });

reg('dg_pump', () => {
  const v = new Vox(30, 20, 18, 0.1, [15, 0, 9]);
  v.box(0, 0, 0, 29, 2, 17, P.concD); v.cyl(9, 9, 3, 15, 6, 0x3a6a8a); v.cyl(9, 9, 16, 17, 4, P.steelD);
  v.box(16, 3, 4, 27, 11, 13, 0x4a5a6a); v.box(16, 12, 6, 27, 12, 11, P.steelD);
  for (let x = 0; x < 16; x++) for (let y = 4; y < 10; y++) if (Math.hypot(y - 7, 0) < 3) v.box(x, y, 0, x, y, 2, P.rust);
  v.box(20, 8, 14, 22, 9, 14, P.gGreen); v.glow(P.gGreen);
  return v.build();
}, { solid: [1.5, 0.9, 1.7] });

// ---------------------------------------------------------------- towers + landmarks
reg('dg_watertower', () => {
  const v = new Vox(34, 64, 34, 0.2, [17, 0, 17]);
  for (const [x, z] of [[6, 6], [27, 6], [6, 27], [27, 27]]) { v.box(x, 0, z, x + 1, 40, z + 1, P.steel); }
  for (let y = 6; y < 40; y += 11) { line(v, 6, y, 6, 27, y + 9, 6, P.steelD); line(v, 27, y, 27, 6, y + 9, 27, P.steelD); line(v, 6, y, 27, 6, y + 9, 6, P.steelD); line(v, 27, y, 6, 27, y + 9, 27, P.steelD); }
  v.cyl(17, 17, 40, 41, 15.5, P.steelD);
  for (let y = 42; y < 58; y++) v.cyl(17, 17, y, y, 15, y % 5 === 0 ? 0x8a8a7a : (y > 52 ? 0xb0aa98 : 0x9e9886));
  for (let y = 58; y < 63; y++) v.cyl(17, 17, y, y, 15 - (y - 57) * 2.6, 0x7a7466);
  for (let a = 0; a < 40; a++) { const x = 17 + Math.cos(a / 40 * 6.283) * 15, z = 17 + Math.sin(a / 40 * 6.283) * 15; if ((a * 7) % 5 < 2) v.box(x, 44 + (a % 4), z, x, 50 + (a % 6), z, P.rust); }
  v.box(16, 63, 16, 17, 63, 17, P.gRed); v.glow(P.gRed);
  return v.build();
}, { solid: [3.2, 3.2, 12] });

// red aviation beacon on a post
reg('dg_beacon', () => {
  const v = new Vox(6, 42, 6, 0.1, [3, 0, 3]);
  v.box(2, 0, 2, 3, 36, 3, P.steelD); for (let y = 0; y < 36; y += 6) v.box(1, y, 1, 4, y, 4, P.yellow);
  v.box(1, 37, 1, 4, 40, 4, P.gRed); v.box(2, 41, 2, 3, 41, 3, P.steel);
  v.glow(P.gRed);
  return v.build();
}, { solid: [0.2, 0.2, 3.6] });

reg('dg_floodlight', () => {
  const v = new Vox(16, 72, 8, 0.1, [8, 0, 4]);
  v.box(6, 0, 2, 9, 2, 5, P.concD); v.box(7, 0, 3, 8, 64, 4, P.steelD);
  v.box(1, 64, 3, 14, 65, 4, P.steel);
  for (const x of [1, 10]) { v.box(x, 66, 2, x + 4, 70, 6, P.steel); v.box(x + 1, 66, 7, x + 3, 69, 7, P.gLamp); }
  v.glow(P.gLamp);
  return v.build();
}, { solid: [0.25, 0.25, 6.5] });

// 4.2 m lattice perch for a Sentinal emplacement on the dam
reg('dg_sentmast', () => {
  const v = new Vox(16, 44, 16, 0.1, [8, 0, 8]);
  v.box(0, 0, 0, 15, 1, 15, P.concD);
  for (const [x, z] of [[1, 1], [14, 1], [1, 14], [14, 14]]) v.box(x, 0, z, x, 40, z, P.steel);
  for (let y = 4; y < 38; y += 9) { line(v, 1, y, 1, 14, y + 8, 1, P.steelD); line(v, 14, y, 14, 1, y + 8, 14, P.steelD); line(v, 1, y, 14, 1, y + 8, 1, P.steelD); line(v, 14, y, 1, 14, y + 8, 14, P.steelD); }
  v.box(0, 40, 0, 15, 41, 15, P.steelD);
  for (let x = 0; x < 16; x += 3) { v.set(x, 42, 0, P.yellow); v.set(x, 42, 15, P.yellow); }
  return v.build();
}, { solid: [0.8, 0.8, 4.2] });

// extraction signage: green lit board on two posts (cargo elevators), small post sign (hatches)
reg('dg_extsign', () => {
  const v = new Vox(24, 30, 4, 0.1, [12, 0, 2]);
  for (const x of [2, 21]) v.box(x, 0, 1, x, 22, 2, P.steelD);
  v.box(0, 20, 0, 23, 29, 1, 0x1e3a28); v.box(1, 21, 2, 22, 28, 2, P.gGreen);
  v.box(4, 23, 3, 8, 26, 3, P.white); v.box(9, 24, 3, 17, 25, 3, P.white); v.box(15, 23, 3, 16, 26, 3, P.white); v.box(17, 24, 3, 18, 25, 3, P.white);
  v.box(0, 19, 0, 23, 19, 1, P.yellow);
  v.glow(P.gGreen);
  return v.build();
}, { solid: [1.2, 0.12, 2.9] });
reg('dg_hatchsign', () => {
  const v = new Vox(10, 22, 3, 0.1, [5, 0, 1.5]);
  v.box(4, 0, 1, 5, 16, 1, P.steelD); v.box(0, 15, 0, 9, 21, 1, P.yellow); v.box(1, 16, 2, 8, 20, 2, P.black); v.box(3, 17, 2, 6, 19, 2, P.gAmber);
  v.glow(P.gAmber);
  return v.build();
}, { solid: [0.5, 0.1, 2.1] });
// concrete parapet segment around a stairwell opening on a tunnel lid (2 m long)
reg('dg_shaftrail', () => {
  const v = new Vox(20, 10, 3, 0.1, [10, 0, 1.5]);
  for (const x of [0, 9, 19]) v.box(x, 0, 0, x, 9, 2, P.steelD);
  v.box(0, 9, 0, 19, 9, 2, P.yellow); v.box(0, 5, 1, 19, 5, 1, P.steel);
  return v.build();
}, { solid: [1.0, 0.12, 1.0] });

reg('dg_walllamp', () => { const v = new Vox(4, 4, 3, 0.1, [2, 0, 1.5]); v.box(0, 0, 0, 3, 3, 0, P.steelD); v.box(1, 1, 1, 2, 2, 2, P.gLamp); v.glow(P.gLamp); return v.build(); }, { cast: false });

reg('dg_satdish', () => {
  const v = new Vox(30, 30, 30, 0.1, [15, 0, 15]);
  v.box(13, 0, 13, 16, 12, 16, P.steelD);
  for (let z = 0; z < 30; z++) for (let y = 8; y < 30; y++) for (let x = 0; x < 30; x++) { const d = Math.hypot(x - 15, y - 19); if (d < 13 && Math.abs(z - (12 + d * d / 26)) < 0.8) v.set(x, y, z, P.white); }
  line(v, 15, 19, 12, 15, 19, 25, P.steel); v.box(14, 18, 25, 16, 20, 26, P.steelD);
  return v.build();
}, { solid: [1.0, 1.0, 2.5] });

reg('dg_antennamast', () => {
  const v = new Vox(12, 90, 12, 0.15, [6, 0, 6]);
  for (let y = 0; y < 86; y++) { const w = Math.max(1, Math.floor((86 - y) / 22)); for (const sx of [-1, 1]) for (const sz of [-1, 1]) v.set(6 + sx * w, y, 6 + sz * w, y % 6 === 0 ? P.red : P.steelL); if (y % 6 === 0) v.box(6 - w, y, 6 - w, 6 + w, y, 6 + w, P.steel); }
  v.box(5, 86, 5, 6, 88, 6, P.gRed); v.glow(P.gRed);
  return v.build();
}, { solid: [0.6, 0.6, 12] });

// ---------------------------------------------------------------- industrial clutter
function container(color, dark) {
  const v = new Vox(31, 13, 12, 0.2, [15.5, 0, 6]);
  v.box(0, 0, 0, 30, 12, 11, (x, y, z) => (x % 2 === 0 ? dark : color));
  v.box(0, 0, 0, 0, 12, 11, dark); v.box(30, 0, 0, 30, 12, 11, P.steelD); v.box(30, 1, 5, 30, 11, 6, P.steel);
  v.box(0, 12, 0, 30, 12, 11, (x, y, z) => ((x + z) % 7 === 0 ? 0x5a4a3a : color));
  for (let i = 0; i < 12; i++) v.set((i * 11) % 30, 11 - (i % 4), (i * 7) % 2 ? 0 : 11, P.rustD);
  return v.build();
}
reg('dg_container', () => container(0x9a4a2e, 0x7a3a22), { solid: [3.05, 1.2, 2.6] });
reg('dg_containerB', () => container(0x2e5a7a, 0x22465e), { solid: [3.05, 1.2, 2.6] });
reg('dg_containerG', () => container(0x4e6a3e, 0x3a5230), { solid: [3.05, 1.2, 2.6] });

reg('dg_truck', () => {
  const v = new Vox(16, 19, 48, 0.15, [8, 0, 24]);
  v.box(1, 2, 0, 14, 3, 47, 0x2a2a2a);
  v.box(1, 4, 35, 14, 13, 47, 0x7a6a3a); v.box(2, 9, 47, 13, 12, 47, P.glassD); v.box(1, 14, 36, 14, 14, 46, 0x6a5a32);
  v.box(0, 4, 0, 15, 17, 33, (x, y, z) => (z % 4 === 0 ? 0x5a5040 : 0x6e6448)); v.box(1, 6, 1, 14, 17, 32, -1);
  for (const z of [4, 12, 27, 41]) { v.box(0, 0, z, 1, 3, z + 4, P.black); v.box(14, 0, z, 15, 3, z + 4, P.black); }
  for (let i = 0; i < 20; i++) v.set((i * 7) % 16, 4 + (i * 5) % 13, (i * 13) % 33, P.rust);
  return v.build();
}, { solid: [1.2, 3.6, 2.4] });

reg('dg_scaffold', () => {
  const v = new Vox(40, 62, 20, 0.1, [20, 0, 10]);
  for (const x of [0, 19, 39]) for (const z of [0, 19]) v.box(x, 0, z, x, 61, z, P.steelL);
  for (const y of [20, 40, 60]) { v.box(0, y, 0, 39, y, 19, (x, yy, z) => (x % 4 < 3 ? P.wood : P.woodD)); v.box(0, y + 1, 0, 39, y + 1, 0, P.steelL); }
  for (const y of [0, 20, 40]) { line(v, 0, y, 0, 19, y + 19, 0, P.steel); line(v, 19, y, 19, 39, y + 19, 19, P.steel); }
  return v.build();
}, { solid: [2.0, 1.0, 6] });

reg('dg_sign', () => {
  const v = new Vox(40, 34, 4, 0.1, [20, 0, 2]);
  for (const x of [3, 36]) v.box(x, 0, 1, x + 1, 20, 2, P.steelD);
  v.box(0, 18, 0, 39, 33, 2, 0xd8d4c8); v.box(1, 19, 3, 38, 32, 3, 0x2a5a7a);
  v.box(3, 29, 3, 14, 31, 3, 0xd8d4c8); v.box(3, 25, 3, 36, 26, 3, 0xd8d4c8); v.box(3, 22, 3, 28, 23, 3, 0xd8d4c8);
  v.box(30, 27, 3, 36, 31, 3, P.yellow); v.box(0, 17, 3, 39, 17, 3, P.gCyan);
  v.glow(P.gCyan);
  return v.build();
}, { solid: [2.0, 0.15, 3.3] });

reg('dg_signred', () => {
  const v = new Vox(30, 30, 3, 0.1, [15, 0, 1.5]);
  for (const x of [2, 27]) v.box(x, 0, 1, x, 16, 1, P.steelD);
  v.box(0, 14, 0, 29, 29, 1, P.white); v.box(1, 15, 2, 28, 28, 2, P.red); v.box(4, 24, 2, 25, 26, 2, P.white); v.box(4, 19, 2, 18, 21, 2, P.white);
  return v.build();
}, { solid: [1.5, 0.1, 2.9] });

reg('dg_barrier', () => {
  const v = new Vox(20, 9, 6, 0.1, [10, 0, 3]);
  for (let y = 0; y < 9; y++) { const w = y < 2 ? 0 : Math.min(2, Math.floor((y - 1) / 3)); v.box(0, y, w, 19, y, 5 - w, (y === 6) ? 0xd8a020 : P.concL); }
  for (let x = 0; x < 20; x += 5) v.box(x, 6, 0, x + 2, 6, 5, P.black);
  return v.build();
}, { solid: [1.0, 0.3, 0.9] });

// chain-link panel: 3-voxel posts and top / bottom rails so the fence still reads as a line when seen edge-on (mesh 1 voxel)
reg('dg_fence', () => {
  const v = new Vox(30, 19, 3, 0.1, [15, 0, 1.5]);
  for (let y = 1; y < 18; y++) for (let x = 1; x < 29; x++) if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) v.set(x, y, 1, 0x6a7272);
  v.box(0, 0, 0, 29, 0, 2, P.steelD);
  v.box(0, 18, 0, 29, 18, 2, P.steelL);
  for (const x of [0, 29]) { v.box(x, 0, 0, x, 17, 2, P.steelD); v.box(x, 18, 0, x, 18, 2, P.steelL); }
  return v.build();
}, { solid: [1.5, 0.08, 1.8] });

reg('dg_rubble', () => {
  const v = new Vox(30, 22, 26, 0.1, [15, 0, 13]), r = R(41);
  for (let k = 0; k < 7; k++) { const x = 5 + r() * 20, z = 5 + r() * 16, y = r() * 8; v.box(x - 4, Math.max(0, y - 4), z - 3, x + 4 + r() * 3, y + 4 + r() * 4, z + 3 + r() * 2, (xx, yy, zz) => (yy + xx) % 7 === 0 ? P.stain : (zz % 5 === 0 ? P.concD : P.conc)); }
  for (let i = 0; i < 12; i++) { const x = r() * 30, z = r() * 26; line(v, x, 4, z, x + (r() - .5) * 10, 18 + r() * 4, z + (r() - .5) * 10, P.rustD); }
  return v.build();
}, { solid: [1.4, 1.2, 1.5] });

// broken slab with rebar (6x4 m)
reg('dg_slab', () => {
  const v = new Vox(34, 11, 20, 0.2, [15, 0, 10]), r = R(43);
  for (let x = 0; x < 30; x++) for (let z = 0; z < 20; z++) {
    if ((x > 25 && z > 15 - (x - 25) * 2) || (x < 3 && z < 5 - x)) continue;
    const y0 = Math.round(x * 0.25); v.box(x, y0, z, x, y0 + 2, z, (x + z) % 13 === 0 ? P.stain : (y0 + z) % 6 ? P.conc : P.concD);
  }
  for (let i = 0; i < 6; i++) { const z = 2 + i * 3; line(v, 29, 9, z, 33, 10, z + (r() - .5) * 2, P.rustD); }
  return v.build();
}, { solid: [2.8, 1.9, 1.5] });

// broken bridge span (girder deck 12 m along z, 9 m wide), tilted down at +z
reg('dg_brokenspan', () => {
  const v = new Vox(46, 36, 60, 0.2, [23, 0, 0]), r = R(51);
  for (let z = 0; z < 60; z++) {
    const y = Math.round(32 - z * 0.42);
    if (z > 52 && (z * 7) % 3 === 0) continue;
    v.box(0, y, z, 45, y + 2, z, (x) => (x === 0 || x === 45) ? P.concD : (x % 11 === 5 ? 0x4a4a48 : P.conc));
    v.box(0, y + 3, z, 1, y + 6, z, P.concD); v.box(44, y + 3, z, 45, y + 6, z, P.concD);
    for (const gx of [8, 22, 37]) v.box(gx - 1, Math.max(0, y - 5), z, gx + 1, y - 1, z, P.concD);
  }
  for (let i = 0; i < 14; i++) { const x = 2 + r() * 42; line(v, x, Math.round(32 - 59 * 0.42), 59, x + (r() - .5) * 4, 12 + r() * 4, 64, P.rustD); }
  return v.build();
}, { cast: true });

reg('dg_hedgehog', () => {
  const v = new Vox(16, 14, 16, 0.1, [8, 0, 8]);
  line(v, 0, 0, 0, 15, 13, 15, P.rustD, 0); line(v, 15, 0, 0, 0, 13, 15, P.rustD, 0); line(v, 8, 0, 15, 8, 13, 0, P.rust, 0);
  line(v, 1, 0, 1, 14, 12, 14, P.rust, 0); line(v, 14, 0, 1, 1, 12, 14, P.rust, 0);
  return v.build();
}, { solid: [0.7, 0.7, 1.2] });

reg('dg_tent', () => {
  const v = new Vox(27, 17, 33, 0.15, [13.5, 0, 16.5]);
  for (let z = 0; z < 33; z++) for (let x = 0; x < 27; x++) { const y = Math.round(16 - Math.abs(x - 13) * 1.15); if (y >= 0) v.box(x, Math.max(0, y - 1), z, x, y, z, (z % 7 === 0) ? 0x4a4e36 : (x < 13 ? 0x5e6644 : 0x545a3c)); }
  for (let x = 8; x < 19; x++) for (let y = 0; y < 9; y++) if (Math.abs(x - 13) < (9 - y) * 0.6) v.set(x, y, 32, 0x2a2a20);
  return v.build();
}, { solid: [2.0, 2.5, 2.4] });

reg('dg_watchtower', () => {
  const v = new Vox(32, 80, 32, 0.12, [16, 0, 16]);
  for (const [x, z] of [[2, 2], [29, 2], [2, 29], [29, 29]]) v.box(x, 0, z, x + 1, 58, z + 1, P.wood);
  for (let y = 6; y < 54; y += 12) { line(v, 2, y, 2, 29, y + 10, 2, P.woodD); line(v, 2, y, 29, 29, y + 10, 29, P.woodD); line(v, 2, y, 2, 2, y + 10, 29, P.woodD); line(v, 29, y, 2, 29, y + 10, 29, P.woodD); }
  v.box(0, 56, 0, 31, 57, 31, P.woodD); for (const s of [0, 31]) { v.box(0, 58, s, 31, 64, s, (x, y) => y === 64 ? P.wood : (x % 3 ? 0x6a6a52 : P.woodD)); v.box(s, 58, 0, s, 64, 31, (x, y, z) => y === 64 ? P.wood : (z % 3 ? 0x6a6a52 : P.woodD)); }
  for (let y = 70; y < 74; y++) v.box(-1 + (y - 70), y, -1 + (y - 70), 32 - (y - 70), y, 32 - (y - 70), 0x5a6a5a);
  for (const [x, z] of [[1, 1], [30, 1], [1, 30], [30, 30]]) v.box(x, 64, z, x, 70, z, P.wood);
  v.box(15, 74, 15, 16, 76, 16, P.gAmber); v.glow(P.gAmber);
  return v.build();
}, { solid: [1.9, 1.9, 7.5] });

reg('dg_bed', () => { const v = new Vox(9, 14, 20, 0.1, [4.5, 0, 10]); for (const y of [2, 9]) { v.box(0, y, 0, 8, y, 19, P.steelD); v.box(0, y + 1, 1, 8, y + 2, 18, 0x6a7a5a); v.box(1, y + 3, 1, 7, y + 3, 4, 0xd8d0c0); } for (const [x, z] of [[0, 0], [8, 0], [0, 19], [8, 19]]) v.box(x, 0, z, x, 13, z, P.steel); return v.build(); }, { solid: [0.45, 1.0, 1.3] });
reg('dg_sofa', () => { const v = new Vox(20, 9, 9, 0.1, [10, 0, 4.5]); v.box(0, 0, 0, 19, 4, 8, 0x6a4a3a); v.box(0, 5, 0, 19, 8, 2, 0x7a5a42); v.box(0, 5, 0, 1, 6, 8, 0x7a5a42); v.box(18, 5, 0, 19, 6, 8, 0x7a5a42); v.box(3, 5, 4, 8, 5, 7, 0x8a6a4e); return v.build(); }, { solid: [1.0, 0.45, 0.8] });
reg('dg_table', () => { const v = new Vox(14, 8, 10, 0.1, [7, 0, 5]); v.box(0, 7, 0, 13, 7, 9, P.wood); for (const [x, z] of [[0, 0], [13, 0], [0, 9], [13, 9]]) v.box(x, 0, z, x, 6, z, P.woodD); v.set(4, 8, 4, P.white).set(9, 8, 5, 0x3a6a8a); return v.build(); }, { solid: [0.7, 0.5, 0.8] });
reg('dg_desk', () => {
  const v = new Vox(16, 13, 8, 0.1, [8, 0, 4]);
  v.box(0, 7, 0, 15, 7, 7, 0x8a8478); v.box(0, 0, 0, 1, 6, 7, P.steelD); v.box(14, 0, 0, 15, 6, 7, P.steelD); v.box(10, 1, 0, 13, 6, 6, 0x6a6a64);
  v.box(4, 8, 1, 10, 12, 1, P.black); v.box(5, 9, 2, 9, 11, 2, P.gCyan); v.box(6, 8, 2, 8, 8, 4, P.steel); v.box(3, 8, 5, 11, 8, 6, 0x3a3a3a);
  v.glow(P.gCyan);
  return v.build();
}, { solid: [0.8, 0.4, 0.8] });
reg('dg_server', () => {
  const v = new Vox(8, 22, 10, 0.1, [4, 0, 5]);
  v.box(0, 0, 0, 7, 21, 9, 0x2a2e32); for (let y = 2; y < 20; y += 3) { v.box(1, y, 10, 6, y + 1, 10, 0x3a4044); v.set(2, y, 10, y % 2 ? P.gGreen : P.gAmber); v.set(4, y + 1, 10, P.gCyan); }
  v.glow(P.gGreen); v.glow(P.gAmber); v.glow(P.gCyan);
  return v.build();
}, { solid: [0.4, 0.5, 2.2] });
reg('dg_console', () => {
  const v = new Vox(24, 12, 10, 0.1, [12, 0, 5]);
  v.box(0, 0, 0, 23, 7, 6, 0x4a5258); for (let z = 0; z < 4; z++) v.box(0, 8 + Math.floor(z / 2), z, 23, 8 + Math.floor(z / 2), z, 0x3a4248);
  for (let x = 2; x < 22; x += 5) { v.box(x, 9, 7, x + 3, 11, 7, P.black); v.box(x + 1, 10, 8, x + 2, 10, 8, x % 2 ? P.gCyan : P.gGreen); }
  for (let x = 1; x < 23; x += 2) v.set(x, 8, 4, x % 3 ? P.gAmber : P.gRed);
  v.glow(P.gCyan); v.glow(P.gGreen); v.glow(P.gAmber); v.glow(P.gRed);
  return v.build();
}, { solid: [1.2, 0.5, 1.1] });
reg('dg_locker', () => { const v = new Vox(20, 19, 5, 0.1, [10, 0, 2.5]); v.box(0, 0, 0, 19, 18, 4, 0x4a5a62); for (let x = 0; x < 20; x += 5) { v.box(x, 0, 5, x, 18, 5, 0x2a3236); v.box(x + 2, 14, 5, x + 3, 15, 5, 0x2a3236); v.set(x + 3, 9, 5, P.yellow); } return v.build(); }, { solid: [1.0, 0.25, 1.9] });
reg('dg_cabinet', () => { const v = new Vox(10, 14, 6, 0.1, [5, 0, 3]); v.box(0, 0, 0, 9, 13, 5, 0x6a6a5e); for (const y of [1, 5, 9]) { v.box(1, y, 6, 8, y + 3, 6, 0x5a5a50); v.box(4, y + 2, 6, 5, y + 2, 6, P.steelL); } return v.build(); }, { solid: [0.5, 0.3, 1.4] });
reg('dg_noticeboard', () => { const v = new Vox(24, 22, 3, 0.1, [12, 0, 1.5]); for (const x of [1, 22]) v.box(x, 0, 1, x, 18, 1, P.woodD); v.box(0, 8, 0, 23, 21, 1, 0x8a6a3a); for (let i = 0; i < 9; i++) v.box(2 + (i % 4) * 5, 10 + Math.floor(i / 4) * 4, 2, 4 + (i % 4) * 5, 12 + Math.floor(i / 4) * 4, 2, [0xe8e0c8, 0xd8c890, 0xc8d8e0][i % 3]); return v.build(); }, { solid: [1.2, 0.1, 2.1] });
reg('dg_vending', () => { const v = new Vox(10, 20, 8, 0.1, [5, 0, 4]); v.box(0, 0, 0, 9, 19, 7, P.red); v.box(1, 6, 8, 6, 17, 8, P.glassD); v.box(7, 10, 8, 8, 14, 8, P.gAmber); v.box(1, 2, 8, 6, 3, 8, P.black); v.glow(P.gAmber); return v.build(); }, { solid: [0.5, 0.4, 2] });
reg('dg_medbed', () => { const v = new Vox(10, 10, 20, 0.1, [5, 0, 10]); v.box(0, 5, 0, 9, 6, 19, P.white); v.box(1, 7, 1, 8, 7, 18, 0xa8c8d0); v.box(0, 0, 0, 0, 4, 0, P.steel); v.box(9, 0, 19, 9, 4, 19, P.steel); v.box(0, 0, 19, 0, 4, 19, P.steel); v.box(9, 0, 0, 9, 4, 0, P.steel); v.box(1, 8, 1, 8, 9, 3, P.white); return v.build(); }, { solid: [0.5, 1.0, 0.8] });

// ---------------------------------------------------------------- testing annex rig
reg('dg_testrig', () => {
  const v = new Vox(40, 30, 40, 0.15, [20, 0, 20]);
  v.cyl(20, 20, 0, 1, 19.5, 0x2a2a2e); v.cyl(20, 20, 0, 1, 15, 0x161618);
  for (let a = 0; a < 8; a++) { const x = 20 + Math.cos(a * Math.PI / 4) * 17, z = 20 + Math.sin(a * Math.PI / 4) * 17; v.box(x - 1, 0, z - 1, x + 1, 22, z + 1, P.steelD); }
  for (let a = 0; a < 64; a++) { const x = 20 + Math.cos(a / 64 * 6.283) * 17, z = 20 + Math.sin(a / 64 * 6.283) * 17; v.box(x, 22, z, x, 23, z, P.steel); v.set(x, 12, z, P.gCyan); }
  v.box(18, 2, 18, 22, 8, 22, 0x3a3c42); v.box(19, 9, 19, 21, 10, 21, P.gCyan);
  v.glow(P.gCyan);
  return v.build();
}, { cast: true });

// controlled access zone: 4 switch lights above the vault door
reg('dg_puzzle', () => {
  const v = new Vox(24, 10, 3, 0.1, [12, 0, 1.5]);
  v.box(0, 0, 0, 23, 9, 1, 0x3a4044); for (let i = 0; i < 4; i++) { v.box(2 + i * 6, 3, 2, 4 + i * 6, 6, 2, i < 2 ? P.gGreen : P.gRed); }
  v.glow(P.gGreen); v.glow(P.gRed);
  return v.build();
}, { cast: false });
reg('dg_switch', () => { const v = new Vox(8, 14, 4, 0.1, [4, 0, 2]); v.box(1, 0, 1, 6, 13, 3, 0x4a5258); v.box(2, 7, 4, 5, 11, 4, P.yellow); v.box(3, 9, 4, 4, 10, 4, P.gRed); v.glow(P.gRed); return v.build(); }, { solid: [0.4, 0.2, 1.4] });

// ---------------------------------------------------------------- wrecks / battlefield
reg('dg_bigwreck', () => {
  const S = 0.25, v = new Vox(64, 30, 88, S, [32, 0, 44]), r = R(61);
  for (let z = 6; z < 80; z++) for (let x = 10; x < 54; x++) for (let y = 0; y < 22; y++) {
    const dx = (x - 32) / 22, dy = (y - 6) / 15, dz = (z - 43) / 37; if (dx * dx + dy * dy + dz * dz > 1) continue;
    if (y > 14 && ((x * 3 + z * 7) % 13 === 0)) continue;
    v.set(x, y, z, (y > 16 ? 0x3a3634 : (x + z) % 9 === 0 ? 0x4a2a1a : 0x2a2826));
  }
  for (let i = 0; i < 6; i++) { const z = 14 + i * 12, side = i % 2 ? 1 : -1; line(v, 32 + side * 18, 6, z, 32 + side * 30, 2, z + (r() - .5) * 10, 0x2a2826, 1); line(v, 32 + side * 30, 2, z, 32 + side * 31, 0, z + 4, 0x3a3634, 1); }
  v.box(28, 10, 80, 36, 14, 84, 0x3a3634); v.box(30, 11, 85, 34, 13, 85, 0xff6020); v.glow(0xff6020);
  for (let i = 0; i < 40; i++) v.set(10 + r() * 44, 0, 4 + r() * 80, 0x4a4442);
  return v.build();
}, { solid: [5.0, 9.0, 3.5] });

reg('dg_huskbig', () => {
  const v = new Vox(40, 18, 34, 0.15, [20, 0, 17]), r = R(63);
  v.box(10, 0, 8, 29, 10, 25, 0x2a2826); v.box(12, 10, 10, 27, 13, 23, 0x3a3634); v.box(17, 13, 14, 22, 15, 19, 0x5a3a24);
  for (const [a, b] of [[[10, 4, 10], [0, 0, 2]], [[29, 4, 10], [39, 0, 3]], [[10, 4, 24], [1, 0, 33]], [[29, 4, 24], [38, 0, 32]]]) line(v, a[0], a[1], a[2], b[0], b[1], b[2], 0x34302c, 1);
  for (let i = 0; i < 30; i++) v.set(10 + r() * 20, 10 + r() * 4, 8 + r() * 17, 0x6a4a30);
  return v.build();
}, { solid: [1.6, 1.4, 1.6] });

// soccer goal (Water Towers quest flavour)
reg('dg_goal', () => { const v = new Vox(50, 18, 14, 0.1, [25, 0, 7]); v.box(0, 0, 0, 1, 17, 1, P.white); v.box(48, 0, 0, 49, 17, 1, P.white); v.box(0, 16, 0, 49, 17, 1, P.white); for (let x = 0; x < 50; x += 3) line(v, x, 16, 1, x, 0, 13, 0x9a9a90); for (let y = 0; y < 16; y += 3) v.box(0, y, Math.round(13 - y * 0.75), 49, y, Math.round(13 - y * 0.75), 0x9a9a90); return v.build(); }, { solid: [2.5, 0.6, 1.7] });
reg('dg_grave', () => { const v = new Vox(8, 12, 12, 0.1, [4, 0, 6]); v.box(3, 0, 1, 4, 11, 2, P.woodD); v.box(0, 8, 1, 7, 9, 2, P.woodD); v.box(1, 0, 3, 6, 1, 11, 0x4a3a2a); v.box(2, 11, 1, 5, 11, 2, 0x8a8a6a); return v.build(); }, { solid: [0.35, 0.5, 0.9] });
reg('dg_memorial', () => { const v = new Vox(20, 26, 12, 0.1, [10, 0, 6]); v.box(0, 0, 0, 19, 3, 11, P.concD); v.box(4, 4, 3, 15, 22, 8, P.conc); v.box(6, 12, 9, 13, 18, 9, 0xb0a070); v.box(8, 23, 4, 11, 25, 7, P.steel); v.set(9, 2, 11, P.gAmber); v.glow(P.gAmber); return v.build(); }, { solid: [1.0, 0.6, 2.4] });
reg('dg_flagpole', () => { const v = new Vox(14, 70, 4, 0.1, [1, 0, 2]); v.box(0, 0, 1, 1, 69, 2, P.steelL); v.box(2, 54, 1, 13, 68, 1, (x, y) => (y > 63 ? P.red : y > 58 ? P.yellow : 0x2a5a7a)); return v.build(); }, { solid: [0.15, 0.15, 6.5] });
reg('dg_emptrap', () => {
  const v = new Vox(24, 24, 24, 0.12, [12, 0, 12]);
  v.cyl(12, 12, 0, 2, 11, 0x3a3c42); v.cyl(12, 12, 3, 14, 5, 0x5a5e66); v.cyl(12, 12, 15, 17, 8, P.steelD); v.cyl(12, 12, 18, 21, 3, 0x30c0ff);
  for (let a = 0; a < 3; a++) { const x = 12 + Math.cos(a * 2.094) * 9, z = 12 + Math.sin(a * 2.094) * 9; v.box(x - 1, 0, z - 1, x + 1, 8, z + 1, P.yellow); }
  v.glow(0x30c0ff);
  return v.build();
}, { solid: [1.2, 1.2, 2.6] });

reg('dg_stairs', () => {   // 3 m long concrete stair flight rising along +z by 1.6 m (visual)
  const v = new Vox(20, 16, 30, 0.1, [10, 0, 0]);
  for (let s = 0; s < 8; s++) v.box(0, 0, s * 4, 19, 1 + s * 2, s * 4 + 3, s % 2 ? P.concD : P.conc);
  v.box(0, 2, 0, 0, 16, 29, P.steelD); v.box(19, 2, 0, 19, 16, 29, P.steelD);
  return v.build();
}, { cast: true });

reg('dg_tankS', () => {
  const v = new Vox(32, 34, 32, 0.12, [16, 0, 16]);
  v.cyl(16, 16, 0, 1, 15.5, P.concD); for (let y = 2; y < 30; y++) v.cyl(16, 16, y, y, 14.5, y % 6 === 0 ? 0x8a8a7a : 0xa8a494);
  for (let y = 30; y < 34; y++) v.cyl(16, 16, y, y, 14.5 - (y - 29) * 3, 0x9a9686);
  for (let y = 2; y < 30; y++) v.set(16 + Math.round(Math.cos(y * 0.4) * 14.5), y, 16 + Math.round(Math.sin(y * 0.4) * 14.5), P.steelD);
  v.box(5, 14, 28, 26, 16, 31, (x) => (x % 4 < 2 ? P.yellow : P.black));
  return v.build();
}, { solid: [1.8, 1.8, 4] });

reg('dg_radar', () => {   // radar/radome on a short tower (South Swamp Outpost landmark)
  const v = new Vox(34, 52, 34, 0.18, [17, 0, 17]);
  for (const [x, z] of [[8, 8], [25, 8], [8, 25], [25, 25]]) v.box(x, 0, z, x + 1, 22, z + 1, P.steelD);
  v.box(6, 22, 6, 27, 23, 27, P.steel);
  v.sphere(17, 35, 17, 13, (x, y, z) => ((x + z + y) % 9 === 0 ? 0xc8c2b0 : P.white), 1.0);
  for (let y = 0; y < 22; y++) v.box(5, y, 5, 5, y, 5, -1);
  v.box(16, 49, 16, 17, 50, 17, P.gRed); v.glow(P.gRed);
  return v.build();
}, { solid: [2.6, 2.6, 8] });

reg('dg_spillgrate', () => {  // grating / trash rack on spillway chute heads
  const v = new Vox(60, 14, 4, 0.1, [30, 0, 2]);
  for (let x = 0; x < 60; x += 3) v.box(x, 0, 0, x, 13, 1, P.rustD);
  v.box(0, 13, 0, 59, 13, 3, P.steelD); v.box(0, 6, 0, 59, 6, 1, P.steel);
  return v.build();
}, { cast: true });

reg('dg_ventbox', () => { const v = new Vox(16, 12, 16, 0.1, [8, 0, 8]); v.box(0, 0, 0, 15, 9, 15, 0x6a7272); v.cyl(8, 8, 10, 10, 6, P.steelD); for (let a = 0; a < 6; a++) line(v, 8, 11, 8, 8 + Math.cos(a) * 6, 11, 8 + Math.sin(a) * 6, P.steel); v.box(0, 4, 16, 15, 5, 16, P.yellow); return v.build(); }, { solid: [0.8, 0.8, 1.1] });
reg('dg_crane', () => {   // tower crane (decorative landmark)
  const v = new Vox(130, 120, 12, 0.2, [30, 0, 6]);
  for (let y = 0; y < 100; y++) { for (const [x, z] of [[27, 3], [33, 3], [27, 9], [33, 9]]) v.set(x, y, z, P.yellow); if (y % 6 === 0) { v.box(27, y, 3, 33, y, 3, P.yellow); v.box(27, y, 9, 33, y, 9, P.yellow); line(v, 27, y, 3, 33, y + 6, 3, P.yellow); } }
  for (let x = 0; x < 130; x++) { v.set(x, 100, 4, P.yellow); v.set(x, 100, 8, P.yellow); if (x % 6 === 0) line(v, x, 100, 4, x + 3, 106, 6, P.yellow); v.set(x, 106, 6, P.yellow); }
  v.box(0, 92, 3, 14, 99, 9, P.concD); v.box(26, 101, 2, 34, 112, 10, P.steel); v.box(30, 113, 6, 31, 115, 6, P.gRed);
  line(v, 110, 99, 6, 110, 40, 6, P.black); v.box(108, 36, 4, 112, 39, 8, P.rust);
  v.glow(P.gRed);
  return v.build();
}, { solid: [1.3, 1.3, 20] });

// ---------------------------------------------------------------- marina, park, promenade, billboards
// rowboat ~4 m along z (place with yAbs at the water surface)
reg('dg_boat', () => {
  const v = new Vox(18, 7, 42, 0.1, [9, 0, 21]);
  for (let z = 0; z < 42; z++) {
    const t = (z - 21) / 21, hw = Math.max(1, Math.round(8 * (1 - t * t * (t < 0 ? 0.55 : 0.85))));
    v.box(9 - hw, 0, z, 8 + hw, 4, z, (x, y) => (y === 3 ? 0x2a5a8a : y === 4 ? P.white : 0xd8d4c8));
    if (hw > 2) v.box(10 - hw, 1, z, 7 + hw, 4, z, -1);
    v.box(9 - hw, 0, z, 8 + hw, 0, z, 0x6a5030);
  }
  for (const z of [12, 26]) v.box(3, 2, z, 14, 2, z + 2, P.wood);
  v.box(8, 3, 33, 9, 6, 34, P.steelD);
  return v.build();
}, { cast: true });

// 3x5 pixel font for the billboards
const FONT = { A: '010101111101101', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100', G: '011100101101011', I: '111010010010111',
  L: '100100100100111', M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110101101', S: '011100010001110',
  T: '111010010010010', U: '101101101101111', W: '101101111111101', ' ': '000000000000000' };
// roadside billboard: 10.8 x 4.8 m board on two posts, lettering on the south face (toward the camera)
function billboard(lines, bg, fg) {
  const v = new Vox(72, 56, 5, 0.15, [36, 0, 2.5]);
  for (const x of [8, 62]) v.box(x, 0, 1, x + 1, 24, 2, P.steelD);
  v.box(0, 22, 0, 71, 55, 2, 0x5a5a56); v.box(1, 23, 3, 70, 54, 3, bg);
  lines.forEach((txt, li) => {
    const w = txt.length * 8 - 2, x0 = Math.round(36 - w / 2), y0 = lines.length === 1 ? 43 : 48 - li * 13;
    [...txt].forEach((ch, ci) => { const g = FONT[ch] || FONT[' ']; for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '1') v.box(x0 + ci * 8 + c * 2, y0 - r * 2, 4, x0 + ci * 8 + c * 2 + 1, y0 - r * 2 + 1, 4, fg); });
  });
  v.box(0, 22, 3, 71, 22, 4, P.gAmber); v.glow(P.gAmber);
  return v.build();
}
reg('dg_billboard', () => billboard(['PAST DUE'], 0xd8d0b8, 0xb83a2a), { solid: [5.4, 0.3, 8.2] });
reg('dg_billboard2', () => billboard(['FINAL', 'NOTICE'], 0x2a3a5a, 0xe8e0c8), { solid: [5.4, 0.3, 8.2] });
reg('dg_billboard3', () => billboard(['UNDER NEW', 'MGMT'], 0xd8a020, 0x1e1e20), { solid: [5.4, 0.3, 8.2] });

// swing set (3 m along x) and a slide (along z, climbs at -z)
reg('dg_swing', () => {
  const v = new Vox(31, 24, 15, 0.1, [15.5, 0, 7.5]);
  for (const x of [0, 30]) { line(v, x, 0, 0, x, 23, 7, P.red); line(v, x, 0, 14, x, 23, 7, P.red); }
  v.box(0, 23, 7, 30, 23, 7, P.steelD);
  for (const [a, b] of [[8, 13], [18, 23]]) { v.box(a, 6, 7, a, 22, 7, P.steelL); v.box(b, 6, 7, b, 22, 7, P.steelL); v.box(a, 5, 6, b, 5, 8, 0x2a2a2a); }
  return v.build();
}, { solid: [1.5, 0.7, 2.3] });
reg('dg_slide', () => {
  const v = new Vox(12, 22, 38, 0.1, [6, 0, 19]);
  for (const x of [1, 10]) for (const z of [0, 7]) v.box(x, 0, z, x, 20, z, P.steelD);
  v.box(1, 18, 0, 10, 18, 7, P.yellow); v.box(1, 19, 0, 1, 21, 7, P.steelD); v.box(10, 19, 0, 10, 21, 7, P.steelD);
  for (let y = 2; y < 18; y += 3) v.box(2, y, 0, 9, y, 0, P.steel);
  for (let z = 8; z < 38; z++) { const y = Math.round(17 - (z - 8) * 0.55); v.box(3, Math.max(0, y), z, 8, Math.max(0, y), z, 0x3a8ac0); v.box(2, Math.max(0, y), z, 2, Math.max(0, y) + 1, z, 0x2a6a9a); v.box(9, Math.max(0, y), z, 9, Math.max(0, y) + 1, z, 0x2a6a9a); }
  return v.build();
}, { solid: [0.6, 1.9, 2.1] });
reg('dg_bench', () => {
  const v = new Vox(18, 9, 6, 0.1, [9, 0, 3]);
  for (const x of [1, 16]) v.box(x, 0, 1, x, 4, 5, P.steelD);
  v.box(0, 4, 1, 17, 4, 5, (x) => (x % 3 ? P.wood : P.woodD)); v.box(0, 5, 0, 17, 8, 0, (x, y) => (y % 2 ? P.wood : P.woodD));
  return v.build();
}, { solid: [0.9, 0.3, 0.5] });
reg('dg_binocs', () => {   // coin-op binoculars on a post, looking south
  const v = new Vox(8, 16, 8, 0.1, [4, 0, 4]);
  v.box(3, 0, 3, 4, 10, 4, P.steelD); v.box(1, 10, 2, 6, 13, 6, 0x3a6a5a);
  for (const x of [2, 5]) v.box(x, 11, 7, x, 12, 7, P.glassD);
  v.box(3, 13, 3, 4, 14, 4, P.yellow);
  return v.build();
}, { solid: [0.35, 0.35, 1.4] });
