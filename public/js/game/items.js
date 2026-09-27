// Bergegut (Beute) & Werkzeuge: Daten, Modelle, Weltobjekte.

import * as THREE from 'three';
import { Builder, sphereGeometry, coneGeometry, cylGeometry, boxGeometry } from '../gfx/geo.js';
import { mat, glowMat } from '../gfx/materials.js';
import { glowTexture, iconTexture } from '../gfx/textures.js';

// value: Grundwert-Spanne (Marken) · weight: kg · two: beide Hände
export const LOOT = {
  walze:      { name: 'Stimmwalze', value: [10, 28], weight: 1, desc: 'Eine Wachswalze aus dem Zehnt. Irgendwer hat hineingesprochen.' },
  zehntbuch:  { name: 'Zehntbuch', value: [8, 22], weight: 1.5, desc: 'Namen, Daten, Stimmanteile. Die Kantorei will jedes zurück.' },
  leuchter:   { name: 'Messingleuchter', value: [18, 40], weight: 3, desc: 'Kirchenmessing. Riecht nach Wachs und Angst.' },
  zelle:      { name: 'Relaiszelle', value: [30, 55], weight: 2, glow: 0xffa040, desc: 'Glimmt bernsteinfarben. In jeder steckt ein wenig Zehnt.' },
  zahnrad:    { name: 'Zahnradwerk', value: [22, 48], weight: 4, desc: 'Das Herz einer toten Maschine.' },
  ikone:      { name: 'Heiligenikone', value: [35, 70], weight: 2.5, desc: 'Der Erbauer, in Gold. Das Gesicht ist ausgespart.' },
  spule:      { name: 'Kupferspule', value: [14, 34], weight: 3, desc: 'Kupfer ist Kupfer. Auch unter der Stadt.' },
  weihrauch:  { name: 'Weihrauchfass', value: [26, 52], weight: 2, desc: 'Schwenkt man es, riecht es nach Sonntag.' },
  schaedel:   { name: 'Brudersschädel', value: [16, 44], weight: 2, desc: 'Ein Bruder vom Seil. Er hat die Stadt oben gehalten.' },
  zifferblatt:{ name: 'Messing-Zifferblatt', value: [70, 130], weight: 9, two: true, desc: 'Das heilige Symbol, groß wie ein Wagenrad.' },
  schrein:    { name: 'Reliquienschrein', value: [90, 170], weight: 11, two: true, desc: 'Etwas darin klopft. Zweimal. Dann nicht mehr.' },
  kelch:      { name: 'Silberkelch', value: [40, 80], weight: 1.5, desc: 'Aus ihm tranken die Vierzig. Er ist nie ganz trocken.' },
  roehre:     { name: 'Nixie-Röhre', value: [20, 42], weight: 0.8, glow: 0xff7a2a, desc: 'Zeigt eine Zahl, auch ohne Strom.' },
  salzkristall:{ name: 'Salzkristall', value: [18, 60], weight: 3, glow: 0xa8d8ff, desc: 'Er summt, wenn man ihn ans Ohr hält.' },
  handy:      { name: 'Glasziegel der Alten Welt', value: [60, 180], weight: 0.4, desc: 'Ein flacher, schwarzer Stein aus der Zeit vor der Flut. Man sagt, die Menschen hätten hineingesprochen.' },
};

// Welche Beute wo liegt: [id, Gewichtung]
export const SPAWN = {
  dock:        [['zahnrad', 3], ['spule', 4], ['zelle', 2], ['leuchter', 1], ['zehntbuch', 1], ['roehre', 2], ['zifferblatt', 0.5]],
  scriptorium: [['walze', 6], ['zehntbuch', 5], ['ikone', 2], ['leuchter', 2], ['roehre', 1], ['zelle', 1], ['schrein', 0.4]],
  banquet:     [['kelch', 4], ['leuchter', 4], ['ikone', 2], ['weihrauch', 2], ['schrein', 0.6], ['zifferblatt', 0.3]],
  ossuary:     [['schaedel', 6], ['leuchter', 3], ['weihrauch', 2], ['ikone', 1], ['schrein', 0.6]],
  mine:        [['salzkristall', 6], ['zahnrad', 2], ['zelle', 2], ['spule', 2]],
  default:     [['zahnrad', 2], ['walze', 2], ['leuchter', 2], ['zelle', 1]],
};

// Wertfaktor je Tiefenstufe
export const TIER_VALUE = [1, 1, 1.6, 2.4, 3.4, 4.8, 7];

// ----------------------------------------------------------------------------
// Modelle
// ----------------------------------------------------------------------------

