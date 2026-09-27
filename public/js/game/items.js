// Bergegut (Beute) & Werkzeuge: Daten, Modelle, Weltobjekte.

import * as THREE from 'three';
import { Builder, sphereGeometry, coneGeometry, cylGeometry, boxGeometry } from '../gfx/geo.js';
import { mat, glowMat } from '../gfx/materials.js';
import { glowTexture, iconTexture } from '../gfx/textures.js';
import { cloneModel, hasModel } from '../gfx/models.js';

// value: Grundwert-Spanne (Marken) · weight: kg · two: beide Hände
export const LOOT = {
  walze:      { name: 'Stimmwalze', value: [10, 28], weight: 1, desc: 'Eine Wachswalze aus dem Zehnt. Irgendwer hat hineingesprochen.' },
  zehntbuch:  { name: 'Zehntbuch', value: [8, 22], weight: 1.5, desc: 'Namen, Daten, Stimmanteile. Die Kantorei will jedes zurück.' },
  leuchter:   { name: 'Messingleuchter', value: [18, 40], weight: 3, desc: 'Kirchenmessing. Riecht nach Wachs und Angst.' },
  zelle:      { name: 'Relaiszelle', value: [30, 55], weight: 2, glow: 0xffa040, desc: 'Glimmt bernsteinfarben. In jeder steckt ein wenig Zehnt.' },
  zahnrad:    { name: 'Zahnradwerk', value: [22, 48], weight: 4, desc: 'Das Herz einer toten Maschine.' },
  ikone:      { name: 'Heiligenikone', value: [35, 70], weight: 2.5, desc: 'Der Erbauer, in Gold. Das Gesicht ist ausgespart.' },
  spule:      { name: 'Kupferspule', value: [14, 34], weight: 3, desc: 'Kupfer ist Kupfer. Auch unter der Stadt.' },
  weihrauch:  { name: 'Weihrauchfass', value: [26, 52], weight: 2, desc: 'Schwenkt man es, riecht es nach Sonntag.' },
  schaedel:   { name: 'Brudersschädel', value: [16, 44], weight: 2, desc: 'Ein Bruder vom Seil. Er hat die Stadt oben gehalten.' },
  zifferblatt:{ name: 'Messing-Zifferblatt', value: [70, 130], weight: 9, two: true, desc: 'Das heilige Symbol, groß wie ein Wagenrad.' },
  schrein:    { name: 'Reliquienschrein', value: [90, 170], weight: 11, two: true, desc: 'Etwas darin klopft. Zweimal. Dann nicht mehr.' },
  kelch:      { name: 'Silberkelch', value: [40, 80], weight: 1.5, desc: 'Aus ihm tranken die Vierzig. Er ist nie ganz trocken.' },
  roehre:     { name: 'Nixie-Röhre', value: [20, 42], weight: 0.8, glow: 0xff7a2a, desc: 'Zeigt eine Zahl, auch ohne Strom.' },
  salzkristall:{ name: 'Salzkristall', value: [18, 60], weight: 3, glow: 0xa8d8ff, desc: 'Er summt, wenn man ihn ans Ohr hält.' },
  handy:      { name: 'Glasziegel der Alten Welt', value: [60, 180], weight: 0.4, desc: 'Ein flacher, schwarzer Stein aus der Zeit vor der Flut. Man sagt, die Menschen hätten hineingesprochen.' },
  // --- echte Modelle (Poly Haven, CC0)
  kelch2:     { name: 'Messingkelche', model: 'brass_goblets', value: [38, 76], weight: 1.5, desc: 'Zwei Kelche aus dem Festmahl. Der Wein ist nie ganz getrocknet.' },
  vase:       { name: 'Messingvase', model: 'brass_vase_03', value: [30, 64], weight: 3, desc: 'Aus einer Kapelle. Innen klebt etwas, das kein Wachs ist.' },
  vase2:      { name: 'Altarvase', model: 'brass_vase_04', value: [34, 70], weight: 3.5, desc: 'Getriebenes Messing. Ein Halbbogen auf jeder Seite.' },
  topf:       { name: 'Messingtopf', model: 'brass_pot_01', value: [20, 44], weight: 3, desc: 'Anselm würde ihn wiedererkennen.' },
  uhr:        { name: 'Taschenuhr', model: 'pocket_watch', value: [45, 95], weight: 0.3, desc: 'Steht auf 3:07. Alle Uhren hier unten stehen auf 3:07.' },
  uhr2:       { name: 'Kantorenuhr', model: 'vintage_pocket_watch', value: [55, 115], weight: 0.3, desc: 'Graviert: „Für 30 Jahre Zehnt.“' },
  wecker:     { name: 'Wecker der Alten Welt', model: 'alarm_clock_01', value: [28, 60], weight: 0.8, desc: 'Er klingelt nicht mehr. Er tickt aber noch.' },
  band:       { name: 'Bandgerät', model: 'portable_cassette_player', value: [50, 110], weight: 1.5, desc: 'Ein Band ist eingelegt. Wer es abspielt, hört Atem.' },
  deck:       { name: 'Kassettendeck', model: 'cassette_player', value: [40, 90], weight: 4, desc: 'Die Kanzlei zahlt gut für alles, was Stimmen speichern kann.' },
  funk:       { name: 'Funkgerät', model: 'vintage_radio_transceiver', value: [70, 150], weight: 6, desc: 'Auf Kanal 9 rauscht es. Manchmal sagt das Rauschen einen Namen.' },
  kamera:     { name: 'Kamera der Alten Welt', model: 'Camera_01', value: [60, 140], weight: 1.2, desc: 'Der letzte Film zeigt ein Meer, das noch an seinem Platz ist.' },
  fernglas:   { name: 'Fernglas', model: 'binoculars', value: [30, 70], weight: 1, desc: 'Durch das linke Glas sieht man manchmal jemanden, der zurücksieht.' },
  fernglas2:  { name: 'Marinefernglas', model: 'vintage_binocular', value: [40, 85], weight: 1.4, desc: 'Aus der Zeit, als es noch Häfen gab.' },
  gasmaske:   { name: 'Gasmaske', model: 'old_gas_mask', value: [25, 55], weight: 1, desc: 'Innen riecht sie nach einem Menschen.' },
  truhe:      { name: 'Reliquientruhe', model: 'treasure_chest', value: [110, 220], weight: 12, two: true, desc: 'Schwer, beschlagen, verschlossen. Etwas darin klopft zweimal.' },
  schach:     { name: 'Schachspiel der Krone', model: 'chess_set', value: [60, 120], weight: 3, desc: 'Ein Bauer fehlt. Man findet ihn nie.' },
  etui:       { name: 'Zigarettenetui', model: 'cigarette_case', value: [22, 48], weight: 0.3, desc: 'Leer bis auf einen Zettel: „Nicht tiefer.“' },
  kompass:    { name: 'Seekompass', model: 'seadogs_compass', value: [35, 80], weight: 1, desc: 'Die Nadel zeigt nach unten.' },
  messgeraet: { name: 'Messgerät', model: 'retro_multimeter', value: [26, 58], weight: 1.5, desc: 'Misst etwas in den Wänden, das keinen Namen hat.' },
  feuerzeug:  { name: 'Sturmfeuerzeug', model: 'vintage_lighter', value: [18, 40], weight: 0.2, desc: 'Es geht jedes Mal an. Das ist hier unten schon ein Wunder.' },
  lupe:       { name: 'Lupe eines Schreibers', model: 'magnifying_glass_01', value: [20, 44], weight: 0.4, desc: 'Für die kleinen Namen im Zehntregister.' },
  oel:        { name: 'Geweihtes Öl', model: 'oil_tin', value: [22, 50], weight: 2, desc: 'Für die Seile. Die Bruderschaft segnet jede Dose.' },
  wein:       { name: 'Messwein', model: 'wine_bottles_01', value: [30, 66], weight: 3, desc: 'Jahrgang 33. Eine Flasche ist leer. Finn?' },
  sani:       { name: 'Sanitätskasten', model: 'medical_box', value: [18, 36], weight: 2, desc: 'Verbandszeug, sechshundert Jahre alt. Die Kanzlei kauft alles.' },
  koffer:     { name: 'Reisekoffer', model: 'vintage_suitcase', value: [40, 90], weight: 5, desc: 'Gepackt für die Fahrt nach oben. Weißes Gewand, obenauf.' },
  pferd:      { name: 'Bronzepferd', model: 'horse_statue_01', value: [80, 160], weight: 6, desc: 'Aus einem Salon der Krone. Wie kam es hier herunter?' },
  elefant:    { name: 'Holzelefant', model: 'carved_wooden_elephant', value: [24, 52], weight: 1.5, desc: 'Ein Kinderspielzeug. Jemand hat einen Namen in den Bauch geritzt.' },
  brille:     { name: 'Nickelbrille', model: 'round_spectacles', value: [15, 34], weight: 0.1, desc: 'Ein Glas ist gesprungen. Von innen.' },
  mikroskop:  { name: 'Mikroskop', model: 'vintage_microscope', value: [70, 140], weight: 7, desc: 'Aus einem Labor der Kantorei. Auf dem Objektträger: eine Stimmrille.' },
  platine:    { name: 'Kanzlei-Platine', model: 'circuit_board', value: [40, 95], weight: 0.6, desc: 'Aus einem Zehntautomaten. Riecht nach verbranntem Weihrauch.' },
  megafon:    { name: 'Megafon', model: 'Megaphone_01', value: [34, 72], weight: 2, desc: 'Streikgerät der Schachtratten. Wer hineinspricht, wird gehört. Überall.' },
  projektor:  { name: 'Filmprojektor', model: 'filmstrip_projector_8mm', value: [65, 130], weight: 5, desc: 'Eine Rolle ist eingelegt: „Richtfest, Jahr 20“.' },
  rochen:     { name: 'Bronzerochen', model: 'bronze_ray_statue', value: [90, 170], weight: 7, desc: 'Ein Tier aus dem Meer vor der Flut. Poliert von vielen Händen.' },
  munition:   { name: 'Munitionskiste', model: 'ammo_box', value: [30, 60], weight: 5, desc: 'Leer. Innen Salzkrümel.' },
  // --- Auftragsgut (nicht in den Zufallstabellen)
  marke:      { name: 'Erkennungsmarke', value: [4, 8], weight: 0.1, desc: 'Messing, an einer Kette. Eine Mannschaftsnummer, ein Name, eine Blutgruppe. Mehr bleibt nicht.' },
  reliquie:   { name: 'Stimmreliquie', value: [140, 180], weight: 4, desc: 'Ein goldener Schrein mit Glasfenster. Darin eine Wachswalze der Ersten Fahrt. Die Rillen sind … nicht da.' },
};

