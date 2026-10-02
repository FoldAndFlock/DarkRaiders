// DarkRaiders entry point: boot, profile, screen routing (title -> hub -> lobby -> raid -> results).
import { Input } from './game/input.js';
import { RaidGame } from './game/raid.js';
import { MAPS } from './maps/index.js';
import { load, save, newProfile } from './game/profile.js';
import { computeStats, augmentPerkMods } from './game/stats.js';
import { SKILL_TREE } from './data/skills.js';
import { ITEMS } from './game/items.js';

export const app = {
  input: new Input(),
  profile: null,
  audio: null,
  screen: null,
};
window.app = app;

async function loadAudio() {
  try { const m = await import('./audio/audio.js'); app.audio = m.audio || m.default || null; } catch (e) { console.warn('audio unavailable', e.message); app.audio = null; }
  // make every call safe even if a method is missing
  const a = app.audio;
  app.audioSafe = new Proxy({}, { get: (_, k) => (...args) => { try { return a?.[k]?.(...args); } catch (e) { return undefined; } } });
}

export function playerStats(p) {
  const st = computeStats(p.skills, SKILL_TREE);
  return st;
}

export async function startRaid({ mapId, seed, condition = null, time = null, weather = null, net = null, raidLen = 1800, objectives = null, onQuestEvent = null }) {
  const p = app.profile;
  const map = (await MAPS[mapId]()).default;
  const stats = playerStats(p);
  const aug = ITEMS[p.loadout.augment?.id]?.augment;
  const game = new RaidGame({
    canvas: document.getElementById('gl'), hudCanvas: document.getElementById('hud'),
    map, seed: seed ?? Math.floor(Math.random() * 1e9), condition, time, weather, raidLen,
    input: app.input, audio: app.audioSafe, profile: p, net,
    name: p.name, outfit: p.settings.outfit || 'scav', loadout: p.loadout, stats,
    regen: aug?.perk ? augmentPerkMods(aug.perk).regen : null,
    settings: p.settings, objectives, onQuestEvent,
  });
  app.game = game;
  return game.start((f, msg) => app.onLoadProgress?.(f, msg));
}

function uiScale() { document.documentElement.style.setProperty('--px', String(Math.max(1, Math.min(4, Math.round(innerHeight / 520))))); }
uiScale(); addEventListener('resize', uiScale);

async function boot() {
  await loadAudio();
  app.profile = load() || newProfile('Raider');
  const q = new URLSearchParams(location.search);
  const dev = q.get('raid');
  const startAudio = () => { try { app.audio?.init?.(); app.audio?.setVolumes?.(app.profile.settings); } catch (e) { /* */ } };
  addEventListener('pointerdown', startAudio, { once: true });
  addEventListener('keydown', startAudio, { once: true });
  if (dev) {
    // developer shortcut: straight into a raid with the current profile loadout
    const res = await startRaid({ mapId: dev, seed: +(q.get('seed') || 7), condition: q.get('cond'), time: q.get('time'), weather: q.get('weather'), raidLen: +(q.get('len') || 1800) });
    console.log('raid result', res?.outcome);
    return;
  }
  const { Screens } = await import('./ui/screens.js');
  app.screens = new Screens(app);
  app.screens.title();
}
app.save = () => save(app.profile);
boot().catch(e => { console.error(e); document.body.insertAdjacentHTML('beforeend', `<pre style="color:#e84a30;position:absolute;left:8px;top:8px;z-index:99">${e.stack || e}</pre>`); });
