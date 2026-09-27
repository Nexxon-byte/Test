// Geometrie-Baukasten: sammelt Grundkörper pro Material und verschmilzt sie
// zu wenigen Draw-Calls. UVs sind in Metern – Texturen haben so überall dieselbe Größe.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

// Quader mit Meter-UVs (nicht indiziert)
export function boxGeometry(sx, sy, sz) {
  const hx = sx / 2, hy = sy / 2, hz = sz / 2;
  const pos = [], nor = [], uv = [];
  const face = (a, b, c, d, n, w, h) => {
    // a b c d gegen den Uhrzeigersinn von außen gesehen
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    for (let i = 0; i < 6; i++) nor.push(...n);
    uv.push(0, 0, w, 0, w, h, 0, 0, w, h, 0, h);
  };
  face([-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz], [0, 0, 1], sx, sy);     // +Z
  face([hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz], [0, 0, -1], sx, sy); // -Z
  face([hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz], [1, 0, 0], sz, sy);      // +X
  face([-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz], [-1, 0, 0], sz, sy); // -X
  face([-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz], [0, 1, 0], sx, sz);      // +Y
  face([-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz], [0, -1, 0], sx, sz); // -Y
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// Rechteck (Wand/Boden) aus vier Eckpunkten, Normale aus Reihenfolge, UV in Metern
export function quadGeometry(a, b, c, d, uw, vh, u0 = 0, v0 = 0) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a, ...b, ...c, ...a, ...c, ...d], 3));
  const ab = new THREE.Vector3().subVectors(new THREE.Vector3(...b), new THREE.Vector3(...a));
  const ad = new THREE.Vector3().subVectors(new THREE.Vector3(...d), new THREE.Vector3(...a));
  const n = new THREE.Vector3().crossVectors(ab, ad).normalize();
  const nor = [];
  for (let i = 0; i < 6; i++) nor.push(n.x, n.y, n.z);
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([
    u0, v0, u0 + uw, v0, u0 + uw, v0 + vh, u0, v0, u0 + uw, v0 + vh, u0, v0 + vh,
  ], 2));
  return g;
}

function worldUV(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return geo;
}

export function cylGeometry(rt, rb, h, seg = 12, open = false) {
  const g = new THREE.CylinderGeometry(rt, rb, h, seg, 1, open).toNonIndexed();
  return worldUV(g, Math.PI * (rt + rb), h);
}

export function sphereGeometry(r, ws = 12, hs = 8) {
  const g = new THREE.SphereGeometry(r, ws, hs).toNonIndexed();
  return worldUV(g, Math.PI * 2 * r, Math.PI * r);
}

export function coneGeometry(r, h, seg = 12) {
  const g = new THREE.ConeGeometry(r, h, seg).toNonIndexed();
  return worldUV(g, Math.PI * 2 * r, h);
}

export function torusGeometry(r, tube, rs = 6, ts = 16, arc = Math.PI * 2) {
  const g = new THREE.TorusGeometry(r, tube, rs, ts, arc).toNonIndexed();
  return worldUV(g, Math.PI * 2 * r, Math.PI * 2 * tube);
}

// Spitzbogen-Profil (gotisch) als extrudierte Form
export function gothicArchGeometry(width, height, depth, thickness = 0.25) {
  const hw = width / 2;
  const springY = height - hw * 1.1;
  const outer = new THREE.Shape();
  outer.moveTo(-hw - thickness, 0);
  outer.lineTo(-hw - thickness, height + thickness * 0.8);
  outer.lineTo(hw + thickness, height + thickness * 0.8);
  outer.lineTo(hw + thickness, 0);
  outer.lineTo(hw, 0);
  outer.lineTo(hw, springY);
  outer.quadraticCurveTo(hw, height * 0.98, 0, height);
  outer.quadraticCurveTo(-hw, height * 0.98, -hw, springY);
  outer.lineTo(-hw, 0);
  outer.closePath();
  const g = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 8 }).toNonIndexed();
  g.translate(0, 0, -depth / 2);
  // planare UVs in Metern
  const pos = g.attributes.position, uv = g.attributes.uv, nor = g.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i));
    if (ax > 0.5) uv.setXY(i, pos.getZ(i), pos.getY(i));
    else if (ay > 0.5) uv.setXY(i, pos.getX(i), pos.getZ(i));
    else uv.setXY(i, pos.getX(i), pos.getY(i));
  }
  return g;
}

