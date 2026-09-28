// Monster-Paket „Die Tiefe“: sechs neue Wesen (Falterin, Zöllner, Vorgänger, Ertrunkene, Nachsprecher,
// Portier), Verstecke, Spieluhr, Flutzonen – und die Segnung (Quote verfehlt, story/segnung.js).
//
// EINBAU (eine Zeile, am Ende des Game-Konstruktors):
//     import { installPack } from './monsters/pack.js';   …   installPack(this);
//
// installPack hängt sich über kleine Hüllen (Wrapper) an Director, Game, Spieler, Werkzeug und Inventar.
// Jede Hülle ist unten beschrieben; wer lieber direkt im Code einbaut: EINBAU.md, Abschnitt „Ohne Hüllen“.
//
// Testen:  ?skip&night=ossuary&seed=7&monsters=falterin      (auch: zoellner, vorgaenger, ertrunkene,
//          nachsprecher, portier – mehrere mit Komma) · &flood erzwingt Wasser · &clock=170 springt zur Uhrzeit

import * as THREE from 'three';
import { RNG } from '../../core/rng.js';
import { input } from '../../core/input.js';
import { audio } from '../../audio/audio.js';
import { ui } from '../../ui/ui.js';
import { Builder } from '../../gfx/geo.js';
import { mat } from '../../gfx/materials.js';
import { Character } from '../../gfx/characters.js';
import { TOOLS } from '../items.js';
import { DEATHS } from '../../story/codex.js';
import { installLines, CODEWORDS, PACK_KOM, PACK_SPEAKERS } from '../../story/lines-monster.js';
import { SPEAKERS } from '../../audio/voice.js';
import { installSounds } from '../../audio/sfx-monster.js';
import { installProfiles, preloadPackChars, charFor } from './kit.js';
import { dress } from './standin.js';
import { overlay, seal } from './pack-ui.js';
import { Falterin } from './falterin.js';
import { Zoellner } from './zoellner.js';
import { EchoCrew } from './vorgaenger.js';
import { Flood, FLOOD } from './flood.js';
import { Ertrunkene } from './ertrunkene.js';
import { Nachsprecher, Codeword } from './nachsprecher.js';
import { Portier, PortierDoor } from './portier.js';
import { Hiding } from '../hiding.js';
import { MusicBox, SPIELUHR_DEF, buildMusicBoxModel } from '../musicbox.js';
import { installSegnung } from '../../story/segnung.js';

const PARAMS = new URLSearchParams(location.search);
export const PACK_KINDS = ['falterin', 'zoellner', 'vorgaenger', 'ertrunkene', 'nachsprecher', 'portier'];

// Wer kommt in welcher Tiefenstufe: [min, max] je Nacht (vor dem Schwierigkeitsfaktor) und ab welcher Minute
export const PACK_SPAWNS = {
  2: { zoellner: [0, 1], vorgaenger: [0, 1] },
  3: { falterin: [1, 1], ertrunkene: [1, 2], vorgaenger: [0, 1], zoellner: [0, 1] },
  4: { portier: [1, 1], nachsprecher: [1, 1], falterin: [0, 1], vorgaenger: [0, 1] },
  5: { falterin: [1, 1], zoellner: [0, 1], vorgaenger: [1, 1], ertrunkene: [1, 2], nachsprecher: [1, 1], portier: [1, 1] },
};
// Welten mit eigener Note (Bohrung Null: Zehntleitungen → der Zöllner ist immer da)
export const PACK_THEME_SPAWNS = {
  mine: { zoellner: [1, 1] },
};
const SPAWN_AT = { falterin: [25, 60], zoellner: [4, 18], vorgaenger: [0, 8], ertrunkene: [0, 0], nachsprecher: [30, 70], portier: [0, 0] };

// Salzbrot (Anselms Gabe bei der Segnung): Verband mit anderem Namen
export const SALZBROT_DEF = {
  name: 'Salzbrot', weight: 0.2, tool: 'heal', consumable: true,
  desc: 'Anselms Brot, hart wie ein Ziegel. Heilt wie ein Verband. „Man soll niemandem die Hoffnung aus dem Brot nehmen.“',
  view: { len: 0.14, pos: [0.05, 0.02, 0], rot: [0.4, 0.8, 0.1] },
};
function buildBreadModel(b) {
  b.sphere(mat('wood'), 0, 0.035, 0, 0.07, 10, 8, 1.35, 0.55, 0.9);
  for (let i = 0; i < 3; i++) b.box(mat('salt'), -0.04 + i * 0.04, 0.066, 0, 0.012, 0.006, 0.06, { ry: 0.3 });
}
const ITEM_MODELS = { spieluhr: buildMusicBoxModel, salzbrot: buildBreadModel };

