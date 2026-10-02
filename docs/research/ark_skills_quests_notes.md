# ARK, skills, quests & conditions: research notes

Covers `src/data/arc.js`, `src/data/skills.js`, `src/data/quests.js` and `src/data/conditions.js`.
Validated with Node: all modules import cleanly; every skill `requires` resolves; no row/col collisions;
only canonical stat keys (the keys of `BASE` in `src/game/stats.js`); quest `requires` resolve with no
cycles and no duplicate ids; every item, recipe, trader and ARK id referenced exists.

## Sources

All research used the community wiki **https://arcraiders.wiki** via the MediaWiki API
(`/w/api.php?action=parse&prop=wikitext&page=…`, `action=query&prop=revisions` for batches) and its Cargo tables
(`action=cargoquery&tables=quests|questItems|items|trials`).

| Topic | Pages / data |
|---|---|
| Machines | `/wiki/ARC` (variant table: drops, XP, tips, armour colours, behaviour modes) and one page per machine: Wasp, Hornet, Tick, Pop, Fireball, Snitch, Turret, Sentinel, ARC Surveyor (`Rollbot` redirects here), Shredder, Comet, Firefly, Spotter, Bombardier, Bastion, Leaper (has a per-part anatomy table), Rocketeer, Vaporizer, ARC Turbine, Queen, Matriarch |
| Husks / landers | Wasp Husk, Rocketeer Husk, Baron Husk, ARC Probe, ARC Courier, ARC Assessor, Deforester Husk |
| Skills | `/wiki/Skills` (all 45 skills: ranks, prerequisites, gates) plus `Widget:SkillTree` (the SVG gives node positions and branch colours: Conditioning `#1FFF76`, Mobility `#FFD205`, Survival `#F60010`) |
| XP | `/wiki/Experience` (per-level XP table for levels 1–75; XP per second topside and per damage point) |
| Quests | Cargo `quests` (100 quests: trader, location, next) plus every quest page (objectives, rewards, grants) |
| Conditions | `Category:Map Conditions` pages (Night Raid, Electromagnetic Storm, Lush Blooms, Uncovered Caches, Husk Graveyard, Prospecting Probes, Harvester, Matriarch (map condition), Cold Snap, Hurricane, Close Scrutiny, Locked Gate, Bird City); each map's infobox lists the conditions it gets |
| POIs | The wiki-hosted labelled overview maps by @Cartotect (`Dam Battlegrounds Map.jpg`, `Buried City Map.jpg`, `Blue Gate Map.jpg`, copied into the shared scratchpad `ref/`), cross-checked with full-text wiki searches |

## Name tweaks

Every name shown to players gets a light tweak. Ids are the snake_case of the tweaked name. Names
that are plain English stay as they are.

### ARK machines (`ARK`), with their unique part (all part ids exist in `items.js`)

| Real | Ours (id) | Unique part id | Model builder |
|---|---|---|---|
| Tick | Tikk (`tikk`) | `tikk_pod` | tick |
| Pop | Popp (`popp`) | `popp_trigger` | pop |
| Fireball | Fyreball (`fyreball`) | `fyreball_burner` | fireball |
| Comet | Komet (`komet`) | `komet_igniter` | pop ×1.8 |
| Wasp | Wazp (`wazp`) | `wazp_driver` | wasp |
| Hornet | Hornett (`hornett`) | `hornett_driver` | hornet |
| Firefly | Fyrefly (`fyrefly`) | `fyrefly_burner` | hornet ×1.1 |
| Snitch | Snytch (`snytch`) | `snytch_scanner` | snitch |
| Spotter | Spottr (`spottr`) | `spottr_relay` | snitch ×0.9 |
| Turret | Turrett (`turrett`) | (none) | turret |
| Sentinel | Sentinal (`sentinal`) | `sentinal_firing_core` | sentinel |
| Surveyor / Rollbot | Surveyr (`surveyr`) | `surveyr_vault` | surveyor |
| Shredder | Shreddr (`shreddr`) | `shreddr_gyro` | fireball ×2 |
| Rocketeer | Rocketier (`rocketier`) | `rocketier_driver` | rocketeer |
| Vaporizer | Vaporiser (`vaporiser`) | `vaporiser_regulator` | rocketeer ×1.15 |
| Leaper | Leapr (`leapr`) | `leapr_pulse_unit` | leaper |
| Bastion | Bastian (`bastian`) | `bastian_cell` | bastion |
| Bombardier | Bombardeer (`bombardeer`) | `bombardeer_cell` | bombardier |
| ARC Turbine | ARK Turbyne (`turbyne`) | `turbyne_compressor` | rocketeer ×2.2 |
| Queen | Queene (`queene`) | `queene_reactor` | queen |
| Matriarch | Matriark (`matriark`) | `matriark_reactor` | queen ×1.15 |

