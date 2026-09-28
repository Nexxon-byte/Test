// Die Falterin (Tiefenstufe III): Flügel aus Gesangbuchseiten, sie fliegt und trinkt Licht.
// Sie jagt, was leuchtet: die Lampe des Spielers, Fackeln, Leuchten der Welt, das Kabinenlicht, das Flutlicht.
// Was sie trinkt, geht für diese Nacht aus – die Ebene wird dunkler, die Fahrgäste gefährlicher.
// Wer ihr mit brennender Lampe (oder ihr zu nah) begegnet, dem trinkt sie die Lampe leer.
//
// Konter: Lampe aus (im Dunkeln sieht sie niemanden) · sie NICHT anleuchten · Fackel als Köder werfen ·
// Salzflinte/Salzkanone holt sie vom Himmel (sie verliert das gespeicherte Licht in einem Blitz) ·
// Brechstange verscheucht sie. Salzlinien überfliegt sie. Geschlossenes Gitter hält sie draußen.
//
// Zustände: roost (ruht im Dunkeln) → seek (fliegt zu einem Licht) → feast (trinkt) / hunt (Spielerlampe)
//           → grab (umschlingt, trinkt die Lampe) → sated (satt, fliegt weg) · stunned (abgeschossen) · flee

import * as THREE from 'three';
import { Monster } from './base.js';
import { CAB } from '../../world/cab.js';
import { audio } from '../../audio/audio.js';
import { voice } from '../../audio/voice.js';
import { ui } from '../../ui/ui.js';
import { charFor, packFirstSight, lampLevel, lampHits, pick } from './kit.js';
import { dress } from './standin.js';
import { overlay } from './pack-ui.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _e = new THREE.Vector3();

// Werte (Feinabstimmung hier)
export const FALTERIN = {
  speedSeek: 2.3, speedHunt: 3.3, speedHuntLate: 4.0,   // Spieler: gehen 2,45 · rennen 4,3
  alt: 0.85, altRoost: 1.25, altGrab: 0.25,             // Fußhöhe beim Fliegen
  sight: 26,                                            // so weit sieht sie Licht
  grabDamage: 25, grabDamageDark: 35,
  drinkFixture: 3.5, drinkFlare: 4.0, drinkCab: 5.0,
  satedFor: 25, stunFor: 7, maxDrinks: 7,
  cabDarkFor: 28,                                       // so lange bleibt die Kabine nach ihrem Trunk dunkel
};

// Clips der Platzhalter-Figur (echtes Modell: MODELLE.md)
const CLIP = { hover: 'Swim_Idle_Loop', fly: 'Swim_Fwd_Loop', roost: 'Crouch_Idle_Loop', grab: 'Spell_Simple_Idle_Loop', fall: 'Death01', rise: 'LayToIdle', hit: 'Hit_Knockback' };

export class Falterin extends Monster {
  constructor(director, opts = {}) {
    const c = charFor('falterin');
    super(director, { char: c.id, profile: 'falterin', radius: 0.35, height: 1.75 });
    this.type = 'falterin';
    this.ghost = true;            // sie fliegt: man läuft unter ihr durch (Berührung = Angriff)
    this.radar = true;            // erscheint trotzdem auf dem Horchgerät
    this.standin = c.standin;
    this.alt = FALTERIN.altRoost;
    this.altTarget = FALTERIN.altRoost;
    this.stored = 0;              // getrunkenes Licht 0 … 1 (sie leuchtet davon)
    this.drinks = 0;
    this.lure = null;             // { kind, ref, pos, score }
    this.scanT = 0;
    this.flap = 0.2; this.flapRate = 3;
    this.whisperT = 15 + Math.random() * 15;
    this.moveT = 0;
    this.dressing = dress('falterin', this);
    this.glow = director.game.pool.add({ pos: new THREE.Vector3(), color: 0xffc27a, intensity: 0, distance: 7, mode: 'candle', on: true, meshes: [], priority: 3, owner: this });
    this.flutter = null;
    this.play(CLIP.hover, { fade: 0 });
    this.ch.randomize();
    this.setState('roost');
  }

