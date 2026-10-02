// Pixel-art top-down map image of a finalized World (in-raid map overlay + lobby thumbnails).
import { TERRAIN } from '../engine/textures.js';

const TERRAIN_COL = { grass: '#4a5a2a', dirt: '#5a4632', sand: '#c09c64', sandDark: '#8e7046', concrete: '#727068', damConcrete: '#857e70', asphalt: '#38383a', rock: '#5a544c', tiles: '#868076', wood: '#624432', mud: '#3e3424', gravel: '#6a665e', moss: '#3a4826', forest: '#2e3a1e', metalPanel: '#525a5c', hazard: '#a07a20' };
const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// S = metres per pixel
export function renderMapImage(w, S = 2) {
  const cw = Math.ceil(w.w / S), ch = Math.ceil(w.h / S);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const x = c.getContext('2d'), img = x.createImageData(cw, ch);
  const cols = TERRAIN.map(n => rgb(TERRAIN_COL[n] || '#555555'));
  for (let z = 0; z < ch; z++) for (let xx = 0; xx < cw; xx++) {
    const wx = xx * S + S / 2, wz = z * S + S / 2;
    let [r, g, b] = cols[w.terrainAt(wx, wz)] || [80, 80, 80];
    const h = w.groundAt(wx, wz), hl = w.groundAt(wx - 2, wz - 2);
    const shade = Math.max(0.55, Math.min(1.35, 1 + (h - hl) * 0.25));
    const top = w.grid.topAt(wx, wz);
    if (top > h + 1.5) { r = 46; g = 44; b = 42; }
    if (w.grid.waterAt(wx, wz)) { r = 40; g = 80; b = 92; }
    const i = (z * cw + xx) * 4; img.data[i] = r * shade; img.data[i + 1] = g * shade; img.data[i + 2] = b * shade; img.data[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  x.strokeStyle = '#9a9484'; x.lineWidth = Math.min(1, 1 / S);
  for (const bd of w.buildings) {
    // underground halls (tunnels, metro) in a cool tint so they read as below the surface
    x.fillStyle = bd.under ? 'rgba(52,64,86,0.75)' : '#3a3836'; x.strokeStyle = bd.under ? '#7088b0' : '#9a9484';
    x.beginPath(); bd.poly.forEach(([px, pz], i) => i ? x.lineTo(px / S, pz / S) : x.moveTo(px / S, pz / S)); x.closePath(); x.fill(); x.stroke();
  }
  return c;
}
