// Display settings shared by every screen: UI scale (DOM --px + canvas HUD pixel scale) and on-screen
// touch controls. Persisted in profile.settings (uiScale, touch) and mirrored to localStorage so the
// title screen is already scaled before the profile loads. Changes apply live: --px is rewritten and
// a 'dr:uiscale' event tells the hub / HUD / touch layer to re-layout.
function el(tag, cls = '', html = '') { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }

const LS_UI = 'dr_ui', LS_TOUCH = 'dr_touch';
// explicit steps (1 = one font pixel per CSS pixel); 'auto' picks a comfortable size per screen
export const SCALE_STEPS = [0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];
export const TOUCH_MODES = ['auto', 'on', 'off'];

const S = { ui: 'auto', touch: 'auto', px: 1, hud: 2, tk: 1, app: null };
const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, String(v)); } catch (e) { /* storage disabled */ } };
const normUi = (v) => (v === 'auto' || v == null || v === '' || !isFinite(+v) || +v <= 0) ? 'auto' : +v;
const normTouch = (v) => TOUCH_MODES.includes(v) ? v : 'auto';

export const dpr = () => Math.max(1, window.devicePixelRatio || 1);
// device has a touch screen as its main pointer (phones / tablets); hybrid laptops count as desktop
export function isTouchDevice() {
  try { if (matchMedia('(pointer: coarse)').matches) return true; } catch (e) { /* old browser */ }
  return ('ontouchstart' in window) && !(window.matchMedia?.('(pointer: fine)')?.matches);
}
// crisp steps: pixel fonts look clean at whole device pixels; quarter steps are fine on hi-dpi screens
const grid = () => dpr() >= 1.5 ? 0.25 : 0.5;
const snapDown = (v) => { const g = grid(); return Math.floor(v / g + 1e-6) * g; };
const snapNear = (v) => { const g = grid(); return Math.round(v / g) * g; };

// comfortable DOM scale for this window: ~2.5% of the height for body text, bounded by width so the
// 3-column hub keeps its layout; phones and tablets get at least 1.5 (15 px text)
function autoPx(w, h) {
  let px = Math.min(h / 400, w / 640);
  px = snapDown(px);
  if (isTouchDevice()) px = Math.max(px, 1.5);
  return Math.max(1, Math.min(4, px));
}
// the UI needs ~420 x 236 units; past that the scale is capped (panels also scroll)
function fitCap(w, h) { return Math.max(1, snapDown(Math.min(w / 420, h / 236))); }

// canvas HUD scale in CSS px per HUD pixel: whole device pixels (crisp nearest-neighbour), and the
// HUD keeps at least minW x minH game pixels (more with touch controls, which need room)
export function hudScaleFor(w, h, touch = false) {
  const d = dpr();
  let s = S.ui === 'auto' ? Math.max(isTouchDevice() || touch ? 1.5 : 1, h / 360) : +S.ui;
  const cap = touch ? Math.min(w / 500, h / 228) : Math.min(w / 440, h / 220);
  s = Math.min(s, Math.max(1, cap));
  const q = Math.max(1, Math.round(s * d)) / d;
  return q <= Math.max(1, cap) + 1e-6 ? q : Math.max(1, Math.floor(s * d)) / d;
}

export function apply() {
  const w = innerWidth, h = innerHeight;
  let px = S.ui === 'auto' ? autoPx(w, h) : snapNear(+S.ui);
  px = Math.max(0.75, Math.min(px, fitCap(w, h)));
  S.px = px;
  // touch-control size: 1 at the phone default (1.5), grows with the UI scale but never so far that
  // the right-hand button cluster (~330 px tall) stops fitting
  S.tk = Math.max(0.8, Math.min(px / 1.5, (h - 50) / 340, w / 760, 2.2));
  const r = document.documentElement.style;
  r.setProperty('--px', String(px));
  r.setProperty('--tk', S.tk.toFixed(3));
  document.documentElement.classList.toggle('touchui', touchEnabled());
  window.dispatchEvent(new Event('dr:uiscale'));
}

// a screen whose layout needs at least minW x minH units caps its own --px (never below 1)
export function capPx(minW, minH, px = S.px) { return Math.min(px, Math.max(1, snapDown(Math.min(innerWidth / minW, innerHeight / minH)))); }
export function uiScale() { return S.ui; }
export function domPx() { return S.px; }
export function touchScale() { return S.tk; }
export function touchMode() { return S.touch; }
// Auto: a touch-first device, or any real touch seen this session (some browsers misreport the pointer)
let sawTouch = false;
export function touchEnabled() { return S.touch === 'on' || (S.touch === 'auto' && (isTouchDevice() || sawTouch)); }
export const touchSeen = () => sawTouch;

