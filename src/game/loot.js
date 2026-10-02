// Loot generation: containers, ARK drops, bot loadouts. Deterministic given an rng.
import { ITEMS } from '../data/items.js';
import { makeStack, maxStack } from './items.js';

const CATS = {
  basic_mat: d => d.type === 'material' && d.material?.tier === 'basic',
  refined_mat: d => d.type === 'material' && (d.material?.tier === 'refined' || d.material?.tier === 'advanced'),
  arc_mat: d => d.type === 'material' && d.material?.tier === 'arc',
  nature: d => d.type === 'material' && d.material?.tier === 'nature',
  topside: d => d.type === 'material' && (d.material?.tier === 'topside' || d.material?.tier === 'industrial'),
  medical: d => d.type === 'consumable',
  ammo: d => d.type === 'ammo',
  weapon: d => d.type === 'weapon',
  mod: d => d.type === 'mod',
  grenade: d => d.type === 'grenade' || d.type === 'trap',
  gadget: d => d.type === 'gadget' && !['snap_hook', 'zipline', 'powered_descender'].includes(d.id),
  valuable: d => d.type === 'valuable' || d.type === 'trinket',
  blueprint: d => d.type === 'blueprint',
  key: d => d.type === 'key' && d.key?.room !== 'raider_hatch',
  hatch_key: d => d.type === 'key' && d.key?.room === 'raider_hatch',
  augment: d => d.type === 'augment' && !d.id?.startsWith('free_'),
  shield: d => d.type === 'shield',
  quest: d => d.type === 'quest',
};
const POOLS = {};
for (const [c, fn] of Object.entries(CATS)) POOLS[c] = Object.keys(ITEMS).filter(id => fn({ ...ITEMS[id], id }));

export const CONTAINER_LOOT = {
  locker: { n: [1, 3], w: { basic_mat: 3, topside: 2, valuable: 2, medical: 1, ammo: 1.5, grenade: 0.7, mod: 0.4, weapon: 0.3, blueprint: 0.25, key: 0.05, hatch_key: 0.04 }, time: 1.6 },
  crate: { n: [2, 4], w: { basic_mat: 4, topside: 3, refined_mat: 1, ammo: 1, valuable: 1, blueprint: 0.2 }, time: 1.8 },
  weapon_case: { n: [1, 3], w: { weapon: 3, ammo: 3, mod: 2, grenade: 1, blueprint: 0.7 }, time: 2.2 },
  ammo_box: { n: [1, 3], w: { ammo: 6, grenade: 1 }, time: 1.2 },
  medical_bag: { n: [1, 3], w: { medical: 6, nature: 1, blueprint: 0.2 }, time: 1.4 },
  toolbox: { n: [1, 3], w: { basic_mat: 3, refined_mat: 3, topside: 3, mod: 0.5, blueprint: 0.2 }, time: 1.6 },
  electronics: { n: [1, 3], w: { topside: 4, refined_mat: 3, valuable: 1, gadget: 0.5, blueprint: 0.3 }, time: 1.8 },
  cabinet: { n: [1, 3], w: { valuable: 3, basic_mat: 1, medical: 1, key: 0.15, blueprint: 0.35, quest: 0.2 }, time: 1.6 },
  desk: { n: [1, 2], w: { valuable: 3, key: 0.25, blueprint: 0.45, topside: 1, quest: 0.3 }, time: 1.4 },
  safe: { n: [2, 4], w: { valuable: 5, key: 0.4, blueprint: 1, augment: 0.5, weapon: 0.4, hatch_key: 0.3 }, time: 3.0 },
  trash: { n: [1, 2], w: { basic_mat: 5, valuable: 1, nature: 0.5 }, time: 1.0 },
  car_trunk: { n: [1, 3], w: { basic_mat: 2, topside: 2, ammo: 1, medical: 1, valuable: 1, weapon: 0.2 }, time: 1.6 },
  fridge: { n: [1, 2], w: { nature: 3, medical: 1, valuable: 0.5 }, time: 1.0 },
  suitcase: { n: [1, 3], w: { valuable: 3, medical: 1, basic_mat: 1, blueprint: 0.25 }, time: 1.4 },
  backpack: { n: [2, 4], w: { basic_mat: 2, ammo: 1, medical: 1.5, grenade: 1, valuable: 1, hatch_key: 0.1 }, time: 1.6 },
  arc_crate: { n: [1, 3], w: { arc_mat: 5, refined_mat: 2, blueprint: 0.4 }, time: 2.0 },
  arc_husk: { n: [1, 3], w: { arc_mat: 4, basic_mat: 2 }, time: 2.6 },
  // big husk wrecks placed by maps (Barron = Bastion-class, Deforestr = heavy cutter): richer ARK salvage
  barron_husk: { n: [3, 5], w: { arc_mat: 5, refined_mat: 2, basic_mat: 2, blueprint: 0.35 }, time: 3.4 },
  deforestr_husk: { n: [2, 4], w: { arc_mat: 4, refined_mat: 1.5, basic_mat: 2.5, blueprint: 0.25 }, time: 3.0 },
  raider_cache: { n: [3, 5], w: { weapon: 1.5, ammo: 2, medical: 2, grenade: 1.5, augment: 0.6, shield: 0.6, mod: 1, blueprint: 0.9, valuable: 1, hatch_key: 0.3 }, time: 2.6 },
  field_depot: { n: [2, 4], w: { ammo: 4, medical: 3 }, time: 1.5 },
  plant: { n: [1, 2], w: { nature: 6 }, time: 1.0 },
  basket: { n: [1, 2], w: { nature: 4, valuable: 0.5 }, time: 1.0 },
  security_locker: { n: [2, 4], w: { weapon: 2, ammo: 2, mod: 2, grenade: 2, shield: 0.8, augment: 0.5, blueprint: 1, key: 0.2, hatch_key: 0.2 }, time: 2.4 },
  supply_drop: { n: [3, 6], w: { weapon: 1.2, ammo: 3, medical: 2.5, grenade: 1.5, shield: 0.6, augment: 0.4, mod: 1, blueprint: 1 }, time: 3.0 },
  bee_hive: { n: [1, 2], w: { nature: 5 }, time: 2.0 },
  bag: { n: [0, 0], w: {}, time: 0.8 },
};
const RARITY_W = [
  null,
  { common: 60, uncommon: 28, rare: 9, epic: 2.5, legendary: 0.5 },
  { common: 45, uncommon: 32, rare: 15, epic: 6, legendary: 2 },
  { common: 25, uncommon: 30, rare: 26, epic: 14, legendary: 5 },
];

