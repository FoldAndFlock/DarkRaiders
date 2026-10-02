// Weapon fire, handling and impact sounds.
import { buf, noise, osc, fm, ad, env, filt, layer, mix, snes, am, seamless } from './dsp.js';
import { def, gunshot, click, clack, rustle, thump, ping, sparks } from './sfx_lib.js';

const GUN = { max: 8, dist: 90, prio: 3, pj: 0.05 };

export const WEAPONS = {
  gun_pistol: def((R) => gunshot(R, {
    dur: 0.45, crackF: 3000, crackDec: 0.04, bodyF: 1150, bodyDec: 0.09, thumpF: 135, thumpF1: 55,
    thumpDec: 0.09, thumpG: 0.8, tailDec: 0.32, tailG: 0.22, mech: 0.25, bits: 9,
  }), { ...GUN, vol: 0.8 }),
  gun_smg: def((R) => gunshot(R, {
    dur: 0.33, crackF: 3400, crackDec: 0.03, bodyF: 1300, bodyDec: 0.07, thumpF: 140, thumpF1: 60,
    thumpDec: 0.07, thumpG: 0.7, tailDec: 0.22, tailG: 0.2, bits: 8, hold: 2,
  }), { ...GUN, vol: 0.7, max: 10 }),
  gun_rifle: def((R) => gunshot(R, {
    dur: 0.6, crackF: 2600, crackDec: 0.045, bodyF: 950, bodyDec: 0.11, thumpF: 115, thumpF1: 42,
    tailDec: 0.5, tailG: 0.3, bits: 9,
  }), { ...GUN, vol: 0.85, max: 10 }),
  gun_battle_rifle: def((R) => gunshot(R, {
    dur: 0.8, crackF: 2200, crackDec: 0.06, bodyF: 750, bodyDec: 0.15, thumpF: 95, thumpF1: 36,
    thumpDec: 0.18, tailDec: 0.7, tailG: 0.38, drv: 2.8, bits: 8,
  }), { ...GUN, vol: 0.95, dist: 100 }),
  gun_lmg: def((R) => gunshot(R, {
    dur: 0.6, crackF: 2400, crackDec: 0.05, bodyF: 820, bodyDec: 0.12, thumpF: 100, thumpF1: 38,
    thumpDec: 0.14, tailDec: 0.5, tailG: 0.3, drv: 3, bits: 8, hold: 2,
  }), { ...GUN, vol: 0.85, max: 10, dist: 100 }),
  gun_shotgun: def((R) => gunshot(R, {
    dur: 1.0, crackF: 1800, crackQ: 0.5, crackDec: 0.07, bodyF: 1400, bodyDec: 0.22, bodyG: 1.0,
    thumpF: 85, thumpF1: 32, thumpDec: 0.25, tailF: 600, tailDec: 0.85, tailG: 0.42, drv: 3.2, bits: 8, hold: 2,
  }), { ...GUN, vol: 1, dist: 90 }),
  gun_sniper: def((R) => gunshot(R, {
    dur: 1.9, crackF: 3300, crackDec: 0.07, crackG: 1, bodyF: 650, bodyDec: 0.16, thumpF: 75, thumpF1: 28,
    thumpDec: 0.3, tailF: 520, tailDec: 1.4, tailG: 0.45, slap: 0.32, slapG: 0.3, drv: 3, bits: 9,
  }), { ...GUN, vol: 1, dist: 160 }),
  gun_marksman: def((R) => gunshot(R, {
    dur: 1.1, crackF: 2900, crackDec: 0.055, bodyF: 800, bodyDec: 0.13, thumpF: 95, thumpF1: 34,
    thumpDec: 0.2, tailDec: 0.9, tailG: 0.38, slap: 0.22, slapG: 0.18, bits: 9,
  }), { ...GUN, vol: 0.95, dist: 120 }),
  gun_suppressed: def((R) => {
    const out = buf(0.28);
    const b = noise(0.12, 'white', R); filt(b, 'lp', 1700 * R.j(0.15), 500, 1.4); ad(b, 0.001, 0.08);
    layer(out, b, 0.9);
    const t = thump(R, 120, 60, 0.1, 0.05); layer(out, t, 0.6);
    layer(out, click(R, 4200, 0.02), 0.45, 0.02);
    layer(out, clack(R, 2600, 0.05), 0.3, 0.045);
    return snes(out, { drv: 1.6, bits: 9, p: 0.8 });
  }, { ...GUN, vol: 0.6, dist: 22 }),
  gun_energy: def((R) => {
    const out = buf(0.55);
    const z = fm(0.35, { f: 1700 * R.j(0.08), f1: 160, sweep: 0.3, ratio: 0.5, index: 4, index1: 0.5 });
    ad(z, 0.001, 0.3); layer(out, z, 0.9);
    const sq = osc(0.2, { wave: 'rawsq', f: 900, f1: 120, pw: 0.25 }); ad(sq, 0.001, 0.18); layer(out, sq, 0.4);
    const n = noise(0.08, 'crunch', R, 3); filt(n, 'hp', 2000); ad(n, 0.0005, 0.06); layer(out, n, 0.5);
    const tl = fm(0.5, { f: 300, f1: 90, ratio: 1.5, index: 1 }); ad(tl, 0.02, 0.45); layer(out, tl, 0.25, 0.04);
    return snes(out, { drv: 1.8, bits: 7, p: 0.85 });
  }, { ...GUN, vol: 0.75, dist: 70 }),
  gun_beam_loop: def((R) => {
    const d = 2, out = buf(d + 0.3);
    const s = osc(d + 0.3, { wave: 'saw', f: 110, vib: 0.01, vibHz: 7 }); filt(s, 'lp', 2400, 2400, 3);
    am(s, 37, 0.5); layer(out, s, 0.7);
    const f2 = fm(d + 0.3, { f: 440, ratio: 1.01, index: 2.5, vib: 0.004, vibHz: 11 }); layer(out, f2, 0.4);
    const n = noise(d + 0.3, 'crunch', R, 2); filt(n, 'hp', 3500); am(n, 23, 0.7); layer(out, n, 0.35);
    return snes(seamless(out, 0.3), { bits: 8, fade: 0, p: 0.75 });
  }, { loop: true, v: 1, vol: 0.55, dist: 60, pj: 0 }),
  gun_launcher: def((R) => {
    const out = buf(1.3);
    layer(out, thump(R, 75, 38, 0.35, 0.08), 1);
    const p = noise(0.25, 'white', R); filt(p, 'lp', 2400, 400, 1); ad(p, 0.002, 0.2); layer(out, p, 0.8);
    layer(out, clack(R, 900, 0.1), 0.4, 0.01);
    const h = noise(1.1, 'white', R); filt(h, 'bp', 2200, 1200, 1.4); env(h, [[0, 0], [0.08, 1], [0.6, 0.7], [1.1, 0]]);
    layer(out, h, 0.4, 0.08);
    return snes(out, { drv: 2.4, bits: 8, p: 0.95 });
  }, { ...GUN, vol: 0.95, dist: 90 }),

  reload_start: def((R) => {
    const out = buf(0.45);
    layer(out, click(R, 3200, 0.02), 0.8);
    layer(out, clack(R, 1500, 0.07), 0.7, 0.05);
    const sc = noise(0.18, 'white', R); filt(sc, 'bp', 2500, 1800, 2); env(sc, [[0, 0], [0.05, 1], [0.18, 0]]);
    layer(out, sc, 0.35, 0.12);
    layer(out, thump(R, 220, 120, 0.08, 0.03), 0.3, 0.3);
    return snes(out, { bits: 9, p: 0.7 });
  }, { vol: 0.6, dist: 18, max: 2 }),
  reload_end: def((R) => {
    const out = buf(0.4);
    layer(out, clack(R, 1300, 0.08), 0.9);
    layer(out, click(R, 2600, 0.03), 0.6, 0.15);
    layer(out, clack(R, 1900, 0.06), 0.9, 0.22);
    return snes(out, { bits: 9, p: 0.75 });
  }, { vol: 0.65, dist: 18, max: 2 }),
  dry_fire: def((R) => {
    const out = buf(0.08); layer(out, click(R, 3500, 0.02, 6), 1); layer(out, click(R, 1200, 0.03, 3), 0.4, 0.008);
    return snes(out, { bits: 9, p: 0.6 });
  }, { vol: 0.6, dist: 10, max: 2 }),
  weapon_switch: def((R) => {
    const out = buf(0.4);
    layer(out, rustle(R, 0.22, 1800), 0.6);
    layer(out, clack(R, 1600, 0.07), 0.8, 0.18);
    layer(out, click(R, 3000, 0.02), 0.5, 0.27);
    return snes(out, { bits: 9, p: 0.65 });
  }, { vol: 0.6, dist: 12, max: 2 }),
  bolt_cycle: def((R) => {
    const out = buf(0.55);
    layer(out, clack(R, 1400, 0.05), 0.7);
    const sc = noise(0.12, 'white', R); filt(sc, 'bp', 3000, 1500, 2); ad(sc, 0.01, 0.1); layer(out, sc, 0.5, 0.06);
    layer(out, clack(R, 1700, 0.06), 0.9, 0.2);
    layer(out, click(R, 2600, 0.03), 0.6, 0.33);
    return snes(out, { bits: 9, p: 0.7 });
  }, { vol: 0.65, dist: 18, max: 2 }),
  pump_cycle: def((R) => {
    const out = buf(0.5);
    for (const [t, f] of [[0, 900], [0.17, 1100]]) {
      const n = noise(0.12, 'white', R); filt(n, 'bp', f * 2, f, 1.5); ad(n, 0.002, 0.09); layer(out, n, 0.8, t);
      layer(out, clack(R, f, 0.08), 0.7, t + 0.005);
      layer(out, thump(R, 200, 110, 0.07, 0.03), 0.4, t);
    }
    return snes(out, { drv: 1.5, bits: 8, p: 0.75 });
  }, { vol: 0.7, dist: 20, max: 2 }),
  charge_up: def((R) => {
    const d = 1.0, out = buf(d);
    const s = osc(d, { wave: 'rawsq', f: 180, f1: 1500, pw: 0.3 }); filt(s, 'lp', 900, 5000, 2);
    for (let i = 0; i < s.length; i++) { const t = i / 32000; s[i] *= 0.6 + 0.4 * Math.sin(2 * Math.PI * (6 * t + 14 * t * t)); }
    env(s, [[0, 0], [0.1, 0.6], [d - 0.05, 1], [d, 0]]); layer(out, s, 0.6);
    const f2 = fm(d, { f: 300, f1: 2400, ratio: 2, index: 1.5 }); env(f2, [[0, 0], [d, 1]]); layer(out, f2, 0.35);
    return snes(out, { bits: 7, p: 0.7 });
  }, { vol: 0.6, dist: 25, max: 2, pj: 0.02 }),

  // ---------------------------------------------------------------- impacts
  hit_metal: def((R) => {
    const out = buf(0.45);
    layer(out, ping(R, R.r(1300, 2600), 0.4, 2.76, 3), 0.8);
    layer(out, click(R, 5000, 0.015, 2), 0.9);
    layer(out, ping(R, R.r(3000, 4500), 0.15, 1.41, 2), 0.3, 0.002);
    return snes(out, { bits: 8, p: 0.75 });
  }, { vol: 0.6, dist: 35, max: 6, pj: 0.08 }),
  hit_concrete: def((R) => {
    const out = buf(0.35);
    const n = noise(0.1, 'crunch', R, 2); filt(n, 'bp', 1900 * R.j(0.2), 900, 1.2); ad(n, 0.0005, 0.07); layer(out, n, 1);
    layer(out, thump(R, 180, 90, 0.06, 0.03), 0.35);
    for (let k = 0; k < 5; k++) mix(out, click(R, R.r(1500, 4000), 0.01, 2), 0.15, 0.04 + R() * 0.25);
    return snes(out, { bits: 8, hold: 2, p: 0.7 });
  }, { vol: 0.55, dist: 30, max: 6, pj: 0.08 }),
  hit_dirt: def((R) => {
    const out = buf(0.3);
    const n = noise(0.14, 'white', R); filt(n, 'lp', 900 * R.j(0.2), 300, 1); ad(n, 0.001, 0.1); layer(out, n, 1);
    layer(out, thump(R, 120, 60, 0.08, 0.04), 0.5);
    const s = noise(0.25, 'white', R); filt(s, 'hp', 3000); env(s, [[0, 0], [0.03, 0.6], [0.25, 0]]); layer(out, s, 0.25, 0.02);
    return snes(out, { bits: 8, p: 0.65 });
  }, { vol: 0.5, dist: 25, max: 6, pj: 0.1 }),
  hit_wood: def((R) => {
    const out = buf(0.3);
    const n = noise(0.18, 'white', R); filt(n, 'bp', R.r(380, 650), R.r(300, 500), 5); ad(n, 0.0008, 0.14); layer(out, n, 1);
    layer(out, click(R, 2500, 0.012, 2), 0.6);
    for (let k = 0; k < 3; k++) mix(out, click(R, R.r(1000, 2500), 0.01, 3), 0.12, 0.03 + R() * 0.12);
    return snes(out, { bits: 8, p: 0.7 });
  }, { vol: 0.55, dist: 28, max: 6, pj: 0.1 }),
  hit_flesh: def((R) => {
    const out = buf(0.3);
    const n = noise(0.15, 'white', R); filt(n, 'lp', 600, 250, 1.5); ad(n, 0.001, 0.12); layer(out, n, 1);
    layer(out, thump(R, 130, 55, 0.12, 0.05), 0.7);
    const sq = noise(0.1, 'white', R); filt(sq, 'bp', 700, 1600, 3); ad(sq, 0.005, 0.08); layer(out, sq, 0.3, 0.015);
    return snes(out, { drv: 1.5, bits: 8, p: 0.75 });
  }, { vol: 0.6, dist: 25, max: 5, pj: 0.1 }),
  hit_shield: def((R) => {
    const out = buf(0.45);
    const z = fm(0.4, { f: 950 * R.j(0.1), f1: 600, ratio: 1.5, index: 3, index1: 0.3 }); ad(z, 0.001, 0.35); layer(out, z, 0.9);
    const n = noise(0.2, 'crunch', R, 1); filt(n, 'hp', 4000); am(n, 60, 0.6); ad(n, 0.001, 0.15); layer(out, n, 0.4);
    layer(out, ping(R, 2600, 0.25, 1.01, 1.5), 0.3);
    return snes(out, { bits: 8, p: 0.7 });
  }, { vol: 0.6, dist: 30, max: 5 }),
  shield_break: def((R) => {
    const out = buf(1.1);
    const sw = fm(0.6, { f: 1400, f1: 120, ratio: 1.5, index: 4, index1: 0.5 }); ad(sw, 0.002, 0.55); layer(out, sw, 0.8);
    for (let k = 0; k < 14; k++) mix(out, ping(R, R.r(2000, 5000), R.r(0.1, 0.3), R.pick([2.76, 3.5, 1.41]), 2), 0.25, Math.pow(R(), 1.5) * 0.6);
    const n = noise(0.5, 'crunch', R, 2); filt(n, 'hp', 2500); ad(n, 0.001, 0.4); layer(out, n, 0.45);
    layer(out, thump(R, 150, 50, 0.25, 0.1), 0.5);
    return snes(out, { drv: 1.6, bits: 8, p: 0.9 });
  }, { vol: 0.85, dist: 35, max: 3, prio: 3 }),
  hit_ark_weakpoint: def((R) => {
    const out = buf(0.4);
    const b = osc(0.12, { wave: 'rawsq', f: 1200, f1: 2600, pw: 0.25, sweep: 0.06 }); ad(b, 0.001, 0.1); layer(out, b, 0.55);
    layer(out, ping(R, 3100, 0.35, 2.76, 3.5), 0.6, 0.01);
    layer(out, click(R, 5500, 0.012, 2), 0.7);
    return snes(out, { bits: 7, p: 0.8 });
  }, { vol: 0.65, dist: 40, max: 5, prio: 3 }),
  ark_part_break: def((R) => {
    const out = buf(1.0);
    layer(out, ping(R, R.r(500, 800), 0.8, 2.76, 5), 0.7);
    const n = noise(0.4, 'crunch', R, 2); filt(n, 'lp', 3500, 400, 1); ad(n, 0.001, 0.3); layer(out, n, 0.9);
    layer(out, sparks(R, 0.8, 25), 0.5, 0.03);
    layer(out, thump(R, 110, 40, 0.3, 0.1), 0.7);
    return snes(out, { drv: 2.2, bits: 8, p: 0.92 });
  }, { vol: 0.85, dist: 60, max: 3, prio: 3 }),
  ricochet: def((R) => {
    const out = buf(0.5), f = R.r(2600, 4200);
    const r = fm(0.45, { f, f1: f * R.r(0.35, 0.55), ratio: 1.01, index: 0.6, vib: 0.03, vibHz: 30 });
    env(r, [[0, 0], [0.01, 1], [0.45, 0]]); layer(out, r, 0.7);
    layer(out, click(R, 4500, 0.012, 2), 0.7);
    return snes(out, { bits: 8, p: 0.65 });
  }, { vol: 0.5, dist: 35, max: 4, pj: 0.1 }),
  bullet_whiz: def((R) => {
    const out = buf(0.3);
    const n = noise(0.28, 'white', R); filt(n, 'bp', 3000, 900, 3); env(n, [[0, 0], [0.11, 1], [0.28, 0]]); layer(out, n, 1);
    const t = osc(0.28, { f: 1800, f1: 700 }); env(t, [[0, 0], [0.11, 1], [0.28, 0]]); layer(out, t, 0.2);
    return snes(out, { bits: 8, p: 0.6 });
  }, { vol: 0.55, dist: 20, max: 4, pj: 0.12 }),

  // ---------------------------------------------------------------- explosives
  grenade_bounce: def((R) => {
    const out = buf(0.3);
    layer(out, ping(R, R.r(1200, 1800), 0.22, 1.41, 2), 0.7);
    layer(out, thump(R, 200, 120, 0.06, 0.02), 0.6);
    layer(out, click(R, 2500, 0.015), 0.5);
    return snes(out, { bits: 8, p: 0.6 });
  }, { vol: 0.6, dist: 30, max: 4, pj: 0.1 }),
  grenade_pin: def((R) => {
    const out = buf(0.5);
    layer(out, click(R, 3500, 0.02, 5), 0.8);
    layer(out, ping(R, 3800, 0.4, 3.5, 1.2), 0.5, 0.12);
    layer(out, clack(R, 2200, 0.05), 0.5, 0.14);
    return snes(out, { bits: 9, p: 0.6 });
  }, { vol: 0.6, dist: 15, max: 2 }),
  mine_arm: def((R) => {
    const out = buf(0.55);
    layer(out, clack(R, 1500, 0.06), 0.7);
    for (const [t, f] of [[0.12, 1400], [0.24, 1900], [0.36, 2600]]) {
      const b = osc(0.06, { wave: 'rawsq', f, pw: 0.5 }); ad(b, 0.001, 0.06, 0.03); layer(out, b, 0.35, t);
    }
    return snes(out, { bits: 8, p: 0.6 });
  }, { vol: 0.6, dist: 20, max: 2 }),
  mine_beep: def((R) => {
    const out = buf(0.12);
    const b = osc(0.08, { wave: 'rawsq', f: 1850, pw: 0.5 }); ad(b, 0.001, 0.07, 0.04); layer(out, b, 1);
    return snes(out, { bits: 8, p: 0.45 });
  }, { vol: 0.6, dist: 22, max: 4, pj: 0 }),
};
