// Baut die Web-Testversion (ohne Node-Server) nach dist/web/:
//   node tools/build-web.mjs
// three.js kommt aus dem jsDelivr-CDN (Import-Map), Schriften von Google Fonts.
// Stimmen und Musikdateien werden nicht mitgenommen – der Sandkasten braucht sie nicht.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist/web');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'css'), { recursive: true });

// Seite
fs.copyFileSync(path.join(ROOT, 'tools/web/index.html'), path.join(OUT, 'index.html'));
// CSS ohne die lokalen @font-face-Zeilen (Google Fonts übernimmt)
const css = fs.readFileSync(path.join(ROOT, 'public/css/style.css'), 'utf8').split('\n').filter(l => !l.startsWith('@font-face')).join('\n');
fs.writeFileSync(path.join(OUT, 'css/style.css'), css);
fs.copyFileSync(path.join(ROOT, 'public/css/loading.css'), path.join(OUT, 'css/loading.css'));
// Alle Module
const files = ['css/style.css', 'css/loading.css'];
(function copy(dir) {
  for (const e of fs.readdirSync(path.join(ROOT, 'public', dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { copy(rel); continue; }
    if (!rel.endsWith('.js')) continue;
    fs.mkdirSync(path.join(OUT, dir), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'public', rel), path.join(OUT, rel));
    files.push(rel.split(path.sep).join('/'));
  }
})('js');
fs.writeFileSync(path.join(OUT, 'files.json'), JSON.stringify(files, null, 1));
console.log(`dist/web: index.html + ${files.length} Dateien`);
