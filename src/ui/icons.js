// Item icons: hand-built 24x24 pixel art for every item in ITEMS (see ui/icon_art.js for the art and
// ui/icon_kit.js for the drawing toolkit). Icons are composed DOM-free as colour arrays, then turned
// into cached canvases / data URLs on demand.
//
//   drawIcon(ctx, id, x, y, size)                  family id ('bandage', 'gun_rifle'…) or item id
//   itemIconCanvas(itemId)                         cached 24x24 HTMLCanvasElement
//   drawItemIcon(ctx, itemId, x, y, size, { rarityFrame })
//   itemIconDataURL(itemId, { rarityFrame })       for DOM <img>/CSS (use image-rendering: pixelated)
//   itemIconPixels(itemId)                         DOM-free PB (colour ints, -1 = transparent)
import { ITEMS } from '../data/items.js';
import { PB, OUT, mix, dk, lt, rng } from './icon_kit.js';
import { ITEM_ART, FAMILY_ART, fallbackArt } from './icon_art.js';

export const ICON_SIZE = 24;
export const RARITY_COLORS = { common: 0xa8a8a0, uncommon: 0x5cc860, rare: 0x3a98f0, epic: 0xc058f0, legendary: 0xf0b828 };
const CREAM = 0xe8e0c8;

// family id -> representative item (drawIcon with a family id); first item using the family wins
export const FAMILY_REP = {};
for (const [id, it] of Object.entries(ITEMS)) if (it.icon && !(it.icon in FAMILY_REP)) FAMILY_REP[it.icon] = id;
Object.assign(FAMILY_REP, {
  grenade: 'shrapnel_grenade', smoke: 'smoke_grenade', key: 'damn_grounds_staff_room_key', metalParts: 'metal_parts',
  gun_rifle: 'rattlr', gun_energy: 'afelion', gun_pistol: 'burleta', gun_smg: 'stitchr', gun_shotgun: 'el_torro',
  gun_launcher: 'hullkracker', component: 'mechanical_components', arc_part: 'ark_powercell', salvage: 'radio',
  trinket: 'rubber_duck', quest: 'celestas_journal', blueprint: 'rattlr_blueprint', augment: 'combat_mk_1',
  mod_muzzle: 'compensator_i', mod_mag: 'extended_medium_mag_i', mod_grip: 'vertical_grip_i', mod_stock: 'stable_stock_i',
  adrenaline: 'adrenaline_shot', defib: 'defibrillator', shieldRecharger: 'shield_recharger', lightstick: 'green_light_stick',
  trap: 'gas_grenade_trap', mine: 'explosive_mine', gadget: 'noisemaker', instrument: 'recorder', battery: 'battery',
  canister: 'canister', plant: 'mushroom', fruit: 'lemon', fabric: 'fabric', chemicals: 'chemicals', wires: 'wires',
});

// ---------------------------------------------------------------- building
const pixCache = new Map();

function tierOf(id) {
  let m = /_(i{1,3})(?:_blueprint)?$/.exec(id); if (m) return m[1].length;
  m = /mk_(\d)/.exec(id); if (m) return +m[1];
  return 0;
}
function stampTier(g, t) {
  if (!t) return;
  const pts = [];
  for (let k = 0; k < t; k++) for (let y = 1; y <= 3; y++) pts.push([1 + k * 2, y]);
  for (const [x, y] of pts) g.s(x, y, CREAM);
  for (const [x, y] of pts) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const nx = x + dx, ny = y + dy;
    if (!pts.some(([a, b]) => a === nx && b === ny)) g.s(nx, ny, OUT);
  }
}

function blueprintTarget(id, it) {
  const r = typeof it.blueprint === 'string' ? it.blueprint.replace(/^craft_/, '') : null;
  if (r && ITEMS[r]) return r;
  const b = id.replace(/_blueprint$/, '');
  return ITEMS[b] ? b : null;
}

