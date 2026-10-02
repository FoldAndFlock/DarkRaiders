// Particle + effect systems: pixel points (smoke, fire, sparks, dust), rain, ripples, tracers.
import * as THREE from '../../vendor/three.module.js';
import { GU } from './materials.js';

export const FXU = {
  uAmbient: { value: new THREE.Color(1, 1, 1) },   // tints non-emissive particles to match scene light
};

const PT_VERT = /* glsl */`
  attribute float aSize; attribute vec4 aCol; attribute float aShape;
  varying vec4 vCol; varying float vShape; varying float vSize;
  void main(){
    vCol = aCol; vShape = aShape; vSize = aSize;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize;
  }`;
const PT_FRAG = /* glsl */`
  uniform vec3 uAmbient; uniform float uAdd;
  varying vec4 vCol; varying float vShape; varying float vSize;
  float bayer(vec2 p){ ivec2 i = ivec2(mod(p,4.0)); int k = i.x + i.y*4;
    float m[16] = float[16](0.,8.,2.,10.,12.,4.,14.,6.,3.,11.,1.,9.,15.,7.,13.,5.);
    for(int j=0;j<16;j++){ if(j==k) return m[j]/16.0; } return 0.0; }
  void main(){
    float a = vCol.a;
    if (vShape > 0.5) {               // round puff with dithered edge
      vec2 q = gl_PointCoord - 0.5;
      float r = length(q) * 2.0;
      if (r > 1.0) discard;
      a *= 1.0 - smoothstep(0.55, 1.0, r);
    }
    if (bayer(gl_FragCoord.xy) > a) discard;   // dither alpha -> crisp pixel look
    vec3 c = uAdd > 0.5 ? vCol.rgb : vCol.rgb * uAmbient;
    gl_FragColor = vec4(c, 1.0);
  }`;

export class Particles {
  constructor(scene, max = 4000, additive = false) {
    this.max = max; this.n = 0;
    this.p = new Float32Array(max * 3); this.v = new Float32Array(max * 3);
    this.col = new Float32Array(max * 4); this.size = new Float32Array(max); this.shape = new Float32Array(max);
    this.life = new Float32Array(max); this.age = new Float32Array(max);
    this.s0 = new Float32Array(max); this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max); this.drag = new Float32Array(max); this.grav = new Float32Array(max);
    this.c0 = new Float32Array(max * 3); this.c1 = new Float32Array(max * 3);
    const g = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage);
    this.colAttr = new THREE.BufferAttribute(this.col, 4).setUsage(THREE.DynamicDrawUsage);
    this.sizeAttr = new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage);
    this.shapeAttr = new THREE.BufferAttribute(this.shape, 1).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.posAttr); g.setAttribute('aCol', this.colAttr);
    g.setAttribute('aSize', this.sizeAttr); g.setAttribute('aShape', this.shapeAttr);
    g.setDrawRange(0, 0);
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uAmbient: FXU.uAmbient, uAdd: { value: additive ? 1 : 0 } },
      vertexShader: PT_VERT, fragmentShader: PT_FRAG,
      transparent: additive, depthWrite: !additive,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(g, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 10 : 5;
    scene.add(this.points);
  }
  // o: {x,y,z, vx,vy,vz, life, size, size1, color, color1, alpha, shape, drag, grav}
  emit(o) {
    let i = this.n < this.max ? this.n++ : (Math.random() * this.max) | 0;
    this.p[i * 3] = o.x; this.p[i * 3 + 1] = o.y; this.p[i * 3 + 2] = o.z;
    this.v[i * 3] = o.vx || 0; this.v[i * 3 + 1] = o.vy || 0; this.v[i * 3 + 2] = o.vz || 0;
    this.life[i] = o.life || 1; this.age[i] = 0;
    this.s0[i] = o.size || 1; this.s1[i] = o.size1 ?? this.s0[i];
    this.a0[i] = o.alpha ?? 1; this.drag[i] = o.drag || 0; this.grav[i] = o.grav || 0;
    this.shape[i] = o.shape || 0;
    const c = o.color ?? 0xffffff, c1 = o.color1 ?? c;
    this.c0[i * 3] = ((c >> 16) & 255) / 255; this.c0[i * 3 + 1] = ((c >> 8) & 255) / 255; this.c0[i * 3 + 2] = (c & 255) / 255;
    this.c1[i * 3] = ((c1 >> 16) & 255) / 255; this.c1[i * 3 + 1] = ((c1 >> 8) & 255) / 255; this.c1[i * 3 + 2] = (c1 & 255) / 255;
  }
  update(dt) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) { this._copy(--n, i); i--; continue; }
      const t = this.age[i] / this.life[i], d = Math.max(0, 1 - this.drag[i] * dt);
      this.v[i * 3] *= d; this.v[i * 3 + 1] = this.v[i * 3 + 1] * d - this.grav[i] * dt; this.v[i * 3 + 2] *= d;
      this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      if (this.p[i * 3 + 1] < 0) { this.p[i * 3 + 1] = 0; this.v[i * 3 + 1] *= -0.3; this.v[i * 3] *= 0.6; this.v[i * 3 + 2] *= 0.6; }
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * t;
      for (let k = 0; k < 3; k++) this.col[i * 4 + k] = this.c0[i * 3 + k] + (this.c1[i * 3 + k] - this.c0[i * 3 + k]) * t;
      this.col[i * 4 + 3] = this.a0[i] * (1 - t * t);
    }
    this.n = n;
    this.points.geometry.setDrawRange(0, n);
    this.posAttr.needsUpdate = this.colAttr.needsUpdate = this.sizeAttr.needsUpdate = this.shapeAttr.needsUpdate = true;
    this.posAttr.clearUpdateRanges?.();
  }
  _copy(src, dst) {
    if (src === dst) return;
    const a3 = [this.p, this.v, this.c0, this.c1];
    for (const a of a3) { a[dst * 3] = a[src * 3]; a[dst * 3 + 1] = a[src * 3 + 1]; a[dst * 3 + 2] = a[src * 3 + 2]; }
    for (let k = 0; k < 4; k++) this.col[dst * 4 + k] = this.col[src * 4 + k];
    for (const a of [this.size, this.shape, this.life, this.age, this.s0, this.s1, this.a0, this.drag, this.grav]) a[dst] = a[src];
  }
}

