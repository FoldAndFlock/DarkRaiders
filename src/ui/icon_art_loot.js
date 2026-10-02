// Icon art: salvage valuables, trinkets and quest items (one drawing per item) + hashed fallback.
import { K, mix, dk, lt, hue, hashStr, rng, PB } from './icon_kit.js';
import { GL, puff, spark, canister, recolorRows, arcs } from './icon_art_gear.js';
import { gear, hexagon, rotor, ARC } from './icon_art_mats.js';

export const ART = {}, FAM = {};
const rep = (n, v) => Array(n).fill(v);
const BR = 0xd8a838, CU = 0xd07040, RUST = 0x9a5028, WOOD = 0x8a5630, WOODL = 0xb88048, PAPER = 0xe0d4b4;

// ---------------------------------------------------------------- helpers
function screen(g, x0, y0, x1, y1, c, crack = false) {
  g.r(x0, y0, x1, y1, c, 'flat');
  g.r(x0, y0, x1, y0, lt(c, 0.25), 'flat');
  g.l(x0 + 1, y0 + 1, x0 + 2, y0 + 1, lt(c, 0.6));
  if (crack) g.pl([x0 + 2, y1, x0 + 4, y0 + 2, x0 + 3, y0 + 1, x1 - 1, y0], 0xe8f0f0);
}
function knob(g, x, y, c = K.steel) { g.c(x + 0.5, y + 0.5, 1.6, c); g.s(x, y, dk(c, 0.5)); }
function device(g, x0, y0, x1, y1, c) { g.rr(x0, y0, x1, y1, c, 'bevel', 1); }
function cassette(g, body, label, txt) {
  g.rr(2, 5, 21, 18, body, 'bevel', 1);
  g.r(4, 7, 19, 13, label, 'flat');
  g.r(6, 9, 17, 12, 0x2a2a30, 'flat'); g.c(8.5, 10.5, 1.6, 0xe8e0c8, 'flat'); g.c(15.5, 10.5, 1.6, 0xe8e0c8, 'flat');
  g.r(10, 10, 13, 11, 0x5a3a2a, 'flat');
  g.p([6, 18, 7, 15, 16, 15, 17, 18], dk(body, 0.25));
  if (txt) g.glyph(txt, 5, 7, 0x2a2a30);
}
function reel(g, c, dusty) {
  g.c(11, 11, 9, c); g.c(11, 11, 2, 0x2a2a30, 'flat');
  for (let a = 0; a < 5; a++) { const t = a * Math.PI * 2 / 5 + 0.3; g.c(11 + Math.cos(t) * 5, 11 + Math.sin(t) * 5, 2, 0x16141a, 'flat'); }
  g.p([16, 18, 23, 15, 23, 21, 18, 22], 0x3a2a20, 'soft'); for (let x = 18; x <= 22; x += 2) { g.s(x, 18, 0xd8c890); }
  if (dusty) for (let i = 0; i < 25; i++) { const r = rng('dust' + i); g.s(3 + ((r() * 17) | 0), 3 + ((r() * 17) | 0), 0xb8b0a0); }
}
function bookShape(g, x0, y0, x1, y1, cover, pages = PAPER) {
  g.r(x0, y0, x1, y1, cover); g.r(x0 + 1, y1 - 1, x1, y1, pages, 'flat'); g.r(x0, y0, x0 + 1, y1, dk(cover, 0.3), 'flat');
}
function duck(g, body, beak, { eye = K.black, wing = null } = {}) {
  g.p([2, 12, 5, 14, 5, 17], body);
  g.e(11, 15.5, 7.5, 5, body);
  g.c(15, 8, 4.4, body);
  g.p([18, 7, 23, 8, 22, 10, 18, 10], beak);
  g.e(9.5, 14.5, 4, 2.4, wing ?? dk(body, 0.14), 'soft');
  if (eye != null) g.s(16, 7, eye);
}
function ship(g, hull, sail, accent, { sails = 3, tri = false, flag = null } = {}) {
  g.r(4, 21, 19, 22, WOOD); g.r(11, 19, 12, 21, BR);
  g.p([1, 14, 22, 14, 19, 19, 4, 19], hull); g.r(2, 14, 21, 14, accent, 'flat');
  for (let x = 6; x <= 17; x += 3) g.s(x, 16, dk(hull, 0.5));
  if (tri) { g.l(12, 2, 12, 13, K.woodD); g.p([12, 2, 21, 12, 12, 12], sail, 'soft'); g.p([11, 4, 4, 12, 11, 12], lt(sail, 0.15), 'soft'); }
  else {
    const xs = sails === 3 ? [6, 12, 17] : [8, 15];
    for (const x of xs) { g.l(x, 2, x, 13, K.woodD); g.r(x - 3, 4, x + 2, 7, sail, 'soft'); g.r(x - 2, 9, x + 2, 12, sail, 'soft'); }
  }
  if (flag) g.r(12, 1, 14, 2, flag, 'flat');
}
function vaseShape(g, rows, body, deco) {
  g.lathe(12, 22 - rows.length, rows.map(w => [w, body]));
  if (deco) deco(g);
}
function bottle(g, glass, label, { cork = 0x9a6a3a, h = 13 } = {}) {
  g.lathe(12, 1, [[2, cork], [2, cork], [2, glass], [2, glass], [2, glass], [4, glass], [6, glass], ...rep(h, [8, glass]), [8, dk(glass, 0.3)]]);
  if (label) g.lathe(12, 12, rep(5, [8, label]));
}
function tube(g, x, y, h, liquid) {
  g.lathe(x, y, [[4, 0xd0e8f0], ...rep(h, [3, 0xc8e8f0])]); g.lathe(x - 0.5, y + Math.floor(h / 2), rep(Math.ceil(h / 2), [3, liquid]));
}

