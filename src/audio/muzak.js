// Elevator muzak. A called cargo elevator plays "Please Hold" from a little PA speaker over its doors while
// the cage is on its way: a cheesy, slightly worn bossa nova in F (vibraphone lead, detuned electric piano
// comping, upright bass, brushes + rim clave, a string pad in the bridge). 16 bars, timed so the turnaround
// resolves into a final chord and a polite "ding" right as the doors open (100 bpm for the 40 s call; other
// call lengths stretch the tempo). It murmurs on faintly inside the cabin through the departure countdown.
// The klaxon / call sounds keep doing the shouting (they draw ARK); this sits under them.
//
//   audio.muzak(x, { st, tl, y, me, done })    // every frame, per cargo elevator (View.updExtracts)
//     x    the extract (x.x, x.z, x.face, x.callDur); also the identity key
//     st   its replicated state ('idle' | 'called' | 'open' | 'closing' | 'gone' | 'offline'), tl = seconds
//          left on it (the rig's smoothed timer), y = cabin floor height, me = local player { x, y, z }
//          (level check), done = the local raid is over (dead / extracted)
//
// Driven from the replicated extraction state, so host and clients hear it alike. One elevator holds the
// speaker at a time (the first in earshot). The tune is anchored to the moment of the call: walking away and
// back, or two raiders standing together, hear the same bar. Positional (audible to ~30 m, loudest at the
// doors, muffled from another level), routed through the SFX bus and scaled by the music volume, ducked
// under combat; the score dips a little while you stand next to it. A watchdog fades it out once the per-frame
// updates stop (raid over, left the raid, tab hidden). Original composition and synthesis.
import { SR, buf, noise, osc, fm, ad, env, filt, mix, norm, hp1, mtof, rng, am } from './dsp.js';
import { MusicEngine } from './music.js';
import { compileSong, SongPlayer } from './sequencer.js';

const LEAD = 1.0;            // the band starts 1 s after the call (after the console's confirmation tone)
const FORM_BARS = 16;
const DING_STEPS = 4;        // the finale's chime lands 4 sixteenths after its chord
const DOOR_Z = 2.6;          // door speaker, local frame (doorway at z = 2.375)
const RANGE = 34, CLOSE_RANGE = 11, CLOSE_VOL = 0.42;
const BASE = 0.7;            // level at the doors: ~6 dB under the klaxon there (measured on the SFX bus in tools/audio-test.html)
const DEF_MUSIC = 0.6;       // profile default music volume: 1x
const WATCHDOG = 1500;       // ms without an update (raid over, left, tab hidden, long hitch) -> fade out
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// ------------------------------------------------------------------ instruments (muzak-only; the rest are shared)
const R0 = rng(1958);
const finish = (x, p = 0.9) => { hp1(x, 20); norm(x, p); return x; };
export const MZ_INST = {
  // vibraphone: sine bar + its tuned 4th partial + mallet tick, motor tremolo (sampled at A5, the middle of
  // the tune, so the baked tremolo stays ~4-7 Hz over the melody's range)
  mz_vibes: { root: 81, adsr: [0.002, 2.6, 0.55, 0.7], vol: 0.36, poly: 6, r() {
    const f = mtof(81), d = 3.2, x = buf(d);
    const a = osc(d, { f }); ad(a, 0.002, 3.0); mix(x, a, 1);
    const p4 = osc(d, { f: f * 4.0 }); ad(p4, 0.001, 0.8); mix(x, p4, 0.24);
    const tk = osc(0.2, { f: f * 9.92 }); ad(tk, 0.0005, 0.08); mix(x, tk, 0.07);
    am(x, 5.2, 0.3);
    return { data: finish(x) };
  } },
  // upright bass: rounded pluck, the pitch settles after the attack, finger thump; 2nd harmonic survives a small speaker
  mz_upright: { root: 36, adsr: [0.004, 1.0, 0.5, 0.1], vol: 0.6, poly: 2, r() {
    const f = mtof(36), d = 2.0, x = buf(d);
    mix(x, osc(d, { f: f * 1.015, f1: f, sweep: 0.05 }), 1);
    const t = osc(d, { wave: 'tri', f }); filt(t, 'lp', 900, 280, 0.9, 0.5); mix(x, t, 0.55);
    const h2 = osc(d, { f: f * 2 }); ad(h2, 0.002, 0.6); mix(x, h2, 0.4);
    ad(x, 0.005, 1.9);
    const th = noise(0.05, 'white', R0); filt(th, 'lp', 1100); ad(th, 0.0005, 0.04); mix(x, th, 0.25);
    return { data: finish(x) };
  } },
  // brush swish ("tssh"): bandpassed noise with a soft attack
  mz_swish: { drum: 1, root: 60, adsr: [0.001, 0.5, 0, 0.05], vol: 0.2, poly: 3, r() {
    const d = 0.42, x = noise(d, 'white', R0);
    filt(x, 'bp', 3800, 6200, 0.7); filt(x, 'hp', 1800);
    env(x, [[0, 0], [0.035, 1], [0.12, 0.55], [d, 0]]);
    return { data: finish(x) };
  } },
  // the elevator chime: round FM bell
  mz_chime: { root: 84, adsr: [0.001, 3, 0.7, 1.6], vol: 0.3, poly: 2, r() {
    const f = mtof(84), d = 3.0;
    const x = fm(d, { f, ratio: 1, index: 0.5, index1: 0.03, isweep: 0.5 });
    mix(x, fm(d, { f: f * 3.01, ratio: 1, index: 0.3, index1: 0, isweep: 0.3 }), 0.12);
    ad(x, 0.001, 2.8);
    return { data: finish(x) };
  } },
};
const SHARED = ['ep', 'strings', 'kick', 'rim', 'shaker'];

