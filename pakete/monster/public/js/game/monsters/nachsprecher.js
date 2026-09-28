// Der Nachsprecher (Tiefenstufe IV): hat keine eigene Stimme – er hat alle anderen.
// Von weitem ein Mann der Mannschaft mit Lampe, den Rücken zugewandt. Er ruft mit geliehenen Stimmen
// (Dieter, Ada, Veit, die Vermittlerin, Hilferufe), schickt falsche Kom-Nachrichten und wartet, bis man
// nah genug ist. Dann dreht sich der Kopf. Dann der Rest.
//
// Erkennen: Dieter kommt nie herunter · die echte Vermittlerin spricht nur durchs Telefon (seine Stimmen
// kommen aus dem Raum) · jede echte Kom-Nachricht trägt das Codewort der Nacht.
// Konter: nicht hingehen · Stille (Lampe aus, still stehen): Stille erträgt er nicht, er zieht weiter ·
// Fackel/Flutlicht blendet ihn · Salzflinte wirft ihn um · Salzlinie · Versteck.
// Mehrspieler (später): feedVoice(peerId, AudioBuffer) – er ruft dann mit echten Stimmen der Mannschaft.
//
// Zustände: lure (steht, ruft) → move (neuer Lockplatz, nur ungesehen) → reveal → hunt → retreat

import * as THREE from 'three';
import { Monster } from './base.js';
import { audio } from '../../audio/audio.js';
import { voice } from '../../audio/voice.js';
import { ui } from '../../ui/ui.js';
import { nameWithLetters, letterCount, saveCampaign } from '../state.js';
import { monsterize, PROFILES } from '../../gfx/monsterize.js';
import { charFor, packFirstSight, pick, lampHits, lampLevel } from './kit.js';
import { dress } from './standin.js';
import { PACK_KOM } from '../../story/lines-monster.js';

const _v = new THREE.Vector3();

export const NACHSPRECHER = {
  speedSneak: 1.6, speedHunt: 4.6,
  callEvery: [13, 22], callRange: 32,
  revealNear: 3.2, revealLamp: 1.1, revealLampRange: 9,
  huntMax: 8, loseAfter: 2.2, damage: 45,
  silenceFor: 8, relocateAfter: 55,
  fakeKomEvery: [70, 120], fakeKomMax: 3,
  stealLetterOnKill: true,
};

const CLIP = { stand: 'Idle_Lantern_Loop', walk: 'Walk_Loop', turn: 'Zombie_Idle_Loop', hunt: 'Sprint_Loop', grab: 'Punch_Cross', fall: 'Death01', rise: 'LayToIdle', cover: 'Hit_Head' };
const CALLS = ['ns_dieter_1', 'ns_dieter_2', 'ns_ada_1', 'ns_ada_2', 'ns_verm_1', 'ns_veit_1', 'ns_crew_1', 'ns_crew_2'];
const LATE_CALLS = ['ns_verm_2', 'ns_ada_1', 'ns_crew_1'];

export class Nachsprecher extends Monster {
  constructor(director) {
    const c = charFor('nachsprecher');
    super(director, { char: c.id, profile: 'nachsprecher', radius: 0.3, height: 1.8 });
    this.type = 'nachsprecher';
    this.radarKind = 'crew';        // auch auf dem Horchgerät ein Mann der Mannschaft
    // eigenes Profil je Exemplar: der Kopf wird zur Laufzeit gedreht
    this.wahrKey = 'nachsprecher_wahr_' + this.id;
    PROFILES[this.wahrKey] = JSON.parse(JSON.stringify(PROFILES.nachsprecher_wahr));
    this.headRot = PROFILES[this.wahrKey].bones.head.rot;
    this.warps = { tarn: this.warp, wahr: monsterize(this.ch, this.wahrKey) };
    this.dressing = dress('nachsprecher', this);
    this.lampFix = director.game.pool.add({ pos: new THREE.Vector3(), color: 0xfff0d6, intensity: 3.5, distance: 8, mode: 'steady', flicker: 0.02, on: true, meshes: [], priority: 1.5, owner: this });
    this.callT = 6 + Math.random() * 6;
    this.silentT = 0;
    this.ignoredT = 0;
    this.open = 0;
    this.faceBack = false;
    this.lampOn = 1;
    this.voices = new Map();        // Mehrspieler: gesammelte Stimmen der Mannschaft
    this.play(CLIP.stand, { fade: 0 });
    this.ch.randomize();
    this.setState('lure');
  }