// ======================================================================== salvage (valuables)
ART.alarm_clock = g => {
  g.c(6, 5, 2.8, BR); g.c(18, 5, 2.8, BR); g.r(11, 3, 12, 5, K.dark);
  g.c(12, 13, 8, 0xd83a2a); g.c(12, 13, 5.8, 0xf0ece0, 'flat');
  g.dots([12, 8, 17, 13, 12, 18, 7, 13], K.dark); g.l(12, 13, 12, 9, K.dark); g.l(12, 13, 15, 14, K.dark); g.s(12, 13, K.red);
  g.r(5, 20, 6, 22, K.dark); g.r(18, 20, 19, 22, K.dark);
};
ART.bicycle_pump = g => {
  g.r(4, 2, 19, 4, K.black, 'cylH'); g.r(11, 5, 12, 6, K.chrome);
  g.r(9, 6, 14, 19, 0x3a70c0, 'cylV'); g.r(9, 8, 14, 8, 0x2a508a, 'flat');
  g.r(6, 20, 17, 21, K.dark); g.pl([14, 18, 18, 17, 20, 13, 20, 8], K.black); g.r(19, 6, 21, 8, K.steel);
};
ART.broken_flashlight = g => {
  g.bar(3, 19, 13, 9, 4.6, K.gun); for (let i = 0; i < 4; i++) g.s(5 + i * 2, 15 - i * 2, K.dark);
  g.bar(13, 9, 17, 5, 7, K.gunL, { cap: 'flat' });
  g.bar(18, 4, 18, 4, 7, 0xd8e8f0, { cap: 'flat' }); g.pl([16, 2, 18, 4, 17, 6, 20, 7], 0x5a6a70);
  g.r(9, 12, 10, 13, K.orange, 'flat');
};
ART.broken_guidance_system = g => {
  g.rr(3, 9, 20, 20, 0x5a6a3c, 'bevel', 1);
  g.p([5, 9, 9, 3, 15, 3, 18, 9], 0xd8d4c8, 'soft'); g.r(11, 4, 12, 9, K.dark);
  screen(g, 6, 12, 12, 17, 0x205a3a, true);
  knob(g, 15, 13, K.steel); knob(g, 17, 17, K.red);
  g.pl([20, 15, 22, 13, 22, 10], K.red); g.pl([20, 17, 23, 19], K.blue);
};
ART.broken_handheld_radio = g => {
  g.r(14, 1, 15, 7, K.dark);
  g.rr(6, 6, 17, 22, 0x2e3036, 'bevel', 1);
  for (let y = 8; y <= 12; y += 2) g.r(8, y, 15, y, 0x16141a, 'flat');
  screen(g, 8, 14, 15, 17, 0x6a9a50, true); knob(g, 9, 20, K.orange); g.r(12, 20, 15, 20, K.gunL, 'flat');
};
ART.broken_taser = g => {
  g.p([2, 7, 18, 7, 20, 9, 20, 12, 2, 12], K.yellow);
  g.r(18, 8, 21, 11, K.dark); g.s(22, 8, K.chrome); g.s(22, 11, K.chrome);
  g.p([4, 12, 9, 12, 8, 20, 3, 20], K.black); g.pl([9, 13, 11, 15, 12, 13], K.dark);
  g.pl([10, 7, 12, 10, 11, 12], 0x16141a); g.r(5, 9, 9, 9, K.black, 'flat');
};
ART.camera_lens = g => {
  g.c(12, 12, 9.5, K.black); g.o(12, 12, 7.6, 8.6, K.gunL, 'flat'); g.o(12, 12, 8.6, 9.2, 0xd03828, 'flat');
  g.c(12, 12, 6.4, 0x1e1e40); g.c(12, 12, 4.4, 0x3a2a70, 'flat'); g.c(12, 12, 2, 0x16141a, 'flat');
  g.dots([9, 8, 10, 8, 8, 9, 14, 15], 0xb0d0ff); g.s(15, 14, 0xffb0e0);
};
ART.candle_holder = g => {
  g.lathe(12, 1, [[2, 0xffe060], [2, 0xffa020], [2, 0xff8a20]]);
  g.s(12, 4, K.black);
  g.lathe(12, 5, [...rep(7, [4, 0xf0ece0]), [10, BR], [6, BR], [2, BR], [2, BR], [4, BR], [2, BR], [2, BR], [6, BR], [12, BR], [12, dk(BR, 0.3)]]);
};
ART.coolant = g => {
  g.p([6, 6, 16, 6, 18, 9, 18, 21, 5, 21, 5, 9], 0x3a8ad8, 'cylV');
  g.r(8, 3, 12, 6, K.white); g.p([15, 7, 20, 7, 20, 14, 18, 14, 18, 9, 15, 9], 0x2a6ab0);
  g.r(6, 11, 17, 17, 0xe8f0f8, 'flat'); g.glyph(['#.#.#', '.###.', '##.##', '.###.', '#.#.#'], 9, 12, 0x3a8ad8);
};
ART.cooling_coil = g => {
  for (let i = 0; i < 5; i++) { const y = 4 + i * 3.5; g.bar(4, y, 19, y, 2.4, i % 2 ? 0xb86a3a : 0xd88a50); }
  for (let i = 0; i < 4; i++) { const y = 4 + i * 3.5, x = i % 2 ? 4 : 19; g.bar(x, y, x, y + 3.5, 2.4, 0xc87a40); }
  g.r(1, 3, 3, 5, K.steel); g.r(20, 17, 22, 19, K.steel);
};
ART.cooling_fan = g => {
  g.rr(2, 2, 21, 21, 0x3a3c44, 'bevel', 2); g.c(12, 12, 8.5, 0x1e1e24, 'flat');
  rotor(g, 11.5, 11.5, 7.5, 5, 0x9a9ea8, 0x5a5e66, 0.3, 3);
  g.dots([4, 4, 19, 4, 4, 19, 19, 19], K.steel);
};
ART.cracked_bioscanner = g => {
  device(g, 4, 2, 19, 21, 0xd8d4c8);
  screen(g, 6, 4, 17, 12, 0x0e2a1a, true);
  g.pl([6, 9, 8, 9, 9, 6, 10, 11, 11, 8, 13, 8, 17, 8], 0x58f070);
  knob(g, 8, 16, 0x3a98f0); knob(g, 15, 16, 0x5cc860); g.r(9, 19, 14, 19, K.gunL, 'flat');
};
ART.crumpled_plastic_bottle = g => {
  g.p([3, 14, 7, 10, 12, 11, 15, 8, 19, 9, 20, 13, 16, 15, 11, 14, 7, 18], 0x9ad0e8, 'soft');
  g.r(19, 7, 22, 10, 0x3a98f0); g.pl([8, 12, 10, 15, 12, 12, 14, 14], 0x6aa0c0);
  g.dots([8, 11, 15, 9], 0xe8f8ff); g.r(9, 12, 13, 13, 0xe84a30, 'flat');
};
ART.damaged_heat_sink = (g, it, id, r) => {
  g.r(2, 16, 21, 19, 0xa8acb4);
  for (let x = 3; x <= 20; x += 2) g.r(x, 4 + (x * 7 % 3), x, 15, 0xc8ccd4, 'cylV');
  g.r(5, 20, 18, 21, CU, 'flat'); g.damage(r, { amt: 0.8 });
};
ART.deflated_football = g => {
  g.e(12, 15, 10, 5.5, 0xf0ece0);
  g.dots([5, 13, 6, 13, 5, 14, 11, 12, 12, 12, 12, 13, 11, 13, 17, 14, 18, 14, 18, 15, 8, 17, 9, 17, 15, 18, 16, 18], 0x2a2a30);
  g.l(4, 16, 9, 15, 0xc8c4b8); g.l(13, 16, 19, 17, 0xc8c4b8);
};
ART.diving_goggles = g => {
  g.r(1, 10, 22, 12, K.black, 'cylH');
  g.rr(3, 6, 20, 17, K.yellow, 'bevel', 2); g.p([10, 17, 12, 14, 14, 17], 0x2a2a30);
  g.rr(5, 8, 10, 14, 0x3a98e0, 'flat', 1); g.rr(13, 8, 18, 14, 0x3a98e0, 'flat', 1);
  g.dots([6, 9, 14, 9, 7, 9], 0xd0f0ff); g.r(10, 15, 13, 17, K.black);
};
ART.dog_collar = g => {
  g.o(11, 11, 6, 8.5, 0xd03828, 'sphere', 0.75);
  for (let a = 0; a < 10; a++) { const t = a * Math.PI / 5; g.s(11 + Math.cos(t) * 7.2, 11 + Math.sin(t) * 5.4, 0xe8e0c8); }
  g.r(3, 9, 5, 13, K.steel); g.o(11, 19, 0.6, 1.4, K.steel); g.c(11, 21.5, 2, BR); g.s(11, 21, 0x8a6a20);
};
ART.expired_respirator = g => {
  g.r(1, 8, 22, 9, K.black, 'flat');
  g.p([6, 6, 17, 6, 19, 12, 15, 19, 8, 19, 4, 12], 0x5a5e66);
  g.c(5, 15, 3.6, 0xc8a040); g.c(18, 15, 3.6, 0xc8a040); g.o(5, 15, 1, 2, 0x7a6020, 'flat'); g.o(18, 15, 1, 2, 0x7a6020, 'flat');
  g.r(10, 14, 13, 17, K.dark); for (let x = 10; x <= 13; x += 2) g.s(x, 15, K.gunL);
};
ART.flow_controller = g => {
  g.r(1, 13, 22, 17, K.steel, 'cylH'); g.r(1, 12, 2, 18, K.gunL); g.r(21, 12, 22, 18, K.gunL);
  g.rr(7, 9, 16, 20, 0x3a70c0, 'bevel', 1);
  g.c(11.5, 6, 4, 0xe8e4d8); g.o(11.5, 6, 3.6, 4.4, K.dark, 'flat'); g.l(11, 6, 13, 4, K.red);
  g.r(10, 9, 13, 10, K.dark);
};
ART.frequency_modulation_box = g => {
  device(g, 2, 6, 21, 20, 0x5a4a3a);
  screen(g, 4, 8, 13, 12, 0x101820); g.pl([5, 11, 7, 9, 9, 11, 11, 9, 12, 10], 0xffb030);
  knob(g, 16, 9, K.steel); knob(g, 19, 9, K.steel); knob(g, 16, 15, K.red); knob(g, 19, 15, K.steel);
  for (let x = 4; x <= 13; x += 3) g.r(x, 15, x + 1, 17, K.dark, 'flat');
  g.r(17, 2, 18, 6, K.dark);
};
ART.fried_motherboard = (g, it, id, r) => {
  g.rr(2, 3, 21, 20, 0x2a6a3a, 'bevel', 1);
  g.r(5, 6, 10, 11, K.black); g.r(13, 5, 19, 8, 0xb8bcc4); g.r(13, 11, 15, 18, K.black); g.r(17, 11, 19, 18, K.black);
  for (let y = 13; y <= 18; y += 2) g.r(4, y, 11, y, BR, 'flat');
  g.damage(r, { amt: 1.3, char: true }); g.c(8, 9, 2.4, 0x1a1210, 'flat');
};
ART.frying_pan = g => {
  g.bar(14, 14, 22, 21, 2.6, K.black);
  g.e(10, 10, 9, 7, 0x2e2e34); g.e(10, 10, 7, 5.2, 0x44444e, 'flat'); g.e(9, 9, 4, 2.6, 0x55555f, 'flat');
};
ART.garlic_press = g => {
  g.bar(10, 10, 22, 4, 2.4, K.steel); g.bar(10, 13, 22, 18, 2.4, K.steel);
  g.rr(2, 7, 11, 16, 0xb8bcc4, 'bevel', 1); g.c(9.5, 11.5, 1.5, K.dark, 'flat');
  for (let y = 9; y <= 14; y += 2) for (let x = 4; x <= 8; x += 2) g.s(x, y, K.gun);
};
ART.geiger_counter = g => {
  device(g, 2, 7, 15, 20, K.yellow); g.r(4, 4, 13, 7, K.dark);
  g.r(4, 9, 13, 14, 0xf0ece0, 'flat'); g.l(5, 13, 10, 10, K.black); g.s(8, 10, K.red); g.s(11, 10, K.red);
  knob(g, 6, 17, K.black); knob(g, 11, 17, K.black);
  g.pl([15, 15, 18, 16, 19, 13], K.black); g.bar(18, 12, 21, 3, 2.6, K.steel);
};
ART.headphones = g => {
  g.o(12, 12, 7.4, 9.2, K.gun, 'flat'); for (let y = 12; y < 24; y++) for (let x = 0; x < 24; x++) g.clear(x, y);
  g.rr(1, 11, 6, 20, K.black, 'cylV', 1); g.rr(17, 11, 22, 20, K.black, 'cylV', 1);
  g.r(5, 12, 6, 19, 0xd03828, 'flat'); g.r(17, 12, 18, 19, 0xd03828, 'flat');
};
ART.household_cleaner = g => {
  g.p([8, 2, 17, 2, 19, 5, 13, 5, 13, 7, 10, 7], 0xf0ece0); g.p([15, 5, 17, 5, 16, 10, 14, 10], 0xd8d4c8);
  g.lathe(11.5, 7, [[4, 0xd8d4c8], [6, 0x3ab0d8], [8, 0x3ab0d8], ...rep(12, [9, 0x3ab0d8]), [9, dk(0x3ab0d8, 0.3)]]);
  g.r(8, 12, 15, 17, 0xf0ece0, 'flat'); g.glyph(['.#.', '###', '.#.'], 10, 13, 0x3ab0d8);
};
ART.humidifier = g => {
  g.e(12, 15, 7.5, 7, 0xe8f0f0); g.e(12, 16, 7.5, 2.4, 0x6ad0d8, 'flat'); g.r(4, 21, 19, 22, 0x9aa0a8);
  g.r(10, 6, 13, 9, 0xb8bcc4); puff(g, 13, 3, 2.2, 0xd8e8f0); knob(g, 15, 17, K.cyan);
};
ART.ice_cream_scooper = g => {
  g.bar(3, 21, 12, 12, 3.4, 0xd03828);
  g.c(16, 7, 5.6, K.chrome); g.c(16.5, 6.5, 3.6, 0x8a8e98, 'flat');
  g.bar(11, 12, 13, 10, 2.4, K.steel);
};
ART.industrial_charger = g => {
  device(g, 2, 6, 17, 20, 0x3a3c44);
  g.r(4, 8, 15, 12, 0x101418, 'flat'); g.r(5, 10, 11, 10, 0x58f070, 'flat');
  for (let i = 0; i < 3; i++) g.c(5 + i * 4, 16.5, 1.2, [K.green, K.yellow, K.red][i], 'flat');
  g.pl([17, 15, 20, 16, 20, 20, 22, 21], K.black); g.r(19, 2, 22, 5, K.yellow); g.r(20, 5, 21, 7, K.black);
};
ART.industrial_magnet = g => {
  g.l(12, 0, 12, 4, K.steel); g.o(12, 5, 1, 2, K.steel);
  g.lathe(12, 7, [[10, K.gun], [16, 0xd03828], ...rep(9, [20, 0xd03828]), [20, K.gun], [20, K.dark]]);
  g.r(5, 11, 18, 13, 0xe8e4d8, 'flat'); g.glyph(['#.#.#', '#####'], 10, 11, 0xd03828);
};
ART.ion_sputter = g => {
  g.r(3, 18, 20, 21, K.gun);
  g.lathe(11.5, 3, [[8, K.steel], [12, K.steel], ...rep(12, [12, 0x34343c]), [14, K.gunL]]);
  g.r(8, 7, 15, 14, 0x9a40f0, 'glow'); g.r(10, 9, 13, 12, 0xf0c8ff, 'flat');
  g.r(18, 8, 21, 16, K.dark); g.s(19, 10, K.green); g.s(19, 13, K.red);
};
ART.laboratory_reagents = g => {
  g.r(2, 13, 21, 15, WOOD); g.r(2, 19, 21, 21, WOOD); g.r(2, 13, 3, 21, dk(WOOD, 0.2)); g.r(20, 13, 21, 21, dk(WOOD, 0.2));
  tube(g, 6, 4, 13, 0xe84a30); tube(g, 11.5, 2, 15, 0x58e070); tube(g, 17, 5, 12, 0x3a98f0);
  g.r(2, 13, 21, 13, lt(WOOD, 0.3), 'flat');
};
ART.magnetron = g => {
  g.rr(5, 7, 18, 18, K.steel, 'bevel', 1); for (let y = 8; y <= 17; y += 2) g.r(5, y, 18, y, 0x7a7e88, 'flat');
  g.r(2, 9, 5, 16, 0xd03828); g.r(18, 9, 21, 16, 0xd03828);
  g.lathe(11.5, 2, [[4, CU], [4, CU], [6, K.gun], [6, K.gun], [8, K.gun]]);
  g.r(9, 19, 14, 21, K.dark);
};
ART.metal_brackets = g => {
  g.p([2, 4, 6, 4, 6, 16, 14, 16, 14, 20, 2, 20], 0x9a9ea8); g.dots([4, 7, 4, 12, 9, 18], K.dark);
  g.p([10, 2, 22, 2, 22, 6, 14, 6, 14, 13, 10, 13], 0xb8bcc4); g.dots([12, 9, 17, 4, 20, 4], K.dark);
};
ART.microscope = g => {
  g.rr(4, 19, 19, 21, K.dark, 'bevel', 1);
  g.p([13, 4, 17, 4, 17, 19, 13, 19, 13, 14, 15, 14, 15, 9, 13, 9], 0xe8e4d8);
  g.bar(7, 11, 11, 3, 3.6, K.gun); g.r(9, 1, 12, 2, K.dark);
  g.r(5, 13, 13, 14, K.gunL); g.r(6, 11, 8, 12, K.steel); knob(g, 16, 11, K.dark);
};
ART.mini_centrifuge = g => {
  g.e(12, 15, 9.5, 6, 0xe8e4d8); g.r(3, 15, 20, 19, 0xe8e4d8, 'cylV');
  g.e(12, 12, 8, 4.5, 0x9ad0e8, 'flat'); g.e(12, 12, 6.5, 3.4, 0x6aa0c0, 'flat');
  rotor(g, 11.5, 11.5, 5, 4, K.steel, K.gun, 0.4, 1.6);
  g.r(15, 17, 18, 18, 0x101418, 'flat'); g.s(16, 17, 0x58f070);
};
ART.number_plate = g => {
  g.rr(1, 7, 22, 17, 0xf0ece0, 'bevel', 1); g.r(2, 8, 21, 8, 0x3a70c0, 'flat');
  g.glyph(['###.#.#.###', '#...#.#.#.#', '###.###.###', '..#...#.#..', '###...#.#..'], 4, 10, 0x2a2a30);
  g.glyph(['##.', '.#.', '.#.', '.#.', '###'], 16, 10, 0x2a2a30); g.dots([3, 9, 20, 9, 3, 15, 20, 15], K.steel);
  g.r(1, 16, 5, 17, RUST, 'flat');
};
ART.polluted_air_filter = g => {
  g.r(2, 3, 21, 20, 0x6a5e4a);
  for (let x = 4; x <= 19; x += 2) g.r(x, 5, x, 18, x % 4 ? 0x9a8a68 : 0x7a6a4e, 'flat');
  g.r(2, 3, 21, 4, 0x8a8e98, 'flat'); g.r(2, 19, 21, 20, 0x5a5e66, 'flat');
  for (let i = 0; i < 20; i++) { const r = rng('paf' + i); g.s(4 + ((r() * 16) | 0), 6 + ((r() * 12) | 0), 0x3a3022); }
};
ART.portable_tv = g => {
  g.l(9, 1, 12, 5, K.steel); g.l(17, 1, 13, 5, K.steel);
  device(g, 2, 5, 21, 20, 0x8a6a4a); screen(g, 4, 7, 15, 17, 0x3a5a6a);
  g.r(5, 9, 12, 9, 0x7a9aa8, 'flat'); g.r(5, 12, 10, 12, 0x5a7a88, 'flat');
  knob(g, 18, 9, K.dark); knob(g, 18, 14, K.dark); g.r(17, 17, 19, 18, K.dark, 'flat');
};
ART.power_bank = g => {
  g.rr(4, 3, 19, 21, 0x3a3c44, 'bevel', 2); g.r(6, 5, 17, 5, 0x5a5e66, 'flat');
  for (let i = 0; i < 4; i++) g.r(7 + i * 3, 17, 8 + i * 3, 18, i < 3 ? K.cyan : 0x204050, 'flat');
  g.glyph(GL.boltS, 10, 9, K.yellow); g.r(9, 1, 14, 3, K.dark);
};
ART.projector = g => {
  g.c(7, 5, 4, K.dark); g.c(16, 5, 4, K.dark); g.c(7, 5, 1, K.steel, 'flat'); g.c(16, 5, 1, K.steel, 'flat');
  device(g, 2, 9, 18, 19, 0x6a6e78);
  g.r(18, 11, 22, 16, K.black, 'cylH'); g.r(22, 12, 22, 15, 0xfff0b0, 'flat');
  for (let x = 5; x <= 13; x += 2) g.r(x, 12, x, 16, 0x4a4e58, 'flat'); g.r(3, 20, 5, 21, K.dark); g.r(15, 20, 17, 21, K.dark);
};
ART.radio = g => {
  device(g, 1, 6, 22, 20, WOOD);
  g.r(3, 8, 11, 18, 0xd8c8a0, 'flat'); for (let y = 9; y <= 17; y += 2) g.r(3, y, 11, y, 0xa89870, 'flat');
  g.r(13, 8, 20, 12, 0xf0e8c0, 'flat'); g.l(14, 11, 19, 9, 0x2a2a30); g.s(16, 10, K.red);
  knob(g, 14, 16, BR); knob(g, 19, 16, BR); g.r(15, 2, 16, 6, K.dark);
};
ART.radio_relay = g => {
  for (const [x, h] of [[5, 2], [11, 0], [17, 3]]) { g.r(x, h, x + 1, 9, K.steel, 'cylV'); g.s(x, h, K.red); }
  device(g, 2, 9, 21, 20, 0x4a5a6a);
  for (let i = 0; i < 5; i++) g.r(4 + i * 2, 17 - i, 4 + i * 2, 18, K.green, 'flat');
  g.r(14, 12, 19, 18, 0x2a3440, 'flat'); g.s(15, 13, K.green); g.s(17, 13, K.red);
};
ART.remote_control = g => {
  g.bar(6, 20, 16, 4, 6.4, 0x2a2a30);
  g.c(15, 6, 1.4, K.red, 'flat');
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) g.s(10 + i * 1.6 + j * 2 - 1, 15 - i * 2.4 - j * 0.6, 0x9a9ea8);
  g.s(8, 18, K.green);
};
ART.ripped_safety_vest = g => {
  g.p([4, 3, 9, 3, 12, 8, 15, 3, 20, 3, 21, 21, 15, 21, 13, 19, 10, 21, 3, 21], 0xf07a20, 'soft');
  g.r(4, 12, 20, 13, 0xe8f0f0, 'flat'); g.r(4, 16, 20, 17, 0xe8f0f0, 'flat');
  g.r(11, 9, 12, 21, 0xb85a18, 'flat');
  for (const [x, y] of [[4, 21], [6, 20], [16, 21], [18, 19], [20, 21]]) g.clear(x, y);
};
ART.rocket_thruster = g => {
  g.r(8, 1, 15, 5, K.gun); g.r(10, 5, 13, 7, K.dark);
  g.p([9, 7, 14, 7, 20, 20, 3, 20], 0xc87a48, 'cylV'); g.r(3, 20, 20, 21, 0x7a4a2a);
  for (let y = 10; y <= 18; y += 4) recolorRows(g, y, y, 0x6a3a1a, 0.4);
};
ART.rotary_encoder = g => {
  g.rr(2, 12, 21, 20, 0x2a6a3a, 'bevel', 1); for (let x = 4; x <= 19; x += 3) g.s(x, 19, BR);
  g.r(7, 9, 16, 13, K.steel); g.lathe(11.5, 2, rep(7, [6, K.black])); for (let y = 3; y <= 8; y += 2) g.lathe(11.5, y, [[6, K.gunL]]);
  g.s(11, 2, K.white);
};
ART.rubber_pad = g => {
  g.p([3, 7, 21, 4, 21, 16, 3, 19], 0x2a2a30, 'soft');
  for (let y = 6; y <= 17; y += 2) for (let x = 4 + (y % 4 ? 1 : 0); x <= 20; x += 3) if (g.has(x, y)) g.s(x, y, 0x3e3e48);
};
ART.ruined_accordion = (g, it, id, r) => {
  g.rr(1, 5, 6, 19, 0xc83a2a, 'bevel', 1); g.rr(17, 5, 22, 19, 0xc83a2a, 'bevel', 1);
  for (let x = 6; x <= 16; x++) g.r(x, 6 + (x % 2), x, 18 - (x % 2), x % 2 ? 0x2a2a30 : 0xd8d4c8, 'flat');
  for (let y = 7; y <= 17; y += 2) g.s(3, y, 0xf0ece0);
  g.damage(r, { amt: 0.8 });
};
ART.ruined_augment = (g, it, id, r) => {
  g.r(6, 1, 8, 6, K.dark); g.r(15, 1, 17, 6, K.dark);
  g.rr(4, 4, 19, 21, 0x4a4e48, 'bevel', 2); g.r(2, 14, 21, 16, K.dark, 'cylH');
  g.c(12, 10.5, 4, 0x6a6a64); g.damage(r, { amt: 1.6, rust: true });
};
ART.ruined_baton = (g, it, id, r) => { g.bar(4, 20, 19, 5, 3, 0x2a2a30); g.bar(4, 20, 7, 17, 3.6, 0x3e3e48); g.bar(9, 13, 11, 13, 1.6, 0x2a2a30); g.bar(9, 13, 6, 13, 2.4, 0x2a2a30); g.damage(r, { amt: 0.8 }); };
ART.ruined_handcuffs = (g, it, id, r) => {
  g.o(7, 13, 3, 5, K.steel, 'flat'); g.o(17, 9, 3, 5, K.steel, 'flat');
  g.r(10, 11, 14, 12, K.gunL); g.r(4, 15, 6, 18, K.chrome); g.r(17, 13, 20, 15, K.chrome);
  g.damage(r, { amt: 1, rust: true });
};
ART.ruined_parachute = (g, it, id, r) => {
  g.e(12, 9, 10.5, 7, 0xf07a20); for (let y = 9; y < 24; y++) for (let x = 0; x < 24; x++) g.clear(x, y);
  for (let x = 4; x <= 19; x += 5) recolorRows(g, 2, 8, 0xf0ece0, 0, x, x + 2);
  for (let x = 4; x <= 19; x += 5) g.r(x, 2, x + 2, 8, 0xf0ece0, 'soft');
  for (const x of [2, 7, 12, 17, 21]) g.l(x, 9, 12, 19, 0xc8c4b8);
  g.r(10, 19, 13, 21, 0x5a6a3c); g.damage(r, { amt: 0.7 }); g.clear(14, 3); g.clear(15, 4);
};
ART.ruined_riot_shield = (g, it, id, r) => {
  g.rr(4, 1, 19, 22, 0x9ab8c8, 'soft', 3);
  g.r(5, 6, 18, 8, 0x2a2a30, 'flat'); g.glyph(['###.###.#..#.###.###', '#.#.#.#.#..#.#...#..'], 5, 6, 0xe8e8e8);
  g.r(5, 6, 18, 8, 0x2a2a40, 'flat'); g.r(6, 7, 17, 7, 0xe8e8e8, 'flat');
  g.pl([8, 22, 10, 16, 9, 12, 12, 10], 0xf0f8ff); g.pl([10, 16, 14, 15, 16, 18], 0xf0f8ff);
  g.r(5, 2, 5, 20, 0xc8e0ec, 'flat');
};
ART.ruined_tactical_vest = (g, it, id, r) => {
  g.p([4, 2, 9, 2, 12, 7, 15, 2, 20, 2, 21, 21, 3, 21], 0x4a5a34, 'soft');
  for (const x of [5, 10, 15]) { g.rr(x, 13, x + 4, 19, 0x5e6e40, 'bevel', 1); g.r(x, 13, x + 4, 14, 0x3e4a2e, 'flat'); }
  g.r(11, 8, 12, 12, 0x2e3a22, 'flat'); g.damage(r, { amt: 0.9 });
};
ART.rusted_bolts = (g, it, id, r) => {
  for (const [x, y, a] of [[4, 6, 1], [10, 3, 0], [15, 8, 1]]) {
    g.r(x, y, x + 4, y + 2, 0x9a9ea8); g.r(x + 1, y + 3, x + 3, y + 14, 0x8a8e98, 'cylV');
    for (let k = y + 5; k <= y + 13; k += 2) g.r(x + 1, k, x + 3, k, 0x6a6e78, 'flat');
  }
  g.damage(r, { amt: 1.4, rust: true });
};
ART.rusted_gear = (g, it, id, r) => { gear(g, 12, 12, 10, 7.5, 10, 0x8a7a6a, 3); g.damage(r, { amt: 1.6, rust: true }); };
ART.rusted_shut_medical_kit = (g, it, id, r) => {
  g.rr(2, 6, 21, 20, 0xd8d4c8, 'bevel', 1); g.r(8, 3, 15, 6, K.gun); g.r(10, 4, 13, 5, K.dark, 'flat');
  g.r(2, 11, 21, 12, 0x8a8e98, 'flat'); g.glyph(GL.cross, 9, 13, K.red);
  g.damage(r, { amt: 1.4, rust: true });
};
ART.rusted_tools = (g, it, id, r) => {
  g.bar(3, 20, 16, 7, 2.6, 0x8a8e98); g.o(18, 5, 1.6, 4, 0x8a8e98, 'flat'); g.r(17, 1, 19, 4, 0x8a8e98); g.clear(18, 2); g.clear(18, 3);
  g.bar(5, 5, 13, 13, 1.6, K.steel); g.bar(13, 13, 20, 20, 3.6, 0xd03828);
  g.damage(r, { amt: 1.2, rust: true });
};
ART.sample_cleaner = g => {
  device(g, 2, 8, 21, 20, 0xe8e4d8); g.r(2, 8, 21, 10, 0x3a98c0, 'flat');
  for (const x of [5, 9, 13]) { g.r(x, 3, x + 1, 9, 0xc8e8f0, 'cylV'); g.r(x, 6, x + 1, 9, [0xe84a30, 0x58e070, 0xf0c838][(x - 5) / 4], 'flat'); }
  screen(g, 15, 12, 19, 15, 0x102030); g.r(16, 13, 18, 13, K.cyan, 'flat'); knob(g, 6, 15, K.dark);
};
ART.signal_amplifier = g => {
  device(g, 2, 9, 21, 20, 0x3a4048); g.r(5, 2, 6, 9, K.steel, 'cylV'); g.s(5, 1, K.red);
  for (let i = 0; i < 5; i++) g.r(9 + i * 2, 17 - i * 1.5, 10 + i * 2, 18, i < 4 ? K.green : 0x2a4a2a, 'flat');
  knob(g, 5, 15, K.steel);
};
ART.spectrometer = g => {
  device(g, 2, 9, 21, 20, 0x5a6a7a); g.p([5, 9, 9, 3, 13, 9], 0xd8f0ff, 'flat');
  const cols = [0xff4040, 0xffa030, 0xf0e040, 0x58e070, 0x40a0ff, 0xa060ff];
  cols.forEach((c, i) => g.l(13, 8, 21, 2 + i, c));
  screen(g, 4, 12, 13, 17, 0x101820); for (let i = 0; i < 6; i++) g.r(5 + i, 13 + (i % 3), 5 + i, 16, cols[i], 'flat');
  knob(g, 17, 14, K.steel);
};
ART.spectrum_analyzer = g => {
  device(g, 1, 3, 22, 20, 0x3a3c44); screen(g, 3, 5, 16, 16, 0x0a1a10);
  const hs = [3, 6, 9, 7, 4, 8, 10, 6, 3, 5, 2, 4]; hs.forEach((h, i) => g.r(4 + i, 16 - h, 4 + i, 15, h > 7 ? 0xf0e040 : 0x58f070, 'flat'));
  knob(g, 19, 7, K.steel); knob(g, 19, 12, K.steel); g.r(3, 18, 16, 18, K.gunL, 'flat');
};
ART.spring_cushion = g => {
  for (const x of [5, 11, 17]) for (let y = 12; y <= 19; y += 2) g.l(x - 2, y, x + 2, y + 1, K.steel);
  g.r(2, 20, 21, 21, K.gun);
  g.rr(2, 4, 21, 11, 0x7a4aa0, 'soft', 2); g.dots([6, 7, 11, 8, 16, 7], 0x5a3080);
};
ART.telemetry_transceiver = g => {
  device(g, 3, 11, 20, 21, 0x5a6a5a);
  g.p([4, 2, 12, 9, 13, 3], 0xd8d4c8, 'soft'); g.l(9, 6, 12, 11, K.dark); g.c(11, 4.5, 1, K.red, 'flat');
  for (let i = 0; i < 3; i++) g.c(7 + i * 4, 15.5, 1.3, [K.green, K.yellow, K.red][i], 'flat');
  g.r(5, 18, 18, 19, K.dark, 'flat'); arcs(g, 16, 5, 2, K.cyan);
};
ART.thermostat = g => {
  g.c(12, 12, 9.5, 0xe8e4d8); g.o(12, 12, 6, 7.4, 0x9a9ea8, 'flat');
  g.c(12, 12, 5, 0x2a2a30, 'flat'); g.glyph(['###.###', '..#.#..', '###.###', '#.....#', '###.###'], 9, 10, 0xffa030);
  for (let a = 0; a < 12; a++) { const t = Math.PI * 0.75 + a * Math.PI * 1.5 / 11; g.s(12 + Math.cos(t) * 8.4, 12 + Math.sin(t) * 8.4, a < 6 ? 0x3a98f0 : 0xe84a30); }
};
ART.toaster = g => {
  g.r(7, 2, 10, 8, 0xd8a050); g.r(13, 3, 16, 8, 0xc89040); g.r(7, 2, 10, 2, 0x8a5a2a, 'flat');
  g.rr(2, 7, 21, 20, 0xc8ccd4, 'cylH', 2); g.r(6, 7, 11, 8, K.dark, 'flat'); g.r(12, 7, 17, 8, K.dark, 'flat');
  g.r(19, 11, 22, 12, K.black); g.r(3, 20, 5, 21, K.dark); g.r(18, 20, 20, 21, K.dark);
  g.r(4, 10, 4, 17, 0xf0f4f8, 'flat');
};
ART.torn_blanket = g => {
  g.rr(2, 6, 21, 19, 0xb83a3a, 'soft', 1);
  for (let x = 2; x <= 21; x++) for (let y = 6; y <= 19; y++) if (g.has(x, y) && ((x % 5 === 0) || (y % 5 === 0))) g.s(x, y, 0x2e4a7a);
  g.r(2, 12, 21, 13, 0x8a2a2a, 'flat');
  for (const [x, y] of [[17, 19], [18, 18], [19, 19], [20, 18], [21, 19], [21, 17]]) g.clear(x, y);
};
ART.turbo_pump = g => {
  g.c(10, 13, 8, K.steel); g.c(10, 13, 4.6, 0x8a8e98, 'flat');
  rotor(g, 9.5, 12.5, 4, 6, 0xc8ccd4, K.gun, 0.2, 1.4);
  g.r(14, 3, 21, 8, K.steel, 'cylH'); g.r(20, 2, 22, 9, K.gunL); g.r(2, 19, 6, 22, K.gun);
};
ART.unusable_weapon = (g, it, id, r) => {
  g.bar(2, 15, 20, 10, 2.2, 0x6a5a4a); g.p([1, 14, 7, 13, 7, 17, 1, 19], 0x6a4a2a);
  g.r(8, 11, 13, 14, 0x5a5048); g.r(11, 15, 12, 18, 0x4a4038); g.bar(20, 10, 22, 13, 2, 0x6a5a4a);
  g.damage(r, { amt: 1.6, rust: true });
};
ART.water_filter = g => {
  g.lathe(12, 1, [[8, 0x3a98f0], [12, 0x3a98f0], ...rep(17, [12, 0xe8f0f4]), [12, 0x3a98f0], [8, 0x3a98f0]]);
  for (let y = 5; y <= 17; y += 3) g.lathe(12, y, [[12, 0xb8d0dc]]);
  g.glyph(['.#.', '###', '###', '.#.'], 11, 9, 0x3a98f0);
};
ART.water_pump = g => {
  g.r(9, 6, 15, 21, 0x3a6a5a, 'cylV'); g.r(7, 20, 17, 21, K.dark);
  g.r(15, 8, 21, 10, 0x3a6a5a, 'cylH'); g.r(20, 10, 21, 12, 0x2a4a40);
  g.bar(11, 5, 3, 1, 2, K.steel); g.r(10, 3, 14, 6, 0x2a4a40); g.c(3, 1.5, 1.4, K.black, 'flat');
  g.dots([21, 14, 20, 16, 21, 18], 0x6ad0f0);
};

