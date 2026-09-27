"""
Überträgt die Quaternius Universal Animation Libraries 1 + 2 (CC0) auf das MPFB-Skelett
„game_engine“ und exportiert alle Clips als public/assets/chars/anims_ge.glb.

  blender -b -P tools/blender/retarget_ual.py

Verfahren: pro Bild die Welt-Rotation jedes Quellknochens nehmen, mit dem Ruhelagen-Versatz
(Quelle → Ziel) verrechnen und als lokale Pose des Zielknochens setzen. Das Becken bekommt
zusätzlich die (auf die Größe skalierte) Position.
"""
import bpy, os
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHARS = os.path.join(ROOT, 'public', 'assets', 'chars')
OUT_GLB = os.path.join(CHARS, 'anims_ge.glb')

from bl_ext.blender_org.mpfb.services.humanservice import HumanService

# UAL 1: Rigify-DEF-Namen
MAP1 = {'DEF-hips': 'pelvis', 'DEF-spine.001': 'spine_01', 'DEF-spine.002': 'spine_02', 'DEF-spine.003': 'spine_03',
        'DEF-neck': 'neck_01', 'DEF-head': 'head'}
# UAL 2: UE-Namen (fast identisch)
MAP2 = {'pelvis': 'pelvis', 'spine_01': 'spine_01', 'spine_02': 'spine_02', 'spine_03': 'spine_03', 'neck_01': 'neck_01', 'Head': 'head'}
for s, d in (('L', 'l'), ('R', 'r')):
    MAP1.update({f'DEF-shoulder.{s}': f'clavicle_{d}', f'DEF-upper_arm.{s}': f'upperarm_{d}', f'DEF-forearm.{s}': f'lowerarm_{d}',
                 f'DEF-hand.{s}': f'hand_{d}', f'DEF-thigh.{s}': f'thigh_{d}', f'DEF-shin.{s}': f'calf_{d}',
                 f'DEF-foot.{s}': f'foot_{d}', f'DEF-toe.{s}': f'ball_{d}'})
    for n in ('clavicle', 'upperarm', 'lowerarm', 'hand', 'thigh', 'calf', 'foot', 'ball'):
        MAP2[f'{n}_{d}'] = f'{n}_{d}'
    for f in ('index', 'middle', 'pinky', 'ring'):
        for i in (1, 2, 3):
            MAP1[f'DEF-f_{f}.0{i}.{s}'] = f'{f}_0{i}_{d}'
            MAP2[f'{f}_0{i}_{d}'] = f'{f}_0{i}_{d}'
    for i in (1, 2, 3):
        MAP1[f'DEF-thumb.0{i}.{s}'] = f'thumb_0{i}_{d}'
        MAP2[f'thumb_0{i}_{d}'] = f'thumb_0{i}_{d}'

SOURCES = [('ual_mannequin.glb', MAP1, 'DEF-hips'), ('ual2_mannequin.glb', MAP2, 'pelvis')]

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()
for a in list(bpy.data.actions):
    bpy.data.actions.remove(a)

basemesh = HumanService.create_human()
dst = HumanService.add_builtin_rig(basemesh, 'game_engine')
dst.animation_data_create()
for pb in dst.pose.bones:
    pb.rotation_mode = 'QUATERNION'
order = []
def walk(b):
    order.append(b.name)
    for c in b.children:
        walk(c)
for b in dst.data.bones:
    if b.parent is None:
        walk(b)

def world_rest(arm, name):
    return arm.matrix_world @ arm.data.bones[name].matrix_local

scene = bpy.context.scene
dst_inv = dst.matrix_world.inverted()
exported = []
seen = set()

