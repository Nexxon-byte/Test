// Der Director: Spannungskurve einer Nacht, Spawns je Tiefe/Thema, Lärm-Ereignisse,
// Licht- und Sichtprüfung für die Monster, Kabinen-Module (Flutlicht, Salzkanone, Horchgerät),
// Treffer von Waffen, Schrecken im Takt.
//   Spannung: ruhig → unruhig ab 02:50 → Jagd ab 03:00

import * as THREE from 'three';
import { FLOOR, CS } from '../../world/levelgen.js';
import { CAB } from '../../world/cab.js';
import { preloadCharacters, hasCharacter } from '../../gfx/characters.js';
import { RNG } from '../../core/rng.js';
import { audio } from '../../audio/audio.js';
import { music } from '../../audio/music.js';
import { Passenger } from './passenger.js';
import { Listener } from './listener.js';
import { RatSwarm } from './rats.js';
import { Scares } from './scares.js';

export const MONSTER_CHARS = ['gast_m', 'gast_f', 'hoerer'];

// Wer kommt wo: [min, max] je Nacht (vor dem Schwierigkeitsfaktor)
// Tiefenstufe I: Fahrgäste + Ratten · ab II: + Hörer (im Beinhaus −17 schon als Probe)
export const SPAWN_TABLE = {
  dock:        { passenger: [1, 1], rats: [1, 1], listener: [0, 0] },
  scriptorium: { passenger: [1, 2], rats: [1, 1], listener: [0, 0] },
  banquet:     { passenger: [2, 2], rats: [0, 1], listener: [0, 0] },
  ossuary:     { passenger: [1, 2], rats: [1, 2], listener: [1, 1] },
  mine:        { passenger: [1, 1], rats: [1, 2], listener: [1, 2] },
  default:     { passenger: [1, 1], rats: [1, 1], listener: [0, 0] },
};

const PARAMS = new URLSearchParams(location.search);
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _ld = new THREE.Vector3(), _lp = new THREE.Vector3();
const FLOOD_O = new THREE.Vector3(0, 2.5, CAB.FRONT - 0.3);
const FLOOD_D = new THREE.Vector3(0, -2.5, CAB.LANDING_Z + 6.5 - (CAB.FRONT - 0.3)).normalize();
const CANNON_O = new THREE.Vector3(-0.75, 2.45, 1.35);

export class Director {
  constructor(game) {
    this.game = game;
    this.R = game.R;
    this.col = game.col;
    this.elev = game.elev;
    this.player = game.player;
    this.monsters = [];
    this.swarms = [];
    this.flares = [];          // brennende Leuchtfackeln { pos, radius, t, fixture }
    this.noises = [];          // { x, z, r, t, kind }
    this.barriers = [];        // Salzlinien { x, z, r }
    this.level = null;
    this.grid = null;
    this.active = false;
    this.time = 0;
    this.tension = 0;
    this.spike = 0;            // kurzer Spannungsstoß (Schrecken)
    this.phase = 'calm';
    this.enabled = !PARAMS.has('nomonsters');
    this.cannonShots = 0;
    this._pts = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    this._radarT = 0;
    this._lightOut = { lit: false, holy: false };
    this.scares = new Scares(this);
    this.loaded = null;
  }

  // Figuren laden (während der Fahrt)
  preload() {
    if (!this.loaded) this.loaded = preloadCharacters(MONSTER_CHARS).catch(e => console.warn('Monster-Figuren fehlen', e));
    return this.loaded;
  }

  // ---------------------------------------------------------------- Nacht

