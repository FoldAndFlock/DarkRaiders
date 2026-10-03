// Extraction doors / gates: on test_range the elevator, airshaft and metro are sealed (solid door / gate blockers)
// while idle or called, a forced entry is put back out at the entry point, they open for boarding, the doors shut
// GATE_SHUT s before departure and whoever is inside then still extracts.
//   node tools/gatetest.mjs [base url] [screenshot prefix]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8244/index.html', out = ''] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = new Map();
p.on('console', m => { const t = m.text().slice(0, 300); if (m.type() === 'error') errs.set(t, (errs.get(t) || 0) + 1); });
p.on('pageerror', e => { const t = '[pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); errs.set(t, (errs.get(t) || 0) + 1); });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await p.goto(`${base}?raid=test_range&time=noon&weather=clear`);
await p.waitForFunction(() => window.app && window.app.game && window.app.game.running, null, { timeout: 400000 });
await wait(800);
let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) fails++; };
// helpers in the page: walk the local player with the real collision (Grid.move) toward a point
await p.evaluate(() => {
  const g = window.app.game; g.me.buffs.invuln = 1e9; g.me.grace = 0;
  for (const e of [...g.sim.entities.values()]) if (e.type === 'ark' || (e.type === 'raider' && e.bot)) g.sim.entities.delete(e.id);   // a quiet range
  window.__walk = (tx, tz, steps = 140) => {
    const me = g.me, grid = g.world.grid;
    for (let i = 0; i < steps; i++) {
      const dx = tx - me.x, dz = tz - me.z, d = Math.hypot(dx, dz); if (d < 0.1) break;
      const s = Math.min(d, 0.12), q = { x: me.x, z: me.z, y: me.y };
      grid.move(q, dx / d * s, dz / d * s, 0.33);
      me.x = q.x; me.z = q.z; me.y = grid.floorAt(q.x, q.z, q.y);
    }
    return { x: me.x, z: me.z, y: me.y };
  };
  window.__X = (kind) => g.sim.extracts.find(e => e.kind === kind);
});
for (const kind of ['elevator', 'airshaft', 'metro']) {
  console.log(`== ${kind}`);
  const info = await p.evaluate((kind) => {
    const g = window.app.game, x = window.__X(kind), me = g.me, grid = g.world.grid;
    for (const o of g.sim.extracts) if (o !== x && o.kind !== 'hatch') o.state = 'offline';
    x.state = 'idle'; x.t = 0;
    const [ex, ez] = x.pts.entry; me.x = ex; me.z = ez; me.y = grid.floorAt(ex, ez, x.pts.cabin.y + 0.6); g.camX = ex; g.camZ = ez;
    return { gates: x.gates, st: x.state, closed: x.gates.map(k => grid.doorBlocks[k].closed) };
  }, kind);
  await wait(400);
  const st0 = await p.evaluate((kind) => { const g = window.app.game, x = window.__X(kind); return { st: x.state, closed: x.gates.map(k => g.world.grid.doorBlocks[k].closed) }; }, kind);
  check(info.gates.length > 0 && st0.closed.every(Boolean), `${kind} idle: ${info.gates.length} gate blocker(s) shut ${JSON.stringify(st0)}`);
  // walk at the cabin (metro: across the platform gate onto the car floor / track bed)
  const tryIn = () => p.evaluate((kind) => {
    const g = window.app.game, x = window.__X(kind), c = x.pts.cabin, f = x.face || 0;
    if (kind === 'metro') {   // through the platform gate in front of the car door, then along the car
      const lx = 2.75, lz = 2.0; window.__walk(x.x + lx * Math.cos(f) + lz * Math.sin(f), x.z - lx * Math.sin(f) + lz * Math.cos(f));
    }
    const pos = window.__walk(c.cx, c.cz);
    return { pos, inCabin: g.sim.cabinRaiders(x).includes(g.me), dist: Math.hypot(pos.x - c.cx, pos.z - c.cz) };
  }, kind);
  const r1 = await tryIn();
  check(!r1.inCabin, `${kind} idle: walking in is blocked (stopped ${r1.dist.toFixed(2)} m from the cabin centre)`);
  if (out) await p.screenshot({ path: `${out}_${kind}_idle.png` });
  // forced: teleport into the cabin -> put back out at the entry
  await p.evaluate((kind) => { const g = window.app.game, x = window.__X(kind), me = g.me; me.x = x.pts.cabin.cx; me.z = x.pts.cabin.cz; me.y = x.pts.cabin.y; window.__f0 = g.time; }, kind);
  await p.waitForFunction(() => window.app.game.time > window.__f0 + 0.2, null, { timeout: 20000 });   // a few frames
  const r2 = await p.evaluate((kind) => { const g = window.app.game, x = window.__X(kind), me = g.me; return { inCabin: g.sim.cabinRaiders(x).includes(me), atEntry: Math.hypot(me.x - x.pts.entry[0], me.z - x.pts.entry[1]) < 0.5 }; }, kind);
  check(!r2.inCabin && r2.atEntry, `${kind} idle: a forced entry is put back at the entry point ${JSON.stringify(r2)}`);
  // called: still shut
  await p.evaluate((kind) => { const g = window.app.game, x = window.__X(kind); g.sim.callExtract(x, null); }, kind);
  await wait(300);
  const r3 = await tryIn();
  const c3 = await p.evaluate((kind) => { const g = window.app.game, x = window.__X(kind); return { st: x.state, closed: x.gates.every(k => g.world.grid.doorBlocks[k].closed), rig: rigDoors(g, x) };
    function rigDoors(g, x) { const R = g.view.extractVis[x.i].m.rig; return R.doorR ? +R.doorR.position.x.toFixed(2) : R.gates ? +R.gates[0].g.position.x.toFixed(2) : null; } }, kind);
  check(c3.st === 'called' && c3.closed && !r3.inCabin, `${kind} called: shut + not enterable ${JSON.stringify(c3)}`);
  // open: board
  await p.evaluate((kind) => { window.__X(kind).t = 0.05; }, kind);
  await p.waitForFunction((kind) => window.__X(kind).state === 'open', kind, { timeout: 30000 });
  await p.waitForFunction((kind) => window.__X(kind).t < 88, kind, { timeout: 60000 });   // 2 s of game time: doors apart
  const c4 = await p.evaluate((kind) => { const g = window.app.game, x = window.__X(kind), R = g.view.extractVis[x.i].m.rig; return { closed: x.gates.some(k => g.world.grid.doorBlocks[k].closed), rigDoor: R.doorR ? +R.doorR.position.x.toFixed(2) : +R.gates[0].g.position.x.toFixed(2) }; }, kind);
  await p.evaluate((kind) => { const g = window.app.game, x = window.__X(kind), me = g.me, [ex, ez] = x.pts.entry; me.x = ex; me.z = ez; me.y = g.world.grid.floorAt(ex, ez, x.pts.cabin.y + 0.6); }, kind);
  const r4 = await tryIn();
  check(!c4.closed && r4.inCabin, `${kind} open: doors open (rig ${c4.rigDoor}) and the cabin is boardable ${JSON.stringify({ inCabin: r4.inCabin, d: +r4.dist.toFixed(2) })}`);
  if (out) await p.screenshot({ path: `${out}_${kind}_open.png` });
  // closing: shut GATE_SHUT s before the end; whoever is inside then stays and extracts (a bot rides along; we
  // step back out while it is still open)
  await p.evaluate((kind) => {
    const g = window.app.game, sim = g.sim, x = window.__X(kind), me = g.me, [ex, ez] = x.pts.entry;
    me.x = ex; me.z = ez; me.y = g.world.grid.floorAt(ex, ez, x.pts.cabin.y + 0.6);
    window.__rider = sim.addRaider({ pid: 'rider', name: 'Rider', bot: true, team: 7, x: x.pts.cabin.cx, z: x.pts.cabin.cz, y: x.pts.cabin.y, stats: { max_hp: 100 } });
    window.__rider.buffs.invuln = 1e9;
    sim.departExtract(x, null); x.t = 1.7;
  }, kind);
  await p.waitForFunction((kind) => window.__X(kind).t < 1.4, kind, { timeout: 60000 });
  const c5 = await p.evaluate((kind) => { const g = window.app.game, x = window.__X(kind), r = window.__rider; return { st: x.state, t: +x.t.toFixed(2), closed: x.gates.every(k => g.world.grid.doorBlocks[k].closed), riderIn: g.sim.cabinRaiders(x).includes(r) }; }, kind);
  check(c5.st === 'closing' && c5.closed && c5.riderIn, `${kind} closing (<1.5 s left): doors shut, the rider inside stays ${JSON.stringify(c5)}`);
  if (out) await p.screenshot({ path: `${out}_${kind}_closing.png` });
  const r6 = await tryIn();
  check(!r6.inCabin, `${kind} closing (shut): can't get in any more`);
  await p.waitForFunction((kind) => window.__X(kind).state === 'gone', kind, { timeout: 20000 }).catch(() => {});
  const c6 = await p.evaluate(() => ({ rider: window.__rider.st, me: window.app.game.me.st }));
  check(c6.rider === 'out' && c6.me === 'alive', `${kind}: the rider extracted at departure, we did not ${JSON.stringify(c6)}`);
  const c7 = await p.evaluate((kind) => { const g = window.app.game, x = window.__X(kind); return x.gates.every(k => g.world.grid.doorBlocks[k].closed); }, kind);
  check(c7, `${kind} gone: shut`);
}
for (const [k, v] of errs) console.log('  ' + v + 'x', k);
await b.close();
console.log(fails || errs.size ? `FAIL (${fails})` : 'PASS');
process.exit(fails || errs.size ? 1 : 0);
