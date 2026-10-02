// Sandy City custom voxel props (prefix sc_). Italian old-town furniture half swallowed by dunes:
// palms / olives / cypresses, awnings, market stalls, fountains, statues, metro entrances, highway
// barriers, buried cars, lamp posts, laundry lines, rubble, interiors (beds, pews, server racks...).
import { registerProp, Vox } from '../engine/models.js';

// deterministic hash for voxel colour noise (no Math.random: geometry must match on every client)
const hsh = (x, y, z) => { let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const pick = (cols, x, y, z) => cols[Math.floor(hsh(x, y, z) * cols.length)];
function cyl(v, cx, cz, y0, y1, r, c) {
  for (let y = y0; y <= y1; y++) for (let z = Math.floor(cz - r); z <= cz + r; z++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
    const dx = x + 0.5 - cx, dz = z + 0.5 - cz; if (dx * dx + dz * dz <= r * r) v.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
  }
  return v;
}

const STONE = [0xd8d0bc, 0xccc4ae, 0xe2dac6];
const TERRA = [0xb4643c, 0xa85a36, 0xc0704a];
const CONC = [0x8a867c, 0x96928a, 0x7e7a72];
const SANDC = [0xd0ac72, 0xc09c64, 0xdcbc84];

// ------------------------------------------------------------------ VEGETATION
function palm(height = 46, lean = 0, seed = 1) {
  const S = 44;
  const v = new Vox(S, height + 10, S, 0.15, [S / 2, 0, S / 2]);
  const c = S / 2;
  let tx = c, tz = c;
  for (let y = 0; y < height; y++) {
    const k = y / height;
    tx = c + lean * k * k * 6; tz = c + lean * k * k * 2;
    const col = (y % 3 === 0) ? 0x6a5236 : (y % 3 === 1 ? 0x8a6c48 : 0x7a5e3e);
    v.box(Math.round(tx) - 1, y, Math.round(tz) - 1, Math.round(tx), y, Math.round(tz), col);
    if (y < 3) v.box(Math.round(tx) - 2, y, Math.round(tz) - 2, Math.round(tx) + 1, y, Math.round(tz) + 1, 0x6a5236);
  }
  const top = height, cx = Math.round(tx), cz = Math.round(tz);
  v.sphere(cx, top, cz, 2.2, 0x5a4428);                         // crown boss
  v.box(cx - 1, top - 3, cz - 1, cx, top - 1, cz, 0x8a5a2a);    // dates
  const greens = [0x4e7a2a, 0x5f8a32, 0x6e963a, 0x44682a];
  const N = 9;
  for (let f = 0; f < N; f++) {
    const a = (f / N) * Math.PI * 2 + seed * 0.7;
    const dx = Math.cos(a), dz = Math.sin(a), len = 13 + ((f * 7 + seed) % 4);
    for (let i = 1; i <= len; i++) {
      const x = cx + dx * i, z = cz + dz * i, y = top + 2 + i * 0.35 - (i * i) / (len * 0.9);
      const wdt = i < len * 0.75 ? 1.2 : 0.6;
      for (let s2 = -wdt; s2 <= wdt; s2 += 0.6) {
        const xx = Math.round(x - dz * s2), zz = Math.round(z + dx * s2);
        v.set(xx, Math.round(y), zz, greens[(i + f + Math.round(s2 * 2)) & 3]);
        if (Math.abs(s2) > 0.8) v.set(xx, Math.round(y) - 1, zz, greens[(i + f) & 3]);   // drooping leaflets
      }
    }
  }
  return v.build();
}

function olive(seed = 1) {
  const v = new Vox(34, 32, 34, 0.15, [17, 0, 17]);
  const bark = [0x5a4a3a, 0x4a3c2e, 0x6a5848];
  // gnarled, split trunk
  for (let y = 0; y < 13; y++) {
    const w = y < 3 ? 2 : 1, ox = Math.round(Math.sin(y * 0.5 + seed) * 1.5);
    v.box(16 + ox - w, y, 16 - w, 17 + ox + (y > 7 ? 1 : 0), y, 17, (x, yy, z) => pick(bark, x, yy, z));
    if (y > 7) v.box(13 + ox - (y - 7), y, 15, 14 + ox - (y - 7), y, 16, bark[0]);
  }
  const leaf = [0x7a8a5a, 0x6a7a4a, 0x8a9a68, 0x5e6e44];
  const blobs = [[17, 18, 17, 7.5], [12, 16, 15, 5.5], [22, 17, 19, 6], [16, 22, 20, 5.5], [19, 20, 12, 5], [11, 20, 21, 4.5]];
  for (let i = 0; i < blobs.length; i++) {
    const [x, y, z, r] = blobs[(i + seed) % blobs.length];
    v.sphere(x + (seed % 3) - 1, y, z, r, (xx, yy, zz) => (hsh(xx, yy, zz) < 0.12 ? -1 : pick(leaf, xx, yy, zz)), 0.62);
  }
  return v.build();
}

function cypress() {
  const v = new Vox(14, 54, 14, 0.15, [7, 0, 7]);
  v.box(6, 0, 6, 7, 5, 7, 0x4a3a2a);
  const greens = [0x2a4424, 0x34502a, 0x24381e];
  for (let y = 3; y < 52; y++) {
    const k = (y - 3) / 49, r = 0.8 + Math.sin(Math.min(1, k * 1.25) * Math.PI) * 4.4 * (1 - k * 0.35);
    cyl(v, 7, 7, y, y, r, (x, yy, z) => pick(greens, x, yy, z));
  }
  return v.build();
}

function shrub(dry = false) {
  const v = new Vox(12, 7, 12, 0.12, [6, 0, 6]);
  const cols = dry ? [0x8a7a4a, 0x7a6a3e, 0x9a8858] : [0x5a6a34, 0x4a5a2e, 0x6a7a40];
  v.sphere(6, 2, 6, 5, (x, y, z) => (hsh(x, y, z) < 0.25 ? -1 : pick(cols, x, y, z)), 0.75);
  return v.build();
}

function agave() {
  const v = new Vox(14, 10, 14, 0.1, [7, 0, 7]);
  const cols = [0x6a8a7a, 0x5a7a6a, 0x7a9a86];
  for (let f = 0; f < 11; f++) {
    const a = f * 2.4, dx = Math.cos(a), dz = Math.sin(a);
    for (let i = 0; i < 7; i++) v.set(Math.round(7 + dx * i), Math.round(i * (0.8 + (f % 3) * 0.25)), Math.round(7 + dz * i), cols[f % 3]);
  }
  v.box(6, 0, 6, 7, 1, 7, cols[1]);
  return v.build();
}

function duneGrass() {
  const v = new Vox(10, 6, 10, 0.1, [5, 0, 5]);
  const cols = [0xa89a5a, 0x8a8a4a, 0xb8a86a];
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hsh(i, 1, 3) * 10), z = Math.floor(hsh(i, 7, 2) * 10), h = 1 + Math.floor(hsh(i, 4, 9) * 5);
    v.box(x, 0, z, x, h, z, cols[i % 3]);
  }
  return v.build();
}

