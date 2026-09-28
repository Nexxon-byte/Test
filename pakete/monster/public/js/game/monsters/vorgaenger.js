// Die Vorgänger (ab Tiefenstufe II): Echos einer Mannschaft, die nie zurückkam. Zwei bis drei Gestalten
// mit kalten Lampen arbeiten ihre letzte Nacht ab: Sie bergen Beute und tragen sie in ihr Lager
// (dort, wo einmal ihre Kabine hielt). Auf dem Horchgerät sehen sie aus wie die eigene Mannschaft.
// Solange man ihnen nichts wegnimmt, halten sie einen für Kollegen. Wer ihnen etwas vor der Nase
// wegschnappt oder mit ihrer Beute gesehen wird, den jagen sie – und reißen es ihm aus der Hand.
// Zur Stunde ihres Todes (02:05 – 02:45) holt die Dunkelheit sie. Zurück bleiben das Lager und ihre Marken.
//
// Konter: nichts wegnehmen, solange sie hinsehen · ihr Lager plündern, wenn sie unterwegs sind ·
// Fackel/Flutlicht: im heiligen Licht verblassen sie und können nichts greifen · Versteck · Kabine.

import * as THREE from 'three';
import { Monster } from './base.js';
import { CAB } from '../../world/cab.js';
import { DIRS, FLOOR } from '../../world/levelgen.js';
import { audio } from '../../audio/audio.js';
import { voice } from '../../audio/voice.js';
import { ui } from '../../ui/ui.js';
import { chalkTexture, glowTexture } from '../../gfx/textures.js';
import { charFor, packFirstSight, pick } from './kit.js';
import { dress } from './standin.js';
import { ECHO_CREWS } from '../../story/lines-monster.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();

export const VORGAENGER = {
  speedWork: 1.45, speedClaim: 3.1,
  sight: 16, claimSight: 14,
  snatchDamage: 15, snatchCd: 2.2,
  calmAfter: 10, pickTime: 1.8, dropTime: 1.2,
  endFrom: 125, endTo: 165,              // Spielminuten: 02:05 … 02:45
  lamp: 0xa8ccff, lampAngry: 0xff5a3a,
};

// Namen auf den übrigen Marken
const CREW_NAMES = ['A. Brückner', 'L. Hain', 'T. Fenske', 'M. Olbrich', 'R. Seidel', 'K. Wendel', 'J. Pfau', 'E. Kranz', 'P. Aschoff', 'H. Lind'];

const CLIP = { walk: 'Walk_Loop', carry: 'Walk_Carry_Loop', idle: 'Idle_Lantern_Loop', look: 'Idle_Loop', pick: 'PickUp_Table', run: 'Jog_Fwd_Loop', grab: 'Punch_Cross', fear: 'Crouch_Idle_Loop', talk: 'Idle_Talking_Loop' };

// ============================================================================ Ein Mitglied

export class Vorgaenger extends Monster {
  constructor(director, crew, i) {
    const c = charFor('vorgaenger', { next: () => ((crew.info.n * 7 + i * 3) % 10) / 10 });
    super(director, { char: c.id, profile: 'vorgaenger', radius: 0.3, height: 1.75 });
    this.type = 'vorgaenger';
    this.radarKind = 'crew';        // Horchgerät: sieht aus wie die eigene Mannschaft
    this.crew = crew;
    this.idx = i;
    this.carry = null;
    this.snatchCd = 0;
    this.fade = 1;
    this.dressing = dress('vorgaenger', this, { crew: crew.info });
    this.lampFix = director.game.pool.add({ pos: new THREE.Vector3(), color: VORGAENGER.lamp, intensity: 4.5, distance: 9, mode: 'steady', flicker: 0.06, on: true, meshes: [], priority: 1.5, owner: this });
    this.play(CLIP.idle, { fade: 0 });
    this.ch.randomize();
    this.setState('work');
  }

  get chasing() { return this.crew.angry && this.state !== 'fade'; }
  cannonTarget() { return this.crew.angry; }
  get ghost() { return this.fade < 0.6 || this.state === 'gone'; }

