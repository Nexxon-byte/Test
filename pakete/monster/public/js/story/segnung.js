// DIE SEGNUNG – was geschieht, wenn die Quote verfehlt ist.
// Die Kanzlei nennt es Erwählung. Der Markt nennt es Segnung. Die Stummen nennen es gar nicht.
//
// Ablauf (erste Segnung, ca. 3 Minuten; jede weitere ist kürzer):
//   I    Das Urteil       Veit schlägt das Buch auf. Drei Glocken. Der Regen bleibt in der Luft stehen,
//                         jedes Neon im Markt wird weiß, die Holotafel zeigt GESEGNET · MANNSCHAFT 47.
//   II   Die Kanzel       Aus dem Dunkel über dem Schachtkopf fährt ein Messingkäfig herab – der Hochkantor.
//                         Ein Lichtkegel findet dich. „Kleidet sie in Weiß.“
//   III  Die Prozession   Vier Büttel mit Weihrauch, ein weißer Schleier vor den Augen, Salz fällt wie Schnee.
//                         Kerzen entzünden sich bis zur Neunten. Dieter zieht den 47. Strich. Voss dreht sich weg,
//                         Ada flucht, Anselm drückt dir ein Salzbrot in die Hand.
//   IV   Die Neunte       Baldachin, Gesang, das Gitter schließt sich. Veit: „Singt, wenn ihr könnt.“
//   V    Die Fahrt        Kein Hebel, keine Tiefe – die Nadel läuft über 333 hinaus bis ∞. Hinter den Gittern der
//                         Absätze stehen die Erwählten früherer Mannschaften in Weiß, Nummern 46, 45, 44 …
//                         Das Rauschen bricht durch: „Gib ihr nichts.“ Die Wände werden zu Fleisch.
//   VI   Die Vermittlung  Dunkel. Hände greifen durch das Gitter, Gesichter. Das Telefon klingelt.
//                         Die Vermittlerin will einen Buchstaben deines Namens. ENTSCHEIDUNG:
//                           · einen Buchstaben geben (Richtung Ende A)
//                           · schweigen – die Kanzlei zieht ein Modul der Neunten ein, die Quote steigt
//   VII  Die Rückkehr     Die Neunte fährt hinauf. Markt Neun im Morgengrau: Wachs, Salz, eine zerrissene Bahn.
//                         „Ihr seid wieder da. Das kommt eigentlich nie vor.“
//
// Varianten:  Pilger (einmal): DER SCHULDBRIEF – eine Glocke, zwei Büttel nageln einen Schuldbrief an die
//             Quartierstür, der Fehlbetrag (+25 %) kommt auf die nächste Quote.
//             Erwählt: kein Oben mehr – das Gitter öffnet sich, Weiß, Epilog, der Spielstand ist fort.
//             Kein Buchstabe mehr übrig: Die Vermittlerin nimmt den Rest (Ende A, Haken game.onEnding).
//
// Einbau: pack.js ruft installSegnung(game). Sie hüllt game.closeWeek (Quote verfehlt → Szene),
// game.loadHub (Nachspuren), game._talk/_slate (Sätze danach) ein.

import * as THREE from 'three';
import { CAB } from '../world/cab.js';
import { input } from '../core/input.js';
import { audio } from '../audio/audio.js';
import { music } from '../audio/music.js';
import { voice } from '../audio/voice.js';
import { ui } from '../ui/ui.js';
import { withLoading } from '../ui/loading.js';
import { showSlate } from '../ui/shop.js';
import { Character, hasCharacter } from '../gfx/characters.js';
import { LOOT } from '../game/items.js';
import { saveCampaign, clearCampaign, quotaFor, nameWithLetters, letterCount } from '../game/state.js';
import { unlockCodex } from '../game/documents.js';
import { dress, whiteRobes } from '../game/monsters/standin.js';
import { charFor } from '../game/monsters/kit.js';
import { overlay, choice, cards, cineHud } from '../game/monsters/pack-ui.js';
import { PACK_KOM, SEGNUNG_EPILOG } from './lines-monster.js';
import { LINES } from './lines.js';
import { Rufkanzel, Glockenstuhl, Kerzenweg, Banner, Baldachin, Salzschnee, Galerie, ChorHaende, nachspuren } from './segnung-bau.js';

const Z0 = CAB.LANDING_Z;
const _v = new THREE.Vector3();
const MODULE_ORDER = ['salzkanone', 'flutlicht', 'panzergitter', 'horchgeraet', 'notstrom', 'weihoel', 'kessel', 'lastregal', 'rufglocke'];

export const SEGNUNG = {
  surcharge: 1.25,          // Pilger: Fehlbetrag × 1,25 auf die nächste Quote · Schweigen: Quote × 1,25
  rideDown: 30, rideDownShort: 18, rideUp: 12,
};

export function installSegnung(game) {
  if (game._segnung) return game._segnung;
  const S = new Segnung(game);
  game._segnung = S;
  // Quote verfehlt → Szene statt Hinweis
  const closeWeek = game.closeWeek.bind(game);
  game.closeWeek = () => S.closeWeek(closeWeek);
  const toast = ui.toast.bind(ui);
  ui.toast = (t) => { if (S.muteToast) { S.muteToast = false; return; } toast(t); };
  // Nachspuren im Markt, offene Szene nach Neuladen
  const loadHub = game.loadHub.bind(game);
  game.loadHub = async (opts) => { const hub = await loadHub(opts); S.decorate(hub); return hub; };
  // Sätze danach (einmal je Figur)
  const talk = game._talk.bind(game);
  game._talk = async (who) => { const r = talk(who); S.afterLine(who); return r; };
  const slate = game._slate.bind(game);
  game._slate = (who) => (S.afterSlate(who) ? undefined : slate(who));
  return S;
}

// ============================================================================ Darsteller

