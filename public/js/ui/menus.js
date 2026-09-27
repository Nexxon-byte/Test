// Menüs: Warnhinweis, Studio, Helligkeit, Titel, Einstellungen, Pause, Tod, Extras.

import { ui } from './ui.js';
import { settings, setSetting, saveSettings } from '../core/settings.js';
import { audio } from '../audio/audio.js';
import { escapeHtml } from '../audio/voice.js';
import { meta } from '../core/save.js';
import { QUOTES } from '../story/codex.js';

const host = () => ui.menus();

function screen(id, html, cls = 'screen active dim-bg interactive') {
  let s = document.getElementById(id);
  if (!s) { s = document.createElement('div'); s.id = id; host().appendChild(s); }
  s.className = cls;
  s.innerHTML = html;
  s.querySelectorAll('button').forEach(b => {
    b.addEventListener('mouseenter', () => audio.play('uiHover'));
    b.addEventListener('click', () => audio.play('uiSelect'));
  });
  return s;
}
function close(id) { document.getElementById(id)?.remove(); }

// ---------------------------------------------------------------- Warnhinweis
export function warning() {
  return new Promise((resolve) => {
    const s = document.getElementById('warning') || document.createElement('div');
    s.id = 'warning';
    s.className = 'active interactive';
    s.innerHTML = `<div class="box">
      <h2>HINWEIS</h2>
      <p>TIEFER enthält Dunkelheit, flackerndes Licht, plötzliche Schreckmomente und Themen wie Tod, Verlust und religiösen Wahn.</p>
      <p>Für das volle Erlebnis: <b>Kopfhörer</b>, ein dunkler Raum, und niemand, der dich stört.</p>
      <p style="font-size:17px;margin-top:22px">Flackern lässt sich in den Einstellungen abschwächen.</p>
      <div class="cta">— KLICKEN, UM ZU BEGINNEN —</div></div>`;
    host().appendChild(s);
    const go = () => { s.removeEventListener('click', go); window.removeEventListener('keydown', go); audio.init(); s.remove(); resolve(); };
    s.addEventListener('click', go);
    window.addEventListener('keydown', go);
  });
}

// ---------------------------------------------------------------- Studio-Ident
export function ident() {
  return new Promise((resolve) => {
    const s = document.createElement('div');
    s.id = 'ident';
    s.className = 'active';
    s.innerHTML = `<div class="studio">NACHTSCHICHT</div><div class="sub">PRÄSENTIERT</div>`;
    host().appendChild(s);
    audio.play('stinger', { kind: 'reveal', vol: 0.5 });
    const done = () => { s.remove(); resolve(); };
    const t = setTimeout(done, 4600);
    s.addEventListener('click', () => { clearTimeout(t); done(); });
  });
}

// ---------------------------------------------------------------- Helligkeit
export function calibration() {
  return new Promise((resolve) => {
    const sym = (a) => `<svg class="sym" viewBox="0 0 100 100"><path d="M15 70a35 35 0 0 1 70 0" fill="none" stroke="rgb(${a},${a},${a})" stroke-width="6"/><path d="M50 70 72 42" stroke="rgb(${a},${a},${a})" stroke-width="6" stroke-linecap="round"/><path d="M8 70h84" stroke="rgb(${a},${a},${a})" stroke-width="6"/></svg>`;
    const s = document.createElement('div');
    s.id = 'calibration';
    s.className = 'active interactive';
    s.innerHTML = `
      <h2 style="font-weight:300;letter-spacing:.4em;font-size:28px">HELLIGKEIT</h2>
      <div class="symbols"><div>${sym(9)}</div><div>${sym(22)}</div><div>${sym(60)}</div></div>
      <p>Stelle die Helligkeit so ein, dass das linke Zeichen <b>gerade eben nicht</b> mehr sichtbar ist und das mittlere <b>gerade noch</b>.</p>
      <div class="row slider-row" style="width:520px"><label>Helligkeit</label><div class="ctl"><input type="range" min="0.6" max="1.6" step="0.02" value="${settings.brightness}"><span class="v">${settings.brightness.toFixed(2)}</span></div></div>
      <div class="btn-row" style="justify-content:center"><button class="btn">BESTÄTIGEN</button></div>`;
    host().appendChild(s);
    const r = s.querySelector('input'), v = s.querySelector('.v'), symbols = s.querySelector('.symbols');
    const apply = () => { symbols.style.filter = `brightness(${Math.pow(Number(r.value), 1.6)})`; v.textContent = Number(r.value).toFixed(2); };
    r.addEventListener('input', apply);
    apply();
    s.querySelector('button').addEventListener('click', () => { setSetting('brightness', Number(r.value)); setSetting('calibrated', true); s.remove(); resolve(); });
  });
}

