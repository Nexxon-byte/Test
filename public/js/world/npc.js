// Figuren in der Welt: Character (MPFB-Mensch) + Grundhaltung + Requisit + Blickkontakt + Sprechen.

import * as THREE from 'three';
import { Character } from '../gfx/characters.js';
import { cloneModel, hasModel } from '../gfx/models.js';
import { mat } from '../gfx/materials.js';
import { glowTexture } from '../gfx/textures.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _x = new THREE.Vector3(), _f = new THREE.Vector3();
const _mouth = new THREE.Vector3(), _mid = new THREE.Vector3();
const _q = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);

export class NPC {
  // opts: clip (Grundhaltung), talk (Clip beim Sprechen), prop ('phone'|'lantern'|'torch'), look (Blickweite m), speed
  constructor(char, { clip = 'Idle_Loop', talk = null, prop = null, look = 5, speed = 1 } = {}) {
    this.ch = new Character(char);
    this.root = this.ch.root;
    this.base = clip;
    this.talkClip = talk ?? (clip.startsWith('Sitting') ? 'Sitting_Talking_Loop' : 'Idle_Talking_Loop');
    this.lookRange = look;
    this.speed = speed;
    this.time = Math.random() * 10;
    this.ch.play(clip, { fade: 0, speed });
    this.ch.randomize();
    this.prop = null;
    this.anchor = null;       // Weltpunkt für Effekte (z. B. Funken am Brenner)
    if (prop) this._makeProp(prop);
  }

  talking(on) {
    if (this.isTalking === on) return;
    this.isTalking = on;
    this.ch.play(on ? this.talkClip : this.base, { fade: 0.6, speed: on ? 1 : this.speed });
  }

  update(dt, eye) {
    this.time += dt;
    if (eye) {
      const hp = this.root.position;
      const d = Math.hypot(eye.x - hp.x, eye.z - hp.z);
      this.ch.lookAt(d < this.lookRange || this.isTalking ? eye : null);
    }
    this.ch.update(dt);
    if (this.prop) { this.root.updateMatrixWorld(true); this.prop.update(this, dt); }
  }

  dispose() { this.prop?.obj.removeFromParent(); }

  // ------------------------------------------------------------ Requisiten
  _makeProp(kind) {
    const P = PROPS[kind];
    if (!P) return;
    this.prop = P(this);
    // Requisiten hängen in der Welt, nicht am Knochen: sie werden jeden Frame an die Hand gesetzt
    this.root.add(this.prop.obj);
  }
}

// Welt → lokal (relativ zur Wurzel der Figur)
function toLocal(npc, v) { return npc.root.worldToLocal(v); }

const PROPS = {
  // Telefonhörer (Bakelit), zwischen Ohr und Mund, in der rechten Hand
  phone(npc) {
    const g = new THREE.Group();
    const m = mat('rubber');
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.17), m);
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.035, 10), m);
    ear.position.set(0, -0.018, 0.085);
    const mouth = ear.clone(); mouth.position.z = -0.085;
    g.add(body, ear, mouth);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return {
      obj: g,
      update(n) {
        const ch = n.ch;
        if (!ch.handR || !ch.head) return;
        const hand = ch.handR.getWorldPosition(_a);
        const head = ch.head.getWorldPosition(_b);
        // Hörer: vom Ohr (Seite der Hand) Richtung Mund, in der Hand gehalten
        const side = _x.subVectors(hand, head).setY(0).normalize();
        const earP = _c.copy(head).addScaledVector(side, 0.07);
        earP.y += 0.03;
        const fwd = n.root.getWorldDirection(_f);
        const mouthP = _mouth.copy(head).addScaledVector(fwd, 0.1).addScaledVector(side, 0.02);
        mouthP.y -= 0.12;
        const mid = _mid.copy(earP).lerp(mouthP, 0.5).lerp(hand, 0.35);
        g.position.copy(toLocal(n, mid));
        g.lookAt(mouthP);
      },
    };
  },

  // Laterne (Poly Haven) hängt unter der höheren Hand, leuchtet warm
  lantern(npc) {
    const g = new THREE.Group();
    const model = hasModel('Lantern_01') ? cloneModel('Lantern_01', { height: 0.32 }) : new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.3, 0.12), mat('brass'));
    g.add(model);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    glow.position.y = 0.12;
    glow.scale.setScalar(0.16);
    g.add(glow);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    return {
      obj: g,
      update(n, dt) {
        const ch = n.ch;
        const hl = ch.handL?.getWorldPosition(_a), hr = ch.handR?.getWorldPosition(_b);
        if (!hl || !hr) return;
        const hand = hl.y > hr.y ? hl : hr;
        const p = toLocal(n, _c.copy(hand).add(_f.set(0, -0.36, 0)));
        g.position.copy(p);
        g.rotation.set(Math.sin(n.time * 1.4) * 0.05, 0, Math.sin(n.time * 1.1) * 0.06);
        const fl = 0.85 + Math.sin(n.time * 13) * 0.08 + Math.sin(n.time * 7.3) * 0.07;
        glow.material.opacity = fl;
        glow.scale.setScalar(0.16 * fl);
      },
    };
  },

  // Propanbrenner in der rechten Hand, zeigt auf die Arbeit vor der Figur; Funken an der Spitze
  torch(npc) {
    const g = new THREE.Group();
    const model = hasModel('propane_torch') ? cloneModel('propane_torch', { height: 0.3 }) : new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8), mat('steel'));
    model.position.y = -0.1;
    g.add(model);
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x80b8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flame.position.y = 0.21;
    flame.scale.setScalar(0.05);
    g.add(flame);
    npc.anchor = new THREE.Vector3();
    return {
      obj: g,
      update(n) {
        const ch = n.ch;
        if (!ch.handR) return;
        const hand = ch.handR.getWorldPosition(_a);
        const fwd = n.root.getWorldDirection(_x);
        const target = _b.copy(n.root.position).addScaledVector(fwd, 0.75).setY(0.3);
        const dir = _c.subVectors(target, hand).normalize();
        g.position.copy(toLocal(n, _f.copy(hand)));
        // Richtung in Wurzelraum drehen
        _q.copy(n.root.quaternion).invert();
        g.quaternion.setFromUnitVectors(UP, dir.applyQuaternion(_q));
        n.anchor.copy(hand).addScaledVector(_c.subVectors(target, hand).normalize(), 0.24);
        flame.scale.setScalar(0.04 + Math.random() * 0.035);
      },
    };
  },
};
