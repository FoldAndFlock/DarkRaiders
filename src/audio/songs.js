// Original compositions for DarkRaiders – 80s retro-futurist synth through a SNES sound chip.
// Notation: see sequencer.js. 16 steps per bar. All pieces are original.
import { RAID_SONGS } from './songs_raid.js';

export const bars = (n) => `.:${n * 16}`;            // rest token for n bars
export const rep = (s, n) => Array(n).fill(s).join(' ');
export const E = (n) => '.'.repeat(n);               // n empty drum steps

// ===================================================================== MENU – "Topside Dusk"
// D minor, 78 bpm, 24 bars (~74 s). A lonely square lead over warm pads and a slow pluck arp;
// the B section lifts with choir, gated 80s drums and a hopeful climb, outro on glassy bells.
const MENU_CH = 'Dm Bbmaj7 F C | Dm Bbmaj7 F C | Gm Bb Dm A | Bb C F Dm | Gm C F A | Dm Bbmaj7 Gm Asus4';
const menu = {
  bpm: 78, echo: { beats: 0.75, fb: 0.5, lp: 2300, mix: 0.62 }, rev: 0.6,
  layers: { base: [
    { inst: 'pad', chords: MENU_CH, oct: 4, vol: 0.85, rev: 0.45, echo: 0.15 },
    { inst: 'choir', chords: [bars(12), 'Bb C F Dm Gm C F A', bars(4)], oct: 4, vol: 0.55, rev: 0.6 },
    { inst: 'pluck', chords: MENU_CH, mode: 'arp', rate: 2, pattern: 'updown', span: 2, oct: 4, vol: 0.55, echo: 0.5, pan: 0.3 },
    { inst: 'bass', chords: 'Dm Bbmaj7 F C | Dm Bbmaj7 F C | Gm Bb Dm A | Bb^1 C^1 F^1 Dm^1 | Gm^1 C^1 F^1 A^1 | Dm Bbmaj7 Gm Asus4',
      mode: 'bass', oct: 2, rhythms: ['x-------------5-', 'x-x-x-x-x-x-o-x-'], vol: 0.7, echo: 0, rev: 0.1 },
    { inst: 'lead', vol: 0.8, echo: 0.6, rev: 0.4, pan: -0.1, notes: [
      bars(4),
      'D5:6 E5:2 F5:4 A5:4 | G5:8 F5:4 D5:4 | F5:6 E5:2 C5:4 A4:4 | G4:4 C5:4 E5:8',
      'D5:6 C5:2 Bb4:4 D5:4 | F5:8 D5:4 Bb4:4 | A4:6 D5:2 F5:4 E5:4 | E5:8 C#5:4 A4:4',
      'D5:4 F5:4 Bb5:8! | A5:6 G5:2 E5:4 C5:4 | F5:4 A5:4 C6:8! | A5:6 G5:2 F5:4 E5:4',
      'D5:4 G5:4 Bb5:8! | C6:6 Bb5:2 A5:4 G5:4 | A5:12 F5:4 | E5:12 .:4',
      bars(4)] },
    { inst: 'bell', vol: 0.7, echo: 0.6, rev: 0.5, pan: 0.35, notes: [
      'A5:8 .:8 | F5:8 .:8 | C6:8 .:8 | G5:16', bars(16),
      'D6:4 A5:4 F5:8 | D6:4 Bb5:4 F5:8 | D6:4 Bb5:4 G5:8 | A5:16'] },
    { drums: {
      k: [E(192), rep('x.........x.....', 8), E(64)],
      s: [E(192), rep('....x.......x...', 7), '....x.......x.oo', E(64)],
      h: [E(192), rep('o.o.o.o.o.o.o.o.', 8), E(64)],
      r: [E(192), 'x', E(127), 'x', E(63)],
      c: [E(192), 'x', E(127), 'o', E(63)],
    }, rev: 0.35, echo: 0.08 },
  ] },
};

