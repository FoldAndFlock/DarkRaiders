# Damn Grounds (ARC Raiders: Dam Battlegrounds)

Module: `src/maps/damn_grounds.js` (id `damn_grounds`, seed 4471, 1100 x 825 m, north up).
Custom props: `src/maps/props_damn_grounds.js` (all kinds prefixed `dg_`).

## Reference mapping

Sources: `docs/ref/dam_annotated.jpg` (POIs, extracts, spawns, Sentinels, Baron husks, field depots,
key rooms) and `docs/ref/dam_blank.jpg` (clean render, used for building footprints, roads and rocks).

* Annotated reference (2400 x 1800 px) to world: **X = px / 2 - 90, Z = py / 2 - 18**. The playable
  area (about 2200 x 1650 px) fills `[0,1100] x [0,825]`. 1 px is about 0.5 m.
* Blank reference (4096 x 4096 px): X = (px - 1930) / 2.97 + 496, Z = (py - 1350) / 2.97 + 206.
* Legend checks: the eye-diamond icon is a **Sentinel** and the double ring is a **Baron husk**, so the
  Sentinel spawns below sit exactly on the reference icons.
* The Queen icon (♛) is at (862, 368) in the Red Lakes basin and the Matriarch icon is at (349, 680),
  south-east of the Water Towers. Both are now boss arenas (see **ARK** below).

## Turned frames (second pass, rotated buildings)

The reference dam and most POIs are turned. The map builds them in local frames (`frame()` in the module;
`GW` converts frame to world, `GL` world to frame):

| Frame | Pivot | Angle | Contents |
|---|---|---|---|
| `DAM` | (650, 300) | +30° | Everything on the dam, plus Pattern House and Raider Outpost East. Design coords are **(u, v)**: u points ESE toward the basin, v runs SSW down the dam. |
| `G_WTC` | (382, 436) | −15° | Water Treatment Control and its plaza and settling basins |
| `G_RUB`, `G_PALE`, `G_BEN` | own centres | −15° | Rubie Residence (villa, cottage, guesthouse, garden walls), Pale Apartments, Ben Welda's Sunroof |
| `G_TA` | (728, 630) | −60° | Testing Annex (the dam frame turned 90°) |
| `G_SS`, `G_ET`, `G_PH` | own centres | +30° | Electrical Substation yard, Electrical Tower, Pump House |

Smaller buildings get small hand angles (outposts, bunkers, huts, Scrap Yard sheds, farmhouse). 66 of
the 75 buildings are rotated; the hydroponics domes and lab stay square.

How the angles were measured: I de-rotated the blank render in each candidate frame
(`rotref.py` / `rotpoi.py`, kept in the scratchpad only) until the building edges and the yellow/pink
POI outlines of the annotated map lined up with the axes. In the dam frame the whole dam becomes one
straight vertical spine.

Dam layout in (u, v), all at HIGH (9 m) unless noted:
* **Power Generation plateau:** u −100..82, v −201..−112, with an east wing u 82..140, v −201..−138.
  The highway deck runs along v = −206.
* **Controlled Access Zone:** u −60..25, v −112..−40.
* **Pipeline Tower deck:** u 25..82, v −112..−54.
* **Broken stub above The Breach:** u −42..12, v −40..−26.
* **The Breach:** a gap from v −26 to 40. Its floor falls from swamp level (west) to basin level
  (east) and holds a crater pool, a fallen monolith, slabs and a rubble slope.
* **Floodgates crest:** u −32..18, v 40..152, with 7 spillway chutes at v = 52…136. The chutes are
  8 m wide ramps from u 18 to 58 between pier walls, ending on a concrete apron with puddles.
* **South platform** (Primary Facility, Control Tower, Research & Administration): u −50..82,
  v 150..242, plus a west wing toward Water Treatment.
* **Red Lakes Balcony walkway:** u 78..286, v 172..184.
* **Four flooded turbine shafts** on the plateau.

`frameWalls()` replaces the first pass's axis-aligned facade scan. It walks every edge of the turned
rects and drops 1.8 m-thick concrete wall pieces (≤ 6 m, rotated with the frame) wherever the ground
outside is more than 2.2 m lower. Parapets are added in coherent 14 m stretches. The turbine shafts
get the same walls facing inward.

## Terrain tiers

| Tier | Height | Where |
|---|---|---|
| LOW | 0 m | Spillway basin east of the dam: the Red Lakes (red water), the spillway stream, Spillway Hatch, Pump House |
| MID | 3 m | West swamp (water level 2.62 m, ponds deeper than 0.95 m are impassable), the southern forest with Small Creek, the SW fields |
| HIGH | 9 m | Dam crest monoliths, the Power Generation plateau, the Red Lakes Balcony walkway, the NE highland beyond the highway |