  get chasing() { return this.state === 'hunt'; }
  cannonTarget() { return this.state === 'hunt' || this.state === 'reveal'; }

  // ---------------------------------------------------------------- Mehrspieler-Anschluss
  // Kurze Schnipsel aus dem Sprachchat (1–3 s). Er behält die letzten fünf je Stimme.
  feedVoice(peerId, buffer) {
    if (!buffer) return;
    const list = this.voices.get(peerId) || [];
    list.push(buffer);
    while (list.length > 5) list.shift();
    this.voices.set(peerId, list);
  }

  _playStolen() {
    const all = [...this.voices.values()].flat();
    if (!all.length || !audio.ready) return false;
    const buf = pick(all);
    const A = audio, t = A.now + 0.02;
    const o = A.out({ bus: 'voice', pos: this.chest.clone(), vol: 1, rev: 0.4, ref: 2 });
    const s = A.ctx.createBufferSource();
    s.buffer = buf; s.playbackRate.value = 0.97 + Math.random() * 0.05;
    s.connect(o.input); s.start(t);
    return true;
  }

  // ---------------------------------------------------------------- Denken

  think(dt) {
    const d = this.d, p = d.player;
    this.onScreen = d.seen(this);
    const dist = this.distTo(p.pos);
    this.moving = false;
    switch (this.state) {
      case 'lure': this._lure(dt, dist); break;
      case 'move': this._move(dt, dist); break;
      case 'reveal': this._reveal(dt, dist); break;
      case 'hunt': this._hunt(dt, dist); break;
      case 'stagger': this._stagger(dt); break;
      case 'retreat': this._retreat(dt); break;
    }
    // Lampe: Tarnung an, Jagd aus
    const lf = this.lampFix;
    this.dressing.lampWorld(lf.pos);
    lf.intensity = 3.5 * this.lampOn;
    lf.on = this.lampOn > 0.05;
    this.dressing.setLamp(this.lampOn);
  }

  animate(dt) {
    super.animate(dt);
    if (this.onScreen || this.distTo(this.d.player.pos) < 30) this.dressing.update(dt, { time: this.d.time }, { open: this.open, faceBack: this.faceBack });
  }

  // Profil wechseln: vorher alle Streckungen zurücksetzen, sonst bleiben lange Arme stehen
  _useWarp(which) {
    const w = this.warps[which];
    if (this.warp === w) return;
    this.ch.model.traverse(b => { if (b.isBone) b.scale.set(1, 1, 1); });
    this.warp = w;
  }

  // Ein dunkler Lockplatz: nicht im Blick, 10–20 m vom Spieler, möglichst mit dem Rücken zum Gang
  _pickSpot() {
    const d = this.d, p = d.player;
    for (let i = 0; i < 40; i++) {
      const c = d.spawnCell(10, true);
      if (!c) break;
      const dd = Math.hypot(c[0] - p.pos.x, c[1] - p.pos.z);
      if (dd > 22) continue;
      if (d.lightAt(_v.set(c[0], 1.2, c[1])).lit) continue;
      return c;
    }
    return d.spawnCell(8, true);
  }

