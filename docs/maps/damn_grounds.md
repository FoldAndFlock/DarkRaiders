# Dam Grounds — design note

`src/maps/damn_grounds.js` (+ props in `src/maps/props_damn_grounds.js`, prefix `dg_`). 1100 × 825 m, north up.

## Concept
The regional hydro utility, **Synergy Power & Light**, missed one payment too many and the ARK came to
repossess it. A curved arch dam — **The Debt Ceiling** — holds back the **Overdue Reservoir** along the north
edge. Below it a sheer-walled gorge carries the tailrace south past the powerhouse, under a highway bridge
that has collapsed in the middle, and out onto the southern lowlands, where the utility's water treatment,
substation, tailings ponds and staff housing were left to the marsh, the raiders and the repo men.

Three levels: **PLAT** (≈14 m — both plateaus and the dam crest), **LOW** (≈2–4 m — the gorge floor and the
lowlands) and the reservoir surface just below the crest. The gorge splits the north half in two; the
plateaus meet only on the dam crest.

## Regions
| Region | Where | What it plays like |
|---|---|---|
| The Debt Ceiling | north-centre, crest x 455–715 / z 150–210 | A curved concrete arch, crest road on top (toll booth, wrecks, sandbag nests, floodlights, a sniper mast). Sheer concrete faces: down into the gorge on one side, into the reservoir on the other. The only high crossing between the plateaus. |
| The gorge | x ≈ 465–745, z 160–480 | 12 m rock walls. The powerhouse sits at the dam's foot; the tailrace basin and river run down the middle (wadeable). A concrete ledge road climbs the west wall (built up against the rock, its parapet carried on along the rim to the dam's west abutment), the **Corporate Ladder** stair house climbs the east wall, the dry **Spillway of Regret** chute comes down the east side. The **Bridge To Nowhere** crosses at z 360 with its middle span on the floor (both broken ends walled off). Opens south onto the lowlands. |
| West plateau | x 0–465, z 120–400 | The staff town: villa and marina on the reservoir shore, the Bottleneck intake tower on a causeway, apartment blocks, cottages, the head office and cafeteria, the Ivory Tower at the dam's west end, the Show Home cul-de-sac. Slopes gently (wooded) down to the lowlands in the south. |
| East plateau | x 715–1100, z 150–445 | Floodgates and the chute head, the Paywall compound, the Kale Bubble domes, the Impound Lot, the Eastside Squat, the Customer Retention Center. A grassy headland where it meets the reservoir and the NE hills. Ends in a sheer escarpment over the Red Ink Lakes: the **Bottom Line Balcony** promenade runs along its lip; the Bottom Line Steps and the east ramp road lead down. |
| The lowlands | south half | Liquid Assets water treatment and Overdraft Acres (west), the Beta Test Battlefield, the Surge Pricing Substation (centre), the tailings ponds (east), Without-A-Paddle Creek, the scrapyard, Recess Park and the water towers. |
| The Overdraft Marsh | south-west corner | Low, flooded cypress marsh with boardwalks: Soggy Bottom Outpost, Synergy Pumping Station. |
| The Ant Hills | south-east corner | Rolling wooded hills: the Ant Farm outpost on a hilltop, the Total Write-Off crash site, the Subprime Trailer Park at their foot. |

## Points of interest
Quest-referenced ids are marked ★ (ids are internal and never change).

