# Items / recipes / benches / traders – research notes

Content tables: `src/data/items.js`, `recipes.js`, `benches.js`, `traders.js`.
Totals: **488 items**, **156 recipes**, 7 benches + Scrappie, 5 traders.

## Sources

* Community wiki **arcraiders.wiki** (ARC Raiders 1.x), read through the MediaWiki API
  (`/w/api.php?action=query&prop=revisions` batch-fetching all ~1080 main-namespace pages as wikitext).
  Data was parsed from the page templates:
  * `Infobox item` (rarity, weight, sell price, stack size, heal/shield/duration/radius/damage/stun stats),
    `Infobox weapon` (ammo, firing mode, damage, mag, fire-rate stat, range stat, headshot multiplier,
    stability/agility/stealth, ARK armour penetration, durability, sell price per tier),
    `Infobox mod`, `Infobox augment`, `Infobox shield`, `Infobox blueprint`.
  * `Crafting` (ingredients, station + level, blueprint required, in-inventory crafting),
    `Weapon upgrades` (tier II–IV costs and perks), `Recycling table` (recycle outputs).
  * Pages: Weapons, Ammo, Workshop (bench unlocks and upgrade costs), Scrappy (levels, upgrade items,
    yield tables), Blueprints, Celeste / Shani / Tian Wen / Apollo / Lance (trader stock + prices),
    individual key pages (rooms), Augments, Quick Use, Healing, Grenades, Traps.
* Generator scripts live outside the repo (scratchpad); the JS files are the source of truth now.

## Global renames

| Original | DarkRaiders |
|---|---|
| ARC (machines, in all player text) | ARK |
| Speranza | Speranzia |
| Dam Battlegrounds / Buried City / The Blue Gate | Dam Grounds / Sandy City / Green Gate (`damn_grounds`, `sandy_city`, `green_gate`) |
| Celeste / Shani / Tian Wen / Apollo / Lance | Celesta / Shanni / Tien Wen / Apolo / Lantz (`celesta`, `shanni`, `tien_wen`, `apolo`, `lantz`) |
| Scrappy | Scrappie |
| J Kozma Ventures (JKV) building | "Space Travel" building |

**ARK unit names used in item names/descs** (the `arc.js` author should use the same spellings/ids):
Wasp→**Wazp**, Hornet→**Hornett**, Tick→**Tikk**, Pop→**Popp**, Fireball→**Fyreball**, Firefly→**Fyrefly**,
Snitch→**Snytch**, Spotter→**Spottr**, Comet→**Komet**, Sentinel→**Sentinal**, Surveyor→**Surveyr**,
Shredder→**Shreddr**, Leaper→**Leapr**, Rocketeer→**Rocketier**, Bastion→**Bastian**, Bombardier→**Bombardeer**,
Assessor→**Assessr**, Vaporizer→**Vaporiser**, Turbine→**Turbyne**, Matriarch→**Matriark**, Queen→**Queene**.
ARK drop ids: `wazp_driver`, `damaged_wazp_driver`, `hornett_driver`, `tikk_pod`, `popp_trigger`, `fyreball_burner`,
`fyrefly_burner`, `snytch_scanner`, `spottr_relay`, `komet_igniter`, `sentinal_firing_core`, `surveyr_vault`,
`shreddr_gyro`, `leapr_pulse_unit`, `rocketier_driver`, `bastian_cell`, `bombardeer_cell`, `assessr_matrix`,
`vaporiser_regulator`, `turbyne_compressor`, `matriark_reactor`, `queene_reactor`, plus generic ARK salvage
`ark_alloy`, `ark_powercell`, `advanced_ark_powercell`, `ark_circuitry`, `ark_motion_core`, `ark_coolant`,
`ark_flex_rubber`, `ark_performance_steel`, `ark_synthetic_resin`, `ark_thermo_lining` (+ damaged/glitched variants).

## Item renames (original → tweaked)

Generic English names (Bandage, Metal Parts, Light Shield, Looting Mk. 1, Snap Hook, Photoelectric Cloak, …) are
unchanged. Every blueprint is named `<tweaked item> Blueprint`, id `<item id>_blueprint`.

