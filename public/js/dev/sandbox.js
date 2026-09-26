// Entwickler-Sandkasten: Kabine + generierte Ebene.  ?sandbox&theme=dock&seed=1
// Zusätze: &modules=all | &modules=flutlicht,salzkanone,panzergitter:2 · &stufe=3 (Seilstufe)
// Tasten: F Lampe · N Noclip · O Tor auf/zu · [ ] Tiefenhebel · B Rufglocke · L Flutlicht · K Salzkanone

import * as THREE from 'three';
import { Renderer } from '../gfx/renderer.js';
import { CollisionWorld } from '../world/collision.js';
import { Elevator } from '../world/elevator.js';
import { Player } from '../game/player.js';
import { input } from '../core/input.js';
import { LightPool } from '../gfx/lightpool.js';
import { Dust } from '../gfx/particles.js';
import { buildLevel } from '../world/levelbuild.js';
import { THEMES, applyThemeEnvironment } from '../world/themes.js';
import { MODULES } from '../world/cab.js';

export async function runSandbox() {
  await document.fonts.ready;
  const params = new URLSearchParams(location.search);
  const canvas = document.getElementById('game');
  const R = new Renderer(canvas);
  const col = new CollisionWorld();
  const elev = new Elevator(R, col);
  const player = new Player(R, col);
  const pool = new LightPool(R.scene, 8);
  const dust = new Dust(R.scene, 300);
  const hemi = new THREE.HemisphereLight(0x302838, 0x0a0806, 0.25);
  R.scene.add(hemi);

  const theme = THEMES[params.get('theme') || 'dock'];
  const seed = Number(params.get('seed') || 1);
  const t0 = performance.now();
  const level = buildLevel(R, col, theme, seed);
  console.log('Ebene gebaut in', Math.round(performance.now() - t0), 'ms', 'Zellen', level.grid.w, 'x', level.grid.h, 'Leuchten', level.fixtures.length);
  for (const f of level.fixtures) pool.add(f);
  applyThemeEnvironment(R, hemi, theme);
  elev.setOuterStyle(theme.outerDoors);

  // Module & Seilstufe
  const modParam = params.get('modules') || '';
  const mods = modParam === 'all' ? Object.keys(MODULES).map(id => [id, MODULES[id].max]) : modParam.split(',').filter(Boolean).map(m => { const [id, lv] = m.split(':'); return [id, Number(lv || 1)]; });
  for (const [id, lv] of mods) elev.setModule(id, lv);
  elev.setUnlockedStages(Number(params.get('stufe') || 2));
  elev.setDepthStage(1, true);

  elev.setDisplay('−2');
  elev.setNeedleDepth(2, true);
  elev.gateOpen = 1; elev.gateTarget = 1; elev.doorsOpen = 1; elev.doorsTarget = 1;
  elev._layoutGate(); elev._layoutOuter();
  player.teleport(0, 0, Math.PI);
  player.toggleLamp(true);

  input.attach(canvas);
  canvas.addEventListener('click', () => input.lock());
  window.__sb = { R, elev, player, pool, level, THREE, col };

  let last = performance.now();
  function frame(now) {
    // rAF-Zeitstempel kann vor „last“ liegen (langer Ladeblock) → nie negativ werden lassen
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (input.hit('KeyF')) player.toggleLamp();
    if (input.hit('KeyN')) player.noclip = !player.noclip;
    if (input.hit('KeyO')) { if (elev.doorsTarget > 0) elev.closeDoors(); else elev.openDoors(); }
    if (input.hit('BracketRight')) elev.stepDepthStage(1);
    if (input.hit('BracketLeft')) elev.stepDepthStage(-1);
    if (input.hit('KeyB')) elev.ringBell();
    if (input.hit('KeyL')) elev.setFlood(!elev.floodOn);
    if (input.hit('KeyK')) { elev.aimCannon(player.pos); elev.fireCannon(); }
    player.update(dt);
    elev.setRadarBlips([{ x: player.pos.x, z: player.pos.z, kind: 'crew' }, { x: Math.sin(now * 0.0003) * 14, z: 12 + Math.cos(now * 0.0003) * 6, kind: 'monster' }]);
    elev.update(dt);
    pool.update(dt, R.camera.position);
    for (const c of level.candles) c.scale.y = 0.07 * (0.85 + Math.sin(now * 0.011 + c.userData.phase) * 0.15);
    const lp = new THREE.Vector3(); player.spot.getWorldPosition(lp);
    const ld = new THREE.Vector3(); player.spotTarget.getWorldPosition(ld); ld.sub(lp).normalize();
    dust.update(dt, R.camera.position, lp, ld, player.lampLevel ?? 0);
    R.render(dt);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
