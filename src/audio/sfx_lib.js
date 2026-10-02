// Reusable SFX recipes built on dsp.js. Each returns a Float32Array at dsp.SR.
// `R` is a seeded rng (see dsp.rng) so every variant of a sound is slightly different.
import {
  SR, buf, noise, osc, fm, ad, env, filt, filtFn, layer, mix, snes, drive, comb, am, fadeOut, len,
} from './dsp.js';

// Definition helper used by all sfx tables.
// opts: v variants, pj pitch jitter, vol, max (voices per name), dist (hearing m), bus, loop, prio, duck
export const def = (r, o = {}) => ({ r, v: 3, pj: 0.04, vol: 1, max: 4, dist: 45, bus: 'sfx', loop: false, prio: 1, ...o });

// ------------------------------------------------------------------ guns
export function gunshot(R, o = {}) {
  const {
    dur = 0.6, crackF = 2600, crackQ = 0.9, crackDec = 0.05, crackG = 0.8,
    bodyF = 900, bodyDec = 0.12, bodyG = 0.9,
    thumpF = 110, thumpF1 = 42, thumpDec = 0.14, thumpG = 1.0,
    tailF = 700, tailDec = 0.45, tailG = 0.3, slap = 0, slapG = 0.25,
    mech = 0, drv = 2.2, bits = 9, hold = 1, p = 0.95,
  } = o;
  const out = buf(dur);
  const c = noise(crackDec * 1.6 + 0.01, 'crunch', R, 1);
  filt(c, 'bp', crackF * R.j(0.15), crackF * 0.5, crackQ); ad(c, 0.0004, crackDec * R.j(0.15));
  layer(out, c, crackG);
  const b = noise(bodyDec * 1.4 + 0.01, 'white', R);
  filt(b, 'lp', bodyF * R.j(0.15), bodyF * 0.35, 1.1); ad(b, 0.001, bodyDec * R.j(0.1));
  layer(out, b, bodyG);
  const t = osc(thumpDec * 1.3, { f: thumpF * R.j(0.06), f1: thumpF1, sweep: thumpDec * 0.5 });
  ad(t, 0.0006, thumpDec); layer(out, t, thumpG);
  if (tailG) {
    const tl = noise(tailDec + 0.05, 'brown', R);
    filt(tl, 'lp', tailF * R.j(0.1), tailF * 0.4, 0.8); ad(tl, 0.012, tailDec * R.j(0.12));
    layer(out, tl, tailG, 0.006);
  }
  if (slap) {                       // distant wall slapback (snipers, big rifles)
    const s = noise(0.35, 'pink', R); filt(s, 'lp', 1400, 500, 0.7); ad(s, 0.004, 0.3);
    layer(out, s, slapG, slap * R.j(0.1));
  }
  if (mech) layer(out, click(R, 3800, 0.02), mech, 0.03 + R() * 0.01);
  return snes(out, { drv, bits, hold, p });
}

// short resonant click (mechanisms, switches)
export function click(R, f = 3000, d = 0.025, q = 4) {
  const x = noise(d + 0.005, 'white', R); filt(x, 'bp', f * R.j(0.1), f * 0.8, q); ad(x, 0.0003, d);
  return x;
}
// metal clack: click + tiny FM ping
export function clack(R, f = 1800, d = 0.08) {
  const x = buf(d + 0.02);
  layer(x, click(R, f * 1.6, d * 0.5, 3), 0.8);
  const p = fm(d, { f: f * R.j(0.08), ratio: 1.41, index: 2, index1: 0.2 }); ad(p, 0.0005, d * 0.8);
  layer(x, p, 0.5);
  return x;
}
// cloth / gear rustle
export function rustle(R, d = 0.25, f = 2200) {
  const x = noise(d, 'white', R);
  filt(x, 'bp', f * R.j(0.2), f * 0.7, 1.2);
  // granular crackle envelope
  let g = 0;
  for (let i = 0; i < x.length; i++) { if (i % 160 === 0) g = R() * R(); x[i] *= g; }
  env(x, [[0, 0], [d * 0.2, 1], [d, 0]]);
  return x;
}
// whoosh through bandpass sweep (up then down)
export function whoosh(R, d = 0.4, f0 = 300, fpk = 1600, q = 1.2) {
  const x = noise(d, 'pink', R);
  const fn = (t) => { const k = t / d; return f0 + (fpk - f0) * Math.sin(Math.PI * Math.min(1, k)); };
  filtFn(x, 'bp', fn, q);
  env(x, [[0, 0], [d * 0.45, 1], [d, 0]]);
  return x;
}