  think(dt) {
    const d = this.d, p = d.player;
    this.onScreen = d.seen(this);
    this.snatchCd -= dt;
    this.moving = false;
    // Heiliges Licht: verblassen und erstarren
    const holy = d.lightAt(this.chest).holy;
    const target = this.state === 'end' ? this.fade : holy ? 0.25 : 1;
    this.fade += (target - this.fade) * Math.min(1, dt * (holy ? 5 : 1.5));
    this.dressing.setFade(this.fade);
    if (holy && !this._wasHoly) audio.play('echoVanish', { pos: this.chest.clone(), vol: 0.35 });
    this._wasHoly = holy;
    if (holy && this.state !== 'end') { this.play(CLIP.fear, { fade: 0.3 }); this._syncLamp(); return; }
    if (this.onScreen && this.distTo(p.pos) < VORGAENGER.sight) packFirstSight(d, 'vorgaenger');
    this.crew.think(this, dt);
    this._syncLamp();
    // getragenes Stück in der Hand
    if (this.carry) {
      const hand = this.ch.handR || this.ch.handL;
      if (hand) { hand.getWorldPosition(_v); this.carry.mesh.position.set(_v.x, _v.y - 0.12, _v.z); this.carry.mesh.visible = this.fade > 0.3; }
    }
  }

  animate(dt) {
    super.animate(dt, this.state === 'end' ? 0.35 : 1);
    if (this.onScreen || this.distTo(this.d.player.pos) < 30) this.dressing.update(dt, { time: this.d.time }, { aim: this.aim ?? 0, sweep: this.sweep ?? 0 });
  }

  _syncLamp() {
    const f = this.lampFix;
    this.dressing.lampWorld(f.pos);
    f.color = this.crew.angry ? VORGAENGER.lampAngry : VORGAENGER.lamp;
    f.intensity = 4.5 * this.fade * (this.state === 'end' ? (Math.random() < 0.3 ? 0.1 : 1) : 1);
    f.on = this.state !== 'gone';
  }

  // Gehen mit Salzlinie und Kabinengrenze (sie betreten die Neunte nie – sie finden sie nicht mehr)
  walkTo(dt, x, z, speed, clip, arrive = 0.6) {
    const bar = this.d.blockedByBarrier(this.pos.x, this.pos.z, 0.35);
    if (bar) { this.stepToward(this.pos.x + (this.pos.x - bar.x), this.pos.z + (this.pos.z - bar.z), 1.2, dt); return true; }
    this.repathT -= dt;
    if (!this.path || this.repathT <= 0 || this.goal.distanceTo(_v.set(x, 0, z)) > 1.2) { this.repathT = 1; if (!this.pathTo(x, z)) { this.repathT = 3; return true; } }
    const a = this.play(clip, { fade: 0.35 });
    if (a) a.timeScale = speed / (clip === CLIP.run ? 3 : 1.4);
    this.moving = true;
    const done = this.follow(dt, speed, arrive);
    if (this.pos.z < CAB.GATE_Z + 0.6 && Math.abs(this.pos.x) < CAB.W / 2 + 0.4) this.pos.z = CAB.GATE_Z + 0.6;
    return done;
  }

  hit(kind, dir) {
    const d = this.d;
    audio.play('echoVanish', { pos: this.chest.clone(), vol: 0.5 });
    d.game.sparks.burst(this.pos.x, 1.3, this.pos.z, 10, 1.3, 0.8);
    if (dir) { this.pos.x += dir.x * (kind === 'melee' ? 0.6 : 1.4); this.pos.z += dir.z * (kind === 'melee' ? 0.6 : 1.4); d.col.resolveCircle(this.pos, this.radius, 0.2, 1.6); }
    this.fade = 0.2;
    this.stunT = kind === 'melee' ? 1.5 : 4;
    this.crew.provoke(kind === 'melee' ? 'schlag' : 'schuss');
  }

  dispose() {
    this.d.game.pool.remove(this.lampFix);
    if (this.carry) this.crew.dropCarry(this, this.pos.x, this.pos.z);
    this.dressing.dispose();
    super.dispose();
  }
}