// blue paper with a white line drawing of the target item
function drawBlueprint(g, id, it) {
  const PAPER = 0x2a5aa8, PAPER_D = 0x1e4280, LINE = 0x4a7ac8, INK = 0xeaf2ff, FILL = 0x6a9ae0;
  g.r(2, 2, 21, 21, PAPER, 'flat');
  for (let i = 4; i < 21; i += 4) { g.l(i, 3, i, 20, LINE); g.l(3, i, 20, i, LINE); }
  g.r(2, 2, 21, 2, mix(PAPER, 0xffffff, 0.2), 'flat'); g.r(2, 2, 2, 21, mix(PAPER, 0xffffff, 0.12), 'flat');
  g.r(2, 21, 21, 21, PAPER_D, 'flat'); g.r(21, 2, 21, 21, PAPER_D, 'flat');
  // dog-eared corner
  g.clear(21, 2); g.clear(20, 2); g.clear(21, 3);
  g.s(20, 3, 0x9ab8e8); g.s(19, 2, PAPER_D); g.s(20, 4, PAPER_D);
  const tgt = blueprintTarget(id, it);
  if (tgt) {
    const src = itemIconPixels(tgt);
    // silhouette mask (exclude outline ring) -> edge = ink, interior = light fill
    const m = (x, y) => { const v = src.get(x, y); return v !== -1 && v !== OUT; };
    const tmp = new PB();
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      if (!m(x, y)) continue;
      const edge = !m(x - 1, y) || !m(x + 1, y) || !m(x, y - 1) || !m(x, y + 1);
      tmp.s(x, y, edge ? INK : FILL);
    }
    // shrink a little toward the centre if it touches the paper border
    g.blit(tmp, 0, 0);
  }
  // tiny title block
  g.r(15, 18, 19, 19, mix(PAPER, INK, 0.5), 'flat');
}

function build(id) {
  const it = ITEMS[id];
  const g = new PB();
  const rnd = rng(id);
  if (it && it.type === 'blueprint') {
    drawBlueprint(g, id, it);
    g.outline(OUT);
    stampTier(g, tierOf(id));
    return g;
  }
  const art = ITEM_ART[id] || (it && FAMILY_ART[it.icon]);
  try {
    if (art) art(g, it || {}, id, rnd); else fallbackArt(g, it || {}, id, rnd);
  } catch (e) {
    console.warn('icon art failed for', id, e);
    g.d.fill(-1); fallbackArt(g, it || {}, id, rnd);
  }
  if (!g.noOutline) g.outline(OUT);
  if (it && it.type !== 'weapon') stampTier(g, tierOf(id));
  return g;
}

export function itemIconPixels(itemId) {
  let p = pixCache.get(itemId);
  if (!p) { p = build(itemId); pixCache.set(itemId, p); }
  return p;
}
export function resolveIconId(id) { return ITEMS[id] ? id : FAMILY_REP[id] || null; }

// ---------------------------------------------------------------- canvases
const canvasCache = new Map(), frameCache = new Map(), urlCache = new Map(), scaledCache = new WeakMap();

