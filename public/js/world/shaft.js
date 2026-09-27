// SCHACHTFAHRT – was man während der Fahrt durch das Scherengitter sieht.
// Echte Geometrie statt verschobener Textur: Die Schachtwand besteht aus Segmenten (Betonfuge bzw.
// Steingesims am Stoß, Stahlstützen mit Führungsschienen, Querträger, Kabelpritsche, Rohre, Lampen),
// dazwischen Etagen-Absätze mit geschlossenen Toren, Gittern oder Vermauerung und Nummernschild.
// Alle Teile liegen in Pools je Stil und laufen als Ringpuffer um die Kabine – während der Fahrt
// wird nichts neu gebaut. Das Licht der gerade vorbeiziehenden Lampe übernimmt die eine Schachtlampe
// der Kabine (keine zusätzlichen Lichter) und wandert so als Lichtstreifen durch die Kabine.
// Bewegung: weiches Anfahren, Fahrt, Bremsen genau auf einen Absatz (Boden bündig mit der Kabine).
// Koordinaten: Kabinenraum (Ursprung = Kabinenboden, Tor zur +Z-Seite). Schachtkoordinate S:
// fest im Schacht, die Kabine steht bei this.pos (abwärts = kleiner werdend).

import * as THREE from 'three';
import { Builder, boxGeometry, cylGeometry, torusGeometry, coneGeometry } from '../gfx/geo.js';
import { mat, glowMat, hasMat } from '../gfx/materials.js';
import { textTexture, chalkTexture } from '../gfx/textures.js';
import { clamp, damp, smoothstep, RNG, hashStr } from '../core/rng.js';

// ---------------------------------------------------------------- Maße
// Alles, was vorbeizieht, bleibt hinter ZIN: Das Schwellenblech der Kabine reicht bis z = 2,27.
const ZIN = 2.30;     // Vorderkante Absatz-Rahmen, Schwelle, Führungsschienen
const ZW = 2.62;      // Fläche der Schachtwand
const XS = 2.95;      // Innenfläche der Seitenwände (Kabine außen: 2,62)
const XC = 2.3;       // Stützen mit Führungsschienen
const SEG = 3.0;      // Wandsegment = ein Schalungsabschnitt
const LAND = 4.2;     // Absatz-Segment
const FLOOR = 0.6;    // Bodenhöhe des Absatzes im Segment
const OPEN = 1.62;    // halbe lichte Weite der Absatz-Öffnung
const FRAME = 1.95;   // halbe Außenbreite des Torrahmens
const DOOR_H = 2.78;
const LEAF_Z = 2.36;  // Torflügel der vorbeiziehenden Absätze
const HOME_Z = 2.19;  // Rahmen der Heimat-Etage – das echte Etagentor der Kabine hängt davor (2,16)
const Y_MIN = -9, Y_MAX = 12;      // Pufferbereich; durchs Gitter sichtbar ist etwa −1,5 … 4,5
const GUARD_LO = -3.6, GUARD_HI = 6.6; // dahinter darf beim Bremsen neu gelegt werden (unsichtbar, lichtlos)
const RAIL = 5.0;     // Schienenlänge – an jedem Stoß ruckt die Kabine
const EYE = 1.5;
const A_RUN = 1.5, A_BRAKE = 1.2, V_LEV = 0.22, R_LEV = 0.3;
const LIGHT_I = 11;

// ---------------------------------------------------------------- Stile
// Oben (Markt, Ladebucht): Beton und Stahl. Tiefer: Stein, Rost, Salz, Knochen.
const CONCRETE = {
  wall: 'concrete', ledge: 'concrete', iron: 'steel', beamM: 'steel', cable: 'rubber',
  door: 'steelPanel', lamp: 0xffb070, plate: 'enamel', beams: 0.75, ties: true, stencil: true, hazard: true,
  lampEvery: 9.5, lampChance: 0.65, chalk: 0.06, signs: 0.3,
  landings: ['steel', 'steel', 'steel', 'ajar', 'bricked', 'grille'],
};
const STONE = {
  wall: 'stoneDark', ledge: 'stone', iron: 'rust', beamM: 'rust', cable: 'robe',
  door: 'walnut', lamp: 0xffa060, plate: 'brass', beams: 0.3, courses: true,
  lampEvery: 12, lampChance: 0.5, chalk: 0.3, signs: 0,
  landings: ['wood', 'wood', 'grille', 'grille', 'bricked', 'ajar'],
};
const STYLES = {
  concrete: CONCRETE,
  pipes:   { ...CONCRETE, iron: 'rust', beamM: 'rust', lamp: 0xff7040, hazard: false },
  stone:   STONE,
  ossuary: { ...STONE, lamp: 0xff8840, bones: true, plate: 'chalk', landings: ['grille', 'grille', 'wood', 'bricked', 'bricked', 'ajar'] },
  salt:    { ...STONE, ledge: 'salt', door: 'rust', lamp: 0xa8d8ff, crust: true, landings: ['grille', 'steel', 'ajar', 'bricked', 'steel', 'grille'] },
  water:   { ...STONE, wall: 'brick', lamp: 0x60d0ff },
  rock:    { ...STONE, wall: 'rock', lamp: 0xffd090 },
  flesh:   { ...STONE, wall: 'flesh', lamp: 0xff3020 },
  void:    { ...STONE, wall: 'rock', lamp: 0x000000, lampEvery: Infinity, beams: 0, chalk: 0, landings: ['bricked', 'bricked', 'grille', 'bricked', 'bricked', 'bricked'] },
};

const CHALK = ['||||  ||||  ||||  ||', 'NICHT HALTEN', 'NICHT AUSSTEIGEN', 'ZÄHL DIE TÜREN', 'WER KLOPFT DA?', 'IX ↓', 'SIE HÖREN ZU', 'NICHT ANTWORTEN', '||||  |||'];
const SIGNS = [['SCHACHT IX', '#e8e0c8', '#1c1a18'], ['BETRETEN\nVERBOTEN', '#c8a020', '#141210'], ['LAST 2000 KG', '#e8e0c8', '#7a1410'], ['NOTAUSSTIEG ↑', '#2a6a3a', '#e8e0c8']];

// ---------------------------------------------------------------- geteilte Kleinteile
let BULB_GEO = null, LENS_GEO = null;
const decalMats = new Map();

