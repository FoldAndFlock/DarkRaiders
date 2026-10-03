// Screen router: title -> hub (Speranzia) -> lobby (solo / host / join) -> loading -> raid -> results.
import { el, cell, Tooltip } from './itemui.js';
import { MAP_LIST } from '../maps/index.js';
import { MAP_CONDITIONS, CONDITIONS } from '../data/conditions.js';
import { startRaid, playerStats } from '../main.js';
import { newProfile, save, stashPut, addXP, xpForLevel } from '../game/profile.js';
import { ITEMS, stackValue } from '../game/items.js';
import { allStacks, emptyLoadout, capacities, fitLoadout } from '../game/inventory.js';
import { Net } from '../net/net.js';
import { drawText } from './pixelfont.js';
import { settingsRows, syncProfile, touchEnabled, capPx } from './settings.js';

const TIPS = [
  'ARK vision cones are lit on the ground - stay out of the light, or break line of sight behind cover.',
  'Hornetts are armoured at the front. Flank them and shoot the rotors.',
  'A Bastian\'s rear canister exposes its core. Get behind it.',
  'Calling an elevator is loud. Every ARK nearby will come to see.',
  'Neutral raiders shout "DON\'T SHOOT!". Shoot first and their whole squad turns on you.',
  'Your safe pocket survives death. Put your best find in it.',
  'Crouching makes you harder to spot and quieter. Sprinting is loud.',
  'Dodge-roll to shake off a latched Tikk.',
  'Smoke grenades block ARK and raider vision alike.',
  'Bring blueprints home to learn them permanently at the Workshop.',
  'Night raids are darker for the ARK too - but your flashlight gives you away.',
  'Leapr cores are exposed for a moment after they land.',
];

export class Screens {
  constructor(app) {
    this.app = app; this.root = document.getElementById('ui');
    this.gl = document.getElementById('gl'); this.hudC = document.getElementById('hud');
    this.net = null;
  }
  clear() { Tooltip.hide(); this.stopBg(); this.root.innerHTML = ''; this.hub?.unmount?.(); this.hub = null; this.gl.style.visibility = 'hidden'; this.hudC.style.visibility = 'hidden'; }
  music(s) { this.app.audioSafe?.music(s); }
  sfx(n) { this.app.audioSafe?.play(n); }