| id | Name | What's there |
|---|---|---|
| field_depot ★ | Supply Shack (×5) | Resupply hut with a roof antenna: west plateau (388,366), gorge floor (652,238), east plateau (944,396), lowlands west (272,522), south (744,768). |
| dam_crest | The Debt Ceiling | Crest road, toll booth, crest wrecks, sandbag nests, pilasters on the downstream face, intake grilles on the upstream face. |
| generator_hall ★ | The Hamster Wheel | 64 m turbine hall at the foot of the dam: four turbines + generators, overhead gantry, consoles; penstocks from the dam face; a 3-storey control wing with roof ladder. |
| power_generation_complex ★ | Synergy Power & Light (In Receivership) | The whole powerhouse floor (map label hidden): turbine hall, control wing, maintenance shop, spare parts store, transformer yard + switch house, tailrace basin, the **Cable Vault** underground (vent shafts above, the power switch at the foot of the west stairs). |
| corporate_ladder | The Corporate Ladder | 4-storey stair house against the east gorge wall; enter from the gorge floor, climb, walk out of the top floor onto a bridge to the east plateau. Roof hatch ladder. |
| spillway_hatch ★ | The Spillway of Regret | Dry concrete chute from the floodgates down the east side of the gorge to a plunge pool; leaking hydraulic pipes, pump and valve by the **Spillway Doggy Door**. |
| floodgates ★ | Floodgates of Feedback | Radial gates and the gate deck at the chute head, Floodgate Control (2 storeys), the reservoir intake platform (the town's water supply), the **Floodgate Service Gallery** underground beside the chute. |
| west_broken_bridge ★ | The Bridge To Nowhere | Highway bridge across the gorge with its middle span collapsed onto the floor; cars on the deck, hazard crash walls across both broken ends, a ladder up at the break; the raider hideout and a lookout shack under the west span (desks, cabinets, notice board). |
| control_tower ★ | The Ivory Tower | 5-storey white tower at the dam's west end; locked top floor (**The Corner Office**), roof ladder, antenna and dish on the roof; plaza with flags, benches and an ARK husk displayed as corporate art. |
| pipeline_tower ★ | The Bottleneck | 3-storey intake tower on a caisson island in the reservoir (chest-high caisson wall, room to walk right round the tower), reached by a causeway bridge; pump on the ground floor, **the valve** on the top floor, roof hatch, sniper on the roof. |
| research_and_administration ★ | Department of Synergy | 2-storey head office: labs, server room, meeting room; reception with the notice board; **Lab 1** upstairs above the reception; locked **Mandatory Fun Room** (staff room); roof ladder, dishes. Synergy Cafeteria next door. |
| rubie_residence ★ | Golden Handshake Villa | The ex-CEO's 2-storey lakeside villa with garage, pool terrace and a quay into the reservoir; safe upstairs. |
| overdue_reservoir | Overdue Reservoir | The marina: boat rental hut, slipway, pier and rental boats, the **Boathouse Doggy Door**. |
| pale_apartments ★ | Shoebox Flats | Two 3-storey brick blocks (stairwells, six flats per block, desks and cabinets), courtyard, garages; the Middle Management Row cottages beside them. |
| pattern_house ★ | The Show Home | Cul-de-sac of model homes; the Show Home has the power switch + fuse box on the ground floor and an exterior ladder to the roof antenna. |
| controlled_access_zone ★ | The Paywall | Walled compound with turnstile booths and watchtowers; 2-storey vault building: lobby, server room, records, the locked **Premium Content Vault** (switch lights over its door), offices upstairs, turrets on the roof. |
| hydroponic_dome_complex ★ | The Kale Bubble | Three greenhouse domes (hydro racks, plants), polytunnels, the Microgreens Lab; the data archive (server + console) is in the middle dome. |
| impound_lot | The Impound Lot | Fenced lot of repossessed cars (some stacked), tow truck, ARK crates, the Repo Office. |
| raider_outpost_east ★ | The Eastside Squat | Raider shacks (HQ, bunkhouse, workshop, larder), tents, watchtower, campfire, caches. |
| red_lakes_balcony ★ | Bottom Line Balcony | Promenade on the escarpment lip: benches, coin binoculars, a lookout deck over the drop, the Visitor Center; the **Flood Access Tunnel** runs underneath (stairs at both ends). Customer Retention Center across the road. |
| water_treatment_control ★ | Liquid Assets Water Treatment | 2-storey control building (lab, control room, locked **Snooping Room** full of monitors), two clarifiers with bridge arms, four filter beds, chlorine shed, the pump hall (water intake) across the road. |
| overdraft_acres | Overdraft Acres | Farmhouse (2 storeys), barn, silos, a tractor, at the foot of the west slope. |
| old_battleground ★ | Beta Test Battlefield | **Participation Trophy Hill** with the old EMP trap and three fuse boxes on top, trenches, tank traps, a Legacy System wreck, husks, graves + memorial, the Beta Test field hospital, the **Beta Test Bunker** underground (three power switches, desks). |
| electrical_substation ★ | Surge Pricing Substation | Fenced transformer yard with gantries, 2-storey control house (empty fuse slot on the ground floor, the missing engineer's cot upstairs); power lines leave north up the gorge and east along the creek. |
| red_ink_lakes | The Red Ink Lakes | Six rust-red tailings ponds (shallow, wadeable) on raised berms with outfall pipes, warning signs, wrecks and the Pond Monitor Hut. Boss arena (Landlady). |
| testing_annex | Works-On-My-Machine Annex | 2-storey QA lab with test rigs; locked **Staging Environment**; rig yard outside. |
| subprime_trailer_park | Subprime Trailer Park | Six trailers, picnic tables, a fire, junk cars, east of the QA annex. |
| small_creek ★ | Without-A-Paddle Creek | The barrel truck stuck in the creek (two car trunks) with leaking drums, a footbridge, a fishing camp. |
| formikai_outpost ★ | The Ant Farm | Palisaded raider outpost on an Ant Hills hilltop: HQ (desk/cabinet), bunks, workshop, memorial with graves, watchtower, and the timber **flag platform** (ladder) on the north-west lip overlooking the Red Ink Lakes. **Ant Farm Doggy Door** below. |
| wreckage ★ | Total Write-Off | A crashed ARK lander strewn down the hillside, fires, ARK crates/husks to search. |
| scrap_yard ★ | Final Sale Scrapyard | Fenced yard of stacked cars, containers, a crane, the Final Sale Office (desks/cabinets); the little Beta Test cemetery (graves + memorial) just east of the fence. |
| recess_park | Recess Park | Football pitch with goals, swings and a slide, the park shelter, floodlights. Open sky. Boss arena (Helicopter Mom). |
| water_towers ★ | Drip Pricing Towers | Two water towers, the pump shed and a kickabout goal right under them. |
| south_swamp_outpost ★ | Soggy Bottom Outpost | Radio hut + stores on a mound in the marsh, radar mast, generator, boardwalks, the **Soggy Bottom Doggy Door**. |
| synergy_pumping_station | Synergy Pumping Station | 2-storey brick pump house in the marsh: big pumps and valves, outflow pipes. |

## Extractions
* Cargo elevators: **Elevator Pitch** (west plateau edge, 48,296), **The Down Round** (gorge floor, 538,286),
  **Bailout Lift** (east plateau edge, 1064,272), **Exit Interview Elevator** (south, 670,786).
* Doggy Doors (Doggy Door Key): **Boathouse Doggy Door** (marina, 322,176), **Spillway Doggy Door** (plunge pool, 706,314),
  **Soggy Bottom Doggy Door** (marsh, 134,620), **Ant Farm Doggy Door** (Ant Hills, below the outpost, 958,716).

## Key rooms
| room id | Name | Where |
|---|---|---|
| control_tower | The Corner Office | Ivory Tower, top floor (5th), west half. |
| controlled_access_zone | Premium Content Vault | The Paywall, ground floor behind the lobby. |
| staff_room | Mandatory Fun Room | Department of Synergy, ground floor, south-west corner (off the corridor). |
| surveillance | The Snooping Room | Liquid Assets Control, ground floor, north-east room. |
| testing_annex | The Staging Environment | Works-On-My-Machine Annex, ground floor, south-east room. |

## Underground and elevated
* Under halls: Floodgate Service Gallery, Flood Access Tunnel (under the balcony), Cable Vault (powerhouse),
  Beta Test Bunker.
* Bridges/decks you can walk on and under: the Bridge To Nowhere, the Bottleneck causeway, the crest gate deck,
  the Corporate Ladder bridge, the lookout deck, the villa quay, marina pier, intake platform, clarifier arms,
  tailrace catwalk and footbridges, the Ant Farm flag platform; marsh boardwalks.
* Multi-storey: Ivory Tower (5), Corporate Ladder (4), Bottleneck, Hamster Wheel control wing, Shoebox Flats (3 each),
  plus 2-storey offices, labs, houses and pump halls; ladders to most flat roofs.

## Edges and water
No dead ends: every drop a raider can walk or fall off leads somewhere they can walk back from (`tools/stucktest.mjs`
reports 0 trap areas).
* The reservoir banks shelve gently (≤ 0.7 m/m) from the shore to well under the water line: wade in, walk out.
  Where a structure stands over deep water (the dam's upstream face, the Bottleneck caisson, the causeway, the villa
  quay, the marina pier, the floodgate gate deck, the intake platform) its parapet or rails are too tall to climb (≥ 1.3 m).
* Tanks are chest-high or wadeable: the clarifier rings and filter-bed walls at Liquid Assets; the Hamster Wheel's
  tailrace basin is wadeable out through the tailrace.
* Solid scatter (rocks, rubble, trees) keeps off cliff feet, so nothing wedges a pocket against a wall.

## Condition features
* **Juice Cleanse** (harvester): The Landlady spawns at the Red Ink Lakes (`bossPoi: ['queene']`) with a
  Middle Manager pair + a Rocket Surgeon escort there; the ponds' Parkour Dad and the escarpment Shell Company
  stand down (`notCondition`).
* **Mom's Home** (matriarch): Helicopter Mom spawns over Recess Park (`bossPoi: ['matriark']`) with a Buzzkill
  swarm and Middle Managers.
* **Night Shift**: extra Hot Takes at the battlefield, the marsh and the Kale Bubble.
* **Audit Season**: a Narc patrols the dam crest.
* **Mass Layoffs**: eight extra wrecks with ARK husks (condition-gated containers + props).
* **Allergy Season**: extra plant containers in the wilds.