// Werkzeuge & Waffen (Voss). Kein Bergegut: Wert 0, die Kantorei kauft sie nicht.
// tool: Art der Benutzung (LMB) · view: Haltung in der Hand { len (m), pos, rot }
export const TOOLS = {
  brechstange: { name: 'Brechstange', model: 'crowbar_01', weight: 2.5, tool: 'melee', desc: 'Stahl, einen Meter lang, am Ende gekröpft. Hält Ratten auf Abstand. Fahrgäste lachen darüber.',
    view: { len: 0.55, pos: [0, 0, 0.02], rot: [1.0, 0.35, -0.6] } },
  hammer:      { name: 'Vorschlaghammer', model: 'sledgehammer_01', weight: 6, tool: 'hammer', desc: 'Langsam und schwer. Was er trifft, steht so bald nicht wieder auf.',
    view: { len: 0.6, pos: [-0.03, -0.05, 0.03], rot: [0.95, 0.4, -0.6] } },
  flinte:      { name: 'Salzflinte', model: 'bolt_action_rifle_7_62', weight: 4, tool: 'gun', ammo: 2, desc: 'Zwei Schuss grobes Salz. Laut wie das Jüngste Gericht – der Hörer hört es bis ans Ende der Ebene.',
    view: { len: 0.95, pos: [0.2, 0.1, -0.15], rot: [0.04, Math.PI / 2 + 0.12, 0.12] } },
  fackel:      { name: 'Leuchtfackel', model: 'stick_grenade', weight: 0.4, tool: 'flare', consumable: true, desc: 'Rotes Kirchenfeuer, 45 Sekunden. Wirf sie – im Licht erstarren die Fahrgäste.',
    view: { len: 0.28, pos: [0.04, 0.04, 0], rot: [0.5, 0.3, -0.9] } },
  klapper:     { name: 'Klapper', weight: 0.5, tool: 'decoy', desc: 'Eine Blechdose voller Schrauben an einer Schnur. Wirf sie, und alles, was hört, geht nachsehen.',
    view: { len: 0.15, pos: [0.04, 0.03, 0], rot: [0.3, 0.5, 0.1] } },
  salzsack:    { name: 'Salzsack', weight: 3, tool: 'salt', consumable: true, desc: 'Grobes Salz aus Bohrung Null. Eine Linie auf dem Boden – sie kommen nicht darüber.',
    view: { len: 0.19, pos: [0.06, 0.02, -0.04], rot: [0.25, 0.6, 0.05] } },
  verband:     { name: 'Verband', weight: 0.2, tool: 'heal', consumable: true, desc: 'Leinen, Jod und ein Gebet auf der Banderole. Heilt 35 Lebenspunkte.',
    view: { len: 0.13, pos: [0.05, 0.03, 0], rot: [0.5, 0.7, 0.2] } },
};

