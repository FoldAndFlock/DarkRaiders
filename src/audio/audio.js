// DarkRaiders audio system – everything synthesised at runtime with the Web Audio API.
//
//   import { audio } from './audio/audio.js';
//   audio.init();                                   // from a user gesture
//   audio.play('gun_rifle', { x, z });              // positional one-shot → { stop() }
//   const h = audio.loop('wazp_loop', { x, z });    // → { setPos, setVol, setPitch, setOccluded, stop }
//   audio.music('raid_calm', { map: 'green_gate' }); audio.setIntensity(0.7);
//
// Every call is a safe no-op before init() (music/weather/intensity requests are remembered and
// applied on init). Errors are caught and collected in audio.errors instead of throwing.
import { SR, rng, peak, rms } from './dsp.js';
import { SFX, PREWARM } from './sfx.js';
import { MusicEngine, MUSIC_STATES, MAPS } from './music.js';
import { SONGS } from './songs.js';
import { Muzak } from './muzak.js';

const NOOP = Object.freeze({ stop() {}, setPos() {}, setVol() {}, setPitch() {}, setOccluded() {}, playing: false });
const MAX_VOICES = 48, MAX_LOOPS = 32;
const clamp01 = (v) => Math.min(1, Math.max(0, +v || 0));
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.85, music: 0.55, sfx: 0.9, ui: 0.7 };
    this.lx = 0; this.lz = 0;
    this.bufs = new Map(); this.voices = []; this.loops = new Set(); this.wloops = {};
    this.queue = []; this.errors = []; this.warned = new Set();
    this.weatherState = { rain: 0, wind: 0, storm: false };
    this.pendingMusic = null; this.intensity = null;
  }
  get ready() { return !!this.ctx; }

  // ------------------------------------------------------------------ setup
  init() {
    try {
      if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume(); return true; }
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return false;
      const ctx = new AC({ latencyHint: 'interactive' });
      const g = (v) => { const n = ctx.createGain(); n.gain.value = v; return n; };
      this.master = g(this.vol.master);
      this.limiter = ctx.createDynamicsCompressor();
      Object.entries({ threshold: -3, knee: 1, ratio: 20, attack: 0.001, release: 0.12 }).forEach(([k, v]) => { this.limiter[k].value = v; });
      this.clip = ctx.createWaveShaper(); this.clip.curve = softClipCurve(); this.clip.oversample = '2x';
      this.master.connect(this.limiter).connect(this.clip).connect(ctx.destination);
      this.sfxBus = g(this.vol.sfx);
      this.sfxComp = ctx.createDynamicsCompressor();      // glue for dense firefights
      Object.entries({ threshold: -14, knee: 10, ratio: 3.5, attack: 0.004, release: 0.18 }).forEach(([k, v]) => { this.sfxComp[k].value = v; });
      this.sfxBus.connect(this.sfxComp).connect(this.master);
      this.uiBus = g(this.vol.ui); this.uiBus.connect(this.master);
      this.musicBus = g(this.vol.music); this.musicBus.connect(this.master);
      this.ctx = ctx;
      this.mus = new MusicEngine(ctx, this.musicBus);
      if (ctx.state !== 'running') ctx.resume();
      if (this.pendingMusic) { const [s, o] = this.pendingMusic; this.pendingMusic = null; this.music(s, o); }
      if (this.intensity != null) this.mus.setIntensity(this.intensity);
      this.weather(this.weatherState);
      this.queue = [...PREWARM, ...Object.keys(SFX).filter((n) => !PREWARM.includes(n))];
      this._prewarm();
      return true;
    } catch (e) {
      this._err('init', e); this.ctx = null; return false;
    }
  }
  unlock() { return this.init(); }
  suspend() { try { this.ctx?.suspend(); } catch (e) { this._err('suspend', e); } }
  resume() { try { this.ctx?.resume(); } catch (e) { this._err('resume', e); } }

  setVolumes(v = {}) {
    for (const k of ['master', 'music', 'sfx', 'ui']) if (v[k] != null) this.vol[k] = clamp01(v[k]);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
    this.uiBus.gain.setTargetAtTime(this.vol.ui, t, 0.05);
  }

  // ------------------------------------------------------------------ sample cache
  _render(name, k) {
    const def = SFX[name];
    return def.r(rng(hash(name) + k * 7919));
  }
  buffers(name, need = 1) {
    let e = this.bufs.get(name);
    if (!e) this.bufs.set(name, (e = []));
    const def = SFX[name];
    while (e.length < Math.min(need, def.v)) {
      const data = this._render(name, e.length);
      const b = this.ctx.createBuffer(1, data.length, SR); b.copyToChannel(data, 0); e.push(b);
    }
    return e;
  }
  preload(names = Object.keys(SFX)) { if (this.ctx) for (const n of names) if (SFX[n]) this.buffers(n, SFX[n].v); }
  _prewarm() {
    if (!this.ctx || this.prewarming) return;
    this.prewarming = true;
    const slice = () => {
      const t0 = performance.now();
      try {
        while (performance.now() - t0 < 8) {
          const n = this.queue[0];
          if (n) {
            const have = this.bufs.get(n)?.length || 0;
            if (have >= SFX[n].v) { this.queue.shift(); continue; }
            this.buffers(n, have + 1);
          } else if (!this.mus.prewarmStep()) { this.prewarming = false; return; }
        }
      } catch (e) { this._err('prewarm', e); this.queue.shift(); }
      setTimeout(slice, 12);
    };
    setTimeout(slice, 30);
  }

  // ------------------------------------------------------------------ positional
  setListener(x, z) {
    if (!(isFinite(x) && isFinite(z))) return;
    this.lx = x; this.lz = z;
    if (!this.ctx) return;
    for (const L of this.loops) if (L.positional) this._updateLoop(L);
  }
  // exp: distance falloff exponent; lpFloor: lowpass at max distance (far layers stay brighter)
  _spatial(x, z, maxD, occ, exp = 1.7, lpFloor = 700) {
    const dx = x - this.lx, dz = z - this.lz, d = Math.hypot(dx, dz);
    if (!(d < maxD)) return null;
    const k = d / maxD, near = Math.min(1, d / 3);
    let g = Math.pow(1 - k, exp), lp = lpFloor + 21000 * Math.pow(1 - k, 2.6);
    const pan = (dx / (Math.abs(dx) + 6)) * 0.9 * near;
    if (occ) { g *= 0.5; lp = Math.min(lp, 550); }
    return { g, pan, lp, d };
  }

  // ------------------------------------------------------------------ one-shots
  // Sounds with a `far` layer (guns) crossfade into a dedicated distant recording-style sample as the
  // listener gets further away (like the close/mid/far mic layers of the real game), so distant
  // shots keep their character (boom + rolling tail) instead of turning to mush under the lowpass.
  play(name, o = {}) {
    if (!this.ctx) return NOOP;
    try {
      const def = SFX[name];
      if (!def) return this._unknown(name);
      const positional = o.x != null && o.z != null;
      const jit = () => (0.92 + Math.random() * 0.16);
      let g = (o.vol ?? 1) * def.vol * jit(), pan = o.pan ?? 0, lp = 22000, far = null;
      if (positional) {
        const nd = o.dist ?? def.dist;
        const s = this._spatial(o.x, o.z, nd, o.occluded);
        const fd = def.far && SFX[def.far];
        if (fd) {
          const d = Math.hypot(o.x - this.lx, o.z - this.lz), k = Math.min(1, Math.max(0, (d / nd - 0.18) / 0.32));
          const w = k * k * (3 - 2 * k);
          if (w > 0.02) {
            const fs = this._spatial(o.x, o.z, Math.max(fd.dist, nd * 1.3), o.occluded, 1.15, 1800);
            if (fs) far = this._voice(def.far, fd, (o.vol ?? 1) * fd.vol * jit() * fs.g * w, fs.pan, fs.lp, o.pitch, o.delay);
          }
          if (s) s.g *= 1 - w;
        }
        if (!s) return far ? this._handle(far) : NOOP;
        g *= s.g; pan = s.pan; lp = s.lp;
      } else if (o.occluded) lp = 550;
      if (g < 0.002) return far ? this._handle(far) : NOOP;
      if (def.pj > 0 && lp > 16000) lp = 8000 + Math.random() * 14000;    // timbre jitter
      const v = this._voice(name, def, g, pan, lp, o.pitch, o.delay);
      if (v && def.duck) this.duck(def.duck * Math.min(1, g * 1.4), 0.3 + def.duck);
      return v || far ? this._handle(v, far) : NOOP;
    } catch (e) { this._err(name, e); return NOOP; }
  }
  _handle(a, b = null) {
    return { stop: (fade = 0.04) => { this._stopVoice(a, fade); this._stopVoice(b, fade); }, get playing() { return !!((a && !a.stopping) || (b && !b.stopping)); } };
  }
  _voice(name, def, g, pan, lp, pitch = 1, delay = 0) {
    const ctx = this.ctx, now = ctx.currentTime;
    if (g < 0.002 || !this._limit(name, def, now)) return null;
    const list = this.buffers(name, 1);
    if (list.length < def.v && !this.queue.includes(name)) { this.queue.push(name); this._prewarm(); }
    const buf = list[(Math.random() * list.length) | 0];
    const rate = Math.max(0.05, (pitch ?? 1) * (1 + (Math.random() * 2 - 1) * def.pj));
    const src = ctx.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const gn = ctx.createGain(); gn.gain.value = g;
    let f = null, p = null, head = src;
    if (lp < 20000) { f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.Q.value = 0.4; src.connect(f); head = f; }
    head.connect(gn);
    const bus = def.bus === 'ui' ? this.uiBus : this.sfxBus;
    if (pan) { p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); gn.connect(p); p.connect(bus); } else gn.connect(bus);
    const start = now + Math.max(0, delay || 0);
    const v = { name, src, gn, f, p, t: start, prio: def.prio, stopping: false };
    src.onended = () => {
      const i = this.voices.indexOf(v); if (i >= 0) this.voices.splice(i, 1);
      gn.disconnect(); f?.disconnect(); p?.disconnect();
    };
    src.start(start);
    this.voices.push(v);
    return v;
  }
  // voice limiter: per-name cap (steal oldest of same name) + global cap by priority/age
  _limit(name, def, now) {
    let same = 0, oldestSame = null, live = 0, victim = null;
    for (const v of this.voices) {
      if (v.stopping) continue;
      live++;
      if (v.name === name) { same++; if (!oldestSame) oldestSame = v; }
      if (!victim || v.prio < victim.prio || (v.prio === victim.prio && v.t < victim.t)) victim = v;
    }
    if (same >= def.max && oldestSame) { this._stopVoice(oldestSame, 0.025); live--; }
    if (live >= MAX_VOICES) {
      if (victim.prio > def.prio) return false;
      this._stopVoice(victim, 0.02);
    }
    return true;
  }
  _stopVoice(v, fade = 0.04) {
    if (!v || v.stopping) return;
    v.stopping = true;
    try {
      const t = this.ctx.currentTime, gp = v.gn.gain;
      gp.cancelScheduledValues(t); gp.setValueAtTime(gp.value, t); gp.linearRampToValueAtTime(0, t + fade);
      v.src.stop(t + fade + 0.01);
    } catch { /* already stopped */ }
  }

  // ------------------------------------------------------------------ loops
  loop(name, o = {}) {
    if (!this.ctx) return NOOP;
    try {
      const def = SFX[name];
      if (!def) return this._unknown(name);
      if (this.loops.size >= MAX_LOOPS) { this._warn('loop limit reached (' + MAX_LOOPS + ')'); return NOOP; }
      const ctx = this.ctx, now = ctx.currentTime;
      const buf = this.buffers(name, 1)[0];
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.4; f.frequency.value = 22000;
      const gn = ctx.createGain(); gn.gain.value = 0;
      const p = ctx.createStereoPanner();
      src.connect(f).connect(gn).connect(p).connect(def.bus === 'ui' ? this.uiBus : this.sfxBus);
      const L = {
        name, def, src, f, gn, p, alive: true, x: o.x, z: o.z, positional: o.x != null && o.z != null,
        vol: o.vol ?? 1, pitch: o.pitch ?? 1, dist: o.dist ?? def.dist, occ: !!o.occluded, last: null, fade: o.fade ?? 0.08,
      };
      src.playbackRate.value = L.pitch;
      src.start(now, Math.random() * buf.duration);
      this.loops.add(L);
      this._updateLoop(L, true);
      const self = this;
      return {
        setPos(x, z) { if (!L.alive || !isFinite(x) || !isFinite(z)) return; L.x = x; L.z = z; L.positional = true; self._updateLoop(L); },
        setVol(v) { if (!L.alive) return; L.vol = Math.max(0, +v || 0); self._updateLoop(L); },
        setPitch(pt) { if (!L.alive) return; L.pitch = Math.max(0.05, +pt || 1); src.playbackRate.setTargetAtTime(L.pitch, ctx.currentTime, 0.05); },
        setOccluded(b) { if (!L.alive) return; L.occ = !!b; self._updateLoop(L); },
        stop(fade = 0.15) { self._stopLoop(L, fade); },
        get playing() { return L.alive; },
      };
    } catch (e) { this._err(name, e); return NOOP; }
  }
  _updateLoop(L, initial = false) {
    try {
      let g = L.vol * L.def.vol, pan = 0, lp = 22000;
      if (L.positional) {
        const s = this._spatial(L.x, L.z, L.dist, L.occ);
        if (!s) g = 0; else { g *= s.g; pan = s.pan; lp = s.lp; }
      } else if (L.occ) lp = 550;
      const l = L.last;
      if (l && Math.abs(l[0] - g) < 0.004 && Math.abs(l[1] - pan) < 0.01 && Math.abs(l[2] - lp) / lp < 0.04) return;
      L.last = [g, pan, lp];
      const t = this.ctx.currentTime, tc = initial ? L.fade / 3 : 0.05;
      L.gn.gain.setTargetAtTime(g, t, tc);
      L.f.frequency.setTargetAtTime(lp, t, initial ? 0.001 : tc);
      L.p.pan.setTargetAtTime(pan, t, initial ? 0.001 : tc);
    } catch (e) { this._err(L.name, e); }
  }
  _stopLoop(L, fade = 0.15) {
    if (!L.alive) return;
    L.alive = false; this.loops.delete(L);
    try {
      const t = this.ctx.currentTime;
      L.gn.gain.cancelScheduledValues(t); L.gn.gain.setValueAtTime(L.gn.gain.value, t); L.gn.gain.linearRampToValueAtTime(0, t + fade);
      L.src.stop(t + fade + 0.02);
      L.src.onended = () => { L.p.disconnect(); L.gn.disconnect(); L.f.disconnect(); };
    } catch (e) { this._err(L.name, e); }
  }

  // ------------------------------------------------------------------ weather / ambience
  weather(w = {}) {
    Object.assign(this.weatherState, w);
    if (!this.ctx) return;
    try {
      const ws = this.weatherState, rain = clamp01(ws.rain), wind = clamp01(ws.wind), storm = !!ws.storm;
      this._wset('rain_loop', storm ? rain * 0.5 : rain);
      this._wset('storm_loop', storm ? Math.max(0.55, rain) : 0);
      this._wset('wind_loop', wind);
      if (storm && !this.stormTimer) {
        const next = () => {
          this.stormTimer = setTimeout(() => {
            if (!this.weatherState.storm) { this.stormTimer = null; return; }
            this.thunder(); next();
          }, 6000 + Math.random() * 16000);
        };
        next();
      } else if (!storm && this.stormTimer) { clearTimeout(this.stormTimer); this.stormTimer = null; }
    } catch (e) { this._err('weather', e); }
  }
  _wset(name, level) {
    const h = this.wloops[name];
    if (level > 0.005) {
      if (!h) this.wloops[name] = this.loop(name, { vol: level, fade: 2.5 });
      else h.setVol(level);
    } else if (h) { h.stop(2); delete this.wloops[name]; }
  }
  thunder(o = {}) {
    return this.play('thunder', { vol: o.vol ?? 0.55 + Math.random() * 0.45, pan: o.pan ?? (Math.random() * 2 - 1) * 0.6, delay: o.delay });
  }

  // ------------------------------------------------------------------ music
  music(state, opts = {}) {
    if (!this.ctx) { this.pendingMusic = [state, opts]; return; }
    try { this.mus.setState(state, opts); } catch (e) { this._err('music:' + state, e); }
  }
  setIntensity(v) {
    this.intensity = clamp01(v);
    if (this.ctx) try { this.mus.setIntensity(this.intensity); } catch (e) { this._err('intensity', e); }
  }
  jingle(name) { if (this.ctx) try { this.mus.jingle(name); } catch (e) { this._err('jingle:' + name, e); } }
  duck(amount = 0.5, time = 1) { if (this.ctx) try { this.mus.duck(amount, time); } catch (e) { this._err('duck', e); } }
  muffle(on = true, freq) { if (this.ctx) try { this.mus.muffle(on, freq); } catch (e) { this._err('muffle', e); } }
  stopMusic(fade = 1.5) { if (this.ctx) this.mus.stop(fade); this.pendingMusic = null; }
  // cargo-elevator muzak, called every frame per elevator with its replicated state (see muzak.js)
  muzak(x, o) { if (this.ctx && x) try { (this.mz ||= new Muzak(this)).update(x, o); } catch (e) { this._err('muzak', e); } }

  stopAll() {
    if (!this.ctx) return;
    for (const v of this.voices.slice()) this._stopVoice(v, 0.05);
    for (const L of [...this.loops]) this._stopLoop(L, 0.1);
    this.wloops = {};
    this.mz?.stop(0.1);
    this.stopMusic(0.5);
  }

  // ------------------------------------------------------------------ debug / test helpers
  debugNames() {
    return {
      sfx: Object.keys(SFX),
      loops: Object.keys(SFX).filter((n) => SFX[n].loop),
      music: MUSIC_STATES.slice(), maps: MAPS.slice(),
      jingles: Object.keys(SONGS).filter((n) => n.startsWith('j_')).map((n) => n.slice(2)),
      songs: Object.keys(SONGS),
    };
  }
  stats() {
    return {
      ctx: this.ctx?.state || 'none', voices: this.voices.length, loops: this.loops.size,
      musicVoices: this.mus?.voices || 0, musicState: this.mus?.state || null, map: this.mus?.map || null,
      intensity: this.mus?.intensity ?? null, players: this.mus?.players.length || 0,
      cachedSfx: this.bufs.size, prewarmQueue: this.queue.length, errors: this.errors.length,
    };
  }
  // Pure-JS render of one SFX variant (no AudioContext needed).
  renderSfx(name, variant = 0) { return this._render(name, variant); }
  // Render through a real (offline) Web Audio graph and measure. what = { sfx } | { music, map, intensity }
  async renderOffline(what, sec = 2, sr = 44100) {
    const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    const ctx = new OAC(2, Math.round(sec * sr), sr);
    const lim = ctx.createDynamicsCompressor();
    Object.entries({ threshold: -3, knee: 1, ratio: 20, attack: 0.001, release: 0.12 }).forEach(([k, v]) => { lim[k].value = v; });
    const clip = ctx.createWaveShaper(); clip.curve = softClipCurve();
    const out = ctx.createGain(); out.gain.value = what.music ? this.vol.music : 1;
    if (what.raw) out.connect(ctx.destination); else out.connect(lim).connect(clip).connect(ctx.destination);
    if (what.sfx) {
      const data = this._render(what.sfx, what.variant || 0);
      const b = ctx.createBuffer(1, data.length, SR); b.copyToChannel(data, 0);
      const s = ctx.createBufferSource(); s.buffer = b; s.loop = !!SFX[what.sfx].loop;
      const g = ctx.createGain(); g.gain.value = SFX[what.sfx].vol;
      s.connect(g).connect(out); s.start(0.25);           // let the limiter settle first
    } else {
      const m = new MusicEngine(ctx, out, { offline: true });
      if (what.intensity != null) m.intensity = what.intensity;
      if (what.jingle) m.jingle(what.jingle); else m.setState(what.music, { map: what.map });
      if (what.intensity != null) m.setIntensity(what.intensity);
      m.renderAll(sec);
    }
    const res = await ctx.startRendering();
    const L = res.getChannelData(0), R = res.getChannelData(1);
    return { peak: Math.max(peak(L), peak(R)), rms: (rms(L) + rms(R)) / 2, seconds: sec };
  }

  _unknown(name) { this._warn('unknown sound: ' + name); return NOOP; }
  _warn(msg) { if (!this.warned.has(msg)) { this.warned.add(msg); console.warn('[audio] ' + msg); } }
  _err(where, e) {
    if (this.errors.length < 200) this.errors.push({ where, message: String(e && e.message || e) });
    console.warn('[audio] ' + where + ':', e);
  }
}

function softClipCurve() {
  const n = 4096, c = new Float32Array(n), k = 0.8, s = 0.19;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1, a = Math.abs(x);
    c[i] = a < k ? x : Math.sign(x) * (k + s * Math.tanh((a - k) / s));
  }
  return c;
}

export const audio = new AudioSystem();
export default audio;
