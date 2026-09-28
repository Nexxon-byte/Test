// Bauten und Bilder der Segnung (Platzhalter aus Grundformen – MODELLE.md beschreibt, wie sie
// zuhause richtig gebaut werden). Alles lässt sich einzeln ein- und abbauen.
//
//   Rufkanzel      Balkon über dem Schachtkopf, Baldachin, Kohlebecken, Käfig, in dem der Hochkantor herabfährt
//   Glockenstuhl   drei Glocken über dem Portal, schwingen beim Läuten
//   Kerzenweg      zwei Reihen Kerzen von der Kantorei zur Neunten, entzünden sich nacheinander
//   Banner         weiße Bahnen mit dem Zifferblatt, rollen sich ab
//   Baldachin      weißer Himmel über dem Absatz der Neunten
//   Salzschnee     weiße Kristalle statt Regen
//   Galerie        im Schacht: hinter den Gittern stehen die Erwählten früherer Mannschaften, Nummern 46 … 1
//   ChorHaende     unten: blasse Hände greifen durch das Scherengitter, Gesichter im Dunkel
//   Nachspuren     danach im Markt: Wachsstümpfe, Salz, zerrissene Bahn, Strichliste mit 47

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CAB } from '../world/cab.js';
import { mat, glowMat } from '../gfx/materials.js';
import { glowTexture, flameTexture, mkCanvas, drawDialSymbol, chalkTexture } from '../gfx/textures.js';
import { Character } from '../gfx/characters.js';
import { whiteRobes, numberPlateTexture } from '../game/monsters/standin.js';
import { audio } from '../audio/audio.js';

const Z0 = CAB.LANDING_Z;
const _v = new THREE.Vector3();

const sprite = (color, scale, opacity = 1, map = glowTexture()) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.setScalar(scale);
  s.renderOrder = 5;
  return s;
};

let _emblem = null;
function emblemTexture() {
  if (_emblem) return _emblem;
  const c = mkCanvas(256, 256), g = c.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  drawDialSymbol(g, 128, 178, 96, '#f3d38a', -0.35, 8);
  g.fillStyle = '#f3d38a'; g.font = '600 26px "Cormorant Garamond", serif'; g.textAlign = 'center';
  g.fillText('HOHE KANZLEI', 128, 222);
  _emblem = new THREE.CanvasTexture(c); _emblem.colorSpace = THREE.SRGBColorSpace;
  return _emblem;
}

let _cloth = null;
// Weißes Tuch mit Zifferblatt und Saum
function bannerTexture() {
  if (_cloth) return _cloth;
  const c = mkCanvas(128, 512), g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 128, 0);
  gr.addColorStop(0, '#d8d2c4'); gr.addColorStop(0.5, '#f4f0e6'); gr.addColorStop(1, '#d2ccbe');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 512);
  g.strokeStyle = '#b8942e'; g.lineWidth = 5; g.strokeRect(8, 8, 112, 496);
  drawDialSymbol(g, 64, 150, 44, '#b8942e', -0.3, 5);
  g.fillStyle = '#8a1a14';
  for (let i = 0; i < 5; i++) g.fillRect(52, 230 + i * 44, 24, 24);
  // Fransen
  g.clearRect(0, 496, 128, 16);
  g.fillStyle = '#e8e2d4';
  for (let x = 4; x < 128; x += 8) g.fillRect(x, 492, 3, 20);
  _cloth = new THREE.CanvasTexture(c); _cloth.colorSpace = THREE.SRGBColorSpace;
  return _cloth;
}

// Glockenform (Drehkörper)
function bellGeometry(r) {
  const pts = [];
  const prof = [[0, 1.0], [0.18, 0.98], [0.32, 0.9], [0.4, 0.72], [0.45, 0.45], [0.55, 0.2], [0.72, 0.06], [0.8, 0.0], [0.74, -0.02]];
  for (const [x, y] of prof) pts.push(new THREE.Vector2(x * r, y * r * 1.1));
  const g = new THREE.LatheGeometry(pts, 24);
  g.computeVertexNormals();
  return g;
}

// ============================================================================ Rufkanzel

