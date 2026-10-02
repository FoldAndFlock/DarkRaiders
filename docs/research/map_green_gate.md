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
| checkpoint | Checkpoint | checkpoint | 521, 384 | 80 | 2 | 20 bldgs in two saw-tooth wings, kiosks + booms, gantry, buses/trucks, watchtowers, fences |
| gate_control_room | Gate Control Room | gate_control_room | 662, 337 | 26 | 3 | 2-storey control block on the bench lip, consoles over the yard |
| traffic_tunnel | Traffic Tunnel | traffic_tunnel | 637, 165 | 40 | 3 | underground (covered corridor); patrol-car key room, cave-in at the north end |
| security_wing | Security Wing | security_wing | 580, 191 | 26 | 3 | underground; cells, guard room, **Confiscation Room** key room, south leg exits to the Checkpoint |
| maintenance_wing | Maintenance Wing | maintenance_wing | 700, 294 | 30 | 2 | underground; yard → sunk Warehouse hangar → N to Data Vault, S portal to the east fields |
| reinforced_reception | Reinforced Reception | reinforced_reception | 566, 156 | 34 | 3 | blast-walled reception hall with the security desk (quest), ramp down into the Security Wing |
| headhouse | Headhouse | headhouse | 676, 190 | 32 | 2 | round concrete drum around the sunk ventilation hall (fans, grille roof), stair + ramp |
| data_vault | Data Vault | data_vault | 757, 130 | 26 | 3 | sunk server hall + strongroom; surface stair east; Bench Chapel with satellite dishes to the north |
| warehouse_complex | Warehouse Complex | warehouse_complex | 746, 289 | 46 | 2 | 68 × 66 m sunk hangar with racks, offices, loading office, siren, white lookout tower |
| pilgrims_peak | Pilgrim's Peak | pilgrims_peak | 925, 120 | 52 | 3 | 21 m plateau: hostel, refectory, research annex, cloister, 31 m comms tower + locked basement |
| village | Village | village | 372, 88 | 100 | 2 | 34 gabled stone houses in two clusters, chapel + piazza (boom box), walled lanes, key house |
| barren_clearing | Barren Clearing | barren_clearing | 168, 158 | 32 | 1 | scorched clearing, downed Barron husk, Bilgun's shelter |
| raiders_refuge | Raider's Refuge | raiders_refuge | 304, 206 | 22 | 1 | hidden raider camp in the forest (shack, tents, campfire, antenna) |
| trappers_glade | Trapper's Glade | trappers_glade | 282, 292 | 32 | 1 | trapper cabin + store room, raider structure (roof-plates quest), small watchtowers |
| adorned_wreckage | Adorned Wreckage | adorned_wreckage | 205, 360 | 50 | 2 | crashed hull rings/engines/fins in a gouged trail, cloth + lanterns + totems, Deforestr husk |
| highway_collapse | Highway Collapse | highway_collapse | 290, 580 | 60 | 1 | twin elevated spans broken over the SW gorge, collapsed slab ramp, viaduct pillars |
| olive_grove | Olive Grove | olive_grove | 466, 596 | 42 | 1 | ~75 olive trees in terraced rows, bee hives (quest), shed, comms terminal (quest) |
| ruined_homestead | Ruined Homestead | ruined_homestead | 532, 624 | 34 | 2 | farmhouse, barn, stable, two roofless ruins |
| ancient_fort | Ancient Fort | ancient_fort | 613, 717 | 34 | 2 | hill fort: curtain walls + merlons, 4 towers, 3-storey keep, chapel, transmitter |
| maintenance_bunker | Maintenance Bunker | maintenance_bunker | 635, 514 | 24 | 2 | half-buried bunker + purification tanks |
| broken_earth | Broken Earth | broken_earth | 670, 572 | 40 | 1 | crater trail, upturned slabs, downed ARK walkers |
| ridgeline | Ridgeline | ridgeline | 885, 436 | 52 | 1 | 17 m crest ridge with crags, observation deck (quest), huts |
| abandoned_housing_project | Abandoned Housing Project | abandoned_housing_project | 920, 316 | 44 | 2 | 10 prefab houses (some unfinished/open) |

