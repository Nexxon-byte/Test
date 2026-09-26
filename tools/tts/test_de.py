import time, sys, os
import torch

# CPU-only Rechner: torch.load immer auf CPU abbilden
_orig_load = torch.load
def _cpu_load(*a, **k):
    k.setdefault("map_location", torch.device("cpu"))
    return _orig_load(*a, **k)
torch.load = _cpu_load
torch.set_num_threads(max(1, os.cpu_count() - 2))

import torchaudio
from chatterbox.mtl_tts import ChatterboxMultilingualTTS

out = os.path.join(os.path.dirname(__file__), "out")
os.makedirs(out, exist_ok=True)

t = time.time()
model = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
print("geladen in", round(time.time() - t, 1), "s", flush=True)

tests = [
    ("vermittlerin", "Vermittlung der Spindel. Kabine Neun, können Sie mich hören? Bleiben Sie ruhig. Wir holen Sie da heraus.", 0.5),
    ("fluestern", "Nicht tiefer. Bitte. Geh nicht tiefer.", 0.3),
]
for name, text, ex in tests:
    t = time.time()
    wav = model.generate(text, language_id="de", exaggeration=ex, cfg_weight=0.5)
    dur = wav.shape[-1] / model.sr
    print(name, "erzeugt in", round(time.time() - t, 1), "s für", round(dur, 1), "s Audio", flush=True)
    torchaudio.save(os.path.join(out, f"test_{name}.wav"), wav, model.sr)
print("fertig")
