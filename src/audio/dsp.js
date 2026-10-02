// Offline JS DSP toolkit used to "bake" SNES-style samples (32 kHz mono Float32Arrays).
// Everything in the audio system (SFX + music instruments) is rendered with these
// primitives once, then played back as cheap AudioBufferSourceNodes – exactly how the
// SNES S-DSP worked (BRR samples + pitch + ADSR), but generated procedurally.
// Pure functions, no DOM / WebAudio dependency (testable in node).

export const SR = 32000;            // SNES S-DSP output rate
export const TAU = Math.PI * 2;

// ---------------------------------------------------------------- seeded RNG
export function rng(seed = 1) {
  let a = (seed * 2654435761) >>> 0;
  const f = () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  f.r = (lo, hi) => lo + (hi - lo) * f();               // range
  f.j = (amt) => 1 + (f() * 2 - 1) * amt;               // jitter multiplier
  f.i = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f()); // int range inclusive
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.chance = (p) => f() < p;
  return f;
}

export const len = (sec) => Math.max(1, Math.round(sec * SR));
export const buf = (sec) => new Float32Array(len(sec));
export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------------------------------------------------------------- sources
// kinds: white, pink, brown, crunch (sample&hold + 4-bit = SNES noise channel feel)
export function noise(sec, kind = 'white', R = Math.random, hold = 2) {
  const n = len(sec), x = new Float32Array(n);
  if (kind === 'pink') {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < n; i++) {
      const w = R() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.16; b6 = w * 0.115926;
    }
  } else if (kind === 'brown') {
    let l = 0;
    for (let i = 0; i < n; i++) { l = (l + 0.02 * (R() * 2 - 1)) / 1.02; x[i] = l * 9; }
  } else if (kind === 'crunch') {
    let v = 0;
    for (let i = 0; i < n; i++) { if (i % hold === 0) v = Math.round((R() * 2 - 1) * 7) / 7; x[i] = v; }
  } else {
    for (let i = 0; i < n; i++) x[i] = R() * 2 - 1;
  }
  return x;
}

// 808-style metallic noise: six detuned square waves (hats, cymbals, ARK chatter)
export function metal(sec, f = 400, R = Math.random) {
  const n = len(sec), x = new Float32Array(n);
  const ratios = [1, 1.3420, 1.2312, 1.6532, 1.9523, 2.1523];
  const ph = ratios.map(() => R());
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < 6; k++) { ph[k] += f * ratios[k] / SR; ph[k] -= Math.floor(ph[k]); s += ph[k] < 0.5 ? 1 : -1; }
    x[i] = s / 6;
  }
  return x;
}

function blep(t, dt) {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
}
function wave(w, p, dt, pw) {
  switch (w) {
    case 'sine': return Math.sin(TAU * p);
    case 'tri': return 1 - 4 * Math.abs(p - 0.5);
    case 'saw': return 2 * p - 1 - blep(p, dt);
    case 'sq': {
      let v = p < pw ? 1 : -1;
      v += blep(p, dt); v -= blep((p + 1 - pw) % 1, dt); return v;
    }
    case 'rawsq': return p < pw ? 1 : -1;     // aliased, chiptune-crunchy
    case 'rawsaw': return 2 * p - 1;
    default: return Math.sin(TAU * p);
  }
}

// Oscillator with exponential/linear sweep, vibrato, or arbitrary freq function fn(t).
export function osc(sec, o = {}) {
  const { wave: w = 'sine', f = 440, f1 = f, sweep = sec, curve = 'exp', pw = 0.5,
    vib = 0, vibHz = 5, vibDelay = 0, ph = 0, fn = null } = o;
  const n = len(sec), x = new Float32Array(n), sn = Math.max(1, sweep * SR), vd = vibDelay * SR;
  let p = ph, base = f;
  const lr = Math.log(Math.max(1e-6, f1 / f)), still = !fn && f === f1;
  for (let i = 0; i < n; i++) {
    if (!still && (i & 7) === 0) {
      if (fn) base = fn(i / SR);
      else { const k = Math.min(i / sn, 1); base = curve === 'exp' ? f * Math.exp(lr * k) : f + (f1 - f) * k; }
    }
    let fr = base;
    if (vib) fr *= 1 + vib * Math.min(1, i / (vd + 1)) * Math.sin(TAU * vibHz * i / SR);
    const dt = Math.min(0.49, Math.abs(fr) / SR);
    p += fr / SR; p -= Math.floor(p);
    x[i] = wave(w, p, dt, pw);
  }
  return x;
}

