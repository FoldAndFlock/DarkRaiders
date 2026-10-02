// Sun/moon + ambient + pooled dynamic point lights (muzzle flashes, explosions, fires, lamps).
import * as THREE from '../../vendor/three.module.js';
import { GU } from './materials.js';
import { FXU } from './fx.js';

const POOL = 14, SHADOW_POOL = 2;

export const TIMES = {
  dawn:  { sunDir: [-0.8, 0.35, -0.3], sun: 0xffb088, sunI: 1.8, sky: 0xb8b8e0, ground: 0x7a6060, amb: 1.4, glow: 1.2, grade: { tint: [1.05, 0.95, 0.92], sat: 1.0, contrast: 1.05 } },
  noon:  { sunDir: [0.35, 0.9, -0.45], sun: 0xfff4e0, sunI: 2.4, sky: 0xc8d8f0, ground: 0x9a8a70, amb: 1.5, glow: 0.8, grade: { tint: [1.02, 1.0, 0.96], sat: 1.05, contrast: 1.04 } },
  dusk:  { sunDir: [0.85, 0.3, -0.35], sun: 0xff8a40, sunI: 2.0, sky: 0xa898c8, ground: 0x7a5048, amb: 1.25, glow: 1.4, grade: { tint: [1.08, 0.92, 0.86], sat: 1.1, contrast: 1.08 } },
  night: { sunDir: [-0.4, 0.75, -0.5], sun: 0x8aa8ff, sunI: 0.7, sky: 0x6a7ab8, ground: 0x2a3048, amb: 0.75, glow: 2.2, grade: { tint: [0.9, 0.95, 1.12], sat: 0.8, contrast: 1.12 } },
};
export const WEATHER = {
  clear: { sunMul: 1, ambMul: 1, rain: 0, haze: 0, hazeCol: 0xc0b090, wind: 0.3, sat: 1 },
  rain: { sunMul: 0.4, ambMul: 0.9, rain: 0.9, haze: 0.06, hazeCol: 0x607080, wind: 1.2, sat: 0.8 },
  storm: { sunMul: 0.2, ambMul: 0.7, rain: 1.0, haze: 0.1, hazeCol: 0x404a58, wind: 2.2, sat: 0.7, lightning: true },
  sandstorm: { sunMul: 0.55, ambMul: 1.0, rain: 0, haze: 0.38, hazeCol: 0xb89868, wind: 3.0, sat: 0.85, sand: true },
  fog: { sunMul: 0.6, ambMul: 1.0, rain: 0, haze: 0.2, hazeCol: 0x8a9298, wind: 0.4, sat: 0.8 },
};

