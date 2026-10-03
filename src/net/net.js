// Co-op networking over PeerJS (WebRTC data channels, star topology, host authoritative).
// Host: invite code -> peer id `darkraiders-<CODE>`; clients connect with the code.
// Lobby: hello / lobby / ready / chat / start.  Raid: st (client state), act (client actions),
// snap (host snapshots @15 Hz), ev (host events), res (request replies), done/end.
import { HostSession } from '../game/session.js';

const PREFIX = 'darkraiders-';
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const NET_VERSION = 1;
// a client that hears nothing from the host for this long treats it as gone (and carries on solo); the host
// lets a silent client go after GUEST_SILENCE (ms)
const HOST_SILENCE = 8000, GUEST_SILENCE = 30000;
// every CACHE_EVERY s the host tells each client what lies in the loot around it (bags on the ground, the
// contents of opened containers), so a client that has to carry on solo keeps the loot it was standing in
const CACHE_EVERY = 2, CACHE_R = 60;
// the deployed build (each deploy lives under v/<sha>/): host and client must run the same one
export const BUILD = (import.meta.url.match(/\/v\/([0-9a-f]{6,})\//) || [])[1] || 'dev';
// this browser tab: sent with every hello so the host can tell a repeated join from a new raider
const CLIENT_ID = Math.random().toString(36).slice(2, 10);
export function makeCode(n = 5) { let s = ''; for (let i = 0; i < n; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }

// ------------------------------------------------------------------ transports
// PeerJS transport (default) or BroadcastChannel (same-browser testing: ?net=local)
// Optional self-hosted signalling: ?peerhost=example.com&peerport=443&peerpath=/myapp&peersecure=1
function peerOptions() {
  const q = new URLSearchParams(location.search), o = { debug: 0 };
  if (q.get('peerhost')) { o.host = q.get('peerhost'); o.port = +(q.get('peerport') || 443); o.path = q.get('peerpath') || '/'; o.secure = q.get('peersecure') !== '0'; }
  return o;
}
class PeerTransport {
  constructor() { this.peer = null; this.conns = new Map(); this.handlers = {}; }
  on(ev, fn) { this.handlers[ev] = fn; }
  emit(ev, ...a) { this.handlers[ev]?.(...a); }
  host(code) {
    return new Promise((res, rej) => {
      if (typeof Peer === 'undefined') return rej(new Error('PeerJS failed to load (are you offline?)'));
      try { this.peer?.destroy(); } catch (e) { /* */ }
      this.peer = new Peer(PREFIX + code, peerOptions());
      this.peer.on('open', () => res());
      this.peer.on('error', (e) => { if (!this.opened) { try { this.peer.destroy(); } catch (x) { /* */ } rej(e); } else this.emit('error', e); });
      this.peer.on('disconnected', () => { try { this.peer.reconnect(); } catch (e) { /* */ } });
      this.peer.on('connection', (c) => this._wire(c));
      this.peer.on('open', () => { this.opened = true; });
    });
  }
  join(code) {
    return new Promise((res, rej) => {
      if (typeof Peer === 'undefined') return rej(new Error('PeerJS failed to load (are you offline?)'));
      try { this.peer?.destroy(); } catch (e) { /* */ }   // never keep a second connection to the host alive
      this.peer = new Peer(undefined, peerOptions());
      this.peer.on('error', (e) => { rej(e); this.emit('error', e); });
      this.peer.on('open', () => {
        const c = this.peer.connect(PREFIX + code.toUpperCase(), { reliable: true, serialization: 'json' });
        const to = setTimeout(() => rej(new Error('Could not reach that squad (code wrong or host offline)')), 15000);
        // the host's connection is known as 'host' on this side (Net sends to 'host', like LocalTransport)
        c.on('open', () => { clearTimeout(to); this._wire(c, 'host'); res(); });
      });
    });
  }
  _wire(c, alias = null) {
    const id = alias || c.peer;
    this.conns.set(id, c);
    const ready = () => { this.emit('connect', id); };
    if (c.open) ready(); else c.on('open', ready);
    c.on('data', (d) => this.emit('message', id, d));
    c.on('close', () => { if (this.conns.get(id) !== c) return; this.conns.delete(id); this.emit('disconnect', id); });   // a replaced / dropped connection closes silently
    c.on('error', () => { /* surfaced via close */ });
  }
  send(id, msg) { const c = this.conns.get(id); if (c && c.open) { try { c.send(msg); } catch (e) { /* closed */ } } }
  broadcast(msg, except = null) { for (const [id, c] of this.conns) if (id !== except && c.open) { try { c.send(msg); } catch (e) { /* */ } } }
  drop(id) { const c = this.conns.get(id); this.conns.delete(id); try { c?.close(); } catch (e) { /* */ } }   // no 'disconnect' event
  close() { try { this.peer?.destroy(); } catch (e) { /* */ } this.conns.clear(); }
  get myId() { return this.peer?.id; }
}
class LocalTransport {
  constructor() { this.handlers = {}; this.conns = new Map(); this.id = 'local-' + Math.random().toString(36).slice(2, 8); }
  on(ev, fn) { this.handlers[ev] = fn; }
  emit(ev, ...a) { this.handlers[ev]?.(...a); }
  host(code) { this.code = code; this.isHost = true; this._open(); return Promise.resolve(); }
  join(code) { this.code = code; this._open(); this.bc.postMessage({ to: 'host', from: this.id, hello: true }); this.conns.set('host', true); setTimeout(() => this.emit('connect', 'host'), 50); return Promise.resolve(); }
  _open() {
    this.bc = new BroadcastChannel('dr-' + this.code);
    this.bc.onmessage = (e) => {
      const m = e.data;
      if (m.to !== (this.isHost ? 'host' : this.id) && m.to !== '*') return;
      if (m.hello && this.isHost) { this.conns.set(m.from, true); this.emit('connect', m.from); return; }
      if (m.bye) { this.conns.delete(m.from); this.emit('disconnect', m.from); return; }
      this.emit('message', this.isHost ? m.from : 'host', m.msg);
    };
    addEventListener('beforeunload', () => this.bc.postMessage({ to: this.isHost ? '*' : 'host', from: this.isHost ? 'host' : this.id, bye: true }));
  }
  send(id, msg) { this.bc.postMessage({ to: this.isHost ? id : 'host', from: this.isHost ? 'host' : this.id, msg }); }
  broadcast(msg, except = null) { if (!this.isHost) return this.send('host', msg); for (const id of this.conns.keys()) if (id !== except) this.send(id, msg); }
  drop(id) { this.conns.delete(id); }
  close() { this.bc?.close(); }
  get myId() { return this.isHost ? 'host' : this.id; }
}

// ------------------------------------------------------------------ lobby + raid
export class Net {
  constructor(app, { local = false } = {}) {
    this.app = app;
    this.cid = CLIENT_ID;
    this.t = local ? new LocalTransport() : new PeerTransport();
    this.isHost = false; this.code = null;
    this.members = [];          // [{pid, name, outfit, level, ready, slot}]
    this.handlers = {};
    this.sessions = new Map();  // host: pid -> HostSession
    this.pending = new Map();   // client: reqId -> resolve
    this.cache = { l: [], c: [] };   // client: the host's last report of the loot around us
    this.reqId = 0;
    this.t.on('message', (from, m) => this.onMessage(from, m));
    this.t.on('connect', (id) => this.onConnect(id));
    this.t.on('disconnect', (id) => this.onDisconnect(id));
    this.t.on('error', (e) => this.emit('error', e));
  }
  on(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); }
  emit(ev, ...a) { for (const f of this.handlers[ev] || []) f(...a); }
  me() { const p = this.app.profile; return { name: p.name, outfit: p.settings.outfit || 'scav', level: p.level }; }

  async host() {
    this.isHost = true;
    for (let tries = 0; tries < 3; tries++) {
      this.code = makeCode();
      try { await this.t.host(this.code); break; } catch (e) { if (tries === 2 || !(String(e.type || e.message).includes('unavailable'))) throw e; }
    }
    this.members = [{ pid: 'host', ...this.me(), ready: false, slot: 0 }];
    this.emit('lobby', this.lobbyState());
    return this.code;
  }
  async join(code) {
    this.isHost = false; this.code = code.toUpperCase().trim();
    await this.t.join(this.code);
    this.t.send('host', { k: 'hello', v: NET_VERSION, build: BUILD, cid: this.cid, ...this.me() });
  }
  leave() { this.t.close(); this.members = []; this.emit('closed'); }
  lobbyState() { return { code: this.code, members: this.members, map: this.map, host: this.isHost }; }
  setMap(mapId) { this.map = mapId; this.broadcastLobby(); }
  setReady(r) {
    if (this.isHost) { this.members[0].ready = r; this.broadcastLobby(); }
    else this.t.send('host', { k: 'ready', r });
  }
  chat(text) {
    const msg = { k: 'chat', from: this.app.profile.name, text: String(text).slice(0, 120), slot: this.mySlot ?? 0 };
    if (this.isHost) { this.t.broadcast(msg); this.emit('chat', msg); }
    else this.t.send('host', msg);
  }
  broadcastLobby() { if (!this.isHost) return; const s = this.lobbyState(); this.t.broadcast({ k: 'lobby', s }); this.emit('lobby', s); }
  resetRaidState() { this.game = null; this.myEnt = null; this._youResolve = null; this.sessions.clear(); this.pending.clear(); this.done = new Set(); this.cache = { l: [], c: [] }; this.hostGoneDone = false; }
  startRaid(opts) {      // host
    this.resetRaidState();
    this.raidOpts = opts;
    this.t.broadcast({ k: 'start', opts });
    this.emit('start', opts);
  }

  onConnect(id) { if (this.isHost) { /* wait for hello */ } else this.emit('connected'); }
  onDisconnect(id) {
    if (this.isHost) {
      const m = this.members.find(x => x.pid === id);
      this.members = this.members.filter(x => x.pid !== id);
      const s = this.sessions.get(id);
      if (s && this.game?.sim) { s.ent.st = 'out'; this.game.sim.remove(s.ent); }
      this.sessions.delete(id);
      this.done?.add(id);
      if (m) this.emit('chat', { from: 'SYSTEM', text: `${m.name} disconnected`, slot: 0 });
      this.broadcastLobby();
      this.checkAllDone();
    } else this.hostGone();
  }
  // client: the host left / crashed / went silent - the raid (if any) carries on solo on this machine
  hostGone() {
    const g = this.game;
    if (!this.hostGoneDone) { this.hostGoneDone = true; this.emit('hostlost'); }
    g?.onHostLost?.(this);       // (once per raid - also for a raid that only got going after the host was gone)
    try { this.t.close(); } catch (e) { /* */ }
  }
  onMessage(from, m) {
    if (!m || !m.k) return;
    if (this.isHost) { const s = this.sessions.get(from); if (s) s.heard = performance.now(); return this.hostMsg(from, m); }
    this.heard = performance.now();
    return this.clientMsg(m);
  }

  // ------------------------------------------------------------------ host side
  hostMsg(from, m) {
    switch (m.k) {
      case 'hello': {
        if ((m.build && m.build !== BUILD && BUILD !== 'dev' && m.build !== 'dev') || (m.v && m.v !== NET_VERSION)) { this.t.send(from, { k: 'oldver' }); return; }
        if (this.game) { this.t.send(from, { k: 'busy' }); return; }
        // the same raider again (a repeated hello, or a second connection from the same join - e.g. JOIN tapped
        // twice): one member, on the newest connection; the older connection is dropped quietly
        const prev = this.members.find(x => x.pid !== 'host' && (x.pid === from || (m.cid && x.cid === m.cid)));
        if (prev) {
          if (prev.pid !== from) { this.t.drop?.(prev.pid); prev.pid = from; }
          Object.assign(prev, { name: (m.name || 'Raider').slice(0, 16), outfit: m.outfit, level: m.level, cid: m.cid });
          this.t.send(from, { k: 'welcome', slot: prev.slot });
          this.broadcastLobby();
          break;
        }
        if (this.members.length >= 4) { this.t.send(from, { k: 'full' }); return; }
        const used = new Set(this.members.map(x => x.slot)); let slot = 1; while (used.has(slot)) slot++;
        this.members.push({ pid: from, cid: m.cid, name: (m.name || 'Raider').slice(0, 16), outfit: m.outfit, level: m.level, ready: false, slot });
        this.t.send(from, { k: 'welcome', slot });
        this.emit('chat', { from: 'SYSTEM', text: `${m.name} joined the squad`, slot: 0 });
        this.broadcastLobby();
        break;
      }
      case 'ready': { const mm = this.members.find(x => x.pid === from); if (mm) { mm.ready = !!m.r; this.broadcastLobby(); } break; }
      case 'chat': { const mm = this.members.find(x => x.pid === from); const msg = { k: 'chat', from: mm?.name || m.from, text: String(m.text).slice(0, 120), slot: mm?.slot ?? 1 }; this.t.broadcast(msg); this.emit('chat', msg); if (this.game) this.game.sim.emit({ e: 'chat', from: msg.from, text: msg.text, slot: msg.slot, local: true }); break; }
      case 'st': { const s = this.sessions.get(from); if (s) s.state(m.s); break; }
      case 'act': this.hostAct(from, m); break;
      case 'done': this.done?.add(from); this.checkAllDone(); break;
    }
  }
  async hostAct(from, m) {
    const s = this.sessions.get(from); if (!s) return;
    const a = m.a;
    try {
      switch (a.t) {
        case 'fire': s.fire(a.s); break;
        case 'launch': s.launch(a.s); break;
        case 'throw': s.throwItem(a.id, a.x, a.z); break;
        case 'melee': s.melee(a.a, a.m, a.o); break;
        case 'open': this.t.send(from, { k: 'res', id: m.id, d: await s.open(a.kind, a.ref) }); break;
        case 'take': this.t.send(from, { k: 'res', id: m.id, d: await s.take(a.kind, a.ref, a.uid, a.qty) }); break;
        case 'put': s.put(a.kind, a.ref, a.stack); break;
        case 'drop': s.dropItems(a.stacks, a.label); break;
        case 'door': s.door(a.i, a.key); break;
        case 'xcall': s.callExtract(a.i); break;
        case 'xdepart': s.departExtract(a.i); break;
        case 'hatch': s.hatch(a.i); break;
        case 'revive': s.reviveNow(a.id); break;
        case 'eff': s.useEffect(a.eff); break;
        case 'shield': s.setShield(a.stack, a.charge); break;
        case 'dodge': s.dodge(); break;
        case 'fall': s.fall(a.dmg); break;
        case 'noise': s.noise(a.r); break;
        case 'chat': s.chat(a.text); break;
        case 'ping': s.ping(a.x, a.z); break;
        case 'emote': s.emote(a.text); break;
        case 'giveup': s.giveUp(); break;
        case 'stats': { const e = s.ent; e.stats = a.stats || {}; e.maxHp = a.stats?.max_hp || 100; e.hp = Math.min(e.hp, e.maxHp) || e.maxHp; if (a.regen) e.regen = a.regen; break; }
      }
    } catch (e) { console.warn('bad act', a.t, e); }
  }
  // called by RaidGame.start on the host: create raider entities for every remote member
  hostAttach(game, spawn) {
    this.game = game; const sim = game.sim;
    const me = game.me; me.slot = 0;
    let k = 0;
    for (const m of this.members) {
      if (m.pid === 'host') continue;
      k++;
      const a = (k / 4) * Math.PI * 2;
      const [x, z] = sim.nav.randomOpenNear(spawn.x + Math.cos(a) * 2, spawn.z + Math.sin(a) * 2, 2, sim.rng);
      const e = sim.addRaider({ pid: m.pid, name: m.name, team: 1, x, z, outfit: m.outfit, stats: m.stats || {} });
      e.slot = m.slot;
      this.sessions.set(m.pid, new HostSession(sim, e));
      this.t.send(m.pid, { k: 'you', id: e.id, x, z, y: e.y });
    }
    this.snapT = 0; this.cacheT = 0;
  }
  hostTick(evs, dt) {
    // a client gone quiet (frozen / crashed without the connection closing) is let go: its raider leaves the
    // raid and, when it comes back, it finds the host gone and carries on solo
    const now = performance.now();
    for (const [pid, s] of this.sessions) if (s.heard && now - s.heard > GUEST_SILENCE) { this.t.drop?.(pid); this.onDisconnect(pid); }   // (heard: once it has loaded in)
    if (!this.t.conns.size) return;
    this.cacheT += dt;
    if (this.cacheT >= CACHE_EVERY) { this.cacheT = 0; this.sendCaches(); }
    const pub = evs.filter(e => !e.local);
    if (pub.length) this.t.broadcast({ k: 'ev', e: pub });
    this.snapT += dt;
    if (this.snapT < 1 / 15) return;
    this.snapT = 0;
    const sim = this.game.sim;
    for (const [pid, s] of this.sessions) {
      const me = s.ent;
      const ents = [];
      for (const e of sim.entities.values()) {
        const near = Math.abs(e.x - me.x) < 70 && Math.abs(e.z - me.z) < 60;
        if (e.type === 'raider') { if (near || !e.bot) ents.push(packRaider(e)); }
        else if (e.type === 'ark') { if (near || (e.st === 'alert' && Math.abs(e.x - me.x) < 110)) ents.push(packArk(e)); }
        else if (near) ents.push(packOther(e));
      }
      this.t.send(pid, { k: 'snap', t: sim.t, tl: sim.timeLeft, ents, x: sim.extracts.map(x => x.used ? [x.state, +x.t.toFixed(1), x.callDur || 0, 1] : [x.state, +x.t.toFixed(1), x.callDur || 0]), d: sim.doors.map(d => d.open ? 1 : 0), ended: sim.raidEnded });
    }
  }
  sendCaches() {
    const sim = this.game.sim;
    for (const [pid, s] of this.sessions) {
      const me = s.ent, near = (o) => Math.abs(o.x - me.x) < CACHE_R && Math.abs(o.z - me.z) < CACHE_R;
      const l = [], c = [];
      for (const e of sim.entities.values()) if (e.type === 'loot' && e.items?.length && near(e)) l.push([e.id, r2(e.x), r2(e.y), r2(e.z), e.kind, e.label || null, e.items]);
      for (const k of sim.containers) if (k?.opened && k.contents && near(k)) c.push([k.i, k.contents]);
      this.t.send(pid, { k: 'cache', l, c });
    }
  }
  checkAllDone() {
    if (!this.isHost || !this.game || !this.done) return;
    const humans = this.members.length;
    const hostDone = !!this.game.localDone;
    if (hostDone && this.done.size >= humans - 1) {
      this.t.broadcast({ k: 'end' });
      this.game.endIn = 3;
    }
  }
  reportDone(outcome) {
    if (this.isHost) this.checkAllDone();
    else this.t.send('host', { k: 'done', outcome });
  }

  // ------------------------------------------------------------------ client side
  clientMsg(m) {
    switch (m.k) {
      case 'welcome': this.mySlot = m.slot; break;
      case 'full': this.emit('error', new Error('That squad is full (4/4)')); break;
      case 'oldver': this.emit('error', new Error('You and the host are on different versions of the game - both close and reopen it, then try again')); break;
      case 'busy': this.emit('error', new Error('That squad is already in a raid - try again when they return')); break;
      case 'lobby': this.members = m.s.members; this.map = m.s.map; this.emit('lobby', m.s); break;
      case 'chat': this.emit('chat', m); if (this.game) this.game.onChat({ from: m.from, text: m.text, slot: m.slot }); break;
      case 'start': this.resetRaidState(); this.raidOpts = m.opts; this.emit('start', m.opts); break;
      case 'you': this.myEnt = m; this._youResolve?.(m); this._youResolve = null; break;
      case 'snap': this.applySnap(m); break;
      case 'ev': for (const ev of m.e) this.game?.dispatch(ev); break;
      case 'res': { const r = this.pending.get(m.id); if (r) { this.pending.delete(m.id); r(m.d); } break; }
      case 'end': if (this.game) { if (!this.game.localDone) this.game.onLocalExtract(); this.game.endIn = 2.5; } break;
      case 'cache': this.cache = { l: m.l || [], c: m.c || [] }; break;
    }
  }
  // keep the cached loot in step with this client's own takes / put-backs between the host's reports
  cacheTake(kind, ref, uid, qty) {
    const list = kind === 'container' ? this.cache.c.find(x => x[0] === ref)?.[1] : this.cache.l.find(x => x[0] === ref)?.[6];
    const i = list ? list.findIndex(s => s.uid === uid) : -1; if (i < 0) return;
    if (qty == null || qty >= list[i].qty) list.splice(i, 1); else list[i] = { ...list[i], qty: list[i].qty - qty };
  }
  cachePut(kind, ref, stack) {
    const list = kind === 'container' ? this.cache.c.find(x => x[0] === ref)?.[1] : this.cache.l.find(x => x[0] === ref)?.[6];
    if (list && stack) list.push({ ...stack });
  }
  // RaidGame (client) asks for its entity
  async clientJoinRaid(game, sp) {
    this.game = game;
    // the host hands us our raider once it has loaded; give up (back to the lobby) if that never comes
    const you = this.myEnt || await new Promise((r, rej) => {
      this._youResolve = r;
      setTimeout(() => { if (this._youResolve === r) { this._youResolve = null; rej(new Error('The host never sent your raider - check the connection and try again')); } }, 45000);
    });
    const e = { id: you.id, type: 'raider', x: you.x, z: you.z, y: you.y ?? game.world.grid.floorAt(you.x, you.z, game.world.groundAt(you.x, you.z) + 0.5), f: 0, mf: 0, team: 1, slot: this.mySlot ?? 1,
      name: this.app.profile.name, outfit: this.app.profile.settings.outfit || 'scav', st: 'alive', hp: 100, maxHp: 100, sh: 0, shMax: 0, buffs: {}, stats: game.stats0 };
    game.ents.set(e.id, e);
    this.session = new ClientSession(this, e);
    const st = game.stats0 || {};
    this.act({ t: 'stats', stats: Object.fromEntries(Object.entries(st).filter(([k, v]) => typeof v === 'number')), regen: game.o.regen || null });
    this.snaps = [];
    this.sendT = 0;
    this.heard = this.lastUpd = performance.now();
    return e;
  }
  applySnap(m) {
    const g = this.game; if (!g) return;
    g.timeLeft = m.tl; g.simTime = m.t;
    // extract state + timer (+ call length for the countdown displays) mirror the host every snapshot
    m.x.forEach(([st, t, cd, used], i) => { const x = g.extractsData[i]; if (!x) return; x.state = st; x.t = t; if (cd) x.callDur = cd; if (used) x.used = true; });
    m.d.forEach((o, i) => { if (g.doorsData[i] && g.doorsData[i].open !== !!o) { g.doorsData[i].open = !!o; g.view?.setDoor(i, !!o); } });
    const now = performance.now();
    const seen = new Set();
    for (const p of m.ents) {
      const e = unpack(p);
      seen.add(e.id);
      let cur = g.ents.get(e.id);
      if (e.id === g.meId) { // own entity: only vitals from the host
        if (cur) { cur.hp = e.hp; cur.maxHp = e.maxHp; cur.sh = e.sh; cur.shMax = e.shMax; if (cur.st !== e.st) { cur.st = e.st; } }
        continue;
      }
      if (!cur) { cur = e; cur.rx = e.x; cur.rz = e.z; cur.ry = e.y; cur.hist = []; g.ents.set(e.id, cur); }
      else { const hist = cur.hist; Object.assign(cur, e); cur.hist = hist; }
      cur.hist.push({ t: now, x: e.x, y: e.y, z: e.z, a: e.alt || 0 });   // ARK altitude too (y = the floor under a flyer)
      if (cur.hist.length > 6) cur.hist.shift();
    }
    for (const id of [...g.ents.keys()]) if (!seen.has(id) && id !== g.meId) g.ents.delete(id);
  }
  clientUpdate(dt) {
    const g = this.game; if (!g) return;
    // the host has gone quiet: carry on solo. (Coming back from being frozen ourselves - a locked phone - first
    // gives the connection a fresh chance to deliver what is queued.)
    const now = performance.now();
    if (now - (this.lastUpd || now) > 1500) this.heard = Math.max(this.heard || 0, now);
    this.lastUpd = now;
    if (now - (this.heard || now) > HOST_SILENCE) { this.hostGone(); return; }
    // interpolate remote entities ~110 ms in the past
    const rt = performance.now() - 110;
    for (const e of g.ents.values()) {
      if (e.id === g.meId || !e.hist?.length) continue;
      const h = e.hist;
      let a = h[0], b = h[h.length - 1];
      for (let i = 0; i < h.length - 1; i++) if (h[i].t <= rt && h[i + 1].t >= rt) { a = h[i]; b = h[i + 1]; break; }
      const k = b.t > a.t ? Math.max(0, Math.min(1, (rt - a.t) / (b.t - a.t))) : 1;
      e.rx = a.x + (b.x - a.x) * k; e.rz = a.z + (b.z - a.z) * k; e.ry = a.y + (b.y - a.y) * k;
      if (e.type === 'ark') e.ra = (a.a || 0) + ((b.a || 0) - (a.a || 0)) * k;
    }
    this.sendT += dt;
    if (this.sendT >= 1 / 20) { this.sendT = 0; this.t.send('host', { k: 'st', s: this.session.lastState }); }
  }
  act(a) { this.t.send('host', { k: 'act', a }); }
  request(a) { const id = ++this.reqId; return new Promise((res) => { this.pending.set(id, res); this.t.send('host', { k: 'act', id, a }); setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); res(null); } }, 6000); }); }
}

