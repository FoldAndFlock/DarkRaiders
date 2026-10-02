// Speranzia - the between-raid hub (DOM UI). Tabs: Loadout & Stash, Workshop, Traders, Skills, Quests, Raider.
// Usage: const hub = new Hub(app); hub.mount(document.getElementById('ui')); ... hub.unmount();
// app: { profile, save(), audioSafe: { play(name), setVolumes(obj) }, screens: { lobby() } }
// Every change mutates app.profile and calls app.save().
import { el, cell, DnD, Tooltip, RAR, TYPE_LABEL, iconURL } from './itemui.js';
import { ITEMS, RARITY_ORDER, makeStack, maxStack, weaponStats, newUid } from '../game/items.js';
import { capacities, fitLoadout, loadoutWeight, accepts, getSlot, setSlot, moveSlot, QUICK_TYPES, allStacks, addToSlots, countIn } from '../game/inventory.js';
import { computeStats } from '../game/stats.js';
import { SKILL_TREE, SKILL_RULES } from '../data/skills.js';
import { TRADERS } from '../data/traders.js';
import * as P from '../game/profile.js';
import * as Eco from '../game/economy.js';
import * as Craft from '../game/crafting.js';
import * as Q from '../game/quests.js';
import { settingsRows, syncProfile, capPx, touchEnabled } from './settings.js';

// ---------------------------------------------------------------- small helpers
const fmt = (n) => Math.round(n || 0).toLocaleString('en-US');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nm = (id) => ITEMS[id]?.name || id;
const ROM = ['', 'I', 'II', 'III', 'IV', 'V'];
const clamp01 = (v) => Math.max(0, Math.min(1, v || 0));
const LO_C = new Set(['augment', 'shield', 'weapons', 'quick', 'safe', 'backpack']);
const sameRef = (a, b) => !!a && !!b && a.c === b.c && a.i === b.i && a.uid === b.uid && a.slot === b.slot && a.w === b.w;
const div = (cls, html = '') => el('div', cls, html);
function btn(label, cls = '', fn = null, disabled = false) {
  const b = el('button', cls, label);
  if (disabled) b.disabled = true;
  if (fn) b.addEventListener('click', (e) => { e.stopPropagation(); fn(e); });
  return b;
}

const TABS = [['loadout', 'LOADOUT'], ['workshop', 'WORKSHOP'], ['traders', 'TRADERS'], ['skills', 'SKILLS'], ['quests', 'QUESTS'], ['raider', 'RAIDER']];
const FILTERS = [['all', 'ALL', null], ['weapon', 'WEAPONS', ['weapon']], ['gear', 'GEAR', ['augment', 'shield']], ['mod', 'MODS', ['mod']], ['ammo', 'AMMO', ['ammo']],
  ['quick', 'QUICK USE', ['consumable', 'grenade', 'trap', 'gadget']], ['material', 'MATERIALS', ['material']], ['valuable', 'VALUABLES', ['valuable', 'trinket']],
  ['key', 'KEYS & QUEST', ['key', 'quest']], ['blueprint', 'BLUEPRINTS', ['blueprint']]];
const SORTS = [['rarity', 'RARITY'], ['value', 'VALUE'], ['type', 'TYPE'], ['name', 'NAME']];
const TYPE_ORDER = ['weapon', 'augment', 'shield', 'mod', 'ammo', 'consumable', 'grenade', 'trap', 'gadget', 'key', 'quest', 'blueprint', 'material', 'valuable', 'trinket'];
const SLOT_HINT = { muzzle: 'MZ', underbarrel: 'UB', mag: 'MG', stock: 'ST', tech: 'TC' };
const SLOT_NAME = { muzzle: 'MUZZLE', underbarrel: 'UNDERBARREL', mag: 'MAGAZINE', stock: 'STOCK', tech: 'TECH' };
const MOD_STAT = { spread: ['SPREAD', -1], recoil: ['RECOIL', -1], adsSpeed: ['ADS SPEED', 1], equipSpeed: ['EQUIP SPEED', 1], recovery: ['RECOVERY', 1], mag: ['MAGAZINE', 1], noise: ['NOISE', -1],
  projSpeed: ['BULLET VELOCITY', 1], range: ['RANGE', 1], rpm: ['FIRE RATE', 1], dmg: ['DAMAGE', 1], pellets: ['PELLETS', 1], durabilityBurn: ['DURABILITY BURN', -1], reload: ['RELOAD TIME', -1], durability: ['DURABILITY', 1] };
const STAT_INFO = {
  max_hp: ['Max HP', 'abs'], max_stamina: ['Max stamina', 'pct'], stamina_regen: ['Stamina regen', 'pct'], sprint_cost: ['Sprint cost', 'pct'], sprint_speed: ['Sprint speed', 'pct'],
  move_speed: ['Move speed', 'pct'], crouch_speed: ['Crouch speed', 'pct'], dodge_cost: ['Dodge cost', 'pct'], dodge_distance: ['Dodge distance', 'pct'], carry_weight: ['Carry weight', 'kg'],
  backpack_slots: ['Backpack slots', 'abs'], safe_slots: ['Safe pocket slots', 'abs'], quick_slots: ['Quick-use slots', 'abs'], loot_speed: ['Loot speed', 'pct'], search_reveal: ['Search speed', 'pct'],
  extra_loot_chance: ['Extra loot chance', 'pct'], rare_loot_chance: ['Rare loot chance', 'pct'], scrap_yield: ['Recycling yield', 'pct'], heal_amount: ['Healing', 'pct'], heal_speed: ['Healing speed', 'pct'],
  shield_capacity: ['Shield capacity', 'pct'], shield_regen: ['Shield regen', 'abs'], shield_recharge_speed: ['Shield recharge', 'pct'], damage_reduction: ['Damage reduction', 'pct'],
  explosive_resist: ['Explosive resist', 'pct'], fall_resist: ['Fall resist', 'pct'], downed_hp: ['Downed health', 'pct'], downed_crawl_speed: ['Downed crawl', 'pct'], revive_speed: ['Revive speed', 'pct'],
  self_revive: ['Self-revives', 'abs'], noise_mul: ['Noise', 'pct'], footstep_mul: ['Footsteps', 'pct'], arc_detect_mul: ['ARK detection', 'pct'], arc_damage: ['Damage vs ARK', 'pct'],
  weapon_damage: ['Weapon damage', 'pct'], headshot_mul: ['Headshot damage', 'pct'], reload_speed: ['Reload speed', 'pct'], ads_speed: ['ADS speed', 'pct'], recoil_mul: ['Recoil', 'pct'],
  spread_mul: ['Spread', 'pct'], melee_damage: ['Melee damage', 'pct'], breach_speed: ['Breach speed', 'pct'], grenade_radius: ['Grenade radius', 'pct'], grenade_capacity: ['Grenade capacity', 'abs'],
  xp_gain: ['XP gain', 'pct'], coin_gain: ['Scrip gain', 'pct'], in_raid_crafting: ['Field crafting', 'abs'], extraction_speed: ['Extraction speed', 'pct'], cone_vision_range: ['Cone vision', 'pct'], mark_duration: ['Mark duration', 'pct'],
};
function statFmt(k, v) {
  const kind = STAT_INFO[k]?.[1] || 'pct';
  if (kind === 'kg') return `${v > 0 ? '+' : ''}${+v.toFixed(1)} KG`;
  if (kind === 'abs') return `${v > 0 ? '+' : ''}${+v.toFixed(1)}`;
  return `${v > 0 ? '+' : ''}${+(v * 100).toFixed(1)}%`;
}

// ---------------------------------------------------------------- skills logic (pure, exported)
export function branchSpent(p, b) { let n = 0; for (const [id, r] of Object.entries(p.skills || {})) if (SKILL_TREE.nodes[id]?.branch === b) n += r; return n; }
export function skillsSpent(p) { return Object.values(p.skills || {}).reduce((a, b) => a + (b || 0), 0); }
export function skillGate(n) { let g = n.branchPoints || 0; for (const x of SKILL_RULES.gates || []) if (n.row >= x.row) g = Math.max(g, x.branchPoints); return g; }
export function skillCheck(p, id) {
  const n = SKILL_TREE.nodes[id]; if (!n) return { rank: 0, max: 0, unlocked: false, canAdd: false, reasons: [] };
  const rank = p.skills?.[id] || 0, req = n.requires || [];
  const has = (r) => (p.skills?.[r] || 0) > 0;
  const reqMet = !req.length || (n.requiresAny ? req.some(has) : req.every(has));
  const gate = skillGate(n), spent = branchSpent(p, n.branch);
  const reasons = [];
  if (req.length) reasons.push({ text: (n.requiresAny && req.length > 1 ? 'Any of: ' : 'Requires: ') + req.map(r => SKILL_TREE.nodes[r]?.name || r).join(n.requiresAny ? ' or ' : ', '), met: reqMet });
  if (gate) reasons.push({ text: `${gate} points in ${SKILL_TREE.branches[n.branch]?.name} (${Math.min(spent, gate)}/${gate})`, met: spent >= gate });
  const unlocked = reqMet && spent >= gate;
  return { rank, max: n.ranks, unlocked, canAdd: unlocked && rank < n.ranks && (p.skillPoints || 0) > 0, reasons };
}
export function allocateSkill(p, id) {
  const c = skillCheck(p, id), n = SKILL_TREE.nodes[id];
  if (!n) return { ok: false, msg: 'Unknown skill' };
  if (c.rank >= c.max) return { ok: false, msg: 'Already at max rank' };
  if (!c.unlocked) return { ok: false, msg: 'Locked - ' + (c.reasons.find(r => !r.met)?.text || '') };
  if ((p.skillPoints || 0) <= 0) return { ok: false, msg: 'No skill points - level up by raiding' };
  p.skills = p.skills || {}; p.skills[id] = c.rank + 1; p.skillPoints--;
  return { ok: true, msg: `${n.name} ${c.rank + 1}/${c.max}` };
}
export function respecCost(p) { return skillsSpent(p) * (SKILL_RULES.respecCostPerPoint || 2000); }
export function respecSkills(p) {
  const spent = skillsSpent(p), cost = respecCost(p);
  if (!spent) return { ok: false, msg: 'No points spent' };
  if (p.coins < cost) return { ok: false, msg: 'Not enough Scrip' };
  p.coins -= cost; p.skillPoints = (p.skillPoints || 0) + spent; p.skills = {};
  return { ok: true, msg: `Skills reset - ${spent} points refunded` };
}
function skillDesc(n) {
  const f = (x) => x == null ? '?' : Math.abs(x) < 5 ? String(+(x * 100).toFixed(1)) : String(x);
  return (n.desc || '').replace(/\{v\}/g, f(n.effects?.[0]?.per)).replace(/\{c\}/g, f(n.conditional?.[0]?.per));
}

// ---------------------------------------------------------------- pixel art (canvas)
const hex = (c) => '#' + (c >>> 0).toString(16).padStart(6, '0').slice(-6);
function pix(w, h, draw, outline = null) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  draw(x, (col, X, Y, W = 1, H = 1) => { x.fillStyle = col; x.fillRect(X, Y, W, H); });
  if (outline) {
    const img = x.getImageData(0, 0, w, h), d = img.data, a = (X, Y) => X >= 0 && Y >= 0 && X < w && Y < h && d[(Y * w + X) * 4 + 3] > 0;
    const pts = [];
    for (let Y = 0; Y < h; Y++) for (let X = 0; X < w; X++) if (!a(X, Y) && (a(X - 1, Y) || a(X + 1, Y) || a(X, Y - 1) || a(X, Y + 1))) pts.push([X, Y]);
    x.fillStyle = outline; for (const [X, Y] of pts) x.fillRect(X, Y, 1, 1);
  }
  c.className = 'pixart';
  return c;
}
function ell(r, cx, cy, rx, ry, col) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry; if (dx * dx + dy * dy <= 1) r(col, x, y); } }

