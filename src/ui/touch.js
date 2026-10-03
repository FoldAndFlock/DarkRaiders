// On-screen touch controls for raids (twin-stick) plus global touch helpers (portrait hint, zoom /
// callout guards). The raid layer only writes into input.virtual (see game/input.js): stick vectors
// move / aim (x east, z south, length 0..1), fire / ads flags, and bind action names in down (held)
// and pressed (went down this frame; the input clears it in endFrame).
import { touchEnabled, isTouchDevice, canFullscreen, isFullscreen, toggleFullscreen, touchMode, touchSeen } from './settings.js';
import { ITEMS } from '../game/items.js';

function el(tag, cls = '', html = '') { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }
const hyp = Math.hypot;

// Layout at --tk = 1 in CSS px, measured from the bottom-right corner (plus the safe margins) to each
// centre. The aim stick sits tight in the corner; actions ring it on two arcs, every target >= 48 px
// (iOS asks for 44) with >= 6 px gaps, and the cluster stays under ~265 px tall (fits a 390 px phone).
const AIM = { r: 82, b: 84, rad: 54 };
const MOVE = { l: 96, b: 88, rad: 54 };            // idle hint position of the floating move stick
const BTNS = [
  // key, action (virtual bind name), label, right, bottom, size
  ['fire', null, 'FIRE', 180, 80, 58],
  ['reload', 'reload', 'RELOAD', 166, 140, 48],
  ['dodge', 'dodge', 'ROLL', 118, 176, 48],
  ['crouch', 'crouch', 'CROUCH', 62, 180, 48],
  ['interact', 'interact', 'USE', 246, 104, 58],
  ['grenade', 'grenade', 'THROW', 214, 186, 48],
  ['swap', 'swap', 'SWAP', 164, 226, 48],
  ['ads', null, 'AIM', 82, 236, 48],
];
const TOP = [['fs', null, 'FULL'], ['chat', 'chat', 'CHAT'], ['light', 'flashlight', 'LIGHT'], ['ping', 'ping', 'PING'], ['map', 'map', 'MAP'], ['inv', 'inventory', 'BAG'], ['menu', 'menu', 'MENU']];
const FIRE_AT = 0.6, SPRINT_AT = 1.3, FOLLOW_AT = 1.6, AIM_DEAD = 0.22;

// pixel-art ring / disc as a data URL (scaled up with image-rendering: pixelated)
const ringCache = new Map();
function ringURL(n, fill, edge, inner = 0) {
  const k = `${n}|${fill}|${edge}|${inner}`; if (ringCache.has(k)) return ringCache.get(k);
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d'), r = n / 2;
  for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) {
    const d = hyp(i + 0.5 - r, y + 0.5 - r);
    if (d > r) continue;
    x.fillStyle = d > r - 1.3 - inner ? edge : fill;
    x.fillRect(i, y, 1, 1);
  }
  const u = c.toDataURL(); ringCache.set(k, u); return u;
}

export class TouchControls {
  constructor(game) {
    this.g = game; this.input = game.o.input; this.v = this.input.virtual;
    this.ptrs = new Map();          // pointerId -> { kind: 'move' | 'aim' | 'btn' | 'quick' | 'top', ... }
    this.visible = false; this.engaged = isTouchDevice(); this.lastTouch = -1e9;
    this.aimDir = { x: 0, z: 1 }; this.aimHold = 0; this.ads = false; this.fireBtn = false; this.pulse = false;
    this.move = null; this.aim = null;
    this.free = { freeL: 0, freeR: innerWidth };
    this.build();
    this.onResize = () => this.measure();
    addEventListener('resize', this.onResize); addEventListener('dr:uiscale', this.onResize);
    // a real mouse / keyboard (not the emulated mouse events after a tap) hands control back
    this.onMouse = (e) => { if (e.sourceCapabilities?.firesTouchEvents) return; if (performance.now() - lastTouchAt > 1200) this.disengage(); };
    this.onKey = () => this.disengage();
    addEventListener('mousemove', this.onMouse); addEventListener('keydown', this.onKey);
  }

