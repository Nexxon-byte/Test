// Flutzonen: stehendes Grundwasser in abgelegenen Räumen – Lebensraum der Ertrunkenen.
// Solange es keine eigene Flut-Welt gibt (Stufe III „Alte Stadt“), legt das Paket die Zonen selbst an:
// flach am Rand (0,2 m, platscht), tief in der Mitte (knietief bis hüfttief: bremst, man sinkt ein).
// Beute im tiefen Wasser lockt hinein. Eine Fackel, die ins Tiefe fällt, erlischt zischend.
//
//   const flood = new Flood(director, { zones: 2, rng })   · flood.depthAt(x, z) → 0 | 1 flach | 2 tief
//   flood.update(dt)   · flood.dispose()

import * as THREE from 'three';
import { CS, DIRS, FLOOR } from '../../world/levelgen.js';
import { audio } from '../../audio/audio.js';
import { mkCanvas, glowTexture } from '../../gfx/textures.js';

export const FLOOD = { surfaceY: 0.34, sinkShallow: 0.07, sinkDeep: 0.3, slowShallow: 0.85, slowDeep: 0.62, minCells: 9, maxCells: 24 };

let _normTex = null;
// Kräuselung als Normalenkarte (Kanvas, einmal erzeugt)
function rippleNormal() {
  if (_normTex) return _normTex;
  const S = 256, c = mkCanvas(S, S), g = c.getContext('2d');
  const img = g.createImageData(S, S), h = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S * Math.PI * 2, v = y / S * Math.PI * 2;
    h[y * S + x] = Math.sin(u * 3 + Math.sin(v * 2) * 1.3) * 0.5 + Math.sin(v * 5 + u * 2) * 0.3 + Math.sin((u + v) * 7) * 0.15 + Math.sin(u * 11 - v * 9) * 0.08;
  }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = h[y * S + (x + 1) % S] - h[y * S + (x - 1 + S) % S];
    const dy = h[((y + 1) % S) * S + x] - h[((y - 1 + S) % S) * S + x];
    const i = (y * S + x) * 4;
    img.data[i] = 128 + dx * 60; img.data[i + 1] = 128 + dy * 60; img.data[i + 2] = 255; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  _normTex = new THREE.CanvasTexture(c);
  _normTex.wrapS = _normTex.wrapT = THREE.RepeatWrapping;
  _normTex.repeat.set(0.35, 0.35);
  return _normTex;
}

export class Flood {
  constructor(director, { zones = 2, rng = director.rng } = {}) {
    this.d = director;
    this.zones = [];
    this.map = new Map();        // Zellschlüssel → { zone, deep }
    this.group = new THREE.Group();
    this.group.name = 'Flut';
    this.rings = [];
    this.debris = [];
    this.time = 0;
    this._build(zones, rng);
    director.R.scene.add(this.group);
    this._hookSurface();
  }

  key(cx, cz) { return cz * 4096 + cx; }

  // ------------------------------------------------ Aufbau