function toCanvas(pb) {
  const c = document.createElement('canvas'); c.width = pb.w; c.height = pb.h;
  const x = c.getContext('2d'); const img = x.createImageData(pb.w, pb.h);
  for (let i = 0; i < pb.d.length; i++) {
    const v = pb.d[i]; if (v === -1) continue;
    img.data[i * 4] = (v >> 16) & 255; img.data[i * 4 + 1] = (v >> 8) & 255; img.data[i * 4 + 2] = v & 255; img.data[i * 4 + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}

export function itemIconCanvas(itemId) {
  let c = canvasCache.get(itemId);
  if (!c) { c = toCanvas(itemIconPixels(itemId)); canvasCache.set(itemId, c); }
  return c;
}

// slot background: dark panel, rarity-tinted dithered floor, rarity border with clipped corners
function framePixels(rarity) {
  const R = RARITY_COLORS[rarity] || RARITY_COLORS.common;
  const g = new PB();
  const BG = 0x18161c;
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
    const t = Math.max(0, (y - 6) / 17);                // 0 at top -> 1 at bottom
    const th = bayer[(y & 3) * 4 + (x & 3)] / 16;
    const k = t * 0.42 > th * 0.42 + 0.06 ? 0.16 + t * 0.2 : t * 0.08;
    g.s(x, y, mix(BG, R, k));
  }
  for (let i = 0; i < 24; i++) { g.s(i, 0, dk(R, 0.45)); g.s(i, 23, R); g.s(0, i, dk(R, 0.3)); g.s(23, i, dk(R, 0.3)); }
  for (let i = 2; i < 22; i++) g.s(i, 22, mix(R, 0x000000, 0.35));
  g.clear(0, 0); g.clear(23, 0); g.clear(0, 23); g.clear(23, 23);
  return g;
}
function framedCanvas(itemId) {
  let c = frameCache.get(itemId);
  if (c) return c;
  const it = ITEMS[itemId];
  const f = toCanvas(framePixels(it ? it.rarity : 'common'));
  f.getContext('2d').drawImage(itemIconCanvas(itemId), 0, 0);
  frameCache.set(itemId, f);
  return f;
}

// crisp downscale for non-integer ratios (e.g. 24 -> 16): coverage-weighted mode colour per output pixel
function scaled(src, size) {
  let m = scaledCache.get(src); if (!m) { m = new Map(); scaledCache.set(src, m); }
  let c = m.get(size); if (c) return c;
  const sw = src.width, sd = src.getContext('2d').getImageData(0, 0, sw, sw).data;
  c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), img = x.createImageData(size, size), k = sw / size;
  for (let oy = 0; oy < size; oy++) for (let ox = 0; ox < size; ox++) {
    const votes = new Map(); let cover = 0;
    const x0 = ox * k, x1 = x0 + k, y0 = oy * k, y1 = y0 + k;
    for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++) for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
      const w = (Math.min(x1, sx + 1) - Math.max(x0, sx)) * (Math.min(y1, sy + 1) - Math.max(y0, sy));
      const i = (sy * sw + sx) * 4; if (sd[i + 3] < 128) continue;
      cover += w;
      const key = (sd[i] << 16) | (sd[i + 1] << 8) | sd[i + 2];
      const isOut = key === OUT;
      votes.set(key, (votes.get(key) || 0) + w * (isOut ? 0.7 : 1));
    }
    if (cover < k * k * 0.42) continue;
    let best = -1, bw = -1; for (const [key, w] of votes) if (w > bw) { bw = w; best = key; }
    const o = (oy * size + ox) * 4;
    img.data[o] = (best >> 16) & 255; img.data[o + 1] = (best >> 8) & 255; img.data[o + 2] = best & 255; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  m.set(size, c);
  return c;
}

function blit(ctx, src, x, y, size) {
  const prev = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  const img = size < src.width && size % 1 === 0 && src.width % size !== 0 ? scaled(src, size) : src;
  ctx.drawImage(img, Math.round(x), Math.round(y), size, size);
  ctx.imageSmoothingEnabled = prev;
}

export function drawItemIcon(ctx, itemId, x, y, size = 24, { rarityFrame = false } = {}) {
  if (!ITEMS[itemId] && !FAMILY_REP[itemId]) return;
  const id = resolveIconId(itemId);
  blit(ctx, rarityFrame ? framedCanvas(id) : itemIconCanvas(id), x, y, size);
}

export function itemIconDataURL(itemId, { rarityFrame = false } = {}) {
  const key = itemId + (rarityFrame ? '#f' : '');
  let u = urlCache.get(key);
  if (!u) { const id = resolveIconId(itemId) || itemId; u = (rarityFrame ? framedCanvas(id) : itemIconCanvas(id)).toDataURL('image/png'); urlCache.set(key, u); }
  return u;
}

// legacy API: family ids ('bandage', 'shieldRecharger', 'grenade', 'key', …) or item ids
export function drawIcon(ctx, id, x, y, size = 16) {
  const rid = resolveIconId(id); if (!rid) return;
  blit(ctx, itemIconCanvas(rid), x, y, size);
}
export const ICON_FAMILIES = Object.keys(FAMILY_REP);