// Figur für die Szene: Character + Ausstattung, geht, dreht sich, spielt Clips
class Actor {
  constructor(game, kind, x, z, yaw = 0, { char = null } = {}) {
    const id = char || charFor(kind).id;
    this.ok = !!id && hasCharacter(id);
    if (!this.ok) return;
    this.ch = new Character(id);
    this.root = this.ch.root;
    this.pos = this.root.position;
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.root.rotation.y = yaw;
    this.height = kind === 'hochkantor' ? 2.3 : 1.8;
    this.d = { R: game.R };
    this.moving = false;
    if (kind === 'hochkantor') this.root.scale.setScalar(1.3);
    this.dress = dress(kind, this);
    this.opts = {};
    this.clip = null;
    this.play('Idle_Loop');
    game.R.scene.add(this.root);
  }
  play(name, o = {}) { if (!this.ok) return null; this.clip = name; return this.ch.play(name, { fade: 0.4, ...o }); }
  face(x, z, k = 1) {
    if (!this.ok) return;
    const t = Math.atan2(x - this.pos.x, z - this.pos.z);
    let d = t - this.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    this.yaw += d * k; this.root.rotation.y = this.yaw;
  }
  // Schritt zum Ziel (im Takt aufrufen); true = angekommen
  step(dt, x, z, speed = 1.3) {
    if (!this.ok) return true;
    const dx = x - this.pos.x, dz = z - this.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.08) { if (this.moving) { this.moving = false; this.play('Idle_Loop'); } return true; }
    if (!this.moving) { this.moving = true; this.play('Walk_Formal_Loop'); }
    const s = Math.min(d, speed * dt);
    this.pos.x += dx / d * s; this.pos.z += dz / d * s;
    this.face(x, z, Math.min(1, dt * 6));
    return false;
  }
  update(dt, t) { if (!this.ok) return; this.ch.update(dt); this.dress.update?.(dt, { time: t }, this.opts); }
  dispose() { if (!this.ok) return; this.dress.dispose?.(); this.root.removeFromParent(); }
}

// ============================================================================ Die Szene

class Segnung {
  constructor(game) {
    this.g = game;
    this.running = false;
    this.muteToast = false;
    this.actors = [];
    this.parts = [];
    this.time = 0;
    this.lb = 0;
    this.walkers = [];
    this._tick = (dt) => this.tick(dt);
  }

  // ------------------------------------------------ Einstieg

  variantFor(st) {
    if (st.difficulty === 'erwaehlt') return 'final';
    if (st.difficulty === 'pilger' && !st.flags.pk_debtUsed) return 'debt';
    return 'segnung';
  }

