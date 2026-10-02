// Hand-built 24x24 pixel art for DarkRaiders items. Every function draws into a PB (ui/icon_kit.js);
// the outline pass + tier pips are added afterwards by ui/icons.js.
//   ITEM_ART[itemId](g, item, id, rnd)    bespoke drawings
//   FAMILY_ART[iconFamily](g, item, id, rnd)  family drawers with per-item variation
import { PB, PAL, OUT, col, mix, dk, lt, grey, hue, rng, hashStr } from './icon_kit.js';

export const K = {
  ink: 0x1e1c22, black: 0x1a1a1e, dark: 0x2e2e36, gun: 0x44444e, gunL: 0x6a6c76, steel: 0x9a9ea8, chrome: 0xd0d4da,
  wood: 0x8a5630, woodD: 0x5a3620, woodL: 0xb88048, olive: 0x5a6a3c, oliveD: 0x3e4a2e, oliveL: 0x84945a,
  tan: 0xb8a476, tanD: 0x8a7650, brass: 0xd0a040, copper: 0xc0703a, red: 0xc8382a, redD: 0x8a2418, orange: 0xf08a28,
  yellow: 0xf0c838, cyan: 0x5ae0ff, cyanD: 0x1e7a98, white: 0xe8e6dc, silver: 0xb8bcc4, purple: 0xb060f0, purpleD: 0x5a2a88,
  rubber: 0x2a2a2e, blue: 0x3a78d0, blueD: 0x234a8a, green: 0x58b850, greenD: 0x2e6a2a, cream: 0xe8e0c8, paper: 0xd8ccb0,
  pink: 0xe878a8, skin: 0xe0b090, glass: 0x9ad8f0, arc: 0xff7a20, arcHot: 0xffc040, arcRed: 0xff3a1a, rust: 0x9a5028,
};

