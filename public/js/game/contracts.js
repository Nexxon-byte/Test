// Aufträge der Disposition: 3–4 Angebote je Nacht am Brett, bis zu zwei annehmen (gleiche Tiefe).
// Unten: Ziele mit goldener Markierung, Pfeil auf dem Kom. Oben: Abrechnung mit Belohnung.
//   Arten: Bergung · Siegelgut · Vermisst · Wartung · Kirchenauftrag · Schwarzmarkt · Goldener Auftrag (Story)

import * as THREE from 'three';
import { RNG, hashStr } from '../core/rng.js';
import { LOOT, SPAWN, TIER_VALUE, pickLoot } from './items.js';
import { floorsFor, STORY_FLOORS } from './floors.js';
import { Character, hasCharacter } from '../gfx/characters.js';
import { Builder } from '../gfx/geo.js';
import { mat } from '../gfx/materials.js';
import { glowTexture } from '../gfx/textures.js';
import { audio } from '../audio/audio.js';
import { ui } from '../ui/ui.js';
import { CS } from '../world/levelgen.js';

export const KINDS = {
  bergung:  { label: 'BERGUNG', from: 'Disposition' },
  spezial:  { label: 'SIEGELGUT', from: 'Kantorei' },
  vermisst: { label: 'VERMISST', from: 'Disposition' },
  wartung:  { label: 'WARTUNG', from: 'Bruderschaft vom Seil' },
  kirche:   { label: 'KIRCHENAUFTRAG', from: 'Kantor Veit' },
  schwarz:  { label: 'SCHWARZMARKT', from: 'Voss' },
  story:    { label: 'GOLDENER AUFTRAG', from: 'Hohe Kanzlei', gold: true },
};

export const MAX_ACCEPT = 2;

// Vorgänger-Mannschaften (Vermisst): Nummer, Name, letzte Kom-Zeile
const LOST_CREWS = [
  [12, 'Br. Aurel Hanke', 'Wir hören Schritte über uns. Über uns ist nur Fels. Aurel lacht nicht mehr.'],
  [19, 'Sr. Mira Lenz', 'Lampe kaputt. Ich zähle meine Schritte zurück zur Kabine. Bei zweihundert war sie nicht da.'],
  [23, 'Br. Tobias Kranich', 'Jemand hat meinen Namen gerufen. Mit meiner Stimme. Ich habe geantwortet. Warum habe ich geantwortet.'],
  [28, 'Sr. Edda Voigt', 'Die Gestalten stehen still, solange die Kerzen brennen. Wir haben keine Kerzen mehr.'],
  [31, 'Br. Konstantin Rehm', 'Sagt Dieter, die Quote war nie zu schaffen. Sagt ihm, wir haben es trotzdem versucht.'],
  [36, 'Sr. Lotte Imhof', 'Es klickt im Gang. Nicht atmen. Nicht atmen. Nicht'],
  [40, 'Br. Gero Falk', 'Drei Uhr sieben. Die Kabine fährt. Wir sind nicht drin. Es ist so still, wenn sie weg ist.'],
  [44, 'Sr. Wilma Stein', 'Ich habe die Strichliste an der Wand gesehen. Sechsundvierzig Striche. Wir sind die Vierundvierzigste. Wer sind die anderen zwei?'],
];

const CODES = ['Z-17', 'Z-33', 'K-412', 'K-907', 'R-3', 'R-46', 'S-12', 'S-307'];

// Welches Gut die Kantorei/Voss gern hätte (je Welt)
const WANTED = {
  kirche:  { dock: ['zelle', 'roehre'], scriptorium: ['walze', 'zehntbuch'], ossuary: ['schaedel', 'weihrauch'], mine: ['salzkristall'], banquet: ['kelch', 'leuchter'] },
  schwarz: { dock: ['funk', 'platine', 'megafon'], scriptorium: ['band', 'deck', 'mikroskop'], ossuary: ['uhr', 'ikone'], mine: ['kompass', 'fernglas2'], banquet: ['schach', 'pferd'] },
};

const PLURAL = { zelle: 'Relaiszellen', roehre: 'Nixie-Röhren', walze: 'Stimmwalzen', zehntbuch: 'Zehntbücher', schaedel: 'Brudersschädel', weihrauch: 'Weihrauchfässer', salzkristall: 'Salzkristalle', kelch: 'Silberkelche', leuchter: 'Messingleuchter' };

