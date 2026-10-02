// Gamepad menu navigation for the DOM screens under #ui: title, hub (all tabs, context menus, modals),
// lobby, results and the in-raid inventory / loot / map / pause overlays. Installed by game/input.js on
// first gamepad use and driven from Input.poll() every animation frame; active only while the pad is the
// last-used device and a menu is on screen (never during raid gameplay with no overlay open).
//
//   D-pad / left stick   move a yellow focus ring to the nearest element in that direction (spatial nav)
//   A                    click (text fields: focus for typing; selects: next option)
//   X                    pick up the item in a slot, then A / X on another slot places it (drag & drop)
//   Y                    context action (right click): hub item menu, raid quick-use / quick-move / take
//   B                    back: cancel a pick-up, close the menu / modal / overlay, or press a back button
//   LB / RB              previous / next tab        LT / RT   previous / next sub-tab or filter chip
//   right stick          scroll the list under focus          left / right on a slider or select: adjust
//   Start (and View)     in a raid: close the overlay / pause menu
// Native confirm() / prompt() / alert() raised by a pad click (onclick handlers) become pad-friendly
// dialogs: the click is replayed with the chosen answer.
import { drawText, textWidth } from './pixelfont.js';
import { BTN } from '../game/input.js';

const FOCUSABLE = 'button, input, select, textarea, a[href], [tabindex], [data-tab], [data-go]';
const TEXTY = 'input[type=text], input[type=search], input[type=number], input[type=password], input:not([type]), textarea';
const PREFER = ['[autofocus]', '.pn-dlg .pn-def', '.hub-menu .mi', '.hm-btns button.primary', '.hm-btns button.ghost', '.hh-tabs .tab.on', 'button.primary', '.cell', 'button'];
const REPEAT_DELAY = 360, REPEAT_RATE = 110;
const BACK_RE = /^\s*(<|BACK\b|CANCEL\b|CLOSE\b|X\s*$)/i;   // buttons B presses on screens without their own back handling
const ABORT = { padnavAbort: true };   // thrown out of a native dialog stub to stop the click handler

let instance = null;
export function install(input) { if (!instance) instance = new PadNav(input); return instance; }

const center = (r) => ({ x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 });
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function sigOf(e) {
  if (e._ref) { try { return 'cell:' + JSON.stringify(e._ref); } catch (err) { /* cyclic */ } }
  const cls = String(e.className || '').replace(/\b(pn-focus|pn-held|on|sel|drop-ok)\b/g, '').replace(/\s+/g, ' ').trim();
  return `${e.tagName}|${e.dataset?.tab || e.dataset?.go || ''}|${cls}|${(e.textContent || '').trim().slice(0, 48)}`;
}
function scrollable(e) {
  if (!e || e.scrollHeight <= e.clientHeight + 2) return false;
  const o = getComputedStyle(e).overflowY; return o === 'auto' || o === 'scroll';
}
function shown(e) { const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2; }

