// ARK behaviours: perception (vision cone + LOS + detection meter + hearing) and per-archetype
// movement/attacks. Brains run on the host only.
//
// Movement. Walkers follow the nav grid and slide along walls (Grid.move). Flyers are a hull cylinder (radius
// fr, half-height fh around the hull centre at H = e.y + e.alt, where e.y is the floor under the hull) that is
// never allowed inside a solid (Grid.solidIn over the cells under it):
//   sky  open sky overhead: straight at the goal, looking ahead along the heading for what it has to clear and
//        climbing early enough to make it (slowing down when the climb needs it); something too tall to hop
//        (towers, cliffs, overpass piers, long blocks) is flown round instead; collide + slide is the last word
//   low  under a ceiling (inside, under a deck) or a small flyer going in after a target: the walkers' nav path,
//        flown ~1.5 m over the floor and always under the ceiling (Grid.ceilAt), squeezing through doorways
// Firing positions: an ARK that lost sight of its target (the raider stepped into a building, behind a wall)
// samples points around it - rings within weapon range + lanes through the building's doors and windows -
// scores them by line of sight from its eye to the raider's chest, travel and melee distance (budgeted search,
// ~1 per second each, a few per tick for the whole sim), goes there and holds the angle while it shoots; small
// ARK go in through an open doorway instead.
// Hits: shots / blasts are summed per tick (Sim.tick -> applyHit): knockback impulse along the shot (scaled by
// damage / mass, collision-checked), an altitude dip for flyers, a short stagger for walkers on big hits, and an
// 'ahit' event the view turns into a tilt + spring wobble on every peer.
import { ARK, ARK_ALIAS } from '../data/arc.js';
import { wrapAngle } from './sim.js';
import { makeStack } from './items.js';
import { CELL } from '../engine/world.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const DEG = Math.PI / 180;
const CLR = 0.6;                                    // flyers: clearance over whatever they cross (+ half hull height)
const KB_MAX = 7;                                   // knockback speed cap (m/s)
const SIDES = [0.45, -0.45, 0.9, -0.9, 1.35, -1.35];   // detour headings tried round something too tall to hop
const NO_ENTER = new Set(['bastion', 'bombardier', 'leaper', 'queen', 'matriarch', 'sentinel', 'turret', 'snitch', 'spotter', 'surveyor']);

// map archetype keys used by maps (wasp, hornet, ...) to ARK ids via their model/behaviour
const BY_ARCH = {};
for (const [id, d] of Object.entries(ARK)) {
  d.id = id;
  const keys = [d.model, d.behavior, id];
  for (const k of keys) if (k && !BY_ARCH[k]) BY_ARCH[k] = d;
}
const ALIASES = { drone: 'wasp', hornet: 'hornet', heavy_drone: 'hornet', rollbot: 'surveyor' };
export function arkDefFor(arch) { return ARK[arch] || ARK[ARK_ALIAS?.[arch]] || BY_ARCH[arch] || BY_ARCH[ALIASES[arch]] || null; }
export { ARK };

