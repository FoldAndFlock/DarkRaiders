# Green Gate — design note

`src/maps/green_gate.js` (+ props in `src/maps/props_green_gate.js`, prefix `gg_`). 1100 × 825 m, north up.

## Concept
A forested mountain valley run by the **Gatekeeping Department**, the ARK's most passive-aggressive
checkpoint. The highway comes in from the west on a causeway across **Lake Liquidity**, whose middle spans
dropped into the shallows years ago ("Infrastructure Week"). It queues through the **Toll Booth of Eternal
Hold Music**, then runs east to the gate: two towers, a sliding gate jammed two-thirds shut (Forgot My
Password) and a road tunnel, **Tunnel Vision**, cut straight into **the Shelf**, a raised plateau on the
east side. Around the valley: a terrace village, an old fort on the north spur, a quarry and a sawmill in the
northern woods, a corporate wellness retreat on a mesa in the south, and a crash site that someone has
arranged for good energy flow.

Levels: valley floor ≈ 3–6 m (the gate apron and the tunnels are 5 m), the **Shelf** 10.5 m (tunnel lids
are its surface), the **north spur** 15 m (Fort Knocks), the **mesa** 21 m (Peak Performance Retreat).
Lake Liquidity's level is 1.6 m; Grace Period Creek runs into it down a gorge cut through the village terrace.