  closeWeek(orig) {
    const g = this.g, st = g.state;
    if (st.sold >= st.quota) {
      const r = orig();
      st.flags.pk_goodWeeks = (st.flags.pk_goodWeeks || 0) + 1;
      if (st.flags.pk_goodWeeks >= 2) st.flags.pk_debtUsed = false;
      st.flags.pk_debt = 0;
      saveCampaign(st);
      return r;
    }
    st.flags.pk_goodWeeks = 0;
    const variant = this.variantFor(st);
    this.muteToast = true;
    this.pending = { variant, shortfall: st.quota - st.sold };
    // Folgen sofort festschreiben (wer jetzt neu lädt, entkommt nicht)
    if (variant === 'debt') this._applyDebt();
    else if (variant === 'segnung') this._applySegnung();
    else { st.flags.pk_segnungPending = 'final'; saveCampaign(st); }
    // Fenster der Kantorei schließen, dann beginnt es
    setTimeout(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', bubbles: true })), 120);
    this._startWhenFree();
    return { ok: false, scene: variant };
  }

  async _startWhenFree() {
    const g = this.g;
    for (let i = 0; i < 240 && g.busy; i++) await g._frameWait();
    await g._wait(0.4);
    this.play(this.pending?.variant || 'segnung');
  }

  _applySegnung() {
    const g = this.g, st = g.state;
    st.marks = Math.floor(st.marks / 2);
    st.cargo = st.cargo.filter(c => !LOOT[c.type]);
    for (const it of [...g.items.items.values()]) if (!it.tool) g.items.remove(it.id);
    st.night = 0; st.sold = 0;
    st.flags.pk_segnungPending = 'segnung';
    saveCampaign(st);
  }

  _applyDebt() {
    const st = this.g.state;
    const debt = Math.round(this.pending.shortfall * SEGNUNG.surcharge / 10) * 10;
    st.week += 1; st.night = 0; st.sold = 0;
    st.quota = quotaFor(st.week, st.difficulty) + debt;
    st.flags.pk_debt = debt;
    st.flags.pk_debtUsed = true;
    saveCampaign(st);
  }

  async play(variant) {
    if (this.running) return;
    this.running = true;
    this.g._packTicks?.add(this._tick);
    try {
      if (variant === 'debt') await this._debt();
      else await this._segnung(variant === 'final');
    } catch (e) {
      console.error('Segnung abgebrochen', e);
      this._cine(false);
    } finally {
      this.g._packTicks?.delete(this._tick);
      this._teardown();
      this.running = false;
      this.act = 'fertig';
    }
  }

  // ------------------------------------------------ Kamera & Takt

  _cine(on) {
    const g = this.g, p = g.player;
    g.busy = on;
    input.enabled = !on;
    p.frozen = on;
    p.lookLocked = on;
    p.noclip = on;          // geführte Schritte ohne Hängenbleiben an Requisiten
    if (!on) p.lookTarget = null;
    this.lbTarget = on ? 0.085 : 0;
    ui.showKom(!on);
    cineHud(on);
    if (on) { ui.clearHints(); ui.setPrompt(null); }
  }

  look(target, speed = 2.5) { const p = this.g.player; p.lookTarget = target.clone ? target.clone() : new THREE.Vector3(...target); p.lookSpeed = speed; }
  headOf(npc, fallback) { return npc?.ch?.head ? npc.ch.head.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3(...fallback); }
  wait(s) { return this.g._wait(s); }
  async until(fn, max = 30) { const t0 = this.time; while (!fn() && this.time - t0 < max) await this.g._frameWait(); }
  // Sprechen mit Obergrenze: Unterbricht eine andere Stimme (interrupt), bliebe das Versprechen sonst offen
  say(id, o) {
    const e = LINES[id];
    const txt = Array.isArray(e) ? e[1] : (e?.parts || []).map(x => x[1]).join(' ');
    return Promise.race([voice.say(id, o), this.g._wait(Math.max(3, txt.length / 11 + 3))]);
  }

  tick(dt) {
    this.time += dt;
    this._dt = dt;
    const R = this.g.R;
    this.lb = this.lb ?? 0;
    this.lb += ((this.lbTarget ?? 0) - this.lb) * Math.min(1, dt * 2);
    R.fx.letterbox = this.lb;
    for (const a of this.actors) a.update(dt, this.time);
    for (const p of this.parts) p.update?.(dt, R.camera);
    for (const w of [...this.walkers]) w(dt);
    this._whiten?.(dt);
    this._rain?.(dt);
  }

  _teardown() {
    for (const a of this.actors) a.dispose();
    for (const p of this.parts) p.dispose?.();
    this.actors = []; this.parts = []; this.walkers = [];
    this._whiten = null; this._rain = null;
    this.chor?.stop(2); this.chor = null;
    this.g.R.fx.letterbox = 0;
    overlay.hide('veil'); overlay.hide('white');
  }

  // Takt-Aufruf austragen (nur wenn noch eingetragen – sonst träfe splice(-1) den letzten)
  _drop(fn) { const i = this.walkers.indexOf(fn); if (i >= 0) this.walkers.splice(i, 1); }

  // Spieler geht einen Weg ab (Szene steuert die Füße)
  async walkPlayer(points, speed = 1.05) {
    const g = this.g, p = g.player;
    let stepT = 0;
    for (const [x, z] of points) {
      const t0 = this.time, limit = Math.hypot(x - p.pos.x, z - p.pos.z) / speed * 1.6 + 2;
      for (;;) {
        const dx = x - p.pos.x, dz = z - p.pos.z, d = Math.hypot(dx, dz);
        if (d < 0.05) break;
        if (this.time - t0 > limit) { p.pos.x = x; p.pos.z = z; break; }   // Sicherheitsnetz
        const dt = Math.min(0.05, this._dt || 0.016);
        const s = Math.min(d, speed * dt);
        p.pos.x += dx / d * s; p.pos.z += dz / d * s;
        stepT -= dt;
        if (stepT <= 0) { stepT = 0.62; audio.play('footstep', { surface: 'stone', intensity: 0.55, vol: 0.8 }); p.bobPhase += Math.PI; }
        await g._frameWait();
      }
    }
  }

  // ------------------------------------------------ Bühne im Markt

  _stage(hub) {
    const g = this.g, R = g.R;
    const set = {};
    set.kanzel = new Rufkanzel(R.scene, g.pool);
    set.bells = new Glockenstuhl(R.scene);
    const pts = [];
    for (let i = 0; i < 8; i++) { pts.push([-1.15, 3.1 + i * 0.75]); pts.push([1.15, 3.1 + i * 0.75]); }
    for (let i = 0; i < 6; i++) pts.push([2.2 + i * 0.95, 8.9 - i * 0.2]);
    set.candles = new Kerzenweg(R.scene, g.pool, pts);
    set.banners = [new Banner(R.scene, -3.7, 9.8, Z0 + 0.32, 0), new Banner(R.scene, 3.7, 9.8, Z0 + 0.32, 0), new Banner(R.scene, -13.7, 7.5, 12, Math.PI / 2, 4.5), new Banner(R.scene, 13.7, 7.5, 12, -Math.PI / 2, 4.5)];
    set.baldachin = new Baldachin(R.scene);
    set.snow = new Salzschnee(R.scene);
    this.parts.push(set.kanzel, set.bells, set.candles, ...set.banners, set.baldachin, set.snow);
    // Strichliste der Disposition (46 → 47)
    set.tallyGroup = nachspuren(hub, g.state, { tally: 46 });
    this.parts.push({ dispose: () => set.tallyGroup.removeFromParent() });
    return set;
  }

  // Neon und Leuchten werden weiß, die Holotafel verkündet
  _whitenHub(hub, dur = 4) {
    const g = this.g, list = [], seen = new Set();
    hub.group.traverse(o => {
      if (!o.isMesh || !o.material) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (seen.has(m) || !m.emissive || (m.emissiveIntensity ?? 0) < 0.3) continue;
        const e = m.emissive; if (e.r + e.g + e.b < 0.15) continue;
        seen.add(m); list.push({ m, c: e.clone() });
      }
    });
    const fixtures = g.pool.fixtures.map(f => ({ f, c: new THREE.Color(f.color) }));
    const white = new THREE.Color(0xfff6ea);
    let k = 0;
    this._whiten = (dt) => {
      if (k >= 1) return;
      k = Math.min(1, k + dt / dur);
      for (const { m, c } of list) m.emissive.copy(c).lerp(white, k);
      for (const { f, c } of fixtures) f.color = c.clone().lerp(white, k).getHex();
      for (const l of g.pool.lights) l.userData.fixture = null;   // Farben neu übernehmen
    };
    // Holotafel
    hub._drawHolo = (t) => {
      const c = hub.holoCanvas, gc = c.getContext('2d'), w = 512, h = 256;
      gc.clearRect(0, 0, w, h);
      gc.fillStyle = 'rgba(240,236,226,0.16)'; gc.fillRect(0, 0, w, h);
      gc.textAlign = 'center';
      gc.fillStyle = '#fff6e0'; gc.font = '600 34px "Cormorant Garamond", serif'; gc.fillText('MANNSCHAFT 47', w / 2, 92);
      gc.font = '600 64px "Cormorant Garamond", serif'; gc.fillText('GESEGNET', w / 2, 162);
      gc.font = '24px "Cormorant Garamond", serif'; gc.fillStyle = '#e0c890'; gc.fillText('Die Kanzlei erwählt. Der Chor empfängt.', w / 2, 206);
      for (let y = 0; y < h; y += 3) { gc.fillStyle = 'rgba(0,0,0,0.22)'; gc.fillRect(0, y, w, 1); }
      if (Math.random() < 0.25) { const gy = Math.random() * h; gc.drawImage(c, 0, gy, w, 10, (Math.random() - 0.5) * 24, gy, w, 10); }
      hub.holoTex.needsUpdate = true;
    };
  }

