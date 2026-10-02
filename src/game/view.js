// Client-side presentation of a raid: entity visuals (interpolated), event-driven FX + audio,
// ARK gaze lights + traced vision cones, flashlights, picking and interaction targets.
import * as THREE from '../../vendor/three.module.js';
import { markEntity, OBLIQUE_K } from '../engine/renderer.js';
import { RaiderModel, OUTFITS, arcMesh, gunGeo, voxMesh } from '../engine/models.js';
import { createArkModel } from '../engine/arkmodels.js';
import { ContainerRenderer, containerGeo } from '../engine/containers.js';
import { GU, litVox } from '../engine/materials.js';
import { SURF } from '../engine/world.js';
import { coneColor } from '../engine/cones.js';
import { ARK } from '../data/arc.js';
import { ITEMS } from './items.js';
import { Vox } from '../engine/voxel.js';

const tmpV = new THREE.Vector3();
const TEAM_COL = [0x30d0d0, 0xf0a030, 0xe84a30, 0x9a70ff];
const SURF_FX = { [SURF.dirt]: 0x6a5a40, [SURF.concrete]: 0x8a8a84, [SURF.metal]: 0xffd080, [SURF.sand]: 0xc0a070, [SURF.water]: 0xb0c8d0, [SURF.wood]: 0x7a5a3a, [SURF.grass]: 0x4a6a2e, [SURF.tile]: 0x9a948a };
const SURF_SND = { [SURF.dirt]: 'step_grass', [SURF.concrete]: 'step_concrete', [SURF.metal]: 'step_metal', [SURF.sand]: 'step_sand', [SURF.water]: 'step_water', [SURF.wood]: 'step_wood', [SURF.grass]: 'step_grass', [SURF.tile]: 'step_concrete' };
const HIT_SND = { [SURF.metal]: 'hit_metal', [SURF.wood]: 'hit_wood', [SURF.dirt]: 'hit_dirt', [SURF.grass]: 'hit_dirt', [SURF.sand]: 'hit_dirt' };
const TRACER = { rifle: 0xffe0a0, smg: 0xffe8b0, pistol: 0xffe8c0, shotgun: 0xffd090, sniper: 0xfff0d0, heavy: 0xffd080, energy: 0x60d8ff, launcher: 0xffa040, ark: 0xff6040, laser: 0xff3020 };

let projGeo = null;
function projMesh(kind) {
  if (!projGeo) { const v = new Vox(3, 3, 3, 0.1, [1.5, 1.5, 1.5]); v.box(0, 0, 0, 2, 2, 2, 0x3a4a3a); v.set(1, 2, 1, 0xffd040); v.glow(0xffd040); projGeo = v.build(); }
  return voxMesh(projGeo);
}

export class View {
  constructor(game) {
    this.g = game; this.R = game.R; this.L = game.L; this.fx = game.fx; this.cones = game.cones; this.world = game.world;
    this.vis = new Map();
    this.flashes = [];            // transient lights {x,y,z,color,I,range,t,life}
    this.containers = new ContainerRenderer(this.R.scene);
    this.containers.build(game.containersData);
    this.doorMeshes = [];
    this.buildDoors(game.doorsData);
    this.extractVis = [];
    this.buildExtracts(game.extractsData);
    this.highlight = null;
    this.shake = 0;
    this.hitMarkers = [];
    this.alpha = 1;
  }
  // -------------------------------------------------------------- static-ish
  buildDoors(doors) {
    const mat = litVox({ xray: true });
    const v = new Vox(10, 22, 1, 0.1, [5, 0, 0.5]); v.box(0, 0, 0, 9, 21, 0, 0x5a4a3a); v.box(1, 1, 0, 8, 20, 0, 0x6a5440); v.set(8, 10, 0, 0xc8a040);
    const g = v.build();
    const vl = new Vox(10, 22, 1, 0.1, [5, 0, 0.5]); vl.box(0, 0, 0, 9, 21, 0, 0x4a5258); vl.box(4, 9, 0, 5, 11, 0, 0xff3020); vl.glow(0xff3020);
    const gl = vl.build();
    for (const d of doors) {
      const m = new THREE.Mesh(d.locked ? gl : g, mat);
      const y = this.world.groundAt(d.x, d.z);
      m.position.set(d.x, y, d.z);
      m.scale.set(d.w, 1.05, 1);
      m.rotation.y = (d.axis === 'x' ? 0 : Math.PI / 2) - (d.R?.a || 0);
      m.castShadow = true; m.receiveShadow = true;
      m.userData = { base: m.rotation.y, open: d.open, cur: d.open ? 1 : 0 };
      m.visible = true;
      this.R.scene.add(m); this.doorMeshes[d.i] = m;
    }
  }
  setDoor(i, open, locked) {
    const m = this.doorMeshes[i]; if (!m) return;
    m.userData.open = open;
  }
  buildExtracts(xs) {
    for (const x of xs) {
      const y = this.world.groundAt(x.x, x.z);
      const kind = x.kind === 'hatch' ? 'hatch' : 'extractPad';
      const m = voxMesh(kind === 'hatch' ? this.hatchGeo() : this.padGeo());
      m.position.set(x.x, y + 0.02, x.z); this.R.scene.add(m);
      this.extractVis[x.i] = { m, x, y };
    }
  }
  padGeo() { if (!this._pad) { const v = new Vox(30, 3, 30, 0.12, [15, 0, 15]); v.box(0, 0, 0, 29, 1, 29, (x, y, z) => ((x + z) >> 2) % 2 && (x < 2 || x > 27 || z < 2 || z > 27) ? 0xd8a020 : 0x3a3e40); v.box(13, 2, 13, 16, 2, 16, 0x40ff80); v.glow(0x40ff80); this._pad = v.build(); } return this._pad; }
  hatchGeo() { if (!this._hatch) { const v = new Vox(12, 3, 12, 0.1, [6, 0, 6]); v.cyl(6, 6, 0, 1, 5.5, 0x4a4e52); v.cyl(6, 6, 2, 2, 4, 0x6a6e72); v.box(5, 2, 1, 6, 2, 10, 0xd8a020); v.glow(0xd8a020); this._hatch = v.build(); } return this._hatch; }