// ------------------------------------------------------------------ STREET FURNITURE
function awning(c1, c2) {
  // wall-mounted striped awning, wall at z=0 projecting toward +z; 3.2 m wide, sits 2.3..3.0 m up
  const v = new Vox(32, 31, 16, 0.1, [16, 0, 0]);
  for (let z = 0; z < 15; z++) {
    const y = 30 - Math.floor(z * 0.5);
    v.box(0, y, z, 31, y, z, (x) => ((x >> 2) & 1 ? c1 : c2));
  }
  for (let x = 0; x < 32; x++) v.set(x, 22, 15, ((x >> 2) & 1) ? c1 : c2);       // valance
  for (let x = 0; x < 32; x += 2) v.set(x, 21, 15, ((x >> 2) & 1) ? c1 : c2);
  v.box(0, 22, 14, 0, 30, 14, 0x3a3a3a); v.box(31, 22, 14, 31, 30, 14, 0x3a3a3a);
  return v.build();
}

function stall(c1, c2, seed = 1) {
  const v = new Vox(26, 26, 18, 0.1, [13, 0, 9]);
  const wood = [0x6e5030, 0x5a4026];
  v.box(1, 8, 1, 24, 9, 16, (x, y, z) => pick(wood, x, y, z));          // table top
  for (const [x, z] of [[1, 1], [24, 1], [1, 16], [24, 16]]) v.box(x, 0, z, x, 24, z, 0x4a3a2a);
  for (let x = 0; x < 26; x++) for (let z = 0; z < 18; z++) v.set(x, 24 + (z > 8 ? 0 : 1), z, ((x >> 2) & 1) ? c1 : c2);
  // goods: crates of fruit / fabric bolts / pottery
  const goods = [[0xd88a2a, 0xc86a1e], [0x9ac83a, 0x7aa82a], [0xc83a2a, 0xa82a1e], [0xe0d0a0, 0xb8a070], [0x3a6ac8, 0x2a4a98]];
  for (let i = 0; i < 6; i++) {
    const g = goods[(i + seed) % goods.length], x0 = 2 + (i % 3) * 7, z0 = 2 + Math.floor(i / 3) * 7;
    v.box(x0, 10, z0, x0 + 5, 11, z0 + 5, 0x5a4026);
    v.box(x0 + 1, 12, z0 + 1, x0 + 4, 12 + (i % 2), z0 + 4, (x, y, z) => g[(x + z) & 1]);
  }
  return v.build();
}

function fountain() {
  const v = new Vox(34, 22, 34, 0.18, [17, 0, 17]);
  cyl(v, 17, 17, 0, 3, 16.5, (x, y, z) => pick(STONE, x, y, z));
  cyl(v, 17, 17, 1, 3, 15, 0x3a7a8a);                                   // water in basin
  cyl(v, 17, 17, 3, 3, 15, (x, y, z) => (hsh(x, y, z) < 0.3 ? 0x5aa0b0 : 0x3a8090));
  cyl(v, 17, 17, 0, 9, 2.5, (x, y, z) => pick(STONE, x, y, z));          // central column
  cyl(v, 17, 17, 10, 11, 7, (x, y, z) => pick(STONE, x, y, z));          // upper bowl
  cyl(v, 17, 17, 11, 11, 5.6, 0x4a90a0);
  cyl(v, 17, 17, 12, 16, 1.5, (x, y, z) => pick(STONE, x, y, z));
  v.sphere(17, 18, 17, 2.4, 0xc8c0a8);
  // sand drifted into the basin on one side
  v.box(2, 3, 10, 9, 4, 24, (x, y, z) => (Math.hypot(x - 17, z - 17) < 15.5 ? pick(SANDC, x, y, z) : -1));
  return v.build();
}

function statue() {
  const v = new Vox(14, 40, 14, 0.1, [7, 0, 7]);
  v.box(1, 0, 1, 12, 11, 12, (x, y, z) => pick(STONE, x, y, z));
  v.box(0, 11, 0, 13, 12, 13, 0xe0d8c4);
  const B = 0x6a7a6a, B2 = 0x5a6a5c;                                    // verdigris bronze
  v.box(5, 13, 6, 6, 21, 7, B); v.box(7, 13, 6, 8, 21, 7, B2);          // legs
  v.box(4, 22, 5, 9, 30, 8, B); v.box(3, 27, 6, 3, 34, 7, B2);          // torso, raised arm
  v.box(10, 24, 6, 11, 29, 7, B2); v.box(5, 31, 5, 8, 34, 8, B);        // arm, head
  v.box(2, 35, 6, 3, 36, 7, 0xb8b090);                                  // torch
  return v.build();
}

function metroEntrance() {
  // stairwell going down toward -z, railings, red "M" totem; 3.2 x 5 m
  const v = new Vox(32, 34, 50, 0.1, [16, 0, 25]);
  for (let z = 4; z < 46; z++) {
    const d = Math.floor((z - 4) / 3);
    const shade = Math.max(0x10, 0x60 - d * 6);
    v.box(4, 0, z, 27, 0, z, (shade << 16) | (shade << 8) | shade);
  }
  v.box(2, 0, 2, 29, 1, 3, 0x7a766e); v.box(2, 0, 2, 3, 1, 47, 0x7a766e); v.box(28, 0, 2, 29, 1, 47, 0x7a766e);
  for (let z = 2; z < 48; z += 1) { v.set(2, 9, z, 0x3a5a3a); v.set(29, 9, z, 0x3a5a3a); }
  for (let z = 2; z < 48; z += 6) { v.box(2, 1, z, 2, 9, z, 0x3a5a3a); v.box(29, 1, z, 29, 9, z, 0x3a5a3a); }
  for (let x = 2; x < 30; x++) v.set(x, 9, 2, 0x3a5a3a);
  v.box(30, 0, 0, 31, 26, 1, 0x3a3a3a);                                  // totem pole
  v.box(28, 26, 0, 31, 33, 1, 0xc83a2a); v.box(29, 28, 1, 30, 31, 1, 0xf0e8d8);
  v.glow(0xf0e8d8);
  return v.build();
}

