// Welten je Tiefenstufe: [Thema, Tiefe, Name]. Eigene Datei, damit Spiel, Aufträge und Tafeln
// dieselbe Tabelle benutzen, ohne sich gegenseitig zu importieren.

export const FLOORS = {
  1: [['dock', 2, 'Die Ladebucht'], ['scriptorium', 7, 'Das Skriptorium'], ['ossuary', 17, 'Das Beinhaus']],
  2: [['mine', 33, 'Bohrung Null']],
};

// Sonderwelten der Story-Aufträge (erst nach dem Auftrag frei betretbar)
export const STORY_FLOORS = {
  story13: ['banquet', 13, 'Der Saal der Vierzig'],
};

// Welten, die in dieser Stufe zur Wahl stehen (der Saal der Vierzig erst nach seinem Auftrag)
export function floorsFor(stage, state) {
  const list = [...(FLOORS[stage] || FLOORS[1])];
  if (stage === 1 && state?.flags?.story13) list.push(STORY_FLOORS.story13);
  return list;
}

// Tiefenstufe einer Welt (für Direktsprünge und Aufträge)
export function stageOfTheme(themeId) {
  for (const [k, list] of Object.entries(FLOORS)) if (list.some(f => f[0] === themeId)) return Number(k);
  for (const f of Object.values(STORY_FLOORS)) if (f[0] === themeId) return f[1] <= 17 ? 1 : 2;
  return 1;
}

export function floorOfTheme(themeId) {
  for (const list of Object.values(FLOORS)) { const f = list.find(x => x[0] === themeId); if (f) return f; }
  for (const f of Object.values(STORY_FLOORS)) if (f[0] === themeId) return f;
  return FLOORS[1][0];
}
