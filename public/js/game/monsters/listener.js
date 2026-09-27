// Der Hörer: blind, ausgemergelt, kriecht. Er jagt Geräusche – Schritte, Kurbeln, Schüsse, die Rufglocke.
// Wer still steht oder geduckt schleicht, ist für ihn nicht da. Nur wer ihn berührt, wird gebissen.
// Konter: Stille, Ducken, Klapper als Köder, Flinte (vertreibt ihn kurz).

import * as THREE from 'three';
import { Monster } from './base.js';
import { CAB } from '../../world/cab.js';
import { audio } from '../../audio/audio.js';

const BITE = 60;

export class Listener extends Monster {
  constructor(director, char) {
    super(director, { char, profile: 'hoerer', radius: 0.32, height: 1.7 });
    this.type = 'listener';
    this.target = new THREE.Vector3();
    this.clickT = 1 + Math.random() * 3;
    this.breathT = 2;
    this.attackCd = 0;
    this.bitten = false;
    this.play('Crouch_Idle_Loop', { fade: 0 });
    this.ch.randomize();
    this.setState('idle');
  }

  get chasing() { return this.state === 'hunt'; }
  cannonTarget() { return this.state !== 'flee'; }

  hearing() { return this.d.phase === 'hunt' ? 1.6 : this.d.phase === 'uneasy' ? 1.3 : 1; }

  onState(s) {
    if (s === 'hunt') { audio.play('listenerShriek', { pos: this.chest.clone(), vol: 0.8 }); this.d.R.glitchPulse(0.25); }
  }

  think(dt) {
    const d = this.d, p = d.player;
    this.onScreen = d.seen(this);
    this.attackCd -= dt;
    const dist = this.distTo(p.pos);
    if (dist < 14 && (this.onScreen || dist < 8)) d.firstSight('listener');

    // Geräusche des Hörers selbst: Klicken (er „sieht“ mit den Ohren), Atem in der Nähe
    this.clickT -= dt;
    if (this.clickT <= 0) {
      this.clickT = this.state === 'hunt' ? 0.9 + Math.random() : 2.2 + Math.random() * 3.5;
      audio.play('listenerClick', { pos: this.chest.clone(), vol: 0.55 });
    }
    this.breathT -= dt;
    if (this.breathT <= 0 && dist < 9) { this.breathT = 1.8 + Math.random() * 1.5; audio.play('listenerBreath', { pos: this.chest.clone(), vol: 0.45 }); }

    if (this.state === 'flee') { this._flee(dt); return; }
    if (this.state === 'attack') { this._attack(dt, dist); return; }

    // Berührung: wer ihm zu nah kommt, wird gebissen – auch in völliger Stille
    if (!p.dead && dist < 1.0 && this.attackCd <= 0) { this.setState('attack'); return; }

    // Hören
    const heard = d.loudestAt(this.pos.x, this.pos.z, this.hearing());
    if (heard) {
      this.target.set(heard.x, 0, heard.z);
      const loud = heard.kind !== 'player' || heard.strength > 5 || heard.dist < 4 || d.phase === 'hunt';
      if (this.state !== 'hunt' && loud) { this.setState('hunt'); this.path = null; }
      else if (this.state === 'idle' || this.state === 'roam' || this.state === 'listen') { this.setState('search'); this.path = null; }
      if (this.state === 'hunt' || this.state === 'search') this.repathT = Math.min(this.repathT, 0.25);
    }

    switch (this.state) {
      case 'idle': this._idle(dt); break;
      case 'listen': this.play('Crouch_Idle_Loop', { fade: 0.4 }); if (this.stateT > 3.5) this.setState('idle'); break;
      case 'roam': this._go(dt, 0.8, 'Crouch_Fwd_Loop', 0.7, 'idle'); break;
      case 'search': this._go(dt, 1.5, 'Crouch_Fwd_Loop', 1.1, 'listen'); break;
      case 'hunt': this._go(dt, 5.0 * (d.diff ?? 1), 'Sprint_Loop', 1.05, 'listen'); if (this.stateT > 9) this.setState('listen'); break;
    }
  }