// ------------------------------------------------------------------ "Please Hold" (16 bars, F major)
const rep = (s, n) => Array(n).fill(s).join(' ');
const bars = (n) => `.:${n * 16}`;
// A: Fmaj7 | Gm7 C7 | Fmaj7 | Bbmaj7 Bbm6 | Am7 D7b9 | Gm7 C7 | Fmaj7 Dm7 | Gm7 C7
// B: Dm7 | G7 | Gm7 | C7 | Am7 D7b9 | Gm7 C7 | F6 Dm7 | Gm7 Gb7  (-> the finale's Fmaj9 + ding)
const CH_A = 'Fmaj7 Gm7:8 C7:8 Fmaj7 Bbmaj7:8 Bbm6:8 Am7:8 D7b9:8 Gm7:8 C7:8 Fmaj7:8 Dm7:8 Gm7:8 C7:8';
const CH_B = 'Dm7 G7 Gm7 C7 Am7:8 D7b9:8 Gm7:8 C7:8 F6:8 Dm7:8 Gm7:8 Gb7:8';
// bossa comping: one-chord bars hit 0 3 6 10 13; two-chord bars split the same figure
const comp = (s) => { let at = 0; return s.split(/\s+/).map((t) => { const [b, d = '16'] = t.split(':'); const r = +d === 16 ? 0 : at % 16 ? 2 : 1; at += +d; return `${b}^${r}:${d}`; }).join(' '); };
const VIBES = [
  '.:2 A5:2 C6:2 E6:6 D6:2 C6:2 | Bb5:6 A5:2 G5:4 E5:4 | .:2 F5:2 A5:2 C6:6 Bb5:2 A5:2 | D6:8 Db6:8',
  'C6:4 E6:4 Eb6:8 | D6:6 Bb5:2 G5:4 E5:4 | F5:10 .:2 A5:2 C6:2 | D6:4 C6:2 Bb5:2 A5:2 G5:6',
  '.:2 F6:2 E6:2 D6:6 A5:4 | B5:4 D6:4 F6:8 | .:2 Bb5:2 A5:2 G5:6 D5:4 | E5:4 G5:4 Bb5:8',
  'C6:6 A5:2 F#5:4 Eb6:4 | D6:6 C6:2 Bb5:4 G5:4 | A5:6 G5:2 F5:8 | .:8 Bb5:2 A5:2 Ab5:2 G5:2',
];
const BASS = [
  'F2:6 C3:2? C3:8 | G2:6 D3:2? C3:6 G2:2? | F2:6 C3:2? C3:8 | Bb2:6 F2:2? Bb2:6 F2:2?',
  'A2:6 E2:2? D2:6 A2:2? | G2:6 D3:2? C3:6 G2:2? | F2:6 C3:2? D3:6 A2:2? | G2:6 D3:2? C3:6 G2:2?',
  'D3:4 C3:4 A2:4 F#2:4 | G2:4 A2:4 B2:4 Ab2:4 | G2:4 Bb2:4 D3:4 B2:4 | C3:4 E3:4 G2:4 Bb2:4',      // walking bridge
  'A2:4 E2:4 D2:4 F#2:4 | G2:4 D3:4 C3:4 E2:4 | F2:4 A2:4 D3:4 A2:4 | G2:4 D2:4 Gb2:8',
];
const CLAVE = 'o..o..o...o..o..';
const SPEAKER_ECHO = { beats: 0.75, fb: 0.26, lp: 2400, mix: 0.3 };
const LOOP_DEF = {
  echo: SPEAKER_ECHO, rev: 0.32,
  layers: { base: [
    { inst: 'mz_vibes', notes: VIBES, vol: 0.85, detune: -4, echo: 0.35, rev: 0.35, pan: -0.12 },
    { inst: 'ep', chords: comp(CH_A + ' ' + CH_B), mode: 'stab', rhythms: ['x-.x-.x-..x-.x-.', 'x-.x-.x-', '..x-.x-.'],
      oct: 4, detune: 12, vol: 0.5, gate: 0.9, adsr: [0.002, 1.6, 0, 0.5], echo: 0.15, rev: 0.25, pan: 0.18 },
    { inst: 'mz_upright', notes: BASS, vol: 0.85, echo: 0, rev: 0.08 },
    { inst: 'strings', chords: [bars(8), CH_B], oct: 5, detune: 9, vol: 0.26, adsr: [0.7, 1, 0.8, 0.9], echo: 0.1, rev: 0.5, pan: 0.25 },
    { inst: 'mz_swish', notes: rep('C4:4? C4:4', 2), vol: 0.9, echo: 0.04, rev: 0.12, pan: 0.1 },
    { drums: { k: 'o.....g.o.....g.', rim: [rep(CLAVE, 15), 'o..o..o...o.oox.'], sh: rep('gogo', 4) }, vol: 0.8, echo: 0.04, rev: 0.12 },
  ] },
};
// the doors open: the band lands on Fmaj9, the chime says "ding"
const FINALE_DEF = {
  loop: false, steps: 24, tail: 3.5, echo: SPEAKER_ECHO, rev: 0.4,
  layers: { base: [
    { inst: 'ep', chords: 'Fmaj9:24', oct: 4, detune: 12, vol: 0.55, adsr: [0.002, 2.2, 0, 1.4], echo: 0.25, rev: 0.35 },
    { inst: 'mz_vibes', notes: 'A5,C6,E6:20 .:4', vol: 0.7, adsr: [0.002, 2.6, 0.55, 1.4], echo: 0.35, rev: 0.4 },
    { inst: 'mz_upright', notes: 'F2:12 .:12', vol: 0.85, echo: 0, rev: 0.08 },
    { inst: 'mz_swish', notes: 'C4:24!', vol: 0.8, rev: 0.15 },
    { inst: 'mz_chime', notes: `.:${DING_STEPS} A6:20!`, vol: 0.9, echo: 0.45, rev: 0.5 },
  ] },
};
// call length -> tempo that lands bar 17 (+ the chime) on the doors opening; 100 bpm for the 40 s call
export function muzakBpm(callDur) {
  const b = callDur > LEAD + 4 ? (FORM_BARS * 16 + DING_STEPS) * 15 / (callDur - LEAD) : 100;
  return b >= 84 && b <= 140 ? b : 100;
}
const SONG_CACHE = new Map();
function song(kind, bpm) {
  const id = kind + '@' + bpm.toFixed(3);
  let s = SONG_CACHE.get(id);
  if (!s) { s = compileSong({ id, bpm, ...(kind === 'loop' ? LOOP_DEF : FINALE_DEF) }); SONG_CACHE.set(id, s); }
  return s;
}
export const muzakSongs = (bpm = 100) => ({ loop: song('loop', bpm), finale: song('finale', bpm) });

