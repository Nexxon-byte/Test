// Prozedurale Texturen. Alles entsteht hier – keine Bilddateien.
// Jede Textur kennt ihre „Weltgröße“ in Metern; die Geometrie hat UVs in Metern.

import * as THREE from 'three';
import { makeNoise2D, fbm, clamp } from '../core/rng.js';

const cache = new Map();
const NA = makeNoise2D(11), NB = makeNoise2D(23), NC = makeNoise2D(37), ND = makeNoise2D(51);

export function hash2(x, y, s = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 982451653)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const mix3 = (c1, c2, t) => [mix(c1[0], c2[0], t), mix(c1[1], c2[1], t), mix(c1[2], c2[2], t)];
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];

export function mkCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

function toTex(canvas, { srgb = true, nearest = true, wrap = true } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.magFilter = nearest ? THREE.NearestFilter : THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 4;
  t.generateMipmaps = true;
  return t;
}

// Pixel-Generator: fn(u, v, x, y) → [r, g, b, height?, er?, eg?, eb?]
function generate(w, h, fn, { bump = true, emissive = false } = {}) {
  const cc = mkCanvas(w, h), cctx = cc.getContext('2d');
  const cd = cctx.createImageData(w, h);
  let bc, bctx, bd, ec, ectx, ed;
  if (bump) { bc = mkCanvas(w, h); bctx = bc.getContext('2d'); bd = bctx.createImageData(w, h); }
  if (emissive) { ec = mkCanvas(w, h); ectx = ec.getContext('2d'); ed = ectx.createImageData(w, h); }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const o = fn(x / w, y / h, x, y);
      const i = (y * w + x) * 4;
      cd.data[i] = clamp(o[0]) * 255; cd.data[i + 1] = clamp(o[1]) * 255; cd.data[i + 2] = clamp(o[2]) * 255; cd.data[i + 3] = 255;
      if (bump) { const b = clamp(o[3] ?? 0.5) * 255; bd.data[i] = bd.data[i + 1] = bd.data[i + 2] = b; bd.data[i + 3] = 255; }
      if (emissive) { ed.data[i] = clamp(o[4] ?? 0) * 255; ed.data[i + 1] = clamp(o[5] ?? 0) * 255; ed.data[i + 2] = clamp(o[6] ?? 0) * 255; ed.data[i + 3] = 255; }
    }
  }
  cctx.putImageData(cd, 0, 0);
  const out = { map: toTex(cc), canvas: cc };
  if (bump) { bctx.putImageData(bd, 0, 0); out.bump = toTex(bc, { srgb: false }); }
  if (emissive) { ectx.putImageData(ed, 0, 0); out.emissive = toTex(ec); }
  return out;
}

// Zellenrauschen (kachelbar) – Salz, Fleisch, Steine
function voronoi(u, v, cells, seed = 0) {
  const x = u * cells, y = v * cells;
  const xi = Math.floor(x), yi = Math.floor(y);
  let d1 = 9, d2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j;
    const wx = ((cx % cells) + cells) % cells, wy = ((cy % cells) + cells) % cells;
    const px = cx + hash2(wx, wy, seed), py = cy + hash2(wx, wy, seed + 7);
    const d = Math.hypot(px - x, py - y);
    if (d < d1) { d2 = d1; d1 = d; id = hash2(wx, wy, seed + 13); } else if (d < d2) d2 = d;
  }
  return { d1, d2, edge: d2 - d1, id };
}

// ----------------------------------------------------------------------------
// Texturdefinitionen
// ----------------------------------------------------------------------------

