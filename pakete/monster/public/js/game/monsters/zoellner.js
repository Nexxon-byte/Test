// Der Zöllner (Tiefenstufe II, Zehntleitungen): Eintreiber der Hohen Kanzlei mit Waage und Stempel.
// Er geht seine Runde und läutet ein Glöckchen. Wer ihm begegnet, soll den zehnten Teil dessen auf die
// Waage legen, was er trägt. Wer zahlt, bekommt eine Quittung und hat Ruhe. Wer nicht zahlt, wird
// gesiegelt (alles da unten findet einen dann leichter) und er treibt den Zehnt ein – mit Gewalt.
// Herrenloses Gut am Boden sammelt er ein: Ein fallen gelassenes Stück lenkt ihn ab.
// In die Neunte folgt er nicht: Kirchengut ist zollfrei.
//
// Konter: zahlen · weglaufen (er rennt nie, nur beim Eintreiben geht er zügig) · Köder fallen lassen ·
// Salzflinte schlägt ihm die Waage aus der Hand (er sammelt seine Gewichte) · Kabine · Versteck.
// NIE schlagen: Mit der Brechstange gibt es sofort das Siegel.
//
// Zustände: patrol → approach → demand → (paid) | stamp → collect · fetch (Gut am Boden) · cabwait · scatter

import * as THREE from 'three';
import { Monster } from './base.js';
import { CAB } from '../../world/cab.js';
import { audio } from '../../audio/audio.js';
import { voice } from '../../audio/voice.js';
import { ui } from '../../ui/ui.js';
import { charFor, packFirstSight, pick, lampLevel } from './kit.js';
import { dress } from './standin.js';
import { overlay, meter, seal } from './pack-ui.js';
import { PACK_KOM } from '../../story/lines-monster.js';

const _v = new THREE.Vector3();

export const ZOELLNER = {
  speedPatrol: 1.1, speedApproach: 1.6, speedCollect: 2.75, speedLunge: 3.6,
  sight: 13, hearMul: 0.8,
  demandRange: 2.3, demandTime: 6.5, walkAway: 3.8,
  share: 0.1, minDemand: 12,
  stampDamage: 20, collectDamage: 30, bloodDamage: 15,
  scatterFor: 12, cabWait: 18, bellEvery: [6, 10],
};

const CLIP = { walk: 'Walk_Formal_Loop', idle: 'Idle_Loop', offer: 'Idle_Lantern_Loop', stamp: 'Punch_Cross', pick: 'PickUp_Table', kneel: 'Fixing_Kneeling', nod: 'Yes', no: 'Idle_No_Loop' };

export class Zoellner extends Monster {
  constructor(director, opts = {}) {
    const c = charFor('zoellner');
    super(director, { char: c.id, profile: 'zoellner', radius: 0.3, height: 2.0 });
    this.type = 'zoellner';
    this.standin = c.standin;
    if (c.standin) this.root.scale.setScalar(1.1);
    this.route = [];
    this.routeI = 0;
    this.bellT = 2 + Math.random() * 4;
    this.paid = 0;
    this.demand = 0;
    this.offer = 0;
    this.stampUp = 0;
    this.load = 0;
    this.dressing = dress('zoellner', this);
    this.entry = null;
    this.play(CLIP.walk, { fade: 0 });
    this.ch.randomize();
    this.setState('patrol');
  }

  get chasing() { return this.state === 'collect' || this.state === 'lunge'; }
  cannonTarget() { return this.state !== 'scatter'; }
  get night() { return (this.d._pack ||= {}); }

  // ---------------------------------------------------------------- Runde

  _buildRoute() {
    const d = this.d, g = d.grid;
    const pts = [];
    for (let tries = 0; tries < 60 && pts.length < 5; tries++) {
      const c = g.randomFloorCell(d.rng, (x, z) => g.walkable(x, z) && !g.isLanding(x, z) && !g.isCabin(x, z));
      if (!c) continue;
      const [x, z] = d.level.center(c[0], c[1]);
      if (pts.some(([px, pz]) => Math.hypot(px - x, pz - z) < 9)) continue;
      pts.push([x, z]);
    }
    this.route = pts.length ? pts : [[this.pos.x, this.pos.z]];
  }

  place(x, z, yaw) { super.place(x, z, yaw); this._buildRoute(); }

  // ---------------------------------------------------------------- Denken

