// In-raid DOM overlays: inventory (Tab), loot panel, map (M), pause (Esc), chat (Enter).
import { el, cell, DnD, Tooltip, RAR } from './itemui.js';
import { ITEMS, makeStack } from '../game/items.js';
import { capacities, fitLoadout, moveSlot, getSlot, setSlot, QUICK_TYPES } from '../game/inventory.js';
import { TERRAIN } from '../engine/textures.js';
import { RECIPES } from '../data/recipes.js';
import { countIn, takeFrom, pickUp as pickUpInto } from '../game/inventory.js';

const TERRAIN_COL = { grass: '#4a5a2a', dirt: '#5a4632', sand: '#c09c64', sandDark: '#8e7046', concrete: '#727068', damConcrete: '#857e70', asphalt: '#38383a', rock: '#5a544c', tiles: '#868076', wood: '#624432', mud: '#3e3424', gravel: '#6a665e', moss: '#3a4826', forest: '#2e3a1e', metalPanel: '#525a5c', hazard: '#a07a20' };

export class RaidUI {
  constructor(game) {
    this.g = game;
    this.root = document.getElementById('ui');
    this.wrap = el('div'); this.root.appendChild(this.wrap);
    this.inv = null; this.loot = null; this.lootItems = null; this.mapEl = null; this.pause = null;
    this.chatOpen = false; this.chatInput = '';
    this.chatEl = el('div', 'chatbox hidden'); const inp = el('input'); inp.type = 'text'; inp.maxLength = 120; this.chatEl.appendChild(inp); this.wrap.appendChild(this.chatEl);
    this.chatField = inp;
    inp.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { const t = inp.value.trim(); if (t) this.g.session.chat(t); this.closeChat(); }
      if (e.key === 'Escape') this.closeChat();
    });
    inp.addEventListener('input', () => { this.chatInput = inp.value; });
    if (game.profile && !game.profile.seenIntro) this.showIntro();
  }
  showIntro() {
    const p = el('div', 'panel col'); p.style.cssText = 'position:absolute;right:calc(var(--px)*8px);top:calc(var(--px)*40px);max-width:calc(var(--px)*190px);pointer-events:none';
    p.innerHTML = `<h2 class="yellow">FIRST DROP</h2>
      <div>Loot what you can, then <span class="green">EXTRACT</span> at an elevator, metro or hatch before the timer runs out.</div>
      <div class="label">ARK GAZE: <span class="yellow">YELLOW</span> PATROL - <span style="color:var(--orange)">ORANGE</span> SUSPICIOUS - <span class="red">RED</span> HUNTING YOU. STAY OUT OF THE LIGHT OR BREAK LINE OF SIGHT.</div>
      <div class="label">E SEARCH / INTERACT - TAB INVENTORY - M MAP - 1-6 QUICK USE - SPACE ROLL - C CROUCH - F FLASHLIGHT</div>
      <div class="label">DIE AND YOU LOSE EVERYTHING EXCEPT YOUR SAFE POCKET.</div>`;
    this.wrap.appendChild(p);
    const kill = () => { p.remove(); removeEventListener('keydown', kill); };
    setTimeout(() => addEventListener('keydown', kill), 1500); setTimeout(kill, 16000);
    this.g.profile.seenIntro = true;
  }
  destroy() { this.wrap.remove(); Tooltip.hide(); this.g.o.input.typing = false; this.g.o.input.enabled = true; }
  get blocking() { return !!(this.inv || this.mapEl || this.pause); }

  update(dt, input) {
    const g = this.g;
    if (this.chatOpen) return;
    if (input.hit('chat') && !this.pause) { this.openChat(); return; }
    if (input.hit('menu')) {
      if (this.inv) this.closeInv(); else if (this.mapEl) this.closeMap(); else if (this.pause) this.closePause(); else this.openPause();
    }
    if (input.hit('inventory')) { if (this.inv) this.closeInv(); else this.openInv(); }
    if (input.hit('map')) { if (this.mapEl) this.closeMap(); else this.openMap(); }
    // loot panel closes when walking away
    if (this.lootRef && g.me) { const dx = this.lootRef.x - g.me.x, dz = this.lootRef.z - g.me.z; if (Math.hypot(dx, dz) > 3.2) { this.lootRef = null; this.lootItems = null; if (this.inv) this.renderInv(); } }
    if (this.inv && g.invDirty) { g.invDirty = false; this.renderInv(); }
    if (this.mapEl) this.drawMap();
    g.uiBlocking = this.blocking;
    input.enabled = !this.pause;
  }
  openChat() { this.chatOpen = true; this.chatEl.classList.remove('hidden'); this.chatField.value = ''; this.chatInput = ''; this.chatField.focus(); this.g.o.input.typing = true; }
  closeChat() { this.chatOpen = false; this.chatEl.classList.add('hidden'); this.chatField.blur(); this.g.o.input.typing = false; }

  // ------------------------------------------------------------------ inventory + loot
  openLoot(it, items) {
    this.lootRef = it; this.lootItems = items;
    // first search reveals items one by one (ARC Raiders style)
    const key = it.kind + ':' + it.ref; this.revealed = this.revealed || new Set();
    if (!this.revealed.has(key) && items.length) {
      this.revealed.add(key);
      this.revealN = 0; this.revealAt = performance.now();
      const step = 320 / (this.g.stats0?.search_reveal || 1);
      const tick = () => { if (this.lootRef !== it) return; this.revealN++; this.g.audio?.play('ui_hover'); this.renderInv(); if (this.revealN < items.length) setTimeout(tick, step); };
      setTimeout(tick, step);
      this.revealN = 0;
    } else this.revealN = 1e9;
    this.openInv();
  }
  openInv() { if (!this.inv) { this.inv = el('div', 'overlay'); this.wrap.appendChild(this.inv); this.g.audio?.play('ui_open'); } this.renderInv(); }
  closeInv() { if (!this.inv) return; this.inv.remove(); this.inv = null; this.lootRef = null; this.lootItems = null; Tooltip.hide(); this.g.audio?.play('ui_close'); }
  renderInv() {
    const g = this.g, pc = g.pc, lo = pc.lo; pc.recalc();
    const caps = pc.caps;
    const over = fitLoadout(lo, caps); if (over.length) g.session.dropItems(over);
    this.inv.innerHTML = '';
    const left = el('div', 'panel col'); left.style.maxHeight = '90vh';
    left.appendChild(el('div', 'row', `<h2>LOADOUT</h2><span class="label" style="margin-left:auto">${pc.weight().toFixed(1)} / ${caps.weightLimit} KG</span>`));
    const sec = (title, node) => { const c = el('div', 'col'); c.appendChild(el('div', 'label', title)); c.appendChild(node); return c; };
    const top = el('div', 'row');
    top.appendChild(sec('AUGMENT', cell(lo.augment, { c: 'augment' }, { hint: 'AUG' })));
    top.appendChild(sec('SHIELD', cell(lo.shield, { c: 'shield' }, { hint: 'SHD' })));
    const ws = el('div', 'slots'); for (let i = 0; i < caps.weaponSlots; i++) ws.appendChild(cell(lo.weapons[i], { c: 'weapons', i }, { wide: true, hint: 'WEAPON ' + (i + 1) }));
    top.appendChild(sec('WEAPONS', ws));
    left.appendChild(top);
    const q = el('div', 'slots'); lo.quick.forEach((s, i) => q.appendChild(cell(s, { c: 'quick', i }, { hint: String(i + 1) })));
    const sf = el('div', 'slots'); lo.safe.forEach((s, i) => sf.appendChild(cell(s, { c: 'safe', i }, { hint: 'SAFE' })));
    const row2 = el('div', 'row'); row2.appendChild(sec('QUICK USE', q)); if (caps.safe) row2.appendChild(sec('SAFE POCKET', sf)); left.appendChild(row2);
    const bp = el('div', 'slots'); bp.style.maxWidth = 'calc(var(--cell) * 8 + var(--px) * 8px)';
    lo.backpack.forEach((s, i) => bp.appendChild(cell(s, { c: 'backpack', i })));
    left.appendChild(sec(`BACKPACK  ${lo.backpack.filter(Boolean).length}/${caps.backpack}`, bp));
    left.appendChild(el('div', 'label', 'DRAG TO MOVE  -  RIGHT CLICK: USE / QUICK-MOVE  -  DRAG OUTSIDE: DROP'));
    this.inv.appendChild(left);
    // field crafting (skill unlock): basic inRaid recipes from carried materials
    const un = g.stats0?.unlocks;
    if (!this.lootItems && (un?.has?.('field_craft_basic') || un?.has?.('field_craft_advanced'))) {
      const fc = el('div', 'panel col'); fc.style.maxWidth = 'calc(var(--px) * 170px)';
      fc.appendChild(el('h2', '', 'FIELD CRAFT'));
      const adv = un.has('field_craft_advanced');
      const known = new Set(g.profile?.blueprints || []);
      for (const r of RECIPES.filter(r => r.inRaid && (adv || r.bench === 'workbench') && (!r.blueprint || known.has(r.id)))) {
        const arrs = [lo.backpack, lo.safe, lo.quick];
        const ok = Object.entries(r.in).every(([id, n]) => countIn(arrs, id) >= n);
        const row = el('div', 'row');
        const b = el('button', ok ? '' : '', (ITEMS[r.out]?.name || r.out).toUpperCase()); b.disabled = !ok; b.style.flex = '1';
        b.title = Object.entries(r.in).map(([id, n]) => `${n}x ${ITEMS[id]?.name || id}`).join(', ');
        b.onclick = () => { for (const [id, n] of Object.entries(r.in)) takeFrom(arrs, id, n); const left = pickUpInto(lo, makeStack(r.out, r.qty || 1)); if (left > 0) g.dropStack(makeStack(r.out, left)); g.audio?.play('ui_craft'); g.feed('CRAFTED ' + (ITEMS[r.out]?.name || r.out).toUpperCase(), '#68e088'); this.renderInv(); };
        row.appendChild(b); fc.appendChild(row);
        fc.appendChild(el('div', 'label', b.title));
      }
      this.inv.appendChild(fc);
    }
    if (this.lootItems) {
      const right = el('div', 'panel col'); right.style.minWidth = 'calc(var(--cell) * 6)';
      right.appendChild(el('div', 'row', `<h2>${this.lootRef.label.replace(/^(SEARCH|OPEN|LOOT) /, '')}</h2>`));
      const grid = el('div', 'slots'); grid.style.maxWidth = 'calc(var(--cell) * 6 + var(--px) * 6px)';
      this.lootItems.forEach((s, i) => { if (i < (this.revealN ?? 1e9)) grid.appendChild(cell(s, { c: 'loot', i })); else { const c = cell(null, { c: 'loot-hidden', i }); c.innerHTML = '<span class="label">...</span>'; grid.appendChild(c); } });
      for (let k = this.lootItems.length; k < Math.max(6, this.lootItems.length); k++) grid.appendChild(cell(null, { c: 'loot', i: k }));
      right.appendChild(grid);
      const all = el('button', 'primary', 'TAKE ALL'); all.onclick = () => this.takeAll(); right.appendChild(all);
      right.appendChild(el('div', 'label', 'CLICK TO TAKE'));
      this.inv.appendChild(right);
    }
    DnD.bind(this.inv, {
      onClick: (ref, s, e) => { if (ref.c === 'loot') this.take(ref.i); else if (this.lootItems && (e.shiftKey)) this.putToLoot(ref); },
      onRight: (ref, s) => this.rightClick(ref, s),
      onDrop: (from, to, s) => this.drop(from, to),
      onDropOutside: (from, s) => { if (from.c !== 'loot') { const st = getSlot(lo, from); setSlot(lo, from, null); g.dropStack(st); g.audio?.play('ui_drop'); this.renderInv(); } },
    });
  }
  async take(i) { const s = this.lootItems?.[i]; if (!s) return; const ok = await this.g.takeItem(this.lootRef.kind, this.lootRef.ref, s); if (ok) this.lootItems.splice(this.lootItems.indexOf(s), 1); this.renderInv(); }
  async takeAll() { for (const s of [...(this.lootItems || [])]) { const ok = await this.g.takeItem(this.lootRef.kind, this.lootRef.ref, s); if (ok) this.lootItems.splice(this.lootItems.indexOf(s), 1); } this.renderInv(); }
  putToLoot(ref) {
    const lo = this.g.pc.lo, s = getSlot(lo, ref); if (!s) return;
    setSlot(lo, ref, null); this.g.session.put(this.lootRef.kind, this.lootRef.ref, s); this.lootItems.push(s); this.renderInv();
  }
  drop(from, to) {
    const g = this.g, lo = g.pc.lo;
    if (from.c === 'loot' && to.c !== 'loot') { this.take(from.i); return; }
    if (from.c !== 'loot' && to.c === 'loot') { this.putToLoot(from); return; }
    if (from.c === 'loot') return;
    const okMove = moveSlot(lo, from, to, {}, g.pc.caps);
    if (okMove) {
      g.audio?.play('ui_equip');
      if (from.c === 'shield' || to.c === 'shield') g.session.setShield(lo.shield, lo.shield?.charge ?? 0);
      if (from.c === 'weapons' || to.c === 'weapons') { if (!lo.weapons[g.pc.slot]) g.pc.slot = lo.weapons.findIndex(w => w) < 0 ? 0 : lo.weapons.findIndex(w => w); g.pc.applyWeaponVisual(); }
      if (from.c === 'augment' || to.c === 'augment') g.pc.recalc();
    } else g.audio?.play('ui_error');
    this.renderInv();
  }
  rightClick(ref, s) {
    const g = this.g, lo = g.pc.lo, d = ITEMS[s.id];
    if (ref.c === 'loot') { this.take(ref.i); return; }
    if (this.lootItems) { this.putToLoot(ref); return; }
    if (ref.c === 'quick') { const i = ref.i; g.pc.startUse(i); this.closeInv(); return; }
    // quick-move: usable -> quick slot, weapon -> weapon slot, shield/augment -> equip, else nothing
    let to = null;
    if (QUICK_TYPES.has(d.type)) { const i = lo.quick.findIndex(q => !q || q.id === s.id); if (i >= 0) to = { c: 'quick', i }; }
    else if (d.type === 'weapon') { const i = lo.weapons.findIndex((w, k) => !w && k < g.pc.caps.weaponSlots); to = { c: 'weapons', i: i >= 0 ? i : g.pc.slot }; }
    else if (d.type === 'shield') to = { c: 'shield' };
    else if (d.type === 'augment') to = { c: 'augment' };
    else if (ref.c === 'backpack' && g.pc.caps.safe) { const i = lo.safe.findIndex(x => !x); if (i >= 0) to = { c: 'safe', i }; }
    else if (ref.c === 'safe') { const i = lo.backpack.findIndex(x => !x); if (i >= 0) to = { c: 'backpack', i }; }
    if (to) this.drop(ref, to);
  }

  // ------------------------------------------------------------------ map
  openMap() {
    this.mapEl = el('div', 'overlay');
    const p = el('div', 'panel col');
    p.appendChild(el('div', 'row', `<h2>${this.g.o.map.name.toUpperCase()}</h2><span class="label" style="margin-left:auto">[M] CLOSE  -  CLICK TO PING</span>`));
    const c = el('canvas'); this.mapCanvas = c;
    const W = this.g.world.w, H = this.g.world.h, s = Math.min((innerHeight * 0.8) / H, (innerWidth * 0.7) / W);
    c.width = Math.round(W * s); c.height = Math.round(H * s); c.style.imageRendering = 'auto';
    c.onclick = (e) => { const r = c.getBoundingClientRect(); this.g.session.ping((e.clientX - r.left) / s, (e.clientY - r.top) / s); };
    this.mapScale = s;
    p.appendChild(c); this.mapEl.appendChild(p); this.wrap.appendChild(this.mapEl);
    if (!this.mapImg) this.mapImg = this.renderMapImage();
    this.g.audio?.play('ui_open');
  }
  closeMap() { this.mapEl?.remove(); this.mapEl = null; this.g.audio?.play('ui_close'); }
  renderMapImage() {
    const w = this.g.world, S = 2, cw = Math.ceil(w.w / S), ch = Math.ceil(w.h / S);
    const c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const x = c.getContext('2d'), img = x.createImageData(cw, ch);
    const cols = TERRAIN.map(n => { const h = TERRAIN_COL[n] || '#555'; return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; });
    for (let z = 0; z < ch; z++) for (let xx = 0; xx < cw; xx++) {
      const wx = xx * S + 1, wz = z * S + 1;
      let [r, g, b] = cols[w.terrainAt(wx, wz)] || [80, 80, 80];
      const h = w.groundAt(wx, wz), hl = w.groundAt(wx - 2, wz - 2);
      const shade = Math.max(0.55, Math.min(1.35, 1 + (h - hl) * 0.25));
      const top = w.grid.topAt(wx, wz);
      if (top > h + 1.5) { r = 46; g = 44; b = 42; }
      if (w.grid.waterAt(wx, wz)) { r = 40; g = 80; b = 92; }
      const i = (z * cw + xx) * 4; img.data[i] = r * shade; img.data[i + 1] = g * shade; img.data[i + 2] = b * shade; img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.strokeStyle = '#9a9484'; x.lineWidth = 0.5;
    for (const bd of w.buildings) { x.fillStyle = '#3a3836'; x.fillRect(bd.x0 / S, bd.z0 / S, (bd.x1 - bd.x0) / S, (bd.z1 - bd.z0) / S); x.strokeRect(bd.x0 / S, bd.z0 / S, (bd.x1 - bd.x0) / S, (bd.z1 - bd.z0) / S); }
    return c;
  }
  drawMap() {
    const c = this.mapCanvas, x = c.getContext('2d'), s = this.mapScale, g = this.g;
    x.imageSmoothingEnabled = false;
    x.drawImage(this.mapImg, 0, 0, c.width, c.height);
    const upx = +getComputedStyle(document.documentElement).getPropertyValue('--px') || 2;
    x.font = `${8 * upx}px DRSmall, monospace`; x.textAlign = 'center';
    for (const p of g.world.pois) { x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillText(p.name.toUpperCase(), p.x * s + 1, p.z * s + 1); x.fillStyle = '#e8e0c8'; x.fillText(p.name.toUpperCase(), p.x * s, p.z * s); }
    for (const e of g.extractsData) { x.fillStyle = e.kind === 'hatch' ? '#f0c030' : '#68e088'; x.fillRect(e.x * s - 4, e.z * s - 4, 8, 8); x.fillText(e.name, e.x * s, e.z * s - 8); }
    for (const p of g.pings.values()) { x.strokeStyle = '#f0c030'; x.beginPath(); x.arc(p.x * s, p.z * s, 6, 0, 7); x.stroke(); }
    for (const e of g.ents.values()) {
      if (e.type !== 'raider' || e.bot || e.team !== g.myTeam) continue;
      const me = e.id === g.meId;
      x.save(); x.translate(e.x * s, e.z * s); x.rotate(-e.f + Math.PI);
      x.fillStyle = me ? '#f0c030' : '#30d0d0'; x.beginPath(); x.moveTo(0, -7); x.lineTo(5, 5); x.lineTo(-5, 5); x.closePath(); x.fill();
      x.restore();
    }
  }

  // ------------------------------------------------------------------ pause
  openPause() {
    const g = this.g;
    this.pause = el('div', 'overlay');
    const p = el('div', 'panel col'); p.style.minWidth = 'calc(var(--px) * 180px)';
    p.appendChild(el('h2', '', 'PAUSED'));
    p.appendChild(el('div', 'label', g.net ? 'THE RAID CONTINUES - SQUAD MODE' : 'SOLO - THE WORLD IS FROZEN'));
    const resume = el('button', 'primary', 'RESUME'); resume.onclick = () => this.closePause(); p.appendChild(resume);
    const vol = el('div', 'col');
    for (const [k, label] of [['master', 'MASTER'], ['music', 'MUSIC'], ['sfx', 'SFX']]) {
      const r = el('div', 'row', `<span class="label" style="width:calc(var(--px)*50px)">${label}</span>`);
      const s = el('input'); s.type = 'range'; s.min = 0; s.max = 1; s.step = 0.05; s.value = g.o.settings?.[k] ?? 0.8;
      s.oninput = () => { if (g.o.settings) g.o.settings[k] = +s.value; g.audio?.setVolumes?.({ [k]: +s.value }); };
      r.appendChild(s); vol.appendChild(r);
    }
    p.appendChild(vol);
    p.appendChild(el('div', 'label', 'WASD MOVE  SHIFT SPRINT  C CROUCH  SPACE ROLL  LMB FIRE  RMB AIM  R RELOAD  Q SWAP  E INTERACT  1-6 QUICK USE  G GRENADE  F FLASHLIGHT  TAB INVENTORY  M MAP  Z PING  H EMOTE  ENTER CHAT'));
    const ab = el('button', 'danger', 'ABANDON RAID (LOSE LOADOUT)');
    ab.onclick = () => { if (confirm('Abandon the raid? Your loadout (except the safe pocket) will be lost.')) { this.closePause(); g.onLocalDeath(); } };
    p.appendChild(ab);
    this.pause.appendChild(p); this.wrap.appendChild(this.pause);
    if (!g.net) g.paused = true;
  }
  closePause() { this.pause?.remove(); this.pause = null; this.g.paused = false; }
}