const DEFS = {
  concrete: { size: 256, world: 3, gen: (u, v, x, y) => {
    const n = fbm(NA, u * 8, v * 8, 5, 8);
    const st = fbm(NB, u * 3, v * 3, 3, 3);
    const streak = fbm(NC, u * 48, v * 2, 2, 48);
    const pit = hash2(x, y, 3) > 0.994 ? 0.12 : 0;
    const b = 0.40 + (n - 0.5) * 0.2 - smooth(0.55, 0.75, st) * 0.1 - streak * 0.06 - pit;
    return [b * 1.0, b * 0.98, b * 0.94, n * 0.7 + 0.3 - pit * 2];
  } },

  concreteFloor: { size: 256, world: 4, gen: (u, v, x, y) => {
    const n = fbm(NA, u * 10, v * 10, 5, 10);
    const oil = fbm(ND, u * 4, v * 4, 3, 4);
    const crack = Math.abs(fbm(NB, u * 6, v * 6, 4, 6) - 0.5) < 0.008 ? 0.12 : 0;
    const b = 0.30 + (n - 0.5) * 0.16 - smooth(0.58, 0.72, oil) * 0.12 - crack;
    return [b, b * 0.98, b * 0.95, n * 0.6 + 0.4 - crack * 3];
  } },

  stone: { size: 256, world: 4.2, gen: (u, v, x, y) => {
    const rowH = 32, bw = 64;
    const row = Math.floor(y / rowH);
    const off = (row % 2) * (bw / 2);
    const bx = Math.floor((x + off) / bw) % (256 / bw);
    const lx = (x + off) % bw, ly = y % rowH;
    const edge = Math.min(lx, bw - 1 - lx, ly, rowH - 1 - ly);
    const id = hash2(bx, row, 5);
    const n = fbm(NA, u * 12, v * 12, 4, 12);
    const chip = fbm(NC, u * 30, v * 30, 2, 30);
    const mortar = edge < 2 || (edge < 4 && chip > 0.62);
    let b = 0.27 + id * 0.1 + (n - 0.5) * 0.14;
    const soot = smooth(0.6, 0.8, fbm(NB, u * 2, v * 2, 2, 2)) * 0.1;
    b -= soot;
    if (mortar) b = 0.13 + n * 0.05;
    const bev = mortar ? 0.1 : 0.55 + smooth(0, 5, edge) * 0.35 + (n - 0.5) * 0.2;
    return [b * 1.02, b * 0.99, b * 0.93, bev];
  } },

  brick: { size: 256, world: 2, gen: (u, v, x, y) => {
    const rowH = 16, bw = 48;
    const row = Math.floor(y / rowH);
    const off = (row % 2) * 24;
    const bx = Math.floor((x + off) / bw);
    const lx = (x + off) % bw, ly = y % rowH;
    const mortar = lx < 2 || ly < 2;
    const id = hash2(bx, row, 9);
    const n = fbm(NA, u * 16, v * 16, 3, 16);
    const c = mix3([0.36, 0.14, 0.09], [0.48, 0.24, 0.15], id);
    const d = 0.85 + (n - 0.5) * 0.3;
    if (mortar) return [0.3, 0.29, 0.27, 0.2];
    return [c[0] * d, c[1] * d, c[2] * d, 0.7 + n * 0.3];
  } },

  plaster: { size: 256, world: 3, gen: (u, v, x, y) => {
    const n = fbm(NA, u * 6, v * 6, 5, 6);
    const st = fbm(NB, u * 2, v * 3, 3, 2);
    const crack = Math.abs(fbm(NC, u * 5, v * 5, 5, 5) - 0.5) < 0.006 ? 0.18 : 0;
    const water = smooth(0.5, 0.9, fbm(ND, u * 12, v * 1.5, 3, 12)) * (0.4 + v * 0.6);
    const b = 0.62 + (n - 0.5) * 0.12 - crack - water * 0.18 - smooth(0.6, 0.8, st) * 0.12;
    return [b * 0.98, b * 0.93, b * 0.82, 0.6 + n * 0.3 - crack * 2];
  } },

  marble: { size: 256, world: 2, gen: (u, v) => {
    const t = fbm(NA, u * 4, v * 4, 5, 4);
    const vein = Math.pow(1 - Math.abs(Math.sin((u * 3 + v * 2 + t * 5) * Math.PI)), 12);
    const fine = Math.pow(1 - Math.abs(Math.sin((u * 9 - v * 4 + fbm(NB, u * 8, v * 8, 3, 8) * 6) * Math.PI)), 30);
    const b = 0.84 - vein * 0.38 - fine * 0.15 + (t - 0.5) * 0.06;
    return [b, b * 0.985, b * 0.96, 0.8 - vein * 0.2];
  } },

  marbleDark: { size: 256, world: 2, gen: (u, v) => {
    const t = fbm(NA, u * 4, v * 4, 5, 4);
    const vein = Math.pow(1 - Math.abs(Math.sin((u * 2 - v * 3 + t * 6) * Math.PI)), 20);
    const b = 0.05 + t * 0.05;
    return [b + vein * 0.55, b * 1.1 + vein * 0.47, b * 1.05 + vein * 0.32, 0.8 - vein * 0.2];
  } },

  marbleChecker: { size: 256, world: 2.4, gen: (u, v, x, y) => {
    const tile = (Math.floor(u * 2) + Math.floor(v * 2)) % 2;
    const lx = (x % 128), ly = (y % 128);
    const grout = lx < 2 || ly < 2;
    const t = fbm(NA, u * 5, v * 5, 5, 5);
    const vein = Math.pow(1 - Math.abs(Math.sin((u * 4 + v * 3 + t * 5) * Math.PI)), 14);
    let c;
    if (tile) { const b = 0.8 - vein * 0.35 + (t - 0.5) * 0.08; c = [b, b * 0.98, b * 0.94]; }
    else { const b = 0.045 + t * 0.04; c = [b + vein * 0.3, b + vein * 0.26, b + vein * 0.2]; }
    if (grout) c = [0.1, 0.09, 0.08];
    return [...c, grout ? 0.2 : 0.8];
  } },

  wood: { size: 256, world: 1.2, gen: (u, v) => {
    const w = fbm(NB, u * 3, v * 1.5, 3, 3);
    const grain = Math.sin((u * 46 + w * 7) * Math.PI * 2) * 0.5 + 0.5;
    const fine = fbm(NA, u * 60, v * 4, 2, 60);
    const t = grain * 0.6 + fine * 0.4;
    const c = mix3([0.12, 0.055, 0.03], [0.30, 0.15, 0.075], t);
    return [...c, 0.5 + t * 0.3];
  } },

  woodPanel: { size: 256, world: 1.1, gen: (u, v) => {
    const w = fbm(NB, u * 3, v * 1.5, 3, 3);
    const grain = Math.sin((u * 40 + w * 7) * Math.PI * 2) * 0.5 + 0.5;
    const fine = fbm(NA, u * 60, v * 4, 2, 60);
    let t = grain * 0.55 + fine * 0.45;
    let c = mix3([0.10, 0.045, 0.025], [0.27, 0.13, 0.065], t);
    const m = Math.min(u, 1 - u, v, 1 - v);
    let h = 0.55;
    if (m < 0.06) { h = 0.8; c = c.map(k => k * 1.05); }
    else if (m < 0.1) { h = 0.3 + (m - 0.06) * 6; c = c.map(k => k * 0.7); }
    else h = 0.62 + t * 0.1;
    return [...c, h];
  } },

  woodPlanks: { size: 256, world: 2, gen: (u, v, x, y) => {
    const plankH = 32, row = Math.floor(y / plankH);
    const len = 128 + (hash2(row, 1, 4) * 128 | 0);
    const off = hash2(row, 2, 4) * 256;
    const seg = Math.floor((x + off) / len);
    const lx = (x + off) % len, ly = y % plankH;
    const gap = ly < 1 || lx < 1;
    const id = hash2(seg, row, 6);
    const w = fbm(NB, u * 2, v * 8, 3, 2);
    const grain = Math.sin((v * 90 + w * 6 + id * 10) * Math.PI) * 0.5 + 0.5;
    const c = mix3([0.13, 0.07, 0.035], [0.3, 0.17, 0.09], grain * 0.5 + id * 0.5);
    if (gap) return [0.03, 0.02, 0.015, 0.1];
    return [...c, 0.6 + grain * 0.2];
  } },

  brass: { size: 128, world: 0.6, gen: (u, v) => {
    const s = fbm(NA, u * 2, v * 80, 2, 2);
    const tarn = smooth(0.58, 0.72, fbm(NB, u * 4, v * 4, 4, 4));
    const c = mix3([0.72, 0.52, 0.22], [0.9, 0.72, 0.38], s);
    return [...mix3(c, [0.36, 0.3, 0.16], tarn * 0.45), 0.5 + s * 0.2];
  } },

  steel: { size: 128, world: 1, gen: (u, v, x, y) => {
    const s = fbm(NA, u * 2, v * 64, 2, 2);
    const rust = smooth(0.6, 0.75, fbm(NC, u * 5, v * 5, 4, 5));
    const rivet = (x % 64 > 58 && y % 64 > 58) ? 0.2 : 0;
    const c = mix3([0.3, 0.31, 0.32], [0.46, 0.47, 0.48], s);
    return [...mix3(c, [0.35, 0.16, 0.07], rust), 0.5 + s * 0.2 + rivet];
  } },

  // Riffelblech (Lastkabinenboden): Linsen im Fischgrätmuster, blank gelaufen
  treadPlate: { size: 128, world: 0.6, gen: (u, v, x, y) => {
    const cx = (x % 16) - 7.5, cy = (y % 16) - 7.5;
    const alt = (((x >> 4) + (y >> 4)) & 1) === 1;
    const a = alt ? cx + cy : cx - cy, b = alt ? cx - cy : cx + cy;
    const lens = Math.abs(a) < 6.5 && Math.abs(b) < 1.8 ? 1 : 0;
    const s = fbm(NA, u * 3, v * 3, 3, 3);
    const wear = smooth(0.45, 0.7, fbm(NB, u * 2, v * 2, 3, 2));
    const rust = smooth(0.62, 0.78, fbm(NC, u * 4, v * 4, 4, 4));
    const c = mix3([0.22, 0.23, 0.24], [0.4, 0.41, 0.42], s * 0.5 + lens * (0.2 + wear * 0.35));
    return [...mix3(c, [0.33, 0.15, 0.06], rust * 0.85), 0.42 + lens * 0.45];
  } },

  // Warnstreifen Gelb/Schwarz, abgewetzt
  hazard: { size: 128, world: 0.5, gen: (u, v, x, y) => {
    const stripe = ((x + y) & 63) < 32;
    const wear = smooth(0.55, 0.72, fbm(NA, u * 6, v * 6, 4, 6));
    const dirt = 0.72 + fbm(NB, u * 3, v * 3, 3, 3) * 0.35;
    const base = stripe ? [0.8, 0.6, 0.08] : [0.06, 0.055, 0.05];
    const c = mix3(base, [0.3, 0.29, 0.28], wear * 0.85);
    return [c[0] * dirt, c[1] * dirt, c[2] * dirt, 0.5 - wear * 0.12];
  } },

  // Genietete Stahlplatten (über das alte Nussholz geschraubt)
  steelPanel: { size: 128, world: 1.2, gen: (u, v, x, y) => {
    const px = x & 63, py = y & 63;
    const seam = px < 1 || py < 1;
    const rivet = ((px === 4 || px === 59) && (py & 7) === 4) || ((py === 4 || py === 59) && (px & 7) === 4);
    const s = fbm(NA, u * 2, v * 48, 2, 2);
    const rust = smooth(0.58, 0.76, fbm(NC, u * 6, v * 6, 4, 6));
    const streak = smooth(0.55, 0.8, fbm(NB, u * 24, v * 3, 2, 3)) * 0.5;
    let c = mix3([0.2, 0.21, 0.22], [0.34, 0.35, 0.36], s);
    c = mix3(c, [0.3, 0.13, 0.05], Math.min(1, rust + streak * 0.6));
    if (seam) c = [c[0] * 0.35, c[1] * 0.35, c[2] * 0.35];
    return [...c, seam ? 0.1 : rivet ? 0.98 : 0.5 + s * 0.1];
  } },

  rust: { size: 256, world: 2, gen: (u, v) => {
    const n = fbm(NA, u * 8, v * 8, 5, 8);
    const p = fbm(NC, u * 20, v * 20, 3, 20);
    const c = mix3([0.22, 0.09, 0.04], [0.5, 0.24, 0.1], n);
    const d = p > 0.62 ? 0.6 : 1;
    return [c[0] * d, c[1] * d, c[2] * d, n * 0.5 + p * 0.5];
  } },

  tilesWhite: { size: 256, world: 1.2, gen: (u, v, x, y) => {
    const tw = 32, tx = Math.floor(x / tw), ty = Math.floor(y / tw);
    const lx = x % tw, ly = y % tw;
    const grout = lx < 2 || ly < 2;
    const id = hash2(tx, ty, 8);
    const dirt = fbm(NA, u * 6, v * 6, 4, 6);
    const grime = smooth(0.5, 0.8, fbm(NB, u * 3, v * 3, 3, 3));
    const missing = id > 0.97;
    if (missing) return [0.16, 0.15, 0.14, 0.15];
    if (grout) return [0.34 - grime * 0.2, 0.33 - grime * 0.2, 0.3 - grime * 0.18, 0.25];
    const b = 0.78 - dirt * 0.14 - grime * 0.35 - id * 0.05;
    return [b * 0.96, b, b * 0.97, 0.75];
  } },

  tilesFloor: { size: 256, world: 1.6, gen: (u, v, x, y) => {
    const tw = 32, tx = Math.floor(x / tw), ty = Math.floor(y / tw);
    const lx = x % tw, ly = y % tw;
    const grout = lx < 1 || ly < 1;
    const dark = (tx + ty) % 2 === 0;
    const dirt = fbm(NA, u * 8, v * 8, 4, 8);
    const b = dark ? 0.12 + dirt * 0.05 : 0.62 - dirt * 0.2;
    if (grout) return [0.2, 0.19, 0.18, 0.2];
    return [b, b * 0.98, b * 0.94, 0.7];
  } },

  carpet: { size: 256, world: 1.6, gen: (u, v) => {
    const a = Math.abs(((u * 8 + v * 8) % 1) - 0.5), b = Math.abs(((u * 8 - v * 8 + 8) % 1) - 0.5);
    const lattice = Math.min(a, b) < 0.04;
    const dot = Math.hypot(((u * 8) % 1) - 0.5, ((v * 8) % 1) - 0.5) < 0.09;
    const wear = fbm(NA, u * 5, v * 5, 4, 5);
    const fibre = fbm(NC, u * 100, v * 100, 1, 100);
    let c = [0.33, 0.035, 0.045];
    if (lattice) c = [0.5, 0.36, 0.14];
    if (dot) c = [0.1, 0.09, 0.14];
    const d = 0.8 + fibre * 0.3 + smooth(0.6, 0.8, wear) * 0.25;
    return [c[0] * d, c[1] * d, c[2] * d, 0.5 + fibre * 0.2];
  } },

  damask: { size: 256, world: 1.0, gen: (u, v) => {
    const cu = (u * 3) % 1, cv = (v * 2 + (Math.floor(u * 3) % 2) * 0.5) % 1;
    let px = Math.abs(cu - 0.5) * 2, py = (cv - 0.5) * 2;
    const r = Math.hypot(px, py), th = Math.atan2(py, px);
    const lobe = 0.42 + 0.18 * Math.cos(th * 5) - 0.1 * py;
    const inner = r < lobe && r > lobe * 0.55;
    const stem = px < 0.06 && py > -0.9 && py < 0.9;
    const motif = inner || stem || (Math.hypot(px, py + 0.72) < 0.1);
    const n = fbm(NA, u * 6, v * 6, 4, 6);
    const stain = smooth(0.55, 0.8, fbm(NB, u * 2, v * 2, 3, 2));
    let c = motif ? [0.28, 0.2, 0.09] : [0.2, 0.04, 0.05];
    const d = 0.85 + n * 0.25 - stain * 0.4;
    return [c[0] * d, c[1] * d, c[2] * d, motif ? 0.65 : 0.5];
  } },

  salt: { size: 256, world: 2, gen: (u, v) => {
    const vo = voronoi(u, v, 10, 3);
    const n = fbm(NA, u * 10, v * 10, 3, 10);
    const edge = smooth(0.0, 0.08, vo.edge);
    const base = mix3([0.55, 0.5, 0.52], [0.86, 0.82, 0.8], vo.id * 0.6 + n * 0.4);
    const tint = mix3(base, [0.85, 0.66, 0.66], smooth(0.6, 0.9, vo.id) * 0.5);
    const b = 0.65 + edge * 0.35;
    return [tint[0] * b, tint[1] * b, tint[2] * b, 0.3 + edge * 0.6 + n * 0.1];
  } },

  rock: { size: 256, world: 3, gen: (u, v) => {
    const n = fbm(NA, u * 6, v * 6, 6, 6);
    const r = 1 - Math.abs(fbm(NB, u * 4, v * 4, 4, 4) * 2 - 1);
    const b = 0.14 + n * 0.14 + r * 0.06;
    return [b * 1.05, b, b * 0.92, n * 0.6 + r * 0.4];
  } },

  flesh: { size: 256, world: 1.8, gen: (u, v) => {
    const n = fbm(NA, u * 6, v * 6, 5, 6);
    const vein = Math.pow(1 - Math.abs(fbm(NB, u * 5, v * 5, 4, 5) * 2 - 1), 10);
    const vein2 = Math.pow(1 - Math.abs(fbm(NC, u * 11, v * 11, 3, 11) * 2 - 1), 16);
    const vo = voronoi(u, v, 7, 9);
    const c = mix3([0.22, 0.03, 0.035], [0.45, 0.1, 0.1], n);
    const vc = mix3(c, [0.12, 0.02, 0.09], vein * 0.9);
    const bulge = 1 - smooth(0, 0.5, vo.d1);
    return [vc[0] + vein2 * 0.25, vc[1] + vein2 * 0.04, vc[2] + vein2 * 0.05, 0.3 + bulge * 0.5 + vein * 0.2];
  } },

  bone: { size: 128, world: 0.8, gen: (u, v, x, y) => {
    const n = fbm(NA, u * 8, v * 8, 4, 8);
    const pore = hash2(x, y, 12) > 0.985 ? 0.2 : 0;
    const dirt = smooth(0.55, 0.8, fbm(NB, u * 3, v * 3, 3, 3));
    const b = 0.72 + n * 0.12 - pore - dirt * 0.3;
    return [b, b * 0.93, b * 0.78, 0.6 + n * 0.3 - pore * 2];
  } },

  asphalt: { size: 256, world: 3, gen: (u, v, x, y) => {
    const n = fbm(NA, u * 12, v * 12, 4, 12);
    const sp = hash2(x, y, 14);
    const crack = Math.abs(fbm(NB, u * 4, v * 4, 5, 4) - 0.5) < 0.006;
    let b = 0.1 + n * 0.06 + (sp > 0.9 ? 0.06 : 0);
    if (crack) b = 0.03;
    return [b, b, b * 1.02, crack ? 0.1 : 0.5 + sp * 0.2];
  } },

  rubber: { size: 128, world: 1, gen: (u, v, x, y) => {
    const d = ((x % 16 < 8) !== (y % 16 < 8)) ? 0.02 : 0;
    const n = fbm(NA, u * 8, v * 8, 3, 8);
    const b = 0.08 + n * 0.04 + d;
    return [b, b, b, 0.5 + d * 10];
  } },

  grate: { size: 128, world: 1, gen: (u, v, x, y) => {
    const hole = (x % 16 > 3) && (y % 16 > 3);
    const n = fbm(NC, u * 4, v * 4, 3, 4);
    if (hole) return [0.02, 0.02, 0.02, 0.0];
    const c = mix3([0.28, 0.27, 0.25], [0.35, 0.18, 0.08], smooth(0.5, 0.7, n));
    return [...c, 0.9];
  } },

  ceiling: { size: 128, world: 1.2, gen: (u, v, x, y) => {
    const edge = (x % 64 < 2) || (y % 64 < 2);
    const hole = hash2(x, y, 21) > 0.93 ? 0.08 : 0;
    const stain = smooth(0.55, 0.75, fbm(NA, u * 3, v * 3, 3, 3));
    if (edge) return [0.18, 0.18, 0.17, 0.2];
    const b = 0.55 - hole - stain * 0.25;
    return [b, b * 0.98, b * 0.9, 0.6 - hole * 3];
  } },

  fabric: { size: 128, world: 0.5, gen: (u, v, x, y) => {
    const w = ((x + y) % 4 < 2) ? 0.04 : -0.04;
    const n = fbm(NA, u * 6, v * 6, 3, 6);
    const b = 0.5 + w + n * 0.1;
    return [b, b, b, 0.5 + w * 3];
  } },

  paper: { size: 128, world: 0.3, gen: (u, v) => {
    const n = fbm(NA, u * 5, v * 5, 4, 5);
    const b = 0.78 + n * 0.12;
    return [b, b * 0.93, b * 0.75, 0.5];
  } },

  // Serverschrank-Front mit LEDs (emissiv)
  server: { size: 128, world: 0.8, emissive: true, gen: (u, v, x, y) => {
    const unit = 8, uy = Math.floor(y / unit), ly = y % unit;
    const slot = ly === 0;
    const vent = (x > 70 && x < 120 && ly > 2 && ly < 6 && x % 3 === 0);
    const ledX = 10 + (hash2(uy, 1, 30) * 3 | 0) * 6;
    const isLed = ly === 4 && x >= ledX && x < ledX + 2;
    const lh = hash2(uy, 2, 30);
    let b = 0.08 + (slot ? -0.05 : 0) + (vent ? -0.05 : 0);
    const n = fbm(NA, u * 4, v * 16, 2, 4) * 0.04;
    if (isLed) {
      const col = lh > 0.7 ? [1, 0.55, 0.1] : lh > 0.25 ? [0.2, 1, 0.35] : [1, 0.1, 0.1];
      return [...col, 0.8, ...col];
    }
    return [b + n, b + n, b + n * 1.2, slot ? 0.2 : 0.6];
  } },

  // Regal mit Stimmwalzen und Akten
  shelf: { size: 256, world: 2, gen: (u, v, x, y) => {
    const boardH = 64, ly = y % boardH;
    if (ly < 5) { const n = fbm(NA, u * 8, v * 2, 2, 8); return [0.2 + n * 0.1, 0.1 + n * 0.05, 0.05, 0.9]; }
    const row = Math.floor(y / boardH);
    const kind = hash2(row, 3, 40);
    if (kind < 0.55) {
      // Walzenenden (Kreise)
      const cw = 20, cx = x % cw, cid = Math.floor(x / cw);
      const d = Math.hypot(cx - cw / 2, ly - 38);
      const present = hash2(cid, row, 41) > 0.12;
      if (present && d < 8.5) {
        const c = hash2(cid, row, 42) > 0.5 ? [0.35, 0.22, 0.12] : [0.12, 0.1, 0.09];
        const ring = d > 7 ? 0.7 : 1;
        return [c[0] * ring, c[1] * ring, c[2] * ring, 0.9 - d / 20];
      }
      return [0.03, 0.025, 0.02, 0.1];
    }
    // Aktenkartons mit Etikett
    const bw = 32 + (hash2(row, 5, 43) * 16 | 0), bx = x % bw, bid = Math.floor(x / bw);
    if (ly < 12 || bx < 2) return [0.03, 0.025, 0.02, 0.1];
    const shade = 0.55 + hash2(bid, row, 44) * 0.25;
    const label = bx > bw * 0.25 && bx < bw * 0.75 && ly > 26 && ly < 36;
    if (label) return [0.8, 0.76, 0.62, 0.8];
    return [0.45 * shade, 0.36 * shade, 0.24 * shade, 0.7];
  } },

  // Fassade der Alten Stadt mit Fenstern (emissiv)
  facade: { size: 256, world: 8, emissive: true, gen: (u, v, x, y) => {
    const fx = 32, fy = 32;
    const cx = Math.floor(x / fx), cy = Math.floor(y / fy);
    const lx = x % fx, ly = y % fy;
    const win = lx > 7 && lx < 25 && ly > 6 && ly < 26;
    const n = fbm(NA, u * 8, v * 8, 3, 8);
    if (win) {
      const lit = hash2(cx, cy, 50);
      const frame = lx === 16 || ly === 16;
      if (frame) return [0.05, 0.05, 0.05, 0.4];
      if (lit > 0.82) {
        const col = lit > 0.95 ? [0.4, 0.9, 1.0] : lit > 0.9 ? [1.0, 0.3, 0.6] : [1.0, 0.72, 0.4];
        const k = 0.5 + n * 0.5;
        return [col[0] * 0.5, col[1] * 0.5, col[2] * 0.5, 0.3, col[0] * k, col[1] * k, col[2] * k];
      }
      return [0.04 + n * 0.03, 0.05 + n * 0.03, 0.07 + n * 0.03, 0.3];
    }
    const b = 0.18 + n * 0.08;
    return [b, b * 0.96, b * 0.92, 0.6];
  } },

  // Wasseroberfläche (nur Bump)
  water: { size: 256, world: 4, gen: (u, v) => {
    const n = fbm(NA, u * 6, v * 6, 4, 6);
    const r = fbm(NB, u * 14, v * 14, 2, 14);
    return [0.03, 0.06, 0.07, n * 0.6 + r * 0.4];
  } },

  hologram: { size: 64, world: 1, gen: (u, v, x, y) => {
    const s = y % 4 < 2 ? 1 : 0.4;
    return [s, s, s, 0.5];
  } },
};

