// Icon art: crafting materials, components, nature items and ARK machine parts.
import { K, mix, dk, lt, hashStr, rng } from './icon_kit.js';
import { GL, spark, recolorRows } from './icon_art_gear.js';

export const ART = {}, FAM = {};
const rep = (n, v) => Array(n).fill(v);
const BR = 0xd8a838, CU = 0xd07040;
export const ARC = { body: 0x3a3c42, plate: 0x5a5e66, dark: 0x202226, eye: 0xff2a10, hot: 0xffa020, white: 0xd8d4c8, rust: 0x8a5a34, blue: 0x30a0ff };

// ---------------------------------------------------------------- helpers
export function gear(g, cx, cy, rOut, rIn, teeth, c, hole = 0, phase = 0) {
  const pred = (x, y) => {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy);
    if (d < hole) return false;
    if (d <= rIn) return true;
    if (d > rOut) return false;
    return Math.cos(Math.atan2(dy, dx) * teeth + phase) > 0.05;
  };
  g.fill(cx - rOut - 1, cy - rOut - 1, cx + rOut + 1, cy + rOut + 1, pred, c, 'bevel');
  if (hole) g.o(cx, cy, hole, hole + 1, dk(c, 0.35), 'flat');
}
export function hexagon(g, cx, cy, r, c, m = 'bevel') {
  const pts = []; for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; pts.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
  g.p(pts, c, m);
}
export function rotor(g, cx, cy, r, blades, c, hub, phase = 0.4, w = 2.4) {
  for (let i = 0; i < blades; i++) { const a = phase + i * Math.PI * 2 / blades; g.bar(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r, w, c); }
  g.c(cx + 0.5, cy + 0.5, 2.6, hub); g.c(cx + 0.5, cy + 0.5, 1, dk(hub, 0.5), 'flat');
}

// ---------------------------------------------------------------- basic materials
ART.metal_parts = g => {
  g.p([2, 15, 11, 12, 13, 19, 4, 21], 0x7a7e88);
  g.s(5, 17, K.dark); g.s(10, 15, K.dark);
  g.bar(6, 4, 12, 11, 2.2, K.steel); for (let i = 0; i < 4; i++) g.s(7 + i * 1.5, 6 + i * 1.5, K.gun);
  g.r(3, 2, 7, 5, 0xb8bcc4);
  hexagon(g, 16.5, 13.5, 5.4, 0x9a9ea8); g.c(16.5, 13.5, 2, 0x2e2e36, 'flat');
};
ART.steel_spring = g => {
  for (let y = 3; y <= 18; y += 3) g.l(17, y, 6, y + 2, 0x5e626e);
  for (let y = 3; y <= 18; y += 3) { g.l(6, y + 2, 17, y + 3, 0xb8bcc4); g.s(9, y + 2, 0xe8ecf0); }
  g.r(6, 21, 17, 21, K.steel, 'flat'); g.r(6, 2, 17, 2, K.steel, 'flat');
};
ART.magnet = g => {
  g.o(12, 10, 3.2, 8, 0xd03828, 'sphere');
  for (let y = 11; y <= 20; y++) for (let x = 0; x < 24; x++) g.clear(x, y);
  g.r(4, 10, 8, 16, 0xd03828, 'cylV'); g.r(16, 10, 20, 16, 0xd03828, 'cylV');
  g.r(4, 17, 8, 20, 0xc8ccd4, 'cylV'); g.r(16, 17, 20, 20, 0xc8ccd4, 'cylV');
  g.l(2, 21, 3, 22, K.cyan); g.l(21, 21, 22, 22, K.cyan);
};
ART.plastic_parts = g => {
  g.p([3, 4, 9, 4, 9, 14, 15, 14, 15, 19, 3, 19], 0x3a8ad8);
  g.lathe(17, 3, [[6, 0xf0c838], [8, 0xf0c838], [8, 0xf0c838], [8, dk(0xf0c838, 0.3)]]);
  g.bar(12, 9, 20, 9, 3.6, 0xe8e4d8, { cap: 'flat' }); g.e(20.5, 9.5, 1, 1.8, 0xb8b4a8, 'flat');
  g.c(18, 18, 3, 0xe84a30); g.c(18, 18, 1, 0x7a2018, 'flat');
};
ART.rubber_parts = g => {
  g.o(9, 13, 4.5, 8, 0x2e2e34, 'sphere');
  for (let a = 0; a < 16; a++) { const t = a * Math.PI / 8; g.s(9 + Math.cos(t) * 7.4, 13 + Math.sin(t) * 7.4, 0x1a1a1e); }
  g.o(18, 6, 1.6, 3.4, 0x3a3a42, 'sphere');
  g.bar(14, 19, 21, 16, 3.4, 0x34343c);
};
ART.fabric = g => {
  g.rr(3, 13, 20, 19, 0x8a7a5a, 'soft', 1); g.rr(4, 9, 19, 14, 0xb8a888, 'soft', 1); g.rr(3, 5, 20, 10, 0xd8ccb0, 'soft', 1);
  for (let x = 5; x <= 18; x += 2) { g.s(x, 7, 0xa89878); g.s(x + 1, 16, 0x6a5a40); }
};
ART.durable_cloth = g => {
  g.r(3, 8, 17, 17, 0x6a7a48, 'cylH'); g.e(18, 12.5, 2.6, 4.5, 0x8a9a62, 'flat'); g.o(18, 12.5, 1, 2.2, 0x5a6a3c, 'flat', 1.6);
  for (const x of [7, 13]) g.r(x, 7, x + 1, 18, 0x4a3a28, 'cylV');
  g.r(7, 11, 8, 13, BR, 'flat');
};
ART.duct_tape = g => {
  g.o(10, 11, 3.5, 8, 0xa8acb4, 'sphere');
  g.o(10, 11, 3.5, 4.2, 0x7a6a50, 'flat');
  g.p([15, 16, 21, 19, 20, 22, 14, 18], 0xb8bcc4, 'soft'); g.l(16, 18, 20, 20, 0x8a8e98);
};
ART.rope = g => {
  for (let i = 0; i < 3; i++) g.o(11, 12, 2 + i * 2.6, 3.6 + i * 2.6, i % 2 ? 0xb89a68 : 0xc8aa78, 'flat', 0.85);
  for (let a = 0; a < 40; a++) { const t = a * 0.6, r = 3 + (a % 3) * 2.6; g.s(11 + Math.cos(t) * r, 12 + Math.sin(t) * r * 0.85, 0x8a6a40); }
  g.bar(17, 17, 21, 21, 2.4, 0xc8aa78); g.s(21, 21, 0xe8d8b0);
};
ART.chemicals = g => {
  g.p([9, 3, 14, 3, 14, 9, 20, 20, 3, 20, 9, 9], 0xc8e8f0, 'soft');
  g.p([6, 14, 17, 14, 20, 20, 3, 20], 0x58c848, 'flat');
  g.r(4, 19, 19, 19, 0x3a9a3a, 'flat'); g.dots([8, 16, 12, 15, 14, 17], 0xb8f0a0);
  g.r(9, 1, 14, 3, 0x9a6a3a); g.l(10, 6, 10, 12, 0xffffff);
};
ART.antiseptic = g => {
  g.lathe(12, 2, [[4, 0xe8e8e0], [4, 0xe8e8e0], [6, 0xd8d8d0], [8, 0x8a4a20], ...rep(13, [10, 0x9a5a28]), [10, dk(0x9a5a28, 0.3)]]);
  g.lathe(12, 9, rep(7, [10, 0xf0ece0]));
  g.glyph(GL.plus, 10, 10, 0xd03828);
};

