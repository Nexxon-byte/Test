// Platzhalter-Ausstattung der neuen Monster: vorhandene Figuren + prozedurale Zusätze
// (Papierflügel, Waage, Stempel, Zifferblatt-Kopf, Laternen, nasses Haar …), bis die KI zuhause
// die echten Modelle baut (MODELLE.md). Viele Zusätze sind so gut, dass sie bleiben dürfen
// (Flügel der Falterin, Zifferblatt des Portiers) – das steht jeweils in MODELLE.md.
//
// dress(kind, monster, opts) → { update(dt, ctx), dispose(), … } · ctx = { player, time, near }
// Requisiten hängen an der Wurzel der Figur und folgen jedes Bild den Knochen in Weltkoordinaten.

import * as THREE from 'three';
import { mat, glowMat } from '../../gfx/materials.js';
import { glowTexture, mkCanvas } from '../../gfx/textures.js';
import { makeBeam } from '../../gfx/particles.js';
import { drawDialSymbol } from '../../gfx/textures.js';

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion();

// Knochen → lokal zur Wurzel
function boneLocal(m, name, out) {
  const b = m.ch.model.getObjectByName(name);
  if (!b) return out.set(0, m.height * 0.6, 0);
  b.getWorldPosition(out);
  return m.root.worldToLocal(out);
}

// Alle Materialien der Figur kopieren und verändern (Kopien, das Original bleibt)
export function remapMaterials(root, fn) {
  const made = [];
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const src = Array.isArray(o.material) ? o.material : [o.material];
    const out = src.map(m => { const c = m.clone(); fn(c, o, m); made.push(c); return c; });
    o.material = Array.isArray(o.material) ? out : out[0];
  });
  return made;
}

const glowSprite = (color, scale, opacity = 1) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity }));
  s.scale.setScalar(scale);
  s.renderOrder = 5;
  return s;
};

// ============================================================================ Texturen

let _wingTex = null;
// Flügel aus Gesangbuchseiten: vergilbt, Notenlinien, Textzeilen, verbrannte Ränder
function wingTexture() {
  if (_wingTex) return _wingTex;
  const W = 256, H = 256, c = mkCanvas(W * 2, H), g = c.getContext('2d');
  const drawWing = (ox, fore) => {
    g.save();
    g.translate(ox, 0);
    // Form
    g.beginPath();
    if (fore) {
      g.moveTo(8, 150); g.bezierCurveTo(40, 40, 170, 8, 246, 22); g.bezierCurveTo(250, 70, 214, 130, 150, 176); g.bezierCurveTo(90, 206, 30, 196, 8, 150);
    } else {
      g.moveTo(8, 60); g.bezierCurveTo(70, 40, 190, 70, 226, 150); g.bezierCurveTo(230, 210, 170, 250, 110, 236); g.bezierCurveTo(50, 222, 10, 150, 8, 60);
    }
    g.closePath();
    g.save(); g.clip();
    // Papier
    const grd = g.createLinearGradient(0, 0, W, H);
    grd.addColorStop(0, '#d8c79a'); grd.addColorStop(0.6, '#c2ad7a'); grd.addColorStop(1, '#8f7648');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    // Seitenfalz: mehrere Blätter übereinander
    g.strokeStyle = 'rgba(70,50,25,0.35)'; g.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(10 + i * 38, 0); g.lineTo(-20 + i * 50, H); g.stroke(); }
    // Notenlinien und Noten
    g.strokeStyle = 'rgba(40,25,15,0.55)'; g.lineWidth = 1;
    for (let s = 0; s < 3; s++) {
      const y0 = 40 + s * 58;
      for (let l = 0; l < 5; l++) { g.beginPath(); g.moveTo(20, y0 + l * 5); g.lineTo(W - 10, y0 + l * 5 - 12); g.stroke(); }
      g.fillStyle = 'rgba(30,20,10,0.7)';
      for (let n = 0; n < 9; n++) { const x = 30 + n * 24, y = y0 + (n * 7 % 20) - n * 1.2; g.beginPath(); g.ellipse(x, y, 3.2, 2.3, -0.4, 0, Math.PI * 2); g.fill(); g.fillRect(x + 2.4, y - 14, 1, 14); }
      // Textzeile unter dem System (Kritzel)
      g.fillStyle = 'rgba(40,25,15,0.45)';
      for (let w = 0; w < 14; w++) g.fillRect(24 + w * 15, y0 + 30 - w * 0.9, 9 + (w * 5 % 6), 2);
    }
    // rote Initiale
    g.fillStyle = 'rgba(130,20,15,0.8)'; g.font = 'bold 34px serif'; g.fillText(fore ? 'L' : 'E', 22, fore ? 120 : 110);
    // Augenfleck wie bei einem Nachtfalter: Zifferblatt
    drawDialSymbol(g, fore ? 150 : 130, fore ? 110 : 170, fore ? 26 : 20, 'rgba(60,35,20,0.8)', -0.5, 2);
    // verbrannte Ränder
    const burn = g.createRadialGradient(W * 0.45, H * 0.5, 40, W * 0.45, H * 0.5, 170);
    burn.addColorStop(0, 'rgba(0,0,0,0)'); burn.addColorStop(0.75, 'rgba(40,20,5,0.15)'); burn.addColorStop(1, 'rgba(20,8,2,0.95)');
    g.fillStyle = burn; g.fillRect(0, 0, W, H);
    // Löcher (werden über Alpha ausgestanzt)
    g.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 11; i++) { g.beginPath(); g.arc(30 + (i * 67) % 200, 30 + (i * 113) % 190, 3 + (i % 4) * 3, 0, Math.PI * 2); g.fill(); }
    g.restore();
    // Adern
    g.strokeStyle = 'rgba(55,35,18,0.9)'; g.lineWidth = 2.2;
    for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(8, fore ? 150 : 60); g.quadraticCurveTo(90 + i * 20, 60 + i * 30, 170 + i * 16, (fore ? 30 : 110) + i * 26); g.stroke(); }
    g.restore();
  };
  drawWing(0, true);
  drawWing(W, false);
  _wingTex = new THREE.CanvasTexture(c);
  _wingTex.colorSpace = THREE.SRGBColorSpace;
  _wingTex.anisotropy = 4;
  return _wingTex;
}