The dam runs NE to SW in steps. All vertical drops of more than 2.2 m get `damConcrete` facade slabs
(`facades()`), with parapets in 14 m stretches. Ramps between tiers:
* swamp to Controlled Access Zone (612,226)
* swamp to Floodgates (571,371)
* Water Treatment plaza to Primary Facility (455,445)
* Primary Facility to the clarifier yard (529,512)
* Research & Administration to the south road (579,560)
* balcony stairs to the field depot (699,548)
* balcony east end to Electrical Tower (819,597)
* Pipeline Tower service ramp into the basin (781,274)
* the collapsed slab inside The Breach (639,312)
* the north road climbing onto the plateau (616,92)
* the embankment onto the West Broken Bridge (496,4)

## POIs (`poi(id, name, x, z, r, {tier, aliases})`)

Names are lightly tweaked per ARCHITECTURE.md. `aliases` holds the snake_case of the original ARC Raiders name.

| id | Display name | Original (alias) | x | z | r | tier |
|---|---|---|---|---|---|---|
| west_broken_bridge | West Broken Bridge | west_broken_bridge | 540 | 17 | 35 | 1 |
| pattern_house | Pattern House | pattern_house | 688 | 54 | 30 | 2 |
| rubie_residence | Rubie Residence | ruby_residence | 368 | 84 | 45 | 2 |
| pale_apartments | Pale Apartments | pale_apartments | 258 | 170 | 38 | 2 |
| ben_weldas_sunroof | Ben Welda's Sunroof | ben_welders_sunroof | 336 | 200 | 24 | 2 |
| hydroponic_dome_complex | Hydroponic Dome Complex | hydroponic_dome_complex | 505 | 240 | 68 | 2 |
| generator_hall | Generator Hall | generator_hall | 668 | 125 | 34 | 2 |
| power_generation_complex | Power Generation Complex | power_generation_complex | 770 | 170 | 80 | 2 |
| raider_outpost_east | Raider Outpost East | raider_outpost_east | 876 | 160 | 30 | 1 |
| controlled_access_zone | Controlled Access Zone | controlled_access_zone | 669 | 226 | 32 | 3 |
| pipeline_tower | Pipeline Tower | pipeline_tower | 740 | 250 | 30 | 2 |
| east_broken_bridge | East Broken Bridge | east_broken_bridge | 928 | 236 | 35 | 1 |
| pump_house | Pump House | pump_house | 900 | 298 | 25 | 1 |
| the_breach | The Breach | the_breach | 630 | 306 | 36 | 2 |
| old_battleground | Old Battleground | old_battleground | 240 | 322 | 45 | 2 |
| central_swamp_lift | Central Swamp Lift | central_swamp_lift | 355 | 334 | 18 | 1 |
| floodgates | Floodgates | floodgates | 600 | 388 | 55 | 2 |
| water_treatment_control | Water Treatment Control | water_treatment_control | 386 | 440 | 36 | 2 |
| primary_facility | Primary Facility | primary_facility | 512 | 458 | 50 | 2 |
| control_tower | Control Tower | control_tower | 602 | 472 | 30 | 3 |
| research_and_administration | Research & Administration | research_and_administration | 580 | 518 | 34 | 3 |
| south_swamp_outpost | South Swamp Outpost | south_swamp_outpost | 220 | 468 | 36 | 1 |
| spillway_hatch | Spillway Hatch | spillway_hatch | 765 | 482 | 18 | 1 |
| red_lakes_balcony | Red Lakes Balcony | red_lakes_balcony | 714 | 546 | 55 | 2 |
| electrical_substation | Electrical Substation | electrical_substation | 380 | 582 | 36 | 2 |
| water_towers | Water Towers | water_towers | 296 | 640 | 36 | 1 |
| small_creek | Small Creek | small_creek | 568 | 606 | 40 | 1 |
| testing_annex | Testing Annex | testing_annex | 730 | 628 | 40 | 3 |
| electrical_tower | Electrical Tower | electrical_tower | 848 | 628 | 26 | 1 |
| scrap_yard | Scrap Yard | scrap_yard | 510 | 696 | 36 | 2 |
| wreckage | Wreckage | wreckage | 606 | 690 | 30 | 2 |
| formikai_outpost | Formikai Outpost | formicai_outpost | 528 | 796 | 34 | 2 |
| red_lakes | Red Lakes (boss arena, `bossPoi: ['queene']`) | red_lakes | 862 | 368 | 60 | 2 |
| tower_hill | Tower Hill (boss arena, `bossPoi: ['matriark']`) | tower_hill | 347 | 680 | 40 | 1 |
| field_depot (x5) | Field Depot | field_depot | about (840, 181) · 478, 244 · about (507, 483) · 288, 414 · about (684, 548) | | 10 | 1 |

