# Green Gate (ARC Raiders "The Blue Gate") — map notes

Module: `src/maps/green_gate.js` (id `green_gate`, name **Green Gate**, 1100 × 825 m, seed 4127, base `grass`,
cliff `rock`). Custom props: `src/maps/props_green_gate.js` (every kind prefixed `gg_`).

## Sources
* `docs/ref/blue_gate_annotated.jpg`, `blue_gate_blank.jpg`, `blue_gate_underground.jpg` and the hi-res
  originals (`Blue_Gate_Map.jpg` 4096×3072, `Blue_Gate_Map_Blank.png` 4096², `Blue_Gate_Underground_Map.jpg`
  3500×1700) from the arcraiders.wiki "The Blue Gate" gallery. Wiki codex: *"Once a steadfast symbol of
  defiant connection, the Blue Gate now serves as a daunting entryway into the perilous mountain ranges…
  a spacious map inside a large, mountainous valley… abandoned towns, fruiting orchards, and an
  underground complex full of deadly ARC machines."*
* **Reference → world transforms** (metres, north up; playable area mapped onto `[0,1100]×[0,825]`):
  * annotated 4096×3072: `x = (px − 337.9) / 3.0252`, `z = (py − 286.7) / 3.0252`
  * blank 4096²: `x = (px − 559.4) / 2.5018`, `z = (py − 1006.1) / 2.5018`
  * underground 3500×1700: `x = (px + 381.9) / 3.0234`, `z = (py + 107.9) / 3.0234`
  All three were resampled into 2 px/m gridded images and every POI, extract, spawn, building cluster,
  road, ridge and lake was traced from 10 m-gridded crops (blank map for terrain/buildings, annotated map
  for icons, underground map for the tunnel network).

