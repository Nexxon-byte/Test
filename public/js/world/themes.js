// Welten-Themen: Architektur, Licht, Nebel, Farbe, Klang – und die Einrichtung.

import * as THREE from 'three';
import { CS, SOLID, FLOOR } from './levelgen.js';
import { P, off } from './props.js';
import { mat, glowMat } from '../gfx/materials.js';
import { iconTexture } from '../gfx/textures.js';

// Hilfen --------------------------------------------------------------------

function roomsOf(ctx, kind) { return ctx.rooms.filter(r => r.kind === kind); }
function innerCells(r, pad = 1) { return r.cells.filter(([x, z]) => x >= r.x0 + pad && x <= r.x1 - pad && z >= r.z0 + pad && z <= r.z1 - pad); }
function edgeCells(r) { return r.cells.filter(([x, z]) => x === r.x0 || x === r.x1 || z === r.z0 || z === r.z1); }

// Spinde/Beichtstühle entlang Wänden verteilen
function scatterHides(ctx, kind = 'locker', count = 5) {
  const { level, rng } = ctx;
  const slots = rng.shuffle(level.wallSlots(ctx.allCells(), 0.45).filter(s => level.isFree(...s.cell) && ctx.grid.dist[ctx.grid.idx(...s.cell)] > 2));
  let n = 0;
  const used = [];
  for (const s of slots) {
    if (n >= count) break;
    if (used.some(([x, z]) => Math.hypot(x - s.x, z - s.z) < 12)) continue;
    const info = P[kind](ctx.b, s.x, s.z, s.ry, rng);
    ctx.hide(info.hide);
    level.reserve(...s.cell);
    used.push([s.x, s.z]);
    n++;
  }
}

// Kreideschrift der Stummen an zufälligen Wänden
const CHALK = ['WIR SIND\nNICHT OBEN', 'EIN NAME IST\nEIN SCHLÜSSEL', 'SIE HÖRT ZU', 'NICHT TIEFER', 'WER HAT\nMEINE STIMME?', 'DAS SEIL HÄLT\nFRAG NICHT WORAN', '4 · 2 · 6 · 2 · 10 · 5', 'DU WARST\nSCHON HIER'];
function scatterChalk(ctx, n = 2, pool = CHALK) {
  const { level, rng } = ctx;
  const slots = rng.shuffle(level.wallSlots(ctx.allCells(), 0.02));
  for (let i = 0; i < n && i < slots.length; i++) {
    const s = slots[i];
    ctx.chalk(rng.pick(pool), s.x, rng.float(1.2, 1.9), s.z, s.ry, rng.float(1.3, 1.9));
  }
}

function standardGrade(g) { return { saturation: 0.85, contrast: 1.1, exposure: 1, ...g }; }

// ============================================================================

