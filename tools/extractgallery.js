// Extraction structure gallery: every extract rig (src/engine/extracts.js) in every state, rendered with the
// game's Renderer + Lighting + FX on a flat World floor, a raider for scale, labelled with triangle counts.
// See extractgallery.html for the URL params.
import * as THREE from '../vendor/three.module.js';
import { Renderer, markEntity, OBLIQUE_K } from '../src/engine/renderer.js';
import { Lighting } from '../src/engine/lighting.js';
import { FX } from '../src/engine/fx.js';
import { World } from '../src/engine/world.js';
import { GU } from '../src/engine/materials.js';
import { createExtractModel, extractTris, extractWorldPoints, EXTRACT_KINDS } from '../src/engine/extracts.js';
import { RaiderModel, OUTFITS } from '../src/engine/models.js';
import { drawText } from '../src/ui/pixelfont.js';

const q = new URLSearchParams(location.search);
const STATES = ['idle', 'called', 'open', 'closing', 'gone', 'offline'];
const pick = (param, all) => { const v = q.get(param); if (!v) return all; const want = v.split(',').map(s => s.trim()); return all.filter(k => want.includes(k)); };
const kinds = pick('kind', EXTRACT_KINDS), states = pick('state', STATES);
const face = (+(q.get('face') ?? 0)) * Math.PI / 180;
const frames = +(q.get('frames') || 90);
const CT = +(q.get('ct') ?? 3), OT = +(q.get('ot') ?? 80), CL = +(q.get('cl') ?? 5), GE = +(q.get('ge') ?? 3.5), INSIDE = q.get('inside') === '1';
const canvas = document.getElementById('gl'), ov = document.getElementById('ov'), info = document.getElementById('info');

const R = new Renderer(canvas, { preserve: true });
const L = new Lighting(R.scene, R);
L.set(q.get('time') || 'noon', q.get('weather') || 'clear');
const fx = new FX(R.scene);
const W = 240, H = 220;
const world = new World(R.scene, W, H, { base: q.get('floor') || 'concrete' });
world.finalize();

// ------------------------------------------------------------------ layout: kinds = columns, states = rows
// per kind: x extent (incl. the scale raider), screen-space z extent (z - K*height .. z), raider spot (local)
const BOX = {
  elevator: { x0: -4.0, x1: 4.6, top: -7.6, bot: 6.4, raider: [3.6, 0, 6.1] },
  hatch: { x0: -1.6, x1: 2.4, top: -2.0, bot: 1.6, raider: [1.6, 0, 0.1] },
  metro: { x0: -13.9, x1: 13.9, top: -5.6, bot: 5.6, raider: [-1.5, 0.375, -0.6] },
  airshaft: { x0: -4.1, x1: 4.1, top: -7.4, bot: 4.0, raider: [3.3, 0, 3.5] },
};
const GAP = 1.6, ROWGAP = 2.2;
const colX = []; let xc = 0;
for (const k of kinds) { const b = BOX[k]; colX.push(xc - b.x0); xc += b.x1 - b.x0 + GAP; }
const layoutW = xc - GAP;
const rowTop = Math.min(...kinds.map(k => BOX[k].top)), rowBot = Math.max(...kinds.map(k => BOX[k].bot));
const rowH = rowBot - rowTop + ROWGAP;
const layoutH = rowH * states.length - ROWGAP;
const ox = W / 2 - layoutW / 2, oz = H / 2 - layoutH / 2;
const items = [];
states.forEach((st, r) => kinds.forEach((k, c) => items.push({ kind: k, st, x: ox + colX[c], z: oz + r * rowH - rowTop })));

