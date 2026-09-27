// Fundstücke der Tiefe: Dokumente aus story/docs.js liegen als Papier, Bücher, Walzen, Tafeln in den Ebenen.
// Pro Nacht 1–2 ungefundene an ruhigen Stellen (Tischplatten, Wandplätze, Boden an der Wand).
// „Lesen“ öffnet das Dokument, merkt die ID im Spielstand (state.docs) und legt es ins Tagebuch.
// Außerdem hier: Kodex-Freischaltungen (state.codex) samt Hinweis, Platzhalter-Ersatz, Gruppen fürs Tagebuch.
//
// Einbindung (game.js): placeDocuments(game, level, nightInfo) nach Beute/Aufträgen, clearDocuments(game) beim Aufräumen.

import * as THREE from 'three';
import { DOCS } from '../story/docs.js';
import { CODEX } from '../story/codex.js';
import { RNG } from '../core/rng.js';
import { mat } from '../gfx/materials.js';
import { textTexture, glowTexture, chalkTexture, posterTexture, drawDialSymbol, hash2 } from '../gfx/textures.js';
import { audio } from '../audio/audio.js';
import { voice } from '../audio/voice.js';
import { ui } from '../ui/ui.js';
import { input } from '../core/input.js';
import { saveCampaign, nameWithLetters } from './state.js';
import { CS, SOLID, DIRS } from '../world/levelgen.js';

// ============================================================================ Daten

// Nebengeschichten: Reihenfolge innerhalb der Kette (nächstes ungefundenes zuerst) + Titel im Tagebuch
export const CHAINS = {
  mannschaften: { title: 'Die Sechsundvierzig', sub: 'Spuren der Mannschaften vor euch', order: ['d_auftrag', 'd_you_1', 'd_kenotaph', 'd_you_2', 'd_you_3', 'd_you_4'] },
  vierzig:      { title: 'Die Vierzig', sub: 'Die Getreuen der Ersten Fahrt', order: ['d_fahrgastliste', 'd_menukarte', 'd_verlobung', 'd_finn'] },
  brenner:      { title: 'Hans Brenner', sub: 'Briefe an Lotte', order: ['d_brenner_log_1', 'd_brenner_brief_1', 'd_brenner_brief_2', 'd_brenner_brief_3', 'd_brenner_brief_4', 'd_brenner_brief_5', 'd_brenner_notiz'] },
  margarete:    { title: 'Margarete Wendt', sub: 'Die Telefonistin', order: ['d_margarete_1', 'd_margarete_2', 'd_margarete_band'] },
  aksoy:        { title: 'Kantorin Aksoy', sub: 'Hüterin des Stimmarchivs', order: ['d_aksoy_1', 'd_aksoy_2', 'd_aksoy_3', 'd_aksoy_4'] },
  kessler:      { title: 'Der Erbauer', sub: 'Tonwalzen', order: ['d_kessler_1', 'd_kessler_2', 'd_kessler_3', 'd_kessler_4'] },
  anselm:       { title: 'Anselm', sub: 'Rezepte des Kochs', order: ['d_anselm_rezept_1', 'd_anselm_rezept_2', 'd_anselm_rezept_3', 'd_anselm_rezept_4'] },
  oskar:        { title: 'Oskar Pohl', sub: 'Nachtwache am Schachtkopf', order: ['d_wachbuch', 'd_oskar_letztes'] },
  nia:          { title: 'Nia & Jomo', sub: 'Das Neunerspiel', order: ['d_neunerspiel', 'd_nia_1', 'd_nia_2'] },
  voss:         { title: 'Voss', sub: 'Stand 44 · Bargeld sofort', order: ['d_voss_1'] },
};

// Lose Dokumente, nach Themen gebündelt (nur fürs Tagebuch)
export const TOPICS = {
  kirche:       { title: 'Kirche & Kanzlei', sub: 'Lehre, Proklamationen, Register', ids: ['d_katechismus', 'd_zehntkabine', 'd_proklamation', 'd_zehntregister', 'd_siegelcode', 'd_reliquie', 'd_kanzlei_brief', 'd_predigt', 'd_kanzlei_beichte'] },
  bruderschaft: { title: 'Bruderschaft vom Seil', sub: 'Regeln, Gräber, Flugblätter', ids: ['d_flugblatt', 'd_ladeliste', 'd_regel', 'd_totenlitanei', 'd_dieter_grab', 'd_namensschild'] },
  tiefe:        { title: 'Unter dem Salz', sub: 'Was die Tiefe aufbewahrt', ids: ['d_bohrprotokoll', 'd_gebetsband', 'd_gemeinde', 'd_aurel_beichte', 'd_leitungsplan', 'd_zeitung', 'd_richtfest', 'd_arbeiterliste'] },
  ilse:         { title: 'Die Kleine Heilige', sub: 'Ilse Kessler, 8 Jahre', ids: ['d_ilse_bild', 'd_puppe_handbuch', 'd_arzt', 'd_ilse_brief'] },
};
const EXTRA_GROUP = { d_sitzordnung: 'vierzig' };   // ungekettet, aber thematisch dabei
export const GROUP_ORDER = ['mannschaften', 'vierzig', 'brenner', 'margarete', 'aksoy', 'kessler', 'anselm', 'oskar', 'nia', 'voss', 'kirche', 'bruderschaft', 'tiefe', 'ilse', 'lose'];

// Platzierung: Welt → [Dokument, Form, Optionen]. Nur Welten, die es gibt; spätere Tiefen stehen in LATER.
// Formen: sheet note letter sealed book printout card tape bottle radio (liegen) · chalk slab (Boden)
//         plaque ribbons poster (Wand) · screen (Bildschirm eines Schreibpults)
export const PLACEMENT = {
  dock: [          // −2 Ladebucht
    ['d_auftrag', 'printout', { coffee: true }],
    ['d_neunerspiel', 'chalk'],
    ['d_voss_1', 'book', { cover: 'leather' }],
    ['d_ladeliste', 'printout'],
    ['d_flugblatt', 'sheet'],
    ['d_proklamation', 'poster'],
    ['d_katechismus', 'plaque', { material: 'brass', size: [0.5, 0.66] }],
    ['d_anselm_rezept_4', 'sheet'],
  ],
  scriptorium: [   // −7 Skriptorium
    ['d_fahrgastliste', 'book'],
    ['d_wachbuch', 'book', { cover: 'cloth' }],
    ['d_brenner_log_1', 'sheet'],
    ['d_aksoy_1', 'printout'],
    ['d_zehntregister', 'screen'],
    ['d_you_1', 'note'],
    ['d_katechismus', 'plaque', { material: 'brass', size: [0.5, 0.66] }],
  ],
  banquet: [       // −13 Saal der Vierzig (die Reliquie und die Sitzordnung gehören der Story-Szene)
    ['d_menukarte', 'card'],
    ['d_margarete_1', 'sheet'],
    ['d_verlobung', 'note'],
    ['d_finn', 'bottle'],
    ['d_anselm_rezept_1', 'sheet'],
  ],
  ossuary: [       // −17 Beinhaus
    ['d_kenotaph', 'plaque', { material: 'stone', size: [0.95, 0.78] }],
    ['d_totenlitanei', 'plaque', { material: 'paint', size: [0.9, 0.72] }],
    ['d_regel', 'book', { cover: 'cloth' }],
    ['d_dieter_grab', 'slab'],
    ['d_brenner_brief_1', 'letter'],
    ['d_anselm_rezept_3', 'sheet'],
  ],
  mine: [          // −33 Bohrung Null
    ['d_bohrprotokoll', 'printout'],
    ['d_kessler_1', 'tape'],
    ['d_gebetsband', 'ribbons'],
    ['d_nia_1', 'radio'],
    ['d_brenner_brief_2', 'letter'],
    ['d_anselm_rezept_2', 'sheet'],
    ['d_kanzlei_brief', 'sealed'],
  ],
};

// Gehören in spätere Tiefen – werden erst verteilt, wenn es die Welten gibt (Themen-IDs dann in PLACEMENT eintragen)
export const LATER = {
  '−21 Stille Gemeinde': ['d_gemeinde', 'd_aurel_beichte'],
  '−48 Zehntleitungen': ['d_aksoy_2', 'd_margarete_2'],
  '−66 Alte Stadt': ['d_zeitung', 'd_margarete_band', 'd_aksoy_3', 'd_ilse_bild', 'd_kessler_2', 'd_nia_2', 'd_brenner_brief_3'],
  '−77 Gerüst': ['d_richtfest', 'd_arbeiterliste', 'd_brenner_brief_4'],
  '−99 Haus des Erbauers': ['d_kessler_3', 'd_arzt', 'd_you_2', 'd_you_3'],
  '−111 Kathedrale': ['d_kanzlei_beichte', 'd_oskar_letztes', 'd_aksoy_4', 'd_predigt', 'd_brenner_brief_5'],
  '−333 Schlund': ['d_kessler_4', 'd_brenner_notiz', 'd_you_4'],
  '−∞ Chor': ['d_namensschild'],
};

