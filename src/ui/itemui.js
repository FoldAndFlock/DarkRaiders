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
  attach(node, getStack) {
    node.addEventListener('mouseenter', (e) => this.show(getStack(), e));
    node.addEventListener('mousemove', (e) => this.move(e));
    node.addEventListener('mouseleave', () => this.hide());
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

// pointer-based drag & drop between .cell elements
export const DnD = {
  active: null,
  // root: container element; onDrop(fromRef, toRef, fromStack, evt); onClick(ref, stack, evt)
  bind(root, { onDrop, onClick, onRight, onDropOutside }) {
    root.addEventListener('mousedown', (e) => {
      const c = e.target.closest('.cell'); if (!c || !c._stack) return;
      if (e.button === 2) { e.preventDefault(); onRight?.(c._ref, c._stack, e); return; }
      if (e.button !== 0) return;
      const start = { x: e.clientX, y: e.clientY };
      let ghost = null;
      const mm = (ev) => {
        if (!ghost && Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 5) {
          ghost = c.cloneNode(true); ghost.classList.add('drag-ghost'); document.body.appendChild(ghost);
          this.active = { ref: c._ref, stack: c._stack }; Tooltip.hide();
        }
        if (ghost) { ghost.style.left = (ev.clientX - ghost.offsetWidth / 2) + 'px'; ghost.style.top = (ev.clientY - ghost.offsetHeight / 2) + 'px';
          document.querySelectorAll('.cell.drop-ok').forEach(n => n.classList.remove('drop-ok'));
          const t = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.cell'); if (t && t !== c) t.classList.add('drop-ok'); }
      };
      const mu = (ev) => {
        removeEventListener('mousemove', mm); removeEventListener('mouseup', mu);
        document.querySelectorAll('.cell.drop-ok').forEach(n => n.classList.remove('drop-ok'));
        if (ghost) {
          ghost.remove();
          const under = document.elementFromPoint(ev.clientX, ev.clientY);
          const t = under?.closest('.cell');
          const was = this.active; this.active = null;
          if (t && t !== c) onDrop?.(was.ref, t._ref, was.stack, ev);
          else if (!t && !under?.closest('.panel')) onDropOutside?.(was.ref, was.stack, ev);
        } else onClick?.(c._ref, c._stack, ev);
      };
      addEventListener('mousemove', mm); addEventListener('mouseup', mu);
    });
    root.addEventListener('contextmenu', (e) => { if (e.target.closest('.cell')) e.preventDefault(); });
  },
};