  // -------------------------------------------------------------- entities
  makeVisual(e) {
    let obj, v = { e, kind: e.type };
    if (e.type === 'raider') {
      const outfit = OUTFITS[e.outfit] || OUTFITS.scav;
      v.model = new RaiderModel(outfit, e.wk || 'rifle');
      obj = v.model.root;
      const mine = e.id === this.g.meId, mate = !e.bot && e.team === this.g.myTeam;
      const tcol = TEAM_COL[(e.slot ?? 0) % TEAM_COL.length];
      v.mask = markEntity(this.R, obj, mate && !mine ? tcol : mine ? 0x0c0c10 : 0x140c0c, mate && !mine);
    } else if (e.type === 'ark') {
      const def = ARK[e.kind] || {};
      v.ark = createArkModel(def.model || 'wasp', def);   // part rig sized to the def (see engine/arkmodels.js)
      obj = v.ark.root;
      v.broken = new Set();
      v.mask = markEntity(this.R, obj, 0x140808, false);
    } else if (e.type === 'loot') {
      obj = voxMesh(containerGeo(e.kind === 'ark' ? 'arc_crate' : 'bag'));
      obj.scale.setScalar(e.kind === 'ark' ? 0.6 : 0.8);
      v.mask = markEntity(this.R, obj, 0xf0c030, true);
    } else if (e.type === 'proj') {
      obj = projMesh(e.kind);
    } else if (e.type === 'hz') {
      obj = new THREE.Group();
      if (e.kind === 'barricade') { const m = voxMesh(containerGeo('crate')); m.scale.set(2.2, 1.6, 0.5); obj.add(m); }
    } else obj = new THREE.Group();
    obj.position.set(e.x, e.y || 0, e.z);
    this.R.scene.add(obj);
    v.obj = obj; v.px = e.x; v.pz = e.z; v.py = e.y || 0;
    this.vis.set(e.id, v);
    return v;
  }
  removeVisual(id) {
    const v = this.vis.get(id); if (!v) return;
    this.R.scene.remove(v.obj);
    if (v.loop) { try { v.loop.stop(); } catch (e) { /* */ } v.loop = null; }
    this.vis.delete(id);
  }
  // positional engine/fire loops for nearby entities
  updLoop(v, name, active) {
    const me = this.g.me;
    const near = me && Math.hypot(v.px - me.x, v.pz - me.z) < 38;
    if (active && near && name) {
      if (!v.loop) v.loop = this.g.audio?.loop?.(name, { x: v.px, z: v.pz }) || null;
      else v.loop.setPos?.(v.px, v.pz);
    } else if (v.loop) { try { v.loop.stop(); } catch (e) { /* */ } v.loop = null; }
  }