| Original | DarkRaiders |
|---|---|
| Advanced ARC Powercell | Advanced ARK Powercell |
| Anvil | Anvill |
| Anvil Splitter | Anvill Splitter |
| Aphelion | Afelion |
| ARC Alloy | ARK Alloy |
| ARC Circuitry | ARK Circuitry |
| ARC Coolant | ARK Coolant |
| ARC Flex Rubber | ARK Flex Rubber |
| ARC Motion Core | ARK Motion Core |
| ARC Performance Steel | ARK Performance Steel |
| ARC Powercell | ARK Powercell |
| ARC Synthetic Resin | ARK Synthetic Resin |
| ARC Thermo Lining | ARK Thermo Lining |
| Arpeggio | Arpeggo |
| Assessor Matrix | Assessr Matrix |
| Bastion Cell | Bastian Cell |
| Bettina | Betina |
| Blue Gate Cellar Key | Green Gate Cellar Key |
| Blue Gate Communication Tower Key | Green Gate Communication Tower Key |
| Blue Gate Confiscation Room Key | Green Gate Confiscation Room Key |
| Blue Gate Village Key | Green Gate Village Key |
| Bobcat | Bobkat |
| Bombardier Cell | Bombardeer Cell |
| Buried City Hospital Key | Sandy City Hospital Key |
| Buried City JKV Employee Access Card | Sandy City Space Travel Employee Card |
| Buried City Residential Master Key | Sandy City Residential Master Key |
| Buried City Town Hall Key | Sandy City Town Hall Key |
| Burletta | Burleta |
| Burned ARC Circuitry | Burned ARK Circuitry |
| Canto | Canta |
| Celeste's Journal | Celesta's Journal |
| Comet Igniter | Komet Igniter |
| Dam Control Tower Key | Dam Grounds Control Tower Key |
| Dam Controlled Access Zone Key | Dam Grounds Controlled Access Zone Key |
| Dam Staff Room Key | Dam Grounds Staff Room Key |
| Dam Surveillance Key | Dam Grounds Surveillance Key |
| Dam Testing Annex Key | Dam Grounds Testing Annex Key |
| Damaged ARC Motion Core | Damaged ARK Motion Core |
| Damaged ARC Powercell | Damaged ARK Powercell |
| Damaged Fireball Burner | Damaged Fyreball Burner |
| Damaged Hornet Driver | Damaged Hornett Driver |
| Damaged Leaper Pulse Unit | Damaged Leapr Pulse Unit |
| Damaged Rocketeer Driver | Damaged Rocketier Driver |
| Damaged Snitch Scanner | Damaged Snytch Scanner |
| Damaged Tick Pod | Damaged Tikk Pod |
| Damaged Wasp Driver | Damaged Wazp Driver |
| Deadline | Dedline |
| Degraded ARC Rubber | Degraded ARK Rubber |
| Dolabra | Dolabre |
| Dried-Out ARC Resin | Dried-Out ARK Resin |
| Equalizer | Equaliser |
| Exodus Modules | Exodos Modules |
| Ferro | Ferrox |
| Fireball Burner | Fyreball Burner |
| Firefly Burner | Fyrefly Burner |
| Glitched ARC Circuitry | Glitched ARK Circuitry |
| Glitched ARC Light Ring | Glitched ARK Light Ring |
| Glitched ARC Phased Array | Glitched ARK Phased Array |
| Glitched ARC Power Converter | Glitched ARK Power Converter |
| Glitched ARC Transmitter | Glitched ARK Transmitter |
| Hairpin | Hairpyn |
| Hornet Driver | Hornett Driver |
| Hullcracker | Hullkracker |
| Il Toro | El Torro |
| Impure ARC Coolant | Impure ARK Coolant |
| Jupiter | Jupitor |
| Kettle | Kettel |
| Lance's Mixtape (5th Edition) | Lantz's Mixtape (5th Edition) |
| Leaper Pulse Unit | Leapr Pulse Unit |
| "Leviathan's Crown" Ship Model | "Leviathon's Crown" Ship Model |
| Matriarch Reactor | Matriark Reactor |
| Osprey | Ospray |
| Pop Trigger | Popp Trigger |
| Queen Reactor | Queene Reactor |
| Rascal | Raskal |
| Rattler | Rattlr |
| Renegade | Renegayde |
| Rocketeer Driver | Rocketier Driver |
| Rusty ARC Steel | Rusty ARK Steel |
| Sentinel Firing Core | Sentinal Firing Core |
| Showstopper | Showstoppa |
| Shredder Gyro | Shreddr Gyro |
| "Sirena Dorata" Ship Model | "Sirena Dorada" Ship Model |
| Snitch Scanner | Snytch Scanner |
| Spotter Relay | Spottr Relay |
| Stitcher | Stitchr |
| Surveyor Vault | Surveyr Vault |
| Tattered ARC Lining | Tattered ARK Lining |
| Tempest | Tempesta |
| Tick Pod | Tikk Pod |
| Torrente | Torrento |
| Trailblazer | Trailblazr |
| Trigger 'Nade | Trigga 'Nade |
| Turbine Compressor | Turbyne Compressor |
| "Twilight Compass" Ship Model | "Twilite Compass" Ship Model |
| Vaporizer Regulator | Vaporiser Regulator |
| "Velocity" Ship Model | "Velossity" Ship Model |
| Venator | Venattor |
| Vita Shot | Vyta Shot |
| Vita Spray | Vyta Spray |
| Vulcano | Volcano |
| Wasp Driver | Wazp Driver |
| "Wind Sprite" Ship Model | "Wynd Sprite" Ship Model |
| Wolfpack | Wulfpack |
## Schema notes / extensions (all optional extra fields)