// Detuned unison of one waveform (cents array) – pads, brass, supersaw.
export function unison(sec, w, f, cents = [-8, 0, 7], o = {}) {
  const x = new Float32Array(len(sec));
  for (const c of cents) {
    const k = Math.pow(2, c / 1200);
    mix(x, osc(sec, { ...o, wave: w, f: f * k, f1: (o.f1 ?? f) * k, fn: o.fn ? (t) => o.fn(t) * k : null, ph: (c * 0.137 + 0.31) % 1 }), 1 / cents.length);
  }
  return x;
}

// 2/3-operator phase-modulation FM. index sweeps exp from index→index1 over `isweep`.
export function fm(sec, o = {}) {
  const { f = 440, f1 = f, sweep = sec, ratio = 2, index = 2, index1 = index, isweep = sec,
    fb = 0, ratio2 = 0, index2 = 0, vib = 0, vibHz = 5 } = o;
  const n = len(sec), x = new Float32Array(n), sn = Math.max(1, sweep * SR), isn = Math.max(1, isweep * SR);
  let pc = 0, pm = 0, pm2 = 0, prev = 0;
  const iexp = index > 0 && index1 > 0;
  let base = f, idx = index, ki = 0;
  const lf = Math.log(f1 / f), li = iexp ? Math.log(index1 / index) : 0;
  for (let i = 0; i < n; i++) {
    if ((i & 7) === 0) {
      const k = Math.min(i / sn, 1); ki = Math.min(i / isn, 1);
      base = f * Math.exp(lf * k);
      idx = iexp ? index * Math.exp(li * ki) : index + (index1 - index) * ki;
    }
    let fr = base;
    if (vib) fr *= 1 + vib * Math.sin(TAU * vibHz * i / SR);
    pc += fr / SR; pm += fr * ratio / SR; pm2 += fr * ratio2 / SR;
    pc -= Math.floor(pc); pm -= Math.floor(pm); pm2 -= Math.floor(pm2);
    const m = Math.sin(TAU * pm + fb * prev) * idx; prev = m;
    const m2 = index2 ? Math.sin(TAU * pm2) * index2 * (1 - ki) : 0;
    x[i] = Math.sin(TAU * pc + m + m2);
  }
  return x;
}

// Karplus-Strong plucked string (koto / oud / harp).
export function ks(sec, f = 220, o = {}, R = Math.random) {
  const { decay = 0.996, bright = 0.5, pick = 0.5 } = o;
  const n = len(sec), x = new Float32Array(n), per = SR / f, N = Math.ceil(per) + 2;
  const line = new Float32Array(N);
  for (let i = 0; i < N; i++) line[i] = (R() * 2 - 1) * (1 - pick) + (i < N * pick ? 1 : -1) * pick * 0.5;
  // pre-filter excitation for darker tone
  for (let k = 0; k < 3 * (1 - bright); k++) for (let i = 1; i < N; i++) line[i] = 0.5 * (line[i] + line[i - 1]);
  const hist = new Float32Array(n + N);
  for (let i = 0; i < N; i++) hist[i] = line[i];
  for (let i = N; i < n + N; i++) {
    const rp = i - per, i0 = Math.floor(rp), fr = rp - i0;
    const a = hist[i0] * (1 - fr) + hist[i0 + 1] * fr;
    const b = hist[i0 - 1] * (1 - fr) + hist[i0] * fr;
    hist[i] = decay * (bright * a + (1 - bright) * 0.5 * (a + b));
  }
  for (let i = 0; i < n; i++) x[i] = hist[i + N];
  return x;
}

