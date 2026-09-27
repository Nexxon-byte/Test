// Ebenen-Generator: Gitter aus Zellen (2,5 m). Die Lastkabine belegt 2 × 2 Zellen
// (x = ex−1 … ex, z = ez−1 … ez), davor liegt der Absatz mit 4 × 2 Zellen
// (x = ex−2 … ex+1, z = ez+1 … ez+2). Weltursprung = Kabinenmitte, Tür bei +Z.
// Die Zellgrenze zwischen Kabine und Absatz liegt genau auf der Wand mit dem Etagentor (CAB.LANDING_Z).

import { RNG } from '../core/rng.js';
import { CAB } from './cab.js';

export const CS = 2.5;
export const SOLID = 0, FLOOR = 1, CABIN = 2;
// Versatz Zellmitte → Welt: X-Grenze der beiden Kabinenzellen auf x = 0, Z-Grenze auf LANDING_Z
export const OX = CS / 2;
export const OZ = CAB.LANDING_Z - CS / 2;

export class Grid {
  constructor(w, h) {
    this.w = w; this.h = h;
    this.cells = new Uint8Array(w * h);          // SOLID
    this.room = new Int16Array(w * h).fill(-1);  // Raum-ID (-1 = Gang)
    this.block = new Uint8Array(w * h);          // von Requisiten belegt (für Navigation)
    this.tag = new Array(w * h).fill(null);
    this.ex = Math.floor(w / 2);
    this.ez = 2;
    this.rooms = [];
  }
  idx(x, z) { return z * this.w + x; }
  in(x, z) { return x >= 0 && z >= 0 && x < this.w && z < this.h; }
  get(x, z) { return this.in(x, z) ? this.cells[z * this.w + x] : SOLID; }
  set(x, z, v) { if (this.in(x, z)) this.cells[z * this.w + x] = v; }
  isFloor(x, z) { return this.get(x, z) === FLOOR; }
  walkable(x, z) { return this.get(x, z) === FLOOR && !this.block[z * this.w + x]; }

  // Zelle → Welt (Zellmitte)
  wx(x) { return (x - this.ex) * CS + OX; }
  wz(z) { return (z - this.ez) * CS + OZ; }
  // Welt → Zelle
  cx(x) { return Math.floor((x - OX) / CS + 0.5) + this.ex; }
  cz(z) { return Math.floor((z - OZ) / CS + 0.5) + this.ez; }

  // Liegt die Zelle in der Kabine bzw. auf dem Absatz?
  isCabin(x, z) { return x >= this.ex - 1 && x <= this.ex && z >= this.ez - 1 && z <= this.ez; }
  isLanding(x, z) { return x >= this.ex - 2 && x <= this.ex + 1 && z >= this.ez + 1 && z <= this.ez + 2; }

