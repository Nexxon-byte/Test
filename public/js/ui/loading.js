// Ladebildschirm: Blick in den Schacht der Neunten (Worker-Animation), wechselnde Tipps,
// Fortschritt am Messing-Zifferblatt, eigene Musikschicht.
//
//   await loading.show({ kind: 'boot'|'hub'|'night', title?, sub?, depth? })
//   loading.progress(0 … 1 | null)   ·   loading.status('Seil wird geprüft')   ·   await loading.hide()
//   await withLoading(fn, { kind, title, … })  – blendet nur ein, wenn es voraussichtlich dauert
//
// Eigenständig (kein ui.init() nötig), damit er schon vor dem Laden des Spiels stehen kann.

import { settings } from '../core/settings.js';
import { music } from '../audio/music.js';
import { TIPS } from '../story/tips.js';
import { QUOTES } from '../story/codex.js';
import { instrumentBox } from './loading-art.js';

const KINDS = {
  boot:  { label: 'DIE NEUNTE · ABWÄRTS', title: 'TIEFER', sub: 'Kabine 9 fährt nur noch abwärts.', status: 'Seil wird geprüft' },
  hub:   { label: 'DIE NEUNTE · AUFWÄRTS', title: 'MARKT NEUN', sub: 'Regen, Neon und die Waage der Kantorei.', status: 'Etagentor wird entriegelt' },
  night: { label: 'DIE NEUNTE · ABWÄRTS', title: 'DER SCHACHT', sub: '', status: 'Absatz wird beleuchtet' },
};
const TIP_MS = 6500;
const TIMES_KEY = 'tiefer.loadtimes.v1';
const DECK_KEY = 'tiefer.tipdeck.v1';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wait = (ms) => new Promise(r => setTimeout(r, ms));
// n Bilder abwarten, die wirklich gezeichnet wurden (rAF + Aufgabe danach = nach dem Malen)
const painted = (n = 1) => new Promise((r) => { const step = () => requestAnimationFrame(() => setTimeout(() => (--n <= 0 ? r() : step()), 0)); step(); });

// ---------------------------------------------------------------- Tipps: gemischter Stapel (2 Tipps, 1 Zitat)
function buildDeck() {
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const tips = shuffle(TIPS.map((t, i) => ['t', i]));
  const quotes = shuffle(QUOTES.map((q, i) => ['q', i]));
  const deck = [];
  while (tips.length || quotes.length) {
    for (let k = 0; k < 2 && tips.length; k++) deck.push(tips.pop());
    if (quotes.length) deck.push(quotes.pop());
  }
  return deck;
}
function loadDeck() {
  try {
    const d = JSON.parse(localStorage.getItem(DECK_KEY) || 'null');
    if (d && Array.isArray(d.deck) && d.deck.length === TIPS.length + QUOTES.length) return d;
  } catch { /* privat */ }
  return { deck: buildDeck(), pos: 0 };
}

// ---------------------------------------------------------------- Ladezeiten (für withLoading)
let times = {};
try { times = JSON.parse(localStorage.getItem(TIMES_KEY) || '{}') || {}; } catch { times = {}; }
export function recordLoad(key, ms) {
  const old = times[key];
  times[key] = Math.round(old === undefined ? ms : old * 0.4 + ms * 0.6);
  try { localStorage.setItem(TIMES_KEY, JSON.stringify(times)); } catch { /* egal */ }
}
export function estimateLoad(key) { return times[key]; }

// ---------------------------------------------------------------- Ladebildschirm

class Loading {
  constructor() {
    this.visible = false;
    this.root = null;
    this.kind = 'boot';
    this.shownAt = 0;
    this._frameWaiters = [];
  }

  // Früh aufrufen, wenn bald geladen wird: Worker startet und wärmt sich (JIT) im Hintergrund auf
  prewarm() { this._ensure(true); }

  _ensure(warm = false) {
    if (this.root) return;
    const r = document.createElement('div');
    r.id = 'loadscreen';
    r.setAttribute('aria-hidden', 'true');
    r.innerHTML = `
      <div class="ls-scrim"></div>
      <div class="ls-head"><div class="ls-label"></div><h1 class="ls-title"></h1><div class="ls-sub"></div></div>
      <div class="ls-tip" role="status" aria-live="polite">
        <div class="ls-tip-lbl"><span class="ls-tip-kind">AUS DEM DIENSTBUCH</span><span class="ls-tip-n"></span></div>
        <div class="ls-tip-body"></div>
      </div>
      <div class="ls-status"><span class="ls-status-txt"></span><span class="ls-dots"><i>.</i><i>.</i><i>.</i></span><span class="ls-pct"></span></div>
      <div class="ls-grain"></div>`;
    document.body.appendChild(r);
    this.root = r;
    this.$ = (s) => r.querySelector(s);
    this._makeCanvas(warm);
    this._size();
    addEventListener('resize', () => { if (this.root) this._size(true); });
  }