  // ---------------------------------------------------------------- DOM
  build() {
    const R = this.root = el('div', 'touch hidden');
    R.addEventListener('touchstart', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
    R.addEventListener('contextmenu', (e) => e.preventDefault());
    // left: floating move stick zone
    this.zone = el('div', 'tz'); R.appendChild(this.zone);
    this.mv = this.stick('ts-move', MOVE.rad); R.appendChild(this.mv.root);
    this.mv.defL = `calc(var(--tk) * ${MOVE.l - MOVE.rad}px + var(--sl, 0px))`;
    this.mv.defB = `calc(var(--tk) * ${MOVE.b - MOVE.rad}px + var(--sb, 0px))`;
    this.placeStick(this.mv, null);
    this.zone.addEventListener('pointerdown', (e) => this.down(e, 'move'));
    // right: fixed aim stick
    this.am = this.stick('ts-aim', AIM.rad); R.appendChild(this.am.root);
    this.am.root.style.right = `calc(var(--tk) * ${AIM.r - AIM.rad}px + var(--sr, 0px))`;
    this.am.root.style.bottom = `calc(var(--tk) * ${AIM.b - AIM.rad}px + var(--sb, 0px))`;
    this.am.root.addEventListener('pointerdown', (e) => this.down(e, 'aim'));
    // action buttons
    this.btn = {};
    for (const [k, act, label, r, b, size] of BTNS) {
      const n = el('div', `tb tb-${k}${size > 52 ? ' big' : ''}`, `<span>${label}</span>`);
      n.setAttribute('role', 'button'); n.setAttribute('aria-label', label);
      n.style.cssText = `right:calc(var(--tk) * ${r - size / 2}px + var(--sr, 0px));bottom:calc(var(--tk) * ${b - size / 2}px + var(--sb, 0px));width:calc(var(--tk) * ${size}px);height:calc(var(--tk) * ${size}px)`;
      n.dataset.k = k; if (act) n.dataset.a = act;
      n.addEventListener('pointerdown', (e) => this.down(e, 'btn', n));
      R.appendChild(n); this.btn[k] = n;
    }
    // top bar (menus)
    this.top = el('div', 'ttop'); R.appendChild(this.top);
    this.topBtn = {};
    for (const [k, act, label] of TOP) {
      const n = el('div', `tb tt tt-${k}`, `<span>${label}</span>`);
      n.setAttribute('role', 'button'); n.setAttribute('aria-label', label);
      n.dataset.k = k; if (act) n.dataset.a = act;
      n.addEventListener('pointerdown', (e) => this.down(e, 'top', n));
      this.top.appendChild(n); this.topBtn[k] = n;
    }
    this.topBtn.chat.classList.toggle('hidden', !this.g.net);
    // quick-use hit areas over the HUD's quick slots
    this.qs = [];
    for (let i = 0; i < 6; i++) {
      const n = el('div', 'tq hidden'); n.dataset.i = i;
      n.addEventListener('pointerdown', (e) => this.down(e, 'quick', n));
      R.appendChild(n); this.qs.push(n);
    }
    this.qKey = '';
    for (const ev of ['pointermove', 'pointerup', 'pointercancel', 'lostpointercapture']) R.addEventListener(ev, (e) => this.ptr(e));
    document.body.appendChild(R);
  }
  stick(cls, rad) {
    const root = el('div', 'ts ' + cls), knob = el('i');
    root.style.width = root.style.height = `calc(var(--tk) * ${rad * 2}px)`;
    root.style.backgroundImage = `url(${ringURL(31, 'rgba(16,16,18,0.32)', 'rgba(232,224,200,0.55)', 1)})`;
    knob.style.backgroundImage = `url(${ringURL(13, 'rgba(232,224,200,0.55)', 'rgba(20,20,22,0.7)')})`;
    root.appendChild(knob);
    return { root, knob, rad };
  }
  // CSS px span of the bottom edge left free between the sticks (the HUD centres the weapon panel there)
  measure() {
    if (!this.visible) return;
    const a = this.btn.interact.getBoundingClientRect(), f = this.btn.fire.getBoundingClientRect(), m = this.mv.root.getBoundingClientRect();
    this.free = { freeL: m.right + 4, freeR: Math.min(a.left, f.left) - 4 };
    this.fitTop();
    // screen areas the HUD keeps its edge waypoints out of (CSS px): buttons, aim stick, top bar
    this.rects = [...Object.values(this.btn), this.am.root, this.top].map(n => n.getBoundingClientRect()).filter(r => r.width > 0).map(r => ({ x: r.left, y: r.top, w: r.width, h: r.height }));
  }
  // hide the fullscreen button when the top bar would run into the HUD compass
  fitTop() {
    const fs = this.topBtn.fs, hud = this.g.hud;
    fs.classList.toggle('hidden', !canFullscreen() || isFullscreen());
    if (fs.classList.contains('hidden') || !hud) return;
    const compassR = (hud.W / 2 + 92) * hud.s;
    if (this.top.getBoundingClientRect().left < compassR) fs.classList.add('hidden');
  }

  // ---------------------------------------------------------------- pointers
  down(e, kind, node = null) {
    e.preventDefault(); e.stopPropagation();
    lastTouchAt = performance.now();
    this.engage();
    if (this.ptrs.has(e.pointerId)) return;
    const v = this.v;
    try { (node || e.currentTarget).setPointerCapture(e.pointerId); } catch (err) { /* synthetic pointer */ }
    if (kind === 'move') {
      if (this.move) return;
      const rad = this.mv.root.offsetWidth / 2 || MOVE.rad;
      const cx = Math.max(rad + 4, Math.min(innerWidth - rad - 4, e.clientX)), cy = Math.max(rad + 4, Math.min(innerHeight - rad - 4, e.clientY));
      this.move = { id: e.pointerId, cx, cy, rad };
      this.ptrs.set(e.pointerId, { kind });
      this.mv.root.classList.add('on'); this.placeStick(this.mv, cx, cy);
      this.moveTo(e.clientX, e.clientY);
      return;
    }
    if (kind === 'aim') {
      if (this.aim) return;
      const r = this.am.root.getBoundingClientRect();
      this.aim = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, rad: r.width / 2, defl: 0 };
      this.ptrs.set(e.pointerId, { kind });
      this.am.root.classList.add('on');
      this.aimTo(e.clientX, e.clientY);
      return;
    }
    if (kind === 'quick') {
      const i = +node.dataset.i; v.pressed.add('quick' + (i + 1)); v.down.add('quick' + (i + 1));
      this.ptrs.set(e.pointerId, { kind, node, act: 'quick' + (i + 1) }); node.classList.add('down');
      return;
    }
    const k = node.dataset.k, act = node.dataset.a;
    this.ptrs.set(e.pointerId, { kind, node, act, k });
    node.classList.add('down');
    if (k === 'fire') this.fireBtn = true;
    else if (k === 'ads') { this.ads = !this.ads; }
    else if (k === 'fs') { /* toggled on release (fullscreen needs the activation of pointerup) */ }
    else if (act) { v.pressed.add(act); v.down.add(act); }
    try { navigator.vibrate?.(8); } catch (err) { /* no haptics */ }
  }
  ptr(e) {
    const p = this.ptrs.get(e.pointerId); if (!p) return;
    if (e.type === 'pointermove') {
      e.preventDefault();
      if (p.kind === 'move') this.moveTo(e.clientX, e.clientY);
      else if (p.kind === 'aim') this.aimTo(e.clientX, e.clientY);
      return;
    }
    if (e.type === 'lostpointercapture' && e.target !== p.node && p.node) return;
    this.release(e.pointerId, e.type === 'pointerup');
  }
  release(id, up = false) {
    const p = this.ptrs.get(id); if (!p) return;
    this.ptrs.delete(id);
    const v = this.v;
    if (p.kind === 'move') { this.move = null; v.move.x = 0; v.move.z = 0; v.down.delete('sprint'); this.mv.root.classList.remove('on', 'sprint'); this.placeStick(this.mv, null); }
    else if (p.kind === 'aim') { this.aim = null; this.aimHold = 0.7; this.am.root.classList.remove('on', 'firing'); this.am.knob.style.transform = ''; }
    else {
      p.node?.classList.remove('down');
      if (p.k === 'fire') this.fireBtn = false;
      if (p.k === 'fs' && up) toggleFullscreen().then(() => setTimeout(() => this.measure(), 300));
      if (p.act) v.down.delete(p.act);
    }
  }
  releaseAll() { for (const id of [...this.ptrs.keys()]) this.release(id); }
  // the floating stick sits where the thumb landed; idle it rests (faint) at its hint position
  placeStick(s, cx, cy) {
    const st = s.root.style;
    if (cx == null) { st.left = s.defL; st.bottom = s.defB; st.top = 'auto'; s.knob.style.transform = ''; return; }
    const r = s.root.offsetWidth / 2;
    st.left = (cx - r) + 'px'; st.top = (cy - r) + 'px'; st.bottom = 'auto';
  }
  moveTo(x, y) {
    const m = this.move; if (!m) return;
    let dx = x - m.cx, dy = y - m.cy, d = hyp(dx, dy);
    // the base follows a finger that drifts far past the rim
    if (d > m.rad * FOLLOW_AT) { const k = (d - m.rad * FOLLOW_AT) / d; m.cx += dx * k; m.cy += dy * k; dx = x - m.cx; dy = y - m.cy; d = hyp(dx, dy); this.placeStick(this.mv, m.cx, m.cy); }
    const k = Math.min(1, d / m.rad), ux = d ? dx / d : 0, uy = d ? dy / d : 0;
    this.v.move.x = ux * k; this.v.move.z = uy * k;
    const sprint = d > m.rad * SPRINT_AT;
    if (sprint) this.v.down.add('sprint'); else this.v.down.delete('sprint');
    this.mv.root.classList.toggle('sprint', sprint);
    this.mv.knob.style.transform = `translate(${ux * k * m.rad}px, ${uy * k * m.rad}px)`;
  }
  aimTo(x, y) {
    const a = this.aim; if (!a) return;
    const dx = x - a.cx, dy = y - a.cy, d = hyp(dx, dy), k = Math.min(1, d / a.rad);
    a.defl = k;
    if (k > AIM_DEAD) { this.aimDir = { x: dx / d, z: dy / d }; this.aimHold = 0.7; }
    this.am.knob.style.transform = `translate(${(d ? dx / d : 0) * k * a.rad}px, ${(d ? dy / d : 0) * k * a.rad}px)`;
    this.am.root.classList.toggle('firing', k >= FIRE_AT);
  }
  engage() { this.engaged = true; this.input.usingTouch = true; }
  disengage() {
    if (!this.engaged) return;
    this.engaged = false; this.releaseAll();
    const v = this.v; v.aim = null; v.fire = false; v.ads = false; v.move.x = v.move.z = 0; v.down.clear();
  }

