// Gun model preview row for tools/icons.html: every weapon's voxel model (engine/guns.js) rendered with
// the game's Renderer + Lighting, magnified 6x in side view, plus raiders holding each gun at 1x.
import * as THREE from '../vendor/three.module.js';
import { Renderer, markEntity, PX_PER_M } from '../src/engine/renderer.js';
import { Lighting } from '../src/engine/lighting.js';
import { RaiderModel, OUTFITS, voxMesh } from '../src/engine/models.js';
import { GU } from '../src/engine/materials.js';
import { gunModelGeo, gunMuzzle } from '../src/engine/guns.js';
import { ITEMS } from '../src/data/items.js';
import { drawText } from '../src/ui/pixelfont.js';

export async function renderGuns(root) {
  const q = new URLSearchParams(location.search);
  const h = document.createElement('h2'); h.textContent = 'Gun models (engine/guns.js gunModelGeo) - 6x side view, and held by raiders at 1x'; root.appendChild(h);
  const wrap = document.createElement('div'); wrap.id = 'guns'; root.appendChild(wrap);
  const canvas = document.createElement('canvas'); canvas.id = 'gl'; wrap.appendChild(canvas);
  const ov = document.createElement('canvas'); ov.id = 'glo'; wrap.appendChild(ov);
  const H = +(q.get('gh') || 880);
  canvas.style.height = H + 'px';
  const R = new Renderer(canvas, { preserve: true, baseHeight: H / 2 });
  const L = new Lighting(R.scene, R);
  L.set(q.get('time') || 'noon', q.get('weather') || 'clear');
  R.grade.vignette = 0.12;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshLambertMaterial({ color: 0x3a3c42 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; R.scene.add(ground);
  // light grid lines to read scale (1 m)
  const grid = new THREE.GridHelper(400, 400, 0x4a4c54, 0x44464c); grid.position.y = 0.002; R.scene.add(grid);

  const ids = Object.keys(ITEMS).filter(id => ITEMS[id].type === 'weapon');
  const COLS = 6, CW = 9.6, RH = 5.0, MAG = 6;
  const W = R.viewW, x0 = -W / 2 + 0.6, z0 = 0;
  const labels = [];
  ids.forEach((id, i) => {
    const c = i % COLS, r = Math.floor(i / COLS);
    const m = voxMesh(gunModelGeo(id));
    m.scale.setScalar(MAG);
    // barrel (+z) -> +x, then tilt so the left side faces the oblique camera (profile view)
    const tilt = q.get('tilt') === '0' ? 0 : -0.9;
    m.rotation.set(tilt, Math.PI / 2, 0);
    const x = x0 + c * CW + 3.2, z = z0 + r * RH + 2.2;
    m.position.set(x, 1.1, z);
    R.scene.add(m); markEntity(R, m, 0x100c0c, false);
    // origin marker (grip) + muzzle marker
    const marker = (col, px, py) => {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: col, depthTest: false }));
      d.renderOrder = 10; d.position.set(px, py, z); R.scene.add(d);
    };
    const mz = gunMuzzle(id);
    const ct = Math.cos(tilt);
    marker(0xffe040, x, 1.1); marker(0xff4040, x + mz[2] * MAG, 1.1 + mz[1] * MAG * ct);
    labels.push({ id, x: x - 2.2, y: 0, z: z + 1.5, name: ITEMS[id].name, cls: ITEMS[id].weapon.class, rarity: ITEMS[id].rarity });
  });
  // raiders at 1x holding every gun, facing east so the profile shows
  const rz = z0 + Math.ceil(ids.length / COLS) * RH + 1.6;
  ids.forEach((id, i) => {
    const outfit = Object.values(OUTFITS)[i % 5];
    const rm = new RaiderModel(outfit, 'rifle');
    rm.gun.geometry = gunModelGeo(id);
    rm.gun.position.set(0.1, 0.0, 0.42);
    const x = x0 + 1.2 + i * (W - 2.4) / ids.length;
    rm.root.position.set(x, 0, rz + (i % 2) * 1.4);
    rm.update(0.3, false, Math.PI / 2);
    R.scene.add(rm.root); markEntity(R, rm.root, 0x100c0c, false);
  });

  const cx = 0, cz = z0 + (Math.ceil(ids.length / COLS) * RH + 3) / 2 + 0.2;
  R.center.set(cx, cz);
  GU.uTime.value = 2;
  L.light(cx - 10, 6, cz - 4, 0xfff0d8, 0.6, 30, 1);
  L.update(0.016, cx, cz, R.viewW, R.viewH);
  R.render(0.016);

  // labels
  ov.width = R.cssW; ov.height = R.cssH; ov.style.width = R.cssW + 'px'; ov.style.height = R.cssH + 'px';
  const o = ov.getContext('2d'); o.imageSmoothingEnabled = false;
  const RC = { common: '#a8a8a0', uncommon: '#5cc860', rare: '#3a98f0', epic: '#c058f0', legendary: '#f0b828' };
  for (const l of labels) {
    const s = R.worldToScreen(l.x, l.y, l.z);
    drawText(o, l.name.toUpperCase(), s.x, s.y, { color: RC[l.rarity], shadow: '#000', scale: 2 });
    drawText(o, l.cls, s.x, s.y + 18, { color: '#a8a8a0', shadow: '#000', scale: 1 });
  }
  const s = R.worldToScreen(x0, 0, rz + 2.6);
  drawText(o, 'IN-GAME SCALE (1x, held)   yellow = grip origin, red = gunMuzzle()   grid = 1 m', s.x, s.y + 6, { color: '#e8e0c8', shadow: '#000', scale: 2 });
  return { R, PX_PER_M };
}
