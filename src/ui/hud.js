// In-raid HUD drawn on a 2D overlay canvas in "game pixels" (same scale as the 3D view).
import { drawText, textWidth } from './pixelfont.js';

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
  }
  resize(scale) {
    this.s = scale;
    const w = this.c.clientWidth || innerWidth, h = this.c.clientHeight || innerHeight;
    // backing store in game pixels; CSS scales it up crisp
    this.c.width = Math.ceil(w / scale); this.c.height = Math.ceil(h / scale);
    this.W = this.c.width; this.H = this.c.height;
  }
  panel(x, y, w, h, edge = UI.line) {
    const c = this.x;
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
    if (st.offscreen) this.offscreen(st.offscreen);
    if (st.markers) this.markers(st.markers);
    this.compass(st);
    this.raidInfo(st);
    this.player(st);
    this.weapon(st);
    if (st.team) this.team(st.team);
    if (st.objectives) this.objectives(st.objectives);
    if (st.feed) this.feed(st.feed);
    if (st.prompt) this.prompt(st.prompt);
    if (st.chat) this.chat(st.chat);
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
  }

  player(st) {
    const p = st.player; if (!p) return;
    const c = this.x, x = 6, y = this.H - 44;
    this.panel(x, y, 128, 38);
    this.text(p.name, x + 5, y + 4, { color: UI.cream });
    this.text(String(Math.ceil(p.hp)), x + 123, y + 4, { color: p.hp / p.hpMax < 0.3 ? UI.red : UI.cream, align: 'right' });
    if (p.level) this.text('LV' + p.level, x + 98, y + 4, { color: UI.yellow, align: 'right' });
    // shield segments
    this.bar(x + 5, y + 14, 118, 4, p.shield / Math.max(1, p.shieldMax), UI.cyan, '#1c2a30', p.shieldMax ? Math.max(1, Math.round(p.shieldMax / 20)) : 0);
    // health
    const hcol = p.hp / p.hpMax < 0.3 ? (Math.floor(this.t * 3) % 2 ? UI.red : '#a83020') : UI.cream;
    this.bar(x + 5, y + 20, 118, 6, p.hp / p.hpMax, hcol, '#2a1a18');

    // stamina
    this.bar(x + 5, y + 29, 118, 2, p.stamina, UI.yellow, '#2a2618');
    if (p.weight) this.text(`${p.weight.toFixed(1)}/${p.weightMax}KG`, x + 70, y + 4, { color: p.weight > p.weightMax ? UI.red : UI.dim, align: 'right' });
    void c;
  }

  team(team) {
    let y = this.H - 52 - team.length * 16;
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
    const c = this.x, W = this.W, H = this.H, x = W - 140, y = H - 44;
    this.panel(x, y, 134, 38);
    c.fillStyle = UI.rarity[w.rarity] || UI.cream; c.fillRect(x + 1, y + 1, 2, 36);
    this.text(w.name.toUpperCase(), x + 7, y + 4, { color: UI.cream });
    this.text(w.tier || '', x + 129, y + 4, { color: UI.rarity[w.rarity], align: 'right' });
    this.text(String(w.mag), x + 7, y + 15, { font: 'big', color: w.mag === 0 ? UI.red : UI.cream });
    this.text('/ ' + w.reserve, x + 9 + textWidth(String(w.mag), 'big'), y + 20, { color: UI.dim });
    this.text(w.mode || 'AUTO', x + 129, y + 22, { color: UI.dim, align: 'right' });
    if (w.alt) this.text('[Q] ' + w.alt, x + 7, y + 30, { color: UI.dim });
    // quick use slots
    const qs = st.quick || [];
    qs.forEach((q, i) => {
      const qx = W - 140 + i * 34, qy = y - 30;
      this.panel(qx, qy, 32, 26, q.active ? UI.yellow : UI.line);
      if (q.icon && this.icons) this.icons(c, q.icon, qx + 8, qy + 3, 16);
      this.text(String(i + 1), qx + 3, qy + 2, { color: UI.dim });
      if (q.count != null) this.text('x' + q.count, qx + 29, qy + 18, { color: UI.cream, align: 'right' });
    });
  }

  objectives(list) {
    const W = this.W, x = W - 128, y = 22;
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
    const w = textWidth(p.text) + 26, x = Math.round(this.W / 2 - w / 2), y = Math.round(this.H * 0.64);
    this.panel(x, y, w, 15, UI.yellow);
    this.x.fillStyle = UI.yellow; this.x.fillRect(x + 3, y + 3, 11, 9);
    this.text(p.key || 'E', x + 9, y + 4, { color: '#1a1a1a', align: 'center', shadow: null });
    this.text(p.text, x + 19, y + 4, { color: UI.cream });
    if (p.progress != null) { this.x.fillStyle = UI.yellow; this.x.fillRect(x, y + 15, Math.round(w * p.progress), 2); }
  }

  chat(ch) {
    const lines = ch.lines.slice(-6), x = 6, y0 = this.H - 52 - (ch.teamCount || 0) * 16 - 10 - lines.length * 9;
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
    c.fillStyle = '#000';
    c.fillRect(x - g - 4, y - 1, 5, 3); c.fillRect(x + g, y - 1, 5, 3); c.fillRect(x - 1, y - g - 4, 3, 5); c.fillRect(x - 1, y + g, 3, 5);
    c.fillStyle = ch.hit ? UI.red : UI.cream;
    c.fillRect(x - g - 3, y, 3, 1); c.fillRect(x + g + 1, y, 3, 1); c.fillRect(x, y - g - 3, 1, 3); c.fillRect(x, y + g + 1, 1, 3);
    c.fillRect(x, y, 1, 1);
  }

  // edge-of-screen warnings for nearby off-screen ARC (+ distance)
  offscreen(list) {
    const c = this.x, W = this.W, H = this.H, m = 10;
    for (const o of list) {
      // o.sx, o.sy in css px; clamp to screen edge
      const cx = W / 2, cy = H / 2;
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