  // called every frame with the authoritative entity map
  sync(ents, dt) {
    for (const e of ents.values()) {
      let v = this.vis.get(e.id);
      if (!v) v = this.makeVisual(e);
      v.e = e;
      const sx = e.rx ?? e.x, sz = e.rz ?? e.z, sy = e.ry ?? e.y ?? 0;   // rx/rz = render-interpolated (net)
      // smooth host-side tick stepping
      const k = Math.min(1, dt * 22);
      v.px += (sx - v.px) * (e.id === this.g.meId ? 1 : k); v.pz += (sz - v.pz) * (e.id === this.g.meId ? 1 : k); v.py += (sy - v.py) * (e.id === this.g.meId ? 1 : k);
      if (e.type === 'raider') this.updRaider(v, e, dt);
      else if (e.type === 'ark') this.updArk(v, e, dt);
      else if (e.type === 'proj') { v.obj.position.set(e.x, e.y, e.z); if (Math.random() < 0.6) this.fx.parts.emit({ x: e.x, y: e.y, z: e.z, life: 0.5, size: e.kind === 'rocket' ? 4 : 2, size1: 6, color: 0x8a8680, alpha: 0.5, shape: 1 }); if (e.kind === 'rocket') { this.fx.fire(e.x, e.y, e.z, 1, 0.1); this.L.light(e.x, e.y, e.z, 0xffa040, 1.5, 5, 2); } }
      else if (e.type === 'hz') this.updHazard(v, e, dt);
      else v.obj.position.set(v.px, v.py, v.pz);
    }
    for (const id of [...this.vis.keys()]) if (!ents.has(id)) this.removeVisual(id);
    // doors animate
    for (const m of this.doorMeshes) if (m) { const t = m.userData.open ? 1 : 0; m.userData.cur += (t - m.userData.cur) * Math.min(1, dt * 8); m.rotation.y = m.userData.base + m.userData.cur * 1.45; }
  }
  updRaider(v, e, dt) {
    const m = v.model;
    v.obj.position.set(v.px, v.py, v.pz);
    if ((e.wid || e.wk || null) !== m.gunId) m.setGun(e.wid, e.wk);
    const sp = e.sprint ? 1.5 : e.crouch ? 0.6 : 1;
    m.update(dt, e.moving, e.f, sp, e.crouch, e.mf ?? e.f);
    m.root.visible = e.st !== 'out';
    if (e.st === 'downed') { m.body.rotation.x = -1.35; m.body.position.y = 0.25; }
    else if (e.st === 'dead') { m.body.rotation.x = -1.5; m.body.position.y = 0.15; }
    else { m.body.rotation.x = 0; m.body.position.y = 0; }
    // flashlight
    if (e.flash && (e.st === 'alive')) {
      const fy = v.py + 1.4;
      this.L.spot(v.px + Math.sin(e.f) * 0.3, fy, v.pz + Math.cos(e.f) * 0.3, e.f, 0.42, 0xfff2d8, this.L.isNight ? 3.0 : 1.4, 17, e.id === this.g.meId ? 3 : 1.6);
    }
    // remote footsteps
    if (e.id !== this.g.meId && e.moving && e.st === 'alive' && !e.crouch) {
      v.stepT = (v.stepT ?? 0) - dt * (e.sprint ? 1.5 : 1);
      if (v.stepT <= 0) { v.stepT = 0.4; const me = this.g.me; if (me && Math.hypot(v.px - me.x, v.pz - me.z) < 22) this.g.audio?.play(SURF_SND[this.world.grid.surfAt(v.px, v.pz)] || 'step_grass', { x: v.px, z: v.pz, vol: e.sprint ? 0.35 : 0.2 }); }
    }
    // faint personal light so your own raider always reads in the dark
    if (e.id === this.g.meId && this.L.isNight && e.st !== 'dead') this.L.light(v.px, v.py + 1.6, v.pz, 0xc8d8ff, 0.55, 4.5, 2.8);
    // tagged enemies glow red outline
    if (v.mask && e.tagged > (this.g.simTime || 0)) v.mask.set(0.9, 0.1, 0.05, 1);
  }
  updArk(v, e, dt) {
    const def = ARK[e.kind] || {};
    const LOOP = { wasp: 'wazp_loop', hornet: 'hornit_loop', rocketeer: 'rocketier_loop', snitch: 'wazp_loop', pop: 'popp_roll_loop' };
    this.updLoop(v, LOOP[def.model], e.st !== 'dead' && !e.dormant && (def.model !== 'pop' || e.st === 'alert'));
    const t = performance.now() / 1000;
    const alt = e.alt || 0;
    const bob = def.flying ? Math.sin(t * 3 + e.id) * 0.08 : 0;
    v.obj.position.set(v.px, v.py + alt + bob - (def.flying ? 0 : 0), v.pz);
    v.obj.rotation.y = e.f;
    const tele = e.tele || 0;
    // ARK rig: speed from the smoothed position, broken parts, stun / fire / leap flags (host has e.brain)
    const mdx = v.px - (v.lpx ?? v.px), mdz = v.pz - (v.lpz ?? v.pz); v.lpx = v.px; v.lpz = v.pz;
    v.spd = (v.spd ?? 0) + ((dt > 0 ? Math.hypot(mdx, mdz) / dt : 0) - (v.spd ?? 0)) * Math.min(1, dt * 8);
    // broken parts: host reads e.parts, clients get the replicated key list (e.broken)
    if (e.parts) { for (const pk in e.parts) if (e.parts[pk] <= 0 && !v.broken.has(pk)) { v.broken.add(pk); v.ark.setBroken(pk); } }
    else if (e.broken) for (const pk of e.broken) if (!v.broken.has(pk)) { v.broken.add(pk); v.ark.setBroken(pk); }
    const br = e.brain, fl = br ? ((br.stunT > 0 ? 1 : 0) | (br.burst > 0 ? 2 : 0) | (br.leap ? 4 : 0)) : (e.fl || 0);
    v.fireT = Math.max(0, (v.fireT || 0) - dt);
    v.ark.update(dt, {
      moving: v.spd > 0.15, speed: v.spd, alert: e.st === 'alert' ? 1 : e.st === 'search' ? 0.5 : 0, tele,
      gaze: (e.gaze ?? e.f) - e.f, stunned: !!(fl & 1), firing: !!(fl & 2) || tele >= 1 || v.fireT > 0,
      leaping: !!(fl & 4) || (!def.flying && alt > 0.05), eyeColor: v.coneCol || null,
    });
    // telegraph: flashing glow + charging light
    if (tele > 0) {
      const col = e.st === 'alert' ? 0xff3010 : 0xffa020;
      this.L.light(v.px + Math.sin(e.f) * 0.6, v.py + alt + 0.6, v.pz + Math.cos(e.f) * 0.6, col, 0.6 + tele * 2.2, 3 + tele * 4, 2.4);
      if (def.attack?.telegraph === 'laser' || def.attack?.kind === 'laser') this.telegraphLaser(v, e, tele);
    }
    // eye glow
    if (!e.dormant) this.L.light(v.px, v.py + alt + 0.5, v.pz, v.coneCol || (e.st === 'alert' ? 0xff2a10 : 0xffa020), 0.35, 2.2, 0.8);
  }
  telegraphLaser(v, e, tele) {
    const def = ARK[e.kind] || {}, alt = e.alt || 0;
    const tgt = this.g.ents.get(e.tgt) || this.g.me;
    if (!tgt) return;
    const a = e.f, len = Math.min(def.vision?.range || 30, Math.hypot(tgt.x - v.px, tgt.z - v.pz) + 1);
    const y0 = v.py + alt + (def.flying ? 0 : (def.height || 1) * 0.6);
    const col = def.behavior === 'sentinel' ? 0xffd020 : 0xff2a10;
    const n = def.behavior === 'sentinel' ? 4 : 1;
    for (let i = 0; i < n; i++) {
      const off = n > 1 ? (i - (n - 1) / 2) * (1 - tele) * 0.25 : 0;
      this.fx.tracers.add(v.px, y0, v.pz, v.px + Math.sin(a + off) * len, tgt.y + 1.1, v.pz + Math.cos(a + off) * len, col, 0.05);
    }
  }
  updHazard(v, e, dt) {
    const r = Math.random;
    this.updLoop(v, e.kind === 'fire' ? 'fire_loop' : null, true);
    if (e.kind === 'smoke' && r() < dt * 30) this.fx.smoke(e.x + (r() - .5) * e.r * 1.4, e.y, e.z + (r() - .5) * e.r * 1.4, 1, false, e.r * 0.6);
    if (e.kind === 'fire') { this.fx.fire(e.x, e.y + 0.1, e.z, 2, e.r * 1.2); if (r() < dt * 6) this.fx.smoke(e.x, e.y + 0.5, e.z, 1, true, e.r); this.L.light(e.x, e.y + 0.8, e.z, 0xff7a20, 1.6 + r() * 0.5, e.r + 6, 1.8); }
    if (e.kind === 'gas' && r() < dt * 25) this.fx.parts.emit({ x: e.x + (r() - .5) * e.r * 1.6, y: e.y + 0.2, z: e.z + (r() - .5) * e.r * 1.6, vy: 0.3, life: 2.5, size: 8, size1: 16, color: 0x8ac040, color1: 0x5a8a30, alpha: 0.45, shape: 1, drag: 0.5 });
    if (e.kind === 'lure') this.L.light(e.x, e.y + 0.4, e.z, 0x50ff80, Math.sin(performance.now() / 120) > 0 ? 1.5 : 0.2, 5, 1.5);
    if (e.kind === 'flare') { this.L.light(e.x, e.y + 0.5, e.z, 0xff3030, 2 + r() * 0.6, 14, 2); if (r() < dt * 20) this.fx.sparks(e.x, e.y + 0.3, e.z, 1, 0xff6040, 2); }
    v.obj.position.set(e.x, e.y, e.z);
  }

