// SNES-style sampled instruments. Each is synthesised once into a 32 kHz sample with an
// optional sustain loop (like BRR loop points); notes are played by resampling (playbackRate)
// plus a per-note ADSR, exactly like the S-DSP.
// Fields: r() → { data, loop?: [startSec, endSec] }, root (MIDI note of sample), adsr [a,d,s,r] (s = level),
// vol, poly (max simultaneous voices per channel), drum (fixed pitch), pre (seconds of pre-roll: reverse cymbal)
import {
  SR, buf, noise, osc, fm, metal, ks, unison, ad, env, filt, filtFn, layer, mix, norm, drive, comb,
  loopXfade, seamless, hp1, mtof, rng, crush, reverse, fadeOut,
} from './dsp.js';

const R0 = rng(4242);
const finish = (x, p = 0.9, bits = 0) => { hp1(x, 20); norm(x, p); if (bits) crush(x, bits); return x; };
// sustained sample with crossfaded loop region
function sustained(x, ls, le, xf = 0.3) { loopXfade(x, ls, le, xf); return { data: finish(x.subarray(0, Math.round(le * SR))), loop: [ls, le] }; }

export const INST = {
  // warm analog pad: detuned saws through a soft lowpass, slow internal drift
  pad: { root: 60, adsr: [0.9, 1.2, 0.85, 1.8], vol: 0.32, poly: 12, r() {
    const f = mtof(60), d = 3.4;
    const x = unison(d, 'saw', f, [-11, -4, 3, 9]);
    mix(x, osc(d, { wave: 'saw', f: f / 2, ph: 0.3 }), 0.25);
    filtFn(x, 'lp', (t) => 1500 + 300 * Math.sin(t * 2.2), 0.9); filt(x, 'lp', 4000);
    return sustained(x, 0.8, 3.3, 0.6);
  } },
  // darker pad for raid beds
  darkpad: { root: 48, adsr: [1.6, 1.5, 0.8, 2.5], vol: 0.34, poly: 12, r() {
    const f = mtof(48), d = 4.2;
    const x = unison(d, 'saw', f, [-9, 0, 8]);
    mix(x, osc(d, { wave: 'sq', pw: 0.3, f: f * 1.003 }), 0.35);
    filtFn(x, 'lp', (t) => 650 + 220 * Math.sin(t * 1.5), 1.6);
    return sustained(x, 1.0, 4.1, 0.8);
  } },
  // "choir" aah: pulse + saw through three vowel formants, vibrato
  choir: { root: 60, adsr: [0.7, 1.0, 0.85, 1.6], vol: 0.3, poly: 12, r() {
    const f = mtof(60), d = 3.2;
    const src = unison(d, 'saw', f, [-9, 0, 9], { vib: 0.006, vibHz: 5 });
    mix(src, osc(d, { wave: 'sq', pw: 0.2, f, vib: 0.005, vibHz: 5.5 }), 0.4);
    const x = buf(d);
    for (const [ff, q, g] of [[700, 5, 1], [1150, 7, 0.6], [2700, 9, 0.25]]) layer(x, filt(src.slice(), 'bp', ff, ff, q), g);
    const br = noise(d, 'pink', R0); filt(br, 'bp', 2500, 2500, 2); layer(x, br, 0.04);
    return sustained(x, 0.8, 3.0, 0.6);
  } },
  // slow warm strings (PWM pulse pair)
  strings: { root: 60, adsr: [0.5, 0.8, 0.85, 1.2], vol: 0.3, poly: 12, r() {
    const f = mtof(60), d = 3.2, x = buf(d);
    for (const [c, hz] of [[-7, 0.6], [6, 0.9]]) {
      const pwOsc = osc(d, { wave: 'sq', f: f * Math.pow(2, c / 1200), fn: null });
      // emulate PWM with a second phase-shifted pulse
      const p2 = osc(d, { wave: 'saw', f: f * Math.pow(2, c / 1200), vib: 0.004, vibHz: hz * 5 });
      mix(x, pwOsc, 0.35); mix(x, p2, 0.5);
    }
    filt(x, 'lp', 2600, 2600, 0.8);
    return sustained(x, 0.7, 3.0, 0.5);
  } },
  // glassy FM bell
  bell: { root: 72, adsr: [0.002, 2.5, 0, 1.5], vol: 0.3, poly: 8, r() {
    const f = mtof(72), d = 3.0;
    const x = fm(d, { f, ratio: 3.5, index: 3.2, index1: 0.15, isweep: 1.4 });
    mix(x, fm(d, { f: f * 2, ratio: 1.0, index: 0.8, index1: 0.05 }), 0.25);
    ad(x, 0.001, 2.8); return { data: finish(x) };
  } },
  // electric piano (FM 1:1 + tine)
  ep: { root: 60, adsr: [0.002, 1.8, 0, 0.6], vol: 0.36, poly: 10, r() {
    const f = mtof(60), d = 2.6;
    const x = fm(d, { f, ratio: 1, index: 1.8, index1: 0.25, isweep: 1.2 });
    const tine = fm(0.3, { f, ratio: 14, index: 1.2, index1: 0 }); ad(tine, 0.0005, 0.25); mix(x, tine, 0.35);
    ad(x, 0.002, 2.5); return { data: finish(x) };
  } },
  // filtered square pluck (arps)
  pluck: { root: 60, adsr: [0.002, 0.9, 0, 0.25], vol: 0.3, poly: 8, r() {
    const f = mtof(60), d = 1.3;
    const x = osc(d, { wave: 'sq', pw: 0.35, f });
    mix(x, osc(d, { wave: 'saw', f: f * 1.004 }), 0.5);
    filt(x, 'lp', 5200, 420, 1.6, 0.35); ad(x, 0.001, 1.2);
    return { data: finish(x) };
  } },
  // brighter glassy arp (pulse 12.5% + sine)
  glass: { root: 72, adsr: [0.002, 0.7, 0, 0.2], vol: 0.24, poly: 8, r() {
    const f = mtof(72), d = 1.0;
    const x = osc(d, { wave: 'sq', pw: 0.125, f }); mix(x, osc(d, { f: f * 2 }), 0.6);
    filt(x, 'lp', 6000, 1500, 1, 0.5); ad(x, 0.001, 0.9); return { data: finish(x) };
  } },
  // kalimba / water drip
  kalimba: { root: 72, adsr: [0.001, 1.0, 0, 0.3], vol: 0.3, poly: 6, r() {
    const f = mtof(72), d = 1.2;
    const x = osc(d, { f: f * 1.02, f1: f, sweep: 0.02 }); ad(x, 0.001, 1.1);
    const o = osc(0.25, { f: f * 4.9 }); ad(o, 0.001, 0.2); mix(x, o, 0.35);
    const k = noise(0.01, 'white', R0); filt(k, 'bp', 3000, 3000, 2); mix(x, k, 0.2);
    return { data: finish(x) };
  } },
  // plucked string (Karplus-Strong) – koto / oud colour for Sandy City
  koto: { root: 57, adsr: [0.001, 1.6, 0, 0.3], vol: 0.36, poly: 6, r() {
    const x = ks(1.8, mtof(57), { decay: 0.997, bright: 0.65, pick: 0.3 }, R0);
    const tw = osc(0.05, { f: mtof(57) * 3, f1: mtof(57) * 2 }); ad(tw, 0.001, 0.05); mix(x, tw, 0.1);
    filt(x, 'lp', 5000); fadeOut(x, 0.2); return { data: finish(x) };
  } },
  // breathy flute (Green Gate)
  flute: { root: 72, adsr: [0.12, 0.6, 0.85, 0.5], vol: 0.3, poly: 2, r() {
    const f = mtof(72), d = 2.4;
    const x = osc(d, { f, vib: 0.007, vibHz: 5, vibDelay: 0.35 });
    mix(x, osc(d, { f: f * 2, vib: 0.007, vibHz: 5, vibDelay: 0.35 }), 0.18);
    mix(x, osc(d, { f: f * 3 }), 0.05);
    const br = noise(d, 'white', R0); filt(br, 'bp', f * 2, f * 2, 3); env(br, [[0, 1.5], [0.1, 0.5], [d, 0.4]]); mix(x, br, 0.18);
    return sustained(x, 0.6, 2.2, 0.4);
  } },
  // lonely square lead with delayed vibrato
  lead: { root: 72, adsr: [0.02, 0.4, 0.75, 0.35], vol: 0.26, poly: 2, r() {
    const f = mtof(72), d = 2.6;
    const x = osc(d, { wave: 'sq', pw: 0.42, f, vib: 0.008, vibHz: 5.5, vibDelay: 0.3 });
    mix(x, osc(d, { wave: 'saw', f: f * 1.003, vib: 0.008, vibHz: 5.5, vibDelay: 0.3 }), 0.35);
    filt(x, 'lp', 3200, 2200, 0.9, 0.4);
    return sustained(x, 0.6, 2.42, 0.36);
  } },
  // synth brass stab (filter opens on attack)
  brass: { root: 60, adsr: [0.03, 0.5, 0.7, 0.35], vol: 0.3, poly: 10, r() {
    const f = mtof(60), d = 2.2;
    const x = unison(d, 'saw', f, [-8, 0, 7]);
    mix(x, osc(d, { wave: 'sq', pw: 0.3, f: f / 2 }), 0.3);
    filtFn(x, 'lp', (t) => t < 0.07 ? 500 + 3500 * (t / 0.07) : 1800 + 2200 * Math.exp(-(t - 0.07) * 6), 1.3);
    drive(x, 1.3);
    return sustained(x, 0.7, 2.1, 0.4);
  } },
  // deep bass: triangle + filtered saw sub
  bass: { root: 36, adsr: [0.005, 0.35, 0.75, 0.2], vol: 0.5, poly: 3, r() {
    const f = mtof(36), d = 2.4;
    const x = osc(d, { wave: 'tri', f });
    const s = osc(d, { wave: 'saw', f }); filt(s, 'lp', 1300, 380, 1.2, 0.25); mix(x, s, 0.6);
    mix(x, osc(d, { f: f / 2 }), 0.25);
    return sustained(x, 0.6, 2.3, 0.3);
  } },
  // driving synth bass (combat)
  bassdrive: { root: 36, adsr: [0.002, 0.18, 0.55, 0.08], vol: 0.42, poly: 2, r() {
    const f = mtof(36), d = 1.6;
    const x = unison(d, 'saw', f, [-6, 6]); mix(x, osc(d, { wave: 'sq', pw: 0.5, f: f / 2 }), 0.5);
    filt(x, 'lp', 2600, 450, 1.8, 0.18); drive(x, 1.6);
    return sustained(x, 0.5, 1.5, 0.25);
  } },
  // sub sine
  sub: { root: 36, adsr: [0.01, 0.3, 0.9, 0.3], vol: 0.45, poly: 2, r() {
    const f = mtof(36), d = 2.0, x = osc(d, { f }); mix(x, osc(d, { f: f * 2 }), 0.12);
    return sustained(x, 0.5, 2.0, 0.3);
  } },
  // low evolving drone (filtered saws + noise breath)
  drone: { root: 38, adsr: [2.5, 1, 1, 3], vol: 0.36, poly: 4, r() {
    const f = mtof(38), d = 4.0;
    const x = unison(d + 0.5, 'saw', f, [-6, 6]);
    const n = noise(d + 0.5, 'brown', R0); mix(x, n, 0.25);
    filtFn(x, 'lp', (t) => 380 + 200 * Math.sin(2 * Math.PI * t / d), 2.2);
    const y = seamless(x, 0.5); return { data: finish(y), loop: [0, y.length / SR] };
  } },

  // ------------------------------------------------------------- drums (fixed pitch, drum: true)
  kick: { drum: 1, root: 60, adsr: [0.001, 0.5, 0, 0.05], vol: 0.65, poly: 2, r() {
    const x = osc(0.5, { f: 160, f1: 42, sweep: 0.08 }); ad(x, 0.001, 0.45);
    const c = noise(0.01, 'white', R0); filt(c, 'bp', 3500, 3500, 1); mix(x, c, 0.25);
    drive(x, 1.6); return { data: finish(x, 0.95) };
  } },
  snare: { drum: 1, root: 60, adsr: [0.001, 0.5, 0, 0.05], vol: 0.45, poly: 2, r() {
    const x = buf(0.45);
    const t = osc(0.12, { f: 190, f1: 160 }); ad(t, 0.001, 0.1); layer(x, t, 0.6);
    const n = noise(0.4, 'crunch', R0, 1); filt(n, 'hp', 900); filt(n, 'lp', 9000);
    env(n, [[0, 0], [0.002, 1], [0.05, 0.5], [0.24, 0.35], [0.26, 0]]);   // 80s gated tail
    layer(x, n, 0.9); return { data: finish(x, 0.9, 10) };
  } },
  clap: { drum: 1, root: 60, adsr: [0.001, 0.5, 0, 0.05], vol: 0.38, poly: 2, r() {
    const x = buf(0.4);
    for (const t of [0, 0.011, 0.023]) { const n = noise(0.02, 'white', R0); filt(n, 'bp', 1300, 1300, 1.5); ad(n, 0.0005, 0.02); layer(x, n, 0.8, t); }
    const tl = noise(0.35, 'white', R0); filt(tl, 'bp', 1200, 1200, 1.2); ad(tl, 0.001, 0.3); layer(x, tl, 0.7, 0.03);
    return { data: finish(x) };
  } },
  hat: { drum: 1, root: 60, adsr: [0.001, 0.1, 0, 0.02], vol: 0.2, poly: 2, r() {
    const x = metal(0.09, 420, R0); mix(x, noise(0.09, 'white', R0), 0.5); filt(x, 'hp', 7000); ad(x, 0.001, 0.07);
    return { data: finish(x, 0.9, 9) };
  } },
  ohat: { drum: 1, root: 60, adsr: [0.001, 0.5, 0, 0.05], vol: 0.18, poly: 2, r() {
    const x = metal(0.45, 420, R0); mix(x, noise(0.45, 'white', R0), 0.5); filt(x, 'hp', 6500); ad(x, 0.002, 0.4);
    return { data: finish(x, 0.9, 9) };
  } },
  shaker: { drum: 1, root: 60, adsr: [0.001, 0.15, 0, 0.02], vol: 0.16, poly: 2, r() {
    const x = noise(0.12, 'white', R0); filt(x, 'bp', 6000, 6000, 1.2); env(x, [[0, 0], [0.03, 1], [0.12, 0]]);
    return { data: finish(x) };
  } },
  rim: { drum: 1, root: 60, adsr: [0.001, 0.1, 0, 0.02], vol: 0.25, poly: 2, r() {
    const x = osc(0.06, { f: 520 }); ad(x, 0.0005, 0.04);
    const c = noise(0.02, 'white', R0); filt(c, 'bp', 1800, 1800, 3); mix(x, c, 0.8); ad(x, 0.0005, 0.05);
    return { data: finish(x) };
  } },
  tom: { drum: 1, root: 60, adsr: [0.001, 0.6, 0, 0.05], vol: 0.45, poly: 3, r() {
    const x = osc(0.6, { f: 150, f1: 95, sweep: 0.2 }); ad(x, 0.001, 0.55);
    const n = noise(0.05, 'white', R0); filt(n, 'lp', 2500); ad(n, 0.001, 0.04); mix(x, n, 0.3);
    return { data: finish(x) };
  } },
  boom: { drum: 1, root: 60, adsr: [0.001, 1.4, 0, 0.1], vol: 0.55, poly: 2, r() {   // taiko-ish low drum
    const x = osc(1.3, { f: 95, f1: 52, sweep: 0.35 }); ad(x, 0.002, 1.2);
    const n = noise(0.3, 'brown', R0); filt(n, 'lp', 600); ad(n, 0.002, 0.25); mix(x, n, 0.6);
    drive(x, 1.4); return { data: finish(x, 0.95) };
  } },
  crash: { drum: 1, root: 60, adsr: [0.001, 2.2, 0, 0.2], vol: 0.2, poly: 2, r() {
    const x = metal(2.2, 330, R0); mix(x, noise(2.2, 'white', R0), 0.9); filt(x, 'hp', 4200); ad(x, 0.002, 2.1);
    return { data: finish(x, 0.9, 10) };
  } },
  rcym: { drum: 1, root: 60, pre: 1.6, adsr: [0.001, 2, 1, 0.05], vol: 0.22, poly: 2, r() {
    const x = metal(1.6, 330, R0); mix(x, noise(1.6, 'white', R0), 0.9); filt(x, 'hp', 3500); ad(x, 0.001, 1.6);
    reverse(x); fadeOut(x, 0.01); return { data: finish(x, 0.9, 10) };
  } },
  clank: { drum: 1, root: 60, adsr: [0.001, 1.0, 0, 0.1], vol: 0.28, poly: 3, r() {   // industrial metal hit
    const x = fm(0.9, { f: 210, ratio: 2.76, index: 5, index1: 0.6 }); ad(x, 0.001, 0.85);
    const n = noise(0.03, 'crunch', R0, 2); filt(n, 'bp', 2500, 2500, 1); mix(x, n, 0.5);
    comb(x, 1 / 390, 0.5, 0.3); return { data: finish(x, 0.9, 9) };
  } },
  perc: { drum: 1, root: 60, adsr: [0.001, 0.4, 0, 0.05], vol: 0.32, poly: 3, r() {   // darbuka-ish hand drum
    const x = osc(0.35, { f: 340, f1: 260, sweep: 0.05 }); ad(x, 0.001, 0.3);
    const n = noise(0.03, 'white', R0); filt(n, 'bp', 2800, 2800, 2); ad(n, 0.0005, 0.025); mix(x, n, 0.6);
    return { data: finish(x) };
  } },
  tick: { drum: 1, root: 60, adsr: [0.001, 0.05, 0, 0.02], vol: 0.18, poly: 2, r() {   // clock tick (tension)
    const x = noise(0.03, 'white', R0); filt(x, 'bp', 4200, 4200, 6); ad(x, 0.0005, 0.025);
    mix(x, ad(osc(0.03, { f: 2100 }), 0.0005, 0.02), 0.3); return { data: finish(x) };
  } },
};

// drum-lane shorthand → instrument + semitone offset
export const DRUMS = {
  k: ['kick', 0], s: ['snare', 0], cl: ['clap', 0], h: ['hat', 0], oh: ['ohat', 0], sh: ['shaker', 0],
  rim: ['rim', 0], t1: ['tom', 5], t2: ['tom', 0], t3: ['tom', -5], b: ['boom', 0], b2: ['boom', -4],
  c: ['crash', 0], r: ['rcym', 0], m: ['clank', 0], m2: ['clank', 5], p: ['perc', 0], p2: ['perc', -5],
  tk: ['tick', 0], tk2: ['tick', -7],
};