  carveRect(x0, z0, x1, z1, roomId = -1) {
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
      if (!this.in(x, z) || x === 0 || z === 0 || x === this.w - 1 || z === this.h - 1) continue;
      if (this.get(x, z) === CABIN) continue;
      this.set(x, z, FLOOR);
      if (roomId >= 0) this.room[this.idx(x, z)] = roomId;
    }
  }

  carveLine(x0, z0, x1, z1, width = 1, horizontalFirst = true) {
    const hw = Math.floor((width - 1) / 2), hw2 = width - 1 - hw;
    const hx = (za) => { for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) for (let d = -hw; d <= hw2; d++) this._carveCell(x, za + d); };
    const vz = (xa) => { for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) for (let d = -hw; d <= hw2; d++) this._carveCell(xa + d, z); };
    if (horizontalFirst) { hx(z0); vz(x1); } else { vz(x0); hx(z1); }
  }

  _carveCell(x, z) {
    if (!this.in(x, z) || x === 0 || z === 0 || x === this.w - 1 || z === this.h - 1) return;
    if (this.get(x, z) === CABIN) return;
    // hinter und neben der Kabine bleibt Fels (eine Zelle Rand)
    if (z <= this.ez && x >= this.ex - 2 && x <= this.ex + 1) return;
    this.set(x, z, FLOOR);
  }

  neighbors4(x, z) { return [[x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]]; }

  // Breitensuche: Distanzen vom Treppenabsatz
  distances(fromX = this.ex, fromZ = this.ez + 1, walkOnly = false) {
    const d = new Int32Array(this.w * this.h).fill(-1);
    const q = [[fromX, fromZ]];
    d[this.idx(fromX, fromZ)] = 0;
    let head = 0;
    while (head < q.length) {
      const [x, z] = q[head++];
      const cd = d[this.idx(x, z)];
      for (const [nx, nz] of this.neighbors4(x, z)) {
        if (!this.in(nx, nz) || d[this.idx(nx, nz)] >= 0) continue;
        if (walkOnly ? !this.walkable(nx, nz) : !this.isFloor(nx, nz)) continue;
        d[this.idx(nx, nz)] = cd + 1;
        q.push([nx, nz]);
      }
    }
    return d;
  }

  // Sichtlinie durch das Gitter (DDA), in Weltkoordinaten
  lineOfSight(x0, z0, x1, z1) {
    const gx0 = (x0 - OX) / CS + this.ex + 0.5, gz0 = (z0 - OZ) / CS + this.ez + 0.5;
    const gx1 = (x1 - OX) / CS + this.ex + 0.5, gz1 = (z1 - OZ) / CS + this.ez + 0.5;
    let cx = Math.floor(gx0), cz = Math.floor(gz0);
    const tx = Math.floor(gx1), tz = Math.floor(gz1);
    const dx = gx1 - gx0, dz = gz1 - gz0;
    const sx = dx > 0 ? 1 : -1, sz = dz > 0 ? 1 : -1;
    const tdx = Math.abs(1 / (dx || 1e-9)), tdz = Math.abs(1 / (dz || 1e-9));
    let tmx = (dx > 0 ? (cx + 1 - gx0) : (gx0 - cx)) * tdx;
    let tmz = (dz > 0 ? (cz + 1 - gz0) : (gz0 - cz)) * tdz;
    for (let i = 0; i < 400; i++) {
      const c = this.get(cx, cz);
      if (c === SOLID) return false;
      if (cx === tx && cz === tz) return true;
      if (tmx < tmz) { tmx += tdx; cx += sx; } else { tmz += tdz; cz += sz; }
    }
    return true;
  }

  randomFloorCell(rng, filter = null) {
    for (let i = 0; i < 2000; i++) {
      const x = rng.int(1, this.w - 2), z = rng.int(1, this.h - 2);
      if (this.isFloor(x, z) && (!filter || filter(x, z))) return [x, z];
    }
    return null;
  }
}

// ----------------------------------------------------------------------------
// Pfadsuche (A*, 8 Nachbarn, keine Eckenschnitte) + Glätten
// ----------------------------------------------------------------------------

export function findPath(grid, sx, sz, tx, tz, maxNodes = 4000) {
  const W = grid.w;
  const start = grid.idx(sx, sz), goal = grid.idx(tx, tz);
  if (!grid.walkable(tx, tz) && grid.get(tx, tz) !== FLOOR) return null;
  const g = new Map([[start, 0]]);
  const came = new Map();
  const open = [[0, start]];
  const h = (i) => { const x = i % W, z = (i / W) | 0; return Math.hypot(x - tx, z - tz); };
  let n = 0;
  while (open.length && n++ < maxNodes) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i][0] < open[bi][0]) bi = i;
    const [, cur] = open.splice(bi, 1)[0];
    if (cur === goal) break;
    const cx = cur % W, cz = (cur / W) | 0;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = cx + dx, nz = cz + dz;
      if (!grid.in(nx, nz)) continue;
      const ok = (x, z) => grid.walkable(x, z) || (x === tx && z === tz && grid.isFloor(x, z));
      if (!ok(nx, nz)) continue;
      if (dx && dz && (!ok(cx + dx, cz) || !ok(cx, cz + dz))) continue;
      const ni = grid.idx(nx, nz);
      const cost = g.get(cur) + (dx && dz ? 1.414 : 1);
      if (!g.has(ni) || cost < g.get(ni)) {
        g.set(ni, cost);
        came.set(ni, cur);
        open.push([cost + h(ni), ni]);
      }
    }
  }
  if (!came.has(goal) && start !== goal) return null;
  const path = [];
  let c = goal;
  while (c !== undefined && c !== start) { path.push(c); c = came.get(c); }
  path.reverse();
  return path.map(i => [grid.wx(i % W), grid.wz((i / W) | 0)]);
}