// ======================================================================== WEAPONS (side view, muzzle right)
export const GUN_ART = {
  kettel(g) {   // cheap wooden semi-auto carbine
    g.p([1, 9, 10, 9, 10, 12, 6, 12, 2, 15, 1, 15], K.wood);
    g.r(1, 9, 1, 15, K.woodD, 'flat');
    g.r(9, 8, 14, 10, K.gun);
    g.r(14, 9, 18, 11, K.wood);
    g.r(14, 8, 22, 8, K.steel, 'flat'); g.r(18, 9, 21, 9, K.gunL, 'flat');
    g.r(17, 9, 17, 11, K.steel, 'flat');
    g.s(21, 7, K.gun); g.s(12, 7, K.gun);
    g.r(11, 11, 13, 14, K.dark);
    g.dots([9, 11, 9, 12, 10, 13], K.ink); g.s(10, 11, K.steel);
    g.r(10, 11, 10, 11, K.woodD, 'flat');
  },
  rattlr(g) {   // crude full-auto: wire stock, curved mag, taped wooden handguard
    g.l(1, 9, 7, 9, K.gunL); g.l(1, 13, 7, 11, K.gunL); g.l(1, 9, 1, 13, K.gun);
    g.r(7, 8, 14, 11, K.olive);
    g.r(7, 8, 14, 8, K.oliveL, 'flat');
    g.r(14, 9, 18, 11, K.wood);
    g.r(14, 8, 18, 8, K.gunL, 'flat');
    g.r(16, 9, 16, 11, K.silver, 'flat');
    g.r(18, 9, 22, 9, K.steel, 'flat'); g.s(21, 8, K.gun); g.s(22, 10, K.gun);
    g.p([11, 12, 14, 12, 16, 16, 13, 17], K.dark);
    g.p([8, 12, 10, 12, 9, 16, 7, 16], K.woodD);
    g.dots([10, 12, 11, 13], K.ink);
  },
  arpeggo(g) {  // bullpup with long carry handle, tan polymer
    g.r(2, 9, 16, 12, K.tan);
    g.r(1, 9, 2, 13, K.rubber);
    g.r(5, 6, 15, 6, K.tanD); g.s(5, 7, K.tanD); g.s(15, 7, K.tanD); g.s(5, 8, K.tanD); g.s(15, 8, K.tanD);
    g.r(16, 10, 21, 10, K.steel, 'flat'); g.r(21, 9, 22, 11, K.gun, 'flat');
    g.r(16, 9, 18, 11, K.tanD);
    g.r(3, 13, 6, 16, K.dark);
    g.p([10, 13, 12, 13, 11, 17, 9, 17], K.dark);
    g.l(7, 13, 9, 15, K.ink); g.l(7, 13, 7, 14, K.ink);
    g.r(8, 10, 13, 10, K.tanD, 'flat');
  },
  tempesta(g) { // modern full-auto, black with orange accents, red dot
    g.p([1, 9, 7, 9, 7, 11, 4, 11, 2, 13, 1, 13], K.dark);
    g.r(7, 9, 8, 9, K.gun, 'flat');
    g.r(8, 8, 14, 11, K.gun);
    g.r(14, 8, 20, 11, K.dark);
    g.r(15, 10, 19, 10, K.orange, 'flat');
    for (let x = 8; x <= 20; x += 2) g.s(x, 7, K.gunL);
    g.r(20, 9, 22, 10, K.gunL);
    g.r(10, 5, 12, 6, K.black); g.s(11, 5, K.arcRed);
    g.p([11, 12, 14, 12, 15, 16, 12, 16], K.dark); g.r(12, 16, 15, 16, K.orange, 'flat');
    g.p([8, 12, 10, 12, 9, 15, 7, 15], K.black);
  },
  betina(g) {   // heavy-calibre battle rifle: wood stock, olive steel, long box mag, muzzle brake
    g.p([1, 9, 8, 9, 8, 12, 4, 13, 1, 15], K.woodL);
    g.r(1, 9, 1, 15, K.woodD, 'flat');
    g.r(8, 8, 15, 11, K.olive);
    g.r(15, 8, 19, 10, K.oliveL);
    g.dots([16, 9, 18, 9], K.oliveD);
    g.r(19, 9, 21, 9, K.steel, 'flat'); g.r(21, 8, 22, 10, K.dark);
    g.r(9, 6, 14, 6, K.dark); g.s(10, 7, K.dark); g.s(13, 7, K.dark); g.s(14, 6, K.glass);
    g.r(12, 12, 14, 17, K.dark);
    g.p([8, 12, 10, 12, 10, 15, 8, 15], K.wood);
  },
  ferrox(g) {   // break-action single shot: long barrel, silver action, wood
    g.p([1, 10, 9, 9, 9, 12, 5, 12, 2, 15, 1, 15], K.woodL);
    g.r(1, 10, 1, 15, K.woodD, 'flat');
    g.r(9, 9, 12, 12, K.silver);
    g.s(11, 12, K.ink); g.s(9, 8, K.gun);
    g.r(12, 11, 17, 12, K.wood);
    g.r(12, 9, 22, 10, K.gunL, 'cylH');
    g.s(22, 8, K.gun);
    g.dots([10, 13, 9, 13], K.ink);
  },
  renegayde(g) { // lever action: brass receiver, tube magazine, lever loop
    g.p([1, 9, 7, 9, 7, 11, 4, 12, 1, 14], K.wood);
    g.r(1, 9, 1, 14, K.woodD, 'flat');
    g.r(7, 8, 11, 11, K.brass);
    g.s(7, 7, K.gun);
    g.r(11, 8, 22, 8, K.steel, 'flat');
    g.r(11, 10, 20, 10, K.gun, 'flat');
    g.r(11, 9, 15, 11, K.wood);
    g.s(21, 7, K.gun);
    g.pl([7, 12, 7, 14, 10, 14, 10, 12], K.gunL); g.s(8, 12, K.gunL);
    g.s(19, 9, K.gun);
  },
  afelion(g) {  // sleek energy rifle: white shell, cyan core
    g.p([2, 9, 17, 8, 20, 9, 20, 12, 14, 13, 6, 13, 2, 14], K.white);
    g.clear(3, 11); g.clear(4, 11); g.clear(4, 12); g.clear(3, 12);
    g.r(6, 10, 18, 10, K.cyan, 'flat'); g.s(18, 10, 0xffffff);
    g.r(20, 9, 22, 11, K.dark); g.s(22, 10, K.cyan);
    g.r(9, 6, 14, 7, K.dark); g.s(14, 6, K.cyan);
    g.r(11, 14, 13, 15, K.cyan, 'glow');
    g.p([8, 13, 10, 13, 9, 16, 7, 16], K.gunL);
  },
  stitchr(g) {  // crude tube SMG (grease-gun style)
    g.l(2, 9, 6, 9, K.gunL); g.l(2, 12, 6, 11, K.gunL); g.l(2, 9, 2, 12, K.gun);
    g.r(6, 8, 15, 10, K.gun, 'cylH');
    g.r(15, 9, 19, 9, K.steel, 'flat'); g.s(19, 8, K.gun);
    g.r(11, 11, 12, 17, K.dark);
    g.p([6, 11, 9, 11, 8, 15, 6, 15], K.woodD);
    g.s(13, 8, K.ink); g.s(14, 8, K.ink);
  },
  canta(g) {    // compact medium SMG: curved mag, front sight hood
    g.p([2, 9, 7, 9, 7, 11, 2, 12], K.dark);
    g.r(7, 8, 14, 10, K.gun);
    g.r(13, 7, 18, 7, K.gunL, 'flat');
    g.r(14, 9, 17, 11, K.rubber);
    g.r(17, 9, 20, 9, K.steel, 'flat');
    g.r(18, 5, 19, 6, K.gunL); g.s(18, 5, K.steel);
    g.p([11, 11, 13, 11, 15, 15, 13, 16], K.black);
    g.p([7, 11, 9, 11, 9, 14, 7, 14], K.dark);
  },
  bobkat(g) {   // angular hyper-fast SMG
    g.r(1, 9, 6, 10, K.gun); g.r(1, 9, 2, 12, K.dark);
    g.p([6, 8, 16, 8, 17, 10, 15, 13, 10, 13, 7, 11], K.gunL);
    g.l(8, 10, 15, 10, K.orange);
    g.r(16, 9, 20, 10, K.dark); g.s(20, 9, K.gunL);
    for (let x = 8; x <= 15; x += 2) g.s(x, 7, K.dark);
    g.r(10, 5, 11, 6, K.black); g.s(10, 5, K.orange);
    g.r(12, 13, 13, 18, K.dark); g.r(12, 18, 13, 18, K.orange, 'flat');
    g.p([8, 12, 10, 12, 9, 15, 7, 15], K.dark);
  },
  el_torro(g) { // pump shotgun, red wood furniture
    g.p([1, 9, 8, 9, 8, 11, 5, 12, 2, 14, 1, 14], 0x9a4a2a);
    g.r(1, 9, 1, 14, K.black, 'flat');
    g.r(8, 8, 13, 11, K.dark);
    g.r(13, 8, 22, 8, K.steel, 'flat'); g.s(21, 7, K.brass);
    g.r(13, 10, 21, 10, K.gun, 'flat');
    g.r(15, 9, 19, 11, 0x9a4a2a); g.dots([16, 9, 16, 10, 16, 11, 18, 9, 18, 10, 18, 11], 0x6a2a1a);
    g.dots([9, 12, 10, 13], K.ink);
  },
  volcano(g) {  // semi-auto shotgun: heat-vented shroud, box mag, glowing vents
    g.p([1, 9, 7, 9, 7, 11, 4, 11, 1, 13], K.dark);
    g.r(7, 8, 14, 11, 0x5a2a22);
    g.r(14, 8, 20, 11, K.dark);
    for (let x = 15; x <= 19; x += 2) { g.s(x, 9, K.orange); g.s(x, 10, K.arcRed); }
    g.r(20, 7, 22, 12, K.gun);
    g.r(8, 6, 13, 7, K.gun);
    g.r(11, 12, 13, 15, K.black); g.r(11, 15, 13, 15, K.orange, 'flat');
    g.p([8, 12, 10, 12, 9, 15, 7, 15], K.black);
  },
  dolabre(g) {  // energy shotgun: axe-head emitter, purple glow
    g.p([1, 9, 5, 9, 5, 12, 2, 13, 1, 13], K.gunL);
    g.r(5, 8, 14, 12, K.white);
    g.r(6, 10, 13, 10, K.purple, 'flat');
    g.p([14, 7, 18, 5, 21, 6, 21, 15, 18, 16, 14, 13], K.dark);
    g.r(17, 7, 17, 14, K.purple, 'flat'); g.r(19, 7, 19, 14, K.purple, 'flat'); g.s(19, 10, 0xffffff); g.s(17, 11, 0xffd0ff);
    g.r(9, 13, 11, 14, K.purple, 'glow');
    g.p([6, 12, 8, 12, 7, 16, 5, 16], K.gun);
  },
  hairpyn(g) {  // slim pistol with integrated suppressor
    g.r(5, 9, 12, 10, K.silver);
    g.r(12, 9, 19, 10, K.dark, 'cylH');
    g.p([5, 11, 9, 11, 8, 16, 5, 16], K.woodD);
    g.dots([9, 12, 10, 13, 10, 12], K.ink); g.s(9, 11, K.gun);
  },
  burleta(g) {  // open-slide service pistol
    g.r(5, 8, 16, 10, K.silver);
    for (let x = 10; x <= 14; x++) g.s(x, 8, -1);
    g.r(10, 8, 15, 8, K.gun, 'flat');
    g.s(16, 7, K.gun);
    g.r(6, 11, 13, 11, K.dark, 'flat');
    g.p([5, 11, 9, 11, 9, 17, 5, 17], K.dark);
    g.r(6, 12, 7, 16, K.wood, 'flat');
    g.pl([9, 12, 9, 13, 12, 13, 12, 12], K.dark);
  },
  venattor(g) { // stacked double-barrel pistol
    g.r(4, 7, 17, 9, K.dark);
    g.r(5, 8, 16, 8, K.red, 'flat');
    g.r(9, 10, 17, 11, K.gun);
    g.s(17, 8, K.ink); g.s(17, 11, K.ink);
    g.p([5, 10, 9, 10, 8, 16, 4, 16], K.black);
    g.pl([9, 12, 9, 13, 11, 13], K.gun);
  },
  anvill(g) {   // heavy single-action revolver
    g.r(12, 8, 20, 9, K.steel, 'cylH'); g.r(12, 7, 19, 7, K.gunL, 'flat'); g.s(19, 6, K.gun);
    g.r(8, 8, 12, 11, K.steel, 'cylH'); g.dots([9, 9, 11, 9, 10, 10], K.gun);
    g.r(6, 8, 8, 11, K.gun);
    g.s(5, 7, K.gun); g.s(6, 7, K.gun);
    g.p([5, 11, 8, 11, 8, 13, 6, 17, 3, 17, 4, 13], K.wood);
    g.pl([8, 12, 8, 13, 10, 13, 10, 12], K.gun);
  },
  torrento(g) { // belt-fed LMG with ammo box, heat shield, carry handle
    g.p([1, 9, 6, 9, 6, 12, 1, 13], K.oliveD);
    g.r(6, 8, 13, 12, K.olive);
    g.r(6, 7, 12, 7, K.oliveL, 'flat');
    g.r(13, 6, 16, 6, K.dark); g.s(13, 7, K.dark); g.s(16, 7, K.dark);
    g.r(13, 9, 18, 11, K.gun); for (let x = 14; x <= 17; x += 2) g.s(x, 10, K.ink);
    g.r(18, 10, 22, 10, K.steel, 'flat'); g.s(22, 9, K.gun);
    g.r(17, 12, 21, 12, K.dark, 'flat');
    g.r(8, 13, 12, 17, K.oliveL); g.r(8, 13, 12, 13, K.oliveD, 'flat');
    g.s(12, 12, K.brass); g.s(13, 12, K.brass);
    g.p([6, 13, 8, 13, 7, 16, 5, 16], K.dark);
  },
  ospray(g) {   // scoped bolt-action sniper
    g.p([1, 9, 10, 9, 10, 11, 6, 12, 2, 14, 1, 14], K.tan);
    g.r(1, 9, 1, 14, K.rubber, 'flat');
    g.dots([3, 11, 5, 10, 7, 11], K.olive);
    g.r(10, 9, 13, 10, K.dark);
    g.r(13, 9, 22, 9, K.gun, 'flat'); g.r(21, 8, 22, 10, K.dark);
    g.r(7, 6, 15, 7, K.black); g.r(15, 5, 16, 7, K.black); g.r(6, 6, 7, 7, K.black); g.s(16, 6, K.glass);
    g.s(9, 8, K.dark); g.s(13, 8, K.dark);
    g.s(12, 11, K.steel); g.s(13, 12, K.chrome);
    g.r(10, 11, 11, 12, K.dark);
  },
  jupitor(g) {  // energy railgun sniper: twin rails, coil rings
    g.p([1, 9, 4, 9, 4, 12, 1, 13], K.gunL);
    g.r(4, 8, 13, 12, K.white);
    g.r(12, 8, 22, 8, K.gun, 'flat'); g.r(12, 11, 22, 11, K.gun, 'flat');
    g.r(13, 9, 22, 10, 0x2a7aa0, 'flat'); g.r(13, 9, 21, 9, K.cyan, 'flat');
    for (const x of [14, 17, 20]) g.r(x, 7, x, 12, K.cyan, 'flat');
    g.r(6, 6, 10, 7, K.dark); g.s(10, 6, K.cyan);
    g.r(7, 13, 9, 15, K.cyan, 'glow');
    g.p([5, 12, 7, 12, 6, 15, 4, 15], K.gun);
  },
  raskal(g) {   // break-action grenade launcher: fat short tube, wooden stock
    g.p([1, 10, 8, 9, 8, 12, 4, 13, 1, 15], K.woodL);
    g.r(1, 10, 1, 15, K.woodD, 'flat');
    g.r(8, 9, 10, 12, K.oliveD);
    g.r(10, 8, 20, 12, K.olive, 'cylH');
    g.r(19, 8, 20, 12, K.oliveD);
    g.r(12, 7, 13, 7, K.yellow, 'flat'); g.r(12, 6, 12, 6, K.dark, 'flat');
    g.r(11, 13, 14, 13, K.wood, 'flat');
    g.dots([8, 13, 9, 14], K.ink);
  },
  hullkracker(g) { // pump-action anti-armour launcher: big tube, hazard band
    g.p([1, 10, 5, 9, 5, 12, 1, 14], K.dark);
    g.r(5, 7, 21, 12, K.olive, 'cylH');
    g.r(20, 6, 22, 13, K.oliveD);
    for (let y = 7; y <= 12; y++) { g.s(17, y, (y & 1) ? K.yellow : K.black); g.s(18, y, (y & 1) ? K.black : K.yellow); }
    g.r(13, 13, 18, 14, K.dark); g.r(14, 13, 17, 13, K.gun, 'flat');
    g.p([7, 13, 9, 13, 8, 17, 6, 17], K.black);
    g.r(9, 5, 11, 6, K.dark); g.s(11, 5, K.arc);
    g.s(21, 9, K.ink); g.s(21, 10, K.ink);
  },
  equaliser(g) { // beam cannon: bulky body, glowing tank, twin prongs
    g.p([2, 8, 15, 7, 17, 8, 17, 14, 13, 15, 4, 15, 2, 13], K.gun);
    g.r(5, 4, 12, 6, K.purple, 'cylH'); g.r(4, 4, 4, 6, K.dark, 'flat'); g.r(13, 4, 13, 6, K.dark, 'flat');
    g.r(4, 9, 15, 10, K.white);
    g.r(17, 8, 21, 9, K.dark); g.r(17, 13, 21, 14, K.dark);
    g.r(17, 10, 22, 12, K.cyan, 'glow');
    g.p([6, 15, 8, 15, 7, 18, 5, 18], K.dark);
    g.r(10, 15, 12, 17, K.dark);
  },
};

// ======================================================================== bespoke items
export const ITEM_ART = {};
for (const [id, fn] of Object.entries(GUN_ART)) ITEM_ART[id] = (g) => { fn(g); g.centre(true, false); };

// ======================================================================== families
export const FAMILY_ART = {};

// generic fallback: a little crate/box tinted by id hash
export function fallbackArt(g, it, id, rnd) {
  const h = hashStr(id) % 360;
  const base = hue(0xa07848, h, 0.8);
  g.r(5, 7, 18, 18, base);
  g.r(5, 7, 18, 9, lt(base, 0.2));
  g.r(10, 7, 13, 18, dk(base, 0.2), 'flat');
}
