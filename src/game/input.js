// Keyboard / mouse / gamepad / virtual-stick input with rebindable keyboard actions.
//
// Gamepads use the browser's "standard" mapping. Whichever pad was used last drives the game (several may
// be plugged in; one that was connected before the page loaded is picked up by polling getGamepads()
// once it reports input). Sticks get a radial dead zone with rescale, triggers are read as analog values.
// Raid controls follow PAD_LAYOUT; the DOM menus are driven by src/ui/padnav.js, which this module loads on
// first gamepad use (no wiring needed). Pad options persist in input.padOptions (localStorage 'dr_pad').
//
// Virtual controls (the touch layer writes ONLY here): input.virtual = { move, aim, fire, ads, down, pressed }
// - move / aim are stick vectors (x east, z south, length 0..1), down / pressed hold action names (the
// same names as the binds); endFrame() clears pressed.
export const DEFAULT_BINDS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'], crouch: ['KeyC', 'ControlLeft'], dodge: ['Space'],
  reload: ['KeyR'], interact: ['KeyE'], swap: ['KeyQ'], melee: ['KeyV'], flashlight: ['KeyF'],
  grenade: ['KeyG'], ping: ['KeyZ'], inventory: ['Tab', 'KeyI'], map: ['KeyM'], chat: ['Enter', 'KeyT'],
  menu: ['Escape'], quick1: ['Digit1'], quick2: ['Digit2'], quick3: ['Digit3'], quick4: ['Digit4'],
  quick5: ['Digit5'], quick6: ['Digit6'], weapon1: ['KeyX'], weapon3: ['KeyB'], emote: ['KeyH'],
};

// "standard" mapping button indices (Xbox names; PlayStation: A = cross, B = circle, X = square, Y = triangle)
export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, VIEW: 8, MENU: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16, TOUCHPAD: 17 };

// Twin-stick raid layout: action -> [button, how]. how: 'press' (default: held = is(), went down = hit()),
// 'tap' (fires on a short release), 'hold' (fires once after HOLD_MS), 'toggle' (latches on/off),
// 'lb' (alternate bank: that button while LB is held - LB then does not throw on release).
// Left stick moves (analog speed), right stick aims, RT fires and LT aims down sights (analog triggers).
export const PAD_LAYOUT = {
  interact: ['A'], dodge: ['B'], reload: ['X'], swap: ['Y'], crouch: ['RB'], melee: ['R3'], menu: ['MENU'],
  sprint: ['L3', 'toggle'], grenade: ['LB', 'tap'], map: ['VIEW', 'tap'], inventory: ['VIEW', 'hold'],
  quick1: ['UP'], quick2: ['RIGHT'], quick3: ['DOWN'], quick4: ['LEFT'],
  quick5: ['UP', 'lb'], quick6: ['RIGHT', 'lb'], flashlight: ['DOWN', 'lb'], ping: ['LEFT', 'lb'], emote: ['Y', 'lb'],
};
export const PAD_DEFAULTS = { aimAssist: true, invertY: false, deadzone: 0.18, vibration: true };
const HOLD_MS = 400, TAP_MS = 1000, TRIG_ON = 0.3, TRIG_OFF = 0.18;

// per button index: { press: [actions], tap, hold, toggle, lb }
const PADMAP = [];
for (const [action, [b, how = 'press']] of Object.entries(PAD_LAYOUT)) {
  const i = BTN[b], m = PADMAP[i] || (PADMAP[i] = { press: [], tap: null, hold: null, toggle: null, lb: null });
  if (how === 'press') m.press.push(action); else m[how] = action;
}

