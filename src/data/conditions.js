// Map conditions (pure data): the topside "forecast" a raid can roll, each with its own lighting,
// weather and gameplay modifiers. Player-visible text is name / desc / bullets; machine names in it
// follow arc.js (The Landlady, Helicopter Mom, Customer Survey...).
//
// Entry: { name, desc, bullets[], time, weather, weatherByMap?, effects, difficulty, weight, icon, color }
//   time     engine/lighting.js TIMES key: 'dawn' | 'noon' | 'dusk' | 'night'
//   weather  engine/lighting.js WEATHER key: 'clear' | 'overcast' | 'rain' | 'storm' | 'sandstorm' | 'fog' | 'snow'
//   difficulty  1..5 per map (the in-game risk pips).  weight: relative odds in a random rotation.
//
// effects (all optional; sim.js already reads lootMul, rareMul, arkMul, spawnBoss):
//   lootMul        x items rolled per container / ARK drop      rareMul   x weight of non-common rarities
//   arkMul         x ARK spawn counts                           arkLootMul x ARK drop chances
//   arkThreatUp    +N threat tiers when picking spawn variants (e.g. wazp group -> hornett/fyrefly)
//   spawnBoss      arc.js id spawned once per raid              bossPoi   POI to place it at (else random)
//   spawnStructure world set-piece to enable ('harvester')       spawnGroups [[arkId, count, groups]]
//   natureLootMul  x plants / baskets                           cacheMul  x Raider Caches
//   cacheLootMul   x cache contents                             cachesExplode { fuse, radius, dmg }
//   huskMul        x ARK husks (arc.js ARK_HUSKS)               huskElectrified chance a husk shocks on breach
//   probeMul       x ark_probe landings                         courierMul x crashed couriers
//   keyMul         x key drop chance                            lockedLootMul x loot behind locked doors
//   keyRoomsDisabled  key rooms stay sealed                     lockedTunnels  green_gate underground sealed
//   extractsMul    fraction of extraction points active         hatchesDisabled hatches (Doggy Doors) offline
//   lightning      { interval:[min,max] s, radius, dmg, stun, telegraph s, killsSmallArk, arkStun s }
//   coldDamage     { dps, delay, indoorSafe }                   wind { strength, staminaMul, shieldDps }
//   visionMul      x everyone's sight range (fog/snow/storm)    hearingMul x hearing ranges
//   flashlights    raiders carry torches (night)                durationMul x raid length
//   trinketMul / birdMul / ziplineMul / flyingArkMul           bird_city extras
//   uniqueItems    items.js ids that can only drop under this condition
//   noFreeLoadout  free-loadout raiders may not deploy

