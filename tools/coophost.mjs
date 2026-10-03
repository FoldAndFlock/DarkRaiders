// Co-op: the host is out of the raid first, or gone. Two pages over the local BroadcastChannel transport.
//  1) the host extracts and spectates: the camera and the floor cutaway follow the guest (down into a tunnel);
//     then the host's tab is hidden (animation frames stop) and the guest still shoots ARK, opens and loots a
//     container, works a door and extracts - the raid ends for both once everyone is out
//  2) the host's tab is hidden for a while (no false "host lost"), then closes mid-raid: the guest carries on
//     in solo with the same spot, health, loadout, clock, nearby machines, a nearby loot bag and the rest of
//     a container it was looting, and can still move, loot and extract with its haul
//   node tools/coophost.mjs [base url]
// (over real PeerJS: base 'http://localhost:8123/index.html?dev&peerhost=127.0.0.1&peerport=9000&peerpath=/myapp&peersecure=0'
//  with the signalling server from tools/peercoop.mjs running)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8123/index.html?dev&net=local'] = process.argv;
const shots = process.env.SHOTS || null;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required', '--disable-features=WebRtcHideLocalIpsWithMdns'] });
const errs = [];
const wait = (ms) => new Promise(r => setTimeout(r, ms));
let fail = 0;
const ok = (c, m, d = '') => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m} ${d}`); if (!c) fail++; };
const until = async (P, f, ms = 30000, arg) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await P.evaluate(f, arg).catch(() => false)) return true; await wait(200); } return false; };
// game seconds on a page (headless frames are slow, so real time says little)
const gtime = (P, s) => P.evaluate((s) => new Promise(r => { const g = window.app.game, t0 = g.time; const k = () => g.time - t0 > s ? r() : setTimeout(k, 100); k(); }), s);
// the host's tab "goes to the background": hidden, and the browser stops animation frames
const hide = (P) => P.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); window.__raf = window.requestAnimationFrame; window.requestAnimationFrame = () => 0; });
const show = (P) => P.evaluate(() => { delete document.hidden; window.requestAnimationFrame = window.__raf; requestAnimationFrame((t) => window.app.game.frame(t)); });
const simT = (P) => P.evaluate(() => window.app.game.sim.t);

async function squad() {
  const ctx = await b.newContext({ viewport: { width: 800, height: 450 } });
  const A = await ctx.newPage(), B = await ctx.newPage();
  for (const [n, p] of [['A', A], ['B', B]]) p.on('pageerror', e => errs.push(n + ' ' + e.message + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')));
  await A.goto(base); await B.goto(base);
  await A.waitForFunction('window.__ready'); await B.waitForFunction('window.__ready');
  await A.evaluate(() => { window.app.profile.name = 'HOSTY'; window.app.screens.lobby(); });
  await B.evaluate(() => { window.app.profile.name = 'BUDDY'; window.app.screens.lobby(); });
  await A.evaluate(() => [...document.querySelectorAll('button')].find(b => b.textContent.includes('HOST A SQUAD')).click());
  await A.waitForFunction(() => !!window.app.screens.net?.code);
  const code = await A.evaluate(() => window.app.screens.net.code);
  await B.evaluate((c) => { const i = document.querySelector('input'); i.value = c; i.dispatchEvent(new Event('input')); [...document.querySelectorAll('button')].find(b => b.textContent === 'JOIN').click(); }, code);
  await A.waitForFunction(() => window.app.screens.net.members.length === 2, null, { timeout: 20000 });
  await A.evaluate(() => { window.app.screens.lobbyMap = 'test_range'; window.app.screens.net.setMap('test_range'); [...document.querySelectorAll('button')].find(b => b.textContent.includes('START')).click(); });
  await A.waitForFunction('window.app.game && window.app.game.running', null, { timeout: 180000 });
  await B.waitForFunction('window.app.game && window.app.game.running && !!window.app.game.me', null, { timeout: 180000 });
  await gtime(A, 0.3);
  // no bots / ARK in the way; nobody dies by accident
  await A.evaluate(() => { const g = window.app.game, sim = g.sim; for (const e of [...sim.entities.values()]) if (e.type === 'ark' || (e.type === 'raider' && e.bot)) sim.remove(e); for (const e of sim.entities.values()) if (e.type === 'raider') e.grace = 1e9; });
  await gtime(A, 0.2);
  return { ctx, A, B };
}
const nearestContainer = (P) => P.evaluate(() => {
  const g = window.app.game, me = g.me; let best = -1, bd = 1e9;
  g.containersData.forEach((c, i) => { const d = Math.hypot(c.x - me.x, c.z - me.z); if (c && !c.opened && !c.locked && Math.abs((c.y ?? me.y) - me.y) < 2 && d < bd) { bd = d; best = i; } });
  return best;
});
const buddy = "[...window.app.game.sim.entities.values()].find(e => e.type === 'raider' && e.name === 'BUDDY')";

// ---------------------------------------------------------------- 1) host extracts first
{
  const { ctx, A, B } = await squad();
  await A.evaluate(() => { const g = window.app.game; g.sim.extractRaider(g.me, null); });
  ok(await until(A, () => window.app.game.localDone === 'extracted', 20000), 'host extracted');
  await gtime(A, 0.3);
  let r = await A.evaluate(() => { const g = window.app.game; return { spectate: g.spectate, running: g.running, endIn: g.endIn ?? null }; });
  ok(r.spectate && r.running && r.endIn == null, 'host stays in, spectating the guest', JSON.stringify(r));
  // spectator: camera + floor cutaway follow the guest down to the metro platform under the test tunnel
  await B.evaluate(() => { const g = window.app.game, me = g.me; me.x = 216.25; me.z = 36.5; me.y = g.world.grid.floorAt(216.25, 36.5, 1.6); g.pc.vy = 0; g.session.state({ x: me.x, y: me.y, z: me.z }); });
  await gtime(B, 0.4); await gtime(A, 0.6);
  r = await A.evaluate(() => { const g = window.app.game, s = g.ents.get(g.spectate); return { cam: [+g.camX.toFixed(1), +g.camZ.toFixed(1)], guest: s && [+s.x.toFixed(1), +s.y.toFixed(1), +s.z.toFixed(1)], inside: g.world.inside, where: g.whereText(g.me) }; });
  const rb = await B.evaluate(() => { const g = window.app.game; return { inside: g.world.inside, cam: [+g.camX.toFixed(1), +g.camZ.toFixed(1)] }; });
  ok(r.guest && Math.abs(r.cam[0] - rb.cam[0]) < 3 && Math.abs(r.cam[1] - rb.cam[1]) < 3, "spectator camera frames the guest (height included)", JSON.stringify({ host: r.cam, guest: rb.cam }));
  ok(rb.inside >= 0 && r.inside === rb.inside, "spectator's floor cutaway follows the guest underground", JSON.stringify({ host: r.inside, guest: rb.inside }));
  ok(/SPECTATING BUDDY/.test(r.where || ''), 'HUD says who is being spectated', r.where);
  if (shots) { await A.screenshot({ path: shots + '_spectA.png' }); await B.screenshot({ path: shots + '_spectB.png' }); }
  await B.evaluate(() => { const g = window.app.game, me = g.me; const sp = g.world.spawns[0]; me.x = sp.x; me.z = sp.z; me.y = g.world.grid.floorAt(sp.x, sp.z, 1e9); g.session.state({ x: me.x, y: me.y, z: me.z }); });
  await gtime(B, 0.3);
  // the host tabs away: no more animation frames there
  await hide(A);
  const t0 = await simT(A); await wait(3000); const t1 = await simT(A);
  ok(t1 - t0 > 1.5, "the hidden host's raid keeps running", `${t0.toFixed(2)} -> ${t1.toFixed(2)} in 3 s`);
  // guest shoots an ARK
  await A.evaluate((bq) => { const g = window.app.game, sim = g.sim, bud = eval(bq);
    const e = sim.spawnArk('tikk', bud.x + 4, bud.z, { baseY: bud.y }); e.dormant = false; e.hp = e.maxHp = 2000; if (e.brain) e.brain.update = () => {}; window.__t = e.id; }, buddy);
  ok(await until(B, () => [...window.app.game.ents.values()].some(e => e.type === 'ark'), 15000), 'guest sees the ARK the hidden host spawned');
  await B.evaluate(async () => {
    const g = window.app.game, pc = g.pc, me = g.me, t = [...g.ents.values()].find(e => e.type === 'ark');
    for (let i = 0; i < 4; i++) {
      pc.aim.x = t.x; pc.aim.z = t.z; pc.aim.y = (t.y || 0) + 0.6; pc.aim.a = Math.atan2(t.x - me.x, t.z - me.z); me.f = pc.aim.a;
      pc.weapon.ammo = Math.max(pc.weapon.ammo || 0, 5); pc.reloadT = 0; pc.shoot(pc.wstats, pc.weapon, 1);
      await new Promise(r => setTimeout(r, 150));
    }
  });
  ok(await until(A, () => (window.app.game.sim.entities.get(window.__t)?.hp ?? 2000) < 2000, 10000), "guest's shots hurt ARK after the host extracted");
  ok(await until(B, () => (window.app.game.ents.get([...window.app.game.ents.values()].find(e => e.type === 'ark')?.id)?.hpf ?? 1) < 1, 10000), 'and the guest sees the damage');
  // guest opens a container and takes something
  const ci = await nearestContainer(B);
  r = await B.evaluate(async (i) => { const g = window.app.game, items = await g.session.open('container', i); if (!items) return { items: null }; const s = items.length ? await g.session.take('container', i, items[0].uid) : 'empty'; return { items: items.length, took: s?.id || s }; }, ci);
  ok(r.items != null && r.took, 'guest can still open and loot a container', JSON.stringify(r));
  ok(await until(B, (i) => window.app.game.containersData[i].opened, 10000, ci), 'and it shows opened');
  // guest works a door
  r = await B.evaluate(() => { const g = window.app.game, me = g.me; let best = -1, bd = 1e9; g.doorsData.forEach((d, i) => { const dd = Math.hypot(d.x - me.x, d.z - me.z); if (!d.locked && dd < bd) { bd = dd; best = i; } }); const was = g.doorsData[best].open; g.session.door(best, false); return { i: best, was }; });
  ok(await until(B, (r) => window.app.game.doorsData[r.i].open !== r.was, 10000, r), 'guest can still open / close doors');
  // guest calls an extraction (at the call point) and it counts down on the hidden host
  r = await B.evaluate(() => { const g = window.app.game, x = g.extractsData.find(e => e.kind === 'elevator' && e.state === 'idle') || g.extractsData.find(e => e.state === 'idle' && e.kind !== 'hatch'), me = g.me; me.x = x.pts.call[0]; me.z = x.pts.call[1]; me.y = x.y; g.session.state({ x: me.x, y: me.y, z: me.z }); return x.i; });
  await wait(600);
  await B.evaluate((i) => window.app.game.session.callExtract(i), r);
  ok(await until(B, (i) => window.app.game.extractsData[i].state === 'called', 10000, r), 'guest can still call an extraction');
  const xt0 = await A.evaluate((i) => window.app.game.sim.extracts[i].t, r); await wait(2000); const xt1 = await A.evaluate((i) => window.app.game.sim.extracts[i].t, r);
  ok(xt1 < xt0 - 1, 'and its countdown runs on the hidden host', `${xt0.toFixed(1)} -> ${xt1.toFixed(1)}`);
  // guest extracts -> both end
  await A.evaluate((bq) => { const g = window.app.game; g.sim.extractRaider(eval(bq), null); }, buddy);
  ok(await until(B, () => window.app.game.localDone === 'extracted', 15000), 'guest extracts after the host');
  const ends = await Promise.all([A, B].map(P => until(P, () => !window.app.game || window.app.game.ended, 120000)));
  ok(ends[0] && ends[1], 'raid ends for both once everyone is out', JSON.stringify(ends));
  await ctx.close();
}

// ---------------------------------------------------------------- 2) host hidden, then gone
{
  const { ctx, A, B } = await squad();
  // the guest picks up a known item, gets hurt, opens a crate and takes one thing; a bag lies next to it; an ARK
  // with a broken part is in view
  const before = await B.evaluate(() => {
    const g = window.app.game, me = g.me, lo = g.pc.lo, i = lo.backpack.findIndex(s => !s);
    lo.backpack[i] = { id: 'rope', qty: 3, uid: 'rope-test' };
    return { x: +me.x.toFixed(1), z: +me.z.toFixed(1), id: me.id };
  });
  await A.evaluate((bq) => { const g = window.app.game, sim = g.sim, bud = eval(bq);
    bud.grace = 0; sim.damage(bud, 30, null, {}); bud.grace = 1e9;
    sim.dropLoot(bud.x + 1.5, bud.z, [{ id: 'battery', qty: 2, uid: 'bag-battery' }, { id: 'wires', qty: 1, uid: 'bag-wires' }], 'bag', 'Test Bag', bud.y);
    const k = sim.spawnArk('tikk', bud.x + 9, bud.z + 3, { baseY: bud.y }); k.hp = k.maxHp * 0.5; if (k.brain) k.brain.update = () => {}; window.__k = k.id;
  }, buddy);
  const ci = await nearestContainer(B);
  const crate = await B.evaluate(async (i) => { const g = window.app.game, items = await g.session.open('container', i); const s = items.length ? await g.session.take('container', i, items[0].uid) : null; return { i, n: items.length, took: s?.id || null }; }, ci);
  await hide(A);     // the host tabs away for a while: nothing should break
  await wait(12000);
  let r = await B.evaluate(() => ({ client: !window.app.game.isHost, cache: window.app.screens.net?.cache?.l?.length || 0 }));
  ok(r.client, 'a hidden host is not mistaken for a lost one', JSON.stringify(r));
  ok(await until(B, () => (window.app.screens.net?.cache?.l || []).some(l => l[5] === 'Test Bag'), 15000), 'the host reports the loot around the guest');
  const hpB = await B.evaluate(() => window.app.game.me.hp);
  const tl0 = await B.evaluate(() => window.app.game.timeLeft);
  const arkB = await B.evaluate(() => { const k = [...window.app.game.ents.values()].find(e => e.type === 'ark'); return k && { id: k.id, hpf: k.hpf }; });
  // the host's tab goes away (crash / closed): no goodbye, just silence
  await A.close();
  ok(await until(B, () => window.app.game?.isHost === true && !!window.app.game.sim, 40000), 'guest takes over when the host goes silent');
  r = await B.evaluate(() => {
    const g = window.app.game, me = g.me;
    return { solo: g.isHost && !!g.sim && !g.net, running: g.running, ended: g.ended, me: me && { x: +me.x.toFixed(1), z: +me.z.toFixed(1), hp: me.hp, st: me.st }, rope: g.pc.lo.backpack.some(s => s?.id === 'rope'), tl: g.timeLeft, inSim: !!me && g.sim.entities.get(g.meId) === me, banner: g.bannerS?.text };
  });
  ok(r.solo && r.running && !r.ended, 'guest carries on in a solo raid', JSON.stringify(r));
  ok(/HOST LOST/.test(r.banner || ''), 'and is told why', r.banner);
  ok(r.me && Math.hypot(r.me.x - before.x, r.me.z - before.z) < 3 && r.me.st === 'alive', 'same spot, still alive', JSON.stringify({ before, now: r.me }));
  ok(r.me && Math.abs(r.me.hp - hpB) < 2, 'health kept', `${hpB} -> ${r.me?.hp}`);
  ok(r.rope, 'loadout kept');
  ok(r.tl != null && Math.abs(r.tl - tl0) < 30, 'raid clock kept', `${tl0} -> ${r.tl}`);
  ok(r.inSim, 'the raider lives in the new simulation');
  r = await B.evaluate((a) => { const g = window.app.game, k = a && g.sim.entities.get(a.id), bag = [...g.sim.entities.values()].find(e => e.type === 'loot' && e.label === 'Test Bag'); return { ark: k ? { kind: k.kind, hpf: +(k.hp / k.maxHp).toFixed(2) } : null, bag: bag ? bag.items.map(s => s.id + 'x' + s.qty) : null }; }, arkB);
  ok(r.ark && Math.abs(r.ark.hpf - (arkB?.hpf ?? 0)) < 0.05, 'the ARK in view is still there, as hurt as it was', JSON.stringify({ was: arkB, now: r.ark }));
  ok(r.bag && r.bag.length === 2, 'the loot bag next to the guest is still there, with its items', JSON.stringify(r.bag));
  r = await B.evaluate((c) => { const k = window.app.game.sim.containers[c.i]; return { opened: k.opened, n: k.contents?.length, took: c.took, hasTaken: (k.contents || []).some(s => s.id === c.took && s.uid) }; }, crate);
  ok(r.opened && r.n === crate.n - 1, 'the crate it was looting keeps the rest of its items', JSON.stringify({ ...r, before: crate.n }));
  // the solo raid works: walk, loot, extract
  const x0 = await B.evaluate(() => window.app.game.me.x);
  await B.bringToFront(); await B.keyboard.down('KeyD'); await gtime(B, 0.6); await B.keyboard.up('KeyD');
  const x1 = await B.evaluate(() => window.app.game.me.x);
  ok(x1 - x0 > 0.5, 'can still move', `${x0.toFixed(1)} -> ${x1.toFixed(1)}`);
  r = await B.evaluate(async () => { const g = window.app.game, bag = [...g.sim.entities.values()].find(e => e.type === 'loot' && e.label === 'Test Bag'); const items = await g.session.open('loot', bag.id); const s = await g.session.take('loot', bag.id, items[0].uid); return s?.id; });
  ok(r === 'battery', 'can loot in solo', String(r));
  await B.evaluate(() => { const g = window.app.game; g.sim.extractRaider(g.me, null); });
  const ended = await until(B, () => window.app.game.ended, 120000);
  const res = await B.evaluate(() => ({ outcome: window.app.game.result?.outcome, rope: !!window.app.game.result?.loadout?.backpack?.some(s => s?.id === 'rope') }));
  ok(ended && res.outcome === 'extracted' && res.rope, 'extracting in solo keeps the haul', JSON.stringify(res));
  await ctx.close();
}
if (errs.length) { console.log('page errors:', errs.slice(0, 6)); fail++; }
console.log(fail ? 'FAIL' : 'PASS');
await b.close();
process.exit(fail ? 1 : 0);
