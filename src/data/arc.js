// ARK machine definitions (pure data): every hostile machine of the Autonomous Repossession
// Konglomerate, plus the static wrecks / landers players can breach. Tuned for a top-down camera.
// Ids are internal and never change (saves, co-op, quests, loot); `name` / `desc` / ability names
// are player-facing.
//
// Schema: see docs/ARCHITECTURE.md ("arc.js"). Fields beyond the base schema are optional
// hints the engine may use or ignore:
//
//   model / modelScale   voxel builder key in engine/models.js ARC_BUILDERS + extra scale.
//   size                 { radius, height, length?, width? } in metres (radius/height mirror the
//                        top-level schema fields; length/width = footprint for big walkers).
//   height               for flyers this is the HOVER ALTITUDE (sim.js uses it that way); body
//                        height is size.height.  hover: ground unit floating just above the floor.
//                        Flight (game/ark_ai.js): the hull is a cylinder of ~0.72 x radius by size.height
//                        that never enters a solid; optional altitude (overrides height) and climbRate
//                        (m/s, default 4.5 small / 3 big). Flyers with radius <= 0.8 may follow a raider
//                        indoors through an open doorway; bigger ones only look for an angle from outside.
//   explosiveMul         multiplier on explosive damage taken.  turnRate: body yaw speed (deg/s).
//   static: true         fixed emplacement that never moves (turrett, sentinal).
//   color                minimap / UI tint.  threat: 1 (nuisance) .. 10 (boss).
//   vision.sweep         { arc, speed } idle scan sweep (deg, deg/s) for fixed/scanning units.
//   vision.lose          seconds before an alerted ARK drops back from red to yellow.
//   attack.cooldown      seconds between attacks;  attack.effect { stun, shieldDrain, latch,
//                        drainPerSec, knockdown, blind, staminaDrain } ; attack.burn { dps, dur }
//   attack.leavesFire    { dps, dur, radius } ground fire left behind.
//   attack.telegraph     'laser' | 'converge' | 'ground_marker' | 'beep' | 'screech'
//   attack.firesAtLastKnown  keeps shooting where it last saw you (s).
//   abilities[]          secondary attacks/abilities with the same shape as `attack` + `name`.
//   fallAfter            flyers: number of broken thrusters/rotors that makes them crash.
//   onDeath              { fire?: {radius,dur,dps}, explode?: {radius,dmg} }
//   spawn                { group: [min,max], maps: [...], habitat: 'indoor'|'outdoor'|'any',
//                          escorts?: [[arkId, count]], conditionOnly?: conditionId, event?: true }
//   calls                (snytch) reinforcement waves it summons.
//   xpLoot / xpPart      XP for scavenging the wreck / each lootable detached part.
//
// Hitzones (local frame: x = right, z = forward, metres; y optional height):
//   r       hit radius.           mul     damage multiplier (default 1).
//   armor   per-zone mitigation 0..0.95 (overrides ARK armor).   hp: breakable part HP.
//   mirrorX / mirrorZ   duplicate the zone on the other side(s) (4 rotors = one entry).
//   arc     degrees: zone can only be hit by shots coming from inside this cone, centred on
//           `dir` (deg, 0 = ARK forward, 180 = rear, 90 = right). If `dir` is omitted it is
//           the direction of (x,z) from the centre. This is how flanking matters top-down.
//   onBreak 'stagger' | 'fall' | 'slow' | 'disarm' | 'expose' | 'blind'
//   exposedWhen  'attacking' | 'scanning' | 'landed' | 'plates_broken' — zone only exists then.
//   requiresBroken [zoneName] — zone only hittable once those parts are gone.
//   platesNeeded   for exposedWhen 'plates_broken': how many armour plates must be gone.
//   lootOnBreak    loot rows dropped when the part breaks off.
//
// Loot rows: [itemId, chance 0..1, min, max]. Item ids follow items.js naming
// (ark_alloy, ark_powercell, ...; unique parts e.g. wazp_driver).

