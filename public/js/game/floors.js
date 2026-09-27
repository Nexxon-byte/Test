// Welten je Tiefenstufe: [Thema, Tiefe, Name]. Eigene Datei, damit Spiel, Aufträge und Tafeln
// dieselbe Tabelle benutzen, ohne sich gegenseitig zu importieren.

import { CHAPTERS, unlockedStoryFloors } from '../story/chapters.js';

export const FLOORS = {
  1: [['dock', 2, 'Die Ladebucht'], ['scriptorium', 7, 'Das Skriptorium'], ['ossuary', 17, 'Das Beinhaus']],
  2: [['mine', 33, 'Bohrung Null']],
};

// Sonderwelten der Story-Kapitel (story/chapters.js)
export const STORY_FLOORS = Object.fromEntries(CHAPTERS.map(c => [c.id, c.floor]));

// Welten, die in dieser Stufe zur Wahl stehen (Story-Welten erst nach ihrem Kapitel)
export function floorsFor(stage, state) {
  return [...(FLOORS[stage] || FLOORS[1]), ...unlockedStoryFloors(stage, state)];
}

// Tiefenstufe einer Welt (für Direktsprünge und Aufträge)
export function stageOfTheme(themeId) {
  for (const [k, list] of Object.entries(FLOORS)) if (list.some(f => f[0] === themeId)) return Number(k);
  const ch = CHAPTERS.find(c => c.floor[0] === themeId);
  return ch ? ch.stage : 1;
}

export function floorOfTheme(themeId) {
  for (const list of Object.values(FLOORS)) { const f = list.find(x => x[0] === themeId); if (f) return f; }
  for (const f of Object.values(STORY_FLOORS)) if (f[0] === themeId) return f;
  return FLOORS[1][0];
}
