// Loot reveal + Hatchet Job test (sandbox).
// 1) A container's items can't be taken (TAKE ALL or one by one) before the search has revealed them, closing
//    and reopening it mid-search doesn't reveal the rest, and TAKE ALL works once everything is found.
// 2) With the gun dry and no reserve ammo the Hatchet Job comes out (HUD + held model), the fire button swings
//    it and it hurts an ARK; picking up ammo puts it away again.
//   node tools/lootaxetest.mjs [base url]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8123/index.html'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; p.on('pageerror', e => errs.push(e.message));
await p.goto(`${base}?raid=test_range&time=noon&weather=clear`);
await p.waitForFunction('window.app && window.app.game && window.app.game.running', null, { timeout: 240000 });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let fail = 0;
const ok = (c, m, d = '') => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m} ${d}`); if (!c) fail++; };
await p.evaluate(() => { const g = window.app.game; for (const e of [...g.sim.entities.values()]) if (e.type === 'ark' || (e.type === 'raider' && e.bot)) g.sim.entities.delete(e.id); g.me.grace = 1e9; });

// ---- 1) loot reveal
const open = () => p.evaluate(async () => {
  const g = window.app.game, sim = g.sim, me = g.me;
  let c = sim.containers.find(c => c.kind === 'crate' && !c.dynamic) || sim.containers[0];
  const i = sim.containers.indexOf(c);
  c.contents = ['metal_parts', 'rope', 'battery', 'wires', 'duct_tape'].map(id => ({ id, qty: 1, uid: 'u' + Math.random().toString(36).slice(2) }));
  c.opened = true; me.x = c.x + 1.2; me.z = c.z; me.y = c.y ?? me.y;
  await g.doInteract({ kind: 'container', ref: i, x: c.x, z: c.z, label: 'SEARCH CRATE' });
  return { n: g.ui.lootItems?.length, revealN: g.ui.revealN };
});
let r = await open();
ok(r.n === 5 && r.revealN === 0, 'container opens with its items still hidden', JSON.stringify(r));
const btn = () => p.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => /TAKE ALL|SEARCHING/.test(x.textContent)); return b ? { text: b.textContent, disabled: b.disabled } : null; });
let bt = await btn();
ok(bt && bt.disabled && /SEARCHING/.test(bt.text), 'TAKE ALL is disabled while searching', JSON.stringify(bt));
r = await p.evaluate(async () => { const ui = window.app.game.ui, before = ui.lootItems.length; await ui.takeAll(); await ui.take(4); return { before, after: ui.lootItems.length }; });
ok(r.after === r.before, 'TAKE ALL and taking a hidden item do nothing mid-search', JSON.stringify(r));
// close mid-search, reopen: still searching
await wait(500);
await p.evaluate(() => window.app.game.ui.closeInv?.());
r = await p.evaluate(async () => { const g = window.app.game, sim = g.sim, c = sim.containers.find(c => c.contents?.length === 5), i = sim.containers.indexOf(c); await g.doInteract({ kind: 'container', ref: i, x: c.x, z: c.z, label: 'SEARCH CRATE' }); return { n: g.ui.lootItems.length, revealN: g.ui.revealN }; });
ok(r.revealN < r.n, 'reopening mid-search keeps the rest hidden', JSON.stringify(r));
// after the search: take all works
await p.waitForFunction(() => { const ui = window.app.game.ui; return ui.revealN >= ui.lootItems.length; }, null, { timeout: 30000 });
bt = await btn();
ok(bt && !bt.disabled && /TAKE ALL/.test(bt.text), 'TAKE ALL enabled once everything is found', JSON.stringify(bt));
r = await p.evaluate(async () => { const ui = window.app.game.ui; await ui.takeAll(); return ui.lootItems.length; });
ok(r === 0, 'TAKE ALL takes everything after the search', `left ${r}`);
await p.evaluate(() => window.app.game.ui.closeInv?.());

// ---- 2) Hatchet Job
r = await p.evaluate(async () => {
  const g = window.app.game, pc = g.pc, lo = pc.lo, me = g.me, w = pc.weapon, ws = pc.wstats;
  const strip = (arr) => arr.forEach((s, i) => { if (s && s.id === ws.ammo) arr[i] = null; });
  strip(lo.backpack); strip(lo.safe); strip(lo.quick); w.ammo = 0; pc.reloadT = 0;
  await new Promise(r => setTimeout(r, 1200));
  return { axe: pc.axeShown, wid: me.wid };
});
ok(r.axe && r.wid === 'axe', 'dry gun with no reserve ammo: the Hatchet Job comes out', JSON.stringify(r));
r = await p.evaluate(async () => {
  const g = window.app.game, sim = g.sim, me = g.me;
  const e = sim.spawnArk('tikk', me.x + 1.4, me.z, { baseY: me.y }); e.dormant = false; e.hp = e.maxHp = 500; if (e.brain) e.brain.update = () => {};
  await new Promise(r => setTimeout(r, 800));            // let the sim register it for hit checks
  e.x = me.x + 1.4; e.z = me.z; e.y = me.y;   // on the raider's level (the crate may be underground)
  const pc = g.pc; pc.aim.x = e.x; pc.aim.z = e.z; pc.aim.a = Math.atan2(e.x - me.x, e.z - me.z); me.f = pc.aim.a;
  pc.meleeCD = 0; pc.swingAxe();
  return { hp: e.hp, maxHp: e.maxHp };
});
ok(r.hp < r.maxHp, 'a swing hurts an ARK', JSON.stringify(r));
// the HUD shows the axe
await p.screenshot({ path: '/tmp/claude-0/-home-user-DarkRaiders/7d294f7d-0042-5d5a-ad09-97e3524f04d0/scratchpad/axe_hud.png' });
r = await p.evaluate(async () => {
  const g = window.app.game, pc = g.pc, ws = pc.wstats;
  pc.lo.backpack[pc.lo.backpack.findIndex(s => !s)] = { id: ws.ammo, qty: 30, uid: 'ammo-test' };
  await new Promise(r => setTimeout(r, 1200));
  return { axe: pc.axeShown, wid: g.me.wid };
});
ok(!r.axe && r.wid !== 'axe', 'picking up ammo puts the axe away', JSON.stringify(r));
if (errs.length) { console.log('page errors:', errs); fail++; }
console.log(fail ? 'FAIL' : 'PASS');
await b.close();
process.exit(fail ? 1 : 0);