// ===================================================================== HUB – "Desperanza (Sewer Suites Mix)"
// F major, 96 bpm, light swing, 32 bars (~80 s). Warm EP melody, bouncy bass, plucked offbeat
// comping and market-chatter kalimba; the second half trades the tune for a bell counter-line.
const HUB_CH = 'Fmaj7 Am7 Bbmaj7 C | Fmaj7 Am7 Gm7 Csus4 | Dm7 Am7 Bbmaj7 F/A | Gm7 Am7 Bbmaj7 Csus4:8 C:8';
const hub = {
  bpm: 96, swing: 0.1, echo: { beats: 0.75, fb: 0.38, lp: 3000, mix: 0.45 }, rev: 0.45,
  layers: { base: [
    { inst: 'strings', chords: HUB_CH, oct: 4, vol: 0.55, rev: 0.4 },
    { inst: 'pluck', chords: HUB_CH, mode: 'stab', rhythm: '..x...x...x...x.', oct: 4, vol: 0.45, echo: 0.3, pan: 0.25, gate: 0.5 },
    { inst: 'bass', chords: HUB_CH, mode: 'bass', oct: 2, rhythm: 'x--x--5-x--x-o5-', vol: 0.7, echo: 0, rev: 0.08 },
    { inst: 'kalimba', chords: HUB_CH, mode: 'arp', pattern: 'rand', rate: 2, span: 2, oct: 5, vol: 0.32, echo: 0.45, pan: -0.4 },
    { inst: 'ep', vol: 0.8, echo: 0.35, rev: 0.35, pan: -0.05, notes: [
      'A5:2 C6:2 A5:2 G5:2 F5:4 E5:4 | E5:6 G5:2 C6:4 A5:4 | D6:4 C6:2 A5:2 F5:8 | G5:6 A5:2 G5:4 E5:4',
      'A5:2 C6:2 A5:2 G5:2 F5:4 A5:4 | C6:6 E6:2 D6:4 C6:4 | Bb5:4 A5:4 G5:4 F5:4 | G5:12 .:4',
      'F5:2 A5:2 D6:4 C6:4 A5:4 | G5:6 E5:2 C5:8 | D5:2 F5:2 A5:4 Bb5:4 A5:4 | F5:8 .:4 C5:4',
      'D5:4 F5:4 Bb5:4 A5:4 | G5:4 E5:4 C6:8 | D6:6 C6:2 A5:4 F5:4 | G5:8 E5:4 .:4',
      bars(16)] },
    { inst: 'bell', vol: 0.5, echo: 0.5, rev: 0.5, pan: 0.4, notes: [bars(16),
      'C6:16 | E6:8 C6:8 | D6:8 F6:8 | E6:16 | C6:16 | E6:8 G6:8 | F6:8 D6:8 | C6:16',
      'F6:8 D6:8 | E6:8 C6:8 | D6:16 | C6:16 | Bb5:8 D6:8 | C6:8 E6:8 | F6:8 D6:8 | C6:16'] },
    { drums: {
      k: 'x.....x...x..... x.....x...x..x..',
      rim: '....o.......o... ....o.......o...',
      sh: rep('gogo', 8),
      cl: [E(16), '............x...'],
      oh: [E(16), '..............o.'],
    }, rev: 0.2, echo: 0.05 },
  ] },
};