let _dialTex = null;
// Zifferblatt des Portiers: Halbrund, 0 … 333, ∞ – wie die Skala der Neunten
function portierDialTexture() {
  if (_dialTex) return _dialTex;
  const c = mkCanvas(512, 288), g = c.getContext('2d');
  const cx = 256, cy = 268, r = 236;
  const bg = g.createRadialGradient(cx, cy, 20, cx, cy, r);
  bg.addColorStop(0, '#2a1c10'); bg.addColorStop(1, '#0e0906');
  g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.closePath(); g.fill();
  g.strokeStyle = '#d9b36a'; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, r - 6, Math.PI, 0); g.stroke();
  g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, r - 40, Math.PI, 0); g.stroke();
  const marks = ['0', '33', '66', '99', '111', '222', '333', '∞'];
  g.fillStyle = '#e8c98a'; g.font = '600 26px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  for (let i = 0; i < marks.length; i++) {
    const a = Math.PI + (i / (marks.length - 1)) * Math.PI;
    g.save(); g.translate(cx + Math.cos(a) * (r - 22), cy + Math.sin(a) * (r - 22)); g.rotate(a + Math.PI / 2); g.fillText(marks[i], 0, 0); g.restore();
    g.beginPath(); g.moveTo(cx + Math.cos(a) * (r - 40), cy + Math.sin(a) * (r - 40)); g.lineTo(cx + Math.cos(a) * (r - 58), cy + Math.sin(a) * (r - 58)); g.stroke();
  }
  for (let i = 0; i <= 56; i++) { const a = Math.PI + i / 56 * Math.PI; g.beginPath(); g.moveTo(cx + Math.cos(a) * (r - 40), cy + Math.sin(a) * (r - 40)); g.lineTo(cx + Math.cos(a) * (r - 48), cy + Math.sin(a) * (r - 48)); g.stroke(); }
  g.font = 'italic 20px "Cormorant Garamond", serif'; g.fillStyle = '#a88850'; g.fillText('PORTIER · SCHACHT IX', cx, cy - 90);
  _dialTex = new THREE.CanvasTexture(c);
  _dialTex.colorSpace = THREE.SRGBColorSpace;
  return _dialTex;
}

let _plateTex = new Map();
// Nummernschild der Erwählten (Segnung) und Vorgänger
export function numberPlateTexture(n) {
  if (_plateTex.has(n)) return _plateTex.get(n);
  const c = mkCanvas(128, 96), g = c.getContext('2d');
  g.fillStyle = '#e9e2cf'; g.fillRect(0, 0, 128, 96);
  g.strokeStyle = '#3a2a1a'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 88);
  g.fillStyle = '#2a1a10'; g.font = '700 54px "Cormorant Garamond", serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(String(n), 64, 52);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  _plateTex.set(n, t);
  return t;
}

