// Einstellungen – gespeichert pro Browser.

const KEY = 'tiefer.settings.v1';

export const DEFAULTS = {
  name: '',
  sensitivity: 1.0,
  invertY: false,
  fov: 72,
  quality: 'standard',      // 'retro' | 'standard' | 'hoch'
  brightness: 1.0,          // Gamma-Korrektur
  masterVolume: 0.9,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  voiceVolume: 1.0,
  tts: true,                // Sprachausgabe der Vermittlerin
  subtitles: true,
  headBob: true,
  reduceFlashing: false,
  crouchToggle: false,
  micForListener: false,    // Mikrofon: Der Hörer hört dich
  voiceChat: false,
  pushToTalk: true,
  calibrated: false,
  seenWarning: false,
};

const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* privat oder blockiert */ }
  return { ...DEFAULTS };
}

export const settings = load();

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* egal */ }
  for (const fn of listeners) fn(settings);
}

export function setSetting(key, value) {
  settings[key] = value;
  saveSettings();
}

export function onSettings(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export const QUALITY = {
  retro:    { height: 400, shadow: 512,  lights: 5, bloom: true,  mirror: 192, dust: 150 },
  standard: { height: 540, shadow: 1024, lights: 8, bloom: true,  mirror: 256, dust: 300 },
  hoch:     { height: 760, shadow: 2048, lights: 10, bloom: true, mirror: 384, dust: 500 },
};
