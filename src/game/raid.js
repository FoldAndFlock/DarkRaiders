// RaidGame: builds a level, runs the simulation (host/solo) or follows the host (client), drives the
// local player, renders, and reports the outcome. Network specifics live in src/net/; this class
// only talks to `this.session` and an optional `this.net`.
import * as THREE from '../../vendor/three.module.js';
import { Renderer } from '../engine/renderer.js';
import { Lighting } from '../engine/lighting.js';
import { FX } from '../engine/fx.js';
import { VisionCones } from '../engine/cones.js';
import { World, mulberry } from '../engine/world.js';
import { GU } from '../engine/materials.js';
import { HUD, UI } from '../ui/hud.js';
import { drawIcon, drawItemIcon } from '../ui/icons.js';
import { Sim } from './sim.js';
import { View } from './view.js';
import { PlayerController } from './player.js';
import { HostSession } from './session.js';
import { ITEMS, ROMAN, weaponStats, makeStack } from './items.js';
import { capacities, countLoadout, takeFrom, pickUp, allStacks } from './inventory.js';
import { searchTime } from './loot.js';
import { ARK } from '../data/arc.js';
import { CONDITIONS } from '../data/conditions.js';
import { RaidUI } from '../ui/raidui.js';
import { TouchControls } from '../ui/touch.js';
import { hudScaleFor, touchEnabled } from '../ui/settings.js';
import { extractWorldPoints } from '../engine/extracts.js';

const TICK = 1 / 30;
const SQUAD_COLORS = ['#30d0d0', '#f0a030', '#e84a30', '#9a70ff'];

export class RaidGame {
  constructor(opts) {
    this.o = opts;
    this.canvas = opts.canvas; this.hudCanvas = opts.hudCanvas;
    this.audio = opts.audio || null;
    this.profile = opts.profile;
    this.net = opts.net || null;
    this.isHost = !this.net || this.net.isHost;
    this.time = 0; this.feedList = []; this.chatLines = []; this.bannerS = null;
    this.uiBlocking = false; this.invDirty = true;
    this.xp = 0; this.xpLog = []; this.stats = { kills: 0, arkKills: {}, looted: 0, containers: 0, damage: 0 };
    this.pings = new Map();
    this.ended = false;
  }

  // ------------------------------------------------------------------ setup
  async start(onProgress = () => {}) {
    const o = this.o, map = o.map;
    this.mapId = map.id;
    this.cond = o.condition ? CONDITIONS[o.condition] : null;
    this.timeOfDay = o.time || this.cond?.time || 'noon';
    this.weather = o.weather || this.cond?.weather || 'clear';
    onProgress(0.05, 'Spinning up renderer');
    this.R = new Renderer(this.canvas);
    this.L = new Lighting(this.R.scene, this.R);
    this.L.set(this.timeOfDay, this.weather);
    this.L.setQuality(o.settings?.quality || 'medium');
    this.L.onThunder = () => this.audio?.thunder?.();
    this.fx = new FX(this.R.scene);
    await tick();
    onProgress(0.15, 'Building ' + map.name);
    this.world = new World(this.R.scene, map.size[0], map.size[1], { seed: map.seed || 1, base: map.base, cliff: map.cliff });
    map.build(this.world, this.world.rng);
    applyConditionToWorld(this.world, this.cond, o.seed || 1);
    await tick();
    onProgress(0.45, 'Meshing terrain');
    this.world.finalize();
    for (const l of this.world.lamps) this.L.addStatic(l);
    this.cones = new VisionCones(this.R.scene, 64, (x, z, y) => this.world.grid.floorAt(x, z, y ?? 1e9));
    await tick();
    onProgress(0.7, 'Waking the ARK');
    // gameplay state
    if (this.isHost) {
      this.sim = new Sim(this.world, map, { seed: o.seed, condition: this.cond, raidLen: Math.round((o.raidLen || 1800) * (this.cond?.effects?.durationMul || 1)) });
      this.sim.night = this.timeOfDay === 'night';
      this.sim.populate();
      this.spawnAt = o.spawn || this.pickSpawn();
      this.sim.spawnBots(o.bots ?? Math.max(3, Math.round(map.size[0] * map.size[1] / 140000)), [this.spawnAt]);
      this.ents = this.sim.entities;
      this.containersData = this.sim.containers; this.doorsData = this.sim.doors; this.extractsData = this.sim.extracts;
    } else {
      this.ents = new Map();
      this.containersData = this.world.containers.map((c, i) => ({ ...c, i, opened: false }));
      this.doorsData = this.world.doors.map((d, i) => ({ ...d, i, open: !d.locked && !d.closed }));
      this.extractsData = this.world.extracts.map((e, i) => ({ ...e, i, state: 'idle', t: 0, callDur: 0 }));
      for (const x of this.extractsData) x.pts = extractWorldPoints(x);
    }
    for (const d of this.doorsData) d.lockedNow = !!d.locked;
    this.view = new View(this);
    this.hud = new HUD(this.hudCanvas); this.hud.icons = drawIcon; this.hud.itemIcons = drawItemIcon || null;
    // the HUD has its own pixel scale (UI scale setting), independent of the 3D render scale
    this.hudResize = () => this.hud.resize(hudScaleFor(innerWidth, innerHeight, touchEnabled()));
    this.hudResize();
    addEventListener('resize', this.hudResize); addEventListener('dr:uiscale', this.hudResize);
    // spawn the local player (+ remote squad on host)
    const sp = this.spawnAt || o.spawn || this.pickSpawn();
    const lo = o.loadout;
    this.stats0 = o.stats;
    if (this.isHost) {
      const me = this.sim.addRaider({ pid: o.pid || 'local', name: o.name, team: 1, x: sp.x, z: sp.z, outfit: o.outfit, stats: o.stats, shield: lo.shield });
      me.slot = 0; me.regen = o.regen || null;
      this.meId = me.id; this.myTeam = 1;
      this.session = new HostSession(this.sim, me);
      this.net?.hostAttach?.(this, sp);
    } else {
      const me = await this.net.clientJoinRaid(this, sp);
      this.meId = me.id; this.myTeam = me.team;
      this.session = this.net.session;
    }
    this.pc = new PlayerController(this, this.me, lo, o.stats);
    if (lo.shield) this.session.setShield(lo.shield, lo.shield.charge ?? null);
    this.ui = new RaidUI(this);
    this.touch = new TouchControls(this);
    this.R.center.set(this.me.x, this.me.z);
    this.camX = this.me.x; this.camZ = this.me.z;
    this.fx.rain.intensity = this.L.weather.rain || 0;
    this.fx.rain.wind.copy(GU.uWind.value);
    this.audio?.music?.('raid_calm', { map: map.id });
    this.audio?.weather?.({ rain: this.L.weather.rain || 0, wind: Math.min(1, (this.L.weather.wind || 0) / 3), storm: !!this.L.weather.lightning });
    this.audio?.play?.('raid_start');
    this.banner(map.name.toUpperCase(), '#e8e0c8', `${(this.cond?.name || 'Standard conditions')}  -  ${this.timeOfDay.toUpperCase()} ${this.weather.toUpperCase()}`, 5);
    onProgress(1, 'Deploying');
    this.last = performance.now(); this.acc = 0;
    this.running = true;
    return new Promise((resolve) => { this.resolve = resolve; requestAnimationFrame((t) => this.frame(t)); });
  }
  get me() { return this.ents.get(this.meId); }
  // host: random insertion point, preferring ones with no ARK within 32 m (patrol waypoints within 20 m)
  pickSpawn() {
    const sp = this.world.spawns;
    const r = mulberry((this.o.seed || 1) * 13 + 5);
    if (!sp.length) return { x: this.world.w / 2, z: this.world.h / 2 };
    const clear = (p) => {
      let m = 1e9;
      if (this.sim) for (const e of this.sim.entities.values()) if (e.type === 'ark') m = Math.min(m, Math.hypot(e.x - p.x, e.z - p.z));
      for (const s of this.world.arkSpawns) for (const w of s.patrol || []) m = Math.min(m, Math.hypot(w[0] - p.x, w[1] - p.z) + 12);
      return m;
    };
    const scored = sp.map(p => ({ p, d: clear(p) }));
    this.safeSpawns = scored.filter(s => s.d >= 32).length;
    const safe = scored.filter(s => s.d >= 32);
    const pool = safe.length ? safe : scored.sort((a, b) => b.d - a.d).slice(0, Math.max(1, Math.ceil(scored.length / 3)));
    const p = pool[Math.floor(r() * pool.length)].p;
    return { x: p.x, z: p.z };
  }

