# DarkRaiders – architecture & content schema

Top-down 2.5D extraction roguelite in the browser — an unofficial parody of ARC Raiders.
Pure ES modules, **no build step**. Three.js (vendored in `/vendor`) renders a pixel-3D voxel
world at low resolution (≈640×360) in an oblique SNES-style 3/4 projection; post-process quantises
to 15-bit colour with ordered dithering. PeerJS (vendored) provides host-authoritative co-op.

Serve the repo root with any static server (`npx http-server .`) and open `index.html`.

## Directory layout

```
index.html            entry page
src/main.js           boot, screen router
src/engine/           renderer, textures, voxel builder, models, materials, lighting, fx, world
src/game/             simulation (host), entities, AI, combat, loot, raid flow, client view
src/data/             content tables (pure data, no DOM, no three.js imports)
src/maps/             one module per map + shared map helpers
src/net/              PeerJS transport, lobby + raid protocol
src/ui/               HUD (canvas), menus/hub screens (DOM), pixel font, icons
src/audio/            WebAudio music sequencer + synthesized SFX
vendor/               three.module.js, three.core.js, peerjs.min.js
docs/                 this file, the map-building guide, per-map design notes (docs/maps/)
```

## Naming & writing policy (IMPORTANT for all content)

DarkRaiders is a **parody**: it evokes ARC Raiders and pokes fun at it and at extraction shooters in
general, but its expressive content is its own. Rules for anything a player can read or see:
* Coined / proper names are **jokes, never misspellings** of the original (`Desperanza` the hub, the
  `Narc` drone that calls reinforcements, the `Teapot` rifle, `Auntie Synergy` the trader). A pun that
  winks at the original is fine as long as it is clearly a joke.
* Flavour text is written from scratch in the house voice: deadpan, PG-13, punching up at landlords,
  corporations, the grind and our own gamer habits. Running gag: the ARK (*Autonomous Repossession
  Konglomerate — the K was a branding decision*) are repossessing the planet. Descriptions stay short and
  still carry the gameplay information (weak spots, what an item is for, what a skill does).
* Plain generic English names stay plain where clarity matters (Bandage, Metal Parts, Wires, Silencer II).
* Maps are our own layouts (see `docs/maps/`), never traced from reference images.
* **Internal ids never change** once shipped (item, ARK, quest, trader, map, POI, condition and skill
  ids) — saves and co-op depend on them. Several ids predate the parody pass and still spell the old
  placeholder names (`wazp`, `kettel`, `damn_grounds`); they are internal only and must not be renamed.

## Coordinates & units

* 1 world unit = 1 metre. `x` east, `z` south, `y` up. Maps live in `[0,W]×[0,H]`.
* Angles: radians, `facing = 0` means looking toward +z (south / toward camera), `atan2(dx, dz)`.
* Times in seconds, speeds in m/s, damage in HP. Player base HP 100, shields add a separate pool.

## Data tables (`src/data/*.js`)

All tables are plain exported objects/arrays. No imports except other data files.

### Rarity
`'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'`

### `items.js` → `export const ITEMS = { [id]: Item }`

Common fields on every item:
```js
{
  name: 'Maraca', type: 'weapon', rarity: 'common',   // id stays `rattlr`
  weight: 6.0,          // kg
  stack: 1,             // max stack size
  value: 1500,          // sell price in coins (Raider tokens = "Scrip")
  desc: 'Short flavour + function text.',
  icon: 'gun_rifle',    // icon id (see ui/icons) – may be a generic family id
  recycle: { metal_parts: 4, simple_gun_parts: 1 },   // output of recycling at Desperanza (optional)
  tags: ['arc_part', 'electrical', ...],               // optional search/sort tags
}
```
`type` is one of: `weapon, ammo, consumable, grenade, gadget, trap, augment, shield, mod, material,
valuable, key, blueprint, quest, trinket`.

Type-specific blocks:

* **weapon**: `weapon: { class, ammo, dmg, rpm, mag, reload, range, spread, adsSpread, recoil,
  projSpeed, pellets, mode, burst?, chargeTime?, armorPen, headMul, noise, moveMul, handling,
  tiers: [ { tier: 2, cost: {itemId: qty}, mods: { dmg: 1.1, reload: 0.9, mag: 1.2 } }, … ] }`
  * `class`: `pistol | smg | assault_rifle | battle_rifle | lmg | shotgun | marksman | sniper | launcher | energy`
  * `ammo`: `ammo_light | ammo_medium | ammo_heavy | ammo_shotgun | ammo_energy | ammo_launcher`
  * `mode`: `auto | semi | burst | bolt | pump | lever | beam | charge | launcher`
  * `range` = effective range (m) before damage falloff; `spread`/`adsSpread` degrees; `recoil` 0..3;
    `armorPen` 0..1 vs ARK armour; `noise` metres of hearing radius; `moveMul` speed while held.
  * Weapons go up to tier IV; `tiers` lists upgrades II–IV.
