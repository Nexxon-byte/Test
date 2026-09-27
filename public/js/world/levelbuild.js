// Baut aus Gitter + Thema die sichtbare, begehbare Ebene.

import * as THREE from 'three';
import { Builder, quadGeometry, boxGeometry, gothicArchGeometry, disposeGroup } from '../gfx/geo.js';
import { mat, glowMat } from '../gfx/materials.js';
import { flameTexture, glowTexture, neonSign, chalkTexture, posterTexture } from '../gfx/textures.js';
import { generate, CS, SOLID, FLOOR, CABIN, DIRS } from './levelgen.js';
import { RNG } from '../core/rng.js';
import { CAB } from './cab.js';
import { P } from './props.js';

export class Level {
  constructor(grid, theme, rng) {
    this.grid = grid;
    this.theme = theme;
    this.rng = rng;
    this.group = new THREE.Group();
    this.group.name = 'Ebene';
    this.fixtures = [];
    this.colliders = [];
    this.hides = [];
    this.emitters = [];           // {loop, pos, opts}
    this.candles = [];            // Flammen-Sprites
    this.anchors = {};            // benannte Punkte (für Skripte)
    this.reserved = new Set();
    this.surfaceMap = null;       // optional: Zelle → Untergrund
    this.dynamic = [];            // Objekte mit update(dt)
  }

  cellKey(x, z) { return z * this.grid.w + x; }
  reserve(x, z) { this.reserved.add(this.cellKey(x, z)); }
  isFree(x, z) { return this.grid.isFloor(x, z) && !this.reserved.has(this.cellKey(x, z)); }
  center(x, z) { return [this.grid.wx(x), this.grid.wz(z)]; }

  // Freie Zellen, sortiert nach Entfernung zum Absatz (weit zuerst)
  farCells(minDist = 6, filter = null) {
    const g = this.grid, out = [];
    for (let z = 0; z < g.h; z++) for (let x = 0; x < g.w; x++) {
      if (!this.isFree(x, z)) continue;
      const d = g.dist[g.idx(x, z)];
      if (d >= minDist && (!filter || filter(x, z))) out.push([x, z, d]);
    }
    return out.sort((a, b) => b[2] - a[2]);
  }

  // Wandplätze in einer Zellenliste: Position vor der Wand, Blick in die Zelle
  wallSlots(cells, inset = 0.35) {
    const g = this.grid, out = [];
    for (const [x, z] of cells) {
      for (const d of DIRS) {
        if (g.get(x + d.dx, z + d.dz) !== SOLID) continue;
        const [cx, cz] = this.center(x, z);
        const px = cx + d.dx * (CS / 2 - inset), pz = cz + d.dz * (CS / 2 - inset);
        const ry = Math.atan2(-d.dx, -d.dz);   // Blickrichtung weg von der Wand
        out.push({ x: px, z: pz, ry, cell: [x, z], dir: d });
      }
    }
    return out;
  }

  surfaceAt(x, z) {
    if (this.surfaceFn) return this.surfaceFn(x, z);
    return this.theme.surface || 'stone';
  }

  dispose(scene, collision) {
    disposeGroup(this.group);
    for (const c of this.colliders) collision.remove(c);
    for (const e of this.emitters) e.handle?.stop(0.3);
    this.dynamic.length = 0;
  }
}

// ----------------------------------------------------------------------------

export function buildLevel(R, collision, theme, seed, genOverrides = {}) {
  const rng = new RNG(seed);
  const gen = { ...theme.gen, ...genOverrides };
  const grid = generate(gen.style, seed, gen);
  const level = new Level(grid, theme, rng);
  const b = new Builder();
  level.builder = b;
  // Absatz vor dem Tor freihalten (die mittleren 2 × 2 Zellen; die Randzellen dürfen Deko tragen)
  for (let z = grid.ez + 1; z <= grid.ez + 2; z++) for (let x = grid.ex - 1; x <= grid.ex; x++) level.reserve(x, z);

  buildArchitecture(b, grid, theme, level);
  buildPortal(b, grid, theme, level);

  const ctx = makeCtx(R, b, grid, theme, level, rng);
  level.ctx = ctx;
  if (theme.decorate) theme.decorate(ctx);
  if (theme.lighting !== false) autoLights(ctx);

  const mesh = b.build();
  level.group.add(mesh);
  R.scene.add(level.group);

  // Kollision: Fels an Bodenzellen + Requisiten
  for (let z = 0; z < grid.h; z++) for (let x = 0; x < grid.w; x++) {
    if (grid.get(x, z) !== SOLID) continue;
    let adj = false;
    for (let dz = -1; dz <= 1 && !adj; dz++) for (let dx = -1; dx <= 1; dx++) if (grid.get(x + dx, z + dz) === FLOOR) { adj = true; break; }
    if (!adj) continue;
    const cx = grid.wx(x), cz = grid.wz(z);
    level.colliders.push(collision.add({ minX: cx - CS / 2, maxX: cx + CS / 2, minZ: cz - CS / 2, maxZ: cz + CS / 2, minY: -1, maxY: 50, tag: 'level' }));
  }
  for (const c of b.colliders) { c.tag = 'level'; level.colliders.push(collision.add(c)); }
  return level;
}