// ======================================================================== trinkets
ART.leviathons_crown_ship_model = g => { ship(g, 0x2a2430, 0xe8c048, BR, { flag: 0xd03828 }); g.glyph(['#.#.#', '#####'], 10, 0, BR); };
ART.sirena_dorada_ship_model = g => ship(g, 0xc89a38, 0xd03828, 0xf0e070, { flag: 0xf0c838 });
ART.twilite_compass_ship_model = g => { ship(g, 0x2a3a6a, 0x9a70d8, 0xd8d0f0, { sails: 2 }); g.s(12, 1, 0xf0e070); g.s(11, 1, 0xf0e070); };
ART.velossity_ship_model = g => ship(g, 0xe8e4d8, 0x3a8ad8, 0x2a5aa0, { tri: true });
ART.wynd_sprite_ship_model = g => ship(g, WOODL, 0xf0ece0, 0x6a8a48, { sails: 2 });
ART.rubber_duck = g => duck(g, 0xf0d038, 0xf08a28);
ART.alien_duck = g => { duck(g, 0x78d860, 0x9a50d8, { eye: null }); g.r(15, 6, 17, 8, K.black, 'flat'); g.s(15, 6, 0xffffff); g.pl([13, 4, 11, 1], 0x58b848); g.pl([16, 4, 17, 1], 0x58b848); g.c(11, 1, 1, 0xf0f040, 'flat'); g.c(17, 1, 1, 0xf0f040, 'flat'); };
ART.arcade_duck = g => {
  const t = new PB(); duck(t, 0xb050f0, 0xf0d038);
  for (let y = 0; y < 24; y += 2) for (let x = 0; x < 24; x += 2) { const v = t.get(x, y + 1) !== -1 ? t.get(x, y + 1) : t.get(x + 1, y); if (v !== -1) { g.r(x, y, x + 1, y + 1, v, 'flat'); } }
  g.r(16, 6, 17, 7, K.black, 'flat'); g.dots([2, 2, 21, 20, 4, 21], 0x40f0ff);
};
ART.doodly_duck = g => { duck(g, 0xf0ece0, 0xf08a28); g.pl([5, 14, 8, 12, 10, 15, 13, 13], 0x3a70d0); g.pl([6, 18, 9, 17, 12, 19, 16, 17], 0xd03828); g.dots([13, 6, 14, 5, 15, 4], 0x58b848); g.c(8, 17, 1, 0xf0c838, 'flat'); };
ART.familiar_duck = g => { duck(g, 0xf0d038, 0xf08a28, { eye: null }); g.e(15, 6, 4.6, 3, 0x2a8a8a); g.r(14, 7, 19, 8, 0xffb048, 'flat'); g.s(12, 4, 0xf8c838); };
ART.flashy_duck = g => { duck(g, 0xe8b828, 0xf05a28); recolorRows(g, 0, 23, 0xffe070, 0.15); for (const [x, y] of [[3, 4], [20, 3], [6, 21], [21, 16]]) spark(g, x, y, 0xffe070); };
ART.frosty_duck = g => { duck(g, 0xa8e0f8, 0x9ab8d0); g.e(15, 4.5, 3.6, 1.6, 0xf8fcff); g.dots([4, 13, 8, 18, 14, 16, 10, 12], 0xffffff); g.dots([2, 4, 20, 14, 5, 7], 0xd8f0ff); };
ART.gentle_duck = g => { duck(g, 0xf8b8c8, 0xf0a060, { eye: null }); g.l(15, 7, 17, 7, K.black); g.c(12.5, 5, 1.6, 0xffffff, 'flat'); g.s(12, 5, 0xf0d038); };
ART.mri_duck = g => {
  duck(g, 0x1e3050, 0x2a4068, { eye: 0x9ad8ff, wing: 0x243a60 });
  g.pl([4, 15, 9, 14, 14, 15, 17, 14], 0xd8f0ff); for (let x = 6; x <= 14; x += 2) g.l(x, 13, x, 17, 0x9ab8d8);
  g.l(15, 13, 15, 10, 0xd8f0ff); g.c(15, 8, 2, 0xd8f0ff, 'flat'); g.c(15, 8, 0.9, 0x1e3050, 'flat');
};
ART.tropical_duck = g => { duck(g, 0xf0a030, 0xe85a28, { eye: null }); g.r(14, 6, 19, 7, K.black, 'flat'); g.s(15, 6, 0x5a6aff); g.c(11.5, 5, 1.8, 0xe8306a, 'flat'); g.s(11, 5, 0xf0e040); g.r(6, 11, 16, 12, 0x48c060, 'flat'); };
ART.air_freshener = g => {
  g.l(12, 0, 12, 4, 0xe8e0c8);
  g.p([12, 3, 16, 8, 14, 8, 18, 13, 15, 13, 20, 19, 13, 19, 13, 22, 11, 22, 11, 19, 4, 19, 9, 13, 6, 13, 10, 8, 8, 8], 0x48b848);
  g.r(8, 14, 16, 15, 0xf0e070, 'flat');
};
ART.bloated_tuna_can = g => {
  g.e(12, 8, 9, 3.6, 0xc8ccd4); g.e(12, 7, 6, 2, 0xe8ecf0, 'flat');
  g.r(3, 9, 20, 17, 0x3a78c8, 'cylV'); g.e(12, 17, 9, 2.4, 0x2a5aa0);
  g.p([7, 11, 15, 11, 17, 13, 15, 15, 7, 15, 9, 13], 0xd8d4c8, 'flat'); g.p([15, 13, 18, 11, 18, 15], 0xd8d4c8, 'flat'); g.s(9, 12, K.black);
};
ART.breathtaking_snow_globe = g => {
  g.c(12, 10, 8.6, 0xb8e0f0, 'flat'); g.o(12, 10, 7.8, 8.6, 0xe8f8ff, 'flat');
  g.e(12, 15, 6.5, 2, 0xf8fcff, 'flat'); g.p([12, 5, 16, 12, 8, 12], 0x2e6a3a, 'flat'); g.p([12, 3, 15, 9, 9, 9], 0x3a8a4a, 'flat'); g.r(11, 12, 12, 14, 0x6a4a2a, 'flat');
  g.dots([6, 7, 9, 5, 17, 6, 15, 10, 6, 12, 18, 13, 10, 9], 0xffffff); g.s(8, 4, 0xffffff); g.s(7, 5, 0xffffff);
  g.lathe(12, 18, [[14, WOOD], [16, WOOD], [16, WOOD], [16, dk(WOOD, 0.3)]]); g.r(6, 19, 17, 19, BR, 'flat');
};
function figure(g, c) {
  g.c(12, 4, 2.4, c); g.r(10, 7, 14, 13, c); g.bar(10, 8, 6, 3, 1.8, c); g.bar(14, 8, 17, 11, 1.8, c);
  g.bar(11, 13, 10, 18, 1.8, c); g.bar(13, 13, 15, 18, 1.8, c);
  g.lathe(12, 19, [[12, dk(c, 0.15)], [14, dk(c, 0.2)], [14, dk(c, 0.3)]]);
}
ART.bronze_statuette = g => { figure(g, 0xb87a3a); g.dots([11, 3, 10, 8], 0xf0c080); g.r(6, 20, 17, 20, 0x5a8a6a, 'flat'); };
ART.statuette = g => { figure(g, 0xe8e4d8); g.dots([11, 3, 10, 8], 0xffffff); };
ART.burnt_out_candles = g => {
  for (const [x, h, c] of [[6, 9, 0xe8e0c8], [12, 14, 0xd8c8a0], [17, 6, 0xe8d8b8]]) { g.r(x - 2, 21 - h, x + 1, 21, c, 'cylV'); g.s(x, 20 - h, K.black); g.s(x - 1, 22 - h, lt(c, 0.3)); g.r(x - 2, 21 - h, x - 2, 23 - h, dk(c, 0.2), 'flat'); }
  g.e(12, 21.5, 10, 1.5, 0xd8c8a0, 'flat');
};
ART.cat_bed = g => {
  g.e(12, 15, 10.5, 6, 0x8a5aa0); g.e(12, 13.5, 7.5, 3.5, 0xe8d0e8, 'flat'); g.e(12, 14.5, 6, 2.4, 0xd8b8d8, 'flat');
  g.p([16, 12, 20, 10, 19, 13], 0x9a9ea8); g.c(15.5, 12.5, 1.6, 0x9a9ea8);
};
ART.coffee_pot = g => {
  g.lathe(11, 2, [[2, K.black], [6, K.steel], [10, K.steel], ...rep(5, [8, K.steel]), [6, K.steel], [8, K.steel], ...rep(7, [12, K.steel]), [12, K.gunL]]);
  g.r(5, 9, 17, 10, K.gun, 'flat'); g.p([17, 13, 21, 9, 21, 11, 17, 16], K.steel); g.r(2, 12, 4, 19, K.black); g.r(4, 13, 5, 13, K.black); g.r(4, 18, 5, 18, K.black);
};
ART.colorful_shoes = g => {
  g.p([2, 10, 9, 10, 12, 13, 20, 14, 22, 17, 22, 19, 2, 19], 0xe84a6a);
  g.r(2, 18, 22, 20, 0xf0ece0); g.r(2, 10, 6, 12, 0x3a98f0); g.p([9, 11, 12, 14, 9, 15], 0xf0d038);
  g.dots([10, 12, 12, 13, 14, 14], 0xffffff); g.r(15, 16, 21, 16, 0x3a98f0, 'flat');
};
ART.dart_board = g => {
  g.c(12, 12, 10, K.black); const ring = (r0, r1, a, b) => { for (let k = 0; k < 20; k++) for (let rr = r0; rr <= r1; rr += 0.5) { const t = k * Math.PI / 10; for (let s = 0; s < 1; s += 0.2) { const tt = t + s * Math.PI / 10; g.s(12 + Math.cos(tt) * rr, 12 + Math.sin(tt) * rr, k % 2 ? a : b); } } };
  ring(1.5, 8, 0xf0e0c0, 0x2a2a30); ring(8, 8.8, 0xd03828, 0x38a048); ring(4.5, 5.2, 0xd03828, 0x38a048);
  g.c(12, 12, 1.2, 0xd03828, 'flat'); g.bar(14, 10, 21, 3, 1.4, K.steel); g.p([19, 2, 22, 1, 21, 5], K.yellow);
};
ART.elephant_obelisk = g => {
  g.p([10, 1, 13, 1, 14, 9, 9, 9], 0xd8c8a0); g.r(9, 9, 14, 10, 0xb8a880);
  g.e(11, 15, 7, 4.5, 0x8a8e98); g.c(17.5, 13.5, 3.4, 0x8a8e98); g.bar(19, 15, 21, 20, 1.6, 0x8a8e98);
  for (const x of [6, 9, 13, 15]) g.r(x, 18, x + 1, 21, 0x7a7e88, 'cylV');
  g.p([7, 10, 15, 10, 15, 13, 7, 13], 0xd03828, 'soft'); g.s(18, 12, K.black);
};
ART.empty_wine_bottle = g => bottle(g, 0x3a6a3a, 0xe8dcb8, { cork: 0x7a2a2a });
ART.equatorial_sundial = g => {
  g.o(12, 10, 6, 7.4, BR, 'flat'); g.o(12, 10, 6, 7.4, 0xb88a30, 'flat', 0.4);
  g.bar(6, 15, 18, 4, 1.2, 0x8a8e98); g.c(12, 10, 1.4, BR);
  g.r(11, 16, 12, 19, BR, 'cylV'); g.lathe(12, 20, [[10, 0x6a6e78], [12, 0x5a5e66], [12, 0x4a4e58]]);
};
ART.expired_pasta = g => {
  for (let x = 6; x <= 16; x += 2) g.l(x, 1 + (x % 3), x + 1, 8, 0xf0d890);
  g.p([4, 7, 19, 7, 19, 21, 4, 21], 0x2a5ab0); g.r(4, 7, 19, 9, 0xf0ece0, 'flat');
  g.r(6, 12, 17, 17, 0xf0ece0, 'flat'); g.l(7, 15, 16, 13, 0xe8c050); g.l(7, 14, 15, 16, 0xe8c050); g.s(17, 19, 0xd03828);
};
ART.faded_photograph = g => {
  g.r(4, 2, 19, 21, 0xf0ece0, 'soft'); g.r(6, 4, 17, 15, 0xb8a888, 'flat');
  g.r(6, 12, 17, 15, 0x9a8a6a, 'flat'); g.c(9, 8, 1.8, 0x7a6a50, 'flat'); g.r(8, 10, 10, 14, 0x7a6a50, 'flat');
  g.c(14, 8, 1.8, 0x7a6a50, 'flat'); g.r(13, 10, 15, 14, 0x7a6a50, 'flat'); g.r(6, 4, 17, 5, 0xd0c4a8, 'flat');
  g.r(7, 18, 14, 18, 0x9a9488, 'flat');
};
ART.film_reel = g => reel(g, 0x9a9ea8);
ART.fine_wristwatch = g => {
  g.r(9, 0, 14, 5, 0x6a3a1e, 'cylV'); g.r(9, 18, 14, 23, 0x6a3a1e, 'cylV');
  g.c(11.5, 11.5, 7.2, BR); g.c(11.5, 11.5, 5.6, 0xf8f4e8, 'flat');
  g.l(11, 11, 11, 7, K.black); g.l(11, 11, 14, 12, K.black); g.dots([11, 6, 16, 11, 11, 16, 6, 11], BR); g.r(19, 10, 19, 12, BR, 'flat');
};
ART.lantzs_mixtape_5th_edition = g => cassette(g, 0xe8306a, 0xf8e8a0, ['###', '#..', '###', '..#', '###']);
ART.light_bulb = g => {
  g.c(12, 9, 7.4, 0xf8f0c0); g.c(10, 7, 2.2, 0xffffff, 'flat');
  g.pl([10, 15, 10, 11, 12, 9, 14, 11, 14, 15], 0xc8a040);
  g.lathe(12, 15, [[6, 0xe8e4d8], [8, 0xb8bcc4], [8, 0x8a8e98], [8, 0xb8bcc4], [8, 0x8a8e98], [6, 0xb8bcc4], [4, K.dark]]);
};
ART.music_album = g => {
  g.c(15, 12, 8, 0x16141a); g.o(15, 12, 3, 6, 0x2a2a30, 'flat'); g.c(15, 12, 2.6, 0xe84a30, 'flat'); g.s(15, 12, K.black);
  g.r(1, 3, 13, 20, 0x3a8ad8); g.c(7, 11, 3.4, 0xf0d038, 'flat'); g.r(2, 17, 12, 18, 0xf0ece0, 'flat');
};
ART.music_box = g => {
  g.p([3, 4, 18, 2, 18, 9, 3, 9], 0x8a3a5a); g.r(4, 4, 17, 8, 0xd8a8b8, 'flat');
  g.rr(2, 10, 19, 20, 0x8a3a5a, 'bevel', 1); g.r(2, 13, 19, 13, BR, 'flat');
  g.r(10, 6, 10, 9, 0xf0ece0); g.c(10.5, 5.5, 1, K.skin, 'flat'); g.p([8, 8, 13, 8, 11, 6], 0xe878a8);
  g.r(19, 14, 21, 15, BR); g.r(21, 12, 22, 17, BR);
};
ART.painted_box = g => {
  g.rr(3, 6, 20, 19, 0x2a7a8a, 'bevel', 1); g.r(3, 6, 20, 9, 0x3a9aa8);
  g.c(11.5, 14, 3, 0xf0d038, 'flat'); g.dots([7, 12, 16, 12, 7, 17, 16, 17], 0xe84a6a); g.dots([11, 7, 13, 7, 6, 8, 17, 8], 0xf0ece0); g.r(10, 9, 13, 10, BR);
};
ART.playing_cards = g => {
  g.rr(12, 2, 21, 16, 0x3a5ab8, 'bevel', 1);
  for (let y = 4; y <= 14; y += 2) for (let x = 14; x <= 19; x += 2) g.s(x + (y % 4 ? 1 : 0), y, 0x6a8ad8);
  g.rr(7, 4, 16, 18, 0xf8f4ec, 'bevel', 1); g.glyph(['..#..', '.###.', '#####', '..#..'], 9, 6, 0x2a2a30); g.glyph(['..#..', '.###.', '#####', '..#..'], 9, 12, 0x2a2a30);
  g.rr(2, 7, 11, 21, 0xf8f4ec, 'bevel', 1); g.glyph(['.#.#.', '#####', '.###.', '..#..'], 4, 9, 0xd03828); g.glyph(['.#.#.', '#####', '.###.', '..#..'], 5, 15, 0xd03828);
};
ART.poster_of_natural_wonders = g => {
  g.r(2, 3, 21, 20, 0xf0ece0, 'soft'); g.r(4, 5, 19, 18, 0x8ac8f0, 'flat');
  g.p([4, 18, 9, 9, 13, 15, 16, 11, 19, 16, 19, 18], 0x5a6a8a, 'flat'); g.p([8, 11, 9, 9, 10, 11], 0xffffff, 'flat');
  g.r(4, 16, 19, 18, 0x48a048, 'flat'); g.c(16, 7.5, 1.6, 0xf0d038, 'flat'); g.r(20, 3, 21, 20, 0xc8c4b8, 'flat');
};
ART.pottery = g => vaseShape(g, [10, 12, 8, 8, 10, 14, 16, 16, 18, 18, 18, 16, 16, 14, 12, 10, 8], 0xc8703a, g => { recolorRows(g, 13, 14, 0x2a2a30, 0.8); recolorRows(g, 17, 17, 0xf0e0c0, 0.7); g.dots([7, 16, 11, 16, 15, 16], 0x2a2a30); });
ART.vase = g => vaseShape(g, [8, 10, 6, 6, 6, 8, 10, 12, 14, 16, 16, 16, 16, 14, 12, 10, 8, 10, 12], 0xe8ecf4, g => { for (let y = 10; y <= 17; y++) for (let x = 0; x < 24; x++) if (g.has(x, y) && (x + y) % 3 === 0) g.s(x, y, 0x3a5ab8); recolorRows(g, 8, 8, 0x3a5ab8, 0.8); recolorRows(g, 19, 19, 0x3a5ab8, 0.8); });
ART.red_coral_jewelry = g => {
  for (let i = 0; i <= 14; i++) { const t = Math.PI * (0.05 + 0.9 * i / 14); g.c(12 + Math.cos(t) * 9, 4 + Math.sin(t) * 13, 1.5, i % 2 ? 0xe8503a : 0xd03828); }
  g.c(12, 18, 2.6, 0xe8503a); g.s(11, 17, 0xffb0a0); g.r(2, 2, 3, 4, BR); g.r(20, 2, 21, 4, BR);
};
ART.rosary = g => {
  for (let i = 0; i < 18; i++) { const t = i * Math.PI * 2 / 18; g.c(11 + Math.cos(t) * 7, 9 + Math.sin(t) * 6, 1, i % 6 ? 0x8a4a2a : 0xc87a48, 'flat'); }
  g.r(11, 15, 11, 17, 0x8a4a2a); g.r(10, 18, 13, 22, BR); g.r(9, 19, 14, 19, BR); g.clear(10, 18); g.clear(13, 18); g.clear(10, 20); g.clear(10, 21); g.clear(10, 22); g.clear(13, 20); g.clear(13, 21); g.clear(13, 22);
};
ART.sextant = g => {
  g.o(12, 4, 14, 16, BR, 'flat'); for (let y = 0; y < 13; y++) for (let x = 0; x < 24; x++) g.clear(x, y);
  g.l(12, 4, 4, 17, BR); g.l(12, 4, 20, 17, BR); g.l(12, 4, 15, 19, 0xb8bcc4);
  g.r(9, 2, 15, 5, 0x8a8e98); g.r(14, 8, 18, 10, 0x2a2a30); g.r(7, 11, 9, 13, 0x9ad8f0); g.r(5, 17, 8, 21, WOOD);
};
ART.silver_teaspoon_set = g => {
  for (const [x0, y0, x1, y1] of [[4, 21, 9, 6], [11, 21, 12, 5], [18, 21, 15, 6]]) { g.bar(x0, y0, x1, y1 + 3, 1.4, 0xc8ccd4); g.e(x1 + 0.5, y1, 2, 3, 0xd8dce4); }
};
ART.tellurion = g => {
  g.lathe(12, 18, [[6, BR], [10, WOOD], [14, WOOD], [14, dk(WOOD, 0.3)], [14, dk(WOOD, 0.4)]]);
  g.r(11, 9, 12, 18, BR, 'cylV'); g.c(12, 7, 3.6, 0xffb020); g.c(11, 6, 1, 0xfff0b0, 'flat');
  g.l(12, 10, 20, 13, BR); g.c(20, 12, 2.2, 0x3a8ad8); g.s(19, 11, 0x58c058); g.c(22, 9, 0.9, 0xd8d4c8, 'flat');
  g.o(12, 7, 6.5, 7, 0xb88a30, 'flat', 0.35);
};
ART.torn_book = g => {
  bookShape(g, 3, 4, 19, 20, 0x7a3a2a);
  g.p([5, 4, 20, 4, 20, 18, 5, 18], 0xe8dcbc, 'soft'); g.r(3, 4, 5, 20, 0x5a2a1e);
  for (let y = 7; y <= 16; y += 2) g.r(8, y, 18, y, 0xb8ac90, 'flat');
  for (const [x, y] of [[20, 4], [19, 5], [20, 9], [19, 10], [20, 11], [18, 4]]) g.clear(x, y);
};
ART.train_model = g => {
  g.r(2, 9, 13, 16, 0xd03828, 'cylH'); g.r(13, 5, 20, 16, 0x2a5a3a); g.r(14, 7, 18, 10, 0xf0e8b0, 'flat');
  g.r(5, 5, 7, 9, K.black); g.r(4, 4, 8, 5, K.dark); g.r(12, 3, 21, 4, K.dark);
  for (const x of [5, 10, 16]) { g.c(x, 18.5, 2.6, K.dark); g.c(x, 18.5, 1, K.steel, 'flat'); }
  g.r(1, 13, 2, 16, K.dark); g.r(2, 21, 21, 21, 0x6a5040, 'flat');
};
ART.very_comfortable_pillow = g => {
  g.p([2, 6, 6, 4, 12, 6, 18, 4, 22, 6, 21, 12, 22, 18, 18, 20, 12, 18, 6, 20, 2, 18, 3, 12], 0xe8e4f4, 'soft');
  g.e(12, 12, 6, 4, 0xf8f4ff, 'flat'); g.l(4, 6, 20, 18, 0xc8c0e0); g.dots([12, 12], 0xc8c0e0);
};
ART.vintage_steering_wheel = g => {
  g.o(12, 12, 7.4, 10, 0x6a3a1e, 'flat'); g.o(12, 12, 7.4, 8.4, 0x9a5a2e, 'flat');
  g.bar(12, 12, 4, 12, 1.8, K.chrome); g.bar(12, 12, 20, 12, 1.8, K.chrome); g.bar(12, 12, 12, 20, 1.8, K.chrome);
  g.c(12, 12, 3, 0x2a2a30); g.c(12, 12, 1.4, BR, 'flat');
};