// ----------------------------------------------------------------------------
// Generatoren
// ----------------------------------------------------------------------------

export function generate(style, seed, params = {}) {
  const rng = new RNG(seed);
  const w = params.w ?? 28, h = params.h ?? 28;
  const grid = new Grid(w, h);
  // Kabine (2 × 2)
  for (let z = grid.ez - 1; z <= grid.ez; z++) for (let x = grid.ex - 1; x <= grid.ex; x++) grid.set(x, z, CABIN);
  // Absatz vor dem Etagentor (4 breit, 2 tief)
  const landingId = grid.rooms.length;
  grid.rooms.push({ id: landingId, x0: grid.ex - 2, z0: grid.ez + 1, x1: grid.ex + 1, z1: grid.ez + 2, kind: 'landing' });
  grid.carveRect(grid.ex - 2, grid.ez + 1, grid.ex + 1, grid.ez + 2, landingId);

  const gen = GENERATORS[style] || GENERATORS.rooms;
  gen(grid, rng, params);
  finalize(grid, rng);
  return grid;
}

function roomCenter(r) { return [Math.floor((r.x0 + r.x1) / 2), Math.floor((r.z0 + r.z1) / 2)]; }

function placeRooms(grid, rng, count, minS, maxS, kind = 'room', tries = 400) {
  const out = [];
  for (let t = 0; t < tries && out.length < count; t++) {
    const rw = rng.int(minS, maxS), rh = rng.int(minS, maxS);
    const x0 = rng.int(2, grid.w - rw - 3), z0 = rng.int(3, grid.h - rh - 3);
    const x1 = x0 + rw - 1, z1 = z0 + rh - 1;
    let ok = true;
    for (const r of grid.rooms) {
      if (x0 - 2 <= r.x1 && x1 + 2 >= r.x0 && z0 - 2 <= r.z1 && z1 + 2 >= r.z0) { ok = false; break; }
    }
    if (!ok) continue;
    const id = grid.rooms.length;
    const r = { id, x0, z0, x1, z1, kind };
    grid.rooms.push(r);
    grid.carveRect(x0, z0, x1, z1, id);
    out.push(r);
  }
  return out;
}

// Räume per minimalem Spannbaum + Zusatzkanten verbinden
function connectRooms(grid, rng, rooms, { width = 1, extra = 0.25 } = {}) {
  const all = rooms;
  const connected = new Set([all[0].id]);
  const edges = [];
  while (connected.size < all.length) {
    let best = null;
    for (const a of all) if (connected.has(a.id)) for (const b of all) if (!connected.has(b.id)) {
      const [ax, az] = roomCenter(a), [bx, bz] = roomCenter(b);
      const d = Math.abs(ax - bx) + Math.abs(az - bz);
      if (!best || d < best.d) best = { a, b, d };
    }
    if (!best) break;
    connected.add(best.b.id);
    edges.push([best.a, best.b]);
  }
  // Schleifen – damit man Monstern ausweichen kann
  for (let i = 0; i < all.length * extra; i++) edges.push([rng.pick(all), rng.pick(all)]);
  for (const [a, b] of edges) {
    if (a === b) continue;
    const [ax, az] = roomCenter(a), [bx, bz] = roomCenter(b);
    grid.carveLine(ax, az, bx, bz, width, rng.chance(0.5));
  }
}