// ----------------------------------------------------------------------------
// Architektur
// ----------------------------------------------------------------------------

function buildArchitecture(b, grid, t, level) {
  const H = t.height;
  const floorM = mat(t.floor), ceilM = t.ceiling ? mat(t.ceiling) : null, wallM = mat(t.wall);
  const wainM = t.wainscot ? mat(t.wainscot) : null;
  const trimM = t.trim ? mat(t.trim) : null;
  const pilM = t.pilasters ? mat(t.pilasters) : null;
  const wh = t.wainscotH ?? 1.1;
  const h2 = CS / 2;

  for (let z = 0; z < grid.h; z++) for (let x = 0; x < grid.w; x++) {
    if (grid.get(x, z) !== FLOOR) continue;
    const cx = grid.wx(x), cz = grid.wz(z);
    const fm = t.floorFn ? mat(t.floorFn(x, z, grid) || t.floor) : floorM;
    // Boden
    b.add(fm, quadGeometry([cx - h2, 0, cz + h2], [cx + h2, 0, cz + h2], [cx + h2, 0, cz - h2], [cx - h2, 0, cz - h2], CS, CS, cx - h2, -(cz + h2)));
    // Decke
    if (ceilM && !t.noCeiling) {
      b.add(ceilM, quadGeometry([cx - h2, H, cz - h2], [cx + h2, H, cz - h2], [cx + h2, H, cz + h2], [cx - h2, H, cz + h2], CS, CS, cx - h2, cz - h2));
      if (t.ribs === 'x') {
        const len = CS * Math.SQRT2;
        b.box(mat(t.ribMat || t.pilasters || t.wall), cx, H - 0.1, cz, len, 0.18, 0.16, { ry: Math.PI / 4 });
        b.box(mat(t.ribMat || t.pilasters || t.wall), cx, H - 0.1, cz, len, 0.18, 0.16, { ry: -Math.PI / 4 });
      } else if (t.ribs === 'beam' && ((x + z) % 2 === 0)) {
        b.box(mat(t.ribMat || 'wood'), cx, H - 0.14, cz, CS, 0.28, 0.22);
      }
    }
    // Wände
    for (const d of DIRS) {
      const nx = x + d.dx, nz = z + d.dz;
      const nc = grid.get(nx, nz);
      if (nc === FLOOR) continue;
      if (nc === CABIN) continue; // Portal extra
      const wx = cx + d.dx * h2, wz = cz + d.dz * h2;
      const tx = -d.dz, tz = d.dx;           // Tangente (siehe Normale nach innen)
      const ax = wx - tx * h2, az = wz - tz * h2, bx = wx + tx * h2, bz = wz + tz * h2;
      const u0 = tx !== 0 ? ax * tx : az * tz;
      const wallTop = t.wallHeight ?? H;
      const wm = t.wallFn ? mat(t.wallFn(x, z, d, grid) || t.wall) : wallM;
      if (wainM) {
        b.add(wainM, quadGeometry([ax, 0, az], [bx, 0, bz], [bx, wh, bz], [ax, wh, az], CS, wh, u0, 0));
        b.add(wm, quadGeometry([ax, wh, az], [bx, wh, bz], [bx, wallTop, bz], [ax, wallTop, az], CS, wallTop - wh, u0, wh));
      } else {
        b.add(wm, quadGeometry([ax, 0, az], [bx, 0, bz], [bx, wallTop, bz], [ax, wallTop, az], CS, wallTop, u0, 0));
      }
      const ry = Math.atan2(tx, tz);
      const nxo = -d.dx, nzo = -d.dz;
      if (trimM) {
        b.box(trimM, wx + nxo * 0.04, 0.09, wz + nzo * 0.04, CS, 0.18, 0.08, { ry: ry + Math.PI / 2 });
        if (wainM) b.box(trimM, wx + nxo * 0.035, wh, wz + nzo * 0.035, CS, 0.06, 0.07, { ry: ry + Math.PI / 2 });
        if (!t.noCeiling) b.box(trimM, wx + nxo * 0.06, H - 0.12, wz + nzo * 0.06, CS, 0.24, 0.12, { ry: ry + Math.PI / 2 });
      }
      if (pilM && ((tx !== 0 ? x : z) % (t.pilasterEvery ?? 2) === 0)) {
        b.box(pilM, ax + nxo * 0.1, wallTop / 2, az + nzo * 0.1, 0.36, wallTop, 0.2, { ry: ry + Math.PI / 2 });
        b.box(pilM, ax + nxo * 0.14, 0.18, az + nzo * 0.14, 0.48, 0.36, 0.28, { ry: ry + Math.PI / 2 });
      }
      if (t.wallDeco) t.wallDeco(b, { x, z, d, wx, wz, tx, tz, ry, H, rng: level.rng, level });
    }
    // Spitzbögen an Raum-Übergängen
    if (t.arches) {
      for (const d of [DIRS[0], DIRS[2]]) {
        const nx = x + d.dx, nz = z + d.dz;
        if (grid.get(nx, nz) !== FLOOR) continue;
        const r1 = grid.room[grid.idx(x, z)], r2 = grid.room[grid.idx(nx, nz)];
        if (r1 === r2) continue;
        // nur bei 1 Zelle breiten Öffnungen
        const side1 = grid.get(x + d.dz, z + d.dx) === SOLID && grid.get(nx + d.dz, nz + d.dx) === SOLID;
        const side2 = grid.get(x - d.dz, z - d.dx) === SOLID && grid.get(nx - d.dz, nz - d.dx) === SOLID;
        if (!side1 || !side2) continue;
        const ax = cx + d.dx * h2, az = cz + d.dz * h2;
        const ah = Math.min(H - 0.3, t.archH ?? 2.9);
        const geo = gothicArchGeometry(CS - 0.5, ah, 0.4, 0.25);
        b.add(mat(t.arches), geo, ax, 0, az, 0, d.dx !== 0 ? Math.PI / 2 : 0, 0);
        if (H > ah + 0.3) b.box(mat(t.wall), ax, (ah + 0.2 + H) / 2, az, d.dx !== 0 ? 0.3 : CS, H - ah - 0.2, d.dx !== 0 ? CS : 0.3);
        const lx = d.dx !== 0 ? 0 : (CS - 0.5) / 2 + 0.125, lz = d.dx !== 0 ? (CS - 0.5) / 2 + 0.125 : 0;
        b.collider(ax + lx - 0.13 - (d.dx ? 0.2 : 0), az + lz - 0.13 - (d.dz ? 0.2 : 0), ax + lx + 0.13 + (d.dx ? 0.2 : 0), az + lz + 0.13 + (d.dz ? 0.2 : 0));
        b.collider(ax - lx - 0.13 - (d.dx ? 0.2 : 0), az - lz - 0.13 - (d.dz ? 0.2 : 0), ax - lx + 0.13 + (d.dx ? 0.2 : 0), az - lz + 0.13 + (d.dz ? 0.2 : 0));
      }
    }
  }
}

