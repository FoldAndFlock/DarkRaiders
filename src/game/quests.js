// Quest state machine (pure logic on a profile; no DOM).
// profile.quests = { active: { [questId]: { prog: [n per step], t: acceptedAt } }, done: [questId] }
//
// In-raid hooks (call with the raid's live profile; all are idempotent for completed steps):
//   questEvent(p, 'kill',    { target: arkId | alias, map, with?: itemId | 'grenade' })
//   questEvent(p, 'loot',    { item, qty, map })
//   questEvent(p, 'visit',   { poi, aliases?: [..], map, loadout? })   // fire on entering a POI (and
//                                                                      // periodically while inside)
//   questEvent(p, 'search',  { container: kind, map, poi? })
//   questEvent(p, 'extract', { map })
// It returns [{ quest, name, step, text, done }] for every step that progressed (for the kill feed).
// 'deliver' steps are completed at turn-in from stash + backpack. activeObjectives(p, mapId) gives
// up to 4 short { text, done } lines for the in-raid HUD.
import { QUESTS, QUEST_POIS } from '../data/quests.js';
import { ARK, ARK_ALIAS, ARK_HUSKS } from '../data/arc.js';
import { ITEMS, makeStack, maxStack } from './items.js';
import { addXP, stashPut, stashFits, materialCount, materialTake, compactStash } from './profile.js';
import { takeFrom, countIn } from './inventory.js';
import { XP_REWARDS } from '../data/skills.js';

export { QUESTS, QUEST_POIS };
export const QUEST_BY_ID = Object.fromEntries(QUESTS.map(q => [q.id, q]));
export const MAP_NAMES = { damn_grounds: 'Damn Grounds', green_gate: 'Green Gate', sandy_city: 'Sandy City', test_range: 'Test Range' };
const ok = (msg, extra = {}) => ({ ok: true, msg, ...extra });
const no = (msg, extra = {}) => ({ ok: false, msg, ...extra });
const nm = (id) => ITEMS[id]?.name || id;
const title = (s) => String(s).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function qs(p) {
  if (!p.quests || typeof p.quests !== 'object') p.quests = { active: {}, done: [] };
  if (!p.quests.active) p.quests.active = {};
  if (!Array.isArray(p.quests.done)) p.quests.done = [];
  // tolerate older shapes (array progress)
  for (const [id, a] of Object.entries(p.quests.active)) {
    if (!QUEST_BY_ID[id]) { delete p.quests.active[id]; continue; }
    if (Array.isArray(a)) p.quests.active[id] = { prog: a, t: Date.now() };
    const e = p.quests.active[id]; const n = QUEST_BY_ID[id].steps.length;
    if (!Array.isArray(e.prog)) e.prog = [];
    while (e.prog.length < n) e.prog.push(0);
  }
  return p.quests;
}

// ---------------------------------------------------------------- state
export function questState(p, id) {
  const q = qs(p);
  if (q.done.includes(id)) return 'done';
  if (q.active[id]) return 'active';
  const d = QUEST_BY_ID[id]; if (!d) return 'none';
  return (d.requires || []).every(r => q.done.includes(r)) ? 'available' : 'locked';
}
export function availableQuests(p) { return QUESTS.filter(d => questState(p, d.id) === 'available'); }
export function activeQuests(p) { const a = qs(p).active; return Object.keys(a).sort((x, y) => (a[x].t || 0) - (a[y].t || 0)).map(id => QUEST_BY_ID[id]).filter(Boolean); }
export function doneQuests(p) { return qs(p).done.map(id => QUEST_BY_ID[id]).filter(Boolean); }
export function questsByGiver(p, giver) { return QUESTS.filter(d => d.giver === giver).map(d => ({ quest: d, state: questState(p, d.id) })); }

// New profiles start with the first chain step(s) accepted (quests with no requirements).
export function initQuests(p) {
  const q = qs(p);
  if (!p.questsInit) {
    p.questsInit = true;
    if (!Object.keys(q.active).length && !q.done.length) for (const d of QUESTS) if (!(d.requires || []).length) acceptQuest(p, d.id, { force: true });
  }
  return q;
}

