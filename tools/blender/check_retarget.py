"""Vergleicht Knochenrichtungen Quelle (UAL2) ↔ Ziel (anims_ge.glb) für einen Clip. blender -b -P check_retarget.py"""
import bpy, os
HERE = os.path.dirname(os.path.abspath(__file__))
CH = os.path.abspath(os.path.join(HERE, '..', '..', 'public', 'assets', 'chars'))
CLIP = 'Idle_FoldArms_Loop'
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
bpy.ops.import_scene.gltf(filepath=os.path.join(CH, 'ual2_mannequin.glb'))
src = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
src.name = 'SRC'
for t in list(src.animation_data.nla_tracks): src.animation_data.nla_tracks.remove(t)
src.animation_data.action = next(a for a in bpy.data.actions if a.name == CLIP)
before = set(bpy.data.actions)
bpy.ops.import_scene.gltf(filepath=os.path.join(CH, 'anims_ge.glb'))
dst = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE' and o != src)
for t in list(dst.animation_data.nla_tracks): dst.animation_data.nla_tracks.remove(t)
new = [a for a in bpy.data.actions if a not in before]
dst.animation_data.action = next(a for a in new if a.name.startswith(CLIP))
bpy.context.scene.frame_set(12)
def d(arm, b):
    pb = arm.pose.bones[b]
    return ((arm.matrix_world @ pb.tail) - (arm.matrix_world @ pb.head)).normalized()
for s, t in [('thigh_l', 'thigh_l'), ('calf_l', 'calf_l'), ('upperarm_l', 'upperarm_l'), ('lowerarm_l', 'lowerarm_l'), ('pelvis', 'pelvis'), ('spine_02', 'spine_02')]:
    a, b = d(src, s), d(dst, t)
    print(f'{s:12s} quelle {tuple(round(x, 2) for x in a)}  ziel {tuple(round(x, 2) for x in b)}  winkel {round(a.angle(b) * 57.3, 1)}°')
