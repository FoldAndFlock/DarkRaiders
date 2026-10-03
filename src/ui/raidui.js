// In-raid DOM overlays: inventory (Tab), loot panel, map (M), pause (Esc), chat (Enter).
import { el, cell, DnD, Tooltip, RAR } from './itemui.js';
import { ITEMS, makeStack } from '../game/items.js';
import { capacities, fitLoadout, moveSlot, getSlot, setSlot, QUICK_TYPES } from '../game/inventory.js';
import { renderMapImage } from './mapimage.js';
import { RECIPES } from '../data/recipes.js';
import { countIn, takeFrom, pickUp as pickUpInto } from '../game/inventory.js';
import { settingsRows, touchEnabled } from './settings.js';

const sameRef = (a, b) => !!a && !!b && a.c === b.c && (a.i ?? null) === (b.i ?? null);
const closeBtn = (fn) => { const b = el('button', 'close-x', 'X'); b.setAttribute('aria-label', 'Close'); b.onclick = (e) => { e.stopPropagation(); fn(); }; return b; };


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
    // touch: tapping away from the on-screen keyboard closes the chat (no Escape key on a phone)
    inp.addEventListener('blur', () => { if (this.chatOpen && touchEnabled()) setTimeout(() => { if (this.chatOpen) this.closeChat(); }, 120); });
    if (game.profile && !game.profile.seenIntro) this.showIntro();
  }
  showIntro() {
    const p = el('div', 'panel col'); p.style.cssText = 'position:absolute;left:calc(var(--px)*8px);top:calc(var(--px)*64px);max-width:calc(var(--px)*190px);pointer-events:none';
    p.innerHTML = `<h2 class="yellow">FIRST DROP</h2>
      <div>Loot what you can, then <span class="green">EXTRACT</span> at an elevator, metro or Doggy Door before the timer runs out.</div>
      <div class="label">ARK GAZE: <span style="color:#c8dcff">WHITE</span> PATROLLING - <span class="yellow">YELLOW</span>/<span style="color:var(--orange)">ORANGE</span> SUSPICIOUS - <span class="red">RED</span> SPOTTED YOU, ATTACKING. STAY OUT OF THE LIGHT OR BREAK LINE OF SIGHT.</div>
      <div class="label">${touchEnabled() ? 'LEFT THUMB MOVES (PUSH PAST THE RING TO SPRINT) - RIGHT STICK AIMS, PAST HALFWAY FIRES - HOLD USE TO SEARCH - TAP THE QUICK SLOTS TO HEAL' : 'E SEARCH / INTERACT - TAB INVENTORY - M MAP - 1-6 QUICK USE - SPACE ROLL - C CROUCH - F FLASHLIGHT'}</div>
      <div class="label">DIE AND EVERYTHING EXCEPT YOUR SAFE POCKET GETS REPOSSESSED.</div>`;
    this.wrap.appendChild(p);
    const kill = () => { p.remove(); removeEventListener('keydown', kill); removeEventListener('pointerdown', kill); };
    setTimeout(() => { addEventListener('keydown', kill); addEventListener('pointerdown', kill); }, 1500); setTimeout(kill, 16000);
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
    // the search reveals items one by one; progress is kept per container, so closing and reopening it
    // carries on where it stopped instead of showing everything
    const key = it.kind + ':' + it.ref; this.searched = this.searched || new Map(); this.lootKey = key;
    const found = this.searched.get(key) ?? 0;
    if (found < items.length) {
      this.revealN = found; this.revealAt = performance.now();
      const step = 320 / (this.g.stats0?.search_reveal || 1);
      const tick = () => { if (this.lootRef !== it) return; this.revealN++; this.searched.set(key, this.revealN); this.g.audio?.play('ui_hover'); this.renderInv(); if (this.revealN < items.length) setTimeout(tick, step); else this.searched.set(key, 1e9); };
      setTimeout(tick, step);
    } else this.revealN = 1e9;
    this.openInv();
  }
  openInv() { if (!this.inv) { this.inv = el('div', 'overlay scroll-ov'); this.tsel = null; this.wrap.appendChild(this.inv); this.g.audio?.play('ui_open'); } this.renderInv(); }
  closeInv() { if (!this.inv) return; this.inv.remove(); this.inv = null; this.lootRef = null; this.lootItems = null; this.tsel = null; Tooltip.hide(); this.g.audio?.play('ui_close'); }
  renderInv() {
    const g = this.g, pc = g.pc, lo = pc.lo; pc.recalc();
    const caps = pc.caps;
    const over = fitLoadout(lo, caps); if (over.length) g.session.dropItems(over);
    this.inv.innerHTML = '';
    if (this.tsel && (this.tsel.c === 'loot' || !getSlot(lo, this.tsel))) this.tsel = null;
    const touch = touchEnabled();
    // panels sit side by side in one centred box; the overlay scrolls if the box is larger than the screen
    const box = el('div', 'row inv-box'); box.style.alignItems = 'flex-start'; box.style.gap = 'calc(var(--px) * 8px)';
    this.inv.appendChild(box);
    const left = el('div', 'panel col has-x inv-lo');
    left.appendChild(el('div', 'row', `<h2>LOADOUT</h2><span class="label" style="margin-left:auto">${pc.weight().toFixed(1)} / ${caps.weightLimit} KG</span>`));
    left.appendChild(closeBtn(() => this.closeInv()));
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
    if (touch && this.tsel) left.appendChild(this.selActions(this.tsel));
    else left.appendChild(el('div', 'label', touch ? 'TAP AN ITEM, THEN TAP A SLOT TO MOVE IT  -  HOLD TO DRAG  -  DRAG OFF THE PANEL: DROP' : 'DRAG TO MOVE  -  RIGHT CLICK: USE / QUICK-MOVE  -  DRAG OUTSIDE: DROP'));
    box.appendChild(left);
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
      box.appendChild(fc);
    }
    if (this.lootItems) {
      const right = el('div', 'panel col'); right.style.minWidth = 'calc(var(--cell) * 6)';
      right.appendChild(el('div', 'row', `<h2>${this.lootRef.label.replace(/^(SEARCH|OPEN|LOOT) /, '')}</h2>`));
      const grid = el('div', 'slots'); grid.style.maxWidth = 'calc(var(--cell) * 6 + var(--px) * 6px)';
      this.lootItems.forEach((s, i) => { if (i < (this.revealN ?? 1e9)) grid.appendChild(cell(s, { c: 'loot', i })); else { const c = cell(null, { c: 'loot-hidden', i }); c.innerHTML = '<span class="label">...</span>'; grid.appendChild(c); } });
      for (let k = this.lootItems.length; k < Math.max(6, this.lootItems.length); k++) grid.appendChild(cell(null, { c: 'loot', i: k }));
      right.appendChild(grid);
      const searching = (this.revealN ?? 1e9) < this.lootItems.length;   // nothing can be taken before it's been found
      const all = el('button', 'primary', searching ? 'SEARCHING...' : 'TAKE ALL'); all.disabled = searching; all.onclick = () => this.takeAll(); right.appendChild(all);
      right.appendChild(el('div', 'label', touch ? 'TAP TO TAKE' : 'CLICK TO TAKE'));
      box.appendChild(right);
    }
    if (this.tsel) this.inv.querySelectorAll('.cell').forEach(c => { if (sameRef(c._ref, this.tsel)) c.classList.add('tsel'); });
    if (!this.inv._dnd) {
      this.inv._dnd = true;
      DnD.bind(this.inv, {
        onClick: (ref, s, e) => {
          if (e.pointerType === 'touch') { this.tapCell(ref, s); return; }
          if (ref.c === 'loot') this.take(ref.i); else if (this.lootItems && (e.shiftKey)) this.putToLoot(ref);
        },
        onTapEmpty: (ref) => { if (this.tsel && ref.c !== 'loot-hidden') { const from = this.tsel; this.tsel = null; this.drop(from, ref); } },
        onHold: (ref, s) => { if (ref.c !== 'loot') { this.tsel = ref; this.renderInv(); this.tipFor(ref); } },
        onRight: (ref, s) => this.rightClick(ref, s),
        onDrop: (from, to, s) => { this.tsel = null; this.drop(from, to); },
        onDropOutside: (from, s) => this.dropToGround(from),
      });
    }
  }
  dropToGround(ref) {
    const g = this.g, lo = g.pc.lo;
    if (ref.c === 'loot') return;
    const st = getSlot(lo, ref); if (!st) return;
    setSlot(lo, ref, null); g.dropStack(st); g.audio?.play('ui_drop'); this.tsel = null; this.renderInv();
  }
  // touch: tap an item to select it (tooltip + actions), tap another slot to move / swap it there
  tapCell(ref, s) {
    if (ref.c === 'loot') { if (this.tsel) { const from = this.tsel; this.tsel = null; this.drop(from, ref); } else this.take(ref.i); return; }
    if (this.tsel && sameRef(this.tsel, ref)) { this.tsel = null; Tooltip.hide(); this.renderInv(); return; }
    if (this.tsel) { const from = this.tsel; this.tsel = null; this.drop(from, ref); return; }
    this.tsel = ref; this.g.audio?.play('ui_hover'); this.renderInv(); this.tipFor(ref);
  }
  tipFor(ref) { const n = [...(this.inv?.querySelectorAll('.cell') || [])].find(c => sameRef(c._ref, ref)); const s = getSlot(this.g.pc.lo, ref); if (n && s) Tooltip.showAt(s, n); }
  // action strip for the selected item (touch has no right click / drag-outside)
  selActions(ref) {
    const g = this.g, lo = g.pc.lo, s = getSlot(lo, ref), d = ITEMS[s?.id];
    const box = el('div', 'inv-acts');
    box.appendChild(el('div', 'label', `<span class="yellow">${(d?.name || '').toUpperCase()}</span>  -  TAP A SLOT TO MOVE IT`));
    let main = null;
    if (ref.c === 'quick' && !this.lootItems) main = 'USE';
    else if (this.lootItems) main = 'PUT IN CONTAINER';
    else if (QUICK_TYPES.has(d?.type) && ref.c !== 'quick') main = 'TO QUICK USE';
    else if (d?.type === 'weapon' && ref.c !== 'weapons') main = 'EQUIP';
    else if ((d?.type === 'shield' && ref.c !== 'shield') || (d?.type === 'augment' && ref.c !== 'augment')) main = 'EQUIP';
    else if (ref.c === 'backpack' && g.pc.caps.safe) main = 'TO SAFE POCKET';
    else if (ref.c === 'safe') main = 'TO BACKPACK';
    if (main) { const b = el('button', 'primary', main); b.onclick = () => { this.tsel = null; Tooltip.hide(); this.rightClick(ref, s); if (this.inv) this.renderInv(); }; box.appendChild(b); }
    const dr = el('button', 'danger', 'DROP'); dr.onclick = () => { Tooltip.hide(); this.dropToGround(ref); }; box.appendChild(dr);
    const cn = el('button', '', 'CANCEL'); cn.onclick = () => { this.tsel = null; Tooltip.hide(); this.renderInv(); }; box.appendChild(cn);
    return box;
  }
  // only items the search has revealed can be taken; taking one mid-search keeps the rest hidden (the reveal
  // count is by position, so it steps back with the list)
  revealedCount() { return Math.min(this.lootItems?.length || 0, this.revealN ?? 1e9); }
  takenAt(idx) { if (idx >= 0) { this.lootItems.splice(idx, 1); if (this.revealN != null && this.revealN < 1e9 && idx < this.revealN) { this.revealN--; this.searched?.set(this.lootKey, this.revealN); } } }
  async take(i) { const s = this.lootItems?.[i]; if (!s || i >= this.revealedCount()) return; const ok = await this.g.takeItem(this.lootRef.kind, this.lootRef.ref, s); if (ok) this.takenAt(this.lootItems.indexOf(s)); this.renderInv(); }
  async takeAll() {
    if (!this.lootItems || this.revealedCount() < this.lootItems.length) return;
    for (const s of [...this.lootItems]) { const ok = await this.g.takeItem(this.lootRef.kind, this.lootRef.ref, s); if (ok) this.takenAt(this.lootItems.indexOf(s)); }
    this.renderInv();
  }
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
    const p = el('div', 'panel col has-x');
    p.appendChild(el('div', 'row', `<h2>${this.g.o.map.name.toUpperCase()}</h2><span class="label" style="margin-left:auto">${touchEnabled() ? 'TAP TO PING' : '[M] CLOSE  -  CLICK TO PING'}</span>`));
    p.appendChild(closeBtn(() => this.closeMap()));
    const c = el('canvas'); this.mapCanvas = c;
    const upx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px')) || 1;
    const W = this.g.world.w, H = this.g.world.h, s = Math.min((innerHeight - upx * 44) / H, (innerWidth * 0.9 - upx * 16) / W);
    c.width = Math.round(W * s); c.height = Math.round(H * s); c.style.imageRendering = 'auto';
    c.onclick = (e) => { const r = c.getBoundingClientRect(); this.g.session.ping((e.clientX - r.left) / s, (e.clientY - r.top) / s); };
    this.mapScale = s;
    p.appendChild(c); this.mapEl.appendChild(p); this.wrap.appendChild(this.mapEl);
    if (!this.mapImg) this.mapImg = this.renderMapImage();
    this.g.audio?.play('ui_open');
  }
  closeMap() { this.mapEl?.remove(); this.mapEl = null; this.g.audio?.play('ui_close'); }
  renderMapImage() { return renderMapImage(this.g.world, 2); }

  drawMap() {
    const c = this.mapCanvas, x = c.getContext('2d'), s = this.mapScale, g = this.g;
    x.imageSmoothingEnabled = false;
    x.drawImage(this.mapImg, 0, 0, c.width, c.height);
    const upx = +getComputedStyle(document.documentElement).getPropertyValue('--px') || 2;
    x.font = `${8 * upx}px DRSmall, monospace`; x.textAlign = 'center';
    for (const p of g.world.pois) {
      // skip POI labels that sit on an extract (metro stations etc.) - the extract label already names it
      if (p.hideLabel || g.extractsData.some(e => Math.hypot(e.x - p.x, e.z - p.z) < 18)) continue;
      x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillText(p.name.toUpperCase(), p.x * s + 1, p.z * s + 1); x.fillStyle = '#e8e0c8'; x.fillText(p.name.toUpperCase(), p.x * s, p.z * s);
    }
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
    this.pause = el('div', 'overlay scroll-ov');
    const p = el('div', 'panel col has-x'); p.style.minWidth = 'min(calc(var(--px) * 180px), 96vw)'; p.style.maxWidth = 'calc(var(--px) * 300px)';
    p.appendChild(el('h2', '', 'PAUSED'));
    p.appendChild(closeBtn(() => this.closePause()));
    p.appendChild(el('div', 'label', g.net ? 'THE RAID CONTINUES - SQUAD MODE. THE ARK DO NOT PAUSE.' : 'SOLO - THE WORLD IS FROZEN. THE ARK ARE ON HOLD.'));
    const resume = el('button', 'primary', 'RESUME'); resume.onclick = () => this.closePause(); p.appendChild(resume);
    if (g.me && g.me.st !== 'dead' && g.me.st !== 'out') {   // safety net for spots a raider can't get out of
      const tow = el('button', '', "I'M STUCK - CALL A TOW"); tow.onclick = () => { this.closePause(); g.pc?.requestUnstuck?.(); }; p.appendChild(tow);
    }
    const vol = el('div', 'col');
    for (const [k, label] of [['master', 'MASTER'], ['music', 'MUSIC'], ['sfx', 'SFX']]) {
      const r = el('div', 'row', `<span class="label" style="width:calc(var(--px)*50px)">${label}</span>`);
      const s = el('input'); s.type = 'range'; s.min = 0; s.max = 1; s.step = 0.05; s.value = g.o.settings?.[k] ?? 0.8;
      s.oninput = () => { if (g.o.settings) g.o.settings[k] = +s.value; g.audio?.setVolumes?.({ [k]: +s.value }); };
      r.appendChild(s); vol.appendChild(r);
    }
    p.appendChild(vol);
    p.appendChild(settingsRows({ sfx: (n) => g.audio?.play(n), onChange: () => { if (g.o.settings) { /* persisted by settings.js */ } } }));
    const inp = g.o.input, mode = inp?.mode;
    let keys = 'WASD MOVE  SHIFT SPRINT  C CROUCH  SPACE ROLL  LMB FIRE  RMB AIM  R RELOAD  Q SWAP  E INTERACT  1-6 QUICK USE  G GRENADE  F FLASHLIGHT  TAB INVENTORY  M MAP  Z PING  H EMOTE  ENTER CHAT';
    try { if (inp?.controlsText) keys = inp.controlsText(mode === 'pad' ? 'pad' : 'kbm') || keys; } catch (e) { /* older input module */ }
    p.appendChild(el('div', 'label', touchEnabled() && mode !== 'pad' ? 'LEFT THUMB: MOVE (PUSH PAST THE RING TO SPRINT)  -  RIGHT STICK: AIM, PAST HALFWAY FIRES  -  FIRE / AIM / USE / RELOAD / ROLL / CROUCH / SWAP / THROW AROUND IT  -  TAP THE HUD QUICK SLOTS TO USE ITEMS' : keys));
    const ab = el('button', 'danger', 'ABANDON RAID (LOSE LOADOUT)');
    ab.onclick = () => { if (confirm('Abandon the raid? Your loadout (except the safe pocket) will be lost.')) { this.closePause(); g.onLocalDeath(); } };
    p.appendChild(ab);
    this.pause.appendChild(p); this.wrap.appendChild(this.pause);
    if (!g.net) g.paused = true;
  }
  closePause() { this.pause?.remove(); this.pause = null; this.g.paused = false; }
}
