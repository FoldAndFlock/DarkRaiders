// Multi-level regression test on the sandbox: stairs, upper floor, roof ladder, tunnel stairwell,
// bridge (walk on + under), layered nav, interactions by level, screenshots of each level.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8123/index.html?raid=test_range&time=noon&weather=clear', out = '/tmp/lvl'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = new Map();
p.on('console', m => { if (m.type() === 'error') { const t = m.text().slice(0, 200); errs.set(t, (errs.get(t) || 0) + 1); } });
p.on('pageerror', e => { const t = '[pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); errs.set(t, (errs.get(t) || 0) + 1); });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await p.goto(base);
await p.waitForFunction('window.app && window.app.game && window.app.game.running', null, { timeout: 120000 });
await p.mouse.move(640, 300);
const R = await p.evaluate(() => {
  const g = window.app.game, w = g.world, gr = w.grid, me = g.me, out = {};
  document.querySelectorAll('.panel').forEach(n => n.style.display = 'none');
  for (const e of g.sim.entities.values()) if (e.type === 'ark' || (e.type === 'raider' && e.bot)) { e.x = 5; e.z = 5; e.brain && (e.brain.update = () => {}); }
  me.buffs.invuln = 9999;
  const walk = (pos, dx, dz, n) => { for (let i = 0; i < n; i++) { const q = { ...pos }; gr.move(q, dx, dz, 0.33); const fl = gr.floorAt(q.x, q.z, q.y); q.y = fl < q.y - 0.06 ? fl : fl; Object.assign(pos, q); } return pos; };
  const H = w.buildings.find(b => b.name === 'Two-Storey House'), T = w.buildings.find(b => b.name === 'Test Tunnel');
  out.house = { floorY: +H.floorY.toFixed(2), roofY: +H.roofY.toFixed(2) };
  // 1) stairs: start at the stair foot (local 12.4, 0.4 -> ascending +z), walk +z 6 m
  let [sx, sz] = w.local(H, 12.4, 0.9);
  const pos = walk({ x: sx, z: sz, y: H.floorY }, 0, 0.1, 70);
  out.stairs = { endZ: +(pos.z - H.z0).toFixed(2), y: +(pos.y - H.floorY).toFixed(2) };
  // walk west on floor 1 into the room, check we stay upstairs
  walk(pos, -0.1, 0, 60); out.upstairs = { lx: +(pos.x - H.x0).toFixed(2), y: +(pos.y - H.floorY).toFixed(2), inside: gr.insideAt(pos.x, pos.z, pos.y, w.buildings) === H.id };
  // 2) ground floor below the slab: floor + headroom
  const [gx, gz] = w.local(H, 4, 5);
  out.groundFloor = { floor: +(gr.floorAt(gx, gz, H.floorY + 0.2) - H.floorY).toFixed(2), upper: +(gr.floorAt(gx, gz, H.floorY + 3.3) - H.floorY).toFixed(2), blocked: gr.blockedAt(gx, gz, 0.33, H.floorY) };
  // 3) roof ladder
  const li = w.ladders.findIndex(l => l.bid === H.id); const L = w.ladders[li];
  out.ladder = { y0: +L.y0.toFixed(2), y1: +L.y1.toFixed(2), topFloor: +gr.floorAt(L.x1, L.z1, L.y1).toFixed(2) };
  // 4) tunnel: lid surface, floor, stairwell
  const [tx, tz] = w.local(T, 20, 11);
  out.tunnel = { floorY: +T.floorY.toFixed(2), roofY: +T.roofY.toFixed(2), surface: +gr.floorAt(tx, tz, 1e9).toFixed(2), inside: +gr.floorAt(tx, tz, T.floorY + 0.2).toFixed(2), insideAt: gr.insideAt(tx, tz, T.floorY, w.buildings) === T.id, onLid: gr.insideAt(tx, tz, T.roofY + 0.02, w.buildings) };
  // walk down the stairwell from the surface: the stair runs x 0.8..(0.8+len), top at the west end
  let [ux, uz] = w.local(T, 1.6, 10.7);
  const dpos = walk({ x: ux, z: uz, y: T.roofY + 0.02 }, 0.1, 0, 100);
  out.tunnelWalk = { lx: +(dpos.x - T.x0).toFixed(2), y: +(dpos.y - T.floorY).toFixed(2) };
  // 5) bridge: on top and underneath
  out.bridge = { top: +gr.floorAt(167, 150, 6).toFixed(2), under: +gr.floorAt(167, 150, w.groundAt(167, 150) + 0.2).toFixed(2), ground: +w.groundAt(167, 150).toFixed(2), clearUnder: !gr.blockedAt(167, 150, 0.33, w.groundAt(167, 150)) };
  // 6) nav: ground outside the house -> upstairs room
  const [ox, oz] = w.local(H, 4, 12), [ux2, uz2] = w.local(H, 3, 3);
  const path = g.sim.nav.find(ox, oz, ux2, uz2, 8000, w.groundAt(ox, oz), H.floorY + 3.2);
  out.nav = path ? { n: path.length, maxY: +Math.max(...path.map(q => q[2] ?? 0)).toFixed(2), end: path[path.length - 1].map(v => +v.toFixed(1)) } : null;
  const tpath = g.sim.nav.find(tx, tz - 10, tx, tz, 8000, T.roofY, T.floorY);
  out.navTunnel = tpath ? { n: tpath.length, minY: +Math.min(...tpath.map(q => q[2] ?? 0)).toFixed(2) } : null;
  // 7) containers by level
  out.containers = g.containersData.filter(c => ['cabinet', 'desk', 'locker'].includes(c.kind) && Math.abs(c.x - H.x0 - 5) < 8 && Math.abs(c.z - H.z0 - 5) < 8).map(c => c.kind + '@' + (c.y - H.floorY).toFixed(1));
  return out;
});
console.log(JSON.stringify(R, null, 1));
// screenshots: ground floor inside, upstairs, roof, tunnel lid, inside tunnel, under bridge
const shot = async (name, fn) => { await p.evaluate(fn); await wait(1800); await p.screenshot({ path: `${out}_${name}.png` }); };
await shot('groundfloor', () => { const g = window.app.game, w = g.world, H = w.buildings.find(b => b.name === 'Two-Storey House'), [x, z] = w.local(H, 4, 5); Object.assign(g.me, { x, z, y: H.floorY }); });
await shot('upstairs', () => { const g = window.app.game, w = g.world, H = w.buildings.find(b => b.name === 'Two-Storey House'), [x, z] = w.local(H, 4, 5); Object.assign(g.me, { x, z, y: H.floorY + 3.2 }); });
await shot('roof', async () => { const g = window.app.game, w = g.world, H = w.buildings.find(b => b.name === 'Two-Storey House'); const li = w.ladders.findIndex(l => l.bid === H.id), L = w.ladders[li]; Object.assign(g.me, { x: L.x0, z: L.z0, y: L.y0 }); await g.doInteract({ kind: 'ladder', ref: li, up: true }); window.__roofY = g.me.y; });
console.log('after ladder me.y', await p.evaluate(() => window.__roofY?.toFixed(2)));
await shot('lid', () => { const g = window.app.game, w = g.world, T = w.buildings.find(b => b.name === 'Test Tunnel'), [x, z] = w.local(T, 16, 8); Object.assign(g.me, { x, z, y: T.roofY + 0.02 }); });
await shot('tunnel', () => { const g = window.app.game, w = g.world, T = w.buildings.find(b => b.name === 'Test Tunnel'), [x, z] = w.local(T, 16, 10); Object.assign(g.me, { x, z, y: T.floorY }); });
await shot('bridge', () => { const g = window.app.game, w = g.world; Object.assign(g.me, { x: 170, z: 151, y: w.groundAt(170, 151) }); });
await shot('bridgetop', () => { const g = window.app.game; Object.assign(g.me, { x: 170, z: 150, y: 5 }); });
const st = await p.evaluate(() => { const g = window.app.game; return { y: g.me.y.toFixed(2), inside: g.world.inside, it: g.view.findInteractable(g.me, g.pc)?.label || null }; });
console.log('final', JSON.stringify(st));
for (const [k, v] of errs) console.log(v + 'x', k);
await b.close();
