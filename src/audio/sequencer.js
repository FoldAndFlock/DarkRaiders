// Tiny tracker: compiles text patterns into per-channel step events and plays them with a
// look-ahead scheduler. 16 steps per bar (16th notes). Each channel loops on its own length
// (polymetric loops give long-evolving ambient beds from short patterns).
//
// Channel kinds (inside song.layers[layerName] arrays):
//   { inst, notes: 'D5:6 E5:2 F5:4 .:4 A4,D5:8!' }        explicit notes  (':' dur in steps, ',' chord,
//                                                            '.' rest, '!' accent, '?' soft, '|' ignored)
//   { inst, chords: 'Dm:16 Bbmaj7 F/A', mode: 'pad'|'arp'|'bass'|'stab', ... }
//        pad : voiced chord held for the token duration           (oct = voicing octave)
//        arp : chord tones cycled every `rate` steps (pattern up|down|updown|rand, span octaves)
//        bass: `rhythm` string over the chord: x root, X accent, o octave, 5 fifth, 3 third, 7 seventh,
//              b octave below, - hold, . rest. `rhythms` array + token suffix ^n selects a rhythm.
//        stab: rhythm string, x/X plays the voiced chord
//   { drums: { k: 'x...x...', s: '....x...' } }               drum lanes (x .8, X 1, o .45, g .25)
// Common channel opts: vol, pan, echo (send), rev (send), oct, tr (semitones), adsr, gate, poly, detune.
import { DRUMS } from './instruments.js';

const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const acc = (s) => (s === '#' ? 1 : s === 'b' ? -1 : 0);
export function noteNum(s) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(s);
  if (!m) throw new Error('bad note ' + s);
  return 12 * (+m[3] + 1) + PC[m[1]] + acc(m[2]);
}
const QUAL = {
  '': [0, 4, 7], m: [0, 3, 7], 5: [0, 7], maj7: [0, 4, 7, 11], m7: [0, 3, 7, 10], 7: [0, 4, 7, 10],
  sus2: [0, 2, 7], sus4: [0, 5, 7], add9: [0, 4, 7, 14], madd9: [0, 3, 7, 14], m9: [0, 3, 7, 10, 14],
  maj9: [0, 4, 7, 11, 14], dim: [0, 3, 6], aug: [0, 4, 8], 6: [0, 4, 7, 9], m6: [0, 3, 7, 9],
  '7sus4': [0, 5, 7, 10], m11: [0, 3, 7, 10, 17], 'maj7#11': [0, 4, 7, 11, 18], m7b5: [0, 3, 6, 10],
  9: [0, 4, 7, 10, 14], '7b9': [0, 4, 7, 10, 13], mmaj7: [0, 3, 7, 11], add11: [0, 4, 7, 17], '6/9': [0, 4, 9, 14],
};
export function parseChord(s) {
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(s);
  if (!m || !QUAL[m[2]]) throw new Error('bad chord ' + s);
  const pc = (n) => (PC[n[0]] + acc(n[1] || '') + 12) % 12;
  return { root: pc(m[1]), ints: QUAL[m[2]], bass: m[3] ? pc(m[3]) : pc(m[1]) };
}
// close voicing in [lo, lo+12) with extensions (>= 12) placed an octave higher
function voice(c, oct = 4) {
  const lo = 12 * (oct + 1) - 5, out = [];
  for (const iv of c.ints) {
    const pc = (c.root + iv) % 12;
    let n = ((pc - lo) % 12 + 12) % 12 + lo;
    if (iv >= 12) n += 12;
    if (!out.includes(n)) out.push(n);
  }
  return out.sort((a, b) => a - b);
}
const clean = (s) => (Array.isArray(s) ? s.join(' ') : s);
const tokens = (s) => clean(s).split(/\s+/).filter((t) => t && t !== '|');
const lanes = (s) => clean(s).replace(/[\s|]/g, '');

function parseTok(t, defDur) {
  let vel = 0.8;
  if (t.endsWith('!')) { vel = 1; t = t.slice(0, -1); } else if (t.endsWith('?')) { vel = 0.5; t = t.slice(0, -1); }
  let dur = defDur;
  const ci = t.lastIndexOf(':');
  if (ci >= 0) { dur = +t.slice(ci + 1); t = t.slice(0, ci); }
  let rh = 0;
  const hi = t.indexOf('^');
  if (hi >= 0) { rh = +t.slice(hi + 1); t = t.slice(0, hi); }
  if (!(dur > 0)) throw new Error('bad duration in token ' + t);
  return { body: t, dur, vel, rh };
}

