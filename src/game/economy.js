// Speranzia economy: trader stock + pricing, selling, stash expansions and the free loadout.
// Pure logic on a profile object (no DOM). Every mutating call returns { ok, msg, ... }.
import { ITEMS, makeStack, maxStack, stackValue, weaponStats } from './items.js';
import { TRADERS } from '../data/traders.js';
import { emptyLoadout, capacities, fitLoadout, allStacks, addToSlots } from './inventory.js';
import { stashPut, stashFits, compactStash } from './profile.js';

export const TRADER_ORDER = ['celesta', 'shanni', 'tien_wen', 'apolo', 'lantz'];
export const RESTOCK_RAIDS = 2;            // trader stock refreshes every N completed raids
export const STASH_RULES = { base: 120, step: 20, max: 320 };
const ok = (msg, extra = {}) => ({ ok: true, msg, ...extra });
const no = (msg, extra = {}) => ({ ok: false, msg, ...extra });
const raidsOf = (p) => p.stats?.raids || 0;

// ---------------------------------------------------------------- trader stock
// profile.traders = { epoch, bought: { [traderId]: { [itemId]: n } } }; epoch = floor(raids / RESTOCK_RAIDS)
export function traderState(p) {
  const epoch = Math.floor(raidsOf(p) / RESTOCK_RAIDS);
  if (!p.traders || typeof p.traders !== 'object' || p.traders.epoch !== epoch) p.traders = { epoch, bought: {} };
  if (!p.traders.bought) p.traders.bought = {};
  return p.traders;
}
export function restockIn(p) { return RESTOCK_RAIDS - (raidsOf(p) % RESTOCK_RAIDS); }
const questDone = (p, id) => (p.quests?.done || []).includes(id);

// [{ item, price, stock, left, locked, unlock }]
export function traderStock(p, tid) {
  const t = TRADERS[tid]; if (!t) return [];
  const bought = traderState(p).bought[tid] || {};
  return t.sells.filter(e => ITEMS[e.item]).map(e => ({
    item: e.item, price: e.price, stock: e.stock, left: Math.max(0, e.stock - (bought[e.item] || 0)),
    locked: !!(e.unlock && !questDone(p, e.unlock)), unlock: e.unlock || null,
  }));
}
export function canSellTo(tid, id) {
  const t = TRADERS[tid], d = ITEMS[id]; if (!t || !d) return false;
  if (d.bound || d.type === 'quest') return false;
  return t.buys === 'all' || (Array.isArray(t.buys) && t.buys.includes(d.type));
}
// per-unit sell value (weapons use their tier value); free-loadout items sell for nothing
export function unitSellPrice(stack) {
  if (!stack || stack.free) return 0;
  const d = ITEMS[stack.id]; if (!d || d.bound) return 0;
  return stackValue({ ...stack, qty: 1 });
}
// value including attached weapon mods
export function fullValue(stack) {
  if (!stack) return 0;
  let v = stackValue(stack);
  for (const m of Object.values(stack.mods || {})) v += ITEMS[m]?.value || 0;
  return v;
}
export function sellPrice(stack, qty = stack?.qty || 1) { return unitSellPrice(stack) * qty; }

export function buy(p, tid, itemId, qty = 1) {
  const e = traderStock(p, tid).find(x => x.item === itemId);
  if (!e) return no('Not sold here');
  if (e.locked) return no('Locked - complete the quest first');
  qty = Math.max(1, Math.min(qty, e.left));
  if (e.left <= 0) return no('Sold out - restocks in ' + restockIn(p) + ' raid(s)');
  const cost = e.price * qty;
  if (p.coins < cost) return no('Not enough Scrip');
  if (!stashFits(p, [{ id: itemId, qty }])) return no('Stash is full');
  const st = traderState(p);
  st.bought[tid] = st.bought[tid] || {};
  st.bought[tid][itemId] = (st.bought[tid][itemId] || 0) + qty;
  p.coins -= cost;
  let left = qty;
  while (left > 0) { const n = Math.min(left, maxStack(itemId)); stashPut(p, makeStack(itemId, n)); left -= n; }
  return ok(`Bought ${qty}x ${ITEMS[itemId].name}`, { cost, qty });
}

