// Modellbibliothek für CC0-Modelle (Poly Haven, glTF).
// · preloadModels(ids)        – laden (Manifest: public/assets/models/manifest.json)
// · cloneModel(id, opts)      – eigene Kopie (teilt Geometrie & Material) für Bewegliches
// · ModelBatch                – viele statische Kopien als InstancedMesh + Kollider

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const lib = new Map();          // id → { scene, box, size }
let manifest = null;
let base = '';
const loader = new GLTFLoader();
const pending = new Map();
let envTex = null;

// Dunkle Umgebung für Spiegelungen auf Metall (Messing, Stahl) – nur für Modelle
export function setModelEnvironment(renderer) {
  if (envTex) return envTex;
  const pm = new THREE.PMREMGenerator(renderer);
  const sc = new THREE.Scene();
  sc.background = new THREE.Color(0x0a0806);
  const room = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 10), new THREE.MeshBasicMaterial({ color: 0x1a1512, side: THREE.BackSide }));
  sc.add(room);
  for (const [x, z, c] of [[-3, -4.9, 0xffb070], [3.5, 4.9, 0x6080a0], [0, 0, 0xffd8a0]]) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.2), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide }));
    p.position.set(x, z === 0 ? 2.45 : 1.8, z);
    if (z === 0) p.rotation.x = Math.PI / 2;
    sc.add(p);
  }
  envTex = pm.fromScene(sc, 0.04).texture;
  pm.dispose();
  for (const m of lib.values()) applyEnv(m.scene);
  return envTex;
}
function applyEnv(scene) {
  if (!envTex) return;
  scene.traverse((o) => { if (o.isMesh && o.material?.isMeshStandardMaterial) { o.material.envMap = envTex; o.material.needsUpdate = true; } });
}

export async function loadModelManifest(b = '') {
  base = b;
  try {
    const r = await fetch(base + 'assets/models/manifest.json');
    manifest = r.ok ? await r.json() : {};
  } catch { manifest = {}; }
  return manifest;
}

export function modelIds(group = null) {
  if (!manifest) return [];
  return Object.keys(manifest).filter(id => !group || manifest[id].group === group);
}

export function hasModel(id) { return lib.has(id); }
export function modelInfo(id) { return lib.get(id); }

function prepare(scene) {
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    const m = o.material;
    if (m && m.isMeshStandardMaterial) {
      m.envMapIntensity = 0.35;
      // Scans sind oft zu glatt/sauber für die Tiefe: etwas mehr Rauheit
      m.roughness = Math.min(1, (m.roughness ?? 1) * 1.05);
    }
  });
  scene.traverse((o) => { if (o.isMesh) o.userData.shared = true; });
  applyEnv(scene);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  return { scene, box, size: box.getSize(new THREE.Vector3()) };
}

export function loadModel(id) {
  if (lib.has(id)) return Promise.resolve(lib.get(id));
  if (pending.has(id)) return pending.get(id);
  const e = manifest?.[id];
  if (!e) return Promise.resolve(null);
  const p = new Promise((resolve) => {
    loader.load(base + e.file, (g) => {
      const m = prepare(g.scene);
      lib.set(id, m);
      resolve(m);
    }, undefined, (err) => { console.warn('Modell fehlt', id, err?.message); resolve(null); });
  });
  pending.set(id, p);
  return p;
}

export async function preloadModels(ids, onProgress = null) {
  let done = 0;
  await Promise.all(ids.map(id => loadModel(id).then(() => { done++; onProgress?.(done, ids.length); })));
}

// Kopie mit optionaler Zielgröße: { height } oder { maxDim } in Metern; Ursprung auf Bodenmitte
export function cloneModel(id, { height = null, maxDim = null, center = true } = {}) {
  const m = lib.get(id);
  if (!m) return null;
  const inner = m.scene.clone(true);
  const g = new THREE.Group();
  g.add(inner);
  let s = 1;
  if (height) s = height / Math.max(0.001, m.size.y);
  else if (maxDim) s = maxDim / Math.max(0.001, m.size.x, m.size.y, m.size.z);
  inner.scale.setScalar(s);
  if (center) {
    const c = m.box.getCenter(new THREE.Vector3());
    inner.position.set(-c.x * s, -m.box.min.y * s, -c.z * s);
  }
  g.userData.modelId = id;
  g.userData.scale = s;
  return g;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

// Viele statische Kopien → InstancedMesh je (Geometrie, Material)
export class ModelBatch {
  constructor() {
    this.items = new Map();      // id → [{ matrix }]
    this.colliders = [];
  }

  // x/z Bodenposition, y Höhe der Unterkante; opts: height/maxDim (Zielgröße), scale, collide, rx/rz
  add(id, x, y, z, ry = 0, { height = null, maxDim = null, scale = 1, collide = true, rx = 0, rz = 0, pad = 0 } = {}) {
    const m = lib.get(id);
    if (!m) return null;
    let s = scale;
    if (height) s = height / Math.max(0.001, m.size.y);
    else if (maxDim) s = maxDim / Math.max(0.001, m.size.x, m.size.y, m.size.z);
    const c = m.box.getCenter(new THREE.Vector3());
    // Ursprung: Bodenmitte der Hülle
    const off = new THREE.Matrix4().makeTranslation(-c.x, -m.box.min.y, -c.z);
    _e.set(rx, ry, rz, 'YXZ');
    _q.setFromEuler(_e);
    _p.set(x, y, z);
    _s.setScalar(s);
    const mat = new THREE.Matrix4().compose(_p, _q, _s).multiply(off);
    if (!this.items.has(id)) this.items.set(id, []);
    this.items.get(id).push(mat);
    const w = m.size.x * s, d = m.size.z * s, h = m.size.y * s;
    if (collide) {
      const cs = Math.abs(Math.cos(ry)), sn = Math.abs(Math.sin(ry));
      const hx = (w * cs + d * sn) / 2 + pad, hz = (w * sn + d * cs) / 2 + pad;
      this.colliders.push({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz, minY: y, maxY: y + h, enabled: true });
    }
    return { w, d, h };
  }

  build(parent) {
    const out = [];
    for (const [id, mats] of this.items) {
      const m = lib.get(id);
      m.scene.updateMatrixWorld(true);
      m.scene.traverse((o) => {
        if (!o.isMesh) return;
        const im = new THREE.InstancedMesh(o.geometry, o.material, mats.length);
        for (let i = 0; i < mats.length; i++) {
          _m.multiplyMatrices(mats[i], o.matrixWorld);
          im.setMatrixAt(i, _m);
        }
        im.instanceMatrix.needsUpdate = true;
        im.castShadow = true;
        im.receiveShadow = true;
        im.computeBoundingSphere();
        im.userData.shared = true;
        parent.add(im);
        out.push(im);
      });
    }
    this.items.clear();
    return out;
  }
}