  _lure(dt, dist) {
    const d = this.d, p = d.player;
    this._useWarp('tarn');
    this.open = Math.max(0, this.open - dt * 2);
    this.lampOn += (1 - this.lampOn) * Math.min(1, dt * 2);
    this.play(CLIP.stand, { fade: 0.5 });
    // Rücken zum Spieler (er „sieht woanders hin“), Lampe an die Wand
    const away = Math.atan2(this.pos.x - p.pos.x, this.pos.z - p.pos.z);
    this.faceToward(this.pos.x + Math.sin(away), this.pos.z + Math.cos(away), dt, 1.5);
    const exposed = !p.dead && !p.hidden;
    if (!exposed) return;
    // Rufen
    this.callT -= dt;
    if (this.callT <= 0 && dist < NACHSPRECHER.callRange) {
      const [a, b] = NACHSPRECHER.callEvery;
      this.callT = a + Math.random() * (b - a);
      this._call(dist);
    }
    // Stille: Lampe aus, kein Laut, nah genug – das erträgt er nicht
    const silent = lampLevel(d) < 0.1 && p.noise <= 0.01 && dist < 14;
    this.silentT = silent ? this.silentT + dt : Math.max(0, this.silentT - dt * 0.5);
    if (this.silentT > NACHSPRECHER.silenceFor * 0.6 && !this._urged) { this._urged = true; voice.say('ns_crew_2', { pos: this.chest.clone() }); }
    if (this.silentT > NACHSPRECHER.silenceFor) { this.silentT = 0; this._urged = false; this.spot = this._pickSpot(); if (this.spot) this.setState('move'); return; }
    // wird ignoriert → näher an den Spieler heran
    this.ignoredT += dt;
    if (dist > 24 || this.ignoredT > NACHSPRECHER.relocateAfter) { this.ignoredT = 0; this.spot = this._pickSpot(); if (this.spot) this.setState('move'); return; }
    // Enthüllung: zu nah – oder zu lange angeleuchtet
    const lit = dist < NACHSPRECHER.revealLampRange && lampHits(d, this.chest);
    this.litT = lit ? (this.litT || 0) + dt : 0;
    if (dist < 12 && this.onScreen) packFirstSight(d, 'nachsprecher');
    if ((dist < NACHSPRECHER.revealNear && d.grid.lineOfSight(this.pos.x, this.pos.z, p.pos.x, p.pos.z)) || this.litT > NACHSPRECHER.revealLamp) this.setState('reveal');
  }

  _call(dist) {
    const d = this.d, st = d.state;
    // Mit gestohlenen Stimmen (Mehrspieler) – sonst geliehene Zeilen
    if (this.voices.size && Math.random() < 0.7 && this._playStolen()) return;
    // Nach einem Treffer kennt er den Namen (nur Untertitel – Namen werden nicht vertont)
    if (st.flags.pk_mimicName && Math.random() < 0.3) {
      audio.play('whisper', { pos: this.chest.clone(), vol: 0.6, dur: 0.9 });
      voice.text('ns_crew_m', `${nameWithLetters(st.name || '', st.letters || 0)}? … ${nameWithLetters(st.name || '', st.letters || 0)}!`, 2.2, 'mimic');
      return;
    }
    const late = d.game.clock > 165;
    voice.say(pick(late && Math.random() < 0.5 ? LATE_CALLS : CALLS), { pos: this.chest.clone() });
  }

  _move(dt, dist) {
    const d = this.d;
    this._useWarp('tarn');
    const s = this.spot;
    if (!s) { this.setState('lure'); return; }
    // nur ungesehen gehen – im Blick bleibt er stehen und dreht den Rücken zu
    if (this.onScreen && d.lightAt(this.chest).lit) { this.play(CLIP.stand, { fade: 0.3 }); return; }
    this.repathT -= dt;
    if (!this.path || this.repathT <= 0) { this.repathT = 1.5; if (!this.pathTo(s[0], s[1])) { this.setState('lure'); return; } }
    const bar = d.blockedByBarrier(this.pos.x, this.pos.z, 0.35);
    if (bar) { this.setState('lure'); return; }
    this.play(CLIP.walk, { fade: 0.4 });
    this.moving = true;
    if (this.follow(dt, NACHSPRECHER.speedSneak, 0.6)) this.setState('lure');
  }

  onState(s, prev) {
    if (s === 'reveal') {
      const d = this.d;
      audio.play('mimicScream', { pos: this.chest.clone(), vol: 1 });
      audio.play('stinger', { kind: 'reveal', vol: 0.7 });
      d.R.glitchPulse(0.7);
      d.spike = Math.max(d.spike, 0.9);
      voice.text('ns_crew_m', '»Hier rüber – Seilkind – Kind – hilf mir – hier – HIER«', 1.8, 'mimic');
      this.play(CLIP.turn, { fade: 0.2 });
    }
    if (s === 'hunt') { this.huntT = 0; this.lostT = 0; }
    if (s === 'lure') { this.litT = 0; this.silentT = 0; }
  }

