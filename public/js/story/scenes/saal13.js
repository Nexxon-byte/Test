// Kapitel −13 „Der Saal der Vierzig“ (Twist 1: Die Reliquie ist leer).
// Im Festsaal der Ersten Fahrt steht neben der Bühne der Schrein der Vermittlerin. Darin: die
// Stimmreliquie – eine Walze ohne Rillen. Am Kopf der Tafel sitzt Anselm, der stumme Koch der
// Vierzig. Wer ihn anspricht, nimmt ihn mit nach oben (→ Garküche, state.flags.anselm).

import * as THREE from 'three';
import { Monster } from '../../game/monsters/base.js';
import { GoldMark } from '../../game/goldmark.js';
import { Builder, coneGeometry } from '../../gfx/geo.js';
import { mat } from '../../gfx/materials.js';
import { CS } from '../../world/levelgen.js';
import { CAB } from '../../world/cab.js';
import { audio } from '../../audio/audio.js';
import { voice } from '../../audio/voice.js';
import { ui } from '../../ui/ui.js';
import { DOCS } from '../docs.js';
import { SLATE } from '../lines.js';
import { saveCampaign } from '../../game/state.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
const SEAT_Y = 0.475, SIT_BACK = 0.28, SIT_PELVIS = 0.39;

export class Saal13 {
  constructor({ game, level, contract, chapter, rng }) {
    this.g = game;
    this.level = level;
    this.c = contract;
    this.ch = chapter;
    this.rng = rng;
    this.group = new THREE.Group();
    this.group.name = 'Saal13';
    this.colliders = [];
    this.entries = [];
    this.fixtures = [];
    this.marks = [];
    this.opened = false;
    this.opening = 0;
    this.relic = null;
    this.taken = false;
    this.flags = {};
    this.anselm = null;
  }

  // ---------------------------------------------------------------- Aufbau

  setup() {
    const g = this.g;
    g.R.scene.add(this.group);
    this._placeShrine();
    this._placeAnselm();
  }