export function installPack(game) {
  if (game._pack) return game._pack;
  installLines();
  for (const [k, v] of Object.entries(PACK_SPEAKERS)) if (!SPEAKERS[k]) SPEAKERS[k] = v;
  installSounds();
  installProfiles();
  installItems(game);
  game._pack = new Pack(game);
  installSegnung(game);
  return game._pack;
}

// ============================================================================ Gegenstände

function installItems(game) {
  if (!TOOLS.spieluhr) TOOLS.spieluhr = SPIELUHR_DEF;
  if (!TOOLS.salzbrot) TOOLS.salzbrot = SALZBROT_DEF;
  const build = (type) => { const g = new THREE.Group(), b = new Builder(); ITEM_MODELS[type](b, g); g.add(b.build()); return g; };
  // Hülle 1 – items.spawn: eigenes Modell statt Zahnrad-Ersatz (zuhause: in items.js MODELS eintragen)
  const items = game.items, spawn = items.spawn.bind(items);
  items.spawn = (type, x, y, z, opts) => {
    const it = spawn(type, x, y, z, opts);
    if (ITEM_MODELS[type]) {
      for (const c of [...it.mesh.children]) if (c !== it.shine) c.removeFromParent();
      it.mesh.add(build(type));
      if (type === 'spieluhr') it.data = { charges: 3, ...(it.data || {}) };
    }
    return it;
  };
  // Hülle 2 – inv._refresh: Modell in der Hand
  const inv = game.inv, refresh = inv._refresh.bind(inv);
  inv._refresh = () => {
    refresh();
    const it = inv.current;
    if (!it || !ITEM_MODELS[it.type] || !inv.viewModel) return;
    inv.viewModel.removeFromParent();
    const m = build(it.type), v = it.def.view;
    m.traverse(o => { if (o.isMesh) { o.castShadow = false; o.renderOrder = 9; } });
    const box = new THREE.Box3().setFromObject(m), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const pivot = new THREE.Group();
    m.position.sub(c);
    pivot.add(m);
    pivot.scale.setScalar(v.len / Math.max(0.01, size.x, size.y, size.z));
    pivot.position.set(...v.pos);
    pivot.rotation.set(...v.rot);
    inv.view.add(pivot);
    inv.viewModel = pivot;
  };
}

// ============================================================================ Das Paket

class Pack {
  constructor(game) {
    this.g = game;
    this.d = game.director;
    this.crews = [];
    this.flood = null;
    this.door = null;
    this.code = null;
    this.sink = 0;
    this.ticks = new Set();          // Bild-für-Bild-Aufrufe (Szenen, z. B. die Segnung)
    game._packTicks = this.ticks;
    this.hiding = new Hiding(game);
    this.box = new MusicBox(game);
    game._hiding = this.hiding;
    game._musicbox = this.box;
    this._wrapDirector();
    this._wrapGame();
    this._wrapPlayer();
    this._wrapTools();
  }

  // ------------------------------------------------ Plan einer Nacht (auch für das Vorwärmen)

  planFor(info, state) {
    if (!info || state?.flags?.tutorial) return [];
    if (PARAMS.has('monsters')) return PARAMS.get('monsters').split(',').map(k => k.trim()).filter(k => PACK_KINDS.includes(k)).map(kind => ({ kind, at: 0 }));
    const rng = new RNG(((info.seed ?? 1) ^ 0x5eed) >>> 0);
    const diff = { pilger: 0.7, ratte: 1, erwaehlt: 1.3 }[state?.difficulty] ?? 1;
    const table = { ...(PACK_SPAWNS[Math.min(5, info.stage || 1)] || {}), ...(PACK_THEME_SPAWNS[info.themeId] || {}) };
    const out = [];
    for (const [kind, [a, b]] of Object.entries(table)) {
      const n = Math.max(0, Math.round(rng.int(a, b) * (kind === 'portier' ? 1 : diff)));
      for (let i = 0; i < n; i++) { const [t0, t1] = SPAWN_AT[kind]; out.push({ kind, at: rng.int(t0, t1) + i * 20 }); }
    }
    return out;
  }

  // ------------------------------------------------ Director-Hüllen