export class Rufkanzel {
  constructor(scene, pool) {
    this.pool = pool;
    const g = this.group = new THREE.Group();
    g.position.set(0, 0, Z0);
    const stone = mat('stone'), brass = mat('brass'), dark = mat('stoneDark');
    const Y = 6.1;
    this.floorY = Y + 0.13;
    // Plattform auf zwei Konsolen
    const plat = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.26, 1.7), stone); plat.position.set(0, Y, 0.85);
    for (const x of [-1.2, 1.2]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 0.9), dark); c.position.set(x, Y - 0.65, 0.5); g.add(c); }
    // Brüstung mit Emblem
    const par = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.0, 0.16), stone); par.position.set(0, Y + 0.63, 1.62);
    const em = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), new THREE.MeshStandardMaterial({ map: emblemTexture(), transparent: true, emissive: 0xffc868, emissiveMap: emblemTexture(), emissiveIntensity: 1.2, roughness: 0.4, metalness: 0.6 }));
    em.position.set(0, Y + 0.55, 1.71);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 3.4, 8), brass); rail.rotation.z = Math.PI / 2; rail.position.set(0, Y + 1.16, 1.62);
    g.add(plat, par, em, rail);
    // Baldachin: vier Messingstangen, weißes Tuch
    for (const [x, z] of [[-1.5, 0.15], [1.5, 0.15], [-1.5, 1.55], [1.5, 1.55]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.8, 6), brass); p.position.set(x, Y + 1.53, z); g.add(p); }
    const roofG = new THREE.PlaneGeometry(3.3, 1.7, 8, 4);
    const pos = roofG.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, -0.12 * (1 - (x / 1.65) ** 2) * (1 - (y / 0.85) ** 2)); }
    roofG.computeVertexNormals();
    const roof = new THREE.Mesh(roofG, new THREE.MeshStandardMaterial({ color: 0xf0ebe0, roughness: 0.95, side: THREE.DoubleSide, emissive: 0xfff2d8, emissiveIntensity: 0.12 }));
    roof.rotation.x = -Math.PI / 2; roof.position.set(0, Y + 2.9, 0.85);
    g.add(roof);
    // Kohlebecken links und rechts
    this.braziers = [];
    for (const x of [-1.55, 1.55]) {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.12, 0.2, 12), brass); bowl.position.set(x, Y + 1.3, 1.62);
      const fire = sprite(0xff8a3a, 0.7, 0.9); fire.position.set(x, Y + 1.55, 1.62);
      g.add(bowl, fire);
      this.braziers.push(fire);
    }
    // Käfig: fährt aus dem Dunkel herab
    const cage = this.cage = new THREE.Group();
    const bars = new THREE.Group();
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 2.7, 4), brass); b.position.set(Math.cos(a) * 0.62, 1.35, Math.sin(a) * 0.62); bars.add(b); }
    for (const y of [0.02, 2.7]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 6, 24), brass); ring.rotation.x = Math.PI / 2; ring.position.y = y; bars.add(ring); }
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.64, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass); dome.position.y = 2.7;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 16, 4), mat('brassDark')); chain.position.y = 2.7 + 8.5;
    const lamp = sprite(0xfff0d0, 0.5, 0.9); lamp.position.y = 2.4;
    cage.add(bars, dome, chain, lamp);
    this.cageTop = 18;
    cage.position.set(0, this.cageTop, 0.75);
    g.add(cage);
    // Lichtkegel auf den Markt (Schein; dazu ein Punktlicht aus dem Pool beim Ziel)
    this.spot = pool.add({ pos: new THREE.Vector3(0, 3.5, 8), color: 0xfff4e0, intensity: 0, distance: 7, mode: 'steady', on: true, meshes: [], priority: 6 });
    this.fire = pool.add({ pos: new THREE.Vector3(0, Y + 1.7, Z0 + 1.7), color: 0xff8030, intensity: 5, distance: 9, mode: 'candle', on: true, meshes: [], priority: 4 });
    scene.add(g);
    this.t = 0;
    this.cageK = 0;
  }

  // Käfig herablassen (0 = oben im Dunkel, 1 = auf der Kanzel)
  lower(k) { this.cageK = k; }
  get cageWorld() { return this.cage.getWorldPosition(new THREE.Vector3()); }
  aim(x, z, on = 1) { this.spot.pos.set(x, 3.2, z); this.spot.intensity = 14 * on; }

  update(dt) {
    this.t += dt;
    const y = this.floorY + (this.cageTop - this.floorY) * (1 - this.cageK);
    this.cage.position.y += (y - this.cage.position.y) * Math.min(1, dt * 1.5);
    for (const [i, f] of this.braziers.entries()) f.scale.setScalar(0.65 + Math.sin(this.t * 9 + i) * 0.06 + Math.random() * 0.05);
  }

  dispose() {
    this.pool.remove(this.spot); this.pool.remove(this.fire);
    this.group.removeFromParent();
  }
}