// boot: localStorage first (title screen), then the profile once it is loaded
export function initSettings(app) {
  S.app = app;
  S.ui = normUi(lsGet(LS_UI));
  S.touch = normTouch(lsGet(LS_TOUCH));
  apply();
  const seen = (e) => { if (sawTouch || (e.pointerType && e.pointerType !== 'touch')) return; sawTouch = true; apply(); };
  addEventListener('pointerdown', seen, true); addEventListener('touchstart', seen, { capture: true, passive: true });
  let t = 0;
  addEventListener('resize', () => { clearTimeout(t); t = setTimeout(apply, 60); apply(); });
  window.matchMedia?.('(pointer: coarse)')?.addEventListener?.('change', apply);
}
// profile <-> device: these are display preferences of this device, so the localStorage mirror wins
// when it exists (a change made mid-raid is only saved to the profile after the raid); otherwise the
// profile's values are adopted, and a new profile is seeded with the current ones
export function syncProfile(p) {
  if (!p) return;
  p.settings = p.settings || {};
  if (lsGet(LS_UI) == null && p.settings.uiScale != null) S.ui = normUi(p.settings.uiScale);
  if (lsGet(LS_TOUCH) == null && p.settings.touch != null) S.touch = normTouch(p.settings.touch);
  p.settings.uiScale = S.ui; p.settings.touch = S.touch;
  lsSet(LS_UI, S.ui); lsSet(LS_TOUCH, S.touch);
  apply();
}
function persist() {
  const p = S.app?.profile;
  if (p) {
    p.settings = p.settings || {}; p.settings.uiScale = S.ui; p.settings.touch = S.touch;
    // not mid-raid: the raid mutates the loadout in place and the profile is saved on the results screen
    if (!S.app.game?.running) { try { S.app.save?.(); } catch (e) { /* storage disabled */ } }
  }
  lsSet(LS_UI, S.ui); lsSet(LS_TOUCH, S.touch);
}
export function setUiScale(v) { S.ui = normUi(v); persist(); apply(); }
export function setTouchMode(v) { S.touch = normTouch(v); persist(); apply(); }

// options offered for this screen: quarter steps only where they render crisply
export function scaleOptions() { const g = grid(); return ['auto', ...SCALE_STEPS.filter(s => Math.abs(s / g - Math.round(s / g)) < 1e-6 && (g < 0.5 || s >= 1))]; }
export function scaleLabel(v = S.ui) { return v === 'auto' ? `AUTO (${Math.round(S.px * 100)}%)` : `${Math.round(+v * 100)}%` + (Math.abs(+v - S.px) > 1e-6 ? ` (${Math.round(S.px * 100)}%)` : ''); }
export function stepScale(dir) {
  const opts = scaleOptions();
  let i = opts.findIndex(o => o === S.ui);
  if (i < 0) i = S.ui === 'auto' ? 0 : opts.findIndex(o => o !== 'auto' && o >= +S.ui);
  if (i < 0) i = opts.length - 1;
  setUiScale(opts[Math.max(0, Math.min(opts.length - 1, i + dir))]);
}

// ---------------------------------------------------------------- fullscreen (needs a user gesture)
// launched from the home screen (installed web app): already full screen, no browser bars
export const isStandalone = () => !!(navigator.standalone || ['fullscreen', 'standalone'].some(m => matchMedia?.(`(display-mode: ${m})`).matches));
export const canFullscreen = () => !isStandalone() && !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
export const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
export async function toggleFullscreen() {
  try {
    if (isFullscreen()) { await (document.exitFullscreen || document.webkitExitFullscreen).call(document); return; }
    const de = document.documentElement;
    await (de.requestFullscreen || de.webkitRequestFullscreen).call(de, { navigationUI: 'hide' });
    try { await screen.orientation?.lock?.('landscape'); } catch (e) { /* not allowed on this device */ }
  } catch (e) { /* refused */ }
}

// ---------------------------------------------------------------- shared widget
// rows for the hub Raider tab, the pause menu and the title screen; onChange runs after a change
export function settingsRows({ onChange = null, sfx = null } = {}) {
  const box = el('div', 'set-rows');
  const render = () => {
    box.innerHTML = '';
    const r1 = el('div', 'set-row', '<span class="set-k">UI SCALE</span>');
    const dn = el('button', 'set-step', '-'), val = el('b', 'set-v', scaleLabel()), up = el('button', 'set-step', '+');
    dn.setAttribute('aria-label', 'Smaller interface'); up.setAttribute('aria-label', 'Larger interface');
    const opts = scaleOptions();
    dn.disabled = S.ui === opts[0]; up.disabled = S.ui === opts[opts.length - 1];
    dn.onclick = () => { stepScale(-1); sfx?.('ui_click'); render(); onChange?.(); };
    up.onclick = () => { stepScale(1); sfx?.('ui_click'); render(); onChange?.(); };
    const sp = el('span', 'set-ctl'); sp.append(dn, val, up); r1.appendChild(sp); box.appendChild(r1);
    const r2 = el('div', 'set-row', '<span class="set-k">TOUCH CONTROLS</span>');
    const seg = el('span', 'set-ctl set-seg');
    for (const m of TOUCH_MODES) {
      const b = el('button', S.touch === m ? 'on' : '', m === 'auto' ? `AUTO${isTouchDevice() ? ' (ON)' : ' (OFF)'}` : m.toUpperCase());
      b.onclick = () => { setTouchMode(m); sfx?.('ui_click'); render(); onChange?.(); };
      seg.appendChild(b);
    }
    r2.appendChild(seg); box.appendChild(r2);
    if (canFullscreen() && (touchEnabled() || isFullscreen())) {
      const r3 = el('div', 'set-row', '<span class="set-k">DISPLAY</span>');
      const fs = el('button', '', isFullscreen() ? 'EXIT FULLSCREEN' : 'FULLSCREEN');
      fs.onclick = async () => { await toggleFullscreen(); setTimeout(render, 250); };
      const sp3 = el('span', 'set-ctl'); sp3.appendChild(fs); r3.appendChild(sp3); box.appendChild(r3);
    }
  };
  render();
  box.refresh = render;
  return box;
}