function metroStairs() {
  const v = new Vox(20, 14, 30, 0.1, [10, 0, 15]);
  for (let z = 3; z < 28; z++) { const s = Math.max(0x14, 0x5a - (z - 3) * 3); v.box(3, 0, z, 16, 0, z, (s << 16) | (s << 8) | s); }
  v.box(1, 0, 1, 18, 1, 2, 0x7a766e); v.box(1, 0, 1, 2, 1, 28, 0x7a766e); v.box(17, 0, 1, 18, 1, 28, 0x7a766e);
  for (let z = 1; z < 29; z++) { v.set(1, 9, z, 0x5a5a52); v.set(18, 9, z, 0x5a5a52); }
  v.box(1, 2, 1, 1, 9, 1, 0x5a5a52); v.box(18, 2, 1, 18, 9, 1, 0x5a5a52);
  v.box(17, 10, 1, 19, 13, 2, 0xc83a2a); v.set(18, 11, 2, 0xf0e8d8); v.glow(0xf0e8d8);
  return v.build();
}

function barrier() {
  const v = new Vox(20, 9, 7, 0.1, [10, 0, 3.5]);
  for (let y = 0; y < 9; y++) { const w = y < 3 ? 3 : y < 6 ? 2 : 1; v.box(0, y, 3 - w, 19, y, 3 + w, (x, yy, z) => pick(CONC, x, yy, z)); }
  for (let x = 0; x < 20; x++) if ((x >> 2) & 1) { v.set(x, 6, 1, 0xc83a2a); v.set(x, 6, 5, 0xc83a2a); }
  return v.build();
}

function fiat(body, seed = 1) {
  // small Italian hatchback, facing +z, 1.6 x 3.4 m
  const v = new Vox(16, 14, 34, 0.1, [8, 0, 17]);
  const dark = 0x2a2a2a, glass = 0x2a3a44;
  v.box(1, 2, 1, 14, 6, 32, body);
  v.box(2, 7, 7, 13, 11, 25, body); v.box(3, 12, 9, 12, 12, 23, body);
  v.box(2, 8, 25, 13, 10, 26, glass); v.box(2, 8, 6, 13, 10, 7, glass);
  v.box(1, 8, 9, 1, 10, 23, glass); v.box(14, 8, 9, 14, 10, 23, glass);
  for (const [x, z] of [[0, 4], [13, 4], [0, 26], [13, 26]]) v.box(x, 0, z, x + 2, 3, z + 3, dark);
  v.box(2, 4, 33, 4, 5, 33, 0xe8e0b0); v.box(11, 4, 33, 13, 5, 33, 0xe8e0b0);
  for (let i = 0; i < 18; i++) v.set(1 + Math.floor(hsh(i, seed, 1) * 14), 6 + Math.floor(hsh(i, 2, seed) * 6), 1 + Math.floor(hsh(seed, i, 5) * 31), 0x8a5a2a);   // rust
  v.box(1, 6, 1, 14, 7, 6, (x, y, z) => (hsh(x, y, z) < 0.6 ? pick(SANDC, x, y, z) : -1));                                               // sand on bonnet
  return v.build();
}

function carRoof(body) {
  // a car buried to the windows: roof + top of glass poking from the sand
  const v = new Vox(18, 6, 36, 0.1, [9, 0, 18]);
  v.box(0, 0, 0, 17, 1, 35, (x, y, z) => pick(SANDC, x, y, z));                     // sand collar
  v.box(2, 0, 8, 15, 3, 27, 0x2a3a44);
  v.box(2, 4, 9, 15, 5, 26, body);
  v.box(3, 2, 2, 14, 2, 7, body);
  for (let i = 0; i < 20; i++) v.set(2 + Math.floor(hsh(i, 3, 1) * 14), 5, 9 + Math.floor(hsh(i, 9, 4) * 18), pick(SANDC, i, 1, 2));
  return v.build();
}

function bus() {
  const v = new Vox(26, 32, 100, 0.1, [13, 0, 50]);
  const body = 0xd8c8a0, stripe = 0x3a7a9a, glass = 0x2a3a44;
  v.box(1, 3, 1, 24, 26, 98, body);
  v.box(1, 10, 1, 24, 12, 98, stripe);
  for (let z = 6; z < 94; z += 9) { v.box(0, 15, z, 0, 23, z + 6, glass); v.box(25, 15, z, 25, 23, z + 6, glass); }
  v.box(3, 14, 99, 22, 24, 99, glass); v.box(1, 27, 6, 24, 28, 94, 0xc8b890);
  for (const z of [12, 80]) { v.box(0, 0, z, 3, 6, z + 8, 0x1a1a1a); v.box(22, 0, z, 25, 6, z + 8, 0x1a1a1a); }
  for (let i = 0; i < 90; i++) v.set(1 + Math.floor(hsh(i, 1, 7) * 24), 3 + Math.floor(hsh(i, 5, 2) * 25), 1 + Math.floor(hsh(i, 8, 3) * 98), 0x8a5a2a);
  v.box(1, 29, 20, 24, 30, 70, (x, y, z) => (hsh(x, y, z) < 0.5 ? pick(SANDC, x, y, z) : -1));
  return v.build();
}

function vespa(col) {
  const v = new Vox(6, 12, 18, 0.1, [3, 0, 9]);
  v.box(2, 0, 1, 3, 2, 3, 0x1a1a1a); v.box(2, 0, 14, 3, 2, 16, 0x1a1a1a);
  v.box(1, 2, 2, 4, 6, 9, col); v.box(2, 3, 10, 3, 4, 14, col); v.box(1, 2, 13, 4, 9, 15, col);
  v.box(1, 7, 3, 4, 7, 8, 0x3a2a1e); v.box(0, 10, 14, 5, 10, 14, 0x2a2a2a); v.set(2, 9, 16, 0xf0e8c0);
  return v.build();
}

function sign(c) {
  const v = new Vox(8, 30, 4, 0.1, [4, 0, 2]);
  v.box(3, 0, 1, 4, 24, 2, 0x5a5a5a);
  v.sphere(4, 26, 2, 3.6, (x, y, z) => (Math.hypot(x + 0.5 - 4, y + 0.5 - 26) > 2.6 ? c : 0xf0ece0));
  v.box(1, 25, 3, 6, 26, 3, 0x2a2a2a);
  return v.build();
}