// ============================================================================ Die Mannschaft

export class EchoCrew {
  constructor(director, { info = null, count = 0 } = {}) {
    this.d = director;
    const rng = director.rng;
    this.info = info || ECHO_CREWS[rng.int(0, ECHO_CREWS.length - 1)];
    this.label = `ECHO · MANNSCHAFT ${this.info.n}`;
    this.members = [];
    this.angry = false;
    this.calmT = 0;
    this.talkT = 6 + rng.float(0, 8);
    this.endAt = rng.int(VORGAENGER.endFrom, VORGAENGER.endTo);
    this.ended = false;
    this.pileCount = 0;
    this.target = null;
    this.depot = null;
    this.count = count || rng.int(2, 3);
    this.decor = [];
    this.murmur = null;
  }

  get leader() { return this.members.find(m => !m.removed && m.state !== 'gone') || null; }

  spawn() {
    const d = this.d;
    this._makeDepot();
    const cell = d.spawnCell(14, true);
    if (!cell) return false;
    for (let i = 0; i < this.count; i++) {
      const m = new Vorgaenger(d, this, i);
      m.place(cell[0] + (i % 2 ? 0.8 : -0.8) * (i > 0 ? 1 : 0), cell[1] + (i > 1 ? 0.9 : 0));
      this.members.push(m);
      d.monsters.push(m);
    }
    return true;
  }

