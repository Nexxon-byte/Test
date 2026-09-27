// Prüfwerkzeug (?placecheck): findet automatisch SCHWEBENDE Objekte (kein Bodenkontakt)
// und INEINANDERSTECKENDE Objekte (deutliche Durchdringung) in einer gebauten Szene.
// Reine Diagnose – verändert nichts an der Welt. Siehe main.js (window.__placeCheck)
// und tools/test/placecheck.mjs (CLI).

import * as THREE from 'three';

const CELL = 3;             // Kantenlänge des räumlichen Rasters (Grobfilter) in Metern
const FLAT = 0.02;          // Achse dünner als das gilt als „flach“ (Decal/Wandscheibe)
const LARGE = 6;            // Ausdehnung, ab der etwas automatisch als große Fläche (Wand/Decke) zählt
const MAX_PER_CATEGORY = 40;

const _box = new THREE.Box3();
const _mat = new THREE.Matrix4();
const _vec = new THREE.Vector3();

function round3(v) { return [Math.round(v.x * 100) / 100, Math.round(v.y * 100) / 100, Math.round(v.z * 100) / 100]; }

function sizeOf(box) { return box.getSize(new THREE.Vector3()); }
function volumeOf(size) { return Math.max(0, size.x) * Math.max(0, size.y) * Math.max(0, size.z); }

function isAncestor(a, b) {
  let p = b;
  while (p) { if (p === a) return true; p = p.parent; }
  return false;
}

// Sammelt alle eigenständigen Objekte unter root (siehe Aufgabenbeschreibung):
// Mesh/InstancedMesh-Instanzen einzeln, Modelle (userData.modelId) und Figuren (SkinnedMesh)
// als Ganzes, Sprites als kleine Leuchtkörper. Verschmolzene Builder-Meshes, Regen (LineSegments),
// Partikel (Points) und userData.noCheck werden ignoriert.
function collectSceneCandidates(root) {
  root.updateMatrixWorld(true);
  const out = [];
  const seenFigureGroups = new Set();

  function pushCandidate(label, box, node) {
    if (!box || !isFinite(box.min.x) || !isFinite(box.max.x)) return;
    if (box.max.x < box.min.x) return;
    out.push({ label, box: box.clone(), node });
  }

  function visit(node) {
    if (!node) return;
    if (node.userData && node.userData.noCheck) return;
    if (node.userData && node.userData.builder) return; // verschmolzenes Builder-Mesh
    if (node.isLineSegments || node.isPoints || node.isLight || node.isCamera) return; // Regen/Partikel/Licht

    if (node.isInstancedMesh) {
      const geo = node.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const name = node.name || geo.name || 'InstancedMesh';
      for (let i = 0; i < node.count; i++) {
        node.getMatrixAt(i, _mat);
        _mat.premultiply(node.matrixWorld);
        const box = geo.boundingBox.clone().applyMatrix4(_mat);
        pushCandidate(`Instanz ${name} #${i}`, box, node);
      }
      return;
    }

    if (node.userData && node.userData.modelId) {
      const box = new THREE.Box3().setFromObject(node);
      pushCandidate(`Modell ${node.userData.modelId}`, box, node);
      return; // nicht weiter absteigen: das Modell zählt als ein Ding
    }

    if (node.isSkinnedMesh) {
      // Eine MPFB-Figur besteht aus mehreren SkinnedMesh-Teilen (Körper, Kleidung, Haar …),
      // die alle denselben Elternknoten teilen – als Ganzes behandeln, nicht Teil für Teil.
      const key = node.parent || node;
      if (!seenFigureGroups.has(key)) {
        seenFigureGroups.add(key);
        const box = new THREE.Box3().setFromObject(key);
        pushCandidate(`Figur ${node.name || key.name || 'MPFB'}`, box, key);
      }
      return;
    }

    if (node.isSprite) {
      const p = node.getWorldPosition(_vec);
      const hw = Math.abs(node.scale.x) / 2, hh = Math.abs(node.scale.y) / 2;
      const hd = Math.min(hw, hh) || 0.01;
      const box = new THREE.Box3(
        new THREE.Vector3(p.x - hw, p.y - hh, p.z - hd),
        new THREE.Vector3(p.x + hw, p.y + hh, p.z + hd),
      );
      pushCandidate(`Sprite ${node.name || 'Leuchtkörper'}`, box, node);
      return;
    }

    if (node.isMesh) {
      const box = new THREE.Box3().setFromObject(node);
      const name = node.name || (node.material && node.material.name) || 'Mesh';
      pushCandidate(`Mesh ${name}`, box, node);
      // Meshes sind praktisch immer Blätter, aber sicherheitshalber trotzdem absteigen:
    }

    for (const c of node.children) visit(c);
  }

  for (const c of root.children) visit(c);
  return out;
}

// Räumliches Raster als Grobfilter, um nicht alle Paare einzeln prüfen zu müssen.
function buildSpatialHash(items, pad) {
  const map = new Map();
  items.forEach((it, i) => {
    const b = it.box;
    const x0 = Math.floor((b.min.x - pad) / CELL), x1 = Math.floor((b.max.x + pad) / CELL);
    const y0 = Math.floor((b.min.y - pad) / CELL), y1 = Math.floor((b.max.y + pad) / CELL);
    const z0 = Math.floor((b.min.z - pad) / CELL), z1 = Math.floor((b.max.z + pad) / CELL);
    const keys = [];
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) {
      const k = `${x},${y},${z}`;
      keys.push(k);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(i);
    }
    it._cellKeys = keys;
  });
  return map;
}