function streetSign() {
  const v = new Vox(16, 30, 4, 0.1, [8, 0, 2]);
  v.box(7, 0, 1, 8, 29, 2, 0x4a4a4a);
  v.box(0, 22, 0, 15, 25, 0, 0x2a5aa8); v.box(1, 23, 0, 14, 24, 0, 0xe8e8e0);
  v.box(0, 17, 3, 12, 19, 3, 0x2a6a3a); v.box(1, 18, 3, 11, 18, 3, 0xe8e8e0);
  return v.build();
}

function planter(seed = 1) {
  const v = new Vox(10, 14, 10, 0.1, [5, 0, 5]);
  for (let y = 0; y < 7; y++) { const r = 3.2 + y * 0.25; cyl(v, 5, 5, y, y, r, (x, yy, z) => pick(TERRA, x, yy, z)); }
  cyl(v, 5, 5, 7, 7, 4.6, 0xa85a36);
  cyl(v, 5, 5, 6, 6, 3.6, 0x3a2a1e);
  const flower = [0xd83a4a, 0xe8c83a, 0xe86aa8, 0xf0f0e0][seed % 4];
  v.sphere(5, 9, 5, 3.4, (x, y, z) => (hsh(x, y, z) < 0.2 ? flower : hsh(x, z, y) < 0.3 ? -1 : 0x4a6a2e), 0.8);
  return v.build();
}

function vase() {
  const v = new Vox(10, 14, 10, 0.1, [5, 0, 5]);
  for (let y = 0; y < 13; y++) { const r = y < 2 ? 2 : y < 9 ? 2.5 + Math.sin((y - 1) / 8 * Math.PI) * 2 : y < 11 ? 1.6 : 2.2; cyl(v, 5, 5, y, y, r, (x, yy, z) => pick(TERRA, x, yy, z)); }
  cyl(v, 5, 5, 12, 12, 1.2, 0x3a2a1e);
  return v.build();
}

function laundry(seed = 1) {
  // laundry line strung between two poles 4 m apart along x
  const v = new Vox(42, 36, 4, 0.1, [21, 0, 2]);
  v.box(0, 0, 1, 1, 35, 2, 0x5a4a3a); v.box(40, 0, 1, 41, 35, 2, 0x5a4a3a);
  for (let x = 1; x < 41; x++) v.set(x, 33 - Math.round(Math.sin(x / 40 * Math.PI) * 2), 2, 0xd0d0c8);
  const cloth = [0xe8e4d8, 0xc84a3a, 0x4a7ac8, 0xe8c84a, 0x8ac8a8, 0xd88ab0];
  for (let i = 0; i < 6; i++) {
    const x0 = 3 + i * 6 + (seed % 2), w = 3 + ((i + seed) % 3), y1 = 32 - Math.round(Math.sin((x0 + 2) / 40 * Math.PI) * 2), hh = 5 + ((i * 3 + seed) % 6);
    v.box(x0, y1 - hh, 2, x0 + w, y1, 2, cloth[(i + seed) % cloth.length]);
  }
  return v.build();
}

function lampPost() {
  // ornate Italian street lamp, sand-buried to mid-pole (only ~2.4 m shows)
  const v = new Vox(12, 30, 8, 0.1, [6, 0, 4]);
  v.box(5, 0, 3, 6, 22, 4, 0x2a2a2a);
  v.box(4, 0, 2, 7, 2, 5, (x, y, z) => pick(SANDC, x, y, z));
  v.box(5, 22, 3, 10, 22, 4, 0x2a2a2a); v.box(1, 22, 3, 5, 22, 4, 0x2a2a2a);
  v.box(9, 18, 2, 11, 21, 5, 0x3a3a32); v.box(0, 18, 2, 2, 21, 5, 0x3a3a32);
  v.box(9, 19, 3, 11, 20, 4, 0xffe0a0); v.box(0, 19, 3, 2, 20, 4, 0xffe0a0);
  v.box(4, 23, 3, 7, 24, 4, 0x2a2a2a);
  v.glow(0xffe0a0);
  return v.build();
}

function slab(seed = 1) {
  // collapsed concrete slab, tilted, rebar sticking out
  const v = new Vox(30, 12, 22, 0.1, [15, 0, 11]);
  for (let x = 0; x < 30; x++) {
    const y0 = Math.floor(x * 0.33);
    v.box(x, y0, 0, x, y0 + 2, 21, (xx, y, z) => (hsh(xx, y, z) < 0.05 ? -1 : pick(CONC, xx, y, z)));
  }
  for (let i = 0; i < 6; i++) { const z = 2 + i * 3 + (seed % 2); v.box(28, 9, z, 29, 11, z, 0x6a3a22); }
  for (let i = 0; i < 25; i++) v.set(Math.floor(hsh(i, seed, 2) * 30), 0, Math.floor(hsh(seed, i, 7) * 22), pick(CONC, i, 0, 1));
  return v.build();
}

function rubble(seed = 1) {
  const v = new Vox(20, 8, 20, 0.12, [10, 0, 10]);
  const cols = [0xc8a888, 0xb08868, 0x8a867c, 0xa85a36, 0xd0c0a0, 0x6a665e];
  for (let i = 0; i < 36; i++) {
    const x = Math.floor(hsh(i, seed, 1) * 17), z = Math.floor(hsh(seed, i, 3) * 17), r = 1 + Math.floor(hsh(i, i, seed) * 3);
    const d = Math.hypot(x - 9, z - 9), y = Math.max(0, Math.floor(4 - d * 0.45));
    v.box(x, 0, z, x + r, y + (i % 2), z + r - 1, cols[(i + seed) % cols.length]);
  }
  return v.build();
}

function column() {
  const v = new Vox(10, 30, 10, 0.1, [5, 0, 5]);
  v.box(0, 0, 0, 9, 2, 9, (x, y, z) => pick(STONE, x, y, z));
  for (let y = 3; y < 28; y++) {
    const top = 22 + Math.floor(hsh(y, 2, 3) * 6);
    if (y > top) continue;
    cyl(v, 5, 5, y, y, 3.3, (x, yy, z) => ((x + z) % 3 === 0 ? 0xbab29e : pick(STONE, x, yy, z)));
  }
  return v.build();
}

