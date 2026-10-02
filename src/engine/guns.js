// Per-weapon voxel gun models (one distinct model per weapon id in ITEMS).
//   gunModelGeo(itemId)  -> cached BufferGeometry (barrel along +z, origin at the grip / firing hand)
//   gunMuzzle(itemId)    -> [x, y, z] muzzle position in model space (metres), for flashes / tracers
//   GUN_MODEL_IDS        -> ids with a bespoke model
// Each model is a side profile: a char grid whose columns run from the butt (z = 0) to the muzzle and
// whose rows run top -> bottom. Every char maps to [colour, width-in-voxels, glow]; widths are
// extruded symmetrically around the gun's centre plane (x = 0). Voxels are 6 cm, so a 15-column rifle
// is 0.9 m long and a 6-column pistol 0.36 m.
import { Vox } from './voxel.js';
import { ITEMS } from '../data/items.js';

export const GUN_VOXEL = 0.06;
const GLOW = true;
const LEGEND = {
  b: [0x8a8e98, 1], B: [0x3e4048, 1], l: [0xc0c4cc, 2], L: [0xc0c4cc, 3],
  r: [0x3e4048, 2], R: [0xa83828, 2], k: [0x24242a, 2], K: [0x5a5e68, 1], z: [0x24242a, 3],
  w: [0x7a4a28, 2], W: [0xa06a3a, 2], v: [0x7a4a28, 1], n: [0x8a3a22, 2],
  o: [0x4e5e34, 2], O: [0x6e7e48, 2], Z: [0x56663a, 3],
  t: [0x9a8660, 2], T: [0xb8a476, 2], u: [0x26262a, 2],
  y: [0xc89a38, 2], g: [0x2c2c32, 1], m: [0x34343c, 1], s: [0x2c2c32, 1], M: [0x34343c, 2],
  e: [0xd8d6cc, 2], E: [0xd8d6cc, 3], q: [0x4a4c56, 2], Q: [0x4a4c56, 3], h: [0xe8c040, 3], H: [0xe8c040, 2],
  c: [0x5ae0ff, 1, GLOW], C: [0x5ae0ff, 2, GLOW], j: [0x5ae0ff, 3, GLOW],
  p: [0xb060f0, 1, GLOW], P: [0xb060f0, 2, GLOW], i: [0xb060f0, 3, GLOW],
  a: [0xf08a28, 2, GLOW], A: [0xf08a28, 1, GLOW], X: [0xff3a1a, 1, GLOW],
};

