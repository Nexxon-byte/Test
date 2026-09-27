// Das Spiel: Hub ⇄ Fahrt ⇄ Nacht. Verbindet Welt, Kabine, Spieler, Beute, Uhr, Wirtschaft.

import * as THREE from 'three';
import { input } from '../core/input.js';
import { settings } from '../core/settings.js';
import { RNG, clamp, damp } from '../core/rng.js';
import { CollisionWorld } from '../world/collision.js';
import { Elevator } from '../world/elevator.js';
import { CAB, DEPTH_STAGES, MODULES } from '../world/cab.js';
import { buildLevel } from '../world/levelbuild.js';
import { THEMES, applyThemeEnvironment } from '../world/themes.js';
import { Hub, HUB_THEME } from '../world/hub.js';
import { Player } from './player.js';
import { ItemManager, LOOT, SPAWN, TIER_VALUE, pickLoot } from './items.js';
import { Tools } from './tools.js';
import { ContractRun } from './contracts.js';
import { FLOORS, floorsFor, floorOfTheme, stageOfTheme } from './floors.js';
import { Inventory } from './inventory.js';
import { Interactions } from './interact.js';
import { saveCampaign, quotaFor, nameWithLetters, DIFFICULTY } from './state.js';
import { LightPool } from '../gfx/lightpool.js';
import { Dust, Sparks } from '../gfx/particles.js';
import { audio } from '../audio/audio.js';
import { music } from '../audio/music.js';
import { voice } from '../audio/voice.js';
import { ui } from '../ui/ui.js';
import { openShop, openBoard, nightReport, showSlate } from '../ui/shop.js';
import { QUOTES } from '../story/codex.js';
import { DOCS } from '../story/docs.js';
import { KOM, SLATE } from '../story/lines.js';
import { DEATHS } from '../story/codex.js';
import { Director } from './monsters/director.js';
import * as menus from '../ui/menus.js';

export { FLOORS };

const MS_PER_MIN = new URLSearchParams(location.search).has('fast') ? 400 : 4000;
const NIGHT_END = 3 * 60 + 7;   // 03:07
const _v = new THREE.Vector3(), _d = new THREE.Vector3();

export class Game {
  constructor(R, state, { onQuit } = {}) {
    this.R = R;
    this.state = state;
    this.onQuit = onQuit;
    this.col = new CollisionWorld();
    this.elev = new Elevator(R, this.col);
    this.player = new Player(R, this.col);
    this.pool = new LightPool(R.scene, R.quality.lights);
    this.dust = new Dust(R.scene, R.quality.dust);
    this.sparks = new Sparks(R.scene);
    this.hemi = new THREE.HemisphereLight(0x302838, 0x0a0806, 0.25);
    R.scene.add(this.hemi);
    this.items = new ItemManager(R.scene);
    this.inv = new Inventory(R.camera);
    this.interact = new Interactions();
    this.world = null;
    this.mode = 'boot';
    this.time = 0;
    this.clock = 0;          // Spielminuten seit Mitternacht
    this.nightEvents = {};
    this.paused = false;
    this.busy = false;       // läuft gerade eine Sequenz (Fahrt, Menü)
    this.hp = 100;
    this.hurtT = 0;          // kurz nach einem Treffer (Schrecken warten)
    this.blood = 0;          // roter Bildrand nach Treffern
    this.echo = false;       // tot: Echo-Zuschauer bis zur Abfahrt
    this.scanUntil = 0;
    this.scanCooldown = 0;
    this.loops = [];

    this.director = new Director(this);
    this.tools = new Tools(this);
    this.contracts = new ContractRun(this);
    this._applyCampaignToCab();
    this._wireCabin();
    this._wireGate();
    this._wirePlayerSounds();
    this.heart = null;
  }

  // ---------------------------------------------------------------- Aufbau

  _applyCampaignToCab() {
    for (const [id, lv] of Object.entries(this.state.modules || {})) this.elev.setModule(id, lv);
    this.elev.setUnlockedStages(this.state.stage + 1);
    const t = this.state.tools;
    this.player.stats.lampRange = 22 + t.lampe * 6;
    this.player.stats.lampDrain = (1 / 150) / (1 + t.akku * 0.5);
    this.player.stats.stepNoise = 1 - t.sohlen * 0.25;
    this.player.stats.staminaMax = 5 + t.lunge * 1.5;
    this.player.applyStats();
  }

  _wireCabin() {
    const labels = {
      button: () => this.mode === 'hub' ? (this.elev.leverStage > 0 ? `Abfahrt · Tiefenstufe ${DEPTH_STAGES[this.elev.leverStage].label}` : 'Erst Tiefe am Telegrafen wählen') : 'AUFWÄRTS · Zurück nach Markt Neun',
      lever: () => `Telegraf · ${DEPTH_STAGES[this.elev.leverStage].label} ${DEPTH_STAGES[this.elev.leverStage].sub}`,
      phone: () => 'Kabinentelefon',
      flutlicht: () => this.elev.floodOn ? 'Flutlicht ausschalten' : 'Flutlicht einschalten',
      weihoel: () => 'Weihöl-Station · heilen',
      horchgeraet: () => 'Horchgerät',
      rufglocke: () => 'Rufglocke läuten',
      kessel: () => 'Anselms Kessel',
      radio: () => 'Radio',
    };
    this._cabEntries = [];
    const rebuild = () => {
      for (const e of this._cabEntries) this.interact.remove(e);
      this._cabEntries = this.elev.interactables.map(it => this.interact.add({
        tag: 'cab', pos: it.pos, radius: it.radius, maxDist: 2.2, priority: 0.2,
        prompt: labels[it.id] || it.id,
        sub: it.id === 'lever' ? 'E: nächste Stufe' : '',
        enabled: () => !this.busy && this.mode !== 'ride',
        onUse: () => this._useCab(it.id),
      }));
    };
    rebuild();
    this._rebuildCabEntries = rebuild;
  }

  // Scherengitter von Hand schließen/öffnen (nachts, von innen und außen)
  _wireGate() {
    const handle = new THREE.Vector3(CAB.DOOR / 2 - 0.15, 1.25, CAB.GATE_Z);
    this.interact.add({
      tag: 'gate', pos: handle, radius: 0.45, maxDist: 2.4, priority: 0.15,
      prompt: () => this.elev.gateTarget > 0.5 ? 'Scherengitter schließen' : 'Scherengitter öffnen',
      sub: () => this.elev.modules.panzergitter ? `Panzergitter ${'I'.repeat(this.elev.modules.panzergitter)}` : 'Hält nicht lange',
      enabled: () => this.mode === 'night' && !this.busy && !this.player.dead,
      onUse: () => {
        if (this.elev.gateTarget > 0.5) this.elev.closeGate(); else this.elev.openGate();
        audio.play('gate', { pos: handle, vol: 0.5 });
        this.director.noise(0, CAB.GATE_Z, 7, 'gate');
      },
    });
  }