function bulbGeo() { return BULB_GEO || (BULB_GEO = new THREE.SphereGeometry(0.048, 10, 8)); }
function lensGeo() { return LENS_GEO || (LENS_GEO = new THREE.BoxGeometry(0.11, 0.17, 0.012)); }

function decalMat(key, make) {
  if (decalMats.has(key)) return decalMats.get(key);
  const m = new THREE.MeshStandardMaterial({ map: make(), transparent: true, depthWrite: false, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 });
  decalMats.set(key, m);
  return m;
}

function signTexture([text, bg, fg]) {
  return textTexture(256, 160, (g, w, h) => {
    g.fillStyle = bg; g.beginPath(); g.roundRect(3, 3, w - 6, h - 6, 10); g.fill();
    g.strokeStyle = fg; g.lineWidth = 5; g.beginPath(); g.roundRect(12, 12, w - 24, h - 24, 6); g.stroke();
    g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lines = text.split('\n');
    g.font = `bold ${lines.length > 1 ? 34 : 38}px Arial, sans-serif`;
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 40));
    // Rost und Abplatzer
    for (let i = 0; i < 26; i++) {
      g.fillStyle = i % 3 ? 'rgba(60,30,12,0.5)' : 'rgba(10,8,6,0.85)';
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 1 + Math.random() * 6, 0, Math.PI * 2); g.fill();
    }
  });
}

// Quader mit verschobenen Meter-UVs (damit nicht jedes Segment dasselbe Muster zeigt)
function uvBox(sx, sy, sz, u0, v0) {
  const g = boxGeometry(sx, sy, sz);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) + u0, uv.getY(i) + v0);
  return g;
}

// ---------------------------------------------------------------- Bauteile

// Wandscheibe, Seitenwände, Fuge am Stoß (opening: Aussparung für einen Absatz)
function shell(b, st, h, rng, opening = false) {
  const wallM = mat(st.wall);
  const u = rng.float(0, 9), v = rng.float(0, 9);
  if (!opening) b.add(wallM, uvBox(2 * XS + 0.4, h, 0.4, u, v), 0, h / 2, ZW + 0.2);
  else {
    const sw = XS + 0.2 - OPEN;
    for (const s of [-1, 1]) b.add(wallM, uvBox(sw, h, 0.4, u + (s > 0 ? 4 : 0), v), s * (OPEN + sw / 2), h / 2, ZW + 0.2);
    b.add(wallM, uvBox(2 * OPEN, FLOOR, 0.4, u + 1.7, v), 0, FLOOR / 2, ZW + 0.2);
    const top = h - FLOOR - DOOR_H;
    b.add(wallM, uvBox(2 * OPEN, top, 0.4, u + 1.7, v + FLOOR + DOOR_H), 0, FLOOR + DOOR_H + top / 2, ZW + 0.2);
  }
  for (const s of [-1, 1]) b.add(wallM, uvBox(0.2, h, 1.42, v, u), s * (XS + 0.1), h / 2, 2.31);
  // Stoß: Betonfuge (dunkler Strich) bzw. Steingesims – verdeckt zugleich die Kante zum Nachbarsegment
  if (st.courses) {
    const ledge = mat(st.ledge);
    b.box(ledge, 0, 0, ZW - 0.05, 2 * XC - 0.22, 0.18, 0.1);
    for (const s of [-1, 1]) b.box(ledge, s * (XS - 0.05), 0, 2.31, 0.1, 0.18, 1.42);
  } else {
    const dark = mat('rubber');
    b.box(dark, 0, 0, ZW - 0.003, 2 * XC - 0.22, 0.03, 0.006);
    for (const s of [-1, 1]) b.box(dark, s * (XS - 0.003), 0, 2.31, 0.006, 0.03, 1.42);
  }
}

// Durchlaufende Teile: identische Lage in allen Segmenten und Stilen, damit nichts abreißt.
function runners(b, st, h) {
  const iron = mat(st.iron), steel = mat('steel'), cable = mat(st.cable);
  for (const s of [-1, 1]) {
    const x = s * XC;
    // Stütze (I-Profil) …
    b.box(iron, x, h / 2, 2.49, 0.02, h, 0.22);
    b.box(iron, x, h / 2, 2.37, 0.2, h, 0.02);
    b.box(iron, x, h / 2, 2.61, 0.2, h, 0.02);
    // … mit Führungsschiene (T-Profil) davor
    b.box(steel, x, h / 2, 2.3375, 0.016, h, 0.045);
    b.box(steel, x, h / 2, 2.3075, 0.05, h, 0.015);
    // Schienenstoß: Laschen links/rechts am Steg, Kopfplatte der Stütze
    for (const d of [-1, 1]) b.box(steel, x + d * 0.018, 0, 2.3375, 0.02, 0.32, 0.035);
    b.box(iron, x, 0, 2.49, 0.22, 0.02, 0.24);
    // Schienenhalter
    for (const d of [-1, 1]) b.box(steel, x + d * 0.03, h * 0.5, 2.352, 0.04, 0.07, 0.016);
  }
  // Kabelpritsche links
  const t0 = -2.47, t1 = -2.81, tm = (t0 + t1) / 2;
  for (const x of [t0, t1]) {
    b.box(iron, x, h / 2, 2.56, 0.02, h, 0.06);
    for (const y of [0.75, 2.25]) if (y < h) b.box(iron, x, y, 2.605, 0.02, 0.05, 0.03);
  }
  for (let y = 0.25; y < h; y += 0.5) b.box(iron, tm, y, 2.58, 0.32, 0.025, 0.02);
  for (const [x, r] of [[-2.53, 0.018], [-2.585, 0.022], [-2.65, 0.014], [-2.71, 0.025], [-2.77, 0.016]]) b.cyl(cable, x, 0, 2.57 - r, r, r, h, 6);
  b.box(steel, tm, 0.02, 2.515, 0.34, 0.05, 0.008);
  // Rohre rechts (Flansch am Stoß, Schelle in der Mitte)
  const pipeM = mat(st.iron === 'rust' ? 'rust' : 'steel');
  for (const [x, r] of [[2.6, 0.045], [2.77, 0.03]]) {
    const z = ZW - 0.03 - r;
    b.cyl(pipeM, x, 0, z, r, r, h, 10);
    b.cyl(pipeM, x, -0.025, z, r + 0.016, r + 0.016, 0.05, 10);
  }
  b.box(iron, 2.685, h * 0.5, 2.494, 0.34, 0.04, 0.012);
  for (const x of [2.52, 2.85]) b.box(iron, x, h * 0.5, 2.557, 0.012, 0.04, 0.126);
}

