// Figuren (MakeHuman/MPFB, CC0) mit den Animationen der Universal Animation Library (Quaternius, CC0).
// Alle Figuren teilen das Skelett „game_engine“ → dieselben Clips laufen auf jeder Figur.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const templates = new Map();   // id → { scene, hipsY }
let clips = null;              // name → AnimationClip (bereinigt)
let refHipsY = 1;

// Clips laden und bereinigen: Namen ohne „.001“, nur Rotationen + Beckenposition
export async function loadAnimations(base = '') {
  if (clips) return clips;
  const g = await loader.loadAsync(base + 'assets/chars/anims_ge.glb');
  g.scene.updateMatrixWorld(true);
  const pelvis = g.scene.getObjectByName('pelvis');
  refHipsY = pelvis ? pelvis.getWorldPosition(new THREE.Vector3()).y : 1;
  clips = new Map();
  for (const c of g.animations) {
    const name = c.name.replace(/\.\d+$/, '');
    const tracks = c.tracks.filter(t => t.name.endsWith('.quaternion') || t.name === 'pelvis.position');
    const clip = new THREE.AnimationClip(name, c.duration, tracks);
    clip.optimize();
    clips.set(name, clip);
  }
  return clips;
}

export function clipNames(id = null) { if (id && templates.get(id)?.clips.size) return [...templates.get(id).clips.keys()]; return clips ? [...clips.keys()] : []; }

export async function loadCharacter(id, base = '') {
  if (templates.has(id)) return templates.get(id);
  const g = await loader.loadAsync(base + `assets/chars/npc_${id}.glb`);
  g.scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
      const m = o.material;
      if (m?.isMeshStandardMaterial) {
        m.roughness = Math.max(0.55, m.roughness ?? 1);
        m.metalness = 0;
        // Blender exportiert MakeHuman-Stoffe als „BLEND“ → GLTFLoader schaltet depthWrite ab.
        // Alles deckend mit Tiefe zeichnen; nur Haare/Wimpern/Brauen bekommen eine harte Alpha-Kante.
        const hairy = /hair|lash|brow|short0|long0|bob0|ponytail|braid/i.test(o.name + m.name);
        m.transparent = false;
        m.depthWrite = true;
        m.alphaTest = hairy ? 0.45 : 0;
        m.side = hairy ? THREE.DoubleSide : THREE.FrontSide;
      }
    }
  });
  g.scene.updateMatrixWorld(true);
  const pelvis = g.scene.getObjectByName('pelvis');
  const hipsY = pelvis ? pelvis.getWorldPosition(new THREE.Vector3()).y : refHipsY;
  // eingebettete, auf genau dieses Skelett gerechnete Clips
  const own = new Map();
  for (const c of g.animations) {
    const name = c.name.replace(/\.\d+$/, '');
    // alle Spuren behalten: die Clips sind auf genau dieses Skelett gebacken
    const clip = new THREE.AnimationClip(name, c.duration, c.tracks);
    clip.optimize();
    own.set(name, clip);
  }
  const t = { scene: g.scene, hipsY, clips: own };
  templates.set(id, t);
  return t;
}

export async function preloadCharacters(ids, base = '') {
  await loadAnimations(base);
  await Promise.all(ids.map(id => loadCharacter(id, base).catch(e => console.warn('Figur fehlt', id, e?.message))));
}

// Eine Figur in der Welt: eigenes Skelett, eigener Mixer, weiche Überblendungen
export class Character {
  constructor(id) {
    const t = templates.get(id);
    if (!t) throw new Error('Figur nicht geladen: ' + id);
    this.id = id;
    this.root = new THREE.Group();
    this.model = skeletonClone(t.scene);
    this.root.add(this.model);
    this.mixer = new THREE.AnimationMixer(this.model);
    this.scaleY = t.hipsY / refHipsY;   // Beckenhöhe relativ zur Referenz (für die Positionsspur)
    this.own = t.clips;
    this.actions = new Map();
    this.current = null;
    this.head = this.model.getObjectByName('head');
    this.neck = this.model.getObjectByName('neck_01');
    this.handR = this.model.getObjectByName('hand_r');
    this.handL = this.model.getObjectByName('hand_l');
  }

