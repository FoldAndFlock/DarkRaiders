// Static look-development mockups built with the real engine modules.
import * as THREE from '../vendor/three.module.js';
import { Renderer, markEntity } from '../src/engine/renderer.js';
import { Lighting } from '../src/engine/lighting.js';
import { FX } from '../src/engine/fx.js';
import { VisionCones } from '../src/engine/cones.js';
import { World, mulberry } from '../src/engine/world.js';
import { RaiderModel, OUTFITS, arcMesh, propMesh } from '../src/engine/models.js';
import { GU } from '../src/engine/materials.js';
import { HUD } from '../src/ui/hud.js';
import { drawIcon } from '../src/ui/icons.js';

const params = new URLSearchParams(location.search);
const which = params.get('s') || 'dam';
const R = new Renderer(document.getElementById('gl'), { preserve: true });
const L = new Lighting(R.scene, R);
const fx = new FX(R.scene);
const cones = new VisionCones(R.scene, 64);
const hud = new HUD(document.getElementById('hud'));
hud.icons = drawIcon;
hud.resize(R.scale);

const actors = [];   // {model, x, z, facing, moving}
const arcs = [];     // {mesh, x, y, z, facing, cone:{half,range,state}, kind}
function raider(outfit, gun, x, z, facing, opts = {}) {
  const m = new RaiderModel(outfit, gun);
  m.root.position.set(x, 0, z);
  m.update(0.3, !!opts.moving, facing, 1, !!opts.crouch);
  if (opts.moving) m.update(0.05, true, facing);
  R.scene.add(m.root);
  const a = { m, x, z, facing, ...opts }; actors.push(a);
  markEntity(R, m.root, opts.team ? opts.team : 0x100c0c, !!opts.team);
  return a;
}
function arc(kind, x, y, z, facing, cone) {
  const mesh = arcMesh(kind);
  mesh.position.set(x, y, z); mesh.rotation.y = facing;
  R.scene.add(mesh);
  markEntity(R, mesh, 0x140808, false);
  const a = { mesh, kind, x, y, z, facing, cone }; arcs.push(a); return a;
}
function prop(world, kind, x, z, rot = 0, solid) { world.prop(kind, x, z, rot, { solid }); }

// --------------------------------------------------------------------------------------------
const SCENES = {};