// ---------------------------------------------------------------- Titel
export function title({ canContinue, continueLabel = '' }) {
  return new Promise((resolve) => {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const s = screen('title', `
      <div class="logo"><h1>TIEFER</h1><div class="tag">Kabine 9 fährt nur noch abwärts.</div></div>
      <div class="menu">
        ${canContinue ? `<button class="menu-btn" data-a="continue">FORTSETZEN<small>${escapeHtml(continueLabel)}</small></button>` : ''}
        <button class="menu-btn" data-a="new">NEUES SPIEL</button>
        <button class="menu-btn" data-a="coop">KOOP · MEHRSPIELER</button>
        <button class="menu-btn" data-a="settings">EINSTELLUNGEN</button>
        <button class="menu-btn" data-a="extras">EXTRAS</button>
        ${window.tieferDesktop ? '<button class="menu-btn" data-a="quit">BEENDEN</button>' : ''}
      </div>
      <div class="quote">„${escapeHtml(q[0])}“<cite>${escapeHtml(q[1])}</cite></div>
      <div class="version">v1.0 · ${meta.runs > 0 ? 'NACHT ' + (46 + meta.runs) : 'NACHT 47'}</div>`, 'screen active interactive');
    s.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => resolve(b.dataset.a)));
  });
}
export function closeTitle() { close('title'); }

// ---------------------------------------------------------------- Name
export function askName() {
  return new Promise((resolve) => {
    const s = screen('namepanel', `<div class="panel">
      <h2>DEIN NAME</h2>
      <div class="sub">So steht es auf deinem Dienstauftrag. So steht es auf deiner Plakette.<br>Überleg dir gut, wem du ihn sagst.</div>
      <div class="row"><label>Name</label><div class="ctl"><input class="text-in" maxlength="14" value="${escapeHtml(settings.name || '')}" placeholder="z. B. Ada"></div></div>
      <div class="row"><label>Schwierigkeit</label><div class="ctl choice" data-k="difficulty">
        <button data-v="pilger">PILGER</button><button data-v="ratte" class="sel">SCHACHTRATTE</button><button data-v="erwaehlt">ERWÄHLT</button></div></div>
      <div class="hintline" id="diffhint">Die vorgesehene Erfahrung. Monster sind gefährlich, Ressourcen knapp.</div>
      <div class="err"></div>
      <div class="btn-row"><button class="btn ghost" data-a="back">ZURÜCK</button><button class="btn" data-a="ok">IN DIE NACHT</button></div></div>`);
    const input = s.querySelector('input');
    let diff = 'ratte';
    const hints = { pilger: 'Für die Geschichte. Monster sind langsamer, Ressourcen reichlicher, Checkpoints großzügig.', ratte: 'Die vorgesehene Erfahrung. Monster sind gefährlich, Ressourcen knapp.', erwaehlt: 'Für Kenner. Schnellere Monster, weniger Ressourcen, die Vermittlerin ist gieriger.' };
    s.querySelectorAll('.choice button').forEach(b => b.addEventListener('click', () => {
      s.querySelectorAll('.choice button').forEach(x => x.classList.remove('sel'));
      b.classList.add('sel'); diff = b.dataset.v; s.querySelector('#diffhint').textContent = hints[diff];
    }));
    setTimeout(() => input.focus(), 50);
    const ok = () => {
      const n = input.value.replace(/[^\p{L}\p{N} \-']/gu, '').trim();
      if (n.length < 2) { s.querySelector('.err').textContent = 'Jeder hat einen Namen. Auch du.'; return; }
      setSetting('name', n);
      close('namepanel');
      resolve({ name: n, difficulty: diff });
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); e.stopPropagation(); });
    s.querySelector('[data-a=ok]').addEventListener('click', ok);
    s.querySelector('[data-a=back]').addEventListener('click', () => { close('namepanel'); resolve(null); });
  });
}