  // Der Regen bleibt in der Luft stehen
  _freezeRain(hub, dur = 2.5) {
    if (!hub.rainSpeed) return;
    const base = hub.rainSpeed.slice();
    let k = 1;
    this._rain = (dt) => {
      if (k <= 0.015) return;
      k = Math.max(0.015, k - dt / dur);
      for (let i = 0; i < base.length; i++) hub.rainSpeed[i] = base[i] * k;
    };
  }

  // Hub-Figur ein Stück gehen lassen (NPC aus world/npc.js)
  walkNpc(npc, to, speed = 1.6, then = null) {
    if (!npc?.ch) return;
    const root = npc.root;
    npc.ch.play('Walk_Loop', { fade: 0.4 }) || npc.ch.play('Walk_Formal_Loop', { fade: 0.4 });
    const fn = (dt) => {
      const dx = to[0] - root.position.x, dz = to[1] - root.position.z, d = Math.hypot(dx, dz);
      if (d < 0.1) { this._drop(fn); npc.ch.play(then || npc.base, { fade: 0.5 }); return; }
      const s = Math.min(d, speed * dt);
      root.position.x += dx / d * s; root.position.z += dz / d * s;
      root.rotation.y = Math.atan2(dx, dz);
    };
    this.walkers.push(fn);
  }

  turnNpc(npc, yaw, dur = 1.2) {
    if (!npc?.root) return;
    const root = npc.root, y0 = root.rotation.y;
    let t = 0;
    const fn = (dt) => { t += dt; const k = Math.min(1, t / dur); root.rotation.y = y0 + (yaw - y0) * (k * k * (3 - 2 * k)); if (k >= 1) this._drop(fn); };
    this.walkers.push(fn);
  }

  // ============================================================================ DIE SEGNUNG

