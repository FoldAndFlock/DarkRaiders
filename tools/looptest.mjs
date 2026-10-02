// Gameplay loop test on test_range: fight ARK, loot a container, call extract, extract, results.
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8123/index.html?dev', out = '/tmp/loop'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = new Map();
p.on('console', m => { const t = m.text().slice(0, 250); if (m.type() === 'error' || m.type() === 'warning') errs.set(t, (errs.get(t) || 0) + 1); });
p.on('pageerror', e => { const t = '[pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); errs.set(t, (errs.get(t) || 0) + 1); });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await p.goto(base);
await p.waitForFunction('window.__ready');
await p.evaluate(() => { window.app.screens.lobby(); window.app.screens.lobbyMap = 'test_range'; window.app.screens.fc = { test_range: { cond: null, time: 'noon', weather: 'clear' } }; window.app.screens.renderLobby(); [...document.querySelectorAll('button')].find(b => b.textContent.includes('DEPLOY SOLO')).click(); });
await p.waitForFunction('window.app.game && window.app.game.running', null, { timeout: 120000 });
await wait(1500);
// teleport next to the tick spawn at the depot and fight
const info = await p.evaluate(() => { const g = window.app.game, me = g.me; me.x = 112; me.z = 96; me.y = g.world.groundAt(me.x, me.z); g.camX = me.x; g.camZ = me.z;
  const ark = [...g.ents.values()].filter(e => e.type === 'ark').map(e => `${e.kind}@${e.x.toFixed(0)},${e.z.toFixed(0)} ${e.st}`); return ark; });
console.log('ark', JSON.stringify(info));
await p.mouse.move(640, 300);
for (let i = 0; i < 6; i++) { await p.mouse.down(); await wait(250); await p.mouse.up(); await wait(400); }
await p.screenshot({ path: out + '_fight.png' });
const s1 = await p.evaluate(() => { const g = window.app.game; return { hp: g.me.hp.toFixed(0), st: g.me.st, ark: [...g.ents.values()].filter(e => e.type === 'ark').map(e => `${e.kind}:${e.st}:${e.hp.toFixed(0)}`), feed: g.feedList.map(f => f.text), ammo: g.pc.weapon?.ammo }; });
console.log(JSON.stringify(s1));
// loot the weapon case in the depot
await p.evaluate(() => { const g = window.app.game, me = g.me; const c = g.containersData.find(c => c.kind === 'weapon_case'); me.x = c.x; me.z = c.z + 1.0; me.st = 'alive'; me.hp = 100; me.buffs.invuln = 9999; g.doInteract({ kind: 'container', ref: c.i, x: c.x, z: c.z, label: 'SEARCH Weapon Case' }); });
await wait(1500);
await p.screenshot({ path: out + '_loot.png' });
await p.evaluate(async () => { const ui = window.app.game.ui; await ui.takeAll(); ui.closeInv(); });
// call the north lift and stand on it
await p.evaluate(() => { const g = window.app.game, me = g.me, x = g.extractsData.find(e => e.kind === 'elevator'); me.x = x.x; me.z = x.z; g.doInteract({ kind: 'extract', ref: x.i, x: x.x, z: x.z }); });
await wait(1000);
await p.screenshot({ path: out + '_extract.png' });
// speed up: fast-forward the extract timer
await p.evaluate(() => { const g = window.app.game; const x = g.sim.extracts.find(e => e.state === 'called'); if (x) x.t = 1; });
await p.waitForFunction('window.app.game.localDone', null, { timeout: 120000 }).catch(() => console.log('no extraction'));
await p.waitForFunction('!window.app.game.running', null, { timeout: 60000 }).catch(() => console.log('raid did not end'));
await wait(1500);
await p.screenshot({ path: out + '_results.png' });
console.log('profile', await p.evaluate(() => { const pr = window.app.profile; return JSON.stringify({ lvl: pr.level, xp: pr.xp, extracts: pr.stats.extracts, backpack: pr.loadout.backpack.filter(Boolean).map(s => s.id + 'x' + s.qty) }); }));
for (const [k, v] of errs) console.log(v + 'x', k);
await b.close();
