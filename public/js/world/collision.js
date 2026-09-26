// Kollision: Achsparallele Boxen (AABB) in einem räumlichen Hash.
// Spieler & Monster sind Kreise auf der XZ-Ebene.

const CELL = 2;

export class CollisionWorld {
  constructor() {
    this.boxes = new Set();
    this.hash = new Map();
  }

  _key(ix, iz) { return ix * 73856093 ^ iz * 19349663; }

  add(box) {
    if (box.enabled === undefined) box.enabled = true;
    this.boxes.add(box);
    box._keys = [];
    const x0 = Math.floor(box.minX / CELL), x1 = Math.floor(box.maxX / CELL);
    const z0 = Math.floor(box.minZ / CELL), z1 = Math.floor(box.maxZ / CELL);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const k = this._key(ix, iz);
      if (!this.hash.has(k)) this.hash.set(k, []);
      this.hash.get(k).push(box);
      box._keys.push(k);
    }
    return box;
  }

  addAll(list) { for (const b of list) this.add(b); }

  remove(box) {
    if (!this.boxes.delete(box)) return;
    for (const k of box._keys || []) {
      const arr = this.hash.get(k);
      if (!arr) continue;
      const i = arr.indexOf(box);
      if (i >= 0) arr.splice(i, 1);
    }
  }

  removeTagged(tag) {
    for (const b of [...this.boxes]) if (b.tag === tag) this.remove(b);
  }

  clear() { this.boxes.clear(); this.hash.clear(); }

  query(minX, minZ, maxX, maxZ, out = []) {
    out.length = 0;
    const seen = new Set();
    const x0 = Math.floor(minX / CELL), x1 = Math.floor(maxX / CELL);
    const z0 = Math.floor(minZ / CELL), z1 = Math.floor(maxZ / CELL);
    for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
      const arr = this.hash.get(this._key(ix, iz));
      if (!arr) continue;
      for (const b of arr) if (b.enabled && !seen.has(b)) { seen.add(b); out.push(b); }
    }
    return out;
  }

  // Schiebt einen Kreis (pos.x, pos.z, r) aus allen Boxen heraus, die die Höhe [y0, y1] schneiden
  resolveCircle(pos, r, y0 = 0.1, y1 = 1.7) {
    let hit = false;
    const list = this.query(pos.x - r - 0.1, pos.z - r - 0.1, pos.x + r + 0.1, pos.z + r + 0.1, this._tmp || (this._tmp = []));
    for (let iter = 0; iter < 3; iter++) {
      let moved = false;
      for (const b of list) {
        if (b.maxY < y0 || b.minY > y1) continue;
        const cx = Math.max(b.minX, Math.min(pos.x, b.maxX));
        const cz = Math.max(b.minZ, Math.min(pos.z, b.maxZ));
        let dx = pos.x - cx, dz = pos.z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= r * r) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const push = r - d;
          pos.x += (dx / d) * push;
          pos.z += (dz / d) * push;
        } else {
          // Mittelpunkt steckt in der Box: kürzester Ausweg
          const l = pos.x - b.minX, rr = b.maxX - pos.x, t = pos.z - b.minZ, bt = b.maxZ - pos.z;
          const m = Math.min(l, rr, t, bt);
          if (m === l) pos.x = b.minX - r; else if (m === rr) pos.x = b.maxX + r;
          else if (m === t) pos.z = b.minZ - r; else pos.z = b.maxZ + r;
        }
        moved = hit = true;
      }
      if (!moved) break;
    }
    return hit;
  }

  // Strecke vs. Boxen (für Sichtlinien). Gibt true zurück, wenn frei.
  lineClear(x0, z0, x1, z1, y = 1.5) {
    const list = this.query(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), this._tmp2 || (this._tmp2 = []));
    const dx = x1 - x0, dz = z1 - z0;
    for (const b of list) {
      if (b.maxY < y || b.minY > y || b.noSight) continue;
      // Slab-Test
      let tmin = 0, tmax = 1;
      if (Math.abs(dx) < 1e-9) { if (x0 < b.minX || x0 > b.maxX) continue; }
      else {
        let ta = (b.minX - x0) / dx, tb = (b.maxX - x0) / dx;
        if (ta > tb) [ta, tb] = [tb, ta];
        tmin = Math.max(tmin, ta); tmax = Math.min(tmax, tb);
        if (tmin > tmax) continue;
      }
      if (Math.abs(dz) < 1e-9) { if (z0 < b.minZ || z0 > b.maxZ) continue; }
      else {
        let ta = (b.minZ - z0) / dz, tb = (b.maxZ - z0) / dz;
        if (ta > tb) [ta, tb] = [tb, ta];
        tmin = Math.max(tmin, ta); tmax = Math.min(tmax, tb);
        if (tmin > tmax) continue;
      }
      return false;
    }
    return true;
  }

  pointFree(x, z, r = 0.3, y0 = 0.1, y1 = 1.7) {
    const list = this.query(x - r, z - r, x + r, z + r, this._tmp3 || (this._tmp3 = []));
    for (const b of list) {
      if (b.maxY < y0 || b.minY > y1) continue;
      const cx = Math.max(b.minX, Math.min(x, b.maxX));
      const cz = Math.max(b.minZ, Math.min(z, b.maxZ));
      if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) return false;
    }
    return true;
  }
}
