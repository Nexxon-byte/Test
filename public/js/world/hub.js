// MARKT NEUN – der Hub oben (Sockel, Etage 12). Handgebaut um den Schachtkopf der Neunten.
// Kabine im Ursprung, Torwand bei z = LANDING_Z, der Platz liegt bei +Z.

import * as THREE from 'three';
import { Builder, quadGeometry, boxGeometry, disposeGroup } from '../gfx/geo.js';
import { mat, glowMat } from '../gfx/materials.js';
import { textTexture, drawDialSymbol, iconTexture, glowTexture, mkCanvas } from '../gfx/textures.js';
import { buildPortal, makeCtx } from './levelbuild.js';
import { CAB } from './cab.js';
import { P } from './props.js';
import { buildFigure, pose, idle } from './figures.js';
import { RNG } from '../core/rng.js';
import { NPC } from './npc.js';
import { hasCharacter } from '../gfx/characters.js';
import { cloneModel, hasModel } from '../gfx/models.js';
import { bus } from '../core/bus.js';
import { buildRow } from './facade.js';

// Besetzung des Markts: Figur (MPFB), Grundhaltung, Requisit
const CAST = {
  dieter:    { char: 'dieter', clip: 'Idle_TalkingPhone_Loop', prop: 'phone', look: 4 },
  veit:      { char: 'veit', clip: 'Idle_Lantern_Loop', prop: 'lantern', look: 5 },
  voss:      { char: 'voss', clip: 'Idle_FoldArms_Loop', look: 6 },
  ada:       { char: 'ada', clip: 'Fixing_Kneeling', prop: 'torch', look: 3 },
  hanne:     { char: 'hanne', clip: 'Sitting_Idle_Loop', look: 4, speed: 0.8 },
  jomo:      { char: 'jomo', clip: 'Idle_Loop', look: 6 },
  stummer:   { char: 'stumm', clip: 'Sitting_Idle_Loop', look: 0, speed: 0.7 },
  anselm:    { char: 'anselm', clip: 'Idle_Loop', look: 5 },
  beter:     { char: 'crew_f', clip: 'Crouch_Idle_Loop', look: 0, speed: 0.6 },
  schlaefer: { char: 'crew_m', clip: 'Sitting_Idle_Loop', look: 0, speed: 0.5 },
};
// Sprecher der Stimmen → Figur im Markt
const SPEAKER_NPC = { dieter: 'dieter', ada: 'ada', voss: 'voss', veit: 'veit' };
// Sitzen: Becken 0,46 m über den Füßen, 0,28 m hinter ihnen → Wurzel relativ zur Sitzfläche
const SIT_BACK = 0.28, SIT_PELVIS = 0.39;
export const HUB_CHARACTERS = [...new Set(Object.values(CAST).map(c => c.char))];

export const HUB_THEME = {
  name: 'Markt Neun',
  height: 12, wall: 'stoneDark', portal: 'brassDark', surface: 'stone',
  fog: { color: 0x120d18, density: 0.03 },
  ambient: { sky: 0x5a4a78, ground: 0x1a1216, intensity: 0.95 },
  grade: { saturation: 1.0, contrast: 1.08, exposure: 1.3, shadowTint: [0.012, 0.0, 0.03], highlightTint: [1.0, 0.93, 0.96] },
  music: 'lobby', reverb: [3.6, 0.45], reverbMix: 0.35,
  outerDoors: 'steel',
};

const X0 = -14, X1 = 14, Z0 = CAB.LANDING_Z, Z1 = 31, H = 12;

export class Hub {
  constructor(R, collision, state) {
    this.R = R;
    this.collision = collision;
    this.state = state;
    this.theme = HUB_THEME;
    this.group = new THREE.Group();
    this.group.name = 'MarktNeun';
    this.fixtures = [];
    this.colliders = [];
    this.emitters = [];
    this.candles = [];
    this.anchors = {};
    this.npcs = {};
    this.spots = {};          // Interaktionspunkte der Händler
    this.dynamic = [];
    this.rng = new RNG(94);
    this.isHub = true;
    this._build();
    this._offs = [
      bus.on('voice:start', (e) => this.npcs[SPEAKER_NPC[e.speaker]]?.talking?.(true)),
      bus.on('voice:end', (e) => this.npcs[SPEAKER_NPC[e.speaker]]?.talking?.(false)),
    ];
  }

  surfaceAt() { return 'stone'; }

  _build() {
    const b = new Builder();
    this._debugBuilder = b; // Prüfwerkzeug (?placecheck): Builder für builder.debugBoxes merken
    const stubGrid = { rooms: [], w: 0, h: 0, isFloor: () => false, get: () => 0, idx: () => 0, room: [], dist: [], block: [] };
    const ctx = makeCtx(this.R, b, stubGrid, this.theme, this, this.rng);
    this.ctx = ctx;

    this._architecture(b, ctx);
    buildPortal(b, stubGrid, this.theme, this);
    this._shaftHead(b, ctx);
    this._dispo(b, ctx);
    this._kantorei(b, ctx);
    this._voss(b, ctx);
    this._ada(b, ctx);
    this._stille(b, ctx);
    this._kapelle(b, ctx);
    this._garkueche(b, ctx);
    this._plaza(b, ctx);
    this._rain();
    this._skyline();

    this.group.add(b.build());
    this.R.scene.add(this.group);
    for (const c of b.colliders) { c.tag = 'hub'; this.colliders.push(this.collision.add(c)); }
  }