Every `poi` id used by `src/data/quests.js` for this map exists. That includes `field_depot`, which
appears 5 times, so "visit a Field Depot" works at any of them.

## Extracts

| id | Name | kind | x | z | notes |
|---|---|---|---|---|---|
| north_complex_elevator | North Complex Elevator | elevator | 706 | 140 | on the Power Generation plateau, east of Generator Hall |
| central_swamp_lift | Central Swamp Lift | elevator | 355 | 334 | concrete pad in the swamp, where the boardwalks meet |
| water_treatment_elevator | Water Treatment Elevator | elevator | 440 | 484 | Water Treatment plaza |
| red_lakes_balcony_lift | Red Lakes Balcony Lift | elevator | 744 | 594 | north of the Testing Annex, below the balcony |
| sunroof_hatch | Sunroof Hatch | hatch | 318 | 194 | west of Ben Welda's Sunroof |
| pump_house_hatch | Pump House Hatch | hatch | 884 | 302 | west door of the Pump House |
| spillway_hatch | Spillway Hatch | hatch | 765 | 482 | in the basin, by the leaking hydraulic pipes (quest) |
| good_ol_barrons_hatch | Good Ol' Barron's Hatch | hatch | 267 | 574 | alias `good_old_barons_hatch`, SE of the pump station |

All hatches set `needsKey: 'raider_hatch_key'`.

## Key rooms (`keyRoom` + door `locked: roomId`)

| room id | Room | bounding box of the turned room | locked door | tier-3 containers |
|---|---|---|---|---|
| controlled_access_zone | Controlled Access Zone Vault (dam frame) | 662,200 to 690,225 | (672.5, 219.5) | 8 |
| control_tower | Control Tower control room (dam frame) | 589,455 to 633,488 | (608.0, 476.7) | 5 |
| staff_room | Staff Room in Research & Administration (dam frame) | 555,508 to 577,529 | (568.2, 511.4) | 4 |
| surveillance | Surveillance Room in Water Treatment Control (−15°) | 369,446 to 388,461 | (375.8, 448.0) | 5 |
| testing_annex | Testing Annex Secure Lab (−60°) | 729,603 to 759,630 | (738.2, 622.1) | 5 |

Each `keyRoom` keeps the axis-aligned bounding box in x0..z1 and also carries `poly`, the 4 world
corners of the turned room. Seal check, using the same flood fill from a spawn: with every door open,
each room is reachable (it has 544 to 1711 interior samples). With only its locked door closed, **0**
interior samples are reachable for all five rooms, so the rooms are sealed except through the locked
door.

These match the `key.room` values of the `damn_grounds_*_key` items in `src/data/items.js`.
* Controlled Access Zone flavour: a fuel cell (blue barrel), four `dg_switch` panels, the 4-light
  `dg_puzzle` panel above the vault door, and a resource-lock fuse box.
* Control Tower: a 20 m shaft (block) with the `dg_ctrltop` glass cab at 29 m (visual).

## Spawns, Sentinels, Baron husks, bosses

* 22 player spawns on the reference spawn icons (a few moved 2 to 4 m off obstacles).
* Sentinels (reference eye-diamond icons) sit on static perches (`arkSpawn` `y` / `yAbs`):

  | Position | Perch | Absolute height |
  |---|---|---|
  | (733, 159) | Power Control roof | 15.7 m |
  | (650, 263) | 4.2 m lattice mast (`dg_sentmast`) on the broken stub | 13.2 m |
  | (607, 345) | Floodgate Control roof | 15.7 m |
  | (671, 338) | Fallen monolith in The Breach | 5.2 m |
  | (568, 397) | Gate Hut roof | 12.5 m |
  | (594, 538) | Research & Administration roof | 15.7 m |

  These heights were checked in a live raid.
* Turrets sit on the roofs of:
  * Generator Hall
  * Controlled Access Zone
  * Control Tower
  * Testing Annex
  * Water Treatment Control
  * Primary Facility
  * Substation Control
  * Pump House

  Another turret sits on the Pipeline Tower catwalk.
