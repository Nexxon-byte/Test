// Inventar: 4 Plätze + „beide Hände“ für schwere Beute. Zeigt das gewählte Stück in der Hand.

import * as THREE from 'three';
import { buildItemModel } from './items.js';

export class Inventory {
  constructor(camera) {
    this.slots = [null, null, null, null];
    this.hands = null;        // zweihändiges Stück
    this.active = 0;
    this.cam = camera;
    this.view = new THREE.Group();
    this.view.position.set(-0.2, -0.2, -0.42);
    camera.add(this.view);
    this.viewModel = null;
    this.bob = 0;
    this.pose = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 };   // Zusatzhaltung (Schlag, Rückstoß) – setzt game/tools.js
    // Streulicht der Lampe auf dem, was man in der Hand hält (reicht nur eine Armlänge weit)
    this.fill = new THREE.PointLight(0xffe2c0, 0, 0.5, 2);
    this.fill.position.set(-0.1, 0.05, -0.18);
    camera.add(this.fill);
  }

  // Helligkeit des Streulichts (folgt der Lampe)
  setFill(level) { this.fill.intensity = this.viewModel ? 0.1 + level * 0.6 : 0; }

  get weight() {
    let w = this.hands ? this.hands.weight : 0;
    for (const s of this.slots) if (s) w += s.weight;
    return w;
  }

  // Wert des getragenen Bergeguts (Werkzeug zählt nicht)
  get value() {
    let v = this.hands ? this.hands.value : 0;
    for (const s of this.slots) if (s) v += s.value;
    return v;
  }

  get current() { return this.hands || this.slots[this.active]; }
  get full() { return this.slots.every(Boolean); }
  // Zweihändiges trägt man zusätzlich zu den Taschen – aber solange es die Hände füllt, nichts anderes
  canTake(it) { return !this.hands && (it.two || !this.full); }

  add(it) {
    if (it.two) {
      if (this.hands) return false;
      this.hands = it;
    } else {
      if (this.hands) return false;
      let i = this.slots[this.active] ? this.slots.findIndex(s => !s) : this.active;
      if (i < 0) return false;
      this.slots[i] = it;
      this.active = i;
    }
    this._refresh();
    return true;
  }

  // entfernt das aktuelle Stück und gibt es zurück
  takeCurrent() {
    let it = null;
    if (this.hands) { it = this.hands; this.hands = null; }
    else if (this.slots[this.active]) { it = this.slots[this.active]; this.slots[this.active] = null; }
    this._refresh();
    return it;
  }

  removeAll() {
    const all = [...this.slots.filter(Boolean)];
    if (this.hands) all.push(this.hands);
    this.slots = [null, null, null, null];
    this.hands = null;
    this._refresh();
    return all;
  }

  select(i) {
    if (this.hands) return;
    this.active = (i + 4) % 4;
    this._refresh();
  }

  cycle(dir) { this.select(this.active + dir); }

  _refresh() {
    if (this.viewModel) { this.viewModel.removeFromParent(); this.viewModel = null; }
    const it = this.current;
    if (!it) return;
    const m = buildItemModel(it.type);
    m.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 9; } });
    // Werkzeug: eigene Haltung (um die Mitte gedreht, auf Länge gebracht)
    const v = it.def?.view;
    if (v) {
      const box = new THREE.Box3().setFromObject(m);
      const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      const k = v.len / Math.max(0.01, size.x, size.y, size.z);
      const pivot = new THREE.Group();
      m.position.sub(c);
      pivot.add(m);
      pivot.scale.setScalar(k);
      pivot.position.set(...v.pos);
      pivot.rotation.set(...v.rot);
      this.view.add(pivot);
      this.viewModel = pivot;
      return;
    }
    // echte Modelle haben Weltmaße → auf Handgröße bringen
    let k = 1;
    if (it.def?.model) {
      const size = new THREE.Box3().setFromObject(m).getSize(new THREE.Vector3());
      k = (it.two ? 0.6 : 0.24) / Math.max(0.01, size.x, size.y, size.z);
    }
    if (it.two) { m.position.set(0.2, -0.12, -0.2); m.scale.setScalar(0.75 * k); m.rotation.set(0.35, 0.2, 0); }
    else { m.scale.setScalar(0.9 * k); m.rotation.set(0.25, 0.6, 0.1); }
    this.view.add(m);
    this.viewModel = m;
  }

  update(dt, moving) {
    this.bob += dt * (moving ? 8 : 1.5);
    const P = this.pose;
    this.view.position.set(
      -0.2 + Math.cos(this.bob * 0.5) * (moving ? 0.006 : 0.002) + P.x,
      -0.2 + Math.sin(this.bob) * (moving ? 0.008 : 0.003) + P.y,
      -0.42 + P.z);
    this.view.rotation.set(P.rx, P.ry, P.rz);
  }
}