* **Weapons**: `tiers[i].mods` are *cumulative* multipliers vs tier I; `tiers[i].level` = Gunsmith level required
  (II→1, III→2, IV→3); `tiers[i].value` = sell value at that tier. Extra fields: `burstDelay` (s between bursts;
  for `burst` mode `rpm` is the in-burst cadence), `reloadEach` (s per round for tube/lever loaders), `durability`,
  `slots` (mod slots the gun accepts), `chargedDmg`/`chargedRange` (Dolabre focus shot), `explodeRadius` +
  `arkOnlyDetonation` (launchers), `crouchSpreadMul` (Torrento). Legendary/experimental guns have `tiers: []`.
* **Mods**: `fits` = weapon classes, plus `weapons` = exact compatible weapon ids. `stats` are multipliers using keys
  `spread, recoil, adsSpeed, equipSpeed, recovery, mag, noise, projSpeed, range, rpm, dmg, pellets, durabilityBurn`.
* **Consumables**: extra `use` keys `shieldOverTime {amount,dur}`, `cooldown`, `reusable`, `ally`. Integrated
  (augment-bound) items carry `bound: true`, weight 0, value 0.
* **Grenades/traps/gadgets**: for `fire`/`gas` kinds `dmg` is per second for `dur`. Extra `throw` keys: `homing`,
  `arkOnly`, `staminaDrain` (/s), `stunArk`/`stunRaider` (s), `trigger` (proximity radius), `tripwire` (m),
  `timer`, `sticky`, `remote`, `missiles`, `trail` (m), `knockback`, `hp`, `interval`, `lure`, `color`, `target`,
  `flag`, `sensor`, `range`, `dismantle`. Held/reusable gadgets (binoculars, cloak, snap hook, descender,
  instruments, flame spray) use a `use` block instead of `throw`. `zipline_skip` is used for the Zipline.
* **Augments**: `extra` may contain `grenade`, `healing`, `trap` (utility slots) and `trinket`; `perk` is a short id
  with a human `perkDesc`; `integrated` names the bound item id.
