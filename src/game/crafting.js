// Speranzia workshop logic: benches, crafting, blueprints, recycling, weapon tiers + repair, Scrappie.
// Pure logic on a profile object (no DOM). Every mutating call returns { ok, msg, ... }.
// Materials are counted from stash + backpack + safe pocket + quick use (never equipped gear) and
// consumed from the stash first, then the backpack (see profile.materialTake).
import { ITEMS, makeStack, maxStack, weaponStats } from './items.js';
import { RECIPES } from '../data/recipes.js';
import { BENCHES, SCRAPPY } from '../data/benches.js';
import { SKILL_TREE } from '../data/skills.js';
import { computeStats } from './stats.js';
import { stashPut, stashFits, compactStash, materialCount, hasMaterials, takeMaterials } from './profile.js';

export { RECIPES, BENCHES, SCRAPPY };
export const BENCH_ORDER = ['workbench', 'gunsmith', 'gear_bench', 'medical_lab', 'explosives_station', 'utility_station', 'refiner'];
export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map(r => [r.id, r]));
const ok = (msg, extra = {}) => ({ ok: true, msg, ...extra });
const no = (msg, extra = {}) => ({ ok: false, msg, ...extra });
const nm = (id) => ITEMS[id]?.name || id;
const bump = (p, k, n = 1) => { p.stats = p.stats || {}; p.stats[k] = (p.stats[k] || 0) + n; };

// missing materials for cost × times: { id: shortfall }
export function missingFor(p, cost, times = 1) {
  const m = {};
  for (const [id, n] of Object.entries(cost || {})) { const have = materialCount(p, id); if (have < n * times) m[id] = n * times - have; }
  return m;
}
function pay(p, cost, times = 1) { takeMaterials(p, cost, times); compactStash(p); }
function putAll(p, stacks) { for (const s of stacks) { let left = s.qty; while (left > 0) { const n = Math.min(left, maxStack(s.id)); const r = stashPut(p, { ...makeStack(s.id, n), ...(s.extra || {}), qty: n }); if (r > 0) { p.stash.push({ ...makeStack(s.id, r) }); } left -= n; } } }

// ---------------------------------------------------------------- benches
export function benchLevel(p, id) { return id === 'workbench' ? Math.max(1, p.benches?.workbench || 1) : (p.benches?.[id] || 0); }
export function benchMax(id) { return BENCHES[id]?.levels.length || 0; }
// next level { level, cost } or null when maxed
export function benchNext(p, id) { const b = BENCHES[id]; if (!b) return null; return b.levels[benchLevel(p, id)] || null; }
export function benchUpgrade(p, id) {
  const nx = benchNext(p, id);
  if (!nx) return no(`${BENCHES[id]?.name || id} is fully upgraded`);
  if (!hasMaterials(p, nx.cost)) return no('Missing materials', { missing: missingFor(p, nx.cost) });
  pay(p, nx.cost);
  p.benches = p.benches || {};
  p.benches[id] = nx.level;
  return ok(`${BENCHES[id].name} ${nx.level === 1 ? 'built' : 'upgraded to level ' + nx.level}`, { level: nx.level });
}