// ===================================================================== LOBBY – "Ready Room"
// A minor (transposed per map), 100 bpm, 8 bars. Pulsing bass, 16th glass arp, a brass swell
// in the second half – anticipation before the drop topside.
const LOBBY_CH = 'Am Fmaj7 C G | Am Fmaj7 Dm Esus4:8 E:8';
const lobby = {
  bpm: 100, echo: { beats: 0.75, fb: 0.45, lp: 2600, mix: 0.55 }, rev: 0.5,
  layers: { base: [
    { inst: 'pad', chords: LOBBY_CH, oct: 4, vol: 0.65 },
    { inst: 'bass', chords: LOBBY_CH, mode: 'bass', oct: 2, rhythm: 'x-x-x-x-x-x-x-xo', vol: 0.65, echo: 0, adsr: [0.005, 0.2, 0.5, 0.1] },
    { inst: 'glass', chords: LOBBY_CH, mode: 'arp', rate: 1, pattern: 'up', span: 2, oct: 4, vol: 0.4, echo: 0.4, pan: 0.3 },
    { inst: 'brass', chords: [bars(4), 'Am Fmaj7 Dm Esus4:8 E:8'], oct: 4, vol: 0.4, adsr: [0.6, 0.5, 0.8, 0.8], rev: 0.5 },
    { inst: 'bell', vol: 0.55, echo: 0.6, pan: -0.3, notes: 'E5:8 .:8 | C6:8 .:8 | G5:8 .:8 | D6:8 .:8 | E6:12 .:4 | C6:12 .:4 | A5:8 F5:8 | B5:16' },
    { drums: {
      k: 'x.......x.......',
      h: rep('o.x.', 4),
      rim: '....o.......o...',
      r: ['x', E(127)],
    }, rev: 0.25, echo: 0.05 },
  ] },
};

// ===================================================================== EXTRACT – "Lift Off"
// D minor, 124 bpm, 8-bar loop that modulates up a tone every pass (max +6): rising tension
// while the elevator / hatch countdown runs. The lead + snare layer enters on bar 9.
const EX_CH = 'Dm Bb C A | Dm Bb C Asus4:8 A:8';
const extract = {
  bpm: 124, echo: { beats: 0.75, fb: 0.42, lp: 2800, mix: 0.5 }, rev: 0.45,
  modulate: { every: 8, step: 2, max: 6 }, layerIn: { build: 8 },
  layers: {
    base: [
      { inst: 'pad', chords: EX_CH, oct: 4, vol: 0.55 },
      { inst: 'bassdrive', chords: EX_CH, mode: 'bass', oct: 2, rhythm: 'x.xxx.xxx.xxx.xo', vol: 0.65, echo: 0 },
      { inst: 'glass', chords: EX_CH, mode: 'arp', rate: 1, pattern: 'up', span: 3, oct: 4, vol: 0.38, echo: 0.35, pan: -0.3 },
      { drums: { k: 'x...x...x...x...', h: 'oxoxoxoxoxoxoxox', r: ['x', E(127)] }, rev: 0.15, echo: 0.03 },
    ],
    build: [
      { inst: 'lead', vol: 0.75, echo: 0.45, rev: 0.35, notes: [
        'A4:4 D5:4 F5:4 A5:4 | Bb5:8 A5:4 F5:4 | G5:4 C6:4 E6:4 G5:4 | E5:8 C#5:8',
        'A4:4 D5:4 F5:4 A5:4 | D6:8 C6:4 Bb5:4 | C6:4 E6:4 G6:4 E6:4 | E6:8 C#6:8'] },
      { inst: 'brass', chords: EX_CH, mode: 'stab', rhythm: 'X--.......x-....', oct: 4, vol: 0.45 },
      { drums: {
        s: '....x.......x...',
        cl: [E(112), '....x.......x.xx'],
        t1: [E(120), 'x.x.....'], t2: [E(124), 'xx..'], t3: [E(126), 'xX'],
        c: ['X', E(127)],
      }, rev: 0.25, echo: 0.04 },
    ],
  },
};