// ============================================================================ Die Falterin

function dressFalterin(m) {
  const tex = wingTexture();
  const wingMat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffe0b0, emissiveIntensity: 0.05, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.95, metalness: 0 });
  const mkWing = (u0, w, h, off) => {
    const geo = new THREE.PlaneGeometry(w, h);
    geo.translate(w / 2, off, 0);   // Gelenk am inneren Rand
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, u0 + uv.getX(i) * 0.5);
    return new THREE.Mesh(geo, wingMat);
  };
  const wings = new THREE.Group();
  const sides = [];
  for (const s of [-1, 1]) {
    const side = new THREE.Group();
    const fore = mkWing(0, 1.15, 0.85, 0.18), hind = mkWing(0.5, 0.9, 0.8, -0.3);
    fore.castShadow = hind.castShadow = true;
    side.add(fore, hind);
    side.scale.x = s;
    side.userData = { s, fore, hind };
    wings.add(side);
    sides.push(side);
  }
  m.root.add(wings);
  // Leuchtender Leib: gestohlenes Licht
  const belly = glowSprite(0xffcf8a, 0.35, 0.6);
  m.root.add(belly);
  // Staub von den Flügeln (Weltkoordinaten)
  const N = 36;
  const dust = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: glowTexture(), color: 0xffe3b0, size: 0.035, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  const dp = new Float32Array(N * 3), dv = new Float32Array(N * 3), life = new Float32Array(N);
  dust.geometry.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  dust.frustumCulled = false;
  m.d.R.scene.add(dust);
  let di = 0, flapT = Math.random() * 10;
  // Haut: fahl, fast durchscheinend
  remapMaterials(m.ch.model, (c) => { if (c.color) c.color.lerp(new THREE.Color(0xcdbfa8), 0.45); c.roughness = 0.8; });
  return {
    wings, belly,
    // flap: 0 = angelegt … 1 = voller Schlag · glow: gespeichertes Licht 0 … 1
    update(dt, ctx, { flap = 1, rate = 11, glow = 0 } = {}) {
      flapT += dt * rate;
      const sp = boneLocal(m, 'spine_03', _a);
      wings.position.copy(sp).add(_b.set(0, 0.02, -0.12));
      wings.rotation.set(-0.15, 0, 0);
      for (const side of sides) {
        const s = side.userData.s;
        const a = flap > 0.05 ? 0.25 + Math.sin(flapT + s * 0.2) * 0.75 * flap : 1.25;   // angelegt: steil nach oben
        side.rotation.set(0, s * (flap > 0.05 ? -0.5 : -1.1), s * a);
        side.userData.hind.rotation.z = s * Math.sin(flapT - 0.6) * 0.15 * flap;
      }
      wingMat.emissiveIntensity = 0.04 + glow * 0.75;
      const ch = boneLocal(m, 'spine_02', _c);
      belly.position.copy(ch).add(_b.set(0, 0, 0.08));
      belly.scale.setScalar(0.12 + glow * 0.26);
      belly.material.opacity = 0.15 + glow * 0.5;
      // Staub
      if (ctx.near && flap > 0.2 && Math.random() < dt * (6 + glow * 20)) {
        wings.getWorldPosition(_a);
        dp[di * 3] = _a.x + (Math.random() - 0.5) * 1.6; dp[di * 3 + 1] = _a.y + (Math.random() - 0.5) * 0.6; dp[di * 3 + 2] = _a.z + (Math.random() - 0.5) * 1.6;
        dv[di * 3] = (Math.random() - 0.5) * 0.2; dv[di * 3 + 1] = -0.15 - Math.random() * 0.2; dv[di * 3 + 2] = (Math.random() - 0.5) * 0.2;
        life[di] = 2.2;
        di = (di + 1) % N;
      }
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) { dp[i * 3 + 1] = -99; continue; }
        life[i] -= dt;
        dp[i * 3] += dv[i * 3] * dt; dp[i * 3 + 1] += dv[i * 3 + 1] * dt; dp[i * 3 + 2] += dv[i * 3 + 2] * dt;
      }
      dust.geometry.attributes.position.needsUpdate = true;
    },
    dispose() { dust.removeFromParent(); dust.geometry.dispose(); dust.material.dispose(); wingMat.dispose(); belly.material.dispose(); },
  };
}