  _build(count, rng) {
    const d = this.d, g = d.grid, level = d.level;
    const used = new Set();
    const seeds = [];
    for (let z = 1; z < g.h - 1; z++) for (let x = 1; x < g.w - 1; x++) {
      if (!g.isFloor(x, z) || g.isCabin(x, z) || g.isLanding(x, z)) continue;
      const dist = g.dist[g.idx(x, z)];
      if (dist >= 7) seeds.push([x, z, dist]);
    }
    rng.shuffle(seeds);
    seeds.sort((a, b) => (b[2] - a[2]) * 0.3 + (rng.next() - 0.5) * 4);
    for (const [sx, sz] of seeds) {
      if (this.zones.length >= count) break;
      if (used.has(this.key(sx, sz))) continue;
      if (this.zones.some(zn => zn.cells.some(([x, z]) => Math.abs(x - sx) + Math.abs(z - sz) < 8))) continue;
      // Überfluten: Breitensuche, Räume bevorzugt, nie nah an der Kabine
      const target = rng.int(FLOOD.minCells, FLOOD.maxCells);
      const cells = [], q = [[sx, sz]], seen = new Set([this.key(sx, sz)]);
      while (q.length && cells.length < target) {
        q.sort((a, b) => (g.room[g.idx(b[0], b[1])] >= 0) - (g.room[g.idx(a[0], a[1])] >= 0));
        const [x, z] = q.shift();
        cells.push([x, z]);
        for (const dir of DIRS) {
          const nx = x + dir.dx, nz = z + dir.dz, k = this.key(nx, nz);
          if (seen.has(k) || used.has(k)) continue;
          seen.add(k);
          if (!g.isFloor(nx, nz) || g.isCabin(nx, nz) || g.isLanding(nx, nz) || g.dist[g.idx(nx, nz)] < 4) continue;
          q.push([nx, nz]);
        }
      }
      if (cells.length < 5) continue;
      const set = new Set(cells.map(([x, z]) => this.key(x, z)));
      const zone = { id: this.zones.length, cells, deep: [], shallow: [], salted: 0 };
      for (const [x, z] of cells) {
        let n = 0;
        for (const dir of DIRS) { const k = this.key(x + dir.dx, z + dir.dz); if (set.has(k) || g.get(x + dir.dx, z + dir.dz) !== FLOOR) n++; }
        (n >= 4 ? zone.deep : zone.shallow).push([x, z]);
      }
      // schmale Zonen (Gänge): wer zwei Nachbarn im Wasser hat, ist tief
      if (zone.deep.length < 3) {
        zone.deep = cells.filter(([x, z]) => DIRS.filter(dir => set.has(this.key(x + dir.dx, z + dir.dz))).length >= 2);
        zone.shallow = cells.filter(c => !zone.deep.includes(c));
      }
      if (zone.deep.length < 2) continue;
      for (const [x, z] of zone.deep) this.map.set(this.key(x, z), { zone, deep: true });
      for (const [x, z] of zone.shallow) this.map.set(this.key(x, z), { zone, deep: false });
      for (const k of set) used.add(k);
      this.zones.push(zone);
      this._mesh(zone, level);
    }
  }

