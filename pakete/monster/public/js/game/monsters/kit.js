// Werkzeugkasten der neuen Monster (Tiefenstufen II–V): Figurenwahl (fertiges Modell oder Platzhalter),
// Körperprofile für monsterize, erste Begegnung (Kom, Vermittlerin, Kodex), kleine Helfer.
//
// Figuren: Solange ein Monster kein eigenes Modell hat, steht eine vorhandene Figur mit Zusätzen aus
// standin.js dafür ein. Sobald die KI zuhause public/assets/chars/npc_<id>.glb gebaut hat, hier in
// FINAL auf true setzen – dann lädt das Spiel das echte Modell und die Zusätze entfallen.

import * as THREE from 'three';
import { hasCharacter, preloadCharacters } from '../../gfx/characters.js';
import { PROFILES } from '../../gfx/monsterize.js';
import { ui } from '../../ui/ui.js';
import { voice } from '../../audio/voice.js';
import { unlockCodex } from '../documents.js';
import { PACK_KOM } from '../../story/lines-monster.js';

// ---------------------------------------------------------------- Figuren

// Fertige Modelle (npc_<id>.glb). false = noch nicht gebaut → Platzhalter.
export const FINAL = {
  falterin: false,
  zoellner: false,
  ertrunkene: false,
  nachsprecher: false,
  portier: false,
  hochkantor: false,
  buettel: false,
};

// Platzhalter je Art: vorhandene Figur (alle teilen das Skelett „game_engine“)
export const STANDIN = {
  falterin: ['hoerer'],
  zoellner: ['veit'],
  vorgaenger: ['crew_m', 'crew_f'],
  ertrunkene: ['crew_f', 'hoerer'],
  nachsprecher: ['crew_m'],
  portier: ['voss'],
  hochkantor: ['veit'],
  buettel: ['stumm'],
};

// Figur für eine Art wählen → { id, standin }
export function charFor(kind, rng = Math.random) {
  if (FINAL[kind] && hasCharacter(kind)) return { id: kind, standin: false };
  const list = STANDIN[kind] || ['crew_m'];
  const pick = list.filter(hasCharacter);
  const r = typeof rng === 'function' ? rng() : rng.next();
  return { id: pick.length ? pick[Math.floor(r * pick.length)] : null, standin: true };
}

// Alle Figuren, die die neuen Monster brauchen könnten (zum Vorladen während der Fahrt)
export function packCharIds(kinds = Object.keys(STANDIN)) {
  const ids = new Set();
  for (const k of kinds) {
    if (FINAL[k]) ids.add(k);
    for (const s of STANDIN[k] || []) ids.add(s);
  }
  return [...ids];
}

export function preloadPackChars(kinds) {
  return preloadCharacters(packCharIds(kinds)).catch(e => console.warn('Monster-Paket: Figuren fehlen', e));
}

// ---------------------------------------------------------------- Körperprofile (monsterize)
// Werte wie in gfx/monsterize.js: len = Streckung entlang des Knochens, rot = Zusatzdrehung (rad),
// twitch = Zuckstärke. Bei fertigen Modellen können die Profile schwächer ausfallen (siehe MODELLE.md).

export const PACK_PROFILES = {
  // Die Falterin: ausgezehrt, überlange Arme, Kopf in den Nacken gelegt, als lausche sie nach oben
  falterin: {
    bones: {
      upperarm_l: { len: 1.3 }, upperarm_r: { len: 1.3 },
      lowerarm_l: { len: 1.4 }, lowerarm_r: { len: 1.4 },
      hand_l: { len: 1.5 }, hand_r: { len: 1.5 },
      neck_01: { len: 1.35, rot: [-0.25, 0, 0] },
      head: { rot: [-0.3, 0, 0.2], twitch: 0.16 },
      spine_03: { rot: [-0.12, 0, 0] },
      thigh_l: { len: 1.12 }, thigh_r: { len: 1.12 }, calf_l: { len: 1.15 }, calf_r: { len: 1.15 },
    },
    twitchRate: 1.4,
  },
  // Der Zöllner: lang, gebeugt über seine Waage, der Kopf hängt nach vorn
  zoellner: {
    bones: {
      neck_01: { len: 1.3, rot: [0.35, 0, 0] },
      head: { rot: [0.3, 0, 0], twitch: 0.05 },
      spine_02: { rot: [0.12, 0, 0] }, spine_03: { rot: [0.16, 0, 0] },
      upperarm_l: { len: 1.12 }, upperarm_r: { len: 1.12 },
      lowerarm_l: { len: 1.15 }, lowerarm_r: { len: 1.15 },
      thigh_l: { len: 1.1 }, thigh_r: { len: 1.1 }, calf_l: { len: 1.12 }, calf_r: { len: 1.12 },
    },
    twitchRate: 0.2,
  },
  // Die Vorgänger: fast Menschen. Nur der Kopf ist ein wenig zu schwer.
  vorgaenger: {
    bones: { head: { rot: [0.22, 0, 0], twitch: 0.04 }, neck_01: { len: 1.05 } },
    twitchRate: 0.15,
  },
  // Die Ertrunkenen: Kopf im Nacken, Mund offen zum Wasser hin, lange Arme zum Greifen
  ertrunkene: {
    bones: {
      neck_01: { len: 1.25, rot: [-0.3, 0, 0] },
      head: { rot: [-0.35, 0, 0.35], twitch: 0.22 },
      upperarm_l: { len: 1.25 }, upperarm_r: { len: 1.25 },
      lowerarm_l: { len: 1.35 }, lowerarm_r: { len: 1.35 },
      hand_l: { len: 1.4 }, hand_r: { len: 1.4 },
    },
    twitchRate: 0.9,
  },
  // Der Nachsprecher als Mensch (Tarnung): nichts zu sehen
  nachsprecher: {
    bones: { neck_01: { len: 1.04 }, head: { rot: [0.05, 0, 0], twitch: 0.03 } },
    twitchRate: 0.1,
  },
  // Der Nachsprecher, wenn er sich zeigt: Kopf nach hinten gedreht, Hals wie ein Schlauch, Arme bis zum Knie
  nachsprecher_wahr: {
    bones: {
      neck_01: { len: 1.8, rot: [0.2, 0, 0] },
      head: { rot: [0.25, Math.PI, 0.45], twitch: 0.35 },
      spine_03: { rot: [0.3, 0, 0] },
      upperarm_l: { len: 1.4 }, upperarm_r: { len: 1.4 },
      lowerarm_l: { len: 1.5 }, lowerarm_r: { len: 1.5 },
      hand_l: { len: 1.6 }, hand_r: { len: 1.6 },
    },
    twitchRate: 2.2,
  },
  // Der Portier: steif wie ein Türpfosten; der Kopf ist ein Zifferblatt (Platzhalter: standin.js)
  portier: {
    bones: {
      spine_02: { rot: [-0.04, 0, 0] }, spine_03: { rot: [-0.05, 0, 0] },
      upperarm_l: { len: 1.08 }, upperarm_r: { len: 1.08 },
      lowerarm_l: { len: 1.1 }, lowerarm_r: { len: 1.1 },
    },
    twitchRate: 0,
  },
};