## Naming
POI `id` = snake_case of the display name; `aliases` = snake_case of the original ARC Raiders name. All Blue
Gate place names are plain descriptive English (Village, Checkpoint, Olive Grove, Pilgrim's Peak…), so per
`docs/ARCHITECTURE.md` they stay unchanged — the map name itself carries the tweak (*The Blue Gate → Green
Gate*, also reflected in the green gate leaves / pylon bands). Ids match `QUEST_POIS.green_gate` in
`src/data/quests.js` and the `locked_gate` condition (`raiders_refuge`, `pilgrims_peak`,
`reinforced_reception`, `ancient_fort`, unlock at `gate_control_room`).

## POIs
| id | display name | alias | x, z | r | tier | notes |
|---|---|---|---|---|---|---|
| outer_gates | Outer Gates | outer_gates | 591, 314 | 44 | 3 | 4 × 32 m pylons, 2 green wall blocks with striped top beams, sliding leaves; diagonal (NE axis) |
| checkpoint | Checkpoint | checkpoint | 521, 384 | 80 | 2 | 12 two-storey blocks in two continuous wings rotated with the plaza (45°), kiosks + booms, gantry, buses/trucks, 4 turret perch towers, fences |
| gate_control_room | Gate Control Room | gate_control_room | 683, 331 | 26 | 3 | 2-storey control block (45°) on the bench terrace above the yard, consoles facing the gate, ramp from the yard |
| traffic_tunnel | Traffic Tunnel | traffic_tunnel | 633, 167 | 40 | 3 | underground; 32 m wide band at the reference's ~84° heading, cave-in at the north end, patrol-car key room |
| security_wing | Security Wing | security_wing | 574, 220 | 36 | 3 | underground, 45° block off the yard: 4 cells, guard room, **Confiscation Room** key room, stair up into the guard post; west block (processing rooms, armoury, emergency stair) through the cell corridor |
| maintenance_wing | Maintenance Wing | maintenance_wing | 721, 247 | 34 | 2 | underground, 45°: yard → 118 m Maintenance Hall (bays, trucks) → open junction pit → Data Vault; south leg → portal onto the east fields |
| reinforced_reception | Reinforced Reception | reinforced_reception | 566, 156 | 34 | 3 | blast-walled reception hall with the security desk (quest), ramp down into the Security Wing |
| headhouse | Headhouse | headhouse | 676, 190 | 32 | 2 | round concrete drum (walkable top, stairs) around the sunk fan hall: gallery at bench level, central duct column, roof ladder, grille roof with the Sentinel hub |
| data_vault | Data Vault | data_vault | 757, 130 | 26 | 3 | sunk server hall + strongroom; surface stair east; Bench Chapel with satellite dishes to the north |
| warehouse_complex | Warehouse Complex | warehouse_complex | 746, 289 | 46 | 2 | 54 × 60 m sunk hangar on the reference diamond (45°) with racks, office, loading office, siren, white lookout tower (turret) |
| pilgrims_peak | Pilgrim's Peak | pilgrims_peak | 925, 120 | 52 | 3 | 21 m plateau: complex on a 45° grid — 3-storey hostel, refectory, research annex, Pilgrim Lodge, cloister; climbable 31 m comms tower + locked basement on the NE shoulder |
| village | Village | village | 372, 88 | 100 | 2 | 34 gabled stone houses in two clusters, chapel + piazza (boom box), walled lanes, key house |
| barren_clearing | Barren Clearing | barren_clearing | 168, 158 | 32 | 1 | scorched clearing, downed Barron husk, Bilgun's shelter |
| raiders_refuge | Raider's Refuge | raiders_refuge | 304, 206 | 22 | 1 | hidden raider camp in the forest (shack, tents, campfire, antenna) |
| trappers_glade | Trapper's Glade | trappers_glade | 282, 292 | 32 | 1 | trapper cabin + locked cellar (2nd Cellar Key icon), raider structure (roof-plates quest), small watchtowers |
| adorned_wreckage | Adorned Wreckage | adorned_wreckage | 205, 360 | 50 | 2 | crashed hull rings/engines/fins in a gouged trail, cloth + lanterns + totems, Deforestr husk |
| highway_collapse | Highway Collapse | highway_collapse | 290, 580 | 60 | 1 | twin elevated spans at their reference headings (−13°…−18°), broken over the SW gorge, collapsed slab ramp, viaduct pillars |
| olive_grove | Olive Grove | olive_grove | 466, 596 | 42 | 1 | ~75 olive trees in terraced rows, bee hives (quest), shed, comms terminal (quest) |
| ruined_homestead | Ruined Homestead | ruined_homestead | 532, 624 | 34 | 2 | farmhouse, barn, stable, two roofless ruins |
| ancient_fort | Ancient Fort | ancient_fort | 610, 708 | 34 | 2 | hill fort turned −17.6° like the reference: curtain walls + merlons, 4 towers, 3-storey keep, chapel, transmitter |
| maintenance_bunker | Maintenance Bunker | maintenance_bunker | 635, 514 | 24 | 2 | half-buried bunker + purification tanks |
| broken_earth | Broken Earth | broken_earth | 670, 572 | 40 | 1 | crater trail, upturned slabs, downed ARK walkers |
| ridgeline | Ridgeline | ridgeline | 885, 436 | 52 | 1 | 17 m crest ridge with crags, observation deck (quest), huts |
| abandoned_housing_project | Abandoned Housing Project | abandoned_housing_project | 920, 316 | 44 | 2 | 10 prefab houses (some unfinished/open) |
| harvester_site | Harvester Clearing (label hidden) | — | 411, 286 | 0.5 | 3 | `bossPoi: ['queene']` at the reference Queen icon |
| matriarch_arena | Gate Yard (label hidden) | — | 636, 258 | 0.5 | 3 | `bossPoi: ['matriark']` at the reference Matriarch icon (open yard behind the gate) |

## Extracts (reference icon positions; engine structures from `engine/extracts.js`)
Every `extract()` sits at the reference icon with `face` (0 = +z) pointing its doorway / key post toward the
approach players arrive from. Airshafts get a levelled 13 m pad (`flatten`, concrete + gravel), a fence arc
behind, two light masts at 7 m and a vent housing — nothing inside the 5 m clear zone; hatches get a levelled
5 m gravel patch and nothing within 2 m. The rock outcrops are kept off all eight sites. The old placeholder
props (`gg_airshaft`, `gg_hatchsign`) and their marker lamps are gone; the structures light themselves.
| id | name | kind | x, z | face | site |
|---|---|---|---|---|---|
| warehouse_airshaft | Warehouse Airshaft | airshaft | 802, 281 | −1.53 (W, toward the yard gate) | the reference's fenced compound on the bench (9.5 m), yard levelled |
| cliffside_airshaft | Cliffside Airshaft | airshaft | 459, 218 | −1.11 (WSW) | rock shelf under the Sentinel tower |
| forest_airshaft | Forest Airshaft | airshaft | 273, 472 | −0.83 (SW) | clearing in the south-west woods |
| overlook_airshaft | Overlook Airshaft | airshaft | 679, 486 | 0.19 (S) | Overlook knoll |
| lucky_hatch | Lucky Hatch | hatch | 500, 108 | −0.79 | east end of the village street (the parked car moved off it) |
| reinforced_hatch | Reinforced Hatch | hatch | 216, 307 | 1.63 | forest track west of Trapper's Glade |
| prefab_hatch | Prefab Hatch | hatch | 955, 292 | −1.95 | east edge of the Housing Project |
| fragrant_hatch | Fragrant Hatch | hatch | 444, 527 | 1.57 | flower meadow north of the Olive Grove (an outcrop used to cross it) |

Player spawns: 21 reference "player spawn" icons (pulled inside the boundary cliff) + 2 extra (Pilgrim's
Peak courtyard, Maintenance Bunker) = 23.

## Key rooms (ids match the key items in `src/data/items.js`)
| room id | key item | where | x0,z0 – x1,z1 | tier-3 containers |
|---|---|---|---|---|
| village | green_gate_village_key | Village Key House (west cluster, locked front door), both floors | 312,80 – 325,92 | 10 |
| communication_tower | green_gate_communication_tower_key | Comms Tower Base, east room (Pilgrim's Peak NE shoulder), rotated, `poly` set | 939,88 – 955,103 (AABB) | 5 |
| cellar | green_gate_cellar_key | Farmhouse Cellar SW of the Olive Grove (reference "Cellar Key" icon) | 432,640 – 438,645 | 3 |
| cellar | green_gate_cellar_key | Trapper's Cellar in the glade cabin (the reference's second "Cellar Key" icon) | 250,294 – 256,304 | 4 |
| confiscation_room | green_gate_confiscation_room_key | north corner of the (rotated) Security Wing, underground; `keyRoom` carries `poly` | 574,184 – 588,198 (AABB) | 6 |
| patrol_car | patrol_car_key | armoured patrol car in the Traffic Tunnel (locked `car_trunk`) | 620,181 – 627,189 (AABB) | 1 |

Sealing check (debug 3D flood over the multi-level grid, every locked door closed): no key-room container is
reachable from any spawn; with the doors open all of them are (`leakClosed 0`, `reachOpen = n` for every room).

## Terrain approach (mountain valley)
* **Boundary**: a traced playable polygon; outside it a terraced limestone mountain (ridged noise quantised
  into 3.4 m steps) plus a guaranteed 8 m sheer cliff band right at the edge, so the valley is sealed
  (flood-fill check: every spawn/extract/container reachable, nothing outside).
* **Upper bench** (9.5 m, hard edges by a scanline `fillPoly` after the soft `raisePoly`) carries the gate
  complex. A lower **west corridor** shelf (5.6 m) and the **east fields** (6.6 m) step down to the valley
  floor (~3–6 m). **Pilgrim's Peak** is a 21 m plateau with a road ramp along its south face and a footpath
  ramp on its west face.
* ~220 **rock outcrops** (the pale crescents all over the reference): curved `ridge`s 2–6 m high with rock
  paint + gravel/dirt skirts + boulders/crags, avoiding POI footprints, roads and extraction sites. Boulders
  now reserve their footprint so loot scattered later never lands in a rock pocket. **Ridgeline** is a 17 m
  crest; the **Ancient Fort** sits on a 6.5 m hill; **Broken Earth** has craters with ragged mud/dirt paint.
* Water: the creek along the north edge into the NE lake, the SW gorge lake under the broken highway, a
  pond west of the Checkpoint woods.
* Roads: the highway causeway climbs from the collapsed spans (8 m) down to the Checkpoint (3.6 m) and up
  the gate ramp into the yard; concrete surfaces with prop lane markings.

## Levels (pass 3: multi-level engine)
**Underground halls.** Every tunnel space is an `under` hall (`building({ under: 4.5 })`): floor at 5.0 m, 1 m
earth walls inside the footprint, a walkable lid flush with the 9.5 m bench. The bench above the complex is
continuous ground again (rock, scrub and vent grates on the lids; props on a lid are cut away with it while
you are inside). Halls, all following the underground reference:
| hall | frame | entrances |
|---|---|---|
| Traffic Tunnel (32 m band, ~84°) | `hallDef` | open south mouth onto the yard; emergency stair up the west wall by the north cave-in; door gaps into the Vault Passage and the Headhouse Connector |
| Vault Passage → Data Vault | axis-aligned | Data Vault stair up its east wall; south door onto the junction pit (footbridge over it on the bench) |
| Security Wing + west block | gate frame | yard door; stair up into the guard post on the bench; west block's emergency stair; corridor door between the two |
| Maintenance Wing → Maintenance Hall | gate frame | yard mouth; stair up at the Warehouse's north door; Hall stair; NE mouth onto the junction pit |
| Maintenance Wing South | gate frame | off the Hall; south portal + ramp onto the east fields |
| Headhouse (sunk fan hall) + Connector | axis-aligned | ramp from the south plaza, stair to the bench-level gallery, drum stairs, ladder to the roof |
Openings onto sunk ground (tunnel mouths, junctions, the yard, the pit) are re-cut after every flatten.

**Upper floors and climbables.** Multi-storey houses (village, Pilgrim's Peak, the Reception wing, Gate
Control Room, Fort Keep, Prefab Houses, Pilgrim Lodge) have real floors: stairs planned along an outer wall
clear of doors and partitions, a landing that closes the stairwell margin at the top step, upstairs windows,
a partition and their own furniture + loot (`storey`). Ladders: every perch tower (deck 7 m), the comms tower
(10 m and 20 m platforms, terminal + loot on top), the Headhouse roof, the Reception / Control Room / Warehouse
roofs, the Fort Keep roof and two fort corner towers, the hostel roof. The Headhouse drum top (12.75 m) joins
the roof edge. Footbridge over the junction pit via `bridge()`.

**Checks.** A debug flood over the grid (column tops + floating spans + ladders, `STEP_H`/`BODY_H` rules)
from every spawn reaches every container on every level, every extract and every spawn (0 unreachable); per-
level images (lids, hall floors, each storey) were inspected for magenta (unreached) floor.

## Perched ARK (engine `y` / `yAbs`, facing `f`)
| perch | where | height | faces |
|---|---|---|---|
| gate sentry balcony (`gg_gatebalcony`) | Outer Gates, reference Sentinel icon | 8 m above the plaza | the Checkpoint plaza (SW) |
| perch tower (`gg_perchtower`, walkable deck 7 m, ladder) | 4 Checkpoint corners (turrets) | 7 m | the plaza centre |
| perch tower | west of the Checkpoint (Sentinel icon) | 7 m | the west woods + highway |
| perch tower | above the Cliffside Airshaft (Sentinel icon) | 7 m | the airshaft approach |
| perch tower on the Maintenance Hall lid | east of the Headhouse, at the reference Sentinel icon (774, 193) beside a pump hut | 16.5 m abs | the Warehouse yard (SW) |
| white lookout tower (`gg_perchtower_w`) | south of the Warehouse (quest) | 7 m, turret | the east fields |
| Headhouse roof hub | reference icon, roof centre | 13.65 m abs | south over the plaza |
| Comms Tower Base roof | reference icon at the base's west corner (Pilgrim's Peak) | 3.85 m above the plateau | the hostel's north yard and the west footpath |
| Traffic Tunnel floor | Sentinel + turret near the north cave-in | 0 m | down the band toward the yard |
| Security Wing turret | by the Confiscation Room | 0 m | toward the yard door |