// Sell qty from a stash stack (by uid). Weapon mods are detached back to the stash and loaded ammo unloaded.
export function sell(p, tid, uid, qty = null) {
  const i = p.stash.findIndex(s => s && s.uid === uid);
  if (i < 0) return no('Item not found');
  const s = p.stash[i];
  if (s.free) return no('Free loadout items cannot be sold');
  if (!canSellTo(tid, s.id)) return no(`${TRADERS[tid]?.name || 'Trader'} does not buy that`);
  qty = Math.max(1, Math.min(qty ?? s.qty, s.qty));
  const returns = [];
  if (ITEMS[s.id].type === 'weapon') {
    for (const m of Object.values(s.mods || {})) returns.push(makeStack(m, 1));
    if (s.ammo > 0 && !ITEMS[ITEMS[s.id].weapon.ammo]?.ammo?.refillsMag) returns.push(makeStack(ITEMS[s.id].weapon.ammo, s.ammo));
  }
  const coins = unitSellPrice(s) * qty;
  s.qty -= qty; if (s.qty <= 0) p.stash[i] = null;
  compactStash(p);
  for (const r of returns) stashPut(p, r);
  p.coins += coins;
  p.stats = p.stats || {}; p.stats.sold = (p.stats.sold || 0) + coins;
  return ok(`Sold ${qty}x ${ITEMS[s.id].name} for ${coins.toLocaleString('en-US')}`, { coins, qty });
}

// ---------------------------------------------------------------- stash expansion
export function stashExpansion(p) {
  const n = Math.max(0, Math.round((p.stashSize - STASH_RULES.base) / STASH_RULES.step));
  if (p.stashSize >= STASH_RULES.max) return { slots: 0, price: 0, maxed: true, n };
  const price = Math.round(5000 * Math.pow(1.55, n) / 500) * 500;
  return { slots: STASH_RULES.step, price, maxed: false, n };
}
export function buyStashExpansion(p) {
  const e = stashExpansion(p);
  if (e.maxed) return no('Stash is fully expanded');
  if (p.coins < e.price) return no('Not enough Scrip');
  p.coins -= e.price; p.stashSize += e.slots;
  return ok(`Stash expanded to ${p.stashSize} slots`, { cost: e.price });
}

// ---------------------------------------------------------------- free loadout (ARC Raiders style)
// A random basic kit, all items flagged { free: true } (unsellable, cannot be recycled). One claim per raid.
export const FREE_GUNS = Object.keys(ITEMS).filter(id => ITEMS[id].type === 'weapon' && ITEMS[id].rarity === 'common' && (ITEMS[id].weapon.tiers || []).length);
export const AMMO_TARGET = { ammo_light: 60, ammo_medium: 48, ammo_heavy: 24, ammo_shotgun: 16, ammo_energy: 2, ammo_launcher: 6 };
export function reserveTarget(stack) {
  const w = weaponStats(stack); if (!w) return 0;
  return Math.min(maxStack(w.ammo) * 2, Math.max(AMMO_TARGET[w.ammo] || 30, w.mag * 3));
}
export function freeLoadoutAvailable(p) { return p.freeLoadoutRaid == null || p.freeLoadoutRaid !== raidsOf(p); }

export function makeFreeLoadout(rng = Math.random) {
  const pick = (a) => a[Math.floor(rng() * a.length) % a.length];
  const lo = emptyLoadout();
  const F = { free: true };
  lo.augment = makeStack('free_loadout_augment', 1, F);
  if (ITEMS.light_shield && rng() < 0.6) lo.shield = makeStack('light_shield', 1, F);
  const gun = makeStack(pick(FREE_GUNS.length ? FREE_GUNS : ['kettel']), 1, F);
  const ws = weaponStats(gun);
  gun.ammo = ws.mag;
  gun.dur = Math.round(ws.durability * (0.7 + rng() * 0.3));
  lo.weapons[0] = gun;
  fitLoadout(lo, capacities(lo, {}));
  addToSlots(lo.backpack, makeStack(ws.ammo, Math.min(maxStack(ws.ammo), reserveTarget(gun)), F));
  if (ITEMS.bandage) lo.quick[0] = makeStack('bandage', 3, F);
  if (ITEMS.light_impact_grenade && rng() < 0.5) lo.quick[1] = makeStack('light_impact_grenade', 1 + Math.floor(rng() * 2), F);
  else if (ITEMS.shield_recharger && lo.shield && rng() < 0.5) lo.quick[1] = makeStack('shield_recharger', 1, F);
  return lo;
}
// Moves the current loadout to the stash, then equips a free kit.
export function claimFreeLoadout(p, rng = Math.random) {
  if (!freeLoadoutAvailable(p)) return no('Free loadout already claimed - one per raid');
  const cur = allStacks(p.loadout);
  if (!stashFits(p, cur)) return no('Stash is too full to store your current loadout');
  for (const s of cur) stashPut(p, s);
  p.loadout = makeFreeLoadout(rng);
  p.freeLoadoutRaid = raidsOf(p);
  return ok('Free loadout issued: ' + ITEMS[p.loadout.weapons[0].id].name);
}
