// Shared DOM item widgets: icon URLs, item cells, tooltips, pointer drag & drop.
import * as Icons from './icons.js';
import { ITEMS, ROMAN, weaponStats, stackValue } from '../game/items.js';

const urlCache = new Map();
export function iconURL(id) {
  if (urlCache.has(id)) return urlCache.get(id);
  let url = null;
  try { if (Icons.itemIconDataURL) url = Icons.itemIconDataURL(id); } catch (e) { url = null; }
  if (!url) {
    const c = document.createElement('canvas'); c.width = c.height = 24;
    const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
    const d = ITEMS[id];
    try { Icons.drawIcon(x, d?.icon || 'metalParts', 4, 4, 16); } catch (e) { /* missing */ }
    const data = x.getImageData(0, 0, 24, 24).data; let any = false; for (let i = 3; i < data.length; i += 4) if (data[i]) { any = true; break; }
    if (!any) { x.fillStyle = RAR[d?.rarity] || '#888'; x.fillRect(5, 5, 14, 14); x.fillStyle = '#141414'; x.fillRect(7, 7, 10, 10); x.fillStyle = RAR[d?.rarity] || '#888'; x.font = '8px monospace'; x.fillText((d?.name || id).slice(0, 2), 7, 15); }
    url = c.toDataURL();
  }
  urlCache.set(id, url);
  return url;
}
export const RAR = { common: '#a8a8a0', uncommon: '#5cc860', rare: '#3a98f0', epic: '#c058f0', legendary: '#f0b828' };
export const TYPE_LABEL = { weapon: 'Weapon', ammo: 'Ammo', consumable: 'Consumable', grenade: 'Grenade', gadget: 'Gadget', trap: 'Trap', augment: 'Augment', shield: 'Shield', mod: 'Weapon Mod', material: 'Material', valuable: 'Valuable', key: 'Key', blueprint: 'Blueprint', quest: 'Quest Item', trinket: 'Trinket' };

export function el(tag, cls = '', html = '') { const e = document.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; return e; }

// a slot cell; ref is any object identifying the slot for drag & drop
export function cell(stack, ref, { hint = '', wide = false } = {}) {
  const c = el('div', 'cell' + (wide ? ' wide' : '') + (stack ? '' : ' empty-hint'));
  c.dataset.hint = hint;
  c._ref = ref; c._stack = stack;
  if (stack) {
    const d = ITEMS[stack.id];
    const img = el('img'); img.src = iconURL(stack.id); img.draggable = false; c.appendChild(img);
    if (stack.qty > 1) c.appendChild(el('span', 'qty', String(stack.qty)));
    if (d?.type === 'weapon' && (stack.tier || 1) > 1) c.appendChild(el('span', 'tier', ROMAN[stack.tier]));
    const r = el('span', 'rar'); r.style.background = RAR[d?.rarity] || '#666'; c.appendChild(r);
    if (d?.type === 'weapon') { const ws = weaponStats(stack); const b = el('span', 'durbar'); const i = el('i'); i.style.height = Math.round(100 * Math.max(0, (stack.dur ?? ws.durability) / ws.durability)) + '%'; if ((stack.dur ?? 1) <= 0) i.style.background = 'var(--red)'; b.appendChild(i); c.appendChild(b); }
    Tooltip.attach(c, () => stack);
  }
  return c;
}