## Regions
| Region | Where | What it plays like |
|---|---|---|
| Lake Liquidity | centre-west, x 190–385 / z 340–455 | Deep lake crossed by the highway causeway (7.6 m deck). The middle spans lie tilted in the shallows: walk down the slabs, wade the sand bar, climb up the other side. Boathouse and pier on the north shore, the purification bunker on the south-east shore. |
| North-west terrace | x 110–300, z 25–250 | Lower Foreclosure, a street village on a terrace ~7 m up, cut off from the east by the Grace Period Creek gorge (one wooden bridge; the creek is wadeable near the lake). Fixer-Upper Farm on the slope below, woods along the west edge. |
| Northern woods | x 320–870, z 20–250 | Dense forest between the creek and the Shelf. The north spur pushes in from the mountains with Fort Knocks on its nose (ramp road from the east, a footpath from the west). Quarry pit on the spur's east flank, Free Trial Glade and the sawmill further east. |
| Highway corridor | x 440–870, z 300–470 | Toll plaza, open meadows (Clear-Cut Savings, the Juicer Meadow), then the gate apron at tunnel-floor height, the reception north of it and the warehouses south of it. |
| The Shelf | east, x 860–1070, z 110–615 | 6 m cliffs on the valley side; three ramps (north road past the reception, south road from the warehouse yard, the Scenic Overlook ridge). Underneath: Tunnel Vision with the Server Gallery → the Cloud (Basement), the Pothole Repair Depot and the Head Office Plant Room. On top: the chapel, the vault's emergency stair, Coming Soon Estates, the Head Office and the Rage Quit Airshaft, wind-bent pines and rock. |
| The south | x 360–720, z 470–815 | Terraced olive orchard under the mesa's west cliff; the mesa with the retreat (ramp road from the north-east, footpath from the orchard); the Buy The Dip crater trail between the highway and the mesa road. |
| South-west woods | x 40–350, z 440–800 | Dense woods: the Feng Shui Crash Site and the Hedge Fund, Squatters' Rights in the far corner. |
| South-east | x 740–1000, z 560–800 | The Scenic Overlook ridge falling off the Shelf, the white lookout tower, open meadows (Mom's Landing) and the Glamping Pyramid Scheme. |

## Points of interest
Quest-referenced ids are marked ★ (ids are internal and never change).

| id | Name | What's there |
|---|---|---|
| gatekeeping_department | Gatekeeping Department | The gate: north tower (Lost & Confiscated), south tower (Password Reset Center), jammed sliding leaves, the gate walk (sentinel) between the towers' top floors, curtain walls into the Shelf; apron with PLEASE HOLD paint, gantry, truck queue, turnstiles, turret towers; gate yard and the tunnel portal behind. |
| gate_control_room | Password Reset Center | Top floor of the south tower: consoles along the windows over the gate and the apron. Forgot My Password unlock point. |
| reinforced_reception ★ | Take-a-Number Reception | Fortified 2-storey visitor centre north of the apron: waiting room with benches, ticket machine and the security desk; offices; security-code printer; sandbags, barriers, guard booth; turret on the roof. |
| traffic_tunnel ★ | Tunnel Vision | 160 m road tunnel into the Shelf: abandoned traffic, emergency cabinets, a cave-in at the far end, the armoured patrol car (locked trunk). Openings to the Server Gallery (north), the Pothole Repair Depot and the Head Office Plant Room (south). |
| data_vault ★ | The Cloud (Basement) | Server vault under the Shelf at the end of the 100 m Server Gallery: rows of racks, a strongroom, an emergency stair up to the Shelf. The **Chapel of Five-Nines Uptime** (satellite dishes on the roof, a server rack for an altar) stands on the Shelf just north of it. |
| headhouse ★ | Head Office | 2-storey ventilation headhouse on the Shelf with exhaust fans on the roof; next to it the stair down into the **Head Office Plant Room** (four giant fans), which opens into Tunnel Vision. |
| warehouse_complex ★ | Unfulfillment Center | Logistics yard south of the apron: two hangars, Dispatch Office, Returns Desk (Closed), container stacks, loading bays, trucks, the emergency siren; the white lookout tower stands just south of the yard. |
| abandoned_housing_project ★ | Coming Soon Estates | Unfinished luxury cul-de-sac on the Shelf: villas (some only shells), the Sales Pavilion (Deposit Non-Refundable), dry fountain, hedges, Phase 2 lots with rebar and a crane, the COMING SOON billboard. |
| ridgeline ★ | Scenic Overlook (Premium Tier) | The Shelf's south-west promontory and the rocky ridge running down from it: raised observation deck with coin binoculars and a dish, ticket hut, ridge hut. |
| checkpoint ★ | Toll Booth of Eternal Hold Music | Toll plaza on the highway: booth line under a walkable canopy with a NOW SERVING board (ladder at its south end), queued buses, trucks and cars, Customer Disservice Centre (2-storey offices), Hold Music Studio, Bus Depot (Next Bus: Never), Staff Barracks, turret towers. |
| highway_collapse ★ | Infrastructure Week | The causeway across Lake Liquidity: two surviving deck runs with wrecks and BRIDGE OUT boards, the fallen middle spans tilted into the shallows. |
| lake_liquidity | Lake Liquidity | Liquidity Boathouse and pier with rowboats on the north shore. |
| maintenance_bunker ★ | Deferred Maintenance Bunker | Half-buried water purification bunker on the lake's south-east shore: settling tanks, intake pump, pipes, the desk with the blueprints. |
| village ★ | Lower Foreclosure | Street village on the terrace: main street and cross street, Repossession Square (well, market stalls with the boom box, café tables), Chapel of Late Payments, The Interest-Only Inn, the walled Landlord's Holiday Home, the village barn, the creek bridge. |
| ruined_homestead ★ | Fixer-Upper Farm | Fenced farm west of the village road: Farmhouse (Sold As Seen) with the root cellar, Barn (Needs Work), Cottage (Charming), Shed (Potential), Stable (Rustic), silos, furrows. |
| ancient_fort ★ | Fort Knocks | Pentagonal old fort on the spur's nose: curtain walls with merlons, octagonal towers (ladders on two), a gatehouse and a breach, the 3-storey keep, Garrison Chapel, storeroom, well, old cannon barrels, transmitter dish, security-code printer. |
| quarry | Quarterly Quarry | Quarry pit on the spur's east flank: derrick, crusher, conveyor, rock piles, Quarry Office. |
| trappers_glade ★ | Free Trial Glade (Auto-Renews) | Clearing in the northern woods: Trapper Cabin with its cellar, Raider Shack (Roof Pending) with loose roof plates, drying racks, traps, campfire, watch platforms. |
| sawmill | The Downsizing Sawmill | Open mill shed with a giant saw bench, log piles, logging truck, stumps, Mill Office (Restructured). |
| barren_clearing ★ | Clear-Cut Savings | Scorched clearing north of the highway around a dead Legacy System, sale signs, stumps, a drifter's shelter. |
| pilgrims_peak ★ | Peak Performance Retreat | Retreat on top of the mesa: Retreat Lodge (3 storeys), Breakout Rooms, Synergy Spa with hot tubs, the Infinity Pool (Finite), helipad, gravel walks, a climbable 31 m comms tower (platforms at 10 and 20 m, terminal on top), Comms Tower Base with its locked room, security-code printer. |
| olive_grove ★ | Olive Branch Office | Three-terrace olive orchard under the mesa's west cliff: beehive rows, The Branch Office (portacabin) with the comms terminal outside, Press Shed; footpath up to the retreat. |
| broken_earth ★ | Buy The Dip | A chain of impact craters running south-east from the highway to the mesa road, upturned slabs, the downed machines that dug them. |
| adorned_wreckage ★ | Feng Shui Crash Site | An ARK hull at the end of a gouge through the south-west woods, dressed with cloth and string lights; lanterns in balanced pairs, totems, a raked gravel circle; the Hedge Fund behind a ring of fire vents; Salvage Hut with the communications device. |
| raiders_refuge ★ | Squatters' Rights | Raider camp in the far south-west woods: shack, tents, tarp, campfire, NO TRESPASSING (EXCEPT US) board, watch platform, security-code printer. |
| glamping_site | Glamping Pyramid Scheme | Glamping meadow in the south-east: tents, campfire, lanterns, a hot tub, Glamping Reception (Upsell Desk). |
| harvester_site | Juicer Meadow (hidden label) | Boss arena (`bossPoi: ['queene']`) in the open meadow north of the highway. |
| matriarch_arena | Mom's Landing (hidden label) | Boss arena (`bossPoi: ['matriark']`) in the south-east meadows. |

## Extractions
| id | Name | Kind | Where |
|---|---|---|---|
| rage_quit_airshaft | Rage Quit Airshaft | airshaft | the Shelf, east (998, 334) |
| severance_airshaft | Severance Package Airshaft | airshaft | creek valley north of the lake (372, 268) |
| early_retirement_airshaft | Early Retirement Airshaft | airshaft | south-west woods (146, 548) |
| two_weeks_notice_airshaft | Two Weeks' Notice Airshaft | airshaft | south, east of the mesa (716, 714) |
| village_doggy_door | Village Doggy Door | hatch | west of Lower Foreclosure (108, 122) |
| quarry_doggy_door | Quarry Doggy Door | hatch | below the quarry (668, 150) |
| orchard_doggy_door | Orchard Doggy Door | hatch | south of the toll plaza (452, 532) |
| glampsite_doggy_door | Glampsite Doggy Door | hatch | south-east meadow (978, 748) |

25 player/bot insertion points around the edges (the `SPAWNS` list).

## Key rooms
| room id | Name | Where |
|---|---|---|
| cellar | Root Cellar of Questionable Jars | back room of the Fixer-Upper Farm farmhouse |
| cellar | The Cellar (Cancel Anytime) | locked half of the Trapper Cabin, Free Trial Glade |
| communication_tower | Server Room of Unread Emails | locked half of the Comms Tower Base, Peak Performance Retreat |
| confiscation_room | Lost & Confiscated (Finders Keepers) | first floor of the north gate tower |
| village | The Landlord's Holiday Home | walled detached house on Lower Foreclosure's cross street |
| patrol_car | Patrol Car Trunk (Full of Fines) | the armoured patrol car parked in Tunnel Vision |

## Condition features
* **Forgot My Password** (`locked_gate`): security-code printers (containers with `note: 'security_code_printer'`)
  at Take-a-Number Reception, Peak Performance Retreat, Fort Knocks and Squatters' Rights; codes are entered at
  the Password Reset Center (`gate_control_room`). A HOA President (bastion) holds the gate yard and two Rocket
  Surgeons escort the retreat under this condition.
* **Juice Cleanse** (`harvester`): The Landlady spawns at the Juicer Meadow arena with drone and Rocket Surgeon escorts.
* **Mom's Home** (`matriarch`): Helicopter Mom spawns at Mom's Landing with drone escorts; the gate apron's HOA
  President stands down.
* **Hedge Fund**: the `deforestr_husk` container at the Feng Shui Crash Site, inside a ring of glowing fire vents.
* Other quest markers (`note`): `boom_box` (village square), `comms_terminal` (orchard, retreat tower top),
  `observation_deck` (overlook), `transmitter` (fort), `communications_device` (crash site).

## Multi-level and underground
Tunnel Vision, the Server Gallery, the Cloud, the Pothole Repair Depot and the Head Office Plant Room are `under`
halls 5.5 m below the Shelf (lids are the Shelf surface, fading when you go in; stair holes in the lids have
rails). The gate towers have three storeys and stairs, joined by a walkway over the gate; most houses have
upstairs; the toll canopy, roofs (exterior ladders), the overlook deck, the fort towers and the comms tower
platforms are walkable. Narrow doorways, partition gaps and stair flights are aligned to the 2 m nav grid so the
AI can follow you inside and upstairs.

## Budget (headless check)
≈95 buildings, ≈25.7k props, ≈840 containers, 126 ARK spawn groups (14 emplacements), build ≈3 s in the
headless overview.
