// Music engine: SNES-style shared echo (ping-pong delay with FIR-ish lowpass in the feedback loop
// and a slow detune wobble), gentle convolution reverb, look-ahead scheduler, crossfading state
// machine and intensity layers for raids.
import { SR, impulse, rng } from './dsp.js';
import { INST } from './instruments.js';
import { compileSong, songInstruments, SongPlayer } from './sequencer.js';
import { SONGS } from './songs.js';

const LOOKAHEAD = 0.1, TICK_MS = 25, MAX_VOICES = 96;
const RAID = { raid_calm: 0, raid_tense: 0.5, combat: 1 };
const MAP_KEY = { damn_grounds: 0, green_gate: 2, sandy_city: -5 };
export const MUSIC_STATES = ['menu', 'hub', 'lobby', 'raid_calm', 'raid_tense', 'combat', 'extract', 'extracted', 'death'];
export const MAPS = ['damn_grounds', 'green_gate', 'sandy_city'];
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export class MusicEngine {
  constructor(ctx, out, { offline = false } = {}) {
    this.ctx = ctx; this.offline = offline;
    this.insts = {}; this.songs = {}; this.players = []; this.cur = null;
    this.state = null; this.map = 'damn_grounds'; this.intensity = 0; this.voices = 0;
    const g = (v = 1) => { const n = ctx.createGain(); n.gain.value = v; return n; };

    // post chain: mix → duck → muffle lowpass → out
    // mix gain 1.7 = internal make-up so the music sits well against the compressed SFX bus
    this.mix = g(1.7); this.duckG = g(); this.lp = ctx.createBiquadFilter();
    this.lp.type = 'lowpass'; this.lp.frequency.value = 20000; this.lp.Q.value = 0.5;
    this.mix.connect(this.duckG).connect(this.lp).connect(out);
    this.dryIn = g(); this.dryIn.connect(this.mix);
    this.jingleIn = g(1.7); this.jingleIn.connect(this.lp);       // jingles bypass ducking

    // SNES echo: input → HP → [L delay ⇄ R delay] with lowpass + feedback, panned returns
    this.echoIn = g(); const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 160;
    this.echoIn.connect(hp);
    this.dl = ctx.createDelay(2); this.dr = ctx.createDelay(2);
    this.dl.delayTime.value = 0.36; this.dr.delayTime.value = 0.36;
    this.efl = ctx.createBiquadFilter(); this.efr = ctx.createBiquadFilter();
    for (const f of [this.efl, this.efr]) { f.type = 'lowpass'; f.frequency.value = 2600; f.Q.value = 0.3; }
    this.fbl = g(0.45); this.fbr = g(0.45);
    const pl = ctx.createStereoPanner(), pr = ctx.createStereoPanner(); pl.pan.value = -0.65; pr.pan.value = 0.65;
    this.echoRet = g(0.6);
    hp.connect(this.dl); hp.connect(g(0.3)).connect(this.dr);
    this.dl.connect(this.efl); this.efl.connect(pl).connect(this.echoRet); this.efl.connect(this.fbl).connect(this.dr);
    this.dr.connect(this.efr); this.efr.connect(pr).connect(this.echoRet); this.efr.connect(this.fbr).connect(this.dl);
    this.echoRet.connect(this.mix);
    if (!offline) {    // slight tape-ish detune wobble on the echo
      const lfo = ctx.createOscillator(), lg = g(0.0011); lfo.frequency.value = 0.37;
      lfo.connect(lg); lg.connect(this.dl.delayTime); lg.connect(this.dr.delayTime); lfo.start();
      this.lfo = lfo;
    }
    // reverb
    this.revIn = g(); this.conv = ctx.createConvolver(); this.revRet = g(0.55);
    const [L, Rr] = impulse(ctx.sampleRate, 2.6, 3.2, rng(77));
    const ir = ctx.createBuffer(2, L.length, ctx.sampleRate); ir.copyToChannel(L, 0); ir.copyToChannel(Rr, 1);
    this.conv.buffer = ir;
    this.revIn.connect(this.conv).connect(this.revRet).connect(this.mix);
  }

  // ---------------------------------------------------------------- resources
  instrument(name) {
    if (this.insts[name]) return this.insts[name];
    const d = INST[name];
    if (!d) throw new Error('unknown instrument ' + name);
    const s = d.r();
    const b = this.ctx.createBuffer(1, s.data.length, SR); b.copyToChannel(s.data, 0);
    return (this.insts[name] = { name, buffer: b, root: d.root, adsr: d.adsr, vol: d.vol, poly: d.poly, drum: !!d.drum, pre: d.pre || 0, loop: s.loop || null });
  }
  song(id) {
    if (this.songs[id]) return this.songs[id];
    const def = SONGS[id];
    if (!def) throw new Error('unknown song ' + id);
    const s = compileSong({ id, ...def });
    for (const i of songInstruments(s)) this.instrument(i);
    return (this.songs[id] = s);
  }
  prewarmStep() {          // render one missing instrument; returns false when done
    for (const k of Object.keys(INST)) if (!this.insts[k]) { this.instrument(k); return true; }
    return false;
  }

  // ---------------------------------------------------------------- voices
  note(ch, ev, t, tr, sd) {
    const ctx = this.ctx, inst = ch.inst, c = ch.c;
    const dur = Math.max(0.03, ev.dur * sd * (c.gate ?? 0.94));
    const [a0, d, s, r] = c.adsr || inst.adsr;
    // prune finished voices
    if (ch.voices.length) ch.voices = ch.voices.filter((v) => v.end > t);
    for (const n of ev.notes) {
      if (!this.offline && this.voices >= MAX_VOICES) return;
      const poly = c.poly || inst.poly;
      if (ch.voices.length >= poly) {
        const o = ch.voices.shift();
        try { o.g.gain.cancelScheduledValues(t); o.g.gain.setTargetAtTime(0, t, 0.012); o.src.stop(t + 0.08); } catch { /* already stopped */ }
      }
      const src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = inst.buffer;
      const midi = inst.drum ? n : n + tr + (c.tr || 0);
      const rate = Math.pow(2, (midi - inst.root) / 12 + (c.detune || 0) / 1200);
      src.playbackRate.value = rate;
      const v = ev.vel * inst.vol * (c.vol ?? 1) * (0.94 + Math.random() * 0.12);
      const tt = inst.drum ? t : t + Math.random() * 0.004;
      let end;
      if (inst.drum) {
        g.gain.value = v;
        const st = tt - inst.pre / rate, now = ctx.currentTime;
        const off = Math.max(0, (now - st) * rate);
        if (off >= inst.buffer.duration) continue;
        src.start(Math.max(st, now), off);
        end = tt + (inst.buffer.duration - inst.pre) / rate + 0.05;
      } else {
        const a = Math.min(a0, dur * 0.6);
        g.gain.setValueAtTime(0, tt);
        g.gain.linearRampToValueAtTime(v, tt + a);
        g.gain.setTargetAtTime(v * s, tt + a, Math.max(0.01, d / 3));
        g.gain.setTargetAtTime(0, tt + dur, Math.max(0.01, r / 4));
        end = tt + dur + r * 1.2 + 0.03;
        if (inst.loop) { src.loop = true; src.loopStart = inst.loop[0]; src.loopEnd = inst.loop[1]; }
        else end = Math.min(end, tt + inst.buffer.duration / rate + 0.02);
        src.start(tt); src.stop(end);
      }
      src.connect(g); g.connect(ch.node);
      this.voices++;
      src.onended = () => { this.voices--; g.disconnect(); };
      ch.voices.push({ src, g, end });
    }
  }

  // ---------------------------------------------------------------- transport
  startTimer() {
    if (this.offline || this.timer) return;
    const tick = () => this.tick();
    const fallback = () => { const id = setInterval(tick, TICK_MS); this.timer = { stop: () => clearInterval(id) }; };
    try {
      // a Worker-driven 25 ms clock keeps scheduling steady when the tab throttles main-thread timers
      const code = `let id=null;onmessage=e=>{if(e.data==='start'){if(!id)id=setInterval(()=>postMessage(0),${TICK_MS})}else{clearInterval(id);id=null}}`;
      const w = new Worker(URL.createObjectURL(new Blob([code], { type: 'text/javascript' })));
      w.onmessage = tick; w.postMessage('start');
      w.onerror = () => { w.terminate(); if (this.timer?.worker === w) fallback(); };   // e.g. CSP blocks blob: workers
      this.timer = { worker: w, stop: () => { w.postMessage('stop'); w.terminate(); } };
    } catch {
      fallback();
    }
  }
  stopTimer() { if (this.timer) { this.timer.stop(); this.timer = null; } }
  tick() {
    const now = this.ctx.currentTime;
    const gap = this.lastTick ? (performance.now() - this.lastTick) / 1000 : 0;
    this.lastTick = performance.now();
    const ahead = Math.min(1.2, Math.max(LOOKAHEAD, gap * 1.6));   // stretch look-ahead if throttled
    for (const p of this.players) p.schedule(now + ahead);
    for (const p of this.players.slice()) if (p.finished(now)) { p.dispose(); this.players.splice(this.players.indexOf(p), 1); if (this.cur === p) this.cur = null; }
    if (!this.players.length) this.stopTimer();
  }
  echoFor(song, at) {
    const e = song.echo || {}, bt = 60 / song.bpm, time = Math.min(1.9, (e.beats ?? 0.75) * bt);
    for (const d of [this.dl, this.dr]) d.delayTime.setTargetAtTime(time, at, 0.4);
    for (const f of [this.fbl, this.fbr]) f.gain.setTargetAtTime(e.fb ?? 0.45, at, 0.3);
    for (const f of [this.efl, this.efr]) f.frequency.setTargetAtTime(e.lp ?? 2600, at, 0.3);
    this.echoRet.gain.setTargetAtTime(e.mix ?? 0.6, at, 0.3);
    this.revRet.gain.setTargetAtTime(song.rev ?? 0.55, at, 0.3);
  }
  start(id, { fadeIn = 1.5, fadeOut = 1.5, transpose = 0, layers, jingle = false, keep = false } = {}) {
    const song = this.song(id), t0 = this.ctx.currentTime + 0.06;
    if (!keep) for (const p of this.players) if (!p.jingle) p.stop(fadeOut);
    const p = new SongPlayer(this, song, { t0, fadeIn, transpose, layerGains: layers, jingle });
    p.jingle = jingle;
    this.players.push(p);
    if (!jingle) { this.cur = p; this.echoFor(song, t0); }
    p.schedule(t0 + LOOKAHEAD);
    this.startTimer();
    return p;
  }

  // ---------------------------------------------------------------- public
  setState(state, { map } = {}) {
    if (map && !MAPS.includes(map)) map = 'damn_grounds';
    const m = map || this.map;
    if (!state || state === 'off' || state === 'none') { this.stop(); return; }
    if (state === this.state && m === this.map && (this.cur || state === 'extracted' || state === 'death')) return;
    const prev = this.state; this.state = state; this.map = m;
    if (state in RAID) {
      const id = 'raid_' + m;
      this.intensity = RAID[state];
      if (this.cur && this.cur.id === id && !this.cur.stopAt) { this.applyIntensity(); return; }
      this.start(id, { fadeIn: prev === 'extract' ? 2 : 3.5, fadeOut: 2.5, layers: this.layerTargets() });
      return;
    }
    switch (state) {
      case 'menu': this.start('menu', { fadeIn: 2, fadeOut: 1.5 }); break;
      case 'hub': this.start('hub', { fadeIn: 2, fadeOut: 1.5 }); break;
      case 'lobby': this.start('lobby', { fadeIn: 1.2, fadeOut: 1.2, transpose: MAP_KEY[m] ?? 0 }); break;
      case 'extract': this.start('extract', { fadeIn: 1.0, fadeOut: 1.8, transpose: MAP_KEY[m] ?? 0 }); break;
      case 'extracted': this.start('j_extracted', { fadeIn: 0.02, fadeOut: 0.5 }); break;
      case 'death': this.start('j_death', { fadeIn: 0.02, fadeOut: 0.35 }); break;
      default: this.state = prev; throw new Error('unknown music state ' + state);
    }
  }
  layerTargets() {
    const x = this.intensity;
    return {
      base: 1 - 0.35 * smooth(0.7, 1, x),
      tense: smooth(0.12, 0.5, x) * (1 - 0.45 * smooth(0.7, 1, x)),
      combat: smooth(0.55, 0.9, x),
    };
  }
  applyIntensity() {
    const p = this.cur; if (!p || !p.id.startsWith('raid_')) return;
    this.appliedTo = p;
    const tg = this.layerTargets();
    for (const [k, v] of Object.entries(tg)) { const L = p.layer(k); if (L) p.setLayer(k, v, v > L.target ? 1.0 : 2.4); }
  }
  setIntensity(v) {
    v = Math.min(1, Math.max(0, +v || 0));
    if (Math.abs(v - this.intensity) < 0.015 && this.appliedTo === this.cur) return;   // cheap when called every frame
    this.intensity = v; this.applyIntensity();
  }
  jingle(name) {
    const id = 'j_' + name;
    if (!SONGS[id]) throw new Error('unknown jingle ' + name);
    const p = this.start(id, { fadeIn: 0.02, jingle: true, keep: true });
    this.duck(0.65, (p.song.length * p.stepDur) + 0.5);
    return p;
  }
  duck(amount = 0.5, time = 1) {
    const t = this.ctx.currentTime, g = this.duckG.gain, a = Math.min(0.95, Math.max(0, amount));
    const until = t + time;
    if (this.duckUntil && this.duckUntil > until && this.duckAmt >= a) return;   // stronger duck already active
    this.duckUntil = until; this.duckAmt = a;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
    g.setTargetAtTime(1 - a, t, 0.03);
    g.setTargetAtTime(1, until, 0.45);
    setTimeout(() => { if (this.duckUntil === until) { this.duckUntil = 0; this.duckAmt = 0; } }, time * 1000 + 50);
  }
  muffle(on, freq = 700) {
    const t = this.ctx.currentTime;
    this.lp.frequency.setTargetAtTime(on ? freq : 20000, t, on ? 0.15 : 0.5);
  }
  stop(fade = 1.5) { for (const p of this.players) p.stop(fade); this.state = null; this.cur = null; }
  // Offline helper: schedule everything up to `sec` immediately (OfflineAudioContext rendering).
  renderAll(sec) { for (const p of this.players) p.schedule(sec); }
}
