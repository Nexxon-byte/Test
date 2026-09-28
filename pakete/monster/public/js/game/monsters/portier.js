// Der Portier (Tiefenstufe IV, ab −99): zwei Meter siebzig, langer Mantel, weiße Handschuhe,
// Portiersmütze – und statt eines Kopfes ein Zifferblatt, dessen Nadel auf dich zeigt. Er hält die Tür.
// Jede Ebene mit Portier hat seine Tür: eine schwere Tür vor einer Kammer voller Beute. Er steht davor.
// Wer ihm zu nah kommt, den begleitet er hinaus – langsam, unaufhaltsam. Wer die Tür öffnet, den holt er.
// Um 03:00 geht er zur Neunten und hält dort die Tür. Wer ihn berührt, stirbt.
//
// Konter: Abstand (er geht nur, er rennt nie) · Verstecke, wenn er es nicht sieht · die Spieluhr:
// Er kniet und lauscht, solange sie spielt · die Klingel an seiner Tür ruft ihn an den Posten zurück.
// Waffen halten ihn nur einen Herzschlag auf. Salz hält ihn gar nicht.

import * as THREE from 'three';
import { Monster } from './base.js';
import { CAB } from '../../world/cab.js';
import { CS, DIRS } from '../../world/levelgen.js';
import { audio } from '../../audio/audio.js';
import { voice } from '../../audio/voice.js';
import { ui } from '../../ui/ui.js';
import { mat, glowMat } from '../../gfx/materials.js';
import { mkCanvas } from '../../gfx/textures.js';
import { charFor, packFirstSight, lampLevel } from './kit.js';
import { dress } from './standin.js';

const _v = new THREE.Vector3(), _w = new THREE.Vector3();

export const PORTIER = {
  speedWalk: 1.9, speedPursue: 2.25, speedLate: 2.6,
  sight: 13, touch: 1.35, loseHidden: 5,
  listenRange: 22, kneelAfter: 0.8, calmAfterMusic: 8,
  roundEvery: [35, 60], gateAt: 180, doorOpenFor: 30,
  flickerRadius: 6,
};

const CLIP = { idle: 'Idle_Loop', walk: 'Walk_Formal_Loop', kneel: 'Crouch_Idle_Loop', rise: 'Idle_Loop', reach: 'Zombie_Scratch', hit: 'Hit_Chest' };

// ============================================================================ Die Tür

export class PortierDoor {
  constructor(director) {
    this.d = director;
    this.open = 0;
    this.target = 0;
    this.openT = 0;
    this.ok = this._find();
    if (this.ok) this._build();
    // Keine Sackgasse in dieser Ebene (alle Gänge laufen im Kreis): eine frei stehende Portiersloge
    else if ((this.ok = this._findLoge())) this._buildLoge();
  }

  // Loge: ein Raum-Innenfeld weit hinten, rundum begehbar
  _findLoge() {
    const d = this.d, g = d.grid;
    let best = null, bs = -1;
    for (let z = 2; z < g.h - 2; z++) for (let x = 2; x < g.w - 2; x++) {
      if (!g.walkable(x, z) || g.isLanding(x, z) || g.isCabin(x, z) || d.level.reserved?.has(d.level.cellKey(x, z))) continue;
      const dist = g.dist[g.idx(x, z)];
      if (dist < 6) continue;
      if (!DIRS.every(dir => g.walkable(x + dir.dx, z + dir.dz))) continue;
      const [wx, wz] = d.level.center(x, z);
      if (!d.col.pointFree(wx, wz, 1.3, 0.1, 2.4)) continue;
      const score = dist + d.rng.float(0, 4);
      if (score > bs) { bs = score; best = [x, z]; }
    }
    if (!best) return false;
    this.cell = best;
    this.loge = true;
    // Tür zeigt zur Kabine hin (dorthin, wo der Weg herkommt)
    let open = DIRS[0], od = 1e9;
    for (const dir of DIRS) { const dd = g.dist[g.idx(best[0] + dir.dx, best[1] + dir.dz)]; if (dd < od) { od = dd; open = dir; } }
    this.insideDir = { dx: -open.dx, dz: -open.dz };
    this.region = [best];
    return true;
  }

