// Rattenschwarm: messingäugige Ratten (Poly Haven „street_rat“, instanziert). Sie nagen an Kabeln
// (Leuchten flackern und sterben), beißen im Dunkeln und fliehen vor Licht und Salz.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture } from '../../gfx/textures.js';
import { audio } from '../../audio/audio.js';

const SCALE = 1;            // Modell in echter Größe: ~20 cm Körper + 18 cm Schwanz
const EYE_F = 0.112, EYE_Y = 0.05, EYE_S = 0.014;   // Augen relativ zur Rattenmitte
const BITE = 5;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _qDead = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI * 0.9);   // tot: auf dem Rücken
let proto = null;

// Low-Poly-Ratte (~450 Dreiecke statt 57 000 des Scans): Rumpf, Hinterteil, spitzer Kopf, Ohren,
// Beinchen, hängender Schwanz. Farbe per Vertex – Fell graubraun, Ohren/Schwanz/Pfoten fahlrosa.
// Nase zeigt nach +Z, Boden = 0.
function ratProto() {
  if (proto) return proto;
  const FUR = new THREE.Color(0x3a312a), BELLY = new THREE.Color(0x5a4c40), SKIN = new THREE.Color(0x8a6660), NOSE = new THREE.Color(0x201515);
  const parts = [];
  const add = (geo, color) => {
    geo = geo.toNonIndexed();
    const n = geo.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const k = 0.85 + Math.random() * 0.3; c[i * 3] = color.r * k; c[i * 3 + 1] = color.g * k; c[i * 3 + 2] = color.b * k; }
    geo.setAttribute('color', new THREE.BufferAttribute(c, 3));
    geo.deleteAttribute('uv');
    parts.push(geo);
  };
  add(new THREE.SphereGeometry(1, 10, 7).scale(0.042, 0.036, 0.08).translate(0, 0.042, 0.01), FUR);            // Rumpf
  add(new THREE.SphereGeometry(1, 10, 7).scale(0.05, 0.042, 0.055).translate(0, 0.045, -0.045), FUR);          // Hinterteil
  add(new THREE.SphereGeometry(1, 8, 5).scale(0.034, 0.018, 0.07).translate(0, 0.025, 0.0), BELLY);             // Bauch
  add(new THREE.ConeGeometry(0.03, 0.075, 8).rotateX(Math.PI / 2).translate(0, 0.048, 0.1), FUR);              // Kopf
  add(new THREE.SphereGeometry(0.009, 6, 4).translate(0, 0.046, 0.138), NOSE);                                  // Nase
  for (const s of [-1, 1]) {
    add(new THREE.CircleGeometry(0.014, 8).rotateY(s * 0.5).translate(s * 0.02, 0.07, 0.085), SKIN);           // Ohren
    add(new THREE.CylinderGeometry(0.006, 0.005, 0.03, 5).translate(s * 0.026, 0.015, 0.05), SKIN);            // Vorderbeine
    add(new THREE.CylinderGeometry(0.009, 0.006, 0.032, 5).translate(s * 0.03, 0.016, -0.055), SKIN);          // Hinterbeine
  }
  // Schwanz: drei verjüngte Glieder, erst waagrecht, dann auf den Boden gesenkt
  const tail = [[0, 0.04, -0.1, 0.008, 0.006, 0.07, 0.35], [0, 0.022, -0.165, 0.006, 0.004, 0.07, 0.15], [0.012, 0.012, -0.23, 0.004, 0.002, 0.07, 0.05]];
  for (const [x, y, z, r1, r2, len, tilt] of tail) add(new THREE.CylinderGeometry(r2, r1, len, 5).rotateX(Math.PI / 2 - tilt).translate(x, y, z), SKIN);
  const geo = mergeGeometries(parts, false);
  geo.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0 });
  proto = { geo, material, base: new THREE.Matrix4() };
  return proto;
}

