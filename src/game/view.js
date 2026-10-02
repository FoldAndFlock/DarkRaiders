// Client-side presentation of a raid: entity visuals (interpolated), event-driven FX + audio,
// ARK gaze lights + traced vision cones, flashlights, picking and interaction targets.
import * as THREE from '../../vendor/three.module.js';
import { markEntity, OBLIQUE_K } from '../engine/renderer.js';
import { RaiderModel, OUTFITS, arcMesh, gunGeo, voxMesh } from '../engine/models.js';
import { createArkModel } from '../engine/arkmodels.js';
import { createExtractModel, metroFit, inCabin, extractGateClosed, inGateZone } from '../engine/extracts.js';
import { ContainerRenderer, containerGeo } from '../engine/containers.js';
import { GU, litVox } from '../engine/materials.js';
import { SURF } from '../engine/world.js';
import { coneColor } from '../engine/cones.js';
import { ARK } from '../data/arc.js';
import { ITEMS, reloadSoundFor } from './items.js';
import { Vox } from '../engine/voxel.js';

const tmpV = new THREE.Vector3();
const TEAM_COL = [0x30d0d0, 0xf0a030, 0xe84a30, 0x9a70ff];
const SURF_FX = { [SURF.dirt]: 0x6a5a40, [SURF.concrete]: 0x8a8a84, [SURF.metal]: 0xffd080, [SURF.sand]: 0xc0a070, [SURF.water]: 0xb0c8d0, [SURF.wood]: 0x7a5a3a, [SURF.grass]: 0x4a6a2e, [SURF.tile]: 0x9a948a };
const SURF_SND = { [SURF.dirt]: 'step_grass', [SURF.concrete]: 'step_concrete', [SURF.metal]: 'step_metal', [SURF.sand]: 'step_sand', [SURF.water]: 'step_water', [SURF.wood]: 'step_wood', [SURF.grass]: 'step_grass', [SURF.tile]: 'step_concrete' };
const HIT_SND = { [SURF.metal]: 'hit_metal', [SURF.wood]: 'hit_wood', [SURF.dirt]: 'hit_dirt', [SURF.grass]: 'hit_dirt', [SURF.sand]: 'hit_dirt' };
// ARK audio fingerprints (src/audio/sfx_ark.js) by ARK kind / model
const ARK_ALERT = { wazp: 'wazp_alert', hornett: 'hornit_alert', fyrefly: 'hornit_alert', tikk: 'tikk_alert', popp: 'popp_alert', komet: 'popp_alert',
  fyreball: 'fyreball_alert', shreddr: 'fyreball_alert', snytch: '', spottr: 'turret_lock', turrett: 'turret_lock', sentinal: 'sentinal_lock',
  surveyr: 'surveyr_alert', rocketier: 'rocketier_alert', turbyne: 'rocketier_alert', vaporiser: 'vaporiser_alert', leapr: 'leapr_screech',
  bastian: 'bastian_alert', bombardeer: 'bombadier_alert', queene: 'queen_roar', matriark: 'queen_roar' };
const ARK_TELE = { wazp: 'wazp_whine', hornett: 'hornit_lock', fyrefly: 'wazp_whine', popp: 'popp_fuse', komet: 'popp_fuse', fyreball: 'fyreball_ignite',
  shreddr: 'turret_spin', snytch: 'snytch_call', turrett: 'turret_spin', sentinal: 'sentinal_charge', rocketier: 'rocketier_lock', turbyne: 'rocketier_lock',
  vaporiser: 'sentinal_charge', leapr: 'leapr_charge', bastian: 'bastian_screech' };
const ARK_SHOT = { wazp: 'wazp_shot', fyrefly: 'fyrefly_shot', hornett: 'hornit_zap', turrett: 'turret_shot', shreddr: 'turret_shot', bastian: 'bastian_shot' };
const ARK_LOOP = { wasp: 'wazp_loop', hornet: 'hornit_loop', rocketeer: 'rocketier_loop', snitch: 'snytch_loop', pop: 'popp_roll_loop', fireball: 'popp_roll_loop',
  surveyor: 'surveyr_loop', leaper: 'ark_hum_loop', bastion: 'ark_hum_loop', bombardier: 'ark_hum_loop', queen: 'ark_hum_loop' };
const ARK_STEP = { tick: ['tikk_skitter', 0.5, 1], leaper: ['bastian_step', 0.55, 1.35], bastion: ['bastian_step', 0.95, 1], bombardier: ['bastian_step', 0.8, 0.85], queen: ['leapr_stomp', 1.2, 0.8] };
// tracers by source (shot event kind): colour, speed (m/s), tail (m), head (px). Raiders yellow-white, energy
// cyan, ARK guns red-orange, lasers per machine (ARK_LASER); beams (lasers) flash the whole line
const TRACER = { rifle: 0xffe0a0, smg: 0xffe8b0, pistol: 0xffe8c0, shotgun: 0xffd090, sniper: 0xfff0d0, heavy: 0xffd080, energy: 0x60d8ff, launcher: 0xffa040, ark: 0xff6040, laser: 0xff3020 };
const TRACER_MOVE = { rifle: [210, 2.8, 3], smg: [190, 2.4, 2], pistol: [170, 2.0, 2], shotgun: [160, 1.6, 2], sniper: [320, 4.5, 3], heavy: [240, 3.2, 3], energy: [150, 2.6, 3], launcher: [120, 2, 3], ark: [120, 2.4, 3] };
const ARK_LASER = { sentinal: 0xffd040, vaporiser: 0xff3020 };

