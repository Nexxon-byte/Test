// Lädt CC0-Figuren (Quaternius, über poly.pizza) nach public/assets/chars/<name>.glb
//   node tools/fetch-chars.mjs
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'chars');
mkdirSync(OUT, { recursive: true });
const UA = { 'User-Agent': 'Mozilla/5.0 (TIEFER asset fetch)' };

// name → poly.pizza-ID (alle Quaternius, CC0, Skelett „CharacterArmature“)
const CHARS = {
  worker: 'Yg2bQZO6Hj', business: 'JFrLIKqvCH', punk: 'BTALZymknF', punk2: 'djXoqejw6w', farmer: '7pn3R6hPvE',
  casual: 'kZ3DmIoGip', hoodie: 'gKLBoRsyKe', hooded: 'y9KWOVG21R', adventurer: 'ZwF0K7WBmu', adventurer2: '5EGWBMpuXq', woman: 'qJ2gsTUBHL',
};

const manPath = join(OUT, 'manifest.json');
const man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {};
for (const [name, id] of Object.entries(CHARS)) {
  try {
    const html = await (await fetch(`https://poly.pizza/m/${id}`, { headers: UA })).text();
    const glb = (html.match(/https:\/\/static\.poly\.pizza\/[0-9a-f-]+\.glb/) || [])[0];
    const title = (html.match(/<title[^>]*>([^<]+)</) || [])[1]?.replace(' - Poly Pizza', '') || name;
    if (!glb) throw new Error('kein GLB');
    const file = join(OUT, `${name}.glb`);
    if (!existsSync(file)) writeFileSync(file, Buffer.from(await (await fetch(glb, { headers: UA })).arrayBuffer()));
    man[name] = { file: `assets/chars/${name}.glb`, source: `https://poly.pizza/m/${id}`, title, license: 'CC0', author: 'Quaternius' };
    console.log('✓', name, title);
  } catch (e) { console.log('✗', name, e.message); }
}
writeFileSync(manPath, JSON.stringify(man, null, 1));
