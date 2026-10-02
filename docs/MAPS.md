# Building maps for DarkRaiders

Maps are ES modules in `src/maps/<id>.js` that describe a level through the `World` API in
`src/engine/world.js` (read it — it is the source of truth). The module default-exports:

```js
export default {
  id: 'damn_grounds', name: 'Damn Grounds', size: [W, H], seed: 1234,
  base: 'grass',            // default terrain texture
  cliff: 'rock',            // texture for steep slopes
  ambient: { music: 'damn_grounds', birds: true },
  build(w, rng) { ... }     // w = World, rng = seeded () => [0,1)
};
```
Everything must be **deterministic** (only use the supplied `rng` / `mulberry(seed)`; never `Math.random`),
because every co-op client rebuilds the same world from the seed.

## Projection & scale
* 1 unit = 1 m. x → east, z → south, y up. The camera is an oblique SNES 3/4 view (south walls
  visible, roofs fade when the player goes inside). The visible area is ~40 × 22 m at 1080p.
* Raids last 25–30 minutes; maps are close to the real game's scale: **Damn Grounds 1100 × 825 m,
  Green Gate 1100 × 825 m, Sandy City 900 × 900 m**. Map the reference image's playable area onto
  `[0,W]×[0,H]` (north up). Keep layouts faithful; only change things the top-down perspective forces
  (no snap-hook verticality, no walkable upper floors: buildings are single walkable floor + visual
  storeys; tall multi-level structures become plateaus/decks with ramps/stairs).
* Character ≈ 2 m tall, doors ≈ 1.6–2.4 m wide, rooms ≥ 3 m, corridors ≥ 2 m. Keep interiors roomy
  enough for top-down combat.