  _action(name) {
    if (this.actions.has(name)) return this.actions.get(name);
    let clip = this.own?.get(name);
    if (clip) { const a = this.mixer.clipAction(clip); this.actions.set(name, a); return a; }
    clip = clips?.get(name);
    if (!clip) return null;
    if (Math.abs(this.scaleY - 1) > 0.01) {
      clip = clip.clone();
      for (const tr of clip.tracks) if (tr.name === 'pelvis.position') for (let i = 0; i < tr.values.length; i++) tr.values[i] *= this.scaleY;
    }
    const a = this.mixer.clipAction(clip);
    this.actions.set(name, a);
    return a;
  }

  // Clip abspielen; loop=false → bleibt am Ende stehen; fade = Überblendzeit
  play(name, { fade = 0.35, loop = true, speed = 1, offset = null } = {}) {
    const a = this._action(name);
    if (!a) return null;
    if (this.current === a) return a;
    a.reset();
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    a.clampWhenFinished = !loop;
    a.timeScale = speed;
    if (offset !== null) a.time = offset * a.getClip().duration;
    a.enabled = true;
    a.setEffectiveWeight(1);
    if (this.current) a.crossFadeFrom(this.current, fade, true);
    a.play();
    this.current = a;
    return a;
  }

  // Zufälliger Startpunkt, damit mehrere Figuren nicht im Gleichtakt atmen
  randomize() { if (this.current) this.current.time = Math.random() * this.current.getClip().duration; }

  // Kopf zu einem Punkt drehen (nach der Animation, sanft begrenzt); null → wieder geradeaus
  lookAt(target, amount = 0.8) {
    if (!this.head || !target) { this._lookT = null; return; }
    const hp = this.head.getWorldPosition(_hp);
    const d = _d.copy(target).sub(hp);
    d.applyQuaternion(this.root.getWorldQuaternion(_q).invert());
    let yaw = Math.atan2(d.x, d.z);
    const pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
    // weit hinter der Figur: nicht den Hals verrenken
    if (Math.abs(yaw) > 1.9) { this._lookT = null; return; }
    yaw = Math.max(-1.1, Math.min(1.1, yaw));
    this._lookT = { yaw: yaw * amount, pitch: Math.max(-0.45, Math.min(0.45, -pitch)) * amount };
  }

  update(dt) {
    this.mixer.update(dt);
    const t = this._lookT || ZERO_LOOK;
    const c = this._lookC || (this._lookC = { yaw: 0, pitch: 0 });
    const k = 1 - Math.exp(-dt * 3.5);
    c.yaw += (t.yaw - c.yaw) * k;
    c.pitch += (t.pitch - c.pitch) * k;
    if (this.head && (Math.abs(c.yaw) > 1e-3 || Math.abs(c.pitch) > 1e-3)) {
      // Blick auf Hals und Kopf verteilen (Drehung im Körperraum der Figur)
      this._turnBone(this.neck, c.yaw * 0.4, c.pitch * 0.35);
      this._turnBone(this.head, c.yaw * 0.6, c.pitch * 0.65);
    }
  }

  // Knochen um die Hochachse/Querachse der Figur drehen, unabhängig von seiner lokalen Achslage
  _turnBone(bone, yaw, pitch) {
    if (!bone) return;
    this.root.updateWorldMatrix(true, false);
    const rootQ = this.root.getWorldQuaternion(_q);
    const turn = _q2.setFromEuler(_e.set(pitch, yaw, 0, 'YXZ'));
    const w = _q3.copy(rootQ).multiply(turn).multiply(_q4.copy(rootQ).invert());   // Drehung in Weltraum
    bone.parent.updateWorldMatrix(true, false);
    const pw = bone.parent.getWorldQuaternion(_q4);
    const bw = _q5.copy(pw).multiply(bone.quaternion);
    bw.premultiply(w);
    bone.quaternion.copy(pw.invert().multiply(bw));
  }
}

const ZERO_LOOK = { yaw: 0, pitch: 0 };
const _hp = new THREE.Vector3(), _d = new THREE.Vector3();
const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _q4 = new THREE.Quaternion(), _q5 = new THREE.Quaternion();
const _e = new THREE.Euler();

export function hasCharacter(id) { return templates.has(id); }
