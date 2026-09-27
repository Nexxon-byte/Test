// Story-Kapitel = Goldene Aufträge der Kanzlei. Jedes Kapitel ist ein Eintrag hier (nur Daten)
// plus eine Szene in story/scenes/ (Aufbau im Level, Ablauf, Abschluss).
//
// Neues Kapitel anlegen:
//   1. Eintrag unten ergänzen (id, flag, stage, floor, available, title, text, reward, line, scene)
//   2. Szene in story/scenes/<name>.js schreiben (Vorlage: saal13.js) und in scenes/index.js eintragen
//   3. Sprechtexte in story/lines.js mit neuen IDs, dann `node tools/export-lines.mjs`
// Ein Kapitel ist erledigt, sobald state.flags[flag] gesetzt ist. unlocksFloor: danach ist die Welt
// auch für normale Nächte seiner Stufe wählbar.

export const CHAPTERS = [
  {
    id: 'story13', flag: 'story13', stage: 1, unlocksFloor: true,
    floor: ['banquet', 13, 'Der Saal der Vierzig'],
    // ab der zweiten Nacht (nach dem Tutorial)
    available: (st) => !st.flags.tutorial && (st.stats?.nights || 0) >= 1,
    title: 'Der Saal der Vierzig',
    text: 'Die Kanzlei will die Stimmreliquie aus dem Saal der Vierzig, −13. Der Schrein steht hinter der Bühne, wo die Getreuen ihr letztes Mahl hielten. Goldene Siegel – das zahlt die ganze Woche.',
    reward: 300,
    line: 'd_story_13',
    scene: 'saal13',
  },
  // Geplant (GAME_DESIGN §5.4): story33 Die Horchstation (−33) · story66 Das Archiv der Kantorin (−66)
  // · story99 Das Haus (−99) · story333 (−333) · Finale (−∞)
];

// Nächstes offenes Kapitel (in Reihenfolge der Liste)
export function nextChapter(state) {
  for (const c of CHAPTERS) {
    if (state.flags?.[c.flag]) continue;
    return c.available(state) && c.stage <= (state.stage || 1) ? c : null;
  }
  return null;
}

export function chapterById(id) { return CHAPTERS.find(c => c.id === id) || null; }

// Welten, die durch erledigte Kapitel frei geworden sind (für floors.js)
export function unlockedStoryFloors(stage, state) {
  return CHAPTERS.filter(c => c.unlocksFloor && c.stage === stage && state?.flags?.[c.flag]).map(c => c.floor);
}
