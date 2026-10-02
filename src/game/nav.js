// Coarse navigation grid (2 m cells) derived from the collision grid + budgeted A*.
import { CELL, STEP_H } from '../engine/world.js';

export const NAV = 2;

export class Nav {
  constructor(world) {
    const g = world.grid;
    this.world = world;
    this.w = Math.ceil(world.w / NAV); this.h = Math.ceil(world.h / NAV);
    this.cost = new Uint8Array(this.w * this.h);   // 0 = blocked, 1 = open, 2..= extra cost (water/slopes)
    const sub = NAV / CELL;
    for (let z = 0; z < this.h; z++) for (let x = 0; x < this.w; x++) {
      const cx = x * NAV + NAV / 2, cz = z * NAV + NAV / 2;
      const ground = world.groundAt(cx, cz);
      let blocked = 0, wet = 0, steep = 0;
      for (let j = 0; j < sub; j++) for (let i = 0; i < sub; i++) {
        const gx = x * sub + i, gz = z * sub + j; if (gx >= g.cw || gz >= g.ch) { blocked++; continue; }
        const gi = gz * g.cw + gx;
        if (g.top[gi] > ground + STEP_H + 0.25) blocked++;
        if (g.water[gi]) { const b = g.bodies[g.water[gi] - 1]; const d = b.level - g.top[gi]; if (d > 0.95) blocked += 4; else if (d > 0.1) wet++; }
      }
      const slope = Math.abs(world.groundAt(cx + 1, cz) - world.groundAt(cx - 1, cz)) + Math.abs(world.groundAt(cx, cz + 1) - world.groundAt(cx, cz - 1));
      if (slope > 1.6) steep = 1;
      this.cost[z * this.w + x] = blocked >= 2 || steep ? 0 : 1 + (wet ? 2 : 0) + (blocked ? 2 : 0);
    }
    this.heap = new Int32Array(this.w * this.h);
    this.g = new Float32Array(this.w * this.h);
    this.from = new Int32Array(this.w * this.h);
    this.stamp = new Uint32Array(this.w * this.h); this.cur = 0;
    this.closed = new Uint32Array(this.w * this.h);
  }
  open(x, z) { const i = this.idx(x, z); return i >= 0 && this.cost[i] > 0; }
  idx(x, z) { const cx = Math.floor(x / NAV), cz = Math.floor(z / NAV); return cx < 0 || cz < 0 || cx >= this.w || cz >= this.h ? -1 : cz * this.w + cx; }
  nearestOpen(i, rad = 6) {
    if (i >= 0 && this.cost[i]) return i;
    const x0 = i % this.w, z0 = (i / this.w) | 0;
    for (let r = 1; r <= rad; r++) for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
      const x = x0 + dx, z = z0 + dz; if (x < 0 || z < 0 || x >= this.w || z >= this.h) continue;
      if (this.cost[z * this.w + x]) return z * this.w + x;
    }
    return -1;
  }
  // A* from (sx,sz) to (tx,tz); returns array of world [x,z] waypoints (smoothed) or null
  find(sx, sz, tx, tz, budget = 6000) {
    let s = this.nearestOpen(this.idx(sx, sz)), t = this.nearestOpen(this.idx(tx, tz));
    if (s < 0 || t < 0) return null;
    if (s === t) return [[tx, tz]];
    const W = this.w, tX = t % W, tZ = (t / W) | 0;
    const stamp = ++this.cur;
    const heapF = [], heapI = [];
    const push = (i, f) => { heapF.push(f); heapI.push(i); let k = heapF.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heapF[p] <= heapF[k]) break; [heapF[p], heapF[k]] = [heapF[k], heapF[p]]; [heapI[p], heapI[k]] = [heapI[k], heapI[p]]; k = p; } };
    const pop = () => {
      const ri = heapI[0]; const lf = heapF.pop(), li = heapI.pop();
      if (heapF.length) { heapF[0] = lf; heapI[0] = li; let k = 0; for (;;) { const a = 2 * k + 1, b = a + 1; let m = k; if (a < heapF.length && heapF[a] < heapF[m]) m = a; if (b < heapF.length && heapF[b] < heapF[m]) m = b; if (m === k) break; [heapF[m], heapF[k]] = [heapF[k], heapF[m]]; [heapI[m], heapI[k]] = [heapI[k], heapI[m]]; k = m; } }
      return ri;
    };
    const h = (i) => { const dx = Math.abs(i % W - tX), dz = Math.abs(((i / W) | 0) - tZ); return (dx + dz) + (1.414 - 2) * Math.min(dx, dz); };
    this.stamp[s] = stamp; this.g[s] = 0; this.from[s] = -1; push(s, h(s));
    let best = s, bestH = h(s), n = 0;
    const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
    while (heapF.length && n++ < budget) {
      const c = pop();
      if (this.closed[c] === stamp) continue;
      this.closed[c] = stamp;
      if (c === t) { best = c; break; }
      const hc = h(c); if (hc < bestH) { bestH = hc; best = c; }
      const cx = c % W, cz = (c / W) | 0;
      for (const [dx, dz, dc] of DIRS) {
        const x = cx + dx, z = cz + dz; if (x < 0 || z < 0 || x >= W || z >= this.h) continue;
        const ni = z * W + x; const cost = this.cost[ni]; if (!cost) continue;
        if (dx && dz && (!this.cost[cz * W + x] || !this.cost[z * W + cx])) continue; // no corner cutting
        const ng = this.g[c] + dc * cost;
        if (this.stamp[ni] === stamp && ng >= this.g[ni]) continue;
        this.stamp[ni] = stamp; this.g[ni] = ng; this.from[ni] = c;
        push(ni, ng + h(ni) * 1.15);
      }
    }
    // reconstruct (to target or closest reached)
    const cells = [];
    for (let c = best; c >= 0; c = this.from[c]) { cells.push(c); if (c === s) break; if (cells.length > 4000) break; }
    cells.reverse();
    const pts = cells.map(c => [(c % W) * NAV + NAV / 2, ((c / W) | 0) * NAV + NAV / 2]);
    if (best === t) pts.push([tx, tz]);
    return this.smooth(pts);
  }
  // string-pulling using grid line-of-walk
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
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.ceil(d / (NAV * 0.5));
    for (let i = 1; i < n; i++) { const t = i / n; if (!this.open(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)) return false; }
    return true;
  }
  randomOpenNear(x, z, r, rng = Math.random) {
    for (let k = 0; k < 20; k++) {
      const a = rng() * Math.PI * 2, d = rng() * r, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (this.open(px, pz)) return [px, pz];
    }
    return [x, z];
  }
}