  _buildLoge() {
    const d = this.d, level = d.level, R = d.R, g2 = d.game;
    const [cx, cz] = this.cell;
    const [x, z] = level.center(cx, cz);
    const ins = this.insideDir, S = 2.3, H = 2.6, half = S / 2;
    this.center = new THREE.Vector3(x - ins.dx * half, 0, z - ins.dz * half);   // Türmitte an der Vorderseite
    this.box3 = { x, z, half: half - 0.05 };
    this.dir = new THREE.Vector3(ins.dx, 0, ins.dz);
    this.outside = new THREE.Vector3(x - ins.dx * (half + 1.3), 0, z - ins.dz * (half + 1.3));
    const ry = Math.atan2(ins.dx, ins.dz);
    const grp = new THREE.Group();
    grp.position.set(x, 0, z);
    grp.rotation.y = ry;
    const brass = mat('brass'), dark = mat('brassDark');
    // Gitterstäbe rundum (vorn mit Türöffnung), Dach, Sockel
    const bar = new THREE.CylinderGeometry(0.014, 0.014, H, 5);
    for (let i = 0; i <= 12; i++) {
      const t = -half + i * S / 12;
      for (const [bx, bz] of [[t, half], [-half, t], [half, t], [t, -half]]) {
        if (bz === -half && Math.abs(bx) < 0.62) continue;       // Tür (vorn = −z im lokalen Raum)
        const m = new THREE.Mesh(bar, brass); m.position.set(bx, H / 2, bz); grp.add(m);
      }
    }
    const roof = new THREE.Mesh(new THREE.BoxGeometry(S + 0.12, 0.08, S + 0.12), dark); roof.position.y = H + 0.04;
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(S + 0.12, 0.1, S + 0.12), mat('stoneDark')); plinth.position.y = 0.05;
    const dome = new THREE.Mesh(new THREE.ConeGeometry(S * 0.62, 0.7, 4), dark); dome.rotation.y = Math.PI / 4; dome.position.y = H + 0.43;
    grp.add(roof, plinth, dome);
    // Schild über der Tür
    const c = mkCanvas(256, 64), gc = c.getContext('2d');
    gc.fillStyle = '#1a120a'; gc.fillRect(0, 0, 256, 64); gc.strokeStyle = '#d9b36a'; gc.lineWidth = 3; gc.strokeRect(4, 4, 248, 56);
    gc.fillStyle = '#e8c98a'; gc.font = '600 30px "Cormorant Garamond", serif'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText('L O G E', 128, 34);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffc070, emissiveMap: tex, emissiveIntensity: 0.35, roughness: 0.5 }));
    sign.position.set(0, H - 0.2, -half - 0.03); sign.rotation.y = Math.PI;
    grp.add(sign);
    // Gittertür (Scharnier links)
    this.hinge = new THREE.Group();
    this.hinge.position.set(-0.62, 0, -half);
    for (let i = 0; i < 7; i++) { const m = new THREE.Mesh(bar, brass); m.position.set(0.09 + i * 0.17, H / 2, 0); this.hinge.add(m); }
    for (const yy of [0.15, H * 0.5, H - 0.15]) { const r = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.04, 0.04), dark); r.position.set(0.62, yy, 0); this.hinge.add(r); }
    grp.add(this.hinge);
    // Innen: Pult, Schlüsselbrett, Lampe
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.5), mat('walnut')); desk.position.set(0, 0.4, half - 0.4); grp.add(desk);
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.04), mat('walnut')); board.position.set(0, 1.7, half - 0.05); grp.add(board);
    for (let i = 0; i < 12; i++) { const k = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.08, 0.01), brass); k.position.set(-0.36 + (i % 6) * 0.14, 1.85 - Math.floor(i / 6) * 0.25, half - 0.08); grp.add(k); }
    // Klingel außen neben der Tür
    const bellG = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.3), mat('walnut')); stand.position.y = 0.5;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.02, 14), brass); base.position.y = 1.01;
    const bdome = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass); bdome.position.y = 1.02;
    bellG.add(stand, base, bdome);
    bellG.position.set(1.0, 0, -half - 0.5);
    grp.add(bellG);
    R.scene.add(grp);
    this.group = grp;
    this.H = H;
    grp.updateMatrixWorld(true);
    this.bellPos = new THREE.Vector3(); bellG.localToWorld(this.bellPos.set(0, 1.05, 0));
    this.fixture = g2.pool.add({ pos: new THREE.Vector3(x, H - 0.3, z), color: 0xffc070, intensity: 3, distance: 6, mode: 'candle', on: true, meshes: [], priority: 2 });
    // Kollider: drei Wände + Tür
    const W = 0.08;
    const wall = (ax, az, bx, bz) => d.col.add({ minX: Math.min(ax, bx) - W, maxX: Math.max(ax, bx) + W, minZ: Math.min(az, bz) - W, maxZ: Math.max(az, bz) + W, minY: 0, maxY: H, tag: 'pack' });
    const loc = (lx, lz) => { const v = new THREE.Vector3(lx, 0, lz).applyAxisAngle(new THREE.Vector3(0, 1, 0), ry); return [x + v.x, z + v.z]; };
    const corners = [loc(-half, -half), loc(half, -half), loc(half, half), loc(-half, half)];
    this.walls = [wall(...corners[1], ...corners[2]), wall(...corners[2], ...corners[3]), wall(...corners[3], ...corners[0])];
    const [dl, dr] = [loc(-0.62, -half), loc(0.62, -half)];
    this.box = wall(...dl, ...dr);
    this.sideWalls = [wall(...corners[0], ...dl), wall(...dr, ...corners[1])];
    // Beute in der Loge
    const items = g2.items, rich = ['ikone', 'reliquie', 'zelle', 'leuchter', 'schrein'];
    const stage = d.info?.stage || 4;
    for (let i = 0; i < 3; i++) {
      const [px, pz] = loc(-0.6 + i * 0.6, 0.1 + (i % 2) * 0.3);
      try { const it = items.spawn(rich[d.rng.int(0, rich.length - 1)], px, 0, pz, { value: Math.round((60 + d.rng.float(0, 60)) * (1 + stage * 0.45)) }); g2._itemEntry?.(it); } catch { /* */ }
    }
    this._entries();
  }

  _entries() {
    const g2 = this.d.game;
    this.entry = g2.interact.add({
      tag: 'pack', pos: () => _w.copy(this.center).addScaledVector(this.dir, -0.1).setY(1.2), radius: 0.9, maxDist: 2.4, priority: 0.3,
      prompt: () => this.target > 0.5 ? 'Tür des Portiers schließen' : 'Tür des Portiers öffnen',
      sub: () => this.target > 0.5 ? '' : 'Er hält sie. Er wird es merken.',
      enabled: () => g2.mode === 'night' && !g2.busy && !g2.player.dead,
      onUse: () => this.setOpen(this.target < 0.5, true),
    });
    this.bellEntry = g2.interact.add({
      tag: 'pack', pos: this.bellPos, radius: 0.3, maxDist: 2.2, priority: 0.35,
      prompt: 'Klingel des Portiers', sub: 'Ruft ihn an seinen Posten',
      enabled: () => g2.mode === 'night' && !g2.busy && !g2.player.dead,
      onUse: () => this.ring(),
    });
  }

  // Eine Sackgasse: Zelle, deren Wegfall eine Kammer (4–40 Zellen) vom Rest trennt
  _find() {
    const d = this.d, g = d.grid;
    let best = null, bs = -1;
    for (let z = 1; z < g.h - 1; z++) for (let x = 1; x < g.w - 1; x++) {
      if (!g.walkable(x, z) || g.isLanding(x, z) || g.isCabin(x, z)) continue;
      const dist = g.dist[g.idx(x, z)];
      if (dist < 6) continue;
      const nb = DIRS.filter(dir => g.walkable(x + dir.dx, z + dir.dz));
      if (nb.length !== 2) continue;
      // gerade Durchgänge (gegenüberliegende Nachbarn) – dort passt eine Tür
      if (nb[0].dx !== -nb[1].dx || nb[0].dz !== -nb[1].dz) continue;
      for (const side of nb) {
        const region = this._region(x + side.dx, z + side.dz, x, z, 42);
        if (!region || region.length < 4) continue;
        const inner = region.some(([rx, rz]) => g.dist[g.idx(rx, rz)] > dist);
        if (!inner) continue;
        const score = dist + region.length * 0.4 + d.rng.float(0, 3);
        if (score > bs) { bs = score; best = { cell: [x, z], insideDir: side, region }; }
      }
    }
    if (!best) return false;
    Object.assign(this, best);
    return true;
  }

  _region(sx, sz, bx, bz, max) {
    const g = this.d.grid, seen = new Set([bz * 4096 + bx, sz * 4096 + sx]), q = [[sx, sz]], out = [];
    while (q.length) {
      const [x, z] = q.shift();
      out.push([x, z]);
      if (out.length > max) return null;
      if (g.isLanding(x, z) || g.isCabin(x, z)) return null;
      for (const dir of DIRS) {
        const nx = x + dir.dx, nz = z + dir.dz, k = nz * 4096 + nx;
        if (seen.has(k) || !g.isFloor(nx, nz)) continue;
        seen.add(k);
        q.push([nx, nz]);
      }
    }
    return out;
  }

  _build() {
    const d = this.d, level = d.level, R = d.R;
    const [cx, cz] = this.cell;
    const [x, z] = level.center(cx, cz);
    const ins = this.insideDir;
    // Türebene quer zum Durchgang, Scharnier links
    this.center = new THREE.Vector3(x, 0, z);
    this.dir = new THREE.Vector3(ins.dx, 0, ins.dz);          // zeigt in die Kammer
    this.outside = new THREE.Vector3(x - ins.dx * 1.6, 0, z - ins.dz * 1.6);
    const ry = Math.atan2(ins.dx, ins.dz);
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    const W = CS, H = Math.min(3.0, (level.theme?.height ?? 4) - 0.4);
    const frameM = mat('walnut'), brass = mat('brass');
    // Rahmen
    const frame = new THREE.Group();
    const post = (px) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, H + 0.2, 0.3), frameM); m.position.set(px, (H + 0.2) / 2, 0); m.castShadow = true; frame.add(m); };
    post(-W / 2 + 0.11); post(W / 2 - 0.11);
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, 0.34), frameM); lintel.position.y = H + 0.1; frame.add(lintel);
    // Messingschild über der Tür
    const c = mkCanvas(256, 64), gc = c.getContext('2d');
    gc.fillStyle = '#1a120a'; gc.fillRect(0, 0, 256, 64);
    gc.strokeStyle = '#d9b36a'; gc.lineWidth = 3; gc.strokeRect(4, 4, 248, 56);
    gc.fillStyle = '#e8c98a'; gc.font = '600 30px "Cormorant Garamond", serif'; gc.textAlign = 'center'; gc.textBaseline = 'middle'; gc.fillText('P O R T I E R', 128, 34);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshStandardMaterial({ map: tex, emissive: 0xffc070, emissiveMap: tex, emissiveIntensity: 0.3, roughness: 0.5, metalness: 0.4 }));
    sign.position.set(0, H + 0.1, -0.18); sign.rotation.y = Math.PI;
    frame.add(sign);
    g.add(frame);
    // Türblatt (Scharnier am linken Pfosten)
    this.hinge = new THREE.Group();
    this.hinge.position.set(-W / 2 + 0.22, 0, 0);
    const leafW = W - 0.44;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(leafW, H - 0.02, 0.1), mat('woodPanel'));
    leaf.position.set(leafW / 2, (H - 0.02) / 2, 0);
    leaf.castShadow = true; leaf.receiveShadow = true;
    this.hinge.add(leaf);
    for (const yy of [0.5, H - 0.6]) { const band = new THREE.Mesh(new THREE.BoxGeometry(leafW * 0.9, 0.08, 0.12), mat('brassDark')); band.position.set(leafW / 2, yy, 0); this.hinge.add(band); }
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), brass); knob.position.set(leafW - 0.18, 1.1, -0.08); this.hinge.add(knob);
    const peep = new THREE.Mesh(new THREE.CircleGeometry(0.04, 12), glowMat(0xffb060, 1.2, 'portierPeep')); peep.position.set(leafW / 2, 1.6, -0.056); peep.rotation.y = Math.PI; this.hinge.add(peep);
    g.add(this.hinge);
    // Klingel auf einem Pult vor der Tür (außen)
    const bellG = new THREE.Group();
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.0, 0.3), frameM); stand.position.y = 0.5; stand.castShadow = true;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.02, 14), brass); base.position.y = 1.01;
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.055, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), brass); dome.position.y = 1.02;
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6), brass); pin.position.y = 1.085;
    bellG.add(stand, base, dome, pin);
    bellG.position.set(W / 2 + 0.05, 0, -0.9);
    g.add(bellG);
    R.scene.add(g);
    this.group = g;
    this.H = H;
    this.bellPos = new THREE.Vector3(); bellG.localToWorld(this.bellPos.set(0, 1.05, 0));
    // Kollider des Türblatts (quer über den Durchgang)
    const hx = Math.abs(ins.dz) * W / 2 + 0.06, hz = Math.abs(ins.dx) * W / 2 + 0.06;
    this.box = d.col.add({ minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz, minY: 0, maxY: H, tag: 'pack' });
    // Navigation: die geschlossene Tür ist für Monster keine Wand (der Portier öffnet sie)
    // Beute in der Kammer
    const items = d.game.items, rich = ['ikone', 'reliquie', 'zelle', 'leuchter', 'walze', 'schrein', 'kelch'];
    const stage = d.info?.stage || 4;
    const cells = this.region.filter(([rx, rz]) => !(rx === cx && rz === cz));
    let n = 0;
    for (const [rx, rz] of d.rng.shuffle(cells.slice())) {
      if (n >= Math.min(4, 2 + Math.floor(cells.length / 6))) break;
      const [wx, wz] = level.center(rx, rz);
      const px = wx + d.rng.float(-0.6, 0.6), pz = wz + d.rng.float(-0.6, 0.6);
      if (!d.col.pointFree(px, pz, 0.25, 0.05, 0.8)) continue;
      const type = rich[d.rng.int(0, rich.length - 1)];
      let it;
      try { it = items.spawn(type, px, 0, pz, { value: Math.round((60 + d.rng.float(0, 60)) * (1 + stage * 0.45)) }); } catch { continue; }
      d.game._itemEntry?.(it);
      n++;
    }
    this._entries();
  }

  setOpen(on, byPlayer = false) {
    this.target = on ? 1 : 0;
    audio.play('doorCreak', { pos: _v.copy(this.center).setY(1.4), vol: 0.8, dur: on ? 2.2 : 1.6 });
    this.d.noise(this.center.x, this.center.z, 16, 'door');
    if (on) this.openT = PORTIER.doorOpenFor;
    if (on && byPlayer) this.openedByPlayer = true;
  }

  ring() {
    audio.play('deskBell', { pos: this.bellPos.clone(), vol: 0.9 });
    this.d.noise(this.bellPos.x, this.bellPos.z, 30, 'deskbell');
    this.rung = true;
  }

  // liegt ein Punkt in der Kammer?
  inside(p) {
    if (this.loge) return Math.abs(p.x - this.box3.x) < this.box3.half && Math.abs(p.z - this.box3.z) < this.box3.half;
    const g = this.d.grid, cx = g.cx(p.x), cz = g.cz(p.z);
    return this.region.some(([x, z]) => x === cx && z === cz);
  }

  update(dt) {
    if (!this.ok) return;
    const prev = this.open;
    this.open += Math.sign(this.target - this.open) * Math.min(Math.abs(this.target - this.open), dt / 1.8);
    if (this.open !== prev) this.hinge.rotation.y = -this.open * 1.75;
    this.box.enabled = this.open < 0.4;
    // Wege: die geschlossene Tür ist eine Wand (andere Wesen gehen nicht hindurch)
    const g = this.d.grid;
    g.block[g.idx(this.cell[0], this.cell[1])] = (this.loge || this.open < 0.4) ? 1 : 0;
    // von selbst zu, wenn niemand im Durchgang steht
    if (this.target > 0.5) {
      this.openT -= dt;
      const p = this.d.player.pos;
      if (this.openT <= 0 && Math.hypot(p.x - this.center.x, p.z - this.center.z) > 2) this.setOpen(false);
    }
  }

  dispose() {
    if (!this.ok) return;
    this.d.game.interact.remove(this.entry);
    this.d.game.interact.remove(this.bellEntry);
    this.d.col.remove(this.box);
    for (const w of [...(this.walls || []), ...(this.sideWalls || [])]) this.d.col.remove(w);
    if (this.fixture) this.d.game.pool.remove(this.fixture);
    if (this.d.grid) this.d.grid.block[this.d.grid.idx(this.cell[0], this.cell[1])] = 0;
    this.group.traverse(o => { o.geometry?.dispose?.(); });
    this.group.removeFromParent();
  }
}

