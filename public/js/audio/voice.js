// Stimmen & Untertitel. Vertonte Zeilen werden mit Klangketten bearbeitet:
// Telefon, Funk (zerhackt), Tonband, Geist, Chor (vielstimmig), Raum (3D).

import { audio as A } from './audio.js';
import { LINES } from '../story/lines.js';
import { settings } from '../core/settings.js';
import { bus } from '../core/bus.js';

export const SPEAKERS = {
  vermittlerin: { label: 'VERMITTLERIN', fx: 'phone', cls: 'phone' },
  rauschen:     { label: '▒ RAUSCHEN ▒', fx: 'radio', cls: 'static' },
  margarete:    { label: 'MARGARETE WENDT', fx: 'tape', cls: 'phone' },
  ilse:         { label: '…', fx: 'ghost', cls: 'child' },
  puppe:        { label: 'DIE PUPPE', fx: 'doll', cls: 'child' },
  chor:         { label: 'DER CHOR', fx: 'choir', cls: 'choir' },
  kessler:      { label: 'KONRAD KESSLER', fx: 'room', cls: '' },
  brenner:      { label: 'HANS BRENNER', fx: 'room', cls: '' },
  vorarbeiter:  { label: 'VORARBEITER', fx: 'room', cls: '' },
  kantor:       { label: 'KANTOR', fx: 'phone', cls: 'phone' },
  radio:        { label: 'RUNDFUNK', fx: 'radio2', cls: 'static' },
  aksoy:        { label: 'KANTORIN AKSOY', fx: 'tape', cls: '' },
  oskar:        { label: 'OSKAR POHL', fx: 'ghost', cls: '' },
  aurel:        { label: 'BRUDER AUREL', fx: 'room', cls: '' },
  ada:          { label: 'ADA BRENNER', fx: 'room', cls: '' },
  nia:          { label: 'NIA', fx: 'walkie', cls: 'static' },
  you:          { label: 'DU', fx: 'none', cls: 'player' },
};

class Voice {
  constructor() {
    this.cache = new Map();
    this.queue = [];
    this.playing = null;
    this.subsEl = null;
    this.clarity = 0.2;       // Verständlichkeit des Rauschens (steigt mit der Tiefe)
    this.overrides = {};      // Sprecherlabel ändern (z. B. Vermittlerin → ???)
  }

  attach(subsEl) { this.subsEl = subsEl; }

  async load(id) {
    if (this.cache.has(id)) return this.cache.get(id);
    const p = (async () => {
      if (!A.ready) return null;
      try {
        const r = await fetch(`/audio/voice/${id}.ogg`);
        if (!r.ok) return null;
        const ab = await r.arrayBuffer();
        return await A.ctx.decodeAudioData(ab);
      } catch { return null; }
    })();
    this.cache.set(id, p);
    return p;
  }

  preload(ids) { for (const id of ids) { const v = LINES[id]; if (!v) continue; if (Array.isArray(v)) this.load(id); else v.parts.forEach((_, i) => this.load(`${id}__${i}`)); } }

  // Zeile sprechen. opts: { pos, interrupt, delay, label }
  say(id, opts = {}) {
    const entry = LINES[id];
    if (!entry) { console.warn('Zeile fehlt', id); return Promise.resolve(); }
    const parts = Array.isArray(entry) ? [[entry[0], entry[1], id]] : entry.parts.map(([s, t], i) => [s, t, `${id}__${i}`]);
    return new Promise((resolve) => {
      const job = { id, parts, opts, resolve };
      if (opts.interrupt) { this.stop(); this.queue.unshift(job); }
      else this.queue.push(job);
      if (!this.playing) this._next();
    });
  }

  // Freier Text (ohne Audio) – für Tafeln, Kom, Gedanken
  text(speaker, text, dur = null, cls = null) {
    const sp = SPEAKERS[speaker] || { label: speaker.toUpperCase(), cls: '' };
    const d = dur ?? Math.max(2.4, text.length / 14 + 1.2);
    this._showSub(sp.label, text, cls ?? sp.cls, d);
    return new Promise(r => setTimeout(r, d * 1000));
  }