const PORTRAIT = {
  celesta: { bg: '#3a2614', bg2: '#5a3a1c', skin: '#d09a74', skinD: '#a8704e', hair: '#7a3420', hairD: '#521e12', cloth: '#5a6a3e', clothD: '#3e4a2a', acc: '#e8a040', eye: '#2a1a12', style: 'long' },
  shanni: { bg: '#132132', bg2: '#1e3650', skin: '#c08a64', skinD: '#94643e', hair: '#1a1a22', hairD: '#0e0e14', cloth: '#2a3a5a', clothD: '#1c2840', acc: '#4aa0f0', eye: '#101018', style: 'helmet' },
  tien_wen: { bg: '#2e1612', bg2: '#4a2018', skin: '#dcb48c', skinD: '#b08660', hair: '#3a3434', hairD: '#242020', cloth: '#5a4030', clothD: '#3e2c20', acc: '#c84a30', eye: '#1a1414', style: 'bun' },
  apolo: { bg: '#2e2a12', bg2: '#4a421a', skin: '#b07850', skinD: '#86583a', hair: '#4a3020', hairD: '#2e1e14', cloth: '#3a4a5a', clothD: '#283440', acc: '#f0d040', eye: '#1a120c', style: 'cap' },
  lantz: { bg: '#142a18', bg2: '#1e4224', skin: '#d8dcd4', skinD: '#a8aca4', hair: '#8a908a', hairD: '#5a605a', cloth: '#e8e8e0', clothD: '#b8b8b0', acc: '#5cc860', eye: '#5cc860', style: 'android' },
};
export function traderPortrait(id) {
  const o = PORTRAIT[id] || PORTRAIT.celesta;
  return pix(32, 32, (x, r) => {
    r(o.bg, 0, 0, 32, 32);
    for (let i = -32; i < 32; i += 6) for (let k = 0; k < 32; k++) { const X = i + k; if (X >= 0 && X < 32 && (k + i) % 2 === 0) r(o.bg2, X, 31 - k); }
    ell(r, 16, 14, 11, 11, o.bg2);
    // shoulders + collar
    for (let y = 24; y < 32; y++) { const s = Math.max(1, 8 - (y - 24) * 1.2); r(o.cloth, Math.round(s), y, 32 - Math.round(s) * 2, 1); }
    r(o.clothD, 4, 30, 24, 2); r(o.acc, 12, 24, 8, 2);
    // neck
    r(o.style === 'android' ? '#7a807a' : o.skinD, 13, 20, 6, 5);
    if (o.style === 'android') { r('#5a605a', 13, 21, 6, 1); r('#5a605a', 13, 23, 6, 1); }
    // head
    r(o.skin, 10, 7, 12, 14); r(o.skin, 11, 6, 10, 1); r(o.skin, 11, 21, 10, 1);
    r(o.skinD, 21, 8, 1, 12); r(o.skinD, 11, 21, 10, 1);
    // face
    r(o.hairD, 12, 12, 3, 1); r(o.hairD, 17, 12, 3, 1);
    if (o.style === 'android') { r('#203020', 12, 13, 3, 3); r('#203020', 17, 13, 3, 3); r(o.eye, 13, 14, 1, 1); r(o.eye, 18, 14, 1, 1); r('#b8ffb8', 13, 13, 1, 1); r('#b8ffb8', 18, 13, 1, 1); }
    else { r('#f0e8e0', 12, 14, 2, 1); r('#f0e8e0', 18, 14, 2, 1); r(o.eye, 13, 14, 1, 1); r(o.eye, 18, 14, 1, 1); }
    r(o.skinD, 15, 15, 2, 2);
    r(o.style === 'android' ? '#7a807a' : '#8a4a3a', 14, 18, 4, 1);
    switch (o.style) {
      case 'long':
        r(o.hair, 9, 4, 14, 4); r(o.hair, 8, 6, 3, 18); r(o.hair, 21, 6, 3, 18); r(o.hairD, 8, 20, 3, 6); r(o.hairD, 21, 20, 3, 6);
        r(o.hair, 11, 8, 6, 2); r(o.hairD, 10, 9, 2, 3); r(o.acc, 9, 23, 14, 2); r('#f8c070', 12, 23, 4, 1);
        r('#6a3a2a', 19, 17, 1, 1); break;
      case 'helmet':
        r(o.cloth, 9, 3, 14, 7); r(o.clothD, 9, 9, 14, 2); r('#3a4a6a', 10, 4, 12, 1);
        r(o.acc, 10, 10, 12, 1); r('#9ae8f8', 11, 10, 2, 1);
        r('#202020', 8, 11, 2, 5); r(o.acc, 8, 13, 1, 1); r(o.hair, 21, 10, 1, 4); r(o.acc, 6, 25, 4, 3); r(o.acc, 22, 25, 4, 3); break;
      case 'bun':
        r(o.hair, 10, 4, 12, 4); r(o.hair, 9, 6, 2, 8); r(o.hair, 21, 6, 2, 8); ell(r, 16, 2.5, 3, 2.5, o.hair); r('#6a6464', 15, 1, 2, 1);
        r(o.acc, 9, 7, 14, 2); r('#e86a50', 10, 7, 4, 1);
        r('#202020', 11, 13, 4, 1); r('#202020', 11, 16, 4, 1); r('#202020', 11, 13, 1, 4); r('#202020', 14, 13, 1, 4);
        r('#202020', 17, 13, 4, 1); r('#202020', 17, 16, 4, 1); r('#202020', 17, 13, 1, 4); r('#202020', 20, 13, 1, 4); r('#202020', 15, 14, 2, 1);
        r('#7a5a3a', 9, 26, 14, 6); r('#5a402a', 9, 26, 1, 6); r('#5a402a', 22, 26, 1, 6); break;
      case 'cap':
        r(o.acc, 9, 4, 14, 5); r('#c0a020', 9, 8, 14, 1); r('#a08818', 6, 9, 17, 2); r('#fff8c0', 13, 5, 6, 2); r('#c84a30', 14, 5, 4, 2);
        r(o.hair, 12, 17, 8, 2); r(o.hairD, 11, 18, 2, 2); r(o.hairD, 19, 18, 2, 2); r(o.hairD, 11, 19, 10, 2);
        r('#c0a020', 8, 25, 3, 7); r('#c0a020', 21, 25, 3, 7); break;
      case 'android':
        r('#b8bcb4', 15, 7, 1, 14); r(o.skinD, 10, 7, 12, 1); r('#7a807a', 20, 2, 1, 5); r(o.acc, 19, 1, 3, 2);
        r('#404840', 14, 18, 1, 1); r('#404840', 16, 18, 1, 1); r('#404840', 18, 18, 1, 1);
        r(o.acc, 14, 26, 4, 1); r(o.acc, 15, 25, 2, 3); r('#c8c8c0', 4, 29, 24, 1); break;
    }
  });
}
export function scrappieArt(frame = 0) {
  return pix(34, 34, (x, r) => {
    const by = frame ? 1 : 0;
    // tail
    const tail = ['#1e3a30', '#2a4a3a', '#14261e', '#3a5a3a'];
    for (let i = 0; i < 4; i++) ell(r, 8 + i, 12 + i * 2 + by, 3, 6 - i * 0.6, tail[i]);
    // body
    ell(r, 16, 20 + by, 9, 7.5, '#e8e0c8'); ell(r, 16, 23 + by, 7, 4, '#c8c0a8');
    // satchel
    r('#7a5a3a', 8, 20 + by, 6, 5); r('#5a402a', 8, 20 + by, 6, 1); r('#f0c030', 10, 22 + by, 2, 1); r('#5a402a', 13, 13 + by, 1, 8);
    // wing
    ell(r, 18, 20 + by, 5, 3.5, '#d0c8b0'); r('#b8b098', 15, 21 + by, 7, 1); r('#b8b098', 16, 22 + by, 5, 1);
    // neck + head
    ell(r, 23, 13 + by, 4, 5, '#e8e0c8'); ell(r, 24, 9 + by, 4, 4, '#f0e8d4');
    // comb + wattle + beak + eye
    r('#e84a30', 22, 3 + by, 2, 2); r('#e84a30', 24, 4 + by, 2, 2); r('#e84a30', 26, 4 + by, 1, 2); r('#c83a28', 22, 5 + by, 5, 1);
    r('#f0c030', 28, 9 + by, 3, 2); r('#c89a20', 28, 10 + by, 3, 1);
    r('#e84a30', 26, 11 + by, 2, 3); r('#141414', 25, 8 + by, 1, 1);
    // goggles strap
    r('#3a3a3a', 20, 7 + by, 7, 1); r('#58c8f0', 22, 6 + by, 2, 2);
    // legs
    r('#f08a30', 14, 27, 1, 4); r('#f08a30', 18, 27, 1, 4); r('#f08a30', 12, 31, 4, 1); r('#f08a30', 17, 31, 4, 1);
  }, '#0c0a0e');
}
function raiderArt(o) {
  const c = (k, d) => hex(o?.[k] ?? d);
  return pix(20, 30, (x, r) => {
    r(c('pack', 0x6a5434), 4, 10, 12, 8);
    r(c('helmet', 0x7a7a68), 6, 1, 8, 8); r(c('helmet', 0x7a7a68), 7, 0, 6, 1); r('rgba(255,255,255,0.25)', 7, 1, 5, 1);
    r(c('accent', 0xf0a030), 5, 4, 1, 3); r(c('accent', 0xf0a030), 14, 4, 1, 3);
    r(c('visor', 0x9ae8f8), 7, 5, 6, 2); r('rgba(255,255,255,0.5)', 8, 5, 2, 1);
    r(c('skin', 0xd8a882), 7, 7, 6, 2);
    r(c('accent', 0xf0a030), 6, 9, 8, 1);
    r(c('jacket', 0xb08040), 5, 10, 10, 8); r(c('jacket2', 0x8a6430), 5, 16, 10, 2);
    r(c('accent', 0xf0a030), 7, 11, 6, 3); r(c('jacket2', 0x8a6430), 7, 13, 2, 1); r(c('jacket2', 0x8a6430), 11, 13, 2, 1);
    r(c('jacket', 0xb08040), 3, 10, 2, 7); r(c('jacket', 0xb08040), 15, 10, 2, 7); r('#2e2a26', 3, 17, 2, 2); r('#2e2a26', 15, 17, 2, 2);
    r('#2a2420', 5, 18, 10, 1); r('#b0a070', 9, 18, 2, 1);
    r(c('pants', 0x4a4e44), 6, 19, 3, 7); r(c('pants', 0x4a4e44), 11, 19, 3, 7);
    r(c('accent', 0xf0a030), 6, 22, 3, 1); r(c('accent', 0xf0a030), 11, 22, 3, 1);
    r(c('boots', 0x2e2622), 5, 26, 4, 2); r(c('boots', 0x2e2622), 11, 26, 4, 2);
  }, '#0c0a0e');
}
const GLYPHS = {
  boot: ['...##....', '...##....', '...##....', '...##....', '...###...', '...#####.', '..######.', '..#######', '.........'],
  bolt: ['.....##..', '....##...', '...##....', '..######.', '....##...', '...##....', '..##.....', '.##......', '.........'],
  shield: ['.#######.', '.##...##.', '.#.###.#.', '.#.###.#.', '..#.#.#..', '..##.##..', '...#.#...', '....#....', '.........'],
  ear: ['...#.....', '..##..#..', '####...#.', '####.#.#.', '####.#.#.', '####...#.', '..##..#..', '...#.....', '.........'],
  eye: ['.........', '..#####..', '.#.....#.', '#..###..#', '#..###..#', '.#.....#.', '..#####..', '.........', '.........'],
  wrench: ['.##...##.', '.##...##.', '.#######.', '..#####..', '...###...', '...###...', '...###...', '...###...', '...###...'],
  cross: ['...###...', '...###...', '...###...', '#########', '#########', '#########', '...###...', '...###...', '...###...'],
  fist: ['.#.#.#...', '#######..', '#######..', '########.', '########.', '.#######.', '..#####..', '..#####..', '.........'],
  bag: ['...###...', '..#...#..', '.#######.', '#########', '#...#...#', '#########', '#########', '.#######.', '.........'],
  search: ['.####....', '#....#...', '#....#...', '#....#...', '#....#...', '.####.#..', '......##.', '.......##', '........#'],
  feather: ['.......##', '......###', '.....###.', '....###..', '...###...', '..###....', '.##......', '#........', '.........'],
  star: ['....#....', '....#....', '...###...', '#########', '.#######.', '..#####..', '..##.##..', '.##...##.', '#.......#'],
};
const GLYPH_FOR = { move_speed: 'boot', crouch_speed: 'boot', sprint_speed: 'boot', dodge_distance: 'boot', stamina_regen: 'bolt', max_stamina: 'bolt', sprint_cost: 'bolt', dodge_cost: 'bolt',
  explosive_resist: 'shield', damage_reduction: 'shield', fall_resist: 'feather', noise_mul: 'ear', footstep_mul: 'ear', arc_detect_mul: 'eye', breach_speed: 'wrench', scrap_yield: 'wrench',
  in_raid_crafting: 'wrench', downed_hp: 'cross', self_revive: 'cross', max_hp: 'cross', heal_speed: 'cross', heal_amount: 'cross', downed_crawl_speed: 'cross', melee_damage: 'fist', arc_damage: 'fist',
  carry_weight: 'bag', backpack_slots: 'bag', search_reveal: 'search', extra_loot_chance: 'search', rare_loot_chance: 'search' };
const glyphCache = new Map();
function glyphURL(name, col) {
  const k = name + col; if (glyphCache.has(k)) return glyphCache.get(k);
  const g = GLYPHS[name] || GLYPHS.star;
  const c = pix(9, 9, (x, r) => { g.forEach((row, y) => [...row].forEach((ch, X) => { if (ch === '#') r(col, X, y); })); });
  const u = c.toDataURL(); glyphCache.set(k, u); return u;
}

let OUTFITS = null, outfitsP = null;
function loadOutfits() { return outfitsP || (outfitsP = import('../engine/models.js').then(m => (OUTFITS = m.OUTFITS || null)).catch(() => null)); }

let cssPromise = null;
function ensureCSS() {
  if (cssPromise) return cssPromise;
  const href = new URL('./hub.css', import.meta.url).href;
  let l = [...document.querySelectorAll('link[rel="stylesheet"]')].find(x => x.href === href);
  if (l && l.sheet) return (cssPromise = Promise.resolve());
  if (!l) { l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.dataset.hubCss = '1'; document.head.appendChild(l); }
  return (cssPromise = new Promise(res => { l.addEventListener('load', res, { once: true }); l.addEventListener('error', res, { once: true }); setTimeout(res, 2000); }));
}

// ================================================================== HUB
export class Hub {
  constructor(app) {
    this.app = app;
    this.tab = 'loadout';
    this.st = {
      loadout: { filter: 'all', sort: 'rarity', q: '', sel: null },
      workshop: { view: 'workbench', sel: null, rec: null, recFilter: 'all' },
      traders: { t: 'celesta', mode: 'buy', sel: null },
      skills: { sel: null },
      quests: { sel: null, showDone: false },
      raider: {},
    };
    this.savedAt = 0;
    this.lastClick = { t: 0, key: '' };
    this.timers = [];
  }
  get p() { return this.app.profile; }
  caps() { return capacities(this.p.loadout, computeStats(this.p.skills || {}, SKILL_TREE)); }
  sfx(n) { try { this.app.audioSafe?.play?.(n); } catch (e) { /* audio optional */ } }

  // ---------------------------------------------------------------- lifecycle
  mount(rootEl) {
    if (this.root) this.unmount();
    this.host = rootEl || document.getElementById('ui') || document.body;
    this.root = div('hub pxscope'); this.root.style.opacity = '0';
    this.applyScale();
    ensureCSS().then(() => { if (!this.root) return; this.root.style.opacity = ''; this.render(); });
    this.head = div('hub-head'); this.body = div('hub-body'); this.toastEl = div('hub-toasts');
    this.root.append(this.head, this.body, this.toastEl);
    this.host.appendChild(this.root);
    this.prepareProfile();
    if (!OUTFITS) loadOutfits().then(() => { if (this.root && (this.tab === 'loadout' || this.tab === 'raider')) this.render(); });
    DnD.bind(this.body, {
      onDrop: (a, b, s, e) => this.dnd?.onDrop?.(a, b, s, e),
      onClick: (r, s, e) => this.dnd?.onClick?.(r, s, e),
      onRight: (r, s, e) => this.dnd?.onRight?.(r, s, e),
      onHold: (r, s, e) => this.dnd?.onRight?.(r, s, e),     // touch: hold without dragging = actions menu
    });
    this.head.addEventListener('click', (e) => this.onHeadClick(e));
    this.onKey = (e) => this.handleKey(e);
    addEventListener('keydown', this.onKey);
    this.onResize = () => { this.applyScale(); clearTimeout(this.rzT); this.rzT = setTimeout(() => { if (this.root && !this.modal) this.render(); }, 120); };
    addEventListener('resize', this.onResize); addEventListener('dr:uiscale', this.onResize);
    this.onDown = (e) => { if (this.menu && !this.menu.contains(e.target)) this.closeMenu(); };
    this.root.addEventListener('pointerdown', this.onDown, true);
    this.root.addEventListener('contextmenu', (e) => { if (!e.target.closest('input, textarea')) e.preventDefault(); });
    this.render();
    this.timers.push(setInterval(() => { const s = this.root?.querySelector('.scrappie-art'); if (s) { s.dataset.f = s.dataset.f === '1' ? '0' : '1'; s.replaceChildren(scrappieArt(+s.dataset.f)); } }, 600));
  }
  unmount() {
    for (const t of this.timers) clearInterval(t); this.timers = [];
    if (this.onKey) removeEventListener('keydown', this.onKey);
    if (this.onResize) { removeEventListener('resize', this.onResize); removeEventListener('dr:uiscale', this.onResize); }
    clearTimeout(this.rzT);
    this.tip?.remove(); this.tip = null;
    Tooltip.hide(); this.closeMenu();
    this.root?.remove(); this.root = null;
  }
  // the hub's 3-column layout needs ~560 x 290 units: past that it caps its own scale (it also scrolls);
  // narrow / short windows get compact layouts (see style.css)
  applyScale() {
    if (!this.root) return;
    const px = capPx(560, 290);
    this.root.style.setProperty('--px', String(px));
    const uw = innerWidth / px, uh = innerHeight / px;
    this.root.classList.toggle('hub-narrow', uw < 800);
    this.root.classList.toggle('hub-xnarrow', uw < 640);
    this.root.classList.toggle('hub-short', uh < 420);
    this.root.classList.toggle('hub-touch', touchEnabled());
  }
  // migrate / initialise the bits of state the hub relies on
  prepareProfile() {
    const p = this.p;
    p.settings = p.settings || {};
    syncProfile(p);
    p.blueprints = p.blueprints || [];
    p.benches = p.benches || { workbench: 1 };
    p.stats = p.stats || {};
    p.stash = (p.stash || []).filter(Boolean);
    Q.initQuests(p); Craft.scrappie(p); Eco.traderState(p);
    this.fixLoadout(false);
  }
  save() { try { this.app.save?.(); this.savedAt = Date.now(); } catch (e) { console.warn('save failed', e); } }
  // fit the loadout to current capacities; overflow goes to the stash (over capacity if needed)
  fixLoadout(notify = true) {
    const over = fitLoadout(this.p.loadout, this.caps());
    for (const s of over) this.forceStash(s);
    if (over.length && notify) this.toast(`${over.length} item(s) no longer fit - moved to stash`, 'warn');
    return over.length;
  }
  forceStash(s) { const left = P.stashPut(this.p, s); if (left > 0) this.p.stash.push({ ...s, qty: left, uid: newUid() }); }
  commit(res, okSfx = 'ui_click') {
    if (res && res.msg) this.toast(res.msg, res.ok === false ? 'bad' : 'good');
    if (res && res.ok === false) { this.sfx('ui_error'); return false; }
    this.sfx(okSfx);
    this.fixLoadout();
    this.save(); this.render(); this.refreshModal?.();
    return true;
  }
  toast(msg, kind = 'info') {
    if (!this.toastEl) return;
    const t = div('toast ' + kind, esc(msg));
    this.toastEl.prepend(t);
    while (this.toastEl.children.length > 3) this.toastEl.lastChild.remove();
    setTimeout(() => t.classList.add('out'), 2200); setTimeout(() => t.remove(), 2700);
  }
  handleKey(e) {
    if (!this.root) return;
    if (e.key === 'Escape') { if (this.menu) this.closeMenu(); else if (this.modal) this.closeModal(); return; }
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return;
    if (this.modal) return;
    const n = +e.key; if (n >= 1 && n <= TABS.length && !e.ctrlKey && !e.metaKey && !e.altKey) { this.go(TABS[n - 1][0]); }
  }
  go(tab, patch = null) { this.tab = tab; if (patch) Object.assign(this.st[tab], patch); this.sfx('ui_click'); this.render(); }

  // ---------------------------------------------------------------- render root
  render() {
    if (!this.root) return;
    Tooltip.hide(); this.closeMenu(); this.skillTipHide();
    this.renderHead();
    const keep = {};
    this.body.querySelectorAll('[data-scroll]').forEach(n => { keep[n.dataset.scroll] = n.scrollTop; });
    this.body.innerHTML = ''; this.body.dataset.tab = this.tab; this.dnd = null;
    const fn = { loadout: this.tabLoadout, workshop: this.tabWorkshop, traders: this.tabTraders, skills: this.tabSkills, quests: this.tabQuests, raider: this.tabRaider }[this.tab];
    try { fn.call(this, this.body); } catch (e) { console.error(e); this.body.appendChild(div('hub-err', esc(e.stack || e))); }
    this.body.querySelectorAll('[data-scroll]').forEach(n => { if (keep[n.dataset.scroll] != null) n.scrollTop = keep[n.dataset.scroll]; });
  }
  warnings() {
    const p = this.p, lo = p.loadout, caps = this.caps(), w = [];
    const guns = lo.weapons.slice(0, caps.weaponSlots).filter(Boolean);
    if (!guns.length) w.push({ t: 'NO WEAPON EQUIPPED', bad: true });
    for (const g of guns) {
      const ws = weaponStats(g), res = countIn([lo.backpack, lo.quick, lo.safe], ws.ammo), n = nm(g.id).toUpperCase();
      if ((g.ammo || 0) + res <= 0) w.push({ t: `NO AMMO FOR ${n}`, bad: true });
      else if (res < Math.min(ws.mag, 10) && !ITEMS[ws.ammo]?.ammo?.refillsMag) w.push({ t: `LOW AMMO: ${n}` });
      if ((g.dur ?? 1) <= 0) w.push({ t: `${n} IS BROKEN`, bad: true });
      else if ((g.dur ?? ws.durability) < ws.durability * 0.25) w.push({ t: `${n} NEEDS REPAIR` });
    }
    if (!lo.augment) w.push({ t: 'NO AUGMENT - BASIC CAPACITY' });
    if (!lo.shield && caps.shields.length) w.push({ t: 'NO SHIELD EQUIPPED' });
    if (loadoutWeight(lo) > caps.weightLimit) w.push({ t: 'OVERWEIGHT - SLOWER, MORE STAMINA', bad: false });
    if (!allStacks(lo).some(s => ITEMS[s.id]?.use?.heal || ITEMS[s.id]?.use?.healOverTime)) w.push({ t: 'NO HEALING ITEMS' });
    return w;
  }
  renderHead() {
    const p = this.p, need = P.xpForLevel(p.level), warn = this.warnings(), bad = warn.filter(x => x.bad);
    const ready = Q.activeQuests(p).filter(q => Q.canTurnIn(p, q.id).ok).length, avail = Q.availableQuests(p).length;
    const sc = Craft.scrappie(p), bps = Craft.blueprintStacks(p).filter(s => !Craft.blueprintKnown(p, s.id)).length;
    const badge = { skills: p.skillPoints || 0, quests: ready ? ready + '!' : (avail || 0), workshop: (sc.pending.length ? 1 : 0) + bps };
    this.head.innerHTML = `
      <div class="hh-brand"><div class="hh-mark"><i></i><i></i><i></i><i></i><i></i></div><div><div class="hh-logo">SPERANZIA</div><div class="hh-sub">DARKRAIDERS · RAIDER HUB</div></div></div>
      <div class="hh-who"><div class="hh-lv"><span>LV</span><b>${p.level}</b></div><div class="hh-id"><div class="hh-name">${esc(p.name)}</div>
        <div class="hh-xp"><div class="bar"><i style="width:${(clamp01(p.xp / need) * 100).toFixed(1)}%"></i></div><span>${fmt(p.xp)} / ${fmt(need)} XP</span></div></div></div>
      <div class="hh-gap"></div>
      <div class="hh-sp ${p.skillPoints ? 'on' : ''}" data-go="skills" title="Unspent skill points"><b>${p.skillPoints || 0}</b><span>SKILL<br>POINTS</span></div>
      <div class="hh-scrip" title="Scrip"><i class="coin"></i><b>${fmt(p.coins)}</b><span>SCRIP</span></div>
      <button class="hh-deploy ${bad.length ? 'warn' : ''}" data-deploy="1"><b>DEPLOY</b><small>${bad.length ? esc(bad[0].t) : 'LOADOUT READY'}</small></button>
      <div class="hh-tabs">${TABS.map(([k, l], i) => `<button class="tab ${this.tab === k ? 'on' : ''}" data-tab="${k}"><span class="k">${i + 1}</span>${l}${badge[k] ? `<em>${badge[k]}</em>` : ''}</button>`).join('')}
        <div class="hh-hint">${esc(this.tabHint())}</div></div>`;
  }
  tabHint() {
    if (touchEnabled()) return { loadout: 'TAP: INSPECT · DOUBLE-TAP: EQUIP · HOLD: DRAG / ACTIONS', skills: 'TAP A SKILL · ADD POINT IN THE SIDE PANEL' }[this.tab] || { workshop: 'CRAFT · RECYCLE · UPGRADE · SCRAPPIE', traders: 'BUY · SELL · TAKE JOBS', quests: 'ACCEPT JOBS · TRACK OBJECTIVES · TURN IN', raider: 'PROFILE · SETTINGS · SAVE DATA' }[this.tab] || '';
    return { loadout: 'DRAG TO EQUIP · SHIFT+CLICK MOVE · RIGHT-CLICK ACTIONS', workshop: 'CRAFT · RECYCLE · UPGRADE · SCRAPPIE', traders: 'BUY · SELL · TAKE JOBS',
      skills: 'CLICK A SKILL · DOUBLE-CLICK TO ADD A POINT', quests: 'ACCEPT JOBS · TRACK OBJECTIVES · TURN IN', raider: 'PROFILE · SETTINGS · SAVE DATA' }[this.tab] || '';
  }
  onHeadClick(e) {
    const t = e.target.closest('[data-tab]'); if (t) { this.go(t.dataset.tab); return; }
    if (e.target.closest('[data-go]')) { this.go(e.target.closest('[data-go]').dataset.go); return; }
    if (e.target.closest('[data-deploy]')) this.deploy();
  }
  async deploy() {
    const bad = this.warnings().filter(x => x.bad);
    if (bad.length) {
      const ok = await this.confirmBox('DEPLOY ANYWAY?', `<p>${bad.map(b => esc(b.t)).join('<br>')}</p><p class="dimc">You can grab a free loadout in the Loadout tab.</p>`, 'DEPLOY', true);
      if (!ok) return;
    }
    this.sfx('ui_open');
    this.save();
    this.app.screens?.lobby?.();
  }