for fname, MAP, hips in SOURCES:
    before = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=os.path.join(CHARS, fname))
    src = next(o for o in bpy.context.selected_objects if o.type == 'ARMATURE') if any(o.type == 'ARMATURE' for o in bpy.context.selected_objects) else next(o for o in scene.objects if o.type == 'ARMATURE' and o != dst)
    for o in list(scene.objects):
        if o.type == 'MESH' and o != basemesh:
            bpy.data.objects.remove(o, do_unlink=True)
    src_actions = [a for a in bpy.data.actions if a not in before]
    for a in src_actions:
        a.name = '__src_' + a.name
    src.animation_data_create()
    # Der glTF-Import legt jede Animation als NLA-Spur an – die würden sich beim Auswerten mischen
    for tr in list(src.animation_data.nla_tracks):
        src.animation_data.nla_tracks.remove(tr)
    # Versatz so, dass der Zielknochen in dieselbe Welt-Richtung zeigt wie der Quellknochen
    # (unabhängig davon, ob die Ruhehaltungen T- oder A-Pose sind):
    #   dst = src_welt · rs⁻¹ · R_ausr⁻¹ · rd,   R_ausr dreht die Quell-Ruherichtung auf die Ziel-Ruherichtung
    offsets = {}
    for s, d in MAP.items():
        if s not in src.data.bones or d not in dst.data.bones:
            print('fehlt', fname, s, d); continue
        bs, bd = src.data.bones[s], dst.data.bones[d]
        ds = (src.matrix_world @ bs.tail_local - src.matrix_world @ bs.head_local).normalized()
        dd = (dst.matrix_world @ bd.tail_local - dst.matrix_world @ bd.head_local).normalized()
        align = ds.rotation_difference(dd)
        rs = world_rest(src, s).to_quaternion()
        rd = world_rest(dst, d).to_quaternion()
        offsets[d] = (s, rs.inverted() @ align.inverted() @ rd)
    k = world_rest(dst, 'pelvis').translation.z / max(1e-6, world_rest(src, hips).translation.z)
    print(fname, len(src_actions), 'Aktionen, Größenfaktor', round(k, 3))
    for act in src_actions:
        name = act.name.replace('__src_', '')
        if name in seen:
            name = name + '_2'
        seen.add(name)
        src.animation_data.action = act
        f0, f1 = int(act.frame_range[0]), int(act.frame_range[1])
        new = bpy.data.actions.new(name)
        new.use_fake_user = True
        dst.animation_data.action = new
        for f in range(f0, f1 + 1):
            scene.frame_set(f)
            desired = {}
            for bn in order:
                bone = dst.data.bones[bn]
                pb = dst.pose.bones[bn]
                parent = bone.parent
                rest_rel = (parent.matrix_local.inverted() @ bone.matrix_local) if parent else bone.matrix_local
                p_mat = desired.get(parent.name, parent.matrix_local) if parent else Matrix.Identity(4)
                base = p_mat @ rest_rel
                if bn in offsets:
                    s, off = offsets[bn]
                    sw = (src.matrix_world @ src.pose.bones[s].matrix).to_quaternion()
                    rot = (dst_inv.to_quaternion() @ (sw @ off)).to_matrix().to_4x4()
                    loc = base.translation.copy()
                    if bn == 'pelvis':
                        sp = src.matrix_world @ src.pose.bones[s].matrix.translation
                        loc = dst_inv @ Vector((sp.x * k, sp.y * k, sp.z * k))
                    m = Matrix.Translation(loc) @ rot
                else:
                    m = base
                desired[bn] = m
                basis = rest_rel.inverted() @ p_mat.inverted() @ m
                pb.rotation_quaternion = basis.to_quaternion()
                pb.keyframe_insert('rotation_quaternion', frame=f, group=bn)
                if bn == 'pelvis':
                    pb.location = basis.translation
                    pb.keyframe_insert('location', frame=f, group=bn)
        exported.append(new)
        print('  ✓', name, f1 - f0 + 1)
    for a in src_actions:
        bpy.data.actions.remove(a)
    bpy.data.objects.remove(src, do_unlink=True)

bpy.data.objects.remove(basemesh, do_unlink=True)
dst.animation_data.action = None
for a in exported:
    tr = dst.animation_data.nla_tracks.new()
    tr.name = a.name
    tr.strips.new(a.name, int(a.frame_range[0]), a)
bpy.ops.object.select_all(action='DESELECT')
dst.select_set(True)
bpy.context.view_layer.objects.active = dst
bpy.ops.export_scene.gltf(filepath=OUT_GLB, export_format='GLB', use_selection=True, export_animations=True,
                          export_animation_mode='NLA_TRACKS', export_skins=True, export_yup=True,
                          export_force_sampling=True, export_optimize_animation_size=True)
print('EXPORT', OUT_GLB, len(exported), 'Clips')
