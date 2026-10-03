// Host-authoritative raid simulation. Pure logic: no rendering. The local view and the network
// layer consume `sim.events` (cleared each tick by the caller) and entity state.
import { mulberry, rotPt } from '../engine/world.js';
import { Nav } from './nav.js';
import { ITEMS, makeStack } from './items.js';
import { rollContainer, rollArkDrops, searchTime } from './loot.js';
import { ArkBrain, arkDefFor } from './ark_ai.js';
export { arkDefFor };
import { BotBrain } from './bot_ai.js';
import { extractWorldPoints, inCabin, extractGateClosed, inGateZone } from '../engine/extracts.js';

// Downed: 75 downed health bleeds out in 60 s (skills / augments that add downed health stretch it).
// Extraction: 40 s from the call to the doors opening, 8 s of closing after the lever - together just
// enough for a downed raider at the call point to call it, crawl in and pull the lever.
export const DOWN_DRAIN = 75 / 60, EXTRACT_CALL = 40, EXTRACT_CLOSE = 8;

const HASH = 16;
export const RAIDER_R = 0.35, RAIDER_H = 1.85, CROUCH_H = 1.2;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const ang = (a) => { while (a > Math.PI) a -= Math.PI * 2; while (a < -Math.PI) a += Math.PI * 2; return a; };

export class Sim {
  constructor(world, map, opts = {}) {
    this.world = world; this.grid = world.grid; this.map = map;
    this.nav = new Nav(world);
    this.seed = opts.seed || 1;
    this.rng = mulberry(this.seed * 31 + 7);
    this.t = 0; this.raidLen = opts.raidLen || 1800; this.timeLeft = this.raidLen;
    this.cond = opts.condition || null;       // condition def
    this.condEffects = this.cond?.effects || {};
    this.entities = new Map(); this.nextId = 1;
    this.events = [];
    this.hash = new Map();
    this.noises = [];
    this.smokes = [];
    this.containers = world.containers.map((c, i) => ({ ...c, i, contents: null, opened: false }));
    this.doors = world.doors.map((d, i) => ({ ...d, i, open: !d.locked && !d.closed }));
    this.extracts = world.extracts.map((e, i) => ({ ...e, i, state: 'idle', t: 0, callDur: 0, y: e.y ?? world.groundAt(e.x, e.z) }));
    for (const x of this.extracts) x.pts = extractWorldPoints(x);   // call button / cabin / departure lever in world space
    this.raidEnded = false;
    this.squads = new Map();
    this.warned = {};
    this.timers = [];
    this.mapId = map.id;
    for (const d of this.doors) if (!d.open) this._doorBlock(d, true);
    // condition: fewer extraction points, hatches offline
    const fx = this.condEffects;
    if (fx.extractsMul && fx.extractsMul < 1) {
      const els = this.extracts.filter(x => x.kind !== 'hatch');
      const off = Math.floor(els.length * (1 - fx.extractsMul));
      for (let i = 0; i < off; i++) { const x = els.splice(Math.floor(this.rng() * els.length), 1)[0]; if (x) x.state = 'offline'; }
    }
    if (fx.hatchesDisabled) for (const x of this.extracts) if (x.kind === 'hatch') x.state = 'offline';
    this.nextStrike = 8;
    this.seekBudget = 0; this.pathBudget = 4;
    for (const x of this.extracts) this._gate(x);    // cabin doors shut while idle (after the nav saw them open)
  }

  // ------------------------------------------------------------------ entities
  add(e) { e.id = this.nextId++; this.entities.set(e.id, e); return e; }
  remove(e) { this.entities.delete(e.id); this.emit({ e: 'rm', id: e.id }); }
  emit(ev) { this.events.push(ev); }
  ground(x, z) { return this.world.groundAt(x, z); }
  // standable height under (x, z) for something at height y (multi-level: floors, roofs, tunnels)
  floor(x, z, y) { return this.grid.floorAt(x, z, y); }
  // insertion height: inside a building -> its floor; elsewhere the top walkable surface (ground over tunnels)
  spawnY(x, z) {
    const i = this.grid.idx(x, z), gy = this.world.groundAt(x, z);
    if (i < 0) return gy;
    for (const id of [this.grid.indoor[i], this.grid.indoor2[i]]) if (id >= 0 && !this.world.buildings[id].under) return this.grid.floorAt(x, z, gy);
    return this.grid.floorAt(x, z, 1e9) > gy + 4 ? this.grid.floorAt(x, z, gy) : this.grid.floorAt(x, z, 1e9);
  }

  addRaider(o) {
    const st = o.stats || {};
    const e = this.add({
      type: 'raider', pid: o.pid, name: o.name || 'Raider', bot: !!o.bot, team: o.team ?? 1, outfit: o.outfit || 'scav',
      x: o.x, z: o.z, y: o.y ?? this.spawnY(o.x, o.z), f: o.f || 0, mf: 0, moving: false, sprint: false, crouch: false,
      hp: st.max_hp || 100, maxHp: st.max_hp || 100, sh: 0, shMax: 0, shMit: 0, st: 'alive', downHp: 0,
      wid: null, wk: 'rifle', flash: false, r: RAIDER_R, h: RAIDER_H, hot: [], buffs: {}, regenPause: 0, grace: o.bot ? 0 : this.t + 8,
      stats: st, kills: 0, dmgDealt: 0, temper: o.temper || 'player', lastHit: -99, emote: null, emoteT: 0,
    });
    if (o.shield) this.setShield(e, o.shield);
    return e;
  }
  setShield(e, shieldStack, charge = null) {
    const d = shieldStack ? ITEMS[shieldStack.id]?.shield : null;
    if (!d) { e.sh = e.shMax = e.shMit = 0; e.shCls = null; return; }
    e.shMax = d.capacity * (e.stats?.shield_capacity || 1); e.shMit = d.mitigation; e.shCls = d.cls;
    e.sh = charge ?? e.shMax;
  }

  spawnArk(arch, x, z, opts = {}) {
    const def = arkDefFor(arch);
    if (!def) return null;
    const e = this.add({
      type: 'ark', kind: def.id, arch, def, x, z, y: opts.baseY ?? this.ground(x, z), f: opts.f ?? this.rng() * Math.PI * 2,
      alt: def.flying ? (def.altitude || def.height || 2.4) : 0, hp: def.hp * (opts.hpMul || 1), maxHp: def.hp * (opts.hpMul || 1),
      st: 'idle', r: def.radius || 0.6, h: def.size?.height ?? def.height ?? 1, parts: {}, zones: [], vis: 0, dormant: true,
    });
    for (const z0 of def.hitzones || []) {
      const mx = z0.mirrorX ? [1, -1] : [1], mz = z0.mirrorZ ? [1, -1] : [1];
      let k = 0;
      for (const sx of mx) for (const sz of mz) {
        const zn = { ...z0, x: (z0.x || 0) * sx, z: (z0.z || 0) * sz, key: z0.name + (mx.length * mz.length > 1 ? '_' + (k++) : '') };
        e.zones.push(zn); if (zn.hp) e.parts[zn.key] = zn.hp;
      }
    }
    // perched emplacements (rooftops, towers, decks): y = metres above ground, yAbs = absolute height
    if (opts.yAbs != null) e.y = opts.yAbs; else if (opts.y) e.y += opts.y;
    e.brain = new ArkBrain(this, e, opts);
    return e;
  }