* **Ammo**: Energy Clip has `ammo.refillsMag: true` (one clip refills an energy weapon's whole magazine).
* **Keys**: Raider Hatch Key uses `key: { map: 'any', room: 'raider_hatch' }`.
* **Blueprints**: `bpWeight` 1..10 (higher = more common). Weapons: common 8 / uncommon 7 / rare 5 / epic 4 /
  legendary 3; other blueprints 8 / 7 / 6 / 4 / 3. All blueprints sell for 5000 (as in game).
* **Recipes**: `inRaid: true` marks recipes the wiki lists as craftable from the inventory (needs `in_raid_crafting`).
* **Traders**: `price` is per single unit (ammo per round), ≈3× value (2.5× for the hatch key, 3.5–4× for a few
  premium items); `stock` = units per restock. No `unlock` quest ids are used (quests are authored elsewhere).
* **Scrappie**: `yields: [item, min, max]` – min = shortest raid, max = 15+ min raid (wiki table); `capacityRaids: 5`.

## Judgement calls

* **Top-down conversion**: effective `range` hand-mapped from the wiki range stat (pistols/SMG 18–24 m, Anvill hand cannon 30, ARs 30–36,
  battle rifles 42–55, shotguns 11–14, snipers 80–90). `projSpeed` per class (pistols 260–320, SMG 300–320,
  rifles 340–480, snipers 550–600, launchers 45–60). `spread`/`adsSpread` hand-tuned per class.
* Derived stats: `recoil = (100 − stability)/20` (clamped 0–3), `handling = agility/100`,
  `moveMul = 0.85 + 0.15·agility/100`, `noise = 60 − 0.7·stealth` metres. ARK armour pen: very weak 0.1, weak 0.25,
  moderate 0.4, strong 0.6, very strong 0.85.
* RPM: wiki fire-rate stat × 15 for automatics (matches the wiki's RPM notes for Kettle/Rattler/Stitcher);
  manual actions hand-set (bolt 35–45, pump 70–75, lever 90). Bettina set to 400 (stat implies ~430, a note says 250).
* Upgrade perks mapped as: horizontal recoil & max dispersion → `spread`, dispersion-recovery → `recoil` (half
  weight), bolt-action time → `rpm`, durability +10/20/30 → ×1.1/1.2/1.3.
* "Powerful high tier" request: legendary experimental guns buffed ~20–25% over wiki (Afelion 25→30 per bolt,
  Jupitor 60→75, Equaliser 8→10, Dolabre 50→60 blast / 40→50 focused). Epic/legendary weapon blueprints get bpWeight ≥ 3.
* Shotguns: El Torro 9×7.5, Volcano 9×5.5 pellets; Venattor fires 2×8 per round.
* AoE scaled for the ~40 m view: Blaze fire radius 10→6 m, gas clouds 7.5→5 m, Wulfpack lock-on 100→40 m.
  Other radii/damage as wiki. Wulfpack keeps 12 missiles × 166 dmg (ARK only).
* Mod compatibility recomputed from slot + ammo family (wiki lists are stale for newer guns such as Canto);
  mag mods are multipliers approximating +N rounds (light ×1.25/1.5/1.75, medium ×1.2/1.4/1.6, shotgun ×1.35/1.7/2.0).
* When the wiki lists several stations for a recipe, the cheapest (Workbench) is used. Light sticks placed at
  Utility Station I (Workshop overview) although the item pages say II. A second "field" Herbal Bandage recipe
  (14 Fabric + 1 Great Mullein, in-raid) is kept as `craft_herbal_bandage_field`.
* Simple Gun Parts stay uncraftable (as in game) – they come from loot, recycling weapons and Celesta.
  Loot-only (no recipe): Silencer III, Horizontal Grip, Kinetic Converter, Anvill Splitter, Recorder,
  Acoustic Guitar, Free Loadout Augment, integrated tools.
* Item typing: household "Recyclable" junk → `valuable` (desc lists its recycle output); Motor, Industrial Battery and
  Power Cable → `material` (topside); damaged/glitched ARK salvage → `material` (arc); Fossilized Lightning → nature.
* Trader roles follow ARCHITECTURE.md (Shanni = shields/augments/security, Lantz = medic) rather than the live game.
* Key `room` ids match docs/MAPS.md; two extra Green Gate keys (`confiscation_room`, `patrol_car`) need a
  matching `keyRoom` in the map to be usable.
* ARK unit spellings were aligned with `src/data/arc.js` (Sentinal, Surveyr, Rocketier, Turbyne …) so every
  ARK loot id resolves in ITEMS.
* Scrappie L5 Very Comfortable Pillow cost set to 3 (wiki template says 12 but displays ×3).

## Not included / not found

* Crash Mat, Dockmaster's Detector (Riven Tides content, no top-down use), Snowball, Volcanic Rock.
* Keys/codes for maps we do not have (Spaceport, Stella Montis, Riven Tides, security codes).
* Banjo, Harmonica, Grappling Hook, Camera, Tether Launcher, Yank Grenade, Bantam, Stiletto – wiki pages exist
  but have no stats yet. Raider Tool (melee) is not an item. Colorful Shoes epic/legendary variants omitted
  (rare variant kept). Missing per-weapon reload times were estimated (only Bettina, Canto, Aphelion, Dolabra listed).

## Icon ids referenced (for `ui/icons`)

Existing: `bandage, shieldRecharger, grenade, adrenaline, smoke, ammoLight, metalParts, key`.
New family ids: `ammo_medium, ammo_heavy, ammo_shotgun, ammo_energy, ammo_launcher, gun_rifle, gun_smg, gun_pistol,
gun_shotgun, gun_sniper, gun_lmg, gun_launcher, gun_energy, mod_muzzle, mod_grip, mod_mag, mod_stock, mod_tech,
augment, shield_light, shield_medium, shield_heavy, food, defib, grenade_fire, grenade_gas, grenade_lure,
grenade_stun, lightstick, trap, mine, barricade, flare, flag, zipline, gadget, binoculars, cloak, grapple,
instrument, plastic_parts, rubber_parts, fabric, chemicals, component, explosive, gun_parts, battery, wires,
canister, seeds, plant, fruit, valuable, arc_part, salvage, trinket, quest, blueprint`.
