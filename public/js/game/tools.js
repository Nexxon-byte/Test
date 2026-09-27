// Werkzeuge & Waffen in der Hand: Schlagen (Brechstange, Vorschlaghammer), Schießen (Salzflinte),
// Werfen (Leuchtfackel, Klapper), Salzlinie legen, Verband anlegen. Linke Maustaste benutzt,
// R lädt die Flinte nach. Jede Handlung macht Lärm – der Hörer merkt sich, woher.

import * as THREE from 'three';
import { audio } from '../audio/audio.js';
import { ui } from '../ui/ui.js';
import { buildItemModel } from './items.js';
import { glowTexture } from '../gfx/textures.js';
import { mat } from '../gfx/materials.js';
import { Builder } from '../gfx/geo.js';

const _v = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const FLARE_TIME = 45, FLARE_RADIUS = 7;

// Schlagwerte: wind = Ausholen, hitAt = Treffer, dur = ganze Bewegung
const SWINGS = {
  melee:  { kind: 'melee', hitAt: 0.16, dur: 0.42, range: 2.0, cool: 0.5, noise: 7, stamina: 0.05, heavy: false },
  hammer: { kind: 'hammer', hitAt: 0.5, dur: 0.95, range: 2.2, cool: 1.1, noise: 11, stamina: 0.18, heavy: true },
};

export class Tools {
  constructor(game) {
    this.g = game;
    this.cool = 0;
    this.act = null;          // laufende Handlung { type, t, … }
    this.flying = [];         // geworfene Dinge
    this.lights = [];         // kurze Mündungsblitze
  }

  get current() { const it = this.g.inv.current; return it && it.tool ? it : null; }

  // ---------------------------------------------------------------- Eingaben

  use() {
    const it = this.current;
    if (!it || this.cool > 0 || this.act || this.g.player.dead) return false;
    const night = this.g.mode === 'night';
    if (!night && ['gun', 'flare', 'decoy', 'salt'].includes(it.tool)) { ui.toast('Nicht hier oben. Voss sieht zu, und die Kantoren auch.'); return false; }
    switch (it.tool) {
      case 'melee': case 'hammer': this._swing(it, SWINGS[it.tool]); break;
      case 'gun': this._shoot(it); break;
      case 'flare': case 'decoy': this._throw(it); break;
      case 'salt': this._salt(it); break;
      case 'heal': this._heal(it); break;
      default: return false;
    }
    return true;
  }

  reload() {
    const it = this.current;
    if (!it || it.tool !== 'gun' || this.act) return false;
    const st = this.g.state;
    const have = st.consumables.patronen || 0;
    if ((it.data?.ammo ?? 0) >= 2) return false;
    if (have <= 0) { ui.toast('Keine Salzpatronen mehr. Voss hat welche.'); audio.play('dingWrong', { vol: 0.2 }); return false; }
    this.act = { type: 'reload', t: 0, dur: 1.3, it };
    audio.play('reload', { vol: 0.55 });
    return true;
  }

  // ---------------------------------------------------------------- Handlungen

  _swing(it, S) {
    const p = this.g.player;
    if (p.stamina < S.stamina * 0.5) { ui.toast('Zu erschöpft zum Ausholen.'); return; }
    p.stamina = Math.max(0, p.stamina - S.stamina);
    this.act = { type: 'swing', t: 0, dur: S.dur, S, hit: false, it };
    audio.play('swing', { vol: S.heavy ? 0.5 : 0.35, heavy: S.heavy });
  }

