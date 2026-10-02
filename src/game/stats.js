// Derived player stats from base values + skill ranks + augment perks.
export const BASE = {
  max_hp: 100, max_stamina: 100, stamina_regen: 22, sprint_cost: 13, sprint_speed: 6.4, move_speed: 4.1, crouch_speed: 2.1,
  dodge_cost: 24, dodge_distance: 3.6, carry_weight: 0, backpack_slots: 0, safe_slots: 0, quick_slots: 0,
  loot_speed: 1, search_reveal: 1, extra_loot_chance: 0, rare_loot_chance: 0, scrap_yield: 1,
  heal_amount: 1, heal_speed: 1, shield_capacity: 1, shield_regen: 0, shield_recharge_speed: 1,
  damage_reduction: 0, explosive_resist: 0, fall_resist: 0, downed_hp: 75, downed_crawl_speed: 1, revive_speed: 1,
  self_revive: 0, noise_mul: 1, footstep_mul: 1, arc_detect_mul: 1, arc_damage: 1, weapon_damage: 1, headshot_mul: 1,
  reload_speed: 1, ads_speed: 1, recoil_mul: 1, spread_mul: 1, melee_damage: 1, breach_speed: 1, grenade_radius: 1,
  grenade_capacity: 0, xp_gain: 1, coin_gain: 1, in_raid_crafting: 0, extraction_speed: 1, cone_vision_range: 1, mark_duration: 1,
};
// how a summed modifier applies: 'mul' → base*(1+m); 'add' → base+m; 'reduce' → clamp(base+m,0,0.9); 'lower' → base*(1-m) (m>0 is better)
const KIND = {
  max_hp: 'add', carry_weight: 'add', backpack_slots: 'add', safe_slots: 'add', quick_slots: 'add', grenade_capacity: 'add',
  shield_regen: 'add', self_revive: 'add', in_raid_crafting: 'add', extra_loot_chance: 'add', rare_loot_chance: 'add', downed_hp: 'mulAbs',
  damage_reduction: 'reduce', explosive_resist: 'reduce', fall_resist: 'reduce',
  noise_mul: 'lower', footstep_mul: 'lower', arc_detect_mul: 'lower', sprint_cost: 'lower', dodge_cost: 'lower', recoil_mul: 'lower', spread_mul: 'lower',
};

export function computeStats(skillRanks = {}, tree = null, extraMods = {}) {
  const mod = {}, unlocks = new Set();
  if (tree?.nodes) for (const [id, rank] of Object.entries(skillRanks)) {
    const n = tree.nodes[id]; if (!n || !rank) continue;
    for (const e of n.effects || []) mod[e.stat] = (mod[e.stat] || 0) + e.per * rank;
    for (const u of n.unlocks || []) unlocks.add(u);
  }
  for (const [k, v] of Object.entries(extraMods)) mod[k] = (mod[k] || 0) + v;
  const s = {};
  for (const [k, base] of Object.entries(BASE)) {
    const m = mod[k] || 0, kind = KIND[k] || 'mul';
    if (kind === 'add') s[k] = base + m;
    else if (kind === 'reduce') s[k] = Math.max(0, Math.min(0.9, base + m));
    else if (kind === 'lower') s[k] = Math.max(0.05, base * (1 - Math.abs(m)));
    else if (kind === 'mulAbs') s[k] = base * (1 + m);
    else s[k] = base * (1 + m);
  }
  s.mods = mod; s.unlocks = unlocks;
  return s;
}

// augment perk -> runtime modifiers / behaviours
export function augmentPerkMods(perk) {
  switch (perk) {
    case 'regen_2hp_5s': return { regen: { amount: 2, every: 5, pauseAfterHit: 30 } };
    default: return {};
  }
}