  get chasing() { return this.state === 'hunt'; }
  cannonTarget() { return !['stunned', 'sated'].includes(this.state); }
  get ceiling() { return (this.d.level?.theme?.height ?? 4.4) - this.height - 0.25; }

  // Sichtpunkte und Brust liegen in Flughöhe
  sightPoints(out) {
    const y = this.pos.y;
    out[0].set(this.pos.x, y + 0.3, this.pos.z);
    out[1].set(this.pos.x, y + this.height * 0.6, this.pos.z);
    out[2].set(this.pos.x, y + this.height * 0.92, this.pos.z);
    return out;
  }
  get chest() { return _e.set(this.pos.x, this.pos.y + this.height * 0.6, this.pos.z); }

  place(x, z, yaw) { super.place(x, z, yaw); this.pos.y = this.alt; }

  // ---------------------------------------------------------------- Denken

  think(dt) {
    const d = this.d, p = d.player;
    this.onScreen = d.seen(this);
    const dist = this.distTo(p.pos);
    // erste Begegnung: gesehen und nah – oder sie leuchtet schon
    if (this.onScreen && (dist < 14 || this.stored > 0.3) && d.lightAt(this.chest).lit) packFirstSight(d, 'falterin');

    this.scanT -= dt;
    if (this.scanT <= 0) { this.scanT = 0.3; this._scan(); }

    switch (this.state) {
      case 'roost': this._roost(dt); break;
      case 'seek': this._seek(dt); break;
      case 'feast': this._feast(dt); break;
      case 'hunt': this._hunt(dt, dist); break;
      case 'grab': this._grab(dt); break;
      case 'sated': this._sated(dt); break;
      case 'stunned': this._stunned(dt); break;
      case 'flee': this._flee(dt); break;
    }

    // Berührung im Dunkeln: wer ihr in die Arme läuft, wird trotzdem gepackt
    if (['roost', 'seek', 'feast'].includes(this.state) && !p.dead && !p.hidden && dist < 0.9 && Math.abs(p.pos.y + p.eye - (this.pos.y + 1.2)) < 1.4) this._startGrab();

    // Höhe, Flügel, Licht, Klang
    this.alt += (Math.min(this.altTarget, this.ceiling) - this.alt) * (1 - Math.exp(-dt * 2.2));
    const bob = this.state === 'stunned' ? 0 : Math.sin(this.d.time * 2.1 + this.id) * 0.12 + Math.sin(this.d.time * 5.3) * 0.04;
    this.pos.y = Math.max(0, this.alt + bob);
    this.stored = Math.max(0, this.stored - dt * 0.004);
    this._updateGlow();
    this._updateSound(dt, dist);
    this._whisper(dt, dist);
  }

  animate(dt) {
    super.animate(dt);
    if (this.onScreen || this.distTo(this.d.player.pos) < 30) this.dressing.update(dt, { time: this.d.time, near: this.distTo(this.d.player.pos) < 20 }, { flap: this.flap, rate: this.flapRate, glow: this.stored });
  }

  // ---------------------------------------------------------------- Lichtquellen

