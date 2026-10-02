// SFX registry: name → definition { r(R) → Float32Array, v variants, pj pitch jitter, vol, max voices,
// dist hearing distance (m), bus 'sfx'|'ui', loop, prio, duck }.
import { WEAPONS } from './sfx_weapons.js';
import { WORLD } from './sfx_world.js';
import { ARKS } from './sfx_ark.js';
import { MISC } from './sfx_misc.js';

export const SFX = { ...WEAPONS, ...WORLD, ...ARKS, ...MISC };

// Render order for background pre-warming (most time-critical first).
export const PREWARM = [
  'gun_pistol', 'gun_smg', 'gun_rifle', 'gun_battle_rifle', 'gun_lmg', 'gun_shotgun', 'gun_sniper', 'gun_marksman',
  'gun_energy', 'gun_suppressed', 'gun_launcher', 'hit_metal', 'hit_concrete', 'hit_dirt', 'hit_flesh', 'hit_shield',
  'hit_ark_weakpoint', 'bullet_whiz', 'ricochet', 'step_grass', 'step_concrete', 'step_metal', 'step_sand',
  'step_water', 'step_wood', 'ui_hover', 'ui_click', 'ui_back', 'ui_open', 'ui_close', 'reload_start', 'reload_end',
  'explosion_small', 'explosion_big', 'wazp_loop', 'ark_alert', 'hurt',
];