// ===================================================================== JINGLES (one-shot)
const j_extracted = {          // bVI–bVII–I lift into D major: made it out
  bpm: 100, loop: false, steps: 48, tail: 4.5, echo: { beats: 0.75, fb: 0.45, mix: 0.55 }, rev: 0.6,
  layers: { base: [
    { inst: 'pad', chords: 'Bb:8 C:8 D:32', oct: 4, vol: 0.7, adsr: [0.05, 1, 0.85, 2.5] },
    { inst: 'brass', chords: 'Bb:8 C:8 D:32', oct: 4, vol: 0.45, adsr: [0.03, 0.6, 0.7, 2] },
    { inst: 'brass', vol: 0.65, echo: 0.4, notes: 'D5:2 F5:2 Bb5:4 E5:2 G5:2 C6:4 F#5:4 A5:4 D6:24!', adsr: [0.02, 0.6, 0.75, 1.5] },
    { inst: 'bell', chords: 'Bb:8 C:8 D:32', mode: 'arp', rate: 1, pattern: 'up', span: 3, oct: 5, vol: 0.45, echo: 0.5 },
    { inst: 'bass', notes: 'Bb2:8 C3:8 D2:32', vol: 0.7, echo: 0 },
    { drums: { t2: ['x.x.x.x.x.x.xxxx', E(32)], k: [E(16), 'X', E(31)], c: [E(16), 'X', E(31)], r: [E(16), 'x', E(31)] }, rev: 0.35 },
  ] },
};
const j_death = {              // descending minor lament
  bpm: 80, loop: false, steps: 48, tail: 5, echo: { beats: 1, fb: 0.5, lp: 1800, mix: 0.6 }, rev: 0.75,
  layers: { base: [
    { inst: 'choir', chords: 'Gm:8 A:8 Dm:32', oct: 4, vol: 0.6, adsr: [0.3, 1, 0.85, 3] },
    { inst: 'darkpad', chords: 'Gm:8 A:8 Dm:32', oct: 3, vol: 0.5, adsr: [0.2, 1, 0.85, 3] },
    { inst: 'lead', vol: 0.7, echo: 0.6, notes: 'D6:3 C6:1 Bb5:4 C#6:3 Bb5:1 A5:4 F5:6 E5:6 D5:20', adsr: [0.03, 0.5, 0.75, 1.5] },
    { inst: 'sub', notes: 'G1:8 A1:8 D1:32', vol: 0.6, echo: 0 },
    { inst: 'bell', notes: '.:16 D5:32', vol: 0.4 },
    { drums: { b: 'x' + E(15) + 'o' + E(31) }, rev: 0.6 },
  ] },
};
const j_levelup = {
  bpm: 140, loop: false, steps: 32, tail: 3, echo: { beats: 0.5, fb: 0.4, mix: 0.5 }, rev: 0.5,
  layers: { base: [
    { inst: 'bell', vol: 0.65, echo: 0.4, notes: 'G4:1 C5:1 E5:1 G5:1 C6:1 E6:1 G6:2 C6,E6,G6:24!' },
    { inst: 'brass', chords: 'F:4 G:4 C:24', oct: 4, vol: 0.5, adsr: [0.02, 0.5, 0.7, 1.2] },
    { inst: 'bass', notes: 'F2:4 G2:4 C2:24', vol: 0.6, echo: 0 },
    { drums: { k: E(8) + 'X' + E(23), c: E(8) + 'X' + E(23), t1: 'x.x.x.xx' + E(24) }, rev: 0.3 },
  ] },
};
const j_quest = {
  bpm: 120, loop: false, steps: 32, tail: 3, echo: { beats: 0.75, fb: 0.4, mix: 0.5 }, rev: 0.5,
  layers: { base: [
    { inst: 'bell', vol: 0.6, echo: 0.5, notes: 'D5:2 A5:2 F#5:4 E5:2 A5:2 D6:20!' },
    { inst: 'pad', chords: 'D:8 A:8 D:16', oct: 4, vol: 0.55, adsr: [0.05, 1, 0.8, 1.5] },
    { inst: 'bass', notes: 'D2:8 A1:8 D2:16', vol: 0.55, echo: 0 },
  ] },
};

export const SONGS = { menu, hub, lobby, extract, j_extracted, j_death, j_levelup, j_quest, ...RAID_SONGS };
