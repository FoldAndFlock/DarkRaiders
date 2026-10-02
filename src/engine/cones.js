// ARC vision cones: visibility fans ray-cast against the occlusion grid so cover visibly blocks them.
import * as THREE from '../../vendor/three.module.js';

const RAYS = 40;
const STATE_COL = {
  idle: new THREE.Color(1.0, 0.82, 0.25),     // yellow: patrolling
  search: new THREE.Color(1.0, 0.5, 0.12),    // orange: suspicious
  alert: new THREE.Color(1.0, 0.12, 0.08),    // red: has you
  scan: new THREE.Color(0.3, 0.75, 1.0),      // blue: surveyor/snitch scan beam
};

const mat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: /* glsl */`
    attribute float aDist; attribute vec4 aCol; varying float vDist; varying vec4 vCol; varying vec3 vW;
    void main(){ vDist = aDist; vCol = aCol; vW = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: /* glsl */`
    uniform float uTime; varying float vDist; varying vec4 vCol; varying vec3 vW;
    float bayer(vec2 p){ ivec2 i = ivec2(mod(p,4.0)); int k = i.x + i.y*4;
      float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
      for(int j=0;j<16;j++){ if(j==k) return m[j]/16.0; } return 0.0; }
    void main(){
      // vDist: 0 at eye -> 1 at max range. Broadcast "scan" bands pulse outward.
      float band = step(0.82, fract(vDist * 6.0 - uTime * 1.6));
      float a = vCol.a * (0.45 + 0.55 * band) * (1.0 - smoothstep(0.6, 1.0, vDist)) * (0.5 + 0.5 * smoothstep(0.0, 0.25, vDist));
      if (bayer(gl_FragCoord.xy) > a) discard;
      gl_FragColor = vec4(vCol.rgb, 1.0);
    }`,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
});
const edgeMat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

export class VisionCones {
  constructor(scene, max = 48) {
    this.max = max;
    const verts = max * (RAYS + 2);
    this.pos = new Float32Array(verts * 3); this.dist = new Float32Array(verts); this.col = new Float32Array(verts * 4);
    const idx = [];
    for (let c = 0; c < max; c++) { const b = c * (RAYS + 2); for (let r = 0; r < RAYS; r++) idx.push(b, b + 1 + r, b + 2 + r); }
    const g = new THREE.BufferGeometry();
    this.pa = new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage);
    this.da = new THREE.BufferAttribute(this.dist, 1).setUsage(THREE.DynamicDrawUsage);
    this.ca = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pa); g.setAttribute('aDist', this.da); g.setAttribute('aCol', this.ca);
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 8;
    // outline along the lit edge
    this.epos = new Float32Array(max * (RAYS + 3) * 2 * 3); this.ecol = new Float32Array(max * (RAYS + 3) * 2 * 3);
    const eg = new THREE.BufferGeometry();
    this.epa = new THREE.BufferAttribute(this.epos, 3).setUsage(THREE.DynamicDrawUsage);
    this.eca = new THREE.BufferAttribute(this.ecol, 3).setUsage(THREE.DynamicDrawUsage);
    eg.setAttribute('position', this.epa); eg.setAttribute('color', this.eca);
    this.edges = new THREE.LineSegments(eg, edgeMat); this.edges.frustumCulled = false; this.edges.renderOrder = 9;
    scene.add(this.mesh, this.edges);
    this.list = [];
  }
  // queue a cone this frame. grid.ray(x,z,dx,dz,max,h) -> distance
  add(grid, x, z, facing, halfAngle, range, state = 'idle', alpha = 0.5, eyeH = 1.2) {
    if (this.list.length < this.max) this.list.push({ x, z, facing, halfAngle, range, state, alpha, eyeH, grid });
  }
  update(dt) {
    mat.uniforms.uTime.value += dt;
    let ei = 0;
    this.list.forEach((c, ci) => {
      const b = ci * (RAYS + 2), col = STATE_COL[c.state] || STATE_COL.idle, y = 0.04;
      this.pos.set([c.x, y, c.z], b * 3); this.dist[b] = 0; this.col.set([col.r, col.g, col.b, c.alpha], b * 4);
      let px = 0, pz = 0;
      for (let r = 0; r <= RAYS; r++) {
        const a = c.facing - c.halfAngle + (2 * c.halfAngle) * r / RAYS;
        const dx = Math.sin(a), dz = Math.cos(a);
        const d = c.grid ? c.grid.ray(c.x, c.z, dx, dz, c.range, c.eyeH) : c.range;
        const vx = c.x + dx * d, vz = c.z + dz * d, k = b + 1 + r;
        this.pos.set([vx, y, vz], k * 3); this.dist[k] = d / c.range; this.col.set([col.r, col.g, col.b, c.alpha], k * 4);
        if (r > 0) {
          this.epos.set([px, y, pz, vx, y, vz], ei * 6);
          const f = 0.8 * (1 - d / c.range * 0.7);
          this.ecol.set([col.r * f, col.g * f, col.b * f, col.r * f, col.g * f, col.b * f], ei * 6); ei++;
        }
        px = vx; pz = vz;
      }
    });
    this.mesh.geometry.setDrawRange(0, this.list.length * RAYS * 3);
    this.edges.geometry.setDrawRange(0, ei * 2);
    this.pa.needsUpdate = this.da.needsUpdate = this.ca.needsUpdate = this.epa.needsUpdate = this.eca.needsUpdate = true;
    this.list = [];
  }
}