  _strike(S) {
    const g = this.g, p = g.player;
    const eye = p.eyePos;
    const fwd = p.forward(_f);
    const hits = g.director.strike(eye, fwd, { range: S.range, cone: 0.55, kind: S.kind });
    g.director.noise(p.pos.x, p.pos.z, S.noise, 'strike');
    if (hits) { audio.play('hitFlesh', { pos: _v.copy(eye).addScaledVector(fwd, 1.2), vol: S.heavy ? 0.9 : 0.6 }); p.shake = Math.max(p.shake, S.heavy ? 0.5 : 0.25); return; }
    // Wand getroffen? Dann Funken und Klang
    const end = _v.copy(eye).addScaledVector(fwd, S.range);
    if (!g.col.lineClear(eye.x, eye.z, end.x, end.z, Math.max(0.2, Math.min(eye.y, end.y))) || end.y < 0.05) {
      const at = this._firstHit(eye, fwd, S.range) || end;
      audio.play('hitMetal', { pos: at, vol: S.heavy ? 0.9 : 0.6 });
      g.sparks.burst(at.x, Math.max(0.05, at.y), at.z, S.heavy ? 18 : 10, 1.4, 0.8);
      p.shake = Math.max(p.shake, S.heavy ? 0.6 : 0.3);
    }
  }

  // Erster Aufprallpunkt entlang eines Strahls (Kollisionsboxen, Boden)
  _firstHit(origin, dir, range) {
    const g = this.g;
    for (let d = 0.2; d <= range; d += 0.15) {
      _r.copy(origin).addScaledVector(dir, d);
      if (_r.y <= 0.02) return _r.setY(0.02).clone();
      if (!g.col.pointFree(_r.x, _r.z, 0.04, _r.y - 0.04, _r.y + 0.04)) return _r.clone();
    }
    return null;
  }

  _shoot(it) {
    const g = this.g, p = g.player;
    const ammo = it.data?.ammo ?? 0;
    if (ammo <= 0) {
      audio.play('clunk', { vol: 0.3 });
      ui.hint('reload', 'R', 'Salzflinte nachladen', 5);
      return;
    }
    it.data.ammo = ammo - 1;
    this.cool = 0.85;
    this.act = { type: 'recoil', t: 0, dur: 0.45, it };
    const eye = p.eyePos;
    const fwd = p.forward(_f).clone();
    audio.play('shotgun', { pos: eye.clone().addScaledVector(fwd, 0.6), vol: 1 });
    g.director.noise(p.pos.x, p.pos.z, 35, 'shot');
    g.director.strike(eye, fwd, { range: 16, cone: 0.13, kind: 'shot', pierce: true });
    // Mündungsblitz: kurzes, helles Licht aus dem Pool
    const muzzle = eye.clone().addScaledVector(fwd, 0.9).add(_v.set(0, -0.12, 0));
    const f = g.pool.add({ pos: muzzle, color: 0xfff0d0, intensity: 40, distance: 12, mode: 'steady', on: true, meshes: [], priority: 5, isFlare: true });
    this.lights.push({ f, t: 0.07 });
    g.R.fx.flash = Math.max(g.R.fx.flash, 0.12);
    // Salzkörner: Funken am Einschlag und entlang des Strahls
    const hit = this._firstHit(eye, fwd, 16) || eye.clone().addScaledVector(fwd, 16);
    g.sparks.burst(hit.x, Math.max(0.05, hit.y), hit.z, 26, 2.2, 0.9);
    for (let k = 0.25; k < 1; k += 0.25) { const q = eye.clone().lerp(hit, k); g.sparks.burst(q.x, q.y, q.z, 3, 0.8, 0.4); }
    p.pitch = Math.min(1.4, p.pitch + 0.075);
    p.shake = Math.max(p.shake, 0.7);
    if (it.data.ammo === 0) ui.hint('reload', 'R', 'Salzflinte nachladen', 6);
  }

  _throw(it) {
    this.act = { type: 'throw', t: 0, dur: 0.5, it, released: false };
    audio.play('swing', { vol: 0.25 });
  }

  _release(it) {
    const g = this.g, p = g.player;
    // aus der Hand nehmen
    g.inv.takeCurrent();
    const eye = p.eyePos;
    const fwd = p.forward(_f).clone();
    const right = _r.crossVectors(fwd, UP).normalize().clone();
    const mesh = buildItemModel(it.type);
    mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
    const pos = eye.clone().addScaledVector(fwd, 0.45).addScaledVector(right, -0.15).add(_v.set(0, -0.15, 0));
    mesh.position.copy(pos);
    g.R.scene.add(mesh);
    const vel = fwd.clone().multiplyScalar(9.5).add(_v.set(0, 2.4, 0));
    vel.x += p.vel.x * 0.6; vel.z += p.vel.z * 0.6;
    const fly = { it, mesh, pos, vel, spin: new THREE.Vector3(Math.random() * 8 + 4, Math.random() * 4, Math.random() * 3), landed: false, settled: false, t: 0 };
    if (it.tool === 'flare') {
      g.items.remove(it.id);
      fly.flare = this._makeFlare(pos);
      audio.play('flareIgnite', { pos, vol: 0.7 });
    }
    this.flying.push(fly);
    g._updateKom();
  }

