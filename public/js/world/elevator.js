// DIE NEUNTE – die entweihte Heilige Kabine, umgebaut zum Lastaufzug der Mannschaft.
// Altes Nussholz, Messing und Damast, überschraubt mit Stahlplatten, Riffelblech, Lastnetzen.
// Innenmaß 5 × 4 × 3,3 m, Scherengitter 3 m, Tür zur +Z-Seite. Ursprung = Bodenmitte.
// Modulplätze (Ada) siehe cabin-modules.js.

import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Builder, boxGeometry, cylGeometry, torusGeometry } from '../gfx/geo.js';
import { mat, glowMat } from '../gfx/materials.js';
import { textTexture, drawDialSymbol, flameTexture } from '../gfx/textures.js';
import { damp, lerp } from '../core/rng.js';
import { CAB, DEPTH_STAGES, MODULES } from './cab.js';
import { buildModule, buildSlotPlate } from './cabin-modules.js';

export { CAB, DEPTH_STAGES, MODULES };

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

// Hebelwinkel des Telegrafen je Stellung
const LEVER_SPAN = 2.5;
function stageAngle(i) { return -LEVER_SPAN / 2 + (i / (DEPTH_STAGES.length - 1)) * LEVER_SPAN; }

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

const HW = CAB.W / 2, T = CAB.WALL, DW = CAB.DOOR / 2;

export class Elevator {
  constructor(renderer, collision) {
    this.r = renderer;
    this.collision = collision;
    this.group = new THREE.Group();
    this.group.name = 'DieNeunte';
    this.state = 'idle';
    this.gateOpen = 0;       // 0 zu, 1 offen
    this.gateTarget = 0;
    this.doorsOpen = 0;      // Etagentor (gehört zur Ebene)
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
    this.leverStage = 0;     // gewählte Tiefenstufe am Telegrafen
    this.lever = stageAngle(0);
    this.unlockedStages = 1; // Seilstufe: bis wohin der Hebel darf
    this.modules = {};       // id → Stufe
    this.moduleParts = {};   // id → { group, colliders, update }
    this.slotPlates = {};    // id → leere Montageplatte
    this.interactables = []; // { id, pos, radius } für das spätere Benutzen-System
    this.shelfSlots = [];    // Ablageplätze im Lastregal

    // Lack der Stahlplatten (Kosmetik „Lack“) – eigene Kopie, damit nur die Kabine umgefärbt wird
    this.paintMat = mat('steelPanel').clone();
    this.paintMat.name = 'cabPaint';

    this._buildFloor();
    this._buildWalls();
    this._buildCeiling();
    this._buildFront();
    this._buildGate();
    this._buildDial();
    this._buildLights();
    this._buildMirror();
    this._buildPanel();
    this._buildTelegraph();
    this._buildPhone();
    this._buildNets();
    this._buildOuterDoors();
    this._buildShaft();
    this._buildColliders();
    this._buildSlotPlates();
    renderer.scene.add(this.group);
  }

  // ---------------------------------------------------------------- Hülle

  _buildFloor() {
    const b = new Builder();
    const { D, FRONT, BACK } = CAB;
    // Unterbau: die alten Dielen der Heiligen Kabine
    b.box(mat('woodPlanks'), 0, -0.06, 0, CAB.W + 2 * T, 0.1, D + 2 * T);
    // Riffelblech-Platten darüber; die Mitte bleibt offen – dort liegt noch das Messing-Zifferblatt
    const xs = [-HW, -HW / 2, 0, HW / 2, HW], zs = [BACK, BACK + 1, BACK + 2, BACK + 3, FRONT];
    const tread = mat('treadPlate');
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      if ((i === 1 || i === 2) && (j === 1 || j === 2)) continue;
      const x0 = xs[i], x1 = xs[i + 1], z0 = zs[j], z1 = zs[j + 1];
      b.box(tread, (x0 + x1) / 2, -0.004, (z0 + z1) / 2, x1 - x0 - 0.02, 0.012, z1 - z0 - 0.02);
    }
    // Stahlwinkel um das Holzfenster
    const steel = mat('steel');
    const wx = HW / 2, wz0 = BACK + 1, wz1 = BACK + 3;
    b.box(steel, 0, 0.0, wz0 + 0.03, 2 * wx, 0.02, 0.06);
    b.box(steel, 0, 0.0, wz1 - 0.03, 2 * wx, 0.02, 0.06);
    b.box(steel, -wx + 0.03, 0.0, (wz0 + wz1) / 2, 0.06, 0.02, wz1 - wz0);
    b.box(steel, wx - 0.03, 0.0, (wz0 + wz1) / 2, 0.06, 0.02, wz1 - wz0);
    // Warnstreifen an der Schwelle
    b.box(mat('hazard'), 0, 0.004, FRONT - 0.16, CAB.DOOR, 0.006, 0.28);
    // Zurrösen im Boden
    const ring = torusGeometry(0.045, 0.01, 5, 10);
    for (const [x, z] of [[-2.25, -1.6], [-2.25, 0], [-2.25, 1.4], [2.25, -1.6], [2.25, 0], [2.25, 1.4], [-1.0, -1.8], [1.0, -1.8]]) {
      b.add(steel, ring, x, 0.012, z, Math.PI / 2, 0, 0);
      b.box(steel, x, 0.006, z, 0.12, 0.012, 0.05);
    }
    this.group.add(b.build());