// ============================================================================ Glockenstuhl

export class Glockenstuhl {
  constructor(scene) {
    const g = this.group = new THREE.Group();
    g.position.set(0, 10.4, Z0 + 1.0);
    const wood = mat('walnut'), iron = mat('steel');
    const beam = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.3, 0.3), wood); beam.position.y = 1.2;
    for (const x of [-3.6, 3.6]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.3), wood); p.position.set(x, 0, 0); g.add(p); }
    g.add(beam);
    const bronze = new THREE.MeshStandardMaterial({ color: 0x6a4a22, roughness: 0.38, metalness: 0.85, side: THREE.DoubleSide });
    this.bells = [];
    for (const [x, r, f] of [[-2.3, 0.62, 65], [0, 0.85, 49], [2.3, 0.5, 82]]) {
      const pivot = new THREE.Group(); pivot.position.set(x, 1.05, 0);
      const bell = new THREE.Mesh(bellGeometry(r), bronze); bell.position.y = -r * 1.15; bell.castShadow = true;
      const yoke = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, r * 1.1), iron); yoke.position.y = -0.05;
      const clap = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 8, 6), iron); clap.position.y = -r * 1.05;
      pivot.add(bell, yoke, clap);
      g.add(pivot);
      this.bells.push({ pivot, a: 0, v: 0, f });
    }
    scene.add(g);
  }

  // Glocke i läuten (0 links, 1 Mitte – die große, 2 rechts)
  toll(i, vol = 0.9) {
    const b = this.bells[i];
    b.v += 2.4;
    const p = b.pivot.getWorldPosition(new THREE.Vector3());
    audio.play('bell', { pos: p, vol, f: b.f });
    setTimeout(() => audio.play('bell', { pos: p, vol: vol * 0.5, f: b.f * 2.01 }), 60);
  }

  update(dt) {
    for (const b of this.bells) {
      b.v += (-b.a * 6 - b.v * 0.6) * dt;
      b.a += b.v * dt;
      b.pivot.rotation.x = b.a * 0.45;
    }
  }

  dispose() { this.group.removeFromParent(); }
}

// ============================================================================ Kerzenweg

export class Kerzenweg {
  constructor(scene, pool, points) {
    this.pool = pool;
    this.group = new THREE.Group();
    this.candles = [];
    const wax = new THREE.MeshStandardMaterial({ color: 0xece2cc, roughness: 0.6, emissive: 0xffc070, emissiveIntensity: 0.05 });
    for (const [x, z] of points) {
      const h = 0.2 + Math.random() * 0.18;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, h, 8), wax);
      c.position.set(x, h / 2, z);
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), color: 0xffd08a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
      fl.scale.set(0.07, 0.14, 1); fl.position.set(x, h + 0.06, z);
      const glow = sprite(0xffa050, 0.35, 0); glow.position.copy(fl.position);
      this.group.add(c, fl, glow);
      this.candles.push({ fl, glow, lit: 0, target: 0, ph: Math.random() * 10, x, z, h });
    }
    // wenige echte Lichter, gleichmäßig verteilt
    this.lights = [];
    const step = Math.max(1, Math.floor(points.length / 4));
    for (let i = 0; i < points.length; i += step) {
      const [x, z] = points[i];
      this.lights.push({ i, f: pool.add({ pos: new THREE.Vector3(x, 0.6, z), color: 0xffb060, intensity: 0, distance: 5, mode: 'candle', on: true, meshes: [], priority: 3 }) });
    }
    scene.add(this.group);
    this.t = 0;
  }

  // Kerzen nacheinander entzünden (sec zwischen zwei Kerzen)
  lightAll(sec = 0.35, from = 0) {
    this.candles.forEach((c, i) => setTimeout(() => { c.target = 1; if (i % 3 === 0) audio.play('flareIgnite', { pos: new THREE.Vector3(c.x, 0.3, c.z), vol: 0.06 }); }, (from + i * sec) * 1000));
  }
  out() { for (const c of this.candles) c.target = 0; }

  update(dt) {
    this.t += dt;
    for (const c of this.candles) {
      c.lit += (c.target - c.lit) * Math.min(1, dt * 3);
      const fl = 0.85 + Math.sin(this.t * 11 + c.ph) * 0.08 + Math.random() * 0.06;
      c.fl.material.opacity = c.lit;
      c.fl.scale.set(0.07 * fl, 0.14 * fl, 1);
      c.glow.material.opacity = c.lit * 0.5 * fl;
    }
    for (const L of this.lights) L.f.intensity = 2.2 * this.candles[L.i].lit;
  }

  dispose() { for (const L of this.lights) this.pool.remove(L.f); this.group.removeFromParent(); }
}