// ---------------------------------------------------------------- recipes
export function recipesFor(bench) { return RECIPES.filter(r => r.bench === bench).sort((a, b) => a.level - b.level || nm(a.out).localeCompare(nm(b.out))); }
export function knowsRecipe(p, r) { return !r.blueprint || (p.blueprints || []).includes(r.id); }
// { status: 'ok' | 'bench' | 'blueprint' | 'materials', reason, missing, max }
export function recipeState(p, r) {
  if (typeof r === 'string') r = RECIPE_BY_ID[r];
  if (!r) return { status: 'none', reason: 'Unknown recipe', missing: {}, max: 0 };
  const lvl = benchLevel(p, r.bench);
  let max = Infinity;
  for (const [id, n] of Object.entries(r.in)) max = Math.min(max, Math.floor(materialCount(p, id) / n));
  if (!isFinite(max)) max = 99;
  const missing = missingFor(p, r.in);
  if (lvl < r.level) return { status: 'bench', reason: `Requires ${BENCHES[r.bench]?.name || r.bench} ${['', 'I', 'II', 'III'][r.level] || r.level}`, missing, max: 0 };
  if (!knowsRecipe(p, r)) return { status: 'blueprint', reason: 'Blueprint required', missing, max: 0 };
  if (max < 1) return { status: 'materials', reason: 'Missing materials', missing, max: 0 };
  return { status: 'ok', reason: '', missing, max };
}
export function canCraft(p, r, times = 1) { const s = recipeState(p, r); return s.status === 'ok' && s.max >= times; }
export function craft(p, r, times = 1) {
  if (typeof r === 'string') r = RECIPE_BY_ID[r];
  const st = recipeState(p, r);
  if (st.status !== 'ok') return no(st.reason, { missing: st.missing });
  times = Math.max(1, Math.min(times, st.max));
  const out = r.qty * times;
  if (!stashFits(p, [{ id: r.out, qty: out }])) return no('Stash is full');
  pay(p, r.in, times);
  putAll(p, [{ id: r.out, qty: out }]);
  bump(p, 'crafted', out);
  return ok(`Crafted ${out}x ${nm(r.out)}`, { qty: out, item: r.out });
}

// ---------------------------------------------------------------- blueprints
export function blueprintStacks(p) { return p.stash.filter(s => s && ITEMS[s.id]?.type === 'blueprint'); }
export function blueprintKnown(p, itemId) { const r = ITEMS[itemId]?.blueprint; return !!r && (p.blueprints || []).includes(r); }
// learn = consume one blueprint item from the stash (by stack uid or item id)
export function learnBlueprint(p, key) {
  const s = p.stash.find(x => x && (x.uid === key || x.id === key) && ITEMS[x.id]?.type === 'blueprint');
  if (!s) return no('Blueprint not in stash');
  const rid = ITEMS[s.id].blueprint;
  if (!RECIPE_BY_ID[rid]) return no('Unknown recipe');
  p.blueprints = p.blueprints || [];
  if (p.blueprints.includes(rid)) return no('Already learned - sell or recycle the copy');
  s.qty -= 1; compactStash(p);
  p.stash = p.stash.filter(x => x && x.qty > 0);
  p.blueprints.push(rid);
  bump(p, 'blueprints');
  return ok(`Learned ${nm(RECIPE_BY_ID[rid].out)} recipe`, { recipe: rid });
}

// ---------------------------------------------------------------- recycling
export function scrapYield(p) { return computeStats(p.skills || {}, SKILL_TREE).scrap_yield || 1; }
export function canRecycle(stack) { const d = ITEMS[stack?.id]; return !!(d && d.recycle && !stack.free && !d.bound && Object.keys(d.recycle).length); }
// expected output for qty units: { id: n } (fractions from the scrap_yield stat are floored here)
export function recyclePreview(p, stack, qty = 1) {
  const d = ITEMS[stack?.id]; if (!d?.recycle) return {};
  const y = scrapYield(p), out = {};
  for (const [id, n] of Object.entries(d.recycle)) { const v = Math.floor(n * qty * y + 1e-9); if (v > 0 && ITEMS[id]) out[id] = v; }
  return out;
}
// returns weapon mods + loaded ammo of a weapon stack to the stash
export function stripWeapon(p, s) {
  const d = ITEMS[s?.id]; if (d?.type !== 'weapon') return;
  for (const m of Object.values(s.mods || {})) putAll(p, [{ id: m, qty: 1 }]);
  s.mods = {};
  const am = d.weapon.ammo;
  if (s.ammo > 0 && !ITEMS[am]?.ammo?.refillsMag) putAll(p, [{ id: am, qty: s.ammo }]);
  s.ammo = 0;
}
export function recycle(p, uid, qty = 1, rng = Math.random) {
  const i = p.stash.findIndex(x => x && x.uid === uid);
  if (i < 0) return no('Item not found in stash');
  const s = p.stash[i];
  if (s.free) return no('Free loadout items cannot be recycled');
  if (!canRecycle(s)) return no(`${nm(s.id)} cannot be recycled`);
  qty = Math.max(1, Math.min(qty, s.qty));
  const y = scrapYield(p), out = {};
  for (const [id, n] of Object.entries(ITEMS[s.id].recycle)) {
    if (!ITEMS[id]) continue;
    const raw = n * qty * y; let v = Math.floor(raw + 1e-9); if (rng() < raw - v) v++;
    if (v > 0) out[id] = v;
  }
  const outStacks = Object.entries(out).map(([id, q]) => ({ id, qty: q }));
  // the recycled stack frees a slot if consumed entirely
  const sim = { ...p, stash: p.stash.filter((x, k) => k !== i || qty < x.qty) };
  if (!stashFits(sim, outStacks)) return no('Stash is full');
  if (ITEMS[s.id].type === 'weapon') stripWeapon(p, s);
  s.qty -= qty; if (s.qty <= 0) p.stash.splice(p.stash.indexOf(s), 1);
  compactStash(p);
  putAll(p, outStacks);
  bump(p, 'recycled', qty);
  return ok(`Recycled ${qty}x ${nm(s.id)} into ${outStacks.map(o => `${o.qty} ${nm(o.id)}`).join(', ') || 'nothing'}`, { out });
}

