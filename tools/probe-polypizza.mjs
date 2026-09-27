// Prüft Poly-Pizza-Modelle: Titel, Autor, Lizenz, GLB-Link, Animationen.
//   node tools/probe-polypizza.mjs <id> <id> …   (oder Suchbegriffe mit --search wort)
const ids = process.argv.slice(2);
const UA = { 'User-Agent': 'Mozilla/5.0 (TIEFER asset probe)' };

async function page(url) { const r = await fetch(url, { headers: UA }); return r.ok ? r.text() : ''; }

async function search(term) {
  const html = await page(`https://poly.pizza/search/${encodeURIComponent(term)}`);
  return [...new Set([...html.matchAll(/href="\/m\/([A-Za-z0-9_-]+)"/g)].map(m => m[1]))];
}

async function probe(id) {
  const html = await page(`https://poly.pizza/m/${id}`);
  const title = (html.match(/<title[^>]*>([^<]+)</) || [])[1]?.replace(' - Poly Pizza', '') || '?';
  const glb = (html.match(/https:\/\/static\.poly\.pizza\/[0-9a-f-]+\.glb/) || [])[0];
  const lic = /CC0|Public Domain/i.test(html) ? 'CC0' : /CC-BY|Attribution/i.test(html) ? 'CC-BY' : '?';
  let anims = [], bones = 0, tris = 0;
  if (glb) {
    const b = Buffer.from(await (await fetch(glb, { headers: UA })).arrayBuffer());
    const len = b.readUInt32LE(12);
    const j = JSON.parse(b.slice(20, 20 + len).toString());
    anims = (j.animations || []).map(a => a.name);
    bones = (j.skins || []).reduce((s, k) => s + k.joints.length, 0);
    for (const m of j.meshes || []) for (const p of m.primitives) { const acc = j.accessors[p.indices ?? p.attributes.POSITION]; tris += (p.indices !== undefined ? acc.count / 3 : acc.count / 3); }
  }
  return { id, title, lic, glb, bones, tris: Math.round(tris), anims };
}

let list = ids;
if (ids[0] === '--search') { list = []; for (const t of ids.slice(1)) list.push(...(await search(t)).slice(0, 12)); list = [...new Set(list)]; }
for (const id of list) {
  try {
    const r = await probe(id);
    console.log(`${r.lic.padEnd(5)} ${r.id.padEnd(13)} ${r.title.slice(0, 55).padEnd(56)} bones=${r.bones} tris=${r.tris} anims=${r.anims.length}${r.anims.length ? ' [' + r.anims.slice(0, 14).join(', ') + (r.anims.length > 14 ? ', …' : '') + ']' : ''}`);
  } catch (e) { console.log('✗', id, e.message); }
}
