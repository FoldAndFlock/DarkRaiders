// Per-weapon sounds: gun_<id> (fire), reload_<id> / reload_<id>_end (distinctive reloads),
// charge_<id>, plus gun_far_* distance layers that audio.play() crossfades in for far shots.
// Each design follows the real ARC Raiders counterpart's action type and calibre (see the
// comments); everything is original synthesis.
import { buf, noise, osc, fm, ad, env, filt, filtFn, layer, mix, snes, am, comb, echo } from './dsp.js';
import { def, gunshot, click, clack, thump, ping, sparks } from './sfx_lib.js';

// ------------------------------------------------------------------ mechanism helpers
const brass = (R) => {                 // spent case tinkle: hit + one bounce
  const x = buf(0.32), f = R.r(3600, 5200);
  mix(x, ping(R, f, 0.1, 2.76, 1.4), 0.6); mix(x, ping(R, f * 1.04, 0.08, 2.76, 1), 0.3, R.r(0.11, 0.17));
  return x;
};
const slideRack = (R, f = 2200) => {   // pistol slide back + forward
  const x = buf(0.2);
  const s = noise(0.05, 'white', R); filt(s, 'bp', 3200, 2000, 2); ad(s, 0.004, 0.045); layer(x, s, 0.4);
  layer(x, clack(R, f, 0.05), 0.8, 0.045); return x;
};
const boltCycle = (R, f = 1400) => {   // bolt up, back, forward, down
  const x = buf(0.5);
  layer(x, click(R, 2600, 0.02), 0.5);
  const b = noise(0.1, 'white', R); filt(b, 'bp', 2800, 1500, 2); ad(b, 0.01, 0.09); layer(x, b, 0.45, 0.06);
  layer(x, clack(R, f, 0.06), 0.9, 0.17);
  layer(x, clack(R, f * 1.25, 0.05), 0.8, 0.3);
  layer(x, click(R, 2300, 0.025), 0.6, 0.38);
  return x;
};
const leverCycle = (R) => {            // "cha-chak": lever down (spring + extract), lever up (lock)
  const x = buf(0.36);
  layer(x, clack(R, 1250, 0.06), 0.8);
  const sp = osc(0.08, { wave: 'tri', f: 900, f1: 1400 }); ad(sp, 0.002, 0.07); layer(x, sp, 0.15, 0.01);
  layer(x, brass(R), 0.25, 0.07);
  layer(x, clack(R, 1600, 0.05), 1.0, 0.17);
  layer(x, click(R, 2600, 0.02), 0.5, 0.21);
  return x;
};
const pumpRack = (R, heavy = 1) => {   // shotgun / launcher pump: back + forward
  const x = buf(0.42);
  for (const [t, f] of [[0, 850], [0.17, 1050]]) {
    const n = noise(0.12, 'white', R); filt(n, 'bp', f * 2, f, 1.5); ad(n, 0.002, 0.09); layer(x, n, 0.7, t);
    layer(x, clack(R, f / heavy, 0.08), 0.8, t + 0.005);
    layer(x, thump(R, 210 / heavy, 110 / heavy, 0.07, 0.03), 0.45 * heavy, t);
  }
  return x;
};
const hammerCock = (R) => {            // single-action revolver: cylinder ratchet + hammer sear click
  const x = buf(0.2);
  for (let k = 0; k < 3; k++) layer(x, click(R, 3400 + k * 300, 0.012, 5), 0.35, k * 0.025);
  layer(x, clack(R, 2000, 0.05), 0.8, 0.09); return x;
};
const linkRattle = (R) => {            // belt links shaking
  const x = buf(0.12);
  for (let k = 0; k < 5; k++) mix(x, ping(R, R.r(2800, 4800), 0.04, 1.41, 1), R.r(0.2, 0.5), R() * 0.08);
  return x;
};
const servoWhir = (R, f0 = 300, f1 = 900, d = 0.35) => {
  const s = osc(d, { wave: 'sq', pw: 0.3, f: f0, f1 }); filt(s, 'bp', f1 * 2, f1 * 2, 2); env(s, [[0, 0], [0.03, 1], [d - 0.05, 0.8], [d, 0]]);
  return s;
};
const tubePop = (R, f = 180, d = 0.35) => {   // hollow launcher tube
  const t = noise(d, 'white', R); filt(t, 'lp', 1100, 500, 0.8); comb(t, 1 / f, 0.72, 0.35); ad(t, 0.001, d * 0.8); return t;
};