// Nie zufällig verteilen: Story-Szenen, Rätsel, Hub, Andenken
export const RESERVED = new Set(['d_reliquie', 'd_sitzordnung', 'd_siegelcode', 'd_zehntkabine', 'd_leitungsplan', 'd_puppe_handbuch', 'd_ilse_brief']);

// Lesen schaltet Kodex-Einträge frei
export const DOC_CODEX = {
  d_bohrprotokoll: ['bohrungNull'],
  d_neunerspiel: ['neunerspiel'],
  d_aksoy_3: ['chor'],
  d_kanzlei_beichte: ['chor'],
  d_kessler_3: ['portier'],
  d_brenner_notiz: ['schlund'],
};
const CODEX_BY_DOC = new Set(Object.values(DOC_CODEX).flat());
const CODEX_BY_SIGHT = { passenger: 'fahrgaeste', listener: 'hoerer', rats: 'ratten', porter: 'portier' };

// ============================================================================ Wissen & Text

// Ist ein Kodex-Eintrag lesbar? Grundwissen jeder Schachtratte + Freigeschaltetes
export function codexOpen(state, id) {
  const e = CODEX[id];
  if (!e) return false;
  if ((state?.codex || []).includes(id)) return true;
  if (e.locked || e.group === 'Wesen') return false;
  return !CODEX_BY_DOC.has(id);
}

// Neuer Kodex-Eintrag → Hinweis „Kodex: … · Tab“
export function unlockCodex(state, id, { silent = false } = {}) {
  if (!state || !CODEX[id]) return false;
  const list = (state.codex ||= []);
  if (list.includes(id)) return false;
  list.push(id);
  saveCampaign(state);
  if (!silent) {
    ui.hint('kodex_' + id, 'Tab', `Kodex: ${CODEX[id].title}`, 7);
    audio.play('paper', { vol: 0.2 });
  }
  return true;
}

// Erste Begegnung mit einem Wesen (vom Director)
export function unlockCodexForSight(state, kind) {
  const id = CODEX_BY_SIGHT[kind];
  return id ? unlockCodex(state, id) : false;
}

// Platzhalter ersetzen: {name} (fehlende Buchstaben als _), {NAME}, {initial}, {tally}
export function docText(d, state, { nights = null } = {}) {
  const name = state?.name || 'Namenlos';
  const NAME = nameWithLetters(name, state?.letters || 0);
  const a = [...name], b = [...NAME];
  const mixed = a.length === b.length ? a.map((c, i) => (b[i] === '_' && c !== '_' ? '_' : c)).join('') : NAME;
  const initial = b.find(c => c === '_' || /\p{L}/u.test(c)) || '?';
  const tally = nights ?? (state?.stats?.nights || 0);
  return String(d?.text || '')
    .replace(/\{name\}/g, mixed).replace(/\{NAME\}/g, NAME)
    .replace(/\{initial\}/g, initial).replace(/\{tally\}/g, String(tally));
}

// Gruppe eines Dokuments im Tagebuch
export function docGroup(id) {
  const d = DOCS[id];
  if (d?.chain && CHAINS[d.chain]) return d.chain;
  if (EXTRA_GROUP[id]) return EXTRA_GROUP[id];
  for (const [k, t] of Object.entries(TOPICS)) if (t.ids.includes(id)) return k;
  return 'lose';
}

export function groupInfo(key) {
  if (CHAINS[key]) return CHAINS[key];
  if (TOPICS[key]) return TOPICS[key];
  return { title: 'Einzelfunde', sub: 'Was sonst herumlag' };
}

// Alle Dokumente einer Gruppe in Lesereihenfolge
export function groupDocs(key) {
  const ids = Object.keys(DOCS).filter(id => docGroup(id) === key);
  const order = CHAINS[key]?.order || TOPICS[key]?.ids || [];
  return ids.sort((x, y) => (order.indexOf(x) + 1 || 999) - (order.indexOf(y) + 1 || 999));
}

// Dokument als gefunden merken (+ Kodex); true, wenn es neu ist
export function markDocFound(state, id) {
  if (!state || !DOCS[id]) return false;
  const list = (state.docs ||= []);
  const fresh = !list.includes(id);
  if (fresh) list.push(id);
  for (const c of DOC_CODEX[id] || []) unlockCodex(state, c);
  saveCampaign(state);
  return fresh;
}

// ============================================================================ Auswahl

function chainIndex(id) {
  const c = DOCS[id]?.chain;
  return c && CHAINS[c] ? CHAINS[c].order.indexOf(id) : -1;
}

// Welche Dokumente kommen heute Nacht in diese Welt? (je Kette nur das früheste ungefundene,
// fertig gelesene Vorgänger zuerst – hängt eine Kette, kommen trotzdem später auch ihre Nachfolger)
export function pickDocuments(themeId, state, rng, n) {
  const found = new Set(state?.docs || []);
  const table = (PLACEMENT[themeId] || []).filter(([id]) => DOCS[id] && !found.has(id) && !RESERVED.has(id));
  const best = new Map();
  table.forEach((row, i) => {
    const id = row[0], c = DOCS[id].chain, key = c && CHAINS[c] ? 'c:' + c : 'd:' + id;
    const cur = best.get(key);
    if (!cur || chainIndex(id) < chainIndex(cur.row[0])) best.set(key, { row, i });
  });
  const scored = [...best.values()].map(({ row, i }) => {
    const id = row[0], c = DOCS[id].chain, idx = chainIndex(id);
    const ready = idx <= 0 || CHAINS[c].order.slice(0, idx).every(p => found.has(p) || RESERVED.has(p) || !DOCS[p]);
    const tut = state?.flags?.tutorial ? -i * 10 : 0;
    return { row, score: (ready ? 2 : 0) + rng.next() + tut };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map(s => s.row);
}

// ============================================================================ Welt: platzieren, lesen, aufräumen

const runs = new WeakMap();   // game → { docs: [], fixtures: [] }

// Für Tests/Entwicklung: die Fundstücke der aktuellen Ebene
export function placedDocuments(game) { return runs.get(game)?.docs || []; }

export function clearDocuments(game) {
  const run = runs.get(game);
  if (!run) return;
  for (const r of run.docs) disposeRecord(game, r);
  run.docs.length = 0;
}

export function placeDocuments(game, level, info) {
  clearDocuments(game);
  const st = game.state;
  if (!level?.grid || !info || !PLACEMENT[info.themeId]) return [];
  const found = st.docs?.length || 0;
  const rng = new RNG(((info.seed ^ 0xd0c5) + found * 7919) >>> 0);
  const n = st.flags?.tutorial ? 1 : (rng.chance(0.45) ? 2 : 1);
  const picks = pickDocuments(info.themeId, st, rng, n + 2);   // Reserve, falls eine Form keinen Platz findet
  if (!picks.length) return [];
  const run = runs.get(game) || { docs: [] };
  runs.set(game, run);
  const finder = new SpotFinder(game, level, rng);
  try {
    for (const [id, form, opts = {}] of picks) {
      if (run.docs.length >= n) break;
      const spot = finder.find(form);
      if (!spot) continue;
      const rec = spawnDocument(game, id, form, opts, spot);
      if (rec) { run.docs.push(rec); finder.used.push(spot.pos.clone()); }
    }
  } catch (e) {
    console.warn('Dokumente: Platzierung fehlgeschlagen', e);
  }
  finder.dispose();
  return run.docs.map(r => ({ id: r.id, form: r.form, where: r.spot.kind, x: +r.spot.pos.x.toFixed(2), y: +r.spot.pos.y.toFixed(2), z: +r.spot.pos.z.toFixed(2) }));
}

// Formen: wo sie liegen dürfen, Grundfläche (liegend: Breite × Tiefe, Wand: Breite × Höhe), ob man sie einsteckt
const FORMS = {
  sheet:    { where: ['surface', 'wall', 'floor'], size: [0.24, 0.33], wall: [0.23, 0.32], take: true },
  note:     { where: ['surface', 'floor'], size: [0.14, 0.17], take: true },
  letter:   { where: ['surface', 'floor', 'wall'], size: [0.3, 0.26], wall: [0.19, 0.26], take: true },
  sealed:   { where: ['surface', 'floor'], size: [0.25, 0.19], take: true },
  book:     { where: ['surface', 'floor'], size: [0.37, 0.28], take: true },
  printout: { where: ['surface', 'floor'], size: [0.3, 0.34], floorSize: [0.32, 0.8], take: true },
  card:     { where: ['surface'], size: [0.17, 0.16], take: true },
  tape:     { where: ['surface', 'floor'], size: [0.26, 0.16], take: true },
  bottle:   { where: ['surface', 'floor'], size: [0.36, 0.12], take: false },
  radio:    { where: ['surface', 'floor'], size: [0.46, 0.36], take: 'paper' },
  chalk:    { where: ['floor'], size: [1.5, 0.8], take: false },
  slab:     { where: ['floor'], size: [0.85, 1.35], take: false },
  plaque:   { where: ['wall'], wall: [0.6, 0.7], take: false },
  ribbons:  { where: ['wall'], wall: [0.42, 0.55], take: false },
  poster:   { where: ['wall'], wall: [0.46, 0.64], take: false },
  screen:   { where: ['screen', 'surface'], size: [0.3, 0.34], take: false },
};

const PROMPT = {
  sheet: 'Lesen', note: 'Zettel lesen', letter: 'Brief lesen', sealed: 'Siegel brechen und lesen', book: 'Lesen',
  printout: 'Ausdruck lesen', card: 'Lesen', tape: 'Tonwalze abhören', bottle: 'Etikett lesen', radio: 'Mitschrift lesen',
  chalk: 'Kreide lesen', slab: 'Grabplatte lesen', plaque: 'Inschrift lesen', ribbons: 'Gebetsbänder lesen', poster: 'Lesen', screen: 'Bildschirm lesen',
};

function spawnDocument(game, id, form, opts, spot) {
  const d = DOCS[id];
  if (!d) return null;
  // Auf dem Bildschirm wird ein Ausdruck, wenn es keinen passenden Bildschirm gab
  const f = form === 'screen' && spot.kind !== 'screen' ? 'printout' : form;
  const text = docText(d, game.state, { nights: (game.state.stats?.nights || 0) + 1 });
  const built = MODELS[f]({ d, text, opts, spot, id });
  const group = built.group;
  group.position.copy(spot.pos);
  group.rotation.y = spot.ry;
  group.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  game.R.scene.add(group);
  group.updateMatrixWorld(true);

  const rec = { id, form: f, spot, group, take: FORMS[f].take, portable: built.portable || null, read: false, entry: null, fixture: null, shine: null };
  // Schimmer wie bei Beute: stärker, wenn die Lampe darauf zeigt
  const wall = spot.kind === 'wall' || spot.kind === 'screen';
  const shine = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff0d0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.06 }));
  shine.position.set(0, wall ? 0 : 0.07, wall ? 0.08 : 0);
  shine.renderOrder = 4;
  const phase = hash2(id.length, id.charCodeAt(2) || 1, 5) * 10;
  shine.onBeforeRender = (renderer, scene, camera) => {
    if (rec.read) { shine.material.opacity = 0; return; }
    _a.setFromMatrixPosition(shine.matrixWorld);
    _b.setFromMatrixPosition(camera.matrixWorld);
    camera.getWorldDirection(_c);
    _a.sub(_b);
    const dist = _a.length() || 1;
    const lamp = game.player?.lampLevel ?? 0;
    const lit = dist < 16 ? Math.max(0, (_a.dot(_c) / dist - 0.9) / 0.1) * (1 - dist / 16) * lamp : 0;
    const tw = 0.5 + 0.5 * Math.sin(performance.now() * 0.0021 + phase);
    const near = Math.min(1, Math.max(0.12, (dist - 1.2) / 2.5));   // aus der Nähe sieht man das Papier selbst
    shine.material.opacity = (0.05 + lit * 0.32 * (0.6 + tw * 0.4)) * near;
    shine.scale.setScalar((built.shineSize || 0.22) * (0.7 + lit * 0.35));
  };
  group.add(shine);
  rec.shine = shine;
  if (built.light) {
    rec.fixture = { pos: group.localToWorld(built.light.pos.clone()), color: built.light.color, intensity: built.light.intensity, distance: built.light.distance, mode: 'neon', flicker: 0.2, on: true, meshes: [] };
    game.pool.add(rec.fixture);
  }

  // Benutzen
  const epos = group.localToWorld((built.use || new THREE.Vector3(0, 0.1, wall ? 0.12 : 0)).clone());
  if (spot.kind === 'surface') epos.y = Math.max(epos.y, 0.95);
  const title = d.title.length > 38 ? d.title.slice(0, 36) + '…' : d.title;
  rec.entry = game.interact.add({
    tag: 'world', pos: epos, radius: built.radius || 0.4, maxDist: spot.kind === 'floor' ? 2.7 : 2.4, priority: 0.12,
    prompt: () => rec.read ? 'Nochmals lesen' : PROMPT[f] || 'Lesen',
    sub: () => title,
    enabled: () => !game.busy && !game.player?.dead,
    onUse: () => readDocument(game, rec),
  });
  return rec;
}