// ---------------------------------------------------------------- components
ART.mechanical_components = g => { gear(g, 9, 13, 7.5, 5.6, 8, K.steel, 2); gear(g, 17, 7, 4.6, 3.2, 6, BR, 1.2, 0.3); g.bar(14, 19, 21, 15, 2.2, 0x7a7e88); };
ART.electrical_components = g => {
  g.rr(2, 5, 21, 19, 0x2a7a3a, 'bevel', 1);
  g.pl([4, 8, 8, 8, 10, 10, 18, 10], BR); g.pl([4, 16, 12, 16, 14, 14, 19, 14], BR);
  g.r(7, 11, 12, 15, K.black); g.dots([8, 12, 11, 14], K.gunL);
  g.lathe(17, 12, [[4, 0x3a5ad8], [4, 0x3a5ad8], [4, 0x3a5ad8], [4, 0x2a3a90]]); g.lathe(17, 11, [[4, K.steel]]);
  g.r(14, 6, 18, 7, 0xd8c890); g.s(15, 6, K.red); g.s(17, 6, K.red);
};
ART.mod_components = g => {
  g.r(2, 6, 21, 9, K.gun); for (let x = 3; x <= 20; x += 2) g.s(x, 6, K.dark);
  g.bar(5, 14, 5, 20, 2.4, K.steel, { cap: 'flat' }); g.r(3, 12, 7, 13, 0xb8bcc4);
  g.bar(12, 14, 12, 20, 2.4, K.steel, { cap: 'flat' }); g.r(10, 12, 14, 13, 0xb8bcc4);
  g.p([16, 12, 21, 12, 21, 20, 19, 20, 19, 14, 16, 14], 0x4a90d8);
};
ART.advanced_mechanical_components = g => {
  gear(g, 10, 12, 8.5, 6.5, 10, 0xd8a838, 2.5); gear(g, 18, 18, 4.5, 3.2, 6, K.steel, 1.2, 0.3);
  g.c(10, 12, 3.4, K.steel); g.c(10, 12, 1.4, K.dark, 'flat');
  g.dots([16, 4, 18, 6, 20, 4], K.chrome);
};
ART.advanced_electrical_components = g => {
  g.rr(2, 4, 21, 20, 0x1e3a78, 'bevel', 1);
  for (let y = 6; y <= 18; y += 3) g.pl([3, y, 7, y, 9, y + 1], BR);
  for (let x = 15; x <= 19; x += 2) g.l(x, 5, x, 19, dk(BR, 0.2));
  g.r(8, 8, 15, 15, 0x14141a); g.r(10, 10, 13, 13, 0x3a3a48); g.c(12, 12, 1.2, K.cyan, 'flat');
  for (let i = 8; i <= 15; i += 2) { g.s(i, 7, K.chrome); g.s(i, 16, K.chrome); }
};
ART.magnetic_accelerator = g => {
  g.o(12, 12, 5, 9.5, 0xb86a3a, 'sphere');
  for (let a = 0; a < 24; a++) { const t = a * Math.PI / 12; g.l(12 + Math.cos(t) * 5.5, 12 + Math.sin(t) * 5.5, 12 + Math.cos(t) * 9, 12 + Math.sin(t) * 9, a % 2 ? 0x8a4a28 : 0xd8884a); }
  g.c(12, 12, 4.4, 0x2aa8e0, 'glow'); g.c(12, 12, 1.6, 0xe0faff, 'flat');
};
ART.exodos_modules = g => {
  hexagon(g, 9, 9, 7, 0x4a3a6a); hexagon(g, 15, 15, 7, 0x5a4080);
  hexagon(g, 15, 15, 3.2, 0xd070ff, 'glow'); g.glyph(['#.#', '.#.', '#.#'], 14, 14, 0xffe8ff);
  g.glyph(['##.', '.##', '#..'], 7, 7, 0xb070f0);
};
ART.sensors = g => {
  g.rr(3, 8, 20, 18, 0x2a6a3a, 'bevel', 1);
  g.c(8.5, 13, 4.2, K.dark); g.c(8.5, 13, 2.8, 0x3050a0); g.s(7, 11, 0xd0e8ff); g.s(8, 12, 0x8ab0ff);
  g.r(14, 10, 18, 12, K.black); g.r(14, 14, 18, 16, K.black); g.s(17, 15, K.red);
  for (let x = 4; x <= 19; x += 3) g.s(x, 19, BR);
};
ART.processor = g => {
  for (let i = 5; i <= 18; i += 2) { g.r(i, 2, i, 3, BR, 'flat'); g.r(i, 20, i, 21, BR, 'flat'); g.r(2, i, 3, i, BR, 'flat'); g.r(20, i, 21, i, BR, 'flat'); }
  g.r(4, 4, 19, 19, 0x2a5a3a);
  g.r(7, 7, 16, 16, 0xb8bcc4); g.r(8, 8, 15, 15, 0x9a9ea8, 'flat'); g.r(9, 9, 10, 10, 0xe8ecf0, 'flat');
  g.s(5, 18, BR);
};
ART.speaker_component = g => {
  g.rr(2, 2, 21, 21, K.dark, 'bevel', 2);
  g.c(12, 12, 8.5, K.gun, 'flat'); g.c(12, 12, 7.5, 0x2a2a30, 'sphere'); g.o(12, 12, 4, 5, 0x4a4a54, 'flat'); g.c(12, 12, 2.8, 0x5a5e66);
  g.dots([4, 4, 19, 4, 4, 19, 19, 19], K.steel);
};
ART.voltage_converter = g => {
  g.rr(3, 6, 20, 20, 0x5a6a5a, 'bevel', 1);
  g.lathe(8, 8, rep(8, [5, CU])); g.lathe(15, 8, rep(8, [5, CU])); for (let y = 9; y <= 15; y += 2) { g.r(6, y, 10, y, dk(CU, 0.3), 'flat'); g.r(13, y, 17, y, dk(CU, 0.3), 'flat'); }
  g.r(6, 3, 7, 5, K.red); g.r(16, 3, 17, 5, K.dark);
  g.glyph(GL.boltS, 10, 16, K.yellow);
};
ART.motor = g => {
  g.r(4, 7, 16, 18, 0x3a5a8a, 'cylH'); for (let x = 6; x <= 14; x += 2) g.r(x, 7, x, 18, 0x2a4a72, 'flat');
  g.r(2, 8, 4, 17, K.steel, 'cylH'); g.r(16, 9, 18, 16, K.steel, 'cylH'); g.r(18, 11, 22, 13, 0xc8ccd4, 'cylH');
  g.r(8, 4, 13, 7, K.dark); g.s(9, 3, K.red); g.s(12, 3, K.dark);
};