// energy discharge: fast FM sweep (velocity), electric crackle, accelerator ring, low thump, tail
function energyShot(R, o = {}) {
  const { dur = 0.8, f = 2400, f1 = 300, sweep = 0.12, ratio = 0.5, index = 5, crackG = 0.8, ring = 1760, ringG = 0.2,
    thumpF = 110, thumpG = 0.8, tailG = 0.3, tailDec = 0.5, bits = 8, p = 0.92 } = o;
  const out = buf(dur);
  const z = fm(sweep * 2.5, { f: f * R.j(0.05), f1, sweep, ratio, index, index1: 0.5 }); ad(z, 0.0008, sweep * 2.2); layer(out, z, 0.9);
  const c = noise(0.08, 'crunch', R, 1); filt(c, 'hp', 2800); ad(c, 0.0004, 0.06); layer(out, c, crackG);
  if (ringG) { const r = fm(0.45, { f: ring * R.j(0.03), ratio: 1.41, index: 2, index1: 0.1 }); ad(r, 0.001, 0.4); layer(out, r, ringG); }
  layer(out, thump(R, thumpF, thumpF * 0.4, 0.16, 0.06), thumpG);
  const tl = noise(tailDec + 0.1, 'brown', R); filt(tl, 'lp', 700); ad(tl, 0.01, tailDec); layer(out, tl, tailG, 0.01);
  const cr = noise(0.25, 'crunch', R, 2); filt(cr, 'bp', 4000, 2500, 1.5); am(cr, 45, 0.8, 3); ad(cr, 0.005, 0.22); layer(out, cr, 0.18, 0.02);
  return snes(out, { drv: 1.8, bits, p });
}
// compose a gun from a base shot plus timed mechanism layers [[sound, gain, at], ...]
function compose(base, parts, dur, p = 0.95) {
  const out = buf(Math.max(dur, base.length / 32000));
  layer(out, base, 1);
  for (const [x, g, t] of parts) mix(out, x, g, t);
  return snes(out, { dc: false, p, fade: 0.03 });
}
// energy-clip reload: eject (latch + hiss + power-down) / insert (clack + power-up + ready chirp)
function cellOut(R, pitch = 1) {
  const x = buf(0.75);
  layer(x, click(R, 2600, 0.02), 0.6);
  const h = noise(0.35, 'white', R); filt(h, 'hp', 3000); env(h, [[0, 0], [0.02, 1], [0.35, 0]]); layer(x, h, 0.45, 0.04);
  const pd = osc(0.5, { wave: 'saw', f: 900 * pitch, f1: 120 * pitch }); filt(pd, 'lp', 2400); ad(pd, 0.005, 0.5); layer(x, pd, 0.3, 0.05);
  layer(x, clack(R, 1500, 0.06), 0.5, 0.2);
  return snes(x, { bits: 8, p: 0.7 });
}
function cellIn(R, pitch = 1, hum = 0) {
  const x = buf(0.9);
  layer(x, clack(R, 1700, 0.07), 0.9);
  const pu = fm(0.55, { f: 180 * pitch, f1: 1100 * pitch, ratio: 2, index: 1.2 }); env(pu, [[0, 0], [0.05, 0.6], [0.5, 1], [0.55, 0]]); layer(x, pu, 0.4, 0.06);
  if (hum) { const hm = osc(0.6, { wave: 'saw', f: 55, f1: 110 }); filt(hm, 'lp', 600); env(hm, [[0, 0], [0.3, 1], [0.6, 0]]); layer(x, hm, 0.4 * hum, 0.1); }
  const ch = osc(0.1, { wave: 'sq', pw: 0.25, f: 1760 * pitch, f1: 2640 * pitch, sweep: 0.03 }); ad(ch, 0.002, 0.09); layer(x, ch, 0.25, 0.62);
  return snes(x, { bits: 8, p: 0.72 });
}
function shellsIn(R, n = 4, gap = 0.42, heavy = 1) {   // shells/rounds pushed into a tube or gate
  const x = buf(n * gap + 0.2);
  for (let k = 0; k < n; k++) {
    const t = k * gap + R.r(0, 0.04);
    const s = noise(0.08, 'white', R); filt(s, 'bp', 1600 / heavy, 1000 / heavy, 1.4); ad(s, 0.01, 0.07); layer(x, s, 0.4, t);
    layer(x, clack(R, 1500 / heavy, 0.05), 0.75, t + 0.06);
  }
  return snes(x, { bits: 9, p: 0.68 });
}

const G = (r, o) => def(r, { max: 8, prio: 3, pj: 0.035, ...o });
const RL = (r, o) => def(r, { vol: 0.62, dist: 20, max: 2, pj: 0.03, v: 2, ...o });
const EV = { vol: 0.32 };                 // energy-cell reloads carry sustained tones: sit them lower