  _scan() {
    const d = this.d, p = d.player, e = d.elev;
    const hx = this.pos.x, hz = this.pos.z;
    const sated = this.state === 'sated' || this.state === 'stunned' || this.state === 'grab' || this.state === 'flee';
    if (sated) return;
    const hunger = Math.max(0.2, 1 - this.drinks / FALTERIN.maxDrinks);
    let best = null;
    const consider = (kind, ref, pos, score) => { if (score > 0.05 && (!best || score > best.score)) best = { kind, ref, pos: pos.clone(), score }; };
    const los = (x, z) => d.grid.lineOfSight(hx, hz, x, z);
    // Die Lampe des Spielers – angestrahlt zu werden, lockt sie am meisten
    const lv = lampLevel(d);
    if (lv > 0.15 && !p.hidden) {
      const dist = Math.hypot(p.pos.x - hx, p.pos.z - hz);
      if (dist < FALTERIN.sight && los(p.pos.x, p.pos.z)) {
        let s = lv * 10 / (1 + dist / 7);
        if (lampHits(d, this.chest)) s *= 2.5;
        consider('lamp', p, _v.set(p.pos.x, 0, p.pos.z), s);
      }
    }
    // Leuchtfackeln: ein Festmahl
    for (const f of d.flares) {
      if (f.dead || f.t <= 0.5 || f.drunkBy) continue;
      const dist = Math.hypot(f.pos.x - hx, f.pos.z - hz);
      if (dist < 34 && (dist < 8 || los(f.pos.x, f.pos.z))) consider('flare', f, _v.set(f.pos.x, 0, f.pos.z), 22 * Math.min(1, f.t / 8) / (1 + dist / 8));
    }
    // Kabinenlicht und Flutlicht
    if (e.cabLight.intensity > 4 && !e._falterinDark) {
      _w.set(0, 0, CAB.GATE_Z + 0.9);
      const dist = Math.hypot(_w.x - hx, _w.z - hz);
      if (dist < 30 && los(_w.x, _w.z)) consider('cab', e, _w, 5 * hunger / (1 + dist / 8));
    }
    if (e.hasModule?.('flutlicht') && e.floodOn && e.powered) {
      _w.set(0, 0, CAB.GATE_Z + 1.1);
      const dist = Math.hypot(_w.x - hx, _w.z - hz);
      if (dist < 34 && los(_w.x, _w.z)) consider('flood', e, _w, 16 / (1 + dist / 8));
    }
    // Leuchten der Welt (auch die Lampen anderer Wesen)
    for (const f of d.game.pool.fixtures) {
      if (f.owner === this || f.isFlare || !f.on || f.drunk || !(f.intensity > 0.5) || (f.level ?? 1) < 0.35) continue;
      const dist = Math.hypot(f.pos.x - hx, f.pos.z - hz);
      if (dist > 20 || !los(f.pos.x, f.pos.z)) continue;
      consider('fixture', f, _v.set(f.pos.x, 0, f.pos.z), 3.2 * Math.min(1.5, f.intensity / 4) * hunger / (1 + dist / 6));
    }
    const cur = this.lure;
    // aktuelles Ziel noch gültig? Wechsel nur bei deutlich hellerem Licht
    if (cur && !this._lureValid(cur)) this.lure = null;
    if (!best) {
      if (this.lure?.kind === 'lamp') { this.lastSeen = this.lure.pos.clone(); this.lure = null; }
      if (!this.lure && (this.state === 'hunt' || this.state === 'seek')) this.setState(this.lastSeen ? 'seek' : 'roost');
      return;
    }
    if (this.lure && this.lure.ref === best.ref) { this.lure.pos.copy(best.pos); this.lure.score = best.score; return; }
    const threshold = d.phase === 'calm' ? 0.9 : 0.6;
    if ((!this.lure && best.score > threshold) || (this.lure && best.score > this.lure.score * 1.3)) {
      this.lure = best;
      if (this.state !== 'feast' || best.kind === 'lamp') this.setState(best.kind === 'lamp' ? 'hunt' : 'seek');
    }
  }

  _lureValid(l) {
    const d = this.d;
    switch (l.kind) {
      case 'lamp': return lampLevel(d) > 0.15 && !d.player.dead && !d.player.hidden;
      case 'flare': return !l.ref.dead && l.ref.t > 0.3;
      case 'cab': return d.elev.cabLight.intensity > 4 && !d.elev._falterinDark;
      case 'flood': return d.elev.floodOn && d.elev.powered;
      case 'fixture': return l.ref.on && !l.ref.drunk;
    }
    return false;
  }

  // ---------------------------------------------------------------- Fliegen

  // Freie Flugbahn (Wände über das Raster, Requisiten in Flughöhe)
  _flyClear(x0, z0, x1, z1) {
    if (!this.d.grid.lineOfSight(x0, z0, x1, z1)) return false;
    const y = this.pos.y + 0.9;
    return this.d.col.lineClear(x0, z0, x1, z1, y) && this.d.col.lineClear(x0, z0, x1, z1, this.pos.y + 0.2);
  }

