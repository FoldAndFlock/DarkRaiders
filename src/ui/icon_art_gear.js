// Icon art: ammo, shields, meds, grenades, light sticks, traps, mines, gadgets, keys, mods, augments.
import { K, mix, dk, lt, rng } from './icon_kit.js';

export const ART = {}, FAM = {};
export const RAR = { common: 0xa8a8a0, uncommon: 0x5cc860, rare: 0x3a98f0, epic: 0xc058f0, legendary: 0xf0b828 };

// ---------------------------------------------------------------- glyphs (1-bit)
export const GL = {
  cross: ['..##..', '..##..', '######', '######', '..##..', '..##..'],
  cross5: ['.#.', '###', '.#.'],
  plus: ['..#..', '..#..', '#####', '..#..', '..#..'],
  bolt: ['...##', '..##.', '.##..', '#####', '..##.', '.##..', '##...'],
  boltS: ['..#', '.#.', '###', '.#.', '#..'],
  heart: ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'],
  eye: ['..###..', '.#...#.', '#..#..#', '.#...#.', '..###..'],
  lock: ['.###.', '#...#', '#...#', '#####', '##.##', '##.##', '#####'],
  shield: ['#####', '#####', '#####', '.###.', '..#..'],
  cloud: ['..##...', '.####..', '#######', '.#####.'],
  chevrons: ['#..#..', '.#..#.', '..#..#', '.#..#.', '#..#..'],
  crosshair: ['..#..', '.###.', '##.##', '.###.', '..#..'],
  flame: ['..#..', '.##..', '.###.', '#####', '.###.'],
  bag: ['.###.', '#...#', '#####', '#####', '#####'],
  tower: ['..#..', '.###.', '..#..', '..#..', '.###.'],
  hazard: ['..#..', '.#.#.', '.#.#.', '#...#', '#####'],
  person: ['.#.', '###', '.#.', '#.#'],
  flask: ['.#.', '.#.', '#.#', '###'],
  house: ['..#..', '.###.', '#####', '.#.#.', '.###.'],
  columns: ['#####', '.....', '#.#.#', '#.#.#', '#####'],
  stairs: ['....#', '...##', '..###', '.####', '#####'],
  antenna: ['#...#', '.#.#.', '..#..', '..#..', '.###.'],
  tree: ['..#..', '.###.', '#####', '..#..'],
  star: ['..#..', '#####', '.###.', '.#.#.'],
};

// ---------------------------------------------------------------- shared helpers
const BR = 0xd8a838, CU = 0xd07040;
export function recolorRows(g, y0, y1, c, t = 0.78, x0 = 0, x1 = 23) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const v = g.get(x, y); if (v !== -1) g.s(x, y, mix(v, c, t)); }
}
export function puff(g, cx, cy, s, c) {   // cloud of overlapping spheres
  g.c(cx - s * 0.9, cy + s * 0.2, s * 0.8, c); g.c(cx + s * 0.8, cy + s * 0.25, s * 0.85, c); g.c(cx, cy - s * 0.35, s, c);
}
export function arcs(g, cx, cy, n, c, dir = 1) {   // sound waves to the right (dir 1) or left (-1)
  for (let i = 0; i < n; i++) {
    const r = 3 + i * 2.5;
    for (let a = -0.75; a <= 0.75; a += 0.05) g.s(cx + dir * Math.cos(a) * r, cy + Math.sin(a) * r, c);
  }
}
export function spark(g, x, y, c = 0xfff0a0) { g.s(x, y, 0xffffff); g.s(x - 1, y, c); g.s(x + 1, y, c); g.s(x, y - 1, c); g.s(x, y + 1, c); }
export function canister(g, cx, y0, w, h, body, { cap = K.steel, capH = 2, band = null, bandY = 0.5, bandH = 2 } = {}) {
  const rows = [];
  for (let i = 0; i < capH; i++) rows.push([w - 2, cap]);
  for (let i = 0; i < h; i++) rows.push([w, body]);
  rows.push([w - 2, dk(body, 0.3)]);
  g.lathe(cx, y0, rows);
  if (band != null) { const by = y0 + capH + Math.round(h * bandY) - 1; g.lathe(cx, by, Array(bandH).fill([w, band])); }
}
function nadeTop(g, cx, top, c = K.steel) {   // fuse head, spoon and pull ring above a grenade body
  g.r(cx - 2, top - 2, cx + 1, top, c);
  g.bar(cx + 2, top - 2, cx + 5, top + 4, 1.6, c, { cap: 'flat' });
  g.o(cx - 3.5, top - 2.5, 1.1, 2.2, lt(c, 0.2));
}

// ---------------------------------------------------------------- ammo
const rep = (n, v) => Array(n).fill(v);
ART.ammo_light = g => {
  const R = [[2, CU], [4, CU], [4, CU], ...rep(6, [4, BR]), [4, dk(BR, 0.35)], [4, BR]];
  g.lathe(6, 7, R); g.lathe(12, 5, R); g.lathe(18, 7, R);
};
ART.ammo_medium = g => {
  const R = [[2, CU], [2, CU], [2, CU], [2, CU], [2, BR], [4, BR], ...rep(8, [4, BR]), [4, dk(BR, 0.35)], [4, BR]];
  g.lathe(6, 5, R); g.lathe(12, 3, R); g.lathe(18, 5, R);
};
ART.ammo_heavy = g => {
  const R = [[2, K.black], [2, K.black], [4, K.black], [4, 0xc83a2a], [4, CU], [4, CU], [4, BR], ...rep(10, [6, BR]), [6, dk(BR, 0.35)], [6, BR]];
  g.lathe(8, 3, R); g.lathe(16, 2, R);
};
ART.ammo_shotgun = g => {
  const R = [[5, 0x8a2418], ...rep(9, [5, 0xc8382a]), ...rep(3, [5, BR]), [5, dk(BR, 0.35)]];
  for (const [cx, y] of [[6.5, 7], [12.5, 5], [18.5, 7]]) { g.lathe(cx, y, R); const x0 = Math.round(cx - 2.5); g.s(x0 + 1, y, 0x5a1810); g.s(x0 + 3, y, 0x5a1810); g.s(x0 + 2, y + 1, 0x5a1810); }
};
ART.ammo_energy = g => {
  g.rr(6, 6, 17, 20, K.gun, 'bevel', 1);
  g.r(8, 8, 15, 18, K.cyanD, 'flat');
  for (let i = 0; i < 3; i++) g.r(9, 9 + i * 3, 14, 10 + i * 3, K.cyan, 'glow');
  g.r(8, 3, 10, 5, K.steel); g.r(13, 3, 15, 5, K.steel);
  g.r(6, 20, 17, 20, K.dark, 'flat');
};
ART.ammo_launcher = g => {
  const OL = 0x5e7040;
  const R = [[2, 0xd83a2a], [4, OL], [6, OL], [6, OL], [8, OL], [8, OL], [8, K.yellow], [8, OL], [8, OL], ...rep(6, [8, BR]), [8, dk(BR, 0.35)], [8, BR]];
  g.lathe(12, 3, R);
};

