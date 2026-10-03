// ARK machine sounds. Each machine has its own audio fingerprint (a distinct state-dependent sound
// and alert, so players can tell what is coming by ear): loops for movement/idle, a detection
// alert, telegraph/wind-up cues and attack sounds. Metallic FM + crunchy square = the shared
// "ARK voice"; everything is original synthesis.
import { SR, buf, noise, osc, fm, metal, unison, ad, env, filt, filtFn, layer, mix, snes, am, seamless, comb, echo } from './dsp.js';
import { def, gunshot, explosion, click, clack, whoosh, thump, ping, rotor, sparks, servo, N } from './sfx_lib.js';

const LOOP = { loop: true, v: 1, pj: 0, vol: 0.55, dist: 50, max: 6 };
const ALERT = { vol: 0.75, dist: 60, max: 2, prio: 4, v: 2, pj: 0.01 };

// ------------------------------------------------------------------ shared ARK voice
// FM + half-pitch crunchy square + metal tick: one "stab" of the machine language
function stab(R, f, d = 0.3, o = {}) {
  const { index = 3, fb = 0.4, sq = 0.3, f1 = f } = o;
  const x = buf(d + 0.05);
  const s = fm(d, { f, f1, ratio: 1, index, index1: index * 0.35, fb }); ad(s, 0.002, d, d * 0.2); layer(x, s, 0.55);
  const q = osc(d, { wave: 'rawsq', f: f / 2, f1: f1 / 2, pw: 0.25 }); ad(q, 0.002, d * 0.9, d * 0.1); layer(x, q, sq);
  layer(x, metal(0.06, f * 0.5, R), 0.12);
  return x;
}
function seq(R, notes, o = {}) {        // [[hz, dur, gain, f1]] sequence of stabs
  const total = notes.reduce((s, n) => s + n[1], 0) + 0.3, out = buf(total);
  let t = 0;
  for (const [f, d, g = 1, f1] of notes) { if (f) mix(out, stab(R, f, d * 1.1, { ...o, f1: f1 || f }), g, t); t += d; }
  return out;
}
// metallic grinding scream (Bastion screech, Leaper call)
function screech(R, d, f0, f1, o = {}) {
  const { vib = 0.03, vibHz = 17, ratio = 1.41, index = 4, noiseG = 0.35, drv = 2.2 } = o;
  const out = buf(d);
  const s = fm(d, { f: f0, f1, ratio, index, index1: index * 0.7, vib, vibHz }); env(s, [[0, 0], [d * 0.12, 1], [d * 0.8, 0.85], [d, 0]]); layer(out, s, 0.7);
  const n = noise(d, 'crunch', R, 2); filtFn(n, 'bp', (t) => f0 + (f1 - f0) * t / d, 4); env(n, [[0, 0], [d * 0.1, 1], [d, 0]]); layer(out, n, noiseG);
  return snes(out, { drv, bits: 7, p: 0.9 });
}
// hydraulic hiss with pressure flutter
function hydraulic(R, d, f = 2600, rise = false) {
  const x = noise(d, 'white', R); filt(x, 'bp', f, rise ? f * 1.6 : f * 0.7, 1.3); am(x, 23, 0.25);
  env(x, rise ? [[0, 0], [d * 0.85, 1], [d, 0]] : [[0, 0], [0.02, 1], [d, 0]]); return x;
}
function beepAt(out, f, t, d = 0.06, g = 0.5, pw = 0.5) {
  const b = osc(d, { wave: 'rawsq', f, pw }); ad(b, 0.001, d, d * 0.5); mix(out, b, g, t);
}

