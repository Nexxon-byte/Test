"""Verkleinert Modell-Texturen: kleine Modelle auf 512 px, große auf 1024 px, JPEG-Qualität 80.
   tools/tts/.venv/Scripts/python tools/shrink-textures.py"""
import json, os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODELS = os.path.join(ROOT, 'public', 'assets', 'models')
man = json.load(open(os.path.join(MODELS, 'manifest.json'), encoding='utf-8'))
before = after = 0
for mid, e in man.items():
    limit = 512 if e.get('small') else 1024
    tex = os.path.join(MODELS, mid, 'textures')
    if not os.path.isdir(tex):
        continue
    for f in os.listdir(tex):
        p = os.path.join(tex, f)
        before += os.path.getsize(p)
        try:
            im = Image.open(p)
            w, h = im.size
            if max(w, h) > limit:
                s = limit / max(w, h)
                im = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
            if f.lower().endswith(('.jpg', '.jpeg')):
                im.convert('RGB').save(p, 'JPEG', quality=80, optimize=True)
            else:
                im.save(p, optimize=True)
        except Exception as ex:
            print('Fehler', p, ex)
        after += os.path.getsize(p)
print(f'{before/1e6:.1f} MB -> {after/1e6:.1f} MB')