export class Lighting {
  constructor(scene, renderer) {
    this.scene = scene; this.r = renderer;
    this.hemi = new THREE.HemisphereLight(0xb0c0e0, 0x504030, 1);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 160;
    this.sun.shadow.bias = -0.0008; this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun); scene.add(this.sun.target);
    this.pool = [];
    for (let i = 0; i < POOL; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 1.6);
      if (i < SHADOW_POOL) { l.castShadow = true; l.shadow.mapSize.set(256, 256); l.shadow.bias = -0.004; l.shadow.camera.near = 0.2; l.shadow.camera.far = 14; }
      scene.add(l); this.pool.push(l);
    }
    this.spots = [];
    for (let i = 0; i < 4; i++) {
      const s = new THREE.SpotLight(0xfff0d0, 0, 16, 0.42, 0.5, 1.2);
      if (i === 0) { s.castShadow = true; s.shadow.mapSize.set(512, 512); s.shadow.bias = -0.002; s.shadow.camera.near = 0.3; s.shadow.camera.far = 18; }
      scene.add(s); scene.add(s.target); this.spots.push(s);
    }
    this.requests = []; this.spotReq = [];
    this.lightning = 0;
    this.set('noon', 'clear');
  }
  set(time, weather) {
    this.time = TIMES[time]; this.weather = WEATHER[weather]; this.timeName = time; this.weatherName = weather;
    const T = this.time, W = this.weather;
    this.sunDir = new THREE.Vector3(...T.sunDir).normalize();
    this.sun.color.set(T.sun);
    this.baseSun = T.sunI * W.sunMul;
    this.hemi.color.set(T.sky); this.hemi.groundColor.set(T.ground);
    this.baseAmb = T.amb * W.ambMul;
    GU.uGlowBoost.value = T.glow;
    const g = this.r.grade;
    g.tint.setRGB(...T.grade.tint); g.saturation = T.grade.sat * W.sat; g.contrast = T.grade.contrast;
    g.haze.set(W.hazeCol); g.hazeAmt = W.haze;
    if (time === 'night') { g.haze.multiplyScalar(0.35); g.hazeAmt *= 0.8; }
    const a = Math.random() * Math.PI * 2;
    GU.uWind.value.set(Math.cos(a) * W.wind, Math.sin(a) * W.wind);
    g.wind.copy(GU.uWind.value);
    // particle ambient tint ~ overall scene brightness
    const amb = new THREE.Color(T.sky).multiplyScalar(0.5 * this.baseAmb).add(new THREE.Color(T.sun).multiplyScalar(0.25 * this.baseSun));
    FXU.uAmbient.value.setRGB(Math.min(1, amb.r + 0.15), Math.min(1, amb.g + 0.15), Math.min(1, amb.b + 0.15));
  }
  // dynamic light request for this frame
  light(x, y, z, color, intensity, distance = 8, priority = 1, shadow = false) {
    this.requests.push({ x, y, z, color, intensity, distance, priority, shadow });
  }
  spot(x, y, z, tx, ty, tz, color = 0xfff0d0, intensity = 30, priority = 1) {
    this.spotReq.push({ x, y, z, tx, ty, tz, color, intensity, priority });
  }
  update(dt, cx, cz) {
    this.frames = (this.frames || 0) + 1;
    // sun follows camera, shadow camera snapped to texels
    const texel = 68 / 2048;
    const sx = Math.round(cx / texel) * texel, sz = Math.round(cz / texel) * texel;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx + this.sunDir.x * 60, this.sunDir.y * 60, sz + this.sunDir.z * 60);
    let flash = 0;
    if (this.weather.lightning) {
      this.lightning -= dt;
      if (this.lightning < -6 - Math.random() * 10) { this.lightning = 0.35; this.onThunder && this.onThunder(); }
      if (this.lightning > 0) flash = (Math.random() < 0.6 ? 1 : 0.3) * this.lightning;
    }
    // three's Lambert BRDF divides by PI; our presets are in "albedo multiplier" units
    this.sun.intensity = (this.baseSun + flash * 6) * Math.PI * 0.75;
    this.hemi.intensity = (this.baseAmb + flash * 2) * Math.PI * 0.6;
    this.r.grade.flash = flash * 0.15;

    const rq = this.requests;
    for (const q of rq) { const dx = q.x - cx, dz = q.z - cz; q.score = q.priority * 100 - Math.sqrt(dx * dx + dz * dz); }
    rq.sort((a, b) => b.score - a.score);
    const shadowQ = rq.filter(q => q.shadow).slice(0, SHADOW_POOL);
    const rest = rq.filter(q => !shadowQ.includes(q));
    for (let i = 0; i < POOL; i++) {
      const l = this.pool[i];
      const q = i < SHADOW_POOL ? shadowQ[i] : rest[i - SHADOW_POOL];
      // never toggle .visible (light count changes force shader recompiles) - just zero intensity
      if (q) { l.position.set(q.x, q.y, q.z); l.color.set(q.color); l.intensity = q.intensity * 2.2; l.distance = q.distance; }
      else l.intensity = 0;
      // shadow maps must render at least once or the shadow sampler has no texture bound
      if (i < SHADOW_POOL) l.shadow.autoUpdate = !!q || this.frames < 3;
    }
    this.spotReq.sort((a, b) => b.priority - a.priority);
    this.spots.forEach((s, i) => {
      const q = this.spotReq[i];
      if (q) { s.position.set(q.x, q.y, q.z); s.target.position.set(q.tx, q.ty, q.tz); s.color.set(q.color); s.intensity = q.intensity * 2.2; }
      else s.intensity = 0;
    });
    this.requests = []; this.spotReq = [];
  }
}