`ARK_HUSKS` (static, breachable): Wazp Husk (`wazp_husk`), Rocketier Husk (`rocketier_husk`),
Barron Husk (`barron_husk`), ARK Probe (`ark_probe`), ARK Courier (`ark_courier`), ARK Assessr
(`ark_assessor`; its part is `assessr_matrix`, as items.js spells it), Deforestr Husk (`deforestr_husk`).

`ARK_ALIAS` maps the real-name and model keys to these ids (`wasp→wazp`, `sentinel→sentinal`,
`rollbot→surveyr`, …). It is internal only and never shown to players.

### Skills (real → ours)

**Conditioning:** Used To The Weight → Used To The Wait (the spelling ARCHITECTURE.md already uses) ·
Blast-Born → Blast-Borne · Gentle Pressure → Gentler Pressure · Fight Or Flight → Fight Or Fright ·
Proficient Pryer → Proficient Pryor · Survivor's Stamina → Survivalist's Stamina · Unburdened Roll → Unbothered Roll ·
Downed But Determined → Down But Determined · A Little Extra → A Lil' Extra · Effortless Swing → Effortless Swingin' ·
Turtle Crawl → Tortoise Crawl · Loaded Arms → Laden Arms · Sky-Clearing Swing → Sky-Clearin' Swing ·
Back On Your Feet → Back On Yer Feet · Flyswatter → Flyswatta.

**Mobility:** Nimble Climber → Nimble Clamberer · Marathon Runner → Marathon Runnr · Slip and Slide → Slip 'n' Slide ·
Youthful Lungs → Youthful Lungz · Sturdy Ankles → Sturdy Ankels · Carry The Momentum → Carry The Moment ·
Calming Stroll → Calmin' Stroll · Effortless Roll → Effortless Rollin' · Crawl Before You Walk → Crawl Before Ya Walk ·
Off The Wall → Off The Walls · Heroic Leap → Heroic Leaps · Vigorous Vaulter → Vigorous Vaultr ·
Ready To Roll → Ready 2 Roll · Vaults on Vaults on Vaults → Vaults Upon Vaults · Vault Spring → Vault Sprung.

**Survival:** Agile Croucher → Agile Crouchr · Looter's Instincts → Looter's Instinct · Revitalizing Squat → Revitalising Squat ·
Silent Scavenger → Silent Scavengr · In-round Crafting → In-Raid Crafting · Suffer In Silence → Suffering In Silence ·
Good As New → Good As Brand New · Broad Shoulders → Broader Shoulders · Traveling Tinkerer → Travelling Tinkerer ·
Stubborn Mule → Stubborn Mulo · Looter's Luck → Lootin' Luck · One Raider's Scraps → One Raider's Trash ·
Three Deep Breaths → Three Big Breaths · Security Breach → Security Breech · Minesweeper → Minesweepr.

### People, companies and lore

Celeste → Celesta, Shani → Shanni, Tian Wen → Tien Wen, Apollo → Apolo, Lance → Lantz (all matching
traders.js). Speranza → Speranzia. Major Aiva → Major Ayva. Toledo → Toleda. Bilguun → Bilgun.
Dodger → Dodgr. Enelica → Enelika. J Kozma Ventures → J-Kosma. Victory Ridge → Victory Rise.
Baron → Barron. Deforester → Deforestr.

### Quests (real → ours; id = snake_case of ours)

