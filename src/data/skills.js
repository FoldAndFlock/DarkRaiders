// Skill tree, XP curve and XP rewards (pure data).
// Three branches of 15 skills (Dad Strength, Cardio, Gremlin Mode), each forking from one root into
// two lanes that re-merge, gated at 15 and 36 points spent in the branch. Max level 75 -> 75 skill
// points, so a raider can reach the capstones of at most two branches.
//
// Node schema (docs/ARCHITECTURE.md): { name, branch, row, col, ranks, requires, branchPoints,
//   desc, effects: [{ stat, per }], capstone }
// `effects` are ALWAYS-ON and summed per rank by src/game/stats.js computeStats(); the stat kinds
// there decide how a value applies (e.g. max_hp / carry_weight / slots / self_revive are
// absolute adds, noise_mul / sprint_cost / dodge_cost / footstep_mul / arc_detect_mul are
// "lower" reductions given here as negative fractions, most others are +fraction multipliers).
//
// Extensions (optional, safe to ignore):
//   requiresAny: true  -> ANY one of `requires` unlocks the node (an "A or B" link).
//                         Without it, every listed requirement needs >= 1 rank.
//   conditional: [{ stat, per, when }] -> situational bonuses that need runtime context, kept OUT
//                         of `effects` so computeStats() never applies them permanently. `when`:
//                         'hurt' (damaged < 3 s ago), 'critical' (HP < 30 %), 'downed',
//                         'crouched' (still), 'walking', 'healing', 'overweight', 'exhausted',
//                         'shield_broken' (< 4 s ago), 'after_dodge' (3 s, 8 s cooldown),
//                         'looting', 'vs_drone' (target is a flying/small ARK), 'raider_container'.
//   unlocks: [...]     -> non-stat abilities: 'one_hit_drones', 'field_craft_basic', 'field_craft_advanced'
//                         (wired up), plus 'security_lockers', 'defuse_mines', 'vault_jump' (reserved: no
//                         effect yet, so the descs do not promise them).
// Layout: 5 columns (0..4), root at col 2, rows 0..6. Row 3 needs 15 points spent in the branch,
// row 6 (capstones) needs 36. desc placeholders: {v} = effects[0].per, {c} = conditional[0].per
// (show as % when |value| < 5, as-is otherwise).

export const SKILL_RULES = {
  maxLevel: 75, pointsPerLevel: 1, maxPoints: 75,
  gates: [ { row: 3, branchPoints: 15 }, { row: 6, branchPoints: 36 } ],
  respecCostPerPoint: 2000,   // coins per spent point to reset the whole tree
  columns: 5, rows: 7,
};

