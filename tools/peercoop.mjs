// Co-op over REAL PeerJS / WebRTC (not the BroadcastChannel shortcut cooptest uses): lobby names, chat and
// READY both ways, raid join, movement. Needs a local signalling server:
//   npm i peer   then   node -e "require('peer').PeerServer({ port: 9000, host: '127.0.0.1', path: '/myapp' })"
// and the game served on BASE (default http://localhost:8123):  node tools/peercoop.mjs
// Two browsers over REAL PeerJS / WebRTC (local signalling server): lobby names, chat both ways, ready, raid join
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const base = (process.env.BASE || 'http://localhost:8123') + '/index.html?dev&peerhost=127.0.0.1&peerport=9000&peerpath=/myapp&peersecure=0';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
const A = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const B = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = [];
for (const [n, p] of [['A', A], ['B', B]]) { p.on('pageerror', e => errs.push(n + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(n + ' ' + m.text().slice(0, 160)); }); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const until = async (p, f, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(f).catch(() => false)) return true; await wait(250); } return false; };
await A.goto(base); await B.goto(base);
await A.waitForFunction('window.__ready'); await B.waitForFunction('window.__ready');
await A.evaluate(() => { window.app.profile.name = 'HOSTY'; window.app.screens.lobby(); });
await B.evaluate(() => { window.app.profile.name = 'BUDDY'; window.app.screens.lobby(); });
await A.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('HOST A SQUAD')).click());
await until(A, () => !!window.app.screens.net?.code);
const code = await A.evaluate(() => window.app.screens.net?.code);
await B.evaluate((c) => { const i = document.querySelector('input'); i.value = c; [...document.querySelectorAll('button')].find(b => b.textContent === 'JOIN').click(); }, code);
const lobbyNames = await until(B, () => (window.app.screens.net?.members || []).length >= 2, 20000);
console.log('code', code, '| client sees names:', lobbyNames, JSON.stringify(await B.evaluate(() => (window.app.screens.net?.members || []).map(m => m.name))), '| host sees:', JSON.stringify(await A.evaluate(() => window.app.screens.net.members.map(m => m.name))));
await B.evaluate(() => { const i = [...document.querySelectorAll('input')].find(x => x.placeholder === 'SAY SOMETHING'); if (!i) return; i.value = 'hello from buddy'; i.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); });
console.log('client chat reaches host:', await until(A, () => (window.app.screens.lobbyChat || []).some(c => c.text === 'hello from buddy'), 8000));
await B.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('READY UP'))?.click());
console.log('client READY reaches host:', await until(A, () => window.app.screens.net.members.some(m => m.name === 'BUDDY' && m.ready), 8000));
await A.evaluate(() => { window.app.screens.lobbyMap = 'test_range'; window.app.screens.net.setMap('test_range'); [...document.querySelectorAll('button')].find(b => b.textContent.includes('START'))?.click(); });
const aRun = await until(A, () => window.app.game?.running, 180000), bRun = await until(B, () => window.app.game?.running && !!window.app.game.me, 120000);
console.log('host in raid:', aRun, '| client in raid:', bRun, '| client back in lobby with error:', await B.evaluate(() => window.app.screens.netError || null));
if (bRun) {
  await wait(2000);
  const b0 = await B.evaluate(() => [window.app.game.me.x, window.app.game.me.z]);
  await B.bringToFront(); await B.keyboard.down('KeyD'); await wait(2500); await B.keyboard.up('KeyD'); await wait(1500);
  console.log('client moved:', JSON.stringify(b0), '->', JSON.stringify(await B.evaluate(() => [+window.app.game.me.x.toFixed(1), +window.app.game.me.z.toFixed(1)])), '| host sees client at', await A.evaluate(() => { const e = [...window.app.game.sim.entities.values()].find(e => e.type === 'raider' && e.name === 'BUDDY'); return e ? `${e.x.toFixed(1)},${e.z.toFixed(1)}` : 'missing'; }));
}
console.log('errors', errs.length, errs.slice(0, 4));
await b.close();