// Prompt labels per pad style. The game fonts are ASCII-only, so PlayStation faces use ASCII shapes:
// X (cross), O (circle), [] (square), /\ (triangle). D-pad: ^ > v <.
const PAD_LABELS = {
  xbox: { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', VIEW: 'VIEW', MENU: 'MENU', L3: 'L3', R3: 'R3', UP: '^', DOWN: 'v', LEFT: '<', RIGHT: '>', LS: 'LS', RS: 'RS', HOME: 'XBOX' },
  ps: { A: 'X', B: 'O', X: '[]', Y: '/\\', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', VIEW: 'SHARE', MENU: 'OPTIONS', L3: 'L3', R3: 'R3', UP: '^', DOWN: 'v', LEFT: '<', RIGHT: '>', LS: 'LS', RS: 'RS', HOME: 'PS' },
  generic: { A: 'A', B: 'B', X: 'X', Y: 'Y', LB: 'LB', RB: 'RB', LT: 'LT', RT: 'RT', VIEW: 'SELECT', MENU: 'START', L3: 'L3', R3: 'R3', UP: '^', DOWN: 'v', LEFT: '<', RIGHT: '>', LS: 'LS', RS: 'RS', HOME: 'HOME' },
};
const PS_FACE_NAMES = { A: 'CROSS', B: 'CIRCLE', X: 'SQUARE', Y: 'TRIANGLE' };
const KEY_LABELS = { Escape: 'ESC', Space: 'SPACE', Tab: 'TAB', Enter: 'ENTER', Backspace: 'BKSP', ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', Mouse1: 'MMB', Backquote: '`', Minus: '-', Equal: '=', Comma: ',', Period: '.', Slash: '/', Semicolon: ';', Quote: "'", BracketLeft: '[', BracketRight: ']', Backslash: '\\' };

// 'xbox' | 'ps' | 'generic' from Gamepad.id
export function padStyleOf(id = '') {
  const s = String(id).toLowerCase();
  if (/054c|dualshock|dualsense|wireless controller|playstation|\bps[345]\b/.test(s)) return 'ps';
  if (/xbox|xinput|045e|x-box/.test(s)) return 'xbox';
  return 'generic';
}
export function keyLabel(code = '') { return KEY_LABELS[code] || String(code).replace(/^(Key|Digit|Numpad)/, '').replace(/(Left|Right)$/, '').toUpperCase(); }

// radial dead zone with rescale (and a small outer zone so diagonals reach full deflection)
function radial(x, y, dz) {
  const m = Math.hypot(x, y);
  if (m <= dz) return [0, 0];
  const k = Math.min(1, (m - dz) / Math.max(0.05, 1 - dz - 0.04)) / m;
  return [x * k, y * k];
}
const bval = (b) => b == null ? 0 : typeof b === 'number' ? b : (b.value || (b.pressed ? 1 : 0));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function loadPadOptions() {
  let o = null;
  try { o = JSON.parse(localStorage.getItem('dr_pad') || 'null'); } catch (e) { o = null; }
  return { ...PAD_DEFAULTS, ...(o && typeof o === 'object' ? o : {}) };
}

export class Input {
  constructor(target = window) {
    this.binds = JSON.parse(JSON.stringify(DEFAULT_BINDS));
    this.down = new Set();
    this.pressed = new Set();     // went down this frame
    this.released = new Set();
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, l: false, r: false, m: false, lp: false, rp: false, wheel: 0, moved: false };
    this.typing = false;          // chat / text field focused: suppress game keys
    // virtual controls (on-screen touch controls write here, like a gamepad): move/aim are stick vectors
    // (x east, z south, length 0..1), down/pressed hold ACTION names (same names as the binds)
    this.virtual = { move: { x: 0, z: 0 }, aim: null, fire: false, ads: false, down: new Set(), pressed: new Set() };
    this.usingTouch = false;
    this.enabled = true;
    // gamepad state
    this.gamepad = null;          // index of the active (last used) pad
    this.padStyle = 'generic';    // 'xbox' | 'ps' | 'generic' - drives prompts / labels
    this.padModel = '';           // 'ps5' (CREATE button) / 'ps4' (SHARE)
    this.usingPad = false;
    this.padState = null;         // processed state of the active pad (see readPad), refreshed every frame
    this.padMenu = false;         // a DOM menu (padnav) owns the pad: it sends no raid actions
    this.padOptions = loadPadOptions();
    this.padAim = { x: 0, y: 0 }; // legacy field
    this.sprintLatch = false;
    this.synthetic = 0;           // > 0 while padnav dispatches synthetic DOM events: they must not switch devices
    this.nav = null;              // padnav instance once loaded
    this._hits = new Set();       // pad actions triggered since the last endFrame()
    this._down = new Set();       // pad actions held this frame
    this._unread = false;
    this._seen = [];              // per pad index: last button / axis snapshot (activity detection)
    this._prev = [];              // active pad: previous frame's button states (edges)
    this._t = []; this._held = []; this._chordBtn = []; this._chord = false; this._still = 0;
    this._aim = { x: null, z: null, m: 0, live: false, held: false, prevM: 0, frozenT: -1e9, engage: 0 };
    this._mx = null; this._my = null;   // last reported cursor position (mode switching)
    const kd = (e) => {
      if (this.synthetic > 0 || this.typing) return;
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code); this.usingPad = false; this.usingTouch = false;
    };
    const ku = (e) => { if (this.synthetic > 0) return; this.down.delete(e.code); this.released.add(e.code); };
    target.addEventListener('keydown', kd);
    target.addEventListener('keyup', ku);
    target.addEventListener('blur', () => { this.down.clear(); this.mouse.l = this.mouse.r = false; });
    const canvasEl = document.getElementById('gl') || document.body;
    addEventListener('mousemove', (e) => {
      if (this.synthetic > 0) return;
      // In pad mode the cursor position belongs to the pad crosshair until the mouse really moves: browsers
      // also send mousemove at the resting cursor position when the page changes under it (menus opening).
      const moved = this._mx != null && Math.abs(e.clientX - this._mx) + Math.abs(e.clientY - this._my) > 2;
      this._mx = e.clientX; this._my = e.clientY;
      if (this.usingPad && !moved) return;
      this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.moved = true; this.usingPad = false; this.usingTouch = false;
    });
    canvasEl.addEventListener('mousedown', (e) => {
      if (this.synthetic > 0) return;
      if (e.button === 0) { this.mouse.l = true; this.mouse.lp = true; }
      if (e.button === 2) { this.mouse.r = true; this.mouse.rp = true; }
      if (e.button === 1) { this.mouse.m = true; this.pressed.add('Mouse1'); e.preventDefault(); }
    });
    addEventListener('mouseup', (e) => {
      if (this.synthetic > 0) return;
      if (e.button === 0) this.mouse.l = false;
      if (e.button === 2) this.mouse.r = false;
      if (e.button === 1) this.mouse.m = false;
    });
    canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
    addEventListener('gamepadconnected', (e) => this.onConnect(e.gamepad));
    addEventListener('gamepaddisconnected', (e) => this.onDisconnect(e.gamepad));
    // poll every animation frame, also in menus
    this._loop = () => {
      this._raf = 0;
      try { this.poll(); } catch (err) { if (!this._pollErr) { this._pollErr = true; console.error('gamepad poll failed', err); } }
      this.schedule();
    };
    this.schedule();
  }
  // No frame request may be pending while a raid loads: a frame requested before that long synchronous work
  // runs after it with a stale timestamp, and the raid's first frame (requested at the end of loading)
  // would share it - a negative frame time (camera fly-off, red flash). Wait it out (max 60 s) on a timer.
  schedule() {
    if (this._raf || this._idle || typeof requestAnimationFrame !== 'function') return;
    const g = window.app?.game, loading = !!g && !g.running && !g.ended;
    if (loading && (this._loadSince ??= performance.now()) > performance.now() - 60000) {
      this._idle = setTimeout(() => { this._idle = 0; this.schedule(); }, 100);
      return;
    }
    if (!loading) this._loadSince = null;
    this._raf = requestAnimationFrame(this._loop);
  }

  // ------------------------------------------------------------------ actions
  is(action) { if (!this.enabled || this.typing) return false; return this.binds[action]?.some(c => this.down.has(c)) || this.padDown(action) || this.virtual.down.has(action); }
  // 'menu' still reaches the game while it is disabled (paused), so Esc / Start / the touch MENU button close the pause menu
  hit(action) { if (this.typing || (!this.enabled && action !== 'menu')) return false; return this.binds[action]?.some(c => this.pressed.has(c)) || this.padHit(action) || this.virtual.pressed.has(action); }
  // which device was used last: 'kbm' | 'pad' | 'touch' (prompts / crosshair follow it)
  get mode() { return this.usingTouch ? 'touch' : this.usingPad ? 'pad' : 'kbm'; }
  // movement vector (x east, z south), length <= 1
  move() {
    let x = 0, z = 0;
    if (this.is('left')) x -= 1; if (this.is('right')) x += 1; if (this.is('up')) z -= 1; if (this.is('down')) z += 1;
    const p = this.padState;
    if (p && !this.padMenu && this.enabled && !this.typing && (p.lx || p.ly)) { x = p.lx; z = p.ly; }
    const v = this.virtual.move; if (Math.hypot(v.x, v.z) > 0.12) { x = v.x; z = v.z; }
    const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    return { x, z };
  }
  fire() { return this.enabled && !this.typing && (this.mouse.l || this.padOn(BTN.RT) || this.virtual.fire); }
  aim() { return this.enabled && !this.typing && (this.mouse.r || this.padOn(BTN.LT) || this.virtual.ads); }
  // analog trigger pull 0..1: 'lt' | 'rt'
  padTrigger(which) { return this.padMenu ? 0 : (this.padState?.[which] || 0); }
  padOn(i) { return !this.padMenu && !!this.padState?.on[i]; }
  // raw Gamepad object of the active pad (or null)
  pad() { if (this.gamepad == null) return null; return this.pads()[this.gamepad] || null; }
  pads() { try { return (navigator.getGamepads && navigator.getGamepads()) || []; } catch (e) { return []; } }
  padButton(i) { const p = this.pad(); return p ? bval(p.buttons[i]) : 0; }
  padDown(action) { return !this.padMenu && this._down.has(action); }
  padHit(action) { return this._hits.has(action); }
  // trigger an action as if pressed this frame (padnav: B / Start close the in-raid overlays)
  inject(action) { this._hits.add(action); }
  // aim stick: the right stick, released-direction aware. { x, z } unit direction, m 0..1 deflection, live =
  // the stick is pushed right now (else the last direction / deflection is held). null until first used.
  aimStick() { const A = this._aim; return A.x == null ? null : { x: A.x, z: A.z, m: A.m, live: A.live }; }
  clearAimHold() { const A = this._aim; if (!A.live) { A.x = A.z = null; A.m = 0; A.held = false; } }
  // stick aim direction while a stick is pushed (virtual aim stick first), else null (legacy API)
  padAimDir() {
    const v = this.virtual.aim; if (v && Math.hypot(v.x, v.z) > 0.15) { this.usingTouch = true; return { x: v.x, z: v.z }; }
    const A = this._aim; if (!this.usingPad || !A.live || this.padMenu || A.x == null) return null;
    return { x: A.x * A.m, z: A.z * A.m };
  }
  endFrame() {
    this.virtual.pressed.clear();
    this.pressed.clear(); this.released.clear(); this.mouse.lp = this.mouse.rp = false; this.mouse.wheel = 0; this.mouse.moved = false;
    this._hits.clear(); this._unread = false;
  }

  // ------------------------------------------------------------------ gamepads
  onConnect(gp) {
    if (!gp) return;
    if (this.gamepad == null || !this.pads()[this.gamepad]) this.setActive(gp);
    this.loadNav();
  }
  onDisconnect(gp) {
    if (!gp || gp.index !== this.gamepad) return;
    const other = [...this.pads()].find(p => p && p.connected !== false && p.index !== gp.index);
    if (other) { this.setActive(other); return; }
    this.gamepad = null; this.padState = null; this.usingPad = false; this.padMenu = false; this.sprintLatch = false;
    this._down.clear(); this._prev = [];
  }
  setActive(gp) {
    this.gamepad = gp.index; this.padStyle = padStyleOf(gp.id);
    const id = String(gp.id).toLowerCase();
    this.padModel = this.padStyle !== 'ps' ? '' : /dualsense|0ce6|0df2/.test(id) ? 'ps5' : 'ps4';
    this._prev = []; this._t = []; this._held = []; this._chordBtn = []; this._chord = false;
  }
  loadNav() {
    if (this._navP) return;
    this._navP = import('../ui/padnav.js').then(m => { this.nav = m.install(this); }).catch(e => console.warn('pad menus unavailable:', e?.message || e));
  }
  // fresh input on a pad: a button going down, or a stick pushed / moving past its dead zone (a resting,
  // drifting stick doesn't count)
  activity(gp) {
    const s = this._seen[gp.index] || (this._seen[gp.index] = { on: [], ax: [] });
    let act = false;
    const bt = gp.buttons || [];
    for (let i = 0; i < bt.length; i++) {
      const on = bval(bt[i]) > 0.5 || (i !== BTN.LT && i !== BTN.RT && !!bt[i]?.pressed);
      if (on && !s.on[i]) act = true;
      s.on[i] = on;
    }
    const ax = gp.axes || [], lim = Math.min(ax.length, 4);
    for (let k = 0; k + 1 < lim; k += 2) {
      const x = ax[k] || 0, y = ax[k + 1] || 0, px = s.ax[k] ?? 0, py = s.ax[k + 1] ?? 0;
      if (Math.hypot(x, y) > 0.4 && (Math.hypot(px, py) <= 0.4 || Math.hypot(x - px, y - py) > 0.04)) act = true;
      s.ax[k] = x; s.ax[k + 1] = y;
    }
    return act;
  }
  // once per animation frame: pick the active pad, read it, let the menus have it, then resolve raid actions
  poll() {
    const now = performance.now();
    const dt = Math.min(0.1, Math.max(0, (now - (this._pollAt ?? now)) / 1000)); this._pollAt = now;
    if (this._unread) this._hits.clear();     // nobody consumed the last frame's actions (menus, loading): drop them
    this._unread = true;
    let active = null;
    for (const gp of this.pads()) {
      if (!gp || gp.connected === false) continue;
      if (this.activity(gp)) {
        if (gp.index !== this.gamepad) this.setActive(gp);
        this.usingPad = true; this.usingTouch = false; this.loadNav();
      }
      if (this.gamepad == null) this.setActive(gp);   // connected before load, no event: adopt it quietly
      if (gp.index === this.gamepad) active = gp;
    }
    if (this.gamepad != null && !active) this.onDisconnect({ index: this.gamepad });
    const st = active ? this.readPad(active) : null;
    this.padState = st;
    let menu = false;
    if (this.nav) { try { menu = !!this.nav.update(st, dt, now); } catch (err) { if (!this._navErr) { this._navErr = true; console.error('pad menu error', err); } } }
    this.padMenu = menu;
    this.resolvePad(st, now, dt);
    this.filterAim(st, now, dt);
  }
  // processed pad state: dead-zoned sticks, analog triggers (with hysteresis for their digital use), edges
  readPad(gp) {
    const o = this.padOptions, dz = clamp(+o.deadzone || PAD_DEFAULTS.deadzone, 0.02, 0.6);
    const ax = gp.axes || [], bt = gp.buttons || [];
    const [lx, ly] = radial(ax[0] || 0, ax[1] || 0, dz);
    let [rx, ry] = radial(ax[2] || 0, ax[3] || 0, dz);
    if (o.invertY) ry = -ry;
    const lt = bval(bt[BTN.LT]), rt = bval(bt[BTN.RT]);
    const n = Math.max(bt.length, 17), prev = this._prev;
    const on = new Array(n), pressed = new Array(n), released = new Array(n);
    for (let i = 0; i < n; i++) {
      if (i === BTN.LT || i === BTN.RT) on[i] = (i === BTN.LT ? lt : rt) > (prev[i] ? TRIG_OFF : TRIG_ON);
      else on[i] = !!bt[i] && (!!bt[i].pressed || bval(bt[i]) > 0.5);
    }
    if (on[BTN.TOUCHPAD]) on[BTN.VIEW] = true;     // PlayStation touchpad click works like SHARE / CREATE
    for (let i = 0; i < n; i++) { pressed[i] = on[i] && !prev[i]; released[i] = !on[i] && !!prev[i]; }
    this._prev = on;
    return { lx, ly, rx, ry, lt, rt, on, pressed, released, index: gp.index, id: gp.id };
  }
  resolvePad(st, now, dt) {
    const down = this._down; down.clear();
    if (!st || this.padMenu) { this._t = []; this._held = []; this._chordBtn = []; this.sprintLatch = false; return; }
    const lb = st.on[BTN.LB];
    for (let i = 0; i < st.on.length; i++) {
      const map = PADMAP[i]; if (!map) continue;
      if (st.pressed[i]) {
        this._t[i] = now; this._held[i] = false; this._chordBtn[i] = false;
        if (i === BTN.LB) this._chord = false;
        if (lb && i !== BTN.LB && map.lb) { this._hits.add(map.lb); this._chord = true; this._chordBtn[i] = true; }
        else { for (const a of map.press) this._hits.add(a); if (map.toggle) { this.sprintLatch = !this.sprintLatch; this._still = now; this._latchMoved = false; } }
      }
      if (st.on[i]) {
        if (map.hold && !this._held[i] && this._t[i] != null && now - this._t[i] >= HOLD_MS) { this._held[i] = true; this._hits.add(map.hold); }
        if (!this._chordBtn[i]) for (const a of map.press) down.add(a);
      }
      if (st.released[i]) {
        if (map.tap && this._t[i] != null && !this._held[i] && now - this._t[i] < TAP_MS && !(i === BTN.LB && this._chord)) this._hits.add(map.tap);
        this._t[i] = null; this._chordBtn[i] = false;
      }
    }
    // L3 latches sprint; stopping (stick near centre for 0.25 s - 1.5 s if clicked before moving off),
    // aiming down sights or firing drops it
    if (this.sprintLatch) {
      if (Math.hypot(st.lx, st.ly) > 0.25) { this._still = now; this._latchMoved = true; }
      if (now - this._still > (this._latchMoved ? 250 : 1500) || st.on[BTN.LT] || st.on[BTN.RT]) this.sprintLatch = false; else down.add('sprint');
    }
  }
  // Right-stick aim that survives letting go: a stick springing back to centre would otherwise drag the aim
  // in (and can overshoot to the opposite side), so a fast drop in deflection freezes the last sample for
  // ~90 ms, the centred stick keeps it, and small wobble right after a release is ignored.
  filterAim(st, now, dt) {
    const A = this._aim;
    let x = 0, z = 0;
    if (st && !this.padMenu) { x = st.rx; z = st.ry; }
    const m = Math.min(1, Math.hypot(x, z));
    if (m > 0) {
      if (A.held && ++A.engage < 3 && m < 0.3) { A.prevM = m; return; }
      const fast = A.live && (A.prevM - m) > 0.12 * Math.max(1, dt * 60);
      if (fast) A.frozenT = now;
      if (!(now - A.frozenT < 90 && m < A.m)) { A.x = x / m; A.z = z / m; A.m = m; }
      A.live = true; A.held = false; A.prevM = m;
    } else {
      if (A.live) { A.live = false; A.held = true; A.engage = 0; }
      A.prevM = 0;
    }
  }
  // dual-rumble feedback on the active pad (no-op without a pad, vibration support, or with it switched off)
  rumble(strong = 0.5, weak = 0.5, ms = 120) {
    if (!this.usingPad || this.padOptions.vibration === false) return;
    const now = performance.now();
    if (now < (this._rumbleEnd || 0) && strong < (this._rumbleS || 0)) return;   // a stronger effect is still playing
    const gp = this.pad(); if (!gp) return;
    this._rumbleEnd = now + ms; this._rumbleS = strong;
    const s = clamp(strong, 0, 1), w = clamp(weak, 0, 1), d = Math.round(clamp(ms, 10, 2000));
    try {
      const va = gp.vibrationActuator;
      if (va?.playEffect) { const p = va.playEffect('dual-rumble', { startDelay: 0, duration: d, weakMagnitude: w, strongMagnitude: s }); p?.catch?.(() => {}); }
      else gp.hapticActuators?.[0]?.pulse?.(Math.max(s, w), d)?.catch?.(() => {});
    } catch (e) { /* unsupported */ }
  }
  setPadOption(k, v) { this.padOptions[k] = v; this.savePadOptions(); }
  savePadOptions() { try { localStorage.setItem('dr_pad', JSON.stringify(this.padOptions)); } catch (e) { /* storage blocked */ } }

  // ------------------------------------------------------------------ prompts
  // what the current device shows for an action: keyboard key, pad button (per pad style), '' on touch
  label(action, mode = this.mode) {
    if (mode === 'pad') return this.padLabel(action);
    if (mode === 'touch') return '';
    if (action === 'fire') return 'LMB';
    if (action === 'ads' || action === 'aim') return 'RMB';
    const c = this.binds[action]?.[0]; return c ? keyLabel(c) : '';
  }
  // label of a standard button name ('A', 'LB', 'VIEW', 'UP', 'LS' ...) for the current pad style
  btnLabel(name, style = this.padStyle) {
    if (name === 'VIEW' && style === 'ps' && this.padModel === 'ps5') return 'CREATE';
    return (PAD_LABELS[style] || PAD_LABELS.generic)[name] ?? name;
  }
  padLabel(action, style = this.padStyle) {
    const L = (n) => this.btnLabel(n, style);
    if (action === 'fire') return L('RT');
    if (action === 'ads' || action === 'aim') return L('LT');
    if (action === 'up' || action === 'down' || action === 'left' || action === 'right' || action === 'move') return L('LS');
    if (action === 'look') return L('RS');
    if (action === 'weapon1' || action === 'weapon3') action = 'swap';
    const b = PAD_LAYOUT[action]; if (!b) return '';
    const [btn, how] = b;
    if (how === 'lb') return L('LB') + '+' + L(btn);
    if (how === 'hold') return 'HOLD ' + L(btn);
    return L(btn);
  }
  // one-line controls summary for the current device (pause menu / intro text)
  controlsText(mode = this.mode) {
    if (mode === 'pad') {
      const ps = this.padStyle === 'ps', L = (n) => (ps && PS_FACE_NAMES[n]) || this.btnLabel(n);
      return [`${L('LS')} MOVE`, `${L('L3')} SPRINT`, `${L('RS')} AIM`, `${L('RT')} FIRE`, `${L('LT')} AIM DOWN SIGHTS`, `${L('A')} INTERACT (HOLD TO SEARCH)`,
        `${L('B')} ROLL`, `${L('X')} RELOAD`, `${L('Y')} SWAP`, `${L('R3')} MELEE`, `${L('RB')} CROUCH`, `${L('LB')} GRENADE`, 'D-PAD QUICK USE 1-4',
        `${L('LB')}+D-PAD UP/RIGHT QUICK 5-6`, `${L('LB')}+DOWN FLASHLIGHT`, `${L('LB')}+LEFT PING`, `${L('LB')}+${L('Y')} EMOTE`,
        `${L('VIEW')} MAP`, `HOLD ${L('VIEW')} INVENTORY`, `${L('MENU')} PAUSE`].join('  ');
    }
    const k = (a) => this.label(a, 'kbm');
    return `${k('up')}${k('left')}${k('down')}${k('right')} MOVE  ${k('sprint')} SPRINT  ${k('crouch')} CROUCH  ${k('dodge')} ROLL  LMB FIRE  RMB AIM  ${k('reload')} RELOAD  ${k('swap')} SWAP  ${k('melee')} MELEE  ${k('interact')} INTERACT  1-6 QUICK USE  ${k('grenade')} GRENADE  ${k('flashlight')} FLASHLIGHT  ${k('inventory')} INVENTORY  ${k('map')} MAP  ${k('ping')} PING  ${k('emote')} EMOTE  ${k('chat')} CHAT`;
  }
}
