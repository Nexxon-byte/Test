// Bildschirm-Effekte und kleine Anzeigen des Monster-Pakets (eigene Ebene über dem HUD, eigenes CSS).
//   overlay.show('wings' | 'water' | 'veil' | 'white' | 'stamp', dauer?)   · overlay.hide(kind)
//   meter.show(titel, text) · meter.set(0…1) · meter.hide()      (Waage des Zöllners, Treten gegen Ertrunkene)
//   seal.set(on)                                                     (Siegel des Zöllners im Kom)
//   choice(titel, text, [[key, label, fein?], …]) → Promise<key>     (Segnung: Entscheidung am Telefon)
//   cards(seiten) → Promise                                          (Epilog-Tafeln)

const CSS = `
#pk-layer { position: absolute; inset: 0; pointer-events: none; z-index: 30; }
#pk-layer .fx { position: absolute; inset: 0; opacity: 0; transition: opacity 0.6s; }
#pk-layer .fx.on { opacity: 1; }
#pk-layer .wings { background:
  radial-gradient(ellipse at 50% 55%, rgba(0,0,0,0) 18%, rgba(28,18,8,0.75) 52%, rgba(8,5,2,0.98) 78%),
  repeating-linear-gradient(97deg, rgba(190,165,110,0.10) 0 2px, rgba(0,0,0,0) 2px 9px);
  animation: pk-flutter 0.09s steps(2) infinite; transition: opacity 0.15s; }
@keyframes pk-flutter { 50% { transform: scale(1.03) rotate(0.4deg); filter: brightness(0.8); } }
#pk-layer .water { background: linear-gradient(0deg, rgba(10,40,48,0.95) 0%, rgba(14,52,60,0.8) var(--lvl, 30%), rgba(10,30,36,0) calc(var(--lvl, 30%) + 18%));
  transition: opacity 0.4s; }
#pk-layer .water::after { content: ''; position: absolute; inset: 0; background: repeating-radial-gradient(circle at 50% 120%, rgba(160,220,230,0.05) 0 3px, rgba(0,0,0,0) 3px 14px); animation: pk-ripple 2.4s linear infinite; }
@keyframes pk-ripple { to { transform: translateY(-14px); } }
#pk-layer .veil { background:
  radial-gradient(ellipse at 50% 45%, rgba(255,250,240,0) 38%, rgba(245,238,225,0.35) 62%, rgba(250,246,238,0.85) 88%),
  repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 1px, rgba(0,0,0,0) 1px 4px),
  repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, rgba(0,0,0,0) 1px 4px);
  transition: opacity 2.4s; mix-blend-mode: screen; }
#pk-layer .white { background: #fbf8f1; transition: opacity 3.5s; }
#pk-layer .stamp { display: flex; align-items: center; justify-content: center; transition: opacity 0.2s; }
#pk-layer .stamp i { width: 220px; height: 220px; border-radius: 50%; border: 10px double rgba(170,20,16,0.85); color: rgba(170,20,16,0.9);
  display: flex; align-items: center; justify-content: center; font: 400 30px var(--type, monospace); letter-spacing: 0.2em; transform: rotate(-14deg) scale(1.4);
  box-shadow: inset 0 0 30px rgba(170,20,16,0.35); text-shadow: 0 0 1px rgba(170,20,16,0.6); }
#pk-layer .stamp.on i { animation: pk-stamp 0.35s cubic-bezier(.2,1.6,.4,1) forwards; }
@keyframes pk-stamp { from { transform: rotate(-14deg) scale(2.4); opacity: 0; } to { transform: rotate(-14deg) scale(1); opacity: 1; } }
#pk-meter { position: absolute; left: 50%; top: 62%; transform: translateX(-50%); min-width: 360px; padding: 10px 18px 12px; text-align: center;
  background: linear-gradient(180deg, rgba(20,14,8,0.86), rgba(8,6,4,0.92)); border: 1px solid rgba(201,160,80,0.45); color: var(--bone, #e9dcc2);
  font-family: var(--mono, monospace); opacity: 0; transition: opacity 0.25s; box-shadow: 0 0 30px rgba(0,0,0,0.7); }
#pk-meter.on { opacity: 1; }
#pk-meter .t { color: var(--gold-hi, #f0d28a); font-size: 20px; letter-spacing: 0.25em; }
#pk-meter .s { font-size: 18px; margin: 4px 0 8px; letter-spacing: 0.06em; }
#pk-meter .b { height: 8px; background: rgba(201,160,80,0.15); position: relative; }
#pk-meter .b i { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #9a1a14, #ff7a40); width: 0; transition: width 0.1s linear; }
#pk-seal { position: absolute; right: 30px; top: 26px; width: 74px; height: 74px; border-radius: 50%; border: 5px double rgba(190,26,20,0.8); color: rgba(210,40,30,0.95);
  font: 400 12px var(--mono, monospace); letter-spacing: 0.2em; display: flex; align-items: center; justify-content: center; text-align: center; transform: rotate(-12deg);
  opacity: 0; transition: opacity 0.5s; animation: pk-pulse 2.2s ease-in-out infinite; }
#pk-seal.on { opacity: 1; }
#pk-seal.paid { border-color: rgba(141,255,168,0.6); color: rgba(141,255,168,0.9); animation: none; }
@keyframes pk-pulse { 50% { box-shadow: 0 0 22px rgba(255,40,30,0.45); } }
#pk-choice { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: auto; opacity: 0; transition: opacity 1.2s; z-index: 40; }
#pk-choice.on { opacity: 1; }
#pk-choice .card { width: min(560px, 90vw); padding: 30px 36px 26px; background: radial-gradient(ellipse at 50% 0%, rgba(40,26,14,0.95), rgba(6,4,3,0.96));
  border: 1px solid rgba(201,160,80,0.4); box-shadow: 0 0 80px rgba(0,0,0,0.9), inset 0 0 40px rgba(201,160,80,0.06); text-align: center; }
#pk-choice h2 { font: 400 15px var(--mono, monospace); color: var(--kom, #8dffa8); letter-spacing: 0.4em; margin-bottom: 14px; text-shadow: 0 0 8px rgba(141,255,168,0.5); }
#pk-choice p { font: 300 22px/1.35 var(--serif, serif); color: var(--bone, #e9dcc2); margin-bottom: 22px; white-space: pre-line; }
#pk-choice .opts { display: flex; flex-direction: column; gap: 10px; }
#pk-choice button { font: 400 22px var(--serif, serif); letter-spacing: 0.14em; padding: 10px 14px; color: var(--bone-dim, #a89a80); background: rgba(0,0,0,0.4);
  border: 1px solid rgba(201,160,80,0.25); cursor: pointer; transition: color 0.2s, border-color 0.2s, background 0.2s; }
#pk-choice button:hover, #pk-choice button:focus { color: var(--gold-hi, #f0d28a); border-color: rgba(240,210,138,0.7); background: rgba(40,28,12,0.6); outline: none; }
#pk-choice button small { display: block; font: 400 15px var(--mono, monospace); letter-spacing: 0.08em; color: #8a7a60; margin-top: 3px; }
#pk-cards { position: absolute; inset: 0; background: #050403; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 1.6s; z-index: 45; pointer-events: auto; }
#pk-cards.on { opacity: 1; }
#pk-cards p { font: 300 30px/1.45 var(--serif, serif); color: var(--bone, #e9dcc2); text-align: center; white-space: pre-line; max-width: 80vw; opacity: 0; transition: opacity 1.4s; letter-spacing: 0.04em; }
#pk-cards p.on { opacity: 1; }
/* Nachsprecher: geliehene Stimmen flirren kaum merklich */
#subs .sub-line.mimic { animation: pk-mimic 0.14s steps(2) infinite; }
@keyframes pk-mimic { 50% { text-shadow: 1px 0 0 rgba(255,70,60,0.4), -1px 0 0 rgba(70,200,255,0.4); } }
/* Zwischensequenzen: Spielanzeigen treten zurück */
body.pk-cine #hotbar, body.pk-cine #crosshair, body.pk-cine #stamina, body.pk-cine #noise { opacity: 0 !important; transition: opacity 0.8s; }
#pk-cards .skip { position: absolute; bottom: 22px; right: 28px; font: 400 16px var(--mono, monospace); color: #5a5040; letter-spacing: 0.2em; }
`;