export const ARK = {
  // ------------------------------------------------------------------ small fry
  tikk: {
    name: 'Late Fee', model: 'tick', modelScale: 1,
    hp: 15, armor: 0, flying: false, height: 0.4, radius: 0.3, speed: 6.5, turnRate: 540,
    size: { radius: 0.3, height: 0.4 },
    behavior: 'tick', climbs: true, meleeOneHit: true,
    vision: { range: 10, fov: 160, hearing: 14, alertTime: 0.3, lose: 4 },
    attack: { kind: 'leap', dmg: 8, range: 6, windup: 0.8, cooldown: 3, telegraph: 'beep',
              effect: { latch: true, drainPerSec: 7, shieldDrain: 10 } },
    hitzones: [ { name: 'body', x: 0, z: 0, r: 0.3, mul: 1 } ],
    loot: [ ['ark_powercell', 0.35, 1, 1], ['ark_alloy', 0.4, 1, 1], ['tikk_pod', 0.35, 1, 1],
            ['ark_flex_rubber', 0.1, 1, 1], ['ark_thermo_lining', 0.08, 1, 1] ],
    xp: 50, xpLoot: 100, threat: 1, color: '#c8c2b0',
    spawn: { group: [1, 4], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'indoor' },
    desc: 'Small, sudden and always attached. Drops from the rafters, latches on and drains health and shield; shake it off, then one Bonk Stick swing settles the account.',
  },

  popp: {
    name: 'Pop-Up Ad', model: 'pop', modelScale: 1,
    hp: 20, armor: 0, flying: false, height: 0.7, radius: 0.35, speed: 7.5, turnRate: 360,
    size: { radius: 0.35, height: 0.7 },
    behavior: 'pop',
    vision: { range: 14, fov: 120, hearing: 16, alertTime: 0.4, lose: 5 },
    attack: { kind: 'explode', dmg: 45, radius: 3.5, range: 1.6, windup: 1.2, telegraph: 'beep', shieldMul: 1.2 },
    hitzones: [ { name: 'body', x: 0, z: 0, r: 0.35, mul: 1 } ],
    loot: [ ['ark_powercell', 0.35, 1, 1], ['ark_alloy', 0.4, 1, 1], ['crude_explosives', 0.35, 1, 2],
            ['popp_trigger', 0.4, 1, 1], ['ark_coolant', 0.1, 1, 1], ['ark_thermo_lining', 0.08, 1, 1] ],
    xp: 50, xpLoot: 100, threat: 1, color: '#e8d860',
    spawn: { group: [2, 5], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'indoor' },
    desc: 'Rolls up uninvited, beeping faster the closer it gets. Shoot it early or dodge-roll over it to bait the blast. There is no \'skip ad\' button.',
  },

  fyreball: {
    name: 'Hot Take', model: 'fireball', modelScale: 1,
    hp: 60, armor: 0.75, flying: false, height: 0.9, radius: 0.45, speed: 5, turnRate: 300,
    size: { radius: 0.45, height: 0.9 },
    behavior: 'fireball',
    vision: { range: 16, fov: 100, hearing: 16, alertTime: 0.5, lose: 6 },
    attack: { kind: 'flame', dmg: 18, range: 6, cone: 30, dur: 2.5, windup: 0.8, cooldown: 3,
              burn: { dps: 5, dur: 4 } },
    hitzones: [
      { name: 'core', x: 0, z: 0.35, r: 0.25, mul: 4.0, armor: 0, exposedWhen: 'attacking', arc: 100, dir: 0 },
      { name: 'shell', x: 0, z: 0, r: 0.45, armor: 0.75 },
    ],
    onDeath: { fire: { radius: 2.5, dur: 5, dps: 6 } },
    loot: [ ['ark_powercell', 0.35, 1, 1], ['ark_alloy', 0.4, 1, 1], ['crude_explosives', 0.35, 1, 2],
            ['fyreball_burner', 0.4, 1, 1], ['ark_coolant', 0.1, 1, 1], ['ark_thermo_lining', 0.08, 1, 1] ],
    xp: 100, xpLoot: 200, threat: 2, color: '#ff7a20',
    spawn: { group: [1, 3], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'indoor' },
    desc: 'Armoured ball that light rounds bounce off, until it stops and pops open to share its opinion as fire. Shoot the white-hot core from the front while it\'s open.',
  },

  komet: {
    name: 'Rolling Blackout', model: 'pop', modelScale: 1.8,
    hp: 150, armor: 0.75, explosiveMul: 1.3, flying: false, height: 1.3, radius: 0.7, speed: 8, turnRate: 240,
    size: { radius: 0.7, height: 1.3 },
    behavior: 'pop', variant: 'komet',
    vision: { range: 20, fov: 110, hearing: 20, alertTime: 0.5, lose: 6 },
    attack: { kind: 'explode', dmg: 70, radius: 6.5, range: 3, windup: 1.0, telegraph: 'beep', shieldMul: 1.3 },
    hitzones: [
      { name: 'core', x: 0, z: 0, r: 0.35, mul: 4.0, armor: 0, exposedWhen: 'attacking', onBreak: 'disarm' },
      { name: 'shell', x: 0, z: 0, r: 0.7, armor: 0.75 },
    ],
    lootIfDisarmedOnly: ['komet_igniter'],
    loot: [ ['ark_alloy', 0.5, 1, 2], ['crude_explosives', 0.4, 1, 2], ['advanced_ark_powercell', 0.15, 1, 1],
            ['ark_coolant', 0.12, 1, 1], ['ark_thermo_lining', 0.1, 1, 1], ['explosive_compound', 0.15, 1, 1],
            ['komet_igniter', 0.6, 1, 1] ],
    xp: 100, xpLoot: 200, threat: 3, color: '#ffb040',
    spawn: { group: [1, 2], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor', escorts: [] },
    desc: 'Big armoured roller that charges groups and detonates in a seismic blast. The shell splits just before it blows: hit the core then and it shuts down quietly, igniter intact.',
  },

  // ------------------------------------------------------------------ drones
  wazp: {
    name: 'Buzzkill', model: 'wasp', modelScale: 1,
    hp: 110, armor: 0, flying: true, height: 2.4, radius: 0.6, speed: 5.5, turnRate: 240,
    size: { radius: 0.6, height: 0.5 },
    behavior: 'drone_gunner',
    vision: { range: 24, fov: 70, hearing: 18, alertTime: 0.8, lose: 6 },
    attack: { kind: 'bullets', dmg: 5, rpm: 600, burst: 10, range: 22, projSpeed: 70, spread: 4,
              windup: 0.6, cooldown: 2.2, telegraph: 'laser' },
    hitzones: [
      { name: 'rotor', x: 0.5, z: 0.5, r: 0.22, mul: 1.5, hp: 22, mirrorX: true, mirrorZ: true, onBreak: 'stagger' },
      { name: 'body', x: 0, z: 0, r: 0.3, mul: 1.0 },
    ],
    fallAfter: 2,
    loot: [ ['ammo_light', 0.7, 10, 25], ['ark_powercell', 0.45, 1, 1], ['ark_alloy', 0.55, 1, 2],
            ['simple_gun_parts', 0.3, 1, 1], ['ark_synthetic_resin', 0.12, 1, 1],
            ['ark_thermo_lining', 0.1, 1, 1], ['wazp_driver', 0.4, 1, 1] ],
    xp: 100, xpLoot: 200, threat: 2, color: '#e0a030',
    spawn: { group: [2, 4], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor' },
    desc: 'Quad-rotor gun drone. Paints you with a red laser, hovers to steady itself, then hoses you down. Shoot out two rotors and it retires early, into the dirt.',
  },

  hornett: {
    name: 'Middle Manager', model: 'hornet', modelScale: 1,
    hp: 200, armor: 0.25, flying: true, height: 2.8, radius: 0.75, speed: 4.5, turnRate: 200,
    size: { radius: 0.75, height: 0.6 },
    behavior: 'drone_heavy',
    vision: { range: 24, fov: 70, hearing: 18, alertTime: 0.8, lose: 6 },
    attack: { kind: 'shock', dmg: 10, range: 20, projSpeed: 12, windup: 0.9, cooldown: 3.5, telegraph: 'laser',
              effect: { stun: 1.2, shieldDrain: 30 } },
    hitzones: [
      { name: 'front_plate', x: 0, z: 0.6, r: 0.55, armor: 0.85, arc: 120, dir: 0 },
      { name: 'front_rotor', x: 0.55, z: 0.5, r: 0.22, armor: 0.7, hp: 45, mirrorX: true, onBreak: 'stagger' },
      { name: 'rear_rotor', x: 0.55, z: -0.5, r: 0.24, mul: 1.7, hp: 35, mirrorX: true, onBreak: 'stagger' },
      { name: 'body', x: 0, z: -0.1, r: 0.35, mul: 1.0 },
    ],
    fallAfter: 2,
    loot: [ ['ammo_medium', 0.7, 10, 20], ['ark_powercell', 0.45, 1, 1], ['ark_alloy', 0.55, 1, 2],
            ['simple_gun_parts', 0.3, 1, 1], ['ark_performance_steel', 0.12, 1, 1],
            ['ark_synthetic_resin', 0.12, 1, 1], ['hornett_driver', 0.4, 1, 1] ],
    xp: 150, xpLoot: 250, threat: 3, color: '#d06a20',
    spawn: { group: [1, 2], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor' },
    desc: 'Armoured drone whose slow stun rounds drain shields. All plate up front, no listening skills: flank it and shoot the glowing rear rotors. Dodge-roll when it sounds off.',
  },

  fyrefly: {
    name: 'Burnout', model: 'hornet', modelScale: 1.1,
    hp: 200, armor: 0.55, flying: true, height: 2.4, radius: 0.7, speed: 4.6, turnRate: 200,
    size: { radius: 0.7, height: 0.6 },
    behavior: 'drone_gunner', variant: 'flamer',
    vision: { range: 22, fov: 70, hearing: 18, alertTime: 0.7, lose: 6 },
    attack: { kind: 'flame', dmg: 20, range: 7, cone: 35, dur: 2.5, windup: 0.7, cooldown: 2.5,
              burn: { dps: 5, dur: 4 } },
    hitzones: [
      { name: 'thruster', x: 0.5, z: 0.45, r: 0.22, armor: 0.5, hp: 60, mirrorX: true, mirrorZ: true, onBreak: 'stagger' },
      { name: 'fuel_tank', x: 0, z: -0.45, r: 0.25, mul: 3.0, armor: 0, exposedWhen: 'attacking', onBreak: 'fall' },
      { name: 'hull', x: 0, z: 0, r: 0.4, armor: 0.55 },
    ],
    fallAfter: 2,
    onDeath: { fire: { radius: 3, dur: 5, dps: 6 } },
    loot: [ ['ark_powercell', 0.45, 1, 1], ['chemicals', 0.5, 1, 3], ['ark_alloy', 0.5, 1, 2],
            ['simple_gun_parts', 0.3, 1, 1], ['ark_synthetic_resin', 0.12, 1, 1],
            ['synthesized_fuel', 0.15, 1, 1], ['fyrefly_burner', 0.4, 1, 1] ],
    xp: 150, xpLoot: 250, threat: 4, color: '#ff5a10',
    spawn: { group: [1, 2], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor' },
    desc: 'Heavily armoured flame drone running on fumes. When it extends its flamer, the yellow fuel tank on its back is exposed; hit that and it drops like a stone.',
  },

  snytch: {
    name: 'Narc', model: 'snitch', modelScale: 1,
    hp: 150, armor: 0, flying: true, height: 4, radius: 0.5, speed: 4.5, turnRate: 160,
    size: { radius: 0.5, height: 0.5 },
    behavior: 'snitch', flees: true,
    vision: { range: 26, fov: 36, hearing: 14, alertTime: 1.0, lose: 8, sweep: { arc: 120, speed: 30 } },
    attack: null,
    calls: { windup: 7.5, pulses: 3, cooldown: 60, max: 2, radius: 40,
             waves: [ [['wazp', 2]], [['fyrefly', 1], ['hornett', 1]], [['rocketier', 1]] ] },
    hitzones: [
      { name: 'rotor', x: 0.42, z: 0.42, r: 0.2, mul: 1.5, hp: 20, mirrorX: true, mirrorZ: true, onBreak: 'stagger' },
      { name: 'body', x: 0, z: 0, r: 0.3, mul: 1.0 },
    ],
    fallAfter: 2,
    loot: [ ['ark_powercell', 0.45, 1, 1], ['ark_alloy', 0.5, 1, 1], ['snytch_scanner', 0.4, 1, 1],
            ['ark_synthetic_resin', 0.1, 1, 1], ['ark_thermo_lining', 0.1, 1, 1], ['sensors', 0.12, 1, 1] ],
    xp: 100, xpLoot: 200, threat: 2, color: '#ffd030',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor' },
    desc: 'Unarmed scout with a sweeping spotlight. Spot you and it calls three times, then reinforcements drop in. The Narc has more friends than you: kill it before the third call.',
  },

  spottr: {
    name: 'Plus One', model: 'snitch', modelScale: 0.9,
    hp: 80, armor: 0, flying: true, height: 6, radius: 0.45, speed: 5.5, turnRate: 180,
    size: { radius: 0.45, height: 0.5 },
    behavior: 'spotter',
    vision: { range: 34, fov: 40, hearing: 14, alertTime: 0.8, lose: 8 },
    attack: null,
    mark: { lockTime: 2.0, dur: 6, relaysTo: 'bombardeer', alertRadius: 30 },
    hitzones: [
      { name: 'rotor', x: 0.38, z: 0.38, r: 0.18, mul: 1.5, hp: 15, mirrorX: true, mirrorZ: true, onBreak: 'stagger' },
      { name: 'body', x: 0, z: 0, r: 0.28, mul: 1.0 },
    ],
    fallAfter: 2,
    loot: [ ['ark_powercell', 0.45, 1, 1], ['ark_alloy', 0.45, 1, 1], ['spottr_relay', 0.45, 1, 1],
            ['ark_synthetic_resin', 0.1, 1, 1], ['ark_thermo_lining', 0.1, 1, 1], ['sensors', 0.12, 1, 1] ],
    xp: 100, xpLoot: 200, threat: 2, color: '#80d0ff',
    spawn: { group: [2, 2], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor' },
    desc: 'Harmless alone: it holds a marking laser on you so its Shell Company can shell you, even behind cover. Break line of sight or shoot it down. It always brings a friend.',
  },

  // ------------------------------------------------------------------ fixed emplacements
  turrett: {
    name: 'Wallflower', model: 'turret', modelScale: 1, static: true,
    hp: 80, armor: 0.1, flying: false, height: 1.2, radius: 0.5, speed: 0, turnRate: 120,
    size: { radius: 0.5, height: 1.2 },
    behavior: 'turret',
    vision: { range: 22, fov: 18, hearing: 12, alertTime: 0.6, lose: 4, sweep: { arc: 120, speed: 30 } },
    attack: { kind: 'bullets', dmg: 5, rpm: 540, burst: 18, range: 22, projSpeed: 70, spread: 5,
              windup: 0.5, cooldown: 1.5, telegraph: 'laser', firesAtLastKnown: 2 },
    hitzones: [
      { name: 'gun_shield', x: 0, z: 0.35, r: 0.3, armor: 0.6, arc: 110, dir: 0 },
      { name: 'rear_housing', x: 0, z: -0.35, r: 0.28, mul: 2.5, arc: 160, dir: 180 },
      { name: 'body', x: 0, z: 0, r: 0.35, mul: 1.0 },
    ],
    loot: [ ['ammo_light', 0.7, 10, 30], ['ark_powercell', 0.45, 1, 1], ['ark_alloy', 0.45, 1, 1],
            ['simple_gun_parts', 0.3, 1, 1], ['ark_synthetic_resin', 0.1, 1, 1], ['ark_thermo_lining', 0.1, 1, 1] ],
    xp: 100, xpLoot: 200, threat: 2, color: '#b0b4bc',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'indoor' },
    desc: 'Wall-mounted gun that never leaves the edge of the room. Stay out of its thin scanner beam or get around it; the glowing rear housing pops in a couple of shots.',
  },

  sentinal: {
    name: 'Neighborhood Watch', model: 'sentinel', modelScale: 1, static: true,
    hp: 300, armor: 0.25, flying: false, height: 4, radius: 0.6, speed: 0, turnRate: 70,
    size: { radius: 0.6, height: 4 },
    behavior: 'sentinel',
    vision: { range: 50, fov: 14, hearing: 10, alertTime: 1.2, lose: 6, sweep: { arc: 100, speed: 18 } },
    attack: { kind: 'laser', dmg: 60, range: 50, windup: 2.2, cooldown: 3.5, telegraph: 'converge',
              firesAtLastKnown: 2, armorPen: 0.6 },
    hitzones: [
      { name: 'canister', x: 0.25, z: -0.45, r: 0.22, mul: 3.0, hp: 60, arc: 160, dir: 180, onBreak: 'disarm' },
      { name: 'head', x: 0, z: 0.2, r: 0.4, armor: 0.5 },
      { name: 'mount', x: 0, z: 0, r: 0.45, mul: 1.0 },
    ],
    loot: [ ['ammo_heavy', 0.7, 5, 15], ['ark_alloy', 0.5, 1, 2], ['simple_gun_parts', 0.3, 1, 1],
            ['advanced_ark_powercell', 0.15, 1, 1], ['ark_coolant', 0.12, 1, 1], ['ark_flex_rubber', 0.1, 1, 1],
            ['ark_motion_core', 0.1, 1, 1], ['ark_synthetic_resin', 0.1, 1, 1], ['ark_thermo_lining', 0.1, 1, 1],
            ['medium_gun_parts', 0.15, 1, 1], ['sentinal_firing_core', 0.4, 1, 1] ],
    xp: 200, xpLoot: 300, threat: 4, color: '#ff9030',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor' },
    desc: 'Rooftop sniper with strong opinions about your lawn. A sweeping beam finds you, four yellow lasers converge, then a heavy round lands. Shoot the canister behind the mast.',
  },

  // ------------------------------------------------------------------ mid-tier
  surveyr: {
    name: 'Data Miner', model: 'surveyor', modelScale: 1,
    hp: 260, armor: 0.6, explosiveMul: 1.5, flying: false, height: 1.8, radius: 0.9, speed: 9, turnRate: 300,
    size: { radius: 0.9, height: 1.8 },
    behavior: 'surveyor', flees: true,
    vision: { range: 22, fov: 360, hearing: 26, alertTime: 0.4, lose: 10 },
    attack: { kind: 'melee', dmg: 25, range: 2, windup: 0.5, cooldown: 2.5, knockback: 4 },
    scan: { dur: 20, cooldown: 25 },
    hitzones: [
      { name: 'core', x: 0, z: 0, y: 1.4, r: 0.4, mul: 3.0, armor: 0, exposedWhen: 'scanning' },
      { name: 'plate_front', x: 0, z: 0.75, r: 0.4, armor: 0.6, hp: 70, lootOnBreak: [['ark_alloy', 0.6, 1, 1]] },
      { name: 'plate_rear', x: 0, z: -0.75, r: 0.4, armor: 0.6, hp: 70, lootOnBreak: [['ark_alloy', 0.6, 1, 1]] },
      { name: 'plate_side', x: 0.75, z: 0, r: 0.4, armor: 0.6, hp: 70, mirrorX: true, lootOnBreak: [['ark_performance_steel', 0.3, 1, 1]] },
    ],
    loot: [ ['ark_powercell', 0.5, 1, 2], ['ark_alloy', 0.6, 1, 2], ['mechanical_components', 0.35, 1, 1],
            ['advanced_ark_powercell', 0.2, 1, 1], ['ark_circuitry', 0.2, 1, 1], ['ark_coolant', 0.15, 1, 1],
            ['ark_motion_core', 0.15, 1, 1], ['ark_performance_steel', 0.15, 1, 1], ['sensors', 0.2, 1, 1],
            ['surveyr_vault', 0.45, 1, 1] ],
    xp: 200, xpLoot: 300, xpPart: 100, threat: 3, color: '#f0ece0',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor' },
    desc: 'Armoured rolling scanner that stops to upload your personal data, core exposed. It hears you coming, slams shut and outruns your sprint. Stun it or ambush it mid-upload.',
  },

  shreddr: {
    name: 'Close Talker', model: 'fireball', modelScale: 2.0,
    hp: 400, armor: 0.65, explosiveMul: 1.5, flying: false, hover: true, height: 2.2, radius: 0.9, speed: 4.2, turnRate: 220,
    size: { radius: 0.9, height: 2.2 },
    behavior: 'shredder',
    vision: { range: 18, fov: 120, hearing: 22, alertTime: 0.4, lose: 8 },
    attack: { kind: 'bullets', dmg: 6, pellets: 10, spread: 360, burst: 3, range: 9, projSpeed: 40,
              windup: 0.4, cooldown: 2.2 },
    abilities: [
      { name: 'personal_space_violation', kind: 'explode', dmg: 40, radius: 7, cone: 120, windup: 1.6, cooldown: 9, telegraph: 'screech' },
    ],
    hitzones: [
      { name: 'thruster', x: 0.45, z: -0.65, r: 0.3, mul: 2.2, hp: 90, mirrorX: true, arc: 160, dir: 180, onBreak: 'stagger' },
      { name: 'side_jet', x: 0.85, z: 0, r: 0.25, mul: 1.6, hp: 60, mirrorX: true, onBreak: 'slow' },
      { name: 'head', x: 0, z: 0.6, r: 0.4, armor: 0.7, hp: 160 },
      { name: 'body', x: 0, z: 0, r: 0.7, armor: 0.65 },
    ],
    loot: [ ['ammo_shotgun', 0.7, 6, 14], ['ark_powercell', 0.45, 1, 1], ['ark_alloy', 0.5, 1, 2],
            ['mechanical_components', 0.35, 1, 1], ['simple_gun_parts', 0.3, 1, 1],
            ['ark_synthetic_resin', 0.12, 1, 1], ['ark_thermo_lining', 0.12, 1, 1], ['shreddr_gyro', 0.45, 1, 1] ],
    xp: 200, xpLoot: 250, threat: 5, color: '#9aa0ff',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'indoor' },
    desc: 'Hovers into your personal space, sprays shrapnel everywhere and charges a cone blast. Fight it round corners and doorways; its blue rear thrusters are the weak spot.',
  },

  // ------------------------------------------------------------------ heavies
  rocketier: {
    name: 'Rocket Surgeon', model: 'rocketeer', modelScale: 1,
    hp: 1100, armor: 0.55, explosiveMul: 1.3, flying: true, height: 5, radius: 1.6, speed: 3.2, turnRate: 90,
    size: { radius: 1.6, height: 1.6, length: 3.0, width: 3.0 },
    behavior: 'rocketeer',
    vision: { range: 36, fov: 70, hearing: 24, alertTime: 1.0, lose: 20 },
    attack: { kind: 'rocket', dmg: 38, radius: 3, burst: 4, range: 45, projSpeed: 24, windup: 1.6,
              cooldown: 5, telegraph: 'converge' },
    hitzones: [
      { name: 'thruster', x: 1.15, z: 0.95, r: 0.4, mul: 1.6, armor: 0.2, hp: 220, mirrorX: true, mirrorZ: true,
        onBreak: 'stagger', lootOnBreak: [['ark_alloy', 0.6, 1, 2], ['rocketier_driver', 0.15, 1, 1]] },
      { name: 'rocket_pod', x: 1.0, z: 0.1, r: 0.45, armor: 0.4, hp: 260, mirrorX: true, onBreak: 'disarm' },
      { name: 'eyebrow', x: 0, z: 0.9, r: 0.45, armor: 0.7, hp: 120 },
      { name: 'scanner', x: 0, z: 0.65, r: 0.35, mul: 2.5, armor: 0, requiresBroken: ['eyebrow'] },
      { name: 'back_canister', x: 0, z: -1.0, r: 0.35, mul: 2.0, arc: 140, dir: 180 },
      { name: 'hull', x: 0, z: 0, r: 1.0, armor: 0.55 },
    ],
    fallAfter: 2, fallDamage: 600,
    loot: [ ['ark_powercell', 0.5, 1, 2], ['ark_alloy', 0.6, 1, 3], ['electrical_components', 0.4, 1, 2],
            ['advanced_ark_powercell', 0.25, 1, 1], ['ark_circuitry', 0.25, 1, 1], ['ark_motion_core', 0.2, 1, 1],
            ['heavy_gun_parts', 0.2, 1, 1], ['ammo_launcher', 0.2, 2, 4], ['rocketier_driver', 0.55, 1, 1] ],
    xp: 500, xpLoot: 600, xpPart: 500, threat: 6, color: '#e04a30',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor' },
    desc: 'Rocket gunship, no medical licence. When its four yellow lasers turn red a salvo follows: find real cover. Two thrusters down and it falls; crack the brow plate to hit the scanner.',
  },

  vaporiser: {
    name: 'Vape Lord', model: 'rocketeer', modelScale: 1.15,
    hp: 1500, armor: 0.4, flying: true, height: 5, radius: 1.7, speed: 3.2, turnRate: 80,
    size: { radius: 1.7, height: 1.6, length: 3.2, width: 3.2 },
    behavior: 'rocketeer', variant: 'laser',
    vision: { range: 36, fov: 70, hearing: 24, alertTime: 1.0, lose: 20 },
    attack: { kind: 'laser', dmg: 22, range: 36, dur: 2.5, windup: 1.2, cooldown: 5, beam: true,
              telegraph: 'laser', leavesFire: { dps: 6, dur: 6, radius: 1.2 } },
    abilities: [
      { name: 'cloud_cover', kind: 'shield', dur: 6, cooldown: 18, radius: 2.5, trigger: 'thrown_object', blocks: 'projectiles' },
    ],
    hitzones: [
      { name: 'thruster', x: 1.2, z: 1.0, r: 0.4, mul: 1.5, armor: 0.2, hp: 260, mirrorX: true, mirrorZ: true, onBreak: 'stagger' },
      { name: 'belly_panel', x: 0, z: 0, r: 0.5, armor: 0.6, hp: 140, onBreak: 'expose' },
      { name: 'core', x: 0, z: 0, r: 0.45, mul: 3.0, armor: 0, requiresBroken: ['belly_panel'] },
      { name: 'hull', x: 0, z: 0, r: 1.1, armor: 0.4 },
    ],
    fallAfter: 2, fallDamage: 700,
    loot: [ ['ark_powercell', 0.5, 1, 2], ['ark_alloy', 0.6, 1, 3], ['electrical_components', 0.4, 1, 2],
            ['advanced_ark_powercell', 0.3, 1, 1], ['ark_circuitry', 0.25, 1, 1], ['ark_flex_rubber', 0.2, 1, 1],
            ['ammo_energy', 0.3, 2, 5], ['heavy_gun_parts', 0.2, 1, 1], ['vaporiser_regulator', 0.55, 1, 1] ],
    xp: 500, xpLoot: 600, xpPart: 500, threat: 7, color: '#60f0ff',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor' },
    desc: 'Laser gunship that leaves the ground burning. Throw anything at it and it hides in a shield cloud: bait the shield, unload during the cooldown, pop the belly panel for the core.',
  },

  leapr: {
    name: 'Parkour Dad', model: 'leaper', modelScale: 1,
    hp: 1100, armor: 0.4, explosiveMul: 1.6, flying: false, height: 2.6, radius: 1.8, speed: 3.4, turnRate: 140,
    size: { radius: 1.8, height: 2.6, length: 3.6, width: 3.6 },
    behavior: 'leaper',
    vision: { range: 26, fov: 100, hearing: 26, alertTime: 0.7, lose: 12 },
    attack: { kind: 'leap', dmg: 55, radius: 3.5, range: 18, windup: 0.9, cooldown: 4.5, airTime: 0.9,
              tracking: 0.8, exposedAfter: 1.5 },
    abilities: [
      { name: 'dad_stomp', kind: 'shock', dmg: 20, radius: 5, windup: 0.8, cooldown: 6, knockback: 6, when: 'close' },
    ],
    hitzones: [
      { name: 'leg', x: 1.35, z: 1.35, r: 0.45, mul: 1.6, armor: 0.2, hp: 160, mirrorX: true, mirrorZ: true,
        onBreak: 'slow', lootOnBreak: [['ark_performance_steel', 0.35, 1, 1], ['ark_alloy', 0.5, 1, 1]] },
      { name: 'eye_plate', x: 0, z: 1.45, r: 0.35, armor: 0.8, hp: 30 },
      { name: 'eye', x: 0, z: 1.4, r: 0.3, mul: 3.0, armor: 0, requiresBroken: ['eye_plate'], onBreak: 'blind' },
      { name: 'core', x: 0, z: 0, r: 0.7, mul: 2.5, armor: 0, exposedWhen: 'landed' },
      { name: 'frame', x: 0, z: 0, r: 1.2, armor: 0.4 },
    ],
    slowPerLeg: 0.2, leapDisabledAfter: 2,
    loot: [ ['ark_alloy', 0.6, 1, 3], ['mechanical_components', 0.4, 1, 2], ['advanced_ark_powercell', 0.25, 1, 1],
            ['ark_flex_rubber', 0.2, 1, 1], ['ark_motion_core', 0.2, 1, 1], ['ark_performance_steel', 0.25, 1, 2],
            ['explosive_compound', 0.2, 1, 1], ['leapr_pulse_unit', 0.55, 1, 1] ],
    xp: 500, xpLoot: 600, xpPart: 500, threat: 7, color: '#ffb000',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor',
             escorts: [['wazp', 2], ['hornett', 1]] },
    desc: 'Four-legged show-off that leaps onto you and pulses anyone close. Two broken leg joints end the leaping; the core opens briefly after each landing. Too wide for doorways.',
  },

  bastian: {
    name: 'HOA President', model: 'bastion', modelScale: 1,
    hp: 2050, armor: 0.6, explosiveMul: 1.3, flying: false, height: 4, radius: 2.2, speed: 1.8, turnRate: 50, gunTurnRate: 160,
    size: { radius: 2.2, height: 4, length: 4.2, width: 4.0 },
    behavior: 'bastion',
    vision: { range: 32, fov: 90, hearing: 28, alertTime: 1.0, lose: 15 },
    attack: { kind: 'bullets', dmg: 7, rpm: 900, burst: 45, range: 34, projSpeed: 75, spread: 6,
              windup: 1.2, cooldown: 3.5, telegraph: 'screech', firesAtLastKnown: 3 },
    hitzones: [
      { name: 'front_armor', x: 0, z: 1.3, r: 1.3, armor: 0.9, arc: 150, dir: 0 },
      { name: 'leg_joint', x: 1.3, z: 1.2, r: 0.4, mul: 2.0, hp: 220, mirrorX: true, mirrorZ: true, onBreak: 'stagger',
        lootOnBreak: [['ark_alloy', 0.5, 1, 1], ['ark_performance_steel', 0.25, 1, 1]] },
      { name: 'chaingun', x: 1.45, z: 0.5, r: 0.4, armor: 0.5, hp: 280, mirrorX: true, onBreak: 'disarm' },
      { name: 'rear_canister', x: 0, z: -1.35, r: 0.4, mul: 2.5, hp: 180, arc: 150, dir: 180, onBreak: 'expose' },
      { name: 'rear_core', x: 0, z: -1.1, r: 0.5, mul: 4.0, armor: 0, arc: 150, dir: 180, requiresBroken: ['rear_canister'] },
      { name: 'hull', x: 0, z: 0, r: 1.6, armor: 0.6 },
    ],
    loot: [ ['ark_powercell', 0.5, 1, 2], ['ammo_medium', 0.7, 20, 60], ['ark_alloy', 0.7, 2, 4],
            ['mechanical_components', 0.45, 1, 2], ['advanced_ark_powercell', 0.3, 1, 1], ['ark_circuitry', 0.25, 1, 1],
            ['ark_flex_rubber', 0.2, 1, 1], ['ark_motion_core', 0.2, 1, 1], ['ark_performance_steel', 0.3, 1, 2],
            ['medium_gun_parts', 0.25, 1, 1], ['bastian_cell', 0.6, 1, 1] ],
    xp: 500, xpLoot: 250, xpPart: 250, threat: 8, color: '#a0a8b8',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor',
             escorts: [['wazp', 2], ['hornett', 1]] },
    desc: 'Enforces bylaws with a gatling: screeches, then rakes your last position. The front shrugs off everything; flank to the rear canister (core underneath) or shoot the yellow knees.',
  },

  bombardeer: {
    name: 'Shell Company', model: 'bombardier', modelScale: 1,
    hp: 2600, armor: 0.4, explosiveMul: 1.3, flying: false, height: 4.5, radius: 2.2, speed: 1.6, turnRate: 45,
    size: { radius: 2.2, height: 4.5, length: 4.0, width: 4.0 },
    behavior: 'bombardier',
    vision: { range: 40, fov: 80, hearing: 26, alertTime: 1.2, lose: 15, useSpotters: true },
    attack: { kind: 'mortar', dmg: 50, radius: 4.5, burst: 3, range: 75, minRange: 10, flightTime: 2.2,
              windup: 2.0, cooldown: 6, telegraph: 'ground_marker', exposedAfter: 2.0 },
    abilities: [
      { name: 'hostile_restructuring', kind: 'shock', dmg: 25, radius: 6, windup: 1.0, cooldown: 8, knockback: 7, when: 'close' },
    ],
    hitzones: [
      { name: 'leg_joint', x: 1.3, z: 1.3, r: 0.4, mul: 2.0, hp: 240, mirrorX: true, mirrorZ: true, onBreak: 'slow',
        lootOnBreak: [['ark_alloy', 0.5, 1, 1], ['ark_performance_steel', 0.25, 1, 1]] },
      { name: 'rear_canister', x: 0, z: -1.4, r: 0.45, mul: 3.0, hp: 220, arc: 150, dir: 180, onBreak: 'stagger' },
      { name: 'mortar', x: 0, z: 0.2, r: 0.6, armor: 0.6, hp: 400, onBreak: 'disarm' },
      { name: 'hull', x: 0, z: 0, r: 1.4, armor: 0.4 },
    ],
    loot: [ ['ark_powercell', 0.5, 1, 2], ['ark_alloy', 0.7, 2, 4], ['mechanical_components', 0.45, 1, 2],
            ['advanced_ark_powercell', 0.3, 1, 1], ['ark_flex_rubber', 0.2, 1, 1], ['ark_motion_core', 0.2, 1, 1],
            ['ark_performance_steel', 0.3, 1, 2], ['heavy_gun_parts', 0.25, 1, 1], ['ammo_launcher', 0.35, 2, 6],
            ['bombardeer_cell', 0.6, 1, 1] ],
    xp: 500, xpLoot: 300, xpPart: 300, threat: 8, color: '#c87840',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor',
             escorts: [['spottr', 2]] },
    desc: 'Artillery walker that never shows up in person: its Plus Ones mark you, red rings appear, three shells land. Get under a roof, drop the spotters, then hit the canister and knees.',
  },

  turbyne: {
    name: 'Cloud Service', model: 'rocketeer', modelScale: 2.2,
    hp: 4000, armor: 0.85, flying: true, height: 9, radius: 2.8, speed: 2.0, turnRate: 30,
    size: { radius: 2.8, height: 5 },
    behavior: 'rocketeer', variant: 'turbine',
    vision: { range: 40, fov: 360, hearing: 30, alertTime: 1.0, lose: 20 },
    attack: { name: 'scheduled_downtime', kind: 'rocket', dmg: 45, radius: 4, burst: 6, range: 50, projSpeed: 18,
              windup: 1.5, cooldown: 7, effect: { stun: 1.5 } },
    abilities: [
      { name: 'terms_and_conditions', kind: 'mine', count: 8, radius: 8, dmg: 35, cooldown: 60 },
      { name: 'unplanned_outage', kind: 'land', dur: 25, cooldown: 70 },
    ],
    hitzones: [
      { name: 'gear_gap', x: 1.7, z: 1.7, r: 0.6, mul: 3.5, armor: 0, mirrorX: true, mirrorZ: true, exposedWhen: 'landed' },
      { name: 'top', x: 0, z: 0, r: 1.0, mul: 1.2, armor: 0.4 },
      { name: 'shell', x: 0, z: 0, r: 2.6, armor: 0.9 },
    ],
    loot: [ ['ark_alloy', 0.7, 2, 4], ['advanced_ark_powercell', 0.35, 1, 2], ['ark_coolant', 0.25, 1, 2],
            ['ark_flex_rubber', 0.2, 1, 1], ['ark_motion_core', 0.25, 1, 1], ['ark_performance_steel', 0.3, 1, 2],
            ['ark_synthetic_resin', 0.2, 1, 1], ['ark_thermo_lining', 0.2, 1, 1], ['ammo_launcher', 0.35, 2, 6],
            ['medium_gun_parts', 0.25, 1, 1], ['turbyne_compressor', 0.65, 1, 1] ],
    xp: 700, xpLoot: 700, xpPart: 200, threat: 9, color: '#7ab0ff',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate', 'sandy_city'], habitat: 'outdoor', event: true },
    desc: 'Armoured sky-engine with great uptime until it crashes mid-raid. Stun missiles, a minefield, then a landing: only then do its spinning yellow tanks show through the gear gaps.',
  },

  // ------------------------------------------------------------------ bosses
  queene: {
    name: 'The Landlady', model: 'queen', modelScale: 1,
    hp: 15000, armor: 0.5, flying: false, height: 9, radius: 4.5, speed: 1.4, turnRate: 30,
    size: { radius: 4.5, height: 9, length: 9, width: 9 },
    behavior: 'queen',
    vision: { range: 45, fov: 140, hearing: 40, alertTime: 1.0, lose: 30 },
    attack: { name: 'eviction_notice', kind: 'mortar', dmg: 40, radius: 4, burst: [2, 5], range: 70, flightTime: 2,
              fuse: 2, windup: 1.6, cooldown: 7, telegraph: 'ground_marker', leavesFire: { dps: 8, dur: 6, radius: 3 } },
    abilities: [
      { name: 'property_line', kind: 'laser', dmg: 30, range: 50, dur: 2, windup: 1.5, cooldown: 10, beam: true,
        leavesFire: { dps: 6, dur: 5, radius: 1.2 } },
      { name: 'rent_increase', kind: 'melee', dmg: 60, radius: 7, windup: 1.2, cooldown: 8, knockback: 8, when: 'close' },
      { name: 'utilities_shutoff', kind: 'shock', dmg: 10, radius: 10, windup: 1.0, cooldown: 12, when: 'close',
        effect: { stun: 1.5, shieldDrain: 100 } },
    ],
    hitzones: [
      { name: 'plate_front', x: 0, z: 3.1, r: 1.3, armor: 0.8, hp: 900, lootOnBreak: [['ark_alloy', 0.8, 1, 3]] },
      { name: 'plate_rear', x: 0, z: -3.1, r: 1.3, armor: 0.8, hp: 900, lootOnBreak: [['ark_alloy', 0.8, 1, 3]] },
      { name: 'plate_side', x: 3.1, z: 0, r: 1.3, armor: 0.8, hp: 900, mirrorX: true, lootOnBreak: [['ark_performance_steel', 0.6, 1, 2]] },
      { name: 'leg_joint', x: 3.4, z: 3.4, r: 0.55, mul: 2.0, hp: 1200, mirrorX: true, mirrorZ: true, onBreak: 'slow',
        lootOnBreak: [['ark_performance_steel', 0.5, 1, 2], ['magnetic_accelerator', 0.1, 1, 1]] },
      { name: 'head', x: 0, z: 3.8, r: 0.7, mul: 1.8, armor: 0.5, arc: 120, dir: 0 },
      { name: 'core', x: 0, z: 0, r: 1.3, mul: 3.0, armor: 0, exposedWhen: 'plates_broken', platesNeeded: 2 },
      { name: 'carapace', x: 0, z: 0, r: 3.0, armor: 0.5 },
    ],
    loot: [ ['ark_alloy', 0.9, 4, 8], ['advanced_ark_powercell', 0.7, 1, 3], ['advanced_electrical_components', 0.6, 1, 2],
            ['advanced_mechanical_components', 0.6, 1, 2], ['ark_circuitry', 0.6, 1, 3], ['ark_coolant', 0.5, 1, 2],
            ['ark_flex_rubber', 0.5, 1, 2], ['ark_motion_core', 0.5, 1, 2], ['ark_performance_steel', 0.6, 1, 3],
            ['ark_synthetic_resin', 0.5, 1, 2], ['ark_thermo_lining', 0.5, 1, 2], ['complex_gun_parts', 0.45, 1, 2],
            ['magnetic_accelerator', 0.45, 1, 1], ['queene_reactor', 0.55, 1, 1] ],
    xp: 1000, xpLoot: 1000, xpPart: 500, threat: 10, color: '#ff3040',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate'], habitat: 'outdoor', conditionOnly: 'harvester' },
    desc: 'Colossal walker guarding the Juicer, here about the rent. Fire mortars, a sweep laser, slams and EMP underfoot. Break two armour plates to bare the red core; yellow knees slow her.',
  },

  matriark: {
    name: 'Helicopter Mom', model: 'queen', modelScale: 1.15,
    hp: 18000, armor: 0.55, flying: false, height: 10, radius: 5, speed: 1.2, turnRate: 25,
    size: { radius: 5, height: 10, length: 10, width: 10 },
    behavior: 'matriarch',
    vision: { range: 45, fov: 150, hearing: 40, alertTime: 1.0, lose: 30 },
    attack: { name: 'unsolicited_advice', kind: 'rocket', dmg: 32, radius: 3, burst: [3, 6], range: 70, projSpeed: 16,
              homing: 0.6, windup: 1.4, cooldown: 7, firesAtLastKnown: 6 },
    abilities: [
      { name: 'guilt_trip', kind: 'gas', radius: 6, dur: 10, range: 45, cooldown: 14, effect: { staminaDrain: 25 } },
      { name: 'family_photo', kind: 'stun', radius: 8, range: 45, fuse: 1.2, cooldown: 16, effect: { blind: 2.5 } },
      { name: 'smother_dome', kind: 'shield', radius: 9, dur: 20, cooldown: 60, blocks: 'outside_projectiles' },
      { name: 'carpool', kind: 'summon', cooldown: 45, groups: [ [['wazp', 3]], [['hornett', 2], ['fyrefly', 1]], [['rocketier', 1]], [['leapr', 1]] ] },
      { name: 'because_i_said_so', kind: 'melee', dmg: 45, radius: 4, windup: 0.8, cooldown: 5, when: 'close', effect: { knockdown: 2 } },
    ],
    hitzones: [
      { name: 'plate_front', x: 0, z: 3.4, r: 1.4, armor: 0.8, hp: 1000, lootOnBreak: [['ark_alloy', 0.8, 1, 3]] },
      { name: 'plate_rear', x: 0, z: -3.4, r: 1.4, armor: 0.8, hp: 1000, lootOnBreak: [['ark_alloy', 0.8, 1, 3]] },
      { name: 'plate_side', x: 3.4, z: 0, r: 1.4, armor: 0.8, hp: 1000, mirrorX: true, lootOnBreak: [['ark_performance_steel', 0.6, 1, 2]] },
      { name: 'missile_pod', x: 1.6, z: -2.6, r: 0.7, armor: 0.5, hp: 900, mirrorX: true, onBreak: 'disarm' },
      { name: 'leg_joint', x: 3.8, z: 3.8, r: 0.6, mul: 2.0, hp: 1300, mirrorX: true, mirrorZ: true, onBreak: 'slow',
        lootOnBreak: [['ark_performance_steel', 0.5, 1, 2], ['magnetic_accelerator', 0.1, 1, 1]] },
      { name: 'head', x: 0, z: 4.2, r: 0.8, mul: 1.8, armor: 0.5, arc: 120, dir: 0 },
      { name: 'core', x: 0, z: 0, r: 1.4, mul: 3.0, armor: 0, exposedWhen: 'plates_broken', platesNeeded: 2 },
      { name: 'carapace', x: 0, z: 0, r: 3.4, armor: 0.55 },
    ],
    loot: [ ['ark_alloy', 0.9, 4, 8], ['advanced_ark_powercell', 0.7, 1, 3], ['advanced_electrical_components', 0.6, 1, 2],
            ['advanced_mechanical_components', 0.6, 1, 2], ['ark_circuitry', 0.6, 1, 3], ['ark_coolant', 0.5, 1, 2],
            ['ark_flex_rubber', 0.5, 1, 2], ['ark_motion_core', 0.5, 1, 2], ['ark_performance_steel', 0.6, 1, 3],
            ['ark_synthetic_resin', 0.5, 1, 2], ['ark_thermo_lining', 0.5, 1, 2], ['complex_gun_parts', 0.45, 1, 2],
            ['magnetic_accelerator', 0.45, 1, 1], ['matriark_reactor', 0.55, 1, 1] ],
    xp: 1000, xpLoot: 1000, xpPart: 500, threat: 10, color: '#d020ff',
    spawn: { group: [1, 1], maps: ['damn_grounds', 'green_gate'], habitat: 'outdoor', conditionOnly: 'matriarch' },
    desc: 'Not angry, just disappointed. And armed. Homing missiles, gas and flash capsules, a dome only shots from inside can pierce, endless kids. Strip two plates, then hit the core.',
  },
};