  // ------------------------------------------------------------------ main loop
  frame(now) {
    if (!this.running) return;
    const dt = Math.max(0, Math.min(0.05, (now - this.last) / 1000)); this.last = now;   // never negative (stale first timestamp)
    this.time += dt;
    const input = this.o.input;
    const me = this.me;
    this.touch.update(dt);
    this.ui.update(dt, input);
    const frozen = this.paused && !this.net;
    if (!frozen && me && (me.st === 'alive' || me.st === 'downed') && !this.ended) this.pc.update(dt, input, this.R);
    // keybinds handled at game level
    if (!input.typing) {
      if (input.hit('ping') || input.pressed.has('Mouse1')) this.session.ping(this.pc.aim.x, this.pc.aim.z);
      if (input.hit('emote')) this.session.emote("DON'T SHOOT!");
      if (me?.st === 'downed' && input.hit('reload')) { this.session.giveUp(); }
    }
    // simulation
    if (this.isHost && !frozen) {
      this.acc += dt;
      let n = 0;
      while (this.acc >= TICK && n++ < 4) {
        this.sim.tick(TICK);
        const evs = this.sim.events; this.sim.events = [];
        for (const ev of evs) this.dispatch(ev);
        this.net?.hostTick?.(evs, TICK);
        this.acc -= TICK;
      }
      this.simTime = this.sim.t; this.timeLeft = this.sim.timeLeft;
    } else if (!this.isHost) {      // (a paused solo host just skips the simulation)
      this.net.clientUpdate(dt);
      for (const x of this.extractsData) if (x.t > 0 && x.state !== 'idle' && x.state !== 'offline') x.t = Math.max(0, x.t - dt);
    }
    // presentation
    this.view.sync(this.ents, dt);
    this.view.drawCones(this.ents, me);
    this.view.updateLights(dt);
    this.view.updExtracts(dt);
    this.camera(dt);
    if (me) this.world.update(dt, me.x, me.z, me.y);
    this.weatherFx(dt);
    this.fx.update(dt);
    this.cones.update(dt);
    GU.uTime.value += dt;
    this.L.update(dt, this.R.view.x || this.camX, this.R.view.y || this.camZ, this.R.viewW, this.R.viewH);
    this.R.grade.damage = Math.max(0, (this.R.grade.damage || 0) - dt * 1.5);
    if (me && me.st === 'downed') this.R.grade.damage = 0.35 + 0.1 * Math.sin(this.time * 4);
    this.R.render(dt);
    this.audio?.setListener?.(this.camX, this.camZ);
    this.drawHUD(dt);
    if (input.pressed.has('F3')) this.showFps = !this.showFps;
    this.poiT -= dt;
    if (this.poiT <= 0 && me && me.st === 'alive') {
      this.poiT = 0.5;
      // current POI = the tightest one we're inside (search/loot quest steps can require a POI)
      let cur = null;
      for (const p of this.world.pois) {
        const d = Math.hypot(p.x - me.x, p.z - me.z), r = p.r || 20;
        if (d > r) continue;
        if (!cur || r < (cur.r || 20)) cur = p;
        if (this.visited.has(p.id)) continue;
        this.visited.add(p.id); this.stats.discovered++;
        this.feed('DISCOVERED  ' + p.name.toUpperCase(), '#e8e0c8'); this.addXP(40);
        this.questEvent('visit', { poi: p.id, aliases: p.aliases || [], loadout: this.pc?.lo });
      }
      this.curPoi = cur;
      // re-fire 'visit' while inside so "repair X at POI" steps complete once the parts are carried in
      this.visitT = (this.visitT || 0) - 0.5;
      if (cur && this.visitT <= 0) { this.visitT = 3; this.questEvent('visit', { poi: cur.id, aliases: cur.aliases || [], loadout: this.pc?.lo }); }
      if (me.cold && !this.coldWarned) { this.coldWarned = true; this.banner('FREEZING', '#58c8f0', 'Get indoors to warm up', 3); }
      if (!me.cold) this.coldWarned = false;
    }
    if (this.showFps) { this.fpsAcc = (this.fpsAcc || 0) * 0.95 + dt * 0.05; const c = this.hud.x; c.fillStyle = '#000'; c.fillRect(this.hud.W - 60, 2, 58, 10); c.fillStyle = '#68e088'; c.font = '8px monospace'; c.fillText(`${(1 / this.fpsAcc).toFixed(0)} FPS ${this.R.lw}x${this.R.lh}`, this.hud.W - 58, 10); }
    this.checkEnd(dt);
    input.endFrame();
    requestAnimationFrame((t) => this.frame(t));
  }
  dispatch(ev) {
    this.view.event(ev);
    switch (ev.e) {
      case 'opened': { const c = this.containersData[ev.i]; if (c) c.opened = true; break; }
      case 'door': { const d = this.doorsData[ev.i]; if (d) d.open = ev.open; break; }
      case 'unlocked': { const d = this.doorsData[ev.i]; if (d) { d.lockedNow = false; d.locked = null; } break; }
      case 'xcall': case 'xopen': case 'xclose': case 'xgone': case 'xidle': case 'xoffline': {
        // clients mirror state + timer from the event (snapshots keep correcting it)
        const x = this.extractsData[ev.i];
        if (x && !this.isHost) {
          x.state = { xcall: 'called', xopen: 'open', xclose: 'closing', xgone: 'gone', xidle: 'idle', xoffline: 'offline' }[ev.e];
          x.t = ev.t ?? 0;
          if (ev.e === 'xcall') x.callDur = ev.t;
          if (ev.e === 'xoffline' && ev.why === 'used') x.used = true;
        }
        break;
      }
    }
  }
  camera(dt) {
    const me = this.me; if (!me) return;
    let tx = me.x, tz = me.z - (me.y || 0) * 0;
    // spectate a teammate after death / extraction
    if ((me.st === 'dead' || me.st === 'out') && this.spectate) { const s = this.ents.get(this.spectate); if (s) { tx = s.x; tz = s.z; } }
    else if (this.pc && !this.uiBlocking) {
      const lead = this.pc.ads ? 0.42 : 0.22, max = this.pc.ads ? 11 : 6;
      let lx = (this.pc.aim.x - me.x) * lead, lz = (this.pc.aim.z - me.z) * lead;
      const l = Math.hypot(lx, lz); if (l > max) { lx *= max / l; lz *= max / l; }
      tx += lx; tz += lz;
    }
    // oblique: lift the camera by the ground height so the player stays centred on screen
    tz -= (me.y || 0) * 0.8;
    const k = 1 - Math.pow(0.0005, dt);
    this.camX += (tx - this.camX) * k; this.camZ += (tz - this.camZ) * k;
    this.R.center.set(this.camX, this.camZ);
  }
  weatherFx(dt) {
    const w = this.L.weather;
    this.fx.rain.intensity = w.rain || 0;
    if (w.rain) {
      this.fx.rain.update(dt, this.camX, this.camZ, this.R.viewW, this.R.viewH, (x, z) => {
        const lvl = this.world.grid.waterLevel(x, z);
        if (lvl != null) this.fx.ripples.add(x, z, lvl + 0.02, 0.22, 0.6, 0.7);
        else if (Math.random() < 0.3) this.fx.splash(x, z, this.world.grid.floorAt(x, z, 1e9) + 0.02);   // splashes on the top surface (roofs, lids)
      });
    }
    if (w.sand && Math.random() < 0.9) for (let k = 0; k < 4; k++) this.fx.parts.emit({ x: this.camX + (Math.random() - .5) * this.R.viewW * 1.2, y: (this.me?.y ?? this.world.groundAt(this.camX, this.camZ)) + Math.random() * 3, z: this.camZ + (Math.random() - .5) * this.R.viewH * 1.6, vx: GU.uWind.value.x * 4, vz: GU.uWind.value.y * 4, life: 1.2, size: 1, color: 0xd8c090, alpha: 0.9 });
    if (w.snow) for (let k = 0; k < 3; k++) this.fx.parts.emit({ x: this.camX + (Math.random() - .5) * this.R.viewW * 1.2, y: (this.me?.y ?? this.world.groundAt(this.camX, this.camZ)) + 6 + Math.random() * 4, z: this.camZ + (Math.random() - .5) * this.R.viewH * 1.6, vx: GU.uWind.value.x, vy: -1.5, vz: GU.uWind.value.y, life: 4, size: 1, color: 0xf0f4ff, alpha: 0.9 });
    // drifting dust motes / fireflies at night for atmosphere
    if (this.L.isNight && Math.random() < dt * 6) this.fx.glow.emit({ x: this.camX + (Math.random() - .5) * this.R.viewW, y: (this.me?.y ?? this.world.groundAt(this.camX, this.camZ)) + 0.5 + Math.random() * 1.5, z: this.camZ + (Math.random() - .5) * this.R.viewH, vx: (Math.random() - .5) * 0.4, vy: 0.1, vz: (Math.random() - .5) * 0.4, life: 3, size: 1, color: 0xc0ff60, alpha: 0.8 });
  }