  // -------------------------------------------------------------- cones & gaze
  drawCones(ents, me) {
    const W = this.R.viewW, H = this.R.viewH, cx = this.R.view.x, cz = this.R.view.y;
    const range = (me?.stats?.cone_vision_range || 1);
    for (const e of ents.values()) {
      if (e.type !== 'ark' || e.st === 'dead') continue;
      const def = ARK[e.kind]; if (!def?.vision) continue;
      const vr = def.vision.range;
      if (Math.abs(e.x - cx) > W / 2 + vr || e.z - cz > H / 2 + vr || cz - e.z > H / 2 + vr + 8) continue;
      const st = e.st === 'alert' ? 'alert' : e.st === 'search' ? 'search' : 'idle';
      const gy = this.world.groundAt(e.x, e.z), eye = gy + (e.alt || 0) + (def.flying ? 0 : Math.min(def.height || 1, 2.2) * 0.8);
      const half = (def.vision.fov / 2) * Math.PI / 180;
      const r = vr * (st === 'alert' ? 1 : 0.92) * range;
      const vis = this.vis.get(e.id);
      const x = vis ? vis.px : e.x, z = vis ? vis.pz : e.z;
      // colour follows awareness: calm searchlight → yellow/orange (suspicious) → red (attacking)
      const col = coneColor(st, e.vis || 0, def.behavior === 'surveyor', vis ? (vis.coneCol ||= new THREE.Color()) : new THREE.Color());
      this.cones.add(this.world.grid, x, z, e.gaze ?? e.f, half, r, col, st === 'alert' ? 0.2 : st === 'search' ? 0.16 : 0.12, eye);
      this.L.spot(x, eye, z, e.gaze ?? e.f, half, col, st === 'alert' ? 1.5 : st === 'search' ? 1.15 : 0.9, r, st === 'alert' ? 2.2 : 1.6, true, 0.85);
    }
  }

