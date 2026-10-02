// Map conditions (pure data), patterned on ARC Raiders 1.x map conditions (arcraiders.wiki
// Category:Map Conditions + each map's infobox). Names that are plain English stay as-is;
// machine names follow arc.js tweaks (Queene, Matriark).
//
// Entry: { name, desc, bullets[], time, weather, weatherByMap?, effects, difficulty, weight, icon, color }
//   time     engine/lighting.js TIMES key: 'dawn' | 'noon' | 'dusk' | 'night'
//   weather  engine/lighting.js WEATHER key: 'clear' | 'overcast' | 'rain' | 'storm' | 'sandstorm' | 'fog' | 'snow'
//   difficulty  1..5 per map (the in-game risk pips).  weight: relative odds in a random rotation.
//
// effects (all optional; sim.js already reads lootMul, rareMul, arkMul, spawnBoss):
//   lootMul        x items rolled per container / ARK drop      rareMul   x weight of non-common rarities
//   arkMul         x ARK spawn counts                           arkLootMul x ARK drop chances
//   arkThreatUp    +N threat tiers when picking spawn variants (e.g. Wazp group -> Hornett/Fyrefly)
//   spawnBoss      arc.js id spawned once per raid              bossPoi   POI to place it at (else random)
//   spawnStructure world set-piece to enable ('harvester')       spawnGroups [[arkId, count, groups]]
//   natureLootMul  x plants / baskets                           cacheMul  x Raider Caches
//   cacheLootMul   x cache contents                             cachesExplode { fuse, radius, dmg }
//   huskMul        x ARK husks (arc.js ARK_HUSKS)               huskElectrified chance a husk shocks on breach
//   probeMul       x ARK Probe landings                         courierMul x crashed couriers
//   keyMul         x key drop chance                            lockedLootMul x loot behind locked doors
//   keyRoomsDisabled  key rooms stay sealed                     lockedTunnels  green_gate underground sealed
//   extractsMul    fraction of extraction points active         hatchesDisabled Raider Hatches offline
//   lightning      { interval:[min,max] s, radius, dmg, stun, telegraph s, killsSmallArk, arkStun s }
//   coldDamage     { dps, delay, indoorSafe }                   wind { strength, staminaMul, shieldDps }
//   visionMul      x everyone's sight range (fog/snow/storm)    hearingMul x hearing ranges
//   flashlights    raiders carry torches (night)                durationMul x raid length
//   trinketMul / birdMul / ziplineMul / flyingArkMul           Bird City extras
//   uniqueItems    items.js ids that can only drop under this condition
//   noFreeLoadout  free-loadout raiders may not deploy