async function readDocument(game, rec) {
  const d = DOCS[rec.id];
  const st = game.state;
  const first = !(st.docs || []).length;
  const fresh = markDocFound(st, rec.id);
  if (rec.form === 'tape') { audio.play('phonePickup', { vol: 0.4 }); audio.play('crankTick', { vol: 0.3 }); }
  else if (rec.form === 'screen') audio.play('komBeep', { n: 1, vol: 0.2 });
  const text = docText(d, st, { nights: (st.stats?.nights || 0) + (game.mode === 'night' ? 1 : 0) });
  await game._openPanel(async () => {
    if (d.voice?.length) voice.sequence(d.voice, 0.4);
    await ui.doc(d, text);
    if (d.voice?.length) voice.stop?.();
  });
  if (!game.paused && game.mode !== 'ride') input.lock();
  rec.read = true;
  if (rec.take) {
    audio.play('pickup', { pos: rec.group.position, vol: 0.35 });
    if (rec.take === 'paper' && rec.portable) { rec.portable.removeFromParent(); disposeTree(rec.portable); rec.portable = null; }
    else if (rec.take === true) {
      game.interact.remove(rec.entry); rec.entry = null;
      rec.group.visible = false;
    }
  }
  if (fresh) {
    const g = docGroup(rec.id), all = groupDocs(g), have = all.filter(x => st.docs.includes(x)).length;
    ui.toast(`Ins Tagebuch: ${groupInfo(g).title} · ${have}/${all.length}`);
    if (first) ui.hint('journal', 'Tab', 'Tagebuch: Dokumente, Kodex, Aufträge', 9);
  }
}

function disposeRecord(game, rec) {
  if (rec.entry) game.interact.remove(rec.entry);
  if (rec.fixture) game.pool.remove?.(rec.fixture);
  rec.group.removeFromParent();
  disposeTree(rec.group);
}

function disposeTree(root) {
  root.traverse(o => {
    o.geometry?.dispose?.();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) {
      if (!m.userData?.own && !o.isSprite) continue;
      if (m.userData?.own) m.map?.dispose?.();
      if (m.userData?.own && m.emissiveMap && m.emissiveMap !== m.map) m.emissiveMap.dispose();
      m.dispose();
    }
  });
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3();

// ============================================================================ Plätze finden
// Kleiner Strahltest nur für die Ebene (Dreiecke in 1-m-Zellen): Tischplatten, Wände, Boden, eben und frei.

class LevelProbe {
  constructor(root) {
    root.updateMatrixWorld(true);
    const meshes = [];
    root.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.visible !== false && o.geometry?.attributes?.position) meshes.push(o); });
    let n = 0;
    for (const m of meshes) { const g = m.geometry; n += Math.floor((g.index ? g.index.count : g.attributes.position.count) / 3); }
    this.tri = new Float32Array(n * 9);
    this.solid = new Uint8Array(n);
    this.stamp = new Uint32Array(n);
    this.q = 0;
    this.cells = new Map();
    const v = new THREE.Vector3();
    let t = 0;
    for (const m of meshes) {
      const g = m.geometry, pos = g.attributes.position, idx = g.index;
      const cnt = Math.floor((idx ? idx.count : pos.count) / 3);
      const solid = m.userData.builder ? 1 : 0;   // verschmolzene Bauteile; Abziehbilder/Leuchten zählen als Hindernis
      for (let i = 0; i < cnt; i++, t++) {
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
        for (let k = 0; k < 3; k++) {
          v.fromBufferAttribute(pos, idx ? idx.getX(i * 3 + k) : i * 3 + k).applyMatrix4(m.matrixWorld);
          const o = t * 9 + k * 3;
          this.tri[o] = v.x; this.tri[o + 1] = v.y; this.tri[o + 2] = v.z;
          if (v.x < x0) x0 = v.x; if (v.x > x1) x1 = v.x; if (v.z < z0) z0 = v.z; if (v.z > z1) z1 = v.z;
        }
        this.solid[t] = solid;
        const cx0 = Math.floor(x0), cx1 = Math.floor(x1), cz0 = Math.floor(z0), cz1 = Math.floor(z1);
        if ((cx1 - cx0 + 1) * (cz1 - cz0 + 1) > 400) continue;   // riesige Flächen (Himmel o. Ä.) auslassen
        for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
          const key = cx * 4096 + cz;
          let arr = this.cells.get(key);
          if (!arr) this.cells.set(key, arr = []);
          arr.push(t);
        }
      }
    }
    this.count = n;
  }

  // Strahl (o + d·t, t ≤ maxT) → nächster Treffer { t, nx, ny, nz, solid, front } oder null
  cast(ox, oy, oz, dx, dy, dz, maxT) {
    const ex = ox + dx * maxT, ez = oz + dz * maxT;
    const cx0 = Math.floor(Math.min(ox, ex) - 0.01), cx1 = Math.floor(Math.max(ox, ex) + 0.01);
    const cz0 = Math.floor(Math.min(oz, ez) - 0.01), cz1 = Math.floor(Math.max(oz, ez) + 0.01);
    const q = ++this.q, T = this.tri;
    let best = maxT, hit = -1, hnx = 0, hny = 0, hnz = 0;
    for (let cx = cx0; cx <= cx1; cx++) for (let cz = cz0; cz <= cz1; cz++) {
      const arr = this.cells.get(cx * 4096 + cz);
      if (!arr) continue;
      for (const t of arr) {
        if (this.stamp[t] === q) continue;
        this.stamp[t] = q;
        const o = t * 9;
        const e1x = T[o + 3] - T[o], e1y = T[o + 4] - T[o + 1], e1z = T[o + 5] - T[o + 2];
        const e2x = T[o + 6] - T[o], e2y = T[o + 7] - T[o + 1], e2z = T[o + 8] - T[o + 2];
        const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
        const det = e1x * px + e1y * py + e1z * pz;
        if (Math.abs(det) < 1e-12) continue;
        const inv = 1 / det;
        const sx = ox - T[o], sy = oy - T[o + 1], sz = oz - T[o + 2];
        const u = (sx * px + sy * py + sz * pz) * inv;
        if (u < 0 || u > 1) continue;
        const qx = sy * e1z - sz * e1y, qy = sz * e1x - sx * e1z, qz = sx * e1y - sy * e1x;
        const w = (dx * qx + dy * qy + dz * qz) * inv;
        if (w < 0 || u + w > 1) continue;
        const tt = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (tt <= 1e-5 || tt >= best) continue;
        best = tt; hit = t;
        hnx = e1y * e2z - e1z * e2y; hny = e1z * e2x - e1x * e2z; hnz = e1x * e2y - e1y * e2x;
      }
    }
    if (hit < 0) return null;
    const l = Math.hypot(hnx, hny, hnz) || 1;
    hnx /= l; hny /= l; hnz /= l;
    return { t: best, nx: hnx, ny: hny, nz: hnz, solid: !!this.solid[hit], front: hnx * dx + hny * dy + hnz * dz < 0 };
  }
}