const MODELS = {
  walze(b) { b.cyl(mat('brassDark'), 0, 0, 0, 0.06, 0.06, 0.22, 12); b.cyl(mat('bone'), 0, 0.02, 0, 0.055, 0.055, 0.18, 12); },
  zehntbuch(b) { b.box(mat('leather'), 0, 0.03, 0, 0.2, 0.06, 0.28); b.box(mat('paper'), 0.005, 0.03, 0, 0.19, 0.05, 0.27); b.box(mat('gold'), 0, 0.061, 0, 0.06, 0.002, 0.06); },
  leuchter(b) { b.cyl(mat('brass'), 0, 0, 0, 0.1, 0.12, 0.04, 10); b.cyl(mat('brass'), 0, 0.04, 0, 0.02, 0.025, 0.4, 8); b.cyl(mat('brass'), 0, 0.42, 0, 0.06, 0.03, 0.05, 10); b.cyl(mat('bone'), 0, 0.46, 0, 0.018, 0.018, 0.12, 6); },
  zelle(b) { b.cyl(mat('brassDark'), 0, 0, 0, 0.07, 0.07, 0.04, 10); b.cyl(glowMat(0xffa040, 2.2, 'cellGlow'), 0, 0.04, 0, 0.055, 0.055, 0.2, 10); b.cyl(mat('brassDark'), 0, 0.24, 0, 0.07, 0.07, 0.04, 10); for (let i = 0; i < 3; i++) b.box(mat('brassDark'), Math.cos(i * 2.1) * 0.06, 0.14, Math.sin(i * 2.1) * 0.06, 0.012, 0.2, 0.012); },
  zahnrad(b) { b.cyl(mat('rust'), 0, 0, 0, 0.2, 0.2, 0.06, 16); b.cyl(mat('steel'), 0.12, 0.06, 0.05, 0.1, 0.1, 0.05, 12); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.box(mat('rust'), Math.cos(a) * 0.22, 0.03, Math.sin(a) * 0.22, 0.06, 0.06, 0.04, { ry: -a }); } },
  ikone(b, g) { b.box(mat('gold'), 0, 0.2, 0, 0.26, 0.38, 0.03); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.33), new THREE.MeshStandardMaterial({ map: iconTexture('erbauer'), roughness: 0.5, metalness: 0.3 })); p.position.set(0, 0.2, 0.017); g.add(p); },
  spule(b) { b.cyl(mat('rust'), 0, 0, 0, 0.14, 0.14, 0.03, 12); b.cyl(mat('brass'), 0, 0.03, 0, 0.1, 0.1, 0.22, 14); b.cyl(mat('rust'), 0, 0.25, 0, 0.14, 0.14, 0.03, 12); },
  weihrauch(b) { b.sphere(mat('brass'), 0, 0.12, 0, 0.1, 10, 8, 1, 0.8, 1); b.add(mat('brass'), coneGeometry(0.08, 0.1, 10), 0, 0.23, 0); for (let i = 0; i < 3; i++) b.cyl(mat('brassDark'), Math.cos(i * 2.1) * 0.05, 0.25, Math.sin(i * 2.1) * 0.05, 0.004, 0.004, 0.3, 4); },
  schaedel(b) { b.sphere(mat('bone'), 0, 0.1, 0, 0.1, 10, 8, 1, 1.1, 1.15); b.box(mat('bone'), 0, 0.03, 0.05, 0.1, 0.05, 0.1); b.sphere(mat('fabricBlack'), -0.035, 0.1, 0.1, 0.025, 6, 4); b.sphere(mat('fabricBlack'), 0.035, 0.1, 0.1, 0.025, 6, 4); },
  zifferblatt(b, g) { b.add(mat('brass'), new THREE.TorusGeometry(0.5, 0.04, 6, 24, Math.PI).toNonIndexed(), 0, 0.02, 0, 0, 0, 0); b.box(mat('brass'), 0, 0.02, 0, 1.08, 0.06, 0.06); b.box(mat('brassDark'), 0.2, 0.25, 0, 0.04, 0.5, 0.03, { rz: -0.6 }); b.box(mat('walnut'), 0, 0.2, -0.02, 1.0, 0.4, 0.02); },
  schrein(b) { b.box(mat('walnut'), 0, 0.22, 0, 0.6, 0.44, 0.4); b.box(mat('gold'), 0, 0.46, 0, 0.64, 0.05, 0.44); b.add(mat('gold'), coneGeometry(0.2, 0.2, 4), 0, 0.58, 0, 0, Math.PI / 4, 0); b.box(mat('gold'), 0, 0.22, 0.205, 0.2, 0.26, 0.01); },
  kelch(b) { b.cyl(mat('steel'), 0, 0, 0, 0.07, 0.08, 0.02, 12); b.cyl(mat('steel'), 0, 0.02, 0, 0.015, 0.02, 0.12, 8); b.cyl(mat('steel'), 0, 0.14, 0, 0.08, 0.03, 0.1, 12); },
  roehre(b) { b.cyl(mat('rubber'), 0, 0, 0, 0.04, 0.04, 0.03, 10); b.cyl(glowMat(0xff7a2a, 1.6, 'nixieGlow'), 0, 0.03, 0, 0.035, 0.035, 0.1, 10); b.sphere(glowMat(0xff7a2a, 1.6, 'nixieGlow'), 0, 0.13, 0, 0.035, 8, 6); },
  salzkristall(b) { for (let i = 0; i < 5; i++) b.add(glowMat(0xa8d8ff, 0.9, 'saltGlow'), coneGeometry(0.05 + i * 0.01, 0.3 - i * 0.03, 5), Math.cos(i * 1.3) * 0.06, 0.12, Math.sin(i * 1.3) * 0.06, Math.cos(i) * 0.3, i, Math.sin(i) * 0.3); },
  handy(b) { b.box(mat('rubber'), 0, 0.006, 0, 0.075, 0.012, 0.155); b.box(glowMat(0x0a1418, 0.4, 'screenDim'), 0, 0.013, 0, 0.068, 0.002, 0.142); },
};

