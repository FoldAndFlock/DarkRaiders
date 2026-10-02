// Bot raider squads: travel between POIs, loot containers, fight ARK, and – depending on squad
// temperament – hunt players (hostile) or keep their distance and beg "don't shoot" (neutral)
// until provoked. They extract (or try to) before the raid ends.
import { botLoadout } from './loot.js';
import { weaponStats, gunModelFor, gunSoundFor, ITEMS } from './items.js';
import { wrapAngle } from './sim.js';

const SAYS_NEUTRAL = ["DON'T SHOOT!", 'FRIENDLY!', 'NOT LOOKING FOR TROUBLE', 'EASY THERE', 'JUST LOOTING'];
const SAYS_HOSTILE = ['CONTACT!', 'RAIDERS HERE', 'LIGHT THEM UP', 'YOUR LOOT IS MINE'];

export class BotBrain {
  constructor(sim, e, squad) {
    this.sim = sim; this.e = e; this.squad = squad;
    this.kit = botLoadout(sim.rng, sim.rng());
    this.w = weaponStats(this.kit.weapon);
    e.wid = this.kit.weapon.id; e.wk = gunModelFor(e.wid);
    this.mag = this.w.mag; this.reloadT = 0; this.fireT = 0; this.burstLeft = 0;
    if (this.kit.shield) sim.setShield(e, this.kit.shield);
    this.state = 'travel'; this.goal = null; this.path = null; this.pathT = 0;
    this.target = null; this.lostT = 0; this.searchC = null; this.searchT = 0;
    this.leaveAt = 600 + sim.rng() * 900;          // seconds into raid before heading to extract
    this.hostileTeams = new Set();
    this.lastSay = -99; this.strafe = sim.rng() < 0.5 ? 1 : -1; this.strafeT = 0;
    this.thinkT = sim.rng();
    this.heals = this.kit.heals?.qty || 0;
  }
  isLeader() { return this.squad.members[0] === this.e.id || !this.sim.entities.get(this.squad.members.find(id => this.sim.entities.get(id)?.st === 'alive')); }
  leader() { for (const id of this.squad.members) { const m = this.sim.entities.get(id); if (m && m.st === 'alive') return m; } return this.e; }
  say(text) { if (this.sim.t - this.lastSay < 6) return; this.lastSay = this.sim.t; this.e.emote = text; this.e.emoteT = 3; this.sim.emit({ e: 'emote', id: this.e.id, text }); }
  hostileTo(t) {
    if (t.type === 'ark') return true;
    if (t.type !== 'raider' || t.team === this.e.team) return false;
    return this.squad.temper === 'hostile' || this.hostileTeams.has(t.team);
  }
  onHit(src) {
    if (!src) return;
    if (src.type === 'raider' && src.team !== this.e.team) {
      // provoke the whole squad
      for (const id of this.squad.members) { const m = this.sim.entities.get(id); if (m?.brain) { m.brain.hostileTeams.add(src.team); if (!m.brain.target) m.brain.target = src.id; } }
      if (this.squad.temper === 'neutral') this.say('YOU ASKED FOR IT');
    }
    if (!this.target || this.sim.rng() < 0.4) this.target = src.id;
  }
  dropItems() {
    const k = this.kit, out = [];
    out.push({ ...k.weapon, ammo: this.mag });
    if (k.ammo) out.push(k.ammo);
    if (k.shield) out.push(k.shield);
    if (this.heals > 0) out.push({ ...k.heals, qty: this.heals });
    if (k.grenade) out.push({ id: k.grenade, qty: 1, uid: 'g' + this.e.id });
    out.push(...k.loot);
    return out.filter(s => s && ITEMS[s.id]);
  }