  // ------------------------------------------------------------------ spatial hash
  _rehash() {
    this.hash.clear();
    for (const e of this.entities.values()) {
      if (e.type !== 'raider' && e.type !== 'ark') continue;
      const k = Math.floor(e.x / HASH) + ',' + Math.floor(e.z / HASH);
      let b = this.hash.get(k); if (!b) this.hash.set(k, b = []); b.push(e);
    }
  }
  near(x, z, r, fn) {
    const x0 = Math.floor((x - r) / HASH), x1 = Math.floor((x + r) / HASH), z0 = Math.floor((z - r) / HASH), z1 = Math.floor((z + r) / HASH);
    for (let bz = z0; bz <= z1; bz++) for (let bx = x0; bx <= x1; bx++) {
      const b = this.hash.get(bx + ',' + bz); if (!b) continue;
      for (const e of b) if ((e.x - x) ** 2 + (e.z - z) ** 2 <= r * r) fn(e);
    }
  }
  raiders() { return [...this.entities.values()].filter(e => e.type === 'raider'); }
  players() { return [...this.entities.values()].filter(e => e.type === 'raider' && !e.bot); }

  // ------------------------------------------------------------------ main tick
  tick(dt) {
    this.t += dt; this.timeLeft -= dt;
    this.seekBudget = 6;                       // ARK firing-position searches allowed this tick (whole sim)
    this.pathBudget = 4;                       // flyer low-flight path plans allowed this tick (whole sim)
    this._rehash();
    const players = this.players().filter(p => p.st === 'alive' || p.st === 'downed');
    for (const e of [...this.entities.values()]) {
      if (e.type === 'raider') this._raider(e, dt);
      else if (e.type === 'ark') {
        if (e.brain.hit) e.brain.applyHit();   // this tick's shots / blasts: knockback, dip, stagger, 'ahit'
        // AI LOD: only think near any raider
        let near = false; for (const p of players) if (Math.abs(p.x - e.x) < 80 && Math.abs(p.z - e.z) < 70) { near = true; break; }
        if (!near) for (const b of this.entities.values()) if (b.type === 'raider' && b.bot && b.st === 'alive' && Math.abs(b.x - e.x) < 40 && Math.abs(b.z - e.z) < 40) { near = true; break; }
        e.dormant = !near;
        if (near || e.st === 'alert') e.brain.update(dt);
      } else if (e.type === 'proj') this._proj(e, dt);
      else if (e.type === 'hz') this._hazard(e, dt);
      else if (e.type === 'loot' && e.items.length === 0 && this.t - e.born > 2) this.remove(e);
    }
    this._extracts(dt);
    this._timer();
    this._condition(dt);
    if (this.timers.length) { const due = this.timers.filter(t => t.at <= this.t); this.timers = this.timers.filter(t => t.at > this.t); for (const t of due) t.fn(); }
    this.noises = this.noises.filter(n => this.t - n.t < 0.25);
  }

  _raider(e, dt) {
    // players own their height (client-authoritative, incl. falls); bots follow the floor they walk on
    if (e.bot) e.y = this.floor(e.x, e.z, e.y);
    if (e.emoteT > 0) { e.emoteT -= dt; if (e.emoteT <= 0) e.emote = null; }
    if (e.st === 'alive') {
      // heal/shield over time queue
      for (const h of e.hot) {
        const step = Math.min(h.left, h.rate * dt); h.left -= step;
        if (h.kind === 'hp') e.hp = Math.min(e.maxHp, e.hp + step); else e.sh = Math.min(e.shMax, e.sh + step);
      }
      e.hot = e.hot.filter(h => h.left > 0.01);
      if (e.stats?.shield_regen && this.t - e.lastHit > 6) e.sh = Math.min(e.shMax, e.sh + e.stats.shield_regen * dt);
      if (e.regen && this.t - e.lastHit > e.regen.pauseAfterHit) { e.regenAcc = (e.regenAcc || 0) + dt; if (e.regenAcc >= e.regen.every) { e.regenAcc = 0; e.hp = Math.min(e.maxHp, e.hp + e.regen.amount); } }
      for (const k in e.buffs) { e.buffs[k] -= dt; if (e.buffs[k] <= 0) delete e.buffs[k]; }
      // footstep noise for AI hearing
      if (e.moving && !e.crouch) {
        e.stepAcc = (e.stepAcc || 0) + dt;
        if (e.stepAcc > 0.5) { e.stepAcc = 0; this.noise(e.x, e.z, (e.sprint ? 11 : 6) * (e.stats?.footstep_mul || 1) * (e.stats?.noise_mul || 1), e); }
      }
    } else if (e.st === 'downed') {
      e.downHp -= dt * (e.bot ? 8 : DOWN_DRAIN);   // 75 downed health = 60 s; more downed health lasts longer
      if (e.reviveBy) {
        const r = this.entities.get(e.reviveBy);
        if (!r || r.st !== 'alive' || Math.hypot(r.x - e.x, r.z - e.z) > 2.2 || Math.abs(r.y - e.y) > 1.5) { e.reviveBy = null; e.reviveT = 0; }
        else { e.reviveT += dt * (r.stats?.revive_speed || 1); if (e.reviveT >= 5) this.revive(e, r); }
      }
      if (e.downHp <= 0) this.kill(e, e.lastSrc);
    }
    if (e.bot && e.brain) e.brain.update(dt);
  }

  // ------------------------------------------------------------------ perception helpers
  later(delay, fn) { this.timers.push({ at: this.t + delay, fn }); }
  noise(x, z, r, src = null) { this.noises.push({ x, z, r, src: src?.id, t: this.t, team: src?.team }); }
  inSmoke(x, z) { for (const s of this.smokes) if ((s.x - x) ** 2 + (s.z - z) ** 2 < s.r * s.r) return true; return false; }
  smokeBetween(x0, z0, x1, z1) {
    for (const s of this.smokes) {
      const dx = x1 - x0, dz = z1 - z0, l2 = dx * dx + dz * dz || 1;
      const t = clamp(((s.x - x0) * dx + (s.z - z0) * dz) / l2, 0, 1);
      if ((x0 + dx * t - s.x) ** 2 + (z0 + dz * t - s.z) ** 2 < s.r * s.r * 0.8) return true;
    }
    return false;
  }
  canSee(obs, tgt, eyeY) {
    const ty = tgt.y + (tgt.alt || 0) + (tgt.crouch ? 0.8 : 1.3);
    if (!this.grid.los(obs.x, eyeY, obs.z, tgt.x, ty, tgt.z)) return false;
    if (this.smokeBetween(obs.x, obs.z, tgt.x, tgt.z)) return false;
    return true;
  }

