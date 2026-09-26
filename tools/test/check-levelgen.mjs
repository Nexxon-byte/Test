// Generator-Test ohne Browser: alle Stile × 60 Seeds.  node tools/test/check-levelgen.mjs
// Prüft: 2×2-Kabine, 4×2-Absatz, Fels um die Kabine, Zellgrenzen = Kabinenmaße,
// Welt↔Zelle, Erreichbarkeit aller Bodenzellen, Sichtlinie Absatz → Tür.
import { generate, CS, SOLID, FLOOR, CABIN } from '../../public/js/world/levelgen.js';
import { CAB } from '../../public/js/world/cab.js';
const GENS = {
  dock: { style: 'halls', w: 26, h: 26, rooms: 4, minRoom: 6, maxRoom: 9, smallRooms: 5, corridor: 2, loops: 0.4 },
  scriptorium: { style: 'halls', w: 28, h: 28, rooms: 4, minRoom: 7, maxRoom: 10, smallRooms: 5, corridor: 1, loops: 0.5 },
  banquet: { style: 'halls', w: 26, h: 28, rooms: 1, minRoom: 9, maxRoom: 11, smallRooms: 6, corridor: 1, loops: 0.6 },
  ossuary: { style: 'rooms', w: 26, h: 26, rooms: 10, minRoom: 3, maxRoom: 5, corridor: 1, loops: 0.35 },
  mine: { style: 'tunnels', w: 30, h: 30, rooms: 8, minRoom: 2, maxRoom: 5, wiggle: 0.35, loops: 3 },
  city: { style: 'city', w: 30, h: 30 },
  nave: { style: 'nave', w: 30, h: 34 },
};
let fails = 0;
const fail = (m) => { fails++; if (fails < 20) console.log('FEHLER', m); };
for (const [name, gen] of Object.entries(GENS)) {
  let minFloor = 1e9, minRooms = 1e9, sumFloor = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const g = generate(gen.style, seed, gen);
    const { ex, ez } = g;
    for (let z = ez - 1; z <= ez; z++) for (let x = ex - 1; x <= ex; x++) if (g.get(x, z) !== CABIN) fail(`${name}/${seed} Kabinenzelle ${x},${z} = ${g.get(x, z)}`);
    for (let z = ez + 1; z <= ez + 2; z++) for (let x = ex - 2; x <= ex + 1; x++) if (g.get(x, z) !== FLOOR) fail(`${name}/${seed} Absatz ${x},${z} = ${g.get(x, z)}`);
    // Rand um die Kabine bleibt Fels
    for (let z = 0; z <= ez; z++) for (let x = ex - 2; x <= ex + 1; x++) if (!g.isCabin(x, z) && g.get(x, z) !== SOLID) fail(`${name}/${seed} Fels ${x},${z} = ${g.get(x, z)}`);
    // Zellgrenze Kabine|Absatz liegt auf LANDING_Z, X-Grenze auf 0
    const zb = (g.wz(ez) + g.wz(ez + 1)) / 2, xb = (g.wx(ex - 1) + g.wx(ex)) / 2;
    if (Math.abs(zb - CAB.LANDING_Z) > 1e-9 || Math.abs(xb) > 1e-9) fail(`${name} Grenzen ${xb} ${zb}`);
    // Welt ↔ Zelle
    for (let x = 1; x < g.w - 1; x += 3) for (let z = 1; z < g.h - 1; z += 3) if (g.cx(g.wx(x)) !== x || g.cz(g.wz(z)) !== z) fail(`${name} Umrechnung ${x},${z}`);
    // Mitte des Absatzes ↔ Welt: vor der Tür
    if (g.cx(0.3) !== ex || g.cx(-0.3) !== ex - 1 || g.cz(CAB.LANDING_Z + 0.5) !== ez + 1 || g.cz(0) !== ez) fail(`${name} Welt→Zelle an der Tür`);
    let floor = 0;
    for (let i = 0; i < g.cells.length; i++) if (g.cells[i] === FLOOR) { floor++; if (g.dist[i] < 0) fail(`${name}/${seed} unerreichbar ${i}`); }
    minFloor = Math.min(minFloor, floor); sumFloor += floor;
    minRooms = Math.min(minRooms, g.rooms.length);
    // Sichtlinie: vom Absatz geradeaus durch die Tür in die Kabine ist frei
    if (!g.lineOfSight(0, CAB.LANDING_Z + 2, 0, CAB.LANDING_Z + 0.5)) fail(`${name}/${seed} Sichtlinie Absatz`);
  }
  console.log(`${name.padEnd(12)} Bodenzellen min ${minFloor}, Ø ${Math.round(sumFloor / 60)}, Räume min ${minRooms}`);
}
console.log(fails ? `${fails} Fehler` : 'alles in Ordnung');
process.exit(fails ? 1 : 0);