  // ---- Zeichenfläche: bevorzugt im Worker (läuft weiter, wenn der Hauptthread blockiert)
  _makeCanvas(warm = false) {
    const cv = document.createElement('canvas');
    cv.className = 'ls-art';
    this.root.insertBefore(cv, this.root.firstChild);
    this.canvas = cv;
    this.worker = null;
    this.local = null;
    const { w, h } = this._dims();
    const opts = this._artOpts();
    if (typeof Worker !== 'undefined' && cv.transferControlToOffscreen && !this._noWorker) {
      try {
        const off = cv.transferControlToOffscreen();
        const wk = new Worker(new URL('./loading-worker.js', import.meta.url), { type: 'module' });
        wk.onmessage = (e) => {
          if (e.data?.type === 'frame') this._gotFrame();
          else if (e.data?.type === 'error') { console.warn('Ladebildschirm (Worker):', e.data.message); this._fallback(); }
        };
        wk.onerror = (e) => { e.preventDefault?.(); console.warn('Ladebildschirm: Worker nicht verfügbar, zeichne im Hauptthread.'); this._fallback(); };
        wk.postMessage({ type: 'init', canvas: off, w, h, opts, warm }, [off]);
        this.worker = wk;
        this.dims = { w, h };
        return;
      } catch (e) {
        console.warn('Ladebildschirm: kein OffscreenCanvas-Worker', e?.message || e);
        // die Leinwand ist evtl. schon übertragen → frische nehmen
        cv.remove();
        const c2 = document.createElement('canvas');
        c2.className = 'ls-art';
        this.root.insertBefore(c2, this.root.firstChild);
        this.canvas = c2;
      }
    }
    this._startLocal();
  }

  _fallback() {
    if (this.local) return;
    try { this.worker?.terminate(); } catch { /* */ }
    this.worker = null;
    this._noWorker = true;
    this.canvas.remove();
    const cv = document.createElement('canvas');
    cv.className = 'ls-art';
    this.root.insertBefore(cv, this.root.firstChild);
    this.canvas = cv;
    this._startLocal();
    if (this.visible) this._artStart();
  }

  // Rückfall: im Hauptthread zeichnen (etwas gröber, damit es billig bleibt)
  _startLocal() {
    const { w, h } = this._dims(1);
    this.canvas.width = w; this.canvas.height = h;
    this.dims = { w, h };
    const ctx = this.canvas.getContext('2d', { alpha: false });
    this.local = { ctx, art: null, raf: 0, last: 0 };
    if (this.root) this._size();
    import('./loading-art.js').then(({ ShaftArt }) => {
      this.local.art = new ShaftArt(w, h, this._artOpts());
      if (this.visible) this._artStart();
    }).catch(e => console.warn('Ladebildschirm-Bild fehlt', e));
  }

  _dims(extra = 0) {
    const W = innerWidth || 1280, H = innerHeight || 720;
    const s = Math.max(2, Math.round(H / 200)) + extra;   // ~200 Zeilen: grob wie das Spiel, billig genug
    this.scale = s;
    return { w: Math.ceil(W / s), h: Math.ceil(H / s) };
  }

  _size(post) {
    const { w, h } = this._dims(this.local ? 1 : 0);
    // Standzeile knapp über dem Instrument
    const ib = instrumentBox(h), H = innerHeight || 720;
    this.root.style.setProperty('--ls-ib', `${Math.round((ib.m + ib.h + 3) / h * H)}px`);
    this.root.style.setProperty('--ls-ir', `${Math.round(ib.m / h * H)}px`);
    if (!post || !this.dims || (w === this.dims.w && h === this.dims.h)) return;
    this.dims = { w, h };
    if (this.worker) this.worker.postMessage({ type: 'resize', w, h });
    else if (this.local?.art) { this.canvas.width = w; this.canvas.height = h; this.local.art.resize(w, h); }
  }

  _artOpts() {
    return { kind: this.kind, depth: this.depth || 0, reduceFlashing: !!settings.reduceFlashing || matchMedia?.('(prefers-reduced-motion: reduce)').matches };
  }

  _artSend(msg) {
    if (this.worker) this.worker.postMessage(msg);
    else if (this.local?.art) {
      if (msg.type === 'config') this.local.art.configure(msg.opts);
      else if (msg.type === 'progress') this.local.art.setProgress(msg.k);
    }
  }