let profilesInstalled = false;
export function installProfiles() {
  if (profilesInstalled) return;
  profilesInstalled = true;
  for (const [k, v] of Object.entries(PACK_PROFILES)) if (!PROFILES[k]) PROFILES[k] = v;
}

// ---------------------------------------------------------------- Erste Begegnung

// Kodex-Einträge der neuen Wesen (Texte in story/lines-monster.js → PACK_CODEX)
const CODEX_OF = { falterin: 'falterin', zoellner: 'zoellner', vorgaenger: 'vorgaenger', ertrunkene: 'ertrunkene', nachsprecher: 'nachsprecher', portier: 'portier' };
const FIRST_LINE = { falterin: 'v_falterin_1', zoellner: 'v_zoellner_1', vorgaenger: 'v_vorg_1', ertrunkene: 'v_ertr_1', nachsprecher: 'v_ns_1', portier: 'v_portier_1' };

// Einmal pro Kampagne: Kodex, Dieters Kom-Zeile, ein Satz der Vermittlerin, Spannungsstoß
export function packFirstSight(d, kind) {
  const st = d.state;
  if (CODEX_OF[kind]) unlockCodex(st, CODEX_OF[kind]);
  const flags = st?.flags;
  if (!flags || flags['met_' + kind]) return false;
  flags['met_' + kind] = true;
  if (PACK_KOM['k_' + kind]) ui.komMessage(PACK_KOM['k_' + kind]);
  if (FIRST_LINE[kind]) voice.say(FIRST_LINE[kind], { delay: 0.8 });
  d.spike = Math.max(d.spike, 0.65);
  return true;
}

// ---------------------------------------------------------------- Helfer

const _p = new THREE.Vector3();

// Weltposition eines Knochens (nach der Animation)
export function boneWorld(ch, name, out = _p) {
  const b = ch.model.getObjectByName(name);
  if (!b) return out.copy(ch.root.position);
  return b.getWorldPosition(out);
}

// Winkel auf (−π, π] bringen
export function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Steht der Spieler in der Kabine?
export function playerInCab(d) { return d.elev.contains(d.player.pos); }

// Ein lebender, sichtbarer Spieler (nicht tot, nicht versteckt)
export function playerExposed(d) { const p = d.player; return !p.dead && !p.hidden; }

// Brennt die Lampe des Spielers? (0 … 1)
export function lampLevel(d) { return d.player.dead ? 0 : (d.player.lampLevel ?? 0); }

// Zeigt die Lampe auf einen Punkt? (Kegel + Sichtlinie)
const _lp = new THREE.Vector3(), _ld = new THREE.Vector3(), _q = new THREE.Vector3();
export function lampHits(d, p, rangeMul = 1) {
  const pl = d.player;
  if ((pl.lampLevel ?? 0) < 0.15) return false;
  pl.spot.getWorldPosition(_lp);
  pl.spotTarget.getWorldPosition(_ld).sub(_lp).normalize();
  _q.subVectors(p, _lp);
  const dist = _q.length();
  if (dist > pl.stats.lampRange * 0.85 * rangeMul) return false;
  if (_q.dot(_ld) / dist < Math.cos(pl.stats.lampAngle * 1.15)) return false;
  return d.grid.lineOfSight(_lp.x, _lp.z, p.x, p.z) && d.col.lineClear(_lp.x, _lp.z, p.x, p.z, Math.max(0.3, Math.min(p.y, _lp.y)));
}

// Zufälliges Element
export const pick = (arr, r = Math.random()) => arr[Math.floor(r * arr.length) % arr.length];