  _fly(dt, tx, tz, speed, arrive = 0.6) {
    // direkt, wenn frei – sonst über das Raster
    if (this._flyClear(this.pos.x, this.pos.z, tx, tz)) { this.path = null; return this._step(dt, tx, tz, speed, arrive); }
    this.repathT -= dt;
    if (!this.path || this.repathT <= 0) { this.repathT = 0.8; if (!this.pathTo(tx, tz)) { this.repathT = 2; return true; } }
    while (this.pathI + 1 < this.path.length) {
      const [nx, nz] = this.path[this.pathI + 1];
      if (!this._flyClear(this.pos.x, this.pos.z, nx, nz)) break;
      this.pathI++;
    }
    if (this.pathI >= this.path.length) return this._step(dt, tx, tz, speed, arrive);
    const [wx, wz] = this.path[this.pathI];
    if (Math.hypot(wx - this.pos.x, wz - this.pos.z) < 0.5) this.pathI++;
    this._step(dt, wx, wz, speed, 0);
    return false;
  }

  _step(dt, tx, tz, speed, arrive) {
    const dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
    if (d < arrive) return true;
    // leichtes Taumeln wie ein Falter
    const wob = Math.sin(this.d.time * 3.3 + this.id) * 0.35;
    const s = Math.min(d, speed * dt);
    const ang = Math.atan2(dx, dz) + wob * 0.35;
    this.pos.x += Math.sin(ang) * s;
    this.pos.z += Math.cos(ang) * s;
    const y = this.pos.y;
    this.d.col.resolveCircle(this.pos, this.radius, y + 0.1, y + this.height);
    this.pos.y = y;
    this.faceToward(tx, tz, dt, 5);
    this.moving = true;
    return false;
  }

  _hover(dt, x, z, r, rate = 1.3) {
    // um eine Lichtquelle kreisen
    const a = this.d.time * rate + this.id;
    const tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r;
    this._step(dt, tx, tz, 2.2, 0);
    this.faceToward(x, z, dt, 6);
  }

  // ---------------------------------------------------------------- Zustände

  onState(s, prev) {
    this.moving = false;
    // unterbrochenes Mahl: Leuchte und Kabinenlicht wieder in Ruhe lassen
    if (prev === 'feast') {
      const e = this.d.elev;
      if (this._cabTapped && e.lightMode === 'flicker') e.lightMode = 'normal';
      this._cabTapped = false;
      for (const f of this.d.game.pool.fixtures) if (f._falterMode && !f.drunk) { f.mode = f._falterMode; f._falterMode = null; }
    }
    if (s === 'roost') { this.altTarget = FALTERIN.altRoost; this.roostT = 30 + Math.random() * 30; this.roostPos = null; }
    if (s === 'hunt') { audio.play('paperRustle', { pos: this.chest.clone(), vol: 0.5 }); if (this.distTo(this.d.player.pos) < 14) audio.play('mothScreech', { pos: this.chest.clone(), vol: 0.55 }); }
  }

  _roost(dt) {
    this.flap = 0.12; this.flapRate = 2.2;
    this.play(CLIP.hover, { fade: 0.6, speed: 0.4 });
    // ab und zu einen neuen dunklen Ruheplatz suchen
    this.roostT -= dt;
    if (this.roostT <= 0 && !this.roostPos) {
      for (let i = 0; i < 10 && !this.roostPos; i++) {
        const c = this.d.spawnCell(6, false);
        if (c && !this.d.lightAt(_v.set(c[0], 1.5, c[1])).lit) this.roostPos = c;
      }
      this.roostT = 40 + Math.random() * 30;
    }
    if (this.roostPos) {
      this.flap = 0.5; this.flapRate = 7;
      this.play(CLIP.fly, { fade: 0.5, speed: 0.7 });
      if (this._fly(dt, this.roostPos[0], this.roostPos[1], 1.4, 0.8)) this.roostPos = null;
    }
  }

