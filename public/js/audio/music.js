// Dynamische Musik: Zonendrones, Orgel, Chor, Spannungs- und Jagdschichten,
// und das Leitmotiv – Ilses Spieluhr.

import { audio as A } from './audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Ilses Lied (a-Moll, 3/4). [MIDI-Note, Dauer in Vierteln]
export const ILSE_THEME = [
  [69, 1], [72, 1], [76, 1], [74, 2], [72, 1],
  [71, 1], [72, 1], [74, 1], [64, 3],
  [65, 1], [69, 1], [72, 1], [71, 2], [69, 1],
  [68, 1], [69, 1], [71, 1], [69, 3],
  [76, 1], [77, 1], [76, 1], [74, 2], [72, 1],
  [71, 1], [69, 1], [68, 1], [69, 3],
];

// Zonen: Grundton, Tonleiter-Farbe, Timbre
export const ZONES = {
  menu:     { root: 45, notes: [0, 3, 7, 10], organ: 0.3, choir: 0.25, strings: 0.3, bright: 0.4 },
  lobby:    { root: 45, notes: [0, 3, 7], organ: 0.35, choir: 0.15, strings: 0.2, bright: 0.5 },
  spindel:  { root: 43, notes: [0, 1, 7], organ: 0.1, choir: 0.05, strings: 0.35, bright: 0.35 },
  sacred:   { root: 41, notes: [0, 3, 7, 10], organ: 0.4, choir: 0.4, strings: 0.2, bright: 0.45 },
  salt:     { root: 40, notes: [0, 5, 7], organ: 0.0, choir: 0.15, strings: 0.35, bright: 0.6 },
  water:    { root: 38, notes: [0, 3, 8], organ: 0.05, choir: 0.2, strings: 0.35, bright: 0.3 },
  memory:   { root: 45, notes: [0, 4, 7, 11], organ: 0.1, choir: 0.1, strings: 0.35, bright: 0.55 },
  flesh:    { root: 33, notes: [0, 1, 6], organ: 0.2, choir: 0.3, strings: 0.45, bright: 0.25 },
  void:     { root: 28, notes: [0, 7], organ: 0.0, choir: 0.55, strings: 0.2, bright: 0.2 },
  safe:     { root: 48, notes: [0, 4, 7, 9], organ: 0.05, choir: 0.1, strings: 0.25, bright: 0.6 },
};

class Music {
  constructor() {
    this.zone = null;
    this.layers = {};
    this.intensity = { tension: 0, chase: 0 };
    this.targets = { tension: 0, chase: 0 };
    this.base = null;
  }

  _ensure() {
    if (this.out || !A.ready) return !!this.out;
    const ctx = A.ctx;
    this.out = ctx.createGain();
    this.out.gain.value = 1;
    this.out.connect(A.bus.music);
    const s = ctx.createGain(); s.gain.value = 0.55;
    this.out.connect(s).connect(A.revSend);
    this._buildTension();
    this._buildChase();
    this._tick();
    return true;
  }

  // ---------------------------------------------------------------- Zonenteppich

  setZone(name, fade = 4) {
    if (!this._ensure()) return;
    if (this.zone === name) return;
    this.zone = name;
    const z = ZONES[name] || ZONES.spindel;
    const t = A.now;
    if (this.base) {
      const old = this.base;
      old.gain.gain.setTargetAtTime(0.0001, t, fade / 3);
      setTimeout(() => { for (const s of old.srcs) { try { s.stop(); } catch { /* */ } } old.gain.disconnect(); }, fade * 1000 + 800);
    }
    if (name === 'silence') { this.base = null; return; }
    const g = A.ctx.createGain();
    g.gain.value = 0.0001;
    g.gain.setTargetAtTime(1, t, fade / 3);
    g.connect(this.out);
    const srcs = [];
    // Tiefe Streicher/Drone
    const lp = A.filt('lowpass', 200 + z.bright * 700, 0.8, g);
    for (const [i, n] of z.notes.entries()) {
      for (const det of [-7, 6]) {
        const vg = A.vca(lp, z.strings * 0.06 / z.notes.length * (i === 0 ? 1.8 : 1));
        const o = A.osc('sawtooth', mtof(z.root + n - (i === 0 ? 12 : 0)), t, t + 1e5, vg);
        o.detune.value = det + rnd(-3, 3);
        // langsames Atmen
        const lfo = A.ctx.createGain(); lfo.gain.value = z.strings * 0.02 / z.notes.length;
        lfo.connect(vg.gain);
        srcs.push(o, A.osc('sine', rnd(0.03, 0.09), t, t + 1e5, lfo));
      }
    }
    // Orgel (additiv, Register 16' 8' 4' 2 2/3')
    if (z.organ > 0) {
      const og = A.vca(A.filt('lowpass', 1800, 0.5, g), z.organ * 0.05);
      for (const n of [0, 7, 12]) for (const [h, a] of [[0.5, 0.6], [1, 1], [2, 0.5], [3, 0.25], [4, 0.2]]) {
        const pg = A.vca(og, a / 3);
        srcs.push(A.osc('sine', mtof(z.root + n) * h, t, t + 1e5, pg));
      }
      const swell = A.ctx.createGain(); swell.gain.value = z.organ * 0.03; swell.connect(og.gain);
      srcs.push(A.osc('sine', 0.05, t, t + 1e5, swell));
    }
    // Chor (Formantsynthese „aah/ooh“)
    if (z.choir > 0) this._choir(g, z, srcs, t);
    this.base = { gain: g, srcs };
  }