* Baron husks (reference rings) are now searchable `barron_husk` containers: The Breach (620, 316), Old
  Battleground (250, 322), southern swamp (324, 474).
* Boss arenas:
  * Harvester condition: the Queene spawns at **Red Lakes** (verified in a raid at (865, 367)).
    A hornet and rocketeer escort (`condition: 'harvester'`) is added, and the basin Leapr and the
    east Bombardeer stand down (`notCondition`).
  * Matriark condition: she spawns on **Tower Hill** (verified at (348, 681)) with a wasp and hornet
    brood.
  * Night raids add fireballs in the swamp and forest. Close Scrutiny adds a snitch over the Floodgates.

## Counts (seed 4471, second pass)

* Buildings: 75, of which 66 are rotated (budget 300)
* Props: about 19.4k (budget 30k)
* Containers: 660 (tier 1: 399, tier 2: 233, tier 3: 28)
* ARK spawn groups: 102, including 9 condition-gated
* Lamps: 410, of which 47 are mast/tower lights above 6 m
* Doors: 81 (5 locked)
* Zones: 26

Build time: `build()` takes about 0.75 to 0.85 s and `finalize()` (engine) about 2.9 to 3.2 s, measured in
headless SwiftShader on a 4-core box. `mapview` reports 2.8 to 4.4 s, under the 6 s budget. Per-phase
timings are exposed on `world.buildTimings`.

Validation (flood fill over the collision grid from a spawn):
* all 81 doors passable
* all buildings, spawns and extracts reachable
* 0 of 660 containers unreachable
* key rooms sealed (above)
* about 93.7% of the map's cells walkable

`index.html?raid=damn_grounds` runs with no console errors under the normal, harvester, matriarch and
night_raid conditions.

## Layout notes and deviations (top-down adaptation)

* **Rotation (second pass).** The dam, its buildings, the Control Tower, the Controlled Access Zone and
  the other clearly turned POIs now match the reference angles (see **Turned frames**). Plot-level
  positions are unchanged from the first pass. Two things remain approximations of the stepped,
  overlapping concrete of the real dam:
  * the dam's surfaces are a handful of turned rectangles;
  * the spillway apron is a flat concrete band.
* **Verticality.** Upper floors, the Control Tower interior climb, the Controlled Access Zone parkour and
  snap-hook routes are flattened to one walkable floor (`storeys` is visual only).
  * The Control Tower top is a decorative cab on a shaft.
  * The Pipeline Tower is a solid landmark with catwalk rings.
  * The Flood Access Tunnel under the balcony and the Floodgate maintenance tunnels are represented by
    portals and signs only.
* **The Breach** is a walkable gravel pass through the broken dam, from the swamp (MID) down to the
  basin (LOW). It has a crater pool, fallen slabs, a fallen monolith, and a collapsed slab ramp up onto
  the Floodgates.
* **Spillway chutes** are dry concrete ramps (hard-sided, with pier walls from the facade pass) from the
  crest down into the basin. Each has a radial floodgate, a hoist house, a gantry on every other bay and
  a trash rack. They are also extra routes between the dam and the basin.
* **Red Lakes** use a custom red water material. The swamp, the clarifier and the settling basins use a
  green-brown one. The turbine shafts and the breach pool use a dark one.
* **Broken bridges.** The West Broken Bridge deck (12.4 m) is reached by an embankment from the north rim
  and ends in a drop. The span pieces lie in the hollow below, next to the raider hideout (battle-plans
  quest). The East Broken Bridge continues the plateau highway and ends over the ravine.
* **Hydroponic Dome Complex.** Two full domes (archive dome with servers and electronics, garden dome),
  two small domes, two arched greenhouse tunnels, a lab, a seed store and an irrigation shed. Dome
  footings are ring walls with two entrances each.
* **Wreckage** sits at the reference label (606,690) inside the southern forest. A second ARK debris site
  east of the creek ford fills the gap.
* **Additions (not on the reference):**
  * ruined workshop, garage and guard post between the Primary Facility and the substation (rubble shells
    there in the reference)
  * Ridge Bunker
  * a hill farmhouse and barn in the east
  * a few outskirts huts
  * the dirt-bike circuit west of the Water Towers (traced from the blank render)
* **Lighting:**
  * street lamps every ~34 m along asphalt roads
  * floodlights (`dg_floodlight`) and red beacons along the crest, balcony, plateau and broken bridges
  * a ceiling light in every furnished room (colour by room type), fires at camps
  * green glow on cargo elevators, amber on hatches
  * mast/tower lights restored now that the engine drops high fixtures to about 2.8 m and widens their
    range: red aviation lights on the Pipeline Tower, the scrap-yard and plateau cranes, the four water
    towers, the radar dome and the Electrical Tower pylon, plus a cyan wash from the Control Tower cab

