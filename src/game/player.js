// Local player controller: movement, aiming, weapons, quick-use, interaction. Client-authoritative
// for movement; combat outcomes are resolved by the host through the session.
import { ITEMS, weaponStats, gunModelFor, gunSoundFor, makeStack } from './items.js';
import { capacities, countLoadout, takeFrom, loadoutWeight, QUICK_TYPES } from './inventory.js';
import { OBLIQUE_K } from '../engine/renderer.js';
import { wrapAngle } from './sim.js';
import { SKILL_TREE } from '../data/skills.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export class PlayerController {
  constructor(game, ent, loadout, stats) {
    this.g = game; this.e = ent; this.lo = loadout; this.stats = stats;
    this.caps = capacities(loadout, stats);
    this.slot = loadout.weapons[0] ? 0 : loadout.weapons[1] ? 1 : 0;
    this.stamina = stats.max_stamina; this.exhausted = false;
    this.fireT = 0; this.reloadT = 0; this.reloadFor = null; this.burst = 0; this.burstT = 0; this.bloom = 0; this.charge = 0;
    this.useT = 0; this.useItem = null; this.useSlot = -1;
    this.dodgeT = 0; this.dodgeDir = [0, 0]; this.dodgeCD = 0;
    this.crouch = false; this.ads = false; this.flash = !!game.L?.isNight;
    this.interact = null; this.holdT = 0; this.holdFor = null;
    this.aim = { x: ent.x, z: ent.z + 5, y: 1.2, a: 0, entity: null };
    this.semiLatch = false; this.gadgetCD = {};
    this.footT = 0; this.vx = 0; this.vz = 0;
    this.lastFireAt = -9; this.meleeCD = 0; this.lastDodgeAt = -9;
    // conditional skill bonuses: [{stat, per, when}] scaled by rank
    this.conds = [];
    for (const [id, rank] of Object.entries(game.profile?.skills || {})) {
      const n = SKILL_TREE.nodes[id]; if (!n || !rank) continue;
      for (const c of n.conditional || []) this.conds.push({ ...c, per: c.per * rank });
    }
    this.applyWeaponVisual();
  }
  // live conditional modifier for a stat
  cond(stat) {
    if (!this.conds.length) return 0;
    const e = this.e, g = this.g;
    const on = {
      hurt: e.hp < e.maxHp * 0.5, critical: e.hp < e.maxHp * 0.25, walking: e.moving && !e.sprint, crouched: this.crouch,
      exhausted: this.exhausted, healing: !!this.useItem, overweight: this.weight() > this.caps.weightLimit,
      after_dodge: g.time - this.lastDodgeAt < 2.5, shield_broken: e.shMax > 0 && e.sh <= 0, downed: e.st === 'downed', looting: !!this.holdFor,
    };
    let m = 0; for (const c of this.conds) if (c.stat === stat && on[c.when]) m += c.per;
    return m;
  }
  get weapon() { return this.lo.weapons[this.slot] || null; }
  get wstats() { const w = this.weapon; return w ? weaponStats(w) : null; }
  applyWeaponVisual() { const w = this.weapon; this.e.wid = w?.id || null; this.e.wk = w ? gunModelFor(w.id) : null; this.g.session.state({ wid: this.e.wid, wk: this.e.wk }); }
  recalc() { this.caps = capacities(this.lo, this.stats); }
  weight() { return loadoutWeight(this.lo); }

  // ---------------------------------------------------------------- per frame
  update(dt, input, R) {
    const e = this.e, g = this.g, st = this.stats;
    if (e.st === 'dead' || e.st === 'out') return;
    const downed = e.st === 'downed';
    // --- aim
    const padAim = input.padAimDir();
    const feet = g.world.groundAt(e.x, e.z);
    if (padAim) { this.aim.x = e.x + padAim.x * 9; this.aim.z = e.z + padAim.z * 9; }
    else { const p = R.screenToGround(input.mouse.x, input.mouse.y, feet + 1.1); this.aim.x = p.x; this.aim.z = p.z; }
    const hov = g.view.pickEntity(input.mouse.x, input.mouse.y, e.id);
    this.aim.entity = hov;
    this.aim.y = hov ? hov.aimY : g.world.groundAt(this.aim.x, this.aim.z) + 1.0;
    this.aim.a = Math.atan2(this.aim.x - e.x, this.aim.z - e.z);
    // --- movement
    const mv = input.move();
    const moving = Math.hypot(mv.x, mv.z) > 0.1;
    if (input.hit('crouch')) this.crouch = !this.crouch;
    const over = this.weight() > this.caps.weightLimit;
    let wantSprint = input.is('sprint') && moving && !this.exhausted && !over && !downed;
    if (wantSprint) this.crouch = false;
    this.ads = input.aim() && !wantSprint && !downed;
    const shield = ITEMS[this.lo.shield?.id]?.shield;
    let speed = (wantSprint ? st.sprint_speed : st.move_speed) * (shield?.moveMul || 1) * (this.wstats?.moveMul || 1);
    if (this.crouch) speed = st.crouch_speed;
    if (this.ads) speed *= 0.62;
    if (over) speed *= 0.6;
    if (this.useItem) speed *= 0.5;
    if (e.buffs?.slowed || e.latchedBy) speed *= 0.55;
    if (e.buffs?.adrenaline) speed *= 1.12;
    if (e.buffs?.cloak) speed *= 0.75;
    speed *= 1 + this.cond('move_speed');
    if (downed) speed = 0.9 * st.downed_crawl_speed;
    const depth = g.world.grid.waterDepth(e.x, e.z);
    if (depth > 0.3) speed *= 0.72;
    // stamina
    if (wantSprint) { this.stamina -= st.sprint_cost * Math.max(0, 1 + this.cond('sprint_cost')) * dt; if (this.stamina <= 0) { this.stamina = 0; this.exhausted = true; g.audio?.play('stamina_out'); } }
    else this.stamina = Math.min(st.max_stamina, this.stamina + st.stamina_regen * (1 + this.cond('stamina_regen')) * (e.buffs?.adrenaline ? 2 : 1) * (moving ? 0.7 : 1) * dt);
    if (this.exhausted && this.stamina > st.max_stamina * 0.35) this.exhausted = false;
    // dodge roll
    this.dodgeCD -= dt;
    const dcost = st.dodge_cost * Math.max(0, 1 + this.cond('dodge_cost'));
    if (input.hit('dodge') && !downed && this.dodgeT <= 0 && this.dodgeCD <= 0 && this.stamina >= dcost * 0.5) {
      const dir = moving ? [mv.x, mv.z] : [Math.sin(this.aim.a), Math.cos(this.aim.a)];
      this.dodgeT = 0.34; this.dodgeDir = dir; this.dodgeCD = 0.7; this.stamina = Math.max(0, this.stamina - dcost); this.lastDodgeAt = g.time;
      this.crouch = false; this.cancelUse();
      g.session.dodge(); g.audio?.play('dodge_roll', { x: e.x, z: e.z });
    }
    let vx = mv.x * speed, vz = mv.z * speed;
    if (this.dodgeT > 0) { this.dodgeT -= dt; const ds = st.dodge_distance / 0.34; vx = this.dodgeDir[0] * ds; vz = this.dodgeDir[1] * ds; }
    const p = { x: e.x, z: e.z };
    g.world.grid.move(p, vx * dt, vz * dt, 0.33);
    this.vx = (p.x - e.x) / dt; this.vz = (p.z - e.z) / dt;
    e.x = p.x; e.z = p.z; e.y = g.world.groundAt(e.x, e.z);
    e.moving = Math.hypot(this.vx, this.vz) > 0.3; e.sprint = wantSprint && e.moving; e.crouch = this.crouch || downed;
    e.mf = moving ? Math.atan2(mv.x, mv.z) : e.f;
    e.f = downed ? e.mf : (e.sprint ? e.mf : this.aim.a);
    if (this.dodgeT > 0) e.f = Math.atan2(this.dodgeDir[0], this.dodgeDir[1]);
    // flashlight
    if (input.hit('flashlight')) { this.flash = !this.flash; g.audio?.play('ui_click'); }
    e.flash = this.flash;
    // footsteps
    if (e.moving) {
      this.footT -= dt * (e.sprint ? 1.5 : this.crouch ? 0.6 : 1);
      if (this.footT <= 0) { this.footT = 0.38; g.view.footstep(e, depth); }
    }
    g.session.state({ x: e.x, y: e.y, z: e.z, f: e.f, mf: e.mf, moving: e.moving, sprint: e.sprint, crouch: e.crouch, flash: e.flash });
    if (downed) {
      this.cancelUse();
      this.selfRevives = this.selfRevives ?? Math.floor(this.stats.self_revive || 0);
      if (this.selfRevives > 0) {
        this.interact = { kind: 'selfrevive', ref: e.id, x: e.x, z: e.z, time: 3, label: `SELF-REVIVE (${this.selfRevives} LEFT)` };
        if (input.is('interact')) { this.holdFor = 'self'; this.holdT += dt; if (this.holdT >= 3) { this.holdT = 0; this.holdFor = null; this.selfRevives--; g.session.reviveNow(e.id); g.feed('BACK ON YER FEET', '#68e088'); } }
        else { this.holdT = 0; this.holdFor = null; }
      } else this.interact = null;
      return;
    }
    // --- weapons
    if (input.hit('swap') || input.mouse.wheel) this.swapWeapon(input.mouse.wheel < 0 ? -1 : 1);
    if (input.hit('weapon1')) this.selectWeapon(0);
    if (input.hit('weapon3')) this.selectWeapon(2);
    if (input.hit('reload')) this.startReload();
    this.meleeCD -= dt;
    if (input.hit('melee') && this.meleeCD <= 0 && !this.useItem) {
      this.meleeCD = 0.75; this.fireT = Math.max(this.fireT, 0.4);
      g.session.melee(this.aim.a, this.stats.melee_damage, !!g.stats0?.unlocks?.has?.('one_hit_drones'));
      g.view.vis.get(e.id)?.model?.kick(1.2);
      g.audio?.play('dodge_roll', { x: e.x, z: e.z, pitch: 1.6 });
    }
    this.updateWeapon(dt, input);
    // --- quick use
    for (let i = 0; i < 6; i++) if (input.hit('quick' + (i + 1))) this.startUse(i);
    if (input.hit('grenade')) { const i = this.lo.quick.findIndex(s => s && (ITEMS[s.id]?.type === 'grenade' || ITEMS[s.id]?.type === 'trap')); if (i >= 0) this.startUse(i); }
    this.updateUse(dt);
    // --- interaction
    this.updateInteract(dt, input);
  }

  swapWeapon(dir = 1) {
    const n = this.caps.weaponSlots;
    for (let k = 1; k <= n; k++) { const i = (this.slot + dir * k + n * 3) % n; if (this.lo.weapons[i]) { this.selectWeapon(i); return; } }
  }
  selectWeapon(i) {
    if (!this.lo.weapons[i] || i === this.slot) return;
    this.slot = i; this.reloadT = 0; this.fireT = Math.max(this.fireT, 0.35); this.charge = 0; this.burst = 0;
    this.applyWeaponVisual(); this.g.audio?.play('weapon_switch');
  }
  ammoCount(id) { return countLoadout(this.lo, id); }
  startReload() {
    const w = this.weapon, ws = this.wstats; if (!w || this.reloadT > 0) return;
    if ((w.ammo || 0) >= ws.mag) return;
    if (this.ammoCount(ws.ammo) <= 0) { this.g.hudMsg('NO ' + (ITEMS[ws.ammo]?.name || 'AMMO').toUpperCase(), '#e84a30'); this.g.audio?.play('dry_fire'); return; }
    this.reloadT = (ws.reload || 2.2) / this.stats.reload_speed; this.reloadFor = w.uid;
    this.g.audio?.play('reload_start', { x: this.e.x, z: this.e.z });
    this.g.session.noise(6);
  }
  updateWeapon(dt, input) {
    const w = this.weapon, ws = this.wstats, e = this.e, g = this.g;
    this.fireT -= dt; this.bloom = Math.max(0, this.bloom - dt * 7);
    if (!w || !ws) return;
    if (this.reloadT > 0) {
      if (this.reloadFor !== w.uid) { this.reloadT = 0; return; }
      this.reloadT -= dt;
      if (this.reloadT <= 0) {
        const need = ws.mag - (w.ammo || 0);
        const got = takeFrom([this.lo.backpack, this.lo.safe, this.lo.quick], ws.ammo, need);
        w.ammo = (w.ammo || 0) + got; g.audio?.play('reload_end', { x: e.x, z: e.z }); g.invDirty = true;
      }
      return;
    }
    if (e.sprint || this.useItem || this.dodgeT > 0) { this.charge = 0; return; }
    const trig = input.fire() && !g.uiBlocking;
    if (!trig) this.semiLatch = false;
    const auto = ws.mode === 'auto' || ws.mode === 'beam';
    if (ws.mode === 'charge') {
      if (trig && (w.ammo || 0) > 0) { this.charge = Math.min(1, this.charge + dt / (ws.chargeTime || 1)); if (this.charge > 0.05 && !this.chargeSnd) { this.chargeSnd = true; g.audio?.play('charge_up', { x: e.x, z: e.z }); } return; }
      if (!trig && this.charge > 0) { const c = this.charge; this.charge = 0; this.chargeSnd = false; if (c >= 0.99 && this.fireT <= 0) this.shoot(ws, w, 1); }
      return;
    }
    if (this.burst > 0) {
      this.burstT -= dt;
      if (this.burstT <= 0) { this.burst--; this.burstT = 60 / ws.rpm; this.shoot(ws, w, 1); if (this.burst <= 0) this.fireT = ws.burstDelay || 0.3; }
      return;
    }
    if (!trig || this.fireT > 0) return;
    if (!auto && this.semiLatch) return;
    if ((w.ammo || 0) <= 0) {
      if (!this.semiLatch) { g.audio?.play('dry_fire'); this.semiLatch = true; this.startReload(); }
      return;
    }
    if ((w.dur ?? 1) <= 0) { if (!this.semiLatch) { g.hudMsg('WEAPON BROKEN - REPAIR AT GUNSMITH', '#e84a30'); this.semiLatch = true; } return; }
    this.semiLatch = true;
    if (ws.mode === 'burst') { this.burst = (ws.burst || 3) - 1; this.burstT = 60 / ws.rpm; this.shoot(ws, w, 1); return; }
    this.fireT = 60 / ws.rpm;
    this.shoot(ws, w, 1);
  }
  shoot(ws, w, n) {
    const e = this.e, g = this.g;
    if ((w.ammo || 0) <= 0) return;
    w.ammo--; w.dur = Math.max(0, (w.dur ?? 100) - 1);
    const base = this.ads ? (ws.adsSpread ?? ws.spread * 0.4) : ws.spread;
    let spread = base * (e.moving ? 1.45 : 1) * (this.crouch ? 0.8 : 1) * this.stats.spread_mul + this.bloom;
    this.bloom = Math.min(8, this.bloom + (ws.recoil || 1) * 0.45 * this.stats.recoil_mul);
    const ox = e.x + Math.sin(this.aim.a) * 0.55, oz = e.z + Math.cos(this.aim.a) * 0.55;
    const oy = e.y + (this.crouch ? 0.95 : 1.3);
    const d = Math.max(1, Math.hypot(this.aim.x - ox, this.aim.z - oz));
    const dy = clamp((this.aim.y - oy) / d, -0.6, 0.6);
    const shot = { x: ox, y: oy, z: oz, a: this.aim.a, dy, wid: w.id, tier: w.tier || 1, mods: w.mods || {}, spread,
      dmgMul: this.stats.weapon_damage * (this.charge ? 1 : 1), arkMul: this.stats.arc_damage, vis: gunModelFor(w.id), snd: gunSoundFor(w.id) };
    if (ws.mode === 'launcher' || ws.class === 'launcher') g.session.launch(shot);
    else {
      g.session.fire(shot);
      if (!g.isHost) {   // client-side tracer prediction against the world
        const sa = shot.a + (Math.random() - 0.5) * spread * Math.PI / 180, dx = Math.sin(sa), dz = Math.cos(sa);
        const d = g.world.grid.ray(ox, oz, dx, dz, (ws.range || 30) * 2, oy, dy);
        g.fx.tracers.add(ox, oy, oz, ox + dx * d, oy + dy * d, oz + dz * d, 0xffe0a0, 0.07);
      }
    }
    this.lastFireAt = g.time;
    g.view.localMuzzle(e, this.aim.a, ws, shot);
    g.invDirty = true;
    if ((w.ammo || 0) <= 0 && this.ammoCount(ws.ammo) > 0) setTimeout(() => this.startReload(), 150);
  }

  // ---------------------------------------------------------------- quick-use items
  startUse(i) {
    const s = this.lo.quick[i]; if (!s || this.useItem) return;
    const d = ITEMS[s.id]; if (!d) return;
    if (d.type === 'grenade' || d.type === 'trap' || (d.type === 'gadget' && d.throw)) {
      this.g.session.throwItem(s.id, this.aim.x, this.aim.z);
      this.consume(i); this.g.audio?.play('grenade_pin', { x: this.e.x, z: this.e.z });
      return;
    }
    const u = d.use; if (!u) return;
    if (u.reusable && this.gadgetCD[s.id] > this.g.time) { this.g.hudMsg('RECHARGING', '#9a9484'); return; }
    this.useItem = s.id; this.useSlot = i; this.useT = (u.time || 1) / (this.stats.heal_speed || 1);
    this.useTotal = this.useT;
    this.g.audio?.play(u.heal || u.healOverTime ? 'heal_bandage' : u.shield || u.shieldOverTime ? 'shield_recharge' : 'heal_injector', { x: this.e.x, z: this.e.z });
  }
  cancelUse() { this.useItem = null; this.useT = 0; }
  updateUse(dt) {
    if (!this.useItem) return;
    if (this.e.sprint) { this.cancelUse(); return; }
    this.useT -= dt;
    if (this.useT > 0) return;
    const id = this.useItem, d = ITEMS[id], u = d.use, st = this.stats, g = this.g;
    this.useItem = null;
    const eff = {};
    if (u.heal) eff.hp = u.heal * st.heal_amount;
    if (u.healOverTime) eff.hot = { kind: 'hp', amount: u.healOverTime.amount * st.heal_amount, dur: u.healOverTime.dur };
    if (u.shield) eff.sh = u.shield;
    if (u.shieldOverTime) eff.shot = { kind: 'sh', amount: u.shieldOverTime.amount * st.shield_recharge_speed, dur: u.shieldOverTime.dur / st.shield_recharge_speed };
    if (u.stamina) this.stamina = Math.min(st.max_stamina, this.stamina + u.stamina);
    if (u.effect) eff.buff = { name: u.effect, dur: u.dur || 10 };
    if (u.effect === 'revive' || id.includes('defibrillator')) {
      const t = g.view.nearestDowned(this.e, 2.5);
      if (t) { g.session.reviveNow(t.id); this.consume(this.useSlot); return; }
      g.hudMsg('NO DOWNED SQUADMATE NEARBY', '#9a9484'); return;
    }
    if (u.effect === 'binoculars') { g.binoculars = g.time + 6; }
    g.session.useEffect(eff);
    if (u.reusable) this.gadgetCD[id] = g.time + (u.cooldown || 10);
    else this.consume(this.useSlot);
  }
  consume(i) {
    const s = this.lo.quick[i]; if (!s) return;
    s.qty--; if (s.qty <= 0) {
      this.lo.quick[i] = null;
      // auto-refill the quick slot from the backpack
      const j = this.lo.backpack.findIndex(b => b && b.id === s.id);
      if (j >= 0) { this.lo.quick[i] = this.lo.backpack[j]; this.lo.backpack[j] = null; }
    }
    this.g.invDirty = true;
  }

  // ---------------------------------------------------------------- interaction
  updateInteract(dt, input) {
    const g = this.g, e = this.e;
    const it = g.view.findInteractable(e, this);
    this.interact = it;
    if (!it) { this.holdT = 0; this.holdFor = null; return; }
    const key = it.kind + ':' + it.ref;
    if (input.is('interact') && !g.uiBlocking) {
      if (it.instant) { if (input.hit('interact')) g.doInteract(it); return; }
      if (this.holdFor !== key) { this.holdFor = key; this.holdT = 0; g.onHoldStart?.(it); }
      this.holdT += dt * (it.kind === 'container' ? this.stats.loot_speed : it.kind === 'revive' ? this.stats.revive_speed : 1);
      if (this.holdT >= it.time) { this.holdT = 0; this.holdFor = null; g.doInteract(it); }
    } else { if (this.holdFor) g.onHoldEnd?.(it); this.holdT = 0; this.holdFor = null; }
  }
}