  _seek(dt) {
    const l = this.lure;
    this.altTarget = FALTERIN.alt + 0.3;
    this.flap = 0.8; this.flapRate = 10;
    this.play(CLIP.fly, { fade: 0.4, speed: 0.9 });
    const tgt = l ? l.pos : this.lastSeen;
    if (!tgt) { this.setState('roost'); return; }
    // Kabine: vor dem Gitter halten
    let tx = tgt.x, tz = tgt.z;
    if (l && (l.kind === 'cab' || l.kind === 'flood')) { tx = 0; tz = CAB.GATE_Z + 1.2; }
    const arrived = this._fly(dt, tx, tz, FALTERIN.speedSeek, l?.kind === 'fixture' ? 1.2 : 0.9);
    if (arrived) {
      if (l) this.setState('feast');
      else { this.lastSeen = null; this.setState('roost'); }
    }
  }

  _feast(dt) {
    const l = this.lure, d = this.d, e = d.elev;
    if (!l || !this._lureValid(l)) { this.lure = null; this.setState('roost'); return; }
    this.flap = 0.9; this.flapRate = 13;
    this.play(CLIP.grab, { fade: 0.4 });
    if (this.stateT < 0.05) audio.play('mothDrink', { pos: this.chest.clone(), vol: 0.7, dur: l.kind === 'flare' ? FALTERIN.drinkFlare : FALTERIN.drinkFixture });
    let dur = FALTERIN.drinkFixture;
    if (l.kind === 'fixture') {
      this.altTarget = Math.max(FALTERIN.alt, (l.ref.pos.y ?? 2) - 1.3);
      this._hover(dt, l.ref.pos.x, l.ref.pos.z, 0.7);
      if (!l.ref._falterMode) l.ref._falterMode = l.ref.mode || 'steady';
      l.ref.mode = 'strobe';
    } else if (l.kind === 'flare') {
      dur = FALTERIN.drinkFlare;
      this.altTarget = 0.4;
      l.ref.drunkBy = this;
      this._hover(dt, l.ref.pos.x, l.ref.pos.z, 0.55, 2);
    } else {
      // Kabine: nur durch das offene Gitter. Sonst klopft sie wie eine Motte an der Scheibe.
      dur = FALTERIN.drinkCab;
      this.altTarget = FALTERIN.alt + 0.5;
      const open = e.gateOpen > 0.6;
      const gx = Math.sin(d.time * 1.7) * 1.1;
      this._step(dt, gx, open ? CAB.GATE_Z + 0.2 : CAB.GATE_Z + 0.55, 1.8, 0);
      this.faceToward(0, 0, dt, 6);
      if (!open) {
        this._tapT = (this._tapT ?? 0) - dt;
        if (this._tapT <= 0) { this._tapT = 0.5 + Math.random() * 0.9; audio.play('mothTap', { pos: _v.set(this.pos.x, this.pos.y + 1.2, CAB.GATE_Z + 0.1), vol: 0.55 }); e.shake = Math.max(e.shake, 0.08); }
        if (e.lightMode === 'normal') e.lightMode = 'flicker';
        this._cabTapped = true;
        if (this.stateT > 14) { e.lightMode = 'normal'; this.lure = null; this.setState('roost'); }
        return;
      }
    }
    if (this.stateT >= dur) this._drink(l);
  }

  _drink(l) {
    const d = this.d, e = d.elev, pos = this.chest.clone();
    audio.play('bulbPop', { pos, vol: 0.8 });
    d.game.sparks.burst(pos.x, pos.y + 0.3, pos.z, 14, 1.5, 1.1);
    if (l.kind === 'fixture') {
      // aus für diese Nacht (die LightPool dimmt auch die leuchtenden Teile der Lampe)
      l.ref.on = false; l.ref.drunk = true; l.ref.mode = l.ref._falterMode || 'steady'; l.ref._falterMode = null;
      this.stored = Math.min(1, this.stored + 0.3);
    }
    else if (l.kind === 'flare') { l.ref.t = Math.min(l.ref.t, 0.4); this.stored = Math.min(1, this.stored + 0.5); audio.play('flareIgnite', { pos, vol: 0.3 }); }
    else if (l.kind === 'flood') { e.setFlood?.(false); e._floodBroken = true; this.stored = 1; ui.toast('Das Flutlicht ist durchgebrannt.'); }
    else if (l.kind === 'cab') {
      e.lightMode = 'off';
      e._falterinDark = true;
      this.stored = 1;
      voice.say('v_falterin_cab', { interrupt: true });
      setTimeout(() => { if (e._falterinDark) { e._falterinDark = false; if (d.active && e.lightMode === 'off') { e.lightMode = 'normal'; audio.play('powerUp', { vol: 0.35 }); } } }, FALTERIN.cabDarkFor * 1000);
    }
    this.drinks++;
    this.lure = null;
    this.setState(this.drinks >= FALTERIN.maxDrinks ? 'sated' : 'roost');
  }

