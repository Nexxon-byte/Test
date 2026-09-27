// Audio-Engine: Busse, Hall, 3D-Klang (HRTF), Verdeckung – und ein ganzes Arsenal
// synthetisierter Geräusche. Keine einzige Sounddatei nötig.

import { settings, onSettings } from '../core/settings.js';

const rnd = (a, b) => a + Math.random() * (b - a);

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.ready = false;
    this.loops = new Set();
    this.emitters = new Set();
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC({ latencyHint: 'interactive' });
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.muffle = ctx.createBiquadFilter();
    this.muffle.type = 'lowpass';
    this.muffle.frequency.value = 22000;
    this.muffle.Q.value = 0.5;
    this.limiter = ctx.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.knee.value = 8;
    this.limiter.ratio.value = 6;
    this.limiter.attack.value = 0.004;
    this.limiter.release.value = 0.25;
    this.master.connect(this.muffle).connect(this.limiter).connect(ctx.destination);

    this.bus = {};
    for (const name of ['music', 'sfx', 'amb', 'voice', 'ui']) {
      const g = ctx.createGain();
      g.connect(this.master);
      this.bus[name] = g;
    }
    // Hall
    this.reverb = ctx.createConvolver();
    this.reverbOut = ctx.createGain();
    this.reverbOut.gain.value = 0.9;
    this.reverb.connect(this.reverbOut).connect(this.master);
    this.setReverb(2.2, 0.5);
    this.revSend = ctx.createGain();
    this.revSend.gain.value = 0.35;
    this.revSend.connect(this.reverb);

    // Rauschpuffer
    this.noise = { white: this._noiseBuf('white', 3), pink: this._noiseBuf('pink', 4), brown: this._noiseBuf('brown', 4) };

    this.applyVolumes();
    onSettings(() => this.applyVolumes());
    this.ready = true;
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(settings.masterVolume, t, 0.05);
    this.bus.music.gain.setTargetAtTime(settings.musicVolume * 0.9, t, 0.05);
    this.bus.sfx.gain.setTargetAtTime(settings.sfxVolume, t, 0.05);
    this.bus.amb.gain.setTargetAtTime(settings.sfxVolume * 0.85, t, 0.05);
    this.bus.voice.gain.setTargetAtTime(settings.voiceVolume * 1.1, t, 0.05);
    this.bus.ui.gain.setTargetAtTime(settings.sfxVolume * 0.8, t, 0.05);
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  _noiseBuf(kind, seconds) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'white') d[i] = w;
      else if (kind === 'pink') {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11; b6 = w * 0.115926;
      } else { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    }
    return buf;
  }

  // Impulsantwort für Hall: Dauer in s, Helligkeit 0..1
  setReverb(seconds = 2, bright = 0.5) {
    if (!this.ctx) return;
    const ctx = this.ctx, rate = ctx.sampleRate, n = Math.floor(rate * seconds);
    const buf = ctx.createBuffer(2, n, rate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const env = Math.pow(1 - t, 2.2) * (i < rate * 0.01 ? i / (rate * 0.01) : 1);
        const w = Math.random() * 2 - 1;
        lp += (w - lp) * (0.08 + bright * 0.7) * (1 - t * 0.6);
        d[i] = lp * env;
      }
    }
    this.reverb.buffer = buf;
    this.reverbSeconds = seconds;
  }

  setReverbMix(v) { if (this.revSend) this.revSend.gain.setTargetAtTime(v, this.now, 0.3); }

  setMuffle(freq) { if (this.muffle) this.muffle.frequency.setTargetAtTime(freq, this.now, 0.15); }

  // ---------------------------------------------------------------- Hörer

  updateListener(camera) {
    if (!this.ctx) return;
    const L = this.ctx.listener;
    const p = camera.getWorldPosition(this._lp || (this._lp = camera.position.clone()));
    const e = camera.matrixWorld.elements;
    const fx = -e[8], fy = -e[9], fz = -e[10], ux = e[4], uy = e[5], uz = e[6];
    const t = this.now;
    if (L.positionX) {
      L.positionX.setTargetAtTime(p.x, t, 0.02); L.positionY.setTargetAtTime(p.y, t, 0.02); L.positionZ.setTargetAtTime(p.z, t, 0.02);
      L.forwardX.setTargetAtTime(fx, t, 0.02); L.forwardY.setTargetAtTime(fy, t, 0.02); L.forwardZ.setTargetAtTime(fz, t, 0.02);
      L.upX.setTargetAtTime(ux, t, 0.02); L.upY.setTargetAtTime(uy, t, 0.02); L.upZ.setTargetAtTime(uz, t, 0.02);
    } else {
      L.setPosition(p.x, p.y, p.z); L.setOrientation(fx, fy, fz, ux, uy, uz);
    }
    this.listenerPos = p;
  }

  // ---------------------------------------------------------------- Bausteine

  // Ausgang: 2D (bus) oder 3D (pos) mit Hall-Send; gibt Eingangsknoten zurück
  out({ bus = 'sfx', pos = null, vol = 1, rev = 0.3, ref = 1.5, roll = 1.1, max = 60 } = {}) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = vol;
    let tail = g;
    let panner = null;
    if (pos) {
      panner = ctx.createPanner();
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = ref;
      panner.rolloffFactor = roll;
      panner.maxDistance = max;
      if (panner.positionX) { panner.positionX.value = pos.x; panner.positionY.value = pos.y; panner.positionZ.value = pos.z; }
      else panner.setPosition(pos.x, pos.y, pos.z);
      g.connect(panner);
      tail = panner;
    }
    tail.connect(this.bus[bus]);
    if (rev > 0) {
      const s = ctx.createGain();
      s.gain.value = rev;
      tail.connect(s).connect(this.revSend);
    }
    return { input: g, panner };
  }

  osc(type, freq, t0, t1, dest) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    o.connect(dest);
    o.start(t0);
    o.stop(t1);
    return o;
  }

  noiseSrc(kind, t0, t1, dest, rate = 1) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.noise[kind];
    s.loop = true;
    s.playbackRate.value = rate;
    s.connect(dest);
    s.start(t0, Math.random() * 2);
    s.stop(t1);
    return s;
  }

  filt(type, freq, q = 1, dest) {
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    if (dest) f.connect(dest);
    return f;
  }

  env(gainNode, t, a, peak, d, sustain = 0, hold = 0, r = 0.05) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.linearRampToValueAtTime(peak, t + a);
    if (sustain > 0) {
      g.setTargetAtTime(sustain, t + a, d / 3);
      g.setTargetAtTime(0.0001, t + a + hold, r / 3);
    } else g.exponentialRampToValueAtTime(0.0001, t + a + d);
  }

  vca(dest, v = 0) {
    const g = this.ctx.createGain();
    g.gain.value = v;
    g.connect(dest);
    return g;
  }

  // Metallisches Klingen (inharmonische Partialtöne)
  _ring(dest, t, f, dur, amp = 0.2, ratios = [1, 2.76, 5.4, 8.93]) {
    ratios.forEach((r, i) => {
      const g = this.vca(dest);
      this.env(g, t, 0.002, amp / (i + 1), dur / (1 + i * 0.6));
      this.osc('sine', f * r, t, t + dur + 0.1, g);
    });
  }

  _burst(dest, t, dur, freq, q, amp, kind = 'white') {
    const f = this.filt('bandpass', freq, q, dest);
    const g = this.vca(f);
    this.env(g, t, 0.001, amp, dur);
    this.noiseSrc(kind, t, t + dur + 0.05, g);
  }

  _thump(dest, t, f0, f1, dur, amp) {
    const g = this.vca(dest);
    this.env(g, t, 0.003, amp, dur);
    const o = this.osc('sine', f0, t, t + dur + 0.05, g);
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  }

  // ---------------------------------------------------------------- Einmal-Geräusche

  play(name, opts = {}) {
    if (!this.ready) return;
    const fn = SFX[name];
    if (!fn) { console.warn('SFX fehlt:', name); return; }
    try { return fn(this, opts); } catch (e) { console.warn('SFX-Fehler', name, e); }
  }

  // Dauerschleifen mit Steuerung
  loop(name, opts = {}) {
    if (!this.ready) return null;
    const fn = LOOPS[name];
    if (!fn) { console.warn('Loop fehlt:', name); return null; }
    const h = fn(this, opts);
    h.name = name;
    this.loops.add(h);
    const stop = h.stop;
    h.stop = (fade = 0.6) => {
      if (h.stopped) return;
      h.stopped = true;
      this.loops.delete(h);
      stop(fade);
    };
    return h;
  }

  stopAllLoops(fade = 0.8) { for (const h of [...this.loops]) h.stop(fade); }
}

