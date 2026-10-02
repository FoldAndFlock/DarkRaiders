// ARK behaviours: perception (vision cone + LOS + detection meter + hearing) and per-archetype
// movement/attacks. Brains run on the host only.
import { ARK, ARK_ALIAS } from '../data/arc.js';
import { wrapAngle } from './sim.js';
import { makeStack } from './items.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const DEG = Math.PI / 180;

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
    this.stunT = 0; this.path = null; this.pathT = 0; this.wanderT = 0; this.goal = null;
    this.sweepT = sim.rng() * 10;
    e.gaze = e.f; e.vis = 0; e.tele = 0;            // replicated: gaze dir, detection, telegraph progress
    this.speedMul = 1; this.disarmed = false; this.blind = false; this.brokenCount = 0;
    this.leap = null; this.latched = null; this.alarmed = false;
    e.alt = this.def.flying ? (this.def.altitude || this.def.height || 2.4) : 0;
  }
  stun(t) { this.stunT = Math.max(this.stunT, t); this.e.tele = 0; this.wind = 0; }
  investigate(x, z, force = false) {
    if (this.e.st === 'alert' && !force) return;
    this.e.st = 'search'; this.lastSeen = [x, z]; this.lostT = 0; this.path = null; this.goal = [x, z];
  }
  onHit(src, dmg) {
    if (this.latched && this.sim.rng() < 0.15) this.unlatch();
    if (src && (src.type === 'raider') && src.st === 'alive') {
      this.target = src.id; this.e.st = 'alert'; this.lastSeen = [src.x, src.z]; this.lostT = 0; this.e.vis = 1;
    }
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
        e.st = 'alert'; this.target = best.id; this.lastSeen = [best.x, best.z]; this.lostT = 0;
      } else if (e.st === 'idle' && e.vis > 0.35) { e.st = 'search'; this.lastSeen = [best.x, best.z]; }
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
  moveTo(x, z, dt, mul = 1) {
    const e = this.e;
    if (this.fixed) return true;
    const dx = x - e.x, dz = z - e.z, d = Math.hypot(dx, dz);
    if (d < 0.6) return true;
    const sp = this.speed() * mul * dt;
    if (this.def.flying) {
      const a = Math.atan2(dx, dz); this.turnTo(a, dt);
      e.x += dx / d * Math.min(d, sp); e.z += dz / d * Math.min(d, sp);
      // rise over obstacles
      const g = this.sim.ground(e.x, e.z), top = this.sim.grid.topAt(e.x, e.z);
      const want = Math.max(this.def.altitude || 2.4, top - g + 1.2);
      e.alt += clamp(want - e.alt, -2 * dt, 4 * dt);
      return false;
    }
    // ground: follow nav path (re-plan periodically)
    this.pathT -= dt;
    if (!this.path || this.pathT <= 0 || !this.goal || Math.hypot(this.goal[0] - x, this.goal[1] - z) > 2) {
      this.goal = [x, z]; this.pathT = 1.5 + this.sim.rng();
      this.path = this.sim.nav.find(e.x, e.z, x, z, 2500) || [[x, z]];
    }
    let wp = this.path[0];
    while (wp && Math.hypot(wp[0] - e.x, wp[1] - e.z) < 1.2 && this.path.length > 1) { this.path.shift(); wp = this.path[0]; }
    if (!wp) return true;
    const wx = wp[0] - e.x, wz = wp[1] - e.z, wd = Math.hypot(wx, wz) || 1;
    this.turnTo(Math.atan2(wx, wz), dt);
    const p = { x: e.x, z: e.z };
    this.sim.grid.move(p, wx / wd * Math.min(wd, sp), wz / wd * Math.min(wd, sp), Math.min(e.r, 0.9));
    e.x = p.x; e.z = p.z; e.y = this.sim.ground(e.x, e.z);
    return false;
  }
  wander(dt) {
    const e = this.e;
    if (this.fixed) { this.sweep(dt); return; }
    if (this.patrol && this.patrol.length) {
      const p = this.patrol[this.pi % this.patrol.length];
      if (this.moveTo(p[0], p[1], dt, 0.55)) this.pi++;
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0 || !this.goal) { this.goal = this.sim.nav.randomOpenNear(this.home[0], this.home[1], this.def.flying ? 30 : 18, this.sim.rng); this.wanderT = 6 + this.sim.rng() * 8; this.path = null; }
      this.moveTo(this.goal[0], this.goal[1], dt, 0.45);
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

  // ------------------------------------------------------------ main
  update(dt) {
    const e = this.e, sim = this.sim;
    if (e.st === 'dead') return;
    if (this.stunT > 0) { this.stunT -= dt; e.tele = 0; if (this.def.flying) e.alt = Math.max(1.2, e.alt - dt); return; }
    if (this.leap) { this.updateLeap(dt); return; }
    if (this.latched) { this.updateLatch(dt); return; }
    const seen = this.perceive(dt);
    this.cool -= dt;
    const tgt = this.target ? sim.entities.get(this.target) : null;
    e.tgt = this.target || 0;
    if (e.st === 'alert') {
      if (!tgt || (tgt.st !== 'alive' && tgt.st !== 'downed')) { this.target = null; e.st = 'search'; return; }
      if (!seen || seen.id !== tgt.id) { this.lostT += dt; if (this.lostT > (this.def.vision?.lose || 6)) { e.st = 'search'; this.goal = this.lastSeen; } }
      else this.lastSeen = [tgt.x, tgt.z];
      this.engage(tgt, dt, !!seen && seen.id === tgt.id);
    } else if (e.st === 'search') {
      e.tele = 0;
      if (this.lastSeen) {
        const arrived = this.moveTo(this.lastSeen[0], this.lastSeen[1], dt, 0.8);
        e.gaze = e.f + Math.sin(sim.t * 1.6 + e.id) * 0.6;
        if (arrived || this.fixed) { this.lostT += dt; if (this.lostT > 5) { e.st = 'idle'; this.lastSeen = null; this.lostT = 0; } }
      } else e.st = 'idle';
    } else {
      e.tele = 0; this.wander(dt);
    }
  }

  // ------------------------------------------------------------ engagement per behaviour
  engage(t, dt, visible) {
    const e = this.e, def = this.def, sim = this.sim;
    const dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz), a = Math.atan2(dx, dz);
    const atk = def.attack || {};
    const beh = def.behavior;
    e.gaze = e.f;
    switch (beh) {
      case 'pop': case 'fireball': {
        this.turnTo(a, dt);
        if (d > (atk.range || 1.6) + 0.4) { this.moveTo(t.x, t.z, dt, 1); e.tele = 0; this.wind = 0; return; }
        this.wind += dt; e.tele = this.wind / (atk.windup || 1);
        if (beh === 'fireball') {
          if (this.wind >= (atk.windup || 0.8)) { this.flame(t, dt); if (this.wind > (atk.windup || 0.8) + (atk.duration || 3)) { this.wind = 0; this.cool = atk.cooldown || 3; } }
        } else if (this.wind >= (atk.windup || 1.2)) { sim.explode(e.x, e.y + 0.4, e.z, atk.radius || 3.5, atk.dmg || 45, e, 'frag'); sim.killArk(e, null); }
        return;
      }
      case 'tick': {
        this.turnTo(a, dt);
        if (d > 5 || !visible) { this.moveTo(t.x, t.z, dt, 1); return; }
        if (this.cool <= 0) { this.startLeap(t, atk.airTime || 0.5, 0.2); this.cool = atk.cooldown || 3; }
        return;
      }
      case 'leaper': {
        this.turnTo(a, dt);
        if (d < (atk.range || 18) && visible && this.cool <= 0 && this.brokenLegs() < (def.leapDisabledAfter || 2)) {
          this.wind += dt; e.tele = this.wind / (atk.windup || 0.9);
          if (this.wind >= (atk.windup || 0.9)) { this.wind = 0; e.tele = 0; this.startLeap(t, atk.airTime || 0.9, 0); this.cool = atk.cooldown || 4.5; }
        } else if (d < 5 && this.cool <= 0 && def.abilities?.[0]) {
          const ab = def.abilities[0]; sim.explode(e.x, e.y + 0.5, e.z, ab.radius || 5, ab.dmg || 20, e, 'shock'); this.cool = ab.cooldown || 6;
        } else if (d > 6) this.moveTo(t.x, t.z, dt, 0.9);
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
        sim.near(e.x, e.z, 90, (o) => { if (o.type === 'ark' && o.def.behavior === 'bombardier' && o.brain) { o.brain.target = t.id; o.brain.lastSeen = [t.x, t.z]; o.st = 'alert'; o.brain.spotted = sim.t; } });
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
        if (d > want + 4 || !visible) this.moveTo(t.x, t.z, dt, 0.7); else if (d < want - 4) this.moveTo(e.x - dx, e.z - dz, dt, 0.6);
        if (visible && this.cool <= 0 && !this.disarmed) {
          this.wind += dt; e.tele = this.wind / (atk.windup || 1);
          if (this.wind >= (atk.windup || 1)) { this.wind = 0; e.tele = 0; this.rockets(t, atk.count || atk.burst || 3); this.cool = atk.cooldown || 4; }
        }
        return;
      }
      case 'sentinel': {
        this.turnTo(a, dt, def.turnRate || 70); e.gaze = e.f;
        if (!visible && !(atk.firesAtLastKnown && this.lostT < atk.firesAtLastKnown)) { this.wind = 0; e.tele = 0; return; }
        if (this.cool > 0 || this.disarmed) return;
        this.wind += dt; e.tele = this.wind / (atk.windup || 2.2);
        if (this.wind >= (atk.windup || 2.2)) { this.wind = 0; e.tele = 0; this.cool = atk.cooldown || 3.5; this.fire(t, 1, true); }
        return;
      }
      case 'shredder': case 'matriarch': case 'queen': {
        this.turnTo(a, dt);
        if (d > 3) this.moveTo(t.x, t.z, dt, 1);
        if (d < 4 && this.cool <= 0) { sim.explode(e.x + dx / d * 1.5, e.y + 0.5, e.z + dz / d * 1.5, 3, atk.dmg || 35, e, 'shock'); this.cool = atk.cooldown || 2; }
        else if (visible && this.cool <= 0 && (beh !== 'shredder')) {
          if (sim.rng() < 0.5) this.mortar(t); else this.rockets(t, 4);
          this.cool = atk.cooldown || 3;
        }
        return;
      }
      default: { // drone_gunner, drone_heavy, turret, bastion, generic bullets
        const want = beh === 'turret' ? 0 : beh === 'bastion' ? 14 : def.flying ? 10 : 8;
        this.turnTo(a, dt, beh === 'bastion' ? (def.gunTurnRate || 120) : null);
        if (!this.fixed) {
          if (d > want + 6 || !visible) this.moveTo(t.x, t.z, dt, 0.9);
          else if (d < want - 3) this.moveTo(e.x - dx / d * 4, e.z - dz / d * 4, dt, 0.5);
          else if (def.flying) { const s = Math.sin(sim.t * 0.9 + e.id) > 0 ? 1 : -1; this.moveTo(e.x + dz / d * 3 * s, e.z - dx / d * 3 * s, dt, 0.35); }
        }
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
    const T = 2.4, g = 12, o = this.muzzle(), ty = this.sim.ground(tx, tz);
    this.sim.launch(e, 'mortar', o.x, o.y + 1, o.z, (tx - o.x) / T, (ty - o.y - 1 + 0.5 * g * T * T) / T, (tz - o.z) / T, { dmg: atk.dmg || 50, radius: atk.radius || 4, team: -1, g });
    this.sim.emit({ e: 'mortar', id: e.id, x: tx, z: tz, t: T });
  }
  startLeap(t, airTime, latchChance) {
    const e = this.e;
    this.leap = { x0: e.x, z0: e.z, x1: t.x, z1: t.z, T: airTime, t: 0, latch: latchChance, tgt: t.id };
    this.sim.emit({ e: 'leap', id: e.id, x: t.x, z: t.z, T: airTime });
  }
  updateLeap(dt) {
    const e = this.e, L = this.leap, atk = this.def.attack || {};
    L.t += dt; const k = Math.min(1, L.t / L.T);
    e.x = L.x0 + (L.x1 - L.x0) * k; e.z = L.z0 + (L.z1 - L.z0) * k; e.y = this.sim.ground(e.x, e.z);
    e.alt = Math.sin(k * Math.PI) * (this.def.behavior === 'leaper' ? 4 : 1.5);
    if (k >= 1) {
      this.leap = null; e.alt = 0;
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
        const w = sim.spawnArk('wasp', Math.max(5, Math.min(sim.world.w - 5, x)), Math.max(5, Math.min(sim.world.h - 5, z)), {});
        if (w) { w.st = 'search'; w.brain.lastSeen = [t.x, t.z]; }
      }
    });
  }
}