  _mesh(zone, level) {
    const pos = [], col = [], uv = [], idx = [];
    const h = CS / 2 + 0.02, y = FLOOD.surfaceY;
    const deepC = new THREE.Color(0x061013), shallowC = new THREE.Color(0x1b3136);
    const push = ([cx, cz], c) => {
      const [x, z] = level.center(cx, cz), b = pos.length / 3;
      for (const [dx, dz] of [[-h, -h], [h, -h], [h, h], [-h, h]]) { pos.push(x + dx, y, z + dz); col.push(c.r, c.g, c.b); uv.push((x + dx) * 0.4, (z + dz) * 0.4); }
      idx.push(b, b + 2, b + 1, b, b + 3, b + 2);
    };
    for (const c of zone.deep) push(c, deepC);
    for (const c of zone.shallow) push(c, shallowC);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff, vertexColors: true, roughness: 0.06, metalness: 0.35, transparent: true, opacity: 0.86, depthWrite: false,
      normalMap: rippleNormal(), normalScale: new THREE.Vector2(0.35, 0.35), emissive: 0x020607, emissiveIntensity: 1,
    });
    const mesh = new THREE.Mesh(geo, m);
    mesh.receiveShadow = true;
    mesh.renderOrder = 2;
    this.group.add(mesh);
    zone.mesh = mesh;
    // Treibgut: Bretter, Papier, ein Schuh
    const rng = this.d.rng;
    for (let i = 0; i < Math.min(6, zone.cells.length / 3); i++) {
      const [cx, cz] = zone.cells[rng.int(0, zone.cells.length - 1)];
      const [x, z] = level.center(cx, cz);
      const kind = rng.int(0, 2);
      const geo2 = kind === 0 ? new THREE.BoxGeometry(0.9, 0.03, 0.14) : kind === 1 ? new THREE.PlaneGeometry(0.22, 0.3) : new THREE.BoxGeometry(0.1, 0.08, 0.26);
      const mat2 = new THREE.MeshStandardMaterial({ color: kind === 1 ? 0x9a8c6a : 0x2a1f16, roughness: 0.8, side: THREE.DoubleSide });
      const o = new THREE.Mesh(geo2, mat2);
      if (kind === 1) o.rotation.x = -Math.PI / 2;
      o.position.set(x + rng.float(-1, 1), FLOOD.surfaceY + 0.01, z + rng.float(-1, 1));
      o.userData = { ph: rng.float(0, 6), x0: o.position.x, z0: o.position.z, ry: rng.float(0, 6) };
      this.group.add(o);
      this.debris.push(o);
    }
  }

  // Untergrund „water“ für Schritte und Lärm
  _hookSurface() {
    const level = this.d.level;
    const prev = level.surfaceFn;
    this._prevSurface = prev;
    level.surfaceFn = (x, z) => this.depthAt(x, z) ? 'water' : (prev ? prev(x, z) : (level.theme.surface || 'stone'));
  }

  // ------------------------------------------------ Abfragen

  cellOf(x, z) { const g = this.d.grid; return this.map.get(this.key(g.cx(x), g.cz(z))) || null; }
  depthAt(x, z) { const c = this.cellOf(x, z); return c ? (c.deep ? 2 : 1) : 0; }
  zoneAt(x, z) { return this.cellOf(x, z)?.zone || null; }

  // nächste tiefe Zelle einer Zone (Weltkoordinaten)
  nearestDeep(zone, x, z) {
    let best = null, bd = 1e9;
    for (const [cx, cz] of zone.deep) {
      const [wx, wz] = this.d.level.center(cx, cz);
      const dd = (wx - x) ** 2 + (wz - z) ** 2;
      if (dd < bd) { bd = dd; best = [wx, wz]; }
    }
    return best;
  }

  randomDeep(zone) { const c = zone.deep[this.d.rng.int(0, zone.deep.length - 1)]; return this.d.level.center(c[0], c[1]); }

  // Liegt (x, z) am Rand einer tiefen Zelle, aber selbst im Trockenen? → Richtung zum Wasser
  edgeNear(x, z, r = 1.1) {
    if (this.depthAt(x, z)) return null;
    for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, r * 0.7], [r * 0.7, -r * 0.7], [-r * 0.7, -r * 0.7]]) {
      const c = this.cellOf(x + dx, z + dz);
      if (c?.deep) return { zone: c.zone, x: x + dx, z: z + dz };
    }
    return null;
  }

  // ------------------------------------------------ Kreise auf dem Wasser

  ring(x, z, size = 1, strength = 0.5) {
    let r = this.rings.find(o => !o.visible);
    if (!r) {
      if (this.rings.length > 24) return;
      r = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 32), new THREE.MeshBasicMaterial({ color: 0x9fd4de, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
      r.rotation.x = -Math.PI / 2;
      this.group.add(r);
      this.rings.push(r);
    }
    r.visible = true;
    r.position.set(x, FLOOD.surfaceY + 0.012, z);
    r.userData = { t: 0, size, strength };
  }

  update(dt) {
    this.time += dt;
    const t = this.time;
    for (const z of this.zones) {
      const n = z.mesh.material.normalMap;
      n.offset.set(t * 0.012, t * 0.008);
      if (z.salted > 0) z.salted -= dt;
    }
    for (const o of this.debris) {
      const u = o.userData;
      o.position.y = FLOOD.surfaceY + 0.01 + Math.sin(t * 0.9 + u.ph) * 0.012;
      o.position.x = u.x0 + Math.sin(t * 0.07 + u.ph) * 0.3;
      if (o.geometry.type !== 'PlaneGeometry') o.rotation.y = u.ry + Math.sin(t * 0.1 + u.ph) * 0.4;
    }
    for (const r of this.rings) {
      if (!r.visible) continue;
      const u = r.userData;
      u.t += dt;
      const k = u.t / 2.2;
      r.scale.setScalar(0.1 + k * 1.6 * u.size);
      r.material.opacity = Math.max(0, (1 - k)) * 0.35 * u.strength;
      if (k >= 1) r.visible = false;
    }
    // Fackeln ersaufen im Tiefen
    for (const f of this.d.flares) {
      if (f._drowned || f.pos.y > FLOOD.surfaceY + 0.2) continue;
      if (this.depthAt(f.pos.x, f.pos.z) === 2) {
        f._drowned = true;
        f.t = Math.min(f.t, 0.25);
        audio.play('flareIgnite', { pos: f.pos.clone(), vol: 0.25 });
        audio.play('splash', { pos: f.pos.clone(), vol: 0.5 });
        this.ring(f.pos.x, f.pos.z, 1.2, 1);
      }
    }
  }

  // Salz ins Wasser: die Zone brennt für eine Weile (Ertrunkene meiden sie)
  salt(x, z) {
    const zone = this.zoneAt(x, z) || this.zones.find(zn => zn.cells.some(([cx, cz]) => { const [wx, wz] = this.d.level.center(cx, cz); return Math.hypot(wx - x, wz - z) < 2.2; }));
    if (!zone) return false;
    zone.salted = 60;
    zone.saltAt = new THREE.Vector3(x, 0, z);
    return true;
  }

  dispose() {
    if (this.d.level) this.d.level.surfaceFn = this._prevSurface;
    this.group.traverse(o => { o.geometry?.dispose?.(); o.material?.dispose?.(); });   // Texturen (Kräuselung) bleiben geteilt
    this.group.removeFromParent();
  }
}