export const audio = new AudioEngine();

// Hilfsfunktion: Handle für Schleifen bauen
function handle(A, outNode, sources, extra = {}) {
  return {
    out: outNode,
    setVol(v, tc = 0.2) { outNode.input.gain.setTargetAtTime(v, A.now, tc); },
    setPos(p) {
      const pn = outNode.panner;
      if (!pn) return;
      if (pn.positionX) { pn.positionX.setTargetAtTime(p.x, A.now, 0.05); pn.positionY.setTargetAtTime(p.y, A.now, 0.05); pn.positionZ.setTargetAtTime(p.z, A.now, 0.05); }
      else pn.setPosition(p.x, p.y, p.z);
    },
    stop(fade = 0.6) {
      const t = A.now;
      outNode.input.gain.setTargetAtTime(0.0001, t, fade / 4);
      for (const s of sources) { try { s.stop(t + fade + 0.1); } catch { /* */ } }
      if (extra.onStop) extra.onStop();
      setTimeout(() => { try { outNode.input.disconnect(); outNode.panner?.disconnect(); } catch { /* */ } }, (fade + 0.5) * 1000);
    },
    ...extra,
  };
}

// ============================================================================
// EINMAL-GERÄUSCHE
// ============================================================================

const SFX = {
  // Aufzugsgong: warm, zwei Töne
  ding(A, { pos = null, vol = 0.5, pitch = 1, detune = 0 } = {}) {
    const t = A.now + 0.01;
    const o = A.out({ pos, vol, rev: 0.6, bus: 'sfx' });
    A._ring(o.input, t, 784 * pitch, 2.8, 0.22, [1, 2.0, 3.01, 4.2]);
    A._ring(o.input, t + 0.42, 622 * pitch * (1 + detune), 3.4, 0.22, [1, 2.0, 3.01, 4.2]);
  },

  // Verstimmter Gong – Signatur des Portiers
  dingWrong(A, { pos = null, vol = 0.6 } = {}) {
    const t = A.now + 0.01;
    const o = A.out({ pos, vol, rev: 0.8 });
    A._ring(o.input, t, 523, 4, 0.25, [1, 2.08, 3.3, 4.9]);
    A._ring(o.input, t + 0.7, 494, 5, 0.25, [1, 1.93, 3.1, 5.3]);
  },

  doorSlide(A, { pos = null, vol = 0.5, dur = 1.3 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.25 });
    const f = A.filt('bandpass', 500, 1.2, o.input);
    const g = A.vca(f);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.15);
    g.gain.setValueAtTime(0.5, t + dur - 0.2);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.frequency.setValueAtTime(350, t);
    f.frequency.linearRampToValueAtTime(900, t + dur);
    A.noiseSrc('pink', t, t + dur + 0.1, g);
    A._thump(o.input, t + dur - 0.05, 90, 45, 0.25, 0.5);
    A._burst(o.input, t + dur - 0.04, 0.08, 2500, 3, 0.2);
  },

  // Scherengitter: Rasseln + Klingen
  gate(A, { pos = null, vol = 0.45, dur = 1.5 } = {}) {
    const t0 = A.now;
    const o = A.out({ pos, vol, rev: 0.3 });
    const n = 18;
    for (let i = 0; i < n; i++) {
      const t = t0 + (i / n) * dur + rnd(-0.02, 0.02);
      A._burst(o.input, t, 0.03, rnd(2200, 4800), 6, rnd(0.15, 0.35));
      if (i % 4 === 0) A._ring(o.input, t, rnd(900, 1500), 0.25, 0.05);
    }
    A._thump(o.input, t0 + dur, 140, 70, 0.15, 0.4);
    A._ring(o.input, t0 + dur, 620, 0.9, 0.12, [1, 2.3, 4.1]);
  },

  clunk(A, { pos = null, vol = 0.7 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.4 });
    A._thump(o.input, t, 110, 38, 0.5, 0.9);
    A._burst(o.input, t, 0.12, 400, 1, 0.5, 'brown');
    A._ring(o.input, t, 180, 1.2, 0.08, [1, 2.4, 3.9]);
  },

  // Schwerer Stoß der Kabine (Bremsen, Aufsetzen)
  jolt(A, { vol = 0.9 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.5 });
    A._thump(o.input, t, 70, 28, 0.9, 1);
    A._burst(o.input, t, 0.6, 250, 0.7, 0.6, 'brown');
    A._ring(o.input, t + 0.02, 95, 2.5, 0.15, [1, 2.2, 3.7, 5.1]);
    for (let i = 0; i < 6; i++) A._burst(o.input, t + rnd(0, 0.5), 0.04, rnd(1500, 4000), 5, 0.2);
  },

  // Notbremse: Kreischen von Metall auf Metall
  brakeScreech(A, { vol = 0.6, dur = 3 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.6 });
    for (const [f, q] of [[2100, 18], [3300, 22], [4700, 25]]) {
      const bp = A.filt('bandpass', f, q, o.input);
      const g = A.vca(bp);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.9, t + 0.1);
      g.gain.setValueAtTime(0.9, t + dur - 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      bp.frequency.setValueAtTime(f, t);
      bp.frequency.linearRampToValueAtTime(f * 0.8, t + dur);
      A.noiseSrc('white', t, t + dur + 0.1, g);
    }
    const g2 = A.vca(o.input);
    A.env(g2, t, 0.05, 0.12, dur, 0.12, dur - 0.5, 0.5);
    const s = A.osc('sawtooth', 1800, t, t + dur, g2);
    s.frequency.setValueAtTime(1800, t);
    s.frequency.linearRampToValueAtTime(1300, t + dur);
  },

  cableCreak(A, { pos = null, vol = 0.35 } = {}) {
    const t = A.now, dur = rnd(0.7, 1.6);
    const o = A.out({ pos, vol, rev: 0.6 });
    const bp = A.filt('bandpass', rnd(600, 1100), 6, o.input);
    const am = A.vca(bp);
    const g = A.ctx.createGain(); g.gain.value = 0; g.connect(am.gain);
    am.gain.value = 0;
    const lfo = A.osc('square', rnd(18, 35), t, t + dur, g);
    lfo.frequency.linearRampToValueAtTime(rnd(10, 50), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.6, t + dur * 0.3); g.gain.linearRampToValueAtTime(0, t + dur);
    const s = A.osc('sawtooth', rnd(80, 140), t, t + dur, am);
    s.frequency.linearRampToValueAtTime(rnd(70, 180), t + dur);
  },

  footstep(A, { surface = 'stone', intensity = 0.7, pos = null, vol = 1 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol: vol * (0.35 + intensity * 0.45), rev: 0.22, ref: 1.2 });
    const k = intensity;
    switch (surface) {
      case 'carpet':
        A._burst(o.input, t, 0.09, rnd(400, 700), 0.8, 0.5 * k, 'pink');
        A._thump(o.input, t, 80, 50, 0.08, 0.35 * k);
        break;
      case 'metal': case 'grate':
        A._burst(o.input, t, 0.02, rnd(2500, 4000), 3, 0.5 * k);
        A._ring(o.input, t, rnd(300, 520), 0.35, 0.12 * k, [1, 2.7, 4.3, 6.1]);
        A._thump(o.input, t, 120, 60, 0.07, 0.4 * k);
        break;
      case 'wood':
        A._thump(o.input, t, rnd(130, 170), 80, 0.09, 0.55 * k);
        A._burst(o.input, t, 0.04, rnd(700, 1000), 2, 0.35 * k);
        if (Math.random() < 0.25) SFX.cableCreak(A, { pos, vol: 0.06 });
        break;
      case 'water': {
        A._burst(o.input, t, 0.25, rnd(1200, 2400), 0.7, 0.55 * k);
        A._burst(o.input, t + 0.03, 0.35, rnd(400, 700), 0.6, 0.4 * k, 'pink');
        for (let i = 0; i < 3; i++) {
          const g = A.vca(o.input); const tt = t + rnd(0.02, 0.3);
          A.env(g, tt, 0.002, 0.08 * k, 0.05);
          const b = A.osc('sine', rnd(900, 1800), tt, tt + 0.08, g); b.frequency.exponentialRampToValueAtTime(rnd(1800, 3200), tt + 0.05);
        }
        break;
      }
      case 'flesh': {
        const f = A.filt('lowpass', 900, 6, o.input);
        const g = A.vca(f);
        A.env(g, t, 0.01, 0.6 * k, 0.25);
        f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(180, t + 0.25);
        A.noiseSrc('pink', t, t + 0.3, g);
        A._thump(o.input, t, 70, 40, 0.12, 0.4 * k);
        break;
      }
      case 'salt':
        for (let i = 0; i < 5; i++) A._burst(o.input, t + i * rnd(0.006, 0.014), 0.012, rnd(3000, 6000), 2, 0.25 * k);
        A._thump(o.input, t, 100, 55, 0.07, 0.35 * k);
        break;
      case 'tile':
        A._burst(o.input, t, 0.015, rnd(3000, 4500), 2.5, 0.55 * k);
        A._thump(o.input, t, 110, 60, 0.06, 0.4 * k);
        break;
      default: // Stein, Marmor, Beton
        A._burst(o.input, t, 0.02, rnd(1800, 3200), 1.8, 0.45 * k);
        A._burst(o.input, t + 0.01, 0.06, rnd(400, 700), 1, 0.2 * k, 'pink');
        A._thump(o.input, t, 95, 50, 0.07, 0.45 * k);
    }
  },

  heartbeat(A, { vol = 0.6, rate = 1 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.05, bus: 'ui' });
    A._thump(o.input, t, 62, 38, 0.16, 1);
    A._thump(o.input, t + 0.28 / rate, 55, 34, 0.14, 0.7);
  },

  breath(A, { vol = 0.25, fast = 0, inhale = true } = {}) {
    const t = A.now, dur = (inhale ? 0.9 : 1.1) * (1 - fast * 0.55);
    const o = A.out({ vol, rev: 0.05, bus: 'ui' });
    const f1 = A.filt('bandpass', inhale ? 1500 : 900, 1.4, o.input);
    const f2 = A.filt('bandpass', inhale ? 2800 : 1800, 2, o.input);
    const g = A.ctx.createGain(); g.gain.value = 0;
    g.connect(f1); g.connect(f2);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.55, t + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    A.noiseSrc('white', t, t + dur + 0.05, g);
  },

  crankTick(A, { vol = 0.35 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.1, bus: 'sfx' });
    A._burst(o.input, t, 0.012, rnd(3500, 5000), 4, 0.8);
    const g = A.vca(o.input);
    A.env(g, t, 0.01, 0.06, 0.12);
    A.osc('sawtooth', rnd(420, 520), t, t + 0.15, g);
  },

  lampClick(A, { vol = 0.4, on = true } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.05, bus: 'sfx' });
    A._burst(o.input, t, 0.01, on ? 3800 : 3000, 5, 1);
    A._burst(o.input, t + 0.035, 0.01, on ? 2600 : 2200, 5, 0.6);
  },

  pickup(A, { vol = 0.4 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.1, bus: 'sfx' });
    A._burst(o.input, t, 0.12, 1800, 0.7, 0.3, 'pink');
    A._ring(o.input, t + 0.05, 1400, 0.3, 0.05);
  },

  paper(A, { vol = 0.45 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.08, bus: 'sfx' });
    for (let i = 0; i < 7; i++) A._burst(o.input, t + rnd(0, 0.45), rnd(0.03, 0.09), rnd(2500, 6500), 0.8, rnd(0.2, 0.5));
  },

  cellInsert(A, { pos = null, vol = 0.6 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.4 });
    A._thump(o.input, t, 160, 80, 0.12, 0.7);
    A._burst(o.input, t, 0.03, 2800, 3, 0.6);
    const g = A.vca(o.input);
    A.env(g, t + 0.1, 0.4, 0.12, 1.2);
    const s = A.osc('sawtooth', 60, t + 0.1, t + 1.8, A.filt('lowpass', 400, 2, g));
    s.frequency.linearRampToValueAtTime(120, t + 1.2);
    A._ring(o.input, t + 0.6, 1320, 1.6, 0.06, [1, 1.5, 2.01]);
  },

  powerUp(A, { pos = null, vol = 0.6 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.5 });
    const g = A.vca(A.filt('lowpass', 1200, 3, o.input));
    A.env(g, t, 1.2, 0.25, 2.5);
    const s = A.osc('sawtooth', 40, t, t + 3.6, g);
    s.frequency.exponentialRampToValueAtTime(110, t + 2.2);
    SFX.clunk(A, { pos, vol: 0.5 });
  },

  sparks(A, { pos = null, vol = 0.5 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.3 });
    for (let i = 0; i < 16; i++) A._burst(o.input, t + rnd(0, 0.6), rnd(0.005, 0.02), rnd(3000, 9000), 1, rnd(0.2, 0.8));
    const g = A.vca(o.input); A.env(g, t, 0.005, 0.2, 0.2);
    A.osc('square', 120, t, t + 0.25, A.filt('bandpass', 2400, 2, g));
  },

  lightBurst(A, { pos = null, vol = 0.8 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.5 });
    A._burst(o.input, t, 0.05, 3000, 0.8, 1);
    A._ring(o.input, t, rnd(2800, 3600), 0.6, 0.1, [1, 1.47, 2.09, 2.9]);
    for (let i = 0; i < 10; i++) A._burst(o.input, t + rnd(0.05, 0.5), 0.01, rnd(4000, 9000), 2, rnd(0.1, 0.3));
  },

  komBeep(A, { vol = 0.3, n = 2 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.02, bus: 'ui' });
    for (let i = 0; i < n; i++) {
      const g = A.vca(o.input);
      A.env(g, t + i * 0.16, 0.003, 0.25, 0.09, 0.25, 0.08, 0.02);
      A.osc('square', 2350, t + i * 0.16, t + i * 0.16 + 0.12, A.filt('lowpass', 5000, 0.7, g));
    }
  },

  phonePickup(A, { vol = 0.5 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.1, bus: 'sfx' });
    A._burst(o.input, t, 0.02, 2000, 3, 0.9);
    A._thump(o.input, t, 140, 70, 0.08, 0.5);
    A._ring(o.input, t, 1100, 0.2, 0.04);
  },

  uiHover(A) {
    const t = A.now;
    const o = A.out({ vol: 0.12, rev: 0.05, bus: 'ui' });
    A._ring(o.input, t, 1760, 0.12, 0.05, [1, 3.01]);
  },
  uiSelect(A) {
    const t = A.now;
    const o = A.out({ vol: 0.3, rev: 0.3, bus: 'ui' });
    A._ring(o.input, t, 880, 0.6, 0.1, [1, 2, 3.01]);
    A._thump(o.input, t, 90, 50, 0.1, 0.3);
  },

  // Schreckmomente
  stinger(A, { kind = 'hard', vol = 0.8 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.7, bus: 'music' });
    if (kind === 'hard') {
      A._burst(o.input, t, 0.5, 1800, 0.4, 0.8);
      A._thump(o.input, t, 90, 25, 1.4, 1);
      [233, 247, 349, 370, 523, 554].forEach((f, i) => {
        const g = A.vca(A.filt('lowpass', 2500, 1, o.input));
        A.env(g, t, 0.01, 0.12, 2.2);
        const s = A.osc('sawtooth', f, t, t + 2.5, g);
        s.detune.linearRampToValueAtTime(-60 - i * 20, t + 2.2);
      });
      A._ring(o.input, t, 440, 3, 0.1, [1, 2.9, 5.1, 7.3]);
    } else if (kind === 'soft') {
      [110, 116.5, 164.8, 174.6].forEach((f) => {
        const g = A.vca(A.filt('lowpass', 900, 1, o.input));
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.1, t + 1.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
        A.osc('sawtooth', f, t, t + 3.6, g);
      });
    } else if (kind === 'reveal') {
      // tiefer Glockenschlag + Chorhauch
      A._ring(o.input, t, 65, 7, 0.35, [1, 2.0, 2.76, 4.1, 5.4]);
      A._thump(o.input, t, 55, 30, 2, 0.8);
    } else if (kind === 'riser') {
      const g = A.vca(A.filt('bandpass', 800, 1, o.input));
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.5, t + 2.6);
      g.gain.linearRampToValueAtTime(0.0001, t + 2.75);
      A.noiseSrc('white', t, t + 2.8, g, 1);
      const s = A.osc('sawtooth', 80, t, t + 2.8, g);
      s.frequency.exponentialRampToValueAtTime(1600, t + 2.7);
    }
  },

  whisper(A, { pos = null, vol = 0.35, dur = 1.6 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.8, ref: 1 });
    const vowels = [[800, 1150], [450, 800], [325, 700], [600, 1700], [270, 2300]];
    const src = A.ctx.createGain(); src.gain.value = 0;
    A.noiseSrc('white', t, t + dur + 0.1, src);
    const f1 = A.filt('bandpass', 800, 8, o.input), f2 = A.filt('bandpass', 1500, 10, o.input), f3 = A.filt('highpass', 4000, 0.7, o.input);
    src.connect(f1); src.connect(f2);
    const hg = A.vca(f3, 0.15); src.connect(hg);
    const syl = Math.floor(dur * rnd(4, 6));
    for (let i = 0; i < syl; i++) {
      const ts = t + (i / syl) * dur;
      const v = vowels[Math.floor(Math.random() * vowels.length)];
      f1.frequency.setTargetAtTime(v[0], ts, 0.03);
      f2.frequency.setTargetAtTime(v[1], ts, 0.03);
      src.gain.setTargetAtTime(rnd(0.5, 1), ts, 0.02);
      src.gain.setTargetAtTime(0.05, ts + (dur / syl) * 0.6, 0.03);
    }
    src.gain.setTargetAtTime(0, t + dur, 0.05);
  },

  // -------- Monster
  passengerCrack(A, { pos = null, vol = 0.8 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.4, ref: 1.2 });
    const n = Math.floor(rnd(3, 7));
    for (let i = 0; i < n; i++) {
      const tt = t + rnd(0, 0.25);
      A._burst(o.input, tt, 0.008, rnd(1200, 3500), 3, rnd(0.5, 1));
      A._thump(o.input, tt, rnd(200, 400), 90, 0.03, 0.3);
    }
    SFX.cableCreak(A, { pos, vol: 0.15 });
  },

  passengerShuffle(A, { pos = null, vol = 0.5 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.4 });
    for (let i = 0; i < 4; i++) {
      A._burst(o.input, t + i * 0.09, 0.08, rnd(500, 900), 0.8, 0.4, 'pink');
      A._thump(o.input, t + i * 0.09, 90, 50, 0.05, 0.3);
    }
  },

  listenerClick(A, { pos = null, vol = 0.7, n = 0 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.5, ref: 1.5 });
    const count = n || Math.floor(rnd(4, 9));
    for (let i = 0; i < count; i++) {
      const tt = t + i * rnd(0.05, 0.09);
      A._burst(o.input, tt, 0.006, rnd(2500, 4200), 8, 0.9);
      A._thump(o.input, tt, 700, 300, 0.012, 0.3);
    }
    const g = A.vca(o.input); A.env(g, t, 0.05, 0.12, count * 0.07 + 0.2);
    const s = A.osc('sawtooth', rnd(45, 60), t, t + count * 0.08 + 0.3, A.filt('lowpass', 500, 4, g));
    s.frequency.linearRampToValueAtTime(35, t + count * 0.08);
  },

  listenerBreath(A, { pos = null, vol = 0.5 } = {}) {
    const t = A.now, dur = rnd(1, 1.8);
    const o = A.out({ pos, vol, rev: 0.5 });
    const f = A.filt('bandpass', rnd(500, 800), 3, o.input);
    const g = A.vca(f);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.7, t + dur * 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    A.noiseSrc('pink', t, t + dur + 0.1, g);
    const gr = A.vca(o.input); A.env(gr, t, 0.2, 0.1, dur);
    A.osc('sawtooth', rnd(30, 42), t, t + dur, A.filt('lowpass', 300, 5, gr));
  },

  listenerShriek(A, { pos = null, vol = 0.9 } = {}) {
    const t = A.now, dur = 1.5;
    const o = A.out({ pos, vol, rev: 0.8, ref: 3 });
    const mod = A.ctx.createGain(); mod.gain.value = 0;
    const car = A.osc('sawtooth', 780, t, t + dur, A.filt('bandpass', 1800, 1.2, (() => { const g = A.vca(o.input); A.env(g, t, 0.05, 0.4, dur); return g; })()));
    mod.connect(car.frequency);
    A.osc('sine', 1310, t, t + dur, mod);
    mod.gain.setValueAtTime(200, t); mod.gain.linearRampToValueAtTime(1400, t + dur * 0.5); mod.gain.linearRampToValueAtTime(300, t + dur);
    car.frequency.setValueAtTime(780, t); car.frequency.linearRampToValueAtTime(1150, t + 0.3); car.frequency.linearRampToValueAtTime(520, t + dur);
    A._burst(o.input, t, dur, 3000, 0.5, 0.35);
  },

  porterStep(A, { pos = null, vol = 0.9 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.5, ref: 2.5 });
    A._thump(o.input, t, 70, 30, 0.35, 1);
    A._burst(o.input, t, 0.1, 300, 0.8, 0.5, 'brown');
    if (Math.random() < 0.4) SFX.cableCreak(A, { pos, vol: 0.12 });
  },

  porterTick(A, { pos = null, vol = 0.5 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.4, ref: 2 });
    A._burst(o.input, t, 0.006, 3200, 10, 1);
    A._ring(o.input, t, 2100, 0.12, 0.06, [1, 1.7]);
  },

  // Rufsignal der Kabine / schwere Glocke
  bell(A, { pos = null, vol = 0.7, f = 98 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.9, ref: 6 });
    A._ring(o.input, t, f, 8, 0.3, [0.5, 1, 1.19, 1.5, 2.0, 2.52, 3.0, 4.07]);
  },

  drip(A, { pos = null, vol = 0.35 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.7, ref: 1 });
    const g = A.vca(o.input); A.env(g, t, 0.001, 0.3, 0.12);
    const s = A.osc('sine', rnd(900, 1500), t, t + 0.15, g);
    s.frequency.exponentialRampToValueAtTime(rnd(1800, 2600), t + 0.08);
  },

  thunder(A, { vol = 0.8, dist = 0.5 } = {}) {
    const t = A.now, dur = rnd(3, 6);
    const o = A.out({ vol, rev: 0.6, bus: 'amb' });
    const f = A.filt('lowpass', 1400 - dist * 1000, 0.7, o.input);
    const g = A.vca(f);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(1, t + 0.05 + dist * 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    A.noiseSrc('brown', t, t + dur + 0.1, g, 0.7);
    if (dist < 0.4) for (let i = 0; i < 8; i++) A._burst(o.input, t + rnd(0, 0.3), 0.05, rnd(800, 3000), 0.6, 0.4);
  },

  siren(A, { vol = 0.12 } = {}) {
    const t = A.now, dur = rnd(4, 7);
    const o = A.out({ vol, rev: 0.8, bus: 'amb' });
    const g = A.vca(A.filt('bandpass', 900, 1, o.input));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.4, t + 1); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const s = A.osc('triangle', 650, t, t + dur, g);
    for (let i = 0; i < dur * 1.2; i++) { s.frequency.linearRampToValueAtTime(i % 2 ? 650 : 880, t + i / 1.2); }
  },

  flyby(A, { vol = 0.2 } = {}) {
    const t = A.now, dur = rnd(2.5, 4);
    const o = A.out({ vol, rev: 0.7, bus: 'amb' });
    const f = A.filt('bandpass', 300, 2, o.input);
    const g = A.vca(f);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.7, t + dur * 0.5); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.frequency.setValueAtTime(250, t); f.frequency.exponentialRampToValueAtTime(1600, t + dur * 0.5); f.frequency.exponentialRampToValueAtTime(300, t + dur);
    A.noiseSrc('pink', t, t + dur, g);
    const hum = A.vca(o.input); A.env(hum, t, dur * 0.5, 0.05, dur * 0.5);
    const s = A.osc('sawtooth', 140, t, t + dur, A.filt('lowpass', 600, 1, hum));
    s.frequency.linearRampToValueAtTime(110, t + dur);
  },

  slam(A, { pos = null, vol = 0.9 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.9, ref: 3 });
    A._thump(o.input, t, 90, 30, 0.6, 1);
    A._burst(o.input, t, 0.3, 800, 0.5, 0.8, 'pink');
    A._ring(o.input, t, 140, 1.5, 0.15, [1, 2.3, 3.8]);
  },

  knock(A, { pos = null, vol = 0.8, n = 3 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.6, ref: 2 });
    for (let i = 0; i < n; i++) {
      const tt = t + i * rnd(0.28, 0.38);
      A._thump(o.input, tt, 160, 70, 0.12, 0.9);
      A._burst(o.input, tt, 0.05, 900, 1.5, 0.5);
      A._ring(o.input, tt, 230, 0.4, 0.08, [1, 2.4, 3.9]);
    }
  },

  splash(A, { pos = null, vol = 0.7 } = {}) {
    SFX.footstep(A, { surface: 'water', intensity: 1, pos, vol });
    SFX.footstep(A, { surface: 'water', intensity: 0.8, pos, vol: vol * 0.7 });
  },

  hide(A, { vol = 0.5 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.2 });
    A._burst(o.input, t, 0.25, 900, 0.6, 0.5, 'pink');
    A._thump(o.input, t + 0.25, 140, 60, 0.12, 0.6);
    A._ring(o.input, t + 0.25, 420, 0.4, 0.05, [1, 2.7, 4.4]);
  },

  death(A, { vol = 1 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.9, bus: 'music' });
    SFX.stinger(A, { kind: 'hard', vol: 0.9 });
    A._thump(o.input, t + 0.3, 50, 20, 3, 1);
    const g = A.vca(o.input);
    g.gain.setValueAtTime(0.3, t + 0.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    A.noiseSrc('white', t + 0.2, t + 4.2, A.filt('bandpass', 1200, 0.5, g));
  },

  // -------- Kampf, Waffen, Tiere
  // Salzkanone der Kabine: dumpfer Schlag, Salz prasselt
  saltShot(A, { pos = null, vol = 0.9 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.6, ref: 3 });
    A._thump(o.input, t, 130, 35, 0.45, 1);
    A._burst(o.input, t, 0.12, 2400, 0.7, 1);
    A._burst(o.input, t + 0.05, 0.7, 6000, 0.5, 0.25, 'pink');
    A._ring(o.input, t, 180, 0.8, 0.08, [1, 2.3, 3.7]);
  },

  // Salzflinte: laut wie das Jüngste Gericht
  shotgun(A, { pos = null, vol = 1 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.85, ref: 4 });
    A._thump(o.input, t, 95, 28, 0.6, 1);
    A._burst(o.input, t, 0.07, 3000, 0.6, 1);
    A._burst(o.input, t + 0.01, 0.45, 900, 0.5, 0.6, 'brown');
    A._burst(o.input, t + 0.06, 0.9, 5500, 0.4, 0.2, 'pink');
  },

  // Nachladen: Riegel auf, Patrone, Riegel zu
  reload(A, { vol = 0.5 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.15 });
    [0, 0.35, 0.8].forEach((dt, i) => {
      A._burst(o.input, t + dt, 0.012, i === 1 ? 1600 : 2600, 6, 0.9);
      A._thump(o.input, t + dt, 420, 180, 0.03, 0.4);
    });
  },

  // Luftzug eines Schlags oder Wurfs
  swing(A, { vol = 0.4, heavy = false } = {}) {
    const t = A.now, dur = heavy ? 0.38 : 0.22;
    const o = A.out({ vol, rev: 0.1 });
    const f = A.filt('bandpass', 400, 1.2, o.input);
    const g = A.vca(f);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(heavy ? 900 : 2200, t + dur * 0.5); f.frequency.exponentialRampToValueAtTime(300, t + dur);
    A.noiseSrc('pink', t, t + dur + 0.05, g);
  },

  // Treffer auf Metall / Stein
  hitMetal(A, { pos = null, vol = 0.7 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.5 });
    A._thump(o.input, t, 220, 90, 0.08, 0.6);
    A._ring(o.input, t, rnd(700, 950), 0.9, 0.18, [1, 2.76, 5.4]);
    A._burst(o.input, t, 0.04, 3200, 1, 0.5);
  },

  // Treffer auf etwas Weiches
  hitFlesh(A, { pos = null, vol = 0.7 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.3 });
    A._thump(o.input, t, 140, 50, 0.15, 0.9);
    A._burst(o.input, t, 0.1, 700, 0.8, 0.6, 'pink');
  },

  // Biss: nasses Knacken
  bite(A, { pos = null, vol = 0.8, small = false } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.3 });
    A._burst(o.input, t, small ? 0.05 : 0.14, small ? 2400 : 900, 1, 0.8, 'pink');
    A._thump(o.input, t, small ? 500 : 220, small ? 200 : 60, small ? 0.04 : 0.12, 0.7);
    const n = small ? 2 : 5;
    for (let i = 0; i < n; i++) A._burst(o.input, t + 0.02 + i * rnd(0.015, 0.04), 0.006, rnd(1500, 4000), 4, 0.6);
  },

  // Spieler wird getroffen: dumpfer Schlag, danach Ohrenklingeln
  hurt(A, { vol = 0.8, heavy = false } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.15 });
    A._thump(o.input, t, 90, 38, heavy ? 0.5 : 0.25, 1);
    A._burst(o.input, t, 0.1, 500, 0.7, 0.6, 'brown');
    const g = A.vca(o.input);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(heavy ? 0.06 : 0.03, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + (heavy ? 3.5 : 1.6));
    A.osc('sine', rnd(3300, 3900), t, t + 3.6, g);
  },

  // Verband anlegen: Stoff reißt, wird gewickelt
  bandage(A, { vol = 0.5 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.1 });
    const f = A.filt('highpass', 1800, 0.7, o.input);
    const g = A.vca(f);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.7, t + 0.05); g.gain.linearRampToValueAtTime(0.0001, t + 0.35);
    A.noiseSrc('white', t, t + 0.4, g);
    for (let i = 0; i < 3; i++) A._burst(o.input, t + 0.5 + i * 0.28, 0.2, 1200, 0.6, 0.3, 'pink');
  },

  // Rattenquieken (n Rufe)
  ratSqueak(A, { pos = null, vol = 0.5, n = 0, dying = false } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.4, ref: 0.8 });
    const count = n || Math.floor(rnd(1, 4));
    for (let i = 0; i < count; i++) {
      const tt = t + i * rnd(0.08, 0.2), dur = dying ? 0.35 : rnd(0.05, 0.13);
      const g = A.vca(o.input); A.env(g, tt, 0.005, 0.25, dur);
      const s = A.osc('triangle', rnd(2600, 4200), tt, tt + dur + 0.05, g);
      s.frequency.setValueAtTime(s.frequency.value, tt);
      s.frequency.linearRampToValueAtTime(s.frequency.value * (dying ? 0.5 : rnd(0.8, 1.25)), tt + dur);
    }
  },

  // Trippeln vieler kleiner Füße
  ratScurry(A, { pos = null, vol = 0.5 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.3, ref: 0.8 });
    for (let i = 0; i < 26; i++) A._burst(o.input, t + rnd(0, 0.7), 0.004, rnd(2500, 6000), 5, rnd(0.3, 0.8));
  },

  // Leuchtstoffröhre klickt und brummt
  fluorescentPing(A, { pos = null, vol = 0.4 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.5 });
    A._ring(o.input, t, 2400, 0.3, 0.1, [1, 1.9]);
    const g = A.vca(A.filt('bandpass', 400, 2, o.input)); A.env(g, t, 0.02, 0.2, 0.8);
    A.osc('sawtooth', 100, t, t + 0.9, g);
  },

  // Leuchtfackel zünden
  flareIgnite(A, { pos = null, vol = 0.7 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.4 });
    const f = A.filt('bandpass', 1500, 0.8, o.input);
    const g = A.vca(f);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.9, t + 0.25); g.gain.linearRampToValueAtTime(0.35, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    f.frequency.setValueAtTime(700, t); f.frequency.exponentialRampToValueAtTime(3500, t + 0.3);
    A.noiseSrc('white', t, t + 1.5, g);
    for (let i = 0; i < 10; i++) A._burst(o.input, t + rnd(0, 0.8), 0.008, rnd(2000, 5000), 3, 0.5);
  },

  // Klapper: Blechdose mit Schrauben
  rattle(A, { pos = null, vol = 0.8, dur = 1.2 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.5, ref: 2 });
    const n = Math.floor(dur * 14);
    for (let i = 0; i < n; i++) {
      const tt = t + rnd(0, dur);
      A._ring(o.input, tt, rnd(1100, 2600), 0.12, 0.05, [1, 2.4]);
      A._burst(o.input, tt, 0.01, rnd(2500, 5000), 3, 0.4);
    }
  },

  // Salz rieselt aus dem Sack
  saltPour(A, { pos = null, vol = 0.5 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.2 });
    const g = A.vca(A.filt('lowpass', 4000, 0.7, o.input));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.6, t + 0.15); g.gain.linearRampToValueAtTime(0.4, t + 1); g.gain.linearRampToValueAtTime(0.0001, t + 1.3);
    A.noiseSrc('pink', t, t + 1.35, g, 1.4);
    for (let i = 0; i < 20; i++) A._burst(o.input, t + rnd(0, 1.2), 0.004, rnd(3000, 7000), 4, 0.25);
  },
};

