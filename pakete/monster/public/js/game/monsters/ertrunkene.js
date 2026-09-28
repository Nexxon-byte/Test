// Die Ertrunkenen (Tiefenstufe III): Opfer der Flut, die im Grundwasser warten. Sie bleiben unter der
// Oberfläche – ein fahler Umriss, Haar, das treibt, Blasen. Sie folgen jedem, der durch ihr Wasser watet.
// Wer weitergeht, dem kommen sie nicht bei. Wer stehen bleibt (oder schleicht), dem greifen sie
// nach dem Knöchel und ziehen ihn hinab. Vom trockenen Rand holen sie selten jemanden herein.
//
// Konter: im Wasser nie stehen bleiben · gepackt: [E] hämmern (treten) oder zuschlagen/schießen ·
// Salz ins Wasser streuen: die Zone brennt, sie fliehen · Fackelschein hält sie auf Abstand.
//
// Zustände: lurk (treiben) → stalk (folgen) → grab (packen, hinabziehen) → retreat · edge (Randgriff) · burn

import * as THREE from 'three';
import { Monster } from './base.js';
import { audio } from '../../audio/audio.js';
import { voice } from '../../audio/voice.js';
import { ui } from '../../ui/ui.js';
import { input } from '../../core/input.js';
import { charFor, packFirstSight, pick, lampHits } from './kit.js';
import { dress } from './standin.js';
import { overlay, meter } from './pack-ui.js';
import { FLOOD } from './flood.js';
import { PACK_KOM } from '../../story/lines-monster.js';

const _v = new THREE.Vector3();

export const ERTRUNKENE = {
  speedLurk: 0.8, speedStalk: 1.45, speedRetreat: 2.4,
  depth: -1.25, depthStalk: -0.95, rise: -0.1,
  grabNeed: 0.9, grabRange: 0.95, slowSpeed: 0.8,
  holdMax: 6.0, holdDps: 7, drownDamage: 45,
  kickPerPress: 0.16, kickDecay: 0.1,
  retreatFor: 12, edgeCd: 40, edgeStill: 1.6,
};

const CLIP = { swim: 'Swim_Fwd_Loop', float: 'Swim_Idle_Loop', reach: 'Zombie_Scratch', rise: 'Zombie_Idle_Loop' };

export class Ertrunkene extends Monster {
  constructor(director, { flood, zone }) {
    const c = charFor('ertrunkene');
    super(director, { char: c.id, profile: 'ertrunkene', radius: 0.3, height: 1.7 });
    this.type = 'ertrunkene';
    this.ghost = true;          // unter Wasser – man watet über sie hinweg
    this.radar = true;
    this.flood = flood;
    this.zone = zone;
    this.y = ERTRUNKENE.depth;
    this.yTarget = ERTRUNKENE.depth;
    this.stillT = 0;
    this.edgeCd = 10 + Math.random() * 20;
    this.bubbleT = 1;
    this.whisperT = 10 + Math.random() * 12;
    this.kick = 0;
    this.dressing = dress('ertrunkene', this);
    this.play(CLIP.float, { fade: 0 });
    this.ch.randomize();
    this.setState('lurk');
  }

  get chasing() { return this.state === 'stalk' || this.state === 'grab'; }
  cannonTarget() { return this.state === 'edge' || this.state === 'grab'; }
  sightPoints(out) {
    out[0].set(this.pos.x, Math.max(FLOOD.surfaceY - 0.05, this.pos.y + 1.2), this.pos.z);
    out[1].set(this.pos.x, Math.max(FLOOD.surfaceY - 0.05, this.pos.y + 1.5), this.pos.z);
    out[2].set(this.pos.x, this.pos.y + 1.65, this.pos.z);
    return out;
  }
  get chest() { return _v.set(this.pos.x, Math.max(FLOOD.surfaceY, this.pos.y + 1.1), this.pos.z); }

  place(x, z, yaw) { super.place(x, z, yaw); this.pos.y = this.y; }