export const Tooltip = {
  el: null,
  // mouse / pen: hover tooltip. touch: tap shows it next to the element (cells managed by DnD get
  // theirs from the long-press / tap-to-select flows instead)
  attach(node, getStack) {
    node.addEventListener('pointerenter', (e) => { if (e.pointerType !== 'touch') this.show(getStack(), e); });
    node.addEventListener('pointermove', (e) => { if (e.pointerType !== 'touch') this.move(e); });
    node.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch') this.hide(); });
    node.addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'touch' || (node._stack && node.closest('[data-dnd]'))) return;
      setTimeout(() => { if (node.isConnected) this.showAt(getStack(), node); }, 0);
    });
  },
  // anchored next to an element (touch)
  showAt(s, node) {
    const r = node.getBoundingClientRect();
    this.show(s, { clientX: r.right - 8, clientY: r.top + 4 });
    this.shownAt = performance.now();
  },
  show(s, e) {
    if (!s || DnD.active) return;
    const d = ITEMS[s.id]; if (!d) return;
    if (!this.el) { this.el = el('div', 'tooltip'); document.body.appendChild(this.el); }
    let stats = '';
    const row = (k, v) => `<span>${k}</span><b>${v}</b>`;
    if (d.weapon) {
      const w = weaponStats(s);
      stats = row('DAMAGE', (w.dmg * (w.pellets || 1)).toFixed(1) + (w.pellets > 1 ? ` (${w.pellets}x)` : '')) + row('FIRE RATE', Math.round(w.rpm) + ' RPM') + row('MAGAZINE', w.mag) + row('RANGE', Math.round(w.range) + 'M') + row('RELOAD', w.reload.toFixed(1) + 'S') + row('AMMO', ITEMS[w.ammo]?.name || w.ammo) + row('MODE', w.mode.toUpperCase()) + row('DURABILITY', `${Math.round(s.dur ?? w.durability)}/${Math.round(w.durability)}`);
    } else if (d.shield) stats = row('CAPACITY', d.shield.capacity) + row('MITIGATION', Math.round(d.shield.mitigation * 100) + '%') + row('MOVE', Math.round(d.shield.moveMul * 100) + '%') + (s.charge != null ? row('CHARGE', Math.round(s.charge)) : '');
    else if (d.augment) { const a = d.augment; stats = row('BACKPACK', a.backpack) + row('QUICK USE', a.quick + (a.extra ? Object.values(a.extra).reduce((x, y) => x + y, 0) : 0)) + row('SAFE POCKET', a.safe) + row('WEIGHT LIMIT', a.weightLimit + 'KG') + row('SHIELDS', (a.shields || []).join('/').toUpperCase() || 'NONE'); }
    else if (d.use) stats = (d.use.healOverTime ? row('HEALS', `${d.use.healOverTime.amount} / ${d.use.healOverTime.dur}S`) : '') + (d.use.heal ? row('HEALS', d.use.heal) : '') + (d.use.shieldOverTime ? row('SHIELD', `${d.use.shieldOverTime.amount} / ${d.use.shieldOverTime.dur}S`) : '') + row('USE TIME', (d.use.time || 1) + 'S');
    else if (d.throw) stats = row('RADIUS', d.throw.radius + 'M') + (d.throw.dmg ? row('DAMAGE', d.throw.dmg) : '') + (d.throw.dur ? row('DURATION', d.throw.dur + 'S') : '');
    else if (d.blueprint) stats = row('TEACHES', ITEMS[d.blueprint?.replace?.('craft_', '')]?.name || d.blueprint);
    stats += row('WEIGHT', (d.weight * s.qty).toFixed(2) + 'KG') + row('VALUE', stackValue(s) + ' $');
    this.el.innerHTML = `<div class="tt-name" style="color:${RAR[d.rarity]}">${d.name}</div><div class="tt-sub">${d.rarity} ${TYPE_LABEL[d.type] || d.type}</div><div class="tt-desc">${d.desc || ''}</div><div class="tt-stats">${stats}</div>`;
    this.el.style.display = 'block';
    this.move(e);
  },
  move(e) { if (!this.el) return; const w = this.el.offsetWidth, h = this.el.offsetHeight; let x = e.clientX + 16, y = e.clientY + 12; if (x + w > innerWidth) x = e.clientX - w - 12; if (y + h > innerHeight) y = innerHeight - h - 4; this.el.style.left = x + 'px'; this.el.style.top = y + 'px'; },
  hide() { if (this.el) this.el.style.display = 'none'; },
};