// ---------------------------------------------------------------- Einstellungen
export function settingsPanel({ onChange } = {}) {
  return new Promise((resolve) => {
    const slider = (k, label, min, max, step, fmt = v => Math.round(v * 100) + ' %') => `
      <div class="row"><label>${label}</label><div class="ctl"><input type="range" data-k="${k}" min="${min}" max="${max}" step="${step}" value="${settings[k]}"><span data-v="${k}">${fmt(settings[k])}</span></div></div>`;
    const toggle = (k, label) => `<div class="row"><label>${label}</label><div class="ctl"><button class="toggle ${settings[k] ? 'on' : ''}" data-t="${k}">${settings[k] ? 'AN' : 'AUS'}</button></div></div>`;
    const choice = (k, label, opts) => `<div class="row"><label>${label}</label><div class="ctl choice">${opts.map(([v, n]) => `<button data-c="${k}" data-v="${v}" class="${settings[k] === v ? 'sel' : ''}">${n}</button>`).join('')}</div></div>`;
    const fmts = { sensitivity: v => Number(v).toFixed(2), fov: v => Math.round(v) + '°', brightness: v => Number(v).toFixed(2) };
    const s = screen('settingspanel', `<div class="panel">
      <h2>EINSTELLUNGEN</h2>
      <h3>STEUERUNG</h3>
      ${slider('sensitivity', 'Mausempfindlichkeit', 0.2, 3, 0.05, fmts.sensitivity)}
      ${toggle('invertY', 'Maus Y invertieren')}
      ${toggle('crouchToggle', 'Ducken umschalten (statt halten)')}
      <h3>BILD</h3>
      ${choice('quality', 'Grafikstufe', [['retro', 'RETRO'], ['standard', 'STANDARD'], ['hoch', 'HOCH']])}
      ${slider('fov', 'Sichtfeld', 60, 95, 1, fmts.fov)}
      ${slider('brightness', 'Helligkeit', 0.6, 1.6, 0.02, fmts.brightness)}
      ${toggle('headBob', 'Kopfbewegung')}
      ${toggle('reduceFlashing', 'Flackern abschwächen')}
      <h3>TON</h3>
      ${slider('masterVolume', 'Gesamt', 0, 1, 0.01)}
      ${slider('musicVolume', 'Musik', 0, 1, 0.01)}
      ${slider('sfxVolume', 'Effekte', 0, 1, 0.01)}
      ${slider('voiceVolume', 'Stimmen', 0, 1, 0.01)}
      ${toggle('subtitles', 'Untertitel')}
      <h3>MIKROFON (OPTIONAL)</h3>
      ${toggle('micForListener', 'Der Hörer hört dein Mikrofon')}
      ${toggle('voiceChat', 'Sprachchat im Koop')}
      ${toggle('pushToTalk', 'Push-to-Talk (V)')}
      <div class="hintline">Das Mikrofon wird nur genutzt, wenn du es hier einschaltest. Nichts wird aufgezeichnet.</div>
      <div class="btn-row"><button class="btn" data-a="done">FERTIG</button></div></div>`);
    s.querySelectorAll('input[type=range]').forEach(r => r.addEventListener('input', () => {
      const k = r.dataset.k, v = Number(r.value);
      settings[k] = v;
      s.querySelector(`[data-v=${k}]`).textContent = (fmts[k] || (x => Math.round(x * 100) + ' %'))(v);
      saveSettings();
      onChange?.(k);
    }));
    s.querySelectorAll('[data-t]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.t;
      setSetting(k, !settings[k]);
      b.classList.toggle('on', settings[k]); b.textContent = settings[k] ? 'AN' : 'AUS';
      onChange?.(k);
    }));
    s.querySelectorAll('[data-c]').forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.c;
      setSetting(k, b.dataset.v);
      s.querySelectorAll(`[data-c=${k}]`).forEach(x => x.classList.toggle('sel', x === b));
      onChange?.(k);
    }));
    s.querySelector('[data-a=done]').addEventListener('click', () => { close('settingspanel'); resolve(); });
  });
}

// ---------------------------------------------------------------- Pause
export function pause({ where = '', coop = false }) {
  return new Promise((resolve) => {
    const s = screen('pause', `
      <div class="menu"><h2>PAUSE</h2>
        <button class="menu-btn" data-a="resume">WEITER</button>
        <button class="menu-btn" data-a="journal">TAGEBUCH</button>
        <button class="menu-btn" data-a="settings">EINSTELLUNGEN</button>
        ${coop ? '' : '<button class="menu-btn" data-a="restart">EBENE NEU BEGINNEN</button>'}
        <button class="menu-btn" data-a="quit">ZUM TITEL</button>
      </div>
      <div class="where">${where}</div>`);
    s.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { close('pause'); resolve(b.dataset.a); }));
    const esc = (e) => { if (e.code === 'Escape') { window.removeEventListener('keydown', esc); close('pause'); resolve('resume'); } };
    setTimeout(() => window.addEventListener('keydown', esc), 200);
  });
}

// ---------------------------------------------------------------- Tod
// buttons: [[id, Beschriftung, ghost?], …] ersetzt die Standardknöpfe
export function death(titleText, text, { coop = false, buttons = null } = {}) {
  return new Promise((resolve) => {
    document.getElementById('death')?.remove();
    const s = document.createElement('div');
    s.id = 'death';
    s.className = 'active interactive';
    const row = buttons
      ? buttons.map(([id, label, ghost]) => `<button class="btn ${ghost ? 'ghost' : ''}" data-a="${id}">${escapeHtml(label)}</button>`).join('')
      : `${coop ? '<button class="btn" data-a="echo">ALS ECHO ZUSEHEN</button>' : '<button class="btn" data-a="retry">NOCH EINMAL</button>'}<button class="btn ghost" data-a="quit">ZUM TITEL</button>`;
    s.innerHTML = `<h2>${escapeHtml(titleText)}</h2><p>${escapeHtml(text)}</p>
      <div class="btn-row">${row}</div>`;
    host().appendChild(s);
    s.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { audio.play('uiSelect'); s.remove(); resolve(b.dataset.a); }));
  });
}

// ---------------------------------------------------------------- Bestätigung
export function confirm(text, yes = 'JA', no = 'NEIN') {
  return new Promise((resolve) => {
    const s = screen('confirm', `<div class="panel" style="width:min(560px,90vw);text-align:center">
      <p style="font-size:24px;line-height:1.5">${text}</p>
      <div class="btn-row" style="justify-content:center"><button class="btn ghost" data-a="no">${no}</button><button class="btn" data-a="yes">${yes}</button></div></div>`);
    s.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { close('confirm'); resolve(b.dataset.a === 'yes'); }));
  });
}