// Ortsangaben mit richtigem Fall: „aus der Ladebucht“, „im Skriptorium“
const DATIV = { 'Die Ladebucht': 'der Ladebucht', 'Das Skriptorium': 'dem Skriptorium', 'Das Beinhaus': 'dem Beinhaus', 'Der Saal der Vierzig': 'dem Saal der Vierzig' };
function aus(name, depth) { return `aus ${DATIV[name] || name} (−${depth})`; }
function inn(name, depth) { const d = DATIV[name]; return `${d ? d.replace(/^dem /, 'im ').replace(/^der /, 'in der ') : 'in ' + name} (−${depth})`; }

// ---------------------------------------------------------------- Angebote

// Angebote der aktuellen Nacht (werden im Spielstand gemerkt, damit das Brett stabil bleibt)
export function offersFor(state) {
  const key = `${state.week}-${state.night}`;
  if (state.offers?.key === key) return state.offers.list;
  const rng = new RNG((hashStr(state.name + ':' + key) ^ 0x51ed) >>> 0);
  const list = [];
  if (storyAvailable(state)) list.push(makeStory13(state));
  const kinds = rng.shuffle(['bergung', 'spezial', 'vermisst', 'wartung', 'kirche', 'schwarz']);
  const n = rng.int(3, 4) - (list.length ? 1 : 0);
  for (const k of kinds.slice(0, n)) list.push(makeContract(k, rng, state));
  state.offers = { key, list };
  return list;
}

// Entwicklung: Auftrag einer Art für eine bestimmte Welt (…&contracts=spezial,wartung)
export function devContract(kind, floor, stage, state, seed = 1) {
  if (kind === 'story') return makeStory13();
  return makeContract(kind, new RNG(seed), state, { stage, floor });
}

export function storyAvailable(state) {
  return !state.flags.tutorial && !state.flags.story13 && (state.stats?.nights || 0) >= 1;
}

function pickFloor(rng, state) {
  // meist die tiefste freigeschaltete Stufe, manchmal eine höhere
  const stage = Math.max(1, rng.chance(0.7) ? state.stage : rng.int(1, state.stage));
  const floors = floorsFor(stage, state);
  return { stage, floor: rng.pick(floors) };
}

function makeContract(kind, rng, state, forced = null) {
  const { stage, floor } = forced || pickFloor(rng, state);
  const [themeId, depth, name] = floor;
  const mult = TIER_VALUE[stage] || 1;
  const c = { id: 'c' + rng.int(1e5, 1e6 - 1), kind, stage, floor, target: {}, reward: 0 };
  const from = aus(name, depth), at = inn(name, depth);
  switch (kind) {
    case 'bergung': {
      const v = Math.round((120 + stage * 60 + rng.int(0, 60)) * mult / 10) * 10;
      c.target = { value: v };
      c.title = `Bergung · ${name}`;
      c.text = `Die Kanzlei will Messing sehen. Bringt Bergegut im Wert von ${v} M ${from} herauf. Egal was. Hauptsache, es glänzt.`;
      c.reward = Math.round((30 + v * 0.25) / 5) * 5;
      break;
    }
    case 'spezial': {
      const table = SPAWN[themeId] || SPAWN.default;
      const type = pickLoot(rng, table);
      c.target = { type };
      c.title = `Siegelgut · ${LOOT[type].name}`;
      c.text = `Die Kantorei vermisst ein Stück mit dem Siegel der Ersten Fahrt: „${LOOT[type].name}“. Es liegt ${at}, golden gezeichnet. Behandelt es wie ein Gebet.`;
      c.reward = Math.round((55 + rng.int(0, 35)) * mult / 5) * 5;
      break;
    }
    case 'vermisst': {
      const [crew, who, note] = rng.pick(LOST_CREWS);
      c.target = { crew, who, note };
      c.title = `Vermisst · Mannschaft ${crew}`;
      c.text = `Mannschaft ${crew} ist ${from} nicht zurückgekommen. ${who} trug die Erkennungsmarke. Bringt sie herauf. Die Familien wollen etwas, das sie begraben können.`;
      c.reward = Math.round((50 + rng.int(0, 25)) * mult / 5) * 5;
      break;
    }
    case 'wartung': {
      const code = rng.pick(CODES);
      c.target = { code };
      c.title = `Wartung · Relais ${code}`;
      c.text = `Das Zehntrelais ${code} ${at} hängt. Setzt es von Hand neu – das dauert, und es ist laut. Seid schneller als das, was davon aufwacht.`;
      c.reward = Math.round((70 + rng.int(0, 30)) * mult / 5) * 5;
      break;
    }
    case 'kirche': {
      const opts = WANTED.kirche[themeId] || ['walze'];
      const type = rng.pick(opts), count = rng.int(2, 3);
      c.target = { type, count };
      c.title = `Kirchenauftrag · ${count} ${PLURAL[type] || LOOT[type].name}`;
      c.text = `Kantor Veit lässt ausrichten: Die Kantorei will ${count} ${PLURAL[type] || LOOT[type].name} ${from} zurück. Sie gehören der Kirche, auch da unten. Die Kirche zahlt einen Zehnt obendrauf.`;
      c.reward = Math.round((40 + count * 15) * mult / 5) * 5;
      break;
    }
    case 'schwarz': {
      const opts = WANTED.schwarz[themeId] || ['platine'];
      const type = rng.pick(opts);
      c.target = { type };
      c.title = `Schwarzmarkt · ${LOOT[type].name}`;
      c.text = `Voss sucht „${LOOT[type].name}“ ${from}. „Keine Siegel, keine Fragen, bar auf die Hand. Mein Läufer holt es an der Kabine ab.“ Zählt nicht zur Quote.`;
      c.reward = Math.round((80 + rng.int(0, 60)) * mult / 5) * 5;
      break;
    }
  }
  return c;
}