// ------------------------------------------------------------------ projection (zoomable)
const zq = q.get('zoom') || 'fit';
const fitZoom = Math.min(R.lw / 16 / (layoutW + 2), R.lh / 16 / (layoutH + 2));
const zoom = zq === 'fit' ? fitZoom : +zq;
const ppm = 16 * zoom;
R.center.set(W / 2, H / 2);
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
const ctx = { L, fx, near: true, play: null, shake: null, viewer: null };
const tris = {};
for (const it of items) {
  it.m = createExtractModel(it.kind, { kind: it.kind, face, name: it.kind });
  it.m.root.position.set(it.x, 0, it.z); it.m.root.rotation.y = face;
  R.scene.add(it.m.root);
  tris[it.kind] = it.tris = extractTris(it.m);
  it.pts = extractWorldPoints({ kind: it.kind, x: it.x, z: it.z, y: 0, face });
  const c = Math.cos(face), s = Math.sin(face), place = (lx, ly, lz, f, outfit) => {
    const rm = new RaiderModel(OUTFITS[outfit], 'rifle');
    rm.root.position.set(it.x + lx * c + lz * s, ly, it.z - lx * s + lz * c); rm.update(0.1, false, f);
    R.scene.add(rm.root); markEntity(R, rm.root, 0x0c0c10, false);
  };
  if (q.get('raider') !== '0') {
    place(...BOX[it.kind].raider, face + 0.4, 'teal');
    // a passenger inside the cabin while it boards / departs
    if (it.kind !== 'hatch' && (it.st === 'open' || it.st === 'closing')) { const cb = it.pts.cabin; place(cb.shape === 'rect' ? (it.kind === 'metro' ? 1.2 : 0.4) : 0, cb.y, it.kind === 'metro' ? 3.0 : -0.4, face + 2.6, 'red'); }
  }
}
window.__stats = tris;

// timer left for a state at simulation frame i (so the final frame shows exactly the requested moment)
const dt = 1 / 30;
function timerAt(st, i) {
  const left = (frames - 1 - i) * dt;
  if (st === 'called') return Math.min(25, Math.max(0, CT + left));
  if (st === 'open') return Math.min(90, Math.max(0, OT + left));
  if (st === 'closing') return Math.min(10, Math.max(0, CL + left));
  if (st === 'gone') return Math.min(75, Math.max(0, 75 - GE - left));
  return null;
}
let t = 0, frame = 0;
function step() {
  t += dt;
  for (const it of items) {
    // inside=1: the viewer stands in each cabin (roofs fade, walls cut, the car roof hides)
    ctx.viewer = INSIDE ? { x: it.pts.cabin.cx, y: it.pts.cabin.y + 0.05, z: it.pts.cabin.cz } : null;
    const hst = it.kind === 'hatch' ? (it.st === 'open' ? 'open' : it.st === 'offline' ? 'offline' : 'idle') : it.st;
    it.m.update(dt, hst, it.kind === 'hatch' && hst === 'open' ? Math.min(15, Math.max(0, 14 + (frames - 1 - frame) * dt - 1)) : timerAt(it.st, frame), ctx);
  }
  frame++;
  GU.uTime.value = t;
  world.update(dt, R.center.x, R.center.y + 40, 0);
  fx.update(dt);
  L.update(dt, R.center.x, R.center.y, R.viewW, R.viewH);
  R.render(dt);
}

const octx = ov.getContext('2d');
function drawLabels() {
  ov.width = R.cssW; ov.height = R.cssH;
  octx.clearRect(0, 0, ov.width, ov.height);
  const sc = zoom >= 1.5 ? 2 : 1;
  for (const it of items) {
    const p = toScreen(it.x, 0, it.z + BOX[it.kind].bot + 0.2);
    const st = it.kind === 'hatch' ? (it.st === 'offline' ? 'offline' : it.st === 'open' ? 'open (15s window)' : 'idle') : it.st;
    drawText(octx, `${it.kind.toUpperCase()}  ${st.toUpperCase()}`, p.x, p.y, { align: 'center', color: '#f0d890', shadow: '#000', scale: sc });
    drawText(octx, `${(it.tris / 1000).toFixed(1)}k tri`, p.x, p.y + 9 * sc, { align: 'center', color: '#a0a0a0', shadow: '#000', scale: sc });
  }
}
async function main() {
  for (let i = 0; i < frames; i++) { step(); if (i % 10 === 9) await new Promise(r => setTimeout(r, 0)); }
  drawLabels();
  info.textContent = `zoom ${zoom.toFixed(2)}  ppm ${ppm.toFixed(1)}  ${L.timeName}  ` + Object.entries(tris).map(([k, n]) => `${k}:${(n / 1000).toFixed(1)}k`).join(' ');
  window.__ready = true;
  const live = q.has('live') ? q.get('live') !== '0' : !navigator.webdriver;
  if (live) { const loop = () => { step(); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
}
main().catch(e => { info.textContent = 'ERROR ' + e.message + '\n' + e.stack; console.error(e); window.__ready = true; });