// ============================================================================ Der Zöllner

function dressZoellner(m) {
  const brass = mat('brass'), dark = mat('brassDark');
  // Waage: Aufhängung, Balken, Ketten, Schalen
  const scale = new THREE.Group();
  const hanger = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), brass); hanger.position.y = -0.11;
  const beam = new THREE.Group(); beam.position.y = -0.22;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.018, 0.018), brass);
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.12, 0.006), dark); needle.position.y = 0.06;
  beam.add(bar, needle);
  const pans = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group(); pivot.position.x = s * 0.27;
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.26, 4), dark); chain.position.y = -0.13;
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.08, 0.025, 14), brass); pan.position.y = -0.27;
    pivot.add(chain, pan);
    beam.add(pivot);
    pans.push({ pivot, pan });
  }
  scale.add(hanger, beam);
  // Stempel: Holzgriff, Messinghals, Gummiplatte mit roter Tinte
  const stamp = new THREE.Group();
  const grip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat('walnut')); grip.position.y = 0.09; grip.scale.y = 1.2;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.1, 8), brass); neck.position.y = 0.03;
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.035, 0.08), dark); block.position.y = -0.03;
  const ink = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.006, 0.07), glowMat(0x8a1010, 0.6, 'stampInk')); ink.position.y = -0.05;
  stamp.add(grip, neck, block, ink);
  // Zehnttrichter vor dem Gesicht
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.13, 0.26, 16, 1, true), brass);
  funnel.material = brass;
  funnel.rotation.x = Math.PI / 2;
  const funnelIn = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.12, 0.25, 16, 1, true), mat('rubber'));
  funnelIn.rotation.x = Math.PI / 2; funnelIn.material.side = THREE.BackSide;
  const mask = new THREE.Group(); mask.add(funnel);
  // Zollbuch an der Kette (Hüfte)
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.26, 0.06), mat('leather'));
  const bookClasp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.065), brass);
  const ledger = new THREE.Group(); ledger.add(book, bookClasp);
  // Glöckchen am Gürtel
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.06, 10, 1, true), brass);
  bell.material = brass;
  for (const o of [hanger, bar, needle, grip, neck, block, funnel, book]) o.castShadow = true;
  m.root.add(scale, stamp, mask, ledger, bell);
  // Kutte: fast schwarz, Messingknöpfe bleiben
  remapMaterials(m.ch.model, (c, o) => {
    const skin = /^(base|body|eye|teeth|tongue)/i.test(o.name);
    if (c.color) { if (skin) c.color.lerp(new THREE.Color(0x9a948a), 0.6); else c.color.setRGB(0.07, 0.06, 0.055); }
    c.roughness = skin ? 0.7 : 0.92;
  });
  let tilt = 0, tiltV = 0, sway = 0, lastYaw = m.yaw;
  return {
    scale, stamp, pans,
    // offer: Waage vorgestreckt (Forderung) · load: Gewicht auf der rechten Schale (−1 … 1)
    update(dt, ctx, { offer = 0, load = 0, stampUp = 0 } = {}) {
      const hl = boneLocal(m, 'hand_l', _a);
      scale.position.copy(hl);
      scale.position.z += offer * 0.18;
      scale.position.y += offer * 0.12;
      // Pendel: Drehung und Gehen bringen die Schalen ins Schwingen
      const dy = m.yaw - lastYaw; lastYaw = m.yaw;
      tiltV += (-tilt * 18 - tiltV * 2.2 + dy * 60 + (m.moving ? Math.sin(ctx.time * 7) * 1.5 : 0) + load * 8) * dt;
      tilt += tiltV * dt;
      tilt = Math.max(-0.45, Math.min(0.45, tilt));
      beam.rotation.z = tilt;
      for (const p of pans) p.pivot.rotation.z = -tilt;
      sway += dt;
      const hr = boneLocal(m, 'hand_r', _b);
      stamp.position.copy(hr);
      stamp.position.y += 0.02 + stampUp * 0.25;
      stamp.rotation.set(stampUp * -0.5, 0, 0);
      const hd = boneLocal(m, 'head', _c);
      mask.position.copy(hd).add(_a.set(0, 0.02, 0.2));
      mask.rotation.set(0.25, 0, 0);
      const pv = boneLocal(m, 'pelvis', _a);
      ledger.position.copy(pv).add(_b.set(0.22, -0.18, 0.02));
      ledger.rotation.set(Math.sin(sway * 3) * 0.08 * (m.moving ? 1 : 0.2), 0, 0.1);
      bell.position.copy(pv).add(_b.set(-0.18, -0.1, 0.1));
      bell.rotation.z = Math.sin(sway * 6) * 0.3 * (m.moving ? 1 : 0.1);
    },
    // Ablage auf der rechten Schale (Weltposition)
    panWorld(out) { return pans[1].pan.getWorldPosition(out); },
    dispose() { /* Geometrien sind klein; Materialien geteilt */ },
  };
}