  // ---------------------------------------------------------------- generic widgets
  panel(title, cls = '', right = '') {
    const root = div('hp ' + cls);
    const h = div('hp-h', `<span class="t">${title}</span><span class="r">${right}</span>`);
    const b = div('hp-b');
    root.append(h, b);
    return { root, head: h, body: b, right: h.querySelector('.r') };
  }
  cellX(stack, ref, opts = {}) {
    const c = cell(stack, ref, opts);
    if (opts.mini) c.classList.add('mini');
    if (stack) {
      c.classList.add('r-' + (ITEMS[stack.id]?.rarity || 'common'));
      if (stack.free) c.appendChild(el('span', 'freetag', 'F'));
      if (opts.count != null) c.appendChild(el('span', 'qty', String(opts.count)));
    }
    if (opts.sel) c.classList.add('sel');
    if (opts.dim) c.classList.add('dimcell');
    return c;
  }
  // display-only cell (tooltip, no drag & drop); optional click handler
  icell(stack, opts = {}, onClick = null) {
    const c = this.cellX(stack, { c: 'view' }, opts); c._stack = null;
    if (onClick) { c.classList.add('click'); c.addEventListener('click', (e) => { e.stopPropagation(); onClick(e); }); }
    return c;
  }
  // a material requirement chip: icon + have/need
  matChip(id, need, times = 1) {
    const have = P.materialCount(this.p, id), n = need * times;
    const c = div('mat ' + (have >= n ? 'ok' : 'short'));
    c.innerHTML = `<img src="${iconURL(id)}" draggable="false"><span>${fmt(Math.min(have, 99999))}<i>/</i>${fmt(n)}</span>`;
    Tooltip.attach(c, () => ({ id, qty: n }));
    return c;
  }
  costRow(cost, times = 1) { const r = div('mats'); for (const [id, n] of Object.entries(cost || {})) r.appendChild(this.matChip(id, n, times)); if (!Object.keys(cost || {}).length) r.appendChild(div('dimc small', 'FREE')); return r; }
  statRows(s) {
    const d = ITEMS[s.id]; if (!d) return [];
    const rows = [];
    if (d.weapon) {
      const w = weaponStats(s);
      rows.push(['DAMAGE', (w.dmg * (w.pellets || 1)).toFixed(1) + (w.pellets > 1 ? ` (${w.pellets}x${w.dmg.toFixed(1)})` : '')], ['FIRE RATE', Math.round(w.rpm) + ' RPM'], ['MAGAZINE', w.mag],
        ['RANGE', Math.round(w.range) + ' M'], ['RELOAD', w.reload.toFixed(2) + ' S'], ['AMMO', nm(w.ammo)], ['MODE', String(w.mode).toUpperCase()], ['ARK PEN', Math.round((w.armorPen || 0) * 100) + '%'],
        ['DURABILITY', `${Math.round(s.dur ?? w.durability)} / ${Math.round(w.durability)}`]);
    } else if (d.mod) {
      rows.push(['SLOT', SLOT_NAME[d.mod.slot] || d.mod.slot]);
      for (const [k, m] of Object.entries(d.mod.stats || {})) { const [lab, good] = MOD_STAT[k] || [k.toUpperCase(), 1]; const pct = Math.round((m - 1) * 100); rows.push([lab, `<span class="${(pct > 0) === (good > 0) ? 'green' : 'red'}">${pct > 0 ? '+' : ''}${pct}%</span>`]); }
      rows.push(['FITS', (d.mod.weapons || d.mod.fits || []).map(x => ITEMS[x]?.name || String(x).replace(/_/g, ' ')).join(', ').toUpperCase()]);
    } else if (d.augment) {
      const a = d.augment, ex = a.extra ? Object.values(a.extra).reduce((x, y) => x + y, 0) : 0;
      rows.push(['BACKPACK', a.backpack], ['QUICK USE', a.quick + ex], ['SAFE POCKET', a.safe], ['WEIGHT LIMIT', a.weightLimit + ' KG'], ['SHIELDS', (a.shields || []).join(' / ').toUpperCase() || 'NONE']);
      if (a.perkDesc) rows.push(['PERK', `<span class="cream">${esc(a.perkDesc)}</span>`]);
    } else if (d.shield) rows.push(['CLASS', d.shield.cls.toUpperCase()], ['CAPACITY', d.shield.capacity], ['MITIGATION', Math.round(d.shield.mitigation * 100) + '%'], ['MOVE SPEED', Math.round(d.shield.moveMul * 100) + '%']);
    else if (d.use) {
      const u = d.use;
      if (u.heal) rows.push(['HEALS', u.heal]); if (u.healOverTime) rows.push(['HEALS', `${u.healOverTime.amount} / ${u.healOverTime.dur} S`]);
      if (u.shield) rows.push(['SHIELD', u.shield]); if (u.shieldOverTime) rows.push(['SHIELD', `${u.shieldOverTime.amount} / ${u.shieldOverTime.dur} S`]);
      if (u.stamina) rows.push(['STAMINA', u.stamina]); if (u.effect) rows.push(['EFFECT', String(u.effect).toUpperCase()]);
      rows.push(['USE TIME', (u.time || 1) + ' S']); if (u.cooldown) rows.push(['COOLDOWN', u.cooldown + ' S']);
    } else if (d.throw) { const t = d.throw; rows.push(['KIND', String(t.kind).toUpperCase()]); if (t.radius) rows.push(['RADIUS', t.radius + ' M']); if (t.dmg) rows.push(['DAMAGE', t.dmg]); if (t.dur) rows.push(['DURATION', t.dur + ' S']); }
    else if (d.blueprint) { const r = Craft.RECIPE_BY_ID[d.blueprint]; rows.push(['TEACHES', r ? nm(r.out) : d.blueprint], ['BENCH', r ? `${Craft.BENCHES[r.bench]?.name} ${ROM[r.level]}` : '-'], ['STATUS', (this.p.blueprints || []).includes(d.blueprint) ? '<span class="green">LEARNED</span>' : '<span class="yellow">NEW</span>']); }
    else if (d.key) rows.push(['OPENS', String(d.key.room || '').replace(/_/g, ' ').toUpperCase()], ['MAP', d.key.map === 'any' ? 'ANY' : (Q.MAP_NAMES[d.key.map] || d.key.map).toUpperCase()]);
    else if (d.material) rows.push(['MATERIAL', String(d.material.tier).toUpperCase()]);
    rows.push(['WEIGHT', `${(d.weight * (s.qty || 1)).toFixed(2)} KG`], ['VALUE', s.free ? '<span class="red">UNSELLABLE</span>' : `${fmt(Eco.fullValue(s))}${s.qty > 1 ? ` <span class="dimc">(${fmt(Eco.unitSellPrice(s))} EA)</span>` : ''}`]);
    if (d.stack > 1) rows.push(['STACK', `${s.qty || 1} / ${d.stack}`]);
    if (d.recycle && !s.free) rows.push(['RECYCLES', Object.entries(d.recycle).map(([k, n]) => `${n} ${nm(k)}`).join(', ').toUpperCase()]);
    return rows;
  }
  itemInfo(s) {
    const d = ITEMS[s.id], box = div('ii');
    const big = div('ii-icon r-' + d.rarity + (d.type === 'weapon' ? ' wide' : ''), `<img src="${iconURL(s.id)}" draggable="false">`);
    const t = div('ii-t', `<div class="ii-name" style="color:${RAR[d.rarity]}">${esc(d.name)}${d.type === 'weapon' ? ` <span class="tier">${ROM[s.tier || 1]}</span>` : ''}${s.qty > 1 ? ` <span class="dimc">x${s.qty}</span>` : ''}</div>
      <div class="ii-sub">${d.rarity.toUpperCase()} · ${(TYPE_LABEL[d.type] || d.type).toUpperCase()}${d.weapon ? ' · ' + d.weapon.class.replace(/_/g, ' ').toUpperCase() : ''}</div>`);
    const top = div('ii-top'); top.append(big, t); box.appendChild(top);
    if (s.free) box.appendChild(div('ii-free', 'FREE LOADOUT ITEM · CANNOT BE SOLD OR RECYCLED'));
    box.appendChild(div('ii-desc', esc(d.desc || '')));
    const g = div('ii-stats'); g.innerHTML = this.statRows(s).map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join(''); box.appendChild(g);
    if (d.type === 'weapon' && Object.keys(s.mods || {}).length) box.appendChild(div('ii-mods', 'MODS: ' + Object.entries(s.mods).map(([sl, m]) => `<b>${esc(nm(m))}</b>`).join(', ')));
    return box;
  }

  // ---------------------------------------------------------------- context menu + modals
  openMenu(x, y, items) {
    this.closeMenu();
    const m = div('hub-menu');
    for (const it of items) {
      if (it === '-') { m.appendChild(div('sep')); continue; }
      const b = btn(it.label, 'mi' + (it.cls ? ' ' + it.cls : ''), () => { this.closeMenu(); it.fn(); }, it.disabled);
      m.appendChild(b);
    }
    this.root.appendChild(m);
    const w = m.offsetWidth, h = m.offsetHeight;
    m.style.left = Math.min(x, innerWidth - w - 4) + 'px'; m.style.top = Math.min(y, innerHeight - h - 4) + 'px';
    this.menu = m; this.sfx('ui_hover');
  }
  closeMenu() { this.menu?.remove(); this.menu = null; }
  openModal(title, { wide = false, cls = '' } = {}) {
    this.closeModal();
    const ov = div('hub-modal'), box = div('hm-box ' + (wide ? 'wide ' : '') + cls);
    const h = div('hm-h', `<span>${title}</span>`); h.appendChild(btn('X', 'hm-x', () => this.closeModal()));
    const b = div('hm-b');
    box.append(h, b); ov.appendChild(box);
    ov.addEventListener('click', (e) => { if (e.target === ov) this.closeModal(); });
    this.root.appendChild(ov);
    this.modal = { ov, box, body: b };
    this.sfx('ui_open');
    return b;
  }
  closeModal() { if (!this.modal) return; const m = this.modal; this.modal = null; this.refreshModal = null; m.ov.remove(); Tooltip.hide(); m.onClose?.(); }
  choiceBox(title, html, choices) {
    return new Promise((res) => {
      const b = this.openModal(title, { cls: 'small' });
      b.appendChild(div('hm-text', html));
      const row = div('hm-btns');
      for (const c of choices) row.appendChild(btn(c.label, c.cls || '', () => { this.modal.onClose = null; this.closeModal(); res(c.value); }, c.disabled));
      row.appendChild(btn('CANCEL', 'ghost', () => this.closeModal()));
      b.appendChild(row);
      this.modal.onClose = () => res(null);
    });
  }
  async confirmBox(title, html, okLabel = 'CONFIRM', danger = false) { return (await this.choiceBox(title, html, [{ label: okLabel, value: true, cls: danger ? 'danger' : 'primary' }])) === true; }