  _wirePlayerSounds() {
    this.player.onFootstep = (surface, k) => {
      const s = this.elev.contains(this.player.pos) ? 'metal' : (this.world?.surfaceAt?.(this.player.pos.x, this.player.pos.z) || 'stone');
      audio.play('footstep', { surface: s, intensity: k, vol: 0.9 });
    };
    this.player.onCrankTick = () => audio.play('crankTick', { vol: 0.25 });
  }

  // ---------------------------------------------------------------- Start

  async start() {
    ui.setHud(true);
    this.heart = audio.loop('heart');
    if (this.state.flags.tutorial && !this.state.flags.introDone) {
      await this.loadHub({ spawn: 'quartier' });
      this.player.teleport(-6, 29.2, 0, 0);
      await ui.fade(0, 1200);
      this._tutorialHub();
    } else {
      await this.loadHub({ spawn: 'cabin' });
      await ui.fade(0, 1000);
    }
  }

  // ---------------------------------------------------------------- Welten

  _clearWorld() {
    this.director.clear();
    this.tools.clear();
    this.contracts.clear();
    if (this.world) {
      this.world.dispose(this.R.scene, this.col);
      this.world = null;
    }
    this.pool.clear();
    this.interact.removeTag('world');
    for (const l of this.loops) l.stop?.(0.4);
    this.loops = [];
  }

  _startEmitters(world) {
    for (const e of world.emitters) {
      const opts = { ...(e.opts || {}) };
      if (e.pos) opts.pos = e.pos;
      e.handle = audio.loop(e.loop, opts);
      if (e.handle) this.loops.push(e.handle);
    }
  }

  async loadHub({ spawn = 'cabin' } = {}) {
    this._clearWorld();
    const hub = new Hub(this.R, this.col, this.state);
    this.world = hub;
    for (const f of hub.fixtures) this.pool.add(f);
    applyThemeEnvironment(this.R, this.hemi, HUB_THEME);
    audio.setReverb(...HUB_THEME.reverb);
    audio.setReverbMix(HUB_THEME.reverbMix);
    music.setZone('lobby');
    music.setTension(0); music.setChase(0);
    this._startEmitters(hub);
    this.elev.setOuterStyle(HUB_THEME.outerDoors);
    this.elev.setDisplay('OBEN');
    this.elev.setNeedleDepth(0, true);
    this.elev.setDepthStage(0, true);
    this.elev.arrive();
    this.elev.light = 1; this.elev.lightMode = 'normal'; this.elev.emergency = 0;
    this.elev.openDoors();
    this.mode = 'hub';
    this._spawnCargo();
    this._wireHubSpots(hub);
    if (spawn === 'cabin') this.player.teleport(0, -0.6, Math.PI, 0);
    this.player.toggleLamp(false);
    this._updateKom();
    return hub;
  }

  _spawnCargo() {
    // Beute, die oben in der Kabine liegt (noch nicht verkauft)
    for (const c of this.state.cargo) {
      if (this.items.items.has(c.id)) continue;
      const it = this.items.spawn(c.type, c.x, c.y, c.z, { value: c.value, id: c.id, data: c.data });
      if (c.name && c.name !== it.def.name) it.def = { ...it.def, name: c.name };
    }
    this._wireItems();
  }

  _wireItems() {
    this.interact.removeTag('item');
    for (const it of this.items.items.values()) this._itemEntry(it);
  }

  _itemEntry(it) {
    it.entry = this.interact.add({
      tag: 'item', pos: () => it.holder ? null : _v.copy(it.pos).setY(it.pos.y + 0.12), radius: 0.35, maxDist: 2.3, priority: 0.1,
      prompt: () => `${it.def.name} aufheben`, sub: () => it.tool ? `Werkzeug · ${it.weight} kg` : `${it.value} M · ${it.weight} kg${it.two ? ' · beide Hände' : ''}`,
      enabled: () => !it.holder && !this.busy && this.mode !== 'ride',
      onUse: () => this._pickup(it),
    });
  }

  _wireHubSpots(hub) {
    const s = hub.spots;
    const add = (id, onUse, extra = {}) => s[id] && this.interact.add({ tag: 'world', pos: s[id].pos, radius: s[id].radius, maxDist: 2.8, prompt: s[id].prompt, onUse, enabled: () => !this.busy, ...extra });
    add('dieter', () => this._talk('dieter'));
    add('board', () => this._openPanel(() => openBoard(this)));
    add('veit', () => this._talk('veit'));
    add('sell', () => this._sellHeld(), { prompt: () => this.inv.current ? `Verkaufen: ${this.inv.current.def.name} · ${this.inv.current.value} M` : 'Waage der Kantorei · Beute halten zum Verkaufen', sub: () => `Diese Woche: ${this.state.sold} / ${this.state.quota} M` });
    add('voss', () => this._talk('voss'));
    add('ada', () => this._talk('ada'));
    add('hanne', () => this._slate('hanne'));
    add('jomo', () => this._slate('jomo'));
    add('kapelle', () => showSlate('Die Kleine Heilige', 'Kerzen, Wachs, Stille. Sechs leere Sockel warten auf das, was ihr gehört hat.', 'chapel'));
    add('anselm', () => this.state.flags.anselm ? this._talk('anselm') : ui.toast('Die Rollläden sind unten. Jemand hat „BALD“ darauf gekritzelt.'));
    add('quartier', () => this._sleep());
    add('zehnt', () => ui.doc(DOCS.d_zehntkabine, DOCS.d_zehntkabine.text));
  }

  // ---------------------------------------------------------------- Hub-Figuren

  async _talk(who) {
    const st = this.state;
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    if (who === 'dieter') {
      if (!st.flags.metDieter) { st.flags.metDieter = true; await voice.sequence(['d_intro_1', 'd_intro_2', 'd_intro_3', 'd_intro_4', 'd_intro_5'], 0.3); this._tutorialStep('ada'); return; }
      voice.say(pick(['d_hello_1', 'd_hello_2', 'd_hello_3', 'd_hello_4']), { interrupt: true });
      this._openPanel(() => openBoard(this));
    } else if (who === 'ada') {
      if (!st.flags.metAda) { st.flags.metAda = true; await voice.sequence(['a_intro_1', 'a_intro_2', 'a_intro_3', 'a_intro_4'], 0.3); this._tutorialStep('cabin'); return; }
      voice.say(pick(['a_hello_1', 'a_hello_2']), { interrupt: true });
      this._openPanel(() => openShop('ada', this));
    } else if (who === 'voss') {
      voice.say(pick(['vo_hello_1', 'vo_hello_2', 'vo_hello_3']), { interrupt: true });
      this._openPanel(() => openShop('voss', this));
    } else if (who === 'veit') {
      voice.say(pick(['ve_hello_1', 've_hello_2']), { interrupt: true });
      this._openPanel(() => openShop('veit', this));
    } else if (who === 'anselm') {
      this._openPanel(() => openShop('anselm', this));
    }
  }