export function acceptQuest(p, id, { force = false } = {}) {
  const d = QUEST_BY_ID[id]; if (!d) return no('Unknown quest');
  const st = questState(p, id);
  if (st !== 'available') return no(st === 'active' ? 'Already active' : st === 'done' ? 'Already completed' : 'Locked');
  const grants = Object.entries(d.grants || {}).filter(([k]) => ITEMS[k]).map(([k, n]) => ({ id: k, qty: n }));
  if (grants.length && !force && !stashFits(p, grants)) return no('Stash is full - make room for the quest items');
  qs(p).active[id] = { prog: d.steps.map(() => 0), t: Date.now() };
  for (const g of grants) giveItems(p, g.id, g.qty);
  return ok(`Accepted: ${d.name}`, { granted: grants });
}
export function abandonQuest(p, id) {
  const q = qs(p); if (!q.active[id]) return no('Not active');
  delete q.active[id];
  return ok(`Abandoned: ${QUEST_BY_ID[id]?.name || id}`);
}

// ---------------------------------------------------------------- step text + progress
const arkName = (t) => t === 'any' ? 'ARK' : (ARK[t]?.name || ARK[ARK_ALIAS[t]]?.name || title(t));
const containerName = (c) => {
  if (Array.isArray(c)) return c.map(containerName).join(' / ');
  if (c === 'any') return 'containers';
  return ARK_HUSKS?.[c]?.name || title(c);
};
export function poiName(map, poi) { return (QUEST_POIS[map]?.[poi]?.name || title(poi)).replace(/\s*\(any\)/i, ''); }
const withName = (w) => w === 'grenade' ? 'grenades' : Array.isArray(w) ? w.map(nm).join(' / ') : nm(w);
export function stepNeed(step) { return step.kind === 'visit' || step.kind === 'extract' ? 1 : Math.max(1, step.count || 1); }

// long, descriptive text for the hub
export function stepText(step) {
  const map = step.map ? MAP_NAMES[step.map] || title(step.map) : null;
  const at = (s) => s + (step.poi && step.kind !== 'visit' ? ` at ${poiName(step.map, step.poi)}` : '') + (map ? ` (${map})` : '');
  switch (step.kind) {
    case 'kill': return at(`Destroy ${step.count > 1 ? step.count + ' ' : ''}${arkName(step.target)}${step.with ? ' using ' + withName(step.with) : ''}`);
    case 'loot': return at(`Find ${step.count > 1 ? step.count + 'x ' : ''}${nm(step.item)}`);
    case 'visit': return (step.label || `Visit ${poiName(step.map, step.poi)}`) + (map ? ` (${map})` : '');
    case 'extract': return `Extract${map ? ' from ' + map : ' from any map'}`;
    case 'deliver': return `Deliver ${step.count}x ${nm(step.item)}`;
    case 'search': return at(`Search ${step.count > 1 ? step.count + ' ' : ''}${containerName(step.container)}`);
    default: return title(step.kind);
  }
}
// short text (<= 22 chars) for the HUD objective list
export function stepShort(step, have = 0) {
  const n = stepNeed(step), c = n > 1 ? ` ${Math.min(have, n)}/${n}` : '';
  let t;
  switch (step.kind) {
    case 'kill': t = `${step.with ? 'Blast' : 'Kill'} ${arkName(step.target)}`; break;
    case 'loot': t = `Find ${nm(step.item)}`; break;
    case 'visit': { const verb = (step.label || 'Visit').split(' ')[0]; t = `${/^(the|a|an)$/i.test(verb) ? 'Visit' : verb} ${poiName(step.map, step.poi)}`; break; }
    case 'extract': t = 'Extract'; break;
    case 'deliver': t = `Bring ${nm(step.item)}`; break;
    case 'search': t = `Search ${containerName(step.container).replace(/ \/ .*/, '')}`; break;
    default: t = title(step.kind);
  }
  const room = 22 - c.length;
  if (t.length > room) t = t.slice(0, room - 1).trimEnd() + '.';
  return t + c;
}
// { have, need, done } for step i (deliver steps are counted live from stash + backpack)
export function stepProgress(p, qid, i) {
  const d = QUEST_BY_ID[qid], step = d?.steps[i]; if (!step) return { have: 0, need: 1, done: false };
  const need = stepNeed(step);
  if (qs(p).done.includes(qid)) return { have: need, need, done: true, deliver: step.kind === 'deliver' };
  if (step.kind === 'deliver') { const have = Math.min(need, materialCount(p, step.item)); return { have, need, done: have >= need, deliver: true }; }
  const a = qs(p).active[qid];
  const have = qs(p).done.includes(qid) ? need : Math.min(need, a?.prog?.[i] || 0);
  return { have, need, done: have >= need };
}
export function questProgress(p, qid) {
  const d = QUEST_BY_ID[qid]; if (!d) return 0;
  let s = 0; d.steps.forEach((st, i) => { const g = stepProgress(p, qid, i); s += g.have / g.need; });
  return s / d.steps.length;
}