  _hunt(dt, dist) {
    const d = this.d, p = d.player;
    const l = this.lure;
    if (!l) { this.setState('roost'); return; }
    this.flap = 1; this.flapRate = 15;
    this.play(CLIP.fly, { fade: 0.3, speed: 1.2 });
    // in der Kabine hinter geschlossenem Gitter: klopfen
    if (d.elev.contains(p.pos) && d.elev.gateOpen < 0.6) {
      this.lure = { kind: 'cab', ref: d.elev, pos: new THREE.Vector3(0, 0, CAB.GATE_Z + 0.9), score: 5 };
      this.setState('feast');
      return;
    }
    this.altTarget = dist < 4 ? FALTERIN.altGrab + 0.5 : FALTERIN.alt;
    const speed = d.phase === 'hunt' ? FALTERIN.speedHuntLate : FALTERIN.speedHunt;
    this._fly(dt, p.pos.x, p.pos.z, speed * (d.diff ?? 1), 0.1);
    if (dist < 1.1 && !p.dead) this._startGrab();
  }

  _startGrab() {
    const d = this.d, p = d.player;
    if (p.dead || this.state === 'grab') return;
    this.setState('grab');
    this.grabBattery = p.battery;
    this.altTarget = FALTERIN.altGrab;
    this.play(CLIP.grab, { fade: 0.15 });
    audio.play('mothScreech', { pos: this.chest.clone(), vol: 1 });
    audio.play('stinger', { kind: 'hard', vol: 0.65 });
    d.R.glitchPulse(0.7);
    overlay.show('wings', 1.8);
    p.frozen = true;
    p.lookTarget = this.chest.clone().add(_v.set(0, 0.35, 0));
    p.lookSpeed = 10;
  }

  _grab(dt) {
    const d = this.d, p = d.player;
    this.flap = 0.35; this.flapRate = 18;
    // vor dem Gesicht halten
    const f = p.forward(_v); f.y = 0; f.normalize();
    this.pos.x += (p.pos.x + f.x * 0.55 - this.pos.x) * Math.min(1, dt * 8);
    this.pos.z += (p.pos.z + f.z * 0.55 - this.pos.z) * Math.min(1, dt * 8);
    this.faceToward(p.pos.x, p.pos.z, dt, 12);
    // Lampe wird leer getrunken
    const k = Math.min(1, this.stateT / 1.3);
    p.battery = Math.max(0, this.grabBattery * (1 - k));
    if (k >= 1 && p.lampOn) p.toggleLamp(false);
    if (this.stateT > 1.4 && !this._bit) {
      this._bit = true;
      const dmg = this.grabBattery < 0.1 ? FALTERIN.grabDamageDark : FALTERIN.grabDamage;
      d.hurt(dmg, this, 'falterin');
      audio.play('mothDrink', { pos: this.chest.clone(), vol: 0.9, dur: 1 });
      this.stored = 1;
    }
    if (this.stateT > 1.9) {
      p.frozen = false;
      p.lookTarget = null;
      this._bit = false;
      ui.toast('Die Lampe ist leer getrunken. Kurbeln – [R].');
      this.setState('sated');
    }
  }

  _sated(dt) {
    this.flap = 0.7; this.flapRate = 8;
    this.altTarget = FALTERIN.altRoost;
    this.play(CLIP.fly, { fade: 0.4, speed: 0.6 });
    if (!this.fleeTo) { const c = this.d.spawnCell(12, false); this.fleeTo = c || [this.pos.x, this.pos.z]; }
    const arrived = this._fly(dt, this.fleeTo[0], this.fleeTo[1], 2.6, 1);
    if ((arrived && this.stateT > FALTERIN.satedFor) || this.stateT > FALTERIN.satedFor * 1.6) { this.fleeTo = null; this.setState('roost'); }
  }

