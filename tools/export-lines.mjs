// Exportiert alle Sprechtexte als JSON für die Stimmerzeugung (tools/tts/gen_voices.py)
import { writeFileSync } from 'node:fs';
import { LINES } from '../public/js/story/lines.js';

const out = [];
for (const [id, v] of Object.entries(LINES)) {
  if (Array.isArray(v)) out.push({ id, speaker: v[0], text: v[1] });
  else v.parts.forEach(([speaker, text], i) => out.push({ id: `${id}__${i}`, speaker, text }));
}
writeFileSync(new URL('./tts/lines.json', import.meta.url), JSON.stringify(out, null, 1), 'utf8');
console.log(out.length, 'Zeilen exportiert');