class SpotFinder {
  constructor(game, level, rng) {
    this.g = game; this.level = level; this.rng = rng;
    this.grid = level.grid;
    this.used = [];
    this._probe = null;
    this._cells = null;
  }
  get probe() { return this._probe || (this._probe = new LevelProbe(this.level.group)); }
  dispose() { this._probe = null; }

  // Ruhige Zellen zuerst: kleine Räume, Nischen mit viel Wand, weit weg von der Kabine
  cells() {
    if (this._cells) return this._cells;
    const g = this.grid, rng = this.rng, out = [];
    for (let z = 0; z < g.h; z++) for (let x = 0; x < g.w; x++) {
      if (!g.isFloor(x, z) || g.isCabin(x, z) || g.isLanding(x, z)) continue;
      const dist = g.dist?.[g.idx(x, z)] ?? 10;
      if (dist < 4) continue;
      const room = g.room[g.idx(x, z)], kind = room >= 0 ? g.rooms[room]?.kind : 'gang';
      let walls = 0;
      for (const d of DIRS) if (g.get(x + d.dx, z + d.dz) === SOLID) walls++;
      const score = (kind === 'room' ? 1.3 : kind === 'hall' ? 0.6 : 0) + walls * 0.45 + Math.min(dist, 24) * 0.035 + rng.next() * 1.4;
      out.push({ x, z, score });
    }
    out.sort((a, b) => b.score - a.score);
    return (this._cells = out);
  }

  // Abstand zu anderen Fundstücken, Beute, Auftragszielen
  crowded(x, z, r = 1.0) {
    for (const p of this.used) if (Math.hypot(p.x - x, p.z - z) < 5) return true;
    for (const it of this.g.items?.items?.values?.() || []) if (!it.holder && Math.hypot(it.pos.x - x, it.pos.z - z) < r) return true;
    for (const p of this.g.contracts?.props || []) if (Math.hypot(p.position.x - x, p.position.z - z) < 1.6) return true;
    for (const rl of this.g.contracts?.relays || []) if (rl.pos && Math.hypot(rl.pos.x - x, rl.pos.z - z) < 1.6) return true;
    return false;
  }

  // Kann man sich davorstellen und es sehen?
  reachable(x, z, y) {
    const col = this.g.col;
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2 + this.rng.next() * 0.3;
      for (const r of [0.75, 1.1]) {
        const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
        if (col.pointFree(px, pz, 0.3, 0.1, 1.7) && col.lineClear(px, pz, x, z, Math.max(y + 0.1, 0.95))) return true;
      }
    }
    return false;
  }

  find(form) {
    const F = FORMS[form];
    for (const where of F.where) {
      const s = where === 'surface' ? this.surface(F.size)
        : where === 'floor' ? this.floor(F.floorSize || F.size, form === 'slab' ? 0.8 : form === 'chalk' ? 0.85 : 0.3)
        : where === 'wall' ? this.wall(F.wall || F.size, form === 'plaque' ? [1.3, 1.5] : form === 'ribbons' ? [1.45, 1.65] : [1.3, 1.55])
        : where === 'screen' ? this.screen() : null;
      if (s) return s;
    }
    return null;
  }

  // Punkte auf einem gedrehten Rechteck (3 × 3)
  footprint(x, z, w, d, ry) {
    const c = Math.cos(ry), s = Math.sin(ry), pts = [];
    for (const u of [-0.5, 0, 0.5]) for (const v of [-0.5, 0, 0.5]) {
      const lx = u * w, lz = v * d;
      pts.push([x + lx * c + lz * s, z - lx * s + lz * c]);
    }
    return pts;
  }

  // Ebene, freie Fläche (Tisch, Pult, Kiste, Sarg) zwischen 0,4 und 1,3 m
  surface([w, d]) {
    const P = this.probe, rng = this.rng;
    let tries = 0;
    for (const c of this.cells()) {
      if (tries > 260) break;
      const [cx, cz] = this.level.center(c.x, c.z);
      for (let k = 0; k < 7; k++, tries++) {
        const x = cx + rng.float(-1.1, 1.1), z = cz + rng.float(-1.1, 1.1);
        if (this.crowded(x, z)) continue;
        const h = P.cast(x, 2.3, z, 0, -1, 0, 2.3);
        if (!h || !h.solid || !h.front || h.ny < 0.96) continue;
        const y = 2.3 - h.t;
        if (y < 0.4 || y > 1.3) continue;
        const ry = rng.float(-Math.PI, Math.PI);
        if (!this.flatDown(x, z, w + 0.04, d + 0.04, ry, y, 0.007)) continue;
        const up = P.cast(x, y + 0.01, z, 0, 1, 0, 0.45);
        if (up) continue;
        if (!this.reachable(x, z, y)) continue;
        return { kind: 'surface', pos: new THREE.Vector3(x, y, z), ry };
      }
    }
    return null;
  }

  flatDown(x, z, w, d, ry, y, tol) {
    const P = this.probe;
    for (const [px, pz] of this.footprint(x, z, w, d, ry)) {
      const h = P.cast(px, y + 0.3, pz, 0, -1, 0, 0.6);
      if (!h || !h.solid || !h.front || h.ny < 0.96) return false;
      if (Math.abs((y + 0.3 - h.t) - y) > tol) return false;
    }
    return true;
  }

  // Boden, möglichst an einer Wand, darüber frei
  floor([w, d], clear = 0.3) {
    const P = this.probe, rng = this.rng, col = this.g.col;
    let tries = 0;
    for (const c of this.cells()) {
      if (tries > 200) break;
      const slots = this.level.wallSlots([[c.x, c.z]], clear + Math.min(w, d) / 2 + 0.12);
      const cand = slots.map(s => ({ x: s.x, z: s.z, ry: s.ry, t: s.dir }));
      const [cx, cz] = this.level.center(c.x, c.z);
      cand.push({ x: cx + rng.float(-0.6, 0.6), z: cz + rng.float(-0.6, 0.6), ry: rng.float(-Math.PI, Math.PI) });
      for (const k of rng.shuffle(cand)) {
        tries++;
        // an der Wand entlang verschieben
        const along = k.t ? rng.float(-0.7, 0.7) : 0;
        const x = k.x + (k.t ? -k.t.dz * along : 0), z = k.z + (k.t ? k.t.dx * along : 0);
        const ry = k.t ? k.ry + rng.float(-0.35, 0.35) : k.ry;
        if (this.crowded(x, z, 1.2)) continue;
        if (!col.pointFree(x, z, Math.max(w, d) / 2 + 0.08, 0.02, 1.8)) continue;
        const h = P.cast(x, 1.2, z, 0, -1, 0, 1.4);
        if (!h || !h.solid || !h.front || h.ny < 0.96) continue;
        const y = 1.2 - h.t;
        if (Math.abs(y) > 0.05) continue;
        if (!this.flatDown(x, z, w + 0.04, d + 0.04, ry, y, 0.006)) continue;
        if (P.cast(x, y + 0.02, z, 0, 1, 0, 1.6)) continue;
        if (!this.reachable(x, z, y)) continue;
        return { kind: 'floor', pos: new THREE.Vector3(x, y, z), ry };
      }
    }
    return null;
  }

  // Glatte, freie Wandstelle; zurück kommt der Punkt auf der Wandoberfläche, ry = Blick aus der Wand
  wall([w, h], [y0, y1]) {
    const P = this.probe, rng = this.rng, col = this.g.col;
    let tries = 0;
    for (const c of this.cells()) {
      if (tries > 220) break;
      for (const s of rng.shuffle(this.level.wallSlots([[c.x, c.z]], 0))) {
        tries++;
        const nx = -s.dir.dx, nz = -s.dir.dz;            // Wandnormale (in die Zelle)
        const tx = -nz, tz = nx;                          // entlang der Wand
        const along = rng.float(-0.75, 0.75), yc = rng.float(y0, y1);
        const bx = s.x + tx * along, bz = s.z + tz * along;
        const ox = bx + nx * 0.7, oz = bz + nz * 0.7;
        if (this.crowded(bx, bz, 1.2)) continue;
        if (!col.pointFree(bx + nx * 0.6, bz + nz * 0.6, 0.3, 0.1, 1.7)) continue;
        const pts = [];
        for (const u of [-0.5, 0, 0.5]) for (const v of [-0.5, 0, 0.5]) pts.push([u * (w + 0.04), v * (h + 0.04)]);
        let tc = null, ok = true;
        for (const [u, v] of pts) {
          const hit = P.cast(ox + tx * u, yc + v, oz + tz * u, -nx, 0, -nz, 1.3);
          if (!hit || !hit.solid || !hit.front || (hit.nx * nx + hit.nz * nz) < 0.96) { ok = false; break; }
          if (tc === null) tc = hit.t;
          else if (Math.abs(hit.t - tc) > 0.008) { ok = false; break; }
        }
        if (!ok || tc === null || tc < 0.45 || tc > 1.0) continue;
        const px = ox - nx * tc, pz = oz - nz * tc;
        if (!this.reachable(px + nx * 0.5, pz + nz * 0.5, yc)) continue;
        return { kind: 'wall', pos: new THREE.Vector3(px, yc, pz), ry: Math.atan2(nx, nz) };
      }
    }
    return null;
  }

  // Bildschirm eines Schreibpults (Skriptorium)
  screen() {
    const desks = (this.level.anchors?.desks || []).filter(dk => dk.screen && !this.crowded(dk.x, dk.z, 1.0));
    if (!desks.length) return null;
    const dk = this.rng.pick(desks), sc = dk.screen;
    const nx = Math.sin(sc.ry), nz = Math.cos(sc.ry);
    return { kind: 'screen', pos: new THREE.Vector3(sc.pos[0] + nx * 0.004, sc.y, sc.pos[1] + nz * 0.004), ry: sc.ry };
  }
}

