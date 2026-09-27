// Prüfwerkzeug: meldet schwebende und ineinandersteckende Objekte im Hub oder in der Sandbox.
//   node tools/test/placecheck.mjs "<query>"
// Beispiele:
//   node tools/test/placecheck.mjs "skip"
//   node tools/test/placecheck.mjs "sandbox&theme=dock&seed=3"
// Öffnet die Seite headless (playwright-core, lokales Chrome, Software-WebGL – läuft auch ohne
// Grafikkarte), hängt &placecheck an (setzt globalThis.__placeDebug sehr früh, siehe main.js),
// wartet auf die Welt (Hub oder Sandkasten-Ebene) und ruft window.__placeCheck() auf.
import { chromium } from 'playwright-core';

const [, , queryArg = 'skip'] = process.argv;
const query = queryArg.split('&').includes('placecheck') ? queryArg : `${queryArg}&placecheck`;
const isSandbox = query.startsWith('sandbox');

const browser = await chromium.launch({
  channel: 'chrome',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

await page.goto(`http://localhost:${process.env.PORT || 3033}/?${query}`);

const probe = isSandbox ? () => window.__sb?.level : () => window.__tiefer?.game?.world;
try {
  await page.waitForFunction(probe, null, { timeout: 60000 });
} catch {
  console.log('TIMEOUT – Welt wurde nicht geladen.\n' + logs.join('\n'));
  await browser.close();
  process.exit(1);
}
await page.waitForTimeout(1500);

// Titel-Kulisse aus dem Weg räumen (falls Hauptspiel; die Sandbox kennt keinen Titel)
await page.evaluate(() => {
  try {
    const g = window.__tiefer?.game;
    if (g) g.titleMode = false;
    const t = document.getElementById('title');
    if (t) t.style.display = 'none';
  } catch { /* egal, rein kosmetisch */ }
});
await page.waitForTimeout(300);

const result = await page.evaluate(() => (
  typeof window.__placeCheck === 'function' ? window.__placeCheck() : { error: 'window.__placeCheck fehlt (ohne ?placecheck geladen?)' }
));

if (!result || result.error) {
  console.log('FEHLER: ' + (result?.error || 'keine Antwort von __placeCheck'));
  if (logs.length) console.log(logs.join('\n'));
  await browser.close();
  process.exit(1);
}

const { floating = [], overlapping = [], stats = {} } = result;
console.log(`Platzierungsprüfung – ?${query}`);
console.log(`Kandidaten: ${stats.kandidaten ?? '?'}  (aus Builder: ${stats.ausBuilder ?? '?'}, aus Szene: ${stats.ausSzene ?? '?'})`);
console.log('');
console.log(`SCHWEBEND – ${stats.schwebendGefunden ?? floating.length} gefunden${floating.length < (stats.schwebendGefunden ?? 0) ? `, zeige ${floating.length}` : ''}:`);
if (!floating.length) console.log('  – keine –');
for (const f of floating) console.log(`  ${f.label}  bei (${f.pos.join(', ')})  Größe ${f.size.join(' x ')} m`);
console.log('');
console.log(`INEINANDERSTECKEND – ${stats.ueberlappungenGefunden ?? overlapping.length} gefunden${overlapping.length < (stats.ueberlappungenGefunden ?? 0) ? `, zeige ${overlapping.length}` : ''}:`);
if (!overlapping.length) console.log('  – keine –');
for (const o of overlapping) console.log(`  ${o.a}  <->  ${o.b}  bei (${o.pos.join(', ')})  Überlappung ${Math.round(o.ratio * 100)}%`);

if (logs.length) { console.log('\nKonsole:'); console.log(logs.join('\n')); }
await browser.close();