  _slate(who) {
    // Entscheidung (Kapitel −13): Reliquie an die Stummen
    if (who === 'hanne' && this.inv.current?.type === 'reliquie' && !this.state.flags.relicTo) {
      const it = this.inv.takeCurrent();
      this.items.remove(it.id);
      this._removeCargo(it.id);
      this.state.flags.relicTo = 'stumme';
      this.state.marks += 60;
      saveCampaign(this.state);
      this._updateKom();
      showSlate('Mutter Hanne', 'Eine leere Walze. Die Kirche hat sechshundert Jahre lang zu einer leeren Walze gebetet. (Sie legt dir sechzig Marken der Gemeinde in die Hand.) Wir werden es alle wissen lassen. Leise.');
      return;
    }
    const n = (this._slateN = (this._slateN || 0) + 1);
    if (who === 'hanne') showSlate('Mutter Hanne', SLATE[['hanne_1', 'hanne_2', 'hanne_3', 'hanne_4'][n % 4]]);
    if (who === 'jomo') showSlate('Jomo', SLATE[n % 2 ? 'jomo_1' : 'jomo_2']);
  }

  async _openPanel(fn) {
    this.busy = true;
    input.enabled = false;
    input.unlock();
    try { await fn(); } finally {
      this.busy = false;
      input.enabled = true;
      this._updateKom();
    }
  }

  _sleep() {
    saveCampaign(this.state);
    ui.toast('Gespeichert. Die Pritsche riecht nach Rost und Rosenwasser.');
  }

  // ---------------------------------------------------------------- Tutorial (erste Nacht)

  _tutorialHub() {
    ui.komMessage(KOM.k_welcome);
    ui.hint('move', 'WASD', 'Bewegen · Maus: Umsehen');
    ui.setObjective('Meldet euch bei Bruder Dieter in der Disposition');
    this.state.flags.introDone = true;
  }

  _tutorialStep(step) {
    if (!this.state.flags.tutorial) return;
    if (step === 'ada') ui.setObjective('Geht zu Ada in die Werkstatt');
    if (step === 'cabin') { ui.setObjective('In die Neunte: Telegraf auf I stellen, dann den Knopf drücken'); ui.hint('use', 'E', 'Benutzen'); }
  }

  // ---------------------------------------------------------------- Kabine bedienen

  async _useCab(id) {
    const e = this.elev;
    switch (id) {
      case 'lever': {
        if (this.mode !== 'hub') { ui.toast('Der Telegraf ist unten gesperrt. Nur AUFWÄRTS.'); return; }
        let next = e.leverStage + 1;
        if (next >= e.unlockedStages || next > this.state.stage) next = 0;
        e.setDepthStage(next);
        audio.play('clunk', { vol: 0.35 });
        break;
      }
      case 'button':
        audio.play('clunk', { vol: 0.3 });
        if (this.mode === 'hub') {
          if (e.leverStage === 0) { ui.toast('Der Telegraf steht auf OBEN. Erst eine Tiefe wählen.'); return; }
          if (this.state.night >= 3) { ui.toast('Die Zehntwoche ist um. Erst bei Kantor Veit abrechnen.'); return; }
          this.descend(e.leverStage);
        } else if (this.mode === 'night') {
          this.ascend('button');
        }
        break;
      case 'phone':
        if (this.mode === 'night' && this.director.scares.answerPhone()) break;
        voice.say(this.mode === 'night' ? 'v_e0_stay' : 'v_e0_hello', { interrupt: true });
        break;
      case 'flutlicht': e.setFlood(!e.floodOn); audio.play('lampClick', { on: e.floodOn }); break;
      case 'rufglocke':
        e.ringBell();
        // ruft die Mannschaft – und alles andere, das hört
        if (this.mode === 'night') this.director.noise(0, 0, 45, 'bell');
        break;
      case 'weihoel':
        if (this.hp < 100) { this.hp = Math.min(100, this.hp + 50); audio.play('pickup'); ui.toast('Weihöl. Es brennt, dann wird es warm.'); }
        else ui.toast('Du bist unversehrt.');
        break;
      case 'radio': audio.play('komBeep', { n: 1 }); break;
    }
  }

  // ---------------------------------------------------------------- Beute

  _pickup(it) {
    if (!this.inv.canTake(it)) { ui.toast(this.inv.hands ? 'Die Hände sind voll.' : 'Die Taschen sind voll.'); return; }
    this.items.take(it.id, 'me');
    this.inv.add(it);
    this._removeCargo(it.id);
    audio.play('pickup');
    if (it.two) ui.hint('two', 'G', 'Schweres fallen lassen');
    else if (it.tool) ui.hint('tool', 'LMT', it.tool === 'gun' ? 'Schießen · R: nachladen' : it.tool === 'heal' ? 'Verband anlegen' : ['flare', 'decoy'].includes(it.tool) ? 'Werfen' : it.tool === 'salt' ? 'Salzlinie streuen' : 'Zuschlagen', 8);
    else ui.hint('slots', '1–4', 'Taschen wechseln · G: fallen lassen · Q: Scannen', 8);
    this._updateKom();
  }

  _dropCurrent() {
    const it = this.inv.takeCurrent();
    if (!it) return;
    const f = this.player.forward(_d); f.y = 0; f.normalize();
    let x = this.player.pos.x + f.x * 0.7, z = this.player.pos.z + f.z * 0.7;
    if (!this.col.pointFree(x, z, 0.15, 0.05, 0.6)) { x = this.player.pos.x; z = this.player.pos.z; }
    this.items.drop(it, x, 0, z, this.player.yaw);
    if (!it.entry || !this.interact.list.has(it.entry)) this._itemEntry(it);
    audio.play('footstep', { surface: 'metal', intensity: 0.4 });
    if (this.mode === 'night') this.director.noise(x, z, it.two ? 9 : 5, 'drop');
    this._updateKom();
  }

  _removeCargo(id) { this.state.cargo = this.state.cargo.filter(c => c.id !== id); }

  // Gekauftes Werkzeug landet in der Kabine (und wird als Fracht gemerkt)
  deliver(type) {
    const p = this._freeCabSpot();
    const it = this.items.spawn(type, p.x, 0, p.z);
    this._itemEntry(it);
    this.state.cargo.push({ id: it.id, type, value: 0, x: p.x, y: 0, z: p.z, data: it.data });
    audio.play('clunk', { pos: new THREE.Vector3(p.x, 0.2, p.z), vol: 0.3 });
    return it;
  }

