# Werkzeuge & Bausteine (Stand 27.09.2026)

Nachschlagewerk für alle Sitzungen. **L** = nur lokal auf Julians PC (Blender, GPU, Stimmen), **C** = geht auch in der Cloud.
Recherche zu weiteren Quellen/Werkzeugen mit Lizenzprüfung: [RECHERCHE_WERKZEUGE.md](RECHERCHE_WERKZEUGE.md).

## 1. Testen & Prüfen
| Befehl | Zweck | Wo |
|---|---|---|
| `node tools/test/shot-local.mjs "<query>" <präfix> '<views>' [ordner]` | Screenshots mit lokalem Chrome (echte GPU). views: `[{name, js, tp:[x,z,yaw,pitch], wait}]` | L |
| `node tools/test/shot.mjs …` | dasselbe mit Software-WebGL (Swiftshader), auch fürs echte Spiel (`skip…`); Qualität per `Q=retro` (Standard), meldet HTTP-Fehler | C |
| `node tools/test/eval.mjs "<query>" "<js>" [ms]` | Seite öffnen, JS auswerten, Konsolenfehler zeigen | L |
| `node tools/test/placecheck.mjs "<query>"` | meldet **schwebende** und **ineinandersteckende** Objekte (Hub/Sandbox) | L/C |
| `node tools/test/check-levelgen.mjs` | Generator-Test | C |
| Queries | `skip` (ohne Vorspann; Titel weg: `g.titleMode=false; #title ausblenden`), `sandbox&theme=dock&seed=3&modules=all&stufe=4`, `viewer&set=npcs&only=dieter&clips=Idle_Loop,Walk_Loop`, `viewer&set=models&group=city`, `&placecheck`, `&fast` (schnelle Uhr) | |
| Nacht direkt | `skip&night=ossuary&seed=7` springt ohne Titel/Fahrt in eine Nacht (Themen aus `FLOORS`). Zusätze: `&monsters=passenger,listener,rats` (sofort statt Spawnplan), `&nomonsters`, `&tools=brechstange,hammer,flinte,fackel,klapper,salzsack,verband` (gleich in den Taschen), `&patronen=6`, `&modules=flutlicht,salzkanone,panzergitter:2`, `&stufe=2`, `&tutorial`, `&diff=pilger` | C |
| Monster-Stand | im Spiel `__tiefer.game.director.debug()` → Phase, Spannung, Spawnplan, Zustände; Schrecken auslösen: `…director.scares.trigger('apparition'|'gate'|'phone'|'lamp'|'steps'|'whisper'|'strobe')` | C |
| Schrittweise testen (Cloud) | Swiftshader schafft ~2 Bilder/s → Logik ohne Rendern vorspulen: `for (let t=0;t<sec;t+=0.05){ g.R.camera.updateMatrixWorld(true); g.update(0.05); }` (in `shot.mjs`-Ansichten als `js`) | C |
| Blickrichtung `yaw` | Kamera schaut nach (−sin yaw, −cos yaw): 0 = −Z, π = +Z (in den Markt), π/2 = −X, −π/2 = +X | |

## 2. Assets holen & ansehen
| Befehl | Zweck | Wo |
|---|---|---|
| `node tools/fetch-models.mjs` | Poly-Haven-Modelle (glTF 1k) laut Liste `LIST` (Gruppen hub/prop/city/loot/tool) → `public/assets/models/` + Manifest + CREDITS | C* |
| `tools/tts/.venv/Scripts/python tools/shrink-textures.py` | Texturen kleiner Modelle auf 512 px | L |
| `node tools/fetch-assets.mjs` | Poly-Haven-PBR-Texturen → `public/assets/tex/` | C* |
| `node tools/inspect-gltf.mjs <modell-id> [filter]` | Teile eines Modells/Baukastens mit Maßen, Mitte, Unterkante, Materialien | C |
| Poly-Haven-Suche | `curl https://api.polyhaven.com/assets?t=models` → Kategorien, `collection: hidden_alley` = Stadtgasse | C* |
(*) Cloud nur, wenn das Netz dort Poly Haven erreicht.