// ============================================================================ Der Portier

export class Portier extends Monster {
  constructor(director, { door = null } = {}) {
    const c = charFor('portier');
    super(director, { char: c.id, profile: 'portier', radius: 0.3, height: 2.7 });   // schmaler Kollisionskreis: er muss durch jede Lücke, durch die du passt
    this.type = 'portier';
    this.standin = c.standin;
    if (c.standin) this.root.scale.setScalar(1.5);
    this.door = door;
    this.dressing = dress('portier', this);
    this.tickT = 1;
    this.stepT = 0;
    this.roundT = 30 + Math.random() * 20;
    this.flickered = new Set();
    this.play(CLIP.idle, { fade: 0 });
    this.setState('post');
  }

  get chasing() { return this.state === 'pursue' || this.state === 'escort'; }
  cannonTarget() { return this.state !== 'listen'; }

  get post() {
    if (this.door?.ok) return this.door.outside;
    return this._post || (this._post = new THREE.Vector3(this.pos.x, 0, this.pos.z));
  }

  // ---------------------------------------------------------------- Denken

  think(dt) {
    const d = this.d, p = d.player;
    this.onScreen = d.seen(this);
    const dist = this.distTo(p.pos);
    this.moving = false;
    if (this.onScreen && dist < 22) packFirstSight(d, 'portier');
    // Spieluhr hat Vorrang vor allem
    const box = d.game._musicbox?.source;
    if (box && this.state !== 'listen' && this.state !== 'kill' && Math.hypot(box.x - this.pos.x, box.z - this.pos.z) < PORTIER.listenRange) { this.resume = this.state; this.setState('listen'); }
    // Wann darf er dich berühren?
    if (this.state !== 'listen' && this.state !== 'kill' && this.state !== 'stagger' && !p.dead && !d.elev.contains(p.pos) && dist < PORTIER.touch && (!p.hidden || this.sawHide)) { this.setState('kill'); }
    // 03:00: er geht zur Neunten
    if (d.game.clock >= PORTIER.gateAt && !['gate', 'listen', 'kill', 'stagger', 'pursue'].includes(this.state)) this.setState('gate');
    // Tür geöffnet → er holt den Eindringling
    if (this.door?.openedByPlayer && !['pursue', 'listen', 'kill', 'stagger'].includes(this.state)) { this.door.openedByPlayer = false; this.setState('pursue'); }
    // Klingel ruft ihn zurück
    if (this.door?.rung) { this.door.rung = false; if (this.state !== 'listen' && this.state !== 'kill') { this.recalled = true; this.setState('return'); } }

    switch (this.state) {
      case 'post': this._post(dt, dist); break;
      case 'round': this._round(dt, dist); break;
      case 'escort': this._escort(dt, dist); break;
      case 'pursue': this._pursue(dt, dist); break;
      case 'return': this._return(dt, dist); break;
      case 'gate': this._gate(dt, dist); break;
      case 'listen': this._listen(dt, box); break;
      case 'kill': this._kill(dt); break;
      case 'stagger': if (this.stateT > this.staggerFor) this.setState(this.resume || 'pursue'); break;
    }
    this._ticks(dt, dist);
    this._flicker();
  }

