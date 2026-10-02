// Loot container voxel models + instanced renderer (searched containers are dimmed).
import * as THREE from '../../vendor/three.module.js';
import { Vox } from './voxel.js';
import { litVox } from './materials.js';

const C = { steel: 0x5a6266, steelD: 0x3a4044, olive: 0x4e5a3e, oliveD: 0x3a4430, wood: 0x6e5030, woodD: 0x4a3420, red: 0xb83a2a, white: 0xd8d4c8, yellow: 0xd8a020, blue: 0x2e5a8a, ark: 0x3a3c42, arkP: 0x5a5e66, cyan: 0x30c0ff, green: 0x4a8a3a };
const B = {
  locker: () => { const v = new Vox(7, 18, 5, 0.1, [3.5, 0, 2.5]); v.box(0, 0, 0, 6, 17, 4, C.steel); v.box(1, 1, 5, 2, 16, 5, C.steelD); v.box(4, 1, 5, 5, 16, 5, C.steelD); for (let y = 13; y < 16; y += 2) v.box(1, y, 5, 5, y, 5, 0x2a2e30); v.set(2, 9, 5, C.yellow).set(5, 9, 5, C.yellow); return v; },
  security_locker: () => { const v = B.locker(); v.box(0, 17, 0, 6, 17, 4, C.red); v.box(3, 8, 5, 3, 10, 5, C.red); v.glow(C.red); return v; },
  crate: () => { const v = new Vox(9, 7, 7, 0.1, [4.5, 0, 3.5]); v.box(0, 0, 0, 8, 6, 6, (x, y) => (y === 0 || y === 6 || x === 0 || x === 8) ? C.woodD : C.wood); v.box(0, 3, 7, 8, 3, 7, C.woodD); return v; },
  weapon_case: () => { const v = new Vox(12, 4, 5, 0.1, [6, 0, 2.5]); v.box(0, 0, 0, 11, 3, 4, C.olive); v.box(0, 2, 0, 11, 2, 4, C.oliveD); v.set(3, 2, 5, C.yellow).set(8, 2, 5, C.yellow); v.box(5, 3, 2, 6, 3, 2, 0x2a2a2a); return v; },
  ammo_box: () => { const v = new Vox(6, 4, 4, 0.1, [3, 0, 2]); v.box(0, 0, 0, 5, 3, 3, C.olive); v.box(0, 3, 0, 5, 3, 3, C.oliveD); v.box(1, 1, 4, 4, 2, 4, C.yellow); return v; },
  medical_bag: () => { const v = new Vox(7, 4, 5, 0.1, [3.5, 0, 2.5]); v.box(0, 0, 0, 6, 3, 4, C.white); v.box(3, 1, 5, 3, 3, 5, C.red); v.box(2, 2, 5, 4, 2, 5, C.red); v.box(1, 4, 2, 5, 4, 2, 0x2a2a2a); return v; },
  toolbox: () => { const v = new Vox(7, 4, 4, 0.1, [3.5, 0, 2]); v.box(0, 0, 0, 6, 3, 3, C.red); v.box(0, 3, 1, 6, 3, 2, 0x8a2a1e); v.box(2, 4, 1, 4, 4, 2, 0x3a3a3a); return v; },
  electronics: () => { const v = new Vox(8, 6, 5, 0.1, [4, 0, 2.5]); v.box(0, 0, 0, 7, 5, 4, 0x3a3e44); v.box(1, 2, 5, 3, 4, 5, 0x40e080); v.box(5, 2, 5, 6, 2, 5, 0xffa020); v.glow(0x40e080); return v; },
  cabinet: () => { const v = new Vox(9, 9, 5, 0.1, [4.5, 0, 2.5]); v.box(0, 0, 0, 8, 8, 4, C.wood); v.box(1, 1, 5, 7, 3, 5, C.woodD); v.box(1, 5, 5, 7, 7, 5, C.woodD); v.set(4, 2, 5, C.yellow).set(4, 6, 5, C.yellow); return v; },
  desk: () => { const v = new Vox(12, 7, 6, 0.1, [6, 0, 3]); v.box(0, 6, 0, 11, 6, 5, C.wood); v.box(0, 0, 0, 3, 5, 5, C.woodD); v.box(10, 0, 0, 11, 5, 1, C.woodD); v.box(10, 0, 4, 11, 5, 5, C.woodD); v.box(5, 7, 1, 8, 7, 3, C.white); return v; },
  safe: () => { const v = new Vox(7, 8, 6, 0.1, [3.5, 0, 3]); v.box(0, 0, 0, 6, 7, 5, 0x2e3236); v.box(1, 1, 6, 5, 6, 6, 0x3e4246); v.box(3, 3, 6, 4, 4, 6, C.yellow); return v; },
  trash: () => { const v = new Vox(6, 7, 6, 0.1, [3, 0, 3]); v.cyl(3, 3, 0, 6, 2.8, 0x4a5246); v.cyl(3, 3, 6, 6, 3, 0x3a4236); v.set(2, 7, 3, 0x8a7a5a).set(3, 7, 2, 0x6a5a3a); return v; },
  car_trunk: () => { const v = new Vox(8, 3, 5, 0.1, [4, 0, 2.5]); v.box(0, 0, 0, 7, 1, 4, 0x2a2a2a); v.box(0, 2, 0, 7, 2, 1, 0x6a3a2a); v.box(1, 1, 1, 3, 2, 3, C.olive); return v; },
  fridge: () => { const v = new Vox(7, 16, 6, 0.1, [3.5, 0, 3]); v.box(0, 0, 0, 6, 15, 5, 0xd0ccc0); v.box(0, 10, 6, 6, 10, 6, 0x8a8a84); v.box(5, 4, 6, 5, 8, 6, 0x6a6a64); return v; },
  suitcase: () => { const v = new Vox(7, 5, 3, 0.1, [3.5, 0, 1.5]); v.box(0, 0, 0, 6, 4, 2, 0x7a3a2a); v.box(2, 5, 1, 4, 5, 1, 0x2a2a2a); v.box(0, 2, 0, 6, 2, 2, 0xb08a4a); return v; },
  backpack: () => { const v = new Vox(6, 4, 5, 0.1, [3, 0, 2.5]); v.box(0, 0, 0, 5, 3, 4, 0x5a5a3a); v.box(1, 1, 5, 4, 2, 5, 0x4a4a2e); v.box(1, 4, 1, 4, 4, 3, 0x8a7a5a); return v; },
  bag: () => { const v = new Vox(6, 4, 5, 0.1, [3, 0, 2.5]); v.box(0, 0, 0, 5, 3, 4, 0x6a5a3a); v.box(1, 4, 1, 4, 4, 3, 0xf0c030); v.glow(0xf0c030); return v; },
  arc_crate: () => { const v = new Vox(8, 6, 8, 0.1, [4, 0, 4]); v.box(0, 0, 0, 7, 5, 7, C.ark); v.box(1, 5, 1, 6, 5, 6, C.arkP); v.box(3, 2, 8, 4, 3, 8, C.cyan); v.glow(C.cyan); return v; },
  arc_husk: () => { const v = new Vox(20, 7, 16, 0.12, [10, 0, 8]); v.box(4, 0, 3, 15, 5, 12, 0x2a2826); v.box(6, 5, 5, 13, 6, 10, 0x3a3634); v.box(0, 0, 6, 4, 2, 8, 0x2a2826); v.box(15, 0, 9, 19, 1, 11, 0x2a2826); v.box(8, 2, 13, 11, 3, 13, 0xff6020); v.glow(0xff6020); return v; },
  // large wrecks: a scaled-up husk hull with plating, exhausts and a dying core glow
  barron_husk: () => { const v = new Vox(30, 11, 24, 0.14, [15, 0, 12]); v.box(5, 0, 4, 24, 7, 19, 0x2a2826); v.box(8, 7, 7, 21, 9, 16, 0x3a3634); v.box(0, 0, 9, 5, 3, 13, 0x2a2826); v.box(24, 0, 10, 29, 2, 14, 0x2a2826); v.box(10, 9, 9, 13, 10, 11, 0x4a4440); v.box(16, 9, 12, 19, 10, 14, 0x4a4440); v.box(12, 3, 20, 17, 5, 20, 0xff6020); v.glow(0xff6020); return v; },
  deforestr_husk: () => { const v = new Vox(26, 8, 20, 0.13, [13, 0, 10]); v.box(4, 0, 4, 21, 5, 15, 0x34302a); v.box(7, 5, 6, 18, 7, 13, 0x46403a); v.box(21, 1, 6, 25, 4, 13, 0x6a6a64); v.box(0, 0, 8, 4, 2, 11, 0x34302a); v.box(10, 2, 16, 14, 3, 16, 0xffa020); v.glow(0xffa020); return v; },
  raider_cache: () => { const v = new Vox(10, 6, 7, 0.1, [5, 0, 3.5]); v.box(0, 0, 0, 9, 4, 6, 0x3e4a3e); v.box(0, 5, 0, 9, 5, 6, 0x4e5a4a); v.box(4, 3, 7, 5, 4, 7, C.yellow); v.box(0, 2, 0, 9, 2, 6, 0x2a302a); v.box(8, 5, 5, 9, 5, 6, 0xffd040); v.glow(0xffd040); return v; },
  field_depot: () => { const v = new Vox(10, 12, 6, 0.1, [5, 0, 3]); v.box(0, 0, 0, 9, 11, 5, 0x3a4a5a); v.box(1, 7, 6, 8, 10, 6, 0x2a3440); v.box(2, 8, 6, 7, 9, 6, 0x50d0ff); v.box(0, 11, 0, 9, 11, 5, C.yellow); v.glow(0x50d0ff); return v; },
  plant: () => { const v = new Vox(7, 5, 7, 0.1, [3.5, 0, 3.5]); v.sphere(3.5, 1.5, 3.5, 3, (x, y, z) => (x + z) % 3 === 0 ? 0x5a8a3a : 0x3a6a2a, 0.7); v.set(2, 4, 3, 0xe8d050).set(4, 4, 2, 0xe8d050).set(3, 4, 5, 0xd86080); v.glow(0xe8d050); return v; },
  supply_drop: () => { const v = new Vox(12, 9, 12, 0.1, [6, 0, 6]); v.box(0, 0, 0, 11, 7, 11, 0x3a4a5a); v.box(0, 3, 0, 11, 3, 11, 0xd8a020); v.box(4, 8, 4, 7, 8, 7, 0xff4030); v.glow(0xff4030); v.box(5, 0, 12, 6, 6, 12, 0xd8d0c0); return v; },
  bee_hive: () => { const v = new Vox(6, 8, 6, 0.1, [3, 0, 3]); v.box(0, 0, 0, 5, 6, 5, 0xd8c890); for (let y = 1; y < 6; y += 2) v.box(0, y, 0, 5, y, 5, 0xb0a070); v.box(0, 7, 0, 5, 7, 5, 0x6a5a3a); v.set(2, 2, 6, 0x2a2a2a); return v; },
  basket: () => { const v = new Vox(6, 4, 6, 0.1, [3, 0, 3]); v.cyl(3, 3, 0, 3, 2.8, 0x8a6a3a); v.set(2, 3, 2, 0xd8a030).set(3, 3, 3, 0x8ab040).set(4, 3, 2, 0xc84030); return v; },
};
export const CONTAINER_KINDS = Object.keys(B);
const geos = {};
export function containerGeo(kind) { if (!geos[kind]) geos[kind] = (B[kind] || B.crate)().build(); return geos[kind]; }