## 3. Figuren & Animation (Blender 4.5 + MPFB, nur lokal)
| Befehl | Zweck |
|---|---|
| `blender -b -P tools/blender/load_packs.py` | MakeHuman-Pakete aus `tools/blender/packs/*.zip` in MPFB einspielen (Kleidung/Haare/Haut) |
| `blender -b -P tools/blender/make_npcs.py -- [ids]` | Figuren aus `tools/blender/npcs.json` bauen (Phänotyp, Haut, Haare, Kleidung, Tönung, Rolle→Clip-Satz) → `public/assets/chars/npc_<id>.glb` |
| `blender -b -P tools/blender/retarget_ual.py` | Quaternius-UAL-Animationen auf das MPFB-Skelett „game_engine“ → `anims_ge.glb` |
| `blender -b -P tools/blender/check_retarget.py` | Knochenrichtungen Quelle↔Ziel vergleichen (sollte ~0° sein) |
- Kleidungspakete vorhanden: suits01/02 (CC0: Anzüge, **Mönchsroben**), suits03 (CC-BY: Overalls, Zaubererrobe), shirts02 (CC-BY), pants02 (CC-BY), shoes03 (CC-BY Stiefel), gloves01 (CC0), hats01/02, equipment01. Liste: `ls "%APPDATA%/Blender Foundation/Blender/4.5/extensions/.user/blender_org/mpfb/data/clothes"`.
- Clip-Sätze je Rolle: `CLIPSETS` in `make_npcs.py` (merchant/crew/gast). Neue Clips: in `anims_ge.glb` vorhanden (89 Stück), Namen via `?viewer&set=npcs` → `window.__clips`.
- **Monster aus Menschen:** Knochen zur Laufzeit skalieren/verdrehen (nach `mixer.update`) – lange Arme, gestreckter Hals, schiefer Kopf. Eigene Kreaturen-Meshes: Blender (Basemesh + Sculpt), gleiches Skelett.

## 4. Stimmen (nur lokal)
`node tools/export-lines.mjs` (nach Textänderungen) → `tools/tts/.venv/Scripts/python tools/tts/gen_voices.py [--redo]` (Chatterbox Multilingual, CPU). Ausgabe `public/audio/voice/<id>.ogg`. Neue Zeilen = neue IDs.

## 5. Code-Bausteine (zum Weiterbauen)
| Baustein | Datei | Nutzung |
|---|---|---|
| Häuserzeilen | `world/facade.js` | `buildRow(group, 'modular_urban_apartments_facade', { start:[x,z], dir:[dx,dz], length, floors, rng, ground:i=>modul, upper:(i,f)=>modul, lit })` – Module: `wall_door_centered_small_01`, `wall_window_centered_double_01` (Laden mit Rollläden), `wall_window_centered_large_0x`, `wall_standard_standard_01` … (`node tools/inspect-gltf.mjs modular_urban_apartments_facade wall_`). Fenster haben Innenräume (dunkel/beleuchtet). |
| Modell platzieren | `world/hub.js` `_model(id, x, z, ry, {y, height, collide, tint})` | Unterkante auf y, optional Kollision/Tönung |
| Viele Kopien | `gfx/models.js` `ModelBatch` | instanziert, mit Kollidern |
| Wandlaterne / Glas / Kerze | `hub._wallLamp`, `hub._glass`, `hub._wax` | Kerze immer mit Wachsstumpf |
| Neonschild | `ctx.neon(text, color, x, y, z, ry, w, {plate})` | bekommt automatisch Trägerplatte; Text passt sich an |
| Figur | `world/npc.js` `new NPC(char, {clip, talk, prop:'phone'|'lantern'|'torch', look})` | Blick zum Spieler, Sprechclip über Bus `voice:start/end` |
| Figuren laden | `gfx/characters.js` `preloadCharacters(ids)`, `Character.play/lookAt` | |

## 6. Gestaltungsregeln (gegen „KI-Look“)
- Nichts schwebt: Schilder auf Platte/Halterung, Lampen mit Gehäuse, Kerzen mit Stumpf, Plakate auf Wand. Nach jeder Änderung `placecheck`.
- Nichts steckt ineinander: Figuren nicht in Wänden, Möbel nicht in Tresen.
- Jede Lichtquelle hat ein sichtbares Gehäuse – und jedes Gehäuse leuchtet.
- Fertige Modelle vor Code-Kisten; Code-Geometrie nur mit Details (Überstand, Sockel, Füllungen, Kanten).
- Hinter Fenstern nie Leere. Pfützen = halbtransparent und glänzend, nie schwarz.

## 7. Agenten (Arbeitsteilung)
- **Sonnet**: Recherche, klar spezifizierte Einzelwerkzeuge, Fleißarbeit mit genauer Vorgabe.
- **Opus**: Gestaltung mit Urteil (z. B. Schachtfahrt), knifflige Systeme.
- Immer: eigene Dateien je Agent, keine Überschneidung, Ergebnis wird von der Hauptsitzung geprüft und committet.
