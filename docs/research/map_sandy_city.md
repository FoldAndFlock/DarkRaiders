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

## Extracts
Reference positions in brackets; the metro halls are searched outward from them for a free, level
34 × 16 m site (east–west, axis-aligned so the stairwells sit on the 2 m nav grid), so the platforms land
10–20 m off; the station POIs (r 18) follow the built halls.

| id | name | kind | built at x, z (reference) | face |
|---|---|---|---|---|
| northern_station | Northern Station | metro, hall floor 5 m below the street | 435, 293 (425, 303) | π (track along the north wall) |
| western_station | Western Station | metro | 295, 465 (310, 477) | π |
| eastern_station | Eastern Station | metro | 537, 627 (552, 616) | π |
| southern_station | Southern Station | metro | 441, 727 (451, 737) | π |
| collapsed_supermarket_hatch | Collapsed Supermarket Hatch | hatch (`raider_hatch_key`) | 476, 168 (475, 167) | toward the most open side |
| train_station_hatch | Train Station Hatch | hatch | 252, 344 | " |
| highway_overpass_hatch | Highway Overpass Hatch | hatch | 524, 516 | " |
| old_town_hatch | Old Town Hatch | hatch | 306, 658 | " |

**Metro stations are real underground halls** (World `under: 5`): a 34 × 16 m tiled hall (32 × 14 m inside)
whose lid is the street paving. The hall is declared first, then `extract(..., { kind: 'metro', face: π - rot,
trackZ: 3, platformLen: 31 })` at hall-local (17, 5.75), so the rig's `metroFit` finds the hall: the track bed
fills hall-local z 1..4.1 against the far (north) wall and the dark tunnel mouths sit on both end walls (track
32 m, the 12 m car stays inside the hall; it arrives from the east and leaves west). Everything on the platform
comes from the rig (`engine/extracts.js`): the full-length raised platform (z 4.1..8.5, 0.375 m up, so nobody
walks onto the track) with edge lamps and tactile strip, the yellow fence with gates at the two car doors, the
call terminal against the fence, two benches, the departure board with the "M" roundel. The hall itself only
dresses the floor-level concourse south of it (z 8.5..15): three pillars, three ceiling lights over the
platform and three over the concourse (two at the stair feet), a newsstand kiosk in the east bay and a locker in
the west bay (the dead-end bays beside the stair flights), trash + backpack/suitcase loot. Two 4 m stair flights (z 11..15) at both ends climb
straight up to the street, their feet kept clear, one 0.375 m step below the platform; at street level rust
railings with a gap at the street end, an `sc_metro_sign` totem (red "M" box + blue line plate) and a lamppost
at each entrance. `opts.deg` passed by the build is unused: the site search only tries east-west (rot 0, the
track needs the 32 m wall) and north-south (rot 90°, fallback); all four stations are built east-west (face π).
The old `sc_metro` / `sc_metro_stairs` props (decorative entrances and twelve sealed street stairs) are gone;
the build still draws the 12 random numbers they used so the dressing placed after them does not move.

**Raider hatches**: only the extract set's hatch (no extra props or lamps; the set lights itself), a
3 × 3 m steel apron and 2.4 m kept clear; `face` points to the most open of 8 directions (ties keep 0, toward
the camera). Hatches are placed after the street clutter and dune vegetation, so `hatch()` drops loose clutter
(debris, rubble, slabs, shrubs, grass, crates, barrels) whose footprint comes within 2 m of the lid.

Checked in real raids (headless, after the extraction rework): all 8 extracts' call points, cabins and
levers are on the walkable grid from a spawn (multi-level flood fill), and the AI nav reaches every station's
call terminal, car and lever. A full player extraction was walked on Northern and Southern Station: street ->
west stair flight -> concourse -> platform (0.375 m step) -> hold E at the terminal -> train in -> fence gate ->
car door -> hold E on the lever -> closing -> extracted -> car leaves -> station closed. Containers reachable
unchanged (692 of 772, the rest behind key-room doors), 19/19 spawns, no console errors.

## Key rooms (ids match the key items in `src/data/items.js`)
Key wings are rotated buildings; `keyRoom` records carry the world bounding box plus `polys` (exact rotated
footprints, one per wing).

