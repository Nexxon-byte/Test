// Maße der Lastkabine „Die Neunte“ – reine Daten, damit Generator und Kabine
// dieselben Zahlen benutzen, ohne sich gegenseitig zu importieren.
// Ursprung = Bodenmitte der Kabine, Tür zur +Z-Seite. 1 Einheit = 1 m.

export const CAB = {
  W: 5.0,            // Innenbreite (X)
  D: 4.0,            // Innentiefe (Z)
  H: 3.3,            // Innenhöhe
  WALL: 0.12,        // Wandstärke
  DOOR: 3.0,         // lichte Breite des Scherengitters
  DOOR_H: 2.7,       // Durchgangshöhe
  FRONT: 2.0,        // Innenkante der Frontwand (+Z)
  BACK: -2.0,        // Innenkante der Rückwand (−Z)
  LANDING_Z: 2.25,   // Wand des Absatzes mit dem Etagentor (= Zellgrenze im Generator)
  CELLS_X: 2,        // Die Kabine belegt 2 × 2 Generatorzellen …
  CELLS_Z: 2,
  LANDING_W: 4,      // … der Absatz davor 4 × 2 Zellen.
  LANDING_D: 2,
};

// Ebene der Gitterstäbe (knapp innerhalb der Frontwand)
CAB.GATE_Z = CAB.FRONT - 0.08;
// Anzeigetafel (Nixie) neben dem Etagentor auf der Seite des Absatzes – seitlich,
// weil über der Tür in niedrigen Welten (Mine: 3,2 m) kein Platz ist.
CAB.OUTER_PANEL_X = CAB.DOOR / 2 + 0.55;
CAB.OUTER_PANEL_Y = 2.3;

// Stellungen des Tiefenwahl-Hebels (Telegraf). 0 = oben am Markt, 1–6 = Tiefenstufen.
export const DEPTH_STAGES = [
  { label: 'OBEN', sub: 'MARKT NEUN', from: 0, to: 0 },
  { label: 'I', sub: '−2 … −17', from: 2, to: 17 },
  { label: 'II', sub: '−21 … −48', from: 21, to: 48 },
  { label: 'III', sub: '−55 … −77', from: 55, to: 77 },
  { label: 'IV', sub: '−88 … −111', from: 88, to: 111 },
  { label: 'V', sub: '−222 … −333', from: 222, to: 333 },
  { label: 'VI', sub: '−666', from: 666, to: 666 },
];

// Modulplätze, die Ada ausbauen kann (Stufe 0 = nicht eingebaut)
export const MODULES = {
  flutlicht:    { name: 'Flutlicht', max: 1 },
  salzkanone:   { name: 'Salzkanone', max: 1 },
  panzergitter: { name: 'Panzergitter', max: 2 },
  weihoel:      { name: 'Weihöl-Station', max: 1 },
  horchgeraet:  { name: 'Horchgerät', max: 1 },
  rufglocke:    { name: 'Rufglocke', max: 1 },
  lastregal:    { name: 'Lastregal', max: 1 },
  notstrom:     { name: 'Notstrom', max: 1 },
  kessel:       { name: 'Anselms Kessel', max: 1 },
  neon:         { name: 'Neon-Schriftzug', max: 1, cosmetic: true },
  radio:        { name: 'Radio', max: 1, cosmetic: true },
  pluesch:      { name: 'Plüsch-Heiliger', max: 1, cosmetic: true },
};
