// Flyer collision test: every flying ARK archetype flies routes that cross buildings, towers, walls and decks
// on each map (plus: starting indoors / under a deck, following a raider in through a doorway, being knocked
// into walls); the hull (radius fr, half-height fh around e.y + e.alt) must never overlap a solid.
//   node tools/flytest.mjs [base url] [maps,comma,separated] [routes per map]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8244/index.html', mapsArg = 'damn_grounds,green_gate,sandy_city', nArg = '14'] = process.argv;
const maps = mapsArg.split(',');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
for (const map of maps) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = new Map();
  p.on('console', m => { const t = m.text().slice(0, 300); if (m.type() === 'error') errs.set(t, (errs.get(t) || 0) + 1); });
  p.on('pageerror', e => { const t = '[pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); errs.set(t, (errs.get(t) || 0) + 1); });
  await p.goto(`${base}?raid=${map}&time=noon&weather=clear`);
  await p.waitForFunction('window.app && window.app.game && window.app.game.running', null, { timeout: 400000 });
  const r = await p.evaluate((nRoutes) => {
    const g = window.app.game, sim = g.sim, grid = sim.grid, W = sim.world;
    g.running = false;                                   // the sim is driven by hand below
    for (const e of [...sim.entities.values()]) if (e.type === 'ark') sim.entities.delete(e.id);
    const CELL = 0.5;
    // independent overlap check: any solid in the hull's vertical band under its footprint
    const inside = (e, br) => {
      const H = e.y + e.alt, ya = H - br.fh, yb = H + br.fh, r = br.fr * 0.999;
      for (let cz = Math.floor((e.z - r) / CELL); cz <= Math.floor((e.z + r) / CELL); cz++)
        for (let cx = Math.floor((e.x - r) / CELL); cx <= Math.floor((e.x + r) / CELL); cx++) {
          const nx = Math.max(cx * CELL, Math.min(e.x, (cx + 1) * CELL)), nz = Math.max(cz * CELL, Math.min(e.z, (cz + 1) * CELL));
          if ((nx - e.x) ** 2 + (nz - e.z) ** 2 >= r * r) continue;
          if (cx < 0 || cz < 0 || cx >= grid.cw || cz >= grid.ch) return 'out of map';
          if (grid.solidIn(cz * grid.cw + cx, ya, yb)) return `cell ${cx},${cz} band ${ya.toFixed(2)}..${yb.toFixed(2)} top ${grid.top[cz * grid.cw + cx].toFixed(2)}`;
        }
      return null;
    };
    let s = 777; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    const kinds = ['wazp', 'hornett', 'fyrefly', 'snytch', 'spottr', 'rocketier', 'vaporiser', 'turbyne'];
    // routes: straight through buildings (tallest first + random), across tall solids (towers / cliffs / piers)
    const blds = W.buildings.filter(B => !B.under && B.h > 2).sort((a, c) => c.h - a.h);
    const pick = [...blds.slice(0, Math.ceil(nRoutes / 2)), ...blds.slice(Math.ceil(nRoutes / 2)).sort(() => rnd() - 0.5).slice(0, nRoutes - Math.ceil(nRoutes / 2))];
    const routes = [];
    for (const B of pick) {
      const cx = (B.ax0 + B.ax1) / 2, cz = (B.az0 + B.az1) / 2, a = rnd() * Math.PI * 2, R = Math.max(B.ax1 - B.ax0, B.az1 - B.az0) / 2 + 12;
      routes.push({ name: 'bld ' + (B.name || B.id) + ' h' + B.h.toFixed(1), x0: cx - Math.sin(a) * R, z0: cz - Math.cos(a) * R, x1: cx + Math.sin(a) * R, z1: cz + Math.cos(a) * R });
    }
    // tall solids: cells standing > 7 m over the ground (towers, gate walls, dam, cliffs)
    const tall = [];
    for (let i = 0; i < 4000 && tall.length < 4; i++) {
      const x = 20 + rnd() * (W.w - 40), z = 20 + rnd() * (W.h - 40);
      if (grid.floorAt(x, z, 1e9) - W.groundAt(x, z) > 7 && !tall.some(t => Math.hypot(t[0] - x, t[1] - z) < 40)) tall.push([x, z]);
    }
    for (const [x, z] of tall) { const a = rnd() * Math.PI * 2; routes.push({ name: 'tall', x0: x - Math.sin(a) * 18, z0: z - Math.cos(a) * 18, x1: x + Math.sin(a) * 18, z1: z + Math.cos(a) * 18 }); }
    // under a ceiling: start inside a building / under a deck and fly out across the map
    const covered = [];
    for (let i = 0; i < 6000 && covered.length < 3; i++) {
      const x = 20 + rnd() * (W.w - 40), z = 20 + rnd() * (W.h - 40), gy = sim.spawnY(x, z);
      const c = grid.ceilAt(x, z, gy + 0.2);
      if (c < Infinity && c - gy > 2.6 && !grid.blockedAt(x, z, 0.8, gy) && sim.nav.open(x, z, gy)) covered.push([x, z, gy]);
    }
    for (const [x, z, y] of covered) { const a = rnd() * Math.PI * 2; routes.push({ name: 'indoor start', x0: x, z0: z, y0: y, x1: x + Math.sin(a) * 30, z1: z + Math.cos(a) * 30 }); }
    const out = { routes: routes.length, runs: 0, ticks: 0, bad: [], arrived: 0, slow: [] };
    const dt = 1 / 30;
    for (const rt of routes) for (const k of kinds) {
      const y0 = rt.y0 ?? sim.spawnY(rt.x0, rt.z0);
      const e = sim.spawnArk(k, rt.x0, rt.z0, { baseY: y0 });
      if (!e) continue;
      sim._rehash();
      const br = e.brain, d0 = Math.hypot(rt.x1 - rt.x0, rt.z1 - rt.z0), T = d0 / (br.speed() * 0.9) * 3 + 12;
      out.runs++;
      let bad = inside(e, br), t = 0, arrived = false, maxH = 0; const trace = [];
      if (bad) out.bad.push(`${k} ${rt.name} spawn: ${bad}`);
      for (; t < T && !bad; t += dt) {
        sim.pathBudget = 4; sim.seekBudget = 6;          // per-tick planning budgets (Sim.tick sets them)
        if (br.moveTo(rt.x1, rt.z1, dt, 0.9)) { arrived = true; break; }
        br.physics(dt);
        maxH = Math.max(maxH, e.y + e.alt - W.groundAt(e.x, e.z));
        if (Math.round(t * 30) % 60 === 0) trace.push(`${t.toFixed(0)}s ${e.x.toFixed(1)},${e.z.toFixed(1)} H${(e.y + e.alt).toFixed(1)} g${W.groundAt(e.x, e.z).toFixed(1)}${grid.ceilAt(e.x, e.z, e.y + e.alt) < Infinity ? ' COV' : ''}`);
        out.ticks++;
        const w = inside(e, br); if (w) { bad = w; out.bad.push(`${k} ${rt.name} t=${t.toFixed(1)} @${e.x.toFixed(1)},${(e.y + e.alt).toFixed(2)},${e.z.toFixed(1)}: ${w}`); }
      }
      if (arrived) out.arrived++; else if (!bad) out.slow.push(`${k} ${rt.name} ${rt.x0.toFixed(1)},${rt.z0.toFixed(1)}->${rt.x1.toFixed(1)},${rt.z1.toFixed(1)} left ${Math.hypot(rt.x1 - e.x, rt.z1 - e.z).toFixed(1)} m | ` + trace.slice(-6).join(' | '));
      // knocked hard into the nearest wall: shoves are collision-checked too
      for (let i = 0; i < 6 && !bad; i++) {
        const a = i * Math.PI / 3; br.hit = { x: Math.sin(a) * 400, z: Math.cos(a) * 400, d: 400, big: true }; br.applyHit();
        for (let j = 0; j < 20 && !bad; j++) { br.physics(dt); br.hover(dt); const w = inside(e, br); if (w) { bad = w; out.bad.push(`${k} ${rt.name} knockback: ${w}`); } }
      }
      sim.entities.delete(e.id); sim.events.length = 0;
    }
    // small flyers following a raider in through an open doorway (low mode, under the ceiling)
    const doors = [];
    for (const B of W.buildings) { if (B.under) continue; for (const op of sim.openings(B.id)) if (op.walk && (op.door < 0 || sim.doors[op.door].open) && op.w >= 1.4) { doors.push({ B, op }); break; } if (doors.length >= 6) break; }
    out.enter = { runs: 0, inside: 0 };
    for (const { B, op } of doors) for (const k of ['wazp', 'hornett', 'fyrefly']) {
      const tx = op.x - op.nx * 2.5, tz = op.z - op.nz * 2.5, ty = op.y0;   // a spot just inside the doorway
      if (grid.insideAt(tx, tz, ty + 0.5, W.buildings) < 0) continue;
      const sx = op.x + op.nx * 14, sz = op.z + op.nz * 14;
      const e = sim.spawnArk(k, sx, sz, { baseY: sim.spawnY(sx, sz) }); if (!e) continue;
      const br = e.brain; out.enter.runs++;
      let bad = null, t = 0;
      for (; t < 25 && !bad; t += dt) {
        sim.pathBudget = 4; sim.seekBudget = 6;
        br.moveTo(tx, tz, dt, 0.9, ty, { enter: true });
        out.ticks++;
        const w = inside(e, br); if (w) { bad = w; out.bad.push(`${k} enter ${B.name || B.id} t=${t.toFixed(1)}: ${w}`); }
        if (grid.insideAt(e.x, e.z, e.y + 0.3, W.buildings) === B.id && Math.hypot(tx - e.x, tz - e.z) < 1.5) { out.enter.inside++; break; }
      }
      // ceiling respected inside
      if (!bad && grid.ceilAt(e.x, e.z, e.y + e.alt) < e.y + e.alt + br.fh - 0.01) out.bad.push(`${k} enter: above the ceiling`);
      sim.entities.delete(e.id); sim.events.length = 0;
    }
    return out;
  }, +nArg);
  console.log(map, JSON.stringify({ routes: r.routes, runs: r.runs, ticks: r.ticks, arrived: r.arrived, notArrived: r.slow.length, violations: r.bad.length, enter: r.enter }));
  for (const x of r.bad.slice(0, 20)) console.log('  VIOLATION', x);
  for (const x of r.slow.slice(0, +(process.env.NSLOW || 8))) console.log('  slow', x);
  for (const [k, v] of errs) console.log('  ' + v + 'x', k);
  if (r.bad.length || errs.size) fails++;
  await p.close();
}
await b.close();
console.log(fails ? 'FAIL' : 'PASS');
process.exit(fails ? 1 : 0);