// ----------------------------------------------------------------------------

export function getTexture(name) {
  if (cache.has(name)) return cache.get(name);
  const def = DEFS[name];
  if (!def) throw new Error('Unbekannte Textur: ' + name);
  const t = generate(def.size, def.size, def.gen, { bump: true, emissive: !!def.emissive });
  t.world = def.world;
  const rep = 1 / def.world;
  t.map.repeat.set(rep, rep);
  if (t.bump) t.bump.repeat.set(rep, rep);
  if (t.emissive) t.emissive.repeat.set(rep, rep);
  cache.set(name, t);
  return t;
}

export function textureNames() { return Object.keys(DEFS); }

// ----------------------------------------------------------------------------
// Sprites & Spezialtexturen
// ----------------------------------------------------------------------------

export function glowTexture() {
  if (cache.has('_glow')) return cache.get('_glow');
  const c = mkCanvas(64, 64), g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = toTex(c, { nearest: false, wrap: false });
  cache.set('_glow', t);
  return t;
}

export function flameTexture() {
  if (cache.has('_flame')) return cache.get('_flame');
  const c = mkCanvas(32, 64), g = c.getContext('2d');
  const grd = g.createRadialGradient(16, 44, 1, 16, 40, 22);
  grd.addColorStop(0, 'rgba(255,250,220,1)');
  grd.addColorStop(0.3, 'rgba(255,190,80,0.95)');
  grd.addColorStop(0.7, 'rgba(255,90,20,0.35)');
  grd.addColorStop(1, 'rgba(255,60,0,0)');
  g.fillStyle = grd;
  g.beginPath();
  g.moveTo(16, 2);
  g.bezierCurveTo(30, 28, 28, 58, 16, 62);
  g.bezierCurveTo(4, 58, 2, 28, 16, 2);
  g.fill();
  const t = toTex(c, { nearest: false, wrap: false });
  cache.set('_flame', t);
  return t;
}