  // Kopf dreht sich zuerst (Körper bleibt abgewandt), dann schnappt der Körper herum
  _reveal(dt, dist) {
    const p = this.d.player;
    this._useWarp('wahr');
    this.faceBack = true;
    this.open = Math.min(1, this.open + dt * 1.2);
    this.lampOn = Math.max(0, this.lampOn - dt * 1.5);
    if (this.stateT > 1.3) {
      this.faceBack = false;
      this.yaw = Math.atan2(p.pos.x - this.pos.x, p.pos.z - this.pos.z);
      this.root.rotation.y = this.yaw;
      audio.play('passengerCrack', { pos: this.chest.clone(), vol: 1 });
      this.setState('hunt');
    }
  }

  _hunt(dt, dist) {
    const d = this.d, p = d.player;
    this._useWarp('wahr');
    this.headRot[1] = 0;       // Kopf wieder nach vorn – nun zeigt alles zu dir
    this.open = 1;
    this.lampOn = 0;
    this.huntT += dt;
    // heiliges Licht blendet
    if (d.lightAt(this.chest).holy) { this.setState('stagger'); this.staggerFor = 1.5; return; }
    const sees = !p.dead && !p.hidden && d.grid.lineOfSight(this.pos.x, this.pos.z, p.pos.x, p.pos.z);
    if (sees) { this.lostT = 0; this.last = [p.pos.x, p.pos.z]; } else this.lostT += dt;
    if (this.lostT > NACHSPRECHER.loseAfter || this.huntT > NACHSPRECHER.huntMax || p.dead) { this.setState('retreat'); return; }
    const bar = d.blockedByBarrier(this.pos.x, this.pos.z, 0.35);
    if (bar) { this.stepToward(this.pos.x + (this.pos.x - bar.x), this.pos.z + (this.pos.z - bar.z), 1.5, dt); return; }
    if (sees && dist < 1.2) { this._catch(); return; }
    const [tx, tz] = this.last || [p.pos.x, p.pos.z];
    this.repathT -= dt;
    if (!this.path || this.repathT <= 0) { this.repathT = 0.4; this.pathTo(tx, tz); }
    const a = this.play(CLIP.hunt, { fade: 0.15 });
    if (a) a.timeScale = 1.25;
    this.moving = true;
    if (this.follow(dt, NACHSPRECHER.speedHunt * (d.diff ?? 1), 0.5) && !sees) this.setState('retreat');
    this._screamT = (this._screamT ?? 1) - dt;
    if (this._screamT <= 0) { this._screamT = 2 + Math.random() * 2; audio.play('mimicScream', { pos: this.chest.clone(), vol: 0.6 }); }
  }

  _catch() {
    const d = this.d, p = d.player, st = d.state;
    this.play(CLIP.grab, { fade: 0.1, loop: false });
    audio.play('mimicScream', { pos: this.chest.clone(), vol: 1 });
    audio.play('stinger', { kind: 'hard', vol: 0.8 });
    d.R.glitchPulse(1);
    p.lookTarget = this.chest.clone().add(_v.set(0, 0.5, 0));
    p.lookSpeed = 12;
    setTimeout(() => { if (p.lookTarget) p.lookTarget = null; }, 500);
    const wasHp = d.game.hp;
    d.hurt(NACHSPRECHER.damage, this, 'nachsprecher');
    st.flags.pk_mimicName = true;
    // Wer ihm stirbt, dem nimmt er einen Buchstaben des Namens (nie den letzten)
    if (NACHSPRECHER.stealLetterOnKill && wasHp <= NACHSPRECHER.damage && st.name) {
      const left = letterCount(st.name) - (st.letters || 0);
      if (left > 1) { st.letters = (st.letters || 0) + 1; saveCampaign(st); setTimeout(() => ui.komMessage(`${nameWithLetters(st.name, st.letters)}. ES HAT EINEN BUCHSTABEN GELERNT.`, { glitch: true }), 2600); }
    }
    this.setState('retreat');
  }

