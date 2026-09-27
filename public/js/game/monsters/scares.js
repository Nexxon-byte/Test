// Grusel-Ereignisse: sparsam, im Takt, nie während einer Jagd. Keine Jumpscare-Flut –
// lieber das Telefon, das klingelt, wenn man gerade weit weg ist, oder jemand auf dem Stuhl,
// der eben noch leer war.

import * as THREE from 'three';
import { Character, hasCharacter } from '../../gfx/characters.js';
import { monsterize } from '../../gfx/monsterize.js';
import { dressMonster } from './base.js';
import { CAB } from '../../world/cab.js';
import { audio } from '../../audio/audio.js';
import { voice } from '../../audio/voice.js';

const _v = new THREE.Vector3();

export class Scares {
  constructor(director) {
    this.d = director;
    this.apparitions = [];
    this.ringing = null;
    this.cd = 60;
    this.log = [];
  }

  startNight(rng) {
    this.rng = rng;
    this.cd = 50 + rng.float(0, 40);
    this.used = new Map();
  }

  clear() {
    for (const a of this.apparitions) a.dispose();
    this.apparitions = [];
    this._stopPhone();
  }

  update(dt, clock) {
    const d = this.d;
    for (const a of this.apparitions) a.update(dt);
    this.apparitions = this.apparitions.filter(a => !a.gone);
    if (this.ringing) {
      this.ringing.t -= dt;
      if (this.ringing.t <= 0) this._stopPhone();
    }
    if (d.player.dead) return;
    this.cd -= dt;
    if (this.cd > 0) return;
    // nicht während einer Jagd, nicht direkt nach einem Treffer
    if (d.monsters.some(m => m.chasing && m.distTo(d.player.pos) < 14) || d.game.hurtT > 0) { this.cd = 6; return; }
    const quick = d.phase !== 'calm';
    this.cd = quick ? 35 + this.rng.float(0, 25) : 70 + this.rng.float(0, 60);
    this.trigger();
  }

  // Ein passendes Ereignis wählen (seltener Wiederholungen)
  trigger(force = null) {
    const d = this.d, p = d.player.pos;
    const inCab = d.elev.contains(p);
    const cabDist = Math.hypot(p.x, p.z - 1);
    const pool = [
      ['lamp', 3, () => !!this._nearFixture(12)],
      ['phone', 2, () => !inCab && cabDist > 8 && cabDist < 30 && !this.ringing],
      ['steps', 2, () => !inCab],
      ['whisper', 3, () => true],
      ['apparition', 2, () => hasCharacter('gast_m') && !inCab && this.apparitions.length === 0 && this._hasApparitionSpot()],
      ['gate', 2, () => hasCharacter('gast_f') && inCab && this.apparitions.length === 0 && d.elev.gateOpen > 0.5],
      ['strobe', 1, () => d.phase !== 'calm' && !!this._nearFixture(15)],
    ];
    let options = pool.filter(([id, , ok]) => (!force || id === force) && ok());
    if (!options.length) return null;
    const total = options.reduce((s, [id, w]) => s + w / (1 + (this.used.get(id) || 0)), 0);
    let r = this.rng.next() * total, pick = options[0][0];
    for (const [id, w] of options) { r -= w / (1 + (this.used.get(id) || 0)); if (r <= 0) { pick = id; break; } }
    this.used.set(pick, (this.used.get(pick) || 0) + 1);
    this.log.push(pick);
    this[pick]();
    return pick;
  }

  _hasApparitionSpot() { this._spot = this._findApparitionSpot(); return !!this._spot; }

  _nearFixture(range) {
    const p = this.d.player.pos;
    let best = null, bd = range;
    for (const f of this.d.game.pool.fixtures) {
      if (!f.on || f.mode === 'candle' || f.isFlare || f._scare) continue;
      const dd = Math.hypot(f.pos.x - p.x, f.pos.z - p.z);
      if (dd < bd && dd > 2) { bd = dd; best = f; }
    }
    return best;
  }

  // Punkt hinter dem Spieler (außerhalb des Blicks)
  _behind(dist = 4) {
    const p = this.d.player;
    return _v.set(p.pos.x + Math.sin(p.yaw) * dist, 1.5, p.pos.z + Math.cos(p.yaw) * dist).clone();
  }

  // ---------------------------------------------------------------- Ereignisse

