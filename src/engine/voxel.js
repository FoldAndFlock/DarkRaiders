// Tiny voxel model builder -> BufferGeometry with face culling + baked corner AO.
import * as THREE from '../../vendor/three.module.js';

const FACES = [
  { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
  { n: [-1, 0, 0], c: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]] },
  { n: [0, 1, 0], c: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
  { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
  { n: [0, 0, 1], c: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]] },
  { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
];
const tmpC = new THREE.Color();

export class Vox {
  // sx,sy,sz voxel dims; s = metres per voxel; origin: voxel coords that map to model (0,0,0)
  constructor(sx, sy, sz, s = 0.1, origin = [sx / 2, 0, sz / 2]) {
    this.sx = sx; this.sy = sy; this.sz = sz; this.s = s; this.o = origin;
    this.d = new Int32Array(sx * sy * sz).fill(-1);
    this.emissive = new Set();
  }
  i(x, y, z) { return (y * this.sz + z) * this.sx + x; }
  in(x, y, z) { return x >= 0 && y >= 0 && z >= 0 && x < this.sx && y < this.sy && z < this.sz; }
  set(x, y, z, c) { x |= 0; y |= 0; z |= 0; if (this.in(x, y, z)) this.d[this.i(x, y, z)] = c; return this; }
  get(x, y, z) { return this.in(x, y, z) ? this.d[this.i(x, y, z)] : -1; }
  box(x0, y0, z0, x1, y1, z1, c) { // inclusive
    for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) this.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
    return this;
  }
  sphere(cx, cy, cz, r, c, sy = 1) {
    for (let y = Math.floor(cy - r * sy); y <= cy + r * sy; y++) for (let z = Math.floor(cz - r); z <= cz + r; z++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x + .5 - cx, dy = (y + .5 - cy) / sy, dz = z + .5 - cz;
      if (dx * dx + dy * dy + dz * dz <= r * r) this.set(x, y, z, typeof c === 'function' ? c(x, y, z) : c);
    }
    return this;
  }
  cyl(cx, cz, y0, y1, r, c) {
    for (let y = y0; y <= y1; y++) for (let z = Math.floor(cz - r); z <= cz + r; z++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x + .5 - cx, dz = z + .5 - cz; if (dx * dx + dz * dz <= r * r) this.set(x, y, z, c);
    }
    return this;
  }
  mirrorX() { // copy left half onto right half
    for (let y = 0; y < this.sy; y++) for (let z = 0; z < this.sz; z++) for (let x = 0; x < this.sx / 2; x++) {
      const v = this.get(x, y, z); if (v !== -1) this.set(this.sx - 1 - x, y, z, v);
    }
    return this;
  }
  glow(c) { this.emissive.add(c); return this; }
  solid(x, y, z) { return this.get(x, y, z) !== -1; }

  build() {
    const pos = [], nor = [], col = [], emi = [], idx = [];
    const s = this.s, [ox, oy, oz] = this.o;
    for (let y = 0; y < this.sy; y++) for (let z = 0; z < this.sz; z++) for (let x = 0; x < this.sx; x++) {
      const c = this.get(x, y, z); if (c === -1) continue;
      tmpC.setHex(c);
      const glow = this.emissive.has(c) ? 1 : 0;
      for (const f of FACES) {
        const [nx, ny, nz] = f.n;
        if (this.solid(x + nx, y + ny, z + nz)) continue;
        const base = pos.length / 3;
        for (const [cx, cy, cz] of f.c) {
          // corner AO: look at the two edge neighbours + diagonal on the face's outer side
          const px = x + nx, py = y + ny, pz = z + nz;
          const sg = [cx ? 1 : -1, cy ? 1 : -1, cz ? 1 : -1];
          const ax = nx ? [1, 2] : ny ? [0, 2] : [0, 1];
          const d1 = [0, 0, 0], d2 = [0, 0, 0];
          d1[ax[0]] = sg[ax[0]]; d2[ax[1]] = sg[ax[1]];
          const s1 = this.solid(px + d1[0], py + d1[1], pz + d1[2]);
          const s2 = this.solid(px + d2[0], py + d2[1], pz + d2[2]);
          const s3 = this.solid(px + d1[0] + d2[0], py + d1[1] + d2[1], pz + d1[2] + d2[2]);
          const occ = (s1 && s2) ? 3 : (s1 + s2 + s3);
          const ao = glow ? 1 : 1 - occ * 0.14;
          pos.push((x + cx - ox) * s, (y + cy - oy) * s, (z + cz - oz) * s);
          nor.push(nx, ny, nz);
          col.push(tmpC.r * ao, tmpC.g * ao, tmpC.b * ao);
          emi.push(glow);
        }
        idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('glow', new THREE.Float32BufferAttribute(emi, 1));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
}