  animate(dt) {
    super.animate(dt, this.state === 'kill' ? 0.3 : 1);
    const p = this.d.player;
    const still = this.state === 'listen';
    if (this.onScreen || this.distTo(p.pos) < 35) this.dressing.update(dt, { time: this.d.time }, { look: still ? null : _v.set(p.pos.x, 0, p.pos.z), spin: this.state === 'stagger' ? 14 : 0, still });
  }

  _sees() {
    const d = this.d, p = d.player;
    if (p.dead || p.hidden) return false;
    const dist = this.distTo(p.pos);
    if (dist > PORTIER.sight * 1.5) return false;
    if (!d.grid.lineOfSight(this.pos.x, this.pos.z, p.pos.x, p.pos.z)) return false;
    return dist < 4 || (dist < PORTIER.sight && (lampLevel(d) > 0.15 || d.lightAt(_v.set(p.pos.x, 1.2, p.pos.z)).lit));
  }

  _walk(dt, x, z, speed, arrive = 0.7) {
    // Salz hält ihn nicht auf; seine Tür öffnet er selbst: erst davor treten, dann auf
    const door = this.door;
    if (door?.ok && door.open < 0.6 && door.inside(_w.set(x, 0, z)) !== door.inside(this.pos)) {
      const side = door.inside(this.pos) ? _w.copy(door.center).addScaledVector(door.dir, 1.4) : door.outside;
      if (Math.hypot(side.x - this.pos.x, side.z - this.pos.z) > 0.7) { x = side.x; z = side.z; }
      else { if (door.target < 0.5) door.setOpen(true); this.play(CLIP.idle, { fade: 0.3 }); this.faceToward(door.center.x, door.center.z, dt, 4); return false; }
    }
    // In die Loge (eine Zelle, für Wege gesperrt): durch die offene Tür direkt hinein
    if (door?.loge && door.open >= 0.6 && (door.inside(_w.set(x, 0, z)) || door.inside(this.pos))) {
      const a = this.play(CLIP.walk, { fade: 0.4 });
      if (a) a.timeScale = speed / 1.7;
      this.moving = true;
      this.stepToward(x, z, speed, dt);
      return Math.hypot(x - this.pos.x, z - this.pos.z) < arrive;
    }
    this.repathT -= dt;
    if (!this.path || this.repathT <= 0 || this.goal.distanceTo(_v.set(x, 0, z)) > 1.5) { this.repathT = 0.9; if (!this.pathTo(x, z)) { this.repathT = 2.5; return true; } }
    const a = this.play(CLIP.walk, { fade: 0.4 });
    if (a) a.timeScale = speed / 1.7;
    this.moving = true;
    return this.follow(dt, speed, arrive);
  }