// ============================================================================ Weiße Banner

export class Banner {
  constructor(scene, x, y, z, ry, h = 5.5, w = 1.3) {
    const g = this.group = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.y = ry;
    const geo = new THREE.PlaneGeometry(w, h, 4, 12);
    geo.translate(0, -h / 2, 0);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: bannerTexture(), side: THREE.DoubleSide, roughness: 0.95, emissive: 0xfff2dc, emissiveMap: bannerTexture(), emissiveIntensity: 0.1, transparent: true, alphaTest: 0.3 }));
    this.mesh.scale.y = 0.001;
    this.mesh.castShadow = true;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, w + 0.3, 6), mat('brass')); rod.rotation.z = Math.PI / 2;
    g.add(this.mesh, rod);
    scene.add(g);
    this.k = 0; this.target = 0; this.t = Math.random() * 10; this.h = h;
    this.base = geo.attributes.position.array.slice();
  }
  unroll() { this.target = 1; }
  update(dt) {
    this.t += dt;
    this.k += (this.target - this.k) * Math.min(1, dt * 0.9);
    this.mesh.scale.y = Math.max(0.001, this.k);
    // leichtes Wehen
    const pos = this.mesh.geometry.attributes.position, b = this.base;
    for (let i = 0; i < pos.count; i++) { const y = b[i * 3 + 1]; pos.setZ(i, Math.sin(this.t * 1.3 + y * 0.9) * 0.05 * (-y / this.h)); }
    pos.needsUpdate = true;
  }
  dispose() { this.group.removeFromParent(); this.mesh.geometry.dispose(); }
}

// ============================================================================ Baldachin über dem Absatz

export class Baldachin {
  constructor(scene) {
    const g = this.group = new THREE.Group();
    g.position.set(0, 0, Z0 + 1.6);
    for (const [x, z] of [[-1.9, -1.1], [1.9, -1.1], [-1.9, 1.1], [1.9, 1.1]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 3.3, 8), mat('brass')); p.position.set(x, 1.65, z); p.castShadow = true; g.add(p); }
    const geo = new THREE.PlaneGeometry(4.0, 2.4, 10, 6);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, -0.25 * (1 - (x / 2) ** 2) * (1 - (y / 1.2) ** 2)); }
    geo.computeVertexNormals();
    this.cloth = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xf2ede2, roughness: 0.95, side: THREE.DoubleSide, emissive: 0xfff0d8, emissiveIntensity: 0.1 }));
    this.cloth.rotation.x = -Math.PI / 2; this.cloth.position.y = 3.3;
    g.add(this.cloth);
    g.scale.set(1, 0.001, 1);
    scene.add(g);
    this.k = 0; this.target = 0;
  }
  raise() { this.target = 1; }
  update(dt) { this.k += (this.target - this.k) * Math.min(1, dt * 1.2); this.group.scale.y = Math.max(0.001, this.k); }
  dispose() { this.group.removeFromParent(); }
}

// ============================================================================ Salzschnee