// ---------------------------------------------------------------- shields
function shield(g, x0, y0, x1, y1, frame, inner, bars, rim = 2) {
  const ym = Math.round(y0 + (y1 - y0) * 0.5), cx = (x0 + x1 + 1) / 2;
  g.p([x0, y0, x1 + 1, y0, x1 + 1, ym, cx, y1 + 1, x0, ym], frame);
  const i0 = x0 + rim, i1 = x1 - rim, j0 = y0 + rim, j1 = y1 - rim - 1;
  g.p([i0, j0, i1 + 1, j0, i1 + 1, ym, cx, j1 + 1, i0, ym], inner, 'flat');
  for (let y = j0; y <= j1; y++) for (let x = i0; x <= i1; x++) {
    if (g.get(x, y) !== inner) continue;
    const d = (x - i0) + (y - j0);
    if (d === 3 || d === 4) g.s(x, y, lt(inner, 0.45));
    else if ((x * 2 + y * 3) % 7 === 0) g.s(x, y, lt(inner, 0.2));
    else if (x - i0 > (i1 - i0) * 0.6 && y > ym - 2) g.s(x, y, dk(inner, 0.2));
  }
  for (let k = 0; k < bars; k++) g.r(Math.floor(cx) - 2, ym - 3 + k * 3 - bars + 1, Math.floor(cx) + 1, ym - 2 + k * 3 - bars + 1, lt(inner, 0.7), 'flat');
}
ART.light_shield = g => shield(g, 6, 4, 17, 19, 0x8a8e98, 0x2aa8c8, 1);
ART.medium_shield = g => shield(g, 4, 3, 19, 20, 0x6a6e7a, 0x3a78d0, 2);
ART.heavy_shield = g => { shield(g, 3, 2, 20, 21, 0x4a4c58, 0x7050d0, 3, 3); g.dots([4, 3, 19, 3, 4, 11, 19, 11, 11, 20, 12, 20], K.brass); };