// Lichtkegel-Muster der Taschenlampe (Ringe + Hotspot + Staub)
export function flashlightCookie() {
  if (cache.has('_cookie')) return cache.get('_cookie');
  const S = 256, c = mkCanvas(S, S), g = c.getContext('2d');
  const d = g.createImageData(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x - S / 2) / (S / 2), dy = (y - S / 2) / (S / 2);
    const r = Math.hypot(dx, dy);
    let v = 1 - smooth(0.55, 1.0, r);
    v *= 0.9 + 0.1 * Math.cos(r * 38) * (1 - r);          // Reflektorringe
    v += (1 - smooth(0.0, 0.28, r)) * 0.45;                 // Hotspot
    v *= 0.9 + fbm(NA, x / 24, y / 24, 3, 256) * 0.2;       // Schmutz auf der Linse
    if (r > 0.18 && r < 0.2) v *= 0.8;
    const b = clamp(v) * 255;
    const i = (y * S + x) * 4;
    d.data[i] = b; d.data[i + 1] = b * 0.96; d.data[i + 2] = b * 0.86; d.data[i + 3] = 255;
  }
  g.putImageData(d, 0, 0);
  const t = toTex(c, { nearest: false, wrap: false });
  cache.set('_cookie', t);
  return t;
}

// Das Zifferblatt – heiliges Symbol der Kirche
export function drawDialSymbol(g, cx, cy, r, color = '#d9b36a', needle = -0.6, lineW = 0) {
  const lw = lineW || Math.max(2, r * 0.09);
  g.save();
  g.strokeStyle = color; g.fillStyle = color; g.lineWidth = lw; g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy, r, Math.PI, 0); g.stroke();
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI + (i / 8) * Math.PI;
    const r1 = r * 0.78, r2 = r * (i % 4 === 0 ? 0.62 : 0.7);
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); g.stroke();
  }
  const a = -Math.PI / 2 + needle;
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92); g.stroke();
  g.beginPath(); g.arc(cx, cy, lw * 1.2, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(cx - r * 1.05, cy); g.lineTo(cx + r * 1.05, cy); g.stroke();
  g.restore();
}