  // Brennende Fackel: Licht (bannt Fahrgäste), Glut, Funken, Knistern
  _makeFlare(pos) {
    const g = this.g;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff3a1c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.scale.setScalar(0.9);
    glow.renderOrder = 5;
    const core = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffd0a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    core.scale.setScalar(0.18);
    const grp = new THREE.Group();
    grp.add(glow, core);
    grp.position.copy(pos);
    g.R.scene.add(grp);
    const fixture = g.pool.add({ pos: pos.clone(), color: 0xff4020, intensity: 16, distance: 14, mode: 'candle', on: true, meshes: [], priority: 4, isFlare: true });
    const loop = audio.loop('flareBurn', { pos: pos.clone(), vol: 0.3 });
    const flare = {
      pos: pos.clone(), radius: FLARE_RADIUS, t: FLARE_TIME, fixture, grp, loop, sparkT: 0,
      update(dt) {
        const k = Math.min(1, flare.t / 6);   // letzte Sekunden: erlischt
        const fl = (0.8 + Math.random() * 0.35) * k;
        glow.scale.setScalar(0.8 * fl + 0.1);
        core.scale.setScalar(0.18 * fl + 0.02);
        fixture.intensity = 16 * k;
        flare.radius = FLARE_RADIUS * Math.max(0.2, k);
        flare.sparkT -= dt;
        if (flare.sparkT <= 0 && k > 0.2) { flare.sparkT = 0.12; g.sparks.burst(flare.pos.x, flare.pos.y + 0.05, flare.pos.z, 2, 0.9, 0.5); }
      },
      move(p) { flare.pos.copy(p); grp.position.copy(p); fixture.pos.copy(p); loop?.setPos(p); },
      dispose() { grp.removeFromParent(); glow.material.dispose(); core.material.dispose(); g.pool.remove(fixture); loop?.stop(0.8); },
    };
    g.director.addFlare(flare);
    return flare;
  }

  _salt(it) {
    const g = this.g, p = g.player;
    const fwd = p.forward(_f); fwd.y = 0; fwd.normalize();
    const x = p.pos.x + fwd.x * 1.0, z = p.pos.z + fwd.z * 1.0;
    if (!g.col.pointFree(x, z, 0.2, 0.05, 0.5)) { ui.toast('Hier ist kein Platz für eine Salzlinie.'); return; }
    this.act = { type: 'salt', t: 0, dur: 1.2, it, x, z, yaw: Math.atan2(fwd.x, fwd.z) };
    audio.play('saltPour', { pos: _v.set(x, 0.2, z), vol: 0.6 });
  }

  _placeSalt(a) {
    const g = this.g;
    g.inv.takeCurrent();
    g.items.remove(a.it.id);
    // Linie quer zur Blickrichtung: Häufchen, Körner, ein paar Kristalle
    const b = new Builder();
    const ax = Math.cos(a.yaw), az = -Math.sin(a.yaw);   // quer
    for (let i = 0; i < 26; i++) {
      const s = (i / 25 - 0.5) * 2.0 + (Math.random() - 0.5) * 0.08;
      const off = (Math.random() - 0.5) * 0.12;
      const px = a.x + ax * s + Math.sin(a.yaw) * off, pz = a.z + az * s + Math.cos(a.yaw) * off;
      const r = 0.035 + Math.random() * 0.04;
      b.sphere(mat('salt'), px, 0, pz, r, 6, 4, 1, 0.35 + Math.random() * 0.2, 1);
    }
    for (let i = 0; i < 8; i++) {
      const s = (Math.random() - 0.5) * 2.2;
      b.box(mat('salt'), a.x + ax * s + (Math.random() - 0.5) * 0.3, 0.01, a.z + az * s + (Math.random() - 0.5) * 0.3, 0.02, 0.02, 0.02, { ry: Math.random() * 3 });
    }
    const mesh = b.build({ castShadow: false });
    mesh.name = 'Salzlinie';
    g.R.scene.add(mesh);
    g.director.addBarrier(a.x, a.z, a.yaw, mesh);
    for (const s of g.director.swarms) s.scatterFrom(a.x, a.z, 2.5);
    g._updateKom();
  }