// ============================================================================
// SCHLEIFEN
// ============================================================================

const LOOPS = {
  // Antrieb der Kabine
  motor(A, { vol = 0.4 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.2, bus: 'sfx' });
    const lp = A.filt('lowpass', 260, 2, o.input);
    const g = A.vca(lp, 0.35);
    const s1 = A.osc('sawtooth', 48, t, t + 1e5, g);
    const s2 = A.osc('sawtooth', 96.4, t, t + 1e5, A.vca(lp, 0.12));
    const ng = A.vca(A.filt('lowpass', 500, 0.7, o.input), 0.5);
    const n = A.noiseSrc('brown', t, t + 1e5, ng);
    const whine = A.vca(A.filt('bandpass', 1800, 12, o.input), 0.02);
    const s3 = A.osc('sawtooth', 450, t, t + 1e5, whine);
    return handle(A, o, [s1, s2, n, s3], {
      setSpeed(v) {
        const k = Math.min(1, Math.abs(v) / 6);
        lp.frequency.setTargetAtTime(160 + k * 380, A.now, 0.3);
        s1.frequency.setTargetAtTime(40 + k * 16, A.now, 0.3);
        s2.frequency.setTargetAtTime(80 + k * 34, A.now, 0.3);
        s3.frequency.setTargetAtTime(300 + k * 500, A.now, 0.3);
        whine.gain.setTargetAtTime(0.005 + k * 0.03, A.now, 0.3);
      },
    });
  },

  // Wind im Schacht / auf dem Gerüst
  wind(A, { vol = 0.3, pos = null } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.3, bus: 'amb', pos });
    const bp = A.filt('bandpass', 400, 1.5, o.input);
    const g = A.vca(bp, 0.8);
    const n = A.noiseSrc('pink', t, t + 1e5, g);
    const lfo = A.osc('sine', 0.13, t, t + 1e5, (() => { const m = A.ctx.createGain(); m.gain.value = 250; m.connect(bp.frequency); return m; })());
    const lfo2 = A.osc('sine', 0.07, t, t + 1e5, (() => { const m = A.ctx.createGain(); m.gain.value = 0.35; m.connect(g.gain); return m; })());
    return handle(A, o, [n, lfo, lfo2]);
  },

  rain(A, { vol = 0.4, indoor = false } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.15, bus: 'amb' });
    const hp = A.filt('highpass', indoor ? 150 : 500, 0.5);
    const lp = A.filt('lowpass', indoor ? 900 : 7000, 0.5, o.input);
    hp.connect(lp);
    const g = A.vca(hp, 0.9);
    const n = A.noiseSrc('pink', t, t + 1e5, g);
    const dg = A.vca(A.filt('bandpass', 2500, 1, o.input), 0.25);
    const n2 = A.noiseSrc('white', t, t + 1e5, dg, 0.5);
    const h = handle(A, o, [n, n2], {
      setIndoor(v) { hp.frequency.setTargetAtTime(v ? 150 : 500, A.now, 0.5); lp.frequency.setTargetAtTime(v ? 900 : 7000, A.now, 0.5); },
    });
    return h;
  },

  // Ferne Stadt: Brummen, Sirenen, Gleiter
  city(A, { vol = 0.3 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.4, bus: 'amb' });
    const g = A.vca(A.filt('lowpass', 180, 0.7, o.input), 0.8);
    const n = A.noiseSrc('brown', t, t + 1e5, g);
    let alive = true;
    const tick = () => {
      if (!alive) return;
      const r = Math.random();
      if (r < 0.3) SFX.siren(A, { vol: 0.05 * vol / 0.3 });
      else if (r < 0.75) SFX.flyby(A, { vol: 0.1 * vol / 0.3 });
      setTimeout(tick, rnd(5000, 14000));
    };
    setTimeout(tick, 2000);
    return handle(A, o, [n], { onStop() { alive = false; } });
  },

  neon(A, { pos, vol = 0.12 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.1, ref: 0.8, roll: 1.6 });
    const g = A.vca(A.filt('bandpass', 240, 3, o.input), 0.5);
    const s = A.osc('sawtooth', 120, t, t + 1e5, g);
    const cg = A.vca(A.filt('highpass', 5000, 0.7, o.input), 0.08);
    const n = A.noiseSrc('white', t, t + 1e5, cg);
    return handle(A, o, [s, n], {
      flicker(off) { g.gain.setTargetAtTime(off ? 0.02 : 0.5, A.now, 0.01); },
    });
  },

  fluorescent(A, { pos, vol = 0.08 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.1, ref: 0.8, roll: 1.5 });
    const g = A.vca(o.input, 0.4);
    const s = A.osc('square', 100, t, t + 1e5, A.filt('lowpass', 600, 1, g));
    const w = A.vca(o.input, 0.015);
    const s2 = A.osc('sine', 8000 + Math.random() * 1500, t, t + 1e5, w);
    return handle(A, o, [s, s2]);
  },

  servers(A, { pos, vol = 0.12 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.2, ref: 1.5 });
    const n = A.noiseSrc('pink', t, t + 1e5, A.vca(A.filt('bandpass', 1400, 0.8, o.input), 0.6));
    const s = A.osc('sine', 3100 + Math.random() * 400, t, t + 1e5, A.vca(o.input, 0.02));
    return handle(A, o, [n, s]);
  },

  water(A, { vol = 0.25, pos = null } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.5, bus: 'amb', pos });
    const lp = A.filt('lowpass', 500, 1, o.input);
    const g = A.vca(lp, 0.6);
    const n = A.noiseSrc('brown', t, t + 1e5, g);
    const lfo = A.osc('sine', 0.2, t, t + 1e5, (() => { const m = A.ctx.createGain(); m.gain.value = 0.3; m.connect(g.gain); return m; })());
    return handle(A, o, [n, lfo]);
  },

  static(A, { vol = 0.15 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.05, bus: 'voice' });
    const g = A.vca(A.filt('bandpass', 2200, 0.6, o.input), 0.5);
    const n = A.noiseSrc('white', t, t + 1e5, g);
    let alive = true;
    const crackle = () => { if (!alive) return; A._burst(o.input, A.now, 0.01, rnd(1500, 5000), 2, rnd(0.3, 0.9)); setTimeout(crackle, rnd(40, 400)); };
    crackle();
    return handle(A, o, [n], { onStop() { alive = false; } });
  },

  // Brennende Leuchtfackel: Zischen mit Knistern
  flareBurn(A, { pos = null, vol = 0.3 } = {}) {
    const t = A.now;
    const o = A.out({ pos, vol, rev: 0.3, ref: 1.2 });
    const g = A.vca(A.filt('bandpass', 2600, 0.7, o.input), 0.45);
    const n = A.noiseSrc('white', t, t + 1e5, g);
    let alive = true;
    const crackle = () => { if (!alive) return; A._burst(o.input, A.now, 0.008, rnd(1800, 5200), 3, rnd(0.2, 0.7)); setTimeout(crackle, rnd(30, 180)); };
    crackle();
    return handle(A, o, [n], { onStop() { alive = false; } });
  },

  phoneRing(A, { pos = null, vol = 0.55 } = {}) {
    // elektromechanische Wecker-Glocke: 1,2 s an, 2 s aus
    const o = A.out({ pos, vol, rev: 0.4, ref: 1.5 });
    let alive = true;
    const ring = () => {
      if (!alive) return;
      const t = A.now;
      for (let i = 0; i < 24; i++) {
        const tt = t + i * 0.05;
        A._ring(o.input, tt, i % 2 ? 1180 : 1420, 0.12, 0.09, [1, 2.4, 3.9]);
      }
      setTimeout(ring, 3200);
    };
    ring();
    return handle(A, o, [], { onStop() { alive = false; } });
  },

  heart(A, {} = {}) {
    // Herzschlag-Planer: setRate(bpm), setVol
    let alive = true, bpm = 70, v = 0;
    const beat = () => {
      if (!alive) return;
      if (v > 0.02) SFX.heartbeat(A, { vol: v, rate: bpm / 70 });
      setTimeout(beat, 60000 / bpm);
    };
    beat();
    return {
      setRate(b) { bpm = Math.max(40, Math.min(170, b)); },
      setVol(x) { v = x; },
      stop() { alive = false; },
    };
  },

  crankWhine(A, { vol = 0.12 } = {}) {
    const t = A.now;
    const o = A.out({ vol, rev: 0.05 });
    const g = A.vca(A.filt('bandpass', 900, 3, o.input), 0.5);
    const s = A.osc('sawtooth', 220, t, t + 1e5, g);
    return handle(A, o, [s], { setRate(k) { s.frequency.setTargetAtTime(160 + k * 260, A.now, 0.1); } });
  },

  candle(A, { pos, vol = 0.05 } = {}) {
    const o = A.out({ pos, vol, rev: 0.05, ref: 0.5, roll: 2 });
    let alive = true;
    const crack = () => { if (!alive) return; A._burst(o.input, A.now, 0.01, rnd(2000, 5000), 2, rnd(0.2, 0.6)); setTimeout(crack, rnd(200, 1500)); };
    crack();
    return handle(A, o, [], { onStop() { alive = false; } });
  },
};