// ------------------------------------------------------------------ controller (one per AudioSystem)
export class Muzak {
  constructor(sys) {
    this.a = sys; this.inst = {};
    this.prev = new WeakMap(); this.fin = new WeakMap();
    this.owner = null; this.mode = null; this.eng = null; this.ch = null; this.player = null;
    this.seen = 0; this.duckT = 0; this.last = null; this.info = null;
  }
  // render the muzak instruments one per call (no frame hitch); true when all are ready
  ready() {
    for (const [k, d] of Object.entries(MZ_INST)) {
      if (this.inst[k]) continue;
      const s = d.r(), ctx = this.a.ctx, b = ctx.createBuffer(1, s.data.length, SR); b.copyToChannel(s.data, 0);
      this.inst[k] = { name: k, buffer: b, root: d.root, adsr: d.adsr, vol: d.vol, poly: d.poly, drum: !!d.drum, pre: 0, loop: s.loop || null };
      return false;
    }
    for (const k of SHARED) if (!this.inst[k]) this.inst[k] = this.a.mus.instrument(k);
    return true;
  }
  // the PA speaker: song engine -> tape wow -> small-speaker band -> distance lowpass -> gain -> pan -> SFX bus
  open() {
    const ctx = this.a.ctx, g = (v) => { const n = ctx.createGain(); n.gain.value = v; return n; };
    const bq = (type, f, q, gain = 0) => { const n = ctx.createBiquadFilter(); n.type = type; n.frequency.value = f; n.Q.value = q; n.gain.value = gain; return n; };
    const ch = { inp: g(1), wow: ctx.createDelay(0.05), lfo: ctx.createOscillator(), lg: g(0.0011),
      hp: bq('highpass', 115, 0.7), pk: bq('peaking', 1700, 0.9, 3), lp: bq('lowpass', 5800, 0.6), dist: bq('lowpass', 20000, 0.4),
      vol: g(0), pan: ctx.createStereoPanner() };
    ch.wow.delayTime.value = 0.012; ch.lfo.frequency.value = 0.55;     // +-7 cents of wow: the tape has seen things
    ch.lfo.connect(ch.lg).connect(ch.wow.delayTime); ch.lfo.start();
    ch.inp.connect(ch.wow).connect(ch.hp).connect(ch.pk).connect(ch.lp).connect(ch.dist).connect(ch.vol).connect(ch.pan).connect(this.a.sfxBus);
    const eng = new MusicEngine(ctx, ch.inp);
    Object.assign(eng.insts, this.inst);
    this.eng = eng; this.ch = ch; this.last = null;
    clearInterval(this.dog);
    this.dog = setInterval(() => { if (this.eng && performance.now() - this.seen > WATCHDOG) this.release(0.6); }, 250);
  }
  play(kind, bpm, t0) {
    const eng = this.eng, s = song(kind, bpm);
    eng.songs[s.id] = s;
    const now = this.a.ctx.currentTime, p = new SongPlayer(eng, s, { t0: Math.max(t0, now), fadeIn: 0.01 });
    p.t0 = t0;                    // anchored in the past: schedule() skips the bars already gone by
    eng.players.push(p); eng.cur = p;
    eng.echoFor(s, this.a.ctx.currentTime);
    p.schedule(this.a.ctx.currentTime + 0.1); eng.startTimer();
    return p;
  }
  start(x, mode, tl) {
    const ctx = this.a.ctx, now = ctx.currentTime;
    this.open();
    this.owner = x; this.mode = mode;
    if (mode === 'call') {         // anchored to the call: bar 1 starts LEAD s after it
      const dur = +x.callDur || 0;
      this.bpm = muzakBpm(dur);
      const t0 = dur > 0 ? now - (dur - tl) + LEAD : now + 0.05;
      this.player = this.play('loop', this.bpm, t0);
    } else { this.bpm = 100; this.player = this.play('loop', 100, now + 0.05); }
  }
  // wrap up so the chime lands when the doors open (`left` s from now)
  finale(left) {
    const ctx = this.a.ctx, at = ctx.currentTime + Math.max(0.03, left - DING_STEPS * 15 / this.bpm), p = this.player;
    if (p) { p.stopAt = at; for (const o of p.out) { o.gain.cancelScheduledValues(at); o.gain.setTargetAtTime(0, at, 0.06); } }
    this.player = this.play('finale', this.bpm, at);
    this.mode = 'end'; this.fin.set(this.owner, true);
    clearTimeout(this.endT);
    this.endT = setTimeout(() => { if (this.mode === 'end') this.release(0.4); }, (at - ctx.currentTime + 24 * 15 / this.bpm + 2.5) * 1000);
  }
  release(fade = 0.6) {
    const eng = this.eng, ch = this.ch;
    this.eng = null; this.ch = null; this.player = null; this.mode = null; this.owner = null; this.info = null;
    clearTimeout(this.endT); clearInterval(this.dog);
    if (!eng) return;
    const t = this.a.ctx.currentTime, gp = ch.vol.gain;
    for (const p of eng.players) p.stop(fade);
    gp.cancelScheduledValues(t); gp.setValueAtTime(gp.value, t); gp.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => {
      try {
        eng.stopTimer(); for (const p of eng.players) p.dispose(); eng.players.length = 0;
        eng.lfo?.stop(); ch.lfo.stop(); eng.lp.disconnect(); ch.inp.disconnect(); ch.pan.disconnect();
      } catch (e) { /* already gone */ }
    }, fade * 1000 + 400);
  }
  stop(fade = 0.1) { this.release(fade); }
  // where the speaker is and how it sounds from the listener: { g, pan, lp, d }
  hear(x, mode, o) {
    const f = x.face || 0, lz = mode === 'close' ? 0 : DOOR_Z, maxD = mode === 'close' ? CLOSE_RANGE : RANGE;
    const dx = x.x + lz * Math.sin(f) - this.a.lx, dz = x.z + lz * Math.cos(f) - this.a.lz, d = Math.hypot(dx, dz);
    const k = Math.min(1, d / maxD);
    let g = (1 - k) * (1 - k), lp = 900 + 17000 * Math.pow(1 - k, 2.6);
    const pan = (dx / (Math.abs(dx) + 6)) * 0.9 * Math.min(1, d / 3);
    if (o.me && o.y != null && Math.abs((o.me.y ?? o.y) - o.y) > 4) { g *= 0.4; lp = Math.min(lp, 600); }   // another level
    return { g, pan, lp, d, maxD };
  }
  update(x, o = {}) {
    if (!this.a.ctx || !this.a.mus || !x) return;
    if (!this.warm) {             // a cargo elevator exists: render the instruments in idle time, not on the call frame
      this.warm = true;
      const step = () => { try { if (!this.ready()) setTimeout(step, 80); } catch (e) { this.a._err?.('muzak', e); } };
      setTimeout(step, 1200);
    }
    const st = o.st, tl = +o.tl || 0, prev = this.prev.get(x);
    this.prev.set(x, st);
    if ((st !== 'called' && st !== 'open') || (st === 'called' && prev !== 'called')) this.fin.delete(x);   // a fresh call
    if (this.owner && this.owner !== x) {
      if (performance.now() - this.seen < WATCHDOG) return;     // another elevator has the speaker
      this.release(0.6);
    }
    const want = o.done ? null : st === 'called' && !this.fin.get(x) ? 'call' : st === 'closing' ? 'close' : null;
    if (this.owner === x) {
      this.seen = performance.now();
      if (this.mode === 'call') {
        if (st === 'called' && tl < DING_STEPS * 15 / this.bpm + 0.3) { this.finale(tl); }
        else if (st === 'open' && prev === 'called') this.finale(0);
        else if (want !== 'call') { this.release(0.8); return; }
      } else if (this.mode === 'close' && want !== 'close') { this.release(st === 'gone' ? 2.5 : 0.8); return; }
      else if (this.mode === 'end' && (o.done || want === 'close')) { this.release(want ? 0.3 : 1.0); return; }   // a quick lever pull: hand over to the cabin
    } else if (want) {
      const h = this.hear(x, want, o);
      if (h.d > h.maxD || (want === 'call' && tl < DING_STEPS * 15 / muzakBpm(+x.callDur || 0) + 0.8)) return;
      if (!this.ready()) return;                                   // instruments render over the next frames
      this.start(x, want, tl);
      this.seen = performance.now();
    } else return;
    this.mix(x, o);
  }
  // per frame: distance / pan / muffle, mode level, combat duck, settings; dips the score while you are close
  mix(x, o) {
    const ch = this.ch; if (!ch) return;
    const h = this.hear(x, this.mode === 'close' ? 'close' : 'call', o);
    if (h.d > h.maxD + 6 && this.mode !== 'end') { this.release(0.5); return; }   // out of earshot: free the voices
    const combat = this.a.mus?.state === 'combat';
    const lvl = h.g * (this.mode === 'close' ? CLOSE_VOL : 1) * (combat ? 0.35 : 1);
    const g = BASE * lvl * clamp((this.a.vol?.music ?? DEF_MUSIC) / DEF_MUSIC, 0, 1.6);
    this.info = { mode: this.mode, d: h.d, g, pan: h.pan, lp: h.lp, combat, bpm: this.bpm };
    const l = this.last, t = this.a.ctx.currentTime;
    if (!l || Math.abs(l[0] - g) > 0.003 || Math.abs(l[1] - h.pan) > 0.01 || Math.abs(l[2] - h.lp) / h.lp > 0.04) {
      const tc = l ? 0.1 : 0.35;                                    // first time in: a soft fade-in
      ch.vol.gain.setTargetAtTime(g, t, tc); ch.pan.pan.setTargetAtTime(h.pan, t, l ? 0.1 : 0.001); ch.dist.frequency.setTargetAtTime(h.lp, t, l ? 0.1 : 0.001);
      this.last = [g, h.pan, h.lp];
    }
    const now = performance.now();
    if (!combat && lvl > 0.08 && now - this.duckT > 250) { this.duckT = now; this.a.duck?.(Math.min(0.5, lvl * 0.55), 0.5); }
  }
  debug() { return { ...(this.info || {}), mode: this.mode, owner: this.owner ? this.owner.name || this.owner.id || true : null, players: this.eng?.players.length || 0, voices: this.eng?.voices || 0, step: this.player?.step ?? null, song: this.player?.id || null }; }
}