* **ammo**: `ammo: { per: 1 }` (stack ≈ 60–120).
* **consumable**: `use: { time, heal?, healOverTime?: {amount, dur}, shield?, stamina?, effect?: 'adrenaline'|'cleanse'|'revive'|'cloak'|… , dur? }`
* **grenade / trap / gadget**: `throw: { kind, fuse, radius, dmg, dur?, … }` where kind ∈
  `frag | impact | sticky | smoke | fire | gas | stun | lure | noise | trigger | mine_explosive | mine_jolt | wolfpack | tagging | barricade | flare | zipline_skip`.
* **augment**: `augment: { backpack, weightLimit, quick, safe, weaponSlots, shields: ['light','medium'], extra?: { grenade?: n, healing?: n, trap?: n }, perk?: string }`
* **shield**: `shield: { cls: 'light'|'medium'|'heavy', capacity, mitigation /*0..1 of incoming dmg absorbed*/, moveMul }`
* **mod**: `mod: { slot: 'muzzle'|'underbarrel'|'mag'|'stock'|'tech', fits: [weaponClass…], stats: { spread: 0.85, recoil: 0.8, mag: 1.5, reload: 0.9, noise: 0.5, … } }`
* **material**: `material: { tier: 'basic'|'refined'|'arc'|'nature'|'topside'|'advanced' }`
* **valuable / trinket**: just value (sell fodder, some used in bench upgrades/quests).
* **key**: `key: { map: 'damn_grounds', room: 'control_tower' }` – opens a locked room.
* **blueprint**: `blueprint: 'recipe_id'` – bring it home to permanently learn that recipe.

### `recipes.js` → `export const RECIPES = [ Recipe ]`
```js
{ id: 'craft_rattlr', out: 'rattlr', qty: 1, bench: 'gunsmith', level: 1,
  blueprint: false,           // true → requires the blueprint item to have been learned
  in: { metal_parts: 6, rubber_parts: 4 } }
```
`bench` ∈ `workbench` (basic, always available) `gunsmith gear_bench medical_lab explosives_station utility_station refiner`.
Refiner recipes turn basic materials into refined ones.

### `benches.js` → `export const BENCHES = { [id]: { name, desc, levels: [ { level: 1, cost: {…} }, { level: 2, cost }, { level: 3, cost } ] } }`
plus `export const SCRAPPY = { levels: [ { level, cost, yields: [[itemId, min, max], …] } ] }` (Nugget, the workshop rooster that scavenges between raids).

### `arc.js` → `export const ARK = { [id]: ArkDef }`
```js
{ name: 'Buzzkill', hp: 90, flying: true,   // id `wazp`
  height: 2.2, radius: 0.6, speed: 5,
  behavior: 'drone_gunner',          // see behaviours below
  vision: { range: 24, fov: 70 /*deg full cone*/, hearing: 18, alertTime: 0.8 },
  attack: { kind: 'bullets'|'rocket'|'laser'|'mortar'|'flame'|'shock'|'explode'|'leap'|'melee',
            dmg, rpm?, burst?, range, projSpeed?, radius?, windup? },
  armor: 0.0,                        // default damage reduction (0..0.9)
  hitzones: [ { name: 'rotor', x: 0.45, z: 0.45, r: 0.25, mul: 1.6, hp: 25, mirrorX: true, mirrorZ: true, onBreak: 'stagger'|'fall'|'slow'|'disarm' },
              { name: 'front_plate', x: 0, z: 0.5, r: 0.4, armor: 0.85, arc: 90 /*only hits from this side*/ },
              { name: 'rear_vent', x: 0, z: -0.6, r: 0.3, mul: 3.0 } ],
  loot: [ ['wazp_driver', 0.55, 1, 1], ['ark_alloy', 0.8, 1, 2] ],   // [item, chance, min, max]
  xp: 40, threat: 1, desc: '…' }
```
Behaviours implemented by the engine: `drone_gunner` (Wasp), `drone_heavy` (Hornet: front armour),
`tick` (leaps & latches), `pop` (rolls to target & explodes), `fireball` (rolls, opens, flames),
`snitch` (scouts, calls reinforcements), `surveyor` (rolling scanner, flees, high loot),
`sentinel` (fixed long-range laser with telegraph), `turret` (fixed MG), `rocketeer` (flying rocket pods),
`leaper` (big jumping walker), `bastion` (heavy walker, armoured front, weak back),
`bombardier` (artillery walker + spotter), `spotter` (marks targets for bombardier),
`shredder`, `matriarch`, `queen` (bosses).
Top-down adaptation: weak points are expressed with `hitzones` positioned in the ARK's local
frame (x right, z forward) and optionally restricted to an attack `arc` so flanking matters.

