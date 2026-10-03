import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [,, url, out, w = '1920', h = '1080', wait = '__ready'] = process.argv;
const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +w, height: +h } });
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('[' + m.type() + ']', m.text().slice(0, 400)); });
p.on('pageerror', e => console.log('[pageerror]', e.message, e.stack?.slice(0, 600)));
const t0 = Date.now();
await p.goto(url);
try { await p.waitForFunction((k) => window[k], wait, { timeout: 120000, polling: 250 }); } catch (e) { console.log('timeout waiting', e.message); }
console.log('ready in', Date.now() - t0, 'ms');
await p.screenshot({ path: out });
await b.close();