  // ---------------------------------------------------------------- per frame (before the player update)
  update(dt) {
    const g = this.g, me = g.me, v = this.v, ui = g.ui;
    const show = touchEnabled() && g.running && !g.ended && !g.localDone && !!me && (me.st === 'alive' || me.st === 'downed') && !ui?.blocking && !ui?.chatOpen && !g.paused;
    if (show !== this.visible) this.setVisible(show);
    if (!show) { v.fire = false; v.ads = false; return; }
    // a gamepad in use takes over
    if (this.engaged && this.input.usingPad && performance.now() - lastTouchAt > 800) this.disengage();
    if (!this.engaged) return;
    // aim: stick direction while held, then it lingers and follows the walking direction
    this.aimHold -= dt;
    if (!this.aim && this.aimHold <= 0 && hyp(v.move.x, v.move.z) > 0.3) { const l = hyp(v.move.x, v.move.z); this.aimDir = { x: v.move.x / l, z: v.move.z / l }; }
    v.aim = { x: this.aimDir.x, z: this.aimDir.z };
    // fire: past 60 % on the aim stick, or the FIRE button; semi / burst weapons re-trigger
    const ws = g.pc?.wstats, mode = ws?.mode || 'auto', want = this.fireBtn || (!!this.aim && this.aim.defl >= FIRE_AT);
    this.pulse = !this.pulse;
    v.fire = want && (mode === 'auto' || mode === 'beam' || mode === 'charge' || this.pulse);
    v.ads = this.ads;
    this.refresh();
  }
  setVisible(on) {
    this.visible = on;
    this.root.classList.toggle('hidden', !on);
    if (!on) { this.releaseAll(); const v = this.v; v.move.x = v.move.z = 0; v.fire = false; v.down.clear(); }
    else requestAnimationFrame(() => this.measure());
  }
  // button states + quick-slot hit areas
  refresh() {
    const g = this.g, pc = g.pc, me = g.me; if (!pc) return;
    const it = pc.interact && (me.st === 'alive' || pc.interact.kind === 'selfrevive') ? pc.interact : null;
    const ib = this.btn.interact;
    ib.classList.toggle('hot', !!it);
    const word = it ? (String(it.label || 'USE').split(/\s+/)[0] || 'USE').toUpperCase().slice(0, 7) : 'USE';
    if (ib.dataset.w !== word) { ib.dataset.w = word; ib.firstChild.textContent = word; }
    const prog = it && pc.holdFor && it.time ? Math.min(1, pc.holdT / it.time) : 0;
    ib.style.setProperty('--p', prog.toFixed(3));
    const w = pc.weapon, lo = pc.lo;
    this.btn.reload.classList.toggle('hot', !!w && (w.ammo || 0) === 0);
    this.btn.reload.firstChild.textContent = me.st === 'downed' ? 'GIVE UP' : 'RELOAD';
    const gi = lo.quick.findIndex(s => s && (ITEMS[s.id]?.type === 'grenade' || ITEMS[s.id]?.type === 'trap'));
    this.btn.grenade.classList.toggle('off', gi < 0);
    this.btn.swap.classList.toggle('off', lo.weapons.filter(Boolean).length < 2);
    this.btn.ads.classList.toggle('on', this.ads);
    this.btn.crouch.classList.toggle('on', !!pc.crouch);
    this.topBtn.light.classList.toggle('on', !!pc.flash);
    // quick slots drawn by the HUD (HUD pixels -> CSS px)
    const hud = g.hud, rects = hud?.quickRects || [], s = hud?.s || 1;
    const key = rects.map(r => `${r.x},${r.y},${r.empty ? 0 : 1}`).join('|') + '@' + s;
    if (key !== this.qKey) {
      this.qKey = key;
      this.qs.forEach((n, i) => {
        const r = rects[i];
        n.classList.toggle('hidden', !r);
        if (!r) return;
        const pad = 3;
        n.style.cssText = `left:${r.x * s - pad}px;top:${r.y * s - pad}px;width:${r.w * s + pad * 2}px;height:${r.h * s + pad * 2}px`;
        n.classList.toggle('empty', !!r.empty);
      });
    }
  }
  layout() { return this.visible ? this.free : null; }
  avoidRects() { return this.visible ? this.rects || [] : []; }
  destroy() {
    this.disengage(); this.releaseAll();
    removeEventListener('resize', this.onResize); removeEventListener('dr:uiscale', this.onResize);
    removeEventListener('mousemove', this.onMouse); removeEventListener('keydown', this.onKey);
    this.root.remove();
  }
}