// deep thump (sine drop)
export function thump(R, f = 90, f1 = 35, d = 0.4, sweep = 0.12) {
  const x = osc(d, { f: f * R.j(0.05), f1, sweep }); ad(x, 0.001, d); return x;
}

// ------------------------------------------------------------------ impacts / explosions
export function explosion(R, size = 1) {
  const d = 1.0 + size * 1.6, out = buf(d);
  layer(out, thump(R, 70 - size * 15, 24, 0.5 + size * 0.5, 0.25), 1.0);
  const n = noise(0.7 + size * 0.9, 'crunch', R, 2);
  filt(n, 'lp', 4200 * R.j(0.1), 220, 0.9, 0.5 + size * 0.6); ad(n, 0.002, 0.6 + size * 0.9);
  layer(out, n, 0.95);
  const r = noise(d, 'brown', R); filt(r, 'lp', 400, 90, 0.8); ad(r, 0.03, d * 0.95);
  layer(out, r, 0.55 + size * 0.15, 0.02);
  // debris crackle
  const cr = buf(d);
  for (let k = 0; k < 18 + size * 20; k++) {
    const t = 0.05 + Math.pow(R(), 1.6) * (d * 0.75);
    mix(cr, click(R, R.r(600, 3500), R.r(0.01, 0.04), 2), R.r(0.1, 0.5) * (1 - t / d), t);
  }
  layer(out, cr, 0.25);
  return snes(out, { drv: 2.6, bits: 8, hold: 2, p: 0.97, fade: 0.2 });
}

export function ping(R, f = 1800, d = 0.35, ratio = 2.76, index = 3) {
  const x = fm(d, { f: f * R.j(0.12), ratio, index, index1: 0.1 }); ad(x, 0.0004, d); return x;
}

// ------------------------------------------------------------------ chiptune / ui
// sequence of square notes [[hz, dur], ...] with tiny decay and optional echo baked in
export function blips(R, notes, o = {}) {
  const { wave = 'sq', pw = 0.5, dec = 1, gap = 0, vib = 0, sweep = 0 } = o;
  const total = notes.reduce((s, n) => s + n[1] + gap, 0) + 0.05, out = buf(total);
  let t = 0;
  for (const [f, d, g = 1] of notes) {
    if (f > 0) {
      const x = osc(d, { wave, f, f1: sweep ? f * sweep : f, pw, vib, vibHz: 12 });
      ad(x, 0.002, d * dec * 1.3, d * 0.2); fadeOut(x, Math.min(0.01, d * 0.3)); mix(out, x, g * 0.5, t);
    }
    t += d + gap;
  }
  return out;
}
export function bell(R, f = 1046, d = 0.8, g = 1) {
  const x = fm(d, { f, ratio: 3.5, index: 2.5, index1: 0.2, isweep: d * 0.5 });
  ad(x, 0.001, d); return x.map((v) => v * g);
}
export const N = (name) => {            // note name → Hz ('A4' = 440)
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  const pc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * Math.pow(2, (12 * (+m[3] + 1) + pc - 69) / 12);
};

