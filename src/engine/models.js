// Voxel model library: raiders, ARC machines, props. All built procedurally.
import * as THREE from '../../vendor/three.module.js';
import { Vox } from './voxel.js';
import { litVox } from './materials.js';

const geoCache = new Map();
function cached(key, fn) { if (!geoCache.has(key)) geoCache.set(key, fn()); return geoCache.get(key); }
function mesh(geo, shadow = true) {
  const m = new THREE.Mesh(geo, litVox());
  m.castShadow = shadow; m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- RAIDER
export const OUTFITS = {
  scav: { jacket: 0xb08040, jacket2: 0x8a6430, pants: 0x4a4e44, accent: 0xf0a030, helmet: 0x7a7a68, visor: 0x9ae8f8, pack: 0x6a5434, skin: 0xd8a882, boots: 0x2e2622 },
  red: { jacket: 0xc8402a, jacket2: 0x9a2e20, pants: 0x34343a, accent: 0xf0e0b8, helmet: 0xe8e0c8, visor: 0x30302e, pack: 0x5a6a3e, skin: 0xb8865e, boots: 0x262224 },
  teal: { jacket: 0x2a8a8a, jacket2: 0x1e6666, pants: 0x4a4232, accent: 0xf8c838, helmet: 0x2e4444, visor: 0xffb048, pack: 0x8a6440, skin: 0xe0b896, boots: 0x2a2420 },
  khaki: { jacket: 0xb0a068, jacket2: 0x8a7c4e, pants: 0x585038, accent: 0x4a8ad8, helmet: 0x9a8a5a, visor: 0x58f0b0, pack: 0x46463e, skin: 0x9a6a4e, boots: 0x2e2a22 },
  violet: { jacket: 0x7a4aa8, jacket2: 0x5a3480, pants: 0x30303a, accent: 0x50e0e0, helmet: 0xd8d0e0, visor: 0xff60a0, pack: 0x4a4a3a, skin: 0xc89070, boots: 0x22222a },
  bot: { jacket: 0x6a6a72, jacket2: 0x4e4e56, pants: 0x2e2e32, accent: 0xd83830, helmet: 0x44444a, visor: 0xff5040, pack: 0x544838, skin: 0xb08868, boots: 0x1e1e20 },
  bot2: { jacket: 0x5a6a4a, jacket2: 0x44523a, pants: 0x3a3a30, accent: 0xe0a020, helmet: 0x4a5040, visor: 0xffd040, pack: 0x5a4a36, skin: 0xa07858, boots: 0x222018 },
  bot3: { jacket: 0x8a5a4a, jacket2: 0x6a4438, pants: 0x34302e, accent: 0x60b0f0, helmet: 0x5a5048, visor: 0x80ffe0, pack: 0x3e3a34, skin: 0xc09070, boots: 0x201c1a },
};
export const RAIDER_SCALE = 1.15;

export function raiderParts(o = OUTFITS.scav) {
  const key = 'raider2' + JSON.stringify(o);
  return cached(key, () => {
    // torso + head + backpack, pivot at hips (y=0), 0.07 m voxels, facing +z
    const t = new Vox(12, 16, 10, 0.07, [6, 0, 5.5]);
    t.box(2, 0, 2, 9, 1, 8, o.pants);                    // hips
    t.box(2, 1, 2, 9, 1, 8, 0x2a2420);                   // belt
    t.set(5, 1, 8, 0xb0a070).set(6, 1, 8, 0xb0a070);     // buckle
    t.box(2, 2, 2, 9, 7, 8, o.jacket);                   // torso
    t.box(2, 2, 2, 9, 3, 8, o.jacket2);                  // jacket hem
    t.box(1, 6, 3, 10, 7, 7, o.jacket);                  // shoulders
    t.box(3, 3, 8, 8, 6, 8, o.accent);                   // chest rig plate
    t.box(4, 4, 9, 5, 5, 9, o.jacket2); t.box(6, 4, 9, 7, 5, 9, o.jacket2);   // pouches
    t.box(1, 2, 1, 10, 7, 1, o.pack);                    // backpack
    t.box(2, 1, 0, 9, 8, 0, o.pack);
    t.box(3, 2, 0, 8, 3, 0, 0x2a2420);                   // pack strap
    t.box(2, 9, 0, 9, 9, 1, 0xa09a88);                   // bedroll
    t.set(1, 8, 1, o.accent).set(10, 8, 1, o.accent);
    t.box(4, 8, 3, 7, 8, 7, o.accent);                   // scarf / collar
    t.box(3, 9, 2, 8, 14, 8, o.helmet);                  // head / helmet
    t.box(3, 10, 8, 8, 11, 8, o.visor);                  // visor band
    t.box(4, 12, 8, 7, 12, 8, o.helmet);
    t.box(2, 10, 4, 2, 12, 6, o.accent); t.box(9, 10, 4, 9, 12, 6, o.accent);   // ear cups
    t.box(4, 15, 3, 7, 15, 6, o.helmet);                 // helmet top (rim-lit)
    t.set(5, 15, 7, o.accent);                           // helmet lamp
    t.glow(o.visor);
    const torso = t.build();
    // leg, pivot at hip (y=9 voxels)
    const l = new Vox(4, 9, 5, 0.07, [2, 9, 2.5]);
    l.box(0, 2, 1, 3, 8, 3, o.pants);
    l.box(0, 0, 0, 3, 1, 4, o.boots); l.box(0, 2, 4, 3, 2, 4, o.boots);
    l.box(0, 4, 3, 3, 5, 3, o.accent);                   // knee pad
    const leg = l.build();
    // arm
    const a = new Vox(3, 3, 8, 0.07, [1.5, 1.5, 0]);
    a.box(0, 0, 0, 2, 2, 5, o.jacket); a.box(0, 0, 6, 2, 2, 7, 0x2e2a26);   // glove
    a.box(0, 0, 3, 2, 2, 3, o.jacket2);
    const arm = a.build();
    return { torso, leg, arm };
  });
}

// generic gun model; length in voxels, colours
export function gunGeo(kind = 'rifle') {
  return cached('gun' + kind, () => {
    const specs = {
      rifle: { L: 9, body: 0x3a3a3a, acc: 0x7a5a3a, mag: 2 },
      smg: { L: 6, body: 0x2e3236, acc: 0x8a8a7a, mag: 2 },
      pistol: { L: 4, body: 0x3a3a3a, acc: 0x5a4a3a, mag: 1 },
      shotgun: { L: 9, body: 0x4a3a2a, acc: 0x2a2a2a, mag: 1 },
      sniper: { L: 12, body: 0x3a4232, acc: 0x2a2a2a, mag: 1 },
      heavy: { L: 10, body: 0x5a4a32, acc: 0x2a2a2a, mag: 2 },
      energy: { L: 11, body: 0xd8d0c0, acc: 0x40c0ff, mag: 0 },
      launcher: { L: 10, body: 0x3a4a3a, acc: 0xd8a020, mag: 0 },
    }[kind];
    const v = new Vox(3, 3, specs.L + 2, 0.1, [1.5, 1, 1]);
    v.box(1, 1, 0, 1, 1, specs.L, specs.body);            // barrel / body (points +z)
    v.box(0, 1, 0, 2, 2, Math.min(4, specs.L), specs.body);
    v.box(1, 0, 1, 1, 0, 1 + specs.mag, specs.acc);       // grip/mag
    if (kind === 'sniper') v.box(1, 2, 3, 1, 2, 7, 0x1a1a1a);
    if (kind === 'energy') { v.box(0, 2, 2, 2, 2, 8, specs.acc); v.glow(specs.acc); }
    if (kind === 'launcher') v.box(0, 0, 3, 2, 2, specs.L, specs.body).box(1, 1, specs.L, 1, 1, specs.L, 0x111111);
    v.box(1, 1, -1, 1, 1, -1, specs.acc);                 // stock
    return v.build();
  });
}

export class RaiderModel {
  constructor(outfit = OUTFITS.scav, gun = 'rifle') {
    const p = raiderParts(outfit);
    this.root = new THREE.Group();
    this.body = new THREE.Group(); this.body.scale.setScalar(RAIDER_SCALE);
    this.root.add(this.body);
    this.hips = new THREE.Group(); this.hips.position.y = 0.63;
    this.upper = new THREE.Group();
    this.torso = mesh(p.torso);
    this.legL = mesh(p.leg); this.legR = mesh(p.leg);
    this.legL.position.set(-0.13, 0.63, 0); this.legR.position.set(0.13, 0.63, 0);
    this.armGun = new THREE.Group(); this.armGun.position.y = 0.42;
    this.gunKind = gun;
    this.gun = mesh(gunGeo(gun));
    this.gun.position.set(0.12, 0.0, 0.26);
    this.armR = mesh(p.arm); this.armR.position.set(0.3, 0.02, 0.0); this.armR.rotation.y = -0.2;
    this.armL = mesh(p.arm); this.armL.position.set(-0.24, 0.0, 0.06); this.armL.rotation.y = 0.62;
    this.armGun.add(this.gun, this.armR, this.armL);
    this.upper.add(this.torso, this.armGun);
    this.hips.add(this.upper);
    this.body.add(this.hips, this.legL, this.legR);
    this.walk = 0; this.recoil = 0; this.lean = 0;
  }
  setGun(kind) {
    if (kind === this.gunKind) return;
    this.gunKind = kind;
    this.gun.geometry = gunGeo(kind || 'pistol');
    this.gun.visible = !!kind;
  }
  // facing: radians, 0 = +z (south / toward camera); aim pitch ignored (top-down)
  update(dt, moving, facing, speed = 1, crouch = false, moveDir = facing) {
    this.root.rotation.y = facing;
    if (moving) this.walk += dt * 9 * speed; else this.walk *= Math.pow(0.02, dt);
    // legs swing along the movement direction relative to facing (strafe/backpedal look right)
    const rel = Math.cos(moveDir - facing);
    const s = Math.sin(this.walk) * (moving ? 0.65 : 0) * (rel >= 0 ? 1 : -1);
    this.legL.rotation.x = s; this.legR.rotation.x = -s;
    const hipY = crouch ? 0.44 : 0.63;
    this.hips.position.y = hipY + Math.abs(Math.cos(this.walk)) * (moving ? 0.035 : 0);
    this.legL.position.y = this.legR.position.y = hipY;
    this.upper.rotation.x = crouch ? 0.22 : 0.05 * (moving ? 1 : 0);
    this.recoil = Math.max(0, this.recoil - dt * 10);
    this.armGun.position.z = -this.recoil * 0.08;
    this.armGun.rotation.x = -this.recoil * 0.25;
  }
  kick(a = 1) { this.recoil = Math.min(1.2, this.recoil + a); }
}

// ---------------------------------------------------------------- ARC
const ARC = { body: 0x3a3c42, plate: 0x5a5e66, dark: 0x202226, eye: 0xff2a10, hot: 0xffa020, rust: 0x8a5a34, white: 0xd8d4c8 };

function wasp() {
  const v = new Vox(14, 5, 14, 0.07, [7, 0, 7]);
  v.box(5, 1, 4, 8, 3, 9, ARC.body); v.box(5, 3, 5, 8, 3, 8, ARC.plate);
  v.box(6, 1, 10, 7, 2, 10, ARC.eye);                       // sensor eye (front +z)
  v.box(6, 0, 7, 7, 0, 9, ARC.dark);                        // gun
  for (const [x, z] of [[1, 1], [11, 1], [1, 11], [11, 11]]) {
    v.box(x, 2, z, x + 1, 2, z + 1, ARC.dark);              // rotor hub
    v.box(x - 1, 3, z + 0, x + 2, 3, z + 1, ARC.rust);       // blades
    v.box(x, 3, z - 1, x + 1, 3, z + 2, ARC.rust);
  }
  v.box(3, 2, 3, 10, 2, 3, ARC.dark); v.box(3, 2, 10, 10, 2, 10, ARC.dark);
  v.box(2, 2, 2, 2, 2, 11, ARC.dark); v.box(11, 2, 2, 11, 2, 11, ARC.dark);
  v.glow(ARC.eye);
  return v.build();
}
function hornet() {
  const v = new Vox(18, 7, 18, 0.08, [9, 0, 9]);
  v.box(6, 1, 4, 11, 4, 13, ARC.body); v.box(5, 2, 13, 12, 5, 14, ARC.plate);   // armoured front plate
  v.box(7, 3, 15, 10, 3, 15, ARC.eye); v.box(6, 0, 10, 7, 1, 16, ARC.dark); v.box(10, 0, 10, 11, 1, 16, ARC.dark);
  for (const [x, z] of [[1, 1], [14, 1], [1, 14], [14, 14]]) { v.box(x, 3, z, x + 2, 3, z + 2, ARC.dark); v.box(x - 1, 4, z + 1, x + 3, 4, z + 1, ARC.hot); v.box(x + 1, 4, z - 1, x + 1, 4, z + 3, ARC.hot); }
  v.box(3, 3, 3, 14, 3, 3, ARC.dark); v.box(3, 3, 14, 14, 3, 14, ARC.dark);
  v.glow(ARC.eye); v.glow(ARC.hot);
  return v.build();
}
function tick() {
  const v = new Vox(9, 4, 9, 0.07, [4.5, 0, 4.5]);
  v.sphere(4.5, 2, 4.5, 2.3, ARC.body, 0.8); v.box(4, 2, 6, 4, 2, 6, ARC.eye);
  for (const [x, z] of [[0, 1], [8, 1], [0, 7], [8, 7], [0, 4], [8, 4]]) v.box(x, 0, z, x, 1, z, ARC.dark);
  v.glow(ARC.eye);
  return v.build();
}
function pop() {
  const v = new Vox(8, 8, 8, 0.07, [4, 0, 4]);
  v.sphere(4, 4, 4, 3.6, (x, y, z) => ((x + y + z) % 3 === 0 ? ARC.hot : ARC.body));
  v.box(3, 4, 7, 4, 5, 7, ARC.eye); v.glow(ARC.eye); v.glow(ARC.hot);
  return v.build();
}
function leaper() {
  const v = new Vox(30, 16, 30, 0.1, [15, 0, 15]);
  v.box(10, 8, 9, 19, 12, 20, ARC.body); v.box(11, 12, 10, 18, 13, 19, ARC.plate);
  v.box(12, 9, 21, 17, 11, 22, ARC.plate); v.box(13, 10, 23, 16, 10, 23, ARC.eye); v.box(14, 11, 23, 15, 11, 23, ARC.eye);
  v.box(13, 13, 12, 16, 14, 16, ARC.hot);                   // core (weak spot on top)
  const legs = [[[9, 10], [2, 2]], [[20, 10], [27, 2]], [[9, 19], [2, 27]], [[20, 19], [27, 27]]];
  for (const [[ax, az], [bx, bz]] of legs) {
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    for (let t = 0; t <= 1; t += 0.05) { v.box(Math.round(ax + (mx - ax) * t), Math.round(10 + 4 * t), Math.round(az + (mz - az) * t), Math.round(ax + (mx - ax) * t), Math.round(10 + 4 * t), Math.round(az + (mz - az) * t), ARC.dark); }
    for (let t = 0; t <= 1; t += 0.05) { const x = Math.round(mx + (bx - mx) * t), z = Math.round(mz + (bz - mz) * t), y = Math.round(14 - 14 * t); v.box(x, y, z, x + 1, y, z, ARC.body); }
  }
  v.glow(ARC.eye); v.glow(ARC.hot);
  return v.build();
}
function bastion() {
  const v = new Vox(30, 30, 30, 0.12, [15, 0, 15]);
  v.box(7, 10, 7, 22, 22, 22, ARC.body); v.box(6, 14, 22, 23, 24, 24, ARC.plate);        // front armour
  v.box(9, 18, 25, 20, 19, 25, ARC.eye); v.box(10, 23, 8, 19, 25, 12, ARC.hot);           // back vent = weak spot (-z)
  v.box(3, 14, 12, 6, 18, 26, ARC.dark); v.box(23, 14, 12, 26, 18, 26, ARC.dark);         // chain guns
  for (const [x, z] of [[4, 4], [23, 4], [4, 23], [23, 23]]) { v.box(x, 0, z, x + 3, 10, z + 3, ARC.dark); v.box(x - 1, 0, z - 1, x + 4, 1, z + 4, ARC.body); }
  v.glow(ARC.eye); v.glow(ARC.hot);
  return v.build();
}
function sentinel() {
  const v = new Vox(10, 34, 10, 0.1, [5, 0, 5]);
  v.box(4, 0, 4, 5, 26, 5, ARC.dark); v.box(2, 0, 2, 7, 1, 7, ARC.body);
  v.box(2, 26, 2, 7, 31, 7, ARC.body); v.box(3, 32, 3, 6, 32, 6, ARC.plate);
  v.box(4, 28, 8, 5, 29, 9, ARC.eye); v.box(4, 27, 8, 5, 27, 9, ARC.dark);
  v.glow(ARC.eye);
  return v.build();
}
function rocketeer() {
  const v = new Vox(26, 10, 22, 0.1, [13, 0, 11]);
  v.box(8, 2, 5, 17, 7, 16, ARC.body); v.box(9, 7, 6, 16, 8, 15, ARC.plate);
  v.box(10, 4, 17, 15, 5, 17, ARC.eye);
  v.box(4, 3, 8, 7, 6, 15, ARC.rust); v.box(18, 3, 8, 21, 6, 15, ARC.rust);   // rocket pods
  for (let z = 9; z < 15; z += 2) { v.set(5, 5, 16, ARC.dark); v.set(19, 5, 16, ARC.dark); }
  for (const [x, z] of [[1, 1], [22, 1], [1, 18], [22, 18]]) { v.box(x, 5, z, x + 2, 6, z + 2, ARC.dark); v.box(x, 7, z, x + 2, 7, z + 2, ARC.hot); }
  v.glow(ARC.eye); v.glow(ARC.hot);
  return v.build();
}
function surveyor() {
  const v = new Vox(16, 16, 16, 0.1, [8, 0, 8]);
  v.sphere(8, 8, 8, 7.5, (x, y, z) => (y === 8 ? ARC.hot : (x + z) % 5 === 0 ? ARC.plate : ARC.white));
  v.box(7, 9, 15, 8, 10, 15, 0x30a0ff); v.glow(0x30a0ff); v.glow(ARC.hot);
  return v.build();
}
function snitch() {
  const v = new Vox(12, 6, 12, 0.07, [6, 0, 6]);
  v.sphere(6, 3, 6, 3, ARC.body); v.box(5, 3, 9, 6, 4, 9, 0xffd030); v.box(0, 3, 5, 11, 3, 6, ARC.plate);
  v.box(5, 0, 5, 6, 1, 6, ARC.dark); v.glow(0xffd030);
  return v.build();
}
function fireball() {
  const v = new Vox(10, 10, 10, 0.08, [5, 0, 5]);
  v.sphere(5, 5, 5, 4.6, (x, y, z) => (y > 5 ? ARC.body : ARC.rust)); v.box(4, 4, 9, 5, 5, 9, ARC.hot); v.glow(ARC.hot);
  return v.build();
}
function turret() {
  const v = new Vox(12, 12, 12, 0.1, [6, 0, 6]);
  v.box(2, 0, 2, 9, 3, 9, ARC.dark); v.box(3, 4, 3, 8, 8, 8, ARC.body); v.box(5, 6, 9, 6, 7, 11, ARC.dark); v.box(4, 8, 4, 7, 9, 7, ARC.plate);
  v.box(5, 7, 8, 6, 7, 8, ARC.eye); v.glow(ARC.eye);
  return v.build();
}
function bombardier() {
  const v = new Vox(28, 26, 28, 0.12, [14, 0, 14]);
  v.box(8, 10, 8, 19, 18, 19, ARC.body); v.box(10, 18, 10, 17, 25, 17, ARC.plate); v.box(12, 20, 17, 15, 23, 22, ARC.dark); // mortar tube
  v.box(11, 13, 20, 16, 14, 20, ARC.eye);
  for (const [x, z] of [[3, 3], [22, 3], [3, 22], [22, 22]]) { v.box(x, 0, z, x + 2, 11, z + 2, ARC.dark); }
  v.glow(ARC.eye);
  return v.build();
}
function queen() {
  const v = new Vox(48, 40, 48, 0.2, [24, 0, 24]);
  v.box(14, 18, 12, 33, 32, 36, ARC.body); v.box(16, 32, 14, 31, 36, 34, ARC.plate); v.box(18, 24, 37, 29, 30, 40, ARC.plate);
  v.box(20, 26, 41, 27, 28, 41, ARC.eye); v.box(21, 34, 18, 26, 38, 26, ARC.hot);
  for (const [x, z] of [[2, 6], [42, 6], [2, 40], [42, 40], [0, 23], [44, 23]]) { v.box(x, 0, z, x + 3, 22, z + 3, ARC.dark); v.box(Math.min(x, 14), 20, z, Math.max(x + 3, 33), 22, z + 2, ARC.body); }
  v.glow(ARC.eye); v.glow(ARC.hot);
  return v.build();
}
const ARC_BUILDERS = { wasp, hornet, tick, pop, leaper, bastion, sentinel, rocketeer, surveyor, snitch, fireball, turret, bombardier, queen };
export const ARC_SCALE = 1.35;
export function arcMesh(kind) { const m = mesh(cached('arc_' + kind, ARC_BUILDERS[kind])); m.scale.setScalar(ARC_SCALE); return m; }
export function arcGeo(kind) { return cached('arc_' + kind, ARC_BUILDERS[kind]); }

// ---------------------------------------------------------------- PROPS
const PROPS = {
  crate() { const v = new Vox(8, 7, 8, 0.12, [4, 0, 4]); v.box(0, 0, 0, 7, 6, 7, (x, y, z) => (x === 0 || x === 7 || z === 0 || z === 7) && (y === 0 || y === 6) ? 0x3a2a1a : (x + y) % 4 === 0 ? 0x5a4026 : 0x6e5030); v.box(0, 3, 7, 7, 3, 7, 0x3a2a1a); return v.build(); },
  lootCrate() { const v = new Vox(10, 6, 7, 0.1, [5, 0, 3.5]); v.box(0, 0, 0, 9, 4, 6, 0x3e4a3e); v.box(0, 5, 0, 9, 5, 6, 0x4e5a4a); v.box(4, 3, 7, 5, 4, 7, 0xd8a020); v.box(0, 2, 0, 9, 2, 6, 0x2a302a); return v.build(); },
  arcCrate() { const v = new Vox(8, 6, 8, 0.1, [4, 0, 4]); v.box(0, 0, 0, 7, 5, 7, ARC.body); v.box(1, 5, 1, 6, 5, 6, ARC.plate); v.box(3, 2, 8, 4, 3, 8, 0x30c0ff); v.glow(0x30c0ff); return v.build(); },
  barrel() { const v = new Vox(6, 9, 6, 0.1, [3, 0, 3]); v.cyl(3, 3, 0, 8, 3, 0x7a3a22); v.cyl(3, 3, 2, 2, 3, 0x4a2a1a); v.cyl(3, 3, 6, 6, 3, 0x4a2a1a); return v.build(); },
  barrelBlue() { const v = new Vox(6, 9, 6, 0.1, [3, 0, 3]); v.cyl(3, 3, 0, 8, 3, 0x2a4a6a); v.cyl(3, 3, 3, 3, 3, 0xd8d0b0); return v.build(); },
  tree() { const v = new Vox(20, 44, 20, 0.15, [10, 0, 10]); v.box(9, 0, 9, 10, 18, 10, 0x4a3422); for (let i = 0; i < 4; i++) v.sphere(10 + (i % 2) * 2 - 1, 22 + i * 5, 10 + (i > 1 ? 2 : -1), 8 - i * 1.4, (x, y, z) => (y + x * 3 + z * 7) % 9 === 0 ? 0x4a6a2a : (y % 3 === 0 ? 0x2a4a1e : 0x34562a)); return v.build(); },
  pine() { const v = new Vox(16, 50, 16, 0.15, [8, 0, 8]); v.box(7, 0, 7, 8, 12, 8, 0x3a2a1a); for (let y = 10; y < 48; y++) { const r = (48 - y) * 0.2 + ((y % 6) < 2 ? 1 : 0); v.cyl(8, 8, y, y, r, (y % 6) < 2 ? 0x1e3a22 : 0x26462a); } return v.build(); },
  deadTree() { const v = new Vox(14, 30, 14, 0.15, [7, 0, 7]); v.box(6, 0, 6, 7, 26, 7, 0x4a3e32); v.box(2, 14, 6, 6, 14, 6, 0x4a3e32); v.box(8, 18, 7, 12, 18, 7, 0x4a3e32); v.box(7, 22, 2, 7, 22, 6, 0x4a3e32); return v.build(); },
  bush() { const v = new Vox(10, 6, 10, 0.12, [5, 0, 5]); v.sphere(5, 2, 5, 4.5, (x, y, z) => (x * 7 + y * 3 + z) % 5 === 0 ? 0x4a6a2e : 0x2e4a22, 0.7); return v.build(); },
  cactus() { const v = new Vox(9, 18, 9, 0.12, [4.5, 0, 4.5]); v.box(3, 0, 3, 5, 16, 5, 0x4a6a3a); v.box(0, 7, 4, 2, 7, 4, 0x4a6a3a); v.box(0, 7, 4, 0, 12, 4, 0x4a6a3a); v.box(6, 9, 4, 8, 9, 4, 0x4a6a3a); v.box(8, 9, 4, 8, 13, 4, 0x4a6a3a); return v.build(); },
  rock() {
    const v = new Vox(16, 9, 14, 0.14, [8, 0, 7]);
    v.sphere(7, 1, 7, 6.5, 0x5e5850, 0.9); v.sphere(10, 2, 6, 4.5, 0x6a645a, 1.1); v.sphere(5, 3, 8, 3.5, 0x726a5e, 1.2);
    for (let y = 0; y < 9; y++) for (let z = 0; z < 14; z++) for (let x = 0; x < 16; x++) {
      const c = v.get(x, y, z); if (c === -1) continue;
      if (!v.solid(x, y + 1, z)) v.set(x, y, z, (x * 3 + z * 5) % 7 === 0 ? 0x4a5a34 : 0x8a8274);   // lit tops, moss flecks
    }
    return v.build();
  },
  car() { const v = new Vox(20, 13, 40, 0.1, [10, 0, 20]); v.box(1, 2, 1, 18, 6, 38, 0x6a3a2a); v.box(3, 7, 10, 16, 11, 28, 0x5a3426); v.box(4, 8, 28, 15, 10, 28, 0x2a3a40); v.box(4, 8, 10, 15, 10, 10, 0x2a3a40); v.box(1, 2, 39, 18, 4, 39, 0x2a2a2a); for (const [x, z] of [[0, 6], [17, 6], [0, 30], [17, 30]]) v.box(x, 0, z, x + 2, 3, z + 4, 0x1a1a1a); for (let i = 0; i < 30; i++) v.set((i * 7) % 18 + 1, 6 + (i % 2) * 5, (i * 13) % 36 + 2, 0x8a4a24); return v.build(); },
  lamp() { const v = new Vox(6, 44, 6, 0.1, [3, 0, 3]); v.box(2, 0, 2, 3, 40, 3, 0x2a2a2a); v.box(1, 40, 1, 4, 42, 5, 0x3a3a3a); v.box(2, 39, 2, 3, 39, 4, 0xfff0b0); v.glow(0xfff0b0); return v.build(); },
  sandbag() { const v = new Vox(20, 6, 6, 0.1, [10, 0, 3]); for (let y = 0; y < 3; y++) for (let x = (y % 2) * 2; x < 20; x += 4) v.box(x, y * 2, 0, Math.min(19, x + 3), y * 2 + 1, 5, (x + y) % 8 === 0 ? 0x7a6a4a : 0x8a7a56); return v.build(); },
  pipe() { const v = new Vox(40, 8, 8, 0.1, [20, 0, 4]); for (let x = 0; x < 40; x++) v.cyl(4, 4, 0, 0, 0, 0); for (let x = 0; x < 40; x++) for (let y = 0; y < 8; y++) for (let z = 0; z < 8; z++) { const dy = y - 3.5, dz = z - 3.5; if (dy * dy + dz * dz < 13) v.set(x, y, z, x % 10 === 0 ? 0x3a3a3a : (y > 5 ? 0x7a5a3a : 0x5a4a3a)); } return v.build(); },
  husk() { const v = new Vox(26, 8, 22, 0.12, [13, 0, 11]); v.box(6, 0, 4, 19, 6, 17, 0x2a2826); v.box(8, 6, 6, 17, 7, 15, 0x3a3634); v.box(0, 0, 8, 6, 2, 10, 0x2a2826); v.box(20, 0, 12, 25, 1, 14, 0x2a2826); v.box(10, 2, 18, 14, 4, 18, 0x4a2a1a); for (let i = 0; i < 20; i++) v.set(6 + (i * 5) % 13, 7, 4 + (i * 7) % 13, 0x6a4a30); return v.build(); },
  antenna() { const v = new Vox(10, 60, 10, 0.12, [5, 0, 5]); for (let y = 0; y < 58; y++) { const w = Math.max(0, Math.floor((58 - y) / 14)); v.box(5 - w, y, 5 - w, 5 + w - 1 < 5 - w ? 5 - w : 5 + w - 1, y, 5 + w - 1 < 5 - w ? 5 - w : 5 + w - 1, y % 4 === 0 ? 0x8a3a2a : 0x4a4a4a); } v.box(4, 58, 4, 5, 59, 5, 0xff3030); v.glow(0xff3030); return v.build(); },
  extractPad() { const v = new Vox(30, 3, 30, 0.12, [15, 0, 15]); v.box(0, 0, 0, 29, 1, 29, (x, y, z) => ((x + z) >> 2) % 2 && (x < 2 || x > 27 || z < 2 || z > 27) ? 0xd8a020 : 0x3a3e40); v.box(13, 2, 13, 16, 2, 16, 0x40ff80); v.glow(0x40ff80); return v.build(); },
  hatch() { const v = new Vox(12, 3, 12, 0.1, [6, 0, 6]); v.cyl(6, 6, 0, 1, 5.5, 0x4a4e52); v.cyl(6, 6, 2, 2, 4, 0x6a6e72); v.box(5, 2, 1, 6, 2, 10, 0xd8a020); v.glow(0xd8a020); return v.build(); },
  workbench() { const v = new Vox(16, 9, 8, 0.1, [8, 0, 4]); v.box(0, 6, 0, 15, 7, 7, 0x5a4026); v.box(0, 0, 0, 1, 6, 1, 0x3a2a1a); v.box(14, 0, 0, 15, 6, 1, 0x3a2a1a); v.box(0, 0, 6, 1, 6, 7, 0x3a2a1a); v.box(14, 0, 6, 15, 6, 7, 0x3a2a1a); v.box(3, 8, 2, 6, 8, 4, 0x8a8a8a); v.box(10, 8, 3, 12, 8, 5, 0xd8a020); return v.build(); },
  shelf() { const v = new Vox(16, 20, 5, 0.1, [8, 0, 2.5]); for (let y = 0; y < 20; y += 6) v.box(0, y, 0, 15, y, 4, 0x4a4a4a); v.box(0, 0, 0, 0, 19, 4, 0x3a3a3a); v.box(15, 0, 0, 15, 19, 4, 0x3a3a3a); for (let i = 0; i < 8; i++) v.box(1 + i * 2, 1 + (i % 3) * 6, 1, 2 + i * 2, 3 + (i % 3) * 6, 3, [0x8a6a3a, 0x3a6a8a, 0xa83a2a, 0xd8d0b0][i % 4]); return v.build(); },
  debris() { const v = new Vox(12, 3, 12, 0.1, [6, 0, 6]); for (let i = 0; i < 40; i++) { const x = (i * 7) % 12, z = (i * 11) % 12; v.box(x, 0, z, x, (i % 3), z, [0x6a665e, 0x5a564e, 0x7a4a2a][i % 3]); } return v.build(); },
};
const PROP_INFO = {
  crate: { solid: [0.48, 0.48, 0.85] }, lootCrate: { solid: [0.5, 0.35, 0.6] }, arcCrate: { solid: [0.4, 0.4, 0.6] },
  barrel: { solid: [0.3, 0.3, 0.9] }, barrelBlue: { solid: [0.3, 0.3, 0.9] },
  tree: { solid: [0.3, 0.3, 4.5] }, pine: { solid: [0.3, 0.3, 5] }, deadTree: { solid: [0.25, 0.25, 3.5] },
  bush: { cast: true }, cactus: { solid: [0.25, 0.25, 2] }, rock: { solid: [1.0, 0.85, 1.0] },
  car: { solid: [1.0, 2.0, 1.3] }, lamp: { solid: [0.15, 0.15, 3] }, sandbag: { solid: [1.0, 0.3, 0.6] },
  pipe: { solid: [2.0, 0.4, 0.8] }, husk: { solid: [1.5, 1.2, 0.9] }, antenna: { solid: [0.5, 0.5, 7] },
  extractPad: {}, hatch: {}, workbench: { solid: [0.8, 0.4, 0.9] }, shelf: { solid: [0.8, 0.25, 2] }, debris: { cast: false },
};
export function registerProp(kind, builder, info = {}) { PROPS[kind] = builder; PROP_INFO[kind] = info; geoCache.delete('prop_' + kind); }
export function propInfo(kind) { return PROP_INFO[kind] || {}; }
export function propMesh(kind, shadow = true) { return mesh(cached('prop_' + kind, PROPS[kind]), shadow); }
export function propGeo(kind) { return PROPS[kind] ? cached('prop_' + kind, PROPS[kind]) : null; }
export function propKinds() { return Object.keys(PROPS); }
export { Vox, ARC as ARK_COLORS, mesh as voxMesh, cached as cachedGeo };
