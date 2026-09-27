// Lädt CC0-Texturen (Poly Haven, gemeinfrei) nach public/assets/tex/<material>/
// und schreibt ein Manifest, das gfx/materials.js beim Start liest.
//   node tools/fetch-assets.mjs            (fehlende laden)
//   node tools/fetch-assets.mjs --force    (alle neu)
// Lizenz: CC0 1.0 – frei für kommerzielle Nutzung, keine Namensnennung nötig (wir nennen sie trotzdem in CREDITS.md).

import { mkdirSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'tex');
const FORCE = process.argv.includes('--force');
const RES = '1k';

// Material (unser Name) → Poly-Haven-ID. world = Kachelgröße in Metern (überschreibt die Angabe der Quelle)
const SETS = [
  ['concrete', 'concrete_wall_006', 3],
  ['concreteFloor', 'concrete_floor_worn_001', 3],
  ['stone', 'church_bricks_02', 3],
  ['stoneDark', 'castle_wall_slates', 3],
  ['stoneWet', 'cobblestone_floor_04', 2.5],
  ['brick', 'medieval_red_brick', 2.5],
  ['plaster', 'worn_plaster_wall', 3],
  ['marble', 'marble_01', 2],
  ['wood', 'dark_wood', 1.5],
  ['woodPanel', 'dark_paneled_wood', 2],
  ['woodPlanks', 'dark_wooden_planks', 2],
  ['walnut', 'black_walnut_veneer_01', 1],
  ['steel', 'metal_plate', 2],
  ['steelPanel', 'blue_metal_plate', 2],
  ['rust', 'rusty_metal_02', 2],
  ['tilesWhite', 'dirty_tiles', 1.5],
  ['tilesFloor', 'worn_tile_floor', 2],
  ['carpet', 'dirty_carpet', 2],
  ['rock', 'dark_rock', 4],
  ['asphalt', 'asphalt_02', 4],
  ['fabric', 'rough_linen', 0.8],
  ['leather', 'brown_leather', 0.8],
  ['grate', 'metal_grate_rusty', 1.5],
  ['brassBase', 'metal_plate_02', 1],
];

const MAPS = { col: 'Diffuse', nor: 'nor_gl', rough: 'Rough' };

async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'TIEFER-asset-fetch' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function download(url, file) {
  const r = await fetch(url, { headers: { 'User-Agent': 'TIEFER-asset-fetch' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(file, buf);
  return buf.length;
}

const manifest = {};
const credits = [];
let bytes = 0;
for (const [name, id, world] of SETS) {
  const dir = join(OUT, name);
  mkdirSync(dir, { recursive: true });
  try {
    const files = await json(`https://api.polyhaven.com/files/${id}`);
    const info = await json(`https://api.polyhaven.com/info/${id}`);
    const entry = { id, world, maps: {} };
    for (const [key, src] of Object.entries(MAPS)) {
      const f = files[src]?.[RES]?.jpg;
      if (!f) continue;
      const file = join(dir, `${key}.jpg`);
      if (FORCE || !existsSync(file) || statSync(file).size < 1000) bytes += await download(f.url, file);
      entry.maps[key] = `assets/tex/${name}/${key}.jpg`;
    }
    manifest[name] = entry;
    credits.push(`- ${name}: „${info.name}“ (${id}) von ${Object.keys(info.authors || {}).join(', ')} · polyhaven.com · CC0`);
    console.log('✓', name.padEnd(14), id);
  } catch (e) {
    console.log('✗', name.padEnd(14), id, e.message);
  }
}
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
writeFileSync(join(ROOT, 'public', 'assets', 'CREDITS.md'), `# Fremd-Assets (alle CC0 / gemeinfrei)\n\nTexturen von Poly Haven (https://polyhaven.com), Lizenz CC0 1.0.\n\n${credits.join('\n')}\n`);
console.log(`fertig · ${(bytes / 1e6).toFixed(1)} MB neu geladen`);