function columnFallen() {
  const v = new Vox(30, 8, 8, 0.1, [15, 0, 4]);
  for (let x = 0; x < 30; x++) for (let y = 0; y < 7; y++) for (let z = 0; z < 7; z++) if ((y - 3) ** 2 + (z - 3) ** 2 < 11 && !(x > 12 && x < 14)) v.set(x, y, z, pick(STONE, x, y, z));
  return v.build();
}

function bench() {
  const v = new Vox(18, 9, 6, 0.1, [9, 0, 3]);
  v.box(1, 0, 1, 2, 4, 4, 0x8a867c); v.box(15, 0, 1, 16, 4, 4, 0x8a867c);
  v.box(0, 4, 0, 17, 4, 4, (x, y, z) => (x % 3 === 0 ? 0x5a4026 : 0x6e5030));
  v.box(0, 5, 0, 17, 8, 0, (x, y, z) => (y % 2 ? 0x6e5030 : 0x5a4026));
  return v.build();
}

function cafeTable(seed = 1) {
  const v = new Vox(16, 8, 16, 0.1, [8, 0, 8]);
  cyl(v, 8, 8, 7, 7, 3.4, 0xe0dccc); v.box(7, 0, 7, 8, 6, 8, 0x3a3a3a);
  const ch = [0x2a5a8a, 0xc84a2a, 0x3a6a3a][seed % 3];
  for (const [x, z] of [[1, 7], [13, 7]]) { v.box(x, 4, z - 1, x + 2, 4, z + 2, ch); v.box(x + (x < 8 ? 0 : 2), 5, z - 1, x + (x < 8 ? 0 : 2), 7, z + 2, ch); v.box(x, 0, z - 1, x, 3, z - 1, 0x3a3a3a); }
  return v.build();
}

function parasol(c1, c2) {
  const v = new Vox(30, 26, 30, 0.1, [15, 0, 15]);
  v.box(14, 0, 14, 15, 23, 15, 0xd0c8b0);
  for (let x = 0; x < 30; x++) for (let z = 0; z < 30; z++) {
    const d = Math.hypot(x - 14.5, z - 14.5); if (d > 14.5) continue;
    const a = Math.atan2(z - 14.5, x - 14.5);
    v.set(x, 24 - Math.floor(d / 6), z, (Math.floor((a + Math.PI) / (Math.PI / 4)) & 1) ? c1 : c2);
  }
  return v.build();
}

function kiosk() {
  // green Italian "edicola" newsstand
  const v = new Vox(22, 28, 22, 0.1, [11, 0, 11]);
  const G = 0x2e5a3a, G2 = 0x3a6a46;
  v.box(1, 0, 1, 20, 22, 20, (x, y, z) => (y % 6 === 0 ? G2 : G));
  v.box(0, 23, 0, 21, 25, 21, G2); v.box(3, 26, 3, 18, 27, 18, G);
  v.box(3, 8, 21, 18, 18, 21, 0x2a3a44);
  for (let i = 0; i < 8; i++) v.box(3 + i * 2, 9, 21, 4 + i * 2, 12, 21, [0xe8d0a0, 0xc84a3a, 0x4a7ac8, 0xe8e8e0][i % 4]);
  return v.build();
}

function pump() {
  const v = new Vox(8, 20, 6, 0.1, [4, 0, 3]);
  v.box(0, 0, 0, 7, 1, 5, 0x6a665e);
  v.box(1, 2, 1, 6, 17, 4, 0xc8b030); v.box(1, 18, 1, 6, 19, 4, 0xc83a2a);
  v.box(2, 10, 5, 5, 14, 5, 0x2a2a2a); v.box(0, 6, 2, 0, 12, 3, 0x1a1a1a);
  return v.build();
}

function tent(col) {
  const v = new Vox(30, 20, 40, 0.1, [15, 0, 20]);
  for (let y = 0; y < 19; y++) { const w = Math.round(14 - y * 0.75); v.box(15 - w, y, 2, 14 + w, y, 37, (x) => (x === 15 - w || x === 14 + w ? col : (y + x) % 7 === 0 ? 0x6a604a : col)); }
  v.box(11, 0, 38, 18, 9, 38, 0x2a2420);
  return v.build();
}

function tarpShelter(col) {
  const v = new Vox(40, 24, 30, 0.1, [20, 0, 15]);
  for (const [x, z] of [[1, 1], [38, 1], [1, 28], [38, 28]]) v.box(x, 0, z, x, x < 20 ? 22 : 17, z, 0x5a4a3a);
  for (let x = 0; x < 40; x++) { const y = 23 - Math.floor(x / 8); v.box(x, y, 0, x, y, 29, (xx, yy, z) => ((z + xx) % 9 === 0 ? 0x2a3a5a : col)); }
  return v.build();
}

function campfire() {
  const v = new Vox(10, 6, 10, 0.1, [5, 0, 5]);
  for (let a = 0; a < 8; a++) v.set(Math.round(5 + Math.cos(a * 0.785) * 4), 0, Math.round(5 + Math.sin(a * 0.785) * 4), 0x6a665e);
  v.box(3, 0, 4, 6, 1, 5, 0x4a3022); v.box(4, 0, 3, 5, 1, 6, 0x4a3022);
  v.box(4, 2, 4, 5, 3, 5, 0xff9a30); v.set(4, 4, 4, 0xffd060);
  v.glow(0xff9a30); v.glow(0xffd060);
  return v.build();
}

function shipContainer(col) {
  const v = new Vox(24, 26, 60, 0.1, [12, 0, 30]);
  v.box(0, 0, 0, 23, 25, 59, (x, y, z) => (z % 4 === 0 ? col : ((col >> 1) & 0x7f7f7f) + 0x101010));
  v.box(0, 0, 0, 23, 25, 59, (x, y, z) => ((x === 0 || x === 23 || y === 25) && z % 4 !== 0 ? col : (z % 4 === 0 ? ((col >> 1) & 0x7f7f7f) : col)));
  v.box(2, 1, 59, 21, 24, 59, 0x3a3a3a); v.box(11, 2, 59, 12, 23, 59, 0x6a6a6a);
  return v.build();
}