  // ------------------------------------------------------------------ combat
  // resolve a shot (all pellets). o={x,y,z}, a = yaw, dy = vertical slope, w = weapon stats
  shoot(owner, o, a, dy, w, opts = {}) {
    const pellets = Math.max(1, Math.round(w.pellets || 1));
    const spreadDeg = opts.spread ?? 0;
    const hits = [];
    for (let p = 0; p < pellets; p++) {
      const sa = a + ((this.rng() + this.rng() - 1) * spreadDeg * Math.PI / 180) * (pellets > 1 ? 1 : 1);
      const dx = Math.sin(sa), dz = Math.cos(sa);
      const maxD = (w.range || 30) * (w.mode === 'launcher' ? 1.5 : 2.0);
      let bestD = this.grid.ray(o.x, o.z, dx, dz, maxD, o.y, dy);
      let best = null, bestZone = null;
      const cx = o.x + dx * bestD / 2, cz = o.z + dz * bestD / 2;
      this.near(cx, cz, bestD / 2 + 3, (e) => {
        if (e === owner || e.st === 'dead' || e.st === 'out') return;
        if (owner?.type === 'ark' && e.type === 'ark') return;
        if (opts.team != null && e.type === 'raider' && e.team === opts.team) return;
        if (e.type === 'raider' && opts.team != null && owner?.bot === false && !e.bot && e.team === owner.team) return;
        const t = rayCircle(o.x, o.z, dx, dz, e.x, e.z, e.r + (e.type === 'ark' ? 0.15 : 0.05));
        if (t == null || t >= bestD) return;
        const hy = o.y + dy * t, base = e.y + (e.alt || 0) - (e.type === 'ark' && e.alt ? e.h * 0.5 : 0);
        const top = base + (e.type === 'raider' ? (e.crouch || e.st === 'downed' ? (e.st === 'downed' ? 0.6 : CROUCH_H) : RAIDER_H) : e.h + 0.4);
        if (hy < base - 0.3 || hy > top + 0.3) return;
        let zone = null, zt = t;
        if (e.type === 'ark' && e.zones.length) {
          for (const zn of e.zones) {
            if (zn.hp && e.parts[zn.key] <= 0) continue;
            if (zn.requiresBroken && !zn.requiresBroken.every(n => Object.entries(e.parts).some(([k, v]) => k.startsWith(n) && v <= 0))) continue;
            if (zn.exposedWhen === 'landed' && !(e.brain?.exposedUntil > this.t)) continue;
            const [wx, wz] = zoneWorld(e, zn);
            const tz = rayCircle(o.x, o.z, dx, dz, wx, wz, zn.r || 0.3);
            if (tz == null || tz > zt + 0.6) continue;
            if (zn.arc) { // only exposed toward one side: `dir` degrees from the ARK's forward
              let ex, ez;
              if (zn.dir != null) { const da = e.f + zn.dir * Math.PI / 180; ex = Math.sin(da); ez = Math.cos(da); }
              else { const zx = wx - e.x, zz = wz - e.z, zl = Math.hypot(zx, zz) || 1; ex = zx / zl; ez = zz / zl; }
              if (-(dx * ex + dz * ez) < Math.cos((zn.arc / 2) * Math.PI / 180)) continue;
            }
            if (!zone || tz < zt) { zone = zn; zt = Math.min(zt, tz); }
          }
        }
        bestD = zone ? Math.min(t, zt) : t; best = e; bestZone = zone;
      });
      const hx = o.x + dx * bestD, hz = o.z + dz * bestD, hy = o.y + dy * bestD;
      let res = 'w';
      if (best) {
        let dmg = (w.dmg || 10) * (opts.dmgMul || 1);
        if (bestD > (w.range || 30)) dmg *= Math.max(0.3, 1 - (bestD - w.range) / (w.range * 1.2));
        res = this.damage(best, dmg, owner, { zone: bestZone, armorPen: w.armorPen || 0, x: hx, z: hz, dirX: dx, dirZ: dz, weapon: opts.weaponId, arkMul: opts.arkMul });
      }
      hits.push({ h: [+hx.toFixed(2), +hy.toFixed(2), +hz.toFixed(2)], r: res, s: best ? 0 : this.grid.surfAt(hx - dx * 0.3, hz - dz * 0.3) });
    }
    const ev = { e: 'shot', s: owner?.id, o: [+o.x.toFixed(2), +o.y.toFixed(2), +o.z.toFixed(2)], hits, k: opts.vis || 'rifle', snd: opts.snd };
    this.emit(ev);
    this.noise(o.x, o.z, (w.noise || 35) * (owner?.stats?.noise_mul || 1), owner);
    return hits;
  }

  melee(e, a, mul = 1, oneHitDrones = false) {
    let best = null, bd = 2.4;
    this.near(e.x, e.z, 2.6, (t) => {
      if (t === e || t.st === 'dead' || t.st === 'out' || (t.type === 'raider' && t.team === e.team)) return;
      if (Math.abs((t.y + (t.alt || 0)) - e.y) > 2) return;
      const d = Math.hypot(t.x - e.x, t.z - e.z) - (t.r || 0.35);
      if (d > bd) return;
      if (Math.abs(ang(Math.atan2(t.x - e.x, t.z - e.z) - a)) > 1.1) return;
      bd = d; best = t;
    });
    this.noise(e.x, e.z, 7, e);
    this.emit({ e: 'melee', id: e.id, hit: !!best });
    if (!best) return;
    const small = best.type === 'ark' && (best.def.hp || 0) <= 200 && (best.def.flying || ['tick', 'pop', 'turret', 'snitch', 'spotter'].includes(best.def.behavior));
    if (small && oneHitDrones) { this.damage(best, 99999, e, { x: best.x, z: best.z }); return; }
    if (best.type === 'ark' && best.brain) best.brain.stun(0.4);
    if (best.latchedBy) { const tk = this.entities.get(best.latchedBy); tk?.brain?.unlatch(); }
    this.damage(best, 28 * mul * (small ? 1.5 : 1), e, { x: best.x, z: best.z, armorPen: 0.3, dirX: Math.sin(a), dirZ: Math.cos(a) });
  }

