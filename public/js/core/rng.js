// Deterministischer Zufall – damit jede:r im Koop dieselbe Ebene sieht.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class RNG {
  constructor(seed = 1) {
    this.seed = seed >>> 0;
    this.next = mulberry32(this.seed);
  }
  float(min = 0, max = 1) { return min + (max - min) * this.next(); }
  int(min, max) { return Math.floor(this.float(min, max + 1)); }        // inklusive max
  chance(p) { return this.next() < p; }
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  sign() { return this.next() < 0.5 ? -1 : 1; }
  fork(salt) { return new RNG(hashStr(String(this.seed) + ':' + salt)); }
}

export function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Wert-Rauschen für Texturen & Animation
export function makeNoise2D(seed = 1) {
  const r = mulberry32(seed);
  const perm = new Uint8Array(512);
  const vals = new Float32Array(256);
  for (let i = 0; i < 256; i++) { perm[i] = i; vals[i] = r(); }
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 256; i++) perm[i + 256] = perm[i];
  const fade = t => t * t * (3 - 2 * t);
  // periodisch mit Periode p (für kachelbare Texturen)
  return function noise(x, y, p = 256) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = ((xi % p) + p) % p, y0 = ((yi % p) + p) % p;
    const x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
    const v00 = vals[perm[(perm[x0 & 255] + y0) & 511] & 255];
    const v10 = vals[perm[(perm[x1 & 255] + y0) & 511] & 255];
    const v01 = vals[perm[(perm[x0 & 255] + y1) & 511] & 255];
    const v11 = vals[perm[(perm[x1 & 255] + y1) & 511] & 255];
    const u = fade(xf), v = fade(yf);
    return (v00 * (1 - u) + v10 * u) * (1 - v) + (v01 * (1 - u) + v11 * u) * v;
  };
}

export function fbm(noise, x, y, octaves = 4, period = 256) {
  let sum = 0, amp = 0.5, freq = 1, norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise(x * freq, y * freq, period * freq);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

export const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const damp = (a, b, lambda, dt) => lerp(a, b, 1 - Math.exp(-lambda * dt));
