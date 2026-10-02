// Explosions & fire, player body sounds, loot & interaction.
import { buf, noise, osc, fm, ad, env, filt, filtFn, layer, mix, snes, am, seamless, echo } from './dsp.js';
import { def, explosion, click, clack, rustle, whoosh, thump, ping, blips, bell, N, bubble, rotor, servo } from './sfx_lib.js';

const STEP = { v: 4, vol: 0.55, dist: 20, max: 4, pj: 0.08, prio: 0 };

function step(R, o) {
  const { f = 900, q = 1, dec = 0.06, low = 0.4, lowF = 140, hiss = 0, hissF = 4000, grit = 0, crunch = 0 } = o;
  const out = buf(0.22);
  const n = noise(dec * 1.5 + 0.01, crunch ? 'crunch' : 'white', R, 3);
  filt(n, 'bp', f * R.j(0.2), f * 0.8, q); ad(n, 0.002, dec * R.j(0.2)); layer(out, n, 1);
  if (low) layer(out, thump(R, lowF, lowF * 0.5, 0.07, 0.03), low);
  if (hiss) { const h = noise(0.15, 'white', R); filt(h, 'hp', hissF); env(h, [[0, 0], [0.02, 1], [0.15, 0]]); layer(out, h, hiss, 0.005); }
  if (grit) for (let k = 0; k < 6; k++) mix(out, click(R, R.r(2000, 6000), 0.008, 2), grit * 0.3, R() * 0.1);
  return snes(out, { bits: 8, p: 0.7 });
}

