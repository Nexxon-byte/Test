// Die Spieluhr: kleines Messingkästchen, auf dem Deckel ein Mädchen in Weiß. Ilses Lied.
// Werkzeug (Taste M oder Linksklick in der Hand): aufziehen, zwölf Sekunden Musik. Die Feder hält
// drei Lieder pro Nacht. Wirkung: Der Portier bleibt stehen, kniet, lauscht. Die Vorgänger halten inne.
// Aber: Die Musik ist laut (Hörer kommen) – und der Nachsprecher merkt sich die Melodie.
//
// Item-Daten (TOOLS.spieluhr) und das Modell kommen aus pack.js (installItems).

import * as THREE from 'three';
import { audio } from '../audio/audio.js';
import { music } from '../audio/music.js';
import { voice } from '../audio/voice.js';
import { ui } from '../ui/ui.js';
import { mat, glowMat } from '../gfx/materials.js';
import { Builder } from '../gfx/geo.js';

export const MUSICBOX = { charges: 3, windUp: 1.2, noiseRadius: 14, notes: 14, tempo: 74 };

export const SPIELUHR_DEF = {
  name: 'Spieluhr', weight: 0.6, tool: 'musicbox',
  desc: 'Ein Messingkästchen, auf dem Deckel ein Mädchen in Weiß. Aufziehen: [M] oder Linksklick. Zwölf Sekunden Ilses Lied. Die Feder hält drei Lieder pro Nacht.',
  view: { len: 0.14, pos: [0.04, 0.03, 0], rot: [0.35, 0.6, 0.05] },
};

// Prozedurales Modell (bis zuhause ein echtes kommt)
export function buildMusicBoxModel(b, g) {
  b.box(mat('walnut'), 0, 0.03, 0, 0.12, 0.06, 0.08);
  b.box(mat('brass'), 0, 0.062, 0, 0.124, 0.006, 0.084);
  // aufgeklappter Deckel mit Spiegel
  b.box(mat('walnut'), 0, 0.1, -0.042, 0.12, 0.08, 0.006, { rx: -0.25 });
  b.box(glowMat(0x9aa4a8, 0.25, 'mbMirror'), 0, 0.1, -0.038, 0.1, 0.064, 0.002, { rx: -0.25 });
  // Mädchen in Weiß auf dem Drehteller
  b.cyl(mat('brass'), 0, 0.064, 0.01, 0.022, 0.022, 0.004, 12);
  b.cyl(mat('fabricWhite'), 0, 0.068, 0.01, 0.004, 0.012, 0.03, 8);
  b.sphere(mat('bone'), 0, 0.104, 0.01, 0.0065, 8, 6);
  b.sphere(glowMat(0xffd070, 1.6, 'mbDot'), 0, 0.088, 0.0135, 0.002, 6, 4);
  // Kurbel an der Seite
  b.cyl(mat('brass'), 0.066, 0.03, 0, 0.004, 0.004, 0.018, 6, { rz: Math.PI / 2 });
  b.box(mat('brass'), 0.076, 0.04, 0, 0.004, 0.022, 0.004);
  b.sphere(mat('bone'), 0.076, 0.052, 0, 0.005, 6, 4);
}

export class MusicBox {
  constructor(game) {
    this.g = game;
    this.playing = null;     // { until, pos }
    this.winding = 0;
  }

  // Spieluhr im Inventar?
  find() {
    const inv = this.g.inv;
    return [inv.hands, ...inv.slots].find(it => it && it.type === 'spieluhr') || null;
  }

  startNight() {
    for (const it of this.g.items.items.values()) if (it.type === 'spieluhr') it.data = { ...(it.data || {}), charges: MUSICBOX.charges };
    this.stop();
  }

  use() {
    const g = this.g, it = this.find();
    if (!it) return false;
    if (g.mode !== 'night') { ui.toast('Nicht hier oben. Die Kantoren mögen das Lied nicht.'); return true; }
    if (this.playing || this.winding > 0) return true;
    it.data ||= { charges: MUSICBOX.charges };
    if ((it.data.charges ?? MUSICBOX.charges) <= 0) { ui.toast('Die Feder ist müde. Heute Nacht nicht mehr.'); audio.play('dingWrong', { vol: 0.2 }); return true; }
    it.data.charges = (it.data.charges ?? MUSICBOX.charges) - 1;
    this.winding = MUSICBOX.windUp;
    audio.play('windUp', { vol: 0.5 });
    g.director.noise(g.player.pos.x, g.player.pos.z, 5, 'crank');
    return true;
  }

  _start() {
    const g = this.g, p = g.player, st = g.state;
    const pos = new THREE.Vector3(p.pos.x, 1.2, p.pos.z);
    // in der Hand: ohne Raumposition (klingt nah, egal wohin man geht)
    const h = music.musicBox({ vol: 0.5, tempo: MUSICBOX.tempo, wobble: 6, detune: -6, count: MUSICBOX.notes, rev: 0.8, bus: 'sfx' });
    this.playing = { h, pos, until: g.time + (h.duration || 12), started: g.time };
    const it = this.find();
    ui.toast(`Ilses Lied. (${it?.data?.charges ?? 0} übrig)`);
    if (!st.flags.pk_musicbox) { st.flags.pk_musicbox = true; voice.say('v_musicbox_1', { delay: 2.5 }); }
    (g.director._pack ||= {}).boxHeard = true;
  }

  stop() { this.playing?.h?.stop(); this.playing = null; this.winding = 0; }

  // Spielt sie gerade? → Weltpunkt der Musik (für Portier, Vorgänger, Hörer)
  // Schon das Aufziehen hören sie (das Klicken der Ratsche)
  get source() {
    if (this.playing) return this.playing.pos;
    if (this.winding > 0) return (this._wpos ||= new THREE.Vector3()).set(this.g.player.pos.x, 1.2, this.g.player.pos.z);
    return null;
  }

  update(dt) {
    const g = this.g;
    if (this.winding > 0) {
      this.winding -= dt;
      if (this.winding <= 0) { this.winding = 0; this._start(); }
      return;
    }
    if (!this.playing) return;
    // Die Musik folgt der Hand, die sie hält
    this.playing.pos.set(g.player.pos.x, 1.2, g.player.pos.z);
    this._noiseT = (this._noiseT ?? 0) - dt;
    if (this._noiseT <= 0) { this._noiseT = 0.5; g.director.noise(this.playing.pos.x, this.playing.pos.z, MUSICBOX.noiseRadius, 'musicbox'); }
    if (g.time > this.playing.until || g.mode !== 'night' || g.player.dead) this.stop();
  }
}