export class Salzschnee {
  constructor(scene, { x0 = -14, x1 = 14, z0 = Z0, z1 = 31, h = 12, n = 1400 } = {}) {
    const pos = new Float32Array(n * 3), sp = new Float32Array(n);
    for (let i = 0; i < n; i++) { pos[i * 3] = x0 + Math.random() * (x1 - x0); pos[i * 3 + 1] = Math.random() * h; pos[i * 3 + 2] = z0 + Math.random() * (z1 - z0); sp[i] = 0.25 + Math.random() * 0.35; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTexture(), color: 0xe8f2ff, size: 0.07, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.sp = sp; this.h = h; this.t = 0; this.k = 0; this.target = 0;
  }
  start() { this.target = 1; }
  stop() { this.target = 0; }
  update(dt) {
    this.t += dt;
    this.k += (this.target - this.k) * Math.min(1, dt * 0.5);
    this.points.material.opacity = 0.85 * this.k;
    if (this.k < 0.01) return;
    const p = this.points.geometry.attributes.position.array;
    for (let i = 0; i < this.sp.length; i++) {
      p[i * 3 + 1] -= this.sp[i] * dt;
      p[i * 3] += Math.sin(this.t * 0.7 + i) * dt * 0.06;
      if (p[i * 3 + 1] < 0) p[i * 3 + 1] += this.h;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
  dispose() { this.points.removeFromParent(); this.points.geometry.dispose(); this.points.material.dispose(); }
}

// ============================================================================ Galerie der Erwählten (im Schacht)

// Hinter den vorbeiziehenden Gittertoren stehen weiße Gestalten mit Kerzen und Nummernschildern.
// Einer dreht den Kopf mit, wenn die Kabine vorbeifährt.
export class Galerie {
  constructor(rig, { chars = ['stumm'], from = 46 } = {}) {
    this.rig = rig;
    this.next = from;
    this.pool = [];
    this.used = new Map();     // Segment → Tableau
    this.t = 0;
    for (let i = 0; i < 3; i++) this.pool.push(this._tableau(chars));
  }

  _tableau(chars) {
    const group = new THREE.Group();
    const figs = [];
    for (let i = 0; i < 3; i++) {
      const ch = new Character(chars[i % chars.length]);
      whiteRobes(ch.model, { glow: 0.32 });   // leuchten aus dem Dunkel des Schachts
      ch.play('Idle_Lantern_Loop', { fade: 0, offset: Math.random() });
      ch.update(0.01);
      ch.root.position.set(-0.95 + i * 0.95, 0, 0.6 * (i === 1 ? 1 : 0));
      ch.root.rotation.y = Math.PI;
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.15), new THREE.MeshStandardMaterial({ map: numberPlateTexture(0), roughness: 0.9, emissive: 0x302820, emissiveIntensity: 0.4 }));
      plate.position.set(0, 1.28, -0.2);
      plate.rotation.y = Math.PI;
      ch.root.add(plate);
      const flame = sprite(0xffc070, 0.22, 0.95);
      ch.root.add(flame);
      group.add(ch.root);
      figs.push({ ch, plate, flame });
    }
    group.visible = false;
    return { group, figs, seg: null };
  }

  _attach(seg) {
    const tb = this.pool.find(t => !t.seg);
    if (!tb) return;
    tb.seg = seg;
    // hinter der Öffnung (z ≈ 3,3 … 4,2), auf dem Absatzboden (0,6)
    tb.group.position.set(0, 0.6, 3.45);
    seg.group.add(tb.group);
    tb.group.visible = true;
    for (const f of tb.figs) {
      const n = Math.max(1, this.next--);
      f.plate.material.map = numberPlateTexture(n);
      f.plate.material.needsUpdate = true;
    }
    tb.watcher = tb.figs[1 + Math.floor(Math.random() * 2) % 2];
    this.used.set(seg, tb);
  }

  update(dt, camera) {
    this.t += dt;
    const segs = this.rig.segs || [];
    for (const s of segs) {
      if (s.kind !== 'landing' || this.used.has(s)) continue;
      if (s.variant === 'grille' || s.variant === 'ajar') this._attach(s);
      else if ((s.variant === 'steel' || s.variant === 'wood') && !s._knocked) {
        s._knocked = true;
        setTimeout(() => audio.play('knock', { pos: s.group.getWorldPosition(new THREE.Vector3()).setZ(2.8), vol: 0.5, n: 3 }), 400);
      }
    }
    for (const [seg, tb] of this.used) {
      if (!seg.busy || !segs.includes(seg)) { tb.group.removeFromParent(); tb.group.visible = false; tb.seg = null; this.used.delete(seg); continue; }
      for (const f of tb.figs) {
        f.flame.position.copy(f.ch.handR ? f.ch.handR.getWorldPosition(_v) : _v.set(0, 1.2, 0));
        f.ch.root.worldToLocal(f.flame.position).add(new THREE.Vector3(0, 0.12, 0));
        f.flame.scale.setScalar(0.2 + Math.sin(this.t * 10 + f.ch.root.id) * 0.02);
      }
      // der Wächter sieht der Kabine nach
      const w = tb.watcher;
      if (w) { w.ch.lookAt(camera.position, 1); w.ch.update(dt * 0.2); }
    }
  }

  dispose() {
    for (const tb of this.pool) { tb.group.removeFromParent(); }
    this.used.clear();
  }
}

// ============================================================================ Die Hände des Chors

function handGeometry() {
  const parts = [];
  const palm = new THREE.BoxGeometry(0.09, 0.02, 0.1); parts.push(palm);
  for (let i = 0; i < 4; i++) { const f = new THREE.BoxGeometry(0.016, 0.016, 0.085 - Math.abs(i - 1.5) * 0.012); f.translate(-0.033 + i * 0.022, 0, -0.09); parts.push(f); }
  const th = new THREE.BoxGeometry(0.018, 0.018, 0.06); th.rotateY(0.7); th.translate(0.055, 0, -0.02); parts.push(th);
  const arm = new THREE.BoxGeometry(0.06, 0.05, 0.5); arm.translate(0, 0, 0.3); parts.push(arm);
  return mergeGeometries(parts.map(p => p.toNonIndexed()));
}

export class ChorHaende {
  constructor(scene, n = 46) {
    this.n = n;
    const m = new THREE.MeshStandardMaterial({ color: 0xd8cfc4, roughness: 0.65, emissive: 0x1a1512, emissiveIntensity: 1 });
    this.mesh = new THREE.InstancedMesh(handGeometry(), m, n);
    this.mesh.frustumCulled = false;
    this.data = [];
    for (let i = 0; i < n; i++) this.data.push({ x: (Math.random() - 0.5) * 3.0, y: 0.35 + Math.random() * 2.3, reach: 0, target: 0, delay: Math.random() * 6, ph: Math.random() * 10, yaw: (Math.random() - 0.5) * 0.6, roll: (Math.random() - 0.5) * 2 });
    scene.add(this.mesh);
    // Gesichter im Dunkel hinter dem Gitter
    const c = mkCanvas(128, 160), g = c.getContext('2d');
    const gr = g.createRadialGradient(64, 70, 10, 64, 80, 64); gr.addColorStop(0, 'rgba(230,222,210,0.9)'); gr.addColorStop(1, 'rgba(230,222,210,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(64, 80, 44, 60, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.95)';
    for (const x of [46, 82]) { g.beginPath(); g.ellipse(x, 70, 9, 12, 0, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.ellipse(64, 112, 10, 16, 0, 0, Math.PI * 2); g.fill();
    const tex = new THREE.CanvasTexture(c);
    this.faces = [];
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, color: 0xcfc8be }));
      s.position.set((Math.random() - 0.5) * 3.4, 0.9 + Math.random() * 1.6, CAB.GATE_Z + 0.9 + Math.random() * 1.4);
      s.scale.set(0.34, 0.42, 1);
      s.userData = { k: 0, target: 0, ph: Math.random() * 10 };
      scene.add(s);
      this.faces.push(s);
    }
    this.t = 0;
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3(1, 1, 1);
    this.update(0);
  }