  _wrapDirector() {
    const d = this.d, P = this;
    // Hülle 3 – preload: Figuren der neuen Wesen mitladen
    const preload = d.preload.bind(d);
    d.preload = () => (P._loaded ||= Promise.all([preload(), preloadPackChars()]));
    // Hülle 4 – startNight: Plan ergänzen, Wasser/Tür/Codewort/Verstecke anlegen
    const start = d.startNight.bind(d);
    d.startNight = (level, info, state) => { start(level, info, state); P.startNight(level, info, state); };
    // Hülle 5 – _spawn: neue Arten
    const spawn = d._spawn.bind(d);
    d._spawn = (entry) => PACK_KINDS.includes(entry.kind) ? P.spawn(entry) : spawn(entry);
    // Hülle 6 – update: vorher Verstecke schützen, danach Systeme des Pakets
    const update = d.update.bind(d);
    d.update = (dt, clock) => { if (!d.active) return; P.beforeUpdate(dt); update(dt, clock); P.update(dt, clock); };
    // Hülle 7 – clear: aufräumen
    const clear = d.clear.bind(d);
    d.clear = () => { P.clear(); clear(); };
    // Hülle 8 – loudestAt: Gesiegelte sind lauter
    const loudest = d.loudestAt.bind(d);
    d.loudestAt = (x, z, mult = 1) => {
      const p = d.player, n = p.noise;
      if (P.night?.stamped && n > 0) p.noise = n * 1.6;
      const r = loudest(x, z, mult);
      p.noise = n;
      return r;
    };
    // Hülle 9 – Salzlinie im Wasser vertreibt die Ertrunkenen
    const addBarrier = d.addBarrier.bind(d);
    d.addBarrier = (x, z, yaw, mesh) => { addBarrier(x, z, yaw, mesh); if (P.flood?.salt(x, z)) ui.toast('Das Salz löst sich zischend im Wasser.'); };
    // Hülle 10 – Horchgerät: fliegende/tauchende Wesen, Echos als „Mannschaft“
    d._updateRadar = (dt) => {
      d._radarT -= dt;
      if (d._radarT > 0) return;
      d._radarT = 0.2;
      if (!d.elev.hasModule('horchgeraet')) return;
      const list = [];
      if (!d.player.dead) list.push({ x: d.player.pos.x, z: d.player.pos.z, kind: 'crew' });
      for (const m of d.monsters) {
        if (m.removed || m.state === 'gone') continue;
        if (m.ghost && !m.radar && !m.radarKind) continue;
        list.push({ x: m.pos.x, z: m.pos.z, kind: m.radarKind || 'monster' });
      }
      for (const s of d.swarms) if (s.alive) list.push({ x: s.center.x, z: s.center.z, kind: 'monster' });
      d.elev.setRadarBlips(list);
    };
    // Hülle 11 – debug
    const debug = d.debug.bind(d);
    d.debug = () => ({ ...debug(), pack: P.debug() });
  }

  // ------------------------------------------------ Game-Hüllen

  _wrapGame() {
    const g = this.g, P = this;
    // Hülle 12 – Todestexte der neuen Wesen (zuhause sauberer: in _die DEATHS[kind] nachschlagen)
    const die = g._die.bind(g);
    g._die = async (kind) => {
      if (!DEATHS[kind] || ['passenger', 'listener'].includes(kind)) return die(kind);
      const keep = DEATHS.default;
      DEATHS.default = DEATHS[kind];
      try { return await die(kind); } finally { DEATHS.default = keep; }
    };
    // Hülle 13 – Aufheben/Fallenlassen: Vorgänger merken Diebe, der Zöllner sammelt Fallengelassenes
    const pickup = g._pickup.bind(g);
    g._pickup = (it) => { const had = it.holder; pickup(it); if (!had && it.holder) { it.dropped = false; for (const c of P.crews) c.onPlayerPickup(it); } };
    const drop = g._dropCurrent.bind(g);
    g._dropCurrent = () => { const it = g.inv.current; drop(); if (it && !it.holder) it.dropped = true; };
    // Hülle 14 – Kom-Uhr: in der Nähe des Portiers steht sie auf 03:07
    const clockText = g._clockText.bind(g);
    g._clockText = () => (P.portierNear && g.mode === 'night' && Math.sin(g.time * 7) > -0.6) ? '03:07' : clockText();
    // Hülle 15 – Vorwärmen: Shader der neuen Figuren kompilieren, bevor sie auftauchen
    const prewarm = g.prewarm.bind(g);
    g.prewarm = async () => { await prewarm(); await P.prewarm(); };
  }

