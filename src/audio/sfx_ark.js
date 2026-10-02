// ARK machine sounds: metallic FM, rotors, servos, alarms.
import { SR, buf, noise, osc, fm, metal, ad, env, filt, filtFn, layer, mix, snes, am, seamless, comb, echo } from './dsp.js';
import { def, gunshot, explosion, click, clack, whoosh, thump, ping, rotor, sparks, servo, chirp, N } from './sfx_lib.js';

const ARK_LOOP = { loop: true, v: 1, pj: 0, vol: 0.55, dist: 50, max: 6 };

export const ARKS = {
  wazp_loop: def((R) => {
    const out = rotor(R, 2.3, 92, 184, { body: 1100, whineG: 0.45, chopDepth: 0.8 });
    const g = fm(2.3, { f: 368, ratio: 1.5, index: 0.6, vib: 0.01, vibHz: 2 }); layer(out, g, 0.15);
    return snes(seamless(out, 0.3), { bits: 8, fade: 0, p: 0.75 });
  }, ARK_LOOP),
  hornit_loop: def((R) => {
    const out = rotor(R, 2.3, 57, 114, { body: 650, whineG: 0.55, chopDepth: 0.9, lowG: 0.8 });
    const g = metal(2.3, 210, R); filt(g, 'bp', 1600, 1600, 3); am(g, 28.5, 0.6); layer(out, g, 0.18);
    return snes(seamless(out, 0.3), { drv: 1.3, bits: 8, fade: 0, p: 0.8 });
  }, { ...ARK_LOOP, vol: 0.65, dist: 60 }),
  ark_alert: def((R) => {
    const out = buf(1.0);
    for (const [t, f] of [[0, N('B4')], [0.16, N('F5')]]) {
      const s = fm(0.5, { f, ratio: 1.0, index: 3, index1: 1, fb: 0.4 }); ad(s, 0.002, 0.45, 0.08); layer(out, s, 0.5, t);
      const q = osc(0.35, { wave: 'rawsq', f: f / 2, pw: 0.25 }); ad(q, 0.002, 0.3, 0.05); layer(out, q, 0.3, t);
      layer(out, metal(0.12, f * 0.5, R), 0.15, t);
    }
    return snes(echo(out, 0.11, 0.3, 2), { drv: 1.8, bits: 7, p: 0.85 });
  }, { vol: 0.75, dist: 60, max: 2, prio: 4, v: 2, pj: 0.01 }),
  ark_lost: def((R) => {
    const out = buf(1.0);
    [N('F5'), N('D5'), N('B4')].forEach((f, i) => {
      const s = fm(0.3, { f, f1: f * 0.97, ratio: 1, index: 1.5, vib: 0.02, vibHz: 8 }); ad(s, 0.005, 0.28); layer(out, s, 0.4, i * 0.17);
    });
    return snes(echo(out, 0.12, 0.25, 2), { bits: 7, p: 0.6 });
  }, { vol: 0.6, dist: 50, max: 2, v: 1, pj: 0 }),
  tikk_skitter: def((R) => {
    const out = buf(0.55);
    for (let t = 0; t < 0.48; t += R.r(0.018, 0.04)) mix(out, clack(R, R.r(2500, 4200), 0.02), R.r(0.3, 0.8), t);
    const s = servo(R, 900, 0.5, 1.3); layer(out, s, 0.15);
    return snes(out, { bits: 8, p: 0.6 });
  }, { vol: 0.55, dist: 25, max: 6, pj: 0.08 }),
  tikk_leap: def((R) => {
    const out = buf(0.6);
    const sp = osc(0.3, { wave: 'tri', f: 160, f1: 520, vib: 0.08, vibHz: 25 }); ad(sp, 0.002, 0.3); layer(out, sp, 0.5);
    const sc = fm(0.4, { f: 1200, f1: 3000, ratio: 1.5, index: 2 }); env(sc, [[0, 0], [0.05, 1], [0.4, 0]]); layer(out, sc, 0.4, 0.04);
    layer(out, click(R, 2500, 0.03), 0.6);
    return snes(out, { bits: 7, p: 0.7 });
  }, { vol: 0.65, dist: 28, max: 4 }),
  popp_beep: def((R) => {
    const out = buf(0.14);
    const b = osc(0.09, { wave: 'rawsq', f: 2200, pw: 0.5 }); ad(b, 0.001, 0.08, 0.04); layer(out, b, 1);
    return snes(out, { bits: 8, p: 0.5 });
  }, { vol: 0.6, dist: 30, max: 6, pj: 0 }),
  popp_roll_loop: def((R) => {
    const d = 2, out = buf(d + 0.25);
    const r = noise(d + 0.25, 'brown', R); filt(r, 'lp', 420); am(r, 6, 0.5); layer(out, r, 0.8);
    for (let t = 0; t < d + 0.2; t += 1 / 6) mix(out, clack(R, R.r(700, 1000), 0.05), 0.3, t + R() * 0.01);
    const w = osc(d + 0.25, { wave: 'sq', pw: 0.3, f: 300, vib: 0.02, vibHz: 3 }); filt(w, 'bp', 900, 900, 3); layer(out, w, 0.15);
    return snes(seamless(out, 0.25), { bits: 8, fade: 0, p: 0.7 });
  }, { ...ARK_LOOP, vol: 0.5, dist: 30 }),
  fyreball_flame_loop: def((R) => {
    const d = 2.5, out = buf(d + 0.3);
    const roar = noise(d + 0.3, 'white', R); filt(roar, 'lp', 1300); am(roar, 11, 0.35); layer(out, roar, 0.8);
    const low = noise(d + 0.3, 'brown', R); filt(low, 'lp', 260); layer(out, low, 0.7);
    const hiss = noise(d + 0.3, 'white', R); filt(hiss, 'hp', 4500); am(hiss, 17, 0.5); layer(out, hiss, 0.25);
    return snes(seamless(out, 0.3), { drv: 1.6, bits: 8, fade: 0, p: 0.8 });
  }, { ...ARK_LOOP, vol: 0.65, dist: 35 }),
  snytch_alarm: def((R) => {
    const d = 2.0, out = buf(d);
    const s = osc(d, { wave: 'rawsq', pw: 0.4, fn: (t) => 900 + 380 * Math.sin(2 * Math.PI * 2 * t - Math.PI / 2) });
    filt(s, 'lp', 3500); env(s, [[0, 0], [0.03, 1], [d - 0.1, 1], [d, 0]]); layer(out, s, 0.6);
    const t2 = osc(d, { wave: 'sq', pw: 0.5, fn: (t) => 450 + 190 * Math.sin(2 * Math.PI * 2 * t - Math.PI / 2) });
    env(t2, [[0, 0], [0.03, 1], [d - 0.1, 1], [d, 0]]); layer(out, t2, 0.25);
    return snes(out, { bits: 7, p: 0.75 });
  }, { vol: 0.65, dist: 70, max: 2, prio: 4, v: 1, pj: 0 }),
  surveyr_scan: def((R) => {
    const d = 1.6, out = buf(d);
    const s = osc(d, { f: 600, fn: (t) => 500 + 1500 * ((t * 1.25) % 1) }); env(s, [[0, 0], [0.05, 1], [d - 0.1, 0.8], [d, 0]]);
    am(s, 10, 0.6); layer(out, s, 0.3);
    for (const t of [0, 0.8]) { const p = fm(0.6, { f: 1760, ratio: 2, index: 1, index1: 0 }); ad(p, 0.001, 0.6); layer(out, p, 0.45, t); }
    return snes(echo(out, 0.2, 0.3, 2), { bits: 8, p: 0.6 });
  }, { vol: 0.55, dist: 45, max: 2, v: 2 }),
  sentinal_charge: def((R) => {
    const d = 1.3, out = buf(d);
    const s = osc(d, { wave: 'saw', f: 280, f1: 2600, curve: 'exp' }); filt(s, 'lp', 1200, 6000, 3);
    for (let i = 0; i < s.length; i++) { const t = i / SR; s[i] *= 0.55 + 0.45 * Math.sin(2 * Math.PI * (5 * t + 18 * t * t)); }
    env(s, [[0, 0], [0.1, 0.5], [d - 0.03, 1], [d, 0]]); layer(out, s, 0.55);
    layer(out, sparks(R, d, 18), 0.2);
    const h = fm(d, { f: 900, f1: 4000, ratio: 1.5, index: 1 }); env(h, [[0, 0], [d, 1]]); layer(out, h, 0.25);
    return snes(out, { bits: 7, p: 0.75 });
  }, { vol: 0.7, dist: 80, max: 2, prio: 4, pj: 0.01 }),
  sentinal_shot: def((R) => {
    const out = buf(1.0);
    const z = fm(0.6, { f: 3200, f1: 110, sweep: 0.5, ratio: 0.5, index: 5, index1: 0.5 }); ad(z, 0.001, 0.55); layer(out, z, 0.9);
    const n = noise(0.2, 'crunch', R, 2); filt(n, 'lp', 6000, 800, 1); ad(n, 0.0005, 0.15); layer(out, n, 0.8);
    layer(out, thump(R, 90, 35, 0.35, 0.1), 0.8);
    const tl = noise(0.8, 'brown', R); filt(tl, 'lp', 600); ad(tl, 0.01, 0.7); layer(out, tl, 0.3, 0.02);
    return snes(out, { drv: 2.2, bits: 7, p: 0.95 });
  }, { vol: 0.95, dist: 130, max: 3, prio: 4 }),
  turret_spin: def((R) => {
    const d = 0.9, out = buf(d);
    const s = osc(d, { wave: 'saw', f: 55, f1: 420, sweep: 0.75 }); filt(s, 'lp', 2000); env(s, [[0, 0], [0.05, 1], [d - 0.05, 1], [d, 0]]);
    layer(out, s, 0.5);
    let t = 0, dt = 0.07; while (t < d - 0.05) { mix(out, click(R, 2600, 0.01, 3), 0.25, t); t += dt; dt = Math.max(0.018, dt * 0.88); }
    return snes(out, { bits: 8, p: 0.65 });
  }, { vol: 0.6, dist: 45, max: 2 }),
  rocketier_loop: def((R) => {
    const d = 2.2, out = buf(d + 0.3);
    const j = noise(d + 0.3, 'white', R); filt(j, 'bp', 900, 900, 0.8); am(j, 30, 0.25); layer(out, j, 0.8);
    const l = noise(d + 0.3, 'brown', R); filt(l, 'lp', 300); layer(out, l, 0.7);
    const w = osc(d + 0.3, { wave: 'saw', f: 880, vib: 0.008, vibHz: 4 }); filt(w, 'lp', 2500); layer(out, w, 0.12);
    return snes(seamless(out, 0.3), { drv: 1.4, bits: 8, fade: 0, p: 0.8 });
  }, { ...ARK_LOOP, vol: 0.6, dist: 70 }),
  rocket_launch: def((R) => {
    const out = buf(1.4);
    layer(out, thump(R, 110, 45, 0.25, 0.06), 0.8);
    const ig = noise(0.1, 'crunch', R, 2); filt(ig, 'lp', 4000); ad(ig, 0.001, 0.08); layer(out, ig, 0.8);
    layer(out, whoosh(R, 1.2, 500, 2600, 0.9), 0.8, 0.03);
    const h = noise(1.3, 'white', R); filt(h, 'hp', 3000); env(h, [[0, 0], [0.05, 1], [1.3, 0]]); layer(out, h, 0.3);
    return snes(out, { drv: 1.8, bits: 8, p: 0.9 });
  }, { vol: 0.85, dist: 100, max: 4, prio: 3 }),
  leapr_stomp: def((R) => {
    const out = buf(1.3);
    layer(out, thump(R, 55, 24, 0.9, 0.2), 1);
    layer(out, ping(R, 180, 0.9, 2.76, 5), 0.45, 0.005);
    const d = noise(0.7, 'crunch', R, 3); filt(d, 'lp', 2200, 200, 1); ad(d, 0.002, 0.6); layer(out, d, 0.6);
    for (let k = 0; k < 10; k++) mix(out, click(R, R.r(600, 2000), 0.03, 2), 0.2, 0.05 + R() * 0.7);
    return snes(out, { drv: 2.4, bits: 8, hold: 2, p: 0.97 });
  }, { vol: 1, dist: 90, max: 3, prio: 4, duck: 0.3 }),
  leapr_jump: def((R) => {
    const out = buf(1.0);
    const h = noise(0.45, 'white', R); filt(h, 'bp', 2400, 1200, 1.2); env(h, [[0, 0], [0.03, 1], [0.45, 0]]); layer(out, h, 0.6);
    layer(out, servo(R, 160, 0.4, 2.2), 0.4);
    layer(out, thump(R, 80, 35, 0.4, 0.1), 0.8, 0.02);
    layer(out, whoosh(R, 0.5, 250, 900, 1), 0.4, 0.3);
    return snes(out, { drv: 1.6, bits: 8, p: 0.85 });
  }, { vol: 0.85, dist: 80, max: 3, prio: 3 }),
  bastian_step: def((R) => {
    const out = buf(0.9);
    layer(out, thump(R, 70, 30, 0.55, 0.12), 1);
    layer(out, servo(R, 130, 0.35, 1.5), 0.3);
    layer(out, clack(R, 600, 0.15), 0.4, 0.02);
    layer(out, ping(R, 260, 0.5, 2.76, 3), 0.2, 0.01);
    return snes(out, { drv: 2, bits: 8, p: 0.9 });
  }, { vol: 0.85, dist: 70, max: 4, prio: 3, v: 4, pj: 0.06 }),
  bastian_minigun_loop: def((R) => {
    const d = 1.0, rate = 25, out = buf(d + 0.2);
    const shot = () => gunshot(R, { dur: 0.12, crackF: 2400, crackDec: 0.02, bodyF: 900, bodyDec: 0.05, thumpF: 120, thumpF1: 50, thumpDec: 0.05, tailG: 0, bits: 8 });
    const shots = [shot(), shot(), shot()];
    for (let k = 0; k < (d + 0.2) * rate; k++) mix(out, shots[k % 3], R.r(0.65, 1), k / rate);
    const m = osc(d + 0.2, { wave: 'saw', f: 75, vib: 0.01, vibHz: 6 }); filt(m, 'lp', 600); layer(out, m, 0.3);
    const tl = noise(d + 0.2, 'brown', R); filt(tl, 'lp', 500); layer(out, tl, 0.35);
    return snes(seamless(out, 0.2), { drv: 2.2, bits: 8, fade: 0, p: 0.9 });
  }, { ...ARK_LOOP, vol: 0.8, dist: 110, prio: 4 }),
  bombadier_mortar: def((R) => {
    const out = buf(2.2);
    layer(out, thump(R, 60, 28, 0.6, 0.15), 1);
    const tube = noise(0.4, 'white', R); filt(tube, 'lp', 700); comb(tube, 1 / 140, 0.75, 0.4); ad(tube, 0.001, 0.35); layer(out, tube, 0.6);
    const tl = noise(1.0, 'brown', R); filt(tl, 'lp', 400); ad(tl, 0.02, 0.9); layer(out, tl, 0.4, 0.02);
    const wh = osc(1.1, { f: 2400, f1: 1300, vib: 0.01, vibHz: 7 }); env(wh, [[0, 0], [0.5, 0.25], [1.1, 0]]); layer(out, wh, 0.12, 0.95);
    return snes(out, { drv: 2.2, bits: 8, hold: 2, p: 0.95 });
  }, { vol: 0.95, dist: 140, max: 3, prio: 4 }),
  ark_death_small: def((R) => {
    const out = buf(1.0);
    layer(out, sparks(R, 0.8, 28), 0.6);
    const dn = fm(0.6, { f: 900, f1: 90, ratio: 1.41, index: 4, index1: 1 }); ad(dn, 0.002, 0.55); layer(out, dn, 0.6);
    const p = noise(0.2, 'crunch', R, 2); filt(p, 'lp', 3000, 500, 1); ad(p, 0.001, 0.18); layer(out, p, 0.8);
    layer(out, thump(R, 120, 45, 0.3, 0.08), 0.6);
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
  queen_roar: def((R) => {
    const d = 3.2, out = buf(d);
    const g = fm(d, { f: 95, fn: null, f1: 48, ratio: 0.5, index: 6, index1: 2, vib: 0.05, vibHz: 7 });
    env(g, [[0, 0], [0.35, 1], [2.2, 0.8], [d, 0]]); layer(out, g, 0.8);
    const s = osc(d, { wave: 'saw', f: 190, f1: 70, vib: 0.03, vibHz: 11 }); filtFn(s, 'bp', (t) => 400 + 900 * Math.sin(Math.PI * t / d), 3);
    env(s, [[0, 0], [0.3, 1], [d, 0]]); layer(out, s, 0.5);
    const n = noise(d, 'crunch', R, 3); filt(n, 'lp', 2000, 300, 1); env(n, [[0, 0], [0.2, 1], [d, 0]]); am(n, 23, 0.5); layer(out, n, 0.5);
    layer(out, thump(R, 45, 22, 1.5, 0.5), 0.8);
    return snes(out, { drv: 2.6, bits: 7, hold: 2, p: 0.98 });
  }, { vol: 1, dist: 220, max: 1, prio: 5, duck: 0.6, v: 2, pj: 0.03 }),
};