// ------------------------------------------------------------------ machines / ambience
// rotor buzz: blade-pass amplitude chop on noise + motor whine (loop-safe when d*hz integer)
export function rotor(R, d = 2, blade = 90, motor = 180, o = {}) {
  const { body = 900, whineG = 0.5, chopDepth = 0.85, lowG = 0.5 } = o;
  const out = buf(d);
  const n = noise(d, 'white', R); filt(n, 'bp', body, body, 0.9); am(n, blade, chopDepth, 3);
  layer(out, n, 1);
  const w = osc(d, { wave: 'saw', f: motor, vib: 0.006, vibHz: 3 });
  filt(w, 'lp', motor * 5, motor * 5, 2.5); layer(out, w, whineG);
  const l = osc(d, { wave: 'tri', f: blade }); am(l, blade / 2, 0.4);
  layer(out, l, lowG);
  return out;
}
export function sparks(R, d = 0.6, count = 20) {
  const out = buf(d);
  for (let k = 0; k < count; k++) {
    const t = Math.pow(R(), 1.3) * d * 0.9;
    mix(out, click(R, R.r(2500, 7000), R.r(0.004, 0.02), 3), R.r(0.3, 1) * (1 - t / d), t);
  }
  return out;
}
export function chirp(R, f0, f1, d, wave = 'sine') {
  const x = osc(d, { wave, f: f0, f1 }); env(x, [[0, 0], [d * 0.15, 1], [d, 0]]); return x;
}
export function servo(R, f = 220, d = 0.35, up = 1.6) {
  const x = osc(d, { wave: 'sq', pw: 0.3, fn: (t) => f * (1 + (up - 1) * Math.sin(Math.PI * Math.min(1, t / d))) });
  filt(x, 'bp', f * 3, f * 3, 2); env(x, [[0, 0], [0.03, 1], [d - 0.05, 0.8], [d, 0]]);
  return x;
}
export function rain(R, d = 4, density = 1, heavy = 0) {
  const out = buf(d);
  const bed = noise(d, 'pink', R); filt(bed, 'hp', 500); filt(bed, 'lp', 7000 - heavy * 2500);
  layer(out, bed, 0.6 + heavy * 0.3);
  const drops = buf(d), cnt = Math.floor(d * 70 * density);
  for (let k = 0; k < cnt; k++) mix(drops, click(R, R.r(1500, 6000), R.r(0.005, 0.02), R.r(2, 6)), R.r(0.1, 1), R() * (d - 0.03));
  layer(out, drops, 0.35);
  if (heavy) { const r = noise(d, 'brown', R); filt(r, 'lp', 300); layer(out, r, 0.4 * heavy); }
  return out;
}
export function wind(R, d = 6, center = 500, q = 0.9, gust = 0.6) {
  const x = noise(d, 'pink', R);
  const c1 = R.i(1, 2), c2 = R.i(2, 4), p1 = R() * 6, p2 = R() * 6;   // integer cycles → loopable
  const fn = (t) => center * (1 + 0.6 * Math.sin(TAU_ * c1 * t / d + p1) + 0.25 * Math.sin(TAU_ * c2 * t / d + p2));
  filtFn(x, 'bp', fn, q);
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    x[i] *= 1 - gust + gust * (0.5 + 0.5 * Math.sin(TAU_ * c1 * t / d + p1 + 0.6));
  }
  return x;
}
const TAU_ = Math.PI * 2;
export function bubble(R, f = 600, d = 0.06) {
  const x = osc(d, { f, f1: f * R.r(1.5, 2.5) }); ad(x, 0.002, d); return x;
}
export function birdChirp(R, base = 3000, kind = 0) {
  const notes = kind === 0 ? 3 + R.i(0, 3) : 1 + R.i(0, 2), out = buf(notes * 0.14 + 0.1);
  for (let k = 0; k < notes; k++) {
    const d = R.r(0.05, 0.11), f = base * R.r(0.85, 1.25);
    const x = kind === 0 ? osc(d, { f, f1: f * R.r(0.6, 1.5), vib: 0.03, vibHz: 40 })
      : osc(d, { f: f * 0.7, f1: f * 1.4 });
    env(x, [[0, 0], [d * 0.2, 1], [d, 0]]);
    mix(out, x, R.r(0.5, 1), k * R.r(0.08, 0.14));
  }
  return out;
}
export { comb, drive, len };