// -------------------------------------------------------------- door leaves
// Voxel leaf, pivot on its hinge edge (x = 0), 22 high, body 2 voxels thick (scaled to ~0.16 m) with the handle,
// hinge knuckles and lamp standing out on both faces. The top row is a light edge so a leaf seen from above
// (a closed door in a north-south wall) still reads as a capped slab. Styles follow the building: wood (houses),
// metal (industrial), locked (red key lamp, hazard kick plate) and unlocked (lamp turned green).
const DOOR_COL = {
  wood: { frame: 0x4a3220, panel: 0x6c4a2c, inner: 0x7c5834, top: 0xb89060, kick: 0x3a281a, handle: 0xe8c050, hinge: 0x2a2420 },
  metal: { frame: 0x3a434a, panel: 0x56626a, inner: 0x5e6b74, top: 0xa8b4ba, kick: 0x2e3438, handle: 0xd8d6c8, hinge: 0x1e2428, glass: 0x26384a, glint: 0x7ea0b8 },
  locked: { frame: 0x383e44, panel: 0x4a5258, inner: 0x525b62, top: 0xa4acb2, kick: 0x2a2e32, handle: 0xd8d6c8, hinge: 0x1e2428, stripe: 0xd8a020, light: 0xff3020 },
};
DOOR_COL.unlocked = { ...DOOR_COL.locked, light: 0x40e060 };
const doorGeos = new Map();
function doorLeafGeo(style, L) {
  const n = Math.max(5, Math.round(L / 0.1)), key = style + n;
  if (doorGeos.has(key)) return doorGeos.get(key);
  const C = DOOR_COL[style] || DOOR_COL.wood, v = new Vox(n, 22, 4, 0.1, [0, 0, 2]), hx = n - 2;
  v.box(0, 0, 1, n - 1, 21, 2, C.panel);
  v.box(0, 0, 1, 0, 21, 2, C.frame); v.box(n - 1, 0, 1, n - 1, 21, 2, C.frame);     // stiles
  v.box(0, 0, 1, n - 1, 1, 2, C.kick);                                              // kick plate
  if (style === 'wood') {                                                           // two raised panels + mid rail
    v.box(2, 3, 1, n - 3, 9, 2, C.inner); v.box(2, 12, 1, n - 3, 19, 2, C.inner); v.box(1, 11, 1, n - 2, 11, 2, C.frame);
    v.box(hx, 10, 0, hx, 10, 3, C.handle);
  } else {
    v.box(2, 3, 1, n - 3, 12, 2, C.inner);
    if (C.glass) { v.box(2, 14, 1, n - 3, 18, 2, C.glass); v.set(2, 18, 1, C.glint).set(2, 18, 2, C.glint); }
    v.box(hx, 9, 0, hx, 11, 0, C.handle); v.box(hx, 9, 3, hx, 11, 3, C.handle);     // push bars
    if (C.light) {
      for (let x = 0; x < n; x++) if ((x >> 1) % 2 === 0) v.box(x, 0, 1, x, 1, 2, C.stripe);
      const lx = Math.min(hx - 2, Math.max(1, Math.floor(n / 2)));
      v.box(lx, 14, 0, lx + 1, 15, 0, C.light); v.box(lx, 14, 3, lx + 1, 15, 3, C.light); v.glow(C.light);
    }
  }
  v.box(0, 21, 1, n - 1, 21, 2, C.top);                                             // light top edge
  for (const y of [3, 18]) { v.set(0, y, 0, C.hinge); v.set(0, y, 3, C.hinge); }    // hinge knuckles
  const g = v.build(); g.userData.n = n;
  doorGeos.set(key, g);
  return g;
}
function doorStyle(d, world) {
  if (d.locked) return 'locked';
  const B = d.bid >= 0 ? world.buildings[d.bid] : null;
  return B && !/concrete|metal|corrugated|rust/i.test(B.def.wall || 'plaster') ? 'wood' : 'metal';
}
// pose a door group's leaves for its open fraction (userData.cur, 0 = shut, 1 = open)
function poseDoor(grp) {
  const u = grp.userData, k = u.cur * u.cur * (3 - 2 * u.cur);
  for (const l of u.leaves) l.rotation.y = l.userData.c0 + l.userData.da * k;
}
// per frame: swing toward open / shut; doors of the building we are cut into are squashed down to the cut height
// like its walls (a solid leaf top instead of a hollow, discarded one)
function animDoors(doors, dt) {
  const H = GU.uCutH.value, cb = GU.uCutBid.value;
  for (const m of doors) {
    if (!m) continue;
    const u = m.userData, t = u.open ? 1 : 0;
    if (u.cur !== t) { u.cur += (t - u.cur) * Math.min(1, dt * 8); if (Math.abs(t - u.cur) < 0.002) u.cur = t; poseDoor(m); }
    const sy = cb >= 0 && u.bid === cb ? Math.max(0.05, Math.min(1.02, (H - 0.04 - m.position.y) / 2.2)) : 1.02;
    if (sy !== u.sy) { u.sy = sy; for (const l of u.leaves) l.scale.y = sy; }
  }
}

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
  // Doors: a group at the doorway centre, turned so local +x runs along the wall, holding one leaf (two for wide
  // doorways) hinged on a jamb. world.doorSwing() picks hinge + swing side from the world alone, so every peer
  // builds the same door; the leaf swings ~100 deg toward that side when open.
  buildDoors(doors) {
    const mat = litVox({ xray: true, cutaway: true });
    for (const d of doors) {
      const sw = this.world.doorSwing(d), y = d.y ?? this.world.groundAt(d.x, d.z), style = doorStyle(d, this.world);
      const grp = new THREE.Group(), leaves = [];
      grp.position.set(d.x, y, d.z);
      grp.rotation.y = Math.atan2(-sw.u[1], sw.u[0]);
      sw.hinges.forEach((hs, k) => {
        const geo = doorLeafGeo(style, sw.L), m = new THREE.Mesh(geo, mat), sz = sw.sides[k];
        // pivot on the jamb, leaf flush with the swing-side face of the (drawn) wall
        m.position.set(hs * (d.w / 2 - sw.inset), 0, sz * (sw.vt / 2 - sw.T / 2));
        m.scale.set(sw.L / (geo.userData.n * 0.1), 1.02, sw.T / 0.2);
        const c0 = hs < 0 ? 0 : Math.PI, a1 = Math.atan2(-sz * Math.sin(sw.open), -hs * Math.cos(sw.open));
        m.userData = { c0, da: Math.atan2(Math.sin(a1 - c0), Math.cos(a1 - c0)) };
        m.castShadow = true; m.receiveShadow = true;
        grp.add(m); leaves.push(m);
      });
      grp.userData = { open: d.open, cur: d.open ? 1 : 0, leaves, style, L: sw.L, bid: d.bid, sy: 1.02 };
      poseDoor(grp);
      this.R.scene.add(grp); this.doorMeshes[d.i] = grp;
    }
  }
  setDoor(i, open, locked) {
    const m = this.doorMeshes[i]; if (!m) return;
    m.userData.open = open;
    // opened with its key: the red lamp turns green
    const d = this.g.doorsData?.[i];
    if (m.userData.style === 'locked' && d && !d.lockedNow) {
      m.userData.style = 'unlocked';
      for (const l of m.userData.leaves) l.geometry = doorLeafGeo('unlocked', m.userData.L);
    }
  }
  // extraction structures: animated voxel rigs per kind (engine/extracts.js), driven by updExtracts()
  buildExtracts(xs) {
    for (const x of xs) {
      const y = x.y ?? this.world.groundAt(x.x, x.z);
      if (x.kind === 'metro' && !x.fit) x.fit = metroFit(x, this.world) || undefined;   // track between the hall's end walls
      const m = createExtractModel(x.kind || 'elevator', x);
      m.root.position.set(x.x, y, x.z); m.root.rotation.y = x.face || 0;
      this.R.scene.add(m.root);
      const ctx = {
        L: this.L, fx: this.fx, near: true, viewer: null,
        play: (name, o) => this.g.audio?.play(name, { x: x.x, z: x.z, ...(o || {}) }),
        shake: (a) => { const me = this.g.me; if (me && Math.hypot(me.x - x.x, me.z - x.z) < 16 && Math.abs((me.y ?? y) - y) < 4) this.shake = Math.max(this.shake, a); },
      };
      this.extractVis[x.i] = { m, x, y, ctx, loop: null, tick: null };
    }
  }
  // per frame: each rig follows its extract's state (host: sim timers; clients: mirrored state + local
  // timers) and requests its lights / particles / timeline sounds; fan ambience + last-5-s countdown ticks
  updExtracts(dt) {
    const g = this.g, A = g.audio, me = g.me, R = this.R;
    const cx = R.view?.x ?? g.camX ?? 0, cz = R.view?.y ?? g.camZ ?? 0, hw = (R.viewW || 44) / 2 + 24, hh = (R.viewH || 26) / 2 + 30;
    for (const xv of this.extractVis) {
      if (!xv) continue;
      const x = xv.x, st = g.extractState?.(x.i) ?? x.state ?? 'idle';
      xv.ctx.near = Math.abs(x.x - cx) < hw && Math.abs(x.z - cz) < hh;
      xv.ctx.viewer = me && me.st !== 'out' ? me : null;    // roofs fade / walls cut / the car roof hides while you are inside
      xv.m.update(dt, st, typeof x.t === 'number' ? x.t : null, xv.ctx);
      // cabin doors / platform gates: solid while shut on every peer (client-side prediction collides with them
      // too); a shutting gate puts the local player back out at the entry - unless they are in the cabin for
      // the departure (closing), then they extract
      const shut = extractGateClosed(st, typeof x.t === 'number' ? x.t : null, x.kind);
      if (x.gates?.length) this.world.setExtractGate?.(x, shut);
      if (shut && st !== 'open' && x.gates?.length && me && (me.st === 'alive' || me.st === 'downed') && inGateZone(x, me.x, me.y, me.z) && !(st === 'closing' && inCabin(x, me.x, me.y, me.z))) {
        const P = x.pts, ex = P.entry[0], ez = P.entry[1];
        me.x = ex; me.z = ez; me.y = this.world.grid.floorAt(ex, ez, (P.cabin?.y ?? xv.y) + 0.6);
        if (g.pc) { g.pc.vy = 0; g.pc.fallFrom = null; }
        g.session?.state?.({ x: me.x, y: me.y, z: me.z });
        g.hudMsg?.('DOORS SHUT - WAIT FOR THE ' + (x.kind === 'metro' ? 'TRAIN' : x.kind === 'airshaft' ? 'DROPSHIP' : 'ELEVATOR'), '#e8a030');
      }
      const d = me ? Math.hypot(x.x - me.x, x.z - me.z) : 1e9, level = me && Math.abs((me.y ?? xv.y) - xv.y) < 6;
      const lp = xv.m.loop;
      if (lp && level && d < 32 && !g.localDone) {
        if (!xv.loop) xv.loop = A?.loop?.(lp.name, { x: x.x, z: x.z, vol: lp.vol, pitch: lp.pitch }) || null;
        else { xv.loop.setVol?.(lp.vol); xv.loop.setPitch?.(lp.pitch); }
      } else if (xv.loop) { try { xv.loop.stop(); } catch (e) { /* */ } xv.loop = null; }
      if ((st === 'called' || st === 'closing') && level && d < 30) {      // last 5 s of the arrival / the departure
        const s = Math.ceil(xv.m.timeLeft);
        if (s >= 1 && s <= 5 && s !== xv.tick) { xv.tick = s; A?.play('extract_countdown_tick', { x: x.x, z: x.z }); }
      } else xv.tick = null;
    }
  }

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
    if (v.loop && v.loopName !== name) { try { v.loop.stop(); } catch (e) { /* */ } v.loop = null; }   // state changed the loop sound
    if (active && near && name) {
      if (!v.loop) { v.loop = this.g.audio?.loop?.(name, { x: v.px, z: v.pz }) || null; v.loopName = name; }
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
      // multi-level: anything above the cutaway (upper floors / the surface over a tunnel you are in) is hidden
      if (e.id !== this.g.meId) {
        const hide = this.world.cutHides(v.px, v.pz, v.py + 0.3);
        if (hide) { v.obj.visible = false; v.cutHidden = true; } else if (v.cutHidden) { v.obj.visible = true; v.cutHidden = false; }
      }
    }
    for (const id of [...this.vis.keys()]) if (!ents.has(id)) this.removeVisual(id);
    // doors animate
    animDoors(this.doorMeshes, dt);
  }
  updRaider(v, e, dt) {
    const m = v.model;
    v.obj.position.set(v.px, v.py, v.pz);
    if ((e.wid || e.wk || null) !== m.gunId) m.setGun(e.wid, e.wk);
    const sp = e.sprint ? 1.5 : e.crouch ? 0.6 : 1;
    m.update(dt, e.moving, e.f, sp, e.crouch, e.mf ?? e.f);
    m.root.visible = e.st !== 'out';
    if (v.carry) {   // extracted: ride down with the elevator car / out with the train / up into the dropship
      const c = v.carry, off = c.xv.m.carry((performance.now() - c.t0) / 1000, c);
      if (!off || off.hide) { m.root.visible = false; if ((performance.now() - c.t0) > 1500) v.carry = null; }
      else { m.root.visible = true; v.obj.position.set(c.x + off.dx, c.y + off.dy, c.z + off.dz); }
    }
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
    this.arkAudio(v, e, def, dt);
    const t = performance.now() / 1000;
    // altitude smoothed exactly like the floor height under it (sync: py), so a flyer crossing a roof edge (its
    // floor jumps up, its altitude down by the same amount) keeps a steady hull height; clients interpolate both
    const ta = e.ra ?? e.alt ?? 0;
    v.pa = v.pa == null ? ta : v.pa + (ta - v.pa) * Math.min(1, dt * 22);
    const alt = v.pa;
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
    // damage state from the hp fraction (host: hp / maxHp, clients: the replicated hpf)
    const hpf = e.maxHp ? e.hp / e.maxHp : (e.hpf ?? 1), dmg = hpf < 0.12 ? 3 : hpf < 0.33 ? 2 : hpf < 0.66 ? 1 : 0;
    v.ark.update(dt, {
      moving: v.spd > 0.15, speed: v.spd, alert: e.st === 'alert' ? 1 : e.st === 'search' ? 0.5 : 0, tele,
      gaze: (e.gaze ?? e.f) - e.f, stunned: !!(fl & 1), firing: !!(fl & 2) || tele >= 1 || v.fireT > 0,
      leaping: !!(fl & 4) || (!def.flying && alt > 0.05), eyeColor: v.coneCol || null, dmg,
    });
    // telegraph: flashing glow + charging light
    if (tele > 0) {
      const col = e.st === 'alert' ? 0xff3010 : 0xffa020;
      this.L.light(v.px + Math.sin(e.f) * 0.6, v.py + alt + 0.6, v.pz + Math.cos(e.f) * 0.6, col, 0.6 + tele * 2.2, 3 + tele * 4, 2.4);
      if (def.attack?.telegraph === 'laser' || def.attack?.kind === 'laser') this.telegraphLaser(v, e, tele);
    }
    // eye glow (stutters once badly damaged)
    if (!e.dormant && !(dmg >= 2 && Math.random() < 0.15 * dmg)) this.L.light(v.px, v.py + alt + 0.5, v.pz, v.coneCol || (e.st === 'alert' ? 0xff2a10 : 0xffa020), 0.35, 2.2, 0.8);
    if (dmg) this.arkDamageFx(v, e, def, dmg, dt, v.py + alt + (def.flying ? 0 : (def.size?.height ?? def.height ?? 1) * 0.65));
  }
  // damage states: < 66 % hp sparks + a light smoke wisp; < 33 % a heavy smoke trail + spark bursts (the rig adds
  // the soot tint, stuttering eyes / glows and the wobble or limp); < 12 % on fire. Only on-screen machines
  // emit, under a per-frame particle budget (many damaged ARK stay cheap).
  arkDamageFx(v, e, def, st, dt, y) {
    if (v.cutHidden || e.dormant || e.st === 'dead') return;
    const R = this.R, cx = R.view?.x ?? this.g.camX ?? v.px, cz = R.view?.y ?? this.g.camZ ?? v.pz;
    if (Math.abs(v.px - cx) > (R.viewW || 44) / 2 + 6 || Math.abs(v.pz - cz) > (R.viewH || 26) / 2 + 12) return;
    if (this._dfxT !== this.g.time) { this._dfxT = this.g.time; this._dfxN = 0; }
    if (this._dfxN > 90) return;
    const fx = this.fx, r = Math.random, rr = e.r || def.radius || 0.6, sz = Math.min(2.5, Math.max(0.7, rr / 0.6)), w = GU.uWind.value;
    const x = v.px + (r() - 0.5) * rr * 0.9, z = v.pz + (r() - 0.5) * rr * 0.9;
    if (st === 1 && r() < dt * 2.5 * sz) { fx.parts.emit({ x, y, z, vx: w.x * 0.6 + (r() - 0.5) * 0.3, vy: 0.7 + r() * 0.4, vz: w.y * 0.6 + (r() - 0.5) * 0.3, life: 1.4 + r() * 0.6, size: 3, size1: 7 * sz, color: 0xa29e96, color1: 0x76726a, alpha: 0.42, shape: 1, drag: 0.6 }); this._dfxN++; }
    if (r() < dt * (st >= 2 ? 1.7 : 0.7)) { const n = st >= 2 ? 6 : 3; fx.sparks(x, y + 0.1, z, n, st >= 3 ? 0xffa040 : 0xffd080, 2.5 + st * 0.6); this._dfxN += n; }
    if (st >= 2 && r() < dt * 11 * sz) { fx.parts.emit({ x, y: y + 0.15, z, vx: w.x * 0.7 + (r() - 0.5) * 0.4, vy: 0.9 + r() * 0.7, vz: w.y * 0.7 + (r() - 0.5) * 0.4, life: 2.0 + r() * 1.2, size: 4 * sz, size1: 15 * sz, color: 0x2a2624, color1: 0x4e4a46, alpha: 0.78, shape: 1, drag: 0.45 }); this._dfxN++; }
    if (st >= 3) {
      if (r() < dt * 18) { fx.fire(x, y, z, 1, 0.25 * sz); this._dfxN++; }
      this.L.light(v.px, y + 0.4, v.pz, 0xff7a20, 0.7 + r() * 0.6, 3 + sz * 2, 1.3);
    }
  }
  // per-frame ARK audio: state-dependent loop, wind-up/telegraph cue, lost-target cue, walker steps, Pop proximity beeps
  arkAudio(v, e, def, dt) {
    const A = this.g.audio, model = def.model, kind = e.kind, live = e.st !== 'dead' && !e.dormant;
    let loop = kind === 'spottr' ? 'spottr_loop' : ARK_LOOP[model];
    if (model === 'fireball') loop = v.flameAt && performance.now() - v.flameAt < 400 ? 'fyreball_flame_loop' : (e.st === 'alert' || v.spd > 0.3 ? loop : null);
    if (model === 'pop' && e.st !== 'alert') loop = null;
    this.updLoop(v, loop, live);
    if (!A || !live) { v.tele0 = 0; v.st0 = e.st; return; }
    const me = this.g.me, d = me ? Math.hypot(v.px - me.x, v.pz - me.z) : 1e9, tele = e.tele || 0, at = { x: v.px, z: v.pz };
    if (tele > 0.02 && !(v.tele0 > 0.02) && ARK_TELE[kind] && d < 90) A.play(ARK_TELE[kind], at);
    v.tele0 = tele;
    if (v.st0 === 'alert' && e.st === 'search' && d < 50) A.play('ark_lost', at);
    v.st0 = e.st;
    const st = ARK_STEP[model];
    if (st && (v.spd || 0) > 0.3 && d < 70) { v.stepT = (v.stepT ?? 0) - dt; if (v.stepT <= 0) { v.stepT = st[1]; A.play(st[0], { ...at, pitch: st[2] }); } }
    if (model === 'pop' && e.st === 'alert' && tele <= 0.02 && d < 32) {   // beeps speed up as it closes in
      v.beepT = (v.beepT ?? 0) - dt;
      if (v.beepT <= 0) { v.beepT = Math.min(0.6, Math.max(0.08, d / 14)); A.play('popp_beep', at); }
    }
  }
  telegraphLaser(v, e, tele) {
    const def = ARK[e.kind] || {}, alt = v.pa ?? e.alt ?? 0;
    const tgt = this.g.ents.get(e.tgt) || this.g.me;
    if (!tgt) return;
    const a = e.f, len = Math.min(def.vision?.range || 30, Math.hypot(tgt.x - v.px, tgt.z - v.pz) + 1);
    const y0 = v.py + alt + (def.flying ? 0 : (def.height || 1) * 0.6);
    const col = def.behavior === 'sentinel' ? 0xffd020 : 0xff2a10;
    const n = def.behavior === 'sentinel' ? 4 : 1;
    for (let i = 0; i < n; i++) {
      const off = n > 1 ? (i - (n - 1) / 2) * (1 - tele) * 0.25 : 0;
      this.fx.tracers.add(v.px, y0, v.pz, v.px + Math.sin(a + off) * len, tgt.y + 1.1, v.pz + Math.cos(a + off) * len, col, 0.05, { beam: true, head: 0 });
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
      const gy = e.y ?? this.world.groundAt(e.x, e.z), eye = gy + (e.alt || 0) + (def.flying ? 0 : Math.min(def.height || 1, 2.2) * 0.8);
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
        const sk = this.vis.get(ev.s)?.e?.kind, col = ev.k === 'laser' ? ARK_LASER[sk] || TRACER.laser : TRACER[ev.k] || TRACER.rifle;
        if (!mine || !g.predicted) {
          A?.play(ev.snd || (ev.k === 'ark' ? ARK_SHOT[sk] || 'turret_shot' : 'gun_rifle'), { x: ox, z: oz });
          this.flash(ox, oy, oz, ev.k === 'laser' ? col : ev.k === 'energy' ? 0x60d8ff : ev.k === 'ark' ? 0xff8040 : 0xffd890, ev.k === 'laser' ? 3 : 1.8, 7, 0.06, 2.5);
          // every pellet / round gets a tracer: a head + fading tail flying to its hit point (lasers: a beam)
          const mv = TRACER_MOVE[ev.k] || TRACER_MOVE.rifle;
          for (const h of ev.hits) {
            if (ev.k === 'laser') fx.tracers.add(ox, oy, oz, h.h[0], h.h[1], h.h[2], col, 0.22, { beam: true, head: 3 });
            else fx.tracers.add(ox, oy, oz, h.h[0], h.h[1], h.h[2], col, 0.07, { speed: mv[0], tail: mv[1], head: mv[2] });
          }
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
        A?.play(ev.k === 'stomp' ? 'leapr_stomp' : ev.k === 'shock' ? (ev.r >= 6 ? 'queen_pulse' : 'leapr_pulse') : ev.r > 3.5 ? 'explosion_big' : 'explosion_small', { x: ev.x, z: ev.z });
        A?.duck?.(0.5, 0.6);
        break;
      }
      case 'part': { const pv = this.vis.get(ev.id), py = pv ? pv.py + (pv.pa ?? 0) + 0.4 : this.floorNear(ev.x, ev.z) + 1.5; fx.sparks(ev.x, py, ev.z, 25, 0xffd080, 7); fx.smoke(ev.x, py, ev.z, 3, true, 0.5); A?.play('ark_part_break', { x: ev.x, z: ev.z }); break; }
      // a machine took hits this tick (sim: knockback / dip / stagger): tilt away from the shot + spring wobble
      case 'ahit': { const hv = this.vis.get(ev.id); if (hv?.ark?.hit) hv.ark.hit(ev.x, ev.z, ev.k, !!ev.b, hv.e?.f || 0); break; }
      case 'arkdown': {
        fx.explosion(ev.x, ev.y, ev.z, ev.big ? 3 : 1.5); fx.sparks(ev.x, ev.y + 0.5, ev.z, 40, 0xffc060, 9);
        this.flash(ev.x, ev.y + 1, ev.z, 0xffb060, 4, 10, 0.4, 3.5);
        A?.play(ev.big ? 'ark_death_big' : 'ark_death_small', { x: ev.x, z: ev.z });
        if (ev.src === g.meId) { g.onXP?.(ev.xp, (ARK[ev.kind]?.name || 'ARK') + ' destroyed'); g.questEvent?.('kill', { target: ev.kind, with: ev.w || undefined }); g.stats.arkKills[ev.kind] = (g.stats.arkKills[ev.kind] || 0) + 1; }
        break;
      }
      case 'crash': { const cy = this.floorNear(ev.x, ev.z) + 1; fx.smoke(ev.x, cy, ev.z, 8, true, 0.6); fx.sparks(ev.x, cy, ev.z, 20, 0xffa040, 5); break; }
      case 'alert': { const snd = ARK_ALERT[ev.kind] ?? 'ark_alert'; if (snd && g.me && Math.hypot(ev.x - g.me.x, ev.z - g.me.z) < 90) A?.play(snd, { x: ev.x, z: ev.z }); g.onAlert?.(ev); break; }
      case 'hurt': {
        if (ev.id === g.meId) { g.onHurt?.(ev); A?.play('hurt'); }
        const v = this.vis.get(ev.id); if (v) fx.parts.emit({ x: v.px, y: v.py + 1.1, z: v.pz, vy: 1, life: 0.4, size: 3, size1: 6, color: 0xa02818, alpha: 0.8, shape: 1, grav: 4 });
        break;
      }
      case 'shieldbreak': { const v = this.vis.get(ev.id); if (v) { fx.sparks(v.px, v.py + 1.1, v.pz, 20, 0x60c0ff, 4); A?.play('shield_break', { x: v.px, z: v.pz }); } break; }
      case 'downed': g.onDowned?.(ev); A?.play('downed', this.posOf(ev.id)); break;
      case 'revived': g.feed(`${this.nameOf(ev.id)} was revived`, '#68e088'); A?.play('revive', this.posOf(ev.id)); break;
      case 'killed': g.onKilled?.(ev); break;
      case 'extracted': {
        g.onExtracted?.(ev); A?.play('extract_success', this.posOf(ev.id));
        const xv = this.extractVis[ev.x], v = this.vis.get(ev.id);
        if (xv && v) v.carry = { xv, t0: performance.now(), x: v.px, y: v.py, z: v.pz };
        if (xv?.x.kind === 'hatch') A?.play('hatch_extract', this.extractPos(ev.x));
        break;
      }
      case 'loot': break;
      case 'opened': this.containers.setOpened(ev.i, true); break;
      case 'container': this.containers.add(ev.c); g.addDynamicContainer?.(ev.c); break;
      case 'door': this.setDoor(ev.i, ev.open); A?.play('door_open', this.doorPos(ev.i)); break;
      case 'locked': if (ev.by === g.meId) { A?.play('door_locked'); g.hudMsg('LOCKED - KEY REQUIRED', '#e84a30'); } break;
      case 'unlocked': A?.play('door_unlock', this.doorPos(ev.i)); break;
      // extraction flow (sim.js): xcall -> xopen -> xclose -> xgone -> xidle / xoffline; hatches use xopen / xidle.
      // The rigs cue the timeline sounds (alarm cycles, engines, arrival, closing sequence, departure).
      case 'xcall': g.onExtractCall?.(ev); A?.play('extract_call', this.extractCallPos(ev.i)); break;
      case 'xopen': {
        const k = this.extractVis[ev.i]?.x.kind;
        if (k === 'hatch') A?.play('hatch_open', this.extractPos(ev.i));
        else A?.play(k === 'elevator' ? 'elevator_arrive' : 'elevator_door', { ...this.extractPos(ev.i), delay: k === 'metro' ? 0.45 : 0 });
        g.onExtractOpen?.(ev); break;
      }
      case 'xclose': if (ev.by != null) A?.play('extract_lever', this.extractPos(ev.i)); g.onExtractClose?.(ev); break;
      case 'xgone': break;
      case 'xidle': A?.play(this.extractVis[ev.i]?.x.kind === 'hatch' ? 'hatch_close' : 'extract_ready', this.extractCallPos(ev.i)); break;
      case 'xoffline': { const x = this.extractVis[ev.i]?.x; if (x && ev.why === 'used') g.feed(`${x.name.toUpperCase()} CLOSED FOR THE RAID`, '#9a9484'); break; }
      case 'hatchbusy': if (ev.by === g.meId) g.hudMsg('ANOTHER HATCH IS OPEN', '#e84a30'); break;
      case 'throw': A?.play('grenade_pin', this.posOf(ev.by)); break;
      case 'bounce': A?.play('grenade_bounce', { x: ev.x, z: ev.z }); break;
      case 'pop': A?.play(ev.k === 'smoke' ? 'smoke_pop' : ev.k === 'gas' ? 'gas_hiss' : 'smoke_pop', { x: ev.x, z: ev.z }); break;
      case 'beep': A?.play('mine_beep', { x: ev.x, z: ev.z }); fx.rings.add(ev.x, this.floorNear(ev.x, ev.z, ev.y), ev.z, 3, 0xff3020, 1, 0); break;
      case 'armed': A?.play('mine_arm'); break;
      case 'emote': g.onEmote?.(ev); break;
      case 'warn': g.banner(ev.msg, '#e84a30', null, 4); A?.play('raid_warning'); break;
      case 'raidover': A?.play('raid_end_siren'); break;
      case 'leap': { const gy = this.floorNear(ev.x, ev.z, ev.y); fx.rings.add(ev.x, gy, ev.z, 3.5, 0xff4020, ev.T + 0.2, 1); A?.play(ARK[this.vis.get(ev.id)?.e?.kind]?.model === 'tick' ? 'tikk_leap' : 'leapr_jump', this.posOf(ev.id)); break; }
      case 'latch': if (ev.tgt === g.meId) g.hudMsg('TIKK LATCHED! DODGE ROLL TO SHAKE IT', '#e84a30'); break;
      case 'mortar': { const gy = this.floorNear(ev.x, ev.z, ev.y); fx.rings.add(ev.x, gy, ev.z, 4, 0xff2010, ev.t, 1); A?.play('bombadier_mortar', this.posOf(ev.id)); A?.play('mortar_whistle', { x: ev.x, z: ev.z, delay: Math.max(0, (ev.t || 2.4) - 1.12) }); break; }
      case 'rockets': A?.play('rocket_launch', this.posOf(ev.id)); break;
      case 'alarm': A?.play('snytch_alarm', { x: ev.x, z: ev.z }); g.feed('SNYTCH RAISED THE ALARM - REINFORCEMENTS INBOUND', '#e84a30'); break;
      case 'flame': { const fv = this.vis.get(ev.id); if (fv) fv.flameAt = performance.now(); }   // drives the burner loop in arkAudio()
        if (Math.random() < 0.5) { const v = this.vis.get(ev.id); if (v) for (let i = 0; i < 4; i++) { const a = v.e.f + (Math.random() - .5) * 0.8, s = 6 + Math.random() * 4; fx.glow.emit({ x: v.px, y: v.py + 0.5, z: v.pz, vx: Math.sin(a) * s, vy: 0.5, vz: Math.cos(a) * s, life: 0.45, size: 6, size1: 12, color: 0xffd060, color1: 0xc02000, shape: 1, drag: 2 }); } } break;
      case 'reload': A?.play(reloadSoundFor(this.vis.get(ev.id)?.e?.wid), this.posOf(ev.id)); break;
      case 'strikeWarn': { const gy = this.world.grid.floorAt(ev.x, ev.z, 1e9); fx.rings.add(ev.x, gy, ev.z, ev.r, 0x80c8ff, ev.t, 1); this.flash(ev.x, gy + 8, ev.z, 0x80b0ff, 0.6, ev.r * 2, ev.t, 2); break; }
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
      case 'ping': fx.rings.add(ev.x, this.floorNear(ev.x, ev.z, ev.y), ev.z, 1.2, ev.col || 0xf0c030, 6, 0, 'ping' + ev.by); g.onPing?.(ev); A?.play('ui_quest', { x: ev.x, z: ev.z }); break;
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
    this.shake = Math.max(0, this.shake - dt * 1.5);
    this.R.shake = this.shake;
  }

  // -------------------------------------------------------------- queries
  posOf(id) { const v = this.vis.get(id); return v ? { x: v.px, z: v.pz } : {}; }
  nameOf(id) { return this.vis.get(id)?.e?.name || '?'; }
  doorPos(i) { const m = this.doorMeshes[i]; return m ? { x: m.position.x, z: m.position.z } : {}; }
  extractPos(i) { const x = this.extractVis[i]; return x ? { x: x.x.x, z: x.x.z } : {}; }
  extractCallPos(i) { const p = this.extractVis[i]?.x.pts?.call; return p ? { x: p[0], z: p[1] } : this.extractPos(i); }
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
  // floor height at (x, z) for an event at height y (or near the local player's level)
  floorNear(x, z, y) { return this.world.grid.floorAt(x, z, (y ?? this.g.me?.y ?? this.world.groundAt(x, z)) + 1.2); }
  findInteractable(me, pc) {
    const g = this.g; let best = null, bd = 2.1;
    const lvl = (y) => y == null || Math.abs(y - me.y) < 1.6;      // only things on our floor
    const consider = (o, d) => { if (d < bd && lvl(o.y)) { bd = d; best = o; } };
    // downed squadmates
    for (const v of this.vis.values()) {
      const e = v.e;
      if (e.type === 'raider' && e.st === 'downed' && e.id !== me.id && e.team === me.team) consider({ kind: 'revive', ref: e.id, x: e.x, z: e.z, y: e.y, time: 5, label: 'REVIVE ' + e.name }, Math.hypot(e.x - me.x, e.z - me.z) - 0.3);
      if (e.type === 'loot') consider({ kind: 'loot', ref: e.id, x: e.x, z: e.z, y: e.y, time: 0.4, label: e.label ? 'LOOT ' + e.label : 'LOOT REMAINS' }, Math.hypot(e.x - me.x, e.z - me.z));
    }
    for (const c of g.containersData) {
      if (Math.abs(c.x - me.x) > 2.5 || Math.abs(c.z - me.z) > 2.5) continue;
      const d = Math.hypot(c.x - me.x, c.z - me.z);
      const opened = g.containerOpened?.(c.i);
      consider({ kind: 'container', ref: c.i, x: c.x, z: c.z, y: c.y, time: opened ? 0.25 : g.searchTime(c.kind), label: (opened ? 'OPEN ' : 'SEARCH ') + (c.label || containerLabel(c.kind)), locked: c.locked }, d);
    }
    for (const d of g.doorsData) {
      const dd = Math.hypot(d.x - me.x, d.z - me.z);
      if (dd < 2.0) consider({ kind: 'door', ref: d.i, x: d.x, z: d.z, y: d.y, time: d.lockedNow ? 1.2 : 0, instant: !d.lockedNow, label: d.lockedNow ? 'UNLOCK DOOR' : (g.doorOpen?.(d.i) ? 'CLOSE DOOR' : 'OPEN DOOR') }, dd + 0.2);
    }
    // ladders: climb between levels (bottom -> top, top -> bottom)
    (this.world.ladders || []).forEach((l, i) => {
      const db = Math.hypot(l.x0 - me.x, l.z0 - me.z), dt = Math.hypot(l.x1 - me.x, l.z1 - me.z);
      if (db < 1.4 && Math.abs(me.y - l.y0) < 1.2) consider({ kind: 'ladder', ref: i, up: true, x: l.x0, z: l.z0, time: 0.45, label: 'CLIMB UP' }, db + 0.3);
      else if (dt < 1.4 && Math.abs(me.y - l.y1) < 1.2) consider({ kind: 'ladder', ref: i, up: false, x: l.x1, z: l.z1, time: 0.45, label: 'CLIMB DOWN' }, dt + 0.3);
    });
    // extracts: CALL at the call button, DEPART on the lever inside the cabin, the hatch with a key
    for (const x of g.extractsData) {
      const P = x.pts; if (!P || Math.abs((x.y ?? me.y) - me.y) > 2.0) continue;
      const st = g.extractState?.(x.i), noun = extractNoun(x.kind), dc = Math.hypot(P.call[0] - me.x, P.call[1] - me.z);
      const at = { ref: x.i, x: P.call[0], z: P.call[1] };
      if (x.kind === 'hatch') {
        if (dc > (P.callR || 2.4)) continue;
        const dh = Math.max(0, dc - 0.6);       // the hatch is big: its prompt reaches past the usual 2.1 m
        if (st === 'offline') consider({ ...at, kind: 'offline', time: 999, label: 'HATCH OFFLINE (MAP CONDITION)' }, dh);
        else if (st === 'open') consider({ ...at, kind: 'info', time: 999, label: `HATCH OPEN - STEP IN (${Math.ceil(x.t || 0)}S)` }, dh);
        else if (g.extractsData.some(h => h.kind === 'hatch' && h.state === 'open')) consider({ ...at, kind: 'info', time: 999, label: 'ANOTHER HATCH IS OPEN' }, dh);
        else consider({ ...at, kind: 'hatch', time: 2.5, label: 'OPEN RAIDER HATCH (KEY)' }, dh);
        continue;
      }
      if (dc < (P.callR || 1.8)) {
        if (st === 'offline') consider({ ...at, kind: 'offline', time: 999, label: x.used ? `${x.name.toUpperCase()} - CLOSED (USED)` : `${noun} OFFLINE (MAP CONDITION)` }, dc);
        else if (st === 'idle') consider({ ...at, kind: 'extract', time: 1.2, label: `CALL ${noun} - ${x.name}` }, dc);
        else {
          const s = Math.ceil(x.t || 0);
          const label = st === 'called' ? `${noun} INBOUND - ${s}S` : st === 'open' ? `${noun} BOARDING - GET IN (${s}S)` : st === 'closing' ? `${noun} DEPARTING - ${s}S` : `${noun} RETURNING - ${s}S`;
          consider({ ...at, kind: 'info', time: 999, label }, dc + 0.5);
        }
      }
      if (st === 'open' && inCabin(x, me.x, me.y, me.z)) {
        for (const p of P.departs) {
          const d = Math.hypot(p[0] - me.x, p[1] - me.z);
          if (d < 1.4) consider({ ref: x.i, x: p[0], z: p[1], kind: 'depart', time: 1.5, label: x.kind === 'metro' ? 'DEPART - PULL THE EMERGENCY LEVER' : x.kind === 'airshaft' ? 'DEPART - SIGNAL THE DROPSHIP' : 'DEPART - PULL THE LEVER' }, d - 0.5);
        }
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
function extractNoun(kind) { return kind === 'metro' ? 'METRO' : kind === 'airshaft' ? 'DROPSHIP' : kind === 'hatch' ? 'RAIDER HATCH' : 'ELEVATOR'; }
function distToSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / l2));
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