  // ---------------------------------------------------------------- Hülle
  _architecture(b, ctx) {
    const floor = mat('stoneWet'), wall = mat('stoneDark'), brick = mat('brick'), plaster = mat('plaster');
    // Boden
    b.add(floor, quadGeometry([X0, 0, Z1], [X1, 0, Z1], [X1, 0, Z0], [X0, 0, Z0], X1 - X0, Z1 - Z0, X0, -Z1));
    // Offener Hof: kein Gewölbe mehr – darüber nur Nacht, Dunst und Regen
    // Fassade am Schachtkopf (links/rechts vom Portal)
    const half = CAB.CELLS_X * 2.5 / 2;
    for (const s of [-1, 1]) {
      const xa = s < 0 ? X0 : half, xb = s < 0 ? -half : X1;
      b.add(wall, quadGeometry([xa, 0, Z0], [xb, 0, Z0], [xb, H, Z0], [xa, H, Z0], xb - xa, H, xa, 0));
    }
    // Häuserfronten (Poly-Haven-Baukasten „modular_urban_apartments_facade“)
    this._facades();
    // Randkollision
    b.collider(X0 - 1, Z0 - 1, X0 + 0.2, Z1 + 1);
    b.collider(X1 - 0.2, Z0 - 1, X1 + 1, Z1 + 1);
    b.collider(X0 - 1, Z1 - 0.2, X1 + 1, Z1 + 1);
    b.collider(X0, Z0 - 1, -half, Z0 + 0.05);
    b.collider(half, Z0 - 1, X1, Z0 + 0.05);
    // Gotische Pfeiler am Schachtturm
    for (const x of [-3.6, 3.6, -9, 9]) P.pillarRound(b, x, Z0 + 0.6, 0, this.rng, { h: H, r: 0.45, m: 'stoneDark', cap: 'stone' });
    // Stromkabel quer über den Hof, zwischen den Häusern gespannt
    for (let i = 0; i < 5; i++) P.cables(b, X0 + 0.04, this.rng.float(6, 29), X1 - 0.04, this.rng.float(6, 29), this.rng.float(8.5, 11.5), 3, this.rng);
  }

  // Häuserzeilen links, rechts, hinten. Erdgeschoss passt zu den Ständen davor.
  _facades() {
    const K = 'modular_urban_apartments_facade';
    const rng = this.rng;
    const WIN = ['wall_window_centered_large_01', 'wall_window_centered_large_02', 'wall_window_centered_double_01', 'wall_window_centered_double_02',
      'wall_window_centered_small_01', 'wall_window_centered_small_02', 'wall_window_offset_small_01', 'wall_window_offset_small_03'];
    const TOP = ['wall_window_centered_large_03', 'wall_window_centered_double_03', 'wall_window_centered_small_03', 'wall_window_offset_small_05'];
    const upper = (i, f) => rng.chance(0.12) ? 'wall_standard_standard_01' : rng.pick(f === 3 ? TOP : WIN);
    const PLAIN = 'wall_standard_standard_01', DOOR = 'wall_door_centered_small_01', DOOR2 = 'wall_door_centered_large_01', SHOP = 'wall_window_centered_double_01';
    const L = Z1 - Z0;
    // links (Stille Ecke · frei · Voss · frei · Dispo), läuft von hinten nach vorn
    const left = [PLAIN, PLAIN, DOOR, SHOP, PLAIN, DOOR2, DOOR, PLAIN, PLAIN];
    buildRow(this.group, K, { start: [X0, Z1], dir: [0, -1], length: L, floors: 4, rng, ground: (i) => left[i] ?? PLAIN, upper, lit: 0.22 });
    // rechts (Kantorei · frei · Ada · frei · Kapelle), von vorn nach hinten
    const right = [PLAIN, PLAIN, PLAIN, DOOR, PLAIN, PLAIN, DOOR2, SHOP, PLAIN];
    buildRow(this.group, K, { start: [X1, Z0], dir: [0, 1], length: L, floors: 4, rng, ground: (i) => right[i] ?? PLAIN, upper, lit: 0.22 });
    // hinten (Kapelle-Ecke · Garküche · Quartier · Stille-Ecke), von rechts nach links
    const back = [PLAIN, SHOP, DOOR, PLAIN, PLAIN, PLAIN, DOOR, SHOP, PLAIN];
    buildRow(this.group, K, { start: [X1, Z1], dir: [-1, 0], length: X1 - X0, floors: 4, rng, ground: (i) => back[i] ?? PLAIN, upper, lit: 0.25 });
  }

  // ---------------------------------------------------------------- Schachtkopf
  _shaftHead(b, ctx) {
    // Turmkrone: Gesims auf der Fassade, darüber zurückgesetzter Aufsatz bis 20 m
    const half = CAB.CELLS_X * 2.5 / 2;
    b.box(mat('stone'), 0, H + 0.2, Z0 + 0.25, X1 - X0, 0.4, 0.6);
    b.box(mat('stoneDark'), 0, H + 4.4, Z0 - 1.5, half * 2 + 6, 8, 3);
    b.box(mat('stone'), 0, H + 8.5, Z0 - 1.3, half * 2 + 6.4, 0.3, 3.4);
    for (const x of [-(half + 3), half + 3]) ctx.fixture({ x, y: H + 8.9, z: Z0 - 0.2, type: 'none', color: 0xff2010, intensity: 4, distance: 6, mode: 'neon', flicker: 0.5 });
    // riesiges Zifferblatt über dem Tor
    const dial = textTexture(512, 300, (g, w, h) => { g.clearRect(0, 0, w, h); drawDialSymbol(g, w / 2, h - 30, 220, '#ffcf7a', -0.9, 9); });
    const dm = ctx.decal(dial, 0, 6.3, Z0 + 0.06, 0, 5.2, 3.05, { emissive: 1.6 });
    const f = ctx.fixture({ x: 0, y: 6, z: Z0 + 1.2, type: 'none', color: 0xffb860, intensity: 60, distance: 18, mode: 'neon', flicker: 0.1, priority: 2 });
    f.meshes = [dm];
    ctx.neon('SCHACHT NULL · BERGUNG', '#39e6ff', 0, 3.95, Z0 + 0.07, 0, 3.6, { font: '600 64px "Cormorant Garamond", serif', flicker: 0.4 });
    // Warnbaken
    for (const x of [-2.2, 2.2]) {
      b.box(mat('hazard'), x, 0.45, Z0 + 1.3, 0.3, 0.9, 0.3, { collide: true });
      ctx.fixture({ x, y: 1.0, z: Z0 + 1.3, type: 'sconce', color: 0xff5020, intensity: 1.2, distance: 4, mode: 'strobe' });
    }
  }

  // ---------------------------------------------------------------- Stände
  _counter(b, x, z, len, face, m = 'walnut') {
    // Tresen entlang Z bei x, Vorderseite zeigt in Richtung face (±1 in X)
    const metal = /steel|rust/.test(m);
    const top = metal ? 'steel' : 'walnut', trim = metal ? 'steel' : 'brassDark';
    b.box(mat(m), x - face * 0.03, 0.53, z, 0.6, 0.96, len - 0.06, { collide: true });
    b.box(mat(top), x + face * 0.02, 1.03, z, 0.76, 0.06, len);
    b.box(mat(trim), x + face * 0.4, 1.0, z, 0.02, 0.03, len);
    b.box(mat('rubber'), x + face * 0.26, 0.06, z, 0.02, 0.12, len - 0.1);
    // Füllungen auf der Vorderseite
    const n = Math.max(2, Math.round(len / 1.1)), pw = (len - 0.2) / n;
    for (let i = 0; i < n; i++) {
      const pz = z - len / 2 + 0.1 + pw * (i + 0.5);
      b.box(mat(metal ? 'steelPanel' : 'woodPanel'), x + face * 0.275, 0.56, pz, 0.02, 0.72, pw - 0.1);
      b.box(mat(trim), x + face * 0.288, 0.56, pz, 0.008, 0.76, 0.02, {});
    }
  }

