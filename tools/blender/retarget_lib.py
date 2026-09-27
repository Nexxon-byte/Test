"""Retargeting-Kern: Knochenrichtungen der Quelle exakt auf das Ziel übertragen (T/A-Pose-unabhängig)."""
import bpy
from mathutils import Matrix, Vector


def world_rest(arm, name):
    return arm.matrix_world @ arm.data.bones[name].matrix_local


def bone_order(arm):
    order = []
    def walk(b):
        order.append(b.name)
        for c in b.children:
            walk(c)
    for b in arm.data.bones:
        if b.parent is None:
            walk(b)
    return order


def compute_offsets(src, dst, mapping):
    """dst_welt = src_welt · rs⁻¹ · R_ausr⁻¹ · rd  (R_ausr: Quell-Ruherichtung → Ziel-Ruherichtung)"""
    offsets = {}
    for s, d in mapping.items():
        if s not in src.data.bones or d not in dst.data.bones:
            continue
        bs, bd = src.data.bones[s], dst.data.bones[d]
        ds = (src.matrix_world @ bs.tail_local - src.matrix_world @ bs.head_local).normalized()
        dd = (dst.matrix_world @ bd.tail_local - dst.matrix_world @ bd.head_local).normalized()
        align = ds.rotation_difference(dd)
        rs = world_rest(src, s).to_quaternion()
        rd = world_rest(dst, d).to_quaternion()
        offsets[d] = (s, rs.inverted() @ align.inverted() @ rd)
    return offsets


def retarget_actions(src, dst, actions, mapping, hips_src='pelvis', hips_dst='pelvis', rename=None):
    """Backt jede Quell-Aktion als neue Aktion auf dst. Gibt die neuen Aktionen zurück."""
    scene = bpy.context.scene
    src.animation_data_create()
    dst.animation_data_create()
    for tr in list(src.animation_data.nla_tracks):
        src.animation_data.nla_tracks.remove(tr)
    for tr in list(dst.animation_data.nla_tracks):
        dst.animation_data.nla_tracks.remove(tr)
    for pb in dst.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    offsets = compute_offsets(src, dst, mapping)
    k = world_rest(dst, hips_dst).translation.z / max(1e-6, world_rest(src, hips_src).translation.z)
    order = bone_order(dst)
    dst_inv = dst.matrix_world.inverted()
    out = []
    for act in actions:
        name = rename(act.name) if rename else act.name
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
                    if bn == hips_dst:
                        sp = src.matrix_world @ src.pose.bones[s].matrix.translation
                        loc = dst_inv @ Vector((sp.x * k, sp.y * k, sp.z * k))
                    m = Matrix.Translation(loc) @ rot
                else:
                    m = base
                desired[bn] = m
                basis = rest_rel.inverted() @ p_mat.inverted() @ m
                pb.rotation_quaternion = basis.to_quaternion()
                pb.keyframe_insert('rotation_quaternion', frame=f, group=bn)
                if bn == hips_dst:
                    pb.location = basis.translation
                    pb.keyframe_insert('location', frame=f, group=bn)
        out.append(new)
    dst.animation_data.action = None
    src.animation_data.action = None
    return out


def push_nla(arm, actions):
    arm.animation_data_create()
    for a in actions:
        tr = arm.animation_data.nla_tracks.new()
        tr.name = a.name
        tr.strips.new(a.name, int(a.frame_range[0]), a)
