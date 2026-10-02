// ARK model gallery: renders every ARK rig (src/engine/arkmodels.js) with the game's Renderer +
// Lighting on a flat floor, animated, labelled with name / triangle count. See arkgallery.html.
import * as THREE from '../vendor/three.module.js';
import { Renderer, markEntity, OBLIQUE_K } from '../src/engine/renderer.js';
import { Lighting } from '../src/engine/lighting.js';
import { World } from '../src/engine/world.js';
import { GU } from '../src/engine/materials.js';
import { ARK } from '../src/data/arc.js';
import { createArkModel } from '../src/engine/arkmodels.js';
import { RaiderModel, OUTFITS } from '../src/engine/models.js';
import { drawText } from '../src/ui/pixelfont.js';

const q = new URLSearchParams(location.search);
const DEFAULT = 'tikk,popp,komet,fyreball,wazp,hornett,fyrefly,snytch,spottr,turrett|sentinal,surveyr,shreddr,rocketier,vaporiser,leapr|bastian,bombardeer,turbyne|queene,matriark';
const rows = (q.get('ids') || DEFAULT).split('|').map(r => r.split(',').filter(id => ARK[id]));
const state = q.get('state') || 'mix';
const face = (+(q.get('face') ?? 20)) * Math.PI / 180;
const rear = q.get('rear') === '1';
const altMode = q.get('alt') || 'low';
const frames = +(q.get('frames') || 60);
const canvas = document.getElementById('gl'), ov = document.getElementById('ov'), info = document.getElementById('info');

const R = new Renderer(canvas, { preserve: true });
const L = new Lighting(R.scene, R);
L.set(q.get('time') || 'noon', q.get('weather') || 'clear');
const W = 160, H = 120;
const world = new World(R.scene, W, H, { base: q.get('floor') || 'concrete' });
world.finalize();

// ------------------------------------------------------------------ layout
const items = [];
let zc = 0, maxW = 0;
const GAP = 1.0;
const zq = q.get('zoom') || 'fit', wide = zq === 'fit' || +zq <= 1.5;
const withRaider = q.get('raider') !== '0';
for (const row of rows) {
  const ents = [];
  for (const id of row) for (let r = 0; r < (rear ? 2 : 1); r++) ents.push({ id, rearView: r === 1 });
  let x = 0, rowR = 0, rowH = 0;
  const placed = ents.map(e => {
    const def = ARK[e.id], rad = def.size?.radius ?? def.radius ?? 0.6;
    const w = Math.max(wide ? 2.3 : 1.3, rad * 2.3);
    const it = { ...e, def, rad, x: x + w / 2 };
    x += w + GAP; rowR = Math.max(rowR, rad);
    const hh = def.flying ? (altMode === 'real' ? def.height : 1.3 + (def.size?.height || 0.5)) : (def.size?.height ?? def.height ?? 1);
    rowH = Math.max(rowH, hh);
    return it;
  });
  const rowW = x - GAP;
  maxW = Math.max(maxW, rowW);
  zc += rowH * OBLIQUE_K + rowR + 0.6;          // tall things extend upward on screen
  for (const it of placed) { it.z = zc; it.rowW = rowW; items.push(it); }
  zc += rowR + 1.6;                              // label space
}
const layoutH = zc;
const cx = W / 2, cz = H / 2 - layoutH / 2;
for (const it of items) { it.x += cx - it.rowW / 2; it.z += cz; }

// ------------------------------------------------------------------ projection (zoomable)
let zoom = zq;
const fitZoom = Math.min(R.lw / 16 / (maxW + 2), R.lh / 16 / (layoutH + 1));
zoom = zoom === 'fit' ? fitZoom : +zoom;
const ppm = 16 * zoom;
R.center.set(cx, cz + layoutH / 2);
R.viewW = R.lw / ppm; R.viewH = R.lh / ppm;
R._updateProjection = function () {
  const px = 1 / ppm, ccx = this.center.x, ccz = this.center.y;
  this.view.set(ccx, ccz);
  const sx = Math.round(ccx / px) * px, sz = Math.round(ccz / px) * px;
  this.snapped.set(sx, sz); this.subpx.set((ccx - sx) * ppm, -(ccz - sz) * ppm);
  const Wv = this.lw / ppm, Hv = this.lh / ppm, k = OBLIQUE_K, D = 160;
  const m = new THREE.Matrix4();
  m.set(2 / Wv, 0, 0, -sx * 2 / Wv, 0, 2 * k / Hv, -2 / Hv, sz * 2 / Hv, 0, -1 / D, -k / D, k * sz / D, 0, 0, 0, 1);
  this.camera.projectionMatrix.copy(m); this.camera.projectionMatrixInverse.copy(m).invert();
};
const toScreen = (x, y, z) => ({ x: R.cssW / 2 + (x - R.center.x) * ppm * R.scale, y: R.cssH / 2 + (z - R.center.y - y * OBLIQUE_K) * ppm * R.scale });

