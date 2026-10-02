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
| security_wing | Security Wing | security_wing | 584, 210 | 26 | 3 | underground, 45° block off the yard: 4 cells, guard room, **Confiscation Room** key room, stair-ramp up to Reception |
| maintenance_wing | Maintenance Wing | maintenance_wing | 721, 247 | 34 | 2 | underground, 45°: yard → 118 m Maintenance Hall (bays, trucks) → open junction pit → Data Vault; south leg → portal onto the east fields |
| reinforced_reception | Reinforced Reception | reinforced_reception | 566, 156 | 34 | 3 | blast-walled reception hall with the security desk (quest), ramp down into the Security Wing |
| headhouse | Headhouse | headhouse | 676, 190 | 32 | 2 | round concrete drum around the sunk ventilation hall (fans, grille roof), stair + ramp |
| data_vault | Data Vault | data_vault | 757, 130 | 26 | 3 | sunk server hall + strongroom; surface stair east; Bench Chapel with satellite dishes to the north |
| warehouse_complex | Warehouse Complex | warehouse_complex | 746, 289 | 46 | 2 | 54 × 60 m sunk hangar on the reference diamond (45°) with racks, office, loading office, siren, white lookout tower (turret) |
| pilgrims_peak | Pilgrim's Peak | pilgrims_peak | 925, 120 | 52 | 3 | 21 m plateau: complex on a 45° grid — hostel, refectory, research annex, cloister, 31 m comms tower + locked basement |
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
| cellar | green_gate_cellar_key | Trapper's Cellar in the glade cabin (the reference's second "Cellar Key" icon) | 250,294 – 256,304 | 4 |
| confiscation_room | green_gate_confiscation_room_key | north corner of the (rotated) Security Wing; `keyRoom` carries `poly` | 574,183 – 589,198 (AABB) | 6 |
| patrol_car | patrol_car_key | armoured patrol car in the Traffic Tunnel (locked `car_trunk`) | 620,181 – 627,189 (AABB) | 1 |

The communication tower room is also rotated now (AABB 948,122 – 964,138, `poly` set). Sealing check: the debug
flood-fill closes every locked door exactly like `sim._doorBlock` (rotation-aware `setTop`) and confirms no
key-room container is reachable from any spawn, while all of them are reachable with doors open.

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
Their parapet walls rise 0.5 m above the bench, so the surface above is partitioned like the real complex:
you get between bench sectors through the tunnels or the marked ramps/stairs.

**v2 (rotated buildings):** the halls now follow the underground map's own geometry. Everything around the
gate sits on a 45° "gate frame" (`gfDef(a0, a1, b0, b1)`: a = north-east into the complex, b = south-east along
the gate): Security Wing, Maintenance Wing + Hall, Warehouse diamond, Maintenance Wing South, Control Room,
the Checkpoint wings and the open **yard** pit behind the gate. The **Traffic Tunnel** is a 32 m band at its own
~84° heading (`hallDef(A, B, width)`), joined to the axis-aligned Vault Passage / Headhouse connector through
door gaps cut where the rotated east wall crosses them. A small open-sky **junction pit** links the Maintenance
Hall's north-east mouth to the Data Vault's south door. Ramps inside rotated rectangles use `rampLocal()`.
Connectivity: gate → yard → Traffic Tunnel north (cave-in, patrol car) → Vault Passage → Data Vault; yard NW →
Security Wing (cells, guard room, Confiscation Room) → stair-ramp up to the Reception courtyard; yard NE →
Maintenance Wing → Maintenance Hall → pit → Data Vault, Hall SE → Warehouse → Maintenance Wing South → portal
onto the east fields; Headhouse connector off the band. Surface entrances: Security Wing stair, Headhouse ramp
+ stair, yard stair to the Headhouse terrace, Data Vault stair, Warehouse NE/SW ramps, Control Room ramp, portal.

## Perched ARK (engine `y` / `yAbs`, facing `f`)
Every fixed Sentinel/turret has `f` (0 = +z/south, `atan2(dx, dz)`), its starting heading and sweep centre,
aimed over its intended field.
| perch | where | height | faces |
|---|---|---|---|
| gate sentry balcony (`gg_gatebalcony`) | Outer Gates, reference Sentinel icon | 8 m above the plaza | the Checkpoint plaza (SW, back to the gate); pylon tops (32 m) / wall walk (15 m) drew it 12–26 m up-screen, out of view |
| perch tower (`gg_perchtower`, deck 7 m) | 4 Checkpoint corners (turrets) | 7 m | the plaza centre |
| perch tower | west of the Checkpoint (Sentinel icon) | 7 m | the plaza's west woods + highway (ESE) |
| perch tower | above the Cliffside Airshaft (Sentinel icon) | 7 m | the airshaft and its approach (S) |
| perch tower | east of the Headhouse (Sentinel icon) | 7 m | the Warehouse yard (SW) |
| white lookout tower (`gg_perchtower_w`) | south of the Warehouse (quest) | 7 m, turret | the east fields (S) |
| Headhouse roof edge | south roof-edge railing, reference icon | 13.65 m abs | south over the ramp, plaza and Maintenance Hall roof |
| Pilgrim Hostel roof edge | cloister-side parapet, reference icon | 9.85 m above the plateau | the cloister and the west ramp |
| Traffic Tunnel floor | Sentinel + turret near the north cave-in | 0 m | down the band toward the yard |
| Security Wing turret | by the Confiscation Room | 0 m | down the wing toward its yard door |