// Offline render through a real Web Audio graph (level checks; no speaker chain): { peak, rms }
export async function renderMuzakOffline(sec = 8, { kind = 'loop', bpm = 100, sr = 44100 } = {}) {
  const OAC = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  const ctx = new OAC(2, Math.round(sec * sr), sr), out = ctx.createGain();
  out.connect(ctx.destination);
  const eng = new MusicEngine(ctx, out, { offline: true });
  const INST = (await import('./instruments.js')).INST;
  for (const [k, d] of [...Object.entries(MZ_INST), ...SHARED.map((k) => [k, INST[k]])]) {
    const s = d.r(), b = ctx.createBuffer(1, s.data.length, SR); b.copyToChannel(s.data, 0);
    eng.insts[k] = { name: k, buffer: b, root: d.root, adsr: d.adsr, vol: d.vol, poly: d.poly, drum: !!d.drum, pre: d.pre || 0, loop: s.loop || null };
  }
  const s = song(kind, bpm); eng.songs[s.id] = s;
  const p = new SongPlayer(eng, s, { t0: 0.05, fadeIn: 0.01 }); eng.players.push(p); eng.echoFor(s, 0);
  p.schedule(sec);
  const res = await ctx.startRendering();
  const L = res.getChannelData(0), Rr = res.getChannelData(1);
  let pk = 0, ss = 0;
  for (let i = 0; i < L.length; i++) { pk = Math.max(pk, Math.abs(L[i]), Math.abs(Rr[i])); ss += L[i] * L[i] + Rr[i] * Rr[i]; }
  return { peak: pk, rms: Math.sqrt(ss / (2 * L.length)), seconds: sec };
}
