// Name check: every label a player can read in a raid uses the current names - no internal ids ("wazp",
// "bee_hive") and none of the old placeholder / original names. Loads each map, collects container labels
// (as the SEARCH prompt shows them), POI, extraction, building and key-room names and ARK names, kills one of
// every ARK to read its loot / husk labels, then checks them all.
//   node tools/namecheck.mjs [base url] [maps]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, base = 'http://localhost:8123/index.html', mapsArg = 'damn_grounds,sandy_city,green_gate'] = process.argv;
const OLD = ['Wazp', 'Hornett', 'Tikk', 'Popp', 'Fyreball', 'Fyrefly', 'Snytch', 'Spottr', 'Komet', 'Turrett', 'Sentinal', 'Surveyr', 'Shreddr', 'Rocketier', 'Vaporiser', 'Turbyne', 'Leapr', 'Bastian', 'Bombardeer', 'Queene', 'Matriark', 'Barron', 'Deforestr', 'Assessr',
  'Wasp', 'Hornet', 'Fireball', 'Firefly', 'Snitch', 'Spotter', 'Comet', 'Turret', 'Sentinel', 'Surveyor', 'Shredder', 'Rocketeer', 'Vaporizer', 'Turbine', 'Leaper', 'Bastion', 'Bombardier', 'Queen', 'Matriarch', 'Baron', 'Deforester', 'Harvester',
  'Speranzia', 'Speranza', 'Scrappie', 'Raider Hatch', 'Field Depot', 'First Wave', 'Exodos'];
const oldRe = new RegExp('\\b(' + OLD.join('|') + ')\\b', 'i');
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let bad = 0;
for (const map of mapsArg.split(',')) {
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${base}?raid=${map}&time=noon&weather=clear`);
  await p.waitForFunction('window.app && window.app.game && window.app.game.running', null, { timeout: 400000 });
  const names = await p.evaluate(async () => {
    const { containerLabel } = await import('./src/game/view.js');
    const { ARK } = await import('./src/data/arc.js');
    const g = window.app.game, sim = g.sim, W = g.world, out = [];
    const add = (where, s) => { if (s != null && s !== '') out.push([where, String(s)]); };
    for (const c of [...(W.containers || []), ...(g.containersData || [])]) add('container ' + c.kind, c.label || containerLabel(c.kind));
    for (const q of W.pois || []) if (!q.hideLabel) add('poi ' + q.id, q.name);
    for (const x of g.extractsData || W.extracts || []) add('extract ' + (x.id || x.i), x.name);
    for (const k of W.keyRooms || []) add('keyroom ' + k.id, k.name);
    for (const bl of W.buildings || []) add('building', bl.name);
    for (const e of sim.entities.values()) if (e.type === 'ark') add('ark ' + e.kind, ARK[e.kind]?.name || e.kind);
    // destroy one of every machine kind: its drop bag and (big walkers) its husk are labelled for the prompt
    g.running = false;
    const me = g.me, before = sim.containers.length;
    for (const kind of Object.keys(ARK)) {
      const e = sim.spawnArk(kind, me.x + 30, me.z + 30, {}); if (!e) continue;
      e.def = { ...e.def, loot: [['metal_parts', 1, 1, 1]] };
      sim.killArk(e, me);
    }
    for (const e of sim.entities.values()) if (e.type === 'loot') add('loot ' + e.kind, e.label);
    for (const c of sim.containers.slice(before)) add('husk ' + c.kind, c.label || containerLabel(c.kind));
    return out;
  });
  const uniq = new Map(); for (const [w, s] of names) if (!uniq.has(s)) uniq.set(s, w);
  const problems = [...uniq].filter(([s]) => oldRe.test(s) || /_/.test(s) || /^[a-z]+$/.test(s));
  console.log(`${map}: ${uniq.size} distinct labels, ${problems.length} problems`);
  for (const [s, w] of problems) console.log(`   ${w}: "${s}"`);
  if (errs.length) console.log('   page errors:', errs);
  bad += problems.length + errs.length;
  await p.close();
}
console.log(bad ? 'FAIL' : 'PASS');
await b.close();
process.exit(bad ? 1 : 0);
