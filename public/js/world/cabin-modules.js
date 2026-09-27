// Modulplätze der Neunten: leere Montageplatten und die Module, die Ada einbaut.
// Jedes Modul liefert { group, colliders?, interactables?, update?(dt, elev), … }.
// Koordinaten wie in elevator.js: Ursprung = Bodenmitte, Tür bei +Z.

import * as THREE from 'three';
import { Builder, boxGeometry, cylGeometry, torusGeometry } from '../gfx/geo.js';
import { mat, glowMat } from '../gfx/materials.js';
import { textTexture, drawDialSymbol, glowTexture, neonSign } from '../gfx/textures.js';
import { damp } from '../core/rng.js';
import { CAB, MODULES } from './cab.js';

const HW = CAB.W / 2, DW = CAB.DOOR / 2, H = CAB.H;

// Blickrichtung der Platte (lokales +Z zeigt in den Raum)
const FACE = {
  back:  { ry: 0 },               // an der Rückwand, schaut nach +Z
  front: { ry: Math.PI },         // an der Frontwand, schaut nach −Z
  left:  { ry: Math.PI / 2 },     // an der linken Wand, schaut nach +X
  right: { ry: -Math.PI / 2 },    // an der rechten Wand, schaut nach −X
  down:  { rx: Math.PI / 2 },     // an der Decke, schaut nach unten
};

// Wo die leeren Montageplatten sitzen (auf der Stahlzone zwischen den Stoßleisten)
const SLOTS = {
  flutlicht:   [{ x: -1.22, y: 3.02, z: CAB.FRONT - 0.008, face: 'front', w: 0.36, h: 0.26 }, { x: 1.22, y: 3.02, z: CAB.FRONT - 0.008, face: 'front', w: 0.36, h: 0.26 }],
  salzkanone:  [{ x: -0.75, y: H - 0.006, z: 1.35, face: 'down', w: 0.5, h: 0.5 }],
  weihoel:     [{ x: -HW + 0.008, y: 1.29, z: 0.0, face: 'left', w: 0.45, h: 0.3 }],
  horchgeraet: [{ x: -1.65, y: 0.72, z: CAB.BACK + 0.008, face: 'back', w: 0.5, h: 0.4 }],
  rufglocke:   [{ x: -2.0, y: 2.85, z: CAB.FRONT - 0.008, face: 'front', w: 0.36, h: 0.28 }],
  lastregal:   [{ x: HW - 0.008, y: 1.29, z: -0.4, face: 'right', w: 0.45, h: 0.3 }],
  notstrom:    [{ x: 1.85, y: 0.72, z: CAB.BACK + 0.008, face: 'back', w: 0.5, h: 0.4 }],
  kessel:      [{ x: -HW + 0.008, y: 0.72, z: -1.15, face: 'left', w: 0.45, h: 0.4 }],
};

const stencilCache = new Map();
function stencil(label) {
  if (stencilCache.has(label)) return stencilCache.get(label);
  const t = textTexture(256, 180, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = 'rgba(230,220,195,0.85)'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '18px "Special Elite", monospace';
    g.fillText('MODULPLATZ', w / 2, 34);
    g.font = '700 30px "Special Elite", monospace';
    g.fillText(label.toUpperCase(), w / 2, 88, w - 30);
    g.font = '16px "Special Elite", monospace';
    g.fillText('— FREI · WERKSTATT BRENNER —', w / 2, 140, w - 20);
    const d = g.getImageData(0, 0, w, h);
    for (let i = 0; i < d.data.length; i += 4) if (d.data[i + 3] && ((i * 2654435761) >>> 0) / 4294967296 > 0.78) d.data[i + 3] *= 0.35;
    g.putImageData(d, 0, 0);
  });
  stencilCache.set(label, t);
  return t;
}

function orient(obj, face) {
  const f = FACE[face];
  obj.rotation.set(f.rx || 0, f.ry || 0, 0, 'YXZ');
}