  async _segnung(final) {
    const g = this.g, R = g.R, st = g.state, p = g.player, hub = g.world;
    if (!hub?.isHub) return;
    const short = (st.stats?.segnungen || 0) > 0;
    const npc = hub.npcs || {};
    this._cine(true);
    music.setZone('silence', 3);
    this.chor = audio.loop('kanzleiChor', { vol: 0.001 });
    const set = this._stage(hub);

    // Spieler an seine Marke vor der Waage der Kantorei
    const mark = [7.2, 7.2];
    this.look(this.headOf(npc.veit, [10.2, 1.7, 7]), 3);
    await this.walkPlayer([mark], 1.6);

    // ---------------- I · Das Urteil
    this.act = 'I';
    await this.say('sg_veit_1');
    await this.wait(0.6);
    await this.say('sg_veit_2');
    await this.wait(0.9);
    if (!short) await this.say('sg_veit_3');
    // Die erste Glocke – rückwärts hinaus auf den Platz, der Regen bleibt stehen, das Neon wird weiß
    set.bells.toll(1, 1);
    R.glitchPulse(0.25);
    this._freezeRain(hub);
    this._whitenHub(hub, 5);
    this.chor?.setVol(0.26, 3);
    this.look(new THREE.Vector3(1.5, 4.2, 12), 1.1);
    await this.walkPlayer([[5.6, 7.1], [3.6, 8.2], [2.6, 10.8]], 0.9);
    this.look(new THREE.Vector3(0, 10.0, Z0 + 1), 1.2);
    await this.wait(1.2);
    set.bells.toll(0, 0.9);
    for (const b of set.banners) b.unroll();
    await this.wait(3.2);
    set.bells.toll(2, 0.85);
    this.say('sg_ls_1');
    await this.wait(short ? 2.5 : 4.5);

    // ---------------- II · Die Kanzel
    this.act = 'II';
    this.look(new THREE.Vector3(0, 9.5, Z0 + 1.2), 1.2);
    const hk = new Actor(g, 'hochkantor', 0, Z0 + 0.75, 0);
    this.actors.push(hk);
    set.kanzel.lower(1);
    audio.play('cableCreak', { pos: new THREE.Vector3(0, 9, Z0 + 1), vol: 0.6 });
    const follow = (dt) => { if (hk.ok && hk.stage !== 'out') { const c = set.kanzel.cage.position; hk.pos.set(0, c.y, Z0 + c.z); } };
    this.walkers.push(follow);
    await this.wait(short ? 4 : 6.5);
    audio.play('gate', { pos: new THREE.Vector3(0, 6.5, Z0 + 1), vol: 0.5 });
    this._drop(follow);
    hk.stage = 'out';
    // Hochkantor tritt an die Brüstung
    const hkTo = [0, Z0 + 1.35];
    this._hkWalk = (dt) => { if (hk.ok) { hk.pos.y = set.kanzel.floorY; if (!hk.step(dt, hkTo[0], hkTo[1], 0.7)) return; hk.face(p.pos.x, p.pos.z, Math.min(1, dt * 3)); if (hk.clip !== 'Idle_Talking_Loop') hk.play('Idle_Talking_Loop'); } };
    this.walkers.push(this._hkWalk);
    set.kanzel.aim(p.pos.x, p.pos.z, 1);
    audio.play('lightBurst', { pos: new THREE.Vector3(0, 7, Z0 + 1), vol: 0.5 });
    await this.wait(1.2);
    this.look(new THREE.Vector3(0, set.kanzel.floorY + 2.3, Z0 + 1.3), 2);
    await this.say('sg_hk_1');
    // Anselm macht sich auf den Weg (wenn er schon im Markt ist)
    if (st.flags.anselm && npc.anselm?.ch) this.walkNpc(npc.anselm, [-1.7, 6.6], 2.2, 'Idle_Loop');
    await this.say('sg_hk_2');
    if (!short) await this.say('sg_hk_3');
    await this.say('sg_hk_4');

    // Die Büttel kommen aus der Kantorei
    const buttel = [];
    const starts = [[8.2, 4.4], [8.2, 5.2], [8.2, 6.0], [8.2, 6.8]];   // aus der Seitentür der Kantorei
    const flank = [[-0.9, -0.9], [0.9, -0.9], [-0.9, 0.9], [0.9, 0.9]];
    for (let i = 0; i < 4; i++) {
      const b = new Actor(g, 'buettel', starts[i][0], starts[i][1], -Math.PI / 2);
      b.opts = { swing: 1 };
      buttel.push(b); this.actors.push(b);
    }
    const approach = [];
    buttel.forEach((b, i) => { const f = flank[i]; const fn = (dt) => b.step(dt, p.pos.x + f[0], p.pos.z + f[1], 1.5); approach.push(fn); setTimeout(() => { if (approach.includes(fn)) this.walkers.push(fn); }, (i + 1) * 400); });
    this.look(new THREE.Vector3(7.8, 1.5, 5.6), 1.6);
    set.snow.start();
    await this.wait(short ? 3 : 5);
    // Weiß kleiden: Schleier vor den Augen
    audio.play('veil', { vol: 0.6 });
    overlay.show('veil');
    await this.wait(1.6);

    // ---------------- III · Die Prozession
    this.act = 'III';
    set.candles.lightAll(0.28);
    set.baldachin.raise();
    this.chor?.setVol(0.34, 2);
    this.say('sg_chor_1');
    // Büttel gehen mit: links und rechts, zwei vorn, zwei hinten
    const escort = (dt) => {
      const f = p.forward(_v); f.y = 0; f.normalize();
      const r = new THREE.Vector3(-f.z, 0, f.x);
      buttel.forEach((b, i) => { const s = i % 2 ? 1 : -1, fw = i < 2 ? 1.1 : -1.2; b.step(dt, p.pos.x + r.x * s * 0.95 + f.x * fw, p.pos.z + r.z * s * 0.95 + f.z * fw, 1.4); });
    };
    // Anmarsch der Büttel beenden – ab jetzt geleiten sie
    this.walkers = this.walkers.filter(w => !approach.includes(w));
    approach.length = 0;
    this.walkers.push(escort);
    const path = [[1.8, 8.6], [0.6, 6.2], [0.15, 4.6], [0.15, 3.3]];
    // Reaktionen des Markts entlang des Wegs
    const reactions = (async () => {
      this.look(this.headOf(npc.ada, [10.6, 1.4, 17]), 1.5);
      if (npc.ada?.ch) { npc.ada.ch.play('Idle_Loop', { fade: 0.8 }); npc.ada.ch.lookAt?.(p.pos); }
      this.say('sg_ada_1');
      await this.wait(2.5);
      // Dieter zieht den 47. Strich
      this.look(this.headOf(npc.dieter, [-10.2, 1.6, 7]), 1.4);
      if (npc.dieter?.ch) { this.turnNpc(npc.dieter, -Math.PI / 2, 1.2); setTimeout(() => npc.dieter.ch.play('Interact', { fade: 0.4, loop: false }), 1200); }
      await this.say('sg_dieter_1');
      setTimeout(() => { audio.play('paper', { vol: 0.3 }); set.tallyGroup.removeFromParent(); set.tallyGroup = nachspuren(hub, g.state, { tally: 47 }); }, 900);
      await this.say('sg_dieter_2');
      if (npc.dieter?.ch) { this.turnNpc(npc.dieter, Math.PI / 2, 1.5); setTimeout(() => npc.dieter.ch.play(npc.dieter.base, { fade: 0.6 }), 1500); }
      // Voss dreht sich weg
      this.look(this.headOf(npc.voss, [-10.5, 1.6, 17]), 1.8);
      if (npc.voss?.root) this.turnNpc(npc.voss, -Math.PI / 2 - 0.3, 1.6);
      await this.say('sg_voss_1');
      // Anselm und sein Brot
      if (st.flags.anselm && npc.anselm?.ch) {
        this.look(this.headOf(npc.anselm, [-1.7, 1.7, 6.6]), 2.5);
        npc.anselm.ch.play('Interact', { fade: 0.3, loop: false });
        await this.wait(1.2);
        try { const it = g.items.spawn('salzbrot', p.pos.x, 0, p.pos.z); g.items.take(it.id, 'me'); g.inv.add(it); } catch { /* */ }
        ui.toast('Anselm drückt dir ein Salzbrot in die Hand.');
        audio.play('pickup', { vol: 0.4 });
        await this.wait(1.2);
        this.walkNpc(npc.anselm, [0, 30.2], 1.4, 'Idle_Loop');
      }
      this.look(new THREE.Vector3(0, 1.6, -1), 1.5);
    })();
    await this.walkPlayer(path, 0.95);
    await reactions;
    this.say('sg_chor_2');

    // ---------------- IV · Die Neunte
    this.act = 'IV';
    g.elev.candlesLit = true;
    g.elev.light = 0.35;
    await this.walkPlayer([[0.1, 1.0], [0.1, -0.7]], 0.9);
    this.look(new THREE.Vector3(0, 1.7, 6), 2.2);
    // Büttel reihen sich auf dem Absatz auf und singen
    this.walkers = this.walkers.filter(w => w !== escort);
    buttel.forEach((b, i) => { const x = -2.1 + i * 1.4; this.walkers.push((dt) => { if (b.step(dt, x, Z0 + 1.0, 1.3)) b.face(0, 0, Math.min(1, dt * 3)); }); });
    await this.wait(2.2);
    await this.say('sg_veit_4');
    this.say('sg_chor_3');
    await this.say('sg_hk_5');
    audio.play('gate', { vol: 0.6 });
    g.elev.closeDoors();
    await this.wait(2.2);
    audio.play('doorSlide', { vol: 0.4 });
    await this.wait(1.4);

    // Der Markt verschwindet hinter den Türen
    this.chor?.setVol(0.18, 1.5);
    const setParts = this.parts.splice(0);
    for (const x of setParts) x.dispose?.();
    for (const a of this.actors) a.dispose();
    this.actors = []; this.walkers = [];
    this._whiten = null; this._rain = null;
    g._keepOnlyCabinItems();
    g._clearWorld();
    g.mode = 'ride';

    // ---------------- V · Die Fahrt
    this.act = 'V';
    await this._rideDown(short);

    // ---------------- VI · Die Vermittlung
    this.act = 'VI';
    const outcome = await this._vermittlung(final);
    if (outcome === 'end') return;

    // ---------------- VII · Die Rückkehr
    this.act = 'VII';
    await this._rideUp();
    await this._return(outcome);
  }