  _post(dt, dist) {
    const p = this.d.player;
    const post = this.post;
    if (Math.hypot(post.x - this.pos.x, post.z - this.pos.z) > 0.8) { this._walk(dt, post.x, post.z, PORTIER.speedWalk, 0.5); return; }
    this.play(CLIP.idle, { fade: 0.6 });
    // Blick nach außen (weg von der Tür)
    if (this.door?.ok) this.faceToward(post.x - this.door.dir.x, post.z - this.door.dir.z, dt, 2);
    if (this._sees() && dist < PORTIER.sight) { this.setState('escort'); return; }
    this.roundT -= dt;
    if (this.roundT <= 0) {
      const [a, b] = PORTIER.roundEvery;
      this.roundT = a + Math.random() * (b - a);
      const g = this.d.grid;
      for (let i = 0; i < 20; i++) {
        const c = g.randomFloorCell(this.d.rng, (x, z) => g.walkable(x, z));
        if (!c) break;
        const [x, z] = this.d.level.center(c[0], c[1]);
        if (Math.hypot(x - post.x, z - post.z) < 14 && (!this.door?.ok || !this.door.inside(_v.set(x, 0, z)))) { this.roundTo = [x, z]; break; }
      }
      if (this.roundTo) this.setState('round');
    }
  }

