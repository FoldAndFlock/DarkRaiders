# Sandy City (ARC Raiders "Buried City") — map notes

Module: `src/maps/sandy_city.js` (id `sandy_city`, 900 × 900 m, seed 4417, base `sand`, cliff `sandDark`).
Custom props: `src/maps/props_sandy_city.js` (all kinds prefixed `sc_`).

## Sources
* `docs/ref/buried_city_annotated.jpg` / `buried_city_blank.jpg` and the 5120 px / 4096 px originals
  (arcraiders.wiki "Buried City" gallery). Wiki codex: the town was called *Marano* by its inhabitants;
  "sand-choked remains of a desert city… crowded villas… sun-bleached rooftops… tight corridors and
  overlooking heights".
* **Reference → world transform** (playable area of the 2400 px annotated map):
  `x = (px − 180) × 0.42453`, `z = (pz − 80) × 0.42453` (north up). The blank map is offset/scaled:
  `px_blank = (px_annotated + 108) / 1.086`, `pz_blank = (pz_annotated + 94) / 1.086`.
  Building footprints were traced on 10 m-gridded crops of the blank 4096 px map (rotated rectangles,
  either `[cx, cz, length, width, angle]` or three consecutive corners).

## Naming (light tweaks, consistent with `src/data/quests.js` QUEST_POIS)
POI `id` = snake_case of the tweaked display name; `aliases` = snake_case of the original ARC Raiders name
(only when different). Plain-English place names (Hospital, Library, Red Tower, Main Street…) are unchanged.

| id | display name | original (alias) | x, z | r | tier |
|---|---|---|---|---|---|
| gas_station | Gas Station | — | 438, 86 | 26 | 1 |
| su_duranti_warehouses | Su Duranti Warehouses | su_durante_warehouses | 306, 138 | 40 | 2 |
| collapsed_supermarket | Collapsed Supermarket | — | 486, 186 | 28 | 2 |
| market_ruins | Market Ruins | — | 528, 206 | 34 | 2 |
| hospital | Hospital | — | 452, 238 | 50 | 3 |
| dunes_end | Dune's End | — | 590, 226 | 44 | 2 |
| library | Library | — | 366, 308 | 46 | 2 |
| parking_garage | Parking Garage | — | 488, 330 | 36 | 2 |
| galleria | Galleria | — | 568, 318 | 56 | 2 |
| research | Research | — | 500, 398 | 34 | 3 |
| space_travel | Space Travel | — | 533, 378 | 34 | 3 |
| marino_station | Marino Station | marano_station | 236, 300 | 50 | 2 |
| warehouse | Warehouse | — | 104, 382 | 50 | 2 |
| marino_park | Marino Park | marano_park | 424, 402 | 42 | 1 |
| piazza_romana | Piazza Romana | piazza_roma | 308, 458 | 32 | 2 |
| sandy_properties | Sandy Properties | buried_properties | 690, 440 | 70 | 2 |
| town_hall | Town Hall | — | 482, 512 | 56 | 3 |
| piazza_arbusta | Piazza Arbusta | piazza_arbusto | 628, 556 | 36 | 2 |
| corso_da_vinchi | Corso da Vinchi | corso_da_vinci | 420, 566 | 40 | 1 |
| santa_marta_houses | Santa Marta Houses | santa_maria_houses | 476, 604 | 48 | 2 |
| grandiosa_apartments | Grandiosa Apartments | grandioso_apartments | 224, 622 | 44 | 2 |
| main_street | Main Street | — | 430, 670 | 46 | 1 |
| abandoned_highway_camp | Abandoned Highway Camp | — | 236, 704 | 36 | 2 |
| red_tower | Red Tower | — | 536, 680 | 30 | 2 |
| plaza_rossa | Plaza Rossa | plaza_rosa | 458, 722 | 40 | 2 |
| church_ruins | Church Ruins | — | 705, 765 | 46 | 2 |
| maintenance_depot | Maintenance Depot | — | 108, 640 | 36 | 1 |
| old_town | Old Town | — | 304, 668 | 30 | 1 |
| northern_station | Northern Station | — | 425, 303 | 14 | 1 |
| western_station | Western Station | — | 310, 477 | 14 | 1 |
| eastern_station | Eastern Station | — | 552, 616 | 14 | 1 |
| southern_station | Southern Station | — | 451, 737 | 14 | 1 |

## Extracts (reference positions)
| id | name | kind | x, z |
|---|---|---|---|
| northern_station | Northern Station | metro | 425, 303 |
| western_station | Western Station | metro | 310, 477 |
| eastern_station | Eastern Station | metro | 552, 616 |
| southern_station | Southern Station | metro | 451, 737 |
| collapsed_supermarket_hatch | Collapsed Supermarket Hatch | hatch (`raider_hatch_key`) | 475, 167 |
| train_station_hatch | Train Station Hatch | hatch | 252, 344 |
| highway_overpass_hatch | Highway Overpass Hatch | hatch | 524, 516 |
| old_town_hatch | Old Town Hatch | hatch | 306, 658 |

Metro entrances are `sc_metro` stairwells with an "M" totem + green beacon; twelve sealed secondary
metro stairs (`sc_metro_stairs`) dot the town where the reference shows stair icons.