// Wand mit dem Etagentor zum Absatz: 3 m breites Lasttor in schwerem Stahlrahmen
export function buildPortal(b, grid, t, level) {
  const H = t.height, z = CAB.LANDING_Z, dw = CAB.DOOR / 2, dh = CAB.DOOR_H;
  const half = (CAB.CELLS_X * CS) / 2;
  const wallM = mat(t.wall);
  const side = half - dw;
  for (const s of [-1, 1]) {
    const x0 = s < 0 ? -half : dw, x1 = s < 0 ? -dw : half;
    b.add(wallM, quadGeometry([x0, 0, z], [x1, 0, z], [x1, H, z], [x0, H, z], side, H, x0, 0));
  }
  b.add(wallM, quadGeometry([-dw, dh, z], [dw, dh, z], [dw, H, z], [-dw, H, z], CAB.DOOR, H - dh, -dw, dh));
  const fm = mat(t.portal || 'brassDark'), steel = mat('steel'), hz = mat('hazard');
  // Pfosten & Sturz (Themenmaterial) mit Stahlkante
  for (const s of [-1, 1]) {
    b.box(fm, s * (dw + 0.12), dh / 2, z + 0.07, 0.24, dh + 0.1, 0.14, { collide: true });
    b.box(steel, s * (dw + 0.01), dh / 2, z + 0.1, 0.03, dh, 0.08);
    b.box(hz, s * (dw + 0.12), 0.5, z + 0.142, 0.24, 1.0, 0.004);
    // Rammschutz am Fuß
    b.box(steel, s * (dw + 0.2), 0.25, z + 0.2, 0.18, 0.5, 0.18, { collide: true });
  }
  b.box(fm, 0, dh + 0.14, z + 0.07, CAB.DOOR + 0.48, 0.28, 0.14);
  b.box(hz, 0, dh + 0.14, z + 0.142, CAB.DOOR + 0.1, 0.12, 0.004);
  b.box(steel, 0, dh + 0.005, z + 0.1, CAB.DOOR, 0.03, 0.08);
  // Schwelle mit Warnstreifen
  b.box(steel, 0, 0.004, z + 0.2, CAB.DOOR + 0.2, 0.012, 0.4);
  b.box(hz, 0, 0.011, z + 0.3, CAB.DOOR, 0.004, 0.16);
  // Anzeigetafel für die Nixie-Röhre (die Röhre selbst gehört zur Kabine)
  const px = CAB.OUTER_PANEL_X, py = CAB.OUTER_PANEL_Y;
  b.box(fm, px, py, z + 0.05, 0.56, 0.3, 0.1);
  b.box(steel, px, py - 0.18, z + 0.05, 0.1, 0.06, 0.06);
  // Ruftaster darunter
  b.box(steel, px, 1.35, z + 0.04, 0.16, 0.26, 0.08);
  b.cyl(mat('brass'), px, 1.35, z + 0.08, 0.03, 0.03, 0.03, 10, { rx: Math.PI / 2 });
  level.anchors.portal = new THREE.Vector3(0, 0, z + 0.9);
  level.anchors.callButton = new THREE.Vector3(px, 1.35, z + 0.1);
}