  // returns result code for the hit marker: 'a' ark, 'aw' weak point, 'aa' armour, 'p' raider, 's' shield, 'k' kill
  damage(e, dmg, src, o = {}) {
    if (e.st === 'dead' || e.st === 'out') return 'w';
    let res = 'p';
    if (e.type === 'ark') {
      res = 'a';
      let mul = o.zone?.mul ?? 1, armor = o.zone?.armor ?? (e.def.armor || 0);
      if (o.zone && (o.zone.mul || 1) > 1.2) res = 'aw';
      if (armor > 0.3) res = 'aa';
      dmg = dmg * mul * (1 - armor * (1 - (o.armorPen || 0))) * (o.arkMul || src?.stats?.arc_damage || 1);
      if (o.explosive && e.def.explosiveMul) dmg *= e.def.explosiveMul;
      if (o.zone?.hp && e.parts[o.zone.key] > 0) {
        e.parts[o.zone.key] -= dmg;
        if (e.parts[o.zone.key] <= 0) { this.emit({ e: 'part', id: e.id, zone: o.zone.key, x: o.x, z: o.z }); e.brain.partBroken(o.zone); }
      }
      e.hp -= dmg;
      e.brain.onHit(src, dmg, o);
      if (src) src.dmgDealt = (src.dmgDealt || 0) + dmg;
      if (e.hp <= 0) { this.killArk(e, src, o.weapon || (o.explosive ? 'grenade' : null)); res = 'k'; }
    } else if (e.type === 'raider') {
      if (e.buffs?.invuln) return 'w';
      dmg *= 1 - (e.stats?.damage_reduction || 0);
      if (o.explosive) dmg *= 1 - (e.stats?.explosive_resist || 0);
      e.lastHit = this.t; e.lastSrc = src?.id;
      if (e.st === 'downed') { e.downHp -= dmg; if (e.downHp <= 0) this.kill(e, src?.id); return 'p'; }
      if (e.sh > 0 && !o.bypassShield) {
        const absorb = Math.min(e.sh, dmg * e.shMit);
        e.sh -= absorb; dmg -= absorb; res = 's';
        if (e.sh <= 0.01) { e.sh = 0; this.emit({ e: 'shieldbreak', id: e.id }); }
      }
      e.hp -= dmg;
      this.emit({ e: 'hurt', id: e.id, d: Math.round(dmg), src: src?.id, x: o.x, z: o.z });
      if (e.bot && e.brain) e.brain.onHit(src, dmg);
      if (e.hp <= 0) { this.down(e, src); res = 'k'; }
    }
    return res;
  }
  down(e, src) {
    if (e.bot) { this.kill(e, src?.id); return; }
    e.hp = 0; e.st = 'downed'; e.downHp = e.stats?.downed_hp || 75; e.reviveT = 0; e.hot = [];
    this.emit({ e: 'downed', id: e.id, src: src?.id });
  }
  revive(e, by) {
    e.st = 'alive'; e.hp = Math.max(25, e.maxHp * 0.3); e.reviveBy = null; e.reviveT = 0;
    this.emit({ e: 'revived', id: e.id, by: by?.id });
  }
  kill(e, srcId) {
    if (e.st === 'dead') return;
    e.st = 'dead'; e.hp = 0;
    const src = this.entities.get(srcId);
    if (src && src.type === 'raider') src.kills++;
    this.emit({ e: 'killed', id: e.id, src: srcId, name: e.name, by: src?.name || src?.def?.name || null });
    if (e.bot) {
      // bots drop their kit as a bag
      const items = e.brain?.dropItems() || [];
      this.dropLoot(e.x, e.z, items, 'raider', null, e.y);
      this.later(20, () => this.entities.has(e.id) && this.remove(e));
    }
  }
  killArk(e, src, weapon = null) {
    if (e.st === 'dead') return;
    e.st = 'dead';
    if (src) src.kills = (src.kills || 0) + 1;
    this.emit({ e: 'arkdown', id: e.id, kind: e.kind, x: e.x, z: e.z, y: e.y + (e.alt || 0), src: src?.id, w: weapon, xp: e.def.xp || 20, big: (e.def.hp || 100) > 600 });
    const items = rollArkDrops(e.def.loot, this.rng, this.condEffects.lootMul || 1);
    this.dropLoot(e.x, e.z, items, 'ark', e.kind, e.y);
    if (e.def.explodeOnDeath || (e.def.behavior === 'pop' && !e.def.noDeathBlast && e.kind !== 'komet')) this.explode(e.x, e.y + 0.5, e.z, e.def.attack?.radius || 3.5, e.def.attack?.dmg || 40, null, 'frag');
    if ((e.def.hp || 0) >= 300 && !e.def.flying) {
      // big husks stay as salvageable containers
      const c = { kind: 'arc_husk', x: e.x, z: e.z, y: e.y, rot: e.f, tier: (e.def.hp > 1500 ? 3 : 2), i: this.containers.length, contents: null, opened: false, dynamic: true, label: e.def.name + ' Husk' };
      this.containers.push(c); this.emit({ e: 'container', c: { kind: c.kind, x: c.x, z: c.z, y: c.y, rot: c.rot, tier: c.tier, i: c.i, dynamic: true, label: c.label } });
    }
    this.remove(e);
  }
  dropLoot(x, z, items, kind = 'bag', label = null, y = null) {
    if (!items.length) return null;
    const l = this.add({ type: 'loot', kind, x, z, y: y == null ? this.ground(x, z) : this.floor(x, z, y + 0.3), items, born: this.t, label });
    this.emit({ e: 'loot', id: l.id, x, z, y: l.y, kind, label, n: items.length });
    return l;
  }
  explode(x, y, z, radius, dmg, src, kind = 'frag', weapon = null) {
    this.emit({ e: 'boom', x, y, z, r: radius, k: kind });
    this.noise(x, z, 60, src);
    this._rehash();
    this.near(x, z, radius + 1.5, (e) => {
      if (e.st === 'dead') return;
      const ey = e.y + (e.alt || 0) + 0.8, d = Math.hypot(e.x - x, e.z - z, (ey - y) * 0.5);
      if (d > radius + e.r) return;
      if (!this.grid.los(x, y + 0.3, z, e.x, ey, e.z)) return;
      const f = 1 - clamp((d - e.r) / radius, 0, 1) * 0.7;
      const r = (src?.stats?.grenade_radius || 1);
      this.damage(e, dmg * f * (r > 1 ? 1 : 1), src, { explosive: true, armorPen: 0.6, x: e.x, z: e.z, weapon, bx: x, bz: z });
    });
  }