**Sight through roofs.** `sim.canSee` is a grid ray now, sampled once per 0.5 m cell, so a steep look-down can
slip through a 0.3 m slab. Under the two perches that stand over halls (Headhouse hub, Maintenance Hall tower)
the roof is thickened (invisible solid, ≥ 2.2 m headroom left) and a pier / duct column fills the spot right
underneath. Raid check: players inside the Headhouse, the Maintenance Hall, the Comms Tower Base and the hostel
are never seen from the roof perches (`canSee: false` at every tested spot).

## Conditions
* **Harvester**: `spawnBoss: 'queene'` lands on `harvester_site` (411, 286), a scorched clearing west of the
  Checkpoint with wreck dressing; escorts gated `condition: 'harvester'`: 2 Hornetts, 1 Rocketier, 3 Wazps.
* **Matriarch**: `matriark` lands in the gate yard (`matriarch_arena`, 636, 258); escorts `condition: 'matriarch'`
  (3 Wazps over the yard, 2 Hornetts over the plaza); the yard's Leapr is `notCondition: 'matriarch'`.
* **Locked Gate**: a Bastian in the yard (`condition: 'locked_gate'`), the Pilgrim's Peak Rocketier pair
  (`escorts.pilgrims_peak` in conditions.js), and four `gg_printer` code printers with an `electronics`
  container (`note: 'security_code_printer'`) at Raider's Refuge, Pilgrim's Peak, Reinforced Reception and
  the Ancient Fort.