const GENERATORS = {
  rooms(grid, rng, p) {
    const rooms = placeRooms(grid, rng, p.rooms ?? 9, p.minRoom ?? 3, p.maxRoom ?? 6);
    connectRooms(grid, rng, [grid.rooms[0], ...rooms], { width: p.corridor ?? 1, extra: p.loops ?? 0.3 });
  },

  halls(grid, rng, p) {
    const halls = placeRooms(grid, rng, p.rooms ?? 4, p.minRoom ?? 6, p.maxRoom ?? 10, 'hall');
    const smalls = placeRooms(grid, rng, p.smallRooms ?? 4, 2, 4, 'room');
    connectRooms(grid, rng, [grid.rooms[0], ...halls, ...smalls], { width: p.corridor ?? 2, extra: p.loops ?? 0.35 });
  },

  // Gewundene Stollen mit Kammern
  tunnels(grid, rng, p) {
    const chambers = placeRooms(grid, rng, p.rooms ?? 7, p.minRoom ?? 2, p.maxRoom ?? 5, 'chamber');
    const nodes = [grid.rooms[0], ...chambers];
    const connected = [nodes[0]];
    for (let i = 1; i < nodes.length; i++) {
      const target = nodes[i];
      let from = connected[0], bd = 1e9;
      for (const c of connected) { const d = Math.hypot(roomCenter(c)[0] - roomCenter(target)[0], roomCenter(c)[1] - roomCenter(target)[1]); if (d < bd) { bd = d; from = c; } }
      wander(grid, rng, roomCenter(from), roomCenter(target), p.wiggle ?? 0.35);
      connected.push(target);
    }
    for (let i = 0; i < (p.loops ?? 2); i++) wander(grid, rng, roomCenter(rng.pick(nodes)), roomCenter(rng.pick(nodes)), p.wiggle ?? 0.35);
  },

  // Straßenraster der Alten Stadt
  city(grid, rng, p) {
    const pitch = p.pitch ?? 5;
    for (let x = 2; x < grid.w - 2; x++) for (let z = 3; z < grid.h - 2; z++) {
      const street = (x % pitch === grid.ex % pitch) || (z % pitch === 3 % pitch);
      if (street) grid._carveCell(x, z);
    }
    // Hauptstraße vom Absatz (2 breit, mittig vor der Kabine)
    grid.carveLine(grid.ex - 1, grid.ez + 1, grid.ex - 1, grid.h - 3, 2);
    // Plätze
    placeRooms(grid, rng, p.plazas ?? 2, 3, 5, 'plaza');
    // Ein paar Läden (kleine Räume an Straßen)
    const shops = placeRooms(grid, rng, p.shops ?? 6, 2, 3, 'shop');
    for (const s of shops) {
      const [cx, cz] = roomCenter(s);
      // zum nächsten Straßenfeld durchbrechen
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        let x = cx, z = cz, k = 0;
        while (k++ < 6 && grid.in(x, z) && !(grid.isFloor(x, z) && grid.room[grid.idx(x, z)] !== s.id)) { grid._carveCell(x, z); x += dx; z += dz; }
        if (k < 6) break;
      }
    }
  },

  // Kirchenschiff: gewaltige Halle + Seitenkapellen
  nave(grid, rng, p) {
    // gerade Breite → das Schiff liegt mittig vor der Kabine (Mitte zwischen ex−1 und ex)
    const nw = p.naveW ?? 8, nl = p.naveL ?? 14;
    const x0 = grid.ex - Math.floor(nw / 2), z0 = grid.ez + 4;
    const id = grid.rooms.length;
    grid.rooms.push({ id, x0, z0, x1: x0 + nw - 1, z1: z0 + nl - 1, kind: 'nave' });
    grid.carveRect(x0, z0, x0 + nw - 1, z0 + nl - 1, id);
    grid.carveLine(grid.ex - 1, grid.ez + 2, grid.ex - 1, z0, 4);
    // Seitenkapellen
    for (let i = 0; i < (p.chapels ?? 6); i++) {
      const side = i % 2 ? 1 : -1;
      const cz = z0 + 1 + Math.floor(i / 2) * 4;
      const cw = 3, cd = 3;
      const cx0 = side > 0 ? x0 + nw + 1 : x0 - cd - 1;
      const cid = grid.rooms.length;
      grid.rooms.push({ id: cid, x0: cx0, z0: cz, x1: cx0 + cd - 1, z1: cz + cw - 1, kind: 'chapel' });
      grid.carveRect(cx0, cz, cx0 + cd - 1, cz + cw - 1, cid);
      grid.carveLine(side > 0 ? x0 + nw - 1 : x0, cz + 1, side > 0 ? cx0 : cx0 + cd - 1, cz + 1, 1);
    }
    // Chor/Apsis am Ende + Umgang
    const aid = grid.rooms.length;
    const az0 = z0 + nl + 1;
    grid.rooms.push({ id: aid, x0: x0 + 1, z0: az0, x1: x0 + nw - 2, z1: az0 + 3, kind: 'apse' });
    grid.carveRect(x0 + 1, az0, x0 + nw - 2, az0 + 3, aid);
    grid.carveLine(grid.ex - 1, z0 + nl - 1, grid.ex - 1, az0, 4);
    const more = placeRooms(grid, rng, p.rooms ?? 3, 3, 5, 'room');
    connectRooms(grid, rng, [grid.rooms[id], ...more], { width: 1, extra: 0.5 });
  },
};

