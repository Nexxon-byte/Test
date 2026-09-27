// Tastatur, Maus, Pointer-Lock.

import { settings } from './settings.js';

class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set();     // in diesem Frame gedrückt
    this.released = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;
    this.enabled = true;          // Spielsteuerung aktiv (nicht in Menüs)
    this.canvas = null;
    this.onUnlock = null;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.dragLook = false;        // Umsehen durch Ziehen, wenn Pointer-Lock fehlt (eingebettete Seiten)
  }

  attach(canvas) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space' || (e.code.startsWith('Arrow'))) {
        if (this.locked) e.preventDefault();
      }
      if (e.repeat) return;
      this.keys.add(e.code);
      this.pressed.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.released.add(e.code);
    });
    window.addEventListener('blur', () => { this.keys.clear(); });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked && !(this.dragLook && this.mouseDown)) return;
      // extreme Sprünge (Browser-Bug beim Locken) ignorieren
      if (Math.abs(e.movementX) > 400 || Math.abs(e.movementY) > 400) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouseDown = true; this.mouseClicked = true; }
    });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseDown = false; });
    document.addEventListener('pointerlockchange', () => {
      const was = this.locked;
      this.locked = document.pointerLockElement === this.canvas;
      if (was && !this.locked && this.onUnlock) this.onUnlock();
    });
  }

  lock() {
    if (!this.canvas || this.locked) return;
    try {
      const p = this.canvas.requestPointerLock({ unadjustedMovement: true });
      if (p && p.catch) p.catch(() => { try { this.canvas.requestPointerLock(); } catch { /* */ } });
    } catch {
      try { this.canvas.requestPointerLock(); } catch { /* */ }
    }
  }

  unlock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  down(code) { return this.enabled && this.keys.has(code); }
  hit(code) { return this.enabled && this.pressed.has(code); }
  up(code) { return this.released.has(code); }
  anyDown(...codes) { return codes.some(c => this.down(c)); }

  // Mausbewegung in Radiant, Empfindlichkeit berücksichtigt
  consumeLook() {
    const s = 0.0022 * settings.sensitivity;
    const dx = this.mouseDX * s;
    const dy = this.mouseDY * s * (settings.invertY ? -1 : 1);
    this.mouseDX = 0;
    this.mouseDY = 0;
    return this.enabled ? [dx, dy] : [0, 0];
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.mouseClicked = false;
  }
}

export const input = new Input();