Verified in raids (`index.html?raid=green_gate&cond=harvester|matriarch`): the boss spawns in its arena, the
escorts only appear under their condition, no console errors.

## Quest / condition hooks placed
Boom box (`electronics`, `note: 'boom_box'`) on the village piazza; buses for the horn at the Checkpoint;
emergency siren by the Warehouse; white lookout tower south of the Warehouse; security desk in Reinforced
Reception; satellite dishes on the Bench Chapel north of the Data Vault; observation deck on the Ridgeline;
comms terminal by the Olive Grove; raider structure at Trapper's Glade; 6 `bee_hive` containers in the
Olive Grove; Bilgun's shelter at Barren Clearing; transmitter at the Ancient Fort; purification tanks at
the Maintenance Bunker; Deforestr husk (`deforestr_husk` container) at Adorned Wreckage; Barron husk at
Barren Clearing; Pilgrim's Peak comms tower (terminal on its 20 m platform); patrol car in the Traffic Tunnel.

## Accuracy fixes in pass 3
* Comms tower + its locked basement moved to the reference's NE shoulder of Pilgrim's Peak (lattice tower at
  ~953, 84; Sentinel on the base roof at the icon); a two-storey Pilgrim Lodge fills the complex's SE wing.
* East-of-Headhouse Sentinel tower moved 26 m west onto the reference icon (on the Maintenance Hall lid), with
  the small hut the blank map shows beside it.
