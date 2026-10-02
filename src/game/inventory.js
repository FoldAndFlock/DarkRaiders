// Loadout / stash inventory model. Slot-based like ARC Raiders: augment defines backpack, quick-use,
// safe-pocket and weapon slot counts + weight limit; skills add on top.
import { ITEMS, maxStack, makeStack, stackWeight } from './items.js';

const NO_AUGMENT = { backpack: 10, weightLimit: 25, quick: 2, safe: 0, weaponSlots: 2, shields: [] };
export const QUICK_TYPES = new Set(['consumable', 'grenade', 'trap', 'gadget']);

export function emptyLoadout() {
  return { augment: null, shield: null, weapons: [null, null, null], backpack: [], quick: [], safe: [] };
}

export function capacities(lo, stats = {}) {
  const a = ITEMS[lo.augment?.id]?.augment || NO_AUGMENT;
  const extra = a.extra ? Object.values(a.extra).reduce((s, v) => s + v, 0) : 0;
  return {
    backpack: Math.max(1, Math.round((a.backpack || 10) + (stats.backpack_slots || 0))),
    quick: Math.max(1, Math.round((a.quick || 2) + extra + (stats.quick_slots || 0))),
    safe: Math.max(0, Math.round((a.safe || 0) + (stats.safe_slots || 0))),
    weaponSlots: a.weaponSlots || 2,
    weightLimit: (a.weightLimit || 25) + (stats.carry_weight || 0),
    shields: a.shields || [],
    perk: a.perk || null,
  };
}

// resize slot arrays to capacity; returns overflow stacks that no longer fit
export function fitLoadout(lo, caps) {
  const over = [];
  const fit = (arr, n) => {
    while (arr.length < n) arr.push(null);
    while (arr.length > n) { const s = arr.pop(); if (s) over.push(s); }
  };
  fit(lo.backpack, caps.backpack); fit(lo.quick, caps.quick); fit(lo.safe, caps.safe);
  while (lo.weapons.length < 3) lo.weapons.push(null);
  for (let i = caps.weaponSlots; i < lo.weapons.length; i++) if (lo.weapons[i]) { over.push(lo.weapons[i]); lo.weapons[i] = null; }
  if (lo.shield && caps.shields.length && !caps.shields.includes(ITEMS[lo.shield.id]?.shield?.cls)) { over.push(lo.shield); lo.shield = null; }
  if (lo.shield && !caps.shields.length) { over.push(lo.shield); lo.shield = null; }
  return over;
}

export function loadoutWeight(lo) {
  let w = 0;
  for (const s of [lo.augment, lo.shield, ...lo.weapons, ...lo.backpack, ...lo.quick, ...lo.safe]) if (s) w += stackWeight(s);
  return w;
}

// add a stack into an array of slots (merge first, then empty slots). Returns leftover qty.
export function addToSlots(arr, stack) {
  let left = stack.qty;
  const ms = maxStack(stack.id);
  if (ms > 1) for (const s of arr) {
    if (!s || s.id !== stack.id || s.qty >= ms) continue;
    const take = Math.min(ms - s.qty, left); s.qty += take; left -= take;
    if (!left) return 0;
  }
  for (let i = 0; i < arr.length && left > 0; i++) {
    if (arr[i]) continue;
    const take = Math.min(ms, left);
    arr[i] = { ...stack, qty: take, uid: left === stack.qty ? stack.uid : stack.uid + '_' + i };
    left -= take;
  }
  return left;
}
export function canAddToSlots(arr, id, qty) {
  const ms = maxStack(id); let room = 0;
  for (const s of arr) { if (!s) room += ms; else if (s.id === id && ms > 1) room += ms - s.qty; if (room >= qty) return true; }
  return room >= qty;
}

// pick up into the loadout: quick slots first for usables already present, then backpack
export function pickUp(lo, stack) {
  const def = ITEMS[stack.id];
  let s = { ...stack };
  if (QUICK_TYPES.has(def?.type) && lo.quick.some(q => q && q.id === s.id)) s.qty = addToSlots(lo.quick, s);
  if (s.qty > 0 && def?.type === 'weapon') {
    const i = lo.weapons.findIndex((w, k) => !w && k < 2);
    if (i >= 0) { lo.weapons[i] = s; return 0; }
  }
  if (s.qty > 0) s.qty = addToSlots(lo.backpack, s);
  return s.qty;
}

export function countIn(arrs, id) { let n = 0; for (const a of arrs) for (const s of a) if (s && s.id === id) n += s.qty; return n; }
export function countLoadout(lo, id) { return countIn([lo.backpack, lo.quick, lo.safe], id); }
// remove qty of id from slot arrays (backpack first). Returns removed amount.
export function takeFrom(arrs, id, qty) {
  let need = qty;
  for (const a of arrs) for (let i = a.length - 1; i >= 0 && need > 0; i--) {
    const s = a[i]; if (!s || s.id !== id) continue;
    const t = Math.min(s.qty, need); s.qty -= t; need -= t;
    if (s.qty <= 0) a[i] = null;
  }
  return qty - need;
}

// generic slot addressing for drag & drop: { c: container, i: index }
export function getSlot(lo, ref, extra = {}) {
  if (ref.c === 'augment') return lo.augment;
  if (ref.c === 'shield') return lo.shield;
  const arr = ref.c === 'weapons' ? lo.weapons : ref.c in lo ? lo[ref.c] : extra[ref.c];
  return arr ? arr[ref.i] : null;
}
export function setSlot(lo, ref, val, extra = {}) {
  if (ref.c === 'augment') { lo.augment = val; return; }
  if (ref.c === 'shield') { lo.shield = val; return; }
  const arr = ref.c === 'weapons' ? lo.weapons : ref.c in lo ? lo[ref.c] : extra[ref.c];
  if (arr) arr[ref.i] = val;
}
// can stack s go into slot ref?
export function accepts(ref, s, caps) {
  if (!s) return true;
  const def = ITEMS[s.id]; if (!def) return false;
  switch (ref.c) {
    case 'augment': return def.type === 'augment';
    case 'shield': return def.type === 'shield' && (!caps || caps.shields.includes(def.shield?.cls));
    case 'weapons': return def.type === 'weapon' && (!caps || ref.i < caps.weaponSlots);
    case 'quick': return QUICK_TYPES.has(def.type);
    default: return true;
  }
}
// move/merge/swap between two refs (possibly across loadout and an extra container like stash/loot)
export function moveSlot(lo, from, to, extra = {}, caps = null) {
  const a = getSlot(lo, from, extra), b = getSlot(lo, to, extra);
  if (!a) return false;
  if (b && b.id === a.id && maxStack(a.id) > 1) {
    const room = maxStack(a.id) - b.qty; if (room <= 0) return false;
    const t = Math.min(room, a.qty); b.qty += t; a.qty -= t;
    if (a.qty <= 0) setSlot(lo, from, null, extra);
    return true;
  }
  if (!accepts(to, a, caps) || !accepts(from, b, caps)) return false;
  setSlot(lo, to, a, extra); setSlot(lo, from, b || null, extra);
  return true;
}
export function splitSlot(lo, ref, extra = {}) {
  const s = getSlot(lo, ref, extra); if (!s || s.qty < 2) return null;
  const half = Math.floor(s.qty / 2); s.qty -= half;
  return makeStack(s.id, half);
}
export function allStacks(lo) { return [lo.augment, lo.shield, ...lo.weapons, ...lo.backpack, ...lo.quick, ...lo.safe].filter(Boolean); }
