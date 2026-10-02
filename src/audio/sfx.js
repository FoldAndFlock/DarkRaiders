// SFX registry: name → definition { r(R) → Float32Array, v variants, pj pitch jitter, vol, max voices,
// dist hearing distance (m), bus 'sfx'|'ui', loop, prio, duck, far (distance-layer sound name) }.
import { WEAPONS } from './sfx_weapons.js';
import { GUNS } from './sfx_guns.js';
import { WORLD } from './sfx_world.js';
import { ARKS } from './sfx_ark.js';
import { MISC } from './sfx_misc.js';
import { EXTRACT } from './sfx_extract.js';

export const SFX = { ...WEAPONS, ...GUNS, ...WORLD, ...ARKS, ...MISC, ...EXTRACT };

// generic class sounds also get a distance layer (per-weapon gun_<id> defs set their own)
const CLASS_FAR = {
  gun_pistol: 'gun_far_light', gun_smg: 'gun_far_light', gun_rifle: 'gun_far_medium', gun_battle_rifle: 'gun_far_heavy',
  gun_lmg: 'gun_far_medium', gun_shotgun: 'gun_far_shotgun', gun_sniper: 'gun_far_heavy', gun_marksman: 'gun_far_medium',
  gun_energy: 'gun_far_energy', gun_launcher: 'gun_far_launcher',
};
for (const [n, f] of Object.entries(CLASS_FAR)) if (SFX[n] && SFX[f] && !SFX[n].far) SFX[n] = { ...SFX[n], far: f };

// Render order for background pre-warming (most time-critical first).
export const PREWARM = [
  'gun_kettel', 'gun_rattlr', 'gun_stitchr', 'gun_burleta', 'gun_ferrox', 'gun_hairpyn', 'gun_far_light', 'gun_far_medium',
  'gun_far_heavy', 'hit_metal', 'hit_concrete', 'hit_dirt', 'hit_flesh', 'hit_shield', 'hit_ark_weakpoint', 'bullet_whiz',
  'ricochet', 'step_grass', 'step_concrete', 'step_metal', 'step_sand', 'step_water', 'step_wood', 'ui_hover', 'ui_click',
  'ui_back', 'ui_open', 'ui_close', 'reload_start', 'reload_end', 'wazp_loop', 'wazp_shot', 'wazp_alert', 'ark_alert', 'hurt',
  'explosion_small', 'explosion_big', 'gun_arpeggo', 'gun_tempesta', 'gun_canta', 'gun_bobkat', 'gun_el_torro', 'gun_venattor',
  'gun_torrento', 'gun_ospray', 'gun_far_shotgun', 'gun_far_energy', 'gun_far_launcher', 'tikk_skitter', 'popp_beep',
  'turret_shot', 'hornit_loop', 'hornit_zap', 'snytch_loop', 'ark_hum_loop',
  'gun_pistol', 'gun_smg', 'gun_rifle', 'gun_battle_rifle', 'gun_lmg', 'gun_shotgun', 'gun_sniper', 'gun_marksman',
  'gun_energy', 'gun_suppressed', 'gun_launcher',
];