// ============================================================================ Die Vorgänger

// Echo-Material: entsättigt, kaltes Leuchten, leicht durchscheinend. setFade(0 … 1) = verblassen
function dressVorgaenger(m, { crew } = {}) {
  const mats = remapMaterials(m.ch.model, (c) => {
    if (c.color) { const l = c.color.r * 0.3 + c.color.g * 0.59 + c.color.b * 0.11; c.color.setRGB(l * 0.7, l * 0.8, l * 0.95); }
    c.emissive = new THREE.Color(0x4a6a90); c.emissiveIntensity = 0.16;
    c.transparent = true; c.opacity = 0.9; c.depthWrite = true;
  });
  // Handlampe mit kaltem Licht und sichtbarem Kegel
  const lamp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.16, 10), mat('brassDark'));
  body.rotation.x = Math.PI / 2;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.03, 12), glowMat(0xcfe4ff, 2.2, 'echoLens'));
  lens.position.z = 0.081;
  const glow = glowSprite(0xa8ccff, 0.3, 0.8);
  glow.position.z = 0.1;
  const beam = makeBeam(7, 1.3, 0.05, 0x9ec4ff);
  beam.rotation.y = Math.PI;   // Spitze an der Lampe, Kegel nach vorn (+Z der Figur)
  lamp.add(body, lens, glow, beam);
  m.root.add(lamp);
  // Nummer auf dem Rücken
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), new THREE.MeshStandardMaterial({ map: numberPlateTexture(crew?.n ?? '?'), transparent: true, opacity: 0.85, roughness: 0.9, emissive: 0x303848, emissiveIntensity: 0.3 }));
  plate.rotation.y = Math.PI;
  m.root.add(plate);
  mats.push(plate.material);
  let fade = 1;
  return {
    lamp, beam,
    setFade(k) { fade = k; for (const c of mats) c.opacity = 0.9 * k; beam.material.uniforms.strength.value = 0.05 * k; glow.material.opacity = 0.8 * k; },
    get fade() { return fade; },
    update(dt, ctx, { aim = 0, sweep = 0 } = {}) {
      const hr = boneLocal(m, 'hand_r', _a);
      lamp.position.copy(hr).add(_b.set(0, 0.04, 0.08));
      lamp.rotation.set(0.25 + aim, sweep, 0);
      const sp = boneLocal(m, 'spine_03', _c);
      plate.position.copy(sp).add(_b.set(0, 0, -0.17));
    },
    lampWorld(out) { return lens.getWorldPosition(out); },
    dispose() { for (const c of mats) c.dispose?.(); beam.geometry.dispose(); beam.material.dispose(); glow.material.dispose(); },
  };
}

// ============================================================================ Die Ertrunkenen

function dressErtrunkene(m) {
  remapMaterials(m.ch.model, (c) => {
    if (c.color) c.color.lerp(new THREE.Color(0x8ea1a6), 0.7);
    c.roughness = 0.28; c.metalness = 0.05;
    c.emissive = new THREE.Color(0x0e1a1e); c.emissiveIntensity = 0.5;
  });
  // Nasses Haar: lange dunkle Strähnen, die im Wasser treiben
  const hair = new THREE.Group();
  const hm = new THREE.MeshStandardMaterial({ color: 0x0b0d0d, roughness: 0.35, side: THREE.DoubleSide });
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    const g = new THREE.PlaneGeometry(0.05, 0.7, 1, 4);
    g.translate(0, -0.35, 0);
    const s = new THREE.Mesh(g, hm);
    s.position.set(Math.cos(a) * 0.08, 0.05, Math.sin(a) * 0.08);
    s.rotation.set(0, -a, 0);
    s.userData.a = a;
    hair.add(s);
  }
  m.root.add(hair);
  let t = Math.random() * 10;
  return {
    hair,
    update(dt, ctx, { float = 0 } = {}) {
      t += dt;
      const hd = boneLocal(m, 'head', _a);
      hair.position.copy(hd).add(_b.set(0, 0.08, -0.02));
      for (const s of hair.children) {
        const a = s.userData.a;
        s.rotation.x = Math.sin(t * 0.9 + a) * 0.25 * (0.4 + float) + float * 0.9 * Math.cos(a);
        s.rotation.z = Math.cos(t * 0.7 + a) * 0.25 * (0.4 + float) + float * 0.9 * Math.sin(a);
      }
    },
    dispose() { hm.dispose(); },
  };
}

