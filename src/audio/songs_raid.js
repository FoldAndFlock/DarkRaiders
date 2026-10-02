// Raid music: one song per map with three intensity layers that crossfade via setIntensity():
//   base   – sparse atmospheric bed (map flavour); silence and space matter in an extraction game
//   tense  – muted pulse bass, clock ticks, a heartbeat and dissonant string clusters
//   combat – driving drums, 16th synth bass, pluck arp, brass stabs and the recurring "ARK" hook
// All three maps share a 16-bar progression shape (i–VI–iv–V) in their own key, so the shared
// tense/combat layers (written in D minor) are transposed per map with the channel `tr` option.

const bars = (n) => `.:${n * 16}`;
const E = (n) => '.'.repeat(n);
const rep = (s, n) => Array(n).fill(s).join(' ');
const PROG_D = 'Dm9:64 Bbmaj7:64 Gm9:64 Asus4:32 A:32';

function tenseLayer(tr) {
  return [
    { inst: 'bass', chords: PROG_D, mode: 'bass', oct: 2, rhythm: 'x.x.x.x.x.x.x.x.', tr, gate: 0.45, vol: 0.55,
      adsr: [0.004, 0.12, 0.35, 0.08], echo: 0.05, rev: 0.1 },
    { inst: 'strings', tr, vol: 0.5, adsr: [2.8, 1, 0.9, 2.5], rev: 0.65, echo: 0.2, notes: 'E5,F5:64 .:64 A4,Bb4:64 D5,E5:32 C#5,D5:32' },
    { inst: 'glass', tr, vol: 0.28, echo: 0.6, pan: 0.45, notes: rep('A5:1 .:7', 16) + ' ' + bars(8) },
    { drums: { tk: 'x...x...x...x...', tk2: '..o...o...o...o.', k: 'X..x' + E(28) }, vol: 0.9, rev: 0.2, echo: 0.1 },
  ];
}

const HOOK_D = [
  'D5:3 F5:3 A5:4 G5:2 F5:2 E5:2 | D5:8 .:8 | D5:3 F5:3 C6:4 A5:2 G5:2 F5:2 | E5:8 .:8',
  'D5:3 F5:3 A5:4 Bb5:2 A5:2 F5:2 | G5:8 .:8 | F5:3 D5:3 F5:4 A5:6 | .:16',
  'Bb4:3 D5:3 G5:4 F5:2 D5:2 Bb4:2 | A4:8 .:8 | Bb4:3 D5:3 A5:4 G5:2 F5:2 D5:2 | F5:8 .:8',
  'E5:3 A5:3 D6:4 E6:2 D6:2 A5:2 | D6:8 .:8 | E5:3 A5:3 C#6:4 E6:6 | C#6:8 .:8',
];
const FLAVOUR_DRUMS = {
  damn_grounds: { m: '..o.......o...x.', m2: E(14) + 'o.' },              // industrial clanks
  green_gate: { b: 'x.......x.x.....' + 'x.......x...o.o.' },             // taiko-ish booms
  sandy_city: { p: 'x..o..x.x..o..o.', p2: '..x.....o..x....' },          // hand drums
};
function combatLayer(tr, map, hookOct = 0) {
  return [
    { inst: 'bassdrive', chords: PROG_D, mode: 'bass', oct: 2, rhythm: 'xxoxxxoxxxoxxxo5', tr, vol: 0.55, gate: 0.8, echo: 0, rev: 0.05 },
    { inst: 'pluck', chords: PROG_D, mode: 'arp', rate: 1, pattern: 'up', span: 2, oct: 4, tr, vol: 0.38, echo: 0.3, pan: -0.35 },
    { inst: 'brass', chords: PROG_D, mode: 'stab', rhythm: 'X--..x-..x-.....', oct: 4, tr, vol: 0.38, pan: 0.2, gate: 0.85 },
    { inst: 'lead', notes: HOOK_D, tr: tr + hookOct, vol: 0.62, echo: 0.42, rev: 0.3, pan: 0.05 },
    { drums: {
      k: 'x.....x.x.....x. x.....x.x..x..x.',
      s: '....x.......x...',
      h: 'XxoxXxoxXxoxXxox',
      oh: '..............o.',
      t1: [E(56), 'x.x.....'], t2: [E(60), 'xx..'], t3: [E(62), 'xX'],
      c: ['X', E(127)],
      r: [E(127), 'x'],
      ...FLAVOUR_DRUMS[map],
    }, rev: 0.18, echo: 0.04 },
  ];
}