// Static ARK wrecks & landers: breachable loot containers (not hostile). Map/loot code places
// these; `breach.alarm` lets them call ARK when opened (Probe / Assessor), `electrified` is the
// chance to shock the looter during the Husk Graveyard condition.
export const ARK_HUSKS = {
  wazp_husk: {
    name: 'Buzzkill Husk', model: 'wasp', modelScale: 1, radius: 0.7, height: 0.6, color: '#7a6a50',
    breach: { time: 3, noise: 30 }, electrified: 0.25, xp: 400,
    loot: [ ['ark_alloy', 0.7, 1, 2], ['ark_powercell', 0.5, 1, 2], ['advanced_ark_powercell', 0.1, 1, 1],
            ['ark_circuitry', 0.15, 1, 1], ['ark_coolant', 0.15, 1, 1], ['ark_flex_rubber', 0.12, 1, 1],
            ['ark_performance_steel', 0.12, 1, 1], ['ark_thermo_lining', 0.12, 1, 1],
            ['damaged_wazp_driver', 0.35, 1, 1], ['ammo_light', 0.6, 10, 30], ['wazp_driver', 0.2, 1, 1] ],
    desc: 'A Buzzkill that finally killed its own buzz. Pry it open for parts; during Mass Layoffs, mind the sparks.',
  },
  rocketier_husk: {
    name: 'Rocket Surgeon Husk', model: 'rocketeer', modelScale: 1, radius: 1.6, height: 1.4, color: '#7a5040',
    breach: { time: 5, noise: 40 }, electrified: 0.25, xp: 700,
    loot: [ ['advanced_ark_powercell', 0.25, 1, 1], ['ark_alloy', 0.8, 1, 3], ['ark_coolant', 0.3, 1, 2],
            ['ark_powercell', 0.5, 1, 2], ['ark_thermo_lining', 0.2, 1, 1], ['damaged_rocketier_driver', 0.35, 1, 1],
            ['ammo_launcher', 0.4, 1, 5], ['rocketier_driver', 0.2, 1, 1] ],
    desc: 'Downed Rocket Surgeon, malpractice confirmed. The pods are still half full.',
  },
  barron_husk: {
    name: 'Legacy System', model: 'bastion', modelScale: 1.6, radius: 3.5, height: 5, color: '#6a6a70',
    breach: { time: 6, noise: 45 }, electrified: 0.4, xp: 500,
    loot: [ ['advanced_ark_powercell', 0.3, 1, 1], ['ark_alloy', 0.9, 2, 10], ['ark_circuitry', 0.35, 1, 2],
            ['ark_coolant', 0.4, 1, 3], ['ark_flex_rubber', 0.3, 1, 2], ['ark_motion_core', 0.25, 1, 1],
            ['ark_performance_steel', 0.4, 1, 2], ['ark_powercell', 0.5, 1, 3], ['ark_synthetic_resin', 0.3, 1, 2],
            ['ark_thermo_lining', 0.3, 1, 2], ['burned_ark_circuitry', 0.4, 1, 2], ['damaged_ark_motion_core', 0.3, 1, 1],
            ['damaged_ark_powercell', 0.4, 1, 2], ['degraded_ark_rubber', 0.4, 1, 2], ['dried_out_ark_resin', 0.4, 1, 2],
            ['impure_ark_coolant', 0.4, 1, 2], ['rusty_ark_steel', 0.4, 1, 2], ['tattered_ark_lining', 0.4, 2, 3] ],
    desc: 'Towering war machine from the Beta Test, long dead and never decommissioned. Its guts are a scrapper\'s paradise.',
  },
  ark_probe: {
    name: 'Customer Survey', model: 'sentinel', modelScale: 0.7, radius: 1.0, height: 2.5, color: '#40c0ff',
    breach: { time: 8, noise: 60, alarm: { radius: 45, waves: [ [['wazp', 2]], [['hornett', 1], ['wazp', 1]] ] } },
    panels: 3, crashedPanels: 1, xp: 700,
    loot: [ ['ark_powercell', 0.7, 1, 2], ['ark_alloy', 0.7, 1, 3], ['ark_circuitry', 0.35, 1, 2],
            ['ark_motion_core', 0.3, 1, 1], ['ark_synthetic_resin', 0.3, 1, 1] ],
    desc: 'Sample-collecting lander. Breach it and it screams for help; three panels open when it powers down. Your feedback is important to it.',
  },
  ark_courier: {
    name: 'Next-Day Delivery', model: 'surveyor', modelScale: 1.2, radius: 1.1, height: 1.6, color: '#40e0c0',
    breach: { time: 6, noise: 45 }, electrified: 0.25, xp: 700,
    loot: [ ['advanced_ark_powercell', 0.25, 1, 1], ['ark_alloy', 0.7, 1, 2], ['ark_circuitry', 0.35, 1, 1],
            ['ark_motion_core', 0.3, 1, 1], ['ark_powercell', 0.6, 1, 2], ['burned_ark_circuitry', 0.3, 1, 1],
            ['damaged_ark_motion_core', 0.25, 1, 1], ['damaged_hornett_driver', 0.25, 1, 1], ['damaged_wazp_driver', 0.25, 1, 1],
            ['fyreball_burner', 0.15, 1, 1], ['hornett_driver', 0.15, 1, 1], ['popp_trigger', 0.15, 1, 1],
            ['sentinal_firing_core', 0.15, 1, 2], ['spottr_relay', 0.15, 1, 2], ['surveyr_vault', 0.12, 1, 1],
            ['vaporiser_regulator', 0.06, 1, 1] ],
    desc: 'Parts courier hauling broken ARK bits out and fresh ones in, usually stuffed with unique cores. Nobody was home to sign for it.',
  },
  ark_assessor: {
    name: 'Tax Assessor', model: 'sentinel', modelScale: 1.0, radius: 2.0, height: 3, color: '#ffe040',
    breach: { time: 10, noise: 70, pylons: 4, ejectAfter: 300,
              alarm: { radius: 50, waves: [ [['vaporiser', 1]], [['rocketier', 1]], [['fyrefly', 2]], [['hornett', 2], ['wazp', 2]] ] } },
    xp: 200,
    loot: [ ['ark_powercell', 0.6, 1, 2], ['ark_alloy', 0.7, 1, 3], ['advanced_ark_powercell', 0.35, 1, 1],
            ['advanced_electrical_components', 0.25, 1, 1], ['ark_circuitry', 0.3, 1, 2], ['ark_coolant', 0.3, 1, 2],
            ['ark_flex_rubber', 0.25, 1, 1], ['ark_motion_core', 0.25, 1, 1], ['ark_performance_steel', 0.3, 1, 2],
            ['ark_synthetic_resin', 0.25, 1, 1], ['ark_thermo_lining', 0.25, 1, 1], ['assessr_matrix', 0.5, 1, 1] ],
    desc: 'Audit Season lander with four pumping pylons. Breach a pylon while its platform is out, then brace for the squadron it bills you for.',
  },
  deforestr_husk: {
    name: 'Hedge Fund', model: 'bastion', modelScale: 1.8, radius: 4, height: 5, color: '#5a7050',
    breach: { time: 0, puzzle: 'powercells', powercells: 2, noise: 20 }, xp: 200,
    maps: ['green_gate'],
    loot: [ ['advanced_ark_powercell', 0.4, 1, 1], ['advanced_electrical_components', 0.5, 1, 3],
            ['advanced_mechanical_components', 0.45, 1, 2], ['ark_circuitry', 0.6, 3, 4], ['ark_coolant', 0.5, 2, 3],
            ['ark_flex_rubber', 0.3, 1, 2], ['ark_motion_core', 0.3, 1, 1], ['ark_performance_steel', 0.35, 1, 2],
            ['ark_powercell', 0.6, 1, 4], ['ark_synthetic_resin', 0.3, 1, 2], ['impure_ark_coolant', 0.4, 2, 3] ],
    desc: 'Felled forest-clearing giant near Green Gate; it cut every hedge and kept the money. Feed it two powercells and time your way past the fire vents to the loot chamber.',
  },
};

