// ARK vision cones: the visibility fan is ray-traced against the 2.5D occlusion grid so cover
// (walls, trees, rocks, terrain) visibly cuts it. Rendered as a smooth gradient wash + a traced
// outline (no dithering). The actual illumination comes from a matching spot light (Lighting.spot).
import * as THREE from '../../vendor/three.module.js';

const RAYS = 44, SEG = 6;
export const CONE_COLORS = {
  idle: new THREE.Color(1.0, 0.78, 0.22),     // yellow: patrolling
  search: new THREE.Color(1.0, 0.48, 0.1),    // orange: suspicious / investigating
  alert: new THREE.Color(1.0, 0.1, 0.06),     // red: has you
  scan: new THREE.Color(0.3, 0.75, 1.0),      // blue: surveyor / snitch scan beam
  friendly: new THREE.Color(0.4, 1.0, 0.6),
};

const fillMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: /* glsl */`
    attribute float aDist; attribute vec4 aCol; varying float vDist; varying vec4 vCol;
    void main(){ vDist = aDist; vCol = aCol; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uTime; varying float vDist; varying vec4 vCol;
    void main(){
      // smooth falloff + soft pulse travelling outward ("broadcast" sweep)
      float pulse = 0.5 + 0.5 * sin(vDist * 18.0 - uTime * 5.0);
      float a = vCol.a * (1.0 - smoothstep(0.55, 1.0, vDist)) * (0.75 + 0.25 * pulse) * smoothstep(0.0, 0.08, vDist);
      gl_FragColor = vec4(vCol.rgb * a, a);
    }`,
  transparent: true, depthWrite: false, blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8,
});
const edgeMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

export class VisionCones {
  constructor(scene, max = 64, groundAt = () => 0) {
    this.max = max; this.groundAt = groundAt;
    const per = (RAYS + 1) * SEG + 1;
    this.per = per;
    this.pos = new Float32Array(max * per * 3); this.dist = new Float32Array(max * per); this.col = new Float32Array(max * per * 4);
    const idx = [];
    for (let c = 0; c < max; c++) {
      const b = c * per;
      for (let r = 0; r < RAYS; r++) {
        // centre fan to first ring
        idx.push(b, b + 1 + r * SEG, b + 1 + (r + 1) * SEG);
        for (let s = 0; s < SEG - 1; s++) {
          const a0 = b + 1 + r * SEG + s, a1 = a0 + 1, b0 = b + 1 + (r + 1) * SEG + s, b1 = b0 + 1;
          idx.push(a0, a1, b0, b0, a1, b1);
        }
      }
    }
    const g = new THREE.BufferGeometry();
    this.pa = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.da = new THREE.BufferAttribute(this.dist, 1).setUsage(THREE.DynamicDrawUsage);
    this.ca = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pa); g.setAttribute('aDist', this.da); g.setAttribute('aCol', this.ca);
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, fillMat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 8;
    const emax = max * (RAYS + 2 + SEG * 2) * 2;
    this.epos = new Float32Array(emax * 3); this.ecol = new Float32Array(emax * 3);
    const eg = new THREE.BufferGeometry();
    this.epa = new THREE.BufferAttribute(this.epos, 3).setUsage(THREE.DynamicDrawUsage);
    this.eca = new THREE.BufferAttribute(this.ecol, 3).setUsage(THREE.DynamicDrawUsage);
    eg.setAttribute('position', this.epa); eg.setAttribute('color', this.eca);
    this.edges = new THREE.LineSegments(eg, edgeMat); this.edges.frustumCulled = false; this.edges.renderOrder = 9;
    scene.add(this.mesh, this.edges);
    this.list = [];
  }
  // queue a cone this frame. grid.ray(x,z,dx,dz,max,eyeY) -> distance
  add(grid, x, z, facing, halfAngle, range, state = 'idle', alpha = 0.22, eyeY = 1.2) {
    if (this.list.length < this.max) this.list.push({ x, z, facing, halfAngle, range, state, alpha, eyeY, grid });
  }
  update(dt) {
    fillMat.uniforms.uTime.value += dt;
    let ei = 0;
    const lift = 0.07;
    const epush = (x0, y0, z0, x1, y1, z1, c, f) => {
      this.epos.set([x0, y0, z0, x1, y1, z1], ei * 6);
      this.ecol.set([c.r * f, c.g * f, c.b * f, c.r * f, c.g * f, c.b * f], ei * 6); ei++;
    };
    this.list.forEach((c, ci) => {
      const b = ci * this.per, col = CONE_COLORS[c.state] || CONE_COLORS.idle;
      const gy = this.groundAt(c.x, c.z) + lift;
      this.pos.set([c.x, gy, c.z], b * 3); this.dist[b] = 0; this.col.set([col.r, col.g, col.b, c.alpha], b * 4);
      let prev = null;
      const ends = [];
      for (let r = 0; r <= RAYS; r++) {
        const a = c.facing - c.halfAngle + (2 * c.halfAngle) * r / RAYS;
        const dx = Math.sin(a), dz = Math.cos(a);
        const d = Math.max(0.3, c.grid ? c.grid.ray(c.x, c.z, dx, dz, c.range, c.eyeY) : c.range);
        for (let s = 0; s < SEG; s++) {
          const dd = d * (s + 1) / SEG, vx = c.x + dx * dd, vz = c.z + dz * dd, k = b + 1 + r * SEG + s;
          this.pos.set([vx, this.groundAt(vx, vz) + lift, vz], k * 3);
          this.dist[k] = dd / c.range;
          this.col.set([col.r, col.g, col.b, c.alpha], k * 4);
        }
        const ex = c.x + dx * d, ez = c.z + dz * d, ey = this.groundAt(ex, ez) + lift;
        ends.push([ex, ey, ez, d]);
        if (prev) {
          const f = 0.95 * (1 - Math.min(1, d / c.range) * 0.55);
          epush(prev[0], prev[1], prev[2], ex, ey, ez, col, f);
        }
        prev = [ex, ey, ez];
      }
      // side edges (follow terrain)
      for (const e of [ends[0], ends[ends.length - 1]]) {
        let px = c.x, pz = c.z, py = gy;
        for (let s = 1; s <= SEG; s++) {
          const t = s / SEG, x = c.x + (e[0] - c.x) * t, z = c.z + (e[2] - c.z) * t, y = this.groundAt(x, z) + lift;
          epush(px, py, pz, x, y, z, col, 0.75 * (1 - t * 0.5));
          px = x; pz = z; py = y;
        }
      }
    });
    this.mesh.geometry.setDrawRange(0, this.list.length * RAYS * (3 + (SEG - 1) * 6));
    this.edges.geometry.setDrawRange(0, ei * 2);
    this.pa.needsUpdate = this.da.needsUpdate = this.ca.needsUpdate = this.epa.needsUpdate = this.eca.needsUpdate = true;
    this.list = [];
  }
}