  // Nische neben der Bühne: Schrein, Vorhänge, Kerzen, Tafel
  _placeShrine() {
    const g = this.g, lv = this.level, hall = lv.anchors.hall, st = lv.anchors.stage;
    let spot = null;
    if (hall && st) {
      const wCells = hall.x1 - hall.x0 + 1;
      const stageW = Math.min(8, wCells * CS - 2);
      const hx0 = lv.center(hall.x0, 0)[0] - CS / 2, hx1 = lv.center(hall.x1, 0)[0] + CS / 2;
      const sz = st.z + 0.4;                     // Zellmitte der letzten Hallenreihe
      const z = sz + 0.3;
      for (const side of [1, -1]) {
        const edge = side > 0 ? st.x + stageW / 2 : st.x - stageW / 2;
        const wall = side > 0 ? hx1 : hx0;
        const gap = Math.abs(wall - edge);
        if (gap < 1.15) continue;
        const x = edge + side * gap / 2;
        if (g.col.pointFree(x, z - 0.6, 0.35, 0.2, 1.6)) { spot = { x, z, ry: Math.PI }; break; }
      }
      // sonst: vor der Bühnenmitte
      spot ||= { x: st.x, z: st.z - 2.2, ry: Math.PI };
    } else {
      const cells = lv.farCells(6);
      const [x, z] = lv.center(...cells[0]);
      spot = { x, z, ry: Math.PI };
    }
    this.spot = spot;
    const root = new THREE.Group();
    root.position.set(spot.x, 0, spot.z);
    root.rotation.y = spot.ry;
    this.group.add(root);
    this.shrine = root;

    const b = new Builder();
    // Sockel, Korpus, Säulen, Gesims, Dach
    b.box(mat('marbleDark'), 0, 0.075, 0, 1.36, 0.15, 0.72);
    b.box(mat('gold'), 0, 0.155, 0, 1.3, 0.02, 0.66);
    // hohler Korpus: Rückwand, Seiten, Deckel, Boden – innen Samt
    b.box(mat('walnut'), 0, 1.0, -0.28, 1.1, 1.7, 0.04);
    for (const x of [-0.525, 0.525]) b.box(mat('walnut'), x, 1.0, -0.05, 0.05, 1.7, 0.46);
    b.box(mat('walnut'), 0, 1.83, -0.05, 1.1, 0.05, 0.46);
    b.box(mat('walnut'), 0, 0.18, -0.05, 1.1, 0.05, 0.46);
    b.box(mat('fabricRed'), 0, 1.0, -0.255, 1.0, 1.6, 0.01);             // Samtfutter
    for (const x of [-0.495, 0.495]) b.box(mat('fabricRed'), x, 1.0, -0.06, 0.01, 1.6, 0.4);
    b.box(mat('gold'), 0, 0.93, -0.09, 0.96, 0.035, 0.36);              // Bord
    b.box(mat('gold'), 0, 0.95, 0.09, 0.96, 0.012, 0.012);              // Leiste
    for (const x of [-0.6, 0.6]) {
      b.cyl(mat('gold'), x, 0.17, 0.22, 0.045, 0.05, 1.72, 10);
      b.cyl(mat('gold'), x, 1.9, 0.22, 0.07, 0.05, 0.06, 10);
    }
    b.box(mat('gold'), 0, 1.93, 0.0, 1.32, 0.1, 0.62);
    b.box(mat('walnut'), 0, 2.0, 0.0, 1.22, 0.05, 0.54);
    b.add(mat('gold'), coneGeometry(0.62, 0.42, 4), 0, 2.24, 0, 0, Math.PI / 4, 0);
    b.add(mat('gold'), new THREE.TorusGeometry(0.16, 0.02, 6, 24, Math.PI).toNonIndexed(), 0, 2.06, 0.3, 0, 0, 0);
    b.box(mat('gold'), 0, 2.12, 0.305, 0.012, 0.13, 0.01, { rz: -0.5 });
    // Tafel am Sockel
    b.box(mat('brassDark'), 0, 0.09, 0.365, 0.42, 0.1, 0.012);
    // Vorhänge links und rechts (Samt, schwer)
    for (const x of [-0.95, 0.95]) {
      b.box(mat('fabricRed'), x, 1.7, -0.15, 0.38, 3.2, 0.05, { ry: x > 0 ? -0.25 : 0.25 });
      b.box(mat('gold'), x, 3.3, -0.15, 0.42, 0.06, 0.08);
    }
    // Kerzenständer
    const candles = [];
    for (const x of [-0.95, 0.95]) {
      b.cyl(mat('gold'), x, 0, 0.45, 0.13, 0.16, 0.05, 10);
      b.cyl(mat('gold'), x, 0.05, 0.45, 0.022, 0.03, 1.15, 8);
      b.cyl(mat('gold'), x, 1.2, 0.45, 0.1, 0.05, 0.05, 10);
      for (const dx of [-0.07, 0, 0.07]) { b.cyl(mat('bone'), x + dx, 1.25, 0.45, 0.018, 0.018, 0.2 - Math.abs(dx), 6); candles.push([x + dx, 1.47 - Math.abs(dx), 0.45]); }
    }
    const body = b.build();
    root.add(body);

    // Türen (Scharniere außen), mit Goldrand und halbem Zifferblatt
    this.doors = [];
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.45, 1.02, 0.2);
      const db = new Builder();
      db.box(mat('walnut'), -side * 0.225, 0, 0.012, 0.45, 1.44, 0.035);
      db.box(mat('gold'), -side * 0.225, 0.7, 0.032, 0.45, 0.03, 0.01);
      db.box(mat('gold'), -side * 0.225, -0.7, 0.032, 0.45, 0.03, 0.01);
      db.box(mat('gold'), -side * 0.44, 0, 0.032, 0.02, 1.44, 0.01);
      db.add(mat('gold'), new THREE.TorusGeometry(0.14, 0.012, 5, 16, Math.PI / 2).toNonIndexed(), 0, 0.15, 0.034, 0, 0, side > 0 ? Math.PI / 2 : 0);
      db.box(mat('brass'), -side * 0.03, -0.05, 0.05, 0.02, 0.1, 0.02);   // Griff
      pivot.add(db.build());
      root.add(pivot);
      this.doors.push({ pivot, side });
    }
    root.updateMatrixWorld(true);
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    // Kerzenflammen + warmes Licht
    const ctx = lv.ctx;
    for (const [x, y, z] of candles) ctx?.candle(...this._w(x, y, z).toArray(), false);
    this._fixture(0.95, 1.6, 0.45, { color: 0xff9a40, intensity: 2.2, distance: 6, mode: 'candle' });
    this._fixture(-0.95, 1.6, 0.45, { color: 0xff9a40, intensity: 2.2, distance: 6, mode: 'candle' });
    this.inner = this._fixture(0, 1.55, 0.05, { color: 0xffc070, intensity: 0, distance: 1.8, mode: 'candle' });

    // Kollision
    const c = this._w(0, 0, 0);
    this.colliders.push(g.col.add({ minX: c.x - 0.7, maxX: c.x + 0.7, minZ: c.z - 0.4, maxZ: c.z + 0.4, minY: 0, maxY: 2.4, tag: 'story' }));

    // Benutzen: Schrein öffnen, Tafel lesen
    this.entries.push(g.interact.add({
      tag: 'story', pos: this._w(0, 1.1, 0.35), radius: 0.55, maxDist: 2.4, priority: 0.2,
      prompt: 'Schrein der Vermittlerin öffnen', sub: 'Berühren verboten',
      enabled: () => !this.opened && !g.busy, onUse: () => this._open(),
    }));
    this.entries.push(g.interact.add({
      tag: 'story', pos: this._w(0, 0.1, 0.4), radius: 0.3, maxDist: 2.0, priority: 0.25,
      prompt: 'Tafel am Schrein lesen', enabled: () => !g.busy,
      onUse: () => {
        const d = DOCS.d_reliquie;
        if (d) g._openPanel(() => ui.doc(d, d.text));
        const docs = (g.state.docs ||= []);
        if (!docs.includes('d_reliquie')) { docs.push('d_reliquie'); saveCampaign(g.state); }
      },
    }));
    this.shrineMark = new GoldMark(g.R.scene, this._w(0, 0, 0.6), true);
    this.marks.push(this.shrineMark);
  }

  // lokaler Schreinpunkt → Welt
  _w(x, y, z) { return _w.set(x, y, z).applyMatrix4(this.shrine.matrixWorld).clone(); }

  _fixture(x, y, z, o) {
    const f = this.g.pool.add({ pos: this._w(x, y, z), meshes: [], on: true, ...o });
    this.fixtures.push(f);
    return f;
  }

  // Anselm sitzt am Kopf der Tafel, am nächsten zur Bühne
  _placeAnselm() {
    if (this.g.state.flags.anselm) return;          // schon oben in der Garküche
    const seats = this.level.anchors.seats || [];
    const st = this.level.anchors.stage;
    if (!seats.length) return;
    const seat = seats.slice().sort((a, b) => (st ? Math.hypot(a.pos[0] - st.x, a.pos[1] - st.z) - Math.hypot(b.pos[0] - st.x, b.pos[1] - st.z) : 0))[0];
    this.anselm = new Anselm(this, seat);
    this.entries.push(this.g.interact.add({
      tag: 'story', pos: () => _v.set(this.anselm.pos.x, 1.2, this.anselm.pos.z), radius: 0.5, maxDist: 2.4, priority: 0.2,
      prompt: () => this.anselm.state === 'sit' ? 'Anselm · Koch der Vierzig' : 'Anselm',
      sub: () => this.anselm.state === 'sit' ? 'Er schreibt etwas auf seine Tafel' : '',
      enabled: () => !this.g.busy, onUse: () => this._talkAnselm(),
    }));
  }

  // ---------------------------------------------------------------- Ablauf

  arrive() {
    voice.sequence(['v_e3_arrive', 'v_e3_relic'], 0.8);
    setTimeout(() => ui.komMessage('DER SAAL DER VIERZIG. DER SCHREIN STEHT NEBEN DER BÜHNE. GOLDEN GEZEICHNET. – D.'), 9000);
  }

  _open() {
    const g = this.g;
    this.opened = true;
    audio.play('cableCreak', { pos: this._w(0, 1, 0.3), vol: 0.6 });
    audio.play('doorSlide', { pos: this._w(0, 1, 0.3), vol: 0.25, dur: 1.6 });
    setTimeout(() => audio.play('whisper', { pos: this._w(0, 1.2, 0.2), vol: 0.5, dur: 2.4 }), 700);
    g.R.glitchPulse(0.25);
    this.g.director.spike = Math.max(this.g.director.spike, 0.5);
    // Kerzen ducken sich im Luftzug
    for (const f of this.fixtures) if (f.mode === 'candle') { f.mode = 'dying'; setTimeout(() => { f.mode = 'candle'; }, 2200); }
    // die Reliquie liegt auf dem Bord
    const p = this._w(0, 0.95, -0.09);
    const it = g.items.spawn('reliquie', p.x, p.y, p.z, { value: 150 + this.rng.int(0, 30), ry: this.spot.ry });
    it.contract = this.c.id;
    g._itemEntry(it);
    this.relic = it;
    this.relicMark = new GoldMark(g.R.scene, it.pos);
    this.marks.push(this.relicMark);
    this.shrineMark.dispose();
    this.marks = this.marks.filter(m => m !== this.shrineMark);
  }

  _talkAnselm() {
    const g = this.g, a = this.anselm;
    if (a.state === 'sit') {
      g._openPanel(() => ui.doc({ title: 'Anselm schreibt auf seine Tafel', style: 'chalk', meta: 'KOCH DER VIERZIG · STUMM SEIT DER ERSTEN FAHRT' }, SLATE.anselm_come)).then(() => a.rise());
    } else {
      const lines = ['anselm_1', 'anselm_2', 'anselm_4', 'anselm_6', 'anselm_7'];
      ui.toast(`Anselm schreibt: „${SLATE[lines[(this._talkN = (this._talkN || 0) + 1) % lines.length]]}“`);
    }
  }

  update(dt) {
    const g = this.g, p = g.player;
    this.anselm?.update(dt);
    if (this.relicMark) this.relicMark.follow(this.relic.pos);
    for (const m of this.marks) m.update(dt, m === this.relicMark ? !this.relic.holder && !g.elev.contains(this.relic.pos) : !this.opened);

    // Türen schwingen auf
    if (this.opened && this.opening < 1) {
      this.opening = Math.min(1, this.opening + dt / 1.6);
      const k = 1 - Math.pow(1 - this.opening, 3);
      for (const d of this.doors) d.pivot.rotation.y = d.side * -1.85 * k;
      this.inner.intensity = 0.8 * k;
    }

    // Die Vermittlerin wird unruhig, wenn man dem Schrein nahe kommt
    const ds = Math.hypot(p.pos.x - this.spot.x, p.pos.z - this.spot.z);
    if (!this.flags.near && ds < 8) { this.flags.near = true; voice.say('v_e3_shrine', { interrupt: true }); audio.play('stinger', { kind: 'soft', vol: 0.3 }); }

    // Anselm zum ersten Mal gesehen
    const a = this.anselm;
    if (a && !this.flags.cook && a.distTo(p.pos) < 14 && g.director.canSeePoint(_v.set(a.pos.x, 1.2, a.pos.z))) {
      this.flags.cook = true;
      voice.say('v_e3_merchant', { delay: 0.4 });
    }

    // Twist: die Walze hat keine Rillen
    if (this.relic && !this.taken && this.relic.holder) {
      this.taken = true;
      g.R.glitchPulse(0.9);
      audio.play('stinger', { kind: 'reveal', vol: 0.7 });
      voice.say('r_e3_1', { interrupt: true, delay: 0.6 });
      setTimeout(() => voice.say('r_e3_2'), 9000);
      ui.komMessage('DIE WALZE HAT KEINE RILLEN.', { glitch: true });
      g.director.spike = Math.max(g.director.spike, 0.9);
      if (a && a.distTo(p.pos) < 8) a.shake();
      // die Vierzig werden unruhig
      setTimeout(() => { if (g.mode === 'night') g.director.scares.trigger('apparition'); }, 6000);
    }
  }

  // Kom-Pfeil: erst der Schrein, dann die Reliquie (solange sie liegt)
  targets() {
    if (!this.opened) return [new THREE.Vector3(this.spot.x, 0, this.spot.z)];
    if (this.relic && !this.relic.holder && !this.g.elev.contains(this.relic.pos)) return [this.relic.pos];
    return [];
  }

  done(items) { return !!this.relic && items.some(it => it.id === this.relic.id); }

  // Abrechnung: Reliquie oben? Anselm in der Kabine?
  settle(brought, state) {
    const g = this.g;
    const ok = this.done(brought);
    const cook = this.anselm && g.elev.contains(this.anselm.pos);
    if (ok) {
      state.flags.story13 = true;
      state.flags.relicEmpty = true;
      if (this.relic) this.relic.def = { ...this.relic.def, name: 'Stimmreliquie (leer)' };
    }
    if (cook) state.flags.anselm = true;
    (g.afterReport ||= []).push(() => {
      if (cook) { ui.komMessage('ANSELM IST OBEN. DIE GARKÜCHE HAT WIEDER OFFEN. – D.'); ui.toast('Anselm setzt sich hinter den Tresen der Garküche und wischt ihn ab. Sechshundert Jahre Staub.'); }
      if (ok) {
        setTimeout(() => voice.sequence(['v_e3_after', 'v_e3_after2'], 1), cook ? 5000 : 1500);
        setTimeout(() => ui.komMessage('DIE KANZLEI WILL DIE RELIQUIE. DIE STUMMEN AUCH. VEIT ODER HANNE. – D.'), cook ? 14000 : 9000);
      }
    });
    return ok;
  }

  dispose() {
    this.group.removeFromParent();
    for (const c of this.colliders) this.g.col.remove(c);
    for (const e of this.entries) this.g.interact.remove(e);
    for (const f of this.fixtures) this.g.pool.remove(f);
    for (const m of this.marks) m.dispose();
    this.anselm?.dispose();
  }
}

