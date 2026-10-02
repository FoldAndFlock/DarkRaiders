// Two pages: host + client over the local BroadcastChannel transport (or PeerJS with net=peer).
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8123/index.html?dev&net=local', out = '/tmp/coop'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
const A = await ctx.newPage(), B = await ctx.newPage();
const errs = new Map();
for (const [n, p] of [['A', A], ['B', B]]) {
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { const t = n + ' ' + m.text().slice(0, 250); errs.set(t, (errs.get(t) || 0) + 1); } });
  p.on('pageerror', e => { const t = n + ' [pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); errs.set(t, (errs.get(t) || 0) + 1); });
}
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await A.goto(base); await B.goto(base);
await A.waitForFunction('window.__ready'); await B.waitForFunction('window.__ready');
await A.evaluate(() => { window.app.profile.name = 'HOSTY'; window.app.screens.lobby(); });
await B.evaluate(() => { window.app.profile.name = 'BUDDY'; window.app.screens.lobby(); });
await A.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('HOST A SQUAD')).click());
await wait(800);
const code = await A.evaluate(() => window.app.screens.net?.code);
console.log('code', code);
await B.evaluate((c) => { const i = document.querySelector('input'); i.value = c; [...document.querySelectorAll('button')].find(b => b.textContent === 'JOIN').click(); }, code);
await wait(1200);
await B.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('READY UP')).click());
await B.evaluate(() => { const i = [...document.querySelectorAll('input')].find(x => x.placeholder === 'SAY SOMETHING'); i.value = 'hello from buddy'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); });
await wait(800);
await A.screenshot({ path: out + '_lobbyA.png' });
console.log('members A', await A.evaluate(() => JSON.stringify(window.app.screens.net.members.map(m => [m.name, m.ready, m.slot]))));
await A.evaluate(() => { window.app.screens.lobbyMap = 'test_range'; window.app.screens.net.setMap('test_range'); [...document.querySelectorAll('button')].find(b => b.textContent.includes('START')).click(); });
await A.waitForFunction('window.app.game && window.app.game.running', null, { timeout: 120000 }).catch(() => console.log('A raid not started'));
await B.waitForFunction('window.app.game && window.app.game.running', null, { timeout: 120000 }).catch(() => console.log('B raid not started'));
await wait(3000);
// B moves right for a second
await B.bringToFront(); await B.keyboard.down('KeyD'); await wait(1500); await B.keyboard.up('KeyD');
await wait(1000);
const sA = await A.evaluate(() => { const g = window.app.game; return [...g.ents.values()].filter(e => e.type === 'raider' && !e.bot).map(e => `${e.name}@${e.x.toFixed(1)},${e.z.toFixed(1)} ${e.st}`); });
const sB = await B.evaluate(() => { const g = window.app.game; return { me: g.me && `${g.me.x.toFixed(1)},${g.me.z.toFixed(1)}`, ents: g.ents.size, raiders: [...g.ents.values()].filter(e => e.type === 'raider' && !e.bot).map(e => `${e.name}@${e.x.toFixed(1)},${e.z.toFixed(1)}`), ark: [...g.ents.values()].filter(e => e.type === 'ark').length, tl: g.timeLeft }; });
console.log('A sees', JSON.stringify(sA)); console.log('B sees', JSON.stringify(sB));
await A.screenshot({ path: out + '_raidA.png' }); await B.screenshot({ path: out + '_raidB.png' });
for (const [k, v] of errs) console.log(v + 'x', k);
await b.close();