// ---------------------------------------------------------------- explosives, gun parts, power
ART.crude_explosives = g => {
  for (const [x, c] of [[4, 0xc83a2a], [9, 0xd84a32], [14, 0xc83a2a]]) g.r(x, 6, x + 5, 20, c, 'cylV');
  g.r(3, 10, 20, 11, 0x9a9a8a); g.r(3, 15, 20, 16, 0x9a9a8a);
  g.pl([11, 6, 11, 3, 14, 2, 17, 3], 0x8a7a60); spark(g, 18, 3);
};
ART.explosive_compound = g => {
  g.rr(2, 7, 21, 18, 0xd8d0b0, 'bevel', 1);
  g.r(2, 7, 21, 9, 0x6a7a48, 'flat'); g.r(2, 16, 21, 18, 0x6a7a48, 'flat');
  g.r(6, 11, 13, 14, 0x5a6a3c, 'flat'); g.r(7, 12, 12, 12, 0xd8d0b0, 'flat');
  g.r(16, 10, 19, 15, K.dark); g.s(17, 11, K.red);
  g.pl([18, 10, 19, 6, 22, 4], K.red); g.pl([17, 10, 16, 5, 18, 3], K.blue);
};
ART.simple_gun_parts = g => {
  for (let y = 3; y <= 12; y += 2) g.l(3, y, 9, y + 1, y % 4 === 1 ? 0xb8bcc4 : 0x7a7e88);
  g.bar(12, 4, 20, 4, 2, K.steel); g.r(19, 3, 20, 5, K.dark);
  g.bar(12, 9, 18, 9, 1.6, 0xb8bcc4);
  g.p([4, 15, 9, 15, 10, 21, 8, 21, 7, 17, 4, 17], K.gun);
  g.c(16, 17, 3.4, K.gunL); g.c(16, 17, 1.2, K.dark, 'flat');
};
ART.light_gun_parts = g => {
  g.r(2, 6, 18, 10, 0xb8bcc4); for (let x = 4; x <= 8; x++) g.s(x, 8, x % 2 ? K.gun : 0xb8bcc4);
  g.r(11, 6, 15, 7, K.dark, 'flat'); g.s(17, 5, K.gun);
  g.r(6, 13, 21, 15, K.gunL, 'cylH'); g.r(4, 12, 7, 16, K.gun);
  g.r(15, 18, 20, 20, K.dark);
};
ART.medium_gun_parts = g => {
  g.r(2, 7, 16, 14, K.gun, 'cylH');
  g.r(16, 9, 21, 12, 0x7a7e88, 'cylH'); g.r(21, 10, 22, 11, BR, 'flat');
  g.r(5, 4, 10, 6, K.gunL); g.r(9, 9, 13, 11, K.dark, 'flat');
  g.bar(4, 19, 16, 19, 1.6, 0xb8bcc4); g.r(2, 18, 4, 20, K.gun);
};
ART.heavy_gun_parts = g => {
  g.r(1, 8, 9, 16, K.dark, 'cylH');
  g.r(9, 9, 18, 15, 0x5e626e, 'cylH'); for (let x = 11; x <= 17; x += 2) g.r(x, 9, x, 15, 0x3a3c44, 'flat');
  g.rr(18, 6, 22, 18, K.gun, 'bevel', 1); g.r(19, 9, 21, 9, K.black, 'flat'); g.r(19, 14, 21, 14, K.black, 'flat');
  g.r(3, 17, 7, 21, K.gun);
};
ART.complex_gun_parts = g => {
  g.p([2, 7, 19, 7, 21, 10, 21, 15, 2, 15], 0x3a3c48);
  g.r(3, 8, 18, 8, BR, 'flat'); g.r(4, 10, 9, 12, K.black, 'flat'); g.r(12, 10, 19, 12, 0x2a7ab8, 'flat'); g.r(13, 11, 18, 11, K.cyan, 'flat');
  g.p([5, 15, 9, 15, 8, 21, 4, 21], K.gun); g.r(12, 15, 15, 20, K.dark); g.s(13, 17, BR);
  g.dots([3, 13, 20, 13], 0xffe080);
};
ART.power_rod = g => {
  g.lathe(12, 1, [[6, K.steel], [8, K.steel], ...rep(17, [8, 0x2a1a3a]), [8, K.steel], [6, K.steel]]);
  g.r(10, 4, 13, 19, 0xd060ff, 'glow'); g.r(11, 5, 12, 18, 0xf8e0ff, 'flat');
  for (const y of [7, 12, 17]) g.lathe(12, y, [[8, K.gun]]);
};
ART.battery = g => {
  g.lathe(12, 2, [[4, 0xb8bcc4], [4, 0xb8bcc4]]);
  g.lathe(12, 4, [...rep(6, [10, K.black]), ...rep(10, [10, 0x48b048]), [10, 0xb8bcc4], [10, 0x8a8e98]]);
  g.glyph(['.#.', '###', '.#.'], 11, 6, 0xffffff); g.r(10, 15, 13, 15, 0x1a3a1a, 'flat');
};
ART.industrial_battery = g => {
  g.rr(2, 7, 21, 20, 0x34343c, 'bevel', 1);
  g.r(3, 7, 20, 9, 0x4a4a54, 'flat');
  g.r(4, 4, 6, 6, K.red); g.r(17, 4, 19, 6, K.dark);
  g.r(5, 12, 18, 16, K.yellow, 'flat'); g.glyph(GL.boltS, 10, 12, K.black);
  g.pl([8, 6, 9, 3, 14, 3, 15, 6], K.gunL);
};
ART.wires = g => {
  for (let i = 0; i < 3; i++) g.o(11, 12, 3 + i * 2.2, 4.2 + i * 2.2, i === 1 ? 0xb86a3a : 0xd88a50, 'flat', 0.8);
  g.bar(16, 15, 20, 20, 1.6, K.red); g.bar(17, 13, 21, 17, 1.6, K.blue); g.s(20, 21, BR); g.s(22, 18, BR);
};
ART.power_cable = g => {
  for (let i = 0; i < 3; i++) g.o(10, 11, 2.5 + i * 2.6, 4.2 + i * 2.6, i % 2 ? 0x4a4a56 : 0x62626e, 'flat', 0.85);
  g.bar(15, 15, 18, 18, 2.6, 0x4a4a56); g.rr(17, 17, 22, 22, K.yellow, 'bevel', 1); g.dots([19, 19, 20, 20], K.dark);
};
ART.oil = g => {
  g.e(10, 15, 7, 6, 0x3a5a3a); g.r(3, 15, 17, 20, 0x3a5a3a, 'cylV');
  g.bar(14, 10, 21, 3, 1.8, BR); g.r(8, 7, 12, 9, BR); g.r(5, 14, 15, 17, 0xd8c890, 'flat');
  g.s(21, 5, 0x1a1a10); g.s(21, 6, 0x1a1a10);
};
function jerrycan(g, body, window) {
  g.rr(3, 5, 19, 21, body, 'bevel', 1);
  g.p([3, 9, 6, 2, 13, 2, 13, 5], body);
  g.r(7, 3, 12, 3, K.black, 'flat');
  g.r(15, 2, 17, 5, dk(body, 0.3));
  g.l(5, 8, 17, 19, dk(body, 0.25)); g.l(17, 8, 5, 19, dk(body, 0.25));
  if (window) g.r(9, 11, 13, 15, window, 'glow');
}
ART.canister = g => jerrycan(g, 0x5a6a3c);
ART.synthesized_fuel = g => jerrycan(g, 0xc84a2a, 0x58e8c0);

