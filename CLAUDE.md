# TIEFER – Übergabe für die nächste Sitzung

Browser-/Desktop-Horrorspiel (Three.js r186, Node-Server). **Maßgebliche Spezifikation: `docs/GAME_DESIGN.md` (v2 Hybrid).** Zuerst lesen.

## Der Nutzer
- Schreibt Deutsch (locker, Tippfehler) → auf Deutsch antworten.
- Will AAA-Anspruch: riesige, düstere Story (Warhammer-Grimdark-Ton, leichter Cyberpunk), viele Details, Nebengeschichten, Entscheidungen, starke Atmosphäre (Musik, Stimmen, Geräusche).
- **Stil beibehalten:** „Gothic Neon Lo-Fi“ (niedrige Auflösung, Dithering, Korn, enge Bloom-Glanzlichter, Kerzen/Neon/Natrium, Nebel). Der Nutzer mag ihn ausdrücklich.
- **Keine Roboterstimmen.** Stimmen kommen aus Chatterbox Multilingual (siehe unten), nie Browser-TTS.
- Ziel: Veröffentlichung auf **Steam** (Electron + steamworks.js). Koop 1–4 Spieler ist zentral.
- Designwechsel am 26.09.2026: vom linearen Story-Spiel zum **Hybrid**: Lethal-Company-artige Koop-Runs + Story-Kampagne. Hub „Markt Neun“ oben (Shops, Aufträge, Upgrades), ausbaubarer Lastaufzug „Die Neunte“ (Waffen/Heilung/Module), Zehnt-Quote, Nächte bis 03:07, 6 Tiefenstufen, 6 Twists, 3 Enden + Endlos-Modus.

## Starten
```
npm install
node server.js          # http://localhost:3033
```
Oder `START.bat` (Windows). Test-Sandkasten: `http://localhost:3033/?sandbox&theme=dock&seed=3` (Themen: dock, scriptorium, banquet, ossuary, mine). Zusätze: `&modules=all` oder `&modules=flutlicht,salzkanone,panzergitter:2`, `&stufe=4` (Seilstufe). Im Sandkasten: `window.__sb` = { R, elev, player, pool, level } zum Steuern per JS. Tasten: F Lampe · N Noclip · O Tor auf/zu · [ ] Tiefenhebel · B Rufglocke · L Flutlicht · K Salzkanone.

### Web-Testversion (ohne Installation, auch Handy)
Der Nutzer testet oft nicht lokal. `node tools/build-web.mjs` baut `dist/web/` (Seite aus `tools/web/index.html`, Startmenü `js/dev/web.js`, Touch-Steuerung `js/dev/touch.js`, three.js per jsDelivr-Import-Map, Schriften per Google Fonts). Veröffentlicht als Artifact: https://claude.ai/artifact/M1JYKtUUgZvJ12xL46PQzn – nach Änderungen neu bauen und mit `url` + `root: dist/web` + Dateiliste aus `dist/web/files.json` erneut veröffentlichen.