// ---------------------------------------------------------------- events
function normArk(t) { return t ? (ARK[t] ? t : ARK_ALIAS[t] || t) : t; }
function mapOk(step, data) { return !step.map || !data.map || step.map === data.map; }
export function poiMatches(stepPoi, map, data) {
  if (!stepPoi) return true;
  const cands = [data.poi, data.id, ...(data.aliases || [])].filter(Boolean).map(s => String(s).toLowerCase());
  if (!cands.length) return false;
  const orig = QUEST_POIS[map]?.[stepPoi]?.original;
  const targets = [stepPoi, orig].filter(Boolean);
  if (cands.some(c => targets.includes(c))) return true;
  if (stepPoi === 'field_depot' && cands.some(c => c.includes('field_depot') || c.includes('depot'))) return true;
  return false;
}
// loot/search steps with a `poi` only check it when the raid reports POIs (data.poi !== undefined)
function poiLenient(step, data) { return !step.poi || data.poi === undefined || poiMatches(step.poi, step.map || data.map, data); }
function withOk(step, data) {
  if (!step.with) return true;
  const w = data.with; if (!w) return false;
  if (step.with === 'grenade') return w === 'grenade' || ['grenade', 'trap'].includes(ITEMS[w]?.type) || !!data.grenade;
  return Array.isArray(step.with) ? step.with.includes(w) : step.with === w;
}
function canUse(lo, use) { if (!use) return true; for (const [id, n] of Object.entries(use)) if (countIn([lo.backpack || [], lo.safe || [], lo.quick || []], id) < n) return false; return true; }
function doUse(lo, use) { for (const [id, n] of Object.entries(use || {})) takeFrom([lo.backpack || [], lo.safe || [], lo.quick || []], id, n); }

export function questEvent(p, kind, data = {}) {
  initQuests(p);
  const changed = [];
  const lo = data.loadout || p.loadout;
  for (const d of activeQuests(p)) {
    const a = qs(p).active[d.id];
    d.steps.forEach((step, i) => {
      if (step.kind !== kind || step.kind === 'deliver') return;
      const need = stepNeed(step);
      if ((a.prog[i] || 0) >= need) return;
      if (!mapOk(step, data)) return;
      let add = 0;
      switch (kind) {
        case 'kill': { const t = normArk(data.target); if ((step.target === 'any' || normArk(step.target) === t) && withOk(step, data)) add = data.count || 1; break; }
        case 'loot': if (data.item === step.item && poiLenient(step, data)) add = data.qty || data.count || 1; break;
        case 'search': { const c = step.container, k = data.container; if ((c === 'any' || c === k || (Array.isArray(c) && c.includes(k))) && poiLenient(step, data)) add = 1; break; }
        case 'extract': add = 1; break;
        case 'visit': {
          if (!poiMatches(step.poi, step.map || data.map, data)) break;
          if (step.use && !canUse(lo, step.use)) { changed.push({ quest: d.id, name: d.name, step: i, text: `Need ${Object.entries(step.use).map(([k, n]) => n + 'x ' + nm(k)).join(', ')}`, done: false, blocked: true }); break; }
          if (step.use) doUse(lo, step.use);
          add = 1; break;
        }
      }
      if (add > 0) {
        a.prog[i] = Math.min(need, (a.prog[i] || 0) + add);
        changed.push({ quest: d.id, name: d.name, step: i, text: stepShort(step, a.prog[i]), done: a.prog[i] >= need });
      }
    });
  }
  return changed;
}

