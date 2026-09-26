// Entwickler-Sandkasten: Kabine + generierte Ebene.  ?sandbox&theme=dock&seed=1

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
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (input.hit('KeyF')) player.toggleLamp();
    if (input.hit('KeyN')) player.noclip = !player.noclip;
    player.update(dt);
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
