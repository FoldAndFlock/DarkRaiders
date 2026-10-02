// Map preview tool: overview (top-down orthographic of the whole map + marker overlay) or an
// in-game view at a coordinate. Used by map builders to check layouts against references.
//   tools/mapview.html?map=damn_grounds&mode=overview&ppm=1
//   tools/mapview.html?map=damn_grounds&mode=view&x=500&z=400&time=noon&weather=clear
import * as THREE from '../vendor/three.module.js';
import { Renderer } from '../src/engine/renderer.js';
import { Lighting } from '../src/engine/lighting.js';
import { World } from '../src/engine/world.js';
import { RaiderModel, OUTFITS } from '../src/engine/models.js';
import { GU } from '../src/engine/materials.js';
import { MAPS } from '../src/maps/index.js';
import { drawText } from '../src/ui/pixelfont.js';

const q = new URLSearchParams(location.search);
const mapId = q.get('map') || 'damn_grounds';
const mode = q.get('mode') || 'overview';
const canvas = document.getElementById('gl');
const overlay = document.getElementById('ov');
const info = document.getElementById('info');

async function main() {
  const mod = (await MAPS[mapId]()).default;
  const [W, H] = mod.size;
  const t0 = performance.now();
  if (mode === 'overview') {
    const ppm = +(q.get('ppm') || 1);
    const cw = Math.round(W * ppm), ch = Math.round(H * ppm);
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    overlay.style.width = cw + 'px'; overlay.style.height = ch + 'px';
    canvas.width = cw; canvas.height = ch; overlay.width = cw; overlay.height = ch;
    const gl = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true });
    gl.setSize(cw, ch, false); gl.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x101014);
    const world = new World(scene, W, H, { seed: mod.seed || 1, base: mod.base, cliff: mod.cliff });
    mod.build(world, world.rng);
    world.finalize();
    const tBuild = performance.now() - t0;
    scene.add(new THREE.HemisphereLight(0xdde4f0, 0x6a6050, Math.PI * 0.7));
    const sun = new THREE.DirectionalLight(0xfff4e0, Math.PI * 1.2); sun.position.set(-0.5, 1, -0.3); scene.add(sun);
    // straight-down camera; roofs rendered at their peek alpha
    const cam = new THREE.OrthographicCamera(0, W, 0, -H, 0.1, 500);
    cam.position.set(0, 200, 0); cam.up.set(0, 0, -1); cam.lookAt(0, 0, 0);
    cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = -H;
    // lookAt(0,0,0) from above with up=-z: screen-right = +x, screen-up = -z
    cam.left = 0; cam.right = W; cam.top = 0; cam.bottom = -H; cam.updateProjectionMatrix();
    cam.position.set(0, 200, 0);
    GU.uCutH.value = 999;
    gl.render(scene, cam);
    // overlay markers
    const o = overlay.getContext('2d');
    const P = (x, z) => [x * ppm, z * ppm];
    o.lineWidth = 1;
    for (const z of world.zones) { o.strokeStyle = ['#666', '#8a8', '#ca4', '#f60'][z.tier] || '#888'; o.beginPath(); z.poly.forEach(([x, zz], i) => { const [a, b] = P(x, zz); i ? o.lineTo(a, b) : o.moveTo(a, b); }); o.closePath(); o.stroke(); }
    for (const k of world.keyRooms) {
      o.strokeStyle = '#c060ff';
      const polys = k.polys || (k.poly ? [k.poly] : null);
      if (polys) for (const pl of polys) { o.beginPath(); pl.forEach(([x, z], i) => { const [a, b] = P(x, z); i ? o.lineTo(a, b) : o.moveTo(a, b); }); o.closePath(); o.stroke(); }
      else { const [a, b] = P(k.x0, k.z0); o.strokeRect(a, b, (k.x1 - k.x0) * ppm, (k.z1 - k.z0) * ppm); }
    }
    for (const c of world.containers) { o.fillStyle = c.tier >= 3 ? '#ff60ff' : c.tier === 2 ? '#40c0ff' : '#ffffff'; const [a, b] = P(c.x, c.z); o.fillRect(a - 1, b - 1, 2, 2); }
    for (const s of world.arkSpawns) { o.fillStyle = '#ff3020'; const [a, b] = P(s.x, s.z); o.fillRect(a - 2, b - 2, 4, 4); if (s.patrol) { o.strokeStyle = 'rgba(255,60,40,0.6)'; o.beginPath(); s.patrol.forEach(([x, zz], i) => { const [u, v] = P(x, zz); i ? o.lineTo(u, v) : o.moveTo(u, v); }); o.stroke(); } }
    for (const s of world.spawns) { o.fillStyle = '#ffffff'; const [a, b] = P(s.x, s.z); o.beginPath(); o.arc(a, b, 3, 0, 7); o.fill(); }
    for (const e of world.extracts) { o.fillStyle = e.kind === 'hatch' ? '#ffd040' : '#40ff80'; const [a, b] = P(e.x, e.z); o.fillRect(a - 4, b - 4, 8, 8); drawText(o, e.name, a + 6, b - 4, { color: o.fillStyle, shadow: '#000' }); }
    for (const p of world.pois) { const [a, b] = P(p.x, p.z); o.strokeStyle = '#ffffff'; o.beginPath(); o.arc(a, b, p.r * ppm, 0, 7); o.stroke(); if (!p.hideLabel) drawText(o, p.name, a, b - 4, { color: '#fff', shadow: '#000', align: 'center' }); }
    info.textContent = `${mod.name} ${W}x${H}m  build ${tBuild.toFixed(0)}ms  buildings ${world.buildings.length}  props ${world.props.length}  containers ${world.containers.length}  ark spawns ${world.arkSpawns.length}  extracts ${world.extracts.length}  pois ${world.pois.length}`;
    window.__stats = { build: tBuild, buildings: world.buildings.length, props: world.props.length, containers: world.containers.length };
  } else {
    const R = new Renderer(canvas, { preserve: true });
    const L = new Lighting(R.scene, R);
    L.set(q.get('time') || 'noon', q.get('weather') || 'clear');
    const world = new World(R.scene, W, H, { seed: mod.seed || 1, base: mod.base, cliff: mod.cliff });
    mod.build(world, world.rng);
    world.finalize();
    for (const l of world.lamps) L.addStatic(l);
    const x = +(q.get('x') || W / 2), z = +(q.get('z') || H / 2);
    const y = world.groundAt(x, z);
    const m = new RaiderModel(OUTFITS.teal, 'rifle'); m.root.position.set(x, y, z); m.update(0.1, false, +(q.get('face') || 0.4)); R.scene.add(m.root);
    R.center.set(x, z - y * 0.8 * 0 + 0);
    for (let i = 0; i < 30; i++) world.update(0.2, x, z, y);
    GU.uTime.value = 3;
    L.update(0.016, x, z, R.viewW, R.viewH);
    R.render(0.016);
    info.textContent = `${mod.name} @ ${x.toFixed(0)},${z.toFixed(0)} ground ${y.toFixed(2)}  build ${(performance.now() - t0).toFixed(0)}ms`;
  }
  window.__ready = true;
}
main().catch(e => { info.textContent = 'ERROR ' + e.message; console.error(e); window.__ready = true; window.__error = e.message + '\n' + e.stack; });