  think(dt) {
    const d = this.d, p = d.player, f = this.flood;
    this.onScreen = d.seen(this);
    const dist = this.distTo(p.pos);
    const pDepth = p.dead ? 0 : f.depthAt(p.pos.x, p.pos.z);
    const pZone = pDepth ? f.zoneAt(p.pos.x, p.pos.z) : null;
    const inMine = pZone === this.zone && !p.hidden;
    // wie lange steht (oder schleicht) der Spieler schon im Wasser?
    if (inMine && p.speedNow < ERTRUNKENE.slowSpeed) this.stillT += dt; else this.stillT = Math.max(0, this.stillT - dt * 2);
    if (inMine && dist < 7) packFirstSight(d, 'ertrunkene');

    this.y += (this.yTarget - this.y) * (1 - Math.exp(-dt * 2.5));
    this.pos.y = this.y + (this.state === 'grab' ? 0 : Math.sin(d.time * 0.8 + this.id) * 0.05);
    this._ambient(dt, dist, inMine);

    // Salz im Wasser: fliehen
    if (this.zone.salted > 0 && this.state !== 'burn' && this.state !== 'grab') { this.setState('burn'); return; }

    switch (this.state) {
      case 'lurk': this._lurk(dt, inMine, dist); break;
      case 'stalk': this._stalk(dt, inMine, dist); break;
      case 'grab': this._grab(dt); break;
      case 'retreat': this._retreat(dt); break;
      case 'edge': this._edge(dt); break;
      case 'burn': this._burn(dt); break;
    }
  }

  animate(dt) {
    super.animate(dt, this.state === 'grab' ? 1.4 : 1);
    if (this.distTo(this.d.player.pos) < 26) this.dressing.update(dt, { time: this.d.time }, { float: this.state === 'grab' || this.state === 'edge' ? 0.2 : 0.9 });
  }