### `skills.js` → `export const SKILL_TREE = { branches: { conditioning, mobility, survival }, nodes: { [id]: Node } }`
```js
{ name: 'Used To The Wait', branch: 'conditioning', row: 0 /*0 = root*/, col: 1,
  ranks: 5, requires: ['parent_id'], branchPoints: 0 /*points needed in branch*/,
  desc: '+{v}% stamina regeneration per rank.',
  effects: [ { stat: 'stamina_regen', per: 0.04 } ],          // additive per rank (fraction or absolute as per stat)
  capstone: false }
```
Only the canonical stat keys below may be used. The end of each branch may be deliberately
**overpowered** (user request: "less worried about PvP balance").

### Canonical stat keys (skills, augments, perks)
```
max_hp, max_stamina, stamina_regen, sprint_cost, sprint_speed, move_speed, crouch_speed,
dodge_cost, dodge_distance, carry_weight, backpack_slots, safe_slots, quick_slots,
loot_speed, search_reveal, extra_loot_chance, rare_loot_chance, scrap_yield,
heal_amount, heal_speed, shield_capacity, shield_regen, shield_recharge_speed,
damage_reduction, explosive_resist, fall_resist, downed_hp, downed_crawl_speed, revive_speed,
self_revive, noise_mul, footstep_mul, arc_detect_mul /*lower = harder to see*/, arc_damage,
weapon_damage, headshot_mul, reload_speed, ads_speed, recoil_mul, spread_mul, melee_damage,
breach_speed, grenade_radius, grenade_capacity, xp_gain, coin_gain, in_raid_crafting,
extraction_speed, cone_vision_range /*how far player sees enemy cones*/, mark_duration
```

### `quests.js` → `export const QUESTS = [ Quest ]`
```js
{ id: 'first_steps', giver: 'celesta', name: '…', desc: '…', requires: [],
  steps: [ { kind: 'kill', target: 'wazp', count: 3, map?: 'damn_grounds' },
           { kind: 'loot', item: 'fabric', count: 5 },
           { kind: 'visit', map: 'damn_grounds', poi: 'control_tower' },
           { kind: 'extract', map?: 'sandy_city' },
           { kind: 'deliver', item: 'wazp_driver', count: 2 },
           { kind: 'search', container: 'medical_bag', count: 3 } ],
  rewards: { xp: 1500, coins: 2000, items: { bandage: 3 }, blueprint?: 'craft_x' } }
```

### `traders.js` → `export const TRADERS = { [id]: { name, title, desc, color, sells: [ { item, price, stock, unlock?: questId } ], buys: 'all'|[types] } }`
Traders (id → name): `celesta` Auntie Synergy (quests, general), `shanni` Sergeant Shaky (security / shields &
augments), `tien_wen` Wen Ever (gunsmith), `apolo` Kaboomer (explosives & gadgets), `lantz` Doc Reboot (medic). Sell prices ≈ 2.5–4× item `value`.

### `conditions.js` → `export const CONDITIONS = { [id]: { name, desc, time?: 'night'|…, weather?: …, effects: {…} } }`
Examples: night_raid, em_storm (lightning + ARK disruption), lush_blooms, uncovered_caches,
husk_graveyard, prospecting_probes, harvester (Queen), matriarch, cold_snap, hurricane, close_scrutiny,
locked_gate (Green Gate).

## Engine contracts (summary – see source for details)

* `World` (`src/engine/world.js`) builds the static level from map code: heightfield terrain,
  terrain paint, water, buildings (walls/doors/windows/fading roofs), blocks, props, lamps, and
  gameplay markers (POIs, extracts, hatches, spawns, containers, ARK spawn zones, key rooms).
* `Grid` holds collision/occlusion at 0.5 m; `ray()` / `los()` are 2.5D (respect heights).
* Lights are game-side 2D-occluded lights (raymarched against the occlusion grid) – ARK "gaze"
  is a coloured spot light; `engine/cones.js` draws the matching traced wash with soft side-edge
  outlines (no arc line) that share the light's distance falloff. Colour follows awareness via
  `coneColor(state, vis)`: cool white (idle) → yellow/orange (suspicious/search) → red (alert).
* Simulation is host-authoritative and deterministic per seed for static content; only dynamic
  state is replicated over the network.
