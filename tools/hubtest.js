// Standalone harness for the Speranzia hub (src/ui/hub.js) - no renderer, no router.
// URL params:  ?tab=workshop   open a tab (loadout|workshop|traders|skills|quests|raider)
//              ?rich=1         richer profile (levels, coins, benches, blueprints, rare items, quests)
//              ?fresh=1        brand new profile (newProfile only)
//              ?persist=1      use the real save (load + save to browser storage); default saves to a test key
//              ?px=2           force the UI scale
import { newProfile, stashAdd, addXP, load, save } from '../src/game/profile.js';
import { makeStack, ITEMS } from '../src/game/items.js';
import { scrappieOnRaidEnd } from '../src/game/crafting.js';
import { initQuests, acceptQuest, questEvent } from '../src/game/quests.js';
import { Hub } from '../src/ui/hub.js';

const q = new URLSearchParams(location.search);
function uiScale() { const f = q.get('px'); document.documentElement.style.setProperty('--px', String(f ? +f : Math.max(1, Math.min(4, Math.round(innerHeight / 520))))); }
uiScale(); addEventListener('resize', uiScale);

function testProfile() {
  const p = newProfile('Kestrel');
  if (q.has('fresh')) return p;
  const add = (id, n = 1, extra = {}) => { if (ITEMS[id]) { let left = n; while (left > 0) { const k = Math.min(left, ITEMS[id].stack || 1); stashAdd(p, makeStack(id, k, extra)); left -= k; } } };
  add('metal_parts', 120); add('plastic_parts', 60); add('rubber_parts', 80); add('fabric', 70); add('chemicals', 70); add('ark_alloy', 14); add('ark_powercell', 6);
  add('wires', 8); add('battery', 3); add('steel_spring', 6); add('duct_tape', 4); add('mechanical_components', 6); add('simple_gun_parts', 4);
  add('arpeggo', 1, { tier: 2, dur: 300 }); add('venattor', 1); add('extended_light_mag_i'); add('compensator_i'); add('stable_stock_i'); add('vertical_grip_i'); add('silencer_i');
  add('medium_shield'); add('tactical_mk_1'); add('adrenaline_shot', 3); add('shield_recharger', 2); add('light_impact_grenade', 4); add('smoke_grenade', 2);
  add('anvill_blueprint'); add('trigga_nade_blueprint'); add('rusted_tools', 2); add('dog_collar', 1); add('music_box'); add('rosary'); add('coffee_pot'); add('wazp_driver', 3); add('assorted_seeds', 10);
  add('damn_grounds_control_tower_key'); add('raider_hatch_key');
  p.coins = 18450;
  addXP(p, 4200);
  p.skillPoints += 3;
  p.stats = { ...p.stats, raids: 7, extracts: 5, deaths: 2, arkKills: 23, raiderKills: 1, looted: 312, bestHaul: 14200 };
  initQuests(p);
  questEvent(p, 'search', { container: 'crate', map: 'damn_grounds' });
  scrappieOnRaidEnd(p, 700); scrappieOnRaidEnd(p, 900);
  if (q.has('rich')) {
    addXP(p, 60000); p.skillPoints += 10; p.coins = 125000;
    p.benches = { workbench: 1, gunsmith: 2, gear_bench: 1, medical_lab: 1, explosives_station: 0, utility_station: 1, refiner: 1 };
    p.blueprints.push('craft_anvill', 'craft_silencer_i', 'craft_defibrillator');
    p.skills = { used_to_the_wait: 3, blast_borne: 2, nimble_clamberer: 5, marathon_runnr: 3, agile_crouchr: 2 };
    add('tempesta', 1, { tier: 3 }); add('equaliser'); add('heavy_shield'); add('combat_mk_3_aggressive'); add('tempesta_blueprint');
    p.quests.done.push('picking_up_the_bits'); delete p.quests.active.picking_up_the_bits;
    acceptQuest(p, 'trash_to_treasure'); acceptQuest(p, 'clearer_skys');
  }
  return p;
}

const KEY = 'darkraiders_hubtest';
const persist = q.has('persist');
let profile = persist ? load() : null;
if (!profile) profile = testProfile();
window.__saves = 0;
const app = {
  profile,
  save() { window.__saves++; if (persist) save(app.profile); else { try { localStorage.setItem(KEY, JSON.stringify(app.profile)); } catch (e) { /* */ } } },
  audioSafe: { play: (n) => { (window.__sfx = window.__sfx || []).push(n); }, setVolumes: (v) => { window.__vol = { ...(window.__vol || {}), ...v }; }, music: () => {} },
  screens: { lobby: () => { window.__lobby = (window.__lobby || 0) + 1; hub.toast('[test] app.screens.lobby() called', 'good'); } },
};
window.app = app;
const hub = new Hub(app);
window.hub = hub;
if (q.get('tab')) hub.tab = q.get('tab');
hub.mount(document.getElementById('ui'));
await document.fonts.ready;
await new Promise(r => setTimeout(r, 300));
window.__ready = true;