function rhythmNotes(ev, s, p, rh, pick) {
  for (let k = 0; k < p.dur; k++) {
    const ch = rh[k % rh.length];
    if (ch === '.' || ch === '-') continue;
    let d = 1;
    while (k + d < p.dur && rh[(k + d) % rh.length] === '-') d++;
    const notes = pick(ch);
    if (notes) ev.push({ step: s + k, dur: d, notes, vel: p.vel * (ch === 'X' ? 1.2 : 1) });
  }
}

const GEN = {
  pad(ev, s, p, c, ch) {
    const n = voice(c, ch.oct ?? 4);
    if (ch.bassNote) n.unshift(12 * ((ch.oct ?? 4)) + c.bass - 12 * (c.bass > 7 ? 1 : 0));
    ev.push({ step: s, dur: p.dur, notes: n, vel: p.vel });
  },
  arp(ev, s, p, c, ch) {
    const base = voice(c, ch.oct ?? 4), seq = [];
    for (let o = 0; o < (ch.span ?? 2); o++) for (const n of base) seq.push(n + 12 * o);
    let pat = seq;
    if (ch.pattern === 'down') pat = seq.slice().reverse();
    else if (ch.pattern === 'updown') pat = seq.concat(seq.slice(1, -1).reverse());
    const rate = ch.rate ?? 2;
    let seed = (c.root + 1) * 131 + s;
    for (let k = 0, i = 0; k < p.dur; k += rate, i++) {
      let n;
      if (ch.pattern === 'rand') { seed = (seed * 1103515245 + 12345) & 0x7fffffff; n = seq[seed % seq.length]; } else n = pat[i % pat.length];
      ev.push({ step: s + k, dur: Math.min(rate, p.dur - k), notes: [n], vel: p.vel * (i % 4 === 0 ? 1 : 0.78) });
    }
  },
  bass(ev, s, p, c, ch) {
    const rh = lanes(ch.rhythms ? ch.rhythms[p.rh] : (ch.rhythm || 'x'));
    const root = 12 * ((ch.oct ?? 2) + 1) + c.bass;
    const third = c.ints.includes(3) ? 3 : c.ints.includes(4) ? 4 : c.ints.includes(5) ? 5 : 7;
    const sev = c.ints.includes(11) ? 11 : 10;
    const map = { x: 0, X: 0, o: 12, 5: 7, 3: third, 7: sev, b: -12 };
    rhythmNotes(ev, s, p, rh, (k) => (k in map ? [root + map[k]] : null));
  },
  stab(ev, s, p, c, ch) {
    const rh = lanes(ch.rhythms ? ch.rhythms[p.rh] : (ch.rhythm || 'x'));
    const n = voice(c, ch.oct ?? 4);
    rhythmNotes(ev, s, p, rh, (k) => (k === 'x' || k === 'X' ? n : null));
  },
};

function finishChannel(src, ev, len, extra = {}) {
  const at = new Array(Math.max(1, len));
  for (const e of ev) (at[e.step % len] ||= []).push(e);
  return { ...src, ...extra, len: Math.max(1, len), at, notes: undefined, chords: undefined, drums: undefined };
}
function compileChannel(ch) {
  const ev = [];
  let s = 0;
  if (ch.notes) {
    for (const t of tokens(ch.notes)) {
      const p = parseTok(t, ch.len ?? 4);
      if (p.body !== '.') ev.push({ step: s, dur: p.dur, notes: p.body.split(',').map(noteNum), vel: p.vel });
      s += p.dur;
    }
  } else if (ch.chords) {
    const g = GEN[ch.mode || 'pad'];
    if (!g) throw new Error('bad mode ' + ch.mode);
    for (const t of tokens(ch.chords)) {
      const p = parseTok(t, ch.len ?? 16);
      if (p.body !== '.') g(ev, s, p, parseChord(p.body), ch);
      s += p.dur;
    }
  }
  return finishChannel(ch, ev, s);
}
function compileLane(lane, pat, ch) {
  const d = DRUMS[lane];
  if (!d) throw new Error('bad drum lane ' + lane);
  const str = lanes(pat), ev = [], V = { x: 0.8, X: 1, o: 0.45, g: 0.25 };
  for (let i = 0; i < str.length; i++) if (V[str[i]]) ev.push({ step: i, dur: 1, notes: [60 + d[1]], vel: V[str[i]] });
  return finishChannel(ch, ev, str.length, { inst: d[0], drum: true, lane });
}

export function compileSong(def) {
  const layers = {};
  let length = 0;
  for (const [name, chans] of Object.entries(def.layers)) {
    const out = (layers[name] = []);
    for (const ch of chans) {
      if (ch.drums) for (const [lane, pat] of Object.entries(ch.drums)) out.push(compileLane(lane, pat, ch));
      else out.push(compileChannel(ch));
    }
    for (const c of out) length = Math.max(length, c.len);
  }
  return { loop: true, swing: 0, transpose: 0, ...def, layers, length: def.steps || length };
}
export function songInstruments(song) {
  const s = new Set();
  for (const chans of Object.values(song.layers)) for (const c of chans) s.add(c.inst);
  return [...s];
}

