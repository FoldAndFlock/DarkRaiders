// Extraction / raid flow, UI (SNES menu chirps) and ambient beds.
import { SR, buf, noise, osc, ad, env, filt, filtFn, layer, mix, snes, am, seamless, echo, unison } from './dsp.js';
import {
  def, click, clack, whoosh, thump, ping, blips, bell, N, rain, wind, bubble, birdChirp, rustle, servo,
} from './sfx_lib.js';

const UI = { bus: 'ui', vol: 0.55, max: 3, pj: 0, v: 1, prio: 2 };
const AMB = { loop: true, v: 1, pj: 0, vol: 0.5, max: 2, dist: 1e9, prio: 0 };

// UI sounds: square/pulse blips with a tiny baked echo (SNES menu feel)
const ui = (notes, o = {}, e = 0.05) => (R) => snes(echo(blips(R, notes, o), e, 0.25, 2), { bits: 8, p: 0.6 });

export const MISC = {
  // ---------------------------------------------------------------- extraction / raid
  extract_call: def((R) => {
    const out = buf(1.4);
    const st = noise(0.35, 'crunch', R, 3); filt(st, 'bp', 1800, 1800, 0.8); am(st, 31, 0.6); env(st, [[0, 0], [0.03, 1], [0.35, 0]]);
    layer(out, st, 0.35);
    layer(out, blips(R, [[N('E5'), 0.09], [0, 0.04], [N('B5'), 0.09], [0, 0.04], [N('E6'), 0.2]], { pw: 0.25 }), 0.45, 0.3);
    layer(out, bell(R, N('E4'), 1.0), 0.35, 0.3);
    return snes(echo(out, 0.14, 0.3, 2), { bits: 8, p: 0.75 });
  }, { ...UI, bus: 'sfx', vol: 0.7, max: 1, dist: 1e9, prio: 4 }),
  extract_countdown_tick: def((R) => {
    const out = buf(0.12); const b = osc(0.06, { wave: 'rawsq', f: 1046, pw: 0.5 }); ad(b, 0.001, 0.06, 0.02); layer(out, b, 1);
    layer(out, click(R, 3000, 0.01), 0.4);
    return snes(out, { bits: 8, p: 0.5 });
  }, { ...UI, bus: 'sfx', vol: 0.6, max: 2, dist: 1e9 }),
  elevator_arrive: def((R) => {
    const d = 2.8, out = buf(d);
    const r = noise(2.2, 'brown', R); filt(r, 'lp', 160, 420, 1.2, 2); env(r, [[0, 0], [1.6, 1], [2.2, 0]]); layer(out, r, 0.8);
    const m = osc(2.2, { wave: 'saw', f: 60, f1: 95, sweep: 2 }); filt(m, 'lp', 400); env(m, [[0, 0], [1.6, 1], [2.2, 0]]); layer(out, m, 0.3);
    layer(out, thump(R, 90, 40, 0.4, 0.1), 0.9, 2.15);
    layer(out, clack(R, 600, 0.15), 0.6, 2.15);
    layer(out, bell(R, N('A5'), 0.6), 0.3, 2.35); layer(out, bell(R, N('E6'), 0.5), 0.25, 2.5);
    return snes(out, { drv: 1.5, bits: 8, p: 0.85 });
  }, { vol: 0.8, dist: 60, max: 1, v: 1, prio: 4 }),
  elevator_door: def((R) => {
    const out = buf(1.3);
    const h = noise(0.4, 'white', R); filt(h, 'hp', 2500); env(h, [[0, 0], [0.02, 1], [0.4, 0]]); layer(out, h, 0.5);
    const sl = noise(0.8, 'brown', R); filt(sl, 'lp', 500); env(sl, [[0, 0], [0.2, 1], [0.8, 0.6], [0.85, 0]]); layer(out, sl, 0.6, 0.15);
    layer(out, servo(R, 140, 0.7, 1.3), 0.25, 0.15);
    layer(out, thump(R, 110, 50, 0.3, 0.08), 0.8, 0.95);
    layer(out, clack(R, 700, 0.12), 0.5, 0.95);
    return snes(out, { drv: 1.4, bits: 8, p: 0.8 });
  }, { vol: 0.75, dist: 45, max: 2, v: 2 }),
  extract_success: def((R) => {
    const out = buf(2.2);
    ['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6'].forEach((n, i) => mix(out, bell(R, N(n), 1.2), 0.3, i * 0.08));
    const p = unison(1.8, 'saw', N('D4'), [-9, 0, 8]); filt(p, 'lp', 600, 3500, 1, 0.6); env(p, [[0, 0], [0.4, 1], [1.8, 0]]); layer(out, p, 0.3, 0.1);
    layer(out, whoosh(R, 0.8, 400, 3000, 1), 0.3);
    return snes(echo(out, 0.16, 0.3, 2), { bits: 9, p: 0.8 });
  }, { ...UI, bus: 'ui', vol: 0.75, max: 1 }),
  raid_start: def((R) => {
    const d = 2.6, out = buf(d);
    for (const [f, g] of [[N('D2'), 0.9], [N('A2'), 0.6], [N('D3'), 0.5], [N('F3'), 0.35]]) {
      const b = unison(d, 'saw', f, [-12, 0, 11]); filt(b, 'lp', 2400, 300, 1.4, 1.8); env(b, [[0, 0], [0.04, 1], [d, 0]]); layer(out, b, g * 0.5);
    }
    layer(out, thump(R, 70, 30, 1.2, 0.3), 0.8);
    layer(out, whoosh(R, 1.4, 200, 1400, 0.9), 0.3, 0.6);
    return snes(out, { drv: 1.7, bits: 9, p: 0.92 });
  }, { ...UI, bus: 'sfx', vol: 0.85, max: 1, dist: 1e9, prio: 5 }),
  raid_warning: def((R) => {
    const out = buf(1.6);
    for (let k = 0; k < 3; k++) {
      layer(out, blips(R, [[N('A5'), 0.16], [N('D5'), 0.16]], { wave: 'sq', pw: 0.3 }), 0.5, k * 0.45);
    }
    return snes(echo(out, 0.12, 0.25, 1), { bits: 7, p: 0.75 });
  }, { ...UI, bus: 'sfx', vol: 0.7, max: 1, dist: 1e9, prio: 4 }),
  raid_end_siren: def((R) => {
    const d = 4.5, out = buf(d);
    const fn = (t) => 280 + 520 * Math.sin(Math.PI * Math.min(1, t / d)) * (0.9 + 0.1 * Math.sin(t * 4));
    const s = unison(d, 'saw', 1, [-6, 0, 7], { fn }); filt(s, 'lp', 2200); env(s, [[0, 0], [0.6, 1], [3.6, 0.9], [d, 0]]);
    layer(out, s, 0.6);
    const s2 = osc(d, { wave: 'sq', fn: (t) => fn(t) * 1.5, pw: 0.5 }); filt(s2, 'lp', 1800); env(s2, [[0, 0], [0.6, 1], [3.6, 0.9], [d, 0]]);
    layer(out, s2, 0.2);
    return snes(echo(out, 0.3, 0.35, 2), { bits: 8, p: 0.85 });
  }, { ...UI, bus: 'sfx', vol: 0.75, max: 1, dist: 1e9, prio: 4 }),
  hatch_extract: def((R) => {
    const out = buf(1.8);
    layer(out, clack(R, 600, 0.15), 0.8);
    const h = noise(0.6, 'white', R); filt(h, 'bp', 2600, 1200, 1.2); env(h, [[0, 0], [0.03, 1], [0.6, 0]]); layer(out, h, 0.5, 0.05);
    layer(out, ping(R, 180, 1.0, 2.76, 4), 0.4, 0.02);
    layer(out, whoosh(R, 1.0, 900, 200, 1), 0.6, 0.6);
    layer(out, thump(R, 80, 35, 0.4, 0.1), 0.6, 1.4);
    return snes(out, { drv: 1.5, bits: 8, p: 0.85 });
  }, { vol: 0.8, dist: 50, max: 1, v: 2, prio: 4 }),

  // ---------------------------------------------------------------- UI
  ui_hover: def(ui([[2400, 0.025]], { pw: 0.25 }, 0.03), { ...UI, vol: 0.3, max: 2 }),
  ui_click: def(ui([[1200, 0.03], [1800, 0.04]], { pw: 0.5 }), UI),
  ui_back: def(ui([[900, 0.035], [600, 0.05]], { pw: 0.5 }), UI),
  ui_open: def((R) => {
    const out = buf(0.35); const s = osc(0.18, { wave: 'sq', pw: 0.25, f: 500, f1: 1800 }); ad(s, 0.002, 0.2, 0.05); layer(out, s, 0.6);
    layer(out, whoosh(R, 0.25, 600, 3000, 1.5), 0.25);
    return snes(echo(out, 0.06, 0.25, 2), { bits: 8, p: 0.55 });
  }, UI),
  ui_close: def((R) => {
    const out = buf(0.3); const s = osc(0.15, { wave: 'sq', pw: 0.25, f: 1500, f1: 450 }); ad(s, 0.002, 0.17, 0.04); layer(out, s, 0.6);
    return snes(echo(out, 0.06, 0.25, 2), { bits: 8, p: 0.5 });
  }, UI),
  ui_equip: def((R) => {
    const out = buf(0.35); layer(out, clack(R, 1500, 0.07), 0.7);
    layer(out, blips(R, [[N('E6'), 0.05]], { pw: 0.25 }), 0.4, 0.05);
    return snes(out, { bits: 8, p: 0.55 });
  }, { ...UI, v: 2 }),
  ui_drop: def((R) => {
    const out = buf(0.3); layer(out, thump(R, 220, 90, 0.12, 0.05), 0.7); layer(out, rustle(R, 0.12, 1500), 0.4);
    layer(out, blips(R, [[N('C5'), 0.04], [N('G4'), 0.06]], { pw: 0.5 }), 0.3);
    return snes(out, { bits: 8, p: 0.5 });
  }, { ...UI, v: 2 }),
  ui_error: def(ui([[140, 0.08], [0, 0.03], [140, 0.12]], { wave: 'rawsq', pw: 0.5 }, 0.02), { ...UI, vol: 0.5 }),
  ui_craft: def((R) => {
    const out = buf(0.9);
    for (const t of [0, 0.16]) { layer(out, ping(R, 1500, 0.2, 2.76, 2.5), 0.5, t); layer(out, clack(R, 900, 0.06), 0.4, t); }
    layer(out, blips(R, [[N('G5'), 0.07], [N('C6'), 0.07], [N('E6'), 0.16]], { pw: 0.25 }), 0.4, 0.35);
    return snes(echo(out, 0.1, 0.3, 2), { bits: 8, p: 0.65 });
  }, UI),
  ui_upgrade: def((R) => {
    const out = buf(1.2);
    layer(out, blips(R, ['C5', 'E5', 'G5', 'C6', 'E6', 'G6'].map((n) => [N(n), 0.06]), { pw: 0.25 }), 0.5);
    ['C7', 'G7'].forEach((n, i) => mix(out, bell(R, N(n), 0.6), 0.2, 0.36 + i * 0.08));
    return snes(echo(out, 0.12, 0.3, 2), { bits: 8, p: 0.7 });
  }, UI),
  ui_buy: def((R) => {
    const out = buf(0.8);
    layer(out, bell(R, N('B5'), 0.3), 0.5); layer(out, bell(R, N('E6'), 0.6), 0.6, 0.08);
    layer(out, clack(R, 2500, 0.04), 0.3);
    return snes(echo(out, 0.08, 0.25, 2), { bits: 8, p: 0.65 });
  }, UI),
  ui_sell: def((R) => {
    const out = buf(0.7);
    for (let k = 0; k < 5; k++) layer(out, ping(R, R.r(2600, 4200), 0.2, 2.76, 1.5), 0.35, k * 0.05 + R() * 0.02);
    layer(out, bell(R, N('A5'), 0.4), 0.4, 0.25);
    return snes(out, { bits: 8, p: 0.6 });
  }, UI),
  ui_levelup: def((R) => {
    const out = buf(1.6);
    layer(out, blips(R, ['G4', 'C5', 'E5', 'G5', 'C6'].map((n) => [N(n), 0.07]).concat([[N('E6'), 0.4]]), { pw: 0.25, vib: 0.01 }), 0.5);
    ['C6', 'E6', 'G6', 'C7'].forEach((n, i) => mix(out, bell(R, N(n), 0.9), 0.22, 0.42 + i * 0.06));
    return snes(echo(out, 0.14, 0.3, 2), { bits: 8, p: 0.75 });
  }, { ...UI, vol: 0.65 }),
  ui_quest: def((R) => {
    const out = buf(1.2);
    layer(out, blips(R, [[N('D5'), 0.1], [N('A5'), 0.1], [N('F#5'), 0.3]], { wave: 'sq', pw: 0.5 }), 0.4);
    layer(out, bell(R, N('D6'), 0.8), 0.3, 0.22);
    return snes(echo(out, 0.14, 0.3, 2), { bits: 8, p: 0.65 });
  }, UI),
  chat_msg: def(ui([[N('A5'), 0.04], [0, 0.03], [N('D6'), 0.06]], { pw: 0.25 }), { ...UI, vol: 0.4 }),
  ui_type: def((R) => {
    const out = buf(0.05); layer(out, click(R, R.r(2500, 3500), 0.012, 3), 1);
    return snes(out, { bits: 8, p: 0.5 });
  }, { ...UI, vol: 0.3, v: 4, pj: 0.08, max: 4 }),

  // ---------------------------------------------------------------- ambience (loops)
  rain_loop: def((R) => snes(seamless(rain(R, 4.4, 1, 0), 0.4), { bits: 10, fade: 0, p: 0.7 }), AMB),
  storm_loop: def((R) => {
    const out = rain(R, 6.5, 1.8, 1);
    layer(out, wind(R, 6.5, 420, 0.8, 0.7), 0.5);
    return snes(seamless(out, 0.5), { bits: 10, fade: 0, p: 0.8 });
  }, AMB),
  wind_loop: def((R) => snes(seamless(wind(R, 6.5, 520, 1.0, 0.7), 0.5), { bits: 10, fade: 0, p: 0.7 }), AMB),
  water_loop: def((R) => {
    const d = 4.4, out = buf(d);
    const bed = noise(d, 'pink', R); filt(bed, 'lp', 1400); filt(bed, 'hp', 200); layer(out, bed, 0.5);
    for (let k = 0; k < 90; k++) mix(out, bubble(R, R.r(350, 1500), R.r(0.03, 0.09)), R.r(0.1, 0.4), R() * (d - 0.1));
    return snes(seamless(out, 0.4), { bits: 10, fade: 0, p: 0.65 });
  }, { ...AMB, dist: 25 }),
  forest_loop: def((R) => {
    const d = 6.5, out = buf(d);
    const lv = noise(d, 'pink', R); filt(lv, 'hp', 1800); filt(lv, 'lp', 6000); am(lv, 2 / 6, 0.5); layer(out, lv, 0.4);
    layer(out, wind(R, d, 350, 0.8, 0.5), 0.35);
    for (let k = 0; k < 4; k++) {           // crickets / insects
      const t = R() * (d - 0.8), c = osc(0.7, { f: R.r(4200, 5200) }); am(c, R.r(28, 40), 1, 4); env(c, [[0, 0], [0.1, 1], [0.6, 1], [0.7, 0]]);
      mix(out, c, 0.07, t);
    }
    for (let k = 0; k < 2; k++) mix(out, birdChirp(R, R.r(2000, 3200), 1), 0.12, R() * (d - 1));
    return snes(seamless(out, 0.5), { bits: 10, fade: 0, p: 0.6 });
  }, AMB),
  desert_loop: def((R) => {
    const d = 6.5, out = buf(d);
    layer(out, wind(R, d, 320, 0.7, 0.6), 0.6);
    const hiss = noise(d, 'white', R); filt(hiss, 'bp', 3200, 3200, 0.8); am(hiss, 3 / 6, 0.7, 2); layer(out, hiss, 0.15);
    const grains = buf(d);
    for (let k = 0; k < 160; k++) mix(grains, click(R, R.r(3000, 7000), 0.004, 2), R.r(0.1, 0.6), R() * (d - 0.02));
    layer(out, grains, 0.08);
    return snes(seamless(out, 0.5), { bits: 10, fade: 0, p: 0.6 });
  }, AMB),
  birds: def((R) => {
    const d = 8, out = buf(d);
    for (let k = 0; k < 6; k++) mix(out, birdChirp(R, R.r(2400, 4200), k % 2), R.r(0.3, 0.8), 0.2 + k * 1.25 + R() * 0.5);
    return snes(echo(out, 0.21, 0.2, 1).subarray(0, d * SR), { bits: 10, fade: 0.05, p: 0.55 });
  }, { ...AMB, dist: 40 }),
  thunder: def((R) => {
    const d = 4.5, out = buf(d), at = R.r(0, 0.25);
    const cr = noise(0.5, 'crunch', R, 2); filt(cr, 'lp', 5000, 600, 1); ad(cr, 0.003, 0.4); layer(out, cr, 0.6 * (1 - at * 2), at);
    const r = noise(d, 'brown', R); filtFn(r, 'lp', (t) => 900 * Math.exp(-t * 0.8) + 120, 1);
    for (let i = 0; i < r.length; i++) { const t = i / SR; r[i] *= Math.min(1, t / (0.08 + at)) * Math.exp(-t * 0.85) * (0.6 + 0.4 * Math.sin(t * R.r(5, 9))); }
    layer(out, r, 1);
    return snes(out, { drv: 1.8, bits: 9, hold: 2, p: 0.95, fade: 0.3 });
  }, { v: 4, vol: 0.9, dist: 1e9, max: 2, pj: 0.08, prio: 3, duck: 0.2 }),
};