export function itemDef(type) { return LOOT[type] || TOOLS[type]; }
export function isTool(type) { return !!TOOLS[type]; }

// Welche Beute wo liegt: [id, Gewichtung]
export const SPAWN = {
  dock:        [['zahnrad', 3], ['spule', 3], ['zelle', 2], ['roehre', 2], ['oel', 3], ['munition', 2], ['gasmaske', 2], ['messgeraet', 2], ['platine', 2], ['feuerzeug', 2], ['koffer', 1], ['megafon', 1], ['funk', 0.6], ['zifferblatt', 0.4]],
  scriptorium: [['walze', 5], ['zehntbuch', 4], ['band', 3], ['deck', 2], ['lupe', 3], ['brille', 2], ['uhr2', 1.5], ['ikone', 2], ['platine', 1], ['mikroskop', 0.7], ['projektor', 0.6], ['truhe', 0.3]],
  banquet:     [['kelch', 3], ['kelch2', 3], ['wein', 3], ['leuchter', 3], ['vase', 2], ['vase2', 2], ['uhr', 2], ['schach', 1.2], ['topf', 2], ['etui', 2], ['pferd', 0.6], ['truhe', 0.5]],
  ossuary:     [['schaedel', 5], ['leuchter', 3], ['weihrauch', 2], ['vase', 2], ['uhr', 1.5], ['brille', 2], ['elefant', 1.5], ['ikone', 1], ['truhe', 0.5]],
  mine:        [['salzkristall', 5], ['zahnrad', 2], ['zelle', 2], ['oel', 2], ['kompass', 2], ['fernglas', 1.5], ['munition', 2], ['wecker', 1.5], ['fernglas2', 0.8]],
  city:        [['handy', 3], ['kamera', 2], ['wecker', 2], ['fernglas', 2], ['koffer', 2], ['elefant', 2], ['rochen', 0.6], ['pferd', 0.6]],
  default:     [['zahnrad', 2], ['walze', 2], ['leuchter', 2], ['zelle', 1], ['uhr', 1], ['feuerzeug', 1]],
};