// ------------------------------------------------------------------ Damn Grounds (D minor, swampy/industrial)
const raid_damn_grounds = {
  bpm: 116, echo: { beats: 0.75, fb: 0.52, lp: 1900, mix: 0.6 }, rev: 0.6,
  layers: {
    base: [
      { inst: 'drone', notes: 'D2,A2:256', vol: 0.75, echo: 0, rev: 0.3 },
      { inst: 'darkpad', chords: PROG_D, oct: 3, vol: 0.55, rev: 0.6, echo: 0.15 },
      { inst: 'kalimba', vol: 0.5, echo: 0.7, rev: 0.5, pan: 0.4,          // water drips, 7-bar loop
        notes: '.:20 A5:4 .:12 F5:4 .:28 D6:4 .:8 C6:4 .:28' },
      { inst: 'bell', vol: 0.3, echo: 0.6, rev: 0.6, pan: -0.45,           // distant signal, 13-bar loop
        notes: '.:96 A6:8 .:24 F6:8 .:72' },
      { drums: { m: E(30) + 'o' + E(40) + 'x' + E(16), m2: E(70) + 'o' + E(49), b: 'o' + E(127) }, vol: 0.85, rev: 0.6, echo: 0.45 },
    ],
    tense: tenseLayer(0),
    combat: combatLayer(0, 'damn_grounds'),
  },
};

// ------------------------------------------------------------------ Green Gate (E minor, forest/mountain mystery)
const PROG_E = 'Em9:64 Cmaj7:64 Am9:64 Bsus4:32 B:32';
const raid_green_gate = {
  bpm: 104, echo: { beats: 1, fb: 0.55, lp: 2800, mix: 0.62 }, rev: 0.65,
  layers: {
    base: [
      { inst: 'drone', notes: 'E2,B2:256', vol: 0.6, echo: 0, rev: 0.3 },
      { inst: 'choir', chords: PROG_E, oct: 4, vol: 0.42, rev: 0.7, echo: 0.2, adsr: [2.5, 1, 0.85, 3] },
      { inst: 'flute', vol: 0.5, echo: 0.6, rev: 0.6, pan: -0.2,             // 12-bar loop: lonely call
        notes: 'B5:12 A5:2 G5:2 | E5:16 | .:32 | D6:8 B5:8 | A5:16 | .:48 | G5:6 F#5:2 E5:8 | B4:16 | .:16' },
      { inst: 'bell', vol: 0.32, echo: 0.7, rev: 0.6, pan: 0.45,             // 11-bar loop
        notes: '.:40 E6:8 .:56 B6:8 .:40 F#6:8 .:16' },
      { drums: { b: 'x' + E(63) + 'o' + E(31) + 'g' + E(31) }, vol: 0.75, rev: 0.6, echo: 0.3 },
    ],
    tense: tenseLayer(2),
    combat: combatLayer(2, 'green_gate'),
  },
};

// ------------------------------------------------------------------ Sandy City (A minor / E phrygian-dominant, desert heat)
const PROG_A = 'Am9:64 Fmaj7:64 Dm9:64 Esus4:32 E:32';
const raid_sandy_city = {
  bpm: 112, echo: { beats: 0.75, fb: 0.45, lp: 3200, mix: 0.55 }, rev: 0.55,
  layers: {
    base: [
      { inst: 'drone', notes: 'A1,E2:256', vol: 0.65, echo: 0, rev: 0.3 },
      { inst: 'strings', chords: PROG_A, oct: 5, vol: 0.32, rev: 0.7, echo: 0.35, adsr: [2.2, 1, 0.85, 2.5] },  // heat shimmer
      { inst: 'koto', vol: 0.6, echo: 0.5, rev: 0.45, pan: 0.3, notes: [
        'E5:2 F5:2 G#5:4 A5:2 G#5:2 F5:4 | E5:16', bars(2),
        'A5:2 C6:2 E6:4 D6:2 C6:2 A5:4 | C6:16', bars(2),
        'D5:2 E5:2 F5:4 A5:2 F5:2 E5:4 | D5:16', bars(2),
        'A5:2 B5:2 C6:2 B5:2 A5:4 E5:4 | .:16 | F5:2 E5:2 F5:2 G#5:2 E5:8 | .:16'] },
      { drums: { p: 'x..o..x.........' + E(16) + 'x..o..x...o.o...' + E(16), r: E(127) + 'x' }, vol: 0.7, rev: 0.35, echo: 0.3 },
    ],
    tense: tenseLayer(-5),
    combat: combatLayer(-5, 'sandy_city'),
  },
};

export const RAID_SONGS = { raid_damn_grounds, raid_green_gate, raid_sandy_city };
