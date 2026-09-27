// Aus Menschen werden Monster: Knochen des „game_engine“-Skeletts nach jeder Animation verformen.
// Längen über Knochenskalierung entlang der Knochenachse (lokales Y), Haltung über Zusatzdrehungen,
// Unruhe über kleine, zufällige Zuckungen. Die Animationen laufen unverändert weiter.
//   const m = monsterize(character, 'hoerer');  …  jedes Frame nach character.update(dt): m.update(dt)

import * as THREE from 'three';

// len: Streckung entlang des Knochens · rot: [x, y, z] Zusatzdrehung (rad) · twitch: Zuckstärke
export const PROFILES = {
  // Der Hörer: blind, ausgemergelt, zu lange Glieder, Kopf horcht schief nach vorn
  hoerer: {
    bones: {
      upperarm_l: { len: 1.28 }, upperarm_r: { len: 1.28 },
      lowerarm_l: { len: 1.32 }, lowerarm_r: { len: 1.32 },
      hand_l: { len: 1.35 }, hand_r: { len: 1.35 },
      neck_01: { len: 1.55, rot: [0.35, 0, 0] },
      head: { rot: [0.25, 0, 0.42], twitch: 0.12 },
      spine_02: { rot: [0.22, 0, 0] }, spine_03: { rot: [0.18, 0, 0] },
      thigh_l: { len: 1.08 }, thigh_r: { len: 1.08 }, calf_l: { len: 1.1 }, calf_r: { len: 1.1 },
    },
    twitchRate: 0.9,
  },
  // Fahrgast: fast menschlich – nur der Kopf sitzt falsch und der Hals ist eine Spur zu lang
  fahrgast: {
    bones: {
      neck_01: { len: 1.18 },
      head: { rot: [0.05, 0, 0.55], twitch: 0.2 },
    },
    twitchRate: 0.25,
  },
};

const _q = new THREE.Quaternion(), _e = new THREE.Euler();

export function monsterize(character, profileName) {
  const prof = PROFILES[profileName];
  if (!prof) throw new Error('Monsterprofil fehlt: ' + profileName);
  const model = character.model;
  const entries = [];
  const lenOf = (b) => (b && prof.bones[b.name]?.len) || 1;
  for (const [name, cfg] of Object.entries(prof.bones)) {
    const bone = model.getObjectByName(name);
    if (!bone) continue;
    entries.push({ bone, cfg, sy: (cfg.len || 1) / lenOf(bone.parent), twitch: 0, target: 0, t: Math.random() * 3 });
  }
  // Kinder gestreckter Knochen erben die Streckung – ausgleichen, damit z. B. der Kopf nicht mitwächst
  model.traverse((b) => {
    if (!b.isBone || prof.bones[b.name] || lenOf(b.parent) === 1) return;
    entries.push({ bone: b, cfg: {}, sy: 1 / lenOf(b.parent) });
  });
  const state = {
    profile: prof, enabled: true,
    frozen: false,           // erstarrt: Zuckungen halten ihre Stellung
    update(dt) {
      if (!state.enabled) return;
      for (const e of entries) {
        const { bone, cfg } = e;
        if (e.sy !== 1) bone.scale.set(1, e.sy, 1);
        let rx = 0, ry = 0, rz = 0;
        if (cfg.rot) [rx, ry, rz] = cfg.rot;
        if (cfg.twitch) {
          // gelegentlich ruckartig ein neues Ziel, dazwischen fast Stillstand
          if (!state.frozen) {
            e.t -= dt;
            if (e.t <= 0) { e.target = (Math.random() * 2 - 1) * cfg.twitch; e.t = Math.random() * 2.5 / (prof.twitchRate || 0.5) + 0.05; }
            e.twitch += (e.target - e.twitch) * Math.min(1, dt * 22);
          }
          rz += e.twitch; rx += e.twitch * 0.4;
        }
        if (rx || ry || rz) bone.quaternion.multiply(_q.setFromEuler(_e.set(rx, ry, rz)));
      }
    },
  };
  return state;
}