// Leere Montageplatte mit vier Schrauben, Kabelstummel und Schablonenschrift
export function buildSlotPlate(id) {
  const list = SLOTS[id];
  if (!list) return null;
  const group = new THREE.Group();
  group.name = 'Platz_' + id;
  const label = MODULES[id].name;
  for (const s of list) {
    const g = new THREE.Group();
    const b = new Builder();
    b.box(mat('steel'), 0, 0, 0.006, s.w, s.h, 0.012);
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      b.add(mat('brassDark'), cylGeometry(0.016, 0.016, 0.014, 6), dx * (s.w / 2 - 0.035), dy * (s.h / 2 - 0.035), 0.016, Math.PI / 2, 0, 0);
    }
    b.box(mat('rubber'), s.w / 2 - 0.06, -s.h / 2 + 0.02, 0.025, 0.025, 0.025, 0.03);
    b.box(mat('brass'), s.w / 2 - 0.06, -s.h / 2 + 0.02, 0.045, 0.012, 0.012, 0.012);
    g.add(b.build({ castShadow: false }));
    const dec = new THREE.Mesh(new THREE.PlaneGeometry(s.w * 0.9, s.w * 0.9 * 180 / 256), new THREE.MeshStandardMaterial({ map: stencil(label), transparent: true, depthWrite: false, roughness: 0.9 }));
    dec.position.z = 0.0135;
    g.add(dec);
    g.position.set(s.x, s.y, s.z);
    orient(g, s.face);
    group.add(g);
  }
  return group;
}

// ----------------------------------------------------------------------------

