// In-raid HUD drawn on a 2D overlay canvas in "game pixels" (same scale as the 3D view).
import { drawText, textWidth } from './pixelfont.js';
import { safeSides } from './settings.js';

export const UI = {
  cream: '#e8e0c8', dim: '#9a9484', dark: '#141416', panel: 'rgba(16,16,18,0.78)', line: '#3a3832',
  yellow: '#f0c030', red: '#e84a30', cyan: '#58c8f0', green: '#68e088', orange: '#f08a30',
  rarity: { common: '#a8a8a0', uncommon: '#5cc860', rare: '#3a98f0', epic: '#c058f0', legendary: '#f0b828' },
};

export class HUD {
  constructor(canvas) {
    this.c = canvas; this.x = canvas.getContext('2d');
    this.s = 3; this.t = 0;
    this.icons = null; // set externally: (ctx, id, x, y, size) => void
    // touch layout: null, or { freeL, freeR } = CSS px span of the bottom edge left free by the
    // on-screen controls; player status moves to the left column, weapon + quick slots between the sticks
    this.touch = null;
    this.quickRects = [];   // HUD-pixel rects of the drawn quick slots (touch hit areas sit on them)
    this.leftY = 0;         // touch layout: next free y in the left column
  }
  // scale = CSS px per HUD pixel (UI scale setting; independent of the 3D render scale). The backing
  // store is in HUD pixels and displayed at exactly W*scale CSS px, so world anchors (css px / scale)
  // land on the same spot at any scale.
  resize(scale) {
    this.s = scale;
    const w = innerWidth, h = innerHeight;
    this.cssW = w; this.cssH = h;
    this.c.width = Math.ceil(w / scale); this.c.height = Math.ceil(h / scale);
    this.W = this.c.width; this.H = this.c.height;
    this.c.style.width = (this.W * scale) + 'px'; this.c.style.height = (this.H * scale) + 'px';
    this.x.imageSmoothingEnabled = false;
    // notch / rounded corners / home indicator (installed web app, viewport-fit=cover): panels keep out
    const ins = safeSides();
    this.safe = { l: Math.ceil(ins.l / scale), r: Math.ceil(ins.r / scale), t: Math.ceil(ins.t / scale), b: Math.ceil(ins.b / scale) };
  }
  panel(x, y, w, h, edge = UI.line) {
    const c = this.x;
    if (this.rects) this.rects.push({ x: x + (this.ox || 0), y: y + (this.oy || 0), w, h });
    c.fillStyle = UI.panel; c.fillRect(x, y, w, h);
    c.fillStyle = edge; c.fillRect(x, y, w, 1); c.fillRect(x, y + h - 1, w, 1); c.fillRect(x, y, 1, h); c.fillRect(x + w - 1, y, 1, h);
  }
  bar(x, y, w, h, frac, col, back = '#2a2826', segs = 0) {
    const c = this.x;
    c.fillStyle = back; c.fillRect(x, y, w, h);
    c.fillStyle = col; c.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), h);
    c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, frac))), 1);
    if (segs) { c.fillStyle = UI.dark; for (let i = 1; i < segs; i++) c.fillRect(x + Math.round(w * i / segs), y, 1, h); }
  }
  text(s, x, y, o = {}) { return drawText(this.x, s, x, y, { shadow: '#000', ...o }); }

  draw(st, dt = 0.016) {
    this.t += dt;
    const c = this.x, W = this.W, H = this.H;
    c.clearRect(0, 0, W, H);
    this.quickRects = [];
    if (st.offscreen) this.offscreen(st.offscreen);
    if (st.markers) this.markers(st.markers);
    // screen-anchored panels are laid out inside the safe area; world markers and the crosshair use
    // the full canvas
    const sa = this.safe || { l: 0, r: 0, t: 0, b: 0 };
    this.rects = []; this.ox = sa.l; this.oy = sa.t;
    c.save(); c.translate(sa.l, sa.t); this.W = W - sa.l - sa.r; this.H = H - sa.t - sa.b;
    this.compass(st);
    this.raidInfo(st);
    this.player(st);
    this.weapon(st);
    if (this.touch) this.where(st);
    if (st.team) this.team(st.team);
    if (st.objectives) this.objectives(st.objectives);
    if (st.feed) this.feed(st.feed);
    if (st.prompt) this.prompt(st.prompt);
    if (st.chat) this.chat(st.chat);
    c.restore(); this.W = W; this.H = H; this.ox = this.oy = 0;
    for (const q of this.quickRects) { q.x += sa.l; q.y += sa.t; }
    if (st.edge && st.edge.length) {
      const avoid = [...this.rects, ...this.quickRects, ...(st.avoid || []).map(r => ({ x: r.x / this.s, y: r.y / this.s, w: r.w / this.s, h: r.h / this.s }))];
      this.edges(st.edge, st.edgeOrigin || { x: W * this.s / 2, y: H * this.s / 2 }, avoid);
    }
    this.rects = null;
    if (st.crosshair) this.crosshair(st.crosshair);
    if (st.banner) this.banner(st.banner);
  }

  compass(st) {
    const c = this.x, W = this.W, cw = 180, x0 = Math.round(W / 2 - cw / 2), y0 = 4;
    this.panel(x0, y0, cw, 14);
    const heading = st.heading || 0; // radians, 0 = north
    const labels = [['N', 0], ['NE', 45], ['E', 90], ['SE', 135], ['S', 180], ['SW', 225], ['W', 270], ['NW', 315]];
    const deg = heading * 180 / Math.PI;
    c.save(); c.beginPath(); c.rect(x0 + 1, y0, cw - 2, 14); c.clip();
    for (let d = -180; d <= 540; d += 15) {
      let rel = d - deg; rel = ((rel + 540) % 360) - 180;
      const px = Math.round(W / 2 + rel * 1.1);
      if (px < x0 || px > x0 + cw) continue;
      const lab = labels.find(l => l[1] === ((d % 360) + 360) % 360);
      if (lab) this.text(lab[0], px, y0 + 3, { align: 'center', color: lab[0] === 'N' ? UI.yellow : UI.cream });
      else { c.fillStyle = UI.dim; c.fillRect(px, y0 + 9, 1, 3); }
    }
    for (const m of st.compassMarks || []) {
      let rel = m.bearing * 180 / Math.PI - deg; rel = ((rel + 540) % 360) - 180;
      const px = Math.round(W / 2 + rel * 1.1);
      if (px < x0 + 2 || px > x0 + cw - 2) continue;
      c.fillStyle = m.color; c.fillRect(px - 1, y0 + 1, 3, 2); c.fillRect(px, y0 + 3, 1, 1);
    }
    c.restore();
    c.fillStyle = UI.yellow; c.fillRect(Math.round(W / 2), y0 + 14, 1, 3);
  }

  raidInfo(st) {
    const r = st.raid; if (!r) return;
    this.panel(4, 4, 112, 34);
    this.text(r.map.toUpperCase(), 9, 8, { color: UI.cream });
    const m = Math.floor(r.time / 60), s = Math.floor(r.time % 60);
    const tcol = r.time < 120 ? (Math.floor(this.t * 2) % 2 ? UI.red : UI.cream) : UI.yellow;
    this.text(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, 111, 8, { color: tcol, align: 'right' });
    this.text(r.condition || '', 9, 18, { color: UI.dim });
    this.text(r.weather || '', 9, 27, { color: UI.dim });
    if (r.where && !this.touch) { this.panel(4, 40, Math.max(112, textWidth(r.where) + 12), 13); this.text(r.where, 9, 43, { color: UI.yellow }); }
    this.leftY = 40;
  }
  // touch layout: floor / rooftop label under the player panel
  where(st) {
    const r = st.raid; if (!r?.where) return;
    this.panel(4, this.leftY, Math.max(112, textWidth(r.where) + 12), 13); this.text(r.where, 9, this.leftY + 3, { color: UI.yellow });
    this.leftY += 15;
  }

  player(st) {
    const p = st.player; if (!p) return;
    const x = this.touch ? 4 : 6, y = this.touch ? this.leftY : this.H - 44;
    if (this.touch) this.leftY += 40;
    this.panel(x, y, 128, 38);
    this.text(p.name.slice(0, 12).toUpperCase(), x + 5, y + 4, { color: UI.cream });
    if (p.level) this.text('LV' + p.level, x + 123, y + 4, { color: UI.yellow, align: 'right' });
    this.bar(x + 5, y + 14, 118, 4, p.shield / Math.max(1, p.shieldMax), UI.cyan, '#1c2a30', p.shieldMax ? Math.max(1, Math.round(p.shieldMax / 20)) : 0);
    const hcol = p.hp / p.hpMax < 0.3 ? (Math.floor(this.t * 3) % 2 ? UI.red : '#a83020') : UI.cream;
    this.bar(x + 5, y + 20, 118, 6, p.hp / p.hpMax, hcol, '#2a1a18');
    this.bar(x + 5, y + 28, 118, 2, p.stamina, UI.yellow, '#2a2618');
    this.text(String(Math.ceil(p.hp)) + ' HP', x + 5, y + 31, { color: p.hp / p.hpMax < 0.3 ? UI.red : UI.dim, font: 'small' });
    if (p.weight != null) this.text(`${p.weight.toFixed(1)}/${p.weightMax}KG`, x + 123, y + 31, { color: p.weight > p.weightMax ? UI.red : UI.dim, align: 'right', font: 'small' });
  }

  team(team) {
    let y = this.touch ? this.leftY : this.H - 52 - team.length * 16;
    if (this.touch) this.leftY += team.length * 16;
    for (const m of team) {
      this.panel(6, y, 92, 14);
      this.x.fillStyle = m.color; this.x.fillRect(7, y + 1, 2, 12);
      this.text(m.name, 12, y + 2, { color: m.downed ? UI.red : UI.cream });
      this.bar(12, y + 10, 82, 2, m.hp, m.downed ? UI.red : UI.cream);
      if (m.downed) this.text('DOWN', 94, y + 2, { color: UI.red, align: 'right' });
      y += 16;
    }
  }

  weapon(st) {
    const w = st.weapon; if (!w) return;
    const c = this.x, W = this.W, H = this.H;
    let x = W - 140, y = H - 44;
    const qs = st.quick || [], qw = qs.length * 34 - 2;
    if (this.touch) {
      // between the two sticks, centred on the free span (clamped to the screen)
      const cx = ((this.touch.freeL + this.touch.freeR) / 2) / this.s, half = Math.max(67, qw / 2);
      x = Math.round(Math.max(half + 2, Math.min(W - half - 2, cx)) - 67);
    }
    this.panel(x, y, 134, 38);
    c.fillStyle = UI.rarity[w.rarity] || UI.cream; c.fillRect(x + 1, y + 1, 2, 36);
    this.text(w.name.toUpperCase(), x + 7, y + 4, { color: UI.cream });
    this.text(w.tier || '', x + 129, y + 4, { color: UI.rarity[w.rarity], align: 'right' });
    this.text(String(w.mag), x + 7, y + 15, { font: 'big', color: w.mag === 0 ? UI.red : UI.cream });
    this.text('/ ' + w.reserve, x + 9 + textWidth(String(w.mag), 'big'), y + 20, { color: UI.dim });
    this.text(w.mode || 'AUTO', x + 129, y + 22, { color: UI.dim, align: 'right' });
    if (w.alt) this.text((this.touch ? '' : `[${st.swapKey || 'Q'}] `) + w.alt, x + 7, y + 30, { color: UI.dim });
    // quick use slots: right-aligned over the weapon panel (centred over it with touch controls)
    const q0 = this.touch ? Math.round(x + 67 - qw / 2) : Math.min(x, W - 6 - qw);
    qs.forEach((q, i) => {
      const qx = q0 + i * 34, qy = y - 30;
      this.panel(qx, qy, 32, 26, q.active ? UI.yellow : UI.line);
      if (q.item && this.itemIcons) this.itemIcons(c, q.item, qx + 8, qy + 3, 16);
      else if (q.icon && this.icons) this.icons(c, q.icon, qx + 8, qy + 3, 16);
      this.text(q.key || String(i + 1), qx + 3, qy + 2, { color: UI.dim });
      if (q.count != null) this.text('x' + q.count, qx + 29, qy + 18, { color: UI.cream, align: 'right' });
      this.quickRects.push({ x: qx, y: qy, w: 32, h: 26, empty: !q.item && !q.icon });
    });
  }

  objectives(list) {
    const W = this.W, x = this.touch ? 4 : W - 128, y = this.touch ? this.leftY + 2 : 22;
    if (this.touch) this.leftY += 14 + list.length * 10;
    this.panel(x, y, 122, 10 + list.length * 10);
    list.forEach((o, i) => {
      this.x.fillStyle = o.done ? UI.green : UI.dim; this.x.fillRect(x + 5, y + 7 + i * 10, 3, 3);
      this.text(o.text, x + 11, y + 4 + i * 10, { color: o.done ? UI.green : UI.cream });
    });
  }

  feed(list) {
    list.forEach((f, i) => {
      const a = Math.min(1, f.ttl);
      this.x.globalAlpha = a;
      this.text(f.text, this.W / 2, this.H * 0.22 + i * 10, { align: 'center', color: f.color || UI.cream });
      this.x.globalAlpha = 1;
    });
  }

  prompt(p) {
    const key = String(p.key ?? 'E'), kw = Math.max(11, textWidth(key) + 6);
    const w = textWidth(p.text) + kw + 15, x = Math.round(this.W / 2 - w / 2), y = Math.round(this.H * 0.64);
    this.panel(x, y, w, 15, UI.yellow);
    this.x.fillStyle = UI.yellow; this.x.fillRect(x + 3, y + 3, kw, 9);
    this.text(key, x + 3 + kw / 2, y + 4, { color: '#1a1a1a', align: 'center', shadow: null });
    this.text(p.text, x + kw + 8, y + 4, { color: UI.cream });
    if (p.progress != null) { this.x.fillStyle = UI.yellow; this.x.fillRect(x, y + 15, Math.round(w * p.progress), 2); }
  }

  chat(ch) {
    const lines = ch.lines.slice(-6), x = 6, y0 = this.touch ? this.leftY + 4 : this.H - 52 - (ch.teamCount || 0) * 16 - 10 - lines.length * 9;
    lines.forEach((l, i) => {
      const a = ch.open ? 1 : Math.max(0, Math.min(1, l.ttl));
      if (a <= 0) return;
      this.x.globalAlpha = a;
      const nw = this.text(l.from + ':', x, y0 + i * 9, { color: l.color || UI.yellow });
      this.text(l.text, x + nw + 4, y0 + i * 9, { color: UI.cream });
      this.x.globalAlpha = 1;
    });
    if (ch.open) {
      const y = y0 + lines.length * 9 + 1;
      this.panel(x - 2, y, 200, 11, UI.yellow);
      this.text('> ' + ch.input + (Math.floor(this.t * 2) % 2 ? '_' : ''), x + 1, y + 2, { color: UI.cream });
    }
  }

  crosshair(ch) {
    const c = this.x, x = Math.round(ch.x / this.s), y = Math.round(ch.y / this.s), g = Math.round(2 + ch.spread);
    if (ch.dim) c.globalAlpha = 0.45;
    c.fillStyle = '#000';
    c.fillRect(x - g - 4, y - 1, 5, 3); c.fillRect(x + g, y - 1, 5, 3); c.fillRect(x - 1, y - g - 4, 3, 5); c.fillRect(x - 1, y + g, 3, 5);
    c.fillStyle = ch.hit ? UI.red : UI.cream;
    c.fillRect(x - g - 3, y, 3, 1); c.fillRect(x + g + 1, y, 3, 1); c.fillRect(x, y - g - 3, 1, 3); c.fillRect(x, y + g + 1, 1, 3);
    c.fillRect(x, y, 1, 1);
    c.globalAlpha = 1;
  }

  // edge-of-screen warnings for nearby off-screen ARC (+ distance)
  offscreen(list) {
    const c = this.x, W = this.W, H = this.H, m = 10;
    for (const o of list) {
      // o.sx, o.sy in css px; clamp to screen edge
      const cx = (this.cssW || W * this.s) / this.s / 2, cy = (this.cssH || H * this.s) / this.s / 2;
      let dx = o.sx / this.s - cx, dy = o.sy / this.s - cy;
      const k = Math.min((cx - m) / Math.abs(dx || 1e-6), (cy - m) / Math.abs(dy || 1e-6));
      const ex = Math.round(cx + dx * k), ey = Math.round(cy + dy * k);
      const a = Math.atan2(dy, dx);
      const pulse = o.alert ? (Math.floor(this.t * 6) % 2 ? 1 : 0.5) : 0.85;
      c.globalAlpha = pulse;
      const col = o.alert ? UI.red : o.color || UI.orange;
      // chevron
      c.fillStyle = col;
      for (let i = 0; i < 5; i++) {
        const px = Math.round(ex - Math.cos(a) * i + Math.cos(a + Math.PI / 2) * (i)), py = Math.round(ey - Math.sin(a) * i + Math.sin(a + Math.PI / 2) * (i));
        const qx = Math.round(ex - Math.cos(a) * i - Math.cos(a + Math.PI / 2) * (i)), qy = Math.round(ey - Math.sin(a) * i - Math.sin(a + Math.PI / 2) * (i));
        c.fillRect(px - 1, py - 1, 2, 2); c.fillRect(qx - 1, qy - 1, 2, 2);
      }
      const lx = ex - Math.cos(a) * 14, ly = ey - Math.sin(a) * 14;
      this.text(o.label, lx, ly - 4, { align: 'center', color: col });
      c.globalAlpha = 1;
    }
  }

  // waypoints off screen: an arrow on the screen edge in the direction to walk from the raider, with the
  // name and distance just inside it (kept inside the safe area, below the compass)
  edges(list, o, avoid = []) {
    const c = this.x, s = this.s, sa = this.safe || { l: 0, r: 0, t: 0, b: 0 };
    const x0 = sa.l + 7, x1 = this.W - sa.r - 7, y0 = sa.t + 24, y1 = this.H - sa.b - 8;
    const ox = Math.min(x1 - 1, Math.max(x0 + 1, o.x / s)), oy = Math.min(y1 - 1, Math.max(y0 + 1, o.y / s));
    const hit = (b) => avoid.some(r => b.x < r.x + r.w && b.x + b.w > r.x && b.y < r.y + r.h && b.y + b.h > r.y);
    for (const w of list) {
      let dx = w.sx / s - ox, dy = w.sy / s - oy; const L = Math.hypot(dx, dy) || 1; dx /= L; dy /= L;
      const kx = dx > 1e-6 ? (x1 - ox) / dx : dx < -1e-6 ? (x0 - ox) / dx : Infinity, ky = dy > 1e-6 ? (y1 - oy) / dy : dy < -1e-6 ? (y0 - oy) / dy : Infinity;
      const k = Math.min(kx, ky), dist = `${Math.round(w.dist)}M`, tw = Math.max(textWidth(w.label), textWidth(dist));
      // lay out at distance t along the ray: arrow tip, then the label just inside it
      const at = (t) => {
        const ex = Math.round(ox + dx * t), ey = Math.round(oy + dy * t);
        const tx = Math.round(Math.max(x0 + tw / 2 + 1, Math.min(x1 - tw / 2 - 1, ex - dx * (tw / 2 + 10))));
        const ty = Math.round(Math.max(y0 - 2, Math.min(y1 - 16, ey - dy * 12 - 7)));
        return { ex, ey, tx, ty, boxes: [{ x: ex - 5, y: ey - 5, w: 11, h: 11 }, { x: tx - tw / 2 - 1, y: ty - 1, w: tw + 2, h: 17 }] };
      };
      // the screen edge, or as close to it as it can sit without covering a panel, a button or another
      // waypoint (never closer to the raider than about half way)
      let L0 = at(k);
      for (let t = k; t > k * 0.45; t -= 3) { const cand = at(t); if (!cand.boxes.some(hit)) { L0 = cand; break; } }
      avoid.push(...L0.boxes);
      c.fillStyle = '#000'; this.arrow(L0.ex + 1, L0.ey + 1, dx, dy); c.fillStyle = w.color; this.arrow(L0.ex, L0.ey, dx, dy);
      this.text(w.label, L0.tx, L0.ty, { align: 'center', color: w.color });
      this.text(dist, L0.tx, L0.ty + 8, { align: 'center', color: UI.cream });
    }
  }
  // pixel arrowhead with its tip at (x, y) pointing along the unit vector (dx, dy)
  arrow(x, y, dx, dy) {
    const c = this.x, px = -dy, py = dx;
    for (let i = 0; i <= 6; i++) { const h = Math.round(i * 0.7), bx = x - dx * i, by = y - dy * i; for (let j = -h; j <= h; j++) c.fillRect(Math.round(bx + px * j), Math.round(by + py * j), 1, 1); }
  }

  markers(list) {
    for (const mk of list) {
      const x = Math.round(mk.sx / this.s), y = Math.round(mk.sy / this.s);
      const c = this.x;
      c.fillStyle = mk.color; c.fillRect(x - 2, y - 2, 5, 5); c.fillStyle = '#000'; c.fillRect(x - 1, y - 1, 3, 3); c.fillStyle = mk.color; c.fillRect(x, y, 1, 1);
      this.text(mk.label, x, y - 12, { align: 'center', color: mk.color });
      if (mk.sub) this.text(mk.sub, x, y + 5, { align: 'center', color: UI.dim });
    }
  }

  banner(b) {
    const w = textWidth(b.text, 'big') + 30, x = Math.round(this.W / 2 - w / 2), y = Math.round(this.H * (b.y ?? 0.3));
    this.panel(x, y, w, 24, b.color || UI.yellow);
    this.text(b.text, this.W / 2, y + 6, { font: 'big', align: 'center', color: b.color || UI.yellow });
    if (b.sub) this.text(b.sub, this.W / 2, y + 28, { align: 'center', color: UI.cream });
  }
}