// ---------------------------------------------------------------- player
const gn = (ctx, v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };

export class SongPlayer {
  constructor(engine, song, { t0, fadeIn = 1.5, transpose = 0, layerGains = {}, jingle = false } = {}) {
    const ctx = engine.ctx;
    this.e = engine; this.song = song; this.id = song.id;
    this.stepDur = 60 / song.bpm / 4;
    this.swing = song.swing || 0;
    this.t0 = t0; this.step = 0; this.ended = false; this.stopAt = null;
    this.transpose = transpose + (song.transpose || 0);
    const dst = jingle ? engine.jingleIn : engine.dryIn;
    this.out = [gn(ctx, 0), gn(ctx, 0), gn(ctx, 0)];
    this.out[0].connect(dst); this.out[1].connect(engine.echoIn); this.out[2].connect(engine.revIn);
    for (const g of this.out) {
      g.gain.setValueAtTime(0, t0);
      if (fadeIn > 0.01) g.gain.linearRampToValueAtTime(1, t0 + fadeIn); else g.gain.setValueAtTime(1, t0);
    }
    this.layers = [];
    for (const [name, chans] of Object.entries(song.layers)) {
      const v = layerGains[name] ?? (name === 'base' ? 1 : 0);
      const L = { name, target: v, g: [gn(ctx, v), gn(ctx, v), gn(ctx, v)], chans: [] };
      L.g.forEach((g, i) => g.connect(this.out[i]));
      for (const c of chans) {
        const node = ctx.createStereoPanner(); node.pan.value = c.pan || 0;
        node.connect(L.g[0]);
        const e = gn(ctx, c.echo ?? (c.drum ? 0.05 : 0.25)), r = gn(ctx, c.rev ?? (c.drum ? 0.12 : 0.3));
        node.connect(e); e.connect(L.g[1]); node.connect(r); r.connect(L.g[2]);
        L.chans.push({ c, node, sends: [e, r], inst: engine.instrument(c.inst), voices: [] });
      }
      this.layers.push(L);
    }
  }
  layer(name) { return this.layers.find((l) => l.name === name); }
  setLayer(name, v, tc = 1.5, at = null) {
    const L = this.layer(name); if (!L) return;
    const t = at ?? this.e.ctx.currentTime;
    L.target = v;
    for (const g of L.g) { g.gain.cancelScheduledValues(t); g.gain.setTargetAtTime(v, t, tc); }
  }
  transposeAt(k) {
    const m = this.song.modulate;
    if (!m) return this.transpose;
    return this.transpose + Math.min(m.max ?? 12, Math.floor(k / (m.every * 16)) * m.step);
  }
  schedule(until) {
    const now = this.e.ctx.currentTime, song = this.song;
    while (!this.ended) {
      const k = this.step;
      const t = this.t0 + k * this.stepDur + ((k & 1) ? this.swing * this.stepDur : 0);
      if (t >= until) break;
      if (this.stopAt != null && t >= this.stopAt) { this.ended = true; break; }
      if (!song.loop && k >= song.length) { this.ended = true; this.endTime = t; break; }
      if (song.layerIn) for (const [name, bar] of Object.entries(song.layerIn)) if (k === bar * 16) this.setLayer(name, 1, 2, t);
      if (t >= now - 0.03) {               // fell behind (throttled tab)? drop the step, don't burst
        const tr = this.transposeAt(k);
        for (const L of this.layers) {
          if (L.target < 0.002 && L.g[0].gain.value < 0.002) continue;
          for (const ch of L.chans) {
            const evs = ch.c.at[k % ch.c.len];
            if (evs) for (const ev of evs) this.e.note(ch, ev, t, tr, this.stepDur);
          }
        }
      }
      this.step++;
    }
  }
  stop(fade = 1.5) {
    const t = this.e.ctx.currentTime;
    if (this.stopAt != null && this.stopAt <= t + fade) return;
    this.stopAt = t + fade;
    for (const g of this.out) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade); }
  }
  // true once silent and safe to disconnect
  finished(now) {
    if (this.stopAt != null) return now > this.stopAt + 0.3;
    if (this.ended && this.endTime != null) return now > this.endTime + (this.song.tail ?? 4);
    return false;
  }
  dispose() {
    for (const g of this.out) g.disconnect();
    for (const L of this.layers) { for (const g of L.g) g.disconnect(); for (const ch of L.chans) { ch.node.disconnect(); ch.sends.forEach((s) => s.disconnect()); } }
  }
}