  _round(dt, dist) {
    if (this._sees() && dist < PORTIER.sight) { this.setState('escort'); return; }
    if (!this.roundTo || this._walk(dt, this.roundTo[0], this.roundTo[1], PORTIER.speedWalk * 0.8, 0.8) || this.stateT > 25) { this.roundTo = null; this.setState('return'); }
  }

  // Begleiten: er geht auf dich zu, bis du weit genug weg bist
  _escort(dt, dist) {
    const d = this.d, p = d.player;
    const sees = this._sees();
    this.lostT = sees ? 0 : (this.lostT || 0) + dt;
    if (this.door?.ok && this.door.inside(p.pos)) { this.setState('pursue'); return; }
    if (dist > 17 || this.lostT > 6 || d.elev.contains(p.pos)) { this.lostT = 0; this.setState('return'); return; }
    this._walk(dt, p.pos.x, p.pos.z, PORTIER.speedWalk, 0.9);
  }

  // Er weiß, wo du bist
  _pursue(dt, dist) {
    const d = this.d, p = d.player;
    if (p.dead) { this.setState('return'); return; }
    if (d.elev.contains(p.pos)) { this.setState(d.game.clock >= PORTIER.gateAt ? 'gate' : 'return'); return; }
    if (p.hidden && !this.sawHide) { this.hideT = (this.hideT || 0) + dt; if (this.hideT > PORTIER.loseHidden) { this.hideT = 0; this.setState('return'); } this.play(CLIP.idle, { fade: 0.4 }); return; }
    this.hideT = 0;
    const speed = d.game.clock >= PORTIER.gateAt ? PORTIER.speedLate : PORTIER.speedPursue;
    this._walk(dt, p.pos.x, p.pos.z, speed * (d.diff ?? 1), 0.8);
    if (this.stateT > 70 && dist > 20) this.setState('return');
  }