// ---------------------------------------------------------------- meds
const CREAM = 0xe8e0c8;
function roll(g, body, mark, markC) {
  g.r(3, 7, 14, 16, body, 'cylH');
  g.e(15, 11.5, 3, 4.5, lt(body, 0.15), 'flat');
  g.o(15, 11.5, 1.4, 2.4, dk(body, 0.22), 'flat', 1.5);
  g.e(15, 11.5, 0.9, 1.4, 0x7a6a50, 'flat');
  g.p([4, 16, 14, 16, 21, 19, 21, 21, 12, 21], body, 'soft');
  g.glyph(mark, 6, 9, markC);
}
ART.bandage = g => roll(g, CREAM, GL.cross, K.red);
ART.herbal_bandage = g => { roll(g, 0xd0d8a8, GL.cross5, 0x3a8a3a); g.p([7, 9, 11, 8, 12, 12, 8, 13], 0x58a848); g.l(7, 13, 11, 9, 0x2e6a2a); };
ART.sterilized_bandage = g => {
  g.rr(4, 5, 19, 18, 0xeef0f0, 'bevel', 1);
  for (let x = 4; x <= 19; x += 2) { g.clear(x, 5); g.clear(x + 1, 18); }
  g.r(5, 7, 18, 7, 0xb8c8d8, 'flat');
  g.glyph(GL.cross, 9, 9, 0x3a78d0);
  g.r(6, 16, 12, 16, 0xb8c8d8, 'flat');
};
ART.vyta_spray = g => {
  g.lathe(12, 2, [[2, K.steel], [4, K.white], [6, K.white], [6, K.white]]);
  g.s(9, 3, K.steel); g.s(8, 3, K.steel);
  canister(g, 12, 6, 10, 13, 0x2a9a8a, { cap: K.steel, capH: 1, band: K.white, bandY: 0.35, bandH: 5 });
  g.glyph(GL.cross5, 11, 10, 0x38b848);
};
ART.adrenaline_shot = g => {
  g.bar(5, 18, 14, 9, 4.5, K.yellow); g.bar(14, 9, 18, 5, 4.5, K.orange);
  g.bar(9, 14, 11, 12, 4.6, K.dark, { cap: 'flat' });
  g.l(4, 19, 2, 21, K.chrome);
};
ART.agave_juice = g => {
  const GLS = 0x7ab858;
  g.lathe(12, 2, [[2, 0x9a6a3a], [2, 0x9a6a3a], [2, GLS], [2, GLS], [4, GLS], [6, GLS], ...rep(13, [8, GLS]), [8, dk(GLS, 0.3)]]);
  g.lathe(12, 11, rep(6, [8, K.cream]));
  g.glyph(['#.#.#', '.###.', '..#..'], 10, 12, 0x3a8a3a);
};
function syringe(g, fluid, fill = 1) {
  g.bar(6, 17, 15, 8, 4, 0xc8e8f0);
  if (fluid != null) g.bar(6, 17, 6 + 9 * fill, 17 - 9 * fill, 2.4, fluid, { mode: 'flat' });
  g.bar(15, 8, 17, 6, 1.6, K.steel); g.bar(17, 4, 20, 7, 1.8, K.dark, { cap: 'flat' });
  g.bar(14, 7, 16, 9, 5, K.gunL, { cap: 'flat' });
  g.l(5, 18, 2, 21, K.chrome);
}
ART.vyta_shot = g => syringe(g, 0x58e070, 0.8);
ART.syringe = g => syringe(g, null);
ART.fruit_mix = g => {
  g.lathe(12, 4, [[10, 0xc83a2a], [10, 0xc83a2a], [12, 0x9a2a20]]);
  g.lathe(12, 7, [...rep(12, [12, 0xb8e0e8]), [10, 0x8ab0b8]]);
  const r = rng('fruit_mix'), cols = [0xf0a030, 0xe84a30, 0x88c040, 0xf0d040, 0xe878a8];
  for (let i = 0; i < 26; i++) { const x = 7 + ((r() * 10) | 0), y = 9 + ((r() * 10) | 0); g.s(x, y, cols[i % cols.length]); }
  g.r(7, 8, 7, 17, 0xe8f8ff, 'flat');
};
ART.defibrillator = g => {
  for (const [x, y] of [[2, 4], [12, 8]]) {
    g.rr(x + 1, y, x + 7, y + 7, 0xd8d0c0, 'bevel', 1);
    g.r(x + 3, y + 1, x + 5, y + 2, K.red, 'flat');
    g.r(x, y + 8, x + 8, y + 9, K.steel);
  }
  g.pl([6, 14, 6, 18, 10, 21, 14, 21, 16, 18], K.dark);
  g.glyph(GL.bolt, 16, 1, K.yellow);
};
ART.integrated_defibrillator = g => {
  g.r(2, 9, 21, 14, K.dark, 'cylH');
  g.rr(6, 5, 17, 18, K.gun, 'bevel', 1);
  g.r(8, 7, 15, 16, 0x301a1e, 'flat');
  g.glyph(GL.heart, 8, 9, K.red); g.glyph(GL.boltS, 10, 9, K.yellow);
};
function recharger(g, glow, glyph, glyphC) {
  canister(g, 12, 3, 10, 15, K.blueD, { cap: K.steel, capH: 2 });
  g.r(9, 7, 14, 16, glow, 'glow');
  g.glyph(glyph, 10, 9, glyphC);
  g.lathe(12, 18, [[10, K.steel], [10, K.gun]]);
}
ART.shield_recharger = g => recharger(g, 0x48c8f0, ['####', '####', '####', '.##.'], 0xffffff);
ART.surge_shield_recharger = g => { recharger(g, 0x70e8ff, ['..#', '.#.', '###', '.#.', '#..'], K.yellow); g.glyph(GL.boltS, 18, 2, K.yellow); g.glyph(GL.boltS, 3, 4, K.yellow); };
ART.integrated_shield_recharger = g => {
  g.r(2, 10, 21, 14, K.dark, 'cylH');
  g.rr(7, 6, 16, 17, K.steel, 'bevel', 1);
  g.r(9, 8, 14, 15, 0x48c8f0, 'glow');
  g.glyph(['####', '####', '.##.'], 10, 10, 0xffffff);
};