// ------------------------------------------------------------------ models
const STATES = {
  idle: () => ({}),
  move: (d) => ({ moving: true, speed: d.speed || 2 }),
  alert: () => ({ alert: 1, gaze: 0.5 }),
  tele: () => ({ alert: 1, tele: 0.75 }),
  fire: () => ({ alert: 1, firing: true }),
  stun: () => ({ stunned: true }),
  leap: () => ({ leaping: true, alert: 1 }),
  broken: () => ({ alert: 0.5 }),
};
const MIX = ['move', 'alert', 'idle', 'tele', 'fire', 'move'];
for (const [n, it] of items.entries()) {
  const m = createArkModel(it.def.model, it.def);
  it.m = m;
  it.f = face + (it.rearView ? Math.PI : 0);
  it.y = it.def.flying ? (altMode === 'real' ? it.def.height : 1.3 + (it.def.size?.height || 0.5) / 2) : 0;
  m.root.position.set(it.x, it.y, it.z);
  m.root.rotation.y = it.f;
  R.scene.add(m.root);
  markEntity(R, m.root, 0x140808, false);
  it.state = state === 'mix' ? MIX[n % MIX.length] : state;
  if (it.state === 'broken') {
    for (const z of it.def.hitzones || []) if (z.hp) {
      const nn = (z.mirrorX ? 2 : 1) * (z.mirrorZ ? 2 : 1);
      if (nn === 1) m.setBroken(z.name); else for (let k = 0; k < nn; k += 2) m.setBroken(z.name + '_' + k);
    }
  }
  let tris = 0; m.root.traverse(o => { if (o.isMesh) tris += o.geometry.index.count / 3; });
  it.tris = tris;
}
// a raider at the start of each row for scale
if (withRaider) for (const it of items) if (!items.some(o => o.z === it.z && o.x < it.x)) {
  const m = new RaiderModel(OUTFITS.teal, 'rifle'); m.root.position.set(it.x - Math.max(1.2, it.rad * 1.15) - 0.9, 0, it.z); m.update(0.1, false, 0.3);
  R.scene.add(m.root); markEntity(R, m.root, 0x0c0c10, false);
}
window.__stats = Object.fromEntries(items.filter(i => !i.rearView).map(i => [i.id, i.tris]));

function stateFor(it, t) {
  let st = it.state;
  if (st === 'demo') st = ['idle', 'move', 'alert', 'tele', 'fire', 'stun'][Math.floor(t / 2.5) % 6];
  const s = (STATES[st] || STATES.idle)(it.def);
  return s;
}

// ------------------------------------------------------------------ loop
const dt = 1 / 30;
let t = 0, frame = 0;
const octx = ov.getContext('2d');
function drawLabels() {
  ov.width = R.cssW; ov.height = R.cssH;
  octx.clearRect(0, 0, ov.width, ov.height);
  const sc = zoom >= 2 ? 2 : 1;
  for (const it of items) {
    const p = toScreen(it.x, 0, it.z + Math.max(it.rad, 0.5) + 0.25);
    drawText(octx, it.def.name.toUpperCase() + (it.rearView ? ' (REAR)' : ''), p.x, p.y, { align: 'center', color: '#f0d890', shadow: '#000', scale: sc });
    drawText(octx, `${(it.tris / 1000).toFixed(1)}k tri  ${it.state}`, p.x, p.y + 9 * sc, { align: 'center', color: '#a0a0a0', shadow: '#000', scale: sc });
  }
}
function step() {
  t += dt; frame++;
  for (const it of items) {
    const s = stateFor(it, t);
    it.m.update(dt, s);
    const a = s.alert ? 0xff2a10 : 0xffa020;
    L.light(it.x, it.y + 0.5, it.z, a, 0.35, 2.2 * Math.max(1, it.rad), 0.8);
    if (it.def.flying) it.m.root.position.y = it.y + Math.sin(t * 3 + it.x) * 0.06;
  }
  GU.uTime.value = t;
  world.update(dt, R.center.x, R.center.y + 20, 0);
  L.update(dt, R.center.x, R.center.y, R.viewW, R.viewH);
  R.render(dt);
}
async function main() {
  for (let i = 0; i < frames; i++) { step(); if (i % 10 === 9) await new Promise(r => setTimeout(r, 0)); }
  drawLabels();
  info.textContent = `zoom ${zoom.toFixed(2)}  ppm ${ppm.toFixed(1)}  items ${items.length}  state ${state}\n` + items.filter(i => !i.rearView).map(i => `${i.id}:${(i.tris / 1000).toFixed(1)}k`).join(' ');
  window.__ready = true;
  // keep animating in a real browser; headless screenshot runs (navigator.webdriver) stop after `frames`
  const live = q.has('live') ? q.get('live') !== '0' : !navigator.webdriver;
  if (live) { const loop = () => { step(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
}
main().catch(e => { info.textContent = 'ERROR ' + e.message + '\n' + e.stack; console.error(e); window.__ready = true; });