  _flee(dt) {
    this.flap = 1; this.flapRate = 16;
    this.play(CLIP.fly, { fade: 0.3, speed: 1.2 });
    if (!this.fleeTo) { const c = this.d.spawnCell(10, false); this.fleeTo = c || [this.pos.x, this.pos.z]; }
    this.altTarget = FALTERIN.altRoost;
    const arrived = this._fly(dt, this.fleeTo[0], this.fleeTo[1], 3.6, 1);
    if (arrived || this.stateT > this.fleeFor) { this.fleeTo = null; this.setState('roost'); }
  }

  _stunned(dt) {
    this.flap = 0; this.altTarget = 0; this.alt = Math.max(0, this.alt - dt * 4);
    if (this.stateT > FALTERIN.stunFor && !this._rising) { this._rising = true; this.play(CLIP.rise, { fade: 0.3, loop: false }); audio.play('paperRustle', { pos: this.chest.clone(), vol: 0.6 }); }
    if (this.stateT > FALTERIN.stunFor + 1.6) { this._rising = false; this.fleeFor = 20; this.ghost = true; this.setState('flee'); }
  }

  // ---------------------------------------------------------------- Treffer

  hit(kind, dir) {
    const d = this.d;
    if (this.state === 'stunned') return;
    if (this.state === 'grab') { d.player.frozen = false; d.player.lookTarget = null; }
    if (kind === 'shot' || kind === 'cannon' || kind === 'hammer') {
      // vom Himmel geholt: das gespeicherte Licht entweicht in einem Blitz
      if (this.stored > 0.15) { d.R.flashPulse?.(0.35 + this.stored * 0.5, 0xffd9a0); audio.play('lightBurst', { pos: this.chest.clone(), vol: 0.8 }); }
      this.stored = 0;
      audio.play('mothScreech', { pos: this.chest.clone(), vol: 1 });
      d.game.sparks.burst(this.pos.x, this.pos.y + 1, this.pos.z, 26, 2.2, 1.4);
      this.play(CLIP.fall, { fade: 0.1, loop: false });
      this.lure = null;
      this.setState('stunned');
      return;
    }
    // Brechstange: verscheucht
    audio.play('paperRustle', { pos: this.chest.clone(), vol: 0.8 });
    audio.play('mothScreech', { pos: this.chest.clone(), vol: 0.6 });
    if (dir) { this.pos.x += dir.x * 1.2; this.pos.z += dir.z * 1.2; }
    this.fleeFor = 10;
    this.lure = null;
    this.setState('flee');
  }

  // ---------------------------------------------------------------- Licht, Klang

  _updateGlow() {
    const g = this.glow;
    g.pos.set(this.pos.x, this.pos.y + 1.1, this.pos.z);
    g.intensity = this.stored * 5.5;
    g.on = this.stored > 0.05;
  }

  _updateSound(dt, dist) {
    const near = dist < 28 && this.state !== 'stunned';
    if (near && !this.flutter) this.flutter = audio.loop('mothFlutter', { pos: this.chest.clone(), vol: 0.001 });
    if (!near && this.flutter) { this.flutter.stop(0.8); this.flutter = null; }
    if (this.flutter) {
      this.flutter.setPos(this.chest);
      this.flutter.setVol(0.08 + this.flap * 0.4, 0.3);
      this.flutter.setRate?.(this.flapRate);
    }
  }

  _whisper(dt, dist) {
    this.whisperT -= dt;
    if (this.whisperT > 0 || dist > 12 || this.d.player.dead) return;
    this.whisperT = 22 + Math.random() * 20;
    voice.say(pick(['fa_1', 'fa_2', 'fa_3', 'fa_4', 'fa_5']), { pos: this.chest.clone() });
  }

  dispose() {
    this.flutter?.stop(0.3);
    this.d.game.pool.remove(this.glow);
    this.dressing.dispose();
    if (this.state === 'grab') { this.d.player.frozen = false; this.d.player.lookTarget = null; }
    super.dispose();
  }
}