  // ================================================================ LOADOUT & STASH
  resolve(ref) {
    if (!ref) return null;
    const p = this.p;
    if (ref.c === 'stash') return p.stash.find(s => s && s.uid === ref.uid) || null;
    if (ref.c === 'mod') { const g = this.weaponByKey(ref.w); const id = g?.mods?.[ref.slot]; return id ? { id, qty: 1, uid: 'mod_' + ref.w + '_' + ref.slot } : null; }
    if (LO_C.has(ref.c)) return getSlot(p.loadout, ref);
    return null;
  }
  weaponByKey(k) { const p = this.p; return p.loadout.weapons.find(w => w && w.uid === k) || p.stash.find(s => s && s.uid === k && ITEMS[s.id]?.type === 'weapon') || null; }
  // removes qty from a stash stack; removing the whole stack keeps the object's qty intact (it is being moved)
  removeFromStash(s, qty = s.qty) { if (qty >= s.qty) { const i = this.p.stash.indexOf(s); if (i >= 0) this.p.stash.splice(i, 1); } else s.qty -= qty; }
  fail(msg) { this.toast(msg, 'bad'); return false; }
  modFits(modId, g, slot = null) {
    const md = ITEMS[modId]?.mod, wd = ITEMS[g?.id]?.weapon; if (!md || !wd) return false;
    if (slot && md.slot !== slot) return false;
    if (!(wd.slots || []).includes(md.slot)) return false;
    return md.weapons ? md.weapons.includes(g.id) : (md.fits || []).includes(wd.class);
  }
  clampAmmo(g) { const ws = weaponStats(g); if ((g.ammo || 0) > ws.mag) { const ex = g.ammo - ws.mag; g.ammo = ws.mag; if (!ITEMS[ws.ammo]?.ammo?.refillsMag) this.forceStash(makeStack(ws.ammo, ex)); } }
  attachMod(from, wKey, slot) {
    const g = this.weaponByKey(wKey), A = this.resolve(from);
    if (!g || !A) return false;
    if (!this.modFits(A.id, g, slot)) return this.fail(`${nm(A.id)} does not fit ${nm(g.id)}${slot ? ' (' + SLOT_NAME[slot] + ')' : ''}`);
    const md = ITEMS[A.id].mod; slot = slot || md.slot;
    if (from.c === 'mod') { const src = this.weaponByKey(from.w); if (src === g && from.slot === slot) return false; delete src.mods[from.slot]; this.clampAmmo(src); }
    else if (from.c === 'stash') this.removeFromStash(A, 1);
    else { A.qty -= 1; if (A.qty <= 0) setSlot(this.p.loadout, from, null); }
    const old = g.mods?.[slot];
    g.mods = { ...(g.mods || {}), [slot]: A.id };
    if (old) this.forceStash(makeStack(old, 1));
    this.clampAmmo(g);
    this.toast(`${nm(A.id)} attached to ${nm(g.id)}`, 'good');
    return true;
  }
  detachMod(wKey, slot, to = null) {
    const g = this.weaponByKey(wKey), id = g?.mods?.[slot]; if (!id) return false;
    const st = makeStack(id, 1);
    if (to && LO_C.has(to.c) && ['backpack', 'safe'].includes(to.c) && !getSlot(this.p.loadout, to)) setSlot(this.p.loadout, to, st);
    else { if (!P.stashFits(this.p, [st])) return this.fail('Stash is full'); P.stashPut(this.p, st); }
    delete g.mods[slot]; this.clampAmmo(g);
    return true;
  }
  // core move between stash, loadout slots and weapon mod slots
  transfer(from, to) {
    const p = this.p, lo = p.loadout, caps = this.caps();
    if (!to || sameRef(from, to) || to.c === 'view') return false;
    const A = this.resolve(from); if (!A) return false;
    if (to.c === 'mod') return ITEMS[A.id]?.type === 'mod' ? this.attachMod(from, to.w, to.slot) : this.fail('Only weapon mods fit there');
    if (from.c === 'mod') return this.detachMod(from.w, from.slot, to);
    if (to.c === 'stash') {
      if (from.c === 'stash') return false;
      if (!P.stashFits(p, [A])) return this.fail('Stash is full');
      setSlot(lo, from, null); P.stashPut(p, A); return true;
    }
    if (!LO_C.has(to.c)) return false;
    const B = getSlot(lo, to);
    if (!accepts(to, A, caps)) {
      const d = ITEMS[A.id];
      if (to.c === 'shield' && d.type === 'shield') return this.fail(caps.shields.length ? `Augment only supports ${caps.shields.join('/')} shields` : 'Equip an augment to use shields');
      if (to.c === 'quick') return this.fail('Only consumables, grenades, traps and gadgets go in quick use');
      return this.fail(`${d.name} can't go there`);
    }
    if (from.c === 'stash') {
      if (B && B.id === A.id && maxStack(A.id) > 1 && !!B.free === !!A.free) {
        const t = Math.min(maxStack(A.id) - B.qty, A.qty); if (t <= 0) return this.fail('That stack is full');
        B.qty += t; this.removeFromStash(A, t); return true;
      }
      this.removeFromStash(A);
      setSlot(lo, to, A);
      if (B) this.forceStash(B);
      return true;
    }
    if (B && B.id === A.id && !!B.free !== !!A.free) { if (!accepts(from, B, caps)) return false; setSlot(lo, to, A); setSlot(lo, from, B); return true; }
    return moveSlot(lo, from, to, {}, caps) || this.fail('Cannot move there');
  }
  doTransfer(from, to) {
    const ok = this.transfer(from, to);
    if (ok) { if (from.c !== 'stash' || to.c !== 'stash') this.sfx('ui_equip'); this.fixLoadout(); this.save(); this.render(); this.refreshModal?.(); }
    else this.sfx('ui_error');
    return ok;
  }
  // best destination for a stash/loadout item ("quick move")
  autoTarget(ref, s) {
    const lo = this.p.loadout, caps = this.caps(), d = ITEMS[s.id];
    if (ref.c !== 'stash') return { c: 'stash' };
    if (d.type === 'augment') return { c: 'augment' };
    if (d.type === 'shield') return { c: 'shield' };
    if (d.type === 'weapon') { const i = lo.weapons.findIndex((w, k) => !w && k < caps.weaponSlots); return { c: 'weapons', i: i >= 0 ? i : 0 }; }
    if (d.type === 'mod') { const g = lo.weapons.find(w => w && this.modFits(s.id, w)); if (g) return { c: 'mod', w: g.uid, slot: d.mod.slot }; }
    if (QUICK_TYPES.has(d.type)) { const t = this.slotFor('quick', s); if (t) return t; }
    return this.slotFor('backpack', s);
  }
  slotFor(c, s) {
    const arr = this.p.loadout[c] || [];
    let i = arr.findIndex(x => x && x.id === s.id && x.qty < maxStack(s.id) && !!x.free === !!s.free);
    if (i < 0) i = arr.findIndex(x => !x);
    return i >= 0 ? { c, i } : null;
  }
  quickMove(ref) {
    const s = this.resolve(ref); if (!s) return;
    if (ref.c === 'mod') { if (this.detachMod(ref.w, ref.slot)) { this.sfx('ui_equip'); this.save(); this.render(); } return; }
    const to = this.autoTarget(ref, s);
    if (!to) { this.fail('No free slot - backpack is full'); this.sfx('ui_error'); return; }
    this.doTransfer(ref, to);
  }
  moveTo(ref, c) { const s = this.resolve(ref); if (!s) return; const to = this.slotFor(c, s); if (!to) { this.fail(`${c === 'safe' ? 'Safe pocket' : c === 'quick' ? 'Quick use' : 'Backpack'} is full`); return; } this.doTransfer(ref, to); }
  fillAmmo() {
    const p = this.p, lo = p.loadout, caps = this.caps(), notes = [];
    const guns = lo.weapons.slice(0, caps.weaponSlots).filter(Boolean);
    if (!guns.length) return this.commit({ ok: false, msg: 'No weapon equipped' });
    const takeAmmo = (am, n) => { let got = P.stashTake(p, am, n); if (got < n) got += takeFrom2(lo.backpack, am, n - got); return got; };
    const targets = {};
    for (const g of guns) {
      const ws = weaponStats(g), am = ws.ammo, refill = ITEMS[am]?.ammo?.refillsMag;
      if ((g.ammo || 0) < ws.mag) {
        if (refill) { if (takeAmmo(am, 1)) g.ammo = ws.mag; }
        else g.ammo = (g.ammo || 0) + takeAmmo(am, ws.mag - (g.ammo || 0));
      }
      targets[am] = Math.min(maxStack(am) * 3, (targets[am] || 0) + Eco.reserveTarget(g));
    }
    let moved = 0;
    for (const [am, target] of Object.entries(targets)) {
      const have = countIn([lo.backpack, lo.quick, lo.safe], am);
      if (have >= target) continue;
      const want = target - have, n = P.stashTake(p, am, want);
      if (n <= 0) { notes.push(`No ${nm(am)} in stash`); continue; }
      const left = addToSlots(lo.backpack, { id: am, qty: n, uid: newUid() });
      if (left > 0) { this.forceStash(makeStack(am, left)); notes.push('Backpack full'); }
      moved += n - left;
      if (n < want) notes.push(`Short on ${nm(am)}`);
    }
    P.compactStash(p);
    this.commit({ ok: true, msg: (moved ? `Loaded ammo (+${moved} reserve)` : 'Magazines topped up') + (notes.length ? ' · ' + notes.join(' · ') : '') }, 'reload_end');
  }
  async freeLoadout() {
    const p = this.p;
    if (!Eco.freeLoadoutAvailable(p)) return this.commit({ ok: false, msg: 'Free loadout already claimed - one per raid' });
    const ok = await this.confirmBox('FREE LOADOUT', '<p>Get a random basic kit for free: a Free Loadout Augment, a common weapon with ammo and bandages (sometimes a shield or grenades).</p><p class="dimc">Your current loadout is moved to the stash. Free kit items are marked <b class="yellow">F</b> and cannot be sold or recycled. One claim per raid.</p>', 'CLAIM KIT');
    if (!ok) return;
    this.commit(Eco.claimFreeLoadout(p), 'ui_equip');
  }
  unequipAll() {
    const p = this.p, lo = p.loadout, all = allStacks(lo);
    if (!all.length) return;
    if (!P.stashFits(p, all)) return this.commit({ ok: false, msg: 'Stash is full' });
    for (const s of all) P.stashPut(p, s);
    lo.augment = null; lo.shield = null; lo.weapons = lo.weapons.map(() => null);
    for (const k of ['backpack', 'quick', 'safe']) lo[k] = lo[k].map(() => null);
    this.commit({ ok: true, msg: 'Loadout moved to stash' }, 'ui_drop');
  }
  actionsFor(ref, s) {
    const d = ITEMS[s.id], caps = this.caps(), acts = [], p = this.p;
    if (ref.c === 'stash') {
      if (['weapon', 'augment', 'shield'].includes(d.type)) acts.push({ label: 'EQUIP', fn: () => this.quickMove(ref), cls: 'hi' });
      else if (d.type === 'mod' && this.autoTarget(ref, s)?.c === 'mod') acts.push({ label: 'ATTACH TO EQUIPPED WEAPON', fn: () => this.quickMove(ref), cls: 'hi' });
      else if (QUICK_TYPES.has(d.type)) acts.push({ label: 'ADD TO QUICK USE', fn: () => this.moveTo(ref, 'quick'), cls: 'hi' });
      acts.push({ label: 'MOVE TO BACKPACK', fn: () => this.moveTo(ref, 'backpack') });
      if (caps.safe) acts.push({ label: 'MOVE TO SAFE POCKET', fn: () => this.moveTo(ref, 'safe') });
      if (d.type === 'weapon') acts.push({ label: 'MODS & UPGRADES', fn: () => this.openWeapon(s.uid) });
      if (d.type === 'blueprint') { const k = Craft.blueprintKnown(p, s.id); acts.push({ label: k ? 'ALREADY LEARNED' : 'LEARN BLUEPRINT', disabled: k, cls: k ? '' : 'hi', fn: () => this.commit(Craft.learnBlueprint(p, s.uid), 'ui_upgrade') }); }
      if (Craft.canRecycle(s)) acts.push({ label: 'RECYCLE...', fn: () => this.recycleDialog(s) });
      if (!s.free && Eco.canSellTo('celesta', s.id)) acts.push({ label: `SELL... (${fmt(Eco.unitSellPrice(s))} EA)`, fn: () => this.sellDialog('celesta', s) });
    } else if (ref.c === 'mod') {
      acts.push({ label: 'DETACH TO STASH', fn: () => this.quickMove(ref), cls: 'hi' });
    } else {
      acts.push({ label: 'MOVE TO STASH', fn: () => this.doTransfer(ref, { c: 'stash' }), cls: 'hi' });
      if (['quick', 'safe'].includes(ref.c)) acts.push({ label: 'MOVE TO BACKPACK', fn: () => this.moveTo(ref, 'backpack') });
      if (ref.c === 'backpack' && QUICK_TYPES.has(d.type)) acts.push({ label: 'MOVE TO QUICK USE', fn: () => this.moveTo(ref, 'quick') });
      if (ref.c === 'backpack' && caps.safe) acts.push({ label: 'MOVE TO SAFE POCKET', fn: () => this.moveTo(ref, 'safe') });
      if (d.type === 'weapon') acts.push({ label: 'MODS & UPGRADES', fn: () => this.openWeapon(s.uid) });
    }
    return acts;
  }
  async sellDialog(tid, s) {
    const unit = Eco.unitSellPrice(s);
    let qty = 1;
    if (s.qty > 1) {
      const v = await this.choiceBox('SELL ' + esc(nm(s.id)).toUpperCase(), `<p>Sell to ${esc(TRADERS[tid].name)} for <b class="yellow">${fmt(unit)}</b> Scrip each.</p>`,
        [{ label: `SELL 1 · ${fmt(unit)}`, value: 1 }, { label: `SELL ALL ${s.qty} · ${fmt(unit * s.qty)}`, value: s.qty, cls: 'primary' }]);
      if (!v) return; qty = v;
    } else {
      const extra = Object.keys(s.mods || {}).length ? '<p class="dimc">Attached mods are returned to your stash.</p>' : '';
      if (!(await this.confirmBox('SELL ' + esc(nm(s.id)).toUpperCase(), `<p>Sell to ${esc(TRADERS[tid].name)} for <b class="yellow">${fmt(unit)}</b> Scrip?</p>${extra}`, 'SELL'))) return;
    }
    this.commit(Eco.sell(this.p, tid, s.uid, qty), 'ui_sell');
  }
  async recycleDialog(s) {
    const p = this.p, prev = (q) => Object.entries(Craft.recyclePreview(p, s, q)).map(([k, n]) => `${n} ${esc(nm(k))}`).join(', ') || 'nothing';
    const choices = [{ label: 'RECYCLE 1', value: 1, cls: s.qty > 1 ? '' : 'primary' }];
    if (s.qty > 1) choices.push({ label: `RECYCLE ALL ${s.qty}`, value: s.qty, cls: 'primary' });
    const extra = ITEMS[s.id].type === 'weapon' && (Object.keys(s.mods || {}).length || s.ammo) ? '<p class="dimc">Mods and loaded ammo go back to the stash.</p>' : '';
    const v = await this.choiceBox('RECYCLE ' + esc(nm(s.id)).toUpperCase(), `<p>1x yields: <b class="cream">${prev(1)}</b></p>${s.qty > 1 ? `<p>All ${s.qty}: <b class="cream">${prev(s.qty)}</b></p>` : ''}${extra}`, choices);
    if (!v) return;
    this.commit(Craft.recycle(p, s.uid, v), 'ui_craft');
  }