// Wertfaktor je Tiefenstufe
export const TIER_VALUE = [1, 1, 1.6, 2.4, 3.4, 4.8, 7];

// ----------------------------------------------------------------------------
// Modelle
// ----------------------------------------------------------------------------

const MODELS = {
  walze(b) { b.cyl(mat('brassDark'), 0, 0, 0, 0.06, 0.06, 0.22, 12); b.cyl(mat('bone'), 0, 0.02, 0, 0.055, 0.055, 0.18, 12); },
  zehntbuch(b) { b.box(mat('leather'), 0, 0.03, 0, 0.2, 0.06, 0.28); b.box(mat('paper'), 0.005, 0.03, 0, 0.19, 0.05, 0.27); b.box(mat('gold'), 0, 0.061, 0, 0.06, 0.002, 0.06); },
  leuchter(b) { b.cyl(mat('brass'), 0, 0, 0, 0.1, 0.12, 0.04, 10); b.cyl(mat('brass'), 0, 0.04, 0, 0.02, 0.025, 0.4, 8); b.cyl(mat('brass'), 0, 0.42, 0, 0.06, 0.03, 0.05, 10); b.cyl(mat('bone'), 0, 0.46, 0, 0.018, 0.018, 0.12, 6); },
  zelle(b) { b.cyl(mat('brassDark'), 0, 0, 0, 0.07, 0.07, 0.04, 10); b.cyl(glowMat(0xffa040, 2.2, 'cellGlow'), 0, 0.04, 0, 0.055, 0.055, 0.2, 10); b.cyl(mat('brassDark'), 0, 0.24, 0, 0.07, 0.07, 0.04, 10); for (let i = 0; i < 3; i++) b.box(mat('brassDark'), Math.cos(i * 2.1) * 0.06, 0.14, Math.sin(i * 2.1) * 0.06, 0.012, 0.2, 0.012); },
  zahnrad(b) { b.cyl(mat('rust'), 0, 0, 0, 0.2, 0.2, 0.06, 16); b.cyl(mat('steel'), 0.12, 0.06, 0.05, 0.1, 0.1, 0.05, 12); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; b.box(mat('rust'), Math.cos(a) * 0.22, 0.03, Math.sin(a) * 0.22, 0.06, 0.06, 0.04, { ry: -a }); } },
  ikone(b, g) { b.box(mat('gold'), 0, 0.2, 0, 0.26, 0.38, 0.03); const p = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.33), new THREE.MeshStandardMaterial({ map: iconTexture('erbauer'), roughness: 0.5, metalness: 0.3 })); p.position.set(0, 0.2, 0.017); g.add(p); },
  spule(b) { b.cyl(mat('rust'), 0, 0, 0, 0.14, 0.14, 0.03, 12); b.cyl(mat('brass'), 0, 0.03, 0, 0.1, 0.1, 0.22, 14); b.cyl(mat('rust'), 0, 0.25, 0, 0.14, 0.14, 0.03, 12); },
  weihrauch(b) { b.sphere(mat('brass'), 0, 0.12, 0, 0.1, 10, 8, 1, 0.8, 1); b.add(mat('brass'), coneGeometry(0.08, 0.1, 10), 0, 0.23, 0); for (let i = 0; i < 3; i++) b.cyl(mat('brassDark'), Math.cos(i * 2.1) * 0.05, 0.25, Math.sin(i * 2.1) * 0.05, 0.004, 0.004, 0.3, 4); },
  schaedel(b) { b.sphere(mat('bone'), 0, 0.1, 0, 0.1, 10, 8, 1, 1.1, 1.15); b.box(mat('bone'), 0, 0.03, 0.05, 0.1, 0.05, 0.1); b.sphere(mat('fabricBlack'), -0.035, 0.1, 0.1, 0.025, 6, 4); b.sphere(mat('fabricBlack'), 0.035, 0.1, 0.1, 0.025, 6, 4); },
  zifferblatt(b, g) { b.add(mat('brass'), new THREE.TorusGeometry(0.5, 0.04, 6, 24, Math.PI).toNonIndexed(), 0, 0.02, 0, 0, 0, 0); b.box(mat('brass'), 0, 0.02, 0, 1.08, 0.06, 0.06); b.box(mat('brassDark'), 0.2, 0.25, 0, 0.04, 0.5, 0.03, { rz: -0.6 }); b.box(mat('walnut'), 0, 0.2, -0.02, 1.0, 0.4, 0.02); },
  schrein(b) { b.box(mat('walnut'), 0, 0.22, 0, 0.6, 0.44, 0.4); b.box(mat('gold'), 0, 0.46, 0, 0.64, 0.05, 0.44); b.add(mat('gold'), coneGeometry(0.2, 0.2, 4), 0, 0.58, 0, 0, Math.PI / 4, 0); b.box(mat('gold'), 0, 0.22, 0.205, 0.2, 0.26, 0.01); },
  kelch(b) { b.cyl(mat('steel'), 0, 0, 0, 0.07, 0.08, 0.02, 12); b.cyl(mat('steel'), 0, 0.02, 0, 0.015, 0.02, 0.12, 8); b.cyl(mat('steel'), 0, 0.14, 0, 0.08, 0.03, 0.1, 12); },
  roehre(b) { b.cyl(mat('rubber'), 0, 0, 0, 0.04, 0.04, 0.03, 10); b.cyl(glowMat(0xff7a2a, 1.6, 'nixieGlow'), 0, 0.03, 0, 0.035, 0.035, 0.1, 10); b.sphere(glowMat(0xff7a2a, 1.6, 'nixieGlow'), 0, 0.13, 0, 0.035, 8, 6); },
  salzkristall(b) { for (let i = 0; i < 5; i++) b.add(glowMat(0xa8d8ff, 0.9, 'saltGlow'), coneGeometry(0.05 + i * 0.01, 0.3 - i * 0.03, 5), Math.cos(i * 1.3) * 0.06, 0.12, Math.sin(i * 1.3) * 0.06, Math.cos(i) * 0.3, i, Math.sin(i) * 0.3); },
  handy(b) { b.box(mat('rubber'), 0, 0.006, 0, 0.075, 0.012, 0.155); b.box(glowMat(0x0a1418, 0.4, 'screenDim'), 0, 0.013, 0, 0.068, 0.002, 0.142); },
  // --- Auftragsgut
  marke(b) {
    // Blechmarke mit gestanzter Nummer und Kugelkette
    b.box(mat('brass'), 0, 0.004, 0, 0.05, 0.003, 0.032, { ry: 0.3 });
    b.box(mat('brassDark'), 0.004, 0.0065, 0.002, 0.03, 0.0008, 0.004, { ry: 0.3 });
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 1.6 + 0.8; b.sphere(mat('steel'), Math.cos(a) * 0.05 - 0.03, 0.003, Math.sin(a) * 0.04, 0.0035, 5, 4); }
  },
  reliquie(b, g) {
    // goldener Schrein: Sockel, Säulen, Glasfenster, Dach mit Zifferblatt; innen eine blanke Walze
    b.box(mat('gold'), 0, 0.03, 0, 0.3, 0.06, 0.2);
    b.box(mat('walnut'), 0, 0.075, 0, 0.26, 0.03, 0.17);
    for (const x of [-0.12, 0.12]) for (const z of [-0.07, 0.07]) b.cyl(mat('gold'), x, 0.09, z, 0.012, 0.012, 0.2, 8);
    b.box(mat('gold'), 0, 0.3, 0, 0.3, 0.03, 0.2);
    b.add(mat('gold'), coneGeometry(0.17, 0.1, 4), 0, 0.365, 0, 0, Math.PI / 4, 0);
    b.cyl(mat('bone'), 0, 0.14, 0, 0.035, 0.035, 0.1, 14, { rz: Math.PI / 2 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.2, 0.15), new THREE.MeshStandardMaterial({ color: 0xc8d0d0, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.18, depthWrite: false }));
    glass.position.y = 0.19;
    g.add(glass);
  },
  // --- Werkzeuge ohne fertiges Modell
  klapper(b) {
    // Blechdose mit Deckel, durchgebohrt, Schrauben innen, Schnurschlaufe
    b.cyl(mat('steel'), 0, 0, 0, 0.045, 0.045, 0.11, 12);
    b.cyl(mat('rust'), 0, 0.11, 0, 0.047, 0.047, 0.012, 12);
    b.cyl(mat('rust'), 0, 0, 0, 0.047, 0.047, 0.01, 12);
    for (let i = 0; i < 3; i++) b.box(mat('brassDark'), Math.cos(i * 2.1) * 0.047, 0.03 + i * 0.03, Math.sin(i * 2.1) * 0.047, 0.012, 0.012, 0.012);
    b.add(mat('rope'), new THREE.TorusGeometry(0.035, 0.004, 4, 12).toNonIndexed(), 0, 0.15, 0, 0, 0, 0);
  },
  salzsack(b) {
    // Jutesack, oben zugebunden, Salz rieselt aus einer Ecke
    b.sphere(mat('burlap'), 0, 0.1, 0, 0.12, 10, 8, 1, 0.85, 0.9);
    b.cyl(mat('burlap'), 0, 0.19, 0, 0.035, 0.06, 0.07, 8);
    b.cyl(mat('rope'), 0, 0.215, 0, 0.037, 0.037, 0.018, 8);
    b.cyl(mat('burlap'), 0, 0.245, 0, 0.05, 0.03, 0.05, 8);
    b.sphere(mat('salt'), 0.1, 0.012, 0.03, 0.05, 6, 4, 1, 0.25, 1);
  },
  verband(b) {
    // Rolle Leinen mit Banderole
    b.cyl(mat('fabricWhite'), 0, 0.03, 0, 0.032, 0.032, 0.06, 12, { rz: Math.PI / 2 });
    b.cyl(mat('paper'), 0, 0.03, 0, 0.034, 0.034, 0.02, 12, { rz: Math.PI / 2 });
    b.box(mat('fabricWhite'), 0.02, 0.003, 0.05, 0.05, 0.004, 0.06);
  },
};