// ---------------------------------------------------------------- nature
ART.assorted_seeds = g => {
  g.rr(4, 2, 17, 18, 0xe8dcb8, 'soft', 1); g.r(4, 2, 17, 4, 0xc8b890, 'flat');
  g.r(6, 6, 15, 13, 0x8ac8e8, 'flat'); g.l(10, 13, 10, 9, 0x3a8a3a); g.c(10, 8, 2, 0xf0c838);
  g.r(6, 15, 13, 15, 0xa89878, 'flat');
  for (const [x, y, c] of [[16, 20, 0x8a6a3a], [19, 18, 0x6a4a2a], [21, 21, 0xa8884a], [14, 21, 0x6a4a2a]]) g.e(x, y, 1.4, 1, c);
};
ART.great_mullein = g => {
  g.l(12, 22, 12, 6, 0x6a8a48);
  for (let y = 3; y <= 13; y++) { if (y % 2) { g.s(11, y, 0xf0d040); g.s(13, y, 0xf0d040); } else g.s(12, y, 0xf8e070); }
  g.p([12, 21, 4, 14, 6, 13, 12, 18], 0x9ab878); g.p([12, 20, 20, 12, 21, 14, 13, 19], 0x8aa868);
  g.p([12, 16, 6, 10, 8, 10, 12, 14], 0xa8c088);
};
ART.moss = g => {
  g.e(12, 17, 9, 5, 0x6a6a64);
  for (const [x, y, r] of [[7, 13, 4], [12, 11, 4.5], [17, 13, 4], [10, 15, 3.5], [15, 15, 3.5]]) g.c(x, y, r, 0x4a8a2e);
  for (let i = 0; i < 18; i++) { const r = rng('moss' + i); g.s(4 + ((r() * 16) | 0), 8 + ((r() * 9) | 0), r() < 0.5 ? 0x78b848 : 0x2e6a22); }
};
ART.mushroom = g => {
  g.r(7, 12, 10, 20, 0xe8dcc0, 'cylV'); g.e(8.5, 11, 6.5, 4, 0x9a5a2e); g.dots([6, 9, 10, 8, 12, 10], 0xe8d8b0);
  g.r(15, 15, 17, 21, 0xe8dcc0, 'cylV'); g.e(16, 14.5, 4.2, 2.8, 0xb87a40);
  g.r(3, 21, 20, 21, 0x5a4a2a, 'flat');
};
ART.agave = g => {
  const L = 0x5a9a7a;
  for (const [x1, y1] of [[2, 6], [6, 2], [12, 1], [18, 2], [22, 6], [1, 13], [22, 13]]) g.bar(12, 19, x1, y1, 2.8, L, { cap: 'flat' });
  g.bar(12, 19, 9, 6, 3, lt(L, 0.15)); g.bar(12, 19, 15, 6, 3, lt(L, 0.15));
  g.e(12, 20, 6, 2.5, 0x4a7a5a);
};
ART.roots = g => {
  const R = 0x8a6040;
  g.e(12, 5, 4, 3, 0x6a5030);
  for (const [x, y] of [[4, 20], [9, 21], [15, 21], [20, 19], [2, 14], [22, 12]]) g.pl([12, 6, (12 + x) / 2 + (x > 12 ? -2 : 2), (6 + y) / 2, x, y], R);
  g.bar(12, 6, 12, 14, 2.4, R);
};
ART.resin = g => {
  g.e(10, 14, 7, 6, 0xd88a20); g.e(17, 8, 3.5, 4, 0xe8a030); g.e(17, 18, 2.6, 2.6, 0xc87a18);
  g.dots([8, 11, 9, 11, 16, 6], 0xfff0b0);
};
ART.fertilizer = g => {
  g.p([5, 4, 18, 4, 20, 21, 3, 21], 0xc8b890, 'soft');
  g.r(5, 3, 18, 5, 0xa89870); g.dots([7, 4, 10, 4, 13, 4, 16, 4], 0x6a5a40);
  g.c(11.5, 13, 4, 0x58a848); g.l(11, 17, 12, 10, 0x2e6a2a);
};
ART.apricot = g => { g.c(12, 13, 7.5, 0xf09030); g.l(12, 7, 11, 13, dk(0xf09030, 0.2)); g.bar(12, 6, 14, 3, 1.6, 0x6a4a2a); g.p([14, 4, 20, 2, 18, 6], 0x58a848); };
ART.lemon = g => { g.e(12, 12.5, 8.5, 6, 0xf0d838); g.r(3, 12, 4, 13, 0xd8c020); g.r(20, 12, 21, 13, 0xd8c020); g.p([13, 6, 18, 3, 17, 7], 0x58a848); };
ART.olives = g => {
  g.pl([3, 4, 9, 7, 15, 6, 21, 3], 0x6a5030); g.p([10, 7, 13, 3, 14, 6], 0x7a9a58); g.p([16, 5, 20, 7, 17, 8], 0x7a9a58);
  for (const [x, y, c] of [[7, 12, 0x6a8a30], [13, 14, 0x3a2a3a], [18, 11, 0x7a9a3a], [10, 18, 0x4a3a4a], [16, 18, 0x6a8a30]]) g.e(x, y, 2.8, 3.4, c);
};
ART.prickly_pear = g => {
  g.e(12, 13, 6.5, 8, 0xb8304a);
  for (let i = 0; i < 10; i++) { const r = rng('pp' + i); g.s(7 + ((r() * 10) | 0), 7 + ((r() * 12) | 0), 0xf0d8a0); }
  g.r(10, 4, 14, 5, 0x6a8a3a);
};
ART.candleberries = g => {
  g.pl([3, 3, 8, 8, 12, 9, 18, 6], 0x6a5030); g.l(8, 8, 9, 13, 0x6a5030); g.l(12, 9, 14, 14, 0x6a5030);
  for (const [x, y] of [[6, 12], [10, 15], [7, 17], [13, 18], [16, 14], [12, 13], [17, 10], [4, 8]]) g.c(x, y, 2.3, 0xe0e4e8);
  g.dots([5, 11, 9, 14, 15, 13], 0xffffff);
};
ART.fossilized_lightning = g => {
  const pts = [[4, 2], [8, 7], [6, 10], [11, 13], [9, 16], [14, 21]];
  for (let i = 0; i < pts.length - 1; i++) g.bar(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 3.4, 0x6a7a8a);
  g.bar(11, 13, 18, 10, 2.4, 0x6a7a8a); g.bar(18, 10, 21, 4, 2, 0x6a7a8a); g.bar(8, 7, 15, 4, 2, 0x6a7a8a);
  for (let i = 0; i < pts.length - 1; i++) g.l(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], 0x9af0ff);
  g.l(11, 13, 18, 10, 0xe0faff); g.s(8, 7, 0xffffff);
};

