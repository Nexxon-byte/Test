// Ladebildschirm-Bild: Blick durch den Schacht der Neunten.
// Kleiner Software-Raycaster: Ein Strahl je Pixel wird einmal vorab berechnet (Wand, Tiefe, Lage),
// danach ändert sich pro Bild nur die Höhe der Kamera im Schacht. Prozedurale Wände (Beton, Fugen,
// Schienen, Konsolen, Leiter, Ringträger), Absätze mit Etagentoren (Neon, Kerzen, Natrium, Gestalten
// im Türspalt), Schablonen-Nummern, Tragseile, Staub bzw. Regen, fernes Glühen – dann Tonwert,
// Vignette, Messing-Zifferblatt + Nixie-Röhren, Korn, Bayer-Dithering, VHS-Störung.
// Bewusst ohne Importe: läuft im Worker (OffscreenCanvas) und als Rückfall im Hauptthread.

const HX = 3.0, HZ = 2.4;          // halbe Schachtbreite/-tiefe (m)
const LSP = 10;                    // Abstand der Absätze (m)
const FAR = 150;                   // Sichtweite (m)
const PAD = 4;                     // Rand für Wackeln und Zeilenversatz (px)
const CAMX = -0.55, CAMZ = 0.35;   // Kamera im Querschnitt – außermittig, damit die Flucht lebt
const DU = 0.35;                   // Mitte des Etagentors auf der Torwand
const LEVELS = 20;                 // Farbstufen je Kanal (grob wie im Spiel)
const TMN = 2048, TMS = 256;       // Tonwert-Tabelle: Eingang 0 … 8
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map(v => (v + 0.5) / 16);
const MAXL = 32;                   // Absätze in der Tabelle
const Q8 = Uint8Array.from({ length: LEVELS + 1 }, (_, k) => Math.round(k * 255 / LEVELS));

// Lichtspalten: Natriumlampe links, versetzt rechts, Licht aus dem Etagentor
const LAMPS = [
  { wall: 0, x: -HX + 0.12, z: 0.95, ly: 4.4, u: 0.95 },
  { wall: 1, x: HX - 0.12, z: -0.85, ly: 9.2, u: -0.85 },
  { wall: 3, x: DU, z: HZ - 0.12, ly: 2.2, u: DU },
];
// Tragseile (Querschnitt) und Radius
const ROPES = [[0.02, -0.14], [0.15, -0.14], [0.28, -0.14], [0.41, -0.14]];
const RR = 0.024;

// Farben
const SODIUM = [1.0, 0.5, 0.17], COLD = [0.55, 0.86, 0.8];
const DOORCOL = [[1.0, 0.55, 0.2], [1.0, 0.16, 0.5], [0.2, 0.78, 1.0], [1.0, 0.6, 0.24], [0.5, 1.0, 0.55]];
const NEONCOL = [[1.0, 0.16, 0.5], [0.22, 0.85, 1.0], [1.0, 0.22, 0.12], [1.0, 0.55, 0.16]];

// Die Arten: Blickrichtung, Tempo, Nebel, fernes Glühen, Teilchen
const KINDS = {
  boot:  { dir: -1, speed: 5.2, fog: 36, fogCol: [0.012, 0.009, 0.01], glow: [0.55, 0.07, 0.035], glowR: 0.055, pulse: true, rain: false },
  night: { dir: -1, speed: 5.6, fog: 34, fogCol: [0.01, 0.009, 0.012], glow: [0.5, 0.06, 0.05], glowR: 0.05, pulse: true, rain: false },
  hub:   { dir: 1, speed: 6.0, fog: 44, fogCol: [0.06, 0.035, 0.018], glow: [1.25, 0.66, 0.28], glowR: 0.09, pulse: false, rain: true },
};

// 3×5-Pixelschrift (Schablonenziffern an der Wand, Beschriftung am Instrument)
const FONT = {
  0: [7, 5, 5, 5, 7], 1: [2, 6, 2, 2, 7], 2: [7, 1, 7, 4, 7], 3: [7, 1, 3, 1, 7], 4: [5, 5, 7, 1, 1],
  5: [7, 4, 7, 1, 7], 6: [7, 4, 7, 5, 7], 7: [7, 1, 1, 2, 2], 8: [7, 5, 7, 5, 7], 9: [7, 5, 7, 1, 7],
  '-': [0, 0, 7, 0, 0], ' ': [0, 0, 0, 0, 0], A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], E: [7, 4, 6, 4, 7],
  F: [7, 4, 6, 4, 4], I: [7, 2, 2, 2, 7], L: [4, 4, 4, 4, 7], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2],
  S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], Z: [7, 1, 2, 4, 7], H: [5, 5, 7, 5, 5],
  R: [6, 5, 6, 5, 5], D: [6, 5, 5, 5, 6], K: [5, 5, 6, 5, 5], G: [3, 4, 5, 5, 3], X: [5, 5, 2, 5, 5],
};

// ---------------------------------------------------------------- Hilfen
function hash(n) {
  n |= 0;
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}
const hash2 = (a, b) => hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663));
// Anteil eines Pixels (Fußabdruck fp) an einem Streifen [c − hw, c + hw] – Kantenglättung ohne Flimmern
function cov(x, c, hw, fp) {
  const a = Math.max(x - fp * 0.5, c - hw), b = Math.min(x + fp * 0.5, c + hw);
  return b > a ? (b - a) / fp : 0;
}
// dasselbe periodisch (Streifen um jedes Vielfache von per)
function pcov(x, per, hw, fp) {
  if (fp >= per) return 2 * hw / per;
  return cov(x - Math.round(x / per) * per, 0, hw, fp);
}
// Abstand eines Punkts zu einer Strecke
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay;
  let k = ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy);
  k = k < 0 ? 0 : k > 1 ? 1 : k;
  const dx = px - ax - vx * k, dy = py - ay - vy * k;
  return Math.sqrt(dx * dx + dy * dy);
}
// Schablonenschrift: du = Weg entlang der Leserichtung ab Textanfang, dv = Weg ab Oberkante
// flip: um 180° gedreht (Blick von oben – sonst stünde die Schrift auf dem Kopf)
function glyphBit(text, du, dv, cell, flip = false) {
  if (flip) { du = (text.length * 4 - 1) * cell - du; dv = 5 * cell - dv; }
  if (du < 0 || dv < 0) return 0;
  const cx = Math.floor(du / cell), cy = Math.floor(dv / cell);
  if (cy > 4) return 0;
  const ch = (cx / 4) | 0, col = cx - ch * 4;
  if (ch >= text.length || col === 3) return 0;
  const g = FONT[text[ch]];
  return g ? (g[cy] >> (2 - col)) & 1 : 0;
}
function makeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Lage des Instruments (unten rechts) in Bildpunkten der Animation; entworfen für 200 Zeilen,
// in Viertelschritten skaliert (meist genau 1 → scharfe Pixel)
export function instrumentBox(h) {
  const s = Math.max(0.5, Math.round(h / 200 * 4) / 4);
  return { s, w: Math.round(104 * s), h: Math.round(48 * s), m: Math.round(6 * s) };
}

// ---------------------------------------------------------------- Bild

