// Pixel-art item icons defined as 16x16 character grids, rendered once to canvases.
const PAL = {
  '.': null, 'k': '#141414', 'K': '#2a2a2a', 'g': '#5a5a58', 'G': '#8a8a84', 'w': '#e8e0c8', 'W': '#ffffff',
  'r': '#a83020', 'R': '#e84a30', 'o': '#c86a20', 'O': '#f0a030', 'y': '#c8a020', 'Y': '#f0d040',
  'b': '#205a90', 'B': '#4aa0f0', 'c': '#30a0b0', 'C': '#70e0f0', 'e': '#2a6a2a', 'E': '#5cc860',
  'n': '#5a4026', 'N': '#8a6a3a', 'p': '#7a3aa0', 'P': '#c058f0', 's': '#b8a888', 'S': '#d8ccb0', 'm': '#46504e', 'M': '#7a8486',
};
export const ICONS = {
  bandage: [
    '................', '................', '....kkkkkkkk....', '...kwwwwwwwwk...', '..kwwswwswwswk..', '..kwwwwwwwwwwk..',
    '..kwwRRwwRRwwk..', '..kwRRRRRRRRwk..', '..kwRRRRRRRRwk..', '..kwwRRwwRRwwk..', '..kwwwwwwwwwwk..', '..kwwswwswwswk..',
    '...kwwwwwwwwk...', '....kkkkkkkk....', '................', '................'],
  shieldRecharger: [
    '................', '......kkkk......', '.....kCCCCk.....', '....kCBBBBCk....', '...kCBBWWBBCk...', '...kCBWBBWBCk...',
    '...kCBBWWBBCk...', '...kCBBBBBBCk...', '...kCBBWWBBCk...', '...kCBBBBBBCk...', '....kCBBBBCk....', '.....kCBBCk.....',
    '......kCCk......', '.......kk.......', '................', '................'],
  grenade: [
    '................', '.........kkk....', '........kGGGk...', '.......kGk.kk...', '......kkkk......', '.....kmmmmk.....',
    '....kmMmmmmk....', '...kmMmgmgmmk...', '...kmmmmmmmmk...', '...kmgmmgmmmk...', '...kmmmmmmgmk...', '...kmmgmmmmmk...',
    '....kmmmmmmk....', '.....kkkkkk.....', '................', '................'],
  adrenaline: [
    '................', '...........kk...', '..........kGk...', '.........kGk....', '........kYYk....', '.......kYOYk....',
    '......kYOYk.....', '.....kYOYk......', '....kYOYk.......', '...kwYYk........', '..kwwkk.........', '.kGwk...........',
    '.kGk............', '..k.............', '................', '................'],
  smoke: [
    '................', '.....GGG........', '...GGwwwGG......', '..GwwwwwwwG.GG..', '..GwwGGwwwGGwwG.', '...GGGGGGGGwwwG.',
    '.....kkkk..GGG..', '....kmmmmk......', '...kmMmmmmk.....', '...kmmmmmmk.....', '...kmmmmmmk.....', '...kmmmmmmk.....',
    '....kmmmmk......', '.....kkkk.......', '................', '................'],
  ammoLight: [
    '................', '................', '...kk.kk.kk.....', '..kYYkYYkYYk....', '..kYYkYYkYYk....', '..koOkoOkoOk....',
    '..koOkoOkoOk....', '..koOkoOkoOk....', '..koOkoOkoOk....', '..koOkoOkoOk....', '..kkkkkkkkkk....', '................',
    '................', '................', '................', '................'],
  metalParts: [
    '................', '................', '.....kkk........', '....kMMMk.kkk...', '....kMggk.kMMk..', '.kkkkMMk..kMgk..',
    'kMMMMMk...kMMk..', 'kMggggk....kk...', '.kkkkkk..kkkkk..', '........kMMMMMk.', '..kkk...kMgggMk.', '.kMMMk..kMMMMMk.',
    '.kMgMk...kkkkk..', '..kkk...........', '................', '................'],
  key: [
    '................', '................', '...kkkk.........', '..kYYYYk........', '.kYYkkYYk.......', '.kYk..kYk.......',
    '.kYYkkYYkkkkkkk.', '..kYYYYYYYYYYYk.', '...kkkkkkkkYkYk.', '...........kkk..', '................', '................',
    '................', '................', '................', '................'],
};
const cache = new Map();
function render(id) {
  const rows = ICONS[id]; if (!rows) return null;
  const c = document.createElement('canvas'); c.width = c.height = 16;
  const x = c.getContext('2d');
  rows.forEach((r, y) => { for (let i = 0; i < 16; i++) { const col = PAL[r[i]]; if (col) { x.fillStyle = col; x.fillRect(i, y, 1, 1); } } });
  return c;
}
export function drawIcon(ctx, id, x, y, size = 16) {
  if (!cache.has(id)) cache.set(id, render(id));
  const c = cache.get(id); if (!c) return;
  const prev = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(c, Math.round(x), Math.round(y), size, size);
  ctx.imageSmoothingEnabled = prev;
}