SCENES.dam = () => {
  L.set('dusk', 'rain');
  const W = new World(R.scene, 96, 72, { base: 'grass' });
  const r = mulberry(4);
  W.paintFn((x, z) => (Math.sin(x * 0.13) + Math.cos(z * 0.21) + r() * 0.6 > 1.2 ? 'mud' : null));
  W.paint('damConcrete', 0, 6, 96, 17);
  W.paint('gravel', 20, 17, 76, 21);
  // the dam: tall concrete wall + spillway gates
  W.block(0, 6, 96, 12, 7.5, 'damConcrete', { seed: 2 });
  for (let i = 0; i < 6; i++) W.block(26 + i * 8, 12, 29 + i * 8, 14, 3.8, 'metalPanel');
  W.block(0, 2, 96, 6, 9.0, 'damConcrete', { seed: 3 });
  // channel of shallow water running SW
  W.raiseRect(44, 14, 56, 72, -0.7, 1.5); W.water(44, 14, 56, 72, { level: -0.1 });
  W.raiseRect(56, 46, 96, 58, -0.7, 1.5); W.water(56, 46, 96, 58, { level: -0.1 }); W.paint('rock', 56, 44, 96, 46); W.paint('rock', 56, 58, 96, 60);
  W.paint('rock', 42, 14, 44, 72); W.paint('rock', 56, 14, 58, 46);
  // pump house (player inside)
  W.building({ x: 30, z: 28, w: 10, d: 8, h: 3.4, wall: 'concrete', floor: 'tiles', roof: 'corrugated', doors: [{ side: 's', at: 3.5, w: 1.6 }, { side: 'e', at: 3, w: 1.4, sill: 1.0 }] });
  // control annex east of channel (peekable)
  W.building({ x: 59, z: 25, w: 13, d: 10, h: 3.6, wall: 'brick', floor: 'wood', roof: 'roofTar', doors: [{ side: 's', at: 2, w: 1.6 }, { side: 'w', at: 4, w: 1.5 }, { side: 's', at: 9, w: 2.4, sill: 1.0 }], inner: [[7, 0, 7, 6, [{ at: 3, w: 1.4 }]]] });
  // props
  prop(W, 'shelf', 33, 28.6, 0, [0.8, 0.25, 2]); prop(W, 'workbench', 37, 33.5, Math.PI, [0.8, 0.4, 0.9]);
  prop(W, 'lootCrate', 31.5, 34.5, 0, [0.5, 0.35, 0.6]); prop(W, 'barrelBlue', 38.6, 29.4, 0, [0.3, 0.3, 0.9]);
  prop(W, 'shelf', 62, 25.6, 0, [0.8, 0.25, 2]); prop(W, 'arcCrate', 69, 27.5, 0.3, [0.4, 0.4, 0.6]); prop(W, 'crate', 61, 32.5, 0.2, [0.5, 0.5, 0.8]);
  prop(W, 'crate', 70.5, 33, 0, [0.5, 0.5, 0.8]); prop(W, 'workbench', 66.5, 27, 0, [0.8, 0.4, 0.9]);
  prop(W, 'car', 24, 44, 0.6, [1.2, 2, 1.2]); prop(W, 'sandbag', 36, 40, 0, [1, 0.3, 0.6]); prop(W, 'sandbag', 41, 41, 0.4, [1, 0.3, 0.6]);
  prop(W, 'pine', 14, 30, 0); prop(W, 'pine', 18, 38, 1); prop(W, 'pine', 10, 46, 2); prop(W, 'tree', 82, 40, 0); prop(W, 'pine', 88, 30, 1);
  prop(W, 'bush', 26, 38, 0); prop(W, 'bush', 60, 40, 1); prop(W, 'rock', 47, 40, 0.5, [1, 0.8, 0.8]); prop(W, 'rock', 52, 28, 2, [1, 0.8, 0.8]);
  prop(W, 'husk', 28, 52, 0.4, [1.5, 1.2, 0.8]); prop(W, 'barrel', 22, 48, 0, [0.3, 0.3, 0.9]); prop(W, 'barrel', 23, 49, 0, [0.3, 0.3, 0.9]);
  prop(W, 'lamp', 41.5, 37, 0); prop(W, 'lamp', 60, 35, 0); prop(W, 'pipe', 70, 20, 0);
  prop(W, 'debris', 34, 46, 0); prop(W, 'deadTree', 58, 62, 0);
  W.finalize();
  // actors
  const me = raider(OUTFITS.scav, 'rifle', 36.5, 33.2, 2.2);
  raider(OUTFITS.teal, 'smg', 36.5, 39, 2.4, { moving: true });
  raider(OUTFITS.red, 'shotgun', 50, 44, 0.3, { moving: true }); // wading teammate
  const wasp = arc('wasp', 47, 2.2, 49, -2.4, { half: 0.42, range: 12, state: 'alert' });
  arc('tick', 41, 0, 50, -2.8, { half: 0.9, range: 5, state: 'search' });
  arc('wasp', 70, 2.4, 46, -1.0, { half: 0.42, range: 12, state: 'idle' });
  arc('hornet', 92, 2.6, 36, -1.8, { half: 0.4, range: 14, state: 'search' });   // off-screen east
  // muzzle flash + tracers from teammate toward wasp
  const t = actors[1];
  fx.tracers.add(t.x + 0.6, 1.1, t.z + 0.3, wasp.x, 2.2, wasp.z, 0xffe0a0, 1);
  fx.tracers.add(t.x + 0.6, 1.1, t.z + 0.3, wasp.x + 0.7, 2.0, wasp.z - 0.4, 0xffe0a0, 1);
  fx.tracers.add(wasp.x - 0.3, 2.0, wasp.z - 0.2, 50.4, 1.0, 44.2, 0xff6040, 1);
  const pre = (dt) => {
    fx.fire(24.6, 0.9, 44.4, 3, 1.0); fx.fire(23.4, 0.7, 43.8, 2, 0.8);
    if (Math.random() < 0.5) fx.smoke(24, 1.2, 44, 1, true, 1);
    if (Math.random() < 0.3) fx.ripples.add(50 + (Math.random() - .5), 44.4 + (Math.random() - .5) * .4, 0.03, 0.8, 1.2);
  };
  const lights = () => {
    L.light(24.2, 1.6, 44.2, 0xff7a20, 2.89, 12, 3);
    L.light(t.x + 0.9, 1.2, t.z + 0.4, 0xffe0a0, 2.22, 7, 2);
    L.light(41.5, 4.0, 37.5, 0xffd8a0, 1.56, 9, 1); L.light(60, 4.0, 35.5, 0xffd8a0, 1.56, 9, 1);
    L.light(wasp.x, 2.2, wasp.z, 0xff3a1a, 0.89, 4, 1);
    L.light(70, 2.2, 46, 0xff3a1a, 0.44, 3, 1);
    L.light(35, 2.8, 31, 0xc8e0ff, 0.67, 8, 2);   // interior work light
    fx.muzzle(t.x + 0.7, 1.1, t.z + 0.35, 0.6, 0.7);
    fx.sparks(wasp.x, 2.2, wasp.z, 6);
  };
  return {
    world: W, me, center: [47, 37], lights, pre,
    hud: {
      raid: { map: 'Damn Grounds', time: 1243, condition: 'ELECTROMAGNETIC STORM', weather: 'DUSK  RAIN  WIND NE' },
      player: { name: 'NOVA', level: 14, hp: 82, hpMax: 100, shield: 34, shieldMax: 60, stamina: 0.7, weight: 18.4, weightMax: 30 },
      weapon: { name: 'Rattler', tier: 'II', rarity: 'common', mag: 18, reserve: 54, mode: 'AUTO', alt: 'Kettle' },
      quick: [{ icon: 'bandage', count: 3 }, { icon: 'shieldRecharger', count: 2, active: true }, { icon: 'grenade', count: 1 }, { icon: 'adrenaline', count: 1 }],
      team: [{ name: 'KESTREL', color: '#30c0c0', hp: 0.65 }, { name: 'MOTH', color: '#e84a30', hp: 0.4 }],
      objectives: [{ text: 'Find 3 Wasp Drivers', done: false }, { text: 'Search the Pump House', done: true }, { text: 'Extract: Water Tower', done: false }],
      feed: [{ text: 'KESTREL damaged WASP', ttl: 1, color: '#f0c030' }],
      prompt: { text: 'SEARCH  Rusted Toolbox', key: 'E', progress: 0.45 },
      chat: { lines: [{ from: 'MOTH', text: 'wasp on me, south', ttl: 1, color: '#e84a30' }, { from: 'KESTREL', text: 'got it. tick behind you', ttl: 1, color: '#30c0c0' }], teamCount: 2 },
      crosshair: { x: 0.62, y: 0.6, spread: 3 },
      compassMarks: [{ bearing: 2.6, color: '#68e088' }, { bearing: 1.9, color: '#e84a30' }],
    },
    markers: [{ x: 50, y: 0, z: 63, label: 'EXTRACT', sub: 'WATER TOWER 210M', color: '#68e088' }],
  };
};