export class ArkBrain {
  constructor(sim, e, opts = {}) {
    this.sim = sim; this.e = e; this.def = e.def;
    this.patrol = opts.patrol || null; this.pi = 0;
    this.home = opts.home || [e.x, e.z];
    this.sweepF = opts.f ?? null;
    this.fixed = !!(opts.fixed || this.def.static || this.def.speed === 0);
    this.target = null; this.lastSeen = null; this.lostT = 0;
    this.cool = sim.rng() * 2; this.wind = 0; this.burst = 0; this.shotT = 0;
    this.stunT = 0; this.stagT = 0; this.path = null; this.pathT = 0; this.wanderT = 0; this.goal = null;
    this.sweepT = sim.rng() * 10;
    e.gaze = e.f; e.vis = 0; e.tele = 0;            // replicated: gaze dir, detection, telegraph progress
    this.speedMul = 1; this.disarmed = false; this.blind = false; this.brokenCount = 0;
    this.leap = null; this.latched = null; this.alarmed = false;
    // hit physics: mass ~ footprint (flyers are light), knockback velocity, flyer altitude dip, per-tick hit sum
    this.mass = (this.def.flying ? 1 : 2) * Math.max(0.2, ((this.def.radius || 0.6) / 0.6) ** 2);
    this.kbx = 0; this.kbz = 0; this.dipV = 0; this.hit = null;
    // firing positions (seek) + the angle it holds once it sees the target from there
    this.seekP = null; this.seekT = 0; this.holdP = null;
    this.canEnter = !this.fixed && (this.def.radius || 0.6) <= 0.8 && !NO_ENTER.has(this.def.behavior);
    e.alt = 0;
    if (this.def.flying) this.initFlight();
  }
  stun(t) { this.stunT = Math.max(this.stunT, t); this.e.tele = 0; this.wind = 0; }
  investigate(x, z, force = false) {
    if (this.e.st === 'alert' && !force) return;
    this.e.st = 'search'; this.lastSeen = [x, z]; this.lostT = 0; this.path = null; this.goal = [x, z];
  }
  onHit(src, dmg, o = {}) {
    if (this.latched && this.sim.rng() < 0.15) this.unlatch();
    if (src && (src.type === 'raider') && src.st === 'alive') {
      this.target = src.id; this.e.st = 'alert'; this.lastSeen = [src.x, src.z, src.y]; this.lostT = 0; this.e.vis = 1;
    }
    // knockback direction: the shot's, away from a blast centre, else away from the shooter; summed per tick
    let dx = o.dirX, dz = o.dirZ;
    if (dx == null && o.bx != null) { dx = this.e.x - o.bx; dz = this.e.z - o.bz; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    if (dx == null && src && src !== this.e) { dx = this.e.x - src.x; dz = this.e.z - src.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l; }
    const h = this.hit || (this.hit = { x: 0, z: 0, d: 0, big: false });
    h.x += (dx || 0) * dmg; h.z += (dz || 0) * dmg; h.d += dmg; if (o.explosive) h.big = true;
  }
  // Sim.tick: this tick's hits -> knockback impulse, flyer dip, walker stagger, 'ahit' event (view wobble)
  applyHit() {
    const h = this.hit, e = this.e; this.hit = null;
    if (!h || e.st === 'dead' || h.d < 1) return;
    const L = Math.hypot(h.x, h.z), ux = L > 1e-6 ? h.x / L : 0, uz = L > 1e-6 ? h.z / L : 0;
    const imp = Math.min(KB_MAX, h.d * 0.065 / this.mass);
    if (!this.fixed && !this.leap && !this.latched) {
      this.kbx += ux * imp; this.kbz += uz * imp;
      const s = Math.hypot(this.kbx, this.kbz); if (s > KB_MAX) { this.kbx *= KB_MAX / s; this.kbz *= KB_MAX / s; }
      if (this.def.flying) this.dipV = Math.min(this.dipV, -Math.min(3.5, 0.5 + imp * 0.7));
    }
    const big = h.big || h.d >= Math.max(30, e.maxHp * 0.07);
    // walkers: a short stagger on big hits (shotgun blasts, heavy rounds, explosions): stops them, not their guns
    if (big && !this.def.flying && !this.fixed && !this.leap) this.stagT = Math.max(this.stagT, clamp(0.15 + 1.6 * h.d / e.maxHp, 0.18, this.mass > 8 ? 0.3 : 0.55));
    const k = clamp(h.d / (this.mass * 28), 0.06, 1);
    this.sim.emit({ e: 'ahit', id: e.id, x: Math.round(ux * 100) / 100, z: Math.round(uz * 100) / 100, k: Math.round(k * 100) / 100, b: big ? 1 : 0 });
  }
  partBroken(zone) {
    const e = this.e;
    this.brokenCount++;
    switch (zone.onBreak) {
      case 'stagger': this.stun(1.2); break;
      case 'slow': this.speedMul = Math.max(0.3, this.speedMul - (this.def.slowPerLeg || 0.25)); break;
      case 'disarm': this.disarmed = true; break;
      case 'blind': this.blind = true; break;
      case 'fall': this.fall(); break;
    }
    if (this.def.fallAfter && this.def.flying) {
      const rotors = Object.entries(e.parts).filter(([k, v]) => k.startsWith(zone.name) && v <= 0).length;
      if (rotors >= this.def.fallAfter) this.fall();
    }
    if (zone.lootOnBreak) {
      const items = zone.lootOnBreak.filter(([, ch]) => this.sim.rng() < ch).map(([id, , mn = 1, mx = 1]) => makeStack(id, mn + Math.floor(this.sim.rng() * (mx - mn + 1))));
      if (items.length) this.sim.dropLoot(e.x, e.z, items, 'ark', this.def.name);
    }
  }
  fall() { // flyer crashes
    const e = this.e;
    if (e.st === 'dead') return;
    this.sim.emit({ e: 'crash', id: e.id, x: e.x, z: e.z });
    this.sim.killArk(e, null);
  }
  unlatch() { if (!this.latched) return; const t = this.sim.entities.get(this.latched); if (t) t.latchedBy = null; this.latched = null; this.cool = 1.5; }

  // ------------------------------------------------------------ perception
  eyeY() { return this.e.y + (this.e.alt || 0) + (this.def.flying ? 0 : Math.min(this.def.height || 1, 2.2) * 0.8); }
  perceive(dt) {
    const e = this.e, v = this.def.vision || { range: 20, fov: 90, hearing: 15, alertTime: 1, lose: 6 };
    const night = this.sim.night ? 0.65 : 1;
    let best = null, bestScore = 0;
    const range = v.range * (this.blind ? 0.3 : 1) * (this.sim.condEffects.visionMul || 1);
    this.sim.near(e.x, e.z, range * 1.2, (t) => {
      if (t.type !== 'raider' || (t.st !== 'alive' && t.st !== 'downed')) return;
      if (t.buffs?.cloak) return;
      if (t.grace > this.sim.t) return;                        // just inserted: a few seconds to get bearings
      const dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz);
      let r = range * (t.stats?.arc_detect_mul || 1) * (t.crouch ? 0.62 : 1) * (t.flash && this.sim.night ? 1.35 : night);
      if (t.sprint) r *= 1.15;
      if (d > r) return;
      const a = Math.atan2(dx, dz);
      const half = (v.fov / 2) * DEG;
      const close = d < 3.5;                                   // touching distance: always noticed
      if (!close && Math.abs(wrapAngle(a - e.gaze)) > half) return;
      if (!this.sim.canSee({ x: e.x, z: e.z }, t, this.eyeY())) return;
      const score = (1 - d / r) + (t.id === this.target ? 0.5 : 0);
      if (score > bestScore) { bestScore = score; best = t; }
    });
    if (best) {
      const d = Math.hypot(best.x - e.x, best.z - e.z);
      const rate = (1 / (v.alertTime || 1)) * (0.45 + 1.4 * (1 - d / (range + 0.01))) * (best.crouch ? 0.6 : 1);
      e.vis = Math.min(1, e.vis + rate * dt * (e.st === 'alert' ? 3 : 1));
      if (e.vis >= 1) {
        if (e.st !== 'alert') this.sim.emit({ e: 'alert', id: e.id, kind: e.kind, x: e.x, z: e.z });
        e.st = 'alert'; this.target = best.id; this.lastSeen = [best.x, best.z, best.y]; this.lostT = 0;
      } else if (e.st === 'idle' && e.vis > 0.35) { e.st = 'search'; this.lastSeen = [best.x, best.z, best.y]; }
      return best;
    }
    e.vis = Math.max(0, e.vis - dt * 0.35);
    // hearing
    if (e.st !== 'alert') for (const n of this.sim.noises) {
      const d = Math.hypot(n.x - e.x, n.z - e.z);
      if (d < Math.min(n.r, (v.hearing || 15) * 2.2)) { this.investigate(n.x, n.z); break; }
    }
    return null;
  }