* Security Wing grown by a west block to match the reference outline (≈ 62 × 42 m in the gate frame).
* Extraction sites rebuilt (see above); Warehouse Airshaft inside the reference compound.
* Surface over the tunnels is walkable bench with rock and scrub like the reference instead of sealed roofs.
* Village row houses: partition doors moved off the T-junction so every room (and the stairs) can be entered;
  the walled lane no longer runs through houses.
* Ridgeline boulders no longer spawn inside the prefab houses; Broken Earth's hard-edged mud polygon replaced.

## Counts (v3 build)
106 buildings (8 underground halls) · 19 736 props · 878 containers (443 t1 / 392 t2 / 43 t3) · 119 ARK spawn
groups (191 units incl. condition-only) · 8 extracts · 23 spawns · 26 POIs (2 hidden boss arenas) · 6 key-room
rects (5 ids) · 251 lamps · 18 ladders · 15 zones. Build ≈ 1.3 s map code + ≈ 2.4 s engine finalize in headless
Chromium (3.8 s; up to 6 s while the machine was heavily loaded).

## Deviations (forced by the top-down engine)
* **Perches** are lowered for readability: the gate Sentinel uses an 8 m balcony, not the pylon top.
* The Traffic Tunnel is one 32 m band; the reference's fan of lanes around the Headhouse drum is simplified
  to the band + the Headhouse Connector. Maintenance Wing South runs diagonally to the portal where the
  reference's leg turns south along x ≈ 780.
* The gate pylons/walls are solid set pieces; the pylons are scaled to 32 m.
* The Harvester set-piece structure (`spawnStructure: 'harvester'`) isn't placed by the engine yet; the Queene
  and her escorts use the clearing.

## Engine wishes (v4)
1. `grid.ray` / `los`: test the height interval a ray covers inside each cell (not one sample at the cell
   entry), so thin roofs, lids and decks block steep sight lines and shots without thickening.
2. Leaving an underground hall onto its own lid keeps the cutaway for ~1 s (the lid shows the hall below);
   snap `uCutH` back when the player's level changes by more than a storey.
3. `harvester` set-piece placement at the `bossPoi` arena (`spawnStructure`).
4. A building flatten that doesn't touch the terrain (`flatten: false`), so small huts can stand on a lid.