// Querträger zwischen den Stützen (I-Profil, Steg parallel zur Wand)
function beam(b, st, y) {
  const m = mat(st.beamM);
  const L = 2 * XC - 0.02;
  b.box(m, 0, y + 0.11, 2.47, L, 0.02, 0.16);
  b.box(m, 0, y - 0.11, 2.47, L, 0.02, 0.16);
  b.box(m, 0, y, 2.47, L, 0.2, 0.012);
  for (const x of [-1.3, 0, 1.3]) b.box(m, x, y, 2.585, 0.1, 0.24, 0.07);
  if (st.beamM === 'rust') for (let x = -2.0; x <= 2.01; x += 0.25) b.cyl(m, x, y - 0.1, 2.40, 0.012, 0.012, 0.012, 6);
}

// Schiffsarmatur an der Wand (runder Sockel, Käfig, Birne als eigenes Mesh)
function bulkhead(b, st, x, y, lamps, opts = {}) {
  const iron = mat(st.iron);
  b.add(iron, cylGeometry(0.085, 0.085, 0.04, 12), x, y, ZW - 0.02, Math.PI / 2, 0, 0);
  b.add(iron, torusGeometry(0.066, 0.007, 4, 14), x, y, ZW - 0.07, 0, 0, 0);
  b.add(iron, torusGeometry(0.042, 0.006, 4, 12), x, y, ZW - 0.114, 0, 0, 0);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) b.box(iron, x + dx * 0.054, y + dy * 0.054, ZW - 0.092, 0.008, 0.008, 0.046);
  b.box(iron, x, y, ZW - 0.12, 0.09, 0.008, 0.008);
  b.box(iron, x, y, ZW - 0.12, 0.008, 0.09, 0.008);
  lamps.push({ x, y, z: ZW - 0.07, color: st.lamp, power: 1, ...opts });
}

// Käfiglampe, unter einem Querträger hängend
function hanging(b, st, x, yTop, lamps) {
  const iron = mat(st.iron), z = 2.47;
  b.box(iron, x, yTop - 0.05, z, 0.02, 0.1, 0.02);
  b.cyl(iron, x, yTop - 0.16, z, 0.05, 0.08, 0.06, 12);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    b.box(iron, x + Math.cos(a) * 0.066, yTop - 0.25, z + Math.sin(a) * 0.066, 0.006, 0.18, 0.006);
  }
  b.add(iron, torusGeometry(0.066, 0.005, 3, 12), x, yTop - 0.34, z, Math.PI / 2, 0, 0);
  lamps.push({ x, y: yTop - 0.245, z, color: st.lamp, power: 1 });
}

// Notleuchte: Gehäuse an der Wand, rotes Glas
function exitLamp(b, st, x, y, lamps) {
  b.box(mat(st.iron), x, y, ZW - 0.04, 0.16, 0.24, 0.08);
  lamps.push({ x, y, z: ZW - 0.086, color: 0xff2a18, power: 0.45, lens: true, emergency: true });
}

// Belegte Wandflächen merken, damit sich Kleinteile nicht überschneiden
function occupancy() {
  const list = [];
  return {
    free: (x, y, r) => list.every(o => Math.abs(o.x - x) > o.r + r || Math.abs(o.y - y) > o.r + r),
    add: (x, y, r) => list.push({ x, y, r }),
  };
}

// ---------------------------------------------------------------- Wandsegment
function buildWall(st, rng) {
  const b = new Builder();
  const h = SEG, lamps = [], decals = [];
  const occ = occupancy();
  shell(b, st, h, rng);
  runners(b, st, h);
  const iron = mat(st.iron);

  let beamY = null;
  if (rng.chance(st.beams)) { beamY = 0.35; beam(b, st, beamY); occ.add(0, beamY, 0.3); }
  occ.add(-2.2, 1.5, 0.1); occ.add(2.2, 1.5, 0.1);

  // Lampe: Fassung fast immer – ob sie brennt, entscheidet das Einsetzen in den Schacht
  if (rng.chance(0.7)) {
    const x = rng.pick([-1.15, -0.45, 0.55, 1.2]);
    if (beamY !== null && rng.chance(0.6)) { hanging(b, st, x, beamY - 0.12, lamps); occ.add(x, beamY - 0.3, 0.25); }
    else { const y = rng.float(1.6, 2.4); bulkhead(b, st, x, y, lamps); occ.add(x, y, 0.2); }
  }
  // Seitenfeld (neben den Stützen): Notleuchte, Verteilerkasten oder Schild
  for (const s of [-1, 1]) {
    const x = s * 1.88, y = rng.float(1.1, 2.3);
    const k = rng.next();
    if (k < 0.2) { exitLamp(b, st, x, y, lamps); occ.add(x, y, 0.16); }
    else if (k < 0.38) {
      // Verteilerkasten, Leerrohr an der Wand hoch zu einer Abzweigdose
      b.box(iron, x, y, ZW - 0.05, 0.28, 0.36, 0.1);
      b.box(mat('steel'), x, y + 0.2, ZW - 0.05, 0.3, 0.03, 0.11);
      b.cyl(iron, x + 0.08, y + 0.18, ZW - 0.016, 0.015, 0.015, h - y - 0.42, 6);
      b.box(iron, x + 0.08, h - 0.2, ZW - 0.03, 0.08, 0.08, 0.06);
      occ.add(x, y, 0.25); occ.add(x, h - 0.2, 0.1);
    } else if (k < 0.38 + st.signs) {
      b.box(mat('steel'), x, y, ZW - 0.006, 0.52, 0.34, 0.012);
      decals.push({ key: 'sign' + (s > 0 ? rng.int(0, 3) : rng.int(0, 1)), x, y, z: ZW - 0.0125, w: 0.5, h: 0.31 });
      occ.add(x, y, 0.25);
    }
  }
  // Schalungsanker im Beton
  if (st.ties) {
    const dark = mat('rubber'), tie = cylGeometry(0.022, 0.022, 0.012, 8);
    for (const y of [0.9, 2.3]) for (let x = -1.8; x <= 1.81; x += 0.9) if (occ.free(x, y, 0.05)) b.add(dark, tie, x, y, ZW - 0.004, Math.PI / 2, 0, 0);
  }
  // Salzkrusten und Salzzapfen
  if (st.crust) {
    const salt = mat('salt');
    const n = rng.int(3, 6);
    for (let i = 0; i < n; i++) {
      const x = rng.float(-1.7, 1.7), y = rng.float(0.8, h - 0.45), r = rng.float(0.12, 0.32);
      if (!occ.free(x, y, r)) continue;
      b.sphere(salt, x, y, ZW, r, 10, 8, rng.float(1, 1.6), rng.float(0.6, 1.1), 0.3);
      occ.add(x, y, r);
    }
    const yb = beamY !== null ? beamY - 0.12 : -0.09;
    const zb = beamY !== null ? 2.47 : ZW - 0.05;
    for (let i = 0; i < rng.int(2, 5); i++) {
      const len = rng.float(0.08, 0.2), x = rng.float(-1.9, 1.9);
      if (beamY !== null && lamps.some(l => Math.abs(l.x - x) < 0.25)) continue;
      b.add(salt, coneGeometry(rng.float(0.015, 0.035), len, 6), x, yb - len / 2, zb + rng.float(-0.03, 0.03), Math.PI, 0, 0);
    }
  }
  // Beinhaus: Brett mit Schädeln
  if (st.bones && rng.chance(0.55)) {
    const x = rng.pick([-1.0, 0.2, 1.0]), y = rng.float(1.2, 2.0);
    if (occ.free(x, y, 0.45)) {
      const stone = mat(st.ledge), bone = mat('bone'), dark = mat('rubber');
      b.box(stone, x, y, ZW - 0.12, 0.8, 0.06, 0.24);
      for (const d of [-0.3, 0.3]) b.box(stone, x + d, y - 0.12, ZW - 0.06, 0.06, 0.18, 0.12);
      for (let i = 0; i < 3; i++) {
        const r = rng.float(0.065, 0.08), sx = x - 0.25 + i * 0.25 + rng.float(-0.03, 0.03), sy = y + 0.03 + r * 0.9, sz = ZW - 0.13;
        b.sphere(bone, sx, sy, sz, r, 10, 8, 0.9, 0.9, 1.1);
        for (const e of [-1, 1]) b.sphere(dark, sx + e * r * 0.36, sy + r * 0.12, sz - r * 0.93, r * 0.24, 6, 5);
      }
      occ.add(x, y, 0.45);
    }
  }
  // Kreide an der Wand
  if (rng.chance(st.chalk)) {
    const x = rng.float(-1.2, 1.2), y = rng.float(1.1, 2.3);
    if (occ.free(x, y, 0.35)) decals.push({ key: 'chalk' + rng.int(0, CHALK.length - 1), x, y, z: ZW - 0.004, w: 1.1, h: 0.55, rot: rng.float(-0.06, 0.06) });
  }
  return finish({ kind: 'wall', h, lamps, decals }, b);
}

