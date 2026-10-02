// ARK vision cones: the visibility fan is ray-traced against the 2.5D occlusion grid so cover
// (walls, trees, rocks, terrain) visibly cuts it. Rendered as a smooth gradient wash with soft
// outlines on the two side edges only; wash and outlines fade out toward the far end together with
// the matching gaze spot light (Lighting.spot flat, same falloff curve). No line along the arc.
import * as THREE from '../../vendor/three.module.js';

const RAYS = 44, SEG = 6;
// ARC Raiders-style alert colours: calm searchlight → yellow/orange when suspicious → red when attacking
export const CONE_COLORS = {
  idle: new THREE.Color(0.68, 0.85, 1.0),     // cool white searchlight: patrolling, unaware
  suspicious: new THREE.Color(1.0, 0.86, 0.2), // yellow: noticed something
  search: new THREE.Color(1.0, 0.52, 0.08),   // orange: investigating / hunting a lost target
  alert: new THREE.Color(1.0, 0.1, 0.06),     // red: has spotted a raider and is attacking
  scan: new THREE.Color(0.3, 0.75, 1.0),      // blue: surveyor scan beam (idle)
};
// distance falloff shared by the wash, the outlines and the gaze light (materials.js, flat lights)
export const CONE_FADE = [0.3, 1.0];

const fillMat = new THREE.ShaderMaterial({
  uniforms: { uTime: { value: 0 } },
  vertexShader: /* glsl */`
    attribute float aDist; attribute vec4 aCol; attribute vec4 aCone;
    varying float vDist; varying vec4 vCol; varying vec4 vCone; varying vec2 vXZ;
    void main(){
      vDist = aDist; vCol = aCol; vCone = aCone; vXZ = position.xz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */`
    uniform float uTime; varying float vDist; varying vec4 vCol; varying vec4 vCone; varying vec2 vXZ;
    void main(){
      float fade = 1.0 - smoothstep(${CONE_FADE[0].toFixed(2)}, ${CONE_FADE[1].toFixed(2)}, vDist);
      float near = smoothstep(0.0, 0.07, vDist);
      // exact per-pixel distance (metres) to the nearest side edge of the cone
      vec2 rel = vXZ - vCone.xy; float r = length(rel);
      float ang = atan(rel.x, rel.y) - vCone.z;
      ang = mod(ang + 3.14159265, 6.2831853) - 3.14159265;
      float lateral = sin(max(vCone.w - abs(ang), 0.0)) * r;
      float edge = 1.0 - smoothstep(0.04, 0.16, lateral);
      // soft pulse travelling outward ("broadcast" sweep)
      float pulse = 0.88 + 0.12 * sin(vDist * 18.0 - uTime * 5.0);
      float a = (vCol.a * pulse + edge * 0.6) * fade * near;
      gl_FragColor = vec4(vCol.rgb * a, a);
    }`,
  transparent: true, depthWrite: false, blending: THREE.CustomBlending,
  blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8,
});

const tmpCol = new THREE.Color();

export class VisionCones {
  constructor(scene, max = 64, groundAt = () => 0) {
    this.max = max; this.groundAt = groundAt;
    const per = (RAYS + 1) * SEG + 1;
    this.per = per;
    this.pos = new Float32Array(max * per * 3); this.dist = new Float32Array(max * per);
    this.col = new Float32Array(max * per * 4); this.cone = new Float32Array(max * per * 4);
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
    this.ka = new THREE.BufferAttribute(this.cone, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pa); g.setAttribute('aDist', this.da); g.setAttribute('aCol', this.ca); g.setAttribute('aCone', this.ka);
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, fillMat); this.mesh.frustumCulled = false; this.mesh.renderOrder = 8;
    scene.add(this.mesh);
    this.list = [];
  }
  // queue a cone this frame. grid.ray(x,z,dx,dz,max,eyeY) -> distance. color: state name or THREE.Color
  add(grid, x, z, facing, halfAngle, range, color = 'idle', alpha = 0.2, eyeY = 1.2) {
    if (this.list.length < this.max) this.list.push({ x, z, facing, halfAngle, range, color, alpha, eyeY, grid });
  }
  update(dt) {
    fillMat.uniforms.uTime.value += dt;
    const lift = 0.07;
    this.list.forEach((c, ci) => {
      const b = ci * this.per;
      const col = c.color instanceof THREE.Color ? c.color : (CONE_COLORS[c.color] || CONE_COLORS.idle);
      const put = (k, x, y, z, d) => {
        this.pos.set([x, y, z], k * 3); this.dist[k] = d;
        this.col.set([col.r, col.g, col.b, c.alpha], k * 4);
        this.cone.set([c.x, c.z, c.facing, c.halfAngle], k * 4);
      };
      put(b, c.x, this.groundAt(c.x, c.z, c.eyeY) + lift, c.z, 0);
      for (let r = 0; r <= RAYS; r++) {
        const a = c.facing - c.halfAngle + (2 * c.halfAngle) * r / RAYS;
        const dx = Math.sin(a), dz = Math.cos(a);
        const d = Math.max(0.3, c.grid ? c.grid.ray(c.x, c.z, dx, dz, c.range, c.eyeY) : c.range);
        for (let s = 0; s < SEG; s++) {
          const dd = d * (s + 1) / SEG, vx = c.x + dx * dd, vz = c.z + dz * dd;
          put(b + 1 + r * SEG + s, vx, this.groundAt(vx, vz, c.eyeY) + lift, vz, dd / c.range);
        }
      }
    });
    this.mesh.geometry.setDrawRange(0, this.list.length * RAYS * (3 + (SEG - 1) * 6));
    this.pa.needsUpdate = this.da.needsUpdate = this.ca.needsUpdate = this.ka.needsUpdate = true;
    this.list = [];
  }
}

// colour for an ARK's current awareness: state + detection meter (0..1) blend
export function coneColor(state, vis = 0, scan = false, out = tmpCol) {
  if (state === 'alert') return out.copy(CONE_COLORS.alert);
  if (state === 'search') return out.copy(CONE_COLORS.suspicious).lerp(CONE_COLORS.search, Math.min(1, 0.35 + vis));
  const base = scan ? CONE_COLORS.scan : CONE_COLORS.idle;
  // idle but building suspicion: drift toward yellow as the meter fills
  return out.copy(base).lerp(CONE_COLORS.suspicious, Math.min(1, vis / 0.35) * 0.85);
}
