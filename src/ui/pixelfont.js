// Crisp bitmap text rendering for canvas 2D (tinted glyph atlases, integer scaling).
import { FONT_DATA } from './fontdata.js';

const fonts = {};
function load(name) {
  if (fonts[name]) return fonts[name];
  const f = FONT_DATA[name];
  const glyphs = f.g.split(' ');
  const c = document.createElement('canvas');
  c.width = f.w * 95; c.height = f.h;
  const x = c.getContext('2d');
  const img = x.createImageData(c.width, c.height);
  glyphs.forEach((hex, gi) => {
    for (let r = 0; r < f.h; r++) {
      const bits = parseInt(hex.substr(r * 2, 2), 16);
      for (let b = 0; b < 8; b++) if (bits & (1 << b)) {
        const px = gi * f.w + b; if (b >= f.w) continue;
        const i = (r * c.width + px) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = img.data[i + 3] = 255;
      }
    }
  });
  x.putImageData(img, 0, 0);
  return fonts[name] = { ...f, atlas: c, tints: new Map() };
}
function tinted(f, color) {
  let t = f.tints.get(color);
  if (t) return t;
  t = document.createElement('canvas'); t.width = f.atlas.width; t.height = f.atlas.height;
  const x = t.getContext('2d');
  x.drawImage(f.atlas, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, t.width, t.height);
  f.tints.set(color, t); return t;
}

export function textWidth(str, font = 'small', scale = 1, spacing = 0) {
  const f = load(font); return str.length * (f.w + spacing) * scale;
}
export function fontHeight(font = 'small', scale = 1) { return load(font).h * scale; }

// draw text; align: 'left'|'center'|'right'; shadow: colour for 1px drop shadow
export function drawText(ctx, str, x, y, { font = 'small', color = '#e8e0c8', scale = 1, align = 'left', shadow = null, spacing = 0 } = {}) {
  str = String(str);
  const f = load(font);
  const w = textWidth(str, font, scale, spacing);
  if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
  x = Math.round(x); y = Math.round(y);
  const prev = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  const pass = (atlas, ox, oy) => {
    for (let i = 0; i < str.length; i++) {
      let c = str.charCodeAt(i) - 32; if (c < 0 || c > 94) c = 31; // '?'
      ctx.drawImage(atlas, c * f.w, 0, f.w, f.h, x + ox + i * (f.w + spacing) * scale, y + oy, f.w * scale, f.h * scale);
    }
  };
  if (shadow) pass(tinted(f, shadow), scale, scale);
  pass(tinted(f, color), 0, 0);
  ctx.imageSmoothingEnabled = prev;
  return w;
}

// word-wrap helper -> array of lines fitting maxW pixels
export function wrap(str, maxW, font = 'small', scale = 1) {
  const f = load(font), cpl = Math.max(1, Math.floor(maxW / (f.w * scale)));
  const out = [];
  for (const para of String(str).split('\n')) {
    let line = '';
    for (const word of para.split(' ')) {
      if ((line + (line ? ' ' : '') + word).length > cpl) { if (line) out.push(line); line = word; }
      else line += (line ? ' ' : '') + word;
    }
    out.push(line);
  }
  return out;
}