export const SKILL_TREE = {
  branches: {
    conditioning: { name: 'Dad Strength', color: '#1fff76', icon: 'skill_conditioning', order: 0,
      desc: 'Old-man grit: shrug off blasts, pry open anything, refuse to stay down. Also opens jars.' },
    mobility: { name: 'Cardio', color: '#ffd205', icon: 'skill_mobility', order: 1,
      desc: 'Stamina, sprinting, rolling and climbing. The best armour is not being there when the shooting starts.' },
    survival: { name: 'Gremlin Mode', color: '#f60010', icon: 'skill_survival', order: 2,
      desc: 'Scavenge faster, quieter and greedier. Crouch in the dark, touch everything, haul more home.' },
  },

  nodes: {
    // ================================================================ CONDITIONING
    used_to_the_wait: {
      name: 'One Trip Groceries', branch: 'conditioning', row: 0, col: 2, ranks: 5, requires: [], branchPoints: 0,
      desc: 'You refuse to make two trips, so heavy kit drags on you less: +{v}% move speed per rank.',
      effects: [ { stat: 'move_speed', per: 0.015 } ], capstone: false },
    blast_borne: {
      name: 'Grill Master', branch: 'conditioning', row: 1, col: 1, ranks: 5, requires: ['used_to_the_wait'], branchPoints: 0,
      desc: 'Years of lighting the barbecue the hard way: {v}% less explosive damage (and shorter ear-ringing) per rank.',
      effects: [ { stat: 'explosive_resist', per: 0.04 } ], capstone: false },
    gentler_pressure: {
      name: 'Indoor Voice', branch: 'conditioning', row: 1, col: 3, ranks: 5, requires: ['used_to_the_wait'], branchPoints: 0,
      desc: 'You breach and pry like it\'s 2 a.m. and the baby is finally asleep: {v}% noise per rank.',
      effects: [ { stat: 'noise_mul', per: -0.05 } ], capstone: false },
    fight_or_fright: {
      name: 'Stubbed Toe Energy', branch: 'conditioning', row: 2, col: 1, ranks: 5, requires: ['blast_borne'], branchPoints: 0,
      desc: 'Pain is just motivation with bad PR: +{c}% stamina regeneration for a few seconds after taking damage (+{v}% always), per rank.',
      effects: [ { stat: 'stamina_regen', per: 0.02 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.12, when: 'hurt' } ], capstone: false },
    proficient_pryor: {
      name: 'Jar Opener', branch: 'conditioning', row: 2, col: 3, ranks: 5, requires: ['gentler_pressure'], branchPoints: 0,
      desc: 'Here, I loosened it for you: doors and containers breach +{v}% faster per rank.',
      effects: [ { stat: 'breach_speed', per: 0.07 } ], capstone: false },
    survivalists_stamina: {
      name: 'Walk It Off', branch: 'conditioning', row: 3, col: 1, ranks: 1, requires: ['fight_or_fright'], branchPoints: 15,
      desc: 'Nearly dead? Walk it off. Stamina regenerates +{c}% faster while critically hurt. +{v}% max stamina.',
      effects: [ { stat: 'max_stamina', per: 0.05 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.35, when: 'critical' } ], capstone: false },
    unbothered_roll: {
      name: 'Not Even Mad', branch: 'conditioning', row: 3, col: 3, ranks: 1, requires: ['proficient_pryor'], branchPoints: 15,
      desc: 'When your shield breaks, your next dodge roll within a few seconds costs no stamina. Roll cost {v}% otherwise.',
      effects: [ { stat: 'dodge_cost', per: -0.05 } ],
      conditional: [ { stat: 'dodge_cost', per: -1.0, when: 'shield_broken' } ], capstone: false },
    down_but_determined: {
      name: 'Just Resting My Eyes', branch: 'conditioning', row: 4, col: 0, ranks: 5, requires: ['survivalists_stamina'], branchPoints: 0,
      desc: 'You\'re not bleeding out, you\'re resting your eyes: +{v}% downed health per rank, so it takes longer to bleed out.',
      effects: [ { stat: 'downed_hp', per: 0.08 } ], capstone: false },
    a_lil_extra: {
      name: 'Coffee Tin Of Screws', branch: 'conditioning', row: 4, col: 2, ranks: 1, requires: ['survivalists_stamina', 'unbothered_roll'], requiresAny: true, branchPoints: 0,
      desc: 'You never throw anything away: +{v}% scrap yield, so recycling hands back extra crafting materials.',
      effects: [ { stat: 'scrap_yield', per: 0.25 } ], capstone: false },
    effortless_swingin: {
      name: 'Firm Handshake', branch: 'conditioning', row: 4, col: 4, ranks: 5, requires: ['unbothered_roll'], branchPoints: 0,
      desc: 'You judge people by their grip, and so does your Bonk Stick: +{v}% melee damage per rank.',
      effects: [ { stat: 'melee_damage', per: 0.08 } ], capstone: false },
    tortoise_crawl: {
      name: 'Floor Is Comfy', branch: 'conditioning', row: 5, col: 0, ranks: 5, requires: ['down_but_determined'], branchPoints: 0,
      desc: 'Lying down is your natural habitat: while downed you take {c}% less damage per rank (and have +{v}% downed health).',
      effects: [ { stat: 'downed_hp', per: 0.03 } ],
      conditional: [ { stat: 'damage_reduction', per: 0.07, when: 'downed' } ], capstone: false },
    laden_arms: {
      name: 'Load-Bearing Dad Bod', branch: 'conditioning', row: 5, col: 2, ranks: 1, requires: ['a_lil_extra'], branchPoints: 0,
      desc: 'It\'s not a gut, it\'s storage: +{v} kg carry capacity.',
      effects: [ { stat: 'carry_weight', per: 6 } ], capstone: false },
    sky_clearin_swing: {
      name: 'Get Off My Lawn', branch: 'conditioning', row: 5, col: 4, ranks: 5, requires: ['effortless_swingin'], branchPoints: 0,
      desc: 'Shoo! Your melee hits flying ARK much harder: +{c}% melee damage against drones (+{v}% always), per rank.',
      effects: [ { stat: 'melee_damage', per: 0.04 } ],
      conditional: [ { stat: 'melee_damage', per: 0.2, when: 'vs_drone' } ], capstone: false },
    back_on_yer_feet: {
      name: 'Never Calls In Sick', branch: 'conditioning', row: 6, col: 1, ranks: 1, requires: ['tortoise_crawl', 'laden_arms'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. Hasn\'t taken a sick day since the Beta Test: pick yourself up from Downed 2 times per raid (hold interact), +25 max HP, double downed health and +50% healing from every item.',
      effects: [ { stat: 'self_revive', per: 2 }, { stat: 'max_hp', per: 25 }, { stat: 'downed_hp', per: 1.0 },
                 { stat: 'heal_amount', per: 0.5 } ], capstone: true },
    flyswatta: {
      name: 'Rolled-Up Newspaper', branch: 'conditioning', row: 6, col: 3, ranks: 1, requires: ['laden_arms', 'sky_clearin_swing'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. Bad machine! +{v}% damage to all ARK, +30% explosive resistance, +50% melee damage, and one melee blow destroys small ARK: Buzzkills, Wallflowers, Late Fees, Pop-Up Ads, Narcs and Plus Ones.',
      effects: [ { stat: 'arc_damage', per: 0.6 }, { stat: 'explosive_resist', per: 0.3 }, { stat: 'melee_damage', per: 0.5 } ],
      conditional: [ { stat: 'melee_damage', per: 3.0, when: 'vs_drone' } ],
      unlocks: ['one_hit_drones'], capstone: true },

    // ================================================================ MOBILITY
    nimble_clamberer: {
      name: 'Took The Stairs', branch: 'mobility', row: 0, col: 2, ranks: 5, requires: [], branchPoints: 0,
      desc: 'You take the stairs now and mention it often: +{v}% move speed per rank.',
      effects: [ { stat: 'move_speed', per: 0.012 } ], capstone: false },
    marathon_runnr: {
      name: 'Couch To 5K', branch: 'mobility', row: 1, col: 1, ranks: 5, requires: ['nimble_clamberer'], branchPoints: 0,
      desc: 'Week one of the plan, forever: sprint stamina cost {v}% per rank.',
      effects: [ { stat: 'sprint_cost', per: -0.05 } ], capstone: false },
    slip_n_slide: {
      name: 'Wet Floor Sign', branch: 'mobility', row: 1, col: 3, ranks: 5, requires: ['nimble_clamberer'], branchPoints: 0,
      desc: 'You ignored the sign and it worked out: +{v}% sprint speed per rank.',
      effects: [ { stat: 'sprint_speed', per: 0.015 } ], capstone: false },
    youthful_lungz: {
      name: 'Hot Yoga Lungs', branch: 'mobility', row: 2, col: 1, ranks: 5, requires: ['marathon_runnr'], branchPoints: 0,
      desc: 'Breathe in for four, out for eight: +{v}% max stamina per rank.',
      effects: [ { stat: 'max_stamina', per: 0.05 } ], capstone: false },
    sturdy_ankels: {
      name: 'Sensible Shoes', branch: 'mobility', row: 2, col: 3, ranks: 5, requires: ['slip_n_slide'], branchPoints: 0,
      desc: 'Orthopaedic and proud of it: you take {v}% less fall damage per rank.',
      effects: [ { stat: 'fall_resist', per: 0.1 } ], capstone: false },
    carry_the_moment: {
      name: 'Runner\'s High', branch: 'mobility', row: 3, col: 1, ranks: 1, requires: ['youthful_lungz'], branchPoints: 15,
      desc: 'After a sprint dodge roll, sprinting costs no stamina for 3 seconds (8 s cooldown). Sprint stamina cost {v}% otherwise.',
      effects: [ { stat: 'sprint_cost', per: -0.05 } ],
      conditional: [ { stat: 'sprint_cost', per: -1.0, when: 'after_dodge' } ], capstone: false },
    calmin_stroll: {
      name: 'Mall Walker', branch: 'mobility', row: 3, col: 3, ranks: 1, requires: ['sturdy_ankels'], branchPoints: 15,
      desc: 'Brisk, purposeful power-walking: while walking (or aiming) stamina regenerates +{c}% faster. +{v}% regen always.',
      effects: [ { stat: 'stamina_regen', per: 0.05 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.33, when: 'walking' } ], capstone: false },
    effortless_rollin: {
      name: 'Tuck And Roll', branch: 'mobility', row: 4, col: 0, ranks: 5, requires: ['carry_the_moment'], branchPoints: 0,
      desc: 'Stop, drop and keep going: dodge roll stamina cost {v}% per rank.',
      effects: [ { stat: 'dodge_cost', per: -0.08 } ], capstone: false },
    crawl_before_ya_walk: {
      name: 'Floor Cardio', branch: 'mobility', row: 4, col: 2, ranks: 5, requires: ['carry_the_moment', 'calmin_stroll'], requiresAny: true, branchPoints: 0,
      desc: 'Floor cardio still counts: while downed you crawl +{v}% faster per rank.',
      effects: [ { stat: 'downed_crawl_speed', per: 0.12 } ], capstone: false },
    off_the_walls: {
      name: 'Sugar Rush', branch: 'mobility', row: 4, col: 4, ranks: 5, requires: ['calmin_stroll'], branchPoints: 0,
      desc: 'Two energy drinks deep and bouncing: +{v}% dodge distance per rank.',
      effects: [ { stat: 'dodge_distance', per: 0.03 } ], capstone: false },
    heroic_leaps: {
      name: 'The Floor Is Lava', branch: 'mobility', row: 5, col: 0, ranks: 5, requires: ['effortless_rollin'], branchPoints: 0,
      desc: 'Your childhood training finally pays off: your dodge roll travels +{v}% further per rank.',
      effects: [ { stat: 'dodge_distance', per: 0.06 } ], capstone: false },
    vigorous_vaultr: {
      name: 'Second Wind (Of Many)', branch: 'mobility', row: 5, col: 2, ranks: 1, requires: ['crawl_before_ya_walk'], branchPoints: 0,
      desc: 'Exhaustion is a state of mind: +{c}% move speed while exhausted. +{v}% max stamina.',
      effects: [ { stat: 'max_stamina', per: 0.05 } ],
      conditional: [ { stat: 'move_speed', per: 0.15, when: 'exhausted' } ], capstone: false },
    ready_2_roll: {
      name: 'Stuck The Landing', branch: 'mobility', row: 5, col: 4, ranks: 5, requires: ['off_the_walls'], branchPoints: 0,
      desc: 'A judge somewhere gave you a 9.5: {v}% less fall damage per rank.',
      effects: [ { stat: 'fall_resist', per: 0.06 } ], capstone: false },
    vaults_upon_vaults: {
      name: 'Powered By Spite', branch: 'mobility', row: 6, col: 1, ranks: 1, requires: ['heroic_leaps', 'vigorous_vaultr'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. Bottomless lungs, fuelled entirely by spite: sprinting costs 60% less stamina, dodges 50% less, +50% max stamina and +50% stamina regeneration.',
      effects: [ { stat: 'sprint_cost', per: -0.6 }, { stat: 'dodge_cost', per: -0.5 },
                 { stat: 'max_stamina', per: 0.5 }, { stat: 'stamina_regen', per: 0.5 } ], capstone: true },
    vault_sprung: {
      name: 'Dine And Dash', branch: 'mobility', row: 6, col: 3, ranks: 1, requires: ['vigorous_vaultr', 'ready_2_roll'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. Gone before the bill arrives: +{v}% move speed, +25% sprint speed, +60% dodge distance, 90% less fall damage, and ARK take 25% longer to spot you.',
      effects: [ { stat: 'move_speed', per: 0.15 }, { stat: 'sprint_speed', per: 0.25 },
                 { stat: 'dodge_distance', per: 0.6 }, { stat: 'fall_resist', per: 0.9 },
                 { stat: 'arc_detect_mul', per: -0.25 } ],
      unlocks: ['vault_jump'], capstone: true },

    // ================================================================ SURVIVAL
    agile_crouchr: {
      name: 'Goblin Shuffle', branch: 'survival', row: 0, col: 2, ranks: 5, requires: [], branchPoints: 0,
      desc: 'Low, fast and deeply unsettling: +{v}% movement speed while crouching per rank.',
      effects: [ { stat: 'crouch_speed', per: 0.05 } ], capstone: false },
    looters_instinct: {
      name: 'Rummage Sale Veteran', branch: 'survival', row: 1, col: 1, ranks: 5, requires: ['agile_crouchr'], branchPoints: 0,
      desc: 'You\'ve out-elbowed grandmas at rummage sales: searching reveals loot +{v}% faster per rank.',
      effects: [ { stat: 'search_reveal', per: 0.06 } ], capstone: false },
    revitalising_squat: {
      name: 'Snack Break Squat', branch: 'survival', row: 1, col: 3, ranks: 5, requires: ['agile_crouchr'], branchPoints: 0,
      desc: 'Crouch still and catch your breath: +{c}% stamina regeneration while crouched and still, per rank (+{v}% always).',
      effects: [ { stat: 'stamina_regen', per: 0.01 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.06, when: 'crouched' } ], capstone: false },
    silent_scavengr: {
      name: 'Library Rules', branch: 'survival', row: 2, col: 1, ranks: 5, requires: ['looters_instinct'], branchPoints: 0,
      desc: 'Shhh. Looting noise {c}% per rank while searching ({v}% always).',
      effects: [ { stat: 'noise_mul', per: -0.02 } ],
      conditional: [ { stat: 'noise_mul', per: -0.1, when: 'looting' } ], capstone: false },
    in_raid_crafting: {
      name: 'Arts And Crafts', branch: 'survival', row: 2, col: 3, ranks: 1, requires: ['revitalising_squat'], branchPoints: 0,
      desc: 'Glue, tape and a can-do attitude: unlocks field-crafting topside from carried materials - bandages, shield rechargers, light grenades, noisemakers, grenade traps and more.',
      effects: [ { stat: 'in_raid_crafting', per: 1 } ], unlocks: ['field_craft_basic'], capstone: false },
    suffering_in_silence: {
      name: 'Quiet Quitting', branch: 'survival', row: 3, col: 1, ranks: 1, requires: ['silent_scavengr'], branchPoints: 15,
      desc: 'You stopped complaining and started sneaking: footstep noise {c}% while critically hurt, {v}% otherwise.',
      effects: [ { stat: 'footstep_mul', per: -0.05 } ],
      conditional: [ { stat: 'footstep_mul', per: -0.5, when: 'critical' } ], capstone: false },
    good_as_brand_new: {
      name: 'Rub Some Dirt On It', branch: 'survival', row: 3, col: 3, ranks: 1, requires: ['in_raid_crafting'], branchPoints: 15,
      desc: 'Healing items work +{v}% faster, and while a healing effect is active your stamina regeneration is +{c}%.',
      effects: [ { stat: 'heal_speed', per: 0.15 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.25, when: 'healing' } ], capstone: false },
    broader_shoulders: {
      name: 'Pockets On Pockets', branch: 'survival', row: 4, col: 0, ranks: 5, requires: ['suffering_in_silence'], branchPoints: 0,
      desc: 'Cargo pants of destiny: +3 kg carry capacity per rank.',
      effects: [ { stat: 'carry_weight', per: 3 } ], capstone: false },
    travelling_tinkerer: {
      name: 'Garage Workshop', branch: 'survival', row: 4, col: 2, ranks: 1, requires: ['suffering_in_silence', 'good_as_brand_new'], requiresAny: true, branchPoints: 0,
      desc: 'Field-crafting gets an upgrade: adds adrenaline shots, Smoke Breaks (small smoke grenades) and Doggy Door Keys to what you can make topside.',
      effects: [ { stat: 'in_raid_crafting', per: 1 } ], unlocks: ['field_craft_advanced'], capstone: false },
    stubborn_mulo: {
      name: 'Sits On The Suitcase', branch: 'survival', row: 4, col: 4, ranks: 5, requires: ['good_as_brand_new'], branchPoints: 0,
      desc: 'Overpacked and fine with it: +{c}% stamina regeneration while overweight and +1 kg carry, per rank.',
      effects: [ { stat: 'carry_weight', per: 1 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.06, when: 'overweight' } ], capstone: false },
    lootin_luck: {
      name: 'Two-For-One Tuesday', branch: 'survival', row: 5, col: 0, ranks: 5, requires: ['broader_shoulders'], branchPoints: 0,
      desc: 'Your bargain sense is tingling: +{v}% search speed per rank.',
      effects: [ { stat: 'search_reveal', per: 0.06 } ], capstone: false },
    one_raiders_trash: {
      name: 'Dumpster Diver', branch: 'survival', row: 5, col: 2, ranks: 5, requires: ['travelling_tinkerer'], branchPoints: 0,
      desc: 'One raider\'s trash is your whole personality: +{c}% extra-loot chance in raider containers, +{v}% everywhere, per rank.',
      effects: [ { stat: 'extra_loot_chance', per: 0.01 } ],
      conditional: [ { stat: 'extra_loot_chance', per: 0.04, when: 'raider_container' } ], capstone: false },
    three_big_breaths: {
      name: 'Paper Bag Breathing', branch: 'survival', row: 5, col: 4, ranks: 5, requires: ['stubborn_mulo'], branchPoints: 0,
      desc: 'In, out, don\'t panic: +{c}% stamina regeneration while exhausted (+{v}% always), per rank.',
      effects: [ { stat: 'stamina_regen', per: 0.02 } ],
      conditional: [ { stat: 'stamina_regen', per: 0.1, when: 'exhausted' } ], capstone: false },
    security_breech: {
      name: 'Raccoon Ascendant', branch: 'survival', row: 6, col: 1, ranks: 1, requires: ['lootin_luck', 'one_raiders_trash'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. Trash panda, final form: breach and search twice as fast, +40% rare loot, +30% extra loot, +{v} kg carry capacity and 6 extra backpack slots.',
      effects: [ { stat: 'carry_weight', per: 40 }, { stat: 'backpack_slots', per: 6 }, { stat: 'breach_speed', per: 1.0 },
                 { stat: 'search_reveal', per: 1.0 }, { stat: 'rare_loot_chance', per: 0.4 },
                 { stat: 'extra_loot_chance', per: 0.3 } ],
      unlocks: ['security_lockers'], capstone: true },
    minesweepr: {
      name: 'Ghosted', branch: 'survival', row: 6, col: 3, ranks: 1, requires: ['one_raiders_trash', 'three_big_breaths'], requiresAny: true, branchPoints: 36,
      desc: 'CAPSTONE. You stopped replying and vanished: footsteps 85% quieter, all other noise 70% quieter, ARK need twice as long to spot you, and +60% explosive resistance.',
      effects: [ { stat: 'footstep_mul', per: -0.85 }, { stat: 'noise_mul', per: -0.7 },
                 { stat: 'arc_detect_mul', per: -0.5 }, { stat: 'explosive_resist', per: 0.6 } ],
      unlocks: ['defuse_mines'], capstone: true },
  },
};

// XP needed to reach each level: XP_CURVE[i] = XP to go from level i to level i+1 (raiders start
// at level 0 with 0 points; level n grants skill point n; max level 75 = 75 points).
// Rises from ~1k to 12.5k per level (total 704k XP), tuned for short browser raids.
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

// XP sources, tuned to the curve.
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
  damage_ark_per_hp: 1,          // chip XP for damage dealt to ARK
  damage_raider_per_hp: 5,
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
  topside_per_sec: 3,            // XP per second spent topside
  extract: 2500,                 // successful extraction
  extract_per_minute: 50,        // bonus per minute survived before extracting
  quest: 1500,                   // default if a quest omits rewards.xp
  first_daily_extract: 1500,
};
