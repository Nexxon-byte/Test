// Die Fahrgäste: Anzug, Sack über dem Kopf. Sie bewegen sich nur, wenn niemand hinsieht
// oder wenn sie im Dunkeln stehen. Im Blick UND im Licht erstarren sie mitten in der Bewegung.
// Fackel und Flutlicht bannen sie auch ohne Blick. Die Salzflinte zerschmettert sie für eine Weile.

import * as THREE from 'three';
import { Monster } from './base.js';
import { CAB } from '../../world/cab.js';
import { audio } from '../../audio/audio.js';
import { voice } from '../../audio/voice.js';

const _v = new THREE.Vector3(), _e = new THREE.Vector3();
const GRAB = 40;

export class Passenger extends Monster {
  constructor(director, char, { tame = false } = {}) {
    super(director, { char, profile: 'fahrgast', radius: 0.3, height: 1.78 });
    this.type = 'passenger';
    this.tame = tame;               // Tutorial: langsamer, schwächer
    this.frozen = false;
    this.unseenT = 0;
    this.caughtMoving = false;
    this.shuffleT = 0;
    this.whisperT = 12 + Math.random() * 10;
    this.lookT = 0;
    this.pauseT = 0;
    this.play('Idle_FoldArms_Loop', { fade: 0 });
    this.ch.randomize();
    this.setState('wander');
  }

  get chasing() { return this.state === 'stalk' && !this.frozen; }
  cannonTarget() { return this.state !== 'shattered' && !this.ghost; }

  onPhase(phase) { if (phase === 'hunt' && this.state === 'wander') this.setState('stalk'); }

  // ---------------------------------------------------------------- Denken

  think(dt) {
    const d = this.d, p = this.d.player;
    if (this.state === 'shattered') { this._shattered(dt); return; }

    // Wird sie beobachtet? Im Blick UND im Licht – oder im bannenden Licht (Fackel, Flutlicht)
    const light = d.lightAt(this.chest);
    const seen = d.seen(this);
    const observed = light.holy || (seen && light.lit);
    this.onScreen = seen;
    if (observed) {
      if (!this.frozen && this.caughtMoving && this.distTo(p.pos) < 16 && Math.random() < 0.5) audio.play('passengerCrack', { pos: this.chest.clone(), vol: 0.6 });
      this.frozen = true;
      this.caughtMoving = false;
      this.unseenT = 0;
      if (this.warp) this.warp.frozen = true;
      return;
    }
    this.unseenT += dt;
    if (this.frozen && this.unseenT < 0.12) return;   // kurzes Nachhalten gegen Flackern
    this.frozen = false;
    if (this.warp) this.warp.frozen = false;

    const dist = this.distTo(p.pos);
    // Kopf zum Spieler (wenn er erstarrt, bleibt der Kopf so stehen)
    this.ch.lookAt(dist < 18 ? _e.set(p.pos.x, p.pos.y + p.eye, p.pos.z) : null, 1);

    // Flüstern in der Nähe
    this.whisperT -= dt;
    if (this.whisperT <= 0 && dist < 7 && !p.dead) {
      this.whisperT = 25 + Math.random() * 20;
      if (Math.random() < 0.5) voice.say(['c_near_1', 'c_near_2', 'c_near_3'][Math.floor(Math.random() * 3)], { pos: this.chest.clone() });
      else audio.play('whisper', { pos: this.chest.clone(), vol: 0.3 });
    }

    switch (this.state) {
      case 'wander': this._wander(dt, dist); break;
      case 'stalk': this._stalk(dt, dist); break;
      case 'retreat': this._retreat(); break;
    }
  }

  animate(dt) { super.animate(dt, this.frozen ? 0 : 1); }

  _moveSound(dt, dist, speed) {
    this.caughtMoving = true;
    this.shuffleT -= dt;
    if (this.shuffleT <= 0 && dist < 14) {
      this.shuffleT = 1.4 / Math.max(0.6, speed);
      audio.play('passengerShuffle', { pos: _v.set(this.pos.x, 0.2, this.pos.z), vol: 0.25 });
    }
  }

  // Ziellos durch die Gänge, bis er die Lebenden bemerkt
  _wander(dt, dist) {
    const d = this.d;
    const notice = d.phase === 'hunt' ? 999 : d.phase === 'uneasy' ? 22 : this.tame ? 10 : 15;
    if (dist < notice && !d.player.dead && this.stateT > 1) { this.setState('stalk'); return; }
    if (this.pauseT > 0) { this.pauseT -= dt; this.play('Idle_FoldArms_Loop', { fade: 0.5 }); return; }
    if (!this.path || this.repathT <= 0) {
      this.repathT = 12;
      const c = d.grid.randomFloorCell(d.rng, (x, z) => d.grid.walkable(x, z));
      if (c) this.pathTo(...d.level.center(c[0], c[1]));
    }
    this.repathT -= dt;
    this.play('Walk_Formal_Loop', { fade: 0.4, speed: 0.8 });
    if (this.follow(dt, 0.9)) { this.path = null; this.pauseT = 2 + Math.random() * 4; }
    else this._moveSound(dt, dist, 0.9);
  }