  think(dt) {
    const d = this.d, p = d.player;
    this.onScreen = d.seen(this);
    const dist = this.distTo(p.pos);
    this.moving = false;
    this._bell(dt, dist);
    this.stampUp = Math.max(0, this.stampUp - dt * 3);
    this.offer += ((this.state === 'demand' ? 1 : 0) - this.offer) * Math.min(1, dt * 5);
    this.load *= Math.exp(-dt * 2);

    const n = this.night;
    const hidden = p.hidden || p.dead;
    const inCab = d.elev.contains(p.pos, -0.2);
    // Er sieht dich, wenn du nah bist, im Licht stehst – oder eine brennende Lampe trägst
    const seesPlayer = !hidden && dist < ZOELLNER.sight && d.grid.lineOfSight(this.pos.x, this.pos.z, p.pos.x, p.pos.z) && (dist < 5 || lampLevel(d) > 0.15 || d.lightAt(_v.set(p.pos.x, 1.2, p.pos.z)).lit);
    const hears = !hidden && d.loudestAt(this.pos.x, this.pos.z, ZOELLNER.hearMul)?.kind === 'player';
    if (seesPlayer && dist < 14 && this.onScreen) packFirstSight(d, 'zoellner');

    switch (this.state) {
      case 'patrol':
        if (!n.receipt && (seesPlayer || (hears && dist < 8)) && !inCab) { this.setState(n.stamped || n.refused ? 'collect' : 'approach'); break; }
        if (this._lookForLoose()) break;
        this._patrol(dt);
        break;
      case 'fetch': this._fetch(dt); break;
      case 'approach': this._approach(dt, dist, seesPlayer, inCab); break;
      case 'demand': this._demand(dt, dist, inCab); break;
      case 'lunge': this._lunge(dt, dist); break;
      case 'collect': this._collect(dt, dist, seesPlayer, inCab); break;
      case 'cabwait': this._cabwait(dt, inCab, dist); break;
      case 'scatter': this._scatter(dt); break;
      case 'leave': this._leave(dt, dist); break;
    }
  }

  animate(dt) {
    super.animate(dt);
    if (this.onScreen || this.distTo(this.d.player.pos) < 25) this.dressing.update(dt, { time: this.d.time }, { offer: this.offer, load: this.load, stampUp: this.stampUp });
  }

  _bell(dt, dist) {
    this.bellT -= dt;
    if (this.bellT > 0 || this.state === 'scatter') return;
    const [a, b] = ZOELLNER.bellEvery;
    this.bellT = a + Math.random() * (b - a);
    if (dist < 40) audio.play('tollBell', { pos: this.chest.clone(), vol: 0.5 });
    this.d.noise(this.pos.x, this.pos.z, 8, 'bell');
    if (dist < 20 && Math.random() < 0.15) voice.say('z_hum', { pos: this.chest.clone() });
  }

  _walk(dt, speed, x, z, arrive = 0.6) {
    const bar = this.d.blockedByBarrier(this.pos.x, this.pos.z, 0.35);
    if (bar) { this.stepToward(this.pos.x + (this.pos.x - bar.x), this.pos.z + (this.pos.z - bar.z), 1.2, dt); return true; }
    // Kirchengut ist zollfrei: nie über die Schwelle der Neunten
    if (z < CAB.GATE_Z + 0.9 && Math.abs(x) < CAB.W / 2 + 0.5) z = CAB.GATE_Z + 0.9;
    this.repathT -= dt;
    if (!this.path || this.repathT <= 0 || this.goal.distanceTo(_v.set(x, 0, z)) > 1.5) { this.repathT = 0.8; if (!this.pathTo(x, z)) { this.repathT = 2.5; return true; } }
    const a = this.play(CLIP.walk, { fade: 0.35 });
    if (a) a.timeScale = speed / 1.2;
    this.moving = true;
    const done = this.follow(dt, speed, arrive);
    if (this.pos.z < CAB.GATE_Z + 0.8 && Math.abs(this.pos.x) < CAB.W / 2 + 0.5) this.pos.z = CAB.GATE_Z + 0.8;
    return done;
  }

  _patrol(dt) {
    if (!this.route.length) this._buildRoute();
    const [x, z] = this.route[this.routeI % this.route.length];
    if (this._walk(dt, ZOELLNER.speedPatrol, x, z, 0.8)) {
      this.routeI++;
      this.pauseT = 2 + Math.random() * 3;
      this.setState('leave');   // kurz stehen, ins Buch sehen
    }
  }

  // kurzer Halt am Wegpunkt (auch nach der Quittung: er geht seiner Wege)
  _leave(dt, dist) {
    this.play(CLIP.idle, { fade: 0.5 });
    if (this.stateT > (this.pauseT ?? 2)) this.setState('patrol');
  }