// ============================================================================ Der Nachsprecher

function dressNachsprecher(m) {
  // Lampe wie die eigene: warm, mit Kegel – von weitem ein Mensch der Mannschaft
  const lamp = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.15, 10), mat('brassDark'));
  body.rotation.x = Math.PI / 2;
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.028, 12), glowMat(0xfff0d6, 2, 'mimicLens'));
  lens.position.z = 0.076;
  const glow = glowSprite(0xffe2b0, 0.28, 0.8);
  glow.position.z = 0.09;
  const beam = makeBeam(8, 1.6, 0.07, 0xfff0d0);
  beam.rotation.y = Math.PI;
  lamp.add(body, lens, glow, beam);
  m.root.add(lamp);
  // Maul: schwarze Öffnung mit Zahnkranz – erst beim Zeigen sichtbar
  const mouth = new THREE.Group();
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.1, 20), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  mouth.add(hole);
  const toothM = mat('bone');
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const tth = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 4), toothM);
    tth.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.005);
    tth.rotation.z = a + Math.PI / 2;
    mouth.add(tth);
  }
  mouth.visible = false;
  m.root.add(mouth);
  let lampOn = 1;
  return {
    lamp, beam, mouth,
    setLamp(k) { lampOn = k; lamp.visible = k > 0.02; beam.material.uniforms.strength.value = 0.07 * k; glow.material.opacity = 0.8 * k; },
    update(dt, ctx, { open = 0, faceBack = false } = {}) {
      const hr = boneLocal(m, 'hand_r', _a);
      lamp.position.copy(hr).add(_b.set(0, 0.03, 0.06));
      lamp.rotation.set(0.35, 0, 0);
      mouth.visible = open > 0.02;
      if (mouth.visible) {
        const hd = boneLocal(m, 'head', _c);
        const zf = faceBack ? -0.12 : 0.12;
        mouth.position.copy(hd).add(_b.set(0, -0.02, zf));
        mouth.rotation.set(0, faceBack ? Math.PI : 0, 0);
        mouth.scale.set(0.6 + open * 0.8, 0.3 + open * 1.9, 1);
      }
    },
    lampWorld(out) { return lens.getWorldPosition(out); },
    dispose() { beam.geometry.dispose(); beam.material.dispose(); glow.material.dispose(); hole.material.dispose(); },
  };
}

// ============================================================================ Der Portier