Picking Up The Pieces → Picking Up The Bits · Clearer Skies → Clearer Skys · Trash Into Treasure → Trash To Treasure ·
Off The Radar → Under The Radar · A Bad Feeling → A Bad Feelin' · Hatch Repairs → Hatch Repair Job ·
Down To Earth → Back Down To Earth · The Trifecta → The Trifekta · Dormant Barons → Dormant Barrons ·
Mixed Signals → Crossed Signals · Clamoring for Attention → Clamouring For Attention · The Right Tool → The Right Tools ·
A Better Use → Better Uses · What We Left Behind → What We Leave Behind · Broken Monument → Broken Monuments ·
Marked For Death → Marked For Dead · Market Correction → Market Corrections · Eyes On The Prize → Eye On The Prize ·
Industrial Espionage → Industrial Snooping · Unexpected Initiative → Unexpected Initiatives ·
The Major's Footlocker → The Major's Lockbox · Back on Top → Back Up Top · Collision Course → On A Collision Course ·
Greasing Her Palms → Greasing Her Palm · A Balanced Harvest → A Fair Harvest · Untended Garden → The Untended Garden ·
The Root of the Matter → Root Of The Matter · After Rain Comes → After The Rain Comes · Water Troubles → Water Trouble ·
Source Of The Contamination → Source Of Contamination · Switching The Supply → Switching Supplies · Power Out → Power's Out ·
Flickering Threat → Flickering Threats · Bees! → Beez! · Tribute To Toledo → Tribute To Toleda ·
Digging Up Dirt → Digging Up The Dirt · Straight Record → Straight Records · Keeping The Memory → Keeping The Memories ·
Echoes Of Victory Ridge → Echoes Of Victory Rise · A Symbol of Unification → A Symbol Of Unity ·
Celeste's Journals → Celesta's Journals · Keeping an Eye Out → Keep An Eye Out · A Rising Tide → The Rising Tide ·
Doctor's Orders → Doctor's Order · Medical Merchandise → Medical Merch · A Reveal in Ruins → A Reveal In The Ruins ·
Prescriptions of the Past → Prescriptions Past · Life Of A Pharmacist → Life Of The Pharmacist ·
A New Type Of Plant → A New Kind Of Plant · On The Map → Put On The Map · Safe Passage → Safe Passages ·
What Goes Around → What Comes Around · Sparks Fly → Sparks Flying · A First Foothold → A First Toehold ·
A Warm Place To Rest → A Warm Place To Sleep · Espresso → Expresso · Building A Library → Stocking The Library ·
The League → Sunday League · Test Case → Test Cases · The Clean Dream → A Clean Dream · Paving The Way → Paving The Road ·
Groundbreaking → Ground-Breaking · A Lay Of The Land → Lay Of The Land · Eyes in the Sky → Eyes In The Skies ·
A Toxic Trail → The Toxic Trail · Out of the Shadows → Out Of The Shadow · Combat Recon → Combat Recce ·
Bombing Run → Bombing Runs · Our Presence up There → Our Presence Up Top · Lost In Transmission → Lost In Transmissions ·
Communication Hideout → Comms Hideout · Into The Fray → Into The Fracas · Reduced to Rubble → Ground To Rubble ·
With A Trace → Not Without A Trace · Armored Transports → Armoured Transports · A Prime Specimen → A Prime Sample ·
Outstanding Balance → Outstanding Balances · Settled in Full → Paid In Full.

### Conditions