  // ---------------------------------------------------------------- Herrenloses Gut

  _lookForLoose() {
    const d = this.d, items = d.game.items;
    let best = null, bd = 9;
    for (const it of items.items.values()) {
      if (it.holder || it.tool || it.zoll) continue;
      if (d.elev.contains(it.pos, -0.3)) continue;
      const dd = Math.hypot(it.pos.x - this.pos.x, it.pos.z - this.pos.z);
      if (dd < bd && d.grid.lineOfSight(this.pos.x, this.pos.z, it.pos.x, it.pos.z)) { bd = dd; best = it; }
    }
    // nur, was jemand fallen gelassen hat (Beute der Ebene bleibt liegen, er ist kein Plünderer)
    if (!best || !best.dropped) return false;
    this.fetchIt = best;
    this.setState('fetch');
    return true;
  }

  _fetch(dt) {
    const it = this.fetchIt, d = this.d;
    if (!it || it.holder || !d.game.items.items.has(it.id)) { this.setState('patrol'); return; }
    if (this.stateT < 0.05 && this.distTo(d.player.pos) < 18) voice.say('z_free', { pos: this.chest.clone() });
    if (this._pickT === undefined) {
      if (this._walk(dt, ZOELLNER.speedApproach, it.pos.x, it.pos.z, 0.9)) { this._pickT = 0; this.play(CLIP.pick, { fade: 0.2, loop: false }); }
      return;
    }
    this._pickT += dt;
    this.faceToward(it.pos.x, it.pos.z, dt, 8);
    if (this._pickT > 1.1) {
      d.game.items.remove(it.id);
      if (it.fixture) d.game.pool.remove(it.fixture);
      audio.play('scaleClink', { pos: this.chest.clone(), vol: 0.5 });
      this.load = 1;
      this._pickT = undefined;
      this.fetchIt = null;
      this.setState('patrol');
    }
  }

  // ---------------------------------------------------------------- Forderung

  onState(s, prev) {
    if (prev === 'demand') { this._removeEntry(); meter.hide(); }
    if (s === 'approach' && this.distTo(this.d.player.pos) < 16) voice.say(pick(['z_demand_1', 'z_demand_2']), { pos: this.chest.clone() });
    if (s === 'demand') this._startDemand();
    if (s === 'collect') { voice.say('z_collect', { pos: this.chest.clone() }); this.night.refused = true; }
  }

  _approach(dt, dist, sees, inCab) {
    const p = this.d.player;
    if (this.night.receipt) { this.setState('patrol'); return; }
    if (inCab) { this.setState('cabwait'); return; }
    if (!sees) this.lostT = (this.lostT || 0) + dt; else this.lostT = 0;
    if (this.lostT > 7 || dist > 24) { this.lostT = 0; this.setState('patrol'); return; }
    if (dist < ZOELLNER.demandRange) { this.setState('demand'); return; }
    this._walk(dt, ZOELLNER.speedApproach, p.pos.x, p.pos.z, ZOELLNER.demandRange - 0.3);
  }

  _startDemand() {
    const d = this.d, inv = d.game.inv;
    const carried = inv.value;
    this.paid = 0;
    this.demand = carried > 0 ? Math.max(ZOELLNER.minDemand, Math.round(carried * ZOELLNER.share / 5) * 5) : 0;
    this.demandT = ZOELLNER.demandTime;
    audio.play('scaleChain', { pos: this.chest.clone(), vol: 0.6 });
    voice.say(this.demand ? 'z_demand_3' : 'z_blood', { pos: this.chest.clone(), interrupt: false });
    this._meter();
    // Benutzen: aktuelles Stück auf die Waage legen
    this.entry = d.game.interact.add({
      tag: 'pack', pos: () => this.dressing.panWorld(_v), radius: 1.0, maxDist: 3.2, priority: 1.5,
      prompt: () => {
        const it = inv.current;
        if (!this.demand) return 'Mit leeren Händen vor der Waage';
        if (!it || it.tool) return 'Beute in die Hand nehmen (1–4) und auf die Waage legen';
        return `Auf die Waage legen: ${it.def.name} · ${it.value} M`;
      },
      sub: () => this.demand ? `Der Zehnt: noch ${Math.max(0, this.demand - this.paid)} M` : 'Kein Gut? Dann Blut.',
      enabled: () => this.state === 'demand' && !d.player.dead,
      onUse: () => this._pay(),
    });
  }

  _removeEntry() { if (this.entry) { this.d.game.interact.remove(this.entry); this.entry = null; } }