// ---------------------------------------------------------------- envelopes
// linear attack a, hold h, then exponential decay reaching -60 dB after d seconds
export function ad(x, a = 0.002, d = 0.2, h = 0) {
  const na = Math.max(1, a * SR), nh = h * SR, k = -6.9 / Math.max(1, d * SR);
  for (let i = 0; i < x.length; i++) x[i] *= i < na ? i / na : (i < na + nh ? 1 : Math.exp(k * (i - na - nh)));
  return x;
}
// piecewise-linear envelope [[t, v], ...]
export function env(x, pts) {
  let j = 0;
  for (let i = 0; i < x.length; i++) {
    const t = i / SR;
    while (j < pts.length - 1 && t > pts[j + 1][0]) j++;
    let v;
    if (j >= pts.length - 1) v = pts[pts.length - 1][1];
    else { const [t0, v0] = pts[j], [t1, v1] = pts[j + 1]; v = t <= t0 ? v0 : v0 + (v1 - v0) * (t - t0) / Math.max(1e-6, t1 - t0); }
    x[i] *= v;
  }
  return x;
}
export function fadeIn(x, sec) { const n = Math.min(x.length, len(sec)); for (let i = 0; i < n; i++) x[i] *= i / n; return x; }
export function fadeOut(x, sec) {
  const n = Math.min(x.length, len(sec)), s = x.length - n;
  for (let i = 0; i < n; i++) x[s + i] *= 1 - i / n; return x;
}
// amplitude modulation with a sine LFO (tremolo / rotor chop)
export function am(x, hz, depth = 1, shape = 1) {
  for (let i = 0; i < x.length; i++) {
    const s = 0.5 + 0.5 * Math.sin(TAU * hz * i / SR);
    x[i] *= 1 - depth + depth * Math.pow(s, shape);
  }
  return x;
}

// ---------------------------------------------------------------- filters
const C = new Float64Array(5);
function coefs(type, f, q) {
  const w = TAU * Math.min(Math.max(f, 10), SR * 0.47) / SR, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q);
  let b0, b1, b2; const a0 = 1 + al, a1 = -2 * cs, a2 = 1 - al;
  if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; }
  else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; }
  else if (type === 'notch') { b0 = 1; b1 = -2 * cs; b2 = 1; }
  else { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; }
  C[0] = b0 / a0; C[1] = b1 / a0; C[2] = b2 / a0; C[3] = a1 / a0; C[4] = a2 / a0;
}
// RBJ biquad, in place, cutoff sweeps exponentially f→f1 over `sweep` seconds.
export function filt(x, type = 'lp', f = 1000, f1 = f, q = 0.707, sweep = null) {
  const sn = Math.max(1, (sweep == null ? x.length / SR : sweep) * SR);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  let c0 = 0, c1 = 0, c2 = 0, c3 = 0, c4 = 0;
  const moving = f !== f1;
  for (let i = 0; i < x.length; i++) {
    if (i === 0 || (moving && (i & 15) === 0)) {
      const k = Math.min(i / sn, 1);
      coefs(type, f * Math.pow(f1 / f, k), q);
      c0 = C[0]; c1 = C[1]; c2 = C[2]; c3 = C[3]; c4 = C[4];
    }
    const xi = x[i], y = c0 * xi + c1 * x1 + c2 * x2 - c3 * y1 - c4 * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = y; x[i] = y;
  }
  return x;
}
// cutoff driven by a function of time (Hz)
export function filtFn(x, type, fn, q = 0.707) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0, c0 = 0, c1 = 0, c2 = 0, c3 = 0, c4 = 0;
  for (let i = 0; i < x.length; i++) {
    if ((i & 15) === 0) { coefs(type, fn(i / SR), q); c0 = C[0]; c1 = C[1]; c2 = C[2]; c3 = C[3]; c4 = C[4]; }
    const xi = x[i], y = c0 * xi + c1 * x1 + c2 * x2 - c3 * y1 - c4 * y2;
    x2 = x1; x1 = xi; y2 = y1; y1 = y; x[i] = y;
  }
  return x;
}
// feedback comb with damping – metallic resonances, tubes, springs
export function comb(x, delay = 0.005, fb = 0.7, damp = 0.3) {
  const d = Math.max(1, Math.round(delay * SR)), line = new Float32Array(d);
  let p = 0, lp = 0;
  for (let i = 0; i < x.length; i++) {
    const o = line[p];
    lp = o * (1 - damp) + lp * damp;
    line[p] = x[i] + lp * fb;
    x[i] = x[i] + o;
    p = (p + 1) % d;
  }
  return x;
}
// simple feed-forward echo baked into a sample (slapback, UI chirps)
export function echo(x, delay = 0.08, fb = 0.35, taps = 3) {
  const d = len(delay), out = new Float32Array(x.length + d * taps);
  out.set(x);
  let g = 1;
  for (let t = 1; t <= taps; t++) { g *= fb; mix(out, x, g, (d * t) / SR); }
  return out;
}