  // ------------------------------------------------------------------ throwables
  throwItem(owner, itemId, tx, tz, opts = {}) {
    const d = ITEMS[itemId]?.throw; if (!d) return null;
    const ox = owner.x + Math.sin(owner.f) * 0.4, oz = owner.z + Math.cos(owner.f) * 0.4, oy = owner.y + 1.5;
    let dx = tx - ox, dz = tz - oz; const dist = Math.min(22, Math.hypot(dx, dz)) || 0.1;
    const a = Math.atan2(dx, dz); dx = Math.sin(a); dz = Math.cos(a);
    const isMine = d.kind?.startsWith('mine') || d.kind === 'barricade';
    const T = isMine ? 0.35 : 0.55 + dist * 0.035;
    const vh = (isMine ? Math.min(dist, 3) : dist) / T, vy = 9.8 * T / 2 + ((this.floor(tx, tz, owner.y + 1) - oy) / T);
    const p = this.add({ type: 'proj', kind: 'throw', item: itemId, td: d, owner: owner.id, team: owner.team, x: ox, y: oy, z: oz,
      vx: dx * vh, vy, vz: dz * vh, fuse: d.fuse ?? 2.5, armed: false, settled: false, age: 0, g: 9.8 });
    this.emit({ e: 'throw', id: p.id, by: owner.id, item: itemId });
    return p;
  }
  launch(owner, kind, x, y, z, vx, vy, vz, opts = {}) {
    return this.add({ type: 'proj', kind, owner: owner?.id, team: opts.team ?? owner?.team, x, y, z, vx, vy, vz, age: 0, g: opts.g ?? 0,
      dmg: opts.dmg || 40, radius: opts.radius || 3, fuse: opts.fuse ?? 6, homing: opts.homing || null, td: opts.td || null, item: opts.item || null });
  }
  _proj(p, dt) {
    p.age += dt;
    const owner = this.entities.get(p.owner);
    if (p.homing) {
      const t = this.entities.get(p.homing);
      if (t && t.st !== 'dead') { const a = Math.atan2(t.x - p.x, t.z - p.z), sp = Math.hypot(p.vx, p.vz); const cur = Math.atan2(p.vx, p.vz); const na = cur + clamp(ang(a - cur), -2.5 * dt, 2.5 * dt); p.vx = Math.sin(na) * sp; p.vz = Math.cos(na) * sp; }
    }
    if (!p.settled) {
      p.vy -= p.g * dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      const ci = this.grid.idx(nx, nz);
      if (ci < 0) { this.remove(p); return; }
      if (this.grid.solidAtI(ci, ny)) {
        const impact = p.td?.kind === 'impact' || p.td?.kind === 'sticky' || p.kind === 'rocket' || p.kind === 'mortar';
        const fl = this.grid.floorAt(nx, nz, p.y);
        if (impact) { p.x = nx; p.z = nz; p.y = Math.max(fl, Math.min(ny, p.y)); this._detonate(p, owner); return; }
        // bounce: a wall at our height reflects horizontally, a ceiling knocks it down, the floor stops it
        if (this.grid.solidAtI(ci, p.y + 0.05)) { p.vx *= -0.35; p.vz *= -0.35; }
        else if (ny > p.y) { p.vy = -Math.abs(p.vy) * 0.3; }
        else { p.x = nx; p.z = nz; p.y = fl; p.vy = Math.abs(p.vy) * 0.25; p.vx *= 0.5; p.vz *= 0.5; if (Math.hypot(p.vx, p.vz) < 0.6) { p.settled = true; p.vx = p.vz = 0; } }
        if (!p.bounced) { p.bounced = true; this.emit({ e: 'bounce', x: p.x, z: p.z }); }
      } else { p.x = nx; p.y = ny; p.z = nz; }
      // direct hit on ARK for rockets/impact
      if (p.kind === 'rocket' || p.td?.kind === 'impact') {
        let hit = null; this.near(p.x, p.z, 2, (e) => { if (e.id !== p.owner && e.st !== 'dead' && (e.team !== p.team || e.type === 'ark') && Math.hypot(e.x - p.x, e.z - p.z) < e.r + 0.3 && Math.abs(p.y - (e.y + (e.alt || 0) + 0.8)) < 1.5) hit = e; });
        if (hit) { this._detonate(p, owner); return; }
      }
    }
    const k = p.td?.kind;
    if (k && k.startsWith('mine')) {
      if (p.settled && !p.armed && p.age > 1.5) { p.armed = true; this.emit({ e: 'armed', id: p.id }); }
      if (p.armed) { let trig = false; this.near(p.x, p.z, p.td.trigger || 2.5, (e) => { if (e.type === 'ark' || (e.type === 'raider' && e.team !== p.team)) trig = true; }); if (trig && !p.trigT) { p.trigT = p.td.fuse || 0.8; this.emit({ e: 'beep', x: p.x, z: p.z }); } }
      if (p.trigT) { p.trigT -= dt; if (p.trigT <= 0) this._detonate(p, owner); }
      return;
    }
    if (k === 'trigger') return; // detonated remotely
    if (p.fuse != null && p.age >= p.fuse && (p.settled || p.kind !== 'throw' || p.age > p.fuse + 2)) this._detonate(p, owner);
    if (p.age > 30) this.remove(p);
  }
  _detonate(p, owner) {
    const d = p.td || {}, k = d.kind || p.kind;
    const r = (d.radius || p.radius || 3) * (owner?.stats?.grenade_radius || 1), dmg = d.dmg ?? p.dmg ?? 40;
    switch (k) {
      case 'smoke': this.addHazard('smoke', p.x, p.z, r, d.dur || 18, owner, 0, p.y); this.emit({ e: 'pop', x: p.x, z: p.z, k }); break;
      case 'fire': this.addHazard('fire', p.x, p.z, r, d.dur || 8, owner, d.dmg || 12, p.y).item = p.item; this.explode(p.x, p.y, p.z, r * 0.5, dmg * 0.4, owner, 'fire', p.item); break;
      case 'gas': this.addHazard('gas', p.x, p.z, r, d.dur || 12, owner, d.dmg || 6, p.y).item = p.item; this.emit({ e: 'pop', x: p.x, z: p.z, k }); break;
      case 'lure': case 'noise': this.addHazard('lure', p.x, p.z, 30, d.dur || 12, owner, 0, p.y); this.emit({ e: 'pop', x: p.x, z: p.z, k }); break;
      case 'stun': case 'mine_jolt': this.emit({ e: 'boom', x: p.x, y: p.y, z: p.z, r, k: 'stun' }); this.near(p.x, p.z, r, (e) => { if (e.type === 'ark') e.brain.stun(d.dur || 4); else if (e.team !== p.team) e.buffs.stunned = d.dur || 2; }); break;
      case 'tagging': this.near(p.x, p.z, r * 2, (e) => { if (e.type === 'ark' || e.team !== p.team) e.tagged = this.t + (d.dur || 15); }); this.emit({ e: 'pop', x: p.x, z: p.z, k }); break;
      case 'flare': this.addHazard('flare', p.x, p.z, 12, d.dur || 40, owner, 0, p.y); break;
      case 'barricade': this.addHazard('barricade', p.x, p.z, 1.2, d.dur || 60, owner, 0, p.y); break;
      case 'wolfpack': {
        for (let i = 0; i < 5; i++) { let tgt = null, bd = 30; this.near(p.x, p.z, 30, (e) => { if (e.type === 'ark' && e.st !== 'dead') { const dd = Math.hypot(e.x - p.x, e.z - p.z); if (dd < bd) { bd = dd; tgt = e; } } });
          const a = this.rng() * Math.PI * 2; this.launch(owner, 'rocket', p.x, p.y + 1, p.z, Math.sin(a) * 10, 6, Math.cos(a) * 10, { dmg: (d.dmg || 60) / 2, radius: 2.5, g: 4, homing: tgt?.id, team: p.team }); }
        this.emit({ e: 'pop', x: p.x, z: p.z, k }); break;
      }
      default: this.explode(p.x, p.y, p.z, r, dmg, owner, k === 'rocket' || k === 'mortar' ? 'rocket' : 'frag', p.item);
    }
    this.remove(p);
  }
  addHazard(kind, x, z, r, dur, owner, dps = 0, y = null) {
    const h = this.add({ type: 'hz', kind, x, z, y: this.floor(x, z, (y ?? owner?.y ?? this.ground(x, z)) + 0.3), r, dur, age: 0, owner: owner?.id, team: owner?.team, dps });
    if (kind === 'smoke') this.smokes.push(h);
    if (kind === 'barricade' && h.y <= this.grid.floorAt(x, z, -1e9) + 0.5) this.world.setTop(x - 1, z - 0.3, x + 1, z + 0.3, h.y + 1.3);
    return h;
  }
  _hazard(h, dt) {
    h.age += dt;
    if (h.kind === 'fire' || h.kind === 'gas') {
      this.near(h.x, h.z, h.r, (e) => { if (Math.abs((e.y || 0) - h.y) > 2.6) return; if (e.st === 'alive' || e.type === 'ark') { if (e.type === 'ark' && h.kind === 'gas') return; this.damage(e, h.dps * dt, this.entities.get(h.owner), { bypassShield: h.kind === 'gas', x: e.x, z: e.z, weapon: h.item || null }); if (h.kind === 'gas' && e.type === 'raider') e.buffs.gassed = 1; } });
    }
    if (h.kind === 'lure') this.noise(h.x, h.z, 45, { id: h.owner, team: h.team });
    if (h.age >= h.dur) {
      if (h.kind === 'smoke') this.smokes = this.smokes.filter(s => s !== h);
      if (h.kind === 'barricade') this.world.setTop(h.x - 1, h.z - 0.3, h.x + 1, h.z + 0.3, h.y);
      this.remove(h);
    }
  }