// ======================================================================== quest items
const QUEST = 0xf0c838;
ART.celestas_journal = g => {
  g.rr(4, 2, 19, 21, 0x6a3a5a, 'bevel', 1); g.r(17, 3, 19, 20, 0xe8dcbc, 'flat'); for (let y = 4; y <= 19; y += 2) g.s(18, y, 0xc8bc9c);
  g.r(4, 10, 21, 12, 0x3a2030); g.r(20, 10, 21, 12, BR);
  g.glyph(GL.star, 9, 4, BR); g.r(8, 14, 13, 14, BR, 'flat'); g.r(14, 20, 15, 23, 0xd03828, 'flat');
};
function meter(g, body, icon, iconC) {
  device(g, 3, 1, 16, 15, body); screen(g, 5, 3, 14, 8, 0x102018); g.glyph(icon, 8, 4, iconC);
  knob(g, 7, 12, K.dark); knob(g, 12, 12, K.dark);
  g.r(8, 15, 11, 17, K.dark); g.r(8, 17, 8, 22, K.chrome); g.r(11, 17, 11, 22, K.chrome);
}
ART.moisture_meter = g => meter(g, 0x3a98c0, ['..#..', '.###.', '#####', '.###.'], 0x6ad0ff);
ART.nutrient_meter = g => meter(g, 0x58a048, ['..##', '.###', '###.', '#...'], 0x78e858);
ART.lidar_scanner = g => {
  g.p([22, 3, 22, 21, 13, 13, 13, 11], 0xff3a3a, 'flat'); for (let y = 4; y <= 20; y += 2) g.l(14, 12, 22, y, 0xff8070);
  device(g, 2, 7, 13, 17, 0xd8d4c8); g.c(12, 12, 2.6, K.dark); g.c(12, 12, 1.2, 0xff3a3a, 'flat');
  g.r(4, 9, 8, 12, 0x102018, 'flat'); g.r(4, 17, 7, 21, K.dark);
};
ART.esr_analyzer = g => {
  device(g, 2, 2, 17, 17, 0xf0c030); screen(g, 4, 4, 15, 9, 0x102018);
  g.glyph(['##.#.##', '#..#.#.', '##.#.##'], 6, 5, 0x78e858); knob(g, 9, 13, K.black);
  g.pl([5, 17, 4, 21, 2, 22], K.red); g.pl([14, 17, 16, 20, 21, 21], K.black); g.s(2, 22, K.chrome); g.s(22, 21, K.chrome);
};
ART.old_world_books = g => {
  bookShape(g, 2, 15, 19, 20, 0x2a5a8a); bookShape(g, 4, 10, 20, 14, 0x8a3a2a); bookShape(g, 3, 5, 17, 9, 0x4a6a3a);
  g.r(6, 7, 12, 7, BR, 'flat'); g.r(8, 12, 15, 12, BR, 'flat'); g.r(5, 17, 13, 17, BR, 'flat');
};
ART.possibly_toxic_plant = g => {
  g.lathe(12, 15, [[14, 0xb86a3a], [12, 0xa85a30], ...rep(5, [10, 0xa85a30]), [8, 0x7a4020]]);
  for (const [x, y] of [[5, 4], [12, 2], [19, 5], [7, 9], [17, 10]]) { g.l(12, 15, x, y + 3, 0x5a3a6a); g.e(x, y + 1, 2.8, 2, 0x8a3ab0); }
  g.dots([5, 5, 12, 2, 19, 6, 17, 10], 0xb8f040);
};
ART.espresso_machine_parts = g => {
  g.c(8, 11, 6, K.steel); g.c(8, 11, 4.4, 0x3a2418, 'flat'); g.bar(13, 13, 22, 17, 2.8, K.black);
  g.c(17, 5, 3.6, 0xe8e4d8); g.o(17, 5, 3, 3.6, K.chrome, 'flat'); g.l(17, 5, 18, 3, K.red);
  g.r(3, 19, 12, 21, K.chrome);
};
ART.stack_of_movie_tapes = g => {
  for (const [y, c] of [[16, 0x2a2a30], [11, 0x34343c], [6, 0x2a2a30]]) { g.rr(3, y, 20, y + 4, c, 'bevel', 1); g.r(6, y + 1, 14, y + 3, [0xe84a30, 0xf0ece0, 0x3a98f0][y % 3 === 0 ? 0 : y % 3], 'flat'); }
  g.r(6, 2, 17, 5, 0x6a3a8a); g.r(7, 3, 12, 4, 0xf0d038, 'flat');
};
ART.dusty_film_reel = g => reel(g, 0x8a6a4a, true);
ART.precision_gimbal = g => {
  g.o(12, 11, 6, 7.4, K.gunL, 'flat'); g.o(12, 11, 6, 7.4, K.steel, 'flat', 0.45);
  g.rr(9, 8, 15, 14, K.black, 'bevel', 1); g.c(14, 11, 1.6, 0x3a5ab0, 'flat'); g.s(13, 10, 0xb0c8ff);
  g.r(11, 18, 12, 22, K.dark); g.r(8, 2, 15, 3, K.orange);
};
ART.experimental_seed_sample = g => {
  g.lathe(12, 1, [[6, 0x3a98f0], [8, 0x3a98f0], [8, 0x2a78d0], ...rep(15, [8, 0xc8e8f0]), [6, 0xa8c8d0]]);
  g.lathe(12, 10, rep(9, [6, 0x48d0a0])); g.e(12, 14, 2, 2.6, 0x8a6a2a); g.l(12, 12, 13, 9, 0x78f058); g.s(14, 8, 0xb8ff80);
  g.r(9, 5, 9, 18, 0xffffff, 'flat');
};
ART.first_wave_compass = g => {
  g.c(12, 13, 9, BR); g.c(12, 13, 7.2, 0xf0ece0, 'flat'); g.o(11, 3, 1, 2, BR);
  g.p([12, 7, 14, 13, 12, 13], 0xd03828, 'flat'); g.p([12, 19, 10, 13, 12, 13], 0x3a5a8a, 'flat'); g.p([12, 7, 10, 13, 12, 13], 0xe85a40, 'flat'); g.p([12, 19, 14, 13, 12, 13], 0x2a4070, 'flat');
  g.dots([12, 6, 19, 13, 12, 20, 5, 13], 0x2a2a30);
};
ART.first_wave_rations = g => {
  g.rr(2, 6, 21, 19, 0x5a6a3c, 'bevel', 1); g.r(2, 6, 21, 8, 0x6e7e4c, 'flat');
  g.r(5, 11, 18, 16, 0xd8ccb0, 'flat'); g.glyph(['###.#.###', '#...#.#..', '##..#.##.', '#...#.#..'], 7, 12, 0x3a3a2a);
};
ART.first_wave_tape = g => cassette(g, 0x5a6a3c, 0xe8dcb8, ['#.#', '###', '#.#']);
ART.raider_flag = g => {
  g.r(3, 1, 4, 22, WOODL, 'cylV');
  g.p([5, 2, 21, 3, 19, 8, 21, 13, 5, 13], 0x2a8a8a, 'soft');
  g.p([5, 2, 21, 3, 19, 8, 13, 8], 0x3a9a9a, 'flat'); g.glyph(['..#..', '.###.', '##.##', '#...#'], 10, 5, 0xf0a030);
};
ART.scout_patrol_note = g => {
  g.p([4, 3, 19, 2, 20, 20, 5, 21], 0xe8dcb4, 'soft');
  for (let y = 7; y <= 18; y += 2) g.pl([7, y, 10, y - 1, 13, y, 17, y - 1], 0x5a5a8a);
  g.c(12, 3, 1.6, 0xd03828); g.p([14, 18, 19, 18, 19, 21], 0xc8bc98);
};
ART.official_shutdown_documentation = g => {
  g.p([2, 5, 9, 5, 11, 7, 21, 7, 21, 21, 2, 21], 0xc8a868);
  g.r(4, 3, 18, 18, 0xf0ece0, 'soft'); for (let y = 6; y <= 12; y += 2) g.r(6, y, 16, y, 0xa8a8a0, 'flat');
  g.p([2, 9, 21, 9, 21, 21, 2, 21], 0xd8b878);
  g.r(8, 13, 18, 18, 0xd03828, 'flat'); g.r(9, 14, 17, 17, 0xd8b878, 'flat'); g.glyph(['#.#.#', '.###.'], 11, 14, 0xd03828);
};