  _choir(dest, z, srcs, t) {
    const vowels = { a: [800, 1150, 2900], o: [450, 800, 2830], u: [325, 700, 2530] };
    const v = vowels[['a', 'o', 'u'][Math.floor(rnd(0, 3))]];
    const cg = A.vca(dest, z.choir * 0.06);
    const fs = v.map((f, i) => A.filt('bandpass', f, 9 + i * 3, cg));
    const src = A.ctx.createGain(); src.gain.value = 1;
    for (const f of fs) src.connect(f);
    const chord = [0, 7, 12, 15].map(n => z.root + 12 + n);
    for (const m of chord) {
      for (let k = 0; k < 3; k++) {
        const vg = A.vca(src, 0.25);
        const o = A.osc('sawtooth', mtof(m), t, t + 1e5, vg);
        o.detune.value = rnd(-12, 12);
        const vib = A.ctx.createGain(); vib.gain.value = rnd(3, 6);
        vib.connect(o.detune);
        srcs.push(o, A.osc('sine', rnd(4.5, 5.8), t, t + 1e5, vib));
      }
    }
    const breathe = A.ctx.createGain(); breathe.gain.value = z.choir * 0.04; breathe.connect(cg.gain);
    srcs.push(A.osc('sine', rnd(0.04, 0.08), t, t + 1e5, breathe));
  }

  // ---------------------------------------------------------------- Spannung

  _buildTension() {
    const t = A.now;
    const g = A.ctx.createGain(); g.gain.value = 0; g.connect(this.out);
    this.tensionGain = g;
    // hohe Streicher-Tremolo-Cluster
    const hp = A.filt('bandpass', 1800, 0.8, g);
    for (const m of [81, 82, 88]) {
      const vg = A.vca(hp, 0.02);
      const o = A.osc('sawtooth', mtof(m), t, t + 1e6, vg);
      o.detune.value = rnd(-15, 15);
      const trem = A.ctx.createGain(); trem.gain.value = 0.018; trem.connect(vg.gain);
      A.osc('square', rnd(7, 9), t, t + 1e6, trem);
    }
    // tiefer Puls
    const lp = A.filt('lowpass', 120, 2, g);
    const pg = A.vca(lp, 0.12);
    A.osc('sine', 41.2, t, t + 1e6, pg);
    const puls = A.ctx.createGain(); puls.gain.value = 0.1; puls.connect(pg.gain);
    A.osc('sine', 1.1, t, t + 1e6, puls);
  }

  // ---------------------------------------------------------------- Jagd

  _buildChase() {
    const g = A.ctx.createGain(); g.gain.value = 0; g.connect(this.out);
    this.chaseGain = g;
    this.chaseStep = 0;
    this.chaseNext = 0;
  }