// --- Rain: falling streaks + ground splashes/ripples
export class Rain {
  constructor(scene, max = 1400) {
    this.max = max; this.intensity = 0; this.wind = new THREE.Vector2(0, 0);
    this.p = new Float32Array(max * 3); this.alive = new Uint8Array(max);
    this.lines = new Float32Array(max * 6);
    this.colors = new Float32Array(max * 8);
    const g = new THREE.BufferGeometry();
    this.pa = new THREE.BufferAttribute(this.lines, 3).setUsage(THREE.DynamicDrawUsage);
    this.ca = new THREE.BufferAttribute(this.colors, 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pa); g.setAttribute('color', this.ca);
    this.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 20;
    scene.add(this.mesh);
    this.fall = 16;
  }
  update(dt, cx, cz, w, h, onHit) {
    const want = Math.floor(this.max * this.intensity);
    const amb = FXU.uAmbient.value;
    let drawn = 0;
    for (let i = 0; i < this.max; i++) {
      if (!this.alive[i]) {
        if (i < want && Math.random() < 0.08) {
          this.alive[i] = 1;
          this.p[i * 3] = cx + (Math.random() - 0.5) * w * 1.2;
          this.p[i * 3 + 1] = 6 + Math.random() * 12;
          this.p[i * 3 + 2] = cz + (Math.random() - 0.5) * h * 1.6 + 4;
        } else continue;
      }
      const vx = this.wind.x * 4, vz = this.wind.y * 4, vy = -this.fall;
      this.p[i * 3] += vx * dt; this.p[i * 3 + 1] += vy * dt; this.p[i * 3 + 2] += vz * dt;
      if (this.p[i * 3 + 1] <= 0) {
        this.alive[i] = 0;
        onHit && onHit(this.p[i * 3], this.p[i * 3 + 2]);
        continue;
      }
      const j = drawn * 6, L = 0.045;
      this.lines[j] = this.p[i * 3]; this.lines[j + 1] = this.p[i * 3 + 1]; this.lines[j + 2] = this.p[i * 3 + 2];
      this.lines[j + 3] = this.p[i * 3] - vx * L; this.lines[j + 4] = this.p[i * 3 + 1] - vy * L; this.lines[j + 5] = this.p[i * 3 + 2] - vz * L;
      const k = drawn * 8, b = 0.55 + 0.45 * Math.min(1, amb.r + amb.g);
      this.colors[k] = 0.62 * b; this.colors[k + 1] = 0.72 * b; this.colors[k + 2] = 0.85 * b; this.colors[k + 3] = 0.55;
      this.colors[k + 4] = 0.5 * b; this.colors[k + 5] = 0.6 * b; this.colors[k + 6] = 0.72 * b; this.colors[k + 7] = 0.12;
      drawn++;
    }
    this.mesh.geometry.setDrawRange(0, drawn * 2);
    this.pa.needsUpdate = this.ca.needsUpdate = true;
  }
}