let root = null;
const els = {};
function ensure() {
  if (root) return root;
  const style = document.createElement('style');
  style.id = 'pk-style';
  style.textContent = CSS;
  document.head.appendChild(style);
  root = document.createElement('div');
  root.id = 'pk-layer';
  root.innerHTML = `
    <div class="fx wings"></div><div class="fx water"></div><div class="fx veil"></div><div class="fx stamp"><i>GESIEGELT</i></div><div class="fx white"></div>
    <div id="pk-meter"><div class="t"></div><div class="s"></div><div class="b"><i></i></div></div>
    <div id="pk-seal">SIEGEL</div>`;
  (document.getElementById('ui') || document.body).appendChild(root);
  for (const k of ['wings', 'water', 'veil', 'stamp', 'white']) els[k] = root.querySelector('.' + k);
  els.meter = root.querySelector('#pk-meter');
  els.seal = root.querySelector('#pk-seal');
  return root;
}

const timers = {};
export const overlay = {
  show(kind, dur = 0) {
    ensure();
    const e = els[kind];
    if (!e) return;
    e.classList.remove('on'); void e.offsetWidth; e.classList.add('on');
    clearTimeout(timers[kind]);
    if (dur) timers[kind] = setTimeout(() => e.classList.remove('on'), dur * 1000);
  },
  hide(kind) { ensure(); els[kind]?.classList.remove('on'); clearTimeout(timers[kind]); },
  // Wasserstand im Bild (0 … 1) – beim Hinabziehen
  water(level) { ensure(); els.water.style.setProperty('--lvl', `${Math.round(level * 100)}%`); },
  clear() { if (!root) return; for (const k of ['wings', 'water', 'veil', 'stamp', 'white']) this.hide(k); meter.hide(); seal.set(false); },
};