SCENES.city = () => {
  L.set('noon', 'sandstorm');
  const W = new World(R.scene, 96, 72, { base: 'sand' });
  const r = mulberry(9);
  W.paintFn((x, z) => { const n = Math.sin(x * 0.09 + z * 0.05) + Math.sin(z * 0.17) * 0.6 + r() * 0.3; return n > 1.0 ? 'sandDark' : null; });
  W.paint('asphalt', 0, 30, 96, 38);          // half-buried street
  W.paintFn((x, z) => (z > 30 && z < 38 && Math.sin(x * 0.4) + r() * 1.4 > 1.2 ? 'sand' : null));
  // buried apartment blocks: tall walls, most of them half under dunes
  W.building({ x: 10, z: 12, w: 16, d: 14, h: 6.5, wall: 'plaster', floor: 'tiles', roof: 'roofTile', doors: [{ side: 's', at: 6, w: 2 }, { side: 's', at: 11, w: 2.2, sill: 1 }, { side: 'e', at: 5, w: 2.4, sill: 1 }], inner: [[8, 0, 8, 9, [{ at: 6, w: 1.4 }]]], tint: 0xffe8d0 });
  W.building({ x: 34, z: 14, w: 12, d: 12, h: 4, wall: 'plaster', floor: 'wood', roof: 'roofTar', doors: [{ side: 's', at: 4, w: 1.8 }], seed: 4 }); // player inside
  W.building({ x: 56, z: 8, w: 20, d: 16, h: 9, wall: 'brick', floor: 'tiles', roof: 'roofTar', doors: [{ side: 's', at: 8, w: 3 }] });
  W.building({ x: 14, z: 44, w: 14, d: 12, h: 5, wall: 'plaster', floor: 'tiles', roof: 'roofTile', doors: [{ side: 'n', at: 5, w: 2 }], seed: 6 });
  W.building({ x: 60, z: 44, w: 18, d: 14, h: 4, wall: 'plaster', floor: 'wood', roof: 'roofTar', doors: [{ side: 'n', at: 3, w: 2 }, { side: 'w', at: 6, w: 2 }], seed: 7 });
  // dunes swallowing things: low sand mounds as blocks
  W.paintCircle('sand', 30, 24, 4, 0.3, 2); W.paintCircle('sandDark', 50, 27, 3, 0.4, 5); W.paintCircle('sand', 84, 28, 5, 0.3, 7);
  prop(W, 'car', 24, 34, 1.4, [2, 1, 1.2]); prop(W, 'car', 70, 33, 1.7, [2, 1, 1.2]); prop(W, 'car', 44, 35, 1.3, [2, 1, 1.2]);
  prop(W, 'cactus', 50, 20, 0); prop(W, 'cactus', 88, 18, 1); prop(W, 'deadTree', 6, 34, 0); prop(W, 'deadTree', 90, 50, 1);
  prop(W, 'lamp', 30, 29.5); prop(W, 'lamp', 62, 29.5); prop(W, 'debris', 52, 40); prop(W, 'debris', 36, 30);
  prop(W, 'shelf', 37, 14.6, 0, [0.8, 0.25, 2]); prop(W, 'crate', 43.5, 17, 0, [0.5, 0.5, 0.8]); prop(W, 'lootCrate', 36, 23, 0, [0.5, 0.35, 0.6]);
  prop(W, 'shelf', 12, 12.6, 0, [0.8, 0.25, 2]); prop(W, 'crate', 22, 16, 0.3, [0.5, 0.5, 0.8]); prop(W, 'arcCrate', 24, 22, 0, [0.4, 0.4, 0.6]);
  prop(W, 'husk', 80, 38, 2.1, [1.5, 1.2, 0.8]); prop(W, 'antenna', 74, 12); prop(W, 'sandbag', 48, 30, 0, [1, 0.3, 0.6]);
  W.finalize();
  const me = raider(OUTFITS.khaki, 'heavy', 41, 24, 2.5);
  raider(OUTFITS.bot, 'rifle', 64, 39, -2.2, { moving: true });       // hostile raider bot
  const leaper = arc('leaper', 52, 0, 40, -0.6, { half: 0.7, range: 11, state: 'alert' });
  arc('pop', 47, 0, 33, -1.2, { half: 1.2, range: 4, state: 'search' }); arc('pop', 45.5, 0, 31.5, -1.3, null);
  arc('surveyor', 84, 0, 20, -1.6, { half: 0.25, range: 18, state: 'scan' });
  arc('snitch', 26, 3.0, 38, 0.8, { half: 0.6, range: 10, state: 'idle' });
  arc('sentinel', 66, 9.3, 14, 0.5, { half: 0.12, range: 30, state: 'search' });
  // explosion aftermath on the street + fireball
  let frame = 0;
  const pre = () => {
    if (++frame === 146) fx.explosion(48.5, 0.2, 37, 2.2);
    fx.fire(45, 0.6, 35.5, 3, 1.2); if (Math.random() < 0.6) fx.smoke(45, 0.8, 35.5, 1, true, 1.2);
    fx.dust(52 + (Math.random() - .5) * 2, 40 + (Math.random() - .5) * 2, 0xc0a070);
  };
  const lights = () => {
    L.light(45, 1.5, 35.5, 0xff8a30, 2.44, 10, 3);
    L.light(48.5, 1.2, 37, 0xfff0c0, 3.33, 9, 4); // fresh blast
    L.light(leaper.x, 1.4, leaper.z, 0xff3a1a, 0.56, 4, 1);
  };
  return {
    world: W, me, center: [44, 29], lights, pre,
    hud: {
      raid: { map: 'Sandy City', time: 342, condition: 'BURIED CACHE UNCOVERED', weather: 'NOON  SANDSTORM' },
      player: { name: 'NOVA', level: 22, hp: 46, hpMax: 100, shield: 0, shieldMax: 80, stamina: 0.3, weight: 31.2, weightMax: 30 },
      weapon: { name: 'Ferro', tier: 'III', rarity: 'common', mag: 1, reserve: 14, mode: 'BOLT', alt: 'Stitcher' },
      quick: [{ icon: 'bandage', count: 1 }, { icon: 'shieldRecharger', count: 0 }, { icon: 'smoke', count: 2, active: true }, { icon: 'key', count: 1 }],
      objectives: [{ text: 'Loot the Grand Bazaar', done: false }, { text: 'Destroy a Leaper', done: false }],
      feed: [{ text: 'LEAPER IS HUNTING YOU', ttl: 1, color: '#e84a30' }, { text: '+40 XP  Pop destroyed', ttl: 0.6, color: '#f0c030' }],
      crosshair: { x: 0.6, y: 0.68, spread: 6, hit: true },
      compassMarks: [{ bearing: 0.4, color: '#68e088' }],
    },
    markers: [{ x: 84, y: 1.6, z: 20, label: 'SURVEYOR', sub: 'HIGH VALUE', color: '#58c8f0' }],
  };
};