// client-side mirror of HostSession
export class ClientSession {
  constructor(net, ent) { this.net = net; this.ent = ent; this.lastState = {}; }
  state(u) { Object.assign(this.ent, u); Object.assign(this.lastState, u); }
  fire(s) { this.net.act({ t: 'fire', s: round(s) }); this.net.game.predicted = true; }
  launch(s) { this.net.act({ t: 'launch', s: round(s) }); }
  throwItem(id, x, z) { this.net.act({ t: 'throw', id, x, z }); }
  melee(a, m, o) { this.net.act({ t: 'melee', a, m, o }); }
  open(kind, ref) { return this.net.request({ t: 'open', kind, ref }); }
  take(kind, ref, uid, qty = null) { return this.net.request({ t: 'take', kind, ref, uid, qty }).then(s => { if (s) this.net.cacheTake(kind, ref, uid, s.qty); return s; }); }
  put(kind, ref, stack) { this.net.act({ t: 'put', kind, ref, stack }); this.net.cachePut(kind, ref, stack); }
  dropItems(stacks, label) { this.net.act({ t: 'drop', stacks, label }); }
  door(i, key) { this.net.act({ t: 'door', i, key }); }
  callExtract(i) { this.net.act({ t: 'xcall', i }); }
  departExtract(i) { this.net.act({ t: 'xdepart', i }); }
  hatch(i) { this.net.act({ t: 'hatch', i }); }
  reviveNow(id) { this.net.act({ t: 'revive', id }); }
  useEffect(eff) { this.net.act({ t: 'eff', eff }); }
  setShield(stack, charge) { this.net.act({ t: 'shield', stack, charge }); }
  dodge() { this.net.act({ t: 'dodge' }); }
  fall(dmg) { this.net.act({ t: 'fall', dmg }); }
  noise(r) { this.net.act({ t: 'noise', r }); }
  chat(text) { this.net.act({ t: 'chat', text }); }
  ping(x, z) { this.net.act({ t: 'ping', x, z }); }
  emote(text) { this.net.act({ t: 'emote', text }); }
  giveUp() { this.net.act({ t: 'giveup' }); }
}