// ---------------------------------------------------------------- grenades
ART.light_impact_grenade = g => { g.c(12, 14, 5.5, 0x5e7040); recolorRows(g, 13, 14, K.orange, 0.7); nadeTop(g, 12, 8); };
ART.heavy_fuze_grenade = g => { g.e(11.5, 14, 7, 7.5, 0x3e4a2e); recolorRows(g, 11, 12, K.red, 0.6); g.r(9, 3, 14, 6, K.steel); g.bar(15, 4, 19, 13, 2, K.steel, { cap: 'flat' }); g.o(7, 4, 1.2, 2.4, K.chrome); };
ART.shrapnel_grenade = g => {
  g.e(12, 14, 6, 7, 0x5a6a3c);
  for (let y = 7; y <= 21; y++) for (let x = 5; x <= 18; x++) { const v = g.get(x, y); if (v !== -1 && (x % 3 === 0 || y % 3 === 0)) g.s(x, y, dk(v, 0.3)); }
  nadeTop(g, 12, 7);
};
ART.snap_blast_grenade = g => {
  canister(g, 12, 7, 10, 12, K.gun, { cap: K.steel, capH: 1 });
  for (const y of [9, 13, 17]) g.lathe(12, y, [[10, K.yellow]]);
  nadeTop(g, 12, 6);
};
ART.seeker_grenade = g => {
  g.bar(4, 14, 7, 11, 2, K.gun); g.bar(19, 14, 16, 11, 2, K.gun);
  g.c(12, 13, 6, K.steel);
  g.c(12, 13, 2.5, K.red, 'glow'); g.s(11, 12, 0xffd0c0);
  g.l(12, 7, 12, 3, K.dark); g.s(12, 2, K.red);
};
ART.tagging_grenade = g => { g.c(12, 15, 6, K.dark); g.e(12, 10, 3.5, 2.5, K.purple, 'glow'); recolorRows(g, 15, 15, K.purple, 0.6); g.s(12, 6, K.dark); };
ART.wulfpack = g => {
  canister(g, 12, 10, 12, 10, 0x4a4c58, { cap: K.dark, capH: 0 });
  for (const x of [8, 12, 16]) { g.lathe(x, 4, [[2, K.red], [2, K.red], [2, K.chrome], [2, K.chrome], [2, K.chrome], [2, K.chrome]]); }
  g.lathe(12, 14, [[12, K.yellow]]); g.glyph(['#.#.#', '.###.'], 10, 17, K.yellow);
};
ART.firecracker = g => {
  g.bar(6, 18, 15, 9, 4.5, K.red, { cap: 'flat' });
  g.bar(7, 17, 9, 15, 4.5, K.yellow, { cap: 'flat' });
  g.pl([16, 8, 18, 7, 18, 5], 0x8a7a60); spark(g, 19, 3); g.s(21, 2, K.yellow); g.s(17, 2, K.orange);
};
ART.trigga_nade = g => {
  g.rr(4, 10, 19, 19, 0x5a5e66, 'bevel', 2);
  g.r(6, 12, 17, 13, 0xd8c890, 'flat');
  g.c(15.5, 16.5, 1.6, K.red, 'glow');
  g.l(7, 10, 7, 3, K.dark); g.s(7, 2, K.red);
  g.dots([4, 20, 9, 20, 14, 20, 19, 20, 3, 18], 0xa8d040);
};
function fireCan(g, cx, y0, w, h) {
  canister(g, cx, y0, w, h, 0xb02a20, { cap: K.steel, capH: 1 });
  g.glyph(GL.flame, cx - 2, y0 + Math.round(h / 2) - 1, K.orange);
}
ART.blaze_grenade = g => { fireCan(g, 12, 7, 10, 12); nadeTop(g, 12, 6); };
ART.trailblazr = g => {
  g.p([2, 20, 6, 12, 9, 17, 12, 13, 12, 22, 2, 22], K.orange, 'flat'); g.p([4, 21, 7, 16, 10, 20, 9, 22], K.yellow, 'flat');
  g.bar(10, 16, 18, 8, 5, 0xb02a20); g.bar(17, 9, 19, 7, 5, K.steel, { cap: 'flat' }); g.bar(11, 15, 13, 13, 5.2, K.yellow, { cap: 'flat' });
};
ART.gas_grenade = g => {
  canister(g, 10, 8, 10, 12, 0x5a8a3a, { cap: K.steel, capH: 1, band: K.yellow, bandY: 0.5, bandH: 2 });
  nadeTop(g, 10, 7);
  puff(g, 18, 6, 3, 0xb8d048);
};
function smokeCan(g, cx, y0, w, h, s) {
  canister(g, cx, y0, w, h, 0x6a6e78, { cap: K.steel, capH: 1, band: K.white, bandY: 0.3, bandH: 2 });
  nadeTop(g, cx, y0 - 1);
  puff(g, cx + 7, y0 - 2, s, 0xd8d8d0);
}
ART.smoke_grenade = g => smokeCan(g, 9, 9, 10, 11, 3.4);
ART.lil_smoke_grenade = g => smokeCan(g, 10, 12, 8, 8, 2.6);
ART.lure_grenade = g => {
  canister(g, 9, 6, 10, 13, K.orange, { cap: K.dark, capH: 2 });
  for (let y = 10; y <= 16; y += 2) g.lathe(9, y, [[6, dk(K.orange, 0.5)]]);
  arcs(g, 14, 12, 3, K.yellow);
};
ART.showstoppa = g => {
  for (let a = 0; a < 8; a++) { const t = a * Math.PI / 4; g.l(12 + Math.cos(t) * 7, 13 + Math.sin(t) * 7, 12 + Math.cos(t) * 10, 13 + Math.sin(t) * 10, K.yellow); }
  canister(g, 12, 7, 8, 11, 0xd8d8d0, { cap: K.steel, capH: 1 });
  for (let y = 10; y <= 16; y += 3) { g.s(10, y, K.dark); g.s(12, y, K.dark); g.s(14, y, K.dark); }
};
// light sticks
const LSC = { blue_light_stick: 0x48a0ff, green_light_stick: 0x58f070, red_light_stick: 0xff4a40, yellow_light_stick: 0xffe040 };
FAM.lightstick = (g, it, id) => {
  const c = LSC[id] || 0x58f070;
  g.bar(5, 19, 15, 9, 4.6, c);
  g.bar(6, 18, 14, 10, 1.6, lt(c, 0.7), { mode: 'flat' });
  g.bar(15, 9, 18, 6, 4.6, K.dark, { cap: 'flat' });
  g.o(19.5, 4.5, 0.9, 2, K.steel);
};

// ---------------------------------------------------------------- traps & mines
function stakeTrap(g, body, band, cloudC) {
  g.p([10, 17, 14, 17, 12, 23], K.dark);
  g.r(8, 15, 15, 16, K.gun);
  canister(g, 11.5, 5, 7, 9, body, { cap: K.steel, capH: 1, band, bandY: 0.4, bandH: 2 });
  g.pl([15, 15, 19, 14, 22, 15], 0xc8c8c0); g.r(21, 15, 22, 18, K.steel);
  if (cloudC) puff(g, 18, 6, 2.6, cloudC);
}
ART.blaze_grenade_trap = g => { stakeTrap(g, 0xb02a20, K.orange); g.glyph(GL.flame, 3, 4, K.orange); };
ART.gas_grenade_trap = g => stakeTrap(g, 0x5a8a3a, K.yellow, 0xb8d048);
ART.lure_grenade_trap = g => { stakeTrap(g, K.orange, K.dark); arcs(g, 16, 8, 2, K.yellow); };
ART.smoke_grenade_trap = g => stakeTrap(g, 0x6a6e78, K.white, 0xd8d8d0);
ART.surge_coil = g => {
  g.rr(5, 18, 18, 21, K.dark, 'bevel', 1);
  const rows = []; for (let i = 0; i < 10; i++) rows.push(i % 2 ? [6, K.dark] : [8, CU]);
  g.lathe(12, 8, rows);
  g.c(12, 5.5, 3.2, K.steel);
  g.pl([15, 4, 18, 6, 17, 8, 21, 10], K.cyan); g.pl([9, 4, 6, 7, 7, 9, 3, 12], K.cyan); g.s(21, 10, 0xffffff); g.s(3, 12, 0xffffff);
};
function mine(g, body, top, detail) {
  g.e(12, 15, 9.5, 4.5, body); g.e(12, 12.5, 7, 3, lt(body, 0.15));
  g.r(4, 15, 20, 16, dk(body, 0.25), 'flat');
  for (const x of [5, 9, 14, 18]) g.s(x, 18, dk(body, 0.5));
  if (top) top(g);
  if (detail) detail(g);
}
ART.explosive_mine = g => mine(g, 0x5a6a3c, g => { g.c(12, 11.5, 2, K.red, 'glow'); g.s(11, 10, 0xffd0c0); });
ART.gas_mine = g => mine(g, 0x6a8a3a, g => { g.dots([8, 12, 10, 11, 14, 11, 16, 12, 12, 13], K.dark); recolorRows(g, 15, 15, K.yellow, 0.7); }, g => puff(g, 18, 6, 2.5, 0xb8d048));
ART.jolt_mine = g => mine(g, 0x4a5a78, g => { g.glyph(GL.boltS, 11, 9, K.cyan); g.s(5, 9, K.cyan); g.s(19, 8, K.cyan); g.s(20, 7, 0xffffff); });
ART.pulse_mine = g => mine(g, 0x5a3a7a, g => { g.o(12, 12.5, 2.5, 3.5, K.purple, 'flat', 0.5); g.c(12, 12.5, 1.2, 0xf0c8ff, 'flat'); g.o(12, 8, 5, 6, mix(K.purple, 0x000000, 0.1), 'flat', 0.35); });
ART.dedline = g => {
  g.rr(3, 7, 20, 19, 0x2a2a30, 'bevel', 1);
  g.r(5, 9, 18, 13, 0x1a0808, 'flat');
  g.glyph(['###.#.###', '#.#...#..', '#.#.#.###', '#.#...#.#', '###.#.###'], 6, 9, K.arcRed);
  g.r(5, 15, 9, 17, K.red, 'bevel'); g.r(11, 15, 18, 17, 0xd8c890);
  g.pl([18, 7, 20, 4, 22, 4], K.red);
};