// ---------------------------------------------------------------- weapon tiers + repair
export function nextTier(stack) { const w = ITEMS[stack?.id]?.weapon; return w?.tiers?.find(t => t.tier === (stack.tier || 1) + 1) || null; }
export function upgradeState(p, stack) {
  const t = nextTier(stack);
  if (!t) return { next: null, ok: false, reason: ITEMS[stack?.id]?.weapon?.tiers?.length ? 'Maximum tier' : 'Cannot be upgraded', missing: {} };
  const need = t.level || 1, lvl = benchLevel(p, 'gunsmith');
  if (lvl < need) return { next: t, ok: false, reason: `Requires Gunsmith ${['', 'I', 'II', 'III'][need]}`, missing: missingFor(p, t.cost) };
  const missing = missingFor(p, t.cost);
  if (Object.keys(missing).length) return { next: t, ok: false, reason: 'Missing materials', missing };
  return { next: t, ok: true, reason: '', missing };
}
// stack: the weapon stack object (in the stash or a loadout weapon slot); upgraded in place
export function weaponUpgrade(p, stack) {
  const u = upgradeState(p, stack);
  if (!u.ok) return no(u.reason, { missing: u.missing });
  const before = weaponStats(stack);
  const frac = Math.max(0, Math.min(1, (stack.dur ?? before.durability) / before.durability));
  pay(p, u.next.cost);
  stack.tier = u.next.tier;
  const after = weaponStats(stack);
  stack.dur = Math.round(after.durability * Math.max(frac, 0.999) * 10) / 10;   // upgrades also refurbish
  if (stack.ammo > after.mag) stack.ammo = after.mag;
  bump(p, 'upgrades');
  return ok(`${nm(stack.id)} upgraded to tier ${['', 'I', 'II', 'III', 'IV'][stack.tier]}`, { tier: stack.tier });
}
const REPAIR_MATS = {
  common: (u) => ({ metal_parts: 2 * u }),
  uncommon: (u) => ({ metal_parts: 2 * u, rubber_parts: u }),
  rare: (u) => ({ metal_parts: 3 * u, mechanical_components: Math.ceil(u / 2) }),
  epic: (u) => ({ mechanical_components: u, simple_gun_parts: Math.ceil(u / 2) }),
  legendary: (u) => ({ advanced_mechanical_components: Math.ceil(u / 2), mechanical_components: u }),
};
// { items, coins, frac } or null when at full durability
export function repairCost(stack) {
  const d = ITEMS[stack?.id]; if (d?.type !== 'weapon') return null;
  const ws = weaponStats(stack), max = ws.durability, cur = stack.dur ?? max;
  if (cur >= max - 0.5) return null;
  const frac = Math.max(0, Math.min(1, (max - cur) / max));
  const units = Math.max(1, Math.ceil(frac * 4));
  const items = (REPAIR_MATS[d.rarity] || REPAIR_MATS.common)(units);
  for (const k of Object.keys(items)) if (!ITEMS[k]) delete items[k];
  return { items, coins: Math.round((d.value || 500) * 0.1 * frac / 10) * 10, frac };
}
export function repair(p, stack) {
  const c = repairCost(stack);
  if (!c) return no('Already at full durability');
  if (p.coins < c.coins) return no('Not enough Scrip');
  if (!hasMaterials(p, c.items)) return no('Missing materials', { missing: missingFor(p, c.items) });
  pay(p, c.items); p.coins -= c.coins;
  stack.dur = weaponStats(stack).durability;
  bump(p, 'repairs');
  return ok(`${nm(stack.id)} repaired`);
}

