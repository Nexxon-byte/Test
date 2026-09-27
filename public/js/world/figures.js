// Menschliche Figuren (Händler, Stumme, Mitspieler) – stilisiert, niedrig aufgelöst.
// Aufbau mit Gelenken, damit Posen und einfache Animationen möglich sind:
// root → hips → torso → (head, armL, armR) · hips → (legL, legR)

import * as THREE from 'three';
import { boxGeometry, cylGeometry, sphereGeometry, coneGeometry } from '../gfx/geo.js';
import { mat, glowMat } from '../gfx/materials.js';
import { textTexture } from '../gfx/textures.js';

const faceCache = new Map();

// Gesicht als kleine Textur (Augen, Brauen, Mund, Schatten)
function faceTexture({ skin = '#b89478', age = 0.3, beard = false, eyes = 'open', goggles = false, mask = false, scar = false } = {}) {
  const key = JSON.stringify(arguments[0] || {});
  if (faceCache.has(key)) return faceCache.get(key);
  const t = textTexture(64, 64, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    if (mask) {
      g.fillStyle = '#d8c9a0'; g.beginPath(); g.ellipse(32, 30, 20, 26, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#1a120a'; g.fillRect(20, 24, 8, 4); g.fillRect(36, 24, 8, 4);
      g.strokeStyle = '#8a7040'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(26, 44); g.lineTo(38, 44); g.stroke();
      return;
    }
    // Schatten der Augenhöhlen
    g.fillStyle = 'rgba(40,20,10,0.35)';
    g.beginPath(); g.ellipse(24, 27, 7, 5, 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(40, 27, 7, 5, 0, 0, Math.PI * 2); g.fill();
    if (goggles) {
      g.fillStyle = '#2a1a0a'; g.fillRect(12, 22, 40, 10);
      g.fillStyle = '#6ac0a0'; g.beginPath(); g.arc(24, 27, 5, 0, 7); g.arc(40, 27, 5, 0, 7); g.fill();
    } else {
      g.fillStyle = eyes === 'closed' ? '#3a2014' : '#f0e6d0';
      if (eyes === 'closed') { g.fillRect(19, 27, 10, 1.5); g.fillRect(35, 27, 10, 1.5); }
      else {
        g.fillRect(20, 26, 8, 3); g.fillRect(36, 26, 8, 3);
        g.fillStyle = '#1a0e08'; g.fillRect(23, 26, 3, 3); g.fillRect(39, 26, 3, 3);
      }
      g.fillStyle = '#3a2418'; g.fillRect(19, 22, 10, 2); g.fillRect(35, 22, 10, 2);
    }
    // Nase, Mund
    g.fillStyle = 'rgba(60,30,15,0.4)'; g.fillRect(31, 30, 2, 8);
    g.fillStyle = '#5a2a20'; g.fillRect(26, 44, 12, 2);
    // Falten
    if (age > 0.5) { g.fillStyle = 'rgba(50,25,12,0.35)'; g.fillRect(16, 34, 6, 1); g.fillRect(42, 34, 6, 1); g.fillRect(24, 18, 16, 1); }
    if (beard) { g.fillStyle = 'rgba(70,60,55,0.85)'; g.beginPath(); g.moveTo(16, 38); g.quadraticCurveTo(32, 62, 48, 38); g.lineTo(44, 50); g.quadraticCurveTo(32, 58, 20, 50); g.fill(); g.fillRect(24, 40, 16, 3); }
    if (scar) { g.strokeStyle = '#7a3028'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(42, 18); g.lineTo(46, 38); g.stroke(); }
  }, { srgb: true });
  faceCache.set(key, t);
  return t;
}

function mesh(geo, m, parent, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(geo, typeof m === 'string' ? mat(m) : m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}

// opts: coat (Material), robe (lang), hat: 'cap'|'hood'|'kantor'|'cowl'|null, brassHand, apron, skin,
//       face (faceTexture-Optionen), height, bulk, egg (Fahrgast-Kopf), lantern
export function buildFigure(opts = {}) {
  const o = { coat: 'robe', skin: '#b89478', height: 1.74, bulk: 1, ...opts };
  const s = o.height / 1.74;
  const root = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.92 * s; root.add(hips);
  const torso = new THREE.Group(); hips.add(torso);
  const coatM = typeof o.coat === 'string' ? mat(o.coat) : o.coat;
  const skinM = new THREE.MeshStandardMaterial({ color: o.skin, roughness: 0.85 });

  // Rumpf (Mantel)
  mesh(boxGeometry(0.42 * o.bulk, 0.62 * s, 0.24 * o.bulk), coatM, torso, 0, 0.33 * s, 0);
  mesh(boxGeometry(0.46 * o.bulk, 0.12 * s, 0.27 * o.bulk), coatM, torso, 0, 0.6 * s, 0);    // Schultern
  if (o.robe) {
    mesh(coneGeometry(0.36 * o.bulk, 0.95 * s, 10), coatM, hips, 0, -0.44 * s, 0);          // langer Rock
  } else {
    mesh(boxGeometry(0.4 * o.bulk, 0.3 * s, 0.25 * o.bulk), coatM, hips, 0, -0.08 * s, 0); // Mantelschoß
  }
  if (o.apron) mesh(boxGeometry(0.34, 0.7 * s, 0.02), 'rubber', torso, 0, 0.1 * s, 0.135 * o.bulk);

  // Kopf
  const head = new THREE.Group(); head.position.y = 0.78 * s; torso.add(head);
  mesh(cylGeometry(0.05, 0.06, 0.1, 8), skinM, head, 0, -0.05, 0);
  if (o.egg) {
    mesh(sphereGeometry(0.13, 12, 10), 'fahrgastHead', head, 0, 0.13, 0).scale.set(0.95, 1.32, 1.05);
  } else {
    const h = mesh(sphereGeometry(0.11, 12, 10), skinM, head, 0, 0.12, 0);
    h.scale.set(0.95, 1.15, 1.05);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.2), new THREE.MeshStandardMaterial({ map: faceTexture({ skin: o.skin, ...(o.face || {}) }), transparent: true, alphaTest: 0.05, roughness: 0.9 }));
    face.position.set(0, 0.125, 0.108);
    head.add(face);
    switch (o.hat) {
      case 'cap': mesh(cylGeometry(0.12, 0.12, 0.07, 12), 'fabricBlack', head, 0, 0.23, 0); mesh(boxGeometry(0.2, 0.015, 0.1), 'fabricBlack', head, 0, 0.2, 0.1); break;
      case 'hood': mesh(sphereGeometry(0.14, 10, 8), coatM, head, 0, 0.14, -0.02).scale.set(1, 1.2, 1.05); break;
      case 'kantor': mesh(cylGeometry(0.09, 0.12, 0.26, 10), 'fabricRed', head, 0, 0.3, 0); mesh(boxGeometry(0.02, 0.24, 0.005), 'gold', head, 0, 0.3, 0.11); break;
      case 'cowl': mesh(cylGeometry(0.13, 0.2, 0.2, 10, true), coatM, head, 0, 0.05, 0); break;
      case 'goggles': mesh(boxGeometry(0.24, 0.05, 0.02), 'brassDark', head, 0, 0.21, 0.08); break;
    }
    if (o.hair) mesh(sphereGeometry(0.115, 10, 8), o.hair, head, 0, 0.16, -0.015).scale.set(1, 0.8, 1.05);
  }

  // Arme (Pivot an der Schulter)
  const arm = (side) => {
    const p = new THREE.Group(); p.position.set(side * 0.27 * o.bulk, 0.6 * s, 0); torso.add(p);
    mesh(cylGeometry(0.055, 0.05, 0.34 * s, 8), coatM, p, 0, -0.17 * s, 0);
    const fore = new THREE.Group(); fore.position.y = -0.34 * s; p.add(fore);
    mesh(cylGeometry(0.05, 0.045, 0.3 * s, 8), coatM, fore, 0, -0.15 * s, 0);
    const handM = (o.brassHand && side > 0) ? 'brass' : skinM;
    mesh(boxGeometry(0.07, 0.1, 0.04), handM, fore, 0, -0.34 * s, 0);
    p.userData.fore = fore;
    return p;
  };
  const armL = arm(-1), armR = arm(1);

  // Beine (Pivot an der Hüfte)
  const leg = (side) => {
    const p = new THREE.Group(); p.position.set(side * 0.1, -0.02, 0); hips.add(p);
    if (!o.robe) mesh(cylGeometry(0.07, 0.06, 0.46 * s, 8), 'fabricBlack', p, 0, -0.23 * s, 0);
    const shin = new THREE.Group(); shin.position.y = -0.46 * s; p.add(shin);
    if (!o.robe) mesh(cylGeometry(0.06, 0.055, 0.42 * s, 8), 'fabricBlack', shin, 0, -0.21 * s, 0);
    mesh(boxGeometry(0.1, 0.07, 0.24), 'rubber', shin, 0, -0.43 * s, 0.04);
    p.userData.shin = shin;
    return p;
  };
  const legL = leg(-1), legR = leg(1);

  if (o.lantern) {
    const lamp = new THREE.Group();
    mesh(boxGeometry(0.1, 0.16, 0.1), 'brassDark', lamp, 0, 0, 0);
    const glow = mesh(boxGeometry(0.07, 0.1, 0.07), glowMat(0xffb060, 2.5, 'figLantern'), lamp, 0, 0, 0);
    glow.castShadow = false;
    lamp.position.set(0, -0.42 * s, 0.05);
    armR.userData.fore.add(lamp);
  }

  const fig = { root, hips, torso, head, armL, armR, legL, legR, height: o.height, t: Math.random() * 10 };
  root.userData.figure = fig;
  return fig;
}