// ---------------------------------------------------------------- gadgets
ART.barricade_kit = g => {
  g.p([2, 9, 13, 5, 13, 19, 2, 21], K.gunL);
  g.p([11, 6, 22, 8, 22, 20, 11, 19], K.steel);
  for (let x = 12; x <= 21; x++) for (let y = 9; y <= 12; y++) if (g.has(x, y)) g.s(x, y, ((x + y) >> 1) % 2 ? K.yellow : K.black);
  for (let x = 3; x <= 12; x++) for (let y = 12; y <= 14; y++) if (g.has(x, y)) g.s(x, y, ((x + y) >> 1) % 2 ? K.yellow : K.black);
};
ART.door_blocker = g => {
  g.p([2, 20, 20, 20, 20, 12], 0xd8a020);
  g.r(2, 20, 20, 21, dk(0xd8a020, 0.3), 'flat');
  g.bar(9, 16, 18, 4, 3, K.steel); g.r(16, 2, 20, 4, K.red);
  for (let x = 4; x <= 18; x += 3) g.s(x, 19, K.black);
};
ART.remote_raider_flare = g => {
  g.bar(6, 19, 14, 9, 5, K.red); g.bar(13, 10, 16, 6, 5, K.dark, { cap: 'flat' });
  g.c(17, 5, 2.6, 0xff6040, 'glow'); spark(g, 17, 5, 0xffd0a0);
  g.l(7, 13, 3, 4, K.dark); g.s(3, 3, K.red);
  g.bar(8, 17, 10, 15, 5.2, K.white, { cap: 'flat' });
};
ART.fireworks_box = g => {
  const cols = [K.red, K.blue, K.yellow, K.green];
  for (let i = 0; i < 4; i++) { const x = 6 + i * 4; g.lathe(x, 3 + (i % 2) * 2, [[2, cols[i]], [2, cols[i]], ...rep(6, [2, lt(cols[i], 0.2)])]); g.s(x, 2 + (i % 2) * 2, K.paper); }
  g.r(3, 11, 20, 20, 0xc83a2a); g.r(3, 11, 20, 12, 0xe8c048, 'flat');
  g.glyph(GL.star, 9, 14, K.yellow);
};
ART.white_flag = g => {
  g.r(5, 2, 6, 21, K.woodL, 'cylV'); g.c(5.5, 2, 1.3, K.brass);
  g.p([7, 3, 14, 5, 21, 3, 20, 10, 14, 12, 7, 11], 0xf0f0e8, 'soft');
  g.l(13, 5, 14, 11, 0xc8c8c0);
};
ART.zipline = g => {
  g.c(9, 12, 7, K.gun); g.c(9, 12, 4.5, K.yellow); g.c(9, 12, 1.6, K.dark, 'flat');
  g.o(9, 12, 2.4, 3.4, dk(K.yellow, 0.3), 'flat');
  g.l(14, 7, 22, 2, 0xc8c8c0); g.l(14, 8, 22, 3, 0x8a8a84);
  g.r(5, 19, 13, 21, K.dark);
};
ART.noisemaker = g => {
  g.rr(2, 7, 13, 19, 0x6a5a40, 'bevel', 1);
  g.c(7.5, 13, 3.6, K.dark, 'flat'); g.c(7.5, 13, 2, K.gunL); g.c(7.5, 13, 0.8, K.dark, 'flat');
  g.r(3, 5, 4, 6, K.dark); arcs(g, 13, 13, 3, K.yellow);
};
ART.powered_descender = g => {
  g.l(4, 1, 4, 22, 0xc8a870); g.l(5, 1, 5, 22, 0x9a7a50);
  g.rr(6, 6, 17, 17, K.gun, 'bevel', 2);
  g.c(11.5, 11.5, 3.2, K.orange); g.c(11.5, 11.5, 1.2, K.dark, 'flat');
  g.r(17, 9, 20, 13, K.dark); g.r(18, 10, 19, 12, K.cyan, 'flat');
  g.o(11.5, 19.5, 1, 2.2, K.steel);
};
ART.flame_spray = g => {
  canister(g, 7, 7, 8, 13, 0xc83a2a, { cap: K.steel, capH: 2, band: K.yellow, bandY: 0.4, bandH: 3 });
  g.r(6, 3, 8, 5, K.dark); g.r(9, 3, 11, 4, K.dark);
  g.p([12, 2, 18, 0, 23, 4, 20, 8, 14, 6], K.orange, 'flat'); g.p([12, 3, 17, 2, 19, 5, 14, 5], K.yellow, 'flat');
};
function binos(g, body, lens) {
  for (const x of [3, 13]) { g.r(x, 9, x + 7, 19, body, 'cylV'); g.r(x - 1, 17, x + 8, 20, dk(body, 0.2)); g.r(x + 1, 6, x + 6, 8, K.dark); }
  g.r(10, 10, 13, 13, K.dark);
  g.r(1, 19, 9, 20, lens, 'flat'); g.r(12, 19, 20, 20, lens, 'flat');
}
ART.binoculars = g => binos(g, 0x4a5a3a, 0x7ad0f0);
ART.integrated_binoculars = g => {
  g.r(4, 8, 19, 15, K.gun, 'cylH'); g.r(17, 6, 21, 17, K.dark);
  g.r(18, 8, 20, 15, 0x7ad0f0, 'flat'); g.r(2, 9, 4, 14, K.dark);
  g.r(8, 15, 14, 19, K.steel); g.r(9, 10, 13, 11, K.cyan, 'flat');
};
ART.photoelectric_cloak = g => {
  g.p([6, 3, 17, 3, 21, 20, 2, 20], 0x5a6a8a, 'soft');
  for (let y = 4; y <= 19; y++) for (let x = 2; x <= 21; x++) { if (!g.has(x, y)) continue; const t = (x + y * 0.6) % 6; if (t < 1) g.s(x, y, 0x9ae8ff); else if (t < 2) g.s(x, y, 0xd0a0ff); else if (t < 3) g.s(x, y, 0x8ac0e0); }
  g.r(9, 2, 14, 4, K.dark); g.r(11, 3, 12, 4, K.cyan, 'flat');
};
ART.snap_hook = g => {
  g.l(2, 21, 10, 13, 0xc8c8c0);
  g.r(10, 8, 14, 13, K.gun); g.c(12, 10.5, 1.4, K.yellow, 'flat');
  g.bar(13, 9, 20, 3, 2, K.steel); g.bar(14, 10, 21, 11, 2, K.steel); g.bar(11, 8, 9, 2, 2, K.steel);
  g.s(21, 2, K.chrome); g.s(22, 12, K.chrome); g.s(8, 1, K.chrome);
};
ART.recorder = g => {
  g.bar(4, 20, 18, 6, 3.2, 0xe8d8b0);
  g.bar(17, 7, 20, 4, 3.4, 0xd0b890, { cap: 'flat' }); g.bar(4, 20, 6, 18, 4, 0xd0b890);
  for (let i = 0; i < 4; i++) g.s(8 + i * 2, 15 - i * 2, K.woodD);
};
ART.shaker = g => {
  g.bar(4, 20, 10, 14, 2.6, K.woodL);
  g.e(14, 10, 6, 7, 0xe86a30); recolorRows(g, 8, 9, K.yellow, 0.75, 8, 21); recolorRows(g, 12, 13, 0x40a0c8, 0.75, 8, 21);
};
ART.acoustic_guitar = g => {
  g.bar(13, 10, 20, 3, 2.6, K.woodD);
  g.r(19, 1, 22, 4, K.woodD); g.dots([19, 1, 22, 2, 19, 3], K.chrome);
  g.c(7, 16, 6, 0xd08a40); g.c(12, 11.5, 4.4, 0xd08a40);
  g.c(9.5, 13.5, 1.8, 0x2a1a10, 'flat');
  g.bar(5, 18, 7, 16, 2, K.woodD, { cap: 'flat' });
  g.l(6, 17, 19, 4, 0xe8e0c8);
};