export const THEMES = {

  // --------------------------------------------------------------- −2 Ladebucht
  dock: {
    name: 'Die Ladebucht',
    gen: { style: 'halls', w: 26, h: 26, rooms: 4, minRoom: 6, maxRoom: 9, smallRooms: 5, corridor: 2, loops: 0.4 },
    height: 4.4, floor: 'concreteFloor', wall: 'concrete', ceiling: 'concrete',
    pilasters: 'concrete', pilasterEvery: 2, ribs: 'beam', ribMat: 'steel', portal: 'steel',
    surface: 'stone',
    lights: { type: 'sodium', color: 0xff9038, intensity: 8, distance: 11, spacing: 3, corridorSpacing: 4, dead: 0.35, dying: 0.2, flicker: 0.1 },
    fog: { color: 0x080402, density: 0.065 },
    ambient: { sky: 0x3a2412, ground: 0x050302, intensity: 0.28 },
    grade: standardGrade({ shadowTint: [0.035, 0.016, 0.0], highlightTint: [1.0, 0.88, 0.7], saturation: 0.8 }),
    music: 'spindel', reverb: [2.6, 0.45], reverbMix: 0.4,
    shaft: 'concrete', outerDoors: 'steel', hideKind: 'locker',
    decorate(ctx) {
      const { rng, level, b } = ctx;
      for (const hall of roomsOf(ctx, 'hall')) {
        // Säulenraster mit Nummern
        for (const [x, z] of innerCells(hall, 1)) {
          if ((x - hall.x0) % 3 === 1 && (z - hall.z0) % 3 === 1 && level.isFree(x, z)) {
            const [cx, cz] = ctx.center(x, z);
            P.pillarSquare(b, cx + CS / 2, cz + CS / 2, 0, rng, { h: ctx.theme.height });
          }
        }
        // Container, Lastwagen, Drohnen, Kisten
        const cells = rng.shuffle(innerCells(hall, 1).filter(([x, z]) => level.isFree(x, z)));
        let placed = 0;
        for (const [x, z] of cells) {
          if (placed > 6) break;
          const [cx, cz] = ctx.center(x, z);
          const r = rng.next();
          if (r < 0.2 && level.isFree(x + 1, z) && level.isFree(x - 1, z)) {
            P.container(b, cx, cz, 0, rng, { l: 5, stacked: rng.chance(0.3) });
            for (const dx of [-1, 0, 1]) ctx.block(x + dx, z);
          } else if (r < 0.35 && level.isFree(x, z + 1)) {
            const t = P.truck(b, cx, cz, rng.pick([0, Math.PI]), rng);
            ctx.block(x, z); ctx.block(x, z + 1);
            for (const [lx, lz] of t.lights) if (rng.chance(0.4)) ctx.fixture({ x: lx, y: 0.9, z: lz, type: 'sconce', color: 0xfff0c0, intensity: 2, distance: 6, mode: 'dying' });
          } else if (r < 0.55) { P.drone(b, cx, cz, rng.float(0, 6), rng); level.reserve(x, z); }
          else { for (let i = 0; i < rng.int(1, 3); i++) P.crate(b, cx + rng.float(-0.6, 0.6), cz + rng.float(-0.6, 0.6), rng.float(0, 1), rng); level.reserve(x, z); }
          placed++;
        }
        // gelbe Bodenmarkierungen
        const [hx0, hz0] = ctx.center(hall.x0, hall.z0), [hx1, hz1] = ctx.center(hall.x1, hall.z1);
        b.box(glowMat(0x806010, 0.08, 'paintYellow'), (hx0 + hx1) / 2, 0.006, hz0 - 0.9, hx1 - hx0 + 1.5, 0.01, 0.12);
        b.box(glowMat(0x806010, 0.08, 'paintYellow'), (hx0 + hx1) / 2, 0.006, hz1 + 0.9, hx1 - hx0 + 1.5, 0.01, 0.12);
      }
      // Kleine Räume: Paletten, Fässer, Spinde
      for (const r of roomsOf(ctx, 'room')) {
        for (const [x, z] of rng.shuffle(innerCells(r, 0)).slice(0, 3)) {
          if (!level.isFree(x, z)) continue;
          const [cx, cz] = ctx.center(x, z);
          if (rng.chance(0.5)) P.barrel(b, cx + rng.float(-0.5, 0.5), cz + rng.float(-0.5, 0.5), 0, rng);
          else P.pallet(b, cx, cz, rng.float(0, 3), rng);
          level.reserve(x, z);
        }
      }
      // Kabel an der Decke
      for (const c of rng.shuffle(ctx.corridorCells()).slice(0, 8)) {
        const [cx, cz] = ctx.center(...c);
        P.cables(b, cx - 1.2, cz - 0.6, cx + 1.2, cz + 0.6, ctx.theme.height - 0.3, 3, rng);
      }
      // Kirchliche Plakate & Neon
      const slots = rng.shuffle(level.wallSlots(ctx.allCells(), 0.02));
      if (slots[0]) ctx.poster({ title: 'DER STIMMZEHNT\nIST PFLICHT', lines: ['Wer gibt, wird singen.', 'Wer schweigt, verstummt.', '— Die Kanzlei —'] }, slots[0].x, 1.6, slots[0].z, slots[0].ry);
      if (slots[1]) ctx.poster({ title: 'PROKLAMATION', lines: ['Zum Achtzehnten Ruf', '594 n. F.', 'Die Erwählten werden', 'in Weiß gekleidet.'] }, slots[1].x, 1.6, slots[1].z, slots[1].ry);
      if (slots[2]) ctx.neon('LADEBUCHT 2', '#ff8a2a', slots[2].x, 3.2, slots[2].z, slots[2].ry, 2.4);
      scatterChalk(ctx, 3);
      scatterHides(ctx, 'locker', 5);
    },
  },

  // --------------------------------------------------------------- −7 Skriptorium
  scriptorium: {
    name: 'Das Skriptorium',
    gen: { style: 'halls', w: 28, h: 28, rooms: 4, minRoom: 7, maxRoom: 10, smallRooms: 5, corridor: 1, loops: 0.5 },
    height: 4.8, floor: 'woodPlanks', wall: 'plaster', ceiling: 'stoneDark', wainscot: 'woodPanel', wainscotH: 1.3,
    trim: 'wood', pilasters: 'stone', pilasterEvery: 2, ribs: 'x', ribMat: 'stone', arches: 'stone', portal: 'brassDark',
    surface: 'wood',
    lights: { type: 'tube', color: 0xc8ffdc, intensity: 6, distance: 9, spacing: 3, corridorSpacing: 3, dead: 0.3, mode: 'neon', flicker: 0.5, y: 3.6 },
    fog: { color: 0x020604, density: 0.07 },
    ambient: { sky: 0x1c2a22, ground: 0x040504, intensity: 0.25 },
    grade: standardGrade({ shadowTint: [0.0, 0.025, 0.015], highlightTint: [0.9, 1.0, 0.92], saturation: 0.75 }),
    music: 'spindel', reverb: [3.2, 0.35], reverbMix: 0.45,
    shaft: 'stone', outerDoors: 'brassDark', hideKind: 'locker',
    decorate(ctx) {
      const { rng, level, b, grid } = ctx;
      for (const hall of roomsOf(ctx, 'hall')) {
        // Regalreihen quer zur längeren Seite, Gänge dazwischen
        const alongX = (hall.x1 - hall.x0) >= (hall.z1 - hall.z0);
        const servers = rng.chance(0.4);
        for (const [x, z] of hall.cells) {
          if (x === hall.x0 || x === hall.x1 || z === hall.z0 || z === hall.z1) continue;
          const row = alongX ? (x - hall.x0) : (z - hall.z0);
          const col = alongX ? (z - hall.z0) : (x - hall.x0);
          const span = alongX ? (hall.z1 - hall.z0) : (hall.x1 - hall.x0);
          if (row % 2 !== 0 || col === Math.floor(span / 2)) continue;
          if (!level.isFree(x, z)) continue;
          const [cx, cz] = ctx.center(x, z);
          const ry = alongX ? Math.PI / 2 : 0;
          if (servers) {
            for (const o of [-0.85, 0, 0.85]) {
              const [sx, sz] = off(cx, cz, ry, o, 0);
              const r = P.serverRack(b, sx, sz, ry + (row % 4 === 0 ? 0 : Math.PI), rng);
              for (const c of r.candles) ctx.candle(c.pos[0], c.y + 0.08, c.pos[1], rng.chance(0.2));
            }
            if (rng.chance(0.3)) ctx.emit('servers', [cx, 1.2, cz]);
          } else P.shelf(b, cx, cz, ry, rng, { l: 2.4, h: 3.2 });
          ctx.block(x, z);
        }
      }
      // Schreibstuben
      for (const r of roomsOf(ctx, 'room')) {
        const cells = rng.shuffle(innerCells(r, 0).filter(([x, z]) => level.isFree(x, z)));
        for (const [x, z] of cells.slice(0, 2)) {
          const [cx, cz] = ctx.center(x, z);
          const d = P.desk(b, cx, cz, rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]), rng);
          if (d.top) ctx.candle(d.top.pos[0], d.top.y + 0.12, d.top.pos[1], true);
          level.reserve(x, z);
          (level.anchors.desks ||= []).push({ x: cx, z: cz, top: d.top, screen: d.screen });
        }
        if (cells[2]) { const [cx, cz] = ctx.center(...cells[2]); P.cylinderCart(b, cx, cz, rng.float(0, 3), rng); level.reserve(...cells[2]); }
      }
      // Heiligenbilder als Röhrenschirme an den Wänden
      const slots = rng.shuffle(level.wallSlots(ctx.allCells(), 0.02));
      for (let i = 0; i < 4 && i < slots.length; i++) {
        const s = slots[i];
        const m = ctx.decal(iconTexture(i % 2 ? 'ilse' : 'erbauer'), s.x, 2.2, s.z, s.ry, 0.7, 1.05, { emissive: 0.6, transparent: false });
        ctx.candle(s.x + Math.sin(s.ry) * 0.25, 1.35, s.z + Math.cos(s.ry) * 0.25, i === 0);
      }
      if (slots[5]) ctx.poster({ title: 'KANTOREI\nDES ZEHNTS', lines: ['Jede Stimme wird verzeichnet.', 'Jede Stimme wird bewahrt.', 'Keine Stimme geht verloren.'] }, slots[5].x, 1.8, slots[5].z, slots[5].ry);
      scatterChalk(ctx, 2);
      scatterHides(ctx, 'locker', 6);
    },
  },

  // --------------------------------------------------------------- −13 Saal der Vierzig
  banquet: {
    name: 'Der Saal der Vierzig',
    gen: { style: 'halls', w: 26, h: 28, rooms: 1, minRoom: 9, maxRoom: 11, smallRooms: 6, corridor: 1, loops: 0.6 },
    height: 6.2, floor: 'marbleChecker', wall: 'damask', ceiling: 'woodPanel', wainscot: 'woodPanel', wainscotH: 1.2,
    trim: 'gold', pilasters: 'marbleDark', pilasterEvery: 2, ribs: 'beam', ribMat: 'gold', arches: 'marbleDark', portal: 'gold',
    floorFn: (x, z, g) => (g.rooms.find(r => r.kind === 'hall' && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) ? 'carpet' : null),
    surface: 'carpet',
    lights: { type: 'bulb', color: 0xffb060, intensity: 5, distance: 10, spacing: 3, corridorSpacing: 3, dead: 0.3, mode: 'candle', y: 4.2 },
    fog: { color: 0x0a0302, density: 0.055 },
    ambient: { sky: 0x3a1a10, ground: 0x080202, intensity: 0.22 },
    grade: standardGrade({ shadowTint: [0.03, 0.005, 0.0], highlightTint: [1.0, 0.86, 0.66], saturation: 0.9, contrast: 1.12 }),
    music: 'sacred', reverb: [3.8, 0.4], reverbMix: 0.5,
    shaft: 'stone', outerDoors: 'gold', hideKind: 'confessional',
    decorate(ctx) {
      const { rng, level, b } = ctx;
      const hall = roomsOf(ctx, 'hall')[0];
      if (hall) {
        level.anchors.hall = hall;
        const w = hall.x1 - hall.x0 + 1, d = hall.z1 - hall.z0 + 1;
        const [hx0, hz0] = ctx.center(hall.x0, hall.z0);
        // Bühne am hinteren Ende
        const [sx, sz] = ctx.center(Math.floor((hall.x0 + hall.x1) / 2), hall.z1);
        P.stage(b, sx, sz - 0.4, Math.PI, rng, { w: Math.min(8, w * CS - 2), d: 3 });
        for (let x = hall.x0; x <= hall.x1; x++) ctx.block(x, hall.z1);
        level.anchors.stage = new THREE.Vector3(sx, 0.7, sz - 0.4);
        // Festtafeln
        const seats = [];
        const tables = Math.max(2, Math.floor((w - 1) / 3));
        for (let i = 0; i < tables; i++) {
          const tx = hall.x0 + 1 + i * 3;
          if (tx > hall.x1 - 1) break;
          const [cx] = ctx.center(tx, 0);
          const len = (d - 4) * CS;
          const [, cz] = ctx.center(0, hall.z0 + 1);
          const t = P.banquetTable(b, cx, cz + len / 2, 0, rng, { l: len });
          seats.push(...t.seats);
          for (const c of t.candles) if (rng.chance(0.7)) ctx.candle(c.pos[0], c.y, c.pos[1], rng.chance(0.25));
          for (let z = hall.z0 + 1; z <= hall.z0 + d - 3; z++) ctx.block(tx, z);
        }
        level.anchors.seats = seats;
        // Kronleuchter
        for (let i = 0; i < 3; i++) {
          const [cx, cz] = ctx.center(Math.floor((hall.x0 + hall.x1) / 2), hall.z0 + 1 + Math.floor(i * (d - 2) / 3));
          b.add(mat('gold'), new THREE.TorusGeometry(0.8, 0.04, 6, 24).toNonIndexed(), cx, ctx.theme.height - 1.6, cz, Math.PI / 2, 0, 0);
          b.cyl(mat('gold'), cx, ctx.theme.height - 1.6, cz, 0.01, 0.01, 1.6, 4);
          for (let k = 0; k < 8; k++) {
            const a = k / 8 * Math.PI * 2;
            ctx.candle(cx + Math.cos(a) * 0.8, ctx.theme.height - 1.5, cz + Math.sin(a) * 0.8, false);
          }
          ctx.fixture({ x: cx, y: ctx.theme.height - 1.7, z: cz, type: 'none', color: 0xffa050, intensity: 7, distance: 12, mode: 'candle', priority: 2 });
        }
        // Banner
        const [bx, bz] = ctx.center(Math.floor((hall.x0 + hall.x1) / 2), hall.z1);
        ctx.neon('ZUR ERSTEN FAHRT · 33 n. F.', '#ffcf7a', bx, 4.6, bz + CS / 2 - 0.08, Math.PI, 5, { flicker: 0.15, font: '600 60px "Cormorant Garamond", serif' });
      }
      // Nebenräume: Kerzenständer, Stühle, Spiegel
      for (const r of roomsOf(ctx, 'room')) {
        const cells = innerCells(r, 0).filter(([x, z]) => level.isFree(x, z));
        if (cells[0] && rng.chance(0.7)) {
          const [cx, cz] = ctx.center(...cells[0]);
          const s = P.candleStand(b, cx, cz, rng.float(0, 3), rng);
          for (const c of s.candles) ctx.candle(c.pos[0], c.y, c.pos[1], false);
          ctx.fixture({ x: cx, y: 1.3, z: cz, type: 'none', color: 0xff9a40, intensity: 2.5, distance: 6, mode: 'candle' });
          level.reserve(...cells[0]);
        }
      }
      scatterHides(ctx, 'confessional', 5);
    },
  },

  // --------------------------------------------------------------- −17 Beinhaus
  ossuary: {
    name: 'Das Beinhaus der Bruderschaft',
    gen: { style: 'rooms', w: 26, h: 26, rooms: 10, minRoom: 3, maxRoom: 5, corridor: 1, loops: 0.35 },
    height: 3.4, floor: 'stone', wall: 'stoneDark', ceiling: 'stoneDark', trim: null,
    pilasters: 'bone', pilasterEvery: 3, ribs: 'x', ribMat: 'bone', arches: 'bone', portal: 'bone',
    surface: 'stone',
    lights: { type: 'sconce', color: 0xff8a30, intensity: 3.5, distance: 7, spacing: 3, corridorSpacing: 4, dead: 0.5, mode: 'candle', y: 2.2 },
    fog: { color: 0x050302, density: 0.09 },
    ambient: { sky: 0x2a1a10, ground: 0x030201, intensity: 0.15 },
    grade: standardGrade({ shadowTint: [0.02, 0.012, 0.0], highlightTint: [1.0, 0.85, 0.65], saturation: 0.7, contrast: 1.15 }),
    music: 'sacred', reverb: [3.0, 0.3], reverbMix: 0.55,
    shaft: 'ossuary', outerDoors: 'rust', hideKind: 'coffinHide',
    decorate(ctx) {
      const { rng, level, b } = ctx;
      const slots = rng.shuffle(level.wallSlots(ctx.allCells(), 0.2));
      let niches = 0;
      for (const s of slots) {
        if (niches > 22) break;
        if (!level.isFree(...s.cell) || ctx.grid.dist[ctx.grid.idx(...s.cell)] < 2) continue;
        P.skullNiche(b, s.x, s.z, s.ry, rng);
        niches++;
      }
      for (const r of ctx.rooms.filter(r => r.kind === 'room')) {
        const cells = rng.shuffle(innerCells(r, 1).filter(([x, z]) => level.isFree(x, z)));
        for (const [x, z] of cells.slice(0, 2)) {
          const [cx, cz] = ctx.center(x, z);
          if (rng.chance(0.5)) P.coffin(b, cx, cz, rng.pick([0, Math.PI / 2]), rng, { open: rng.chance(0.3) });
          else P.bonePile(b, cx, cz, rng.float(0, 3), rng);
          level.reserve(x, z);
        }
        const c = innerCells(r, 0).find(([x, z]) => level.isFree(x, z));
        if (c && rng.chance(0.6)) {
          const [cx, cz] = ctx.center(...c);
          const s = P.candleStand(b, cx, cz, rng.float(0, 3), rng, { n: 9 });
          for (const k of s.candles) ctx.candle(k.pos[0], k.y, k.pos[1], false);
          ctx.fixture({ x: cx, y: 1.3, z: cz, type: 'none', color: 0xff8a30, intensity: 3, distance: 7, mode: 'candle' });
          level.reserve(...c);
        }
      }
      scatterChalk(ctx, 2, ['DAS SEIL HÄLT\nFRAG NICHT WORAN', 'WIR HALTEN\nDIE STADT OBEN', 'RUHE, BRÜDER', 'DU WARST\nSCHON HIER']);
      scatterHides(ctx, 'locker', 4);
    },
  },

  // --------------------------------------------------------------- Platzhalter (werden ausgebaut)
  mine: {
    name: 'Bohrung Null',
    gen: { style: 'tunnels', w: 30, h: 30, rooms: 8, minRoom: 2, maxRoom: 5, wiggle: 0.35, loops: 3 },
    height: 3.2, floor: 'salt', wall: 'salt', ceiling: 'rock', ribs: 'beam', ribMat: 'wood', portal: 'wood',
    surface: 'salt',
    lights: { type: 'bulb', color: 0xffc070, intensity: 5, distance: 8, spacing: 3, corridorSpacing: 3, dead: 0.3, y: 2.7 },
    fog: { color: 0x04060a, density: 0.07 },
    ambient: { sky: 0x2a3a4a, ground: 0x050505, intensity: 0.25 },
    grade: standardGrade({ shadowTint: [0.0, 0.01, 0.03], highlightTint: [0.9, 0.95, 1.0], saturation: 0.7 }),
    music: 'salt', reverb: [2.8, 0.55], reverbMix: 0.45,
    shaft: 'salt', outerDoors: 'rust', hideKind: 'locker',
    decorate(ctx) { scatterHides(ctx, 'locker', 5); },
  },
};

export function applyThemeEnvironment(R, hemi, theme) {
  R.scene.fog.color.setHex(theme.fog.color);
  R.scene.fog.density = theme.fog.density;
  R.scene.background.setHex(theme.fog.color);
  hemi.color.setHex(theme.ambient.sky);
  hemi.groundColor.setHex(theme.ambient.ground);
  hemi.intensity = theme.ambient.intensity;
  R.setGrade({
    saturation: theme.grade.saturation, contrast: theme.grade.contrast, exposure: theme.grade.exposure,
    shadowTint: new THREE.Color(...theme.grade.shadowTint), highlightTint: new THREE.Color(...theme.grade.highlightTint),
  });
}
