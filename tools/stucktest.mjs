// Stuck-spot finder: floods each map with the player's real movement rules (the collision grid's move() with
// the raider radius, step-ups of up to STEP_H, drops of any height, mantling up to MANTLE_H, easing free when
// pinned, ladders, every door open) from the
// player spawns, then floods backwards from the spawns and extraction call points. Any place a raider can
// get to but can't get back out of is a trap (a pit with walls too steep to climb, a ledge you can drop onto
// but not leave, a pocket between props...). Reports each trap area with its size, position and nearest POI.
//   node tools/stucktest.mjs [base url] [maps,comma,separated] [x0,z0,x1,z1 to limit the report]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8123/index.html', mapsArg = 'damn_grounds,sandy_city,green_gate', box = ''] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] });
let total = 0;
for (const map of mapsArg.split(',')) {
  const p = await b.newPage({ viewport: { width: 320, height: 180 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${base}?raid=${map}&time=noon&weather=clear`);
  await p.waitForFunction(() => window.app && window.app.game && window.app.game.running, null, { timeout: 400000 });
  const t0 = Date.now();
  const res = await p.evaluate((box) => {
    const g = window.app.game; g.running = false;
    const W = g.world, grid = W.grid, C = 0.5, cw = grid.cw, ch = grid.ch, N = cw * ch, RAD = 0.33;
    for (const d of grid.doorBlocks || []) d.closed = !!d.gate;         // doors (locked ones too: keys) open; extraction gates
                                                                         // (cabin doors, metro platform gates) shut: they only open with the car there
    const NONE = -32768, A0 = new Int16Array(N).fill(NONE), A1 = new Int16Array(N).fill(NONE), EX = new Map();
    const B0 = new Int16Array(N).fill(NONE), B1 = new Int16Array(N).fill(NONE), BX = new Map();
    const q = (y) => Math.round(y * 20), near = (a, b) => a !== NONE && Math.abs(a - b) <= 3;
    const has = (L0, L1, LX, i, y) => near(L0[i], y) || near(L1[i], y) || (LX.get(i) || []).some(v => near(v, y));
    const put = (L0, L1, LX, i, y) => { if (L0[i] === NONE) L0[i] = y; else if (L1[i] === NONE) L1[i] = y; else { let a = LX.get(i); if (!a) LX.set(i, a = []); a.push(y); } };
    const levels = (i) => { const out = []; if (A0[i] !== NONE) out.push(A0[i]); if (A1[i] !== NONE) out.push(A1[i]); for (const v of EX.get(i) || []) out.push(v); return out; };
    const cx = (i) => (i % cw + 0.5) * C, cz = (i) => (Math.floor(i / cw) + 0.5) * C, cell = (x, z) => Math.floor(z / C) * cw + Math.floor(x / C);
    const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    // where a node actually stands: the cell centre, or the spot a mantle / unstick / ladder put it
    const rep = new Map(), key = (i, yq) => i * 65536 + (yq & 0xffff);
    const pos = (i, yq) => rep.get(key(i, yq)) || [cx(i), cz(i)];
    // one move from node (i, yq) toward the centre of neighbour cell j: the height it lands at, or null
    const step = (i, yq, j) => {
      const [x, z] = pos(i, yq), tx = cx(j), tz = cz(j), pp = { x, z, y: yq / 20 };
      grid.move(pp, tx - x, tz - z, RAD);
      if (Math.abs(pp.x - tx) > 0.01 || Math.abs(pp.z - tz) > 0.01) return null;
      const f = grid.floorAt(pp.x, pp.z, pp.y);
      return q(f < pp.y ? f : pp.y);
    };
    // ladders: within 1.2 m of one end, on its level -> the other end
    const lad = new Map();
    const link = (x, z, y, tx, tz, ty) => {
      if (!(Number.isFinite(y) && Number.isFinite(ty))) return;
      for (let dz = -1.2; dz <= 1.2; dz += C) for (let dx = -1.2; dx <= 1.2; dx += C) {
        if (dx * dx + dz * dz > 1.44) continue;
        const i = cell(x + dx, z + dz); let a = lad.get(i); if (!a) lad.set(i, a = []);
        a.push([q(y), cell(tx, tz), q(ty)]);
      }
    };
    for (const l of W.ladders || []) { link(l.x0, l.z0, l.y0, l.x1, l.z1, l.y1); link(l.x1, l.z1, l.y1, l.x0, l.z0, l.y0); }
    // a node's moves: pinned -> eased free (grid.unstick); else the 4 steps, and a mantle (grid.mantleTo,
    // pushing into a ledge) wherever a step is blocked; plus ladders. Special (non-neighbour) moves are
    // flagged so the backward flood can follow them in reverse.
    const DIR8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    const outs = (i, yq, cb) => {
      const X = i % cw, Z = Math.floor(i / cw), [x, z] = pos(i, yq), y = yq / 20;
      const u = grid.unstick(x, z, RAD, y);
      if (u) { const f = grid.floorAt(u[0], u[1], y); cb(cell(u[0], u[1]), q(f < y ? f : y), true, u); return; }
      let blocked = false;
      for (const [dx, dz] of DIRS) {
        const nx = X + dx, nz = Z + dz; if (nx < 1 || nz < 1 || nx >= cw - 1 || nz >= ch - 1) continue;
        const j = nz * cw + nx, yy = step(i, yq, j); if (yy != null) cb(j, yy); else blocked = true;
      }
      if (blocked) for (const [dx, dz] of DIR8) { const m = grid.mantleTo(x, z, dx, dz, RAD, y); if (m) cb(cell(m.x, m.z), q(m.y), true, [m.x, m.z]); }
      for (const [fy, j, ty] of lad.get(i) || []) if (Math.abs(fy - yq) <= 12) cb(j, ty, true);
    };
    const special = new Map();   // target cell -> [[target y, from cell, from y]] for unstick / mantle / ladder moves
    // seeds: spawns (forward); spawns + extraction call points (backward)
    const seed = (x, z, y) => [cell(x, z), q(grid.floorAt(x, z, y ?? W.groundAt(x, z) + 0.3))];
    const spawns = (W.spawns || []).map(s => seed(s.x, s.z));
    const goals = [...spawns, ...(W.extracts || []).filter(x => x.pts?.call).map(x => seed(x.pts.call[0], x.pts.call[1], (x.y ?? 0) + 0.3))];
    // forward flood
    let Q = [];
    for (const [i, y] of spawns) if (!has(A0, A1, EX, i, y)) { put(A0, A1, EX, i, y); Q.push(i, y); }
    let n = 0;
    for (let h = 0; h < Q.length; h += 2) {
      const i = Q[h], y = Q[h + 1]; n++;
      outs(i, y, (j, yy, sp, at) => {
        if (sp) { let a = special.get(j); if (!a) special.set(j, a = []); a.push([yy, i, y]); }
        if (!has(A0, A1, EX, j, yy)) { put(A0, A1, EX, j, yy); Q.push(j, yy); if (at) rep.set(key(j, yy), at); }
      });
    }
    const reach = n;
    // backward flood over the reached nodes: predecessors are reached neighbours whose move lands here
    Q = [];
    for (const [i, y] of goals) for (const v of levels(i)) if (Math.abs(v - y) <= 12 && !has(B0, B1, BX, i, v)) { put(B0, B1, BX, i, v); Q.push(i, v); }
    for (let h = 0; h < Q.length; h += 2) {
      const i = Q[h], y = Q[h + 1], X = i % cw, Z = Math.floor(i / cw);
      for (const [dx, dz] of DIRS) {
        const j = (Z + dz) * cw + X + dx;
        for (const v of levels(j)) { if (has(B0, B1, BX, j, v) || grid.blockedAt(...pos(j, v), RAD, v / 20)) continue; const yy = step(j, v, i); if (yy != null && Math.abs(yy - y) <= 3) { put(B0, B1, BX, j, v); Q.push(j, v); } }
      }
      for (const [ty, j, fy] of special.get(i) || []) if (Math.abs(ty - y) <= 3 && !has(B0, B1, BX, j, fy)) { put(B0, B1, BX, j, fy); Q.push(j, fy); }
    }
    // escape check with continuous movement (16 directions, sliding along walls, 0.35 m steps, gravity), so
    // the cell-centre flood's blind spots don't count: a node is only a real trap if this can't reach the
    // "can get back" set either
    const inB = (x, z, y) => { const i = cell(x, z); return i >= 0 && i < N && has(B0, B1, BX, i, q(y)); };
    const escape = (i, yq) => {
      const seen = new Set(), st = [[...pos(i, yq), yq / 20]];
      const pkey = (x, z, y) => Math.round(x * 4) * 1e7 + Math.round(z * 4) * 1e2 + ((Math.round(y * 4) % 100) + 100) % 100;
      for (let h = 0; h < st.length && h < 4000; h++) {
        let [x, z, y] = st[h];
        const u = grid.unstick(x, z, RAD, y); if (u) { x = u[0]; z = u[1]; }
        for (let k = 0; k < 16; k++) {
          const a = k * Math.PI / 8, pp = { x, z, y };
          grid.move(pp, Math.sin(a) * 0.35, Math.cos(a) * 0.35, RAD);
          if (Math.hypot(pp.x - x, pp.z - z) < 0.1) { const m = grid.mantleTo(x, z, Math.sin(a), Math.cos(a), RAD, y); if (m) { pp.x = m.x; pp.z = m.z; pp.y = m.y; } }
          const f = grid.floorAt(pp.x, pp.z, pp.y), ny = f < pp.y ? f : pp.y;
          if (inB(pp.x, pp.z, ny)) return true;
          const kk = pkey(pp.x, pp.z, ny); if (seen.has(kk)) continue; seen.add(kk); st.push([pp.x, pp.z, ny]);
        }
      }
      return false;
    };
    // traps: reached but can't get back; group by 8-connected cells
    const trap = new Map();
    for (let i = 0; i < N; i++) { if (A0[i] === NONE) continue; for (const v of levels(i)) if (!has(B0, B1, BX, i, v)) { let a = trap.get(i); if (!a) trap.set(i, a = []); a.push(v); } }
    const [bx0, bz0, bx1, bz1] = box ? box.split(',').map(Number) : [-1e9, -1e9, 1e9, 1e9];
    const seen = new Set(), comps = []; let artifacts = 0;
    for (const i0 of trap.keys()) {
      if (seen.has(i0)) continue;
      const st = [i0]; seen.add(i0); const cells = [];
      while (st.length) { const i = st.pop(); cells.push(i); const X = i % cw, Z = Math.floor(i / cw); for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const j = (Z + dz) * cw + X + dx; if (trap.has(j) && !seen.has(j)) { seen.add(j); st.push(j); } } }
      let sx = 0, sz = 0, y0 = 1e9, y1 = -1e9, x0 = 1e9, x1 = -1e9, z0 = 1e9, z1 = -1e9;
      for (const i of cells) { const x = cx(i), z = cz(i); sx += x; sz += z; x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); for (const v of trap.get(i)) { y0 = Math.min(y0, v / 20); y1 = Math.max(y1, v / 20); } }
      const mx = sx / cells.length, mz = sz / cells.length;
      if (mx < bx0 || mx > bx1 || mz < bz0 || mz > bz1) continue;
      let poi = null, pd = 1e9; for (const P of W.pois || []) { const d = Math.hypot(P.x - mx, P.z - mz); if (d < pd) { pd = d; poi = P.name; } }
      // real trap only if some sample in it can't escape with continuous movement
      const samples = cells.length <= 6 ? cells : Array.from({ length: 6 }, (_, k) => cells[Math.floor(k * cells.length / 6)]);
      let stuck = null;
      for (const i of samples) { const v = trap.get(i)[0]; if (!escape(i, v)) { const [sx, sz] = pos(i, v); stuck = [+sx.toFixed(2), +sz.toFixed(2), +(v / 20).toFixed(2)]; break; } }
      if (!stuck) { artifacts++; continue; }
      comps.push({ cells: cells.length, at: [+mx.toFixed(1), +mz.toFixed(1)], bbox: [x0, z0, x1, z1].map(v => +v.toFixed(1)), y: [+y0.toFixed(2), +y1.toFixed(2)], poi, poiD: Math.round(pd), stuck });
    }
    comps.sort((a, b) => b.cells - a.cells);
    return { reach, back: Q.length / 2, comps, artifacts };
  }, box);
  const secs = Math.round((Date.now() - t0) / 1000);
  console.log(`${map}: ${res.reach} reachable nodes, ${res.back} can get back, ${res.comps.length} real trap areas (+${res.artifacts} grid artifacts that free movement escapes) (${secs}s)`);
  for (const c of res.comps.slice(0, 60)) console.log(`   ${String(c.cells).padStart(5)} cells at ${c.at} bbox ${c.bbox} y ${c.y}  near ${c.poi} (${c.poiD} m)  stuck at ${c.stuck}`);
  if (errs.length) console.log('   page errors:', errs.slice(0, 3));
  total += res.comps.length;
  await p.close();
}
console.log(total ? `FAIL: ${total} trap areas` : 'PASS: no trap areas');
await b.close();
process.exit(total ? 1 : 0);