const BUILDERS = {

  // Zwei Scheinwerfer unter dem Sturz, schräg hinaus auf den Absatz
  flutlicht(e) {
    const group = new THREE.Group();
    const b = new Builder();
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xfff0d0, emissiveIntensity: 0.05 });
    const y = 2.52, z = CAB.FRONT - 0.3;
    for (const x of [-1.22, 1.22]) {
      b.box(mat('steel'), x, 2.86, CAB.FRONT - 0.05, 0.3, 0.22, 0.02);
      b.box(mat('steel'), x, 2.7, CAB.FRONT - 0.15, 0.04, 0.3, 0.2, { rx: 0.5 });
      const head = new THREE.Group();
      const hb = new Builder();
      hb.box(mat('steel'), 0, 0, 0, 0.34, 0.22, 0.24);
      hb.box(mat('rust'), 0, 0, -0.14, 0.26, 0.16, 0.06);
      for (let i = -2; i <= 2; i++) hb.box(mat('steel'), i * 0.06, 0.13, -0.02, 0.012, 0.04, 0.2);
      hb.box(mat('hazard'), 0, -0.115, 0, 0.34, 0.01, 0.24);
      head.add(hb.build());
      const lens = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.17), lensMat);
      lens.position.z = 0.121;
      head.add(lens);
      head.position.set(x, y, z);
      head.rotation.x = 0.32;   // nach unten geneigt (lokales +Z zeigt zum Absatz)
      group.add(head);
    }
    // Kippschalter am rechten Frontpfeiler (unter AUFWÄRTS)
    const sx = DW + (HW - DW) / 2, sz = CAB.FRONT - 0.04;
    b.box(mat('steel'), sx, 0.78, sz, 0.18, 0.24, 0.05);
    b.box(mat('hazard'), sx, 0.93, sz - 0.02, 0.18, 0.05, 0.01);
    group.add(b.build());
    const switchLamp = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x60ff80, emissiveIntensity: 0 });
    const sl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), switchLamp);
    sl.position.set(sx + 0.05, 0.85, sz - 0.03);
    group.add(sl);
    const toggle = new THREE.Mesh(boxGeometry(0.02, 0.08, 0.02), mat('brass'));
    toggle.position.set(sx - 0.02, 0.76, sz - 0.04);
    group.add(toggle);

    const spot = new THREE.SpotLight(0xfff0d0, 0, 22, 0.72, 0.55, 1.3);
    spot.castShadow = false;
    spot.position.set(0, y, z);
    spot.target.position.set(0, 0, CAB.LANDING_Z + 6.5);
    group.add(spot, spot.target);
    if (e.floodOn === undefined) e.floodOn = true;
    let level = 0;
    return {
      group,
      interactables: [{ id: 'flutlicht', pos: new THREE.Vector3(sx, 0.78, sz - 0.05), radius: 0.2 }],
      update(dt, el) {
        const on = el.floodOn && el.powered;
        level = damp(level, on ? 1 : 0, on ? 3 : 10, dt);
        const buzz = on ? 0.96 + Math.sin(el.time * 100) * 0.02 : 1;
        spot.intensity = 140 * level * buzz;
        lensMat.emissiveIntensity = 0.05 + 3.2 * level;
        switchLamp.emissiveIntensity = on ? 2 : 0;
        toggle.rotation.x = on ? -0.5 : 0.5;
      },
      dispose() { spot.dispose(); },
    };
  },

  // Automatisches Salzgeschütz unter der Decke, schwenkt zum Gitter hin
  salzkanone(e) {
    const group = new THREE.Group();
    const x = -0.75, z = 1.35, y = 2.45;
    const b = new Builder();
    b.box(mat('steel'), x, H - 0.02, z, 0.5, 0.04, 0.5);
    b.cyl(mat('steel'), x, y + 0.14, z, 0.05, 0.05, H - y - 0.16, 8);
    b.cyl(mat('brassDark'), x, y + 0.1, z, 0.1, 0.1, 0.06, 12);
    group.add(b.build());
    const yaw = new THREE.Group();
    yaw.position.set(x, y, z);
    const yb = new Builder();
    yb.box(mat('steel'), 0, 0, 0, 0.3, 0.2, 0.4);
    yb.box(mat('hazard'), 0, 0.101, 0.05, 0.3, 0.004, 0.2);
    yb.cyl(mat('salt'), -0.05, 0.1, -0.08, 0.1, 0.07, 0.2, 10);   // Salztrichter
    yb.cyl(mat('steel'), -0.05, 0.3, -0.08, 0.105, 0.105, 0.02, 10);
    yb.box(mat('rubber'), 0.16, -0.02, -0.1, 0.03, 0.1, 0.12);
    yaw.add(yb.build());
    const barrel = new THREE.Group();
    const bb = new Builder();
    bb.add(mat('steel'), cylGeometry(0.045, 0.05, 0.36, 10), 0, 0, 0.18, Math.PI / 2, 0, 0);
    bb.add(mat('brass'), torusGeometry(0.05, 0.012, 5, 12), 0, 0, 0.35, 0, 0, 0);
    bb.add(mat('steel'), torusGeometry(0.05, 0.008, 4, 12), 0, 0, 0.12, 0, 0, 0);
    barrel.add(bb.build());
    barrel.position.set(0.02, -0.04, 0.2);
    yaw.add(barrel);
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xfff4e0, blending: THREE.AdditiveBlending, depthWrite: false }));
    flash.scale.set(0.5, 0.5, 1);
    flash.position.set(0.02, -0.04, 0.62);
    flash.visible = false;
    yaw.add(flash);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff3020, emissiveIntensity: 2 }));
    eye.position.set(-0.1, 0.02, 0.2);
    yaw.add(eye);
    group.add(yaw);
    let target = 0, cur = 0, cool = 0, recoil = 0, flashT = 0;
    const tmp = new THREE.Vector3();
    return {
      group,
      aim(world) {
        tmp.copy(world);
        e.group.worldToLocal(tmp);
        const a = Math.atan2(tmp.x - x, tmp.z - z);
        target = Math.max(-1.1, Math.min(1.1, a));
      },
      fire() {
        if (cool > 0) return false;
        cool = 1.4; recoil = 1; flashT = 0.08;
        return true;
      },
      update(dt) {
        cur = damp(cur, target, 5, dt);
        yaw.rotation.y = cur;
        cool = Math.max(0, cool - dt);
        recoil = Math.max(0, recoil - dt * 4);
        barrel.position.z = 0.2 - recoil * 0.08;
        flashT -= dt;
        flash.visible = flashT > 0;
        eye.material.emissiveIntensity = cool > 0 ? 0.3 : 1.5 + Math.sin(e.time * 4) * 0.5;
      },
    };
  },

  // Weihöl-Station: Wandschrank mit leuchtendem Ölballon, Zapfhahn, Verbände
  weihoel() {
    const group = new THREE.Group();
    const b = new Builder();
    const x = -HW + 0.25, y = 1.5, z = 0.0;
    b.box(mat('steel'), -HW + 0.14, y, z, 0.02, 0.62, 0.5);
    b.box(mat('walnut'), x, y - 0.3, z, 0.26, 0.03, 0.5);
    b.box(mat('walnut'), x, y + 0.3, z, 0.26, 0.04, 0.52);
    for (const dz of [-0.24, 0.24]) b.box(mat('brass'), x, y, z + dz, 0.26, 0.62, 0.02);
    b.box(mat('brass'), x + 0.13, y + 0.26, z, 0.01, 0.05, 0.5);
    b.cyl(mat('brass'), x, y - 0.28, z - 0.08, 0.03, 0.03, 0.06, 8);
    b.box(mat('brass'), x + 0.08, y - 0.2, z - 0.08, 0.1, 0.02, 0.02);
    b.box(mat('fabricWhite'), x - 0.02, y + 0.35, z + 0.12, 0.14, 0.06, 0.14);
    b.box(mat('fabricWhite'), x - 0.02, y + 0.41, z + 0.12, 0.12, 0.06, 0.12);
    b.cyl(mat('bone'), x, y + 0.32, z - 0.14, 0.03, 0.03, 0.1, 8);
    group.add(b.build());
    const oilMat = new THREE.MeshStandardMaterial({ color: 0x2a1604, emissive: 0xffa030, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1 });
    const jar = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), oilMat);
    jar.scale.set(1, 1.15, 1);
    jar.position.set(x, y + 0.02, z - 0.05);
    group.add(jar);
    const plaque = textTexture(128, 64, (g, w, h) => {
      g.fillStyle = '#1a1208'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#d9b36a'; g.textAlign = 'center'; g.font = '600 20px "Cormorant Garamond", serif';
      g.fillText('WEIHÖL', w / 2, 26);
      drawDialSymbol(g, w / 2, 56, 12, '#d9b36a', 0.3);
    });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.1), new THREE.MeshStandardMaterial({ map: plaque, roughness: 0.5, metalness: 0.4 }));
    pl.rotation.y = Math.PI / 2;
    pl.position.set(x + 0.136, y + 0.26, z + 0.12);
    group.add(pl);
    return {
      group,
      colliders: [{ minX: -HW, maxX: -HW + 0.4, minZ: z - 0.26, maxZ: z + 0.26, minY: 1.15, maxY: 1.85 }],
      interactables: [{ id: 'weihoel', pos: new THREE.Vector3(x + 0.12, y, z), radius: 0.35 }],
      update(dt, e) { oilMat.emissiveIntensity = 0.7 + Math.sin(e.time * 1.3) * 0.15; },
    };
  },

  // Horchgerät: Pult mit Radarschirm und Messing-Horchtrichter
  horchgeraet(e) {
    const group = new THREE.Group();
    const b = new Builder();
    const x = -1.65, z0 = CAB.BACK, d = 0.46, wdt = 0.9, h = 1.0;
    b.box(mat('steel'), x, h / 2, z0 + d / 2, wdt, h, d);
    b.box(mat('walnut'), x, h + 0.02, z0 + d / 2, wdt + 0.04, 0.04, d + 0.04);
    b.box(mat('hazard'), x, 0.06, z0 + d + 0.001, wdt, 0.12, 0.004);
    // schräges Schirmgehäuse
    b.box(mat('steel'), x, h + 0.26, z0 + 0.2, 0.62, 0.48, 0.32, { rx: -0.35 });
    for (let i = 0; i < 4; i++) b.add(mat('brass'), cylGeometry(0.022, 0.022, 0.03, 8), x - 0.3 + i * 0.2, h + 0.06, z0 + d - 0.06, Math.PI / 2 - 0.2, 0, 0);
    // Horchtrichter
    b.add(mat('brass'), cylGeometry(0.2, 0.03, 0.42, 16, true), x + 0.32, h + 0.72, z0 + 0.22, -0.4, 0, 0.5);
    b.cyl(mat('brassDark'), x + 0.42, h + 0.02, z0 + 0.15, 0.02, 0.02, 0.5, 6);
    group.add(b.build());
    const S = 128;
    const tex = textTexture(S, S, () => {});
    const scrMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.9 });
    const scr = new THREE.Mesh(new THREE.CircleGeometry(0.17, 28), scrMat);
    // Mitte der schrägen Gehäusefront + 6 mm nach außen (Gehäuse: rx −0,35, Tiefe 0,32)
    const tilt = -0.35, fy = 0.16 * -Math.sin(tilt), fz = 0.16 * Math.cos(tilt);
    scr.position.set(x, h + 0.26 + fy - Math.sin(tilt) * 0.006, z0 + 0.2 + fz + Math.cos(tilt) * 0.006);
    scr.rotation.x = tilt;
    group.add(scr);
    const part = {
      group, blips: [],
      colliders: [{ minX: x - wdt / 2, maxX: x + wdt / 2, minZ: z0, maxZ: z0 + d + 0.02 }],
      interactables: [{ id: 'horchgeraet', pos: new THREE.Vector3(x, h + 0.2, z0 + 0.5), radius: 0.4 }],
      _t: 0,
      update(dt, el) {
        part._t -= dt;
        if (part._t > 0) return;
        part._t = 0.1;
        const g = tex.canvas.getContext('2d'), c = S / 2, R = S / 2 - 4, range = 30;
        const on = el.powered;
        g.fillStyle = on ? 'rgba(2,16,6,0.55)' : '#010301';
        g.fillRect(0, 0, S, S);
        if (!on) { tex.needsUpdate = true; scrMat.emissiveIntensity = 0.2; return; }
        scrMat.emissiveIntensity = 0.9;
        g.strokeStyle = 'rgba(80,255,120,0.35)'; g.lineWidth = 1;
        for (const r of [R, R * 0.66, R * 0.33]) { g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); }
        g.beginPath(); g.moveTo(c - R, c); g.lineTo(c + R, c); g.moveTo(c, c - R); g.lineTo(c, c + R); g.stroke();
        const a = el.time * 2.2;
        g.strokeStyle = 'rgba(120,255,150,0.9)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.sin(a) * R, c - Math.cos(a) * R); g.stroke();
        for (const p of part.blips) {
          // Norden auf dem Schirm = Tür (+Z)
          const bx = c - (p.x / range) * R, by = c - (p.z / range) * R;
          if (Math.hypot(bx - c, by - c) > R) continue;
          g.fillStyle = p.kind === 'monster' ? '#ff5040' : '#90ffb0';
          g.beginPath(); g.arc(bx, by, p.kind === 'monster' ? 3.5 : 2.5, 0, Math.PI * 2); g.fill();
        }
        tex.needsUpdate = true;
      },
    };
    return part;
  },

  // Rufglocke an der linken Frontwand, mit Zugseil
  rufglocke() {
    const group = new THREE.Group();
    const b = new Builder();
    const x = -2.0, z = CAB.FRONT - 0.3, y = 2.95;
    b.box(mat('steel'), x, 2.85, CAB.FRONT - 0.02, 0.3, 0.3, 0.03);
    b.box(mat('steel'), x, y + 0.02, CAB.FRONT - 0.17, 0.05, 0.05, 0.32);
    b.box(mat('brassDark'), x, y - 0.02, z, 0.12, 0.05, 0.05);
    group.add(b.build());
    const bell = new THREE.Group();
    bell.position.set(x, y - 0.04, z);
    const prof = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      prof.push(new THREE.Vector2(0.05 + 0.13 * Math.pow(t, 1.8) + (t > 0.9 ? (t - 0.9) * 0.3 : 0), -t * 0.26));
    }
    const bellMat = mat('gold').clone();
    bellMat.side = THREE.DoubleSide;
    const bellMesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 16), bellMat);
    bellMesh.castShadow = true;
    bell.add(bellMesh);
    const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), mat('steel'));
    clapper.position.y = -0.22;
    bell.add(clapper);
    group.add(bell);
    const rb = new Builder();
    rb.cyl(mat('fabric'), x + 0.02, 1.62, z, 0.008, 0.008, y - 0.3 - 1.62, 4);
    rb.cyl(mat('wood'), x + 0.02, 1.52, z, 0.02, 0.02, 0.12, 8);
    group.add(rb.build());
    let swing = 0, phase = 0;
    return {
      group,
      interactables: [{ id: 'rufglocke', pos: new THREE.Vector3(x, 1.6, z), radius: 0.3 }],
      ring() { swing = 1; phase = 0; return true; },
      update(dt) {
        if (swing <= 0.001) { bell.rotation.x = 0; return; }
        phase += dt * 9;
        swing *= Math.exp(-dt * 0.9);
        bell.rotation.x = Math.sin(phase) * 0.45 * swing;
        clapper.position.z = Math.sin(phase - 0.6) * 0.06 * swing;
      },
    };
  },

  // Lastregal an der rechten Wand: drei Böden, Zurrgurte, Ablageplätze
  lastregal(e) {
    const group = new THREE.Group();
    const b = new Builder();
    const x0 = HW - 0.64, x1 = HW - 0.14, z0 = -1.25, z1 = 0.45, top = 1.9;
    const xc = (x0 + x1) / 2, zc = (z0 + z1) / 2;
    const steel = mat('steel');
    for (const x of [x0 + 0.02, x1 - 0.02]) for (const z of [z0 + 0.02, z1 - 0.02]) b.box(steel, x, top / 2, z, 0.04, top, 0.04);
    const shelves = [0.32, 0.95, 1.58];
    for (const y of shelves) {
      b.box(mat('woodPlanks'), xc, y, zc, x1 - x0, 0.04, z1 - z0);
      b.box(steel, x0, y + 0.03, zc, 0.03, 0.06, z1 - z0);
      b.box(mat('hazard'), x0 - 0.016, y + 0.03, zc, 0.004, 0.05, z1 - z0);
    }
    b.box(steel, x1 - 0.02, top / 2, zc, 0.01, top * 1.05, 0.03, { rx: 0.84 });
    b.box(steel, x1 - 0.02, top / 2, zc, 0.01, top * 1.05, 0.03, { rx: -0.84 });
    // Zurrgurte
    for (const y of shelves) for (const z of [z0 + 0.4, z1 - 0.4]) b.box(mat('fabricRed'), x0 - 0.01, y + 0.3, z, 0.01, 0.56, 0.04);
    // Schild
    const signTex = textTexture(256, 64, (g, w, h) => {
      g.fillStyle = '#c9a020'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#140c04'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '700 26px "Special Elite", monospace';
      g.fillText('LASTREGAL · GEZÄHLT', w / 2, h / 2);
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), new THREE.MeshStandardMaterial({ map: signTex, roughness: 0.8 }));
    sign.rotation.y = -Math.PI / 2;
    sign.position.set(x0 - 0.02, top - 0.05, zc);
    group.add(sign);
    group.add(b.build());
    e.shelfSlots = [];
    for (const y of shelves) for (const z of [z0 + 0.3, zc, z1 - 0.3]) e.shelfSlots.push(new THREE.Vector3(xc, y + 0.02, z));
    return {
      group,
      colliders: [{ minX: x0, maxX: HW, minZ: z0, maxZ: z1 }],
      dispose() { e.shelfSlots = []; },
    };
  },

  // Notstrom: Akkukasten mit Glaszellen, Messerschalter, Kabel zur Decke
  notstrom(e) {
    const group = new THREE.Group();
    const b = new Builder();
    const x = 1.85, z0 = CAB.BACK, w = 0.85, d = 0.6, h = 0.72;
    b.box(mat('wood'), x, h / 2, z0 + d / 2, w, h, d);
    b.box(mat('steel'), x, h + 0.01, z0 + d / 2, w + 0.02, 0.02, d + 0.02);
    for (const dx of [-1, 1]) for (const dz of [-1, 1]) b.box(mat('steel'), x + dx * (w / 2 - 0.02), h / 2, z0 + d / 2 + dz * (d / 2 - 0.02), 0.05, h + 0.02, 0.05);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const cx = x - 0.26 + i * 0.26, cz = z0 + 0.17 + j * 0.26;
      b.box(mat('rubber'), cx, h + 0.06, cz, 0.2, 0.1, 0.2);
      b.cyl(mat('brass'), cx - 0.05, h + 0.11, cz, 0.018, 0.018, 0.04, 6);
      b.cyl(mat('brass'), cx + 0.05, h + 0.11, cz, 0.018, 0.018, 0.04, 6);
    }
    b.box(mat('hazard'), x, h / 2, z0 + d + 0.002, w - 0.1, 0.12, 0.004);
    // Kabelbündel an der Rückwand zur Decke
    for (const dx of [-0.08, 0, 0.08]) b.box(mat('rubber'), x + 0.3 + dx, (h + H) / 2, z0 + 0.04, 0.035, H - h, 0.035);
    // Messerschalter an der Wand
    b.box(mat('walnut'), x - 0.1, 1.28, z0 + 0.03, 0.3, 0.26, 0.04);
    b.box(mat('brass'), x - 0.1, 1.3, z0 + 0.07, 0.03, 0.2, 0.02, { rx: 0.3 });
    group.add(b.build());
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x60ff90, emissiveIntensity: 1.5 });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), lampMat);
    lamp.position.set(x + 0.3, h - 0.1, z0 + d + 0.01);
    group.add(lamp);
    return {
      group,
      colliders: [{ minX: x - w / 2, maxX: x + w / 2, minZ: z0, maxZ: z0 + d }],
      update(dt, el) {
        const drawing = el.lightMode !== 'normal';
        lampMat.emissive.setHex(drawing ? 0xffa040 : 0x60ff90);
        lampMat.emissiveIntensity = drawing ? (Math.sin(el.time * 6) > 0 ? 2 : 0.3) : 1.5;
      },
    };
  },

  // Anselms Kessel: kleiner Eisenofen mit Topf und Ofenrohr
  kessel() {
    const group = new THREE.Group();
    const b = new Builder();
    const x = -HW + 0.4, z = -1.15, w = 0.5, h = 0.55;
    b.box(mat('steel'), x, h / 2, z, w, h, w);
    b.box(mat('rust'), x, h + 0.015, z, w + 0.04, 0.03, w + 0.04);
    for (let i = -2; i <= 2; i++) b.box(mat('steel'), x + w / 2 + 0.004, 0.2, z + i * 0.05, 0.01, 0.16, 0.012);
    b.cyl(mat('rust'), x, h + 0.03, z, 0.2, 0.17, 0.26, 14);
    b.cyl(mat('steel'), x, h + 0.29, z, 0.205, 0.205, 0.02, 14);
    b.cyl(mat('wood'), x, h + 0.31, z, 0.02, 0.02, 0.04, 6);
    b.add(mat('brassDark'), cylGeometry(0.01, 0.01, 0.5, 5), x + 0.12, h + 0.42, z + 0.1, 0.5, 0, -0.4);
    // Ofenrohr zur Decke
    b.cyl(mat('rust'), x - 0.12, h, z - 0.12, 0.06, 0.06, H - h, 10);
    group.add(b.build());
    const fireMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff6010, emissiveIntensity: 2 });
    const fire = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.14), fireMat);
    fire.rotation.y = Math.PI / 2;
    fire.position.set(x + w / 2 + 0.001, 0.2, z);
    group.add(fire);
    const steam = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0x807870, transparent: true, opacity: 0.25, depthWrite: false }));
    steam.scale.set(0.4, 0.5, 1);
    steam.position.set(x, h + 0.55, z);
    group.add(steam);
    return {
      group,
      colliders: [{ minX: -HW, maxX: x + w / 2, minZ: z - w / 2, maxZ: z + w / 2 }],
      interactables: [{ id: 'kessel', pos: new THREE.Vector3(x + 0.3, 0.8, z), radius: 0.4 }],
      update(dt, e) {
        fireMat.emissiveIntensity = 1.6 + Math.sin(e.time * 7.3) * 0.3 + Math.sin(e.time * 17.1) * 0.2;
        steam.position.y = 0.55 + 0.55 + ((e.time * 0.3) % 1) * 0.35;
        steam.material.opacity = 0.25 * (1 - ((e.time * 0.3) % 1));
      },
    };
  },

  // --------------------------------------------------------- Kosmetik

  neon() {
    const group = new THREE.Group();
    const tex = neonSign('Die Neunte', { color: '#ff4a9a', w: 512, h: 128, font: 'italic 600 78px "Cormorant Garamond", serif' });
    const m = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 2.2, color: 0x000000 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.375), m);
    sign.position.set(0, 2.8, CAB.BACK + 0.04);
    group.add(sign);
    const b = new Builder();
    b.box(mat('steel'), -0.6, 2.8, CAB.BACK + 0.02, 0.02, 0.2, 0.04);
    b.box(mat('steel'), 0.6, 2.8, CAB.BACK + 0.02, 0.02, 0.2, 0.04);
    group.add(b.build({ castShadow: false }));
    let off = 0;
    return {
      group,
      update(dt, e) {
        if (!e.powered) { m.emissiveIntensity = 0.05; return; }
        off -= dt;
        if (off < -3 && Math.random() < dt * 0.5) off = 0.1 + Math.random() * 0.2;
        m.emissiveIntensity = off > 0 ? (Math.random() < 0.5 ? 0.2 : 1.4) : 2.2;
      },
    };
  },

  radio() {
    const group = new THREE.Group();
    const b = new Builder();
    const x = 0.6, y = 1.385, z = CAB.BACK + 0.12;
    b.box(mat('walnut'), x, y + 0.11, z, 0.3, 0.22, 0.14);
    b.box(mat('fabric'), x - 0.05, y + 0.12, z + 0.071, 0.16, 0.14, 0.004);
    b.add(mat('brass'), cylGeometry(0.018, 0.018, 0.02, 8), x + 0.1, y + 0.08, z + 0.075, Math.PI / 2, 0, 0);
    b.add(mat('brass'), cylGeometry(0.018, 0.018, 0.02, 8), x + 0.1, y + 0.16, z + 0.075, Math.PI / 2, 0, 0);
    b.cyl(mat('steel'), x - 0.1, y + 0.22, z - 0.03, 0.004, 0.004, 0.35, 4, { rz: 0.4 });
    group.add(b.build());
    const dial = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.03), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffc060, emissiveIntensity: 1.2 }));
    dial.position.set(x + 0.1, y + 0.195, z + 0.071);
    group.add(dial);
    return { group, interactables: [{ id: 'radio', pos: new THREE.Vector3(x, y + 0.1, z + 0.1), radius: 0.25 }] };
  },

  pluesch() {
    const group = new THREE.Group();
    const b = new Builder();
    const x = -0.6, y = 1.385, z = CAB.BACK + 0.13;
    b.sphere(mat('fabricWhite'), x, y + 0.08, z, 0.08, 10, 8, 1, 1.1, 0.85);
    b.sphere(mat('fabricWhite'), x, y + 0.2, z, 0.06, 10, 8);
    b.sphere(mat('fabricWhite'), x - 0.07, y + 0.1, z + 0.03, 0.03, 6, 4, 1, 1.5, 1);
    b.sphere(mat('fabricWhite'), x + 0.07, y + 0.1, z + 0.03, 0.03, 6, 4, 1, 1.5, 1);
    b.sphere(mat('fabricWhite'), x - 0.04, y + 0.02, z + 0.06, 0.03, 6, 4);
    b.sphere(mat('fabricWhite'), x + 0.04, y + 0.02, z + 0.06, 0.03, 6, 4);
    b.sphere(mat('fabricBlack'), x - 0.02, y + 0.21, z + 0.055, 0.008, 5, 4);
    b.sphere(mat('fabricBlack'), x + 0.02, y + 0.21, z + 0.055, 0.008, 5, 4);
    b.add(mat('gold'), torusGeometry(0.075, 0.008, 4, 16), x, y + 0.22, z - 0.03, 0, 0, 0);
    group.add(b.build());
    return { group };
  },
};

export function buildModule(id, elev, level) {
  const fn = BUILDERS[id];
  if (!fn) return null;
  const part = fn(elev, level);
  part.group.name = 'Modul_' + id;
  return part;
}
