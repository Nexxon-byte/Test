// Geräusche des Monster-Pakets – synthetisiert wie der Rest (keine Sounddatei).
// installSounds() hängt sich an audio.play / audio.loop: Namen, die es im Spiel nicht gibt,
// kommen von hier. Später gern nach audio/audio.js (SFX/LOOPS) umziehen.

import { audio } from './audio.js';

const rnd = (a, b) => a + Math.random() * (b - a);

// Handle für Schleifen (wie handle() in audio.js)
function handle(A, o, sources, extra = {}) {
  return {
    out: o,
    setVol(v, tc = 0.2) { o.input.gain.setTargetAtTime(v, A.now, tc); },
    setPos(p) {
      const pn = o.panner;
      if (!pn) return;
      if (pn.positionX) { pn.positionX.setTargetAtTime(p.x, A.now, 0.05); pn.positionY.setTargetAtTime(p.y, A.now, 0.05); pn.positionZ.setTargetAtTime(p.z, A.now, 0.05); }
      else pn.setPosition(p.x, p.y, p.z);
    },
    stop(fade = 0.6) {
      const t = A.now;
      o.input.gain.setTargetAtTime(0.0001, t, fade / 4);
      for (const s of sources) { try { s.stop(t + fade + 0.1); } catch { /* */ } }
      extra.onStop?.();
      setTimeout(() => { try { o.input.disconnect(); o.panner?.disconnect(); } catch { /* */ } }, (fade + 0.5) * 1000);
    },
    ...extra,
  };
}

// Formanten (Vokale a e i o u) für Stimmengemurmel und Chor
const VOWELS = [[800, 1150], [400, 1600], [300, 2300], [450, 800], [325, 700]];