  // --------------------------------------------------------------- movement
  go(x, z, dt, mul = 1, ty = null) {
    const e = this.e, sim = this.sim;
    this.pathT -= dt;
    if (!this.path || this.pathT <= 0 || !this.pgoal || Math.hypot(this.pgoal[0] - x, this.pgoal[1] - z) > 3) {
      this.pgoal = [x, z]; this.pathT = 2 + sim.rng() * 2;
      this.path = sim.nav.find(e.x, e.z, x, z, 4000, e.y, ty ?? e.y) || [[x, z]];
    }
    let wp = this.path[0];
    while (wp && Math.hypot(wp[0] - e.x, wp[1] - e.z) < 1.0 && this.path.length > 1) { this.path.shift(); wp = this.path[0]; }
    if (!wp) { e.moving = false; return true; }
    const dx = wp[0] - e.x, dz = wp[1] - e.z, d = Math.hypot(dx, dz) || 1e-3;
    if (d < 0.5 && this.path.length <= 1) { e.moving = false; return true; }
    const sp = (e.sprint ? 6.0 : 4.0) * mul * (e.buffs?.slowed ? 0.5 : 1) * dt;
    const p = { x: e.x, z: e.z, y: e.y };
    sim.grid.move(p, dx / d * Math.min(d, sp), dz / d * Math.min(d, sp), e.r);
    e.vx = (p.x - e.x) / dt; e.vz = (p.z - e.z) / dt;
    e.x = p.x; e.z = p.z; e.y = sim.floor(p.x, p.z, p.y); e.moving = true; e.mf = Math.atan2(dx, dz);
    return false;
  }