// ---------------------------------------------------------------- Absatz
// variant: steel | ajar | wood | grille | bricked | home (Heimat-Etage mit dem echten Etagentor)
function buildLanding(st, variant, rng) {
  const home = variant === 'home';
  const b = new Builder();
  const h = LAND, lamps = [], decals = [];
  shell(b, st, h, rng, true);
  runners(b, st, h);
  const iron = mat(st.iron), steel = mat('steel'), ledge = mat(st.ledge), wallM = mat(st.wall), dark = mat('rubber');
  const zf = home ? HOME_Z : ZIN, fd = 0.03;

  // Absatzkante: Beton-/Steinblock mit Stahlschürze und Trittblech
  b.box(ledge, 0, (0.05 + FLOOR) / 2, (ZIN + 0.012 + ZW) / 2, 2 * FRAME, FLOOR - 0.05, ZW - ZIN - 0.012);
  b.box(steel, 0, (0.05 + FLOOR) / 2, ZIN + 0.006, 2 * FRAME, FLOOR - 0.05, 0.012);
  b.box(mat('treadPlate'), 0, FLOOR + 0.004, ZIN + 0.05, 2 * OPEN, 0.008, 0.1);
  // Torrahmen: Pfosten, Sturz, Laibung bis zur Wand
  for (const s of [-1, 1]) {
    b.box(iron, s * (OPEN + FRAME) / 2, FLOOR + DOOR_H / 2, zf + fd / 2, FRAME - OPEN, DOOR_H, fd);
    b.box(iron, s * (FRAME - 0.01), FLOOR + (DOOR_H + 0.34) / 2, (zf + fd + ZW) / 2, 0.02, DOOR_H + 0.34, ZW - zf - fd);
    if (st.hazard) b.box(mat('hazard'), s * (OPEN + FRAME) / 2, FLOOR + 0.6, zf - 0.003, FRAME - OPEN - 0.04, 1.1, 0.006);
    if (home) b.box(iron, s * (OPEN + FRAME) / 2, FLOOR - 0.15, (zf + ZIN) / 2, FRAME - OPEN, 0.3, ZIN - zf);
  }
  b.box(iron, 0, FLOOR + DOOR_H + 0.17, zf + fd / 2, 2 * FRAME, 0.34, fd);
  b.box(iron, 0, FLOOR + DOOR_H + 0.33, (zf + fd + ZW) / 2, 2 * FRAME, 0.02, ZW - zf - fd);
  // Rufkasten am rechten Pfosten
  b.box(iron, (OPEN + FRAME) / 2, FLOOR + 1.45, zf - 0.006, 0.12, 0.2, 0.012);
  b.box(glowMat(0xff4020, 1.6, 'shaftCallGlow'), (OPEN + FRAME) / 2, FLOOR + 1.49, zf - 0.015, 0.03, 0.03, 0.006);
  // Lampe über dem Tor
  if (st.lampEvery < Infinity) bulkhead(b, st, rng.pick([-1.2, 1.2]), FLOOR + DOOR_H + 0.62, lamps, { power: 1.1, landing: true });

  // Gang hinter der Öffnung (nicht bei Vermauerung) – nie ins Leere schauen
  if (variant !== 'bricked') {
    const zb = ZW + 0.4, D = 2.8;
    b.box(ledge, 0, FLOOR - 0.1, zb + D / 2, 2 * OPEN, 0.2, D);
    for (const s of [-1, 1]) b.box(wallM, s * (OPEN + 0.1), FLOOR + DOOR_H / 2, zb + D / 2, 0.2, DOOR_H + 0.4, D);
    b.box(wallM, 0, FLOOR + DOOR_H + 0.1, zb + D / 2, 2 * OPEN, 0.2, D);
    b.box(wallM, 0, FLOOR + DOOR_H / 2, zb + D + 0.1, 2 * OPEN + 0.4, DOOR_H + 0.4, 0.2);
    if (variant === 'grille' || variant === 'ajar') {
      // eine Kiste, eine Glühbirne am Kabel ganz hinten (brennt manchmal noch)
      b.boxB(mat('wood'), rng.float(-0.9, 0.9), FLOOR, zb + rng.float(0.6, 1.6), 0.6, 0.5, 0.5, { ry: rng.float(-0.4, 0.4) });
      const bx = rng.float(-0.8, 0.8), bz = zb + D - 0.5;
      b.box(dark, bx, FLOOR + DOOR_H - 0.3, bz, 0.008, 0.6, 0.008);
      b.sphere(rng.chance(0.6) ? glowMat(0xffb070, 1.4, 'shaftAlcoveGlow') : dark, bx, FLOOR + DOOR_H - 0.64, bz, 0.04, 8, 6);
    }
  }

  // Tor
  const lb = new Builder();
  let leafM = null;
  if (variant === 'steel' || variant === 'ajar' || variant === 'wood') {
    const wood = variant === 'wood';
    leafM = mat(wood ? 'walnut' : (st.door === 'walnut' ? 'steelPanel' : st.door));
    const gap = variant === 'ajar' ? 0.16 : 0, LW = 1.72, zl = LEAF_Z;
    for (const s of [-1, 1]) {
      const cx = s * (LW / 2 + gap);
      lb.box(leafM, cx, FLOOR + 0.01 + (DOOR_H + 0.08) / 2, zl, LW, DOOR_H + 0.08, 0.04);
      if (wood) {
        for (const y of [0.85, 2.0]) lb.box(leafM, cx, FLOOR + y, zl - 0.03, LW - 0.4, y < 1 ? 1.0 : 1.0, 0.02);
        lb.box(mat('brassDark'), cx, FLOOR + 0.16, zl - 0.024, LW - 0.1, 0.25, 0.008);
        lb.box(mat('brassDark'), s * 0.12, FLOOR + 1.35, zl - 0.06, 0.03, 0.4, 0.02);
        for (const d of [-0.15, 0.15]) lb.box(mat('brassDark'), s * 0.12, FLOOR + 1.35 + d, zl - 0.035, 0.02, 0.02, 0.03);
      } else {
        for (const y of [0.95, 1.95]) lb.box(iron, cx, FLOOR + y, zl - 0.027, LW - 0.06, 0.06, 0.014);
        if (st.hazard) lb.box(mat('hazard'), cx, FLOOR + 0.22, zl - 0.023, LW - 0.04, 0.3, 0.006);
      }
    }
    if (!gap) lb.box(dark, 0, FLOOR + 1.4, zl - 0.026, 0.04, DOOR_H - 0.2, 0.012);
  } else if (variant === 'grille') {
    // Scherengitter wie an der Kabine, rostig
    const N = 13, left = -1.6, W = 3.2, sp = W / (N - 1), gh = DOOR_H - 0.018, K = 6, segH = gh / K;
    const y0 = FLOOR + 0.028;
    for (let i = 0; i < N; i++) lb.box(iron, left + i * sp, y0 + gh / 2, LEAF_Z, 0.022, gh, 0.022);
    const len = Math.hypot(sp, segH), ang = Math.atan2(segH, sp);
    for (let i = 0; i < N - 1; i++) for (let k = 0; k < K; k++) {
      for (const dir of [1, -1]) lb.box(iron, left + i * sp + sp / 2, y0 + k * segH + segH / 2, LEAF_Z + dir * 0.016, len, 0.014, 0.008, { rz: dir * ang });
    }
    lb.box(iron, 0, FLOOR + 0.018, LEAF_Z, W + 0.1, 0.02, 0.06);
    lb.box(iron, 0, FLOOR + DOOR_H + 0.03, LEAF_Z, W + 0.1, 0.04, 0.06);
  } else if (variant === 'bricked') {
    b.box(mat('brick'), 0, FLOOR + DOOR_H / 2, 2.52, 2 * OPEN + 0.2, DOOR_H, 0.2);
    const paint = mat('bone');
    for (const d of [-1, 1]) b.box(paint, 0, FLOOR + 1.4, 2.4175, 3.2, 0.07, 0.004, { rz: d * 0.68 });
  } else if (home) {
    // Laufschiene, an der das echte Etagentor der Kabine hängt
    b.box(iron, 0, FLOOR + 2.75, 2.16, 3.3, 0.02, 0.06);
  }

  const o = finish({ kind: home ? 'home' : 'landing', h, lamps, decals, variant, closed: variant === 'steel' || variant === 'wood' || home }, b, lb);
  o.leafMat = leafM;
  o.leafMeshes = leafM ? o.leafGroup.children.filter(m => m.material === leafM) : [];

  // Nummernschild am Sturz (Leinwand, wird beim Einsetzen beschriftet)
  o.plateKind = home ? 'enamel' : st.plate;
  o.plateTex = textTexture(256, 96, () => {});
  const pm = new THREE.MeshStandardMaterial({ map: o.plateTex, transparent: true, roughness: o.plateKind === 'brass' ? 0.45 : 0.7, metalness: o.plateKind === 'brass' ? 0.6 : 0.1 });
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), pm);
  plate.position.set(0, FLOOR + DOOR_H + 0.17, zf - 0.002);
  plate.rotation.y = Math.PI;
  o.group.add(plate);
  // Schablonen-Nummer quer über die Stahlflügel
  if (variant === 'steel' && st.stencil) {
    o.stencilTex = textTexture(512, 208, () => {});
    const sm = new THREE.MeshStandardMaterial({ map: o.stencilTex, transparent: true, depthWrite: false, roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -1 });
    const sten = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.61), sm);
    sten.position.set(0, FLOOR + 1.45, LEAF_Z - 0.021);
    sten.rotation.y = Math.PI;
    o.group.add(sten);
  }
  return o;
}

