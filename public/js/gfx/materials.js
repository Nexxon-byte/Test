// Materialbibliothek: Name → MeshStandardMaterial (gecacht)

import * as THREE from 'three';
import { getTexture } from './textures.js';

const cache = new Map();

// Fototexturen (CC0, Poly Haven) – vor dem Bau der Welt laden: await loadPBR()
const PBR = {};
export async function loadPBR(base = '') {
  try {
    const r = await fetch(base + 'assets/tex/manifest.json');
    if (!r.ok) return;
    const man = await r.json();
    const loader = new THREE.TextureLoader();
    const load = (url, srgb, world) => new Promise((res) => loader.load(base + url, (t) => {
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
      t.anisotropy = 8;
      t.repeat.set(1 / world, 1 / world);
      res(t);
    }, undefined, () => res(null)));
    await Promise.all(Object.entries(man).map(async ([name, e]) => {
      const [map, normal, rough] = await Promise.all([
        e.maps.col ? load(e.maps.col, true, e.world) : null,
        e.maps.nor ? load(e.maps.nor, false, e.world) : null,
        e.maps.rough ? load(e.maps.rough, false, e.world) : null,
      ]);
      if (map) PBR[name] = { map, normal, rough, world: e.world };
    }));
  } catch (e) { console.warn('Fototexturen nicht geladen', e); }
}
export function hasPBR() { return Object.keys(PBR).length > 0; }

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
  concrete:      { tex: 'concrete', r: 0.92, m: 0, b: 2.5, pbr: 'concrete' },
  concreteFloor: { tex: 'concreteFloor', r: 0.85, m: 0, b: 2, pbr: 'concreteFloor' },
  concreteWet:   { tex: 'concreteFloor', r: 0.35, m: 0.1, b: 2, pbr: 'concreteFloor', pr: 0.4 },
  stone:         { tex: 'stone', r: 0.9, m: 0, b: 4, pbr: 'stone' },
  stoneDark:     { tex: 'stone', r: 0.9, m: 0, b: 4, c: 0x8a8580, pbr: 'stoneDark' },
  brick:         { tex: 'brick', r: 0.9, m: 0, b: 3, pbr: 'brick' },
  plaster:       { tex: 'plaster', r: 0.95, m: 0, b: 1.5, pbr: 'plaster' },
  marble:        { tex: 'marble', r: 0.25, m: 0.05, b: 0.5, pbr: 'marble' },
  marbleDark:    { tex: 'marbleDark', r: 0.2, m: 0.05, b: 0.5, pbr: 'marble', pc: 0x2c2a28 },
  marbleChecker: { tex: 'marbleChecker', r: 0.18, m: 0.05, b: 1 },
  wood:          { tex: 'wood', r: 0.7, m: 0, b: 1, pbr: 'wood' },
  woodPanel:     { tex: 'woodPanel', r: 0.55, m: 0, b: 3, pbr: 'woodPanel' },
  woodPlanks:    { tex: 'woodPlanks', r: 0.7, m: 0, b: 2, pbr: 'woodPlanks' },
  brass:         { tex: 'brass', r: 0.32, m: 0.95, b: 0.5, pbr: 'brassBase', pc: 0xd4a860, pr: 0.6 },
  brassDark:     { tex: 'brass', r: 0.45, m: 0.9, b: 0.5, c: 0x6a5a40, pbr: 'brassBase', pc: 0x7a6440, pr: 0.8 },
  gold:          { tex: 'brass', r: 0.22, m: 1, b: 0.3, c: 0xffe0a0, pbr: 'brassBase', pc: 0xffd488, pr: 0.45 },
  steel:         { tex: 'steel', r: 0.45, m: 0.85, b: 1, pbr: 'steel', pr: 0.9 },
  rust:          { tex: 'rust', r: 0.9, m: 0.3, b: 3, pbr: 'rust' },
  treadPlate:    { tex: 'treadPlate', r: 0.5, m: 0.8, b: 2.5 },
  hazard:        { tex: 'hazard', r: 0.7, m: 0.2, b: 1 },
  steelPanel:    { tex: 'steelPanel', r: 0.55, m: 0.75, b: 2, pbr: 'steelPanel', pc: 0x9aa0a6 },
  walnut:        { tex: 'woodPanel', r: 0.5, m: 0, b: 3, c: 0x8a6048, pbr: 'walnut' },
  tilesWhite:    { tex: 'tilesWhite', r: 0.3, m: 0, b: 2, pbr: 'tilesWhite' },
  tilesFloor:    { tex: 'tilesFloor', r: 0.35, m: 0, b: 1.5, pbr: 'tilesFloor' },
  carpet:        { tex: 'carpet', r: 1, m: 0, b: 1, pbr: 'carpet', pc: 0x9a2a28 },
  damask:        { tex: 'damask', r: 0.85, m: 0, b: 1 },
  salt:          { tex: 'salt', r: 0.55, m: 0, b: 4 },
  rock:          { tex: 'rock', r: 0.95, m: 0, b: 5, pbr: 'rock' },
  flesh:         { tex: 'flesh', r: 0.28, m: 0, b: 5 },
  bone:          { tex: 'bone', r: 0.7, m: 0, b: 2 },
  asphalt:       { tex: 'asphalt', r: 0.35, m: 0, b: 2, pbr: 'asphalt' },
  rubber:        { tex: 'rubber', r: 0.8, m: 0, b: 1 },
  grate:         { tex: 'grate', r: 0.6, m: 0.7, b: 2, pbr: 'grate' },
  ceiling:       { tex: 'ceiling', r: 0.95, m: 0, b: 1 },
  fabric:        { tex: 'fabric', r: 1, m: 0, b: 0.5, pbr: 'fabric' },
  fabricRed:     { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0x7a1418, pbr: 'fabric' },
  fabricBlack:   { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0x1a1718, pbr: 'fabric' },
  fabricWhite:   { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0xe8e2d6, pbr: 'fabric' },
  robe:          { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0x3a2e24, pbr: 'fabric' },
  paper:         { tex: 'paper', r: 0.9, m: 0, b: 0.3 },
  server:        { tex: 'server', r: 0.5, m: 0.6, b: 1, e: 2.2 },
  shelf:         { tex: 'shelf', r: 0.85, m: 0, b: 2 },
  facade:        { tex: 'facade', r: 0.7, m: 0.1, b: 1.5, e: 1.6 },
  water:         { tex: 'water', r: 0.06, m: 0.2, b: 1.2, c: 0x2a4a50 },
  fahrgastHead:  { tex: 'marble', r: 0.18, m: 0, b: 0.2, c: 0xf2ece2 },
  asphaltWet:    { tex: 'asphalt', r: 0.12, m: 0.25, b: 1.5, pbr: 'asphalt', pr: 0.2 },
  stoneWet:      { tex: 'stone', r: 0.2, m: 0.15, b: 3, pbr: 'stoneWet', pr: 0.35 },
  coatGreen:     { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0x2f3a2c, pbr: 'fabric' },
  coatBrown:     { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0x4a3524, pbr: 'fabric' },
  coatGrey:      { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0x55524e, pbr: 'fabric' },
  coatBlue:      { tex: 'fabric', r: 1, m: 0, b: 0.5, c: 0x243040, pbr: 'fabric' },
  leather:       { tex: 'fabric', r: 0.6, m: 0, b: 0.8, c: 0x3a2418, pbr: 'leather' },
};

export function mat(name) {
  if (cache.has(name)) return cache.get(name);
  const d = DEFS[name];
  if (!d) throw new Error('Unbekanntes Material: ' + name);
  const p = d.pbr && PBR[d.pbr];
  if (p) {
    const m = new THREE.MeshStandardMaterial({
      map: p.map, normalMap: p.normal, roughnessMap: p.rough,
      roughness: d.pr ?? 1, metalness: d.m ?? 0, color: d.pc ?? d.c ?? 0xffffff,
    });
    m.normalScale.set(1, 1);
    m.name = name;
    m.userData.world = p.world;
    cache.set(name, m);
    return m;
  }
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