  async sequence(ids, gap = 0.35, opts = {}) {
    for (const id of ids) {
      if (this._cancelSeq) { this._cancelSeq = false; return; }
      await this.say(id, opts);
      await new Promise(r => setTimeout(r, gap * 1000));
    }
  }

  stop() {
    this.queue.length = 0;
    this._cancelSeq = true;
    setTimeout(() => { this._cancelSeq = false; }, 50);
    if (this.playing) {
      for (const s of this.playing.srcs || []) { try { s.stop(); } catch { /* */ } }
      clearTimeout(this.playing.timer);
      this.playing.resolve?.();
      this.playing = null;
    }
    this._clearSubs();
  }

  get busy() { return !!this.playing || this.queue.length > 0; }

  async _next() {
    const job = this.queue.shift();
    if (!job) { this.playing = null; return; }
    this.playing = job;
    if (job.opts.delay) await new Promise(r => setTimeout(r, job.opts.delay * 1000));
    for (const [speaker, text, fileId] of job.parts) {
      if (this.playing !== job) return;
      const buf = await this.load(fileId);
      if (this.playing !== job) return;
      const sp = SPEAKERS[speaker] || { label: speaker, fx: 'none', cls: '' };
      const label = this.overrides[speaker] ?? job.opts.label ?? sp.label;
      const dur = buf ? buf.duration : Math.max(1.8, text.length / 13 + 0.8);
      const shown = speaker === 'rauschen' ? this._garble(text) : text;
      this._showSub(label, shown, sp.cls, dur + 0.5);
      bus.emit('voice:start', { speaker, id: job.id, dur });
      if (buf) job.srcs = this._play(buf, sp.fx, job.opts);
      await new Promise((r) => { job.timer = setTimeout(r, dur * 1000 + 120); });
      bus.emit('voice:end', { speaker, id: job.id });
    }
    if (this.playing === job) {
      job.resolve();
      this.playing = null;
      this._next();
    }
  }

  // ---------------------------------------------------------------- Klangketten