// ============================================================================ Texturen

const FONT = { hand: '"Caveat", cursive', type: '"Special Elite", "Courier New", monospace', serif: '"Cormorant Garamond", "Times New Roman", serif', mono: '"VT323", "Consolas", monospace' };
if (typeof document !== 'undefined' && document.fonts?.load) {
  for (const f of ['18px "Caveat"', '700 18px "Caveat"', '14px "Special Elite"', '16px "VT323"', '700 20px "Cormorant Garamond"', '400 16px "Cormorant Garamond"']) document.fonts.load(f).catch(() => {});
}

function seedOf(s) { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h >>> 0; }

// Papiergrund: Fasern, dunkle Ränder, Flecken
function paperBase(g, w, h, { base = [216, 202, 168], grain = 0.14, edge = 0.28, seed = 1, stains = 2, stain = '90,60,20' } = {}) {
  const img = g.createImageData(w, h), px = img.data;
  const m = Math.min(w, h) * 0.16;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = hash2(x >> 2, y >> 2, seed) * 0.55 + hash2(x, y, seed + 1) * 0.45;
    const e = Math.min(1, Math.min(x, y, w - 1 - x, h - 1 - y) / m);
    const k = (1 - grain / 2 + n * grain) * (1 - edge + edge * e);
    const i = (y * w + x) * 4;
    px[i] = base[0] * k; px[i + 1] = base[1] * k; px[i + 2] = base[2] * k; px[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  for (let s = 0; s < stains; s++) {
    const cx = hash2(s, 3, seed) * w, cy = hash2(s, 7, seed) * h, r = (0.08 + hash2(s, 9, seed) * 0.16) * w;
    const grd = g.createRadialGradient(cx, cy, r * 0.1, cx, cy, r);
    grd.addColorStop(0, `rgba(${stain},0.12)`); grd.addColorStop(0.8, `rgba(${stain},0.06)`); grd.addColorStop(1, `rgba(${stain},0)`);
    g.fillStyle = grd; g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  }
}

function coffeeRing(g, x, y, r) {
  g.save();
  g.strokeStyle = 'rgba(92,52,20,0.32)'; g.lineWidth = r * 0.12;
  g.beginPath(); g.arc(x, y, r, 0.3, Math.PI * 2 - 0.2); g.stroke();
  g.strokeStyle = 'rgba(92,52,20,0.14)'; g.lineWidth = r * 0.3;
  g.beginPath(); g.arc(x + r * 0.05, y - r * 0.04, r * 0.9, 0, Math.PI * 2); g.stroke();
  g.restore();
}

function wrapLines(g, text, maxW, keep = false) {
  const out = [];
  for (const para of String(text).split('\n')) {
    if (keep) { let l = para; while (g.measureText(l).width > maxW && l.length > 4) l = l.slice(0, -1); out.push(l); continue; }
    if (!para.trim()) { out.push(''); continue; }
    let line = '';
    for (const word of para.split(/(\s+)/)) {
      const t = line + word;
      if (g.measureText(t).width > maxW && line.trim()) { out.push(line.trimEnd()); line = word.trimStart(); } else line = t;
    }
    out.push(line);
  }
  return out;
}

function writeText(g, text, { x, y, w, lh, maxY, font, color, keep = false, tilt = 0, seed = 1, align = 'left' }) {
  g.font = font; g.fillStyle = color; g.textBaseline = 'alphabetic'; g.textAlign = align;
  const lines = wrapLines(g, text, w, keep);
  let i = 0;
  for (const l of lines) {
    if (y > maxY) break;
    if (l) {
      g.save();
      g.translate(align === 'center' ? x + w / 2 : x, y);
      if (tilt) g.rotate((hash2(i, 3, seed) - 0.5) * tilt);
      g.globalAlpha = 0.78 + hash2(i, 5, seed) * 0.22;
      g.fillText(l, 0, 0);
      g.restore();
    }
    y += lh; i++;
  }
  return y;
}

function ownMat(opts) { const m = new THREE.MeshStandardMaterial({ roughness: 0.92, metalness: 0, ...opts }); m.userData.own = true; return m; }
// Papier etwas dunkler als die Textur, damit es im Lampenkegel nicht ausbrennt
function paperMat(tex, extra = {}) { return ownMat({ map: tex, color: 0xb4ab9a, side: THREE.DoubleSide, ...extra }); }

// Seite im Stil des Dokuments (liegend/angeheftet)
function pageTexture(d, text, style, { w = 256, h = 362, seed = 1, coffee = false, title = null } = {}) {
  return textTexture(w, h, (g) => {
    const pad = w * 0.09;
    if (style === 'terminal') {
      paperBase(g, w, h, { base: [232, 234, 222], grain: 0.08, edge: 0.15, seed, stains: 1 });
      g.fillStyle = 'rgba(110,170,110,0.16)';
      for (let y = 20; y < h; y += 28) g.fillRect(18, y, w - 36, 14);
      g.fillStyle = 'rgba(40,40,36,0.55)';
      for (let y = 10; y < h; y += 16) { g.beginPath(); g.arc(8, y, 3, 0, 7); g.arc(w - 8, y, 3, 0, 7); g.fill(); }
      writeText(g, (title ? title.toUpperCase() + '\n\n' : '') + text, { x: 22, y: 26, w: w - 44, lh: 13, maxY: h - 8, font: `13px ${FONT.mono}`, color: '#23291f', keep: true });
    } else if (style === 'church') {
      paperBase(g, w, h, { base: [226, 208, 168], seed, stains: 2 });
      g.strokeStyle = '#6a1a10'; g.lineWidth = 2; g.strokeRect(9, 9, w - 18, h - 18);
      g.lineWidth = 0.8; g.strokeRect(13, 13, w - 26, h - 26);
      drawDialSymbol(g, w / 2, 36, 14, '#7a1a10', -0.5);
      let y = writeText(g, title || d.title, { x: pad, y: 66, w: w - pad * 2, lh: 18, maxY: 120, font: `700 16px ${FONT.serif}`, color: '#6a1a10', align: 'center' });
      writeText(g, text, { x: pad, y: y + 8, w: w - pad * 2, lh: 12.5, maxY: h - 18, font: `11px ${FONT.serif}`, color: '#2a1a10' });
    } else if (style === 'child') {
      paperBase(g, w, h, { base: [238, 230, 206], seed, stains: 1, grain: 0.08 });
      g.strokeStyle = 'rgba(40,80,190,0.55)'; g.lineWidth = 5;
      g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, h - 40 + Math.sin(x * 0.08) * 6); g.stroke();
      g.fillStyle = 'rgba(240,190,40,0.8)'; g.beginPath(); g.arc(w - 44, 44, 20, 0, 7); g.fill();
      writeText(g, text.toLowerCase(), { x: pad, y: 96, w: w - pad * 2, lh: 24, maxY: h - 60, font: `700 20px ${FONT.hand}`, color: '#2d46a8', tilt: 0.12, seed });
    } else if (style === 'note') {
      paperBase(g, w, h, { base: [222, 212, 188], seed, stains: 2 });
      writeText(g, (title ? title.toUpperCase() + '\n\n' : '') + text, { x: pad, y: 30, w: w - pad * 2, lh: 13, maxY: h - 14, font: `10.5px ${FONT.type}`, color: '#2a2218' });
    } else { // hand
      paperBase(g, w, h, { base: [214, 198, 158], seed, stains: 2 });
      g.strokeStyle = 'rgba(70,90,140,0.18)'; g.lineWidth = 1;
      for (let y = 34; y < h - 10; y += 17) { g.beginPath(); g.moveTo(8, y + 2); g.lineTo(w - 8, y + 2); g.stroke(); }
      writeText(g, text, { x: pad, y: 34, w: w - pad * 2, lh: 17, maxY: h - 12, font: `16px ${FONT.hand}`, color: '#231a2c', tilt: 0.05, seed });
    }
    if (coffee) coffeeRing(g, w * 0.72, h * 0.8, w * 0.13);
  });
}