  reach(on = true) { for (const d of this.data) d.target = on ? 1 : 0; for (const f of this.faces) f.userData.target = on ? 1 : 0; }
  grip() { for (const d of this.data) d.target = 1.35; }

  update(dt) {
    this.t += dt;
    const zg = CAB.GATE_Z;
    for (let i = 0; i < this.n; i++) {
      const d = this.data[i];
      if (this.t > d.delay || d.target === 0) d.reach += (d.target - d.reach) * Math.min(1, dt * (0.6 + (i % 5) * 0.12));
      const wig = Math.sin(this.t * 3 + d.ph) * 0.12;
      this._p.set(d.x, d.y + Math.sin(this.t * 0.8 + d.ph) * 0.03, zg + 0.75 - d.reach * 0.55);
      this._q.setFromEuler(this._e.set(wig * 0.5, d.yaw + wig, d.roll * 0.3));
      this._s.setScalar(d.reach > 0.02 ? 1 : 0.0001);
      this._m.compose(this._p, this._q, this._s);
      this.mesh.setMatrixAt(i, this._m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    for (const f of this.faces) {
      const u = f.userData;
      u.k += (u.target - u.k) * Math.min(1, dt * 0.25);
      f.material.opacity = u.k * (0.35 + Math.sin(this.t * 0.7 + u.ph) * 0.1);
    }
  }

  dispose() { this.mesh.removeFromParent(); this.mesh.geometry.dispose(); for (const f of this.faces) f.removeFromParent(); }
}

// ============================================================================ Nachspuren im Markt

export function nachspuren(hub, state, { tally = 46, seal = false, debt = false } = {}) {
  const g = new THREE.Group();
  g.name = 'Nachspuren';
  const R = hub.group;
  // Wachsstümpfe auf dem Weg zur Neunten, verlaufenes Wachs
  if (state.flags.pk_after_visits > 0) {
    const wax = new THREE.MeshStandardMaterial({ color: 0xd8ccb2, roughness: 0.7 });
    for (let i = 0; i < 14; i++) {
      const x = (i % 2 ? 1.1 : -1.1), z = 3.0 + Math.floor(i / 2) * 0.85;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.03 + Math.random() * 0.04, 8), wax); c.position.set(x, 0.02, z); g.add(c);
      const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.09 + Math.random() * 0.06, 10), wax); puddle.rotation.x = -Math.PI / 2; puddle.position.set(x + 0.03, 0.004, z); g.add(puddle);
    }
    // Salz auf den Steinen
    const n = 500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 12; pos[i * 3 + 1] = 0.01; pos[i * 3 + 2] = 3 + Math.random() * 12; }
    const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.add(new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xdfe8ee, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false })));
    // zerrissene Bahn am Schachtkopf
    const torn = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 2.4), new THREE.MeshStandardMaterial({ map: bannerTexture(), side: THREE.DoubleSide, roughness: 0.95, transparent: true, alphaTest: 0.3 }));
    torn.position.set(3.6, 7.8, Z0 + 0.35); torn.rotation.z = 0.12; g.add(torn);
  }
  // Strichliste an der Disposition (Tafel links, Blick nach +x)
  const marks = (n) => { let s = ''; for (let i = 1; i <= n; i++) s += (i % 5 === 0 ? '/' : '|') + (i % 5 === 0 ? '  ' : ''); return s.replace(/(.{24})/g, '$1\n'); };
  const tex = chalkTexture(marks(tally), { w: 512, h: 256, size: 30 });
  const tallyM = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1 }));
  tallyM.position.set(-13.84, 3.0, 7.0); tallyM.rotation.y = Math.PI / 2;
  g.add(tallyM);
  // Siegel der Kanzlei an der Quartierstür
  if (seal) {
    const c = mkCanvas(128, 128), gc = c.getContext('2d');
    drawDialSymbol(gc, 64, 90, 46, 'rgba(240,240,236,0.85)', -0.3, 5);
    const t = new THREE.CanvasTexture(c);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshStandardMaterial({ map: t, transparent: true, depthWrite: false, roughness: 1 }));
    m.position.set(-6, 2.3, 30.7); m.rotation.y = Math.PI; g.add(m);
  }
  // Schuldbrief an der Quartierstür
  if (debt) {
    const c = mkCanvas(128, 176), gc = c.getContext('2d');
    gc.fillStyle = '#e4d8bc'; gc.fillRect(0, 0, 128, 176);
    gc.fillStyle = '#2a1a10'; gc.font = '700 14px serif'; gc.textAlign = 'center'; gc.fillText('SCHULDBRIEF', 64, 26);
    for (let i = 0; i < 9; i++) gc.fillRect(18, 44 + i * 11, 92 - (i % 3) * 12, 2);
    gc.fillStyle = '#8a1510'; gc.beginPath(); gc.arc(88, 150, 14, 0, Math.PI * 2); gc.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.44), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    m.position.set(-5.7, 1.55, 30.66); m.rotation.set(0, Math.PI, 0.04); g.add(m);
    const nail = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 5), mat('steel')); nail.rotation.x = Math.PI / 2; nail.position.set(-5.7, 1.74, 30.64); g.add(nail);
  }
  R.add(g);
  return g;
}
