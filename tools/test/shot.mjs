// Headless-Screenshots des Sandkastens (Software-WebGL, keine Grafikkarte nötig).
// Voraussetzung: Server läuft (node server.js) und Playwright ist global installiert.
//   node tools/test/shot.mjs "sandbox&theme=dock&seed=3&modules=all" kabine '[{"name":"tuer","tp":[0,-1.7,3.14159,0.1]}]' [ausgabeordner]
// tp = [x, z, yaw, pitch] für player.teleport; js = beliebiger Code vor dem Bild; wait = ms.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const require = createRequire(execSync('npm root -g').toString().trim() + '/');
const { chromium } = require('playwright');
const [,, query = 'sandbox&theme=dock&seed=3', prefix = 'shot', viewsJson = '[]', out = 'shots'] = process.argv;
fs.mkdirSync(out, { recursive: true });
const views = JSON.parse(viewsJson);
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(`http://localhost:${process.env.PORT || 3033}/?${query}`);
await page.waitForFunction(() => window.__sb, null, { timeout: 60000 });
await page.waitForTimeout(1500);
for (const v of views.length ? views : [{ name: 'start' }]) {
  if (v.js) await page.evaluate(v.js);
  if (v.tp) await page.evaluate(([x, z, yaw, pitch]) => window.__sb.player.teleport(x, z, yaw, pitch), v.tp);
  await page.waitForTimeout(v.wait ?? 1200);
  await page.screenshot({ path: `${out}/${prefix}_${v.name}.png` });
}
console.log(logs.join('\n'));
await browser.close();