  _play(buf, fx, opts) {
    const ctx = A.ctx, t = A.now + 0.02;
    const srcs = [];
    const mk = (rate = 1, reverse = false) => {
      const s = ctx.createBufferSource();
      s.buffer = reverse ? this._reversed(buf) : buf;
      s.playbackRate.value = rate;
      srcs.push(s);
      return s;
    };
    const o = A.out({ bus: 'voice', pos: opts.pos || null, vol: opts.vol ?? 1, rev: 0.12, ref: 2 });
    const dest = o.input;
    switch (fx) {
      case 'phone': {
        const hp = A.filt('highpass', 380, 0.7), lp = A.filt('lowpass', 3300, 0.9), sh = this._shaper(2.2);
        hp.connect(sh).connect(lp).connect(dest);
        const s = mk(); s.connect(hp); s.start(t);
        this._hiss(dest, t, buf.duration, 0.012, 2600);
        break;
      }
      case 'radio': case 'radio2': case 'walkie': {
        const hp = A.filt('highpass', fx === 'walkie' ? 600 : 450, 0.8), lp = A.filt('lowpass', fx === 'walkie' ? 2600 : 3000, 1.2), sh = this._shaper(4);
        const gate = ctx.createGain();
        hp.connect(sh).connect(lp).connect(gate).connect(dest);
        const s = mk(); s.connect(hp); s.start(t);
        if (fx === 'radio') {
          // Aussetzer – je weniger Klarheit, desto mehr
          const holes = Math.floor(buf.duration * (1 - this.clarity) * 3);
          for (let i = 0; i < holes; i++) {
            const ht = t + Math.random() * buf.duration, hl = 0.05 + Math.random() * 0.22;
            gate.gain.setValueAtTime(1, ht); gate.gain.setValueAtTime(0.03, ht + 0.005); gate.gain.setValueAtTime(1, ht + hl);
          }
        }
        this._hiss(dest, t, buf.duration, fx === 'radio' ? 0.05 * (1.2 - this.clarity) : 0.03, 2200);
        break;
      }
      case 'tape': {
        const lp = A.filt('lowpass', 5200, 0.7), hp = A.filt('highpass', 120, 0.7);
        hp.connect(lp).connect(dest);
        const s = mk(); s.connect(hp);
        const wow = ctx.createGain(); wow.gain.value = 0.004; wow.connect(s.playbackRate);
        srcs.push(A.osc('sine', 0.6, t, t + buf.duration + 1, wow));
        s.start(t);
        this._hiss(dest, t, buf.duration, 0.02, 5000);
        break;
      }
      case 'ghost': {
        const hp = A.filt('highpass', 220, 0.7, dest);
        const s = mk(); s.connect(hp); s.start(t);
        const send = A.vca(A.revSend, 0.9); hp.connect(send);
        break;
      }
      case 'doll': {
        const sh = this._shaper(6), lp = A.filt('lowpass', 3800, 1, dest);
        sh.connect(lp);
        const s = mk(0.98); s.connect(sh);
        const wob = ctx.createGain(); wob.gain.value = 0.03; wob.connect(s.playbackRate);
        srcs.push(A.osc('square', 5, t, t + buf.duration + 1, wob));
        s.start(t);
        break;
      }
      case 'choir': {
        const lp = A.filt('lowpass', 2800, 0.6, dest);
        const send = A.vca(A.revSend, 1.2); lp.connect(send);
        const voices = [[1, 0, 0.55], [0.985, 0.03, 0.4], [1.018, 0.055, 0.4], [0.955, 0.09, 0.3], [1.04, 0.12, 0.25]];
        for (const [rate, delay, gain] of voices) {
          const s = mk(rate); const g = A.vca(lp, gain); s.connect(g); s.start(t + delay);
        }
        const rv = mk(0.9, true); const rg = A.vca(lp, 0.12); rv.connect(rg); rv.start(t + 0.2);
        const sub = mk(0.94); const sg = A.vca(A.filt('lowpass', 400, 1, lp), 0.5); sub.connect(sg); sub.start(t);
        break;
      }
      case 'room': {
        const s = mk(); s.connect(dest); s.start(t);
        const send = A.vca(A.revSend, 0.35); s.connect(send);
        break;
      }
      default: {
        const s = mk(); s.connect(dest); s.start(t);
      }
    }
    return srcs;
  }

  _reversed(buf) {
    if (buf._rev) return buf._rev;
    const r = A.ctx.createBuffer(buf.numberOfChannels, buf.length, buf.sampleRate);
    for (let c = 0; c < buf.numberOfChannels; c++) { const s = buf.getChannelData(c), d = r.getChannelData(c); for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i]; }
    buf._rev = r;
    return r;
  }

  _shaper(amount) {
    const ws = A.ctx.createWaveShaper();
    const n = 1024, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(x * amount) / Math.tanh(amount); }
    ws.curve = c;
    return ws;
  }

  _hiss(dest, t, dur, vol, freq) {
    const g = A.vca(A.filt('bandpass', freq, 0.6, dest), vol);
    A.noiseSrc('white', t, t + dur + 0.2, g);
  }

  // ---------------------------------------------------------------- Untertitel

  _garble(text) {
    if (this.clarity >= 0.95) return text;
    return text.split('').map(ch => (/[a-zäöüß]/i.test(ch) && Math.random() > this.clarity + 0.35 ? '—' : ch)).join('');
  }

  _showSub(label, text, cls, dur) {
    if (!this.subsEl || !settings.subtitles) return;
    const el = document.createElement('div');
    el.className = 'sub-line ' + (cls || '');
    el.innerHTML = `${label ? `<span class="who">${label}</span>` : ''}${escapeHtml(text)}`;
    const wrap = document.createElement('div');
    wrap.appendChild(el);
    this.subsEl.appendChild(wrap);
    while (this.subsEl.children.length > 2) this.subsEl.firstChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => wrap.remove(), 450); }, dur * 1000);
  }

  _clearSubs() { if (this.subsEl) this.subsEl.innerHTML = ''; }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export const voice = new Voice();