  async _rideDown(short) {
    const g = this.g, e = g.elev, p = g.player;
    // Kabinenlicht glimmt noch schwach und erlischt mit der Tiefe
    const L0 = 0.22;
    e.lightMode = 'normal';
    e.light = L0;
    e.candlesLit = true;
    if (p.lampOn) p.toggleLamp(false);   // die eigene Lampe blendet sonst am Gitter
    p.lookLocked = false;           // umsehen erlaubt, gehen nicht
    p.lookTarget = null;
    const motor = audio.loop('motor', { vol: 0.35 });
    e.onRideEvent = (kind, k) => g._rideSound(kind, k);
    e.startRide({ speed: -6.5, from: 'concrete', style: 'concrete', stage: 6, depth: 666, fromDepth: 0, toLabel: '∞', home: true });
    e.setDisplay('▼');
    const gal = new Galerie(e.shaftRig, { chars: ['stumm'], from: 46 });
    this.parts.push(gal);
    const T = short ? SEGNUNG.rideDownShort : SEGNUNG.rideDown;
    const t0 = this.time;
    let braking = false, r1 = false;
    const styles = [[0.22, 'stone'], [0.42, 'salt'], [0.62, 'ossuary'], [0.82, 'flesh']];
    for (;;) {
      const el = this.time - t0, k = Math.min(1, el / T);
      for (const s of styles) if (k > s[0] && !s.done) { s.done = true; e.setShaftStyle(s[1]); }
      if (e.lightMode !== 'off') {
        e.light = L0 * Math.max(0, 1 - k * 1.3);
        if (k > 0.75) { e.lightMode = 'off'; audio.play('bulbPop', { vol: 0.35 }); }
      }
      if (!r1 && k > 0.4) { r1 = true; this.say('sg_r_1'); }
      this.chor?.setVol(0.18 * Math.max(0, 1 - k * 1.6), 0.5);
      motor?.setSpeed(e.speed);
      const depth = k < 0.9 ? Math.round(666 * k * k) : 0;
      e.setNeedleDepth(Math.min(333, 333 * k * 1.1));
      e.needleJitter = k > 0.7 ? 0.08 : 0.01;
      e.setDisplay(k < 0.9 ? '−' + depth : '∞', { glitch: k > 0.85 });
      if (!braking && el > T - 3) { braking = true; e.stopRide(); }
      if (braking && e.state === 'stopped') break;
      if (el > T + 10) break;
      if (Math.random() < 0.012) audio.play('cableCreak', { vol: 0.3 });
      await g._frameWait();
    }
    motor?.stop(1);
    audio.play('jolt', { vol: 0.8 });
    p.shake = 1.2;
    e.needleJitter = 0;
    this.chor?.stop(2); this.chor = null;
  }

