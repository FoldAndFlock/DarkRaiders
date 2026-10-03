# Dam Grounds (ARC Raiders: Dam Battlegrounds)

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

Smaller buildings get small hand angles (outposts, bunkers, huts, Scrap Yard sheds, farmhouse). 79 of
the 84 buildings are rotated.

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

## Multi-level content (third pass)

The engine's multi-level grid (floor slabs, walkable roofs, stairs, ladders, `under` halls, `bridge()`)
let the vertical parts of the reference come back. Everything below was checked with a per-level flood
fill (see **Counts and validation**) and by walking the stairs in a live raid.

**Real upper floors with loot** (stairs inside, furnished and lit per storey):

| Building | Storeys | Notes |
|---|---|---|
| Generator Hall | 2 + hall | Split into two 2-storey office wings either side of an 8.4 m generator hall; both wings have roof ladders |
| Power Control | 2 | Server room upstairs; roof ladder up to the Sentinal |
| Controlled Access Zone | 2 (3.6 m) | The gallery over the vault holds switches 3 and 4 and the fuel-cell receptacle. The vault stays sealed |
| Pipeline Pumphouse | 2 | Its upper east door opens onto the catwalk bridge to the tower |
| Floodgate Control, Intake House | 2 | Floodgate Control has a roof ladder up to the Sentinal |
| Primary Facility | 2 + hall | Split into a 2-storey office wing, an 8.4 m turbine hall and a 2-storey workshop wing; the annex is 2 storeys |
| Control Tower | base 2, tower 5 | See below |
| Research & Administration | 2 | Lab 1 upstairs over the reception; roof ladder, dishes and the Sentinal on the roof |
| Pattern House, Rubie Residence, Rubie Guesthouse, Ben Welda's Sunroof | 2 | Bedrooms and offices upstairs |
| Pale Apartments A and B | 3 | A has a common stairwell in the middle flat (two flights) and a roof ladder; B has two flights |
| Water Treatment Control | 2 | Now a tall pump hall (skylight roof, roof ladder) plus a 2-storey control block; the surveillance room is downstairs |
| Substation Control, Pump House | 2 | Both with roof ladders |
| Testing Annex | 2 (4.4 m) | Tall ground floor round the test rig, labs and offices upstairs, roof ladder |

**Control Tower.** A 2-storey base (44 x 28 m, open roof terrace) and a 12 x 12 m, 5-storey tower on
its north side. Four flights alternate up the tower. The tower's second floor opens onto the base's roof
terrace. The top floor is the glass control room: the locked `control_tower` key room is on storey 4,
west of a landing. A ladder from the landing reaches the walkable roof, which holds the antenna, the
dish and the red aviation light.

**Pipeline Tower catwalks.** Two octagonal catwalk rings (radius 6 m, 2.6 m wide) circle the tower at
HIGH + 3.2 and HIGH + 9.2. The lower ring connects to the pumphouse's upper door by a catwalk bridge
and to the deck by a ladder; a ladder joins the two rings. The turret stands on the upper ring.

**Underground halls** (`under`, lid flush with the ground, stairwells with guard rails):

| Hall | Where | Depth | Entrances |
|---|---|---|---|
| Floodgate Maintenance Tunnel | under the Floodgates crest, 104 m long | 6 m | stairwells at both ends (quest: the maintenance tunnels under the Floodgates) |
| Flood Access Tunnel | under the west end of the Red Lakes Balcony | 5.5 m | stairwells at both ends; its basin-side flood gate stays sealed |
| Turbine Gallery | under the Power Generation plateau, beside the turbine shafts | 5 m | stairwells at both ends; the power switch sits under the west stairs (quest) |
| Water Intake | under the east half of the WTC pump hall | 4.5 m | a stairwell in the pump hall (quest: the water intake below Water Treatment Control) |

**Walkways you can walk on and under:**
* The West Broken Bridge span is a real 10 m bridge at 12.4 m that ends in a sheer break. The raider
  hideout (battle-plans quest) is now in its shadow, under the deck between the pillars.