function makeStory13() {
  const floor = STORY_FLOORS.story13;
  return {
    id: 'story13', kind: 'story', stage: 1, floor, target: { story: 13 }, reward: 300,
    title: 'Der Saal der Vierzig',
    text: 'Die Kanzlei will die Stimmreliquie aus dem Saal der Vierzig, −13. Der Schrein steht hinter der Bühne, wo die Getreuen ihr letztes Mahl hielten. Goldene Siegel – das zahlt die ganze Woche.',
    line: 'd_story_13',
  };
}

// Annehmen: höchstens zwei, alle für dieselbe Welt
export function canAccept(state, c) {
  const acc = state.contracts || [];
  if (acc.some(a => a.id === c.id)) return { ok: false, why: 'ANGENOMMEN' };
  if (acc.length >= MAX_ACCEPT) return { ok: false, why: 'HÄNDE VOLL' };
  if (acc.length && acc[0].floor[0] !== c.floor[0]) return { ok: false, why: 'ANDERE TIEFE' };
  if (c.stage > state.stage) return { ok: false, why: 'SEIL ZU KURZ' };
  return { ok: true };
}

export function accept(state, c) {
  const r = canAccept(state, c);
  if (!r.ok) return false;
  (state.contracts ||= []).push(JSON.parse(JSON.stringify(c)));
  return true;
}

export function drop(state, id) {
  state.contracts = (state.contracts || []).filter(c => c.id !== id);
}

// ---------------------------------------------------------------- Goldene Markierung

const _v = new THREE.Vector3();

class GoldMark {
  constructor(scene, pos, big = false) {
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffc860, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sprite.position.y = 0.35;
    sprite.scale.setScalar(big ? 0.9 : 0.6);
    // schwacher Lichtschaft nach oben
    const beamGeo = new THREE.CylinderGeometry(0.05, 0.22, 2.6, 10, 1, true);
    beamGeo.translate(0, 1.3, 0);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.group.add(sprite, beam);
    this.sprite = sprite; this.beam = beam;
    this.t = Math.random() * 6;
    scene.add(this.group);
  }
  follow(p) { this.group.position.set(p.x, p.y, p.z); }
  update(dt, visible = true) {
    this.t += dt;
    this.group.visible = visible;
    const k = 0.75 + Math.sin(this.t * 2.2) * 0.25;
    this.sprite.material.opacity = 0.55 * k;
    this.beam.material.opacity = 0.06 + 0.04 * k;
    this.beam.rotation.y += dt * 0.4;
  }
  dispose() { this.group.removeFromParent(); this.sprite.material.dispose(); this.beam.geometry.dispose(); this.beam.material.dispose(); }
}

// ---------------------------------------------------------------- Nacht