// ---------------------------------------------------------------- global helpers
let lastTouchAt = -1e9;
export function initTouchGlobal() {
  // remember the last real touch so emulated mouse events after a tap are not mistaken for a mouse
  addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') lastTouchAt = performance.now(); }, true);
  // no long-press context menus / callouts and no pinch zoom while touch controls are on
  addEventListener('contextmenu', (e) => { if (touchEnabled() && !e.target.closest?.('input, textarea')) e.preventDefault(); });
  // the page itself never pans or zooms (iOS Safari ignores user-scalable=no and can rubber-band the
  // body): pinches are always stopped, one-finger drags unless they scroll a list or move a slider
  document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1 || !scrollsInside(e.target)) { if (e.cancelable) e.preventDefault(); }
  }, { passive: false });
  portraitHint();
  if (/[?&]touchdebug/.test(location.search)) touchDebug();
}

// does a one-finger drag starting at el belong to something that scrolls or takes drags itself?
function scrollsInside(el) {
  for (let n = el; n && n !== document.body && n.nodeType === 1; n = n.parentElement) {
    if (n.matches('input, textarea, select')) return true;
    const cs = getComputedStyle(n);
    if ((/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) || (/(auto|scroll)/.test(cs.overflowX) && n.scrollWidth > n.clientWidth + 1)) return true;
  }
  return false;
}