  startNight(level, info, state) {
    this.clear();
    this.level = level;
    this.grid = level.grid;
    this.info = info;
    this.state = state;
    this.active = true;
    this.time = 0;
    this.tension = 0;
    this.phase = 'calm';
    this.cannonShots = this.elev.hasModule('salzkanone') ? 10 : 0;
    const rng = new RNG((info.seed ^ 0x2f17) >>> 0);
    this.rng = rng;
    const diff = { pilger: 0.7, ratte: 1, erwaehlt: 1.3 }[state.difficulty] ?? 1;
    this.diff = diff;
    const table = SPAWN_TABLE[info.themeId] || SPAWN_TABLE.default;
    const n = ([a, b]) => Math.max(0, Math.round(rng.int(a, b) * diff));
    // Spawnplan: Uhrzeit (Spielminuten) + Art
    this.plan = [];
    const tut = !!state.flags?.tutorial;
    const pc = tut ? 1 : n(table.passenger), lc = tut ? 0 : n(table.listener), rc = tut ? 1 : n(table.rats);
    for (let i = 0; i < pc; i++) this.plan.push({ at: tut ? 55 : (i === 0 ? rng.int(12, 35) : rng.int(55, 100) + i * 15), kind: 'passenger', tame: tut });
    for (let i = 0; i < lc; i++) this.plan.push({ at: rng.int(20, 45) + i * 40, kind: 'listener' });
    for (let i = 0; i < rc; i++) this.plan.push({ at: i === 0 ? 0 : rng.int(40, 90), kind: 'rats', small: tut });
    if (PARAMS.has('monsters')) {
      // Test: ?monsters=passenger,listener,rats → sofort
      this.plan = PARAMS.get('monsters').split(',').filter(Boolean).map(k => ({ at: 0, kind: k.trim() }));
    }
    this.plan.sort((a, b) => a.at - b.at);
    this.scares.startNight(rng);
  }

  clear() {
    for (const m of this.monsters) m.dispose();
    for (const s of this.swarms) s.dispose();
    for (const f of this.flares) this._removeFlare(f);
    this.monsters = [];
    this.swarms = [];
    this.flares = [];
    this.noises = [];
    for (const b of this.barriers) b.mesh?.removeFromParent();
    this.barriers = [];
    this.scares.clear();
    this.active = false;
    this.level = null;
    this.grid = null;
    this.elev.setRadarBlips([]);
    music.setChase(0);
  }

  // ---------------------------------------------------------------- Spawns

  _spawn(entry) {
    if (!this.enabled) return;
    if (entry.kind === 'rats') {
      // Ratten nisten im Dunkeln
      let cell = null;
      for (let i = 0; i < 12 && !cell; i++) {
        const c = this.spawnCell(entry.small ? 9 : 7, false);
        if (c && !this.lightAt(_v.set(c[0], 0.15, c[1])).lit) cell = c;
      }
      cell ||= this.spawnCell(7, false);
      if (!cell) return;
      const count = entry.small ? 6 : 9 + this.rng.int(0, 5);
      this.swarms.push(new RatSwarm(this, cell[0], cell[1], count));
      return;
    }
    const char = entry.kind === 'listener' ? 'hoerer' : this.rng.pick(['gast_m', 'gast_f']);
    if (!hasCharacter(char)) return;
    const cell = this.spawnCell(entry.kind === 'listener' ? 14 : 16, true);
    if (!cell) return;
    const M = entry.kind === 'listener' ? Listener : Passenger;
    const m = new M(this, char, { tame: entry.tame });
    m.place(cell[0], cell[1]);
    this.monsters.push(m);
  }

  // Zufällige ferne Bodenzelle, nicht im Blick des Spielers
  spawnCell(minDist = 12, hidden = true) {
    const cells = this.level.farCells(4);
    const p = this.player.pos;
    for (let tries = 0; tries < 60; tries++) {
      const [cx, cz] = cells[Math.floor(this.rng.next() * Math.min(cells.length, 40 + tries * 3))] || [];
      if (cx === undefined) break;
      const [x, z] = this.level.center(cx, cz);
      const px = x + this.rng.float(-0.6, 0.6), pz = z + this.rng.float(-0.6, 0.6);
      if (Math.hypot(px - p.x, pz - p.z) < minDist) continue;
      if (!this.col.pointFree(px, pz, 0.35, 0.2, 1.6)) continue;
      if (hidden && this.canSeePoint(_v.set(px, 1.2, pz))) continue;
      return [px, pz];
    }
    return null;
  }

  // Nächste Bodenzelle zu einer (Nicht-Boden-)Zelle, z. B. Kabine → Absatz
  nearestFloor(cx, cz) {
    const g = this.grid;
    let best = null, bd = 1e9;
    for (let r = 1; r <= 4 && !best; r++) {
      for (let z = cz - r; z <= cz + r; z++) for (let x = cx - r; x <= cx + r; x++) {
        if (!g.walkable(x, z)) continue;
        const d = Math.hypot(x - cx, z - cz);
        if (d < bd) { bd = d; best = [x, z]; }
      }
    }
    return best;
  }

