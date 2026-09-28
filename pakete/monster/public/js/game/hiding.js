// Verstecke: Spinde und Beichtstühle der Ebene (level.hides) werden benutzbar.
// [E] vor der Tür: hinein · [E] von innen: hinaus. Drinnen: Sehschlitze, kein Lärm, Lampe aus.
// Wer beim Hineingehen gesehen wurde, ist nicht sicher (m.sawHide) – der Portier öffnet dann die Tür.
// Falls das Spiel zuhause schon Verstecke hat: hiding.enabled = false setzen, der Rest bleibt gleich
// (Monster lesen nur player.hidden und m.sawHide).

import * as THREE from 'three';
import { audio } from '../audio/audio.js';
import { ui } from '../ui/ui.js';

const _v = new THREE.Vector3();

export class Hiding {
  constructor(game) {
    this.g = game;
    this.enabled = true;
    this.entries = [];
    this.current = null;
    this.hiddenT = 0;
  }

  // Für jede Nacht neu: Einträge für alle Verstecke der Ebene
  wire(level) {
    this.clear();
    if (!this.enabled || !level?.hides?.length) return;
    // Hat das Spiel schon eigene Versteck-Einträge? Dann nichts doppelt anlegen.
    for (const e of this.g.interact.list) if (e.tag === 'hide') return;
    for (const h of level.hides) {
      const door = new THREE.Vector3().lerpVectors(h.pos, h.front, 0.55).setY(1.2);
      const kind = h.eye && h.eye < 1.55 ? 'Beichtstuhl' : 'Spind';
      const e = this.g.interact.add({
        tag: 'pack-hide', pos: door, radius: 0.55, maxDist: 2.2, priority: 0.25,
        prompt: () => this.current === h ? 'Hinaus' : `In den ${kind}`,
        sub: () => this.current === h ? 'Leise. Sie hören dich trotzdem atmen.' : 'Verstecken',
        enabled: () => this.g.mode === 'night' && !this.g.busy && !this.g.player.dead && (!this.current || this.current === h),
        onUse: () => this.current === h ? this.exit() : this.enter(h),
      });
      this.entries.push(e);
    }
  }

  enter(h) {
    const g = this.g, p = g.player, d = g.director;
    if (this.current) return;
    // Zeugen: wer den Spieler gerade sieht (oder hört), weiß, wo er steckt
    for (const m of d.monsters) {
      const dist = m.distTo(p.pos);
      const sees = dist < 12 && d.grid.lineOfSight(m.pos.x, m.pos.z, p.pos.x, p.pos.z) && (dist < 4 || d.lightAt(_v.set(p.pos.x, 1.2, p.pos.z)).lit || m.type === 'listener');
      m.sawHide = sees && m.type !== 'falterin';
    }
    this.current = h;
    this.wasLamp = p.lampOn;
    if (p.lampOn) p.toggleLamp(false);
    p.pos.x = h.front.x; p.pos.z = h.front.z;
    p.hidden = h;
    p.yaw = h.yaw;
    p.pitch = 0;
    p.lookTarget = null;
    this.hiddenT = 0;
    audio.play('hide', { vol: 0.5 });
    document.getElementById('hideslits')?.classList.add('show');
    ui.hint('hide_out', 'E', 'Hinaus', 5);
  }

  exit() {
    const g = this.g, p = g.player;
    if (!this.current) return;
    const h = this.current;
    this.current = null;
    p.hidden = null;
    p.pos.x = h.front.x; p.pos.z = h.front.z;
    p.yaw = h.yaw;
    audio.play('hide', { vol: 0.45 });
    document.getElementById('hideslits')?.classList.remove('show');
    for (const m of g.director.monsters) m.sawHide = false;
    ui.hintDone('hide_out');
  }

  update(dt) {
    if (!this.current) return;
    this.hiddenT += dt;
    // Tod oder Ende der Nacht: raus
    if (this.g.player.dead || this.g.mode !== 'night') this.exit();
  }

  clear() {
    if (this.current) this.exit();
    for (const e of this.entries) this.g.interact.remove(e);
    this.entries = [];
  }
}
