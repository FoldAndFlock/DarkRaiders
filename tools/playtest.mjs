// Headless playtest: load a raid, drive inputs, capture screenshots + console errors.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, url, outPrefix = '/tmp/pt', steps = 'default'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const errs = new Map();
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text().slice(0, 300); errs.set(t, (errs.get(t) || 0) + 1); } });
p.on('pageerror', e => { const t = '[pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); errs.set(t, (errs.get(t) || 0) + 1); });
await p.goto(url);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await p.waitForFunction(() => window.app && window.app.game && window.app.game.running, null, { timeout: 120000 }).catch(e => console.log('never started', e.message));
await wait(1500);
await p.screenshot({ path: outPrefix + '_0.png' });
const fps = async () => p.evaluate(() => new Promise(r => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); }));
console.log('fps ~', await fps());
if (steps === 'default') {
  await p.mouse.move(1300, 400);
  await p.keyboard.down('KeyD'); await wait(1200); await p.keyboard.up('KeyD');
  await p.keyboard.down('KeyW'); await wait(800); await p.keyboard.up('KeyW');
  await p.screenshot({ path: outPrefix + '_1.png' });
  await p.mouse.down(); await wait(900); await p.mouse.up();
  await wait(200);
  await p.screenshot({ path: outPrefix + '_2.png' });
  await p.keyboard.press('Tab'); await wait(500);
  await p.screenshot({ path: outPrefix + '_3.png' });
  await p.keyboard.press('Tab'); await p.keyboard.press('KeyM'); await wait(800);
  await p.screenshot({ path: outPrefix + '_4.png' });
  await p.keyboard.press('KeyM');
}
const st = await p.evaluate(() => { const g = window.app.game; const me = g.me; return { me: me && { x: me.x.toFixed(1), z: me.z.toFixed(1), hp: me.hp, st: me.st }, ents: g.ents.size, ark: [...g.ents.values()].filter(e => e.type === 'ark').length, bots: [...g.ents.values()].filter(e => e.type === 'raider' && e.bot).length, t: g.simTime?.toFixed(1) }; }).catch(e => 'eval failed ' + e.message);
console.log(JSON.stringify(st));
for (const [k, v] of errs) console.log(v + 'x', k);
await b.close();