  _sellHeld() {
    const it = this.inv.current;
    if (!it) { ui.toast('Halte ein Stück Bergegut, um es auf die Waage zu legen.'); return; }
    if (it.tool) { ui.toast('Die Kantorei kauft kein Werkzeug. Nur Bergegut.'); return; }
    // Entscheidung (Kapitel −13): Reliquie an die Kanzlei
    if (it.type === 'reliquie') { this.state.flags.relicTo = 'kanzlei'; voice.say('ve_relic', { interrupt: true }); }
    this.inv.takeCurrent();
    this.items.remove(it.id);
    this.state.marks += it.value;
    this.state.sold += it.value;
    this.state.stats.total += it.value;
    audio.play('ding', { vol: 0.35, pitch: 1.5 });
    if (it.type !== 'reliquie' && Math.random() < 0.35) voice.say(Math.random() < 0.8 ? 've_sell' : 've_doubt');
    ui.toast(`+${it.value} M · ${it.def.name} der Kantorei übergeben`);
    saveCampaign(this.state);
    this._updateKom();
  }

  // ---------------------------------------------------------------- Scan

  _scan() {
    if (this.scanCooldown > 0) return;
    this.scanCooldown = 2.2;
    this.scanUntil = this.time + 3.5;
    audio.play('komBeep', { n: 1, vol: 0.2 });
    audio.play('stinger', { kind: 'riser', vol: 0.05 });
    this.R.fx.extraAberration = 0.6;
    setTimeout(() => { this.R.fx.extraAberration = 0; }, 250);
  }

  _updateScanLabels() {
    const host = document.getElementById('scanlabels');
    if (!host) return;
    if (this.time > this.scanUntil) { if (host.childElementCount) host.innerHTML = ''; return; }
    const cam = this.R.camera, w = window.innerWidth, h = window.innerHeight;
    let html = '';
    let total = 0;
    for (const it of this.items.items.values()) {
      if (it.holder) continue;
      const d = it.pos.distanceTo(cam.position);
      if (d > 20) continue;
      _v.copy(it.pos).setY(it.pos.y + 0.3).project(cam);
      if (_v.z > 1 || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) continue;
      const x = (_v.x * 0.5 + 0.5) * w, y = (-_v.y * 0.5 + 0.5) * h;
      total += it.value;
      html += `<div class="scan${it.tool ? ' tool' : ''}" style="left:${x | 0}px;top:${y | 0}px;opacity:${clamp(1.2 - d / 20, 0.3, 1)}"><b>${it.def.name}</b><span>${it.tool ? 'Werkzeug' : it.value + ' M'}</span></div>`;
    }
    host.innerHTML = html;
  }

  // ---------------------------------------------------------------- Abwärts

  async descend(stage) {
    if (this.busy) return;
    this.busy = true;
    ui.clearHints();
    this.director.preload();
    const st = this.state;
    // Welt wählen
    const opts = floorsFor(stage, st);
    const rng = new RNG((Date.now() & 0xffffff) ^ (st.week * 131 + st.night * 17));
    // angenommener Auftrag bestimmt die Welt (sonst Zufall der Stufe)
    const bound = (st.contracts || []).find(c => c.stage === stage);
    let choice = bound ? bound.floor : rng.pick(opts);
    if (st.flags.tutorial) choice = FLOORS[1][0];
    const [themeId, depth, name] = choice;
    const theme = THEMES[themeId] || THEMES.dock;
    const seed = rng.int(1, 1e9);
    this.nightInfo = { themeId, depth, name, stage, seed };

    // Türen zu
    audio.play('gate', { vol: 0.5 });
    this.elev.closeDoors();
    await this._wait(1.8);
    audio.play('doorSlide', { vol: 0.35 });
    await this._wait(1.2);
    // Beute im Hub, die nicht in der Kabine liegt, bleibt oben liegen → Kabinenbeute mitnehmen
    this._keepOnlyCabinItems();
    this._clearWorld();
    this.mode = 'ride';
    this.R.scene.fog.density = 0.02;
    const motor = audio.loop('motor', { vol: 0.4 });
    motor?.setSpeed(0);
    // Schachtfahrt: oben Beton und Stahl, ab etwa 40 % der Strecke der Schacht der Zielwelt.
    // Das Etagentor des Markts fährt mit seinem Absatz nach oben weg (home).
    this.elev.onRideEvent = (kind, k) => this._rideSound(kind, k);
    this.elev.startRide({ speed: -5.5, from: 'concrete', style: theme.shaft || 'concrete', stage, depth, fromDepth: 0, toLabel: '−' + depth, home: true });
    this.elev.setDisplay('▼');
    music.setZone('spindel');
    voice.say(st.flags.tutorial ? 'v_e0_hello' : ['v_dep_1', 'v_dep_2', 'v_dep_3', 'v_dep_4', 'v_dep_5', 'v_dep_6'][rng.int(0, 5)], { delay: 1.2 });
    const rideT = 11 + stage * 3;
    let level = null, styled = false, braking = false;
    const t0 = this.time;
    for (;;) {
      const el = this.time - t0, k = Math.min(1, el / rideT);
      if (!styled && k > 0.4) { styled = true; this.elev.setShaftStyle(theme.shaft || 'concrete'); }
      // rechtzeitig bremsen: die Kabine hält weich und bündig an einem Absatz
      if (!braking && el > rideT - 3) { braking = true; this.elev.stopRide(); }
      if (braking && this.elev.state === 'stopped') break;
      if (el > rideT + 10) break; // Sicherheitsnetz
      motor?.setSpeed(this.elev.speed);
      this.elev.setNeedleDepth(depth * Math.min(1, k * 1.05));
      this.elev.setDisplay('−' + Math.round(depth * Math.min(1, k * 1.05)));
      if (!level && el > 2) {
        level = buildLevel(this.R, this.col, theme, seed);
        level.group.visible = false;
      }
      if (Math.random() < 0.01) audio.play('cableCreak', { vol: 0.25 });
      await this._frameWait();
    }
    motor?.stop(0.8);
    audio.play('jolt', { vol: 0.7 });
    this.player.shake = 1.0;
    this.elev.arrive();
    // Ankunft: Stromausfall-Ritual
    this.elev.lightMode = 'off';
    await this._wait(1.2);
    this._enterLevel(level, theme, depth, name);
    this.elev.lightMode = 'normal';
    this.elev.light = 0.55;
    audio.play('powerUp', { vol: 0.4 });
    await this._wait(0.8);
    ui.floorCard(`−${depth}`, name);
    audio.play('ding', { vol: 0.45 });
    this.elev.openDoors();
    audio.play('gate', { vol: 0.45 });
    await this._wait(0.6);
    audio.play('doorSlide', { vol: 0.35 });
    await this.director.preload();
    this.busy = false;
    this._startNight();
  }

  // Geräusche der Schachtfahrt: Schienenstöße, vorbeiziehende Absätze
  _rideSound(kind, k) {
    if (kind === 'joint') audio.play('clunk', { vol: 0.05 + 0.07 * k });
    else if (kind === 'landing') audio.play('flyby', { vol: 0.08 + 0.1 * k });
  }