function dressPortier(m) {
  // Kopf verschwindet – an seiner Stelle ein Zifferblatt aus Messing
  const head = m.ch.model.getObjectByName('head');
  if (head) head.scale.setScalar(0.02);
  const dial = new THREE.Group();
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.28, 40, 0, Math.PI), new THREE.MeshStandardMaterial({ map: portierDialTexture(), roughness: 0.45, metalness: 0.2, emissive: 0xffc070, emissiveMap: portierDialTexture(), emissiveIntensity: 0.18 }));
  const backM = mat('brassDark');
  const back = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.06, 32, 1, false, -Math.PI / 2, Math.PI), backM);
  back.rotation.x = Math.PI / 2; back.position.z = -0.032;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.285, 0.018, 6, 32, Math.PI), mat('brass'));
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.035, 0.08), mat('brass')); base.position.set(0, -0.005, -0.02);
  const needleP = new THREE.Group(); needleP.position.z = 0.012;
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.24, 0.006), glowMat(0xff5530, 2.4, 'portierNeedle'));
  needle.position.y = 0.12;
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12), mat('brass')); hub.rotation.x = Math.PI / 2;
  needleP.add(needle, hub);
  dial.add(face, back, rim, base, needleP);
  // Portiersmütze auf dem Blatt
  const cap = new THREE.Group();
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.14, 0.12, 18), mat('fabricRed')); crown.position.y = 0.06;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.15, 0.02, 18), mat('fabricRed')); top.position.y = 0.125;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.152, 0.152, 0.03, 18), mat('brass')); band.position.y = 0.025;
  const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.012, 18, 1, false, -Math.PI / 2, Math.PI), mat('leather')); visor.position.set(0, 0.008, 0.06); visor.scale.z = 0.8;
  cap.add(crown, top, band, visor);
  cap.position.y = 0.29;
  dial.add(cap);
  // Weiße Handschuhe
  const gloveM = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.85 });
  const gloves = [new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), gloveM), new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), gloveM)];
  for (const gl of gloves) gl.scale.set(1, 1.35, 0.7);
  // Langer Mantel: Schoß vom Becken bis unters Knie, schwingt nach
  const coatM = new THREE.MeshStandardMaterial({ color: 0x1a1512, roughness: 0.95, side: THREE.DoubleSide });
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.34, 0.75, 16, 1, true), coatM);
  for (const o of [face, back, rim, crown, skirt, ...gloves]) o.castShadow = true;
  m.root.add(dial, skirt, ...gloves);
  remapMaterials(m.ch.model, (c) => { if (c.color) c.color.multiplyScalar(0.55); });
  let needleA = 0, skirtV = 0, skirtA = 0;
  return {
    dial, needle: needleP,
    // look: Weltpunkt, auf den die Nadel zeigt · spin: Nadel dreht durch (Treffer, Spieluhr)
    update(dt, ctx, { look = null, spin = 0, still = false } = {}) {
      // eingebettete Clips setzen auch die Skalierung – der Kopf muss jedes Bild wieder verschwinden
      if (head) head.scale.setScalar(0.02);
      const nk = boneLocal(m, 'neck_01', _a);
      dial.position.copy(nk).add(_b.set(0, 0.14, 0.02));
      dial.rotation.set(0.05, 0, 0);
      // Nadel: Richtung des Ziels relativ zur Blickrichtung (−90° … +90°)
      let target = 0;
      if (look) {
        const a = Math.atan2(look.x - m.pos.x, look.z - m.pos.z) - m.yaw;
        const w = Math.atan2(Math.sin(a), Math.cos(a));
        target = Math.max(-1.45, Math.min(1.45, -w));
      }
      if (spin) needleA += dt * spin;
      else if (!still) needleA += (target - needleA) * (1 - Math.exp(-dt * 6));
      needleP.rotation.z = needleA + (still ? 0 : Math.sin(ctx.time * 30) * 0.004);
      const hl = boneLocal(m, 'hand_l', _a), hr = boneLocal(m, 'hand_r', _c);
      gloves[0].position.copy(hl); gloves[1].position.copy(hr);
      const pv = boneLocal(m, 'pelvis', _a);
      skirt.position.copy(pv).add(_b.set(0, -0.33, 0));
      skirtV += (-(skirtA) * 25 - skirtV * 4 + (m.moving ? Math.sin(ctx.time * 5) * 3 : 0)) * dt;
      skirtA += skirtV * dt;
      skirt.rotation.set(skirtA * 0.15, 0, skirtA * 0.05);
    },
    dispose() { gloveM.dispose(); coatM.dispose(); },
  };
}

// ============================================================================ Segnung: Hochkantor & Büttel

// Weißes Gewand (Erwählte, Büttel, Hochkantor)
export function whiteRobes(root, { glow = 0.06, tint = 0xf1ece0 } = {}) {
  return remapMaterials(root, (c) => {
    if (c.color) { const l = c.color.r * 0.3 + c.color.g * 0.59 + c.color.b * 0.11; c.color.set(tint).multiplyScalar(0.55 + l * 0.6); }
    c.map = null; c.roughness = 0.9; c.metalness = 0;
    c.emissive = new THREE.Color(0xfff4e0); c.emissiveIntensity = glow;
    c.needsUpdate = true;
  });
}