// Text-/Schildertextur. lines: [{text, font, color, glow}], bg: Farbe oder null
export function textTexture(w, h, draw, { srgb = true, nearest = false } = {}) {
  const c = mkCanvas(w, h), g = c.getContext('2d');
  draw(g, w, h);
  const t = toTex(c, { srgb, nearest, wrap: false });
  t.canvas = c;
  return t;
}

export function neonSign(text, { color = '#ff3a8c', w = 512, h = 128, font = '600 72px "Cormorant Garamond", serif', bg = null } = {}) {
  return textTexture(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 18;
    g.fillStyle = color;
    g.fillText(text, w / 2, h / 2);
    g.shadowBlur = 6; g.fillStyle = '#fff';
    g.globalAlpha = 0.7; g.fillText(text, w / 2, h / 2);
  });
}

// Pergament-Plakat (Proklamation, Katechismus …)
export function posterTexture({ title, lines = [], w = 256, h = 360, paper = '#c9b48a', ink = '#2a1a10', accent = '#7a1010', dial = true }) {
  return textTexture(w, h, (g) => {
    g.fillStyle = paper; g.fillRect(0, 0, w, h);
    const d = g.getImageData(0, 0, w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const n = fbm(NA, x / 30, y / 30, 3, 256);
      const edge = Math.min(x, y, w - x, h - y) / 30;
      const k = (0.75 + n * 0.35) * (0.7 + clamp(edge) * 0.3);
      const i = (y * w + x) * 4;
      d.data[i] *= k; d.data[i + 1] *= k; d.data[i + 2] *= k;
    }
    g.putImageData(d, 0, 0);
    g.strokeStyle = ink; g.lineWidth = 3; g.strokeRect(10, 10, w - 20, h - 20);
    g.lineWidth = 1; g.strokeRect(15, 15, w - 30, h - 30);
    let y = 34;
    if (dial) { drawDialSymbol(g, w / 2, y + 26, 22, accent, -0.5); y += 46; }
    g.fillStyle = accent; g.textAlign = 'center';
    g.font = '700 22px "Cormorant Garamond", serif';
    for (const t of String(title).split('\n')) { g.fillText(t, w / 2, y); y += 24; }
    y += 6;
    g.fillStyle = ink; g.font = '14px "Special Elite", monospace';
    for (const l of lines) { g.fillText(l, w / 2, y); y += 18; }
  });
}