  // ------------------------------------------------------------------ title
  title() {
    this.clear(); this.music('menu');
    const p = this.app.profile;
    const w = el('div', 'overlay title-screen'); w.style.background = 'none'; w.style.flexDirection = 'column';
    const bg = el('canvas'); bg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;image-rendering:pixelated;z-index:-1';
    w.appendChild(bg); this.startBg(bg);
    const logo = el('canvas'); logo.style.cssText = 'image-rendering:pixelated;width:min(80vw,1100px)'; this.drawLogo(logo); w.appendChild(logo);
    w.appendChild(el('div', 'label', 'A TOP-DOWN EXTRACTION ROGUELITE  -  ENLIST.  RAID.  EXTRACT.'));
    const box = el('div', 'col'); box.style.marginTop = 'calc(var(--px)*16px)'; box.style.minWidth = 'calc(var(--px)*150px)';
    const cont = el('button', 'primary', `CONTINUE  -  ${p.name.toUpperCase()}  LV${p.level}`); cont.onclick = () => { this.sfx('ui_click'); this.hubScreen(); };
    const nw = el('button', '', 'NEW RAIDER'); nw.onclick = () => this.newRaider();
    const join = el('button', '', 'JOIN A SQUAD'); join.onclick = () => { this.hubScreen(); this.lobby('join'); };
    const setB = el('button', '', 'SETTINGS'); setB.onclick = () => { this.sfx('ui_click'); this.titleSettings(w); };
    box.append(cont, nw, join, setB);
    w.appendChild(box);
    w.appendChild(el('div', 'label title-keys', touchEnabled() ? 'LEFT THUMB MOVE - RIGHT STICK AIM + FIRE - HOLD USE TO SEARCH - BAG / MAP AT THE TOP' : 'WASD MOVE - MOUSE AIM - LMB FIRE - RMB AIM - E INTERACT - TAB INVENTORY - M MAP'));
    this.root.appendChild(w);
    window.__ready = true;
  }
  // display settings straight from the title screen (UI scale, touch controls, fullscreen)
  titleSettings(w) {
    if (this.titleSet?.isConnected) { this.titleSet.remove(); this.titleSet = null; return; }
    const p = el('div', 'panel col title-set');
    p.appendChild(el('div', 'row', '<h2>SETTINGS</h2>'));
    p.appendChild(settingsRows({ sfx: (n) => this.sfx(n), onChange: () => { const k = w.querySelector('.title-keys'); if (k) k.textContent = touchEnabled() ? 'LEFT THUMB MOVE - RIGHT STICK AIM + FIRE - HOLD USE TO SEARCH - BAG / MAP AT THE TOP' : 'WASD MOVE - MOUSE AIM - LMB FIRE - RMB AIM - E INTERACT - TAB INVENTORY - M MAP'; } }));
    const done = el('button', 'primary', 'DONE'); done.onclick = () => { p.remove(); this.titleSet = null; this.sfx('ui_click'); };
    p.appendChild(done);
    w.appendChild(p); this.titleSet = p;
  }
  newRaider() {
    const name = prompt('Raider name?', 'Raider') || 'Raider';
    if (this.app.profile.level > 1 && !confirm('Start a new raider? Your current save will be replaced (export it first from the Raider tab if you want to keep it).')) return;
    this.app.profile = newProfile(name.slice(0, 16)); syncProfile(this.app.profile); save(this.app.profile); this.hubScreen();
  }
  drawLogo(c) {
    c.width = 360; c.height = 70; const x = c.getContext('2d');
    x.imageSmoothingEnabled = false;
    drawText(x, 'DARKRAIDERS', 180, 8, { font: 'big', scale: 3, color: '#f0c030', align: 'center', shadow: '#5a2a10', spacing: 1 });
    drawText(x, 'SURFACE  OPERATIONS', 180, 54, { font: 'small', scale: 1, color: '#e8e0c8', align: 'center', spacing: 2 });
  }
  startBg(c) {
    // parallax ruined skyline + drifting embers + slow ARK searchlights
    const ctx = c.getContext('2d'); let t = 0; this.bgOn = true;
    const resize = () => { c.width = Math.ceil(innerWidth / 4); c.height = Math.ceil(innerHeight / 4); };
    resize();
    const sky = (r) => { const s = []; let x = 0; while (x < 2000) { const w = 6 + Math.floor(r() * 18), h = 10 + Math.floor(r() * 60); s.push([x, w, h, r() < 0.3]); x += w + Math.floor(r() * 4); } return s; };
    let seed = 7; const r = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const L = [sky(r), sky(r), sky(r)];
    const embers = Array.from({ length: 60 }, () => [r() * 400, r() * 300, 0.2 + r() * 0.6]);
    const loop = () => {
      if (!this.bgOn) return;
      t += 1 / 60; const W = c.width, H = c.height;
      const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1a1426'); g.addColorStop(0.55, '#4a2a2a'); g.addColorStop(1, '#c8642a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#f0c070'; ctx.beginPath(); ctx.arc(W * 0.7, H * 0.62, H * 0.12, 0, 7); ctx.fill();
      L.forEach((layer, li) => {
        const sp = (li + 1) * 2.5, base = H * (0.72 + li * 0.1), col = ['#2a1e24', '#1c1418', '#0e0a0c'][li];
        ctx.fillStyle = col;
        for (const [x0, w, h, ant] of layer) {
          const x = ((x0 - t * sp) % 2000 + 2000) % 2000 - 100; if (x > W) continue;
          ctx.fillRect(x, base - h * (0.5 + li * 0.25), w, H);
          if (ant) ctx.fillRect(x + w / 2, base - h * (0.5 + li * 0.25) - 8, 1, 8);
          if (li === 1 && ((x0 * 7) | 0) % 5 === 0 && Math.sin(t * 2 + x0) > 0.6) { ctx.fillStyle = '#ff3a1a'; ctx.fillRect(x + w / 2, base - h * 0.75 - 9, 1, 1); ctx.fillStyle = col; }
        }
      });
      // sweeping ARK searchlight cones
      for (let i = 0; i < 2; i++) {
        const cx = W * (0.25 + i * 0.45) + Math.sin(t * 0.3 + i) * 20, cy = H * 0.3 + i * 10, a = Math.PI / 2 + Math.sin(t * 0.5 + i * 2) * 0.6;
        ctx.fillStyle = 'rgba(255,60,30,0.10)'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - 0.25) * H, cy + Math.sin(a - 0.25) * H); ctx.lineTo(cx + Math.cos(a + 0.25) * H, cy + Math.sin(a + 0.25) * H); ctx.fill();
        ctx.fillStyle = '#ff4a2a'; ctx.fillRect(cx - 1, cy - 1, 3, 2); ctx.fillStyle = '#3a3c42'; ctx.fillRect(cx - 4, cy - 2, 9, 1);
      }
      for (const e of embers) { e[1] -= e[2]; e[0] += Math.sin(t + e[1]) * 0.2; if (e[1] < 0) { e[1] = H; e[0] = Math.random() * W; } ctx.fillStyle = 'rgba(255,170,90,0.8)'; ctx.fillRect(e[0] | 0, e[1] | 0, 1, 1); }
      requestAnimationFrame(loop);
    };
    addEventListener('resize', resize);
    loop();
  }
  stopBg() { this.bgOn = false; }

  // ------------------------------------------------------------------ hub
  async hubScreen() {
    this.clear(); this.music('hub');
    try {
      const { Hub } = await import('./hub.js');
      this.hub = new Hub(this.app); this.hub.mount(this.root);
    } catch (e) {
      console.warn('hub unavailable, using fallback', e);
      const w = el('div', 'overlay'); const p = el('div', 'panel col');
      p.appendChild(el('h2', '', 'SPERANZIA')); p.appendChild(el('div', 'label', 'The hub is still being built.'));
      const b = el('button', 'primary', 'DEPLOY'); b.onclick = () => this.lobby(); p.appendChild(b);
      w.appendChild(p); this.root.appendChild(w);
    }
    window.__ready = true;
  }

  // ------------------------------------------------------------------ lobby / squad
  lobby(mode = null) {
    this.clear(); this.music('lobby');
    const app = this.app, p = app.profile;
    const w = el('div', 'overlay lobby pxscope'); w.style.alignItems = 'stretch'; w.style.padding = 'calc(var(--px)*12px)';
    const left = el('div', 'panel col lobby-l scroll'); left.style.flex = '1.2';
    const right = el('div', 'panel col lobby-r scroll'); right.style.flex = '1';
    // the two columns need ~540 x 280 units: cap the scale past that, stack them on narrow screens
    // (phones in landscape keep both columns side by side - stacked, the SQUAD panel sat below the screen)
    const fit = () => { const px = capPx(540, 280), W = this.root.clientWidth || innerWidth; w.style.setProperty('--px', String(px)); w.classList.toggle('lobby-narrow', W / px < 540 || innerHeight > innerWidth); };
    fit(); addEventListener('resize', fit); addEventListener('dr:uiscale', fit);
    const obs = new MutationObserver(() => { if (!w.isConnected) { removeEventListener('resize', fit); removeEventListener('dr:uiscale', fit); obs.disconnect(); } });
    obs.observe(this.root, { childList: true });
    w.append(left, right); this.root.appendChild(w);
    this.lobbyMap = this.lobbyMap || 'damn_grounds';
    const render = () => {
      const net = this.net;
      left.innerHTML = '';
      left.appendChild(el('div', 'row', `<h2>DEPLOYMENT</h2><span class="label" style="margin-left:auto">${net ? (net.isHost ? 'SQUAD HOST' : 'SQUAD MEMBER') : 'SOLO'}</span>`));
      // map cards
      const maps = el('div', 'col');
      for (const m of MAP_LIST) {
        const sel = this.lobbyMap === m.id;
        const card = el('div', 'panel row'); card.style.cursor = (!net || net.isHost) ? 'pointer' : 'default';
        card.style.borderColor = sel ? 'var(--yellow)' : 'var(--line)';
        const fc = this.forecast(m.id);
        card.innerHTML = `<div class="col" style="flex:1"><span class="bold" style="color:${sel ? 'var(--yellow)' : 'var(--cream)'}">${m.name.toUpperCase()}</span><span class="label">${m.desc}</span></div><div class="col" style="text-align:right"><span class="small ${fc.cond ? 'yellow' : 'dimc'}">${(fc.cond ? CONDITIONS[fc.cond]?.name || fc.cond : 'NORMAL CONDITIONS').toUpperCase()}</span><span class="label">${fc.time.toUpperCase()} - ${fc.weather.toUpperCase()}</span></div>`;
        card.onclick = () => { if (net && !net.isHost) return; this.lobbyMap = m.id; this.sfx('ui_click'); if (net) net.setMap(m.id); render(); };
        maps.appendChild(card);
      }
      left.appendChild(maps);
      // selected map: pre-rendered layout thumbnail (tools/mapthumbs.mjs) + today's conditions
      {
        const fc = this.forecast(this.lobbyMap), cd = fc.cond ? CONDITIONS[fc.cond] : CONDITIONS.normal;
        const pv = el('div', 'row'); pv.style.alignItems = 'flex-start'; pv.style.gap = 'calc(var(--px)*8px)';
        const img = el('img'); img.src = `assets/maps/${this.lobbyMap}.png`; img.alt = '';
        img.style.cssText = 'height:calc(var(--px)*150px);max-width:55%;image-rendering:pixelated;border:calc(var(--px)*1px) solid var(--line);background:#0c0c0c';
        img.onerror = () => { img.style.display = 'none'; };
        const info = el('div', 'col'); info.style.flex = '1';
        info.appendChild(el('div', 'label', 'TOPSIDE FORECAST'));
        info.appendChild(el('div', 'bold', `<span style="color:${cd?.color || 'var(--cream)'}">${(cd?.name || 'Calm Skies').toUpperCase()}</span>`));
        info.appendChild(el('div', '', cd?.desc || ''));
        for (const bl of cd?.bullets || []) info.appendChild(el('div', 'label', '- ' + bl));
        info.appendChild(el('div', 'label', `${fc.time.toUpperCase()} - ${fc.weather.toUpperCase()}`));
        info.appendChild(el('div', 'label', '<span class="green">&#9632;</span> LIFTS / METRO / AIRSHAFTS  <span class="yellow">&#9632;</span> RAIDER HATCHES (KEY)'));
        pv.append(img, info);
        left.appendChild(pv);
      }
      // loadout summary
      const lo = p.loadout, caps = capacities(lo, playerStats(p));
      const sum = el('div', 'col');
      sum.appendChild(el('div', 'label', 'YOUR LOADOUT'));
      const row = el('div', 'row');
      row.append(cell(lo.augment, { c: 'augment' }, { hint: 'AUG' }), cell(lo.shield, { c: 'shield' }, { hint: 'SHD' }));
      for (let i = 0; i < caps.weaponSlots; i++) row.append(cell(lo.weapons[i], { c: 'weapons', i }, { wide: true, hint: 'EMPTY' }));
      lo.quick.forEach((s, i) => row.append(cell(s, { c: 'quick', i })));
      sum.appendChild(row);
      const value = allStacks(lo).reduce((a, s) => a + stackValue(s), 0);
      sum.appendChild(el('div', 'label', `RISKING ${value} SCRIP  -  SAFE POCKET: ${lo.safe.filter(Boolean).map(s => ITEMS[s.id]?.name).join(', ') || 'EMPTY'}`));
      if (!lo.weapons.some(Boolean)) sum.appendChild(el('div', 'red', 'NO WEAPON EQUIPPED - get a Free Loadout in the hub or bring a gun.'));
      left.appendChild(sum);
      const btns = el('div', 'row'); btns.style.marginTop = 'auto';
      const back = el('button', '', '< SPERANZIA'); back.onclick = () => { this.hubScreen(); };
      btns.appendChild(back);
      if (!net) {
        const go = el('button', 'primary', 'DEPLOY SOLO'); go.onclick = () => this.launch({ mapId: this.lobbyMap, ...this.forecast(this.lobbyMap), seed: Math.floor(Math.random() * 1e9) });
        btns.appendChild(go);
      } else if (net.isHost) {
        const go = el('button', 'primary', 'START RAID'); const allReady = net.members.every(m => m.ready || m.pid === 'host');
        go.textContent = allReady ? 'START RAID' : 'START (NOT ALL READY)';
        go.onclick = () => { const fc = this.forecast(this.lobbyMap); net.startRaid({ mapId: this.lobbyMap, seed: Math.floor(Math.random() * 1e9), condition: fc.cond, time: fc.time, weather: fc.weather }); };
        btns.appendChild(go);
      } else {
        const me = net.members.find(m => m.slot === net.mySlot);
        const rd = el('button', me?.ready ? '' : 'primary', me?.ready ? 'NOT READY' : 'READY UP'); rd.onclick = () => net.setReady(!me?.ready);
        btns.appendChild(rd);
      }
      left.appendChild(btns);
      // right: squad
      right.innerHTML = '';
      right.appendChild(el('h2', '', 'SQUAD'));
      if (!net) {
        right.appendChild(el('div', 'label', 'RAID WITH UP TO 3 FRIENDS. THE HOST RUNS THE RAID IN THEIR BROWSER.'));
        const h = el('button', 'primary', 'HOST A SQUAD'); h.onclick = () => this.hostSquad(render);
        right.appendChild(h);
        const jr = el('div', 'row'); const inp = el('input'); inp.type = 'text'; inp.placeholder = 'INVITE CODE'; inp.maxLength = 6; inp.style.textTransform = 'uppercase';
        const j = el('button', '', 'JOIN'); j.onclick = () => this.joinSquad(inp.value, render);
        inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') j.onclick(); };
        jr.append(inp, j); right.appendChild(jr);
        if (mode === 'join') setTimeout(() => inp.focus(), 50);
        if (this.netError) right.appendChild(el('div', 'red', this.netError));
      } else {
        const code = el('div', 'row', `<span class="label">INVITE CODE</span><span class="bold yellow" style="font-size:calc(var(--fs-b)*2);letter-spacing:calc(var(--px)*3px)">${net.code}</span>`);
        const cp = el('button', '', 'COPY'); cp.onclick = () => { navigator.clipboard?.writeText(net.code); cp.textContent = 'COPIED'; }; code.appendChild(cp);
        right.appendChild(code);
        const COLS = ['#30d0d0', '#f0a030', '#e84a30', '#9a70ff'];
        for (const m of net.members) right.appendChild(el('div', 'panel row', `<span style="color:${COLS[m.slot % 4]}">&#9632;</span><span>${m.name.toUpperCase()}</span><span class="label">LV${m.level || 1}</span><span style="margin-left:auto" class="${m.ready || m.pid === 'host' ? 'green' : 'dimc'}">${m.pid === 'host' ? 'HOST' : m.ready ? 'READY' : 'NOT READY'}</span>`));
        for (let i = net.members.length; i < 4; i++) right.appendChild(el('div', 'panel label', 'OPEN SLOT'));
        // chat
        const log = el('div', 'panel col scroll'); log.style.height = 'calc(var(--px)*90px)'; log.style.justifyContent = 'flex-end';
        for (const c of (this.lobbyChat || []).slice(-12)) log.appendChild(el('div', '', `<span style="color:${COLS[(c.slot || 0) % 4]}">${c.from}:</span> ${escapeHtml(c.text)}`));
        right.appendChild(log);
        const cr = el('div', 'row'); const ci = el('input'); ci.type = 'text'; ci.placeholder = 'SAY SOMETHING'; ci.style.flex = '1'; ci.maxLength = 120;
        ci.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter' && ci.value.trim()) { net.chat(ci.value.trim()); ci.value = ''; } };
        cr.appendChild(ci); right.appendChild(cr);
        const lv = el('button', 'danger', 'LEAVE SQUAD'); lv.onclick = () => { net.leave(); this.net = null; render(); };
        right.appendChild(lv);
      }
    };
    this.renderLobby = render;
    render();
    window.__ready = true;
  }
  forecast(mapId) {
    // deterministic per map + "hour" so squad members see the same forecast
    this.fc = this.fc || {};
    if (!this.fc[mapId]) {
      const conds = MAP_CONDITIONS?.[mapId] || [];
      const r = Math.random();
      const cond = r < 0.45 ? null : conds[Math.floor(Math.random() * conds.length)] || null;
      const def = cond ? CONDITIONS[cond] : null;
      const times = ['dawn', 'noon', 'noon', 'dusk', 'night'];
      const time = def?.time || times[Math.floor(Math.random() * times.length)];
      const wpool = mapId === 'sandy_city' ? ['clear', 'clear', 'sandstorm', 'overcast'] : mapId === 'green_gate' ? ['clear', 'fog', 'rain', 'overcast'] : ['clear', 'rain', 'overcast', 'storm', 'fog'];
      const weather = def?.weather || wpool[Math.floor(Math.random() * wpool.length)];
      this.fc[mapId] = { cond: cond === 'normal' ? null : cond, time, weather };
    }
    return this.fc[mapId];
  }
  async hostSquad(render) {
    this.netError = null;
    try {
      const net = new Net(this.app, { local: new URLSearchParams(location.search).get('net') === 'local' });
      this.bindNet(net);
      await net.host(); this.net = net; net.setMap(this.lobbyMap);
    } catch (e) { this.netError = 'Could not host: ' + (e.message || e.type || e); this.net = null; }
    render();
  }
  async joinSquad(code, render) {
    this.netError = null;
    if (!code || code.length < 4) { this.netError = 'Enter the 5-letter invite code from your host.'; render(); return; }
    try {
      const net = new Net(this.app, { local: new URLSearchParams(location.search).get('net') === 'local' });
      this.bindNet(net);
      await net.join(code); this.net = net;
    } catch (e) { this.netError = 'Could not join: ' + (e.message || e.type || e); this.net = null; }
    render();
  }
  bindNet(net) {
    this.lobbyChat = [];
    net.on('lobby', (s) => { if (s.map) this.lobbyMap = s.map; if (!this.inRaid) this.renderLobby?.(); });
    net.on('chat', (m) => { this.lobbyChat.push(m); if (!this.inRaid) this.renderLobby?.(); });
    net.on('error', (e) => { this.netError = String(e.message || e.type || e); if (!this.inRaid) this.renderLobby?.(); });
    net.on('hostlost', () => { this.netError = 'Lost connection to the squad host.'; this.net = null; if (!this.inRaid) this.lobby(); });
    net.on('start', (opts) => this.launch({ ...opts, net }));
  }

  // ------------------------------------------------------------------ raid
  async launch(opts) {
    const app = this.app, p = app.profile;
    this.clear(); this.inRaid = true;
    const map = MAP_LIST.find(m => m.id === opts.mapId);
    const w = el('div', 'overlay'); w.style.flexDirection = 'column'; w.style.background = '#0a0a0c';
    w.appendChild(el('h1', 'yellow', (map?.name || opts.mapId).toUpperCase()));
    const cond = opts.condition ? CONDITIONS[opts.condition] : null;
    w.appendChild(el('div', 'label', `${cond ? cond.name.toUpperCase() + '  -  ' : ''}${(opts.time || 'noon').toUpperCase()}  ${(opts.weather || 'clear').toUpperCase()}`));
    const bar = el('div', 'bar'); bar.style.width = '40vw'; const fill = el('i'); fill.style.width = '0%'; bar.appendChild(fill); w.appendChild(bar);
    const msg = el('div', 'label', 'PREPARING DROP'); w.appendChild(msg);
    const tip = el('div', '', TIPS[Math.floor(Math.random() * TIPS.length)]); tip.style.maxWidth = '50vw'; tip.style.textAlign = 'center'; tip.style.marginTop = 'calc(var(--px)*20px)'; w.appendChild(tip);
    this.root.appendChild(w);
    app.onLoadProgress = (f, m) => { fill.style.width = Math.round(f * 100) + '%'; msg.textContent = m.toUpperCase(); if (f >= 1) setTimeout(() => w.remove(), 300); };
    this.gl.style.visibility = 'visible'; this.hudC.style.visibility = 'visible';
    // hand the loadout to the raid (a copy is kept so a crash can't eat the stash)
    p.stats.raids++;
    save(p);
    let quests = null; try { quests = await import('../game/quests.js'); } catch (e) { quests = null; }
    const shownBlocked = new Set();
    const res = await startRaid({
      mapId: opts.mapId, seed: opts.seed, condition: opts.condition, time: opts.time, weather: opts.weather, net: opts.net || null,
      objectives: quests ? () => quests.activeObjectives?.(p, opts.mapId) : null,
      onQuestEvent: quests ? (k, d) => {
        try {
          const n = quests.questEvent?.(p, k, d);
          for (const x of n || []) {
            // "need parts" hints repeat while standing in a POI: show each once per raid
            if (x.blocked) { const key = x.quest + ':' + x.step; if (shownBlocked.has(key)) continue; shownBlocked.add(key); }
            app.game?.feed?.(`QUEST: ${x.text || x.name || 'progress'}`, x.blocked ? '#c8b070' : '#f0c030');
            if (x.done && !x.blocked) app.audioSafe?.jingle?.('quest');
          }
        } catch (e) { console.warn(e); }
      } : null,
    });
    this.inRaid = false;
    this.results(res);
  }
  async results(res) {
    const app = this.app, p = app.profile;
    this.clear(); this.music(res.outcome === 'extracted' ? 'extracted' : 'death');
    // apply outcome to the profile
    const before = p.level;
    if (res.outcome === 'extracted') { p.stats.extracts++; p.loadout = res.loadout; }
    else {
      p.stats.deaths++;
      const safe = (res.loadout?.safe || []).filter(Boolean);
      p.loadout = emptyLoadout();
      fitLoadout(p.loadout, capacities(p.loadout, playerStats(p)));
      for (const s of safe) stashPut(p, s);
    }
    p.stats.arkKills += Object.values(res.stats?.arkKills || {}).reduce((a, b) => a + b, 0) || 0;
    p.stats.raiderKills += res.stats?.kills || 0;
    addXP(p, res.xp || 0);
    try { const c = await import('../game/crafting.js'); c.scrappieOnRaidEnd?.(p, res); } catch (e) { /* hub module not ready */ }
    save(p);
    const ex = res.outcome === 'extracted';
    const ov = el('div', 'overlay scroll-ov results'), w = el('div', 'col'); w.style.alignItems = 'center'; ov.appendChild(w);
    w.appendChild(el('h1', ex ? 'green' : 'red', ex ? 'EXTRACTED' : 'LOST TO THE SURFACE'));
    w.appendChild(el('div', 'label', ex ? 'YOU MADE IT BACK TO SPERANZIA' : 'EVERYTHING BUT YOUR SAFE POCKET STAYS TOPSIDE'));
    const panel = el('div', 'panel col'); panel.style.minWidth = 'min(40vw, 100%)'; panel.style.maxWidth = 'calc(100vw - var(--px) * 16px)';
    const st = res.stats || {};
    panel.appendChild(el('div', 'row', `<span class="label">XP EARNED</span><span class="yellow" style="margin-left:auto">+${res.xp || 0}</span>`));
    panel.appendChild(el('div', 'row', `<span class="label">LEVEL</span><span style="margin-left:auto">${before}${p.level > before ? ` -> <span class="yellow">${p.level}</span> (+${p.level - before} SKILL POINT${p.level - before > 1 ? 'S' : ''})` : ''}</span>`));
    panel.appendChild(el('div', 'row', `<span class="label">CONTAINERS SEARCHED</span><span style="margin-left:auto">${st.containers || 0}</span>`));
    panel.appendChild(el('div', 'row', `<span class="label">ITEMS LOOTED</span><span style="margin-left:auto">${st.looted || 0}</span>`));
    panel.appendChild(el('div', 'row', `<span class="label">RAIDERS ELIMINATED</span><span style="margin-left:auto">${st.kills || 0}</span>`));
    const xpBar = el('div', 'bar'); const xi = el('i'); xi.style.width = Math.round(100 * p.xp / xpForLevel(p.level)) + '%'; xi.style.background = 'var(--yellow)'; xpBar.appendChild(xi); panel.appendChild(xpBar);
    if (ex) {
      panel.appendChild(el('div', 'label', 'HAUL'));
      const grid = el('div', 'slots');
      const items = allStacks(p.loadout);
      for (const s of items) grid.appendChild(cell(s, { c: 'x' }));
      panel.appendChild(grid);
      const v = items.reduce((a, s) => a + stackValue(s), 0);
      p.stats.bestHaul = Math.max(p.stats.bestHaul || 0, v);
      panel.appendChild(el('div', 'row', `<span class="label">HAUL VALUE</span><span class="yellow" style="margin-left:auto">${v} SCRIP</span>`));
    }
    w.appendChild(panel);
    const b = el('button', 'primary', this.net ? 'RETURN TO SQUAD LOBBY' : 'RETURN TO SPERANZIA');
    b.onclick = () => { this.sfx('ui_click'); if (this.net) this.lobby(); else this.hubScreen(); };
    w.appendChild(b);
    this.root.appendChild(ov);
    window.__ready = true;
  }
}
function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
