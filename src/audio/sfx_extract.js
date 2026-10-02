// Extraction sequence sounds, timed to the rigs in src/engine/extracts.js and the xcall / xopen / xclose /
// xgone / xidle / extracted events in src/game/view.js. Gameplay flow (sim.js): called 30-45 s (the car /
// train / dropship arrives over the last 6-8 s, ticks in the last 5 s) -> open (auto-departs after 90 s) ->
// a raider pulls the departure lever -> closing 10 s (buzzer, warning lights, doors) -> gone (cooldown 75 s;
// a metro station closes for the raid). Modelled on ARC Raiders' extracts: the cargo-elevator call is a loud,
// zone-wide alarm that draws ARK and Raiders; metro stations use the same alarm family; airshafts announce
// themselves with an approaching VTOL dropship that carries less far; Raider Hatches are silent apart from
// the key and the seal. Original synthesis only.
import { SR, buf, noise, osc, fm, ad, env, filt, layer, mix, snes, am, seamless, echo, unison } from './dsp.js';
import { def, click, clack, whoosh, thump, blips, bell, N, rotor, rustle, servo } from './sfx_lib.js';

const X = { v: 1, pj: 0, max: 2, prio: 3 };
// one horn blast of the two-tone klaxon
function horn(f, d) {
  const x = unison(d, 'saw', f, [-9, 8], { vib: 0.005, vibHz: 9 }); mix(x, osc(d, { wave: 'rawsq', pw: 0.4, f: f / 2 }), 0.4);
  filt(x, 'bp', f * 2.2, f * 2.2, 1.4); env(x, [[0, 0], [0.015, 1], [d - 0.05, 0.85], [d, 0]]); return x;
}
// hydraulic / pneumatic hiss
function hiss(R, d, f = 3200, shape = [[0, 0], [0.03, 1], [1, 0]]) {
  const h = noise(d, 'white', R); filt(h, 'bp', f, f * 0.7, 1); am(h, 19, 0.15); env(h, shape.map(([t, v]) => [t * d, v])); return h;
}
function railClatter(out, R, t0, t1, gap0, gapMin, accel, gain, fade) {
  let t = t0, gap = gap0;
  while (t < t1) {
    const g = gain * (fade ? fade(t) : 1);
    mix(out, clack(R, R.r(380, 520), 0.07), g, t); mix(out, clack(R, R.r(380, 520), 0.07), g * 0.85, t + 0.085);
    t += gap; gap = Math.max(gapMin, gap * accel);
  }
}

