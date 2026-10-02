// Sun/moon + ambient (three.js lights) and the pooled game lights (custom shader lights with
// raymarched 2D occlusion): muzzle flashes, explosions, fires, lamps, flashlights, ARK gaze cones.
import * as THREE from '../../vendor/three.module.js';
import { GU, MAX_LIGHTS } from './materials.js';
import { FXU } from './fx.js';

export const TIMES = {
  dawn:  { sunDir: [-0.8, 0.35, -0.3], sun: 0xffb088, sunI: 1.9, sky: 0xbcc0e4, ground: 0x8a7470, amb: 1.6, glow: 1.2, exposure: 1.08, grade: { tint: [1.05, 0.96, 0.92], sat: 1.05, contrast: 1.06 } },
  noon:  { sunDir: [0.35, 0.9, -0.45], sun: 0xfff4e0, sunI: 2.4, sky: 0xc8d8f0, ground: 0x9a8a70, amb: 1.5, glow: 0.8, grade: { tint: [1.02, 1.0, 0.97], sat: 1.08, contrast: 1.05 } },
  dusk:  { sunDir: [0.85, 0.3, -0.35], sun: 0xff9a50, sunI: 2.1, sky: 0xb0a8d0, ground: 0x8a6858, amb: 1.55, glow: 1.4, exposure: 1.1, grade: { tint: [1.05, 0.97, 0.92], sat: 1.1, contrast: 1.06 } },
  night: { sunDir: [-0.4, 0.75, -0.5], sun: 0x9ab4ff, sunI: 0.95, sky: 0x7888c8, ground: 0x343a58, amb: 1.05, glow: 2.2, grade: { tint: [0.92, 0.97, 1.1], sat: 0.85, contrast: 1.1 } },
};
export const WEATHER = {
  // cloud: how much the sky light turns neutral grey; tint: extra colour grade on top of the time of day
  clear: { sunMul: 1, ambMul: 1, cloud: 0, rain: 0, haze: 0, hazeCol: 0xc0b090, wind: 0.3, sat: 1 },
  overcast: { exposure: 1.1, sunMul: 0.6, ambMul: 1.22, cloud: 0.5, rain: 0, haze: 0.04, hazeCol: 0x808890, wind: 0.8, sat: 0.9, tint: [0.98, 1.0, 1.03] },
  rain: { exposure: 1.18, lift: [0.01, 0.014, 0.02], sunMul: 0.5, ambMul: 1.28, cloud: 0.6, rain: 0.9, haze: 0.06, hazeCol: 0x607080, wind: 1.2, sat: 0.88, tint: [0.95, 0.99, 1.06] },
  storm: { exposure: 1.28, lift: [0.012, 0.016, 0.026], sunMul: 0.36, ambMul: 1.25, cloud: 0.75, rain: 1.0, haze: 0.1, hazeCol: 0x485464, wind: 2.2, sat: 0.8, tint: [0.92, 0.98, 1.08], lightning: true },
  sandstorm: { exposure: 1.06, sunMul: 0.6, ambMul: 1.15, cloud: 0.3, rain: 0, haze: 0.32, hazeCol: 0xb89868, wind: 3.0, sat: 0.9, sand: true, tint: [1.06, 1.0, 0.9] },
  fog: { exposure: 1.12, sunMul: 0.62, ambMul: 1.28, cloud: 0.6, rain: 0, haze: 0.18, hazeCol: 0x8a9298, wind: 0.4, sat: 0.88, tint: [0.98, 1.0, 1.02] },
  snow: { exposure: 1.05, sunMul: 0.62, ambMul: 1.3, cloud: 0.55, rain: 0, haze: 0.1, hazeCol: 0xc8d0dc, wind: 1.0, sat: 0.82, snow: true, tint: [0.97, 1.0, 1.05] },
};

const tmpC = new THREE.Color();