export const WORLD = {
  // ---------------------------------------------------------------- explosions / fire
  explosion_small: def((R) => explosion(R, 0.4), { vol: 0.95, dist: 110, max: 4, prio: 4, duck: 0.25 }),
  explosion_big: def((R) => explosion(R, 1.2), { vol: 1, dist: 160, max: 3, prio: 5, duck: 0.55 }),
  fire_loop: def((R) => {
    const d = 3, out = buf(d + 0.4);
    const roar = noise(d + 0.4, 'brown', R); filt(roar, 'lp', 520); am(roar, 1 / 3.4 * 4, 0.35); layer(out, roar, 0.8);
    const hiss = noise(d + 0.4, 'pink', R); filt(hiss, 'bp', 1800, 1800, 0.7); am(hiss, 2.35, 0.5); layer(out, hiss, 0.3);
    const cr = buf(d + 0.4);
    for (let k = 0; k < 70; k++) mix(cr, click(R, R.r(800, 5000), R.r(0.004, 0.03), R.r(1, 4)), R.r(0.2, 1), R() * (d + 0.35));
    layer(out, cr, 0.55);
    return snes(seamless(out, 0.4), { bits: 9, fade: 0, p: 0.8 });
  }, { loop: true, v: 1, vol: 0.6, dist: 30, pj: 0 }),
  gas_hiss: def((R) => {
    const out = buf(1.6);
    const h = noise(1.6, 'white', R); filt(h, 'hp', 2500); filt(h, 'lp', 9000);
    env(h, [[0, 0], [0.05, 1], [0.4, 0.8], [1.6, 0]]); am(h, 13, 0.15); layer(out, h, 0.8);
    layer(out, click(R, 2000, 0.03), 0.5);
    return snes(out, { bits: 9, p: 0.65 });
  }, { vol: 0.55, dist: 30, max: 3 }),
  smoke_pop: def((R) => {
    const out = buf(1.0);
    layer(out, thump(R, 160, 70, 0.12, 0.04), 0.8);
    const p = noise(0.06, 'white', R); filt(p, 'lp', 2500); ad(p, 0.001, 0.05); layer(out, p, 0.8);
    layer(out, whoosh(R, 0.9, 400, 1800, 0.8), 0.6, 0.03);
    return snes(out, { bits: 8, p: 0.7 });
  }, { vol: 0.6, dist: 40, max: 3 }),
  flashbang: def((R) => {
    const out = buf(2.6);
    layer(out, explosion(R, 0.2), 1);
    const ring = osc(2.6, { f: 3600, vib: 0.002, vibHz: 6 }); env(ring, [[0, 0], [0.05, 1], [1.2, 0.6], [2.6, 0]]);
    layer(out, ring, 0.35);
    return snes(out, { drv: 1.5, bits: 9, p: 0.95 });
  }, { vol: 0.95, dist: 70, max: 2, prio: 4, duck: 0.6 }),

  // ---------------------------------------------------------------- player
  step_grass: def((R) => step(R, { f: 2600, q: 0.7, dec: 0.08, low: 0.2, hiss: 0.5, hissF: 3500, grit: 0.4 }), STEP),
  step_concrete: def((R) => step(R, { f: 1100, q: 1.3, dec: 0.045, low: 0.5, lowF: 160 }), STEP),
  step_metal: def((R) => {
    const out = buf(0.3);
    layer(out, step(R, { f: 1400, q: 1.5, dec: 0.04, low: 0.4, lowF: 150 }), 0.8);
    layer(out, ping(R, R.r(500, 800), 0.25, 1.41, 2.5), 0.35);
    return snes(out, { bits: 8, p: 0.7 });
  }, STEP),
  step_sand: def((R) => step(R, { f: 1800, q: 0.6, dec: 0.1, low: 0.25, hiss: 0.3, hissF: 2500, grit: 0.8, crunch: 1 }), STEP),
  step_water: def((R) => {
    const out = buf(0.35);
    const n = noise(0.25, 'white', R);
    filtFn(n, 'bp', (t) => 600 + 2400 * Math.sin(Math.PI * Math.min(1, t / 0.25)), 1.5);
    env(n, [[0, 0], [0.02, 1], [0.25, 0]]); layer(out, n, 1);
    for (let k = 0; k < 4; k++) mix(out, bubble(R, R.r(500, 1400), R.r(0.03, 0.07)), 0.3, 0.04 + R() * 0.2);
    layer(out, thump(R, 110, 60, 0.08, 0.04), 0.3);
    return snes(out, { bits: 8, p: 0.7 });
  }, STEP),
  step_wood: def((R) => step(R, { f: 420, q: 4, dec: 0.09, low: 0.45, lowF: 120 }), STEP),
  dodge_roll: def((R) => {
    const out = buf(0.6);
    layer(out, whoosh(R, 0.35, 300, 1500, 1.2), 0.8);
    layer(out, rustle(R, 0.35, 1800), 0.6, 0.05);
    layer(out, thump(R, 130, 70, 0.1, 0.04), 0.5, 0.36);
    layer(out, clack(R, 1200, 0.05), 0.25, 0.38);
    return snes(out, { bits: 8, p: 0.65 });
  }, { vol: 0.6, dist: 18, max: 2, pj: 0.06 }),
  jump_land: def((R) => {
    const out = buf(0.35);
    layer(out, thump(R, 120, 50, 0.18, 0.06), 0.9);
    const n = noise(0.1, 'white', R); filt(n, 'lp', 900); ad(n, 0.001, 0.08); layer(out, n, 0.6);
    layer(out, rustle(R, 0.2, 2500), 0.35, 0.02);
    layer(out, clack(R, 1500, 0.04), 0.2, 0.03);
    return snes(out, { bits: 8, p: 0.7 });
  }, { vol: 0.6, dist: 20, max: 2 }),
  crouch: def((R) => {
    const out = buf(0.3); layer(out, rustle(R, 0.25, 1500), 0.8); layer(out, clack(R, 1100, 0.04), 0.25, 0.15);
    return snes(out, { bits: 9, p: 0.5 });
  }, { vol: 0.45, dist: 8, max: 2 }),
  hurt: def((R) => {
    const out = buf(0.35);
    const s = osc(0.2, { wave: 'rawsq', f: R.r(230, 280), f1: 95, pw: 0.25 }); ad(s, 0.002, 0.2); layer(out, s, 0.45);
    const v = noise(0.2, 'white', R); filt(v, 'bp', 700, 450, 4); ad(v, 0.005, 0.18); layer(out, v, 0.6);
    layer(out, thump(R, 150, 60, 0.12, 0.05), 0.7);
    return snes(out, { drv: 1.6, bits: 7, p: 0.8 });
  }, { vol: 0.7, dist: 20, max: 2, prio: 3, bus: 'sfx' }),
  downed: def((R) => {
    const out = buf(1.4);
    const s = osc(1.0, { wave: 'rawsq', f: 420, f1: 70, pw: 0.3, vib: 0.06, vibHz: 9 }); ad(s, 0.01, 1.0); layer(out, s, 0.4);
    layer(out, thump(R, 100, 40, 0.3, 0.1), 0.8, 0.05);
    for (const t of [0.6, 0.85, 1.1]) layer(out, thump(R, 60, 40, 0.15, 0.04), 0.5, t);
    return snes(out, { bits: 7, p: 0.85 });
  }, { vol: 0.8, dist: 35, max: 2, prio: 4, v: 2 }),
  revive: def((R) => {
    const notes = ['C5', 'E5', 'G5', 'C6', 'E6'].map((n, i) => [N(n), 0.08, 1 - i * 0.08]);
    const b = blips(R, notes, { pw: 0.25, dec: 2 });
    const out = buf(1.2); layer(out, b, 0.6);
    for (let k = 0; k < 4; k++) mix(out, bell(R, N(['G6', 'C7', 'E7', 'G7'][k]), 0.5), 0.15, 0.3 + k * 0.07);
    return snes(echo(out, 0.12, 0.3, 2), { bits: 9, p: 0.75 });
  }, { vol: 0.7, dist: 30, max: 2, v: 1, pj: 0 }),
  death: def((R) => {
    const out = buf(1.8);
    const s = osc(1.6, { wave: 'saw', f: 220, f1: 40 }); filt(s, 'lp', 1500, 200, 2); ad(s, 0.005, 1.6); layer(out, s, 0.6);
    layer(out, thump(R, 90, 30, 0.6, 0.2), 0.9);
    const n = noise(0.6, 'crunch', R, 3); filt(n, 'lp', 1800, 200, 1); ad(n, 0.002, 0.5); layer(out, n, 0.5);
    return snes(out, { drv: 1.8, bits: 7, p: 0.9 });
  }, { vol: 0.85, dist: 40, max: 1, prio: 5, v: 1 }),
  heal_bandage: def((R) => {
    const out = buf(1.1);
    for (let k = 0; k < 3; k++) {
      const r = noise(0.22, 'white', R); filt(r, 'bp', R.r(2500, 4000), 1500, 1.5);
      for (let i = 0; i < r.length; i++) if ((i >> 6) % 3 === 0) r[i] *= 0.2;
      env(r, [[0, 0], [0.03, 1], [0.22, 0]]); layer(out, r, 0.6, 0.05 + k * 0.3);
    }
    layer(out, rustle(R, 0.4, 1500), 0.4, 0.6);
    return snes(out, { bits: 9, p: 0.6 });
  }, { vol: 0.55, dist: 12, max: 2 }),
  heal_injector: def((R) => {
    const out = buf(0.9);
    layer(out, clack(R, 2000, 0.05), 0.7);
    const h = noise(0.3, 'white', R); filt(h, 'hp', 3000); env(h, [[0, 0], [0.01, 1], [0.3, 0]]); layer(out, h, 0.6, 0.06);
    layer(out, bell(R, N('E6'), 0.6), 0.25, 0.25); layer(out, bell(R, N('B6'), 0.5), 0.2, 0.35);
    return snes(out, { bits: 9, p: 0.65 });
  }, { vol: 0.6, dist: 12, max: 2 }),
  shield_recharge: def((R) => {
    const out = buf(1.1);
    const s = fm(1.0, { f: 180, f1: 820, ratio: 2, index: 1.2, vib: 0.01, vibHz: 8 }); env(s, [[0, 0], [0.1, 0.6], [0.85, 1], [1.0, 0]]);
    layer(out, s, 0.6);
    const sh = noise(1.0, 'white', R); filt(sh, 'bp', 3000, 7000, 3); am(sh, 16, 0.8); env(sh, [[0, 0], [1.0, 1]]); layer(out, sh, 0.2);
    layer(out, bell(R, N('A6'), 0.4), 0.3, 0.9);
    return snes(out, { bits: 8, p: 0.65 });
  }, { vol: 0.6, dist: 15, max: 2 }),
  stamina_out: def((R) => {
    const out = buf(0.7);
    const b = noise(0.6, 'pink', R); filt(b, 'bp', 1100, 700, 2.5); env(b, [[0, 0], [0.08, 1], [0.6, 0]]); layer(out, b, 1);
    return snes(out, { bits: 9, p: 0.5 });
  }, { vol: 0.5, dist: 10, max: 1, pj: 0.06 }),
  breath_heavy: def((R) => {
    const out = buf(1.5);
    for (const [t, f, d] of [[0, 1400, 0.45], [0.6, 1000, 0.6]]) {
      const b = noise(d, 'pink', R); filt(b, 'bp', f, f * 0.8, 2.5); env(b, [[0, 0], [d * 0.3, 1], [d, 0]]); layer(out, b, 0.8, t);
    }
    return snes(out, { bits: 9, p: 0.45 });
  }, { vol: 0.45, dist: 10, max: 1, pj: 0.05 }),

  // ---------------------------------------------------------------- loot / interaction
  search_loop: def((R) => {
    const d = 2.4, out = buf(d + 0.3);
    for (let k = 0; k < 26; k++) {
      const t = R() * (d + 0.2), kind = R.i(0, 2);
      if (kind === 0) mix(out, rustle(R, R.r(0.08, 0.2), R.r(1200, 3000)), R.r(0.3, 0.8), t);
      else if (kind === 1) mix(out, clack(R, R.r(900, 2500), R.r(0.03, 0.07)), R.r(0.15, 0.4), t);
      else mix(out, click(R, R.r(1500, 4000), 0.015, 2), R.r(0.2, 0.5), t);
    }
    return snes(seamless(out, 0.3), { bits: 9, fade: 0, p: 0.6 });
  }, { loop: true, v: 1, vol: 0.5, dist: 15, pj: 0 }),
  search_done: def((R) => {
    const out = buf(0.4); layer(out, blips(R, [[N('A5'), 0.06], [N('E6'), 0.1]], { pw: 0.25 }), 0.5);
    layer(out, clack(R, 1400, 0.05), 0.3);
    return snes(out, { bits: 8, p: 0.55 });
  }, { vol: 0.6, dist: 15, max: 2, pj: 0, bus: 'ui' }),
  loot_pickup: def((R) => {
    const out = buf(0.3);
    const b = osc(0.12, { wave: 'sq', pw: 0.25, f: 880, f1: 1500, sweep: 0.05 }); ad(b, 0.002, 0.12); layer(out, b, 0.45);
    layer(out, rustle(R, 0.15, 2200), 0.4);
    return snes(out, { bits: 8, p: 0.55 });
  }, { vol: 0.6, dist: 12, max: 3, pj: 0.03, bus: 'ui' }),
  loot_rare: def((R) => {
    const out = buf(1.2);
    ['E6', 'G#6', 'B6', 'E7'].forEach((n, i) => mix(out, bell(R, N(n), 0.8), 0.4, i * 0.07));
    layer(out, blips(R, [[N('E5'), 0.07], [N('B5'), 0.12]], { pw: 0.25 }), 0.3);
    return snes(echo(out, 0.15, 0.3, 2), { bits: 9, p: 0.7 });
  }, { vol: 0.65, dist: 15, max: 2, pj: 0, v: 1, bus: 'ui' }),
  loot_legendary: def((R) => {
    const out = buf(2.6);
    ['C6', 'E6', 'G6', 'B6', 'D7', 'G7'].forEach((n, i) => mix(out, bell(R, N(n), 1.4), 0.35, i * 0.08));
    for (const n of ['C4', 'G4', 'E5', 'B5']) {
      const p = osc(2.2, { wave: 'saw', f: N(n), vib: 0.004, vibHz: 5 }); filt(p, 'lp', 600, 3000, 1, 0.8);
      env(p, [[0, 0], [0.5, 1], [1.6, 0.7], [2.2, 0]]); layer(out, p, 0.18, 0.1);
    }
    const sp = noise(2.0, 'white', R); filt(sp, 'hp', 6000); am(sp, 9, 1, 4); env(sp, [[0, 0], [0.4, 1], [2, 0]]); layer(out, sp, 0.15);
    return snes(echo(out, 0.18, 0.35, 2), { bits: 9, p: 0.8 });
  }, { vol: 0.75, dist: 20, max: 1, pj: 0, v: 1, bus: 'ui' }),
  door_open: def((R) => {
    const out = buf(1.0);
    layer(out, clack(R, 1100, 0.06), 0.7);
    const c = osc(0.7, { wave: 'saw', fn: (t) => 340 + 120 * Math.sin(t * 7) + 60 * Math.sin(t * 31) });
    filt(c, 'bp', 1200, 1200, 4); env(c, [[0, 0], [0.1, 1], [0.6, 0.6], [0.7, 0]]); layer(out, c, 0.35, 0.08);
    layer(out, thump(R, 140, 80, 0.15, 0.05), 0.4, 0.7);
    return snes(out, { bits: 8, p: 0.7 });
  }, { vol: 0.6, dist: 25, max: 3 }),
  door_locked: def((R) => {
    const out = buf(0.5);
    for (let k = 0; k < 4; k++) layer(out, clack(R, R.r(900, 1400), 0.05), 0.6, k * 0.08 + R() * 0.02);
    layer(out, thump(R, 160, 90, 0.08, 0.03), 0.5, 0.3);
    return snes(out, { bits: 8, p: 0.65 });
  }, { vol: 0.6, dist: 20, max: 2 }),
  door_unlock: def((R) => {
    const out = buf(0.7);
    layer(out, clack(R, 1300, 0.08), 0.7);
    layer(out, click(R, 2200, 0.03), 0.6, 0.1);
    layer(out, blips(R, [[N('C6'), 0.07], [N('G6'), 0.14]], { pw: 0.5 }), 0.4, 0.22);
    return snes(out, { bits: 8, p: 0.65 });
  }, { vol: 0.6, dist: 20, max: 2, pj: 0.02 }),
  hatch_open: def((R) => {
    const out = buf(1.7);
    layer(out, clack(R, 700, 0.12), 0.8);
    layer(out, ping(R, 220, 1.2, 2.76, 4), 0.5, 0.05);
    const h = noise(0.9, 'white', R); filt(h, 'bp', 3000, 1500, 1.2); env(h, [[0, 0], [0.05, 1], [0.9, 0]]); layer(out, h, 0.5, 0.15);
    layer(out, thump(R, 90, 45, 0.4, 0.12), 0.7, 1.05);
    return snes(out, { drv: 1.4, bits: 8, p: 0.8 });
  }, { vol: 0.7, dist: 35, max: 2 }),
  container_open: def((R) => {
    const out = buf(0.55);
    layer(out, click(R, 2800, 0.02), 0.6); layer(out, click(R, 2600, 0.02), 0.6, 0.06);
    const c = osc(0.3, { wave: 'saw', fn: (t) => 500 + 200 * Math.sin(t * 20) }); filt(c, 'bp', 1500, 1500, 5);
    env(c, [[0, 0], [0.05, 1], [0.3, 0]]); layer(out, c, 0.2, 0.12);
    layer(out, thump(R, 180, 100, 0.08, 0.03), 0.4, 0.4);
    return snes(out, { bits: 8, p: 0.6 });
  }, { vol: 0.55, dist: 18, max: 3 }),
  zipper: def((R) => {
    const out = buf(0.65);
    let t = 0, dt = 0.03;
    while (t < 0.55) { mix(out, click(R, R.r(2500, 4000), 0.008, 3), R.r(0.4, 1), t); t += dt * R.j(0.3); dt = Math.max(0.009, dt * 0.93); }
    return snes(out, { bits: 9, p: 0.5 });
  }, { vol: 0.5, dist: 10, max: 2, pj: 0.1 }),
  key_use: def((R) => {
    const out = buf(0.7);
    for (let k = 0; k < 5; k++) layer(out, ping(R, R.r(2500, 4500), 0.3, R.pick([2.76, 3.5]), 1.5), 0.3, k * 0.05 + R() * 0.03);
    layer(out, clack(R, 1600, 0.06), 0.7, 0.35);
    layer(out, click(R, 2400, 0.03), 0.5, 0.45);
    return snes(out, { bits: 8, p: 0.6 });
  }, { vol: 0.6, dist: 12, max: 2 }),

  // ---------------------------------------------------------------- extraction machinery (engine/extracts.js rigs)
  // cage winding up the shaft: motor rising in pitch, cable rattle, lock-in clank as it arrives (~6 s)
  elevator_rise: def((R) => {
    const d = 6.4, out = buf(d);
    const m = osc(d, { wave: 'saw', f: 46, f1: 84, sweep: 5.8 }); filt(m, 'lp', 240, 440, 1.2); env(m, [[0, 0], [0.6, 1], [5.6, 1], [6.1, 0.15], [6.4, 0]]); layer(out, m, 0.55);
    const w = osc(d, { wave: 'sq', pw: 0.3, f: 170, f1: 310, sweep: 5.8, vib: 0.01, vibHz: 7 }); filt(w, 'bp', 700, 950, 3); env(w, [[0, 0], [0.8, 0.5], [5.5, 1], [6.0, 0]]); layer(out, w, 0.16);
    const r = noise(d, 'brown', R); filt(r, 'lp', 190); env(r, [[0, 0], [1.0, 1], [5.7, 1], [6.4, 0]]); layer(out, r, 0.5);
    const rat = buf(d); for (let t = 0.3; t < 5.8; t += R.r(0.06, 0.15)) mix(rat, click(R, R.r(900, 2600), 0.02, 3), R.r(0.2, 0.7) * (0.4 + 0.6 * t / 5.8), t);
    layer(out, rat, 0.22);
    layer(out, clack(R, 600, 0.14), 0.6, 5.95); layer(out, thump(R, 100, 45, 0.3, 0.08), 0.75, 5.95);
    return snes(out, { drv: 1.4, bits: 8, p: 0.8 });
  }, { vol: 0.7, dist: 55, max: 2, v: 2, prio: 3 }),
  // cage released and dropping away: clunk, motor winding down, fading rattle (~5 s)
  elevator_depart: def((R) => {
    const d = 5.2, out = buf(d);
    layer(out, clack(R, 520, 0.16), 0.7); layer(out, thump(R, 95, 40, 0.35, 0.1), 0.7);
    const m = osc(d, { wave: 'saw', f: 86, f1: 38, sweep: 4.8 }); filt(m, 'lp', 420, 180, 1.2); env(m, [[0, 0], [0.3, 1], [3.5, 0.7], [5.2, 0]]); layer(out, m, 0.5, 0.1);
    const r = noise(d, 'brown', R); filt(r, 'lp', 170); env(r, [[0, 0], [0.4, 1], [4.6, 0.3], [5.2, 0]]); layer(out, r, 0.45);
    const rat = buf(d); for (let t = 0.3; t < 4.6; t += R.r(0.07, 0.18)) mix(rat, click(R, R.r(800, 2200), 0.02, 3), R.r(0.2, 0.6) * (1 - t / 4.8), t);
    layer(out, rat, 0.2);
    return snes(out, { drv: 1.3, bits: 8, p: 0.75 });
  }, { vol: 0.65, dist: 50, max: 2, v: 2, prio: 2 }),
  // call alarm at the lift: two-tone klaxon, twice
  extract_klaxon: def((R) => {
    const out = buf(1.9);
    for (let k = 0; k < 4; k++) {
      const f = k & 1 ? 466 : 370, x = osc(0.4, { wave: 'saw', f, vib: 0.006, vibHz: 9 }); filt(x, 'bp', f * 2.2, f * 2.2, 1.6);
      env(x, [[0, 0], [0.02, 1], [0.36, 0.85], [0.4, 0]]); layer(out, x, 0.6, k * 0.42);
    }
    return snes(echo(out, 0.11, 0.25, 2), { drv: 1.8, bits: 8, p: 0.8 });
  }, { vol: 0.6, dist: 75, max: 2, v: 1, prio: 3 }),
  // console back online after a departure
  extract_ready: def((R) => snes(echo(blips(R, [[N('G5'), 0.07], [0, 0.03], [N('C6'), 0.14]], { pw: 0.25 }), 0.07, 0.25, 2), { bits: 8, p: 0.55 }), { vol: 0.45, dist: 22, max: 2, v: 1 }),
  // metro approaching in the tunnel: swelling rumble, wheel-joint clatter, a distant horn (~5 s)
  extract_metro_rumble: def((R) => {
    const d = 5.4, out = buf(d);
    const r = noise(d, 'brown', R); filt(r, 'lp', 120, 260, 1.0); env(r, [[0, 0], [4.6, 1], [5.4, 0.6]]); layer(out, r, 0.85);
    const h = noise(d, 'pink', R); filt(h, 'bp', 900, 1600, 0.8); env(h, [[0, 0], [4.8, 0.7], [5.4, 0.4]]); layer(out, h, 0.18);
    const cl = buf(d); let t = 0.8, gap = 0.55;
    while (t < d - 0.2) { mix(cl, clack(R, R.r(380, 520), 0.07), 0.25 + 0.75 * t / d, t); mix(cl, clack(R, R.r(380, 520), 0.07), 0.2 + 0.7 * t / d, t + 0.09); t += gap; gap = Math.max(0.16, gap * 0.9); }
    layer(out, cl, 0.4);
    for (const f of [233, 277]) { const x = osc(0.7, { wave: 'saw', f }); filt(x, 'lp', 900); env(x, [[0, 0], [0.05, 1], [0.6, 0.8], [0.7, 0]]); layer(out, x, 0.22, 3.4); }
    return snes(out, { drv: 1.5, bits: 8, p: 0.85 });
  }, { vol: 0.8, dist: 90, max: 1, v: 1, prio: 3 }),
  // metro pulling in: brake squeal, air hiss, door chime (~3 s)
  extract_metro_arrive: def((R) => {
    const d = 3.1, out = buf(d);
    const sq = osc(1.9, { wave: 'saw', f: 2350, f1: 1900, vib: 0.012, vibHz: 11 }); filt(sq, 'bp', 2400, 2000, 6); env(sq, [[0, 0], [0.15, 1], [1.5, 0.7], [1.9, 0]]); layer(out, sq, 0.32);
    const r = noise(2.0, 'brown', R); filt(r, 'lp', 220, 120, 1); env(r, [[0, 1], [1.9, 0]]); layer(out, r, 0.6);
    const hs = noise(0.9, 'white', R); filt(hs, 'hp', 2600); env(hs, [[0, 0], [0.03, 1], [0.9, 0]]); layer(out, hs, 0.4, 1.85);
    layer(out, thump(R, 110, 50, 0.25, 0.08), 0.5, 1.85);
    layer(out, bell(R, N('E5'), 0.7), 0.3, 2.25); layer(out, bell(R, N('C5'), 0.8), 0.3, 2.55);
    return snes(out, { drv: 1.3, bits: 8, p: 0.8 });
  }, { vol: 0.75, dist: 70, max: 1, v: 1, prio: 3 }),
  // metro leaving: door thunk, traction motor "song" rising, rumble fading down the tunnel (~4.5 s)
  extract_metro_depart: def((R) => {
    const d = 4.6, out = buf(d);
    layer(out, thump(R, 120, 55, 0.25, 0.06), 0.5); layer(out, clack(R, 700, 0.1), 0.4);
    const m = osc(d, { wave: 'sq', pw: 0.4, fn: (t) => 110 + 520 * Math.min(1, t / 3.6) ** 1.4 }); filt(m, 'bp', 800, 1800, 2.5); env(m, [[0, 0], [0.4, 0.8], [3.0, 1], [4.6, 0]]); layer(out, m, 0.25, 0.2);
    const r = noise(d, 'brown', R); filt(r, 'lp', 220, 120, 1); env(r, [[0, 0], [0.6, 1], [4.6, 0]]); layer(out, r, 0.7);
    const cl = buf(d); let t = 0.9, gap = 0.5;
    while (t < d - 0.2) { mix(cl, clack(R, R.r(380, 520), 0.07), 0.8 * (1 - t / d), t); t += gap; gap = Math.max(0.17, gap * 0.88); }
    layer(out, cl, 0.35);
    return snes(out, { drv: 1.4, bits: 8, p: 0.8 });
  }, { vol: 0.75, dist: 80, max: 1, v: 1, prio: 3 }),
  // raider hatch: seals crack, pressurised steam hiss, heavy lid clank, hinge creak (~1.8 s)
  extract_hatch_steam: def((R) => {
    const out = buf(1.9);
    layer(out, clack(R, 480, 0.16), 0.7);
    const h = noise(1.6, 'white', R); filt(h, 'bp', 4200, 2200, 0.9); env(h, [[0, 0], [0.04, 1], [0.5, 0.7], [1.6, 0]]); am(h, 17, 0.12); layer(out, h, 0.75, 0.08);
    const c = osc(0.6, { wave: 'saw', fn: (t) => 160 + 70 * Math.sin(t * 9) + 30 * Math.sin(t * 37) }); filt(c, 'bp', 900, 900, 5); env(c, [[0, 0], [0.1, 1], [0.5, 0.6], [0.6, 0]]); layer(out, c, 0.25, 0.3);
    layer(out, thump(R, 85, 40, 0.35, 0.1), 0.7, 0.85); layer(out, clack(R, 620, 0.12), 0.5, 0.86);
    return snes(out, { drv: 1.3, bits: 8, p: 0.8 });
  }, { vol: 0.75, dist: 40, max: 2, v: 2 }),
  // airshaft ventilation fan (loop; the rig sets volume + pitch from the rotor speed)
  extract_fan_loop: def((R) => {
    const out = rotor(R, 2, 26, 104, { body: 520, whineG: 0.25, chopDepth: 0.55, lowG: 0.7 });
    const hm = osc(2, { wave: 'tri', f: 52 }); layer(out, hm, 0.35);
    const air = noise(2, 'pink', R); filt(air, 'bp', 1400, 1400, 0.6); layer(out, air, 0.25);
    return snes(seamless(out, 0.3), { bits: 8, fade: 0, p: 0.7 });
  }, { loop: true, v: 1, pj: 0, vol: 0.45, dist: 32, max: 4 }),
};