  // Freie Strecke für eine Figur mit Radius r (Raster + Requisiten)
  clearLine(x0, z0, x1, z1, r = 0.3) {
    if (!this.grid.lineOfSight(x0, z0, x1, z1)) return false;
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz) || 1;
    const nx = -dz / len * r, nz = dx / len * r;
    return this.col.lineClear(x0 + nx, z0 + nz, x1 + nx, z1 + nz, 0.8) && this.col.lineClear(x0 - nx, z0 - nz, x1 - nx, z1 - nz, 0.8);
  }

  // ---------------------------------------------------------------- Sicht & Licht

  // Sieht der Spieler diesen Punkt (im Bild und freie Sichtlinie)?
  canSeePoint(p) {
    const cam = this.R.camera;
    _w.copy(p).project(cam);
    if (_w.z > 1 || _w.z < -1 || Math.abs(_w.x) > 1.02 || Math.abs(_w.y) > 1.02) return false;
    const e = cam.position;
    if (!this.grid.lineOfSight(e.x, e.z, p.x, p.z)) return false;
    return this.col.lineClear(e.x, e.z, p.x, p.z, Math.min(e.y, p.y) + 0.1) || this.col.lineClear(e.x, e.z, p.x, p.z, Math.max(e.y, p.y) - 0.05);
  }

  // Sieht der Spieler das Monster? (einer der Punkte Füße/Brust/Kopf)
  seen(mon) {
    if (this.player.dead || this.game.paused) return false;
    const cam = this.R.camera.position;
    const d = Math.hypot(cam.x - mon.pos.x, cam.z - mon.pos.z);
    if (d > 45) return false;
    for (const p of mon.sightPoints(this._pts)) if (this.canSeePoint(p)) return true;
    return false;
  }

  // Liegt ein Punkt im Licht? holy = Licht, das allein schon bannt (Fackel, Flutlicht)
  lightAt(p, out = this._lightOut) {
    out.lit = false; out.holy = false; out.src = null;
    const g = this.grid;
    // Leuchtfackeln
    for (const f of this.flares) {
      if (Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < f.radius && g.lineOfSight(f.pos.x, f.pos.z, p.x, p.z)) { out.lit = out.holy = true; out.src = 'flare'; return out; }
    }
    const e = this.elev;
    // Flutlicht der Kabine: Kegel auf den Absatz
    if (e.hasModule('flutlicht') && e.floodOn && e.powered) {
      _v.subVectors(p, FLOOD_O);
      const d = _v.length();
      if (d < 21 && _v.dot(FLOOD_D) / d > Math.cos(0.75) && g.lineOfSight(0, CAB.LANDING_Z + 0.3, p.x, p.z)) { out.lit = out.holy = true; out.src = 'flood'; return out; }
    }
    // Kabinenlicht
    if (e.contains(p, -0.4) && e.cabLight.intensity > 4) { out.lit = true; out.src = 'cab'; return out; }
    // Lampe des Spielers
    const pl = this.player;
    if ((pl.lampLevel ?? 0) > 0.15) {
      pl.spot.getWorldPosition(_lp);
      pl.spotTarget.getWorldPosition(_ld).sub(_lp).normalize();
      _v.subVectors(p, _lp);
      const d = _v.length();
      if (d < pl.stats.lampRange * 0.85 && _v.dot(_ld) / d > Math.cos(pl.stats.lampAngle * 1.1)
        && g.lineOfSight(_lp.x, _lp.z, p.x, p.z) && this.col.lineClear(_lp.x, _lp.z, p.x, p.z, p.y)) { out.lit = true; out.src = 'lamp'; return out; }
    }
    // Leuchten der Welt
    for (const f of this.game.pool.fixtures) {
      if (!f.on || !(f.intensity > 0.5) || (f.level ?? 1) < 0.35) continue;
      const r = f.distance * 0.5 * Math.min(1.2, Math.max(0.35, f.intensity / 6));
      const dx = f.pos.x - p.x, dz = f.pos.z - p.z;
      if (dx * dx + dz * dz > r * r) continue;
      if (g.lineOfSight(f.pos.x, f.pos.z, p.x, p.z)) { out.lit = true; out.src = f; return out; }
    }
    return out;
  }

  // ---------------------------------------------------------------- Lärm

  // Geräusch in der Welt (Radius = Hörweite in Metern)
  noise(x, z, r, kind = 'noise') {
    if (!this.active) return;
    this.noises.push({ x, z, r, t: this.time, kind });
  }

  // Lauteste hörbare Quelle für einen Zuhörer an (x, z); mult = Hörschärfe
  loudestAt(x, z, mult = 1) {
    let best = null, bestS = 0;
    const consider = (nx, nz, r, kind) => {
      let rr = r * mult;
      const d = Math.hypot(nx - x, nz - z);
      if (d > rr) return;
      if (!this.grid.lineOfSight(x, z, nx, nz)) { rr *= 0.6; if (d > rr) return; }
      const s = rr - d;
      if (s > bestS) { bestS = s; best = { x: nx, z: nz, r, kind, strength: s, dist: d }; }
    };
    for (const n of this.noises) consider(n.x, n.z, n.r, n.kind);
    const p = this.player;
    if (!p.dead && p.noise > 0) consider(p.pos.x, p.pos.z, p.noise, 'player');
    return best;
  }

  // ---------------------------------------------------------------- Kabine

  // Gitter zu und stark genug für diese Art?
  gateHolds(kind) {
    const e = this.elev;
    if (e.gateOpen > 0.2) return false;
    const lv = e.modules.panzergitter || 0;
    return kind === 'passenger' ? lv >= 1 : kind === 'listener' ? lv >= 2 : true;
  }

  // Monster rüttelt am Gitter; bricht nach einer Weile auf
  forceGate(mon, dt) {
    const e = this.elev;
    mon.gateT = (mon.gateT || 0) + dt;
    if ((mon._rattle = (mon._rattle || 0) - dt) <= 0) {
      mon._rattle = 0.45 + Math.random() * 0.3;
      audio.play('gate', { pos: _v.set(mon.pos.x, 1.4, CAB.GATE_Z + 0.2), vol: 0.35, dur: 0.4 });
      e.shake = Math.max(e.shake, 0.25);
    }
    if (mon.gateT > (mon.type === 'listener' ? 3 : 5)) {
      mon.gateT = 0;
      e.openGate();
      audio.play('slam', { pos: _v.set(mon.pos.x, 1.4, CAB.GATE_Z), vol: 0.8 });
    }
  }

  // ---------------------------------------------------------------- Waffen & Treffer

  // Nahkampf/Schuss: alle Ziele im Kegel vor dem Spieler
  // kind: 'melee' | 'hammer' | 'shot' | 'cannon' · gibt die Zahl der Treffer zurück
  strike(origin, dir, { range = 1.8, cone = 0.5, kind = 'melee', pierce = false } = {}) {
    let hits = 0;
    const cands = [];
    for (const m of this.monsters) {
      _v.set(m.pos.x, Math.min(m.height * 0.6, origin.y), m.pos.z).sub(origin);
      const d = _v.length();
      if (d > range + m.radius) continue;
      const cos = _v.dot(dir) / (d || 1);
      if (d > 0.8 && cos < Math.cos(cone)) continue;
      if (!this.grid.lineOfSight(origin.x, origin.z, m.pos.x, m.pos.z)) continue;
      cands.push([d, m]);
    }
    cands.sort((a, b) => a[0] - b[0]);
    for (const [, m] of cands) { m.hit(kind, dir); hits++; if (!pierce) break; }
    for (const s of this.swarms) hits += s.strike(origin, dir, range, cone, kind);
    return hits;
  }

  // Salzsack: Linie, die Monster nicht überqueren
  addBarrier(x, z, yaw, mesh) {
    this.barriers.push({ x, z, r: 1.1, yaw, mesh });
  }

  blockedByBarrier(x, z, r = 0.3) {
    for (const b of this.barriers) if (Math.hypot(b.x - x, b.z - z) < b.r + r) return b;
    return null;
  }

  addFlare(f) { this.flares.push(f); }
  _removeFlare(f) { f.dispose?.(); }

  // ---------------------------------------------------------------- Takt

  update(dt, clock) {
    if (!this.active) return;
    this.time += dt;
    // Lärm verklingt nach einem Augenblick
    this.noises = this.noises.filter(n => this.time - n.t < 0.6);

    // Spannung
    const phase = clock >= 180 ? 'hunt' : clock >= 170 ? 'uneasy' : 'calm';
    if (phase !== this.phase) { this.phase = phase; for (const m of this.monsters) m.onPhase?.(phase); }
    const base = phase === 'hunt' ? 0.75 : phase === 'uneasy' ? 0.45 : 0.08 + Math.min(1, clock / 170) * 0.25;

    // Spawnplan
    while (this.plan.length && this.plan[0].at <= clock) this._spawn(this.plan.shift());

    // Monster
    let near = 1e9, chase = 0;
    for (const m of this.monsters) {
      m.update(dt);
      const d = m.distTo(this.player.pos);
      near = Math.min(near, d);
      if (m.chasing) chase = Math.max(chase, 1 - Math.min(1, d / 16));
    }
    for (const s of this.swarms) s.update(dt);
    // Fackeln brennen ab
    for (const f of this.flares) {
      f.t -= dt;
      if (f.t <= 0) { f.dead = true; this._removeFlare(f); }
      else f.update?.(dt);
    }
    this.flares = this.flares.filter(f => !f.dead);

    // Spieler von festen Monstern wegschieben (man läuft nicht durch sie hindurch)
    const pp = this.player.pos;
    for (const m of this.monsters) {
      if (m.ghost) continue;
      const dx = pp.x - m.pos.x, dz = pp.z - m.pos.z, d = Math.hypot(dx, dz), min = m.radius + 0.28;
      if (d < min && d > 1e-4) { pp.x = m.pos.x + dx / d * min; pp.z = m.pos.z + dz / d * min; }
    }

    this._updateCannon(dt);
    this._updateRadar(dt);
    this.scares.update(dt, clock);

    this.spike = Math.max(0, this.spike - dt * 0.2);
    this.tension = Math.max(base, near < 20 ? (1 - near / 20) * 0.8 : 0, this.spike);
    music.setTension(this.tension);
    music.setChase(chase);
  }

  // Salzkanone: schießt selbst auf alles, was vor dem Gitter steht
  _updateCannon(dt) {
    const e = this.elev;
    if (!e.hasModule('salzkanone') || !e.powered || this.cannonShots <= 0) return;
    let target = null, bd = 9.5;
    for (const m of this.monsters) {
      if (!m.cannonTarget?.()) continue;
      if (m.pos.z < CAB.GATE_Z - 0.2) continue;
      const d = Math.hypot(m.pos.x - CANNON_O.x, m.pos.z - CANNON_O.z);
      if (d > bd) continue;
      if (Math.abs(Math.atan2(m.pos.x - CANNON_O.x, m.pos.z - CANNON_O.z)) > 1.05) continue;
      if (!this.grid.lineOfSight(0, CAB.LANDING_Z + 0.2, m.pos.x, m.pos.z)) continue;
      target = m; bd = d;
    }
    if (!target) { this._aimT = 0; return; }
    e.aimCannon(target.chest.clone());
    this._aimT = (this._aimT || 0) + dt;
    if (this._aimT < 0.45) return;
    if (e.fireCannon()) {
      this._aimT = 0;
      this.cannonShots--;
      audio.play('saltShot', { pos: _v.set(CANNON_O.x, CANNON_O.y, CANNON_O.z), vol: 0.9 });
      this.noise(0, CAB.LANDING_Z, 22, 'cannon');
      target.hit('cannon', _w.subVectors(target.pos, CANNON_O).setY(0).normalize());
      for (const s of this.swarms) s.scatterFrom(target.pos.x, target.pos.z, 3, true);
      this.game.sparks.burst(target.pos.x, 1.2, target.pos.z, 20, 2, 1.2);
    }
  }

  // Horchgerät: Monster und Mannschaft im Umkreis
  _updateRadar(dt) {
    this._radarT -= dt;
    if (this._radarT > 0) return;
    this._radarT = 0.2;
    if (!this.elev.hasModule('horchgeraet')) return;
    const list = [];
    if (!this.player.dead) list.push({ x: this.player.pos.x, z: this.player.pos.z, kind: 'crew' });
    for (const m of this.monsters) if (!m.ghost) list.push({ x: m.pos.x, z: m.pos.z, kind: 'monster' });
    for (const s of this.swarms) if (s.alive) list.push({ x: s.center.x, z: s.center.z, kind: 'monster' });
    this.elev.setRadarBlips(list);
  }

  // Schaden am Spieler (über das Spiel)
  hurt(amount, from, kind) { this.game.damage(amount, { from, kind }); }

  // Kurzbeschreibung für Tests
  debug() {
    return {
      phase: this.phase, tension: +this.tension.toFixed(2), plan: this.plan.map(p => `${p.kind}@${p.at}`),
      monsters: this.monsters.map(m => ({ type: m.type, state: m.state, frozen: !!m.frozen, x: +m.pos.x.toFixed(1), z: +m.pos.z.toFixed(1) })),
      swarms: this.swarms.map(s => ({ n: s.count, alive: s.aliveCount, x: +s.center.x.toFixed(1), z: +s.center.z.toFixed(1) })),
    };
  }
}

export { CS };
