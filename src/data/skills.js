// Skill tree, XP curve and XP rewards (pure data).
// Modelled on the ARC Raiders 1.x skill tree (arcraiders.wiki /wiki/Skills + the interactive
// tree widget): three branches of 15 skills, each forking from one root into two lanes that
// re-merge, gated at 15 and 36 points spent in the branch. Max level 75 -> 75 skill points,
// so a raider can reach the capstones of at most two branches.
//
// Node schema (docs/ARCHITECTURE.md): { name, branch, row, col, ranks, requires, branchPoints,
//   desc, effects: [{ stat, per }], capstone }
// `effects` are ALWAYS-ON and summed per rank by src/game/stats.js computeStats(); the stat kinds
// there decide how a value applies (e.g. max_hp / carry_weight / slots / self_revive are
// absolute adds, noise_mul / sprint_cost / dodge_cost / footstep_mul / arc_detect_mul are
// "lower" reductions given here as negative fractions, most others are +fraction multipliers).
//
// Extensions (optional, safe to ignore):
//   requiresAny: true  -> ANY one of `requires` unlocks the node (the real tree's "A or B").
//                         Without it, every listed requirement needs >= 1 rank.
//   conditional: [{ stat, per, when }] -> situational bonuses that need runtime context, kept OUT
//                         of `effects` so computeStats() never applies them permanently. `when`:
//                         'hurt' (damaged < 3 s ago), 'critical' (HP < 30 %), 'downed',
//                         'crouched' (still), 'walking', 'healing', 'overweight', 'exhausted',
//                         'shield_broken' (< 4 s ago), 'after_dodge' (3 s, 8 s cooldown),
//                         'looting', 'vs_drone' (target is a flying/small ARK), 'raider_container'.
//   unlocks: [...]     -> non-stat abilities: 'security_lockers', 'defuse_mines', 'one_hit_drones',
//                         'field_craft_basic', 'field_craft_advanced', 'vault_jump'.
// Layout: 5 columns (0..4), root at col 2, rows 0..6. Row 3 needs 15 points spent in the branch,
// row 6 (capstones) needs 36. desc placeholders: {v} = effects[0].per, {c} = conditional[0].per
// (show as % when |value| < 5, as-is otherwise).

export const SKILL_RULES = {
  maxLevel: 75, pointsPerLevel: 1, maxPoints: 75,
  gates: [ { row: 3, branchPoints: 15 }, { row: 6, branchPoints: 36 } ],
  respecCostPerPoint: 2000,   // coins per spent point to reset the whole tree (real game value)
  columns: 5, rows: 7,
};