  // Figur aufstellen; seat = Höhe der Sitzfläche (dann ist x/z die Sitzmitte)
  _npc(id, opts, x, z, ry, poseName = 'counter', seat = null) {
    const cast = CAST[id];
    if (cast && hasCharacter(cast.char)) {
      const n = new NPC(cast.char, cast);
      let y = 0;
      if (seat !== null) { x += Math.sin(ry) * SIT_BACK; z += Math.cos(ry) * SIT_BACK; y = seat - SIT_PELVIS; }
      n.root.position.set(x, y, z);
      n.root.rotation.y = ry;
      this.group.add(n.root);
      this.npcs[id] = n;
      if (seat === null) this.collision && this.colliders.push(this.collision.add({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3, minY: 0, maxY: 1.8, tag: 'hub' }));
      return n;
    }
    const fig = buildFigure(opts);
    fig.root.position.set(x, 0, z);
    fig.root.rotation.y = ry;
    pose(fig, poseName);
    this.group.add(fig.root);
    this.npcs[id] = fig;
    this.collision && this.colliders.push(this.collision.add({ minX: x - 0.3, maxX: x + 0.3, minZ: z - 0.3, maxZ: z + 0.3, minY: 0, maxY: 1.8, tag: 'hub' }));
    return fig;
  }

  // Kerze: Wachsstumpf + Flamme obenauf
  _wax(b, ctx, x, y, z, light = false) {
    const h = this.rng.float(0.05, 0.2), r = this.rng.float(0.016, 0.028);
    b.cyl(mat('bone'), x, y, z, r, r * 1.1, h, 6);
    return ctx.candle(x, y + h + 0.03, z, light);
  }

  // Wandlaterne (Poly Haven street_lamp_02) an einer Hauswand; ry = Blickrichtung von der Wand weg
  _wallLamp(ctx, x, z, ry, { color = 0xffc070, intensity = 7, mode = 'steady' } = {}) {
    this._model('street_lamp_02', x, z, ry, { y: 2.0 });
    ctx.fixture({ x: x + Math.sin(ry) * 0.62, y: 2.5, z: z + Math.cos(ry) * 0.62, type: 'none', color, intensity, distance: 7, mode, priority: 1.2 });
  }

  _glass(x, y, z, w, h, ry) {
    this._glassMat ||= new THREE.MeshStandardMaterial({ color: 0x9ab0b8, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), this._glassMat);
    m.position.set(x, y, z); m.rotation.y = ry;
    this.group.add(m);
    return m;
  }

  // Fertiges Modell (Poly Haven) aufstellen; y = Unterkante
  _model(id, x, z, ry = 0, { y = 0, height = null, collide = false, pad = 0.05, tint = null } = {}) {
    if (!hasModel(id)) return null;
    const o = cloneModel(id, { height });
    // Farbe dämpfen/umfärben (eigene Materialkopie, damit andere Kopien unverändert bleiben)
    if (tint !== null) o.traverse(m => { if (m.isMesh) { m.material = m.material.clone(); m.material.color.multiply(new THREE.Color(tint)); } });
    o.position.set(x, y, z);
    o.rotation.y = ry;
    o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
    this.group.add(o);
    if (collide && this.collision) {
      o.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(o);
      this.colliders.push(this.collision.add({ minX: bb.min.x - pad, maxX: bb.max.x + pad, minZ: bb.min.z - pad, maxZ: bb.max.z + pad, minY: bb.min.y, maxY: bb.max.y, tag: 'hub' }));
    }
    return o;
  }

  _spot(id, x, y, z, prompt, radius = 0.6) {
    this.spots[id] = { id, pos: new THREE.Vector3(x, y, z), radius, prompt };
  }