// ---------------------------------------------------------------- ARK parts
function cell(g, glow, cap = K.steel, { core = null } = {}) {
  g.lathe(12, 1, [[6, cap], [8, cap], [10, cap], ...rep(16, [10, ARC.body]), [10, cap], [8, cap]]);
  g.r(9, 5, 14, 17, glow, 'glow');
  for (const y of [8, 11, 14]) g.r(9, y, 14, y, mix(glow, ARC.dark, 0.6), 'flat');
  if (core) g.r(11, 5, 12, 17, core, 'flat');
}
function board(g, base, trace, chip) {
  g.p([3, 3, 18, 3, 21, 6, 21, 20, 3, 20], base);
  g.pl([4, 6, 9, 6, 11, 8, 11, 10], trace); g.pl([20, 9, 15, 9, 14, 10], trace); g.pl([5, 17, 9, 17, 10, 15], trace); g.pl([19, 18, 15, 18, 14, 15], trace);
  g.pl([6, 11, 8, 11, 8, 13], trace);
  g.r(9, 10, 15, 15, chip); g.c(12, 12.5, 1.4, ARC.hot, 'glow');
  for (const [x, y] of [[4, 6], [20, 9], [5, 17], [19, 18]]) g.s(x, y, lt(trace, 0.5));
}
function coolant(g, liquid, bubbles) {
  g.lathe(12, 1, [[6, ARC.plate], [8, ARC.plate], [8, ARC.dark]]);
  g.lathe(12, 4, rep(15, [10, 0xb8d8e0]));
  g.lathe(12, 8, rep(11, [8, liquid]));
  g.lathe(12, 19, [[8, ARC.dark], [8, ARC.plate], [6, ARC.plate]]);
  g.r(8, 5, 8, 17, 0xe8f8ff, 'flat');
  if (bubbles) g.dots([11, 10, 13, 13, 10, 15, 14, 9], lt(liquid, 0.4));
  g.r(7, 4, 17, 4, ARC.hot, 'flat');
}
function ingots(g, c) {
  const bar = (x, y) => { g.p([x + 1, y, x + 9, y, x + 10, y + 4, x, y + 4], c); g.r(x + 2, y, x + 8, y, lt(c, 0.5), 'flat'); };
  bar(2, 15); bar(12, 15); bar(7, 10); bar(7, 5);
  g.glyph(['#.#', '.#.'], 11, 6, mix(c, 0x101018, 0.5));
}
function quilt(g, a, b) {
  g.rr(3, 3, 20, 20, a, 'bevel', 1);
  for (let y = 4; y <= 19; y++) for (let x = 4; x <= 19; x++) if ((x + y) % 5 === 0 || (x - y + 40) % 5 === 0) g.s(x, y, b);
  g.r(3, 3, 20, 4, lt(a, 0.3), 'flat');
}
function rubberCoil(g, c) {
  g.o(12, 12, 4, 9, c, 'sphere'); g.o(12, 12, 6.2, 6.8, dk(c, 0.4), 'flat');
  for (let a = 0; a < 12; a++) { const t = a * Math.PI / 6; g.s(12 + Math.cos(t) * 8.4, 12 + Math.sin(t) * 8.4, lt(c, 0.25)); }
}
function resinBlock(g, c) {
  g.p([4, 8, 10, 3, 19, 5, 21, 14, 14, 21, 4, 18], c, 'flat');
  g.p([4, 8, 10, 3, 19, 5, 12, 9], lt(c, 0.35), 'flat'); g.p([12, 9, 19, 5, 21, 14, 14, 21], dk(c, 0.25), 'flat');
  g.l(12, 9, 14, 21, lt(c, 0.15)); g.dots([8, 6, 9, 6, 15, 12], lt(c, 0.7));
}
function arkRotor(g, blade, big) {
  if (big) g.o(12, 12, 9, 10.5, ARC.plate, 'flat');
  rotor(g, 11.5, 11.5, big ? 8.5 : 9.5, big ? 3 : 4, blade, ARC.body, big ? 0.3 : 0.785, big ? 3.6 : 2.8);
  g.c(12, 12, 1, ARC.hot, 'flat');
}
function nozzle(g, flame, flameHot) {
  if (flame) { g.p([2, 9, 8, 6, 8, 18, 2, 15], flame, 'flat'); g.p([4, 10, 8, 9, 8, 15, 4, 14], flameHot, 'flat'); }
  g.p([8, 6, 14, 8, 14, 16, 8, 18], ARC.plate, 'cylV');
  g.r(14, 8, 20, 16, ARC.body, 'cylH'); g.r(20, 9, 22, 15, ARC.dark);
  for (let y = 9; y <= 15; y += 2) g.r(15, y, 19, y, ARC.dark, 'flat');
}
ART.ark_alloy = g => {
  g.p([3, 8, 13, 3, 21, 8, 19, 19, 6, 21, 2, 15], ARC.plate);
  g.p([6, 9, 13, 6, 18, 9, 16, 16, 8, 17], ARC.body, 'flat');
  g.pl([7, 13, 11, 9, 15, 12, 12, 15], ARC.hot);
  g.dots([5, 9, 19, 9, 7, 19, 18, 18], 0x8a8e98);
};
ART.ark_powercell = g => cell(g, ARC.hot);
ART.advanced_ark_powercell = g => cell(g, 0x40b8ff, BR, { core: 0xe8faff });
ART.damaged_ark_powercell = (g, it, id, r) => { cell(g, 0xc08030); g.damage(r, { amt: 1.2 }); };
ART.ark_circuitry = g => board(g, 0x2a2c34, ARC.hot, 0x16161c);
ART.burned_ark_circuitry = (g, it, id, r) => { board(g, 0x2a2c34, 0x8a5a2a, 0x16161c); g.damage(r, { amt: 1.3, char: true }); };
ART.glitched_ark_circuitry = (g, it, id, r) => { board(g, 0x2a1c3a, 0xff40e0, 0x16161c); g.glitch(r, 4); };
function motionCore(g) {
  g.c(12, 12, 8.5, ARC.plate);
  g.o(12, 12, 8, 9.5, ARC.dark, 'flat', 0.35);
  recolorRows(g, 11, 13, ARC.hot, 0.65);
  g.c(12, 12, 3.2, ARC.dark, 'flat'); g.c(12, 12, 2.2, ARC.hot, 'glow');
}
ART.ark_motion_core = g => motionCore(g);
ART.damaged_ark_motion_core = (g, it, id, r) => { motionCore(g); g.damage(r, { amt: 1.2 }); };
ART.ark_coolant = g => coolant(g, 0x30c8f0);
ART.impure_ark_coolant = g => coolant(g, 0x6a8a48, true);
ART.ark_flex_rubber = g => { rubberCoil(g, 0x3e3e4a); g.dots([12, 3, 12, 21], ARC.hot); };
ART.degraded_ark_rubber = (g, it, id, r) => { rubberCoil(g, 0x5a5a5e); g.damage(r, { amt: 1.2 }); };
ART.ark_performance_steel = g => ingots(g, 0x8a9ab8);
ART.rusty_ark_steel = (g, it, id, r) => { ingots(g, 0x8a7a6a); g.damage(r, { amt: 1.4, rust: true }); };
ART.ark_synthetic_resin = g => resinBlock(g, 0xe08a30);
ART.dried_out_ark_resin = (g, it, id, r) => { resinBlock(g, 0x9a7a4a); g.damage(r, { amt: 1 }); };
ART.ark_thermo_lining = g => quilt(g, 0xb8bcc4, ARC.hot);
ART.tattered_ark_lining = (g, it, id, r) => { quilt(g, 0x9a9a98, 0x9a6a3a); g.damage(r, { amt: 1.5 }); for (let x = 3; x <= 20; x += 3) { g.clear(x, 20); g.clear(x + 1, 19); g.clear(20, x); } };
ART.glitched_ark_light_ring = (g, it, id, r) => { g.o(12, 12, 5, 9.5, ARC.body, 'flat'); g.o(12, 12, 6.5, 8, 0xff60e0, 'flat'); g.o(12, 12, 7, 7.5, 0xffe0ff, 'flat'); g.glitch(r, 4); };
ART.glitched_ark_phased_array = (g, it, id, r) => {
  g.rr(2, 3, 21, 20, ARC.body, 'bevel', 1);
  for (let y = 5; y <= 17; y += 4) for (let x = 4; x <= 17; x += 4) g.r(x, y, x + 2, y + 2, (x + y) % 8 ? 0x40f0ff : 0xff40e0, 'glow');
  g.glitch(r, 3);
};
ART.glitched_ark_power_converter = (g, it, id, r) => {
  g.rr(3, 5, 20, 20, ARC.plate, 'bevel', 1);
  g.lathe(8, 7, rep(10, [5, CU])); g.lathe(15, 7, rep(10, [5, CU]));
  g.r(10, 9, 13, 16, 0xff40e0, 'glow'); g.r(5, 2, 7, 4, ARC.dark); g.r(16, 2, 18, 4, ARC.dark);
  g.glitch(r, 3);
};
ART.glitched_ark_transmitter = (g, it, id, r) => {
  g.rr(6, 16, 17, 21, ARC.body, 'bevel', 1); g.r(11, 6, 12, 16, ARC.plate, 'cylV');
  g.o(12, 6, 3, 6, 0x9a9ea8, 'flat', 0.6); for (let x = 0; x < 24; x++) for (let y = 7; y < 10; y++) { }
  g.c(12, 5, 1.5, 0xff40e0, 'glow'); arcsTx(g); g.glitch(r, 3);
};
function arcsTx(g) { for (const [x, y] of [[4, 3], [3, 6], [20, 3], [21, 6]]) g.s(x, y, 0x40f0ff); g.s(5, 1, 0x40f0ff); g.s(19, 1, 0x40f0ff); }
ART.wazp_driver = g => arkRotor(g, ARC.rust, false);
ART.damaged_wazp_driver = (g, it, id, r) => { arkRotor(g, ARC.rust, false); g.damage(r, { amt: 1.3 }); };
ART.hornett_driver = g => arkRotor(g, 0xe08a28, true);
ART.damaged_hornett_driver = (g, it, id, r) => { arkRotor(g, 0xe08a28, true); g.damage(r, { amt: 1.3 }); };
function thruster(g, flame) {
  g.r(8, 1, 15, 4, ARC.body); g.r(6, 3, 17, 5, ARC.plate); g.r(10, 5, 13, 7, ARC.dark);
  g.p([9, 7, 14, 7, 18, 16, 5, 16], 0x8a5a3a, 'cylV'); g.r(5, 16, 18, 17, ARC.dark);
  for (const y of [10, 13]) recolorRows(g, y, y, 0x5a3a22, 0.45);
  if (flame) { g.p([6, 18, 17, 18, 14, 23, 12, 21, 9, 23], ARC.hot, 'flat'); g.p([8, 18, 15, 18, 12, 21], 0xfff0a0, 'flat'); }
}
ART.rocketier_driver = g => thruster(g, true);
ART.damaged_rocketier_driver = (g, it, id, r) => { thruster(g, false); g.damage(r, { amt: 1.3, char: true }); };
function tikk(g) {
  for (const [x0, x1] of [[6, 2], [9, 6], [14, 17], [17, 21]]) g.pl([x0, 14, x1, 17, x1, 21], ARC.dark);
  g.e(12, 11, 7.5, 5.5, ARC.body); g.e(12, 9, 5, 2.6, ARC.plate);
  g.c(16.5, 12, 1.6, ARC.eye, 'glow');
}
ART.tikk_pod = g => tikk(g);
ART.damaged_tikk_pod = (g, it, id, r) => { tikk(g); g.damage(r, { amt: 1.3 }); };
ART.popp_trigger = g => {
  g.c(12, 13, 8, ARC.body);
  for (let y = 5; y <= 21; y++) for (let x = 4; x <= 20; x++) if (g.has(x, y) && (x + y) % 4 === 0) g.s(x, y, ARC.hot);
  g.r(10, 2, 13, 5, ARC.dark); g.r(9, 2, 14, 3, ARC.eye); g.c(12, 13, 2, ARC.eye, 'glow');
};
ART.fyreball_burner = g => nozzle(g, 0xff6a20, 0xffd060);
ART.damaged_fyreball_burner = (g, it, id, r) => { nozzle(g, null); g.damage(r, { amt: 1.3, char: true }); };
ART.fyrefly_burner = g => { nozzle(g, 0x3a90ff, 0xc0f0ff); };
function scanner(g) {
  g.c(12, 12, 8.5, ARC.body); g.c(12, 12, 6, ARC.dark, 'flat'); g.c(12, 12, 5, 0xffc830, 'glow'); g.c(12, 12, 2, 0x5a3a08, 'flat'); g.s(10, 9, 0xffffff);
  g.r(18, 2, 19, 6, ARC.plate); g.s(19, 1, ARC.eye);
}
ART.snytch_scanner = g => scanner(g);
ART.damaged_snytch_scanner = (g, it, id, r) => { scanner(g); g.damage(r, { amt: 1.3 }); };
ART.spottr_relay = g => {
  g.rr(6, 17, 17, 21, ARC.body, 'bevel', 1); g.r(11, 9, 12, 17, ARC.plate, 'cylV');
  g.p([4, 3, 12, 11, 20, 3, 16, 7, 8, 7], ARC.white, 'soft'); g.c(12, 6.5, 1.4, ARC.eye, 'glow');
  for (const [x, y] of [[3, 0], [21, 0]]) g.s(x, y + 1, 0x40c0ff);
};
ART.komet_igniter = g => {
  g.lathe(12, 2, [[2, ARC.white], [2, ARC.white], [4, ARC.white], ...rep(5, [6, ARC.white]), ...rep(3, [10, ARC.dark]), ...rep(4, [8, ARC.plate]), [4, K.steel], [4, K.steel], [2, ARC.hot]]);
  for (let y = 12; y <= 18; y += 2) g.lathe(12, y, [[8, ARC.body]]);
  spark(g, 12, 21, 0xffd060); g.s(9, 22, ARC.hot); g.s(15, 22, ARC.hot);
};
ART.sentinal_firing_core = g => {
  g.r(3, 8, 15, 16, ARC.body, 'cylH');
  for (let x = 4; x <= 14; x += 2) g.r(x, 7, x, 17, ARC.plate, 'flat');
  g.r(15, 9, 19, 15, ARC.dark); g.c(20, 12, 2.6, ARC.eye, 'glow'); g.s(19, 11, 0xffd0c0);
  g.l(20, 3, 20, 7, ARC.eye); g.l(20, 17, 20, 21, ARC.eye);
};
ART.surveyr_vault = g => {
  g.c(12, 12, 9, ARC.white);
  for (let y = 3; y <= 21; y++) for (let x = 3; x <= 21; x++) if (g.has(x, y) && (x + y) % 6 === 0) g.s(x, y, 0x9a968c);
  recolorRows(g, 11, 12, ARC.hot, 0.7);
  g.r(10, 6, 14, 8, ARC.blue, 'glow'); g.r(5, 16, 19, 16, 0xa8a49a, 'flat');
};
ART.shreddr_gyro = g => {
  g.o(12, 12, 8, 9.5, ARC.plate, 'flat');
  g.o(12, 12, 5, 6.4, ARC.hot, 'flat', 1.6); g.o(12, 12, 5, 6.4, K.steel, 'flat', 0.45);
  g.c(12, 12, 2.6, ARC.body); g.c(12, 12, 1, ARC.eye, 'flat');
  g.r(11, 1, 12, 3, ARC.dark); g.r(11, 21, 12, 23, ARC.dark);
};
function pulseUnit(g) {
  hexagon(g, 12, 12, 10, ARC.body);
  g.o(12, 12, 6, 7, ARC.hot, 'flat'); g.o(12, 12, 3.5, 4.4, ARC.hot, 'flat'); g.c(12, 12, 2, 0xfff0b0, 'flat');
  g.dots([6, 5, 18, 5, 6, 19, 18, 19], 0x8a8e98);
}
ART.leapr_pulse_unit = g => pulseUnit(g);
ART.damaged_leapr_pulse_unit = (g, it, id, r) => { pulseUnit(g); g.damage(r, { amt: 1.3 }); };
ART.bastian_cell = g => {
  g.rr(3, 2, 20, 21, ARC.dark, 'bevel', 2);
  hexagon(g, 11.5, 11.5, 7, ARC.plate); hexagon(g, 11.5, 11.5, 4.6, 0xff5020, 'glow'); g.c(11.5, 11.5, 1.6, 0xfff0b0, 'flat');
  for (const y of [4, 19]) g.r(6, y, 17, y, ARC.hot, 'flat');
};
ART.bombardeer_cell = g => {
  g.lathe(12, 1, [[8, K.steel], [12, ARC.dark], ...rep(18, [12, ARC.body]), [12, ARC.dark], [8, K.steel]]);
  g.r(9, 4, 14, 19, 0xb8e030, 'glow');
  for (let y = 5; y <= 18; y += 3) { g.s(8, y, K.yellow); g.s(15, y, K.yellow); }
};
ART.assessr_matrix = g => {
  g.rr(2, 2, 21, 21, ARC.body, 'bevel', 2); g.r(4, 4, 19, 19, ARC.dark, 'flat');
  for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) { g.c(7 + i * 5, 7 + j * 5, 2, (i + j) % 2 ? ARC.eye : ARC.hot, 'glow'); }
};
ART.vaporiser_regulator = g => {
  g.r(1, 13, 22, 17, ARC.plate, 'cylH');
  g.lathe(12, 8, rep(5, [6, ARC.body]));
  g.r(11, 4, 12, 8, K.steel);
  g.o(12, 4, 3, 4.6, 0xd03828, 'flat', 0.5); g.l(8, 4, 16, 4, 0xd03828);
  g.c(18, 9, 3, 0xe8e4d8); g.l(18, 9, 19, 7, K.red); g.dots([1, 18, 22, 18], ARC.hot);
  g.dots([3, 19, 6, 20, 4, 21], 0xb8e8ff);
};
ART.turbyne_compressor = g => {
  g.c(12, 12, 10, ARC.plate); g.c(12, 12, 8.4, ARC.dark, 'flat');
  for (let i = 0; i < 9; i++) { const a = i * Math.PI * 2 / 9; g.bar(12 + Math.cos(a) * 2, 12 + Math.sin(a) * 2, 12 + Math.cos(a + 0.6) * 7.5, 12 + Math.sin(a + 0.6) * 7.5, 2, 0xb8bcc4); }
  g.c(12, 12, 2.4, ARC.hot);
};
ART.matriark_reactor = g => {
  g.c(12, 12, 8.5, 0xd02860, 'glow'); g.c(12, 12, 4, 0xffa0c8, 'flat');
  for (const x of [5, 12, 19]) g.r(x, 2, x + 1 - (x === 12 ? 0 : 0), 21, ARC.plate, 'cylV');
  g.r(3, 2, 21, 3, ARC.body); g.r(3, 20, 21, 21, ARC.body);
  g.s(11, 9, 0xffffff);
};
ART.queene_reactor = g => {
  g.c(12, 14, 8, 0xffb020, 'glow'); g.c(12, 14, 3.5, 0xfff4c0, 'flat');
  g.p([3, 9, 6, 2, 9, 7, 12, 1, 15, 7, 18, 2, 21, 9, 18, 8, 12, 6, 6, 8], 0xd8a838);
  g.dots([6, 3, 12, 2, 18, 3], 0xff4060);
  g.r(4, 20, 20, 22, ARC.body); g.o(12, 14, 8, 9, ARC.plate, 'flat');
};
// any other ARK part: a hashed machine chunk
FAM.arc_part = (g, it, id, r) => {
  const h = hashStr(id); const glow = [ARC.hot, ARC.blue, ARC.eye, 0x60f0a0][h % 4];
  g.rr(4, 4, 19, 19, ARC.body, 'bevel', 2); g.r(7, 7, 16, 16, ARC.plate); g.c(12, 12, 3, glow, 'glow');
  if (id.startsWith('damaged')) g.damage(r, { amt: 1.2 });
};