* The East Broken Bridge is a real 9 m span off the plateau abutment, broken off over the ravine.
* Service bridges cross each spillway chute head at u = 36. You can walk along them over the chutes,
  or walk down the chutes underneath.
* Catwalks cross the four flooded turbine shafts on the plateau. The pit walls have a gap where each
  catwalk lands.
* The clarifier has a walkable skimmer bridge across the tank.

**Roof access:** ladders on Generator Hall West and East Wings, Power Control, Floodgate Control, the
Primary Facility Offices, Research & Administration, Pale Apartments A, the Battleground Bunker, the WTC
pump hall, Substation Control, the Testing Annex and the Pump House. The Control Tower base terrace is
reached from the tower. Sentinels and turrets stand on the real roof surfaces, at `yAbs` = floor +
height + 0.25 (`C.roofY`).

**Stairs, as built:** flights are 1.4 m wide in the tower and 1.6 to 2.4 m elsewhere, kept off the
walls. Furniture keeps 1.8 m landings clear at the foot and the top. A landing plate fills the 0.5 m stairwell margin at the top end of
every flight, so walking off the last step never drops you back down. The AI nav reaches every upper
floor and hall.

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
| field_depot (x5) | Field Depot | field_depot | about (840, 181) · 517, 229 · about (507, 483) · 288, 414 · about (684, 548) | | 10 | 1 |

Every `poi` id used by `src/data/quests.js` for this map exists. That includes `field_depot`, which
appears 5 times, so "visit a Field Depot" works at any of them.

## Extracts