// Anselm: sitzt, nickt, steht auf und folgt – in der Kabine setzt er sich in die Ecke
class Anselm extends Monster {
  constructor(scene, seat) {
    super(scene.g.director, { char: 'anselm', radius: 0.28, height: 1.72 });
    this.type = 'companion';
    this.scene = scene;
    this.seat = seat;
    const [sx, sz] = seat.pos;
    this.pos.set(sx + Math.sin(seat.ry) * SIT_BACK, SEAT_Y - SIT_PELVIS, sz + Math.cos(seat.ry) * SIT_BACK);
    this.yaw = seat.ry;
    this.root.rotation.y = seat.ry;
    this.play('Sitting_Idle_Loop', { fade: 0 });
    this.ch.randomize();
    this.state = 'sit';
    this.tipT = 35;
  }

  rise() {
    if (this.state !== 'sit') return;
    this.setState('nod');
    this.play('Sitting_Talking_Loop', { fade: 0.3 });
  }

  shake() { this._shakeT = 2.5; }

  think(dt) {
    const d = this.d, p = d.player, e = d.elev;
    const eye = _v.set(p.pos.x, p.pos.y + p.eye, p.pos.z);
    const dist = this.distTo(p.pos);
    if (this._shakeT > 0) { this._shakeT -= dt; this.play('Idle_No_Loop', { fade: 0.3 }); this.ch.lookAt(eye, 0.8); return; }
    switch (this.state) {
      case 'sit':
        this.ch.lookAt(dist < 6 ? eye : null, 0.7);
        break;
      case 'nod':
        this.ch.lookAt(eye, 0.8);
        if (this.stateT > 1.4) {
          // aufstehen: freien Platz neben dem Stuhl suchen (erst nach hinten, dann ringsum)
          const [sx, sz] = this.seat.pos;
          const back = this.seat.ry + Math.PI;
          let spot = null;
          for (const r of [0.6, 0.85, 1.1, 1.4]) {
            for (const da of [0, 0.5, -0.5, 1.0, -1.0, 1.5, -1.5, Math.PI]) {
              const x = sx + Math.sin(back + da) * r, z = sz + Math.cos(back + da) * r;
              if (d.col.pointFree(x, z, 0.32, 0.2, 1.6) && d.grid.lineOfSight(sx, sz, x, z)) { spot = [x, z]; break; }
            }
            if (spot) break;
          }
          spot ||= [sx - Math.sin(this.seat.ry) * 0.6, sz - Math.cos(this.seat.ry) * 0.6];
          this.pos.set(spot[0], 0, spot[1]);
          this.play('Yes', { fade: 0.2, loop: false });
          this.setState('follow');
          audio.play('footstep', { surface: 'carpet', intensity: 0.5, pos: this.pos.clone().setY(0.1) });
        }
        break;
      case 'follow': {
        if (this.stateT < 1.2) break;
        const inCab = e.contains(p.pos);
        // in der Kabine: in die hintere rechte Ecke
        if (inCab && (e.contains(this.pos) || dist < 6)) {
          // freie Ecke suchen (Module können Ecken belegen)
          if (!this.corner) this.corner = [[1.9, -1.4], [-1.9, -1.4], [1.9, 0.6], [-1.9, 0.6], [0.4, -1.5]].find(([x, z]) => d.col.pointFree(x, z, 0.32, 0.2, 1.6)) || [0, -1];
          const [cx, cz] = this.corner;
          if (Math.hypot(this.pos.x - cx, this.pos.z - cz) < 0.35 || (e.contains(this.pos) && this.stuckFor > 3)) { this.setState('cab'); break; }
          this.stuckFor = (this.stuckFor || 0) + (this.stuckT > 0 ? dt : 0);
          this._walk(dt, cx, cz, 1.6);
          break;
        }
        if (dist > 2.3) this._walk(dt, p.pos.x, p.pos.z, Math.min(3.6, Math.max(1.6, dist * 0.9)));
        else { this.play('Idle_Loop', { fade: 0.4 }); this.faceToward(p.pos.x, p.pos.z, dt, 4); this.ch.lookAt(eye, 0.6); }
        // ab und zu ein Tafelspruch
        this.tipT -= dt;
        if (this.tipT <= 0 && dist < 6) { this.tipT = 45 + Math.random() * 30; this.scene._talkAnselm(); }
        break;
      }
      case 'cab':
        this.play('Idle_Loop', { fade: 0.5 });
        this.faceToward(0, CAB.LANDING_Z, dt, 3);
        this.ch.lookAt(dist < 5 ? eye : null, 0.6);
        break;
    }
  }

  // Zwischen Stühlen und Tischen zwängt er sich kurz durch, statt hängen zu bleiben
  stepToward(tx, tz, speed, dt, turnRate = 8) {
    if (this.squeezeT > 0) {
      this.squeezeT -= dt;
      const dx = tx - this.pos.x, dz = tz - this.pos.z, l = Math.hypot(dx, dz);
      if (l > 1e-4) { const s = Math.min(l, speed * 0.7 * dt); this.pos.x += dx / l * s; this.pos.z += dz / l * s; }
      this.faceToward(tx, tz, dt, turnRate);
      return;
    }
    super.stepToward(tx, tz, speed, dt, turnRate);
    if (this.stuckT > 0.3 && !this.d.elev.contains(this.pos, -0.3)) { this.squeezeT = 0.7; this.stuckT = 0; }
  }

  _walk(dt, tx, tz, speed) {
    this.repathT -= dt;
    if (!this.path || this.repathT <= 0) { this.repathT = 0.8; this.pathTo(tx, tz); }
    const a = this.play('Walk_Loop', { fade: 0.3 });
    if (a) a.timeScale = Math.min(2, speed / 1.35);
    this.follow(dt, speed, 0.4);
  }
}