  // ------------------------------------------------------------ movement helpers
  speed() { return (this.def.speed || 3) * this.speedMul * (this.sim.condEffects.arkSpeedMul || 1); }
  turnTo(a, dt, rate = null) {
    const e = this.e, r = (rate ?? this.def.turnRate ?? 180) * DEG * dt;
    e.f += clamp(wrapAngle(a - e.f), -r, r);
  }
  // ty: target height (chasing a raider upstairs / into a tunnel); default = stay on our own level.
  // o (flyers): { h: hull height to settle at near the goal (firing position), near: m, enter: may follow the
  // target inside (small flyers), face: false = keep facing where engage() turned us }
  moveTo(x, z, dt, mul = 1, ty = null, o = null) {
    const e = this.e;
    if (this.fixed) return true;
    if (this.def.flying) return this.fly(x, z, ty, dt, mul, o);
    const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz);
    if (d < 0.6) return true;
    if (this.stagT > 0) return false;                          // staggered by a big hit: rooted for a moment
    const sp = this.speed() * mul * dt;
    // ground: follow nav path (re-plan periodically)
    this.pathT -= dt;
    if (!this.path || this.pathT <= 0 || !this.goal || Math.hypot(this.goal[0] - x, this.goal[1] - z) > 2) {
      this.goal = [x, z]; this.pathT = 1.5 + this.sim.rng();
      this.path = this.sim.nav.find(e.x, e.z, x, z, 2500, e.y, ty ?? e.y) || [[x, z]];
    }
    let wp = this.path[0];
    while (wp && Math.hypot(wp[0] - e.x, wp[1] - e.z) < 1.2 && this.path.length > 1) { this.path.shift(); wp = this.path[0]; }
    if (!wp) return true;
    const wx = wp[0] - e.x, wz = wp[1] - e.z, wd = Math.hypot(wx, wz) || 1;
    this.turnTo(Math.atan2(wx, wz), dt);
    const p = { x: e.x, z: e.z, y: e.y };
    this.sim.grid.move(p, wx / wd * Math.min(wd, sp), wz / wd * Math.min(wd, sp), Math.min(e.r, 0.9));
    e.x = p.x; e.z = p.z; e.y = this.sim.floor(e.x, e.z, p.y);
    return false;
  }

  // ------------------------------------------------------------ flight
  initFlight() {
    const e = this.e, d = this.def, g = this.sim.grid;
    this.fr = clamp((d.radius || 0.6) * 0.8, 0.3, 2.4);          // hull cylinder
    this.fh = clamp((d.size?.height ?? 0.6) * 0.5, 0.2, 2.6);
    this.cruise = d.altitude ?? d.height ?? 2.4;                  // hover altitude over the ground
    this.climb = d.climbRate ?? ((d.radius || 0.6) < 1 ? 4.5 : 3); // m/s up
    this.desc = 2.5;                                              // m/s down
    this.lowAlt = Math.max(this.fh + 0.45, Math.min(1.55, 2.3 - this.fh));   // indoors: under 2.4 m door heads
    this.lk = null; this.lkT = 0; this.side = 0; this.noDetour = 0; this.prog = { d: 1e9, t: 0, gx: 0, gz: 0 };
    let H = e.y + this.cruise;                                    // spawn floor + hover altitude
    const c = g.ceilAt(e.x, e.z, e.y + 0.2);                      // indoors / under a deck: stay under it
    if (c < H + this.fh + 0.15) H = Math.max(e.y + this.fh + 0.3, c - this.fh - 0.15);
    this.place(e.x, e.z, H);
    if (!this.free(e.x, e.z, H)) this.unstick();
  }
  H() { return this.e.y + this.e.alt; }
  // hull at (x, z, H): e.y = the floor under it, e.alt = height over that floor
  place(x, z, H) { const e = this.e; e.x = x; e.z = z; e.y = this.sim.grid.floorAt(x, z, H - this.fh); e.alt = H - e.y; }
  // is the hull clear of every solid (walls, slabs, roofs, closed doors, terrain) at (x, z, H)?
  free(x, z, H, r = this.fr) {
    const g = this.sim.grid, ya = H - this.fh, yb = H + this.fh;
    const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL), z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
    if (x0 < 0 || z0 < 0 || x1 >= g.cw || z1 >= g.ch) return false;
    const r2 = r * r;
    for (let cz = z0; cz <= z1; cz++) {
      const nz = clamp(z, cz * CELL, (cz + 1) * CELL) - z;
      for (let cx = x0; cx <= x1; cx++) {
        const nx = clamp(x, cx * CELL, (cx + 1) * CELL) - x;
        if (nx * nx + nz * nz >= r2) continue;
        if (g.solidIn(cz * g.cw + cx, ya, yb)) return false;
      }
    }
    return true;
  }
  // highest solid top under the hull footprint (sky mode keeps clear of it)
  topUnder(x, z) {
    const g = this.sim.grid, r = this.fr;
    return Math.max(g.floorAt(x, z, 1e9), g.floorAt(x + r, z, 1e9), g.floorAt(x - r, z, 1e9), g.floorAt(x, z + r, 1e9), g.floorAt(x, z - r, 1e9));
  }
  // nearest clear hull height to Hw at (x, z) (lower first: door heads), or null
  fit(x, z, Hw) {
    for (let k = 0; k <= 10; k++) for (const s of k ? [-1, 1] : [1]) { const h = Hw + s * k * 0.2; if (this.free(x, z, h)) return h; }
    return null;
  }
  vmove(H, dH) {
    const e = this.e;
    if (Math.abs(dH) < 1e-4) return H;
    for (let k = 0; k < 4; k++) { if (this.free(e.x, e.z, H + dH)) return H + dH; dH *= 0.5; }
    return H;
  }
  // horizontal move at height H with wall sliding (sub-stepped); returns true if something was hit
  hmove(mx, mz, H) {
    const e = this.e, n = Math.max(1, Math.ceil(Math.hypot(mx, mz) / 0.25));
    let x = e.x, z = e.z, hit = false;
    mx /= n; mz /= n;
    for (let i = 0; i < n; i++) {
      if (this.free(x + mx, z + mz, H)) { x += mx; z += mz; continue; }
      hit = true;
      if (Math.abs(mx) > 1e-5 && this.free(x + mx, z, H)) { x += mx; continue; }
      if (Math.abs(mz) > 1e-5 && this.free(x, z + mz, H)) { z += mz; continue; }
      let ok = false;                                            // a diagonal wall: glance off along it
      for (const a of [0.7, -0.7, 1.2, -1.2]) {
        const c = Math.cos(a) * 0.8, s = Math.sin(a) * 0.8, ux = mx * c + mz * s, uz = mz * c - mx * s;
        if (this.free(x + ux, z + uz, H)) { x += ux; z += uz; ok = true; break; }
      }
      if (!ok) break;
    }
    this.place(x, z, H);
    return hit;
  }
  // somehow inside a solid (a door shut on it, shoved into a corner): nearest clear spot, small moves first
  unstick() {
    const e = this.e, H = e.y + e.alt;
    for (const r of [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 9]) {
      if (this.free(e.x, e.z, H + r)) { this.place(e.x, e.z, H + r); return true; }
      if (this.free(e.x, e.z, H - r)) { this.place(e.x, e.z, H - r); return true; }
      for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, x = e.x + Math.sin(a) * r, z = e.z + Math.cos(a) * r; if (this.free(x, z, H)) { this.place(x, z, H); return true; } }
    }
    for (let h = Math.max(H, this.topUnder(e.x, e.z) + this.fh + 0.3); h < H + 80; h += 0.5) if (this.free(e.x, e.z, h)) { this.place(e.x, e.z, h); return true; }
    return false;
  }
  fly(x, z, ty, dt, mul = 1, o = null) {
    const e = this.e, g = this.sim.grid;
    this.moved = true;
    if (!this.free(e.x, e.z, e.y + e.alt)) this.unstick();
    const H = e.y + e.alt, sp = this.speed() * mul, d = Math.hypot(x - e.x, z - e.z);
    const covered = g.ceilAt(e.x, e.z, H) < Infinity;
    // a small flyer following its target in: to the outside of an open doorway, then the nav path through it
    if (o?.enter && this.canEnter && ty != null && d < 34 && g.ceilAt(x, z, ty + 0.3) < Infinity) {
      if (!covered) {
        const ent = this.entrance(x, z, ty);
        if (ent) {
          const de = Math.hypot(ent.ox - e.x, ent.oz - e.z);
          if (de > 1.6 && !(de < 4 && H < ent.y + this.lowAlt + 1.2)) { this.skyStep(ent.ox, ent.oz, dt, sp, { h: ent.y + this.lowAlt, near: 9, face: o.face }); return false; }
          return this.lowStep(x, z, ty, dt, sp, o);
        }
      } else return this.lowStep(x, z, ty, dt, sp, o);
    }
    if (covered) return this.lowStep(x, z, ty, dt, sp, o);
    return this.skyStep(x, z, dt, sp, o);
  }
  skyStep(tx, tz, dt, sp, o) {
    const e = this.e, sim = this.sim;
    let H = e.y + e.alt;
    const dx = tx - e.x, dz = tz - e.z, d = Math.hypot(dx, dz);
    const near = o?.h != null && d < (o.near ?? 6);
    let hx = d > 1e-3 ? dx / d : Math.sin(e.f), hz = d > 1e-3 ? dz / d : Math.cos(e.f), need = -Infinity, vmax = sp;
    if (!near && d > 0.3) {
      // stuck going round something (no progress for 3 s): just climb over it for a while
      const P = this.prog;
      if (Math.abs(P.gx - tx) + Math.abs(P.gz - tz) > 2 || d < P.d - 1) this.prog = { d, t: 0, gx: tx, gz: tz };
      else if ((P.t += dt) > 3) { this.noDetour = 4; P.t = 0; P.d = d; }
      this.noDetour -= dt;
      this.lkT -= dt;
      if (this.lkT <= 0 || !this.lk) { this.lkT = 0.1; this.lk = this.planSky(hx, hz, Math.min(d + this.fr, clamp(sp * 1.6 + this.fr + 2.5, 4, 14)), H, sp); }
      hx = this.lk.hx; hz = this.lk.hz; need = this.lk.need; vmax = this.lk.vmax;
    }
    const top = this.topUnder(e.x, e.z);
    const Hw = near ? Math.max(o.h, top + this.fh + 0.25) : Math.max(sim.world.groundAt(e.x, e.z) + this.cruise, top + this.fh + CLR, need);
    H = this.vmove(H, clamp(Hw - H, -this.desc * dt, this.climb * dt));
    const step = Math.min(d, Math.min(sp, Math.max(0, vmax)) * dt);
    if (step > 1e-4) { if (this.hmove(hx * step, hz * step, H)) this.lkT = 0; }
    else this.place(e.x, e.z, H);
    if (o?.face !== false && d > 0.3) this.turnTo(Math.atan2(hx, hz), dt);
    return d < 0.6;
  }
  // lookahead along a heading: the height needed to clear everything ahead + the speed that still lets it climb
  profile(ux, uz, look, H) {
    const g = this.sim.grid, e = this.e, r = this.fr, lim = this.fh + CLR;
    let need = -Infinity, vmax = Infinity;
    for (let s = 0.5; s <= look; s += 0.5) {
      const px = e.x + ux * s, pz = e.z + uz * s;
      const t = Math.max(g.floorAt(px, pz, 1e9), g.floorAt(px - uz * r, pz + ux * r, 1e9), g.floorAt(px + uz * r, pz - ux * r, 1e9)) + lim;
      if (t > need) need = t;
      if (t > H + 0.02) { const v = this.climb * Math.max(0.1, s - r - 0.3) / (t - H); if (v < vmax) vmax = v; }
    }
    return { need, vmax };
  }
  planSky(hx, hz, look, H, sp) {
    const P = this.profile(hx, hz, look, H);
    let best = { hx, hz, need: P.need, vmax: P.vmax, side: 0 }, bc = this.skyCost(P, H, 0, look, sp);
    if (P.need > H + Math.max(3, this.cruise * 1.2) && this.noDetour <= 0) {   // something tall ahead: compare going round
      for (const off of SIDES) {
        const c = Math.cos(off), s = Math.sin(off), ux = hx * c + hz * s, uz = hz * c - hx * s;
        const Q = this.profile(ux, uz, look, H);
        const cost = this.skyCost(Q, H, Math.abs(off), look, sp) + (this.side && Math.sign(off) !== this.side ? 0.5 : 0);
        if (cost < bc) { bc = cost; best = { hx: ux, hz: uz, need: Q.need, vmax: Q.vmax, side: Math.sign(off) }; }
      }
    }
    this.side = best.side;
    return best;
  }
  skyCost(P, H, off, look, sp) { return Math.max(0, P.need - H) / this.climb + off * look / Math.max(1, sp) * 0.9; }
  lowStep(tx, tz, ty, dt, sp, o) {
    const e = this.e, sim = this.sim, g = sim.grid;
    let H = e.y + e.alt;
    this.pathT -= dt;
    if (!this.path || this.pathT <= 0 || !this.goal || Math.hypot(this.goal[0] - tx, this.goal[1] - tz) > 2) {
      this.goal = [tx, tz]; this.pathT = 1.2 + sim.rng() * 0.6;
      this.path = this.flyPath(tx, tz, g.floorAt(e.x, e.z, H - this.fh), ty ?? sim.spawnY(tx, tz));
    }
    let wp = this.path[0];
    while (wp && Math.hypot(wp[0] - e.x, wp[1] - e.z) < 0.7 && this.path.length > 1) { this.path.shift(); wp = this.path[0]; }
    const d = Math.hypot(tx - e.x, tz - e.z), cf = g.floorAt(e.x, e.z, H - this.fh);
    // no headway for a second (a wall the coarse path cut through): skip ahead if the next point is in the
    // clear, else re-plan and glance along the wall for a moment
    const LP = this.lp || (this.lp = { x: e.x, z: e.z, t: 0, wf: 0, side: 1 });
    if (Math.hypot(LP.x - e.x, LP.z - e.z) > 0.35) { LP.x = e.x; LP.z = e.z; LP.t = 0; }
    else if ((LP.t += dt) > 1 && d > 0.6) {
      LP.t = 0;
      if (this.path.length > 1 && this.clearLine([e.x, e.z, cf], this.path[1])) { this.path.shift(); wp = this.path[0]; }
      else { this.pathT = 0; LP.wf = 1.2; LP.side = -LP.side; }
    }
    let wx = (wp ? wp[0] : tx) - e.x, wz = (wp ? wp[1] : tz) - e.z;
    if (LP.wf > 0) { LP.wf -= dt; const a = LP.side * 1.2, c = Math.cos(a), sn = Math.sin(a); [wx, wz] = [wx * c + wz * sn, wz * c - wx * sn]; }
    const wd = Math.hypot(wx, wz);
    const step = Math.min(wd, sp * dt), ux = wd > 1e-4 ? wx / wd : 0, uz = wd > 1e-4 ? wz / wd : 0;
    const nx = e.x + ux * step, nz = e.z + uz * step;
    // height: low over the floor ahead (this storey: stairs yes, through the slab no), under door heads / decks
    const Hn = this.fitLow(nx, nz, g.floorAt(nx, nz, cf + 0.5));
    const vs = (Hn != null && Hn > H ? this.climb : this.desc) * dt;
    if (Hn != null && Math.abs(Hn - H) <= vs + 1e-3 && step > 1e-4) this.place(nx, nz, Hn);
    else {
      if (Hn != null) H = this.vmove(H, clamp(Hn - H, -vs, vs));      // dip under a door head / rise onto a landing first
      if (step > 1e-4) this.hmove(ux * step, uz * step, H); else this.place(e.x, e.z, H);
    }
    if (o?.face !== false && wd > 0.3) this.turnTo(Math.atan2(ux, uz), dt);
    return d < 0.6;
  }
  // nav path for low flight: the walkers' A* over 2 m cells (raw cell centres: their string pulling cuts corners
  // through partly blocked cells), each point nudged clear for the hull, then string-pulled on the fine grid
  flyPath(tx, tz, sy, ty) {
    const e = this.e, nav = this.sim.nav, sm = nav.smooth;
    let raw = null;
    nav.smooth = (p) => p;
    try { raw = nav.find(e.x, e.z, tx, tz, 2500, sy, ty); } finally { nav.smooth = sm; }
    if (!raw || !raw.length) return [[tx, tz, ty]];
    const pts = [];
    for (const p of raw) { const q = this.clearSpot(p[0], p[1], p[2]); if (q) pts.push(q); }
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(last[0] - tx, last[1] - tz) > 0.3) pts.push([tx, tz, ty]);
    const out = []; let a = [e.x, e.z, sy], i = 0;
    while (i < pts.length) {
      let j = Math.min(pts.length - 1, i + 14);
      while (j > i && !this.clearLine(a, pts[j])) j--;
      out.push(pts[j]); a = pts[j]; i = j + 1;
    }
    return out;
  }
  // clear hull height over floor level fy at (x, z), on this storey: from the low-flight height down to just
  // over the floor, then up to ~0.9 m higher, never into the slab / deck above - or null (a wall)
  fitLow(x, z, fy) {
    const g = this.sim.grid, lo = fy + this.fh + 0.1, hi = Math.min(fy + this.lowAlt + 0.9, g.ceilAt(x, z, fy + 0.05) - this.fh - 0.05);
    const H0 = Math.min(fy + this.lowAlt, hi);
    for (let h = H0; h >= lo - 1e-6; h -= 0.2) if (this.free(x, z, h)) return h;
    for (let h = H0 + 0.2; h <= hi + 1e-6; h += 0.2) if (this.free(x, z, h)) return h;
    return null;
  }
  // a hull-clear spot within 0.7 m of (x, z) at low-flight height over floor y, or null
  clearSpot(x, z, y) {
    const g = this.sim.grid;
    for (const r of [0, 0.35, 0.7]) for (let i = 0; i < (r ? 8 : 1); i++) {
      const a = i * Math.PI / 4, px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r, fl = g.floorAt(px, pz, y + 0.5);
      if (Math.abs(fl - y) < 0.7 && this.fitLow(px, pz, fl) != null) return [px, pz, fl];
    }
    return null;
  }
  // can the hull fly straight from p to q low over the floor (floor heights interpolated: stairs, ramps)?
  clearLine(p, q) {
    const g = this.sim.grid, d = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(d / 0.4));
    const py = p[2] ?? q[2] ?? 0, qy = q[2] ?? py;
    for (let k = 1; k < n; k++) {
      const t = k / n, x = p[0] + (q[0] - p[0]) * t, z = p[1] + (q[1] - p[1]) * t, ye = py + (qy - py) * t, fl = g.floorAt(x, z, ye + 0.5);
      if (Math.abs(fl - ye) > 0.7 || this.fitLow(x, z, fl) == null) return false;
    }
    return true;
  }
  // outside point of the open doorway into the building around (x, y, z) that this flyer fits through
  entrance(x, z, y) {
    const sim = this.sim, bid = sim.grid.insideAt(x, z, y, sim.world.buildings);
    if (bid < 0) return null;
    const e = this.e; let best = null, bd = 1e9;
    for (const op of sim.openings(bid)) {
      if (!op.walk || (op.door >= 0 && !sim.doors[op.door].open)) continue;
      if (op.w < this.fr * 2 + 0.15 || op.y1 - op.y0 < this.fh * 2 + 0.4) continue;
      const ox = op.x + op.nx * 2.2, oz = op.z + op.nz * 2.2;
      const dd = Math.hypot(ox - e.x, oz - e.z) + Math.hypot(op.x - x, op.z - z) * 1.5;
      if (dd < bd) { bd = dd; best = { ox, oz, y: op.y0, op }; }
    }
    return best;
  }
  // not flying anywhere this tick: recover from a dip / shove, never sit inside anything
  hover(dt) {
    const e = this.e, H = e.y + e.alt;
    if (!this.free(e.x, e.z, H)) { this.unstick(); return; }
    const covered = this.sim.grid.ceilAt(e.x, e.z, H) < Infinity;
    const lo = covered ? e.y + this.lowAlt : Math.max(this.sim.world.groundAt(e.x, e.z) + this.cruise, this.topUnder(e.x, e.z) + this.fh + CLR);
    if (H < lo - 0.05) this.place(e.x, e.z, this.vmove(H, Math.min(lo - H, this.climb * 0.5 * dt)));
  }
  // stunned flyer: sinks towards the floor under it (never through it)
  sink(dt) {
    const e = this.e, H = e.y + e.alt, lo = e.y + Math.max(1.0, this.fh + 0.35);
    if (!this.free(e.x, e.z, H)) { this.unstick(); return; }
    if (H > lo) this.place(e.x, e.z, this.vmove(H, -Math.min(H - lo, 1.2 * dt)));
  }
  // knockback + dip from hits (collision-checked: a hit never pushes anything into a wall)
  physics(dt) {
    const e = this.e;
    if (this.stagT > 0) this.stagT -= dt;
    if (this.fixed || this.leap || this.latched) { this.kbx = this.kbz = this.dipV = 0; return; }
    if (Math.abs(this.kbx) + Math.abs(this.kbz) > 0.03) {
      const mx = this.kbx * dt, mz = this.kbz * dt;
      if (this.def.flying) this.hmove(mx, mz, e.y + e.alt);
      else { const p = { x: e.x, z: e.z, y: e.y }; this.sim.grid.move(p, mx, mz, Math.min(e.r, 0.9)); e.x = p.x; e.z = p.z; e.y = this.sim.floor(e.x, e.z, p.y); }
      const k = Math.exp(-5 * dt); this.kbx *= k; this.kbz *= k;
    } else this.kbx = this.kbz = 0;
    if (this.def.flying && this.dipV < -0.02) {
      const H = e.y + e.alt, lo = e.y + this.fh + 0.25;
      if (H > lo) this.place(e.x, e.z, this.vmove(H, Math.max(this.dipV * dt, lo - H)));
      this.dipV *= Math.exp(-7 * dt);
    } else this.dipV = 0;
  }

  wander(dt) {
    const e = this.e;
    if (this.fixed) { this.sweep(dt); return; }
    if (this.patrol && this.patrol.length) {
      const p = this.patrol[this.pi % this.patrol.length];
      if (this.moveTo(p[0], p[1], dt, 0.55)) this.pi++;
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0 || !this.goal) {
        // flyers roam the open level around home (never pick a spot down in a tunnel under it)
        const lvl = this.def.flying ? this.sim.spawnY(this.home[0], this.home[1]) : e.y;
        this.goal = this.sim.nav.randomOpenNear(this.home[0], this.home[1], this.def.flying ? 30 : 18, this.sim.rng, lvl); this.wanderT = 6 + this.sim.rng() * 8; this.path = null;
      }
      this.moveTo(this.goal[0], this.goal[1], dt, 0.45, this.def.flying ? null : this.goal[2]);
    }
    e.gaze = e.f + Math.sin(this.sim.t * 0.8 + e.id) * 0.35;
  }
  sweep(dt) {
    const e = this.e, sw = this.def.vision?.sweep;
    this.sweepT += dt;
    const arc = (sw?.arc || 120) * DEG, sp = (sw?.speed || 20) * DEG;
    // sweeps centre on the spawn facing (arkSpawn f) when given, else the current facing
    e.gaze = (this.sweepF ?? e.f) + Math.sin(this.sweepT * sp / (arc / 2 || 1)) * arc / 2;
  }
  // fixed emplacement that lost its target: scan around the last-known bearing
  lostSweep(dt) { const e = this.e; this.sweepT += dt; e.gaze = e.f + Math.sin(this.sweepT * 1.4) * 0.6; }

  // ------------------------------------------------------------ main
  update(dt) {
    const e = this.e, sim = this.sim;
    if (e.st === 'dead') return;
    this.moved = false;
    this.physics(dt);
    if (this.stunT > 0) { this.stunT -= dt; e.tele = 0; if (this.def.flying) this.sink(dt); return; }
    if (this.leap) { this.updateLeap(dt); return; }
    if (this.latched) { this.updateLatch(dt); return; }
    const seen = this.perceive(dt);
    this.cool -= dt;
    const tgt = this.target ? sim.entities.get(this.target) : null;
    e.tgt = this.target || 0;
    if (e.st === 'alert') {
      if (!tgt || (tgt.st !== 'alive' && tgt.st !== 'downed')) { this.target = null; this.seekP = this.holdP = null; e.st = 'search'; return; }
      if (!seen || seen.id !== tgt.id) { this.lostT += dt; if (this.lostT > (this.def.vision?.lose || 6)) { e.st = 'search'; this.goal = this.lastSeen; this.seekP = this.holdP = null; } }
      else this.lastSeen = [tgt.x, tgt.z, tgt.y];
      this.engage(tgt, dt, !!seen && seen.id === tgt.id);
    } else if (e.st === 'search') {
      e.tele = 0;
      if (this.lastSeen) {
        const arrived = this.moveTo(this.lastSeen[0], this.lastSeen[1], dt, 0.8, this.lastSeen[2], { enter: true });
        e.gaze = e.f + Math.sin(sim.t * 1.6 + e.id) * 0.6;
        if (arrived || this.fixed) { this.lostT += dt; if (this.lostT > 5) { e.st = 'idle'; this.lastSeen = null; this.lostT = 0; } }
      } else e.st = 'idle';
    } else {
      e.tele = 0; this.wander(dt);
    }
    if (this.def.flying && !this.moved) this.hover(dt);
  }

  // ------------------------------------------------------------ firing positions
  // the target is out of sight: (re)pick a firing position within the per-ARK + per-tick search budget and go
  seek(t, dt) {
    const sim = this.sim;
    if (this.fixed || t.grace > sim.t) return false;
    this.seekT -= dt;
    const P = this.seekP;
    if (this.seekT <= 0 || (P && Math.hypot(P.tx - t.x, P.tz - t.z) > 3)) {
      if (sim.seekBudget > 0) { sim.seekBudget--; this.seekT = 0.6 + sim.rng() * 0.4; this.seekP = this.findFirePos(t); }
      else this.seekT = 0.05;
    }
    if (!this.seekP) return false;
    this.goSeek(this.seekP, dt);
    return true;
  }
  goSeek(P, dt) {
    if (this.def.flying) return this.fly(P.x, P.z, P.y, dt, 0.95, P.enter ? { enter: true, face: false } : { h: P.h, near: 7, face: false });
    return this.moveTo(P.x, P.z, dt, 0.9, P.y);
  }
  // candidates: lanes out through the target building's open doorways / windows, rings within weapon range;
  // scored by a clear line from the eye to the chest (+ smoke), travel, staying out of melee range
  findFirePos(t) {
    const e = this.e, sim = this.sim, g = sim.grid, def = this.def, atk = def.attack || {}, fly = !!def.flying;
    const ty = t.y + (t.alt || 0) + (t.crouch ? 0.8 : 1.3);
    const R = Math.max(6, Math.min(atk.range || 20, def.vision?.range || 24) * 0.85);
    const minD = def.behavior === 'bastion' ? 7 : fly ? 2.5 : 4;
    const C = [];
    const bid = g.insideAt(t.x, t.z, t.y, sim.world.buildings);
    if (bid >= 0) for (const op of sim.openings(bid)) {
      if (op.door >= 0 && !sim.doors[op.door].open) continue;
      if (ty < op.y0 - 3 || ty > op.y1 + 3) continue;
      let dx = op.x - t.x, dz = op.z - t.z; const L = Math.hypot(dx, dz) || 1; dx /= L; dz /= L;
      for (const k of [1.6, 3.5, 6, 9.5, 14]) { const D = L + k; if (D > R) break; C.push({ x: t.x + dx * D, z: t.z + dz * D, op }); }
    }
    const a0 = sim.rng() * Math.PI * 2;
    for (const r of [4.5, 8, 12, 17, 23, 30]) {
      if (r > R) break; if (r < minD) continue;
      const n = r < 10 ? 8 : 12;
      for (let i = 0; i < n; i++) { const a = a0 + (i + (r > 10 ? 0.5 : 0)) * Math.PI * 2 / n; C.push({ x: t.x + Math.sin(a) * r, z: t.z + Math.cos(a) * r }); }
    }
    const tr = (c) => Math.hypot(c.x - e.x, c.z - e.z) * (fly ? 1 : 1.4);
    for (const c of C) c.pre = tr(c) - (c.op ? 6 : 0);
    C.sort((a, b) => a.pre - b.pre);
    let best = null, bs = -1e9, rays = 0;
    for (const c of C) {
      if (rays >= 40) break;
      const dT = Math.hypot(c.x - t.x, c.z - t.z);
      const base = 100 - tr(c) - Math.abs(dT - R * 0.5) * 0.25 + (c.op ? 6 : 0) - (dT < minD ? 40 : 0);
      if (base <= bs) continue;                                // can't beat the best even with a clear shot
      if (sim.smokeBetween(c.x, c.z, t.x, t.z)) continue;
      if (fly) {
        for (const dh of [0.15, 0.9, 2.0]) {                   // low (through doorways / windows) first, then higher
          const h = ty + dh;
          if (!this.free(c.x, c.z, h)) continue;
          rays++;
          if (g.los(c.x, h, c.z, t.x, ty, t.z)) { const s = base - dh * 1.5; if (s > bs) { bs = s; best = { x: c.x, z: c.z, h, y: g.floorAt(c.x, c.z, h - this.fh), tx: t.x, tz: t.z }; } break; }
        }
      } else {
        const n = sim.nav.node(c.x, c.z, e.y); if (n < 0 || !sim.nav.cost[n]) continue;
        const fy = sim.nav.hgt[n], ey = fy + Math.min(def.height || 1, 2.2) * 0.8;
        rays++;
        if (g.los(c.x, ey, c.z, t.x, ty, t.z)) { bs = base; best = { x: c.x, z: c.z, y: fy, tx: t.x, tz: t.z }; }
      }
    }
    // small ARK: through an open doorway after it rather than a long way round for an angle
    if (this.canEnter && bid >= 0 && bs < 70) {
      const ent = fly ? this.entrance(t.x, t.z, t.y) : true;
      if (ent) {
        const trv = fly ? Math.hypot(ent.ox - e.x, ent.oz - e.z) + Math.hypot(ent.op.x - t.x, ent.op.z - t.z) : Math.hypot(t.x - e.x, t.z - e.z) * 1.6;
        const s = 100 - trv * (fly ? 1 : 1.4) - 6;
        if (!best || s > bs) best = { x: t.x, z: t.z, y: t.y, enter: true, tx: t.x, tz: t.z };
      }
    }
    return best;
  }

  // ------------------------------------------------------------ engagement per behaviour
  engage(t, dt, visible) {
    const e = this.e, def = this.def, sim = this.sim;
    const dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz) || 1e-3, a = Math.atan2(dx, dz);
    const atk = def.attack || {};
    const beh = def.behavior;
    e.gaze = e.f;
    // found an angle: hold it while the target stays put (strafing / backing off would lose the doorway)
    if (visible && this.seekP) { this.holdP = this.seekP; this.seekP = null; }
    if (this.holdP && (!visible && this.lostT > 1 || Math.hypot(this.holdP.tx - t.x, this.holdP.tz - t.z) > 3)) this.holdP = null;
    switch (beh) {
      case 'pop': case 'fireball': {
        this.turnTo(a, dt);
        if (d > (atk.range || 1.6) + 0.4) { this.moveTo(t.x, t.z, dt, 1, t.y); e.tele = 0; this.wind = 0; return; }
        this.wind += dt; e.tele = this.wind / (atk.windup || 1);
        if (beh === 'fireball') {
          if (this.wind >= (atk.windup || 0.8)) { this.flame(t, dt); if (this.wind > (atk.windup || 0.8) + (atk.duration || 3)) { this.wind = 0; this.cool = atk.cooldown || 3; } }
        } else if (this.wind >= (atk.windup || 1.2)) { sim.explode(e.x, e.y + 0.4, e.z, atk.radius || 3.5, atk.dmg || 45, e, 'frag'); sim.killArk(e, null); }
        return;
      }
      case 'tick': {
        this.turnTo(a, dt);
        if (d > 5 || !visible) { this.moveTo(t.x, t.z, dt, 1, t.y); return; }
        if (this.cool <= 0) { if (this.startLeap(t, atk.airTime || 0.5, 0.2)) this.cool = atk.cooldown || 3; else this.moveTo(t.x, t.z, dt, 1, t.y); }
        return;
      }
      case 'leaper': {
        this.turnTo(a, dt);
        if (d < (atk.range || 18) && visible && this.cool <= 0 && this.brokenLegs() < (def.leapDisabledAfter || 2)) {
          this.wind += dt; e.tele = this.wind / (atk.windup || 0.9);
          if (this.wind >= (atk.windup || 0.9)) { this.wind = 0; e.tele = 0; if (this.startLeap(t, atk.airTime || 0.9, 0)) this.cool = atk.cooldown || 4.5; else this.cool = 0.8; }
        } else if (d < 5 && this.cool <= 0 && def.abilities?.[0]) {
          const ab = def.abilities[0]; sim.explode(e.x, e.y + 0.5, e.z, ab.radius || 5, ab.dmg || 20, e, 'shock'); this.cool = ab.cooldown || 6;
        } else if (d > 6) this.moveTo(t.x, t.z, dt, 0.9, t.y);
        return;
      }
      case 'surveyor': {
        // keep away from raiders, scanning beam
        const away = Math.atan2(-dx, -dz);
        this.moveTo(e.x + Math.sin(away) * 8, e.z + Math.cos(away) * 8, dt, 1.2);
        e.gaze = a; e.st = 'alert';
        return;
      }
      case 'snitch': {
        e.gaze = a; this.turnTo(a, dt);
        if (!this.alarmed) {
          this.wind += dt; e.tele = this.wind / 2.5;
          if (this.wind > 2.5) { this.alarmed = true; e.tele = 0; this.callReinforcements(t); }
        } else if (d < 12) this.moveTo(e.x - dx, e.z - dz, dt, 0.8);
        return;
      }
      case 'spotter': {
        e.gaze = a; this.turnTo(a, dt);
        sim.near(e.x, e.z, 90, (o) => { if (o.type === 'ark' && o.def.behavior === 'bombardier' && o.brain) { o.brain.target = t.id; o.brain.lastSeen = [t.x, t.z, t.y]; o.st = 'alert'; o.brain.spotted = sim.t; } });
        if (d < 10) this.moveTo(e.x - dx, e.z - dz, dt, 0.8);
        return;
      }
      case 'bombardier': {
        this.turnTo(a, dt, 60);
        if (this.cool <= 0 && (visible || (this.spotted && sim.t - this.spotted < 3))) { this.mortar(t); this.cool = atk.cooldown || 5; }
        if (d < 12) this.moveTo(e.x - dx, e.z - dz, dt, 0.6);
        return;
      }
      case 'rocketeer': {
        this.turnTo(a, dt);
        const want = 16;
        if (!visible) { if (!this.seek(t, dt)) this.moveTo(t.x, t.z, dt, 0.7, t.y); }
        else if (this.holdP) this.goSeek(this.holdP, dt);
        else if (d > want + 4) this.moveTo(t.x, t.z, dt, 0.7, t.y);
        else if (d < want - 4) this.moveTo(e.x - dx, e.z - dz, dt, 0.6);
        if (visible && this.cool <= 0 && !this.disarmed) {
          this.wind += dt; e.tele = this.wind / (atk.windup || 1);
          if (this.wind >= (atk.windup || 1)) { this.wind = 0; e.tele = 0; this.rockets(t, atk.count || atk.burst || 3); this.cool = atk.cooldown || 4; }
        }
        return;
      }
      case 'sentinel': {
        this.turnTo(a, dt, def.turnRate || 70); e.gaze = e.f;
        if (!visible && !(atk.firesAtLastKnown && this.lostT < atk.firesAtLastKnown)) { this.wind = 0; e.tele = 0; if (this.lostT > 1) this.lostSweep(dt); return; }
        if (this.cool > 0 || this.disarmed) return;
        this.wind += dt; e.tele = this.wind / (atk.windup || 2.2);
        if (this.wind >= (atk.windup || 2.2)) { this.wind = 0; e.tele = 0; this.cool = atk.cooldown || 3.5; this.fire(t, 1, true); }
        return;
      }
      case 'shredder': case 'matriarch': case 'queen': {
        this.turnTo(a, dt);
        if (d > 3) this.moveTo(t.x, t.z, dt, 1, t.y);
        if (d < 4 && this.cool <= 0) { sim.explode(e.x + dx / d * 1.5, e.y + 0.5, e.z + dz / d * 1.5, 3, atk.dmg || 35, e, 'shock'); this.cool = atk.cooldown || 2; }
        else if (visible && this.cool <= 0 && (beh !== 'shredder')) {
          if (sim.rng() < 0.5) this.mortar(t); else this.rockets(t, 4);
          this.cool = atk.cooldown || 3;
        }
        return;
      }
      default: { // drone_gunner, drone_heavy, turret, bastion, generic bullets
        const inside = def.flying && sim.grid.ceilAt(e.x, e.z, e.y + e.alt) < Infinity;
        const want = beh === 'turret' ? 0 : beh === 'bastion' ? 14 : def.flying ? (inside ? 4 : 10) : 8;
        this.turnTo(a, dt, beh === 'bastion' ? (def.gunTurnRate || 120) : null);
        if (!this.fixed) {
          if (!visible) { if (!this.seek(t, dt)) this.moveTo(t.x, t.z, dt, 0.9, t.y, { enter: true }); }
          else if (this.holdP) this.goSeek(this.holdP, dt);
          else if (d > want + 6) this.moveTo(t.x, t.z, dt, 0.9, t.y, { enter: true });
          else if (d < want - 3) this.moveTo(e.x - dx / d * 4, e.z - dz / d * 4, dt, 0.5);
          else if (def.flying) { const s = Math.sin(sim.t * 0.9 + e.id) > 0 ? 1 : -1; this.moveTo(e.x + dz / d * 3 * s, e.z - dx / d * 3 * s, dt, 0.35); }
        } else if (!visible && this.lostT > 1) this.lostSweep(dt);
        if (this.disarmed) return;
        if (this.burst > 0) {
          this.shotT -= dt;
          while (this.shotT <= 0 && this.burst > 0) { this.shotT += 60 / (atk.rpm || 400); this.burst--; if (visible || atk.firesAtLastKnown) this.fire(t, 1); }
          if (this.burst <= 0) this.cool = atk.cooldown || 2;
          return;
        }
        if (visible && this.cool <= 0 && d < (atk.range || 20)) {
          this.wind += dt; e.tele = this.wind / (atk.windup || 0.6);
          if (this.wind >= (atk.windup || 0.6)) { this.wind = 0; e.tele = 0; this.burst = atk.burst || 6; this.shotT = 0; }
        } else if (!visible) { this.wind = Math.max(0, this.wind - dt); e.tele = this.wind / (atk.windup || 0.6); }
      }
    }
  }
  brokenLegs() { return Object.entries(this.e.parts).filter(([k, v]) => k.startsWith('leg') && v <= 0).length; }
  muzzle() { const e = this.e; return { x: e.x + Math.sin(e.f) * (e.r * 0.8), y: e.y + (e.alt || 0) + (this.def.flying ? 0 : (this.def.height || 1) * 0.6), z: e.z + Math.cos(e.f) * (e.r * 0.8) }; }
  fire(t, n = 1, heavy = false) {
    const atk = this.def.attack || {}, o = this.muzzle();
    const tx = t.x + (t.vx || 0) * 0.1, tz = t.z + (t.vz || 0) * 0.1;
    const d = Math.hypot(tx - o.x, tz - o.z) || 1, a = Math.atan2(tx - o.x, tz - o.z);
    const ty = t.y + (t.crouch ? 0.7 : 1.1), dy = (ty - o.y) / d;
    this.sim.shoot(this.e, o, a, dy, { dmg: atk.dmg || 6, range: atk.range || 25, armorPen: atk.armorPen || 0.2, noise: heavy ? 70 : 40 },
      { spread: heavy ? 0.6 : (atk.spread || 3), team: -1, vis: heavy ? 'laser' : 'ark', snd: heavy ? 'sentinal_shot' : null });
  }
  flame(t, dt) {
    const e = this.e, atk = this.def.attack || {};
    this.sim.near(e.x, e.z, 5, (o) => {
      if (o.type !== 'raider' || o.st !== 'alive') return;
      const a = Math.atan2(o.x - e.x, o.z - e.z);
      if (Math.abs(wrapAngle(a - e.f)) < 0.5) this.sim.damage(o, (atk.dmg || 12) * dt, e, { x: o.x, z: o.z });
    });
    if (this.sim.rng() < dt * 2) this.sim.addHazard('fire', e.x + Math.sin(e.f) * 3, e.z + Math.cos(e.f) * 3, 2, 4, e, 8);
    this.sim.emit({ e: 'flame', id: e.id });
  }
  rockets(t, n) {
    const e = this.e, atk = this.def.attack || {}, o = this.muzzle();
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(t.x - o.x, t.z - o.z) + (this.sim.rng() - 0.5) * 0.25, sp = atk.projSpeed || 22;
      this.sim.launch(e, 'rocket', o.x, o.y, o.z, Math.sin(a) * sp, 0, Math.cos(a) * sp, { dmg: atk.dmg || 30, radius: atk.radius || 3, team: -1, g: 0, fuse: 3 });
    }
    this.sim.emit({ e: 'rockets', id: e.id, n });
  }
  mortar(t) {
    const e = this.e, atk = this.def.attack || {};
    const tx = t.x + (this.sim.rng() - 0.5) * 4, tz = t.z + (this.sim.rng() - 0.5) * 4;
    const T = 2.4, g = 12, o = this.muzzle(), ty = this.sim.floor(tx, tz, t.y + 0.5);
    this.sim.launch(e, 'mortar', o.x, o.y + 1, o.z, (tx - o.x) / T, (ty - o.y - 1 + 0.5 * g * T * T) / T, (tz - o.z) / T, { dmg: atk.dmg || 50, radius: atk.radius || 4, team: -1, g });
    this.sim.emit({ e: 'mortar', id: e.id, x: tx, z: tz, t: T });
  }
  // a leap never goes through a wall: the line at body height must be clear first, and the arc stops where it
  // would run into one (lands there)
  startLeap(t, airTime, latchChance) {
    const e = this.e, h = Math.min(this.def.height || 1, 1.6) * 0.6;
    if (!this.sim.grid.los(e.x, e.y + h, e.z, t.x, (t.y ?? e.y) + h, t.z)) return false;
    this.leap = { x0: e.x, z0: e.z, y0: e.y, x1: t.x, z1: t.z, y1: t.y ?? e.y, T: airTime, t: 0, latch: latchChance, tgt: t.id };
    this.sim.emit({ e: 'leap', id: e.id, x: t.x, z: t.z, T: airTime });
    return true;
  }
  updateLeap(dt) {
    const e = this.e, L = this.leap, atk = this.def.attack || {}, g = this.sim.grid;
    L.t += dt; let k = Math.min(1, L.t / L.T);
    const nx = L.x0 + (L.x1 - L.x0) * k, nz = L.z0 + (L.z1 - L.z0) * k;
    if (g.blockedAt(nx, nz, Math.min(e.r, 0.9), e.y + e.alt)) k = 1;            // ran into a wall: drop here
    else { e.x = nx; e.z = nz; e.y = this.sim.floor(e.x, e.z, Math.max(L.y0, L.y1) + 0.5); }
    e.alt = Math.sin(k * Math.PI) * (this.def.behavior === 'leaper' ? 4 : 1.5);
    if (k >= 1) {
      this.leap = null; e.alt = 0; e.y = this.sim.floor(e.x, e.z, e.y + 0.5);
      if (this.def.behavior === 'tick') {
        const t = this.sim.entities.get(L.tgt);
        if (t && t.st === 'alive' && Math.hypot(t.x - e.x, t.z - e.z) < 1.6 && !t.latchedBy) { this.latched = t.id; t.latchedBy = e.id; this.latchT = 0; this.sim.emit({ e: 'latch', id: e.id, tgt: t.id }); }
      } else {
        this.sim.explode(e.x, e.y + 0.3, e.z, atk.radius || 3.5, atk.dmg || 55, e, 'stomp');
        this.exposedUntil = this.sim.t + (atk.exposedAfter || 1.5);
        this.stun(atk.exposedAfter || 1.5);
      }
    }
  }
  updateLatch(dt) {
    const e = this.e, t = this.sim.entities.get(this.latched), atk = this.def.attack || {};
    if (!t || t.st !== 'alive' || t.dodged) { if (t) t.dodged = false; this.unlatch(); return; }
    e.x = t.x + 0.2; e.z = t.z + 0.2; e.y = t.y; e.alt = 1.0;
    this.latchT += dt;
    if (this.latchT > 0.5) { this.latchT = 0; this.sim.damage(t, atk.dmg || 8, e, { bypassShield: true, x: t.x, z: t.z }); t.buffs.slowed = 0.6; }
  }
  callReinforcements(t) {
    const sim = this.sim, e = this.e;
    sim.emit({ e: 'alarm', id: e.id, x: e.x, z: e.z });
    sim.noise(e.x, e.z, 80, e);
    const n = 2 + Math.floor(sim.rng() * 2);
    sim.later(5, () => {
      for (let i = 0; i < n; i++) {
        const a = sim.rng() * Math.PI * 2, x = t.x + Math.cos(a) * 35, z = t.z + Math.sin(a) * 35;
        const cx = Math.max(5, Math.min(sim.world.w - 5, x)), cz = Math.max(5, Math.min(sim.world.h - 5, z));
        const w = sim.spawnArk('wasp', cx, cz, { baseY: sim.spawnY(cx, cz) });
        if (w) { w.st = 'search'; w.brain.lastSeen = [t.x, t.z, t.y]; }
      }
    });
  }
}