// Eingemeißelt/gemalt/graviert (Tafeln, Grabplatten)
function inscriptionTexture(d, text, kind, { w = 512, h = 420, seed = 1 } = {}) {
  return textTexture(w, h, (g) => {
    let base, ink, hi;
    if (kind === 'brass') { base = [120, 92, 48]; ink = 'rgba(40,26,10,0.9)'; hi = 'rgba(255,220,150,0.35)'; }
    else if (kind === 'paint') { base = [62, 18, 14]; ink = 'rgba(232,190,96,0.95)'; hi = null; }
    else { base = [118, 112, 104]; ink = 'rgba(28,24,22,0.85)'; hi = 'rgba(230,224,210,0.28)'; }
    paperBase(g, w, h, { base, grain: kind === 'paint' ? 0.2 : 0.3, edge: 0.2, seed, stains: 3, stain: kind === 'paint' ? '20,5,0' : '30,26,20' });
    if (kind === 'paint') { g.strokeStyle = 'rgba(232,190,96,0.8)'; g.lineWidth = 4; g.strokeRect(14, 14, w - 28, h - 28); }
    const lines = String(text).split('\n');
    const size = kind === 'paint' ? 17 : 16;
    const font = kind === 'paint' ? `600 ${size}px ${FONT.serif}` : `700 ${size}px ${FONT.serif}`;
    const body = lines.join('\n');
    const draw = (dx, dy, col) => writeText(g, body, { x: 34 + dx, y: 44 + dy, w: w - 68, lh: size + 4, maxY: h - 20, font, color: col, align: 'center' });
    if (hi) draw(1, 1.2, hi);
    draw(0, 0, ink);
  });
}

// ============================================================================ Modelle (Ursprung = Auflagepunkt; liegend in XZ, an der Wand in XY mit +Z aus der Wand)

function curledPlane(w, h, curl = 0.01, seed = 1) {
  const geo = new THREE.PlaneGeometry(w, h, 8, 6);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2);
    const lift = curl * (x * x * 0.6 + Math.max(0, y) ** 3 * 0.8) + (hash2(i, 1, seed) - 0.5) * curl * 0.15;
    p.setZ(i, lift);
  }
  geo.computeVertexNormals();
  return geo;
}

// liegendes Blatt (Plane in XZ)
function flatSheet(tex, w, h, y, curl, seed) {
  const m = new THREE.Mesh(curledPlane(w, h, curl, seed), paperMat(tex));
  m.rotation.x = -Math.PI / 2;
  m.position.y = y;
  return m;
}

function pin(group, x, y, color = 0x8a1a12) {
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, 0.02, 6), mat('steel'));
  shaft.rotation.x = Math.PI / 2; shaft.position.set(x, y, 0.008);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.007, 8, 6), ownMat({ color, roughness: 0.4, metalness: 0.2 }));
  head.position.set(x, y, 0.018);
  group.add(shaft, head);
}

