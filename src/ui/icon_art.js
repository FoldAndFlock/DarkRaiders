// Hand-built 24x24 pixel art for DarkRaiders items. Every function draws into a PB (ui/icon_kit.js);
// the outline pass + tier pips are added afterwards by ui/icons.js.
//   ITEM_ART[itemId](g, item, id, rnd)        bespoke drawings (weapons, ammo, meds, ARK parts, loot…)
//   FAMILY_ART[iconFamily](g, item, id, rnd)  family drawers with per-item variation (keys, mods, augments…)
//   fallbackArt(g, item, id)                  hashed shape + hue for anything new
// Art lives in: icon_art_guns.js (weapons), icon_art_gear.js (ammo, shields, meds, grenades, traps,
// gadgets, keys, mods, augments), icon_art_mats.js (materials, ARK parts), icon_art_loot.js (valuables,
// trinkets, quest items).
import * as GEAR from './icon_art_gear.js';
import * as MATS from './icon_art_mats.js';
import * as LOOT from './icon_art_loot.js';
import { GUN_GRIDS, GUN_ART, GP } from './icon_art_guns.js';
export { GUN_GRIDS, GUN_ART, GP };

export const ITEM_ART = {};
export const FAMILY_ART = {};
for (const M of [GEAR, MATS, LOOT]) { Object.assign(ITEM_ART, M.ART); Object.assign(FAMILY_ART, M.FAM); }
for (const [id, fn] of Object.entries(GUN_ART)) ITEM_ART[id] = (g) => { fn(g); g.centre(); };

export function fallbackArt(g, it, id) { LOOT.hashedArt(g, it, id); }