export const PACK_SFX = {
  // ------------------------------------------------ Falterin
  // Klopfen gegen Glas/Gitter – wie eine Motte an der Lampe
  mothTap(A, { pos = null, vol = 0.5, n = 0 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.35, ref: 1.2 });
    const count = n || Math.floor(rnd(3, 6));
    for (let i = 0; i < count; i++) {
      const tt = t + i * rnd(0.07, 0.16);
      A._burst(o.input, tt, 0.005, rnd(2600, 3800), 5, 0.8);
      A._ring(o.input, tt, rnd(1500, 2200), 0.12, 0.05, [1, 2.4]);
    }
  },
  // Sie trinkt eine Lampe: Knistern, das anschwillt, Summen, am Ende Glas
  mothDrink(A, { pos = null, vol = 0.7, dur = 2.4 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.5, ref: 1.8 });
    const bp = A.filt('bandpass', 400, 2.5, o.input);
    const g = A.vca(bp);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.7, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    bp.frequency.setValueAtTime(400, t); bp.frequency.exponentialRampToValueAtTime(3400, t + dur);
    A.noiseSrc('white', t, t + dur + 0.1, g);
    const hum = A.vca(o.input); hum.gain.setValueAtTime(0.0001, t); hum.gain.linearRampToValueAtTime(0.18, t + dur * 0.6); hum.gain.linearRampToValueAtTime(0.0001, t + dur);
    const s = A.osc('sawtooth', 50, t, t + dur, A.filt('lowpass', 300, 3, hum));
    s.frequency.linearRampToValueAtTime(120, t + dur);
    for (let i = 0; i < 5; i++) A._ring(o.input, t + dur - 0.1 + i * rnd(0.03, 0.08), rnd(3000, 5200), 0.3, 0.05, [1, 2.7]);
  },
  // Trockener Papierschrei
  mothScreech(A, { pos = null, vol = 0.9 } = {}) {
    const t = A.now, dur = 1.3, o = A.out({ pos, vol, rev: 0.7, ref: 2.5 });
    for (let i = 0; i < 14; i++) A._burst(o.input, t + i * 0.08 + rnd(0, 0.03), rnd(0.03, 0.08), rnd(2000, 6000), 1.5, rnd(0.3, 0.7));
    const f = A.filt('bandpass', 1400, 4, o.input);
    const g = A.vca(f); A.env(g, t, 0.05, 0.35, dur);
    const s = A.osc('sawtooth', 620, t, t + dur, g);
    s.frequency.linearRampToValueAtTime(980, t + 0.25); s.frequency.linearRampToValueAtTime(410, t + dur);
    f.frequency.setValueAtTime(1400, t); f.frequency.linearRampToValueAtTime(2600, t + 0.3); f.frequency.linearRampToValueAtTime(900, t + dur);
  },
  // Glühbirne platzt
  bulbPop(A, { pos = null, vol = 0.7 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.45, ref: 2 });
    A._burst(o.input, t, 0.012, 3800, 1.2, 1);
    A._thump(o.input, t, 320, 70, 0.08, 0.5);
    for (let i = 0; i < 7; i++) A._ring(o.input, t + 0.02 + rnd(0, 0.35), rnd(3500, 7000), 0.18, 0.035, [1, 2.2]);
  },
  paperRustle(A, { pos = null, vol = 0.35 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.3, ref: 1.2 });
    for (let i = 0; i < 6; i++) A._burst(o.input, t + i * rnd(0.03, 0.07), rnd(0.03, 0.09), rnd(1800, 5200), 1, rnd(0.3, 0.8), 'pink');
  },

  // ------------------------------------------------ Zöllner
  // Handglocke: zweimal hell
  tollBell(A, { pos = null, vol = 0.55 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.75, ref: 3 });
    A._ring(o.input, t, 1320, 1.4, 0.2, [1, 2.41, 3.93, 5.6]);
    A._ring(o.input, t + 0.32, 1310, 1.6, 0.18, [1, 2.41, 3.93, 5.6]);
  },
  // Kettchen der Waage
  scaleChain(A, { pos = null, vol = 0.35 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.3, ref: 1.2 });
    for (let i = 0; i < 9; i++) A._ring(o.input, t + rnd(0, 0.25), rnd(2800, 6200), 0.09, 0.05, [1, 1.9]);
  },
  // Etwas landet auf der Waagschale
  scaleClink(A, { pos = null, vol = 0.6 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.45, ref: 1.5 });
    A._ring(o.input, t, 1580, 0.9, 0.16, [1, 2.76, 4.1]);
    A._ring(o.input, t + 0.09, 2120, 0.7, 0.1, [1, 2.76]);
    A._thump(o.input, t, 180, 90, 0.06, 0.3);
    PACK_SFX.scaleChain(A, { pos, vol: vol * 0.5 });
  },
  // Siegelstempel: dumpf, mit Tinte
  stampThud(A, { pos = null, vol = 0.9 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.5, ref: 2 });
    A._thump(o.input, t, 150, 42, 0.3, 1);
    A._burst(o.input, t, 0.08, 420, 0.8, 0.6, 'pink');
    const f = A.filt('lowpass', 1200, 5, o.input); const g = A.vca(f);
    A.env(g, t + 0.05, 0.01, 0.35, 0.22);
    f.frequency.setValueAtTime(1200, t + 0.05); f.frequency.exponentialRampToValueAtTime(200, t + 0.3);
    A.noiseSrc('pink', t + 0.05, t + 0.35, g);
  },
  // Zeiger der Waage / Frist läuft
  ledgerTick(A, { pos = null, vol = 0.4, pitch = 1 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.3, ref: 1.5 });
    A._burst(o.input, t, 0.004, 2600 * pitch, 8, 0.9);
    A._ring(o.input, t, 1400 * pitch, 0.08, 0.05, [1, 1.6]);
  },

  // ------------------------------------------------ Vorgänger
  // Verblassen im Fackelschein / Verschwinden: rückwärts anschwellendes Rauschen, fallende Töne
  echoVanish(A, { pos = null, vol = 0.6 } = {}) {
    const t = A.now, dur = 1.6, o = A.out({ pos, vol, rev: 0.9, ref: 2 });
    const hp = A.filt('highpass', 1500, 0.7, o.input); const g = A.vca(hp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6, t + dur); g.gain.setTargetAtTime(0.0001, t + dur, 0.03);
    A.noiseSrc('white', t, t + dur + 0.2, g);
    for (let i = 0; i < 4; i++) {
      const gg = A.vca(o.input); A.env(gg, t + dur * 0.5, 0.2, 0.06, 1.4);
      const s = A.osc('sine', 880 * (1 + i * 0.26), t + dur * 0.5, t + dur + 1.5, gg);
      s.frequency.exponentialRampToValueAtTime(220 * (1 + i * 0.26), t + dur + 1.4);
    }
  },

  // ------------------------------------------------ Wasser
  bubbles(A, { pos = null, vol = 0.45, n = 0 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.4, ref: 1.2 });
    const count = n || Math.floor(rnd(4, 10));
    for (let i = 0; i < count; i++) {
      const tt = t + rnd(0, 0.9), g = A.vca(o.input);
      A.env(g, tt, 0.003, rnd(0.08, 0.2), 0.06);
      const s = A.osc('sine', rnd(300, 600), tt, tt + 0.08, g);
      s.frequency.exponentialRampToValueAtTime(rnd(900, 1800), tt + 0.06);
    }
  },
  waterSurge(A, { pos = null, vol = 0.9 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.55, ref: 2 });
    const f = A.filt('lowpass', 2400, 0.8, o.input); const g = A.vca(f);
    A.env(g, t, 0.02, 0.9, 0.9);
    f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(400, t + 0.9);
    A.noiseSrc('pink', t, t + 1, g);
    A._thump(o.input, t, 90, 35, 0.3, 0.7);
    PACK_SFX.bubbles(A, { pos, vol: vol * 0.6, n: 8 });
  },
  drownedGurgle(A, { pos = null, vol = 0.6 } = {}) {
    const t = A.now, dur = rnd(1.2, 2), o = A.out({ pos, vol, rev: 0.6, ref: 1.5 });
    const f = A.filt('lowpass', 500, 7, o.input); const g = A.vca(f);
    A.env(g, t, 0.15, 0.4, dur);
    const s = A.osc('sawtooth', rnd(60, 80), t, t + dur, g);
    for (let i = 0; i < 8; i++) f.frequency.setTargetAtTime(rnd(250, 900), t + i * dur / 8, 0.04);
    s.frequency.linearRampToValueAtTime(rnd(40, 55), t + dur);
    PACK_SFX.bubbles(A, { pos, vol: vol * 0.5 });
  },

  // ------------------------------------------------ Nachsprecher
  // Collage: fünf Stimmen gleiten in verschiedene Richtungen, Flüstern darunter
  mimicScream(A, { pos = null, vol = 1 } = {}) {
    const t = A.now, dur = 1.9, o = A.out({ pos, vol, rev: 0.8, ref: 3 });
    for (let i = 0; i < 5; i++) {
      const [f1, f2] = VOWELS[i % VOWELS.length];
      const g = A.vca(o.input); A.env(g, t + i * 0.05, 0.06, 0.16, dur);
      const b1 = A.filt('bandpass', f1, 6, g), b2 = A.filt('bandpass', f2, 8, g);
      const s = A.ctx.createOscillator(); s.type = 'sawtooth';
      const f0 = rnd(140, 320);
      s.frequency.setValueAtTime(f0, t); s.frequency.exponentialRampToValueAtTime(f0 * rnd(0.4, 2.6), t + dur);
      s.connect(b1); s.connect(b2); s.start(t); s.stop(t + dur + 0.1);
    }
    A._burst(o.input, t, dur, 2600, 0.5, 0.3);
    audio.play('whisper', { pos, vol: vol * 0.6, dur: 1.4 });
  },

  // ------------------------------------------------ Portier & Tür
  porterKneel(A, { pos = null, vol = 0.6 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.5, ref: 2 });
    A._burst(o.input, t, 0.4, 700, 0.7, 0.4, 'pink');
    A._thump(o.input, t + 0.35, 80, 35, 0.3, 0.8);
    audio.play('cableCreak', { pos, vol: 0.2 });
  },
  doorCreak(A, { pos = null, vol = 0.7, dur = 2.2 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.7, ref: 2.5 });
    const f = A.filt('bandpass', 320, 9, o.input); const g = A.vca(f);
    A.env(g, t, 0.1, 0.55, dur, 0.4, dur * 0.8, 0.3);
    const s = A.osc('sawtooth', 58, t, t + dur, g);
    for (let i = 0; i < 10; i++) { s.frequency.setTargetAtTime(rnd(42, 90), t + i * dur / 10, 0.08); f.frequency.setTargetAtTime(rnd(220, 520), t + i * dur / 10, 0.1); }
    A._burst(o.input, t, dur, 1200, 0.6, 0.12, 'brown');
  },
  // Portiersklingel (Hotelglocke)
  deskBell(A, { pos = null, vol = 0.7 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.8, ref: 3 });
    A._burst(o.input, t, 0.004, 5000, 4, 0.6);
    A._ring(o.input, t, 2640, 2.2, 0.22, [1, 2.08, 3.32, 4.7]);
  },
  // Aufziehen der Spieluhr: Ratsche
  windUp(A, { vol = 0.45 } = {}) {
    const t = A.now, o = A.out({ vol, rev: 0.15 });
    for (let i = 0; i < 12; i++) {
      const tt = t + i * (0.11 - i * 0.004);
      A._burst(o.input, tt, 0.004, 4200, 6, 0.9);
      A._thump(o.input, tt, 900, 400, 0.01, 0.2);
    }
  },

  // ------------------------------------------------ Segnung
  // Weißblende: Rauschen und hohe Töne steigen bis zur Stille
  whiteout(A, { vol = 0.7, dur = 3.5 } = {}) {
    const t = A.now, o = A.out({ vol, rev: 0.9, bus: 'music' });
    const hp = A.filt('highpass', 800, 0.7, o.input); const g = A.vca(hp);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + dur); g.gain.setTargetAtTime(0.0001, t + dur, 0.02);
    A.noiseSrc('white', t, t + dur + 0.2, g);
    for (let i = 0; i < 6; i++) {
      const gg = A.vca(o.input); gg.gain.setValueAtTime(0.0001, t); gg.gain.exponentialRampToValueAtTime(0.05, t + dur); gg.gain.setTargetAtTime(0.0001, t + dur, 0.02);
      const s = A.osc('sine', 220 * Math.pow(1.5, i), t, t + dur + 0.2, gg);
      s.frequency.exponentialRampToValueAtTime(440 * Math.pow(1.5, i), t + dur);
    }
  },
  // Weißer Schleier legt sich über das Gesicht
  veil(A, { vol = 0.5 } = {}) {
    const t = A.now, o = A.out({ vol, rev: 0.2 });
    const f = A.filt('bandpass', 1800, 0.8, o.input); const g = A.vca(f);
    A.env(g, t, 0.3, 0.5, 1.2);
    f.frequency.setValueAtTime(3000, t); f.frequency.exponentialRampToValueAtTime(600, t + 1.2);
    A.noiseSrc('pink', t, t + 1.4, g);
  },
  // Nagel in die Quartierstür (Schuldbrief)
  nail(A, { pos = null, vol = 0.8 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.6, ref: 2 });
    for (let i = 0; i < 3; i++) {
      A._thump(o.input, t + i * 0.42, 220, 90, 0.08, 0.8);
      A._ring(o.input, t + i * 0.42, 1900, 0.25, 0.07, [1, 2.7, 4.2]);
    }
  },
};