export const SKILL_TREE = {
  branches: {
    conditioning: { name: 'Conditioning', color: '#1fff76', icon: 'skill_conditioning', order: 0,
      desc: 'Toughness and grit: take hits, shrug off blasts, crack containers, get back up.' },
    mobility: { name: 'Mobility', color: '#ffd205', icon: 'skill_mobility', order: 1,
      desc: 'Stamina, sprinting, rolling and vaulting: be somewhere else when the shooting starts.' },
    survival: { name: 'Survival', color: '#f60010', icon: 'skill_survival', order: 2,
      desc: 'Scavenging, stealth and field-craft: loot faster, quieter, and haul more home.' },
  },

  nodes: {
    // ================================================================ CONDITIONING
    used_to_the_wait: {
      name: 'Used To The Wait', branch: 'conditioning', row: 0, col: 2, ranks: 5, requires: [], branchPoints: 0,
      desc: 'Shields and heavy kit drag on you less: +{v}% move speed per rank.',
      effects: [ { stat: 'move_speed', per: 0.015 } ], capstone: false },
    blast_borne: {
      name: 'Blast-Borne', branch: 'conditioning', row: 1, col: 1, ranks: 5, requires: ['used_to_the_wait'], branchPoints: 0,
      desc: 'Explosions rattle you less: {v}% less explosive damage (and shorter ear-ringing) per rank.',
      effects: [ { stat: 'explosive_resist', per: 0.04 } ], capstone: false },
    gentler_pressure: {
      name: 'Gentler Pressure', branch: 'conditioning', row: 1, col: 3, ranks: 5, requires: ['used_to_the_wait'], branchPoints: 0,
      desc: 'You breach and pry more quietly: {v}% noise per rank.',
      effects: [ { stat: 'noise_mul', per: -0.05 } ], capstone: false },
    fight_or_fright: {
      name: 'Fight Or Fright', branch: 'conditioning', row: 2, col: 1, ranks: 5, requires: ['blast_borne'], branchPoints: 0,
      desc: 'Getting hurt floods you with adrenaline: +{c}% stamina regeneration for a few seconds after taking damage (+{v}% always), per rank.',
      effects: [ { stat: 'stamina_regen', per: 0.02 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.12, when: 'hurt' } ], capstone: false },
    proficient_pryor: {
      name: 'Proficient Pryor', branch: 'conditioning', row: 2, col: 3, ranks: 5, requires: ['gentler_pressure'], branchPoints: 0,
      desc: 'Breaching doors and containers takes less time: +{v}% breach speed per rank.',
      effects: [ { stat: 'breach_speed', per: 0.07 } ], capstone: false },
    survivalists_stamina: {
      name: "Survivalist's Stamina", branch: 'conditioning', row: 3, col: 1, ranks: 1, requires: ['fight_or_fright'], branchPoints: 15,
      desc: 'When critically hurt your stamina regenerates +{c}% faster. +{v}% max stamina.',
      effects: [ { stat: 'max_stamina', per: 0.05 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.35, when: 'critical' } ], capstone: false },
    unbothered_roll: {
      name: 'Unbothered Roll', branch: 'conditioning', row: 3, col: 3, ranks: 1, requires: ['proficient_pryor'], branchPoints: 15,
      desc: 'When your shield breaks, your next dodge roll within a few seconds is free. Rolls cost {v}% stamina otherwise.',
      effects: [ { stat: 'dodge_cost', per: -0.05 } ],
      conditional: [ { stat: 'dodge_cost', per: -1.0, when: 'shield_broken' } ], capstone: false },
    down_but_determined: {
      name: 'Down But Determined', branch: 'conditioning', row: 4, col: 0, ranks: 5, requires: ['survivalists_stamina'], branchPoints: 0,
      desc: 'It takes longer to bleed out when downed: +{v}% downed health per rank.',
      effects: [ { stat: 'downed_hp', per: 0.08 } ], capstone: false },
    a_lil_extra: {
      name: "A Lil' Extra", branch: 'conditioning', row: 4, col: 2, ranks: 1, requires: ['survivalists_stamina', 'unbothered_roll'], requiresAny: true, branchPoints: 0,
      desc: 'Breaching anything shakes loose a few extra crafting materials: +{v}% scrap yield.',
      effects: [ { stat: 'scrap_yield', per: 0.25 } ], capstone: false },
    effortless_swingin: {
      name: "Effortless Swingin'", branch: 'conditioning', row: 4, col: 4, ranks: 5, requires: ['unbothered_roll'], branchPoints: 0,
      desc: 'Melee swings come easier: +{v}% melee damage per rank.',
      effects: [ { stat: 'melee_damage', per: 0.08 } ], capstone: false },
    tortoise_crawl: {
      name: 'Tortoise Crawl', branch: 'conditioning', row: 5, col: 0, ranks: 5, requires: ['down_but_determined'], branchPoints: 0,
      desc: 'While downed you take {c}% less damage per rank (and have +{v}% downed health).',
      effects: [ { stat: 'downed_hp', per: 0.03 } ],
      conditional: [ { stat: 'damage_reduction', per: 0.07, when: 'downed' } ], capstone: false },
    laden_arms: {
      name: 'Laden Arms', branch: 'conditioning', row: 5, col: 2, ranks: 1, requires: ['a_lil_extra'], branchPoints: 0,
      desc: 'Your weapons barely count against your load: +{v} kg carry capacity.',
      effects: [ { stat: 'carry_weight', per: 6 } ], capstone: false },
    sky_clearin_swing: {
      name: "Sky-Clearin' Swing", branch: 'conditioning', row: 5, col: 4, ranks: 5, requires: ['effortless_swingin'], branchPoints: 0,
      desc: 'Your melee hits flying ARK much harder: +{c}% melee damage against drones (+{v}% always), per rank.',
      effects: [ { stat: 'melee_damage', per: 0.04 } ],
      conditional: [ { stat: 'melee_damage', per: 0.2, when: 'vs_drone' } ], capstone: false },
    back_on_yer_feet: {
      name: 'Back On Yer Feet', branch: 'conditioning', row: 6, col: 1, ranks: 1, requires: ['tortoise_crawl', 'laden_arms'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. You refuse to stay down: pick yourself up from Downed {v} times per raid, +25 max HP, double downed health and +50% healing from every item.',
      effects: [ { stat: 'self_revive', per: 2 }, { stat: 'max_hp', per: 25 }, { stat: 'downed_hp', per: 1.0 },
                 { stat: 'heal_amount', per: 0.5 } ], capstone: true },
    flyswatta: {
      name: 'Flyswatta', branch: 'conditioning', row: 6, col: 3, ranks: 1, requires: ['laden_arms', 'sky_clearin_swing'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. ARK bane: +{v}% damage to all ARK, +30% explosive resistance, +50% melee damage, and a single melee blow destroys Wazps, Turretts, Tikks, Popps, Snytches and Spottrs.',
      effects: [ { stat: 'arc_damage', per: 0.6 }, { stat: 'explosive_resist', per: 0.3 }, { stat: 'melee_damage', per: 0.5 } ],
      conditional: [ { stat: 'melee_damage', per: 3.0, when: 'vs_drone' } ],
      unlocks: ['one_hit_drones'], capstone: true },

    // ================================================================ MOBILITY
    nimble_clamberer: {
      name: 'Nimble Clamberer', branch: 'mobility', row: 0, col: 2, ranks: 5, requires: [], branchPoints: 0,
      desc: 'You climb, vault and step over clutter more quickly: +{v}% move speed per rank.',
      effects: [ { stat: 'move_speed', per: 0.012 } ], capstone: false },
    marathon_runnr: {
      name: 'Marathon Runnr', branch: 'mobility', row: 1, col: 1, ranks: 5, requires: ['nimble_clamberer'], branchPoints: 0,
      desc: 'Moving around costs less stamina: {v}% sprint cost per rank.',
      effects: [ { stat: 'sprint_cost', per: -0.05 } ], capstone: false },
    slip_n_slide: {
      name: "Slip 'n' Slide", branch: 'mobility', row: 1, col: 3, ranks: 5, requires: ['nimble_clamberer'], branchPoints: 0,
      desc: 'You slide further and faster: +{v}% sprint speed per rank.',
      effects: [ { stat: 'sprint_speed', per: 0.015 } ], capstone: false },
    youthful_lungz: {
      name: 'Youthful Lungz', branch: 'mobility', row: 2, col: 1, ranks: 5, requires: ['marathon_runnr'], branchPoints: 0,
      desc: 'Increase your max stamina by {v}% per rank.',
      effects: [ { stat: 'max_stamina', per: 0.05 } ], capstone: false },
    sturdy_ankels: {
      name: 'Sturdy Ankels', branch: 'mobility', row: 2, col: 3, ranks: 5, requires: ['slip_n_slide'], branchPoints: 0,
      desc: 'You take {v}% less fall damage per rank.',
      effects: [ { stat: 'fall_resist', per: 0.1 } ], capstone: false },
    carry_the_moment: {
      name: 'Carry The Moment', branch: 'mobility', row: 3, col: 1, ranks: 1, requires: ['youthful_lungz'], branchPoints: 15,
      desc: 'After a sprint dodge roll, sprinting costs no stamina for 3 seconds (8 s cooldown). Sprinting costs {v}% otherwise.',
      effects: [ { stat: 'sprint_cost', per: -0.05 } ],
      conditional: [ { stat: 'sprint_cost', per: -1.0, when: 'after_dodge' } ], capstone: false },
    calmin_stroll: {
      name: "Calmin' Stroll", branch: 'mobility', row: 3, col: 3, ranks: 1, requires: ['sturdy_ankels'], branchPoints: 15,
      desc: 'While walking (or aiming) your stamina regenerates as if standing still: +{c}% regen. +{v}% regen always.',
      effects: [ { stat: 'stamina_regen', per: 0.05 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.33, when: 'walking' } ], capstone: false },
    effortless_rollin: {
      name: "Effortless Rollin'", branch: 'mobility', row: 4, col: 0, ranks: 5, requires: ['carry_the_moment'], branchPoints: 0,
      desc: 'Dodge rolls cost {v}% stamina per rank.',
      effects: [ { stat: 'dodge_cost', per: -0.08 } ], capstone: false },
    crawl_before_ya_walk: {
      name: 'Crawl Before Ya Walk', branch: 'mobility', row: 4, col: 2, ranks: 5, requires: ['carry_the_moment', 'calmin_stroll'], requiresAny: true, branchPoints: 0,
      desc: 'When downed you crawl +{v}% faster per rank.',
      effects: [ { stat: 'downed_crawl_speed', per: 0.12 } ], capstone: false },
    off_the_walls: {
      name: 'Off The Walls', branch: 'mobility', row: 4, col: 4, ranks: 5, requires: ['calmin_stroll'], branchPoints: 0,
      desc: 'Ledge leaps and wall kicks carry you further: +{v}% dodge distance per rank.',
      effects: [ { stat: 'dodge_distance', per: 0.03 } ], capstone: false },
    heroic_leaps: {
      name: 'Heroic Leaps', branch: 'mobility', row: 5, col: 0, ranks: 5, requires: ['effortless_rollin'], branchPoints: 0,
      desc: 'Your sprint dodge roll travels +{v}% further per rank.',
      effects: [ { stat: 'dodge_distance', per: 0.06 } ], capstone: false },
    vigorous_vaultr: {
      name: 'Vigorous Vaultr', branch: 'mobility', row: 5, col: 2, ranks: 1, requires: ['crawl_before_ya_walk'], branchPoints: 0,
      desc: 'Exhaustion no longer slows your vaults and climbs (+{c}% move speed while exhausted). +{v}% max stamina.',
      effects: [ { stat: 'max_stamina', per: 0.05 } ],
      conditional: [ { stat: 'move_speed', per: 0.15, when: 'exhausted' } ], capstone: false },
    ready_2_roll: {
      name: 'Ready 2 Roll', branch: 'mobility', row: 5, col: 4, ranks: 5, requires: ['off_the_walls'], branchPoints: 0,
      desc: 'A wider window for recovery rolls when you land hard: {v}% less fall damage per rank.',
      effects: [ { stat: 'fall_resist', per: 0.06 } ], capstone: false },
    vaults_upon_vaults: {
      name: 'Vaults Upon Vaults', branch: 'mobility', row: 6, col: 1, ranks: 1, requires: ['heroic_leaps', 'vigorous_vaultr'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. Bottomless lungs: sprinting costs 60% less, dodges 50% less, +50% max stamina and +50% stamina regeneration. Vaulting is free.',
      effects: [ { stat: 'sprint_cost', per: -0.6 }, { stat: 'dodge_cost', per: -0.5 },
                 { stat: 'max_stamina', per: 0.5 }, { stat: 'stamina_regen', per: 0.5 } ], capstone: true },
    vault_sprung: {
      name: 'Vault Sprung', branch: 'mobility', row: 6, col: 3, ranks: 1, requires: ['vigorous_vaultr', 'ready_2_roll'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. Greased lightning: +{v}% move speed, +25% sprint speed, +60% dodge distance, near-immune to fall damage, and ARK take 25% longer to spot you. Spring off the end of every vault.',
      effects: [ { stat: 'move_speed', per: 0.15 }, { stat: 'sprint_speed', per: 0.25 },
                 { stat: 'dodge_distance', per: 0.6 }, { stat: 'fall_resist', per: 0.9 },
                 { stat: 'arc_detect_mul', per: -0.25 } ],
      unlocks: ['vault_jump'], capstone: true },

    // ================================================================ SURVIVAL
    agile_crouchr: {
      name: 'Agile Crouchr', branch: 'survival', row: 0, col: 2, ranks: 5, requires: [], branchPoints: 0,
      desc: 'Your movement speed while crouching is increased by {v}% per rank.',
      effects: [ { stat: 'crouch_speed', per: 0.05 } ], capstone: false },
    looters_instinct: {
      name: "Looter's Instinct", branch: 'survival', row: 1, col: 1, ranks: 5, requires: ['agile_crouchr'], branchPoints: 0,
      desc: 'When searching a container, loot is revealed +{v}% faster per rank.',
      effects: [ { stat: 'search_reveal', per: 0.06 } ], capstone: false },
    revitalising_squat: {
      name: 'Revitalising Squat', branch: 'survival', row: 1, col: 3, ranks: 5, requires: ['agile_crouchr'], branchPoints: 0,
      desc: 'Stamina regeneration while crouched and still is increased by {c}% per rank (+{v}% always).',
      effects: [ { stat: 'stamina_regen', per: 0.01 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.06, when: 'crouched' } ], capstone: false },
    silent_scavengr: {
      name: 'Silent Scavengr', branch: 'survival', row: 2, col: 1, ranks: 5, requires: ['looters_instinct'], branchPoints: 0,
      desc: 'You make less noise when looting: {c}% noise per rank while searching ({v}% always).',
      effects: [ { stat: 'noise_mul', per: -0.02 } ],
      conditional: [ { stat: 'noise_mul', per: -0.1, when: 'looting' } ], capstone: false },
    in_raid_crafting: {
      name: 'In-Raid Crafting', branch: 'survival', row: 2, col: 3, ranks: 1, requires: ['revitalising_squat'], branchPoints: 0,
      desc: 'Unlocks field-crafting topside: bandages, shield rechargers, adrenaline, light grenades, smoke and more.',
      effects: [ { stat: 'in_raid_crafting', per: 1 } ], unlocks: ['field_craft_basic'], capstone: false },
    suffering_in_silence: {
      name: 'Suffering In Silence', branch: 'survival', row: 3, col: 1, ranks: 1, requires: ['silent_scavengr'], branchPoints: 15,
      desc: 'While critically hurt your movement makes {c}% less noise. Footsteps {v}% quieter otherwise.',
      effects: [ { stat: 'footstep_mul', per: -0.05 } ],
      conditional: [ { stat: 'footstep_mul', per: -0.5, when: 'critical' } ], capstone: false },
    good_as_brand_new: {
      name: 'Good As Brand New', branch: 'survival', row: 3, col: 3, ranks: 1, requires: ['in_raid_crafting'], branchPoints: 15,
      desc: 'Healing ticks +{v}% faster, and while a healing effect is active stamina regeneration is +{c}%.',
      effects: [ { stat: 'heal_speed', per: 0.15 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.25, when: 'healing' } ], capstone: false },
    broader_shoulders: {
      name: 'Broader Shoulders', branch: 'survival', row: 4, col: 0, ranks: 5, requires: ['suffering_in_silence'], branchPoints: 0,
      desc: 'Increases the maximum weight you can carry by {v} kg per rank.',
      effects: [ { stat: 'carry_weight', per: 3 } ], capstone: false },
    travelling_tinkerer: {
      name: 'Travelling Tinkerer', branch: 'survival', row: 4, col: 2, ranks: 1, requires: ['suffering_in_silence', 'good_as_brand_new'], requiresAny: true, branchPoints: 0,
      desc: 'Unlocks more field-craftables: noisemakers, grenade traps, herbal bandages and Raider Hatch keys.',
      effects: [ { stat: 'in_raid_crafting', per: 1 } ], unlocks: ['field_craft_advanced'], capstone: false },
    stubborn_mulo: {
      name: 'Stubborn Mulo', branch: 'survival', row: 4, col: 4, ranks: 5, requires: ['good_as_brand_new'], branchPoints: 0,
      desc: 'Over-encumbrance hurts your stamina less: +{c}% regen while overweight and +{v} kg carry, per rank.',
      effects: [ { stat: 'carry_weight', per: 1 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.06, when: 'overweight' } ], capstone: false },
    lootin_luck: {
      name: "Lootin' Luck", branch: 'survival', row: 5, col: 0, ranks: 5, requires: ['broader_shoulders'], branchPoints: 0,
      desc: 'Chance to reveal two items at once while searching: +{v}% search speed per rank.',
      effects: [ { stat: 'search_reveal', per: 0.06 } ], capstone: false },
    one_raiders_trash: {
      name: "One Raider's Trash", branch: 'survival', row: 5, col: 2, ranks: 5, requires: ['travelling_tinkerer'], branchPoints: 0,
      desc: 'Raider containers sometimes hold an extra field-crafted item: +{c}% chance there, +{v}% everywhere, per rank.',
      effects: [ { stat: 'extra_loot_chance', per: 0.01 } ],
      conditional: [ { stat: 'extra_loot_chance', per: 0.04, when: 'raider_container' } ], capstone: false },
    three_big_breaths: {
      name: 'Three Big Breaths', branch: 'survival', row: 5, col: 4, ranks: 5, requires: ['stubborn_mulo'], branchPoints: 0,
      desc: 'After an action drains your stamina you recover faster: +{c}% regen while exhausted (+{v}% always), per rank.',
      effects: [ { stat: 'stamina_regen', per: 0.02 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.1, when: 'exhausted' } ], capstone: false },
    security_breech: {
      name: 'Security Breech', branch: 'survival', row: 6, col: 1, ranks: 1, requires: ['lootin_luck', 'one_raiders_trash'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. Master looter: crack Security Lockers, breach and search twice as fast, +40% rare loot, +30% extra loot, +{v} kg carry capacity and 6 extra backpack slots.',
      effects: [ { stat: 'carry_weight', per: 40 }, { stat: 'backpack_slots', per: 6 }, { stat: 'breach_speed', per: 1.0 },
                 { stat: 'search_reveal', per: 1.0 }, { stat: 'rare_loot_chance', per: 0.4 },
                 { stat: 'extra_loot_chance', per: 0.3 } ],
      unlocks: ['security_lockers'], capstone: true },
    minesweepr: {
      name: 'Minesweepr', branch: 'survival', row: 6, col: 3, ranks: 1, requires: ['one_raiders_trash', 'three_big_breaths'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. Ghost: footsteps 85% quieter, all other noise 70% quieter, ARK need twice as long to spot you, +60% explosive resistance — and you can defuse mines and traps by creeping up on them.',
      effects: [ { stat: 'footstep_mul', per: -0.85 }, { stat: 'noise_mul', per: -0.7 },
                 { stat: 'arc_detect_mul', per: -0.5 }, { stat: 'explosive_resist', per: 0.6 } ],
      unlocks: ['defuse_mines'], capstone: true },
  },
};

// XP needed to reach each level: XP_CURVE[i] = XP to go from level i to level i+1 (raiders start
// at level 0 with 0 points; level n grants skill point n; max level 75 = 75 points).
// Shape copied from the real game's table (5k -> 50k per level, 2.816M total) scaled by 0.25
// for shorter browser raids (total 704k XP).
export const XP_CURVE = [
  1250, 2500, 2750, 2750, 3000, 3250, 3500, 3750, 4000, 4250,          //  1-10
  4500, 4750, 5000, 5250, 5500, 6000, 6250, 6500, 6750, 7000,          // 11-20
  7250, 7750, 8000, 8250, 8500, 8750, 9000, 9250, 9500, 9500,          // 21-30
  9750, 10000, 10250, 10250, 10500, 10750, 10750, 11000, 11000, 11250, // 31-40
  11250, 11500, 11500, 11500, 11750, 11750, 11750, 11750, 12000, 12000, // 41-50
  12000, 12000, 12000, 12000, 12250, 12250, 12250, 12250, 12250, 12250, // 51-60
  12250, 12250, 12250, 12250, 12250, 12250, 12500, 12500, 12500, 12500, // 61-70
  12500, 12500, 12500, 12500, 12500,                                    // 71-75
];

// Cumulative XP required to *be* level n (XP_TOTAL[0] = 0, XP_TOTAL[75] = max).
export const XP_TOTAL = XP_CURVE.reduce((acc, v) => { acc.push(acc[acc.length - 1] + v); return acc; }, [0]);

// XP sources. ARK kill / salvage values are the real game's; the rest are tuned to the curve.
export const XP_REWARDS = {
  // destroying an ARK (per arc.js id; `default` for anything unlisted)
  kill_ark: {
    default: 100,
    tikk: 50, popp: 50, fyreball: 100, komet: 100, wazp: 100, turrett: 100, snytch: 100, spottr: 100,
    hornett: 150, fyrefly: 150, sentinal: 200, surveyr: 200, shreddr: 200,
    leapr: 500, rocketier: 500, vaporiser: 500, bastian: 500, bombardeer: 500, turbyne: 700,
    queene: 1000, matriark: 1000,
  },
  // scavenging the wreck / main chassis (detached parts use ARK[id].xpPart, else `ark_part`)
  loot_ark: {
    default: 200,
    tikk: 100, popp: 100, fyreball: 200, komet: 200, wazp: 200, turrett: 200, snytch: 200, spottr: 200,
    hornett: 250, fyrefly: 250, sentinal: 300, surveyr: 300, shreddr: 250,
    leapr: 600, rocketier: 600, vaporiser: 600, bastian: 250, bombardeer: 300, turbyne: 700,
    queene: 1000, matriark: 1000,
  },
  ark_part: 250,
  damage_ark_per_hp: 1,          // chip XP for damage dealt to ARK (real game: 2-3 per HP)
  damage_raider_per_hp: 5,       // real game value
  down_raider: 250,
  revive_ally: 300,
  // searching containers (keys = src/game/loot.js CONTAINER_LOOT kinds + arc.js ARK_HUSKS ids)
  loot_container: {
    default: 30,
    crate: 30, locker: 30, cabinet: 25, desk: 25, trash: 15, fridge: 20, suitcase: 30, backpack: 40, bag: 25,
    toolbox: 35, electronics: 35, ammo_box: 35, medical_bag: 40, weapon_case: 80, safe: 120,
    car_trunk: 30, plant: 20, basket: 30, arc_crate: 100, arc_husk: 400, raider_cache: 150,
    field_depot: 200, security_locker: 150, supply_drop: 300,
    wazp_husk: 400, rocketier_husk: 700, barron_husk: 500, ark_probe: 700, ark_courier: 700,
    ark_assessor: 200, deforestr_husk: 200,
  },
  harvest_plant: 20,
  breach_door: 100,
  topside_per_sec: 3,            // real game: 3 XP per second topside
  extract: 2500,                 // successful extraction
  extract_per_minute: 50,        // bonus per minute survived before extracting
  quest: 1500,                   // default if a quest omits rewards.xp
  first_daily_extract: 1500,
};
