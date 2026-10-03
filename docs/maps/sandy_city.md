# Sandy City — design note

`src/maps/sandy_city.js` (+ props in `src/maps/props_sandy_city.js`, prefix `sc_`). 900 × 900 m, north up.

## Concept
A Mediterranean seaside resort that went bust twice: first the sea left, then the sand arrived. Sandy
Properties sold the town as "beachfront"; the beach is now a long walk east across the dried-out sea bed,
and the dunes are rolling in from the west to collect whatever the ARK haven't repossessed yet. Pastel
apartment blocks, a cobbled old town on a hill, a promenade with nothing to look at, a marina full of
yachts sitting on sand.

## Regions
| Region | Where | What it plays like |
|---|---|---|
| The town floor | centre | Slopes gently down (≈9.5 m → 6 m) to the old shoreline. Seven boulevards radiate from the **Roundabout of Regret**; asphalt ring lanes tie them together. Dense 2–5 storey frontage, sand drifts in the lanes. |
| Upper Sandy | north-centre hill, x 280–530 / z 140–330 | The old town on a 7.5 m plateau. Sandstone retaining walls and cliffs to the north and east (ramps: the north road and the east stair street), the **Hourglass Terraces** stepping down the gentle south slope, the **Sandphitheatre** cut into the west flank. Cobbled lanes, Piazza Sandwich on top, a metro station under its west lanes. |
| The waterfront | east, along x ≈ 690–760 | Sea wall with a balustraded promenade, palms and lamps. Eight concrete slipways and eight wall ladders lead down to the sea bed. The marina basin (a notch in the wall) has four wooden piers you can walk on and under. |
| The dry sea bed | east of the sea wall | Open, low (≈1 m), cracked flats and sand bars; stranded boats (**Yacht Rock Bottom**), the breakwater out to **the Red Flag** lighthouse (with a footbridge you can walk under), heavies on patrol. Dunes spill onto it north and south of the town. |
| The Bypass | north edge | Elevated highway: an embankment through the north-west dunes, an overpass along the town's north edge, then a viaduct across the sea bed (the **Gridlock Campground** lives on it). Two collapsed spans; sand drifts ramp up onto it; a ladder up a pier at the camp. |
| The dune sea | west and south | Tall dunes with buried houses (roofs and attic windows poking out), oases, rock outcrops, the **Sunk Cost Solar Farm**, the **Grains of Wrath** towers half swallowed on the town's west edge. |

## Points of interest
Quest-referenced ids are marked ★ (ids are internal and never change).

