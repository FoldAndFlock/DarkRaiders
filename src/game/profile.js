// Persistent player profile: stash, loadout, workshop, blueprints, skills, quests, stats.
// Saved to localStorage (primary) + mirrored into chunked cookies, and exportable/importable as JSON.
import { ITEMS, makeStack, maxStack } from './items.js';
import { emptyLoadout, addToSlots, allStacks, fitLoadout, capacities } from './inventory.js';
import { XP_CURVE } from '../data/skills.js';

export const SAVE_VERSION = 1;
const KEY = 'darkraiders_save_v1';

export function newProfile(name = 'Raider') {
  const p = {
    version: SAVE_VERSION, name, created: Date.now(), updated: Date.now(),
    level: 1, xp: 0, skillPoints: 0, skills: {},
    coins: 2500, stashSize: 120, stash: [],
    loadout: emptyLoadout(),
    benches: { workbench: 1, gunsmith: 0, gear_bench: 0, medical_lab: 0, explosives_station: 0, utility_station: 0, refiner: 0 },
    scrappy: { level: 1, pending: [] },
    blueprints: [],
    quests: { active: {}, done: [] },
    stats: { raids: 0, extracts: 0, deaths: 0, arkKills: 0, raiderKills: 0, looted: 0, bestHaul: 0 },
    settings: { master: 0.8, music: 0.6, sfx: 0.9, ui: 0.8, outfit: 'scav' },
    seenIntro: false,
  };
  // starter kit
  const lo = p.loadout;
  lo.augment = makeStack(ITEMS.looting_mk_1 ? 'looting_mk_1' : 'free_loadout_augment');
  lo.shield = ITEMS.light_shield ? makeStack('light_shield') : null;
  lo.weapons[0] = ITEMS.ferrox ? makeStack('ferrox') : null;
  lo.weapons[1] = ITEMS.kettel ? makeStack('kettel') : null;
  for (const w of lo.weapons) if (w) w.ammo = ITEMS[w.id].weapon.mag;
  fitLoadout(lo, capacities(lo, {}));
  const give = (id, n) => { if (ITEMS[id]) addToSlots(lo.backpack, makeStack(id, n)); };
  give('ammo_heavy', 24); give('ammo_light', 60);
  if (ITEMS.bandage) lo.quick[0] = makeStack('bandage', 3);
  if (ITEMS.shield_recharger) lo.quick[1] = makeStack('shield_recharger', 2);
  if (ITEMS.light_impact_grenade) lo.quick[2] = makeStack('light_impact_grenade', 2);
  // starter stash
  const st = (id, n) => { if (ITEMS[id]) stashAdd(p, makeStack(id, Math.min(n, maxStack(id)))); };
  st('metal_parts', 30); st('plastic_parts', 20); st('rubber_parts', 20); st('fabric', 15); st('chemicals', 10);
  st('ammo_medium', 60); st('ammo_light', 80); st('bandage', 4); st('rattlr', 1); st('stitchr', 1);
  st('free_loadout_augment', 1); st('combat_mk_1', 1);
  // the first Auntie Synergy (celesta) quests are active from the start
  return p;
}

export function stashAdd(p, stack) {
  let left = addToSlots(p.stash, { ...stack });
  while (left > 0 && p.stash.length < p.stashSize) { p.stash.push(null); left = addToSlots(p.stash, { ...stack, qty: left }); }
  compactStash(p);
  return left;
}
export function compactStash(p) { p.stash = p.stash.filter(Boolean); }
export function stashCount(p, id) { let n = 0; for (const s of p.stash) if (s?.id === id) n += s.qty; return n; }
export function stashTake(p, id, qty) {
  let need = qty;
  for (let i = p.stash.length - 1; i >= 0 && need > 0; i--) { const s = p.stash[i]; if (!s || s.id !== id) continue; const t = Math.min(need, s.qty); s.qty -= t; need -= t; if (s.qty <= 0) p.stash[i] = null; }
  compactStash(p);
  return qty - need;
}
// count across stash + current loadout (for crafting)
export function ownedCount(p, id) { let n = stashCount(p, id); for (const s of allStacks(p.loadout)) if (s.id === id) n += s.qty; return n; }

// ---------------------------------------------------------------- XP / levels
export function xpForLevel(l) { return XP_CURVE?.[l - 1] ?? Math.round(1000 * Math.pow(l, 1.6)); }
export function addXP(p, n) {
  p.xp += n; let gained = 0;
  while (p.level < 75 && p.xp >= xpForLevel(p.level)) { p.xp -= xpForLevel(p.level); p.level++; p.skillPoints++; gained++; }
  return gained;
}