// ------------------------------------------------------------------ packing
const ST = ['alive', 'downed', 'dead', 'out'], AST = ['idle', 'search', 'alert', 'dead'];
const r2 = v => Math.round(v * 100) / 100;
function round(s) { const o = {}; for (const k in s) o[k] = typeof s[k] === 'number' ? Math.round(s[k] * 1000) / 1000 : s[k]; return o; }
function packRaider(e) {
  const fl = (e.moving ? 1 : 0) | (e.sprint ? 2 : 0) | (e.crouch ? 4 : 0) | (e.flash ? 8 : 0) | (e.bot ? 16 : 0) | (e.bot && e.temper === 'hostile' ? 32 : 0);
  return ['r', e.id, r2(e.x), r2(e.y), r2(e.z), r2(e.f), r2(e.mf || 0), fl, ST.indexOf(e.st), Math.round(e.hp), e.maxHp, Math.round(e.sh), e.shMax, e.wk, e.outfit, e.name, e.team, e.slot ?? -1, e.emote || null, e.tagged || 0, e.wid || null];
}
function packArk(e) {
  const br = e.brain, fl = br ? ((br.stunT > 0 ? 1 : 0) | (br.burst > 0 ? 2 : 0) | (br.leap ? 4 : 0)) : 0;
  let broken = 0; for (const k in e.parts) if (e.parts[k] <= 0) (broken ||= []).push(k);
  return ['a', e.id, e.kind, r2(e.x), r2(e.y), r2(e.z), r2(e.f), r2(e.alt || 0), AST.indexOf(e.st), r2(e.gaze ?? e.f), r2(e.vis || 0), r2(e.tele || 0), r2(e.hp / e.maxHp), e.dormant ? 1 : 0, br?.target || 0, fl, broken];
}
function packOther(e) {
  if (e.type === 'loot') return ['l', e.id, r2(e.x), r2(e.y), r2(e.z), e.kind, e.label || null];
  if (e.type === 'proj') return ['p', e.id, e.kind, r2(e.x), r2(e.y), r2(e.z)];
  if (e.type === 'hz') return ['h', e.id, e.kind, r2(e.x), r2(e.y), r2(e.z), e.r, r2(e.age), e.dur];
  return ['?', e.id];
}
function unpack(p) {
  switch (p[0]) {
    case 'r': return { type: 'raider', id: p[1], x: p[2], y: p[3], z: p[4], f: p[5], mf: p[6], moving: !!(p[7] & 1), sprint: !!(p[7] & 2), crouch: !!(p[7] & 4), flash: !!(p[7] & 8), bot: !!(p[7] & 16), hostile: !!(p[7] & 32), st: ST[p[8]], hp: p[9], maxHp: p[10], sh: p[11], shMax: p[12], wk: p[13], outfit: p[14], name: p[15], team: p[16], slot: p[17], emote: p[18], tagged: p[19], wid: p[20], r: 0.35, buffs: {} };
    case 'a': return { type: 'ark', id: p[1], kind: p[2], x: p[3], y: p[4], z: p[5], f: p[6], alt: p[7], st: AST[p[8]], gaze: p[9], vis: p[10], tele: p[11], hpf: p[12], dormant: !!p[13], tgt: p[14], fl: p[15] || 0, broken: p[16] || null, r: 0.6 };
    case 'l': return { type: 'loot', id: p[1], x: p[2], y: p[3], z: p[4], kind: p[5], label: p[6] };
    case 'p': return { type: 'proj', id: p[1], kind: p[2], x: p[3], y: p[4], z: p[5] };
    case 'h': return { type: 'hz', id: p[1], kind: p[2], x: p[3], y: p[4], z: p[5], r: p[6], age: p[7], dur: p[8] };
  }
  return { type: '?', id: p[1] };
}