  _idle(dt) {
    this.play('Crouch_Idle_Loop', { fade: 0.4 });
    // langsam den Kopf drehen, ab und zu weiterkriechen
    this.faceToward(this.pos.x + Math.sin(this.d.time * 0.3 + this.id), this.pos.z + Math.cos(this.d.time * 0.3 + this.id), dt, 1);
    if (this.stateT > 8 + (this.id % 5)) {
      const g = this.d.grid;
      const cx = g.cx(this.pos.x), cz = g.cz(this.pos.z);
      for (let i = 0; i < 20; i++) {
        const x = cx + Math.floor(Math.random() * 9) - 4, z = cz + Math.floor(Math.random() * 9) - 4;
        if (g.walkable(x, z)) { const [wx, wz] = this.d.level.center(x, z); this.target.set(wx, 0, wz); break; }
      }
      this.path = null;
      this.setState('roam');
    }
  }

  // Zum Ziel (Geräuschquelle) bewegen
  _go(dt, speed, clip, animSpeed, then) {
    const d = this.d;
    const t = this.target;
    // Ziel in der Kabine hinter dem Gitter?
    const inCab = d.elev.contains(t, -0.2);
    const atGate = inCab && Math.abs(this.pos.x) < CAB.DOOR / 2 + 0.3 && this.pos.z > CAB.GATE_Z && this.pos.z < CAB.LANDING_Z + 1.2;
    if (atGate && d.elev.gateOpen < 0.85) {
      this.play('Idle_Loop', { fade: 0.3 });
      this.faceToward(t.x, t.z, dt);
      if (!d.gateHolds('listener')) d.forceGate(this, dt);
      return;
    }
    const bar = d.blockedByBarrier(this.pos.x, this.pos.z, 0.35);
    if (bar) { this.stepToward(this.pos.x + (this.pos.x - bar.x), this.pos.z + (this.pos.z - bar.z), 1.5, dt); this.setState('listen'); return; }
    this.repathT -= dt;
    if (!this.path || this.repathT <= 0) { this.repathT = 1.2; if (!this.pathTo(t.x, t.z)) { this.repathT = 3; this.setState(then); return; } }
    const a = this.play(clip, { fade: 0.25 });
    if (a) a.timeScale = animSpeed;
    if (this.follow(dt, speed, 0.7)) this.setState(then);
  }

  _attack(dt, dist) {
    const d = this.d, p = d.player;
    if (this.stateT < 0.05) { this.play('Punch_Cross', { fade: 0.1, loop: false }); this.bitten = false; audio.play('listenerShriek', { pos: this.chest.clone(), vol: 1 }); }
    this.faceToward(p.pos.x, p.pos.z, dt, 14);
    if (!this.bitten && this.stateT > 0.35) {
      this.bitten = true;
      if (dist < 1.7 && !p.dead) {
        d.hurt(BITE, this, 'bite');
        audio.play('bite', { pos: this.chest.clone(), vol: 1 });
        d.R.glitchPulse(0.6);
      }
    }
    if (this.stateT > 1.4) { this.attackCd = 4; this.setState('listen'); }
  }

  _flee(dt) {
    if (!this.path) {
      const cell = this.d.spawnCell(12, false);
      if (cell) this.pathTo(cell[0], cell[1]);
    }
    const a = this.play('Sprint_Loop', { fade: 0.2 });
    if (a) a.timeScale = 0.9;
    const done = this.follow(dt, 4.2, 0.8);
    if (done || this.stateT > this.fleeFor) { this.path = null; this.setState('idle'); }
  }

  hit(kind) {
    const t = kind === 'shot' ? 8 : kind === 'cannon' ? 6 : kind === 'hammer' ? 6 : 3;
    audio.play('listenerShriek', { pos: this.chest.clone(), vol: 1 });
    this.d.game.sparks.burst(this.pos.x, 1.1, this.pos.z, 10, 1.4, 0.8);
    this.fleeFor = t;
    this.path = null;
    this.setState('flee');
    this.attackCd = t;
  }
}
