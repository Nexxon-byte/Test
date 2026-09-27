// Headless-Screenshots mit Software-WebGL (Swiftshader, keine Grafikkarte nötig) – Sandkasten, Betrachter oder echtes Spiel.
// Voraussetzung: Server läuft (node server.js) und Playwright ist global installiert.
//   node tools/test/shot.mjs "sandbox&theme=dock&seed=3&modules=all" kabine '[{"name":"tuer","tp":[0,-1.7,3.14159,0.1]}]' [ausgabeordner]
//   node tools/test/shot.mjs "skip&night=ossuary&seed=7&monsters=passenger" nacht '[{"name":"a","js":"…","wait":2000}]'
// Pro Ansicht: tp = [x, z, yaw, pitch] für player.teleport; js = beliebiger Code vor dem Bild (Rückgabewert wird ausgegeben);
// wait = ms; shot:false = kein Bild (nur js). Umgebung: W/H = Fenstergröße, Q = Qualitätsstufe (retro).
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const { chromium } = require('playwright');
const [,, query = 'sandbox&theme=dock&seed=3', prefix = 'shot', viewsJson = '[]', out = 'shots'] = process.argv;
fs.mkdirSync(out, { recursive: true });
const views = JSON.parse(viewsJson);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: Number(process.env.W || 1280), height: Number(process.env.H || 720) } });
// Qualitätsstufe (Standard „retro“, damit Swiftshader flüssig genug bleibt): Q=standard|hoch
await page.addInitScript((q) => { try { const k = 'tiefer.settings.v1'; const s = JSON.parse(localStorage.getItem(k) || '{}'); s.quality = q; localStorage.setItem(k, JSON.stringify(s)); } catch { /* */ } }, process.env.Q || 'retro');
const logs = [];
page.on('console', m => { if (m.type() !== 'debug') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
page.on('response', r => { if (r.status() >= 400) logs.push(`[http ${r.status()}] ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
await page.goto(`http://localhost:${process.env.PORT || 3033}/?${query}`);
const probe = query.startsWith('sandbox') ? () => window.__sb : query.startsWith('viewer') ? () => window.__viewer
  : query.includes('night=') ? () => window.__tiefer?.game?.mode === 'night' : () => window.__tiefer?.game;
try { await page.waitForFunction(probe, null, { timeout: 120000 }); } catch {
  console.log('TIMEOUT\n' + logs.join('\n'));
  await page.screenshot({ path: `${out}/${prefix}_timeout.png` });
  await browser.close();
  process.exit(1);
}
await page.waitForTimeout(1500);
for (const v of views.length ? views : [{ name: 'start' }]) {
  if (v.tp) await page.evaluate(([x, z, yaw, pitch]) => (window.__sb || window.__tiefer.game).player.teleport(x, z, yaw, pitch), v.tp);
  if (v.js) {
    const r = await page.evaluate(v.js);
    if (r !== undefined) console.log(`${v.name}:`, typeof r === 'string' ? r : JSON.stringify(r));
  }
  await page.waitForTimeout(v.wait ?? 1200);
  if (v.shot !== false) await page.screenshot({ path: `${out}/${prefix}_${v.name}.png`, timeout: 180000 });
}
console.log(logs.filter(l => !/pointer ?lock|GPU stall|WebGL-|swiftshader/i.test(l)).join('\n'));
await browser.close();