  // ------------------------------------------------------------------ interaction
  containerContents(c, by) {
    if (!c.contents) {
      const r = mulberry(this.seed * 7919 + c.i * 104729);
      const fx = this.condEffects;
      c.contents = rollContainer(c.kind, c.tier || 1, r, { map: this.mapId, lootMul: fx.lootMul, rareMul: fx.rareMul, extra: (by?.stats?.extra_loot_chance || 0) > r() ? 1 : 0 });
    }
    return c.contents;
  }
  openContainer(c, by) {
    const items = this.containerContents(c, by);
    if (!c.opened) { c.opened = true; this.emit({ e: 'opened', i: c.i, by: by?.id }); this.noise(c.x, c.z, 6, by); }
    return items;
  }
  takeFrom(list, uid, qty = null) {
    const i = list.findIndex(s => s.uid === uid); if (i < 0) return null;
    const s = list[i];
    if (qty == null || qty >= s.qty) { list.splice(i, 1); return s; }
    s.qty -= qty; return { ...s, qty, uid: s.uid + 'x' + (this.t * 1000 | 0) };
  }
  searchTimeFor(kind, by) { return searchTime(kind) / (by?.stats?.loot_speed || 1); }

  toggleDoor(d, by, hasKey = false) {
    if (d.locked && !hasKey) { this.emit({ e: 'locked', i: d.i, by: by?.id }); return false; }
    if (d.locked) { d.locked = null; this.emit({ e: 'unlocked', i: d.i, by: by?.id }); }
    d.open = !d.open; this._doorBlock(d, !d.open);
    this.emit({ e: 'door', i: d.i, open: d.open });
    this.noise(d.x, d.z, 8, by);
    return true;
  }
  _doorBlock(d, closed) { this.world.setDoor(d.blk, closed); }