export const meter = {
  show(title, text = '') { ensure(); els.meter.querySelector('.t').textContent = title; els.meter.querySelector('.s').innerHTML = text; els.meter.classList.add('on'); },
  text(t) { ensure(); els.meter.querySelector('.s').innerHTML = t; },
  set(v) { ensure(); els.meter.querySelector('.b i').style.width = `${Math.max(0, Math.min(1, v)) * 100}%`; },
  hide() { ensure(); els.meter.classList.remove('on'); },
};

export const seal = {
  set(on, paid = false) { ensure(); els.seal.classList.toggle('on', !!on); els.seal.classList.toggle('paid', !!paid); els.seal.textContent = paid ? 'QUITTIERT' : 'GESIEGELT'; },
};

// Entscheidung (Maus oder Tasten 1…n). Gibt den Schlüssel der gewählten Möglichkeit zurück.
export function choice(title, text, options) {
  ensure();
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.id = 'pk-choice';
    wrap.innerHTML = `<div class="card"><h2>${title}</h2><p>${text}</p><div class="opts"></div></div>`;
    const opts = wrap.querySelector('.opts');
    const done = (k) => {
      window.removeEventListener('keydown', onKey, true);
      wrap.classList.remove('on');
      setTimeout(() => wrap.remove(), 1200);
      resolve(k);
    };
    options.forEach(([key, label, sub], i) => {
      const b = document.createElement('button');
      b.innerHTML = `${i + 1} · ${label}${sub ? `<small>${sub}</small>` : ''}`;
      b.onclick = () => done(key);
      opts.appendChild(b);
    });
    const onKey = (e) => { const n = Number(e.key); if (n >= 1 && n <= options.length) { e.preventDefault(); e.stopPropagation(); done(options[n - 1][0]); } };
    window.addEventListener('keydown', onKey, true);
    root.parentElement.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('on'));
    setTimeout(() => opts.querySelector('button')?.focus(), 400);
  });
}

// Tafeln nacheinander (Leertaste/Klick überspringt)
export function cards(pages, { hold = 4.2 } = {}) {
  ensure();
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.id = 'pk-cards';
    wrap.innerHTML = `<p></p><div class="skip">[LEERTASTE] WEITER</div>`;
    const p = wrap.querySelector('p');
    root.parentElement.appendChild(wrap);
    let i = -1, t = null;
    const next = () => {
      clearTimeout(t);
      i++;
      if (i >= pages.length) { window.removeEventListener('keydown', onKey, true); wrap.removeEventListener('click', next); wrap.classList.remove('on'); setTimeout(() => { wrap.remove(); resolve(); }, 1600); return; }
      p.classList.remove('on');
      setTimeout(() => { p.textContent = pages[i]; p.classList.add('on'); }, i === 0 ? 900 : 700);
      t = setTimeout(next, (hold + pages[i].length / 40) * 1000);
    };
    const onKey = (e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); e.stopPropagation(); next(); } };
    window.addEventListener('keydown', onKey, true);
    wrap.addEventListener('click', next);
    requestAnimationFrame(() => wrap.classList.add('on'));
    next();
  });
}

// Spielanzeigen (Inventar, Fadenkreuz, Ausdauer) für Zwischensequenzen aus- und einblenden
export function cineHud(on) { ensure(); document.body.classList.toggle('pk-cine', !!on); }