  // Lager: eine Sackgasse weit hinten, wo einmal ihre Kabine hielt – Kreidestriche, Kerzenstummel, Beute
  _makeDepot() {
    const d = this.d, g = d.grid, level = d.level;
    let best = null, bd = -1;
    for (let z = 1; z < g.h - 1; z++) for (let x = 1; x < g.w - 1; x++) {
      if (!g.walkable(x, z) || g.isLanding(x, z) || g.isCabin(x, z)) continue;
      const dist = g.dist[g.idx(x, z)];
      if (dist < 7) continue;
      let open = 0;
      for (const dir of DIRS) if (g.get(x + dir.dx, z + dir.dz) === FLOOR) open++;
      const score = dist + (open === 1 ? 12 : open === 2 ? 3 : 0) + d.rng.float(0, 4);
      if (score > bd) { bd = score; best = [x, z]; }
    }
    if (!best) best = [g.ex, g.ez + 3];
    const [wx, wz] = level.center(best[0], best[1]);
    this.depot = new THREE.Vector3(wx, 0, wz);
    // Kreide an der nächsten Wand: Nummer und Strichliste
    const slots = level.wallSlots([best], 0.03);
    const R = d.R;
    if (slots.length) {
      const s = slots[0];
      const tex = chalkTexture(`MANNSCHAFT ${this.info.n}\n||||  ||||  ||||  |||`, { w: 512, h: 256, size: 46 });
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.85), new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, emissive: 0x404850, emissiveMap: tex, emissiveIntensity: 0.25 }));
      m.position.set(s.x, 1.55, s.z);
      m.rotation.y = s.ry;
      R.scene.add(m);
      this.decor.push(m);
    }
    // Kerzenstummel
    for (let i = 0; i < 4; i++) {
      const a = d.rng.float(0, Math.PI * 2), r = d.rng.float(0.5, 1.0);
      const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x9fc8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8 }));
      c.position.set(wx + Math.cos(a) * r, 0.08, wz + Math.sin(a) * r);
      c.scale.setScalar(0.12);
      R.scene.add(c);
      this.decor.push(c);
    }
    // alte Funde der Mannschaft liegen schon da
    const items = d.game.items, LOOTS = ['walze', 'leuchter', 'zelle', 'zahnrad', 'kelch', 'spule', 'weihrauch', 'roehre'];
    const n = d.rng.int(2, 3);
    for (let i = 0; i < n; i++) {
      const type = pick(LOOTS, d.rng.next());
      const a = d.rng.float(0, Math.PI * 2), r = d.rng.float(0.3, 0.9);
      const x = wx + Math.cos(a) * r, z = wz + Math.sin(a) * r;
      if (!d.col.pointFree(x, z, 0.2, 0.05, 0.6)) continue;
      const it = items.spawn(type, x, 0, z, { value: Math.round((30 + d.rng.float(0, 40)) * (1 + (d.info?.stage || 2) * 0.35)) });
      it.echoOwner = this;
      d.game._itemEntry?.(it);
      this.pileCount++;
    }
    this.fixture = d.game.pool.add({ pos: new THREE.Vector3(wx, 0.3, wz), color: 0x8fb8ff, intensity: 1.4, distance: 4, mode: 'candle', on: true, meshes: [], owner: this });
  }

  pile() { return [...this.d.game.items.items.values()].filter(it => it.echoOwner === this && !it.holder && it.pos.distanceTo(this.depot) < 2.2); }

  // ------------------------------------------------ Takt (je Mitglied aufgerufen)

  think(m, dt) {
    const d = this.d, p = d.player;
    if (m.state === 'end' || m.state === 'gone') { this._end(m, dt); return; }
    if (m.stunT > 0) { m.stunT -= dt; m.play(CLIP.fear, { fade: 0.2 }); return; }
    // Die Spieluhr: Sie halten inne und hören zu – sie erinnern sich an etwas
    const box = d.game._musicbox?.source;
    if (box && m.distTo(box) < 20) { m.play(CLIP.look, { fade: 0.5 }); m.faceToward(box.x, box.z, dt, 2); m.sweep = 0; if (m === this.leader) this.calmT += dt; return; }
    // Uhrzeit ihres Todes
    if (!this.ended && d.game.clock >= this.endAt) { this._startEnd(); return; }
    if (m === this.leader) this._leaderTick(dt);
    if (this.angry) { this._claim(m, dt); return; }
    // wer sie mit ihrer Beute sieht …
    if (!p.dead && !p.hidden && this._seesOwned(m)) { this.provoke('dieb'); return; }
    if (m === this.leader) this._work(m, dt);
    else this._escort(m, dt);
  }

  _leaderTick(dt) {
    const d = this.d, p = d.player, L = this.leader;
    const dist = L.distTo(p.pos);
    // Stimmen der Mannschaft
    this.talkT -= dt;
    if (this.talkT <= 0) {
      this.talkT = 14 + d.rng.float(0, 14);
      if (dist < 22 && !p.dead) {
        const lines = this.angry ? ['e_6', 'e_7'] : ['e_1', 'e_2', 'e_3', 'e_4', 'e_5', 'e_9', 'e_10'];
        if (!this.angry && dist < 10 && !d.state.flags.pk_echo_dieter) { d.state.flags.pk_echo_dieter = true; lines.length = 0; lines.push('e_8'); }
        const who = this.members[d.rng.int(0, this.members.length - 1)];
        if (who && !who.removed) voice.say(pick(lines, d.rng.next()), { pos: who.chest.clone(), label: this.label });
      }
    }
    // Gemurmel
    const near = dist < 26;
    if (near && !this.murmur) this.murmur = audio.loop('echoMurmur', { pos: L.chest.clone(), vol: 0.001 });
    if (!near && this.murmur) { this.murmur.stop(1); this.murmur = null; }
    if (this.murmur) { this.murmur.setPos(L.chest); this.murmur.setVol(this.angry ? 0.35 : 0.2, 0.5); }
    // Zorn legt sich
    if (this.angry) {
      const anyNear = this.members.some(mm => !mm.removed && mm.distTo(p.pos) < 25);
      const owned = this._playerOwned();
      if (p.dead || p.hidden || d.elev.contains(p.pos) || !anyNear || !owned.length && this.snatched) this.calmT += dt; else this.calmT = 0;
      if (this.calmT > VORGAENGER.calmAfter) { this.angry = false; this.calmT = 0; this.snatched = false; for (const mm of this.members) mm.setState('work'); }
    }
  }

  // ------------------------------------------------ Arbeit

  _work(m, dt) {
    const d = this.d;
    m.sweep = Math.sin(d.time * 0.7 + m.idx) * 0.5;
    if (m.carry) {
      if (m.walkTo(dt, this.depot.x, this.depot.z, VORGAENGER.speedWork, CLIP.carry, 0.8)) {
        m.dropT = (m.dropT || 0) + dt;
        m.play(CLIP.pick, { fade: 0.2, loop: false });
        if (m.dropT > VORGAENGER.dropTime) {
          m.dropT = 0;
          // zählen: fehlt etwas?
          const before = this.pileCount, now = this.pile().length;
          this.dropCarry(m, this.depot.x + d.rng.float(-0.7, 0.7), this.depot.z + d.rng.float(-0.7, 0.7));
          this.pileCount = now + 1;
          if (now < before) { voice.say('e_10', { pos: m.chest.clone(), label: this.label }); this.suspicious = 25; }
        }
      }
      return;
    }
    if (this.suspicious > 0) {
      // Es fehlt etwas: sie suchen rund um das Lager
      this.suspicious -= dt;
      m.play(CLIP.look, { fade: 0.4 });
      m.sweep = Math.sin(d.time * 2.1) * 1.1;
      if (!m.path || m.stateT > 4) { m.stateT = 0; const a = d.rng.float(0, Math.PI * 2); m.pathTo(this.depot.x + Math.cos(a) * 4, this.depot.z + Math.sin(a) * 4); }
      m.follow(dt, VORGAENGER.speedWork, 0.8);
      return;
    }
    // Ziel wählen
    let it = this.target;
    if (!it || it.holder || !d.game.items.items.has(it.id) || it.echoOwner === this) it = this.target = this._pickTarget(m);
    if (!it) {
      // nichts mehr da: herumstehen, zählen, nach der Uhrzeit fragen
      m.play(CLIP.talk, { fade: 0.5 });
      if (!m.wanderTo || m.stateT > 10) { m.stateT = 0; const c = d.spawnCell(4, false); m.wanderTo = c; }
      if (m.wanderTo) m.walkTo(dt, m.wanderTo[0], m.wanderTo[1], VORGAENGER.speedWork * 0.7, CLIP.walk, 1);
      return;
    }
    it.echoClaim = this;
    if (m.walkTo(dt, it.pos.x, it.pos.z, VORGAENGER.speedWork, CLIP.walk, 0.8)) {
      m.pickT = (m.pickT || 0) + dt;
      m.faceToward(it.pos.x, it.pos.z, dt, 6);
      m.play(CLIP.pick, { fade: 0.2, loop: false });
      if (m.pickT > VORGAENGER.pickTime) {
        m.pickT = 0;
        d.game.items.take(it.id, 'echo');
        it.echoOwner = this;
        it.echoClaim = null;
        m.carry = it;
        this.target = null;
        audio.play('pickup', { pos: m.chest.clone(), vol: 0.2 });
      }
    }
  }

  _pickTarget(m) {
    const d = this.d;
    let best = null, bd = 30;
    for (const it of d.game.items.items.values()) {
      if (it.holder || it.tool || it.echoOwner || (it.echoClaim && it.echoClaim !== this)) continue;
      if (d.elev.contains(it.pos, -0.5)) continue;
      const dd = m.distTo(it.pos);
      if (dd < bd) { bd = dd; best = it; }
    }
    return best;
  }

  _escort(m, dt) {
    const L = this.leader, d = this.d;
    if (!L || L === m) return;
    // hinter dem Anführer, Lampe schweift umher
    const off = m.idx === 1 ? [-1.3, -1.6] : [1.3, -2.2];
    const s = Math.sin(L.yaw), c = Math.cos(L.yaw);
    const tx = L.pos.x + off[0] * c + off[1] * s, tz = L.pos.z - off[0] * s + off[1] * c;
    m.sweep = Math.sin(d.time * 0.9 + m.idx * 2) * 0.9;
    m.aim = Math.sin(d.time * 0.5 + m.idx) * 0.15;
    if (Math.hypot(tx - m.pos.x, tz - m.pos.z) > 0.8) m.walkTo(dt, tx, tz, VORGAENGER.speedWork * 1.15, m.carry ? CLIP.carry : CLIP.walk, 0.6);
    else { m.play(CLIP.idle, { fade: 0.5 }); m.faceToward(L.pos.x + Math.sin(L.yaw) * 3, L.pos.z + Math.cos(L.yaw) * 3, dt, 2); }
  }

  // ------------------------------------------------ Diebe

  _playerOwned() {
    const inv = this.d.game.inv;
    return [inv.hands, ...inv.slots].filter(it => it && it.echoOwner === this);
  }

  _seesOwned(m) {
    const d = this.d, p = d.player;
    if (!this._playerOwned().length) return false;
    const dist = m.distTo(p.pos);
    if (dist > VORGAENGER.claimSight) return false;
    if (!d.grid.lineOfSight(m.pos.x, m.pos.z, p.pos.x, p.pos.z)) return false;
    // Blickrichtung (mit Lampe) – oder sehr nah
    const a = Math.atan2(p.pos.x - m.pos.x, p.pos.z - m.pos.z) - m.yaw;
    return dist < 3 || Math.cos(a) > 0.2;
  }

  // Spieler hat ein Stück aufgehoben (von pack.js gemeldet)
  onPlayerPickup(it) {
    if (it.echoClaim === this) { it.echoOwner = this; it.echoClaim = null; this.target = null; }
    if (it.echoOwner !== this) return;
    const d = this.d, p = d.player;
    const seen = this.members.some(m => !m.removed && m.fade > 0.5 && m.distTo(p.pos) < VORGAENGER.claimSight && d.grid.lineOfSight(m.pos.x, m.pos.z, p.pos.x, p.pos.z));
    if (seen) this.provoke('dieb');
  }

  provoke(why) {
    if (this.ended) return;
    const d = this.d;
    if (!this.angry) {
      this.angry = true;
      this.calmT = 0;
      audio.play('stinger', { kind: 'soft', vol: 0.4 });
      const L = this.leader;
      if (L) voice.say(why === 'dieb' ? 'e_7' : 'e_6', { pos: L.chest.clone(), label: this.label, interrupt: true });
      d.spike = Math.max(d.spike, 0.5);
    }
  }

  _claim(m, dt) {
    const d = this.d, p = d.player;
    m.sweep = 0; m.aim = 0;
    if (p.dead || p.hidden || d.elev.contains(p.pos)) { m.play(CLIP.look, { fade: 0.3 }); m.faceToward(p.pos.x, p.pos.z, dt, 3); return; }
    const dist = m.distTo(p.pos);
    if (dist < 1.15 && m.snatchCd <= 0 && m.fade > 0.6) { this._snatch(m); return; }
    m.walkTo(dt, p.pos.x, p.pos.z, VORGAENGER.speedClaim * (d.diff ?? 1), CLIP.run, 0.9);
  }

  _snatch(m) {
    const d = this.d, g = d.game, inv = g.inv;
    // die Mannschaft greift nur einmal gleichzeitig zu
    if (this.snatchT > d.time) return;
    this.snatchT = d.time + VORGAENGER.snatchCd;
    m.snatchCd = VORGAENGER.snatchCd;
    m.play(CLIP.grab, { fade: 0.1, loop: false });
    audio.play('echoVanish', { pos: m.chest.clone(), vol: 0.4 });
    d.R.glitchPulse(0.35);
    const owned = this._playerOwned();
    const all = owned.length ? owned : [inv.hands, ...inv.slots].filter(it => it && !it.tool).sort((a, b) => b.value - a.value);
    const it = all[0];
    if (it && !m.carry) {
      if (inv.hands === it) inv.hands = null; else inv.slots[inv.slots.indexOf(it)] = null;
      inv._refresh?.();
      it.holder = 'echo';
      it.echoOwner = this;
      m.carry = it;
      ui.toast(`Mannschaft ${this.info.n} nimmt dir ${it.def.name} ab.`);
      g._updateKom?.();
      this.snatched = true;
    }
    d.hurt(VORGAENGER.snatchDamage, m, 'vorgaenger');
    // Zurückgeholt ist zurückgeholt: Wer nichts mehr von ihnen trägt, ist wieder ein Kollege
    if (!this._playerOwned().length) {
      this.angry = false;
      this.calmT = 0;
      voice.say('e_4', { pos: m.chest.clone(), label: this.label });
      for (const mm of this.members) if (!mm.removed && mm.state !== 'gone') mm.setState('work');
    }
  }

  dropCarry(m, x, z) {
    const it = m.carry;
    if (!it) return;
    m.carry = null;
    const items = this.d.game.items;
    if (!items.items.has(it.id)) return;
    items.drop(it, x, 0, z, Math.random() * 6);
    it.echoOwner = this;
    this.d.game._itemEntry?.(it);
  }

  // ------------------------------------------------ Das Ende ihrer Nacht

  _startEnd() {
    const d = this.d;
    this.ended = true;
    this.angry = false;
    for (const m of this.members) if (!m.removed) { m.setState('end'); m.endT = d.rng.float(0, 1.5); }
    const L = this.leader, p = d.player;
    if (L && L.distTo(p.pos) < 30) {
      voice.say('e_9', { pos: L.chest.clone(), label: this.label });
      setTimeout(() => { if (!L.removed) voice.say(Math.random() < 0.5 ? 'e_end_1' : 'e_end_2', { pos: L.chest.clone(), label: this.label }); }, 4200);
    }
  }

  _end(m, dt) {
    const d = this.d;
    if (m.state === 'gone') return;
    // erst verwirrt umherblicken, dann holt sie das Dunkel
    const t = m.stateT - (m.endT || 0);
    m.play(t < 3.5 ? CLIP.look : CLIP.fear, { fade: 0.3 });
    m.faceToward(m.pos.x + Math.sin(d.time * 1.9 + m.idx), m.pos.z + Math.cos(d.time * 1.9 + m.idx), dt, 3);
    m.sweep = Math.sin(d.time * 3 + m.idx) * 1.2;
    if (t > 5) m.fade = Math.max(0, m.fade - dt * 0.6);
    if (t > 5 && !m._vanishSnd) { m._vanishSnd = true; audio.play('echoVanish', { pos: m.chest.clone(), vol: 0.7 }); }
    if (m.fade <= 0.02 && m.state !== 'gone') {
      if (m.carry) this.dropCarry(m, m.pos.x, m.pos.z);
      // Marke bleibt liegen
      const it = d.game.items.spawn('marke', m.pos.x, 0, m.pos.z, { value: 25 + d.rng.int(0, 15), data: { crew: this.info.n } });
      it.def = { ...it.def, name: m.idx === 0 ? this.info.tag : `Marke der Mannschaft ${this.info.n} · ${CREW_NAMES[(this.info.n * 3 + m.idx) % CREW_NAMES.length]}` };
      d.game._itemEntry?.(it);
      m.setState('gone');
      m.root.visible = false;
      m.lampFix.on = false;
      if (this.members.every(mm => mm.state === 'gone')) this._finish();
    }
  }

  _finish() {
    const d = this.d;
    this.murmur?.stop(2); this.murmur = null;
    // Lager ist jetzt herrenlos
    for (const it of this.pile()) it.echoOwner = null;
    if (this.fixture) this.fixture.mode = 'dying';
    d.state.flags[`pk_echo_${this.info.n}`] = (d.state.flags[`pk_echo_${this.info.n}`] || 0) + 1;
  }

  update(dt) {
    // Mitglieder, die weg sind, aus der Monsterliste nehmen
    const d = this.d;
    for (const m of this.members) if (m.state === 'gone' && !m.removed) { m.dispose(); d.monsters.splice(d.monsters.indexOf(m), 1); }
  }

  dispose() {
    this.murmur?.stop(0.3);
    for (const o of this.decor) { o.removeFromParent(); o.material?.map?.dispose?.(); o.material?.dispose?.(); o.geometry?.dispose?.(); }
    if (this.fixture) this.d.game.pool.remove(this.fixture);
  }
}
