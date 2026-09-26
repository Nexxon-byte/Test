// KABINE 9 – der fahrende Reliquienschrein. Helden-Asset des Spiels.
// Innenmaß 2,2 × 2,2 × 2,6 m, Tür zur +Z-Seite. Ursprung = Bodenmitte.

import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Builder, boxGeometry } from '../gfx/geo.js';
import { mat, glowMat } from '../gfx/materials.js';
import { textTexture, drawDialSymbol, flameTexture, glowTexture, getTexture } from '../gfx/textures.js';
import { clamp, damp, lerp } from '../core/rng.js';

export const CAB = { W: 2.2, D: 2.2, H: 2.6, DOOR: 1.3, DOOR_H: 2.05, FRONT: 1.1, LANDING_Z: 1.25 };

// Tiefe → Zeigerwinkel (0 = links „oben“, π = rechts „∞“)
export function depthToAngle(depth) {
  const marks = [[0, 0], [2, 0.12], [13, 0.5], [33, 0.85], [66, 1.2], [99, 1.5], [111, 1.62], [333, 2.2], [666, 2.6], [1000, 3.0]];
  if (depth === Infinity) return Math.PI - 0.05;
  for (let i = 1; i < marks.length; i++) {
    if (depth <= marks[i][0]) {
      const [d0, a0] = marks[i - 1], [d1, a1] = marks[i];
      return lerp(a0, a1, (depth - d0) / (d1 - d0));
    }
  }
  return 3.0;
}

const SHAFT_STYLES = {
  concrete: { mat: 'concrete', lamp: 0xffb070 },
  stone:    { mat: 'stoneDark', lamp: 0xffa060 },
  ossuary:  { mat: 'stoneDark', lamp: 0xff8840, skulls: true },
  salt:     { mat: 'salt', lamp: 0xa8d8ff },
  pipes:    { mat: 'rust', lamp: 0xff7040, pipes: true },
  water:    { mat: 'brick', lamp: 0x60d0ff, wet: true },
  rock:     { mat: 'rock', lamp: 0xffd090 },
  flesh:    { mat: 'flesh', lamp: 0xff3020, hands: true },
  void:     { mat: 'rock', lamp: 0x000000, none: true },
};

export class Elevator {
  constructor(renderer, collision) {
    this.r = renderer;
    this.collision = collision;
    this.group = new THREE.Group();
    this.group.name = 'Kabine9';
    this.state = 'idle';
    this.gateOpen = 0;       // 0 zu, 1 offen
    this.gateTarget = 0;
    this.doorsOpen = 0;      // Außentüren (Etage)
    this.doorsTarget = 0;
    this.outerVisible = true;
    this.needle = 0;
    this.needleTarget = 0;
    this.needleJitter = 0;
    this.speed = 0;          // m/s beim Fahren (negativ = abwärts)
    this.shaftOffset = 0;
    this.light = 1;          // Kabinenlicht 0..1
    this.lightMode = 'normal';
    this.emergency = 0;
    this.shake = 0;
    this.time = 0;
    this.displayText = 'EG';

    this._buildShell();
    this._buildGate();
    this._buildDial();
    this._buildLights();
    this._buildMirror();
    this._buildPanel();
    this._buildPhone();
    this._buildOuterDoors();
    this._buildShaft();
    this._buildColliders();
    renderer.scene.add(this.group);
  }

  // ---------------------------------------------------------------- Aufbau

