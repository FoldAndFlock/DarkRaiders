// Co-op (host + client over the local BroadcastChannel transport): the client sees the extraction doors / gates
// in the same state as the host (its own grid collides with them; a forced entry is put back out), tracers for
// the host's and the ARK's shots, ARK hit wobble ('ahit') and the damage state from the replicated hp fraction.
//   node tools/coopark.mjs [base url]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8244/index.html?dev&net=local'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
const A = await ctx.newPage(), B = await ctx.newPage();
const errs = new Map();
for (const [n, p] of [['A', A], ['B', B]]) {
  p.on('console', m => { if (m.type() === 'error') { const t = n + ' ' + m.text().slice(0, 250); errs.set(t, (errs.get(t) || 0) + 1); } });
  p.on('pageerror', e => { const t = n + ' [pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); errs.set(t, (errs.get(t) || 0) + 1); });
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (ok, msg) => { console.log((ok ? '  ok   ' : '  FAIL ') + msg); if (!ok) fails++; };
await A.goto(base); await B.goto(base);
await A.waitForFunction(() => window.__ready); await B.waitForFunction(() => window.__ready);
await A.evaluate(() => { window.app.profile.name = 'HOSTY'; window.app.screens.lobby(); });
await B.evaluate(() => { window.app.profile.name = 'BUDDY'; window.app.screens.lobby(); });
await A.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('HOST A SQUAD')).click());
await wait(800);
const code = await A.evaluate(() => window.app.screens.net?.code);
await B.evaluate((c) => { const i = document.querySelector('input'); i.value = c; [...document.querySelectorAll('button')].find(b => b.textContent === 'JOIN').click(); }, code);
await wait(1200);
await B.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('READY UP')).click());
await wait(500);
await A.evaluate(() => { window.app.screens.lobbyMap = 'test_range'; window.app.screens.net.setMap('test_range'); [...document.querySelectorAll('button')].find(b => b.textContent.includes('START')).click(); });
await A.waitForFunction(() => window.app.game && window.app.game.running, null, { timeout: 180000 });
await B.waitForFunction(() => window.app.game && window.app.game.running, null, { timeout: 180000 });
await wait(2000);
await A.evaluate(() => { const g = window.app.game; g.me.buffs.invuln = 1e9; for (const e of [...g.sim.entities.values()]) if (e.type === 'ark' || (e.type === 'raider' && e.bot)) g.sim.entities.delete(e.id); for (const e of g.sim.entities.values()) if (e.type === 'raider') { e.buffs.invuln = 1e9; e.grace = 1e9; } });
const gateB = () => B.evaluate(() => { const g = window.app.game, x = g.extractsData.find(e => e.kind === 'elevator'); return { st: x.state, t: +(+x.t).toFixed(1), shut: x.gates.every(k => g.world.grid.doorBlocks[k].closed) }; });
const gateA = () => A.evaluate(() => { const g = window.app.game, x = g.sim.extracts.find(e => e.kind === 'elevator'); return { st: x.state, t: +(+x.t).toFixed(1), shut: x.gates.every(k => g.world.grid.doorBlocks[k].closed) }; });
console.log('== gates');
let a = await gateA(), c = await gateB();
check(a.shut && c.shut && a.st === 'idle' && c.st === 'idle', `idle: host ${JSON.stringify(a)} client ${JSON.stringify(c)}`);
// client forced into the cabin while idle -> back out at the entry (on the client's own peer)
await B.evaluate(() => { const g = window.app.game, x = g.extractsData.find(e => e.kind === 'elevator'), me = g.me; me.x = x.pts.cabin.cx; me.z = x.pts.cabin.cz; me.y = x.pts.cabin.y; window.__t0 = g.time; });
await B.waitForFunction(() => window.app.game.time > window.__t0 + 0.3, null, { timeout: 20000 });
const fb = await B.evaluate(() => { const g = window.app.game, x = g.extractsData.find(e => e.kind === 'elevator'), me = g.me; return { atEntry: Math.hypot(me.x - x.pts.entry[0], me.z - x.pts.entry[1]) < 0.6 }; });
check(fb.atEntry, 'client forced into the idle cabin is put back at the entry');
// client walks at the shut door with its own collision
const walkB = () => B.evaluate(() => { const g = window.app.game, x = g.extractsData.find(e => e.kind === 'elevator'), me = g.me, grid = g.world.grid, cz = x.pts.cabin;
  for (let i = 0; i < 140; i++) { const dx = cz.cx - me.x, dz = cz.cz - me.z, d = Math.hypot(dx, dz); if (d < 0.1) break; const s = Math.min(d, 0.12), q = { x: me.x, z: me.z, y: me.y }; grid.move(q, dx / d * s, dz / d * s, 0.33); me.x = q.x; me.z = q.z; me.y = grid.floorAt(q.x, q.z, q.y); }
  return +Math.hypot(me.x - cz.cx, me.z - cz.cz).toFixed(2); });
