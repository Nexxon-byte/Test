// Requisiten-Bibliothek. Jede Funktion baut in einen Builder (verschmolzene Geometrie)
// und gibt optional Zusatzinfos zurück (Lichtpunkte, Ankerpunkte).
// Konvention: (b, x, z, ry, rng, opt) – x/z = Bodenmitte, ry = Drehung um Y.

import * as THREE from 'three';
import { mat, glowMat } from '../gfx/materials.js';
import { boxGeometry, cylGeometry, sphereGeometry, coneGeometry } from '../gfx/geo.js';

const cos = Math.cos, sin = Math.sin;
// lokaler Versatz (lx, lz) gedreht um ry
function off(x, z, ry, lx, lz) { return [x + lx * cos(ry) + lz * sin(ry), z - lx * sin(ry) + lz * cos(ry)]; }

// Quader relativ zur Requisite
function part(b, m, x, z, ry, lx, ly, lz, sx, sy, sz, opt = {}) {
  const [px, pz] = off(x, z, ry, lx, lz);
  b.box(typeof m === 'string' ? mat(m) : m, px, ly, pz, sx, sy, sz, { ry: ry + (opt.ry || 0), rx: opt.rx || 0, rz: opt.rz || 0, collide: !!opt.collide });
}
function cylPart(b, m, x, z, ry, lx, ly, lz, rt, rb, h, seg = 10, opt = {}) {
  const [px, pz] = off(x, z, ry, lx, lz);
  b.cyl(typeof m === 'string' ? mat(m) : m, px, ly, pz, rt, rb, h, seg, { rx: opt.rx || 0, rz: opt.rz || 0, ry: ry + (opt.ry || 0), collide: !!opt.collide });
}