// grip: [column, row] of the top grip voxel (the hand); the origin sits on top of it
export const GUN_MODELS = {
  kettel: { grip: [6, 3], rows: [ // cheap wooden semi-auto carbine
    '......KKr....s.',
    'WWWW..rrrbbbbbb',
    'wwwwwwrrrwwwwb.',
    'www...gmm......',
    '......g.m......',
  ] },
  rattlr: { grip: [5, 3], rows: [ // wire stock, olive receiver, wooden handguard, curved mag
    'KKKKKoooo......',
    'K...Kooooowwwbb',
    'KKK..oooowww...',
    '.....g..mm.....',
    '....g....mm....',
  ] },
  arpeggo: { grip: [7, 4], rows: [ // tan bullpup with long carry handle
    '..TTTTTTTT...',
    '..T......T...',
    'uttttttttttbb',
    'uttttttttttt.',
    '.mm....g.....',
    '.mm...g......',
  ] },
  tempesta: { grip: [6, 4], rows: [ // modern black auto rifle, red dot, orange accents
    '.......X.......',
    '......kkkkkkk..',
    'kkkk..rrrrkkkbb',
    'kk.kkkrrrrkakk.',
    'k.....g.mm.....',
    '......g..mm....',
  ] },
  betina: { grip: [6, 3], rows: [ // heavy rifle: wood stock, olive steel, scope, long mag, brake
    '.......kkkk......',
    'WWWWW.oooooooobbk',
    'wwwwwwoooooOOOb.k',
    'www...g..mm......',
    '......g..mm......',
    '.........mm......',
  ] },
  ferrox: { grip: [6, 2], rows: [ // break-action single shot: silver action, very long barrel
    '......llbbbbbbbbbb',
    'WWWWWWllwwwww.....',
    'wwwww.g...........',
    'ww....g...........',
  ] },
  renegayde: { grip: [6, 2], rows: [ // lever action: brass receiver, tube magazine, lever loop
    '......yybbbbbbbbb',
    'WWWWWWyywwwwBBBBB',
    'wwwww.gK.........',
    'ww....KK.........',
  ] },
  afelion: { grip: [6, 4], rows: [ // white energy rifle with a glowing bolt channel
    '.......kkk......',
    '..eeeeeeeeeeee..',
    'eeeeeccccccccekk',
    'ee..eeeeeeeee...',
    '......g.CC......',
    '.....g..........',
  ] },
  stitchr: { grip: [5, 2], rows: [ // crude tube SMG, wire stock, long straight mag
    'KKKK.qqqqq..',
    'K..Kqqqqqqbb',
    'KKK..g.m....',
    '.....g.m....',
    '.......m....',
  ] },
  canta: { grip: [4, 2], rows: [ // compact SMG: curved mag, front sight hood, rubber handguard
    '....rrrrKs.',
    'kkkkrrrruub',
    'k...g.mm...',
    '....g..mm..',
  ] },
  bobkat: { grip: [4, 3], rows: [ // angular hyper-fast SMG
    '.....X.....',
    '.kkkqqqqq..',
    'kk..qqqaqqb',
    'k...g.qmqq.',
    '....g..m...',
    '.......m...',
    '.......a...',
  ] },
  el_torro: { grip: [6, 2], rows: [ // pump shotgun with a red wooden pump
    '......kkkbbbbbbbb',
    'WWWWWWkkkBBnnnnBB',
    'wwwww.g..........',
    'ww....g..........',
  ] },
  volcano: { grip: [5, 3], rows: [ // semi-auto shotgun: red receiver, glowing heat vents
    '......kkkk......',
    'kkkkkRRRRRkakakk',
    'kk.kkRRRRRkkkkkk',
    'k....g.mm.......',
    '.....g.mm.......',
  ] },
  dolabre: { grip: [5, 4], rows: [ // energy shotgun with a wide axe-head emitter
    '...........zzzz',
    '....eeeeeeezizi',
    'eeeeePPPPPezizi',
    'ee..eeeeeeezizi',
    '.....g..p..zzzz',
    '....g..........',
  ] },
  hairpyn: { grip: [1, 1], rows: [ // slim pistol with integrated silencer
    'llllkkk',
    'gg.....',
    'g......',
  ] },
  burleta: { grip: [1, 1], rows: [ // service pistol, silver slide
    'llllll',
    'ggrr..',
    'gg....',
    'g.....',
  ] },
  venattor: { grip: [1, 2], rows: [ // stacked twin-barrel pistol
    'kRRRRk',
    'kkkkkk',
    'gg.kkk',
    'gg....',
    'g.....',
  ] },
  anvill: { grip: [1, 3], rows: [ // heavy revolver hand cannon
    's.....s',
    'rLLLbbb',
    'rLLL...',
    'vv.....',
    'v......',
  ] },
  torrento: { grip: [7, 3], rows: [ // belt-fed LMG: carry handle, ammo box, folded bipod
    '.......kkkk........',
    'ooooooOOOOOrrrrbbbb',
    'oooooOOOOOOrkrkb...',
    'oo.....g.ZZZ.......',
    '.......g.ZZZ..kkk..',
  ] },
  ospray: { grip: [7, 3], rows: [ // scoped bolt-action sniper
    '.....kkkkkkkkk......',
    'TTTTT...k...k.......',
    'tttttttrrrrrbbbbbbbk',
    'ttt....g.ml.........',
    '.......g............',
  ] },
  jupitor: { grip: [8, 4], rows: [ // energy railgun: twin rails with glowing coils
    '......kkkk............',
    '...eeeeeeeeeqjqqjqqjqq',
    'eeeeeeeeeeeecccccccccc',
    'ee..eeeeeeeeqjqqjqqjqq',
    '........g.CC..........',
    '.......g..............',
  ] },
  raskal: { grip: [5, 2], rows: [ // break-action grenade launcher: fat tube, wooden stock
    '......ZZZZZZZ',
    'WWWWWWZZZZZZZ',
    'wwww.g..ww...',
    'ww...g.......',
  ] },
  hullkracker: { grip: [5, 4], rows: [ // pump-action anti-armour launcher: big tube, hazard band
    '.......kk........',
    '....ZZZZZZZZhhZZz',
    'kkkkZZZZZZZZhhZZz',
    'kk..ZZZZZZZZhhZZz',
    '.....g...kkkk....',
    '.....g...........',
  ] },
  equaliser: { grip: [4, 5], rows: [ // beam cannon: glowing coolant tank, twin prongs
    '....iiiiiii.......',
    '..QQQQQQQQQQQQzz..',
    'QQEEEEEEEEEEEEQzzz',
    'QQQQQQQQQQQQQQQjjj',
    '..QQQQQQQQQQQQQzzz',
    '....g...m.........',
    '...g..............',
  ] },
};
export const GUN_MODEL_IDS = Object.keys(GUN_MODELS);