// Geometrie verschmelzen, Birnen und Aufkleber als eigene Meshes anhängen
function finish(o, b, lb = null) {
  o.group = b.build();
  if (lb) { o.leafGroup = lb.build(); o.group.add(o.leafGroup); }
  for (const L of o.lamps) {
    L.mat = new THREE.MeshStandardMaterial({ color: 0x060504, emissive: new THREE.Color(L.color), emissiveIntensity: 0, roughness: 0.6 });
    L.base = L.lens ? 2.4 : 4.5;
    L.phase = Math.random() * 100;
    const m = new THREE.Mesh(L.lens ? lensGeo() : bulbGeo(), L.mat);
    m.position.set(L.x, L.y, L.z);
    if (L.lens) m.rotation.y = Math.PI;
    o.group.add(m);
  }
  for (const d of o.decals) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(d.w, d.h), decalMat(d.key, () => d.key.startsWith('sign')
      ? signTexture(SIGNS[+d.key.slice(4)])
      : chalkTexture(CHALK[+d.key.slice(5)], { size: 50 })));
    m.position.set(d.x, d.y, d.z);
    m.rotation.set(0, Math.PI, d.rot || 0);
    o.group.add(m);
  }
  o.group.visible = false;
  return o;
}

function drawPlate(tex, kind, text) {
  const c = tex.canvas, g = c.getContext('2d'), w = c.width, h = c.height;
  g.clearRect(0, 0, w, h);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  if (kind === 'enamel') {
    g.fillStyle = '#e4dcc4'; g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, 12); g.fill();
    g.fillStyle = '#1b2636'; g.beginPath(); g.roundRect(9, 9, w - 18, h - 18, 8); g.fill();
    g.fillStyle = '#efe6cc'; g.font = 'bold 62px Arial, sans-serif'; g.fillText(text, w / 2, h / 2 + 3);
    for (let i = 0; i < 9; i++) { g.fillStyle = 'rgba(16,12,9,0.9)'; g.beginPath(); g.arc(Math.random() * w, Math.random() < 0.5 ? 6 + Math.random() * 10 : h - 6 - Math.random() * 10, 2 + Math.random() * 7, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#8a8680'; for (const x of [18, w - 18]) { g.beginPath(); g.arc(x, h / 2, 5, 0, Math.PI * 2); g.fill(); }
  } else if (kind === 'brass') {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#b89050'); gr.addColorStop(1, '#6a5028');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3a2810'; g.lineWidth = 4; g.strokeRect(9, 9, w - 18, h - 18);
    g.fillStyle = '#261806'; g.font = '700 60px "Cormorant Garamond", serif'; g.fillText(text, w / 2, h / 2 + 4);
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(70,${110 + Math.random() * 40},90,${0.2 + Math.random() * 0.3})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 3 + Math.random() * 10, 0, Math.PI * 2); g.fill(); }
  } else {
    g.font = '66px "Caveat", cursive'; g.fillStyle = 'rgba(232,230,220,0.85)';
    g.save(); g.translate(w / 2, h / 2); g.rotate((Math.random() - 0.5) * 0.12); g.fillText(text, 0, 0); g.restore();
  }
  tex.needsUpdate = true;
}