export const P = {
  // ---------------------------------------------------------------- Architektur
  pillarSquare(b, x, z, ry, rng, { h = 3.4, w = 0.6, m = 'concrete', num = null } = {}) {
    b.box(mat(m), x, h / 2, z, w, h, w, { collide: true });
    b.box(mat(m), x, 0.1, z, w + 0.12, 0.2, w + 0.12);
    b.box(mat(m), x, h - 0.12, z, w + 0.14, 0.24, w + 0.14);
    return { num };
  },

  pillarRound(b, x, z, ry, rng, { h = 5, r = 0.35, m = 'stoneDark', cap = 'stone' } = {}) {
    b.cyl(mat(m), x, 0, z, r, r * 1.08, h, 14, { collide: true });
    b.box(mat(cap), x, 0.15, z, r * 2.6, 0.3, r * 2.6);
    b.box(mat(cap), x, h - 0.2, z, r * 2.8, 0.4, r * 2.8);
    b.cyl(mat(cap), x, h - 0.55, z, r * 1.25, r, 0.35, 14);
  },

  // ---------------------------------------------------------------- Ladebucht
  crate(b, x, z, ry, rng, { s = null } = {}) {
    const size = s ?? rng.float(0.6, 1.1);
    b.box(mat('woodPlanks'), x, size / 2, z, size, size, size, { ry, collide: true });
    part(b, 'wood', x, z, ry, 0, size / 2, size / 2 + 0.01, size * 0.95, 0.08, 0.02, { rz: 0.78 });
    if (rng.chance(0.4)) b.box(mat('woodPlanks'), x + rng.float(-0.1, 0.1), size + size * 0.35, z, size * 0.7, size * 0.7, size * 0.7, { ry: ry + rng.float(-0.4, 0.4), collide: true });
  },

  barrel(b, x, z, ry, rng) {
    b.cyl(mat(rng.chance(0.5) ? 'rust' : 'steel'), x, 0, z, 0.3, 0.3, 0.9, 12, { collide: true });
    b.cyl(mat('rust'), x, 0.15, z, 0.31, 0.31, 0.05, 12);
    b.cyl(mat('rust'), x, 0.7, z, 0.31, 0.31, 0.05, 12);
  },

  container(b, x, z, ry, rng, { l = 5, stacked = false } = {}) {
    const m = rng.pick(['rust', 'steel', 'rust']);
    b.box(mat(m), x, 1.3, z, l, 2.6, 2.4, { ry, collide: true });
    for (let i = -l / 2 + 0.3; i < l / 2; i += 0.35) part(b, 'rust', x, z, ry, i, 1.3, 1.21, 0.08, 2.5, 0.04);
    part(b, 'steel', x, z, ry, l / 2 + 0.01, 1.3, 0, 0.03, 2.5, 2.3);
    if (stacked) b.box(mat(rng.pick(['rust', 'steel'])), x + rng.float(-0.3, 0.3), 3.9, z, l, 2.6, 2.4, { ry: ry + rng.float(-0.05, 0.05), collide: true });
  },

  pallet(b, x, z, ry, rng) {
    b.box(mat('woodPlanks'), x, 0.07, z, 1.2, 0.14, 1.0, { ry, collide: false });
    if (rng.chance(0.7)) b.box(mat('fabric'), x, 0.5, z, 1.1, 0.72, 0.9, { ry, collide: true });
  },

  truck(b, x, z, ry, rng) {
    // Elektro-Lastwagen der Kirche (kastig, Kassettenfuturismus)
    part(b, 'steel', x, z, ry, 0, 1.2, -0.6, 2.1, 1.9, 3.4, { collide: true });
    part(b, 'rust', x, z, ry, 0, 0.95, 2.0, 2.0, 1.4, 1.6, { collide: true });
    part(b, glowMat(0x10181c, 0.2, 'truckGlass'), x, z, ry, 0, 1.45, 2.81, 1.7, 0.6, 0.04);
    for (const [wx, wz] of [[-1.05, -1.6], [1.05, -1.6], [-1.05, 2.0], [1.05, 2.0]]) cylPart(b, 'rubber', x, z, ry, wx, 0.42, wz, 0.42, 0.42, 0.28, 12, { rz: Math.PI / 2 });
    part(b, 'steel', x, z, ry, 0, 0.4, 2.85, 1.9, 0.3, 0.1);
    return { lights: [off(x, z, ry, -0.7, 2.86), off(x, z, ry, 0.7, 2.86)] };
  },

  drone(b, x, z, ry, rng) {
    // Lastdrohne im Dock (liegt still)
    const y = rng.chance(0.5) ? 0.45 : 1.7;
    b.box(mat('steel'), x, y, z, 1.1, 0.35, 1.1, { ry, collide: y < 1 });
    for (const [a, c] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const [px, pz] = off(x, z, ry, a * 0.75, c * 0.75);
      b.cyl(mat('rust'), px, y + 0.1, pz, 0.36, 0.36, 0.04, 12);
      b.box(mat('steel'), (x + px) / 2, y + 0.1, (z + pz) / 2, 0.1, 0.06, 0.9, { ry: ry + Math.atan2(a, c) });
    }
    if (y > 1) b.box(mat('steel'), x, y / 2, z, 0.12, y, 0.12, { collide: true });
  },

  // ---------------------------------------------------------------- Skriptorium
  shelf(b, x, z, ry, rng, { l = 2.3, h = 3.0, d = 0.55 } = {}) {
    b.box(mat('shelf'), x, h / 2, z, l, h, d, { ry, collide: true });
    part(b, 'wood', x, z, ry, -l / 2, h / 2, 0, 0.06, h + 0.05, d + 0.04);
    part(b, 'wood', x, z, ry, l / 2, h / 2, 0, 0.06, h + 0.05, d + 0.04);
    part(b, 'wood', x, z, ry, 0, h + 0.02, 0, l + 0.08, 0.05, d + 0.06);
  },

  serverRack(b, x, z, ry, rng, { h = 2.3 } = {}) {
    b.box(mat('server'), x, h / 2, z, 0.8, h, 0.9, { ry, collide: true });
    part(b, 'steel', x, z, ry, 0, h + 0.02, 0, 0.84, 0.04, 0.94);
    // Kerzen auf dem Server – Frömmigkeit trifft Technik
    const c = [];
    if (rng.chance(0.5)) c.push({ pos: off(x, z, ry, rng.float(-0.25, 0.25), 0), y: h + 0.04 });
    return { candles: c };
  },

  desk(b, x, z, ry, rng, { crt = true, chair = true } = {}) {
    part(b, 'wood', x, z, ry, 0, 0.76, 0, 1.4, 0.06, 0.7, { collide: true });
    for (const [a, c] of [[-0.64, -0.3], [0.64, -0.3], [-0.64, 0.3], [0.64, 0.3]]) part(b, 'wood', x, z, ry, a, 0.37, c, 0.06, 0.74, 0.06);
    part(b, 'wood', x, z, ry, 0.45, 0.55, 0, 0.45, 0.4, 0.62);
    const extras = {};
    if (crt) {
      part(b, 'steel', x, z, ry, -0.25, 1.0, -0.12, 0.42, 0.38, 0.38);
      extras.screen = { pos: off(x, z, ry, -0.25, 0.075), y: 1.0, ry };
    }
    if (chair) P.chair(b, ...off(x, z, ry, 0, 0.65), ry + Math.PI + rng.float(-0.4, 0.4), rng);
    if (rng.chance(0.6)) for (let i = 0; i < rng.int(1, 4); i++) part(b, 'paper', x, z, ry, rng.float(-0.4, 0.5), 0.795, rng.float(-0.2, 0.2), 0.21, 0.005, 0.29, { ry: rng.float(-0.5, 0.5) });
    extras.top = { pos: off(x, z, ry, 0.35, -0.1), y: 0.8 };
    return extras;
  },

  chair(b, x, z, ry, rng, { m = 'wood' } = {}) {
    part(b, m, x, z, ry, 0, 0.45, 0, 0.45, 0.05, 0.45, { collide: false });
    for (const [a, c] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) part(b, m, x, z, ry, a, 0.22, c, 0.04, 0.45, 0.04);
    part(b, m, x, z, ry, 0, 0.8, -0.21, 0.45, 0.65, 0.04);
    b.collider(x - 0.25, z - 0.25, x + 0.25, z + 0.25, 0, 0.9);
  },

  cylinderCart(b, x, z, ry, rng) {
    part(b, 'steel', x, z, ry, 0, 0.8, 0, 1.0, 0.04, 0.6, { collide: true });
    part(b, 'steel', x, z, ry, 0, 0.4, 0, 1.0, 0.04, 0.6);
    for (let i = 0; i < 6; i++) cylPart(b, 'brassDark', x, z, ry, -0.4 + i * 0.16, 0.82, rng.float(-0.15, 0.15), 0.06, 0.06, 0.28, 8, { rx: Math.PI / 2 });
    for (const a of [-0.45, 0.45]) for (const c of [-0.25, 0.25]) cylPart(b, 'rubber', x, z, ry, a, 0.06, c, 0.06, 0.06, 0.04, 8, { rz: Math.PI / 2 });
  },

  // ---------------------------------------------------------------- Saal der Vierzig
  banquetTable(b, x, z, ry, rng, { l = 6 } = {}) {
    part(b, 'fabricWhite', x, z, ry, 0, 0.76, 0, 1.3, 0.04, l, { collide: true });
    part(b, 'fabricWhite', x, z, ry, 0.66, 0.5, 0, 0.02, 0.5, l);
    part(b, 'fabricWhite', x, z, ry, -0.66, 0.5, 0, 0.02, 0.5, l);
    const seats = [];
    for (let i = -l / 2 + 0.6; i < l / 2 - 0.3; i += 1.0) {
      for (const s of [-1, 1]) {
        P.chair(b, ...off(x, z, ry, s * 0.95, i), ry + (s > 0 ? -Math.PI / 2 : Math.PI / 2), rng, { m: 'wood' });
        seats.push({ pos: off(x, z, ry, s * 0.95, i), ry: ry + (s > 0 ? Math.PI / 2 : -Math.PI / 2) });
        // Gedeck
        cylPart(b, 'bone', x, z, ry, s * 0.4, 0.785, i, 0.13, 0.13, 0.015, 12);
        cylPart(b, glowMat(0x8a7a60, 0.05, 'glassDim'), x, z, ry, s * 0.4 - s * 0.2, 0.78, i + 0.2, 0.03, 0.02, 0.16, 8);
      }
    }
    const candles = [];
    for (let i = -l / 2 + 1.2; i < l / 2; i += 2.4) {
      cylPart(b, 'gold', x, z, ry, 0, 0.78, i, 0.06, 0.1, 0.04, 8);
      cylPart(b, 'gold', x, z, ry, 0, 0.8, i, 0.02, 0.02, 0.35, 6);
      for (const a of [-0.18, 0, 0.18]) {
        part(b, 'gold', x, z, ry, a * 0.5, 1.12, i, Math.abs(a) + 0.04, 0.02, 0.02);
        cylPart(b, 'bone', x, z, ry, a, 1.13, i, 0.018, 0.018, 0.14, 6);
        candles.push({ pos: off(x, z, ry, a, i), y: 1.29 });
      }
    }
    return { seats, candles };
  },

  stage(b, x, z, ry, rng, { w = 7, d = 3.5 } = {}) {
    part(b, 'woodPlanks', x, z, ry, 0, 0.35, 0, w, 0.7, d, { collide: true });
    part(b, 'fabricRed', x, z, ry, 0, 2.6, -d / 2, w, 3.8, 0.1);
    for (const s of [-1, 1]) part(b, 'fabricRed', x, z, ry, s * (w / 2 - 0.5), 2.6, -d / 2 + 0.4, 1.0, 3.8, 0.15);
    // Instrumente (Kontrabass, Notenständer)
    part(b, 'wood', x, z, ry, -1.5, 1.6, 0, 0.5, 1.3, 0.25, { rz: 0.1 });
    for (let i = 0; i < 4; i++) part(b, 'steel', x, z, ry, -2 + i * 1.3, 1.2, 0.6, 0.03, 1.0, 0.03);
    return {};
  },

  // ---------------------------------------------------------------- Kirche & Beinhaus
  candleStand(b, x, z, ry, rng, { n = 7, h = 1.0 } = {}) {
    part(b, 'brassDark', x, z, ry, 0, h / 2, 0, 0.9, h, 0.4, { collide: true });
    part(b, 'brass', x, z, ry, 0, h + 0.03, 0, 1.0, 0.06, 0.5);
    const candles = [];
    for (let i = 0; i < n; i++) {
      const lx = -0.4 + (i / (n - 1)) * 0.8, lz = rng.float(-0.12, 0.12);
      const ch = rng.float(0.06, 0.2);
      cylPart(b, 'bone', x, z, ry, lx, h + 0.06, lz, 0.02, 0.022, ch, 6);
      if (rng.chance(0.8)) candles.push({ pos: off(x, z, ry, lx, lz), y: h + 0.06 + ch + 0.03 });
    }
    return { candles };
  },

  pew(b, x, z, ry, rng, { l = 3.2, m = 'walnut' } = {}) {
    part(b, m, x, z, ry, 0, 0.45, 0, l, 0.06, 0.45, { collide: true });
    part(b, m, x, z, ry, 0, 0.8, -0.24, l, 0.7, 0.05);
    for (const s of [-1, 1]) part(b, m, x, z, ry, s * l / 2, 0.5, 0, 0.06, 1.0, 0.55);
    part(b, m, x, z, ry, 0, 0.22, 0.12, l, 0.05, 0.12);
  },

  statue(b, x, z, ry, rng, { h = 3.2, m = 'stone', dial = true } = {}) {
    // Verhüllte Gestalt (der Erbauer) mit Zifferblatt-Stab
    b.box(mat('stoneDark'), x, 0.3, z, 1.2, 0.6, 1.2, { collide: true });
    const sy = 0.6;
    b.add(mat(m), coneGeometry(0.5, h * 0.72, 10), x, sy + h * 0.36, z, 0, ry, 0);
    b.sphere(mat(m), x, sy + h * 0.78, z, 0.24, 10, 8, 1, 1.25, 1);
    b.add(mat(m), coneGeometry(0.34, 0.6, 10), x, sy + h * 0.86, z, 0, ry, 0);
    if (dial) {
      const [sx, sz] = off(x, z, ry, 0.45, 0.2);
      b.cyl(mat('brassDark'), sx, sy, sz, 0.03, 0.03, h * 0.95, 6);
      b.add(mat('gold'), new THREE.TorusGeometry(0.22, 0.025, 6, 16, Math.PI).toNonIndexed(), sx, sy + h * 0.95, sz, 0, ry, 0);
    }
  },

  skullNiche(b, x, z, ry, rng, { rows = 3 } = {}) {
    // Wandnische voller Schädel (wird an eine Wand gestellt, Rücken zur Wand)
    part(b, 'stoneDark', x, z, ry, 0, 1.3, -0.05, 1.8, 2.6, 0.3, { collide: true });
    for (let r = 0; r < rows; r++) for (let i = 0; i < 5; i++) {
      const [px, pz] = off(x, z, ry, -0.64 + i * 0.32 + rng.float(-0.03, 0.03), 0.16);
      const y = 0.55 + r * 0.62;
      b.sphere(mat('bone'), px, y, pz, 0.12, 8, 6, 1, 1.1, 1.05);
      const [ex1, ez1] = off(x, z, ry, -0.64 + i * 0.32 - 0.045, 0.27);
      const [ex2, ez2] = off(x, z, ry, -0.64 + i * 0.32 + 0.045, 0.27);
      b.sphere(mat('fabricBlack'), ex1, y + 0.02, ez1, 0.032, 6, 4);
      b.sphere(mat('fabricBlack'), ex2, y + 0.02, ez2, 0.032, 6, 4);
    }
    for (let r = 0; r <= rows; r++) part(b, 'bone', x, z, ry, 0, 0.3 + r * 0.62, 0.12, 1.7, 0.06, 0.2);
  },

  bonePile(b, x, z, ry, rng) {
    for (let i = 0; i < 14; i++) {
      const [px, pz] = off(x, z, ry, rng.float(-0.6, 0.6), rng.float(-0.6, 0.6));
      b.cyl(mat('bone'), px, rng.float(0, 0.25), pz, 0.03, 0.035, rng.float(0.3, 0.5), 6, { rx: Math.PI / 2 + rng.float(-0.3, 0.3), rz: rng.float(0, 3) });
    }
    for (let i = 0; i < 4; i++) {
      const [px, pz] = off(x, z, ry, rng.float(-0.5, 0.5), rng.float(-0.5, 0.5));
      b.sphere(mat('bone'), px, 0.12 + i * 0.05, pz, 0.12, 8, 6);
    }
    b.collider(x - 0.5, z - 0.5, x + 0.5, z + 0.5, 0, 0.5);
  },

  coffin(b, x, z, ry, rng, { open = false } = {}) {
    part(b, 'wood', x, z, ry, 0, 0.3, 0, 0.7, 0.6, 2.0, { collide: true });
    if (!open) part(b, 'wood', x, z, ry, 0, 0.63, 0, 0.74, 0.06, 2.04);
    part(b, 'brassDark', x, z, ry, 0, 0.67, 0.3, 0.06, 0.02, 0.5);
    part(b, 'brassDark', x, z, ry, 0, 0.67, 0.4, 0.25, 0.02, 0.06);
  },

  // ---------------------------------------------------------------- Verstecke
  locker(b, x, z, ry, rng, { m = 'steel' } = {}) {
    part(b, m, x, z, ry, 0, 1.0, 0, 0.8, 2.0, 0.6, { collide: true });
    for (let i = 0; i < 5; i++) part(b, 'fabricBlack', x, z, ry, 0, 1.55 + i * 0.05, 0.305, 0.5, 0.012, 0.01);
    part(b, 'steel', x, z, ry, 0.3, 1.1, 0.31, 0.03, 0.15, 0.02);
    const [ix, iz] = off(x, z, ry, 0, 0.05);
    const [fx, fz] = off(x, z, ry, 0, 0.75);
    return { hide: { pos: new THREE.Vector3(ix, 0, iz), front: new THREE.Vector3(fx, 0, fz), yaw: ry, eye: 1.6 } };
  },

  confessional(b, x, z, ry, rng) {
    part(b, 'wood', x, z, ry, 0, 1.25, 0, 1.2, 2.5, 1.0, { collide: true });
    part(b, 'wood', x, z, ry, 0, 2.6, 0, 1.4, 0.2, 1.1);
    part(b, 'fabricRed', x, z, ry, 0, 1.2, 0.505, 0.8, 1.9, 0.01);
    for (let i = 0; i < 6; i++) part(b, 'woodPanel', x, z, ry, -0.3 + i * 0.12, 1.7, 0.506, 0.04, 0.3, 0.01);
    const [ix, iz] = off(x, z, ry, 0, 0.05);
    const [fx, fz] = off(x, z, ry, 0, 0.95);
    return { hide: { pos: new THREE.Vector3(ix, 0, iz), front: new THREE.Vector3(fx, 0, fz), yaw: ry, eye: 1.5 } };
  },

  // ---------------------------------------------------------------- Kleinkram
  crt(b, x, y, z, ry, { size = 0.4 } = {}) {
    const [px, pz] = [x, z];
    b.box(mat('steel'), px, y + size / 2, pz, size * 1.1, size, size, { ry });
    return { screen: { pos: off(x, z, ry, 0, size / 2 + 0.005), y: y + size / 2, ry } };
  },

  pipeRun(b, x0, z0, x1, z1, y, r = 0.08, m = 'rust') {
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
    b.cyl(mat(m), (x0 + x1) / 2, y - len / 2, (z0 + z1) / 2, r, r, len, 8, { rx: Math.PI / 2, ry: Math.atan2(dx, dz) });
  },

  cables(b, x0, z0, x1, z1, y, n = 4, rng) {
    for (let i = 0; i < n; i++) {
      const sag = rng.float(0.1, 0.4);
      const segs = 6;
      for (let s = 0; s < segs; s++) {
        const t0 = s / segs, t1 = (s + 1) / segs;
        const ax = x0 + (x1 - x0) * t0, az = z0 + (z1 - z0) * t0, ay = y - Math.sin(t0 * Math.PI) * sag - i * 0.05;
        const bx = x0 + (x1 - x0) * t1, bz = z0 + (z1 - z0) * t1, by = y - Math.sin(t1 * Math.PI) * sag - i * 0.05;
        const len = Math.hypot(bx - ax, by - ay, bz - az);
        const g = cylGeometry(0.015, 0.015, len, 5);
        const m = new THREE.Matrix4();
        const dir = new THREE.Vector3(bx - ax, by - ay, bz - az).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        m.compose(new THREE.Vector3((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2), q, new THREE.Vector3(1, 1, 1));
        b.addMatrix(mat('rubber'), g, m);
      }
    }
  },
};

export { off, part, cylPart };
