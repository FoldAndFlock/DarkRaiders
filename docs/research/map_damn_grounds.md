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
| field_depot (x5) | Field Depot | field_depot | 846,205 · 478,244 · 508,492 · 288,414 · 682,548 | | 10 | 1 |

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

| room id | Room | rect (x0,z0 to x1,z1) | locked door | tier-3 containers |
|---|---|---|---|---|
| controlled_access_zone | Controlled Access Zone Vault | 658,208 to 680,222 | (669.2, 222) | 7 |
| control_tower | Control Tower control room | 584,458 to 616,469 | (598.2, 469) | 5 |
| staff_room | Staff Room (Research & Administration) | 558,522 to 574,536 | (564.9, 522) | 5 |
| surveillance | Surveillance Room (Water Treatment Control) | 366,446 to 382,458 | (372.9, 446) | 5 |
| testing_annex | Testing Annex Secure Lab | 740,620 to 752,646 | (740, 630.9) | 4 |

These match the `key.room` values of the `damn_grounds_*_key` items in `src/data/items.js`.
* Controlled Access Zone flavour: a fuel cell (blue barrel), four `dg_switch` panels, the 4-light
  `dg_puzzle` panel above the vault door, and a resource-lock fuse box.
* Control Tower: a 20 m shaft (block) with the `dg_ctrltop` glass cab at 29 m (visual).

## Spawns, Sentinels, Baron husks

* 22 player spawns on the reference spawn icons (a few moved 2 to 4 m off obstacles).
* Sentinels (reference eye-diamond icons): (731,162) on the Power Control roof, (646,272), (607,345)
  on Floodgate Control, (668,340), (568,397), (592,542).
* Baron husks (reference rings): Old Battleground (256,330), southern swamp (325,474), south of the
  Water Towers (347,681).

## Counts (seed 4471)

* Buildings: 74 (budget 300)
* Props: about 19.6k (budget 30k)
* Containers: 676 (tier 1 about 420, tier 2 about 228, tier 3 28)
* ARK spawn groups: 95
* Lamps: about 410
* Doors: 80 (5 locked)
* Zones: 21

Build time: `build()` takes about 0.8 to 1.3 s and `finalize()` (engine) about 2.3 to 2.7 s, measured in
headless SwiftShader on a heavily loaded 4-core box. `mapview` reports 3.0 to 4.3 s. Per-phase timings are
exposed on `world.buildTimings`.

## Layout notes and deviations (top-down adaptation)

* **Rotation.** The reference's dam monoliths and buildings are rotated about 30°. `building()` is
  axis-aligned, so the dam is rebuilt as a staircase of axis-aligned monoliths that follows the same
  diagonal. Floodgates F1 to F4 step down to the SW. The Power Generation plateau is one polygon whose NE
  edge follows the elevated highway, like the reference band.
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
  * floodlights (`dg_floodlight`) and red beacons along the crest, balcony and plateau
  * a ceiling light in every furnished room (colour by room type), fires at camps
  * green glow on cargo elevators, amber on hatches
  * no lamps on tall masts, because light attenuation is 3D

## Custom props (`props_damn_grounds.js`)

* **Hydroponics:** `dg_dome`, `dg_arch`, `dg_hydrorack`, `dg_planter`
* **Swamp:** `dg_reeds`, `dg_grass`, `dg_lily`, `dg_willow`, `dg_cypress`, `dg_log`, `dg_stump`,
  `dg_toxic`
* **Power:** `dg_pylon`, `dg_cable40`, `dg_transformer`, `dg_fusebox`, `dg_generator`, `dg_turbine`
* **Dam:** `dg_floodgate`, `dg_gantry`, `dg_pipetower`, `dg_bigpipe`, `dg_valve`, `dg_pump`,
  `dg_spillgrate`, `dg_rail`
* **Landmarks:** `dg_watertower`, `dg_ctrltop`, `dg_beacon`, `dg_floodlight`, `dg_walllamp`,
  `dg_satdish`, `dg_antennamast`, `dg_radar`, `dg_crane`
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

## Engine wishes

1. Rotated buildings and blocks (an `angle` on `building()` / `block()`), so the 30° dam monoliths,
   the Control Tower and the CAZ can match the reference orientation.
2. Walkable roofs or mezzanines (a second walkable layer) for the Control Tower, the Pipeline Tower
   catwalks, the dam galleries and the Flood Access tunnels.
3. A polygon or polyline `wall` primitive (curved dome footings, clarifier rims). Rings are now made of
   many small blocks.
4. `raisePoly` with `blend = 0` should skip the per-vertex edge-distance loop (it is the slowest terrain
   call). The map uses its own scanline fill instead.
5. Lamp height vs range: lamps use 3D attenuation, so high-mounted lights barely reach the ground. A
   "ground-projected" or cone option for floodlights and beacons would help night readability.
6. A small ring or ripple artifact shows around lamp-post bases at night (also visible in `test_range`).
7. Water material per body is supported through `opts.material`. A first-class `color` option on
   `water()` / `waterPoly()` / `river()` would be nicer.
