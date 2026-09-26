// Licht-Pool: eine feste Anzahl Punktlichter (konstante Shaderkosten),
// die jedes Frame den nächsten „Leuchten“ der Welt zugewiesen werden.
// Leuchten flackern, sterben, platzen – unabhängig davon, ob sie gerade ein echtes Licht haben.

import * as THREE from 'three';

export class LightPool {
  constructor(scene, count = 8) {
    this.lights = [];
    for (let i = 0; i < count; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 10, 2);
      l.castShadow = false;
      l.userData.fixture = null;
      scene.add(l);
      this.lights.push(l);
    }
    this.fixtures = [];
    this.time = 0;
    this._tmp = new THREE.Vector3();
  }

  setCount(n) {
    for (let i = 0; i < this.lights.length; i++) this.lights[i].visible = i < n;
    this.active = n;
  }

  // fixture: { pos: Vector3, color, intensity, distance, flicker: 0..1, mode: 'steady'|'neon'|'candle'|'dying'|'strobe', on: true, meshes: [emissive meshes] }
  add(f) {
    f.on = f.on ?? true;
    f.flicker = f.flicker ?? 0;
    f.mode = f.mode ?? 'steady';
    f.level = 1;
    f.phase = Math.random() * 100;
    f.baseEmissive = (f.meshes || []).map(m => m.material?.emissiveIntensity ?? 1);
    f.distance = f.distance ?? 9;
    this.fixtures.push(f);
    return f;
  }

  clear() {
    this.fixtures.length = 0;
    for (const l of this.lights) { l.intensity = 0; l.userData.fixture = null; }
  }

  remove(f) {
    const i = this.fixtures.indexOf(f);
    if (i >= 0) this.fixtures.splice(i, 1);
  }

  // Helligkeitsfaktor einer Leuchte zum Zeitpunkt t
  _level(f, t, dt) {
    if (!f.on) return 0;
    const p = f.phase + t;
    switch (f.mode) {
      case 'candle':
        return 0.82 + Math.sin(p * 7.3) * 0.06 + Math.sin(p * 13.1) * 0.05 + (Math.random() - 0.5) * 0.06;
      case 'neon': {
        // gelegentliches Aussetzen
        f._neonT = (f._neonT ?? 0) - dt;
        if (f._neonT <= 0) {
          if (Math.random() < f.flicker * 0.08) f._neonOff = 0.04 + Math.random() * 0.25;
          f._neonT = 0.1;
        }
        if (f._neonOff > 0) { f._neonOff -= dt; return Math.random() < 0.5 ? 0.05 : 0.4; }
        return 0.97 + Math.sin(p * 120) * 0.03;
      }
      case 'dying': {
        const n = Math.sin(p * 3.1) + Math.sin(p * 7.7) * 0.6 + Math.sin(p * 17.3) * 0.4;
        if (n > 1.1) return Math.random() < 0.6 ? 0.08 : 1;
        return n > 0.6 ? 0.55 : 1;
      }
      case 'strobe':
        return (Math.sin(p * 18) > 0.3) ? 1 : 0.02;
      default:
        if (f.flicker > 0 && Math.random() < f.flicker * dt * 3) return 0.2 + Math.random() * 0.5;
        return 1;
    }
  }

  update(dt, camPos, dimAll = 1) {
    this.time += dt;
    const t = this.time;
    // Helligkeit aller Leuchten (auch ohne Licht – für Emissive)
    for (const f of this.fixtures) {
      const lv = this._level(f, t, dt) * (f.dim ?? 1);
      f.level = lv;
      if (f.meshes) {
        for (let i = 0; i < f.meshes.length; i++) {
          const m = f.meshes[i];
          if (m.material) m.material.emissiveIntensity = f.baseEmissive[i] * Math.max(0.02, lv);
        }
      }
    }
    // die nächsten Leuchten auswählen
    const n = this.active ?? this.lights.length;
    const cands = [];
    for (const f of this.fixtures) {
      if (!f.on || f.intensity <= 0) continue;
      const d = f.pos.distanceToSquared(camPos);
      if (d > (f.distance + 16) ** 2) continue;
      cands.push([d / (f.priority ?? 1), f]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < this.lights.length; i++) {
      const l = this.lights[i];
      const c = i < n ? cands[i] : null;
      if (!c) { l.intensity = 0; l.userData.fixture = null; continue; }
      const f = c[1];
      if (l.userData.fixture !== f) {
        l.userData.fixture = f;
        l.position.copy(f.pos);
        l.color.set(f.color);
        l.distance = f.distance;
      }
      l.intensity = f.intensity * f.level * dimAll;
    }
  }
}