// Für das Vorkompilieren der Shader: eine einzelne Ratte (gleiches Material wie der Schwarm)
export function ratWarmupMesh() {
  const P = ratProto();
  return new THREE.Mesh(P.geo, P.material);
}

export class RatSwarm {
  constructor(director, x, z, count = 10) {
    this.d = director;
    this.count = count;
    this.nest = new THREE.Vector3(x, 0, z);
    this.center = new THREE.Vector3(x, 0, z);
    this.mode = 'nest';
    this.modeT = 0;
    this.biteT = 0;
    this.squeakT = 1;
    this.gnawT = 12 + Math.random() * 15;
    this.gnawed = new Map();      // Leuchte → Anzahl Bisse
    this.lightT = 0;
    this.lit = false;
    const P = ratProto();
    this.mesh = new THREE.InstancedMesh(P.geo, P.material, count);
    this.mesh.castShadow = false;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.name = 'Ratten';
    // Augen: zwei Glühpunkte je Ratte
    const eyeGeo = new THREE.BufferGeometry();
    this.eyePos = new Float32Array(count * 2 * 3);
    eyeGeo.setAttribute('position', new THREE.BufferAttribute(this.eyePos, 3));
    this.eyes = new THREE.Points(eyeGeo, new THREE.PointsMaterial({ map: glowTexture(), color: 0xffd070, size: 0.065, sizeAttenuation: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.eyes.frustumCulled = false;
    this.rats = [];
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * 1.2;
      this.rats.push({
        pos: new THREE.Vector3(x + Math.cos(a) * r, 0, z + Math.sin(a) * r), yaw: Math.random() * 6.28, alive: true,
        goal: new THREE.Vector3(x, 0, z), t: Math.random() * 2, speed: 0, size: 0.85 + Math.random() * 0.35, hop: Math.random() * 6,
        blink: Math.random() * 5,
      });
    }
    director.R.scene.add(this.mesh, this.eyes);
    this._write();
  }

  get alive() { return this.rats.some(r => r.alive); }
  get aliveCount() { return this.rats.filter(r => r.alive).length; }

  dispose() {
    this.mesh.removeFromParent();
    this.eyes.removeFromParent();
    this.mesh.dispose();
    this.eyes.geometry.dispose();
    this.eyes.material.dispose();
    for (const f of this.gnawed.keys()) if (f._ratMode) { f.mode = f._ratMode; delete f._ratMode; }
  }

  // ---------------------------------------------------------------- Treffer

  // Schlag/Schuss: tötet Ratten im Kegel
  strike(origin, dir, range, cone, kind) {
    let n = 0;
    const max = kind === 'shot' || kind === 'cannon' ? 99 : kind === 'hammer' ? 4 : 3;
    for (const r of this.rats) {
      if (!r.alive || n >= max) continue;
      _v.set(r.pos.x, origin.y, r.pos.z).sub(origin);
      const d = _v.length();
      if (d > range + 0.4) continue;
      // Ratten sind am Boden: horizontaler Kegel, etwas großzügiger
      const flat = _p.set(_v.x, 0, _v.z).normalize();
      const fd = _s.set(dir.x, 0, dir.z).normalize();
      if (d > 0.6 && flat.dot(fd) < Math.cos(cone + 0.25)) continue;
      this._kill(r);
      n++;
    }
    if (n) { this.mode = 'flee'; this.modeT = 0; }
    return n;
  }

  // Salz, Kanone, Explosion: wegscheuchen (oder töten)
  scatterFrom(x, z, radius, kill = false) {
    let any = false;
    for (const r of this.rats) {
      if (!r.alive) continue;
      if (Math.hypot(r.pos.x - x, r.pos.z - z) < radius) { any = true; if (kill) this._kill(r); }
    }
    if (any) { this.mode = 'flee'; this.modeT = 0; this._fleeFrom = new THREE.Vector3(x, 0, z); }
  }

  _kill(r) {
    r.alive = false;
    audio.play('ratSqueak', { pos: r.pos.clone().setY(0.1), vol: 0.8, dying: true });
  }

  // ---------------------------------------------------------------- Takt

  update(dt) {
    const d = this.d, p = d.player;
    this._dt = dt;
    this.modeT += dt;
    this.biteT -= dt;
    // Schwarmmitte
    let n = 0;
    this.center.set(0, 0, 0);
    for (const r of this.rats) if (r.alive) { this.center.add(r.pos); n++; }
    if (!n) { this._write(); return; }
    this.center.divideScalar(n);
    const dist = Math.hypot(p.pos.x - this.center.x, p.pos.z - this.center.z);

    // Licht auf dem Schwarm? (seltener prüfen)
    this.lightT -= dt;
    if (this.lightT <= 0) {
      this.lightT = 0.15;
      // Licht auf dem Schwarm – oder die Lampe leuchtet vor die eigenen Füße
      this.lit = d.lightAt(_v.set(this.center.x, 0.15, this.center.z)).lit
        || ((p.lampLevel ?? 0) > 0.3 && dist < 2.6 && p.pitch < -0.45);
    }

    // Moduswechsel
    if (this.mode === 'nest') {
      if (!p.dead && dist < 7 && !this.lit && !d.elev.contains(p.pos)) { this.mode = 'swarm'; this.modeT = 0; audio.play('ratSqueak', { pos: this.center.clone().setY(0.1), vol: 0.9, n: 5 }); d.firstSight('rats'); }
      this._gnaw(dt);
    } else if (this.mode === 'swarm') {
      if (this.lit && this.modeT > 0.3) { this.mode = 'flee'; this.modeT = 0; this._fleeFrom = p.pos.clone(); }
      else if (this.modeT > 9 || p.dead || dist > 14 || d.elev.contains(p.pos, -0.5)) { this.mode = 'nest'; this.modeT = 0; }
    } else if (this.mode === 'flee') {
      if (this.modeT > 2.5) { this.mode = 'nest'; this.modeT = 0; this._fleeFrom = null; }
    }

    // Quieken & Trippeln
    this.squeakT -= dt;
    if (this.squeakT <= 0 && dist < 16) {
      this.squeakT = this.mode === 'nest' ? 3 + Math.random() * 5 : 0.6 + Math.random();
      audio.play(Math.random() < 0.6 ? 'ratSqueak' : 'ratScurry', { pos: this.center.clone().setY(0.1), vol: this.mode === 'nest' ? 0.35 : 0.6 });
    }

    // Einzelne Ratten
    for (const r of this.rats) {
      if (!r.alive) continue;
      r.t -= dt;
      let speed = 0.4;
      if (this.mode === 'nest') {
        if (r.t <= 0) {
          r.t = 0.6 + Math.random() * 2.5;
          const a = Math.random() * Math.PI * 2, rr = Math.random() * 1.6;
          r.goal.set(this.nest.x + Math.cos(a) * rr, 0, this.nest.z + Math.sin(a) * rr);
          r.speed = Math.random() < 0.3 ? 1.6 : 0.5;
        }
        speed = r.speed;
      } else if (this.mode === 'swarm') {
        r.goal.set(p.pos.x + Math.sin(r.hop * 3) * 0.3, 0, p.pos.z + Math.cos(r.hop * 3) * 0.3);
        speed = 3.1 + r.size;
        // Biss
        if (Math.hypot(p.pos.x - r.pos.x, p.pos.z - r.pos.z) < 0.5 && this.biteT <= 0) {
          this.biteT = 0.7;
          d.hurt(BITE, this, 'rat');
          audio.play('bite', { pos: r.pos.clone().setY(0.2), vol: 0.5, small: true });
        }
      } else {
        const f = this._fleeFrom || p.pos;
        _v.set(r.pos.x - f.x, 0, r.pos.z - f.z).normalize();
        r.goal.set(r.pos.x + _v.x * 3, 0, r.pos.z + _v.z * 3);
        speed = 3.6;
      }
      const dx = r.goal.x - r.pos.x, dz = r.goal.z - r.pos.z, dl = Math.hypot(dx, dz);
      if (dl > 0.05) {
        const s = Math.min(dl, speed * dt);
        r.pos.x += dx / dl * s; r.pos.z += dz / dl * s;
        d.col.resolveCircle(r.pos, 0.07, 0.02, 0.3);
        // Salzlinie meiden
        const b = d.blockedByBarrier(r.pos.x, r.pos.z, 0.1);
        if (b) { _v.set(r.pos.x - b.x, 0, r.pos.z - b.z).normalize(); r.pos.x += _v.x * s * 2; r.pos.z += _v.z * s * 2; }
        let ty = Math.atan2(dx, dz), dy = ty - r.yaw;
        while (dy > Math.PI) dy -= Math.PI * 2;
        while (dy < -Math.PI) dy += Math.PI * 2;
        r.yaw += dy * Math.min(1, dt * 12);
        r.hop += dt * speed * 9;
      }
    }
    this._write();
  }

  // Nagen an Kabeln: eine nahe Leuchte flackert, nach dem dritten Mal stirbt sie
  _gnaw(dt) {
    this.gnawT -= dt;
    if (this.gnawT > 0) return;
    this.gnawT = 18 + Math.random() * 20;
    let best = null, bd = 7;
    for (const f of this.d.game.pool.fixtures) {
      if (!f.on || f.mode === 'candle' || f.isFlare) continue;
      const dd = Math.hypot(f.pos.x - this.nest.x, f.pos.z - this.nest.z);
      if (dd < bd) { bd = dd; best = f; }
    }
    if (!best) return;
    const n = (this.gnawed.get(best) || 0) + 1;
    this.gnawed.set(best, n);
    audio.play('sparks', { pos: best.pos, vol: 0.4 });
    this.d.game.sparks.burst(best.pos.x, best.pos.y, best.pos.z, 10, 1, 1);
    if (n >= 3) { best.on = false; audio.play('lightBurst', { pos: best.pos, vol: 0.5 }); return; }
    if (!best._ratMode) best._ratMode = best.mode;
    best.mode = 'dying';
    setTimeout(() => { if (best._ratMode && best.on) { best.mode = best._ratMode; delete best._ratMode; } }, 6000);
  }

  // Matrizen und Augen schreiben
  _write() {
    const base = ratProto().base;
    let i = 0;
    for (const r of this.rats) {
      const k = SCALE * r.size;
      const bob = r.alive ? Math.abs(Math.sin(r.hop)) * 0.008 : 0;
      _q.setFromAxisAngle(_up, r.yaw);
      if (!r.alive) _q.multiply(_qDead);
      _p.set(r.pos.x, bob + (r.alive ? 0 : 0.085 * k), r.pos.z);
      _s.setScalar(k);
      _m.compose(_p, _q, _s).multiply(base);
      this.mesh.setMatrixAt(i, _m);
      // Augen (nach vorn = +Z des Modells)
      const fx = Math.sin(r.yaw), fz = Math.cos(r.yaw), sx = Math.cos(r.yaw), sz = -Math.sin(r.yaw);
      // gelegentliches Blinzeln (Augen kurz unter den Boden)
      r.blink -= this._dt || 0.016;
      if (r.blink < -0.12) r.blink = 2 + Math.random() * 6;
      const shut = r.blink < 0 || !r.alive;
      const ex = r.pos.x + fx * EYE_F * k, ez = r.pos.z + fz * EYE_F * k, ey = shut ? -1 : EYE_Y * k + bob;
      const o = i * 6;
      this.eyePos[o] = ex + sx * EYE_S * k; this.eyePos[o + 1] = ey; this.eyePos[o + 2] = ez + sz * EYE_S * k;
      this.eyePos[o + 3] = ex - sx * EYE_S * k; this.eyePos[o + 4] = ey; this.eyePos[o + 5] = ez - sz * EYE_S * k;
      i++;
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    this.eyes.geometry.attributes.position.needsUpdate = true;
  }
}