function wagon() {
  // passenger rail carriage half buried in sand, long axis along z, 3 x 14 m
  const v = new Vox(30, 22, 140, 0.1, [15, 0, 70]);
  const body = 0x7a8a6a, trim = 0xc8b880, glass = 0x2a3a44;
  v.box(1, 0, 1, 28, 18, 138, body);
  v.box(1, 6, 1, 28, 7, 138, trim);
  for (let z = 8; z < 132; z += 10) { v.box(0, 10, z, 0, 15, z + 6, glass); v.box(29, 10, z, 29, 15, z + 6, glass); }
  v.box(2, 19, 2, 27, 20, 137, 0x5a6a52); v.box(6, 21, 10, 23, 21, 128, 0x4a5a44);
  // drifted sand along one flank
  for (let z = 0; z < 140; z++) { const h = 6 + Math.round(Math.sin(z * 0.07) * 3 + hsh(z, 1, 1) * 2); v.box(0, 0, z, 3, h, z, pick(SANDC, z, h, 0)); }
  for (let i = 0; i < 120; i++) v.set(1 + Math.floor(hsh(i, 2, 2) * 28), 1 + Math.floor(hsh(i, 5, 5) * 17), 1 + Math.floor(hsh(i, 9, 1) * 137), 0x8a5a2a);
  return v.build();
}

function rails() {
  const v = new Vox(30, 2, 40, 0.1, [15, 0, 20]);
  for (let z = 1; z < 40; z += 5) v.box(1, 0, z, 28, 0, z + 1, 0x5a4026);
  v.box(7, 1, 0, 8, 1, 39, 0x6a5a4a); v.box(21, 1, 0, 22, 1, 39, 0x6a5a4a);
  return v.build();
}

function cistern() {
  const v = new Vox(46, 22, 46, 0.18, [23, 0, 23]);
  cyl(v, 23, 23, 0, 16, 22, (x, y, z) => (y % 5 === 0 ? 0x8a867c : pick(CONC, x, y, z)));
  cyl(v, 23, 23, 16, 17, 22.4, 0x6a665e);
  cyl(v, 23, 23, 17, 18, 20, (x, y, z) => pick(SANDC, x, y, z));
  cyl(v, 23, 23, 18, 20, 4, 0x7a766e); cyl(v, 23, 23, 20, 20, 2.5, 0x3a3a3a);
  return v.build();
}

function pillar() {
  const v = new Vox(16, 52, 16, 0.12, [8, 0, 8]);
  v.box(1, 0, 1, 14, 46, 14, (x, y, z) => pick(CONC, x, y, z));
  v.box(0, 40, 0, 15, 46, 15, 0x7e7a72);
  for (let i = 0; i < 8; i++) v.box(2 + i * 2 - (i % 2), 46, 2 + (i % 3) * 5, 2 + i * 2 - (i % 2), 46 + 2 + (i % 4), 2 + (i % 3) * 5, 0x6a3a22);
  return v.build();
}

function scaffold() {
  const v = new Vox(32, 44, 10, 0.1, [16, 0, 5]);
  const P = 0x8a8a8a;
  for (const x of [0, 15, 31]) for (const z of [0, 9]) v.box(x, 0, z, x, 43, z, P);
  for (const y of [14, 28, 42]) { v.box(0, y, 0, 31, y, 9, (x, yy, z) => (z % 2 ? 0x8a6a40 : 0x6e5030)); v.box(0, y + 1, 9, 31, y + 1, 9, P); }
  for (let i = 0; i < 14; i++) v.set(i * 2, i, 0, P);
  return v.build();
}

function bell() {
  const v = new Vox(12, 14, 12, 0.1, [6, 0, 6]);
  for (let y = 0; y < 10; y++) cyl(v, 6, 6, y, y, 5 - y * 0.35, 0x8a6a2a);
  v.box(5, 10, 5, 6, 13, 6, 0x3a3a3a);
  return v.build();
}

function crateStack() {
  const v = new Vox(20, 18, 14, 0.1, [10, 0, 7]);
  const wood = (x, y, z) => ((x % 9 === 0 || y % 8 === 0) ? 0x4a3420 : (x + y) % 5 === 0 ? 0x6a4c2e : 0x7a5a38);
  v.box(0, 0, 0, 9, 7, 13, wood); v.box(10, 0, 1, 19, 7, 12, wood); v.box(4, 8, 2, 13, 15, 11, wood);
  return v.build();
}

function fieldDepot() {
  // field depot kiosk: corrugated hut with blue tarp + tall antenna (pneumatic delivery terminal)
  const v = new Vox(30, 70, 26, 0.1, [15, 0, 13]);
  v.box(1, 0, 1, 28, 22, 24, (x, y, z) => (x % 4 === 0 ? 0x5a646a : 0x6a747a));
  v.box(0, 23, 0, 29, 24, 25, 0x4a5258);
  v.box(1, 2, 0, 12, 20, 0, 0x2a5aa8); v.box(28, 4, 3, 29, 18, 20, 0x2a5aa8);       // blue tarp
  v.box(16, 4, 25, 25, 16, 25, 0x2a2a2a); v.box(18, 10, 26, 23, 12, 26, 0x40c0ff);
  v.box(23, 24, 18, 24, 66, 19, 0x7a7a7a);
  for (let y = 30; y < 66; y += 8) v.box(21, y, 18, 26, y, 19, 0x7a7a7a);
  v.box(22, 67, 17, 25, 69, 20, 0xff3030);
  v.glow(0x40c0ff); v.glow(0xff3030);
  return v.build();
}