  // Hülle 16 – Spieler: Wasser bremst, man sinkt ein, Ertrunkene ziehen hinab
  _wrapPlayer() {
    const g = this.g, p = g.player, P = this;
    const pu = p.update.bind(p);
    p.update = (dt, w) => {
      let slow = 1, sink = 0, depth = 0;
      if (P.flood && g.mode === 'night' && !p.dead && !p.hidden) {
        depth = P.flood.depthAt(p.pos.x, p.pos.z);
        if (depth === 2) { slow = FLOOD.slowDeep; sink = FLOOD.sinkDeep; } else if (depth === 1) { slow = FLOOD.slowShallow; sink = FLOOD.sinkShallow; }
        if (depth === 2 && P._lastDepth !== 2) audio.play('splash', { vol: 0.6 });
      }
      P._lastDepth = depth;
      P.sink += (sink - P.sink) * Math.min(1, dt * 4);
      p.slow = (p.slow ?? 1) * slow;
      if (depth) p.surface = 'water'; else if (p.surface === 'water') p.surface = 'stone';
      const r = pu(dt, w);
      let pull = 0;
      for (const m of g.director.monsters) if (m.pull) pull = Math.max(pull, m.pull);
      const down = P.sink + pull * 1.15;
      if (down > 0.001 && !p.hidden) g.R.camera.position.y -= down;
      for (const fn of P.ticks) fn(dt);
      return r;
    };
  }

  // Hülle 17 – Werkzeug: Spieluhr (Linksklick) · Taste M prüft update()
  _wrapTools() {
    const t = this.g.tools, P = this;
    const use = t.use.bind(t);
    t.use = () => (t.current?.tool === 'musicbox' ? P.box.use() : use());
  }

  // ------------------------------------------------ Nacht

  startNight(level, info, state) {
    const d = this.d;
    this.clear();
    this.night = d._pack = {};
    this.crews = [];
    const plan = this.planFor(info, state);
    // ?monsters=… steht schon im Plan des Directors; sonst ergänzen
    if (!PARAMS.has('monsters')) for (const e of plan) d.plan.push(e);
    d.plan.sort((a, b) => a.at - b.at);
    const kinds = new Set(d.plan.map(e => e.kind));
    const e = d.elev;
    e._floodBroken = false;
    e._falterinDark = false;
    overlay.clear();
    seal.set(false);
    if (kinds.has('ertrunkene') || PARAMS.has('flood')) {
      const n = d.plan.filter(x => x.kind === 'ertrunkene').length;
      this.flood = new Flood(d, { zones: Math.max(1, Math.min(3, n)) });
      this._baitWater();
    }
    if (kinds.has('portier')) { this.door = new PortierDoor(d); this._musicBoxForPortier(); }
    if ((info?.stage || 1) >= 4 || kinds.has('nachsprecher')) this.code = new Codeword(d, CODEWORDS, { withMimic: kinds.has('nachsprecher') });
    this.hiding.wire(level);
    this.box.startNight();
    if (PARAMS.has('clock')) this.g.clock = Number(PARAMS.get('clock')) || 0;
  }

  // Beute im tiefen Wasser – der Köder
  _baitWater() {
    const d = this.d, f = this.flood, items = this.g.items;
    const LOOTS = ['ikone', 'zelle', 'leuchter', 'kelch', 'walze'];
    for (const zone of f.zones) {
      const [x, z] = f.randomDeep(zone);
      try {
        const it = items.spawn(LOOTS[d.rng.int(0, LOOTS.length - 1)], x + d.rng.float(-0.5, 0.5), 0, z + d.rng.float(-0.5, 0.5), { value: Math.round(70 * (1 + (d.info?.stage || 3) * 0.4)) });
        this.g._itemEntry?.(it);
      } catch { /* */ }
    }
  }

  // Wer keine Spieluhr hat, findet in einer Portier-Nacht eine – nicht weit vom Absatz
  _musicBoxForPortier() {
    const g = this.g, d = this.d;
    const have = [g.inv.hands, ...g.inv.slots].some(it => it?.type === 'spieluhr') || [...g.items.items.values()].some(it => it.type === 'spieluhr');
    if (have) return;
    const cells = d.level.farCells(4).filter(([, , dist]) => dist >= 4 && dist <= 9);
    for (const [cx, cz] of d.rng.shuffle(cells)) {
      const [x, z] = d.level.center(cx, cz);
      if (!d.col.pointFree(x, z, 0.2, 0.05, 0.6)) continue;
      const it = g.items.spawn('spieluhr', x, 0, z);
      g._itemEntry?.(it);
      return;
    }
  }