export const CONDITIONS = {
  normal: {
    name: 'Business As Usual', icon: 'cond_clear', color: '#c8d0d8',
    desc: 'Nothing unusual topside. Standard ARK patrols, standard loot, standard existential dread.',
    bullets: [],
    time: 'noon', timeOptions: ['dawn', 'noon', 'dusk'], weather: 'clear',
    effects: {},
    difficulty: { damn_grounds: 2, green_gate: 4, sandy_city: 3 }, weight: 8,
  },

  night_raid: {
    name: 'Night Shift', icon: 'cond_night', color: '#5a6ad0',
    desc: 'Locked rooms are paying out and keys are turning up everywhere. Bad news: the ARK work nights too, and they brought extra staff.',
    bullets: ['Fewer extraction points open', 'Doggy Doors offline', 'Better loot, more keys', 'More ARK, and it is dark'],
    time: 'night', weather: 'clear',
    effects: { lootMul: 1.25, rareMul: 1.5, arkMul: 1.35, arkLootMul: 1.4, keyMul: 2.0, lockedLootMul: 1.5,
               extractsMul: 0.6, hatchesDisabled: true, flashlights: true, visionMul: 0.8, noFreeLoadout: true },
    difficulty: { damn_grounds: 4, green_gate: 5, sandy_city: 5 }, weight: 2,
  },

  em_storm: {
    name: 'Electric Boogaloo', icon: 'cond_storm', color: '#60a0ff',
    desc: 'Lightning keeps striking twice, usually on you. Strikes fry small ARK and stun big ones. The ground glows blue just before a hit.',
    bullets: ['Fewer extraction points open', 'Doggy Doors offline', 'Better loot', 'Lightning strikes (watch for the blue glow)'],
    time: 'dusk', weather: 'storm',
    effects: { lootMul: 1.2, rareMul: 1.3, extractsMul: 0.6, hatchesDisabled: true, courierMul: 2, probeMul: 1.5,
               lightning: { interval: [4, 9], radius: 6, dmg: 60, stun: 2, telegraph: 1.5, killsSmallArk: true, arkStun: 6 },
               visionMul: 0.85, uniqueItems: ['fossilized_lightning'] },
    difficulty: { damn_grounds: 4, green_gate: 5 }, weight: 2,
  },

  lush_blooms: {
    name: 'Allergy Season', icon: 'cond_nature', color: '#60d060',
    desc: 'Everything is blooming and your eyes won\'t stop watering. Plants and fruit are everywhere: grab them before someone else does.',
    bullets: ['Lots more plants and fruit'],
    time: 'noon', weather: 'clear',
    effects: { natureLootMul: 2.5, lootMul: 1.05 },
    difficulty: { damn_grounds: 2, green_gate: 4, sandy_city: 3 }, weight: 3,
  },

  uncovered_caches: {
    name: 'Everything Must Go', icon: 'cond_caches', color: '#ff8040',
    desc: 'Storms dug up old Raider Caches and they are on a timer. Hear whirring and ticking? Grab the stock and run before the clearance sale goes off.',
    bullets: ['More, richer Raider Caches', 'Caches explode if left too long'],
    time: 'dusk', weather: 'overcast',
    effects: { cacheMul: 3, cacheLootMul: 1.5, cachesExplode: { fuse: 420, radius: 6, dmg: 80 } },
    difficulty: { damn_grounds: 2, green_gate: 4, sandy_city: 3 }, weight: 3,
  },

  husk_graveyard: {
    name: 'Mass Layoffs', icon: 'cond_husks', color: '#a08060',
    desc: 'Something downsized the ARK workforce overnight. Husks everywhere, full of parts and data - but some are still live and shock whoever breaches them.',
    bullets: ['Many more ARK husks', 'Some husks are electrified'],
    time: 'noon', weather: 'overcast',
    effects: { huskMul: 3, huskElectrified: 0.35, huskTypes: ['wazp_husk', 'rocketier_husk', 'ark_courier'] },
    difficulty: { damn_grounds: 3, green_gate: 4, sandy_city: 4 }, weight: 2,
  },

  prospecting_probes: {
    name: 'Survey Season', icon: 'cond_probes', color: '#40c0ff',
    desc: 'The ARK value your feedback. Customer Surveys are landing everywhere, each with a Buzzkill escort. Participation is mandatory.',
    bullets: ['Lots more Customer Surveys', 'Surveys escorted by Buzzkill drones'],
    time: 'noon', weather: 'clear',
    effects: { probeMul: 3, probeEscort: [['wazp', 2]], arkMul: 1.1 },
    difficulty: { damn_grounds: 3, green_gate: 4, sandy_city: 4 }, weight: 2,
  },

  harvester: {
    name: 'Juice Cleanse', icon: 'cond_harvester', color: '#ff3040',
    desc: 'The Juicer has landed and The Landlady is guarding it. Feed it three fusion cores, shoot out the yellow targets and crack its vault.',
    bullets: ['The Juicer is active', 'The Landlady patrols it', 'Legendary blueprints inside'],
    time: 'dusk', weather: 'overcast',
    effects: { spawnBoss: 'queene', bossPoi: 'harvester', spawnStructure: 'harvester',
               harvester: { fusionCores: 3, targets: 12, targetHp: 100, fireDischarge: 45,
                            loot: [['equaliser_blueprint', 0.35, 1, 1], ['jupitor_blueprint', 0.35, 1, 1],
                                   ['complex_gun_parts', 0.8, 1, 3], ['magnetic_accelerator', 0.6, 1, 2]] } },
    difficulty: { damn_grounds: 3, green_gate: 4 }, weight: 1,
  },

  matriarch: {
    name: 'Mom\'s Home', icon: 'cond_matriarch', color: '#d020ff',
    desc: 'Helicopter Mom is in the area and her children will not let anyone near her. Expect more escorts, tougher ones, and a lot of hovering.',
    bullets: ['Helicopter Mom roams the map', 'More, tougher ARK escorts'],
    time: 'noon', weather: 'overcast',
    effects: { spawnBoss: 'matriark', arkMul: 1.2, arkThreatUp: 1 },
    difficulty: { damn_grounds: 4, green_gate: 5 }, weight: 1,
  },

  cold_snap: {
    name: 'Cold Shoulder', icon: 'cond_cold', color: '#c0e0ff',
    desc: 'The surface stopped returning your calls. Frostbite chips away at you outdoors unless you get inside or keep healing. Candleberries are ripe.',
    bullets: ['Cold hurts outdoors - get inside', 'Harvest Candleberries', 'Better loot', 'Slippery frozen water'],
    time: 'noon', weather: 'snow',
    effects: { lootMul: 1.15, rareMul: 1.15, coldDamage: { dps: 0.6, delay: 30, indoorSafe: true },
               visionMul: 0.85, frozenWater: true, uniqueItems: ['candleberries'] },
    difficulty: { damn_grounds: 4, green_gate: 5, sandy_city: 5 }, weight: 2,
  },

  hurricane: {
    name: 'Bad Hair Day', icon: 'cond_hurricane', color: '#d0b080',
    desc: 'Gale-force winds, flying debris, zero visibility. Debris strips shields, you can barely hear, the ARK are nastier - and the wind dug up Beta Test caches.',
    bullets: ['Better loot', 'Debris damages shields', 'Higher-threat ARK', 'Beta Test caches'],
    time: 'dusk', weather: 'sandstorm', weatherByMap: { damn_grounds: 'storm', green_gate: 'storm', sandy_city: 'sandstorm' },
    effects: { lootMul: 1.25, rareMul: 1.3, arkThreatUp: 1, arkMul: 1.15, visionMul: 0.7, hearingMul: 0.6,
               wind: { strength: 2.5, staminaMul: 1.3, shieldDps: 1.5 }, firstWaveCaches: 4 },
    difficulty: { damn_grounds: 5, green_gate: 5, sandy_city: 5 }, weight: 1,
  },

  close_scrutiny: {
    name: 'Audit Season', icon: 'cond_scrutiny', color: '#ffe040',
    desc: 'Data Miners guarded by Vape Lords are scanning for valuables and calling down Tax Assessors. Breach one for rare parts, then explain yourself to its squadron.',
    bullets: ['Locked rooms stay locked', 'Less loot overall', 'More ARK loot'],
    time: 'noon', weather: 'clear',
    effects: { keyRoomsDisabled: true, lootMul: 0.85, rareMul: 0.9, arkLootMul: 1.5,
               spawnGroups: [['surveyr', 1, 3], ['vaporiser', 1, 3]], assessors: 3, noFreeLoadout: true },
    difficulty: { damn_grounds: 5, green_gate: 5, sandy_city: 5 }, weight: 1,
  },

  locked_gate: {
    name: 'Forgot My Password', icon: 'cond_locked_gate', color: '#40ff90',
    desc: 'Someone triggered the Gate\'s emergency lockout. Recover four security codes from the mined printers and enter them in the control room to open the tunnels.',
    bullets: ['Fewer extraction points open', 'Doggy Doors offline', 'Collect security codes', 'Longer raid'],
    time: 'dusk', weather: 'fog',
    effects: { lockedTunnels: true, codeItem: 'security_code',
               codes: ['raiders_refuge', 'pilgrims_peak', 'reinforced_reception', 'ancient_fort'],
               unlockAt: 'gate_control_room', buriedMines: true, vaultLootMul: 2.5,
               extractsMul: 0.6, hatchesDisabled: true, durationMul: 1.33,
               escorts: { pilgrims_peak: [['rocketier', 2]] } },
    difficulty: { green_gate: 4 }, weight: 1,
  },

  bird_city: {
    name: 'Magpie Mafia', icon: 'cond_birds', color: '#f0e0a0',
    desc: 'The birds of Sandy City have organised. Their chimney nests are full of stolen trinkets, extra ziplines cross the roofs, and ARK drones patrol the sky.',
    bullets: ['More trinkets', 'More birds', 'More ziplines', 'More flying ARK'],
    time: 'noon', weather: 'clear',
    effects: { trinketMul: 2.5, birdMul: 3, ziplineMul: 2, flyingArkMul: 1.6, chimneyNests: true,
               uniqueItems: ['alien_duck', 'arcade_duck', 'doodly_duck', 'familiar_duck', 'flashy_duck',
                             'frosty_duck', 'gentle_duck', 'mri_duck', 'tropical_duck'] },
    difficulty: { sandy_city: 3 }, weight: 2,
  },
};

// Which conditions each map can roll.
export const MAP_CONDITIONS = {
  damn_grounds: ['normal', 'lush_blooms', 'uncovered_caches', 'harvester', 'husk_graveyard', 'matriarch',
                 'prospecting_probes', 'night_raid', 'em_storm', 'cold_snap', 'hurricane', 'close_scrutiny'],
  green_gate: ['normal', 'lush_blooms', 'uncovered_caches', 'harvester', 'husk_graveyard', 'matriarch',
               'prospecting_probes', 'em_storm', 'night_raid', 'cold_snap', 'locked_gate', 'hurricane', 'close_scrutiny'],
  sandy_city: ['normal', 'lush_blooms', 'uncovered_caches', 'night_raid', 'cold_snap', 'prospecting_probes',
               'husk_graveyard', 'bird_city', 'hurricane', 'close_scrutiny'],
};
// every condition knows its own id (sim / map markers gate on cond.id)
for (const [k, v] of Object.entries(CONDITIONS)) v.id ??= k;
