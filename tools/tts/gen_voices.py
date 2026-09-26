"""
TIEFER – Stimmerzeugung (Chatterbox Multilingual, MIT-Lizenz, läuft offline auf der CPU).

  python gen_voices.py                 # alle fehlenden Zeilen
  python gen_voices.py --only v_e0_    # nur IDs mit diesem Präfix
  python gen_voices.py --redo v_e0_hello

Ausgabe: public/audio/voice/<id>.ogg  (mono, 24 kHz, Vorbis)
Männliche Stimmen klonen eine Referenz (Thorsten-Voice, CC0), weibliche nutzen die Standardstimme.
Die Zeilen kommen aus tools/tts/lines.json  (erzeugt von: node tools/export-lines.mjs)
"""
import argparse, json, os, sys, time
import numpy as np
import torch

_orig_load = torch.load
def _cpu_load(*a, **k):
    k.setdefault("map_location", torch.device("cpu"))
    return _orig_load(*a, **k)
torch.load = _cpu_load
torch.set_num_threads(max(1, (os.cpu_count() or 4) - 2))

import librosa
import soundfile as sf
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "public", "audio", "voice")
REF = os.path.join(HERE, "refs")
os.makedirs(OUT, exist_ok=True)

# Sprecherprofile: ref = Referenzstimme (None = Standard), ex = Emotionsstärke, cfg, temp,
# pitch = Halbtöne (Nachbearbeitung), speed = Tempo-Faktor (Nachbearbeitung)
PROFILES = {
    "vermittlerin": dict(ref=None,                ex=0.40, cfg=0.50, temp=0.75, pitch=0.0,  speed=0.97),
    "margarete":    dict(ref=None,                ex=0.65, cfg=0.45, temp=0.80, pitch=0.0,  speed=1.00),
    "rauschen":     dict(ref=None,                ex=0.75, cfg=0.40, temp=0.85, pitch=0.0,  speed=1.00),
    "chor":         dict(ref=None,                ex=0.35, cfg=0.55, temp=0.70, pitch=-2.0, speed=0.92),
    "ilse":         dict(ref=None,                ex=0.55, cfg=0.45, temp=0.80, pitch=4.5,  speed=1.00),
    "puppe":        dict(ref=None,                ex=0.25, cfg=0.60, temp=0.60, pitch=4.0,  speed=0.95),
    "nia":          dict(ref=None,                ex=0.70, cfg=0.45, temp=0.80, pitch=3.0,  speed=1.03),
    "aksoy":        dict(ref=None,                ex=0.45, cfg=0.50, temp=0.75, pitch=-1.5, speed=1.00),
    "ada":          dict(ref=None,                ex=0.65, cfg=0.45, temp=0.80, pitch=-2.5, speed=1.03),
    "crew_f":       dict(ref=None,                ex=0.80, cfg=0.40, temp=0.85, pitch=-1.0, speed=1.05),
    "dieter":       dict(ref="male_sleepy.wav",   ex=0.55, cfg=0.45, temp=0.80, pitch=-2.0, speed=1.00),
    "voss":         dict(ref="male_amused.wav",   ex=0.70, cfg=0.40, temp=0.85, pitch=1.0,  speed=1.04),
    "veit":         dict(ref="male_neutral.wav",  ex=0.35, cfg=0.55, temp=0.70, pitch=-1.0, speed=0.93),
    "radio":        dict(ref="male_neutral.wav",  ex=0.30, cfg=0.60, temp=0.65, pitch=0.5,  speed=1.05),
    "kessler":      dict(ref="male.wav",          ex=0.55, cfg=0.45, temp=0.80, pitch=-3.0, speed=0.95),
    "brenner":      dict(ref="male_neutral.wav",  ex=0.45, cfg=0.50, temp=0.75, pitch=-0.5, speed=1.00),
    "vorarbeiter":  dict(ref="male_angry.wav",    ex=0.75, cfg=0.40, temp=0.85, pitch=1.0,  speed=1.05),
    "kantor":       dict(ref="male_neutral.wav",  ex=0.40, cfg=0.55, temp=0.70, pitch=2.0,  speed=1.00),
    "aurel":        dict(ref="male_whisper.wav",  ex=0.30, cfg=0.55, temp=0.70, pitch=-1.5, speed=0.92),
    "oskar":        dict(ref="male_sleepy.wav",   ex=0.65, cfg=0.45, temp=0.85, pitch=-4.0, speed=0.93),
    "crew_m":       dict(ref="male_angry.wav",    ex=0.80, cfg=0.40, temp=0.85, pitch=0.0,  speed=1.05),
}

def process(wav, sr, prof):
    y = wav.astype(np.float32)
    y, _ = librosa.effects.trim(y, top_db=38)
    if abs(prof["pitch"]) > 0.01:
        y = librosa.effects.pitch_shift(y, sr=sr, n_steps=prof["pitch"])
    if abs(prof["speed"] - 1.0) > 0.005:
        y = librosa.effects.time_stretch(y, rate=prof["speed"])
    peak = np.max(np.abs(y)) + 1e-9
    y = y / peak * 0.89
    pad = np.zeros(int(sr * 0.08), dtype=np.float32)
    return np.concatenate([pad, y, pad])

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--redo", default="")
    ap.add_argument("--speakers", default="")
    args = ap.parse_args()

    lines = json.load(open(os.path.join(HERE, "lines.json"), encoding="utf-8"))
    if args.only:
        pre = args.only.split(",")
        lines = [l for l in lines if any(l["id"].startswith(p) for p in pre)]
    if args.speakers:
        sp = set(args.speakers.split(","))
        lines = [l for l in lines if l["speaker"] in sp]
    todo = []
    for l in lines:
        path = os.path.join(OUT, l["id"] + ".ogg")
        if os.path.exists(path) and not (args.redo and l["id"].startswith(args.redo)):
            continue
        todo.append(l)
    print(f"{len(todo)} Zeilen zu erzeugen", flush=True)
    if not todo:
        return

    t0 = time.time()
    model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    print("Modell geladen in", round(time.time() - t0, 1), "s", flush=True)

    for i, l in enumerate(todo):
        prof = PROFILES.get(l["speaker"], PROFILES["vermittlerin"])
        ref = os.path.join(REF, prof["ref"]) if prof["ref"] else None
        if ref and not os.path.exists(ref):
            print("  Referenz fehlt:", ref, "– überspringe", l["id"], flush=True)
            continue
        t = time.time()
        try:
            kw = dict(language_id="de", exaggeration=prof["ex"], cfg_weight=prof["cfg"], temperature=prof["temp"])
            if ref:
                kw["audio_prompt_path"] = ref
            wav = model.generate(l["text"], **kw)
            y = process(wav.squeeze(0).cpu().numpy(), model.sr, prof)
            sf.write(os.path.join(OUT, l["id"] + ".ogg"), y, model.sr, format="OGG", subtype="VORBIS")
            print(f"[{i+1}/{len(todo)}] {l['id']} ({l['speaker']}) {round(len(y)/model.sr,1)}s in {round(time.time()-t,1)}s", flush=True)
        except Exception as e:
            print("  FEHLER", l["id"], e, flush=True)

if __name__ == "__main__":
    main()