  _keepOnlyCabinItems() {
    for (const it of [...this.items.items.values()]) {
      if (it.holder) continue;
      if (!this.elev.contains(it.pos)) this.items.remove(it.id);
    }
    this._wireItems();
  }

  _enterLevel(level, theme, depth, name) {
    this.world = level;
    level.group.visible = true;
    for (const f of level.fixtures) this.pool.add(f);
    applyThemeEnvironment(this.R, this.hemi, theme);
    audio.setReverb(...(theme.reverb || [2.4, 0.4]));
    audio.setReverbMix(theme.reverbMix ?? 0.4);
    music.setZone(theme.music || 'spindel');
    this.elev.setOuterStyle(theme.outerDoors || 'steel');
    this.elev.setDisplay('−' + depth);
    this.elev.setNeedleDepth(depth, true);
    this._startEmitters(level);
    this._spawnLoot(level, theme);
    this.contracts.setup(level, this.nightInfo, this.state);
    this.mode = 'night';
  }

  _spawnLoot(level, theme) {
    const st = this.state, info = this.nightInfo;
    const rng = new RNG(info.seed ^ 0x5bd1);
    const table = SPAWN[info.themeId] || SPAWN.default;
    const diff = DIFFICULTY[st.difficulty] || DIFFICULTY.ratte;
    const count = Math.round((9 + info.stage * 3 + rng.int(0, 4)) * diff.loot);
    const cells = level.farCells(4);
    const used = [];
    let n = 0;
    for (const [cx, cz] of rng.shuffle(cells)) {
      if (n >= count) break;
      const [x, z] = level.center(cx, cz);
      if (used.some(([ux, uz]) => Math.hypot(ux - x, uz - z) < 4.5)) continue;
      const px = x + rng.float(-0.8, 0.8), pz = z + rng.float(-0.8, 0.8);
      if (!this.col.pointFree(px, pz, 0.25, 0.05, 0.8)) continue;
      const type = pickLoot(rng, table);
      const def = LOOT[type];
      const mult = TIER_VALUE[info.stage] || 1;
      const value = Math.round((def.value[0] + rng.next() * (def.value[1] - def.value[0])) * mult);
      const it = this.items.spawn(type, px, 0, pz, { value });
      if (def.glow) {
        const f = { pos: it.pos.clone().setY(0.3), color: def.glow, intensity: 1.2, distance: 3.5, mode: 'steady', on: true, meshes: [] };
        this.pool.add(f);
        it.fixture = f;
      }
      this._itemEntry(it);
      used.push([x, z]);
      n++;
    }
    this.nightLootTotal = [...this.items.items.values()].filter(i => !i.holder && !this.elev.contains(i.pos)).reduce((s, i) => s + i.value, 0);
  }

  // ---------------------------------------------------------------- Nacht

  _startNight() {
    this.clock = 0;
    this.nightEvents = {};
    this.hp = Math.max(this.hp, 100);
    this.echo = false;
    // Anselms Suppe: längerer Atem für diese Nacht
    this._applyCampaignToCab();
    if (this.state.buffs?.suppe) { this.player.stats.staminaMax *= 1.35; this.player.applyStats(); }
    this.director.startNight(this.world, this.nightInfo, this.state);
    this.player.toggleLamp(true);
    audio.play('lampClick', { on: true });
    const st = this.state;
    if (st.flags.tutorial) {
      voice.sequence(['v_tut_1', 'v_tut_2', 'v_tut_3', 'v_tut_4'], 0.5);
      ui.setObjective('Beute finden (Q scannen) und in die Kabine bringen');
      ui.hint('lamp', 'F', 'Lampe · R halten: kurbeln');
      ui.hint('scan', 'Q', 'Scannen: zeigt Bergegut');
      ui.komMessage(KOM.k_first);
    } else {
      // Story-Kapitel haben eigene Ankunft
      if (this.contracts.scene?.arrive) this.contracts.scene.arrive();
      else voice.say(['v_arr_1', 'v_arr_2', 'v_arr_3', 'v_arr_4'][Math.floor(Math.random() * 4)], { delay: 0.6 });
      ui.setObjective('Bergen. Vor 03:07 zurück in der Kabine sein.');
    }
    this._updateKom();
  }

  _updateNight(dt) {
    // Als Echo vergeht die Nacht schneller; Leertaste ruft die Neunte sofort
    this.clock += (dt * 1000) / MS_PER_MIN * (this.echo ? 15 : 1);
    if (this.echo && input.hit('Space')) { this.ascend('tod'); return; }
    const c = this.clock, ev = this.nightEvents;
    const once = (key, at, fn) => { if (c >= at && !ev[key]) { ev[key] = true; fn(); } };
    once('230', 150, () => voice.say('v_time_230'));
    once('250', 170, () => { voice.say('v_time_250'); this.elev.lightMode = 'dying'; setTimeout(() => { this.elev.lightMode = 'normal'; }, 2500); music.setTension(0.4); });
    once('300', 180, () => { voice.say('v_time_300'); audio.play('bell', { vol: 0.8, f: 82 }); this.R.glitchPulse(0.4); });
    once('305', 185, () => { voice.say('v_time_305', { interrupt: true }); audio.play('bell', { vol: 0.6, f: 98 }); music.setTension(0.8); });
    once('307', NIGHT_END, () => this.ascend('ruf'));
    // Lampe wird schwach: einmal pro Nacht mahnt die Vermittlerin
    if (!ev.lowbat && this.player.battery < 0.18 && !this.player.dead) { ev.lowbat = true; voice.say('v_e1_lamp'); ui.hint('crank', 'R', 'Kurbeln – aber leise ist es nicht', 8); }
    // Umgebungsschrecken (sanft, ohne Monster)
    this._ambT = (this._ambT ?? 8) - dt;
    if (this._ambT <= 0) {
      this._ambT = 14 + Math.random() * 18;
      const p = this.player.pos, a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 10;
      const pos = new THREE.Vector3(p.x + Math.cos(a) * r, 1.5, p.z + Math.sin(a) * r);
      const k = Math.random();
      if (k < 0.3) audio.play('drip', { pos });
      else if (k < 0.5) audio.play('slam', { pos, vol: 0.5 });
      else if (k < 0.65) audio.play('whisper', { pos, vol: 0.25 });
      else if (k < 0.8) audio.play('cableCreak', { pos, vol: 0.35 });
      else if (k < 0.9) voice.say(Math.random() < 0.5 ? 'r_e1_1' : 'i_e1_hum', { pos });
      else audio.play('knock', { pos, vol: 0.5, n: 3 });
    }
  }

  // ---------------------------------------------------------------- Schaden & Tod