  tabLoadout(body) {
    if (this.fixLoadout()) this.save();
    const p = this.p, lo = p.loadout, caps = this.caps(), S = this.st.loadout;
    if (S.sel && !this.resolve(S.sel)) S.sel = null;
    const wrap = div('lo-wrap');
    // ---- loadout panel
    const weight = loadoutWeight(lo), value = allStacks(lo).reduce((a, s) => a + Eco.fullValue(s), 0);
    const L = this.panel('LOADOUT', 'lo-panel', `<span class="${weight > caps.weightLimit ? 'red' : ''}">${weight.toFixed(1)} / ${caps.weightLimit} KG</span>`);
    const isSel = (ref) => sameRef(ref, S.sel);
    const C = (s, ref, o = {}) => this.cellX(s, ref, { ...o, sel: isSel(ref) });
    const sec = (title, node, cls = '') => { const c = div('lo-sec ' + cls); c.appendChild(div('lbl', title)); c.appendChild(node); return c; };
    const top = div('lo-top');
    top.appendChild(sec('AUGMENT', C(lo.augment, { c: 'augment' }, { hint: 'AUG' })));
    top.appendChild(sec('SHIELD', C(lo.shield, { c: 'shield' }, { hint: caps.shields.length ? 'SHD' : '--' })));
    const ad = ITEMS[lo.augment?.id];
    top.appendChild(div('lo-auginfo', `<div class="nm" style="color:${ad ? RAR[ad.rarity] : 'var(--dim)'}">${ad ? esc(ad.name) : 'NO AUGMENT'}</div>
      <div>BACKPACK <b>${caps.backpack}</b> · QUICK <b>${caps.quick}</b> · SAFE <b>${caps.safe}</b></div>
      <div>SHIELDS <b>${caps.shields.join('/').toUpperCase() || 'NONE'}</b> · LIMIT <b>${caps.weightLimit} KG</b></div>${ad?.augment?.perkDesc ? `<div class="perk">${esc(ad.augment.perkDesc)}</div>` : ''}`));
    L.body.appendChild(top);
    const guns = div('lo-guns');
    for (let i = 0; i < Math.max(2, caps.weaponSlots); i++) {
      const g = lo.weapons[i], row = div('lo-gun' + (i >= caps.weaponSlots ? ' off' : ''));
      row.appendChild(C(g, { c: 'weapons', i }, { wide: true, hint: 'WEAPON ' + (i + 1) }));
      const meta = div('lo-gmeta');
      if (g) {
        const ws = weaponStats(g), d = ITEMS[g.id], res = countIn([lo.backpack, lo.quick, lo.safe], ws.ammo);
        meta.innerHTML = `<div class="nm" style="color:${RAR[d.rarity]}">${esc(d.name)} <span class="tier">${ROM[g.tier || 1]}</span></div>
          <div class="am ${(g.ammo || 0) + res <= 0 ? 'red' : ''}">${esc(nm(ws.ammo)).toUpperCase()} <b>${g.ammo || 0}/${ws.mag}</b> · ${res} RES</div>`;
        const mods = div('lo-mods');
        for (const sl of d.weapon.slots || []) { const m = g.mods?.[sl]; const ref = { c: 'mod', w: g.uid, slot: sl }; mods.appendChild(C(m ? { id: m, qty: 1, uid: 'm' } : null, ref, { mini: true, hint: SLOT_HINT[sl] || '?' })); }
        if (!(d.weapon.slots || []).length) mods.appendChild(div('dimc tiny', 'NO MOD SLOTS'));
        meta.appendChild(mods);
      } else meta.innerHTML = `<div class="dimc tiny">${i >= caps.weaponSlots ? 'SLOT LOCKED BY AUGMENT' : 'EMPTY - DRAG A WEAPON HERE'}</div>`;
      row.appendChild(meta); guns.appendChild(row);
    }
    L.body.appendChild(sec('WEAPONS', guns));
    const row2 = div('lo-row2');
    const q = div('slots'); lo.quick.forEach((s, i) => q.appendChild(C(s, { c: 'quick', i }, { hint: String(i + 1) })));
    row2.appendChild(sec('QUICK USE', q));
    if (caps.safe) { const sf = div('slots'); lo.safe.forEach((s, i) => sf.appendChild(C(s, { c: 'safe', i }, { hint: 'SAFE' }))); row2.appendChild(sec('SAFE POCKET', sf, 'safe')); }
    L.body.appendChild(row2);
    const bp = div('slots lo-bp'); lo.backpack.forEach((s, i) => bp.appendChild(C(s, { c: 'backpack', i })));
    L.body.appendChild(sec(`BACKPACK <span class="dimc">${lo.backpack.filter(Boolean).length}/${caps.backpack}</span>`, bp));
    L.body.appendChild(this.lodoll());
    const foot = div('lo-foot');
    foot.innerHTML = `<div class="lo-wbar"><div class="bar ${weight > caps.weightLimit ? 'over' : ''}"><i style="width:${(clamp01(weight / caps.weightLimit) * 100).toFixed(1)}%"></i></div>
      <span>WEIGHT <b>${weight.toFixed(1)}/${caps.weightLimit}</b></span><span>VALUE <b class="yellow">${fmt(value)}</b></span></div>`;
    const bb = div('lo-btns');
    bb.append(btn('FILL AMMO', '', () => this.fillAmmo()), btn(Eco.freeLoadoutAvailable(p) ? 'FREE LOADOUT' : 'FREE KIT USED', 'free', () => this.freeLoadout(), !Eco.freeLoadoutAvailable(p)), btn('UNEQUIP ALL', 'ghost', () => this.unequipAll()));
    foot.appendChild(bb);
    L.root.appendChild(foot);
    wrap.appendChild(L.root);

    // ---- stash panel
    const ex = Eco.stashExpansion(p), used = p.stash.length;
    const R = this.panel('STASH', 'st-panel', `<span class="${used > p.stashSize ? 'red' : used > p.stashSize * 0.9 ? 'yellow' : ''}">${used} / ${p.stashSize}</span>`);
    if (!ex.maxed) R.right.appendChild(btn(`+${ex.slots} SLOTS · ${fmt(ex.price)}`, 'sm', async () => {
      if (await this.confirmBox('EXPAND STASH', `<p>Add <b>${ex.slots}</b> stash slots for <b class="yellow">${fmt(ex.price)}</b> Scrip?</p>`, 'BUY')) this.commit(Eco.buyStashExpansion(p), 'ui_buy');
    }, p.coins < ex.price));
    const tools = div('st-tools');
    const search = el('input'); search.type = 'text'; search.placeholder = 'SEARCH...'; search.value = S.q; search.className = 'st-search';
    const sort = el('select'); sort.innerHTML = SORTS.map(([k, l]) => `<option value="${k}" ${S.sort === k ? 'selected' : ''}>SORT: ${l}</option>`).join('');
    tools.append(search, sort);
    R.body.appendChild(tools);
    const chips = div('chips');
    const counts = {}; for (const s of p.stash) { const t = ITEMS[s.id]?.type; for (const [k, , types] of FILTERS) if (!types || types.includes(t)) counts[k] = (counts[k] || 0) + 1; }
    for (const [k, l] of FILTERS) { const c = btn(`${l} <i>${counts[k] || 0}</i>`, 'chip' + (S.filter === k ? ' on' : ''), () => { S.filter = k; chips.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === c)); this.renderStashGrid(grid); }); chips.appendChild(c); }
    R.body.appendChild(chips);
    const grid = div('slots st-grid scroll'); grid.dataset.scroll = 'stash';
    R.body.appendChild(grid);
    search.addEventListener('input', () => { S.q = search.value; this.renderStashGrid(grid); });
    search.addEventListener('keydown', (e) => e.stopPropagation());
    sort.addEventListener('change', () => { S.sort = sort.value; this.renderStashGrid(grid); });
    this.renderStashGrid(grid);
    wrap.appendChild(R.root);

    // ---- inspector
    const I = this.panel('DETAILS', 'in-panel');
    this.renderInspector(I.body);
    wrap.appendChild(I.root);
    body.appendChild(wrap);

    this.dnd = {
      onDrop: (from, to) => { if (to?.c === 'view' || from?.c === 'view' || (from?.c === 'stash' && to?.c === 'stash')) return; this.doTransfer(from, to); },
      onClick: (ref, s, e) => {
        if (ref.c === 'view') return;
        const key = JSON.stringify(ref), now = performance.now();
        const dbl = this.lastClick.key === key && now - this.lastClick.t < 320; this.lastClick = { key, t: now };
        if (e.shiftKey) { this.quickMove(ref); return; }
        if (dbl) { const it = this.resolve(ref); if (ITEMS[it?.id]?.type === 'weapon') this.openWeapon(it.uid); else this.quickMove(ref); return; }
        S.sel = ref; this.sfx('ui_click'); this.render();
      },
      onRight: (ref, s, e) => { if (ref.c === 'view') return; S.sel = ref; const acts = this.actionsFor(ref, s); this.render(); this.openMenu(e.clientX, e.clientY, acts); },
    };
  }
  // raider preview + pre-deploy readiness checklist
  lodoll() {
    const p = this.p, lo = p.loadout, caps = this.caps();
    const box = div('lo-doll');
    const pv = div('doll'); const art = raiderArt(OUTFITS?.[p.settings.outfit || 'scav'] || OUTFITS?.scav || {}); pv.appendChild(art); box.appendChild(pv);
    const guns = lo.weapons.slice(0, caps.weaponSlots).filter(Boolean);
    const ammoOk = guns.length && guns.every(g => { const ws = weaponStats(g); return (g.ammo || 0) + countIn([lo.backpack, lo.quick, lo.safe], ws.ammo) > 0; });
    const ammoLow = guns.some(g => { const ws = weaponStats(g); return countIn([lo.backpack, lo.quick, lo.safe], ws.ammo) < Math.min(ws.mag, 10) && !ITEMS[ws.ammo]?.ammo?.refillsMag; });
    const broken = guns.some(g => (g.dur ?? 1) <= 0);
    const heal = allStacks(lo).filter(s => ITEMS[s.id]?.use?.heal || ITEMS[s.id]?.use?.healOverTime).reduce((a, s) => a + s.qty, 0);
    const w = loadoutWeight(lo);
    const rows = [
      ['WEAPON', guns.length ? (broken ? 'bad' : 'ok') : 'bad', guns.length ? (broken ? 'BROKEN' : guns.map(g => nm(g.id).toUpperCase()).join(' + ')) : 'NONE'],
      ['AMMO', !guns.length ? 'bad' : !ammoOk ? 'bad' : ammoLow ? 'warn' : 'ok', !guns.length ? '-' : !ammoOk ? 'EMPTY' : ammoLow ? 'LOW' : 'OK'],
      ['SHIELD', lo.shield ? 'ok' : 'warn', lo.shield ? nm(lo.shield.id).toUpperCase() : 'NONE'],
      ['HEALING', heal ? 'ok' : 'warn', heal ? `${heal} ITEM${heal > 1 ? 'S' : ''}` : 'NONE'],
      ['AUGMENT', lo.augment ? 'ok' : 'warn', lo.augment ? nm(lo.augment.id).toUpperCase() : 'BASIC'],
      ['WEIGHT', w > caps.weightLimit ? 'warn' : 'ok', `${Math.round(100 * w / caps.weightLimit)}%`],
    ];
    const bad = rows.some(r => r[1] === 'bad'), warn = rows.some(r => r[1] === 'warn');
    box.appendChild(div('chk', `<div class="verdict ${bad ? 'bad' : warn ? 'warn' : 'ok'}">${bad ? 'NOT READY' : warn ? 'READY - RISKY' : 'READY TO DEPLOY'}</div>${rows.map(([k, st, v]) => `<div class="ck ${st}"><i></i><span>${k}</span><b>${esc(v)}</b></div>`).join('')}`));
    return box;
  }
  renderStashGrid(grid) {
    const p = this.p, S = this.st.loadout;
    const types = FILTERS.find(f => f[0] === S.filter)?.[2] || null, q = S.q.trim().toLowerCase();
    let list = p.stash.filter(s => s && ITEMS[s.id] && (!types || types.includes(ITEMS[s.id].type)) && (!q || ITEMS[s.id].name.toLowerCase().includes(q) || (ITEMS[s.id].tags || []).some(t => t.includes(q))));
    const ri = (s) => RARITY_ORDER.indexOf(ITEMS[s.id].rarity), ti = (s) => TYPE_ORDER.indexOf(ITEMS[s.id].type), nmc = (a, b) => ITEMS[a.id].name.localeCompare(ITEMS[b.id].name);
    const cmp = { rarity: (a, b) => ri(b) - ri(a) || ti(a) - ti(b) || nmc(a, b), value: (a, b) => Eco.fullValue(b) - Eco.fullValue(a) || nmc(a, b), type: (a, b) => ti(a) - ti(b) || ri(b) - ri(a) || nmc(a, b), name: nmc }[S.sort] || (() => 0);
    list.sort(cmp);
    grid.innerHTML = ''; Tooltip.hide();
    for (const s of list) grid.appendChild(this.cellX(s, { c: 'stash', uid: s.uid }, { sel: sameRef({ c: 'stash', uid: s.uid }, S.sel) }));
    const fill = !types && !q ? Math.max(0, p.stashSize - list.length) : Math.max(4, 12 - (list.length % 12));
    for (let i = 0; i < fill; i++) grid.appendChild(this.cellX(null, { c: 'stash', uid: null, empty: i }));
    if (!list.length && (types || q)) grid.prepend(div('st-empty', 'NOTHING MATCHES'));
  }
  renderInspector(box) {
    const p = this.p, S = this.st.loadout, s = S.sel && this.resolve(S.sel);
    if (!s) {
      const st = computeStats(p.skills || {}, SKILL_TREE), caps = this.caps(), sh = ITEMS[p.loadout.shield?.id]?.shield;
      box.appendChild(div('in-sum', `<div class="lbl">RAIDER STATUS</div>
        <div class="kv"><span>HEALTH</span><b>${Math.round(st.max_hp)}</b><span>SHIELD</span><b>${sh ? sh.capacity + ' · ' + Math.round(sh.mitigation * 100) + '%' : 'NONE'}</b>
        <span>STAMINA</span><b>${Math.round(st.max_stamina)}</b><span>MOVE SPEED</span><b>${st.move_speed.toFixed(2)} M/S</b><span>CARRY LIMIT</span><b>${caps.weightLimit} KG</b>
        <span>BACKPACK</span><b>${caps.backpack} SLOTS</b><span>QUICK USE</span><b>${caps.quick} SLOTS</b><span>SAFE POCKET</span><b>${caps.safe} SLOTS</b></div>
        <div class="lbl" style="margin-top:calc(var(--u)*6)">HOW TO</div>
        <ul class="howto">${touchEnabled() ? `<li><b>TAP</b> an item to inspect it - its actions appear here</li><li><b>DOUBLE-TAP</b> to quick-equip / store</li><li><b>HOLD</b> an item, then drag it between stash and loadout</li><li><b>HOLD</b> without moving for the actions menu</li><li>Double-tap a weapon for mods & upgrades</li>` : `<li><b>CLICK</b> an item to inspect it</li><li><b>DRAG</b> between stash and loadout</li><li><b>SHIFT+CLICK</b> to quick-equip / store</li><li><b>RIGHT-CLICK</b> for actions</li><li><b>DOUBLE-CLICK</b> a weapon for mods & upgrades</li><li>Drag a <b>mod</b> onto a weapon's small slots</li>`}</ul>`));
      return;
    }
    box.appendChild(this.itemInfo(s));
    const acts = div('in-acts');
    for (const a of this.actionsFor(S.sel, s)) acts.appendChild(btn(a.label, a.cls === 'hi' ? 'primary' : '', a.fn, a.disabled));
    box.appendChild(acts);
  }

  // ---------------------------------------------------------------- weapon detail / mods / upgrade / repair (modal)
  openWeapon(uid) {
    if (!this.weaponByKey(uid)) return;
    const body = this.openModal('WEAPON BENCH', { wide: true, cls: 'wm' });
    const draw = () => { if (!this.modal) return; const g = this.weaponByKey(uid); if (!g) { this.closeModal(); return; } body.innerHTML = ''; this.weaponView(body, g); };
    this.refreshModal = draw; draw();
  }
  weaponView(body, g) {
    const p = this.p, d = ITEMS[g.id], ws = weaponStats(g), base = weaponStats({ id: g.id, tier: 1, mods: {} });
    const where = p.loadout.weapons.includes(g) ? `EQUIPPED · SLOT ${p.loadout.weapons.indexOf(g) + 1}` : 'IN STASH';
    const head = div('wm-head');
    head.appendChild(div('ii-icon wide big r-' + d.rarity, `<img src="${iconURL(g.id)}" draggable="false">`));
    const dur = clamp01((g.dur ?? ws.durability) / ws.durability);
    head.appendChild(div('wm-title', `<div class="ii-name" style="color:${RAR[d.rarity]}">${esc(d.name)} <span class="tier">${ROM[g.tier || 1]}</span></div>
      <div class="ii-sub">${d.rarity.toUpperCase()} · ${d.weapon.class.replace(/_/g, ' ').toUpperCase()} · ${esc(nm(d.weapon.ammo)).toUpperCase()} · ${where}${g.free ? ' · <span class="yellow">FREE KIT</span>' : ''}</div>
      <div class="ii-desc">${esc(d.desc)}</div>
      <div class="wm-dur"><span>DURABILITY</span><div class="bar ${dur < 0.25 ? 'low' : ''}"><i style="width:${(dur * 100).toFixed(1)}%"></i></div><b>${Math.round(g.dur ?? ws.durability)} / ${Math.round(ws.durability)}</b></div>`));
    body.appendChild(head);
    const cols = div('wm-cols');
    // stats
    const rows = [['DAMAGE', 'dmg', 1, 1], ['FIRE RATE', 'rpm', 0, 1], ['MAGAZINE', 'mag', 0, 1], ['RANGE', 'range', 0, 1], ['RELOAD', 'reload', 2, -1], ['SPREAD', 'spread', 2, -1], ['ADS SPREAD', 'adsSpread', 2, -1], ['RECOIL', 'recoil', 2, -1], ['VELOCITY', 'projSpeed', 0, 1], ['NOISE', 'noise', 0, -1], ['DURABILITY', 'durability', 0, 1]];
    const tb = div('wm-stats', `<div class="lbl">STATS <span class="dimc">BASE → CURRENT</span></div>` + rows.map(([l, k, dp, good]) => {
      const a = base[k] ?? 0, b = ws[k] ?? 0, diff = b - a, cls = Math.abs(diff) < 1e-6 ? '' : (diff > 0) === (good > 0) ? 'green' : 'red';
      return `<div class="sr"><span>${l}</span><i>${(+a).toFixed(dp)}</i><b class="${cls}">${(+b).toFixed(dp)}</b></div>`;
    }).join(''));
    cols.appendChild(tb);
    // mods
    const mods = div('wm-mods'); mods.appendChild(div('lbl', 'MOD SLOTS'));
    const pool = [];
    for (const s of p.stash) if (s && ITEMS[s.id]?.type === 'mod') pool.push({ s, ref: { c: 'stash', uid: s.uid } });
    for (const c of ['backpack', 'safe']) p.loadout[c].forEach((s, i) => { if (s && ITEMS[s.id]?.type === 'mod') pool.push({ s, ref: { c, i } }); });
    if (!(d.weapon.slots || []).length) mods.appendChild(div('dimc', 'This weapon has no mod slots.'));
    for (const sl of d.weapon.slots || []) {
      const row = div('wm-slot'), cur = g.mods?.[sl];
      row.appendChild(div('sl', SLOT_NAME[sl] || sl));
      row.appendChild(this.icell(cur ? { id: cur, qty: 1 } : null, { hint: SLOT_HINT[sl] }, cur ? () => { if (this.detachMod(g.uid, sl)) { this.sfx('ui_equip'); this.save(); this.render(); this.refreshModal?.(); } } : null));
      const cands = div('cands');
      const fits = pool.filter(x => this.modFits(x.s.id, g, sl));
      const seen = new Set();
      for (const x of fits) { if (seen.has(x.s.id)) continue; seen.add(x.s.id); cands.appendChild(this.icell(x.s, {}, () => { if (this.attachMod(x.ref, g.uid, sl)) { this.sfx('ui_equip'); this.save(); this.render(); this.refreshModal?.(); } else this.sfx('ui_error'); })); }
      if (!fits.length) cands.appendChild(div('dimc tiny', 'NO COMPATIBLE MODS OWNED'));
      row.appendChild(cands);
      mods.appendChild(row);
    }
    mods.appendChild(div('dimc tiny', 'CLICK AN OWNED MOD TO ATTACH · CLICK THE FITTED MOD TO DETACH'));
    cols.appendChild(mods);
    body.appendChild(cols);
    // upgrade + repair
    const acts = div('wm-acts');
    const u = Craft.upgradeState(p, g), up = div('wm-box');
    if (u.next) {
      const perks = Object.entries(u.next.mods || {}).map(([k, m]) => { const prev = d.weapon.tiers.find(t => t.tier === (g.tier || 1))?.mods?.[k] || 1; const pct = Math.round((m / prev - 1) * 100); const [l, gd] = MOD_STAT[k] || [k.toUpperCase(), 1]; return `<span class="${(pct > 0) === (gd > 0) ? 'green' : 'red'}">${l} ${pct > 0 ? '+' : ''}${pct}%</span>`; }).join(' ');
      up.innerHTML = `<div class="lbl">UPGRADE TO TIER ${ROM[u.next.tier]} <span class="dimc">· GUNSMITH ${ROM[u.next.level || 1]}</span></div><div class="perks">${perks}</div>`;
      up.appendChild(this.costRow(u.next.cost));
      up.appendChild(btn(u.ok ? `UPGRADE → ${ROM[u.next.tier]}` : u.reason.toUpperCase(), u.ok ? 'primary' : '', () => this.commit(Craft.weaponUpgrade(p, g), 'ui_upgrade'), !u.ok));
    } else up.innerHTML = `<div class="lbl">UPGRADE</div><div class="dimc">${u.reason.toUpperCase()}</div>`;
    acts.appendChild(up);
    const rc = Craft.repairCost(g), rp = div('wm-box');
    if (rc) {
      rp.innerHTML = `<div class="lbl">REPAIR <span class="dimc">· ${Math.round(rc.frac * 100)}% WORN</span></div>`;
      const cr = this.costRow(rc.items); cr.appendChild(div('mat ' + (p.coins >= rc.coins ? 'ok' : 'short'), `<i class="coin"></i><span>${fmt(rc.coins)}</span>`)); rp.appendChild(cr);
      rp.appendChild(btn('REPAIR', 'primary', () => this.commit(Craft.repair(p, g), 'ui_upgrade'), !(P.hasMaterials(p, rc.items) && p.coins >= rc.coins)));
    } else rp.innerHTML = '<div class="lbl">REPAIR</div><div class="green">FULL DURABILITY</div>';
    acts.appendChild(rp);
    const misc = div('wm-box');
    misc.innerHTML = '<div class="lbl">ACTIONS</div>';
    const inLo = p.loadout.weapons.includes(g);
    if (inLo) misc.appendChild(btn('MOVE TO STASH', '', () => { this.doTransfer({ c: 'weapons', i: p.loadout.weapons.indexOf(g) }, { c: 'stash' }); }));
    else misc.appendChild(btn('EQUIP', 'primary', () => { this.quickMove({ c: 'stash', uid: g.uid }); }));
    const ammoIn = countIn([p.loadout.backpack, p.loadout.quick, p.loadout.safe], ws.ammo) + P.stashCount(p, ws.ammo);
    misc.appendChild(div('dimc tiny', `LOADED ${g.ammo || 0}/${ws.mag} · OWNED ${fmt(ammoIn)} ${esc(nm(ws.ammo)).toUpperCase()}`));
    acts.appendChild(misc);
    body.appendChild(acts);
  }

  // ================================================================ WORKSHOP
  tabWorkshop(body) {
    const p = this.p, S = this.st.workshop;
    const wrap = div('ws-wrap three');
    const nav = this.panel('WORKSHOP', 'nav-panel');
    nav.body.classList.add('scroll'); nav.body.dataset.scroll = 'wsnav';
    nav.body.appendChild(div('lbl', 'BENCHES'));
    for (const id of Craft.BENCH_ORDER) {
      const lv = Craft.benchLevel(p, id), mx = Craft.benchMax(id), b = Craft.BENCHES[id];
      const it = div('nav-it' + (S.view === id ? ' on' : '') + (lv ? '' : ' off'), `<div class="nm">${esc(b.name).toUpperCase()}</div><div class="pips">${Array.from({ length: mx }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}${lv ? '' : '<em>NOT BUILT</em>'}</div>`);
      it.addEventListener('click', () => { S.view = id; S.sel = null; this.sfx('ui_click'); this.render(); });
      nav.body.appendChild(it);
    }
    nav.body.appendChild(div('lbl', 'SERVICES'));
    const sc = Craft.scrappie(p), bpn = Craft.blueprintStacks(p).filter(s => !Craft.blueprintKnown(p, s.id)).length;
    for (const [id, l, sub] of [['recycler', 'RECYCLER', `YIELD ${Math.round(Craft.scrapYield(p) * 100)}%`], ['weapons', 'WEAPON BENCH', 'UPGRADE · REPAIR'], ['blueprints', 'BLUEPRINTS', `${p.blueprints.length} LEARNED${bpn ? ` · <b class="yellow">${bpn} NEW</b>` : ''}`], ['scrappie', 'SCRAPPIE', sc.pending.length ? `<b class="yellow">HAUL READY (${sc.raids})</b>` : `LEVEL ${sc.level}`]]) {
      const it = div('nav-it svc' + (S.view === id ? ' on' : ''), `<div class="nm">${l}</div><div class="sub">${sub}</div>`);
      it.addEventListener('click', () => { S.view = id; S.sel = null; this.sfx('ui_click'); this.render(); });
      nav.body.appendChild(it);
    }
    wrap.appendChild(nav.root);
    const main = div('ws-main'), side = this.panel('DETAILS', 'in-panel');
    if (Craft.BENCHES[S.view]) this.benchView(main, side.body, S.view);
    else if (S.view === 'recycler') this.recyclerView(main, side.body);
    else if (S.view === 'weapons') this.weaponsView(main, side.body);
    else if (S.view === 'blueprints') this.blueprintsView(main, side.body);
    else this.scrappieView(main, side.body);
    wrap.append(main, side.root);
    body.appendChild(wrap);
  }
  benchView(main, side, id) {
    const p = this.p, S = this.st.workshop, b = Craft.BENCHES[id], lv = Craft.benchLevel(p, id), mx = Craft.benchMax(id), nx = Craft.benchNext(p, id);
    const H = this.panel(esc(b.name).toUpperCase(), 'bench-head', `LEVEL <b class="yellow">${lv}</b> / ${mx}`);
    H.body.appendChild(div('bh-desc', esc(b.desc)));
    if (nx) {
      const up = div('bh-up');
      up.appendChild(div('lbl', lv ? `UPGRADE TO LEVEL ${nx.level}` : 'BUILD THIS BENCH'));
      up.appendChild(this.costRow(nx.cost));
      const can = P.hasMaterials(p, nx.cost);
      up.appendChild(btn(lv ? 'UPGRADE' : 'BUILD', can ? 'primary' : '', () => this.commit(Craft.benchUpgrade(p, id), 'ui_upgrade'), !can));
      H.body.appendChild(up);
    } else H.body.appendChild(div('bh-up max', '<span class="green">FULLY UPGRADED</span>'));
    main.appendChild(H.root);
    const list = this.panel('RECIPES', 'rc-panel', `${Craft.recipesFor(id).filter(r => Craft.recipeState(p, r).status === 'ok').length} CRAFTABLE`);
    list.body.classList.add('scroll'); list.body.dataset.scroll = 'recipes-' + id;
    const recs = Craft.recipesFor(id);
    if (S.sel && !recs.find(r => r.id === S.sel)) S.sel = null;
    let lastLv = 0;
    for (const r of recs) {
      if (r.level !== lastLv) { lastLv = r.level; list.body.appendChild(div('rc-lv' + (lv >= r.level ? '' : ' locked'), `${esc(b.name).toUpperCase()} ${ROM[r.level]}${lv >= r.level ? '' : ' · LOCKED'}`)); }
      const st = Craft.recipeState(p, r), d = ITEMS[r.out];
      const row = div('rc-row ' + st.status + (S.sel === r.id ? ' sel' : ''));
      row.appendChild(this.icell(makeStack(r.out, 1), { count: r.qty > 1 ? r.qty : null }));
      const info = div('rc-info', `<div class="nm" style="color:${RAR[d.rarity]}">${esc(d.name)}${r.blueprint ? ' <span class="bp">BP</span>' : ''}</div>`);
      const mats = div('mats'); for (const [k, n] of Object.entries(r.in)) mats.appendChild(this.matChip(k, n)); info.appendChild(mats);
      row.appendChild(info);
      const act = div('rc-act');
      if (st.status === 'ok' || st.status === 'materials') {
        act.appendChild(btn('x1', st.max >= 1 ? 'primary sm' : 'sm', () => this.commit(Craft.craft(p, r, 1), 'ui_craft'), st.max < 1));
        act.appendChild(btn('x5', 'sm', () => this.commit(Craft.craft(p, r, 5), 'ui_craft'), st.max < 5));
      } else act.appendChild(div('lock', st.status === 'blueprint' ? 'BLUEPRINT<br>REQUIRED' : esc(st.reason).toUpperCase()));
      row.appendChild(act);
      row.addEventListener('click', () => { S.sel = r.id; this.sfx('ui_click'); this.render(); });
      list.body.appendChild(row);
    }
    main.appendChild(list.root);
    // side: selected recipe
    const r = Craft.RECIPE_BY_ID[S.sel];
    if (!r) { side.appendChild(div('in-sum', `<div class="lbl">${esc(b.name).toUpperCase()}</div><p>${esc(b.desc)}</p><p class="dimc">Select a recipe to see the item it makes. Materials are taken from your stash first, then your backpack.</p><p class="dimc">Recipes marked <span class="bp">BP</span> need a learned blueprint. Find blueprints topside and learn them in the Blueprints service.</p>`)); return; }
    const st = Craft.recipeState(p, r);
    side.appendChild(this.itemInfo(makeStack(r.out, r.qty)));
    side.appendChild(div('lbl', 'REQUIRES'));
    side.appendChild(this.costRow(r.in));
    if (st.status !== 'ok') side.appendChild(div('red small', esc(st.reason).toUpperCase()));
    const acts = div('in-acts');
    acts.append(btn('CRAFT 1', 'primary', () => this.commit(Craft.craft(p, r, 1), 'ui_craft'), st.max < 1), btn('CRAFT 5', '', () => this.commit(Craft.craft(p, r, 5), 'ui_craft'), st.max < 5),
      btn(`CRAFT MAX (${Math.min(st.max, 99)})`, '', () => this.commit(Craft.craft(p, r, Math.min(st.max, 99)), 'ui_craft'), st.max < 2));
    if (st.status === 'blueprint') { const bp = p.stash.find(s => s && ITEMS[s.id]?.blueprint === r.id); if (bp) acts.appendChild(btn('LEARN BLUEPRINT FROM STASH', 'primary', () => this.commit(Craft.learnBlueprint(p, bp.uid), 'ui_upgrade'))); }
    side.appendChild(acts);
  }
  recyclerView(main, side) {
    const p = this.p, S = this.st.workshop;
    const H = this.panel('RECYCLER', 'bench-head', `YIELD <b class="yellow">${Math.round(Craft.scrapYield(p) * 100)}%</b>`);
    H.body.appendChild(div('bh-desc', 'Break items down into crafting materials. Weapons return their mods and loaded ammo first. Skills that raise scrap yield (A Lil\' Extra) add bonus materials. Free-kit items cannot be recycled.'));
    main.appendChild(H.root);
    const L = this.panel('RECYCLABLE ITEMS IN STASH', 'rc-panel');
    const chips = div('chips');
    const RF = [['all', 'ALL', null], ['valuable', 'VALUABLES', ['valuable', 'trinket']], ['weapon', 'WEAPONS & MODS', ['weapon', 'mod']], ['gear', 'GEAR', ['augment', 'shield']], ['quick', 'QUICK USE', ['consumable', 'grenade', 'trap', 'gadget']], ['material', 'MATERIALS', ['material']]];
    for (const [k, l] of RF) chips.appendChild(btn(l, 'chip' + (S.recFilter === k ? ' on' : ''), () => { S.recFilter = k; this.render(); }));
    L.body.appendChild(chips);
    const types = RF.find(f => f[0] === S.recFilter)?.[2];
    const grid = div('slots scroll st-grid'); grid.dataset.scroll = 'recycle';
    const items = p.stash.filter(s => Craft.canRecycle(s) && (!types || types.includes(ITEMS[s.id].type))).sort((a, b) => Eco.fullValue(b) - Eco.fullValue(a));
    if (S.rec && !items.find(s => s.uid === S.rec)) S.rec = null;
    for (const s of items) grid.appendChild(this.icell(s, { sel: S.rec === s.uid }, () => { S.rec = s.uid; this.sfx('ui_click'); this.render(); }));
    if (!items.length) grid.appendChild(div('st-empty', 'NOTHING TO RECYCLE'));
    L.body.appendChild(grid);
    main.appendChild(L.root);
    const s = p.stash.find(x => x && x.uid === S.rec);
    if (!s) { side.appendChild(div('in-sum', '<div class="lbl">RECYCLER</div><p class="dimc">Select an item to preview what it breaks down into.</p>')); return; }
    side.appendChild(this.itemInfo(s));
    side.appendChild(div('lbl', 'RECYCLES INTO (1x)'));
    const out = div('mats'); for (const [k, n] of Object.entries(Craft.recyclePreview(p, s, 1))) out.appendChild(this.icell(makeStack(k, 1), { count: n })); side.appendChild(out);
    if (s.qty > 1) { side.appendChild(div('lbl', `ALL ${s.qty}`)); const o2 = div('mats'); for (const [k, n] of Object.entries(Craft.recyclePreview(p, s, s.qty))) o2.appendChild(this.icell(makeStack(k, 1), { count: n })); side.appendChild(o2); }
    const acts = div('in-acts');
    acts.appendChild(btn('RECYCLE 1', 'primary', () => this.commit(Craft.recycle(p, s.uid, 1), 'ui_craft')));
    if (s.qty > 1) acts.appendChild(btn(`RECYCLE ALL ${s.qty}`, '', () => this.commit(Craft.recycle(p, s.uid, s.qty), 'ui_craft')));
    side.appendChild(acts);
  }
  weaponsView(main, side) {
    const p = this.p;
    const H = this.panel('WEAPON BENCH', 'bench-head', `GUNSMITH <b class="yellow">${Craft.benchLevel(p, 'gunsmith')}</b> / ${Craft.benchMax('gunsmith')}`);
    H.body.appendChild(div('bh-desc', 'Upgrade weapons up to tier IV (each tier needs a higher Gunsmith level) and repair worn durability. Upgrading also refurbishes the weapon. Click a weapon for mods and full stats.'));
    main.appendChild(H.root);
    const L = this.panel('YOUR WEAPONS', 'rc-panel');
    L.body.classList.add('scroll'); L.body.dataset.scroll = 'weapons';
    const guns = [...p.loadout.weapons.filter(Boolean), ...p.stash.filter(s => s && ITEMS[s.id]?.type === 'weapon')];
    if (!guns.length) L.body.appendChild(div('st-empty', 'NO WEAPONS OWNED'));
    for (const g of guns) {
      const d = ITEMS[g.id], ws = weaponStats(g), u = Craft.upgradeState(p, g), rc = Craft.repairCost(g), dur = clamp01((g.dur ?? ws.durability) / ws.durability);
      const row = div('rc-row wpn');
      row.appendChild(this.icell(g, { wide: true }));
      const info = div('rc-info', `<div class="nm" style="color:${RAR[d.rarity]}">${esc(d.name)} <span class="tier">${ROM[g.tier || 1]}</span> ${p.loadout.weapons.includes(g) ? '<span class="tag">EQUIPPED</span>' : ''}${g.free ? '<span class="tag y">FREE</span>' : ''}</div>
        <div class="wm-dur sm"><div class="bar ${dur < 0.25 ? 'low' : ''}"><i style="width:${(dur * 100).toFixed(1)}%"></i></div><b>${Math.round(g.dur ?? ws.durability)}/${Math.round(ws.durability)}</b></div>`);
      if (u.next) info.appendChild(this.costRow(u.next.cost));
      row.appendChild(info);
      const act = div('rc-act');
      act.appendChild(btn(u.next ? `TIER ${ROM[u.next.tier]}` : 'MAX TIER', u.ok ? 'primary sm' : 'sm', () => this.commit(Craft.weaponUpgrade(p, g), 'ui_upgrade'), !u.ok));
      act.appendChild(btn(rc ? 'REPAIR' : 'REPAIRED', 'sm', () => this.commit(Craft.repair(p, g), 'ui_upgrade'), !rc || !P.hasMaterials(p, rc.items) || p.coins < rc.coins));
      row.appendChild(act);
      row.addEventListener('click', () => this.openWeapon(g.uid));
      L.body.appendChild(row);
    }
    main.appendChild(L.root);
    side.appendChild(div('in-sum', `<div class="lbl">TIERS</div><p>Tier II needs Gunsmith I, tier III Gunsmith II, tier IV Gunsmith III.</p><div class="lbl">REPAIRS</div><p>Repair cost scales with wear and rarity: Metal Parts for common guns, components and gun parts for rarer ones, plus a small Scrip fee.</p><p class="dimc">Broken weapons (0 durability) cannot fire.</p>`));
  }
  blueprintsView(main, side) {
    const p = this.p;
    const bps = Craft.blueprintStacks(p);
    const H = this.panel('BLUEPRINTS', 'bench-head', `<b class="yellow">${p.blueprints.length}</b> LEARNED`);
    H.body.appendChild(div('bh-desc', 'Blueprints found topside permanently unlock a recipe when learned. Learning consumes the blueprint. Duplicates can be sold for 5,000 Scrip.'));
    const fresh = bps.filter(s => !Craft.blueprintKnown(p, s.id));
    if (fresh.length) { const u = div('bh-up'); u.appendChild(btn(`LEARN ALL NEW (${fresh.length})`, 'primary', () => { let n = 0; for (const s of [...fresh]) { if (Craft.learnBlueprint(p, s.uid).ok) n++; } this.commit({ ok: true, msg: `Learned ${n} blueprint(s)` }, 'ui_upgrade'); })); H.body.appendChild(u); }
    main.appendChild(H.root);
    const L = this.panel('IN STASH', 'rc-panel');
    L.body.classList.add('scroll'); L.body.dataset.scroll = 'bps';
    if (!bps.length) L.body.appendChild(div('st-empty', 'NO BLUEPRINTS IN STASH - FIND THEM TOPSIDE'));
    for (const s of bps) {
      const rid = ITEMS[s.id].blueprint, r = Craft.RECIPE_BY_ID[rid], k = Craft.blueprintKnown(p, s.id);
      const row = div('rc-row' + (k ? ' known' : ''));
      row.appendChild(this.icell(s));
      row.appendChild(div('rc-info', `<div class="nm" style="color:${RAR[ITEMS[s.id].rarity]}">${esc(ITEMS[s.id].name)}</div><div class="dimc small">TEACHES ${esc(nm(r?.out)).toUpperCase()} · ${esc(Craft.BENCHES[r?.bench]?.name || '').toUpperCase()} ${ROM[r?.level || 1]}</div>`));
      const act = div('rc-act');
      if (k) act.appendChild(btn('SELL 5,000', 'sm', () => this.sellDialog('shanni', s)));
      else act.appendChild(btn('LEARN', 'primary sm', () => this.commit(Craft.learnBlueprint(p, s.uid), 'ui_upgrade')));
      row.appendChild(act);
      L.body.appendChild(row);
    }
    main.appendChild(L.root);
    side.appendChild(div('lbl', 'KNOWN BLUEPRINT RECIPES'));
    const known = div('known scroll'); known.dataset.scroll = 'known';
    for (const bid of Craft.BENCH_ORDER) {
      const rs = p.blueprints.map(r => Craft.RECIPE_BY_ID[r]).filter(r => r && r.bench === bid); if (!rs.length) continue;
      known.appendChild(div('kh', esc(Craft.BENCHES[bid].name).toUpperCase()));
      const g = div('mats'); for (const r of rs) g.appendChild(this.icell(makeStack(r.out, 1))); known.appendChild(g);
    }
    if (!p.blueprints.length) known.appendChild(div('dimc', 'None yet.'));
    side.appendChild(known);
  }
  scrappieView(main, side) {
    const p = this.p, sc = Craft.scrappie(p), lvd = Craft.scrappieLevelDef(p), nx = Craft.scrappieNext(p), cap = Craft.SCRAPPY.capacityRaids || 5;
    const H = this.panel('SCRAPPIE', 'bench-head scr', `LEVEL <b class="yellow">${sc.level}</b> / ${Craft.SCRAPPY.levels.length}`);
    const top = div('scr-top');
    const art = div('scrappie-art'); art.dataset.f = '0'; art.appendChild(scrappieArt(0));
    top.appendChild(art);
    const txt = div('scr-txt', `<div class="nm">SCRAPPIE <span class="dimc">THE WORKSHOP ROOSTER</span></div><p>${esc(Craft.SCRAPPY.desc)}</p>
      <div class="nest"><span>NEST</span><div class="pips">${Array.from({ length: cap }, (_, i) => `<i class="${i < sc.raids ? 'on' : ''}"></i>`).join('')}</div><b>${sc.raids}/${cap} RAIDS</b></div>
      ${sc.raids >= cap ? '<p class="red">NEST FULL - COLLECT TO KEEP HIM SCAVENGING</p>' : ''}`);
    top.appendChild(txt);
    H.body.appendChild(top);
    main.appendChild(H.root);
    const L = this.panel('HAUL', 'rc-panel');
    const g = div('mats haul'); for (const e of sc.pending) g.appendChild(this.icell(makeStack(e.id, 1), { count: e.qty }));
    if (!sc.pending.length) g.appendChild(div('st-empty', 'NOTHING YET - SCRAPPIE BRINGS MATERIALS BACK AFTER EVERY RAID'));
    L.body.appendChild(g);
    L.body.appendChild(btn('COLLECT ALL', sc.pending.length ? 'primary big' : 'big', () => this.commit(Craft.scrappieCollect(p), 'ui_buy'), !sc.pending.length));
    L.body.appendChild(div('lbl', `YIELDS PER RAID AT LEVEL ${sc.level} <span class="dimc">(MORE FOR LONGER RAIDS, MAX AT 15 MIN)</span>`));
    const y = div('mats'); for (const [id, mn, mx] of lvd.yields) { const c = div('yield'); c.appendChild(this.icell(makeStack(id, 1))); c.appendChild(div('small', `${mn}-${mx}`)); y.appendChild(c); } L.body.appendChild(y);
    main.appendChild(L.root);
    side.appendChild(div('lbl', 'FEED & UPGRADE'));
    if (nx) {
      side.appendChild(div('in-sum', `<p>Level ${nx.level} Scrappie brings back more of everything.</p>`));
      side.appendChild(this.costRow(nx.cost));
      const can = P.hasMaterials(p, nx.cost);
      side.appendChild(div('in-acts')).appendChild(btn(`UPGRADE TO LEVEL ${nx.level}`, can ? 'primary' : '', () => this.commit(Craft.scrappieUpgrade(p), 'ui_upgrade'), !can));
    } else side.appendChild(div('green', 'SCRAPPIE IS FULLY GROWN'));
  }

  // ================================================================ TRADERS
  tabTraders(body) {
    const p = this.p, S = this.st.traders, t = TRADERS[S.t];
    const wrap = div('ws-wrap three');
    const nav = this.panel('TRADERS', 'nav-panel');
    for (const id of Eco.TRADER_ORDER) {
      const tr = TRADERS[id]; if (!tr) continue;
      const qn = Q.questsByGiver(p, id).filter(x => x.state === 'available').length;
      const it = div('nav-it trader' + (S.t === id ? ' on' : ''));
      it.style.setProperty('--tc', tr.color);
      const pc = div('pt'); pc.appendChild(traderPortrait(id)); it.appendChild(pc);
      it.appendChild(div('tx', `<div class="nm">${esc(tr.name).toUpperCase()}</div><div class="sub">${esc(tr.title).toUpperCase()}${qn ? ` · <b class="yellow">${qn} JOB${qn > 1 ? 'S' : ''}</b>` : ''}</div>`));
      it.addEventListener('click', () => { S.t = id; S.sel = null; this.sfx('ui_click'); this.render(); });
      nav.body.appendChild(it);
    }
    wrap.appendChild(nav.root);
    const main = div('ws-main');
    const H = div('hp tr-head'); H.style.setProperty('--tc', t.color);
    const big = div('pt big'); big.appendChild(traderPortrait(S.t)); H.appendChild(big);
    H.appendChild(div('tr-txt', `<div class="nm">${esc(t.name).toUpperCase()}</div><div class="ti">${esc(t.title).toUpperCase()}</div><p>${esc(t.desc)}</p>
      <div class="dimc small">STOCK REFRESHES IN <b class="cream">${Eco.restockIn(p)}</b> RAID${Eco.restockIn(p) > 1 ? 'S' : ''} · BUYS ${t.buys === 'all' ? 'ANYTHING' : t.buys.map(x => (TYPE_LABEL[x] || x).toUpperCase() + 'S').join(', ')}</div>`));
    main.appendChild(H);
    const modes = div('subtabs');
    const qn = Q.questsByGiver(p, S.t).filter(x => x.state !== 'locked').length;
    for (const [k, l] of [['buy', 'BUY'], ['sell', 'SELL'], ['quests', `JOBS (${qn})`]]) modes.appendChild(btn(l, S.mode === k ? 'on' : '', () => { S.mode = k; S.sel = null; this.sfx('ui_click'); this.render(); }));
    main.appendChild(modes);
    const side = this.panel('DETAILS', 'in-panel');
    if (S.mode === 'buy') this.traderBuy(main, side.body, S.t);
    else if (S.mode === 'sell') this.traderSell(main, side.body, S.t);
    else this.traderQuests(main, side.body, S.t);
    wrap.append(main, side.root);
    body.appendChild(wrap);
  }
  traderBuy(main, side, tid) {
    const p = this.p, S = this.st.traders, stock = Eco.traderStock(p, tid);
    const L = this.panel('FOR SALE', 'rc-panel', `<i class="coin"></i> ${fmt(p.coins)}`);
    const g = div('offers scroll'); g.dataset.scroll = 'buy-' + tid;
    for (const e of stock) {
      const d = ITEMS[e.item], afford = p.coins >= e.price;
      const o = div('offer' + (e.left <= 0 ? ' out' : '') + (S.sel === e.item ? ' sel' : '') + (e.locked ? ' locked' : ''));
      o.appendChild(this.icell(makeStack(e.item, 1)));
      o.appendChild(div('of-t', `<div class="nm" style="color:${RAR[d.rarity]}">${esc(d.name)}</div><div class="pr ${afford ? '' : 'red'}"><i class="coin"></i>${fmt(e.price)}</div>`));
      o.appendChild(div('of-n', e.locked ? 'LOCKED' : e.left <= 0 ? 'SOLD OUT' : `${e.left}<i>/${e.stock}</i>`));
      o.addEventListener('click', (ev) => { S.sel = e.item; if (ev.shiftKey && e.left > 0 && !e.locked) { this.commit(Eco.buy(p, tid, e.item, 1), 'ui_buy'); return; } this.sfx('ui_click'); this.render(); });
      g.appendChild(o);
    }
    L.body.appendChild(g);
    main.appendChild(L.root);
    const e = stock.find(x => x.item === S.sel);
    if (!e) { side.appendChild(div('in-sum', `<div class="lbl">BUYING</div><p class="dimc">Select an offer to see details. SHIFT+CLICK buys one instantly. Purchases go to your stash.</p><p class="dimc">Stock is limited and refreshes every ${Eco.RESTOCK_RAIDS} raids.</p>`)); return; }
    side.appendChild(this.itemInfo(makeStack(e.item, 1)));
    side.appendChild(div('pr-big', `<i class="coin"></i>${fmt(e.price)} <span class="dimc">EACH · ${e.left} LEFT</span>`));
    const acts = div('in-acts');
    const big = maxStack(e.item) >= 50, qs = big ? [1, 10, 50] : [1, 5];
    const maxAff = Math.min(e.left, Math.floor(p.coins / e.price));
    for (const n of qs) acts.appendChild(btn(`BUY ${n} · ${fmt(n * e.price)}`, n === qs[0] ? 'primary' : '', () => this.commit(Eco.buy(p, tid, e.item, n), 'ui_buy'), e.locked || e.left < n || p.coins < n * e.price));
    if (maxAff > qs[qs.length - 1] || (maxAff > 1 && !qs.includes(maxAff))) acts.appendChild(btn(`BUY MAX ${maxAff} · ${fmt(maxAff * e.price)}`, '', () => this.commit(Eco.buy(p, tid, e.item, maxAff), 'ui_buy'), e.locked || maxAff < 1));
    side.appendChild(acts);
  }
  traderSell(main, side, tid) {
    const p = this.p, S = this.st.traders, t = TRADERS[tid];
    const items = p.stash.filter(s => s && Eco.canSellTo(tid, s.id)).sort((a, b) => Eco.unitSellPrice(b) * b.qty - Eco.unitSellPrice(a) * a.qty);
    const L = this.panel(`SELL TO ${esc(t.name).toUpperCase()}`, 'rc-panel', `<i class="coin"></i> ${fmt(p.coins)}`);
    const junk = items.filter(s => !s.free && ['valuable', 'trinket'].includes(ITEMS[s.id].type));
    if (junk.length) {
      const tot = junk.reduce((a, s) => a + Eco.unitSellPrice(s) * s.qty, 0);
      L.body.appendChild(div('sell-bulk')).appendChild(btn(`SELL ALL VALUABLES & TRINKETS (${junk.length}) · ${fmt(tot)}`, 'sm', async () => {
        if (!(await this.confirmBox('SELL VALUABLES', `<p>Sell <b>${junk.length}</b> stacks of valuables and trinkets for <b class="yellow">${fmt(tot)}</b> Scrip?</p><p class="dimc">Some valuables are needed for Scrappie and bench upgrades - check before selling.</p>`, 'SELL ALL'))) return;
        let sum = 0; for (const s of [...junk]) { const r = Eco.sell(p, tid, s.uid); if (r.ok) sum += r.coins; }
        this.commit({ ok: true, msg: `Sold valuables for ${fmt(sum)} Scrip` }, 'ui_sell');
      }));
    }
    const list = div('sell-list scroll'); list.dataset.scroll = 'sell-' + tid;
    if (!items.length) list.appendChild(div('st-empty', `NOTHING IN YOUR STASH THAT ${esc(t.name).toUpperCase()} BUYS`));
    for (const s of items) {
      const d = ITEMS[s.id], u = Eco.unitSellPrice(s);
      const row = div('rc-row sell' + (S.sel === s.uid ? ' sel' : '') + (s.free ? ' known' : ''));
      row.appendChild(this.icell(s, d.type === 'weapon' ? { wide: true } : {}));
      row.appendChild(div('rc-info', `<div class="nm" style="color:${RAR[d.rarity]}">${esc(d.name)}${s.qty > 1 ? ` <span class="dimc">x${s.qty}</span>` : ''}</div><div class="pr">${s.free ? '<span class="red">FREE KIT - UNSELLABLE</span>' : `<i class="coin"></i>${fmt(u)} <span class="dimc">EA</span>`}</div>`));
      const act = div('rc-act');
      if (!s.free) {
        act.appendChild(btn('SELL 1', 'sm', () => this.commit(Eco.sell(p, tid, s.uid, 1), 'ui_sell')));
        if (s.qty > 1) act.appendChild(btn(`ALL · ${fmt(u * s.qty)}`, 'sm', () => this.commit(Eco.sell(p, tid, s.uid, s.qty), 'ui_sell')));
      }
      row.appendChild(act);
      row.addEventListener('click', () => { S.sel = s.uid; this.sfx('ui_click'); this.render(); });
      list.appendChild(row);
    }
    L.body.appendChild(list);
    main.appendChild(L.root);
    const s = p.stash.find(x => x && x.uid === S.sel);
    if (!s) { side.appendChild(div('in-sum', `<div class="lbl">SELLING</div><p class="dimc">Traders pay an item's value in Scrip. ${esc(t.name)} buys ${t.buys === 'all' ? 'anything' : t.buys.map(x => (TYPE_LABEL[x] || x).toLowerCase() + 's').join(', ')}.</p><p class="dimc">Weapon mods and loaded ammo are returned to your stash when you sell a weapon.</p>`)); return; }
    side.appendChild(this.itemInfo(s));
    if (!s.free) { const acts = div('in-acts'); acts.appendChild(btn(`SELL ${s.qty > 1 ? 'ALL ' + s.qty : ''} · ${fmt(Eco.unitSellPrice(s) * s.qty)}`, 'primary', () => this.commit(Eco.sell(p, tid, s.uid, s.qty), 'ui_sell'))); side.appendChild(acts); }
  }
  traderQuests(main, side, tid) {
    const p = this.p, list = Q.questsByGiver(p, tid);
    const L = this.panel('JOBS', 'rc-panel', `${list.filter(x => x.state === 'done').length} / ${list.length} DONE`);
    const box = div('scroll tq'); box.dataset.scroll = 'tq-' + tid;
    const order = { active: 0, available: 1, done: 2, locked: 3 };
    for (const { quest: d, state } of [...list].sort((a, b) => order[a.state] - order[b.state])) {
      if (state === 'locked') continue;
      const row = div('rc-row q ' + state);
      row.appendChild(div('qs-tag ' + state, state === 'done' ? 'DONE' : state === 'active' ? (Q.canTurnIn(p, d.id).ok ? 'READY' : 'ACTIVE') : 'NEW'));
      row.appendChild(div('rc-info', `<div class="nm">${esc(d.name)}</div><div class="dimc small">${esc(d.desc).slice(0, 110)}${d.desc.length > 110 ? '...' : ''}</div>`));
      const act = div('rc-act');
      if (state === 'available') act.appendChild(btn('ACCEPT', 'primary sm', () => this.commit(Q.acceptQuest(p, d.id), 'ui_quest')));
      act.appendChild(btn('VIEW', 'sm', () => this.go('quests', { sel: d.id })));
      row.appendChild(act);
      box.appendChild(row);
    }
    const locked = list.filter(x => x.state === 'locked').length;
    if (locked) box.appendChild(div('dimc small tq-more', `+${locked} MORE JOBS UNLOCK AS YOU COMPLETE THE STORY`));
    L.body.appendChild(box);
    main.appendChild(L.root);
    side.appendChild(div('in-sum', `<div class="lbl">JOBS</div><p class="dimc">${esc(TRADERS[tid].name)} hands out jobs as you complete earlier ones. Accepted jobs show their objectives on your HUD topside.</p>`));
  }

  // ================================================================ SKILLS
  tabSkills(body) {
    const p = this.p, S = this.st.skills, T = SKILL_TREE, R = SKILL_RULES;
    const wrap = div('sk-wrap');
    const branches = Object.entries(T.branches).sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
    const cols = R.columns || 5, rows = R.rows || 7;
    const px = parseFloat(getComputedStyle(this.root).getPropertyValue('--px')) || 2;
    const bw = (this.body.clientWidth || 1600) / px, bh = (this.body.clientHeight || 900) / px;
    const CW = Math.max(32, Math.min(48, Math.floor(((bw - 14 - 176 - 18) / 3 - 24) / cols)));
    const RH = Math.max(this.root.classList.contains('hub-short') ? 31 : 34, Math.min(60, Math.floor((bh - 104) / rows)));
    for (const [bid, br] of branches) {
      const spent = branchSpent(p, bid);
      const panel = div('hp sk-br'); panel.style.setProperty('--bc', br.color);
      panel.appendChild(div('sk-bh', `<div class="nm">${esc(br.name).toUpperCase()}</div><div class="pts"><b>${spent}</b> PTS</div>`));
      const tree = div('sk-tree'); tree.style.setProperty('--cols', cols); tree.style.setProperty('--rows', rows); tree.style.setProperty('--cw', CW); tree.style.setProperty('--rh', RH);
      const nodes = Object.entries(T.nodes).filter(([, n]) => n.branch === bid);
      // links
      let svg = `<svg viewBox="0 0 ${cols * CW} ${rows * RH}" preserveAspectRatio="none" shape-rendering="crispEdges">`;
      for (const [gid, gate] of (R.gates || []).map(g => [g.row, g])) {
        const y = gid * RH - 3, ok = spent >= gate.branchPoints;
        svg += `<line x1="2" y1="${y}" x2="${cols * CW - 2}" y2="${y}" class="gate ${ok ? 'ok' : ''}" />`;
      }
      for (const [id, n] of nodes) for (const r of n.requires || []) {
        const pn = T.nodes[r]; if (!pn) continue;
        const x1 = (pn.col + 0.5) * CW, y1 = (pn.row + 0.5) * RH, x2 = (n.col + 0.5) * CW, y2 = (n.row + 0.5) * RH, my = Math.round((y1 + y2) / 2);
        const on = (p.skills?.[r] || 0) > 0 && (p.skills?.[id] || 0) > 0, av = (p.skills?.[r] || 0) > 0;
        svg += `<polyline points="${x1},${y1} ${x1},${my} ${x2},${my} ${x2},${y2}" class="ln ${on ? 'on' : av ? 'av' : ''}" />`;
      }
      svg += '</svg>';
      tree.innerHTML = svg;
      for (const g of R.gates || []) { const ok = spent >= g.branchPoints; tree.appendChild(div('sk-gate ' + (ok ? 'ok' : ''), `${ok ? '' : '<i class="lock"></i>'}${g.branchPoints}`)).style.top = `calc(var(--u) * ${g.row * RH - 9})`; }
      for (const [id, n] of nodes) {
        const c = skillCheck(p, id), rank = c.rank;
        const st = rank >= n.ranks ? 'max' : rank > 0 ? 'part' : c.unlocked ? 'avail' : 'locked';
        const nd = div(`sk-node ${st}${n.capstone ? ' cap' : ''}${S.sel === id ? ' sel' : ''}${c.canAdd ? ' can' : ''}`);
        nd.style.left = `calc(var(--u) * ${(n.col + 0.5) * CW})`; nd.style.top = `calc(var(--u) * ${(n.row + 0.5) * RH})`;
        const gname = n.capstone ? 'star' : GLYPH_FOR[n.effects?.[0]?.stat] || 'star';
        const gcol = st === 'locked' ? '#4a4840' : st === 'max' ? '#141414' : st === 'part' ? br.color : '#e8e0c8';
        nd.innerHTML = `<img src="${glyphURL(gname, gcol)}" draggable="false"><div class="pips">${n.ranks > 1 ? Array.from({ length: n.ranks }, (_, i) => `<i class="${i < rank ? 'on' : ''}"></i>`).join('') : `<i class="${rank ? 'on' : ''}"></i>`}</div>`;
        nd.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') this.skillTip(n, c, e); });
        nd.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') this.skillTipMove(e); });
        nd.addEventListener('pointerleave', () => this.skillTipHide());
        nd.addEventListener('click', () => { S.sel = id; this.sfx('ui_click'); this.render(); });
        nd.addEventListener('dblclick', () => { S.sel = id; this.commit(allocateSkill(p, id), 'ui_upgrade'); });
        nd.addEventListener('contextmenu', (e) => { e.preventDefault(); S.sel = id; this.commit(allocateSkill(p, id), 'ui_upgrade'); });
        tree.appendChild(nd);
      }
      panel.appendChild(tree);
      panel.appendChild(div('sk-bdesc', esc(br.desc)));
      wrap.appendChild(panel);
    }
    // side panel
    const side = this.panel('SKILL POINTS', 'in-panel sk-side', `<b class="${p.skillPoints ? 'yellow' : ''}">${p.skillPoints || 0}</b> FREE`);
    const n = T.nodes[S.sel];
    if (n) {
      const c = skillCheck(p, S.sel), br = T.branches[n.branch];
      const d = div('sk-det'); d.style.setProperty('--bc', br.color);
      d.innerHTML = `<div class="br">${esc(br.name).toUpperCase()}${n.capstone ? ' · <span class="yellow">CAPSTONE</span>' : ''}</div><div class="nm">${esc(n.name)}</div>
        <div class="rk">RANK <b>${c.rank}</b> / ${n.ranks}</div><div class="ds">${esc(skillDesc(n))}</div>
        <div class="fx">${(n.effects || []).map(e => `<div><span>${esc(STAT_INFO[e.stat]?.[0] || e.stat)}</span><b>${c.rank ? statFmt(e.stat, e.per * c.rank) : '-'}</b>${c.rank < n.ranks ? `<i>→ ${statFmt(e.stat, e.per * (c.rank + 1))}</i>` : ''}</div>`).join('')}</div>
        ${n.conditional?.length ? `<div class="cond">SITUATIONAL: ${n.conditional.map(x => `${esc(STAT_INFO[x.stat]?.[0] || x.stat)} ${statFmt(x.stat, x.per)} when ${esc(x.when.replace(/_/g, ' '))}`).join(', ')}</div>` : ''}
        <div class="req">${c.reasons.map(r => `<div class="${r.met ? 'ok' : 'no'}">${r.met ? '+' : 'x'} ${esc(r.text)}</div>`).join('')}</div>`;
      side.body.appendChild(d);
      side.body.appendChild(btn(c.rank >= n.ranks ? 'MAXED' : c.canAdd ? 'ADD POINT' : !c.unlocked ? 'LOCKED' : 'NO POINTS', c.canAdd ? 'primary big' : 'big', () => this.commit(allocateSkill(p, S.sel), 'ui_upgrade'), !c.canAdd));
    } else side.body.appendChild(div('in-sum', `<p>Earn one skill point per level. Spend them in three branches; deeper rows unlock after <b>15</b> and <b>36</b> points in a branch.</p><p class="dimc">${touchEnabled() ? 'Tap a skill to inspect it, then ADD POINT here.' : 'Click a skill to inspect it. Double-click (or right-click) to add a point.'} Capstones at the bottom are very strong - you can reach at most two.</p>`));
    const mods = computeStats(p.skills || {}, SKILL_TREE).mods || {};
    const ks = Object.keys(mods).filter(k => mods[k]);
    side.body.appendChild(div('lbl', `TOTAL BONUSES · ${skillsSpent(p)} PTS SPENT`));
    side.body.appendChild(div('sk-tot scroll', ks.length ? ks.map(k => `<div><span>${esc(STAT_INFO[k]?.[0] || k)}</span><b>${statFmt(k, mods[k])}</b></div>`).join('') : '<div class="dimc">No skills yet.</div>'));
    const cost = respecCost(p);
    side.body.appendChild(btn(`RESPEC ALL · ${fmt(cost)}`, 'danger', async () => {
      if (await this.confirmBox('RESPEC SKILLS', `<p>Reset all <b>${skillsSpent(p)}</b> points for <b class="yellow">${fmt(cost)}</b> Scrip (${fmt(SKILL_RULES.respecCostPerPoint || 2000)} per point)?</p>`, 'RESPEC', true)) this.commit(respecSkills(p), 'ui_upgrade');
    }, !skillsSpent(p) || p.coins < cost));
    wrap.appendChild(side.root);
    body.appendChild(wrap);
  }
  skillTip(n, c, e) {
    if (!this.tip) { this.tip = div('tooltip sk-tip'); document.body.appendChild(this.tip); }
    const br = SKILL_TREE.branches[n.branch];
    this.tip.innerHTML = `<div class="tt-name" style="color:${br.color}">${esc(n.name)}</div><div class="tt-sub">${esc(br.name)} · RANK ${c.rank}/${n.ranks}${n.capstone ? ' · CAPSTONE' : ''}</div><div class="tt-desc">${esc(skillDesc(n))}</div>${c.reasons.filter(r => !r.met).map(r => `<div class="red tt-sub" style="margin-top:4px">${esc(r.text)}</div>`).join('')}`;
    this.tip.style.display = 'block'; this.skillTipMove(e);
  }
  skillTipMove(e) { if (!this.tip) return; const w = this.tip.offsetWidth, h = this.tip.offsetHeight; let x = e.clientX + 16, y = e.clientY + 12; if (x + w > innerWidth) x = e.clientX - w - 12; if (y + h > innerHeight) y = innerHeight - h - 4; this.tip.style.left = x + 'px'; this.tip.style.top = y + 'px'; }
  skillTipHide() { if (this.tip) this.tip.style.display = 'none'; }

  // ================================================================ QUESTS
  tabQuests(body) {
    const p = this.p, S = this.st.quests;
    const wrap = div('q-wrap');
    const L = this.panel('JOBS', 'q-list');
    L.body.classList.add('scroll'); L.body.dataset.scroll = 'qlist';
    const active = Q.activeQuests(p), ready = active.filter(d => Q.canTurnIn(p, d.id).ok), avail = Q.availableQuests(p), done = Q.doneQuests(p);
    if (!S.sel || !Q.QUEST_BY_ID[S.sel]) S.sel = (ready[0] || active[0] || avail[0])?.id || null;
    const sec = (title, list, tag) => {
      if (!list.length) return;
      L.body.appendChild(div('lbl q-sec', `${title} <span class="dimc">${list.length}</span>`));
      for (const d of list) {
        const tr = TRADERS[d.giver], pr = Q.questProgress(p, d.id);
        const it = div('q-it ' + tag + (S.sel === d.id ? ' on' : ''));
        it.style.setProperty('--tc', tr?.color || '#888');
        it.innerHTML = `<div class="gv">${esc(tr?.name || d.giver).toUpperCase()}</div><div class="nm">${esc(d.name)}</div>${tag === 'active' || tag === 'ready' ? `<div class="bar"><i style="width:${(pr * 100).toFixed(0)}%"></i></div>` : ''}`;
        it.addEventListener('click', () => { S.sel = d.id; this.sfx('ui_click'); this.render(); });
        L.body.appendChild(it);
      }
    };
    sec('READY TO TURN IN', ready, 'ready');
    sec('ACTIVE', active.filter(d => !ready.includes(d)), 'active');
    sec('AVAILABLE', avail, 'avail');
    if (done.length) {
      const t = div('lbl q-sec click', `COMPLETED <span class="dimc">${done.length}</span> ${S.showDone ? '▾' : '▸'}`);
      t.addEventListener('click', () => { S.showDone = !S.showDone; this.render(); });
      L.body.appendChild(t);
      if (S.showDone) for (const d of done) { const it = div('q-it done' + (S.sel === d.id ? ' on' : ''), `<div class="nm">${esc(d.name)}</div>`); it.style.setProperty('--tc', TRADERS[d.giver]?.color); it.addEventListener('click', () => { S.sel = d.id; this.render(); }); L.body.appendChild(it); }
    }
    if (!active.length && !avail.length) L.body.appendChild(div('st-empty', 'NO JOBS RIGHT NOW'));
    wrap.appendChild(L.root);
    const D = this.panel('JOB DETAILS', 'q-det');
    const d = Q.QUEST_BY_ID[S.sel];
    if (d) this.questDetail(D.body, d);
    else D.body.appendChild(div('st-empty', 'SELECT A JOB'));
    wrap.appendChild(D.root);
    body.appendChild(wrap);
  }
  questDetail(box, d) {
    const p = this.p, state = Q.questState(p, d.id), tr = TRADERS[d.giver];
    const head = div('qd-head'); head.style.setProperty('--tc', tr?.color || '#888');
    const pt = div('pt'); pt.appendChild(traderPortrait(d.giver)); head.appendChild(pt);
    head.appendChild(div('qd-t', `<div class="gv">${esc(tr?.name || '').toUpperCase()} · ${esc(tr?.title || '').toUpperCase()}</div><div class="nm">${esc(d.name)}</div><div class="qs-tag ${state}">${{ active: 'ACTIVE', available: 'AVAILABLE', done: 'COMPLETED', locked: 'LOCKED' }[state]}</div>`));
    box.appendChild(head);
    box.appendChild(div('qd-desc', `"${esc(d.desc)}"`));
    box.appendChild(div('lbl', 'OBJECTIVES'));
    const obj = div('qd-obj');
    d.steps.forEach((s, i) => {
      const g = state === 'available' || state === 'locked' ? { have: 0, need: Q.stepNeed(s), done: false } : Q.stepProgress(p, d.id, i);
      if (s.kind === 'deliver' && state !== 'done') g.have = Math.min(g.need, P.materialCount(p, s.item));
      const row = div('ob ' + (g.done || (s.kind === 'deliver' && g.have >= g.need) ? 'done' : ''));
      row.innerHTML = `<i class="ck"></i><div class="tx">${esc(Q.stepText(s))}${s.use ? ` <span class="dimc">· uses ${Object.entries(s.use).map(([k, n]) => n + 'x ' + esc(nm(k))).join(', ')}</span>` : ''}${s.kind === 'deliver' ? ' <span class="dimc">· from stash/backpack</span>' : ''}</div><b>${g.need > 1 || s.kind === 'deliver' ? `${g.have}/${g.need}` : g.done ? 'DONE' : ''}</b>`;
      obj.appendChild(row);
    });
    box.appendChild(obj);
    if (d.grants && state === 'available') { box.appendChild(div('lbl', 'YOU RECEIVE ON ACCEPT')); const g = div('mats'); for (const [k, n] of Object.entries(d.grants)) if (ITEMS[k]) g.appendChild(this.icell(makeStack(k, 1), { count: n })); box.appendChild(g); }
    box.appendChild(div('lbl', 'REWARDS'));
    const rw = div('qd-rw');
    const r = d.rewards || {};
    rw.appendChild(div('rw xp', `<b>+${fmt(r.xp ?? 1500)}</b><span>XP</span>`));
    if (r.coins) rw.appendChild(div('rw sc', `<i class="coin"></i><b>+${fmt(r.coins)}</b><span>SCRIP</span>`));
    for (const s of Q.rewardStacks(d)) rw.appendChild(this.icell(makeStack(s.id, 1), { count: s.qty }));
    if (r.blueprint) { const rr = Craft.RECIPE_BY_ID[r.blueprint]; rw.appendChild(div('rw bp', `<span class="bp">BP</span><b>${esc(nm(rr?.out))}</b><span>RECIPE</span>`)); }
    box.appendChild(rw);
    const acts = div('in-acts row');
    if (state === 'available') acts.appendChild(btn('ACCEPT JOB', 'primary big', () => this.commit(Q.acceptQuest(p, d.id), 'ui_quest')));
    if (state === 'active') {
      const c = Q.canTurnIn(p, d.id);
      acts.appendChild(btn('TURN IN', c.ok ? 'primary big' : 'big', () => {
        const res = Q.turnIn(p, d.id);
        if (res.ok && res.levels) res.msg += ` · LEVEL UP! +${res.levels} skill point${res.levels > 1 ? 's' : ''}`;
        this.commit(res, res.levels ? 'ui_levelup' : 'ui_quest');
      }, !c.ok));
      acts.appendChild(btn('ABANDON', 'ghost', async () => { if (await this.confirmBox('ABANDON JOB', `<p>Abandon <b>${esc(d.name)}</b>? Progress is lost; you can accept it again later.</p>`, 'ABANDON', true)) this.commit(Q.abandonQuest(p, d.id), 'ui_back'); }));
      if (!c.ok) box.appendChild(div('dimc small qd-why', esc(c.reason).toUpperCase()));
    }
    if (state === 'locked') box.appendChild(div('red small', 'REQUIRES: ' + (d.requires || []).map(r => esc(Q.QUEST_BY_ID[r]?.name || r)).join(', ').toUpperCase()));
    box.appendChild(acts);
  }

  // ================================================================ RAIDER
  tabRaider(body) {
    const p = this.p;
    const wrap = div('rd-wrap');
    // profile + outfit
    const A = this.panel('RAIDER', 'rd-a');
    const nameRow = div('rd-name');
    const inp = el('input'); inp.type = 'text'; inp.maxLength = 16; inp.value = p.name; inp.spellcheck = false;
    inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') saveName(); });
    const saveName = () => { const v = inp.value.replace(/[^\w \-.']/g, '').trim().slice(0, 16); if (!v) { this.toast('Name cannot be empty', 'bad'); return; } p.name = v; this.commit({ ok: true, msg: 'Name saved' }); };
    nameRow.append(inp, btn('SAVE NAME', 'sm', saveName));
    A.body.appendChild(div('lbl', 'CALLSIGN'));
    A.body.appendChild(nameRow);
    A.body.appendChild(div('rd-lv', `LEVEL <b>${p.level}</b> · ${fmt(p.xp)} / ${fmt(P.xpForLevel(p.level))} XP · RAIDER SINCE ${new Date(p.created || Date.now()).toLocaleDateString('en-GB')}`));
    A.body.appendChild(div('lbl', 'OUTFIT'));
    const outfits = div('rd-outfits');
    A.body.appendChild(outfits);
    import('../engine/models.js').then(m => m.OUTFITS).catch(() => null).then((OUT) => {
      const list = OUT ? Object.entries(OUT).filter(([k]) => !/^bot/.test(k)) : [['scav', null], ['red', null], ['teal', null], ['khaki', null], ['violet', null]];
      for (const [k, o] of list) {
        const sw = div('rd-sw' + ((p.settings.outfit || 'scav') === k ? ' on' : ''));
        sw.appendChild(raiderArt(o || {}));
        sw.appendChild(div('nm', k.toUpperCase()));
        sw.addEventListener('click', () => { p.settings.outfit = k; this.commit({ ok: true, msg: `Outfit: ${k}` }); });
        outfits.appendChild(sw);
      }
    });
    wrap.appendChild(A.root);
    // stats
    const B = this.panel('RECORD', 'rd-b');
    const s = p.stats || {}, surv = s.raids ? Math.round(100 * (s.extracts || 0) / s.raids) : 0;
    const rows = [['RAIDS', s.raids], ['EXTRACTIONS', s.extracts], ['DEATHS', s.deaths], ['SURVIVAL RATE', surv + '%'], ['ARK DESTROYED', s.arkKills], ['RAIDERS DOWNED', s.raiderKills], ['ITEMS LOOTED', s.looted],
      ['BEST HAUL', fmt(s.bestHaul) + ' SCRIP'], ['JOBS DONE', (p.quests?.done || []).length], ['ITEMS CRAFTED', s.crafted], ['BLUEPRINTS', (p.blueprints || []).length], ['STASH VALUE', fmt(p.stash.reduce((a, x) => a + Eco.fullValue(x), 0))]];
    B.body.appendChild(div('kv big', rows.map(([k, v]) => `<span>${k}</span><b>${typeof v === 'number' ? fmt(v) : (v ?? 0)}</b>`).join('')));
    const st = computeStats(p.skills || {}, SKILL_TREE), caps = this.caps();
    B.body.appendChild(div('lbl', 'ATTRIBUTES (WITH SKILLS & AUGMENT)'));
    B.body.appendChild(div('kv', [['MAX HEALTH', Math.round(st.max_hp)], ['MAX STAMINA', Math.round(st.max_stamina)], ['STAMINA REGEN', st.stamina_regen.toFixed(1) + '/S'], ['MOVE SPEED', st.move_speed.toFixed(2) + ' M/S'],
      ['SPRINT SPEED', st.sprint_speed.toFixed(2) + ' M/S'], ['CARRY LIMIT', caps.weightLimit + ' KG'], ['NOISE', Math.round(st.noise_mul * 100) + '%'], ['RECYCLING YIELD', Math.round(st.scrap_yield * 100) + '%']].map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('')));
    wrap.appendChild(B.root);
    // settings + save
    const C = this.panel('SETTINGS', 'rd-c');
    for (const [k, label] of [['master', 'MASTER VOLUME'], ['music', 'MUSIC'], ['sfx', 'SOUND EFFECTS'], ['ui', 'INTERFACE']]) {
      const r = div('rd-sl', `<span>${label}</span>`);
      const sl = el('input'); sl.type = 'range'; sl.min = 0; sl.max = 1; sl.step = 0.05; sl.value = p.settings[k] ?? 0.8;
      const val = el('b', '', Math.round((p.settings[k] ?? 0.8) * 100) + '%');
      sl.addEventListener('input', () => { p.settings[k] = +sl.value; val.textContent = Math.round(sl.value * 100) + '%'; try { this.app.audioSafe?.setVolumes?.({ [k]: +sl.value }); } catch (e) { /* */ } });
      sl.addEventListener('change', () => { this.save(); this.sfx('ui_click'); });
      r.append(sl, val); C.body.appendChild(r);
    }
    const q = div('rd-sl', '<span>GRAPHICS QUALITY</span>');
    const seg = div('seg');
    for (const lv of ['low', 'medium', 'high']) seg.appendChild(btn(lv.toUpperCase(), (p.settings.quality || 'medium') === lv ? 'on' : '', () => { p.settings.quality = lv; this.commit({ ok: true, msg: `Graphics quality: ${lv}` }); }));
    q.appendChild(seg); C.body.appendChild(q);
    C.body.appendChild(settingsRows({ sfx: (n) => this.sfx(n) }));
    C.body.appendChild(div('lbl', 'SAVE DATA'));
    C.body.appendChild(div('rd-save', this.saveStatus()));
    const sb = div('rd-btns');
    sb.appendChild(btn('SAVE NOW', 'primary', () => { this.commit({ ok: true, msg: 'Saved' }); }));
    sb.appendChild(btn('EXPORT SAVE (.JSON)', '', () => { try { P.exportJSON(p); this.toast('Save exported', 'good'); this.sfx('ui_click'); } catch (e) { this.toast('Export failed: ' + e.message, 'bad'); } }));
    const file = el('input'); file.type = 'file'; file.accept = '.json,application/json'; file.style.display = 'none';
    file.addEventListener('change', async () => {
      const f = file.files?.[0]; file.value = ''; if (!f) return;
      try {
        const np = await P.importJSON(f);
        if (!(await this.confirmBox('IMPORT SAVE', `<p>Replace the current raider with <b>${esc(np.name)}</b> (level ${np.level}, ${fmt(np.coins)} Scrip)?</p><p class="dimc">Export your current save first if you want to keep it.</p>`, 'IMPORT', true))) return;
        this.app.profile = np; this.prepareProfile(); this.commit({ ok: true, msg: `Imported ${np.name}` }, 'ui_levelup');
      } catch (e) { this.commit({ ok: false, msg: 'Import failed: ' + e.message }); }
    });
    sb.appendChild(file);
    sb.appendChild(btn('IMPORT SAVE...', '', () => file.click()));
    sb.appendChild(btn('WIPE SAVE', 'danger', async () => {
      if (!(await this.confirmBox('WIPE SAVE', `<p>Delete <b>${esc(p.name)}</b> and start over from level 1? This clears browser storage and cookies.</p><p class="red">This cannot be undone unless you exported your save.</p>`, 'WIPE EVERYTHING', true))) return;
      P.wipe(); this.app.profile = P.newProfile(p.name); this.st.loadout.sel = null; this.prepareProfile(); this.commit({ ok: true, msg: 'Save wiped - welcome to Speranzia' }, 'ui_back');
    }));
    C.body.appendChild(sb);
    wrap.appendChild(C.root);
    body.appendChild(wrap);
  }
  saveStatus() {
    let bytes = 0; try { bytes = new Blob([JSON.stringify(this.p)]).size; } catch (e) { /* */ }
    const chunks = Math.ceil(bytes * 4 / 3 / 3600);
    let ls = false; try { ls = !!localStorage.getItem('darkraiders_save_v1'); } catch (e) { /* */ }
    const where = chunks <= 40 ? 'Saved to browser storage + cookies' : 'Saved to browser storage (too large for the cookie mirror)';
    const when = this.savedAt ? new Date(this.savedAt).toLocaleTimeString('en-GB') : (this.p.updated ? new Date(this.p.updated).toLocaleTimeString('en-GB') : '-');
    return `<div class="${ls || this.savedAt ? 'green' : 'yellow'}">${where}</div><div class="dimc">LAST SAVE ${when} · ${(bytes / 1024).toFixed(1)} KB</div>`;
  }
}

// take from slot arrays without touching the stash
function takeFrom2(arr, id, n) { let got = 0; for (let i = arr.length - 1; i >= 0 && got < n; i--) { const s = arr[i]; if (!s || s.id !== id) continue; const t = Math.min(s.qty, n - got); s.qty -= t; got += t; if (s.qty <= 0) arr[i] = null; } return got; }

export default Hub;