  // ---- extraction flow: idle -> called (40 s) -> open (doors, auto-departs after 90 s) -> closing (8 s,
  // after a raider in the cabin pulls the departure lever or the 90 s ran out) -> everyone inside the cabin
  // extracts -> gone (cooldown 75 s -> idle; a metro station closes for the rest of the raid). Doggy Door (hatch):
  // a key opens it for 15 s, anyone stepping onto it extracts, one open hatch per map.
  callExtract(x, by) {
    if (x.state !== 'idle' || x.kind === 'hatch' || this.raidEnded || this.timeLeft <= 0) return false;
    if (by && !this._atPoint(by, x, x.pts.call, (x.pts.callR || 1.8) + 1.2)) return false;
    const T = x.callTime || EXTRACT_CALL;
    x.state = 'called'; x.t = x.callDur = T;
    this.emit({ e: 'xcall', i: x.i, by: by?.id, t: T });
    // elevators + metro blare a zone-wide alarm; the airshaft dropship is only heard closer by
    const loud = x.kind !== 'airshaft', r = loud ? 75 : 45;
    this.noise(x.x, x.z, r, by);
    this.near(x.x, x.z, loud ? 70 : 40, (e) => { if (e.type === 'ark') e.brain.investigate(x.x, x.z, true); });
    return true;
  }
  departExtract(x, by) {
    if (x.state !== 'open' || x.kind === 'hatch') return false;
    if (by && !inCabin(x, by.x, by.y, by.z)) return false;
    x.state = 'closing'; x.t = EXTRACT_CLOSE;
    this.emit({ e: 'xclose', i: x.i, by: by?.id, t: EXTRACT_CLOSE });
    this.noise(x.x, x.z, 25, by);
    return true;
  }
  openHatch(x, by) {
    if (x.kind !== 'hatch' || x.state !== 'idle') return false;
    if (by && !this._atPoint(by, x, x.pts.call, (x.pts.callR || 2.4) + 1.0)) return false;
    if (this.extracts.some(h => h.kind === 'hatch' && h.state === 'open')) { this.emit({ e: 'hatchbusy', i: x.i, by: by?.id }); return false; }
    x.state = 'open'; x.t = 15;
    this.emit({ e: 'xopen', i: x.i, by: by?.id, t: 15 });
    return true;
  }
  _atPoint(e, x, p, r) { return Math.hypot(e.x - p[0], e.z - p[1]) <= r && Math.abs((e.y ?? x.y) - x.y) < 2.2; }
  // raiders (alive or downed - you can crawl in) inside an extract's cabin
  cabinRaiders(x, downed = true) {
    const out = [];
    for (const e of this.entities.values()) if (e.type === 'raider' && (e.st === 'alive' || (downed && e.st === 'downed')) && inCabin(x, e.x, e.y, e.z)) out.push(e);
    return out;
  }
  // any public extract still on its way / boarding / departing (keeps the raid in overtime)
  extractInProgress() { return this.extracts.some(x => x.kind !== 'hatch' && (x.state === 'called' || x.state === 'open' || x.state === 'closing')); }
  _extracts(dt) {
    for (const x of this.extracts) {
      this._gate(x);
      if (x.state === 'called') { x.t -= dt; if (x.t <= 0) { x.state = 'open'; x.t = 90; this.emit({ e: 'xopen', i: x.i, t: 90 }); } }
      else if (x.state === 'open') {
        x.t -= dt;
        if (x.kind === 'hatch') {
          for (const e of this.cabinRaiders(x, false)) this.extractRaider(e, x);
          if (x.t <= 0) { x.state = 'idle'; x.t = 0; this.emit({ e: 'xidle', i: x.i }); }
        } else if (x.t <= 0) { x.state = 'closing'; x.t = EXTRACT_CLOSE; this.emit({ e: 'xclose', i: x.i, t: EXTRACT_CLOSE, auto: true }); }
      } else if (x.state === 'closing') {
        x.t -= dt;
        if (x.t <= 0) {
          const who = this.cabinRaiders(x);
          for (const e of who) this.extractRaider(e, x);
          x.state = 'gone'; x.t = x.kind === 'metro' ? 9 : 75;
          this.emit({ e: 'xgone', i: x.i, n: who.length, t: x.t });
        }
      } else if (x.state === 'gone') {
        x.t -= dt;
        if (x.t <= 0) {
          if (x.kind === 'metro') { x.state = 'offline'; x.used = true; x.t = 0; this.emit({ e: 'xoffline', i: x.i, why: 'used' }); }
          else { x.state = 'idle'; x.t = 0; this.emit({ e: 'xidle', i: x.i }); }
        }
      }
    }
  }
  // cabin doors / platform gates follow the state (solid while shut); a shutting gate puts bots + walking ARK
  // caught in the sealed space back out at the entry (players: their own peer does it, View.updExtracts; flyers
  // free themselves). During closing whoever is already in the cabin stays and extracts.
  _gate(x) {
    if (!x.gates?.length) return;
    const closed = extractGateClosed(x.state, x.t, x.kind);
    this.world.setExtractGate(x, closed);
    if (!closed || x.state === 'open') return;        // (the first instant of open: doors still parting, nobody is put out)
    const keep = x.state === 'closing', P = x.pts;
    this.near(x.x, x.z, x.kind === 'metro' ? 24 : 8, (e) => {
      if (e.st === 'dead' || e.st === 'out' || (e.type === 'raider' && !e.bot) || (e.type === 'ark' && (e.def.flying || e.brain?.fixed))) return;
      if (!inGateZone(x, e.x, e.y, e.z) || (keep && e.type === 'raider' && inCabin(x, e.x, e.y, e.z))) return;
      e.x = P.entry[0]; e.z = P.entry[1]; e.y = this.floor(e.x, e.z, (P.cabin?.y ?? x.y) + 0.6);
      if (e.brain) e.brain.path = null;
    });
  }
  _condition(dt) {
    const fx = this.condEffects;
    if (fx.lightning) {
      this.nextStrike -= dt;
      if (this.nextStrike <= 0) {
        const L = fx.lightning; this.nextStrike = L.interval[0] + this.rng() * (L.interval[1] - L.interval[0]);
        const ps = this.players().filter(p => p.st === 'alive');
        if (ps.length) {
          const p = ps[Math.floor(this.rng() * ps.length)], a = this.rng() * Math.PI * 2, d = 4 + this.rng() * 22;
          const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
          this.emit({ e: 'strikeWarn', x, z, r: L.radius, t: L.telegraph });
          this.later(L.telegraph, () => {
            this.emit({ e: 'strike', x, z, r: L.radius });
            this.near(x, z, L.radius, (e) => {
              if (e.type === 'ark') { if (L.killsSmallArk && (e.def.hp || 0) <= 200) this.damage(e, 9999, null, {}); else e.brain?.stun(L.arkStun || 4); }
              else if (e.type === 'raider' && e.st === 'alive') { this.damage(e, L.dmg * (1 - Math.hypot(e.x - x, e.z - z) / L.radius * 0.5), null, { x: e.x, z: e.z, explosive: true }); e.buffs.stunned = L.stun || 1.5; }
            });
            this.noise(x, z, 60, null);
          });
        }
      }
    }
    if (fx.coldDamage) {
      const C = fx.coldDamage;
      for (const p of this.players()) {
        if (p.st !== 'alive') continue;
        const indoor = C.indoorSafe && this.grid.insideAt(p.x, p.z, p.y, this.world.buildings) >= 0;
        p.coldT = indoor ? Math.max(0, (p.coldT || 0) - dt * 3) : (p.coldT || 0) + dt;
        p.cold = p.coldT > C.delay;
        if (p.cold && !p.buffs?.warm) this.damage(p, C.dps * dt, null, { bypassShield: true, x: p.x, z: p.z });
      }
    }
  }
  extractRaider(e, x) {
    if (e.st !== 'alive' && e.st !== 'downed') return;
    e.st = 'out'; e.extractedAt = this.t;
    this.emit({ e: 'extracted', id: e.id, x: x?.i ?? -1, name: e.name });
    if (e.bot) this.remove(e);
  }
  _timer() {
    const tl = this.timeLeft;
    for (const [mark, msg] of [[600, '10 MINUTES REMAIN'], [300, '5 MINUTES REMAIN'], [120, 'REPO SWARM INBOUND - 2 MINUTES'], [60, '60 SECONDS - FINAL NOTICE']]) {
      if (tl <= mark && !this.warned[mark]) { this.warned[mark] = true; this.emit({ e: 'warn', msg, t: mark }); }
    }
    if (tl <= 0 && !this.raidEnded) {
      // overtime: an extraction called before the timer ran out holds the end until it departs (cap 3 min)
      if (this.extractInProgress() && tl > -180) {
        if (!this.overtime) { this.overtime = true; this.emit({ e: 'warn', msg: 'OVERTIME - EXTRACTION IN PROGRESS', t: 0 }); }
        return;
      }
      this.raidEnded = true;
      for (const e of this.entities.values()) if (e.type === 'raider' && (e.st === 'alive' || e.st === 'downed')) this.kill(e, null);
      this.emit({ e: 'raidover' });
    }
  }