  // ------------------------------------------------------------------ interactions
  searchTime(kind) { return searchTime(kind); }
  containerOpened(i) { return !!this.containersData[i]?.opened; }
  doorOpen(i) { return !!this.doorsData[i]?.open; }
  extractState(i) { return this.extractsData[i]?.state || 'idle'; }
  addDynamicContainer(c) { if (!this.isHost) this.containersData[c.i] = { ...c, opened: false }; }
  async doInteract(it) {
    const lo = this.pc.lo;
    switch (it.kind) {
      case 'ladder': {
        const l = this.world.ladders[it.ref], me = this.me; if (!l || !me) return;
        const [x, z, y] = it.up ? [l.x1, l.z1, l.y1] : [l.x0, l.z0, l.y0];
        me.x = x; me.z = z; me.y = y; this.pc.vy = 0; this.pc.fallFrom = null;
        this.session.state({ x, y, z });
        this.audio?.play('step_metal', { x, z, vol: 0.6 });
        return;
      }
      case 'container': case 'loot': {
        const c = it.kind === 'container' ? this.containersData[it.ref] : null;
        if (c?.locked && !c.unlocked) {
          const key = this.keyFor(c.room || c.locked);
          if (!key) { this.hudMsg('LOCKED - REQUIRES ' + (this.keyName(c.room || c.locked) || 'A KEY'), '#e84a30'); return; }
          takeFrom([lo.backpack, lo.safe, lo.quick], key, 1); c.unlocked = true; this.hudMsg('UNLOCKED WITH ' + ITEMS[key].name.toUpperCase(), '#68e088');
        }
        const items = await this.session.open(it.kind, it.ref);
        if (!items) return;
        if (it.kind === 'container' && !c.searchedByMe) { c.searchedByMe = true; this.stats.containers++; this.addXP(15); this.questEvent('search', { container: c.kind }); }
        this.audio?.play('container_open', { x: it.x, z: it.z });
        this.ui.openLoot(it, items);
        break;
      }
      case 'door': {
        const d = this.doorsData[it.ref];
        let hasKey = false;
        if (d.lockedNow) { const k = this.keyFor(d.locked); if (k) { takeFrom([lo.backpack, lo.safe, lo.quick], k, 1); hasKey = true; this.hudMsg('UNLOCKED WITH ' + ITEMS[k].name.toUpperCase(), '#68e088'); } }
        this.session.door(it.ref, hasKey);
        break;
      }
      case 'extract': this.session.callExtract(it.ref); break;
      case 'depart': this.session.departExtract(it.ref); break;
      case 'info': break;
      case 'hatch': {
        const x = this.extractsData[it.ref];
        if (x?.state === 'open') return;
        if (this.extractsData.some(h => h.kind === 'hatch' && h.state === 'open')) { this.hudMsg('ANOTHER HATCH IS OPEN', '#e84a30'); return; }
        // the map's needsKey (an item id or a key room such as 'raider_hatch'), any raider hatch key otherwise
        const want = x?.needsKey || 'raider_hatch_key';
        const k = Object.keys(ITEMS).find(id => (id === want || id === 'raider_hatch_key' || (ITEMS[id].key && (ITEMS[id].key.room === want || ITEMS[id].key.room === 'raider_hatch'))) && countLoadout(lo, id) > 0);
        if (!k) { this.hudMsg('REQUIRES A RAIDER HATCH KEY', '#e84a30'); return; }
        takeFrom([lo.backpack, lo.safe, lo.quick], k, 1);
        this.hudMsg('HATCH OPEN - STEP IN (15S)', '#68e088');
        this.session.hatch(it.ref);
        break;
      }
      case 'revive': this.session.reviveNow(it.ref); this.addXP(100, 'Revived a squadmate'); break;
    }
  }
  keyFor(room) {
    if (!room) return null;
    const lo = this.pc.lo;
    for (const id of Object.keys(ITEMS)) { const k = ITEMS[id].key; if (k && (k.room === room) && (k.map === this.mapId || k.map === 'any') && countLoadout(lo, id) > 0) return id; }
    return null;
  }
  keyName(room) { for (const id of Object.keys(ITEMS)) { const k = ITEMS[id].key; if (k && k.room === room && k.map === this.mapId) return ITEMS[id].name.toUpperCase(); } return null; }
  // pick up a stack from a loot list into the loadout
  async takeItem(kind, ref, stack) {
    const lo = this.pc.lo;
    const got = await this.session.take(kind, ref, stack.uid);
    if (!got) return false;
    const left = pickUp(lo, got);
    if (left > 0) { this.session.put(kind, ref, { ...got, qty: left }); this.hudMsg('BACKPACK FULL', '#e84a30'); }
    const taken = got.qty - left;
    if (taken > 0) {
      this.stats.looted += taken;
      const d = ITEMS[got.id];
      this.audio?.play(d?.rarity === 'legendary' ? 'loot_legendary' : (d?.rarity === 'epic' || d?.rarity === 'rare') ? 'loot_rare' : 'loot_pickup');
      this.feed(`+${taken} ${d?.name || got.id}`, rarityHex(d?.rarity));
      this.questEvent('loot', { item: got.id, qty: taken });
      if (d?.type === 'weapon' && !this.pc.weapon) { this.pc.slot = lo.weapons.findIndex(w => w); this.pc.applyWeaponVisual(); }
    }
    this.invDirty = true;
    return true;
  }
  dropStack(stack) { this.session.dropItems([stack]); this.invDirty = true; }