  _buildShell() {
    const b = new Builder();
    const { W, D, H } = CAB;
    const hw = W / 2, hd = D / 2;
    const wood = mat('woodPanel'), damask = mat('damask'), brass = mat('brass'), dark = mat('wood'), floorM = mat('woodPlanks');

    // Boden & Sockel
    b.box(floorM, 0, -0.05, 0, W, 0.1, D);
    // Decke (Kassetten)
    b.box(dark, 0, H + 0.05, 0, W, 0.1, D);
    for (let i = -1; i <= 1; i += 2) {
      b.box(dark, i * 0.55, H - 0.06, 0, 0.08, 0.12, D);
      b.box(dark, 0, H - 0.06, i * 0.55, W, 0.12, 0.08);
    }
    // Wände: links, rechts, hinten
    const wall = (x, z, ry, len) => {
      // Holzvertäfelung unten
      b.box(wood, x, 0.5, z, len, 1.0, 0.06, { ry });
      // Stoffbespannung oben
      b.box(damask, x, 1.68, z, len, 1.36, 0.05, { ry });
      // Gesims
      b.box(dark, x, 2.45, z, len, 0.3, 0.1, { ry });
      b.box(brass, x, 2.31, z, len, 0.025, 0.12, { ry });
      b.box(brass, x, 1.01, z, len, 0.03, 0.1, { ry });
      // Fußleiste
      b.box(dark, x, 0.06, z, len, 0.12, 0.1, { ry });
    };
    wall(-hw - 0.03, 0, Math.PI / 2, D);
    wall(hw + 0.03, 0, Math.PI / 2, D);
    wall(0, -hd - 0.03, 0, W);

    // Messingleisten, die die Stoffpaneele rahmen
    for (const s of [-1, 1]) {
      for (const z of [-0.55, 0.0, 0.55]) b.box(brass, s * (hw - 0.005), 1.68, z, 0.02, 1.36, 0.025);
    }
    for (const x of [-0.75, 0.75]) b.box(brass, x, 1.68, -hd + 0.005, 0.025, 1.36, 0.02);

    // Handläufe
    for (const s of [-1, 1]) {
      b.cyl(brass, s * (hw - 0.07), 0.92, 0, 0.022, 0.022, D - 0.3, 8, { rx: Math.PI / 2 });
      for (const z of [-0.7, 0.7]) b.box(brass, s * (hw - 0.04), 0.95, z, 0.06, 0.03, 0.03);
    }
    b.cyl(brass, 0, 0.92, -hd + 0.07, 0.022, 0.022, W - 0.3, 8, { rz: Math.PI / 2 });

    // Front: Wandstücke neben der Tür + Sturz
    const side = (hw - CAB.DOOR / 2);
    for (const s of [-1, 1]) {
      const x = s * (CAB.DOOR / 2 + side / 2);
      b.box(wood, x, 0.5, CAB.FRONT, side, 1.0, 0.08);
      b.box(damask, x, 1.55, CAB.FRONT, side, 1.1, 0.07);
      b.box(dark, x, 2.35, CAB.FRONT, side, 0.5, 0.1);
      b.box(brass, s * (CAB.DOOR / 2 + 0.02), H / 2, CAB.FRONT, 0.05, H, 0.14); // Türpfosten
    }
    b.box(dark, 0, (CAB.DOOR_H + H) / 2, CAB.FRONT, CAB.DOOR, H - CAB.DOOR_H, 0.1);
    // Laufschienen des Gitters
    b.box(brass, 0, CAB.DOOR_H + 0.02, CAB.FRONT - 0.07, CAB.DOOR + 0.1, 0.04, 0.05);
    b.box(brass, 0, 0.01, CAB.FRONT - 0.07, CAB.DOOR + 0.1, 0.02, 0.05);

    // Wartungsluke in der Decke
    b.box(mat('steel'), 0.45, H - 0.01, -0.5, 0.62, 0.02, 0.62);
    b.box(dark, 0.45, H - 0.02, -0.5, 0.52, 0.02, 0.52);

    // Bodeneinlage: Zifferblatt in Messing
    const inlayTex = textTexture(256, 256, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
      drawDialSymbol(g, 128, 150, 90, '#ffffff', 0.9, 7);
    }, { srgb: false });
    const inlay = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshStandardMaterial({
      color: 0xc9a050, metalness: 0.9, roughness: 0.3, alphaMap: inlayTex, transparent: true, depthWrite: false,
    }));
    inlay.rotation.x = -Math.PI / 2;
    inlay.position.set(0, 0.002, 0.1);
    inlay.receiveShadow = true;
    this.group.add(inlay);

    // Kerzenwandleuchter neben dem Spiegel
    this.candles = [];
    for (const x of [-0.92, 0.92]) {
      b.box(brass, x, 1.52, -hd + 0.06, 0.1, 0.02, 0.1);
      b.cyl(brass, x, 1.36, -hd + 0.06, 0.012, 0.03, 0.16, 6);
      b.cyl(mat('bone'), x, 1.53, -hd + 0.06, 0.022, 0.022, 0.12, 8);
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), color: 0xc89060, blending: THREE.AdditiveBlending, depthWrite: false }));
      flame.scale.set(0.035, 0.07, 1);
      flame.position.set(x, 1.685, -hd + 0.06);
      this.group.add(flame);
      this.candles.push(flame);
    }

    const shell = b.build();
    this.group.add(shell);
  }

  _buildGate() {
    const N = 9, K = 5;
    const count = N + (N - 1) * K * 2;
    const geo = boxGeometry(1, 1, 1);
    const m = new THREE.InstancedMesh(geo, mat('brass'), count);
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    this.gate = m;
    this.gateN = N; this.gateK = K;
    this.group.add(m);
    this._layoutGate();
  }

  _layoutGate() {
    const N = this.gateN, K = this.gateK;
    const left = -CAB.DOOR / 2 + 0.03;
    const fullW = CAB.DOOR - 0.06;
    const w = lerp(fullW, 0.16, this.gateOpen);
    const sp = w / (N - 1);
    const z = CAB.FRONT - 0.07;
    const h = CAB.DOOR_H - 0.06;
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    let idx = 0;
    for (let i = 0; i < N; i++) {
      p.set(left + i * sp, h / 2 + 0.03, z); q.identity(); s.set(0.022, h, 0.022);
      mtx.compose(p, q, s); this.gate.setMatrixAt(idx++, mtx);
    }
    const segH = h / K;
    for (let i = 0; i < N - 1; i++) {
      for (let k = 0; k < K; k++) {
        const x0 = left + i * sp, x1 = x0 + sp;
        const y0 = 0.03 + k * segH, y1 = y0 + segH;
        const len = Math.hypot(sp, segH);
        const ang = Math.atan2(segH, sp);
        for (const dir of [1, -1]) {
          p.set((x0 + x1) / 2, (y0 + y1) / 2, z + dir * 0.012);
          q.setFromAxisAngle(new THREE.Vector3(0, 0, 1), dir * ang);
          s.set(len, 0.014, 0.008);
          mtx.compose(p, q, s); this.gate.setMatrixAt(idx++, mtx);
        }
      }
    }
    this.gate.instanceMatrix.needsUpdate = true;
  }

  _buildDial() {
    // Zifferblatt über der Tür (innen)
    const tex = textTexture(512, 288, (g, w, h) => {
      g.fillStyle = '#0b0806'; g.fillRect(0, 0, w, h);
      const cx = w / 2, cy = h - 34, r = 210;
      g.strokeStyle = '#c9a050'; g.lineWidth = 8;
      g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.stroke();
      g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r - 16, Math.PI, 0); g.stroke();
      const labels = [[0, 'EG'], [13, '13'], [33, '33'], [66, '66'], [99, '99'], [333, '333'], [Infinity, '∞']];
      g.fillStyle = '#e8cf8a'; g.font = '600 28px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let d = 0; d <= 1000; d += (d < 100 ? 5 : 50)) {
        const a = Math.PI + depthToAngle(d);
        const r1 = r - 18, r2 = r - (d % 33 === 0 ? 40 : 28);
        g.lineWidth = 2; g.strokeStyle = '#8a6a30';
        g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke();
      }
      for (const [d, t] of labels) {
        const a = Math.PI + depthToAngle(d);
        g.fillText(t, cx + Math.cos(a) * (r - 64), cy + Math.sin(a) * (r - 64));
      }
      g.font = 'italic 20px "Cormorant Garamond", serif'; g.fillStyle = '#9a7a40';
      g.fillText('NEUNTE KABINE · ZUM HEILIGEN CHOR', cx, cy - 40);
    });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.506), new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.4, metalness: 0.2, emissive: 0xffe0a0, emissiveMap: tex, emissiveIntensity: 0.08,
    }));
    face.position.set(0, 2.33, CAB.FRONT - 0.056);
    face.rotation.y = Math.PI;
    this.group.add(face);
    this.dialFace = face;
    // Nadel
    const pivot = new THREE.Group();
    pivot.position.set(0, 2.33 - 0.506 / 2 + 0.06, CAB.FRONT - 0.062);
    pivot.rotation.y = Math.PI;
    const needle = new THREE.Mesh(boxGeometry(0.34, 0.012, 0.006), glowMat(0xff5530, 2.5, 'needleGlow'));
    needle.position.x = 0.17;
    pivot.add(needle);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), mat('gold'));
    hub.rotation.x = Math.PI / 2;
    pivot.add(hub);
    this.group.add(pivot);
    this.needlePivot = pivot;

    // Nixie-Anzeige unter dem Zifferblatt (von innen sichtbar) – und eine zweite über der Außentür
    this.nixieCanvasTex = textTexture(256, 96, () => {});
    this.nixieMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: this.nixieCanvasTex, emissiveIntensity: 2.4, roughness: 0.6 });
    const nixie = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.12), this.nixieMat);
    nixie.position.set(0.88, 2.3, CAB.FRONT - 0.057);
    nixie.rotation.y = Math.PI;
    this.group.add(nixie);
    // Außenanzeige über der Etagentür
    this.outerNixie = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), this.nixieMat);
    this.outerNixie.position.set(0, CAB.DOOR_H + 0.32, CAB.LANDING_Z + 0.13);
    this.group.add(this.outerNixie);
    this.setDisplay('EG');
  }

  setDisplay(text, { glitch = false } = {}) {
    this.displayText = text;
    const c = this.nixieCanvasTex.canvas, g = c.getContext('2d');
    g.fillStyle = '#050302'; g.fillRect(0, 0, c.width, c.height);
    // Röhrengitter
    g.strokeStyle = 'rgba(80,50,30,0.5)'; g.lineWidth = 1;
    for (let x = 0; x < c.width; x += 6) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, c.height); g.stroke(); }
    g.font = '80px "VT323", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = '#ff7a2a'; g.shadowBlur = 16; g.fillStyle = glitch ? '#ff3a2a' : '#ffa050';
    g.fillText(text, c.width / 2, c.height / 2 + 4);
    g.shadowBlur = 0; g.fillStyle = '#fff2c0'; g.globalAlpha = 0.5;
    g.fillText(text, c.width / 2, c.height / 2 + 4);
    g.globalAlpha = 1;
    this.nixieCanvasTex.needsUpdate = true;
  }

  _buildLights() {
    // Leuchtpaneel in der Decke
    this.panelMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd9a0, emissiveIntensity: 1.6 });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), this.panelMat);
    panel.rotation.x = Math.PI / 2;
    panel.position.set(0, CAB.H - 0.13, 0);
    this.group.add(panel);
    // Opalglas-Rahmen
    const b = new Builder();
    for (const s of [-1, 1]) {
      b.box(mat('brass'), s * 0.47, CAB.H - 0.13, 0, 0.04, 0.03, 0.98);
      b.box(mat('brass'), 0, CAB.H - 0.13, s * 0.47, 0.98, 0.03, 0.04);
    }
    this.group.add(b.build());

    this.cabLight = new THREE.PointLight(0xffc98a, 5, 7, 1.6);
    this.cabLight.position.set(0, CAB.H - 0.35, 0.1);
    this.group.add(this.cabLight);
    this.candleLight = new THREE.PointLight(0xff9a40, 0.5, 3, 2);
    this.candleLight.position.set(0, 1.7, -0.95);
    this.group.add(this.candleLight);
    // Notlicht (rot)
    this.redLight = new THREE.PointLight(0xff1a10, 0, 6, 1.6);
    this.redLight.position.set(0, CAB.H - 0.3, -0.6);
    this.group.add(this.redLight);
    // vorbeiziehende Schachtlampe
    this.shaftLamp = new THREE.PointLight(0xffb070, 0, 5, 1.8);
    this.group.add(this.shaftLamp);
  }

  _buildMirror() {
    const q = this.r.quality || { mirror: 256 };
    const w = 1.36, h = 1.12;
    this.mirror = new Reflector(new THREE.PlaneGeometry(w, h), {
      textureWidth: q.mirror, textureHeight: Math.round(q.mirror * h / w), color: 0x9a948a, clipBias: 0.003, multisample: 0,
    });
    this.mirror.position.set(0, 1.72, -CAB.D / 2 + 0.005);
    this.group.add(this.mirror);
    // Rahmen
    const b = new Builder();
    const g = mat('gold');
    b.box(g, 0, 1.72 + h / 2 + 0.03, -CAB.D / 2 + 0.02, w + 0.1, 0.06, 0.04);
    b.box(g, 0, 1.72 - h / 2 - 0.03, -CAB.D / 2 + 0.02, w + 0.1, 0.06, 0.04);
    b.box(g, -w / 2 - 0.03, 1.72, -CAB.D / 2 + 0.02, 0.06, h, 0.04);
    b.box(g, w / 2 + 0.03, 1.72, -CAB.D / 2 + 0.02, 0.06, h, 0.04);
    this.group.add(b.build());
    // Nur-im-Spiegel-Gruppe (für Erscheinungen)
    this.mirrorOnly = new THREE.Group();
    this.mirrorOnly.visible = false;
    this.group.add(this.mirrorOnly);
    const orig = this.mirror.onBeforeRender;
    const self = this;
    this.mirror.onBeforeRender = function (...args) {
      self.mirrorOnly.visible = true;
      orig.apply(this, args);
      self.mirrorOnly.visible = false;
    };
  }

  _buildPanel() {
    // Bedienfeld links neben der Tür: ein einziger Knopf – AUFWÄRTS
    const b = new Builder();
    const x = -CAB.W / 2 + 0.035;
    b.box(mat('brass'), x, 1.3, 0.72, 0.02, 0.8, 0.3);
    b.box(mat('wood'), x - 0.01, 1.3, 0.72, 0.02, 0.86, 0.36);
    this.group.add(b.build());
    const labelTex = textTexture(128, 340, (g, w, h) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#fff'; g.textAlign = 'center';
      g.font = '600 22px "Cormorant Garamond", serif';
      g.fillText('AUFWÄRTS', w / 2, 60);
      drawDialSymbol(g, w / 2, 250, 34, '#fff', -1.2);
      g.font = '14px "Cormorant Garamond", serif';
      g.fillText('GEWEIHT 33 n. F.', w / 2, 300);
    }, { srgb: false });
    const engr = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.8), new THREE.MeshStandardMaterial({
      color: 0x1a1208, alphaMap: labelTex, transparent: true, metalness: 0.5, roughness: 0.6, depthWrite: false,
    }));
    engr.rotation.y = Math.PI / 2;
    engr.position.set(x + 0.012, 1.3, 0.72);
    this.group.add(engr);
    // Knopf
    this.buttonMat = new THREE.MeshStandardMaterial({ color: 0x3a2a14, emissive: 0xffb050, emissiveIntensity: 0.15, metalness: 0.6, roughness: 0.4 });
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.03, 20), this.buttonMat);
    btn.rotation.z = Math.PI / 2;
    btn.position.set(x + 0.02, 1.38, 0.72);
    this.group.add(btn);
    this.button = btn;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.008, 6, 24), mat('gold'));
    ring.rotation.y = Math.PI / 2;
    ring.position.set(x + 0.015, 1.38, 0.72);
    this.group.add(ring);
    // Schlüsselloch
    const key = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10), mat('brassDark'));
    key.rotation.z = Math.PI / 2;
    key.position.set(x + 0.016, 1.12, 0.72);
    this.group.add(key);
  }

  _buildPhone() {
    // Notruftelefon: Holzkasten mit Messingglocke, Hörer an Kordel
    const b = new Builder();
    const x = CAB.W / 2 - 0.08;
    b.box(mat('wood'), x, 1.42, 0.45, 0.12, 0.42, 0.26);
    b.box(mat('brass'), x - 0.061, 1.52, 0.45, 0.005, 0.12, 0.2);
    b.cyl(mat('gold'), x - 0.07, 1.575, 0.36, 0.035, 0.035, 0.02, 12, { rz: Math.PI / 2 });
    b.cyl(mat('gold'), x - 0.07, 1.575, 0.54, 0.035, 0.035, 0.02, 12, { rz: Math.PI / 2 });
    // Gabel
    b.box(mat('brassDark'), x - 0.08, 1.38, 0.45, 0.04, 0.03, 0.24);
    this.group.add(b.build());
    // Hörer (beweglich)
    const handset = new THREE.Group();
    const hb = new Builder();
    hb.box(mat('fabricBlack'), 0, 0, 0, 0.04, 0.035, 0.2);
    hb.box(mat('fabricBlack'), 0, -0.02, 0.1, 0.05, 0.05, 0.06);
    hb.box(mat('fabricBlack'), 0, -0.02, -0.1, 0.05, 0.05, 0.06);
    handset.add(hb.build());
    handset.position.set(x - 0.09, 1.41, 0.45);
    this.handsetHome = handset.position.clone();
    this.group.add(handset);
    this.handset = handset;
    // Lampe „NOTRUF“
    this.phoneLampMat = new THREE.MeshStandardMaterial({ color: 0x200000, emissive: 0xff2010, emissiveIntensity: 0 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), this.phoneLampMat);
    lamp.position.set(x - 0.062, 1.6, 0.45);
    this.group.add(lamp);
    this.phoneRinging = false;
  }

  _buildOuterDoors() {
    // Etagentüren (gehören optisch zur Etage, werden hier gesteuert)
    this.outer = new THREE.Group();
    const makeLeaf = () => {
      const g = new THREE.Group();
      const b = new Builder();
      b.box(mat('brass'), 0, 0, 0, CAB.DOOR / 2, CAB.DOOR_H, 0.04);
      b.box(mat('brassDark'), 0, 0.3, 0.022, CAB.DOOR / 2 - 0.12, 0.9, 0.01);
      b.box(mat('brassDark'), 0, -0.55, 0.022, CAB.DOOR / 2 - 0.12, 0.6, 0.01);
      g.add(b.build());
      return g;
    };
    this.leafL = makeLeaf();
    this.leafR = makeLeaf();
    for (const l of [this.leafL, this.leafR]) { l.position.set(0, CAB.DOOR_H / 2, CAB.LANDING_Z + 0.06); this.outer.add(l); }
    this.group.add(this.outer);
    this._layoutOuter();
  }

  setOuterStyle(materialName = 'brass') {
    for (const leaf of [this.leafL, this.leafR]) {
      leaf.traverse((o) => { if (o.isMesh && o.material.name === 'brass') o.material = mat(materialName); });
    }
  }

  _layoutOuter() {
    const q = CAB.DOOR / 4;
    const off = this.doorsOpen * (CAB.DOOR / 2 - 0.02);
    this.leafL.position.x = -q - off;
    this.leafR.position.x = q + off;
    this.outer.visible = this.outerVisible;
    if (this.outerNixie) this.outerNixie.visible = this.outerVisible && this.showOuterNixie !== false;
  }

  _buildShaft() {
    this.shaft = new THREE.Group();
    this.shaft.visible = false;
    const wallGeo = new THREE.PlaneGeometry(4.4, 16, 1, 1);
    // UVs in Metern
    const uv = wallGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 4.4, uv.getY(i) * 16);
    this.shaftMatFront = mat('concrete').clone();
    this.shaftMatFront.map = this.shaftMatFront.map.clone();
    this.shaftMatFront.bumpMap = this.shaftMatFront.bumpMap.clone();
    const front = new THREE.Mesh(wallGeo, this.shaftMatFront);
    front.position.set(0, 3, CAB.LANDING_Z + 0.25);
    front.rotation.y = Math.PI;
    front.receiveShadow = true;
    this.shaftFront = front;
    this.shaft.add(front);
    // seitliche Schachtwände (durch die Türspalte sichtbar)
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(wallGeo, this.shaftMatFront);
      side.position.set(s * 1.5, 3, 1.3);
      side.rotation.y = -s * Math.PI / 2;
      side.scale.x = 0.2;
      this.shaft.add(side);
    }
    // Vorbeiziehende Dinge (Etagentüren, Lampen, Nischen) – Pool
    this.passers = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const b = new Builder();
      b.box(mat('steel'), 0, 1.05, 0, 1.5, 2.2, 0.06);
      b.box(mat('rust'), -0.8, 1.1, 0.05, 0.12, 2.4, 0.12);
      b.box(mat('rust'), 0.8, 1.1, 0.05, 0.12, 2.4, 0.12);
      b.box(mat('rust'), 0, 2.3, 0.05, 1.72, 0.14, 0.12);
      b.box(mat('concrete'), 0, -0.1, 0.1, 2.2, 0.2, 0.3);
      g.add(b.build());
      // Etagennummer (Schablone)
      const numTex = textTexture(128, 64, (gg) => { gg.fillStyle = '#000'; gg.fillRect(0, 0, 128, 64); }, { srgb: false });
      const num = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.25), new THREE.MeshStandardMaterial({ color: 0xd8d0b0, alphaMap: numTex, transparent: true, depthWrite: false }));
      num.position.set(0.55, 2.62, 0.03);
      g.add(num);
      g.userData.numTex = numTex;
      // Käfiglampe
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glowMat(0xffb070, 4, 'shaftLampGlow'));
      lamp.position.set(-1.0, 2.6, 0.12);
      g.add(lamp);
      g.userData.lamp = lamp;
      g.rotation.y = Math.PI;
      g.position.set(0, -50, CAB.LANDING_Z + 0.22);
      this.shaft.add(g);
      this.passers.push(g);
    }
    // Schädelnischen / Hände etc. als instanzierte Deko (zonenabhängig sichtbar)
    this.decor = new THREE.Group();
    this.shaft.add(this.decor);
    this.group.add(this.shaft);
    this.shaftStyle = 'concrete';
    this.passSpacing = 11;
  }

  setShaftStyle(name) {
    const st = SHAFT_STYLES[name] || SHAFT_STYLES.concrete;
    this.shaftStyle = name;
    const src = mat(st.mat);
    this.shaftMatFront.map = src.map.clone();
    this.shaftMatFront.bumpMap = src.bumpMap.clone();
    this.shaftMatFront.map.needsUpdate = true;
    this.shaftMatFront.bumpMap.needsUpdate = true;
    this.shaftMatFront.roughness = src.roughness;
    this.shaftMatFront.metalness = src.metalness;
    this.shaftMatFront.color.copy(src.color);
    this.shaftMatFront.needsUpdate = true;
    this.shaftLampColor = st.lamp;
    this.shaftLamp.color.set(st.lamp);
    for (const p of this.passers) p.visible = !st.none;
    this.shaftFront.visible = !st.none;
  }

  _buildColliders() {
    const c = this.collision;
    const hw = CAB.W / 2, hd = CAB.D / 2, t = 0.12;
    this.colliders = [
      c.add({ minX: -hw - t, maxX: -hw, minZ: -hd - t, maxZ: hd + t, minY: -1, maxY: 3, tag: 'cab' }),
      c.add({ minX: hw, maxX: hw + t, minZ: -hd - t, maxZ: hd + t, minY: -1, maxY: 3, tag: 'cab' }),
      c.add({ minX: -hw - t, maxX: hw + t, minZ: -hd - t, maxZ: -hd, minY: -1, maxY: 3, tag: 'cab' }),
      c.add({ minX: -hw - t, maxX: -CAB.DOOR / 2, minZ: CAB.FRONT - 0.06, maxZ: CAB.LANDING_Z, minY: -1, maxY: 3, tag: 'cab' }),
      c.add({ minX: CAB.DOOR / 2, maxX: hw + t, minZ: CAB.FRONT - 0.06, maxZ: CAB.LANDING_Z, minY: -1, maxY: 3, tag: 'cab' }),
    ];
    this.gateCollider = c.add({ minX: -CAB.DOOR / 2, maxX: CAB.DOOR / 2, minZ: CAB.FRONT - 0.12, maxZ: CAB.FRONT - 0.02, minY: -1, maxY: 3, tag: 'cab', noSight: true });
    this.doorCollider = c.add({ minX: -CAB.DOOR / 2, maxX: CAB.DOOR / 2, minZ: CAB.LANDING_Z, maxZ: CAB.LANDING_Z + 0.12, minY: -1, maxY: 3, tag: 'cab' });
    // Monster sollen die Kabine nicht betreten, solange sie „sicher“ ist → eigenes Flag
  }

  // ---------------------------------------------------------------- Steuerung

  openGate() { this.gateTarget = 1; }
  closeGate() { this.gateTarget = 0; }
  openDoors() { this.doorsTarget = 1; this.gateTarget = 1; }
  closeDoors() { this.doorsTarget = 0; this.gateTarget = 0; }
  get isClosed() { return this.gateOpen < 0.02 && (this.doorsOpen < 0.02 || !this.outerVisible); }
  get isOpen() { return this.gateOpen > 0.95 && (this.doorsOpen > 0.95 || !this.outerVisible); }

  setNeedleDepth(depth, instant = false) {
    this.needleTarget = depthToAngle(depth);
    if (instant) this.needle = this.needleTarget;
  }

  // Innen ist die Kabine: Punkt in der Kabine?
  contains(p, margin = 0) {
    return Math.abs(p.x) < CAB.W / 2 - margin && p.z > -CAB.D / 2 + margin && p.z < CAB.FRONT - margin;
  }

  startRide({ speed = -4, style = 'concrete' } = {}) {
    this.setShaftStyle(style);
    this.shaft.visible = true;
    this.outerVisible = false;
    this.state = 'riding';
    this.speedTarget = speed;
    this.passCounter = 0;
    for (let i = 0; i < this.passers.length; i++) this.passers[i].position.y = -6 - i * this.passSpacing;
  }

  setRideSpeed(v) { this.speedTarget = v; }

  stopRide() {
    this.speedTarget = 0;
    this.state = 'stopping';
  }

  arrive() {
    this.shaft.visible = false;
    this.speed = 0;
    this.speedTarget = 0;
    this.state = 'idle';
    this.outerVisible = true;
    this.shaftLamp.intensity = 0;
  }

  ring(on) {
    this.phoneRinging = on;
  }

  update(dt) {
    this.time += dt;
    // Gitter & Türen
    const gPrev = this.gateOpen;
    this.gateOpen = moveTo(this.gateOpen, this.gateTarget, dt / 1.6);
    if (this.gateOpen !== gPrev) this._layoutGate();
    // Außentüren öffnen erst, wenn das Gitter halb offen ist; schließen vor dem Gitter
    const dT = this.doorsTarget;
    const dPrev = this.doorsOpen;
    if (dT > this.doorsOpen && this.gateOpen > 0.4) this.doorsOpen = moveTo(this.doorsOpen, dT, dt / 1.3);
    else if (dT < this.doorsOpen) this.doorsOpen = moveTo(this.doorsOpen, dT, dt / 1.3);
    if (this.doorsOpen !== dPrev || this.outer.visible !== this.outerVisible) this._layoutOuter();
    this.gateCollider.enabled = this.gateOpen < 0.85;
    this.doorCollider.enabled = this.outerVisible && this.doorsOpen < 0.85;

    // Zeiger
    this.needle = damp(this.needle, this.needleTarget, 2.2, dt);
    const jitter = this.needleJitter > 0 ? (Math.random() - 0.5) * this.needleJitter : 0;
    this.needlePivot.rotation.z = Math.PI - (this.needle + jitter);

    // Fahrt
    this.speed = damp(this.speed, this.speedTarget ?? 0, 0.9, dt);
    if (this.state === 'stopping' && Math.abs(this.speed) < 0.05) { this.speed = 0; this.state = 'stopped'; }
    if (this.shaft.visible) {
      this.shaftOffset += this.speed * dt;
      this.shaftMatFront.map.offset.y = -this.shaftOffset / 3;
      this.shaftMatFront.bumpMap.offset.y = -this.shaftOffset / 3;
      // vorbeiziehende Etagen
      let lampI = 0;
      for (const p of this.passers) {
        p.position.y -= this.speed * dt;   // Abwärts fahren → Welt zieht nach oben
        if (p.position.y > 14) p.position.y -= this.passSpacing * this.passers.length;
        if (p.position.y < -20) p.position.y += this.passSpacing * this.passers.length;
        const ly = p.position.y + 2.6;
        if (Math.abs(ly - 1.3) < 3.5) lampI = Math.max(lampI, 1 - Math.abs(ly - 1.3) / 3.5);
        if (Math.abs(ly - 1.3) < 3.5) this.shaftLamp.position.set(1.0, ly, CAB.LANDING_Z + 0.05);
      }
      this.shaftLamp.intensity = lampI * 3.5 * (this.shaftStyle === 'void' ? 0 : 1);
      this.shake = Math.max(this.shake, Math.min(0.25, Math.abs(this.speed) * 0.02));
    }

    // Licht
    let lv = this.light;
    if (this.lightMode === 'flicker') lv *= Math.random() < 0.3 ? 0.1 : 1;
    if (this.lightMode === 'dying') lv *= (Math.sin(this.time * 9) + Math.sin(this.time * 23)) > 1.2 ? 0.05 : 0.8;
    if (this.lightMode === 'off') lv = 0;
    this.cabLight.intensity = 5 * lv;
    this.panelMat.emissiveIntensity = 1.6 * lv + 0.02;
    this.redLight.intensity = this.emergency * (0.6 + Math.sin(this.time * 3) * 0.4) * 3;
    const cf = 0.85 + Math.sin(this.time * 8.1) * 0.08 + Math.sin(this.time * 13.7) * 0.05;
    this.candleLight.intensity = 0.6 * cf * (this.candlesLit === false ? 0 : 1);
    for (const c of this.candles) { c.visible = this.candlesLit !== false; c.scale.y = 0.07 * (0.9 + Math.sin(this.time * 11 + c.position.x) * 0.1); }

    // Telefon
    if (this.phoneRinging) this.phoneLampMat.emissiveIntensity = (Math.sin(this.time * 12) > 0 ? 3 : 0.2);
    else this.phoneLampMat.emissiveIntensity = damp(this.phoneLampMat.emissiveIntensity, this.phoneActive ? 1.2 : 0, 4, dt);

    this.shake = Math.max(0, this.shake - dt * 0.5);
  }
}

function moveTo(v, t, step) {
  if (v < t) return Math.min(t, v + step);
  if (v > t) return Math.max(t, v - step);
  return v;
}