The structures (cargo elevator bunker with its call gantry and beacons, Raider Hatch with key post) are modelled,
lit and collided by `src/engine/extracts.js`. The elevator rig is a 7.5 × 7.5 m battered concrete bunker with the
call gantry at its front-right corner and a boarding apron to 5.25 m in front; `face` turns the doorway, and every
elevator keeps it within ~60° of the camera (0 = +z) so the open car reads from above. The map keeps the spot
clear (6.5 m round the bunker plus the approach in front; hatches 2.5 m) and dresses it: a 13 × 11 m concrete pad
with a hazard line across the end of the apron, a yard floodlight on the bunker corner farthest from the camera
(rot = face; it never stands in front of the bunker) and the lit `dg_extsign` board 1.5 m off the side wall nearer
the camera, turned to face the camera; hatches get a concrete apron and a `dg_hatchsign` post beside the key
reader, also facing the camera. (`C.lift` / `C.hatch` place dressing with `P2` = rig-local -> world, which matches
the rig's `rotation.y = face`; the old `rot: -face` on the signs and floodlight turned them by 2 × face and the
board clipped the bunker wall.) At the end of `vegetation()` loose ground clutter (debris, rubble, grass, reeds,
bushes, rocks, logs, trees) is removed from every bunker footprint, gantry and approach and from 2 m round every
hatch, after the fact so no random stream moves. The old placeholder pads, frames, rings and lamps are gone.
Checked in real raids after the rework: every call gantry, cabin and lever is on the walkable grid from a spawn,
the AI nav ends on every call point, cabin and lever (the north complex moved 1 m and the swamp lift turned so its
lever's 2 m nav cell is open), nothing clips a bunker, gantry or approach, and the open car reads at every lift.

| id | Name | kind | x | z | face | notes |
|---|---|---|---|---|---|---|
| north_complex_elevator | North Complex Elevator | elevator | 707 | 140 | −30° | on the Power Generation plateau east of Generator Hall, facing down the plateau (1 m east of the reference so the AI nav reaches the lever) |
| central_swamp_lift | Central Swamp Lift | elevator | 355 | 334 | −60° | at the boardwalk junction, doorway WSW toward the west boardwalk (−90° showed the doorway edge-on and the AI nav ended 1.5 m short of the lever); the lift shack moved off the boardwalks |
| water_treatment_elevator | Water Treatment Elevator | elevator | 443 | 477 | −32° | south edge of the Water Treatment plaza, facing the road |
| red_lakes_balcony_lift | Red Lakes Balcony Lift | elevator | 744 | 594 | 59° | north of the Testing Annex below the balcony, square to the Annex wall behind it, doorway ESE toward the basin (149° faced away from the camera) |
| sunroof_hatch | Sunroof Hatch | hatch | 318 | 194 | 90° | west of Ben Welda's Sunroof, facing the house |
| pump_house_hatch | Pump House Hatch | hatch | 884 | 302 | −90° | off the Pump House's west door |
| spillway_hatch | Spillway Hatch | hatch | 765 | 482 | 0° | in the basin by the leaking hydraulic pipes (quest) |
| good_ol_barrons_hatch | Good Ol' Barron's Hatch | hatch | 267 | 574 | 180° | alias `good_old_barons_hatch`, SE of the pump station, facing it |

`face` is in radians in the code (0 = +z). All hatches set `needsKey: 'raider_hatch_key'`. None of the
reference hatches sits over one of the new tunnels, so they stay surface hatches.

## Key rooms (`keyRoom` + door `locked: roomId`)

| room id | Room | level | bounding box of the turned room | locked door | containers |
|---|---|---|---|---|---|
| controlled_access_zone | Controlled Access Zone Vault (dam frame) | ground (9.0 m) | 662,200 to 690,225 | (672.5, 219.5) | 7 |
| control_tower | Control Tower control room (dam frame) | tower storey 4 (21.8 m) | 611,454 to 624,469 | (618.9, 466.8) | 6 |
| staff_room | Staff Room in Research & Administration (dam frame) | ground (9.0 m) | 555,508 to 577,529 | (568.2, 511.4) | 6 |
| surveillance | Surveillance Room in Water Treatment Control (−15°) | ground (3.4 m) | 369,446 to 388,461 | (375.8, 448.0) | 4 |
| testing_annex | Testing Annex Secure Lab (−60°) | ground (3.3 m) | 729,603 to 759,630 | (738.2, 622.1) | 4 |

Each `keyRoom` keeps the axis-aligned bounding box in x0..z1 and also carries `poly` (the 4 world
corners of the turned room), `storey`, `y0` and `y1`. Seal check (multi-level flood fill from a spawn):
with every door open each room is reachable (237 to 1365 interior samples). With every locked door
closed, **no** walkable surface inside any room's vertical extent is reachable: walkable roofs, the
floors above, upper windows (all with sills) and the stair holes do not open a way in. The vault, the
staff room and the secure lab have plain slabs above them; the control room's only openings are its
glass windows 13 m up and the locked door.

These match the `key.room` values of the `damn_grounds_*_key` items in `src/data/items.js`.
* Controlled Access Zone flavour: a fuel cell (blue barrel), four `dg_switch` panels, the 4-light
  `dg_puzzle` panel above the vault door, and a resource-lock fuse box.
* Control Tower: the glass control room is the tower's top floor (windows on three sides); its landing
  has the roof ladder.

## Spawns, Sentinels, Baron husks, bosses

* 22 player spawns on the reference spawn icons. A few moved 2 to 4 m off obstacles; the one at the Control Tower corner moved 14 m north to (592, 436), so the 4-storey tower no longer hides the player at insertion.
* Spawns keep 8 m clear of solid clutter and rocks (bots spawn in squads there).
* Sentinels (reference eye-diamond icons) sit on static perches. Roof perches use
  `yAbs = C.roofY(bb)` (the walkable roof surface, floor + height + 0.25):

  | Position | Perch | Absolute height |
  |---|---|---|
  | (733, 159) | Power Control roof (ladder) | 15.65 m |
  | (650, 263) | 4.2 m lattice mast (`dg_sentmast`) on the broken stub | 13.2 m |
  | (607, 344) | Floodgate Control roof (ladder) | 15.65 m |
  | (671, 338) | Fallen monolith in The Breach | 5.2 m |
  | (568, 397) | Gate Hut roof | 12.45 m |
  | (594, 538) | Research & Administration roof (ladder) | 15.65 m |

* Turrets stand on real roofs, placed clear of roof plant, masts and ladder heads: Generator Hall
  (17.65 m), Controlled Access Zone (16.45 m), the Control Tower roof (25.25 m), Testing Annex
  (12.35 m), Water Treatment Control (10.0 m), Primary Facility (17.65 m), Substation Control (9.85 m)
  and Pump House (7.35 m). One more is on the Pipeline Tower's upper catwalk (18.2 m).
* Ticks: two per large building on the ground floor, one more upstairs in R&A, WTC, the Testing Annex,
  Pale Apartments A (2nd floor), the Control Tower base and the Pipeline Pumphouse, and two in each
  tunnel (`yAbs` on the hall floor).
* Baron husks (reference rings) are now searchable `barron_husk` containers: The Breach (620, 316), Old
  Battleground (250, 322), southern swamp (324, 474).
* Boss arenas:
  * Harvester condition: the Queene spawns at **Red Lakes** (verified in a raid at (865, 367)).
    A hornet and rocketeer escort (`condition: 'harvester'`) is added, and the basin Leapr and the
    east Bombardeer stand down (`notCondition`). Third pass: Queene again at (861, 372).
  * Matriark condition: she spawns on **Tower Hill** (verified at (348, 681); third pass (347, 680))
    with a wasp and hornet brood.
  * Night raids add fireballs in the swamp and forest. Close Scrutiny adds a snitch over the Floodgates.

## Counts and validation (seed 4471, third pass)

* Buildings: 84, of which 79 are rotated (budget 300). 23 have walkable upper floors and 4 are underground halls.
* Props: about 19.8k (budget 30k)
* Containers: 827 (tier 1: 476, tier 2: 323, tier 3: 28), budget 900
* ARK spawn groups: 112, including 9 condition-gated
* Lamps: 494, of which 49 are mast/tower lights above 6 m
* Doors: 88 (5 locked). Ladders: 15.
* Zones: 22

Build time in headless SwiftShader on a 4-core box: `build()` takes 0.65 to 0.75 s and `finalize()`
(engine) 2.85 s, about 3.5 s in total. `mapview` reports 3.5 s at a load average of about 1. With the
box at a load average of 11 to 14 (other agents rendering), the total rose to 5.0 to 5.3 s and
`mapview` reported 5.4 s, still under the 6 s budget. Per-phase timings are on `world.buildTimings`.

Validation, using a multi-level flood fill over the collision grid from a spawn. Nodes are (cell,
walkable surface). The fill uses the grid's own `blockedAt` / `floorI` rules with the game's sub-step
movement, falls, one-cell stairwell hops and every ladder. Results:
* all 88 doors reachable (including the upper ones)
* all spawns, extracts and POI centres reachable
* 0 of 827 containers unreachable, on any level
* every storey of all 23 multi-storey buildings reachable (76 to 93% of interior samples; the rest is
  furniture and walls)
* all 4 halls reachable
* every laddered roof reachable
* both catwalk rings, both bridge decks, the chute service bridges, the shaft catwalks and the
  clarifier bridge reachable, and the ground under the bridges too
* key rooms sealed (above)

The AI nav graph (`g.sim.nav`, flooded from a spawn) reaches every upper storey, including the tower
top, and all four halls.

`index.html?raid=damn_grounds` runs with no console errors. Tested with 37 s of simulated raid per run
(ARK and bots active, the player hopping between upper floors and tunnels) under normal/noon,
harvester/dusk/rain, matriarch/dawn/fog and night_raid/night/storm. Screenshots per level are in the
pass-3 report.

## Layout notes and deviations (top-down adaptation)

* **Rotation (second pass).** The dam, its buildings, the Control Tower, the Controlled Access Zone and
  the other clearly turned POIs now match the reference angles (see **Turned frames**). Plot-level
  positions are unchanged from the first pass. Two things remain approximations of the stepped,
  overlapping concrete of the real dam:
  * the dam's surfaces are a handful of turned rectangles;
  * the spillway apron is a flat concrete band.
* **Verticality (third pass).** Upper floors, roofs, the Control Tower climb, the Pipeline Tower
  catwalks, the tunnels and the dam walkways are real now (see **Multi-level content**). Still flattened:
  * the Controlled Access Zone parkour and the snap-hook routes (no grapple in the game);
  * the stepped, overlapping concrete of the real dam's faces;
  * the third storey of the smaller blocks that the reference shows only as roofs.
* **The Breach** is a walkable gravel pass through the broken dam, from the swamp (MID) down to the
  basin (LOW). It has a crater pool, fallen slabs, a fallen monolith, and a collapsed slab ramp up onto
  the Floodgates.
* **Spillway chutes** are dry concrete ramps (hard-sided, with pier walls from the facade pass) from the
  crest down into the basin. Each has a radial floodgate, a hoist house, a gantry on every other bay and
  a trash rack. They are also extra routes between the dam and the basin.
* **Red Lakes** use a custom red water material. The swamp, the clarifier and the settling basins use a
  green-brown one. The turbine shafts and the breach pool use a dark one.
* **Broken bridges.** The West Broken Bridge is reached by an embankment from the north rim. A real
  span at 12.4 m continues from it and ends in a drop. The fallen span pieces lie in the hollow below, and
  the raider hideout (battle-plans quest) sits under the standing span. The East Broken Bridge continues
  the plateau highway as a real span and ends over the ravine.
* **Hydroponic Dome Complex (reworked in pass 3 from the blank render):**
  * three full domes: the archive dome with servers and electronics, and two garden domes, one of them
    at the end of the north–south glass tube;
  * a small dome by the east tube;
  * two arched greenhouse tubes;
  * two small sheds (irrigation, seed store);
  * no lab block, because the domes are the facility.

  Dome footings are ring walls with three entrances. The field depot moved to (517, 229).
* **Water Treatment Control (pass 3).** It is now a tall single-storey pump hall with a skylight roof and
  the Water Intake basement under its east half. Behind it is the 2-storey control block (surveillance
  room, offices, lab upstairs). This matches the reference's two-part outline. The clarifier has a
  walkable skimmer bridge.
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
  * extraction lights come from the engine's structures. The map adds a yard floodlight and a lit sign
    at elevators.
  * rooms upstairs and in the tunnels are lit at their own height (`lamp` `yAbs`)
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
* **Landmarks:** `dg_watertower`, `dg_beacon`, `dg_floodlight`, `dg_walllamp`,
  `dg_satdish`, `dg_antennamast`, `dg_radar`, `dg_crane`, `dg_sentmast` (Sentinal perch)
* **Industrial:** `dg_container(B,G)`, `dg_truck`, `dg_scaffold`, `dg_sign`, `dg_signred`,
  `dg_barrier`, `dg_fence`, `dg_rubble`, `dg_slab`, `dg_brokenspan`, `dg_hedgehog`, `dg_tent`,
  `dg_watchtower`, `dg_ventbox`, `dg_tankS`, `dg_stairs`
* **Furniture:** `dg_bed`, `dg_sofa`, `dg_table`, `dg_desk`, `dg_server`, `dg_console`, `dg_locker`,
  `dg_cabinet`, `dg_noticeboard`, `dg_vending`, `dg_medbed`
* **Gameplay flavour:** `dg_testrig`, `dg_puzzle`, `dg_switch`, `dg_emptrap`, `dg_bigwreck` (Baron
  husk / wreck hulk), `dg_huskbig`, `dg_goal`, `dg_grave`, `dg_memorial`, `dg_flagpole`
* **Extraction dressing / levels (pass 3):** `dg_extsign` (lit board beside an elevator), `dg_hatchsign`
  (hatch post sign), `dg_shaftrail` (guard rail round a stairwell on a tunnel lid). The placeholder
  `dg_ctrltop`, `dg_liftframe` and `dg_hatchring` were removed.

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
* `C.lift(id, name, x, z, face, {yAbs})` and `C.hatch(id, name, x, z, face)` place the extract with its
  facing, reserve the clearance and add the dressing.
* `C.bld` (pass 3) also does the following:
  * resolves `floorY` up front, so the heights of upper storeys and roofs are known;
  * adds upper-storey windows over the ground-floor openings (`upWin: false` to skip);
  * sets `floors: false` on multi-storey shells without stairs;
  * records per-storey keep-out zones (stairs, landings, holes, upper doors, ladder heads) that
    `C.furnish(..., { storey })` respects;
  * drops a landing plate over the stairwell margin at the top of every flight.

  `C.roofY(bb)` and `C.storeyY(bb, k)` give absolute heights. `C.P`, `C.Cn`, `C.F` and `C.IL` take
  `{ storey }`.
* `C.hall(G, {x, z, w, d, depth, top, stairs})` builds an underground hall and puts guard rails round
  its stairwells. Once it is registered, props, containers and lamps placed over it without a level go
  on the lid. Build a hall **after** any building that stands on it, because a later building's floor
  flatten would fill the hall back in. Keep the hall clear of that building's centre, because the
  engine samples `floorY` there.
* `frameWalls(..., { gap(u, v) })` leaves openings in the dam's edge walls where catwalks and bridges
  land.
* `facades()` turns every terrain drop into wall slabs.
* Scanline polygon masks plus coarse 4 m blurred masks keep terrain generation fast.

Validation used during development: the multi-level flood fill (above) and a nav-graph flood. Both
run as scratch pages and are not shipped.

## Engine wishes (after the third pass)

Done by the engine since the second pass: multi-level grid, walkable roofs, stairs, ladders,
underground halls, bridges, extraction structures, stacked doors, compact 12-level nav.

Found while building pass 3 (worked around in the map where possible):
1. **Stairwell margin at the top of a flight.** The slab opening is the flight plus 0.5 m on every side,
   so there is a 0.5 m drop between the last step and the floor above. Players hop it, but strict
   checks and the nav failed there. The map now adds a landing plate over the top-end margin. The
   engine could trim the opening at the top end.
2. **Interior ladder to `'top'`.** It teleports you into the 1 x 1 m roof hatch it cuts, so you fall
   back down. The Control Tower uses a free `ladder()` that lands beside the hatch.
3. **`bridge()` rails** run along both sides of every segment, so polygonal catwalks get rails crossing
   at the corners and the band closes. A per-side `rails: 'left'|'right'` option, or rails that stop
   short of the joints, would help. The map turns the rails off and adds short outer rails itself.
4. **Narrow walkways on a turned 0.5 m grid.** Thin rotated pieces are padded, so a 1.4 m flight or a
   2.4 m railed catwalk leaves about 0.7 m of centre band. Stairs are 1.6 to 2.4 m wide here and
   catwalks 2.6 to 3.2 m.
5. **`BotBrain.fight` divides by the target distance.** When two bots end up at exactly the same spot
   (pushed into the same corner), `d = 0` makes their position NaN, and `Grid.solidIn` then throws on
   `doorBlocks[undefined]`. This was seen under the matriarch condition near the (589, 795) spawn before
   the spawn clearance was widened. Suggested fix: `const d = Math.hypot(dx, dz) || 1e-3` in
   `bot_ai.js` `fight()`. The same guard would help `go()`.
6. **Rotated stair steps.** Steps are thin solids, so on a turned building they are padded by a quarter
   cell along the flight. A 0.5 m cell's footprint along a 30° flight is about 0.68 m, longer than a
   0.55 m step, so the 0.33 m walker circle can touch a cell two steps up (0.71 m) while its feet are
   still on the lower step. Walking straight up a turned flight jams on 1 to 5 of 7 parallel lines;
   the other lines, and every flight as a whole, are climbable (flood fill and nav both pass). Fix
   ideas: no padding for stair steps, or an allowance in `blockedAt` for stair cells (feet + 2 *
   STEP_H).
7. Earlier wishes still open: a polyline/curved wall primitive (dome footings, clarifier rim), and
   `mapview` drawing `keyRoom.poly`.