// Posen (Winkel in Radiant)
export function pose(fig, name) {
  const { hips, torso, head, armL, armR, legL, legR } = fig;
  const reset = () => {
    for (const g of [torso, head, armL, armR, legL, legR]) g.rotation.set(0, 0, 0);
    armL.userData.fore.rotation.set(0, 0, 0); armR.userData.fore.rotation.set(0, 0, 0);
    legL.userData.shin.rotation.set(0, 0, 0); legR.userData.shin.rotation.set(0, 0, 0);
    hips.position.y = 0.92 * fig.height / 1.74;
  };
  reset();
  switch (name) {
    case 'counter':   // stützt sich auf eine Theke
      torso.rotation.x = 0.18; armL.rotation.x = -0.9; armR.rotation.x = -0.9;
      armL.userData.fore.rotation.x = -0.5; armR.userData.fore.rotation.x = -0.5; break;
    case 'sit':       // sitzt am Boden, an die Wand gelehnt
      hips.position.y = 0.22; legL.rotation.x = -1.4; legR.rotation.x = -1.3;
      legL.userData.shin.rotation.x = 1.3; legR.userData.shin.rotation.x = 1.0;
      torso.rotation.x = -0.12; head.rotation.x = 0.35; armL.rotation.x = -0.4; armR.rotation.x = -0.3; break;
    case 'crouch':
      hips.position.y = 0.5; legL.rotation.x = -1.2; legR.rotation.x = -0.7;
      legL.userData.shin.rotation.x = 1.8; legR.userData.shin.rotation.x = 1.4; torso.rotation.x = 0.4; break;
    case 'pray':
      head.rotation.x = 0.45; armL.rotation.set(-0.8, 0, 0.35); armR.rotation.set(-0.8, 0, -0.35);
      armL.userData.fore.rotation.x = -1.2; armR.userData.fore.rotation.x = -1.2; break;
    case 'work':      // beugt sich über eine Werkbank
      torso.rotation.x = 0.55; head.rotation.x = 0.2; armR.rotation.x = -1.2; armL.rotation.x = -0.8;
      armR.userData.fore.rotation.x = -0.4; break;
    case 'wait':
      armL.rotation.z = 0.08; armR.rotation.z = -0.08; head.rotation.x = 0.1; break;
  }
}

// Leichtes Atmen/Wippen für stehende Figuren
export function idle(fig, dt, amount = 1) {
  fig.t += dt;
  fig.torso.position.y = Math.sin(fig.t * 1.6) * 0.004 * amount;
  fig.head.rotation.y = Math.sin(fig.t * 0.37) * 0.12 * amount;
}

// Gehen (Phase in Radiant); für Mitspieler & Monster
export function walk(fig, phase, amount = 1) {
  const a = Math.sin(phase) * 0.55 * amount;
  fig.legL.rotation.x = a; fig.legR.rotation.x = -a;
  fig.legL.userData.shin.rotation.x = Math.max(0, -Math.sin(phase + 0.6)) * 0.8 * amount;
  fig.legR.userData.shin.rotation.x = Math.max(0, Math.sin(phase + 0.6)) * 0.8 * amount;
  fig.armL.rotation.x = -a * 0.7; fig.armR.rotation.x = a * 0.7;
  fig.hips.position.y = 0.92 * fig.height / 1.74 + Math.abs(Math.cos(phase)) * 0.03 * amount;
}