// best candidate from cur's rect in a direction: distance along the axis, heavily penalised for not
// overlapping on the cross axis, lightly for centre offset
function pickDir(cur, list, dir) {
  const a = cur.getBoundingClientRect(), ac = center(a), horiz = dir === 'left' || dir === 'right', s = dir === 'right' || dir === 'down' ? 1 : -1;
  let best = null, bs = Infinity;
  for (const e of list) {
    if (e === cur) continue;
    const b = e.getBoundingClientRect(), bc = center(b);
    const along = horiz ? (bc.x - ac.x) * s : (bc.y - ac.y) * s;
    if (along <= 2) continue;
    const main = Math.max(0, horiz ? (s > 0 ? b.left - a.right : a.left - b.right) : (s > 0 ? b.top - a.bottom : a.top - b.bottom));
    const gap = horiz ? Math.max(0, b.top - a.bottom, a.top - b.bottom) : Math.max(0, b.left - a.right, a.left - b.right);
    const off = horiz ? Math.abs(bc.y - ac.y) : Math.abs(bc.x - ac.x);
    const sc = main + gap * 3 + off * 0.35 + along * 0.05;
    if (sc < bs) { bs = sc; best = e; }
  }
  return best;
}
function nearest(list, p) {
  let best = null, bd = Infinity;
  for (const e of list) { const c = center(e.getBoundingClientRect()), d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function preferred(list) {
  for (const s of PREFER) { const e = list.find(x => x.matches(s)); if (e) return e; }
  return list[0] || null;
}

// ------------------------------------------------------------------ button badges (pixel art, cached)
const FACE_COL = { A: '#5cc860', B: '#e84a30', X: '#3a98f0', Y: '#f0c030' };
const PS_COL = { A: '#86b4f8', B: '#f06a78', X: '#e88ad8', Y: '#4ccaa4' };
const PS_SHAPE = {   // 5x5 symbols for cross / circle / square / triangle
  A: ['#...#', '.#.#.', '..#..', '.#.#.', '#...#'], B: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  X: ['#####', '#...#', '#...#', '#...#', '#####'], Y: ['..#..', '.#.#.', '.#.#.', '#...#', '#####'],
};
const badgeCache = new Map();
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
function disc(x, n, fill, edge) {
  const r = n / 2;
  for (let y = 0; y < n; y++) for (let i = 0; i < n; i++) { const d = Math.hypot(i + 0.5 - r, y + 0.5 - r); if (d > r) continue; x.fillStyle = d > r - 1.2 ? edge : fill; x.fillRect(i, y, 1, 1); }
}
// Pixel badge for a standard button name ('A', 'LB', 'VIEW', 'UP', 'DPAD', 'LS', ...) in a pad style, as a
// canvas at 1x (scale it up with image-rendering: pixelated). input: an Input for labels.
export function badgeCanvas(name, style, input) {
  const label = input ? input.btnLabel(name, style) : name;
  const key = style + '|' + name + '|' + label;
  if (badgeCache.has(key)) return badgeCache.get(key);
  let c, x;
  if (FACE_COL[name]) {
    [c, x] = canvas(11, 11);
    if (style === 'ps') {
      disc(x, 11, '#2a2826', '#5a564c');
      x.fillStyle = PS_COL[name]; PS_SHAPE[name].forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') x.fillRect(3 + i, 3 + j, 1, 1); }));
    } else {
      disc(x, 11, style === 'xbox' ? FACE_COL[name] : '#8a867a', '#141414');
      drawText(x, label, 3, 2, { color: '#141414' });
    }
  } else if (['UP', 'DOWN', 'LEFT', 'RIGHT', 'DPAD', 'DPADLR'].includes(name)) {
    [c, x] = canvas(11, 11);
    const arm = { UP: [4, 0, 3, 4], DOWN: [4, 7, 3, 4], LEFT: [0, 4, 4, 3], RIGHT: [7, 4, 4, 3] };
    x.fillStyle = '#141414'; x.fillRect(3, 0, 5, 11); x.fillRect(0, 3, 11, 5);
    x.fillStyle = '#6a665c'; x.fillRect(4, 1, 3, 9); x.fillRect(1, 4, 9, 3);
    x.fillStyle = '#f0c030';
    const hot = name === 'DPAD' ? [] : name === 'DPADLR' ? ['LEFT', 'RIGHT'] : [name];
    for (const h of hot) { const [ax, ay, aw, ah] = arm[h]; x.fillRect(Math.max(1, ax), Math.max(1, ay), Math.min(aw, 10 - Math.max(1, ax)), Math.min(ah, 10 - Math.max(1, ay))); }
  } else {
    const w = textWidth(label) + 6;
    [c, x] = canvas(w, 11);
    x.fillStyle = '#141414'; x.fillRect(1, 0, w - 2, 11); x.fillRect(0, 1, w, 9);
    x.fillStyle = '#4a473f'; x.fillRect(1, 1, w - 2, 9);
    drawText(x, label, 3, 2, { color: '#e8e0c8' });
  }
  badgeCache.set(key, c);
  return c;
}
const urlCache = new Map();
function badgeURL(name, style, input) {
  const c = badgeCanvas(name, style, input), k = style + '|' + name + '|' + c.width;
  if (!urlCache.has(k)) urlCache.set(k, c.toDataURL());
  return urlCache.get(k);
}

const CSS = `
.pn-focus { outline: calc(var(--px, 2) * 2px) solid #f0c030 !important; outline-offset: calc(var(--px, 2) * -2px) !important;
  box-shadow: inset 0 0 0 calc(var(--px, 2) * 3px) #141414 !important; }
.pn-held { outline: calc(var(--px, 2) * 2px) solid #58c8f0 !important; outline-offset: calc(var(--px, 2) * -2px) !important; }
.pn-held.pn-focus { outline-color: #f0c030 !important; box-shadow: inset 0 0 0 calc(var(--px, 2) * 4px) rgba(88, 200, 240, 0.55) !important; }
.pn-hint { position: fixed; z-index: 400; pointer-events: none; display: flex; gap: calc(var(--px, 2) * 7px); align-items: center;
  bottom: calc(var(--px, 2) * 3px); padding: calc(var(--px, 2) * 2px) calc(var(--px, 2) * 5px); background: rgba(12, 12, 14, 0.9);
  border: calc(var(--px, 2) * 1px) solid #3a3832; font-family: 'DRSmall', monospace; font-size: calc(var(--px, 2) * 8px); color: #e8e0c8;
  text-transform: uppercase; white-space: nowrap; line-height: 1; }
.pn-hint.top { top: calc(var(--px, 2) * 3px); bottom: auto; }
.pn-hint.hidden { display: none; }
.pn-hint .it { display: flex; align-items: center; gap: calc(var(--px, 2) * 2px); }
.pn-hint img { height: calc(var(--px, 2) * 11px); image-rendering: pixelated; display: block; }
.pn-ghost { position: fixed; z-index: 401; pointer-events: none; width: calc(var(--px, 2) * 16px); height: calc(var(--px, 2) * 16px);
  image-rendering: pixelated; background: rgba(20, 20, 22, 0.85); border: calc(var(--px, 2) * 1px) solid #58c8f0; }
.pn-dlg { position: fixed; inset: 0; z-index: 300; display: flex; align-items: center; justify-content: center; background: rgba(6, 6, 8, 0.66); pointer-events: auto; }
.pn-dlg .pn-box { min-width: calc(var(--px, 2) * 170px); max-width: min(80vw, calc(var(--px, 2) * 320px)); gap: calc(var(--px, 2) * 6px); }
.pn-dlg .pn-msg { white-space: pre-wrap; line-height: 1.3; }
.pn-dlg .pn-btns { display: flex; gap: calc(var(--px, 2) * 4px); justify-content: flex-end; }
.pn-dlg input { width: 100%; box-sizing: border-box; }
`;

class PadNav {
  constructor(input) {
    this.input = input;
    this.cur = null; this.scopeEl = null; this.on = false;
    this.mem = new Map();          // scope key -> { sig, at } last focus per screen
    this.held = null;              // picked-up slot { sig, src }
    this.dlg = null; this.answers = null; this.want = null;
    this.rep = { dir: null, next: 0 };
    this.scrollEl = null; this.hintKey = ''; this.ctxAt = 0; this.ctx = {};
    const st = document.createElement('style'); st.id = 'padnav-css'; st.textContent = CSS; document.head.appendChild(st);
    this.hint = document.createElement('div'); this.hint.className = 'pn-hint hidden'; document.body.appendChild(this.hint);
    this.ghost = document.createElement('img'); this.ghost.className = 'pn-ghost'; this.ghost.style.display = 'none'; document.body.appendChild(this.ghost);
  }

  // ---------------------------------------------------------------- per frame (from Input.poll)
  update(st, dt, now) {
    const sc = st && this.input.mode === 'pad' ? this.findScope() : null;
    if (!sc) { if (this.on) this.sleep(); return false; }
    const waking = !this.on;
    if (waking || sc !== this.scopeEl) this.enterScope(sc, st);
    this.on = true;
    this.validate(sc);
    // the press that switches to the pad (or reaches a menu that was open already) only shows the focus
    if (!waking) this.handle(st, dt, now, sc);
    this.updateHint(sc, now);
    return true;
  }
  // the top-most visible menu layer
  findScope() {
    if (this.dlg?.isConnected) return this.dlg;
    const ui = document.getElementById('ui'); if (!ui) return null;
    const menu = ui.querySelector('.hub-menu'); if (menu && shown(menu)) return menu;
    const modals = ui.querySelectorAll('.hub-modal'); if (modals.length) return modals[modals.length - 1];
    const ovs = ui.querySelectorAll('.overlay');
    for (let i = ovs.length - 1; i >= 0; i--) { const o = ovs[i]; if (o.offsetParent !== null && o.querySelector('.panel, button, .cell')) return o; }
    const hub = ui.querySelector('.hub'); if (hub && hub.offsetParent !== null) return hub;
    return null;
  }
  scopeKey(sc) { return sc === this.dlg ? 'dlg' : String(sc.className || '') + '|' + (sc.querySelector('h1, h2, .hm-h')?.textContent || '').slice(0, 40); }
  enterScope(sc, st) {
    if (this.scopeEl && this.scopeEl !== sc) this.cancelGrab();
    this.scopeEl = sc;
    // a direction already held when the menu appears must be released first
    this.rep = { dir: this.dirOf(st), next: Infinity };
    if (!this.cur || !sc.contains(this.cur) || !this.cur.isConnected) this.reacquire(sc);
    else this.setFocus(this.cur, false, true);
  }
  sleep() {
    this.on = false; this.cancelGrab();
    if (this.cur) { this.cur.classList.remove('pn-focus'); if (this.cur.isConnected) this.hover(this.cur, false); }
    this.hint.classList.add('hidden'); this.hintKey = '';
    this.scopeEl = null;
  }
  validate(sc) {
    const c = this.cur;
    if (c && c.isConnected && sc.contains(c) && this.usable(c)) {
      if (!c.classList.contains('pn-focus')) c.classList.add('pn-focus');
      if (this.held && !this.held.src.isConnected) this.reheld(sc);
      return;
    }
    this.reacquire(sc);
  }
  usable(e) {
    if (e.disabled) return false;
    const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && cs.pointerEvents !== 'none' && shown(e);
  }
  isCand(e, sc) {
    if (e.disabled) return false;
    if (e.tagName === 'INPUT' && (e.type === 'hidden' || e.type === 'file')) return false;
    const native = e.matches(FOCUSABLE) && e.getAttribute('tabindex') !== '-1';
    const cs = getComputedStyle(e);
    if (!native) {
      // anything clickable: a pointer cursor that isn't just inherited from a clickable parent
      if (cs.cursor !== 'pointer') return false;
      const p = e.parentElement; if (p && p !== sc && getComputedStyle(p).cursor === 'pointer') return false;
    }
    if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return false;
    return shown(e);
  }
  collect(sc) { const out = []; for (const e of sc.querySelectorAll('*')) if (this.isCand(e, sc)) out.push(e); return out; }
  reacquire(sc) {
    const list = this.collect(sc);
    let pick = null;
    if (this.want) { pick = list.find(e => e.matches(this.want)) || null; this.want = null; }
    const m = this.mem.get(this.scopeKey(sc));
    // an element like the lost one (several alike, e.g. 'SELL 1' rows: the one nearest to where focus was)
    const bySig = (s) => { const same = list.filter(e => sigOf(e) === s); return same.length > 1 && m?.at ? nearest(same, m.at) : same[0] || null; };
    if (!pick && this.cur && this.curScope === sc) pick = bySig(sigOf(this.cur));
    // same screen again: the same element, else (re-rendered in place) the one nearest to where focus was
    if (!pick && m) pick = bySig(m.sig) || (m.at && m.el === sc ? nearest(list, m.at) : null);
    if (!pick) pick = preferred(list);
    this.setFocus(pick, true, true);
    if (this.held) this.reheld(sc);
  }
  setFocus(e, scroll = true, force = false) {
    const prev = this.cur;
    if (prev === e && !force) return;
    if (prev && prev !== e) { prev.classList.remove('pn-focus'); if (prev.isConnected) this.hover(prev, false); }
    this.cur = e; this.curScope = this.scopeEl;
    if (!e) { this.ghost.style.display = 'none'; return; }
    e.classList.add('pn-focus');
    if (scroll) e.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.hover(e, true);
    const r = e.getBoundingClientRect();
    if (this.scopeEl) this.mem.set(this.scopeKey(this.scopeEl), { sig: sigOf(e), at: center(r), el: this.scopeEl });
    this.placeGhost();
    this.hintKey = '';
  }
  // tooltips: the hub / inventory show item info on mouseenter
  hover(e, on) {
    const r = e.getBoundingClientRect();
    if (on) { this.emit(e, 'enter', r.right, r.top); this.emit(e, 'move', r.right, r.top); }
    else this.emit(e, 'leave', r.right, r.top);
  }

  // ---------------------------------------------------------------- input
  dirOf(st) {
    if (!st) return null;
    const O = st.on;
    if (O[BTN.UP]) return 'up'; if (O[BTN.DOWN]) return 'down'; if (O[BTN.LEFT]) return 'left'; if (O[BTN.RIGHT]) return 'right';
    const m = Math.hypot(st.lx, st.ly);
    if (m < (this.rep.dir ? 0.35 : 0.5)) return null;
    return Math.abs(st.lx) > Math.abs(st.ly) ? (st.lx > 0 ? 'right' : 'left') : (st.ly > 0 ? 'down' : 'up');
  }
  handle(st, dt, now, sc) {
    const P = st.pressed;
    const dir = this.dirOf(st);
    if (dir) {
      if (dir !== this.rep.dir) { this.rep = { dir, next: now + REPEAT_DELAY }; this.nav(dir, sc); }
      else if (now >= this.rep.next) { this.rep.next = now + REPEAT_RATE; this.nav(dir, sc); }
    } else this.rep = { dir: null, next: 0 };
    if (P[BTN.A]) this.press('a', sc);
    else if (P[BTN.X]) this.press('x', sc);
    else if (P[BTN.Y]) this.press('y', sc);
    else if (P[BTN.B]) this.back(sc);
    else if (P[BTN.LB] || P[BTN.RB]) this.tab(sc, P[BTN.RB] ? 1 : -1);
    else if (P[BTN.LT] || P[BTN.RT]) this.subtab(sc, P[BTN.RT] ? 1 : -1);
    else if (P[BTN.MENU] || P[BTN.VIEW]) this.startBtn(sc);
    if (st.rx || st.ry) this.scroll(sc, st, dt);
    else if (this.scrollEl) this.afterScroll(sc);
  }
  nav(dir, sc) {
    const c = this.cur;
    if (c && (dir === 'left' || dir === 'right')) {
      if (c.matches('input[type=range]')) { this.nudge(c, dir === 'right' ? 1 : -1); return; }
      if (c.tagName === 'SELECT') { this.cycle(c, dir === 'right' ? 1 : -1); return; }
    }
    const ae = document.activeElement;
    if (ae && ae !== document.body && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName) && !ae.closest('.pn-dlg')) ae.blur();
    const list = this.collect(sc);
    if (!c || !list.includes(c)) { this.setFocus(preferred(list)); return; }
    const best = pickDir(c, list, dir);
    if (best) { this.setFocus(best); this.sfx('ui_hover'); }
    else if (dir === 'up' || dir === 'down') {   // nothing further that way: scroll long text instead
      for (let e = c; e && e !== sc.parentElement; e = e.parentElement) if (scrollable(e)) { e.scrollTop += (dir === 'down' ? 1 : -1) * e.clientHeight * 0.6; break; }
    }
  }
  press(k, sc) {
    const c = this.cur;
    if (k === 'a' || k === 'x') {
      if (this.held) { if (c?.classList.contains('cell')) this.place(c, sc); else this.cancelGrab(); return; }
      if (k === 'x') { if (c?.classList.contains('cell') && c._stack) this.grab(c); return; }
      if (c) this.activate(c);
      return;
    }
    if (this.held) { this.dropOutside(sc); return; }   // Y while holding: drop it (in-raid inventory: on the ground)
    if (c) this.mouseSeq(c, 2);                          // right click
  }
  activate(c) {
    if (c.matches(TEXTY)) { c.focus(); c.select?.(); return; }
    if (c.tagName === 'SELECT') { this.cycle(c, 1); return; }
    if (c.matches('input[type=range]')) return;
    this.click(c);
  }
  // full mouse click, with native dialogs raised by an onclick handler swapped for pad dialogs
  click(c) {
    const answers = this.answers || [];
    let n = 0, pending = null, wrap = null;
    const orig = c.onclick, saved = { confirm: window.confirm, prompt: window.prompt, alert: window.alert };
    if (typeof orig === 'function') {
      wrap = function (ev) { try { return orig.call(this, ev); } catch (err) { if (err !== ABORT) throw err; } };
      c.onclick = wrap;
      const ask = (kind) => (msg = '', def = '') => { if (n < answers.length) return answers[n++]; pending = { kind, msg: String(msg ?? ''), def: def == null ? '' : String(def) }; throw ABORT; };
      window.confirm = ask('confirm'); window.prompt = ask('prompt'); window.alert = ask('alert');
    }
    try { this.mouseSeq(c, 0); }
    finally { if (wrap) { if (c.onclick === wrap) c.onclick = orig; window.confirm = saved.confirm; window.prompt = saved.prompt; window.alert = saved.alert; } }
    if (pending) this.dialog(pending, (ans) => { this.answers = [...answers, ans]; try { if (c.isConnected) this.click(c); } finally { this.answers = null; } });
  }
  // a full click / right click at the element's centre
  mouseSeq(c, button) {
    const p = center(c.getBoundingClientRect());
    this.emit(c, 'down', p.x, p.y, button);
    this.emit(c, 'up', p.x, p.y, button);
    this.fire(c, button === 2 ? 'contextmenu' : 'click', p.x, p.y, button);
  }
  // what a real mouse produces: pointer events, then compatibility mouse events (skipped from a cancelled
  // pointerdown until pointerup, as browsers do). kind: down | up | move | enter | leave
  emit(target, kind, x, y, button = 0) {
    const P = { down: ['pointerdown'], up: ['pointerup'], move: ['pointermove'], enter: ['pointerover', 'pointerenter'], leave: ['pointerout', 'pointerleave'] }[kind];
    const M = { down: ['mousedown'], up: ['mouseup'], move: ['mousemove'], enter: ['mouseover', 'mouseenter'], leave: ['mouseout', 'mouseleave'] }[kind];
    const buttons = kind === 'down' || (kind === 'move' && this.dragging) ? (button === 2 ? 2 : 1) : 0;
    let ok = true;
    if (typeof PointerEvent === 'function') for (const t of P) ok = this.fire(target, t, x, y, button, buttons, true) && ok;
    if (kind === 'down') this.suppress = !ok;
    if (!this.suppress) for (const t of M) this.fire(target, t, x, y, button, buttons);
    if (kind === 'up') this.suppress = false;
  }
  fire(target, type, x, y, button = 0, buttons = 0, pointer = false) {
    const o = { bubbles: !/enter|leave/.test(type), cancelable: true, view: window, clientX: x, clientY: y, button, buttons };
    const ev = pointer ? new PointerEvent(type, { ...o, pointerId: 1, pointerType: 'mouse', isPrimary: true, width: 1, height: 1, pressure: buttons ? 0.5 : 0 }) : new MouseEvent(type, o);
    this.input.synthetic++;
    try { return target.dispatchEvent(ev); } finally { this.input.synthetic--; }
  }
  key(k) {
    this.input.synthetic++;
    try {
      const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body;
      t.dispatchEvent(new KeyboardEvent('keydown', { key: k, code: k, bubbles: true, cancelable: true }));
      t.dispatchEvent(new KeyboardEvent('keyup', { key: k, code: k, bubbles: true, cancelable: true }));
    } finally { this.input.synthetic--; }
  }
  nudge(e, d) {
    const step = +e.step || 1, min = e.min === '' ? 0 : +e.min, max = e.max === '' ? 100 : +e.max;
    const v = Math.min(max, Math.max(min, Math.round(((+e.value || 0) + d * step) / step) * step));
    if (v === +e.value) return;
    e.value = String(+v.toFixed(6));
    e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true }));
    this.sfx('ui_hover');
  }
  cycle(e, d) {
    const n = e.options.length; if (!n) return;
    e.selectedIndex = (e.selectedIndex + d + n) % n;
    e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true }));
    this.sfx('ui_click');
  }
  back(sc) {
    if (this.held) { this.cancelGrab(); return; }
    const ae = document.activeElement;
    if (ae && ae !== document.body && ae.matches?.(TEXTY) && sc.contains(ae) && sc !== this.dlg) { ae.blur(); return; }
    if (sc === this.dlg) { this.dlgCancel?.(); return; }
    if (sc.matches('.hub-menu, .hub-modal')) { this.key('Escape'); return; }
    const g = window.app?.game;
    if (g?.running && !g.ended) {
      const resume = [...sc.querySelectorAll('button')].find(b => /^\s*RESUME\s*$/i.test(b.textContent));
      if (resume) this.click(resume); else this.input.inject('menu');
      return;
    }
    const b = this.collect(sc).find(e => e.tagName === 'BUTTON' && BACK_RE.test(e.textContent));
    if (b) { this.click(b); return; }
    this.key('Escape');
  }
  startBtn(sc) {
    const g = window.app?.game;
    if (g?.running && !g.ended && sc !== this.dlg) { this.cancelGrab(); this.input.inject('menu'); }
  }
  tab(sc, d) {
    const tabs = [...sc.querySelectorAll('.hh-tabs .tab, [role=tab]')].filter(shown);
    if (tabs.length < 2) return;
    let i = tabs.findIndex(t => t.classList.contains('on') || t.getAttribute('aria-selected') === 'true'); if (i < 0) i = 0;
    this.want = '.hh-tabs .tab.on, [role=tab][aria-selected=true]';
    this.click(tabs[(i + d + tabs.length) % tabs.length]);
  }
  subtab(sc, d) {
    for (const sel of ['.subtabs button', '.chips .chip', '.seg button']) {
      const list = [...sc.querySelectorAll(sel)].filter(e => shown(e) && !e.disabled); if (list.length < 2) continue;
      const i = Math.max(0, list.findIndex(t => t.classList.contains('on')));
      this.click(list[(i + d + list.length) % list.length]);
      return;
    }
  }
  scrollTarget(sc) {
    for (let e = this.cur; e && e !== sc.parentElement; e = e.parentElement) if (scrollable(e)) return e;
    const list = [...sc.querySelectorAll('.scroll, [data-scroll], .hm-b, .panel')].filter(scrollable);
    if (scrollable(sc)) list.push(sc);
    const area = (e) => e.clientWidth * e.clientHeight;
    return list.sort((a, b) => area(b) - area(a))[0] || null;
  }
  scroll(sc, st, dt) {
    const t = this.scrollTarget(sc); if (!t) return;
    const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 2, v = 480 * px * dt;
    // accumulate: browsers round scroll offsets, so slow (partial-tilt) scrolling would otherwise stall
    const a = this.sAcc || (this.sAcc = { x: 0, y: 0 });
    a.y += st.ry * v; a.x += t.scrollWidth > t.clientWidth + 2 ? st.rx * v : 0;
    const dy = Math.trunc(a.y), dx = Math.trunc(a.x);
    if (dy) { t.scrollTop += dy; a.y -= dy; }
    if (dx) { t.scrollLeft += dx; a.x -= dx; }
    this.scrollEl = t;
  }
  // the stick let go: if the focus scrolled out of its list, pick the nearest visible entry
  afterScroll(sc) {
    const t = this.scrollEl; this.scrollEl = null;
    const c = this.cur; if (!c || !t.isConnected || !t.contains(c)) return;
    const r = t.getBoundingClientRect(), cr = c.getBoundingClientRect();
    if (cr.top >= r.top - 2 && cr.bottom <= r.bottom + 2) return;
    const inside = this.collect(t).filter(e => { const b = e.getBoundingClientRect(); return b.top >= r.top - 2 && b.bottom <= r.bottom + 2; });
    const pick = nearest(inside, { x: center(cr).x, y: cr.top < r.top ? r.top : r.bottom });
    if (pick) this.setFocus(pick, false);
  }

  // ---------------------------------------------------------------- drag & drop by pad (DnD in itemui.js listens to mouse events)
  grab(c) {
    this.held = { sig: sigOf(c), src: c };
    c.classList.add('pn-held');
    const img = c.querySelector('img');
    if (img) { this.ghost.src = img.src; this.placeGhost(); }
    this.sfx('ui_click'); this.hintKey = '';
  }
  reheld(sc) {
    const h = this.held; if (!h) return;
    const e = [...sc.querySelectorAll('.cell')].find(x => sigOf(x) === h.sig);
    if (e) { h.src = e; e.classList.add('pn-held'); }
  }
  cancelGrab() {
    if (!this.held) return;
    document.querySelectorAll('.pn-held').forEach(e => e.classList.remove('pn-held'));
    this.held = null; this.ghost.style.display = 'none'; this.hintKey = '';
  }
  placeGhost() {
    if (!this.held || !this.cur || !this.ghost.src) { this.ghost.style.display = 'none'; return; }
    const r = this.cur.getBoundingClientRect(), px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 2;
    this.ghost.style.display = 'block';
    this.ghost.style.left = Math.round(r.right - 8 * px) + 'px'; this.ghost.style.top = Math.round(r.top - 8 * px) + 'px';
  }
  heldSrc(sc) {
    const h = this.held; if (!h) return null;
    if (h.src.isConnected && sc.contains(h.src)) return h.src;
    return [...sc.querySelectorAll('.cell')].find(x => sigOf(x) === h.sig) || null;
  }
  place(dst, sc) {
    const src = this.heldSrc(sc); this.cancelGrab();
    if (!src || src === dst) return;
    this.hover(dst, false);
    dst.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    this.drag(src, center(dst.getBoundingClientRect()));
  }
  dropOutside(sc) {
    const src = this.heldSrc(sc); this.cancelGrab(); if (!src) return;
    const r = sc.getBoundingClientRect();
    for (const [fx, fy] of [[0.02, 0.5], [0.98, 0.5], [0.5, 0.03], [0.5, 0.97], [0.02, 0.03], [0.98, 0.97]]) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy, at = document.elementFromPoint(x, y);
      if (at && sc.contains(at) && !at.closest('.panel, .cell')) { this.drag(src, { x, y }); return; }
    }
  }
  drag(src, to) {
    const a = center(src.getBoundingClientRect());
    this.emit(src, 'down', a.x, a.y, 0);
    this.dragging = true;
    try {
      this.emit(document.body, 'move', a.x + 9, a.y + 9);
      this.emit(document.body, 'move', to.x, to.y);
    } finally { this.dragging = false; }
    this.emit(document.body, 'up', to.x, to.y, 0);
  }

  // ---------------------------------------------------------------- native dialog replacement
  dialog(p, done) {
    this.closeDialog();
    const wrap = document.createElement('div'); wrap.className = 'pn-dlg';
    const box = document.createElement('div'); box.className = 'panel col pn-box';
    box.innerHTML = `<div class="pn-msg">${esc(p.msg)}</div>`;
    let inp = null;
    if (p.kind === 'prompt') {
      inp = document.createElement('input'); inp.type = 'text'; inp.value = p.def; inp.maxLength = 64; box.appendChild(inp);
      inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') ok.onclick(); if (e.key === 'Escape') cancel.onclick(); });
    }
    const row = document.createElement('div'); row.className = 'pn-btns';
    const ok = document.createElement('button'); ok.className = 'primary'; ok.textContent = 'OK';
    const cancel = document.createElement('button'); cancel.textContent = 'CANCEL';
    const finish = (v) => { if (this.dlg !== wrap) return; this.closeDialog(); done(v); };
    ok.onclick = () => finish(p.kind === 'prompt' ? inp.value : p.kind === 'confirm' ? true : undefined);
    cancel.onclick = () => finish(p.kind === 'prompt' ? null : p.kind === 'confirm' ? false : undefined);
    // default focus: OK for prompts / alerts, CANCEL for confirmations (they guard destructive actions)
    (p.kind === 'confirm' ? cancel : ok).classList.add('pn-def');
    if (p.kind !== 'alert') row.appendChild(cancel);
    row.appendChild(ok); box.appendChild(row); wrap.appendChild(box);
    (document.getElementById('ui') || document.body).appendChild(wrap);
    this.dlg = wrap; this.dlgCancel = () => (p.kind === 'alert' ? ok : cancel).onclick();
    this.want = '.pn-def';
    this.sfx('ui_open');
  }
  closeDialog() { if (this.dlg) { this.dlg.remove(); this.dlg = null; this.dlgCancel = null; } }

  // ---------------------------------------------------------------- hint bar
  updateHint(sc, now) {
    const inp = this.input, c = this.cur;
    if (now - this.ctxAt > 250 || !this.hintKey) {
      this.ctxAt = now;
      this.ctx = {
        tabs: sc.querySelectorAll('.hh-tabs .tab, [role=tab]').length > 1,
        sub: !!sc.querySelector('.subtabs button, .chips .chip, .seg button'),
        scroll: !!this.scrollTarget(sc),
        raid: !!(window.app?.game?.running && !window.app.game.ended),
      };
      // B only shows where it leads somewhere
      const x = this.ctx;
      x.back = x.raid || sc === this.dlg || sc.matches('.hub-menu, .hub-modal') || (c && c.matches(TEXTY) && document.activeElement === c) || [...sc.querySelectorAll('button')].some(b => BACK_RE.test(b.textContent));
    }
    const x = this.ctx, items = [];
    if (this.held) items.push(['A', 'PLACE'], ['Y', x.raid ? 'DROP' : 'CANCEL'], ['B', 'CANCEL']);
    else {
      if (c) items.push(['A', c.matches(TEXTY) ? 'TYPE' : c.tagName === 'SELECT' ? 'NEXT' : 'SELECT']);
      if (c?.classList.contains('cell') && c._stack) items.push(['X', 'MOVE'], ['Y', x.raid ? 'USE / QUICK' : 'ACTIONS']);
      if (c?.matches('input[type=range], select')) items.push(['DPADLR', 'ADJUST']);
      if (x.back) items.push(['B', sc === this.dlg ? 'CANCEL' : x.raid ? 'CLOSE' : 'BACK']);
    }
    if (x.tabs) items.push(['LB', ''], ['RB', 'TABS']);
    if (x.sub) items.push(['LT', ''], ['RT', 'FILTER']);
    if (x.scroll) items.push(['RS', 'SCROLL']);
    const key = inp.padStyle + inp.padModel + JSON.stringify(items);
    if (key !== this.hintKey) {
      this.hintKey = key;
      this.hint.innerHTML = items.map(([b, t]) => `<span class="it"><img src="${badgeURL(b, inp.padStyle, inp)}" alt="${esc(inp.btnLabel(b))}">${t ? `<span>${esc(t)}</span>` : ''}</span>`).join('');
    }
    this.hint.classList.remove('hidden');
    // centre on whole pixels; jump to the top edge when the focus sits under the bar
    const w = this.hint.offsetWidth, h = this.hint.offsetHeight;
    this.hint.style.left = Math.round((innerWidth - w) / 2) + 'px';
    const cr = c?.getBoundingClientRect();
    const under = cr && cr.bottom > innerHeight - h - 12 && cr.right > (innerWidth - w) / 2 && cr.left < (innerWidth + w) / 2;
    this.hint.classList.toggle('top', !!under);
  }
  sfx(n) { try { window.app?.audioSafe?.play?.(n); } catch (e) { /* audio optional */ } }
}