export function buildItemModel(type) {
  const def = itemDef(type);
  if (def?.model && hasModel(def.model)) {
    const g = cloneModel(def.model);
    g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    if (type === 'fackel') tintFlare(g);
    return g;
  }
  const g = new THREE.Group();
  const b = new Builder();
  (MODELS[type] || MODELS.zahnrad)(b, g);
  const m = b.build();
  g.add(m);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return g;
}

// Leuchtfackel: der Kopf wird rot lackiert, mit Warnband
function tintFlare(g) {
  g.traverse(o => {
    if (!o.isMesh) return;
    o.material = o.material.clone();
    o.material.color.setRGB(0.55, 0.06, 0.04);
    o.material.roughness = 0.6;
  });
}

// ----------------------------------------------------------------------------
// Weltobjekte
// ----------------------------------------------------------------------------

let uid = 1;
const _v = new THREE.Vector3();

export class ItemManager {
  constructor(scene) {
    this.scene = scene;
    this.items = new Map();       // id → item
    this.group = new THREE.Group();
    this.group.name = 'Bergegut';
    scene.add(this.group);
    this.shineMat = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffe8b0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.time = 0;
  }

  spawn(type, x, y, z, { value = null, ry = null, id = null, data = null } = {}) {
    const def = itemDef(type);
    const it = {
      id: id ?? uid++, type, def, value: def.tool ? 0 : (value ?? Math.round(def.value[0] + Math.random() * (def.value[1] - def.value[0]))),
      weight: def.weight, two: !!def.two, holder: null, tool: def.tool || null,
      data: data ? { ...data } : (def.ammo ? { ammo: def.ammo } : null),
      mesh: buildItemModel(type), pos: new THREE.Vector3(x, y, z),
    };
    if (id !== null) uid = Math.max(uid, id + 1);
    it.mesh.position.copy(it.pos);
    it.mesh.rotation.y = ry ?? Math.random() * Math.PI * 2;
    const shine = new THREE.Sprite(this.shineMat.clone());
    shine.scale.setScalar(0.35);
    shine.position.y = 0.25;
    shine.renderOrder = 4;
    it.mesh.add(shine);
    it.shine = shine;
    if (def.glow) {
      it.light = { pos: it.pos, color: def.glow };
    }
    this.group.add(it.mesh);
    this.items.set(it.id, it);
    return it;
  }

