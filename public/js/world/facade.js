// Häuserzeilen aus Poly-Haven-Baukästen (CC0): modular_urban_apartments_facade, modular_factory_facade.
// Der Baukasten liegt als „Schaukasten“ vor (Module nebeneinander). facadeKit() zerlegt ihn:
//   Modul  = Wandteil (wall_*) + alle Einsätze (door_*, window_*), die in seinem Rahmen liegen
//   Leiste = cornice_* / crown_* / base_* / *_pier_* (einzeln platziert)
// buildRow() setzt daraus eine Zeile zusammen (instanziert, ein Draw-Call je Teil/Material).

import * as THREE from 'three';
import { modelInfo } from '../gfx/models.js';

const kits = new Map();
const PIECE = /^(wall|door|window|cornice|crown|base|dado)_/;

// ---------------------------------------------------------------- Baukasten zerlegen
export function facadeKit(id) {
  if (kits.has(id)) return kits.get(id);
  const info = modelInfo(id);
  if (!info) return null;
  const root = info.scene;
  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (o.isMesh && /glass/i.test(o.material?.name || '')) Object.assign(o.material, { transparent: true, opacity: 0.3, depthWrite: false, roughness: 0.06, metalness: 0 });
  });
  const pieces = new Map();   // name → { meshes: [], box }
  root.traverse((o) => {
    if (!o.isMesh) return;
    let p = o;
    while (p && !PIECE.test(p.name || '')) p = p.parent;
    if (!p) return;
    const e = pieces.get(p.name) || { meshes: [], box: new THREE.Box3() };
    e.meshes.push(o);
    e.box.expandByObject(o);
    pieces.set(p.name, e);
  });
  const inv = new THREE.Matrix4();
  // Teile relativ zu einem Ursprung (links unten, Vorderebene) ablegen
  const partsFrom = (meshes, origin) => meshes.map((o) => ({
    geometry: o.geometry, material: o.material,
    matrix: inv.clone().makeTranslation(-origin.x, -origin.y, -origin.z).multiply(o.matrixWorld),
  }));
  const modules = new Map(), strips = new Map();
  const inserts = [...pieces].filter(([n]) => /^(door|window)_/.test(n));
  for (const [name, e] of pieces) {
    const b = e.box, size = b.getSize(new THREE.Vector3());
    if (name.startsWith('wall_') && !/corner|angled/.test(name)) {
      const origin = new THREE.Vector3(b.min.x, b.min.y, b.max.z);
      const meshes = [...e.meshes];
      const holes = [];
      const taken = [];
      const cand = inserts.filter(([, ie]) => { const c = ie.box.getCenter(new THREE.Vector3()); return c.x > b.min.x && c.x < b.max.x && c.y > b.min.y && c.y < b.max.y && Math.abs(c.z - b.max.z) < 0.8; })
        .sort((p, q) => q[1].box.getSize(new THREE.Vector3()).lengthSq() - p[1].box.getSize(new THREE.Vector3()).lengthSq());
      for (const [, ie] of cand) {
        const c = ie.box.getCenter(new THREE.Vector3());
        if (taken.some(t => t.containsPoint(c))) continue;
        taken.push(ie.box);
        {
          meshes.push(...ie.meshes);
          holes.push({ x: ie.box.min.x - origin.x, y: ie.box.min.y - origin.y, w: ie.box.max.x - ie.box.min.x, h: ie.box.max.y - ie.box.min.y, depth: origin.z - ie.box.min.z });
        }
      }
      modules.set(name, { name, width: size.x, height: size.y, parts: partsFrom(meshes, origin), holes });
    } else if (/^(cornice|crown|base|dado)_/.test(name) && /standard_standard|standard_01|pier_standard|pier_pedestal/.test(name)) {
      strips.set(name, { name, width: size.x, height: size.y, depth: size.z, parts: partsFrom(e.meshes, new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, b.max.z)) });
    } else if (/^wall_pier_standard/.test(name)) {
      strips.set(name, { name, width: size.x, height: size.y, depth: size.z, parts: partsFrom(e.meshes, new THREE.Vector3((b.min.x + b.max.x) / 2, b.min.y, b.max.z)) });
    }
  }
  const kit = { id, modules, strips, names: [...modules.keys()] };
  kits.set(id, kit);
  return kit;
}

// ---------------------------------------------------------------- Innenräume hinter den Fenstern
let roomTex = null;
function roomTexture() {
  if (roomTex) return roomTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  // Licht von der Decke, unten dunkler, links/rechts Vorhangkanten
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.55, '#8a8a8a'); grd.addColorStop(1, '#262626');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, 9, 64); g.fillRect(55, 0, 9, 64);
  roomTex = new THREE.CanvasTexture(c);
  roomTex.colorSpace = THREE.SRGBColorSpace;
  return roomTex;
}

