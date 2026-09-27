"""
Baut Figuren aus tools/blender/npcs.json mit MPFB (MakeHuman, CC0) + Skelett „game_engine“
und exportiert je Figur public/assets/chars/npc_<id>.glb (ohne Animationen – die kommen aus anims_ge.glb).

  blender -b -P tools/blender/make_npcs.py -- [id id …]
"""
import bpy, os, sys, json

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'public', 'assets', 'chars')
SPEC = json.load(open(os.path.join(HERE, 'npcs.json'), encoding='utf-8'))
only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

from bl_ext.blender_org.mpfb.services.humanservice import HumanService
sys.path.insert(0, HERE)
import retarget_lib as RL

CLIPSETS = {
    'merchant': ['Idle_Loop', 'Idle_Talking_Loop', 'Idle_FoldArms_Loop', 'Idle_Rail_Loop', 'Idle_Rail_Call', 'Idle_No_Loop', 'Yes', 'Interact',
                 'Idle_TalkingPhone_Loop', 'Walk_Loop', 'Walk_Formal_Loop', 'Sitting_Idle_Loop', 'Sitting_Talking_Loop', 'Fixing_Kneeling',
                 'Spell_Simple_Idle_Loop', 'Consume', 'PickUp_Table', 'Chest_Open', 'Idle_Lantern_Loop'],
    'crew': ['Idle_Loop', 'Idle_Torch_Loop', 'Idle_Lantern_Loop', 'Walk_Loop', 'Jog_Fwd_Loop', 'Sprint_Loop', 'Crouch_Idle_Loop', 'Crouch_Fwd_Loop',
             'Walk_Carry_Loop', 'Interact', 'PickUp_Table', 'OverhandThrow', 'Death01', 'Hit_Chest', 'Hit_Knockback', 'LayToIdle', 'Punch_Cross',
             'Sword_Attack', 'Pistol_Idle_Loop', 'Pistol_Aim_Neutral', 'Pistol_Shoot', 'Yes', 'Idle_No_Loop', 'Sitting_Idle_Loop'],
    'monster': ['Crouch_Idle_Loop', 'Crouch_Fwd_Loop', 'Sprint_Loop', 'Jog_Fwd_Loop', 'Walk_Loop', 'Idle_Loop', 'Zombie_Idle_Loop', 'Zombie_Walk_Fwd_Loop',
                'Zombie_Scratch', 'Punch_Cross', 'Death01', 'Hit_Chest', 'Hit_Knockback', 'LayToIdle', 'Spell_Simple_Idle_Loop'],
    'gast': ['Zombie_Idle_Loop', 'Zombie_Walk_Fwd_Loop', 'Zombie_Scratch', 'Dance_Loop', 'Idle_Loop', 'Sitting_Idle_Loop', 'Death01', 'Punch_Cross',
             'Crouch_Idle_Loop', 'Spell_Simple_Idle_Loop', 'Walk_Formal_Loop', 'Idle_FoldArms_Loop'],
}


def bake_clips(arm, role):
    """Animationen aus anims_ge.glb (Referenzskelett) exakt auf das Skelett dieser Figur übertragen."""
    names = CLIPSETS.get(role, CLIPSETS['merchant'])
    before_objs = set(bpy.context.scene.objects)
    before_acts = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, 'anims_ge.glb'))
    ref = next(o for o in bpy.context.scene.objects if o not in before_objs and o.type == 'ARMATURE')
    for o in [o for o in bpy.context.scene.objects if o not in before_objs and o.type == 'MESH']:
        bpy.data.objects.remove(o, do_unlink=True)
    src_acts = [a for a in bpy.data.actions if a not in before_acts]
    pick = []
    for n in names:
        a = next((x for x in src_acts if x.name == n or x.name.startswith(n + '.')), None)
        if a: pick.append(a)
    mapping = {b.name: b.name for b in arm.data.bones if b.name in ref.data.bones}
    for a in src_acts:
        a.name = '__ref_' + a.name
    new = RL.retarget_actions(ref, arm, pick, mapping, rename=lambda n: n.replace('__ref_', '').split('.')[0])
    RL.push_nla(arm, new)
    bpy.data.objects.remove(ref, do_unlink=True)
    for a in src_acts:
        bpy.data.actions.remove(a)
    return len(new)