// ------------------------------------------------------------------ INTERIORS
function bed(c) {
  const v = new Vox(14, 7, 22, 0.1, [7, 0, 11]);
  v.box(0, 0, 0, 13, 3, 21, 0x5a4026); v.box(1, 4, 1, 12, 4, 20, 0xe8e0d0);
  v.box(1, 5, 7, 12, 5, 20, c); v.box(2, 5, 1, 11, 6, 4, 0xf0ece4);
  v.box(0, 4, 0, 13, 6, 0, 0x4a3420);
  return v.build();
}
function hospBed() {
  const v = new Vox(12, 9, 22, 0.1, [6, 0, 11]);
  for (const [x, z] of [[0, 0], [11, 0], [0, 21], [11, 21]]) v.box(x, 0, z, x, 4, z, 0x9a9a9a);
  v.box(0, 4, 0, 11, 4, 21, 0xb8b8b0); v.box(1, 5, 1, 10, 5, 20, 0xe8ece8); v.box(1, 6, 8, 10, 6, 20, 0x8ab0a0);
  v.box(0, 5, 0, 11, 8, 0, 0x9a9a9a); v.box(2, 6, 1, 9, 6, 3, 0xf4f4f0);
  return v.build();
}
function sofa(c) {
  const v = new Vox(20, 8, 9, 0.1, [10, 0, 4.5]);
  v.box(0, 0, 0, 19, 3, 8, c); v.box(0, 4, 0, 19, 7, 2, c); v.box(0, 4, 0, 1, 5, 8, c); v.box(18, 4, 0, 19, 5, 8, c);
  v.box(2, 4, 3, 17, 4, 7, ((c >> 1) & 0x7f7f7f) + 0x303030);
  return v.build();
}
function table() {
  const v = new Vox(18, 9, 12, 0.1, [9, 0, 6]);
  v.box(0, 7, 0, 17, 7, 11, 0x6e5030);
  for (const [x, z] of [[1, 1], [16, 1], [1, 10], [16, 10]]) v.box(x, 0, z, x, 6, z, 0x4a3420);
  v.box(6, 8, 4, 8, 8, 6, 0xe8e0d0); v.box(11, 8, 5, 12, 9, 6, 0x7aa0c0);
  return v.build();
}
function counter() {
  const v = new Vox(30, 11, 8, 0.1, [15, 0, 4]);
  v.box(0, 0, 0, 29, 9, 7, (x, y, z) => (y === 9 ? 0xd8d0c0 : z === 7 && y % 3 === 0 ? 0x5a4026 : 0x7a5a38));
  v.box(3, 10, 2, 7, 10, 5, 0x3a3a3a); v.box(20, 10, 1, 24, 10, 4, 0xc8a050);
  return v.build();
}
function bookshelf() {
  const v = new Vox(18, 22, 5, 0.1, [9, 0, 2.5]);
  v.box(0, 0, 0, 17, 21, 4, 0x4a3420); v.box(1, 1, 1, 16, 20, 4, -1);
  const bk = [0x8a2a2a, 0x2a4a7a, 0x3a6a3a, 0xc8a050, 0x6a3a5a, 0xd8d0b8];
  for (let s = 0; s < 4; s++) { v.box(1, s * 5 + 1, 0, 16, s * 5 + 1, 4, 0x4a3420); for (let x = 1; x < 17; x++) { const h = 2 + Math.floor(hsh(x, s, 3) * 3); v.box(x, s * 5 + 2, 1, x, s * 5 + 1 + h, 3, bk[Math.floor(hsh(s, x, 1) * bk.length)]); } }
  return v.build();
}
function serverRack() {
  const v = new Vox(8, 22, 8, 0.1, [4, 0, 4]);
  v.box(0, 0, 0, 7, 21, 7, 0x2a2c30);
  for (let y = 2; y < 20; y += 2) { v.box(1, y, 8, 6, y, 8, 0x3a3c42); v.set(1 + (y % 5), y, 8, y % 4 ? 0x40ff80 : 0xffa020); }
  v.glow(0x40ff80); v.glow(0xffa020);
  return v.build();
}
function officeDesk() {
  const v = new Vox(16, 13, 9, 0.1, [8, 0, 4.5]);
  v.box(0, 6, 0, 15, 7, 8, 0x8a7a62); v.box(0, 0, 0, 1, 5, 8, 0x6a5a48); v.box(14, 0, 0, 15, 5, 8, 0x6a5a48);
  v.box(5, 8, 1, 10, 12, 2, 0x2a2a2e); v.box(6, 9, 3, 9, 11, 3, 0x30a0ff); v.box(7, 8, 3, 8, 8, 4, 0x2a2a2e);
  v.box(4, 8, 5, 11, 8, 6, 0x3a3a3a);
  v.glow(0x30a0ff);
  return v.build();
}
function pew() {
  const v = new Vox(30, 9, 6, 0.1, [15, 0, 3]);
  v.box(0, 3, 0, 29, 3, 4, 0x5a3a22); v.box(0, 4, 0, 29, 8, 0, 0x5a3a22);
  v.box(0, 0, 0, 1, 8, 5, 0x4a3018); v.box(28, 0, 0, 29, 8, 5, 0x4a3018);
  return v.build();
}
function altar() {
  const v = new Vox(24, 26, 10, 0.1, [12, 0, 5]);
  v.box(0, 0, 0, 23, 9, 9, (x, y, z) => pick(STONE, x, y, z)); v.box(0, 10, 0, 23, 10, 9, 0xd8c890);
  v.box(11, 11, 3, 12, 25, 4, 0xc8a040); v.box(7, 20, 3, 16, 21, 4, 0xc8a040);
  v.box(3, 11, 4, 3, 14, 4, 0xe8e0c8); v.box(20, 11, 4, 20, 14, 4, 0xe8e0c8); v.set(3, 15, 4, 0xffd060); v.set(20, 15, 4, 0xffd060);
  v.glow(0xffd060);
  return v.build();
}
function clothesRack() {
  const v = new Vox(18, 16, 6, 0.1, [9, 0, 3]);
  v.box(0, 0, 2, 0, 15, 3, 0x8a8a8a); v.box(17, 0, 2, 17, 15, 3, 0x8a8a8a); v.box(0, 15, 2, 17, 15, 3, 0x8a8a8a);
  const cl = [0xc84a3a, 0x3a5a9a, 0xe8d8b0, 0x2a2a2a, 0x6a8a4a];
  for (let i = 0; i < 7; i++) v.box(2 + i * 2, 6 + (i % 3), 0, 3 + i * 2, 14, 5, cl[i % cl.length]);
  return v.build();
}
function stove() {
  const v = new Vox(10, 10, 8, 0.1, [5, 0, 4]);
  v.box(0, 0, 0, 9, 8, 7, 0xe8e4d8); v.box(1, 9, 1, 8, 9, 6, 0x2a2a2a); v.box(1, 2, 7, 8, 6, 7, 0x3a3a3a);
  return v.build();
}
function carCar(body, seed) { return fiat(body, seed); }