export const PACK_LOOPS = {
  // Flügelschlag aus Papier: gefiltertes Rauschen im Takt der Flügel, darunter ein Brummen
  mothFlutter(A, { pos = null, vol = 0.35, rate = 11 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.35, ref: 1.3 });
    const bp = A.filt('bandpass', 2600, 0.9, o.input);
    const g = A.vca(bp, 0.25);
    const n = A.noiseSrc('pink', t, t + 1e5, g);
    const depth = A.ctx.createGain(); depth.gain.value = 0.25; depth.connect(g.gain);
    const lfo = A.osc('triangle', rate, t, t + 1e5, depth);
    const hum = A.vca(A.filt('lowpass', 180, 2, o.input), 0.12);
    const hd = A.ctx.createGain(); hd.gain.value = 0.12; hd.connect(hum.gain);
    lfo.connect(hd);
    const h = A.osc('sine', 46, t, t + 1e5, hum);
    let alive = true;
    const wob = () => { if (!alive) return; lfo.frequency.setTargetAtTime(rate * rnd(0.7, 1.25), A.now, 0.1); bp.frequency.setTargetAtTime(rnd(1800, 3600), A.now, 0.15); setTimeout(wob, rnd(120, 400)); };
    wob();
    return handle(A, o, [n, lfo, h], { setRate(r) { rate = r; }, onStop() { alive = false; } });
  },
  // Gemurmel einer Mannschaft, die es nicht mehr gibt
  echoMurmur(A, { pos = null, vol = 0.25 } = {}) {
    const t = A.now, o = A.out({ pos, vol, rev: 0.85, ref: 1.8 });
    const src = A.ctx.createGain(); src.gain.value = 0;
    const n = A.noiseSrc('white', t, t + 1e5, src);
    const f1 = A.filt('bandpass', 700, 7, o.input), f2 = A.filt('bandpass', 1200, 9, o.input);
    src.connect(f1); src.connect(f2);
    const pad = A.vca(o.input, 0.025);
    const s1 = A.osc('sine', 196, t, t + 1e5, pad), s2 = A.osc('sine', 233.1 * 1.003, t, t + 1e5, pad);
    let alive = true;
    const syl = () => {
      if (!alive) return;
      const v = VOWELS[Math.floor(Math.random() * VOWELS.length)], tt = A.now;
      f1.frequency.setTargetAtTime(v[0] * rnd(0.9, 1.1), tt, 0.03); f2.frequency.setTargetAtTime(v[1] * rnd(0.9, 1.1), tt, 0.03);
      src.gain.setTargetAtTime(Math.random() < 0.25 ? 0.02 : rnd(0.3, 0.8), tt, 0.03);
      setTimeout(syl, rnd(90, 260) + (Math.random() < 0.12 ? rnd(400, 1200) : 0));
    };
    syl();
    return handle(A, o, [n, s1, s2], { onStop() { alive = false; } });
  },
  // Unter Wasser gezogen: dumpfes Dröhnen, Herz im Ohr
  underwater(A, { vol = 0.5 } = {}) {
    const t = A.now, o = A.out({ vol, rev: 0.1, bus: 'amb' });
    const lp = A.filt('lowpass', 320, 1.2, o.input); const g = A.vca(lp, 0.8);
    const n = A.noiseSrc('brown', t, t + 1e5, g);
    const lfoG = A.ctx.createGain(); lfoG.gain.value = 0.35; lfoG.connect(g.gain);
    const lfo = A.osc('sine', 0.35, t, t + 1e5, lfoG);
    const low = A.vca(o.input, 0.1);
    const s = A.osc('sine', 38, t, t + 1e5, low);
    return handle(A, o, [n, lfo, s]);
  },
  // Chor der Kanzlei: tiefe Orgel + vier Stimmen auf „a“, langsam schwellend
  kanzleiChor(A, { vol = 0.3, root = 73.4 } = {}) {
    const t = A.now, o = A.out({ vol, rev: 0.95, bus: 'music' });
    o.input.gain.setValueAtTime(0.0001, t); o.input.gain.setTargetAtTime(vol, t, 2.5);
    const srcs = [];
    // Orgelpedal
    const org = A.vca(A.filt('lowpass', 400, 0.7, o.input), 0.3);
    srcs.push(A.osc('sine', root / 2, t, t + 1e5, org), A.osc('square', root / 2 * 1.002, t, t + 1e5, A.vca(org, 0.05)));
    // Stimmen: Grundton, Quinte, Oktave, kleine Terz darüber
    const ratios = [1, 1.5, 2, 2.378];
    for (let i = 0; i < ratios.length; i++) {
      const g = A.vca(o.input, 0.05);
      const b1 = A.filt('bandpass', 800, 5, g), b2 = A.filt('bandpass', 1150, 7, g);
      for (const det of [0.997, 1.003]) {
        const s = A.ctx.createOscillator(); s.type = 'sawtooth'; s.frequency.value = root * ratios[i] * det;
        const vib = A.ctx.createGain(); vib.gain.value = root * ratios[i] * 0.006; vib.connect(s.frequency);
        const l = A.osc('sine', rnd(4.5, 5.8), t, t + 1e5, vib);
        s.connect(b1); s.connect(b2); s.start(t); s.stop(t + 1e5);
        srcs.push(s, l);
      }
    }
    return handle(A, o, srcs);
  },
};

let installed = false;
export function installSounds() {
  if (installed) return;
  installed = true;
  const play = audio.play.bind(audio), loop = audio.loop.bind(audio);
  audio.play = (name, opts = {}) => {
    const fn = PACK_SFX[name];
    if (!fn) return play(name, opts);
    if (!audio.ready) return;
    try { return fn(audio, opts); } catch (e) { console.warn('SFX-Fehler', name, e); }
  };
  audio.loop = (name, opts = {}) => {
    const fn = PACK_LOOPS[name];
    if (!fn) return loop(name, opts);
    if (!audio.ready) return null;
    const h = fn(audio, opts);
    h.name = name;
    audio.loops.add(h);
    const stop = h.stop;
    h.stop = (fade = 0.6) => { if (h.stopped) return; h.stopped = true; audio.loops.delete(h); stop(fade); };
    return h;
  };
}