  _heal(it) {
    const g = this.g;
    if (g.hp >= 100) { ui.toast('Du bist unversehrt. Heb ihn dir auf.'); return; }
    this.act = { type: 'heal', t: 0, dur: 1.6, it };
    audio.play('bandage', { vol: 0.55 });
  }

  // ---------------------------------------------------------------- Takt

  update(dt) {
    const g = this.g, inv = g.inv, P = inv.pose;
    this.cool = Math.max(0, this.cool - dt);
    g.player.noCrank = this.current?.tool === 'gun';
    // Haltung zurück in die Ruhe
    for (const k of ['x', 'y', 'z', 'rx', 'ry', 'rz']) P[k] *= Math.exp(-dt * 10);

    const a = this.act;
    if (a) {
      a.t += dt;
      const k = Math.min(1, a.t / a.dur);
      if (a.type === 'swing') {
        const S = a.S, h = S.hitAt / S.dur;
        // ausholen → durchziehen → zurück
        if (k < h) { const q = k / h; P.rz = 0.55 * q; P.rx = 0.5 * q; P.y = 0.05 * q; P.x = 0.03 * q; }
        else { const q = Math.min(1, (k - h) / (1 - h)); const s = Math.sin(Math.min(1, q * 2.2) * Math.PI / 2); P.rz = 0.55 - 1.5 * s * (1 - q * 0.6); P.rx = 0.5 - 1.2 * s * (1 - q * 0.6); P.x = 0.03 + 0.18 * s * (1 - q); P.z = -0.12 * s * (1 - q); }
        if (!a.hit && a.t >= S.hitAt) { a.hit = true; this._strike(S); }
        if (k >= 1) { this.act = null; this.cool = S.cool; }
      } else if (a.type === 'recoil') {
        P.z = 0.09 * (1 - k); P.rx = 0.25 * (1 - k) * (1 - k);
        if (k >= 1) this.act = null;
      } else if (a.type === 'reload') {
        P.rx = -0.5 * Math.sin(k * Math.PI); P.y = -0.08 * Math.sin(k * Math.PI);
        if (k >= 1) {
          const st = g.state, it = a.it;
          const need = 2 - (it.data?.ammo ?? 0), take = Math.min(need, st.consumables.patronen || 0);
          it.data.ammo += take; st.consumables.patronen -= take;
          this.act = null;
        }
      } else if (a.type === 'throw') {
        P.rx = k < 0.35 ? 0.9 * (k / 0.35) : 0.9 - 2 * (k - 0.35); P.y = 0.06 * Math.sin(k * Math.PI);
        if (!a.released && k >= 0.35) { a.released = true; this._release(a.it); }
        if (k >= 1) { this.act = null; this.cool = 0.4; }
      } else if (a.type === 'salt') {
        P.rx = -0.7 * Math.sin(k * Math.PI); P.y = -0.12 * Math.sin(k * Math.PI);
        if (!a.placed && k >= 0.45) { a.placed = true; this._placeSalt(a); }
        if (k >= 1) this.act = null;
      } else if (a.type === 'heal') {
        P.rx = -0.4 * Math.sin(k * Math.PI); P.y = -0.1 * Math.sin(k * Math.PI);
        if (k >= 1) {
          g.inv.takeCurrent(); g.items.remove(a.it.id);
          const healed = g.heal(35);
          ui.toast(`Verband angelegt · +${Math.round(healed)} LP`);
          g._updateKom();
          this.act = null;
        }
      }
    }

    // Mündungsblitze verlöschen
    for (const l of this.lights) { l.t -= dt; if (l.t <= 0) g.pool.remove(l.f); }
    this.lights = this.lights.filter(l => l.t > 0);

    // Geworfenes fliegt
    for (const f of this.flying) this._fly(f, dt);
    this.flying = this.flying.filter(f => !f.done);
  }

