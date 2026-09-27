import bpy, sys
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.rigservice import RigService
basemesh = HumanService.create_human()
print('BASEMESH', basemesh.name)
import os
from bl_ext.blender_org.mpfb.services.locationservice import LocationService
rigdir = LocationService.get_mpfb_data('rigs')
print('RIGS', os.listdir(rigdir))
for sub in os.listdir(rigdir):
    p = os.path.join(rigdir, sub)
    print(sub, os.listdir(p) if os.path.isdir(p) else '')