export class ContractRun {
  constructor(game) {
    this.g = game;
    this.active = [];        // Aufträge dieser Nacht (Kopien aus dem Spielstand)
    this.marks = [];         // { mark, item?, pos?, cid }
    this.props = [];         // Leichen, Relais …
    this.relays = [];
  }

  clear() {
    for (const m of this.marks) m.mark.dispose();
    for (const p of this.props) p.removeFromParent();
    for (const r of this.relays) this.g.interact.remove(r.entry);
    this.marks = []; this.props = []; this.relays = [];
    this.active = [];
  }

  // Ziele in die Ebene setzen (nach dem Beute-Spawn)
  setup(level, info, state) {
    this.clear();
    this.level = level;
    this.active = (state.contracts || []).filter(c => c.floor[0] === info.themeId);
    const rng = new RNG((info.seed ^ 0x7c1) >>> 0);
    this.rng = rng;
    const used = [];
    const spot = (minDist = 6) => {
      const cells = level.farCells(minDist);
      for (const [cx, cz] of rng.shuffle(cells.slice(0, Math.max(12, Math.floor(cells.length * 0.6))))) {
        const [x, z] = level.center(cx, cz);
        if (used.some(([ux, uz]) => Math.hypot(ux - x, uz - z) < 5)) continue;
        const px = x + rng.float(-0.6, 0.6), pz = z + rng.float(-0.6, 0.6);
        if (!this.g.col.pointFree(px, pz, 0.35, 0.05, 1.2)) continue;
        used.push([px, pz]);
        return [px, pz, cx, cz];
      }
      return null;
    };
    for (const c of this.active) {
      c.done = false;
      const mult = TIER_VALUE[info.stage] || 1;
      if (c.kind === 'spezial' || c.kind === 'schwarz') {
        const s = spot(7); if (!s) continue;
        const def = LOOT[c.target.type];
        const value = Math.round((def.value[0] + rng.next() * (def.value[1] - def.value[0])) * mult * (c.kind === 'spezial' ? 1.3 : 1));
        const it = this._spawnItem(c.target.type, s[0], s[1], value, c);
        if (c.kind === 'spezial') it.def = { ...def, name: 'Siegelgut · ' + def.name };
      } else if (c.kind === 'kirche') {
        for (let i = 0; i < c.target.count; i++) {
          const s = spot(5); if (!s) break;
          const def = LOOT[c.target.type];
          this._spawnItem(c.target.type, s[0], s[1], Math.round((def.value[0] + rng.next() * (def.value[1] - def.value[0])) * mult), c);
        }
      } else if (c.kind === 'vermisst') {
        const s = spot(8); if (!s) continue;
        this._corpse(s[0], s[1], c);
      } else if (c.kind === 'wartung') {
        this._relay(level, c);
      }
    }
    if (this.active.length) {
      const first = this.active[0];
      setTimeout(() => ui.komMessage(`AUFTRAG: ${first.title.toUpperCase()}${this.active.length > 1 ? ` (+${this.active.length - 1})` : ''}. GOLDEN GEZEICHNET. – D.`), 4500);
    }
  }

  _spawnItem(type, x, z, value, c) {
    const g = this.g;
    const it = g.items.spawn(type, x, 0, z, { value });
    it.contract = c.id;
    g._itemEntry(it);
    this.marks.push({ mark: new GoldMark(g.R.scene, it.pos), item: it, cid: c.id });
    return it;
  }

  // Die Vermissten: eine Figur der Mannschaft, gestürzt, daneben die Marke; die letzte Kom-Zeile zum Lesen
  _corpse(x, z, c) {
    const g = this.g;
    const char = this.rng.chance(0.5) ? 'crew_m' : 'crew_f';
    if (hasCharacter(char)) {
      const ch = new Character(char);
      const a = ch.play('Death01', { fade: 0, loop: false });
      if (a) { a.time = a.getClip().duration; }
      ch.update(0.001);
      ch.root.position.set(x, 0, z);
      ch.root.rotation.y = this.rng.float(0, Math.PI * 2);
      ch.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      g.R.scene.add(ch.root);
      this.props.push(ch.root);
    }
    const it = this._spawnItem('marke', x + 0.55, z + 0.25, 6, c);
    it.def = { ...LOOT.marke, name: `Erkennungsmarke · Mannschaft ${c.target.crew}` };
    const entry = g.interact.add({
      tag: 'world', pos: new THREE.Vector3(x, 0.4, z), radius: 0.5, maxDist: 2.2, priority: 0.05,
      prompt: `${c.target.who} · Kom lesen`, enabled: () => !g.busy,
      onUse: () => {
        g._openPanel(() => ui.doc({ title: `Kom · Mannschaft ${c.target.crew}`, style: 'terminal', meta: `${c.target.who.toUpperCase()} · LETZTE MELDUNG` }, c.target.note));
      },
    });
    this.relays.push({ entry });
  }

