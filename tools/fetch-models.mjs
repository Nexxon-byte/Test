// Lädt CC0-Modelle (Poly Haven, glTF 1k) nach public/assets/models/<id>/ und schreibt ein Manifest.
//   node tools/fetch-models.mjs          (fehlende laden)
// Danach für kleine Modelle Texturen verkleinern: tools/tts/.venv/Scripts/python tools/shrink-textures.py
// Lizenz: CC0 1.0 (gemeinfrei) – siehe public/assets/CREDITS.md

import { mkdirSync, existsSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'assets', 'models');

// Gruppe: hub · prop · loot · tool (small = Texturen auf 512 verkleinern)
const LIST = {
  hub: ['street_lamp_01', 'street_lamp_02', 'metal_office_desk', 'Television_01', 'vintage_telephone_wall_clock', 'CashRegister_01',
    'BarberShopChair_01', 'portable_welding_cart', 'tool_cart', 'bench_vice_01', 'drill_press_01', 'rollershutter_door', 'metal_trash_can',
    'fire_hydrant', 'security_camera_01', 'exterior_aircon_unit', 'korean_public_payphone_01', 'gothic_statue', 'overhead_crane', 'wooden_barrels_01'],
  prop: ['Barrel_01', 'Barrel_02', 'barrel_03', 'wooden_crate_02', 'old_military_crate', 'wooden_military_crate', 'cardboard_box_01',
    'steel_frame_shelves_01', 'steel_frame_shelves_02', 'worn_metal_rack', 'power_box_01', 'utility_box_01', 'portable_generator', 'propane_tank',
    'metal_jerrycan', 'old_tyre', 'hand_truck', 'WoodenChair_01', 'WoodenTable_01', 'SchoolDesk_01', 'Shelf_01', 'GothicCabinet_01',
    'GothicBed_01', 'GothicCommode_01', 'Rockingchair_01', 'old_bed_frame', 'industrial_caged_sconce', 'caged_hanging_light',
    'industrial_pipe_lamp', 'mounted_fluorescent_lights', 'Lantern_01', 'wooden_lantern_01', 'book_encyclopedia_set_01',
    'decorative_book_set_01', 'metal_tool_chest', 'metal_toolbox', 'security_light', 'street_rat', 'WetFloorSign_01', 'wooden_ladder'],
  loot: ['brass_goblets', 'brass_vase_03', 'brass_vase_04', 'brass_pot_01', 'pocket_watch', 'vintage_pocket_watch', 'alarm_clock_01',
    'portable_cassette_player', 'cassette_player', 'vintage_radio_transceiver', 'Camera_01', 'binoculars', 'old_gas_mask', 'treasure_chest',
    'chess_set', 'cigarette_case', 'seadogs_compass', 'retro_multimeter', 'vintage_lighter', 'magnifying_glass_01', 'oil_tin', 'wine_bottles_01',
    'medical_box', 'ammo_box', 'vintage_suitcase', 'horse_statue_01', 'carved_wooden_elephant', 'round_spectacles', 'vintage_microscope',
    'circuit_board', 'Megaphone_01', 'filmstrip_projector_8mm', 'vintage_binocular', 'bronze_ray_statue'],
  // Oberstadt: Poly-Haven-Sammlung „Hidden Alley“ + Markt-Kram
  city: ['modular_urban_apartments_facade', 'modular_factory_facade', 'modular_fire_escape', 'modular_metal_gutter', 'modular_airduct_circular_01',
    'modular_airduct_rectangular_01', 'modular_electric_cables', 'modular_industrial_pipes_01', 'modular_chainlink_fence', 'rollershutter_window_01',
    'rollershutter_window_02', 'rollershutter_window_03', 'water_manhole_cover', 'concrete_road_barrier', 'barrel_stove', 'trashbag', 'plastic_crate_01',
    'wooden_crate_01', 'wine_barrel_01', 'painted_wooden_bench', 'hanging_industrial_lamp', 'industrial_wall_lamp', 'industrial_wall_sconce',
    'pull_chain_light_socket', 'security_camera_02', 'utility_box_02', 'large_iron_gate', 'large_castle_door', 'standing_chalkboard_01',
    'wooden_display_shelves_01', 'wicker_basket_01', 'russian_food_cans_01', 'CoffeeCart_01', 'metal_stool_01', 'pot_enamel_01', 'electric_stove',
    'brass_candleholders', 'wooden_candlestick', 'Chandelier_01', 'marble_bust_01', 'hanging_picture_frame_01', 'vintage_grandfather_clock_01', 'cement_bag'],
  tool: ['crowbar_01', 'sledgehammer_01', 'bolt_cutters_01', 'stick_grenade', 'machete', 'vintage_flashlight', 'signal_flashlight',
    'portable_searchlight', 'bolt_action_rifle_7_62', 'service_pistol', 'propane_torch', 'pipe_wrench'],
};
const SMALL = new Set([...LIST.loot, ...LIST.tool, 'street_rat', 'Lantern_01', 'wooden_lantern_01', 'industrial_caged_sconce', 'caged_hanging_light',
  'industrial_pipe_lamp', 'metal_jerrycan', 'Television_01', 'vintage_telephone_wall_clock', 'CashRegister_01', 'security_camera_01', 'metal_toolbox',
  'book_encyclopedia_set_01', 'decorative_book_set_01', 'bench_vice_01', 'WetFloorSign_01']);