SCENES.gate = () => {
  L.set('night', 'fog');
  const W = new World(R.scene, 96, 72, { base: 'forest' });
  W.noiseHills(2.5, 30, 5, (x, z) => (Math.abs(x - 44) < 14 || (z > 14 && z < 50 && x > 12 && x < 66)) ? 0 : 1);
  W.raiseRect(70, 0, 96, 30, 5, 6, 'max');
  const r = mulberry(21);
  W.paintFn((x, z) => (Math.sin(x * 0.2) * Math.cos(z * 0.15) + r() * 0.5 > 0.7 ? 'moss' : null));
  W.paint('asphalt', 40, 0, 48, 72); W.paint('gravel', 38, 0, 40, 72); W.paint('gravel', 48, 0, 50, 72);
  W.paint('concrete', 26, 18, 62, 30);
  // the gate: huge concrete pylons with a green steel gate between
  W.block(30, 20, 38, 26, 10, 'damConcrete', { seed: 8 }); W.block(50, 20, 58, 26, 10, 'damConcrete', { seed: 9 });
  W.block(38, 21.5, 50, 23, 7, 'metalPanel', { tint: 0x7aa070, y0: 2.6, collide: false });
  W.block(38, 21.5, 50, 23, 0.6, 'hazard', { collide: false });
  W.block(26, 21, 30, 25, 3, 'concrete'); W.block(58, 21, 62, 25, 3, 'concrete');
  // checkpoint booth (player inside), barracks (peek)
  W.building({ x: 52, z: 32, w: 7, d: 6, h: 3, wall: 'concrete', floor: 'tiles', roof: 'corrugated', doors: [{ side: 'w', at: 2, w: 1.4 }, { side: 's', at: 2, w: 3, sill: 1.0 }] });
  W.building({ x: 18, z: 36, w: 16, d: 9, h: 3.4, wall: 'metalPanel', floor: 'wood', roof: 'corrugated', doors: [{ side: 'e', at: 3, w: 1.6 }, { side: 's', at: 4, w: 2, sill: 1 }, { side: 's', at: 10, w: 2, sill: 1 }], tint: 0xa8c0a0 });
  for (let i = 0; i < 26; i++) { const x = r() * 96, z = r() * 72; if (Math.abs(x - 44) < 12 || (z > 16 && z < 48 && x > 14 && x < 64)) continue; prop(W, r() < 0.7 ? 'pine' : 'tree', x, z, r() * 6, [0.4, 0.4, 3]); }
  for (let i = 0; i < 14; i++) prop(W, 'bush', r() * 96, 50 + r() * 22, r() * 6);
  prop(W, 'lamp', 37, 30); prop(W, 'lamp', 51, 30); prop(W, 'sandbag', 40, 33, 0, [1, 0.3, 0.6]); prop(W, 'sandbag', 46, 34, 0, [1, 0.3, 0.6]);
  prop(W, 'lootCrate', 57.5, 33.4, 0, [0.5, 0.35, 0.6]); prop(W, 'shelf', 20, 36.6, 0, [0.8, 0.25, 2]); prop(W, 'workbench', 28, 38.5, 0, [0.8, 0.4, 0.9]);
  prop(W, 'extractPad', 44, 56, 0); prop(W, 'car', 43, 44, 0.1, [1, 2, 1.2]); prop(W, 'husk', 66, 46, 0.6, [1.5, 1.2, 0.8]);
  prop(W, 'rock', 70, 34, 0, [1, 0.8, 0.8]); prop(W, 'rock', 12, 54, 2, [1, 0.8, 0.8]);
  W.finalize();
  const me = raider(OUTFITS.teal, 'smg', 45.5, 52, 2.3);
  const mate = raider(OUTFITS.red, 'energy', 41, 49, 2.6, { moving: true });
  raider(OUTFITS.bot, 'rifle', 72, 54, -2.4, {});
  const sent = arc('turret', 34, 10, 23, 0.4, { half: 0.12, range: 26, state: 'idle' });
  const bas = arc('bastion', 27, 0, 50, 1.2, { half: 0.55, range: 16, state: 'search' });
  arc('wasp', 62, 2.4, 40, -1.4, { half: 0.42, range: 12, state: 'idle' });
  arc('rocketeer', 66, 3.8, 56, -1.7, { half: 0.5, range: 18, state: 'alert' });
  const lights = () => {
    L.light(37, 4.0, 30.5, 0xb0d0ff, 1.78, 11, 2); L.light(51, 4.0, 30.5, 0xb0d0ff, 1.78, 11, 2);
    L.light(44, 0.6, 56, 0x40ff80, 1.56, 9, 3);  // extract pad beacon
    L.light(bas.x, 2.6, bas.z + 2, 0xff3a1a, 1.11, 6, 1); L.light(sent.x, 10.6, sent.z + 0.6, 0xff3a1a, 0.67, 5, 1);
    L.light(66, 3.8, 56, 0xffa020, 0.89, 6, 1);
    // flashlights
    L.spot(me.x, 1.4, me.z, me.facing, 0.42, 0xfff2d8, 3.2, 16, 3);
    L.spot(mate.x, 1.4, mate.z, mate.facing, 0.42, 0xfff2d8, 3.0, 16, 2);
    L.light(mate.x + 0.6, 1.1, mate.z + 0.3, 0x50c8ff, 1.78, 6, 2);
    fx.tracers.add(mate.x + 0.6, 1.1, mate.z + 0.4, 66, 3.8, 56, 0x60d8ff, 1);
    fx.tracers.add(66, 3.8, 56, 46.5, 0.6, 53, 0xffa060, 1);
  };
  const pre = () => { if (Math.random() < 0.3) fx.fire(44, 0.2, 56, 1, 2.4); };
  return {
    world: W, me, center: [47, 44], lights, pre,
    hud: {
      raid: { map: 'Green Gate', time: 1615, condition: 'NIGHT RAID', weather: 'NIGHT  FOG' },
      player: { name: 'NOVA', level: 31, hp: 100, hpMax: 100, shield: 80, shieldMax: 80, stamina: 1, weight: 22, weightMax: 35 },
      weapon: { name: 'Stitcher', tier: 'IV', rarity: 'uncommon', mag: 30, reserve: 120, mode: 'AUTO', alt: 'Jupiter' },
      quick: [{ icon: 'bandage', count: 5 }, { icon: 'shieldRecharger', count: 3 }, { icon: 'grenade', count: 2 }, { icon: 'adrenaline', count: 2 }],
      team: [{ name: 'MOTH', color: '#e84a30', hp: 0.9 }],
      objectives: [{ text: 'Unlock the Locked Gate', done: false }],
      chat: { lines: [{ from: 'MOTH', text: 'rocketeer east. pad is hot', ttl: 1, color: '#e84a30' }], teamCount: 1, open: true, input: 'ok popping smoke on the pad' },
      crosshair: { x: 0.74, y: 0.83, spread: 2 },
      compassMarks: [{ bearing: 3.1, color: '#68e088' }],
      banner: { text: 'EXTRACTION CALLED', sub: 'Elevator arrives in 0:24 - hold the pad', color: '#68e088', y: 0.12 },
    },
    markers: [],
  };
};