  // Wartung: Relaiskasten an einer Wand, E drücken = Neusetzen beginnen (4 s, laut)
  _relay(level, c) {
    const g = this.g;
    const cells = level.farCells(6).slice(0, 60);
    const slots = level.wallSlots(this.rng.shuffle(cells).map(([x, z]) => [x, z]), 0.2).filter(s => g.col.pointFree(s.x - Math.sin(s.ry) * -0.4, s.z - Math.cos(s.ry) * -0.4, 0.3, 0.2, 1.6));
    const s = slots[0];
    if (!s) return;
    const grp = new THREE.Group();
    const b = new Builder();
    // Kasten mit Warnstreifen, drei Röhren, Hebel
    b.box(mat('steelPanel'), 0, 1.35, 0.1, 0.8, 1.0, 0.2);
    b.box(mat('hazard'), 0, 0.83, 0.2, 0.8, 0.06, 0.02);
    b.box(mat('rust'), 0, 1.86, 0.1, 0.84, 0.04, 0.24);
    for (let i = 0; i < 3; i++) b.cyl(mat('brassDark'), -0.2 + i * 0.2, 1.62, 0.2, 0.035, 0.035, 0.03, 10, { rx: Math.PI / 2 });
    b.box(mat('steel'), 0.3, 1.2, 0.22, 0.05, 0.3, 0.04);
    b.cyl(mat('steel'), 0.1, 0.2, 0.12, 0.03, 0.03, 1.2, 6);   // Kabel nach unten
    grp.add(b.build());
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff3a20, emissiveIntensity: 2 });
    const lamps = [];
    for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), lampMat); m.position.set(-0.2 + i * 0.2, 1.62, 0.22); grp.add(m); lamps.push(m); }
    const lever = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.04), mat('brass'));
    lever.position.set(0.3, 1.25, 0.26);
    lever.rotation.z = 0.6;
    grp.add(lever);
    grp.position.set(s.x - Math.sin(s.ry) * 0.12, 0, s.z - Math.cos(s.ry) * 0.12);
    grp.rotation.y = s.ry;
    grp.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.R.scene.add(grp);
    this.props.push(grp);
    const pos = new THREE.Vector3(0, 1.35, 0.3).applyEuler(grp.rotation).add(grp.position);
    const relay = { c, pos, progress: 0, working: false, lampMat, lever, t: 0 };
    relay.entry = g.interact.add({
      tag: 'world', pos, radius: 0.5, maxDist: 2.2, priority: 0.1,
      prompt: () => c.done ? `Relais ${c.target.code} · läuft` : relay.working ? `Relais ${c.target.code} wird neu gesetzt …` : `Relais ${c.target.code} neu setzen`,
      sub: () => c.done ? 'Erledigt' : relay.working ? bar(relay.progress) : 'dauert 4 Sekunden · laut',
      enabled: () => !g.busy && !c.done,
      onUse: () => { if (!relay.working) { relay.working = true; audio.play('clunk', { pos, vol: 0.6 }); } },
    });
    this.relays.push(relay);
    this.marks.push({ mark: new GoldMark(g.R.scene, new THREE.Vector3(pos.x, 0, pos.z)), relay, cid: c.id });
  }

  // ---------------------------------------------------------------- Takt

  update(dt) {
    const g = this.g, p = g.player;
    for (const m of this.marks) {
      if (m.item) m.mark.follow(m.item.pos);
      const vis = m.item ? !m.item.holder && !g.elev.contains(m.item.pos) : !m.relay.c.done;
      m.mark.update(dt, vis);
    }
    // Wartung: in der Nähe bleiben, bis es fertig ist
    for (const r of this.relays) {
      if (!r.working || r.c.done) continue;
      const near = Math.hypot(p.pos.x - r.pos.x, p.pos.z - r.pos.z) < 2;
      if (!near || p.dead) { r.working = false; ui.toast('Das Relais springt zurück. Von vorn.'); r.progress = 0; continue; }
      r.progress = Math.min(1, r.progress + dt / 4);
      r.t -= dt;
      if (r.t <= 0) {
        r.t = 0.7;
        audio.play(Math.random() < 0.5 ? 'clunk' : 'sparks', { pos: r.pos, vol: 0.55 });
        g.sparks.burst(r.pos.x, r.pos.y + 0.2, r.pos.z, 8, 1.2, 0.8);
        g.director.noise(r.pos.x, r.pos.z, 13, 'relay');
      }
      r.lever.rotation.z = 0.6 - 1.2 * r.progress;
      if (r.progress >= 1) {
        r.c.done = true; r.working = false;
        r.lampMat.emissive.set(0x40ff70);
        audio.play('powerUp', { pos: r.pos, vol: 0.6 });
        audio.play('ding', { pos: r.pos, vol: 0.3, pitch: 1.2 });
        ui.toast(`Relais ${r.c.target.code} läuft wieder. Auftrag erfüllt.`);
      }
    }
  }

  // Nächstes offenes Ziel für den Kom: „Siegelgut ▸ 23 m ↗“
  komLine() {
    const g = this.g, p = g.player;
    if (!this.active.length || g.mode !== 'night') return '';
    let best = null, bd = 1e9;
    for (const m of this.marks) {
      const open = m.item ? !m.item.holder && !g.elev.contains(m.item.pos) : !m.relay.c.done;
      if (!open) continue;
      const pos = m.item ? m.item.pos : m.relay.pos;
      const d = Math.hypot(pos.x - p.pos.x, pos.z - p.pos.z);
      if (d < bd) { bd = d; best = { pos, c: this.active.find(c => c.id === m.cid) }; }
    }
    const lines = [];
    for (const c of this.active) lines.push(`<span class="c ${this.isDone(c) ? 'ok' : ''}">${this.isDone(c) ? '✓' : '◆'} ${c.title}</span>`);
    if (best) {
      const a = Math.atan2(-(best.pos.x - p.pos.x), -(best.pos.z - p.pos.z)) - p.yaw;
      lines.push(`<span class="dir">${arrow(a)} ${Math.round(bd)} m</span>`);
    }
    return lines.join('');
  }

  // Zwischenstand (für den Kom): erfüllt, soweit es sich unten schon sagen lässt
  isDone(c) {
    const g = this.g;
    if (c.kind === 'wartung') return !!c.done;
    if (c.kind === 'bergung') return g._cabValue() + g.inv.value >= c.target.value;
    const have = this._broughtItems().filter(it => it.contract === c.id || (c.kind === 'kirche' && it.type === c.target.type));
    if (c.kind === 'kirche') return have.length >= c.target.count;
    if (c.kind === 'story') return !!c.done;
    return have.length > 0;
  }

  _broughtItems() {
    const g = this.g;
    return [...g.items.inside(p => g.elev.contains(p)), ...[g.inv.hands, ...g.inv.slots].filter(Boolean)];
  }

  // Abrechnung beim Aufstieg: brought = Gegenstände, die mit hochkommen
  settle(brought, state, broughtValue) {
    const out = [];
    for (const c of this.active) {
      let ok = false;
      const mine = brought.filter(it => it.contract === c.id);
      if (c.kind === 'bergung') ok = broughtValue >= c.target.value;
      else if (c.kind === 'wartung' || c.kind === 'story') ok = !!c.done;
      else if (c.kind === 'kirche') ok = brought.filter(it => it.type === c.target.type).length >= c.target.count;
      else ok = mine.length > 0;
      out.push({ id: c.id, kind: c.kind, title: c.title, ok, reward: ok ? c.reward : 0, remove: ok && (c.kind === 'vermisst' || c.kind === 'schwarz') ? mine.map(it => it.id) : [] });
    }
    return out;
  }
}

function bar(k) { const n = Math.round(k * 10); return '█'.repeat(n) + '░'.repeat(10 - n) + ` ${Math.round(k * 100)} %`; }

// Richtung relativ zur Blickrichtung → Pfeil
function arrow(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  const arrows = ['↑', '↖', '←', '↙', '↓', '↘', '→', '↗'];
  const i = Math.round(a / (Math.PI / 4));
  return arrows[(i + 8) % 8];
}

export { CS };