  // --------------------------------------------------------------- think
  update(dt) {
    const e = this.e, sim = this.sim;
    if (e.st !== 'alive') { e.moving = false; return; }
    if (e.buffs?.stunned) { e.moving = false; return; }
    this.thinkT -= dt;
    if (this.thinkT <= 0) { this.thinkT = 0.25; this.scan(); }
    if (this.reloadT > 0) { this.reloadT -= dt; if (this.reloadT <= 0) this.mag = this.w.mag; }
    const tgt = this.target ? sim.entities.get(this.target) : null;
    if (tgt && (tgt.st === 'alive' || (tgt.type === 'ark' && tgt.st !== 'dead'))) { this.fight(tgt, dt); return; }
    this.target = null;
    // heal up when safe
    if (e.hp < 55 && this.heals > 0 && !this.healT) { this.healT = 2; }
    if (this.healT) { this.healT -= dt; e.moving = false; if (this.healT <= 0) { this.healT = 0; this.heals--; e.hot.push({ kind: 'hp', left: 30, rate: 6 }); } return; }
    if (sim.t > this.leaveAt || sim.timeLeft < 240) { this.extract(dt); return; }
    if (this.searchC) { this.loot(dt); return; }
    this.travel(dt);
  }
  scan() {
    const e = this.e, sim = this.sim;
    let best = null, bd = 1e9;
    sim.near(e.x, e.z, 34, (t) => {
      if (t === e || t.st === 'dead' || t.st === 'out') return;
      if (t.type === 'raider' && t.team === e.team) return;
      const d = Math.hypot(t.x - e.x, t.z - e.z);
      if (t.type === 'raider' && t.buffs?.cloak) return;
      const ty = t.y + (t.alt || 0) + 1;
      if (!sim.grid.los(e.x, e.y + 1.5, e.z, t.x, ty, t.z) || sim.smokeBetween(e.x, e.z, t.x, t.z)) return;
      // facing check (bots see ~200deg)
      const a = Math.atan2(t.x - e.x, t.z - e.z);
      if (d > 8 && Math.abs(wrapAngle(a - e.f)) > 1.8) return;
      if (t.type === 'raider' && !this.hostileTo(t)) {
        if (d < 22 && t.type === 'raider' && !t.bot) this.say(SAYS_NEUTRAL[Math.floor(sim.rng() * SAYS_NEUTRAL.length)]);
        if (d < 5) { this.avoid = [t.x, t.z, sim.t]; }
        return;
      }
      if (t.type === 'ark' && t.st !== 'alert' && d > 18 && (t.def.hp || 0) > 500) return;   // leave big idle ARK alone
      if (d < bd) { bd = d; best = t; }
    });
    if (best && best.id !== this.target) {
      this.target = best.id; this.lostT = 0;
      if (best.type === 'raider') this.say(SAYS_HOSTILE[Math.floor(sim.rng() * SAYS_HOSTILE.length)]);
      // share with squad
      for (const id of this.squad.members) { const m = sim.entities.get(id); if (m?.brain && !m.brain.target) m.brain.target = best.id; }
    }
  }
  fight(t, dt) {
    const e = this.e, sim = this.sim;
    const dx = t.x - e.x, dz = t.z - e.z, d = Math.hypot(dx, dz) || 1e-3, a = Math.atan2(dx, dz);   // same spot: no NaN
    const ty = t.y + (t.alt || 0) + (t.type === 'raider' ? (t.crouch ? 0.8 : 1.2) : 0.6);
    const vis = sim.grid.los(e.x, e.y + 1.4, e.z, t.x, ty, t.z) && !sim.smokeBetween(e.x, e.z, t.x, t.z);
    e.f += Math.max(-dt * 7, Math.min(dt * 7, wrapAngle(a - e.f)));
    if (!vis) { this.lostT += dt; if (this.lostT > 8) { this.target = null; return; } this.go(t.x, t.z, dt, 0.8, t.y); e.crouch = false; return; }
    this.lostT = 0;
    // positioning: keep preferred range; strafe
    const want = Math.min(this.w.range * 0.8, 22);
    this.strafeT -= dt; if (this.strafeT <= 0) { this.strafeT = 1 + sim.rng() * 2; this.strafe *= -1; e.crouch = sim.rng() < 0.3; }
    let mx = 0, mz = 0;
    if (d > want + 3) { mx = dx / d; mz = dz / d; } else if (d < want * 0.5) { mx = -dx / d; mz = -dz / d; }
    mx += dz / d * this.strafe * 0.7; mz += -dx / d * this.strafe * 0.7;
    const ml = Math.hypot(mx, mz) || 1;
    const sp = (e.crouch ? 2 : 3.4) * dt;
    const p = { x: e.x, z: e.z, y: e.y }; sim.grid.move(p, mx / ml * sp, mz / ml * sp, e.r);
    e.moving = Math.hypot(p.x - e.x, p.z - e.z) > 0.001; e.mf = Math.atan2(mx, mz); e.x = p.x; e.z = p.z; e.y = sim.floor(p.x, p.z, p.y);
    // shooting
    if (this.reloadT > 0) return;
    if (this.mag <= 0) { this.reloadT = this.w.reload || 2.5; this.sim.emit({ e: 'reload', id: e.id }); return; }
    this.fireT -= dt;
    if (this.fireT > 0) return;
    const interval = 60 / (this.w.rpm || 300);
    const semi = this.w.mode !== 'auto' && this.w.mode !== 'beam';
    this.fireT = interval * (semi ? 1.8 + sim.rng() : 1) + (this.burstLeft <= 0 ? 0.35 + sim.rng() * 0.6 : 0);
    if (this.burstLeft <= 0) this.burstLeft = semi ? 1 : 3 + Math.floor(sim.rng() * 6);
    this.burstLeft--;
    this.mag--;
    const o = { x: e.x + Math.sin(e.f) * 0.5, y: e.y + (e.crouch ? 1.0 : 1.35), z: e.z + Math.cos(e.f) * 0.5 };
    const dy = (ty - o.y) / Math.max(1, d);
    const spread = (this.w.spread || 3) * (e.moving ? 1.3 : 1) * 1.2 + 1.2;
    sim.shoot(e, o, a, dy, this.w, { spread, team: e.team, vis: gunModelFor(e.wid), snd: gunSoundFor(e.wid), weaponId: e.wid });
  }
  travel(dt) {
    const e = this.e, sim = this.sim;
    const lead = this.leader();
    if (lead !== e) {
      // follow the leader in a loose formation
      const i = this.squad.members.indexOf(e.id), a = lead.f + Math.PI + (i % 2 ? 0.7 : -0.7);
      const fx = lead.x + Math.sin(a) * 2.5, fz = lead.z + Math.cos(a) * 2.5;
      if (Math.hypot(fx - e.x, fz - e.z) > 1.5) this.go(fx, fz, dt, Math.hypot(fx - e.x, fz - e.z) > 8 ? 1.4 : 1); else e.moving = false;
      e.f += wrapAngle(lead.f - e.f) * Math.min(1, dt * 3);
      if (lead.brain?.searchC && !this.searchC && sim.rng() < dt) this.pickContainer(10);
      return;
    }
    if (!this.goal || this.go(this.goal[0], this.goal[1], dt, 0.9, this.goal[2])) {
      if (this.goal && this.pickContainer(18)) return;
      const pois = sim.world.pois;
      const p = pois.length ? pois[Math.floor(sim.rng() * pois.length)] : { x: sim.world.w * sim.rng(), z: sim.world.h * sim.rng(), r: 10 };
      this.goal = sim.nav.randomOpenNear(p.x, p.z, Math.min(12, p.r || 10), sim.rng);
    }
    if (e.moving) e.f += wrapAngle(e.mf - e.f) * Math.min(1, dt * 6);
  }
  pickContainer(r) {
    const e = this.e; let best = null, bd = r;
    for (const c of this.sim.containers) {
      if (c.opened || c.botClaim) continue;
      const d = Math.hypot(c.x - e.x, c.z - e.z); if (d < bd) { bd = d; best = c; }
    }
    if (best) { best.botClaim = e.id; this.searchC = best; this.searchT = 0; return true; }
    return false;
  }
  loot(dt) {
    const e = this.e, c = this.searchC;
    if (c.opened && c.botClaim !== e.id) { this.searchC = null; return; }
    if (Math.hypot(c.x - e.x, c.z - e.z) > 1.4 || Math.abs((c.y ?? e.y) - e.y) > 1.5) { this.go(c.x, c.z, dt, 0.9, c.y); return; }
    e.moving = false; this.searchT += dt;
    e.f = Math.atan2(c.x - e.x, c.z - e.z);
    if (this.searchT > this.sim.searchTimeFor(c.kind) * 1.4) {
      const items = this.sim.openContainer(c, e);
      // bots take a couple of the best items
      items.sort((a, b) => (ITEMS[b.id]?.value || 0) - (ITEMS[a.id]?.value || 0));
      const take = items.splice(0, Math.min(items.length, 1 + Math.floor(this.sim.rng() * 2)));
      this.kit.loot.push(...take);
      if (take.length) this.sim.emit({ e: 'taken', i: c.i, n: take.length });
      this.searchC = null;
    }
  }
  // extraction: walk to the call button and call it, wait by the entrance while it comes, board when it
  // opens, pull the departure lever after a short wait (or let the doors auto-close), stay inside until it
  // leaves. Missed / used extracts are skipped for a while.
  extract(dt) {
    const e = this.e, sim = this.sim;
    this.skipX = this.skipX || new Map();
    const usable = (x) => x.kind !== 'hatch' && x.state !== 'offline' && !(this.skipX.get(x.i) > sim.t);
    if (!this.xgoal || !usable(this.xgoal)) {
      let best = null, bd = 1e9;
      for (const x of sim.extracts) {
        if (!usable(x)) continue;
        const d = Math.hypot(x.x - e.x, x.z - e.z) - (x.state === 'called' || x.state === 'open' ? 60 : 0);   // join one already coming
        if (d < bd) { bd = d; best = x; }
      }
      this.xgoal = best; this.boardT = 0; this.boardWait = 3 + sim.rng() * 9;
      if (!best) { this.leaveAt = sim.t + 30; return; }
    }
    const x = this.xgoal, P = x.pts, ty = P.cabin.y;
    const inside = sim.cabinRaiders(x).includes(e);
    const goTo = (p, mul = 1.1, r = 0.9) => { if (Math.hypot(p[0] - e.x, p[1] - e.z) > r || Math.abs(ty - e.y) > 1.5) { this.go(p[0], p[1], dt, mul, ty); return false; } e.moving = false; return true; };
    e.sprint = x.state === 'open' || x.state === 'closing';
    switch (x.state) {
      case 'idle': if (goTo(P.call, 1.1, 1.2)) sim.callExtract(x, e); break;
      case 'called': goTo(P.entry, 1.0, 1.5); break;
      case 'open':
        if (!inside) { goTo([P.cabin.cx, P.cabin.cz], 1.2, 0.6); this.boardT = 0; break; }
        this.boardT += dt;
        if (this.boardT > this.boardWait) { if (goTo(P.depart, 1.0, 0.7)) sim.departExtract(x, e); }
        else e.moving = false;
        break;
      case 'closing': if (!inside) goTo([P.cabin.cx, P.cabin.cz], 1.3, 0.6); else e.moving = false; break;
      default: this.skipX.set(x.i, sim.t + 80); this.xgoal = null; break;   // gone without us
    }
  }
}