check((await walkB()) > 2.2, 'client: walking into the idle elevator is blocked by its own grid');
await A.evaluate(() => { const g = window.app.game, x = g.sim.extracts.find(e => e.kind === 'elevator'); g.sim.callExtract(x, null); });
await B.waitForFunction(() => window.app.game.extractsData.find(e => e.kind === 'elevator').state === 'called', null, { timeout: 30000 });
await wait(500);
a = await gateA(); c = await gateB();
check(a.shut && c.shut, `called: host ${JSON.stringify(a)} client ${JSON.stringify(c)}`);
await A.evaluate(() => { window.app.game.sim.extracts.find(e => e.kind === 'elevator').t = 0.05; });
await B.waitForFunction(() => { const x = window.app.game.extractsData.find(e => e.kind === 'elevator'); return x.state === 'open' && x.t < 88.5; }, null, { timeout: 60000 });
a = await gateA(); c = await gateB();
check(!a.shut && !c.shut, `open: host ${JSON.stringify(a)} client ${JSON.stringify(c)}`);
await B.evaluate(() => { const g = window.app.game, x = g.extractsData.find(e => e.kind === 'elevator'), me = g.me; me.x = x.pts.entry[0]; me.z = x.pts.entry[1]; me.y = g.world.grid.floorAt(me.x, me.z, x.pts.cabin.y + 0.6); });
check((await walkB()) < 0.3, 'client boards the open elevator');
await B.evaluate(() => { const g = window.app.game, x = g.extractsData.find(e => e.kind === 'elevator'), me = g.me; me.x = x.pts.entry[0]; me.z = x.pts.entry[1]; me.y = g.world.grid.floorAt(me.x, me.z, x.pts.cabin.y + 0.6); g.session.state({ x: me.x, y: me.y, z: me.z }); });
await A.evaluate(() => { const g = window.app.game, x = g.sim.extracts.find(e => e.kind === 'elevator'); g.sim.departExtract(x, null); x.t = 1.7; });
await B.waitForFunction(() => { const x = window.app.game.extractsData.find(e => e.kind === 'elevator'); return x.state === 'closing' && x.t < 1.4; }, null, { timeout: 60000 });
a = await gateA(); c = await gateB();
check(a.shut && c.shut, `closing, last 1.5 s: host ${JSON.stringify(a)} client ${JSON.stringify(c)}`);
console.log('== ARK combat FX on the client');
const ids = await A.evaluate(() => {
  const g = window.app.game, sim = g.sim, bud = [...sim.entities.values()].find(e => e.type === 'raider' && e.name === 'BUDDY');
  const w = sim.spawnArk('wasp', bud.x + 3, bud.z - 3, { baseY: sim.spawnY(bud.x + 3, bud.z - 3) }); w.brain.update = () => {}; w.dormant = false;
  window.__w = w; window.__bud = bud;
  return { w: w.id };
});
await B.waitForFunction((id) => window.app.game.ents.has(id) && window.app.game.view.vis.get(id), ids.w, { timeout: 30000 });
const tr0 = await B.evaluate(() => { const T = window.app.game.fx.tracers; window.__trN = 0; const add = T.add.bind(T); T.add = (...a) => { window.__trN++; window.__trK = (window.__trK || []).concat(a[6]); return add(...a); }; return 0; });
await A.evaluate(() => {
  const g = window.app.game, sim = g.sim, w = window.__w, bud = window.__bud, me = g.me;
  const m = w.brain.muzzle(); sim.shoot(w, m, Math.atan2(bud.x - m.x, bud.z - m.z), (bud.y + 1.1 - m.y) / Math.hypot(bud.x - m.x, bud.z - m.z), { dmg: 0.01, range: 30 }, { spread: 1, team: -1, vis: 'ark' });
  const o = { x: me.x, y: me.y + 1.3, z: me.z }; sim.shoot(me, o, Math.atan2(w.x - o.x, w.z - o.z), 0, { dmg: 0.01, range: 60 }, { spread: 1, team: 1, vis: 'rifle' });
});
await B.waitForFunction(() => window.__trN >= 2, null, { timeout: 20000 }).catch(() => {});
const tr = await B.evaluate(() => ({ n: window.__trN, cols: (window.__trK || []).map(c => '#' + c.toString(16)) }));
check(tr.n >= 2, `client drew tracers for the ARK's and the host's shots ${JSON.stringify(tr)}`);
await A.evaluate(() => { const g = window.app.game, w = window.__w, me = g.me, dx = w.x - me.x, dz = w.z - me.z, l = Math.hypot(dx, dz); for (let i = 0; i < 6; i++) g.sim.damage(w, 9, me, { dirX: dx / l, dirZ: dz / l, x: w.x, z: w.z }); });
await B.waitForFunction((id) => { const R = window.app.game.view.vis.get(id)?.ark?.rig; return R && (Math.abs(R.wb.vx) + Math.abs(R.wb.vz) + Math.abs(R.wb.x) + Math.abs(R.wb.z)) > 0.05; }, ids.w, { timeout: 20000 }).catch(() => {});
const wob = await B.evaluate((id) => { const R = window.app.game.view.vis.get(id).ark.rig; return { x: +R.wb.x.toFixed(2), z: +R.wb.z.toFixed(2), vx: +R.wb.vx.toFixed(2), vz: +R.wb.vz.toFixed(2) }; }, ids.w);
check(Math.abs(wob.x) + Math.abs(wob.z) + Math.abs(wob.vx) + Math.abs(wob.vz) > 0.05, `client: hit wobble from 'ahit' ${JSON.stringify(wob)}`);
for (const [f, st] of [[0.5, 1], [0.25, 2], [0.08, 3]]) {
  await A.evaluate((f) => { const w = window.__w; w.hp = w.maxHp * f; }, f);
  await B.waitForFunction(([id, st]) => window.app.game.view.vis.get(id)?.ark?.rig?.dmg === st, [ids.w, st], { timeout: 20000 }).catch(() => {});
  const d = await B.evaluate((id) => ({ hpf: window.app.game.ents.get(id)?.hpf, dmg: window.app.game.view.vis.get(id)?.ark?.rig?.dmg }), ids.w);
  check(d.dmg === st, `client damage state at ${f * 100}% hp: ${JSON.stringify(d)}`);
}
for (const [k, v] of errs) console.log('  ' + v + 'x', k);
await b.close();
console.log(fails || errs.size ? `FAIL (${fails})` : 'PASS');
process.exit(fails || errs.size ? 1 : 0);