function drawStencil(tex, text) {
  const c = tex.canvas, g = c.getContext('2d'), w = c.width, h = c.height;
  g.clearRect(0, 0, w, h);
  g.font = 'bold 170px Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = 'rgba(226,218,196,0.82)';
  g.fillText(text, w / 2, h / 2 + 8);
  // Schablonenstege und abgeblätterte Farbe
  g.globalCompositeOperation = 'destination-out';
  for (let x = 40; x < w; x += 58) g.fillRect(x, 0, 5, h);
  for (let i = 0; i < 90; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, 2 + Math.random() * 9, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  tex.needsUpdate = true;
}

// ---------------------------------------------------------------- Schachtfahrt

export class ShaftRide {
  constructor(parent, light) {
    this.group = new THREE.Group();
    this.group.name = 'Schacht';
    this.group.visible = false;
    parent.add(this.group);
    this.light = light;
    this.pools = {};          // Stil → { wall: [], landing: [] }
    this.homeObj = null;
    this.segs = [];           // aktive Segmente, von unten nach oben
    this.rng = new RNG((Date.now() ^ 0x9e3779b9) >>> 0);
    this.mode = 'idle';
    this.pos = 0; this.v = 0; this.vTarget = 0; this.acc = 0; this.accS = 0;
    this.time = 0;
    this.style = 'concrete';
    this.depthNow = 0;
    this.onEvent = null;      // (art, stärke) – 'joint' | 'landing' | 'stop'
    this.out = { v: 0, stopped: false, shake: 0, camY: 0, roll: 0 };
  }

  // ------------------------------------------------ Pools

  _ensure(style) {
    if (this.pools[style]) return;
    const st = STYLES[style];
    const rng = new RNG(hashStr('schacht:' + style));
    const pool = { wall: [], landing: [] };
    for (let i = 0; i < 10; i++) pool.wall.push(this._adopt(buildWall(st, rng), style));
    for (const v of st.landings) pool.landing.push(this._adopt(buildLanding(st, v, rng), style));
    this.pools[style] = pool;
  }

  _ensureHome() {
    if (!this.homeObj) this.homeObj = this._adopt(buildLanding(STYLES.concrete, 'home', new RNG(909)), 'concrete');
  }

  _adopt(o, style) {
    o.style = style;
    o.busy = false;
    this.group.add(o.group);
    return o;
  }

  _take(style, kind = 'wall', filter = null) {
    if (kind === 'home') return this.homeObj;
    this._ensure(style);
    const pool = this.pools[style][kind];
    let c = pool.filter(o => !o.busy && (!filter || filter(o)));
    if (!c.length) {
      // Notfall (sollte nicht vorkommen): noch eines bauen
      const st = STYLES[style];
      const o = kind === 'wall' ? buildWall(st, this.rng) : buildLanding(st, filter ? 'steel' : this.rng.pick(st.landings), this.rng);
      pool.push(this._adopt(o, style));
      c = [o];
    }
    return this.rng.pick(c);
  }

  _release(o) {
    o.busy = false;
    o.group.visible = false;
    o.prevFy = undefined;
    if (o.leafOverride) { for (const m of o.leafMeshes) m.material = o.leafMat; o.leafOverride = false; }
    for (const L of o.lamps) { L.lit = false; L.mat.emissiveIntensity = 0; }
  }

  _releaseAll() {
    for (const o of this.segs) this._release(o);
    this.segs.length = 0;
  }

  // Segment einsetzen: side 'lo' = unten anhängen, 'hi' = oben
  _place(o, S, side, { label = null, leaf = null } = {}) {
    o.S = S;
    o.busy = true;
    o.group.visible = true;
    o.group.position.y = S - this.pos;
    if (side === 'lo') this.segs.unshift(o); else this.segs.push(o);
    const st = STYLES[o.style];
    const sd = this.sides[side];
    // Lampen: Mindestabstand (sonst springt das eine Schachtlicht), tiefer mehr Dunkel
    const spacing = st.lampEvery * (1 + this.dark);
    for (const L of o.lamps) {
      const Sy = S + L.y;
      const far = sd.lampS === null || Math.abs(Sy - sd.lampS) >= spacing;
      const chance = L.emergency ? 0.8 : (L.landing ? 0.85 : st.lampChance) * (1 - this.dark * 0.6);
      L.lit = far && st.lampEvery < Infinity && this.rng.next() < chance;
      if (L.lit) sd.lampS = Sy;
      L.mode = L.emergency ? 'pulse' : (this.rng.next() < 0.1 + this.dark * 0.45 ? 'dying' : 'steady');
      L.mat.emissiveIntensity = L.lit ? L.base : 0;
    }
    if (o.kind !== 'wall') {
      const text = label ?? '—';
      drawPlate(o.plateTex, o.plateKind, text);
      if (o.stencilTex) drawStencil(o.stencilTex, text === '—' ? '' : text);
      if (leaf && o.leafMeshes.length && hasMat(leaf)) { const m = mat(leaf); for (const lm of o.leafMeshes) lm.material = m; o.leafOverride = true; }
    }
    return o;
  }

  // nächstes Segment an einer Seite anhängen
  _spawn(side) {
    const sd = this.sides[side];
    let o;
    if (sd.since >= sd.gap) { o = this._take(this.style, 'landing'); sd.since = 0; sd.gap = this.rng.int(2, 4); }
    else { o = this._take(this.style, 'wall'); sd.since++; }
    const S = side === 'lo' ? this.segs[0].S - o.h : this._top();
    return this._place(o, S, side, { label: o.kind === 'wall' ? null : this._label(side) });
  }

  _top() { const t = this.segs[this.segs.length - 1]; return t.S + t.h; }

  // Nummer eines vorbeiziehenden Absatzes – passend zur Anzeige, streng fortlaufend
  _label(side) {
    const d = this.depthNow;
    if (this.dir < 0 && side === 'lo') {
      const n = Math.max(this.lastNum + 1, Math.round(d) + 1);
      this.lastNum = n;
      return n >= this.depthTarget ? '—' : '−' + n;
    }
    if (this.dir > 0 && side === 'hi') {
      const n = Math.min(this.lastNum - 1, Math.round(d) - 1);
      this.lastNum = n;
      return n < 1 ? '—' : '−' + n;
    }
    return '—';
  }

  _recalcLampS() {
    for (const side of ['lo', 'hi']) {
      let best = null;
      for (const o of this.segs) for (const L of o.lamps) {
        if (!L.lit) continue;
        const Sy = o.S + L.y;
        if (best === null || (side === 'lo' ? Sy < best : Sy > best)) best = Sy;
      }
      this.sides[side].lampS = best;
    }
  }

  // ------------------------------------------------ Steuerung

  // speed < 0 abwärts. style = Stil am Ziel, from = Stil zu Beginn (wechselt per setStyle).
  start({ speed = -4, style = 'concrete', from = null, stage = 1, depth = 0, fromDepth = 0, fromLabel = null, toLabel = null, home = false, homeArrival = false, startLeaf = null } = {}) {
    style = STYLES[style] ? style : 'concrete';
    from = STYLES[from] ? from : style;
    this._ensure(from);
    this._ensure(style);
    if (home || homeArrival) this._ensureHome();
    this._releaseAll();
    this.style = from;
    this.target = style;
    this.dir = Math.sign(speed) || -1;
    this.vTarget = speed;
    this.v = 0; this.acc = 0; this.accS = 0;
    this.pos = 0; this.time = 0;
    this.mode = 'run';
    this.stopS = null;
    this.toLabel = toLabel;
    this.homeArrival = homeArrival;
    this.depthTarget = depth;
    this.depthNow = fromDepth;
    this.lastNum = Math.round(fromDepth);
    this.dark = clamp((stage - 1) * 0.12, 0, 0.6);
    this.lastJoint = 0;
    this.sides = { lo: { since: 0, gap: this.rng.int(2, 3), lampS: null }, hi: { since: 0, gap: this.rng.int(2, 3), lampS: null } };
    // Startabsatz: Boden bündig mit der Kabine
    const first = home ? this._take(from, 'home') : this._take(from, 'landing', o => o.closed);
    this._place(first, -FLOOR, 'hi', { label: home ? 'IX' : fromLabel, leaf: startLeaf });
    this.sides.lo.lampS = this.sides.hi.lampS;
    this._fill();
    this.light.distance = 9;
    this.light.decay = 1.5;
    this.light.intensity = 0;
    this.group.visible = true;
  }

  setStyle(name) {
    if (!STYLES[name]) return;
    this._ensure(name);
    this.style = name;
  }

  setSpeed(v) { this.vTarget = v; }

  // Bremsen: den nächsten erreichbaren Absatz so legen, dass die Kabine bündig davor hält
  brake() {
    if (this.mode !== 'run') return;
    const segs = this.segs;
    const vAbs = Math.max(Math.abs(this.v), Math.abs(this.vTarget) * 0.5);
    const dB = (vAbs * vAbs) / (2 * A_BRAKE) + vAbs * 0.3 + R_LEV;
    const arrival = this.homeArrival ? this._take(this.style, 'home') : this._take(this.style, 'landing', o => o.closed);
    if (this.dir < 0) {
      while (segs.length > 1 && segs[0].S + segs[0].h - this.pos < GUARD_LO) this._release(segs.shift());
      this._recalcLampS();
      let n = 0;
      while (this.pos - (segs[0].S - n * SEG - arrival.h + FLOOR) < dB) n++;
      for (let i = 0; i < n; i++) this._place(this._take(this.style, 'wall'), segs[0].S - SEG, 'lo');
      this._place(arrival, segs[0].S - arrival.h, 'lo', { label: this.homeArrival ? 'IX' : this.toLabel });
      this.sides.lo.since = 0;
    } else {
      while (segs.length > 1 && segs[segs.length - 1].S - this.pos > GUARD_HI) this._release(segs.pop());
      this._recalcLampS();
      let n = 0;
      while ((this._top() + n * SEG + FLOOR) - this.pos < dB) n++;
      for (let i = 0; i < n; i++) this._place(this._take(this.style, 'wall'), this._top(), 'hi');
      this._place(arrival, this._top(), 'hi', { label: this.homeArrival ? 'IX' : this.toLabel });
      this.sides.hi.since = 0;
    }
    this.stopS = arrival.S + FLOOR;
    this.mode = 'brake';
  }

  stop() {
    this._releaseAll();
    this.mode = 'idle';
    this.v = 0;
    this.group.visible = false;
    this.light.intensity = 0;
  }

  // Bodenhöhe der Heimat-Etage relativ zur Kabine (null = nicht im Schacht)
  homeY() {
    const h = this.homeObj;
    return h && h.busy ? h.S + FLOOR - this.pos : null;
  }

  // ------------------------------------------------ Takt

  _fill() {
    const segs = this.segs;
    while (segs.length && segs[0].S + segs[0].h - this.pos < Y_MIN - 1) this._release(segs.shift());
    while (segs.length && segs[segs.length - 1].S - this.pos > Y_MAX + 1) this._release(segs.pop());
    while (segs[0].S - this.pos > Y_MIN) this._spawn('lo');
    while (this._top() - this.pos < Y_MAX) this._spawn('hi');
  }

  _flick(L) {
    const p = L.phase + this.time;
    switch (L.mode) {
      case 'dying': {
        const n = Math.sin(p * 3.1) + Math.sin(p * 7.7) * 0.6 + Math.sin(p * 17.3) * 0.4;
        if (n > 1.1) return Math.random() < 0.6 ? 0.05 : 1;
        return n > 0.6 ? 0.55 : 1;
      }
      case 'pulse': return 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(p * 3.4));
      default: return 0.95 + Math.sin(p * 47) * 0.03 + Math.sin(p * 5.3) * 0.02;
    }
  }

  update(dt) {
    const out = this.out;
    out.stopped = this.mode === 'stopped';
    if (this.mode === 'idle' || !this.segs.length) { out.v = 0; out.shake = 0; out.camY = 0; out.roll = 0; return out; }
    this.time += dt;
    const vPrev = this.v;

    // Bewegung
    if (this.mode === 'run') {
      const want = clamp((this.vTarget - this.v) * 2.0, -A_RUN, A_RUN);
      this.acc = damp(this.acc, want, 3.5, dt);
      this.v += this.acc * dt;
      this.pos += this.v * dt;
    } else if (this.mode === 'brake') {
      const r = Math.max(0, (this.stopS - this.pos) * this.dir);
      let vDes = Math.sqrt(2 * A_BRAKE * Math.max(0, r - R_LEV)) + V_LEV * Math.min(1, r / R_LEV);
      vDes = Math.min(vDes, Math.max(Math.abs(this.vTarget), 0.5));
      let a = Math.abs(this.v);
      a = a < vDes ? Math.min(vDes, a + A_RUN * dt) : Math.max(vDes, damp(a, vDes, 9, dt));
      a = Math.min(a, vDes + 0.2);
      let step = a * dt;
      if (step >= r || r < 0.002) {
        step = r; a = 0;
        this.mode = 'stopped';
        out.stopped = true;
        this.onEvent?.('stop', Math.min(1, Math.abs(this.v) / 1.5));
      }
      this.pos += this.dir * step;
      this.v = this.dir * a;
    } else this.v = 0;

    // Ringpuffer
    for (const o of this.segs) o.group.position.y = o.S - this.pos;
    this._fill();

    const k = Math.min(1, Math.abs(this.v) / 4);
    const t = this.time;

    // Körpergefühl: beim Anfahren abwärts hebt es kurz, beim Bremsen sackt man ein
    const aNow = dt > 0 ? (this.v - vPrev) / dt : 0;
    this.accS = damp(this.accS, aNow, 6, dt);
    out.camY = clamp(-this.accS * 0.011, -0.03, 0.03);
    // Pendeln in den Führungen (Schacht wandert leicht seitlich), minimales Rollen der Kamera
    const sx = (Math.sin(t * 1.3) * 0.6 + Math.sin(t * 2.9 + 1.1) * 0.3 + Math.sin(t * 6.1 + 0.4) * 0.1) * 0.012 * k;
    const sz = (Math.sin(t * 1.7 + 2.0) * 0.7 + Math.sin(t * 3.7) * 0.3) * 0.004 * k;
    this.group.position.set(sx, 0, sz);
    out.roll = (Math.sin(t * 1.1 + 0.5) * 0.7 + Math.sin(t * 2.3) * 0.3) * 0.0022 * k;
    // Grundzittern + Stöße an den Schienenstößen
    out.shake = Math.abs(this.v) * 0.012;
    const j = Math.floor(this.pos / RAIL);
    if (j !== this.lastJoint) {
      this.lastJoint = j;
      if (k > 0.1) { out.shake = Math.max(out.shake, 0.14 + 0.22 * k); this.onEvent?.('joint', k); }
    }
    // Absatz zieht am Gitter vorbei
    for (const o of this.segs) {
      if (o.kind === 'wall') continue;
      const fy = o.S + FLOOR - this.pos;
      if (o.prevFy !== undefined && (o.prevFy - 1.0) * (fy - 1.0) < 0 && k > 0.2) this.onEvent?.('landing', k);
      o.prevFy = fy;
    }

    // Lampen: Flackern aller Birnen, die nächste zur Augenhöhe bekommt das Schachtlicht
    let best = null, bw = 0, by = 0, bf = 1;
    for (const o of this.segs) for (const L of o.lamps) {
      if (!L.lit) continue;
      const f = this._flick(L);
      L.mat.emissiveIntensity = L.base * f;
      const y = o.S - this.pos + L.y;
      const w = (1 - smoothstep(2.6, 4.8, Math.abs(y - EYE))) * L.power;
      if (w > bw) { bw = w; best = L; by = y; bf = f; }
    }
    if (best) {
      this.light.position.set(best.x + sx, by, best.z - 0.08 + sz);
      this.light.color.setHex(best.color);
      this.light.intensity = LIGHT_I * bw * bf;
    } else this.light.intensity = 0;

    out.v = this.v;
    return out;
  }
}