## Extracts (reference icon positions; vents are solid, the extract marker sits on their south apron)
| id | name | kind | x, z | needs |
|---|---|---|---|---|
| cliffside_airshaft | Cliffside Airshaft | airshaft | 460, 224 | — |
| warehouse_airshaft | Warehouse Airshaft | airshaft | 806, 289 | — |
| forest_airshaft | Forest Airshaft | airshaft | 273, 478 | — |
| overlook_airshaft | Overlook Airshaft | airshaft | 680, 492 | — |
| lucky_hatch | Lucky Hatch | hatch | 500, 108 | raider_hatch key |
| reinforced_hatch | Reinforced Hatch | hatch | 216, 306 | raider_hatch key |
| prefab_hatch | Prefab Hatch | hatch | 955, 292 | raider_hatch key |
| fragrant_hatch | Fragrant Hatch | hatch | 444, 527 | raider_hatch key |

Player spawns: 21 reference "player spawn" icons (pulled inside the boundary cliff) + 2 extra (Pilgrim's
Peak courtyard, Maintenance Bunker) = 23.

## Key rooms (ids match the key items in `src/data/items.js`)
| room id | key item | where | x0,z0 – x1,z1 | tier-3 containers |
|---|---|---|---|---|
| village | green_gate_village_key | Village Key House (west cluster, locked front door) | 312,80 – 325,92 | 6 |
| communication_tower | green_gate_communication_tower_key | Comms Tower Base, east room (Pilgrim's Peak) | 956,84 – 964,98 | 5 |
| cellar | green_gate_cellar_key | Farmhouse Cellar SW of the Olive Grove (reference "Cellar Key" icon) | 432,640 – 438,645 | 3 |
| confiscation_room | green_gate_confiscation_room_key | west end of the Security Wing | 546,182 – 560,192 | 6 |
| patrol_car | patrol_car_key | armoured patrol car in the Traffic Tunnel (locked `car_trunk`) | 638,135 – 645,146 | 1 |

## Terrain approach (mountain valley)
* **Boundary**: a traced playable polygon; outside it a terraced limestone mountain (ridged noise quantised
  into 3.4 m steps) plus a guaranteed 8 m sheer cliff band right at the edge, so the valley is sealed
  (flood-fill check: every spawn/extract/container reachable, nothing outside).
* **Upper bench** (9.5 m, cliff edges via `raisePoly` blend 0) carries the gate complex: Reception,
  Headhouse, Data Vault, Warehouse, Control Room. A lower **west corridor** shelf (5.6 m) and the **east
  fields** (6.6 m) step down to the valley floor (~3–6 m). **Pilgrim's Peak** is a 21 m plateau with a road
  ramp along its south face and a footpath ramp on its west face.
* ~220 **rock outcrops** (the pale crescents all over the reference): curved `ridge`s 2–6 m high with rock
  paint + gravel/dirt skirts + boulders/crags, avoiding POI footprints and roads. **Ridgeline** is a 17 m
  crest; the **Ancient Fort** sits on a 6.5 m hill; **Broken Earth** has craters.
* Water: the creek along the north edge into the NE lake, the SW gorge lake under the broken highway, a
  pond west of the Checkpoint woods.
* Roads: the highway causeway climbs from the collapsed spans (8 m) down to the Checkpoint (3.6 m) and up
  the gate ramp into the yard (6.5 m); concrete surfaces with prop lane markings (the terrain atlas'
  asphalt has fixed N–S dashes that look wrong on diagonals).

## Underground tunnels (engine has one layer)
Represented as **cut-and-cover corridors**: long `building()`s whose floor is pinned at 6.5 m (`floorY`,
blend 0) inside the 9.5 m bench, with moss-covered roofs + vent grates that fade when you enter (peek 0.9).
Their parapet walls rise 0.5 m above the bench, so the surface above is partitioned exactly like the
real complex: you get between bench sectors through the tunnels or the marked ramps/stairs. Connectivity
follows the underground map: Outer Gates → yard → **Traffic Tunnel** north (cave-in at the far end, patrol
car) → **Vault Passage** east → **Data Vault**; Traffic Tunnel west → **Security Wing** (confiscation room,
cells, guard room) → south leg → portal onto the Checkpoint's north edge; yard east → **Maintenance Wing**
→ sunk **Warehouse** hangar → north leg (to the Vault) and south leg → portal onto the east fields;
**Headhouse** connector off the Traffic Tunnel. Surface entrances: Reception ramp, Headhouse ramp + stair,
Data Vault stair, Warehouse north/east ramps, Control Room ramp, the yard stair and the two portals.

## Quest / condition hooks placed
Boom box (`electronics`, `note: 'boom_box'`) on the village piazza; buses for the horn at the Checkpoint;
emergency siren by the Warehouse; white lookout tower south of the Warehouse; security desk in Reinforced
Reception; satellite dishes on the Bench Chapel north of the Data Vault; observation deck on the Ridgeline;
comms terminal by the Olive Grove; raider structure at Trapper's Glade; 6 `bee_hive` containers in the
Olive Grove; Bilgun's shelter at Barren Clearing; transmitter at the Ancient Fort; purification tanks at
the Maintenance Bunker; Deforestr husk (`deforestr_husk` container) at Adorned Wreckage; Barron husk at
Barren Clearing; Pilgrim's Peak comms tower (LiDAR/terminal quests); patrol car in the Traffic Tunnel.

## Counts (final build)
105 buildings · 19 314 props · 692 containers (363 t1 / 278 t2 / 51 t3) · 111 ARK spawn groups (175 units)
· 8 extracts · 23 spawns · 24 POIs · 5 key rooms · 232 lamps · 15 zones. Build ≈ 1.5 s map code + ≈ 2 s
engine finalize in headless Chromium (3.5–4.6 s total depending on machine load).

## Deviations (forced by the top-down engine)
* **Tunnels** are a single-layer cut-and-cover network (above) and axis-aligned (the reference halls run
  diagonally); the surface above them isn't walkable.
* **Sentinels / turrets** sit at the foot of their perches (gate pylons, watchtowers, hostel roof, comms
  tower, fort tower, Headhouse ramp) because the sim spawns static ARK on the terrain; `perch` / `y`
  (metres above ground) are stored on the spawn for future elevated emplacements. Watchtowers only
  collide at their legs so a base emplacement can see out.
* **Multi-storey** buildings (hostel, keep, reception, control room) are one walkable floor with visual
  storeys; the gate pylons/walls are solid set pieces.
* **Boss conditions** (Harvester/Queene, Matriarch) and the Locked Gate escorts are not hard-placed — the
  sim spawns `spawnBoss` at a random POI and does not filter spawns by condition.
* The gate pylons are scaled down to 32 m and the valley floor is slightly flattened so the Checkpoint and
  highway stay readable at the 40 × 22 m camera.

## Engine wishes
1. Honour `arkSpawn(..., { y })` for static ARK (perched Sentinels on pylons/towers/roofs) and gate spawns
   by `condition` (e.g. `{ condition: 'locked_gate' }`).
2. A walkable "roof deck" for buildings (or a second height layer) so the ground above the tunnels can be
   crossed; alternatively rotated `building()` footprints for the diagonal tunnel halls.
3. Loot tables for the `barron_husk` / `deforestr_husk` container kinds (currently fall back to `crate`;
   `arc.js` already has their loot lists) and an "AIRSHAFT" interaction label (currently "CALL ELEVATOR").
4. `bossPoi` support in `populate()` (Harvester at a fixed site) and a `poi` field on containers/spawns.
5. `raisePoly` with `blend 0` still computes edge distances for every outside vertex — skipping that would
   halve terrain build time for cliff-heavy maps.