// ----------------------------------------------------------------------------

export class Builder {
  constructor() {
    this.buckets = new Map();   // material → [geometries]
    this.colliders = [];
  }

  add(material, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    _e.set(rx, ry, rz, 'YXZ');
    _q.setFromEuler(_e);
    _p.set(x, y, z);
    _s.set(sx, sy, sz);
    _m.compose(_p, _q, _s);
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(_m);
    if (!this.buckets.has(material)) this.buckets.set(material, []);
    this.buckets.get(material).push(g);
    return g;
  }

  addMatrix(material, geo, matrix) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(matrix);
    if (!this.buckets.has(material)) this.buckets.set(material, []);
    this.buckets.get(material).push(g);
  }

  // Quader: Position = Mittelpunkt
  box(material, x, y, z, sx, sy, sz, { ry = 0, rx = 0, rz = 0, collide = false } = {}) {
    this.add(material, boxGeometry(sx, sy, sz), x, y, z, rx, ry, rz);
    if (collide) this.colliderRotated(x, z, sx, sz, ry, y - sy / 2, y + sy / 2);
  }

  // Quader auf dem Boden (y = Unterkante)
  boxB(material, x, y, z, sx, sy, sz, opts = {}) {
    this.box(material, x, y + sy / 2, z, sx, sy, sz, opts);
  }

  cyl(material, x, y, z, rt, rb, h, seg = 12, { collide = false, rx = 0, rz = 0, ry = 0 } = {}) {
    this.add(material, cylGeometry(rt, rb, h, seg), x, y + h / 2, z, rx, ry, rz);
    if (collide) { const r = Math.max(rt, rb); this.collider(x - r, z - r, x + r, z + r, y, y + h); }
  }

  sphere(material, x, y, z, r, ws = 10, hs = 8, sx = 1, sy = 1, sz = 1) {
    this.add(material, sphereGeometry(r, ws, hs), x, y, z, 0, 0, 0, sx, sy, sz);
  }

  collider(minX, minZ, maxX, maxZ, minY = -1, maxY = 50) {
    this.colliders.push({ minX, minZ, maxX, maxZ, minY, maxY, enabled: true });
  }

  colliderRotated(x, z, sx, sz, ry, minY, maxY) {
    const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry));
    const hx = (sx * c + sz * s) / 2, hz = (sx * s + sz * c) / 2;
    this.collider(x - hx, z - hz, x + hx, z + hz, minY, maxY);
  }

  build({ castShadow = true, receiveShadow = true } = {}) {
    const group = new THREE.Group();
    for (const [material, geos] of this.buckets) {
      if (!geos.length) continue;
      const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
      if (!merged) { console.warn('Merge fehlgeschlagen für', material.name); continue; }
      merged.computeBoundingSphere();
      merged.computeBoundingBox();
      const mesh = new THREE.Mesh(merged, material);
      mesh.castShadow = castShadow && !material.userData.noShadow;
      mesh.receiveShadow = receiveShadow;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      group.add(mesh);
      for (const g of geos) if (g !== merged) g.dispose();
    }
    this.buckets.clear();
    return group;
  }
}

export function disposeGroup(obj) {
  obj.traverse((o) => {
    if (o.geometry && !o.userData.shared && !o.isInstancedMesh) o.geometry.dispose();
    if (o.isInstancedMesh) o.dispose?.();
    if (o.material && o.material.userData?.disposable) {
      if (o.material.map && o.material.map.userData?.disposable) o.material.map.dispose();
      o.material.dispose();
    }
  });
  if (obj.parent) obj.parent.remove(obj);
}