  // Unten: Dunkel, Hände, Telefon, Entscheidung
  async _vermittlung(final) {
    const g = this.g, e = g.elev, p = g.player, st = g.state;
    const heart = audio.loop('heart');
    heart?.setVol(0.5); heart?.setRate?.(70);
    await this.wait(2.5);
    const hands = new ChorHaende(g.R.scene);
    this.parts.push(hands);
    hands.reach(true);
    p.lookLocked = true;
    this.look(new THREE.Vector3(0, 1.4, CAB.GATE_Z + 1), 1.2);
    for (const [i, id] of ['c_near_1', 'c_near_2', 'c_near_3'].entries()) setTimeout(() => voice.say(id, { pos: new THREE.Vector3((i - 1) * 1.2, 1.5, CAB.GATE_Z + 0.8) }), 1500 + i * 2600);
    await this.wait(7);
    // Telefon
    const phone = e.interactables.find(i => i.id === 'phone')?.pos || new THREE.Vector3(2, 1.45, -1.5);
    e.ring(true);
    const ring = audio.loop('phoneRing', { pos: phone.clone(), vol: 0.6 });
    this.look(phone, 2);
    await this.wait(3.2);
    ring?.stop(0.1); e.ring(false);
    audio.play('phonePickup', { vol: 0.5 });
    e.phoneActive = true;
    await this.wait(0.8);
    await this.say('sg_v_1');
    if (final) {
      await this.say('sg_v_perm_1');
      await this.say('sg_v_perm_2');
      heart?.stop(1);
      await this._whiteEnd('final');
      return 'end';
    }
    await this.say('sg_v_2');
    await this.say('sg_v_3');
    const left = letterCount(st.name || '') - (st.letters || 0);
    if (left <= 1) {
      await this.say('sg_v_none_1');
      await this.say('sg_v_none_2');
      heart?.stop(1);
      await this._whiteEnd('name');
      return 'end';
    }
    await this.say('sg_v_4');
    // die Kerzen gehen aus
    audio.play('whisper', { vol: 0.7, dur: 1.8 });
    e.candlesLit = false;
    await this.wait(1.2);
    input.unlock?.();
    const now = nameWithLetters(st.name, st.letters || 0), after = nameWithLetters(st.name, (st.letters || 0) + 1);
    this.act = 'Wahl';
    const pick = await choice('DIE VERMITTLUNG', 'Einen Buchstaben Ihres Namens, Seilkind.\nNur einen kleinen.', [
      ['give', 'Einen Buchstaben geben', `${now}   →   ${after}`],
      ['silence', 'Schweigen', 'Die Kanzlei zahlt für dich. Sie nimmt es sich von der Neunten.'],
    ]);
    input.lock?.();
    e.candlesLit = true;
    let outcome = pick;
    if (pick === 'give') {
      st.letters = (st.letters || 0) + 1;
      st.flags.pk_segnungChoice = 'give';
      saveCampaign(st);
      g.R.glitchPulse(0.9);
      audio.play('stinger', { kind: 'reveal', vol: 0.6 });
      g._updateKom();
      await this.say('sg_v_give');
      hands.reach(false);
      await this.say('sg_v_up');
    } else {
      this.say('sg_r_2');
      hands.grip();
      for (let i = 0; i < 6; i++) setTimeout(() => { audio.play('gate', { vol: 0.5, dur: 0.4 }); e.shake = Math.max(e.shake, 0.9); }, i * 380);
      await this.wait(2.8);
      await this.say('sg_v_refuse');
      const lost = this._confiscate();
      st.flags.pk_segnungChoice = 'silence';
      st.flags.pk_segnungLost = lost;
      st.quota = Math.round(st.quota * SEGNUNG.surcharge / 10) * 10;
      saveCampaign(st);
      hands.reach(false);
    }
    e.phoneActive = false;
    heart?.stop(2);
    return outcome;
  }

  // Schweigen: die Kanzlei zieht ein Modul der Neunten ein (oder alle Marken)
  _confiscate() {
    const g = this.g, st = g.state;
    const id = MODULE_ORDER.find(m => (st.modules?.[m] || 0) > 0);
    if (id) {
      const lv = (st.modules[id] || 1) - 1;
      if (lv > 0) st.modules[id] = lv; else delete st.modules[id];
      try { g.elev.setModule(id, lv); g._rebuildCabEntries?.(); } catch { /* */ }
      return id;
    }
    st.marks = 0;
    return 'marken';
  }

  async _rideUp() {
    const g = this.g, e = g.elev, p = g.player;
    const motor = audio.loop('motor', { vol: 0.4 });
    e.startRide({ speed: 7, from: 'flesh', style: 'flesh', stage: 6, depth: 0, fromDepth: 666, fromLabel: '∞', toLabel: 'IX', homeArrival: true, startLeaf: 'rust' });
    const t0 = this.time, T = SEGNUNG.rideUp;
    let braking = false, lit = false, styled = false;
    for (;;) {
      const el = this.time - t0, k = Math.max(0, 1 - el / T);
      if (!styled && k < 0.6) { styled = true; e.setShaftStyle('concrete'); }
      if (!lit && k < 0.5) { lit = true; e.lightMode = 'normal'; e.light = 0.8; audio.play('powerUp', { vol: 0.4 }); overlay.hide('veil'); }
      if (!braking && el > T - 3) { braking = true; e.stopRide(); }
      if (braking && e.state === 'stopped') break;
      if (el > T + 10) break;
      motor?.setSpeed(e.speed);
      e.setNeedleDepth(333 * k);
      e.setDisplay(k > 0.02 ? (k > 0.8 ? '∞' : '−' + Math.round(666 * k * k)) : 'OBEN');
      await g._frameWait();
    }
    e.setNeedleDepth(0); e.setDisplay('OBEN');
    motor?.stop(0.6);
    audio.play('jolt', { vol: 0.5 });
    for (const x of this.parts.splice(0)) x.dispose?.();
  }

  async _return(outcome) {
    const g = this.g, st = g.state;
    await withLoading(() => g.loadHub({ spawn: 'cabin' }), { kind: 'hub', depth: 666, sub: 'Die Neunte bringt zurück, was von dir übrig ist.' });
    st.flags.pk_segnungPending = false;
    st.stats.segnungen = (st.stats.segnungen || 0) + 1;
    st.flags.pk_tally = 47;
    st.flags.pk_after_visits = 2;
    st.flags.pk_after = { veit: 'sg_after_veit', voss: 'sg_after_voss', ada: 'sg_after_ada', dieter: 'sg_after_dieter', hanne: true };
    unlockCodex(st, 'segnung');
    unlockCodex(st, 'hochkantor');
    saveCampaign(st);
    // Nachspuren sofort (loadHub war vor dem Setzen der Flags)
    this.decorate(g.world);
    this._cine(false);
    ui.komMessage(PACK_KOM.k_back, { glitch: true });
    voice.sequence(['sg_d_back_1', 'sg_d_back_2'], 0.6);
    const lost = st.flags.pk_segnungLost;
    ui.setObjective(`Neue Zehntwoche · Quote ${st.sold} / ${st.quota} M${outcome === 'silence' ? (lost === 'marken' ? ' · Marken eingezogen' : ' · ein Modul eingezogen') : ''}`);
    g._updateKom();
  }