// ---------------------------------------------------------------- keys
const MAPKEY = {
  damn_grounds: { tag: 0x4a90d0, metal: 0xb8bcc4 }, green_gate: { tag: 0x5cc860, metal: 0xd8a838 },
  sandy_city: { tag: 0xe08a38, metal: 0xc87a48 }, any: { tag: 0xf0c838, metal: 0x8a8e98 },
};
const ROOMGLYPH = {
  control_tower: GL.tower, controlled_access_zone: GL.hazard, staff_room: GL.person, surveillance: GL.eye.map(r => r.slice(1, 6)),
  testing_annex: GL.flask, hospital: GL.plus, town_hall: GL.columns, cellar: GL.stairs, communication_tower: GL.antenna,
  confiscation_room: ['.###.', '#...#', '#####', '##.##', '#####'], village: GL.house, residential: GL.house,
};
function keyShape(g, metal, tag, glyph, id) {
  const r = rng(id);
  g.o(7, 8, 2, 4.8, metal, 'flat'); g.o(7, 8, 3.6, 4.8, dk(metal, 0.2), 'flat'); g.dots([4, 5, 5, 4, 4, 6], lt(metal, 0.4));
  g.r(11, 7, 21, 9, metal, 'soft');
  for (let x = 13; x <= 20; x++) { const d = (r() * 3) | 0; if (d) g.r(x, 10, x, 9 + d, dk(metal, 0.15), 'flat'); }
  g.s(21, 9, -1); g.r(12, 8, 20, 8, dk(metal, 0.35), 'flat');
  g.o(4.5, 14, 0.8, 1.7, K.steel);
  g.rr(2, 15, 11, 22, tag, 'bevel', 1); g.s(4, 16, lt(tag, 0.5));
  if (glyph) g.glyph(glyph, 4, 17, mix(tag, 0x101018, 0.75));
}
FAM.key = (g, it, id) => {
  const k = it.key || {}; const M = MAPKEY[k.map] || MAPKEY.any;
  if (id === 'sandy_city_space_travel_employee_card') {
    g.rr(2, 5, 21, 18, 0xe8e4d8, 'bevel', 1);
    g.r(3, 6, 20, 8, M.tag, 'flat'); g.r(4, 10, 8, 16, 0x8a9ab0); g.c(6, 12, 1.4, K.skin, 'flat');
    g.r(10, 10, 18, 10, K.gunL, 'flat'); g.r(10, 12, 16, 12, K.gunL, 'flat'); g.r(14, 14, 18, 16, K.brass);
    g.glyph(['..#..', '.###.', '#.#.#'], 15, 6, 0xffffff);
    return;
  }
  if (id === 'patrol_car_key') {
    g.rr(3, 4, 12, 17, K.black, 'bevel', 2);
    g.c(7.5, 8, 1.6, K.red, 'flat'); g.c(7.5, 12.5, 1.6, K.steel, 'flat');
    g.r(12, 9, 21, 11, K.steel, 'soft'); for (let x = 14; x <= 20; x += 2) g.s(x, 12, K.steel);
    g.o(6, 19.5, 1, 2.2, M.tag);
    g.rr(13, 15, 20, 21, 0x3a5aa0, 'bevel', 1); g.glyph(['###', '#.#'], 15, 17, 0xffffff);
    return;
  }
  if (id === 'raider_hatch_key') {
    g.rr(2, 3, 11, 13, K.yellow, 'bevel', 1);
    for (let y = 4; y <= 12; y++) for (let x = 3; x <= 10; x++) if (((x + y) >> 1) % 2) g.s(x, y, K.black);
    g.c(6.5, 8, 2, K.steel, 'flat'); g.c(6.5, 8, 0.8, K.dark, 'flat');
    g.r(11, 6, 22, 9, K.steel, 'cylH'); g.r(17, 10, 18, 13, K.steel); g.r(20, 10, 22, 12, K.steel); g.r(14, 10, 15, 11, K.steel);
    g.glyph(GL.bolt, 3, 15, K.yellow);
    return;
  }
  if (id === 'sandy_city_residential_master_key') {
    keyShape(g, M.metal, M.tag, ROOMGLYPH.residential, id);
    g.bar(12, 12, 20, 18, 2, K.steel); g.c(20.5, 18.5, 1.6, K.steel);
    return;
  }
  keyShape(g, M.metal, M.tag, ROOMGLYPH[k.room], id);
};