  _artStart() {
    if (this.worker) { this.worker.postMessage({ type: 'start', opts: this._artOpts() }); return; }
    const L = this.local;
    if (!L?.art) return;
    L.art.configure(this._artOpts());
    cancelAnimationFrame(L.raf);
    L.last = 0;
    const step = (now) => {
      if (!this.visible && !this._hiding) return;
      if (!L.last || now - L.last >= 30) {
        const dt = L.last ? Math.max(0, Math.min(0.1, (now - L.last) / 1000)) : 1 / 30;
        L.last = now;
        L.art.render(L.ctx, dt);
        this._gotFrame();
      }
      L.raf = requestAnimationFrame(step);
    };
    L.art.render(L.ctx, 1 / 30);
    this._gotFrame();
    L.raf = requestAnimationFrame(step);
  }

  _artStop() {
    if (this.worker) this.worker.postMessage({ type: 'stop' });
    else if (this.local) cancelAnimationFrame(this.local.raf);
  }

  _gotFrame() {
    this.root?.classList.add('art');
    const ws = this._frameWaiters;
    this._frameWaiters = [];
    for (const r of ws) r();
  }

  _firstFrame(timeout = 450) {
    return new Promise((r) => { this._frameWaiters.push(r); setTimeout(r, timeout); });
  }

  // ---- Texte
  _text(opts) {
    const K = KINDS[this.kind] || KINDS.boot;
    this.$('.ls-label').textContent = opts.label ?? K.label;
    const title = opts.title ?? K.title;
    const t = this.$('.ls-title');
    t.textContent = title;
    t.classList.toggle('long', title.length > 10 && title.length <= 16);
    t.classList.toggle('xlong', title.length > 16);
    this.$('.ls-sub').textContent = opts.sub ?? K.sub;
    this.status(opts.status ?? K.status);
    this.root.dataset.kind = this.kind;
  }

  _nextTip(first = false) {
    const body = this.$('.ls-tip-body');
    const put = () => {
      const D = this.deck || (this.deck = loadDeck());
      if (D.pos >= D.deck.length) { D.deck = buildDeck(); D.pos = 0; }
      const [type, i] = D.deck[D.pos++];
      try { localStorage.setItem(DECK_KEY, JSON.stringify(D)); } catch { /* */ }
      if (type === 't' && TIPS[i]) {
        const [text, sig] = TIPS[i];
        const html = esc(text).replace(/\[([A-ZÄÖÜ0-9]{1,5})\]/g, '<kbd>$1</kbd>');
        body.innerHTML = `<p class="tip">${html}</p><div class="sig">${esc(sig)}</div>`;
        this.$('.ls-tip-kind').textContent = 'AUS DEM DIENSTBUCH';
      } else {
        const [text, src] = QUOTES[i] || QUOTES[0];
        body.innerHTML = `<p class="quote">„${esc(text)}“</p><cite>${esc(src)}</cite>`;
        this.$('.ls-tip-kind').textContent = 'ÜBERLIEFERT';
      }
      this.$('.ls-tip-n').textContent = String((D.pos % 100)).padStart(2, '0');
      body.classList.remove('out');
    };
    if (first) { put(); return; }
    body.classList.add('out');
    clearTimeout(this._tipSwap);
    this._tipSwap = setTimeout(put, 650);
  }

  // ---- öffentlich

  // Zeigt den Ladebildschirm (oder passt den sichtbaren an). Löst auf, sobald er deckend steht.
  show(opts = {}) {
    this._ensure();
    const kind = KINDS[opts.kind] ? opts.kind : (opts.kind ? 'boot' : (this.visible ? this.kind : 'boot'));
    const changed = kind !== this.kind || (opts.depth ?? this.depth) !== this.depth;
    this.kind = kind;
    if (opts.depth !== undefined) this.depth = opts.depth;
    this._text(opts);
    if (opts.progress !== undefined) this.progress(opts.progress);
    if (this.visible) {
      if (changed) this._artSend({ type: 'config', opts: this._artOpts() });
      music.setLoading?.(kind);
      return this._ready || Promise.resolve();
    }
    // (ggf. laufendes Ausblenden abbrechen)
    clearTimeout(this._hideT);
    if (this._hideResolve) { this._hideResolve(); this._hideResolve = null; }
    const wasHiding = this._hiding;
    this._hiding = false;
    this.visible = true;
    this.shownAt = performance.now();
    if (opts.progress === undefined) this.progress(null);
    this._artSend({ type: 'config', opts: this._artOpts() });
    const fade = opts.fade ?? (kind === 'boot' ? 300 : 420);
    const r = this.root;
    r.classList.add('on');
    r.setAttribute('aria-hidden', 'false');
    r.classList.toggle('calm', !!this._artOpts().reduceFlashing);
    if (!wasHiding) {
      // (beim Abbrechen eines Ausblendens vom aktuellen Wert aus weiterblenden)
      r.style.transition = 'none';
      r.style.opacity = '0';
      void r.offsetWidth;
    }
    r.style.transition = `opacity ${fade}ms ease`;
    r.style.opacity = '1';
    const ff = this._firstFrame();
    if (!wasHiding) this._artStart();
    this._nextTip(true);
    clearInterval(this._tipT);
    this._tipT = setInterval(() => this._nextTip(), TIP_MS);
    this._mood(kind);
    // deckend und gemalt, bevor der Aufrufer den Hauptthread blockiert
    this._ready = Promise.all([ff, wait(fade)]).then(() => {
      if (this.visible) r.style.transition = 'none';   // Einblenden sicher abschließen (volle Deckkraft)
      return painted(2);
    });
    return this._ready;
  }