async function json(url) {
  const r = await fetch(url, { headers: { 'User-Agent': 'TIEFER-asset-fetch' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}
async function download(url, file) {
  mkdirSync(dirname(file), { recursive: true });
  const r = await fetch(url, { headers: { 'User-Agent': 'TIEFER-asset-fetch' } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(file, buf);
  return buf.length;
}

const manPath = join(OUT, 'manifest.json');
const manifest = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : {};
const credits = [];
let bytes = 0;
const jobs = [];
for (const [group, ids] of Object.entries(LIST)) for (const id of ids) jobs.push([group, id]);

async function one([group, id]) {
  const dir = join(OUT, id);
  try {
    const files = await json(`https://api.polyhaven.com/files/${id}`);
    const info = await json(`https://api.polyhaven.com/info/${id}`);
    const g = files.gltf?.['1k']?.gltf;
    if (!g) throw new Error('kein glTF');
    const main = join(dir, `${id}.gltf`);
    if (!existsSync(main)) bytes += await download(g.url, main);
    for (const [rel, f] of Object.entries(g.include || {})) {
      const p = join(dir, rel);
      if (!existsSync(p) || statSync(p).size < 100) bytes += await download(f.url, p);
    }
    const dim = (info.dimensions || []).map(v => Math.round(v) / 1000);
    manifest[id] = { group, small: SMALL.has(id), file: `assets/models/${id}/${id}.gltf`, name: info.name, size: dim, poly: info.polycount };
    credits.push(`- „${info.name}“ (${id}) von ${Object.keys(info.authors || {}).join(', ')} · polyhaven.com · CC0`);
    console.log('✓', group.padEnd(5), id);
  } catch (e) {
    console.log('✗', group.padEnd(5), id, e.message);
  }
}
// 4 parallel
for (let i = 0; i < jobs.length; i += 4) await Promise.all(jobs.slice(i, i + 4).map(one));
writeFileSync(manPath, JSON.stringify(manifest, null, 1));
const cpath = join(ROOT, 'public', 'assets', 'CREDITS.md');
const old = existsSync(cpath) ? readFileSync(cpath, 'utf8').split('\n## Modelle')[0] : '';
writeFileSync(cpath, `${old}\n## Modelle (Poly Haven, CC0)\n\n${credits.sort().join('\n')}\n`);
console.log(`fertig · ${Object.keys(manifest).length} Modelle · ${(bytes / 1e6).toFixed(1)} MB neu`);