// weapons without a bespoke model fall back to a model of the same class
const CLASS_FALLBACK = { pistol: 'burleta', smg: 'stitchr', assault_rifle: 'rattlr', battle_rifle: 'ferrox', lmg: 'torrento', shotgun: 'el_torro', marksman: 'ospray', sniper: 'ospray', launcher: 'hullkracker', energy: 'equaliser' };
function resolve(id) {
  if (GUN_MODELS[id]) return id;
  const cls = ITEMS[id]?.weapon?.class;
  return CLASS_FALLBACK[cls] || 'kettel';
}

function build(spec) {
  const rows = spec.rows, H = rows.length, Lz = Math.max(...rows.map(r => r.length)), SX = 5, cx = 2;
  const [gz, grow] = spec.grip;
  const v = new Vox(SX, H, Lz, GUN_VOXEL, [SX / 2, H - grow, gz + 0.5]);
  rows.forEach((row, i) => {
    const y = H - 1 - i;
    for (let z = 0; z < row.length; z++) {
      const e = LEGEND[row[z]]; if (!e) continue;
      const [col, w, glow] = e;
      const x0 = cx - Math.floor((w - 1) / 2);
      for (let x = x0; x < x0 + w; x++) v.set(x, y, z, col);
      if (glow) v.glow(col);
    }
  });
  return v.build();
}

const geoCache = new Map();
export function gunModelGeo(itemId) {
  const id = resolve(itemId);
  let g = geoCache.get(id);
  if (!g) { g = build(GUN_MODELS[id]); geoCache.set(id, g); }
  return g;
}

export function gunMuzzle(itemId) {
  const spec = GUN_MODELS[resolve(itemId)], rows = spec.rows, H = rows.length, Lz = Math.max(...rows.map(r => r.length));
  const [gz, grow] = spec.grip;
  // the frontmost filled voxel wins; among those, the highest one
  for (let z = Lz - 1; z >= 0; z--) for (let i = 0; i < H; i++) if (LEGEND[rows[i][z]]) {
    return [0, (H - 1 - i + 0.5 - (H - grow)) * GUN_VOXEL, (z + 1 - (gz + 0.5)) * GUN_VOXEL];
  }
  return [0, 0, 0];
}