// --- Ripples: expanding pixel rings on water / puddles (instanced quads)
export class Ripples {
  constructor(scene, max = 300) {
    this.max = max; this.n = 0;
    this.data = new Float32Array(max * 4);   // x, z, age, maxR
    this.info = new Float32Array(max * 4);   // y, life, strength, unused
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1], 3));
    g.setIndex([0, 2, 1, 0, 3, 2]);
    this.ia = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.ib = new THREE.InstancedBufferAttribute(new Float32Array(max * 4), 4).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aRip', this.ia); g.setAttribute('aRip2', this.ib);
    g.instanceCount = 0;
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uAmbient: FXU.uAmbient },
      vertexShader: /* glsl */`
        attribute vec4 aRip; attribute vec4 aRip2; varying vec2 vLocal; varying float vR; varying float vA;
        void main(){
          float t = clamp(aRip.z / aRip2.y, 0.0, 1.0);
          float r = aRip.w * (0.15 + 0.85 * sqrt(t));
          vR = r; vA = (1.0 - t) * aRip2.z;
          vec3 p = vec3(aRip.x + position.x * (r + 0.1), aRip2.x, aRip.y + position.z * (r + 0.1));
          vLocal = vec2(position.x, position.z) * (r + 0.1);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uAmbient; varying vec2 vLocal; varying float vR; varying float vA;
        void main(){
          vec2 q = floor(vLocal * 16.0 + 0.5) / 16.0;
          float d = length(q);
          float ring = 1.0 - smoothstep(0.0, 0.07, abs(d - vR));
          float a = ring * vA;
          if (a < 0.2) discard;
          gl_FragColor = vec4(mix(vec3(0.55,0.68,0.72), vec3(0.8,0.9,0.95), 0.4) * (0.4 + 0.6 * uAmbient), a * 0.8);
        }`,
      transparent: true, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(g, this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
    scene.add(this.mesh);
  }
  add(x, z, y = 0.02, maxR = 0.5, life = 0.9, strength = 1) {
    const i = this.n < this.max ? this.n++ : (Math.random() * this.max) | 0;
    this.data.set([x, z, 0, maxR], i * 4); this.info.set([y, life, strength, 0], i * 4);
  }
  update(dt) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.data[i * 4 + 2] += dt;
      if (this.data[i * 4 + 2] > this.info[i * 4 + 1]) {
        n--; for (let k = 0; k < 4; k++) { this.data[i * 4 + k] = this.data[n * 4 + k]; this.info[i * 4 + k] = this.info[n * 4 + k]; } i--;
      }
    }
    this.n = n;
    this.ia.array.set(this.data.subarray(0, n * 4)); this.ib.array.set(this.info.subarray(0, n * 4));
    this.ia.needsUpdate = this.ib.needsUpdate = true;
    this.mesh.geometry.instanceCount = n;
  }
}

// --- Tracers: short bright additive line segments
export class Tracers {
  constructor(scene, max = 300) {
    this.max = max; this.list = [];
    this.buf = new Float32Array(max * 6); this.cbuf = new Float32Array(max * 6);
    const g = new THREE.BufferGeometry();
    this.pa = new THREE.BufferAttribute(this.buf, 3).setUsage(THREE.DynamicDrawUsage);
    this.ca = new THREE.BufferAttribute(this.cbuf, 3).setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.pa); g.setAttribute('color', this.ca);
    this.mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 12;
    scene.add(this.mesh);
  }
  add(x0, y0, z0, x1, y1, z1, color = 0xffd080, life = 0.06) {
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({ x0, y0, z0, x1, y1, z1, color: new THREE.Color(color), life, age: 0 });
  }
  update(dt) {
    this.list = this.list.filter(t => (t.age += dt) < t.life);
    this.list.forEach((t, i) => {
      const f = 1 - t.age / t.life;
      this.buf.set([t.x0 + (t.x1 - t.x0) * (1 - f) * 0.7, t.y0, t.z0 + (t.z1 - t.z0) * (1 - f) * 0.7, t.x1, t.y1, t.z1], i * 6);
      this.cbuf.set([t.color.r * f * 0.3, t.color.g * f * 0.3, t.color.b * f * 0.3, t.color.r * f, t.color.g * f, t.color.b * f], i * 6);
    });
    this.mesh.geometry.setDrawRange(0, this.list.length * 2);
    this.pa.needsUpdate = this.ca.needsUpdate = true;
  }
}

