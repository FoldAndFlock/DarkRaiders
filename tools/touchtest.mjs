// Touch-controls test on an emulated phone (844x390 landscape, multi-touch via CDP): walk with the left
// stick (and sprint), aim + fire with the right stick while walking, swap / reload / roll / crouch /
// quick slot / throw, hold USE on a container, tap USE on a door, move items in the inventory by touch
// (tap-to-move and hold-and-drag), open + close bag / map / pause by touch, the portrait hint, and the
// full menu flow by touch (title -> new raider -> hub tabs -> lobby -> deploy).
//   node tools/touchtest.mjs [base url] [out dir]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { mkdirSync } from 'fs';
const [,, base = 'http://localhost:8241/index.html', out = '/tmp/touch'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let fails = 0;
const ok = (cond, msg, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + msg + (extra ? '  ' + extra : '')); if (!cond) fails++; };

async function phone(w = 844, h = 390) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  const p = await ctx.newPage();
  const errs = new Map();
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') { const t = m.text().slice(0, 240); errs.set(t, (errs.get(t) || 0) + 1); } });
  p.on('pageerror', e => { const t = '[pageerror] ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | '); errs.set(t, (errs.get(t) || 0) + 1); });
  p.on('dialog', d => d.accept('Thumbs'));
  const cdp = await ctx.newCDPSession(p);
  // multi-touch: pts = { id: [x, y] } currently down
  const pts = new Map();
  // explicit timestamps: headless frames are slow and each dispatch waits for one, so wall-clock gaps
  // between CDP calls are not what the page sees; the page uses event timestamps for tap vs hold
  let clock = Date.now() / 1000;
  const stamp = (dt = 0) => (clock = Math.max(clock + dt, Date.now() / 1000));
  const send = (type, dt = 0) => cdp.send('Input.dispatchTouchEvent', { type, timestamp: stamp(dt), touchPoints: [...pts].map(([id, [x, y]]) => ({ x, y, id, radiusX: 4, radiusY: 4, force: 1 })) });
  const T = {
    down: async (id, x, y) => { pts.set(id, [x, y]); await send('touchStart'); },
    move: async (id, x, y, steps = 4) => { const [x0, y0] = pts.get(id); for (let i = 1; i <= steps; i++) { pts.set(id, [x0 + (x - x0) * i / steps, y0 + (y - y0) * i / steps]); await send('touchMove'); await wait(16); } },
    up: async (id) => { pts.delete(id); await send('touchEnd'); },
    // a tap is short in event time even when the page is slow to process it
    tap: async (x, y, hold = 60) => { const id = 90 + Math.floor(Math.random() * 9); pts.set(id, [x, y]); await send('touchStart'); const t = clock; await wait(hold); pts.delete(id); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', timestamp: (clock = t + hold / 1000), touchPoints: [...pts].map(([i, [a, c]]) => ({ x: a, y: c, id: i })) }); await wait(80); },
    // centre of the first element matching sel (optionally containing text)
    at: (sel, text = null) => p.evaluate(([sel, text]) => { const n = [...document.querySelectorAll(sel)].find(n => (!text || n.textContent.trim().startsWith(text)) && n.getBoundingClientRect().width); if (!n) return null; const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, [sel, text]),
  };
  T.tapEl = async (sel, text = null, hold = 60) => { const c = await T.at(sel, text); if (!c) { console.log('  (no element', sel, text, ')'); return false; } await T.tap(c[0], c[1], hold); return true; };
  return { ctx, p, T, errs };
}
const G = (p, fn, arg) => p.evaluate(fn, arg);

// ------------------------------------------------------------------ in-raid controls
{
  const { ctx, p, T, errs } = await phone();
  await p.goto(base + '?raid=test_range');
  await p.waitForFunction('window.app && window.app.game && window.app.game.running', null, { timeout: 120000 });
  await wait(1500);
  const vis = await G(p, () => { const t = document.querySelector('.touch'); return !!t && !t.classList.contains('hidden'); });
  ok(vis, 'touch layer visible in raid');
  await G(p, () => { const g = window.app.game, me = g.me; me.buffs.invuln = 9999; g.bannerS = null; for (const e of g.ents.values()) if (e.type === 'ark') { e.hp = 0; e.st = 'dead'; } });
  await T.tap(300, 200);           // dismiss the intro card
  await wait(300);
  // walk with the left stick + sprint past the rim
  const s0 = await G(p, () => ({ x: window.app.game.me.x, z: window.app.game.me.z }));
  await T.down(1, 140, 290); await T.move(1, 200, 290); await wait(1200);
  const s1 = await G(p, () => ({ x: window.app.game.me.x, z: window.app.game.me.z, mode: window.app.input.mode, sprint: window.app.game.me.sprint }));
  ok(s1.x - s0.x > 1, 'left stick walks east', `dx=${(s1.x - s0.x).toFixed(2)} dz=${(s1.z - s0.z).toFixed(2)} mode=${s1.mode}`);
  ok(s1.mode === 'touch', 'input.mode is touch');
  await T.move(1, 140 + 62 * 1.45, 290); await wait(500);
  const sp = await G(p, () => ({ sprint: window.app.game.me.sprint, v: [...window.app.input.virtual.down] }));
  ok(sp.sprint, 'pushing past the rim sprints', JSON.stringify(sp.v));
  await T.move(1, 200, 290); await wait(100);
  // swap to the auto weapon, then aim + fire with the right stick while still walking
  await T.tapEl('.tb-swap'); await wait(500);
  const w0 = await G(p, () => { const pc = window.app.game.pc; return { slot: pc.slot, id: pc.weapon?.id, ammo: pc.weapon?.ammo }; });
  ok(w0.slot === 1, 'SWAP button switches weapon', JSON.stringify(w0));
  await p.screenshot({ path: out + '/touch_walk.png' });
  const aim = await T.at('.ts-aim');
  await T.down(2, aim[0], aim[1]); await T.move(2, aim[0] - 20, aim[1] - 6, 3); await wait(250);
  const a1 = await G(p, () => { const g = window.app.game; return { ammo: g.pc.weapon?.ammo, fire: window.app.input.virtual.fire, a: g.pc.aim.a }; });
  ok(!a1.fire && a1.ammo === w0.ammo, 'small deflection aims without firing', JSON.stringify(a1));
  await T.move(2, aim[0] - 55, aim[1] - 20, 3); await wait(900);
  await p.screenshot({ path: out + '/touch_fire.png' });
  const a2 = await G(p, () => { const g = window.app.game; return { ammo: g.pc.weapon?.ammo, aimA: g.pc.aim.a, x: g.me.x }; });
  ok(a2.ammo < w0.ammo, 'right stick past 60% fires (ammo decreases)', `${w0.ammo} -> ${a2.ammo}, facing ${a2.aimA.toFixed(2)}`);
  ok(Math.abs(a2.aimA - Math.atan2(-55, -20)) < 0.35, 'aim follows the stick direction (west-north-west)');
  ok(a2.x - s1.x > 1, 'still walking while aiming (multi-touch)', `x ${s1.x.toFixed(1)} -> ${a2.x.toFixed(1)}`);
  await T.up(2); await T.up(1); await wait(300);
  // FIRE button
  const f0 = await G(p, () => window.app.game.pc.weapon.ammo);
  const fb = await T.at('.tb-fire'); await T.tap(fb[0], fb[1], 400); await wait(100);
  const f1 = await G(p, () => window.app.game.pc.weapon.ammo);
  ok(f1 < f0, 'FIRE button fires', `${f0} -> ${f1}`);
  // reload, roll, crouch, ADS toggle
  await T.tapEl('.tb-reload'); await wait(80);
  ok(await G(p, () => window.app.game.pc.reloadT > 0), 'RELOAD button starts a reload');
  await wait(2500);
  await T.tapEl('.tb-dodge'); await wait(60);
  ok(await G(p, () => window.app.game.pc.dodgeT > 0 || window.app.game.pc.dodgeCD > 0), 'ROLL button dodges');
  await wait(800);
  await T.tapEl('.tb-crouch'); await wait(100);
  ok(await G(p, () => window.app.game.pc.crouch), 'CROUCH toggles crouch');
  await T.tapEl('.tb-crouch'); await wait(100);
  await T.tapEl('.tb-ads'); await wait(100);
  ok(await G(p, () => window.app.game.pc.ads && window.app.input.virtual.ads), 'AIM toggles ADS');
  await T.tapEl('.tb-ads'); await wait(100);
  // quick slot 1 (bandage) via the hit area over the HUD slot
  await G(p, () => { window.app.game.me.hp = 60; });
  const q = await G(p, () => { const n = document.querySelectorAll('.touch .tq')[0]; const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, n.classList.contains('hidden')]; });
  ok(!q[2], 'quick slot hit areas placed over the HUD slots');
  await T.tap(q[0], q[1]); await wait(150);
  const qu = await G(p, () => window.app.game.pc.useItem);
  ok(!!qu, 'tapping HUD quick slot 1 uses its item', String(qu));
  await wait(3500);
  // grenade / THROW
  await p.waitForFunction(() => !window.app.game.pc.useItem, null, { timeout: 20000 }).catch(() => {});
  const qn0 = await G(p, () => JSON.stringify(window.app.game.pc.lo.quick.map(s => s && s.qty)));
  await T.tapEl('.tb-grenade'); await wait(200);
  const qn1 = await G(p, () => JSON.stringify(window.app.game.pc.lo.quick.map(s => s && s.qty)));
  ok(qn0 !== qn1, 'THROW button throws the grenade from the quick slots', `${qn0} -> ${qn1}`);
  // container: hold USE until the search completes -> loot panel
  const cinfo = await G(p, () => { const g = window.app.game, me = g.me; const c = g.containersData.find(c => !c.opened && !c.locked && c.kind === 'weapon_case') || g.containersData.find(c => !c.opened && !c.locked) || g.containersData[0]; me.x = c.x; me.z = c.z + 1.1; me.y = g.world.grid.floorAt(me.x, me.z, (c.y ?? 0) + 1); g.camX = me.x; g.camZ = me.z; return { kind: c.kind, i: c.i }; });
  await wait(400);
  const it = await G(p, () => window.app.game.pc.interact && { kind: window.app.game.pc.interact.kind, t: window.app.game.pc.interact.time, label: window.app.game.pc.interact.label });
  ok(it?.kind === 'container', 'container prompt shown', JSON.stringify(it));
  ok(await G(p, () => document.querySelector('.tb-interact').classList.contains('hot')), 'USE button highlighted when a prompt is available');
  const ub = await T.at('.tb-interact');
  await T.down(3, ub[0], ub[1]); await wait(600);
  const prog = await G(p, () => getComputedStyle(document.querySelector('.tb-interact')).getPropertyValue('--p'));
  await p.screenshot({ path: out + '/touch_hold_use.png' });
  // (headless frames are slow and dt is clamped, so game time lags wall time: hold until it opens)
  await p.waitForFunction(() => !!window.app.game.ui.inv, null, { timeout: 20000 }).catch(() => {});
  await T.up(3); await wait(300);
  ok(await G(p, () => !!window.app.game.ui.inv), 'holding USE searched the container (loot panel open)', `hold progress seen ${prog}`);
  ok(await G(p, () => document.querySelector('.touch').classList.contains('hidden')), 'touch layer hidden while the inventory is open');
  await p.waitForFunction(() => (window.app.game.ui.revealN ?? 0) >= (window.app.game.ui.lootItems?.length ?? 0), null, { timeout: 20000 }).catch(() => {});
  await wait(300);
  await p.screenshot({ path: out + '/touch_loot.png' });
  // tap a loot item to take it
  const lootN0 = await G(p, () => window.app.game.ui.lootItems?.length || 0);
  const bp0 = await G(p, () => window.app.game.pc.lo.backpack.filter(Boolean).length);
  if (lootN0) {
    const lc = await G(p, () => { const c = [...document.querySelectorAll('.cell')].find(c => c._ref?.c === 'loot' && c._stack); const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await G(p, () => { window.__tlog = []; for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'click']) document.addEventListener(t, (e) => window.__tlog.push(t + ':' + (e.pointerType || '') + ':' + String(e.target.className).slice(0, 20) + ':' + Math.round(e.timeStamp)), true); });
    await T.tap(lc[0], lc[1]);
    await p.waitForFunction((n) => (window.app.game.ui.lootItems?.length ?? 0) < n, lootN0, { timeout: 8000 }).catch(() => {});
    const bp1 = await G(p, () => window.app.game.pc.lo.backpack.filter(Boolean).length);
    ok(bp1 > bp0 || (await G(p, () => window.app.game.ui.lootItems.length)) < lootN0, 'tap on a loot item takes it', `backpack ${bp0} -> ${bp1} ` + await G(p, () => JSON.stringify(window.__tlog)) + JSON.stringify(lc));
  } else console.log('  (container was empty)');
  // inventory: tap an item, then tap an empty backpack slot -> moved
  const cellAt = (pred) => G(p, (pred) => { const f = new Function('r', 's', 'return ' + pred); const c = [...document.querySelectorAll('#ui .cell')].find(c => c._ref && f(c._ref, c._stack)); if (!c) return null; const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, pred);
  const lo0 = await G(p, () => JSON.stringify(window.app.game.pc.lo.backpack.map(s => s && s.id)));
  const src = await cellAt("r.c === 'backpack' && s");
  const dst = await cellAt("r.c === 'backpack' && !s && r.i >= 9");
  await T.tap(src[0], src[1]); await wait(250);
  const selShown = await G(p, () => ({ sel: !!document.querySelector('#ui .cell.tsel'), acts: !!document.querySelector('.inv-acts'), tip: document.querySelector('.tooltip')?.style.display }));
  ok(selShown.sel && selShown.acts, 'tap selects an inventory item (highlight + actions + tooltip)', JSON.stringify(selShown));
  await p.screenshot({ path: out + '/touch_inv_select.png' });
  await T.tap(dst[0], dst[1]); await wait(300);
  const lo1 = await G(p, () => JSON.stringify(window.app.game.pc.lo.backpack.map(s => s && s.id)));
  ok(lo0 !== lo1, 'tap-to-move moves the item to the tapped slot', `${lo0} -> ${lo1}`);
  // hold-and-drag a backpack item onto the safe pocket
  const src2 = await cellAt("r.c === 'backpack' && s");
  const dst2 = await cellAt("r.c === 'safe' && !s") || await cellAt("r.c === 'backpack' && !s && r.i >= 12");
  const before2 = await G(p, () => JSON.stringify([window.app.game.pc.lo.backpack.map(s => s && s.id), window.app.game.pc.lo.safe.map(s => s && s.id)]));
  await T.down(4, src2[0], src2[1]); await wait(550);
  await T.move(4, (src2[0] + dst2[0]) / 2, (src2[1] + dst2[1]) / 2, 5);
  await p.screenshot({ path: out + '/touch_inv_drag.png' });
  await T.move(4, dst2[0], dst2[1], 5); await wait(100); await T.up(4); await wait(300);
  const after2 = await G(p, () => JSON.stringify([window.app.game.pc.lo.backpack.map(s => s && s.id), window.app.game.pc.lo.safe.map(s => s && s.id)]));
  ok(before2 !== after2, 'hold-and-drag moves an item by touch', `${before2} -> ${after2}`);
  // close the inventory with its X
  await T.tapEl('#ui .close-x'); await wait(300);
  ok(await G(p, () => !window.app.game.ui.inv), 'X closes the inventory');
  await p.waitForFunction(() => !document.querySelector('.touch').classList.contains('hidden'), null, { timeout: 8000 }).catch(() => {});
  ok(await G(p, () => !document.querySelector('.touch').classList.contains('hidden')), 'touch layer back after closing');
  // door: tap USE
  const dinfo = await G(p, () => { const g = window.app.game, me = g.me; const d = g.doorsData.find(d => !d.lockedNow); if (!d) return null; const pos = g.view.doorPos(d.i); me.x = pos.x ?? d.x; me.z = (pos.z ?? d.z) + 1.2; me.y = g.world.grid.floorAt(me.x, me.z, (d.y ?? me.y) + 1); g.camX = me.x; g.camZ = me.z; return { i: d.i, open: !!d.open }; });
  await wait(400);
  if (dinfo) {
    const dk = await G(p, () => window.app.game.pc.interact?.kind);
    if (dk !== 'door') await G(p, (i) => { const g = window.app.game, d = g.doorsData[i]; g.me.x = d.x; g.me.z = d.z + 0.9; }, dinfo.i), await wait(400);
    await T.tapEl('.tb-interact'); await wait(600);
    const dopen = await G(p, (i) => !!window.app.game.doorsData[i].open, dinfo.i);
    ok(dopen !== dinfo.open, 'tapping USE at a door opens it', `prompt=${await G(p, () => window.app.game.pc.interact?.label)}`);
  } else ok(false, 'no door on the map');
  // menus by touch: BAG / MAP / MENU and their close buttons
  await T.tapEl('.tt-inv'); await wait(300);
  ok(await G(p, () => !!window.app.game.ui.inv), 'BAG opens the inventory');
  await T.tapEl('#ui .close-x'); await wait(300);
  await p.waitForFunction(() => !document.querySelector('.touch').classList.contains('hidden'), null, { timeout: 8000 }).catch(() => {});
  await T.tapEl('.tt-map'); await wait(500);
  ok(await G(p, () => !!window.app.game.ui.mapEl), 'MAP opens the map');
  await p.screenshot({ path: out + '/touch_map.png' });
  await G(p, () => window.app.game.pings.clear());
  const mc = await T.at('#ui canvas'); await T.tap(mc[0] + 20, mc[1] + 10);
  await p.waitForFunction(() => window.app.game.pings.size > 0, null, { timeout: 8000 }).catch(() => {});
  ok(await G(p, () => window.app.game.pings.size > 0), 'tap on the map pings');
  await T.tapEl('#ui .close-x'); await wait(300);
  ok(await G(p, () => !window.app.game.ui.mapEl), 'X closes the map');
  await p.waitForFunction(() => !document.querySelector('.touch').classList.contains('hidden'), null, { timeout: 8000 }).catch(() => {});
  await T.tapEl('.tt-menu'); await wait(300);
  ok(await G(p, () => !!window.app.game.ui.pause), 'MENU opens the pause menu');
  await p.screenshot({ path: out + '/touch_pause.png' });
  await T.tapEl('#ui button', 'RESUME'); await wait(300);
  await p.waitForFunction(() => !document.querySelector('.touch').classList.contains('hidden'), null, { timeout: 8000 }).catch(() => {});
  ok(await G(p, () => !window.app.game.ui.pause && !window.app.game.paused), 'RESUME closes the pause menu');
  await G(p, () => window.app.game.pings.clear());
  await T.tapEl('.tt-ping');
  await p.waitForFunction(() => window.app.game.pings.size > 0, null, { timeout: 8000 }).catch(() => {});
  ok(await G(p, () => window.app.game.pings.size > 0), 'PING button pings');
  await wait(400);
  await p.screenshot({ path: out + '/touch_layout.png' });
  for (const [k, v] of errs) { console.log('  ', v + 'x', k); fails++; }
  await ctx.close();
}

// ------------------------------------------------------------------ portrait hint
{
  const { ctx, p, errs } = await phone(390, 844);
  await p.goto(base + '?dev');
  await p.waitForFunction('window.__ready', null, { timeout: 60000 }); await wait(500);
  ok(await G(p, () => !document.querySelector('.rotate-hint').classList.contains('hidden')), 'portrait shows the rotate hint');
  await p.screenshot({ path: out + '/portrait.png' });
  await p.setViewportSize({ width: 844, height: 390 }); await wait(300);
  ok(await G(p, () => document.querySelector('.rotate-hint').classList.contains('hidden')), 'landscape hides it');
  for (const [k, v] of errs) { console.log('  ', v + 'x', k); fails++; }
  await ctx.close();
}

// ------------------------------------------------------------------ full flow by touch
{
  const { ctx, p, T, errs } = await phone();
  await p.goto(base + '?dev');
  await p.waitForFunction('window.__ready', null, { timeout: 60000 }); await wait(600);
  await p.screenshot({ path: out + '/flow_title.png' });
  await G(p, () => { window.__ready = false; });
  await T.tapEl('button', 'NEW RAIDER');
  await p.waitForFunction('window.__ready', null, { timeout: 60000 }); await wait(900);
  ok(await G(p, () => window.app.profile.name === 'Thumbs' && !!document.querySelector('.hub')), 'NEW RAIDER by touch reaches the hub');
  for (const [k, l] of [['workshop', 'WORKSHOP'], ['traders', 'TRADERS'], ['skills', 'SKILLS'], ['quests', 'QUESTS'], ['raider', 'RAIDER'], ['loadout', 'LOADOUT']]) {
    const c = await G(p, (k) => { const n = document.querySelector(`.hh-tabs [data-tab="${k}"]`); const r = n.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, k);
    await T.tap(c[0], c[1]); await wait(350);
    ok(await G(p, () => window.app.screens.hub.tab) === k, `hub tab ${l} by touch`);
    await p.screenshot({ path: `${out}/flow_hub_${k}.png` });
  }
  // free loadout + inspect + hold-drag in the stash
  await T.tapEl('.hub button', 'FREE LOADOUT'); await wait(400);
  await p.screenshot({ path: out + '/flow_hub_modal.png' });
  await T.tapEl('.hub-modal button', 'CLAIM KIT'); await wait(400);
  ok(await G(p, () => !document.querySelector('.hub-modal') && window.app.profile.loadout.augment?.id), 'FREE LOADOUT modal by touch');
  const st = await G(p, () => { const c = [...document.querySelectorAll('.hub .cell')].find(c => c._ref?.c === 'stash' && c._stack); const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await T.tap(st[0], st[1]); await wait(300);
  ok(await G(p, () => !!window.app.screens.hub.st.loadout.sel), 'tap selects a stash item (inspector)');
  const before = await G(p, () => JSON.stringify(window.app.profile.loadout.backpack.map(s => s && s.id)));
  const st2 = await G(p, () => { const c = [...document.querySelectorAll('.hub .cell')].find(c => c._ref?.c === 'stash' && c._stack); const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  const bpe = await G(p, () => { const c = [...document.querySelectorAll('.hub .cell')].find(c => c._ref?.c === 'backpack' && !c._stack); const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await T.down(5, st2[0], st2[1]); await wait(550); await T.move(5, bpe[0], bpe[1], 8); await wait(80); await T.up(5); await wait(400);
  const after = await G(p, () => JSON.stringify(window.app.profile.loadout.backpack.map(s => s && s.id)));
  ok(before !== after, 'hub: hold-and-drag stash -> backpack by touch', `${before} -> ${after}`);
  // long-press without moving = actions menu
  const st3 = await G(p, () => { const c = [...document.querySelectorAll('.hub .cell')].find(c => c._ref?.c === 'stash' && c._stack); const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  await T.down(6, st3[0], st3[1]); await wait(600); await T.up(6); await wait(300);
  ok(await G(p, () => !!document.querySelector('.hub-menu')), 'hub: long-press opens the actions menu');
  await p.screenshot({ path: out + '/flow_hub_menu.png' });
  await T.tap(5, 380); await wait(200);
  // deploy -> lobby -> test range -> deploy solo
  await T.tapEl('.hh-deploy'); await wait(600);
  const modal = await G(p, () => !!document.querySelector('.hub-modal'));
  if (modal) { await T.tapEl('.hub-modal button', 'DEPLOY'); await wait(600); }
  ok(await G(p, () => !!document.querySelector('.lobby')), 'DEPLOY by touch opens the lobby');
  await G(p, () => { window.app.screens.fc = { test_range: { cond: null, time: 'noon', weather: 'clear' } }; });
  await T.tapEl('.lobby .panel.row', 'TEST RANGE'); await wait(400);
  ok(await G(p, () => window.app.screens.lobbyMap === 'test_range'), 'tap selects the map card');
  await p.screenshot({ path: out + '/flow_lobby.png' });
  await T.tapEl('.lobby button', 'DEPLOY SOLO');
  await p.waitForFunction('window.app.game && window.app.game.running', null, { timeout: 120000 }).catch(() => {});
  ok(await G(p, () => !!window.app.game?.running), 'DEPLOY SOLO by touch starts the raid');
  await wait(1500);
  await p.screenshot({ path: out + '/flow_raid.png' });
  for (const [k, v] of errs) { console.log('  ', v + 'x', k); fails++; }
  await ctx.close();
}
console.log(fails ? `${fails} failure(s)` : 'all touch checks passed');
await b.close();
process.exit(fails ? 1 : 0);