// ---------------------------------------------------------------- Zeile bauen
// opts: start [x, z] (linkes Ende von der Straße aus gesehen), dir [dx, dz] (Laufrichtung), length (m),
//       floors, ground(i) / upper(i, floor) → Modulname, rng, lit (Anteil beleuchteter Fenster), colors
export function buildRow(parent, kitId, opts) {
  const kit = facadeKit(kitId);
  if (!kit) return null;
  const { start, dir, length, floors = 4, rng, y0 = 0, lit = 0.2, colors = [0xffb060, 0xffd9a0, 0x60d8ff, 0xff5aa0], piers = true } = opts;
  const pick = (arr) => arr[Math.floor(rng.float(0, arr.length - 0.0001))];
  const theta = Math.atan2(-dir[1], dir[0]);
  const rowQ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), theta);
  const W = 3;
  const n = Math.max(1, Math.floor(length / W));
  const pad = (length - n * W) / 2;            // Rest an beiden Enden (gestreckte Blindwand)
  const inst = new Map();                      // key → { geometry, material, mats: [] }
  const add = (parts, local) => {
    for (const p of parts) {
      const key = p.geometry.uuid + '|' + p.material.uuid;
      let e = inst.get(key);
      if (!e) inst.set(key, e = { geometry: p.geometry, material: p.material, mats: [] });
      e.mats.push(local.clone().multiply(p.matrix));
    }
  };
  const rowMat = (u, y, sx = 1) => new THREE.Matrix4().compose(
    new THREE.Vector3(start[0] + dir[0] * u, y0 + y, start[1] + dir[1] * u), rowQ, new THREE.Vector3(sx, 1, 1));
  const rooms = [];
  const std = kit.modules.get('wall_standard_standard_01');
  const place = (name, u, y, sx = 1) => {
    const m = kit.modules.get(name) || std;
    add(m.parts, rowMat(u, y, sx));
    for (const h of m.holes) if (h.w > 0.5 && h.h > 0.8) rooms.push({ u: u + (h.x + h.w / 2) * sx, y: y + h.y + h.h / 2, w: h.w * sx, h: h.h, d: h.depth + 0.25 });
  };
  const H = floors * W;
  for (let f = 0; f < floors; f++) {
    const y = f * W;
    if (pad > 0.05) { place('wall_standard_standard_01', 0, y, pad / W); place('wall_standard_standard_01', pad + n * W, y, pad / W); }
    for (let i = 0; i < n; i++) place(f === 0 ? opts.ground(i) : opts.upper(i, f), pad + i * W, y);
  }
  // Leisten: Sockel, Gesims über dem Erdgeschoss, Krone, Pfeiler an den Modulgrenzen
  const strip = (name, u, y, sx = 1) => { const s = kit.strips.get(name); if (s) add(s.parts, rowMat(u, y, sx)); };
  const baseS = kit.strips.get('base_standard_01'), corn = kit.strips.get('cornice_standard_standard_01'), crown = kit.strips.get('crown_standard_standard_01');
  const spanStrip = (s, y) => {
    if (!s) return;
    if (pad > 0.05) { strip(s.name, pad / 2, y, pad / s.width); strip(s.name, length - pad / 2, y, pad / s.width); }
    for (let i = 0; i < n; i++) strip(s.name, pad + i * W + W / 2, y, W / s.width);
  };
  spanStrip(baseS, 0);
  spanStrip(corn, W - (corn?.height ?? 0.2) / 2);
  spanStrip(crown, H);
  if (piers) for (let i = 0; i <= n; i++) {
    const u = pad + i * W;
    for (let f = 0; f < floors; f++) strip('wall_pier_standard_01', u, f * W);
    strip('cornice_pier_standard_01', u, W - 0.1);
    strip('crown_pier_pedestal_01', u, H - 0.05);
  }
  // Instanzen bauen
  const group = new THREE.Group();
  group.name = 'Fassade ' + kitId;
  for (const e of inst.values()) {
    const im = new THREE.InstancedMesh(e.geometry, e.material, e.mats.length);
    e.mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.castShadow = false; im.receiveShadow = true;
    im.userData.shared = true;
    im.computeBoundingSphere();
    group.add(im);
  }
  // Räume hinter den Fenstern: dunkel oder warm/kalt beleuchtet
  if (rooms.length) {
    const nrm = new THREE.Vector3(-dir[1], 0, dir[0]);
    const mat = new THREE.MeshBasicMaterial({ map: roomTexture(), toneMapped: true, fog: true });
    const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, rooms.length);
    const col = new THREE.Color();
    rooms.forEach((r, i) => {
      const p = new THREE.Vector3(start[0] + dir[0] * r.u, y0 + r.y, start[1] + dir[1] * r.u).addScaledVector(nrm, -r.d);
      im.setMatrixAt(i, new THREE.Matrix4().compose(p, rowQ, new THREE.Vector3(r.w, r.h, 1)));
      if (r.y > 2.5 && rng.chance(lit)) col.setHex(pick(colors)).multiplyScalar(rng.float(0.35, 0.8));
      else col.setRGB(0.012, 0.012, 0.016);
      im.setColorAt(i, col);
    });
    im.userData.shared = false;
    group.add(im);
    group.userData.rooms = rooms.length;
  }
  parent.add(group);
  return group;
}