  // -------------------------------------------------------------- events -> fx / audio
  event(ev) {
    const g = this.g, A = g.audio, fx = this.fx;
    switch (ev.e) {
      case 'shot': {
        const [ox, oy, oz] = ev.o;
        const mine = ev.s === g.meId;
        const col = TRACER[ev.k] || TRACER.rifle;
        if (!mine || !g.predicted) {
          A?.play(ev.snd || (ev.k === 'ark' ? 'gun_smg' : 'gun_rifle'), { x: ox, z: oz });
          this.flash(ox, oy, oz, ev.k === 'laser' ? 0xff3020 : ev.k === 'energy' ? 0x60d8ff : 0xffd890, ev.k === 'laser' ? 3 : 1.8, 7, 0.06, 2.5);
          for (const h of ev.hits) fx.tracers.add(ox, oy, oz, h.h[0], h.h[1], h.h[2], col, ev.k === 'laser' ? 0.25 : 0.07);
          const v = this.vis.get(ev.s); if (v?.model) v.model.kick(0.6);
          if (v?.ark) v.fireT = 0.3;                                  // ARK muzzle flash / recoil (host + clients)
        }
        for (const h of ev.hits) this.impact(h, mine);
        // near-miss whiz for the local player
        const me = g.me;
        if (me && !mine && ev.hits.length) {
          const [hx, , hz] = ev.hits[0].h;
          const d = distToSeg(me.x, me.z, ox, oz, hx, hz);
          if (d < 2.2) A?.play('bullet_whiz', { x: me.x, z: me.z, vol: 0.6 });
        }
        break;
      }
      case 'boom': {
        fx.explosion(ev.x, ev.y, ev.z, ev.r * 0.6);
        const col = ev.k === 'stun' || ev.k === 'shock' ? 0x80c0ff : ev.k === 'fire' ? 0xff6020 : 0xffc070;
        if (ev.k === 'stun' || ev.k === 'shock') fx.sparks(ev.x, ev.y + 0.5, ev.z, 30, 0x80d0ff, 8);
        this.flash(ev.x, ev.y + 1.2, ev.z, col, 5, ev.r * 3 + 6, 0.45, 4);
        const d = g.me ? Math.hypot(ev.x - g.me.x, ev.z - g.me.z) : 99;
        this.shake = Math.max(this.shake, Math.max(0, 0.6 - d / 40) * (ev.r / 3));
        if (d < 20) this.L.flashBoost = Math.max(this.L.flashBoost, (1 - d / 20) * 0.35);
        A?.play(ev.r > 3.5 ? 'explosion_big' : 'explosion_small', { x: ev.x, z: ev.z });
        A?.duck?.(0.5, 0.6);
        break;
      }
      case 'part': fx.sparks(ev.x, 1.5, ev.z, 25, 0xffd080, 7); fx.smoke(ev.x, 1.5, ev.z, 3, true, 0.5); A?.play('ark_part_break', { x: ev.x, z: ev.z }); break;
      case 'arkdown': {
        fx.explosion(ev.x, ev.y, ev.z, ev.big ? 3 : 1.5); fx.sparks(ev.x, ev.y + 0.5, ev.z, 40, 0xffc060, 9);
        this.flash(ev.x, ev.y + 1, ev.z, 0xffb060, 4, 10, 0.4, 3.5);
        A?.play(ev.big ? 'ark_death_big' : 'ark_death_small', { x: ev.x, z: ev.z });
        if (ev.src === g.meId) { g.onXP?.(ev.xp, (ARK[ev.kind]?.name || 'ARK') + ' destroyed'); g.questEvent?.('kill', { target: ev.kind, with: ev.w || undefined }); g.stats.arkKills[ev.kind] = (g.stats.arkKills[ev.kind] || 0) + 1; }
        break;
      }
      case 'crash': fx.smoke(ev.x, 2, ev.z, 8, true, 0.6); fx.sparks(ev.x, 2, ev.z, 20, 0xffa040, 5); break;
      case 'alert': if (g.me && Math.hypot(ev.x - g.me.x, ev.z - g.me.z) < 45) A?.play('ark_alert', { x: ev.x, z: ev.z }); g.onAlert?.(ev); break;
      case 'hurt': {
        if (ev.id === g.meId) { g.onHurt?.(ev); A?.play('hurt'); }
        const v = this.vis.get(ev.id); if (v) fx.parts.emit({ x: v.px, y: v.py + 1.1, z: v.pz, vy: 1, life: 0.4, size: 3, size1: 6, color: 0xa02818, alpha: 0.8, shape: 1, grav: 4 });
        break;
      }
      case 'shieldbreak': { const v = this.vis.get(ev.id); if (v) { fx.sparks(v.px, v.py + 1.1, v.pz, 20, 0x60c0ff, 4); A?.play('shield_break', { x: v.px, z: v.pz }); } break; }
      case 'downed': g.onDowned?.(ev); A?.play('downed', this.posOf(ev.id)); break;
      case 'revived': g.feed(`${this.nameOf(ev.id)} was revived`, '#68e088'); A?.play('revive', this.posOf(ev.id)); break;
      case 'killed': g.onKilled?.(ev); break;
      case 'extracted': g.onExtracted?.(ev); A?.play('extract_success', this.posOf(ev.id)); break;
      case 'loot': break;
      case 'opened': this.containers.setOpened(ev.i, true); break;
      case 'container': this.containers.add(ev.c); g.addDynamicContainer?.(ev.c); break;
      case 'door': this.setDoor(ev.i, ev.open); A?.play('door_open', this.doorPos(ev.i)); break;
      case 'locked': if (ev.by === g.meId) { A?.play('door_locked'); g.hudMsg('LOCKED - KEY REQUIRED', '#e84a30'); } break;
      case 'unlocked': A?.play('door_unlock', this.doorPos(ev.i)); break;
      case 'xcall': g.onExtractCall?.(ev); A?.play('extract_call', this.extractPos(ev.i)); break;
      case 'xopen': A?.play('elevator_arrive', this.extractPos(ev.i)); g.onExtractOpen?.(ev); break;
      case 'xgone': A?.play('elevator_door', this.extractPos(ev.i)); break;
      case 'throw': A?.play('grenade_pin', this.posOf(ev.by)); break;
      case 'bounce': A?.play('grenade_bounce', { x: ev.x, z: ev.z }); break;
      case 'pop': A?.play(ev.k === 'smoke' ? 'smoke_pop' : ev.k === 'gas' ? 'gas_hiss' : 'smoke_pop', { x: ev.x, z: ev.z }); break;
      case 'beep': A?.play('mine_beep', { x: ev.x, z: ev.z }); fx.rings.add(ev.x, this.world.groundAt(ev.x, ev.z), ev.z, 3, 0xff3020, 1, 0); break;
      case 'armed': A?.play('mine_arm'); break;
      case 'emote': g.onEmote?.(ev); break;
      case 'warn': g.banner(ev.msg, '#e84a30', null, 4); A?.play('raid_warning'); break;
      case 'raidover': A?.play('raid_end_siren'); break;
      case 'leap': { const gy = this.world.groundAt(ev.x, ev.z); fx.rings.add(ev.x, gy, ev.z, 3.5, 0xff4020, ev.T + 0.2, 1); A?.play('leapr_jump', this.posOf(ev.id)); break; }
      case 'latch': if (ev.tgt === g.meId) g.hudMsg('TIKK LATCHED! DODGE ROLL TO SHAKE IT', '#e84a30'); break;
      case 'mortar': { const gy = this.world.groundAt(ev.x, ev.z); fx.rings.add(ev.x, gy, ev.z, 4, 0xff2010, ev.t, 1); A?.play('bombadier_mortar', this.posOf(ev.id)); break; }
      case 'rockets': A?.play('rocket_launch', this.posOf(ev.id)); break;
      case 'alarm': A?.play('snytch_alarm', { x: ev.x, z: ev.z }); g.feed('SNYTCH RAISED THE ALARM - REINFORCEMENTS INBOUND', '#e84a30'); break;
      case 'flame': if (Math.random() < 0.5) { const v = this.vis.get(ev.id); if (v) for (let i = 0; i < 4; i++) { const a = v.e.f + (Math.random() - .5) * 0.8, s = 6 + Math.random() * 4; fx.glow.emit({ x: v.px, y: v.py + 0.5, z: v.pz, vx: Math.sin(a) * s, vy: 0.5, vz: Math.cos(a) * s, life: 0.45, size: 6, size1: 12, color: 0xffd060, color1: 0xc02000, shape: 1, drag: 2 }); } } break;
      case 'reload': A?.play('reload_start', this.posOf(ev.id)); break;
      case 'strikeWarn': { const gy = this.world.groundAt(ev.x, ev.z); fx.rings.add(ev.x, gy, ev.z, ev.r, 0x80c8ff, ev.t, 1); this.flash(ev.x, gy + 8, ev.z, 0x80b0ff, 0.6, ev.r * 2, ev.t, 2); break; }
      case 'strike': {
        const gy = this.world.groundAt(ev.x, ev.z);
        for (let k = 0, y = gy + 30, x = ev.x, z = ev.z; k < 10; k++) { const ny = y - 3, nx = ev.x + (Math.random() - .5) * 2 * (k < 9 ? 1 : 0), nz = ev.z + (Math.random() - .5) * 1.5 * (k < 9 ? 1 : 0); fx.tracers.add(x, y, z, nx, Math.max(gy, ny), nz, 0xd0e8ff, 0.35); x = nx; y = ny; z = nz; }
        fx.sparks(ev.x, gy + 0.3, ev.z, 50, 0xa0d0ff, 10); fx.smoke(ev.x, gy, ev.z, 8, true, 1.5);
        this.flash(ev.x, gy + 3, ev.z, 0xc0e0ff, 7, ev.r * 4, 0.5, 4.5);
        this.L.flashBoost = Math.max(this.L.flashBoost, 0.6);
        this.shake = Math.max(this.shake, 0.4);
        g.audio?.thunder?.(); A?.play('explosion_big', { x: ev.x, z: ev.z });
        break;
      }
      case 'melee': { const v = this.vis.get(ev.id); if (v?.model && ev.id !== g.meId) v.model.kick(1.2); if (ev.hit) A?.play('hit_metal', this.posOf(ev.id)); break; }
      case 'chat': g.onChat?.(ev); break;
      case 'ping': fx.rings.add(ev.x, this.world.groundAt(ev.x, ev.z), ev.z, 1.2, ev.col || 0xf0c030, 6, 0, 'ping' + ev.by); g.onPing?.(ev); A?.play('ui_quest', { x: ev.x, z: ev.z }); break;
    }
  }
  impact(h, mine) {
    const [x, y, z] = h.h, fx = this.fx, A = this.g.audio;
    if (h.r === 'w') {
      const col = SURF_FX[h.s] ?? 0x8a8a84;
      if (h.s === SURF.water) { fx.splash(x, z, y); fx.ripples.add(x, z, y, 0.4, 0.6); }
      else { fx.parts.emit({ x, y, z, vy: 0.6, life: 0.45, size: 2, size1: 5, color: col, alpha: 0.7, shape: 1, drag: 2 }); if (h.s === SURF.metal) fx.sparks(x, y, z, 4, 0xffd080, 3); }
      if (Math.random() < 0.35) A?.play(HIT_SND[h.s] || 'hit_concrete', { x, z, vol: 0.5 });
    } else if (h.r === 'a' || h.r === 'aw' || h.r === 'aa' || h.r === 'k') {
      fx.sparks(x, y, z, h.r === 'aw' ? 10 : 5, h.r === 'aw' ? 0xffff80 : h.r === 'aa' ? 0xa0c0ff : 0xffc060, 4);
      A?.play(h.r === 'aw' ? 'hit_ark_weakpoint' : h.r === 'aa' ? 'ricochet' : 'hit_metal', { x, z, vol: 0.6 });
    } else if (h.r === 's') { fx.sparks(x, y, z, 4, 0x60c0ff, 2); A?.play('hit_shield', { x, z, vol: 0.6 }); }
    else if (h.r === 'p') { fx.parts.emit({ x, y, z, life: 0.3, size: 3, color: 0x9a2a1a, alpha: 0.8, shape: 1 }); A?.play('hit_flesh', { x, z, vol: 0.6 }); }
    if (mine && h.r !== 'w') this.g.onHitMarker?.(h.r);
  }
  flash(x, y, z, color, I, range, life, prio = 2) { this.flashes.push({ x, y, z, color, I, range, life, t: 0, prio }); }
  localMuzzle(e, a, ws, shot) {
    const v = this.vis.get(e.id);
    const mz = v?.model?.muzzleWorld(tmpV);
    const x = mz ? mz.x : e.x + Math.sin(a) * 0.7, z = mz ? mz.z : e.z + Math.cos(a) * 0.7, y = mz ? mz.y : e.y + (e.crouch ? 0.95 : 1.3);
    if (v?.model) v.model.kick(Math.min(1, 0.4 + (ws.recoil || 1) * 0.25));
    this.fx.muzzle(x, y, z, Math.sin(a), Math.cos(a));
    this.flash(x, y, z, ws.class === 'energy' ? 0x60d8ff : 0xffd890, 2.2, 8, 0.06, 2.6);
    this.g.audio?.play(shot.snd, { x, z });
    this.shake = Math.max(this.shake, 0.04 + (ws.recoil || 1) * 0.03);
  }
  footstep(e, depth) {
    const s = this.world.grid.surfAt(e.x, e.z);
    if (depth > 0.05) { this.fx.ripples.add(e.x, e.z, this.world.grid.waterLevel(e.x, e.z) + 0.02, 0.9, 1.1); this.fx.splash(e.x, e.z, this.world.grid.waterLevel(e.x, e.z)); }
    else if ((s === SURF.sand || s === SURF.dirt) && e.sprint) this.fx.dust(e.x, e.z, SURF_FX[s]);
    this.g.audio?.play(depth > 0.05 ? 'step_water' : SURF_SND[s] || 'step_grass', { x: e.x, z: e.z, vol: e.sprint ? 0.5 : e.crouch ? 0.15 : 0.3 });
  }