  // Unter Wasser schwimmen: nur über tiefe Zellen der eigenen Zone
  _swim(dt, tx, tz, speed, arrive = 0.4) {
    const f = this.flood;
    let [x, z] = [tx, tz];
    const c = f.cellOf(x, z);
    if (!c || c.zone !== this.zone || !c.deep) [x, z] = f.nearestDeep(this.zone, tx, tz);
    const dx = x - this.pos.x, dz = z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < arrive) return true;
    const s = Math.min(d, speed * dt);
    const nx = this.pos.x + dx / d * s, nz = this.pos.z + dz / d * s;
    const nc = f.cellOf(nx, nz);
    if (nc && nc.zone === this.zone && nc.deep) { this.pos.x = nx; this.pos.z = nz; }
    else { const [ax, az] = f.nearestDeep(this.zone, nx, nz); this.pos.x += (ax - this.pos.x) * Math.min(1, dt * 2); this.pos.z += (az - this.pos.z) * Math.min(1, dt * 2); }
    this.faceToward(x, z, dt, 3);
    return false;
  }

  _lurk(dt, inMine, dist) {
    this.yTarget = ERTRUNKENE.depth;
    this.play(CLIP.float, { fade: 0.8, speed: 0.6 });
    if (inMine) { this.setState('stalk'); return; }
    if (!this.drift || this.stateT > 12) { this.stateT = 0; this.drift = this.flood.randomDeep(this.zone); }
    this._swim(dt, this.drift[0], this.drift[1], ERTRUNKENE.speedLurk);
    // Randgriff: jemand steht still am Ufer und sieht weg
    this.edgeCd -= dt;
    const p = this.d.player;
    if (this.edgeCd <= 0 && !p.dead && !p.hidden && dist < 4) {
      const e = this.flood.edgeNear(p.pos.x, p.pos.z);
      if (e && e.zone === this.zone && p.speedNow < 0.3) {
        this.edgeStill = (this.edgeStill || 0) + dt;
        if (this.edgeStill > ERTRUNKENE.edgeStill && !this.d.seen(this)) { this.edgeStill = 0; this.edgeCd = ERTRUNKENE.edgeCd; this.edgeTo = e; this.setState('edge'); }
      } else this.edgeStill = 0;
    }
  }

  _stalk(dt, inMine, dist) {
    const d = this.d, p = d.player;
    if (!inMine) { this.lostT = (this.lostT || 0) + dt; if (this.lostT > 3) { this.lostT = 0; this.setState('lurk'); } }
    else this.lostT = 0;
    // Fackel im Wasser in der Nähe: Abstand halten
    for (const fl of d.flares) if (fl.pos.distanceTo(this.pos) < 3.5 && !fl._drowned) { this._swim(dt, this.pos.x * 2 - fl.pos.x, this.pos.z * 2 - fl.pos.z, ERTRUNKENE.speedStalk); return; }
    this.yTarget = dist < 3 ? ERTRUNKENE.depthStalk : ERTRUNKENE.depth;
    this.play(CLIP.swim, { fade: 0.5, speed: 0.8 });
    // dicht hinter den Füßen bleiben
    this._swim(dt, p.pos.x, p.pos.z, ERTRUNKENE.speedStalk * (d.diff ?? 1), 0.3);
    // angestrahlt: das Gesicht wendet sich nach oben
    this.ch.lookAt(lampHits(d, this.chest) ? _v.set(p.pos.x, p.pos.y + p.eye, p.pos.z) : null, 1);
    if (dist < 2.2 && Math.random() < dt * 1.2) this.flood.ring(this.pos.x + (Math.random() - 0.5), this.pos.z + (Math.random() - 0.5), 0.6, 0.6);
    if (inMine && dist < ERTRUNKENE.grabRange && this.stillT > ERTRUNKENE.grabNeed) this._startGrab();
  }

  _startGrab() {
    const d = this.d, p = d.player;
    this.setState('grab');
    this.kick = 0;
    this.yTarget = ERTRUNKENE.rise - 0.7;
    this.play(CLIP.reach, { fade: 0.1 });
    audio.play('waterSurge', { pos: p.pos.clone().setY(0.4), vol: 1 });
    audio.play('stinger', { kind: 'hard', vol: 0.7 });
    d.R.glitchPulse(0.6);
    this.flood.ring(p.pos.x, p.pos.z, 1.6, 1.4);
    p.frozen = true;
    p.lookTarget = new THREE.Vector3(this.pos.x, 0, this.pos.z);
    p.lookSpeed = 7;
    setTimeout(() => { if (p.lookTarget && this.state === 'grab') p.lookTarget = null; }, 700);
    this.under = audio.loop('underwater', { vol: 0.001 });
    this.under?.setVol(0.5, 0.8);
    overlay.show('water');
    overlay.water(0.1);
    meter.show('GEPACKT', '[LEERTASTE] hämmern: treten! · oder zuschlagen [LMT]');
    if (!d.state.flags.pk_drowned_hint) { d.state.flags.pk_drowned_hint = true; ui.komMessage(PACK_KOM.k_drowned, { glitch: true }); }
  }

  _grab(dt) {
    const d = this.d, p = d.player, g = d.game;
    // festhalten
    p.frozen = true;
    this.pos.x += (p.pos.x - this.pos.x) * Math.min(1, dt * 6);
    this.pos.z += (p.pos.z - this.pos.z) * Math.min(1, dt * 6);
    this.faceToward(p.pos.x, p.pos.z, dt, 8);
    // Hinabziehen: sichtbar am Wasserstand im Bild und am dumpfen Klang
    const k = Math.min(1, this.stateT / ERTRUNKENE.holdMax);
    this.pull = k;
    overlay.water(0.15 + k * 0.75);
    if (audio.muffle) audio.muffle.frequency.setTargetAtTime(Math.max(500, 9000 * (1 - k)), audio.now, 0.2);
    // Treten
    if (input.hit('Space')) { this.kick += ERTRUNKENE.kickPerPress; audio.play('splash', { pos: p.pos.clone().setY(0.3), vol: 0.5 }); this.flood.ring(p.pos.x, p.pos.z, 0.8, 1); p.shake = Math.max(p.shake, 0.3); }
    this.kick = Math.max(0, this.kick - dt * ERTRUNKENE.kickDecay);
    meter.set(this.kick);
    // Schaden
    this._dmgT = (this._dmgT ?? 0) + dt;
    if (this._dmgT > 1) { this._dmgT = 0; d.hurt(ERTRUNKENE.holdDps, this, 'water'); audio.play('bubbles', { pos: p.pos.clone().setY(0.3), vol: 0.5 }); }
    if (p.dead) { this._release(false); return; }
    if (this.kick >= 1) { this._release(true); return; }
    if (this.stateT > ERTRUNKENE.holdMax) {
      // ganz hinab – und wieder ausgespuckt
      audio.play('drownedGurgle', { pos: p.pos.clone(), vol: 0.9 });
      d.hurt(ERTRUNKENE.drownDamage, this, 'water');
      this._release(false);
    }
  }

  _release(freed) {
    const d = this.d, p = d.player;
    p.frozen = false;
    overlay.hide('water');
    meter.hide();
    if (audio.muffle) audio.muffle.frequency.setTargetAtTime(22000, audio.now, 0.3);
    this.under?.stop(0.6); this.under = null;
    this.pull = 0;
    if (freed) { ui.toast('Losgetreten!'); audio.play('splash', { pos: p.pos.clone(), vol: 0.9 }); }
    else if (!p.dead) audio.play('breath', { fast: 1, vol: 0.6 });
    this.retreatFor = ERTRUNKENE.retreatFor;
    this.setState('retreat');
  }

  _retreat(dt) {
    this.yTarget = ERTRUNKENE.depth;
    this.play(CLIP.swim, { fade: 0.4 });
    if (!this.away || this.stateT < 0.05) this.away = this.flood.randomDeep(this.zone);
    this._swim(dt, this.away[0], this.away[1], ERTRUNKENE.speedRetreat);
    if (this.stateT > this.retreatFor) this.setState('lurk');
  }

  // Aus dem Wasser am Ufer auftauchen und hineinziehen
  _edge(dt) {
    const d = this.d, p = d.player, e = this.edgeTo;
    if (!e || p.dead || p.hidden) { this.setState('lurk'); return; }
    this._swim(dt, e.x, e.z, 3.2, 0.2);
    this.yTarget = ERTRUNKENE.rise;
    this.play(CLIP.rise, { fade: 0.2 });
    this.faceToward(p.pos.x, p.pos.z, dt, 8);
    if (this.stateT < 0.05) { audio.play('waterSurge', { pos: this.chest.clone(), vol: 0.8 }); this.flood.ring(this.pos.x, this.pos.z, 1.2, 1.2); }
    if (this.stateT > 0.9) {
      if (this.distTo(p.pos) < 2.2) {
        // hinein ins Tiefe
        const dx = e.x - p.pos.x, dz = e.z - p.pos.z, l = Math.hypot(dx, dz) || 1;
        p.pos.x += dx / l * 1.4; p.pos.z += dz / l * 1.4;
        audio.play('splash', { pos: p.pos.clone(), vol: 1 });
        this.pos.x = p.pos.x; this.pos.z = p.pos.z;
        this._startGrab();
      } else this.setState('lurk');
    }
  }

  _burn(dt) {
    // Salz im Wasser: weit weg vom Salz, bis es sich verdünnt hat
    const z = this.zone, s = z.saltAt;
    this.yTarget = ERTRUNKENE.depth;
    this.play(CLIP.swim, { fade: 0.3, speed: 1.4 });
    if (this.stateT < 0.05) { audio.play('drownedGurgle', { pos: this.chest.clone(), vol: 0.8 }); audio.play('saltPour', { pos: this.chest.clone(), vol: 0.4 }); }
    let best = null, bd = -1;
    for (const [cx, cz] of z.deep) { const [wx, wz] = this.d.level.center(cx, cz); const dd = s ? Math.hypot(wx - s.x, wz - s.z) : 0; if (dd > bd) { bd = dd; best = [wx, wz]; } }
    if (best) this._swim(dt, best[0], best[1], ERTRUNKENE.speedRetreat);
    if (z.salted <= 0) this.setState('lurk');
  }

  _ambient(dt, dist, inMine) {
    this.bubbleT -= dt;
    if (this.bubbleT <= 0) {
      this.bubbleT = (inMine ? 0.8 : 2.5) + Math.random() * 2;
      this.flood.ring(this.pos.x, this.pos.z, 0.35, 0.7);
      if (dist < 14) audio.play('bubbles', { pos: _v.set(this.pos.x, FLOOD.surfaceY, this.pos.z), vol: 0.35 });
    }
    this.whisperT -= dt;
    if (this.whisperT <= 0 && dist < 9 && !this.d.player.dead) {
      this.whisperT = 18 + Math.random() * 18;
      if (Math.random() < 0.6) voice.say(pick(['er_1', 'er_2', 'er_3', 'er_4', 'er_5']), { pos: this.chest.clone() });
      else audio.play('drownedGurgle', { pos: this.chest.clone(), vol: 0.45 });
    }
  }

  hit(kind) {
    const d = this.d;
    audio.play('splash', { pos: this.chest.clone(), vol: 0.9 });
    audio.play('drownedGurgle', { pos: this.chest.clone(), vol: 0.8 });
    this.flood.ring(this.pos.x, this.pos.z, 1.4, 1.2);
    if (this.state === 'grab') { this._release(true); return; }
    this.retreatFor = kind === 'melee' ? 8 : 16;
    this.setState('retreat');
  }

  dispose() {
    if (this.state === 'grab') this._release(false);
    this.dressing.dispose();
    super.dispose();
  }
}
