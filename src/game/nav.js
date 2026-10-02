// Coarse layered navigation grid (2 m cells) derived from the multi-level collision grid + budgeted A*.
// Every nav cell can hold up to L walkable layers (ground, upper floors, roofs, the ground above a
// tunnel, the tunnel itself); a node is cell * L + layer. Edges connect to the neighbour layer at a
// similar height, verified on the fine grid when heights differ (stairs yes, ledges no).
import { CELL, STEP_H, BODY_H } from '../engine/world.js';

export const NAV = 2;
const L = 4;
const OFFS = [0, -0.35, 0.35, -0.7, 0.7, -0.95, 0.95];   // sideways offsets tried when verifying an edge
const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

export class Nav {
  constructor(world) {
    const g = world.grid;
    this.world = world; this.grid = g;
    this.w = Math.ceil(world.w / NAV); this.h = Math.ceil(world.h / NAV);
    const N = this.w * this.h * L;
    this.hgt = new Float32Array(N).fill(NaN);
    this.cost = new Uint8Array(N);               // 0 = blocked, 1 = open, 2.. = extra cost (water / clutter)
    this.nb = new Uint8Array(N * 8).fill(255);  // neighbour layer per direction (255 = no edge)
    this.layers = new Uint8Array(this.w * this.h);
    this.partial = new Uint8Array(N);            // some fine cells blocked: edges get verified on the fine grid
    const sub = NAV / CELL;
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      const cx = x * NAV + NAV / 2, cz = z * NAV + NAV / 2, ci = g.idx(cx, cz), c = z * this.w + x;
      if (ci < 0) continue;
      let surf = g.surfacesI(ci);
      if (surf.length > L) surf = surf.slice(0, L);
      this.layers[c] = surf.length;
      surf.forEach((hs, li) => {
        // bare terrain: use the smooth height
        const h = li === 0 && !g.solidBase[ci] ? world.groundAt(cx, cz) : hs;
        const n = c * L + li; this.hgt[n] = h;
        let blocked = 0, wet = 0, steep = 0, uneven = 0;
        for (let j = 0; j < sub; j++) for (let i = 0; i < sub; i++) {
          const gx = x * sub + i, gz = z * sub + j; if (gx >= g.cw || gz >= g.ch) { blocked++; continue; }
          const gi = gz * g.cw + gx;
          // judged against this fine cell's own floor near h (a stair climbs ~1.3 m across a nav cell):
          // no floor in reach / no headroom = blocked; steps, crates, kerbs = uneven (edges get walked)
          const f = g.floorI(gi, h + 1.4);
          if (f > h + 1.4 || f < h - 1.4 || g.solidIn(gi, f + STEP_H, f + BODY_H)) blocked++;
          else if (Math.abs(f - h) > 0.5) uneven++;
          if (li === 0 && g.water[gi]) { const b = g.bodies[g.water[gi] - 1]; const d = b.level - g.top[gi]; if (d > 0.95) blocked += 4; else if (d > 0.1) wet++; }
        }
        if (li === 0 && !g.solidBase[ci]) {
          const slope = Math.abs(world.groundAt(cx + 1, cz) - world.groundAt(cx - 1, cz)) + Math.abs(world.groundAt(cx, cz + 1) - world.groundAt(cx, cz - 1));
          if (slope > 1.6) steep = 1;
        }
        // mostly solid -> closed; partly blocked (walls, doors, stair sides) -> open, edges verified below
        this.cost[n] = blocked >= 9 || steep ? 0 : 1 + (wet ? 2 : 0) + (blocked ? 1 : 0);
        this.partial[n] = blocked > 0 || uneven > 0 ? 1 : 0;
      });
    }
    // edges
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      const c = z * this.w + x;
      for (let li = 0; li < this.layers[c]; li++) {
        const n = c * L + li; if (!this.cost[n]) continue;
        const h = this.hgt[n];
        DIRS.forEach(([dx, dz], di) => {
          const X = x + dx, Z = z + dz; if (X < 0 || Z < 0 || X >= this.w || Z >= this.h) return;
          const c2 = Z * this.w + X; let best = -1, bd = 1e9;
          for (let lj = 0; lj < this.layers[c2]; lj++) { const m = c2 * L + lj; if (!this.cost[m]) continue; const dd = Math.abs(this.hgt[m] - h); if (dd < bd) { bd = dd; best = lj; } }
          if (best < 0 || bd > 2.2) return;
          const m = c2 * L + best, h2 = this.hgt[m];
          const multi = this.layers[c] > 1 || this.layers[c2] > 1;
          if (bd > 0.9 || (multi && bd > 0.2) || this.partial[n] || this.partial[m]) {
            // walk it on the fine grid: centre line, then two lines offset sideways (doors off-centre)
            const ax = x * NAV + 1, az = z * NAV + 1, bx = X * NAV + 1, bz = Z * NAV + 1, ln = Math.hypot(dx, dz), px = -dz / ln, pz = dx / ln;
            if (!OFFS.some(o => this.stepWalk(ax + px * o, az + pz * o, h, bx + px * o, bz + pz * o, h2))) return;
          }
          this.nb[n * 8 + di] = best;
        });
      }
    }
    this.heapI = []; this.heapF = [];
    this.g = new Float32Array(N); this.from = new Int32Array(N);
    this.stamp = new Uint32Array(N); this.closed = new Uint32Array(N); this.cur = 0;
  }
  // fine-grid check that a walker can get from (ax,az,ah) to (bx,bz,bh): steps up <= STEP_H, drops <= 1.4 m
  stepWalk(ax, az, ah, bx, bz, bh) {
    const g = this.grid, d = Math.hypot(bx - ax, bz - az), n = Math.max(2, Math.ceil(d / (CELL * 0.5)));
    let y = ah;
    for (let k = 1; k <= n; k++) {
      const t = k / n, i = g.idx(ax + (bx - ax) * t, az + (bz - az) * t); if (i < 0) return false;
      const f = g.floorI(i, y);
      if (f < y - 1.4) return false;
      if (g.solidIn(i, f + STEP_H, f + BODY_H)) return false;
      y = f;
    }
    return Math.abs(y - bh) < 0.6;
  }
  cellIdx(x, z) { const cx = Math.floor(x / NAV), cz = Math.floor(z / NAV); return cx < 0 || cz < 0 || cx >= this.w || cz >= this.h ? -1 : cz * this.w + cx; }
  // node at (x, z) on the layer closest to height y (Infinity = lowest)
  node(x, z, y = -Infinity) {
    const c = this.cellIdx(x, z); if (c < 0) return -1;
    let best = -1, bd = 1e9;
    for (let li = 0; li < this.layers[c]; li++) { const n = c * L + li; const dd = y === -Infinity ? li : Math.abs(this.hgt[n] - y); if (dd < bd) { bd = dd; best = n; } }
    return best;
  }
  open(x, z, y = -Infinity) { const n = this.node(x, z, y); return n >= 0 && this.cost[n] > 0; }
  idx(x, z) { return this.node(x, z); }
  nearestOpen(n, rad = 6) {
    if (n >= 0 && this.cost[n]) return n;
    if (n < 0) return -1;
    const c = (n / L) | 0, h = this.hgt[n], x0 = c % this.w, z0 = (c / this.w) | 0;
    for (let r = 1; r <= rad; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = x0 + dx, z = z0 + dz; if (x < 0 || z < 0 || x >= this.w || z >= this.h) continue;
      const c2 = z * this.w + x;
      for (let li = 0; li < this.layers[c2]; li++) { const m = c2 * L + li; if (this.cost[m] && Math.abs(this.hgt[m] - h) < 2) return m; }
    }
    return -1;
  }
  // A* from (sx,sz,sy) to (tx,tz,ty); returns [x, z, y] waypoints (smoothed per layer) or null
  find(sx, sz, tx, tz, budget = 6000, sy = -Infinity, ty = -Infinity) {
    const s = this.nearestOpen(this.node(sx, sz, sy)), t = this.nearestOpen(this.node(tx, tz, ty));
    if (s < 0 || t < 0) return null;
    if (s === t) return [[tx, tz, this.hgt[t]]];
    const W = this.w, tc = (t / L) | 0, tX = tc % W, tZ = (tc / W) | 0;
    const stamp = ++this.cur;
    const heapF = [], heapI = [];
    const push = (i, f) => { heapF.push(f); heapI.push(i); let k = heapF.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heapF[p] <= heapF[k]) break; [heapF[p], heapF[k]] = [heapF[k], heapF[p]]; [heapI[p], heapI[k]] = [heapI[k], heapI[p]]; k = p; } };
    const pop = () => {
      const ri = heapI[0]; const lf = heapF.pop(), li = heapI.pop();
      if (heapF.length) { heapF[0] = lf; heapI[0] = li; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < heapF.length && heapF[a] < heapF[m]) m = a; if (b < heapF.length && heapF[b] < heapF[m]) m = b; if (m === k) break; [heapF[m], heapF[k]] = [heapF[k], heapF[m]]; [heapI[m], heapI[k]] = [heapI[k], heapI[m]]; k = m; } }
      return ri;
    };
    const h = (n) => { const c = (n / L) | 0, dx = Math.abs(c % W - tX), dz = Math.abs(((c / W) | 0) - tZ); return (dx + dz) + (1.414 - 2) * Math.min(dx, dz) + Math.abs(this.hgt[n] - this.hgt[t]) * 0.5; };
    this.stamp[s] = stamp; this.g[s] = 0; this.from[s] = -1; push(s, h(s));
    let best = s, bestH = h(s), cnt = 0;
    while (heapF.length && cnt++ < budget) {
      const n = pop();
      if (this.closed[n] === stamp) continue;
      this.closed[n] = stamp;
      if (n === t) { best = n; break; }
      const hc = h(n); if (hc < bestH) { bestH = hc; best = n; }
      const c = (n / L) | 0, cx = c % W, cz = (c / W) | 0;
      for (let di = 0; di < 8; di++) {
        const lj = this.nb[n * 8 + di]; if (lj === 255) continue;
        const [dx, dz, dc] = DIRS[di];
        if (dx && dz && (this.nb[n * 8 + (dx > 0 ? 0 : 1)] === 255 || this.nb[n * 8 + (dz > 0 ? 2 : 3)] === 255)) continue; // no corner cutting
        const m = ((cz + dz) * W + cx + dx) * L + lj, cost = this.cost[m];
        const ng = this.g[n] + dc * cost;
        if (this.stamp[m] === stamp && ng >= this.g[m]) continue;
        this.stamp[m] = stamp; this.g[m] = ng; this.from[m] = n;
        push(m, ng + h(m) * 1.15);
      }
    }
    const nodes = [];
    for (let n = best; n >= 0; n = this.from[n]) { nodes.push(n); if (n === s) break; if (nodes.length > 4000) break; }
    nodes.reverse();
    const pts = nodes.map(n => { const c = (n / L) | 0; return [(c % W) * NAV + NAV / 2, ((c / W) | 0) * NAV + NAV / 2, this.hgt[n]]; });
    if (best === t) pts.push([tx, tz, this.hgt[t]]);
    return this.smooth(pts);
  }
  // string-pulling, only along runs on the same level
  smooth(pts) {
    if (pts.length < 3) return pts;
    const out = [pts[0]]; let a = 0;
    while (a < pts.length - 1) {
      let b = pts.length - 1;
      while (b > a + 1 && !this.walkable(pts[a], pts[b])) b--;
      out.push(pts[b]); a = b;
    }
    return out;
  }
  walkable(p, q) {
    const py = p[2] ?? -Infinity, qy = q[2] ?? py;
    if (Math.abs(qy - py) > 0.4) return false;
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.ceil(d / (NAV * 0.5));
    for (let i = 1; i < n; i++) {
      const t = i / n, x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t, nd = this.node(x, z, py);
      if (nd < 0 || !this.cost[nd] || Math.abs(this.hgt[nd] - py) > 0.6) return false;
    }
    return true;
  }
  // random open point near (x, z) on the level nearest y; returns [x, z, y]
  randomOpenNear(x, z, r, rng = Math.random, y = -Infinity) {
    for (let k = 0; k < 20; k++) {
      const a = rng() * Math.PI * 2, d = rng() * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      const n = this.node(px, pz, y);
      if (n >= 0 && this.cost[n] && (y === -Infinity || Math.abs(this.hgt[n] - y) < 1.5)) return [px, pz, this.hgt[n]];
    }
    const n = this.node(x, z, y);
    return [x, z, n >= 0 ? this.hgt[n] : this.world.groundAt(x, z)];
  }
}