// ----------------------------------------------------------------------------
// Kontext für Themen-Dekoration
// ----------------------------------------------------------------------------

export function makeCtx(R, b, grid, theme, level, rng) {
  const ctx = {
    R, b, grid, theme, level, rng, P, CS,
    rooms: grid.rooms,
    center: (x, z) => level.center(x, z),

    // Leuchte mit eigenem Emissiv-Material (für individuelles Flackern)
    fixture({ x, y, z, type = 'bulb', color = 0xffc080, intensity = 6, distance = 9, mode = 'steady', flicker = 0, on = true, priority = 1, ry = 0 }) {
      const m = glowMat(color, type === 'candle' ? 2 : 3.2, 'fx').clone();
      m.userData.disposable = true;
      let mesh;
      switch (type) {
        case 'tube':
          mesh = new THREE.Mesh(boxGeometry(1.4, 0.06, 0.1), m);
          b.box(mat('steel'), x, y + 0.06, z, 1.5, 0.06, 0.2, { ry });
          mesh.rotation.y = ry;
          break;
        case 'box':
          mesh = new THREE.Mesh(boxGeometry(0.45, 0.08, 0.45), m);
          b.box(mat('steel'), x, y + 0.08, z, 0.55, 0.1, 0.55);
          break;
        case 'bulb':
          mesh = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), m);
          b.cyl(mat('rubber'), x, y + 0.08, z, 0.008, 0.008, (theme.height - y), 4);
          b.cyl(mat('rust'), x, y + 0.05, z, 0.05, 0.12, 0.1, 8);
          break;
        case 'sconce':
          mesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), m);
          b.box(mat('brassDark'), x, y - 0.1, z, 0.08, 0.25, 0.08);
          break;
        case 'sodium':
          mesh = new THREE.Mesh(boxGeometry(0.5, 0.1, 0.25), m);
          b.box(mat('steel'), x, y + 0.08, z, 0.6, 0.12, 0.34, { ry });
          mesh.rotation.y = ry;
          break;
        case 'candle':
          mesh = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), color: 0xc89060, blending: THREE.AdditiveBlending, depthWrite: false }));
          mesh.scale.set(0.05, 0.1, 1);
          mesh.material.userData.disposable = true;
          break;
        case 'none':
          mesh = null;
          break;
        default:
          mesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), m);
      }
      if (mesh) { mesh.position.set(x, y, z); level.group.add(mesh); }
      const f = { pos: new THREE.Vector3(x, y - 0.15, z), color, intensity: on ? intensity : 0, distance, mode, flicker, on, priority, meshes: mesh && mesh.material?.emissiveIntensity !== undefined ? [mesh] : [], sprite: mesh?.isSprite ? mesh : null, type };
      level.fixtures.push(f);
      return f;
    },

    candle(x, y, z, light = false) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), color: 0xc89060, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.scale.set(0.035, 0.07, 1);
      s.position.set(x, y, z);
      s.userData.base = 0.07;
      s.userData.phase = rng.float(0, 10);
      level.group.add(s);
      level.candles.push(s);
      if (light) ctx.fixture({ x, y: y + 0.1, z, type: 'none', color: 0xff9a40, intensity: 1.6, distance: 5, mode: 'candle' });
      return s;
    },

    hide(info) { level.hides.push(info); return info; },
    emit(loop, pos, opts = {}) { level.emitters.push({ loop, pos: pos.clone ? pos : new THREE.Vector3(...pos), opts }); },

    decal(tex, x, y, z, ry, w, h, { emissive = 0, transparent = true, color = 0xffffff } = {}) {
      const m = new THREE.MeshStandardMaterial({ map: tex, transparent, alphaTest: transparent ? 0.02 : 0, depthWrite: !transparent, roughness: 0.9, color, emissive: emissive ? 0xffffff : 0x000000, emissiveMap: emissive ? tex : null, emissiveIntensity: emissive });
      m.userData.disposable = true;
      tex.userData = { disposable: true };
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
      mesh.position.set(x, y, z);
      mesh.rotation.y = ry;
      mesh.receiveShadow = true;
      level.group.add(mesh);
      return mesh;
    },

    neon(text, color, x, y, z, ry, w = 2, opts = {}) {
      const tex = neonSign(text, { color, w: 512, h: 128, font: opts.font });
      const mesh = ctx.decal(tex, x, y, z, ry, w, w / 4, { emissive: 2.2 });
      const f = ctx.fixture({ x: x + Math.sin(ry) * 0.4, y, z: z + Math.cos(ry) * 0.4, type: 'none', color, intensity: opts.intensity ?? 3, distance: 6, mode: 'neon', flicker: opts.flicker ?? 0.3 });
      f.meshes = [mesh];
      f.baseEmissive = null;
      ctx.emit('neon', [x, y, z]);
      return mesh;
    },

    chalk(text, x, y, z, ry, w = 1.6, opts = {}) {
      const tex = chalkTexture(text, opts);
      return ctx.decal(tex, x, y, z, ry, w, w / 2);
    },

    poster(opts, x, y, z, ry, w = 0.6) {
      const tex = posterTexture(opts);
      return ctx.decal(tex, x, y, z, ry, w, w * 360 / 256, { transparent: false });
    },

    // Wandplatz für Wanddeko auf Zellen-Liste
    wallSlots: (cells, inset) => level.wallSlots(cells, inset),
    allCells() { const out = []; for (let z = 0; z < grid.h; z++) for (let x = 0; x < grid.w; x++) if (grid.isFloor(x, z)) out.push([x, z]); return out; },
    corridorCells() { return ctx.allCells().filter(([x, z]) => grid.room[grid.idx(x, z)] < 0); },
    block(x, z) { grid.block[grid.idx(x, z)] = 1; level.reserve(x, z); },
  };
  return ctx;
}