// Heiligenbild (Ikone) – golden, Figur mit Nimbus, Gesicht ausgespart
export function iconTexture(kind = 'erbauer', w = 128, h = 192) {
  const key = '_icon_' + kind;
  if (cache.has(key)) return cache.get(key);
  const t = textTexture(w, h, (g) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    grd.addColorStop(0, '#6b4a14'); grd.addColorStop(0.5, '#b88a2e'); grd.addColorStop(1, '#4a300c');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#2a1a06'; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = 'rgba(255,230,160,0.55)';
    g.beginPath(); g.arc(w / 2, h * 0.32, w * 0.24, 0, Math.PI * 2); g.fill();
    g.fillStyle = kind === 'ilse' ? '#e8e2d6' : '#1d130c';
    g.beginPath();
    g.moveTo(w / 2, h * 0.2);
    g.quadraticCurveTo(w * 0.85, h * 0.55, w * 0.78, h * 0.95);
    g.lineTo(w * 0.22, h * 0.95);
    g.quadraticCurveTo(w * 0.15, h * 0.55, w / 2, h * 0.2);
    g.fill();
    g.fillStyle = '#e9d9b8';
    g.beginPath(); g.ellipse(w / 2, h * 0.32, w * 0.1, w * 0.13, 0, 0, Math.PI * 2); g.fill();
    if (kind === 'erbauer') drawDialSymbol(g, w / 2, h * 0.7, w * 0.16, '#d9b36a', 0.9);
    if (kind === 'ilse') { g.fillStyle = '#b88a2e'; g.beginPath(); g.arc(w / 2, h * 0.66, 5, 0, Math.PI * 2); g.fill(); }
  });
  cache.set(key, t);
  return t;
}

// Kreideschrift an Wänden (Stumme)
export function chalkTexture(text, { w = 512, h = 256, size = 44 } = {}) {
  return textTexture(w, h, (g) => {
    g.clearRect(0, 0, w, h);
    g.font = `${size}px "Caveat", cursive`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(235,235,225,0.85)';
    const lines = String(text).split('\n');
    lines.forEach((l, i) => {
      const y = h / 2 + (i - (lines.length - 1) / 2) * size * 1.05;
      g.save();
      g.translate(w / 2, y);
      g.rotate((hash2(i, l.length, 60) - 0.5) * 0.06);
      g.fillText(l, 0, 0);
      g.restore();
    });
    // Kreide-Körnung
    const d = g.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 3] > 0 && hash2(i, 7, 61) > 0.72) d.data[i + 3] *= 0.3;
    g.putImageData(d, 0, 0);
  });
}
