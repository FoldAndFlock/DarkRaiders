// Icon + gun model preview.
//   tools/icons.html                      everything (gun models, all icons at 2x with names, all icons at 4x)
//   ?sec=icons|guns|big|legacy            one section only
//   ?f=gun_rifle,arc_part / ?f=type:key   filter by icon family, type:, or id substring (~text)
//   ?zoom=3  ?frame=1 (rarity frames)  ?names=0
import { ITEMS } from '../src/data/items.js';
import { drawItemIcon, itemIconDataURL, itemIconPixels, drawIcon, ICON_FAMILIES } from '../src/ui/icons.js';

const q = new URLSearchParams(location.search);
const sec = q.get('sec') || 'all';
const frame = q.get('frame') === '1';
const names = q.get('names') !== '0';
const root = document.getElementById('root');
const stat = document.getElementById('stat');

function matches(id, it) {
  const f = q.get('f'); if (!f) return true;
  return f.split(',').some(t => t.startsWith('type:') ? it.type === t.slice(5) : t.startsWith('~') ? id.includes(t.slice(1)) : it.icon === t || id === t);
}
const ids = Object.keys(ITEMS).filter(id => matches(id, ITEMS[id]));

// group by family, keep data order inside
const fams = new Map();
for (const id of ids) { const f = ITEMS[id].icon || '?'; if (!fams.has(f)) fams.set(f, []); fams.get(f).push(id); }

// sanity: every item builds without throwing
const errors = [];
for (const id of Object.keys(ITEMS)) {
  try { const p = itemIconPixels(id); if (!p.bbox()) errors.push(id + ' (empty)'); } catch (e) { errors.push(id + ': ' + e.message); }
}

function iconGrid(zoom, withNames, title) {
  const h = document.createElement('h2'); h.textContent = title; root.appendChild(h);
  for (const [fam, list] of fams) {
    const h3 = document.createElement('h3'); h3.textContent = `${fam} (${list.length})`; root.appendChild(h3);
    const grid = document.createElement('div'); grid.className = 'grid'; root.appendChild(grid);
    for (const id of list) {
      const it = ITEMS[id];
      const cell = document.createElement('div'); cell.className = 'cell';
      const c = document.createElement('canvas'); c.width = c.height = 24 * zoom;
      drawItemIcon(c.getContext('2d'), id, 0, 0, 24 * zoom, { rarityFrame: frame });
      cell.appendChild(c);
      if (withNames) { cell.style.width = Math.max(24 * zoom, 96) + 'px'; const s = document.createElement('span'); s.textContent = it.name; s.title = id; s.style.color = { common: '#a8a8a0', uncommon: '#5cc860', rare: '#3a98f0', epic: '#c058f0', legendary: '#f0b828' }[it.rarity]; cell.appendChild(s); }
      grid.appendChild(cell);
    }
  }
}

function legacy() {
  const h = document.createElement('h2'); h.textContent = 'drawIcon(family) @16 / 24 / 32 / 48 (legacy API), img via itemIconDataURL'; root.appendChild(h);
  const box = document.createElement('div'); box.className = 'hud'; root.appendChild(box);
  const c = document.createElement('canvas'); c.width = ICON_FAMILIES.length * 52; c.height = 140; box.appendChild(c);
  const x = c.getContext('2d'); x.fillStyle = '#18161c'; x.fillRect(0, 0, c.width, c.height);
  ICON_FAMILIES.forEach((f, i) => { drawIcon(x, f, i * 52, 0, 16); drawIcon(x, f, i * 52, 20, 24); drawIcon(x, f, i * 52, 48, 32); drawIcon(x, f, i * 52, 84, 48); });
  const row = document.createElement('div'); row.className = 'grid'; root.appendChild(row);
  for (const id of ['rattlr', 'rubber_duck', 'leapr_pulse_unit', 'tempesta_blueprint', 'green_gate_village_key']) {
    const cell = document.createElement('div'); cell.className = 'cell';
    const img = new Image(); img.src = itemIconDataURL(id, { rarityFrame: true }); img.width = img.height = 72; cell.appendChild(img); row.appendChild(cell);
  }
}

async function guns() {
  const mod = await import('./icons_guns.js');
  await mod.renderGuns(root);
}

(async () => {
  if (sec === 'all' || sec === 'guns') await guns();
  if (sec === 'all' || sec === 'legacy') legacy();
  if (sec === 'all' || sec === 'icons') iconGrid(+(q.get('zoom') || 2), names, `All item icons @${q.get('zoom') || 2}x (${ids.length})`);
  if (sec === 'all' || sec === 'big') iconGrid(+(q.get('bigzoom') || 4), false, `All item icons @${q.get('bigzoom') || 4}x`);
  stat.innerHTML = `${Object.keys(ITEMS).length} items, ${ids.length} shown, ${fams.size} families. ` + (errors.length ? `<span class="err">ERRORS: ${errors.join(', ')}</span>` : 'all icons built OK');
  window.__ready = true;
})();
