// Session: the player-facing API for affecting the raid. HostSession acts directly on the Sim
// (solo + host's own player + remote players' requests); ClientSession (net/) mirrors the API
// over the network. All methods are fire-and-forget except open/take which return promises.
import { ITEMS, weaponStats } from './items.js';

const STATE_KEYS = ['x', 'y', 'z', 'f', 'mf', 'moving', 'sprint', 'crouch', 'flash', 'wid', 'wk'];

export class HostSession {
  constructor(sim, ent) { this.sim = sim; this.ent = ent; }
  state(u) { for (const k of STATE_KEYS) if (k in u) this.ent[k] = u[k]; }
  fire(s) {
    const w = weaponStats({ id: s.wid, tier: s.tier || 1, mods: s.mods || {} }); if (!w) return [];
    return this.sim.shoot(this.ent, { x: s.x, y: s.y, z: s.z }, s.a, s.dy, w,
      { spread: s.spread, team: this.ent.team, vis: s.vis, snd: s.snd, weaponId: s.wid, dmgMul: s.dmgMul || 1, arkMul: s.arkMul || 1 });
  }
  launch(s) {
    const w = weaponStats({ id: s.wid, tier: s.tier || 1, mods: s.mods || {} }); if (!w) return;
    const sp = w.projSpeed || 40;
    this.sim.launch(this.ent, 'rocket', s.x, s.y, s.z, Math.sin(s.a) * sp, s.dy * sp, Math.cos(s.a) * sp,
      { dmg: (w.dmg || 60) * (s.dmgMul || 1), radius: w.radius || 3.2, team: this.ent.team, g: 3, fuse: 5 });
    this.sim.emit({ e: 'shot', s: this.ent.id, o: [s.x, s.y, s.z], hits: [], k: 'launcher', snd: s.snd });
  }
  throwItem(id, tx, tz) { this.sim.throwItem(this.ent, id, tx, tz); }
  melee(a, mul = 1, oneHitDrones = false) { this.sim.melee(this.ent, a, mul, oneHitDrones); }
  // containers: kind 'container' (ref = index) or 'loot' (ref = entity id)
  open(kind, ref) {
    const list = this._list(kind, ref, true);
    return Promise.resolve(list ? list.map(s => ({ ...s })) : null);
  }
  _list(kind, ref, opening = false) {
    if (kind === 'container') { const c = this.sim.containers[ref]; if (!c) return null; return opening ? this.sim.openContainer(c, this.ent) : this.sim.containerContents(c, this.ent); }
    if (kind === 'loot') { const l = this.sim.entities.get(ref); return l?.items || null; }
    return null;
  }
  take(kind, ref, uid, qty = null) {
    const list = this._list(kind, ref); if (!list) return Promise.resolve(null);
    const s = this.sim.takeFrom(list, uid, qty);
    if (s) this.sim.emit({ e: 'taken', kind, ref, by: this.ent.id, id: s.id });
    return Promise.resolve(s);
  }
  put(kind, ref, stack) { const list = this._list(kind, ref); if (list) list.push(stack); }
  dropItems(stacks, label = null) { return this.sim.dropLoot(this.ent.x + (Math.random() - .5), this.ent.z + (Math.random() - .5), stacks, 'bag', label || this.ent.name); }
  door(i, hasKey) { const d = this.sim.doors[i]; if (d) return this.sim.toggleDoor(d, this.ent, hasKey); return false; }
  callExtract(i) { const x = this.sim.extracts[i]; if (x) this.sim.callExtract(x, this.ent); }
  hatch(i) { const x = this.sim.extracts[i]; if (x) this.sim.extractRaider(this.ent, x); }
  reviveNow(id) { const t = this.sim.entities.get(id); if (t && t.st === 'downed') this.sim.revive(t, this.ent); }
  useEffect(eff) {
    const e = this.ent;
    if (eff.hp) e.hp = Math.min(e.maxHp, e.hp + eff.hp);
    if (eff.sh) e.sh = Math.min(e.shMax, e.sh + eff.sh);
    if (eff.hot) e.hot.push({ kind: 'hp', left: eff.hot.amount, rate: eff.hot.amount / Math.max(0.5, eff.hot.dur) });
    if (eff.shot) e.hot.push({ kind: 'sh', left: eff.shot.amount, rate: eff.shot.amount / Math.max(0.5, eff.shot.dur) });
    if (eff.buff) {
      e.buffs[eff.buff.name] = eff.buff.dur;
      if (eff.buff.name === 'cleanse') { delete e.buffs.gassed; delete e.buffs.slowed; }
    }
  }
  setShield(stack, charge) { this.sim.setShield(this.ent, stack, charge); }
  dodge() { this.ent.dodged = true; this.ent.buffs.invuln = 0.22; if (this.ent.latchedBy) { const t = this.sim.entities.get(this.ent.latchedBy); t?.brain?.unlatch(); } }
  noise(r) { this.sim.noise(this.ent.x, this.ent.z, r, this.ent); }
  chat(text) { this.sim.emit({ e: 'chat', from: this.ent.name, id: this.ent.id, text: String(text).slice(0, 120), slot: this.ent.slot }); }
  ping(x, z) { this.sim.emit({ e: 'ping', by: this.ent.id, x, z, slot: this.ent.slot }); }
  emote(text) { this.ent.emote = text; this.ent.emoteT = 3; this.sim.emit({ e: 'emote', id: this.ent.id, text }); }
  giveUp() { if (this.ent.st === 'downed') this.sim.kill(this.ent, this.ent.lastSrc); }
}