// ---------------------------------------------------------------- persistence
export function save(p) {
  p.updated = Date.now();
  const json = JSON.stringify(p);
  try { localStorage.setItem(KEY, json); } catch (e) { /* storage disabled */ }
  try { writeCookies(json); } catch (e) { /* too big / disabled */ }
}
export function load() {
  let a = null, b = null;
  try { const s = localStorage.getItem(KEY); if (s) a = JSON.parse(s); } catch (e) { a = null; }
  try { const s = readCookies(); if (s) b = JSON.parse(s); } catch (e) { b = null; }
  const p = (a && b) ? (a.updated >= b.updated ? a : b) : (a || b);
  return p ? migrate(p) : null;
}
export function migrate(p) {
  const d = newProfile(p.name);
  for (const k of Object.keys(d)) if (p[k] === undefined) p[k] = d[k];
  p.stash = (p.stash || []).filter(s => s && ITEMS[s.id]);
  for (const k of ['backpack', 'quick', 'safe']) p.loadout[k] = (p.loadout[k] || []).map(s => s && ITEMS[s.id] ? s : null);
  p.loadout.weapons = (p.loadout.weapons || [null, null, null]).map(s => s && ITEMS[s.id] ? s : null);
  return p;
}
export function exportJSON(p) {
  const blob = new Blob([JSON.stringify(p, null, 1)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `darkraiders-${(p.name || 'raider').replace(/\W+/g, '_')}-lv${p.level}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export function importJSON(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => { try { const p = JSON.parse(r.result); if (!p || !p.loadout || !Array.isArray(p.stash)) throw new Error('Not a DarkRaiders save'); res(migrate(p)); } catch (e) { rej(e); } };
    r.onerror = () => rej(r.error);
    r.readAsText(file);
  });
}
export function wipe() { try { localStorage.removeItem(KEY); } catch (e) { /* */ } clearCookies(); }

// chunked, base64 cookie mirror (~3.6 KB per cookie)
const CK = 'dr_s';
function b64(s) { return btoa(unescape(encodeURIComponent(s))); }
function unb64(s) { return decodeURIComponent(escape(atob(s))); }
function writeCookies(json) {
  const data = b64(json), size = 3600, n = Math.ceil(data.length / size);
  if (n > 40) return;   // too big for cookies; localStorage + file export still work
  clearCookies();
  const exp = new Date(Date.now() + 365 * 864e5).toUTCString();
  document.cookie = `${CK}_n=${n}; expires=${exp}; path=/; SameSite=Lax`;
  for (let i = 0; i < n; i++) document.cookie = `${CK}_${i}=${data.slice(i * size, (i + 1) * size)}; expires=${exp}; path=/; SameSite=Lax`;
}
function readCookies() {
  const map = Object.fromEntries(document.cookie.split('; ').filter(Boolean).map(c => { const i = c.indexOf('='); return [c.slice(0, i), c.slice(i + 1)]; }));
  const n = +map[CK + '_n']; if (!n) return null;
  let s = ''; for (let i = 0; i < n; i++) { if (map[CK + '_' + i] == null) return null; s += map[CK + '_' + i]; }
  return unb64(s);
}
function clearCookies() {
  for (const c of document.cookie.split('; ')) { const k = c.split('=')[0]; if (k.startsWith(CK + '_')) document.cookie = `${k}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`; }
}

// ---------------------------------------------------------------- stash / material helpers (hub, crafting, quests)
// Like stashAdd, but never merges free-loadout stacks (stack.free) with normal ones. Returns leftover qty.
export function stashPut(p, stack) {
  const ms = maxStack(stack.id), free = !!stack.free;
  let left = stack.qty, first = true;
  if (ms > 1) for (const s of p.stash) {
    if (!s || s.id !== stack.id || !!s.free !== free || s.qty >= ms) continue;
    const t = Math.min(ms - s.qty, left); s.qty += t; left -= t; first = false;
    if (!left) return 0;
  }
  compactStash(p);
  while (left > 0 && p.stash.length < p.stashSize) {
    const t = Math.min(ms, left);
    p.stash.push({ ...stack, qty: t, uid: first ? (stack.uid || makeStack(stack.id).uid) : makeStack(stack.id).uid });
    first = false; left -= t;
  }
  return left;
}
// Would all these stacks ([{ id, qty, free? }]) fit into the stash right now?
export function stashFits(p, stacks) {
  const sim = { stash: p.stash.filter(Boolean).map(s => ({ id: s.id, qty: s.qty, free: s.free })), stashSize: p.stashSize };
  for (const s of stacks) if (s && s.qty > 0 && stashPut(sim, { id: s.id, qty: s.qty, free: s.free, uid: 'sim' }) > 0) return false;
  return true;
}
export function stashFreeSlots(p) { return Math.max(0, p.stashSize - p.stash.filter(Boolean).length); }
// Materials usable by the workshop / quest turn-ins: stash + backpack + safe pocket + quick use
// (never the equipped augment, shield or weapons).
export function materialCount(p, id) {
  let n = stashCount(p, id);
  for (const a of [p.loadout.backpack, p.loadout.safe, p.loadout.quick]) for (const s of a || []) if (s && s.id === id) n += s.qty;
  return n;
}
// Consume from the stash first, then backpack, safe pocket, quick use. Returns the amount removed.
export function materialTake(p, id, qty) {
  let got = stashTake(p, id, qty);
  for (const a of [p.loadout.backpack, p.loadout.safe, p.loadout.quick]) {
    if (!a) continue;
    for (let i = a.length - 1; i >= 0 && got < qty; i--) {
      const s = a[i]; if (!s || s.id !== id) continue;
      const t = Math.min(s.qty, qty - got); s.qty -= t; got += t; if (s.qty <= 0) a[i] = null;
    }
  }
  return got;
}
export function hasMaterials(p, cost, times = 1) { for (const [id, n] of Object.entries(cost || {})) if (materialCount(p, id) < n * times) return false; return true; }
export function takeMaterials(p, cost, times = 1) { for (const [id, n] of Object.entries(cost || {})) materialTake(p, id, n * times); }