  // ------------------------------------------------------------------ feedback
  addXP(n, label = null) { const m = Math.round(n * (this.stats0?.xp_gain || 1)); this.xp += m; if (label) this.feed(`+${m} XP  ${label}`, UI.yellow); }
  onXP(xp, label) { this.addXP(xp, label); }
  feed(text, color = UI.cream) { this.feedList.unshift({ text, color, ttl: 4 }); this.feedList.length = Math.min(this.feedList.length, 6); }
  hudMsg(text, color) { this.feed(text, color); }
  banner(text, color, sub = null, dur = 3) { this.bannerS = { text, color, sub, ttl: dur }; }
  onHurt(ev) { this.R.grade.damage = Math.min(0.6, (this.R.grade.damage || 0) + 0.25); this.view.shake = Math.max(this.view.shake, 0.12); this.lastHurtDir = ev.src; }
  onHitMarker(r) { this.hitMark = { r, t: 0.18 }; }
  onAlert(ev) { if (this.me && Math.hypot(ev.x - this.me.x, ev.z - this.me.z) < 40) { this.audio?.music?.('combat'); this.combatT = 12; } }
  onDowned(ev) {
    if (ev.id === this.meId) { this.banner('DOWNED', '#e84a30', this.squadAlive() ? 'Crawl to cover - your squad can revive you  [R] give up' : 'Bleeding out...  [R] give up', 4); this.audio?.music?.('raid_tense'); }
    else this.feed(`${this.view.nameOf(ev.id)} is DOWN`, '#e84a30');
  }
  onKilled(ev) {
    const e = this.ents.get(ev.id);
    if (ev.src === this.meId && e?.type === 'raider') { this.stats.kills++; this.addXP(e.bot ? 300 : 500, 'Raider eliminated'); this.questEvent('kill', { target: 'raider' }); }
    if (e?.type === 'raider' && ev.id !== this.meId) this.feed(`${ev.name} was eliminated${ev.by ? ' by ' + ev.by : ''}`, '#9a9484');
    if (ev.id === this.meId) this.onLocalDeath();
  }
  onExtracted(ev) {
    if (ev.id === this.meId) this.onLocalExtract();
    else { const e = this.ents.get(ev.id); if (e && !e.bot) this.feed(`${ev.name} EXTRACTED`, '#68e088'); }
  }
  near(x, r) { return this.me && Math.hypot(x.x - this.me.x, x.z - this.me.z) < r; }
  onExtractCall(ev) {
    const x = this.extractsData[ev.i]; if (!x) return;
    const loud = x.kind !== 'airshaft';          // the alarm carries across the zone; the dropship engine less so
    if (this.near(x, loud ? 140 : 70)) {
      this.banner('EXTRACTION CALLED', '#f0c030', `${x.name} - ${extractNoun(x.kind).toLowerCase()} arriving in ${Math.round(ev.t || x.callDur || 38)}s. Hold the area.`, 4);
      if (this.near(x, 120)) this.audio?.music?.('extract');
    }
  }
  onExtractOpen(ev) {
    const x = this.extractsData[ev.i]; if (!x) return;
    if (x.kind === 'hatch') { if (this.near(x, 25)) this.banner('RAIDER HATCH OPEN', '#68e088', 'Step onto it - it seals in 15s', 3); return; }
    if (this.near(x, 70)) this.banner(extractNoun(x.kind) + ' OPEN', '#68e088', `Get inside and pull the departure lever - it leaves on its own in ${Math.round(ev.t || 90)}s`, 4);
  }
  onExtractClose(ev) { const x = this.extractsData[ev.i]; if (x && this.near(x, 70)) this.banner('DOORS CLOSING', '#e84a30', `${x.name} departs in 10s - get inside!`, 3); }
  onEmote(ev) { this.emotes = this.emotes || new Map(); this.emotes.set(ev.id, { text: ev.text, ttl: 3 }); }
  onChat(ev) { this.chatLines.push({ from: ev.from, text: ev.text, ttl: 10, color: SQUAD_COLORS[(ev.slot ?? 0) % 4] }); if (this.chatLines.length > 30) this.chatLines.shift(); this.audio?.play('chat_msg'); }
  onPing(ev) { this.pings.set(ev.by, { x: ev.x, z: ev.z, t: 8, slot: ev.slot }); }
  squadAlive() { for (const e of this.ents.values()) if (e.type === 'raider' && !e.bot && e.team === this.myTeam && e.id !== this.meId && e.st === 'alive') return true; return false; }
  questEvent(kind, data) {
    const at = this.curPoi && (kind === 'search' || kind === 'loot') ? { poi: this.curPoi.id, aliases: this.curPoi.aliases || [] } : {};
    this.o.onQuestEvent?.(kind, { ...at, ...data, map: this.mapId });
  }

