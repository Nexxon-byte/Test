// Seite im lokalen Chrome öffnen, JS auswerten, Ergebnis ausgeben (für Messungen/Tests).
//   node tools/test/eval.mjs "<query>" "<js-Ausdruck>" [wartezeit-ms]
import { chromium } from 'playwright-core';

const [,, query = 'sandbox&theme=dock&seed=3', js = '1', wait = '1500'] = process.argv;
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--ignore-gpu-blocklist', '--use-angle=d3d11', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', m => { if (m.type() === 'error') logs.push(`[error] ${m.text()}`); });
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(`http://localhost:${process.env.PORT || 3033}/?${query}`);
const probe = query.startsWith('sandbox') ? () => window.__sb : query.startsWith('viewer') ? () => window.__viewer : () => window.__tiefer?.game;
try { await page.waitForFunction(probe, null, { timeout: 60000 }); } catch { console.log('TIMEOUT\n' + logs.join('\n')); await browser.close(); process.exit(1); }
await page.waitForTimeout(Number(wait));
const r = await page.evaluate(js);
console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 1));
if (logs.length) console.log(logs.join('\n'));
await browser.close();
