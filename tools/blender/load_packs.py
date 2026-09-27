# Blender headless: MakeHuman-Pakete in MPFB einspielen und Bestand auflisten
import bpy, os, glob, sys
here = os.path.dirname(os.path.abspath(__file__))
ops = [o for o in dir(bpy.ops.mpfb) if 'pack' in o.lower()]
print('MPFB-Operatoren mit pack:', ops)
for z in sorted(glob.glob(os.path.join(here, 'packs', '*.zip'))):
    try:
        bpy.ops.mpfb.load_pack(filepath=z)
        print('geladen', os.path.basename(z))
    except Exception as e:
        print('FEHLER', z, e)
from mpfb.services.locationservice import LocationService
for sub in ['clothes', 'hair', 'eyebrows', 'eyelashes', 'eyes', 'skins', 'teeth', 'proxymeshes']:
    d = LocationService.get_user_data(sub)
    names = sorted(os.listdir(d)) if os.path.isdir(d) else []
    print(sub, len(names), ':', ' '.join(names[:200]))