export const GUNS = {
  // ================================================================ assault rifles
  // Kettle: cheap semi-auto, light ammo – snappy, bright, light bolt return + brass
  gun_kettel: G((R) => compose(gunshot(R, { dur: 0.55, crackF: 3200, crackDec: 0.035, bodyF: 1250, bodyDec: 0.08, thumpF: 130, thumpF1: 55,
    thumpDec: 0.09, thumpG: 0.7, tailF: 900, tailDec: 0.4, tailG: 0.26, bits: 9 }), [[clack(R, 2400, 0.04), 0.22, 0.035], [brass(R), 0.1, 0.18]], 0.6),
  { vol: 0.8, dist: 85, far: 'gun_far_light' }),
  // Rattler: budget full-auto medium – rattly, crunchy AK-ish bark with loose-part chatter
  gun_rattlr: G((R) => {
    const parts = [];
    for (let k = 0; k < 3; k++) parts.push([click(R, R.r(1800, 3200), 0.015, 3), 0.18, 0.02 + R() * 0.05]);
    return compose(gunshot(R, { dur: 0.6, crackF: 2500, crackDec: 0.045, bodyF: 900, bodyDec: 0.11, thumpF: 110, thumpF1: 42,
      tailDec: 0.5, tailG: 0.3, drv: 2.6, bits: 8, hold: 2 }), parts, 0.6);
  }, { vol: 0.85, max: 10, dist: 100, far: 'gun_far_medium' }),
  // Arpeggio: 3-round burst – tight, clean crack, short tail so bursts read "ta-ta-ta";
  // a faint handguard ring on one of three triad pitches (variants) gives the burst a little arpeggio
  gun_arpeggo: G((R) => {
    const base = gunshot(R, { dur: 0.45, crackF: 2900, crackQ: 1.2, crackDec: 0.04, bodyF: 1000, bodyDec: 0.09, thumpF: 120, thumpF1: 46,
      thumpDec: 0.1, tailDec: 0.33, tailG: 0.22, bits: 9 });
    const r = fm(0.3, { f: R.pick([1320, 1663, 1976]), ratio: 2.0, index: 1.2, index1: 0.05 }); ad(r, 0.001, 0.28);
    return compose(base, [[r, 0.1, 0.004]], 0.45);
  }, { vol: 0.82, max: 9, dist: 100, far: 'gun_far_medium', v: 3 }),
  // Tempest: refined full-auto medium – smooth, controlled, slightly deeper, cleaner bits
  gun_tempesta: G((R) => compose(gunshot(R, { dur: 0.55, crackF: 2700, crackDec: 0.042, bodyF: 1050, bodyDec: 0.1, thumpF: 115, thumpF1: 44,
    thumpG: 0.95, tailDec: 0.45, tailG: 0.28, drv: 2.0, bits: 10 }), [[clack(R, 1900, 0.035), 0.15, 0.03]], 0.55),
  { vol: 0.85, max: 10, dist: 100, far: 'gun_far_medium' }),
  // Bettina: heavy-calibre AR – big low punch, heavy bolt clunk, long tail
  gun_betina: G((R) => compose(gunshot(R, { dur: 0.95, crackF: 2100, crackDec: 0.06, crackG: 0.9, bodyF: 700, bodyDec: 0.16,
    thumpF: 85, thumpF1: 32, thumpDec: 0.22, tailDec: 0.8, tailG: 0.4, slap: 0.18, slapG: 0.2, drv: 3, bits: 8 }),
  [[clack(R, 900, 0.07), 0.3, 0.05]], 0.95), { vol: 0.95, dist: 115, far: 'gun_far_heavy' }),

  // ================================================================ battle rifles
  // Ferro: break-action single shot, heavy – one big BOOM with a long rolling tail
  gun_ferrox: G((R) => gunshot(R, { dur: 1.8, crackF: 2300, crackDec: 0.07, crackG: 0.95, bodyF: 650, bodyDec: 0.2, thumpF: 72, thumpF1: 28,
    thumpDec: 0.32, tailF: 560, tailDec: 1.3, tailG: 0.45, slap: 0.3, slapG: 0.3, drv: 3.2, bits: 8 }),
  { vol: 1, max: 4, dist: 125, far: 'gun_far_heavy' }),
  // Renegade: lever-action – crisp ringing western crack, then the "cha-chak" lever cycle
  gun_renegayde: G((R) => compose(gunshot(R, { dur: 0.95, crackF: 3000, crackDec: 0.05, bodyF: 850, bodyDec: 0.12, thumpF: 100, thumpF1: 38,
    thumpDec: 0.16, tailDec: 0.9, tailG: 0.38, slap: 0.25, slapG: 0.2, drv: 2.6, bits: 9 }), [[leverCycle(R), 0.42, 0.3]], 0.95),
  { vol: 0.95, max: 4, dist: 110, far: 'gun_far_medium' }),
  // Aphelion: experimental energy battle rifle, 2-round burst of high-velocity bolts –
  // fast "tchew" FM sweep, electric crackle, accelerator ring
  gun_afelion: G((R) => energyShot(R, { dur: 0.8, f: 2600, f1: 280, sweep: 0.1, index: 5.5, ring: 1760, ringG: 0.22, thumpF: 115, tailG: 0.3 }),
    { vol: 0.85, max: 6, dist: 110, far: 'gun_far_energy' }),

  // ================================================================ SMGs
  // Stitcher: light SMG – papery, snappy pops with mechanical chatter
  gun_stitchr: G((R) => compose(gunshot(R, { dur: 0.3, crackF: 3500, crackDec: 0.025, bodyF: 1400, bodyDec: 0.055, thumpF: 150, thumpF1: 65,
    thumpDec: 0.06, thumpG: 0.6, tailDec: 0.2, tailG: 0.18, bits: 8, hold: 2 }), [[clack(R, 2800, 0.03), 0.2, 0.02]], 0.3),
  { vol: 0.7, max: 10, dist: 80, far: 'gun_far_light' }),
  // Canto: medium SMG, blistering cycle rate – punchier body, more crack
  gun_canta: G((R) => gunshot(R, { dur: 0.33, crackF: 3100, crackDec: 0.03, bodyF: 1150, bodyDec: 0.065, thumpF: 135, thumpF1: 55,
    thumpDec: 0.07, thumpG: 0.8, tailDec: 0.25, tailG: 0.22, drv: 2.6, bits: 8 }), { vol: 0.72, max: 12, dist: 85, far: 'gun_far_medium' }),
  // Bobcat: extremely fast light SMG – very short tight transients that blur into a buzz-saw
  gun_bobkat: G((R) => gunshot(R, { dur: 0.22, crackF: 3800, crackDec: 0.02, bodyF: 1600, bodyDec: 0.04, thumpF: 160, thumpF1: 80,
    thumpDec: 0.045, thumpG: 0.5, tailDec: 0.15, tailG: 0.15, bits: 8, hold: 2 }), { vol: 0.66, max: 12, dist: 80, far: 'gun_far_light' }),

  // ================================================================ shotguns
  // Il Toro: pump-action – wide deep blast, then the pump rack
  gun_el_torro: G((R) => compose(gunshot(R, { dur: 1.2, crackF: 1700, crackQ: 0.5, crackDec: 0.08, bodyF: 1500, bodyDec: 0.25, bodyG: 1,
    thumpF: 78, thumpF1: 30, thumpDec: 0.3, tailF: 600, tailDec: 1.0, tailG: 0.45, slap: 0.22, slapG: 0.2, drv: 3.4, bits: 8, hold: 2 }),
  [[pumpRack(R), 0.45, 0.42]], 1.2), { vol: 1, max: 4, dist: 95, far: 'gun_far_shotgun' }),
  // Vulcano: semi-auto shotgun – tighter, sharper blast with a semi-auto action clack
  gun_volcano: G((R) => compose(gunshot(R, { dur: 0.9, crackF: 2000, crackQ: 0.6, crackDec: 0.06, bodyF: 1700, bodyDec: 0.18,
    thumpF: 90, thumpF1: 35, thumpDec: 0.22, tailDec: 0.75, tailG: 0.4, drv: 3, bits: 8 }), [[clack(R, 1300, 0.06), 0.3, 0.04]], 0.9),
  { vol: 0.95, max: 5, dist: 95, far: 'gun_far_shotgun' }),
  // Dolabra: experimental energy shotgun – hot plasma "whoomph", descending zap, thermal crackle
  gun_dolabre: G((R) => {
    const out = buf(1.0);
    const h = noise(0.4, 'white', R); filt(h, 'lp', 3200, 500, 1.2, 0.3); ad(h, 0.002, 0.3); layer(out, h, 0.9);
    const z = fm(0.4, { f: 900 * R.j(0.05), f1: 120, sweep: 0.3, ratio: 0.7, index: 3, index1: 0.4 }); ad(z, 0.001, 0.38); layer(out, z, 0.6);
    layer(out, thump(R, 70, 30, 0.35, 0.1), 0.9);
    const s = noise(0.8, 'crunch', R, 2); filt(s, 'hp', 3000); am(s, 33, 0.8, 3); ad(s, 0.02, 0.7); layer(out, s, 0.25, 0.05);
    layer(out, sparks(R, 0.7, 16), 0.2, 0.05);
    return snes(out, { drv: 2.2, bits: 8, p: 0.94 });
  }, { vol: 0.95, max: 4, dist: 110, far: 'gun_far_energy' }),
  charge_dolabre: def((R) => {          // heat build-up: rising hum + sizzle, ends on a "ready" ping
    const d = 0.7, out = buf(d + 0.1);
    const h = fm(d, { f: 120, f1: 480, ratio: 1.5, index: 2.5, index1: 1 }); env(h, [[0, 0], [0.1, 0.5], [d - 0.05, 1], [d, 0]]); layer(out, h, 0.6);
    const s = noise(d, 'white', R); filt(s, 'bp', 2000, 6000, 2); env(s, [[0, 0], [d, 1]]); am(s, 28, 0.6); layer(out, s, 0.25);
    const pg = osc(0.1, { wave: 'sq', pw: 0.25, f: 1980 }); ad(pg, 0.001, 0.1); layer(out, pg, 0.25, d - 0.08);
    return snes(out, { bits: 8, p: 0.7 });
  }, { vol: 0.6, dist: 25, max: 2, pj: 0.02 }),

  // ================================================================ pistols / hand cannon
  // Hairpin: integrated silencer + slide action – a soft "pft", firing-pin click, then the manual slide cycle
  gun_hairpyn: G((R) => {
    const out = buf(0.5);
    const p = noise(0.1, 'white', R); filt(p, 'lp', 1300 * R.j(0.15), 500, 1.2); ad(p, 0.001, 0.07); layer(out, p, 0.9);
    layer(out, thump(R, 140, 70, 0.07, 0.03), 0.45);
    layer(out, click(R, 4200, 0.015, 4), 0.45, 0.003);
    layer(out, slideRack(R, 2500), 0.55, 0.2);
    return snes(out, { drv: 1.4, bits: 9, p: 0.75 });
  }, { vol: 0.55, dist: 16, max: 4 }),
  // Burletta: dependable semi pistol – crisp pop, slide clack, brass
  gun_burleta: G((R) => compose(gunshot(R, { dur: 0.45, crackF: 3300, crackDec: 0.035, bodyF: 1300, bodyDec: 0.07, thumpF: 145, thumpF1: 60,
    thumpDec: 0.08, thumpG: 0.7, tailDec: 0.3, tailG: 0.22, mech: 0, bits: 9 }), [[clack(R, 2600, 0.04), 0.28, 0.02], [brass(R), 0.1, 0.16]], 0.45),
  { vol: 0.75, dist: 80, far: 'gun_far_light' }),
  // Venator: two projectiles per pull – a doubled "ka-crack" transient, punchy medium calibre
  gun_venattor: G((R) => {
    const a = gunshot(R, { dur: 0.5, crackF: 2900, crackDec: 0.035, bodyF: 1100, bodyDec: 0.08, thumpF: 125, thumpF1: 50, thumpDec: 0.09,
      tailDec: 0.4, tailG: 0.28, bits: 9 });
    const c2 = noise(0.06, 'crunch', R, 1); filt(c2, 'bp', 3100, 1500, 0.9); ad(c2, 0.0004, 0.035);
    return compose(a, [[c2, 0.55, 0.011], [clack(R, 2300, 0.04), 0.25, 0.03]], 0.5);
  }, { vol: 0.82, dist: 95, far: 'gun_far_medium' }),
  // Anvil: single-action hand cannon – huge boom, long tail, then the hammer being cocked
  gun_anvill: G((R) => compose(gunshot(R, { dur: 1.4, crackF: 2400, crackDec: 0.06, crackG: 1, bodyF: 750, bodyDec: 0.17, thumpF: 80, thumpF1: 30,
    thumpDec: 0.3, tailDec: 1.1, tailG: 0.45, slap: 0.25, slapG: 0.25, drv: 3.3, bits: 8 }), [[hammerCock(R), 0.4, 0.38]], 1.4),
  { vol: 1, max: 4, dist: 115, far: 'gun_far_heavy' }),

  // ================================================================ LMG / snipers
  // Torrente: belt-fed LMG – mid-heavy chug with belt-link rattle
  gun_torrento: G((R) => compose(gunshot(R, { dur: 0.5, crackF: 2400, crackDec: 0.04, bodyF: 850, bodyDec: 0.09, thumpF: 105, thumpF1: 42,
    thumpDec: 0.1, thumpG: 0.9, tailDec: 0.35, tailG: 0.28, drv: 2.8, bits: 8 }), [[linkRattle(R), 0.16, 0.03]], 0.5),
  { vol: 0.85, max: 12, dist: 115, far: 'gun_far_medium' }),
  // Osprey: scoped bolt-action – sharp supersonic crack, long echo, then the bolt cycle
  gun_ospray: G((R) => compose(gunshot(R, { dur: 1.6, crackF: 3400, crackDec: 0.06, crackG: 1, bodyF: 700, bodyDec: 0.13, thumpF: 90, thumpF1: 34,
    thumpDec: 0.22, tailF: 520, tailDec: 1.4, tailG: 0.45, slap: 0.3, slapG: 0.3, drv: 2.8, bits: 9 }), [[boltCycle(R), 0.4, 0.55]], 1.6),
  { vol: 1, max: 4, dist: 145, far: 'gun_far_heavy' }),
  // Jupiter: experimental energy bolt-action – tiny pre-charge (its firing delay), a railgun "KZANG"
  // with a metallic ring and sub hit, crackling tail, then a servo bolt cycle and capacitor recharge
  gun_jupitor: G((R) => {
    const out = buf(1.9);
    const pre = osc(0.08, { f: 800, f1: 3200 }); env(pre, [[0, 0], [0.07, 1], [0.08, 0]]); layer(out, pre, 0.25);
    const at = 0.07;
    const r = fm(0.7, { f: 1200 * R.j(0.03), ratio: 2.76, index: 6, index1: 0.4 }); ad(r, 0.001, 0.65); layer(out, r, 0.5, at);
    const c = noise(0.08, 'crunch', R, 1); filt(c, 'hp', 2500); ad(c, 0.0004, 0.05); layer(out, c, 0.9, at);
    layer(out, thump(R, 60, 26, 0.45, 0.12), 1, at);
    const tl = noise(1.3, 'brown', R); filt(tl, 'lp', 600); ad(tl, 0.01, 1.2); layer(out, tl, 0.35, at + 0.01);
    const cr = noise(0.7, 'crunch', R, 2); filt(cr, 'bp', 4500, 2000, 1.4); am(cr, 37, 0.8, 3); ad(cr, 0.01, 0.6); layer(out, cr, 0.22, at + 0.03);
    const s = noise(0.4, 'pink', R); filt(s, 'lp', 1300, 500, 0.7); ad(s, 0.004, 0.35); layer(out, s, 0.25, at + 0.3);
    layer(out, servoWhir(R, 300, 800, 0.25), 0.25, 1.0); layer(out, clack(R, 1500, 0.06), 0.4, 1.22);
    const rc = osc(0.4, { wave: 'saw', f: 300, f1: 950 }); filt(rc, 'lp', 2500); env(rc, [[0, 0], [0.05, 1], [0.4, 0]]); layer(out, rc, 0.15, 1.3);
    return snes(out, { drv: 2.4, bits: 8, p: 0.97 });
  }, { vol: 1, max: 3, dist: 150, far: 'gun_far_energy' }),

  // ================================================================ launchers / beam
  // Rascal: break-action launcher – hollow tube "thoomp" and a projectile whoosh
  gun_raskal: G((R) => {
    const out = buf(0.95);
    layer(out, tubePop(R, 180, 0.35), 0.8); layer(out, thump(R, 95, 45, 0.25, 0.07), 1);
    layer(out, click(R, 2600, 0.02), 0.3);
    const w = noise(0.6, 'white', R); filt(w, 'bp', 1600, 700, 1.4); env(w, [[0, 0], [0.04, 1], [0.6, 0]]); layer(out, w, 0.35, 0.03);
    return snes(out, { drv: 2.2, bits: 8, p: 0.92 });
  }, { vol: 0.9, max: 4, dist: 90, far: 'gun_far_launcher' }),
  // Hullcracker: pump-action launcher – heavier thoomp + whoosh, then a heavy pump rack
  gun_hullkracker: G((R) => {
    const out = buf(1.15);
    layer(out, tubePop(R, 150, 0.4), 0.85); layer(out, thump(R, 80, 36, 0.32, 0.08), 1);
    const w = noise(0.6, 'white', R); filt(w, 'bp', 1400, 650, 1.4); env(w, [[0, 0], [0.04, 1], [0.6, 0]]); layer(out, w, 0.35, 0.03);
    layer(out, pumpRack(R, 1.3), 0.5, 0.45);
    return snes(out, { drv: 2.4, bits: 8, p: 0.94 });
  }, { vol: 0.95, max: 4, dist: 95, far: 'gun_far_launcher' }),
  // Equalizer: experimental beam rifle – each shot is a 0.2 s beam segment; at full-auto cadence the
  // overlapping segments phase against each other into a wavering, buzzing beam
  gun_equaliser: G((R) => {
    const d = 0.22, out = buf(d);
    const s = osc(d, { wave: 'saw', f: 110 * R.j(0.02), vib: 0.01, vibHz: 13 }); filt(s, 'bp', 1500, 1500, 1.2); layer(out, s, 0.6);
    const f2 = fm(d, { f: 880 * R.j(0.01), ratio: 1.01, index: 2.2 }); layer(out, f2, 0.4);
    const z = noise(d, 'crunch', R, 2); filt(z, 'hp', 3500); am(z, 60, 0.8, 2); layer(out, z, 0.3);
    const sub = osc(d, { f: 55 }); layer(out, sub, 0.35);
    env(out, [[0, 0], [0.02, 1], [0.13, 0.85], [d, 0]]);
    return snes(out, { bits: 8, fade: 0.01, p: 0.7 });
  }, { vol: 0.62, max: 4, dist: 90, pj: 0.015, v: 4, far: 'gun_far_energy' }),

  // ================================================================ distance layers (read by calibre)
  gun_far_light: def((R) => {        // dull pop + short rolling reflections
    const out = buf(1.2);
    const p = noise(0.08, 'white', R); filt(p, 'lp', 1100, 500, 1); ad(p, 0.001, 0.06); layer(out, p, 0.9);
    layer(out, thump(R, 150, 80, 0.08, 0.03), 0.5);
    const t = noise(1.0, 'brown', R); filt(t, 'lp', 650); ad(t, 0.02, 0.9); layer(out, t, 0.4, 0.03);
    return snes(echo(out, R.r(0.12, 0.2), 0.35, 2).subarray(0, 1.2 * 32000), { bits: 9, p: 0.8, fade: 0.1 });
  }, { vol: 0.7, max: 8, pj: 0.06, prio: 2, v: 2, dist: 120 }),
  gun_far_medium: def((R) => {       // "pok-boom" with a longer rolling tail
    const out = buf(1.6);
    const p = noise(0.1, 'white', R); filt(p, 'lp', 950, 400, 1); ad(p, 0.001, 0.08); layer(out, p, 0.85);
    layer(out, thump(R, 110, 55, 0.14, 0.05), 0.7);
    const t = noise(1.4, 'brown', R); filt(t, 'lp', 520); ad(t, 0.03, 1.3); layer(out, t, 0.5, 0.03);
    return snes(echo(out, R.r(0.16, 0.26), 0.4, 2).subarray(0, 1.6 * 32000), { bits: 9, p: 0.85, fade: 0.15 });
  }, { vol: 0.8, max: 8, pj: 0.06, prio: 2, v: 2, dist: 140 }),
  gun_far_heavy: def((R) => {        // big low boom rolling across terrain like distant thunder
    const out = buf(2.4);
    const p = noise(0.12, 'white', R); filt(p, 'lp', 800, 300, 1); ad(p, 0.001, 0.1); layer(out, p, 0.75);
    layer(out, thump(R, 75, 32, 0.3, 0.1), 1);
    const t = noise(2.2, 'brown', R); filtFn(t, 'lp', (s) => 420 * Math.exp(-s * 0.7) + 120, 0.9); ad(t, 0.04, 2.1); layer(out, t, 0.6, 0.03);
    return snes(echo(out, R.r(0.22, 0.34), 0.42, 3).subarray(0, 2.4 * 32000), { drv: 1.4, bits: 9, p: 0.9, fade: 0.25 });
  }, { vol: 0.9, max: 6, pj: 0.05, prio: 2, v: 2, dist: 180 }),
  gun_far_shotgun: def((R) => {      // wide whump
    const out = buf(1.6);
    const p = noise(0.18, 'white', R); filt(p, 'lp', 900, 300, 0.8); ad(p, 0.001, 0.15); layer(out, p, 0.9);
    layer(out, thump(R, 85, 38, 0.22, 0.08), 0.85);
    const t = noise(1.4, 'brown', R); filt(t, 'lp', 480); ad(t, 0.03, 1.3); layer(out, t, 0.55, 0.03);
    return snes(echo(out, R.r(0.18, 0.28), 0.4, 2).subarray(0, 1.6 * 32000), { bits: 9, p: 0.85, fade: 0.15 });
  }, { vol: 0.85, max: 6, pj: 0.05, prio: 2, v: 2, dist: 130 }),
  gun_far_energy: def((R) => {       // distant zap: muffled descending FM + rumble
    const out = buf(1.5);
    const z = fm(0.3, { f: 900, f1: 150, ratio: 0.5, index: 3, index1: 0.3 }); filt(z, 'lp', 1400); ad(z, 0.002, 0.28); layer(out, z, 0.8);
    layer(out, thump(R, 90, 40, 0.2, 0.06), 0.7);
    const t = noise(1.3, 'brown', R); filt(t, 'lp', 500); ad(t, 0.03, 1.2); layer(out, t, 0.45, 0.03);
    return snes(echo(out, R.r(0.18, 0.28), 0.4, 2).subarray(0, 1.5 * 32000), { bits: 8, p: 0.85, fade: 0.15 });
  }, { vol: 0.8, max: 6, pj: 0.05, prio: 2, v: 2, dist: 150 }),
  gun_far_launcher: def((R) => {     // distant thoomp
    const out = buf(1.2);
    layer(out, thump(R, 85, 40, 0.3, 0.08), 1);
    const t = noise(1.0, 'brown', R); filt(t, 'lp', 450); ad(t, 0.03, 0.9); layer(out, t, 0.4, 0.03);
    return snes(echo(out, 0.2, 0.35, 2).subarray(0, 1.2 * 32000), { bits: 9, p: 0.8, fade: 0.1 });
  }, { vol: 0.75, max: 4, pj: 0.05, prio: 2, v: 2, dist: 120 }),

  // ================================================================ distinctive reloads
  // Ferro (break-action): latch, barrel drops on its hinge, extractor flicks the case out
  reload_ferrox: RL((R) => {
    const x = buf(0.85);
    layer(x, click(R, 2500, 0.02), 0.6);
    layer(x, clack(R, 800, 0.1), 0.9, 0.08); layer(x, thump(R, 180, 100, 0.08, 0.03), 0.4, 0.08);
    layer(x, click(R, 3000, 0.02), 0.4, 0.22);
    layer(x, brass(R), 0.45, 0.28); layer(x, ping(R, 3200, 0.1, 2.76, 1), 0.2, 0.55);
    return snes(x, { bits: 9, p: 0.72 });
  }),
  reload_ferrox_end: RL((R) => {     // round slid in, barrel snapped shut
    const x = buf(0.6);
    const s = noise(0.12, 'white', R); filt(s, 'bp', 2500, 1500, 1.5); ad(s, 0.01, 0.1); layer(x, s, 0.4);
    layer(x, click(R, 2200, 0.02), 0.5, 0.12);
    layer(x, clack(R, 900, 0.1), 1, 0.3); layer(x, thump(R, 160, 90, 0.08, 0.03), 0.5, 0.3);
    return snes(x, { bits: 9, p: 0.75 });
  }),
  // Renegade: rounds pushed through the loading gate one by one, finished with a lever cycle
  reload_renegayde: RL((R) => shellsIn(R, 4, 0.38, 0.9)),
  reload_renegayde_end: RL((R) => snes(leverCycle(R), { bits: 9, p: 0.75 })),
  // Il Toro: shell by shell, then pump
  reload_el_torro: RL((R) => shellsIn(R, 4, 0.45, 1.2)),
  reload_el_torro_end: RL((R) => snes(pumpRack(R), { bits: 8, p: 0.78 })),
  // Vulcano: shells into the tube, bolt release
  reload_volcano: RL((R) => shellsIn(R, 3, 0.4, 1.2)),
  reload_volcano_end: RL((R) => { const x = buf(0.3); layer(x, clack(R, 1200, 0.08), 1); layer(x, click(R, 2400, 0.02), 0.4, 0.08); return snes(x, { bits: 9, p: 0.75 }); }),
  // Hullcracker: chunky launcher shells into the tube, heavy pump
  reload_hullkracker: RL((R) => shellsIn(R, 3, 0.55, 1.7)),
  reload_hullkracker_end: RL((R) => snes(pumpRack(R, 1.3), { bits: 8, p: 0.8 })),
  // Rascal (break-action launcher): open, pull the empty hollow shell
  reload_raskal: RL((R) => {
    const x = buf(0.9);
    layer(x, click(R, 2300, 0.02), 0.6); layer(x, clack(R, 700, 0.1), 0.9, 0.08);
    const sc = noise(0.25, 'white', R); filt(sc, 'bp', 1200, 900, 2); comb(sc, 1 / 200, 0.5, 0.4); env(sc, [[0, 0], [0.05, 1], [0.25, 0]]); layer(x, sc, 0.4, 0.3);
    layer(x, thump(R, 240, 140, 0.1, 0.03), 0.4, 0.62);
    return snes(x, { bits: 9, p: 0.72 });
  }),
  reload_raskal_end: RL((R) => {
    const x = buf(0.6);
    layer(x, tubePop(R, 220, 0.15), 0.4); layer(x, thump(R, 200, 110, 0.08, 0.03), 0.5, 0.05);
    layer(x, clack(R, 800, 0.1), 1, 0.28);
    return snes(x, { bits: 9, p: 0.75 });
  }),
  // Anvil: cylinder swings out, six cases cascade out / rounds in, cylinder snapped shut, hammer cocked
  reload_anvill: RL((R) => {
    const x = buf(1.1);
    layer(x, click(R, 2800, 0.02), 0.6); layer(x, clack(R, 1500, 0.05), 0.6, 0.06);
    for (let k = 0; k < 6; k++) mix(x, brass(R), 0.35, 0.3 + k * 0.035 + R() * 0.03);
    return snes(x, { bits: 9, p: 0.72 });
  }),
  reload_anvill_end: RL((R) => {
    const x = buf(0.75);
    for (let k = 0; k < 3; k++) layer(x, click(R, 2200 + k * 150, 0.02, 3), 0.45, k * 0.09);
    layer(x, clack(R, 1300, 0.07), 1, 0.33);
    layer(x, hammerCock(R), 0.7, 0.5);
    return snes(x, { bits: 9, p: 0.75 });
  }),
  // Rattler: loads two rounds at a time – paired clicks
  reload_rattlr: RL((R) => {
    const x = buf(1.3);
    for (let k = 0; k < 3; k++) { const t = k * 0.4; layer(x, click(R, 2500, 0.02, 4), 0.6, t); layer(x, click(R, 2700, 0.02, 4), 0.55, t + 0.07); layer(x, clack(R, 1800, 0.04), 0.4, t + 0.14); }
    return snes(x, { bits: 9, p: 0.7 });
  }),
  reload_rattlr_end: RL((R) => { const x = buf(0.4); layer(x, clack(R, 1500, 0.06), 0.8); layer(x, clack(R, 1900, 0.05), 1, 0.16); return snes(x, { bits: 9, p: 0.75 }); }),
  // Torrente: feed cover up, belt rattle / feed cover slam + charging handle
  reload_torrento: RL((R) => {
    const x = buf(1.2);
    layer(x, clack(R, 900, 0.1), 0.9);
    for (let k = 0; k < 14; k++) mix(x, ping(R, R.r(2600, 4600), 0.05, 1.41, 1.2), R.r(0.15, 0.4), 0.25 + R() * 0.7);
    return snes(x, { bits: 9, p: 0.72 });
  }),
  reload_torrento_end: RL((R) => {
    const x = buf(0.7); layer(x, clack(R, 750, 0.12), 1); layer(x, thump(R, 170, 90, 0.1, 0.04), 0.5);
    layer(x, clack(R, 1500, 0.06), 0.7, 0.35); layer(x, clack(R, 1900, 0.05), 0.8, 0.48);
    return snes(x, { bits: 9, p: 0.78 });
  }),
  // Osprey: bolt opens, magazine swapped / bolt closes
  reload_ospray: RL((R) => { const x = buf(0.9); layer(x, boltCycle(R, 1300).subarray(0, 0.24 * 32000), 0.9); layer(x, clack(R, 2000, 0.05), 0.6, 0.45); layer(x, click(R, 2600, 0.02), 0.5, 0.7); return snes(x, { bits: 9, p: 0.72 }); }),
  reload_ospray_end: RL((R) => { const x = buf(0.5); layer(x, clack(R, 1500, 0.06), 1); layer(x, click(R, 2300, 0.025), 0.6, 0.09); return snes(x, { bits: 9, p: 0.75 }); }),
  // energy weapons: clip/cell eject + power-down / insert + power-up chirp (pitched per weapon)
  reload_afelion: RL((R) => cellOut(R, 1.2), EV), reload_afelion_end: RL((R) => cellIn(R, 1.2), EV),
  reload_dolabre: RL((R) => cellOut(R, 0.8), EV), reload_dolabre_end: RL((R) => cellIn(R, 0.8), EV),
  reload_jupitor: RL((R) => cellOut(R, 1.0), EV), reload_jupitor_end: RL((R) => cellIn(R, 1.0, 0.5), EV),
  reload_equaliser: RL((R) => cellOut(R, 0.7), EV), reload_equaliser_end: RL((R) => cellIn(R, 0.7, 1), EV),
};
