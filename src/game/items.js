// Item helpers: lookup, stacks, weapon instances (tier/durability/mods), effective weapon stats.
import { ITEMS } from '../data/items.js';

export { ITEMS };
export const RARITY_ORDER = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
export const RARITY_COL = { common: '#a8a8a0', uncommon: '#5cc860', rare: '#3a98f0', epic: '#c058f0', legendary: '#f0b828' };
let uidCounter = Date.now() % 100000 * 1000;
export const newUid = () => (++uidCounter).toString(36);

export function item(id) { return ITEMS[id] || null; }
export function itemName(id) { return ITEMS[id]?.name || id; }
export function maxStack(id) { return Math.max(1, ITEMS[id]?.stack || 1); }
export function isWeapon(id) { return ITEMS[id]?.type === 'weapon'; }
export function isAmmo(id) { return ITEMS[id]?.type === 'ammo'; }
export function rarityIndex(id) { return Math.max(0, RARITY_ORDER.indexOf(ITEMS[id]?.rarity || 'common')); }

// a stack: { id, qty, uid, tier?, dur?, mods?, ammo? (rounds loaded, weapons) }
export function makeStack(id, qty = 1, extra = {}) {
  const def = ITEMS[id];
  const s = { id, qty: Math.max(1, Math.min(qty, maxStack(id))), uid: newUid() };
  if (def?.type === 'weapon') {
    s.tier = extra.tier || 1;
    const w = weaponStats(s);
    s.dur = extra.dur ?? w.durability ?? 100;
    s.ammo = extra.ammo ?? 0;
    s.mods = extra.mods || {};
  }
  Object.assign(s, extra);
  return s;
}
export function stackWeight(s) { return (ITEMS[s.id]?.weight || 0) * s.qty; }
export function stackValue(s) {
  const def = ITEMS[s.id]; if (!def) return 0;
  let v = def.value || 0;
  if (def.type === 'weapon' && s.tier > 1) { const t = def.weapon?.tiers?.find(t => t.tier === s.tier); if (t?.value) v = t.value; }
  return v * s.qty;
}

// effective weapon stats with tier upgrades + attached mods
export function weaponStats(stack) {
  const def = ITEMS[stack.id]; if (!def?.weapon) return null;
  const w = { ...def.weapon };
  w.durability = w.durability || 400;
  for (const t of w.tiers || []) {
    if (t.tier <= (stack.tier || 1)) for (const [k, m] of Object.entries(t.mods || {})) if (typeof w[k] === 'number') w[k] *= m;
  }
  for (const modId of Object.values(stack.mods || {})) {
    const md = ITEMS[modId]?.mod; if (!md) continue;
    for (const [k, m] of Object.entries(md.stats || {})) {
      if (k === 'mag') w.mag = Math.round(w.mag * m);
      else if (typeof w[k] === 'number') w[k] *= m;
    }
  }
  w.mag = Math.max(1, Math.round(w.mag));
  return w;
}
export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];

// visual gun model family by weapon class
export function gunModelFor(id) {
  const c = ITEMS[id]?.weapon?.class;
  return { pistol: 'pistol', smg: 'smg', assault_rifle: 'rifle', battle_rifle: 'heavy', lmg: 'heavy', shotgun: 'shotgun', marksman: 'sniper', sniper: 'sniper', launcher: 'launcher', energy: 'energy' }[c] || 'rifle';
}
export function gunSoundFor(id) {
  const w = ITEMS[id]?.weapon; if (!w) return 'gun_rifle';
  if (w.mode === 'beam') return 'gun_beam_loop';
  return { pistol: 'gun_pistol', smg: 'gun_smg', assault_rifle: 'gun_rifle', battle_rifle: 'gun_battle_rifle', lmg: 'gun_lmg', shotgun: 'gun_shotgun', marksman: 'gun_marksman', sniper: 'gun_sniper', launcher: 'gun_launcher', energy: 'gun_energy' }[w.class] || 'gun_rifle';
}

// items of a type / filter
export function itemsWhere(fn) { return Object.keys(ITEMS).filter(id => fn(ITEMS[id], id)); }