    // Bodeneinlage: das Zifferblatt in Messing (unter dem Stahl freigelassen)
    const inlayTex = textTexture(256, 256, (g) => {
      g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
      drawDialSymbol(g, 128, 150, 90, '#ffffff', 0.9, 7);
    }, { srgb: false });
    const inlay = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshStandardMaterial({
      color: 0xc9a050, metalness: 0.9, roughness: 0.3, alphaMap: inlayTex, transparent: true, depthWrite: false,
    }));
    inlay.rotation.x = -Math.PI / 2;
    inlay.position.set(0, -0.0085, 0);
    inlay.receiveShadow = true;
    this.group.add(inlay);
  }

  _buildWalls() {
    const b = new Builder();
    const { D, H, BACK } = CAB;
    const walnut = mat('walnut'), damask = mat('damask'), brass = mat('brass'), dark = mat('wood'), steel = mat('steel');
    const paint = this.paintMat;
    const nut = cylGeometry(0.02, 0.02, 0.014, 6);

    // Seitenwände (s = −1 links, +1 rechts)
    for (const s of [-1, 1]) {
      const xo = s * (HW + T / 2), xi = s * HW;
      b.box(walnut, xo, H / 2, 0, T, H + 0.1, D + 2 * T);
      // Damastfelder oben, in Messing gerahmt
      for (const z of [-1.33, 0, 1.33]) {
        b.box(damask, xi - s * 0.01, 2.15, z, 0.02, 1.2, 1.18);
        b.box(brass, xi - s * 0.022, 2.77, z, 0.02, 0.025, 1.22);
        b.box(brass, xi - s * 0.022, 1.53, z, 0.02, 0.025, 1.22);
        b.box(brass, xi - s * 0.022, 2.15, z - 0.6, 0.02, 1.26, 0.025);
        b.box(brass, xi - s * 0.022, 2.15, z + 0.6, 0.02, 1.26, 0.025);
      }
      // grobe Verstärkung: Stahlbänder quer über den Damast
      b.box(steel, xi - s * 0.035, 2.15, s < 0 ? 1.33 : -1.33, 0.012, 1.62, 0.09, { rx: 0.75 });
      b.box(steel, xi - s * 0.035, 2.15, 0, 0.012, 1.62, 0.09, { rx: s * -0.75 });
      // Stahlplatten unten, verschraubt
      b.box(paint, xi - s * 0.02, 0.73, 0, 0.03, 1.46, D);
      for (let z = BACK + 0.15; z < CAB.FRONT - 0.1; z += 0.3) {
        for (const y of [0.08, 1.38]) b.add(steel, nut, xi - s * 0.04, y, z, 0, 0, Math.PI / 2);
      }
      // Stoßleisten (Holz mit Stahlkappe)
      for (const y of [0.4, 1.05]) {
        b.box(dark, xi - s * 0.08, y, 0, 0.08, 0.14, D - 0.1);
        b.box(steel, xi - s * 0.125, y, 0, 0.012, 0.15, D - 0.1);
        for (const z of [-1.6, -0.4, 0.8]) b.box(steel, xi - s * 0.06, y, z, 0.12, 0.18, 0.05);
      }
      // Gesims & Fußleiste
      b.box(dark, xi - s * 0.05, H - 0.15, 0, 0.1, 0.3, D);
      b.box(brass, xi - s * 0.06, H - 0.32, 0, 0.12, 0.03, D);
    }

    // Rückwand: Schrein mit dem Spiegel in der Mitte
    const zo = BACK - T / 2, zi = BACK;
    b.box(walnut, 0, H / 2, zo, CAB.W + 2 * T, H + 0.1, T);
    for (const x of [-1.72, 1.72]) {
      b.box(damask, x, 2.15, zi + 0.01, 1.18, 1.2, 0.02);
      b.box(brass, x, 2.77, zi + 0.022, 1.22, 0.025, 0.02);
      b.box(brass, x, 1.53, zi + 0.022, 1.22, 0.025, 0.02);
      b.box(brass, x - 0.6, 2.15, zi + 0.022, 0.025, 1.26, 0.02);
      b.box(brass, x + 0.6, 2.15, zi + 0.022, 0.025, 1.26, 0.02);
    }
    b.box(steel, 1.72, 2.15, zi + 0.035, 1.62, 0.09, 0.012, { rz: -0.75 });
    b.box(paint, 0, 0.73, zi + 0.02, CAB.W, 1.46, 0.03);
    for (let x = -HW + 0.15; x < HW - 0.1; x += 0.3) {
      for (const y of [0.08, 1.38]) b.add(steel, nut, x, y, zi + 0.04, Math.PI / 2, 0, 0);
    }
    b.box(dark, 0, H - 0.15, zi + 0.05, CAB.W, 0.3, 0.1);
    b.box(brass, 0, H - 0.32, zi + 0.06, CAB.W, 0.03, 0.12);
    // Altarbrett unter dem Spiegel + alter Messing-Handlauf
    b.box(walnut, 0, 1.36, zi + 0.11, 1.8, 0.05, 0.22);
    b.box(brass, 0, 1.335, zi + 0.22, 1.8, 0.02, 0.02);
    b.add(brass, cylGeometry(0.022, 0.022, CAB.W - 0.5, 8), 0, 0.98, zi + 0.08, 0, 0, Math.PI / 2);
    for (const x of [-2.0, -0.7, 0.7, 2.0]) b.box(brass, x, 0.98, zi + 0.04, 0.03, 0.03, 0.08);

    // Kerzen links und rechts vom Spiegel – das Letzte, was vom Heiligtum übrig ist
    this.candles = [];
    for (const x of [-0.98, 0.98]) {
      b.box(brass, x, 1.52, zi + 0.07, 0.1, 0.02, 0.1);
      b.cyl(brass, x, 1.4, zi + 0.07, 0.012, 0.03, 0.12, 6);
      b.cyl(mat('bone'), x, 1.53, zi + 0.07, 0.022, 0.022, 0.12, 8);
      const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTexture(), color: 0xc89060, blending: THREE.AdditiveBlending, depthWrite: false }));
      flame.scale.set(0.035, 0.07, 1);
      flame.position.set(x, 1.685, zi + 0.07);
      this.group.add(flame);
      this.candles.push(flame);
    }
    this.group.add(b.build());
  }

  _buildCeiling() {
    const b = new Builder();
    const { H, D } = CAB;
    const dark = mat('wood'), steel = mat('steel'), brass = mat('brass');
    b.box(dark, 0, H + 0.05, 0, CAB.W + 2 * T, 0.1, D + 2 * T);
    // Kassetten des alten Holzhimmels
    for (const x of [-1.25, 0, 1.25]) b.box(dark, x, H - 0.06, 0, 0.1, 0.12, D);
    for (const z of [-1.33, 1.33]) b.box(dark, 0, H - 0.06, z, CAB.W, 0.12, 0.1);
    // Zwei Doppel-T-Träger quer, grob verschraubt
    this.beamZ = [-1.1, 1.1];
    for (const z of this.beamZ) {
      b.box(steel, 0, H - 0.13, z, CAB.W, 0.2, 0.02);
      b.box(steel, 0, H - 0.03, z, CAB.W, 0.02, 0.14);
      b.box(steel, 0, H - 0.23, z, CAB.W, 0.02, 0.14);
      for (const x of [-2.2, -1.1, 0, 1.1, 2.2]) b.add(steel, torusGeometry(0.04, 0.01, 4, 8), x, H - 0.28, z, 0, Math.PI / 2, 0);
    }
    // Wartungsluke
    b.box(steel, 1.5, H - 0.01, -0.2, 0.7, 0.02, 0.7);
    b.box(mat('brassDark'), 1.5, H - 0.02, -0.2, 0.6, 0.02, 0.6);
    // Opalglas-Rahmen der alten Deckenleuchte
    for (const s of [-1, 1]) {
      b.box(brass, s * 0.52, H - 0.13, 0, 0.04, 0.03, 1.08);
      b.box(brass, 0, H - 0.13, s * 0.52, 1.08, 0.03, 0.04);
    }
    // Käfiglampen am vorderen Träger
    for (const x of [-1.3, 1.3]) {
      const y = H - 0.5;
      b.cyl(steel, x, y + 0.08, 1.1, 0.004, 0.004, H - 0.23 - y - 0.08, 4);
      b.cyl(steel, x, y + 0.06, 1.1, 0.07, 0.07, 0.04, 10);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.box(steel, x + Math.cos(a) * 0.07, y - 0.04, 1.1 + Math.sin(a) * 0.07, 0.008, 0.2, 0.008);
      }
      b.add(steel, torusGeometry(0.07, 0.005, 3, 12), x, y - 0.03, 1.1, Math.PI / 2, 0, 0);
    }
    this.group.add(b.build());
  }

  _buildFront() {
    const b = new Builder();
    const { H, FRONT, DOOR_H } = CAB;
    const walnut = mat('walnut'), steel = mat('steel'), dark = mat('wood'), brass = mat('brass');
    const zc = FRONT + T / 2;
    const side = HW + T - DW;
    for (const s of [-1, 1]) {
      const x = s * (DW + side / 2);
      b.box(walnut, x, H / 2, zc, side, H + 0.1, T);
      b.box(this.paintMat, s * (DW + (HW - DW) / 2), 0.73, FRONT - 0.02, HW - DW, 1.46, 0.03);
      b.box(dark, s * (DW + (HW - DW) / 2), H - 0.15, FRONT - 0.05, HW - DW, 0.3, 0.1);
      // Türpfosten: Stahl-U-Profil über dem alten Messing
      b.box(steel, s * (DW + 0.06), DOOR_H / 2, FRONT - 0.03, 0.12, DOOR_H, 0.1);
      b.box(brass, s * (DW + 0.125), DOOR_H / 2, FRONT - 0.03, 0.01, DOOR_H, 0.08);
      b.box(mat('hazard'), s * (DW + 0.06), 0.55, FRONT - 0.085, 0.12, 1.1, 0.01);
    }
    // Sturz über der Tür
    b.box(walnut, 0, (DOOR_H + H) / 2, zc, CAB.DOOR, H - DOOR_H, T);
    b.box(steel, 0, DOOR_H + 0.06, FRONT - 0.03, CAB.DOOR + 0.24, 0.12, 0.1);
    b.box(mat('hazard'), 0, DOOR_H + 0.002, FRONT + 0.04, CAB.DOOR, 0.006, 0.14);
    // Laufschienen des Scherengitters
    b.box(steel, 0, DOOR_H - 0.02, CAB.GATE_Z, CAB.DOOR + 0.1, 0.04, 0.06);
    b.box(steel, 0, 0.01, CAB.GATE_Z, CAB.DOOR + 0.1, 0.02, 0.06);
    // Schwellenblech zwischen Kabine und Absatz
    b.box(mat('treadPlate'), 0, -0.004, (FRONT + CAB.LANDING_Z) / 2, CAB.DOOR + 0.2, 0.012, CAB.LANDING_Z - FRONT + 0.04);
    // Nasenbrett unter der Schwelle (sichtbar, wenn die Kabine höher steht als der Absatz)
    b.box(steel, 0, -0.6, FRONT + 0.1, CAB.DOOR + 0.2, 1.2, 0.02);
    this.group.add(b.build());
  }

  // ---------------------------------------------------------------- Scherengitter

  _buildGate() {
    const armor = this.modules.panzergitter || 0;
    const N = [13, 13, 17][armor], K = [6, 6, 8][armor];
    const count = N + (N - 1) * K * 2;
    if (this.gate) { this.group.remove(this.gate); this.gate.dispose(); }
    const m = new THREE.InstancedMesh(boxGeometry(1, 1, 1), mat(armor ? 'steel' : 'brass'), count);
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    this.gate = m;
    this.gateN = N; this.gateK = K;
    this.gateThick = [1, 1.4, 1.6][armor];
    this.group.add(m);
    this._layoutGate();
  }

  _layoutGate() {
    const N = this.gateN, K = this.gateK, th = this.gateThick;
    const left = -DW + 0.03;
    const fullW = CAB.DOOR - 0.06;
    const w = lerp(fullW, 0.3, this.gateOpen);
    const sp = w / (N - 1);
    const z = CAB.GATE_Z;
    const h = CAB.DOOR_H - 0.06;
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
    const axis = new THREE.Vector3(0, 0, 1);
    let idx = 0;
    for (let i = 0; i < N; i++) {
      p.set(left + i * sp, h / 2 + 0.03, z); q.identity(); s.set(0.024 * th, h, 0.024 * th);
      mtx.compose(p, q, s); this.gate.setMatrixAt(idx++, mtx);
    }
    const segH = h / K;
    for (let i = 0; i < N - 1; i++) {
      for (let k = 0; k < K; k++) {
        const x0 = left + i * sp;
        const y0 = 0.03 + k * segH;
        const len = Math.hypot(sp, segH);
        const ang = Math.atan2(segH, sp);
        for (const dir of [1, -1]) {
          p.set(x0 + sp / 2, y0 + segH / 2, z + dir * 0.014 * th);
          q.setFromAxisAngle(axis, dir * ang);
          s.set(len, 0.015 * th, 0.008 * th);
          mtx.compose(p, q, s); this.gate.setMatrixAt(idx++, mtx);
        }
      }
    }
    this.gate.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- Anzeigen

  _buildDial() {
    // Zifferblatt über der Tür (innen) – die Nadel zeigt die wirkliche Tiefe
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
      // später darübergeschabt:
      g.save(); g.translate(cx, cy - 70); g.rotate(-0.06);
      g.font = '22px "Special Elite", monospace'; g.fillStyle = 'rgba(210,200,180,0.55)';
      g.fillText('LAST · MAX. 2000 KG', 0, 0);
      g.restore();
    });
    const y = 3.0;
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.506), new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.4, metalness: 0.2, emissive: 0xffe0a0, emissiveMap: tex, emissiveIntensity: 0.08,
    }));
    face.position.set(0, y, CAB.FRONT - 0.006);
    face.rotation.y = Math.PI;
    this.group.add(face);
    this.dialFace = face;
    const pivot = new THREE.Group();
    pivot.position.set(0, y - 0.506 / 2 + 0.06, CAB.FRONT - 0.012);
    pivot.rotation.y = Math.PI;
    const needle = new THREE.Mesh(boxGeometry(0.34, 0.012, 0.006), glowMat(0xff5530, 2.5, 'needleGlow'));
    needle.position.x = 0.17;
    pivot.add(needle);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 12), mat('gold'));
    hub.rotation.x = Math.PI / 2;
    pivot.add(hub);
    this.group.add(pivot);
    this.needlePivot = pivot;
    // Messingrahmen
    const b = new Builder();
    b.box(mat('gold'), 0, y + 0.27, CAB.FRONT - 0.01, 0.98, 0.04, 0.02);
    b.box(mat('gold'), 0, y - 0.27, CAB.FRONT - 0.01, 0.98, 0.04, 0.02);
    this.group.add(b.build());

    // Nixie-Anzeige neben dem Zifferblatt – und eine zweite neben dem Etagentor
    this.nixieCanvasTex = textTexture(256, 96, () => {});
    this.nixieMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: this.nixieCanvasTex, emissiveIntensity: 2.4, roughness: 0.6 });
    const nixie = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.12), this.nixieMat);
    nixie.position.set(0.72, y, CAB.FRONT - 0.007);
    nixie.rotation.y = Math.PI;
    this.group.add(nixie);
    this.outerNixie = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.16), this.nixieMat);
    this.outerNixie.position.set(CAB.OUTER_PANEL_X, CAB.OUTER_PANEL_Y, CAB.LANDING_Z + 0.105);
    this.group.add(this.outerNixie);
    this.setDisplay('EG');
  }

  setDisplay(text, { glitch = false } = {}) {
    this.displayText = text;
    const c = this.nixieCanvasTex.canvas, g = c.getContext('2d');
    g.fillStyle = '#050302'; g.fillRect(0, 0, c.width, c.height);
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
    const { H } = CAB;
    // Opalglas-Paneel der alten Kabine
    this.panelMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffd9a0, emissiveIntensity: 1.6 });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), this.panelMat);
    panel.rotation.x = Math.PI / 2;
    panel.position.set(0, H - 0.13, 0);
    this.group.add(panel);
    // Glühbirnen der Käfiglampen
    this.cageMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc070, emissiveIntensity: 3 });
    for (const x of [-1.3, 1.3]) {
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), this.cageMat);
      bulb.position.set(x, H - 0.55, 1.1);
      this.group.add(bulb);
    }

    this.cabLight = new THREE.PointLight(0xffc98a, 14, 12, 1.4);
    this.cabLight.position.set(0, H - 0.45, 0.3);
    this.group.add(this.cabLight);
    this.candleLight = new THREE.PointLight(0xff9a40, 0.6, 3.5, 2);
    this.candleLight.position.set(0, 1.75, CAB.BACK + 0.35);
    this.group.add(this.candleLight);
    this.redLight = new THREE.PointLight(0xff1a10, 0, 8, 1.6);
    this.redLight.position.set(0, H - 0.3, -0.8);
    this.group.add(this.redLight);
    this.shaftLamp = new THREE.PointLight(0xffb070, 0, 6, 1.8);
    this.group.add(this.shaftLamp);
  }

  _buildMirror() {
    const q = this.r.quality || { mirror: 256 };
    const w = 1.4, h = 1.05, y = 1.98, z = CAB.BACK + 0.006;
    this.mirror = new Reflector(new THREE.PlaneGeometry(w, h), {
      textureWidth: q.mirror, textureHeight: Math.round(q.mirror * h / w), color: 0x9a948a, clipBias: 0.003, multisample: 0,
    });
    this.mirror.position.set(0, y, z);
    this.group.add(this.mirror);
    const b = new Builder();
    const g = mat('gold');
    b.box(g, 0, y + h / 2 + 0.03, z + 0.015, w + 0.1, 0.06, 0.04);
    b.box(g, 0, y - h / 2 - 0.03, z + 0.015, w + 0.1, 0.06, 0.04);
    b.box(g, -w / 2 - 0.03, y, z + 0.015, 0.06, h, 0.04);
    b.box(g, w / 2 + 0.03, y, z + 0.015, 0.06, h, 0.04);
    // Bruderschaft hat eine Stahlklammer quer über die obere Ecke geschraubt
    b.box(mat('steel'), w / 2 - 0.05, y + h / 2 - 0.02, z + 0.03, 0.4, 0.07, 0.012, { rz: -0.7 });
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

  // Bedienfeld an der rechten Frontwand (innen): AUFWÄRTS + Schlüssel
  _buildPanel() {
    const b = new Builder();
    const x = DW + (HW - DW) / 2, z = CAB.FRONT - 0.04;
    b.box(mat('brass'), x, 1.35, z, 0.34, 0.8, 0.02);
    b.box(mat('wood'), x, 1.35, z + 0.01, 0.4, 0.86, 0.02);
    b.box(mat('steel'), x, 1.35, z - 0.012, 0.3, 0.06, 0.012);
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
    engr.rotation.y = Math.PI;
    engr.position.set(x, 1.35, z - 0.012);
    this.group.add(engr);
    this.buttonMat = new THREE.MeshStandardMaterial({ color: 0x3a2a14, emissive: 0xffb050, emissiveIntensity: 0.15, metalness: 0.6, roughness: 0.4 });
    const btn = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.03, 20), this.buttonMat);
    btn.rotation.x = Math.PI / 2;
    btn.position.set(x, 1.43, z - 0.02);
    this.group.add(btn);
    this.button = btn;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.066, 0.008, 6, 24), mat('gold'));
    ring.position.set(x, 1.43, z - 0.015);
    this.group.add(ring);
    const key = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 10), mat('brassDark'));
    key.rotation.x = Math.PI / 2;
    key.position.set(x, 1.17, z - 0.016);
    this.group.add(key);
    this.interactables.push({ id: 'button', pos: new THREE.Vector3(x, 1.43, z - 0.02), radius: 0.25 });
  }

  // Tiefenwahl: ein Maschinentelegraf aus Messing an der rechten Wand, Blatt zur Kabinenmitte
  _buildTelegraph() {
    const b = new Builder();
    const x = HW - 0.42, z = 1.2, y = 1.25, R = 0.3;
    this.telegraphPos = new THREE.Vector3(x, y, z);
    const brass = mat('brass'), dark = mat('brassDark'), steel = mat('steel');
    b.box(steel, x, 0.015, z, 0.5, 0.03, 0.5);
    b.cyl(dark, x, 0.03, z, 0.14, 0.18, 0.12, 12);
    b.cyl(brass, x, 0.15, z, 0.085, 0.1, y - R - 0.12, 12);
    b.cyl(dark, x, y - R - 0.06, z, 0.12, 0.085, 0.08, 12);
    // Trommel (Achse entlang X)
    b.add(brass, cylGeometry(R, R, 0.2, 24), x, y, z, 0, 0, Math.PI / 2);
    b.add(dark, torusGeometry(R, 0.022, 6, 28), x - 0.1, y, z, 0, Math.PI / 2, 0);
    b.add(dark, torusGeometry(R, 0.022, 6, 28), x + 0.1, y, z, 0, Math.PI / 2, 0);
    b.add(mat('gold'), cylGeometry(0.035, 0.035, 0.3, 10), x, y, z, 0, 0, Math.PI / 2);
    // Kette zur Decke (wie auf einem Schiff: zum Maschinenraum – hier zum Seil)
    b.cyl(steel, x + 0.02, y + R, z, 0.008, 0.008, CAB.H - y - R, 4);
    this.group.add(b.build());

    // Blatt
    this.telegraphTex = textTexture(512, 512, () => {});
    const face = new THREE.Mesh(new THREE.CircleGeometry(R - 0.025, 40), new THREE.MeshStandardMaterial({
      map: this.telegraphTex, roughness: 0.45, metalness: 0.1, emissive: 0xfff0d0, emissiveMap: this.telegraphTex, emissiveIntensity: 0.12,
    }));
    face.rotation.y = -Math.PI / 2;
    face.position.set(x - 0.102, y, z);
    this.group.add(face);
    this._drawTelegraph();

    // Hebel: Drehpunkt in der Trommelmitte, Zeigerarm vor dem Blatt
    const pivot = new THREE.Group();
    pivot.position.set(x, y, z);
    const lb = new Builder();
    for (const dx of [-0.125, 0.125]) {
      lb.box(brass, dx, 0.2, 0, 0.018, 0.4, 0.035);
      lb.box(brass, dx, R - 0.035, 0, 0.022, 0.05, 0.05);
    }
    lb.add(mat('wood'), cylGeometry(0.028, 0.028, 0.32, 10), 0, 0.42, 0, 0, 0, Math.PI / 2);
    lb.add(brass, cylGeometry(0.033, 0.033, 0.02, 10), -0.17, 0.42, 0, 0, 0, Math.PI / 2);
    lb.add(brass, cylGeometry(0.033, 0.033, 0.02, 10), 0.17, 0.42, 0, 0, 0, Math.PI / 2);
    pivot.add(lb.build());
    const tip = new THREE.Mesh(boxGeometry(0.01, 0.06, 0.012), glowMat(0xff5530, 2, 'needleGlow'));
    tip.position.set(-0.137, R - 0.06, 0);
    pivot.add(tip);
    this.group.add(pivot);
    this.leverPivot = pivot;
    pivot.rotation.x = this.lever;
    this.interactables.push({ id: 'lever', pos: new THREE.Vector3(x - 0.1, y + 0.3, z), radius: 0.45 });
  }

  _drawTelegraph() {
    const c = this.telegraphTex.canvas, g = c.getContext('2d');
    const S = c.width, cx = S / 2, cy = S / 2;
    g.fillStyle = '#140d08'; g.fillRect(0, 0, S, S);
    const rO = S / 2 - 6, rI = rO * 0.46;
    const n = DEPTH_STAGES.length;
    const step = LEVER_SPAN / (n - 1);
    for (let i = 0; i < n; i++) {
      const a0 = stageAngle(i) - step / 2, a1 = stageAngle(i) + step / 2;
      const open = i < this.unlockedStages;
      // Canvas-Winkel: 0 = oben, positiv = rechts
      g.beginPath();
      g.arc(cx, cy, rO, a0 - Math.PI / 2, a1 - Math.PI / 2);
      g.arc(cx, cy, rI, a1 - Math.PI / 2, a0 - Math.PI / 2, true);
      g.closePath();
      g.fillStyle = open ? (i % 2 ? '#d9c79c' : '#cbb886') : (i % 2 ? '#3a1612' : '#2e110e');
      g.fill();
      g.strokeStyle = '#2a1a0c'; g.lineWidth = 4; g.stroke();
      if (!open) {
        g.save(); g.clip();
        g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 6;
        for (let k = -S; k < S; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + S, S); g.stroke(); }
        g.restore();
      }
      const am = stageAngle(i);
      const tx = (r) => cx + Math.sin(am) * r, ty = (r) => cy - Math.cos(am) * r;
      g.save();
      g.translate(tx(rO * 0.8), ty(rO * 0.8)); g.rotate(am);
      g.fillStyle = open ? '#2a1408' : '#8a3a2a';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `700 ${i === 0 ? 30 : 46}px "Cormorant Garamond", serif`;
      g.fillText(DEPTH_STAGES[i].label, 0, 0);
      g.restore();
      g.save();
      g.translate(tx(rO * 0.6), ty(rO * 0.6)); g.rotate(am);
      g.fillStyle = open ? '#4a2a14' : '#6a2a20';
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '16px "Special Elite", monospace';
      g.fillText(open ? DEPTH_STAGES[i].sub : 'GESPERRT', 0, 0);
      g.restore();
    }
    g.strokeStyle = '#c9a050'; g.lineWidth = 10;
    g.beginPath(); g.arc(cx, cy, rO, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#c9a050'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '600 26px "Cormorant Garamond", serif';
    g.fillText('DIE NEUNTE', cx, cy + 70);
    g.font = '18px "Special Elite", monospace'; g.fillStyle = '#9a7a40';
    g.fillText('TIEFENWAHL', cx, cy + 104);
    g.fillText(`SEILSTUFE ${['0', 'I', 'II', 'III', 'IV', 'V', 'VI'][Math.max(0, this.unlockedStages - 1)]}`, cx, cy + 134);
    drawDialSymbol(g, cx, cy + 196, 26, '#8a6a30', 0.4);
    this.telegraphTex.needsUpdate = true;
  }

  _buildPhone() {
    // Notruftelefon: Holzkasten mit Messingglocken an der linken Wand, Hörer an Kordel
    const b = new Builder();
    const x = -HW + 0.08, z = 1.25;
    b.box(mat('wood'), x, 1.42, z, 0.12, 0.42, 0.26);
    b.box(mat('brass'), x + 0.061, 1.52, z, 0.005, 0.12, 0.2);
    b.add(mat('gold'), cylGeometry(0.035, 0.035, 0.02, 12), x + 0.07, 1.585, z - 0.09, 0, 0, Math.PI / 2);
    b.add(mat('gold'), cylGeometry(0.035, 0.035, 0.02, 12), x + 0.07, 1.585, z + 0.09, 0, 0, Math.PI / 2);
    b.box(mat('brassDark'), x + 0.08, 1.38, z, 0.04, 0.03, 0.24);
    // Kabel an der Wand entlang zur Decke
    b.box(mat('rubber'), x + 0.02, (1.63 + CAB.H) / 2, z + 0.1, 0.02, CAB.H - 1.63, 0.02);
    this.group.add(b.build());
    const handset = new THREE.Group();
    const hb = new Builder();
    hb.box(mat('fabricBlack'), 0, 0, 0, 0.04, 0.035, 0.2);
    hb.box(mat('fabricBlack'), 0, -0.02, 0.1, 0.05, 0.05, 0.06);
    hb.box(mat('fabricBlack'), 0, -0.02, -0.1, 0.05, 0.05, 0.06);
    handset.add(hb.build());
    handset.position.set(x + 0.09, 1.41, z);
    this.handsetHome = handset.position.clone();
    this.group.add(handset);
    this.handset = handset;
    this.phoneLampMat = new THREE.MeshStandardMaterial({ color: 0x200000, emissive: 0xff2010, emissiveIntensity: 0 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.018, 10, 8), this.phoneLampMat);
    lamp.position.set(x + 0.062, 1.6, z);
    this.group.add(lamp);
    this.phoneRinging = false;
    this.interactables.push({ id: 'phone', pos: new THREE.Vector3(x + 0.09, 1.45, z), radius: 0.3 });
  }

  // Lastnetze: eines unter der Decke gespannt (mit Säcken), eines lose an der linken Frontwand
  _buildNets() {
    const b = new Builder();
    const rope = mat('robe');
    const net = (corner, uVec, vVec, nu, nv, sag, sagDir) => {
      const pt = (i, j) => {
        const u = i / nu, v = j / nv;
        const s = Math.sin(Math.PI * u) * Math.sin(Math.PI * v) * sag;
        return new THREE.Vector3().copy(corner).addScaledVector(uVec, u).addScaledVector(vVec, v).addScaledVector(sagDir, s);
      };
      const seg = (a, c) => {
        const len = a.distanceTo(c);
        const g = cylGeometry(0.008, 0.008, len, 4);
        const m = new THREE.Matrix4();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3().subVectors(c, a).normalize());
        m.compose(new THREE.Vector3().addVectors(a, c).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1));
        b.addMatrix(rope, g, m);
      };
      for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
        if (i < nu) seg(pt(i, j), pt(i + 1, j));
        if (j < nv) seg(pt(i, j), pt(i, j + 1));
      }
    };
    const { H } = CAB;
    net(new THREE.Vector3(-2.35, H - 0.25, -1.1), new THREE.Vector3(1.75, 0, 0), new THREE.Vector3(0, 0, 2.2), 7, 9, 0.5, new THREE.Vector3(0, -1, 0));
    // Säcke im Netz
    const sack = mat('robe');
    b.sphere(sack, -1.7, H - 0.62, -0.3, 0.28, 10, 8, 1.2, 0.7, 1);
    b.sphere(sack, -1.15, H - 0.6, 0.35, 0.24, 10, 8, 1, 0.75, 1.3);
    // loses Netz an der linken Frontwand
    net(new THREE.Vector3(-HW + 0.1, 2.4, CAB.FRONT - 0.06), new THREE.Vector3(0.85, 0, 0), new THREE.Vector3(0, -1.5, 0), 4, 7, 0.1, new THREE.Vector3(0, 0, -1));
    b.add(mat('steel'), torusGeometry(0.035, 0.008, 4, 8), -HW + 0.1, 2.42, CAB.FRONT - 0.05, 0, 0, 0);
    b.add(mat('steel'), torusGeometry(0.035, 0.008, 4, 8), -HW + 0.95, 2.42, CAB.FRONT - 0.05, 0, 0, 0);
    this.group.add(b.build({ castShadow: true }));
  }

  // ---------------------------------------------------------------- Etagentor

  _buildOuterDoors() {
    // Zwei Stahlflügel, die hinter die Wand des Absatzes gleiten. Gehören optisch zur Ebene.
    this.outer = new THREE.Group();
    const leafW = DW + 0.06, h = CAB.DOOR_H + 0.04;
    const stencil = textTexture(512, 256, (g, w, hh) => {
      g.clearRect(0, 0, w, hh);
      g.font = '700 190px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(225,215,190,0.8)';
      g.fillText('IX', w / 2, hh / 2 + 10);
      const d = g.getImageData(0, 0, w, hh);
      for (let i = 0; i < d.data.length; i += 4) {
        const x = (i / 4) % w;
        if (Math.abs(x - w / 2) < 3) d.data[i + 3] = 0;       // Fuge zwischen den Flügeln
        if (d.data[i + 3] && ((i * 2654435761) >>> 0) / 4294967296 > 0.8) d.data[i + 3] *= 0.4;
      }
      g.putImageData(d, 0, 0);
    });
    const makeLeaf = (s) => {
      const g = new THREE.Group();
      const b = new Builder();
      b.box(mat('brass'), 0, 0, 0, leafW, h, 0.05);
      b.box(mat('steel'), 0, h / 2 - 0.05, 0.03, leafW, 0.1, 0.02);
      b.box(mat('steel'), 0, 0.2, 0.03, leafW, 0.08, 0.02);
      b.box(mat('hazard'), 0, -h / 2 + 0.14, 0.03, leafW, 0.28, 0.012);
      b.box(mat('steel'), s * (leafW / 2 - 0.04), 0, 0.03, 0.08, h, 0.025);
      g.add(b.build());
      // halbe Schablone „IX“
      const geo = new THREE.PlaneGeometry(leafW, leafW / 2);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, s < 0 ? uv.getX(i) * 0.5 : 0.5 + uv.getX(i) * 0.5);
      const m = new THREE.MeshStandardMaterial({ map: stencil, transparent: true, depthWrite: false, roughness: 0.9 });
      const dec = new THREE.Mesh(geo, m);
      dec.position.set(-s * 0.03, 0.75, 0.042);
      g.add(dec);
      return g;
    };
    this.leafL = makeLeaf(-1);
    this.leafR = makeLeaf(1);
    this.leafW = leafW;
    // Flügel liegen zwischen Kabinenfront und Wand des Absatzes, damit sie offen hinter der Wand verschwinden
    for (const l of [this.leafL, this.leafR]) { l.position.set(0, h / 2, CAB.LANDING_Z - 0.09); this.outer.add(l); }
    this.group.add(this.outer);
    this._layoutOuter();
  }

  setOuterStyle(materialName = 'brass') {
    for (const leaf of [this.leafL, this.leafR]) {
      leaf.traverse((o) => { if (o.isMesh && (o.material.name === 'brass' || o.userData.outerBase)) { o.material = mat(materialName); o.userData.outerBase = true; } });
    }
  }

  _layoutOuter() {
    const off = this.doorsOpen * (this.leafW + 0.02);
    this.leafL.position.x = -this.leafW / 2 - off;
    this.leafR.position.x = this.leafW / 2 + off;
    this.outer.visible = this.outerVisible;
    if (this.outerNixie) this.outerNixie.visible = this.outerVisible && this.showOuterNixie !== false;
  }

  // ---------------------------------------------------------------- Schacht (Fahrt)

  _buildShaft() {
    this.shaft = new THREE.Group();
    this.shaft.visible = false;
    const SW = CAB.W + 1.6;
    const wallGeo = new THREE.PlaneGeometry(SW, 16, 1, 1);
    const uv = wallGeo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * SW, uv.getY(i) * 16);
    this.shaftMatFront = mat('concrete').clone();
    this.shaftMatFront.map = this.shaftMatFront.map.clone();
    this.shaftMatFront.bumpMap = this.shaftMatFront.bumpMap.clone();
    const front = new THREE.Mesh(wallGeo, this.shaftMatFront);
    front.position.set(0, 3, CAB.LANDING_Z + 0.3);
    front.rotation.y = Math.PI;
    front.receiveShadow = true;
    this.shaftFront = front;
    this.shaft.add(front);
    for (const s of [-1, 1]) {
      const side = new THREE.Mesh(wallGeo, this.shaftMatFront);
      side.position.set(s * (DW + 0.5), 3, CAB.LANDING_Z);
      side.rotation.y = -s * Math.PI / 2;
      side.scale.x = 0.12;
      this.shaft.add(side);
    }
    // Vorbeiziehende Etagen (Tore, Lampen) – Pool
    this.passers = [];
    for (let i = 0; i < 3; i++) {
      const g = new THREE.Group();
      const b = new Builder();
      b.box(mat('steel'), 0, CAB.DOOR_H / 2, 0, CAB.DOOR + 0.1, CAB.DOOR_H, 0.06);
      b.box(mat('hazard'), 0, 0.14, 0.035, CAB.DOOR + 0.1, 0.28, 0.01);
      b.box(mat('rust'), -DW - 0.12, CAB.DOOR_H / 2 + 0.1, 0.05, 0.16, CAB.DOOR_H + 0.2, 0.12);
      b.box(mat('rust'), DW + 0.12, CAB.DOOR_H / 2 + 0.1, 0.05, 0.16, CAB.DOOR_H + 0.2, 0.12);
      b.box(mat('rust'), 0, CAB.DOOR_H + 0.15, 0.05, CAB.DOOR + 0.4, 0.16, 0.12);
      b.box(mat('concrete'), 0, -0.1, 0.1, CAB.DOOR + 1, 0.2, 0.3);
      g.add(b.build());
      const numTex = textTexture(128, 64, (gg) => { gg.fillStyle = '#000'; gg.fillRect(0, 0, 128, 64); }, { srgb: false });
      const num = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshStandardMaterial({ color: 0xd8d0b0, alphaMap: numTex, transparent: true, depthWrite: false }));
      num.position.set(DW - 0.4, CAB.DOOR_H + 0.45, 0.03);
      g.add(num);
      g.userData.numTex = numTex;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), glowMat(0xffb070, 4, 'shaftLampGlow'));
      lamp.position.set(-DW - 0.5, CAB.DOOR_H + 0.3, 0.12);
      g.add(lamp);
      g.userData.lamp = lamp;
      g.rotation.y = Math.PI;
      g.position.set(0, -50, CAB.LANDING_Z + 0.27);
      this.shaft.add(g);
      this.passers.push(g);
    }
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

  // ---------------------------------------------------------------- Kollision

  _buildColliders() {
    const c = this.collision;
    const { FRONT, BACK, LANDING_Z } = CAB;
    const box = (minX, maxX, minZ, maxZ, extra = {}) => c.add({ minX, maxX, minZ, maxZ, minY: -1, maxY: 4, tag: 'cab', ...extra });
    this.colliders = [
      box(-HW - T, -HW, BACK - T, FRONT + T),
      box(HW, HW + T, BACK - T, FRONT + T),
      box(-HW - T, HW + T, BACK - T, BACK),
      box(-HW - T, -DW, FRONT - 0.08, LANDING_Z),
      box(DW, HW + T, FRONT - 0.08, LANDING_Z),
      // Telegraf-Säule
      box(this.telegraphPos.x - 0.2, this.telegraphPos.x + 0.2, this.telegraphPos.z - 0.2, this.telegraphPos.z + 0.2),
    ];
    this.gateCollider = box(-DW, DW, CAB.GATE_Z - 0.06, CAB.GATE_Z + 0.06, { noSight: true });
    this.doorCollider = box(-DW, DW, LANDING_Z - 0.12, LANDING_Z + 0.02);
  }

  // ---------------------------------------------------------------- Module

  _buildSlotPlates() {
    for (const id of Object.keys(MODULES)) {
      if (MODULES[id].cosmetic) continue;
      const plate = buildSlotPlate(id);
      if (!plate) continue;
      this.group.add(plate);
      this.slotPlates[id] = plate;
    }
  }

  // Modul ein-/ausbauen. level 0 = ausbauen.
  setModule(id, level = 1) {
    const def = MODULES[id];
    if (!def) throw new Error('Unbekanntes Modul: ' + id);
    level = Math.max(0, Math.min(def.max, level | 0));
    if ((this.modules[id] || 0) === level) return;
    const old = this.moduleParts[id];
    if (old) {
      this.group.remove(old.group);
      for (const c of old.colliders || []) this.collision.remove(c);
      old.dispose?.();
      delete this.moduleParts[id];
    }
    this.interactables = this.interactables.filter(it => it.module !== id);
    if (level) this.modules[id] = level; else delete this.modules[id];
    if (id === 'panzergitter') { this._buildGate(); return; }
    if (this.slotPlates[id]) this.slotPlates[id].visible = !level;
    if (!level) return;
    const part = buildModule(id, this, level);
    if (!part) return;
    this.group.add(part.group);
    part.colliders = (part.colliders || []).map(cb => this.collision.add({ minY: -1, maxY: 4, tag: 'cab', ...cb }));
    for (const it of part.interactables || []) this.interactables.push({ ...it, module: id });
    this.moduleParts[id] = part;
  }

  hasModule(id) { return (this.modules[id] || 0) > 0; }

  // Lack der Stahlplatten (Kosmetik)
  setPaint(color = 0xffffff) { this.paintMat.color.set(color); }

  // Flutlicht an/aus (braucht das Modul)
  setFlood(on) { this.floodOn = !!on; }

  // Salzkanone auf einen Punkt (Welt) richten / feuern
  aimCannon(target) { this.moduleParts.salzkanone?.aim?.(target); }
  fireCannon() { return this.moduleParts.salzkanone?.fire?.() ?? false; }

  // Rufglocke anschlagen (Ton spielt das Spiel)
  ringBell() { return this.moduleParts.rufglocke?.ring?.() ?? false; }

  // Horchgerät: Punkte in Weltkoordinaten { x, z, kind: 'crew'|'monster' }
  setRadarBlips(list) { if (this.moduleParts.horchgeraet) this.moduleParts.horchgeraet.blips = list; }

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

  // Tiefenwahl-Hebel. Gibt die tatsächlich eingestellte Stufe zurück (gesperrte Stufen gehen nicht).
  setDepthStage(i, instant = false) {
    i = Math.max(0, Math.min(this.unlockedStages - 1, i | 0));
    this.leverStage = i;
    if (instant) this.lever = stageAngle(i);
    return i;
  }

  stepDepthStage(dir) { return this.setDepthStage(this.leverStage + Math.sign(dir)); }

  // Seilstufe (Ada): wie viele Hebelstellungen frei sind (1 = nur OBEN, 2 = OBEN + I, …)
  setUnlockedStages(n) {
    this.unlockedStages = Math.max(1, Math.min(DEPTH_STAGES.length, n | 0));
    if (this.leverStage >= this.unlockedStages) this.setDepthStage(this.unlockedStages - 1);
    this._drawTelegraph();
  }

  // Punkt in der Kabine? (Beute zählt nur hier drin)
  contains(p, margin = 0) {
    return Math.abs(p.x) < HW - margin && p.z > CAB.BACK + margin && p.z < CAB.GATE_Z - margin;
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

  ring(on) { this.phoneRinging = on; }

  // Hat die Kabine Strom? (Stromausfall-Ritual → aus, Notstrom hält das Licht)
  get powered() { return this.lightMode !== 'off' || this.hasModule('notstrom'); }

  update(dt) {
    this.time += dt;
    // Gitter & Tor
    const gPrev = this.gateOpen;
    this.gateOpen = moveTo(this.gateOpen, this.gateTarget, dt / 2.0);
    if (this.gateOpen !== gPrev) this._layoutGate();
    const dT = this.doorsTarget, dPrev = this.doorsOpen;
    if (dT > this.doorsOpen && this.gateOpen > 0.4) this.doorsOpen = moveTo(this.doorsOpen, dT, dt / 1.6);
    else if (dT < this.doorsOpen) this.doorsOpen = moveTo(this.doorsOpen, dT, dt / 1.6);
    if (this.doorsOpen !== dPrev || this.outer.visible !== this.outerVisible) this._layoutOuter();
    this.gateCollider.enabled = this.gateOpen < 0.85;
    this.doorCollider.enabled = this.outerVisible && this.doorsOpen < 0.85;

    // Zeiger
    this.needle = damp(this.needle, this.needleTarget, 2.2, dt);
    const jitter = this.needleJitter > 0 ? (Math.random() - 0.5) * this.needleJitter : 0;
    this.needlePivot.rotation.z = Math.PI - (this.needle + jitter);
    // Telegrafenhebel
    this.lever = damp(this.lever, stageAngle(this.leverStage), 7, dt);
    this.leverPivot.rotation.x = this.lever;

    // Fahrt
    this.speed = damp(this.speed, this.speedTarget ?? 0, 0.9, dt);
    if (this.state === 'stopping' && Math.abs(this.speed) < 0.05) { this.speed = 0; this.state = 'stopped'; }
    if (this.shaft.visible) {
      this.shaftOffset += this.speed * dt;
      this.shaftMatFront.map.offset.y = -this.shaftOffset / 3;
      this.shaftMatFront.bumpMap.offset.y = -this.shaftOffset / 3;
      let lampI = 0;
      for (const p of this.passers) {
        p.position.y -= this.speed * dt;
        if (p.position.y > 14) p.position.y -= this.passSpacing * this.passers.length;
        if (p.position.y < -20) p.position.y += this.passSpacing * this.passers.length;
        const ly = p.position.y + CAB.DOOR_H + 0.3;
        if (Math.abs(ly - 1.3) < 3.5) {
          lampI = Math.max(lampI, 1 - Math.abs(ly - 1.3) / 3.5);
          this.shaftLamp.position.set(DW + 0.5, ly, CAB.LANDING_Z + 0.1);
        }
      }
      this.shaftLamp.intensity = lampI * 4 * (this.shaftStyle === 'void' ? 0 : 1);
      this.shake = Math.max(this.shake, Math.min(0.25, Math.abs(this.speed) * 0.02));
    }

    // Licht
    let lv = this.light;
    if (this.lightMode === 'flicker') lv *= Math.random() < 0.3 ? 0.1 : 1;
    if (this.lightMode === 'dying') lv *= (Math.sin(this.time * 9) + Math.sin(this.time * 23)) > 1.2 ? 0.05 : 0.8;
    if (this.lightMode === 'off') lv = 0;
    if (this.hasModule('notstrom') && this.lightMode !== 'normal') lv = Math.max(lv, 0.35 * this.light);
    this.cabLight.intensity = 14 * lv;
    this.panelMat.emissiveIntensity = 1.6 * lv + 0.02;
    this.cageMat.emissiveIntensity = 3 * lv + 0.02;
    this.redLight.intensity = this.emergency * (0.6 + Math.sin(this.time * 3) * 0.4) * 4;
    const cf = 0.85 + Math.sin(this.time * 8.1) * 0.08 + Math.sin(this.time * 13.7) * 0.05;
    this.candleLight.intensity = 0.7 * cf * (this.candlesLit === false ? 0 : 1);
    for (const c of this.candles) { c.visible = this.candlesLit !== false; c.scale.y = 0.07 * (0.9 + Math.sin(this.time * 11 + c.position.x) * 0.1); }
    this.buttonMat.emissiveIntensity = 0.15 + (this.leverStage === 0 ? 0.25 + Math.sin(this.time * 3) * 0.1 : 0);

    // Telefon
    if (this.phoneRinging) this.phoneLampMat.emissiveIntensity = (Math.sin(this.time * 12) > 0 ? 3 : 0.2);
    else this.phoneLampMat.emissiveIntensity = damp(this.phoneLampMat.emissiveIntensity, this.phoneActive ? 1.2 : 0, 4, dt);

    // Module
    for (const id in this.moduleParts) this.moduleParts[id].update?.(dt, this);

    this.shake = Math.max(0, this.shake - dt * 0.5);
  }
}

function moveTo(v, t, step) {
  if (v < t) return Math.min(t, v + step);
  if (v > t) return Math.max(t, v - step);
  return v;
}