function dressHochkantor(m) {
  whiteRobes(m.ch.model, { glow: 0.12 });
  // Maske: goldene Scheibe mit Zifferblatt, dahinter nichts
  const mask = new THREE.Group();
  const c = mkCanvas(256, 256), g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128); gr.addColorStop(0, '#f5d890'); gr.addColorStop(1, '#8a6420');
  g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 126, 0, Math.PI * 2); g.fill();
  drawDialSymbol(g, 128, 170, 80, '#3a2408', -0.3, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.17, 32), new THREE.MeshStandardMaterial({ map: t, metalness: 0.7, roughness: 0.3, emissive: 0xffc060, emissiveMap: t, emissiveIntensity: 0.35 }));
  mask.add(disc);
  // Mitra
  const mitre = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 4), new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.8, emissive: 0xfff0d0, emissiveIntensity: 0.1 }));
  mitre.rotation.y = Math.PI / 4; mitre.scale.z = 0.55;
  const mband = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 4), mat('gold')); mband.rotation.y = Math.PI / 4; mband.scale.z = 0.55;
  // Sprechtrichter
  const horn = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.2, 0.6, 20, 1, true), mat('brass'));
  horn.material = mat('brass');
  m.root.add(mask, mitre, mband, horn);
  return {
    update(dt, ctx, { speak = 0 } = {}) {
      const hd = boneLocal(m, 'head', _a);
      mask.position.copy(hd).add(_b.set(0, 0.02, 0.14));
      mitre.position.copy(hd).add(_b.set(0, 0.36, 0));
      mband.position.copy(hd).add(_b.set(0, 0.12, 0));
      const hr = boneLocal(m, 'hand_r', _c);
      horn.position.copy(hd).lerp(hr, 0.3).add(_b.set(0, -0.02, 0.2 + 0.25));
      horn.rotation.set(Math.PI / 2 - 0.15 - speak * 0.1, 0, 0);
    },
    dispose() { t.dispose(); },
  };
}

function dressBuettel(m) {
  whiteRobes(m.ch.model, { glow: 0.05, tint: 0xe9e3d4 });
  // Gesichtstuch
  const veil = new THREE.Mesh(new THREE.CircleGeometry(0.12, 20), new THREE.MeshStandardMaterial({ color: 0xf6f2e8, roughness: 1, emissive: 0xfff4e0, emissiveIntensity: 0.1 }));
  veil.scale.y = 1.3;
  // Weihrauchfass an drei Ketten, Rauch
  const censer = new THREE.Group();
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('brass'));
  const lid = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.09, 12), mat('brass')); lid.position.y = 0.045;
  const ember = glowSprite(0xff8a40, 0.12, 0.9); ember.position.y = 0.03;
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.5, 4), mat('brassDark')); chain.position.y = 0.3;
  censer.add(bowl, lid, ember, chain);
  m.root.add(veil, censer);
  const N = 40;
  const smoke = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ map: glowTexture(), color: 0xb8b0a8, size: 0.22, transparent: true, opacity: 0.18, depthWrite: false }));
  const sp = new Float32Array(N * 3), life = new Float32Array(N);
  smoke.geometry.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  smoke.frustumCulled = false;
  m.d.R.scene.add(smoke);
  let si = 0, t = Math.random() * 5;
  return {
    update(dt, ctx, { swing = 1 } = {}) {
      t += dt;
      const hd = boneLocal(m, 'head', _a);
      veil.position.copy(hd).add(_b.set(0, -0.01, 0.12));
      const hr = boneLocal(m, 'hand_r', _c);
      censer.position.copy(hr).add(_b.set(0, -0.5 + Math.cos(t * 2.6) * 0.04 * swing, Math.sin(t * 2.6) * 0.3 * swing));
      censer.rotation.x = -Math.sin(t * 2.6) * 0.5 * swing;
      if (Math.random() < dt * 14) {
        censer.getWorldPosition(_a);
        sp[si * 3] = _a.x; sp[si * 3 + 1] = _a.y + 0.08; sp[si * 3 + 2] = _a.z; life[si] = 3;
        si = (si + 1) % N;
      }
      for (let i = 0; i < N; i++) {
        if (life[i] <= 0) { sp[i * 3 + 1] = -99; continue; }
        life[i] -= dt;
        sp[i * 3 + 1] += dt * 0.35; sp[i * 3] += Math.sin(t + i) * dt * 0.08;
      }
      smoke.geometry.attributes.position.needsUpdate = true;
    },
    dispose() { smoke.removeFromParent(); smoke.geometry.dispose(); smoke.material.dispose(); },
  };
}

// ============================================================================ Verteiler

const DRESS = {
  falterin: dressFalterin, zoellner: dressZoellner, vorgaenger: dressVorgaenger, ertrunkene: dressErtrunkene,
  nachsprecher: dressNachsprecher, portier: dressPortier, hochkantor: dressHochkantor, buettel: dressBuettel,
};

// Ausstattung anlegen. standin=false (echtes Modell): nur die Teile, die laut MODELLE.md bleiben sollen.
export function dress(kind, m, opts = {}) {
  const fn = DRESS[kind];
  if (!fn) return { update() {}, dispose() {} };
  return fn(m, opts);
}