// pointer-based drag & drop between .cell elements (mouse, pen and touch)
//   mouse / pen: press + move > 5 px drags; a click without moving is onClick; right button is onRight
//   touch: tap is onClick (onTapEmpty for empty cells); hold ~0.4 s lifts the item (tooltip + ghost
//   above the finger), then drag onto a cell (onDrop) or off the panels (onDropOutside); lifting and
//   letting go without moving is onHold. A quick swipe scrolls the list instead.
export const DnD = {
  active: null, touchDrag: false,
  // root: container element; onDrop(fromRef, toRef, fromStack, evt); onClick(ref, stack, evt)
  bind(root, { onDrop, onClick, onRight, onDropOutside, onHold, onTapEmpty }) {
    root.dataset.dnd = '1';
    const clearOk = () => document.querySelectorAll('.cell.drop-ok').forEach(n => n.classList.remove('drop-ok'));
    const target = (x, y) => document.elementFromPoint(x, y)?.closest('.cell');
    root.addEventListener('pointerdown', (e) => {
      const c = e.target.closest('.cell'); if (!c || !root.contains(c)) return;
      const touch = e.pointerType === 'touch', id = e.pointerId;
      if (!c._stack) {
        if (!touch || !onTapEmpty || !c._ref) return;
        const sx = e.clientX, sy = e.clientY;
        const up = (ev) => { if (ev.pointerId !== id) return; off(); if (ev.type === 'pointerup' && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 12) onTapEmpty(c._ref, ev); };
        const off = () => { removeEventListener('pointerup', up); removeEventListener('pointercancel', up); };
        addEventListener('pointerup', up); addEventListener('pointercancel', up);
        return;
      }
      if (!touch && e.button === 2) { e.preventDefault(); onRight?.(c._ref, c._stack, e); return; }
      if (!touch && e.button !== 0) return;
      if (touch) e.preventDefault();   // no emulated mouse events after the tap
      // tap vs hold is decided by the event timestamps (a busy main thread can run the timer late)
      const start = { x: e.clientX, y: e.clientY }, t0 = e.timeStamp, HOLD = 380;
      let ghost = null, lifted = !touch, moved = false, timer = 0;
      const lift = () => {
        lifted = true; this.touchDrag = true;
        c.classList.add('tsel'); Tooltip.showAt(c._stack, c);
        try { navigator.vibrate?.(12); } catch (err) { /* no haptics */ }
      };
      if (touch) timer = setTimeout(lift, HOLD);
      // the ghost floats above a finger so it stays visible; the drop target is under the finger
      const place = (ev) => {
        const above = touch ? ghost.offsetHeight * 0.9 : 0;
        ghost.style.left = (ev.clientX - ghost.offsetWidth / 2) + 'px'; ghost.style.top = (ev.clientY - ghost.offsetHeight / 2 - above) + 'px';
        clearOk(); const t = target(ev.clientX, ev.clientY); if (t && t !== c) t.classList.add('drop-ok');
      };
      const mm = (ev) => {
        if (ev.pointerId !== id) return;
        const d = Math.hypot(ev.clientX - start.x, ev.clientY - start.y);
        if (!lifted) {
          if (ev.timeStamp - t0 >= HOLD) { clearTimeout(timer); lift(); }     // held still long enough
          else { if (d > 10) { moved = true; cleanup(); } return; }            // a swipe: let it scroll
        }
        if (!ghost && d > (touch ? 8 : 5)) {
          moved = true;
          ghost = c.cloneNode(true); ghost.classList.add('drag-ghost'); ghost.classList.remove('tsel'); document.body.appendChild(ghost);
          this.active = { ref: c._ref, stack: c._stack }; Tooltip.hide();
        }
        if (ghost) { if (touch) ev.preventDefault(); place(ev); }
      };
      const cleanup = () => {
        clearTimeout(timer); this.touchDrag = false;
        removeEventListener('pointermove', mm); removeEventListener('pointerup', mu); removeEventListener('pointercancel', mu);
        clearOk(); c.classList.remove('tsel');
        if (ghost) { ghost.remove(); ghost = null; }
      };
      const mu = (ev) => {
        if (ev.pointerId !== id) return;
        const hadGhost = !!ghost, wasLifted = lifted && touch && ev.timeStamp - t0 >= HOLD;
        cleanup();
        if (ev.type === 'pointercancel') { this.active = null; return; }
        if (hadGhost) {
          const under = document.elementFromPoint(ev.clientX, ev.clientY);
          const t = under?.closest('.cell');
          const was = this.active; this.active = null;
          if (t && t !== c) onDrop?.(was.ref, t._ref, was.stack, ev);
          else if (!t && !under?.closest('.panel')) onDropOutside?.(was.ref, was.stack, ev);
        } else if (wasLifted) { if (onHold) onHold(c._ref, c._stack, ev); }
        else if (!moved) { if (lifted && touch) Tooltip.hide(); onClick?.(c._ref, c._stack, ev); }
      };
      addEventListener('pointermove', mm, { passive: false }); addEventListener('pointerup', mu); addEventListener('pointercancel', mu);
    });
    root.addEventListener('contextmenu', (e) => { if (e.target.closest('.cell')) e.preventDefault(); });
  },
};
// while an item is lifted by touch the page must not scroll under the finger
document.addEventListener('touchmove', (e) => { if (DnD.touchDrag && e.cancelable) e.preventDefault(); }, { passive: false });
// a touch anywhere else dismisses a tap tooltip
addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch' && Tooltip.el && performance.now() - (Tooltip.shownAt || 0) > 50) Tooltip.hide(); }, true);