// Standard-Beleuchtung: Raster in Räumen, Abstände in Gängen
function autoLights(ctx) {
  const { grid, theme, rng } = ctx;
  const L = theme.lights || {};
  const spacing = L.spacing ?? 3, cs = L.corridorSpacing ?? 3;
  const y = L.y ?? theme.height - 0.12;
  const placed = [];
  for (let z = 1; z < grid.h - 1; z++) for (let x = 1; x < grid.w - 1; x++) {
    if (!grid.isFloor(x, z)) continue;
    const inRoom = grid.room[grid.idx(x, z)] >= 0;
    const ok = inRoom ? (x % spacing === 1 && z % spacing === 1) : ((x + z) % cs === 0);
    if (!ok) continue;
    if (placed.some(([px, pz]) => Math.abs(px - x) + Math.abs(pz - z) < (inRoom ? spacing : cs) - 0.5)) continue;
    placed.push([x, z]);
    const dead = rng.chance(L.dead ?? 0.25);
    const [cx, cz] = ctx.center(x, z);
    ctx.fixture({
      x: cx, y, z: cz, type: L.type ?? 'bulb', color: L.color ?? 0xffc080,
      intensity: L.intensity ?? 6, distance: L.distance ?? 9,
      mode: rng.chance(L.dying ?? 0.15) ? 'dying' : (L.mode ?? 'steady'),
      flicker: L.flicker ?? 0.1, on: !dead, ry: grid.get(x + 1, z) === 1 ? 0 : Math.PI / 2,
    });
  }
}
