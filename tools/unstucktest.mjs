// "I'm stuck - call a tow" test: drops the raider onto the sandbox's metro track bed (a pit it can't climb
// out of), requests a tow from the pause menu, and checks it is moved after the countdown to a spot from
// which the nav grid reaches a spawn; also that getting hurt cancels the countdown.
//   node tools/unstucktest.mjs [base url]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8123/index.html'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 960, height: 540 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`${base}?raid=test_range&time=noon&weather=clear`);
await p.waitForFunction('window.app && window.app.game && window.app.game.running', null, { timeout: 240000 });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const put = () => p.evaluate(() => {
  const g = window.app.game, sim = g.sim, me = g.me;
  for (const e of [...sim.entities.values()]) if (e.type === 'ark' || (e.type === 'raider' && e.bot)) sim.entities.delete(e.id);
  me.x = 216.25; me.z = 39.25; me.y = 1; me.grace = 1e9;
  return { at: [me.x, me.y, me.z] };
});
let fail = 0;
const ok = (c, m, d = '') => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m} ${d}`); if (!c) fail++; };
// 1) hurt during the countdown -> cancelled
await put();
await p.keyboard.press('Escape'); await wait(400);
let clicked = await p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /STUCK/.test(x.textContent)); b?.click(); return !!b; });
ok(clicked, "pause menu has I'M STUCK - CALL A TOW");
await wait(600);
await p.evaluate(() => { const g = window.app.game; g.sim.damage(g.me, 5, null, {}); });
await wait(4500);   // (headless frames are slow; game time runs behind)
await p.evaluate(() => new Promise(r => { const g = window.app.game, t0 = g.time; const k = () => g.time - t0 > 3.5 ? r() : setTimeout(k, 200); k(); }));
let r = await p.evaluate(() => { const me = window.app.game.me; return [me.x, me.y, me.z]; });
ok(Math.hypot(r[0] - 216.25, r[2] - 39.25) < 1, 'getting hurt cancels the tow', JSON.stringify(r));
// 2) tow after the countdown (cooldown not started by the cancelled one)
await put();
await p.evaluate(() => window.app.game.pc.requestUnstuck());
await p.evaluate(() => new Promise(r => { const g = window.app.game, t0 = g.time; const k = () => g.time - t0 > 3.6 ? r() : setTimeout(k, 200); k(); }));
await wait(500);
r = await p.evaluate(() => {
  const g = window.app.game, me = g.me, nav = g.sim.nav, s = g.world.spawns[0];
  const path = nav.find(me.x, me.z, s.x, s.z, 60000, me.y);
  return { at: [+me.x.toFixed(2), +me.y.toFixed(2), +me.z.toFixed(2)], pathToSpawn: !!path, feed: (g.feedList || []).slice(-3).map(f => f.text || f[0] || f) };
});
ok(Math.hypot(r.at[0] - 216.25, r.at[2] - 39.25) >= 1.5 && r.at[1] > 1.2, 'towed off the fenced-in track bed (track 1.0 m, platform 1.38 m)', JSON.stringify(r.at));
ok(r.pathToSpawn, 'the new spot connects to a spawn');
if (errs.length) { console.log('page errors:', errs); fail++; }
console.log(fail ? 'FAIL' : 'PASS');
await b.close();
process.exit(fail ? 1 : 0);