## Stand der Dateien
| Bereich | Datei | Stand |
|---|---|---|
| Server | `server.js` | ✅ Static + WebSocket-Lobby/Relay (Räume mit 4-Zeichen-Code, max. 4, Host-Autorität) |
| Einstieg | `public/js/main.js` | ✅ lädt `?sandbox` oder **`app.js` (fehlt noch!)** |
| Render | `gfx/renderer.js` | ✅ Composer: Render → UnrealBloom (threshold 1.2, bloomFactors [1,.55,.22,.07,.02]) → OutputPass (ACES) → FinalShader (Grading, Aberration, Korn, Vignette, Bayer-Dithering, VHS-Glitch, Letterbox). Qualitätsstufen in `core/settings.js` (QUALITY) |
| Texturen | `gfx/textures.js` | ✅ prozedural (Beton, Stein, Marmor, Holz, Messing, Damast, Salz, Fleisch, Server, Regal, Fassade …), Neon/Plakat/Ikone/Kreide-Texturen, Taschenlampen-Cookie |
| Material/Geo | `gfx/materials.js`, `gfx/geo.js` | ✅ `mat(name)`, `glowMat()`, `Builder` (verschmilzt Geometrie pro Material, Meter-UVs, Kollider) |
| Licht | `gfx/lightpool.js` | ✅ feste Anzahl Punktlichter, den nächsten „Leuchten“ zugewiesen (Modi steady/neon/candle/dying/strobe) |
| Partikel | `gfx/particles.js` | ✅ Staub im Lichtkegel, Lichtkegel-Mesh, Funken |
| Kabine | `world/elevator.js`, `world/cab.js` | ✅ **Lastkabine „Die Neunte“** 5 × 4 × 3,3 m (Maße/Stufen/Module als reine Daten in `cab.js`). Nussholz, Damast, Messing, überschraubt mit Stahlplatten und Riffelblech, Messing-Zifferblatt im Boden, Lastnetz mit Säcken unter der Decke, Doppel-T-Träger, Käfiglampen, Spiegel-Schrein mit Kerzen, 3-m-Scherengitter, zweiflügliges Etagentor „IX“ (gleitet hinter die Wand des Absatzes), Zifferblatt + Nixie, AUFWÄRTS-Knopf, Telefon, **Maschinentelegraf zur Tiefenwahl** (`setDepthStage`, `setUnlockedStages` = Seilstufe), Schachtfahrt. `contains(p)` = Beute zählt. `interactables` = Liste {id, pos, radius} für das spätere Benutzen-System |
| Module | `world/cabin-modules.js` | ✅ Leere Montageplatten + Module: Flutlicht (SpotLight + Schalter), Salzkanone (`aimCannon`, `fireCannon`), Panzergitter I–II (dickeres Stahlgitter), Weihöl-Station, Horchgerät (Radarschirm, `setRadarBlips`), Rufglocke (`ringBell`), Lastregal (`shelfSlots`), Notstrom (Licht bleibt bei Stromausfall), Anselms Kessel, Kosmetik (Neon, Radio, Plüsch-Heiliger, `setPaint`). API: `elev.setModule(id, stufe)` |
| Kollision | `world/collision.js` | ✅ AABB-Hash, Kreis-Auflösung, Sichtlinie |
| Generator | `world/levelgen.js` | ✅ Stile rooms/halls/tunnels/city/nave, A*, Sichtlinie. Kabine = 2 × 2 Zellen (ex−1…ex, ez−1…ez), Absatz 4 × 2 (ex−2…ex+1, ez+1…ez+2). `wx(x) = (x−ex)·CS + OX`, `wz(z) = (z−ez)·CS + OZ` mit OX = CS/2, OZ = LANDING_Z − CS/2 → Zellgrenze Kabine/Absatz liegt genau auf der Torwand. Test: `node tools/test/check-levelgen.mjs` |
| Ebenenbau | `world/levelbuild.js` | ✅ Wände, Vertäfelung, Pilaster, Rippengewölbe, Spitzbögen, Leuchten, Deko-Kontext. Portal = 3-m-Lasttor im Stahlrahmen mit Warnstreifen, Rammschutz, Nixie-Tafel + Ruftaster seitlich (`anchors.callButton`) |
| Themen | `world/themes.js` | ✅ dock, scriptorium, banquet, ossuary; mine = Platzhalter |
| Requisiten | `world/props.js` | ✅ Säulen, Container, Lastwagen, Drohnen, Regale, Server, Pulte, Festtafeln, Bühne, Kerzenständer, Bänke, Statue, Schädelnischen, Särge, Spinde, Beichtstühle, Kabel |
| Spieler | `game/player.js` | ✅ Bewegung, Ducken, Sprint/Ausdauer, Kurbellampe (Intensität 95, Cookie, Schatten), Lärm, Verstecken, Kopfbewegung. Fehlt: LP, Inventar |
| Audio | `audio/audio.js`, `music.js`, `voice.js` | ✅ Synth-SFX (Gong, Gitter, Schritte je Untergrund, Monster …), Loops, dynamische Musik + Ilses Spieluhr-Leitmotiv, Stimmen mit Telefon/Funk/Tonband/Chor-Ketten + Untertitel |
| Story | `story/lines.js`, `docs.js`, `codex.js` | ✅ Hybrid-Sprechtexte (236 Zeilen), ~60 Dokumente, Kodex, Zitate, Todestexte, Intro. `docs.js` noch teils aus der linearen Fassung (Kenotaph/„du warst schon hier“/Nr. 46) – an Twists v2 anpassen (Mannschaft 47, Dieter tot) |
| UI | `ui/ui.js`, `ui/menus.js`, `css/style.css` | ✅ HUD/Kom/Hinweise/Karten/Dokumente/Intro; Warnhinweis, Ident, Helligkeit, Titel, Name+Schwierigkeit, Einstellungen, Pause, Tod. Fehlt: Shops, Auftragsbrett, Abrechnung, Tagebuch |

