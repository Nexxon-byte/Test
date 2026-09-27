// Entwickler-Sandkasten: Kabine + generierte Ebene.  ?sandbox&theme=dock&seed=1
// Zusätze: &modules=all | &modules=flutlicht,salzkanone,panzergitter:2 · &stufe=3 (Seilstufe)
// Tasten: F Lampe · N Noclip · O Tor auf/zu · [ ] Tiefenhebel · B Rufglocke · L Flutlicht · K Salzkanone
// J Schachtfahrt abwärts starten / bremsen · U aufwärts (per JS: __sb.ride({ speed, style, from, … }), __sb.brake())

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
import { loadPBR } from '../gfx/materials.js';
import { loadModelManifest, preloadModels, modelIds, setModelEnvironment } from '../gfx/models.js';

export async function runSandbox(params = new URLSearchParams(location.search)) {
  await document.fonts.ready;
  if (!params.has('nopbr')) await Promise.all([loadPBR(), loadModelManifest().then(() => preloadModels(modelIds()))]);
  const canvas = document.getElementById('game');
  const R = new Renderer(canvas);
  setModelEnvironment(R.renderer);
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
  // Schachtfahrt zum Testen: Ebene ausblenden, Tor zu, losfahren (Optionen wie elev.startRide)
  let savedFx = null;
  const ride = (opts = {}) => {
    level.group.visible = false;
    if (!savedFx) { savedFx = pool.fixtures.slice(); pool.clear(); }
    elev.gateOpen = 0; elev.gateTarget = 0; elev.doorsOpen = 0; elev.doorsTarget = 0;
    elev._layoutGate(); elev._layoutOuter();
    elev.startRide({ speed: -5.5, from: 'concrete', style: theme.shaft || 'concrete', stage: 2, depth: 13, toLabel: '−13', home: true, ...opts });
  };
  const brake = () => elev.stopRide();
  const land = () => { elev.arrive(); level.group.visible = true; if (savedFx) { for (const f of savedFx) pool.add(f); savedFx = null; } };
  window.__sb = { R, elev, player, pool, level, THREE, col, ride, brake, land };

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
    if (input.hit('KeyJ') || input.hit('KeyU')) {
      if (elev.state === 'riding') brake();
      else if (elev.state === 'stopped') land();
      else ride(input.hit('KeyU') ? { speed: 6, from: theme.shaft || 'concrete', style: 'concrete', home: false, homeArrival: true, fromDepth: 13, depth: 0, fromLabel: '−13', toLabel: 'OBEN' } : {});
    }
    player.update(dt);
    elev.setRadarBlips([{ x: player.pos.x, z: player.pos.z, kind: 'crew' }, { x: Math.sin(now * 0.0003) * 14, z: 12 + Math.cos(now * 0.0003) * 6, kind: 'monster' }]);
    elev.update(dt);
    R.camera.position.y += elev.rideCam.y;
    R.camera.rotation.z += elev.rideCam.roll;
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