// --- convenience emitters
export class FX {
  constructor(scene) {
    this.parts = new Particles(scene, 5000, false);
    this.glow = new Particles(scene, 3000, true);
    this.rain = new Rain(scene);
    this.ripples = new Ripples(scene);
    this.tracers = new Tracers(scene);
  }
  update(dt) { this.parts.update(dt); this.glow.update(dt); this.ripples.update(dt); this.tracers.update(dt); }
  smoke(x, y, z, n = 6, dark = false, spread = 0.6, wind = GU.uWind.value) {
    for (let i = 0; i < n; i++) this.parts.emit({
      x: x + (Math.random() - .5) * spread, y: y + Math.random() * 0.4, z: z + (Math.random() - .5) * spread,
      vx: wind.x * 0.8 + (Math.random() - .5) * 0.6, vy: 0.8 + Math.random() * 1.2, vz: wind.y * 0.8 + (Math.random() - .5) * 0.6,
      life: 2.5 + Math.random() * 2.5, size: 6 + Math.random() * 6, size1: 18 + Math.random() * 14,
      color: dark ? 0x2a2624 : 0x6a6660, color1: dark ? 0x4a4642 : 0x8a8680, alpha: dark ? 0.85 : 0.6, shape: 1, drag: 0.4,
    });
  }
  fire(x, y, z, n = 3, spread = 0.3) {
    for (let i = 0; i < n; i++) this.glow.emit({
      x: x + (Math.random() - .5) * spread, y: y + Math.random() * 0.2, z: z + (Math.random() - .5) * spread,
      vx: (Math.random() - .5) * 0.4, vy: 1.4 + Math.random() * 1.6, vz: (Math.random() - .5) * 0.4,
      life: 0.4 + Math.random() * 0.5, size: 5 + Math.random() * 5, size1: 1, color: 0xffd060, color1: 0xc02000, alpha: 1, shape: 1, drag: 1,
    });
  }
  sparks(x, y, z, n = 10, color = 0xffc060, speed = 5) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.3 + Math.random());
      this.glow.emit({ x, y, z, vx: Math.cos(a) * s, vy: Math.random() * speed, vz: Math.sin(a) * s, life: 0.25 + Math.random() * 0.4, size: 2, size1: 1, color, color1: 0xff4000, grav: 12, drag: 1.5 });
    }
  }
  explosion(x, y, z, r = 3) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, s = r * (1 + Math.random() * 2);
      this.glow.emit({ x, y: y + 0.3, z, vx: Math.cos(a) * s, vy: Math.random() * s, vz: Math.sin(a) * s, life: 0.35 + Math.random() * 0.4, size: 10 + Math.random() * 10, size1: 2, color: 0xfff0a0, color1: 0xd03000, shape: 1, drag: 4 });
    }
    this.sparks(x, y + 0.5, z, 40, 0xffd080, 12);
    this.smoke(x, y, z, 24, true, r);
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 6;
      this.parts.emit({ x, y: y + 0.4, z, vx: Math.cos(a) * s, vy: 4 + Math.random() * 6, vz: Math.sin(a) * s, life: 1.2, size: 2, color: 0x3a3632, grav: 18, drag: 0.5 });
    }
    this.ripples.add(x, z, 0.05, r * 1.6, 0.5, 2.5);
  }
  muzzle(x, y, z, dx, dz) {
    for (let i = 0; i < 5; i++) this.glow.emit({ x: x + dx * 0.1 * i, y, z: z + dz * 0.1 * i, vx: dx * 2, vy: 0, vz: dz * 2, life: 0.05, size: 6 - i, size1: 2, color: 0xffffc0, color1: 0xffa020, shape: 1 });
    this.parts.emit({ x, y, z, vx: dx * 0.5, vy: 0.5, vz: dz * 0.5, life: 0.6, size: 3, size1: 7, color: 0x8a8680, alpha: 0.35, shape: 1, drag: 2 });
  }
  splash(x, z, y = 0.02) {
    for (let i = 0; i < 3; i++) this.parts.emit({ x, y, z, vx: (Math.random() - .5) * 1.4, vy: 1 + Math.random() * 1.5, vz: (Math.random() - .5) * 1.4, life: 0.3, size: 1, color: 0xb0c8d0, alpha: 0.8, grav: 14 });
  }
  dust(x, z, color = 0xb09a70) {
    this.parts.emit({ x: x + (Math.random() - .5) * 0.3, y: 0.05, z: z + (Math.random() - .5) * 0.3, vx: (Math.random() - .5) * 0.5, vy: 0.3, vz: (Math.random() - .5) * 0.5, life: 0.6, size: 3, size1: 6, color, alpha: 0.5, shape: 1, drag: 2 });
  }
}