export class ShaftArt {
  constructor(w, h, opts = {}) {
    this.o = { kind: 'boot', depth: 0, reduceFlashing: false, ...opts };
    this.time = 0;
    this.frame = 0;
    this.prog = null;
    this.progShown = 0;
    this.shake = 0;
    this.glitch = 0;
    this.glitchT = 4 + Math.random() * 5;
    this.brown = 0;
    this.brownT = 9 + Math.random() * 10;
    this.seed = (Math.random() * 1e6) | 0;
    this.rnd = (Math.random() * 4294967295) >>> 0 || 1;
    this.w = 0; this.h = 0;
    // Tonwert-Kurve (weiches Abschneiden, leicht angehobene warme Schwärzen)
    this.TM = new Float32Array(TMN);
    for (let i = 0; i < TMN; i++) { const v = i / TMS; this.TM[i] = 1 - Math.exp(-v * 1.6); }
    // Absatz-Tabelle
    const F = () => new Float32Array(MAXL);
    this.L = { i0: F(), i1: F(), c0: new Uint8Array(MAXL), c1: new Uint8Array(MAXL), gap: F(), dr: F(), dg: F(), db: F(), di: F(),
      neon: new Uint8Array(MAXL), nr: F(), ng: F(), nb: F(), ni: F(), sil: F(), lr: F(), lg: F(), lb: F(), li: F(), label: new Array(MAXL).fill('') };
    // Instrument (Messing-Zifferblatt + Nixie-Röhren) – Größe folgt der Auflösung (siehe resize)
    this.IW = 104; this.IH = 48; this.IS = 1;
    try {
      this.icv = makeCanvas(this.IW, this.IH);
      this.ictx = this.icv.getContext('2d', { willReadFrequently: true });
    } catch { this.ictx = null; }
    this.nix = { cur: '000', prev: '000', sw: 1 };
    this.parts = [];
    this._setKind(true);
    this.resize(w, h);
  }

  configure(opts = {}) {
    const kindChanged = opts.kind && opts.kind !== this.o.kind;
    const depthChanged = opts.depth !== undefined && opts.depth !== this.o.depth;
    Object.assign(this.o, opts);
    if (kindChanged || depthChanged) this._setKind(kindChanged);
  }

  setProgress(k) { this.prog = (k === null || k === undefined) ? null : Math.max(0, Math.min(1, k)); }

  _setKind(reset) {
    const K = KINDS[this.o.kind] || KINDS.boot;
    const flip = this.K && this.K.dir !== K.dir;
    this.K = K;
    this.dir = K.dir;
    if (reset) {
      const d = Math.max(0, Math.round(this.o.depth || 0));
      // Startabsatz: abwärts knapp über der Zielwelt, aufwärts ein gutes Stück unter dem Markt
      const start = this.o.kind === 'hub' ? Math.max(6, d + 6) : this.o.kind === 'night' ? Math.max(1, d - 4) : 0;
      this.camY = -start * LSP + (this.dir < 0 ? -2 : -3);
      this.parts.length = 0;
      this.progShown = 0;
    }
    if (this.w && (flip || reset)) this._precompute();
  }

  resize(w, h) {
    w = Math.max(64, w | 0); h = Math.max(48, h | 0);
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h;
    this.img = null;
    // Instrument immer gleich groß auf dem Schirm: entworfen für 200 Zeilen
    const ib = instrumentBox(h);
    this.IS = ib.s; this.IW = ib.w; this.IH = ib.h; this.IM = ib.m;
    if (this.icv) { this.icv.width = this.IW; this.icv.height = this.IH; }
    this._precompute();
  }

  // ---------------------------------------------------------------- Vorberechnung (einmal je Größe/Richtung)

