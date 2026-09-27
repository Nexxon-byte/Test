// Benutzen-System: Was liegt im Blick und nah genug? Zeigt den Hinweis, löst „E“ aus.

import * as THREE from 'three';

const _v = new THREE.Vector3();

export class Interactions {
  constructor() {
    this.list = new Set();
    this.best = null;
  }

  // { pos: Vector3 | () => Vector3, radius, maxDist, prompt: string | () => string, key, sub, enabled(), onUse(), tag, priority }
  add(entry) {
    const e = { radius: 0.4, maxDist: 2.4, key: 'E', priority: 0, enabled: () => true, ...entry };
    this.list.add(e);
    return e;
  }

  remove(e) { this.list.delete(e); if (this.best === e) this.best = null; }
  removeTag(tag) { for (const e of [...this.list]) if (e.tag === tag) this.remove(e); }

  // camPos, camDir (normalisiert), losFn(from, to) → true wenn frei
  update(camPos, camDir, losFn = null) {
    let best = null, bestScore = Infinity;
    for (const e of this.list) {
      if (!e.enabled()) continue;
      const p = typeof e.pos === 'function' ? e.pos() : e.pos;
      if (!p) continue;
      _v.subVectors(p, camPos);
      const t = _v.dot(camDir);
      if (t < 0.05 || t > e.maxDist) continue;
      const perp = Math.sqrt(Math.max(0, _v.lengthSq() - t * t));
      const allow = e.radius + t * 0.06;
      if (perp > allow) continue;
      const score = perp / allow + t * 0.15 - e.priority;
      if (score < bestScore) {
        if (losFn && !losFn(camPos, p)) continue;
        best = e; bestScore = score;
      }
    }
    this.best = best;
    return best;
  }

  promptOf(e) {
    if (!e) return null;
    return { text: typeof e.prompt === 'function' ? e.prompt() : e.prompt, key: e.key, sub: typeof e.sub === 'function' ? e.sub() : (e.sub || '') };
  }
}
