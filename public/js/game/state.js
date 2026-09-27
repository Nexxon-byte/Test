// Kampagnen-Spielstand: Mannschaft, Konto, Quote, Woche/Nacht, Kabine, Story.

const KEY = 'tiefer.campaign.v2';

export const DIFFICULTY = {
  pilger:   { quota: 0.7, monster: 0.7, loot: 1.25, startMarks: 120, fail: 'debt' },
  ratte:    { quota: 1.0, monster: 1.0, loot: 1.0, startMarks: 60, fail: 'week' },
  erwaehlt: { quota: 1.3, monster: 1.3, loot: 0.85, startMarks: 30, fail: 'permadeath' },
};

// Quote der n-ten Zehntwoche
export function quotaFor(week, diff = 'ratte') {
  const base = 180 + (week - 1) * 140 + Math.pow(week - 1, 2) * 30;
  return Math.round(base * (DIFFICULTY[diff]?.quota ?? 1) / 10) * 10;
}

export function newCampaign(name, difficulty = 'ratte') {
  const d = DIFFICULTY[difficulty] || DIFFICULTY.ratte;
  return {
    version: 2,
    name,
    difficulty,
    crew: 47,
    marks: d.startMarks,
    week: 1,
    night: 0,                // abgeschlossene Nächte dieser Woche (0–3)
    quota: quotaFor(1, difficulty),
    sold: 0,                 // diese Woche bei der Kantorei verkauft
    stage: 1,                // freigeschaltete Seilstufe
    modules: {},             // Kabinenmodule id → Stufe
    tools: { lampe: 0, akku: 0, gurt: 0, sohlen: 0, lunge: 0 },
    consumables: {},         // id → Anzahl
    cargo: [],               // Beute in der Kabine (oben), noch nicht verkauft
    letters: 0,              // abgegebene Namensbuchstaben
    flags: { tutorial: true },
    docs: [], codex: [], keepsakes: [],
    stats: { nights: 0, deaths: 0, bestNight: 0, total: 0, lost: 0 },
    savedAt: Date.now(),
  };
}

export function loadCampaign() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.version === 2 ? s : null;
  } catch { return null; }
}

export function saveCampaign(s) {
  try { s.savedAt = Date.now(); localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* */ }
}

export function clearCampaign() {
  try { localStorage.removeItem(KEY); } catch { /* */ }
}

// Wie viele Buchstaben hat der Name (nur Buchstaben zählen)?
export function letterCount(name) { return [...name].filter(c => /\p{L}/u.test(c)).length; }

// Gnaden der Vermittlerin – jede kostet einen Buchstaben des Namens.
// night: gilt für die nächste Nacht · once: einmal pro Zehntwoche
export const GIFTS = {
  licht:      { title: 'Gnade des Lichts', text: 'Ihre Lampe verbraucht in der nächsten Nacht nichts. Kein Kurbeln. Kein Lärm.', night: true },
  stille:     { title: 'Gnade der Stille', text: 'Ihre Schritte sind in der nächsten Nacht lautlos. Das Ohr hört nur noch, was Sie wollen.', night: true },
  blick:      { title: 'Gnade des Blicks', text: 'Ihr Kom zeigt die ganze nächste Nacht alles Bergegut in Ihrer Nähe. Ohne zu fragen.', night: true },
  wiederkehr: { title: 'Gnade der Wiederkehr', text: 'Einmal, wenn die Nacht Sie nehmen will, halten wir Sie fest. Bei einem Atemzug.' },
  kanzlei:    { title: 'Gnade der Kanzlei', text: 'Die Quote dieser Zehntwoche sinkt um ein Viertel. Wir sprechen mit der Kanzlei. Sie hört auf uns.', once: true },
  tiefe:      { title: 'Gnade der Tiefe', text: 'Das Seil reicht eine Stufe tiefer, ohne dass Ada es verlängern muss. Unten warten wir.', max: 1 },
};

// Name mit abgegebenen Buchstaben (von hinten nach vorn verschwinden sie, zufällig verteilt aber stabil)
export function nameWithLetters(name, given) {
  const chars = [...name.toUpperCase()];
  const idx = chars.map((c, i) => i).filter(i => /\p{L}/u.test(chars[i]));
  // stabile Reihenfolge aus dem Namen selbst
  idx.sort((a, b) => ((a * 7919 + name.length * 31) % 97) - ((b * 7919 + name.length * 31) % 97));
  const gone = new Set(idx.slice(0, Math.min(given, idx.length)));
  return chars.map((c, i) => gone.has(i) ? '_' : c).join('');
}