| room id | where | bbox (x0,z0 – x1,z1) | locked doors | tier-3 containers |
|---|---|---|---|---|
| hospital | Hospital, middle wing, **3rd floor only** (game: up the main wing's stairs, along the hallway, locked door); rotated 56° | 432,216 – 471,257 | 2 (storey 2, from both neighbouring wings) | 10 |
| space_travel | whole Space Travel block (2 wings), rotated 59° | 508,349 – 561,412 | 4 | 16 |
| town_hall | Town Hall centre wing, ground floor + first floor (north door by the key icon), rotated −30° | 457,496 – 496,534 | 5 (3 ground, 2 upstairs) | 10 |
| residential | Plaza Rossa west house (master-key icon by Main Street) | 403,687 – 422,710 | 8 total | 8 |
| residential | Grandiosa Apartments, north half of the north block, all three walkable floors | 204,575 – 233,616 | (shared, incl. 2 upstairs) | 8 |
| residential | Piazza Arbusta south block, west wing | 559,622 – 593,653 | (shared) | 8 |

Every opening into a key area is a `door: true, locked: <id>` (exterior doors and the internal doorways to
the neighbouring wings, on every storey where the wings connect). `keyRoom` records carry `floorYs` (the
lowest locked floor per wing; the Hospital's is the 3rd floor). Key wings never get roof ladders or roof
hatches, their upper windows have 1 m sills, and their own stairs stop below a storey-gated key floor.
Reachability (headless Chromium, multi-level flood on the 0.5 m grid with ladders, every locked door closed):
**0 surfaces of any key area reachable from a spawn without the key**. Upstairs doorways between wings are
offset from the ground-floor doorway because a grid cell holds only one door blocker.

## Other gameplay markers
* 19 player spawns (reference spawn icons; the east one sits on the Corso deck at the map edge).
* ARK: 98 always-on spawn groups + 30 condition-gated ones (128 total).
  * Sentinels on the Town Hall roof and the overpass (reference icons), plus Red Tower, Bell Tower and
    Hospital roofs; 8 roof / deck turrets — all spawned on the real roof / deck surface (`surface: true`).
  * 16 wasp pairs + 6 hornets on patrol loops over plazas and streets; ticks in POI rooms; pops,
    fireballs and shredders in the lanes; snitches + surveyors in the dunes; rocketeers along the highway
    and dune rims; leapers / bastions / two bombardier+spotter pairs in the open dunes.
  * Condition groups (`condition` / `notCondition`, ids from `MAP_CONDITIONS.sandy_city`):
    - `bird_city` ("drones of all types patrol the sky in greater numbers"): 6 rooftop drone loops
      (wasp ×3 / hornet / snytch) + 2 rocketeers.
    - `night_raid` ("increased ARC spawn rates"): 4 extra wasp pairs over the lit plazas + a Main Street hornet.
    - `hurricane` ("drawn more ARC"): a leaper and two bastions push into the town edges; the two dune
      rocketeers are suppressed (`notCondition`).
    - `close_scrutiny`: 5 Surveyor scan sites (Marino Park, Warehouse yard, Market Ruins, Piazza Arbusta,
      Sandy Properties), each guarded by 2 Vaporisers.
    - `prospecting_probes`: wasp escorts over four dune landing fields.
  * Boss arenas: `bossPoi: true` on marino_park, warehouse and sandy_properties (the widest open ground).
    No Sandy City condition spawns a boss today (Harvester / Matriarch are not in its roster, as in ARC
    Raiders), so these only matter if one is added.
* Three fixed **Barron husks** (`barron_husk`, tier 3) half-buried in the dunes west of the rail yard,
  in the NE olive clearing and in the southern dunes (the wiki notes Baron Husks have fixed locations).
* Field depots (with field crates) at the Hospital forecourt, Plaza Rossa west and Sandy Properties.
* ~775 containers (≈230 T1 / 410 T2 / 135 T3; ~190 upstairs, on roofs or in the metro halls); loot themed per building kind (medical in the hospital,
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
* **Corso da Vinchi** (elevated highway, ~5.2 m above the town) from the east edge through Piazza Arbusta,
  over the old town, curving SW to the map corner: a real overpass slab on piers where it is high (walk
  under it), a heightfield embankment with side walls and pilasters where it is low; parapets throughout; four collapsed spans where old streets pass under (rubble slabs + leaning pillar at
  each broken end); nine sand drifts ramp up onto the deck. Traffic jam of Fiat-style wrecks, buses,
  barriers, husks; Abandoned Highway Camp (tents, tarps, campfire, raider caches, sandbags) on the deck.
* **Marino rail line**: tracks north of the station, a platform canopy with wagons, then a brick viaduct
  rising to 4 m running SW past the Maintenance Depot (a second walkable deck).
* Buildings (pass 2): 179 **rotated** World buildings from ~125 traced complexes, each at its reference
  angle (folded into ±45° so the camera-facing facade stays the dressed one). Long terraces are split
  into 2–3 row houses sharing one frame (own height, plaster colour and roof each); civic blocks and key
  wings are explicit `parts`. Everything inside a complex — BSP rooms, doors, windows, furniture,
  containers, facade shutters/balconies, awnings, church pews — is laid out in the complex's own frame and
  mapped to the world, so it rotates with the walls. Overlaps with earlier blocks and with the deck
  corridors are resolved with a separating-axis test (trim the cheapest side). Sunk buildings get a ramp
  dug through the piled sand to each door (≤ 0.28 m rise per metre) so none are sealed.
* The highway / viaduct side walls, parapets and pilasters are blocks turned to the deck tangent (clean
  diagonals instead of stepped boxes); the gas-station canopy, Marino Station (rotated with the rail),
  half-buried villas and the church interior follow their reference angles too.
* Set pieces: three fountain piazzas (Plaza Rossa, Piazza Romana, Marino Park), market stalls (Market
  Ruins, Piazza Arbusta), café terraces, statues, the church nave with pews/altar/columns + bell tower with
  bell, cypress avenue, spiral ramp of the Parking Garage, three round cisterns NW of the station,
  container yards (Su Duranti, Warehouse), gas-station canopy with pumps.

## Levels (pass 3: multi-level world)
* **Upper floors** (real slabs, BSP rooms, furniture and loot per storey, sill windows, doorways between
  wings on each common storey): Hospital (3 floors, key room on the 3rd), Town Hall (2), Library + annex,
  Galleria, Research, Space Travel (key, 2), Grandiosa Apartments (3), Dune's End Block, Marino Station,
  Santa Marta Houses. Stairs are 3.8 m flights (2.2 m in small wings) alternating sides; other storeys stay
  visual (dressed facades). Upstairs loot gets a small tier bump; ~190 containers sit upstairs, on roofs or
  underground.
* **Parking Garage**: three parking decks + a roof deck joined by 4 m stair flights; columns, parked cars
  with trunks, barriers and lights on every deck, abandoned cars and a raider cache on the roof.
* **Towers**: the Red Tower and the church Bell Tower are climbable all the way (stairs on every storey,
  crates on the landings, weapon case at the top) with a Sentinel on the walkable roof.
* **Rooftop routes**: flat roofs are walkable; POI wings and some core blocks get exterior roof ladders;
  neighbouring flat roofs within 9 m are joined by wooden planks (`bridge()`, same height) or a plank + ladder
  (up to one storey higher); every roof cluster gets a ladder from the street (12 planks, ~60 ladders,
  ~100 of 179 roofs reachable). The Hospital rooftop cache sits on the main wing roof.
* **Corso da Vinchi overpass**: wherever the deck stands > 1.6 m above the old street it is a real
  `bridge()` slab (0.9 m thick) on pier pairs with cap beams every 18 m, so the street network continues
  underneath; low stretches stay an embankment. The four collapsed spans keep their broken ends and rubble;
  the sand drifts run under the slab edge so they meet the deck flush (all deck sections reachable).
* **Perches**: Sentinels / turrets on the Town Hall, Hospital, Red Tower, Bell Tower, Galleria, Grandiosa,
  Library, Research, Space Travel, Warehouse and Marino Station roofs and on the overpass deck use
  `{ surface: true }` (real roof / deck surface).

## Verification (pass 3, headless Chromium)
* Multi-level flood fill on the 0.5 m grid (steps ≤ 0.45 m, 1.7 m headroom, ladders, locked doors closed):
  all 19 spawns and all 8 extracts reachable (the four metro platforms included), every non-key upper
  floor reached, ~100 roofs reached, 770 of 772 containers reachable, **0 key-area leaks**.
* AI nav (`nav.find` with heights): all four metro platforms, Parking Garage decks + roof, Red Tower up to
  its 3rd floor, Hospital, Grandiosa; 37 of 49 individual stair flights pass — the misses are tower flights
  above the nav grid's 4-layer limit and a few rotated flights.
* Raids at noon / night / dusk-sandstorm and the `bird_city` / `hurricane` conditions (condition ids
  patched in, see engine note) load with no console errors.

## Deviations (forced by the top-down / engine model)
* Ziplines / snap hooks are replaced by ladders and planks; the Town Hall's secret one-way window exit
  is not modelled.
* Footprints are rectangles (or rows of rectangles); L- and V-shaped reference blocks (Santa Marta,
  Town Hall annex) are 2–3 rotated rectangles meeting at the corner, with small gaps where they abut.
* Rotations are folded into ±45°, so a block traced at 60° is built as a −30° block with its long side
  running the other way; footprint and orientation match, only the "front" side differs.
* Collapsed highway spans are placed where the reference's old streets cross under the Corso; the original
  has more continuous ramps to the overpass.
* Rotated buildings keep their flights in their own frame; the AI's 2 m nav grid climbs ~75 % of them
  (axis-aligned halls, garage, towers up to the 4-layer nav limit); players can use all of them.
* Display names follow the quest table (`Marino`, `Piazza Romana`, `Sandy Properties`, `Santa Marta`,
  `Grandiosa`, `Su Duranti`, `Piazza Arbusta`) plus `Plaza Rossa`, `Corso da Vinchi`.

## Budget (headless Chromium, SwiftShader)
183 buildings (incl. 4 metro halls), ~19.6 k props, ~775 containers (≈230 T1 / 410 T2 / 135 T3),
128 ARK groups (96 always on), ~800 lamps, 61 ladders; map `build()` ≈ 1.1–1.6 s, build + finalize
≈ 3.7–4.3 s with the machine under load (4 cores, load average ~4).