const MODELS = {
  sheet({ d, text, spot, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const style = d.style === 'church' ? 'church' : d.style === 'terminal' ? 'terminal' : d.style === 'child' ? 'child' : d.style === 'note' ? 'note' : 'hand';
    const tex = pageTexture(d, text, style, { seed });
    if (spot.kind === 'wall') {
      const m = new THREE.Mesh(curledPlane(0.21, 0.297, 0.012, seed), paperMat(tex));
      m.position.z = 0.004;
      group.add(m);
      pin(group, 0, 0.13);
      return { group, use: new THREE.Vector3(0, 0, 0.14) };
    }
    group.add(flatSheet(tex, 0.21, 0.297, 0.003, 0.008, seed));
    if (hash2(seed, 2, 3) < 0.6) {   // zweites, leeres Blatt darunter
      const under = flatSheet(pageTexture(d, '', style, { seed: seed + 9 }), 0.21, 0.297, 0.0015, 0.004, seed + 1);
      under.rotation.z = 0.35; under.position.x = 0.03;
      group.add(under);
    }
    return { group };
  },

  note({ d, text, id }) {
    // gefalteter Zettel, halb aufgeklappt
    const group = new THREE.Group(), seed = seedOf(id);
    const tex = pageTexture(d, text, d.style === 'note' ? 'note' : 'hand', { w: 180, h: 240, seed });
    const w = 0.11, h = 0.145;
    const a = new THREE.Mesh(new THREE.PlaneGeometry(w, h / 2), paperMat(tex.clone()));
    a.material.map.repeat.set(1, 0.5); a.material.map.offset.set(0, 0.5); a.material.map.needsUpdate = true;
    a.rotation.x = -Math.PI / 2; a.position.set(0, 0.0015, -h / 4);
    const hinge = new THREE.Group(); hinge.position.set(0, 0.0015, 0);
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, h / 2), paperMat(tex));
    b.material.map.repeat.set(1, 0.5); b.material.map.needsUpdate = true;
    b.position.set(0, 0, h / 4);
    b.rotation.x = -Math.PI / 2;
    hinge.add(b);
    hinge.rotation.x = -0.45;
    group.add(a, hinge);
    return { group, shineSize: 0.16 };
  },

  letter({ d, text, spot, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const tex = pageTexture(d, text, 'hand', { seed });
    if (spot.kind === 'wall') {
      const m = new THREE.Mesh(curledPlane(0.17, 0.24, 0.01, seed), paperMat(tex));
      m.position.z = 0.004; group.add(m); pin(group, 0, 0.105, 0x2a2a2a);
      return { group, use: new THREE.Vector3(0, 0, 0.14) };
    }
    const envTex = textTexture(256, 160, (g) => {
      paperBase(g, 256, 160, { base: [198, 180, 140], seed: seed + 3, stains: 1 });
      g.strokeStyle = 'rgba(90,70,40,0.35)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(128, 86); g.lineTo(256, 0); g.stroke();
      g.fillStyle = 'rgba(150,40,30,0.55)'; g.fillRect(200, 16, 34, 40);
      g.font = `22px ${FONT.hand}`; g.fillStyle = '#2a2030'; g.fillText('An Lotte', 70, 124);
    });
    const env = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.003, 0.12), [ownMat({ color: 0xb8a078 }), ownMat({ color: 0xb8a078 }), paperMat(envTex), ownMat({ color: 0xb8a078 }), ownMat({ color: 0xb8a078 }), ownMat({ color: 0xb8a078 })]);
    env.position.y = 0.0015;
    const sheet = flatSheet(tex, 0.16, 0.225, 0.0045, 0.006, seed);
    sheet.rotation.z = 0.5; sheet.position.set(0.06, 0.0045, 0.05);
    group.add(env, sheet);
    return { group };
  },

  sealed({ d, text, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const outside = textTexture(256, 180, (g) => {
      paperBase(g, 256, 180, { base: [220, 200, 160], seed, stains: 2 });
      g.strokeStyle = 'rgba(80,50,20,0.3)'; g.beginPath(); g.moveTo(0, 60); g.lineTo(256, 60); g.moveTo(0, 120); g.lineTo(256, 120); g.stroke();
      g.font = `italic 20px ${FONT.serif}`; g.fillStyle = '#3a2412'; g.textAlign = 'center';
      g.fillText((d.text.split('\n')[0] || d.title).slice(0, 28), 128, 100);
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.008, 0.15), [ownMat({ color: 0xcdb58a }), ownMat({ color: 0xcdb58a }), paperMat(outside), ownMat({ color: 0xcdb58a }), ownMat({ color: 0xcdb58a }), ownMat({ color: 0xcdb58a })]);
    body.position.y = 0.004; body.castShadow = true;
    const wax = ownMat({ color: 0x7a0e0a, roughness: 0.35, metalness: 0.05 });
    for (const s of [-1, 1]) {   // gebrochenes Siegel
      const half = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.021, 0.006, 16, 1, false, s > 0 ? 0 : Math.PI, Math.PI), wax);
      half.position.set(0.004 * s, 0.011, 0.0); half.rotation.y = 0.2;
      group.add(half);
    }
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.002, 0.2), mat('fabricRed'));
    ribbon.position.set(-0.02, 0.009, 0.02); ribbon.rotation.y = 0.25;
    group.add(body, ribbon);
    return { group, shineSize: 0.2 };
  },

  book({ d, text, opts, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const style = d.style === 'church' ? 'church' : d.style === 'terminal' ? 'note' : d.style === 'note' ? 'note' : 'hand';
    const tex = textTexture(512, 362, (g) => {
      const left = pageTexture(d, text, style, { w: 256, h: 362, seed }).image;
      const cut = text.length > 380 ? text.slice(380) : '';
      const right = pageTexture(d, cut, style === 'church' ? 'note' : style, { w: 256, h: 362, seed: seed + 5, title: null }).image;
      g.drawImage(left, 0, 0); g.drawImage(right, 256, 0);
      const grd = g.createLinearGradient(236, 0, 276, 0);
      grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(0.5, 'rgba(40,24,10,0.45)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(236, 0, 40, 362);
    });
    const coverMat = opts.cover === 'cloth' ? mat('fabricRed') : mat('leather');
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.01, 0.235), coverMat);
    cover.position.y = 0.005; cover.castShadow = true;
    const blockMat = ownMat({ color: 0xd8c8a0, roughness: 0.95 });
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.018, 0.215), blockMat);
      b.position.set(s * 0.079, 0.018, 0); b.rotation.z = -s * 0.05;
      group.add(b);
    }
    // aufgeschlagene Seiten mit leichtem V zum Rücken
    const geo = new THREE.PlaneGeometry(0.31, 0.215, 2, 1);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i)) < 0.01) p.setZ(i, -0.006);
    geo.computeVertexNormals();
    const pages = new THREE.Mesh(geo, paperMat(tex));
    pages.rotation.x = -Math.PI / 2; pages.position.y = 0.0285;
    const mark = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.001, 0.16), mat('fabricRed'));
    mark.position.set(0.02, 0.029, 0.09);
    group.add(cover, pages, mark);
    return { group, shineSize: 0.26 };
  },

  printout({ d, text, spot, opts, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const tex = pageTexture(d, text, 'terminal', { w: 256, h: 300, seed, coffee: !!opts.coffee, title: d.title });
    const blank = ownMat({ color: 0xe0e2d6, roughness: 0.95 });
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.0024, 0.28), blank);
      s.position.set((hash2(i, 1, seed) - 0.5) * 0.012, 0.0012 + i * 0.0025, (hash2(i, 2, seed) - 0.5) * 0.01);
      s.rotation.y = (hash2(i, 3, seed) - 0.5) * 0.05;
      group.add(s);
    }
    group.add(flatSheet(tex, 0.24, 0.28, 0.011, 0.002, seed));
    if (spot.kind === 'floor') {   // ein Stück Endlospapier, das sich über den Boden zieht
      const geo = new THREE.PlaneGeometry(0.24, 0.42, 1, 10);
      const p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const v = (p.getY(i) + 0.21) / 0.42; p.setZ(i, 0.001 + 0.009 * v + Math.sin(v * Math.PI) * 0.03 * (1 - v)); }
      geo.computeVertexNormals();
      const strip = new THREE.Mesh(geo, paperMat(pageTexture(d, text.split('\n').slice(18).join('\n'), 'terminal', { w: 256, h: 300, seed: seed + 2 })));
      strip.rotation.x = -Math.PI / 2; strip.position.set(0, 0, 0.35);
      group.add(strip);
    }
    return { group };
  },

  card({ d, text, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const tex = textTexture(200, 290, (g) => {
      paperBase(g, 200, 290, { base: [236, 224, 196], seed, stains: 1, edge: 0.15 });
      g.strokeStyle = '#b8923a'; g.lineWidth = 5; g.strokeRect(4, 4, 192, 282);
      drawDialSymbol(g, 100, 34, 12, '#9a7a2a', -0.4);
      writeText(g, text, { x: 18, y: 64, w: 164, lh: 15, maxY: 280, font: `italic 13px ${FONT.serif}`, color: '#3a2412', align: 'center' });
    });
    const L = 0.19, a = 0.28;
    for (const s of [-1, 1]) {
      const geo = new THREE.PlaneGeometry(0.14, L); geo.translate(0, -L / 2, 0);
      const face = new THREE.Mesh(geo, s > 0 ? paperMat(tex) : ownMat({ color: 0xe4d6b0, side: THREE.DoubleSide }));
      face.rotation.x = -s * a; face.rotation.y = s > 0 ? 0 : Math.PI;   // vorne die Karte, hinten die Rückseite
      face.position.y = L * Math.cos(a);
      face.castShadow = true;
      group.add(face);
    }
    return { group, use: new THREE.Vector3(0, 0.12, 0), shineSize: 0.18 };
  },

  tape({ d, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const grooves = textTexture(128, 64, (g) => {
      g.fillStyle = '#2a1a10'; g.fillRect(0, 0, 128, 64);
      for (let y = 0; y < 64; y += 2) { g.fillStyle = `rgba(${90 + (y % 4) * 10},60,30,0.5)`; g.fillRect(0, y, 128, 1); }
    });
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.105, 24, 1, true), ownMat({ map: grooves, roughness: 0.35, side: THREE.DoubleSide }));
    wax.rotation.z = Math.PI / 2; wax.position.set(0.05, 0.028, 0.0); wax.castShadow = true;
    const brass = mat('brass');
    for (const s of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.027, 0.0035, 6, 20), brass);
      ring.rotation.y = Math.PI / 2; ring.position.set(0.05 + s * 0.052, 0.028, 0);
      group.add(ring);
    }
    // Pappröhre, offen, der Deckel liegt daneben
    const tubeMat = ownMat({ color: 0x6a4a2a, roughness: 0.9, side: THREE.DoubleSide });
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.13, 20, 1, true), tubeMat);
    tube.rotation.z = Math.PI / 2; tube.position.set(-0.055, 0.036, 0.01); tube.castShadow = true;
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.036, 20), tubeMat);
    bottom.rotation.y = -Math.PI / 2; bottom.position.set(-0.12, 0.036, 0.01);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.025, 20), tubeMat);
    lid.position.set(0.07, 0.0125, 0.075); lid.castShadow = true;
    const label = textTexture(128, 48, (g) => {
      paperBase(g, 128, 48, { base: [220, 206, 170], seed, stains: 0 });
      g.font = `20px ${FONT.hand}`; g.fillStyle = '#2a1a10'; g.fillText((d.title.match(/\((\d\/\d)\)/)?.[1] || '') + ' · K. K.', 10, 32);
    });
    const tag = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.022), paperMat(label));
    tag.rotation.x = -Math.PI / 2; tag.rotation.z = 0.4; tag.position.set(-0.03, 0.0012, -0.06);
    group.add(wax, tube, bottom, lid, tag);
    return { group, shineSize: 0.2 };
  },

  bottle({ d, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const prof = [[0, 0], [0.034, 0], [0.036, 0.004], [0.036, 0.17], [0.03, 0.2], [0.014, 0.23], [0.012, 0.29], [0.014, 0.3], [0, 0.3]].map(([x, y]) => new THREE.Vector2(x, y));
    const glass = new THREE.Mesh(new THREE.LatheGeometry(prof, 18), ownMat({ color: 0x1e3a24, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.82 }));
    const label = textTexture(160, 80, (g) => {
      paperBase(g, 160, 80, { base: [226, 214, 180], seed, stains: 1 });
      g.font = `700 22px ${FONT.hand}`; g.fillStyle = '#233a8a'; g.fillText('FINN', 44, 34);
      g.font = `14px ${FONT.hand}`; g.fillStyle = '#2a2018'; g.fillText('nicht anfassen!!', 30, 60);
    });
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0368, 0.0368, 0.075, 18, 1, true, -1.2, 2.4), paperMat(label));
    band.position.y = 0.09;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.0115, 0.011, 0.028, 10), mat('wood'));
    cork.position.y = 0.305;
    const b = new THREE.Group(); b.add(glass, band, cork);
    b.rotation.z = Math.PI / 2; b.rotation.x = -0.9;   // liegt auf der Seite, Etikett schräg nach oben
    b.position.set(0.15, 0.036, 0);
    glass.castShadow = true;
    group.add(b);
    return { group, shineSize: 0.2 };
  },

  radio(ctx) {
    const { group } = MODELS.printout({ ...ctx, spot: { kind: 'surface' } });
    const paper = new THREE.Group();
    while (group.children.length) paper.add(group.children[0]);
    paper.position.x = -0.08;
    const walkie = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.035, 0.17), ownMat({ color: 0x1c1d1a, roughness: 0.55, metalness: 0.2 }));
    body.position.y = 0.0175; body.castShadow = true;
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.002, 0.06), mat('steel'));
    grille.position.set(0, 0.036, 0.03);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.005, 0.1, 6), mat('rubber'));
    ant.rotation.x = Math.PI / 2; ant.position.set(0.02, 0.012, -0.13);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.012, 10), mat('brassDark'));
    knob.rotation.x = Math.PI / 2; knob.position.set(-0.018, 0.018, -0.09);
    walkie.add(body, grille, ant, knob);
    walkie.position.set(0.17, 0, 0.02); walkie.rotation.y = 0.5;
    group.add(paper, walkie);
    return { group, portable: paper };
  },

  chalk({ d, text }) {
    const group = new THREE.Group();
    const lines = text.split('\n').filter(l => l.trim()).slice(0, 8).join('\n');
    const tex = chalkTexture(lines, { w: 768, h: 410, size: 40 });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.75), ownMat({ map: tex, transparent: true, alphaTest: 0.03, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.003; m.renderOrder = 1;
    const stub = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.05, 8), ownMat({ color: 0xe8e6de, roughness: 1 }));
    stub.rotation.z = Math.PI / 2; stub.rotation.y = 0.7; stub.position.set(0.62, 0.008, 0.3);
    group.add(m, stub);
    return { group, use: new THREE.Vector3(0, 0.1, 0), radius: 0.7, shineSize: 0.35 };
  },

  slab({ d, text, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.05, 1.22), mat('stoneDark'));
    slab.position.y = 0.025; slab.castShadow = true;
    const tex = inscriptionTexture(d, text, 'stone', { w: 300, h: 500, seed });
    const top = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.1), ownMat({ map: tex, roughness: 0.85, polygonOffset: true, polygonOffsetFactor: -1 }));
    top.rotation.x = -Math.PI / 2; top.position.y = 0.0505;
    // Blechbecher mit kaltem Kaffee am Fußende
    const cup = new THREE.Group();
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.031, 0.085, 16, 1, true), ownMat({ color: 0x8a8a84, roughness: 0.45, metalness: 0.8, side: THREE.DoubleSide }));
    wall.position.y = 0.0425;
    const floorD = new THREE.Mesh(new THREE.CircleGeometry(0.031, 16), mat('steel'));
    floorD.rotation.x = -Math.PI / 2; floorD.position.y = 0.002;
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.034, 16), ownMat({ color: 0x160b04, roughness: 0.1 }));
    coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.068;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 12, Math.PI), mat('steel'));
    handle.rotation.z = -Math.PI / 2; handle.position.set(0.036, 0.045, 0);
    wall.castShadow = true;
    cup.add(wall, floorD, coffee, handle);
    cup.position.set(0.18, 0.05, 0.5);
    group.add(slab, top, cup);
    return { group, use: new THREE.Vector3(0, 0.15, 0), radius: 0.6, shineSize: 0.3 };
  },

  plaque({ d, text, opts, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const [w, h] = opts.size || [0.6, 0.7];
    const kind = opts.material || 'stone';
    const tex = inscriptionTexture(d, text, kind, { w: 512, h: Math.round(512 * h / w), seed });
    if (kind === 'paint') {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), ownMat({ map: tex, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.position.z = 0.003;
      const gold = mat('gold');
      for (const [x, y, sx, sy] of [[0, h / 2, w + 0.06, 0.03], [0, -h / 2, w + 0.06, 0.03], [w / 2, 0, 0.03, h], [-w / 2, 0, 0.03, h]]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.02), gold); bar.position.set(x, y, 0.01); group.add(bar);
      }
      group.add(m);
    } else {
      const thick = kind === 'brass' ? 0.012 : 0.05;
      const plate = new THREE.Mesh(new THREE.BoxGeometry(w, h, thick), kind === 'brass' ? mat('brassDark') : mat('stone'));
      plate.position.z = thick / 2; plate.castShadow = true;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.96, h * 0.96), ownMat({ map: tex, roughness: kind === 'brass' ? 0.4 : 0.85, metalness: kind === 'brass' ? 0.7 : 0 }));
      face.position.z = thick + 0.0015;
      group.add(plate, face);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.01, 8), mat(kind === 'brass' ? 'brass' : 'rust'));
        bolt.rotation.x = Math.PI / 2; bolt.position.set(sx * (w / 2 - 0.035), sy * (h / 2 - 0.035), thick + 0.004);
        group.add(bolt);
      }
    }
    return { group, use: new THREE.Vector3(0, 0, 0.15), radius: Math.max(w, h) * 0.55, shineSize: 0.35 };
  },

  ribbons({ d, text, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const lines = text.split('\n').filter(l => l.trim());
    const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.42, 6), mat('rust'));
    wire.rotation.z = Math.PI / 2; wire.position.set(0, 0.24, 0.02);
    pin(group, -0.2, 0.24, 0x444444); pin(group, 0.2, 0.24, 0x444444);
    group.add(wire);
    const tints = [0xe8e2d6, 0x9a2a28, 0xd8c8a0, 0x6a6a70, 0xe8e2d6, 0xb89a60, 0x4a5a6a];
    for (let i = 0; i < 7; i++) {
      const len = 0.28 + hash2(i, 4, seed) * 0.22;
      const tex = textTexture(32, 256, (g) => {
        g.fillStyle = '#' + tints[i].toString(16).padStart(6, '0'); g.fillRect(0, 0, 32, 256);
        g.save(); g.translate(20, 8); g.rotate(Math.PI / 2);
        g.font = `15px ${FONT.hand}`; g.fillStyle = 'rgba(20,16,20,0.8)';
        g.fillText((lines[i % lines.length] || '').replace(/[„“]/g, '').slice(0, 34), 0, 0);
        g.restore();
      });
      const geo = new THREE.PlaneGeometry(0.035, len, 1, 6); geo.translate(0, -len / 2, 0);
      const p = geo.attributes.position;
      for (let k = 0; k < p.count; k++) p.setZ(k, Math.sin(-p.getY(k) * 9 + i) * 0.01);
      geo.computeVertexNormals();
      const r = new THREE.Mesh(geo, ownMat({ map: tex, side: THREE.DoubleSide, roughness: 1 }));
      r.position.set(-0.18 + i * 0.06, 0.235, 0.024 + i * 0.001);
      r.rotation.z = (hash2(i, 6, seed) - 0.5) * 0.25;
      group.add(r);
    }
    return { group, use: new THREE.Vector3(0, 0.05, 0.15), radius: 0.45, shineSize: 0.3 };
  },

  poster({ d, text, id }) {
    const group = new THREE.Group(), seed = seedOf(id);
    const lines = text.split('\n').filter(l => l.trim()).map(l => l.length > 30 ? l.slice(0, 29) + '…' : l).slice(0, 9);
    const tex = posterTexture({ title: d.title.replace(/ zum /, '\nzum '), lines, w: 256, h: 360, paper: '#c8b88e' });
    const m = new THREE.Mesh(curledPlane(0.42, 0.59, 0.02, seed), paperMat(tex));
    m.position.z = 0.004;
    group.add(m);
    for (const [x, y] of [[-0.19, 0.27], [0.19, 0.27], [-0.19, -0.27]]) pin(group, x, y, 0x333333);
    return { group, use: new THREE.Vector3(0, 0, 0.14), radius: 0.4, shineSize: 0.3 };
  },

  screen({ d, text, id }) {
    const group = new THREE.Group();
    const tex = textTexture(320, 256, (g) => {
      g.fillStyle = '#020803'; g.fillRect(0, 0, 320, 256);
      g.shadowColor = 'rgba(141,255,168,0.8)'; g.shadowBlur = 4;
      writeText(g, d.title.toUpperCase() + '\n\n' + text, { x: 12, y: 22, w: 296, lh: 14, maxY: 248, font: `15px ${FONT.mono}`, color: '#8dffa8', keep: true });
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(0,0,0,0.25)'; for (let y = 0; y < 256; y += 3) g.fillRect(0, y, 320, 1);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.28), ownMat({ map: tex, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.1, roughness: 0.3 }));
    m.position.z = 0.002;
    group.add(m);
    return { group, use: new THREE.Vector3(0, 0, 0.18), radius: 0.35, shineSize: 0.25, light: { pos: new THREE.Vector3(0, 0, 0.25), color: 0x70ff9a, intensity: 0.9, distance: 2.6 } };
  },
};
