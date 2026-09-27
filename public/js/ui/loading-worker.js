// Ladebildschirm im Worker: zeichnet den Schacht auf eine OffscreenCanvas.
// So läuft die Animation auch dann weiter, wenn der Hauptthread gerade eine Welt baut.

import { ShaftArt } from './loading-art.js';

let canvas = null, ctx = null, art = null;
let running = false, last = 0, pending = false;
let avg = 0, frames = 0;
const FRAME = 1000 / 30;
const raf = self.requestAnimationFrame ? (fn) => self.requestAnimationFrame(fn) : (fn) => setTimeout(() => fn(performance.now()), FRAME);

function setSize(w, h) {
  canvas.width = w; canvas.height = h;
  art.resize(w, h);
}

function draw(now) {
  const dt = last ? Math.max(0, Math.min(0.1, (now - last) / 1000)) : 1 / 30;
  last = now;
  const t0 = performance.now();
  art.render(ctx, dt);
  const ms = performance.now() - t0;
  frames++;
  avg = avg ? avg * 0.9 + ms * 0.1 : ms;
  return ms;
}

function loop(now) {
  pending = false;
  if (!running) return;
  // höchstens ~30 Bilder/s – reicht für den groben Pixelstil. Auf langsamen Rechnern seltener zeichnen
  // (höchstens halbe Rechenzeit eines Kerns, mindestens ~15 Bilder/s), damit das Laden nicht leidet.
  const interval = Math.min(66, Math.max(FRAME, avg * 2));
  if (!last || now - last >= interval - 4) draw(now);
  pending = true;
  raf(loop);
}

self.onmessage = (e) => {
  const m = e.data;
  try {
    if (m.type === 'init') {
      canvas = m.canvas;
      canvas.width = m.w; canvas.height = m.h;
      ctx = canvas.getContext('2d', { alpha: false });
      art = new ShaftArt(m.w, m.h, m.opts);
      // Aufwärmen: die ersten Bilder sind langsam, solange der JIT noch nicht übersetzt hat
      if (m.warm) for (let i = 0; i < 3; i++) art.render(ctx, 1 / 30);
    } else if (m.type === 'resize') {
      setSize(m.w, m.h);
      if (!running) draw(performance.now());
    } else if (m.type === 'config') {
      art.configure(m.opts);
    } else if (m.type === 'progress') {
      art.setProgress(m.k);
    } else if (m.type === 'start') {
      if (m.opts) art.configure(m.opts);
      running = true;
      last = 0;
      const ms = draw(performance.now());
      self.postMessage({ type: 'frame', ms });
      if (!pending) { pending = true; raf(loop); }
    } else if (m.type === 'stop') {
      running = false;
    } else if (m.type === 'stats') {
      self.postMessage({ type: 'stats', frames, avg, w: canvas.width, h: canvas.height, running });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String(err && err.message || err) });
  }
};