  _meter() {
    const rest = Math.max(0, this.demand - this.paid);
    meter.show('DER ZÖLLNER VERLANGT DEN ZEHNT', this.demand
      ? `Noch <b>${rest} M</b> auf die Waage · [E] Stück auflegen · Weggehen heißt verweigern`
      : 'Du trägst nichts. Er will Blut. · [E] Hand hinhalten · Weggehen heißt verweigern');
  }

  _demand(dt, dist, inCab) {
    const d = this.d, p = d.player;
    this.play(CLIP.offer, { fade: 0.3 });
    this.faceToward(p.pos.x, p.pos.z, dt, 6);
    this.ch.lookAt(_v.set(p.pos.x, p.pos.y + p.eye, p.pos.z), 1);
    this.demandT -= dt;
    meter.set(this.demandT / ZOELLNER.demandTime);
    // Ticken der Frist
    this._tickT = (this._tickT ?? 0) - dt;
    if (this._tickT <= 0) { this._tickT = this.demandT < 2 ? 0.35 : 0.7; audio.play('ledgerTick', { pos: this.chest.clone(), vol: 0.45, pitch: this.demandT < 2 ? 1.3 : 1 }); }
    if (inCab) { this.setState('cabwait'); return; }
    if (p.dead || p.hidden) { this.setState('patrol'); return; }
    if (dist > ZOELLNER.walkAway || this.demandT <= 0) {
      voice.say('z_refuse', { pos: this.chest.clone(), interrupt: true });
      this.setState('lunge');
    }
  }

  _pay() {
    const d = this.d, g = d.game, inv = g.inv, st = d.state;
    if (!this.demand) {
      // Blutzehnt: Stempel auf die Hand
      this.stampUp = 1;
      audio.play('stampThud', { pos: this.chest.clone(), vol: 0.9 });
      d.hurt(ZOELLNER.bloodDamage, this, 'zoellner');
      this._receipt();
      return;
    }
    const it = inv.current;
    if (!it || it.tool) { ui.toast(it?.tool ? 'Werkzeug ist für die Kanzlei nichts wert.' : 'Nimm ein Stück Beute in die Hand.'); audio.play('dingWrong', { vol: 0.25 }); return; }
    inv.takeCurrent();
    g.items.remove(it.id);
    this.paid += it.value;
    this.load = 1;
    audio.play('scaleClink', { pos: this.chest.clone(), vol: 0.8 });
    g._updateKom?.();
    (st.stats ||= {}).zehnt = (st.stats.zehnt || 0) + it.value;
    if (this.paid >= this.demand) { if (this.paid > this.demand * 1.8 && this.paid - this.demand > 20) setTimeout(() => ui.toast('Die Kanzlei gibt kein Wechselgeld.'), 900); this._receipt(); }
    else { voice.say('z_short', { pos: this.chest.clone(), interrupt: true }); this.demandT = Math.min(ZOELLNER.demandTime, this.demandT + 3); this._meter(); }
  }

  _receipt() {
    const d = this.d, n = this.night;
    n.receipt = true;
    voice.say(Math.random() < 0.5 ? 'z_paid_1' : 'z_paid_2', { pos: this.chest.clone(), interrupt: true });
    audio.play('stampThud', { pos: this.chest.clone(), vol: 0.6 });
    this.stampUp = 1;
    seal.set(true, true);
    setTimeout(() => { if (!n.stamped) seal.set(false); }, 5000);
    ui.toast('Quittiert. Der Zöllner lässt dich für diese Nacht in Ruhe.');
    if (!d.state.flags.pk_quittung) { d.state.flags.pk_quittung = true; ui.komMessage(PACK_KOM.k_quittung); }
    this.play(CLIP.nod, { fade: 0.2, loop: false });
    this.pauseT = 2.5;
    this.setState('leave');
  }

  // ---------------------------------------------------------------- Siegel & Eintreiben

  _lunge(dt, dist) {
    const d = this.d, p = d.player;
    if (this.stateT < 0.05) { this.play(CLIP.stamp, { fade: 0.1, loop: false }); this.stampUp = 1; }
    this.faceToward(p.pos.x, p.pos.z, dt, 10);
    if (this.stateT < 0.55) { this.stepToward(p.pos.x, p.pos.z, ZOELLNER.speedLunge, dt); this.moving = true; }
    if (this.stateT > 0.55 && !this._stamped) {
      this._stamped = true;
      if (dist < 1.7 && !p.dead && !p.hidden && !d.elev.contains(p.pos)) this._applySeal();
      else audio.play('stampThud', { pos: this.chest.clone(), vol: 0.5 });
    }
    if (this.stateT > 1.1) { this._stamped = false; this.setState('collect'); }
  }