export const CONDITIONS = {
  normal: {
    name: 'Calm Skies', icon: 'cond_clear', color: '#c8d0d8',
    desc: 'Nothing unusual reported topside. Standard ARK patrols, standard loot.',
    bullets: [],
    time: 'noon', timeOptions: ['dawn', 'noon', 'dusk'], weather: 'clear',
    effects: {},
    difficulty: { damn_grounds: 2, green_gate: 4, sandy_city: 3 }, weight: 8,
  },

  night_raid: {
    name: 'Night Raid', icon: 'cond_night', color: '#5a6ad0',
    desc: 'Raiders have been finding especially good loot behind locked doors, and keys have been more plentiful. The heightened Raider activity has attracted more ARK than usual.',
    bullets: ['Fewer active return points', 'No active Raider Hatches', 'Increased loot value'],
    time: 'night', weather: 'clear',
    effects: { lootMul: 1.25, rareMul: 1.5, arkMul: 1.35, arkLootMul: 1.4, keyMul: 2.0, lockedLootMul: 1.5,
               extractsMul: 0.6, hatchesDisabled: true, flashlights: true, visionMul: 0.8, noFreeLoadout: true },
    difficulty: { damn_grounds: 4, green_gate: 5, sandy_city: 5 }, weight: 2,
  },

  em_storm: {
    name: 'Electromagnetic Storm', icon: 'cond_storm', color: '#60a0ff',
    desc: 'Lightning batters the surface: frying electronics, disrupting ARK machines and electrocuting unwary Raiders. Watch for the blue glow on the ground before a strike.',
    bullets: ['Fewer active return points', 'No active Raider Hatches', 'Increased loot value', 'Lightning strikes'],
    time: 'dusk', weather: 'storm',
    effects: { lootMul: 1.2, rareMul: 1.3, extractsMul: 0.6, hatchesDisabled: true, courierMul: 2, probeMul: 1.5,
               lightning: { interval: [4, 9], radius: 6, dmg: 60, stun: 2, telegraph: 1.5, killsSmallArk: true, arkStun: 6 },
               visionMul: 0.85, uniqueItems: ['fossilized_lightning'] },
    difficulty: { damn_grounds: 4, green_gate: 5 }, weight: 2,
  },

  lush_blooms: {
    name: 'Lush Blooms', icon: 'cond_nature', color: '#60d060',
    desc: 'The weather has been unusually agreeable and vital plants and fruits are thriving. Get out there and gather before it is all gone.',
    bullets: ['Increased amount of Nature loot'],
    time: 'noon', weather: 'clear',
    effects: { natureLootMul: 2.5, lootMul: 1.05 },
    difficulty: { damn_grounds: 2, green_gate: 4, sandy_city: 3 }, weight: 3,
  },

  uncovered_caches: {
    name: 'Uncovered Caches', icon: 'cond_caches', color: '#ff8040',
    desc: 'Storms have unearthed old Raider Caches — rigged to blow if left exposed too long. Listen for the whirr and the ticking, and hurry.',
    bullets: ['Exploding caches', 'More, richer Raider Caches'],
    time: 'dusk', weather: 'overcast',
    effects: { cacheMul: 3, cacheLootMul: 1.5, cachesExplode: { fuse: 420, radius: 6, dmg: 80 } },
    difficulty: { damn_grounds: 2, green_gate: 4, sandy_city: 3 }, weight: 3,
  },

  husk_graveyard: {
    name: 'Husk Graveyard', icon: 'cond_husks', color: '#a08060',
    desc: 'Something brought ARK down in great numbers, leaving husks scattered topside. A rare chance for parts and data — but some husks are still live and shock whoever breaches them.',
    bullets: ['Electrified First Wave husks', 'Many more husks'],
    time: 'noon', weather: 'overcast',
    effects: { huskMul: 3, huskElectrified: 0.35, huskTypes: ['wazp_husk', 'rocketier_husk', 'ark_courier'] },
    difficulty: { damn_grounds: 3, green_gate: 4, sandy_city: 4 }, weight: 2,
  },

  prospecting_probes: {
    name: 'Prospecting Probes', icon: 'cond_probes', color: '#40c0ff',
    desc: 'ARK have entered a period of extended probing, sending guarded Probes down en masse.',
    bullets: ['Increased amount of Probes', 'Probes escorted by drones'],
    time: 'noon', weather: 'clear',
    effects: { probeMul: 3, probeEscort: [['wazp', 2]], arkMul: 1.1 },
    difficulty: { damn_grounds: 3, green_gate: 4, sandy_city: 4 }, weight: 2,
  },

  harvester: {
    name: 'Harvester', icon: 'cond_harvester', color: '#ff3040',
    desc: 'A mysterious harvesting machine has appeared, heavily guarded by the feared Queene. Power its core with three fusion cores and shoot out the yellow targets to crack its vault.',
    bullets: ['Harvester set-piece active', 'Queene patrols the Harvester', 'Legendary blueprints inside'],
    time: 'dusk', weather: 'overcast',
    effects: { spawnBoss: 'queene', bossPoi: 'harvester', spawnStructure: 'harvester',
               harvester: { fusionCores: 3, targets: 12, targetHp: 100, fireDischarge: 45,
                            loot: [['equaliser_blueprint', 0.35, 1, 1], ['jupitor_blueprint', 0.35, 1, 1],
                                   ['complex_gun_parts', 0.8, 1, 3], ['magnetic_accelerator', 0.6, 1, 2]] } },
    difficulty: { damn_grounds: 3, green_gate: 4 }, weight: 1,
  },

  matriarch: {
    name: 'Matriark', icon: 'cond_matriarch', color: '#d020ff',
    desc: 'A Matriark has been sighted nearby. Her children seem hell-bent on keeping her from harm.',
    bullets: ['The Matriark roams the map', 'More ARK escorts'],
    time: 'noon', weather: 'overcast',
    effects: { spawnBoss: 'matriark', arkMul: 1.2, arkThreatUp: 1 },
    difficulty: { damn_grounds: 4, green_gate: 5 }, weight: 1,
  },

  cold_snap: {
    name: 'Cold Snap', icon: 'cond_cold', color: '#c0e0ff',
    desc: 'A cold front has swept in with snowfall. Frostbite will cut a Raider down in minutes unless they get indoors or keep healing. Candleberry bushes are ripe for picking.',
    bullets: ['Harvest Candleberries', 'Increased loot value', 'Damaging cold outdoors', 'Slippery frozen water'],
    time: 'noon', weather: 'snow',
    effects: { lootMul: 1.15, rareMul: 1.15, coldDamage: { dps: 0.6, delay: 30, indoorSafe: true },
               visionMul: 0.85, frozenWater: true, uniqueItems: ['candleberries'] },
    difficulty: { damn_grounds: 4, green_gate: 5, sandy_city: 5 }, weight: 2,
  },

  hurricane: {
    name: 'Hurricane', icon: 'cond_hurricane', color: '#d0b080',
    desc: 'Strong winds sweep the surface. Visibility and hearing are reduced, debris strips shields, and the gales have unearthed First Wave caches — along with nastier ARK.',
    bullets: ['Increased loot value', 'Debris damages shields', 'Higher-threat ARK', 'First Wave caches'],
    time: 'dusk', weather: 'sandstorm', weatherByMap: { damn_grounds: 'storm', green_gate: 'storm', sandy_city: 'sandstorm' },
    effects: { lootMul: 1.25, rareMul: 1.3, arkThreatUp: 1, arkMul: 1.15, visionMul: 0.7, hearingMul: 0.6,
               wind: { strength: 2.5, staminaMul: 1.3, shieldDps: 1.5 }, firstWaveCaches: 4 },
    difficulty: { damn_grounds: 5, green_gate: 5, sandy_city: 5 }, weight: 1,
  },

  close_scrutiny: {
    name: 'Close Scrutiny', icon: 'cond_scrutiny', color: '#ffe040',
    desc: 'Groups of Surveyrs, guarded by Vaporisers, are scanning for valuable materials and calling down ARK Assessrs. Breach an Assessr pylon for rare parts — and face the squadron it summons.',
    bullets: ['No active locked doors', 'Decreased overall loot value', 'Increased ARK loot'],
    time: 'noon', weather: 'clear',
    effects: { keyRoomsDisabled: true, lootMul: 0.85, rareMul: 0.9, arkLootMul: 1.5,
               spawnGroups: [['surveyr', 1, 3], ['vaporiser', 1, 3]], assessors: 3, noFreeLoadout: true },
    difficulty: { damn_grounds: 5, green_gate: 5, sandy_city: 5 }, weight: 1,
  },

  locked_gate: {
    name: 'Locked Gate', icon: 'cond_locked_gate', color: '#40ff90',
    desc: "A clandestine group has triggered the Gate's emergency shutdown. Recover the four security codes from their mined-off printers and enter them in the Gate Control Room to open the tunnels below.",
    bullets: ['Fewer active return points', 'No active Raider Hatches', 'Collect security codes', 'Longer raid'],
    time: 'dusk', weather: 'fog',
    effects: { lockedTunnels: true, codeItem: 'security_code',
               codes: ['raiders_refuge', 'pilgrims_peak', 'reinforced_reception', 'ancient_fort'],
               unlockAt: 'gate_control_room', buriedMines: true, vaultLootMul: 2.5,
               extractsMul: 0.6, hatchesDisabled: true, durationMul: 1.33,
               escorts: { pilgrims_peak: [['rocketier', 2]] } },
    difficulty: { green_gate: 4 }, weight: 1,
  },

  bird_city: {
    name: 'Bird City', icon: 'cond_birds', color: '#f0e0a0',
    desc: 'Flocks of birds have nested in the rooftop chimneys of Sandy City, lining them with stolen trinkets. Extra ziplines criss-cross the roofs — and ARK drones of all kinds patrol the sky.',
    bullets: ['Increased amount of trinkets', 'Increased amount of birds', 'Increased amount of ziplines', 'More flying ARK'],
    time: 'noon', weather: 'clear',
    effects: { trinketMul: 2.5, birdMul: 3, ziplineMul: 2, flyingArkMul: 1.6, chimneyNests: true,
               uniqueItems: ['alien_duck', 'arcade_duck', 'doodly_duck', 'familiar_duck', 'flashy_duck',
                             'frosty_duck', 'gentle_duck', 'mri_duck', 'tropical_duck'] },
    difficulty: { sandy_city: 3 }, weight: 2,
  },
};

// Which conditions each map can roll (from each map's wiki infobox / condition pages).
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
