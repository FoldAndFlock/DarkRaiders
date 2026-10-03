// Regenerate lobby map thumbnails: node tools/mapthumbs.mjs [baseUrl] [id,id,...]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';
const [,, base = 'http://localhost:8123'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage();
p.on('pageerror', e => console.log('[pageerror]', e.message));
await p.goto(base + '/tools/mapthumbs.html' + (process.argv[3] ? '?maps=' + process.argv[3] : ''));
await p.waitForFunction(() => window.__ready, null, { timeout: 300000 });
const t = await p.evaluate(() => window.__thumbs);
for (const [id, url] of Object.entries(t)) { writeFileSync(`assets/maps/${id}.png`, Buffer.from(url.split(',')[1], 'base64')); console.log('wrote', id); }
await b.close();