export const EXTRACT = {
  // ---------------------------------------------------------------- call (all public extracts)
  // console accepts the call: keypad blips, relay clunk, a burst of radio static, confirmation tone (~1.3 s)
  extract_call: def((R) => {
    const out = buf(1.4);
    [1336, 1477, 1209].forEach((f, i) => { const b = osc(0.06, { wave: 'rawsq', f, pw: 0.5 }); ad(b, 0.002, 0.06, 0.03); mix(out, b, 0.3, i * 0.08); });
    layer(out, clack(R, 900, 0.08), 0.6, 0.26);
    const st = noise(0.32, 'crunch', R, 3); filt(st, 'bp', 1800, 1800, 0.8); am(st, 31, 0.6); env(st, [[0, 0], [0.03, 1], [0.32, 0]]); layer(out, st, 0.3, 0.3);
    layer(out, blips(R, [[N('E5'), 0.09], [0, 0.04], [N('B5'), 0.18]], { pw: 0.25 }), 0.5, 0.62);
    layer(out, bell(R, N('E4'), 0.9), 0.3, 0.62);
    return snes(echo(out, 0.13, 0.28, 2), { bits: 8, p: 0.75 });
  }, { ...X, vol: 0.65, dist: 40, prio: 4 }),
  // cargo-elevator alarm: two-tone klaxon locked to the 0.42 s beacon-flash rhythm over a wailing siren.
  // The rig cues one 3.8 s cycle every 4 s while the cage is on its way -> continuous, zone-wide blare.
  extract_klaxon: def((R) => {
    const d = 3.85, out = buf(d);
    for (let k = 0; k < 9; k++) mix(out, horn(k & 1 ? 466 : 370, 0.4), 0.55, k * 0.42);
    const sw = osc(d, { wave: 'saw', fn: (t) => 520 + 300 * Math.sin(Math.PI * 2 * t / d - Math.PI / 2) }); filt(sw, 'lp', 2400);
    env(sw, [[0, 0], [0.3, 1], [d - 0.3, 1], [d, 0]]); layer(out, sw, 0.22);
    return snes(echo(out, 0.21, 0.3, 2).subarray(0, d * SR), { drv: 2, bits: 8, p: 0.85, fade: 0.05 });
  }, { ...X, vol: 0.7, dist: 130, prio: 4 }),
  // metro station alarm (same family): PA chime, then a ringing platform bell with a two-tone underlay
  extract_metro_alarm: def((R) => {
    const d = 3.85, out = buf(d);
    ['G5', 'E5', 'C5'].forEach((n, i) => mix(out, bell(R, N(n), 0.9), 0.4, i * 0.28));
    const b = fm(2.6, { f: 1180, ratio: 2.76, index: 3, index1: 2 }); am(b, 18, 1, 3); env(b, [[0, 0], [0.03, 1], [2.5, 0.9], [2.6, 0]]); layer(out, b, 0.4, 1.0);
    for (let k = 0; k < 6; k++) mix(out, horn(k & 1 ? 415 : 349, 0.42), 0.3, 1.0 + k * 0.42);
    return snes(echo(out, 0.19, 0.3, 2).subarray(0, d * SR), { drv: 1.6, bits: 8, p: 0.82, fade: 0.05 });
  }, { ...X, vol: 0.68, dist: 120, prio: 4 }),
  // airshaft: an engine spooling up and drawing closer instead of a siren; carries less far
  extract_airshaft_engine: def((R) => {
    const d = 9.5, out = buf(d);
    const tb = unison(d, 'saw', 1, [-7, 6], { fn: (t) => 300 + 280 * Math.min(1, t / 7) ** 1.3 }); filt(tb, 'bp', 1600, 2600, 2, 7);
    env(tb, [[0, 0], [1.5, 0.4], [8.6, 1], [d, 0]]); layer(out, tb, 0.3);
    const ro = noise(d, 'white', R); filt(ro, 'bp', 700, 1100, 0.7, 8); am(ro, 21, 0.3); env(ro, [[0, 0], [2, 0.5], [8.6, 1], [d, 0]]); layer(out, ro, 0.6);
    const lo = noise(d, 'brown', R); filt(lo, 'lp', 220); env(lo, [[0, 0], [2, 0.6], [8.6, 1], [d, 0]]); layer(out, lo, 0.7);
    return snes(out, { drv: 1.6, bits: 8, p: 0.8, fade: 0.4 });
  }, { ...X, vol: 0.6, dist: 55 }),
  // last 5 s of the countdown: console beep + relay tick
  extract_countdown_tick: def((R) => {
    const out = buf(0.14); const b = osc(0.07, { wave: 'rawsq', f: 1046, pw: 0.5 }); ad(b, 0.001, 0.07, 0.03); layer(out, b, 1);
    layer(out, click(R, 3000, 0.01), 0.35);
    return snes(echo(out, 0.05, 0.2, 1), { bits: 8, p: 0.5 });
  }, { ...X, vol: 0.6, dist: 40, bus: 'sfx' }),

  // ---------------------------------------------------------------- lifts (elevator + airshaft cage)
  // cage winding up the shaft over the last 6 s: motor rising, sheave squeal, cable rattle,
  // heavy lock-in clunk timed to the cage reaching the top (cue at t = 6.3 s left)
  elevator_rise: def((R) => {
    const d = 6.8, out = buf(d), top = 6.25;
    const m = osc(d, { wave: 'saw', f: 46, f1: 86, sweep: top }); filt(m, 'lp', 240, 460, 1.2); env(m, [[0, 0], [0.6, 1], [top - 0.2, 1], [top + 0.15, 0.1], [d, 0]]); layer(out, m, 0.55);
    const w = osc(d, { wave: 'sq', pw: 0.3, f: 170, f1: 320, sweep: top, vib: 0.01, vibHz: 7 }); filt(w, 'bp', 700, 980, 3); env(w, [[0, 0], [0.8, 0.5], [top - 0.3, 1], [top, 0]]); layer(out, w, 0.16);
    const sq = osc(2.0, { wave: 'saw', f: 1900, f1: 2300, vib: 0.02, vibHz: 6 }); filt(sq, 'bp', 2100, 2100, 6); env(sq, [[0, 0], [0.4, 1], [2, 0]]); layer(out, sq, 0.08, 2.2);
    const r = noise(d, 'brown', R); filt(r, 'lp', 190); env(r, [[0, 0], [1.0, 1], [top, 1], [d, 0]]); layer(out, r, 0.5);
    const rat = buf(d); for (let t = 0.3; t < top - 0.1; t += R.r(0.06, 0.15)) mix(rat, click(R, R.r(900, 2600), 0.02, 3), R.r(0.2, 0.7) * (0.4 + 0.6 * t / top), t);
    layer(out, rat, 0.22);
    layer(out, clack(R, 560, 0.16), 0.75, top); layer(out, thump(R, 95, 40, 0.4, 0.1), 0.9, top); layer(out, clack(R, 900, 0.08), 0.4, top + 0.16);
    return snes(out, { drv: 1.5, bits: 8, p: 0.85 });
  }, { ...X, vol: 0.72, dist: 60, v: 2 }),
  // xopen (elevator / airshaft): arrival chime + unlatch, the gate sinks into the collar (0.35-1.45 s), lands
  elevator_arrive: def((R) => {
    const out = buf(2.1);
    layer(out, bell(R, N('A5'), 0.7), 0.3); layer(out, bell(R, N('E6'), 0.6), 0.25, 0.16);
    layer(out, clack(R, 700, 0.12), 0.7, 0.05);
    layer(out, hiss(R, 1.2, 2800, [[0, 0], [0.05, 1], [0.7, 0.6], [1, 0]]), 0.35, 0.3);
    const sl = noise(1.15, 'brown', R); filt(sl, 'lp', 520); env(sl, [[0, 0], [0.15, 1], [1.0, 0.8], [1.15, 0]]); layer(out, sl, 0.6, 0.33);
    const mo = osc(1.1, { wave: 'saw', f: 120, f1: 90 }); filt(mo, 'lp', 600); env(mo, [[0, 0], [0.1, 1], [1.1, 0]]); layer(out, mo, 0.25, 0.35);
    layer(out, thump(R, 110, 50, 0.3, 0.08), 0.8, 1.45); layer(out, clack(R, 620, 0.12), 0.55, 1.46);
    return snes(out, { drv: 1.4, bits: 8, p: 0.85 });
  }, { ...X, vol: 0.78, dist: 60, prio: 4 }),
  // doors / gates: pneumatic hiss, slide, thunk at ~1.05 s (elevator gate closing on xgone; metro doors)
  elevator_door: def((R) => {
    const out = buf(1.4);
    layer(out, hiss(R, 0.45, 3000), 0.5);
    const sl = noise(0.9, 'brown', R); filt(sl, 'lp', 520); env(sl, [[0, 0], [0.15, 1], [0.8, 0.7], [0.9, 0]]); layer(out, sl, 0.6, 0.12);
    const sc = noise(0.85, 'white', R); filt(sc, 'bp', 1500, 1100, 2.5); env(sc, [[0, 0], [0.1, 1], [0.85, 0]]); layer(out, sc, 0.18, 0.15);
    layer(out, thump(R, 110, 50, 0.3, 0.08), 0.85, 1.02); layer(out, clack(R, 700, 0.12), 0.55, 1.03);
    return snes(out, { drv: 1.4, bits: 8, p: 0.82 });
  }, { ...X, vol: 0.72, dist: 45 }),
  // open state, last ~3 s: departure warning buzzer + descending "leaving" chime
  extract_depart_warn: def((R) => {
    const out = buf(1.8);
    for (const t of [0, 0.32]) { const z = osc(0.22, { wave: 'rawsq', f: 196, pw: 0.5 }); filt(z, 'lp', 2400); env(z, [[0, 0], [0.01, 1], [0.2, 1], [0.22, 0]]); layer(out, z, 0.45, t); }
    layer(out, bell(R, N('B5'), 0.6), 0.35, 0.75); layer(out, bell(R, N('G5'), 0.7), 0.35, 1.0); layer(out, bell(R, N('E5'), 0.8), 0.35, 1.25);
    return snes(echo(out, 0.12, 0.25, 1).subarray(0, 1.8 * SR), { bits: 8, p: 0.72 });
  }, { ...X, vol: 0.62, dist: 45 }),
  // gone: cage released (el 1.3) and dropping away until it bottoms out ~4.7 s later
  elevator_depart: def((R) => {
    const d = 5.6, out = buf(d), bottom = 4.7;
    layer(out, clack(R, 520, 0.16), 0.7); layer(out, thump(R, 95, 40, 0.35, 0.1), 0.7);
    layer(out, hiss(R, 0.8, 2600), 0.35, 0.05);
    const m = osc(d, { wave: 'saw', f: 88, f1: 36, sweep: bottom }); filt(m, 'lp', 420, 180, 1.2); env(m, [[0, 0], [0.3, 1], [3.6, 0.7], [bottom, 0.2], [d, 0]]); layer(out, m, 0.5, 0.1);
    const r = noise(d, 'brown', R); filt(r, 'lp', 170); env(r, [[0, 0], [0.4, 1], [bottom, 0.35], [d, 0]]); layer(out, r, 0.45);
    const rat = buf(d); for (let t = 0.3; t < bottom; t += R.r(0.07, 0.18)) mix(rat, click(R, R.r(800, 2200), 0.02, 3), R.r(0.2, 0.6) * (1 - t / (bottom + 0.3)), t);
    layer(out, rat, 0.2);
    layer(out, thump(R, 70, 32, 0.5, 0.12), 0.35, bottom); layer(out, clack(R, 450, 0.12), 0.18, bottom);
    return snes(out, { drv: 1.3, bits: 8, p: 0.78 });
  }, { ...X, vol: 0.66, dist: 50, v: 2, prio: 2 }),
  // xidle: console back online – power hum swells, two-tone ready chime
  extract_ready: def((R) => {
    const out = buf(1.0);
    const h = osc(0.6, { wave: 'saw', f: 60, f1: 120 }); filt(h, 'lp', 500); env(h, [[0, 0], [0.4, 1], [0.6, 0]]); layer(out, h, 0.3);
    layer(out, blips(R, [[N('G5'), 0.07], [0, 0.03], [N('C6'), 0.16]], { pw: 0.25 }), 0.5, 0.45);
    return snes(echo(out, 0.07, 0.25, 2).subarray(0, 1.0 * SR), { bits: 8, p: 0.55 });
  }, { ...X, vol: 0.45, dist: 22 }),
  // airshaft roof fan (loop; the rig drives volume + pitch from the rotor speed)
  extract_fan_loop: def((R) => {
    const out = rotor(R, 2, 26, 104, { body: 520, whineG: 0.25, chopDepth: 0.55, lowG: 0.7 });
    layer(out, osc(2, { wave: 'tri', f: 52 }), 0.35);
    const air = noise(2, 'pink', R); filt(air, 'bp', 1400, 1400, 0.6); am(air, 26, 0.3); layer(out, air, 0.3);
    return snes(seamless(out, 0.3), { bits: 8, fade: 0, p: 0.7 });
  }, { loop: true, v: 1, pj: 0, vol: 0.45, dist: 32, max: 4 }),

  // ---------------------------------------------------------------- metro (car slides in over the last 6 s)
  // tunnel approach, cued at t = 9.5 s left: swelling rumble, accelerating wheel-joint clatter, a horn as the
  // headlight shows (~t = 6), loudest as the car runs in, handing over to the brakes at t = 2.4 (~7.1 s)
  extract_metro_rumble: def((R) => {
    const d = 7.6, out = buf(d);
    const r = noise(d, 'brown', R); filt(r, 'lp', 110, 280, 1.0, 7); env(r, [[0, 0], [3.5, 0.6], [6.6, 1], [d, 0.5]]); layer(out, r, 0.85);
    const h = noise(d, 'pink', R); filt(h, 'bp', 800, 1700, 0.8, 7); env(h, [[0, 0], [3.5, 0.4], [6.8, 0.8], [d, 0.3]]); layer(out, h, 0.2);
    const cl = buf(d); railClatter(cl, R, 0.9, d - 0.3, 0.6, 0.15, 0.9, 1, (t) => 0.2 + 0.8 * Math.min(1, t / 6.6));
    layer(out, cl, 0.42);
    for (const f of [233, 277]) { const x = osc(0.9, { wave: 'saw', f }); mix(x, osc(0.9, { wave: 'sq', f: f * 1.005, pw: 0.4 }), 0.5); filt(x, 'lp', 1200); env(x, [[0, 0], [0.05, 1], [0.8, 0.8], [0.9, 0]]); layer(out, x, 0.24, 3.5); }
    return snes(out, { drv: 1.5, bits: 8, p: 0.88 });
  }, { ...X, vol: 0.8, dist: 90, max: 1 }),
  // brakes at t = 2.4 s left: squeal, air release (~t 0.5), stop thump (~t 0.2), door chime as it opens
  extract_metro_arrive: def((R) => {
    const d = 3.2, out = buf(d);
    const sq = osc(1.9, { wave: 'saw', f: 2350, f1: 1850, vib: 0.012, vibHz: 11 }); filt(sq, 'bp', 2400, 1950, 6); env(sq, [[0, 0], [0.15, 1], [1.5, 0.7], [1.9, 0]]); layer(out, sq, 0.32);
    const r = noise(2.2, 'brown', R); filt(r, 'lp', 220, 110, 1); env(r, [[0, 1], [2.1, 0]]); layer(out, r, 0.6);
    layer(out, hiss(R, 0.9, 2800), 0.45, 1.9);
    layer(out, thump(R, 110, 50, 0.25, 0.08), 0.55, 2.2);
    layer(out, bell(R, N('E5'), 0.7), 0.3, 2.45); layer(out, bell(R, N('C5'), 0.8), 0.3, 2.75);
    return snes(out, { drv: 1.3, bits: 8, p: 0.82 });
  }, { ...X, vol: 0.75, dist: 70, max: 1 }),
  // gone (cued at el 0.9, car leaves from el 1.0 over 6.5 s): thunk, traction-motor "song" rising,
  // clatter slowing as it pulls out of earshot
  extract_metro_depart: def((R) => {
    const d = 6.2, out = buf(d);
    layer(out, thump(R, 120, 55, 0.25, 0.06), 0.5); layer(out, clack(R, 700, 0.1), 0.4);
    const m = osc(d, { wave: 'sq', pw: 0.4, fn: (t) => 110 + 560 * Math.min(1, t / 4.2) ** 1.4 }); filt(m, 'bp', 800, 1900, 2.5, 5);
    env(m, [[0, 0], [0.4, 0.8], [3.2, 1], [d, 0]]); layer(out, m, 0.25, 0.2);
    const r = noise(d, 'brown', R); filt(r, 'lp', 230, 110, 1); env(r, [[0, 0], [0.6, 1], [d, 0]]); layer(out, r, 0.7);
    const cl = buf(d); railClatter(cl, R, 0.9, d - 0.3, 0.55, 0.17, 0.88, 0.8, (t) => 1 - t / d);
    layer(out, cl, 0.35);
    return snes(out, { drv: 1.4, bits: 8, p: 0.8 });
  }, { ...X, vol: 0.75, dist: 80, max: 1 }),

  // ---------------------------------------------------------------- raider hatch (silent extract)
  // one take over the whole trigger('use') animation: quiet key-reader accept, hand-wheel ratchet (0-0.6),
  // seal cracks with a steam hiss as the lid lifts (0.45-1.05), hiss tails off, lid swings back (4.4-5.5),
  // seal clunk and wheel re-lock
  extract_hatch_steam: def((R) => {
    const out = buf(6.0);
    layer(out, blips(R, [[N('C6'), 0.05], [N('G6'), 0.08]], { pw: 0.25 }), 0.2);
    for (let k = 0; k < 9; k++) mix(out, click(R, 3200, 0.012, 5), 0.35 * (1 - k / 12), 0.06 + k * 0.06);
    layer(out, clack(R, 480, 0.14), 0.55, 0.45);
    layer(out, hiss(R, 2.2, 4200, [[0, 0], [0.02, 1], [0.25, 0.7], [1, 0]]), 0.6, 0.47);
    const c = osc(0.6, { wave: 'saw', fn: (t) => 160 + 70 * Math.sin(t * 9) + 30 * Math.sin(t * 37) }); filt(c, 'bp', 900, 900, 5); env(c, [[0, 0], [0.1, 1], [0.5, 0.6], [0.6, 0]]); layer(out, c, 0.2, 0.45);
    layer(out, thump(R, 90, 45, 0.25, 0.07), 0.45, 1.05);
    const c2 = osc(0.9, { wave: 'saw', fn: (t) => 140 + 50 * Math.sin(t * 7) + 25 * Math.sin(t * 29) }); filt(c2, 'bp', 800, 800, 5); env(c2, [[0, 0], [0.15, 1], [0.8, 0.6], [0.9, 0]]); layer(out, c2, 0.16, 4.5);
    layer(out, thump(R, 80, 38, 0.35, 0.1), 0.75, 5.45); layer(out, clack(R, 600, 0.12), 0.6, 5.46);
    for (let k = 0; k < 4; k++) mix(out, click(R, 3000, 0.012, 5), 0.25, 5.62 + k * 0.05);
    return snes(out, { drv: 1.3, bits: 8, p: 0.72 });
  }, { ...X, vol: 0.55, dist: 26 }),
  // the raider drops through: cloth + slide whoosh, ladder rungs receding, soft landing below
  hatch_extract: def((R) => {
    const out = buf(1.8);
    layer(out, rustle(R, 0.3, 1800), 0.4);
    layer(out, whoosh(R, 0.7, 900, 300, 1), 0.5, 0.05);
    for (let k = 0; k < 4; k++) layer(out, clack(R, 1100 - k * 120, 0.06), 0.45 * (1 - k * 0.2), 0.25 + k * 0.17);
    layer(out, thump(R, 120, 60, 0.2, 0.06), 0.3, 1.2);
    filt(out, 'lp', 5000, 1600, 0.7);
    return snes(out, { bits: 8, p: 0.62 });
  }, { ...X, vol: 0.5, dist: 20 }),
  // local "made it out" sting
  extract_success: def((R) => {
    const out = buf(2.2);
    ['D5', 'F#5', 'A5', 'D6', 'F#6', 'A6'].forEach((n, i) => mix(out, bell(R, N(n), 1.2), 0.3, i * 0.08));
    const p = unison(1.8, 'saw', N('D4'), [-9, 0, 8]); filt(p, 'lp', 600, 3500, 1, 0.6); env(p, [[0, 0], [0.4, 1], [1.8, 0]]); layer(out, p, 0.3, 0.1);
    layer(out, whoosh(R, 0.8, 400, 3000, 1), 0.3);
    return snes(echo(out, 0.16, 0.3, 2), { bits: 9, p: 0.8 });
  }, { ...X, bus: 'ui', vol: 0.75, max: 1, prio: 2 }),

  // ---------------------------------------------------------------- departure (lever -> closing -> gone)
  // departure lever: ratchet, heavy clunk, relay + acknowledgement beep (xclose with a raider)
  extract_lever: def((R) => {
    const out = buf(1.1);
    for (let k = 0; k < 6; k++) mix(out, click(R, 2600 - k * 120, 0.015, 5), 0.4, k * 0.07);
    layer(out, clack(R, 520, 0.16), 0.75, 0.45); layer(out, thump(R, 110, 55, 0.25, 0.07), 0.6, 0.45);
    layer(out, click(R, 3400, 0.02, 6), 0.4, 0.62);
    layer(out, blips(R, [[N('A5'), 0.08], [N('E6'), 0.14]], { pw: 0.25 }), 0.3, 0.7);
    return snes(out, { drv: 1.3, bits: 8, p: 0.75 });
  }, { ...X, vol: 0.65, dist: 30 }),
  // closing (10 s): departure buzzer pulsing faster, two-tone warning chime, door motor in the last 2 s
  extract_close_seq: def((R) => {
    const d = 10.2, out = buf(d);
    let t = 0.05, gap = 1.0;
    while (t < 9.3) {
      const z = osc(0.24, { wave: 'rawsq', f: 196 + (t / 9.3) * 60, pw: 0.5 }); filt(z, 'lp', 2600);
      env(z, [[0, 0], [0.01, 1], [0.22, 1], [0.24, 0]]); layer(out, z, 0.42, t);
      t += gap; gap = Math.max(0.45, gap * 0.9);
    }
    for (const t0 of [0.3, 5.3]) { layer(out, bell(R, N('B5'), 0.6), 0.28, t0); layer(out, bell(R, N('G5'), 0.7), 0.28, t0 + 0.25); }
    const mo = osc(2.0, { wave: 'saw', f: 95, f1: 70 }); filt(mo, 'lp', 520); env(mo, [[0, 0], [0.2, 1], [1.8, 0.8], [2.0, 0]]); layer(out, mo, 0.3, 8.0);
    layer(out, servo(R, 160, 1.6, 1.3), 0.18, 8.1);
    return snes(out, { drv: 1.4, bits: 8, p: 0.8 });
  }, { ...X, vol: 0.62, dist: 55 }),

  // ---------------------------------------------------------------- airshaft dropship (black-and-red VTOL)
  // final approach over the last 8 s of the call: turbines spooling down from cruise into a hover, wash rising
  extract_dropship_arrive: def((R) => {
    const d = 8.6, out = buf(d);
    const tb = unison(d, 'saw', 1, [-8, 7], { fn: (t) => 620 - 240 * Math.min(1, t / 7.5) }); filt(tb, 'bp', 2400, 1500, 2.2, 8);
    env(tb, [[0, 0], [1.5, 0.6], [7.0, 1], [d, 0.6]]); layer(out, tb, 0.3);
    const wash = noise(d, 'white', R); filt(wash, 'bp', 600, 900, 0.7, 8); am(wash, 24, 0.35); env(wash, [[0, 0], [3, 0.4], [7.5, 1], [d, 0.8]]); layer(out, wash, 0.55);
    const lo = noise(d, 'brown', R); filt(lo, 'lp', 200); env(lo, [[0, 0], [2, 0.5], [7.5, 1], [d, 0.7]]); layer(out, lo, 0.65);
    layer(out, whoosh(R, 2.2, 300, 1500, 1), 0.35, 0.3);
    return snes(out, { drv: 1.5, bits: 8, p: 0.82, fade: 0.3 });
  }, { ...X, vol: 0.7, dist: 70 }),
  // hovering: ducted fans + turbine whine (loop; the view plays it nearby while the dropship is present)
  extract_dropship_loop: def((R) => {
    const out = rotor(R, 2, 38, 152, { body: 700, whineG: 0.3, chopDepth: 0.45, lowG: 0.6 });
    const tb = unison(2, 'saw', 380, [-7, 6]); filt(tb, 'bp', 1900, 1900, 2.5); layer(out, tb, 0.25);
    const wash = noise(2, 'pink', R); filt(wash, 'bp', 500, 500, 0.6); am(wash, 19, 0.3); layer(out, wash, 0.45);
    return snes(seamless(out, 0.3), { bits: 8, fade: 0, p: 0.72 });
  }, { loop: true, v: 1, pj: 0, vol: 0.55, dist: 45, max: 3 }),
  // the pull: winch whine climbing + whoosh up the beam as the raiders are lifted (gone, first 1.6 s)
  extract_beam_lift: def((R) => {
    const out = buf(2.0);
    const w = osc(1.7, { wave: 'sq', pw: 0.3, f: 220, f1: 660 }); filt(w, 'bp', 1200, 2600, 2.5); env(w, [[0, 0], [0.1, 1], [1.5, 0.8], [1.7, 0]]); layer(out, w, 0.3);
    layer(out, whoosh(R, 1.6, 300, 2600, 1), 0.5, 0.05);
    layer(out, clack(R, 900, 0.1), 0.45, 1.6);
    return snes(out, { drv: 1.3, bits: 8, p: 0.78 });
  }, { ...X, vol: 0.62, dist: 45 }),
  // departure: power up, nose down, climbing roar receding
  extract_dropship_depart: def((R) => {
    const d = 6.2, out = buf(d);
    const tb = unison(d, 'saw', 1, [-8, 7], { fn: (t) => 380 + 420 * Math.min(1, t / 2.5) }); filt(tb, 'bp', 1900, 3200, 2.2, 3);
    env(tb, [[0, 0], [0.4, 1], [2.5, 1], [d, 0]]); layer(out, tb, 0.3);
    const wash = noise(d, 'white', R); filt(wash, 'bp', 900, 500, 0.7, d); am(wash, 26, 0.35); env(wash, [[0, 0.6], [1.0, 1], [d, 0]]); layer(out, wash, 0.6);
    const lo = noise(d, 'brown', R); filt(lo, 'lp', 220); env(lo, [[0, 0.8], [1.2, 1], [d, 0]]); layer(out, lo, 0.6);
    layer(out, whoosh(R, 2.5, 1800, 400, 1), 0.3, 1.2);
    return snes(out, { drv: 1.5, bits: 8, p: 0.82 });
  }, { ...X, vol: 0.72, dist: 80 }),

  // ---------------------------------------------------------------- raider hatch: the 15 s window closes
  hatch_close: def((R) => {
    const out = buf(1.4);
    const c = osc(0.5, { wave: 'saw', fn: (t) => 150 + 60 * Math.sin(t * 8) }); filt(c, 'bp', 850, 850, 5); env(c, [[0, 0], [0.1, 1], [0.5, 0]]); layer(out, c, 0.2);
    layer(out, thump(R, 82, 38, 0.4, 0.1), 0.8, 0.5); layer(out, clack(R, 600, 0.12), 0.6, 0.51);
    layer(out, hiss(R, 0.6, 3600), 0.3, 0.55);
    for (let k = 0; k < 4; k++) mix(out, click(R, 3000, 0.012, 5), 0.25, 0.75 + k * 0.05);
    return snes(out, { drv: 1.3, bits: 8, p: 0.72 });
  }, { ...X, vol: 0.55, dist: 26 }),
};
