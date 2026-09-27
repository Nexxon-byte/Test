// Touch-Steuerung für Handy/Tablet: linker Daumen = Laufen (virtueller Stick),
// rechte Seite ziehen = Umsehen, Knöpfe = Tasten. Speist dieselben Codes ein wie die Tastatur.

import { input } from '../core/input.js';

const LOOK_GAIN = 1.7;   // Touch-Pixel → „Maus-Pixel“ (consumeLook skaliert weiter)
const STICK_R = 56;

export function isTouchDevice() {
  return ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0 || matchMedia('(pointer: coarse)').matches;
}

export function attachTouchControls(root, buttons) {
  const layer = document.createElement('div');
  layer.className = 'touch-layer';
  root.appendChild(layer);

  const stick = document.createElement('div');
  stick.className = 'touch-stick';
  stick.innerHTML = '<div class="touch-knob"></div>';
  stick.hidden = true;
  layer.appendChild(stick);
  const knob = stick.firstChild;

  const pad = document.createElement('div');
  pad.className = 'touch-buttons';
  layer.appendChild(pad);

  let moveId = null, lookId = null, cx = 0, cy = 0, lx = 0, ly = 0;
  const moveKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft'];
  const setMove = (dx, dy) => {
    const len = Math.hypot(dx, dy), k = len > STICK_R ? STICK_R / len : 1;
    knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
    const nx = dx / STICK_R, ny = dy / STICK_R, dead = 0.28;
    const want = new Set();
    if (ny < -dead) want.add('KeyW');
    if (ny > dead) want.add('KeyS');
    if (nx < -dead) want.add('KeyA');
    if (nx > dead) want.add('KeyD');
    if (ny < -1.25) want.add('ShiftLeft');        // weit nach vorn = rennen
    for (const c of moveKeys) {
      if (want.has(c) && !input.keys.has(c)) { input.keys.add(c); input.pressed.add(c); }
      if (!want.has(c) && input.keys.has(c)) input.keys.delete(c);
    }
  };

  layer.addEventListener('touchstart', (e) => {
    for (const t of e.changedTouches) {
      if (t.target.closest('.touch-btn')) continue;
      if (t.clientX < window.innerWidth * 0.42 && moveId === null) {
        moveId = t.identifier; cx = t.clientX; cy = t.clientY;
        stick.hidden = false;
        stick.style.left = `${cx - STICK_R}px`; stick.style.top = `${cy - STICK_R}px`;
        setMove(0, 0);
      } else if (lookId === null) {
        lookId = t.identifier; lx = t.clientX; ly = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });

  layer.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) setMove(t.clientX - cx, t.clientY - cy);
      if (t.identifier === lookId) {
        input.mouseDX += (t.clientX - lx) * LOOK_GAIN;
        input.mouseDY += (t.clientY - ly) * LOOK_GAIN;
        lx = t.clientX; ly = t.clientY;
      }
    }
    e.preventDefault();
  }, { passive: false });

  const end = (e) => {
    for (const t of e.changedTouches) {
      if (t.identifier === moveId) { moveId = null; stick.hidden = true; setMove(0, 0); }
      if (t.identifier === lookId) lookId = null;
    }
  };
  layer.addEventListener('touchend', end);
  layer.addEventListener('touchcancel', end);

  // Knöpfe: tippen = Taste einmal, halten = gedrückt (z. B. Ducken)
  for (const b of buttons) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'touch-btn';
    el.textContent = b.label;
    el.addEventListener('touchstart', (e) => { input.keys.add(b.code); input.pressed.add(b.code); el.classList.add('down'); e.preventDefault(); e.stopPropagation(); }, { passive: false });
    const up = (e) => { input.keys.delete(b.code); input.released.add(b.code); el.classList.remove('down'); e.preventDefault(); };
    el.addEventListener('touchend', up);
    el.addEventListener('touchcancel', up);
    pad.appendChild(el);
  }
  return layer;
}