  remove(id) {
    const it = this.items.get(id);
    if (!it) return;
    it.mesh.removeFromParent();
    this.items.delete(id);
  }

  clear() {
    for (const it of this.items.values()) it.mesh.removeFromParent();
    this.items.clear();
  }

  // aufheben: aus der Welt nehmen (Modell wird von Inventar/Hand übernommen)
  take(id, holder) {
    const it = this.items.get(id);
    if (!it || it.holder) return null;
    it.holder = holder;
    it.mesh.visible = false;
    return it;
  }

  drop(it, x, y, z, ry = 0) {
    it.holder = null;
    it.pos.set(x, y, z);
    it.mesh.position.copy(it.pos);
    it.mesh.rotation.y = ry;
    it.mesh.visible = true;
    if (!this.items.has(it.id)) { this.items.set(it.id, it); this.group.add(it.mesh); }
  }

  lying() { return [...this.items.values()].filter(it => !it.holder); }

  // Schimmer: stärker, wenn die Lampe darauf zeigt
  update(dt, lampPos, lampDir, lampOn) {
    this.time += dt;
    for (const it of this.items.values()) {
      if (it.holder) continue;
      let lit = 0;
      if (lampOn > 0.05) {
        _v.subVectors(it.pos, lampPos);
        const d = _v.length();
        if (d < 18) { _v.divideScalar(d); lit = Math.max(0, (_v.dot(lampDir) - 0.9) / 0.1) * (1 - d / 18) * lampOn; }
      }
      const tw = 0.5 + 0.5 * Math.sin(this.time * 2.3 + it.id * 1.7);
      it.shine.material.opacity = 0.05 + lit * 0.8 * (0.6 + tw * 0.4);
      it.shine.scale.setScalar(0.25 + lit * 0.25);
    }
  }

  // Gegenstände im Kabinenraum (für die Abrechnung)
  inside(containsFn) {
    return this.lying().filter(it => containsFn(it.pos));
  }

  serialize() {
    return this.lying().map(it => ({ id: it.id, type: it.type, value: it.value, x: it.pos.x, y: it.pos.y, z: it.pos.z, data: it.data }));
  }
}

// Zufällige Beute nach Tabelle
export function pickLoot(rng, table) {
  const total = table.reduce((s, [, w]) => s + w, 0);
  let r = rng.next() * total;
  for (const [id, w] of table) { r -= w; if (r <= 0) return id; }
  return table[0][0];
}