## Key rooms (ids match the key items in `src/data/items.js`)
| room id | where | rect (x0,z0 – x1,z1) | locked doors | tier-3 containers |
|---|---|---|---|---|
| hospital | Hospital, 2nd wing segment (reference "Hospital Key" icon) | 421,205.5 – 448,218 | 2 | 10 |
| space_travel | whole Space Travel block (4 staircase segments, `rects` listed) | 504.5,358 – 561.5,404.5 | 5 | 20 |
| town_hall | Town Hall centre segment (north door, next to the key icon) | 468.5,504.5 – 485.5,535.5 | 3 | 10 |
| residential | Plaza Rossa west house (reference master-key icon by Main Street) | 401.5,689.5 – 420.5,728.5 | 9 total | 8 |
| residential | Grandiosa Apartments north block | 208.5,579 – 247.5,617 | (shared) | 8 |
| residential | Piazza Arbusta south block (east master-key icon) | 566,628.5 – 578,662.5 | (shared) | 8 |

All exterior and interior openings of a key segment are `door: true, locked: <id>`; validated in
headless Chromium: 0 key-room cells reachable from a spawn without a key.

## Other gameplay markers
* 19 player spawns (reference spawn icons; the east one sits on the Corso deck at the map edge).
* 98 ARK spawn groups: 5 sentinels (Town Hall roof + highway overpass from the reference, plus Red Tower,
  Bell Tower, Hospital roof), 8 turrets (Research, Space Travel, Warehouse, Marino Station, Galleria,
  Grandiosa, Library roofs, highway camp), 16 wasp pairs + 6 hornets on patrol loops over plazas/streets,
  ticks inside POI rooms, pops/fireballs in the lanes, shredders on Main Street / Santa Marta, snitches and
  surveyors in the dunes, rocketeers along the highway and dune rims, leapers/bastions/bombardier+spotter
  pairs in the open dunes.
* Field depots (with field crates) at the Hospital forecourt, Plaza Rossa west and Sandy Properties.
* ~830 containers (≈290 T1 / 440 T2 / 100 T3); loot themed per building kind (medical in the hospital,
  electronics/servers in Research + Space Travel, books/desks in Library + Town Hall, toolboxes in the
  warehouses/depots, car trunks on the highway, raider caches at the highway camp, plants in groves).
* Zones: Dunes (1), Old Town (2), and the reference's outlined high-value areas (3): Hospital,
  Space Travel, Town Hall, Library, Research, Grandiosa Apartments, Plaza Rossa; Galleria and the highway
  camp (2).

## Construction notes
* **Bowl of dunes**: town floor polygon (`TOWN`, a swept `CORE` + half-buried fringe) blended into
  procedural barchan-like dunes (long windward slope, steep lee face; rim rises toward the map edge, a
  dune ridge across the north). Lee faces are painted `sandDark`; drifts (`raiseCircle`) and sand tongues
  cover the paving; dunes pile against the windward side of edge buildings.
* **Buried buildings**: complexes flagged `sunk` sit low with sand piled against them; 24 `BURIED` houses
  are solid plaster masses with stepped tile roofs/attic windows poking out of the dunes.
* **Corso da Vinchi** (elevated highway): a walkable deck in the heightfield (5.2 m above the town) from
  the east edge through Piazza Arbusta, over the old town, curving SW to the map corner; side walls,
  parapets, pilasters; four collapsed spans where old streets pass under (rubble slabs + leaning pillar at
  each broken end); nine sand drifts ramp up onto the deck. Traffic jam of Fiat-style wrecks, buses,
  barriers, husks; Abandoned Highway Camp (tents, tarps, campfire, raider caches, sandbags) on the deck.
* **Marino rail line**: tracks north of the station, a platform canopy with wagons, then a brick viaduct
  rising to 4 m running SW past the Maintenance Depot (a second walkable deck).
* Buildings: 227 World buildings from ~120 traced complexes. Rotated reference footprints become
  axis-aligned "staircase" chains of segments joined by internal doorways; BSP room splits with doors,
  windows (sills), Italian plaster tints (cream, ochre, pale pink, terracotta, peach…), gable tile roofs or
  flat roofs with tanks/solar panels/chimneys/AC units, shutters + balconies on the visible south facade,
  awnings/planters/scooters on street fronts.
* Set pieces: three fountain piazzas (Plaza Rossa, Piazza Romana, Marino Park), market stalls (Market
  Ruins, Piazza Arbusta), café terraces, statues, the church nave with pews/altar/columns + bell tower with
  bell, cypress avenue, spiral ramp of the Parking Garage, three round cisterns NW of the station,
  container yards (Su Duranti, Warehouse), gas-station canopy with pumps.

## Deviations (forced by the top-down / engine model)
* No walkable upper floors or snap-hook rooftop traversal: buildings are one walkable floor + visual
  storeys (2–7). Rooftop routes of the original are replaced by the walkable highway/rail decks and dune
  ramps.
* Reference buildings are rotated; World buildings are axis-aligned, so rotated blocks are approximated
  by stepped chains of segments (same footprint area/orientation, stepped outline).
* Collapsed highway spans are placed where the reference's old streets cross under the Corso; the original
  has more continuous ramps to the overpass.
* Metro stations are surface stairwells (no underground), hatches use the shared `hatch` prop.
* Display names follow the quest table (`Marino`, `Piazza Romana`, `Sandy Properties`, `Santa Marta`,
  `Grandiosa`, `Su Duranti`, `Piazza Arbusta`) plus `Plaza Rossa`, `Corso da Vinchi`.

## Budget (headless Chromium, SwiftShader)
227 buildings, ~18.7 k props, ~830 containers, 98 ARK groups, ~660 lamps; build + finalize ≈ 2.5–3.5 s
(map `build()` alone ≈ 0.6–1.0 s).