## Nächste Schritte (Reihenfolge)
1. ✅ Lastkabine „Die Neunte“ + Generator auf 2×2-Kabine / 4×2-Absatz (26.09.2026).
2. `public/js/app.js` + `game/game.js`: Boot-Fluss (Warnhinweis → Ident → Helligkeit → Titel → Name), Modi Hub/Nacht, Nacht-Uhr (00:00–03:07, 1 Spielminute ≈ 4 s, Warnungen 02:30/02:50/03:00/03:05), Auto-Aufstieg um 03:07.
3. LP, Inventar (4 Plätze + „beide Hände“), Beute mit Wert/Gewicht (tragbar, im Kabinenraum gezählt), Scan (Q), Abrechnung der Nacht, Quote pro Zehntwoche (3 Nächte), Speichern.
4. Hub „Markt Neun“ (handgebaut, Neon, Regen): Disposition (Dieter), Kantorei (Veit), Voss, Adas Werkstatt, Kapelle, Stille Ecke, Quartier + Shop-/Auftrags-UI.
5. Monster: Fahrgäste (bewegen sich nur ungesehen/im Dunkeln), Hörer (blind, Geräusche), Rattenschwarm + Waffen (Brechstange, Salzflinte, Fackeln, Klapper, Salzsäcke).
6. Tutorial-Nacht (−2 Ladebucht) mit Vermittlerin, dann Tiefenstufe I inkl. Story-Auftrag −13.
7. Mehrspieler-Sync, Sprachchat, dann Stufen II–VI, Erinnerungen, Finale, Enden, Electron.

## Stimmen (wichtig)
- Erzeugt **lokal auf dem PC des Nutzers**: `tools/tts/gen_voices.py` (Chatterbox Multilingual, MIT, CPU ~12× Echtzeit; venv in `tools/tts/.venv`, nicht im Repo). Männliche Referenzen: `tools/tts/refs/*.wav` (Piper Thorsten-Voice, CC0). Ausgabe: `public/audio/voice/<id>.ogg`.
- **In der Cloud nicht neu erzeugen.** Fehlt eine Datei, zeigt `voice.js` nur Untertitel.
- Nach Textänderungen in `story/lines.js`: `node tools/export-lines.mjs` (schreibt `tools/tts/lines.json`). Geänderte Texte brauchen neue IDs oder `--redo`.

## Visuell testen ohne Grafikkarte
Playwright/Chromium headless mit Software-WebGL (`--use-angle=swiftshader --enable-unsafe-swiftshader`), Server starten, Screenshots. Pointer-Lock gibt es headless nicht → Spieler per JS steuern (`window.__sb.player.teleport(x, z, yaw, pitch)`). Fertiges Werkzeug: `node tools/test/shot.mjs "<query>" <präfix> '<views-json>' [ordner]` (Bilder landen in `shots/`, nicht im Repo).

## Gelöste Stolperfallen (nicht wieder einbauen)
- **dt nie negativ werden lassen:** Der rAF-Zeitstempel kann nach einem langen Ladeblock *vor* `performance.now()` liegen → erstes dt ≈ −0,5 s → gedämpfte Werte explodieren → weißes Bild. Immer `Math.max(0, Math.min(0.05, …))` (gilt auch für das kommende `app.js`).
- **Bump-Mapping auf dünner Geometrie** (Ketten, Kabel < 1 Pixel) ergab NaN-Normalen; ein NaN-Pixel schwärzt über den Bloom den ganzen Bildschirm. `gfx/materials.js` patcht deshalb `ShaderChunk.bumpmap_pars_fragment` (Fallback auf die ungestörte Normale). Bei three.js-Updates prüfen, ob die Warnung „Bump-Shader-Schutz nicht angewendet“ erscheint.

## Konventionen
- Code-Kommentare und UI-Texte auf Deutsch, Code-Bezeichner Englisch. ES-Module, Import-Map (`three`, `three/addons/`), keine Build-Tools.
- 1 Einheit = 1 m, Y oben. Kabine im Ursprung, Tür zur +Z-Seite.
- Alles prozedural (keine Bild-/Sounddateien außer Stimmen). Fremde Marken meiden (Warhammer-*Ton*, eigene Begriffe).
- Git-Commits enden mit: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