// ======================================================================== hashed fallback (any future item)
const GENERIC = [
  (g, c) => vaseShape(g, [6, 8, 6, 8, 12, 14, 14, 14, 12, 10, 8], c),
  (g, c) => { g.rr(4, 6, 19, 19, c, 'bevel', 1); g.r(4, 6, 19, 9, lt(c, 0.2)); g.r(10, 9, 13, 11, BR); },
  (g, c) => { g.c(12, 12, 8, c); g.o(12, 12, 8, 9, dk(c, 0.4), 'flat', 0.35); },
  (g, c) => bottle(g, c, 0xe8dcb8),
  (g, c) => { hexagon(g, 12, 12, 9, c); hexagon(g, 12, 12, 4, lt(c, 0.4), 'glow'); },
  (g, c) => figure(g, c),
];
export function hashedArt(g, it, id) {
  const h = hashStr(id); const c = hue(0xc87a48, h % 360, 0.9);
  GENERIC[(h >>> 9) % GENERIC.length](g, c);
}
FAM.trinket = (g, it, id) => hashedArt(g, it, id);
FAM.salvage = (g, it, id) => hashedArt(g, it, id);
FAM.valuable = (g, it, id) => hashedArt(g, it, id);
FAM.quest = (g, it, id) => { hashedArt(g, it, id); };
