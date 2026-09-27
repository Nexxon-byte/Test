// Grundlage aller Monster: Figur mit Verformung, Zustände, Wege über das Ebenenraster (A*),
// Bewegung mit Kollision, gedrosselte Animation für ferne Figuren.

import * as THREE from 'three';
import { Character } from '../../gfx/characters.js';
import { monsterize } from '../../gfx/monsterize.js';
import { findPath, FLOOR } from '../../world/levelgen.js';
import { mat } from '../../gfx/materials.js';

const _v = new THREE.Vector3();
let nextId = 1;

// Kleinigkeiten an den Figuren: der Sack über dem Kopf der Fahrgäste ist im Modell reines Weiß
// (ohne Textur) und strahlt im Lampenlicht – er bekommt grobes Sackleinen.
export function dressMonster(root) {
  root.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    if (/bag_on_head/i.test(o.name)) o.material = mat('burlap');
  });
}

export class Monster {
  // opts: char (Figuren-ID), profile (monsterize), radius, height
  constructor(director, { char, profile = null, radius = 0.3, height = 1.75 } = {}) {
    this.id = nextId++;
    this.d = director;
    this.type = 'monster';
    this.ch = new Character(char);
    this.root = this.ch.root;
    this.root.name = 'Monster_' + char;
    this.warp = profile ? monsterize(this.ch, profile) : null;
    this.pos = this.root.position;
    this.yaw = 0;
    this.radius = radius;
    this.height = height;
    this.state = 'idle';
    this.stateT = 0;
    this.path = null;
    this.pathI = 0;
    this.goal = new THREE.Vector3();
    this.repathT = 0;
    this.animAcc = 0;
    this.frame = Math.floor(Math.random() * 4);
    this.onScreen = false;
    this.removed = false;
    this.stuckT = 0;
    this._last = new THREE.Vector3();
    dressMonster(this.root);
    director.R.scene.add(this.root);
  }

  // ---------------------------------------------------------------- Zustand

  setState(s) {
    if (this.state === s) return;
    const prev = this.state;
    this.state = s;
    this.stateT = 0;
    this.path = null;          // neuer Zustand, neuer Weg
    this.repathT = 0;
    this.onState?.(s, prev);
  }

  place(x, z, yaw = Math.random() * Math.PI * 2) {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.root.rotation.y = yaw;
    this.path = null;
  }

  play(name, opts) { return this.ch.play(name, opts); }

  // Punkte, an denen der Spieler die Figur sehen kann (Füße, Brust, Kopf)
  sightPoints(out) {
    const h = this.height;
    out[0].set(this.pos.x, 0.3, this.pos.z);
    out[1].set(this.pos.x, h * 0.6, this.pos.z);
    out[2].set(this.pos.x, h * 0.92, this.pos.z);
    return out;
  }

  get chest() { return _v.set(this.pos.x, this.height * 0.6, this.pos.z); }

  distTo(p) { return Math.hypot(p.x - this.pos.x, p.z - this.pos.z); }

  // ---------------------------------------------------------------- Wege

  // Weg zu einem Weltpunkt über die Zellen des Rasters; gibt false zurück, wenn es keinen gibt
  pathTo(x, z) {
    const g = this.d.grid;
    if (!g) return false;
    this.goal.set(x, 0, z);
    let sx = g.cx(this.pos.x), sz = g.cz(this.pos.z);
    let tx = g.cx(x), tz = g.cz(z);
    // Ziel in der Kabine (keine Bodenzelle) → Absatz vor dem Gitter
    if (g.get(tx, tz) !== FLOOR) {
      const alt = this.d.nearestFloor(tx, tz);
      if (!alt) return false;
      [tx, tz] = alt;
    }
    if (g.get(sx, sz) !== FLOOR) {
      const alt = this.d.nearestFloor(sx, sz);
      if (alt) [sx, sz] = alt;
    }
    if (sx === tx && sz === tz) { this.path = []; this.pathI = 0; return true; }
    const p = findPath(g, sx, sz, tx, tz, 2500);
    if (!p) { this.path = null; return false; }
    this.path = p;
    this.pathI = 0;
    return true;
  }

  // Dem Weg folgen; am Ende direkt auf das Ziel zu. true = angekommen
  follow(dt, speed, arrive = 0.5) {
    if (!this.path) return true;
    // Abkürzen: nächsten Wegpunkt überspringen, wenn der übernächste frei sichtbar ist
    while (this.pathI + 1 < this.path.length) {
      const [nx, nz] = this.path[this.pathI + 1];
      if (!this.d.clearLine(this.pos.x, this.pos.z, nx, nz, this.radius)) break;
      this.pathI++;
    }
    let tx, tz;
    if (this.pathI < this.path.length) {
      [tx, tz] = this.path[this.pathI];
      if (Math.hypot(tx - this.pos.x, tz - this.pos.z) < 0.45) { this.pathI++; return false; }
      // Zielpunkt schon frei erreichbar? Dann direkt hin
      if (this.d.clearLine(this.pos.x, this.pos.z, this.goal.x, this.goal.z, this.radius)) { this.pathI = this.path.length; tx = this.goal.x; tz = this.goal.z; }
    } else { tx = this.goal.x; tz = this.goal.z; }
    const d = Math.hypot(tx - this.pos.x, tz - this.pos.z);
    if (this.pathI >= this.path.length && d < arrive) return true;
    this.stepToward(tx, tz, speed, dt);
    return false;
  }

  // Ein Schritt Richtung (tx, tz) mit Kollision; dreht die Figur weich mit
  stepToward(tx, tz, speed, dt, turnRate = 8) {
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 1e-4) return;
    const s = Math.min(d, speed * dt);
    this._last.copy(this.pos);
    this.pos.x += (dx / d) * s;
    this.pos.z += (dz / d) * s;
    this.d.col.resolveCircle(this.pos, this.radius, 0.2, 1.6);
    this.faceToward(tx, tz, dt, turnRate);
    // Festhängen erkennen → neuer Weg
    const moved = this.pos.distanceTo(this._last);
    if (moved < s * 0.25) { this.stuckT += dt; if (this.stuckT > 0.8) { this.stuckT = 0; this.repathT = 0; this.path = null; } } else this.stuckT = 0;
  }

  faceToward(tx, tz, dt, rate = 8) {
    const target = Math.atan2(tx - this.pos.x, tz - this.pos.z);
    let dy = target - this.yaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.yaw += dy * (1 - Math.exp(-rate * dt));
    this.root.rotation.y = this.yaw;
  }

  // ---------------------------------------------------------------- Takt

  update(dt) {
    this.stateT += dt;
    this.think(dt);
    this.animate(dt);
  }

  think() { /* Unterklassen */ }

  // Ferne oder unsichtbare Figuren seltener animieren (spart Rechenzeit)
  animate(dt, timeScale = 1) {
    this.frame++;
    this.animAcc += dt * timeScale;
    const cam = this.d.R.camera.position;
    const far = Math.hypot(cam.x - this.pos.x, cam.z - this.pos.z);
    const every = far > 40 ? 6 : (far > 18 && !this.onScreen) ? 3 : 1;
    if (this.frame % every !== 0) return;
    this.ch.update(this.animAcc);
    this.animAcc = 0;
    this.warp?.update(dt * every);
  }

  dispose() {
    this.removed = true;
    this.root.removeFromParent();
  }
}