  _chaseBeat(t) {
    const g = this.chaseGain;
    const step = this.chaseStep++ % 16;
    // Trommeln
    if (step % 4 === 0 || step === 14) A._thump(g, t, 110, 42, 0.35, 0.9);
    if (step % 8 === 4) { A._burst(g, t, 0.18, 900, 0.6, 0.45); A._thump(g, t, 180, 90, 0.12, 0.4); }
    if (step % 2 === 1) A._burst(g, t, 0.03, 6000, 1, 0.08);
    // Ostinato (tiefes Cello)
    const seq = [45, 45, 46, 45, 48, 45, 46, 44];
    if (step % 2 === 0) {
      const vg = A.vca(A.filt('lowpass', 700, 3, g));
      A.env(vg, t, 0.01, 0.12, 0.2);
      A.osc('sawtooth', mtof(seq[(step / 2) % 8]), t, t + 0.25, vg);
    }
    // Metallschlag
    if (step === 0 && Math.random() < 0.5) A._ring(g, t, rnd(160, 220), 1.5, 0.08, [1, 2.76, 5.4]);
  }

  // ---------------------------------------------------------------- Takt

  _tick() {
    const loop = () => {
      const t = A.now;
      const dt = 0.1;
      // Spannung/Jagd weich
      for (const k of ['tension', 'chase']) {
        this.intensity[k] += (this.targets[k] - this.intensity[k]) * (k === 'chase' ? 0.12 : 0.05);
      }
      this.tensionGain.gain.setTargetAtTime(this.intensity.tension * 0.9 * (1 - this.intensity.chase * 0.5), t, 0.2);
      this.chaseGain.gain.setTargetAtTime(this.intensity.chase * 0.8, t, 0.15);
      if (this.intensity.chase > 0.03) {
        const spb = 60 / 140 / 4;
        if (this.chaseNext < t) this.chaseNext = t + 0.05;
        while (this.chaseNext < t + 0.2) { this._chaseBeat(this.chaseNext); this.chaseNext += spb; }
      }
      setTimeout(loop, dt * 1000);
    };
    loop();
  }

  setTension(v) { this.targets.tension = Math.max(0, Math.min(1, v)); }
  setChase(v) { this.targets.chase = Math.max(0, Math.min(1, v)); }
  duck(v = 0.3, dur = 2) {
    if (!this.out) return;
    const t = A.now;
    this.out.gain.setTargetAtTime(v, t, 0.1);
    this.out.gain.setTargetAtTime(1, t + dur, 0.8);
  }
  setMaster(v, tc = 1) { if (this.out) this.out.gain.setTargetAtTime(v, A.now, tc); }

  // ---------------------------------------------------------------- Spieluhr

  // Spieluhr-Klang: Stimmzunge (Sinus + Oberton bei 3,01×) + mechanisches Klicken
  musicBox({ pos = null, vol = 0.5, tempo = 88, wobble = 0, from = 0, count = ILSE_THEME.length, detune = 0, rev = 0.7, bus = 'music', onEnd = null } = {}) {
    if (!A.ready) return { stop() {} };
    const o = A.out({ pos, vol, rev, bus, ref: 1.2 });
    const beat = 60 / tempo;
    let t = A.now + 0.1;
    let alive = true;
    const notes = ILSE_THEME.slice(from, from + count);
    // Mechanik-Surren
    const mg = A.vca(A.filt('bandpass', 3000, 2, o.input), 0.015);
    const mech = A.noiseSrc('white', t, t + notes.reduce((s, n) => s + n[1], 0) * beat + 1, mg);
    for (const [m, d] of notes) {
      const f = mtof(m + 12) * Math.pow(2, (detune + (wobble ? rnd(-wobble, wobble) : 0)) / 1200);
      const g = A.vca(o.input);
      A.env(g, t, 0.002, 0.3, 2.2);
      A.osc('sine', f, t, t + 2.4, g);
      const g2 = A.vca(o.input);
      A.env(g2, t, 0.001, 0.08, 0.35);
      A.osc('sine', f * 3.01, t, t + 0.5, g2);
      const g3 = A.vca(o.input);
      A.env(g3, t, 0.001, 0.03, 0.12);
      A.osc('sine', f * 5.4, t, t + 0.2, g3);
      A._burst(o.input, t - 0.005, 0.006, 5000, 4, 0.06);
      t += d * beat * (wobble ? rnd(0.93, 1.08) : 1);
    }
    const total = (t - A.now) * 1000;
    const timer = setTimeout(() => { if (alive && onEnd) onEnd(); }, total);
    return {
      duration: total / 1000,
      stop() { alive = false; clearTimeout(timer); o.input.gain.setTargetAtTime(0.0001, A.now, 0.3); try { mech.stop(A.now + 1); } catch { /* */ } },
    };
  }
}

export const music = new Music();
