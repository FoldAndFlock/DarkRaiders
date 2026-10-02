// Screenshot every main screen at a given UI scale / viewport (title, hub tabs, lobby, loading, raid HUD,
// loot + inventory, map, pause, results) and report elements that spill off-screen.
//   node tools/uiscale.mjs <base url> <out dir> [name:WxH:scale[:mobile][:dpr=N] ...]
// e.g. node tools/uiscale.mjs "http://localhost:8241/index.html?dev" /tmp/ui 720p100:1280x720:1 phone:844x390:auto:mobile:dpr=3
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'fs';
const [,, base = 'http://localhost:8241/index.html?dev', out = '/tmp/uiscale', ...cfgArgs] = process.argv;
mkdirSync(out, { recursive: true });
const cfgs = (cfgArgs.length ? cfgArgs : ['720p100:1280x720:1', '720pmax:1280x720:3', 'phone:844x390:auto:mobile:dpr=3', '1080p:1920x1080:auto', '1440p:2560x1440:auto']).map(a => {
  const [name, wh, scale, ...rest] = a.split(':'); const [w, h] = wh.split('x').map(Number);
  const dpr = +(rest.find(r => r.startsWith('dpr='))?.slice(4) || 1);
  return { name, w, h, scale, mobile: rest.includes('mobile'), dpr, only: rest.find(r => r.startsWith('only='))?.slice(5)?.split(',') };
});
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let problems = 0;
for (const c of cfgs) {
  const ctx = await b.newContext({ viewport: { width: c.w, height: c.h }, deviceScaleFactor: c.dpr, hasTouch: c.mobile, isMobile: c.mobile });
  await ctx.addInitScript(([s]) => { try { localStorage.setItem('dr_ui', s); } catch (e) { /* */ } }, [c.scale]);
  const p = await ctx.newPage();
  const errs = new Map();
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text().slice(0, 240); errs.set(t, (errs.get(t) || 0) + 1); } });
  p.on('pageerror', e => { const t = '[pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); errs.set(t, (errs.get(t) || 0) + 1); });
  p.on('dialog', d => d.accept('Tester'));
  const want = (k) => !c.only || c.only.includes(k);
  const shot = async (k) => { await p.screenshot({ path: `${out}/${c.name}_${k}.png` }); };
  // elements whose box leaves the viewport (and are not inside a scroll container that clips them)
  const spill = (k) => p.evaluate((k) => {
    const W = innerWidth, H = innerHeight, bad = [];
    const clipped = (n) => { for (let a = n.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (/(auto|scroll|hidden)/.test(cs.overflowY + cs.overflowX) && a.id !== 'ui') { const r = a.getBoundingClientRect(); if (r.right <= W + 1 && r.bottom <= H + 1 && r.left >= -1 && r.top >= -1) return true; } } return false; };
    for (const n of document.querySelectorAll('#ui *, .touch *')) {
      if (!n.offsetParent && getComputedStyle(n).position !== 'fixed') continue;
      const r = n.getBoundingClientRect(); if (!r.width || !r.height) continue;
      if (r.right > W + 1 || r.bottom > H + 1 || r.left < -1 || r.top < -1) { if (!clipped(n)) bad.push(`${n.tagName.toLowerCase()}.${String(n.className).split(' ')[0]} ${Math.round(r.left)},${Math.round(r.top)} ${Math.round(r.width)}x${Math.round(r.height)} "${(n.textContent || '').trim().slice(0, 24)}"`); }
    }
    return bad.slice(0, 6).map(x => k + ': ' + x);
  }, k);
  const check = async (k) => { const s = await spill(k); if (s.length) { problems += s.length; console.log('  SPILL', c.name, s.join('\n    ')); } };
  await p.goto(base);
  await p.waitForFunction('window.__ready', null, { timeout: 60000 });
  await wait(700);
  const px = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--px'));
  console.log(`${c.name} ${c.w}x${c.h} scale=${c.scale} dpr=${c.dpr} -> --px ${px}`);
  if (want('title')) { await shot('title'); await check('title'); }
  if (want('titleset')) { await p.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent === 'SETTINGS').click()); await wait(200); await shot('titleset'); await check('titleset'); }
  if (want('hub')) {
    await p.evaluate(() => { window.__ready = false; window.app.screens.hubScreen(); });
    await p.waitForFunction('window.__ready', null, { timeout: 60000 }); await wait(900);
    const hpx = await p.evaluate(() => getComputedStyle(document.querySelector('.hub')).getPropertyValue('--px') + ' ' + document.querySelector('.hub').className);
    console.log('  hub --px', hpx);
    for (const t of ['loadout', 'workshop', 'traders', 'skills', 'quests', 'raider']) {
      await p.evaluate((t) => window.app.screens.hub.go(t), t); await wait(350);
      await shot('hub_' + t); await check('hub_' + t);
    }
  }
  if (want('lobby') || want('raid')) {
    await p.evaluate(() => { window.app.screens.lobby(); window.app.screens.lobbyMap = 'test_range'; window.app.screens.fc = { test_range: { cond: null, time: 'noon', weather: 'clear' } }; window.app.screens.renderLobby(); });
    await wait(500); if (want('lobby')) { await shot('lobby'); await check('lobby'); }
  }
  if (want('raid')) {
    await p.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('DEPLOY SOLO')).click());
    await wait(350); await shot('loading');
    await p.waitForFunction('window.app.game && window.app.game.running', null, { timeout: 120000 });
    await wait(1800);
    await p.evaluate(() => { const g = window.app.game; g.bannerS = null; g.me.buffs.invuln = 9999; document.querySelectorAll('#ui .panel').forEach(n => { if (/FIRST DROP/.test(n.textContent)) n.remove(); }); g.feed('+1 Bandage', '#e8e0c8'); });
    await wait(400); await shot('raid'); await check('raid');
    // loot panel + inventory
    await p.evaluate(() => { const g = window.app.game, me = g.me, c = g.containersData.find(c => c.kind === 'weapon_case') || g.containersData[0]; me.x = c.x; me.z = c.z + 1.0; g.doInteract({ kind: 'container', ref: c.i, x: c.x, z: c.z, label: 'SEARCH Weapon Case' }); });
    await wait(2200); await shot('loot'); await check('loot');
    await p.evaluate(() => window.app.game.ui.closeInv()); await wait(200);
    await p.evaluate(() => window.app.game.ui.openInv()); await wait(300); await shot('inventory'); await check('inventory');
    await p.evaluate(() => { window.app.game.ui.closeInv(); window.app.game.ui.openMap(); }); await wait(500); await shot('map'); await check('map');
    await p.evaluate(() => { window.app.game.ui.closeMap(); window.app.game.ui.openPause(); }); await wait(300); await shot('pause'); await check('pause');
    await p.evaluate(() => { const g = window.app.game; g.ui.closePause(); g.finish('extracted'); g.end(); });
    await wait(1500); await shot('results'); await check('results');
  }
  for (const [k, v] of errs) { console.log('  ', v + 'x', k); problems++; }
  await ctx.close();
}
console.log(problems ? `${problems} problem(s)` : 'no spill / console problems');
await b.close();