// Zufallsgang (Stollen)
function wander(grid, rng, [x, z], [tx, tz], wiggle) {
  let steps = 0;
  while ((x !== tx || z !== tz) && steps++ < 600) {
    grid._carveCell(x, z);
    if (rng.chance(wiggle)) {
      const [dx, dz] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
      const nx = x + dx, nz = z + dz;
      if (nx > 1 && nz > 2 && nx < grid.w - 2 && nz < grid.h - 2) { x = nx; z = nz; }
    } else if (Math.abs(tx - x) > Math.abs(tz - z)) x += Math.sign(tx - x);
    else z += Math.sign(tz - z);
  }
  grid._carveCell(tx, tz);
}

// Aufräumen: nur mit dem Absatz verbundene Zellen behalten
function finalize(grid, rng) {
  const d = grid.distances();
  for (let z = 0; z < grid.h; z++) for (let x = 0; x < grid.w; x++) {
    const i = grid.idx(x, z);
    if (grid.cells[i] === FLOOR && d[i] < 0) { grid.cells[i] = SOLID; grid.room[i] = -1; }
  }
  // Räume ohne Zellen entfernen
  grid.rooms = grid.rooms.filter(r => {
    for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) if (grid.isFloor(x, z)) return true;
    return false;
  });
  grid.dist = grid.distances();
  // Raumdistanz (für Zielplatzierung)
  for (const r of grid.rooms) {
    const [cx, cz] = roomCenter(r);
    r.dist = grid.dist[grid.idx(cx, cz)];
    if (r.dist < 0) { let best = 1e9; for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) { const dd = grid.dist[grid.idx(x, z)]; if (dd >= 0 && dd < best) best = dd; } r.dist = best; }
    r.cells = [];
    for (let z = r.z0; z <= r.z1; z++) for (let x = r.x0; x <= r.x1; x++) if (grid.isFloor(x, z)) r.cells.push([x, z]);
  }
}

// Wandsegmente einer Zelle (Richtungen, in denen Fels angrenzt)
export const DIRS = [
  { dx: 1, dz: 0, name: 'E' },
  { dx: -1, dz: 0, name: 'W' },
  { dx: 0, dz: 1, name: 'S' },
  { dx: 0, dz: -1, name: 'N' },
];