// up to `max` short objective lines for the HUD ({ text, done }), relevant to mapId
export function activeObjectives(p, mapId = null, max = 4) {
  initQuests(p);
  const open = [], done = [];
  for (const d of activeQuests(p)) {
    d.steps.forEach((step, i) => {
      if (step.kind === 'deliver') return;
      if (mapId && step.map && step.map !== mapId) return;
      const g = stepProgress(p, d.id, i);
      (g.done ? done : open).push({ text: stepShort(step, g.have), done: g.done, quest: d.id, poi: step.poi || null, poiName: step.poi ? poiName(step.map || mapId, step.poi) : null });
    });
  }
  // poi / poiName: where an open step happens (the raid HUD shows it as a waypoint)
  return [...open, ...done].slice(0, max).map(({ text, done: dn, poi, poiName: pn }) => ({ text, done: dn, poi, poiName: pn }));
}

// ---------------------------------------------------------------- turn in
function giveItems(p, id, qty) {
  let left = qty;
  while (left > 0) { const n = Math.min(left, maxStack(id)); const l = stashPut(p, makeStack(id, n)); if (l > 0) p.stash.push(makeStack(id, l)); left -= n; }
}
export function rewardStacks(d) { return Object.entries(d?.rewards?.items || {}).filter(([k]) => ITEMS[k]).map(([id, qty]) => ({ id, qty })); }
export function canTurnIn(p, id) {
  const d = QUEST_BY_ID[id];
  if (!d || !qs(p).active[id]) return { ok: false, reason: 'Not active' };
  const missing = [];
  d.steps.forEach((s, i) => { const g = stepProgress(p, id, i); if (!g.done) missing.push(s.kind === 'deliver' ? `${g.need - g.have}x ${nm(s.item)}` : stepShort(s, g.have)); });
  if (missing.length) return { ok: false, reason: 'Incomplete: ' + missing.join(', '), missing };
  // rewards must fit after delivered items leave the stash
  const sim = { stash: p.stash.map(s => s && { ...s }), stashSize: p.stashSize };
  for (const s of d.steps) if (s.kind === 'deliver') { let need = s.count; for (let k = sim.stash.length - 1; k >= 0 && need > 0; k--) { const x = sim.stash[k]; if (!x || x.id !== s.item) continue; const t = Math.min(x.qty, need); x.qty -= t; need -= t; if (x.qty <= 0) sim.stash[k] = null; } }
  sim.stash = sim.stash.filter(Boolean);
  if (!stashFits(sim, rewardStacks(d))) return { ok: false, reason: 'Stash is full - make room for the rewards' };
  return { ok: true, reason: '' };
}
export function turnIn(p, id) {
  const c = canTurnIn(p, id);
  if (!c.ok) return no(c.reason);
  const d = QUEST_BY_ID[id];
  for (const s of d.steps) if (s.kind === 'deliver') materialTake(p, s.item, s.count);
  compactStash(p);
  const r = d.rewards || {};
  const xp = r.xp ?? XP_REWARDS?.quest ?? 1500;
  const levels = addXP(p, xp);
  p.coins += r.coins || 0;
  for (const s of rewardStacks(d)) giveItems(p, s.id, s.qty);
  let bp = null;
  if (r.blueprint) { p.blueprints = p.blueprints || []; if (!p.blueprints.includes(r.blueprint)) { p.blueprints.push(r.blueprint); bp = r.blueprint; } }
  delete qs(p).active[id];
  qs(p).done.push(id);
  p.stats = p.stats || {}; p.stats.quests = (p.stats.quests || 0) + 1;
  return ok(`Completed: ${d.name}`, { xp, coins: r.coins || 0, levels, blueprint: bp, items: rewardStacks(d) });
}
