// Modell-Betrachter: ?viewer&set=chars | ?viewer&set=models&group=prop|hub|loot|tool
// Stellt Kandidaten im Spiel-Look nebeneinander auf (mit Namen), um Qualität und Stil zu prüfen.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Renderer } from '../gfx/renderer.js';
import { loadPBR, mat } from '../gfx/materials.js';
import { loadModelManifest, preloadModels, modelIds, cloneModel, setModelEnvironment } from '../gfx/models.js';

export async function runViewer(params) {
  await document.fonts.ready;
  const canvas = document.getElementById('game');
  const R = new Renderer(canvas);
  setModelEnvironment(R.renderer);
  await loadPBR();
  R.scene.fog.density = 0.02;
  R.scene.background.setHex(0x0b0a0e);
  R.setGrade({ exposure: 1.2, saturation: 0.95 });
  const set = params.get('set') || 'chars';
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 30), mat('stoneWet'));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
  const uv = floor.geometry.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 80, uv.getY(i) * 30);
  R.scene.add(floor);
  R.scene.add(new THREE.HemisphereLight(0x8a90b0, 0x201818, 0.6));
  const key = new THREE.DirectionalLight(0xffd0a0, 2.2); key.position.set(4, 8, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -30; key.shadow.camera.right = 30; key.shadow.camera.top = 10; key.shadow.camera.bottom = -5;
  R.scene.add(key);
  const rim = new THREE.DirectionalLight(0x6090ff, 1.4); rim.position.set(-6, 4, -6); R.scene.add(rim);

  const items = [];
  const mixers = [];
  if (set === 'npcs') {
    const C = await import('../gfx/characters.js');
    let names = (params.get('only') || 'dieter').split(',');
    await C.preloadCharacters([...new Set(names)]);
    // clips=a,b,c → eine Figur je Clip (zum Vergleichen)
    const clipList = params.get('clips') ? params.get('clips').split(',') : null;
    if (clipList && names.length === 1) names = clipList.map(() => names[0]);
    for (let i = 0; i < names.length; i++) {
      const n = names[i];
      const clipName = clipList ? clipList[i % clipList.length] : (params.get('clip') || 'Idle_Loop');
      const ch = new C.Character(n);
      ch.play(clipName);
      ch.randomize();
      const mon = params.get('monster') ? (await import('../gfx/monsterize.js')).monsterize(ch, params.get('monster')) : null;
      mixers.push({ update: (dt) => { ch.update(dt); mon?.update(dt); } });
      items.push({ obj: ch.root, name: `${n} · ${clipName}`, w: 1.1 });
    }
    window.__clips = C.clipNames();
  } else if (set === 'chars') {
    const man = await (await fetch('assets/chars/manifest.json')).json();
    const loader = new GLTFLoader();
    const names = params.get('only') ? params.get('only').split(',') : Object.keys(man);
    for (const n of names) {
      const g = await loader.loadAsync(man[n].file);
      g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      const box = new THREE.Box3().setFromObject(g.scene);
      const s = 1.75 / (box.max.y - box.min.y);
      g.scene.scale.setScalar(s);
      const root = new THREE.Group(); root.add(g.scene);
      const mixer = new THREE.AnimationMixer(g.scene);
      const clip = g.animations.find(a => /Idle$|\|Idle$/.test(a.name)) || g.animations[0];
      if (clip) mixer.clipAction(clip).play();
      mixers.push(mixer);
      items.push({ obj: root, name: n + ` (${g.animations.length})`, w: 1.3 });
    }
  } else {
    await loadModelManifest();
    const ids = params.get('only') ? params.get('only').split(',') : modelIds(params.get('group') || 'prop');
    await preloadModels(ids);
    for (const id of ids) { const o = cloneModel(id); if (o) { const b = new THREE.Box3().setFromObject(o); items.push({ obj: o, name: id, w: Math.max(0.6, b.max.x - b.min.x) + 0.4 }); } }
  }
  // Reihen aufstellen
  const perRow = Number(params.get('row') || 8);
  let x = 0, z = 0, row = 0, rowW = [];
  items.forEach((it, i) => { if (i % perRow === 0 && i) { rowW.push(x); x = 0; row++; } it.row = row; it.x = x + it.w / 2; x += it.w; });
  rowW.push(x);
  const labels = document.createElement('div');
  labels.style.cssText = 'position:fixed;inset:0;pointer-events:none;font:12px monospace;color:#9f9';
  document.body.appendChild(labels);
  for (const it of items) {
    it.obj.position.set(it.x - rowW[it.row] / 2, 0, -it.row * 3.2);
    R.scene.add(it.obj);
    const l = document.createElement('div'); l.textContent = it.name; l.style.cssText = 'position:absolute;transform:translateX(-50%);background:#000a;padding:1px 4px';
    labels.appendChild(l); it.label = l;
  }
  const maxW = Math.max(...rowW);
  R.camera.position.set(0, 2.2 + row * 0.8, Math.max(4, maxW * 0.55) + 1);
  R.camera.lookAt(0, 0.8, -row * 1.6);
  window.__viewer = { R, items };
  let last = performance.now();
  const loop = (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)); last = now;
    for (const m of mixers) m.update(dt);
    for (const it of items) {
      const p = it.obj.position.clone().setY(-0.05).project(R.camera);
      it.label.style.left = ((p.x * 0.5 + 0.5) * innerWidth) + 'px';
      it.label.style.top = ((-p.y * 0.5 + 0.5) * innerHeight) + 'px';
    }
    R.render(dt);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