  _applySeal() {
    const d = this.d, n = this.night;
    n.stamped = true;
    audio.play('stampThud', { pos: this.chest.clone(), vol: 1 });
    voice.say('z_stamp', { pos: this.chest.clone(), interrupt: true });
    overlay.show('stamp', 1.4);
    seal.set(true);
    d.R.glitchPulse(0.4);
    d.hurt(ZOELLNER.stampDamage, this, 'zoellner');
    ui.komMessage(PACK_KOM.k_stamped, { glitch: true });
  }

  _collect(dt, dist, sees, inCab) {
    const d = this.d, p = d.player;
    if (p.dead) { this.setState('patrol'); return; }
    if (inCab) { this.setState('cabwait'); return; }
    if (p.hidden && !this.sawHide) { this.lostT = (this.lostT || 0) + dt; if (this.lostT > 4) { this.lostT = 0; this.setState('patrol'); } this.play(CLIP.idle, { fade: 0.4 }); return; }
    if (dist > 30) { this.setState('patrol'); return; }
    if (dist < 1.2) { this._seize(); return; }
    this._walk(dt, ZOELLNER.speedCollect * (d.diff ?? 1), p.pos.x, p.pos.z, 0.9);
  }

  // Eintreiben: das wertvollste Stück, dazu Schmerz
  _seize() {
    const d = this.d, g = d.game, inv = g.inv, n = this.night;
    const all = [inv.hands, ...inv.slots].filter(it => it && !it.tool);
    this.play(CLIP.stamp, { fade: 0.1, loop: false });
    audio.play('stampThud', { pos: this.chest.clone(), vol: 1 });
    audio.play('stinger', { kind: 'hard', vol: 0.5 });
    if (all.length) {
      const it = all.sort((a, b) => b.value - a.value)[0];
      if (inv.hands === it) inv.hands = null; else inv.slots[inv.slots.indexOf(it)] = null;
      inv._refresh?.();
      g.items.remove(it.id);
      ui.toast(`Eingezogen: ${it.def.name} (${it.value} M)`);
      this.load = 1;
    }
    d.hurt(ZOELLNER.collectDamage, this, 'zoellner');
    g._updateKom?.();
    n.receipt = true;    // eingezogen ist eingezogen – für heute ist er fertig
    this.pauseT = 3;
    this.setState('leave');
  }

  _cabwait(dt, inCab, dist) {
    const p = this.d.player;
    if (this.stateT < 0.05 && dist < 14) voice.say('z_cab', { pos: this.chest.clone() });
    this._walk(dt, ZOELLNER.speedApproach, THREE.MathUtils.clamp(p.pos.x, -1.2, 1.2), CAB.GATE_Z + 1.2, 0.5) && this.play(CLIP.idle, { fade: 0.4 });
    this.faceToward(p.pos.x, p.pos.z, dt, 4);
    if (!inCab) { this.setState(this.night.refused && !this.night.receipt ? 'collect' : 'approach'); return; }
    if (this.stateT > ZOELLNER.cabWait) this.setState('patrol');
  }

  _scatter(dt) {
    // Waage aus der Hand geschlagen: er kniet und sammelt seine Gewichte
    this.play(CLIP.kneel, { fade: 0.4 });
    this.dressing.scale.visible = this.stateT > ZOELLNER.scatterFor - 1;
    if (this.stateT > ZOELLNER.scatterFor) { this.dressing.scale.visible = true; this.setState(this.night.receipt ? 'patrol' : 'collect'); }
  }

  // ---------------------------------------------------------------- Treffer

  hit(kind, dir) {
    const d = this.d;
    if (this.state === 'scatter') return;
    if (kind === 'melee') {
      // Beamtenbeleidigung: sofort das Siegel
      voice.say('z_shot', { pos: this.chest.clone(), interrupt: true });
      audio.play('hitMetal', { pos: this.chest.clone(), vol: 0.6 });
      this.night.receipt = false;
      this.setState('lunge');
      return;
    }
    audio.play('hitMetal', { pos: this.chest.clone(), vol: 0.9 });
    audio.play('scaleChain', { pos: this.chest.clone(), vol: 1 });
    d.game.sparks.burst(this.pos.x, 1.2, this.pos.z, 22, 2, 1.2);
    voice.say('z_shot', { pos: this.chest.clone(), interrupt: true });
    this.night.receipt = false;
    this.setState('scatter');
  }

  dispose() {
    this._removeEntry();
    meter.hide();
    this.dressing.dispose();
    super.dispose();
  }
}