  // Eine Leuchte stirbt langsam – manchmal platzt sie
  lamp() {
    const f = this._nearFixture(12);
    if (!f) return;
    const old = f.mode;
    f._scare = true;
    f.mode = 'dying';
    audio.play('fluorescentPing', { pos: f.pos, vol: 0.4 });
    this.d.spike = Math.max(this.d.spike, 0.4);
    setTimeout(() => {
      f._scare = false;
      if (Math.random() < 0.35) {
        f.on = false;
        audio.play('lightBurst', { pos: f.pos, vol: 0.7 });
        this.d.game.sparks.burst(f.pos.x, f.pos.y, f.pos.z, 20, 1.6, 1.2);
      } else f.mode = old;
    }, 3500 + Math.random() * 2000);
  }

  // Das Kabinentelefon klingelt, während man weit weg ist
  phone() {
    const e = this.d.elev;
    e.ring(true);
    const at = e.interactables.find(i => i.id === 'phone')?.pos || new THREE.Vector3(0, 1.45, -1.5);
    const h = audio.loop('phoneRing', { pos: at.clone(), vol: 0.6 });
    this.ringing = { t: 14, handle: h };
  }

  _stopPhone() {
    if (!this.ringing) return;
    this.ringing.handle?.stop(0.1);
    this.d.elev.ring(false);
    this.ringing = null;
  }

  // Spieler hebt ab, während es klingelt → wer ist dran?
  answerPhone() {
    if (!this.ringing) return false;
    this._stopPhone();
    audio.play('phonePickup', { vol: 0.5 });
    const line = this.rng.pick(['c_near_1', 'c_near_2', 'c_near_3', 'r_e1_2', 'm1_voices']);
    voice.say(line, { interrupt: true, delay: 0.8 });
    return true;
  }

  // Schritte über der Decke, quer über den Spieler hinweg
  steps() {
    const d = this.d, p = d.player.pos;
    const h = (d.level?.theme?.height ?? 4) + 0.4;
    const a = this.rng.float(0, Math.PI * 2);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const k = (i / (n - 1) - 0.5) * 6;
      const pos = new THREE.Vector3(p.x + Math.cos(a) * k, h, p.z + Math.sin(a) * k);
      setTimeout(() => audio.play('footstep', { surface: 'wood', intensity: 0.9, pos, vol: 1.2 }), 600 + i * 520);
    }
    setTimeout(() => audio.play('slam', { pos: new THREE.Vector3(p.x + Math.cos(a) * 3, h, p.z + Math.sin(a) * 3), vol: 0.35 }), 600 + n * 520 + 300);
    d.spike = Math.max(d.spike, 0.35);
  }

  // Flüstern dicht hinter dem Spieler
  whisper() {
    const pos = this._behind(this.rng.float(2, 4));
    if (this.rng.chance(0.5)) voice.say(this.rng.pick(['c_near_1', 'c_near_2', 'c_near_3', 'r_e1_1', 'i_e1_hum']), { pos });
    else audio.play('whisper', { pos, vol: 0.45, dur: 2.2 });
  }

  // Alle Leuchten in der Nähe stroboskopieren kurz
  strobe() {
    const p = this.d.player.pos;
    const list = this.d.game.pool.fixtures.filter(f => f.on && !f.isFlare && f.mode !== 'candle' && Math.hypot(f.pos.x - p.x, f.pos.z - p.z) < 15);
    for (const f of list) { f._strobeOld = f.mode; f.mode = 'strobe'; }
    this.d.R.glitchPulse(0.5);
    audio.play('stinger', { kind: 'riser', vol: 0.25 });
    setTimeout(() => { for (const f of list) { f.mode = f._strobeOld; delete f._strobeOld; } }, 900);
  }

  // Frei sichtbar, sobald man sich umdreht – aber gerade nicht im Bild
  _behindView(x, z) {
    const d = this.d, p = d.player.pos;
    if (d.canSeePoint(_v.set(x, 1, z))) return false;
    return d.grid.lineOfSight(p.x, p.z, x, z) && d.col.lineClear(p.x, p.z, x, z, 1.2);
  }

  // Jemand sitzt dort, wo eben niemand war
  apparition() {
    const spot = this._spot || this._findApparitionSpot();
    this._spot = null;
    if (!spot) return;
    this.apparitions.push(new Apparition(this, this.rng.pick(['gast_m', 'gast_f']), spot));
  }

  _findApparitionSpot() {
    const d = this.d, lv = d.level;
    let spot = null;
    const seats = (lv.anchors.seats || []).filter(s => Math.hypot(s.pos.x - d.player.pos.x, s.pos.z - d.player.pos.z) > 6 && this._behindView(s.pos.x, s.pos.z));
    if (seats.length) { const s = this.rng.pick(seats); spot = { x: s.pos.x, z: s.pos.z, ry: s.ry, clip: 'Sitting_Idle_Loop', y: 0 }; }
    else {
      // an einer Wand, 7–15 m entfernt, gerade nicht im Blick
      const p = d.player.pos, g = lv.grid;
      const cells = [];
      for (let z = 0; z < g.h; z++) for (let x = 0; x < g.w; x++) {
        if (!lv.isFree(x, z)) continue;
        const [cx, cz] = lv.center(x, z);
        const dd = Math.hypot(cx - p.x, cz - p.z);
        if (dd > 7 && dd < 15) cells.push([x, z]);
      }
      const slots = lv.wallSlots(this.rng.shuffle(cells).slice(0, 60), 0.45).filter(s => d.col.pointFree(s.x, s.z, 0.3, 0.2, 1.4) && this._behindView(s.x, s.z));
      if (!slots.length) return null;
      const s = this.rng.pick(slots);
      spot = { x: s.x, z: s.z, ry: s.ry, clip: this.rng.chance(0.5) ? 'Sitting_Idle_Loop' : 'Idle_Loop', y: 0 };
    }
    return spot;
  }

  // Hinter dem Scherengitter steht jemand, wenn man sich umdreht
  gate() {
    const x = this.rng.float(-0.9, 0.9);
    this.apparitions.push(new Apparition(this, 'gast_f', { x, z: CAB.LANDING_Z + 0.35, ry: Math.PI, clip: 'Idle_Loop', y: 0, near: true }));
  }
}

