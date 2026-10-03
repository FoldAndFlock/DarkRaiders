// Squad text from other players is shown as text, never run as HTML: a joiner sends markup in its name, level
// and chat; a host sends a crafted lobby (member names / levels, chat sender) and a loot label. Nothing may
// run (window.__pwn stays unset) and the Content-Security-Policy must not get in the way of normal play.
//   node tools/xsstest.mjs [base url]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8123/index.html?dev&net=local'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await b.newContext({ viewport: { width: 960, height: 540 } });
const A = await ctx.newPage(), B = await ctx.newPage();
const errs = [];
for (const [n, p] of [['A', A], ['B', B]]) { p.on('pageerror', e => errs.push(n + ' ' + e.message)); p.on('console', m => { if (m.type() === 'error' || /Content Security Policy|Refused to/.test(m.text())) errs.push(n + ' ' + m.text().slice(0, 200)); }); }
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let fail = 0;
const ok = (c, m, d = '') => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m} ${d}`); if (!c) fail++; };
const PWN = '<img src=x onerror="window.__pwn=1">';
await A.goto(base); await B.goto(base);
await A.waitForFunction(() => window.__ready); await B.waitForFunction(() => window.__ready);
await A.evaluate(() => { window.app.profile.name = 'HOSTY'; window.app.screens.lobby(); });
await B.evaluate(() => { window.app.profile.name = 'BUDDY'; window.app.screens.lobby(); });
await A.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('HOST A SQUAD')).click());
await A.waitForFunction(() => !!window.app.screens.net?.code);
const code = await A.evaluate(() => window.app.screens.net.code);
await B.evaluate((c) => { const i = document.querySelector('input'); i.value = c; i.dispatchEvent(new Event('input')); [...document.querySelectorAll('button')].find(b => b.textContent === 'JOIN').click(); }, code);
await A.waitForFunction(() => window.app.screens.net.members.length === 2, null, { timeout: 20000 });
// a hostile joiner: markup in its hello (name, level, outfit) and in chat (text and sender)
await B.evaluate((pwn) => { const n = window.app.screens.net; n.t.send('host', { k: 'hello', v: 1, cid: n.cid, name: '<svg onload=a()>', level: pwn, outfit: pwn }); n.t.send('host', { k: 'chat', from: pwn, text: pwn }); }, PWN);
await wait(1500);
await A.evaluate(() => window.app.screens.renderLobby?.());
let r = await A.evaluate(() => { const m = window.app.screens.net.members.find(x => x.pid !== 'host'); return { pwn: window.__pwn ?? null, name: m.name, level: m.level, outfit: m.outfit, imgs: document.querySelectorAll('#ui img[src="x"], #ui svg[onload]').length }; });
ok(r.pwn == null && r.imgs === 0, 'a joiner\'s markup does not run on the host', JSON.stringify(r));
ok(r.level === 1 && r.outfit === 'scav', 'the host keeps a joiner\'s level / outfit to plain values', JSON.stringify(r));
// a hostile host: crafted lobby state and chat to the guest
await A.evaluate((pwn) => { const n = window.app.screens.net; n.t.broadcast({ k: 'lobby', s: { code: n.code, map: null, host: true, members: [{ pid: 'host', name: pwn, level: pwn, slot: pwn, ready: true }, { pid: 'x', name: pwn, level: 2, slot: 1 }] } }); n.t.broadcast({ k: 'chat', from: pwn, text: pwn, slot: pwn }); }, PWN);
await wait(1500);
await B.evaluate(() => window.app.screens.renderLobby?.());
r = await B.evaluate(() => ({ pwn: window.__pwn ?? null, imgs: document.querySelectorAll('#ui img[src="x"]').length, text: /onerror/.test(document.querySelector('#ui')?.textContent || '') }));
ok(r.pwn == null && r.imgs === 0 && r.text, 'a host\'s crafted lobby / chat shows as text on the guest', JSON.stringify(r));
// the loot window title (labels come from the host in co-op)
await A.evaluate(() => { window.app.screens.lobbyMap = 'test_range'; window.app.screens.net.setMap('test_range'); });
await wait(300);
await B.evaluate(() => { const n = window.app.screens.net; n.members = n.members.map(m => ({ ...m, name: 'BUDDY' })); });
await A.evaluate(() => { const n = window.app.screens.net; n.members.forEach(m => { m.ready = true; }); [...document.querySelectorAll('button')].find(b => b.textContent.includes('START'))?.click(); });
await B.waitForFunction(() => window.app.game && window.app.game.running && !!window.app.game.me, null, { timeout: 180000 });
r = await B.evaluate(async (pwn) => { const g = window.app.game; g.ui.openLoot({ kind: 'loot', ref: 1, x: g.me.x, z: g.me.z, label: 'LOOT ' + pwn }, [{ id: 'rope', qty: 1, uid: 'u1' }]); await new Promise(r => setTimeout(r, 300)); return { pwn: window.__pwn ?? null, imgs: document.querySelectorAll('#ui img[src="x"]').length }; }, PWN);
ok(r.pwn == null && r.imgs === 0, 'a loot label from the host shows as text', JSON.stringify(r));
const csp = errs.filter(e => /Content Security Policy|Refused to/.test(e));
ok(!csp.length, 'no Content-Security-Policy violations in normal play', JSON.stringify(csp.slice(0, 3)));
const other = errs.filter(e => !/Content Security Policy|Refused to/.test(e));
if (other.length) console.log('other console errors:', other.slice(0, 4));
console.log(fail ? 'FAIL' : 'PASS');
await b.close();
process.exit(fail ? 1 : 0);