  spawn(entry) {
    const d = this.d, kind = entry.kind;
    if (!d.enabled) return;
    if (!charFor(kind === 'vorgaenger' ? 'vorgaenger' : kind).id) { console.warn('Monster-Paket: keine Figur für', kind); return; }
    let m = null;
    try {
      if (kind === 'vorgaenger') { const c = new EchoCrew(d); if (c.spawn()) this.crews.push(c); else c.dispose(); return; }
      if (kind === 'ertrunkene') {
        if (!this.flood) this.flood = new Flood(d, { zones: 1 });
        if (!this.flood.zones.length) return;
        const counts = new Map(this.flood.zones.map(z => [z, 0]));
        for (const mm of d.monsters) if (mm.type === 'ertrunkene') counts.set(mm.zone, (counts.get(mm.zone) || 0) + 1);
        const zone = [...counts.entries()].sort((a, b) => a[1] - b[1])[0][0];
        m = new Ertrunkene(d, { flood: this.flood, zone });
        const [x, z] = this.flood.randomDeep(zone);
        m.place(x, z);
      } else if (kind === 'portier') {
        if (!this.door) this.door = new PortierDoor(d);
        m = new Portier(d, { door: this.door });
        const at = this.door.ok ? this.door.outside : (d.spawnCell(16, true) || [0, 20]);
        m.place(at.x ?? at[0], at.z ?? at[1]);
      } else {
        const cell = d.spawnCell(kind === 'nachsprecher' ? 12 : 15, true);
        if (!cell) return;
        const C = { falterin: Falterin, zoellner: Zoellner, nachsprecher: Nachsprecher }[kind];
        m = new C(d);
        m.place(cell[0], cell[1]);
        if (kind === 'nachsprecher') { if (!this.code) this.code = new Codeword(d, CODEWORDS, { withMimic: true }); else this.code.withMimic = true; }
      }
    } catch (e) { console.warn('Monster-Paket: Fehler beim Erscheinen von', kind, e); m?.dispose?.(); return; }
    if (m) d.monsters.push(m);
  }

  // Verstecke schützen auch vor den alten Wesen (Fahrgäste verlieren das Interesse)
  beforeUpdate(dt) {
    const d = this.d, p = d.player;
    this._unstick(dt);
    if (!p.hidden) return;
    for (const m of d.monsters) {
      if (m.sawHide || m.type !== 'passenger') continue;
      if (m.state === 'stalk') { m._hideT = (m._hideT || 0) + dt; if (m._hideT > 2 || m.distTo(p.pos) < 2) { m._hideT = 0; m.setState('wander'); } }
    }
  }