  _board(ctx, x, y, z, ry) {
    // Auftragsbrett: Kork mit angepinnten Zetteln
    const tex = textTexture(512, 320, (g, w, h) => {
      g.fillStyle = '#5a3a20'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${40 + Math.random() * 40},${25 + Math.random() * 20},10,0.35)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      const notes = ['BERGUNG −2', 'ZEHNT −7', 'VERMISST: MANNSCHAFT 31', 'KANTOREI: RELIQUIE', 'WARTUNG −17', 'QUOTE'];
      notes.forEach((n, i) => {
        const nx = 30 + (i % 3) * 160, ny = 30 + Math.floor(i / 3) * 140;
        g.save(); g.translate(nx + 60, ny + 55); g.rotate((Math.random() - 0.5) * 0.12);
        g.fillStyle = i === 3 ? '#e8d27a' : '#d9ccb0'; g.fillRect(-60, -55, 130, 110);
        g.fillStyle = '#2a1a10'; g.font = '17px "Special Elite", monospace'; g.textAlign = 'center';
        n.split(' ').reduce((yy, word) => { g.fillText(word, 5, yy); return yy + 20; }, -20);
        g.fillStyle = '#a01010'; g.beginPath(); g.arc(5, -50, 5, 0, 7); g.fill();
        g.restore();
      });
    });
    ctx.decal(tex, x, y, z, ry, 2.4, 1.5, { transparent: false });
  }

  _dispo(b, ctx) {
    const x = -10.2, z = 7;
    // Glaskabine: Rahmen, Dach
    for (const [px, pz] of [[-8.9, 4.2], [-8.9, 9.8]]) b.box(mat('steel'), px, 1.6, pz, 0.12, 3.2, 0.12, { collide: true });
    b.box(mat('steel'), -11.4, 3.25, z, 5.2, 0.14, 5.8);
    b.box(mat('steel'), -8.9, 3.0, z, 0.12, 0.12, 5.6);
    this._counter(b, -9.3, z, 4.6, 1, 'steelPanel');
    this._board(ctx, -13.9, 1.9, z, Math.PI / 2);
    // Schreibtischlampe
    b.cyl(mat('brassDark'), -9.4, 1.1, z + 1.6, 0.08, 0.1, 0.04, 8);
    b.cyl(mat('brassDark'), -9.4, 1.14, z + 1.6, 0.012, 0.012, 0.4, 6);
    ctx.fixture({ x: -9.4, y: 1.55, z: z + 1.6, type: 'sconce', color: 0xffd08a, intensity: 3.2, distance: 6, mode: 'steady', priority: 2 });
    this._model('Television_01', -9.4, z - 1.3, Math.PI / 2 + 0.15, { y: 1.06 });
    ctx.neon('DISPOSITION', '#39e6ff', -8.82, 3.6, z, Math.PI / 2, 2.4, { flicker: 0.2 });
    this._npc('dieter', { coat: 'coatBlue', hat: 'cap', brassHand: true, face: { age: 0.8, beard: false, scar: true }, bulk: 1.05 }, x, z, Math.PI / 2, 'counter');
    this._spot('dieter', -9.2, 1.35, z, 'Bruder Dieter · Disposition');
    this._spot('board', -9.2, 1.35, z + 1.9, 'Auftragsbrett ansehen', 0.5);
  }

  _kantorei(b, ctx) {
    const x = 10.2, z = 7;
    this._counter(b, 9.3, z, 4.6, -1, 'walnut');
    // Messinggitter über der Theke
    for (let i = 0; i < 16; i++) b.box(mat('brass'), 9.0, 2.0, z - 2.2 + i * 0.29, 0.03, 1.8, 0.03);
    b.box(mat('brass'), 9.0, 2.92, z, 0.08, 0.06, 4.6);
    b.box(mat('stoneDark'), 12.4, 3.5, z, 3.2, 7, 5.6);
    // Eckpfeiler, Sockel und Kranzgesims – der Block wird zum Kantoreigebäude
    for (const dz of [-2.72, 2.72]) b.box(mat('stone'), 10.86, 3.55, z + dz, 0.34, 7.1, 0.34);
    b.box(mat('stone'), 10.84, 0.25, z, 0.12, 0.5, 5.5);
    b.box(mat('stone'), 12.35, 7.12, z, 3.5, 0.26, 5.95);
    b.box(mat('stone'), 12.35, 6.7, z, 3.36, 0.12, 5.8);
    // Regale mit Registern hinter dem Kantor
    for (const dz of [-1.6, 1.6]) {
      this._model('Shelf_01', 10.66, z + dz, -Math.PI / 2, { tint: 0x4a3222 });
      for (const sy of [0.42, 0.83, 1.24, 1.65]) if (this.rng.chance(0.8)) this._model('book_encyclopedia_set_01', 10.68, z + dz + this.rng.float(-0.2, 0.2), -Math.PI / 2 + this.rng.float(-0.1, 0.1), { y: sy, tint: 0x7a6050 });
    }
    this._model('CashRegister_01', 9.3, z - 1.1, -Math.PI / 2, { y: 1.1, height: 0.34 });
    b.collider(9.6, z - 2.8, 14, z + 2.8);
    // Waage
    b.cyl(mat('brass'), 9.3, 1.1, z + 0.9, 0.18, 0.2, 0.03, 12);
    b.cyl(mat('brass'), 9.3, 1.13, z + 0.9, 0.02, 0.02, 0.35, 6);
    b.box(mat('brass'), 9.3, 1.48, z + 0.9, 0.02, 0.02, 0.5);
    for (const d of [-0.25, 0.25]) b.cyl(mat('brass'), 9.3, 1.3, z + 0.9 + d, 0.1, 0.12, 0.02, 10);
    // Kerzen & Banner
    for (let i = 0; i < 6; i++) this._wax(b, ctx, 9.25, 1.1, z - 1.9 + i * 0.18, i === 2);
    ctx.poster({ title: 'KANTOREI\nDES ZEHNTS', lines: ['Annahme von Bergegut', 'für die Hohe Kanzlei.', 'Was aus der Tiefe kommt,', 'wird dem Chor übergeben.'] }, 10.78, 3.9, z, -Math.PI / 2, 1.1);
    const dial = textTexture(256, 160, (g, w, h) => { g.clearRect(0, 0, w, h); drawDialSymbol(g, w / 2, h - 16, 100, '#ffcf7a', 0.4, 6); });
    ctx.decal(dial, 10.78, 5.8, z, -Math.PI / 2, 1.6, 1.0, { emissive: 1.4 });
    ctx.fixture({ x: 9.2, y: 2.6, z, type: 'none', color: 0xffb060, intensity: 4, distance: 7, mode: 'candle', priority: 2 });
    this._npc('veit', { coat: 'robe', robe: true, hat: 'kantor', face: { age: 0.6 }, bulk: 1.1 }, x, z, -Math.PI / 2, 'wait');
    this._spot('veit', 9.2, 1.4, z - 0.6, 'Kantor Veit · Kantorei-Annahme');
    this._spot('sell', 9.25, 1.25, z + 0.9, 'Waage der Kantorei', 0.45);
  }

  _voss(b, ctx) {
    const x = -10.5, z = 17;
    this._counter(b, -9.3, z, 4.2, 1, 'rust');
    // Markise
    const aw = textTexture(64, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#7a1418' : '#1a1210'; g.fillRect(i * 8, 0, 8, 64); } }, { srgb: true });
    const awm = new THREE.MeshStandardMaterial({ map: aw, roughness: 0.9, side: THREE.DoubleSide });
    const aw1 = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.03, 4.6), awm);
    aw1.position.set(-11.5, 2.62, z); aw1.rotation.z = -0.09;
    const val = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.32, 4.6), awm);
    val.position.set(-9.06, 2.25, z);
    aw1.castShadow = val.castShadow = true;
    this.group.add(aw1, val);
    for (const dz of [-2.25, 2.25]) b.cyl(mat('steel'), -9.08, 0, z + dz, 0.035, 0.035, 4.3, 8, { collide: true });
    b.box(mat('steel'), -9.08, 4.25, z, 0.06, 0.06, 4.56);
    // Heißware: Militärkisten gestapelt, Fernseher auf dem Tresen
    const crates = ['old_military_crate', 'wooden_military_crate', 'wooden_crate_02', 'wooden_crate_01'];
    for (let i = 0; i < 4; i++) {
      const o = this._model(crates[i], -12.9 + (i % 2) * 0.35, z - 1.8 + i * 1.15, Math.PI / 2 + this.rng.float(-0.15, 0.15), { collide: true });
      if (o && i % 2 === 0) { o.updateMatrixWorld(true); const top = new THREE.Box3().setFromObject(o).max.y; this._model('cardboard_box_01', -12.9, z - 1.8 + i * 1.15, this.rng.float(0, 6), { y: top }); }
    }
    for (let i = 0; i < 3; i++) this._model('Television_01', -9.45, z - 1.4 + i * 0.7, Math.PI / 2 + this.rng.float(-0.2, 0.2), { y: 1.06 });
    // Mikrofone
    for (let i = 0; i < 2; i++) { b.cyl(mat('steel'), -8.6, 0, z - 0.8 + i * 1.6, 0.015, 0.015, 1.5, 5); b.sphere(mat('rubber'), -8.6, 1.55, z - 0.8 + i * 1.6, 0.05, 6, 5); }
    ctx.neon('STIMMANKAUF · BARGELD SOFORT', '#ff3a8c', -9.02, 3.86, z, Math.PI / 2, 3.6, { flicker: 0.6, font: '600 54px "Cormorant Garamond", serif' });
    ctx.fixture({ x: -9.5, y: 2.4, z, type: 'bulb', color: 0xff5aa0, intensity: 3.5, distance: 7, mode: 'dying', priority: 2 });
    this._npc('voss', { coat: 'leather', hat: null, hair: 'fabricBlack', face: { age: 0.4 }, bulk: 0.95 }, x, z, Math.PI / 2 - 0.3, 'counter');
    this._spot('voss', -9.2, 1.4, z, 'Voss · Schwarzmarkt');
  }

  _ada(b, ctx) {
    const x = 10.6, z = 17;
    // Rolltorrahmen & Werkbank
    for (const pz of [z - 2.6, z + 2.6]) b.box(mat('steel'), 9.1, 1.9, pz, 0.2, 3.8, 0.2, { collide: true });
    b.box(mat('steelPanel'), 9.1, 3.9, z, 0.3, 0.4, 5.4);
    b.box(mat('hazard'), 9.0, 3.9, z, 0.02, 0.2, 5.2);
    b.box(mat('walnut'), 11.5, 0.9, z, 1.0, 0.08, 3.6, { collide: true });
    b.box(mat('steel'), 11.5, 0.45, z, 0.9, 0.9, 3.4, { collide: true });
    b.box(mat('steelPanel'), 13.9, 2.0, z, 0.1, 2.4, 4.4);
    for (let i = 0; i < 8; i++) b.box(mat('steel'), 13.8, 1.4 + (i % 2) * 0.5, z - 1.8 + i * 0.5, 0.05, 0.5, 0.06, { rz: 0.2 });
    // Kettenzug
    b.cyl(mat('steel'), 11, H - 3, z - 1, 0.02, 0.02, 3, 4);
    b.box(mat('rust'), 11, 5.8, z - 1, 0.3, 0.3, 0.3);
    ctx.neon('WERKSTATT BRENNER', '#ffb040', 9.0, 4.42, z, -Math.PI / 2, 3, { flicker: 0.2 });
    ctx.fixture({ x: 11.2, y: 1.3, z: z + 0.6, type: 'none', color: 0xb8d8ff, intensity: 5, distance: 7, mode: 'strobe', priority: 2 });
    ctx.fixture({ x: 11, y: 3.4, z, type: 'bulb', color: 0xffd090, intensity: 3.5, distance: 8, mode: 'steady', priority: 2 });
    const ada = this._npc('ada', { coat: 'coatGreen', apron: true, hat: 'goggles', hair: 'coatBrown', skin: '#a07a60', face: { age: 0.35 }, height: 1.68 }, 10.75, z + 0.6, -Math.PI / 2, 'work');
    this._model('portable_generator', 9.95, z + 0.6, Math.PI / 2, { collide: true });
    this._model('metal_tool_chest', 12.6, z - 1.9, -Math.PI / 2, { collide: true });
    this._model('tool_cart', 11.9, z + 2.1, Math.PI, { collide: true });
    this._model('drill_press_01', 11.5, z - 1.2, -Math.PI / 2, { y: 0.94 });
    this._model('bench_vice_01', 11.4, z + 0.9, -Math.PI / 2, { y: 0.94 });
    this._model('propane_tank', 13.3, z + 1.6, 0, { collide: true });
    this._spot('ada', 9.4, 1.4, z, 'Ada Brenner · Werkstatt');
    this.anchors.sparks = ada?.anchor || new THREE.Vector3(10.2, 0.4, z + 0.6);
  }

  _stille(b, ctx) {
    const z = 27;
    // Kerzenstufen an der Wand (hoch an der Wand, nach vorn abfallend)
    const tiers = [[-13.65, 1.05], [-13.15, 0.8], [-12.8, 0.55]];
    tiers.forEach(([tx, th], i) => b.box(mat('stone'), tx, th / 2, z + 0.4, [0.7, 0.3, 0.3][i], th, 4.6, { collide: true }));
    const board = textTexture(512, 320, (g, w, h) => {
      g.fillStyle = '#1b1f1d'; g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(235,235,225,0.85)'; g.font = '40px "Caveat", cursive'; g.textAlign = 'center';
      ['Wir sind nicht oben.', 'Wir sind nicht unten.', 'Wir sind dazwischen,', 'und hier hört uns niemand.'].forEach((l, i) => g.fillText(l, w / 2, 70 + i * 62));
    });
    ctx.decal(board, -13.9, 1.9, z, Math.PI / 2, 2.4, 1.5, { transparent: false });
    for (let i = 0; i < 27; i++) {
      const [tx, th] = tiers[i % 3];
      this._wax(b, ctx, tx + this.rng.float(-0.1, 0.1), th, z + 0.4 - 2.1 + this.rng.float(0, 4.2), i % 9 === 4);
    }
    P.pew(b, -12.1, z + 0.4, Math.PI / 2, this.rng, { l: 3.4 });
    this._npc('hanne', { coat: 'robe', hat: 'hood', face: { age: 0.9, eyes: 'closed' }, height: 1.62 }, -12.1, z - 0.8, Math.PI / 2, 'sit', 0.48);
    this._npc('jomo', { coat: 'coatGrey', hair: 'fabricBlack', skin: '#6a4a36', face: { age: 0.1 }, height: 1.5, bulk: 0.85 }, -10.6, z + 1.6, Math.PI / 2 + 0.4, 'wait');
    this._npc('stummer', { coat: 'coatBrown', hat: 'hood', face: { eyes: 'closed' } }, -12.1, z + 1.6, Math.PI / 2, 'sit', 0.48);
    this._spot('hanne', -11.0, 1.0, z - 0.8, 'Mutter Hanne · Die Stillen');
    this._spot('jomo', -10.4, 1.2, z + 1.6, 'Jomo');
  }

  _kapelle(b, ctx) {
    const z = 27;
    b.box(mat('stoneDark'), 13.3, 3, z, 1.2, 6, 5.6, { collide: true });
    for (const dz of [-2.72, 2.72]) b.box(mat('stone'), 12.72, 3.05, z + dz, 0.3, 6.1, 0.3);
    b.box(mat('stone'), 13.25, 6.1, z, 1.45, 0.24, 5.9);
    const icon = ctx.decal(iconTexture('ilse'), 12.68, 2.3, z, -Math.PI / 2, 1.2, 1.8, { emissive: 0.9, transparent: false });
    ctx.fixture({ x: 12, y: 2.2, z, type: 'none', color: 0xffd8a0, intensity: 3, distance: 6, mode: 'candle', priority: 2 });
    for (let i = 0; i < 3; i++) {
      const s = P.candleStand(b, 11.6, z - 1.8 + i * 1.8, -Math.PI / 2, this.rng, { n: 9, h: 0.9 });
      for (const c of s.candles) ctx.candle(c.pos[0], c.y, c.pos[1], false);
    }
    // Sockel für die Andenken der Kleinen Heiligen
    for (let i = 0; i < 6; i++) b.box(mat('marble'), 12.5, 0.45, z - 1.25 + i * 0.5, 0.3, 0.9, 0.3, { collide: true });
    this.anchors.keepsakes = Array.from({ length: 6 }, (_, i) => new THREE.Vector3(12.5, 0.92, z - 1.25 + i * 0.5));
    this._npc('beter', { coat: 'fabricWhite', robe: true, hat: 'hood', face: { eyes: 'closed' } }, 10.6, z + 0.9, Math.PI / 2, 'pray');
    this._spot('kapelle', 11.8, 1.2, z, 'Kapelle der Kleinen Heiligen', 0.9);
  }

  _garkueche(b, ctx) {
    const z = Z1 - 0.8;
    const open = !!this.state?.flags?.anselm;
    // Tresen vor dem Ladenfenster
    b.box(mat('walnut'), 0, 0.5, z - 0.48, 3.34, 0.96, 0.62, { collide: true });
    b.box(mat('steel'), 0, 1.01, z - 0.5, 3.5, 0.04, 0.8);
    b.box(mat('rubber'), 0, 0.06, z - 0.8, 3.24, 0.12, 0.02);
    for (let i = 0; i < 3; i++) { b.box(mat('woodPanel'), -1.1 + i * 1.1, 0.56, z - 0.8, 0.95, 0.72, 0.02); b.box(mat('brassDark'), -1.1 + i * 1.1 + 0.55, 0.56, z - 0.81, 0.02, 0.76, 0.01); }
    // Vordach aus Wellblech auf zwei Stützen, an der Hauswand verankert
    b.box(mat('rust'), 0, 2.75, z - 0.75, 3.8, 0.04, 2.2, { rx: -0.12 });
    for (const sx of [-1.8, 1.8]) b.cyl(mat('steel'), sx, 0, z - 1.75, 0.035, 0.035, 2.62, 8, { collide: true });
    b.box(mat('steel'), 0, 2.6, z - 1.75, 3.7, 0.06, 0.06);
    if (!open) {
      for (let i = 0; i < 3; i++) this._model('metal_stool_01', -1.1 + i * 1.1, z - 1.35, this.rng.float(0, 6));
    } else {
      this._model('electric_stove', -0.9, z - 0.4, Math.PI, { y: 0 });
      for (let i = 0; i < 3; i++) this._model('pot_enamel_01', -0.6 + i * 0.5, z - 0.5, 0, { y: 1.04 - 0.13 });
      for (let i = 0; i < 3; i++) this._model('metal_stool_01', -1.1 + i * 1.1, z - 1.35, this.rng.float(0, 6));
      this._npc('anselm', { coat: 'fabricWhite', apron: true, face: { age: 0.7, beard: true } }, 0, z + 0.25, Math.PI, 'counter');
      ctx.fixture({ x: 0, y: 2.35, z: z - 0.9, type: 'none', color: 0xffc070, intensity: 5, distance: 8, mode: 'steady', priority: 2 });
    }
    for (const sx of [-1, 1]) this._model('pull_chain_light_socket', sx, z - 1.1, 0, { y: 2.5 });
    ctx.neon('GARKÜCHE', open ? '#ffb040' : '#4a2410', 0, 3.2, z - 1.82, Math.PI, 2.0, { flicker: open ? 0.2 : 0, intensity: open ? 3 : 0 });
    this._spot('anselm', 0, 1.3, z - 1.0, open ? 'Anselm · Garküche' : 'Garküche (geschlossen)', 0.8);
    // Quartier
    this._wallLamp(ctx, -6 - 1.05, Z1, Math.PI);
    ctx.neon('QUARTIER 47', '#8dffa8', -6, 3.6, Z1 - 0.1, Math.PI, 1.6, { flicker: 0.3 });
    this._spot('quartier', -6, 1.3, Z1 - 0.4, 'Quartier · Schlafen & Speichern', 0.7);
  }

  _plaza(b, ctx) {
    // Bänke, Straßenlaternen, Zehntkabine, Pfützen
    P.pew(b, -3.5, 13, Math.PI / 2, this.rng, { l: 2.6 });
    P.pew(b, -3.5, 16, Math.PI / 2, this.rng, { l: 2.6 });
    this._npc('schlaefer', { coat: 'coatBrown', hat: 'hood', face: { eyes: 'closed' } }, -3.5, 16, Math.PI / 2, 'sit', 0.48);
    for (const [x, z] of [[-5.5, 9], [5.5, 9], [-5.5, 22], [5.5, 22]]) {
      this._model('street_lamp_01', x, z, this.rng.float(0, 6), { collide: true, pad: 0 });
      ctx.fixture({ x, y: 3.62, z, type: 'none', color: 0xff9038, intensity: 90, distance: 22, priority: 1.5, mode: this.rng.chance(0.3) ? 'dying' : 'steady' });
    }
    // Wandlaternen neben den Haustüren (Positionen = Türmodule der Häuserzeilen)
    for (const zc of [22.625, 13.625, 10.625]) this._wallLamp(ctx, X0, zc - 1.0, Math.PI / 2);
    for (const zc of [13.625, 22.625]) this._wallLamp(ctx, X1, zc + 1.0, -Math.PI / 2);
    this._wallLamp(ctx, 6 + 1.0, Z1, Math.PI);
    // Zehntkabine
    b.box(mat('steelPanel'), 5.2, 0.04, 14, 1.3, 0.08, 1.2);
    for (const [dx, dz] of [[-0.6, -0.55], [-0.6, 0.55], [0.6, -0.55], [0.6, 0.55]]) b.box(mat('brassDark'), 5.2 + dx, 1.25, 14 + dz, 0.06, 2.5, 0.06, { collide: true });
    b.box(mat('brassDark'), 5.2, 2.55, 14, 1.36, 0.1, 1.26);
    b.box(mat('walnut'), 5.78, 1.25, 14, 0.04, 2.4, 1.1, { collide: true });
    for (const dz of [-0.57, 0.57]) this._glass(5.2, 1.3, 14 + dz, 1.14, 2.2, 0);
    this._model('korean_public_payphone_01', 5.72, 14 + 0.25, -Math.PI / 2, { y: 0.95 });
    ctx.neon('ZEHNT', '#8dffa8', 4.55, 2.8, 14, -Math.PI / 2, 1.1, { flicker: 0.15, intensity: 1.5 });
    const scr = textTexture(128, 96, (g, w, h) => { g.fillStyle = '#021006'; g.fillRect(0, 0, w, h); g.fillStyle = '#8dffa8'; g.font = '14px "VT323", monospace'; g.textAlign = 'center'; ['SPRICH', 'DEINEN', 'NAMEN'].forEach((t, i) => g.fillText(t, w / 2, 30 + i * 18)); });
    ctx.decal(scr, 5.75, 1.55, 14 - 0.25, -Math.PI / 2, 0.36, 0.27, { emissive: 1.2, transparent: false });
    this._spot('zehnt', 4.5, 1.4, 14, 'Zehntkabine', 0.5);
    // Pfützen
    const pm = new THREE.MeshStandardMaterial({ color: 0x0b0d11, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.75, alphaMap: puddleTexture(), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    for (let i = 0; i < 14; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), pm);
      p.rotation.x = -Math.PI / 2;
      p.position.set(this.rng.float(-11, 11), 0.004, this.rng.float(5, 29));
      p.scale.set(this.rng.float(0.5, 1.6), this.rng.float(0.4, 1.1), 1);
      p.receiveShadow = true;
      this.group.add(p);
    }
    // Holo-Tafel an der Rückwand
    this.holoCanvas = mkCanvas(512, 256);
    this.holoTex = new THREE.CanvasTexture(this.holoCanvas);
    this.holoTex.colorSpace = THREE.SRGBColorSpace;
    const hm = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: this.holoTex, emissiveIntensity: 1.3, map: this.holoTex, roughness: 0.4 });
    b.box(mat('steel'), 0, 7.6, Z1 - 0.12, 8.4, 4.4, 0.2);
    for (const bx of [-3, 3]) { b.box(mat('rust'), bx, 5.3, Z1 - 0.25, 0.12, 0.12, 0.5); b.box(mat('rust'), bx, 9.9, Z1 - 0.25, 0.12, 0.12, 0.5); }
    const holo = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), hm);
    holo.position.set(0, 7.6, Z1 - 0.225);
    holo.rotation.y = Math.PI;
    this.group.add(holo);
    this._drawHolo(0);
    // Füll-Licht der Holo-Tafel und des Schachtkopfs
    ctx.fixture({ x: 0, y: 7, z: Z1 - 2.5, type: 'none', color: 0x50d8ff, intensity: 60, distance: 32, mode: 'neon', flicker: 0.2, priority: 3 });
    ctx.fixture({ x: 0, y: 8, z: 12, type: 'none', color: 0x7a5aa0, intensity: 110, distance: 30, mode: 'steady', priority: 3 });
    this.emitters.push({ loop: 'city', pos: new THREE.Vector3(0, 6, 16), opts: { vol: 0.35 } });
    this.emitters.push({ loop: 'rain', pos: null, opts: { vol: 0.35, indoor: false } });
  }

  _drawHolo(t) {
    const g = this.holoCanvas.getContext('2d'), w = 512, h = 256;
    g.clearRect(0, 0, w, h);
    const phase = Math.floor(t / 6) % 3;
    g.fillStyle = 'rgba(20,120,140,0.18)'; g.fillRect(0, 0, w, h);
    g.textAlign = 'center';
    if (phase === 0) {
      drawDialSymbol(g, w / 2, 130, 70, '#6ff0ff', Math.sin(t) * 0.8, 5);
      g.fillStyle = '#9ff6ff'; g.font = '600 38px "Cormorant Garamond", serif'; g.fillText('DEINE STIMME. FÜR IMMER.', w / 2, 200);
    } else if (phase === 1) {
      g.fillStyle = '#ffb0d8'; g.font = '600 34px "Cormorant Garamond", serif';
      g.fillText('DER STIMMZEHNT IST PFLICHT', w / 2, 100);
      g.font = '26px "Cormorant Garamond", serif'; g.fillText('Wer gibt, wird singen.', w / 2, 150);
    } else {
      g.fillStyle = '#ffe0a0'; g.font = '600 34px "Cormorant Garamond", serif';
      g.fillText('BERGUNGSVERTRÄGE', w / 2, 100);
      g.font = '26px "Cormorant Garamond", serif'; g.fillText('Die Tiefe dankt. Die Kanzlei zahlt.', w / 2, 150);
    }
    for (let y = 0; y < h; y += 3) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, y, w, 1); }
    if (Math.random() < 0.3) { const gy = Math.random() * h; g.drawImage(this.holoCanvas, 0, gy, w, 12, (Math.random() - 0.5) * 30, gy, w, 12); }
    this.holoTex.needsUpdate = true;
  }

  _skyline() {
    const rng = this.rng;
    const g = new THREE.Group();
    g.name = 'Skyline';
    // Himmelskuppel: Smog, von unten vom Stadtlicht angestrahlt (orange-violett am Horizont, oben fast schwarz)
    const c = mkCanvas(4, 256), cg = c.getContext('2d');
    const grd = cg.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, '#0c0911'); grd.addColorStop(0.3, '#1b1121'); grd.addColorStop(0.55, '#34192b'); grd.addColorStop(0.78, '#522832'); grd.addColorStop(1, '#5a2c30');
    cg.fillStyle = grd; cg.fillRect(0, 0, 4, 256);
    const skyTex = new THREE.CanvasTexture(c); skyTex.colorSpace = THREE.SRGBColorSpace;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(140, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2 + 0.25),
      new THREE.MeshBasicMaterial({ map: skyTex, color: new THREE.Color(1.6, 1.6, 1.6), side: THREE.BackSide, fog: false, depthWrite: false }));
    dome.position.set(0, -10, 16);
    dome.renderOrder = -10;
    g.add(dome);
    // Türme hinter den Häusern: schwarze Silhouetten, Fenster im Stockwerk-Raster, rote Warnlichter oben
    const dark = new THREE.MeshBasicMaterial({ color: 0x020103, fog: false });
    const win = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 1.5), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), 900);
    const red = new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff2a14, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false });
    const col = new THREE.Color(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    this.warnLights = [];
    let n = 0;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + rng.float(-0.1, 0.1);
      const r = rng.float(38, 70);
      const x = Math.sin(a) * r, z = 16 + Math.cos(a) * r;
      const w = rng.float(10, 20), h = rng.float(30, 78);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), dark);
      const ry = Math.atan2(-x, -(z - 16));           // eine Seite zeigt zum Markt
      m.position.set(x, h / 2 - 2, z); m.rotation.y = ry;
      g.add(m);
      // Fenster: Raster auf der Marktseite, nur ein Teil beleuchtet
      q.setFromAxisAngle(up, ry);
      const face = new THREE.Vector3(0, 0, w / 2 + 0.03).applyQuaternion(q).add(m.position);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
      const cols = Math.floor(w / 3), rows = Math.floor((h - 16) / 3.6);
      for (let rI = 0; rI < rows && n < 900; rI++) for (let cI = 0; cI < cols && n < 900; cI++) {
        if (!rng.chance(0.13)) continue;
        const p = face.clone().addScaledVector(right, (cI - (cols - 1) / 2) * 3).setY(14 + rI * 3.6 - 2);
        win.setMatrixAt(n, new THREE.Matrix4().compose(p, q, new THREE.Vector3(1, 1, 1)));
        col.setHex(rng.pick([0xffb060, 0xffd6a0, 0xffb060, 0x70d8ff, 0xff4a8a])).multiplyScalar(rng.float(0.15, 0.45));
        win.setColorAt(n, col);
        n++;
      }
      if (rng.chance(0.7)) {
        const sp = new THREE.Sprite(red);
        sp.position.set(x, h - 1.6, z);
        sp.scale.setScalar(2.2);
        sp.userData.phase = rng.float(0, 6);
        g.add(sp);
        this.warnLights.push(sp);
      }
    }
    win.count = n;
    g.add(win);
    g.traverse(o => { o.userData.noCheck = true; });
    this.group.add(g);
  }

  _rain() {
    const n = 1400;
    const pos = new Float32Array(n * 6);
    this.rainSpeed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const x = X0 + Math.random() * (X1 - X0), z = Z0 + Math.random() * (Z1 - Z0), y = Math.random() * H;
      pos.set([x, y, z, x, y - 0.35, z], i * 6);
      this.rainSpeed[i] = 7 + Math.random() * 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.LineBasicMaterial({ color: 0x8aa0c0, transparent: true, opacity: 0.28, depthWrite: false });
    this.rain = new THREE.LineSegments(g, m);
    this.rain.frustumCulled = false;
    this.group.add(this.rain);
    // Wetter: Regen kommt und geht (ca. ein Drittel der Zeit), weich ein- und ausgeblendet
    const wet = Math.random() < 0.35;
    this.weather = { rain: wet ? 1 : 0, target: wet ? 1 : 0, timer: 60 + Math.random() * 120 };
  }

  update(dt, time) {
    const w = this.weather;
    w.timer -= dt;
    if (w.timer <= 0) { w.target = Math.random() < 0.3 ? 1 : 0; w.timer = 90 + Math.random() * 150; }
    w.rain += Math.sign(w.target - w.rain) * Math.min(Math.abs(w.target - w.rain), dt / 40);
    this.rain.visible = w.rain > 0.01;
    this.rain.material.opacity = 0.28 * w.rain;
    this.rain.geometry.setDrawRange(0, Math.floor(this.rainSpeed.length * w.rain) * 2);
    const rainLoop = this.emitters.find(e => e.loop === 'rain');
    rainLoop?.handle?.setVol?.(0.35 * w.rain, 1.5);
    // Regen fällt
    const p = this.rain.geometry.attributes.position.array;
    for (let i = 0; i < this.rainSpeed.length; i++) {
      const o = i * 6;
      let y = p[o + 1] - this.rainSpeed[i] * dt;
      if (y < 0) y += H;
      p[o + 1] = y; p[o + 4] = y - 0.35;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;
    for (const sp of this.warnLights || []) sp.visible = Math.sin(time * 1.3 + sp.userData.phase) > 0.2;
    this._holoT = (this._holoT ?? 0) + dt;
    if (this._holoT > 0.12) { this._drawHolo(time); this._holoT = 0; }
    const eye = this.R.camera.position;
    for (const id in this.npcs) {
      const n = this.npcs[id];
      if (n.update) n.update(dt, eye);
      else if (!['hanne', 'stummer', 'schlaefer'].includes(id)) idle(n, dt, 0.7);
    }
    for (const c of this.candles) c.scale.y = 0.07 * (0.85 + Math.sin(time * 11 + (c.userData.phase || 0)) * 0.15);
  }

  dispose(scene, collision) {
    for (const off of this._offs || []) off();
    for (const id in this.npcs) this.npcs[id].dispose?.();
    disposeGroup(this.group);
    for (const c of this.colliders) collision.remove(c);
    for (const e of this.emitters) e.handle?.stop(0.4);
  }
}

// Pfützenform: weiche, unregelmäßige Kleckse (Alpha)
let _puddle = null;
function puddleTexture() {
  if (_puddle) return _puddle;
  const c = mkCanvas(128, 128), g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 128, 128);
  g.filter = 'blur(5px)';
  g.fillStyle = '#fff';
  for (let i = 0; i < 9; i++) {
    const a = i / 9 * Math.PI * 2, r = 20 + Math.sin(i * 2.7) * 9;
    g.beginPath(); g.ellipse(64 + Math.cos(a) * r, 64 + Math.sin(a) * r * 0.7, 18 + (i % 3) * 6, 12 + (i % 2) * 5, a, 0, Math.PI * 2); g.fill();
  }
  g.beginPath(); g.ellipse(64, 64, 32, 22, 0.3, 0, Math.PI * 2); g.fill();
  _puddle = new THREE.CanvasTexture(c);
  return _puddle;
}