function neighborsOf(items, map, i) {
  const set = new Set();
  for (const k of items[i]._cellKeys) for (const j of map.get(k)) if (j !== i) set.add(j);
  return set;
}

function boxesTouch(a, b, eps) {
  return a.min.x - eps <= b.max.x && a.max.x + eps >= b.min.x
    && a.min.y - eps <= b.max.y && a.max.y + eps >= b.min.y
    && a.min.z - eps <= b.max.z && a.max.z + eps >= b.min.z;
}

// findet: { floating, overlapping, stats }
export function placeCheck(root, { builderBoxes = [], floorY = 0, eps = 0.03 } = {}) {
  if (!root) return { floating: [], overlapping: [], stats: { error: 'keine Wurzel übergeben' } };

  const sceneCandidates = collectSceneCandidates(root);
  const items = [];
  for (const bb of builderBoxes) items.push({ label: bb.label, box: bb.box, node: null });
  for (const sc of sceneCandidates) items.push(sc);

  // Kenngrößen je Kandidat
  for (const it of items) {
    it.size = sizeOf(it.box);
    it.volume = volumeOf(it.size);
    it.minDim = Math.min(it.size.x, it.size.y, it.size.z);
    it.maxDim = Math.max(it.size.x, it.size.y, it.size.z);
    it.isFlat = it.minDim < FLAT;
    it.touchesFloor = it.box.min.y <= floorY + eps;
    it.isLargeAnchor = it.maxDim > LARGE;
    it.center = it.box.getCenter(new THREE.Vector3());
  }

  const n = items.length;
  const stats = { kandidaten: n, ausBuilder: builderBoxes.length, ausSzene: sceneCandidates.length };
  if (n === 0) return { floating: [], overlapping: [], stats };

  // ---------------------------------------------------------------- SCHWEBEN
  // Union-Find über Kontaktgraph; ein virtueller „Boden“-Knoten (Index n) sammelt alle Anker.
  const GROUND = n;
  const parent = new Array(n + 1);
  for (let i = 0; i <= n; i++) parent[i] = i;
  function find(x) { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }
  function union(a, b) { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; }

  const hashPad = Math.max(eps, 0.01);
  const hash = buildSpatialHash(items, hashPad);

  for (let i = 0; i < n; i++) {
    if (items[i].touchesFloor || items[i].isLargeAnchor) union(i, GROUND);
  }
  for (let i = 0; i < n; i++) {
    const neigh = neighborsOf(items, hash, i);
    for (const j of neigh) {
      if (j <= i) continue;
      if (boxesTouch(items[i].box, items[j].box, eps)) union(i, j);
    }
  }

  const groundRoot = find(GROUND);
  const floatingRaw = [];
  for (let i = 0; i < n; i++) {
    if (find(i) !== groundRoot) floatingRaw.push(items[i]);
  }
  floatingRaw.sort((a, b) => b.volume - a.volume || b.maxDim - a.maxDim);
  stats.schwebendGefunden = floatingRaw.length;
  const floating = floatingRaw.slice(0, MAX_PER_CATEGORY).map(it => ({
    label: it.label, pos: round3(it.center), size: [Math.round(it.size.x * 1000) / 1000, Math.round(it.size.y * 1000) / 1000, Math.round(it.size.z * 1000) / 1000],
  }));

  // ------------------------------------------------------------ INEINANDERSTECKEN
  const overlapRaw = [];
  const seenPairs = new Set();
  for (let i = 0; i < n; i++) {
    const neigh = neighborsOf(items, hash, i);
    for (const j of neigh) {
      if (j <= i) continue;
      const key = i < j ? `${i}_${j}` : `${j}_${i}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      const a = items[i], b = items[j];
      if (a.node && b.node && (a.node === b.node || isAncestor(a.node, b.node) || isAncestor(b.node, a.node))) continue;
      if (!boxesTouch(a.box, b.box, 0)) continue; // Grobtest ohne Toleranz: müssen sich wirklich schneiden
      _box.copy(a.box).intersect(b.box);
      if (_box.isEmpty()) continue;
      const overlapVol = volumeOf(sizeOf(_box));
      const smaller = a.volume <= b.volume ? a : b;
      if (smaller.volume <= 0) continue;
      const ratio = overlapVol / smaller.volume;
      if (ratio <= 0.25) continue;
      if (smaller.minDim <= 0.1) continue;
      const priority = (n1) => (n1.label.startsWith('Figur') || n1.label.startsWith('Modell')) ? 1 : 0;
      overlapRaw.push({ a: a.label, b: b.label, pos: round3(_box.getCenter(new THREE.Vector3())), ratio: Math.round(ratio * 1000) / 1000, _prio: Math.max(priority(a), priority(b)) });
    }
  }
  overlapRaw.sort((x, y) => y._prio - x._prio || y.ratio - x.ratio);
  stats.ueberlappungenGefunden = overlapRaw.length;
  const overlapping = overlapRaw.slice(0, MAX_PER_CATEGORY).map(({ _prio, ...rest }) => rest);

  return { floating, overlapping, stats };
}