def clear():
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete()
    for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for d in list(coll):
            if d.users == 0:
                coll.remove(d)


def tint_materials(objs, tint):
    """Kleidung einfärben: Farbe des Basis-Farbknotens multiplizieren."""
    for o in objs:
        key = next((k for k in tint if k in o.name.lower() or any(k in (m.name or '').lower() for m in o.data.materials if m)), None)
        if not key:
            continue
        r, g, b = tint[key]
        for m in o.data.materials:
            if not m or not m.use_nodes:
                continue
            nt = m.node_tree
            bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not bsdf:
                continue
            inp = bsdf.inputs['Base Color']
            mix = nt.nodes.new('ShaderNodeMix')
            mix.data_type = 'RGBA'
            mix.blend_type = 'MULTIPLY'
            mix.inputs['Factor'].default_value = 1.0
            mix.inputs[7].default_value = (r, g, b, 1)
            if inp.is_linked:
                src = inp.links[0].from_socket
                nt.links.new(src, mix.inputs[6])
            else:
                mix.inputs[6].default_value = inp.default_value
            nt.links.new(mix.outputs[2], inp)


def build(cid, spec):
    clear()
    info = HumanService._create_default_human_info_dict()
    ph = info['phenotype']
    for k, v in spec['phenotype'].items():
        if k == 'race':
            ph['race'].update(v)
        else:
            ph[k] = v
    info['rig'] = 'game_engine'
    info['eyes'] = spec.get('eyes', 'low-poly/low-poly.mhclo')
    info['eyes_material_type'] = 'MAKESKIN'
    info['eyelashes'] = spec.get('eyelashes', 'eyelashes01/eyelashes01.mhclo')
    info['eyebrows'] = spec.get('eyebrows', '')
    info['teeth'] = 'teeth_base/teeth_base.mhclo'
    info['hair'] = spec.get('hair', '')
    info['skin_mhmat'] = spec['skin']
    info['skin_material_type'] = 'MAKESKIN'
    info['clothes'] = spec.get('clothes', [])
    info['clothes_material_type'] = 'MAKESKIN'
    info['alternative_materials'] = {}
    settings = HumanService.get_default_deserialization_settings()
    settings['subdiv_levels'] = 0
    settings['override_skin_model'] = 'MAKESKIN'
    basemesh = HumanService.deserialize_from_dict(info, settings)
    arm = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
    nclips = bake_clips(arm, spec.get('role', 'merchant'))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    tint_materials(meshes, spec.get('tint', {}))
    # Hautton der Figur (z. B. bleich/grau für Monster): nur das Grundnetz
    if spec.get('skin_tint'):
        tint_materials([basemesh], {'': spec['skin_tint']})
    # Unterteilungs-Modifikatoren entfernen (Leistung); Maske/Armature bleiben
    for o in meshes:
        for mod in list(o.modifiers):
            if mod.type == 'SUBSURF':
                o.modifiers.remove(mod)
    # Texturen verkleinern (Haut/Kleidung 1024, Kleinteile 512)
    for img in bpy.data.images:
        if img.size[0] == 0:
            continue
        lim = 512 if any(k in img.name.lower() for k in ('eye', 'brow', 'lash', 'teeth', 'tongue', 'shoe')) else 1024
        if max(img.size) > lim:
            f = lim / max(img.size)
            img.scale(max(1, int(img.size[0] * f)), max(1, int(img.size[1] * f)))
    bpy.ops.object.select_all(action='DESELECT')
    arm.select_set(True)
    for o in meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    out = os.path.join(OUT, f'npc_{cid}.glb')
    bpy.ops.export_scene.gltf(filepath=out, export_format='GLB', use_selection=True, export_apply=True,
                              export_animations=True, export_animation_mode='NLA_TRACKS', export_force_sampling=True, export_optimize_animation_size=True, export_skins=True, export_yup=True,
                              export_image_format='JPEG', export_jpeg_quality=82, export_materials='EXPORT')
    tris = sum(len(o.data.polygons) for o in meshes)
    print(f'✓ {cid}: {nclips} Clips, {len(meshes)} Meshes, ~{tris} Polygone → {os.path.getsize(out) / 1e6:.1f} MB')


for cid, spec in SPEC.items():
    if cid.startswith('_') or (only and cid not in only):
        continue
    try:
        build(cid, spec)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print('✗', cid, e)