  _precompute() {
    const w = this.w, h = this.h, PW = w + PAD * 2, PH = h + PAD * 2, N = PW * PH, K = this.K;
    this.PW = PW; this.PH = PH;
    if (!this.T || this.T.length !== N) {
      const F = () => new Float32Array(N);
      this.T = F(); this.U = F(); this.WL = new Uint8Array(N); this.FOG = F(); this.CAM = F(); this.FPU = F(); this.FPY = F();
      this.DH = [F(), F(), F()]; this.NH = [F(), F(), F()];
      this.GLOW = F(); this.RA = F(); this.RT = F(); this.RX = F();
    }
    if (!this.VIG || this.VIG.length !== w * h) {
      this.VIG = new Float32Array(w * h);
      this.AR = new Float32Array(w * h); this.AG = new Float32Array(w * h); this.AB = new Float32Array(w * h);
      this.rowOff = new Int8Array(h); this.rowNoise = new Float32Array(h);
    }
    const f = h * 0.62, cx = w * 0.6 + PAD, cy = h * 0.43 + PAD;
    this.f = f; this.cx = cx; this.cy = cy;
    const mir = this.dir > 0 ? -1 : 1;     // Blick nach oben: gespiegelt, damit die Welt nicht seitenverkehrt ist
    this.mir = mir;
    const { T, U, WL, FOG, CAM, DH, NH, GLOW, RA, RT, RX } = this;
    const gr = h * K.glowR;
    for (let py = 0; py < PH; py++) {
      for (let px = 0; px < PW; px++) {
        const i = py * PW + px;
        const a = (px + 0.5 - cx) / f * mir, b = (py + 0.5 - cy) / f;
        const tx = a > 1e-6 ? (HX - CAMX) / a : a < -1e-6 ? (-HX - CAMX) / a : 1e9;
        const tz = b > 1e-6 ? (HZ - CAMZ) / b : b < -1e-6 ? (-HZ - CAMZ) / b : 1e9;
        let t, wl, u, wx, wz, nx = 0, nz = 0;
        if (tx < tz) { t = tx; wl = a > 0 ? 1 : 0; u = CAMZ + b * t; wx = a > 0 ? HX : -HX; wz = u; nx = a > 0 ? -1 : 1; }
        else { t = tz; wl = b > 0 ? 3 : 2; u = CAMX + a * t; wx = u; wz = b > 0 ? HZ : -HZ; nz = b > 0 ? -1 : 1; }
        T[i] = Math.min(t, FAR);
        U[i] = u; WL[i] = wl;
        FOG[i] = Math.exp(-t / K.fog);
        // Licht der Kabine (an der Kamera): Lambert + Abstand
        const ch = (CAMX - wx) * nx + (CAMZ - wz) * nz, cd2 = t * t + (CAMX - wx) ** 2 + (CAMZ - wz) ** 2;
        CAM[i] = Math.max(0, ch) / (cd2 * Math.sqrt(cd2) + 0.4);
        for (let c = 0; c < 3; c++) {
          const L = LAMPS[c];
          DH[c][i] = (wx - L.x) ** 2 + (wz - L.z) ** 2;
          NH[c][i] = Math.max(0.08, (L.x - wx) * nx + (L.z - wz) * nz);
        }
        // fernes Glühen um den Fluchtpunkt
        const rx = px + 0.5 - cx, ry = py + 0.5 - cy, rr = (rx * rx + ry * ry) / (gr * gr);
        GLOW[i] = 1 / (1 + rr) + 0.25 / (1 + rr * 0.08);
        // Seile: Abstand des Strahls zur Seilachse im Querschnitt
        RA[i] = 0; RT[i] = 0; RX[i] = 0;
        const al2 = a * a + b * b;
        if (al2 > 1e-9) {
          const al = Math.sqrt(al2);
          let best = 1e9;
          for (const [sx, sz] of ROPES) {
            const dx = sx - CAMX, dz = sz - CAMZ;
            const tc = (dx * a + dz * b) / al2;
            if (tc < 0.35 || tc > t || tc > best) continue;
            const dist = (dx * b - dz * a) / al;
            const fp = tc / f * 0.75;
            const re = Math.max(RR, fp);
            if (Math.abs(dist) < re) { best = tc; RT[i] = tc; RX[i] = dist / re; RA[i] = (RR / re) * Math.min(1, (re - Math.abs(dist)) / Math.max(fp, 1e-4) + 0.35); }
          }
        }
      }
    }
    // Fußabdruck eines Pixels auf der Wand (für Kantenglättung und Detailstufen)
    const { FPU, FPY } = this;
    for (let py = 0; py < PH; py++) {
      for (let px = 0; px < PW; px++) {
        const i = py * PW + px;
        const ir = px + 1 < PW ? i + 1 : i - 1, id = py + 1 < PH ? i + PW : i - PW;
        const fb = T[i] / f * 1.4;
        const du1 = WL[ir] === WL[i] ? Math.abs(U[ir] - U[i]) : fb, du2 = WL[id] === WL[i] ? Math.abs(U[id] - U[i]) : fb;
        FPU[i] = Math.max(0.004, Math.min(8, Math.max(du1, du2)));
        FPY[i] = Math.max(0.004, Math.min(40, Math.max(Math.abs(T[ir] - T[i]), Math.abs(T[id] - T[i]))));
      }
    }
    // Vignette
    const V = this.VIG;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5) / w - 0.5, dy = (y + 0.5) / h - 0.5;
        const d = Math.sqrt(dx * dx * 1.1 + dy * dy * 1.5);
        V[y * w + x] = 1 - 0.82 * smooth(0.22, 0.75, d);
      }
    }
    this.img = null;
  }

  // ---------------------------------------------------------------- Absätze (pro Bild)

  _landings() {
    const o = this.o, t = this.time, rf = o.reduceFlashing, L = this.L, seed = this.seed;
    const yA = this.camY, yB = this.camY + this.dir * FAR;
    const kLo = Math.floor(Math.min(yA, yB) / LSP) - 2;
    const n = Math.min(MAXL, Math.floor(Math.max(yA, yB) / LSP) + 3 - kLo);
    this.kLo = kLo; this.nL = n;
    for (let idx = 0; idx < n; idx++) {
      const k = kLo + idx;
      const H = (j) => hash(Math.imul(k, 7919) + j * 104729 + seed);
      // Wandlampen: meist an, manche sterbend, manche tot
      for (let c = 0; c < 2; c++) {
        const st = H(c + 1);
        let I = st < 0.08 ? 0 : 1;
        if (st >= 0.08 && st < 0.22) I = rf ? 0.5 : (hash(k * 31 + c * 7 + Math.floor(t * 13) * 977 + seed) > 0.42 ? 1 : 0.07);
        const cold = H(c + 5) < 0.2;
        (c ? L.i1 : L.i0)[idx] = I * (cold ? 9 : 13);
        (c ? L.c1 : L.c0)[idx] = cold ? 1 : 0;
      }
      // Etagentor: Spalt, offen, weit offen oder dunkel
      const dt = H(9);
      let gap, lit = 1;
      if (dt < 0.36) gap = 0.035;
      else if (dt < 0.6) gap = 0.25 + H(10) * 0.5;
      else if (dt < 0.72) gap = 2.4;
      else { gap = 0.02; lit = 0; }
      const lc = H(11), ci = lc < 0.3 ? 0 : lc < 0.5 ? 1 : lc < 0.68 ? 2 : lc < 0.86 ? 3 : 4;
      let di = lit * (1.6 + H(12) * 1.4);
      if (ci === 3) di *= rf ? 0.9 : 0.72 + 0.28 * Math.sin(t * 9.3 + k) * Math.sin(t * 13.7 + k * 3.1);   // Kerzen
      const col = DOORCOL[ci];
      L.gap[idx] = gap; L.dr[idx] = col[0]; L.dg[idx] = col[1]; L.db[idx] = col[2]; L.di[idx] = di;
      // Neon neben dem Tor (Kreuz, Ring, Pfeil)
      const nt = H(13);
      const neon = nt < 0.4 ? 0 : nt < 0.62 ? 1 : nt < 0.82 ? 2 : 3;
      const nc = NEONCOL[Math.floor(H(15) * NEONCOL.length) % NEONCOL.length];
      let ni = neon ? 2.2 : 0;
      if (neon && H(17) < 0.3 && !rf) ni *= hash(k * 13 + Math.floor(t * 9) * 31 + seed) > 0.22 ? 1 : 0.06;   // Wackelkontakt
      L.neon[idx] = neon; L.nr[idx] = nc[0]; L.ng[idx] = nc[1]; L.nb[idx] = nc[2]; L.ni[idx] = ni;
      // Gestalt im Türspalt (Fahrgast mit glattem Eikopf)
      L.sil[idx] = gap >= 0.4 && lit && H(19) < 0.4 ? (H(21) - 0.5) * Math.min(gap, 1.8) * 0.55 : 99;
      // Licht aus dem Tor in den Schacht (Farbe gemischt aus Tor und Neon)
      const open = gap < 0.1 ? 0.18 : Math.min(1.3, gap * 0.9);
      const a = di * open * 3.6, b = ni * 0.8;
      const s = a + b + 1e-6;
      L.li[idx] = s; L.lr[idx] = (col[0] * a + nc[0] * b) / s; L.lg[idx] = (col[1] * a + nc[1] * b) / s; L.lb[idx] = (col[2] * a + nc[2] * b) / s;
      // Nummer des Absatzes (1 … 99)
      const num = ((((-k - 1) % 99) + 99) % 99) + 1;
      L.label[idx] = String(num);
    }
  }

  // ---------------------------------------------------------------- Staub / Regen

  _particles(dt) {
    const P = this.parts, K = this.K, dir = this.dir, camY = this.camY;
    const want = K.rain ? 150 : 80;
    const spawn = (p, near) => {
      p.x = -HX + 0.2 + Math.random() * (HX * 2 - 0.4);
      p.z = -HZ + 0.2 + Math.random() * (HZ * 2 - 0.4);
      p.y = camY + dir * (near ? 1 + Math.random() * 40 : 20 + Math.random() * 35);
      p.b = 0.4 + Math.random() * 0.8;
      p.vx = (Math.random() - 0.5) * 0.15; p.vz = (Math.random() - 0.5) * 0.15;
    };
    while (P.length < want) { const p = {}; spawn(p, true); P.push(p); }
    const AR = this.AR, AG = this.AG, AB = this.AB, w = this.w, h = this.h, f = this.f, mir = this.mir;
    const cx = this.cx - PAD, cy = this.cy - PAD;
    const fall = K.rain ? 9 : 0;
    const col = K.rain ? [0.62, 0.6, 0.58] : [0.62, 0.48, 0.33];
    const plot = (x, y, v) => {
      x |= 0; y |= 0;
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const j = y * w + x;
      AR[j] += col[0] * v; AG[j] += col[1] * v; AB[j] += col[2] * v;
    };
    for (const p of P) {
      p.y -= fall * dt; p.x += p.vx * dt; p.z += p.vz * dt;
      const t = dir * (p.y - camY);
      if (t < 0.25 || t > 70) { spawn(p, false); continue; }
      // Licht am Teilchen: Kabine + nächste Lampe jeder Spalte
      let lit = 0.35 / (1 + t * t * 0.05);
      const yy = p.y;
      for (let c = 0; c < 3; c++) {
        const Lc = LAMPS[c], kk = Math.round((yy - Lc.ly) / LSP), idx = kk - this.kLo;
        if (idx < 0 || idx >= this.nL) continue;
        const I = c === 0 ? this.L.i0[idx] : c === 1 ? this.L.i1[idx] : this.L.li[idx] * 0.5;
        const dy = yy - (kk * LSP + Lc.ly), d2 = dy * dy + (p.x - Lc.x) ** 2 + (p.z - Lc.z) ** 2;
        lit += I * 0.08 / (d2 + 0.6);
      }
      const fog = Math.exp(-t / this.K.fog);
      const v = p.b * lit * fog;
      if (v < 0.01) continue;
      const sx = cx + f * (p.x - CAMX) * mir / t, sy = cy + f * (p.z - CAMZ) / t;
      // Schliere entlang der Bewegung (Regen länger)
      const t2 = t + (K.rain ? 0.55 : Math.max(0.05, K.speed * dt * 1.2));
      const ex = cx + f * (p.x - CAMX) * mir / t2, ey = cy + f * (p.z - CAMZ) / t2;
      const steps = Math.min(24, Math.max(1, Math.ceil(Math.max(Math.abs(ex - sx), Math.abs(ey - sy)))));
      const vv = v * (K.rain ? 1.3 : 1) / Math.sqrt(steps);
      for (let s = 0; s <= steps; s++) { const k = s / steps; plot(sx + (ex - sx) * k, sy + (ey - sy) * k, vv * (1 - k * 0.6)); }
      if (!K.rain && t < 2.2) { plot(sx + 1, sy, v * 0.6); plot(sx, sy + 1, v * 0.6); plot(sx + 1, sy + 1, v * 0.4); }
    }
  }

  // ---------------------------------------------------------------- Instrument

  _instrument(dt) {
    const c = this.ictx;
    if (!c) return;
    const W = 104, H = 48, rf = this.o.reduceFlashing, t = this.time;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, this.IW, this.IH);
    c.save();
    c.setTransform(this.IS, 0, 0, this.IS, 0, 0);
    // Tafel: dunkles Eisen, Messingrand, Nieten
    const plate = (x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); };
    const pg = c.createLinearGradient(0, 0, 0, H);
    pg.addColorStop(0, '#1d140b'); pg.addColorStop(1, '#0c0805');
    plate(1, 1, W - 2, H - 2, 4); c.fillStyle = pg; c.fill();
    c.lineWidth = 1; c.strokeStyle = '#7a5a28'; c.stroke();
    plate(2.5, 2.5, W - 5, H - 5, 3); c.strokeStyle = 'rgba(255,207,122,0.16)'; c.stroke();
    for (const [x, y] of [[5, 5], [W - 5, 5], [5, H - 5], [W - 5, H - 5]]) {
      c.fillStyle = '#5a4020'; c.fillRect(x - 1.5, y - 1.5, 3, 3);
      c.fillStyle = '#e8c27a'; c.fillRect(x - 1.5, y - 1.5, 1.5, 1.5);
    }
    // Zifferblatt
    const gx = 28, gy = 38, R = 22;
    const fg = c.createRadialGradient(gx, gy - 6, 2, gx, gy, R);
    fg.addColorStop(0, '#3a2a16'); fg.addColorStop(1, '#130d07');
    c.beginPath(); c.arc(gx, gy, R, Math.PI, 0); c.closePath(); c.fillStyle = fg; c.fill();
    c.lineWidth = 2; c.strokeStyle = '#a07a38';
    c.beginPath(); c.arc(gx, gy, R, Math.PI, 0); c.stroke();
    c.lineWidth = 1; c.strokeStyle = '#ffcf7a';
    c.beginPath(); c.arc(gx, gy, R + 0.5, Math.PI * 1.08, Math.PI * 1.45); c.stroke();
    c.strokeStyle = '#7a5a28'; c.beginPath(); c.moveTo(gx - R - 1, gy + 0.5); c.lineTo(gx + R + 1, gy + 0.5); c.stroke();
    // roter Bereich am Ende der Skala
    c.lineWidth = 2; c.strokeStyle = '#9a2a16';
    c.beginPath(); c.arc(gx, gy, R - 4, Math.PI * 1.8, Math.PI * 2); c.stroke();
    // Teilstriche
    c.lineWidth = 1;
    for (let i = 0; i <= 20; i++) {
      const a = Math.PI + (i / 20) * Math.PI, major = i % 5 === 0;
      const r0 = R - (major ? 8 : 5), r1 = R - 3;
      c.strokeStyle = major ? '#f0d28a' : '#9a7a40';
      c.beginPath(); c.moveTo(gx + Math.cos(a) * r0, gy + Math.sin(a) * r0); c.lineTo(gx + Math.cos(a) * r1, gy + Math.sin(a) * r1); c.stroke();
    }
    // Nadel: echter Fortschritt, sonst tastend; immer leicht zitternd
    let target = this.prog;
    if (target === null) target = 0.12 + 0.62 * (1 - Math.exp(-t / 7)) + 0.03 * Math.sin(t * 0.7);
    this.progShown += (target - this.progShown) * Math.min(1, dt * 3.5);
    const trem = (Math.sin(t * 31) * 0.5 + Math.sin(t * 17.3) * 0.5) * (rf ? 0.006 : 0.016) + this.shake * (rf ? 0.01 : 0.04) * Math.sin(t * 60);
    const na = Math.PI + Math.max(0, Math.min(1, this.progShown)) * Math.PI + trem;
    c.shadowColor = '#ff5a30'; c.shadowBlur = 4;
    c.strokeStyle = '#ff5530'; c.lineWidth = 1.4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(gx - Math.cos(na) * 4, gy - Math.sin(na) * 4); c.lineTo(gx + Math.cos(na) * (R - 4), gy + Math.sin(na) * (R - 4)); c.stroke();
    c.shadowBlur = 0;
    c.fillStyle = '#c9a050'; c.beginPath(); c.arc(gx, gy, 2.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffe3a0'; c.fillRect(gx - 1.5, gy - 1.5, 1, 1);
    // Nixie-Röhren: Nummer des zuletzt passierten Absatzes, weich umschaltend
    const floorNow = this._floorNow();
    const s = String(Math.min(999, floorNow)).padStart(3, '0');
    if (s !== this.nix.cur) { this.nix.prev = this.nix.cur; this.nix.cur = s; this.nix.sw = 0; }
    this.nix.sw = Math.min(1, this.nix.sw + dt * 7);
    const tx0 = 57, tw = 13, ty = 7, th = 29;
    for (let d = 0; d < 3; d++) {
      const x = tx0 + d * (tw + 2);
      // Glaskolben
      const gg = c.createLinearGradient(x, 0, x + tw, 0);
      gg.addColorStop(0, '#120b07'); gg.addColorStop(0.5, '#0a0604'); gg.addColorStop(1, '#140c07');
      plate(x, ty, tw, th, 5); c.fillStyle = gg; c.fill();
      c.strokeStyle = '#3e2c18'; c.lineWidth = 1; c.stroke();
      // Anodengitter
      c.fillStyle = 'rgba(120,70,30,0.18)';
      for (let yy = ty + 4; yy < ty + th - 3; yy += 2) for (let xx = x + 2 + ((yy >> 1) & 1); xx < x + tw - 2; xx += 2) c.fillRect(xx, yy, 1, 1);
      // Sockel
      c.fillStyle = '#2a1e10'; c.fillRect(x + 1, ty + th - 2, tw - 2, 3);
      // unbeleuchtete Kathoden (Geisterziffer)
      this._nixieDigit(c, (Number(this.nix.cur[d]) + 5) % 10, x + 2.5, ty + 6, 0.8, 'rgba(90,52,26,0.35)', 0);
      const flick = !rf && hash(Math.floor(t * 20) * 7 + d + this.seed) < 0.015 ? 0.35 : 1;
      if (this.nix.sw < 1 && this.nix.prev[d] !== this.nix.cur[d]) this._nixieDigit(c, Number(this.nix.prev[d]), x + 2.5, ty + 6, 0.8, `rgba(255,150,70,${(1 - this.nix.sw) * 0.8})`, 3);
      const a = (this.nix.prev[d] !== this.nix.cur[d] ? this.nix.sw : 1) * flick;
      this._nixieDigit(c, Number(this.nix.cur[d]), x + 2.5, ty + 6, 0.8, `rgba(255,120,40,${0.55 * a})`, 5, 2.2);
      this._nixieDigit(c, Number(this.nix.cur[d]), x + 2.5, ty + 6, 0.8, `rgba(255,196,120,${a})`, 2, 1);
      // Glanzlicht auf dem Glas
      c.fillStyle = 'rgba(255,230,190,0.13)'; c.fillRect(x + 2, ty + 3, 1, th - 8);
    }
    // Beschriftung (Pixelschrift)
    this._label(c, 'ABSATZ', tx0 + 9, 40, '#9a7a40');
    c.restore();
    this.inst = c.getImageData(0, 0, this.IW, this.IH).data;
  }

  _label(c, text, x, y, color) {
    c.fillStyle = color;
    for (let i = 0; i < text.length; i++) {
      const g = FONT[text[i]];
      if (!g) continue;
      for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) if ((g[r] >> (2 - q)) & 1) c.fillRect(x + i * 4 + q, y + r, 1, 1);
    }
  }

  // Nixie-Ziffern als dünne Glühdrähte (Kasten 8 × 14 bei s = 1)
  _nixieDigit(c, n, x, y, s, color, blur = 0, width = 1) {
    c.save();
    c.translate(x, y); c.scale(s, s);
    c.strokeStyle = color; c.lineWidth = width / s; c.lineCap = 'round'; c.lineJoin = 'round';
    if (blur) { c.shadowColor = color; c.shadowBlur = blur; }
    c.beginPath();
    switch (n) {
      case 0: c.ellipse(5, 9, 4, 8, 0, 0, Math.PI * 2); break;
      case 1: c.moveTo(3, 3); c.lineTo(5.5, 1); c.lineTo(5.5, 17); break;
      case 2: c.moveTo(1.5, 5); c.bezierCurveTo(1.5, 0, 9, 0, 9, 5); c.bezierCurveTo(9, 8, 3, 12, 1, 17); c.lineTo(9.5, 17); break;
      case 3: c.moveTo(1.5, 1); c.lineTo(9, 1); c.lineTo(4.5, 7.5); c.bezierCurveTo(10.5, 7, 10.5, 17, 5, 17); c.bezierCurveTo(3, 17, 1.5, 16, 1, 14.5); break;
      case 4: c.moveTo(7.5, 17); c.lineTo(7.5, 1); c.lineTo(1, 12); c.lineTo(9.5, 12); break;
      case 5: c.moveTo(9, 1); c.lineTo(2.5, 1); c.lineTo(1.8, 8); c.bezierCurveTo(5, 5.5, 9.5, 7, 9.5, 11.5); c.bezierCurveTo(9.5, 17.5, 2.5, 18, 1, 14.5); break;
      case 6: c.moveTo(8.5, 1.5); c.bezierCurveTo(4, 1, 1, 6, 1, 12); c.moveTo(9.3, 12.5); c.ellipse(5.2, 12.5, 4.1, 4.5, 0, 0, Math.PI * 2); break;
      case 7: c.moveTo(1, 1); c.lineTo(9.5, 1); c.lineTo(3.5, 17); break;
      case 8: c.moveTo(8.3, 5); c.ellipse(5, 5, 3.3, 4, 0, 0, Math.PI * 2); c.moveTo(9.3, 13); c.ellipse(5, 13, 4.3, 4.2, 0, 0, Math.PI * 2); break;
      case 9: c.moveTo(9, 6); c.ellipse(5, 6, 4, 4.6, 0, 0, Math.PI * 2); c.moveTo(9, 6); c.bezierCurveTo(9, 12, 6.5, 17, 2, 17); break;
      default: c.moveTo(2, 9); c.lineTo(8, 9);
    }
    c.stroke();
    c.restore();
  }

  // Nummer des zuletzt passierten Absatzes
  _floorNow() {
    const k = this.dir < 0 ? Math.ceil(this.camY / LSP) : Math.floor(this.camY / LSP);
    return Math.max(0, -k);
  }

  // ---------------------------------------------------------------- Bild

  render(ctx, dt) {
    dt = Math.max(0, Math.min(0.1, dt));
    const o = this.o, K = this.K, rf = o.reduceFlashing;
    const w = this.w, h = this.h, PW = this.PW;
    this.time += dt; this.frame++;
    const time = this.time;
    // Fahrt: leichtes Schwanken im Tempo, Stöße an den Schienenlaschen
    const sp = K.speed * (1 + 0.06 * Math.sin(time * 0.6) + 0.03 * Math.sin(time * 1.7));
    const oldY = this.camY;
    this.camY += this.dir * sp * dt;
    if (Math.floor(oldY / 5) !== Math.floor(this.camY / 5)) this.shake = rf ? 0.35 : 1;
    this.shake = Math.max(0, this.shake - dt * 5);
    const shX = Math.round((Math.random() - 0.5) * 2.4 * this.shake), shY = Math.round((Math.random() - 0.5) * 2.4 * this.shake);
    // Kabinenlicht: Flackern, gelegentlich Spannungsabfall
    this.brownT -= dt;
    if (this.brownT < 0) { this.brownT = 12 + Math.random() * 16; if (!rf) this.brown = 0.45; }
    this.brown = Math.max(0, this.brown - dt);
    const camI = 6.5 * (0.92 + 0.08 * Math.sin(time * 7.1) * Math.sin(time * 3.3)) * (this.brown > 0 ? (Math.random() < 0.5 ? 0.25 : 0.6) : 1);
    // VHS-Störung
    const rowOff = this.rowOff, rowNoise = this.rowNoise;
    rowOff.fill(0); rowNoise.fill(0);
    if (!rf) {
      this.glitchT -= dt;
      if (this.glitchT < 0) { this.glitch = 0.12 + Math.random() * 0.22; this.glitchT = 6 + Math.random() * 9; this.gy = Math.random() * h; this.gh = 3 + Math.random() * h * 0.12; }
      if (this.glitch > 0) {
        this.glitch -= dt;
        const y0 = Math.floor(this.gy), y1 = Math.min(h, y0 + Math.floor(this.gh));
        const off = Math.round((Math.random() - 0.5) * 10);
        for (let y = Math.max(0, y0); y < y1; y++) { rowOff[y] = Math.max(-PAD, Math.min(PAD, off + ((Math.random() * 3) | 0) - 1)); rowNoise[y] = 0.12; }
        this.gy += dt * h * 1.5;
      }
      // wandernde Spurlinie, ganz schwach
      const tl = Math.floor(((time * 0.11) % 1.3) * h);
      if (tl < h) { rowNoise[tl] = Math.max(rowNoise[tl], 0.05); if (tl + 1 < h) rowNoise[tl + 1] = Math.max(rowNoise[tl + 1], 0.03); }
    }
    // Fernes Glühen (unten: glimmendes Rot, pulsierend; oben: Natrium des Markts)
    const pulse = K.pulse ? (rf ? 0.75 : 0.62 + 0.38 * Math.pow(0.5 + 0.5 * Math.sin(time * 1.1), 3)) : 1;
    const glR = K.glow[0] * pulse, glG = K.glow[1] * pulse, glB = K.glow[2] * pulse;
    const fogR = K.fogCol[0], fogG = K.fogCol[1], fogB = K.fogCol[2];

    this._landings();
    this._particles(dt);
    this._instrument(dt);

    if (!this.img || this.img.width !== w || this.img.height !== h) { this.img = ctx.createImageData(w, h); this.out = new Uint32Array(this.img.data.buffer); }
    const out = this.out;
    const { T, U, WL, FOG, CAM, FPU, FPY, GLOW, RA, RT, RX, VIG, AR, AG, AB, TM } = this;
    const DH0 = this.DH[0], DH1 = this.DH[1], DH2 = this.DH[2], NH0 = this.NH[0], NH1 = this.NH[1], NH2 = this.NH[2];
    const L = this.L, kLo = this.kLo, nL = this.nL;
    const camY = this.camY, dir = this.dir, flipT = dir < 0;
    const inst = this.inst, IW = this.IW, IH = this.IH;
    const ix0 = w - IW - this.IM, iy0 = h - IH - this.IM;
    const grain = rf ? 0.035 : 0.06;
    let rnd = this.rnd;
    const LI0 = L.i0, LI1 = L.i1, LC0 = L.c0, LC1 = L.c1, LLI = L.li, LLR = L.lr, LLG = L.lg, LLB = L.lb;
    const LOFF0 = LAMPS[0].ly, LOFF1 = LAMPS[1].ly, LOFF2 = LAMPS[2].ly;

    for (let y = 0; y < h; y++) {
      const sy = Math.max(0, Math.min(this.PH - 1, y + PAD + shY));
      const ro = rowOff[y], rn = rowNoise[y];
      for (let x = 0; x < w; x++) {
        let sx = x + PAD + shX + ro;
        if (sx < 0) sx = 0; else if (sx >= PW) sx = PW - 1;
        const i = sy * PW + sx, j = y * w + x;
        const t = T[i];
        let r = 0, g = 0, b = 0;
        if (t >= FAR) { r = fogR; g = fogG; b = fogB; }
        else {
          const yy = camY + dir * t;
          const wl = WL[i], u = U[i], fu = FPU[i], fy = FPY[i];
          const kf = Math.floor(yy / LSP), ly = yy - kf * LSP;
          let li = kf - kLo; if (li < 0) li = 0; else if (li >= nL) li = nL - 1;
          // ---- Beton mit Schalungsfugen und Rostschlieren
          let base = 0.13 + 0.075 * hash2(Math.floor(u * 0.8333) + wl * 17, Math.floor(yy * 0.6667));
          if (fu < 0.6) base *= 1 - 0.5 * Math.max(pcov(u, 1.2, 0.014, fu), pcov(yy, 1.5, 0.014, fy));
          const st = hash(Math.floor(u * 4) * 31 + wl * 7 + kf * 131);
          if (st > 0.72) base *= 1 - (st - 0.72) * 1.8 * Math.max(0, 1 - (LSP - ly) / 4.5);
          let ar = base, ag = base * 0.92, ab = base * 0.82;
          let er = 0, eg = 0, eb = 0;
          // ---- Ringträger am Absatz (0 … 0,55 m)
          const band = pcov(yy - 0.275, LSP, 0.275, fy);
          if (band > 0) {
            let s = 0.1;
            if (fy < 0.2) {
              s += 0.22 * cov(ly, 0.52, 0.025, fy);                                   // blanke Kante
              s += 0.2 * pcov(u, 0.32, 0.03, fu) * cov(ly, 0.27, 0.03, fy);             // Nieten
              s -= 0.05 * cov(ly, 0.05, 0.04, fy);
            }
            let br = s, bg = s * 0.94, bb = s * 0.88;
            if (wl === 3 && ly < 0.5) {                                                 // Warnanstrich an der Schwelle
              const k = fu > 0.09 ? 0.5 : ((u + ly) * 2.4 - Math.floor((u + ly) * 2.4) < 0.5 ? 1 : 0);
              br = br * (1 - k) + 0.6 * k; bg = bg * (1 - k) + 0.45 * k; bb = bb * (1 - k) + 0.07 * k;
              if (k < 1) { br = br * 0.7 + 0.02; bg = bg * 0.7 + 0.02; bb = bb * 0.7 + 0.02; }
            }
            ar += (br - ar) * band; ag += (bg - ag) * band; ab += (bb - ab) * band;
          }
          // ---- Wandlampen im Käfig (Gehäuse, Birne, Hof)
          if (wl < 2) {
            const off = wl ? LOFF1 : LOFF0, lu = LAMPS[wl].u;
            const kl = Math.round((yy - off) / LSP), lidx = kl - kLo;
            const dyl = yy - (kl * LSP + off), dul = u - lu;
            if (lidx >= 0 && lidx < nL) {
              const I = (wl ? LI1 : LI0)[lidx], cold = (wl ? LC1 : LC0)[lidx];
              const lc = cold ? COLD : SODIUM;
              if (Math.abs(dul) < 0.3 && Math.abs(dyl) < 0.35) {
                const hsg = cov(dul, 0, 0.17, fu) * cov(dyl, 0, 0.24, fy);
                ar += (0.05 - ar) * hsg; ag += (0.045 - ag) * hsg; ab += (0.04 - ab) * hsg;
                const q = (dul * dul + dyl * dyl * 0.55) / 0.012;
                let e = I * 0.55 / (1 + q * q);
                if (q < 1.5 && fu < 0.05) e *= 1 - 0.55 * pcov(dul, 0.07, 0.009, fu);
                er += lc[0] * e; eg += lc[1] * e; eb += lc[2] * e;
              }
              const hq = (dul * dul + dyl * dyl) / 0.2;
              const e2 = I * 0.03 / (1 + hq);
              er += lc[0] * e2; eg += lc[1] * e2; eb += lc[2] * e2;
            }
            // Führungsschiene, Konsolen, Laschen
            const rail = cov(u, 0, 0.065, fu);
            if (rail > 0) { const s = 0.3 + 0.28 * cov(u, 0, 0.02, fu); ar += (s - ar) * rail; ag += (s * 0.97 - ag) * rail; ab += (s * 0.93 - ab) * rail; }
            const brk = pcov(yy - 1.2, 2.5, 0.07, fy) * cov(u, 0, 0.32, fu);
            if (brk > 0) { ar += (0.06 - ar) * brk; ag += (0.055 - ag) * brk; ab += (0.05 - ab) * brk; }
            const jt = pcov(yy - 3.7, 5, 0.22, fy) * cov(u, 0, 0.1, fu);
            if (jt > 0) { const s = 0.22 + (fy < 0.05 ? 0.2 * pcov(yy - 3.7, 0.14, 0.02, fy) : 0); ar += (s - ar) * jt; ag += (s - ag) * jt; ab += (s * 0.95 - ab) * jt; }
            // große Schablonen-Nummer an der linken Wand
            if (wl === 0 && ly > 6.0 && ly < 7.2 && u < 1.9 && u > -2.4) {
              const lab = L.label[li];
              if (glyphBit(lab, 1.8 - u, 7.15 - ly, 0.22, flipT) && hash2(Math.floor(u * 14), Math.floor(yy * 14) + kf) > 0.16) {
                const p = fu > 0.15 ? 0.5 : 1;
                ar += (0.6 - ar) * p; ag += (0.48 - ag) * p; ab += (0.18 - ab) * p;
              }
            }
          } else if (wl === 2) {
            // Rückwand: Gegengewichtsschienen, Kabelstrang, Steigleiter
            const cw = Math.max(cov(u, -1.7, 0.045, fu), cov(u, 1.2, 0.045, fu));
            if (cw > 0) { ar += (0.26 - ar) * cw; ag += (0.25 - ag) * cw; ab += (0.24 - ab) * cw; }
            const pipe = Math.max(cov(u, -2.6, 0.028, fu), cov(u, -2.5, 0.028, fu), cov(u, -2.4, 0.035, fu));
            if (pipe > 0) {
              const s = 0.08 + 0.1 * pcov(yy, 1.0, 0.04, fy) * cov(u, -2.5, 0.16, fu);
              ar += (s - ar) * pipe; ag += (s * 0.9 - ag) * pipe; ab += (s * 0.8 - ab) * pipe;
            }
            const lad = Math.max(cov(u, 2.1, 0.022, fu), cov(u, 2.6, 0.022, fu), pcov(yy, 0.3, 0.014, fy) * cov(u, 2.35, 0.25, fu));
            if (lad > 0) { ar += (0.2 - ar) * lad; ag += (0.16 - ag) * lad; ab += (0.12 - ab) * lad; }
          } else {
            // Torwand: Etagentor, Emailleschild, Neon
            const du = u - DU, dl = ly - 0.55;
            if (dl > 0 && dl < 3.4 && du > -1.68 && du < 1.68) {
              const inOpen = dl < 3.2 && du > -1.5 && du < 1.5;
              if (!inOpen) {
                // Stahlrahmen mit Warnstreifen
                const k = fu > 0.08 ? 0.45 : ((du + dl) * 2.2 - Math.floor((du + dl) * 2.2) < 0.5 ? 1 : 0);
                ar = 0.05 + 0.5 * k; ag = 0.05 + 0.37 * k; ab = 0.04 + 0.04 * k;
              } else {
                const gap = L.gap[li], di = L.di[li];
                const dr = L.dr[li], dg = L.dg[li], db = L.db[li];
                // Spalt: Licht von drüben (Mitte heller), vielleicht eine Gestalt davor
                const c = cov(du, 0, gap * 0.5, fu);
                const leaf = 1 - c;
                if (c > 0) {
                  let e = di * (0.55 + 0.45 * Math.max(0, 1 - Math.abs(dl - 1.7) / 1.8));
                  const so = L.sil[li];
                  if (so < 50) {
                    const sx = du - so, hy = dl - 2.33;
                    const head = (sx * sx) / 0.0144 + (hy * hy) / 0.034 < 1;
                    const body = dl < 2.15 && Math.abs(sx) < 0.17 + 0.13 * (1 - dl / 2.15) - (dl > 1.95 ? (dl - 1.95) * 0.4 : 0);
                    if (head || body) e *= 0.04;
                  }
                  er += dr * e * c; eg += dg * e * c; eb += db * e * c;
                  ar *= leaf; ag *= leaf; ab *= leaf;
                }
                if (leaf > 0) {
                  // Torflügel: Stahl mit Rippen, kleines Drahtglasfenster
                  let s = 0.085;
                  if (fu < 0.1) s += 0.045 * pcov(du, 0.3, 0.02, fu);
                  const wdx = Math.abs(du) - 0.8;
                  if (Math.abs(wdx) < 0.17 && dl > 1.7 && dl < 2.35) {
                    const e = di * 0.22 * (fu < 0.04 ? 1 - 0.5 * Math.max(pcov(du, 0.06, 0.006, fu), pcov(dl, 0.06, 0.006, fy)) : 0.8);
                    er += dr * e * leaf; eg += dg * e * leaf; eb += db * e * leaf;
                    s = 0.03;
                  }
                  ar += (s - ar) * leaf; ag += (s * 0.97 - ag) * leaf; ab += (s * 0.95 - ab) * leaf;
                }
              }
            } else if (dl > 3.55 && dl < 4.05 && Math.abs(du) < 0.5) {
              // Emailleschild über dem Tor: helle Platte, dunkle Ziffern
              const lab = L.label[li], ink = glyphBit(lab, 0.4 - du - (3 - lab.length) * 0.15, 3.97 - dl, 0.075, flipT);
              const s = ink ? 0.05 : 0.62;
              ar = s; ag = s * 0.96; ab = s * 0.88;
            }
            // Neonzeichen neben dem Tor (auf dunkler Trägerplatte)
            const neon = L.neon[li];
            if (neon) {
              const nx = u + 2.1, ny = ly - 2.8;
              if (Math.abs(nx) < 0.55 && Math.abs(ny) < 0.62) {
                const pk = cov(nx, 0, 0.5, fu) * cov(ny, 0, 0.58, fy);
                ar += (0.035 - ar) * pk; ag += (0.03 - ag) * pk; ab += (0.03 - ab) * pk;
              }
              if (Math.abs(nx) < 1.4 && Math.abs(ny) < 1.5) {
                let d = 0;
                if (neon === 1) d = Math.min(segDist(nx, ny, 0, -0.45, 0, 0.45), segDist(nx, ny, -0.3, 0.16, 0.3, 0.16));
                else if (neon === 2) d = Math.abs(Math.sqrt(nx * nx + ny * ny) - 0.34);
                else d = Math.min(segDist(nx, ny, -0.32, 0.25, 0, -0.12), segDist(nx, ny, 0.32, 0.25, 0, -0.12), segDist(nx, ny, -0.32, -0.05, 0, -0.42), segDist(nx, ny, 0.32, -0.05, 0, -0.42));
                const ni = L.ni[li];
                const core = Math.max(0, Math.min(1, (0.03 - d) / Math.max(fu, 0.012) + 0.5));
                const e = ni * (core * 2.2 + 0.28 / (1 + (d * d) / 0.012));
                er += L.nr[li] * e; eg += L.ng[li] * e; eb += L.nb[li] * e;
              }
            }
          }
          // ---- Licht: Kabine + je Spalte die zwei nächsten Lampen
          let lr = 0.03 + CAM[i] * camI * 0.85, lg = 0.024 + CAM[i] * camI * 0.62, lb = 0.02 + CAM[i] * camI * 0.42;
          // linke Wandlampen
          {
            const kc = Math.round((yy - LOFF0) / LSP), dy0 = yy - (kc * LSP + LOFF0);
            const nq = dy0 > 3.5 || dy0 < -3.5 ? 2 : 1;
            for (let q = 0; q < nq; q++) {
              const kk = q ? kc + (dy0 > 0 ? 1 : -1) : kc, idx = kk - kLo;
              if (idx < 0 || idx >= nL) continue;
              const I = LI0[idx]; if (I <= 0) continue;
              const dy = q ? yy - (kk * LSP + LOFF0) : dy0, d2 = dy * dy + DH0[i];
              const k = I * NH0[i] / (d2 * (0.6 + 0.28 * d2) + 0.25);
              if (LC0[idx]) { lr += 0.55 * k; lg += 0.86 * k; lb += 0.8 * k; } else { lr += k; lg += 0.5 * k; lb += 0.17 * k; }
            }
          }
          // rechte Wandlampen
          {
            const kc = Math.round((yy - LOFF1) / LSP), dy0 = yy - (kc * LSP + LOFF1);
            const nq = dy0 > 3.5 || dy0 < -3.5 ? 2 : 1;
            for (let q = 0; q < nq; q++) {
              const kk = q ? kc + (dy0 > 0 ? 1 : -1) : kc, idx = kk - kLo;
              if (idx < 0 || idx >= nL) continue;
              const I = LI1[idx]; if (I <= 0) continue;
              const dy = q ? yy - (kk * LSP + LOFF1) : dy0, d2 = dy * dy + DH1[i];
              const k = I * NH1[i] / (d2 * (0.6 + 0.28 * d2) + 0.25);
              if (LC1[idx]) { lr += 0.55 * k; lg += 0.86 * k; lb += 0.8 * k; } else { lr += k; lg += 0.5 * k; lb += 0.17 * k; }
            }
          }
          // Licht aus den Etagentoren
          {
            const kc = Math.round((yy - LOFF2) / LSP), dy0 = yy - (kc * LSP + LOFF2);
            const nq = dy0 > 3.5 || dy0 < -3.5 ? 2 : 1;
            for (let q = 0; q < nq; q++) {
              const kk = q ? kc + (dy0 > 0 ? 1 : -1) : kc, idx = kk - kLo;
              if (idx < 0 || idx >= nL) continue;
              const I = LLI[idx]; if (I <= 0.01) continue;
              const dy = q ? yy - (kk * LSP + LOFF2) : dy0, d2 = dy * dy + DH2[i];
              const k = I * NH2[i] / (d2 * (0.6 + 0.28 * d2) + 0.25);
              lr += LLR[idx] * k; lg += LLG[idx] * k; lb += LLB[idx] * k;
            }
          }
          r = ar * lr + er; g = ag * lg + eg; b = ab * lb + eb;
          const fk = FOG[i];
          r = r * fk + fogR * (1 - fk); g = g * fk + fogG * (1 - fk); b = b * fk + fogB * (1 - fk);
        }
        // ---- Tragseile (vor der Wand)
        const ra = RA[i];
        if (ra > 0) {
          const rt = RT[i], ryy = camY + dir * rt, rx = RX[i];
          const shade = 0.35 + 0.65 * Math.sqrt(Math.max(0, 1 - rx * rx));
          const strand = rt < 12 ? 0.62 + 0.38 * Math.sin((ryy * 11 + rx * 1.6) * 6.2832) : 0.62;
          let lit = 0.012 + camI * 0.6 / (rt * rt + 1.5);
          for (let c = 0; c < 3; c++) {
            const Lc = LAMPS[c], kk = Math.round((ryy - Lc.ly) / LSP), idx = kk - kLo;
            if (idx < 0 || idx >= nL) continue;
            const I = c === 0 ? LI0[idx] : c === 1 ? LI1[idx] : LLI[idx];
            const dy = ryy - (kk * LSP + Lc.ly), d2 = dy * dy + 7;
            lit += I * 1.6 / (d2 * Math.sqrt(d2) + 0.25);
          }
          const v = 0.3 * shade * strand * lit, fk = Math.exp(-rt / K.fog);
          const rr = (v * 1.05) * fk + fogR * (1 - fk), rg = (v * 0.95) * fk + fogG * (1 - fk), rb = (v * 0.85) * fk + fogB * (1 - fk);
          r += (rr - r) * ra; g += (rg - g) * ra; b += (rb - b) * ra;
        }
        // ---- fernes Glühen, Teilchen
        const gl = GLOW[i];
        r += glR * gl; g += glG * gl; b += glB * gl;
        r += AR[j]; g += AG[j]; b += AB[j];
        AR[j] = 0; AG[j] = 0; AB[j] = 0;
        // ---- Tonwert, Vignette
        const vg = VIG[j];
        let ri = (r * TMS) | 0, gi = (g * TMS) | 0, bi = (b * TMS) | 0;
        r = TM[ri < TMN ? ri : TMN - 1] * vg; g = TM[gi < TMN ? gi : TMN - 1] * vg; b = TM[bi < TMN ? bi : TMN - 1] * vg;
        // leichte Farbstimmung: warme Schwärzen, Lichter ins Messing
        r = r * 0.97 + 0.012; g = g * 0.95 + 0.008; b = b * 0.9 + 0.006;
        // ---- Instrument
        if (inst && x >= ix0 && y >= iy0 && x < ix0 + IW && y < iy0 + IH) {
          const p = ((y - iy0) * IW + (x - ix0)) * 4, a = inst[p + 3] / 255;
          if (a > 0) { r += (inst[p] / 255 - r) * a; g += (inst[p + 1] / 255 - g) * a; b += (inst[p + 2] / 255 - b) * a; }
        }
        // ---- Korn, Störzeilen, Dithering
        rnd = (Math.imul(rnd, 1664525) + 1013904223) >>> 0;
        let n = ((rnd >>> 8) / 16777216 - 0.5) * grain;
        if (rn > 0) n += ((rnd & 255) / 255) * rn;
        const d = BAYER[((y & 3) << 2) | (x & 3)];
        let R = ((r + n) * LEVELS + d) | 0, G = ((g + n) * LEVELS + d) | 0, B = ((b + n * 0.9) * LEVELS + d) | 0;
        R = R < 0 ? 0 : R > LEVELS ? LEVELS : R; G = G < 0 ? 0 : G > LEVELS ? LEVELS : G; B = B < 0 ? 0 : B > LEVELS ? LEVELS : B;
        out[j] = 0xff000000 | (Q8[B] << 16) | (Q8[G] << 8) | Q8[R];
      }
    }
    this.rnd = rnd;
    ctx.putImageData(this.img, 0, 0);
  }
}