  // Treffer: roter Rand, Kameraruck, Ohrenklingeln, Keuchen. 0 LP → Tod.
  damage(amount, { from = null, kind = '' } = {}) {
    if (this.player.dead || this.mode !== 'night' || this.busy) return;
    this.hp = Math.max(0, this.hp - amount);
    this.hurtT = 1.5;
    this.blood = Math.min(1.2, this.blood + 0.25 + amount / 60);
    this.player.shake = Math.max(this.player.shake, amount >= 30 ? 1.6 : 0.5);
    audio.play('hurt', { heavy: amount >= 30, vol: amount >= 30 ? 0.9 : 0.5 });
    if (amount >= 20) setTimeout(() => audio.play('breath', { fast: 1, vol: 0.4 }), 350);
    if (amount >= 30) this.R.glitchPulse(0.5);
    if (from?.pos) {
      // Kamera zuckt vom Angreifer weg
      const a = Math.atan2(this.player.pos.x - from.pos.x, this.player.pos.z - from.pos.z);
      this.player.pos.x += Math.sin(a) * 0.25; this.player.pos.z += Math.cos(a) * 0.25;
    }
    this.lastHurtKind = kind;
    if (this.hp <= 0) this._die(kind);
  }

  heal(amount) {
    const before = this.hp;
    this.hp = Math.min(100, this.hp + amount);
    return this.hp - before;
  }

  async _die(kind) {
    const p = this.player;
    p.dead = true;
    p.crouching = false;
    this.echo = false;
    audio.play('death', { vol: 0.9 });
    music.setChase(0);
    this.R.glitchPulse(1);
    this.blood = 1.4;
    // Getragenes fällt aus der Hand – verloren für diese Nacht (liegt beim Chor)
    const carried = this.inv.removeAll();
    for (const it of carried) this.items.remove(it.id);
    this._deathLost = carried.reduce((s, i) => s + i.value, 0);
    this._updateKom();
    await this._wait(2.4);
    if (this.mode !== 'night') return;
    const key = kind === 'grab' ? 'passenger' : kind === 'bite' ? 'listener' : 'default';
    const [title, text] = DEATHS[key] || DEATHS.default;
    this.busy = true;
    input.unlock();
    const a = await menus.death(title, text, { buttons: [['echo', 'ALS ECHO ZUSEHEN'], ['up', 'DIE NEUNTE RUFEN', true]] });
    this.busy = false;
    if (this.mode !== 'night') return;
    if (a === 'up') { this.ascend('tod'); return; }
    this.echo = true;
    ui.setEcho(true, 'ECHO · [LEERTASTE] DIE NEUNTE RUFEN');
    input.lock();
  }

  // ---------------------------------------------------------------- Aufwärts

  async ascend(reason) {
    if (this.busy && reason !== 'ruf') return;
    this.busy = true;
    if (reason === 'ruf') {
      voice.say('v_time_307', { interrupt: true });
      this.R.glitchPulse(1);
      audio.play('stinger', { kind: 'hard', vol: 0.7 });
    }
    audio.play('gate', { vol: 0.5 });
    this.elev.closeDoors();
    await this._wait(2.0);
    // Wer draußen ist (oder tot), bleibt beim Chor
    const lost = this.player.dead || !this.elev.contains(this.player.pos, 0.2);
    this.echo = false;
    const carried = lost ? this.inv.removeAll() : [];
    for (const it of carried) this.items.remove(it.id);
    // Abrechnung: was liegt im Kabinenraum + was getragen wird
    const inCab = this.items.inside((p) => this.elev.contains(p));
    const held = lost ? [] : [this.inv.hands, ...this.inv.slots].filter(Boolean);
    const brought = [...inCab, ...held].filter(it => !it.tool);
    const outside = this.items.lying().filter(it => !this.elev.contains(it.pos));
    for (const it of outside) { this.items.remove(it.id); if (it.fixture) this.pool.remove(it.fixture); }
    const broughtValue = brought.reduce((s, i) => s + i.value, 0);
    const contractResults = this.contracts.settle(brought, this.state, broughtValue);
    const lostValue = carried.reduce((s, i) => s + i.value, 0) + (this._deathLost || 0);
    this._deathLost = 0;

    // Fahrt nach oben
    const depth = this.nightInfo?.depth ?? 2;
    this._clearWorld();
    this.mode = 'ride';
    if (lost) {
      this.player.dead = true;
      ui.setEcho(true);
    }
    const motor = audio.loop('motor', { vol: 0.4 });
    // Aufwärts: erst der Schacht der Welt, zum Markt hin wieder Beton; oben wartet das Etagentor (homeArrival)
    const nightTheme = THEMES[this.nightInfo?.themeId];
    this.elev.onRideEvent = (kind, k) => this._rideSound(kind, k);
    this.elev.startRide({
      speed: 6, from: nightTheme?.shaft || 'concrete', style: nightTheme?.shaft || 'concrete', stage: this.nightInfo?.stage || 1,
      depth: 0, fromDepth: depth, fromLabel: '−' + depth, toLabel: 'IX', homeArrival: true, startLeaf: nightTheme?.outerDoors || 'steel',
    });
    this.elev.setOuterStyle(HUB_THEME.outerDoors);
    voice.say(lost ? 'v_up_lost' : (Math.random() < 0.5 ? 'v_up_1' : 'v_up_2'), { delay: 1.5 });
    music.setTension(0); music.setZone('spindel');
    const t0 = this.time, rideT = 9 + (this.nightInfo?.stage || 1) * 2;
    let styled = false, braking = false;
    for (;;) {
      const el = this.time - t0, k = Math.max(0, 1 - el / rideT);
      if (!styled && k < 0.45) { styled = true; this.elev.setShaftStyle('concrete'); }
      if (!braking && el > rideT - 3) { braking = true; this.elev.stopRide(); }
      if (braking && this.elev.state === 'stopped') break;
      if (el > rideT + 10) break; // Sicherheitsnetz
      motor?.setSpeed(this.elev.speed);
      this.elev.setNeedleDepth(depth * k);
      this.elev.setDisplay(k > 0.02 ? '−' + Math.round(depth * k) : 'OBEN');
      await this._frameWait();
    }
    this.elev.setNeedleDepth(0);
    this.elev.setDisplay('OBEN');
    motor?.stop(0.6);
    audio.play('jolt', { vol: 0.5 });

    // Stand fortschreiben
    const st = this.state;
    st.night += 1;
    st.stats.nights += 1;
    if (st.buffs) st.buffs.suppe = false;
    st.stats.bestNight = Math.max(st.stats.bestNight, broughtValue);
    if (lost) { st.stats.deaths += 1; st.stats.lost += lostValue; }
    // Kabinenbeute als Fracht merken (liegt oben in der Kabine)
    for (const it of held) {
      // getragenes landet im Lastregal/Boden der Kabine
      const p = this._freeCabSpot();
      this.items.drop(it, p.x, 0, p.z, Math.random() * 6);
    }
    this.inv.removeAll();
    // Aufträge: Belohnung, Auftragsgut abholen lassen (Marke → Dieter, Schwarzmarkt → Voss' Läufer)
    let contractPay = 0;
    for (const r of contractResults) {
      contractPay += r.reward;
      for (const id of r.remove) this.items.remove(id);
      (st.contractLog ||= []).push({ title: r.title, kind: r.kind, ok: r.ok, reward: r.reward, week: st.week, night: st.night });
    }
    st.marks += contractPay;
    // Aufträge gelten eine Nacht: was nicht angetreten wurde, verfällt
    for (const c of st.contracts || []) if (!contractResults.some(r => r.id === c.id)) (st.contractLog ||= []).push({ title: c.title, kind: c.kind, ok: false, reward: 0, week: st.week, night: st.night, skipped: true });
    st.contracts = [];
    st.cargo = this.items.lying().filter(it => this.elev.contains(it.pos)).map(it => ({ id: it.id, type: it.type, value: it.value, x: it.pos.x, y: it.pos.y, z: it.pos.z, data: it.data, name: it.def.name }));
    const deathFee = lost ? Math.min(st.marks, Math.round(30 + st.week * 20)) : 0;
    st.marks -= deathFee;
    const tut = st.flags.tutorial;
    st.flags.tutorial = false;
    saveCampaign(st);

    await this.loadHub({ spawn: lost ? 'cabin' : 'stay' });
    if (lost) { this.player.dead = false; ui.setEcho(false); this.player.teleport(0, -0.6, Math.PI, 0); this.hp = 100; this.blood = 0; }
    this.busy = true;
    input.unlock();
    input.enabled = false;
    await nightReport({
      name: this.nightInfo?.name, depth, brought, broughtValue, lost, lostValue, deathFee, reason, contracts: contractResults,
      week: st.week, night: st.night, quota: st.quota, sold: st.sold, cargoValue: st.cargo.reduce((s, c) => s + c.value, 0), tutorial: tut,
    });
    input.enabled = true;
    this.busy = false;
    // Nachwirkungen der Nacht (Story-Szenen), erst nach der Abrechnung
    for (const fn of (this.afterReport || []).splice(0)) fn();
    if (tut) {
      voice.say('v_tut_6');
      ui.setObjective('Beute aus der Kabine zur Waage der Kantorei tragen und verkaufen');
    } else if (st.night >= 3) {
      ui.setObjective('Zehntwoche um: Bei Kantor Veit die Quote abrechnen');
    } else ui.setObjective(`Nacht ${st.night + 1} von 3 · Quote ${st.sold} / ${st.quota} M`);
    this._updateKom();
  }