  update(opts = {}) { return this.visible ? this.show(opts) : Promise.resolve(); }

  // Fortschritt 0 … 1 (null = unbekannt: die Nadel tastet)
  progress(k) {
    this._prog = k;
    this._artSend({ type: 'progress', k });
    if (this.root) this.$('.ls-pct').textContent = k === null || k === undefined ? '' : `${Math.round(k * 100)} %`;
  }

  status(text) {
    if (!this.root) return;
    this.$('.ls-status-txt').textContent = String(text || '').toUpperCase();
  }

  // Blendet aus; löst auf, wenn er ganz weg ist
  hide({ fade = 750 } = {}) {
    if (!this.visible || !this.root) return Promise.resolve();
    this.visible = false;
    this._hiding = true;
    clearInterval(this._tipT);
    clearInterval(this._moodT);
    music.setLoading?.(null);
    const r = this.root;
    r.style.transition = `opacity ${fade}ms ease`;
    r.style.opacity = '0';
    return new Promise((res) => {
      this._hideResolve = res;
      this._hideT = setTimeout(() => {
        this._hiding = false;
        r.classList.remove('on');
        r.setAttribute('aria-hidden', 'true');
        this._artStop();
        this._hideResolve = null;
        res();
      }, fade + 30);
    });
  }

  // Musik: erst möglich, wenn der Ton freigegeben ist (Nutzergeste) – bis dahin still weiterprobieren
  _mood(kind) {
    clearInterval(this._moodT);
    if (music.setLoading?.(kind)) return;
    this._moodT = setInterval(() => {
      if (!this.visible) { clearInterval(this._moodT); return; }
      if (music.setLoading?.(this.kind)) clearInterval(this._moodT);
    }, 500);
  }
}

export const loading = new Loading();

// Führt fn aus und verdeckt die Wartezeit – aber nur, wenn es dauert:
// Ist aus früheren Läufen bekannt, dass es länger als delay braucht (oder unbekannt), wird vorher
// eingeblendet (blockierende Arbeit sieht dann ein fertiges Bild). Sonst erst nach delay ms, falls fn noch läuft.
// Sichtbar bleibt er dann mindestens minShow ms und bis die ersten Bilder der neuen Welt gezeichnet sind.
export async function withLoading(fn, opts = {}) {
  const key = opts.key || opts.kind || 'load';
  const delay = opts.delay ?? 150, minShow = opts.minShow ?? 800;
  if (loading.visible) {
    // schon sichtbar (z. B. beim Start): nur Texte anpassen, Ausblenden übernimmt der Aufrufer
    loading.update(opts);
    const t0 = performance.now();
    const r = await fn();
    await painted(3);
    recordLoad(key, performance.now() - t0);
    return r;
  }
  const est = opts.always ? Infinity : estimateLoad(key);
  let shown = false, done = false, timer = 0;
  if (est === undefined || est >= delay) { await loading.show(opts); shown = true; }
  else timer = setTimeout(() => { if (!done) { shown = true; loading.show(opts); } }, delay);
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    done = true;
    clearTimeout(timer);
    await painted(3);           // erste Bilder der neuen Welt (Shader-Übersetzung) noch verdecken
    recordLoad(key, performance.now() - t0);
    if (shown) {
      const vis = performance.now() - loading.shownAt;
      if (vis < minShow) await wait(minShow - vis);
      await loading.hide({ fade: opts.fadeOut ?? 750 });
    }
  }
}
