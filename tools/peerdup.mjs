// Duplicate-join regression over REAL PeerJS / WebRTC: the joining raider taps JOIN twice in a row (and then
// repeats its hello); the host must list them once, and in the raid there must be exactly one raider for
// them - no second, mirrored copy. Needs the same local signalling server as tools/peercoop.mjs:
//   node -e "require('peer').PeerServer({ port: 9000, host: '127.0.0.1', path: '/myapp' })"
// and the game served on BASE (default http://localhost:8123):  node tools/peerdup.mjs
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const base = (process.env.BASE || 'http://localhost:8123') + '/index.html?dev&peerhost=127.0.0.1&peerport=9000&peerpath=/myapp&peersecure=0';
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
const A = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const B = await (await b.newContext({ viewport: { width: 960, height: 540 } })).newPage();
const errs = [];
for (const [n, p] of [['A', A], ['B', B]]) { p.on('pageerror', e => errs.push(n + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(n + ' ' + m.text().slice(0, 160)); }); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const until = async (p, f, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(f).catch(() => false)) return true; await wait(250); } return false; };
let fail = 0;
const ok = (c, m, d = '') => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m} ${d}`); if (!c) fail++; };
await A.goto(base); await B.goto(base);
await A.waitForFunction(() => window.__ready); await B.waitForFunction(() => window.__ready);
await A.evaluate(() => { window.app.profile.name = 'HOSTY'; window.app.screens.lobby(); });
await B.evaluate(() => { window.app.profile.name = 'BUDDY'; window.app.screens.lobby(); });
await A.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('HOST A SQUAD')).click());
await until(A, () => !!window.app.screens.net?.code);
const code = await A.evaluate(() => window.app.screens.net?.code);
// JOIN tapped twice in quick succession (the second tap lands while the first is still connecting)
await B.evaluate((c) => { const i = document.querySelector('input'); i.value = c; i.dispatchEvent(new Event('input')); const j = [...document.querySelectorAll('button')].find(b => b.textContent === 'JOIN'); j.click(); j.click(); setTimeout(() => j.click(), 150); }, code);
await until(B, () => (window.app.screens.net?.members || []).length >= 2, 25000);
await wait(4000);   // let any second connection finish too
const names = async (p) => p.evaluate(() => (window.app.screens.net?.members || []).map(m => m.name));
let hn = await names(A), cn = await names(B);
ok(hn.length === 2 && hn.filter(n => n === 'BUDDY').length === 1, 'host lists the joiner once after a double tap', JSON.stringify(hn));
ok(cn.length === 2, 'joiner sees two members', JSON.stringify(cn));
// a repeated hello on the same connection
await B.evaluate(() => { const n = window.app.screens.net; n.t.send('host', { k: 'hello', v: 1, cid: n.cid, ...n.me() }); });
await wait(2000);
hn = await names(A);
ok(hn.length === 2, 'a repeated hello does not add a member', JSON.stringify(hn));
// raid: exactly one BUDDY on the host, no extra copy of BUDDY on the client
await A.evaluate(() => { window.app.screens.lobbyMap = 'test_range'; window.app.screens.net.setMap('test_range'); [...document.querySelectorAll('button')].find(b => b.textContent.includes('START'))?.click(); });
const aRun = await until(A, () => window.app.game?.running, 180000), bRun = await until(B, () => window.app.game?.running && !!window.app.game.me, 120000);
ok(aRun && bRun, 'both in the raid');
if (bRun) {
  await wait(2500);
  await B.bringToFront(); await B.keyboard.down('KeyD'); await wait(2500); await B.keyboard.up('KeyD'); await wait(2000);
  const hostBuddies = await A.evaluate(() => [...window.app.game.sim.entities.values()].filter(e => e.type === 'raider' && !e.bot && e.st !== 'out').map(e => `${e.name}@${e.x.toFixed(1)},${e.z.toFixed(1)}`));
  ok(hostBuddies.filter(s => s.startsWith('BUDDY')).length === 1, 'host has exactly one raider for the joiner', JSON.stringify(hostBuddies));
  const clientView = await B.evaluate(() => { const g = window.app.game; return [...g.ents.values()].filter(e => e.type === 'raider' && !e.bot && e.id !== g.meId).map(e => `${e.name}@${(+e.x).toFixed(1)},${(+e.z).toFixed(1)}`); });
  ok(clientView.filter(s => s.startsWith('BUDDY')).length === 0, 'the joiner sees no copy of themselves', JSON.stringify(clientView));
  const me = await B.evaluate(() => { const g = window.app.game; return `${g.me.name}@${g.me.x.toFixed(1)},${g.me.z.toFixed(1)}`; });
  const hostSees = hostBuddies.find(s => s.startsWith('BUDDY'));
  ok(!!hostSees && Math.hypot(...hostSees.split('@')[1].split(',').map(Number).map((v, i) => v - +me.split('@')[1].split(',')[i])) < 3, "the host's BUDDY follows the joiner", `${me} vs ${hostSees}`);
}
if (errs.length) console.log('errors', errs.length, errs.slice(0, 4));
console.log(fail ? 'FAIL' : 'PASS');
await b.close();
process.exit(fail ? 1 : 0);