  // doorways + windows of building bid in world space: { x, z, nx, nz (outward), w, y0, y1 (absolute), walk
  // (a doorway: no sill), door (sim.doors index or -1) } - firing lanes and ways in for the ARK (cached)
  openings(bid) {
    const cache = (this._openings ||= new Map());
    let L = cache.get(bid); if (L) return L;
    const B = this.world.buildings[bid]; L = [];
    if (B && !B.under) {
      const b = B.def, R = B.R, sh = B.sh || 3.2, x = b.x, z = b.z;
      for (const o of b.doors || []) {
        const at = o.at || 0, ow = o.w || 1.2, k = o.storey || 0, hk = (B.storeys > 1 && b.perStorey !== false) ? (k === B.storeys - 1 ? B.h - k * sh : sh) : B.h;
        const [lx, lz, nx, nz] = o.side === 'n' ? [x + at + ow / 2, z, 0, -1] : o.side === 's' ? [x + at + ow / 2, z + b.d, 0, 1] : o.side === 'w' ? [x, z + at + ow / 2, -1, 0] : [x + b.w, z + at + ow / 2, 1, 0];
        const [wx, wz] = rotPt(R, lx, lz), wnx = R ? nx * R.c - nz * R.s : nx, wnz = R ? nx * R.s + nz * R.c : nz;
        const fy = B.floorY + k * sh;
        const y0 = fy + (o.sill || 0), y1 = fy + (o.sill ? (o.top || Math.min(hk, o.sill + 1.4)) : Math.min(hk, o.h || 2.4));
        const door = o.door ? this.doors.findIndex(d => d.bid === bid && Math.hypot(d.x - wx, d.z - wz) < 0.6) : -1;
        L.push({ x: wx, z: wz, nx: wnx, nz: wnz, w: ow, y0, y1, walk: !o.sill, door });
      }
    }
    cache.set(bid, L);
    return L;
  }

  // ------------------------------------------------------------------ population
  populate() {
    const fx = this.condEffects;
    const mul = fx.arkMul || 1;
    const cid = this.cond?.id || null;
    for (const s of this.world.arkSpawns) {
      // condition-only groups (bosses, escorts) and groups suppressed under a condition
      if (s.condition && !(cid && [].concat(s.condition).includes(cid))) continue;
      if (s.notCondition && cid && [].concat(s.notCondition).includes(cid)) continue;
      const n = Math.max(1, Math.round(s.count * (s.condition ? 1 : mul)));
      for (let i = 0; i < n; i++) {
        const def = arkDefFor(s.kind);
        // flyers start on the open level (never in a tunnel / hall under the spawn point) unless placed indoors
        const hint = s.yAbs ?? (s.surface ? this.grid.floorAt(s.x, s.z, 1e9) : def?.flying && s.habitat !== 'indoor' ? this.spawnY(s.x, s.z) : -Infinity);
        const [x, z, y] = this.nav.randomOpenNear(s.x, s.z, s.radius || 4, this.rng, hint);
        const fixed = !!def?.static || def?.speed === 0;
        this.spawnArk(s.kind, fixed ? s.x : x, fixed ? s.z : z, { patrol: s.patrol, home: [s.x, s.z], fixed, y: fixed ? s.y : 0, yAbs: fixed ? s.yAbs : null, boss: !!s.boss, f: s.f ?? s.facing, baseY: fixed ? this.floor(s.x, s.z, hint === -Infinity ? this.ground(s.x, s.z) : hint) : y });
      }
    }
    if (fx.spawnBoss) {
      // maps can mark arenas: poi(..., { bossPoi: true | [bossKinds] }); otherwise any POI
      const arenas = this.world.pois.filter(p => p.bossPoi === true || (Array.isArray(p.bossPoi) && p.bossPoi.includes(fx.spawnBoss)));
      const pool = arenas.length ? arenas : this.world.pois;
      const p = pool[Math.floor(this.rng() * pool.length)];
      if (p) { const [x, z] = this.nav.randomOpenNear(p.x, p.z, 8, this.rng); this.spawnArk(fx.spawnBoss, x, z, { boss: true }); }
    }
  }
  // avoid: [{x,z}] positions (player squads) bots must not spawn near
  spawnBots(count = 4, avoid = []) {
    let sp = this.world.spawns.length ? this.world.spawns : [{ x: this.world.w / 2, z: this.world.h / 2 }];
    const far = sp.filter(p => avoid.every(a => Math.hypot(a.x - p.x, a.z - p.z) > Math.min(140, this.world.w * 0.35)));
    if (far.length) sp = far;
    for (let s = 0; s < count; s++) {
      const p = sp[Math.floor(this.rng() * sp.length)];
      const temper = this.rng() < 0.45 ? 'hostile' : 'neutral';
      const n = 1 + Math.floor(this.rng() * 3), team = 100 + s;
      const squad = { id: team, temper, members: [] };
      this.squads.set(team, squad);
      for (let i = 0; i < n; i++) {
        const [x, z] = this.nav.randomOpenNear(p.x, p.z, 6, this.rng);
        const outfit = ['bot', 'bot2', 'bot3'][Math.floor(this.rng() * 3)];
        const e = this.addRaider({ pid: 'bot' + team + '_' + i, name: botName(this.rng), bot: true, team, x, z, outfit, temper, stats: { max_hp: 100 } });
        e.brain = new BotBrain(this, e, squad);
        squad.members.push(e.id);
      }
    }
  }
}

function botName(rng) {
  const a = ['Rust', 'Gale', 'Moth', 'Finch', 'Ash', 'Vex', 'Juno', 'Pike', 'Wren', 'Cobb', 'Sable', 'Quill', 'Dune', 'Flint', 'Hollis', 'Kip', 'Ludo', 'Mara', 'Nyx', 'Orrin'];
  return a[Math.floor(rng() * a.length)] + '-' + (10 + Math.floor(rng() * 89));
}
export function rayCircle(ox, oz, dx, dz, cx, cz, r) {
  const fx = ox - cx, fz = oz - cz;
  const b = fx * dx + fz * dz, c = fx * fx + fz * fz - r * r;
  const disc = b * b - c; if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  if (t < 0) return c < 0 ? 0 : null;
  return t;
}
export function zoneWorld(e, zn) {
  const c = Math.cos(e.f), s = Math.sin(e.f), lx = zn.x || 0, lz = zn.z || 0;
  return [e.x - c * lx + s * lz, e.z + s * lx + c * lz];
}
export { ang as wrapAngle };