// Convenience: ids grouped by role (spawners / map authors).
export const ARK_GROUPS = {
  small: ['tikk', 'popp', 'fyreball', 'komet'],
  drones: ['wazp', 'hornett', 'fyrefly', 'snytch', 'spottr'],
  emplacements: ['turrett', 'sentinal'],
  medium: ['surveyr', 'shreddr'],
  heavy: ['rocketier', 'vaporiser', 'leapr', 'bastian', 'bombardeer', 'turbyne'],
  bosses: ['queene', 'matriark'],
};

// Internal (never player-facing) aliases: archetype / model-builder keys -> ARK ids above, so map
// code and engine keys like 'wasp' or 'sentinel' resolve to the defs here.
export const ARK_ALIAS = {
  tick: 'tikk', pop: 'popp', fireball: 'fyreball', comet: 'komet', wasp: 'wazp', hornet: 'hornett',
  firefly: 'fyrefly', snitch: 'snytch', spotter: 'spottr', turret: 'turrett', sentinel: 'sentinal',
  surveyor: 'surveyr', rollbot: 'surveyr', shredder: 'shreddr', rocketeer: 'rocketier', vaporizer: 'vaporiser',
  leaper: 'leapr', bastion: 'bastian', bombardier: 'bombardeer', turbine: 'turbyne', queen: 'queene',
  matriarch: 'matriark',
};
