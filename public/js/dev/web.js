// Web-Testversion (ohne Server): Startmenü → Sandkasten. Wird von tools/build-web.mjs verpackt.
// Liest die Auswahl aus dem Menü in index.html und startet runSandbox mit denselben Parametern
// wie ?sandbox&theme=…&seed=…&modules=…&stufe=…

import { input } from '../core/input.js';
import { settings } from '../core/settings.js';
import { isTouchDevice, attachTouchControls } from './touch.js';

const STORE = 'tiefer.web.v1';
const $ = (id) => document.getElementById(id);

function loadChoice() {
  try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch { return {}; }
}
function saveChoice(c) {
  try { localStorage.setItem(STORE, JSON.stringify(c)); } catch { /* privat */ }
}

// Schriften vorladen – die Texturen (Zifferblatt, Telegraf, Schilder) werden auf Canvas gezeichnet
async function loadFonts() {
  const faces = ['600 28px "Cormorant Garamond"', 'italic 600 28px "Cormorant Garamond"', '700 28px "Cormorant Garamond"',
    '400 28px "Cormorant Garamond"', '20px "Special Elite"', '40px "VT323"', '40px "Caveat"'];
  const timeout = new Promise((r) => setTimeout(r, 4000));
  await Promise.race([Promise.all(faces.map(f => document.fonts.load(f).catch(() => null))), timeout]);
}

function init() {
  const touch = isTouchDevice();
  document.body.classList.toggle('is-touch', touch);
  const c = loadChoice();
  if (c.theme) { const r = document.querySelector(`input[name="welt"][value="${c.theme}"]`); if (r) r.checked = true; }
  if (c.stufe) $('stufe').value = c.stufe;
  if (c.modules !== undefined) $('module').checked = c.modules;
  $('seed').value = c.seed || 3;
  $('wuerfeln').addEventListener('click', () => { $('seed').value = 1 + Math.floor(Math.random() * 999); });
  $('start-form').addEventListener('submit', (e) => { e.preventDefault(); start(touch); });
}

async function start(touch) {
  const theme = document.querySelector('input[name="welt"]:checked')?.value || 'dock';
  const stufe = $('stufe').value;
  const modules = $('module').checked;
  const seed = Math.max(1, Math.floor(Number($('seed').value) || 1));
  saveChoice({ theme, stufe, modules, seed });

  const btn = $('einsteigen');
  btn.disabled = true;
  btn.textContent = 'Kabine wird gebaut …';
  if (touch) settings.quality = 'retro';

  await loadFonts();
  const params = new URLSearchParams({ theme, seed: String(seed), stufe });
  if (modules) params.set('modules', 'all');

  input.dragLook = true;   // falls der Rahmen keine Mauserfassung erlaubt
  const { runSandbox } = await import('./sandbox.js');
  await runSandbox(params);

  $('menu').hidden = true;
  $('hud').hidden = false;
  $('hud-welt').textContent = document.querySelector(`input[name="welt"][value="${theme}"]`)?.dataset.name || theme;
  if (touch) {
    attachTouchControls($('web'), [
      { label: 'Lampe', code: 'KeyF' },
      { label: 'Tor', code: 'KeyO' },
      { label: 'Hebel −', code: 'BracketLeft' },
      { label: 'Hebel +', code: 'BracketRight' },
      { label: 'Glocke', code: 'KeyB' },
      { label: 'Flutlicht', code: 'KeyL' },
      { label: 'Ducken', code: 'KeyC' },
      { label: 'Kanone', code: 'KeyK' },
    ]);
  }
  $('hilfe-btn').addEventListener('click', () => { $('hilfe').hidden = !$('hilfe').hidden; });
  $('neu-btn').addEventListener('click', () => location.reload());
}

init();