// ---------------------------------------------------------------- utilities
export function mix(dst, src, g = 1, at = 0) {
  const o = Math.round(at * SR), n = Math.min(src.length, dst.length - o);
  for (let i = Math.max(0, -o); i < n; i++) dst[i + o] += src[i] * g;
  return dst;
}
export function gain(x, g) { for (let i = 0; i < x.length; i++) x[i] *= g; return x; }
export function peak(x) { let m = 0; for (let i = 0; i < x.length; i++) { const a = Math.abs(x[i]); if (a > m) m = a; } return m; }
export function rms(x) { let s = 0; for (let i = 0; i < x.length; i++) s += x[i] * x[i]; return Math.sqrt(s / Math.max(1, x.length)); }
export function norm(x, p = 0.9) { const m = peak(x); if (m > 1e-9) gain(x, p / m); return x; }
// normalise a component to unit peak then mix – makes layer gains predictable
export function layer(dst, src, g = 1, at = 0) { return mix(dst, norm(src, 1), g, at); }
export function drive(x, k = 2) { const t = Math.tanh(k); for (let i = 0; i < x.length; i++) x[i] = Math.tanh(x[i] * k) / t; return x; }
export function crush(x, bits = 8) { const q = Math.pow(2, bits - 1); for (let i = 0; i < x.length; i++) x[i] = Math.round(x[i] * q) / q; return x; }
export function decim(x, hold = 2) { for (let i = 0; i < x.length; i++) { const r = i % hold; if (r) x[i] = x[i - r]; } return x; }
export function reverse(x) { return x.reverse(); }
export function mul(x, y) { const n = Math.min(x.length, y.length); for (let i = 0; i < n; i++) x[i] *= y[i]; return x; }
export function hp1(x, f = 30) {     // one-pole DC / rumble blocker
  const a = Math.exp(-TAU * f / SR); let px = 0, py = 0;
  for (let i = 0; i < x.length; i++) { const y = a * (py + x[i] - px); px = x[i]; py = y; x[i] = y; }
  return x;
}
export function concat(...parts) {
  const n = parts.reduce((s, p) => s + p.length, 0), out = new Float32Array(n);
  let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
// trim trailing near-silence
export function trim(x, th = 0.0004) {
  let e = x.length; while (e > 1 && Math.abs(x[e - 1]) < th) e--;
  return e < x.length ? x.slice(0, Math.min(x.length, e + 64)) : x;
}
// Make a buffer loop seamlessly: crossfade the last `xf` seconds into the head.
export function seamless(x, xf = 0.25) {
  const n = Math.min(len(xf), Math.floor(x.length / 3)), L = x.length - n, out = x.slice(0, L);
  for (let i = 0; i < n; i++) {
    const t = i / n, a = Math.sin(t * Math.PI / 2), b = Math.cos(t * Math.PI / 2);
    out[i] = x[i] * a + x[L + i] * b;
  }
  return out;
}
// Sustain-loop crossfade for instrument samples: blend [ls-xf, ls) into [le-xf, le).
export function loopXfade(x, ls, le, xf) {
  const s = Math.round(ls * SR), e = Math.round(le * SR), n = Math.min(Math.round(xf * SR), s);
  for (let i = 0; i < n; i++) {
    const t = i / n, a = Math.cos(t * Math.PI / 2), b = Math.sin(t * Math.PI / 2);
    x[e - n + i] = x[e - n + i] * a + x[s - n + i] * b;
  }
  return x;
}
// Final "SNES" polish: drive, optional rate reduction + bit crush, normalise, safety fade.
export function snes(x, o = {}) {
  const { drv = 0, hold = 1, bits = 0, p = 0.9, fade = 0.01, dc = true } = o;
  if (dc) hp1(x, 25);
  if (drv) drive(x, drv);
  if (hold > 1) decim(x, hold);
  norm(x, 1);
  if (bits) crush(x, bits);
  norm(x, p);
  if (fade) fadeOut(x, fade);
  for (let i = 0; i < x.length; i++) x[i] = x[i] > 0.999 ? 0.999 : x[i] < -0.999 ? -0.999 : x[i];
  return x;
}

// Stereo impulse response for the music convolver (generated, dark, diffuse).
export function impulse(sr, sec = 2.4, decay = 3, R = Math.random) {
  const n = Math.round(sr * sec), L = new Float32Array(n), Rr = new Float32Array(n);
  let l1 = 0, l2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / n, e = Math.pow(1 - t, decay) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
    const damp = 0.15 + 0.8 * t;            // darker as it decays
    l1 = l1 * damp + (R() * 2 - 1) * (1 - damp);
    l2 = l2 * damp + (R() * 2 - 1) * (1 - damp);
    L[i] = l1 * e; Rr[i] = l2 * e;
  }
  return [L, Rr];
}
