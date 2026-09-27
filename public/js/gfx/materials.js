// Materialbibliothek: Name → MeshStandardMaterial (gecacht)

import * as THREE from 'three';
import { getTexture } from './textures.js';

const cache = new Map();

// Bump-Mapping auf sehr dünner Geometrie (Ketten, Kabel, Seile unter einem Pixel) liefert
// entartete Ableitungen → normalize(0) = NaN. Ein NaN-Pixel reicht, und der Bloom schwärzt das
// ganze Bild. Deshalb: bei Länge ≈ 0 die ungestörte Normale nehmen.
{
  const chunk = THREE.ShaderChunk.bumpmap_pars_fragment;
  const bad = 'return normalize( abs( fDet ) * surf_norm - vGrad );';
  if (chunk.includes(bad)) {
    THREE.ShaderChunk.bumpmap_pars_fragment = chunk.replace(bad,
      'vec3 bumpN = abs( fDet ) * surf_norm - vGrad; float bumpL = length( bumpN ); return bumpL > 1e-6 ? bumpN / bumpL : surf_norm;');
  } else console.warn('Bump-Shader-Schutz nicht angewendet: three.js-Chunk hat sich geändert');
}

// tex: Texturname · r: Rauheit · m: Metall · b: Bump-Stärke · c: Farbmultiplikator · e: Emissiv-Intensität
const DEFS = {
  concrete:      { tex: 'concrete', r: 0.92, m: 0, b: 2.5 },
  concreteFloor: { tex: 'concreteFloor', r: 0.85, m: 0, b: 2 },
  concreteWet:   { tex: 'concreteFloor', r: 0.35, m: 0.1, b: 2 },
  stone:         { tex: 'stone', r: 0.9, m: 0, b: 4 },
  stoneDark:     { tex: 'stone', r: 0.9, m: 0, b: 4, c: 0x8a8580 },
  brick:         { tex: 'brick', r: 0.9, m: 0, b: 3 },
  plaster:       { tex: 'plaster', r: 0.95, m: 0, b: 1.5 },
  marble:        { tex: 'marble', r: 0.25, m: 0.05, b: 0.5 },
  marbleDark:    { tex: 'marbleDark', r: 0.2, m: 0.05, b: 0.5 },
  marbleChecker: { tex: 'marbleChecker', r: 0.18, m: 0.05, b: 1 },
  wood:          { tex: 'wood', r: 0.7, m: 0, b: 1 },
  woodPanel:     { tex: 'woodPanel', r: 0.55, m: 0, b: 3 },
  woodPlanks:    { tex: 'woodPlanks', r: 0.7, m: 0, b: 2 },
  brass:         { tex: 'brass', r: 0.32, m: 0.95, b: 0.5 },
  brassDark:     { tex: 'brass', r: 0.45, m: 0.9, b: 0.5, c: 0x6a5a40 },
  gold:          { tex: 'brass', r: 0.22, m: 1, b: 0.3, c: 0xffe0a0 },
  steel:         { tex: 'steel', r: 0.45, m: 0.85, b: 1 },
  rust:          { tex: 'rust', r: 0.9, m: 0.3, b: 3 },
  treadPlate:    { tex: 'treadPlate', r: 0.5, m: 0.8, b: 2.5 },
  hazard:        { tex: 'hazard', r: 0.7, m: 0.2, b: 1 },
  steelPanel:    { tex: 'steelPanel', r: 0.55, m: 0.75, b: 2 },
  walnut:        { tex: 'woodPanel', r: 0.5, m: 0, b: 3, c: 0x8a6048 },
  tilesWhite:    { tex: 'tilesWhite', r: 0.3, m: 0, b: 2 },
  tilesFloor:    { tex: 'tilesFloor', r: 0.35, m: 0, b: 1.5 },
  carpet:        { tex: 'carpet', r: 1, m: 0, b: 1 },
  damask:        { tex: 'damask', r: 0.85, m: 0, b: 1 },
  salt:          { tex: 'salt', r: 0.55, m: 0, b: 4 },
  rock:          { tex: 'rock', r: 0.95, m: 0, b: 5 },
  flesh:         { tex: 'flesh', r: 0.28, m: 0, b: 5 },
  bone:          { tex: 'bone', r: 0.7, m: 0, b: 2 },
  asphalt:       { tex: 'asphalt', r: 0.35, m: 0, b: 2 },
  rubber:        { tex: 'rubber', r: 0.8, m: 0, b: 1 },
  grate:         { tex: 'grate', r: 0.6, m: 0.7, b: 2 },
  ceiling:       { tex: 'ceiling', r: 0.95, m: 0, b: 1 },
  fabric:        { tex: 'fabric', r: 1, m: 0, b: 0.5 },
  fabricRed:     { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0x7a1418 },
  fabricBlack:   { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0x1a1718 },
  fabricWhite:   { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0xe8e2d6 },
  robe:          { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0x3a2e24 },
  paper:         { tex: 'paper', r: 0.9, m: 0, b: 0.3 },
  server:        { tex: 'server', r: 0.5, m: 0.6, b: 1, e: 2.2 },
  shelf:         { tex: 'shelf', r: 0.85, m: 0, b: 2 },
  facade:        { tex: 'facade', r: 0.7, m: 0.1, b: 1.5, e: 1.6 },
  water:         { tex: 'water', r: 0.06, m: 0.2, b: 1.2, c: 0x2a4a50 },
};

export function mat(name) {
  if (cache.has(name)) return cache.get(name);
  const d = DEFS[name];
  if (!d) throw new Error('Unbekanntes Material: ' + name);
  const t = getTexture(d.tex);
  const m = new THREE.MeshStandardMaterial({
    map: t.map,
    bumpMap: t.bump,
    bumpScale: d.b ?? 1,
    roughness: d.r ?? 0.8,
    metalness: d.m ?? 0,
    color: d.c ?? 0xffffff,
  });
  if (t.emissive) {
    m.emissiveMap = t.emissive;
    m.emissive = new THREE.Color(0xffffff);
    m.emissiveIntensity = d.e ?? 1;
  }
  m.name = name;
  m.userData.world = t.world;
  cache.set(name, m);
  return m;
}

// Leuchtende Flächen (Neon, Lampen, Displays) – überstrahlen im Bloom
export function glowMat(color, intensity = 3, key = null) {
  const k = key || `glow_${color}_${intensity}`;
  if (cache.has(k)) return cache.get(k);
  const m = new THREE.MeshStandardMaterial({
    color: 0x000000, emissive: new THREE.Color(color), emissiveIntensity: intensity, roughness: 1, metalness: 0,
  });
  m.name = k;
  cache.set(k, m);
  return m;
}

export function basicMat(color, key = null) {
  const k = key || `basic_${color}`;
  if (cache.has(k)) return cache.get(k);
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 });
  m.name = k;
  cache.set(k, m);
  return m;
}

export function hasMat(name) { return !!DEFS[name]; }