  _return(dt, dist) {
    const post = this.post;
    if (this._sees() && dist < PORTIER.sight * 0.7 && !this.recalled) { this.setState('escort'); return; }
    if (this._walk(dt, post.x, post.z, PORTIER.speedWalk, 0.6)) { this.recalled = false; this.setState('post'); }
  }

  // 03:00 – er hält die Tür der Neunten
  _gate(dt, dist) {
    const d = this.d, p = d.player;
    const gx = 0.07, gz = CAB.GATE_Z + 1.35;   // nicht exakt auf der Zellgrenze (x = 0) – dort irrt die Sichtlinie des Rasters
    if (this.stateT < 0.05 && !d._pack?.portierGateSaid) {
      (d._pack ||= {}).portierGateSaid = true;
      if (dist < 40) voice.say('p_door', { pos: this.chest.clone(), label: d.state.flags.story99 ? undefined : '???' });
      ui.komMessage('DER PORTIER STEHT VOR DER NEUNTEN. SPIELUHR – ODER DIE KLINGEL AN SEINER TÜR. – D.', { glitch: true });
    }
    // wer draußen und sichtbar ist, den geht er holen – aber nie weit von der Tür
    const away = Math.hypot(gx - this.pos.x, gz - this.pos.z);
    if (this._sees() && dist < 7 && away < 9) { this._walk(dt, p.pos.x, p.pos.z, PORTIER.speedWalk, 0.9); return; }
    if (away > 0.6) { this._walk(dt, gx, gz, PORTIER.speedLate, 0.4); return; }
    this.play(CLIP.idle, { fade: 0.6 });
    // Rücken zur Kabine, Blick in die Ebene
    this.faceToward(gx, gz + 4, dt, 2);
  }