// --------------------------------------------------------------------------------------------
const sc = SCENES[which]();
const [cx, cz] = sc.center;
R.center.set(cx, cz);
// pre-simulate weather/fx so the frame is "mid-action"
const ripple = (x, z) => { if (sc.world.grid.waterAt(x, z)) fx.ripples.add(x, z, 0.03, 0.22, 0.6, 0.7); else if (Math.random() < 0.3) fx.splash(x, z); };
fx.rain.intensity = L.weather.rain;
fx.rain.wind.copy(GU.uWind.value);
const dt = 1 / 30;
for (let i = 0; i < 150; i++) {
  sc.pre && sc.pre(dt);
  if (L.weather.sand && Math.random() < 0.9) for (let k = 0; k < 6; k++) fx.parts.emit({ x: cx + (Math.random() - .5) * 50, y: Math.random() * 3, z: cz + (Math.random() - .5) * 36, vx: GU.uWind.value.x * 4, vy: 0, vz: GU.uWind.value.y * 4, life: 1.2, size: 1, color: 0xd8c090, alpha: 0.9 });
  // wading ripples around actors standing in water
  for (const a of actors) if (sc.world.grid.waterAt(a.x, a.z) && i % 8 === 0) fx.ripples.add(a.x, a.z, 0.03, 1.1, 1.4);
  fx.rain.update(dt, cx, cz, R.viewW, R.viewH, ripple);
  fx.update(dt);
  GU.uTime.value += dt;
}
sc.lights();
cones.groundAt = (x, z) => sc.world.groundAt(x, z);
const GAZE = { idle: 0xffc838, search: 0xff7a18, alert: 0xff2010, scan: 0x50c0ff };
for (const a of arcs) {
  if (!a.cone) continue;
  const eye = sc.world.groundAt(a.x, a.z) + Math.max(1.0, a.y);
  cones.add(sc.world.grid, a.x, a.z, a.facing, a.cone.half, a.cone.range, a.cone.state, 0.2, eye);
  L.spot(a.x, eye, a.z, a.facing, a.cone.half, GAZE[a.cone.state], a.cone.state === 'alert' ? 2.2 : 1.6, a.cone.range, 2, true, 0.85);
}
cones.update(0.4);
fx.update(0.001);
for (let i = 0; i < 20; i++) sc.world.update(0.25, sc.me.x, sc.me.z);
L.update(dt, cx, cz, R.viewW, R.viewH);
R.render(dt);

// HUD
const H = sc.hud;
if (H.crosshair) { H.crosshair.x *= R.cssW; H.crosshair.y *= R.cssH; }
// off-screen ARC indicators
H.offscreen = [];
for (const a of arcs) {
  const s = R.worldToScreen(a.x, a.y, a.z);
  if (s.x < 0 || s.y < 0 || s.x > R.cssW || s.y > R.cssH) {
    const d = Math.hypot(a.x - sc.me.x, a.z - sc.me.z);
    H.offscreen.push({ sx: s.x, sy: s.y, label: `${a.kind.toUpperCase()} ${Math.round(d)}M`, alert: a.cone && a.cone.state === 'alert' });
  }
}
H.markers = (sc.markers || []).map(m => { const s = R.worldToScreen(m.x, m.y, m.z); return { ...m, sx: s.x, sy: s.y }; });
hud.draw(H, 0);
window.__ready = true;