## Custom props (`props_damn_grounds.js`)

* **Hydroponics:** `dg_dome`, `dg_arch`, `dg_hydrorack`, `dg_planter`
* **Swamp:** `dg_reeds`, `dg_grass`, `dg_lily`, `dg_willow`, `dg_cypress`, `dg_log`, `dg_stump`,
  `dg_toxic`
* **Power:** `dg_pylon`, `dg_cable40`, `dg_transformer`, `dg_fusebox`, `dg_generator`, `dg_turbine`
* **Dam:** `dg_floodgate`, `dg_gantry`, `dg_pipetower`, `dg_bigpipe`, `dg_valve`, `dg_pump`,
  `dg_spillgrate`, `dg_rail`
* **Landmarks:** `dg_watertower`, `dg_ctrltop`, `dg_beacon`, `dg_floodlight`, `dg_walllamp`,
  `dg_satdish`, `dg_antennamast`, `dg_radar`, `dg_crane`, `dg_sentmast` (Sentinal perch)
* **Industrial:** `dg_container(B,G)`, `dg_truck`, `dg_scaffold`, `dg_sign`, `dg_signred`,
  `dg_barrier`, `dg_fence`, `dg_rubble`, `dg_slab`, `dg_brokenspan`, `dg_hedgehog`, `dg_tent`,
  `dg_watchtower`, `dg_ventbox`, `dg_tankS`, `dg_stairs`
* **Furniture:** `dg_bed`, `dg_sofa`, `dg_table`, `dg_desk`, `dg_server`, `dg_console`, `dg_locker`,
  `dg_cabinet`, `dg_noticeboard`, `dg_vending`, `dg_medbed`
* **Gameplay flavour:** `dg_testrig`, `dg_puzzle`, `dg_switch`, `dg_emptrap`, `dg_liftframe`,
  `dg_hatchring`, `dg_bigwreck` (Baron husk / wreck hulk), `dg_huskbig`, `dg_goal`, `dg_grave`,
  `dg_memorial`, `dg_flagpole`

## Map-builder helpers worth reusing

These live in `makeCtx()`:
* `C.dbld` / `C.gbld` place buildings in a frame. Their contents use building-local offsets through
  `C.F` (furnish), `C.P` (prop), `C.Cn` (container), `C.IL` (light) and `C.K` (key room with `poly`).
  These wrap `world.local`.
* `C.lshape`, `C.lslope` and `C.lfill` do terrain work in a turned frame. `C.gfence` and `C.compound`
  build fenced yards and walled compounds in a frame.
* `C.bld` records door points.
* `C.furnish(type, rect, {tier, room})` places props along the walls, then containers, then a ceiling
  light.
* `C.clutter` and `C.loot` are aware of solid props, buildings and doors. They use a spatial hash
  that wraps `w.prop`.
* `C.powerLine` places pylons with sagging cables.
* `C.lift` and `C.hatch` build the extract dressing.
* `facades()` turns every terrain drop into wall slabs.
* Scanline polygon masks plus coarse 4 m blurred masks keep terrain generation fast.

Validation used during development: a flood fill over the collision grid checked that all buildings,
spawns, extracts and doors are reachable. 4 of 676 containers sit in tight spots.

## Engine wishes (after the second pass)

Done by the engine since the first pass: rotated buildings and blocks, static ARK perches,
condition-gated spawns, boss POIs, searchable Baron husks, water colours, the fast `raisePoly` path,
high-mounted lamps, and the lamp-post ring fix.

Still wished for:
1. Walkable roofs or mezzanines (a second walkable layer) for the Control Tower climb, the Pipeline
   Tower catwalks, the dam galleries and the Flood Access / maintenance tunnels. These are still
   portals, signs and decoration only.
2. A rotated `raiseRect` / `ramp` / `flatten` (or a `rot` option on them). The map does its own turned
   terrain ops (`C.lshape` / `C.lslope` / `C.lfill`).
3. A polyline/curved `wall` primitive for the dome footings and the clarifier rim (still rings of small
   blocks).
4. Rotated solid footprints for props (`prop` collision snaps to 0°/90°). Turned furniture and clutter
   in the 30° buildings use the nearer axis-aligned box.
5. The overview tool (`mapview` overview mode) could draw `keyRoom.poly` when present. It currently
   draws the bounding box.
