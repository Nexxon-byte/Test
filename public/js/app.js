// TIEFER – Startablauf: Warnhinweis → Studio → Helligkeit → Titel (Hub als Kulisse) → Spiel.

import * as THREE from 'three';
import { Renderer } from './gfx/renderer.js';
import { input } from './core/input.js';
import { settings, onSettings } from './core/settings.js';
import { audio } from './audio/audio.js';
import { music } from './audio/music.js';
import { voice } from './audio/voice.js';
import { ui } from './ui/ui.js';
import * as menus from './ui/menus.js';
import { Game } from './game/game.js';
import { openJournal } from './ui/journal.js';
import { newCampaign, loadCampaign, saveCampaign } from './game/state.js';
import { INTRO_HYBRID } from './story/codex.js';
import { meta, saveMeta } from './core/save.js';
import { loadPBR } from './gfx/materials.js';
import { loadModelManifest, preloadModels, modelIds, setModelEnvironment } from './gfx/models.js';
import { preloadCharacters } from './gfx/characters.js';
import { HUB_CHARACTERS } from './world/hub.js';

const params = new URLSearchParams(location.search);

export async function boot() {
  await Promise.race([document.fonts.ready, new Promise(r => setTimeout(r, 2500))]);
  ui.init();
  const canvas = document.getElementById('game');
  const R = new Renderer(canvas);
  input.attach(canvas);
  window.__tiefer = { R };

  onSettings((s) => {
    R.camera.fov = s.fov; R.camera.updateProjectionMatrix();
  });

  // Fototexturen laden, während der Warnhinweis zu sehen ist
  const pbr = Promise.all([loadPBR(), loadModelManifest().then(() => preloadModels(modelIds())), preloadCharacters(HUB_CHARACTERS)]);
  if (!params.has('skip')) await menus.warning(); else audio.init();
  await pbr;
  setModelEnvironment(R.renderer);

  // Kulisse: das Spiel mit einem vorläufigen Stand, Kamera im Titelmodus
  const saved = loadCampaign();
  const game = new Game(R, saved || newCampaign(settings.name || 'Namenlos'));
  window.__tiefer.game = game;
  await game.loadHub({ spawn: 'cabin' });
  game.titleMode = true;
  ui.setHud(false);

  // Hauptschleife
  let last = performance.now();
  const frame = (now) => {
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    if (game.titleMode) game.updateTitle(dt);
    else if (!game.paused) game.update(dt);
    R.render(dt);
    input.endFrame();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  if (!params.has('skip')) {
    await menus.ident();
    if (!settings.calibrated) await menus.calibration();
  }

  music.setZone('menu');
  music.musicBox({ vol: 0.35, tempo: 72, wobble: 12 });

  // Pause über Esc (Pointer-Lock verloren)
  input.onUnlock = async () => {
    if (game.titleMode || game.busy || game.paused || document.querySelector('#doc.active')) return;
    game.paused = true;
    audio.setMuffle(900);
    const where = game.mode === 'night' ? `${game.nightInfo?.name ?? ''} · −${game.nightInfo?.depth ?? ''}<br>${game._clockText()}` : 'MARKT NEUN';
    for (;;) {
      const a = await menus.pause({ where });
      if (a === 'settings') { await menus.settingsPanel({ onChange: () => R.applyQuality() }); continue; }
      if (a === 'journal') { await openJournal(game, { fromPause: true }); continue; }
      if (a === 'quit') { saveCampaign(game.state); location.reload(); return; }
      break;
    }
    audio.setMuffle(22000);
    game.paused = false;
    input.lock();
  };
  canvas.addEventListener('click', () => { if (!game.titleMode && !game.busy) input.lock(); });

  // Entwicklung: direkt in eine Nacht (?skip&night=dock&seed=3&stufe=2&modules=flutlicht,salzkanone)
  if (params.has('night')) {
    const st = newCampaign('Prüfer', params.get('diff') || 'ratte');
    st.flags.tutorial = params.has('tutorial');
    st.flags.introDone = true;
    st.stage = Number(params.get('stufe') || 2);
    for (const m of (params.get('modules') || '').split(',').filter(Boolean)) { const [id, lv] = m.split(':'); st.modules[id] = Number(lv || 1); }
    // &contracts=spezial,wartung,vermisst,kirche,schwarz,bergung → für diese Welt angenommen
    if (params.get('contracts')) {
      const { devContract } = await import('./game/contracts.js');
      const { floorOfTheme, stageOfTheme } = await import('./game/floors.js');
      const th = params.get('night') || 'dock';
      st.contracts = params.get('contracts').split(',').filter(Boolean).map((k, i) => devContract(k, floorOfTheme(th), stageOfTheme(th), st, 11 + i));
    }
    game.adoptState(st);
    game.titleMode = false;
    await game.devNight(params.get('night') || 'dock', Number(params.get('seed') || 7));
    // &tools=flinte,fackel → gleich in die Taschen; &patronen=6
    st.consumables.patronen = Number(params.get('patronen') || 0);
    for (const t of (params.get('tools') || '').split(',').filter(Boolean)) game._pickup(game.deliver(t));
    return;
  }

  // Titel
  for (;;) {
    const cont = loadCampaign();
    const choice = await menus.title({ canContinue: !!cont, continueLabel: cont ? `Woche ${cont.week} · ${cont.marks} M` : '' });
    if (choice === 'settings') { await menus.settingsPanel({ onChange: () => R.applyQuality() }); continue; }
    if (choice === 'coop') { ui.toast('Die Koop-Lobby folgt in einem der nächsten Sprints.'); continue; }
    if (choice === 'extras') { ui.toast('Extras (Kodex, Enden, Abspann) folgen.'); continue; }
    if (choice === 'quit') { window.close(); continue; }
    let state;
    if (choice === 'continue' && cont) state = cont;
    else {
      const r = await menus.askName();
      if (!r) continue;
      state = newCampaign(r.name, r.difficulty);
      saveCampaign(state);
      meta.runs += 1; saveMeta();
    }
    menus.closeTitle();
    await ui.fade(1, 900);
    music.setZone('silence', 2);
    if (choice !== 'continue') await ui.intro(INTRO_HYBRID);
    game.adoptState(state);
    game.titleMode = false;
    await game.start();
    input.lock();
    break;
  }
}
