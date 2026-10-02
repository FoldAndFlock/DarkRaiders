// Local player controller: movement, aiming, weapons, quick-use, interaction. Client-authoritative
// for movement; combat outcomes are resolved by the host through the session.
import { ITEMS, weaponStats, gunModelFor, gunSoundFor, reloadSoundFor, chargeSoundFor, makeStack } from './items.js';
import { capacities, countLoadout, takeFrom, loadoutWeight, QUICK_TYPES } from './inventory.js';
import { OBLIQUE_K, PX_PER_M } from '../engine/renderer.js';
import { wrapAngle } from './sim.js';
import { SKILL_TREE } from '../data/skills.js';
import { TRACER, TRACER_MOVE } from './view.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
// distance (px) from (px, py) along the unit direction (dx, dy) to the screen rect inset by m
function edgeDist(px, py, dx, dy, W, H, m) {
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (W - m - px) / dx); else if (dx < -1e-6) t = Math.min(t, (m - px) / dx);
  if (dy > 1e-6) t = Math.min(t, (H - m - py) / dy); else if (dy < -1e-6) t = Math.min(t, (m - py) / dy);
  return Math.max(0, t);
}

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
    this.input = input;
    this.feedback(input);
    // --- aim: gamepad right stick (pad mode), touch aim stick, or the mouse cursor. Stick aim also moves
    // input.mouse onto the aim point so the HUD crosshair and entity picking follow it.
    const feet = e.y, mode = input.mode;
    if (mode !== this.aimMode) { if (mode === 'pad') { input.clearAimHold?.(); this.stickSeed = null; } this.aimMode = mode; }
    const touchAim = mode !== 'pad' ? input.padAimDir() : null;
    let hov;
    if (mode === 'pad') hov = this.padAim(input, R, feet);
    else if (touchAim) {
      this.aim.x = e.x + touchAim.x * 9; this.aim.z = e.z + touchAim.z * 9;
      this.crosshairAt(input, R, feet);
      hov = g.view.pickEntity(input.mouse.x, input.mouse.y, e.id);
    } else {
      hov = g.view.pickEntity(input.mouse.x, input.mouse.y, e.id);
      // over an entity, unproject at its aim height (a hovering drone sits north of the ground point
      // under the cursor); keeps fine aim on the body for weak points
      const p = R.screenToGround(input.mouse.x, input.mouse.y, hov ? hov.aimY : feet + 1.1); this.aim.x = p.x; this.aim.z = p.z;
    }
    this.aim.entity = hov;
    // aim height: the floor under the cursor at our level (or lower: shooting down off a roof)
    this.aim.y = hov ? hov.aimY : g.world.grid.floorAt(this.aim.x, this.aim.z, feet + 1.5) + 1.0;
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
    const p = { x: e.x, z: e.z, y: e.y };
    g.world.grid.move(p, vx * dt, vz * dt, 0.33);
    this.vx = (p.x - e.x) / dt; this.vz = (p.z - e.z) / dt;
    // multi-level: walk up stairs / kerbs (move), fall off ledges and roofs with gravity
    const fl = g.world.grid.floorAt(p.x, p.z, p.y);
    if (fl < p.y - 0.06) {
      this.vy = (this.vy || 0) - 20 * dt; this.fallFrom ??= p.y;
      p.y = Math.max(fl, p.y + this.vy * dt);
    }
    if (p.y <= fl + 0.06) {
      if (this.fallFrom != null) {
        const drop = this.fallFrom - fl;
        if (drop > 1.2) g.audio?.play('jump_land', { x: p.x, z: p.z, vol: Math.min(1, drop / 5) });
        if (drop > 3.4) { const dmg = (drop - 3.4) * 16 * (1 - (st.fall_resist || 0)); g.session.fall?.(dmg); if (dmg > 5 && g.view) g.view.shake = Math.max(g.view.shake || 0, Math.min(0.5, dmg / 60)); }
        this.fallFrom = null;
      }
      this.vy = 0; p.y = fl;
    }
    e.x = p.x; e.z = p.z; e.y = p.y;
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

  // ---------------------------------------------------------------- gamepad aim
  // Right stick sets the direction, deflection the distance: 4 m up to the weapon's range or the screen
  // edge (whichever is closer; the camera leads further while aiming down sights, so ADS / scopes reach
  // further). Releasing the stick keeps the last direction and distance. Light aim assist bends the aim
  // toward the best hostile (ARK / hostile raider) inside a narrow cone and settles on it when close.
  padAim(input, R, feet) {
    const e = this.e, g = this.g, a = this.aim;
    const s = input.aimStick();
    let dx, dz;
    if (s) { dx = s.x; dz = s.z; this.stickSeed = null; }
    else {   // stick not used yet: keep the current aim (e.g. where the mouse was) relative to the player
      if (!this.stickSeed) {
        const ox = a.x - e.x, oz = a.z - e.z, d = Math.hypot(ox, oz);
        this.stickSeed = d > 0.5 ? { x: ox / d, z: oz / d, d } : { x: Math.sin(e.f || 0), z: Math.cos(e.f || 0), d: 7 };
      }
      dx = this.stickSeed.x; dz = this.stickSeed.z;
    }
    const f = PX_PER_M * R.scale, P = R.worldToScreen(e.x, feet + 1.1, e.z);
    const edge = edgeDist(P.x, P.y, dx, dz, R.cssW, R.cssH, Math.min(R.cssW, R.cssH) * 0.06) / f;
    const maxR = Math.max(4.5, Math.min((this.wstats?.range || 25) * (this.ads ? 1 : 0.8), edge));
    let dist = s ? 4 + (maxR - 4) * Math.min(1, s.m / 0.95) : clamp(this.stickSeed.d, 4, maxR);
    let lock = null;
    this.assistId = null;
    if (input.padOptions?.aimAssist !== false) {
      const a0 = Math.atan2(dx, dz), t = this.assistTarget(a0, maxR, feet);
      if (t) {   // pull fades to nothing at the cone edge, so entering the cone never snaps
        const k = 0.8 * (1 - (t.da / t.cone) ** 2);
        const a1 = a0 + t.da * k; dx = Math.sin(a1); dz = Math.cos(a1);
        dist += (t.d - dist) * Math.min(1, k * 1.5);
        this.assistId = t.t.id;
        if (Math.abs(t.da) * (1 - k) * t.d < t.rad + 0.1) lock = t;     // the bent aim already passes through it
      }
    }
    if (lock) {   // on target: aim at it (its height too, like hovering it with the mouse)
      a.x = lock.v.px; a.z = lock.v.pz;
      const sp = R.worldToScreen(lock.v.px, lock.cy, lock.v.pz); input.mouse.x = sp.x; input.mouse.y = sp.y;
      return { id: lock.t.id, aimY: lock.cy, type: lock.t.type };
    }
    a.x = e.x + dx * dist; a.z = e.z + dz * dist;
    this.crosshairAt(input, R, feet);
    return g.view.pickEntity(input.mouse.x, input.mouse.y, e.id);
  }
  // crosshair (input.mouse, CSS px) onto the aim point, at the height the mouse path aims at
  crosshairAt(input, R, feet) { const sp = R.worldToScreen(this.aim.x, feet + 1.1, this.aim.z); input.mouse.x = sp.x; input.mouse.y = sp.y; }
  assistTarget(a0, maxR, feet) {
    const e = this.e, g = this.g, vis = g.view?.vis, grid = g.world?.grid; if (!vis || !grid) return null;
    let best = null;
    for (const v of vis.values()) {
      const t = v.e;
      if (!t || t.id === e.id || t.st === 'dead' || t.st === 'out' || v.cutHidden) continue;
      if (t.type !== 'ark' && !(t.type === 'raider' && this.isHostile(t))) continue;
      const dx = v.px - e.x, dz = v.pz - e.z, d = Math.hypot(dx, dz);
      if (d < 1.2 || d > maxR + 6) continue;
      const rad = t.type === 'ark' ? Math.max(0.5, t.r || 0.6) : 0.45;
      const cone = Math.min(0.28, 0.09 + Math.atan2(rad, d));      // ~5 degrees plus the target's angular radius
      const da = wrapAngle(Math.atan2(dx, dz) - a0);
      if (Math.abs(da) > cone) continue;
      const cy = v.py + (t.alt || 0) + (t.type === 'raider' ? (t.crouch ? 0.8 : 1.15) : 0.4);
      if (!grid.los(e.x, feet + 1.3, e.z, v.px, cy, v.pz)) continue;
      const score = Math.abs(da) / cone + d / (maxR * 3);
      if (!best || score < best.score) best = { v, t, d, da, cone, rad, cy, score };
    }
    return best;
  }
  isHostile(t) {
    if (t.team === this.e.team) return false;
    if (t.brain?.hostileTo) return t.brain.hostileTo(this.e);
    return !t.bot;   // other squads' players; bots without AI state (squad clients) are left alone
  }
  // gamepad rumble: damage taken, and nearby blasts / impacts (camera-shake spikes); own shots in shoot()
  feedback(input) {
    if (!input.usingPad) { this.life0 = this.shake0 = null; return; }
    const e = this.e, life = (e.st === 'downed' ? (e.downHp || 0) : (e.hp || 0)) + (e.sh || 0), shake = this.g.view?.shake || 0;
    if (this.life0 != null && life < this.life0 - 0.5) { const d = this.life0 - life; input.rumble(Math.min(1, 0.3 + d / 35), Math.min(1, 0.45 + d / 50), Math.min(320, 120 + d * 4)); }
    else if (this.shake0 != null && shake > this.shake0 + 0.05) input.rumble(Math.min(1, shake * 1.4), Math.min(1, shake * 1.8), Math.min(400, 100 + shake * 500));
    this.life0 = life; this.shake0 = shake;
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
    this.g.audio?.play(reloadSoundFor(w.id), { x: this.e.x, z: this.e.z });
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
        w.ammo = (w.ammo || 0) + got; g.audio?.play(reloadSoundFor(w.id, 'end'), { x: e.x, z: e.z }); g.invDirty = true;
      }
      return;
    }
    if (e.sprint || this.useItem || this.dodgeT > 0) { this.charge = 0; return; }
    const trig = input.fire() && !g.uiBlocking;
    if (!trig) this.semiLatch = false;
    const auto = ws.mode === 'auto' || ws.mode === 'beam';
    if (ws.mode === 'charge') {
      if (trig && (w.ammo || 0) > 0) { this.charge = Math.min(1, this.charge + dt / (ws.chargeTime || 1)); if (this.charge > 0.05 && !this.chargeSnd) { this.chargeSnd = true; g.audio?.play(chargeSoundFor(w.id), { x: e.x, z: e.z }); } return; }
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
        const mv = TRACER_MOVE[shot.vis] || TRACER_MOVE.rifle;   // same look as everyone else's shots
        g.fx.tracers.add(ox, oy, oz, ox + dx * d, oy + dy * d, oz + dz * d, TRACER[shot.vis] || TRACER.rifle, 0.07, { speed: mv[0], tail: mv[1], head: mv[2] });
      }
    }
    this.lastFireAt = g.time;
    g.view.localMuzzle(e, this.aim.a, ws, shot);
    if (this.input?.usingPad) {
      const r = ws.recoil || 1;
      this.input.rumble(Math.min(1, 0.1 + r * 0.12), Math.min(1, 0.28 + r * 0.1), ws.class === 'launcher' || ws.mode === 'launcher' ? 220 : 70 + r * 15);
      this.shake0 = g.view?.shake ?? this.shake0;    // our own muzzle kick isn't an explosion
    }
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