| id | Name | What's there |
|---|---|---|
| town_hall | Town Hall (Closed Since Lunch) | 3-wing civic block on the hill's north rim; locked middle wing (key room `town_hall`), sandbagged steps, scaffolding. |
| piazza_romana ★ | Piazza Sandwich | Hilltop square: fountain, café terraces, market stalls, olive garden, café counters (desks/cabinets). |
| escrow_chapel | Our Lady of Perpetual Escrow | Small chapel on the hill: pews, altar, a safe behind it. |
| sandphitheatre | The Sandphitheatre | Stepped seating rings cut into the hill, a stage with columns, a raider band's abandoned rehearsal camp (raider cache). Boss arena. |
| santa_marta_houses ★ | Hourglass Terraces | Three rows of terraced houses on the south slope, laundry lines, two raider caches in the lanes; one locked townhouse (`residential`). |
| hospital ★ | St. Copay's Hospital | 4-storey, 3-wing hospital on the Clearance Sale Strip + outpatients wing; ambulances and a triage tent out front; locked Ward C on the 3rd floor (`hospital`). |
| main_street ★ | Clearance Sale Strip | The western boulevard: shops, SALE boards, stalls, shopping carts, parked cars. |
| piazza_arbusta ★ | The Roundabout of Regret | The hub: the Founder's statue pointing at where the sea used to be, palms, a ring of kiosks and stalls with desks and drawers. |
| galleria ★ | The Dune-Hill Mall | Two-wing, 3-storey mall; a dune has climbed its west wall to the roof (planks across the last gap); cafés and carts out front. |
| parking_garage ★ | Park & Pray Garage | 3-deck open garage + roof: cars, trunks, toolboxes, a raider cache on the roof. |
| space_travel ★ | No Refunds Travel Agency | 4-storey office on the Desert Road, rocket billboard on the roof; staff-only top floor locked (`space_travel`). |
| library ★ | The Overdue Library | Two-wing civic library with an upstairs; book returns and benches in the forecourt. |
| water_park | Dry Run Water Park | Empty wave pool (one last puddle), kiddie pool, a dry lazy river you can walk, slide tower (sniper perch), sunbeds. |
| gas_station ★ | Pump & Dump Gas Station | Pump canopy, mini-mart, a car wash that only rinses sand, on the Desert Road at the south edge. |
| grandiosa_apartments ★ | Grains of Wrath Apartments | Two 6-storey towers sunk into the dunes on the west edge; walkable upper floors; locked unit (`residential`). |
| solar_farm | Sunk Cost Solar Farm | Rows of half-buried panels in the north-west dunes, an inverter shed, electronics to strip. Boss arena. |
| su_duranti_warehouses ★ | Return-to-Sender Warehouses | Port warehouses and a container yard under the Bypass; quay crane; weapon cases in the yard. |
| research ★ | Pivot Labs | Two-wing tech campus on the old quay: servers, desks, dishes and antennas on the roof. |
| marino_station ★ | Dry Dock Station | Metro station under the quay beside the marina (+ the Harbourmaster's hut above). |
| yacht_rock_bottom | Yacht Rock Bottom | The marina's fleet stranded on the sea bed north of the breakwater; lockers and safes aboard. Boss arena. |
| abandoned_highway_camp ★ | Gridlock Campground | Tents, tarps, a fire and raider caches on the Bypass viaduct over the sea bed; sandbag walls at both ends. |
| marino_park ★ | Low Tide Park | Promenade park between the marina and the breakwater: bandstand, dry fountain, beached pedal boats. |
| red_tower ★ | The Red Flag | Red-and-white lighthouse at the end of the breakwater: stairs to the top, lantern on the roof, sniper perch. |
| sandy_properties ★ | Ocean View* Condos | Three condo towers on the south-east promenade, the Sandy Properties sales office, flags, a dry pool; locked show penthouse (`residential`). |
| northern_station | Uphill Both Ways Station | Metro station under the hill's west lanes, between Piazza Sandwich and the Sandphitheatre. |
| southern_station ★ | Signal Failure Station | Metro station on the outer ring lane, south. |
| western_station | Sand Trap Station | Metro station at the west end of the Clearance Sale Strip. |

## Extractions
* Metro (each runs one train per raid): **Uphill Both Ways Station** (hill, north-west), **Dry Dock Station** (marina, east),
  **Signal Failure Station** (south), **Sand Trap Station** (west).
* Doggy Doors (Doggy Door Key): **Sunk Cost Doggy Door** (solar farm, NW), **Splash Zone Doggy Door** (water park, SW),
  **Low Tide Doggy Door** (sea bed under the Bypass, NE), **Valet Doggy Door** (behind the garage, SE).

## Key rooms
| room id | Name | Where |
|---|---|---|
| hospital | Billing Department (Ward C) | St. Copay's, east wing, 3rd floor (stairs in the middle wing, locked door) |
| space_travel | Staff-Only Floor (Very Exclusive) | No Refunds Travel Agency, south wing, top walkable floor |
| town_hall | Records Office (Do Not Disturb) | Town Hall, middle wing (locked doors from the street and both wings) |
| residential | Repossessed Unit (Grains of Wrath) | Grains of Wrath tower A, west wing (whole wing, all floors) |
| residential | Repossessed Townhouse (Hourglass Terraces) | middle terrace row, second house |
| residential | Show Penthouse (Do Not Touch) | Ocean View* Condos tower B, south wing, 3rd floor |

## Condition features
* **Magpie Mafia** (`bird_city`): chimneys on ~40 % of the flat roofs each hold a nest of stolen trinkets
  (`Magpie Nest` containers, condition-gated) and ~26 zipline catwalks span between roofs of equal height
  (condition-gated props with walkable planks; the engine has no zipline riding, so these are cable-hung
  plank walks). Extra drone loops over the rooftops and two Rocket Surgeons.
* **Night Shift**: extra Buzzkill sweeps over the lit squares and a Middle Manager down the Strip.
* **Bad Hair Day**: heavies push into the town edges; dune Rocket Surgeons stay grounded.
* **Audit Season**: Data Miners with Vape Lord escorts over the open squares, the solar farm and the sea bed.
* **Survey Season**: Buzzkill cover over the probe landing fields (dunes, sea bed).
* **Mass Layoffs**: a line of laid-off husks dumped on the sea bed south of the breakwater.
* **Allergy Season**: extra plants in the parks and planters.
* Boss arenas (`bossPoi`): the Sandphitheatre, Yacht Rock Bottom, the Sunk Cost Solar Farm (no boss in the roster today).

## Numbers (build at the current seed)
244 buildings, ≈ 14.9 k props, 693 containers (≈ 610 outside conditions), 132 ARK spawn groups, 8 extractions,
27 POIs, 19 spawn points, 94 ladders; build ≈ 1.1 s + finalize ≈ 2.1 s in headless Chromium (SwiftShader).