  _fly(f, dt) {
    const g = this.g;
    f.t += dt;
    if (!f.settled) {
      f.vel.y -= 9.8 * dt;
      const nx = f.pos.x + f.vel.x * dt, ny = f.pos.y + f.vel.y * dt, nz = f.pos.z + f.vel.z * dt;
      // Wände/Möbel: abprallen
      if (!g.col.pointFree(nx, nz, 0.06, ny - 0.05, ny + 0.05)) {
        const fx = g.col.pointFree(nx, f.pos.z, 0.06, ny - 0.05, ny + 0.05), fz = g.col.pointFree(f.pos.x, nz, 0.06, ny - 0.05, ny + 0.05);
        if (!fx) f.vel.x *= -0.35;
        if (!fz) f.vel.z *= -0.35;
        if (fx && fz) { f.vel.x *= -0.35; f.vel.z *= -0.35; }
        this._clatter(f);
      } else { f.pos.x = nx; f.pos.z = nz; }
      f.pos.y = ny;
      if (f.pos.y <= 0.04) {
        f.pos.y = 0.04;
        if (!f.landed) { f.landed = true; this._land(f); }
        else this._clatter(f);
        f.vel.y = Math.abs(f.vel.y) * 0.28;
        f.vel.x *= 0.5; f.vel.z *= 0.5;
        if (Math.hypot(f.vel.x, f.vel.y, f.vel.z) < 0.7) { f.settled = true; f.vel.set(0, 0, 0); this._settle(f); }
      }
      f.mesh.position.copy(f.pos);
      f.mesh.rotation.x += f.spin.x * dt; f.mesh.rotation.y += f.spin.y * dt; f.mesh.rotation.z += f.spin.z * dt;
      f.flare?.move(f.pos);
    }
    // Klapper: rasselt eine Weile, dann liegt sie wieder zum Aufheben da
    if (f.rattle) {
      f.rattle.t -= dt;
      f.rattle.k -= dt;
      if (f.rattle.k <= 0) {
        f.rattle.k = 0.7;
        audio.play('rattle', { pos: f.pos.clone().setY(0.2), vol: 0.8, dur: 0.6 });
        g.director.noise(f.pos.x, f.pos.z, 22, 'decoy');
      }
      if (f.rattle.t <= 0) {
        f.mesh.removeFromParent();
        g.items.drop(f.it, f.pos.x, 0, f.pos.z, Math.random() * 6);
        if (!f.it.entry || !g.interact.list.has(f.it.entry)) g._itemEntry(f.it);
        f.done = true;
      }
    } else if (f.settled && !f.flare) {
      f.done = true;
    } else if (f.flare && (f.flare.dead || f.flare.t <= 0)) {
      f.mesh.removeFromParent();
      f.done = true;
    }
  }

  _clatter(f) {
    if ((f._clT || 0) > f.t) return;
    f._clT = f.t + 0.12;
    audio.play(f.it.tool === 'decoy' ? 'rattle' : 'clunk', { pos: f.pos.clone(), vol: 0.25, dur: 0.2 });
  }

  _land(f) {
    this._clatter(f);
    this.g.director.noise(f.pos.x, f.pos.z, f.it.tool === 'decoy' ? 22 : 6, f.it.tool === 'decoy' ? 'decoy' : 'drop');
  }

  _settle(f) {
    f.mesh.rotation.set(f.it.tool === 'flare' ? Math.PI / 2 : 0, Math.random() * 6, 0);
    if (f.it.tool === 'decoy') f.rattle = { t: 8, k: 0 };
  }

  // Nacht vorbei: alles Geworfene aufräumen
  clear() {
    for (const f of this.flying) { f.mesh.removeFromParent(); if (f.it.holder) this.g.items.remove(f.it.id); }
    this.flying = [];
    for (const l of this.lights) this.g.pool.remove(l.f);
    this.lights = [];
    this.act = null;
  }
}
