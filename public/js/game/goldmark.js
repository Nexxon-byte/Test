// Goldene Markierung für Auftragsziele: pulsierender Schimmer mit schwachem Lichtschaft.

import * as THREE from 'three';
import { glowTexture } from '../gfx/textures.js';

export class GoldMark {
  constructor(scene, pos, big = false) {
    this.group = new THREE.Group();
    this.group.position.copy(pos);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffc860, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    sprite.position.y = 0.35;
    sprite.scale.setScalar(big ? 0.9 : 0.6);
    // schwacher Lichtschaft nach oben (verläuft nach oben ins Nichts)
    const beamGeo = new THREE.CylinderGeometry(0.14, 0.22, 1.6, 10, 1, true);
    beamGeo.translate(0, 0.8, 0);
    const col = [];
    const vp = beamGeo.attributes.position;
    for (let i = 0; i < vp.count; i++) { const k = 1 - vp.getY(i) / 1.6; col.push(k, k * 0.8, k * 0.45); }
    beamGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
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
