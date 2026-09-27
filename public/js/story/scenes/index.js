// Szenen der Story-Kapitel (story/chapters.js → scene: '<name>').
// Jede Szene: constructor({ game, level, contract, chapter, rng }), setup(), arrive(), update(dt),
// targets() → [Vector3] für den Kom-Pfeil, done(items), settle(brought, state) → erfüllt?, dispose().

import { Saal13 } from './saal13.js';

export const SCENES = {
  saal13: Saal13,
};