These keep their real names because they are plain English. The exceptions are **Matriark** (the
machine's tweaked name), **Calm Skies** (new `normal` baseline) and the boss names in the descriptions.

## Point-of-interest ids

`QUEST_POIS` in `quests.js` lists every POI id the quests use as `{ name, original }`, where
`original` is the snake_case of the real ARC Raiders label. docs/MAPS.md tells map authors to call
`poi(id, name, …, { aliases: [<original snake_case>] })`. A quest step should therefore count as
done at a map POI whose `id === step.poi`, or whose `aliases` include `QUEST_POIS[map][step.poi].original`.
That still works if a map author picks a different spelling. `field_depot` is a generic marker: any
Field Depot on that map counts.

These are the POIs whose quest id differs from the original (all other POIs use the same id):
`rubie_residence` (ruby_residence), `formikai_outpost` (formicai_outpost), `su_duranti_warehouses`
(su_durante_warehouses), `marino_station` (marano_station), `marino_park` (marano_park), `piazza_romana`
(piazza_roma), `sandy_properties` (buried_properties), `piazza_arbusta` (piazza_arbusto),
`grandiosa_apartments` (grandioso_apartments), `santa_marta_houses` (santa_maria_houses).

Proper nouns are tweaked; generic labels are only snake_cased. Full label lists from the overview maps:

* **damn_grounds** (Dam Battlegrounds): west_broken_bridge, east_broken_bridge, pattern_house,
  **rubie_residence** (Ruby), pale_apartments, ben_welders_sunroof, generator_hall, raider_outpost_east,
  power_generation_complex, controlled_access_zone, hydroponic_dome_complex, pipeline_tower, the_breach,
  old_battleground, central_swamp_lift, floodgates, south_swamp_outpost, water_treatment_control, primary_facility,
  control_tower, research_and_administration, red_lakes_balcony, electrical_substation, small_creek, water_towers,
  testing_annex, electrical_tower, scrap_yard, wreckage, **formikai_outpost** (Formicai).
  Extracts and hatches: water_treatment_elevator, north_complex_elevator, red_lakes_balcony_lift, sunroof_hatch,
  pump_house_hatch, spillway_hatch, good_old_barrons_hatch.
* **green_gate** (The Blue Gate): village, barren_clearing, raiders_refuge, trappers_glade, adorned_wreckage,
  reinforced_reception, data_vault, headhouse, pilgrims_peak, outer_gates, warehouse_complex, gate_control_room,
  abandoned_housing_project, checkpoint, ridgeline, maintenance_bunker, broken_earth, highway_collapse, olive_grove,
  ruined_homestead, ancient_fort, plus traffic_tunnel (underground, near the Checkpoint). Extracts and hatches:
  cliffside_airshaft, warehouse_airshaft, forest_airshaft, overlook_airshaft, lucky_hatch, reinforced_hatch,
  prefab_hatch, fragrant_hatch.
* **sandy_city** (Buried City): gas_station, **su_duranti_warehouses** (Su Durante), market_ruins, hospital,
  dunes_end, library, **marino_station** (Marano), parking_garage, galleria, warehouse, space_travel, research,
  **marino_park**, **piazza_romana** (Piazza Roma), **sandy_properties** (Buried Properties), town_hall,
  **piazza_arbusta** (Piazza Arbusto), **corso_da_vinchi** (Corso da Vinci), maintenance_depot,
  **grandiosa_apartments** (Grandioso), **santa_marta_houses** (Santa Maria), main_street, abandoned_highway_camp,
  red_tower, **plaza_rossa** (Plaza Rosa), church_ruins, plus districts old_town and outskirts. Metro and hatches:
  northern_station, western_station, eastern_station, southern_station, collapsed_supermarket_hatch,
  train_station_hatch, highway_overpass_hatch, old_town_hatch.

POIs that quests use (also in `QUEST_POIS`):
damn_grounds: field_depot, spillway_hatch, south_swamp_outpost, scrap_yard, water_treatment_control,
research_and_administration, hydroponic_dome_complex, red_lakes_balcony, floodgates, pipeline_tower,
electrical_substation, generator_hall, power_generation_complex, old_battleground, wreckage, formikai_outpost,
west_broken_bridge, raider_outpost_east, rubie_residence, pale_apartments, pattern_house, control_tower,
controlled_access_zone, water_towers, small_creek ·
green_gate: warehouse_complex, village, checkpoint, reinforced_reception, olive_grove, highway_collapse,
barren_clearing, ancient_fort, ruined_homestead, headhouse, raiders_refuge, ridgeline, data_vault, trappers_glade,
maintenance_bunker, pilgrims_peak, abandoned_housing_project, broken_earth, adorned_wreckage, traffic_tunnel ·
sandy_city: parking_garage, su_duranti_warehouses, gas_station, marino_station, southern_station,
grandiosa_apartments, piazza_romana, sandy_properties, space_travel, research, santa_marta_houses, hospital,
piazza_arbusta, abandoned_highway_camp, library, main_street, galleria, marino_park, red_tower.

`conditions.js` `locked_gate` also names raiders_refuge, pilgrims_peak, reinforced_reception and ancient_fort
(where the code printers are) and gate_control_room (where the codes are entered). The `harvester`
condition uses `bossPoi: 'harvester'`.

## Item ids referenced

When I checked last, every id below existed in `src/data/items.js`, and the four blueprint rewards
existed in `recipes.js`.

* **arc.js loot (62):** advanced_ark_powercell, advanced_electrical_components, advanced_mechanical_components,
  ammo_energy, ammo_heavy, ammo_launcher, ammo_light, ammo_medium, ammo_shotgun, ark_alloy, ark_circuitry, ark_coolant,
  ark_flex_rubber, ark_motion_core, ark_performance_steel, ark_powercell, ark_synthetic_resin, ark_thermo_lining,
  assessr_matrix, bastian_cell, bombardeer_cell, burned_ark_circuitry, chemicals, complex_gun_parts, crude_explosives,
  damaged_ark_motion_core, damaged_ark_powercell, damaged_hornett_driver, damaged_rocketier_driver, damaged_wazp_driver,
  degraded_ark_rubber, dried_out_ark_resin, electrical_components, explosive_compound, fyreball_burner, fyrefly_burner,
  heavy_gun_parts, hornett_driver, impure_ark_coolant, komet_igniter, leapr_pulse_unit, magnetic_accelerator,
  matriark_reactor, mechanical_components, medium_gun_parts, popp_trigger, queene_reactor, rocketier_driver,
  rusty_ark_steel, sensors, sentinal_firing_core, shreddr_gyro, simple_gun_parts, snytch_scanner, spottr_relay,
  surveyr_vault, synthesized_fuel, tattered_ark_lining, tikk_pod, turbyne_compressor, vaporiser_regulator, wazp_driver.
* **quests.js (153 ids):** quest items celestas_journal, moisture_meter, nutrient_meter, lidar_scanner,
  esr_analyzer, old_world_books, possibly_toxic_plant, espresso_machine_parts, experimental_seed_sample,
  first_wave_compass/rations/tape, raider_flag, scout_patrol_note, dusty_film_reel; valuables deflated_football,
  bicycle_pump, faded_photograph, rosary, music_box, coffee_pot; keys damn_grounds_control_tower_key,
  damn_grounds_staff_room_key, damn_grounds_surveillance_key, damn_grounds_testing_annex_key,
  sandy_city_town_hall_key, green_gate_communication_tower_key, patrol_car_key, raider_hatch_key; weapons rattlr,
  stitchr, ferrox, arpeggo, renegayde, canta, el_torro, volcano, anvill; mods (…_i/_ii/_iii plus anvill_splitter);
  augments tactical_mk_1/2, tactical_mk_3_healing, tactical_mk_3_revival, combat_mk_1/2, looting_mk_2; and
  generic materials, consumables and grenades (the full list is printed by the validation script).
* **Quest blueprints:** craft_burleta, craft_hullkracker, craft_lure_grenade, craft_trigga_nade, craft_fireworks_box.
* **conditions.js:** fossilized_lightning, candleberries, equaliser_blueprint, jupitor_blueprint, complex_gun_parts,
  magnetic_accelerator, and the nine ducks (alien_duck, arcade_duck, doodly_duck, familiar_duck, flashy_duck,
  frosty_duck, gentle_duck, mri_duck, tropical_duck). One id does not exist yet: `security_code` (`locked_gate.effects.codeItem`).
  Add it as a quest item if the Locked Gate puzzle gets built.
* **Container kinds in quest `search` steps:** any, raider_cache, weapon_case, medical_bag, car_trunk, field_depot
  (all from `loot.js`), barron_husk, ark_probe, ark_courier, deforestr_husk (from `ARK_HUSKS`), plus two new
  kinds: `supply_drop` and `bee_hive`.

## Judgement calls

### ARK
* **Roster.** Covers the 1.x roster: the 17 machines in the brief plus Komet, Fyrefly, Vaporiser and
  Turbyne. `Rollbot` redirects to Surveyor on the wiki, so it is an alias. The husks, landers and
  Barron Husk are in a separate `ARK_HUSKS` export so that `ARK` holds only hostile units.
* **HP and armour.** HP comes from the wiki infoboxes. Exceptions:
  * Tikk 10 → 15.
  * Fyreball 20 → 60, with a 0.75 shell. The wiki's 20 is its core HP.
  * Queene 23000 → 15000 and Matriark 23000 → 18000. The wiki marks 23000 as an estimate. These
    are lower for small co-op squads, and the Matriark stays the tougher of the two.
  * `armor` comes from the infobox class: none 0, light ≈0.25–0.4, heavy ≈0.55–0.85.
  * `explosiveMul` (1.3–1.6) goes where the wiki says explosives excel: Leapr, Surveyr, Shreddr,
    Rocketier, Bastian, Bombardeer, Komet.
* **Top-down hitzones.** `sim.js` works out which side a zone faces from its offset, not from
  `dir`. Every zone that has an `arc` therefore sits off-centre on the side it guards; `dir` is a
  redundant hint and the validator checks that the two agree. The flanking set-ups:
  * Wazp, Snytch and Spottr: four mirrored corner rotors, and two breaks make them fall (`fallAfter`).
  * Hornett: an 85% front plate (120° arc), armoured front rotors and bare rear rotors.
  * Bastian: 90% front armour (150° arc), leg joints, a rear canister whose break exposes a ×4 rear core, and chain guns that `disarm` when broken.
  * Bombardeer: leg joints that `slow`, a ×3 rear canister, and a mortar that can be broken.
  * Leapr: four breakable legs (−20% speed each, no leap after two breaks), an eye plate then the eye, and a ×2.5 core while `landed`.
  * Rocketier: thrusters, rocket pods (`disarm`), an "eyebrow" that must break before the scanner can be hit, and a back canister.
  * Sentinal and Turrett: weak housings on the rear arm.
  * Queene and Matriark: four breakable plates; the core opens once two are gone (`plates_broken`). They also have knee joints, a head (front arc) and missile pods (Matriark).
* **Vision.** Turrett is 22 m / 18° and Sentinal 50 m / 14°; both sweep. Drones are 22–26 m / 70°.
  Heavies are 26–40 m; bosses are 45 m. Snytch has a 36° spotlight that sweeps.
* **Flyer height.** For flyers, `height` is the hover altitude, because `sim.js` sets `alt = def.height`.
  The body height is in `size.height`. Shreddr floats just above the floor, so it is
  `flying: false, hover: true`.
* **Komet core.** Killing the core before it explodes should stop the blast (`onBreak: 'disarm'`,
  `lootIfDisarmedOnly`). Current `sim.js` explodes every `arch === 'pop'` unit on death, so the ARK AI needs
  an exception for Komet.

### Skills
* **Structure.** The tree matches the real one exactly: 3 × 15 nodes, the same parent links, and
  "A or B" parents marked `requiresAny: true`. Gates are 15 points (row 3) and 36 points (row 6).
  The layout is a 5-column grid. Branch totals are 51 / 55 / 51 points against 75 available, so a
  raider can reach at most two capstones, as in the real game.
* **Situational effects.** `computeStats()` in `stats.js` applies every `effects` entry permanently. Situational
  bonuses (when hurt, critical, crouched, after a dodge, vs drones, …) therefore live in a separate
  `conditional: [{stat, per, when}]` array, which `computeStats` ignores. Each such node also has a
  small always-on effect so its points do something today. To support the situational part, the
  engine adds the `conditional` entries whose `when` currently holds.
* **Stat units.** These follow `stats.js` KIND rules:
  * `max_hp` is absolute: the capstone gives +25 HP.
  * The "lower" stats (`noise_mul`, `sprint_cost`, …) are written as negative fractions.
  * Carry weight, slots and self-revive counts are absolute.
* **Capstones (deliberately overpowered, per the user):**
  * Back On Yer Feet: 2 self-revives per raid, +25 HP, double downed HP, +50% healing.
  * Flyswatta: +60% ARK damage, melee kills small drones in one hit.
  * Vaults Upon Vaults: sprint −60%, dodge −50%, +50% stamina and regen.
  * Vault Sprung: +15% move, +25% sprint, +60% dodge distance, 90% fall resistance, ARK spot you 25% slower.
  * Security Breech: +40 kg, +6 slots, 2× breach and search speed, +40% rare and +30% extra loot, security lockers.
  * Minesweepr: footsteps −85%, noise −70%, ARK spot you 50% slower, +60% explosive resistance, defuse mines.

  Run through `computeStats()`, a fully built Mobility branch brings the sprint cost from 13 to 1.3.
* **XP.** The real per-level table (5k → 50k per level, 2.816M total) is scaled by 0.25, giving
  704k total. Raiders start at level 0, `XP_CURVE[i]` is the XP to reach level i+1, and each
  level gives one point (75 in all). ARK kill and salvage XP use the real values. Topside time is
  3 XP/s and damage to raiders is 5 XP/HP, both from the wiki. Damage to ARK is lowered to 1 XP/HP
  (the real game gives 2–3).

### Quests
* **Count.** There are 78 quests: Shanni 23, Celesta 21, Tien Wen 15, Apolo 12, Lantz 7. The
  dependency graph keeps the real `next` structure wherever both ends are on our maps. Where the
  real tree let either of two quests unlock the next, `requires` lists both (requires = ALL). The
  affected quests are Under The Radar, Water Trouble, Into The Fracas, Unexpected Initiatives and
  Back Up Top.
* **Relocated quests.** Quests set on maps we don't have are moved to ours:
  * Lay Of The Land, Lost In Transmissions, Power's Out, Switching Supplies and Prescriptions Past were on Spaceport.
  * Put On The Map was on Spaceport.
  * Eyes In The Skies' Spaceport step moves to Pilgrim's Peak.
* **Skipped quests.** Quests that only make sense on maps we don't have are dropped: Stella
  Montis, Riven Tides, Turnabout, Deciphering The Data, Dust on the Wires, Waking the Grid, Stench of
  Corruption, Movie Night, In My Image and similar.
* **Quest items.** Wherever possible these reuse ids that already exist:
  * Stocking The Library: 3× `old_world_books`.
  * The Major's Lockbox: `faded_photograph`.
  * Echoes Of Victory Rise: `scout_patrol_note`.
  * Outstanding Balances: `dusty_film_reel`.
  * Armoured Transports: `patrol_car_key`.
* **Step extensions.** Steps can carry `label` (objective text), `use` (items used up at a POI, for
  repairs and installs), `with` (a kill condition: an item id or `'grenade'`), a `container` array,
  and a `poi` on loot and search steps. Quests can carry `grants` (items given on accept).

### Conditions
* **Map lists.** `MAP_CONDITIONS` comes from each map's infobox. Prospecting Probes is also given
  to green_gate, because its condition page lists The Blue Gate. A `normal` (Calm Skies) baseline
  is added with the highest weight. Conditions exclusive to other maps are skipped: Hidden Bunker,
  Launch Tower Loot, Frigate, Beachcombing.
* **Engine values.** `time` and `weather` use the preset keys from `engine/lighting.js`.
  `sim.js` already reads `lootMul`, `rareMul`, `arkMul` and `spawnBoss`; the other effect keys are
  documented in the file header for the engine to adopt.

## Integration notes for other modules
* `ark_ai.js` `arkDefFor(arch)` should resolve `ARK[arch] ?? ARK[ARK_ALIAS[arch]]`. The test map
  spawns `'wasp'`, `'tick'` and `'hornet'`.
* `sim.js populate()` decides whether an ARK is fixed by comparing `kind` to `'sentinel'` /
  `'turret'`. With the new ids it should check `def.static` instead.
* The next three are engine features the data expects but `sim.js` doesn't handle yet:
  * The `conditional` skill effects need runtime context (see the skills section).
  * The Komet disarm exception (see the ARK section).
  * The Snytch `calls` reinforcement waves.