export class ContainerRenderer {
  constructor(scene) {
    this.scene = scene; this.meshes = new Map(); this.index = new Map(); // container idx -> [mesh, i]
  }
  build(containers) {
    const byKind = new Map();
    containers.forEach((c, i) => { const k = B[c.kind] ? c.kind : 'crate'; if (!byKind.has(k)) byKind.set(k, []); byKind.get(k).push(c); });
    const dummy = new THREE.Object3D(), white = new THREE.Color(1, 1, 1);
    for (const [k, list] of byKind) {
      const im = new THREE.InstancedMesh(containerGeo(k), litVox({ xray: true }), list.length + 32);
      im.count = list.length;
      list.forEach((c, j) => {
        dummy.position.set(c.x, c.y ?? 0, c.z); dummy.rotation.set(0, c.rot || 0, 0); dummy.scale.setScalar(1); dummy.updateMatrix();
        im.setMatrixAt(j, dummy.matrix); im.setColorAt(j, white); this.index.set(c.i, [im, j]);
      });
      im.castShadow = true; im.receiveShadow = true; im.computeBoundingSphere();
      im.boundingSphere = null; im.frustumCulled = false;
      this.scene.add(im); this.meshes.set(k, im);
    }
  }
  add(c) {   // dynamic container (ARK husk)
    const k = B[c.kind] ? c.kind : 'crate';
    let im = this.meshes.get(k);
    if (!im || im.count >= im.instanceMatrix.count) {
      im = new THREE.InstancedMesh(containerGeo(k), litVox({ xray: true }), 64); im.count = 0; im.frustumCulled = false; im.castShadow = true; im.receiveShadow = true;
      this.scene.add(im); this.meshes.set(k + '_dyn' + this.meshes.size, im);
    }
    const dummy = new THREE.Object3D(); dummy.position.set(c.x, c.y ?? 0, c.z); dummy.rotation.set(0, c.rot || 0, 0); dummy.updateMatrix();
    const j = im.count++; im.setMatrixAt(j, dummy.matrix); im.setColorAt(j, new THREE.Color(1, 1, 1));
    im.instanceMatrix.needsUpdate = true; im.instanceColor.needsUpdate = true;
    this.index.set(c.i, [im, j]);
  }
  setOpened(i, opened = true) {
    const r = this.index.get(i); if (!r) return;
    const [im, j] = r; im.setColorAt(j, opened ? new THREE.Color(0.45, 0.42, 0.4) : new THREE.Color(1, 1, 1)); im.instanceColor.needsUpdate = true;
  }
}
