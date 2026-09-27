// Screenshots mit dem lokal installierten Chrome (echte Grafikkarte, unsichtbar).
//   node tools/test/shot-local.mjs "<query>" <präfix> '<views-json>' [ordner]
// views: [{ name, tp: [x, z, yaw, pitch], js: "code", wait: ms }]   ·   Bilder landen in shots/
// Beispiel: node tools/test/shot-local.mjs "sandbox&theme=dock&seed=3" dock '[{"name":"a","tp":[0,4,3.14,0]}]'
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const [,, query = 'sandbox&theme=dock&seed=3', prefix = 'shot', viewsJson = '[]', out = 'shots'] = process.argv;
fs.mkdirSync(out, { recursive: true });
const views = JSON.parse(viewsJson);
const browser = await chromium.launch({
  channel: 'chrome', headless: true,
  args: ['--ignore-gpu-blocklist', '--enable-gpu', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', m => { if (m.type() !== 'debug') logs.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(`http://localhost:${process.env.PORT || 3033}/?${query}`);
const probe = query.startsWith('sandbox') ? () => window.__sb : query.startsWith('viewer') ? () => window.__viewer : () => window.__tiefer?.game;
try { await page.waitForFunction(probe, null, { timeout: 60000 }); } catch (e) {
  console.log('TIMEOUT\n' + logs.join('\n'));
  await page.screenshot({ path: `${out}/${prefix}_timeout.png` });
  await browser.close();
  process.exit(1);
}
await page.waitForTimeout(1500);
for (const v of views.length ? views : [{ name: 'start' }]) {
  if (v.js) await page.evaluate(v.js);
  if (v.tp) await page.evaluate(([x, z, yaw, pitch]) => (window.__sb || window.__tiefer.game).player.teleport(x, z, yaw, pitch), v.tp);
  await page.waitForTimeout(v.wait ?? 1200);
  await page.screenshot({ path: `${out}/${prefix}_${v.name}.png` });
}
const gl = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl2'); const d = c && c.getExtension('WEBGL_debug_renderer_info'); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'unbekannt'; });
console.log('GPU:', gl);
console.log(logs.filter(l => !l.includes('pointer lock')).join('\n'));
await browser.close();