**Roof perches and `sim.canSee`:** the engine hides a building's interior from observers above its roof only
when the observer's (x, z) is *outside* that building. A Sentinel standing on the roof centre is inside the
footprint and could still see (and laser) players in the hall below, which the raid check confirmed
(`canSee: true`). Both roof Sentinels therefore stand on the roof edge just outside the footprint. Checked
in a raid with `sim.canSee`: Headhouse, player inside → false, outside on the plaza → true; Hostel, player
inside → false, in the cloister → true, inside the Research Annex → false. Right under the Headhouse's 3.35 m
concrete collar is a natural dead zone.

## Conditions
* **Harvester**: `spawnBoss: 'queene'` lands on `harvester_site` (411, 286), a scorched clearing west of the
  Checkpoint with wreck dressing; escorts gated `condition: 'harvester'`: 2 Hornetts, 1 Rocketier, 3 Wazps.
* **Matriarch**: `matriark` lands in the gate yard (`matriarch_arena`, 636, 258); escorts `condition: 'matriarch'`
  (3 Wazps over the yard, 2 Hornetts over the plaza); the yard's Leapr is `notCondition: 'matriarch'`.
* **Locked Gate**: a Bastian in the yard (`condition: 'locked_gate'`), the Pilgrim's Peak Rocketier pair
  (`escorts.pilgrims_peak` in conditions.js), and four `gg_printer` code printers with an `electronics`
  container (`note: 'security_code_printer'`) at Raider's Refuge, Pilgrim's Peak, Reinforced Reception and
  the Ancient Fort.
Verified with `index.html?raid=green_gate&cond=harvester|matriarch|locked_gate`: the boss spawns in its
arena, the escorts only appear under their condition, and there are no console errors.

## Quest / condition hooks placed
Boom box (`electronics`, `note: 'boom_box'`) on the village piazza; buses for the horn at the Checkpoint;
emergency siren by the Warehouse; white lookout tower south of the Warehouse; security desk in Reinforced
Reception; satellite dishes on the Bench Chapel north of the Data Vault; observation deck on the Ridgeline;
comms terminal by the Olive Grove; raider structure at Trapper's Glade; 6 `bee_hive` containers in the
Olive Grove; Bilgun's shelter at Barren Clearing; transmitter at the Ancient Fort; purification tanks at
the Maintenance Bunker; Deforestr husk (`deforestr_husk` container) at Adorned Wreckage; Barron husk at
Barren Clearing; Pilgrim's Peak comms tower (LiDAR/terminal quests); patrol car in the Traffic Tunnel.

## Counts (v2 build)
101 buildings · 19 326 props · 695 containers (358 t1 / 283 t2 / 54 t3) · 117 ARK spawn groups (188 units incl.
condition-only) · 8 extracts · 23 spawns · 26 POIs (2 hidden boss arenas) · 6 key-room rects (5 ids) · 234 lamps
· 15 zones. Build ≈ 1.5 s map code + ≈ 1.8 s engine finalize in headless Chromium (3.3–4.6 s total by load).

## Deviations (forced by the top-down engine)
* **Tunnels** are a single-layer cut-and-cover network (above); the surface above them isn't walkable. Since
  v2 the halls are rotated to match the reference; the Vault Passage and Data Vault stay axis-aligned (they
  are close to it in the reference).
* **Perches** are lowered for readability: the gate Sentinel uses an 8 m balcony, not the pylon top, and the
  roof icons (Headhouse, Pilgrim's Peak) use a rim or tower beside the roof (see the perch table).
* **Multi-storey** buildings (hostel, keep, reception, control room) are one walkable floor with visual
  storeys; the gate pylons/walls are solid set pieces.
* The Harvester set-piece structure itself (`spawnStructure: 'harvester'`) isn't placed by the engine yet;
  the Queene and her escorts use the clearing.
* The gate pylons are scaled down to 32 m and the valley floor is slightly flattened so the Checkpoint and
  highway stay readable at the 40 × 22 m camera.

## Engine wishes (v3; the v1 wishes and v2 wishes 1–2 are done)
1. `sim.canSee` roof rule: also apply when the observer stands *on* the same building (its eye above
   floorY + h), so a Sentinel can sit at the centre of a roof icon without seeing into the room below.
2. A walkable roof deck / second height layer for the ground above the tunnels.
3. `harvester` set-piece placement at the `bossPoi` arena (`spawnStructure`).