  onLocalDeath() {
    if (this.localDone) return; this.localDone = 'dead';
    const lo = this.pc.lo;
    // everything except the safe pocket drops for others to loot
    const drop = [lo.augment, lo.shield, ...lo.weapons, ...lo.backpack, ...lo.quick].filter(Boolean);
    if (drop.length) this.session.dropItems(drop.map(s => ({ ...s })), this.o.name);
    this.banner('YOU DIED', '#e84a30', 'Everything but your safe pocket is lost to the surface', 5);
    this.audio?.music?.('death');
    this.finish('dead');
  }
  onLocalExtract() {
    if (this.localDone) return; this.localDone = 'extracted';
    this.banner('EXTRACTED', '#68e088', 'Welcome back to Speranzia', 5);
    this.addXP(250, 'Extraction');
    this.audio?.music?.('extracted');
    this.questEvent('extract', {});
    this.finish('extracted');
  }
  finish(outcome) {
    const lo = this.pc.lo;
    const kept = outcome === 'extracted' ? lo : { augment: null, shield: null, weapons: [null, null, null], backpack: [], quick: [], safe: lo.safe.map(s => s && { ...s }) };
    const shieldCharge = this.me?.sh;
    if (kept.shield) kept.shield.charge = shieldCharge;
    this.result = { outcome, loadout: kept, xp: this.xp, stats: this.stats, map: this.mapId, time: this.simTime || 0 };
    // pick someone to spectate in co-op
    for (const e of this.ents.values()) if (e.type === 'raider' && !e.bot && e.team === this.myTeam && e.id !== this.meId && (e.st === 'alive' || e.st === 'downed')) { this.spectate = e.id; break; }
    this.net?.reportDone?.(outcome);
    if (!this.net || !this.spectate) this.endIn = 4.5;
  }
  checkEnd(dt) {
    if (this.endIn != null) { this.endIn -= dt; if (this.endIn <= 0) this.end(); }
    if (this.isHost && this.sim.raidEnded && !this.localDone) this.onLocalDeath();
    if (this.combatT) { this.combatT -= dt; if (this.combatT <= 0) { this.combatT = 0; this.audio?.music?.('raid_calm', { map: this.mapId }); } }
  }
  end() {
    if (this.ended) return;
    this.ended = true; this.running = false;
    this.ui.destroy(); this.touch?.destroy();
    removeEventListener('resize', this.hudResize); removeEventListener('dr:uiscale', this.hudResize);
    this.R.gl.setAnimationLoop(null);
    this.resolve(this.result || { outcome: 'dead', loadout: null, xp: this.xp, stats: this.stats, map: this.mapId });
    this.dispose();
  }
  dispose() {
    try { this.R.scene.traverse(o => { o.geometry?.dispose?.(); }); this.R.gl.dispose(); } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------------ HUD
  // which level the player is on (multi-level maps): underground / upper floor / rooftop / elevated
  whereLabel(me) {
    if (!me) return null;
    const w = this.world, g = w.grid, id = g.insideAt(me.x, me.z, me.y, w.buildings);
    if (id >= 0) {
      const b = w.buildings[id];
      if (b.under) return 'UNDERGROUND' + (b.name ? ' - ' + b.name.toUpperCase() : '');
      const k = Math.round((me.y - b.floorY) / (b.sh || 3.2));
      return k > 0 ? `FLOOR ${k + 1}` + (b.name ? ' - ' + b.name.toUpperCase() : '') : null;
    }
    const i = g.idx(me.x, me.z);
    for (const bid of i >= 0 ? [g.indoor[i], g.indoor2[i]] : []) if (bid >= 0 && !w.buildings[bid].under && me.y >= w.buildings[bid].roofY - 0.4) return 'ROOFTOP';
    if (me.y > w.groundAt(me.x, me.z) + 2.5 && g.ceilAt(me.x, me.z, me.y) === Infinity) return 'ELEVATED';
    return null;
  }
  // crosshair position (CSS px): the mouse, or the aim point projected to the screen when a stick aims
  aimScreen(me) {
    const input = this.o.input;
    if (input.mode === 'kbm' || !this.pc) return { x: input.mouse.x, y: input.mouse.y };
    // pad aim locked onto an entity (e.g. a flying ARK): player.js puts input.mouse on its body
    if (input.mode === 'pad' && this.pc.aim.entity) return { x: input.mouse.x, y: input.mouse.y };
    const a = this.pc.aim, s = this.R.worldToScreen(a.x, (me?.y || 0) + 1.1, a.z);
    return { x: s.x, y: s.y, dim: input.mode === 'touch' && !this.o.input.virtual.fire && !this.touch?.aim };
  }
  quickLabel(i) { try { return String(this.o.input.label?.('quick' + (i + 1)) || ''); } catch (e) { return ''; } }
  // short key / button label for HUD prompts ('E', 'A', 'LB+X'); the HUD bar shows hold progress itself
  keyLabel(action, def) { try { const l = this.o.input.label?.(action); return l && l !== '?' ? String(l).toUpperCase().replace(/^HOLD\s+/, '').slice(0, 5) : def; } catch (e) { return def; } }
  drawHUD(dt) {
    const me = this.me, pc = this.pc, R = this.R;
    for (const f of this.feedList) f.ttl -= dt;
    this.feedList = this.feedList.filter(f => f.ttl > 0);
    for (const c of this.chatLines) c.ttl -= dt;
    if (this.bannerS) { this.bannerS.ttl -= dt; if (this.bannerS.ttl <= 0) this.bannerS = null; }
    if (this.hitMark) { this.hitMark.t -= dt; if (this.hitMark.t <= 0) this.hitMark = null; }
    for (const [k, p] of this.pings) { p.t -= dt; if (p.t <= 0) this.pings.delete(k); }
    if (!me) return;
    const lo = pc.lo, ws = pc.wstats, w = pc.weapon;
    const caps = pc.caps;
    const st = {
      raid: { map: this.o.map.name, time: Math.max(0, this.timeLeft ?? 0), condition: (this.timeLeft ?? 1) <= 0 ? 'OVERTIME - EXTRACTION IN PROGRESS' : (this.cond?.name || '').toUpperCase(), weather: `${this.timeOfDay.toUpperCase()}  ${this.weather.toUpperCase()}`, where: this.whereLabel(me) },
      player: { name: this.o.name, level: this.profile?.level, hp: me.st === 'downed' ? me.downHp : me.hp, hpMax: me.st === 'downed' ? 75 : me.maxHp, shield: me.sh, shieldMax: me.shMax, stamina: pc.stamina / pc.stats.max_stamina, weight: pc.weight(), weightMax: caps.weightLimit },
      weapon: w ? { name: ITEMS[w.id].name, tier: ROMAN[w.tier || 1], rarity: ITEMS[w.id].rarity, mag: w.ammo || 0, reserve: countLoadout(lo, ws.ammo), mode: pc.reloadT > 0 ? 'RELOADING' : ((w.dur ?? 1) <= 0 ? 'BROKEN' : ws.mode.toUpperCase()), alt: lo.weapons.filter((x, i) => x && i !== pc.slot).map(x => ITEMS[x.id].name).join(' / ') } : { name: 'Unarmed', tier: '', rarity: 'common', mag: 0, reserve: 0, mode: '' },
      // slot labels follow the device: 1-6 on keyboard, d-pad arrows on a pad ('' on touch -> the HUD shows 1-6)
      quick: lo.quick.map((s, i) => { const key = this.quickLabel(i); return s ? { item: s.id, icon: ITEMS[s.id]?.icon, count: s.qty, active: pc.useSlot === i && pc.useItem, key } : { key }; }),
      feed: this.feedList,
      chat: { lines: this.chatLines, open: this.ui.chatOpen, input: this.ui.chatInput || '', teamCount: 0 },
      banner: this.bannerS,
      crosshair: this.uiBlocking ? null : { ...this.aimScreen(me), spread: (ws ? (pc.ads ? ws.adsSpread : ws.spread) + pc.bloom : 2) * 1.2, hit: !!this.hitMark },
      swapKey: this.keyLabel('swap', 'Q'),
    };
    // team
    const team = [];
    let slot = 0;
    for (const e of this.ents.values()) if (e.type === 'raider' && !e.bot && e.team === this.myTeam && e.id !== this.meId) team.push({ name: e.name, color: SQUAD_COLORS[(e.slot ?? ++slot) % 4], hp: e.st === 'downed' ? 0 : e.hp / e.maxHp, downed: e.st === 'downed' });
    if (team.length) { st.team = team; st.chat.teamCount = team.length; }
    // interaction prompt
    if (pc.interact && (me.st === 'alive' || pc.interact.kind === 'selfrevive')) st.prompt = { text: pc.interact.label, key: this.o.input.mode === 'touch' ? '>' : this.keyLabel('interact', 'E'), progress: pc.holdFor ? Math.min(1, pc.holdT / pc.interact.time) : null };
    else if (pc.useItem) st.prompt = { text: 'USING ' + ITEMS[pc.useItem].name.toUpperCase(), key: '-', progress: 1 - pc.useT / pc.useTotal };
    else if (pc.reloadT > 0) st.prompt = null;
    // quests
    st.objectives = this.o.objectives?.() || null;
    // compass + off-screen ARK
    st.heading = 0;
    const marks = [];
    for (const x of this.extractsData) if (x.state !== 'offline') marks.push({ bearing: Math.atan2(x.x - me.x, -(x.z - me.z)), color: x.state === 'closing' ? '#e84a30' : x.state === 'called' || x.state === 'open' ? '#f0c030' : x.kind === 'hatch' ? '#c8a020' : '#68e088' });
    for (const p of this.pings.values()) marks.push({ bearing: Math.atan2(p.x - me.x, -(p.z - me.z)), color: SQUAD_COLORS[(p.slot ?? 0) % 4] });
    st.compassMarks = marks;
    const off = [], markers = [];
    for (const e of this.ents.values()) {
      if (e.type !== 'ark' || e.st === 'dead') continue;
      const d = Math.hypot(e.x - me.x, e.z - me.z);
      if (d > 48 && e.st !== 'alert') continue;
      if (d > 75) continue;
      const s = R.worldToScreen(e.x, (e.y || 0) + (e.alt || 0), e.z);
      if (s.x < 0 || s.y < 0 || s.x > R.cssW || s.y > R.cssH) off.push({ sx: s.x, sy: s.y, label: `${(ARK[e.kind]?.name || 'ARK').toUpperCase()} ${Math.round(d)}M`, alert: e.st === 'alert', color: e.st === 'search' ? UI.orange : (e.vis || 0) > 0.05 ? UI.yellow : '#c8dcff' });
    }
    st.offscreen = off;
    // world markers: extracts near, pings, squad names, emotes
    for (const x of this.extractsData) {
      const d = Math.hypot(x.x - me.x, x.z - me.z); if (d > 90) continue;
      const s = R.worldToScreen(x.x, (x.y ?? this.world.groundAt(x.x, x.z)) + 2.5, x.z);
      const sec = `${Math.max(0, Math.ceil(x.t || 0))}S`;
      const sub = x.state === 'called' ? 'INBOUND ' + sec : x.state === 'open' ? (x.kind === 'hatch' ? 'OPEN ' : 'BOARD - LEAVES IN ') + sec : x.state === 'closing' ? 'DEPARTING ' + sec
        : x.state === 'gone' ? 'DEPARTED' : x.state === 'offline' ? (x.used ? 'CLOSED' : 'OFFLINE') : `${Math.round(d)}M`;
      markers.push({ sx: s.x, sy: s.y, label: x.name.toUpperCase(), sub, color: x.state === 'closing' ? '#e84a30' : x.state === 'called' ? '#f0c030' : x.kind === 'hatch' ? '#f0c030' : '#68e088' });
    }
    for (const p of this.pings.values()) { const s = R.worldToScreen(p.x, this.view.floorNear(p.x, p.z, p.y) + 1, p.z); markers.push({ sx: s.x, sy: s.y, label: 'PING', sub: `${Math.round(Math.hypot(p.x - me.x, p.z - me.z))}M`, color: SQUAD_COLORS[(p.slot ?? 0) % 4] }); }
    if (this.emotes) for (const [id, em] of this.emotes) { em.ttl -= dt; if (em.ttl <= 0) { this.emotes.delete(id); continue; } const v = this.view.vis.get(id); if (v) { const s = R.worldToScreen(v.px, v.py + 2.4, v.pz); markers.push({ sx: s.x, sy: s.y, label: '"' + em.text + '"', color: '#e8e0c8', bubble: true }); } }
    for (const e of this.ents.values()) if (e.type === 'raider' && !e.bot && e.team === this.myTeam && e.id !== this.meId && e.st !== 'out') { const v = this.view.vis.get(e.id); if (v) { const s = R.worldToScreen(v.px, v.py + 2.3, v.pz); markers.push({ sx: s.x, sy: s.y, label: e.name, color: SQUAD_COLORS[(e.slot ?? 0) % 4], small: true }); } }
    st.markers = markers;
    if (me.st === 'dead' || me.st === 'out') { st.crosshair = null; st.prompt = null; }
    this.hud.touch = this.touch?.layout() || null;
    this.hud.draw(st, dt);
  }
}

function tick() { return new Promise(r => setTimeout(r, 0)); }
export function extractNoun(kind) { return kind === 'metro' ? 'METRO' : kind === 'airshaft' ? 'DROPSHIP' : kind === 'hatch' ? 'RAIDER HATCH' : 'ELEVATOR'; }

// Condition-driven world additions, deterministic from the raid seed so every peer agrees.
function applyConditionToWorld(w, cond, seed) {
  // map markers tied to a condition ({ condition: id | [ids] } / { notCondition }) only exist under it;
  // runs identically on host and clients so container indices stay in sync
  const cid = cond?.id || null, keep = (m) => (!m.condition || (cid && [].concat(m.condition).includes(cid))) && !(m.notCondition && cid && [].concat(m.notCondition).includes(cid));
  w.containers = w.containers.filter(keep);
  w.props = w.props.filter(p => keep(p.opts || {}));
  w.lamps = w.lamps.filter(keep);
  const fx = cond?.effects; if (!fx) return;
  const r = mulberry(seed * 977 + 31);
  const pois = w.pois.length ? w.pois : [{ x: w.w / 2, z: w.h / 2, r: 40 }];
  const spot = (rad = 25) => {
    for (let k = 0; k < 30; k++) {
      const p = pois[Math.floor(r() * pois.length)], a = r() * Math.PI * 2, d = (p.r || 20) * 0.4 + r() * rad;
      const x = p.x + Math.cos(a) * d, z = p.z + Math.sin(a) * d;
      if (x > 5 && z > 5 && x < w.w - 5 && z < w.h - 5) return [x, z];
    }
    return [w.w / 2, w.h / 2];
  };
  const add = (kind, n, tier = 2, label = null) => { for (let i = 0; i < n; i++) { const [x, z] = spot(); w.container(kind, x, z, r() * 6, { tier, label }); } };
  if (fx.cacheMul) add('raider_cache', Math.round(6 * fx.cacheMul), 3, 'Uncovered Cache');
  if (fx.huskMul) add('arc_husk', Math.round(10 * fx.huskMul), 2, 'ARK Husk');
  if (fx.probeMul) add('arc_crate', Math.round(4 * fx.probeMul), 3, 'Prospecting Probe');
  if (fx.natureLootMul) add('plant', Math.round(20 * fx.natureLootMul), 1);
  if (fx.firstWaveCaches) add('raider_cache', fx.firstWaveCaches, 3, 'First Wave Cache');
  for (const [kind, mn, mx] of fx.spawnGroups || []) { const n = mn + Math.floor(r() * (mx - mn + 1)); for (let i = 0; i < n; i++) { const [x, z] = spot(40); w.arkSpawn(kind, x, z, { count: 1 }); } }
}
function rarityHex(r) { return UI.rarity[r] || UI.cream; }
