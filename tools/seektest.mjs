// ARK firing positions: a raider steps into a building with an open door; an ARK that saw them (alert, out of
// sight now) must find an angle through the doorway / a window (or, small enough, fly in) and open fire. Big ARK
// (bastion, rocketeer) must never go inside. Reports the time to the first shot (sim seconds).
//   node tools/seektest.mjs [base url] [maps] [trials per map] [screenshot prefix]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8244/index.html', mapsArg = 'test_range,damn_grounds,sandy_city', nArg = '4', shot = ''] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let fails = 0;
for (const map of mapsArg.split(',')) {
  const p = await b.newPage({ viewport: { width: 960, height: 540 } });
  const errs = new Map();
  p.on('console', m => { const t = m.text().slice(0, 300); if (m.type() === 'error') errs.set(t, (errs.get(t) || 0) + 1); });
  p.on('pageerror', e => { const t = '[pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); errs.set(t, (errs.get(t) || 0) + 1); });
  await p.goto(`${base}?raid=${map}&time=noon&weather=clear${map === 'test_range' ? '&dev' : ''}`);
  await p.waitForFunction('window.app && window.app.game && window.app.game.running', null, { timeout: 400000 });
  const r = await p.evaluate((n) => {
    const g = window.app.game, sim = g.sim, grid = sim.grid, W = sim.world, me = g.me;
    g.running = false;
    me.buffs.invuln = 1e9; me.grace = 0; me.crouch = false;
    const clear = () => { for (const e of [...sim.entities.values()]) if (e.type === 'ark' || (e.type === 'raider' && e.bot)) sim.entities.delete(e.id); sim.events.length = 0; };
    // buildings with an open ground-floor doorway
    const cands = [];
    for (const B of W.buildings) {
      if (B.under || B.h < 2.8) continue;
      const op = sim.openings(B.id).find(o => o.walk && o.y0 - B.floorY < 0.2 && o.w >= 1.4 && (o.door < 0 || sim.doors[o.door].open));
      if (op) cands.push({ B, op });
    }
    let s = 99; const rnd = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
    cands.sort(() => rnd() - 0.5);
    const out = [];
    for (const { B, op } of cands.slice(0, n)) {
      // the raider: just inside the doorway, off its centre line - or deeper in, round the corner from it
      for (const [din, dside] of [[2.5, 1.2], [5.5, 3.2]]) {
      const tx = op.x - op.nx * din + op.nz * dside, tz = op.z - op.nz * din - op.nx * dside;
      if (grid.insideAt(tx, tz, op.y0 + 0.5, W.buildings) !== B.id || grid.blockedAt(tx, tz, 0.35, op.y0)) continue;
      for (const kind of ['wasp', 'hornet', 'bastion', 'rocketeer']) {
        clear();
        me.x = tx; me.z = tz; me.y = grid.floorAt(tx, tz, op.y0 + 0.5); me.st = 'alive'; me.hp = me.maxHp;
        // the ARK: outside, 16 m away, 75 deg off the doorway's axis (walls in the way at first)
        let e = null;
        for (const side of [1, -1]) {
          const a = Math.atan2(op.nx, op.nz) + side * 1.3, sx = op.x + Math.sin(a) * 16, sz = op.z + Math.cos(a) * 16;
          if (grid.insideAt(sx, sz, sim.spawnY(sx, sz) + 0.5, W.buildings) >= 0 || !sim.nav.open(sx, sz, sim.spawnY(sx, sz))) continue;
          e = sim.spawnArk(kind, sx, sz, { baseY: sim.spawnY(sx, sz) }); if (e) break;
        }
        if (!e) continue;
        sim._rehash();
        const br = e.brain, eye0 = br.eyeY(), los0 = sim.canSee(e, me, eye0);
        e.st = 'alert'; br.target = me.id; br.lastSeen = [me.x, me.z, me.y]; br.lostT = 0; e.vis = 1; e.dormant = false;
        let t = 0, first = null, entered = false, firstPos = null, viaInside = false;
        const dt = 1 / 30;
        for (; t < 25; t += dt) {
          sim.tick(dt);
          if (grid.insideAt(e.x, e.z, e.y + 0.3, W.buildings) === B.id) entered = true;
          const shot = sim.events.find(ev => ev.e === 'shot' && ev.s === e.id) || sim.events.find(ev => (ev.e === 'rockets' || ev.e === 'mortar') && ev.id === e.id);
          sim.events.length = 0;
          if (shot && first == null) { first = t; firstPos = [e.x, e.y + (e.alt || 0), e.z]; viaInside = entered; break; }
          if (e.st === 'dead' || !sim.entities.has(e.id)) break;
        }
        const endS = first == null ? `${e.st} @${e.x.toFixed(1)},${(e.y + (e.alt || 0)).toFixed(1)},${e.z.toFixed(1)} seek ${JSON.stringify(br.seekP && { x: +br.seekP.x.toFixed(1), z: +br.seekP.z.toFixed(1), enter: !!br.seekP.enter })} hold ${!!br.holdP} me ${me.x.toFixed(1)},${me.y.toFixed(1)},${me.z.toFixed(1)}` : undefined;
        out.push({ end: endS, b: B.name || B.id, deep: din > 3, kind, losAtStart: los0, first: first == null ? null : +first.toFixed(2), entered, viaInside, d: firstPos ? +Math.hypot(firstPos[0] - me.x, firstPos[2] - me.z).toFixed(1) : null, h: firstPos ? +(firstPos[1] - me.y).toFixed(1) : null });
      }
      }
    }
    clear();
    return out;
  }, +nArg);
  const small = r.filter(x => x.kind === 'wasp' || x.kind === 'hornet'), big = r.filter(x => x.kind === 'bastion' || x.kind === 'rocketeer');
  console.log(`${map}: ${r.length} runs`);
  for (const x of r) console.log('  ' + JSON.stringify(x));
  const fired = small.filter(x => x.first != null), times = fired.map(x => x.first).sort((a, b) => a - b);
  console.log(`  small ARK fired in ${fired.length}/${small.length} runs; time to first shot median ${times[times.length >> 1] ?? '-'} s, max ${times[times.length - 1] ?? '-'} s; went inside ${small.filter(x => x.entered).length}`);
  const bigIn = big.filter(x => x.entered);
  console.log(`  big ARK went inside: ${bigIn.length}/${big.length}; fired ${big.filter(x => x.first != null).length}/${big.length}`);
  if (bigIn.length || fired.length < small.length * 0.75) fails++;
  for (const [k, v] of errs) { console.log('  ' + v + 'x', k); fails++; }
  await p.close();
}
await b.close();
console.log(fails ? 'FAIL' : 'PASS');
process.exit(fails ? 1 : 0);