  _listen(dt, box) {
    const d = this.d;
    if (this.stateT < 0.05) {
      audio.play('porterKneel', { pos: this.chest.clone(), vol: 0.7 });
      const st = d.state;
      const first = !st.flags.pk_portier_ilse;
      st.flags.pk_portier_ilse = true;
      setTimeout(() => { if (this.state === 'listen') voice.say(first ? 'p_ilse' : 'p_song', { pos: this.chest.clone(), label: st.flags.story99 ? undefined : '???' }); }, 1800);
    }
    if (box) { this.faceToward(box.x, box.z, dt, 2); this.heard = (this.heard || 0) + dt; this.afterT = 0; }
    else this.afterT = (this.afterT || 0) + dt;
    this.play(this.stateT > PORTIER.kneelAfter ? CLIP.kneel : CLIP.idle, { fade: 0.8, speed: 0.5 });
    if (!box && this.afterT > 3) {
      const calm = (this.heard || 0) >= PORTIER.calmAfterMusic;
      this.heard = 0;
      this.setState(calm && this.resume !== 'gate' ? 'return' : (this.resume === 'kill' ? 'pursue' : this.resume || 'post'));
    }
  }

  // Die Nadel zeigt auf dich. Das Ticken hört auf.
  _kill(dt) {
    const d = this.d, p = d.player;
    if (this.stateT < 0.05) {
      p.frozen = true;
      p.lookTarget = this.dressing.dial.getWorldPosition(new THREE.Vector3());
      p.lookSpeed = 8;
      this.play(CLIP.reach, { fade: 0.2 });
      audio.play('porterTick', { pos: this.chest.clone(), vol: 1 });
      audio.play('stinger', { kind: 'reveal', vol: 0.8 });
      d.R.glitchPulse(0.5);
      // Wer versteckt war (und gesehen wurde): die Tür geht auf
      if (p.hidden) { audio.play('doorCreak', { pos: this.chest.clone(), vol: 0.9, dur: 1 }); d.game._hiding?.exit(); }
    }
    this.faceToward(p.pos.x, p.pos.z, dt, 10);
    if (this.stateT > 1.6 && !this._done) {
      this._done = true;
      audio.play('porterStep', { pos: this.chest.clone(), vol: 1 });
      d.hurt(999, this, 'porter');
      p.frozen = false;
      p.lookTarget = null;
    }
    if (this.stateT > 3) { this._done = false; this.setState('return'); }
  }

  // ---------------------------------------------------------------- Klang & Licht

  _ticks(dt, dist) {
    if (this.state === 'listen') return;
    this.tickT -= dt;
    if (this.tickT <= 0) {
      this.tickT = this.state === 'pursue' || this.state === 'gate' ? 0.5 : 1;
      if (dist < 24) audio.play('porterTick', { pos: _v.set(this.pos.x, 2.5, this.pos.z), vol: 0.45 });
    }
    if (this.moving) {
      this.stepT -= dt;
      if (this.stepT <= 0) { this.stepT = 0.95; if (dist < 36) audio.play('porterStep', { pos: _v.set(this.pos.x, 0.2, this.pos.z), vol: 0.8 }); this.d.noise(this.pos.x, this.pos.z, 6, 'porter'); }
    }
  }

  // Leuchten in seiner Nähe werden unruhig
  _flicker() {
    const r = PORTIER.flickerRadius;
    for (const f of this.d.game.pool.fixtures) {
      if (f.owner || f.isFlare) continue;
      const near = Math.hypot(f.pos.x - this.pos.x, f.pos.z - this.pos.z) < r;
      if (near && !this.flickered.has(f)) { this.flickered.add(f); f._portierMode = f.mode; f.mode = 'dying'; }
      else if (!near && this.flickered.has(f)) { this.flickered.delete(f); f.mode = f._portierMode || 'steady'; }
    }
  }

  hit(kind) {
    const d = this.d;
    audio.play('hitMetal', { pos: this.chest.clone(), vol: 0.9 });
    audio.play('porterTick', { pos: this.chest.clone(), vol: 1 });
    d.game.sparks.burst(this.pos.x, 2.4, this.pos.z, 20, 1.8, 1.1);
    if (this.state === 'listen' || this.state === 'kill') return;
    this.resume = this.state === 'post' || this.state === 'round' ? 'pursue' : this.state;
    this.staggerFor = kind === 'shot' || kind === 'cannon' ? 1.5 : kind === 'hammer' ? 1.0 : 0.4;
    this.play(CLIP.hit, { fade: 0.1, loop: false });
    this.setState('stagger');
  }

  dispose() {
    for (const f of this.flickered) f.mode = f._portierMode || 'steady';
    if (this.state === 'kill') { this.d.player.frozen = false; this.d.player.lookTarget = null; }
    this.dressing.dispose();
    super.dispose();
  }
}