  // -------------------------------------------------------------- per-frame lights
  updateLights(dt) {
    this.flashes = this.flashes.filter(f => (f.t += dt) < f.life);
    for (const f of this.flashes) { const k = 1 - f.t / f.life; this.L.light(f.x, f.y, f.z, f.color, f.I * k, f.range, f.prio); }
    // extraction pads / hatches beacons
    for (const xv of this.extractVis) {
      if (!xv) continue;
      const st = this.g.extractState?.(xv.x.i);
      if (st === 'offline') continue;
      const col = st === 'called' ? 0xffc030 : st === 'open' ? 0x40ff80 : st === 'gone' ? 0x803020 : xv.x.kind === 'hatch' ? 0xffd040 : 0x40ff80;
      const pulse = st === 'called' ? 0.6 + 0.4 * Math.sin(performance.now() / 150) : 1;
      this.L.light(xv.x.x, xv.y + 1.2, xv.x.z, col, 1.4 * pulse, 8, 1.2);
    }
    this.shake = Math.max(0, this.shake - dt * 1.5);
    this.R.shake = this.shake;
  }

  // -------------------------------------------------------------- queries
  posOf(id) { const v = this.vis.get(id); return v ? { x: v.px, z: v.pz } : {}; }
  nameOf(id) { return this.vis.get(id)?.e?.name || '?'; }
  doorPos(i) { const m = this.doorMeshes[i]; return m ? { x: m.position.x, z: m.position.z } : {}; }
  extractPos(i) { const x = this.extractVis[i]; return x ? { x: x.x.x, z: x.x.z } : {}; }
  pickEntity(mx, my, selfId) {
    let best = null, bd = 26 * this.R.scale / 3;
    for (const v of this.vis.values()) {
      const e = v.e; if (e.id === selfId || (e.type !== 'ark' && e.type !== 'raider') || e.st === 'dead') continue;
      const cy = v.py + (e.alt || 0) + (e.type === 'raider' ? (e.crouch ? 0.8 : 1.15) : 0.4);
      const s = this.R.worldToScreen(v.px, cy, v.pz);
      const d = Math.hypot(s.x - mx, s.y - my) / (this.R.scale / 3);
      const rad = (e.type === 'ark' ? Math.max(1, (e.r || 0.6) * 1.5) : 1) * 26;
      if (d < rad && d < bd) { bd = d; best = { id: e.id, aimY: cy, type: e.type }; }
    }
    return best;
  }
  nearestDowned(me, r) {
    let best = null, bd = r;
    for (const v of this.vis.values()) { const e = v.e; if (e.type === 'raider' && e.st === 'downed' && e.id !== me.id && e.team === me.team) { const d = Math.hypot(e.x - me.x, e.z - me.z); if (d < bd) { bd = d; best = e; } } }
    return best;
  }
  findInteractable(me, pc) {
    const g = this.g; let best = null, bd = 2.1;
    const consider = (o, d) => { if (d < bd) { bd = d; best = o; } };
    // downed squadmates
    for (const v of this.vis.values()) {
      const e = v.e;
      if (e.type === 'raider' && e.st === 'downed' && e.id !== me.id && e.team === me.team) consider({ kind: 'revive', ref: e.id, x: e.x, z: e.z, time: 5, label: 'REVIVE ' + e.name }, Math.hypot(e.x - me.x, e.z - me.z) - 0.3);
      if (e.type === 'loot') consider({ kind: 'loot', ref: e.id, x: e.x, z: e.z, time: 0.4, label: e.label ? 'LOOT ' + e.label : 'LOOT REMAINS' }, Math.hypot(e.x - me.x, e.z - me.z));
    }
    for (const c of g.containersData) {
      if (Math.abs(c.x - me.x) > 2.5 || Math.abs(c.z - me.z) > 2.5) continue;
      const d = Math.hypot(c.x - me.x, c.z - me.z);
      const opened = g.containerOpened?.(c.i);
      consider({ kind: 'container', ref: c.i, x: c.x, z: c.z, time: opened ? 0.25 : g.searchTime(c.kind), label: (opened ? 'OPEN ' : 'SEARCH ') + (c.label || containerLabel(c.kind)), locked: c.locked }, d);
    }
    for (const d of g.doorsData) {
      const dd = Math.hypot(d.x - me.x, d.z - me.z);
      if (dd < 2.0) consider({ kind: 'door', ref: d.i, x: d.x, z: d.z, time: d.lockedNow ? 1.2 : 0, instant: !d.lockedNow, label: d.lockedNow ? 'UNLOCK DOOR' : (g.doorOpen?.(d.i) ? 'CLOSE DOOR' : 'OPEN DOOR') }, dd + 0.2);
    }
    for (const x of g.extractsData) {
      const dd = Math.hypot(x.x - me.x, x.z - me.z);
      if (dd < 2.6) {
        const st = g.extractState?.(x.i);
        if (st === 'offline') consider({ kind: 'offline', ref: x.i, x: x.x, z: x.z, time: 999, label: (x.kind === 'hatch' ? 'HATCH' : 'EXTRACT') + ' OFFLINE (MAP CONDITION)' }, dd);
        else if (x.kind === 'hatch') consider({ kind: 'hatch', ref: x.i, x: x.x, z: x.z, time: 2.5, label: 'USE RAIDER HATCH (KEY)' }, dd);
        else if (st === 'idle') consider({ kind: 'extract', ref: x.i, x: x.x, z: x.z, time: 1.2, label: 'CALL ' + (x.kind === 'metro' ? 'METRO' : x.kind === 'airshaft' ? 'AIRSHAFT LIFT' : 'ELEVATOR') + ' - ' + x.name }, dd);
      }
    }
    if (best && (best.kind === 'container' || best.kind === 'loot')) this.setHighlight(best); else this.setHighlight(null);
    return best;
  }
  setHighlight(it) {
    const key = it ? it.kind + it.ref : null;
    if (this.hlKey === key) return;
    this.hlKey = key;
    if (this.highlight) { this.R.scene.remove(this.highlight); this.highlight = null; }
    if (!it || it.kind !== 'container') return;
    const c = this.g.containersData[it.ref]; if (!c) return;
    const m = voxMesh(containerGeo(c.kind)); m.position.set(c.x, c.y ?? this.world.groundAt(c.x, c.z), c.z); m.rotation.y = c.rot || 0;
    markEntity(this.R, m, 0xf0c030, true);
    m.material = litVox({ xray: true });
    this.R.scene.add(m); this.highlight = m;
  }
}
export function containerLabel(kind) {
  return ({ locker: 'Locker', crate: 'Crate', weapon_case: 'Weapon Case', ammo_box: 'Ammo Box', medical_bag: 'Medical Bag', toolbox: 'Toolbox', electronics: 'Electronics', cabinet: 'Cabinet', desk: 'Desk', safe: 'Safe', trash: 'Trash', car_trunk: 'Car Trunk', fridge: 'Fridge', suitcase: 'Suitcase', backpack: 'Backpack', arc_crate: 'ARK Crate', arc_husk: 'ARK Husk', barron_husk: 'Barron Husk', deforestr_husk: 'Deforestr Husk', raider_cache: 'Raider Cache', field_depot: 'Field Depot', plant: 'Plant', basket: 'Basket', security_locker: 'Security Locker', bag: 'Bag' })[kind] || kind;
}
function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