export const ARKS = {
  // ================================================================ drones
  // Wasp: small four-thruster drone – high-pitched mechanical whine, turbulent jet hiss, motor buzz
  wazp_loop: def((R) => {
    const d = 2.4, out = buf(d);
    for (const f of [304, 311, 298, 317]) {
      const s = osc(d, { wave: 'saw', f: f * R.j(0.005), vib: 0.006, vibHz: R.r(2, 4) }); filt(s, 'bp', 1800, 1800, 1.6); layer(out, s, 0.22);
    }
    const h = noise(d, 'white', R); filt(h, 'hp', 2600); am(h, 23, 0.4); layer(out, h, 0.3);
    const b = noise(d, 'white', R); filt(b, 'bp', 700, 700, 1); am(b, 145, 0.7, 2); layer(out, b, 0.35);
    return snes(seamless(out, 0.35), { bits: 8, fade: 0, p: 0.72 });
  }, LOOP),
  // Hornet: rhythmic mechanical thrum you feel in the chest – low sub pulse + heavier whine
  hornit_loop: def((R) => {
    const d = 2.4, out = buf(d);
    const sub = osc(d, { f: 42 }); mix(sub, osc(d, { wave: 'tri', f: 84 }), 0.5); am(sub, 7.5, 0.8, 2); layer(out, sub, 0.8);
    const w = osc(d, { wave: 'saw', f: 210, vib: 0.008, vibHz: 3 }); filt(w, 'bp', 900, 900, 2); layer(out, w, 0.35);
    const air = noise(d, 'white', R); filt(air, 'lp', 900); am(air, 7.5, 0.6, 2); layer(out, air, 0.4);
    const g = metal(d, 210, R); filt(g, 'bp', 1600, 1600, 3); am(g, 30, 0.6); layer(out, g, 0.12);
    return snes(seamless(out, 0.35), { drv: 1.4, bits: 8, fade: 0, p: 0.8 });
  }, { ...LOOP, vol: 0.65, dist: 60 }),
  wazp_alert: def((R) => {          // thrusters spike into a screeching whine + two chirps
    const out = buf(0.8);
    const w = osc(0.5, { wave: 'saw', f: 300, f1: 900, sweep: 0.3 }); filt(w, 'bp', 2200, 2200, 1.5); env(w, [[0, 0], [0.05, 1], [0.5, 0]]); layer(out, w, 0.5);
    layer(out, seq(R, [[N('E6'), 0.07], [N('B6'), 0.12]]), 0.6, 0.15);
    return snes(echo(out, 0.1, 0.25, 1), { bits: 7, p: 0.78 });
  }, ALERT),
  wazp_whine: def((R) => {          // wind-up before a burst: thrusters whine upward
    const d = 0.6, out = buf(d);
    const w = unison(d, 'saw', 300, [-10, 12], { f1: 760, sweep: 0.5 }); filt(w, 'bp', 2000, 2000, 1.4); env(w, [[0, 0], [0.08, 0.6], [d - 0.05, 1], [d, 0]]); layer(out, w, 0.7);
    const h = noise(d, 'white', R); filt(h, 'hp', 3000); env(h, [[0, 0], [d, 1]]); layer(out, h, 0.2);
    return snes(out, { bits: 8, p: 0.6 });
  }, { vol: 0.55, dist: 45, max: 3, prio: 2 }),
  wazp_shot: def((R) => {           // twin light guns: small electric pops
    const x = gunshot(R, { dur: 0.2, crackF: 3600, crackDec: 0.02, bodyF: 1500, bodyDec: 0.04, thumpF: 170, thumpF1: 90, thumpDec: 0.04, thumpG: 0.4, tailG: 0, bits: 7, hold: 2 });
    beepAt(x, 1250 * R.j(0.05), 0, 0.03, 0.25, 0.25); return snes(x, { dc: false, p: 0.8 });
  }, { vol: 0.62, dist: 70, max: 8, prio: 3, pj: 0.05 }),
  hornit_alert: def((R) => {        // thrum swells, crackle, low descending call
    const out = buf(1.0);
    const sub = osc(0.8, { f: 60, f1: 40 }); am(sub, 10, 0.7); env(sub, [[0, 0], [0.15, 1], [0.8, 0]]); layer(out, sub, 0.6);
    layer(out, seq(R, [[N('A4'), 0.16], [N('E4'), 0.3]], { index: 4 }), 0.7, 0.05);
    layer(out, sparks(R, 0.5, 10), 0.25, 0.05);
    return snes(out, { drv: 1.8, bits: 7, p: 0.82 });
  }, ALERT),
  hornit_lock: def((R) => {         // short lock-on: rising electric charge
    const d = 0.85, out = buf(d);
    const c = fm(d, { f: 200, f1: 1300, ratio: 2.1, index: 3, index1: 1 }); am(c, 24, 0.5); env(c, [[0, 0], [0.1, 0.5], [d - 0.04, 1], [d, 0]]); layer(out, c, 0.6);
    layer(out, sparks(R, d, 12), 0.2);
    return snes(out, { bits: 7, p: 0.65 });
  }, { vol: 0.6, dist: 45, max: 3, prio: 3 }),
  hornit_zap: def((R) => {          // electrified stun round
    const out = buf(0.55);
    const z = fm(0.3, { f: 1500, f1: 400, ratio: 2.1, index: 6, index1: 1 }); am(z, 70, 0.7); ad(z, 0.002, 0.28); layer(out, z, 0.7);
    layer(out, sparks(R, 0.45, 22), 0.5);
    const p = noise(0.3, 'white', R); filt(p, 'bp', 2400, 900, 2); env(p, [[0, 0], [0.03, 1], [0.3, 0]]); layer(out, p, 0.35, 0.05);
    return snes(out, { drv: 1.6, bits: 7, p: 0.85 });
  }, { vol: 0.75, dist: 60, max: 4, prio: 3 }),
  fyrefly_shot: def((R) => {        // flame-drone burst
    const out = buf(0.4);
    const f = noise(0.4, 'white', R); filt(f, 'lp', 1500, 600, 1); env(f, [[0, 0], [0.03, 1], [0.25, 0.6], [0.4, 0]]); layer(out, f, 0.8);
    const c = noise(0.3, 'crunch', R, 2); filt(c, 'hp', 3500); am(c, 31, 0.7, 3); ad(c, 0.01, 0.25); layer(out, c, 0.3);
    return snes(out, { bits: 8, p: 0.7 });
  }, { vol: 0.6, dist: 40, max: 6, prio: 2 }),
  // Snitch: scanner drone – soft hover with a periodic scan chirp; on detection it makes a series of
  // three escalating calls (backup only arrives after the third), then a siren-like alarm
  snytch_loop: def((R) => {
    const d = 2, out = rotor(R, d + 0.3, 120, 360, { body: 1400, whineG: 0.3, chopDepth: 0.5, lowG: 0.2 });
    for (const t of [0.5, 1.5]) { const sc = osc(0.25, { f: 1400, f1: 2100 }); env(sc, [[0, 0], [0.03, 1], [0.25, 0]]); layer(out, sc, 0.12, t); }
    return snes(seamless(out, 0.3), { bits: 8, fade: 0, p: 0.6 });
  }, { ...LOOP, vol: 0.45, dist: 45 }),
  snytch_call: def((R) => {
    const out = buf(2.7);
    for (let k = 0; k < 3; k++) {
      const t = k * 0.82, f0 = 520 + k * 120, d = 0.55 + k * 0.08;
      const w = osc(d, { wave: 'rawsq', pw: 0.4, f: f0, f1: f0 * 2.4, sweep: d * 0.8 }); filt(w, 'lp', 4000); env(w, [[0, 0], [0.04, 1], [d * 0.8, 0.9], [d, 0]]);
      mix(out, w, 0.35 + k * 0.08, t);
      const s = osc(d, { wave: 'saw', f: f0 * 1.5, f1: f0 * 3.6, sweep: d * 0.8 }); filt(s, 'bp', 2500, 2500, 1.5); env(s, [[0, 0], [0.04, 1], [d, 0]]);
      mix(out, s, 0.2, t);
    }
    return snes(echo(out, 0.14, 0.3, 2), { bits: 7, p: 0.85 });
  }, { vol: 0.75, dist: 80, max: 2, prio: 4, v: 1, pj: 0 }),
  snytch_alarm: def((R) => {        // the reinforcement siren
    const d = 2.2, out = buf(d);
    const fn = (t) => 900 + 420 * Math.sin(2 * Math.PI * 2.2 * t - Math.PI / 2);
    const s = osc(d, { wave: 'rawsq', pw: 0.4, fn }); filt(s, 'lp', 3600); env(s, [[0, 0], [0.03, 1], [d - 0.12, 1], [d, 0]]); layer(out, s, 0.6);
    const t2 = osc(d, { wave: 'saw', fn: (t) => fn(t) * 0.5 }); filt(t2, 'lp', 1800); env(t2, [[0, 0], [0.03, 1], [d - 0.12, 1], [d, 0]]); layer(out, t2, 0.3);
    return snes(echo(out, 0.18, 0.3, 2), { bits: 7, p: 0.82 });
  }, { vol: 0.7, dist: 90, max: 2, prio: 4, v: 1, pj: 0 }),
  // Spotter: high-pitched mechanical whirring + constant beeping while it paints a target
  spottr_loop: def((R) => {
    const d = 2, out = buf(d + 0.2);
    const w = osc(d + 0.2, { wave: 'saw', f: 1180, vib: 0.01, vibHz: 6 }); filt(w, 'bp', 2400, 2400, 2); layer(out, w, 0.35);
    const h = noise(d + 0.2, 'white', R); filt(h, 'hp', 3000); am(h, 40, 0.5); layer(out, h, 0.15);
    for (let t = 0; t < d + 0.15; t += 0.25) beepAt(out, 2600, t, 0.045, 0.3);
    return snes(seamless(out, 0.2), { bits: 8, fade: 0, p: 0.6 });
  }, { ...LOOP, vol: 0.45, dist: 50 }),

  // ================================================================ small ground ARKs
  // Tick: six legs scuttling – quick tripod tap groups, tiny servo chirps
  tikk_skitter: def((R) => {
    const out = buf(0.6);
    for (let t = 0; t < 0.5; t += R.r(0.06, 0.09)) for (let k = 0; k < 3; k++) mix(out, click(R, R.r(2800, 4600), 0.01, 4), R.r(0.4, 0.9), t + k * 0.017);
    for (let k = 0; k < 2; k++) { const c = osc(0.04, { wave: 'sq', pw: 0.3, f: R.r(2200, 2800), f1: R.r(3000, 3600) }); ad(c, 0.001, 0.04); mix(out, c, 0.18, R() * 0.45); }
    layer(out, servo(R, 1100, 0.5, 1.2), 0.12);
    return snes(out, { bits: 8, p: 0.6 });
  }, { vol: 0.55, dist: 25, max: 6, pj: 0.08, prio: 1 }),
  tikk_alert: def((R) => {          // robotic chirp trill
    const out = buf(0.5);
    [2000, 2600, 3400].forEach((f, i) => { const c = fm(0.07, { f, f1: f * 1.2, ratio: 2, index: 1.5 }); ad(c, 0.001, 0.07); mix(out, c, 0.5, i * 0.06); });
    for (let k = 0; k < 4; k++) mix(out, click(R, 3800, 0.01, 4), 0.4, 0.2 + k * 0.03);
    return snes(echo(out, 0.07, 0.25, 1), { bits: 7, p: 0.65 });
  }, { ...ALERT, vol: 0.6, dist: 35 }),
  tikk_leap: def((R) => {           // spring launch + high-pitched shriek in the air
    const out = buf(0.6);
    layer(out, click(R, 2500, 0.03), 0.6);
    const sp = osc(0.12, { wave: 'tri', f: 180, f1: 600 }); ad(sp, 0.002, 0.11); layer(out, sp, 0.4);
    const sh = fm(0.38, { f: 1800, f1: 4200, ratio: 1.5, index: 3, vib: 0.04, vibHz: 30 }); env(sh, [[0, 0], [0.04, 1], [0.3, 0.8], [0.38, 0]]); layer(out, sh, 0.5, 0.03);
    for (let k = 0; k < 3; k++) layer(out, click(R, 3500, 0.01, 4), 0.35, 0.42 + k * 0.02);
    return snes(out, { bits: 7, p: 0.72 });
  }, { vol: 0.68, dist: 28, max: 4 }),
  // Pop: rhythmic beep that speeds up as it closes in; beeps blur into a constant tone ~1 s before it blows
  popp_beep: def((R) => {
    const out = buf(0.12); beepAt(out, 2200, 0, 0.075, 1); return snes(out, { bits: 8, p: 0.5 });
  }, { vol: 0.8, dist: 40, max: 6, pj: 0, prio: 3 }),   // a danger cue: carries further than most ARK sounds
  popp_fuse: def((R) => {
    const out = buf(1.3);
    let t = 0, gap = 0.17, f = 2200;
    while (t < 0.85) { beepAt(out, f, t, 0.05, 0.55); t += gap; gap = Math.max(0.035, gap * 0.78); f *= 1.012; }
    const tone = osc(0.38, { wave: 'rawsq', f: f * 1.02 }); env(tone, [[0, 0], [0.01, 1], [0.36, 1], [0.38, 0]]); mix(out, tone, 0.5, 0.88);
    return snes(out, { bits: 8, p: 0.6 });
  }, { vol: 0.7, dist: 35, max: 3, pj: 0, prio: 4, v: 1 }),
  popp_alert: def((R) => {          // spin-up + double beep
    const out = buf(0.6);
    const w = osc(0.35, { wave: 'saw', f: 200, f1: 900 }); filt(w, 'bp', 1600, 1600, 2); env(w, [[0, 0], [0.05, 1], [0.35, 0]]); layer(out, w, 0.4);
    beepAt(out, 2200, 0.32, 0.06, 0.6); beepAt(out, 2200, 0.44, 0.06, 0.6);
    return snes(out, { bits: 8, p: 0.6 });
  }, { ...ALERT, vol: 0.6, dist: 35 }),
  popp_roll_loop: def((R) => {      // rolling shell: rumble, seam clacks, gravel
    const d = 2, out = buf(d + 0.25);
    const r = noise(d + 0.25, 'brown', R); filt(r, 'lp', 420); am(r, 6, 0.5); layer(out, r, 0.8);
    for (let t = 0; t < d + 0.2; t += 1 / 6) mix(out, clack(R, R.r(700, 1000), 0.05), 0.3, t + R() * 0.01);
    for (let k = 0; k < 40; k++) mix(out, click(R, R.r(2000, 5000), 0.006, 2), R.r(0.05, 0.2), R() * d);
    const w = osc(d + 0.25, { wave: 'sq', pw: 0.3, f: 300, vib: 0.02, vibHz: 3 }); filt(w, 'bp', 900, 900, 3); layer(out, w, 0.15);
    return snes(seamless(out, 0.25), { bits: 8, fade: 0, p: 0.7 });
  }, { ...LOOP, vol: 0.6, dist: 34 }),
  // Fireball: armoured roller – opens its front panel, then ignites the burner
  fyreball_alert: def((R) => {
    const out = buf(0.9);
    layer(out, seq(R, [[N('D4'), 0.18], [N('A3'), 0.35]], { index: 4, fb: 0.6 }), 0.7);
    const h = noise(0.6, 'white', R); filt(h, 'bp', 2400, 1500, 1.3); env(h, [[0, 0], [0.05, 1], [0.6, 0]]); layer(out, h, 0.25, 0.2);
    return snes(out, { drv: 2, bits: 7, p: 0.8 });
  }, ALERT),
  fyreball_ignite: def((R) => {
    const out = buf(0.9);
    layer(out, servo(R, 260, 0.25, 1.5), 0.35);
    layer(out, clack(R, 1100, 0.06), 0.6, 0.2); layer(out, clack(R, 1400, 0.05), 0.5, 0.27);
    const f = noise(0.5, 'white', R); filt(f, 'lp', 2600, 500, 1, 0.3); env(f, [[0, 0], [0.02, 1], [0.5, 0]]); layer(out, f, 0.9, 0.33);
    layer(out, thump(R, 110, 45, 0.25, 0.08), 0.7, 0.33);
    return snes(out, { drv: 1.8, bits: 8, p: 0.85 });
  }, { vol: 0.75, dist: 40, max: 3, prio: 3 }),
  fyreball_flame_loop: def((R) => { // burner roar, jet hiss, crackle
    const d = 2.5, out = buf(d + 0.3);
    const roar = noise(d + 0.3, 'white', R); filt(roar, 'lp', 1300); am(roar, 11, 0.35); layer(out, roar, 0.8);
    const low = noise(d + 0.3, 'brown', R); filt(low, 'lp', 260); layer(out, low, 0.7);
    const hiss = noise(d + 0.3, 'white', R); filt(hiss, 'hp', 4500); am(hiss, 17, 0.5); layer(out, hiss, 0.25);
    for (let k = 0; k < 40; k++) mix(out, click(R, R.r(900, 4000), R.r(0.004, 0.02), 2), R.r(0.1, 0.4), R() * (d + 0.25));
    return snes(seamless(out, 0.3), { drv: 1.6, bits: 8, fade: 0, p: 0.8 });
  }, { ...LOOP, vol: 0.65, dist: 35 }),
  // Surveyor: big armoured roller – mechanical whirring + rhythmic pinging; beams data into the sky
  surveyr_loop: def((R) => {
    const d = 2, out = buf(d + 0.3);
    const lo = osc(d + 0.3, { wave: 'saw', f: 90 }); filt(lo, 'lp', 400); am(lo, 3, 0.4); layer(out, lo, 0.5);
    const wh = noise(d + 0.3, 'white', R); filt(wh, 'bp', 700, 700, 3); am(wh, 12, 0.6); layer(out, wh, 0.35);
    for (const t of [0.2, 1.2]) { const p = fm(0.6, { f: 1760, ratio: 2, index: 0.8, index1: 0 }); ad(p, 0.001, 0.55); mix(out, p, 0.25, t); mix(out, p, 0.08, t + 0.18); }
    return snes(seamless(out, 0.3), { bits: 8, fade: 0, p: 0.65 });
  }, { ...LOOP, vol: 0.5, dist: 55 }),
  surveyr_scan: def((R) => {        // data beam: rising shimmer + data chirps + pings
    const d = 2.2, out = buf(d);
    const b = fm(d, { f: 400, f1: 1600, ratio: 1.5, index: 1.5, vib: 0.01, vibHz: 7 }); env(b, [[0, 0], [0.2, 0.7], [d - 0.2, 1], [d, 0]]); layer(out, b, 0.4);
    for (let k = 0; k < 16; k++) beepAt(out, R.pick([1760, 2093, 2637, 3136]), 0.15 + R() * (d - 0.3), 0.025, 0.12, 0.25);
    for (const t of [0, 0.5, 1.0, 1.5]) { const p = fm(0.4, { f: 1760, ratio: 2, index: 1, index1: 0 }); ad(p, 0.001, 0.4); mix(out, p, 0.3, t); }
    return snes(echo(out, 0.2, 0.3, 2).subarray(0, d * SR), { bits: 8, p: 0.65 });
  }, { vol: 0.6, dist: 70, max: 2, v: 1 }),
  surveyr_alert: def((R) => {       // startled: descending pings and a whir spinning up to flee
    const out = buf(0.9);
    [2637, 2093, 1760, 1319].forEach((f, i) => { const p = fm(0.15, { f, ratio: 2, index: 1 }); ad(p, 0.001, 0.14); mix(out, p, 0.4, i * 0.08); });
    const w = osc(0.6, { wave: 'saw', f: 90, f1: 300 }); filt(w, 'lp', 900); env(w, [[0, 0], [0.1, 1], [0.6, 0]]); layer(out, w, 0.4, 0.25);
    return snes(out, { bits: 8, p: 0.7 });
  }, ALERT),

  // ================================================================ fixed emplacements
  // Turret: scans, then a lock tone, spin-up and short mechanical bursts
  turret_lock: def((R) => {
    const out = buf(0.4); [1500, 1900, 2400].forEach((f, i) => beepAt(out, f, i * 0.07, 0.05, 0.5, 0.25));
    layer(out, click(R, 2400, 0.02), 0.4, 0.24); return snes(out, { bits: 8, p: 0.65 });
  }, { ...ALERT, vol: 0.65 }),
  turret_spin: def((R) => {
    const d = 0.6, out = buf(d);
    const s = osc(d, { wave: 'saw', f: 60, f1: 460, sweep: 0.5 }); filt(s, 'lp', 2200); env(s, [[0, 0], [0.04, 1], [d - 0.04, 1], [d, 0]]); layer(out, s, 0.5);
    let t = 0, dt = 0.06; while (t < d - 0.05) { mix(out, click(R, 2600, 0.01, 3), 0.25, t); t += dt; dt = Math.max(0.016, dt * 0.85); }
    return snes(out, { bits: 8, p: 0.65 });
  }, { vol: 0.62, dist: 45, max: 2 }),
  turret_shot: def((R) => {
    const x = gunshot(R, { dur: 0.28, crackF: 2900, crackDec: 0.03, bodyF: 1100, bodyDec: 0.06, thumpF: 130, thumpF1: 60, thumpDec: 0.06, thumpG: 0.6, tailDec: 0.2, tailG: 0.15, bits: 7, hold: 2 });
    const r = fm(0.12, { f: 1500, ratio: 2.76, index: 2, index1: 0.2 }); ad(r, 0.001, 0.1); mix(x, r, 0.12);
    return snes(x, { dc: false, p: 0.82 });
  }, { vol: 0.68, dist: 80, max: 8, prio: 3, pj: 0.04 }),
  // Sentinel: the targeting laser turns red with an alarm, several beams converge, then it fires
  sentinal_lock: def((R) => {
    const out = buf(0.8);
    for (let k = 0; k < 6; k++) beepAt(out, k % 2 ? 1050 : 1400, k * 0.09, 0.08, 0.45, 0.4);
    layer(out, click(R, 3000, 0.02), 0.4, 0.55);
    return snes(echo(out, 0.12, 0.25, 1), { bits: 7, p: 0.75 });
  }, { ...ALERT, dist: 90 }),
  sentinal_charge: def((R) => {     // four detuned tones converging to unison (= beams converging)
    const d = 2.2, out = buf(d);
    [-1, -0.4, 0.45, 1].forEach((k) => {
      const s = osc(d, { wave: 'saw', fn: (t) => (420 + 520 * t / d) * (1 + 0.06 * k * (1 - t / d)) }); filt(s, 'lp', 3500);
      env(s, [[0, 0], [0.2, 0.5], [d - 0.04, 1], [d, 0]]); layer(out, s, 0.2);
    });
    const tr = noise(d, 'crunch', R, 2); filt(tr, 'bp', 3000, 5000, 2);
    for (let i = 0; i < tr.length; i++) { const t = i / SR; tr[i] *= 0.5 + 0.5 * Math.sin(2 * Math.PI * (4 * t + 6 * t * t)); }
    env(tr, [[0, 0], [d, 1]]); layer(out, tr, 0.18);
    return snes(out, { bits: 7, p: 0.78 });
  }, { vol: 0.75, dist: 90, max: 2, prio: 4, pj: 0, v: 1 }),
  sentinal_shot: def((R) => {       // laser crack + heavy hit + sizzling tail
    const out = buf(1.4);
    const z = fm(0.5, { f: 3600, f1: 140, sweep: 0.35, ratio: 0.5, index: 6, index1: 0.6 }); ad(z, 0.0008, 0.45); layer(out, z, 0.9);
    const n = noise(0.18, 'crunch', R, 1); filt(n, 'hp', 1800); ad(n, 0.0004, 0.12); layer(out, n, 0.9);
    layer(out, thump(R, 85, 32, 0.4, 0.1), 0.9);
    const sz = noise(0.9, 'crunch', R, 2); filt(sz, 'bp', 4200, 2200, 1.3); am(sz, 41, 0.8, 3); ad(sz, 0.01, 0.8); layer(out, sz, 0.25, 0.04);
    const tl = noise(1.2, 'brown', R); filt(tl, 'lp', 600); ad(tl, 0.01, 1.1); layer(out, tl, 0.3, 0.02);
    return snes(echo(out, 0.27, 0.3, 1).subarray(0, 1.4 * SR), { drv: 2.2, bits: 7, p: 0.95 });
  }, { vol: 0.95, dist: 140, max: 3, prio: 4 }),

  // ================================================================ flyers with ordnance
  // Rocketeer: twin jets; its own unmistakable alert – a wailing mechanical horn ("waah-ooo-WAAH")
  rocketier_loop: def((R) => {
    const d = 2.2, out = buf(d + 0.3);
    const j = noise(d + 0.3, 'white', R); filt(j, 'bp', 850, 850, 0.8); am(j, 30, 0.25); layer(out, j, 0.8);
    const l = noise(d + 0.3, 'brown', R); filt(l, 'lp', 260); am(l, 3.5, 0.3); layer(out, l, 0.8);
    const w = unison(d + 0.3, 'saw', 880, [-8, 9], { vib: 0.006, vibHz: 4 }); filt(w, 'lp', 2600); layer(out, w, 0.14);
    return snes(seamless(out, 0.3), { drv: 1.5, bits: 8, fade: 0, p: 0.8 });
  }, { ...LOOP, vol: 0.62, dist: 75 }),
  rocketier_alert: def((R) => {
    const d = 1.3, out = buf(d);
    const fn = (t) => (t < 0.35 ? 330 - 90 * (t / 0.35) : 240 + 160 * Math.min(1, (t - 0.35) / 0.6));
    const src = unison(d, 'saw', 1, [-14, 0, 13], { fn }); mix(src, osc(d, { wave: 'rawsq', pw: 0.3, fn: (t) => fn(t) / 2 }), 0.5);
    filtFn(src, 'bp', (t) => (t < 0.35 ? 1100 - 500 * t / 0.35 : 600 + 900 * Math.min(1, (t - 0.35) / 0.6)), 2.2);
    env(src, [[0, 0], [0.04, 1], [0.32, 0.6], [0.4, 0.9], [d - 0.15, 1], [d, 0]]);
    layer(out, src, 1);
    return snes(echo(out, 0.2, 0.3, 2).subarray(0, d * SR), { drv: 2.4, bits: 7, p: 0.85 });
  }, { ...ALERT, dist: 90 }),
  vaporiser_alert: def((R) => {     // deliberately distinct from the Rocketeer: glassy rising cluster + hum
    const out = buf(1.0);
    [880, 1175, 1568, 2093].forEach((f, i) => { const c = fm(0.5, { f, ratio: 3.5, index: 2, index1: 0.2 }); ad(c, 0.002, 0.45); mix(out, c, 0.3, i * 0.07); });
    const h = osc(0.9, { wave: 'saw', f: 70, f1: 110 }); filt(h, 'lp', 500); env(h, [[0, 0], [0.2, 1], [0.9, 0]]); layer(out, h, 0.4);
    return snes(echo(out, 0.15, 0.3, 1), { bits: 7, p: 0.8 });
  }, ALERT),
  rocketier_lock: def((R) => {      // pods converging: accelerating rising lock beeps
    const out = buf(1.6);
    let t = 0, gap = 0.22, f = 1200;
    while (t < 1.45) { beepAt(out, f, t, 0.05, 0.45, 0.3); t += gap; gap = Math.max(0.05, gap * 0.85); f *= 1.04; }
    return snes(out, { bits: 8, p: 0.65 });
  }, { vol: 0.62, dist: 70, max: 2, pj: 0, v: 1, prio: 3 }),
  rocket_launch: def((R) => {       // pod clunk, ignition crack, whoosh away
    const out = buf(1.4);
    layer(out, clack(R, 700, 0.08), 0.5);
    layer(out, thump(R, 110, 45, 0.25, 0.06), 0.8, 0.02);
    const ig = noise(0.1, 'crunch', R, 2); filt(ig, 'lp', 4000); ad(ig, 0.001, 0.08); layer(out, ig, 0.8, 0.02);
    layer(out, whoosh(R, 1.2, 500, 2600, 0.9), 0.8, 0.05);
    const h = noise(1.3, 'white', R); filt(h, 'hp', 3000); env(h, [[0, 0], [0.05, 1], [1.3, 0]]); layer(out, h, 0.3, 0.02);
    return snes(out, { drv: 1.8, bits: 8, p: 0.9 });
  }, { vol: 0.85, dist: 100, max: 4, prio: 3 }),

  // ================================================================ walkers
  // shared idle hum for big walkers: transformer buzz, servo ticks, hydraulic "breathing"
  ark_hum_loop: def((R) => {
    const d = 4, out = buf(d + 0.4);
    const h = osc(d + 0.4, { wave: 'saw', f: 50 }); filt(h, 'lp', 320); layer(out, h, 0.5);
    const h2 = osc(d + 0.4, { f: 150 }); am(h2, 0.5, 0.5); layer(out, h2, 0.18);
    const br = noise(d + 0.4, 'white', R); filt(br, 'bp', 1800, 1800, 1); am(br, 0.5, 0.95, 3); layer(out, br, 0.2);
    for (let k = 0; k < 7; k++) mix(out, click(R, R.r(1500, 3000), 0.01, 3), R.r(0.1, 0.3), R() * d);
    return snes(seamless(out, 0.4), { bits: 8, fade: 0, p: 0.6 });
  }, { ...LOOP, vol: 0.38, dist: 40 }),
  // Leaper: four-legged brute – hydraulic stomps, pressure build-up before a leap, a high
  // sonic screech that calls other machines, and a shockwave pulse
  leapr_stomp: def((R) => {
    const out = buf(1.4);
    layer(out, thump(R, 52, 22, 0.9, 0.2), 1);
    layer(out, ping(R, 170, 0.9, 2.76, 5), 0.4, 0.005);
    layer(out, clack(R, 600, 0.12), 0.5, 0.01);
    layer(out, hydraulic(R, 0.5, 2400), 0.35, 0.08);
    const d = noise(0.7, 'crunch', R, 3); filt(d, 'lp', 2200, 200, 1); ad(d, 0.002, 0.6); layer(out, d, 0.55);
    for (let k = 0; k < 10; k++) mix(out, click(R, R.r(600, 2000), 0.03, 2), 0.2, 0.05 + R() * 0.7);
    return snes(out, { drv: 2.4, bits: 8, hold: 2, p: 0.97 });
  }, { vol: 1, dist: 90, max: 3, prio: 4, duck: 0.3 }),
  leapr_charge: def((R) => {        // hydraulics pressurising, frame creaking, servos winding
    const d = 0.95, out = buf(d);
    layer(out, hydraulic(R, d, 1800, true), 0.6);
    layer(out, servo(R, 110, d, 2.4), 0.45);
    const cr = osc(0.4, { wave: 'saw', fn: (t) => 160 + 60 * Math.sin(t * 40) }); filt(cr, 'bp', 700, 700, 5); env(cr, [[0, 0], [0.1, 1], [0.4, 0]]); layer(out, cr, 0.25, 0.3);
    return snes(out, { drv: 1.4, bits: 8, p: 0.8 });
  }, { vol: 0.8, dist: 60, max: 2, prio: 3 }),
  leapr_jump: def((R) => {          // release: launch thump + hiss + whoosh
    const out = buf(1.0);
    layer(out, hydraulic(R, 0.4, 2600), 0.6);
    layer(out, thump(R, 80, 35, 0.4, 0.1), 0.85, 0.02);
    layer(out, whoosh(R, 0.6, 250, 1000, 1), 0.45, 0.2);
    layer(out, servo(R, 160, 0.4, 2.2), 0.25);
    return snes(out, { drv: 1.6, bits: 8, p: 0.85 });
  }, { vol: 0.85, dist: 80, max: 3, prio: 3 }),
  leapr_screech: def((R) => screech(R, 1.25, 2100, 2700, { vib: 0.035, vibHz: 18 }), { ...ALERT, dist: 110, vol: 0.62 }),
  leapr_pulse: def((R) => {         // shockwave pulse: boom + electric burst + descending ring
    const out = buf(1.3);
    layer(out, thump(R, 70, 28, 0.6, 0.15), 1);
    const r = fm(0.8, { f: 620, f1: 80, ratio: 1.41, index: 4, index1: 0.5 }); ad(r, 0.002, 0.75); layer(out, r, 0.55);
    layer(out, sparks(R, 0.6, 30), 0.4);
    layer(out, whoosh(R, 0.6, 1800, 300, 0.8), 0.35);
    return snes(out, { drv: 2.2, bits: 7, p: 0.95 });
  }, { vol: 0.95, dist: 80, max: 3, prio: 4, duck: 0.25 }),
  // Bastion: armoured walker – heavy steps, a mechanical screech ~1 s before a 3-second minigun storm
  bastian_step: def((R) => {
    const out = buf(0.95);
    layer(out, thump(R, 62, 26, 0.6, 0.12), 1);
    layer(out, servo(R, 120, 0.35, 1.5), 0.3);
    layer(out, clack(R, 560, 0.15), 0.4, 0.02);
    layer(out, ping(R, 240, 0.5, 2.76, 3), 0.18, 0.01);
    layer(out, hydraulic(R, 0.3, 2200), 0.2, 0.1);
    return snes(out, { drv: 2, bits: 8, p: 0.9 });
  }, { vol: 0.82, dist: 70, max: 4, prio: 3, v: 4, pj: 0.06 }),
  bastian_alert: def((R) => {
    const out = buf(1.2);
    layer(out, seq(R, [[N('C3'), 0.3], [N('G2'), 0.6]], { index: 5, fb: 0.7, sq: 0.45 }), 0.8);
    layer(out, servo(R, 140, 0.5, 1.6), 0.3, 0.3);
    return snes(echo(out, 0.18, 0.3, 1), { drv: 2.4, bits: 7, p: 0.88 });
  }, { ...ALERT, dist: 100 }),
  bastian_screech: def((R) => {
    const d = 1.25, out = buf(d);
    layer(out, screech(R, d, 900, 1500, { vib: 0.02, vibHz: 26, ratio: 2.76, index: 5 }), 0.8);
    const sp = osc(d, { wave: 'saw', f: 70, f1: 620, sweep: d }); filt(sp, 'lp', 2400); env(sp, [[0, 0], [0.1, 0.6], [d - 0.05, 1], [d, 0]]); layer(out, sp, 0.5);
    return snes(out, { drv: 1.8, bits: 7, p: 0.9 });
  }, { vol: 0.7, dist: 110, max: 2, prio: 4, v: 2 }),
  bastian_shot: def((R) => {        // one minigun round with a slice of barrel whine (overlaps into a roar)
    const x = gunshot(R, { dur: 0.22, crackF: 2300, crackDec: 0.025, bodyF: 900, bodyDec: 0.05, thumpF: 110, thumpF1: 50, thumpDec: 0.06, thumpG: 0.9, tailDec: 0.15, tailG: 0.2, drv: 2.6, bits: 8 });
    const w = osc(0.22, { wave: 'saw', f: 600 }); filt(w, 'lp', 2400); env(w, [[0, 0], [0.02, 1], [0.22, 0]]); mix(x, w, 0.08);
    return snes(x, { dc: false, p: 0.9 });
  }, { vol: 0.8, dist: 110, max: 8, prio: 4, pj: 0.03 }),
  bastian_minigun_loop: def((R) => {
    const d = 1.0, rate = 25, out = buf(d + 0.2);
    const shot = () => gunshot(R, { dur: 0.12, crackF: 2400, crackDec: 0.02, bodyF: 900, bodyDec: 0.05, thumpF: 120, thumpF1: 50, thumpDec: 0.05, tailG: 0, bits: 8 });
    const shots = [shot(), shot(), shot()];
    for (let k = 0; k < (d + 0.2) * rate; k++) mix(out, shots[k % 3], R.r(0.65, 1), k / rate);
    const m = osc(d + 0.2, { wave: 'saw', f: 600, vib: 0.01, vibHz: 6 }); filt(m, 'lp', 2400); layer(out, m, 0.18);
    const tl = noise(d + 0.2, 'brown', R); filt(tl, 'lp', 500); layer(out, tl, 0.35);
    return snes(seamless(out, 0.2), { drv: 2.2, bits: 8, fade: 0, p: 0.9 });
  }, { ...LOOP, vol: 0.8, dist: 110, prio: 4 }),
  // Bombardier: artillery walker – hollow mortar thump; the incoming whistle plays at the target
  bombadier_alert: def((R) => {
    const out = buf(1.4);
    layer(out, seq(R, [[N('F2'), 0.5], [N('C3'), 0.7]], { index: 4, fb: 0.8, sq: 0.5 }), 0.8);
    layer(out, clack(R, 500, 0.12), 0.4, 0.5); layer(out, clack(R, 500, 0.12), 0.4, 0.75);
    return snes(echo(out, 0.25, 0.3, 1), { drv: 2.2, bits: 7, p: 0.88 });
  }, { ...ALERT, dist: 120 }),
  bombadier_mortar: def((R) => {
    const out = buf(1.6);
    layer(out, thump(R, 60, 28, 0.6, 0.15), 1);
    const tube = noise(0.4, 'white', R); filt(tube, 'lp', 700); comb(tube, 1 / 140, 0.75, 0.4); ad(tube, 0.001, 0.35); layer(out, tube, 0.6);
    const tl = noise(1.2, 'brown', R); filt(tl, 'lp', 400); ad(tl, 0.02, 1.1); layer(out, tl, 0.4, 0.02);
    return snes(out, { drv: 2.2, bits: 8, hold: 2, p: 0.95 });
  }, { vol: 0.95, dist: 140, max: 3, prio: 4 }),
  mortar_whistle: def((R) => {      // incoming shell: descending whistle swelling as it drops
    const d = 1.15, out = buf(d);
    const w = osc(d, { f: 2300 * R.j(0.04), f1: 850, curve: 'exp', vib: 0.008, vibHz: 9 }); env(w, [[0, 0], [0.3, 0.3], [d - 0.03, 1], [d, 0]]); layer(out, w, 0.7);
    const a = noise(d, 'white', R); filtFn(a, 'bp', (t) => 2600 - 1500 * t / d, 4); env(a, [[0, 0], [d - 0.03, 1], [d, 0]]); layer(out, a, 0.25);
    return snes(out, { bits: 8, p: 0.75, fade: 0.005 });
  }, { vol: 0.8, dist: 80, max: 6, prio: 4, pj: 0.03 }),

  // ================================================================ damage / death
  ark_part_break: def((R) => {      // armour plate / rotor tearing off: crunch, snap, sparks, clattering bits
    const out = buf(1.1);
    const tear = noise(0.25, 'crunch', R, 2); filt(tear, 'bp', 1500, 600, 1.2); ad(tear, 0.001, 0.2); layer(out, tear, 0.9);
    layer(out, ping(R, R.r(450, 750), 0.8, 2.76, 5), 0.6);
    layer(out, click(R, 2400, 0.02), 0.6, 0.06);
    layer(out, sparks(R, 0.8, 24), 0.45, 0.02);
    for (let k = 0; k < 6; k++) mix(out, ping(R, R.r(1800, 3600), 0.08, 2.76, 1.5), R.r(0.15, 0.35), 0.25 + R() * 0.6);
    layer(out, thump(R, 110, 40, 0.3, 0.1), 0.6);
    return snes(out, { drv: 2.2, bits: 8, p: 0.92 });
  }, { vol: 0.85, dist: 60, max: 3, prio: 3 }),
  ark_death_small: def((R) => {     // electrical failure: power-down whine, sparks, pop, clatter
    const out = buf(1.1);
    const pd = osc(0.7, { wave: 'saw', f: 1400, f1: 90 }); filt(pd, 'lp', 3000, 600, 1); ad(pd, 0.005, 0.65); layer(out, pd, 0.4);
    layer(out, sparks(R, 0.8, 28), 0.55);
    const p = noise(0.2, 'crunch', R, 2); filt(p, 'lp', 3000, 500, 1); ad(p, 0.001, 0.18); layer(out, p, 0.8);
    layer(out, thump(R, 120, 45, 0.3, 0.08), 0.6);
    for (let k = 0; k < 4; k++) mix(out, clack(R, R.r(800, 1600), 0.05), 0.25, 0.45 + R() * 0.5);
    return snes(out, { drv: 2, bits: 7, p: 0.9 });
  }, { vol: 0.85, dist: 70, max: 4, prio: 3 }),
  ark_death_big: def((R) => {
    const out = buf(3.0);
    layer(out, explosion(R, 0.9), 1);
    const gr = fm(2.2, { f: 160, f1: 40, ratio: 1.41, index: 5, index1: 2, vib: 0.03, vibHz: 4 }); env(gr, [[0, 0], [0.2, 1], [2.2, 0]]);
    layer(out, gr, 0.45, 0.15);
    layer(out, sparks(R, 2.0, 40), 0.3, 0.2);
    return snes(out, { drv: 2, bits: 8, p: 0.97 });
  }, { vol: 1, dist: 150, max: 2, prio: 5, duck: 0.5, v: 2 }),
  ark_servo: def((R) => {
    const out = buf(0.45); layer(out, servo(R, R.r(180, 260), 0.4, R.r(1.3, 1.8)), 1); layer(out, click(R, 2000, 0.02), 0.3, 0.38);
    return snes(out, { bits: 8, p: 0.55 });
  }, { vol: 0.5, dist: 30, max: 4, pj: 0.08 }),
  // generic detection sting and "lost target" (fallbacks for machines without their own)
  ark_alert: def((R) => {
    const out = buf(1.0);
    layer(out, seq(R, [[N('B4'), 0.16], [N('F5'), 0.4]]), 1);
    return snes(echo(out, 0.11, 0.3, 2), { drv: 1.8, bits: 7, p: 0.85 });
  }, ALERT),
  ark_lost: def((R) => {
    const out = buf(1.1);
    layer(out, seq(R, [[N('F5'), 0.15, 0.8, N('E5')], [N('D5'), 0.15, 0.7], [N('B4'), 0.4, 0.6, N('A4')]], { index: 1.8 }), 1);
    filt(out, 'lp', 5000, 900, 0.8);
    return snes(echo(out, 0.12, 0.25, 2), { bits: 7, p: 0.6 });
  }, { vol: 0.6, dist: 50, max: 2, v: 1, pj: 0 }),

  // ================================================================ Queen / Matriarch
  queen_roar: def((R) => {          // earth-shaking mechanical roar
    const d = 3.6, out = buf(d);
    const g = fm(d, { f: 90, f1: 42, ratio: 0.5, index: 7, index1: 2, vib: 0.05, vibHz: 6 }); env(g, [[0, 0], [0.4, 1], [2.4, 0.8], [d, 0]]); layer(out, g, 0.8);
    const s = unison(d, 'saw', 1, [-20, 0, 18], { fn: (t) => 180 - 100 * t / d }); filtFn(s, 'bp', (t) => 350 + 900 * Math.sin(Math.PI * t / d), 3);
    env(s, [[0, 0], [0.3, 1], [d, 0]]); layer(out, s, 0.55);
    const n = noise(d, 'crunch', R, 3); filt(n, 'lp', 2000, 300, 1); env(n, [[0, 0], [0.2, 1], [d, 0]]); am(n, 23, 0.5); layer(out, n, 0.5);
    layer(out, thump(R, 40, 20, 1.8, 0.6), 0.9);
    return snes(out, { drv: 2.8, bits: 7, hold: 2, p: 0.98 });
  }, { vol: 1, dist: 220, max: 1, prio: 5, duck: 0.6, v: 2, pj: 0.03 }),
  queen_laser: def((R) => {         // rising face laser
    const d = 2.2, out = buf(d);
    const b = unison(d, 'saw', 200, [-10, 10], { f1: 900 }); filt(b, 'lp', 1500, 5000, 1.5); env(b, [[0, 0], [0.15, 1], [d - 0.1, 1], [d, 0]]); layer(out, b, 0.5);
    const z = noise(d, 'crunch', R, 2); filt(z, 'hp', 3000); am(z, 47, 0.8, 3); env(z, [[0, 0], [0.1, 1], [d, 0.6]]); layer(out, z, 0.35);
    layer(out, sparks(R, d, 40), 0.25);
    return snes(out, { drv: 2, bits: 7, p: 0.9 });
  }, { vol: 0.9, dist: 160, max: 2, prio: 4, v: 1 }),
  queen_pulse: def((R) => {         // EMP pulse: huge electric whomp
    const out = buf(1.8);
    layer(out, thump(R, 55, 22, 1.0, 0.25), 1);
    const r = fm(1.2, { f: 400, f1: 50, ratio: 1.41, index: 6, index1: 0.5 }); ad(r, 0.002, 1.1); layer(out, r, 0.6);
    layer(out, sparks(R, 1.0, 50), 0.5);
    const w = noise(1.2, 'white', R); filt(w, 'bp', 3000, 300, 0.8); ad(w, 0.005, 1.0); layer(out, w, 0.4);
    return snes(out, { drv: 2.5, bits: 7, p: 0.97 });
  }, { vol: 1, dist: 130, max: 2, prio: 5, duck: 0.4, v: 1 }),
};