function pickWeighted(entries, rng) {
  let sum = 0; for (const [, w] of entries) sum += w;
  let r = rng() * sum;
  for (const [k, w] of entries) { if ((r -= w) <= 0) return k; }
  return entries[entries.length - 1]?.[0];
}
function rollQty(id, rng) {
  const d = ITEMS[id], ms = maxStack(id);
  if (ms <= 1) return 1;
  if (d.type === 'ammo') return Math.min(ms, 8 + Math.floor(rng() * 30));
  if (d.type === 'material') return Math.min(ms, d.material?.tier === 'basic' ? 1 + Math.floor(rng() * 5) : 1 + Math.floor(rng() * 2));
  return Math.min(ms, 1 + Math.floor(rng() * 2));
}
export function pickFromCategory(cat, tier, rng, opts = {}) {
  const pool = POOLS[cat]; if (!pool || !pool.length) return null;
  const rw = RARITY_W[Math.max(1, Math.min(3, tier))];
  const weighted = pool.map(id => {
    const d = ITEMS[id];
    let w = (rw[d.rarity] ?? 1) * (opts.rareMul && d.rarity !== 'common' ? opts.rareMul : 1);
    if (d.type === 'blueprint') w *= (d.bpWeight || 1);
    if (d.type === 'key' && opts.map && d.key?.map !== opts.map && d.key?.map !== 'any') w = 0;
    if (d.type === 'quest' && opts.map && d.questMap && d.questMap !== opts.map) w *= 0.2;
    return [id, w];
  }).filter(([, w]) => w > 0);
  return weighted.length ? pickWeighted(weighted, rng) : null;
}
// returns array of stacks
export function rollContainer(kind, tier, rng, opts = {}) {
  const def = CONTAINER_LOOT[kind] || CONTAINER_LOOT.crate;
  const [a, b] = def.n;
  let n = a + Math.floor(rng() * (b - a + 1)) + (tier >= 3 ? 1 : 0) + (opts.extra || 0);
  if (opts.lootMul) n = Math.round(n * opts.lootMul);
  const out = [];
  const cats = Object.entries(def.w);
  for (let i = 0; i < n; i++) {
    const cat = pickWeighted(cats, rng);
    const id = pickFromCategory(cat, tier, rng, opts);
    if (!id) continue;
    out.push(makeStack(id, rollQty(id, rng)));
  }
  return out;
}
export function searchTime(kind) { return (CONTAINER_LOOT[kind] || CONTAINER_LOOT.crate).time; }

// ARK drop table: [[item, chance, min, max], ...]
export function rollArkDrops(table, rng, mul = 1) {
  const out = [];
  for (const [id, chance, mn = 1, mx = 1] of table || []) {
    if (!ITEMS[id] || rng() > chance * mul) continue;
    out.push(makeStack(id, mn + Math.floor(rng() * (mx - mn + 1))));
  }
  if (!out.length) { const id = pickFromCategory('arc_mat', 1, rng); if (id) out.push(makeStack(id, 1)); }
  return out;
}

// bot raider kit by wealth 0..1
export function botLoadout(rng, wealth = 0.4) {
  const tier = wealth > 0.75 ? 3 : wealth > 0.4 ? 2 : 1;
  const weapons = POOLS.weapon.filter(id => ITEMS[id].weapon && !['launcher'].includes(ITEMS[id].weapon.class));
  const rw = RARITY_W[tier];
  const wid = pickWeighted(weapons.map(id => [id, rw[ITEMS[id].rarity] || 1]), rng);
  const w = ITEMS[wid].weapon;
  const kit = {
    weapon: makeStack(wid, 1, { tier: 1 + Math.floor(rng() * (tier + 1)) }),
    ammo: makeStack(w.ammo, Math.min(maxStack(w.ammo), 30 + Math.floor(rng() * 50))),
    shield: rng() < 0.3 + wealth * 0.6 ? makeStack(pickWeighted(POOLS.shield.map(id => [id, rw[ITEMS[id].rarity] || 1]), rng), 1) : null,
    heals: makeStack(ITEMS.bandage ? 'bandage' : POOLS.medical[0], 1 + Math.floor(rng() * 3)),
    grenade: rng() < 0.4 ? pickFromCategory('grenade', tier, rng) : null,
    loot: [],
  };
  const nl = 1 + Math.floor(rng() * 4);
  for (let i = 0; i < nl; i++) {
    const cat = pickWeighted([['basic_mat', 3], ['topside', 2], ['valuable', 2], ['refined_mat', 1], ['arc_mat', 1], ['blueprint', 0.15]], rng);
    const id = pickFromCategory(cat, tier, rng); if (id) kit.loot.push(makeStack(id, rollQty(id, rng)));
  }
  return kit;
}
export { POOLS as LOOT_POOLS };
