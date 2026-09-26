// Spielstand (Checkpoint pro Ebene) + Meta-Daten (Durchläufe, Enden, Kodex).

const SAVE_KEY = 'tiefer.save.v1';
const META_KEY = 'tiefer.meta.v1';

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return { ...fallback, ...JSON.parse(raw) };
  } catch { /* */ }
  return { ...fallback };
}
function write(key, obj) {
  try { localStorage.setItem(key, JSON.stringify(obj)); } catch { /* */ }
}

// ---- Checkpoint ------------------------------------------------------------

export function loadCheckpoint() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function saveCheckpoint(data) {
  write(SAVE_KEY, { ...data, savedAt: Date.now() });
}

export function clearCheckpoint() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* */ }
}

// ---- Meta (überlebt Neustarts: die Strichliste) ------------------------------

const META_DEFAULT = {
  runs: 0,            // begonnene Durchläufe
  deaths: 0,
  endings: [],        // 'A' | 'B' | 'C'
  docs: [],           // jemals gefundene Dokumente (für Extras)
  codex: [],
};

export const meta = read(META_KEY, META_DEFAULT);

export function saveMeta() { write(META_KEY, meta); }

export function metaAdd(listKey, id) {
  if (!meta[listKey].includes(id)) { meta[listKey].push(id); saveMeta(); }
}

// Die Strichliste im Haus des Erbauers
export function tallyCount() {
  return 46 + Math.max(0, meta.runs - 1);
}
