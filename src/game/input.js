// Keyboard / mouse / gamepad input with rebindable actions.
export const DEFAULT_BINDS = {
  up: ['KeyW', 'ArrowUp'], down: ['KeyS', 'ArrowDown'], left: ['KeyA', 'ArrowLeft'], right: ['KeyD', 'ArrowRight'],
  sprint: ['ShiftLeft', 'ShiftRight'], crouch: ['KeyC', 'ControlLeft'], dodge: ['Space'],
  reload: ['KeyR'], interact: ['KeyE'], swap: ['KeyQ'], melee: ['KeyV'], flashlight: ['KeyF'],
  grenade: ['KeyG'], ping: ['KeyZ'], inventory: ['Tab', 'KeyI'], map: ['KeyM'], chat: ['Enter', 'KeyT'],
  menu: ['Escape'], quick1: ['Digit1'], quick2: ['Digit2'], quick3: ['Digit3'], quick4: ['Digit4'],
  quick5: ['Digit5'], quick6: ['Digit6'], weapon1: ['KeyX'], weapon3: ['KeyB'], emote: ['KeyH'],
};

export class Input {
  constructor(target = window) {
    this.binds = JSON.parse(JSON.stringify(DEFAULT_BINDS));
    this.down = new Set();
    this.pressed = new Set();     // went down this frame
    this.released = new Set();
    this.mouse = { x: innerWidth / 2, y: innerHeight / 2, l: false, r: false, m: false, lp: false, rp: false, wheel: 0, moved: false };
    this.typing = false;          // chat / text field focused: suppress game keys
    this.gamepad = null; this.padAim = { x: 0, y: 0 }; this.usingPad = false;
    // virtual controls (on-screen touch controls write here, like a gamepad): move/aim are stick vectors
    // (x east, z south, length 0..1), down/pressed hold ACTION names (same names as the binds)
    this.virtual = { move: { x: 0, z: 0 }, aim: null, fire: false, ads: false, down: new Set(), pressed: new Set() };
    this.usingTouch = false;
    this.enabled = true;
    const kd = (e) => {
      if (this.typing) return;
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code); this.usingPad = false; this.usingTouch = false;
    };
    const ku = (e) => { this.down.delete(e.code); this.released.add(e.code); };
    target.addEventListener('keydown', kd);
    target.addEventListener('keyup', ku);
    target.addEventListener('blur', () => { this.down.clear(); this.mouse.l = this.mouse.r = false; });
    const canvasEl = document.getElementById('gl') || document.body;
    addEventListener('mousemove', (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; this.mouse.moved = true; this.usingPad = false; this.usingTouch = false; });
    canvasEl.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouse.l = true; this.mouse.lp = true; }
      if (e.button === 2) { this.mouse.r = true; this.mouse.rp = true; }
      if (e.button === 1) { this.mouse.m = true; this.pressed.add('Mouse1'); e.preventDefault(); }
    });
    addEventListener('mouseup', (e) => {
      if (e.button === 0) this.mouse.l = false;
      if (e.button === 2) this.mouse.r = false;
      if (e.button === 1) this.mouse.m = false;
    });
    canvasEl.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('wheel', (e) => { this.mouse.wheel += Math.sign(e.deltaY); }, { passive: true });
    addEventListener('gamepadconnected', (e) => { this.gamepad = e.gamepad.index; });
  }
  is(action) { if (!this.enabled || this.typing) return false; return this.binds[action]?.some(c => this.down.has(c)) || this.padDown(action) || this.virtual.down.has(action); }
  hit(action) { if (!this.enabled || this.typing) return false; return this.binds[action]?.some(c => this.pressed.has(c)) || this.padHit(action) || this.virtual.pressed.has(action); }
  // which device was used last: 'kbm' | 'pad' | 'touch' (prompts / crosshair follow it)
  get mode() { return this.usingTouch ? 'touch' : this.usingPad ? 'pad' : 'kbm'; }
  // movement vector (x east, z south), length <= 1
  move() {
    let x = 0, z = 0;
    if (this.is('left')) x -= 1; if (this.is('right')) x += 1; if (this.is('up')) z -= 1; if (this.is('down')) z += 1;
    const p = this.pad();
    if (p) { const ax = p.axes[0] || 0, az = p.axes[1] || 0; if (Math.hypot(ax, az) > 0.18) { x = ax; z = az; } }
    const v = this.virtual.move; if (Math.hypot(v.x, v.z) > 0.12) { x = v.x; z = v.z; }
    const l = Math.hypot(x, z); if (l > 1) { x /= l; z /= l; }
    return { x, z };
  }
  fire() { return this.enabled && !this.typing && (this.mouse.l || this.padButton(7) > 0.4 || this.virtual.fire); }
  aim() { return this.enabled && !this.typing && (this.mouse.r || this.padButton(6) > 0.4 || this.virtual.ads); }
  pad() { if (this.gamepad == null || !navigator.getGamepads) return null; return navigator.getGamepads()[this.gamepad]; }
  padButton(i) { const p = this.pad(); if (!p || !p.buttons[i]) return 0; return p.buttons[i].value ?? (p.buttons[i].pressed ? 1 : 0); }
  padDown(action) {
    const p = this.pad(); if (!p) return false;
    const map = { sprint: 10, crouch: 11, dodge: 1, reload: 2, interact: 0, swap: 3, grenade: 4, melee: 5, inventory: 8, menu: 9, map: 16 };
    const i = map[action]; return i != null && !!p.buttons[i]?.pressed;
  }
  padHit(action) {
    const p = this.pad(); if (!p) return false;
    this._prevPad = this._prevPad || {};
    const map = { dodge: 1, reload: 2, interact: 0, swap: 3, grenade: 4, melee: 5, inventory: 8, menu: 9, quick1: 14, quick2: 12, quick3: 15, quick4: 13 };
    const i = map[action]; if (i == null) return false;
    return !!p.buttons[i]?.pressed && !this._prevPad[i];
  }
  // right stick aim direction (returns null if idle)
  padAimDir() {
    const v = this.virtual.aim; if (v && Math.hypot(v.x, v.z) > 0.15) { this.usingTouch = true; return { x: v.x, z: v.z }; }
    const p = this.pad(); if (!p) return null;
    const ax = p.axes[2] || 0, az = p.axes[3] || 0;
    if (Math.hypot(ax, az) < 0.25) return null;
    this.usingPad = true;
    return { x: ax, z: az };
  }
  endFrame() {
    this.virtual.pressed.clear();
    this.pressed.clear(); this.released.clear(); this.mouse.lp = this.mouse.rp = false; this.mouse.wheel = 0; this.mouse.moved = false;
    const p = this.pad(); if (p) { this._prevPad = {}; p.buttons.forEach((b, i) => this._prevPad[i] = b.pressed); }
  }
  label(action) { const c = this.binds[action]?.[0] || '?'; return c.replace('Key', '').replace('Digit', '').replace('Left', '').replace('Right', ''); }
}