export function buildItemModel(type) {
  const g = new THREE.Group();
  const b = new Builder();
  (MODELS[type] || MODELS.zahnrad)(b, g);
  const m = b.build();
  g.add(m);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// ----------------------------------------------------------------------------
// Weltobjekte
// ----------------------------------------------------------------------------

let uid = 1;
const _v = new THREE.Vector3();

export class ItemManager {
  constructor(scene) {
    this.scene = scene;
    this.items = new Map();       // id → item
    this.group = new THREE.Group();
    this.group.name = 'Bergegut';
    scene.add(this.group);
    this.shineMat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffe8b0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.time = 0;
  }

  spawn(type, x, y, z, { value = null, ry = null, id = null } = {}) {
    const def = LOOT[type];
    const it = {
      id: id ?? uid++, type, def, value: value ?? Math.round(def.value[0] + Math.random() * (def.value[1] - def.value[0])),
      weight: def.weight, two: !!def.two, holder: null,
      mesh: buildItemModel(type), pos: new THREE.Vector3(x, y, z),
    };
    if (id !== null) uid = Math.max(uid, id + 1);
    it.mesh.position.copy(it.pos);
    it.mesh.rotation.y = ry ?? Math.random() * Math.PI * 2;
    const shine = new THREE.Sprite(this.shineMat.clone());
    shine.scale.setScalar(0.35);
    shine.position.y = 0.25;
    shine.renderOrder = 4;
    it.mesh.add(shine);
    it.shine = shine;
    if (def.glow) {
      it.light = { pos: it.pos, color: def.glow };
    }
    this.group.add(it.mesh);
    this.items.set(it.id, it);
    return it;
  }

  remove(id) {
    const it = this.items.get(id);
    if (!it) return;
    it.mesh.removeFromParent();
    this.items.delete(id);
  }

  clear() {
    for (const it of this.items.values()) it.mesh.removeFromParent();
    this.items.clear();
  }

  // aufheben: aus der Welt nehmen (Modell wird von Inventar/Hand übernommen)
  take(id, holder) {
    const it = this.items.get(id);
    if (!it || it.holder) return null;
    it.holder = holder;
    it.mesh.visible = false;
    return it;
  }

  drop(it, x, y, z, ry = 0) {
    it.holder = null;
    it.pos.set(x, y, z);
    it.mesh.position.copy(it.pos);
    it.mesh.rotation.y = ry;
    it.mesh.visible = true;
    if (!this.items.has(it.id)) { this.items.set(it.id, it); this.group.add(it.mesh); }
  }

  lying() { return [...this.items.values()].filter(it => !it.holder); }

  // Schimmer: stärker, wenn die Lampe darauf zeigt
  update(dt, lampPos, lampDir, lampOn) {
    this.time += dt;
    for (const it of this.items.values()) {
      if (it.holder) continue;
      let lit = 0;
      if (lampOn > 0.05) {
        _v.subVectors(it.pos, lampPos);
        const d = _v.length();
        if (d < 18) { _v.divideScalar(d); lit = Math.max(0, (_v.dot(lampDir) - 0.9) / 0.1) * (1 - d / 18) * lampOn; }
      }
      const tw = 0.5 + 0.5 * Math.sin(this.time * 2.3 + it.id * 1.7);
      it.shine.material.opacity = 0.05 + lit * 0.8 * (0.6 + tw * 0.4);
      it.shine.scale.setScalar(0.25 + lit * 0.25);
    }
  }

  // Gegenstände im Kabinenraum (für die Abrechnung)
  inside(containsFn) {
    return this.lying().filter(it => containsFn(it.pos));
  }

  serialize() {
    return this.lying().map(it => ({ id: it.id, type: it.type, value: it.value, x: it.pos.x, y: it.pos.y, z: it.pos.z }));
  }
}

// Zufällige Beute nach Tabelle
export function pickLoot(rng, table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [id, w] of table) { r -= w; if (r <= 0) return id; }
  return table[0][0];
}
