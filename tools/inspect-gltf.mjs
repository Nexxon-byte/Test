// Einzelteile eines glTF-Modells mit Maßen auflisten (für Baukästen wie modular_urban_apartments_facade).
//   node tools/inspect-gltf.mjs <modell-id | pfad.gltf> [filter]
// Ausgabe je Knoten: Name · Größe (B × H × T in m, glTF-Achsen x/y/z) · Mitte · Unterkante
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const [,, arg, filter = ''] = process.argv;
const file = existsSync(arg) ? arg : join(ROOT, 'public/assets/models', arg, arg + '.gltf');
const g = JSON.parse(readFileSync(file, 'utf8'));

const mul = (a, b) => { const r = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) r[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return r; };
const trs = (n) => {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
  return [(1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0, tx, ty, tz, 1];
};
const apply = (m, [x, y, z]) => [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];

const rows = [];
function walk(idx, parent, path) {
  const n = g.nodes[idx];
  const m = mul(parent, trs(n));
  const name = n.name || `node${idx}`;
  if (n.mesh !== undefined) {
    const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    for (const p of g.meshes[n.mesh].primitives) {
      const a = g.accessors[p.attributes.POSITION];
      for (const cx of [a.min[0], a.max[0]]) for (const cy of [a.min[1], a.max[1]]) for (const cz of [a.min[2], a.max[2]]) {
        const v = apply(m, [cx, cy, cz]);
        for (let i = 0; i < 3; i++) { lo[i] = Math.min(lo[i], v[i]); hi[i] = Math.max(hi[i], v[i]); }
      }
    }
    const mats = [...new Set(g.meshes[n.mesh].primitives.map(p => g.materials?.[p.material]?.name))].join(',');
    rows.push({ name: path ? `${path}/${name}` : name, size: hi.map((h, i) => h - lo[i]), center: hi.map((h, i) => (h + lo[i]) / 2), bottom: lo[1], mats });
  }
  for (const c of n.children || []) walk(c, m, n.mesh === undefined && !g.scenes[0].nodes.includes(idx) ? (path ? `${path}/${name}` : name) : (path || ''));
}
const I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
for (const r of g.scenes[g.scene || 0].nodes) walk(r, I, '');
const f = (v) => v.map(x => x.toFixed(2)).join(' × ');
for (const r of rows.filter(r => r.name.toLowerCase().includes(filter.toLowerCase())))
  console.log(`${r.name.padEnd(46)} ${f(r.size).padEnd(22)} Mitte ${r.center.map(x => x.toFixed(2)).join(', ').padEnd(22)} unten ${r.bottom.toFixed(2)}  [${r.mats}]`);
console.log(`${rows.length} Teile · Materialien: ${(g.materials || []).map(m => m.name).join(', ')}`);