  _freeCabSpot() {
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * (CAB.W - 1.2), z = CAB.BACK + 0.5 + Math.random() * (CAB.D - 1.4);
      if (this.col.pointFree(x, z, 0.25, 0.05, 0.6)) return { x, z };
    }
    return { x: 0, z: -1 };
  }

  // Woche abschließen (von Veit ausgelöst)
  closeWeek() {
    const st = this.state;
    if (st.sold >= st.quota) {
      const bonus = Math.round((st.sold - st.quota) * 0.25) + 40;
      st.marks += bonus;
      st.week += 1; st.night = 0; st.sold = 0; st.quota = quotaFor(st.week, st.difficulty);
      saveCampaign(st);
      voice.say('d_quota_ok');
      return { ok: true, bonus };
    }
    const d = DIFFICULTY[st.difficulty] || DIFFICULTY.ratte;
    st.marks = Math.floor(st.marks / 2);
    // Die Kantoren nehmen alles Bergegut – Werkzeug lassen sie liegen
    st.cargo = st.cargo.filter(c => !LOOT[c.type]);
    for (const it of [...this.items.items.values()]) if (!it.tool) this.items.remove(it.id);
    st.night = 0; st.sold = 0;
    if (d.fail === 'debt') st.quota = Math.round(st.quota * 1.1);
    saveCampaign(st);
    voice.say('d_quota_fail');
    return { ok: false, permadeath: d.fail === 'permadeath' };
  }

  // ---------------------------------------------------------------- Entwicklung

  // Direkt in eine Nacht springen (ohne Fahrt): ?skip&night=ossuary&seed=7[&monsters=passenger,listener,rats]
  async devNight(themeId = 'dock', seed = 7) {
    const [tid, depth, name] = floorOfTheme(themeId);
    const theme = THEMES[tid] || THEMES.dock;
    this.nightInfo = { themeId: tid, depth, name, stage: stageOfTheme(tid), seed };
    this._keepOnlyCabinItems();
    this._clearWorld();
    await this.director.preload();
    const level = buildLevel(this.R, this.col, theme, seed);
    this.elev.arrive();
    this._enterLevel(level, theme, depth, name);
    this.elev.lightMode = 'normal';
    this.elev.light = 0.55;
    this.elev.openDoors();
    this.elev.gateOpen = 1; this.elev.doorsOpen = 1;
    this.elev._layoutGate(); this.elev._layoutOuter();
    ui.setHud(true);
    if (!this.heart) this.heart = audio.loop('heart');
    this.player.teleport(0, -0.6, Math.PI, 0);
    this._startNight();
  }

  // ---------------------------------------------------------------- Titel

  // Neuen/geladenen Spielstand übernehmen (Kabine umbauen)
  adoptState(state) {
    this.state = state;
    for (const id of Object.keys(MODULES)) this.elev.setModule(id, state.modules?.[id] || 0);
    this.items.clear();
    this.interact.removeTag('item');
    this.inv.removeAll();
    this._applyCampaignToCab();
    this._rebuildCabEntries();
  }

  // Kamerafahrt vor dem Tor, während das Menü offen ist
  updateTitle(dt) {
    this.time += dt;
    const t = this.time * 0.05;
    const cam = this.R.camera;
    cam.position.set(Math.sin(t) * 2.2 + 1.2, 1.55 + Math.sin(t * 1.7) * 0.08, 7.2 + Math.cos(t) * 0.8);
    cam.lookAt(0.2, 1.7, 0);
    this.player.lampOn = false;
    this.player.lampModel.visible = false;
    this.player.spot.intensity = 0;
    this.player.bounce.intensity = 0;
    this.elev.update(dt);
    if (this.world?.update) this.world.update(dt, this.time);
    this.pool.update(dt, cam.position);
    this.sparks.update(dt);
    if (this.world?.anchors?.sparks && Math.random() < dt * 1.2) { const s = this.world.anchors.sparks; this.sparks.burst(s.x, s.y, s.z, 12, 1.2, 1.4); }
    this.dust.update(dt, cam.position, cam.position, new THREE.Vector3(0, 0, -1), 0);
    this.R.fx.fear = 0.08;
    audio.updateListener(cam);
  }

  // ---------------------------------------------------------------- Hilfen

  _wait(sec) { return new Promise(r => setTimeout(r, sec * 1000)); }
  _frameWait() { return new Promise(r => requestAnimationFrame(() => r())); }

  _updateKom() {
    const st = this.state;
    const name = nameWithLetters(st.name, st.letters);
    const carried = this.inv.value;
    const res = this.mode === 'night'
      ? `<span>TRAGE <b>${carried} M</b></span><span>KABINE <b>${this._cabValue()} M</b></span>`
      : `<span>MARKEN <b>${st.marks}</b></span><span>QUOTE <b>${st.sold}/${st.quota}</b></span><span>NACHT <b>${Math.min(3, st.night + 1)}/3</b></span>`;
    ui.setKom({ name: `MANNSCHAFT 47 · ${name}`, res });
    ui.setContracts(this.mode === 'night' ? this.contracts.komLine() : '');
  }

  _cabValue() { return this.items.inside((p) => this.elev.contains(p)).reduce((s, i) => s + i.value, 0); }

  _clockText() {
    if (this.mode !== 'night') return 'OBEN';
    const m = Math.floor(this.clock);
    return `0${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  }

  // ---------------------------------------------------------------- Takt

  update(dt) {
    this.time += dt;
    const p = this.player;
    // Eingaben
    if (!this.busy && input.enabled) {
      if (input.hit('KeyF')) { if (p.toggleLamp()) audio.play('lampClick', { on: p.lampOn }); ui.hintDone('lamp'); }
      if (input.hit('KeyQ') && this.mode !== 'ride') { this._scan(); ui.hintDone('scan'); }
      if (input.hit('KeyG')) { this._dropCurrent(); ui.hintDone('two'); }
      for (let i = 0; i < 4; i++) if (input.hit('Digit' + (i + 1))) { this.inv.select(i); ui.hintDone('slots'); }
      if (input.hit('KeyE') && this.interact.best) { this.interact.best.onUse(); ui.hintDone('use'); }
      if (input.mouseClicked && input.locked && this.mode !== 'ride' && this.tools.use()) ui.hintDone('tool');
      if (input.hit('KeyR') && this.tools.current?.tool === 'gun' && this.tools.reload()) ui.hintDone('reload');
      if (input.down('KeyW') || input.down('KeyA') || input.down('KeyS') || input.down('KeyD')) ui.hintDone('move');
    }
    this.scanCooldown = Math.max(0, this.scanCooldown - dt);

    // Gewicht bremst
    const w = this.inv.weight;
    p.slow = 1 - Math.min(0.45, w * 0.018);
    p.hideLampModel = !!this.inv.hands;
    p.update(dt);
    this.tools.update(dt);
    this.inv.update(dt, p.moving);
    this.inv.setFill(p.lampLevel ?? 0);
    p.shake = Math.max(p.shake, this.elev.shake * 0.6);
    this.elev.update(dt);
    // Fahrgefühl: Einsacken beim Bremsen, leichtes Rollen in den Führungen
    if (this.mode === 'ride') { this.R.camera.position.y += this.elev.rideCam.y; this.R.camera.rotation.z += this.elev.rideCam.roll; }
    if (this.world?.update) this.world.update(dt, this.time);
    for (const c of this.world?.candles || []) if (!this.world.isHub) c.scale.y = 0.07 * (0.85 + Math.sin(this.time * 11 + (c.userData.phase || 0)) * 0.15);

    // Licht, Staub, Beute-Schimmer
    this.pool.update(dt, this.R.camera.position);
    const lp = p.spot.getWorldPosition(_v.set(0, 0, 0));
    const ld = p.spotTarget.getWorldPosition(_d.set(0, 0, 0)).sub(lp).normalize();
    this.dust.update(dt, this.R.camera.position, lp, ld, p.lampLevel ?? 0);
    this.items.update(dt, lp.clone(), ld.clone(), p.lampLevel ?? 0);
    this.sparks.update(dt);
    if (this.mode === 'hub' && this.world?.anchors?.sparks && Math.random() < dt * 1.2) {
      const s = this.world.anchors.sparks;
      this.sparks.burst(s.x, s.y, s.z, 12, 1.2, 1.4);
      if (s.distanceTo(p.pos) < 12) audio.play('sparks', { pos: s, vol: 0.25 });
    }

    // Benutzen
    const camDir = this.R.camera.getWorldDirection(new THREE.Vector3());
    const best = (this.busy || this.mode === 'ride') ? null : this.interact.update(this.R.camera.position, camDir, (a, b) => this.col.lineClear(a.x, a.z, b.x, b.z, Math.min(a.y, b.y) + 0.05) || a.distanceTo(b) < 1.2);
    const pr = this.interact.promptOf(best);
    ui.setPrompt(pr?.text, pr?.key, pr?.sub);

    // Nacht
    if (this.mode === 'night' && !this.busy) this._updateNight(dt);
    if (this.mode === 'night') { this.director.update(dt, this.clock); this.contracts.update(dt); }

    // Lebenspunkte: roter Rand nach Treffern, Pochen bei wenig LP; oben heilt man langsam
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.blood = Math.max(0, this.blood - dt * 0.5);
    if (this.mode === 'hub' && this.hp < 100) this.hp = Math.min(100, this.hp + dt * 4);
    const low = !p.dead && this.hp < 40 ? (40 - this.hp) / 40 : 0;
    ui.setBlood(Math.max(this.blood, low * (0.45 + 0.2 * Math.sin(this.time * 5.2))), p.dead);

    // Angst & Herz: Dunkelheit und Einsamkeit
    const inCab = this.elev.contains(p.pos);
    const dark = this.mode === 'night' && !inCab && (p.lampLevel ?? 0) < 0.2 ? 1 : 0;
    const threat = this.mode === 'night' ? this.director.tension * 0.5 + (this.hp < 40 ? 0.3 : 0) : 0;
    p.fear = damp(p.fear, this.mode === 'night' ? Math.min(1, (inCab ? 0.05 : 0.18 + dark * 0.35 + (this.clock > 170 ? 0.25 : 0)) + threat) : 0, 0.6, dt);
    this.R.fx.fear = p.fear;
    this.heart?.setVol(Math.max(0, p.fear - 0.2) * 0.6);
    this.heart?.setRate(65 + p.fear * 70);

    // Oberfläche
    this._komT = (this._komT ?? 0) - dt;
    if (this._komT <= 0) { this._komT = 0.25; this._updateKom(); }
    ui.setKom({ battery: p.battery, clock: this._clockText() });
    ui.setStamina(p.stamina, p.stamina < 0.98);
    ui.setNoise(p.noise);
    ui.setHotbar?.(this.inv, this.hp, this.state.consumables?.patronen || 0);
    this._updateScanLabels();
    audio.updateListener(this.R.camera);
  }
}