  // Wer 1,5 s geht, aber nicht vorankommt (Requisiten, die das Raster nicht kennt), sucht einen Umweg:
  // einen freien Punkt in der Nähe, von dem aus der nächste Wegpunkt frei zu sehen ist
  _unstick(dt) {
    const d = this.d;
    this._stuckT = (this._stuckT ?? 0) + dt;
    const check = this._stuckT >= 1.5;
    if (check) this._stuckT = 0;
    for (const m of d.monsters) {
      if (!PACK_KINDS.includes(m.type) || m.type === 'falterin' || m.type === 'ertrunkene') continue;
      if (m._nudge) {
        const n = m._nudge;
        m.stepToward(n.x, n.z, 1.8, dt);
        if ((n.t -= dt) <= 0 || Math.hypot(n.x - m.pos.x, n.z - m.pos.z) < 0.15) { m._nudge = null; m.path = null; m.repathT = 0; }
        continue;
      }
      if (!check) continue;
      const moved = m._lastCheck ? Math.hypot(m.pos.x - m._lastCheck.x, m.pos.z - m._lastCheck.z) : 1;
      m._lastCheck = { x: m.pos.x, z: m.pos.z };
      if (!m.moving || moved > 0.25) continue;
      const wp = m.path?.[m.pathI] || [m.goal?.x ?? m.pos.x, m.goal?.z ?? m.pos.z];
      let best = null, bd = 1e9;
      for (const r of [0.9, 1.4, 2.0]) for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2, x = m.pos.x + Math.sin(a) * r, z = m.pos.z + Math.cos(a) * r;
        if (!d.col.pointFree(x, z, m.radius + 0.05, 0.2, 1.6)) continue;
        if (!d.clearLine(m.pos.x, m.pos.z, x, z, m.radius)) continue;
        const free = d.clearLine(x, z, wp[0], wp[1], m.radius);
        const score = Math.hypot(wp[0] - x, wp[1] - z) + (free ? 0 : 6);
        if (score < bd) { bd = score; best = { x, z }; }
      }
      if (best) m._nudge = { ...best, t: 1.4 };
    }
  }

  update(dt, clock) {
    const d = this.d, g = this.g, p = d.player;
    this.flood?.update(dt);
    this.door?.update(dt);
    this.code?.update(dt, clock);
    this.hiding.update(dt);
    if (input.hit('KeyM') && !g.busy) this.box.use();
    this.box.update(dt);
    for (const c of this.crews) c.update(dt);
    // durchgebranntes Flutlicht bleibt aus
    const e = d.elev;
    if (e._floodBroken && e.floodOn) { e.setFlood(false); ui.toast('Das Flutlicht ist durchgebrannt. Heute nicht mehr.'); }
    // Gesiegelt: alle 15 s wird ein Fahrgast aufmerksam
    if (this.night?.stamped) {
      this._sealT = (this._sealT ?? 15) - dt;
      if (this._sealT <= 0) {
        this._sealT = 15;
        const wanderer = d.monsters.find(m => m.type === 'passenger' && m.state === 'wander');
        wanderer?.setState('stalk');
      }
    }
    // Wasserkreise um die eigenen Füße
    if (this.flood && !p.dead && p.moving && this.flood.depthAt(p.pos.x, p.pos.z)) {
      this._ringT = (this._ringT ?? 0) - dt;
      if (this._ringT <= 0) { this._ringT = p.sprinting ? 0.22 : 0.38; this.flood.ring(p.pos.x, p.pos.z, 0.9, 0.8); }
    }
    this.portierNear = d.monsters.some(m => m.type === 'portier' && m.distTo(p.pos) < 12);
  }

  clear() {
    for (const c of this.crews) c.dispose();
    this.crews = [];
    this.flood?.dispose(); this.flood = null;
    this.door?.dispose(); this.door = null;
    this.code = null;
    this.hiding.clear();
    this.box.stop();
    this.portierNear = false;
    this.sink = 0;
    overlay.clear();
    seal.set(false);
    if (audio.muffle) audio.muffle.frequency.setTargetAtTime(22000, audio.now, 0.2);
    const p = this.g.player;
    if (p.frozen && this.g.mode !== 'ride') p.frozen = false;
  }

  // Shader der Wesen dieser Nacht vorab kompilieren (Plan ist aus dem Seed ableitbar)
  async prewarm() {
    const g = this.g, R = g.R, d = this.d;
    const kinds = [...new Set(this.planFor(g.nightInfo, g.state).map(e => e.kind))];
    if (!kinds.length) return;
    await d.preload();
    const tmp = [];
    for (const kind of kinds) {
      const c = charFor(kind);
      if (!c.id) continue;
      try {
        const ch = new Character(c.id);
        const pseudo = { ch, root: ch.root, d, height: 1.8, pos: ch.root.position, yaw: 0, moving: false, crew: null };
        const dr = dress(kind, pseudo, { crew: { n: 0 } });
        ch.update(0.01);
        dr.update?.(0.01, { time: 0, near: false }, {});
        ch.root.position.set(0, -60, 0);
        R.scene.add(ch.root);
        tmp.push([ch, dr]);
      } catch (e) { console.warn('Vorwärmen', kind, e); }
    }
    try { await R.renderer.compileAsync(R.scene, R.camera); } catch { /* */ }
    for (const [ch, dr] of tmp) { dr.dispose?.(); ch.root.removeFromParent(); }
  }

  debug() {
    return {
      night: this.night, crews: this.crews.map(c => ({ n: c.info.n, angry: c.angry, ended: c.ended, pile: c.pile().length })),
      flood: this.flood ? this.flood.zones.map(z => ({ cells: z.cells.length, deep: z.deep.length, salted: +z.salted.toFixed(1) })) : null,
      door: this.door ? { ok: this.door.ok, open: +this.door.open.toFixed(2) } : null,
      code: this.code?.word || null,
      pack: this.d.monsters.filter(m => PACK_KINDS.includes(m.type)).map(m => ({ type: m.type, state: m.state, x: +m.pos.x.toFixed(1), y: +m.pos.y.toFixed(2), z: +m.pos.z.toFixed(1) })),
    };
  }
}