// ---------------------------------------------------------------- weapon mods
const tierN = id => { const m = /_(i{1,3})$/.exec(id); return m ? m[1].length : 2; };
const MODMETAL = [0x40424c, 0x4a4c58, 0x5e626e, 0x3e4a5a];
FAM.mod_grip = (g, it, id) => {
  const t = tierN(id), body = [0, 0x34343c, 0x8a7a54, 0x4a5464][t] || 0x34343c, acc = RAR[it.rarity] || K.steel;
  const rail = (x0, x1, y) => { g.r(x0, y, x1, y + 2, K.gun); for (let x = x0 + 1; x < x1; x += 2) g.s(x, y, K.dark); };
  if (id.startsWith('angled')) {
    rail(3, 20, 5);
    g.p([5, 8, 19, 8, 19, 19, 15, 19], body);
    g.r(15, 18, 18, 18, acc, 'flat'); g.l(8, 9, 15, 17, lt(body, 0.3));
    for (const y of [11, 14]) g.r(17, y, 18, y, dk(body, 0.4), 'flat');
  } else if (id.startsWith('vertical')) {
    rail(5, 18, 4);
    g.rr(8, 7, 15, 21, body, 'cylV', 1);
    for (let y = 10; y <= 18; y += 3) g.r(8, y, 9, y, dk(body, 0.4), 'flat');
    g.r(9, 20, 14, 21, acc, 'flat');
  } else {
    rail(2, 21, 6);
    g.rr(4, 9, 20, 14, body, 'cylH', 1);
    g.r(18, 9, 20, 16, body); g.r(5, 12, 16, 12, acc, 'flat');
  }
};
FAM.mod_muzzle = (g, it, id) => {
  const t = tierN(id), m = MODMETAL[t], acc = RAR[it.rarity] || K.steel;
  if (id.startsWith('compensator')) {
    g.r(3, 10, 5, 13, K.steel, 'cylH');
    g.r(5, 8, 18, 15, m, 'cylH');
    for (let x = 9; x <= 16; x += 3) g.r(x, 8, x + 1, 9, K.black, 'flat');
    g.r(6, 8, 6, 15, acc, 'flat'); g.r(18, 10, 19, 13, K.black, 'flat');
  } else if (id.startsWith('extended_barrel')) {
    g.r(1, 9, 4, 14, m, 'cylH');
    g.r(4, 10, 21, 13, mix(m, K.steel, 0.4), 'cylH');
    g.r(17, 8, 18, 9, K.dark); g.r(5, 9, 5, 14, acc, 'flat');
    g.r(21, 10, 22, 13, K.black, 'flat');
  } else if (id.startsWith('muzzle_brake')) {
    g.r(3, 10, 5, 13, K.steel, 'cylH');
    g.rr(5, 6, 19, 17, m, 'bevel', 1);
    for (const x of [8, 12, 16]) g.r(x, 9, x + 1, 14, K.black, 'flat');
    g.r(5, 6, 6, 17, acc, 'flat');
  } else if (id.startsWith('shotgun_choke')) {
    g.r(3, 9, 6, 14, K.steel, 'cylH');
    g.p([6, 7, 13, 7, 20, 9, 20, 15, 13, 17, 6, 17], m, 'cylH');
    g.r(7, 7, 8, 17, acc, 'flat');
    g.r(20, 10, 21, 14, K.black, 'flat');
  } else if (id === 'shotgun_silencer') {
    g.rr(2, 5, 21, 18, m, 'cylH', 2);
    for (let x = 6; x <= 18; x += 3) g.r(x, 5, x, 18, dk(m, 0.35), 'flat');
    g.r(3, 5, 4, 18, acc, 'flat'); g.e(21, 11.5, 1, 3, K.black, 'flat');
  } else {   // silencer
    const L = 15 + t * 2;
    g.r(1, 10, 3, 13, K.steel, 'cylH');
    g.rr(3, 7, 3 + L, 16, m, 'cylH', 1);
    g.r(6, 7, 7, 16, acc, 'flat');
  }
};
FAM.mod_mag = (g, it, id) => {
  const t = tierN(id), acc = RAR[it.rarity] || K.steel, h = 10 + t * 3;
  if (id.includes('light')) {
    g.r(9, 2, 14, 2 + h, 0x3a3c44); g.r(10, 1, 13, 2, BR); g.s(11, 0, CU); g.s(12, 0, CU);
    for (let y = 5; y < h; y += 3) g.s(12, y, K.black);
    g.r(8, 2 + h, 15, 3 + h, acc);
  } else if (id.includes('medium')) {
    const L = h + 1, pts = [], pts2 = [];
    for (let i = 0; i <= L; i++) { const y = 2 + i, off = (i / L) * (i / L) * (4 + t); pts.push(6 + off, y); pts2.unshift(12 + off, y); }
    g.p([...pts, ...pts2], 0x3a3c44);
    g.r(7, 1, 11, 2, BR); g.s(9, 0, CU);
    const ex = 6 + 4 + t; g.r(Math.floor(ex) - 1, 3 + L, Math.floor(ex) + 7, 4 + L, acc);
    for (let i = 3; i < L; i += 3) { const off = (i / L) * (i / L) * (4 + t); g.s(10 + off, 2 + i, K.black); }
  } else {
    g.rr(5, 3, 18, 3 + h, 0x34343c, 'bevel', 1);
    g.r(6, 1, 17, 3, 0xc8382a, 'cylH'); g.r(6, 3, 17, 3, BR, 'flat');
    g.r(8, 6, 15, 1 + h, 0x241818, 'flat');
    for (let y = 7; y < h; y += 2) g.r(9, y, 14, y, 0xa8302a, 'flat');
    g.r(5, 3 + h, 18, 4 + h, acc);
  }
};
FAM.mod_stock = (g, it, id) => {
  const acc = RAR[it.rarity] || K.steel;
  if (id === 'lightweight_stock') {
    g.r(16, 8, 22, 10, K.gun);
    g.pl([16, 9, 4, 7, 3, 7, 3, 17, 4, 17, 16, 11], K.steel); g.pl([4, 8, 4, 16], K.gunL);
    g.r(2, 7, 3, 17, acc);
  } else if (id === 'padded_stock') {
    g.p([6, 6, 22, 7, 22, 11, 10, 15, 6, 17], 0x4a4c58);
    g.rr(1, 4, 6, 19, 0x7a3a30, 'cylV', 1); for (let y = 6; y <= 17; y += 3) g.r(2, y, 5, y, 0x5a2a22, 'flat');
    g.r(14, 8, 18, 8, acc, 'flat');
  } else if (id === 'kinetic_converter') {
    g.p([6, 6, 22, 7, 22, 11, 10, 15, 6, 17], K.dark);
    g.r(2, 5, 5, 18, K.gun);
    for (let x = 8; x <= 18; x += 2) g.r(x, 9, x, 12, x % 4 ? K.arcHot : K.orange, 'flat');
    g.r(7, 10, 19, 10, 0xfff0a0, 'flat'); g.r(2, 5, 5, 6, acc, 'flat');
  } else {
    const t = tierN(id), body = [0, 0x34343c, 0x8a7a54, 0x4a5464][t];
    g.p([5, 6, 22, 7, 22, 11, 10, 15, 5, 18], body);
    for (let y = 10; y <= 12; y++) for (let x = 10; x <= 16; x++) if (x - 10 < (13 - y) * 2.2) g.clear(x, y);
    g.rr(2, 5, 5, 19, K.rubber, 'cylV', 1);
    g.r(19, 8, 21, 8, acc, 'flat');
  }
};
FAM.mod_tech = g => {
  g.r(1, 9, 6, 14, K.gun, 'cylH');
  g.rr(6, 7, 12, 16, 0x5a4a30, 'bevel', 1);
  g.r(7, 8, 11, 8, K.brass, 'flat');
  for (const [y, dy] of [[8, -3], [10, -1], [13, 1], [15, 3]]) { g.bar(12, y, 20, y + dy, 1.8, K.steel); g.s(21, y + dy, K.arcHot); }
  g.c(9, 11.5, 1.5, K.arcHot, 'glow');
};