// ---------------------------------------------------------------- Scrappie (the workshop rooster)
export function scrappie(p) {
  if (!p.scrappy || typeof p.scrappy !== 'object') p.scrappy = { level: 1, pending: [] };
  if (!Array.isArray(p.scrappy.pending)) p.scrappy.pending = [];
  p.scrappy.level = Math.max(1, Math.min(SCRAPPY.levels.length, p.scrappy.level || 1));
  p.scrappy.raids = p.scrappy.raids || 0;
  return p.scrappy;
}
export function scrappieLevelDef(p) { return SCRAPPY.levels[scrappie(p).level - 1]; }
export function scrappieNext(p) { return SCRAPPY.levels[scrappie(p).level] || null; }
export function scrappieFull(p) { return scrappie(p).raids >= (SCRAPPY.capacityRaids || 5); }
// Call once per completed raid (extracted OR died). `raid` = seconds spent topside, or the raid result
// object ({ time } in seconds). Yields scale up to 15 min topside.
export function scrappieOnRaidEnd(p, raid = 900, rng = Math.random) {
  const sc = scrappie(p);
  if (scrappieFull(p)) return no('Scrappie\'s nest is full - collect his haul');
  const secs = raid && typeof raid === 'object' ? (raid.time ?? raid.raidTime ?? 900) : raid;
  const f = Number.isFinite(+secs) ? Math.max(0, Math.min(1, +secs / 900)) : 1;
  const add = [];
  for (const [id, mn, mx] of scrappieLevelDef(p).yields) {
    if (!ITEMS[id]) continue;
    const q = Math.max(mn, Math.min(mx, Math.round(mn + (mx - mn) * f * (0.8 + 0.4 * rng()))));
    if (q <= 0) continue;
    const e = sc.pending.find(x => x.id === id);
    if (e) e.qty += q; else sc.pending.push({ id, qty: q });
    add.push({ id, qty: q });
  }
  sc.raids++;
  return ok('Scrappie brought back materials', { added: add });
}
export function scrappieCollect(p) {
  const sc = scrappie(p);
  if (!sc.pending.length) return no('Nothing to collect yet');
  const rest = [], got = [];
  for (const e of sc.pending) {
    let left = e.qty;
    while (left > 0) { const n = Math.min(left, maxStack(e.id)); const l = stashPut(p, makeStack(e.id, n)); left -= n - l; if (l > 0) break; }
    if (left > 0) rest.push({ id: e.id, qty: left });
    if (e.qty - left > 0) got.push({ id: e.id, qty: e.qty - left });
  }
  sc.pending = rest;
  if (!rest.length) sc.raids = 0;
  if (!got.length) return no('Stash is full');
  return ok(rest.length ? 'Stash full - some items are still waiting' : `Collected ${got.reduce((a, b) => a + b.qty, 0)} items from Scrappie`, { got });
}
export function scrappieUpgrade(p) {
  const nx = scrappieNext(p);
  if (!nx) return no('Scrappie is fully grown');
  if (!hasMaterials(p, nx.cost)) return no('Missing items', { missing: missingFor(p, nx.cost) });
  pay(p, nx.cost);
  scrappie(p).level = nx.level;
  return ok(`Scrappie is now level ${nx.level}`);
}
