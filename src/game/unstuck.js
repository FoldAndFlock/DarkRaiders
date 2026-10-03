// "I'm stuck" safety net: the nearest spot a raider can be moved to that is connected both ways to the
// spawns and extraction points on the coarse navigation grid (so it isn't another pocket). Maps are checked
// for traps with tools/stucktest.mjs; this is the fallback for anything that slips through.
import { Nav, NAV } from './nav.js';

const cache = new WeakMap();   // world -> { nav, good }

function graph(world, nav) {
  let c = cache.get(world);
  if (c) return c;
  nav = nav || new Nav(world);
  const N = nav.N, fwd = new Uint8Array(N), back = new Uint8Array(N);
  // reverse edges (nb holds the neighbour's layer per direction)
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DZ = [0, 0, 1, -1, 1, -1, 1, -1];
  const to = (n, d) => {
    const k = nav.nb[n * 8 + d]; if (k === 255) return -1;
    const cc = nav.cellOf[n], x = cc % nav.w + DX[d], z = ((cc / nav.w) | 0) + DZ[d];
    return nav.start[z * nav.w + x] + k;
  };
  const rev = Array.from({ length: N }, () => null);
  for (let n = 0; n < N; n++) for (let d = 0; d < 8; d++) { const m = to(n, d); if (m >= 0) (rev[m] ||= []).push(n); }
  const seeds = [...(world.spawns || []).map(s => [s.x, s.z, null]), ...(world.extracts || []).filter(x => x.pts?.call).map(x => [x.pts.call[0], x.pts.call[1], x.y])];
  const start = [];
  for (const [x, z, y] of seeds) { const n = nav.nearestOpen(nav.node(x, z, y ?? -Infinity), 3); if (n >= 0) start.push(n); }
  const flood = (mark, next) => {
    const q = [...start]; for (const n of q) mark[n] = 1;
    for (let h = 0; h < q.length; h++) for (const m of next(q[h])) if (!mark[m] && nav.cost[m]) { mark[m] = 1; q.push(m); }
  };
  flood(fwd, (n) => { const out = []; for (let d = 0; d < 8; d++) { const m = to(n, d); if (m >= 0) out.push(m); } return out; });
  flood(back, (n) => rev[n] || []);
  const good = new Uint8Array(N); for (let n = 0; n < N; n++) good[n] = fwd[n] && back[n];
  c = { nav, good }; cache.set(world, c);
  return c;
}

// nearest good spot to (x, z, y) at least `minD` m away, with room for a raider -> [x, y, z] or null
export function safeSpot(world, x, z, y, nav = null, r = 0.33, minD = 1.5, maxD = 80) {
  const { nav: nv, good } = graph(world, nav), g = world.grid;
  const cx = Math.floor(x / NAV), cz = Math.floor(z / NAV);
  let best = null, bd = 1e9;
  for (let R = 0; R <= Math.ceil(maxD / NAV) && (!best || R * NAV < bd + NAV); R++) {
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== R) continue;
      const X = cx + dx, Z = cz + dz; if (X < 0 || Z < 0 || X >= nv.w || Z >= nv.h) continue;
      const c = Z * nv.w + X;
      for (let n = nv.start[c]; n < nv.start[c + 1]; n++) {
        if (!good[n]) continue;
        const [px, pz] = nv.centre(n), py = nv.hgt[n], dh = py - y;
        const d = Math.hypot(px - x, pz - z) + Math.max(0, dh) * 1.5 + Math.max(0, -dh) * 0.5;   // prefer not to go up onto roofs
        if (Math.hypot(px - x, pz - z) < minD || d >= bd) continue;
        const fy = g.floorAt(px, pz, py + 0.3);
        if (Math.abs(fy - py) > 0.6 || g.blockedAt(px, pz, r, fy)) continue;
        bd = d; best = [px, fy, pz];
      }
    }
  }
  return best;
}