## World API cheat-sheet
Terrain height (resolved before structures, call order doesn't matter):
`noiseHills(amp, scale, seed, maskFn)`, `heightFn(fn, mode)`, `raiseRect(x0,z0,x1,z1,h,blend,mode)`,
`raiseCircle(cx,cz,r,h,falloff,mode)`, `raisePoly(pts,h,blend,mode)` (blend 0 → vertical cliff),
`ridge(points,width,h,blend,mode)`, `ramp(x0,z0,x1,z1,h0,h1,'x'|'z')`, `flatten(...)`,
`deck(points,width,y,tex,opts)` (walkable raised strip: dam crest, bridges),
`river(points,width,{level,depth,bank,bed})`, `water(x0,z0,x1,z1,{level, deep?, shallow?, opacity?})`, `waterPoly(pts,{level, deep?, shallow?, opacity?})` (colours as hex)
(water shows wherever terrain is below `level`; depth > ~0.95 m is impassable).

Paint: `paint(tex,x0,z0,x1,z1)`, `paintCircle`, `paintPoly(tex, pts)`, `paintFn(fn)`,
`road(points,width,tex,{edge,edgeW,level})`, `path(points,width,tex)`.
Terrain textures: `grass dirt sand sandDark concrete damConcrete asphalt rock tiles wood mud gravel moss forest metalPanel hazard`.

Structures: `block(x0,z0,x1,z1,h,tex,{y0?,collide?,cast?,tint?,xray?,rot?,R?})` (`rot` turns the block about its centre; for a group, pass one shared `R: rotFrame(cx, cz, angle)` imported from `engine/world.js` — also accepted by `wallLine`),
`wallLine(ax,az,bx,bz,thick,h,tex,gaps)`, `fence(points,h,tex)`,
`building({ x,z,w,d, storeys, wall, floor, roof, roofShape:'gable'|undefined, roofTint, tint, thick,
 doors:[{side,at,w,sill?,door?:true,locked?:roomId}], inner:[[x0,z0,x1,z1,gaps]], peek, name, roofExtras })`.
**Rotated buildings:** add `rot` (radians) to `building()` to rotate the whole footprint about its centre.
`doors`/`inner` stay in the building's own frame; put contents in the same frame with
`containers:[[kind, lx, lz, rot?, opts?]]` and `props:[[kind, lx, lz, rot?, opts?]]` (offsets from the
`x, z` corner), or convert any local point yourself with `world.local(bb, lx, lz)` → `[x, z]` (`bb` is the
value `building()` returns; `bb.poly` holds its world corners). Collision, indoor detection, roof fade,
wall cutaway, doors and the in-raid map all follow the rotation.
Box/wall textures: the terrain list plus `plaster brick rust corrugated roofTar roofTile`.
Windows = door gaps with `sill` (low wall you can see/shoot over but not walk through).

Props: `prop(kind,x,z,rot,{scale,y,solid:true|[hw,hd,h]})`, `scatter(kind,area,count,opts)`,
`forest(area,density,kinds,opts)`. Built-in kinds: `crate lootCrate arcCrate barrel barrelBlue tree pine
deadTree bush cactus rock car lamp sandbag pipe husk antenna extractPad hatch workbench shelf debris`.
Add your own voxel props in `src/maps/props_<id>.js` via
`registerProp(kind, () => new Vox(...)...build(), { solid: [hw, hd, h], cast })` (see `src/engine/voxel.js`
and existing builders in `src/engine/models.js`), imported at the top of your map module.
**Prefix custom prop kinds with your map id** (`dg_dome`, `gg_gatepylon`, `sc_awning`) to avoid clashes.
Lights: `lamp(x,z,{y,color,intensity,range,flicker,spot,model})` (intensity ~0.8–2, range 6–14). The
light itself is capped ~2.8 m above ground (range extended for taller fixtures) so mast lights still
reach the ground; the fixture's own post never shadows it.
`raisePoly(pts, h, 0)` (blend 0) takes a fast scanline path.

Gameplay markers (consumed by the game – be generous and thoughtful):
* `poi(id, name, x, z, r, { tier, aliases })` — every named location from the reference. `id` = snake_case
  of the (lightly tweaked) display name; put the snake_case of the ORIGINAL ARC Raiders name in `aliases`.
* `extract(id, name, x, z, { kind })` — kind: `elevator` (Cargo Elevator / lifts), `hatch` (Raider Hatch,
  needs a hatch key), `metro` (metro station), `airshaft` (Green Gate airshafts). Use the reference positions.
* `spawnPoint(x, z)` — player/squad insertion points (reference "player spawn" icons).
* `container(kind, x, z, rot, { tier: 1..3, room })` — loot. Kinds: `locker crate weapon_case ammo_box
  medical_bag toolbox electronics cabinet desk safe trash car_trunk fridge suitcase backpack arc_crate
  arc_husk barron_husk deforestr_husk raider_cache field_depot plant basket security_locker`. Put them where they make sense
  (medical in hospitals/medical POIs, electronics in tech/research, weapon cases in security, plants in
  nature areas…). Tier 3 = key rooms / landmark loot. Aim for 400–800 containers per map.
* `arkSpawn(archetype, x, z, { count, radius, patrol: [[x,z],…] })` — archetypes: `wasp hornet tick pop
  fireball snitch surveyor sentinel turret rocketeer leaper bastion bombardier spotter shredder`. Sentinels
  and turrets sit on rooftops/towers (use reference Sentinel icons). Heavier ARK (leaper, bastion,
  bombardier, rocketeer) roam open areas. 60–120 spawn groups per map; give drones patrol loops.
  Perches: static ARK take `y` (metres above ground) or `yAbs` (absolute height) to sit on roofs, towers
  (`f` = initial facing / sweep centre in radians; observers above roof level can't see into buildings)
  and decks. `condition: 'harvester' | [...]` spawns a group only under that map condition (bosses,
  escorts); `notCondition` suppresses it. Mark boss arenas with `poi(..., { bossPoi: true | [kinds] })` —
  condition bosses (`spawnBoss`) pick one of those instead of a random POI. `container`, `prop` and `lamp`
  accept the same `condition` / `notCondition` options (e.g. Hurricane caches, Husk Graveyard wrecks).
* `keyRoom(roomId, x0,z0,x1,z1, null, { name })` + doors with `locked: roomId` — key rooms from the
  reference (e.g. Dam: control_tower, staff_room, surveillance, testing_annex, controlled_access_zone;
  Sandy City: hospital, town_hall, residential (several), space_travel; Green Gate: village, cellar,
  communication_tower). Fill them with tier-3 containers.
* `zone(name, poly, { tier })` — loot tier areas (1 outskirts, 2 normal POI, 3 high-value).
* `lamp(...)` for street lights / interior lights / beacons, especially around POIs (night raids).

## Detail bar (the user asked for MUCH more detail)
Every POI needs: buildings with interior walls/rooms/doors/windows, furniture props + containers inside,
clutter outside (vehicles, barrels, crates, pipes, fences, sandbags, debris, husks), lighting, terrain
paint variation (paths, gravel, mud, concrete pads), vegetation framing. Open areas need rocks, bushes,
dead trees, ARK husks, wrecks. Use roads/paths to connect POIs as in the reference.

## Performance budget
≤ 300 buildings, ≤ 30 000 props (trees/rocks/debris count), ≤ 900 containers, build time < 6 s in
headless Chromium (SwiftShader is slow; real GPUs are much faster).

## Checking your work
A static server is usually running at http://localhost:8123 (if not, start one:
`cd /home/user/DarkRaiders && npx http-server -p 81xx -s -c-1 . &`). Screenshot with
`node tools/shot.mjs "<url>" out.png [w] [h]` (waits for `window.__ready`; prints console errors) and look
at the PNG with the Read tool. Tool pages:
* `tools/mapview.html?map=<id>&mode=overview&ppm=1` — whole-map top-down + markers (compare side by side
  with the reference image in `docs/ref/`). Use ppm=2 and the `x/z` crop idea by cropping with python PIL
  (installed) for detail checks.
* `tools/mapview.html?map=<id>&mode=view&x=..&z=..&time=noon|dusk|night|dawn&weather=clear|rain|fog|sandstorm`
  — in-game camera at a spot (1920×1080 screenshot) to check detail/readability.
Fix all console errors. Do not edit files outside your map module + props file (ask in your report if
the engine needs something).