// ------------------------------------------------------------------ REGISTER
const R = (k, fn, info) => registerProp(k, fn, info);
R('sc_palm', () => palm(46, 0, 1), { solid: [0.25, 0.25, 6] });
R('sc_palm2', () => palm(34, 1, 3), { solid: [0.25, 0.25, 4.5] });
R('sc_palm3', () => palm(54, -0.6, 5), { solid: [0.25, 0.25, 7] });
R('sc_olive', () => olive(1), { solid: [0.35, 0.35, 3.5] });
R('sc_olive2', () => olive(4), { solid: [0.35, 0.35, 3.5] });
R('sc_cypress', cypress, { solid: [0.4, 0.4, 7] });
R('sc_shrub', () => shrub(false), { cast: true });
R('sc_shrub_dry', () => shrub(true), { cast: true });
R('sc_agave', agave, { cast: true });
R('sc_grass', duneGrass, { cast: false });
R('sc_awning', () => awning(0xb8402e, 0xe8dcc0), { cast: true });
R('sc_awning2', () => awning(0x3a7a4a, 0xe8dcc0), { cast: true });
R('sc_awning3', () => awning(0x2e5a9a, 0xe8e0c8), { cast: true });
R('sc_stall', () => stall(0xb8402e, 0xe8dcc0, 1), { solid: [1.25, 0.85, 1.1] });
R('sc_stall2', () => stall(0x3a6aa8, 0xe8e0c8, 3), { solid: [1.25, 0.85, 1.1] });
R('sc_fountain', fountain, { solid: [2.8, 2.8, 0.7] });
R('sc_statue', statue, { solid: [0.65, 0.65, 3.5] });
R('sc_metro', metroEntrance, {});
R('sc_metro_stairs', metroStairs, {});
R('sc_barrier', barrier, { solid: [1.0, 0.3, 0.9] });
R('sc_fiat', () => fiat(0xd8c8a0, 1), { solid: [0.8, 1.7, 1.2] });
R('sc_fiat2', () => fiat(0x7aa8c8, 2), { solid: [0.8, 1.7, 1.2] });
R('sc_fiat3', () => fiat(0xb84a32, 3), { solid: [0.8, 1.7, 1.2] });
R('sc_fiat4', () => fiat(0x5a7a4a, 4), { solid: [0.8, 1.7, 1.2] });
R('sc_carroof', () => carRoof(0xc8b890), { solid: [0.8, 1.6, 0.55] });
R('sc_carroof2', () => carRoof(0x6a8aa8), { solid: [0.8, 1.6, 0.55] });
R('sc_bus', bus, { solid: [1.25, 5.0, 3.0] });
R('sc_vespa', () => vespa(0x8ac0b0), { solid: [0.3, 0.8, 1.0] });
R('sc_vespa2', () => vespa(0xd84a3a), { solid: [0.3, 0.8, 1.0] });
R('sc_sign', () => sign(0xc83a2a), { solid: [0.1, 0.1, 2.6] });
R('sc_streetsign', streetSign, { solid: [0.1, 0.1, 2.6] });
R('sc_planter', () => planter(1), { solid: [0.45, 0.45, 0.9] });
R('sc_planter2', () => planter(2), { solid: [0.45, 0.45, 0.9] });
R('sc_vase', vase, { solid: [0.4, 0.4, 1.2] });
R('sc_laundry', () => laundry(1), { cast: true });
R('sc_laundry2', () => laundry(2), { cast: true });
R('sc_lamppost', lampPost, { solid: [0.15, 0.15, 2.4] });
R('sc_slab', () => slab(1), { solid: [1.4, 1.0, 0.9] });
R('sc_slab2', () => slab(2), { solid: [1.4, 1.0, 0.9] });
R('sc_rubble', () => rubble(1), { solid: [0.9, 0.9, 0.5] });
R('sc_rubble2', () => rubble(2), { solid: [0.9, 0.9, 0.5] });
R('sc_column', column, { solid: [0.45, 0.45, 2.6] });
R('sc_column_fallen', columnFallen, { solid: [1.5, 0.35, 0.7] });
R('sc_bench', bench, { solid: [0.85, 0.25, 0.5] });
R('sc_cafe', () => cafeTable(0), {});
R('sc_cafe2', () => cafeTable(1), {});
R('sc_parasol', () => parasol(0xe8dcc0, 0xb8402e), { solid: [0.1, 0.1, 2.2] });
R('sc_parasol2', () => parasol(0xe8dcc0, 0x3a7a4a), { solid: [0.1, 0.1, 2.2] });
R('sc_kiosk', kiosk, { solid: [1.05, 1.05, 2.6] });
R('sc_pump', pump, { solid: [0.4, 0.3, 1.8] });
R('sc_tent', () => tent(0x8a7a52), { solid: [1.4, 1.9, 1.6] });
R('sc_tent2', () => tent(0x5a6a4a), { solid: [1.4, 1.9, 1.6] });
R('sc_tarp', () => tarpShelter(0x2e5a9a), { cast: true });
R('sc_tarp2', () => tarpShelter(0x9a6a3a), { cast: true });
R('sc_campfire', campfire, { cast: false });
R('sc_container', () => shipContainer(0x9a4a2a), { solid: [1.2, 3.0, 2.6] });
R('sc_container2', () => shipContainer(0x2e5a7a), { solid: [1.2, 3.0, 2.6] });
R('sc_wagon', wagon, { solid: [1.5, 7.0, 2.0] });
R('sc_rails', rails, { cast: false });
R('sc_cistern', cistern, { solid: [4.0, 4.0, 3.5] });
R('sc_pillar', pillar, { solid: [0.9, 0.9, 5.5] });
R('sc_scaffold', scaffold, { solid: [1.6, 0.5, 4.4] });
R('sc_bell', bell, { solid: [0.5, 0.5, 1.3] });
R('sc_cratestack', crateStack, { solid: [1.0, 0.7, 1.6] });
R('sc_fielddepot', fieldDepot, { solid: [1.5, 1.3, 2.4] });
R('sc_bed', () => bed(0x8a3a3a), { solid: [0.7, 1.1, 0.6] });
R('sc_bed2', () => bed(0x3a5a8a), { solid: [0.7, 1.1, 0.6] });
R('sc_hospbed', hospBed, { solid: [0.6, 1.1, 0.7] });
R('sc_sofa', () => sofa(0x7a4a3a), { solid: [1.0, 0.45, 0.8] });
R('sc_sofa2', () => sofa(0x4a6a5a), { solid: [1.0, 0.45, 0.8] });
R('sc_table', table, { solid: [0.9, 0.6, 0.8] });
R('sc_counter', counter, { solid: [1.5, 0.4, 1.0] });
R('sc_bookshelf', bookshelf, { solid: [0.9, 0.25, 2.2] });
R('sc_server', serverRack, { solid: [0.4, 0.4, 2.2] });
R('sc_desk', officeDesk, { solid: [0.8, 0.45, 0.8] });
R('sc_pew', pew, { solid: [1.5, 0.3, 0.9] });
R('sc_altar', altar, { solid: [1.2, 0.5, 1.0] });
R('sc_rack', clothesRack, { solid: [0.9, 0.3, 1.6] });
R('sc_stove', stove, { solid: [0.5, 0.4, 0.9] });
export const SC_PROPS = true;