// Eine erstarrte Gestalt: erscheint ungesehen, wird gesehen, verschwindet, sobald man wegsieht
class Apparition {
  constructor(scares, char, spot) {
    this.s = scares;
    this.d = scares.d;
    this.ch = new Character(char);
    this.warp = monsterize(this.ch, 'fahrgast');
    this.ch.play(spot.clip, { fade: 0 });
    this.ch.randomize();
    this.ch.root.position.set(spot.x, spot.y || 0, spot.z);
    this.ch.root.rotation.y = spot.ry;
    dressMonster(this.ch.root);
    this.ch.update(0.01);
    this.warp.update(0.5);
    this.warp.frozen = true;
    this.d.R.scene.add(this.ch.root);
    this.pos = this.ch.root.position;
    this.seenT = 0;
    this.unseenT = 0;
    this.age = 0;
    this.near = !!spot.near;
    this.gone = false;
    this.pts = [new THREE.Vector3(), new THREE.Vector3()];
  }

  update(dt) {
    this.age += dt;
    // Kopf wendet sich unmerklich zum Spieler – nur solange niemand hinsieht
    const p = this.d.player;
    this.pts[0].set(this.pos.x, 1.0, this.pos.z);
    this.pts[1].set(this.pos.x, 1.5, this.pos.z);
    const seen = this.pts.some(q => this.d.canSeePoint(q)) && this.d.lightAt(this.pts[0]).lit;
    if (!seen) this.ch.lookAt(_v.set(p.pos.x, p.pos.y + p.eye, p.pos.z), 1);
    this.ch.update(seen ? 0 : dt * 0.05);
    this.warp.update(dt);
    if (seen) {
      if (this.seenT === 0) {
        audio.play('stinger', { kind: this.near ? 'hard' : 'soft', vol: this.near ? 0.55 : 0.4 });
        this.d.spike = Math.max(this.d.spike, this.near ? 0.8 : 0.55);
      }
      this.seenT += dt;
      this.unseenT = 0;
    } else if (this.seenT > 0.25) {
      this.unseenT += dt;
      if (this.unseenT > 0.4) this.dispose(true);
    }
    if (this.age > 40 && this.seenT === 0) this.dispose(false);
  }

  dispose(sound = false) {
    if (this.gone) return;
    this.gone = true;
    if (sound) audio.play('passengerCrack', { pos: this.pos.clone().setY(1.2), vol: 0.25 });
    this.ch.root.removeFromParent();
  }
}