  // Weiß. Epilog. Kein Oben mehr.
  async _whiteEnd(kind) {
    const g = this.g, e = g.elev;
    e.openGate?.();
    audio.play('gate', { vol: 0.7 });
    await this.say('sg_c_perm');
    audio.play('whiteout', { vol: 0.8, dur: 3.6 });
    overlay.show('white');
    await this.wait(4.2);
    this._cine(false);
    g.busy = true;
    if (kind === 'name' && typeof g.onEnding === 'function') { g.onEnding('vermittlerin'); return; }
    await cards(SEGNUNG_EPILOG);
    clearCampaign();
    try { sessionStorage.setItem('tiefer.toTitle', '1'); } catch { /* */ }
    location.reload();
  }

  // ============================================================================ DER SCHULDBRIEF (Pilger)

  async _debt() {
    const g = this.g, st = g.state, p = g.player, hub = g.world;
    if (!hub?.isHub) return;
    const npc = hub.npcs || {};
    this._cine(true);
    music.duck(0.35, 14);
    const bells = new Glockenstuhl(g.R.scene);
    this.parts.push(bells);
    this.look(this.headOf(npc.veit, [10.2, 1.7, 7]), 3);
    await this.say('sg_debt_1');
    bells.toll(1, 0.9);
    // Neon flackert rot
    const saved = g.pool.fixtures.map(f => [f, f.color, f.mode]);
    for (const f of g.pool.fixtures) { f.color = 0xff2a1a; f.mode = 'strobe'; }
    for (const l of g.pool.lights) l.userData.fixture = null;
    this.say('sg_debt_hk');
    await this.wait(2.8);
    for (const [f, c, m] of saved) { f.color = c; f.mode = m; }
    for (const l of g.pool.lights) l.userData.fixture = null;
    await this.say('sg_debt_2');
    // Zwei Büttel nageln den Schuldbrief an die Quartierstür
    const door = [-6, 30.0];
    const b1 = new Actor(g, 'buettel', 8.9, 10.8, 0), b2 = new Actor(g, 'buettel', 9.4, 10.8, 0);
    this.actors.push(b1, b2);
    this.look(new THREE.Vector3(-6, 1.6, 30), 0.8);
    await Promise.all([b1, b2].map((b, i) => new Promise(res => { const tgt = [door[0] + (i ? 0.7 : -0.7), door[1]]; const fn = (dt) => { if (b.step(dt, tgt[0], tgt[1], 2.4)) { this._drop(fn); res(); } }; this.walkers.push(fn); })));
    b1.face(-6, 31); b2.face(-6, 31);
    b1.play('Interact', { loop: false });
    audio.play('nail', { pos: new THREE.Vector3(-6, 1.6, 30.6), vol: 1 });
    this.decorate(hub);
    await this.wait(1.6);
    ui.komMessage(PACK_KOM.k_debt);
    await this.say('sg_debt_d');
    for (const b of [b1, b2]) this.walkers.push((dt) => b.step(dt, 9, 31, 1.6));
    await this.wait(1.5);
    this._cine(false);
    ui.setObjective(`Neue Zehntwoche · Quote ${st.quota} M (mit Schuldbrief: ${st.flags.pk_debt} M)`);
    g._updateKom();
  }

  // ============================================================================ Danach

  // Markt nach einer Segnung: Nachspuren, Siegel, Schuldbrief; eine offene Segnung holt einen wieder ein
  decorate(hub) {
    if (!hub?.isHub) return;
    const g = this.g, st = g.state;
    hub.group.getObjectByName('Nachspuren')?.removeFromParent();
    const tally = st.flags.pk_tally || 0;
    if (tally || st.flags.pk_debt || (st.flags.pk_after_visits || 0) > 0) nachspuren(hub, st, { tally: tally || 46, seal: (st.stats?.segnungen || 0) > 0, debt: (st.flags.pk_debt || 0) > 0 });
    if ((st.flags.pk_debt || 0) > 0 && !this._debtEntry?.alive) {
      const e = g.interact.add({
        tag: 'world', pos: new THREE.Vector3(-5.7, 1.55, 30.5), radius: 0.35, maxDist: 2.2, priority: 0.4,
        prompt: 'Schuldbrief lesen', enabled: () => !g.busy && (st.flags.pk_debt || 0) > 0,
        onUse: () => ui.doc({ title: 'Schuldbrief der Hohen Kanzlei', meta: `Zehntwoche ${st.week} · Mannschaft 47`, style: 'church' },
          `Mannschaft Siebenundvierzig schuldet der Hohen Kanzlei ${st.flags.pk_debt} Marken Zehnt nebst Zins.\n\nZahlbar mit der Quote dieser Zehntwoche.\n\nWer zweimal säumig ist, wird gesegnet.\n\nGez. i. A. der Hochkantor`),
      });
      this._debtEntry = { e, alive: true };
    }
    // Eine Segnung, die beim letzten Mal abgebrochen wurde (Spiel verlassen), holt einen ein
    const pend = st.flags.pk_segnungPending;
    if (pend && !this.running) {
      this.pending = { variant: pend === 'final' ? 'final' : 'segnung', shortfall: 0 };
      setTimeout(() => { if (!this.running && g.mode === 'hub') this._startWhenFree(); }, 2500);
    }
  }

  // Beim ersten Gespräch nach der Segnung
  afterLine(who) {
    const st = this.g.state, a = st.flags.pk_after;
    if (!a || !a[who] || a[who] === true) return;
    const id = a[who];
    delete a[who];
    saveCampaign(st);
    voice.say(id);
  }

  afterSlate(who) {
    const st = this.g.state, a = st.flags.pk_after;
    if (who !== 'hanne' || !a?.hanne) return false;
    delete a.hanne;
    saveCampaign(st);
    showSlate('Mutter Hanne', 'Keiner kommt zurück. Keiner.\n\nWas habt ihr ihnen gegeben?\n\n(Sie wischt die Tafel nicht ab. Sie legt sie weg, mit der Schrift nach unten.)');
    return true;
  }
}