// ---------------------------------------------------------------- augments
const AUG = { looting: 0x5cc860, combat: 0xe04838, tactical: 0x4a90e0, free: 0xa8a8a0 };
const AUGGLYPH = { cautious: GL.eye, safekeeper: GL.lock, survivor: GL.heart, aggressive: GL.flame, flanking: GL.chevrons, defensive: GL.shield, healing: GL.plus, revival: GL.bolt, smoke: GL.cloud };
FAM.augment = (g, it, id) => {
  const line = Object.keys(AUG).find(k => id.startsWith(k)) || 'free';
  const core = AUG[line], mk = +(/mk_(\d)/.exec(id)?.[1] || 0);
  const plate = [0x5a5e58, 0x56604a, 0x4a4e5a, 0x3e3e4a][mk];
  g.p([4, 2, 8, 2, 12, 6, 16, 2, 20, 2, 21, 21, 3, 21], plate, 'soft');
  g.r(4, 2, 7, 2, lt(plate, 0.3), 'flat'); g.r(16, 2, 19, 2, lt(plate, 0.3), 'flat');
  if (mk === 3) { g.l(8, 3, 11, 6, K.brass); g.l(15, 3, 12, 6, K.brass); }
  g.r(3, 17, 21, 19, K.dark, 'cylH');
  for (const x of [4, 17]) { g.rr(x, 15, x + 3, 20, dk(plate, 0.15), 'bevel', 1); g.r(x, 15, x + 3, 15, dk(plate, 0.35), 'flat'); }
  g.r(11, 17, 13, 19, K.steel, 'bevel');
  g.rr(7, 7, 16, 15, 0x1a1a20, 'bevel', 1);
  g.r(8, 8, 15, 14, mix(core, 0x101014, 0.75), 'flat');
  const variant = /\((\w+)\)$/.exec(it.name || '')?.[1]?.toLowerCase();
  const gl = AUGGLYPH[variant] || { looting: GL.bag, combat: GL.crosshair, tactical: GL.shield, free: ['.###.', '#####', '#####', '.###.'] }[line];
  g.glyph(gl, 12 - Math.ceil(gl[0].length / 2), 11 - Math.floor(gl.length / 2), lt(core, 0.2));
  for (let x = 8; x <= 15; x += 2) g.s(x, 14, core);
};