// ?touchdebug: a small live readout of why touch controls are / aren't showing (for phones without devtools)
function touchDebug() {
  const box = el('div', '');
  box.style.cssText = 'position:fixed;left:50%;top:env(safe-area-inset-top,0px);transform:translateX(-50%);z-index:99;background:rgba(0,0,0,0.8);color:#7f7;font:11px monospace;padding:4px 6px;pointer-events:none;white-space:pre;max-width:96vw;overflow:hidden';
  const errs = [];
  addEventListener('error', (e) => errs.push(String(e.message || e.error).slice(0, 90)));
  addEventListener('unhandledrejection', (e) => errs.push(String(e.reason?.message || e.reason).slice(0, 90)));
  const tick = () => {
    const g = window.app?.game, t = g?.touch, i = window.app?.input;
    box.textContent = `touch=${touchMode?.() ?? '?'} enabled=${touchEnabled()} coarse=${isTouchDevice()} seen=${touchSeen()} ontouchstart=${'ontouchstart' in window}\n` +
      `raid=${!!g?.running} layer=${t ? (t.visible ? 'visible' : 'hidden') : 'none'} engaged=${!!t?.engaged} blocking=${!!g?.ui?.blocking} paused=${!!g?.paused} me=${g?.me?.st || '-'} mode=${i?.mode}\n` +
      `${innerWidth}x${innerHeight} dpr=${devicePixelRatio} ${navigator.userAgent.slice(0, 80)}` + (errs.length ? `\nERR ${errs.slice(-2).join(' | ')}` : '');
    setTimeout(tick, 400);
  };
  const mount = () => { document.body.appendChild(box); tick(); };
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);
}

// phones: suggest landscape (dismissable), with a fullscreen shortcut where the browser allows it
function portraitHint() {
  const box = el('div', 'rotate-hint hidden');
  const inner = el('div', 'panel col rh-box', '<div class="rh-phone"><i></i></div><h2 class="yellow">ROTATE YOUR DEVICE</h2><div class="label">DARKRAIDERS PLAYS BEST IN LANDSCAPE</div>');
  const row = el('div', 'row');
  let dismissed = false;
  if (canFullscreen()) { const fs = el('button', 'primary', 'FULLSCREEN'); fs.addEventListener('click', () => toggleFullscreen()); row.appendChild(fs); }
  const go = el('button', '', 'CONTINUE ANYWAY'); go.addEventListener('click', () => { dismissed = true; upd(); }); row.appendChild(go);
  inner.appendChild(row); box.appendChild(inner);
  const upd = () => { box.classList.toggle('hidden', dismissed || !touchEnabled() || innerHeight <= innerWidth); };
  addEventListener('resize', upd); addEventListener('dr:uiscale', upd); addEventListener('orientationchange', () => setTimeout(upd, 100));
  const mount = () => { document.body.appendChild(box); upd(); };
  if (document.body) mount(); else addEventListener('DOMContentLoaded', mount);
}