  _stagger(dt) {
    this.play(this.staggerFor > 3 ? CLIP.fall : CLIP.cover, { fade: 0.1, loop: this.staggerFor <= 3 });
    if (this.stateT > this.staggerFor) this.setState(this.distTo(this.d.player.pos) < 14 ? 'hunt' : 'retreat');
  }

  _retreat(dt) {
    const d = this.d;
    this._useWarp('wahr');
    this.open = Math.max(0, this.open - dt * 0.5);
    if (!this.away) this.away = d.spawnCell(14, true) || [this.pos.x, this.pos.z];
    this.play(CLIP.walk, { fade: 0.4 });
    this.moving = true;
    this.repathT -= dt;
    if (!this.path || this.repathT <= 0) { this.repathT = 2; this.pathTo(this.away[0], this.away[1]); }
    const done = this.follow(dt, 2.4, 0.8);
    if ((done && this.stateT > 12) || this.stateT > 30) {
      // wieder Mensch werden
      this.headRot[1] = Math.PI;
      this.away = null;
      this.open = 0;
      this.setState('lure');
    }
  }

  hit(kind, dir) {
    const d = this.d;
    audio.play('mimicScream', { pos: this.chest.clone(), vol: 0.9 });
    d.game.sparks.burst(this.pos.x, 1.3, this.pos.z, 12, 1.5, 0.8);
    if (this.state === 'lure' || this.state === 'move') { this.setState('reveal'); return; }
    this.staggerFor = kind === 'shot' || kind === 'cannon' || kind === 'hammer' ? 5 : 1.2;
    if (dir) { this.pos.x += dir.x * 0.8; this.pos.z += dir.z * 0.8; d.col.resolveCircle(this.pos, this.radius, 0.2, 1.6); }
    this.setState('stagger');
  }

  dispose() {
    this.d.game.pool.remove(this.lampFix);
    this.dressing.dispose();
    delete PROFILES[this.wahrKey];
    super.dispose();
  }
}

// ============================================================================ Codewort & falsche Kom-Nachrichten
// Läuft in jeder Nacht ab Tiefenstufe IV (und immer, wenn ein Nachsprecher unten ist):
// Dieter gibt ein Codewort aus und nennt es in jeder echten Nachricht. Der Nachsprecher kennt es nicht.

export class Codeword {
  constructor(director, words, { withMimic = false } = {}) {
    this.d = director;
    const rng = director.rng;
    this.word = words[rng.int(0, words.length - 1)];
    const parts = this.word.split('-');
    const nums = ['EINS', 'ZWEI', 'DREI', 'VIER', 'FÜNF', 'SECHS', 'SIEBEN', 'ACHT', 'NEUN', 'ZEHN', 'ELF', 'ZWÖLF'].filter(n => n !== parts[1]);
    this.wrong = `${parts[0]}-${nums[rng.int(0, nums.length - 1)]}`;
    this.withMimic = withMimic;
    this.sent = {};
    this.fakes = 0;
    this.fakeT = 90 + rng.float(0, 40);
  }

  update(dt, clock) {
    const s = this.sent, K = PACK_KOM;
    const say = (key, at, text) => { if (clock >= at && !s[key]) { s[key] = true; ui.komMessage(text); } };
    say('start', 3, K.k_code.replace('{code}', this.word));
    say('mid', 62, K.k_code_2.replace('{code}', this.word));
    say('late', 142, K.k_code_3.replace('{code}', this.word).replace('{min}', String(Math.max(1, 187 - Math.round(clock)))));
    if (!this.withMimic || this.fakes >= NACHSPRECHER.fakeKomMax) return;
    this.fakeT -= dt * ((this.d.phase === 'calm') ? 1 : 1.6);
    if (this.fakeT <= 0) {
      const [a, b] = NACHSPRECHER.fakeKomEvery;
      this.fakeT = a + Math.random() * (b - a);
      this.fakes++;
      const text = pick([K.k_fake_1, K.k_fake_2, K.k_fake_3, K.k_fake_4]).replace('{wrong}', this.wrong);
      ui.komMessage(text, { glitch: Math.random() < 0.3 });
    }
  }
}
