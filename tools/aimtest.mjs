// ARK aim-assist test: on the sandbox, park ARK (flyers and walkers) at several distances and bearings around
// the player and fire sloppy shots at them through the real sim (no spread): aimed beside the machine by
// 0-2 m, at the height a cursor that missed the machine would give (the ground). Compares raw shots with the
// player's ARK aim assist, and checks that the cursor picks a flyer from its body down to its shadow.
//   node tools/aimtest.mjs [base url]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8123/index.html'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = [];
p.on('pageerror', e => errs.push(e.message));
await p.goto(`${base}?raid=test_range&time=noon&weather=clear`);
await p.waitForFunction(() => window.app && window.app.game && window.app.game.running, null, { timeout: 240000 });
const setup = await p.evaluate(() => {
  const g = window.app.game, sim = g.sim, me = g.me;
  for (const e of [...sim.entities.values()]) if (e.type === 'ark' || (e.type === 'raider' && e.bot)) sim.entities.delete(e.id);
  me.grace = 1e9; me.hp = 1e9;
  const kinds = ['wazp', 'snytch', 'spottr', 'rocketier', 'tikk', 'leapr', 'bastian'];
  const placed = [];
  kinds.forEach((k, i) => {
    const ang = (i / kinds.length) * Math.PI * 2, d = 6 + (i % 3) * 5;
    const x = me.x + Math.sin(ang) * d, z = me.z + Math.cos(ang) * d;
    const e = sim.spawnArk(k, x, z, {}); if (!e) return;
    e.dormant = false; e.hp = e.maxHp = 1e9; if (e.brain) e.brain.update = () => {};
    placed.push({ id: e.id, kind: k, d });
  });
  return { placed, me: [me.x, me.z] };
});
await new Promise(r => setTimeout(r, 1500));              // let the view pick the new machines up
const res = await p.evaluate(() => {
  const g = window.app.game, sim = g.sim, me = g.me, pc = g.pc, R = g.R;
  g.running = false;
  const out = [], w = { dmg: 1, range: 40 };
  const ox0 = me.x, oz0 = me.z, oy = me.y + 1.3;
  for (const e of sim.entities.values()) {
    if (e.type !== 'ark') continue;
    // the assist promises a hit when the line passes within r + 1.4 m of a flyer / r + 0.9 m of a walker
    const reach = (e.r || 0.6) + ((e.alt || 0) > 0.6 ? 1.4 : 0.9) - 0.1;
    const row = { kind: e.kind, alt: +(e.alt || 0).toFixed(1), d: +Math.hypot(e.x - ox0, e.z - oz0).toFixed(1), reach: +reach.toFixed(1), raw: 0, assist: 0, n: 0 };
    for (const err of [0, 0.5, 1, 1.5, 2]) for (const side of [-1, 1]) {
      const dirx = (e.x - ox0), dirz = (e.z - oz0), L = Math.hypot(dirx, dirz), nx = -dirz / L, nz = dirx / L;
      const tx = e.x + nx * err * side, tz = e.z + nz * err * side, a = Math.atan2(tx - ox0, tz - oz0);
      const ox = ox0 + Math.sin(a) * 0.55, oz = oz0 + Math.cos(a) * 0.55;
      const dyRaw = Math.max(-0.6, Math.min(0.6, (sim.grid.floorAt(tx, tz, me.y + 1.5) + 1.0 - oy) / Math.max(1, Math.hypot(tx - ox, tz - oz))));
      const hit = (aa, dy) => { const h = sim.shoot(me, { x: ox, y: oy, z: oz }, aa, dy, w, { spread: 0, team: me.team }); return h[0].r !== 'w' && h[0].r !== 'p' && h[0].r !== 's'; };
      if (err > reach) continue;
      row.n++;
      if (hit(a, dyRaw)) row.raw++;
      pc.aim.entity = null;
      const as = pc.arkAssist(ox, oy, oz, a, w.range);
      if (hit(as ? as.a : a, as ? as.dy : dyRaw)) row.assist++;
    }
    // cursor picking: on the body, half way down, on the shadow, and 0.5 m beside the body
    const v = g.view.vis.get(e.id), alt = v.pa ?? e.alt ?? 0;
    const pick = (y, dx = 0) => { const s = R.worldToScreen(v.px + dx, y, v.pz); return g.view.pickEntity(s.x, s.y, me.id)?.id === e.id; };
    row.pick = [pick(v.py + alt + 0.4), pick(v.py + alt / 2 + 0.2), pick(v.py + 0.2), pick(v.py + alt + 0.4, (e.r || 0.6) + 0.5)].map(x => x ? 'y' : '-').join('');
    out.push(row);
  }
  return out;
});
let fail = 0;
for (const r of res) {
  const ok = r.assist === r.n && r.pick.startsWith('yyy');
  if (!ok) fail++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${r.kind.padEnd(10)} alt ${String(r.alt).padStart(4)} d ${String(r.d).padStart(4)}  misses up to ${r.reach} m:  raw ${r.raw}/${r.n}  assisted ${r.assist}/${r.n}  pick body/mid/shadow/beside ${r.pick}`);
}
if (errs.length) { console.log('page errors:', errs); fail++; }
console.log(fail ? 'FAIL' : 'PASS');
await b.close();
process.exit(fail ? 1 : 0);