  // Auf den Spieler zu – nur solange niemand hinsieht
  _stalk(dt, dist) {
    const d = this.d, p = d.player;
    if (p.dead) { this.setState('wander'); return; }
    const hunt = d.phase === 'hunt';
    const speed = (this.tame ? 1.5 : hunt ? 4.2 : d.phase === 'uneasy' ? 3.4 : 2.8) * (d.diff ?? 1);
    // Zugriff
    if (dist < 1.15) { this._grab(); return; }
    // Spieler in der Kabine hinter geschlossenem Gitter?
    const inCab = d.elev.contains(p.pos);
    const atGate = inCab && Math.abs(this.pos.x) < CAB.DOOR / 2 + 0.3 && this.pos.z > CAB.GATE_Z && this.pos.z < CAB.LANDING_Z + 1.2;
    if (atGate && d.elev.gateOpen < 0.85) {
      this.faceToward(p.pos.x, p.pos.z, dt);
      this.play('Zombie_Scratch', { fade: 0.3 });
      if (!d.gateHolds('passenger')) d.forceGate(this, dt);
      this.caughtMoving = true;
      return;
    }
    this.repathT -= dt;
    if (!this.path || this.repathT <= 0) { this.repathT = 0.6; if (!this.pathTo(p.pos.x, p.pos.z)) this.repathT = 2; }
    // Salzlinie: nicht darüber
    const bar = d.blockedByBarrier(this.pos.x, this.pos.z, 0.35);
    if (bar) { this.stepToward(this.pos.x + (this.pos.x - bar.x), this.pos.z + (this.pos.z - bar.z), 1.5, dt); return; }
    const a = this.play('Zombie_Walk_Fwd_Loop', { fade: 0.25 });
    if (a) a.timeScale = Math.min(2.2, speed / 1.4);
    this.follow(dt, speed, 0.6);
    this._moveSound(dt, dist, speed);
  }

  _grab() {
    const d = this.d, p = d.player;
    audio.play('stinger', { kind: 'hard', vol: 0.7 });
    audio.play('passengerCrack', { pos: this.chest.clone(), vol: 1 });
    d.R.glitchPulse(0.8);
    p.lookTarget = this.ch.head ? this.ch.head.getWorldPosition(new THREE.Vector3()) : this.chest.clone();
    p.lookSpeed = 9;
    setTimeout(() => { if (p.lookTarget) p.lookTarget = null; }, 450);
    d.hurt(this.tame ? 20 : GRAB, this, 'grab');
    // verschwindet in der Dunkelheit und kommt später wieder
    const cell = d.spawnCell(12, true);
    if (cell) this.place(cell[0], cell[1]);
    this.frozen = false;
    this.retreatFor = this.tame ? 40 : 15 + Math.random() * 10;
    this.setState('retreat');
  }

  _retreat() {
    this.play('Idle_Loop', { fade: 0.4 });
    if (this.stateT > this.retreatFor) this.setState('wander');
  }

  // ---------------------------------------------------------------- Treffer

  hit(kind, dir) {
    if (this.state === 'shattered') return;
    if (kind === 'melee') {
      // Brechstange: Stein auf Stein – schiebt ihn nur ein Stück zurück
      audio.play('clunk', { pos: this.chest.clone(), vol: 0.7 });
      audio.play('passengerCrack', { pos: this.chest.clone(), vol: 0.4 });
      if (dir) { this.pos.x += dir.x * 0.5; this.pos.z += dir.z * 0.5; this.d.col.resolveCircle(this.pos, this.radius, 0.2, 1.6); }
      return;
    }
    this.shatter(kind === 'shot' ? 25 : kind === 'cannon' ? 14 : 10);
  }

  // Zerschmettert: fällt, liegt, steht rückwärts wieder auf
  shatter(sec) {
    this.setState('shattered');
    this.shatterT = sec;
    this.frozen = false;
    if (this.warp) this.warp.frozen = false;
    this.ghost = true;
    this._rising = false;
    this.path = null;
    this.play('Death01', { fade: 0.15, loop: false });
    audio.play('passengerCrack', { pos: this.chest.clone(), vol: 1 });
    audio.play('slam', { pos: this.chest.clone(), vol: 0.35 });
  }

  _shattered(dt) {
    this.onScreen = this.d.seen(this);
    this.shatterT -= dt;
    if (!this._rising && this.shatterT <= 0) {
      // rückwärts aufstehen: dieselbe Animation, umgekehrt
      const a = this.ch.current;
      if (a) { a.paused = false; a.enabled = true; a.timeScale = -0.8; a.time = a.getClip().duration; }
      this._rising = true;
      this._riseT = 2.2;
      audio.play('passengerCrack', { pos: this.chest.clone(), vol: 0.8 });
    }
    if (this._rising) {
      this._riseT -= dt;
      if (this._riseT <= 0) { this.ghost = false; this._rising = false; this.setState('stalk'); }
    }
  }
}