export class Lighting {
  constructor(scene, renderer) {
    this.scene = scene; this.r = renderer;
    this.hemi = new THREE.HemisphereLight(0xb0c0e0, 0x504030, 1);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xffffff, 2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera; sc.left = -36; sc.right = 36; sc.top = 36; sc.bottom = -36; sc.near = 1; sc.far = 220;
    this.sun.shadow.bias = -0.0008; this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun); scene.add(this.sun.target);
    this.requests = [];
    this.statics = [];
    this.lightning = 0;
    this.flashBoost = 0;
    this.maxLights = MAX_LIGHTS;
    this.set('noon', 'clear');
  }
  set(time, weather) {
    this.time = TIMES[time] || TIMES.noon; this.weather = WEATHER[weather] || WEATHER.clear; this.timeName = time; this.weatherName = weather;
    const T = this.time, W = this.weather;
    this.sunDir = new THREE.Vector3(...T.sunDir).normalize();
    this.sun.color.set(T.sun);
    this.baseSun = T.sunI * W.sunMul;
    // clouds wash the sky light out toward neutral grey (keeps dusk+rain readable instead of maroon)
    const cloud = (W.cloud || 0) * (time === 'night' ? 0.3 : 1);
    this.hemi.color.set(T.sky).lerp(tmpC.set(0xa8b0bc), cloud * 0.7); this.hemi.groundColor.set(T.ground).lerp(tmpC.set(0x6a6a6a), cloud * 0.5);
    this.baseAmb = T.amb * W.ambMul;
    GU.uGlowBoost.value = T.glow;
    const g = this.r.grade;
    g.tint.setRGB(...T.grade.tint); if (W.tint) g.tint.multiply(tmpC.setRGB(...W.tint)); g.saturation = T.grade.sat * W.sat; g.contrast = T.grade.contrast;
    g.exposure = (T.exposure || 1) * (W.exposure || 1); g.lift.setRGB(...(W.lift || [0, 0, 0]));
    g.haze.set(W.hazeCol); g.hazeAmt = W.haze;
    if (time === 'night') { g.haze.multiplyScalar(0.35); g.hazeAmt *= 0.8; }
    const a = Math.random() * Math.PI * 2;
    GU.uWind.value.set(Math.cos(a) * W.wind, Math.sin(a) * W.wind);
    g.wind.copy(GU.uWind.value);
    const amb = new THREE.Color(T.sky).multiplyScalar(0.5 * this.baseAmb).add(new THREE.Color(T.sun).multiplyScalar(0.25 * this.baseSun));
    FXU.uAmbient.value.setRGB(Math.min(1, amb.r + 0.15), Math.min(1, amb.g + 0.15), Math.min(1, amb.b + 0.15));
    this.isNight = time === 'night';
  }
  // ---- per-frame light requests
  // omni light. intensity ~0.5..4 (multiplies albedo), range in metres
  light(x, y, z, color, intensity, range = 8, priority = 1) {
    this.requests.push({ x, y, z, color, intensity, range, priority, spot: false });
  }
  // spot light pointing along facing (radians, 0 = +z). flat = even ground wash (ARK gaze)
  spot(x, y, z, facing, halfAngle, color, intensity, range, priority = 1, flat = false, inner = 0.75) {
    this.requests.push({ x, y, z, color, intensity, range, priority, spot: true, dx: Math.sin(facing), dz: Math.cos(facing), half: halfAngle, inner, flat });
  }
  setQuality(q) {
    const Q = { low: { lights: 12, steps: 0, shadow: 1024 }, medium: { lights: 20, steps: 24, shadow: 2048 }, high: { lights: 32, steps: 48, shadow: 2048 } }[q] || { lights: 20, steps: 24, shadow: 2048 };
    this.maxLights = Q.lights; GU.uMaxSteps.value = Q.steps;
    if (this.sun.shadow.mapSize.x !== Q.shadow) { this.sun.shadow.mapSize.set(Q.shadow, Q.shadow); this.sun.shadow.map?.dispose(); this.sun.shadow.map = null; }
    this.quality = q;
  }
  addStatic(l) { this.statics.push(l); }
  clearStatics() { this.statics = []; }

  update(dt, cx, cz, viewW = 44, viewH = 26) {
    // sun follows camera, shadow camera snapped to texels
    const texel = 72 / 2048;
    const sx = Math.round(cx / texel) * texel, sz = Math.round(cz / texel) * texel;
    this.sun.target.position.set(sx, 0, sz);
    this.sun.position.set(sx + this.sunDir.x * 90, this.sunDir.y * 90, sz + this.sunDir.z * 90);
    let flash = 0;
    if (this.weather.lightning) {
      this.lightning -= dt;
      if (this.lightning < -6 - Math.random() * 10) { this.lightning = 0.35; this.onThunder && this.onThunder(); }
      if (this.lightning > 0) flash = (Math.random() < 0.6 ? 1 : 0.3) * this.lightning;
    }
    this.flashBoost = Math.max(0, this.flashBoost - dt * 4);
    flash = Math.max(flash, this.flashBoost);
    // three's Lambert BRDF divides by PI; presets are in "albedo multiplier" units
    this.sun.intensity = (this.baseSun + flash * 6) * Math.PI * 0.75;
    this.hemi.intensity = (this.baseAmb + flash * 2) * Math.PI * 0.6;
    this.r.grade.flash = flash * 0.12;

    // static lamps near the view
    const t = performance.now() / 1000;
    for (const s of this.statics) {
      if (Math.abs(s.x - cx) > viewW / 2 + s.range || Math.abs(s.z - cz) > viewH / 2 + s.range + 6) continue;
      let I = s.intensity;
      if (s.flicker) I *= 1 - s.flicker * (0.5 + 0.5 * Math.sin(t * 23 + s.x) * Math.sin(t * 7.3 + s.z));
      if (s.off) continue;
      if (s.spot) this.spot(s.x, s.y, s.z, s.spot.facing, s.spot.half, s.color, I, s.range, 0.5);
      else this.light(s.x, s.y, s.z, s.color, I, s.range, 0.5);
    }
    // pick the best MAX_LIGHTS: priority, then proximity to view centre; cull fully off-screen ones
    const rq = this.requests.filter(q => Math.abs(q.x - cx) < viewW / 2 + q.range && q.z - cz < viewH / 2 + q.range + 4 && cz - q.z < viewH / 2 + q.range + 10);
    for (const q of rq) { const dx = q.x - cx, dz = q.z - cz; q.score = q.priority * 60 - Math.sqrt(dx * dx + dz * dz); }
    rq.sort((a, b) => b.score - a.score);
    const n = Math.min(this.maxLights, rq.length);
    const A = GU.uLA.value, B = GU.uLB.value, C = GU.uLC.value;
    for (let i = 0; i < n; i++) {
      const q = rq[i];
      tmpC.set(q.color);
      A[i].set(q.x, q.y, q.z, q.range);
      B[i].set(tmpC.r * q.intensity, tmpC.g * q.intensity, tmpC.b * q.intensity, q.flat ? 1 : 0);
      if (q.spot) C[i].set(q.dx, q.dz, Math.cos(q.half), Math.cos(q.half * q.inner));
      else C[i].set(0, 0, -2, 0);
    }
    GU.uLN.value = n;
    this.requests = [];
  }
}
